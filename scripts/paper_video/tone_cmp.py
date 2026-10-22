"""旁白里某个字读成几声：把它换成同音的参考字，比较这个字自己那一段的基频曲线。

edge-tts 会把「图 1 就」「表一把」里的「一」当数词变调（yí / yì），图号、表号要的是一声。WordBoundary 只给词的边界，
所以只量「目标字单独成词」的情况；参考字也要单独成词才有读数（没有的显示 nan）。曲线和哪个参考字重合，就是读成了哪个声调。

用法（句子里用 X 标出那个字）：
    SSL_CERT_FILE=… EDGE_TTS_LEGACY=1 python3 tone_cmp.py "再看论文的图X：操作员遥操作宇树 G1。" 一 咿 铱 移 亿
输出每个写法 6 个点的基频（Hz）和整句的切词；「一」与「咿」「铱」（yī）重合即对，与「移」（yí）或「亿」（yì）重合即变了调。
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
VOICE, RATE, SR = "zh-CN-YunxiNeural", "+22%", 16000


def f0_track(x):
    """自相关法，40 ms 窗、10 ms 一帧；能量太低或不够周期的帧记 nan。"""
    out = []
    for i in range(0, len(x) - 640, 160):
        w = x[i : i + 640] * np.hanning(640)
        if np.sqrt(np.mean(w**2)) < 300:
            out.append(np.nan)
            continue
        ac = np.correlate(w, w, "full")[639:]
        lo, hi = SR // 400, SR // 70
        k = lo + int(np.argmax(ac[lo:hi]))
        out.append(SR / k if ac[k] > 0.3 * ac[0] else np.nan)
    return np.array(out)


async def synth(text):
    words, chunks = [], []
    async for ch in edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary").stream():
        if ch["type"] == "audio":
            chunks.append(ch["data"])
        elif ch["type"] == "WordBoundary":
            words.append((ch["offset"] / 1e7, ch["duration"] / 1e7, ch["text"]))
    pcm = subprocess.run(["ffmpeg", "-v", "quiet", "-i", "pipe:0", "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                         input=b"".join(chunks), capture_output=True, check=True).stdout
    return words, np.frombuffer(pcm, dtype=np.int16).astype(np.float32)


async def contour(template, ch):
    words, y = await synth(template.replace("X", ch))
    seg = " | ".join(w for _, _, w in words)
    hit = [(a, d) for a, d, w in words if w == ch]
    if not hit:
        return seg + "  (没有单独成词)", np.full(6, np.nan)
    a, d = hit[0]
    f = f0_track(y[int(a * SR) : int((a + d) * SR)])
    f = f[~np.isnan(f)]
    if len(f) <= 3:
        return seg, np.full(6, np.nan)
    return seg, np.interp(np.linspace(0, len(f) - 1, 6), np.arange(len(f)), f)


async def main():
    template = sys.argv[1]
    for ch in sys.argv[2:]:
        seg, pts = await contour(template, ch)
        print(f"{ch:3s}", " ".join(f"{v:4.0f}" for v in pts), "  ", seg)


if __name__ == "__main__":
    asyncio.run(main())
