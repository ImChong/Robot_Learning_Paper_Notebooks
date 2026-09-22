---
layout: paper
paper_order: 11
title: "BeyondMimic: From Motion Tracking to Versatile Humanoid Control via Guided Diffusion"
category: "基础强化学习"
zhname: "BeyondMimic：从运动跟踪到引导扩散的多功能人形控制"
demos: ["beyondmimic"]
---

# BeyondMimic: From Motion Tracking to Versatile Humanoid Control via Guided Diffusion
**BeyondMimic：从运动跟踪到引导扩散的多功能人形控制**

> 📅 阅读日期: 2026-04-21
>
> 🏷️ 板块: 扩散 + 控制主线终点

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2508.08241](https://arxiv.org/abs/2508.08241) |
| **PDF** | [Download](https://arxiv.org/pdf/2508.08241.pdf) |
| **作者** | Qiayuan Liao, Takara E. Truong, Xiaoyu Huang, Guy Tevet, Koushil Sreenath, C. Karen Liu |
| **机构** | UC Berkeley / Stanford University |
| **发布时间** | 2025-08 (arXiv) |
| **项目主页** | [BeyondMimic Website](https://beyondmimic.github.io/) |
| **代码** | [HybridRobotics/whole_body_tracking](https://github.com/HybridRobotics/whole_body_tracking)（运动跟踪训练）<br>[HybridRobotics/motion_tracking_controller](https://github.com/HybridRobotics/motion_tracking_controller)（sim-to-real 推理部署） |

---

## 🎯 一句话总结

> BeyondMimic 用**一套统一 MDP + 共享超参**在真机上实现高动态全身跟踪，再把跟踪策略先经 **VAE 蒸馏成 32 维潜空间**、在其上训练 **状态-潜动作联合扩散模型**（Diffuse-CLoC 式），推理时以 **Classifier Guidance** 对未见任务做零样本引导——无需为每个新任务重训 RL。

> 🎮 **本文内嵌 1 段动画 + 3 个可交互演示**（不用装任何东西）：
> 1. [八幕动画：BeyondMimic 全流程](#bm-explainer-anim) —— 约 103 秒串完「两个缺口 → 锚定跟踪 → 紧凑 MDP → 自适应采样 → VAE 潜空间 → 状态-潜动作扩散 → Classifier Guidance → 真机与闭环」
> 2. [锚定跟踪：允许它漂，不许它走歪](#bm-anchor-demo) —— 拖漂移量，看刚性跟踪怎么把动作风格吃掉
> 3. [起始相位不能均匀采](#bm-sampling-demo) —— 把 $\lambda$ 拖到 0，看简单片段被慢慢忘掉
> 4. [Classifier Guidance：代价直接相加](#bm-guidance-demo) —— 两个勾选框各是一个 $G$，同时勾上就是零样本组合

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **Diffuse-CLoC** | Guided Diffusion for Physics-Based Character Control | 状态-动作联合扩散 + 测试时引导，BeyondMimic 扩散阶段的方法论来源 |
| **VAE** | Variational Autoencoder | 变分自编码器，把一堆跟踪专家压成 32 维平滑潜空间 |
| **LDM** | Latent Diffusion Model | 潜空间扩散模型，BeyondMimic 扩散的是状态与**潜动作** |
| **DAgger** | Dataset Aggregation | 让学生自己走、专家在它到过的状态上打标签的在线蒸馏 |
| **Classifier Guidance** | 分类器引导 | 在去噪 score 上叠加任务代价梯度，把采样推向低代价轨迹 |
| **SDF** | Signed Distance Field | 有符号距离场，用于避障代价的梯度计算 |
| **DR** | Domain Randomization | 域随机化，仅对真正不确定的物理量扰动 |
| **LAFAN1** | Locomotion Analysis Framework | 长序列人形动作数据集，论文主要训练数据来源 |
| **AMASS** | Archive of Motion Capture as Surface Shapes | 大规模人体动捕库，扩散蒸馏阶段补充行走数据 |
| **RHC** | Receding Horizon Control | 预测未来轨迹、只执行前段、滚动重规划 |
| **ONNX** | Open Neural Network Exchange | 跟踪策略真机部署格式 |
| **Zero-Shot** | 零样本 | 部署后仅靠测试时代价函数引导，无需任务专属训练 |

---

## 🎬 八幕动画：BeyondMimic 全流程 {#bm-explainer-anim}

<div class="paper-demo" data-demo="bm-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 📖 **动画之后的正文默认全部折叠**：前半部分（「要解决什么问题」「方法详解」的各小节）按小节收起，后面的具体实例、实验结果、工程价值、局限、源码对照、面试问题与附录整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图、交互演示、代码块留在外面。目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。

---

## ❓ BeyondMimic 要解决什么问题？

人形机器人与人体形态相近，从人类演示中学习是获得敏捷性与自然性的可扩展路径。但现有工作普遍卡在两个缺口：

### 缺口一：可扩展的高质量运动跟踪

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：单动作专用要逐条调参，多动作统一又牺牲动态质量</summary>

| 路线 | 代表 | 痛点 |
|------|------|------|
| 单动作专用 | ASAP、KungfuBot、HuB | sim-to-real 好，但每条动作要单独调 DR / 奖励 |
| 多动作统一 | OmniH2O、GMT、TWIST | 可扩展，但动态动作质量差或牺牲全局轨迹 |
| 动画侧标杆 | PHC | 仿真里很强，真机高动态多动作跟踪尚未被证明 |

BeyondMimic 主张：**不必堆复杂 DR 和动作专属调参**——用紧凑、有原则的 MDP（锚定跟踪 + 低阻抗 PD + 极简正则）+ 适度 DR，同一套超参覆盖侧手翻、空翻、冲刺等分钟级长参考。

</details>

### 缺口二：跟踪之后如何「会用」这些技能

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：分层有规划-控制鸿沟，条件生成离不开显式目标，纯动作扩散又没法在状态上加代价</summary>

| 路线 | 痛点 |
|------|------|
| 分层：跟踪器 + 规划器 | 规划-控制鸿沟，敏捷性牺牲 |
| VAE / 条件生成（CALM、PULSE） | 训练时需显式目标条件，对避障、长程导航等隐式目标泛化差 |
| 纯动作扩散（Diffusion Policy、HugWBC） | 任务在状态空间、动作在 PD 目标空间，难以直接做 test-time guidance |

BeyondMimic 的突破口：**Diffuse-CLoC 式状态-动作联合扩散**——扩散的是物理可行的 $(s, a)$ 轨迹（实现上 $a$ 换成 VAE 的潜动作 $z$），推理时可在**状态与动作**上同时施加可微代价，实现导航、遥操作、避障、motion inpainting 等零样本组合。

</details>

---

## 🔧 方法详解

整体为**三阶段流水线**：

<div class="mermaid">
flowchart LR
    MoCap["人类动捕 / LAFAN1"] --> Retarget["Retarget → 机器人参考轨迹"]
    Retarget --> RL["阶段1：RL 运动跟踪<br/>Isaac Lab + RSL-RL"]
    RL --> VAE["阶段2-a：DAgger 蒸馏<br/>条件 VAE → 32 维潜空间"]
    VAE --> Rollout["阶段2-b：VAE rollout 采数据"]
    Rollout --> Diff["状态-潜动作联合扩散<br/>Diffuse-CLoC 式 LDM"]
    Diff --> Deploy["阶段3：真机部署<br/>Classifier Guidance"]
    Task["任务代价<br/>导航/遥操作/避障"] --> Deploy
</div>

---

### 阶段 1：可扩展运动跟踪（Scalable Motion Tracking）

#### 1.1 锚定跟踪目标（Anchor Tracking）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：锚点保留当前 xy 与参考高度、只对齐 yaw，公式与开源实现的落点</summary>

真机不可避免全局漂移。若 rigid 跟踪世界系绝对位姿，策略会过度纠偏、动作僵硬。BeyondMimic 选定参考体 $b _ {\text{ref}}$（通常为躯干/root），将各刚体位姿**相对锚定**到当前机器人姿态：

$$\hat{T}_b = T _ {\text{anchor}}\, T _ {b _ {\text{ref}}}^{-1}\, T _ {b,\text{motion}}$$

其中 $T _ {\text{anchor}}$ 保留机器人当前 $xy$ 位置与参考高度、仅对齐 yaw：

- $p _ {\text{anchor}} = [p _ {b _ {\text{ref}},x},\; p _ {b _ {\text{ref}},y},\; p _ {b _ {\text{ref}},z,\text{motion}}]$
- $R _ {\text{anchor}} = R_z\!\left(\mathrm{yaw}(R _ {b _ {\text{ref}}} R _ {b _ {\text{ref}},\text{motion}}^\top)\right)$

各体 twist $\hat{\mathcal{V}}_b = \mathcal{V} _ {b,\text{motion}}$ 不变。只跟踪子集 $\mathcal{B} _ {\text{target}}$ 上的刚体，避免过密连杆带来的冗余。

> 🔑 **直觉**：保留动作风格与相对协调，允许水平面漂移；锚体位姿误差仍提供平衡与漂移修正信号。

开源实现中，每步在 `commands.py` 用机器人锚定姿态与参考锚定姿态的 yaw 差更新 `body_pos_relative_w` / `body_quat_relative_w`，与上式一致。

</details>

这一步值得动手玩一下：拖动「漂移量」，看同一段动作在**刚性跟踪世界位姿**和**锚定跟踪**两种口径下，策略认为自己错了多少——以及为此付出的纠偏幅度怎么把动作风格吃掉：

<div class="paper-demo" data-demo="bm-anchor" id="bm-anchor-demo"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

#### 1.2 观测空间（单步、无历史）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：观测的三个分量、非对称 critic，以及状态估计不可靠时能省掉什么</summary>

跟踪策略**刻意不用历史**，观测 $\mathbf{o}$ 由三部分拼接：

| 分量 | 符号 | 维度/含义 | 作用 |
|------|------|-----------|------|
| 动作相位 | $\mathbf{c} = [\mathbf{q} _ {\text{joint,motion}}, \mathbf{v} _ {\text{joint,motion}}]$ | 参考关节位姿/速度 | 仅作时间相位，**不**直接关节跟踪 |
| 锚定误差 | $\xi _ {b _ {\text{ref}}} \in \mathbb{R}^9$ | 位置误差 3 + 旋转误差矩阵前两列 6 | 平衡、全局朝向与漂移修正 |
| 本体感知 | ${}^{b _ {\text{root}}}\mathcal{V} _ {b _ {\text{root}}}, \mathbf{q} _ {\text{joint}}, \mathbf{v} _ {\text{joint}}, \mathbf{a} _ {\text{last}}$ | 根 twist、关节状态、上一步动作 | 运动无关反馈 |

$$\mathbf{o} = [\mathbf{c},\; \xi _ {b _ {\text{ref}}},\; {}^{b _ {\text{root}}}\mathcal{V} _ {b _ {\text{root}}},\; \mathbf{q} _ {\text{joint}},\; \mathbf{v} _ {\text{joint}},\; \mathbf{a} _ {\text{last}}]$$

Critic 使用**非对称 actor-critic**：在 policy 观测之外额外输入各体相对参考体的位姿 $T _ {b _ {\text{ref}}}^{-1} T _ {b,\text{motion}}$，便于在笛卡尔空间直接估计跟踪误差。

> 若状态估计不可靠，可省略线速度相关的锚定位置误差与根线性 twist。

</details>

#### 1.3 低阻抗 PD 与动作参数化

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Raibert 启发式的 $k_p$ / $k_d$、$\omega_n = 10$ Hz 与 $\zeta = 2$，以及为什么动作不 clip</summary>

动画工作常用高 $k_p$ 近似运动学跟踪；真机上会放大噪声、损失碰撞柔顺性。BeyondMimic 按 Raibert 启发式设阻抗：

$$k _ {p,j} = I_j \omega_n^2, \quad k _ {d,j} = 2 I_j \zeta \omega_n$$

- 反射惯量 $I_j = k _ {g,j}^2 I _ {\text{motor},j}$
- 自然频率 $\omega_n = 10\,\text{Hz}$（偏低，促柔顺）
- 阻尼比 $\zeta = 2$（过阻尼，补偿惯量低估）

动作是**归一化关节位置设定点**，而非力矩直接输出：

$$\mathbf{q} _ {j,t} = \bar{\mathbf{q}}_j + \alpha_j \mathbf{a} _ {j,t}, \quad \alpha_j = 0.25 \frac{\tau _ {j,\max}}{k _ {p,j}}$$

低增益下 $\mathbf{q} _ {j,t}$ 是生成力矩的中间变量，**故意不**按关节限位 clip。

</details>

#### 1.4 奖励：一项任务 + 三项正则

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：四项跟踪误差走高斯型指数奖励，只留三个对 sim-to-real 关键的惩罚</summary>

对 $\mathcal{B} _ {\text{target}}$ 上各体计算位姿/速度误差，再对全体取均方：

$$\bar{e}_\chi = \frac{1}{\|\mathcal{B} _ {\text{target}}\|} \sum _ {b} \|\mathbf{e} _ {\chi,b}\|^2, \quad \chi \in \{p, R, v, w\}$$

每项用高斯型指数奖励：

$$r(\bar{e}_\chi, \sigma_\chi) = \exp\!\left(-\frac{\bar{e}_\chi}{\sigma_\chi^2}\right)$$

$$r _ {\text{tracking}} = \sum _ {\chi \in \{p,R,v,w\}} r(\bar{e}_\chi, \sigma_\chi)$$

仅加三个对 sim-to-real 关键的惩罚：

$$r = r _ {\text{tracking}} - \lambda_l r _ {\text{limit}} - \lambda_s r _ {\text{smooth}} - \lambda_c r _ {\text{contact}}$$

| 惩罚项 | 含义 |
|--------|------|
| $r _ {\text{limit}}$ | 软关节限位越界 |
| $r _ {\text{smooth}}$ | 动作变化率（抑制抖动） |
| $r _ {\text{contact}}$ | 末端自碰撞接触力超阈值计数 |

可选：对 $b _ {\text{ref}}$ 再加全局位置/朝向跟踪奖励。

> 对比 DeepMimic/PHC：没有力矩扰动、接触力大惩罚、滑移惩罚等大量启发式——论文认为**原则性建模 + 系统实现**（延迟、校准）比堆 DR 更重要。

</details>

#### 1.5 终止、重置与自适应采样

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：终止条件、按 1 秒分箱的失败率加权采样，以及防遗忘的 $\lambda$ 混合</summary>

**终止**：(1) $b _ {\text{ref}}$ 高度或 pitch/roll 误差超阈；(2) 任末端执行器高度偏离参考过多。

**重置**：从参考轨迹自适应采样起始相位 + 根位姿/速度/关节扰动。

长参考（数分钟、多技能串联）若均匀采样起始点，简单片段占主导。BeyondMimic 将轨迹按 **1 秒** 分箱，按失败率加权采样：

$$p_s = \frac{\sum _ {\tau=0}^{K-1} \gamma^\tau \bar{r} _ {s+\tau}}{\sum_j \sum_\tau \gamma^\tau \bar{r} _ {j+\tau}}$$

再与均匀分布混合 $p_s' = \lambda \frac{1}{S} + (1-\lambda) p_s$，防止灾难性遗忘。非因果指数核 $\gamma^\tau$ 强调失败前邻近时段。

</details>

$\lambda$ 和 $\gamma$ 这两个数具体在干什么？下面这个实验台把一条 30 秒的参考按 1 秒分箱，中间插了两段高动态。把 $\lambda$ 拖到 0，就能看到简单片段被慢慢忘掉的过程：

<div class="paper-demo" data-demo="bm-sampling" id="bm-sampling-demo"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

#### 1.6 域随机化（极简）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：只随机化摩擦、关节零位、躯干质心这三类真正不确定的物理量</summary>

仅随机化三类**真正不确定**的物理量：

| 随机化项 | 模拟内容 |
|----------|----------|
| 地面摩擦系数 | 接触不确定性 |
| 默认关节位置 $\bar{\mathbf{q}}_j$ | 标定误差（同时影响动作与观测） |
| 躯干质心位置 | 模型误差 |

另加环境扰动 push 等。与 ASAP/KungfuBot 的大范围力矩/延迟随机化形成对比。

</details>

#### 1.7 训练与数据规模

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：约 2.5 小时数据、7 条短序列 + 29 条长参考仿真全通过、30 条片段上 G1</summary>

- **引擎**：Isaac Lab + RSL-RL（PPO）
- **数据**：LAFAN1（Unitree retarget）为主，约 **2.5 小时**人类动作
- **仿真验证**：论文 Table S8 列出 **7** 条短序列（C 罗庆祝、侧踢、空中侧手翻等）+ **29** 条 LAFAN1 长参考（每条约 3 分钟），sim-to-sim **全部跑通**
- **真机验证**：挑 **30** 条代表性片段（共约 **15 分钟**）上 Unitree G1
- **同一 MDP、同一超参**训练所有动作，含 3 分钟级多技能串联参考

</details>

---

### 阶段 2：VAE 潜空间 + 状态-潜动作联合扩散

跟踪策略 $\pi$ 仅会复现训练过的参考。为获得任务泛化，论文把多个跟踪专家**离线蒸馏**为单一生成模型——而且是**两步**走：先用 VAE 把专家压成一个平滑潜空间，再在「状态 + 潜动作」上训练扩散。

#### 2.1 先蒸馏出潜空间：条件 VAE + DAgger

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：为什么编码参考动作而不是原始 PD 动作，以及 DAgger 与 $\beta$ 的作用</summary>

直接在原始 PD 动作上扩散并不好学。论文先训一个**条件 VAE**：encoder 只接收参考动作分量与锚定误差，产出潜码 $\mathbf{z} = \mathcal{E}(\bm{\psi}, \mathbf{e} _ {\text{anchor}})$（捕捉「动作意图」）；decoder 再把 $\mathbf{z}$ 与本体感知拼起来重建动作 $\hat{\mathbf{a}}$：

$$\mathcal{L} _ {\text{VAE}} = \mathbb{E}\big[\|\hat{\mathbf{a}} - \mathbf{a}\|^2\big] + \beta\, D _ {\mathrm{KL}}\big(q _ {\mathcal{E}}(\mathbf{z} \mid \bm{\psi}, \mathbf{e} _ {\text{anchor}})\,\|\,\mathcal{N}(\mathbf{0}, \mathbf{I})\big)$$

| 超参 | 取值 | 说明 |
|------|------|------|
| 潜维度 | **32** | 扩散真正要建模的「动作」就是这 32 维 |
| encoder / decoder | MLP `[2048, 1024, 512]` | 激活 ELU |
| KL 系数 $\beta$ | 0.01 | 把潜空间压向标准正态，换来平滑连续 |
| 蒸馏方式 | **DAgger** | 学生自己走、专家在它到过的状态上打标签，不是离线 BC |
| 数据增强 | 矢状面对称镜像 | 原始 + 镜像两份一起训，技能库直接翻倍 |

> 🔑 **为什么编码参考而不是动作**：运动状态比原始 PD 目标更结构化、更好编码（沿用 PULSE 一类工作的经验）。潜空间平滑，下一步的扩散才有稳定的东西可采。

</details>

#### 2.2 预测对象与条件

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：扩散的是 (状态, 潜动作) 成对轨迹，以及 N / H / 去噪步数那张超参表</summary>

扩散对象是一整条**状态-潜动作**轨迹（预测控制式，历史与未来都在里面）：

$$\bm{\tau}_t = [\bm{s} _ {t-N},\; \bm{z} _ {t-N},\; \ldots,\; \bm{s}_t,\; \bm{z}_t,\; \ldots,\; \bm{s} _ {t+H},\; \bm{z} _ {t+H}]$$

每个 $\bm{s}$、$\bm{z}$ 各有**独立的去噪步数** $\bm{k}$，这正是 motion inpainting 的接口：把已知的观测或关键帧设成「已经干净」，其余照常去噪。

| 超参 | 取值 | 说明 |
|------|------|------|
| 历史长度 $N$ | 4 | 稳定预测，但易陷入重复步态（见局限） |
| 预测视野 $H$ | 16 | 阶段 2 以 **25 Hz** 运行，所以 $16/25 = $ 约 **0.64 s** |
| 去噪步数（训练/推理） | 20 | 一次推理（20 步）约 **20 ms**，即控制周期 40 ms 的一半 |
| 网络 | Transformer **encoder** | 6 层、**8** 头、512 维嵌入，约 **19.8M** 参数 |
| 状态/潜动作噪声 | 独立 schedule | $\bm{k} = (\bm{k} _ {\bm{s}}, \bm{k} _ {\bm{z}})$ |
| 训练 | batch 512、1000 epoch、EMA | EMA power 0.75 / max 0.9999 |

> ⚠️ **25 Hz 不是笔误**：跟踪阶段本身跑 50 Hz，但阶段 2 论文**把跟踪策略降到 25 Hz 部署**，好给扩散推理留出时间。所以 $H = 16$ 才对应 0.64 s 的视野。

训练目标：标准 DDPM，网络 $x _ {0,\theta}$ 预测干净轨迹，MSE 损失：

$$\mathcal{L} = \text{MSE}\big(x _ {0,\theta}(\bm{\tau}_t^{\bm{k}}, \bm{k}),\; \bm{\tau}_t\big)$$

蒸馏数据：按 PDP / Diffuse-CLoC 流程 rollout VAE 策略采集；并**额外注入动作噪声**、只记录原始状态与潜码，形成一条「误差带」——纯净 rollout 会让模型在部署时一偏就 OOD。

</details>

#### 2.3 状态表示（sim-to-real 关键）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Body-Pos vs Joint-Rot 的消融，以及为什么更 Markov 的那个反而崩</summary>

论文对比两种局部状态编码：

| 表示 | 局部状态内容 | Walk+Perturb 成功率 | Joystick 成功率 |
|------|-------------|---------------------|-----------------|
| **Body-Pos**（选用） | 各连杆笛卡尔位置+线速度（角色系） | **100%** | **80%** |
| Joint-Rot | 关节角+角速度 | 72% | **0%** |

全局部分两者相同：根位置、线速度、旋转矢量（相对当前**角色系**——由根位置与 yaw 定义、去掉 roll/pitch，所以对全局平移与朝向不变）。

> Joint-Rot 理论上更 Markov，但关节估计误差沿运动链累积，扩散多步预测误差更大；在 Joint-Rot 上加 guidance 会迅速 OOD 失稳。摇杆任务上两者差了 **80 个百分点**。

</details>

#### 2.4 Classifier Guidance

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Bayes 分解、三个任务代价的具体形式，以及 CppAD / TensorRT 的工程落点</summary>

由 Bayes 分解条件 score：

$$\nabla _ {\bm{\tau}} \log p(\bm{\tau} \mid \bm{\tau}^{\ast}) = \nabla _ {\bm{\tau}} \log p(\bm{\tau}) + \nabla _ {\bm{\tau}} \log p(\bm{\tau}^{\ast} \mid \bm{\tau})$$

设 $p(\bm{\tau}^{\ast} \mid \bm{\tau}) \propto \exp(-G^c _ {\bm{\tau}}(\bm{\tau}))$，引导项为 $-\nabla _ {\bm{\tau}} G^c _ {\bm{\tau}}(\bm{\tau})$。多个任务代价可**直接相加**，无需训练时枚举组合。

**摇杆速度跟踪**：

$$G^c _ {\bm{\tau}}(\bm{\tau}) = \frac{1}{2} \sum _ {t'=t}^{t+H} \| V _ {xy,t'}(\bm{\tau} _ {t'}) - g_v \|^2$$

**路点导航**（近目标时加大速度惩罚以停下）：

$$G^{\text{ts}} _ {\bm{\tau}}(\bm{\tau}) = \sum _ {t'=t}^{t+H} (1 - e^{-2d}) \| P_x(\bm{s} _ {t'}) - g_p \|^2 + e^{-2d} \| V _ {x,t'}(\bm{\tau} _ {t'}) \|^2$$

其中 $d = \|P_x(\bm{s} _ {t'}) - g_p\|$（对梯度 detach）。

**避障**（SDF + 松弛 barrier）：

$$G^c _ {\bm{\tau}}(\bm{\tau}) = \sum _ {t', b \in \mathcal{B}_c} B\!\left(\text{SDF}(\mathbf{P} _ {b,t'}(\bm{\tau})) - r_i,\; \delta\right)$$

$$B(x,\delta) = \begin{cases} -\ln(x) & x \geq \delta \\ -\ln(\delta) + \frac{1}{2}\left[\left(\frac{x-2\delta}{\delta}\right)^2 - 1\right] & x < \delta \end{cases}$$

推理时引导梯度用 **CppAD** 在每个去噪步自动求导；扩散策略在 **RTX 4060 Mobile + TensorRT** 上异步线程运行，轻量 VAE decoder 则同步跑在 CPU 上。

</details>

「多个任务代价可直接相加」是这一节最值钱的一句话。下面这个演示在浏览器里跑了一遍带引导的 DDIM：两个勾选框各对应一个 $G$，同时勾上，梯度直接叠加——而训练时模型从没见过这个组合：

<div class="paper-demo" data-demo="bm-guidance" id="bm-guidance-demo"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

#### 2.5 Motion Inpainting 与任务切换

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：稀疏关键帧补全、连续侧手翻接走跑的长程模式切换</summary>

除弱速度/位置引导外，可用**稀疏关键帧**做 motion inpainting：例如摇杆行走中每 **0.2 s** 注入侧手翻关键帧，扩散策略补全中间连续轨迹，完成后平滑回到速度跟踪。

支持**任务规格自由切换**：连续侧手翻前后接走/跑；在速度跟踪与 inpainting 之间来回切换，展示长程模式切换能力。

</details>

---

### 📊 两阶段推理管线总览

<div class="mermaid">
flowchart TB
    subgraph track["跟踪模式（开源）"]
        Ref["参考动作相位 c"] --> Pol["RL 跟踪策略 π"]
        Obs1["锚定误差 + 本体感知"] --> Pol
        Pol --> PD["低阻抗 PD → 力矩"]
    end
    subgraph diff["扩散模式（论文，未单独开源）"]
        Hist["历史 s,z (N=4)"] --> Denoise["状态-潜动作扩散去噪<br/>20 步"]
        Denoise --> Tau["轨迹 τ: s,z × H=16<br/>约 0.64 s @ 25 Hz"]
        Cost["代价 G: 速度/路点/SDF/inpaint"] --> Guide["Classifier Guidance 梯度<br/>CppAD 每步求导"]
        Guide --> Denoise
        Tau --> Dec["VAE decoder<br/>z_t → 关节动作"]
        Dec --> Exec["执行当前动作 + RHC"]
    end
</div>

---

## 🚶 具体实例

### 实例 1：单策略侧手翻 + 避障（任务组合）

<div class="mermaid">
flowchart LR
    D["扩散先验：侧手翻原语"] --> G["G_waypoint + G_SDF"]
    G --> OUT["绕障轨迹：保留动态感"]
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两个代价相加就能绕障到点，不用重训</summary>

- 预训练扩散模型已内化侧手翻等多模态原语。
- 测试时 $G = G^{\text{waypoint}} + G^{\text{SDF}}$，无需重训。
- SDF 在每步去噪中提供远离障碍的梯度，与路点吸引共同作用。
- 把路点项换成摇杆项同样成立——用户输入稍微偏离目标时也能避开碰撞。

</details>

### 实例 2：摇杆行走 → 注入侧手翻关键帧 → 恢复行走

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三步切换，inpainting 项加进去、拿掉就完成模式切换</summary>

1. 摇杆速度代价维持行走。
2. 在指定时刻注入侧手翻关键帧（inpainting 代价）。
3. 扩散补全过渡；完成后去掉 inpainting 项，回到速度跟踪。

论文展示了四次关键帧条件的侧手翻与速度条件的走 / 跑交织在一起，说明这种切换可以长程反复进行。

</details>

### 实例 3：高动态跟踪真机（阶段 1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：空中侧手翻的角速度与加速度，以及户外不平地面的表现</summary>

- **空中侧手翻**：骨盆角速度峰值约 **20 rad/s**（均值 7.01 rad/s），峰值加速度 **31 m/s²**——人类熟练特技动作的平均值约 7.75 rad/s，属同一量级。
- **连续 5 次** C 罗庆祝跳转身（ASAP 仅展示单次）。
- 户外软土、落叶、不平地面仍完成武术式序列。

</details>

---

## 📊 实验结果摘要

### 运动跟踪（阶段 1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：数据规模、用户研究、GRF 形态与速度跟踪误差</summary>

| 维度 | 结果 |
|------|------|
| 数据 | 7 条短序列 + 29 条 LAFAN1 长参考 sim-to-sim 全通过；30 条片段（约 15 分钟）上 G1 真机 |
| 自然性（用户研究 N=77） | 整体偏好 70.8% vs Unitree 原生 29.2%（p<.001）；走路 57.0% vs 43.0%；跑步 84.7% vs 15.3% |
| GRF 形态 | 步行双峰、跑步单峰，与人类力板数据对齐 |
| 速度跟踪误差（仿真） | 步行 **12.14%**，跑步 **13.65%** |
| 长跑 | 跑道连续 **50 m+** |

</details>

用户研究（N=77）的偏好对比画成图，差距更直观——动作越动态（跑步），BeyondMimic 的自然性优势越大：

<div class="mermaid">
xychart-beta
    title "自然性用户偏好（%）：BeyondMimic vs Unitree 原生"
    x-axis ["整体 BeyondMimic", "整体 Unitree", "跑步 BeyondMimic", "跑步 Unitree"]
    y-axis "偏好比例（%）" 0 --> 100
    bar [70.8, 29.2, 84.7, 15.3]
</div>

### 扩散控制（阶段 2）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Walk-Perturb 与 Joystick 两项设置下的表现</summary>

| 任务 | 设置 | 指标 |
|------|------|------|
| Walk-Perturb | 15 s 行走，每秒 0–0.5 m/s 根速度扰动 | Body-Pos 表示 **0%** 摔倒率（50 次） |
| Joystick | 前/后/左转/右转各 3 s | Body-Pos **80%** 成功率（Joint-Rot **0%**） |

</details>

---

## 🤖 工程价值

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：路线图地位、开源影响与范式转变</summary>

- **路线图地位**：扩散 + 控制主线**终点**——把 Diffusion Policy 的生成式思想推到人形全身、真机、测试时优化。
- **开源影响**：`whole_body_tracking` 已被 MJLab、Unitree RL Lab 等采纳为默认跟踪方案；Retargeting Matters 等论文刻意选其作「中性跟踪器」以隔离 retarget 质量影响。
- **范式转变**：从「每条动作调 DR/奖励」→「统一跟踪 + 蒸馏 + 引导」；训练完全**任务无关、无标签**。
- **多功能**：跟踪 / 组合 / 任务适配由同一扩散先验 + 不同代价完成。

</details>

---

## ⚠️ 局限与后续方向

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：视野短、历史依赖、启停瞬态、状态估计与开源范围</summary>

| 局限 | 说明 |
|------|------|
| 预测视野短 | $H=16$ 约 0.64 s，够反应式避障，不够长程提前规划 |
| 历史依赖 | $N=4$ 稳定预测但易陷重复步态；加大 guidance 权重在模式切换时不稳定 |
| 启停瞬态 | 引导扩散下步态建立后稳定，但动作起止易绊倒 |
| 状态估计 | 扩散质量依赖本体感知；极端接触场景用 LIO 或去掉估计相关观测 |
| 细粒度目标 | 粗粒度代价效果好；精细操作仍需 SFT / adapter 等 |
| 开源范围 | **跟踪管线已开源**；引导扩散蒸馏与 test-time guidance **尚无独立仓库** |

</details>

---

## 📁 官方源码对照

BeyondMimic **不在 MimicKit 内**。下表映射**已开源**的运动跟踪部分；扩散蒸馏见论文与 Diffuse-CLoC。

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文概念 → 仓库路径的对照表</summary>

| 论文概念 | 仓库路径 | 说明 |
|----------|----------|------|
| 参考动作加载 | `tasks/tracking/mdp/commands.py` → `MotionLoader` | NPZ：`joint_pos/vel`、`body_pos/quat/vel` |
| 锚定相对位姿 | `MotionCommand._update_command()` | yaw 对齐 + 高度锚定，更新 `body_*_relative_w` |
| 自适应采样 | `MotionCommand._adaptive_sampling()` | 按 bin 失败率 + 指数核卷积 |
| 跟踪奖励 | `tasks/tracking/mdp/rewards.py` | 锚定/相对体 位姿、速度指数奖励 |
| 关节零位 DR | `tasks/tracking/mdp/events.py` → `randomize_joint_default_pos` | 模拟标定误差 |
| 质心 DR | `events.py` → `randomize_rigid_body_com` | 躯干 CoM 扰动 |
| 真机部署 | [motion_tracking_controller](https://github.com/HybridRobotics/motion_tracking_controller) | `MotionTrackingController`、`MotionOnnxPolicy` |
| 扩散 + Guidance | 暂无公开仓库 | VAE 蒸馏 + 状态-潜动作 LDM；TensorRT + CppAD 引导 |

</details>

跟踪奖励与论文公式对应示例（相对体位置）：

```python
# rewards.py — motion_relative_body_position_error_exp
error = torch.sum(
    torch.square(command.body_pos_relative_w[:, body_indexes]
                 - command.robot_body_pos_w[:, body_indexes]), dim=-1)
return torch.exp(-error.mean(-1) / std**2)
```

### 源码运行时序图

已开源的跟踪管线（[whole_body_tracking](https://github.com/HybridRobotics/whole_body_tracking)，Isaac Lab + rsl_rl 栈）从动作预处理到真机部署的完整时序如下：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant PRE as csv_to_npz.py /<br/>WandB Registry
    participant TR as scripts/rsl_rl/train.py
    participant E as ManagerBasedRLEnv<br/>(Isaac Lab, 4096 并行)
    participant MC as MotionCommand<br/>(commands.py)
    participant RN as rsl_rl<br/>OnPolicyRunner (PPO)
    participant DEP as motion_tracking_controller<br/>(真机)
    Note over U,RN: 数据准备：retarget 后的 CSV → 带运动学量的 NPZ
    U->>PRE: python scripts/csv_to_npz.py --input_file dance.csv --input_fps 30
    PRE->>PRE: 前向运动学补全 body_pos/quat/vel → 上传 WandB registry
    Note over U,RN: 训练：统一 MDP 跟踪（--task=Tracking-Flat-G1-v0）
    U->>TR: python scripts/rsl_rl/train.py --task=... --registry_name ...
    TR->>MC: MotionLoader 从 registry 拉取 NPZ 参考动作
    TR->>RN: 构建 OnPolicyRunner，进入训练循环
    loop 每轮迭代
        loop rollout（每个仿真步）
            E->>MC: _update_command()：yaw 对齐 + 高度锚定 → body_*_relative_w
            E-->>RN: obs（单步观测，无历史）
            RN->>E: 策略动作 a_t
            E->>E: rewards.py：锚定/相对体位姿、速度指数奖励
            E->>E: events.py：关节零位 / 质心 CoM 域随机化
            alt episode 结束
                E->>MC: _adaptive_sampling()：按 bin 失败率 + 指数核卷积重采样起点
            end
        end
        RN->>RN: PPO 更新（GAE + Clip）
    end
    Note over U,DEP: 部署：导出 ONNX → sim-to-real
    U->>TR: python scripts/rsl_rl/play.py --wandb_path ... 回放并导出策略
    U->>DEP: MotionOnnxPolicy 加载 ONNX
    loop 真机控制循环
        DEP->>DEP: MotionTrackingController：状态估计 → 观测拼装
        DEP->>DEP: ONNX 推理 → 关节目标 → PD 控制
    end
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：时序图各步与上表的对应关系</summary>

- ①–② 对应表中「参考动作加载」：CSV 只有关节角，`csv_to_npz.py` 用前向运动学补出各 body 位姿/速度并托管到 WandB registry。
- ⑥ 是锚定跟踪的落点（`_update_command()`），⑨–⑩ 对应表中跟踪奖励与 DR，⑪ 的自适应采样让难片段被更多练到。
- ⑬–⑯ 是表中「真机部署」仓库：训练与部署共享同一套观测/动作约定，策略以 ONNX 形式上真机。
- 扩散蒸馏与 test-time guidance 部分**尚未开源**，不在此图内。

</details>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：MimicKit 没有集成 BeyondMimic</summary>

<h3 id="mimickit-关系">MimicKit 关系</h3>

> ❌ MimicKit 未集成 BeyondMimic。概念上 `rewards.py` 沿用 DeepMimic 式指数跟踪奖励，`events.py` 做 DR，与 MimicKit `deepmimic_env.py` 思路相近，但工程栈为 **Isaac Lab** 而非 MimicKit。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：六个高频问题与参考回答</summary>

1. **BeyondMimic 相比 DeepMimic / PHC 的核心差异？**
   - DeepMimic：单参考、重奖励工程。PHC：仿真大规模 PMCP，真机高动态多动作未证明。BeyondMimic：**真机**上统一 MDP 跟踪分钟级多技能，再蒸馏为可引导的扩散策略，实现训练时无任务标签、测试时零样本组合。

2. **为什么跟踪不用历史，扩散却用 $N=4$ 历史？**
   - 跟踪要 sim-to-real 简洁、延迟低；单步观测 + 锚定误差已够（论文消融里加历史反而更差——极简 DR 下策略容易去记仿真专属的状态-动作模式）。扩散做多步轨迹生成，需要过去状态-动作上下文；但历史也带来步态锁定副作用。

3. **Classifier Guidance 与训练时条件扩散有何不同？**
   - 条件扩散需在训练集目标上标注条件。Classifier guidance 利用已学到的无条件 score + 任意可微代价梯度，**部署后**才指定任务，可组合多个代价。

4. **为何选 Body-Pos 而非 Joint-Rot 状态？**
   - 真机关节估计误差经运动学链放大，扩散多步预测更易崩；笛卡尔 body 状态对 guidance 更鲁棒（Joystick 0% vs 80%）。

5. **锚定跟踪 vs 全局跟踪？**
   - 全局跟踪在漂移时过度纠偏、损失风格；锚定保留相对协调，仅用 $b _ {\text{ref}}$ 全局误差做平衡与漂移修正。GMT 等用相对速度牺牲全局轨迹，BeyondMimic 用锚定兼顾风格与可控漂移。

6. **与 SONIC / GMT 等的定位？**
   - SONIC 走**超大规模数据 + token 接口**；BeyondMimic 走**紧凑跟踪 + 扩散引导**，强调 test-time 优化与真机高动态。GMT 牺牲全局轨迹换鲁棒性；BeyondMimic 锚定方案保留更多全局语义。

7. **为什么中间要插一个 VAE，不直接扩散动作？**
   - 运动状态比原始 PD 目标更结构化，先把一堆跟踪专家用 DAgger 压成 32 维平滑潜空间，扩散在潜空间上采样更稳；部署时 decoder 很轻，可以同步跑在 CPU 上，把 GPU 留给扩散。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：与路线图其他论文的关联、参考来源</summary>

<h3 id="a-与路线图其他论文的关联">A. 与路线图其他论文的关联</h3>

| 论文 | 关系 |
|------|------|
| DeepMimic | 指数跟踪奖励范式源头 |
| PHC / PULSE | 大规模动作模仿与潜空间组合路线（仿真侧重） |
| Diffusion Policy | 动作扩散 + RHC；BeyondMimic 扩展到状态-动作联合 + 全身人形 |
| Diffuse-CLoC | 扩散蒸馏与 classifier guidance 的直接方法论来源 |
| Retargeting Matters | 选 BeyondMimic 作中性跟踪器做 retarget 消融 |
| SONIC / GMT / UH-1 | 同期大规模人形控制，路线对照（数据规模 vs 测试时引导） |

<h3 id="b-参考来源">B. 参考来源</h3>

- [arXiv:2508.08241](https://arxiv.org/abs/2508.08241)
- [Project Website](https://beyondmimic.github.io/)
- [HybridRobotics/whole_body_tracking](https://github.com/HybridRobotics/whole_body_tracking)
- [Diffuse-CLoC (Huang et al.)](https://arxiv.org/abs/2410.05272)

</details>
