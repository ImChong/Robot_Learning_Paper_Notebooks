---
layout: paper
title: "MaskedMimic: Unified Physics-Based Character Control Through Masked Motion Inpainting"
category: "高影响力精选 High Impact Selection"
subcategory: "Whole-Body Control Core"
zhname: "MaskedMimic：基于掩码动作补全的统一物理角色控制"
---

# MaskedMimic: Unified Physics-Based Character Control Through Masked Motion Inpainting
**MaskedMimic：先用强化学习训一个全身跟踪老师，再把它蒸馏进一个只看「被随机遮掉一部分」目标的条件 VAE 学生——头手三点、任意关节关键帧、文字、物体，都只是不同的掩码**

> 📅 阅读日期: 2026-10-04
>
> 🏷️ 板块: 03_High_Impact_Selection / Whole-Body Control Core
>
> 🧭 状态: 精读版；数值均取自 arXiv v1 正文与表 1–6。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2409.14393](https://arxiv.org/abs/2409.14393) |
| **项目主页** | [research.nvidia.com/labs/par/maskedmimic](https://research.nvidia.com/labs/par/maskedmimic/) |
| **代码** | 在 [NVlabs/ProtoMotions](https://github.com/NVlabs/ProtoMotions) 框架内实现（见本站 [ProtoMotions3 笔记](../ProtoMotions3_Open-source_Framework_for_Humanoid_Simulation_and_Control/ProtoMotions3_Open-source_Framework_for_Humanoid_Simulation_and_Control.html)） |
| **作者** | Chen Tessler, Yunrong Guo, Ofir Nabati, Gal Chechik, Xue Bin Peng |
| **机构** | NVIDIA；Bar-Ilan University；Simon Fraser University |
| **发布时间** | 2024-09-22 |
| **期刊** | ACM Transactions on Graphics 43(6), Article 209（2024-12） |
| **对象** | 物理仿真中的 SMPL 人体角色（不是真机机器人） |
| **关键词** | Motion inpainting, physics-based character control, motion tracking, conditional VAE, DAgger distillation |

---

## 🎯 一句话总结

MaskedMimic 把物理角色控制统一表述成**动作补全（inpainting）**：先用 RL 训一个看完整未来参考的全身跟踪器（老师），再用 DAgger 把它蒸馏进一个条件 VAE（学生）；学生训练时看到的目标被随机遮掉一部分——可能只剩头和双手、只剩骨盆路径、只剩一句文字或一个椅子的包围盒——但要输出老师在完整目标下的动作。训完以后，VR 跟踪、摇杆转向、路径跟随、伸手够物、坐椅子都**不用再训练**，只要换一种「给哪些目标」的组合（论文叫 goal-engineering）。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **FC** | Fully-Constrained controller | 第一阶段的老师：看完整未来参考姿态的全身跟踪器 $\pi^{FC}$ |
| **PC** | Partially-Constrained controller | 第二阶段的学生 $\pi^{PC}$，即 MaskedMimic 本体，只看被掩码的目标 |
| **C-VAE** | Conditional Variational Autoencoder | 条件变分自编码器：先验 + 编码器 + 解码器 |
| **DAgger** | Dataset Aggregation | 在线蒸馏：学生自己去环境里走，老师给每一步打动作标签 |
| **KL** | Kullback–Leibler divergence | 衡量编码器分布与先验分布差多远 |
| **MPJPE / MPOJPE** | Mean Per-Joint / Per-Observed-Joint Position Error | 全身 / 仅被观测关节的平均位置误差（mm） |
| **XCLIP** | — | 在视频—文本对上训练的文本编码器，用来编码文字指令 |
| **FSM** | Finite-State Machine | 有限状态机：按阶段切换给模型的目标 |

---

## ❓ MaskedMimic 要解决什么问题？

论文举的例子是：「爬上山坡去城堡，向卫兵挥手，进门，走到王座厅坐上王座」。这需要不平地形行走、文字驱动的动作、和物体交互三类能力。此前的物理角色控制有两条路：

1. **每个任务单独训一个控制器**（地形行走、坐椅子、VR 跟踪各一个），每加一个任务都要重新训练，还要手调奖励；
2. **先学一个技能潜空间，再为每个新任务训一个高层控制器**（ASE、CALM、PULSE 等）。潜变量很抽象，用户没法直接「告诉」它要什么，新任务仍要训高层。

MaskedMimic 的目标是：**一个模型、不写任务奖励、不训新高层**，用户直接给「部分约束」就能指挥角色。

---

## 🔧 方法详解

### 1. 第一阶段：全身跟踪老师 $\pi^{FC}$

- **观测**：角色当前状态（关节旋转、位置、速度，都转到根坐标系），加上未来 $K$ 帧参考姿态；每个关节的目标特征同时相对根和相对该关节自身表示，并附上「距离这帧还有多久」的时间 $\tau$。
- **场景**：沿根朝向采样的周围高度图，记录地形与物体表面高度。
- **动作**：PD 目标，高斯策略固定方差 $\sigma = \exp(-2.9)$；**不用残差力**（residual force）。
- **网络**：把每类输入 token 化，用 Transformer 做策略，全连接网络做 critic。
- **奖励**：全局关节位置、全局关节旋转、根高度、关节速度、关节角速度五项跟踪奖励，外加能量惩罚抑制抖动。
- **训练场**：平地 / 不平地形（台阶、碎石、坡）/ 物体区（椅子、桌子、沙发）三块；带物体交互的动作只在物体区出生。
- **提前终止与优先采样**：平地上任一关节偏 0.25 m 终止，地形上放宽到 0.5 m；失败率高的动作优先采样（最低权重 $3 \times 10^{-3}$），且只统计平地失败——前空翻上楼梯本来就不该成功。

### 2. 第二阶段：随机掩码 + 条件 VAE 学生 $\pi^{PC}$

学生要学的是老师的动作分布 $\pi^{FC}(a_t \mid s_t, g^{full}_t)$，但它只看到掩码后的目标 $g^{partial}_t = M(g^{full}_t)$。支持三类部分目标，可以任意组合：

- **任意关节、任意时刻**（any-joint-any-time）：某几个关节在未来某一帧的位置 / 旋转；
- **文字**：XCLIP 编码的指令；
- **物体**：包围盒 8 个角点（转到角色坐标系）+ 物体类别索引。

部分目标是**欠定**的——「1 秒内走到那里」有无数种走法——所以学生建成条件 VAE：

$$
\rho(z_t \mid s_t, g^{partial}_t) = \mathcal{N}\big(\mu_\rho,\ \sigma_\rho\big)
$$

$$
E(z_t \mid s_t, g^{full}_t) = \mathcal{N}\big(\mu_\rho + \mu_E,\ \sigma_E\big)
$$

- **先验** $\rho$ 只看部分目标；**编码器** $E$ 看完整目标，但只输出相对先验的**残差**（这个写法论文注明取自 ControlVAE [Yao et al. 2022]）；**解码器** $D(a_t \mid s_t, z_t)$ 输出动作。
- 训练目标：最大化老师动作在解码器下的对数似然，减去 $\alpha \cdot D _ {KL}(E \,\|\, \rho)$。环境里跑的是学生，老师给每步打标签（DAgger）。
- **推理时扔掉编码器**，只从先验采样（评测时取先验均值）。

### 3. 让学生学稳的四个训练技巧

1. **结构化掩码**：某一帧抽到的掩码有概率在后续多帧重复，而不是每帧重抽。论文观察到：每帧重抽时不同关节在不同帧轮流可见，跨帧拼起来反而信息很全，模型没学会处理真正的歧义，泛化更差。同时允许把所有未来姿态全部遮掉，只留文字或物体。
2. **KL 调度**：$\alpha$ 从 $10^{-4}$ 线性升到 $10^{-2}$——先让编解码器贴紧老师，再逐步把潜空间收向先验，方便推理时从先验采样。
3. **整局固定噪声**：重参数化 $z_t = \epsilon \sigma_t + \mu_t$ 里的 $\epsilon$ 一整个 episode 不变，让行为在时间上连贯。
4. **观测历史**：先验额外看过去 40 步里均匀抽的 5 帧姿态；做文字控制时这对生成连贯的长动作很关键。

### 4. 网络结构

先验是 **Transformer 编码器**：目标姿态、物体包围盒、高度图、当前姿态、文字、历史姿态各有一个模态专用编码器，被掩掉的输入直接用 attention mask 排除，所以输入 token 数可变。编码器和解码器都是全连接网络（编码器的输入总是完整目标，尺寸固定）。

### 5. Goal-engineering：用有限状态机切换目标

新任务不训练，只写一个小 FSM 决定每个阶段给什么目标。例如**坐椅子**：离物体 2 m 以外时给「朝物体方向 1 m/s 前进」的根目标 + 文字「the person walks normally」；进入 2 m 后撤掉这两项，只给椅子的包围盒，模型自己生成走近、转身、坐下。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
  subgraph S1["阶段 1：RL 训老师"]
    R["AMASS / SAMP 动作<br/>+ 平地、不平地形、物体区"] --> FC["全身跟踪老师 FC<br/>看完整未来 K 帧"]
  end
  subgraph S2["阶段 2：DAgger 蒸馏学生"]
    G["完整目标"] --> M["随机结构化掩码"]
    M --> P["先验 ρ（Transformer）<br/>只看部分目标"]
    G --> E["编码器 E<br/>输出相对先验的残差"]
    P --> Z["潜变量 z"]
    E --> Z
    Z --> D["解码器 D → 动作"]
    FC -. 每步打标签 .-> D
  end
  subgraph S3["推理：goal-engineering"]
    U["头手三点 / 关节关键帧<br/>文字 / 物体包围盒"] --> P2["先验 ρ"] --> D2["解码器 D"]
  end
  D --> D2
</div>

---

## 🚶 具体实例：三种任务分别「给了哪些目标」

学生训练时可被条件化的关节是 6 个：左踝、右踝、骨盆、头、左手、右手（论文第 7 节）。一帧关键帧 token 的写法是 $[\hat q _ {t+\tau} \odot \text{mask} _ {t+\tau},\ \text{mask} _ {t+\tau},\ \tau]$——看不见的关节置零，再把掩码本身和「还有多久」一起拼进去。按（左踝, 右踝, 骨盆, 头, 左手, 右手）排序：

| 任务 | 掩码 / 目标 | 怎么给（论文第 8.2–8.3 节） |
|------|------------|------------------------|
| VR 跟踪 | $[0, 0, 0, 1, 1, 1]$ | 头的位置 + 旋转，双手位置 |
| 路径跟随 | $[0, 0, 0, 1, 0, 0]$ | 头的目标位置：未来 5 步 + 0.8 s 后一个远目标；离路径超过 0.4 m 时只给 0.8 s 那个 |
| 摇杆转向 | $[0, 0, 1, 0, 0, 0]$ | 骨盆旋转，加 1 s 后的骨盆位置 $\hat p^{root} = [x + v_x,\ y + v_y,\ 0.9]$ |
| 坐椅子 | 先骨盆方向 + 文字，再全部关节遮掉 | 2 m 外走过去，2 m 内只给包围盒 |

**摇杆算一步**：角色在原点、指令速度 $v = (1.0, 0)$ m/s，则 1 s 后的骨盆目标是 $(0 + 1.0,\ 0 + 0,\ 0.9) = (1.0, 0, 0.9)$ m。高度固定 0.9 m 是为了让角色保持直立。

**路径跟随里的取舍**：未来 5 步在 30 Hz 下只覆盖 $5/30 \approx 0.17$ s，所以另外给一个 0.8 s 后的远目标供长一点的规划。论文观察到，约束给得越松（偏离时只给远目标），成功率越高、误差越小，但用户能控制的就越少。

**历史窗口多长**：过去 40 步在 30 Hz 下是 $40/30 \approx 1.33$ s，从中抽 5 帧。

**KL 系数走到一半是多少**：$10^{-4} + 0.5 \times (10^{-2} - 10^{-4}) = 0.00505$。

**训练量有多大**：16,384 个并行环境、4 张 A100、约两周；老师约 300 亿步、学生约 100 亿步，控制 30 Hz、仿真 120 Hz。按 30 Hz 换算，老师的 300 亿步相当于 $3 \times 10^{10} / 30 = 10^9$ s，约 31.7 年的仿真经验。

---

## 📊 实验结果

**全身跟踪（表 1，AMASS，平地）**

| 方法 | 训练集成功率 | 训练集 MPJPE | 测试集成功率 | 测试集 MPJPE |
|------|------------|------------|------------|------------|
| FC（老师） | 99.96% | 30.4 | 99.9% | 31.3 |
| PHC+ | 100% | 26.6 | 99.2% | 36.1 |
| **MaskedMimic（学生）** | 99.4% | 32.9 | **99.2%** | **35.1** |
| PULSE | 99.8% | 39.2 | 97.1% | 54.1 |

老师是单个网络，而 PHC 是混合专家；论文认为单个网络泛化更好，而且多个专家在 DAgger 蒸馏里难维护。学生比 PULSE 在测试集上泛化好，论文归因于老师更强、以及多任务多场景训练。

**VR 跟踪（表 2，头 + 双手，平地）**：MaskedMimic **没有专门为 VR 训练**，测试集成功率 98.1%、全身 MPJPE 58.1；PULSE / ASE / CALM 要为这个任务另训高层，测试集分别是 93.4% / 37.6% / 10.1%。

**只给某些关节（表 3，测试集）**：骨盆 98.4% → VR 三点 98.1% → 头 97.9% → 双手 93.4% → 双脚 91.8%。只给骨盆反而比头 + 双手更容易——论文据此建议 VR 场景加一个骨盆传感器或预测骨盆位置。

**不平地形（表 4，测试集）**：老师全身跟踪 98.2%；学生全身跟踪 95.4%、VR 跟踪 93.6%。

**新任务（表 5，5000 个随机 episode）**：路径跟随平地 / 地形 96.3% / 96.3%，转向 97.8% / 93.8%，伸手够物 88.7% / 87.3%。

**坐椅子消融（表 6，测试物体）**

| 版本 | 成功率 | 离可坐位置的平均最小距离 |
|------|-------|----------------------|
| **MaskedMimic** | **96.9%** | **10.5 cm** |
| 去掉历史 | 94.9% | 12.7 cm |
| 去掉 VAE | 93.2% | 12.2 cm |
| 先验不用残差结构 | 21.1% | 57.4 cm |
| 不用结构化掩码 | 0% | 274.4 cm |

后两行最说明问题：**残差先验**和**结构化掩码**是这套方法能工作的前提，不是锦上添花。

---

## ⚠️ 局限（论文第 9 节）

1. **动作质量**：部分动作有抖动；后空翻、霹雳舞这类难动作仍复现不好；在不平地形上更像「照平地动作走」，不会主动挑落脚点——作者推测是因为平地动作搬到地形上只按根离地高度做了归一化。
2. **文字长指令**：简单原子动作（敬礼、踢腿）可以，「走 4 步再举手」这类需要长程推理的指令做不好，作者推测是历史太短。
3. **goal-engineering 仍靠手写**：复杂场景、成群角色时写 FSM 会很费力，作者希望用大语言模型自动生成。
4. **只在仿真角色上验证**：没有机器人实验；SMPL 角色的关节力矩、自由度都和真实人形不同。

---

## 🤖 对人形机器人的意义

1. **「命令就是掩码」**：MaskedMimic 在角色仿真中覆盖了多类缺失目标；HOVER 把类似思路带进人形机器人——训练时随机遮掉部分身体目标，部署时用掩码切换控制模式（见 HOVER 笔记「学生 distillation：mode mask + sparsity mask 双掩码」一节）。
2. **老师—学生的分工**：RL 只负责「在完整信息下把动作做出来」，多模态、多任务的灵活性全交给监督蒸馏，避免为每种命令写奖励。这和 OmniH2O、HOVER 的特权教师 → 学生蒸馏是同一个结构。
3. **固定头手接口 vs 任意掩码**：OmniH2O 选择固定的头 + 双手三点接口；MaskedMimic 把「缺哪些目标」本身写成显式条件，所以同一个模型能接不同的输入组合。

---

## 🎤 面试高频问题 & 参考回答

**Q1：为什么学生要做成 VAE，直接回归老师动作不行吗？**

A：部分目标是欠定的，同一组约束对应很多合理动作。直接回归会把多种解平均成一个「中间动作」，常常既不自然也不稳。VAE 让先验在潜空间里表达多解，采样得到其中一种。消融里去掉 VAE 成功率从 96.9% 掉到 93.2%。

**Q2：编码器为什么要做成先验的残差？**

A：编码器看完整目标、先验只看部分目标；推理时只剩先验。如果编码器自成一套分布，训练时解码器习惯的潜变量和推理时先验给的潜变量对不上。残差结构让编码器只在先验附近「微调」，保证推理时从先验采样也落在解码器熟悉的区域。消融里非残差先验成功率只有 21.1%。

**Q3：结构化掩码为什么比每帧随机掩码好？**

A：每帧重抽时，不同关节在不同帧轮流可见，跨帧拼起来信息几乎完整，训练太「容易」，模型没学会处理真正缺信息的情况；推理时用户只给固定几个关节，就泛化不了。让掩码在时间上持续，训练分布才接近真实使用方式。消融里去掉它成功率为 0%。

**Q4：MaskedMimic 和 PULSE / ASE 这类「技能潜空间 + 高层控制器」有什么区别？**

A：PULSE / ASE 的潜变量是抽象的，换新任务要再训一个高层控制器去「操纵」潜变量；MaskedMimic 的条件直接是人能理解的约束（关节位置、文字、物体），新任务只改给什么目标，不再训练。

---

## 💬 讨论记录

- 这篇是「全身跟踪 → 通用控制接口」这条线上的关键一步：DeepMimic / PHC 解决「给完整参考能不能跟上」，MaskedMimic 解决「只给一部分时补全剩下的」，HOVER 把这个问题搬到真机人形上。
- 读表时注意 MaskedMimic 的数字都是**同一个模型、不针对任务微调**得到的。

---

## 🔗 相关阅读

| 论文 | 关系 |
|------|------|
| [PHC](../../01_Foundational_RL/PHC_Perpetual_Humanoid_Control/PHC_Perpetual_Humanoid_Control.html) | 全身跟踪基线（PHC+），动作数据过滤沿用 PHC 的流程 |
| [PULSE](../../01_Foundational_RL/PULSE_Physics-based_Universal_Latent_Space/PULSE_Physics-based_Universal_Latent_Space.html) | 同样是「跟踪老师 → 蒸馏潜空间」，但新任务需要另训高层；表 1、表 2 的主要对照 |
| [ASE](../../01_Foundational_RL/ASE_Adversarial_Skill_Embeddings_for_Large-Scale_Motion_Control/ASE_Adversarial_Skill_Embeddings_for_Large-Scale_Motion_Control.html) / [CALM](../../01_Foundational_RL/CALM_Conditional_Adversarial_Latent_Models_for_Directable_Virtual_Characters/CALM_Conditional_Adversarial_Latent_Models_for_Directable_Virtual_Characters.html) | VR 跟踪任务上的对照方法 |
| [OmniH2O](../OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html) | 人形侧的固定头手接口 |
| [HOVER](../HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html) | 把掩码式多模式控制带到人形机器人 |
| [HumanML3D](../../14_Human_Motion/HumanML3D/HumanML3D.html) | 文字条件训练所用的数据集 |
| [ProtoMotions3](../ProtoMotions3_Open-source_Framework_for_Humanoid_Simulation_and_Control/ProtoMotions3_Open-source_Framework_for_Humanoid_Simulation_and_Control.html) | MaskedMimic 的开源实现所在框架 |

---

## 📎 附录：参考来源

- arXiv：<https://arxiv.org/abs/2409.14393>（v1，2024-09-22）
- 期刊：ACM Trans. Graph. 43(6), Article 209, 2024，DOI [10.1145/3687951](https://doi.org/10.1145/3687951)
- 项目主页：<https://research.nvidia.com/labs/par/maskedmimic/>
