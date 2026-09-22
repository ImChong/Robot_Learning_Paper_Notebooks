# Agents 协作说明

## MCP 工具

后续修改本仓库的 agents 请先安装 Chrome DevTools MCP，方便调试 GitHub Pages / Jekyll 页面、检查前端渲染与浏览器行为。

- 项目地址：https://github.com/ChromeDevTools/chrome-devtools-mcp
- 推荐安装命令：

```bash
codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest
```

安装后，如需检查页面，请启动本地站点并通过 Chrome DevTools MCP 连接浏览器进行验证。

## 提交规范

提交消息请参考仓库历史 commit，优先使用中文 Conventional Commits 风格，例如：

```text
docs(Meta): 添加 agents 协作说明
chore(Progress): 更新论文阅读进度
```

## 论文笔记 Agent 工作流

新建或修改 `papers/**/*.md` 时，必须区分 **中文论文名称** 与 **简要描述**，避免把详情页摘要写进首页卡片。

### 字段职责

| 字段 / 位置 | 用途 | 展示位置 |
|-------------|------|----------|
| `title`（front matter） | 英文论文名称 | 首页卡片（英文模式）、浏览器标题 |
| `zhname`（front matter） | **中文论文名称**（短标题，不是方法摘要） | 经 `prepare_pages.py` 生成 `zh_title` 后用于首页卡片（中文模式）、站内搜索 |
| `zh_title`（front matter，可选） | 显式指定首页中文标题；仅当 `zhname` 不能改或需与搜索词分离时使用 | 首页卡片（中文模式），优先于 `zhname` |
| H1 下方 `**...**` 行 | **简要描述**（一句话讲清方法/贡献） | 仅论文详情页正文顶部 |

首页卡片模板 `_includes/paper-card.html` 的中文文案使用 `zh_title`（回退 `zhname`），**不会**读取 `**...**` 简要描述。

### 写作规范

**`zhname` 应是论文名称**，例如：

- `HOVER：面向人形机器人的多模态通用神经全身控制器`
- `CMR：非结构地形上的鲁棒人形行走收缩映射嵌入`

**不要把简要描述写进 `zhname`**，例如（错误）：

- `CMR：把含噪观测映射到「收缩」潜空间，让扰动随时间自然衰减——对比学习…`（这是方法摘要，应放在 `**...**` 行）
- 含 `——` 串联多句技术细节、或明显以「把 / 先为 / 用密集 / 教师」等方法动词开头的长句

简要描述统一写在 H1 正下方：

```markdown
# English Paper Title
**一句话简要描述：讲清这篇论文做什么、核心思路是什么**
```

`zhname` 与 `**...**` **可以不同**：前者是名称，后者是摘要。不要为了让首页「信息更全」而把摘要复制进 `zhname`。

### Agent 自检清单（提交前必做）

涉及论文 front matter 或笔记结构时，按顺序执行：

1. **核对元数据**：`zhname` 读起来像论文标题，不像方法流水线说明；简要描述只在 `**...**` 行。
2. **重新生成索引**：`python3 scripts/prepare_pages.py`（论文 `.md` 变更后必须执行）。
3. **确认 `zh_title`**：在 `_data/papers.json` 中检查对应条目已生成 `zh_title`，且与预期中文名称一致；若 `zhname` 被识别为方法摘要，`zh_title` 可能缺失——应修正 `zhname` 或添加 `zh_title`。
4. **跑测试**：`pytest tests/test_prepare_pages.py -v`（含 `is_zhname_description` / `resolve_zh_card_title` 用例）。
5. **渲染验收（中文首页）**：`bundle exec jekyll serve` 后切换中文，抽查首页对应分类卡片**只显示论文名称**、无长段摘要；若改动影响可见 UI，PR 须附截图（见下文 Cursor Cloud 说明）。

### 实现参考（供排错）

- 摘要检测：`scripts/prepare_pages.py` 中的 `is_zhname_description()`、`resolve_zh_card_title()`
- 卡片渲染：`_includes/paper-card.html` 的 `data-zh` 绑定 `zh_title | default: zhname`

若与外部 Agent 提示冲突，涉及论文字段分工与首页展示时，以本节为准。

## 论文页交互演示（`assets/js/demos/`）

笔记里可以内嵌可交互的小演示（滑块 / 拖拽 / 浏览器内跑的小实验）。`papers/01_Foundational_RL/` 下的 **15 篇笔记已全部接入**，每篇 3 个演示（PPO / AWR / DeepMimic / AMP / ADD / PHC / ASE / CALM / PULSE / Diffusion Policy / BeyondMimic 额外各多一个 `*-explainer` 讲解动画，播放器是 `kit.js` 的 `K.explainer`），bundle 与笔记一一对应（`ppo` / `awr` / `deepmimic` / `amp` / `add` / `ase` / `calm` / `pulse` / `phc` / `diffusion_policy` / `beyondmimic` / `lcp` / `domain_randomization` / `dr_theory` / `mimickit`）。板块 01 之外目前有三篇接了演示：`papers/03_High_Impact_Selection/SONIC.../` 的 `sonic` bundle、`papers/02_Motion_Retargeting/Retargeting_Matters.../` 的 `gmr` bundle，与 `papers/02_Motion_Retargeting/OmniRetarget.../` 的 `omniretarget` bundle，三者都只有一段 `*-explainer` 讲解动画。

### 讲解动画的幕数按内容定，不是固定五幕

`K.explainer` 不限制分镜数量，**幕数应当由论文本身决定**：一个核心概念一幕，开篇提出几个问题就得有几幕来回答，不要为了凑齐模板而拆分或合并。当前 PPO / DeepMimic / AMP / ADD / CALM 各 5 幕（与各自笔记「是怎么做的」那几节一一对应），PHC 6 幕（开篇立了三堵墙，第一堵墙需要「先长出列」「再混合列」两幕），AWR 6 幕（PPO 留下三个麻烦、① 评估、② 指数权重、加权回归就是加权平均、off-policy 的赚与亏、闭环与源码落点，正好六件事），ASE 6 幕（它在 AMP 上叠了六件事：latent code / 为什么必须约束 / encoder / 两半奖励 / diversity / 定期重采样，挤进五幕会让 encoder、奖励拆两半和 diversity 三块共用同一帧，谁都读不清），PULSE 6 幕（三个阶段各一幕，外加开篇的「缺一个通用表示」、命门 VIB 与本体感受先验各一幕 —— VIB 和先验是两件独立的事，合成一幕会让 β 的取舍和「固定先验会踩空」抢同一块画面），SONIC 7 幕（任务选错了 / 三轴一起放大 / universal token space / 五项 aux loss 焊住潜空间 / 实时 kinematic planner / System-1 + System-2 / 数据到实机的闭环 —— 「三路 encoder 汇进一个 FSQ」和「靠五项 aux loss 保证三路真落在同一空间」是两件独立的事，规划器与 VLA 接入也是，压进六幕就会有两幕各塞两件事），GMR 7 幕（retargeting 被当成前处理脚本 / 一条管线接 5 种格式 × 18+ 款机器人 / 论文的五步显式流程 / 非均匀局部缩放为什么是关键 / mink + DAQP 的两阶段约束 IK / 「Retargeting Matters」的定量论据 / 闭环与源码落点 —— 「五步流程」是论文层面的分解、「两阶段 IK」是代码层面的两张 match table，合成一幕会把两套分解叠在同一块画面上，而第 ③ 步非均匀局部缩放是全篇关键创新，撑得起单独一幕），OmniRetarget 7 幕（现有 retargeting 只盯人体关键点 / interaction mesh 的 Delaunay 四面体 / Laplacian 形变能 / 序贯 SOCP 硬约束 / 一条演示四路扩增 / 极简 RL 与 Table II 定量论据 / 数据工厂到 G1 真机的闭环 —— 「网格保形」是目标、「硬约束」是可行域，合成一幕会让能量和 SDF/脚粘地抢同一块画面；扩增与下游 RL 也是两件独立的事），Diffusion Policy 7 幕（平均动作撞障 / 条件扩散 / action chunking / 视觉条件 + FiLM / DDIM 加速 / receding horizon / 为什么成了 IL 标准 —— 「扩散过程」和「一次吐多长」是两件独立的事，视觉条件与 DDIM 加速也是，压进五幕会让 chunking、FiLM 和 RHC 抢同一帧），BeyondMimic 8 幕（目前唯一的八幕：它本身就是两篇论文订在一起，阶段 1 的跟踪与阶段 2 的引导扩散各有三件独立的事 —— 两个缺口 / 锚定跟踪 / 紧凑 MDP / 自适应采样 / VAE 潜空间 / 状态-潜动作扩散 / Classifier Guidance / 真机与闭环。「锚定跟踪」是跟踪目标的定义、「紧凑 MDP」是 PD 与奖励的取舍、「自适应采样」是分钟级长参考才会遇到的问题，合并会让公式与那张分箱图抢同一块画面；「VAE 潜空间」与「联合扩散」更是两个独立训练阶段，压成一幕会让 DAgger、$\beta$、$\tau$ 的结构和 25 Hz 挤在一起）。

改动分镜时，`tests/test_paper_demos.py::test_explainer_scene_count_matches_the_title_and_note` 会核对三件事是否一致：分镜数量、`title` / `ariaLabel` 里的中文幕数、笔记里的 `## 🎬 N幕动画` 标题；`sub` 里写的「约 N 秒」也要和各幕 `dur` 之和对得上。新增讲解动画时记得把 bundle 加进 `EXPLAINER_BUNDLES` 与 `EXPLAINER_SCENES` 两处。

### 有讲解动画的笔记：动画之后的正文默认折叠

一篇笔记一旦内嵌了 `K.explainer` 讲解动画，动画之后的正文就**默认折叠**，读者想细读时自己点开：

- 动画覆盖的那几节（「要解决什么问题」「是怎么做的」等）按**小节**折叠，每个折叠条写清里面是什么；
- 再往后的**整块模块**（具体实例、源码对照、面试高频问题、讨论记录、附录）各收进一个折叠条；
- **流程图、交互演示、代码块引子这些"看得见的东西"留在外面**，折叠的是文字讲解，内容一字未删。

折叠块统一写成（`markdown="1"` 必须带，否则里面的 Markdown 不会被解析）：

```html
<details class="paper-fold" markdown="1">
<summary>📖 展开文字：这一段讲什么</summary>

正文……

</details>
```

**折叠块里的小节标题必须写成原生 HTML**，并带上它原本的 id：

```html
<h3 id="第-2-步计算优势gae">第 2 步：计算优势（GAE）</h3>
```

kramdown 在 `markdown="1"` 的 HTML 块里既不跑 GFM 的中文 id 生成器，也不认 `{#id}`：
`### 环境设定` 会变成 `id="section-1"`，`{#id}` 会原样显示成文字，笔记里指向这些小节的锚点
（以及分享出去的链接）就全断了。`tests/test_paper_note_folds.py` 会守住这条规则。

`assets/js/paper.js` 负责折叠后的导航：点目录或跳锚点会自动展开所在折叠块，滚动高亮跳过
收起来的标题，折叠块展开时重画里面的 Canvas 演示与 Mermaid 图，左侧目录顶部还有
「展开全部文字 / 全部折叠」。

### 为什么不能直接在 Markdown 里写 `<script>`

`scripts/sanitize_paper_html.py` 会在构建后用 nh3 清洗 `#paper-body`，`script` / `canvas` / `input` / `button` 等标签会被整段删除（防止笔记里的原始 HTML 变成存储型 XSS）。**能活下来的只有带 `class` 和 `data-*` 的 `div`**，所以演示的 DOM 必须在运行时由外部脚本生成。

### 三步接线

1. **笔记 front matter 声明**（只有声明了才会加载演示资源）：

```yaml
demos: ["ppo"]
```

2. **正文放空占位符**（`data-demo` 是演示 id，`p.demo-fallback` 是无 JS 时的兜底文案）：

```html
<div class="paper-demo" data-demo="ppo-clip"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>
```

3. **实现放在 `assets/js/demos/<bundle>.js`**，文件末尾用 `K.mount({ 'demo-id': builder })` 按 `data-demo` 注册构建函数。`_layouts/paper.html` 只会为**真实存在**的 `assets/js/demos/<name>.js` 输出 `<script>`，样式统一走 `assets/css/paper-demos.css`。

### 共享工具箱 `assets/js/demos/kit.js`

滑块 / 按钮 / 表格 / 读数条 / Canvas 坐标系 / 主题重绘 / 确定性随机数都在 `kit.js` 里，`_layouts/paper.html` 会在所有 bundle **之前**加载它，bundle 只需从 `window.PaperDemoKit` 取：

```js
(function () {
  var K = window.PaperDemoKit;
  var el = K.el, fmt = K.fmt, card = K.card, slider = K.slider, stage = K.stage, begin = K.begin;
  function buildFoo(host) { var root = card(host, { title: '...', sub: '...' }); /* ... */ }
  K.mount({ 'paper-foo': buildFoo });
})();
```

`kit.js` 不是 bundle，**不要**写进某篇笔记的 `demos:` 列表。新增通用控件请加到 `kit.js` 并在 `window.PaperDemoKit` 里导出，不要在 bundle 里再抄一份。

### 演示里的公式：写 LaTeX，交给页面的 KaTeX

站点本来就在 `_layouts/default.html` 里加载了 KaTeX（固定版本 + SRI），演示**复用同一份**，不要再引第二份、也不要自己拼 Unicode 上下标：

- **HTML 文案**（`card` 的 `title` / `sub`、`note()` 的每一行、`verdictBox`、`K.explainer` 的字幕轨与分幕标题）里直接写 `$…$`，和 `**加粗**`、反引号包起来的 inline code 可以混用（`**$r_t(\theta)$**`、`` `awrWeights()` ``）。解析在 `K.rich()`：一对反引号会渲染成 `<code class="demo-code">`，样式在 `paper-demos.css`，所以函数名 / 配置项直接写反引号即可，不要手写 HTML。
- **SVG 分镜**用 `K.svgMath(x, y, tex, { size, anchor, cls, w, display })`，`x / y / anchor` 与 `svgText` 同义（`y` 仍是基线），返回的 `<foreignObject>` 带 `setTex()`（数字会变的公式）、`setX()`、`setCls()` / `setTone()`（HTML 吃 `color`，`paint()` 在这儿不起作用）。中文夹在公式里用 `\text{…}`，其中的 `%` / `#` / `&` 必须转义。
- **每帧都在变的数字不要塞进公式**：拆成「静态公式标签 + `svgText` 数字」，否则每帧重排一次公式。
- **Canvas 演示画不了公式**：`stage` / `plot` 那套是原生 Canvas，KaTeX 到不了，公式只能放在卡片标题、`demo-note` 等 HTML 部分。
- KaTeX 拿不到（CDN 被挡）时，`K.texToPlain()` 会把公式降级成可读的纯文本，不会漏出原始 TeX；公式本身写错也是降级，不会显示 KaTeX 的红色报错。

### 写演示的约束

- **无外部依赖**：站点 CSP 只允许 `self` 与 jsdelivr，演示一律用原生 Canvas + DOM，不要引第三方库（公式例外：复用页面**已经加载**的 KaTeX，见上一节，不新增任何脚本）。
- **主题自适应**：画布颜色从 `--demo-*` CSS 变量读取，并监听 `data-theme` 变化重绘；深浅两套配色都要定义。
- **移动端可用**：画布按容器宽度 + `devicePixelRatio` 重绘，控件在 600px 以下换行；表格放进 `.demo-table-wrap` 横向滚动。
- **数字要对得上正文**：演示里的默认参数应与笔记中手推的例子一致（`tests/test_paper_demos.py` 会校验 PPO 的 GAE 例子、AWR 的权重例子、DeepMimic 的四维奖励例子、AMP 的判别器 loss 例子）。**反过来也成立**：如果发现正文的手算结果本身有误，应当先改正文，再让演示对齐。
- **玩具模型要标注是玩具**：浏览器里跑的小实验（RSI/ET 消融、off-policy buffer、对抗训练等）只复现机制，不是论文的仿真。这类演示必须在 `demo-note` 里写明「这是简化模型，数值不能和论文直接比」，并且**结论要经得起换种子**——写进正文的定量说法（谁比谁高多少）必须是多种子平均后仍成立的。
- **提交前跑** `python3 -m pytest tests/test_paper_demos.py -v`，并按下文「Pull Request：须附「修复页」渲染截图」附上渲染截图。

## Cursor Cloud specific instructions

### Services overview

This is a Jekyll 4.3 static site with Python preprocessing scripts. Two runtimes are needed:

| Component | Purpose | Commands |
|-----------|---------|----------|
| Python scripts | Preprocess Markdown → add YAML front matter, generate `_data/papers.json` | `python3 scripts/prepare_pages.py` |
| Python (post-build) | Sanitize `#paper-body` in built HTML (mitigates stored XSS from raw HTML in notes) | `pip3 install -r requirements-site.txt` then `python3 scripts/sanitize_paper_html.py _site` (runs in Deploy workflow after Jekyll) |
| Jekyll | Build & serve the static site | `bundle exec jekyll serve --host 0.0.0.0 --port 4000` |

### Running locally

0. **若命令不存在则先安装（勿跳过）**  
   - **Ruby / Bundler / Jekyll**（Debian / Ubuntu 示例，装好后仍需在仓库根目录执行 `sudo bundle install`）：

```bash
sudo apt-get update
sudo apt-get install -y ruby-full ruby-bundler build-essential zlib1g-dev
cd /path/to/repo && sudo bundle install
```

   - **Python 质检（ruff、pytest）**：若 `ruff` / `pytest` 不在 `PATH` 中：

```bash
pip3 install -r requirements-dev.txt
# 可选：export PATH="$HOME/.local/bin:$PATH"
```

   - **站点 HTML 消毒脚本依赖**：`pip3 install -r requirements-site.txt`（与 Deploy 流程一致）。

1. **Preprocess**: `python3 scripts/prepare_pages.py` (must run before Jekyll build whenever paper `.md` files change).
2. **Serve**: `bundle exec jekyll serve --host 0.0.0.0 --port 4000` — site is at `http://localhost:4000/Robot_Learning_Paper_Notebooks/`.
3. Jekyll auto-rebuilds on file changes (LiveReload not configured; refresh browser manually).
4. **Optional (match production HTML)**: After `bundle exec jekyll build`, run `python3 scripts/sanitize_paper_html.py _site` (install deps once with `pip3 install -r requirements-site.txt`). GitHub Pages deploy runs this automatically; `jekyll serve` alone does not.

### Lint & Test

- Lint: `ruff check scripts/ tests/`
- Test: `pytest -v`
- 若未找到命令，先执行 `pip3 install -r requirements-dev.txt`；可执行文件通常在 `~/.local/bin`，必要时加入 `PATH`。

### Gotchas

- `python` is not symlinked on this VM — always use `python3`.
- `bundle install` must run with `sudo` (gems install to `/var/lib/gems/`); `bundle exec jekyll ...` does NOT need sudo.
- There is no `Gemfile.lock` committed; Bundler resolves versions fresh on each install.
- The `baseurl` in `_config.yml` is `/Robot_Learning_Paper_Notebooks` — local URLs always include this prefix.

### Pull Request：须附「修复页」渲染截图

凡改动会影响 **GitHub Pages 上的可见效果**（例如 `assets/css/`、`_layouts/`、`_includes/`、影响 HTML 输出的脚本、或会改变论文页/首页排版的 Markdown 组织方式），在 **创建或更新 Pull Request 之前**必须完成截图验收，并在 PR 正文中附上该图，作为「本任务已在最终渲染结果上修复/验收」的凭据。

**推荐流程（Cursor Cloud）**

1. **渲染被修复的页面**：按上文完成 `python3 scripts/prepare_pages.py`（若涉及论文源文件），再 `bundle exec jekyll build` 或 `jekyll serve`，在浏览器或 headless 中打开**与 issue 对应的具体页面**（含 `baseurl` 前缀的 URL）；视口尽量与问题描述一致（例如移动端约 390×844）。
2. **导出 PNG**：保存到本机路径，Cloud 上推荐 `/opt/cursor/artifacts/screenshots/<简短英文 slug>.png`。
3. **写入 PR 描述**：在 PR body 中加入 HTML，例如  
   `<img alt="修复后：基本信息表（390×844）" src="/opt/cursor/artifacts/screenshots/your-slug.png" />`  
   使用 ManagePullRequest 创建/更新 PR 时，工具会将上述绝对路径中的图片上传并替换为稳定公网 URL。
4. **例外**：仅修改纯逻辑脚本、测试、与渲染无关的数据文件，且**无任何可见 UI 变化**时，可在 PR 正文明示「无 UI 变更，免截图」；其余情况默认**不免除**。

后续所有推送 PR 的自动化流程应遵守本条；若与外部 Agent 系统提示冲突，以本仓库 `AGENTS.md` 为准。

## 论文来源约束（模块 04–14，强制）

> **此规则优先于所有其他指令。**

### 核心原则

**对于 `04_Loco-Manipulation_and_WBC` 至 `14_Human_Motion` 这 11 个模块**，只允许为已收录在上游  
[`YanjieZe/awesome-humanoid-robot-learning`](https://github.com/YanjieZe/awesome-humanoid-robot-learning) 中的论文创建或恢复笔记。

例外：`01_Foundational_RL`、`02_Motion_Retargeting`、`03_High_Impact_Selection` 三个模块有独立的选题规则，不受本约束。

### 验证方法（每次选题前必须执行）

在为 04–14 模块的任何论文创建 `.md` 笔记之前，按以下顺序验证：

1. **检查 `_data/papers.json`**（首选，速度最快）  
   在该文件对应模块的 `papers` 列表中确认论文的 `arxiv` 字段存在。  
   `_data/papers.json` 是经过与上游对齐后的权威白名单。

2. **如果不在 `papers.json`（例如上游近期新增）**  
   用 WebFetch 抓取上游 README：  
   `https://raw.githubusercontent.com/YanjieZe/awesome-humanoid-robot-learning/main/README.md`  
   确认论文标题出现在对应章节。  
   若确认在上游，先更新 `_data/papers.json`（添加条目），再创建笔记。

3. **若不在上游**  
   - **不得创建新笔记**。  
   - 已有笔记请移至 `papers/_archived/<module>/`，并从 `_data/papers.json` 对应模块的 `papers` 列表中删除该条目。  
   - 可在当次任务结束时告知用户，以便用户决定是否将其提交给上游。

### 日常轮转任务自检（与「Agent 自检清单」并列）

完成一篇论文笔记并准备提交前，额外执行：

- [ ] 确认该论文 arXiv ID 存在于 `_data/papers.json` 对应模块的 `papers[*].arxiv` 字段中。
- [ ] 若上述检查失败，将笔记移至 `papers/_archived/` 并更新 `_data/papers.json`，再提交。

