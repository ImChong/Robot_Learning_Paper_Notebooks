# 论文讲解视频（竖屏 1080×1920）

把论文笔记里的 `K.explainer` 分镜渲染成带中文配音和字幕的竖屏视频，可直接发微信视频号 / 抖音 / 小红书。

| `<paper>` | 分镜 | 时长 |
|-----------|------|------|
| `ppo` | `assets/js/demos/ppo.js` 五幕 | 约 3 分 50 秒 |
| `awr` | `assets/js/demos/awr.js` 六幕 | 约 5 分 31 秒 |
| `deepmimic` | `assets/js/demos/deepmimic.js` 五幕 | 约 4 分 35 秒 |
| `amp` | `assets/js/demos/amp.js` 五幕 | 约 4 分 46 秒 |
| `phc` | `assets/js/demos/phc.js` 六幕 | 约 6 分 33 秒 |
| `add` | `assets/js/demos/add.js` 五幕 | 约 6 分 34 秒 |
| `ase` | `assets/js/demos/ase.js` 六幕 | 约 7 分 47 秒 |
| `calm` | `assets/js/demos/calm.js` 五幕 | 约 6 分 15 秒 |
| `pulse` | `assets/js/demos/pulse.js` 六幕 | 约 7 分 10 秒 |
| `diffusion_policy` | `assets/js/demos/diffusion_policy.js` 七幕（`dp-explainer`） | 约 8 分 2 秒 |
| `beyondmimic` | `assets/js/demos/beyondmimic.js` 八幕（`bm-explainer`） | 约 7 分 2 秒 |
| `lcp` | `assets/js/demos/lcp.js` 五幕 | 约 4 分 35 秒 |
| `cosmos` | `assets/js/demos/cosmos.js` 五幕 | 约 2 分 55 秒 |
| `groot` | `assets/js/demos/groot.js` 七幕 | 约 5 分 38 秒 |
| `transformer` | `assets/js/demos/transformer.js` 七幕（`tf-explainer`） | 约 5 分 51 秒 |
| `pi0` | `assets/js/demos/pi0.js` 七幕 | 约 6 分 14 秒 |
| `pi05` | `assets/js/demos/pi05.js` 七幕 | 约 6 分 27 秒 |
| `op3soccer` | `assets/js/demos/op3soccer.js` 七幕（`soccer-explainer`） | 约 6 分 45 秒 |
| `sonic` | `assets/js/demos/sonic.js` 七幕 | 约 5 分 32 秒 |
| `gmr` | `assets/js/demos/gmr.js` 七幕 | 约 5 分 25 秒 |
| `omniretarget` | `assets/js/demos/omniretarget.js` 七幕 | 约 5 分 7 秒 |
| `humanml3d` | `assets/js/demos/humanml3d.js` 九幕 | 约 7 分 11 秒 |
| `smp` | `assets/js/demos/smp.js` 八幕 | 约 8 分 37 秒 |
| `domain_randomization` | `assets/js/demos/domain_randomization.js` 八幕（`dr-explainer`） | 约 8 分 20 秒 |
| `quadterrain` | `assets/js/demos/quadterrain.js` 九幕（`qt-explainer`） | 约 9 分 27 秒 |
| `realhumanoid` | `assets/js/demos/realhumanoid.js` 十幕（`rh-explainer`） | 约 10 分 29 秒 |

- 画面：直接复用 `<paper>.js` 分镜的 `draw(t)`，数字与笔记算例一致；前后加片头、总结页（`papers/<paper>.js`）。
- 分镜 `draw(t, clock)` 的第二个参数是这一幕的真实时间：旁白比动画长、画面停在 `to` 之前时它照样往前走，步态这类循环动作可以用它继续动（网页播放器只传 `t`）。
- 配音：`edge-tts`（`zh-CN-YunxiNeural`，需联网），旁白在 `papers/<paper>.py`。
- 同步：每句旁白对应分镜的一段 `[from, to]`，旁白比动画长时画面停在 `to` 之前一刻。`[from, to]` 最好对齐分镜 cue 的 `at`，「要点」框才会和旁白同步。
- 输出：`out/<paper>/<paper>_video.mp4`（H.264 + AAC，30 fps），不入库。

## 安全区（视频号 / 公众号视频）

9:16 画面发到视频号，分享页、主页会被裁成居中的 6:7（1080×1260，即 y 330–1590），播放页的上下两端还压着作者、标题、转赞评收藏与浮评。所以 `stage.html` 把**所有要读的东西**放在 y **330–1440** 之内：分幕标题 330 起，动画区 504–1012，要点框 1026 起（放不下自动缩字号），字幕 1318 起（一行放不下缩字号，底不过 1440）；1440 以下 480px 不放内容，顶部只留品牌角标。片头 / 片尾用 `V.stack()` 按实际高度排进 `V.SAFE_TOP`–`V.contentBottom()`（让出字幕）；封面另有规则，见下节。

左右：视频号在长屏手机上把 9:16 铺满播放区，两侧各裁掉约 47px。动画区是 58–1022，分镜的 viewBox 按这一幕实际画到的范围缩放（`render.mjs` 渲染前调 `fitStages()`，只放大不缩小），svg 再内缩 12px，画面内容离左右边都 ≥ 72px。

渲染后用 `node check_layout.mjs <paper>` 逐帧检查：可见块互不重叠、不压字幕、都在安全区里，片头 / 片尾上下相邻的块间距不小于 10px（`V.stack` 放不下时会压缩间距，压到几 px 画面上就像贴在一起，SMP 片尾「下一篇」折成两行时出过这事），输出 `no overlap` 才算过。

## 封面（视频号封面 / 笔记海报）

封面**保持最初的片头设计**，和 PPO / AWR / DeepMimic / AMP 的封面一致（不跟着视频片头的安全区缩小）：由 `stage.html` 的 `classicCover()` 在封面帧上重新排片头的四块，内容不用改。

- 整张 1080×1920、不缩放；顶上是品牌角标「论文精读 · 机器人学习」和 arXiv 胶囊，没有字幕。
- 英文大标题：250px、字距 16px、主题蓝；名字长到放不下就改 4px 字距、等比缩小到宽 ≤ 980（DeepMimic 约 170px），在 190–440 这一带里垂直居中。
- 中文名 70px 粗体 + 一句话 40px 灰字，从 470 起，各占一行（过长就缩字号，不折行）。
- 论文信息框从 680 起（34px，内边距 34 / 40），标题可以折行。
- 目录紧跟信息框（间距 24），40px；行距随条数收紧：≤5 条 1.9、6 条 1.75、7 条 1.55、8 条及以上 1.5 / 38px；视频号「设置封面」按 **3:4 置顶裁剪**（只留 y 0–1440），所以最后一行目录的字底不过 **1405**（和 AMP 一样离裁剪线 35px），超了先把行距压到 1.35、再缩字号（PHC / ASE / PULSE 6 条为 1.5，7–8 条的会缩到 36 / 32px）。
- 每块都排在上一块底下，内容比原设计高就整体往下推，永不重叠。

生成封面不需要先跑 `build.py`（没有 timeline 时 `render.mjs cover` 自己补一段片头）。生成后必须跑 `node check_layout.mjs <paper> cover`：四块互不重叠、都在画面里、大标题 / 中文名 / 一句话 / 每条目录各占一行、目录字底不过 1405，输出 `no overlap` 才算过。海报由 `cover.png` 缩到 540×960 的 jpg。

## 用法

```bash
cd scripts/paper_video
pip3 install edge-tts imageio-ffmpeg
npm install
python3 build.py awr                  # 旁白 TTS -> out/awr/timeline.json + narration.wav
node render.mjs awr stills 14,125,200 # 先抽几帧看排版 -> out/awr/still_<t>.png
node render.mjs awr video 30          # 逐帧截图 -> ffmpeg -> out/awr/awr_video.mp4
node render.mjs awr cover             # 封面（最初的片头设计、无字幕）-> out/awr/cover.png
node check_layout.mjs awr cover       # 封面排版检查，输出 no overlap 才算过
```

- Chromium：设置 `CHROME=/path/to/chrome`，否则用 playwright-core 默认路径。几篇可以同时渲染（各自写 `stage.<paper>.built.html`）。
- 走 TLS 代理时设置 `SSL_CERT_FILE`，`build.py` 会让 edge-tts 用这份 CA。
- 新增一篇：写 `papers/<paper>.py`（`SCRIPT` / `DISPLAY`）和 `papers/<paper>.js`（`window.PaperVideo` 的 `arxiv` / `intro` / `outro`；没有 arXiv 版本的论文改写 `badge`，如 HumanML3D 的 `'CVPR 2022'`，角标就显示会议名），`<paper>` 是 `assets/js/demos/<paper>.js` 的 bundle 名；讲解动画的演示 id 不必叫 `<paper>-explainer`（`diffusion_policy.js` 里是 `dp-explainer`、`beyondmimic.js` 里是 `bm-explainer`），`render.mjs` 会从 bundle 里读出 `'…-explainer'` 那个 id。
- 放进笔记：网页版再压一次（`-crf 27 -tune stillimage -b:a 64k -ac 1 -movflags +faststart`；PPO 5.2 MB，更长的 AWR 用 `-crf 30` 压到 7.1 MB，DeepMimic 用 `-crf 29` 压到 6.2 MB；AMP 用 `-crf 31` 压到 6.4 MB，六分多钟的 PHC 用 `-crf 32` 压到 8.5 MB，ADD 加 `-preset slow` 同 `-crf 32` 压到 8.3 MB，七分多钟的 ASE 用 `-preset slow -crf 33` 压到 9.5 MB；四五分钟的 LCP 用 `-preset slow -crf 30` 压到 6.3 MB，六七分钟的 CALM / PULSE 用 `-preset slow -crf 31` 压到 7.9 / 9.4 MB，八分钟的 Diffusion Policy 用 `-preset slow -crf 33` 压到 9.9 MB，七分钟的 BeyondMimic 用 `-crf 33` 压到 9.4 MB；约三分钟的 Cosmos 用 `-preset slow -crf 30` 压到 4.3 MB，GR00T N1 用 `-preset slow -crf 31` 压到 7.0 MB；六分钟上下的 Transformer / π₀ / π₀.₅ / OP3 足球同参数压到 7.7 / 8.2 / 8.7 / 9.2 MB，SONIC / GMR / OmniRetarget 同参数压到 7.0 / 7.3 / 6.7 MB，七分多钟的 HumanML3D 同参数压到 9.2 MB；八分半的 SMP 用 `-preset slow -crf 34`、音频降到 `-b:a 48k` 压到 9.7 MB，八分多钟的域随机化同样 48k 音频、`-preset slow -crf 35` 压到 9.9 MB（`-crf 34` 是 10.2 MB），九分半的四足野外盲走同样 48k 音频、`-preset slow -crf 36 -tune stillimage` 压到 10.4 MB（`-crf 35` 是 10.8 MB），十分半的真实世界人形行走同参数改 `-crf 37` 压到 11.0 MB（`-crf 36` 是 11.4 MB）），海报由 `cover.png` 缩到 540×960 的 jpg，与海报一起放到笔记目录的 `media/`，接线方式见 `AGENTS.md`「配音讲解视频（`K.video`）」。
