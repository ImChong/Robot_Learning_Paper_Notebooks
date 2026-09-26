---
layout: paper
paper_order: 14
title: "Evolutionary Continuous Adaptive RL-Powered Co-Design for Humanoid Chin-Up Performance"
zhname: "EA-CoRL：面向人形引体向上的进化式连续自适应强化学习协同设计"
category: "硬件设计"
arxiv: "2509.26082"
---

# Evolutionary Continuous Adaptive RL-Powered Co-Design for Humanoid Chin-Up Performance
**外环用 CMA-ES 进化电机减速比，内环让同一个 PPO 策略跟着每一代新设计持续微调、而不是冻结在预训练模型上，在 RH5 人形上把原本受驱动器限制做不了的「引体向上」协同设计出来。**

> 📅 阅读日期: 2026-09-26
>
> 🏷️ 板块: 12 Hardware Design · 硬件-控制协同设计 · 减速比优化 · 进化策略 + 强化学习
>
> 🔁 推进轨: 模块轮转（11_Simulation_Benchmark → **12_Hardware_Design**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2509.26082](https://arxiv.org/abs/2509.26082) |
| HTML | [在线阅读](https://arxiv.org/html/2509.26082v1) |
| PDF | [下载](https://arxiv.org/pdf/2509.26082) |
| 源码 | 论文未给出公开代码/项目页（实现基于 Isaac Gym + PPO + PyCMA，未开源） |
| **发布时间** | 2025-09-30 (arXiv) |

**作者**：Tianyi Jin*、Melya Boukheddimi*（共同一作）、Rohit Kumar、Gabriele Fadini、Frank Kirchner。机构为 DFKI 不来梅机器人创新中心、不来梅大学 AG Robotik、ETH Zurich 计算机器人实验室、RWTH Aachen。经费来自 DLR / BMBF 的 CoEx 项目。

**定位**：一篇**硬件-控制协同设计（co-design）**方法论文。设计变量是 RH5 人形各关节组的**减速比**（旋转关节的谐波减速器、直线驱动器的丝杠导程），控制器是 RL 策略，考察任务是对驱动器要求很高的**引体向上（chin-up）**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| EA-CoRL | Evolutionary Continuous Adaptive RL-based Co-Design | 本文方法：进化式 + 连续自适应的 RL 协同设计 |
| CMA-ES | Covariance Matrix Adaptation Evolution Strategy | 协方差矩阵自适应进化策略，黑盒优化常用 |
| PT-FT | PreTraining-FineTuning | 基线：先元 RL 预训练通用策略，再对每个设计快速微调（策略冻结在预训练版本上） |
| PPO | Proximal Policy Optimization | 近端策略优化 |
| OC | Optimal Control | 最优控制（传统协同设计常用路线） |

---

## ❓ 这篇论文要解决什么问题？

1. **顺序设计的短视**：传统流程是「先定硬件，再写控制器」，控制器只能在既定硬件里找最优，硬件潜力发挥不出来。
2. **OC 协同设计太依赖模型**：基于最优控制的协同设计对阻尼、摩擦、噪声、延迟等建模误差敏感，结果难以落地。
3. **RL 协同设计的策略-设计耦合**：RL 策略与训练时的设计参数强绑定，设计一变就要重训；现有 PT-FT 路线用预训练通用策略 + 快速微调来省算力，但策略**一直从同一个冻结的预训练模型出发**，容易早熟停滞。
4. **具体痛点**：RH5（55 kg、187 cm、33 DoF、串并联混合结构）在原始驱动器配置下做不了引体向上，腕部驱动器最大力矩只有肩部的 1/5。

---

## 🔧 方法：双层循环

### 外环：设计进化（Design Evolution）

- 设计向量按关节组分四个减速比系数：$d=[d _ {\text{leg}}, d _ {\text{shoulder}}, d _ {\text{elbow}}, d _ {\text{wrist}}]$
  - 腿组 5 DoF（躯干俯仰 1 + 双髋屈伸 2 + 双膝 2）、肩组 6 DoF、肘组 2 DoF、腕组 4 DoF（双侧俯仰/偏航），合计影响 17 个关节，每个配置对应 34 个力矩/速度上限参数
- 减速比系数按驱动器物理规律同时改力矩与速度上限（力矩乘、速度除）：

$$\tau _ {\max}(d)=\tau _ {\text{default}}\cdot d,\qquad \dot q _ {\max}(d)=\frac{\dot q _ {\text{default}}}{d}$$

- CMA-ES（PyCMA）每代从多元高斯中采样 50 个候选设计，取适应度最好的 10 个更新分布；系数边界 $[0.5, 4.0]$，最多 50 代

### 内环：策略连续自适应（Continuous Adaptation）

- **Base Policy** $\pi _ {\theta_0}$：第一代时在初始设计集合上预训练 5000 步，作为热启动
- **Fine-tuned Policy** $\pi _ {\theta^{\ast}}$：当前最好策略，初始化为 $\pi _ {\theta_0}$
- **Task-Adapted Policy** $\pi _ {\theta}$：每一代都从 $\pi _ {\theta^{\ast}}$ 出发，在新一代设计上微调 2500 步（学习率 $10^{-5}$）；若新一代适应度刷新最优，就**用它替换** $\pi _ {\theta^{\ast}}$
- 与 PT-FT 的唯一关键差别：PT-FT 每次都从冻结的预训练策略出发，EA-CoRL 的出发点**随进化一起前进**

### 并行评估与适应度

- 4000 个 Isaac Gym 并行环境按设计平均分配：每个设计 $N _ {\text{exp}} = 4000/50 = 80$ 个环境，削弱单次 rollout 的奖励噪声
- 适应度取该设计所有环境平均奖励的相反数：$J _ {\text{pop}} = -\frac{1}{N _ {\text{exp}}}\sum R(d)$，最优设计 $d^{\ast}=\arg\min_d J _ {\text{pop}}(d)$

### RL 任务设置（RH5 引体向上）

| 项 | 内容 |
|---|---|
| 观测 | 目标位置距离、指令、重力投影、关节位置/速度、上一步动作 + **减速比系数（作为特权信息编码成隐向量后拼接）** |
| 动作 | 17/33 个关节的位置 + 速度目标，经 PD 控制器转为力矩 |
| 主奖励 | $r _ {\text{chinup}}=\exp(-\lVert p _ {\text{head}}-p _ {\text{goal}}\rVert^2)$，权重 30 |
| 惩罚 | 与横杆空心圆柱的相对位置、基座位置、左右对称、姿态、力矩、关节加速度、动作变化率、关节位置/速度/力矩超限 |
| 算力 | 单张 RTX A6000，全流程约 4 天 |

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph PROB["❓ 痛点"]
        P1["顺序设计：硬件定了才写控制<br/>硬件潜力发挥不出"]
        P2["RH5 原始驱动器<br/>做不了引体向上"]
        P3["PT-FT：策略冻结在预训练版本<br/>设计搜索早熟停滞"]
    end

    subgraph OUT["🧬 外环：设计进化 CMA-ES"]
        O1["采样 50 个设计<br/>d = [腿, 肩, 肘, 腕] 减速比系数"]
        O2["τmax = τdefault·d<br/>q̇max = q̇default / d"]
        O3["取适应度最好的 10 个<br/>更新高斯分布"]
    end

    subgraph IN["🔁 内环：策略连续自适应 (Isaac Gym)"]
        I1["4000 并行环境<br/>每个设计 80 个"]
        I2{"第 1 代?"}
        I3["预训练 Base Policy π₀<br/>5000 步"]
        I4["从 π* 微调 Task-Adapted π<br/>2500 步 PPO"]
        I5["适应度 J = −平均奖励"]
        I6{"J 优于历史最好 J*?"}
        I7["π* ← π，J* ← J<br/>最优设计 d* 更新"]
    end

    subgraph RES["📊 结果（6 个随机种子）"]
        R1["最终适应度明显低于 PT-FT<br/>PT-FT 早早停滞"]
        R2["腿、腕减速比大幅提高<br/>肩几乎不变 1:100→1:112"]
        R3["RH5 完成引体向上<br/>硬件改动不显著增重"]
    end

    PROB --> OUT
    O1 --> O2 --> I1
    I1 --> I2
    I2 -- 是 --> I3 --> I5
    I2 -- 否 --> I4 --> I5
    I5 --> I6
    I6 -- 是 --> I7 --> O3
    I6 -- 否 --> O3
    O3 -- 下一代 --> O1
    O3 -- 50 代后 --> RES

    style PROB fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style OUT fill:#ffe8ec,stroke:#c0392b,color:#5a1010
    style IN fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style RES fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
</div>

---

## 📊 实验结果速览

**对比 PT-FT（6 个随机种子）**：

- 适应度曲线：EA-CoRL 最终适应度显著更低（奖励更高），PT-FT 很快停在平台上；
- 学习曲线（都延长到 10000 步公平比较）：EA-CoRL 最终任务奖励最高，PT-FT 收敛快但被锁在预训练策略附近；两者都比从头训练快得多；
- 设计空间热图：EA-CoRL 的最优设计落在高奖励区域中央，周围也是高奖励区（对参数扰动更稳健）；PT-FT 的最优设计倾向把肩、腕拉到最大，却没有落在高奖励区。

**得到的减速比（Table III，直线驱动器为丝杠导程，导程越小力矩越大、速度越低）**：

| 驱动器 | EA-CoRL | 原始 RH5 | PT-FT |
|---|---|---|---|
| 肩（旋转） | 1:112 | 1:100 | 1:349 |
| 肘（直线） | 1.17 mm | 2.00 mm | 0.96 mm |
| 腕俯仰/偏航（直线） | 0.26 mm | 1.00 mm | 0.29 mm |
| 躯干俯仰（直线） | 1.42 mm | 5.00 mm | 2.94 mm |
| 髋俯仰（直线） | 2.85 mm | 10.00 mm | 5.88 mm |
| 膝（直线） | 2.85 mm | 10.00 mm | 5.88 mm |

**解读**：EA-CoRL 让**腿部与腕部**承担更多（腿负责甩出动量、腕负责抓杆时保持平衡），肩部减速比几乎不动，肩偏航只用到约 18% 的力矩上限。作者认为这是因为 RH5 没有人类那样强大的背阔肌群，只能靠腕部和下肢补偿。PT-FT 则走「把肩肘腕都拉满」的路线，肩部 1:349 意味着更大的速度牺牲。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **减速比作为设计变量** | 以往 RL 协同设计多优化连杆长度，这里改驱动器减速比，基本不改结构、不显著增重，对已有平台更实用 |
| **策略连续自适应** | 说明协同设计中「策略的出发点要跟着设计进化」，避免被冻结的预训练策略拖累设计搜索 |
| **高负载全身任务** | 引体向上要求全身协调发力，是比行走更能暴露驱动器短板的测试任务 |
| **模型无关** | 设计变量只通过力矩/速度上限进入仿真，可迁移到其他人形和足式机器人 |

---

## ⚠️ 局限

- **只在仿真里验证**：没有按新减速比改造真机，sim-to-real 仍是未解决的一环；
- **适应度只看奖励**：把所有物理考量塞进一个奖励函数本身就难，还容易被奖励工程左右；
- **计算成本高**：横杆与手部空心圆柱的凸包碰撞计算拖慢仿真，也带来训练不稳定，单卡要跑约 4 天；
- **单任务**：只针对引体向上，作者计划扩展到多任务基准；
- **基线少**：只和 PT-FT 比较，未与 OC 类协同设计直接对比。

---

## 🎤 面试参考

**Q：EA-CoRL 和 PT-FT 的本质区别是什么？**
A：两者都是「进化算法搜设计 + RL 策略评估设计」的双层结构。PT-FT 每评估一个新设计都从**同一个冻结的预训练策略**出发微调；EA-CoRL 维护一个「当前最优策略」，每代从它出发微调，适应度刷新就替换它。所以 EA-CoRL 的策略会随着设计进化不断前进，探索范围更大、不易早熟。

**Q：为什么用减速比而不是连杆长度作为设计变量？**
A：减速比只改变驱动器的力矩/速度上限（$\tau _ {\max}\propto d$、$\dot q _ {\max}\propto 1/d$），可以通过换谐波减速器或丝杠导程实现，几乎不改机械结构和质量；对已经造好的人形来说，这是成本最低的「硬件升级」方式。

**Q：同一个策略怎么适应不同设计？**
A：两点：一是把减速比系数作为特权观测编码进隐向量，让策略知道自己在控制哪种硬件；二是 4000 个并行环境同时覆盖 50 个设计，PPO 在设计分布上训练，天然学到跨设计的泛化。

**Q：为什么每个设计要分配 80 个环境？**
A：RL rollout 的奖励方差大，只用一个环境评估设计会让 CMA-ES 被噪声误导；80 个环境取平均，适应度估计更稳。

---

## 🔗 相关阅读 / 类似方向

- [Toward Humanoid Brain-Body Co-design: RoboCraft (arXiv 2510.22336)](https://arxiv.org/abs/2510.22336)：同样是人形「形态 + 控制」联合优化，任务换成跌倒恢复（同模块）
- [Embracing Evolution: Body-Control Co-Design (arXiv 2510.03081)](https://arxiv.org/abs/2510.03081)：呼吁具身人形采用身体-控制协同设计的立场论文（同模块）
- [Meta RL for Optimal Design of Legged Robots (Belmonte-Baeza et al., RA-L 2022)](https://arxiv.org/abs/2210.02750)：本文基线 PT-FT 的来源
- [Human-Level Actuation for Humanoids (arXiv 2511.06796)](https://arxiv.org/abs/2511.06796)：从驱动器指标角度讨论人形需要什么样的执行器（同模块）

---

> 备注：本笔记依据 arXiv 元信息与论文 HTML/PDF 公开内容整理；减速比、超参数与结论以论文为准。论文未公开源码与项目页，故本笔记只给出方法流程 mermaid，没有源码运行时序图；若后续释出代码可补充到「源码」一栏。
