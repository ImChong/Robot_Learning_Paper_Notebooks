"""论文讲解视频：papers/<name>.py 的旁白 -> 逐段 TTS -> out/<name>/timeline.json + narration.wav.

Usage: python3 build.py ppo|awr [--reuse]

--reuse keeps the audio and subtitles of every line whose text is unchanged since the last build
(read from out/<name>/timeline.json + segNN.wav) and only synthesizes the new or edited lines, so the
unchanged scenes keep exactly the same timing and can be reused frame for frame (README「只改了几幕」).

Each segment plays storyboard time [from, to] of one scene at 1x speed while
its line is spoken; if the line runs longer, the scene holds on `to`.
"""
import asyncio
import hashlib
import importlib
import json
import os
import re
import shutil
import ssl
import subprocess
import sys
import wave
from pathlib import Path

import aiohttp
import edge_tts
import edge_tts.communicate
import edge_tts.constants
import imageio_ffmpeg

# edge-tts pins certifi's bundle; behind a TLS-intercepting proxy point it at SSL_CERT_FILE instead.
if os.environ.get("SSL_CERT_FILE"):
    edge_tts.communicate._SSL_CTX = ssl.create_default_context(cafile=os.environ["SSL_CERT_FILE"])

# Since October 2026 speech.platform.bing.com answers the synthesis WebSocket with 403 (edge-tts <= 7.2.8
# still connects there; only the voice list keeps working). Edge now synthesizes through
# api.msedgeservices.com, which takes the same token as Ocp-Apim-Subscription-Key (rany2/edge-tts PR #491).
# Point an older install there too; EDGE_TTS_LEGACY=1 keeps the old host.
if "speech.platform.bing.com" in edge_tts.communicate.WSS_URL and not os.environ.get("EDGE_TTS_LEGACY"):
    edge_tts.communicate.WSS_URL = (
        "wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1"
        f"?Ocp-Apim-Subscription-Key={edge_tts.constants.TRUSTED_CLIENT_TOKEN}"
    )

HERE = Path(__file__).parent
NAME = sys.argv[1] if len(sys.argv) > 1 else "ppo"
REUSE = "--reuse" in sys.argv[2:]
PAPER = importlib.import_module(f"papers.{NAME}")
SCRIPT, DISPLAY = PAPER.SCRIPT, PAPER.DISPLAY
OUT = HERE / "out" / NAME
OUT.mkdir(parents=True, exist_ok=True)
CACHE = OUT / "tts_cache"  # 每句的 mp3 + 句子边界，按音色、语速、文字的哈希存；被 429 打断后重跑只补没合成的句子
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
VOICE = "zh-CN-YunxiNeural"
RATE = "+22%"
SR = 24000
LEAD = 0.45   # silence before the first line of each scene (scene fades in)
GAP = 0.30    # breath after every line


def display(s):
    for a, b in DISPLAY:
        s = s.replace(a, b)
    return s


PACE = float(os.environ.get("TTS_PACE", "0"))  # 每次请求前等几秒：服务按频率限流（429）时用，平时是 0


async def tts(text, mp3, tries=8):
    for k in range(tries):
        if PACE:
            await asyncio.sleep(PACE)
        try:
            comm = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="SentenceBoundary")
            sents = []
            with open(mp3, "wb") as f:
                async for ch in comm.stream():
                    if ch["type"] == "audio":
                        f.write(ch["data"])
                    elif ch["type"] == "SentenceBoundary":
                        sents.append((ch["offset"] / 1e7, ch["duration"] / 1e7, ch["text"]))
            return sents
        except edge_tts.exceptions.NoAudioReceived:  # the service drops a request now and then
            if k == tries - 1:
                raise
            await asyncio.sleep(2 ** k)
        except aiohttp.WSServerHandshakeError as e:  # 429 Too Many Requests now and then (2026-10-16): back off and retry
            if e.status != 429 or k == tries - 1:
                raise
            await asyncio.sleep(min(5 * 2 ** k, 90))


async def tts_cached(text, mp3, fresh=False):
    """tts() with a cache keyed by voice, rate and text, so a build cut off by 429s resumes where it stopped."""
    host = edge_tts.communicate.WSS_URL.split("?")[0]  # 新旧两个合成地址出的音频不完全一样，别混用
    key = hashlib.sha1(f"{host}|{VOICE}|{RATE}|{text}".encode()).hexdigest()[:16]
    cm, cj = CACHE / f"{key}.mp3", CACHE / f"{key}.json"
    if not fresh and cm.exists() and cj.exists():
        shutil.copyfile(cm, mp3)
        return json.load(open(cj))
    sents = await tts(text, mp3)
    CACHE.mkdir(exist_ok=True)
    shutil.copyfile(mp3, cm)
    json.dump(sents, open(cj, "w"), ensure_ascii=False)
    return sents


def to_wav(mp3, wav):
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(mp3), "-ac", "1", "-ar", str(SR), str(wav)], check=True)
    with wave.open(str(wav)) as w:
        return w.readframes(w.getnframes())


def word_char(ch):
    return ch.isascii() and ch.isalnum()


def chunks(text, start, dur, limit=17):
    """Split one TTS sentence into subtitle lines of <= ~limit chars, timed by char share."""
    parts = []
    for p in re.split(r"(?<=[，、；：。！？,;:])", text):
        while len(p) > limit + 4:  # no punctuation to break on: cut near the middle, at a space if any
            mid = len(p) // 2
            # 不在英文词、数字中间断行（「De / launay」「Laplac / ian」）：只在两个字母数字之间以外的位置切
            ok = [k for k in range(1, len(p)) if not (word_char(p[k - 1]) and word_char(p[k]))]
            near = [k for k in ok if abs(k - mid) <= 5]
            sp = [k for k in near if p[k] == " "]
            k = min(sp or near or ok or [mid], key=lambda k: abs(k - mid))
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


def previous_lines():
    """text -> (pcm, subtitles relative to the start of the speech) from the last build, for --reuse."""
    path = OUT / "timeline.json"
    if not REUSE or not path.exists():
        return {}
    prev = json.load(open(path))
    old = {}
    for j, sg in enumerate(prev["segments"]):
        wav_path = OUT / f"seg{j:02d}.wav"
        if "text" not in sg or not wav_path.exists() or sg["text"] in old:
            continue
        with wave.open(str(wav_path)) as w:
            audio = w.readframes(w.getnframes())
        start = sg["t0"] + sg["lead"]
        rel = [{**s, "t0": round(s["t0"] - start, 3), "t1": round(s["t1"] - start, 3)}
               for s in prev["subs"] if sg["t0"] <= s["t0"] < sg["t1"]]
        old[sg["text"]] = (audio, rel)
    return old


async def main():
    segs, subs, pcm = [], [], bytearray()
    old = previous_lines()  # read every old segNN.wav before this build starts overwriting them
    t = 0.0
    prev_scene = None
    for i, (scene, a, b, text) in enumerate(SCRIPT):
        mp3, wav = OUT / f"seg{i:02d}.mp3", OUT / f"seg{i:02d}.wav"
        reused = old.get(text)
        if reused:
            audio, rel_subs = reused
            with wave.open(str(wav), "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(SR)
                w.writeframes(audio)
        else:
            sents = await tts_cached(text, mp3)
            audio = to_wav(mp3, wav)
        alen = len(audio) / 2 / SR
        # 服务偶尔只回一小段音频而不报错（一句 60 字的旁白只有 0.36 s）：明显短于字数就重合成
        for k in range(3):
            if reused or alen >= len(text) / 25:
                break
            print(f"seg{i:02d} only {alen:.2f}s for {len(text)} chars, retrying")
            await asyncio.sleep(2 ** k)
            sents = await tts_cached(text, mp3, fresh=True)
            audio = to_wav(mp3, wav)
            alen = len(audio) / 2 / SR
        lead = LEAD if scene != prev_scene else 0.0
        dur = max(b - a, lead + alen + GAP)
        segs.append({"scene": scene, "t0": round(t, 3), "t1": round(t + dur, 3), "from": a, "to": b, "lead": lead, "text": text})
        # audio
        pad = int(round((t + lead) * SR)) - len(pcm) // 2
        pcm += b"\x00\x00" * max(pad, 0) + audio
        if reused:
            subs += [{**s, "t0": round(t + lead + s["t0"], 3), "t1": round(t + lead + s["t1"], 3)} for s in rel_subs]
        else:
            for off, d, s in sents:
                # 先换成字幕写法再切行：逐字母念的缩写（「M L P」）带空格，按空格切行会把它拆到两行
                subs += chunks(display(s.strip()), t + lead + off, d)
        t += dur
        prev_scene = scene
        print(f"{i:02d} {scene!s:>5} {alen:5.2f}s -> seg {dur:5.2f}s{'  (reused)' if reused else ''}", file=sys.stderr)
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
