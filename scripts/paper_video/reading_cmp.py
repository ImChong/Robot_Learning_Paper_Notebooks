"""旁白里某个多音字读成了哪个音（声母、韵母不同，比如「还」hái / huán）：把它换成各个读音的参考字，比这一段的共振峰和频谱。

听写分不出这种错：hái、huán 都写成「还」。`tone_cmp.py` 量的是基频，只管声调；hái、huán 都是二声，要比韵母。
做法：同一句话里只换这一个字，每个读音给一两个参考字（「孩」「骸」读 hái，「环」「寰」读 huán），各合成一遍：
- 第二共振峰 F2 分四段取中位数：huán 开头有 u 介音，F2 低（约 900–1200 Hz），hái 开头就是 a（约 1500–1700 Hz）；
  前一个字是 u、o 这类低 F2 的音时，开头那一段会被拉低，看后面三段；
- 这一段的 MFCC 用 DTW 比，距离越小越像。
目标字单独成词时取它自己那一段；参考字和前后的字连成一个词时，按字数平分那个词的时长。

用法（句子里用 X 标出那个字，参考字按读音分组、组内用逗号隔开）：
    SSL_CERT_FILE=… EDGE_TTS_LEGACY=1 python3 reading_cmp.py "论文X给主臂加了握把。" 还 孩,骸 环,寰
ACT 第 2 幕「论文还给主臂加了」的「还」开头 F2 912 Hz、MFCC 离「环」最近，读成了 huán（2026-11-09 看片反馈）。
"""
import asyncio
import os
import ssl
import subprocess
import sys

import edge_tts
import numpy as np

if os.environ.get("SSL_CERT_FILE"):
    edge_tts.communicate._SSL_CTX = ssl.create_default_context(cafile=os.environ["SSL_CERT_FILE"])
VOICE, RATE = "zh-CN-YunxiNeural", "+22%"


async def synth(text):
    words, chunks = [], []
    async for ch in edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary").stream():
        if ch["type"] == "audio":
            chunks.append(ch["data"])
        elif ch["type"] == "WordBoundary":
            words.append((ch["offset"] / 1e7, ch["duration"] / 1e7, ch["text"]))
    mp3 = b"".join(chunks)

    def pcm(sr):
        raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", "pipe:0", "-f", "s16le", "-ac", "1", "-ar", str(sr), "-"],
                             input=mp3, capture_output=True, check=True).stdout
        return np.frombuffer(raw, dtype=np.int16).astype(float)

    return words, pcm(16000), pcm(10000)


def span(text, words, j):
    """第 j 个字在音频里的起止秒数：单独成词就是那个词，否则按字数平分所在的词。"""
    pos = 0
    for a, d, w in words:
        k = text.find(w, pos)
        if k < 0:
            continue
        pos = k + len(w)
        if k <= j < pos:
            n = len(w)
            return a + (j - k) / n * d, a + (j - k + 1) / n * d, w
    raise ValueError(f"第 {j} 个字不在任何词里")


def lpc(x, p):
    r = np.correlate(x, x, "full")[len(x) - 1 : len(x) + p]
    a, e = np.r_[1.0, np.zeros(p)], r[0]
    for i in range(1, p + 1):
        k = -(r[i] + a[1:i] @ r[i - 1 : 0 : -1]) / e
        a[1 : i + 1] = a[1 : i + 1] + k * np.r_[a[i - 1 : 0 : -1], 1]
        e *= 1 - k * k
    return a


def f2_quartiles(x, sr=10000):
    """25 ms 窗、5 ms 一帧的 LPC（12 阶）共振峰，F2 分四段取中位数。"""
    f2 = []
    for i in range(0, len(x) - 250, 50):
        w = x[i : i + 250]
        w = np.append(w[0], w[1:] - 0.97 * w[:-1]) * np.hamming(250)
        if np.sqrt(np.mean(w**2)) < 30:
            continue
        rts = np.roots(lpc(w, 12))
        rts = rts[np.imag(rts) > 0]
        f = np.angle(rts) * sr / (2 * np.pi)
        bw = -np.log(np.abs(rts)) * sr / np.pi
        f = np.sort(f[(f > 200) & (bw < 500)])
        f2.append(f[1] if len(f) > 1 else np.nan)
    f2, n = np.array(f2), len(f2)
    if n < 4:
        return [np.nan] * 4
    return [float(np.nanmedian(f2[n * q // 4 : n * (q + 1) // 4])) for q in range(4)]


def _mel_fb(n=26, nfft=512, sr=16000):
    def hz(m):
        return 700 * (10 ** (m / 2595) - 1)

    def mel(h):
        return 2595 * np.log10(1 + h / 700)

    b = np.floor((nfft + 1) * hz(np.linspace(mel(80), mel(7600), n + 2)) / sr).astype(int)
    fb = np.zeros((n, nfft // 2 + 1))
    for i in range(1, n + 1):
        lo, c, hi = b[i - 1], b[i], b[i + 1]
        fb[i - 1, lo:c] = (np.arange(lo, c) - lo) / max(c - lo, 1)
        fb[i - 1, c:hi] = (hi - np.arange(c, hi)) / max(hi - c, 1)
    return fb


FB = _mel_fb()
DCT = np.cos(np.pi / 26 * (np.arange(26) + 0.5)[None, :] * np.arange(1, 14)[:, None])


def mfcc(x):
    frames = [x[i : i + 400] * np.hamming(400) for i in range(0, len(x) - 400, 160)]
    if not frames:
        return np.zeros((1, 13))
    m = (DCT @ np.log(FB @ (np.abs(np.fft.rfft(np.array(frames), 512)) ** 2).T + 1e-6)).T
    return m - m.mean(0)


def dtw(a, b):
    d = np.full((len(a) + 1, len(b) + 1), np.inf)
    d[0, 0] = 0
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            d[i, j] = np.linalg.norm(a[i - 1] - b[j - 1]) + min(d[i - 1, j], d[i, j - 1], d[i - 1, j - 1])
    return d[-1, -1] / (len(a) + len(b))


async def measure(template, ch):
    text = template.replace("X", ch)
    j = template.index("X")
    words, y16, y10 = await synth(text)
    a, b, w = span(text, words, j)
    pad = 0.02
    return w, f2_quartiles(y10[int((a - pad) * 10000) : int((b + pad) * 10000)]), mfcc(y16[int(a * 16000) : int(b * 16000)])


async def main():
    template, target, groups = sys.argv[1], sys.argv[2], [g.split(",") for g in sys.argv[3:]]
    w0, q0, m0 = await measure(template, target)
    print(f"{target}  F2 {' '.join(f'{v:5.0f}' for v in q0)}   所在的词「{w0}」")
    for g in groups:
        for ch in g:
            w, q, m = await measure(template, ch)
            print(f"{ch}  F2 {' '.join(f'{v:5.0f}' for v in q)}   MFCC 距离 {dtw(m0, m):5.2f}   所在的词「{w}」")
        print()


if __name__ == "__main__":
    asyncio.run(main())
