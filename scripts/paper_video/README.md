# 论文讲解视频（竖屏 1080×1920）

把论文笔记里的 `K.explainer` 分镜渲染成带中文配音和字幕的竖屏视频，可直接发微信视频号 / 抖音 / 小红书。

| `<paper>` | 分镜 | 时长 |
|-----------|------|------|
| `ppo` | `assets/js/demos/ppo.js` 五幕 | 约 3 分 50 秒 |
| `awr` | `assets/js/demos/awr.js` 六幕 | 约 5 分 25 秒 |

- 画面：直接复用 `<paper>.js` 分镜的 `draw(t)`，数字与笔记算例一致；前后加片头、总结页（`papers/<paper>.js`）。
- 配音：`edge-tts`（`zh-CN-YunxiNeural`，需联网），旁白在 `papers/<paper>.py`。
- 同步：每句旁白对应分镜的一段 `[from, to]`，旁白比动画长时画面停在 `to` 之前一刻。`[from, to]` 最好对齐分镜 cue 的 `at`，「要点」框才会和旁白同步。
- 输出：`out/<paper>/<paper>_video.mp4`（H.264 + AAC，30 fps），不入库。

## 用法

```bash
cd scripts/paper_video
pip3 install edge-tts imageio-ffmpeg
npm install
python3 build.py awr                  # 旁白 TTS -> out/awr/timeline.json + narration.wav
node render.mjs awr stills 14,125,200 # 先抽几帧看排版 -> out/awr/still_<t>.png
node render.mjs awr video 30          # 逐帧截图 -> ffmpeg -> out/awr/awr_video.mp4
node render.mjs awr cover             # 封面（片头、无字幕）-> out/awr/cover.png
```

- Chromium：设置 `CHROME=/path/to/chrome`，否则用 playwright-core 默认路径。
- 走 TLS 代理时设置 `SSL_CERT_FILE`，`build.py` 会让 edge-tts 用这份 CA。
- 新增一篇：写 `papers/<paper>.py`（`SCRIPT` / `DISPLAY`）和 `papers/<paper>.js`（`window.PaperVideo` 的 `arxiv` / `intro` / `outro`），`<paper>` 需与 `assets/js/demos/<paper>.js` 及其 `<paper>-explainer` 同名。
- 放进笔记：网页版再压一次（`-crf 27 -tune stillimage -b:a 64k -ac 1 -movflags +faststart`，约 5–8 MB），与海报一起放到笔记目录的 `media/`，接线方式见 `AGENTS.md`「配音讲解视频（`K.video`）」。
