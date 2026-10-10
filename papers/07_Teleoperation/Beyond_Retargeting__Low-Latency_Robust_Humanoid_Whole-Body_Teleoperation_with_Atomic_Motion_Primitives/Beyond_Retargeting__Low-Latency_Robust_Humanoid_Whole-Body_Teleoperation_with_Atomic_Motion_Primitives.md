---
layout: paper
title: "Beyond Retargeting: Low-Latency and Robust Humanoid Whole-Body Teleoperation with Learned Atomic Motion Primitives"
zhname: "超越重定向：基于原子动作基元的低延迟鲁棒人形全身遥操作"
category: "Teleoperation"
arxiv: "2610.07891"
---

# Beyond Retargeting: Low-Latency and Robust Humanoid Whole-Body Teleoperation with Learned Atomic Motion Primitives
**去掉在线重定向，让学生策略一次前向就把原始人体动作映射成 G1 关节指令；中间加一个用干净动捕学出的离散码本，把带噪、缺关键点、分布外的输入先「吸」到最近的全身动作原型上再出动作**

> 📅 总结日期: 2026-10-10
>
> 🏷️ 板块: 07 Teleoperation · 全身遥操作 · 免重定向 · 离散码本运动先验 · MoE 教师蒸馏 · OOD 鲁棒性 · Unitree G1
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）· `_data/papers.json` 里 Teleoperation 条目已全部有笔记，取上游 awesome-humanoid-robot-learning Teleoperation 章节中尚无笔记的最新论文（2026.10）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.07891](https://arxiv.org/abs/2610.07891) |
| HTML | [arxiv.org/html/2610.07891v1](https://arxiv.org/html/2610.07891v1) |
| PDF | [下载 v1](https://arxiv.org/pdf/2610.07891v1) |
| **发布时间** | 2026-10-06（arXiv v1） |
| 项目主页 | 暂无 |
| 源码 | ⏳ 论文与上游列表均未给出代码链接，暂未开源（故本笔记无源码运行时序图） |

**作者**：Xiayan Xu†, Jiyu Yu†, Xingzhou Chen, Siyi Qian, Zongyu Ma, Lilu Liu, Ling Shi, Haodong Zhang\*（港科大 · 浙大 · 腾讯 Robotics X · 湖南大学；† 共同一作，\* 通讯作者）

---

## 🎯 一句话总结

现有全身遥操作大多是「人体动作 → 在线重定向（GMR / IK）→ 跟踪策略」，重定向每帧要 ~22 ms，还可能给出物理上做不到的目标。本文让部署时的学生策略**直接吃人体坐标系下的关键点和根状态**，一次前向输出关节指令（端到端 0.604 ms）；同时在学生里插一个**因子化类别码本**（128 个通道 × 每通道 12 个码），用干净动捕训练、让带噪 / 部分观测去匹配干净编码，从而把分布外输入投影到见过的全身动作原型上。G1 上关键点噪声 0.30 m 时成功率 0.949，同结构但不量化的 MLP 学生只有 0.868。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| RF | Retargeting-Free | 免重定向：部署链路里没有运动学重定向这一步 |
| HCB | Human-motion CodeBook | 人体动作码本及其损失（重建 + 匹配） |
| MoE | Mixture of Experts | 教师策略的稀疏专家网络：8 个细粒度专家选 top-2，加 1 个共享专家 |
| OOD | Out-of-Distribution | 分布外输入：噪声、缺关键点、高度漂移、没见过的动作风格 |
| MPJPE / MPJVE | Mean Per-Joint Position / Velocity Error | 关节角 / 关节角速度平均误差（rad、rad/s） |
| MPKPE | Max Key-body Position Error | 关键刚体最大位置误差（m） |
| E2E | End-to-End latency | 端到端指令延迟 = 前瞻 + 重定向 + 策略推理 |

---

## ❓ 论文要解决什么问题？

1. **重定向在指令通路上，延迟叠加**：TWIST / TWIST2 / ANY2TRACK 等都要先经 CPU 上的 GMR 重定向（表 II 里约 22 ms / 帧），GMT 还要 1.9 s 的未来参考帧、SONIC（G1）要 180 ms 前瞻。传感、通信、执行器延迟再叠上去，动态动作就跟不上。
2. **免重定向的方法只管上半身**：OmniH2O、CLONE 只用头 + 双手，下半身几乎不可控；ExtremControl 用手工的比例映射构造机器人空间目标，一旦输入偏离标定就不可靠。
3. **部署输入几乎总是 OOD**：训练用的是干净动捕，部署时是 VR、单目视频估计、文本生成的动作——有噪声、有标定误差、有缺失关键点、有没见过的风格。去掉重定向后，单个策略要同时跨越形态差和感知差，更容易被坏输入带偏。

---

## 🔧 方法拆解

### 1. 两阶段：特权 MoE 教师 → 码本学生

- **阶段 1（教师）**：在重定向后的 AMASS / LAFAN1 / OMOMO 库（14,147 条训练、4,073 条测试）上用 PPO 训跟踪教师。教师看本体感受、带短前瞻的机器人坐标系参考，以及部署时拿不到的根线速度和足端接触。actor 是稀疏 MoE（8 个专家选 top-2 + 1 个共享专家），配 Switch 式负载均衡损失防专家塌缩，和 SONIC 式自适应采样（最近失败率高的片段多抽，保留 10% 均匀采样）。**重定向只在这里用到**。
- **阶段 2（学生）**：学生只看**人体坐标系**的动作描述 $h_t$ 和 $L$ 帧本体历史，用 Huber 损失蒸馏教师的动作均值，另加 5 个辅助头（根速度、足端接触、关键刚体位置 / 速度、近帧关节位置 / 速度）。部署时教师、编码器、辅助头全部丢掉。

### 2. 人体动作描述与训练时的「弄脏」

干净描述 = 13 维根状态（6D 旋转、高度、线速度、角速度）+ $J$ 个关键点的 3D 位置 + 两个手腕的 6D 朝向，全部在人体坐标系里，不含任何机器人相关项。训练时给估计器的输入随机遮掉关键点（伯努利掩码，并把掩码本身拼进输入，好区分「缺失」和「恰好在原点」）、加均匀噪声，同一段训练窗口内掩码和噪声保持不变，模拟时间上相关的感知误差；可见关键点数在 3–13 之间随机。

### 3. 因子化码本：编码器—估计器匹配

- 码本有 $C$ 个通道、每通道 $D$ 个码，每个通道独立选一个 one-hot，组合起来能表示 $D^C$ 种原型，但网络只需输出 $C \cdot D$ 个 logits（最终选 $C=128, D=12$：$12^{128}$ 种组合、1536 个输出）。量化用分组直通 Gumbel-Softmax：前向是硬 one-hot，反向走松弛概率。
- **编码器** $E_H$（仅训练用）看干净描述，**估计器** $S_H$（部署用）看弄脏的描述，两者共享量化器和解码器 $D_H$。损失 = 编码器分支的重建误差 + 估计器码与编码器码（stop-gradient）的匹配误差：

$$\mathcal{L} _ {\mathrm{HCB}} = \|\hat h^{\mathrm{enc}}_t - h^{\mathrm{ref}}_t\|_2^2 + \|z^{\mathrm{est}}_t - \mathrm{sg}(z^{\mathrm{enc}}_t)\|_2^2$$

- 下游动作损失的梯度**不回传到码本**；码本只负责「把坏输入变回干净的全身描述」。离散选择逼策略**押注一个原型**，而不是把几种可能的全身补全取平均。

### 4. 动作头与部署

恢复出的描述 $\hat h^{\mathrm{est}}_t$ 经无参数的坐标变换转到机器人基坐标系，与本体历史拼接，MLP 输出归一化动作 $u_t$，按 $q^{\mathrm{cmd}}_t = q_0 + \alpha \odot u_t$ 变成关节位置指令（$\alpha_j \in [0.07, 0.55]$），50 Hz 交给 PD（$\omega_n = 2\pi \cdot 10$ Hz、$\zeta = 2$）。上游换成光学动捕、VR、单目视频（GVHMR）或文本生成（HY-Motion 1.0）都只是换了 $h_t$ 的来源，同一个 checkpoint 不微调。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DATA["📦 训练数据"]
        D1["AMASS / LAFAN1 / OMOMO<br/>14,147 训练 · 4,073 测试"]
        D2["离线重定向到 G1<br/>（只给教师用）"]
        D1 --> D2
    end

    subgraph S1["🏋️ 阶段 1：特权 MoE 教师（PPO）"]
        T1["观测：本体 + 机器人参考（短前瞻）<br/>+ 根线速度 + 足端接触"]
        T2["稀疏 MoE actor<br/>8 专家选 top-2 + 1 共享专家"]
        T3["负载均衡损失<br/>+ SONIC 式自适应采样"]
        T1 --> T2 --> T3
    end

    subgraph S2["🎓 阶段 2：码本学生（蒸馏）"]
        H0["干净人体描述 h_ref（同一动作库）<br/>根 13 维 + J 个关键点 + 双腕 6D"]
        H1["弄脏的 h_t<br/>关键点掩码 + 均匀噪声"]
        E["编码器 E_H（仅训练）"]
        S["估计器 S_H"]
        Q["共享量化器 Q<br/>C=128 通道 × D=12 码<br/>直通 Gumbel-Softmax"]
        DEC["共享解码器 D_H<br/>→ 恢复的全身描述"]
        L1["HCB 损失<br/>重建 + 匹配 sg(z_enc)"]
        A["坐标变换到机器人基坐标<br/>+ L 帧本体历史 → MLP actor"]
        L2["Huber 蒸馏教师动作均值<br/>+ 5 个辅助头"]
        H0 --> E --> Q
        H1 --> S --> Q
        Q --> DEC --> L1
        DEC --> A --> L2
    end

    subgraph DEP["🤖 部署（一次前向 0.604 ms）"]
        IN["VR / 光学动捕 / 单目视频 GVHMR / 文本生成"]
        P["S_H → Q → D_H → actor"]
        PD["q_cmd = q0 + α⊙u<br/>50 Hz → PD 控制器 → G1"]
        IN --> P --> PD
    end

    DATA --> S1
    S1 -- 冻结教师监督 --> S2
    S2 -- 丢掉教师 / 编码器 / 辅助头 --> DEP

    style DATA fill:#eef6ff,stroke:#2e86de
    style S1 fill:#fff7e0,stroke:#d4a017
    style S2 fill:#f3eafe,stroke:#8e44ad
    style DEP fill:#eafaf1,stroke:#27ae60
</div>

---

## 🚶 具体实例：缺了膝盖关键点时，回归和码本各给出什么

（这是说明机制的玩具例子，数字不是论文的。）

假设 VR 只给了头和双手，膝盖关键点被遮掉；训练集中「双手位置这样摆」的帧一半是站立（膝角约 0.1 rad），一半是深蹲（膝角约 1.2 rad）。

| 学生 | 怎么出膝角 | 结果 |
|---|---|---|
| 连续回归（MLP） | MSE 最优解是条件均值 | $0.5 \times 0.1 + 0.5 \times 1.2 = 0.65$ rad：半蹲，两种训练样本里都没有，和根高度也对不上 |
| 码本 | 估计器在该通道上给出 logits，比如「站」0.45、「蹲」0.55，硬选最大的一个码 | 解码出 1.2 rad 的完整深蹲原型，是训练里真实出现过的全身姿态 |

根高度始终在 13 维根状态里可见（例如 0.55 m 明显是蹲），所以真实系统里估计器通常能据此打破平局；即使猜错，给出的也是一个**自洽的**全身姿态，而不是两种姿态的混合。论文图 4 的码使用热图说的也是这件事：带噪输入下估计器的码分布更分散，但硬量化把这种不确定性变成「选哪个原型」，而不是「平均成什么」。

延迟账（表 II）：TWIST 22.372 ms 里有 21.930 ms 是重定向，策略本身只有 0.442 ms；本文没有重定向和前瞻，E2E 0.604 ms，约为 TWIST 的 1/37、SONIC（G1，204.077 ms）的 1/338。真机视频光流对齐测得的整体响应延迟中位数是 147.5 ms（含感知、通信、控制周期和执行器）。

---

## 📊 关键结果

**跨仿真器跟踪（表 I，MjLab，6,495 条 SONIC bones-seed 轨迹，所有方法都加 σ = 0.1 m 关键点噪声，失败帧按固定罚值计入）**：

| 方法 | SR ↑ | MPJPE ↓ | MPJVE ↓ | MPKPE ↓ | 根位置 ↓ | 根线速度 ↓ | 根偏航 ↓ | 偏航角速度 ↓ |
|---|---|---|---|---|---|---|---|---|
| TWIST | 0.8451 | 0.2950 | 2.6869 | 0.2187 | 1.0449 | 0.7391 | 0.9395 | 1.3754 |
| TWIST2 | 0.6199 | 0.3314 | 3.9878 | 0.3300 | 0.9958 | 1.0133 | 0.8999 | 1.9379 |
| GMT | 0.7540 | 0.3122 | 2.8031 | 0.2453 | 0.9205 | 0.7825 | 0.8262 | 1.3557 |
| CLONE | 0.8335 | 0.4636 | 3.3079 | 0.3358 | 0.7970 | 0.8804 | 0.6789 | 1.5397 |
| ANY2TRACK | 0.0556 | 0.7279 | 7.6275 | 0.7699 | 1.5329 | 2.3334 | 2.3479 | 4.5856 |
| MLP（无码本） | 0.9529 | 0.2996 | 1.4412 | **0.2060** | 0.6016 | 0.4435 | 0.3761 | 1.1816 |
| **Codebook** | **0.9590** | **0.2947** | **1.1698** | 0.2159 | **0.5904** | **0.3956** | **0.3716** | **0.8960** |

码本学生 8 项里 7 项最好（SR + 6 个误差）；和 MLP 学生比，姿态精度相近，但 MPJVE、偏航角速度误差明显更低（高频抖动更少）。

**OOD 鲁棒性（表 III，成功率）**：

| 方法 | 干净 | 观测丢弃 0.5 | 关键点噪声 0.30 m | 根高度漂移 0.20 m | 初始偏置 0.30 | 未见动作（Motion-X） |
|---|---|---|---|---|---|---|
| TWIST | 0.9114 | 0.9011 | 0.6344 | 0.8286 | 0.8942 | 0.4467 |
| CLONE | 0.8725 | 0.8401 | 0.6167 | 0.0000 | 0.8430 | 0.4700 |
| MLP（无码本） | **0.9584** | 0.9163 | 0.8675 | 0.8306 | **0.9535** | 0.5433 |
| **Codebook** | 0.9565 | **0.9372** | **0.9487** | **0.8572** | 0.9475 | **0.6067** |

- 噪声扫描（图 3）：σ = 0.50 m 时 MLP 掉到 0.08，码本学生仍在 0.93–0.96 之间——两者只差一个量化层，说明鲁棒性来自离散瓶颈。
- 根高度漂移下码本学生只比干净时低 0.10，CLONE / TWIST2 / GMT 至少掉 0.51。

**消融**：

- 教师（表 IV）：完整教师 SR 98.88；去掉 MoE 掉到 90.23，MPJVE 和偏航角速度误差约翻倍；只去自适应采样 97.80；两个都去 82.13。
- 码本容量（表 V）：SR 在 0.932–0.943 之间几乎饱和，按「码的健康度」选 $(128, 12)$：$D = 6$ 时最常用的码占比 ≥ 56.9%，$D = 24$ 时 5.7% 的码从未被用到；同容量下加宽 $D$ 比加通道更能保持多样性。
- 关键点数（图 9）：$k$ 从 3 到 13，SR 从 0.9153 升到 0.9366；只用头 + 双腕（$k = 3$，与 CLONE 同接口）就已超过 CLONE 的 0.8725。

**真机**：同一个 checkpoint 在 G1 上用 VR 完成走近—双手抱起—转身—下蹲放下，用光学动捕做抬臂、出拳、弯腰、下蹲、行走、侧移，并跟踪单目视频估计和文本生成的动作，均未微调。

---

## 💡 核心贡献

1. **免重定向的全身遥操作**：部署时原始人体全身动作 → 关节指令只需一次前向，没有在线运动学适配，也不需要未来参考帧；
2. **离散全身运动先验**：用干净动捕训练的因子化类别码本，通过编码器—估计器匹配把部分 / 带噪 / OOD 观测映射到可行的动作原型；
3. **一套 checkpoint 接四种输入源**：VR、光学动捕、单目视频、文本生成，在 G1 仿真和真机上都验证了精度、鲁棒性和延迟。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **重定向可以从部署链路里拿掉** | 形态映射交给策略在蒸馏时学，重定向只留在离线造教师数据这一步；E2E 从 ~22 ms 降到 0.6 ms |
| **「人体空间」成为通用接口** | 上游只要能产出人体关键点和根状态即可，VR、视频估计、文本到动作模型可以即插即用 |
| **离散瓶颈作为 OOD 护栏** | 与 SONIC 的 FSQ token、PULSE 的潜空间先验同属「先压到训练支撑里再出动作」的思路，这里把它放在部署输入端专门防感知误差 |
| **局限** | 码本是逐帧的，不建模长时动作结构；论文只在 G1 上验证；没有开源代码；跟踪精度评测在仿真里，真机只有定性展示和一个视频测延迟 |

---

## 🎤 面试参考

**Q：去掉重定向后，人和机器人的形态差是谁处理的？**
A：教师训练时用的是离线重定向好的机器人参考，学生只看人体坐标系的描述，用 BC 去模仿教师的动作。也就是说，形态映射被「蒸馏」进了学生网络，部署时不再有显式的运动学求解。

**Q：码本为什么比连续回归更鲁棒？**
A：两者结构、数据、教师完全一样，只差量化。连续回归会把坏输入线性地传下去，或者在几种可能的补全之间取平均，得到不可行的姿态；码本的码是用干净动捕学的，估计器只能从这些码里选，所以坏输入被投影到训练里出现过的原型上。噪声 0.50 m 时 MLP 0.08、码本 0.93 就是直接证据。

**Q：为什么下游动作损失不更新码本？**
A：码本的职责是「恢复干净的人体描述」，如果让动作损失也往里推，码就会被改造成对动作有用但不再对应真实人体姿态的特征，匹配目标和重建目标都会被破坏。分开训练也让码本可以单独评估（码的使用率、死码比例）。

**Q：为什么要把可见性掩码拼进输入？**
A：被遮掉的关键点置零后，和一个恰好在原点附近的真实关键点无法区分；拼上掩码，估计器就知道哪些维度是真缺失、需要靠先验补全。

---

## 🔗 相关阅读

- [TWIST](../TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.html) / [TWIST2](../TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System/TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System.html)：「重定向 + 跟踪」路线的代表，也是本文最强的外部基线
- [CLONE](../CLONE__Closed-Loop_Whole-Body_Humanoid_Teleoperation_for_Long-Horizon_Tasks/CLONE__Closed-Loop_Whole-Body_Humanoid_Teleoperation_for_Long-Horizon_Tasks.html)：只用头 + 双手的免重定向方案，本文 $k = 3$ 的对照
- [ExtremControl](../ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control/ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control.html)：用手工比例映射直接控末端的低延迟方案
- [GMR: Retargeting Matters](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html)：表 II 里所有基线共用的在线重定向器
- [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)：自适应采样的出处，也是测试集 bones-seed 的来源
- [OmniH2O](../../03_High_Impact_Selection/OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html)：稀疏输入的师生蒸馏遥操作
- Categorical Codebook Matching for Embodied Character Controllers（SIGGRAPH 2024, Starke et al.）：因子化码本与编码器—估计器匹配的出处
