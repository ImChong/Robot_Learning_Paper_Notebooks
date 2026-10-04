---
layout: paper
title: "Humanoid-GPT: Scaling Data and Structure for Zero-Shot Motion Tracking"
zhname: "Humanoid-GPT：用数据与结构的规模化实现零样本动作跟踪"
category: "Teleoperation"
arxiv: "2606.03985"
---

# Humanoid-GPT: Scaling Data and Structure for Zero-Shot Motion Tracking
**把「动作跟踪」当成语言建模来做：用带因果注意力的 GPT 式 Transformer，在 20 亿帧重定向动作语料上预训练一个统一策略，直接输出各关节 PD 目标；单模型既能跟高动态动作，又能零样本泛化到没见过的动作与控制任务，为在线 MoCap 遥操作提供底座。**

> 📅 阅读日期: 2026-07-24
>
> 🏷️ 板块: 07 Teleoperation · 全身动作跟踪 · GPT 式 Transformer · 因果注意力 · 数据规模化 · 零样本泛化
>
> 🔁 推进轨: 模块轮转（06_Manipulation → 07_Teleoperation）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 6 月（arXiv）· CVPR 2026 |
| arXiv | [2606.03985](https://arxiv.org/abs/2606.03985) · [PDF](https://arxiv.org/pdf/2606.03985) · [HTML](https://arxiv.org/html/2606.03985v1) |
| 项目页 | [qizekun.github.io/Humanoid-GPT](https://qizekun.github.io/Humanoid-GPT/) |
| 源码 | 🌟 [GalaxyGeneralRobotics/Humanoid-GPT](https://github.com/GalaxyGeneralRobotics/Humanoid-GPT)（已放出推理/部署代码 + 预训练权重；训练代码与数据暂未释出） |
| 作者 | Zekun Qi、Xuchuan Chen、Dairu Liu、Chenghuai Lin、Yunrui Lian、Sikai Liang、Zhikai Zhang、Yu Guan、Jilong Wang、Wenyao Zhang、Xinqiang Yu、He Wang、Li Yi 等 |
| 主题 | cs.RO · cs.AI · cs.CV / 全身动作跟踪 · 规模化 · 零样本泛化 |

> 来源：Teleoperation 模块最新发表且尚无笔记的论文（模块轮转到 07）。跟踪器可作为在线 MoCap 重定向遥操作的底层控制器。

---

## 🎯 一句话总结

> **Humanoid-GPT** 把人形全身**动作跟踪**重新表述为**类 GPT 的序列建模**问题：以**因果注意力 Transformer**（12 层、历史 32 帧）为骨干，输入拼接**本体感受状态 + 参考姿态**的 token，逐时刻**自回归**输出**各关节 PD 目标**。它的两大规模化来源是——**数据**：一套统一到 Unitree-G1 29 自由度关节空间的 **20 亿帧重定向语料**（融合 AMASS / LAFAN1 / Motion-X++ / PHUMA / MotionMillion 与自采数据，配合时间弯曲增广约 5×）；**结构**：用**Harmonic Motion Embedding (HME)** 把语料聚成约 300 个动作簇做多样性均衡采样，先训**~384 个 RL 专家**，再用 **DAgger 蒸馏**压成单一通才。相比只有约 720 万帧、用浅层 MLP 的旧跟踪器，它**同时打破「敏捷 vs 泛化」的取舍**：仿真成功率 92.58%（对比 88.27%）、MPKPE 40.99mm；实机 Unitree-G1 上零样本跟未见舞蹈动作，且 RTX 4090 上端到端推理 <1.5ms、控制 50Hz。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| GPT | Generative Pre-trained Transformer，生成式预训练 Transformer（此处用其「因果注意力 + 自回归」范式做动作跟踪） |
| Causal Attention | 因果注意力，只看历史不看未来，保证可在线部署 |
| PD Target | 关节位置-微分控制的目标角度（策略输出），再由 PD 控制器换算力矩 |
| DoF | Degree of Freedom，自由度（G1 为 29 DoF） |
| HME | Harmonic Motion Embedding，谐波动作嵌入（用周期自编码器抽关节谐波特征做聚类） |
| DAgger | Dataset Aggregation，数据聚合式模仿学习（专家在线纠偏 → 蒸馏进学生） |
| MPJPE / MPKPE | 平均关节/关键点位置误差，跟踪精度指标 |
| Zero-Shot | 零样本，未在训练分布内出现的动作/任务也能直接跟 |

---

## ❓ 论文要解决什么问题？

现有全身动作跟踪器存在一个**根本性取舍**：

- **擅长敏捷动作**的跟踪器往往**泛化差**，遇到没见过的动作就崩；
- **泛化好**的跟踪器又**跟不动复杂高动态动作**；
- 主流做法是**浅层 MLP** + **约 720 万帧**的小数据，能力与泛化都被数据规模卡住。

Humanoid-GPT 的假设是：**只要把数据与模型结构一起放大到足够规模**，动作跟踪也能像语言模型一样出现「规模效应」，用**一个生成式模型**同时拿下敏捷与零样本泛化。

---

## 🔧 方法详解

### 1. 数据规模化：20 亿帧重定向语料
- **融合主流 MoCap**（AMASS、LAFAN1、Motion-X++、PHUMA、MotionMillion）+ **大规模自采录制**；
- 统一**重定向到 Unitree-G1 的 29 DoF 关节空间**，并**滤除含物体交互**（坐、游泳、上下楼等）的片段，得到干净、物理自洽、多样的数据；
- **时间弯曲（time-warping）增广**把数据量再扩约 **5×**。

### 2. 结构规模化：HME 聚类 + 专家 + 蒸馏
- **Harmonic Motion Embedding (HME)**：用**周期自编码器**抽各关节谐波特征，把语料聚成约 **300 个动作簇**（每簇 1k–2k 序列），用于**多样性均衡采样**；
- **阶段一（RL 专家）**：在各簇上用 **PPO** 训专家，关键点级奖励（位置/旋转/速度 + 指数惩罚），32,768 并行环境、域随机化（地形/外力/物性）；
- **阶段二（DAgger 蒸馏）**：把约 **384 个专家**蒸馏进**单一通才 Transformer**——序列建模让**一次前向对多个时刻并行监督**，蒸馏高效。

### 3. 骨干与部署
- **GPT 式 Transformer**：token = 本体感受状态 ++ 参考姿态；**历史 32 帧**过 **12 层**，**因果注意力**保证在线（不看未来）；输出**各关节 PD 目标**；
- **部署**：导出 **ONNX（FP32）→ TensorRT 融合核**，RTX 4090 上端到端 **<1.5ms**、控制回路 **50Hz**；实机通过**在线 MoCap 重定向**即可做实时遥操作/跟踪。

### 4. 主要结果
- **仿真**：成功率 **92.58%**（Humanoid-GPT-L vs 88.27% 基线）、MPJPE 0.0735 rad、MPKPE **40.99mm**；Transformer 在各规模均优于 MLP/TCN；
- **实机（Unitree-G1）**：四段**未见舞蹈**零样本跟成，MPJPE 0.0825–0.1180 rad，sim-to-real 对齐良好；
- **规模律**：2M→2B token 持续提升，Transformer 高效扩展、MLP 早早饱和。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    SRC["🗂️ 多源 MoCap<br/>AMASS · LAFAN1 · Motion-X++<br/>PHUMA · MotionMillion + 自采"] --> RET
    subgraph RET["数据规模化"]
        R1["重定向到 G1 29 DoF<br/>滤除物体交互"]
        R2["时间弯曲增广 ~5×<br/>→ 20 亿帧语料"]
        R3["HME 聚类 ~300 簇<br/>多样性均衡采样"]
    end
    RET --> EXP["阶段一：PPO 训 ~384 个簇专家<br/>关键点奖励 + 域随机化"]
    EXP --> DIS["阶段二：DAgger 蒸馏成单一通才<br/>序列建模·一次前向多时刻监督"]
    DIS --> GPT
    subgraph GPT["GPT 式跟踪器"]
        G1["token = 本体状态 ++ 参考姿态"]
        G2["历史 32 帧 · 12 层 · 因果注意力"]
        G3["输出各关节 PD 目标"]
    end
    GPT --> DEP["ONNX → TensorRT<br/>&lt;1.5ms · 50Hz"]
    DEP --> ROB["🤖 Unitree-G1<br/>零样本跟未见动作 / 在线遥操作"]
    ROB --> RES["仿真成功率 92.58% · MPKPE 40.99mm<br/>实机零样本跟舞蹈"]

    style RET fill:#e8f4fd,stroke:#2980b9,color:#1a3e5c
    style GPT fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style RES fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

### ⏱️ 源码运行时序图（mermaid）

> 依据官方仓库 [GalaxyGeneralRobotics/Humanoid-GPT](https://github.com/GalaxyGeneralRobotics/Humanoid-GPT) 已放出的**推理/部署**入口整理（训练代码暂未释出，训练段以论文流程标注）。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant CV as convert_qpos2kpt.py<br/>(数据准备)
    participant INF as scripts/inference.py
    participant POL as ONNX 策略封装<br/>(tracking/)
    participant SIM as MuJoCo / MJX<br/>(utils/)
    participant DEP as deploy/play_track.py
    participant G1 as Unitree-G1<br/>(sim 或 real)
    U->>CV: 把 MoCap qpos 转成关键点表示
    CV-->>U: 生成参考动作目录（keypoint 轨迹）
    U->>INF: python scripts/inference.py --policy *.onnx --motion &lt;dir&gt;
    INF->>POL: 载入 12 层因果 Transformer（TensorRT 融合核）
    loop 每个控制步 50Hz
        INF->>POL: token = 本体状态 ++ 参考姿态（历史 32 帧）
        POL-->>INF: 输出各关节 PD 目标（29 DoF，&lt;1.5ms）
        INF->>SIM: PD 控制换算力矩 → 前推一步
        SIM-->>INF: 返回新本体状态（因果·不看未来）
    end
    INF-->>U: 批量跟踪指标（scripts/eval_parallel.py 可并行评测）
    U->>DEP: python deploy/play_track.py（部署到 G1）
    DEP->>G1: 在线 MoCap 重定向 → 实时跟踪 / 遥操作
    G1-->>U: 零样本跟未见舞蹈，sim-to-real 对齐
</div>

---

## 💡 核心贡献

1. **范式**：首个把人形全身动作跟踪当作 **GPT 式因果序列建模**、并证明其**规模效应**的工作；
2. **数据**：构建统一到 G1 29 DoF 的 **20 亿帧重定向语料**（较 AMASS log 体量 4–5×），配 HME 聚类做多样性均衡；
3. **结构**：**RL 专家 → DAgger 蒸馏**，序列建模让蒸馏可一次前向多时刻监督，把约 384 个专家压成单一通才；
4. **打破取舍**：单模型**同时**做到高动态跟踪与**零样本泛化**，实机 <1.5ms / 50Hz 可在线部署。

---

## 🤖 对人形机器人学习的启发

- **「跟踪即序列建模」**给出了通往**通用底层控制器**的可扩展路线，天然承接大规模人类动作数据；
- **因果注意力 + 短历史窗**是「可在线部署」的关键设计，值得遥操作/实时跟踪类任务借鉴；
- **专家 → 蒸馏**把「多专精」融成「一通才」，缓解单策略难以覆盖长尾动作的问题；
- 作为**在线 MoCap 重定向遥操作**的底座，可与上层 VR / 头显 / 手柄采集链路对接，把「人演示 → 机器人跟」做成端到端实时闭环。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2606.03985](https://arxiv.org/abs/2606.03985) | 论文正文（数据构建、HME、专家蒸馏、规模律、实验） |
| [项目页](https://qizekun.github.io/Humanoid-GPT/) | 演示视频、方法概览 |
| [GitHub 源码](https://github.com/GalaxyGeneralRobotics/Humanoid-GPT) | 推理/部署代码 + 预训练权重（`scripts/inference.py`、`deploy/play_track.py` 等） |

> ℹ️ 备注：本笔记依据 arXiv 摘要 / HTML 与官方仓库说明整理；**逐项数值以原文 PDF 为准**。训练代码与 2B 语料截至当前暂未释出。

---

## 🔗 相关阅读

- **同模块·全身动作跟踪 / 遥操作**：[CLOT](../CLOT__Closed-Loop_Global_Motion_Tracking_for_Whole-Body_Humanoid_Teleoperation/CLOT__Closed-Loop_Global_Motion_Tracking_for_Whole-Body_Humanoid_Teleoperation.html) · [CLONE](../CLONE__Closed-Loop_Whole-Body_Humanoid_Teleoperation_for_Long-Horizon_Tasks/CLONE__Closed-Loop_Whole-Body_Humanoid_Teleoperation_for_Long-Horizon_Tasks.html) · [TeleGate](../TeleGate__Whole-Body_Humanoid_Teleoperation_via_Gated_Expert_Selection_with_Motion_Prior/TeleGate__Whole-Body_Humanoid_Teleoperation_via_Gated_Expert_Selection_with_Motion_Prior.html)
- **序列建模做运动控制**：[Humanoid Locomotion as Next Token Prediction](../../03_High_Impact_Selection/Humanoid_Locomotion_as_Next_Token_Prediction/Humanoid_Locomotion_as_Next_Token_Prediction.html)
- **通用动作跟踪 / 全身控制底座**：[SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html) · [HOVER](../../03_High_Impact_Selection/HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html)
