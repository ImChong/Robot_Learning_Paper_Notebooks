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

### 笔记之间的链接写 `.html`

Jekyll 把笔记渲染成同名 `.html`，源 `.md` 不会发布，所以 `[PPO](../PPO_Proximal_Policy_Optimization/PPO_Proximal_Policy_Optimization.md)` 在站点上是 404。笔记里指向其他笔记的相对链接一律写成 `.html`（锚点照写：`….html#第-2-步计算优势gae`），目录名照抄磁盘上的真实名字（长标题目录是截断过的，别自己重新截）。已归档（`papers/_archived/`）的笔记不发布，改链 arXiv。`tests/test_paper_note_links.py` 会拦 `.md` 链接和指向不存在文件的链接。PROGRESS.md、DAILY_SUMMARY_LOG.md、todos/ 不发布成页面，里面的 `.md` 链接是给 GitHub 浏览用的，不受此限。

### 实现参考（供排错）

- 摘要检测：`scripts/prepare_pages.py` 中的 `is_zhname_description()`、`resolve_zh_card_title()`
- 卡片渲染：`_includes/paper-card.html` 的 `data-zh` 绑定 `zh_title | default: zhname`

若与外部 Agent 提示冲突，涉及论文字段分工与首页展示时，以本节为准。

## 论文页交互演示（`assets/js/demos/`）

笔记里可以内嵌可交互的小演示（滑块 / 拖拽 / 浏览器内跑的小实验）。`papers/01_Foundational_RL/` 下的 **17 篇笔记已全部接入**：其中 15 篇每篇 3 个演示、BeyondMimic 4 个（`bm-anchor` / `bm-impedance` / `bm-sampling` / `bm-guidance`）（PPO / AWR / DeepMimic / AMP / ADD / PHC / ASE / CALM / PULSE / Diffusion Policy / BeyondMimic / LCP / SMP / 域随机化 额外各多一个 `*-explainer` 讲解动画，播放器是 `kit.js` 的 `K.explainer`），Transformer 只有一段 `tf-explainer` 讲解动画和配音视频；bundle 与笔记一一对应（`ppo` / `awr` / `deepmimic` / `amp` / `add` / `ase` / `calm` / `pulse` / `phc` / `diffusion_policy` / `beyondmimic` / `lcp` / `smp` / `domain_randomization` / `dr_theory` / `mimickit` / `transformer`）。板块 01 之外目前有九篇接了演示：`papers/03_High_Impact_Selection/SONIC.../` 的 `sonic` bundle、`papers/03_High_Impact_Selection/GR00T_N1.../` 的 `groot` bundle、`papers/03_High_Impact_Selection/Cosmos.../` 的 `cosmos` bundle、`papers/03_High_Impact_Selection/Perceptive_BFM.../` 的 `pbfm` bundle、`papers/02_Motion_Retargeting/Retargeting_Matters.../` 的 `gmr` bundle，`papers/02_Motion_Retargeting/OmniRetarget.../` 的 `omniretarget` bundle，`papers/02_Motion_Retargeting/UMR.../` 的 `umr` bundle，`papers/04_Loco-Manipulation_and_WBC/Perceptive_Humanoid_Parkour.../` 的 `php` bundle，与 `papers/04_Loco-Manipulation_and_WBC/GentleHumanoid.../` 的 `gentle` bundle，九者都只有一段 `*-explainer` 讲解动画；`papers/03_High_Impact_Selection/Learning_Quadrupedal_Locomotion.../` 的 `quadterrain` bundle 有一段九幕讲解动画、一段配音视频和三个交互演示（`qt-explainer` / `qt-video` / `qt-ftg` / `qt-curriculum` / `qt-memory`）；`papers/03_High_Impact_Selection/Real-World_Humanoid_Locomotion_with_RL/` 的 `realhumanoid` bundle 有一段十幕讲解动画、一段配音视频和三个交互演示（`rh-explainer` / `rh-video` / `rh-context` / `rh-reward` / `rh-dr`）；`papers/03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/` 的 `asap` bundle 有一段十二幕讲解动画、一段配音视频和三个交互演示（`asap-explainer` / `asap-video` / `asap-delta` / `asap-tables` / `asap-ablation`）；`papers/09_State_Estimation/Contact-Aided_Invariant_EKF_for_Legged_Robots/` 的 `inekf` bundle 有一段十二幕讲解动画、一段配音视频和三个交互演示（`inekf-explainer` / `inekf-video` / `inekf-linearize` / `inekf-banana` / `inekf-converge`）；`papers/12_Hardware_Design/Berkeley_Humanoid_A_Research_Platform_for_Learning-based_Control/` 的 `berkeley_humanoid` bundle 有一段十二幕讲解动画、一段配音视频和三个交互演示（`bh-explainer` / `bh-video` / `bh-armature` / `bh-actuator` / `bh-dr`）；`papers/12_Hardware_Design/ToddlerBot_Open-Source_ML-Compatible_Humanoid_Platform_for_Loco-Manipulation/` 的 `toddlerbot` bundle 有一段十二幕讲解动画、一段配音视频和三个交互演示（`tb-explainer` / `tb-video` / `tb-power` / `tb-sysid` / `tb-actuator`）；另外 `papers/03_High_Impact_Selection/` 下的 π₀（`pi0`）、π₀.₅（`pi05`）两篇各有一段七幕讲解动画和一段配音视频（演示 id 分别是 `pi0-explainer` / `pi05-explainer`）；同目录 OP3 足球的 `op3soccer` bundle 有一段十二幕讲解动画、一段配音视频和三个交互演示（`soccer-explainer` / `soccer-video` / `soccer-filter` / `soccer-lambda` / `soccer-pool`）；`papers/14_Human_Motion/HumanML3D/` 的 `humanml3d` bundle 有一段九幕讲解动画和一段配音视频（`humanml3d-explainer` / `humanml3d-video`）。

### 讲解动画的幕数按内容定，不是固定五幕

`K.explainer` 不限制分镜数量，**幕数应当由论文本身决定**：一个核心概念一幕，开篇提出几个问题就得有几幕来回答，不要为了凑齐模板而拆分或合并。当前 PPO / DeepMimic / AMP / ADD / CALM 各 5 幕（与各自笔记「是怎么做的」那几节一一对应），PHC 6 幕（开篇立了三堵墙，第一堵墙需要「先长出列」「再混合列」两幕），AWR 6 幕（PPO 留下三个麻烦、① 评估、② 指数权重、加权回归就是加权平均、off-policy 的赚与亏、闭环与源码落点，正好六件事），ASE 6 幕（它在 AMP 上叠了六件事：latent code / 为什么必须约束 / encoder / 两半奖励 / diversity / 定期重采样，挤进五幕会让 encoder、奖励拆两半和 diversity 三块共用同一帧，谁都读不清），PULSE 6 幕（三个阶段各一幕，外加开篇的「缺一个通用表示」、命门 VIB 与本体感受先验各一幕 —— VIB 和先验是两件独立的事，合成一幕会让 β 的取舍和「固定先验会踩空」抢同一块画面），SONIC 7 幕（任务选错了 / 三轴一起放大 / universal token space / 五项 aux loss 焊住潜空间 / 实时 kinematic planner / System-1 + System-2 / 数据到实机的闭环 —— 「三路 encoder 汇进一个 FSQ」和「靠五项 aux loss 保证三路真落在同一空间」是两件独立的事，规划器与 VLA 接入也是，压进六幕就会有两幕各塞两件事），GR00T N1 7 幕（没有人形互联网 / 10 Hz 的第 12 层与 63.9 ms 的动作块 / 流匹配路径和 K=4 欧拉 / 数据金字塔三层 / 潜动作与 IDM 补标签 / 一套权重加按本体的 MLP / Table 2–3 的任务加权平均和短程桌面的边界 —— 「频率怎么接」和「流匹配公式」是两件独立的事，金字塔回答数据放哪一层、潜动作回答标签从哪来，压进六幕会有两幕各塞两件），Cosmos 5 幕（为什么要世界模型 / 视频整理 / 因果 tokenizer / 扩散与自回归并列预训练 / 三类后训练示例 —— 扩散和自回归是两条预训练路线，画成前后两级会把 Table 10 的模型地图读反，所以第 4 幕必须是并排的两列），GMR 7 幕（retargeting 被当成前处理脚本 / 一条管线接 5 种格式 × 18+ 款机器人 / 论文的五步显式流程 / 非均匀局部缩放为什么是关键 / mink + DAQP 的两阶段约束 IK / 「Retargeting Matters」的定量论据 / 闭环与源码落点 —— 「五步流程」是论文层面的分解、「两阶段 IK」是代码层面的两张 match table，合成一幕会把两套分解叠在同一块画面上，而第 ③ 步非均匀局部缩放是全篇关键创新，撑得起单独一幕），OmniRetarget 7 幕（现有 retargeting 只盯人体关键点 / interaction mesh 的 Delaunay 四面体 / Laplacian 形变能 / 序贯 SOCP 硬约束 / 一条演示四路扩增 / 极简 RL 与 Table II 定量论据 / 数据工厂到 G1 真机的闭环 —— 「网格保形」是目标、「硬约束」是可行域，合成一幕会让能量和 SDF/脚粘地抢同一块画面；扩增与下游 RL 也是两件独立的事），Diffusion Policy 7 幕（平均动作撞障 / 条件扩散 / action chunking / 视觉条件 + FiLM / DDIM 加速 / receding horizon / 定量证据与局限 —— 「扩散过程」和「一次吐多长」是两件独立的事，视觉条件与 DDIM 加速也是，压进五幕会让 chunking、FiLM 和 RHC 抢同一帧），LCP 10 幕（仿真里的理想电机 / Lipschitz：给斜率设上限 / 从「别太陡」到「陡了就罚」 / 罚的到底是什么：均值的斜率 / 几行代码接进 PPO / 观测、ROA 与罚整段输入 / 命令、奖励与课程 / 三种平滑办法（表 I(a)）/ $\lambda_{gp}$ 扫一遍（表 I(b)）/ 四台真机与局限 —— 方法节的「为什么约束梯度」（式 1–2 与图 3 的圆锥）和「怎么变成可微的一项」（式 4–7 四步）各占一幕，读懂式 7 还要单独看一个高斯策略罚的是什么（均值的斜率，噪声越小罚得越重），代码与超参数又是一幕；训练设置里「罚哪些输入」（表 I(c)）与「平滑奖励拿掉后还剩什么」（表 IV、附录 B 的课程）是两件事；结果一表一幕，压回五幕会让四步推导和圆锥、五档系数的柱和四种办法的柱抢同一帧；第二版按「公式太多」的反馈改成以动图为主：两个关节跟指令、两条策略抖给你看、罚款与拔河、钟形沿均值线滑动、旋钮拧过五档，每幕最多留一条公式，第 10 幕的三台机器人是按开源 URDF 渲染的真机图；动画、三个演示、配音旁白与笔记「🚶 具体实例」共用同一份论文数字，第 2–4 幕的一维策略与两维高斯是标明的玩具，`test_lcp_explainer_demos_and_worked_example_share_the_paper_numbers` 会核对），BeyondMimic 12 幕（两个缺口 / 锚定跟踪 / 奖励：四个高斯加三项正则 / 观测：单步与 Rot6D / 动作与关节阻抗 / 随机化与部署延迟 / 自适应采样 / 跟踪上真机 / VAE 潜空间 / 状态—潜动作扩散 / 代价引导 / 测试时的任务与边界 —— 以 arXiv v4 为准：方法节按 MDP 的组成一块一块写，锚定、奖励（表 S1）、观测、阻抗（表 S3 / S4）、随机化（表 S2）、自适应采样各有公式和图 8 的一组消融，所以第 2–7 幕一块一幕，「观测」与「阻抗」在正文同属一节，但证据分别是图 8A 的朝向 / 历史两行与 armature 一行加图 S2，合成一幕会让两组柱子抢同一帧；VAE 与扩散是两个训练阶段，引导是推理时的事；结果按正文的两节各一幕；第 2、5、7、11 幕与四个演示、配音旁白、笔记「🚶 具体实例」共用同一份论文数字，图 8A / 图 S2 是读图近似值，`test_beyondmimic_explainer_demos_and_worked_example_share_the_paper_numbers` 会核对），UMR 8 幕（骨架中心的对应一款机器人一套配方 / 体表点云当接口、形变而非匹配 / 三项损失与测地图 / 绑定与位姿残差 / 接触图共用环境点 / 阻尼约束 GN QP / 三个尺度的定量证据 / 闭环与源码落点 —— 位姿残差和接触残差是论文里两条独立的残差，「怎么学对应」和「为什么非要 Edge 项」也是两件事，压进七幕会让左右翻转的算例和点云形变动画抢同一块画面；第 3–6 幕的小算例与笔记「🧮 数据计算实例」共用同一组数字），PHP 8 幕（跑酷四关 / 动作匹配的最近邻 / 临界阻尼弹簧把命令变成查询 / Loco → Skill → Loco 的拼接与入口密度 / 单技能专家 / DAgger 盲区与 PPO 课程 / 深度学生只拿速度命令 / 定量证据与真机 —— 「怎么找帧」和「查询从哪来」是论文附录 A 里分开的两节，「专家」与「蒸馏」是两个训练阶段，深度相机建模又是 sim-to-real 的主要工作量，压进七幕会让课程曲线和相机噪声抢同一帧），Perceptive BFM 7 幕（操作者—环境错配 / PMT 四阶段与「TCRS 只教不用」的契约 / TCRS 摆腿：接触、中足、MPPI / TCRS 身体：根高度、碰撞修复、多点 IK / 目标系动作对齐 / 恒等门控残差 / 定量证据与边界 —— TCRS 的「脚怎么走」与「身体怎么跟」各是一组公式，合成一幕会让 MPPI 候选表和根高度滤波抢画面；对齐与门控是论文两条独立的消融，各占一幕）。GentleHumanoid 7 幕（跟踪策略把外力当扰动 / 阻抗参考动力学 / 抵抗与引导两种交互弹簧 / 受力暴露的多样性 / 安全力阈值 / 教师—学生与柔顺奖励 / 定量证据与局限 —— 「交互力长什么样」与「什么时候、在哪几个 link、多硬」是论文式 3–4 与附录 A 调度两件事，阈值又有自己的截断公式与 ISO 换算，合并会让子步积分表、平衡点表与压强换算挤在同一帧）。四足野外盲走 9 幕（野外为什么难 / 相位振荡器 + 足端残差的动作空间 / 特权教师 / 本体学生 / 自适应地形课程 / 野外零样本与表 1 / 室内对照 / 记忆长度与踩空反射 / 解码器与局限 —— 论文的三个支柱 TCN 记忆、特权训练、地形课程各有一节方法和一组消融，加上单独的 Motion synthesis 就是第 2–5 幕；「野外 + 地下挑战赛」（表 1）与「室内台阶 / 负重 / 打滑」（图 3）是两类证据，「记忆要多长」（图 5B–D + 图 6）与「记忆里装了什么」（图 S2 的解码器）是验证节与分析节的两段，合成一幕会让表 1 的柱子和图 3E 的折线、或三档消融柱和摩擦曲线抢同一帧；动画、三个演示与笔记「🚶 具体实例」共用同一份论文数字，`test_quadterrain_explainer_demos_and_worked_example_share_the_paper_numbers` 会核对）。真实世界人形行走 10 幕（全尺寸人形为什么难 / 因果 Transformer / 两步训练 / 奖励与命令 / 虚拟弹簧与域随机化 / 户外与实验室 / 自然行走 / 下坡换步态 / 脚被绊住 / 消融与局限 —— 方法节的网络、训练目标、奖励、仿真各一幕；结果按论文的图一图一幕，图 5 的「慢变化改步态」与图 6 的「快变化被绊住」是上下文适应的两种时间尺度，各有一组神经元分析，合成一幕会让两条神经元曲线、二维散点和热图抢同一帧；14 项奖励塞进训练那一幕会和式 2、λ 曲线、图 8C 挤在一起；十幕起 `kit.js` 的幕号显示成 10 而不是 010，动画、三个演示、配音旁白与笔记「🚶 具体实例」共用同一份论文数字，命令、奖励、随机化、PPO 规模取自 arXiv v1 附录，图 2D、图 8 是读图近似值，`test_realhumanoid_explainer_demos_and_worked_example_share_the_paper_numbers` 会核对）。ASAP 12 幕（仿真里跳得起来、真机跳不动 / 从人类视频到 G1 参考动作 / 相位跟踪策略 / 上真机录一遍 / 残差动作模型 / 冻结 Δ 微调、部署时拿掉 / 开环回放（表 III）/ 闭环微调（表 IV）/ 真机只学脚踝（表 V）/ 怎么训 Δ（图 10）/ 怎么用 Δ（图 11）/ Δ 学到了什么与局限（图 12、13）—— 方法节「采数据」与「训练 Δ」是第 III-A、III-B 两节，Δ 的训练与使用各有一条式子；结果按论文自己提的 Q1–Q6 一问一幕，压成十幕会让表 III 与表 IV、或图 11 的曲线与图 12 的噪声柱抢同一帧；局限和真机那一幕讲的是同一批约束，并进最后一幕；第 5、11 幕的单关节玩具（G1 脚踝刚度 20、0.65 倍刚度的 −0.35 取自官方代码）与一步匹配的不动点 0.4077、三个演示、配音旁白与笔记「🚶 具体实例」共用同一份数字，图 5、图 11 是读图近似值，`test_asap_explainer_demos_and_worked_example_share_the_paper_numbers` 会核对，并用 Python 重跑一遍单关节玩具）。接触辅助 InEKF 12 幕（为什么要状态估计 / IMU 推、脚踩住、运动学校正 / 线性化点选错 / 一个矩阵装下状态 / 误差不看轨迹 / 运动学校正：H 是常数 / 看不见的方向 / 不确定性的形状 / IMU 零偏 / 增删接触点 / 收敛（图 3、8）/ Cassie 实测（图 9–12）—— 论文第 5 节的状态、过程模型、观测、可观性四块各一幕；第 4 节「EKF 在估计值上线性化错在哪」用站立的数值例子单独一幕，后面的定理才看得懂；第 6.4 节的协方差形状、第 7 节的零偏、第 8 节的增删接触各有自己的公式，合并会让可观性矩阵和香蕉、或零偏的 $A$ 和增删接触的 $F$、$G$ 抢同一帧；结果按收敛与精度两幕。站立例子（0.1 / 0.5 rad）、2 cm 校正、新触地点、香蕉的弯度在动画、三个演示、配音旁白与笔记「🚶 具体实例」里共用同一组数，图 3、4、6、8、9 是读图近似值，第 7 幕「QEKF 秩为 9」是自己算的小例子，`test_inekf_explainer_demos_and_worked_example_share_the_paper_numbers` 会核对，并用纯 Python 重算可观性矩阵的秩；Cassie 的图取自 Robot_Description_Gallery）。Berkeley Humanoid 12 幕（差距从哪来 / 孩子大小的人形（表 1）/ 执行器直接当关节 / 四种自研执行器（表 2）/ EtherCAT 与时序 / 可靠又便宜（表 3、4）/ 拟人的腿（表 5）/ 最简的控制器 / 辨识转子惯量与摩擦 / 随机化：硬件窄、环境宽（表 6）/ 走出实验室（图 4–7）/ 仿真与真机对比（图 8、9）与局限 —— 第 3 节是系统概览加四条设计考量，「仿真友好」里的结构（执行器即关节、armature 的 $N^2$）与时序（EtherCAT 的 0.5–2 ms、25 kHz PD）一个管建模误差、一个管指令执行，合成一幕会让转子惯量的柱子和时间线抢画面；第 4.2 节的「辨识」（摩擦曲线、CAD 的转子惯量）与「随机化多宽」（表 6 与窄 / 宽两条带）是两步；结果按第 5.1、5.2 节各一幕，5.3 的摔倒记录并进可靠那一幕。论文没给摩擦模型和 PD 增益，第 4、9 幕与演示取自官方训练代码并标明；第 3、10 幕的单关节玩具（URDF 的小腿 0.0288 kg·m²、代码 KFE 的 PD 与摩擦）与三个演示、配音旁白、笔记「🚶 具体实例」共用同一组数（漏掉 armature 起步快 42%，窄 / 宽随机化带宽 0.0119 / 0.0845 rad、约 7.1 倍），`test_berkeley_humanoid_explainer_demos_and_worked_example_share_the_paper_numbers` 会核对并用纯 Python 重跑玩具；真机图取自 Robot_Description_Gallery）。ToddlerBot 12 幕（研究要的平台和工业要的不一样（表 1）/ 30 个自由度与三种传动 / 可复现是硬约束 / 功率因子与电机选型（式 4–5、表 2、图 8）/ 零点校准（图 10）/ 电机台架辨识（式 6–7）/ 9 参数执行器模型（式 8–10、表 3、图 12）/ 遥操作装置与两层 PD / 关键帧动画与 RL 行走（式 1–2、表 5–6）/ 扩散策略 / 实验：臂展、负重、耐久与表 7 / 复刻的证据、局限与之后 —— 第 3 节的三条设计原则各占一幕（自由度与传动、可复现、功率因子），数字孪生在第 3.3 节分成「零点校准」「电机 sysID」两件事、附录又把 sysID 拆成台架测被动参数（8.9）和 chirp 拟合执行器模型（8.10），所以是第 5–7 三幕；遥操作装置和两层 PD 是真机数据这边，关键帧与 RL 是仿真数据这边，扩散策略单独一幕，压进十幕会让台架的线性拟合和式 9 的台阶、或领导臂和 ZMP 奖励抢同一帧；结果按第 5 节的「能力 / ML 兼容 / 可复现」分两幕。动画第 6、7 幕的单电机玩具（表 3 的 XC330 带 21700 电芯负载，k_p 取代码的 1500 ÷ 150）与三个演示、配音旁白、笔记「🚶 具体实例」共用同一份论文数字，图 8 的 p̃ 按图上标的数，`test_toddlerbot_explainer_demos_and_worked_example_share_the_paper_numbers` 会核对并用纯 Python 重跑玩具；真机图取自 Robot_Description_Gallery 按官方 URDF `toddlerbot_2xc` 渲染的图）。HumanML3D 9 幕（文本生成动作卡在哪 / 数据集怎么建 / 一帧 263 维 / 每 4 帧一个 snippet code / Text2Length / 时序 VAE 的一步 / 三项损失与课程学习 / 评测器与 R-Precision / 结果、消融与遗产 —— 一篇论文同时交了数据集、方法和评测协议：数据集的「怎么建」与「每帧存什么」是正文第 4、5 节两段，自编码器、长度采样、VAE 结构与训练方案在 §3.1–3.3 各自独立，评测器是附录 B 里后来被整个领域沿用的贡献，不能和 Table 2 的数字挤在一帧）。PHP、Perceptive BFM、GentleHumanoid 与 HumanML3D 的动画算例与笔记「🚶 具体实例」共用同一组数字（HumanML3D 用的是官方仓库自带的真实片段 `012314`）。Transformer 7 幕（RNN 的串行瓶颈 / 缩放点积注意力手算 / 为什么除以 $\sqrt{d_k}$ / 多头 / 位置编码 / 编码器—解码器与因果掩码 / 训练配方与结果 —— 「一次注意力怎么算」与「为什么要缩放」是 $d_k = 4$ 与 $d_k = 64$ 两组数，合成一幕会让权重条和梯度对比抢画面），π₀ 7 幕（三道坎 / 两套权重 / 分块掩码与 KV 缓存 / 流匹配 / 动作块与推理预算 / 数据与配方 / 实验与边界 —— 附录 B 里「两套权重」和「掩码」是分开的两段），π₀.₅ 7 幕（开放世界的难题 / 异构数据 / 两层推理 / 离散 + 连续两阶段 / 输入输出与部署 / 训练地点数 / 消融 —— 两层推理是推理时的分解、两阶段是训练时的分解），OP3 足球 12 幕（为什么是足球 / 一步控制 / 踢球教师 / 起身教师 / 按状态蒸馏与 λ / 自博弈 / 奖励与安全正则 / 零样本上真机 / 对比脚本控制器 / 定位球与对手意识 / 行为嵌入与价值函数 / 局限与之后 —— 两个阶段各有两件独立的事：踢球教师与起身教师是分开训的两个策略，蒸馏回答「向谁学」（式 2–3 的 λ）、自博弈回答「和谁踢」（对手池与图 7），论文是两段与两组消融；观测与滤波撑得起单独一幕；结果按论文小节一节一幕（表 1 与测法、图 5、图 4 + 图 6），压回七幕会让 λ 曲线和对手池、四项基本功和定位球抢同一帧；动画、三个演示、配音旁白与笔记「🚶 具体实例」共用同一份论文数字，156% / 24% 是 arXiv v1 的另一种测法，`test_op3soccer_explainer_demos_and_worked_example_share_the_paper_numbers` 会核对；十二幕的封面目录排成两列，单列会落到 3:4 裁剪线以下），SMP 8 幕（对抗先验不能复用 / 预训练冻结的扩散模型 / SDS 残差当奖励 / ESM 固定三档 / AdaNorm 按档归一化 / GSI 生成初始状态 / CFG 与上下半身组合 / 闭环、证据与边界 —— ESM 与 AdaNorm 同在论文 5.1 节，但一个管「抽哪一档」（方差，表 5 / 7）、一个管「三档怎么加」（量级，表 6），合成一幕会让 50 档的对数曲线和三档占比条抢同一帧；第 3–5、7 幕的二维玩具算例与笔记「🚶 具体实例」共用同一组数，`test_smp_explainer_and_worked_example_share_the_same_numbers` 会核对），域随机化 8 幕（现实鸿沟与第三条路 / 七项随机化与三种纹理 / 相机不标定 / VGG-16 检测器与训练 / 真机 1.5 cm / 图 4–5 的张数与纹理种数 / 表 2 逐项拿掉 / 真机抓取与之后 —— 「随机什么」与「相机怎么随机」是论文 III-A 里两件事，后者有自己的 10 × 5 × 10 cm / 0.1 rad / 5% 与桌高固定；「要多少」（图 4、图 5 两条对数轴曲线）与「拿掉哪一项」（表 2 的分组柱）是 IV-C 里两组独立的消融，合成一幕会抢同一帧；第 3、5–7 幕与三个演示、笔记「🚶 具体实例」共用同一份论文数字，图 4 / 图 5 是读图近似值，`test_dr_explainer_demos_and_worked_example_share_the_paper_numbers` 会核对）；Transformer、π₀、π₀.₅ 三篇的动画算例与笔记「🚶 具体实例」共用同一组数字，`tests/test_paper_demos.py::test_vla_explainers_share_numbers_with_their_notes` 会核对。

改动分镜时，`tests/test_paper_demos.py::test_explainer_scene_count_matches_the_title_and_note` 会核对三件事是否一致：分镜数量、`title` / `ariaLabel` 里的中文幕数、笔记里的 `## 🎬 N幕动画` 标题；`sub` 里写的「约 N 秒」也要和各幕 `dur` 之和对得上。新增讲解动画时记得把 bundle 加进 `EXPLAINER_BUNDLES` 与 `EXPLAINER_SCENES` 两处。

### 讲解动画与视频：先给会动的图，再给公式

视频一幕要讲一分钟左右，满屏公式观众会走神（LCP 第一版的反馈）。分镜按这几条写：

- **每幕最多留一条公式**，其余换成会动的图：抖动就让东西抖、取平均就让点一个个落下、权衡就画拔河；字幕和旁白讲图上在发生什么，不逐项念公式。
- **循环动作按真实时间画**：`stage.html` 调 `draw(st, local)`，旁白比分镜长时 `st` 停在一段的末尾，`local` 照走；网页播放器只传 `t`。bundle 里写 `function draw(t, clock) { var now = clock == null ? t : clock; … }`，抖动、走路、滚动曲线按 `now` 画，出场时机仍按 `t`。
- 推导细节、代数算例留在笔记的「🚶 具体实例」与交互演示里，动画只讲直觉和论文结论。
- **画真实机器人用真机的图，不用火柴人**：取 [Robot_Description_Gallery_Online](https://github.com/ImChong/Robot_Description_Gallery_Online) 的 `web/thumbs/<id>.webp`（透明底，按各家开源 URDF 渲染），裁到机身、按 `data/robots.json` 的 `measured.height_m` 等比例缩放后放进 `assets/img/robots/`，图注写明出处；bundle 里用 `document.currentScript.src` 解析 `../../img/robots/`，网页和离线视频都能找到（LCP 第 10 幕就是这么做的）。
- **改了某一幕先出这一段给人看**：`node render.mjs <paper> clip <from>,<to>` 只渲染这段时间并配上同一段旁白，确认后再重渲整片。

### 视频渲染可以尝试并行

完整视频逐帧截图时，如果 CPU / 内存仍有余量，可以先尝试 **2–4 个独立 Chrome 进程分段并行渲染**，保持原分辨率、帧率与画质。2026-10-08 的 BeyondMimic 全片已用四段并行完成，观察到约三倍总吞吐量；实际收益取决于机器与分镜。具体流程和拼接验收见 [视频 README「并行渲染」](scripts/paper_video/README.md#并行渲染)。

当前 `render.mjs video` 仍是串行，尚无内置 `--workers` 参数；本次使用的是临时分段脚本。后续 agent 可按文档准备独立 worker：按整数帧号划分连续区间，各段只渲染画面，按顺序拼接后统一加入完整旁白。**不要中途终止正在输出普通 MP4 的串行进程来复用前半段**：未完成封装的文件可能没有 `moov`，无法直接拼接。并行方案应在开始渲染前决定。

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

### 配音讲解视频（`K.video`）

讲解动画也可以离线渲染成带配音的竖屏视频（流水线在 `scripts/paper_video/`），目前 PPO（`ppo-video`）、AWR（`awr-video`）、DeepMimic（`deepmimic-video`）、AMP（`amp-video`）、PHC（`phc-video`）、ADD（`add-video`）、ASE（`ase-video`）、CALM（`calm-video`）、PULSE（`pulse-video`）、Diffusion Policy（`dp-video`）、BeyondMimic（`bm-video`）、LCP（`lcp-video`）、Cosmos（`cosmos-video`）、GR00T N1（`groot-video`）、Transformer（`tf-video`）、π₀（`pi0-video`）、π₀.₅（`pi05-video`）、OP3 足球（`soccer-video`）、SONIC（`sonic-video`）、GMR（`gmr-video`）、OmniRetarget（`omniretarget-video`）、HumanML3D（`humanml3d-video`）、SMP（`smp-video`）、域随机化（`dr-video`）、四足野外盲走（`qt-video`）、真实世界人形行走（`rh-video`）、ASAP（`asap-video`）、接触辅助 InEKF（`inekf-video`）、Berkeley Humanoid（`bh-video`）与 ToddlerBot（`tb-video`）三十篇接入。视频文件与海报放在笔记同目录的 `media/` 下，正文紧跟在 `🎬 N幕动画` 那一节之后，留在折叠块外面：

```html
<div class="paper-demo" data-demo="ppo-video" data-src="media/ppo_explainer_video.mp4" data-poster="media/ppo_explainer_video_poster.jpg"><p class="demo-fallback">（……也可以直接<a href="media/ppo_explainer_video.mp4" download="PPO_讲解视频.mp4">下载 mp4</a>）</p></div>
```

`<video>` 过不了 nh3 清洗，所以播放器与「下载视频」按钮由 `kit.js` 的 `K.video(host, { title, sub, size, fileName })` 在运行时生成，bundle 里只需注册一个调用它的构建函数；无 JS 时兜底文案里的 `<a download>` 仍可下载。视频用 H.264 + AAC 的 mp4（`-movflags +faststart`），体积尽量压在 6 MB 左右（超过 5 分钟的 AWR 为 7.1 MB，六分多钟的 PHC / ADD 为 8.5 / 8.3 MB，七分多钟的 ASE 为 9.5 MB，六七分钟的 CALM / PULSE 用 `-preset slow -crf 31` 压到 7.9 / 9.4 MB，八分钟的 Diffusion Policy 用 `-preset slow -crf 33` 压到 9.9 MB，GR00T N1 为 7.0 MB，六分钟上下的 Transformer / π₀ / π₀.₅ 用 `-preset slow -crf 31` 压到 7.7 / 8.2 / 8.7 MB，五分半上下的 SONIC / GMR / OmniRetarget 同参数压到 7.0 / 7.3 / 6.7 MB，七分多钟的 HumanML3D 同参数压到 9.2 MB，八分半的 SMP 用 `-preset slow -crf 34` 加 48k 音频压到 9.7 MB，八分多钟的域随机化用 `-crf 35` 加 48k 音频压到 9.9 MB，九分半的四足野外盲走用 `-preset slow -crf 36 -tune stillimage` 加 48k 音频压到 10.4 MB，十分半的真实世界人形行走同参数改 `-crf 37` 压到 11.1 MB，十分钟出头的十二幕 ASAP 同参数 `-crf 37` 压到 11.3 MB（火柴人和曲线一直在动，`-crf 36` 是 11.7 MB），九分 47 秒的十二幕 BeyondMimic 同参数 `-crf 37` 压到 11.3 MB，十分钟出头的十二幕接触辅助 InEKF 同参数 `-crf 36` 压到 11.1 MB（`-crf 37` 是 10.7 MB），十分钟出头的十二幕 OP3 足球用 `-crf 36` 压到 11.4 MB，十一分钟出头的十二幕 Berkeley Humanoid 同参数 `-crf 37` 压到 12.1 MB，十三分钟出头的十二幕 ToddlerBot 同参数 `-crf 37` 压到 14.0 MB，将近十分钟的十幕 LCP 用 `-crf 37` 压到 11.3 MB；对话里交付的是 `-crf 19` 原片），`preload="none"` 不会拖慢页面。

**首页路线图的悬浮卡片会显示视频信息**：`scripts/prepare_pages.py` 从笔记的 `data-demo="*-video"` 读 mp4 的 `mvhd` 时长、从 `## 🎬 N幕动画` 读幕数、从「🎯 一句话总结」第一段取简介，写进 `_data/papers.json` 的 `video_seconds` / `explainer_scenes` / `summary_zh`，`index.html` 再按 `_data/roadmap_links.yml` 输出成 `#roadmap-node-details`。所以接入或重渲视频后要重跑 `python3 scripts/prepare_pages.py`，并给路线图节点加上 🎬（`tests/test_roadmap_links.py::test_roadmap_video_badges_match_real_videos` 会核对两边一致）。

**视频号封面 / 笔记海报必须保持最初的片头设计**（与 PPO / AWR / DeepMimic / AMP 的封面一致，不随视频片头的安全区缩小）：整张 1080×1920 不缩放，顶上品牌角标 + arXiv 胶囊（没有 arXiv 版本的论文写会议名，如 HumanML3D 的 CVPR 2022）；英文大标题 250px、字距 16px（过长改 4px 字距、等比缩到宽 ≤ 980，在 190–440 带里居中）；中文名 70px + 一句话 40px 从 470 起、各占一行；论文信息框从 680 起（34px）；目录紧跟其下（40px，条数多时收紧行距）；视频号「设置封面」按 3:4 置顶裁剪到 y 1440，目录最后一行的字底不得超过 1405（同 AMP，离裁剪线留 35px）；块与块永不重叠。这套排版由 `scripts/paper_video/stage.html` 的 `classicCover()` 统一生成，`papers/<paper>.js` 的片头只管视频。生成封面用 `node render.mjs <paper> cover`，之后必须跑 `node check_layout.mjs <paper> cover` 并得到 `no overlap`，再把 `cover.png` 缩成 540×960 的海报；细则见 `scripts/paper_video/README.md`「封面」。

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

- **HTML 文案**（`card` 的 `title` / `sub`、`note()` 的每一行、`verdictBox`、`K.explainer` 的字幕轨与分幕标题，以及滑块标签、按钮、checkbox、`legend` 图例、`statsRow` 的 key 与读数、表格单元格）里直接写 `$…$`，和 `**加粗**`、反引号包起来的 inline code 可以混用（`**$r_t(\theta)$**`、`` `awrWeights()` ``）。解析在 `K.rich()`：一对反引号会渲染成 `<code class="demo-code">`，样式在 `paper-demos.css`，所以函数名 / 配置项直接写反引号即可，不要手写 HTML。
- **SVG 分镜**里一整条公式用 `K.svgMath(x, y, tex, { size, anchor, cls, w, display })`，`x / y / anchor` 与 `svgText` 同义（`y` 仍是基线），返回的 `<foreignObject>` 带 `setTex()`（数字会变的公式）、`setX()` / `setY()`（跟着画面移动的标签）、`setCls()` / `setTone()`（HTML 吃 `color`，`paint()` 在这儿不起作用）。公式里夹几个中文字用 `\text{…}`，其中的 `%` / `#` / `&` 必须转义。
- **中文里夹公式的一行标注**（`在 $\mathcal{D}_{\mathrm{loco}}$ 里检索`、`温度 $\eta = 0.1$：几乎就是取最小值`）用 `K.svgRich(x, y, str, { size, anchor, cls, w })`：`str` 与 `rich()` 同一套标记，只有 `$…$` 交给 KaTeX，中文保持分镜自己的字体（塞进 `\text{}` 则继承 KaTeX 的 `KaTeX_Main, Times New Roman, serif`，有衬线中文字体的系统上会变成宋体），也比整句 `\text{}` 好读，方法同 `svgMath`，改文字用 `setText()`。**不要在 `svgText` 里用 `_`、`^`、Unicode 上下标或 `‖` 拼公式**，那是原生 SVG 文字，KaTeX 到不了，`x_i`、`λ_PPO` 会原样显示在页面上（`tests/test_paper_demos.py::test_storyboard_formulas_are_not_spelled_in_plain_text` 会拦）；代码标识符（`tpose_qpos`、`z_diff`）不算公式。
- **每帧都在变的数字不要塞进公式**：拆成「静态公式标签 + `svgText` 数字」，否则每帧重排一次公式。
- **Canvas 演示画不了公式**：`stage` / `plot` 那套是原生 Canvas，KaTeX 到不了，公式只能放在卡片标题、`demo-note` 等 HTML 部分。同一个标签既进 HTML 又画到 Canvas 上（坐标轴名、柱子底下的字）时，Canvas 那一处先过 `K.richToPlain()`，否则会画出 `$\Delta\theta$`；滑块的 `aria-label` 已经自动这样降级。
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

