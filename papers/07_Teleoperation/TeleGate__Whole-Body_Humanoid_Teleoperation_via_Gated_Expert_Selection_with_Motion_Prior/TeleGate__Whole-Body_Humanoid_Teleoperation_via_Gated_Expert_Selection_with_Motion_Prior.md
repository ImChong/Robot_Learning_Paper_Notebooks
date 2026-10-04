---
layout: paper
paper_order: 4
title: "TeleGate: Whole-Body Humanoid Teleoperation via Gated Expert Selection with Motion Prior"
zhname: "TeleGate：用门控专家选择 + 运动先验做全身人形遥操作"
category: "Teleoperation"
---

# TeleGate: Whole-Body Humanoid Teleoperation via Gated Expert Selection with Motion Prior
**冻结多专家 + 在线门控混合，配合 VAE 运动先验"猜未来"，让单一遥操作策略覆盖跑跳、跌倒恢复、踢球等高动态全身任务**

> 📅 阅读日期: 2026-05-20
>
> 🏷️ 板块: 07 Teleoperation · 全身控制 · 多专家门控 · 运动先验
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.09628](https://arxiv.org/abs/2602.09628) |
| HTML | [arXiv HTML v1](https://arxiv.org/html/2602.09628v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2602.09628) |
| 项目主页 | 截至当前未见公开发布 |
| **发布时间** | 2026-02-10 (arXiv) |
| 源码 | 截至当前未见公开发布 |
| 机构 | 中国科学技术大学（USTC）· AnyWit Robotics |
| 作者 | Jie Li · Bing Tang · Feng Wu · Rongyun Cao |
| 发表时间 | 2026-02（arXiv preprint v1） |
| 平台 | Unitree G1 |

---

## 🎯 一句话总结

> TeleGate 用 **「冻结多个领域专家 + 在线学一个门控网络做权重混合」** 替代传统的"多专家蒸馏成一个 student"，避免容量损失；同时用 **VAE 抽取的运动先验** 让策略在只看到当前帧参考的真实遥操作场景下也能"预判未来"，最终在 Unitree G1 上把跑步、跳跃、跌倒恢复、踢球等高动态全身动作做进同一个遥操作系统，仅用 **2.5 小时**惯性动捕数据。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| MoE | Mixture of Experts | 专家混合 |
| VAE | Variational AutoEncoder | 变分自编码器 |
| H2H | Human-to-Humanoid | 人到人形的运动传递 |
| WBC | Whole-Body Control | 全身控制 |
| IMU | Inertial Measurement Unit | 惯性测量单元 |

---

## ❓ 论文要解决什么问题？

把"人的动作"实时映射到人形机器人，并同时覆盖**走路、跑步、跳跃、跌倒恢复、踢球**等差异极大的动作，长期有两类做法，但都有硬伤：

1. **单一统一策略**（ExBody / ExBody2 一类）：训练成本可控，但要兼顾低速平滑动作和高动态跳跃，网络容量永远是瓶颈，跑步起跳等动作容易"做不出来"。
2. **多专家 + 蒸馏成单 student**（CLoT 等 generalist 思路）：可以分别训出强专家，但蒸馏到一个 student 网络时**能力衰减明显**，尤其在动力学差异大的动作之间。

另一个被忽视的细节：**真实遥操作只能拿到"当前帧"的参考运动**，看不到未来 0.5 秒会发生什么；而跳跃 / 起跳前的下蹲、跌倒恢复前的撑地都需要**提前蓄力**。统一策略和蒸馏 student 都没有显式建模这个"未来意图"。

TeleGate 想同时解决这两件事：**保住多专家能力 + 让遥操作策略学会"预判"**。

---

## 🔧 方法详解

### 1. 按动力学聚类训练多个专家（保留容量）

- 把动捕数据按**动力学相似度**自动聚成若干 domain（典型如：低速行走 / 高速跑跳 / 跌倒-起立 / 接触型踢球…）。
- 每个 domain 训练一个独立的 **专家策略**（PPO + 运动跟踪奖励），各自只擅长自己的子集，模型容量被充分利用。
- 训练完成后**专家参数全部冻结**，不再做蒸馏——这是与 generalist 路线最大的不同。

### 2. 在线门控网络做权重混合（避免蒸馏损失）

- 训练一个**轻量级 gating network**：输入是机器人当前的**本体感知** + **当前帧参考运动**，输出是对各专家的**激活权重**（softmax）。
- 推理时实时把所有专家的动作输出按门控权重做加权，得到最终关节指令。
- 由于专家本身参数不动，能力不衰减；门控网络只需学"什么时候该交给谁"，参数极少，训练快。
- 等价于一个**冻结专家 + 在线调度**的 MoE，但用于连续控制而非语言模型。

### 3. VAE 运动先验做"未来意图"补全

- 真实遥操作没有未来轨迹，但策略需要预判（蓄力 / 提腿 / 转身收尾）。
- 用 **VAE** 从离线动捕数据里学一个**轨迹潜空间**：编码器吃**历史观测**与（训练时可用的）未来片段，解码器还原未来动作；推理时只用编码器从**历史序列**采样一个潜变量 z，作为"未来意图"的隐式表示。
- 把 z 作为附加条件喂给专家 + 门控网络，整体策略就有了**anticipatory control（预测式控制）**能力。
- 这一步只在策略输入端做加法，工程改动很小，但对跳跃 / 起立类动作影响明显。

### 4. 训练与部署

- 数据：**2.5 小时**自采惯性动捕（IMU 全身套件），相比 OmniH2O / HumanPlus 的视觉姿态估计更稳定，根位姿精度更高。
- 训练范式：每个专家先单独 RL；再固定专家，训练 gating + VAE 编码器（监督式 + 蒸馏式损失混合）。
- 真机：Unitree G1 全身关节级位置指令，控制频率与既有遥操作系统一致。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph DATA["📥 离线训练数据"]
        MOCAP["🎯 IMU 全身动捕<br/>≈ 2.5 h"]
        CLUSTER["🧩 按动力学聚类<br/>→ 多个 domain"]
    end

    subgraph EXPERTS["🧠 专家策略 (冻结)"]
        E1["🏃 跑跳专家"]
        E2["🚶 走停专家"]
        E3["🛌 跌倒恢复专家"]
        E4["⚽ 接触/踢球专家"]
    end

    subgraph PRIOR["🔮 VAE 运动先验"]
        ENC["📚 历史序列<br/>编码器"]
        Z["💡 未来意图潜变量 z"]
    end

    subgraph RUNTIME["⚡ 在线遥操作"]
        REF["🎯 当前帧参考<br/>(操作员动作)"]
        STATE["🤖 机器人本体感知"]
        GATE["🚪 门控网络<br/>softmax 权重"]
        MIX["🧪 加权混合动作"]
        ACT["🦾 G1 关节指令"]
    end

    MOCAP --> CLUSTER --> E1 & E2 & E3 & E4
    MOCAP --> ENC --> Z

    REF --> GATE
    STATE --> GATE
    Z --> GATE
    Z --> E1 & E2 & E3 & E4
    GATE -->|w_i| MIX
    E1 & E2 & E3 & E4 --> MIX --> ACT

    style DATA fill:#e8f4fd,stroke:#1f78b4
    style EXPERTS fill:#fff7e0,stroke:#d4a017
    style PRIOR fill:#f3e8ff,stroke:#8e44ad
    style RUNTIME fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **冻结专家 + 在线门控**：用 MoE 思路绕开蒸馏，把多专家的能力**原样保留**到统一遥操作策略里。
2. **VAE 运动先验**：让"只能看到当前帧"的真实遥操作策略也具备**未来预判**能力，解决跳跃 / 起立类动作的"前摇缺失"。
3. **数据效率**：仅 **2.5 小时**惯性动捕就训出一个能覆盖跑跳 / 起立 / 踢球 / 操作的真机遥操作系统。
4. **真机验证**：Unitree G1 上跑出跑步、立定跳远、跌倒恢复、踢球、抓玩具入篮筐等过去多分散于不同 paper 的动作。

---

## 📊 关键数据

| 维度 | TeleGate | 既有方法 |
|---|---|---|
| 训练数据规模 | 2.5 h 惯性动捕 | 视觉/VR 动捕，需更长 |
| 专家数量 | 多专家冻结 | 单策略 / 蒸馏 student |
| 未来轨迹 | VAE 潜变量补全 | 一般无显式建模 |
| 动作覆盖 | 跑步 / 跳跃 / 跌倒恢复 / 踢球 / 操作 | 通常聚焦少数子集 |
| 平台 | Unitree G1 | — |

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **多专家统一控制** | 给出"冻结专家 + 在线门控"这条不蒸馏的替代路径，是 generalist humanoid policy 的工程友好版本 |
| **遥操作的预判能力** | VAE 运动先验把"看不到未来"的硬约束变成可学习的潜变量，对高动态动作可复用 |
| **数据效率** | 用 2.5 小时数据撑起多技能遥操作，对中小团队复现门槛友好 |
| **与全身控制器配合** | 与 HOVER / HugWBC 等通用 WBC 形成上下游：WBC 做底层，TeleGate 做上层意图选择 |

---

## 🎤 面试参考

**Q：TeleGate 与 "多专家蒸馏成 student" 路线（如 CLoT、generalist policy）的本质差别？**
A：蒸馏路线把多个专家压到一个网络里，必然有容量瓶颈和能力衰减；TeleGate 保留专家、只学一个轻量门控网络做**加权混合**，能力上限就是各专家上限的"凸组合"，几乎不衰减。代价是推理时要并行跑多个专家，工程上需要做好显存 / 并行调度。

**Q：为什么需要 VAE 运动先验？直接给策略看历史观测不行吗？**
A：历史观测能反映"过去发生了什么"，但跳跃 / 起立这类动作要求**预判未来 0.3–0.5 秒**的动作走向。VAE 编码器在训练时同时看到历史与未来，迫使潜空间学到"未来意图"；推理时只用历史就能采样到一个合理的未来潜变量，等于"用历史模式联想未来"。

**Q：门控网络怎么避免在专家之间频繁抖动？**
A：典型做法是 softmax + 温度调度，必要时叠一个时间平滑项；论文中门控输入包含本体感知，专家边界会跟随机器人当前状态自然平移，不是无依据切换。

**Q：和 ExtremControl 那种"末端 SE(3) 直接控制"路线如何取舍？**
A：ExtremControl 砍掉重定向、追求**极低延迟**，但牺牲全身表达；TeleGate 追求**全身高动态表达**，延迟未必最低，但能做跑跳 / 起立等需要全身协调的动作。两条线分别对应"反应窗 < 100 ms 的接发任务" vs "全身姿态丰富的长动作"，互补。

---

## 🔗 相关阅读

- [TeleGate arXiv](https://arxiv.org/abs/2602.09628) · [HTML](https://arxiv.org/html/2602.09628v1) · [PDF](https://arxiv.org/pdf/2602.09628)
- 同模块对照：[CLOT](../CLOT__Closed-Loop_Global_Motion_Tracking_for_Whole-Body_Humanoid_Teleoperation/CLOT__Closed-Loop_Global_Motion_Tracking_for_Whole-Body_Humanoid_Teleoperation.html)（闭环全局跟踪） · [ExtremControl](../ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control/ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control.html)（末端 SE(3) 极低延迟） · [HumanPlus](../HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans/HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans.html)（视觉影子跟随）
- 跨模块对照：高影响力精选中的 [HOVER](../../03_High_Impact_Selection/HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html) · [HugWBC](../../03_High_Impact_Selection/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller.html)（通用 WBC，可作 TeleGate 的底层）
