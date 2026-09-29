"""PPO 讲解视频：旁白脚本 -> 逐段 TTS -> out/timeline.json + out/narration.wav.

Each segment plays storyboard time [from, to] of one scene at 1x speed while
its line is spoken; if the line runs longer, the scene holds on `to`.
"""
import asyncio
import json
import os
import re
import ssl
import subprocess
import sys
import wave
from pathlib import Path

import edge_tts
import edge_tts.communicate
import imageio_ffmpeg

# edge-tts pins certifi's bundle; behind a TLS-intercepting proxy point it at SSL_CERT_FILE instead.
if os.environ.get("SSL_CERT_FILE"):
    edge_tts.communicate._SSL_CTX = ssl.create_default_context(cafile=os.environ["SSL_CERT_FILE"])

HERE = Path(__file__).parent
OUT = HERE / "out"
OUT.mkdir(exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
VOICE = "zh-CN-YunxiNeural"
RATE = "+22%"
SR = 24000
LEAD = 0.45   # silence before the first line of each scene (scene fades in)
GAP = 0.30    # breath after every line

# scene: "intro" / 0..4 (storyboard scene index) / "outro"
SCRIPT = [
    ("intro", 0, 3.0, "训练人形机器人走路，最常用的强化学习算法，就是 PPO。"),
    ("intro", 3.0, 6.5, "它是 OpenAI 在 2017 年提出的近端策略优化。它凭什么这么稳？今天用五幕动画，一次讲清楚。"),

    (0, 0.0, 0.8, "强化学习就是让机器人试错：做得好就奖励，做得差就惩罚。但真正的难题是：每次更新，策略到底该改多少？"),
    (0, 0.8, 3.9, "改太多，一步冲出可信区，刚学会的站立，一次更新就崩了。"),
    (0, 3.9, 6.6, "改太少，倒是安全，可几乎原地踏步，训练几天也学不会走。"),
    (0, 6.6, 12.0, "PPO 的答案，是给每次更新加一道护栏，护栏跟着旧策略走。每一步都不大，但一直在往上爬。"),
    (0, 12.0, 12.0, "它的前身 TRPO 用复杂的二阶方法控制步长；PPO 只靠一个裁剪，就做到了。"),

    (1, 0.0, 2.0, "要控制步子，先得有一把尺子。数据是旧策略采来的，要评价新策略，就得比较它们对同一个动作的偏好。"),
    (1, 2.0, 5.2, "这把尺子叫概率比 r：新策略选这个动作的概率，除以旧策略的概率。r 等于 1，说明新旧一样。"),
    (1, 5.2, 8.0, "比如抬腿迈步这个动作，旧策略的概率是 0.032，新策略变成了 0.048，r 就是 1.5，新策略爱过了头。"),
    (1, 8.0, 11.0, "PPO 给它系了一条安全带：epsilon 取 0.2，r 只允许在 0.8 到 1.2 之间。1.5，已经冲出去了。"),

    (2, 0.0, 2.4, "第二把尺子是优势 A：这个动作，比该状态下的平均水平好多少。看一段五步的轨迹：前三步正常走，第四步大晃，第五步摔倒。"),
    (2, 2.4, 6.0, "先算每一步的 TD 误差 delta：即时奖励，加上折扣后的下一状态价值，再减去当前价值。摔倒那一步没有下一步，就不再往后估。"),
    (2, 6.0, 13.2, "然后从最后一步往前，倒着递推：每一步的优势，等于自己的 delta，加上 0.9405 倍的下一步优势。0.9405，就是 gamma 0.99 乘以 lambda 0.95。"),
    (2, 13.2, 20.0, "结果很有意思：第 0 步只看一步，delta 是正 0.5，看起来不错；可它的优势却是负 49.3。四步之后的那一摔，被记回了起点。"),

    (3, 0.0, 2.2, "有了 r 和 A，PPO 的目标函数只做一件事：在未裁剪项和裁剪项之间，取最小值。"),
    (3, 2.2, 5.4, "先看一个好动作，优势是正 2.3。新策略越来越喜欢它，r 一路涨到 1.5。"),
    (3, 5.4, 10.6, "这时取最小值，选中的是裁剪项：1.2 乘 2.3，等于 2.76。1.2 是常数，梯度为零，这条样本本轮被冻结。好动作，也别一次押上全部筹码。"),
    (3, 10.6, 15.6, "再换一个坏动作，优势是负 3.1，新策略把它压到了 r 等于 0.6。"),
    (3, 15.6, 18.6, "取最小值得到负 2.48，裁剪顶在 0.8，同样冻结：已经够讨厌它了，别再狂砍。"),
    (3, 18.6, 22.0, "注意，冻结只挡住继续变本加厉的那一侧；如果策略往错的方向跑偏，纠错的梯度不会被裁掉。"),

    (4, 0.0, 1.3, "最后，把两把尺子放回训练循环，一共四步。第一步，收集经验：32 个环境各跑 64 步，凑够 2048 条样本。"),
    (4, 1.3, 3.5, "第二步，用 GAE 给每条样本算出优势。"),
    (4, 3.5, 7.49, "第三步，同一批数据反复更新 10 个 epoch。r 越偏离 1，裁剪越频繁生效，相当于自带刹车，所以同一批数据可以放心多用几遍。"),
    (4, 7.5, 9.7, "第四步，把新策略同步成旧策略，然后回到第一步。"),
    (4, 9.7, 11.5, "简单、稳定、好调参，这就是 PPO 成为人形机器人训练首选的原因。"),

    ("outro", 0, 7.0, "总结一下：概率比，衡量新策略变了多少；优势，衡量这个动作好不好；裁剪加取最小值，让每一步都走在护栏之内。"),
    ("outro", 7.0, 10.0, "完整笔记、四个交互演示和源码对照，都在 Robot Learning Paper Notebooks。我们下期见。"),
]

# spoken form -> on-screen form for subtitles
DISPLAY = [("epsilon", "ε"), ("delta", "δ"), ("gamma", "γ"), ("lambda", "λ")]


def display(s):
    for a, b in DISPLAY:
        s = s.replace(a, b)
    return s


async def tts(text, mp3):
    comm = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="SentenceBoundary")
    sents = []
    with open(mp3, "wb") as f:
        async for ch in comm.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "SentenceBoundary":
                sents.append((ch["offset"] / 1e7, ch["duration"] / 1e7, ch["text"]))
    return sents


def to_wav(mp3, wav):
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(mp3), "-ac", "1", "-ar", str(SR), str(wav)], check=True)
    with wave.open(str(wav)) as w:
        return w.readframes(w.getnframes())


def chunks(text, start, dur, limit=17):
    """Split one TTS sentence into subtitle lines of <= ~limit chars, timed by char share."""
    parts = []
    for p in re.split(r"(?<=[，、；：。！？,;:])", text):
        while len(p) > limit + 4:  # no punctuation to break on: cut near the middle, at a space if any
            mid = len(p) // 2
            sp = [k for k in range(mid - 5, mid + 6) if 0 < k < len(p) and p[k] == " "]
            k = min(sp, key=lambda k: abs(k - mid)) if sp else mid
            parts.append(p[:k])
            p = p[k:].lstrip()
        if p.strip():
            parts.append(p)
    lines, cur = [], ""
    for p in parts:
        if cur and len(cur) + len(p) > limit:
            lines.append(cur)
            cur = p
        else:
            cur += p
    if cur:
        lines.append(cur)
    total = sum(len(x) for x in lines) or 1
    out, t = [], start
    for x in lines:
        d = dur * len(x) / total
        out.append({"t0": round(t, 3), "t1": round(t + d, 3), "text": display(x.rstrip("，、；：。,;:"))})
        t += d
    return out


async def main():
    segs, subs, pcm = [], [], bytearray()
    t = 0.0
    prev_scene = None
    for i, (scene, a, b, text) in enumerate(SCRIPT):
        mp3, wav = OUT / f"seg{i:02d}.mp3", OUT / f"seg{i:02d}.wav"
        sents = await tts(text, mp3)
        audio = to_wav(mp3, wav)
        alen = len(audio) / 2 / SR
        lead = LEAD if scene != prev_scene else 0.0
        dur = max(b - a, lead + alen + GAP)
        segs.append({"scene": scene, "t0": round(t, 3), "t1": round(t + dur, 3), "from": a, "to": b, "lead": lead})
        # audio
        pad = int(round((t + lead) * SR)) - len(pcm) // 2
        pcm += b"\x00\x00" * max(pad, 0) + audio
        for off, d, s in sents:
            subs += chunks(s.strip(), t + lead + off, d)
        t += dur
        prev_scene = scene
        print(f"{i:02d} {scene!s:>5} {alen:5.2f}s -> seg {dur:5.2f}s", file=sys.stderr)
    t += 0.8
    pcm += b"\x00\x00" * (int(round(t * SR)) - len(pcm) // 2)
    with wave.open(str(OUT / "narration.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(bytes(pcm))
    json.dump({"total": round(t, 3), "segments": segs, "subs": subs}, open(OUT / "timeline.json", "w"), ensure_ascii=False, indent=1)
    print(f"total {t:.1f}s", file=sys.stderr)


asyncio.run(main())
