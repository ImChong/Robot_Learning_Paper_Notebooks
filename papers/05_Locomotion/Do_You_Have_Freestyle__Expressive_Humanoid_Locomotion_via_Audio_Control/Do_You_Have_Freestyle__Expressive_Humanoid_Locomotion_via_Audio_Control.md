---
layout: paper
title: "Do You Have Freestyle? Expressive Humanoid Locomotion via Audio Control"
zhname: "RoboPerform：音频直驱的人形即兴表达运动"
category: "Locomotion"
---

# Do You Have Freestyle? Expressive Humanoid Locomotion via Audio Control
**RoboPerform：音频直驱的人形即兴表达运动**

> 📅 阅读日期: 2026-09-03
>
> 🏷️ 板块: Locomotion · 音频驱动 · 即兴表达 · 文生动作先验 · ResMoE / ΔMoE · 扩散策略蒸馏 · Sim-to-Real
>
> 🔁 推进轨: 模块轮转（04_Loco-Manipulation_and_WBC → **05_Locomotion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2512.23650](https://arxiv.org/abs/2512.23650) |
| HTML | [在线阅读](https://arxiv.org/html/2512.23650v2) |
| PDF | [下载](https://arxiv.org/pdf/2512.23650) |
| 项目主页 | [gentlefress.github.io/RoboPerform-proj](https://gentlefress.github.io/RoboPerform-proj/) |
| 源码 | 🌟 **已开源** [gentlefress/RoboPerform](https://github.com/gentlefress/RoboPerform)（Isaac Lab v2.1.0 · 训练/评测/部署全链路） |
| **发布时间** | 2025-12-29 (v1) / 2026-01-04 (v2) |
| 收录 | **CVPR 2026 Highlight** |

**作者**：Zhe Li、Cheng Chi、Yangyang Wei、Boan Zhu、Tao Huang、Zhenguo Sun、Yibo Peng、Pengwei Wang、Zhongyuan Wang、Fangzhou Liu、Chang Xu、Shanghang Zhang

**机构**：北京智源 BAAI · 悉尼大学 · 哈尔滨工业大学 · 香港科技大学 HKUST · 上海交通大学 SJTU · 北京大学 PKU

**机器人**：Unitree **G1**（人形，板载 Jetson Orin NX）

---

## 🎯 一句话总结

人天生「听到音乐就想动」，但现有人形机器人只会跑预设动作或稀疏指令，缺少**即兴表达**能力。传统做法是「音频→生成动作→重定向到机器人」，这条级联管线误差累积、延迟高、声音与动作割裂。RoboPerform 提出**首个统一的音频→运动框架**：秉持「**运动 = 内容 + 风格**」，把音频当作**隐式风格信号**、彻底**取消显式动作重建**——内容由预训练文生动作先验提供，风格由音频调制。框架用 **ResMoE 教师策略**适配多样运动模式、**扩散学生策略**注入音频风格，做到**低延迟、高保真**，让机器人变成会随乐起舞、随话打手势的「响应式表演者」。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| RoboPerform | — | 本文方法名，音频驱动人形表演框架 |
| ResMoE / ΔMoE | Residual (Delta) Mixture of Experts | 残差式专家混合教师策略，专家只学「条件增量」 |
| DDIM | Denoising Diffusion Implicit Models | 扩散确定性采样，部署时 2 步出动作 |
| DAgger | Dataset Aggregation | 教师→学生的在线蒸馏范式 |
| InfoNCE | Info Noise-Contrastive Estimation | 对比学习损失，对齐音频与动作 latent |
| T2M | Text-to-Motion | 文生动作，提供「内容」先验（LaMP-T2M） |
| BAS | Beat Alignment Score | 节拍对齐分，衡量动作踩点程度 |
| PPO | Proximal Policy Optimization | 训练教师策略的 RL 算法 |

---

## ❓ 论文要解决什么问题？

想让人形「随音乐即兴表演」，主流路线是**两段式**：先用音频生成一段人体动作，再把动作**重定向（retarget）**到机器人上跟踪。这条路有三个硬伤：

1. **级联误差**——「生成」与「重定向」各自出错，逐级放大；重定向常需上千次迭代优化（如 PBHC）。
2. **高延迟**——显式重建动作 + 迭代重定向，无法实时响应音频。
3. **声-动割裂**——音频只在「生成动作」那一步用一下，机器人真正执行时已看不到声音，节奏容易对不上。

RoboPerform 的洞见是：**不要显式重建动作**。把「跳什么」（内容）交给已经很强的**文生动作先验**（用固定文本 prompt 如 "The person is dancing" / "The person is giving a speech"），把「怎么跳出这段音乐的味道」（风格：节奏、韵律）交给**音频隐式调制**——音频不再去还原具体关节角，而是作为**风格信号**直接注入策略，从而绕开级联、压低延迟、让声音全程在环。

---

## 🔧 方法拆解

### 1. 核心原则：运动 = 内容 + 风格

- **内容（Content）**：来自预训练文生动作模型 **LaMP-T2M**，输入**固定描述**（"正在跳舞" / "正在演讲"），产出一段与具体音频无关的「基底运动 latent」。
- **风格（Style）**：来自**音频**，编码节奏 / 韵律 / 语调，作为**隐式风格信号**调制内容，无需还原成显式动作。

### 2. 音频编码与对齐

- **音乐**：用 librosa 从 **FineDance** 数据集预抽特征。
- **语音**：借 **EMAGE** 的时序卷积网络（TCN）编码语音表征。
- **Audio Adaptor**：6 层 Transformer + 时间注意力，用 **InfoNCE** 把音频 latent 对齐到动作 latent，把运动学先验嵌进音频特征里。

### 3. 教师策略 ResMoE（ΔMoE，残差专家混合）

- 4 个专家，但**不是标准 MoE**：每个专家只负责一段「条件增量」，用残差融合
  `a = w₁·a₁ + Σᵢ₌₂⁴ wᵢ·(aᵢ − aᵢ₋₁)`，
  保证专家贡献**互不重叠、无冗余**，从而稳健适配跳舞 / 演讲等多样运动模式。
- 用 **PPO** 在仿真中训练，跟踪由文生动作先验给出的目标运动。

### 4. 学生策略：扩散 + 音频风格注入

- MLP 骨干的**扩散模型**（4 层 + 输出层），以 **DAgger** 式蒸馏教师。
- **逐层风格注入**：`oᵢ = Layerᵢ(oᵢ₋₁, l_motion) + α·l_audio`——运动 latent 给「内容」、音频 latent 调「风格」。
- 部署用 **2 步 DDIM** 采样，单步动作 **≈5.3 ms**，满足实时。

### 5. 训练与部署设置

| 组件 | 设置 |
|---|---|
| 训练仿真 | IsaacGym / Isaac Lab（MuJoCo 做零样本迁移验证） |
| 算法 | 教师 PPO · 学生 DAgger 蒸馏 |
| 控制频率 | 策略 **50 Hz** · 底层 **500 Hz** |
| 动作采样 | 30 FPS，切成 10 秒片段 |
| 数据集 | **FineDance**（7.7h 精细 3D 舞蹈 SMPL-H）· **BEAT2**（76h 语音-手势，30 说话人） |
| 机器人 | Unitree G1 + Jetson Orin NX |

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph IN["🎧 输入"]
        AUD["音频<br/>音乐 / 语音"]
        TXT["固定文本 prompt<br/>正在跳舞 / 正在演讲"]
    end

    subgraph CONTENT["📖 内容 (Content)"]
        T2M["LaMP-T2M<br/>文生动作先验<br/>→ 基底运动 latent"]
    end

    subgraph STYLE["🎼 风格 (Style)"]
        MENC["音乐: librosa<br/>语音: EMAGE-TCN"]
        ADP["Audio Adaptor<br/>6层 Transformer + InfoNCE<br/>对齐到动作 latent"]
    end

    subgraph TEACH["🧑‍🏫 ResMoE 教师 (PPO)"]
        MOE["ΔMoE 4 专家残差融合<br/>a=w₁a₁+Σwᵢ(aᵢ-aᵢ₋₁)<br/>适配多样运动模式"]
    end

    subgraph STU["🌫️ 扩散学生 (DAgger 蒸馏)"]
        DIFF["扩散 MLP<br/>oᵢ=Layerᵢ(oᵢ₋₁,l_motion)+α·l_audio<br/>2步 DDIM ≈5.3ms"]
    end

    G["🤖 Unitree G1<br/>50Hz 策略 / 500Hz PD"]

    TXT --> T2M --> MOE
    AUD --> MENC --> ADP
    MOE -->|蒸馏| DIFF
    T2M -->|content latent| DIFF
    ADP -->|style latent| DIFF
    DIFF --> G
    G -.本体反馈.-> DIFF

    style IN fill:#fff7e0,stroke:#d4a017
    style CONTENT fill:#f3e8fd,stroke:#8e44ad
    style STYLE fill:#e8f4fd,stroke:#1f78b4
    style TEACH fill:#fde8ee,stroke:#c0392b
    style STU fill:#e8f8e8,stroke:#27ae60
</div>

---

## 🖥️ 源码运行时序图（mermaid）

> 基于开源仓库 [gentlefress/RoboPerform](https://github.com/gentlefress/RoboPerform)：`whole_body_tracking` 核心库（Isaac Lab v2.1.0）+ `scripts/rsl_rl/{train,play,play_student}.py` + `deploy/`（TensorRT 导出 / MuJoCo 仿真 / 真机部署）。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户 / CLI
    participant TR as scripts/rsl_rl/train.py
    participant ENV as whole_body_tracking<br/>(Isaac Lab 环境)
    participant DATA as HuggingFace<br/>动作数据 (FineDance/BEAT2)
    participant PL as play_student.py
    participant EXP as deploy/save_TRT/<br/>save_tensorrt.py
    participant DEP as deploy_mujoco / deploy_real<br/>RoboPerform_*.py
    participant G as Unitree G1 (Orin NX)

    U->>TR: ① 训练 ResMoE 教师 (PPO)
    TR->>ENV: 载入 rl_cfg.py + 机器人/地形
    ENV->>DATA: 拉取参考动作 (文生动作先验目标)
    ENV-->>TR: 观测 / 奖励 (跟踪 + 正则)
    TR-->>TR: PPO 更新 ΔMoE 专家权重
    TR-->>U: 导出教师 checkpoint

    U->>TR: ② 蒸馏扩散学生 (DAgger)
    TR->>ENV: 教师 rollout 采数据
    TR-->>TR: 扩散 MLP 拟合 + 音频风格注入(α·l_audio)
    TR-->>U: 导出学生 checkpoint

    U->>PL: ③ play_student.py 评测/可视化
    PL->>ENV: 2步 DDIM 采样出动作
    ENV-->>PL: 成功率 / MPJPE / 节拍对齐

    U->>EXP: ④ save_tensorrt.py 导出 TRT 引擎
    EXP-->>DEP: FP16 推理引擎

    U->>DEP: ⑤ sim2sim (MuJoCo) → sim2real
    DEP->>G: 50Hz 关节目标 (音频在环)
    G-->>DEP: 本体感知反馈 (500Hz PD)
    G-->>U: 🎵 随乐起舞 / 伴语手势
</div>

---

## 💡 核心贡献

1. **首个统一音频→运动框架**：一套模型同时做**音乐驱动跳舞**与**语音驱动伴语手势**，直接从音频生成，无需按任务分别搭管线。
2. **取消显式动作重建**：把「运动 = 内容 + 风格」落地——内容用文生动作先验、风格用音频隐式调制，绕开「生成动作→重定向」的级联误差与高延迟。
3. **ResMoE 教师 + 扩散学生**：ΔMoE 残差专家适配多样运动模式、无冗余；扩散学生逐层注入音频风格，2 步 DDIM 实现 ≈5.3 ms 实时推理。
4. **retargeting-free 低延迟高保真**：相较「显式生成 + 千次迭代重定向」基线，延迟显著更低，物理可信度与音频对齐俱佳，并零样本迁移 MuJoCo。

---

## 📊 关键结果

| 指标 | 数值 |
|---|---|
| 动作跟踪成功率（IsaacGym / MuJoCo） | **93%** / **67%** |
| 平均每关节位置误差 MPJPE（IsaacGym） | **0.18 rad** |
| 平均每关键点误差 MPKPE（IsaacGym） | **0.16 m** |
| 音频-动作检索 R@1（音乐 / 语音） | **66.7%** / **64.6%** |
| 节拍对齐分 BAS（FineDance） | **0.214** |
| 单步动作推理延迟（2 步 DDIM） | **≈5.3 ms** |

> ⚠️ 具体数值以论文最终版为准；上表为结构性摘录。相较重定向基线（显式动作生成 + 1000 次迭代 PBHC 重定向），本文延迟显著更低。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **表达性运动** | 把人形从「执行任务」扩到「即兴表演」，为陪伴 / 娱乐 / 交互场景补上「随乐/随话而动」的能力 |
| **音频作为控制通道** | 音频不必先还原成动作，可直接作为**风格控制信号**，为「语音 / 音乐 / 环境声驱动运动」提供通用范式 |
| **内容-风格解耦** | 复用强大的文生动作先验作「内容库」、音频只管「风格」，降低对成对「音频-机器人动作」数据的依赖 |
| **实时部署** | 扩散策略 + 2 步 DDIM + TensorRT，证明生成式策略也能在 Orin NX 上跑到实时控制频率 |

---

## 🎤 面试参考

**Q：为什么不用「音频生成动作再重定向」这条更直接的路？**
A：那是两段式级联——「生成」和「重定向」各自有误差且逐级放大，重定向还常需上千次迭代优化，导致高延迟；更关键的是音频只在生成那一步用一下，机器人执行时已看不到声音，节奏容易对不上。RoboPerform 取消显式动作重建，让音频作为风格信号**全程在环**，绕开这些问题。

**Q：「运动 = 内容 + 风格」具体怎么落地？**
A：内容来自预训练文生动作模型（喂固定 prompt「正在跳舞/演讲」）给出与具体音频无关的基底运动 latent；风格来自音频（音乐用 librosa、语音用 EMAGE-TCN 编码，再经 6 层 Transformer + InfoNCE 对齐到动作 latent），在扩散学生里逐层以 `+α·l_audio` 注入，只调「味道」不还原关节角。

**Q：ResMoE（ΔMoE）和普通 MoE 有什么不同？**
A：普通 MoE 各专家可能功能重叠、贡献冗余。ΔMoE 让每个专家只学「条件增量」，用残差融合 `a=w₁a₁+Σwᵢ(aᵢ−aᵢ₋₁)`，专家贡献互不重叠，从而在跳舞 / 演讲等差异很大的运动模式间更稳健地切换与适配。

**Q：扩散策略这么慢，怎么做到实时？**
A：训练时是完整扩散去噪，部署时用 **2 步 DDIM** 确定性采样，把单步动作推理压到约 5.3 ms，再配 TensorRT FP16 引擎，在 Jetson Orin NX 上满足 50 Hz 策略频率。

---

## 🔗 相关阅读

- [Now You See That: Learning End-to-End Humanoid Locomotion from Raw Pixels (2602.06382)](https://arxiv.org/abs/2602.06382)：另一条「感知直驱控制」路线（视觉），与本文「音频直驱」对照
- [Semantic Co-Speech Gesture Synthesis and Real-Time Control for Humanoid Robots](https://arxiv.org/abs/2512.17183)：伴语手势主题相近，可对比「显式检索+生成」与本文「隐式风格注入」
- [BeyondMimic / 文生动作 + 扩散控制](https://arxiv.org/abs/2402.19469)：生成式先验驱动全身控制的相关范式
- [FineDance / BEAT2 数据集]：本文内容与风格监督分别取自舞蹈与语音-手势两大数据集
