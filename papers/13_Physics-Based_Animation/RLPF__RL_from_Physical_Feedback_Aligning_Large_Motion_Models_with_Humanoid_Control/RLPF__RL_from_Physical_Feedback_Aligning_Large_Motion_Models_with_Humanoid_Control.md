---
layout: paper
paper_order: 14
title: "RL from Physical Feedback: Aligning Large Motion Models with Humanoid Control"
zhname: "RLPF：基于物理反馈的强化学习，让大动作模型对齐人形机器人控制"
category: "物理动画"
arxiv: "2506.12769"
---

# RL from Physical Feedback: Aligning Large Motion Models with Humanoid Control
**RLPF：基于物理反馈的强化学习，让大动作模型对齐人形机器人控制**

> 📅 阅读日期: 2026-10-05
>
> 🏷️ 板块: 13 Physics-Based Animation · 文本生成动作 / RL 后训练（GRPO）/ 物理可行性奖励 / 动作跟踪
>
> 🔁 推进轨: 模块轮转（12_Hardware_Design → **13_Physics-Based_Animation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2506.12769](https://arxiv.org/abs/2506.12769) |
| HTML | [在线阅读](https://arxiv.org/html/2506.12769) |
| PDF | [下载](https://arxiv.org/pdf/2506.12769) |
| 项目主页 | [beingbeyond.github.io/RLPF](https://beingbeyond.github.io/RLPF/) |
| 源码 | 暂未开源：官方仓库 [BeingBeyond/RLPF](https://github.com/BeingBeyond/RLPF) 截至 2026-10 只有 README（"We will release our code soon"） |
| 作者 | Junpeng Yue, Zepeng Wang, Yuxuan Wang, Weishuai Zeng, Jiangxing Wang, Xinrun Xu, Yu Zhang, Sipeng Zheng, Ziluo Ding, Zongqing Lu |
| 机构 | 北京大学（PKU）· BeingBeyond · 武汉大学（WHU） |
| 平台 | LLaMA2-7B 动作大模型 · IsaacGym 训练跟踪策略 / 算奖励 → MuJoCo 零样本 → Unitree G1 真机 |
| **发布时间** | 2025-06-15（arXiv v1） |

---

## 🎯 一句话总结

文本生成动作（T2M）模型出身图形学，只管「像不像文字说的」，不管「物理上能不能做」：脚滑、穿地、重心失稳的动作交给人形机器人就会摔。RLPF 借用 LLM 的 RLHF 思路，把「人类偏好」换成**物理反馈**：先训好一个 ExBody2 式的通用动作跟踪策略并冻结，生成的动作重定向到 G1 后丢进 IsaacGym 让它去跟——**跟住了奖励 1，摔了或偏离太远奖励 0**；同时用对比学习的文本 / 动作编码器给出语义对齐分，防止模型为了好跟而只会生成「站着不动」。两路奖励一起用 **GRPO** 微调 LLaMA2-7B 动作模型。结果在 CMU / AMASS 测试集上，IsaacGym 跟踪成功率从基座的 0.43–0.48 提到 0.90–0.97，MuJoCo 跨仿真器也明显提升，检索精度 R@k 与基座持平或略高，并在 G1 真机上部署。

---

## ❓ 要解决什么问题？

- **T2M 的物理盲区**：MotionGPT、T2M-GPT、MDM 这类模型在 HumanML3D 指标上很好看，但输出里常有脚滑、穿地、动态不稳，直接给人形机器人就是摔机。
- **两道坎**：①**形态差异**——人体动作要先重定向成机器人能达到的关节轨迹；②**物理一致性**——重定向后的轨迹还得在动力学上站得住。
- **已有补救都在下游**：靠更强的跟踪策略硬扛不可行的参考，或用跟踪策略把数据过滤一遍再做 SFT。论文想问的是：能不能**直接改上游的生成模型**，让它从源头就生成「好跟的」动作，同时不丢语义？

---

## 🔧 方法核心

### ① 预训练文本生成动作大模型

- **动作分词器**：VQ 编码器 $\mathcal{E}$ / 解码器 $\mathcal{D}$ / 码本 $\mathcal{C}$，把 $M$ 帧动作压成 $L$ 个离散 token。
- **LLM 主干**：LLaMA2-7B，词表扩充 $K$ 个动作码，读入文本 token 后自回归吐出动作 token；预训练就是标准的下一个 token 负对数似然。论文强调框架不绑定具体 T2M 模型。

### ② 物理反馈奖励：重定向 → 跟踪 → 离线判定

1. **重定向**（沿用 H2O）：先梯度下降拟合 SMPL 形状参数 $\beta$ 让人体骨架贴近 G1，再固定形状、用 IK + 梯度优化姿态 $\theta$，最后用关键点位置约束对齐全身。
2. **跟踪策略**（沿用 ExBody2 的师生框架，AMASS 上训练）：教师用 PPO + 特权信息（真实根速度、全局关节位置、摩擦 / 电机强度）输出 23 维 PD 目标；学生只看观测历史 $o _ {t-H:t}$ 与跟踪目标 $g_t$，用 DAgger 式 MSE 蒸馏，训练完**冻结**。
3. **离线判定**：在 IsaacGym 里让学生策略跟踪生成动作 $m_i$，奖励是二值成功标志
   $R _ {\text{tracking}} = \mathbb{I}(\mathrm{Succ}(\pi, m_i))$，
   失败条件为任一时刻平均位置偏差超过阈值（评测里是 0.5 m）或失去平衡。

### ③ 语义对齐校验

只优化跟踪奖励会让模型「投机」——生成最容易跟的动作而不管文字。于是用对比损失训练文本编码器 $E_t$ 与动作编码器 $E_m$（匹配对拉近、不匹配对推开到 margin 之外），提供两种校验：

- **TA（文本对齐）**：生成动作与输入文字在嵌入空间的距离 $\lVert E_t(t) - E_m(m _ {\text{pred}}) \rVert^2$；
- **MA（动作对齐）**：生成动作与真值动作的嵌入距离 $\lVert E_m(m) - E_m(m _ {\text{pred}}) \rVert^2$。

### ④ GRPO 微调

把动作生成器当策略 $\pi_\theta$：每条文本采一组 $G$ 条动作序列（附录里 Num Generations = 20），组内奖励标准化得到优势 $A_i = (r_i - \text{mean}) / \text{std}$，用带 clip 的比率目标 + 对参考模型的 KL（k3 估计，权重 1.0）更新，**不需要 critic**。奖励权重：跟踪 10、对齐 2。8 张 A800 训练。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph P0["① 预训练 T2M 大模型"]
        DATA["文本-动作对<br/>CMU / AMASS"]
        VQ["VQ 动作分词器<br/>编码器 / 码本 / 解码器"]
        LLM["LLaMA2-7B<br/>词表 + K 个动作码<br/>下一个 token NLL"]
        DATA --> VQ --> LLM
    end

    subgraph RL["④ GRPO 后训练（每条文本采 G=20 条）"]
        TXT["文本指令 l"]
        GEN["π_θ 生成动作 token<br/>→ VQ 解码成 SMPL 动作"]
        ADV["组内标准化优势<br/>A_i = (r_i − mean) / std"]
        UPD["clip 比率目标 + KL(π_θ ‖ π_ref)<br/>无 critic"]
        TXT --> GEN
        ADV --> UPD
        UPD -.->|"更新"| GEN
    end

    subgraph PHY["② 物理反馈奖励（权重 10）"]
        RT["H2O 式重定向<br/>先拟合形状 β，再优化姿态 θ"]
        TRK["冻结的 ExBody2 式跟踪策略<br/>教师 PPO + 特权信息 → 学生 DAgger"]
        SIM["IsaacGym 跟踪 rollout"]
        SUC["R_tracking = 1(跟住且不摔)<br/>偏差 > 0.5 m 或失衡记 0"]
        RT --> SIM
        TRK --> SIM
        SIM --> SUC
    end

    subgraph SEM["③ 语义对齐校验（权重 2）"]
        ENC["对比学习编码器 E_t / E_m"]
        TA["TA：文字 ↔ 生成动作 距离"]
        MA["MA：真值动作 ↔ 生成动作 距离"]
        ENC --> TA
        ENC --> MA
    end

    LLM -->|"初始化 π_θ 与 π_ref"| GEN
    GEN --> RT
    GEN --> ENC
    SUC --> ADV
    TA --> ADV
    MA --> ADV

    subgraph DEP["部署验证"]
        MJ["MuJoCo 零样本跨仿真器"]
        G1["Unitree G1 真机<br/>策略 50 Hz / 底层 200 Hz / LCM"]
        MJ --> G1
    end
    GEN -->|"微调后的生成动作"| MJ

    style P0 fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
    style RL fill:#e6e0f7,stroke:#6a4caf,color:#2a1a4a
    style PHY fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style SEM fill:#fde8e8,stroke:#c0392b,color:#5a1414
    style DEP fill:#e0f7fa,stroke:#0097a7,color:#003f47
</div>

> 源码运行时序图：官方仓库 [BeingBeyond/RLPF](https://github.com/BeingBeyond/RLPF) 目前只有 README（"code will be released soon"），没有可对照的入口与模块，因此本笔记不画源码时序图，待代码放出后补。

---

## 📊 实验与结果

- **对比对象**：Base Model（预训练基座）、SFT（全量数据监督微调）、SFT-Filter（只用跟踪策略筛出来的「好跟」数据做 SFT）。
- **低层跟踪**（主指标是成功率 Succ）：

| 方法 | CMU · IsaacGym Succ | CMU · MuJoCo Succ | AMASS · IsaacGym Succ | AMASS · MuJoCo Succ |
|---|:---:|:---:|:---:|:---:|
| Base Model | 0.43 | 0.43 | 0.48 | 0.45 |
| SFT | 0.36 | 0.30 | 0.40 | 0.40 |
| SFT-Filter | 0.57 | 0.41 | 0.51 | 0.46 |
| RLPF-MA | 0.95 | **0.75** | **0.92** | 0.63 |
| RLPF-TA | **0.97** | 0.61 | 0.90 | **0.66** |

- **高层生成**：AMASS 上 RLPF-MA 的 R@1/2/3 = 0.28/0.46/0.58，高于基座的 0.22/0.35/0.46，MMDist 也更小；但 FID 变差（基座 1.79 → 3.34），说明分布向「好跟」的一侧挪了。
- **消融**：
  - **去掉跟踪奖励**（w/o track）：CMU IsaacGym Succ 只有 0.32，比基座还低——物理可行性完全来自这项奖励。
  - **把跟踪器换成 PHC**（RLPF-PHC）：仿真里 0.91 / 0.80，略低于用 ExBody2 式策略；PHC 依赖关键点、不能直接上真机，需转给 ExBody2 学生策略执行，存在迁移落差。
  - **去掉对齐校验**（w/o align）：跟踪成功率最高（AMASS 上 0.99），但 FID 飙到 32–42、R@1 掉到 0.07–0.09——模型学会了生成「好跟但和文字无关」的动作，正是奖励投机。
- **真机**：微调后的动作经同一跟踪策略在 Unitree G1（Jetson Orin NX，策略 50 Hz）上执行，视频见项目主页。

---

## 💡 核心贡献

1. **RLPF 框架**：首个用 RL 直接微调文本生成动作模型、以「冻结跟踪策略在仿真里能否跟住」作为物理可行性奖励的方法，把下游控制器变成上游生成器的「评审」。
2. **对齐校验模块**：用对比学习编码器给出 TA / MA 两种语义奖励，抑制只追跟踪成功率时的奖励投机。
3. **系统验证**：IsaacGym → MuJoCo → G1 真机三段评测，跟踪成功率约翻倍，语义检索指标不降。

---

## 🤖 对人形机器人的启示

| 方向 | 影响 |
|---|---|
| **生成器与控制器闭环** | 与其让跟踪策略硬扛不可行的参考，不如让生成器学会「控制器能做什么」；RLPF 的奖励是二值的，任何现成跟踪器都能拿来当评审 |
| **RL 比筛数据更有效** | SFT-Filter 只把成功率从 0.43 提到 0.57，RLPF 到 0.95——在线采样 + 组内对比比离线筛数据更能把分布推向可行区域 |
| **奖励投机要提前防** | w/o align 的结果是 RLHF 里「reward hacking」在动作领域的翻版：单一物理奖励会把语义吃掉，必须配语义正则或 KL |
| **评审器决定上限** | 跟踪策略冻结且只在 AMASS 上训过，它跟不住的高难动作（翻跟头、快速转身）会被一律判为「不可行」，生成器的动作多样性受评审器能力限制 |

---

## ⚠️ 局限与可改进点

- **评审器冻结**：论文自己承认，跟踪策略在有限静态数据上预训练后不再更新，泛化受限；未来方向是生成模型与可自适应的跟踪策略联合训练。
- **二值奖励稀疏**：成功 / 失败没有梯度强弱之分，差一点跟住与完全摔倒同分，可考虑用 MPJPE / 存活时长做连续奖励。
- **FID 变差**：动作分布被往「好跟」方向推，多样性 / 真实感有代价，论文对此讨论不多。
- **奖励计算成本**：每次 GRPO 更新要对 20 条样本做重定向 + 仿真 rollout，比纯文本 RLHF 昂贵得多。
- **代码未放出**：复现细节（重定向超参、跟踪奖励项、对比编码器结构）只能看论文与附录。

---

## 🎤 面试参考

**Q：RLPF 和 RLHF 是什么关系？**
A：结构完全照搬——预训练好的自回归生成模型当策略，采样一组输出、打分、用 PPO 类目标更新并加 KL 约束；区别是奖励不来自人类偏好模型，而来自「物理评审」：冻结的人形跟踪策略在仿真里能否跟住这段动作，再加一个对比编码器的语义分。

**Q：为什么用 GRPO 而不是 PPO？**
A：生成器是 7B 的 LLM，再训一个同量级的 critic 很贵；而且奖励是整段动作一次性给出的序列级二值信号，价值函数难学。GRPO 每条文本采 20 条，用组内均值 / 标准差做基线，省掉 critic。

**Q：去掉对齐校验会发生什么？**
A：跟踪成功率反而最高（AMASS 上 0.99），但 FID 从 3 左右飙到 30–40，R@1 掉到 0.07–0.09：模型发现「生成简单、好跟、与文字无关的动作」就能拿满物理奖励，是典型的奖励投机，所以语义奖励不可少。

**Q：为什么 SFT-Filter 提升有限？**
A：它只是在原有数据里挑出好跟的样本做模仿，模型并不知道失败样本「错在哪」，也不会在自己生成的分布上被纠正；RLPF 在策略自己的输出上在线打分，直接把生成分布推向可行区域。

---

## 🔗 相关阅读

- [ExBody2: Advanced Expressive Humanoid Whole-Body Control (本仓库笔记)](../../03_High_Impact_Selection/ExBody2_Advanced_Expressive_Whole-Body_Control/ExBody2_Advanced_Expressive_Whole-Body_Control.html) — RLPF 跟踪策略的师生框架来源
- [H2O: Human-to-Humanoid Teleoperation (本仓库笔记)](../../03_High_Impact_Selection/H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation/H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation.html) — 重定向方法来源（先拟合 SMPL 形状再优化姿态）
- [PHC: Perpetual Humanoid Control (本仓库笔记)](../../01_Foundational_RL/PHC_Perpetual_Humanoid_Control/PHC_Perpetual_Humanoid_Control.html) — 消融里替换的跟踪器
- [HumanML3D (本仓库笔记)](../../14_Human_Motion/HumanML3D/HumanML3D.html) — R-Precision / FID / MMDist 评测协议出处
- [UH-1 (本仓库笔记)](../../03_High_Impact_Selection/UH-1_Learning_from_Massive_Human_Videos_for_Universal_Humanoid_Pose_Control/UH-1_Learning_from_Massive_Human_Videos_for_Universal_Humanoid_Pose_Control.html) — 同样把文本生成的动作交给人形执行，但不在生成端引入物理反馈
- [TextOp (本仓库笔记)](../../04_Loco-Manipulation_and_WBC/TextOp__Real-time_Interactive_Text-Driven_Humanoid_Robot_Motion_Generation_and_C/TextOp__Real-time_Interactive_Text-Driven_Humanoid_Robot_Motion_Generation_and_C.html) — 实时文本驱动人形动作生成与控制

---

> 备注：本笔记基于 arXiv 摘要、HTML v1（含附录超参表 Table 9）与项目主页整理；官方代码截至笔记时尚未放出，故无源码运行时序图。表格数字摘自论文 Table 1–6。
