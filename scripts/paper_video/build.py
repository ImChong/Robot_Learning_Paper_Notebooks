"""论文讲解视频：papers/<name>.py 的旁白 -> 逐段 TTS -> out/<name>/timeline.json + narration.wav.

Usage: python3 build.py ppo|awr [--reuse]

--reuse keeps the audio and subtitles of every line whose text is unchanged since the last build
(read from out/<name>/timeline.json + segNN.wav) and only synthesizes the new or edited lines, so the
unchanged scenes keep exactly the same timing and can be reused frame for frame (README「只改了几幕」).

Each segment plays storyboard time [from, to] of one scene at 1x speed while
its line is spoken; if the line runs longer, the scene holds on `to`.
"""
import asyncio
import importlib
import json
import os
import re
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
# 字幕里中文和字母 / 数字 / 公式之间补一个空格（「0.25 m就」→「0.25 m 就」）；只对设了 SPACE_CJK = True 的篇目生效，旧篇目的字幕不变
SPACE_CJK = getattr(PAPER, "SPACE_CJK", False)
OUT = HERE / "out" / NAME
OUT.mkdir(parents=True, exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
VOICE = "zh-CN-YunxiNeural"
RATE = "+22%"
SR = 24000
LEAD = 0.45   # silence before the first line of each scene (scene fades in)
GAP = 0.30    # breath after every line


def space_cjk(s):
    """中文与字母、数字、公式（`$…$`）之间补一个空格；公式里面不动，中文标点前后不加。"""
    out, inside = [], False
    for k, ch in enumerate(s):
        if ch == "$":
            inside = not inside
        prev = s[k - 1] if k else ""
        if prev and not (inside and ch != "$"):
            cjk = "\u4e00" <= ch <= "\u9fff"
            prev_cjk = "\u4e00" <= prev <= "\u9fff"
            latin = ch.isascii() and (ch.isalnum() or ch in "$(")
            prev_latin = prev.isascii() and (prev.isalnum() or prev in "$)%")
            if (cjk and prev_latin) or (latin and prev_cjk):
                out.append(" ")
        out.append(ch)
    return "".join(out)


def display(s):
    for a, b in DISPLAY:
        s = s.replace(a, b)
    return space_cjk(s) if SPACE_CJK else s


async def tts(text, mp3, tries=6):
    for k in range(tries):
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
        except aiohttp.WSServerHandshakeError as e:
            # 2026-10-17：连着合成二十几句时服务会回 429（单句没事），退避 20、40、80… 秒再试
            if e.status != 429 or k == tries - 1:
                raise
            print(f"  429 from the TTS service, waiting {20 * 2 ** k} s", file=sys.stderr)
            await asyncio.sleep(20 * 2 ** k)


def to_wav(mp3, wav):
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(mp3), "-ac", "1", "-ar", str(SR), str(wav)], check=True)
    with wave.open(str(wav)) as w:
        return w.readframes(w.getnframes())


def word_char(ch):
    return ch.isascii() and ch.isalnum()


def math_mask(s):
    """True at every index inside a `$…$` run: the subtitle shows it as one KaTeX formula, so no line break may fall there."""
    mask, inside = [False] * len(s), False
    for k, ch in enumerate(s):
        if ch == "$":
            inside = not inside
            mask[k] = True
        else:
            mask[k] = inside
    return mask


def vis_len(s):
    """Rough on-screen width in characters: a `$…$` run counts its glyphs, not its TeX source (`$e^{-2.9}$` is ~5, not 10)."""
    def glyphs(m):
        tex = re.sub(r"\\[A-Za-z]+", "x", m.group(1))
        return "x" * len(re.sub(r"[{}^_\s]", "", tex))
    return len(re.sub(r"\$([^$]*)\$", glyphs, s))


def chunks(text, start, dur, limit=17):
    """Split one displayed TTS sentence into subtitle lines of <= ~limit chars, timed by char share.

    `text` already went through display(); a `$…$` formula from DISPLAY is never split across lines."""
    parts, cur = [], ""
    inside = math_mask(text)
    for k, ch in enumerate(text):
        cur += ch
        if ch in "，、；：。！？,;:" and not inside[k]:
            parts.append(cur)
            cur = ""
    if cur:
        parts.append(cur)
    out_parts = []
    for p in parts:
        while vis_len(p) > limit + 4:  # no punctuation to break on: cut near the middle, at a space if any
            mid = len(p) // 2
            m = math_mask(p)
            # 不在英文词、数字中间断行（「De / launay」「Laplac / ian」），也不切开公式：只在两个字母数字之间以外、公式以外的位置切
            # 也不在数字和单位之间断（「10.5 / cm 涨到」），不在一个小数中间断（「2. / 042」）
            unit = [k for k in range(1, len(p)) if p[:k].rstrip()[-1:].isdigit() and p[k:].lstrip()[:1].isascii() and p[k:].lstrip()[:1].isalpha()]
            num = [k for k in range(1, len(p)) if (p[k - 1].isdigit() or p[k - 1] == ".") and (p[k].isdigit() or p[k] == ".")]
            ok = [k for k in range(1, len(p)) if not (word_char(p[k - 1]) and word_char(p[k])) and not (m[k - 1] and m[k]) and k not in unit and k not in num]
            near = [k for k in ok if abs(k - mid) <= 5]
            sp = [k for k in near if p[k] == " "]
            k = min(sp or near or ok or [mid], key=lambda k: abs(k - mid))
            out_parts.append(p[:k])
            p = p[k:].lstrip()
        if p.strip():
            out_parts.append(p)
    lines, cur = [], ""
    for p in out_parts:
        if cur and vis_len(cur) + vis_len(p) > limit:
            lines.append(cur)
            cur = p
        else:
            cur += p
    if cur:
        lines.append(cur)
    total = sum(vis_len(x) for x in lines) or 1
    out, t = [], start
    for x in lines:
        d = dur * vis_len(x) / total
        out.append({"t0": round(t, 3), "t1": round(t + d, 3), "text": x.rstrip("，、；：。,;:")})
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
            sents = await tts(text, mp3)
            audio = to_wav(mp3, wav)
        alen = len(audio) / 2 / SR
        # 服务偶尔只回一小段音频而不报错（一句 60 字的旁白只有 0.36 s）：明显短于字数就重合成
        for k in range(3):
            if reused or alen >= len(text) / 25:
                break
            print(f"seg{i:02d} only {alen:.2f}s for {len(text)} chars, retrying")
            await asyncio.sleep(2 ** k)
            sents = await tts(text, mp3)
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
