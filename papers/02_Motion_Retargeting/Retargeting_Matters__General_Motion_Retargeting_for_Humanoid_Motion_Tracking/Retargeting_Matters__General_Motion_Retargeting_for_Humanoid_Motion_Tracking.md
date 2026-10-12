---
layout: paper
title: "Retargeting Matters: General Motion Retargeting for Humanoid Motion Tracking"
zhname: "Retargeting Matters：面向人形运动跟踪的通用动作重定向"
category: "Motion Retargeting"
paper_order: 1
demos: ["gmr"]
---

# Retargeting Matters: General Motion Retargeting for Humanoid Motion Tracking
**Retargeting Matters：面向人形运动跟踪的通用动作重定向**

> 📅 阅读日期: 2026-04-19（2026-10-11 第二版：对照论文 LaTeX 源码与官方仓库逐条核查重写，改正十余处；讲解动画从七幕改成十三幕，用 LAFAN1 的真实片段和官方代码跑出的 G1 动作，新增三个交互演示、重做配音视频）
>
> 🏷️ 板块: 02 Motion Retargeting · 运动学重定向 · 两阶段微分 IK · 评测研究
>
> ℹ️ 笔记对照 [arXiv 2510.02252 v1](https://arxiv.org/abs/2510.02252)（2025-10-02，至今只有这一版；读的是 arXiv 上的 LaTeX 源码与 PDF，表 I–III、图 1–4）和官方仓库 [YanjieZe/GMR](https://github.com/YanjieZe/GMR)（2026-04 的 `main`，版本 0.2.0：`motion_retarget.py`、`ik_configs/bvh_lafan1_to_g1.json`、`utils/lafan1.py`、README、`DOC.md`、`TEST_MOTIONS.md`）。「🚶 具体实例」里的人和 G1 动作，是我们用 mink + MuJoCo 照官方代码在 LAFAN1 上跑出来的，**不是论文的实验**。

---

## 📋 基本信息

| 项目 | 链接 / 内容 |
|------|------|
| **arXiv** | [2510.02252](https://arxiv.org/abs/2510.02252)（v1，2025-10-02） |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2510.02252) |
| **代码** | [YanjieZe/GMR](https://github.com/YanjieZe/GMR)（MIT 许可） |
| **项目主页** | [jaraujo98.github.io/retargeting_matters](https://jaraujo98.github.io/retargeting_matters) |
| **会议** | 论文用 IEEE 会议模板排版，正文与 README 都没写发表在哪个会议（旧版笔记写的「ICRA 2026（README 已标注）」在 README 里找不到，已删） |
| **机构** | Stanford University（Jiajun Wu、C. Karen Liu 共同指导） |
| **作者** | João Pedro Araújo†, Yanjie Ze†, Pei Xu†, Jiajun Wu*, C. Karen Liu*（† 同等贡献，* 同等指导） |
| **联系** | 论文通讯：jparaujo@stanford.edu；要支持新机器人 / 新格式，README 让发给 lastyanjieze@gmail.com |

---

## 🎯 一句话总结

> GMR 是一个运动学重定向方法：先在配置里写好人和机器人的关键身体怎么对应、静止姿态差多少；再**按身体部位各乘一个比例**缩放人的动作（根的平移只乘一个统一的比例）；最后用 mink 分两阶段解微分 IK——**先对朝向（位置只管末端），再对所有关键身体的位置**。论文的另一半是评测：把训练配方固定为不调奖励的 BeyondMimic，只换参考动作的来源（PHC、GMR、ProtoMotions、Unitree），在 LAFAN1 的 21 段上发现：多数动作谁都跟得上，跟不上的那几段都能追到参考动作里的三类瑕疵——高度不对（地面穿透）、自碰撞、关节值突变；GMR 的成功率与用户研究里的「像不像」都接近 Unitree 的闭源重定向数据。

> 🎮 **本文内嵌 1 段讲解动画、1 段配音视频和 3 个交互演示**（不用装任何东西）：
> [十三幕动画：GMR 全流程](#gmr-explainer-anim) —— 约 208 秒串完「人和机器人的身体不一样（直接抄关节角会浮空、滑脚）→ 两个开源基线怎么缩放 → 第 1、2 步：一张配置表 → 第 3 步：非均匀局部缩放（式 2）→ 根和脚要用同一个比例 → 第 4 步：先对朝向 → 第 5 步：再对所有位置 → 评测：只换参考动作 → 表 I：谁跟得住 → 图 3：三类瑕疵 → 图 4：像不像原动作 → 表 III：从哪一帧开始 → 开源库与局限」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。
> [配音讲解视频](#gmr-video) —— 同样十三幕，加中文配音与字幕，12 分 2 秒竖屏，可下载
> [缩放比例滑块](#demo-scale) —— 同一段 LAFAN1 走路，改根、腿、手臂的比例和人的身高，看骨盆目标高多少、踩地时目标脚离地多高、滑多快
> [两阶段 IK 玩具](#demo-ik) —— 平面两连杆手臂：只对手的位置会停在肘弯反的那一支，先对朝向再对位置就不会
> [表 I / 表 III 浏览](#demo-table) —— 21 段 × 4 种来源 × 3 种测法的成功率，只看差别大的 7 段、按长度或差距排序，以及换起始帧之后的变化

> 🚶 [具体实例](#实例-环境设定)用官方代码在 LAFAN1 `walk1_subject1.bvh` 的一段 2.8 s 走路上从头走一遍：人和 G1 的尺寸、直接抄关节角离地多少滑多少、式 2 的比例换算、三种缩放设定跑出的 G1、根和脚比例不一致时的漂移推导、两个阶段各管什么、每帧解几次 QP，最后是评测里的几笔账。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **GMR** | General Motion Retargeting | 本文的方法与开源库 |
| **Retargeting** | Motion Retargeting | 把一副骨架的动作搬到另一副骨架上 |
| **IK** | Inverse Kinematics | 逆运动学：给定身体要到的位置 / 朝向，反解关节角 |
| **QP** | Quadratic Program | 二次规划；mink 每一步解一个带约束的最小二乘 |
| **SMPL / SMPL-X** | Skinned Multi-Person Linear model（-X 带手和脸） | 参数化人体模型：形状参数 β + 姿态参数 θ → 网格与关节 |
| **AMASS** | Archive of Motion Capture as Surface Shapes | 统一成 SMPL 格式的大规模动捕合集 |
| **LAFAN1** | Ubisoft La Forge Animation dataset | Ubisoft La Forge 发布的 BVH 动捕数据，5 位演员、77 个文件；论文从里面挑了 21 段 |
| **OMOMO** | Object Motion Guided Human Motion Synthesis 的数据集 | 带人—物交互的动捕 |
| **BVH / FBX** | 两种常见动捕文件格式 | GMR 都能读 |
| **GVHMR** | — | 从单目视频估计世界坐标下的人体动作，GMR 把它当一种输入 |
| **PHC** | Perpetual Humanoid Control | 这里指 PHC 代码库里的重定向（H2O 提出的做法） |
| **PM** | ProtoMotions | NVIDIA 的动作模仿框架，自带一个基于 mink 的重定向 |
| **sim / sim-dr / sim2sim** | — | 论文的三种测法：IsaacSim 不加 / 加域随机化，MuJoCo + ROS 部署包 |

---

## 🎬 十三幕动画：GMR 全流程 {#gmr-explainer-anim}

<div class="paper-demo" data-demo="gmr-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#gmr-video}

<div class="paper-demo" data-demo="gmr-video" data-src="media/gmr_explainer_video.mp4" data-poster="media/gmr_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/gmr_explainer_video.mp4" download="GMR_讲解视频.mp4">下载 mp4（13.3 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（要解决什么问题、方法详解、实验结果）按小节收起，再往后的具体实例、源码对照、工程价值、面试、讨论记录与附录各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 1、3–8、12 幕里的人和 G1 是 LAFAN1 的真实片段与官方代码跑出的结果，和三个交互演示、下文「🚶 具体实例」是同一组数字；表格与第 10、11 幕的图来自论文。
>
> G1 的 3D 外形借了 [Robot Retarget Online](https://imchong.github.io/Robot_Retarget_Online/)（GMR 的浏览器版）的 MuJoCo WASM + three.js 模型加载代码：读和官方 GMR 逐字节相同的 `g1_mocap_29dof.xml`，按复现实验的 qpos 用正交相机逐帧离线渲染，人、目标点和连线按同一个相机投影叠在上面。第 12 幕的「默认姿态」取 BeyondMimic 代码（whole_body_tracking 的 `robots/g1.py`）里 G1 的初始关节角。

---

## ❓ 要解决什么问题

论文第 I 节把问题说成一个假设：**只要奖励函数和域随机化调得够多，重定向留下的瑕疵大多能被强化学习抹平；不做这些调参时，重定向的质量就很要紧。**

### 体型差距，与「直接抄关节角」的毛病

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文列的六样差别，以及直接把关节角抄过去会出什么事</summary>

人和人形机器人在**骨长、关节活动范围、运动学结构、体型、质量分布、驱动方式**上都不一样（第 I 节）。以论文用的 Unitree G1 为例：G1 高 1.32 m，所有 29 个关节都是单轴转动（人的肩、髋是球关节），腰的横滚和俯仰只能转 ±0.52 rad（约 ±30°）。

最省事的做法是把人的关节旋转直接抄到机器人关节上（ExBody、HumanPlus 等，第 II 节）。论文说这样会出现**浮空、脚穿地、滑脚、手脚末端漂移**；另外人的关节是 $SO(3)$ 的，机器人大多是单轴转动关节，还要额外换算。

具体有多严重，见「🚶 具体实例」例 2：骨盆留在人的高度时 G1 的脚离地 18.9 cm；把骨盆压下去，踩着的脚又以 0.22 m/s 往前滑。

</details>

### 主流做法：把瑕疵留给强化学习

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：重定向 → RL 跟踪 → 零样本上真机，瑕疵要么硬学、要么扔掉</summary>

常见流程是：动捕或视频估计出的人体动作 → 运动学重定向到机器人 → 训练 RL 跟踪策略模仿这段参考 → 零样本上真机（ASAP 是例外，它会在真机上采数据再修）。重定向留下的瑕疵（滑脚、穿地、自碰撞造成的不可能动作）要么交给 RL 在物理约束下硬学，要么把重定向坏了的数据直接丢掉（HuB）。前人的经验是：带着严重瑕疵在仿真里训得出来，但上真机要大量试错、奖励整形和调参（第 I 节）。

论文想回答三个问题（第 III 节）：

| | 问题 |
|---|---|
| **Q1** | 重定向方法的选择，会不会影响跟踪策略的表现？ |
| **Q2** | 什么样的重定向瑕疵会让策略学不会？ |
| **Q3** | 不同的重定向方法，多大程度上保住了原动作的「样子」？ |

</details>

### 两个开源基线怎么缩放

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：PHC 拟合 SMPL 身材再梯度下降、ProtoMotions 按世界坐标轴缩放；论文认为多数瑕疵出在缩放</summary>

| | PHC（H2O 提出，代码在 PHC 仓库，OmniH2O / HOVER / ASAP 等沿用） | ProtoMotions（KungfuBot 用它但关掉缩放） |
|---|---|---|
| 输入 | SMPL | SMPL / SMPL-X |
| 缩放 | 先拟合一组 SMPL 形状参数 $\beta^r$，让 SMPL 人体「长成」机器人的身材，再用这个身材按人的姿态算出关节目标 | 世界坐标的 x、y、z **各乘一个系数** |
| 求解 | 对整段动作的平均 L2 误差做梯度下降：根用 Adam、关节用 Adadelta，关节限位靠截断（式 1） | mink 微分 IK，最小化关键身体的位置与朝向误差加权和 |
| 高度后处理 | 正运动学算出整段所有身体的高度，**减去最低的那一点** | 把最低点对齐到原动作的最低点 |
| 论文点的问题 | 没考虑接触，会浮空、滑脚、穿地；SMPL 覆盖不了和人差得多的机器人；梯度下降慢，做不了实时 | — |

论文的判断（第 III-A 节）：**这两种方法产生的瑕疵，多数是缩放时引入的**；GMR 的主要区别就在缩放，后面再接两段优化。

为了公平比较，论文还做了两处处理（第 III-B 节）：LAFAN1 是 BVH，PHC 和 ProtoMotions 要 SMPL(-X)，于是先把 SMPL(-X) 的形状参数拟合到 BVH 骨架（并惩罚 $\|\beta\|_2$，β 太大会把网格扭坏），再抄关节旋转、拟合根平移；SMPL-X 比 SMPL 贴 LAFAN1 骨架，所以 ProtoMotions 用 SMPL-X。PHC 自带的「减最低点」在有的片段上会造成 **30 cm 以上的浮空**，论文改成「每帧最低身体高度的平均值」来平移整段。

</details>

### GMR 的回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：五步、一个方法，加一套只换参考动作的评测</summary>

1. **一个新方法**：五步——关键身体对应、静止姿态对齐、非均匀局部缩放、第一阶段 IK（朝向 + 末端位置）、第二阶段 IK（所有位置）。
2. **一项系统评测**：BeyondMimic 不调奖励、和这几种重定向方法都是独立开发的，用它训练，单独比较重定向的影响；测成功率、跟踪误差，再做用户研究比「像不像」。

开源库那一面：一个参数换机器人（README 已支持 17 款人形），一条命令换输入格式，CPU 上实时，TWIST / TWIST2 的遥操作直接用它。

</details>

---

## 🔧 方法详解（第 IV 节）

<div class="mermaid">
flowchart LR
  H["人体动作<br/>每帧：关键身体的位置 + 朝向"] --> S1["① 关键身体对应<br/>（配置表，手写一次）"]
  S1 --> S2["② 静止姿态对齐<br/>每行一个旋转偏移"]
  S2 --> S3["③ 非均匀局部缩放<br/>式 2：h/h_ref × s_b"]
  S3 --> S4["④ 第一阶段 IK<br/>全部朝向 + 末端位置"]
  S4 --> S5["⑤ 第二阶段 IK<br/>全部位置 + 朝向"]
  S5 --> R["机器人：根位姿 + 关节角"]
  R -. 下一帧的初值 .-> S4
</div>

### 第 1 步：关键身体对应；第 2 步：静止姿态对齐

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：配置文件里的一行长什么样，骨盆那一行的旋转偏移为什么是 (0.5, 0.5, 0.5, 0.5)</summary>

**第 1 步**：用户写出人体骨骼与机器人身体的对应表 $\mathcal{M}$（一般是躯干、头、腿、脚、手臂、手），并给每对设位置与朝向误差的权重。LAFAN1 → G1 的配置 `bvh_lafan1_to_g1.json` 里一共 **14 对**：骨盆、躯干、左右髋、膝、脚、肩、肘、手（这份没有头）。

**第 2 步**：人体骨骼和机器人身体在静止姿态下的坐标轴朝向不一样，给每对加一个旋转偏移，让两边静止时朝向一致；有时再加一个局部位置偏移。论文说这能减轻 H2O 提到的「内八字脚」（toed-in）。

两步都写在同一份 JSON 里（`DOC.md` 有注释），每一行 `机器人身体: [人体骨骼, 位置权重, 朝向权重, 位置偏移, 旋转偏移(wxyz)]`，第 4、5 步各一张表（`ik_match_table1` / `ik_match_table2`）：

```json
"left_ankle_roll_link": ["LeftFootMod", 50, 10, [0.0, 0.0, 0.0], [-0.70710678, 0.70710678, 0.0, 0.0]]
```

`LeftFootMod` 是加载器拼出来的：位置取 `LeftFoot`（踝），朝向取 `LeftToe`。骨盆那一行的旋转偏移是 $(0.5, 0.5, 0.5, 0.5)$：$2\arccos 0.5 = 120°$，转轴 $(1,1,1)/\sqrt3$，作用是把 x→y→z→x 轮换一遍。代码里的目标朝向是「人的朝向 × 偏移」（`offset_human_data`），所以这一行说明：LAFAN1 的 Hips 局部坐标系里，人的 x 轴对应机器人的 z 轴（向上）。

</details>

### 第 3 步：非均匀局部缩放（式 2、式 3）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：先按身高算总比例，再乘各部位的系数；根只乘一个统一的比例</summary>

论文认为别的方法的瑕疵**多数出在缩放**。GMR 先按人的身高算一个总比例 $h/h _ {\text{ref}}$，再乘每个关键身体自己的系数 $s_b$（这样上半身、下半身可以缩得不一样）：

$$
\mathbf{p}_b^{\text{target}} = \frac{h}{h_{\text{ref}}}\, s_b \left(\mathbf{p}_b^{\text{source}} - \mathbf{p}_{\text{root}}^{\text{source}}\right) + \frac{h}{h_{\text{ref}}}\, s_{\text{root}}\, \mathbf{p}_{\text{root}}^{\text{source}}
$$

对根本身，式子退化成 $\mathbf{p} _ {\text{root}}^{\text{target}} = \frac{h}{h _ {\text{ref}}} s _ {\text{root}} \mathbf{p} _ {\text{root}}^{\text{source}}$（式 3）。论文的原话：**根的平移只乘一个统一的比例，对避免滑脚至关重要。**

LAFAN1 → G1 的取值：配置 `human_height_assumption` = 1.8 m；`utils/lafan1.py` 把 LAFAN1 的身高写死成 1.75 m（算身高的两行被注释掉了），所以 $h/h _ {\text{ref}} = 0.972$；`human_scale_table` 里根、躯干、腿都是 0.9、手臂是 0.75，乘起来是 **0.875** 与 **0.729**。SMPL-X → G1 的配置是 0.9 / 0.8。

只缩位置，朝向不缩（`scale_human_data` 只改位置）。

</details>

<div class="paper-demo" data-demo="gmr-scale" id="demo-scale"><p class="demo-fallback">（本节含交互演示：缩放比例滑块，需要启用 JavaScript）</p></div>

### 为什么根和腿要用同一个比例（由式 2 推出）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：脚踩住、根走了 Δ，目标脚挪 k(s_root − s_foot)Δ</summary>

论文只说了「根只乘一个统一比例」。把式 2 对时间差分：人的脚踩在地上不动（$\Delta\mathbf{p} _ {\text{foot}}^{\text{source}} = 0$），根往前走了 $\Delta$，则

$$
\Delta \mathbf{p}_{\text{foot}}^{\text{target}} = \frac{h}{h_{\text{ref}}}\left(s_{\text{root}} - s_{\text{foot}}\right)\Delta
$$

两个系数一样，目标脚就不动；不一样，踩地的脚就会跟着根滑。这正是配置里根、躯干、腿都写 0.9、只有手臂单独 0.75 的原因（手臂一般不着地，单独缩不会滑脚）——这是我们的推导与解读，论文没写成式子。数值见「🚶 具体实例」例 5。

</details>

### 第 4 步：第一阶段 IK——先对朝向（式 4、式 5）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：朝向全对、位置只管末端；mink 的微分 IK；停止条件；初值</summary>

为了**避开局部极小**，求解分两个阶段。第一阶段只考虑全部关键身体的**朝向**和**末端（手、脚）的位置**：

$$
\min_{\mathbf q}\ \sum_{(i,j)\in\mathcal M} (w_1)^R_{i,j}\,\big\|R_i^h \ominus R_j(\mathbf q)\big\|_2^2 + \sum_{(i,j)\in\mathcal M_{\text{ee}}} (w_1)^p_{i,j}\,\big\|\mathbf p_i^{\text{target}} - \mathbf p_j(\mathbf q)\big\|_2^2 \quad \text{s.t.}\ \ \mathbf q^- \le \mathbf q \le \mathbf q^+
$$

- $\mathbf q$ 是根平移、根朝向和关节角；$R_i \ominus R_j$ 是两个朝向之差的指数映射；关节限位有时要收窄，免得出现不像人的动作。
- **初值**：根的位置取缩放后的根，根的朝向只取人的偏航角。
- 用 **mink**（MuJoCo 上的微分 IK 库）求解：不是直接求 $\mathbf q$，而是每一步解一个 QP 求广义速度，积分一下让误差变小（式 5）：

$$
\min_{\dot{\mathbf q}}\ \big\|e(\mathbf q) + J(\mathbf q)\,\dot{\mathbf q}\big\|_W^2 \quad \text{s.t.}\ \ \mathbf q^- \le \mathbf q + \dot{\mathbf q}\,\Delta t \le \mathbf q^+
$$

  $\Delta t$ 是求解器的参数，不必等于动作的帧间隔（代码里取模型的 `timestep`，G1 模型是 0.002 s）。
- **停止**：目标函数的变化小于 **0.001**，或满 **10** 次迭代。

LAFAN1 → G1 的第一阶段权重：朝向权重躯干和两肩 100、其余 10；位置权重只有两只脚是 50，**两只手是 0**（论文写「末端是手和脚」，这份配置只给了脚）。

</details>

<div class="paper-demo" data-demo="gmr-ik" id="demo-ik"><p class="demo-fallback">（本节含交互演示：两阶段 IK 玩具，需要启用 JavaScript）</p></div>

### 第 5 步：第二阶段 IK——再对所有位置（式 6）；整段动作怎么做

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：换一套权重、所有关键身体的位置都算；逐帧热启动；整段减最低点</summary>

第二阶段以第一阶段的解为初值，换一套权重 $(w_2)$，**所有关键身体的位置**都纳入目标，朝向项保留；停止条件同上（式 6）。LAFAN1 → G1 的第二阶段位置权重：骨盆 100、脚 50、髋 / 膝 / 肘 / 手 10、肩 5、躯干 0；朝向权重骨盆、髋、膝、肘、手 5，躯干与脚 10，两肩 100。

**整段动作**：逐帧做，上一帧的解当这一帧第 4 步的初值；整段做完后用正运动学算出所有身体随时间的高度，**减去最低值**来修浮空或穿地（论文第 IV 节最后一段）。官方代码里这一步只在批量脚本里有，开关叫 `HEIGHT_ADJUST`：`smplx_to_robot_dataset.py` 默认打开，`bvh_to_robot_dataset.py` 默认关闭；单段脚本 `smplx_to_robot.py`、`bvh_to_robot.py` 都不做。

</details>

### 代码里的数字（`motion_retarget.py`）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：求解器、阻尼、迭代上限、速度限位的默认值，以及旧版笔记的几处误读</summary>

| 参数 | 取值 | 说明 |
|------|------|------|
| 求解器 `solver` | `"daqp"` | 传给 `mink.solve_ik` 的 QP 后端 |
| 阻尼 `damping` | **0.5** | `mink.solve_ik` 的阻尼项（旧版笔记叫它 `lm_damping`；每个 `FrameTask` 自己的 `lm_damping` 是 1） |
| `max_iter` | **10** | 每个阶段：先解一次，误差还在降就最多再解 10 次 |
| 停止阈值 | **0.001** | 相邻两次的误差（所有任务误差拼成向量的范数）之差小于它就停 |
| 速度限位 | $3\pi$ rad/s | **只有 `use_velocity_limit=True` 才加，默认 `False`**（README 2025-08-24 的更新说默认打开，现在的代码是关的） |
| `--rate_limit` | 命令行开关 | 让可视化按动作原速播放；**和关节速度限位无关**（旧版笔记把它当成限位） |

</details>

---

## 📊 实验结果（第 V 节）

### 评测设计

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：四种来源、LAFAN1 的 21 段、BeyondMimic、三种测法、成功的定义与三种误差</summary>

| 项目 | 内容 |
|------|------|
| **来源** | PHC、GMR、ProtoMotions（PM），以及 **Unitree**：方法不公开，但它重定向好的 LAFAN1 数据是公开的（BeyondMimic、VideoMimic 都在用） |
| **动作** | LAFAN1 里挑的 **21 段**，5.5–130.5 s，合计 796.76 s ≈ 13.3 分钟；从走路、转身到武术、踢腿、跳舞；不含爬行、从地上起身这类和环境接触复杂的动作（侧手翻例外：手和脚不会同时着地） |
| **机器人** | Unitree G1 |
| **训练** | BeyondMimic，每段单独训一个跟踪策略，不调奖励：4 × 21 = **84 个策略** |
| **sim** | IsaacSim（训练用的仿真器），不加域随机化，每个策略 **100** 次 |
| **sim-dr** | IsaacSim 加域随机化，每个策略 **4096** 次 |
| **sim2sim** | BeyondMimic 自带的 ROS 部署包（含状态估计与推理）加一个跑 MuJoCo 的 ROS 节点，每个策略 **100** 次；随机性来自 ROS 的时序与同步、状态估计的噪声；不调仿真参数，也不给策略特权信息（比如真实根位姿） |
| **成功** | 从默认姿态出发，跑到参考动作结束，中途**锚点身体的高度或朝向**没有偏离参考超过阈值（超过就终止） |
| **跟踪误差** | 按 KungfuBot 的做法：全局身体位置误差 $E _ {\text{g-mpbpe}}$（mm）、相对根的身体位置误差 $E _ {\text{mpbpe}}$（mm）、关节角误差 $E _ {\text{mpjpe}}$（$10^{-3}$ rad），只算策略还没倒的帧 |
| **用户研究** | 见下文图 4 |

</details>

### 表 I：成功率（Q1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：21 段 × 3 种测法 × 4 种来源的成功率全表，以及怎么读</summary>

| 动作 | 长度 s | sim PHC | GMR | PM | U | sim-dr PHC | GMR | PM | U | sim2sim PHC | GMR | PM | U |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Walk 1 | 33 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| Walk 2 | 5.5 | **23** | 100 | 100 | 100 | **53.54** | 100 | 99.98 | 100 | 100* | 100* | 100* | 100* |
| Turn 1 | 12.3 | 93 | 100 | 100 | 100 | 87.18 | 99.98 | 99.95 | 100 | 100* | 100* | 99* | 100* |
| Turn 2 | 12.3 | 100 | 100 | 100 | 100 | 99.95 | 99.98 | 100 | 99.98 | 99 | 100 | 100 | 99 |
| Walk (old) | 33 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| Walk (army) | 13 | 100 | 100 | 100 | 100 | 99.85 | 98.63 | 99.95 | 99.95 | 100 | 100 | 99 | 100 |
| Hop | 13 | 95 | 100 | 100 | 100 | 92.97 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| Walk (knees) | 19.58 | 100 | 100 | 100 | 100 | 99.98 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| Dance 1 | 118 | **0** | 100 | 100 | 99 | **0** | 99.46 | 99.24 | 99.95 | **0** | 100 | 100 | 100 |
| Dance 2 | 130.5 | **0** | 100 | 100 | 100 | **0.02** | 99.9 | 99.88 | 99.98 | **0** | 100 | 100 | 100 |
| Dance 3 | 120 | 100 | 100 | 100 | 100 | 100 | 100 | 99.95 | 100 | 99 | 100 | 100 | 100 |
| Dance 4 | 20 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 99 | 100 | 100 | 100 |
| Dance 5 | 68.4 | 100 | 96 | 100 | 100 | 100 | 92.75 | 99.98 | 100 | 100 | **51** | 100 | 100 |
| Run (slow) | 50 | 100 | 100 | 100 | 100 | 99.19 | 99.88 | 99.95 | 99.98 | 100 | 100 | 100 | 100 |
| Run | 11 | 100 | 100 | 100 | 100 | 99.98 | 100 | 99.95 | 100 | 100 | 100 | 100 | 100 |
| Run (stop & go) | 37 | **17** | 98 | **20** | 100 | **20.46** | 91.24 | **40.26** | 99.83 | 74 | 100 | **26** | 100 |
| Hop around | 18 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| Hopscotch | 10 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 99.98 | 100 | 100 | 100 | 100 |
| Jump and rotate | 21 | 100 | 100 | 100 | 100 | 99.98 | 100 | 99.9 | 100 | 99 | 100 | 100 | 99 |
| Kung fu | 8.6 | 100 | 100 | 100 | 100 | 100 | 99.95 | 100 | 100 | 100 | 100 | 100 | 100 |
| Various sports | 42.58 | 100 | 100 | 100 | 100 | 99.98 | 99.98 | 99.95 | 100 | 100 | 100 | 100 | 99 |

\* Walk 2、Turn 1 的 sim2sim 用的是表 III 换过的起始帧。

**怎么读**：21 段里，**11 段**在所有来源、所有测法下都超过 98%，另有 **3 段**（Walk 1、Walk (old)、Hop around）处处 100%；**差别集中在剩下 7 段**（Walk 2、Turn 1、Hop、Dance 1、Dance 2、Dance 5、Run (stop & go)）。Unitree 的数据几乎全是满分，印证了 BeyondMimic 的结果；GMR 和 ProtoMotions 紧随其后，各有一个例外（GMR 的 Dance 5、ProtoMotions 的 Run (stop & go)）；PHC 最差。长度不是问题：PHC 的 Dance 3 有两分钟，三种测法都跟得完（99–100%）。旧版笔记写「21 段中仅 3 段全方法都完美，说明通用跟踪仍很难」，把这张表读反了。

</details>

<div class="paper-demo" data-demo="gmr-table" id="demo-table"><p class="demo-fallback">（本节含交互演示：表 I / 表 III 浏览，需要启用 JavaScript）</p></div>

### 表 II：跟得完不等于跟得准

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：sim 设定下 21 段的跟踪误差统计</summary>

| 统计 | $E _ {\text{g-mpbpe}}$ PHC | GMR | PM | U | $E _ {\text{mpbpe}}$ PHC | GMR | PM | U | $E _ {\text{mpjpe}}$ PHC | GMR | PM | U |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 最小 | 71.8 | 59.9 | 66.0 | **51.1** | 20.9 | **18.1** | 24.1 | 18.2 | 569.5 | 362.0 | 499.0 | **355.5** |
| 中位数 | 111.9 | 91.2 | 101.9 | **73.4** | 29.9 | 27.6 | 30.4 | **23.1** | 739.8 | 546.0 | 599.7 | **467.2** |
| 平均 | 247.8 | 104.1 | 139.7 | **77.2** | 40.2 | 28.1 | 33.2 | **23.2** | 778.5 | 561.7 | 641.8 | **483.0** |
| 最大 | 1062.3 | 200.0 | 915.6 | **131.4** | 134.4 | 48.0 | 107.9 | **28.9** | 1336.1 | 1044.8 | 1397.9 | **678.5** |

除了 $E _ {\text{mpbpe}}$ 的最小值 GMR 第一，其余各项都是 Unitree 最好、GMR 第二。成功只要求「跑到结尾不倒」，PHC 和 ProtoMotions 的策略在全局和局部都有可观的跟踪误差——论文据此回答 Q1：**会**，重定向方法影响跟踪。

</details>

### 图 3：三类瑕疵（Q2）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：地面穿透、自碰撞、关节值突变各对应哪一段、低到多少</summary>

sim2sim 里分数低的几段，都能追到参考动作里的瑕疵：

| 瑕疵 | 哪一段 | sim2sim | 细节 |
|---|---|---|---|
| **地面穿透**（高度不对） | PHC 的 Dance 1、Dance 2 | 0% / 0% | 最深一处 60 cm |
| **自碰撞** | ProtoMotions 的 Run (stop & go) | 26% | 两条腿互相穿过 |
| **关节值突变** | GMR 的 Dance 5 | 51% | 腰的横滚角多次在 ±0.52 rad 的限位之间跳（图 3c 画的是第 1025–1230 帧） |

除了 PHC 的两段长舞蹈，这些瑕疵并没有让动作变得不可学，但要想把成功率拉满，三类都该在重定向时避开。GMR 的跳变很少见：只出现在 Dance 5 的一段 **10 s** 里，不到全部数据的 **2%**（10 / 796.76 ≈ 1.3%），是优化阶段引入的；所有动作用同一套权重，个别动作还得再调。

</details>

### 图 4：用户研究（Q3）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：20 人、45 题，GMR 和三家各比一次</summary>

参与者看一段 5 s 的参考动作（用 LAFAN1 的 SMPL-X 拟合渲染）和两段重定向视频（一段 GMR、一段是 Unitree / PHC / ProtoMotions 之一），左右顺序随机、不告诉是谁，选更像参考的那段，也可以选「分不出」。5 s 片段从 15 段动作里随机截，每段都和三家各比一次，共 **15 × 3 = 45 题**，**20 人**。

| GMR 对 | 偏好 GMR | 分不出 | 偏好对方 |
|---|---|---|---|
| PHC | **74%** | 8% | 18% |
| ProtoMotions | **63%** | 13% | 23% |
| Unitree | 25% | **37%** | 38% |

GMR 比两个开源方法更像原动作；Unitree 被认为更像，但 37% 的回答分不出两者。

</details>

### 表 III：起始帧（第 V-D 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：同一个策略，只换参考动作的起始帧</summary>

| 动作 | 起始帧 | PHC | GMR | PM | U |
|---|---|---|---|---|---|
| Walk 2 | 0 | 100 | **64** | 100 | 100 |
| | 7 | 100 | 100 | 100 | 100 |
| Turn 1 | 0 | **14** | 100 | 86 | **47** |
| | 49 | 100 | 100 | 99 | 100 |

机器人每次都从默认姿态出发，参考动作的第一帧要是离它太远，策略一开始就跟不上——和用哪种重定向无关，之前 HuB 也观察到过。建议：起始姿态要让机器人在开始推理时能安全够到，结尾停在稳定姿态上，方便安全地关掉机器人。

</details>

### 局限（第 VI 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一个数据源、一款机器人、没有交互</summary>

- 21 段都来自 LAFAN1 一个数据源，还应该测 AMASS、单目视频重建的动作；
- 只测了 Unitree G1——主要受限于 BeyondMimic 的代码（另两种重定向方法也支持 H1）；
- 没有测和环境、物体、别的机器人有交互的动作；
- 默认参数对大多数动作够用，个别动作（Dance 5）还要调权重去掉优化带来的瑕疵。

</details>

---

## 🚶 具体实例：一段 LAFAN1 走路，用官方代码从头走一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（10 节）：环境设定 / 例 1 体型差距 / 例 2 直接抄关节角 / 例 3 式 2 的比例 / 例 4 三种缩放设定 / 例 5 根和脚比例不一致 / 例 6 两个阶段各管什么 / 例 7 骨盆的旋转偏移 / 例 8 评测的几笔账 / 例 9 三条命令</summary>

> ⚠️ 本节是**我们的复现实验，不是论文的实验**：用 mink 与 MuJoCo 照抄 `motion_retarget.py`（没装 GMR 的其余依赖，加载器 `utils/lafan1.py` 照抄），在 LAFAN1 上跑 LAFAN1 → G1；「全身按身高缩放」「腿按手臂缩放」「只跑第一阶段」三种对照是我们加的。动画第 1、4–8、12 幕和三个交互演示用的是同一组数字，人和 G1 的动作数据以毫米精度嵌在 `assets/js/demos/gmr.js` 里。

<h3 id="实例-环境设定">环境设定</h3>

- 动作：LAFAN1 `walk1_subject1.bvh`（30 fps）第 920–1003 帧，84 帧、2.8 s，一段直线走路：骨盆走了 2.54 m，0.92 m/s，骨盆平均高 0.89 m。从第 860 帧开始跑，前 60 帧只用来热启动。
- 踩地：某只脚的踝（`LeftFoot` / `RightFoot`）到下一帧的水平速度 < 0.15 m/s 就算踩着；这一段左脚 39 帧、右脚 36 帧踩地。
- G1：GMR 自带的 `g1_mocap_29dof.xml`；脚底按踝横滚身体上那 4 个接触小球算（球心在踝下方 3 cm，半径 5 mm）。

<h3 id="实例-1-体型差距">例 1：体型差距</h3>

| | 人（LAFAN1 subject1，BVH 骨长） | G1（模型全零姿态的身体原点） | G1 / 人 |
|---|---|---|---|
| 身高 | 1.75 m（加载器写死） | 1.32 m（按渲染图量） | 0.756 |
| 腿长（髋→膝→踝） | 0.435 + 0.424 = **0.859** m | 0.341 + 0.318 = **0.659** m | **0.767** |
| 臂长（肩→肘→腕） | 0.330 + 0.252 = **0.582** m | 0.193 + 0.184 = **0.377** m | **0.648** |

比例不一样：腿缩到 0.77，手臂缩到 0.65——一个统一的比例对不齐。

<h3 id="实例-2-直接抄关节角">例 2：直接抄关节角</h3>

在侧视平面里，把人的大腿、小腿和竖直线的夹角照抄给 G1 的大腿（0.341 m）、小腿（0.318 m），髋放在人的髋上（这是简化算法，不是哪家的实现）：

- **骨盆留在人的高度**：踩地那些帧里，G1 的踝比人的踝平均高 **18.9 cm**——脚悬在半空。
- **把骨盆压下去 18.9 cm 让脚贴地**：腿短、步子小，身体却照人的速度走，踩着的脚平均以 **0.22 m/s** 往前滑（$\approx (1 - 0.77) \times 0.92$）。

<h3 id="实例-3-式-2-的比例">例 3：式 2 的比例</h3>

$$
\frac{h}{h_{\text{ref}}} = \frac{1.75}{1.8} = 0.972,\qquad 0.972 \times 0.9 = 0.875,\qquad 0.972 \times 0.75 = 0.729
$$

缩完的人腿相对根 × 0.875，手臂 × 0.729。这段走路里骨盆的目标高 $0.875 \times 0.89 \approx 0.78$ m，和 G1 站直时的 0.793 m 差不多。

<h3 id="实例-4-三种缩放设定">例 4：三种缩放设定跑出的 G1</h3>

| 设定 | 骨盆平均高 | 踩地时脚底高 | 踩地时滑速 | 手离目标 |
|---|---|---|---|---|
| GMR 默认（根 / 腿 0.875，手臂 0.729） | **0.788 m** | **2.2 cm** | **2.2 cm/s** | **3.1 cm** |
| 全身 × 0.756（身高比） | 0.714 m（**低 7.4 cm**） | **−5.1 cm**（陷进地面） | 4.9 cm/s | — |
| 根 0.875、腿 × 0.729（同手臂） | 0.828 m | **6.2 cm**（悬空） | **7.6 cm/s**（3.4 倍） | — |
| 只跑第一阶段 | 0.796 m | 2.7 cm | 3.9 cm/s | **7.3 cm** |

GMR 默认时脚底还高 2 cm：人的踝在踩地时平均离地 7.8 cm，乘 0.875 后目标是 6.8 cm，比 G1 站直时踝横滚身体的 3.6 cm 高出约 3 cm；论文说整段做完要减去最低点，这一步官方单段脚本不做（见第 5 步）。

<h3 id="实例-5-根和脚比例不一致">例 5：根和脚比例不一致</h3>

按式 2 推出的漂移：

$$
\frac{h}{h_{\text{ref}}}\,(s_{\text{root}} - s_{\text{foot}}) = 0.972 \times (0.9 - 0.75) = 0.146
$$

根每走 1 m，踩住的目标脚就挪 14.6 cm；这段走路 0.92 m/s，目标脚滑 $0.146 \times 0.92 \approx 0.13$ m/s。IK 跟上的只是一部分：例 4 里实测 7.6 cm/s，同时脚底悬空 6.2 cm。直接抄关节角相当于根 1、腿 0.77，所以滑得最厉害（0.22 m/s）。

<h3 id="实例-6-两个阶段各管什么">例 6：两个阶段各管什么</h3>

- 第一阶段位置项只有两只脚（权重 50），手的位置不管：只跑第一阶段，手离目标平均 **7.3 cm**；接着跑完第二阶段降到 **3.1 cm**。
- 每帧解几次 QP（一次 `mink.solve_ik` 算一次）：第一阶段 84 帧里 1 次的 1 帧、2 次的 65 帧、3 次的 18 帧，平均 **2.2** 次；第二阶段 1 次的 30 帧、2 次的 54 帧，平均 **1.6** 次。**从没碰到 10 次的上限**：上一帧的解当初值，离答案已经很近，误差降得不到 0.001 就停了。
- 我们的容器 CPU 上每帧大约 7 ms（只算重定向、不开可视化窗口），这个数只供参考；README 报的是 Threadripper 7960X 60–70 帧/秒、i9-13900K 35–45 帧/秒。

<h3 id="实例-7-骨盆的旋转偏移">例 7：骨盆的旋转偏移</h3>

$q = (0.5, 0.5, 0.5, 0.5)$：转角 $2\arccos(0.5) = 120°$，转轴 $(0.5, 0.5, 0.5)/\sin 60° = (1,1,1)/\sqrt3$。绕这根轴转 120° 把 $e_x \to e_y$、$e_y \to e_z$、$e_z \to e_x$。

<h3 id="实例-8-评测的几笔账">例 8：评测的几笔账</h3>

- 策略：4 种来源 × 21 段 = **84** 个；每个策略测 100 + 4096 + 100 = **4,296** 次，合计 360,864 次。
- 21 段合计 796.76 s ≈ **13.3 分钟**；Dance 5 那段 10 s 的跳变占 1.3%（论文写「不到 2%」）。
- 表 I 一共 21 × 3 × 4 = **252** 个成功率。
- 表 III：Walk 2 的 GMR 从第 0 帧到第 7 帧（0.23 s 之后）开始，64% → 100%；Turn 1 的 PHC 从第 0 帧到第 49 帧（1.63 s 之后），14% → 100%。
- 用户研究：15 段 × 3 家 = **45** 题。

<h3 id="实例-9-三条命令">例 9：三条命令</h3>

```bash
conda create -n gmr python=3.10 -y && conda activate gmr && pip install -e .

# LAFAN1 的 BVH → G1（--rate_limit 只是让窗口按原速播放）
python scripts/bvh_to_robot.py --bvh_file <lafan1/walk1_subject1.bvh> --robot unitree_g1 \
    --save_path <out/g1_walk1.pkl> --rate_limit

# AMASS 的 SMPL-X → G1（先按 README 下载 SMPL-X 人体模型）
python scripts/smplx_to_robot.py --smplx_file <amass/xxx_stageii.npz> --robot unitree_g1 \
    --save_path <out/g1_xxx.pkl> --rate_limit

# 回放
python scripts/vis_robot_motion.py --robot unitree_g1 --robot_motion_path <out/g1_walk1.pkl>
```

单段脚本存的 `.pkl`：`fps`、`root_pos`（T×3）、`root_rot`（T×4，**存的是 xyzw**，读的时候 `load_robot_motion` 再换回 wxyz）、`dof_pos`（T×自由度数），`local_body_pos` 和 `link_body_list` 是 `None`（批量脚本才用 PyTorch 正运动学填上）。给 BeyondMimic 用要先转成 CSV（`scripts/batch_gmr_pkl_to_csv.py`）。

</details>

---

## 🤖 工程价值

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：重定向从附录走到台前；浏览器版 GMR；本仓库里用到 GMR 的笔记</summary>

1. **把一个默认被当成前处理脚本的环节单独拿出来比**：同一套跟踪配方、只换参考动作，把「重定向质量」变成了可以量的东西（成功率、跟踪误差、用户偏好），也给出了该避开的三类瑕疵和「起始帧」这个容易忽视的因素。
2. **开源库**：一个参数换机器人、一条命令换数据源，CPU 上够快，可以直接接遥操作（TWIST / TWIST2）；MimicKit 也支持读 GMR 格式（README 2025-11-08）。
3. **仍要人手的地方**：每款机器人一份 JSON（对应、权重、偏移、比例），个别动作还要调权重；它只管运动学，物理上做不做得出来仍要靠下游的跟踪策略。
4. **在浏览器里直接试**：[Robot Retarget Online](https://imchong.github.io/Robot_Retarget_Online/) 把 GMR 移植成纯前端（MuJoCo WASM 做正运动学、雅可比与微分 IK），能加载 LAFAN1 示例、看两阶段匹配表、一键重定向并导出 NPZ。它的 README 说：在自带的 walk 样例上重定向到 G1，与 Python 版 GMR 相差 0.019 rad（关节角 RMSE）/ 0.27 cm（根位置 RMSE），差别来自它用阻尼 Gauss–Newton 一步代替 mink 的 `daqp` QP。上面动画里的 3D G1 就是用它的模型加载代码渲染的。

本仓库里提到 GMR 的笔记：

| 笔记 | 怎么用 GMR |
|------|------|
| [GentleHumanoid](../../04_Loco-Manipulation_and_WBC/GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object/GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object.html) | 用 GMR 把 AMASS / InterX / LAFAN 约 25 小时动作重定向到 29 自由度 G1（50 Hz），再训练跟踪策略 |
| [OmniRetarget](../OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.html) | 拿 GMR（只匹配关键点与朝向）当对比方法之一，说明它不显式建模物体与地形 |

</details>

---

## 📁 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：仓库目录、论文五步落在哪几个函数、支持的机器人与格式、TEST_MOTIONS.md 的实际内容</summary>

```
GMR/
├── general_motion_retargeting/
│   ├── motion_retarget.py     # ★ GeneralMotionRetargeting：缩放、偏移、两阶段 mink IK
│   ├── params.py              # 机器人模型路径、IK 配置表的索引
│   ├── ik_configs/*.json      # 每个「格式 → 机器人」一份：对应、权重、偏移、比例
│   ├── utils/lafan1.py        # LAFAN1 BVH 加载（z 轴朝上、厘米转米、拼出 *FootMod、身高写死 1.75 m）
│   ├── kinematics_model.py    # PyTorch 正运动学：批量脚本里算 local_body_pos、做高度修正
│   ├── data_loader.py         # load_robot_motion：读 .pkl（xyzw → wxyz）
│   └── robot_motion_viewer.py # MuJoCo 可视化
├── scripts/                   # smplx / bvh / fbx / gvhmr / xsens / optitrack → robot，批量版，可视化，pkl → csv
├── assets/<robot>/            # 各机器人的 MJCF / URDF
├── DOC.md                     # IK 配置的字段说明
└── TEST_MOTIONS.md            # 不好重定向的测试动作
```

| 论文 | 代码 |
|------|------|
| 第 1 步：对应与权重 | `ik_match_table1` / `ik_match_table2` 的键（机器人身体）、第 0 项（人体骨骼）、第 1、2 项（位置、朝向权重） |
| 第 2 步：静止姿态对齐 | 第 3、4 项（位置偏移、wxyz 旋转偏移），`offset_human_data` 先乘旋转偏移、再在局部系里加位置偏移 |
| 第 3 步：缩放（式 2） | `human_height_assumption`、`human_scale_table`，`__init__` 里乘 `actual_human_height / human_height_assumption`，`scale_human_data` 按根缩放 |
| 第 4、5 步：两阶段 IK | `retarget()`：`tasks1` 跑到误差降不到 0.001 或满 10 次，再 `tasks2`；每次 `mink.solve_ik(configuration, tasks, dt, "daqp", 0.5, limits)` 后 `integrate_inplace` |
| 关节限位 | `mink.ConfigurationLimit`；`VelocityLimit`（3π）默认不加 |
| 逐帧热启动 | `self.configuration` 在帧与帧之间保留，上一帧的解就是初值 |
| 整段减最低点 | 批量脚本的 `HEIGHT_ADJUST`：`smplx_to_robot_dataset.py` 默认 `True`，`bvh_to_robot_dataset.py` 默认 `False` |

**支持的机器人**（README 的表，ID 0–17 共 18 行，其中 G1 带手、Booster T1 29 自由度是变体；README 说 GR3 是「第 17 款人形」）：Unitree G1（29）/ G1 带 Dex31 手（43）/ H1（19）/ H1-2（27），Booster T1 / T1 29 自由度 / K1（22），Stanford ToddlerBot，Fourier N1 / GR3（31），EngineAI PM01，HighTorque Hi（25），Galaxea R1 Pro（轮式，24），Kuavo S45（28），Berkeley Humanoid Lite（22），PND Adam Lite（25），Tienkung（20），PAL TALOS（30）；AgiBot A2、OpenLoong 待支持。

**输入格式**：SMPL-X（AMASS、OMOMO）、BVH（LAFAN1、Nokov、Xsens 导出）、FBX（OptiTrack 离线 / 实时）、GVHMR（单目视频）、PICO（XRoboToolkit，TWIST2）、Xsens MVN 实时流。

**`TEST_MOTIONS.md` 的实际内容**（旧版笔记的表把标了「已成功」的动作当成了失败案例，还编了失败现象，已改正）：

| 文件 | 状态 |
|---|---|
| AMASS `BMLrub_rub081_0031_rom_stageii.npz` | ✅ 已成功 |
| AMASS `KIT_3_walk_6m_straight_line04_stageii.npz` | ✅ 已成功 |
| AMASS `DanceDB/20120807_CliodelaVara/Clio_Maleviziotikos_stageii.npz` | 未解决 |
| AMASS `DanceDB/20130216_AnnaCharalambous/Anna_Curiosity_C3D_stageii.npz` | 未解决：身体抖动 |
| AMASS `CMU/111/111_21_stageii.npz` | 未解决：应该是面朝右躺在地上，G1 的右臂被拧住 |
| LAFAN1 `dance1_subject2.bvh` | ✅ 已成功 |

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：六问六答</summary>

**Q1：重定向不就是一个 IK 脚本，为什么值得单独发一篇？**
A：论文的核心是一个对照实验：训练配方固定为不调奖励的 BeyondMimic，只换参考动作的来源，结果在 21 段里有 7 段差得很多，而且都能追到参考动作里的具体瑕疵（穿地、自碰撞、关节突变）。它把「重定向质量」变成可以量的东西，再给出一个在成功率和保真度上都接近闭源数据的开源方法。

**Q2：GMR 和 PHC、ProtoMotions 的重定向最大的区别在哪？**
A：缩放。PHC 先把 SMPL 人体拟合成机器人的身材再梯度下降；ProtoMotions 按世界坐标的 x、y、z 各乘一个系数；GMR 按身体部位各乘一个系数、根只乘一个统一的比例。论文认为前两者的瑕疵多数是缩放引入的。求解上 GMR 和 ProtoMotions 都用 mink，但 GMR 分两个阶段。

**Q3：为什么要分两个阶段？**
A：论文的说法是避开局部极小。第一阶段对上全部朝向、位置只管末端，先把姿势「摆对」；第二阶段再把所有关键身体的位置拉到目标。我们的复现里只跑第一阶段，手离目标 7.3 cm，两阶段降到 3.1 cm。

**Q4：根的比例为什么重要？**
A：由式 2 可推出：脚踩住、根走了 Δ，目标脚挪 $\frac{h}{h _ {\text{ref}}}(s _ {\text{root}} - s _ {\text{foot}})\Delta$。根和腿的比例不一样，踩地的脚就会滑；所以配置里根、躯干、腿同一个比例（0.9），只有手臂单独（0.75）。

**Q5：表 I 里 PHC 的 Dance 1、Dance 2 为什么是 0？**
A：那两段的 PHC 参考动作有明显的地面穿透，最深 60 cm（图 3a）。这是论文里唯一一处瑕疵让动作「完全学不会」的例子；其余瑕疵只是降低成功率。

**Q6：同一个策略，成功率为什么会因为起始帧差几十个百分点？**
A：评测时机器人总从默认姿态出发；参考的第一帧离默认姿态太远，策略一上来就得「跳」过去，容易倒。表 III 里 Turn 1 的 PHC 从第 0 帧开始 14%，从第 49 帧开始 100%。这和重定向方法无关，建议起始姿态选机器人能安全够到的、结尾停在稳定姿态。

</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两条：运动学重定向怎么影响上真机、接新人形要准备什么</summary>

- **Q**（2026-04-19）：GMR 只做运动学，为什么说它影响 sim-to-real？
  A：**间接**影响。参考动作是跟踪策略的目标；参考里有穿地、自碰撞、关节突变，策略要么追不上、要么学成一个和原动作不太一样的变体。论文的 sim2sim（MuJoCo + ROS 部署包）就是为了在接近真机的条件下量这一点。

- **Q**：给一款新人形（比如 Fourier GR3）接 GMR，要准备什么？
  A：MJCF / URDF 和网格；在 `ik_configs/` 里写一份「格式 → 机器人」的 JSON（对应、两张表的权重、旋转 / 位置偏移、`human_scale_table`、`human_height_assumption`），再在 `params.py` 里登记路径。README 也接受把机器人文件发给作者代为支持。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX、与其他工作的关系、开放问题、旧版笔记的改正</summary>

<h3 id="a-bibtex">A. BibTeX</h3>

```bibtex
@article{joao2025gmr,
  title={Retargeting Matters: General Motion Retargeting for Humanoid Motion Tracking},
  author={Joao Pedro Araujo and Yanjie Ze and Pei Xu and Jiajun Wu and C. Karen Liu},
  year={2025},
  journal={arXiv preprint arXiv:2510.02252}
}
```

<h3 id="b-与其他工作的关系">B. 与其他工作的关系</h3>

| 工作 | 关系 |
|------|------|
| H2O / PHC | 「拟合 SMPL 身材 + 梯度下降」的重定向，论文的基线之一 |
| ProtoMotions / KungfuBot | 「按世界坐标轴缩放 + mink」的重定向；KungfuBot 关掉缩放 |
| BeyondMimic | 论文用来训练与评测的中性跟踪框架；Unitree 的 LAFAN1 重定向数据也是它在用 |
| TWIST / TWIST2 | 同组的遥操作系统，实时调用 GMR |
| GVHMR | 单目视频 → 世界坐标人体动作，GMR 的一种输入 |
| OmniRetarget | 在重定向里保住人—物—地形交互；拿 GMR 当基线之一 |

<h3 id="c-开放问题">C. 开放问题</h3>

1. 论文没做逐步消融：单独去掉第 2 步（偏移）或第 3 步（非均匀缩放）、或者只跑一个阶段，表 I 会差多少？
2. 比例 0.9 / 0.75 是手调的（论文：「a reference height assumed when setting the scaling factors」），能不能从两副骨架自动算出来？
3. 根和腿必须同比例这一点，在手、膝着地的动作（侧手翻、爬行）里怎么处理？
4. 能不能在重定向时就检查并避开三类瑕疵（穿地、自碰撞、关节突变），而不是等跟踪策略失败再回头找？

<h3 id="d-旧版笔记的改正">D. 旧版笔记的改正</h3>

- 会议：README 和论文都没写「ICRA 2026」，已删。
- 第 5 步不是「加入地面接触、自碰撞约束做精修」，而是**换一套权重、把所有关键身体的位置都算进来**；GMR 的 IK 里没有接触或自碰撞约束。
- 两阶段不是「第一阶段管根 / 骨盆 / 躯干 / 头、第二阶段管手 / 脚 / 肘 / 膝」，而是**第一阶段管全部朝向 + 末端位置、第二阶段管全部位置**；理由是论文说的「避开局部极小」，不是「远端误差拉着根漂移」。
- 第 3 步的比例不是「针对每条骨骼链估计」出来的，是**配置里手写的**，再乘身高比。
- 关节速度限位 $3\pi$ rad/s 默认不加；`--rate_limit` 是可视化播放速度。
- 配置是 JSON 不是 YAML，字段是数组不是 `body / human / position_weight` 这样的键；目录是 `ik_configs/`，没有 `robot_cfgs/`。
- `kinematics_model.py` 不在 IK 循环里，只在批量脚本里算输出的身体位置；`.pkl` 的 `root_rot` 存的是 xyzw。
- 表 I 的读法、「初始帧差 50+ 个百分点」（实际 Walk 2 的 GMR 差 36、Turn 1 的 PHC 差 86、Unitree 差 53）、「Unitree 闭源基线」（方法闭源、数据公开）已按论文改正；用户研究补上 45 题与三组百分比。
- `TEST_MOTIONS.md`：见「源码对照」。
- 缩写：LAFAN1 是 Ubisoft La Forge Animation dataset，OMOMO 是「Object Motion Guided Human Motion Synthesis」的数据集。
- 旧版「具体实例」里的三条链比例（0.80 / 0.85 / 1.00）、90 条通路、单帧 18° 等示意数字已换成官方代码与复现实验的数字。

</details>
