---
layout: paper
paper_order: 3
title: "Semantic Co-Speech Gesture Synthesis and Real-Time Control for Humanoid Robots"
zhname: "面向人形机器人的语义化伴语手势合成与实时控制"
category: "全身控制"
---

# Semantic Co-Speech Gesture Synthesis and Real-Time Control for Humanoid Robots
**面向人形机器人的语义化伴语手势合成与实时控制**

> 📅 阅读日期: 2026-05-19
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 伴语手势 · 语义对齐 · 文本/语音驱动 · 实时控制
>
> 🔁 推进轨: 模块轮转（14_Human_Motion → **04_Loco-Manipulation_and_WBC**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2512.17183](https://arxiv.org/abs/2512.17183) |
| HTML | [arXiv HTML](https://arxiv.org/html/2512.17183v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2512.17183) |
| 项目主页 | 暂未公开 |
| **发布时间** | 2025-12-19 (arXiv) |
| 源码 | 截至当前未见公开发布 |
| 相关源码（GMR 重定向） | [YanjieZe/GMR](https://github.com/YanjieZe/GMR)（论文采用的 General Motion Retargeting，ICRA 2026） |
| 第一作者 | Gang Zhang 等 |
| 机构 | 中国移动杭州研发中心（China Mobile, Hangzhou） |
| 提交日期 | 2025-12-19 |
| 评测平台 | Unitree G1 真机 + 仿真 |

---

## 🎯 一句话总结

> 论文把"机器人讲话的同时做出语义对齐的手势"这件事拆成 **语义检索 + 自回归生成 + 人到机重定向 + 全身跟踪** 四段流水线：用 **LLM** 从语料库里检索与语义高度相关的人体手势片段、用 **Motion-GPT** 自回归补全长时间序列、用 **General Motion Retargeting (GMR)** 把人体动作迁到 Unitree G1 上，最后用强化学习训出的 **MotionTracker** 把这套带有语义的参考动作在真机上稳定、实时地跟出来。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| Co-Speech Gesture | 伴语手势 | 与说话内容同步、起强调/示意作用的肢体动作 |
| LLM | Large Language Model | 大语言模型，用于理解语义并指挥手势检索 |
| Motion-GPT | — | 把动作当 token 自回归预测的 GPT 风格运动模型 |
| GMR | General Motion Retargeting | 通用人体→人形机器人动作重定向 |
| WBC | Whole-Body Control | 全身控制 |
| MotionTracker | — | 本文的高保真模仿学习跟踪策略 |
| SMPL | Skinned Multi-Person Linear | 标准化的人体参数化模型，常作动捕中间表示 |

---

## ❓ 论文要解决什么问题？

人形机器人要做"会说话也会比划"的服务/讲解员，伴语手势是关键一环。但要在真机上跑通，前人方案几乎每一段都掉链子：

1. **语义对齐弱**：纯节奏驱动的 co-speech gesture 模型只能"踩点"，没法把"指自己 / 比 OK / 数 1-2-3"这种语义性强的手势对到关键词上。
2. **生成的是悬空的人体动作**：MDM / Motion-GPT 等模型输出的是 SMPL 参数序列，没人形约束，直接喂给真机要么自碰撞、要么脚滑、要么关节越界。
3. **缺乏可执行的物理层**：即使重定向对了，也还需要一个**鲁棒的全身跟踪策略**把参考关节轨迹转成关节力矩，并在意外扰动下保持平衡。
4. **实时性**：从语音/文本到关节命令必须低延迟，不然手势永远滞后于讲话。

论文目标：把这一整条"**语音 → 语义手势 → 人形参考 → 真机执行**"链路端到端跑通，并强调每段在 G1 上的实测可行性。

---

## 🔧 方法拆解

### 整体流水线（四段）

<div class="mermaid">
flowchart TB
    subgraph IN["输入层"]
        SP["语音 / 文本输入<br/>(讲话内容)"]
    end

    subgraph SEM["1. 语义化手势合成（高层）"]
        LLM["LLM<br/>语义解析 + 关键词抽取"]
        DB[("人体手势<br/>语义索引库<br/>(SMPL 片段)")]
        RET["生成式检索<br/>(retrieval-augmented)"]
        MGPT["Motion-GPT<br/>自回归补全 / 衔接<br/>(动作 token 预测)"]
        REF["语义对齐的<br/>SMPL 参考序列"]

        SP --> LLM
        LLM -->|关键词/语义槽| RET
        DB --> RET
        RET -->|候选片段| MGPT
        LLM -->|上下文条件| MGPT
        MGPT --> REF
    end

    subgraph RTG["2. 人到机重定向"]
        GMR["GMR (General Motion Retargeting)<br/>· 双人形骨骼映射<br/>· 足滑 / 自碰撞 / 越界约束<br/>· 实时 CPU 重定向"]
        ROBOT_REF["G1 关节参考轨迹"]

        REF --> GMR --> ROBOT_REF
    end

    subgraph TRK["3. MotionTracker 全身跟踪（低层）"]
        OBS["观测<br/>本体感知 + 参考动作"]
        POL["PPO 训练的<br/>模仿学习策略<br/>(高保真姿态跟踪 + 平衡)"]
        ACT["关节力矩 / 目标位置"]

        ROBOT_REF --> OBS
        OBS --> POL --> ACT
    end

    subgraph OUT["4. 真机部署"]
        G1["Unitree G1<br/>(29 DoF)"]
        DEMO["语义对齐 + 节奏一致<br/>的伴语手势"]

        ACT --> G1 --> DEMO
        SP -.同步播放.-> G1
    end

    style SEM fill:#fff5e6
    style RTG fill:#e6f4ff
    style TRK fill:#eaffea
    style OUT fill:#fff0f5
</div>

### 1. 高层：LLM 检索 + Motion-GPT 生成

- **LLM 解析**：把输入语句送进 LLM，抽出语义关键词与情绪槽（例如 "indicate self / count three / negate / shrug"），并给出与每个关键词对应的目标手势类别。
- **生成式检索**：基于关键词在预构建的**人体手势语义索引库**中检索若干候选片段，作为 Motion-GPT 的提示性 prompt（retrieval-augmented motion generation）。
- **Motion-GPT 自回归生成**：把检索回来的候选片段作为条件，自回归预测下一段动作 token，使得最终输出在**语义关键点**对齐到关键词、在**非关键点**保持自然过渡，整体节奏与语音对齐。

> 这一段直接借鉴了文本-动作领域的 Motion-GPT 范式，但通过 LLM 把"句子语义 → 手势类别"显式拆出来，避免了纯端到端 text-to-motion 模型"语义对齐稀疏"的老毛病。

### 2. 重定向：GMR 把 SMPL 序列搬到 G1

- 上层输出的是 SMPL 参数化人体动作，**关节数、骨长、关节限制都和真机对不上**。
- 论文选用 **GMR**（ICRA 2026）作为重定向引擎，它在源动作缩放、足滑、自碰撞、地面穿透上均有显著改善，且可在 CPU 上实时运行。
- 重定向后得到 **Unitree G1 的关节参考轨迹**，作为低层策略的跟踪目标。

### 3. 低层：MotionTracker 跟踪 + 真机执行

- **结构**：本体感知（关节位置/速度、IMU、躯干姿态）+ 当前参考动作窗口 → MLP/Transformer 策略 → 关节目标位置（PD 控制）。
- **训练**：在仿真中用 PPO + 大量域随机化训练，目标是**对任意噪声参考动作做高保真姿态跟踪并保持平衡**。
- **部署**：直接在 Unitree G1 上推理；语音播报与策略推理同步运行，实现"边讲边比划"。

---

## 💡 核心贡献

1. **首个面向真机部署的语义化 co-speech gesture 完整流水线**：把生成质量、人形约束、物理稳定性整合到一条端到端 pipeline。
2. **检索 + 自回归生成的高层结构**：用 LLM 显式抽取语义并做检索增强，缓解了纯端到端方法"踩点准但语义弱"的问题。
3. **采用通用重定向（GMR）作为中间适配层**：与高层 / 低层解耦，便于换不同人形平台。
4. **低层用 MotionTracker 做高保真模仿**：保证生成的语义手势在真机上能动态执行并维持平衡。
5. **真机验证**：在 Unitree G1 上展示了讲解、问答、报数、欢迎等多场景的伴语手势，节奏与语义对齐良好。

---

## 📊 实验亮点（按论文叙述）

- 在公开 co-speech 数据集与自采讲解场景上进行了**主观自然度 + 语义对齐**评估，本文优于纯节奏驱动 baseline。
- 真机演示包括：自我介绍、产品讲解、报数、回答否定/肯定问题等典型对话场景，手势与关键词同步。
- GMR 中间层显著降低了"动作好看 → 真机不可执行"的落地损失（足滑、自碰撞、越界率明显下降）。
- MotionTracker 在仿真中对噪声参考具有良好鲁棒性，迁移到真机时无需大幅再训练。

> 论文未公开训练代码，但所采用的 **GMR 重定向**有官方开源实现（[YanjieZe/GMR](https://github.com/YanjieZe/GMR)），可作为复现该流水线的"中间层基线"。

---

## 📖 与近期工作的关系

| 论文 | 高层（动作生成） | 中间层（重定向） | 低层（控制） | 语义对齐？ |
|---|---|---|---|---|
| TextOp（idx 31） | 自回归扩散（文本→动作） | 隐式 | RL 跟踪 | 文本→动作，无显式语义槽 |
| UH-1（H6） | Transformer 直接生成机器人动作 | 直接训练在机器人上 | 端到端 | 文本→动作 |
| **本文 (Co-Speech)** | **LLM 检索 + Motion-GPT** | **GMR** | **MotionTracker** | **关键词 ↔ 手势显式对齐** |
| Semantic Gesticulator（图像/动画） | 语义引导扩散 | — | — | 仅图形学，无真机 |

本文最大区别：**强调真机执行**，并把"语义对齐"做成显式可控的 prompt + 检索机制，而非完全靠扩散模型的隐式语义涌现。

---

## 🤖 工程价值

1. **服务机器人最实用的"非语言层"**：讲解员、迎宾、问答系统都需要伴语手势，本文给出了一条能在真机上跑通的工程路径。
2. **模块化设计利于复用**：高层（LLM + Motion-GPT）、中层（GMR）、低层（MotionTracker）可分别替换升级，工业落地友好。
3. **真机延迟可控**：通过 retrieval 缩短了纯生成模型的推理路径；GMR 在 CPU 上实时；MotionTracker 是单步前馈策略——三段串联仍能满足实时演讲场景。

---

## 💬 阅读备注

1. **检索 + 生成的组合**是 RAG 思路在动作生成上的自然迁移：语义化关键词决定"手势槽"，自回归生成负责"过渡 + 节奏"。
2. **GMR 是这条链路最隐形但最关键的一环**——很多语义手势在 SMPL 上看着自然，但落到 G1（双臂 7 DoF，腿无脚趾）会立刻穿透/自碰撞；没有高质量重定向层，前后两端再强也是空中楼阁。
3. 论文没有公开训练代码，但 GMR 已开源、Motion-GPT 范式有公开实现、低层跟踪策略亦可参考 OmniH2O / HOVER / SONIC 等同类工作，整条 pipeline 是**可复现的**。
4. 下一步看点：若要把"伴语手势"做成可商业化的服务机器人能力，关键是**手势库的丰富度 + 多语言/多文化语义槽的覆盖**，这一侧目前还高度依赖 LLM 提示工程。

---

## 🔗 参考

```bibtex
@article{zhang2025semantic_cospeech_humanoid,
  title={Semantic Co-Speech Gesture Synthesis and Real-Time Control for Humanoid Robots},
  author={Zhang, Gang and others},
  journal={arXiv preprint arXiv:2512.17183},
  year={2025}
}
```
