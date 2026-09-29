# 论文讲解视频（竖屏 1080×1920）

把论文笔记里的 `K.explainer` 分镜（目前是 PPO 五幕动画，`assets/js/demos/ppo.js`）渲染成带中文配音和字幕的竖屏视频，可直接发微信视频号 / 抖音 / 小红书。

- 画面：直接复用 `ppo.js` 的五个分镜的 `draw(t)`，数字与笔记算例一致；前后加片头、总结页。
- 配音：`edge-tts`（`zh-CN-YunxiNeural`，需联网）。
- 同步：每句旁白对应分镜的一段 `[from, to]`，旁白比动画长时画面停在 `to`。
- 输出：`out/ppo_video.mp4`（H.264 + AAC，30 fps），不入库。

## 用法

```bash
cd scripts/paper_video
pip3 install edge-tts imageio-ffmpeg
npm install
python3 build.py                 # 旁白 TTS -> out/timeline.json + out/narration.wav
node render.mjs stills 11,75,160 # 先抽几帧看排版 -> out/still_<t>.png
node render.mjs video 30         # 逐帧截图 -> ffmpeg -> out/ppo_video.mp4
node render.mjs cover            # 封面（片头、无字幕）-> out/cover.png
```

- Chromium：设置 `CHROME=/path/to/chrome`，否则用 playwright-core 默认路径。
- 走 TLS 代理时设置 `SSL_CERT_FILE`，`build.py` 会让 edge-tts 用这份 CA。
- 改旁白只改 `build.py` 的 `SCRIPT`；改排版改 `stage.html`。
- 放进笔记：网页版再压一次（`-crf 27 -tune stillimage -b:a 64k -ac 1 -movflags +faststart`，约 5.6 MB），与海报一起放到笔记目录的 `media/`，接线方式见 `AGENTS.md`「配音讲解视频（`K.video`）」。
