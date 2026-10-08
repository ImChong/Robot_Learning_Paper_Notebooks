---
layout: paper
title: "HAFO: A Force-Adaptive Control Framework for Humanoid Robots in Intense Interaction Environments"
zhname: "HAFO：面向强力交互环境的人形机器人力自适应控制框架"
category: "Loco-Manipulation and WBC"
---

# HAFO: A Force-Adaptive Control Framework for Humanoid Robots in Intense Interaction Environments
**HAFO：面向强力交互环境的人形机器人力自适应控制框架**

> 📅 阅读日期: 2026-07-31
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 力自适应 · 双智能体 RL · 弹簧-阻尼外力建模 · 残差动作 · 非对称 Actor-Critic · Sim-to-Real
>
> 🔁 推进轨: 模块轮转（14_Human_Motion → **04_Loco-Manipulation_and_WBC**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 |
| arXiv | [2511.20275](https://arxiv.org/abs/2511.20275) · [PDF](https://arxiv.org/pdf/2511.20275) · [HTML](https://arxiv.org/html/2511.20275v4)（v1 于 2025-11，修订至 2026-01 v4） |
| 项目页 | [hafo-robot.github.io](https://hafo-robot.github.io/) |
| 视频 | [YouTube 演示](https://www.youtube.com/watch?v=03fHPx5_rCA) |
| 代码 | 项目页标注「Code — Coming Soon」，截至当前尚未释出 |
| 作者 | Chenhui Dong、Haozhe Xu、Wenhao Feng、Zhipeng Wang（通讯）、Yanmin Zhou、Yifei Zhao、Bin He |
| 机构 | 同济大学 · 自主智能无人系统全国重点实验室 · 上海人工智能实验室 |
| 主题 | cs.RO · 人形全身控制 / 力自适应 loco-manipulation |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 第 70 项（PROGRESS.md 同号）。

---

## 🎯 一句话总结

> 人形机器人在真实世界里常要**顶着较大的外力**运动——手上拎着重物、被人推拉、甚至整机被绳索吊起。传统 RL 控制器在这类**强力交互（intense force interaction）**下容易失稳，或需要为每种场景单独训一套策略。HAFO 的做法是：把全身控制**拆成「下肢行走」与「上肢操作」两个智能体**耦合训练，用**弹簧-阻尼虚拟系统**显式给关键部位施加可调外力扰动，让 Critic 拿到「特权外力信息」去指导 Actor 学出对外力鲁棒的策略；上肢采用**相对参考轨迹的受约束残差动作**避免双智能体对抗训练崩溃。最终**一套策略**即可覆盖负重搬运、推力冲击、绳索悬吊等多种场景，并零样本迁到 Unitree G1 / H1-2 真机。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| HAFO | 论文提出的力自适应控制框架名 |
| Dual-Agent RL | 双智能体强化学习：下肢与上肢各一策略，共享全身状态、协同训练 |
| Residual Action | 残差动作：策略输出相对参考轨迹的修正量，而非绝对关节目标 |
| Spring-Damper Model | 弹簧-阻尼模型：用虚拟弹簧+阻尼刻画外部牵拉力，可细粒度调节力大小 |
| Asymmetric Actor-Critic | 非对称 Actor-Critic：Critic 可见特权信息（真实外力），Actor 只用可观测量 |
| PPO | Proximal Policy Optimization，近端策略优化 |
| Loco-Manipulation | 移动操作，行走 + 操作一体的全身任务 |

---

## ❓ 论文要解决什么问题？

人形机器人在实际任务中经常处于**强力交互**状态：单/双手拎重物、被外力持续推挤、被绳索吊起或放下。这类场景的共同难点：

- **外力大且形式多样**：负载、冲击、牵拉方向与幅度各不相同，物理接触时会强烈干扰全身平衡；
- **单场景策略泛化差**：传统做法往往为「负重」「抗推」「悬吊」等分别训练策略，缺乏一套通用、可自适应外力的控制器；
- **上下肢耦合训练易崩**：若让上肢自由输出绝对关节目标，上肢的大幅动作会持续「对抗」下肢平衡，双智能体联合训练难以收敛。

HAFO 的目标：**用同一套策略、面向多种强力交互场景，学出会「顶住并适应外力」的全身控制**，并能零样本上真机。

---

## 🔧 方法详解

### 1. 双智能体解耦 + 协同训练
把全身控制拆成两个策略：
- **下肢策略 π^l**：以根部线/角速度指令为输入，负责在扰动下维持行走与站立平衡；
- **上肢策略 π^u**：以参考关节轨迹为指令，负责精确操作并实时适应外力。

两个智能体**都能看到全身状态**，各自只输出对应自由度的动作，从而实现协调控制而非各自为政。

### 2. 受约束残差动作空间（避免训练崩溃）
上肢**不直接学绝对关节目标 θ^target**，而是输出相对采样参考轨迹的**修正偏移 a^u**。这种「残差 + 约束」把上肢动作限制在参考轨迹附近，避免上肢大动作与下肢平衡形成恶性对抗，稳定了双智能体联合训练。

### 3. 弹簧-阻尼虚拟外力建模
外部牵拉力用一个**虚拟弹簧-阻尼系统**显式刻画：

```
m·ẍ = K_p (x_des − x) + K_d (ẋ_des − ẋ) + f_ext
```

通过**渐进调节期望位移 x_des**即可对施加的外力做「细粒度控制」，从而在训练中把负重、推挤、悬吊等外力统一成可参数化的扰动。对比实验显示：**阻尼项对稳定性至关重要**，仅靠刚度（stiffness-only）不足以稳住系统。

### 4. 非对称 Actor-Critic + 自发抗扰
采用**非对称 Actor-Critic**：Critic 可访问**特权的弹簧-阻尼外力信息**，据此引导 Actor 学到泛化、鲁棒的策略；而 Actor 只依赖可观测量，可直接部署。策略在训练中**自发地利用环境反馈生成抗扰响应**，并能根据反馈在「地面运动」与「悬空姿态」间自主切换，无需显式模式切换逻辑。

### 5. 训练与评测设置
- **算法/网络**：PPO，MLP [512, 256, 128]，clip 0.2、γ 0.99、熵系数 0.01；域随机化（摩擦、驱动增益、质量、控制延迟）+ 力幅度渐进课程；
- **仿真**：Isaac Gym 训练，MuJoCo 交叉验证；
- **平台**：主用 **Unitree G1**，并扩展到 **Unitree H1-2**（1.78 m / 70 kg）验证可扩展性；
- **三类场景**：① 手部负重（末端 10–50 N，50 N 时上肢关节跟踪误差约 0.22 rad）；② 绳索悬吊（首个可从悬吊态稳定启动的系统，跟踪误差约 0.20 rad）；③ 推力冲击（八方向持续力与 1 s 瞬时冲击）。三类均优于 upper-OL / upper-FIX 等基线，真机可完成双手各 1 kg 负载的 loco-manipulation。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph STATE["🌐 全身状态 (共享观测)"]
        S["本体感知 + 指令<br/>proprio + commands"]
    end

    subgraph AGENTS["🤝 双智能体策略"]
        PL["下肢策略 π^l<br/>(根部线/角速度指令 → 行走平衡)"]
        PU["上肢策略 π^u<br/>(参考关节轨迹 → 残差偏移 a^u)"]
    end

    subgraph FORCE["🪝 弹簧-阻尼外力"]
        F["虚拟弹簧-阻尼<br/>m·ẍ = K_p(x_des−x)+K_d(ẋ_des−ẋ)+f_ext<br/>负重 / 推力 / 悬吊 统一参数化"]
    end

    subgraph LEARN["🎓 非对称 Actor-Critic (PPO)"]
        C["Critic (特权: 真实外力)"]
        A["Actor (仅可观测量)"]
    end

    S --> PL
    S --> PU
    F -. 施加扰动 .-> PL
    F -. 施加扰动 .-> PU
    F -. 特权信息 .-> C
    C --> A
    A --> PL
    A --> PU
    PL --> OUT["🤖 同一策略覆盖多场景<br/>负重搬运 · 推力冲击 · 绳索悬吊<br/>自发抗扰 · 零样本 Sim-to-Real (G1 / H1-2)"]
    PU --> OUT

    style STATE fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style AGENTS fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style FORCE fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style LEARN fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **强力交互统一框架**：面向负重、推挤、悬吊等强外力场景，提出**单一策略**的力自适应全身控制，摆脱「一场景一策略」；
2. **双智能体解耦协同**：下肢行走与上肢操作各一策略、共享全身状态耦合训练，兼顾平衡与操作精度；
3. **弹簧-阻尼外力建模**：用虚拟弹簧-阻尼把多样外力参数化、可渐进调节，并指出**阻尼项对稳定性不可或缺**；
4. **受约束残差动作**：上肢输出相对参考轨迹的残差偏移，避免双智能体对抗导致的训练崩溃；
5. **非对称 Actor-Critic + 自发抗扰**：Critic 用特权外力引导 Actor，策略自发利用环境反馈生成抗扰响应，并自主切换地面/悬空行为，零样本迁到 G1 / H1-2 真机。

---

## 🤖 对人形机器人学习的启发

- **「把外力显式建模成可调扰动」是可复用的训练配方**：弹簧-阻尼虚拟力让负重/推挤/悬吊统一参数化，配合力幅度课程，比隐式域随机化更可控，值得推广到其他力交互任务；
- **上下肢解耦 + 残差约束**缓解了双智能体联合训练的对抗崩溃，为「操作扰动平衡」类问题提供了稳定训练的实用范式；
- **非对称 Actor-Critic 的特权信息**再次证明「Critic 看真值、Actor 看可观测」是 sim-to-real 中让策略学到鲁棒抗扰的高性价比手段；
- **单策略覆盖多场景 + 自主模式切换**：无需显式状态机即可在地面/悬空间切换，呼应 SplitAdapter、FALCON、CHIP 等「会发力/会顺应」的人形工作，是力自适应控制走向通用化的又一步。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.20275](https://arxiv.org/abs/2511.20275) | 论文正文（方法、奖励设计与实验细节） |
| [项目页 hafo-robot.github.io](https://hafo-robot.github.io/) | 概述、方法图与真机演示 |
| [YouTube 演示视频](https://www.youtube.com/watch?v=03fHPx5_rCA) | 负重 / 推力 / 悬吊等场景真机片段 |
| 代码 | 项目页标注「Coming Soon」，尚未开源 |

> ℹ️ 备注：本环境网络出口对 arXiv 有限制，PDF 正文数值以项目页 / HTML 描述为准；**逐项数值结果待代码与完整正文可访问后核对补充**。

---

## 🔗 相关阅读

- **同模块·力/负载自适应**：[SplitAdapter（负载-动力学解耦的因子化适配）](../SplitAdapter__Load-Aware_Humanoid_Loco-Manipulation_via_Factorized_Adaptation/SplitAdapter__Load-Aware_Humanoid_Loco-Manipulation_via_Factorized_Adaptation.html) · [Kinematics-Aware 多策略力可控 loco-manip](../Kinematics-Aware_Multi-Policy_RL_for_Force-Capable_Humanoid_Loco-Manipulation/Kinematics-Aware_Multi-Policy_RL_for_Force-Capable_Humanoid_Loco-Manipulation.html) · [FALCON: Force-Adaptive Humanoid Loco-Manipulation](https://arxiv.org/abs/2505.06776)；
- **柔顺 / 顺应接触**：[CHIP（Hindsight Perturbation 自适应柔顺）](../CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation.html) · [GentleHumanoid（上肢柔顺）](../GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object/GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object.html)；
- **上下肢解耦 / 残差策略**：基于参考轨迹的残差学习与非对称 Actor-Critic 是本文可迁移的两个组件，在动作跟踪、抗扰站立等任务中均可借用。
