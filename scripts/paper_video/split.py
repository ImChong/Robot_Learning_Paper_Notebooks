"""把原片切成几段交付（对话附件上限 30 MiB），切点落在旁白的静音里，几段接回去不跳音。

不要用 `-f segment -c copy` 连音频一起切：视频只能在关键帧切，AAC 帧（1024 个采样）又和关键帧对不齐，
每个接缝会丢掉或多出几十毫秒；切点落在句子中间就听得出跳音（HOMIE 2026-10-22：320.87 s、641.73 s
两处正好在说话，接回去少了 56 ms 和 27 ms，第一段开头还多出 42.7 ms 没去掉的编码填充）。

这里的做法：在旁白里找至少 0.5 s 的静音、里面又刚好有一个关键帧、离前后两句都至少 0.4 s 的位置当切点（离目标位置最近的那个），
画面 `-c copy` 在这个关键帧切开，音频从 narration.wav 按采样点切、各段重新编码 AAC，每段音画一样长。
个别播放器不去掉 AAC 末尾的填充，接缝处会多出十几毫秒，落在静音里听不出来。

用法：python3 split.py <paper> [段数，默认 3]  ->  out/<paper>/parts/<paper>_<k>of<n>.mp4
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
FFMPEG = "ffmpeg"
LIMIT = 30 * 1024 * 1024
MARGIN = 0.4  # 切点离前后两句旁白至少这么远（秒）


def keyframes(mp4):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-skip_frame", "nokey",
                          "-show_entries", "frame=pts_time", "-of", "csv=p=0", str(mp4)],
                         capture_output=True, text=True, check=True).stdout
    return [float(x.strip(",")) for x in out.split() if x.strip(",")]


def silences(pcm, sr, min_len=0.5, thr=60.0):
    """10 ms 一帧，RMS 低于 thr 且连续 min_len 秒以上的区间（旁白句间补的是全零，阈值留一点余量）"""
    hop = sr // 100
    n = len(pcm) // hop
    rms = np.sqrt((pcm[: n * hop].reshape(n, hop) ** 2).mean(1))
    out, start = [], None
    for i, quiet in enumerate(np.append(rms < thr, False)):
        if quiet and start is None:
            start = i
        elif not quiet and start is not None:
            if (i - start) * 0.01 >= min_len:
                out.append((start * 0.01, i * 0.01))
            start = None
    return out


def main():
    paper = sys.argv[1]
    parts = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    out = HERE / "out" / paper
    src, narr = out / f"{paper}_video.mp4", out / "narration.wav"
    with wave.open(str(narr)) as w:
        sr = w.getframerate()
        pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
    total = json.load(open(out / "timeline.json"))["total"]
    keys, quiet = keyframes(src), silences(pcm, sr)
    # 静音里的关键帧，前后至少各留 MARGIN 秒：手机上连着放几段、或把几段接回去时，播放器常把一段末尾几十毫秒的音频丢掉，
    # 切点贴着句尾就会吞掉最后一个字（HDMI 2026-10-27：切点离「第 68 次摔倒了」的句尾只有 0.1 s）
    def margin(k):
        return max((min(k - a, b - k) for a, b in quiet if a <= k <= b), default=-1.0)
    cuts = []
    for j in range(1, parts):
        target = total * j / parts
        for m in (MARGIN, 0.25, 0.08):
            ok = [k for k in keys if margin(k) >= m and (not cuts or k > cuts[-1] + 1) and abs(k - target) <= total / parts / 3]
            if ok:
                break
        k = min(ok, key=lambda k: abs(k - target))
        cuts.append(k)
    print("cuts", cuts, "margins", [round(margin(k), 2) for k in cuts], file=sys.stderr)
    dst = out / "parts"
    dst.mkdir(exist_ok=True)
    tmp = dst / "tmp"
    tmp.mkdir(exist_ok=True)
    # 浮点误差会让 segment muxer 错过正好在切点上的关键帧，往前让 10 ms
    subprocess.run([FFMPEG, "-v", "error", "-y", "-i", str(src), "-map", "0:v", "-c", "copy", "-f", "segment",
                    "-segment_times", ",".join(f"{c - 0.01:.3f}" for c in cuts), "-reset_timestamps", "1",
                    str(tmp / "v%d.mp4")], check=True)
    edges = [0] + [round(c * sr) for c in cuts] + [len(pcm)]
    for j in range(parts):
        wav = tmp / f"a{j}.wav"
        with wave.open(str(wav), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes(pcm[edges[j]:edges[j + 1]].astype(np.int16).tobytes())
        mp4 = dst / f"{paper}_{j + 1}of{parts}.mp4"
        subprocess.run([FFMPEG, "-v", "error", "-y", "-i", str(tmp / f"v{j}.mp4"), "-i", str(wav), "-map", "0:v", "-map", "1:a",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(mp4)], check=True)
        size = mp4.stat().st_size
        print(f"{mp4.name}  {edges[j] / sr:8.3f}–{edges[j + 1] / sr:8.3f} s  {size / 1048576:.1f} MiB"
              + ("  超过 30 MiB，多切一段" if size > LIMIT else ""))


if __name__ == "__main__":
    main()
