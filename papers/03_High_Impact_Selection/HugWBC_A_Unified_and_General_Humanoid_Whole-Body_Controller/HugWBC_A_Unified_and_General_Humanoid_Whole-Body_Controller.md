---
layout: paper
title: "HugWBC: A Unified and General Humanoid Whole-Body Controller for Versatile Locomotion"
category: "高影响力精选 High Impact Selection"
subcategory: "Whole-Body Control Core"
zhname: "HugWBC：面向多步态人形的统一通用全身控制器"
---

# HugWBC: A Unified and General Humanoid Whole-Body Controller for Versatile Locomotion
**HugWBC：面向多步态人形的统一通用全身控制器**

> 📅 阅读日期: 2026-05-17
>
> 🏷️ 板块: 03_High_Impact_Selection / Whole-Body Control Core
>
> 🧭 状态: 首版基础摘要（含 mermaid 流程图）；后续可结合论文消融表与代码超参做二读补表。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2502.03206](https://arxiv.org/abs/2502.03206) |
| **HTML** | [arxiv.org/html/2502.03206v3](https://arxiv.org/html/2502.03206v3) |
| **PDF** | [arxiv.org/pdf/2502.03206](https://arxiv.org/pdf/2502.03206) |
| **项目主页** | [hugwbc.github.io](https://hugwbc.github.io/) |
| **发布时间** | 2025-02-05 (arXiv), RSS 2025 |
| **源码（团队主仓）** | [apexrl/HugWBC](https://github.com/apexrl/HugWBC) |
| **源码（机构镜像）** | [InternRobotics/HugWBC](https://github.com/InternRobotics/HugWBC) |
| **会议** | RSS 2025 |
| **作者** | Yufei Xue*, Wentao Dong*, Minghuan Liu^, Weinan Zhang, Jiangmiao Pang |
| **机构** | Shanghai Jiao Tong University · Shanghai AI Lab（APEX-Lab） |
| **机器人** | Unitree H1（亦适配同构 humanoid 平台） |

---

## 🎯 一句话总结

HugWBC 把"走、跳、立、单脚跳"四种步态以及**步频、抬脚高度、身高、躯干俯仰、腰部偏航**等连续行为参数统一塞进一个**任务命令 + 行为命令**的扩展命令空间，再用**非对称 Actor-Critic + 对称损失 + 干预训练（intervention training）**在 Isaac Gym 中训出**一份策略覆盖 3/4 种步态**，并能在任意上身遥操作干预下保持精准的腿部追踪——是把"locomotion + loco-manipulation"做成**可调节、可叠加、可被外部接管**的统一底座。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **WBC** | Whole-Body Control | 同时协调腿、躯干、手臂的全身控制 |
| **AAC** | Asymmetric Actor-Critic | 非对称 A-C：critic 看特权信息，actor 只看真机能拿到的本体感觉 |
| **Loco-Manip.** | Locomotion + Manipulation | 移动+操作，行走/跳跃时仍要精准操作物体 |
| **Gait** | Gait | 步态（走、跑、跳、立、单脚跳） |
| **Duty Cycle** | $\phi _ {\text{stance}}$ | 一个步态周期内"支撑"占比，越小越偏腾空 |
| **Phase Offset** | $\psi$ | 两脚相位差：走步 0.5、跳步 0.0 |
| **PD** | Proportional-Derivative | 关节级 PD 控制器，把策略输出的目标关节角变扭矩 |
| **PPO** | Proximal Policy Optimization | 训练 HugWBC 策略的 RL 算法 |

---

## ❓ 论文要解决什么问题？

当前学习型人形 locomotion 大多停留在「**单一速度区间 + 单一步态 + 不可调风格**」：

1. **不可调**：步频、抬脚高度、身高、躯干俯仰这些"长得像人"的参数，要么直接 hardcode 在奖励里，要么靠不同策略分别训练；
2. **不可叠加**：跳、单脚跳、深蹲走通常各自一个策略，工程上得维护一堆 checkpoint；
3. **不可干预**：上身一旦被遥操或上层 IL 接管，下身策略往往会被打飞——因为训练时上身是策略自己摆的，被外部强行接管等价于分布外输入。

HugWBC 提出的解法是把**命令空间**写得足够通用，再用**对称损失 + 干预训练**把外部上身接管 *进策略训练分布*，让下肢策略「**任何上身姿态下都稳得住**」。最终一个 policy 端到端覆盖：

- 4 种步态：walking / standing / jumping / hopping（前 3 种共用同一策略）；
- 8 个连续命令：$v_x, v_y, \omega_z, f, l, h, p, w$（速度、步频、抬脚高度、身高、俯仰、腰偏航）；
- 任意外部上身接管，包括遥操、IK、关节轨迹回放。

---

## 🔧 方法详解

### 1. 命令空间 $\mathcal{C} = \mathcal{K} \times \mathcal{B}$

**任务命令 $\mathcal{K}$**：目标速度 $v_t = (v _ {t,x}, v _ {t,y}, \omega_t)$，决定"想去哪儿"。

**行为命令 $\mathcal{B}$**：

$$
b_t = [\underbrace{f_t, l_t}_{\text{foot}}, \underbrace{h_t, p_t, w_t}_{\text{posture}}, \underbrace{\psi_t, \phi_{t,1}, \phi_{t,2}, \phi_{t,\text{stance}}}_{\text{gait}}]
$$

- **foot 行为**：步频 $f_t$、最大抬脚高度 $l_t$；
- **posture 行为**：身高 $h_t$、俯仰 $p_t$、腰偏航 $w_t$；
- **gait 行为**：两脚相位 $\phi _ {t,1}, \phi _ {t,2}$、相位偏移 $\psi_t$、支撑占比 $\phi _ {t,\text{stance}}$。

通过仅调 $\psi$ 与 $\phi_i$ 就能切换四种标准步态（walking $\psi=0.5$；jumping $\psi=0$；standing $\phi_i=0.25$；hopping 一脚 $\phi_i=0.75$ 飞，另一脚正常踩）。

### 2. 期望接地概率 $C(\phi_i)$ — 把"何时落脚"变成可微目标

$$
C(\phi_{t,i}) = \Phi(\bar\phi/\sigma)\,[1-\Phi((\bar\phi-0.5)/\sigma)] + \Phi((\bar\phi-1)/\sigma)\,[1-\Phi((\bar\phi-1.5)/\sigma)]
$$

把"硬切换 stance↔swing"用正态 CDF 平滑成"在 $\pm 3\sigma$ 内连续过渡"，让脚下接触不再瞬变，落脚更稳。$C(\phi_i)\in[0,1]$ 直接进入 reward 加权 swing-tracking / contact-tracking，避免硬约束 + 离散接触在 RL 早期把奖励搞崩。

### 3. 训练框架：AAC + 干预训练 + 对称损失

#### ① 非对称 Actor-Critic（AAC）

- **Critic 观测 $o^V_t$**：本体感觉 $o^{\text{pro}}_t$ + 特权 $o^{\text{pri}}_t$（线速度、足离地高、地面摩擦、足触力、链接碰撞）+ 地形高度采样 $o^{\text{ter}}_t$（221 维）+ 命令 + 指示位 $I(t)$；
- **Actor 观测 $o^\pi_t$**：仅本体感觉历史 $o^{\text{his}}_t$（堆叠 $k$ 步）+ 命令 + $I(t)$；
- **Loss**：$\mathcal{L}^{\text{AAC}} = \mathcal{L}^{\text{value}} + \lambda^{\text{policy}}\mathcal{L}^{\text{policy}} + \lambda^{\text{est}}\mathcal{L}^{\text{est}}$，其中 $\mathcal{L}^{\text{est}}$ 让 actor 的 encoder 从历史里估出特权量（线速度、身高、足离地高）。

#### ② Intervention Training（关键）

随机在训练中**强制把上身关节"夺权"成外部预设轨迹**（采样自人体动作库 / 随机姿态），对应指示位 $I(t)=1$。这样下肢策略**从一开始就见过"上身被接管"的分布**，部署时无论是 VR 遥操还是 IL 输出上身关节角，都不会让下肢策略失稳。

#### ③ 对称损失（Symmetry Loss）

把每条转移 $(s_t, a_t)$ 沿 x-z 平面镜像，约束策略输出与价值满足左右对称：

$$
\mathcal{L}^{\text{actor}}_{\text{sym}} = \mathrm{MSE}(a_t, a'_t),\quad \mathcal{L}^{\text{critic}}_{\text{sym}} = \mathrm{MSE}(V_t, V'_t)
$$

等价于 2× 数据增强，大幅缓解"右脚单脚跳得稳、左脚一跳就摔"这类左右不平衡。

### 4. 奖励三件套

| 类型 | 关键项 | 作用 |
|------|------|------|
| **Task** | 线速度跟踪、角速度跟踪 | 跟随用户命令 |
| **Behavior** | 身高、俯仰、腰偏航、抬脚高度、Contact-Swing | 把可调参数全部落到奖励上，是"versatile"的来源 |
| **Regularization** | 角速度俯仰、垂直运动、滑步、动作率/平滑、关节扭矩/加速度、上身关节偏离 nominal | 抑制抖动 + 抑制怪异姿态 |

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph CMD["📡 通用命令空间 C = K × B"]
        K1["任务命令 K<br/>v_x, v_y, ω_z"]
        B1["foot：f（步频）<br/>l（抬脚高）"]
        B2["posture：h（身高）<br/>p（俯仰）, w（腰偏航）"]
        B3["gait：ψ, φ_1, φ_2, φ_stance<br/>→ walk/stand/jump/hop"]
    end

    subgraph CON["🧮 接地概率平滑 C(φ_i)"]
        CON1["正态 CDF 平滑切换<br/>stance ↔ swing"]
    end

    subgraph TRAIN["🎓 训练框架（Isaac Gym 仿真）"]
        T1["AAC：Critic 拿特权<br/>Actor 只看 proprio 历史"]
        T2["Intervention Training<br/>I(t)=1 时上身被外部夺权"]
        T3["对称损失 L_sym<br/>左右镜像增强"]
        T4["奖励三件套：<br/>Task + Behavior + Regularization"]
        T1 --> T4
        T2 --> T4
        T3 --> T4
    end

    subgraph DEPLOY["🤖 真机部署（Unitree H1）"]
        D1["π_HugWBC<br/>50 Hz，输出全身关节目标"]
        D2{"I(t) = ?"}
        D3["默认：上身策略自摆"]
        D4["接管：外部上身控制器<br/>(VR / IK / IL / Diffusion)"]
        D2 -->|0| D3
        D2 -->|1| D4
    end

    CMD --> CON
    CON --> TRAIN
    TRAIN -->|sim-to-real| D1
    D1 --> D2

    style CMD fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style CON fill:#f4ecf7,stroke:#8e44ad,color:#3b1d4d
    style TRAIN fill:#fdebd0,stroke:#e67e22,color:#5a3010
    style DEPLOY fill:#e8f8e8,stroke:#27ae60,color:#0f3d1f
</div>

---

## 📊 实验亮点（节选）

- **一份策略 = 3 种步态**：walking / standing / jumping 共用同一 policy，hopping 单独一份；
- **8 维命令全部高跟踪精度**：线/角速度、步频、抬脚高、身高、俯仰、腰偏航在四种步态下都能稳定追踪；
- **干预鲁棒性**：上身被外部接管（包括 cross-arm、box-carry、外推噪声）时，下肢追踪误差几乎不退化——这是对照 ExBody / OmniH2O / Decoupled Lower-Body Tracking 的关键卖点；
- **Sim2Sim / Sim2Real**：在 unitree_mujoco 与真机 H1 上零额外微调即可部署；
- **代码已开源**（apexrl/HugWBC、InternRobotics/HugWBC），训练入口 `legged_gym/scripts/train.py --task=h1int`，可视化 `play.py --task=h1int`。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|------|------|
| **WBC 工程化** | 把"步态 + 风格 + 姿态"全部参数化进命令空间，相当于把 humanoid 的下肢底座做成"驱动级 API" |
| **遥操作友好** | Intervention Training 是非常实用的工程范式：让任意上层（HOMIE / OmniH2O / iDP3 / VLA）能直接接入而无需重训下肢 |
| **训练范式** | 对称损失 + AAC + 特权估计已经是新一代 humanoid locomotion 的"标配三板斧"，HugWBC 把它整合到一个清楚的工程基线里 |
| **Benchmark 价值** | 由于代码开源、平台为 Unitree H1，是后续工作的天然 baseline，可与 HOVER / ExBody2 / SONIC 直接对比 |

---

## 🎤 面试参考

**Q：HugWBC 和 HOVER 同样追求"统一控制"，差别在哪？**  
A：HOVER 把若干**已训好的专家策略**用 mask + 蒸馏统一到一个学生网络里，命令是「目标模态选择」；HugWBC 直接在原始 RL 训练里设计**连续可调命令空间**（步频、身高、俯仰……），强调"一份策略响应多维连续行为参数"。两者正交：HOVER 偏 *control surface* 的统一，HugWBC 偏 *behavior parameter* 的统一。

**Q：为什么 Intervention Training 比"直接固定上身关节训练"更好？**  
A：直接固定上身等价于策略只见过一种上身分布；真实部署时遥操作上身关节角是动态变化的，分布外。Intervention Training 把外部上身轨迹**在训练时就当作随机扰动注入**，下肢策略学到"任何上身姿态下都要稳"，是 HOMIE / OmniH2O / iDP3 等下游遥操和 IL 框架的友好底座。

**Q：四种步态为什么 3 个能共用同一策略，hopping 要单独训？**  
A：walking / standing / jumping 在动力学上有连续 morphism（只是 $\psi$、$\phi _ {\text{stance}}$ 变化）；hopping 的一脚常态"飞行"导致动量与接触序列高度不对称，与其他三种步态在状态分布与奖励配比上偏差太大，论文实测放在一份策略里会拖累 walking 跟踪精度，故单训。

**Q：对称损失在 humanoid 上的副作用？**  
A：对**严格对称步态（走、跳、立）**几乎只有增益；对**非对称步态（hopping、单脚动作）**需要把对称镜像在该模式下关掉，否则会逼策略左右一致，反而压制单脚跳的天然不对称。论文里 hopping 专策略就是这个工程权衡的体现。

**Q：HugWBC 跑分布外命令（比如比训练上限更高的步频）会怎样？**  
A：会先变形再失稳——论文 Sec. V 的分析显示，**步频 / 抬脚高度 / 速度三者之间存在隐式耦合上限**（人腿物理极限），超过后跟踪误差非线性放大。这个分析对工程上**给上层规划器画 safe envelope** 非常有用。

---

## 🔗 相关阅读

- [HOVER (2410.21229)](https://arxiv.org/abs/2410.21229)：用 mask + 蒸馏统一控制接口（H2，本系列已完成笔记）
- [ExBody / ExBody2 (2402.16796 / 2412.13196)](https://arxiv.org/abs/2412.13196)：表达性 WBC 系列
- [Decoupled Lower-Body Tracking (Lu et al. 2024)](https://arxiv.org/abs/2403.04436)：HugWBC 直接对照的 *分离上下身* 路线
- [OmniH2O (2406.08858)](https://arxiv.org/abs/2406.08858) / [HOMIE (2502.13013)](https://arxiv.org/abs/2502.13013)：天然搭配的上身遥操作/模仿框架
- [apexrl/HugWBC](https://github.com/apexrl/HugWBC) / [InternRobotics/HugWBC](https://github.com/InternRobotics/HugWBC)：训练 + Sim2Sim + Sim2Real 完整代码

---

## 📎 附录：与该笔记并行的"高影响力精选"笔记

| 类别 | 已完成 | 待补 |
|------|------|------|
| 全身控制核心 | ExBody / ExBody2 / HOVER / **HugWBC（本文）** | SONIC / UH-1 |
| 遥操作与模仿学习 | OmniH2O / HOMIE | HumanPlus / EgoMimic / iDP3 |
| 仿真平台与工具 | ProtoMotions3 / Isaac Lab / Humanoid-Gym / BEHAVIOR Robot Suite | （基本完成） |
