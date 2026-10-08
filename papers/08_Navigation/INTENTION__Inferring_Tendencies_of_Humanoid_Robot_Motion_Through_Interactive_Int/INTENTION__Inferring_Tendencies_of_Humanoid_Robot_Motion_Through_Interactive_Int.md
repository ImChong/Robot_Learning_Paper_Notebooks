---
layout: paper
paper_order: 10
title: "INTENTION: Inferring Tendencies of Humanoid Robot Motion Through Interactive Intuition and Grounded VLM"
zhname: "INTENTION：用交互直觉与具身 VLM 推断人形机器人的动作倾向"
category: "Navigation"
---

# INTENTION: Inferring Tendencies of Humanoid Robot Motion Through Interactive Intuition and Grounded VLM
**INTENTION：用交互直觉与具身 VLM 推断人形机器人的动作倾向**

> 📅 阅读日期: 2026-06-24
>
> 🏷️ 板块: Navigation · 具身 VLM · 交互直觉 / 记忆图 · 自主操作
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2508.04931](https://arxiv.org/abs/2508.04931) |
| PDF | [下载](https://arxiv.org/pdf/2508.04931) |
| IEEE Xplore | [document/11203117](https://ieeexplore.ieee.org/document/11203117/) |
| **发布时间** | 2025-08-06 (arXiv) |
| 收录 | IEEE 会议论文（IEEE-RAS Humanoids 系列） |
| 源码 / 项目页 | 截至当前未见公开发布（论文未给出 GitHub / 项目页链接） |

**机构**：意大利理工学院（IIT）—— Humanoid & Human Centered Mechatronics 方向（Nikos Tsagarakis 团队）

**作者**：Jin Wang, Weijie Wang, Boyuan Deng, Heng Zhang, Rui Dai, Nikos Tsagarakis

**任务定位**：人形机器人**自主操作 / 交互行为推断**——用 VLM 的场景推理能力，结合"交互记忆"，在没有预定义动作序列的情况下，推断出该对场景里的物体"怎么动手"。

---

## 🎯 一句话总结

INTENTION 想让机器人不再依赖**精确物理模型 + 预编排动作序列**，而是像人一样**凭直觉**与环境交互：用 **Grounded VLM** 做场景推理，用 **Memory Graph（记忆图）** 把过去任务交互沉淀成"经验"，再用 **Intuitive Perceptor（直觉感知器）** 从图像里抽取物理关系与可供性（affordance），三者合起来在**新场景**也能推断出合适的交互行为，而不需要反复给指令。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VLM | Vision-Language Model | 视觉 - 语言基础模型 |
| Grounded VLM | —— | 把 VLM 的语义输出**对齐 / 落地**到具体物体、空间与可执行行为 |
| Affordance | —— | 可供性：物体"能被怎么用"的属性（可抓、可推、可拉…） |
| Memory Graph | —— | 记忆图：以图结构存储历史交互场景与决策 |

---

## ❓ 论文要解决什么问题？

传统操作控制 / 规划路线高度依赖两样东西：

1. **精确的物理模型**——一旦实际物体的质量、摩擦、形状与模型有出入，控制就容易失败；
2. **预定义的动作序列**——在结构化环境里有效，但**换个新任务 / 新物体就难以泛化**。

而人类与环境交互时，并不会先建一个精确模型再规划，而是**凭隐式的物理理解直觉地行动**：看到杯子就知道握把手、看到抽屉就知道拉。论文把这种能力称为 **interactive intuition（交互直觉）**，目标是把它迁移到人形机器人上，让机器人在新场景里**自主推断"该怎么动手"**，而不是死记某条指令对应某串动作。

---

## 🔧 方法拆解

INTENTION 框架把"直觉交互"拆成三块协同：

### 1. Grounded VLM —— 场景语义推理底座

- 用视觉 - 语言模型对当前场景做**理解与推理**：场景里有什么物体、它们之间的关系、任务大致该往哪个方向走；
- "Grounded" 强调把 VLM 的语义判断**落地到具体物体与可执行行为**，而不是停留在纯文本描述。

### 2. Intuitive Perceptor（直觉感知器）—— 从图像抽物理关系与可供性

- 从视觉场景中提取**物理关系（physical relations）**与**可供性（affordances）**：哪个面可抓、哪条边可推、物体之间谁支撑谁；
- 这一步相当于把"人看一眼就懂的物理直觉"显式化，喂给后续决策。

### 3. Memory Graph（记忆图）—— 把历史交互沉淀成经验

- 以**图结构**记录过去任务交互中的场景与决策，模拟人对"不同任务该怎么处理"的记忆与类比；
- 遇到新场景时，可以**检索 / 类比**历史相似情形，复用过往的交互倾向，而不是从零开始。

### 三者协同

> **Grounded VLM**（理解场景要做什么）+ **Intuitive Perceptor**（看清物体能怎么用）+ **Memory Graph**（回忆过去怎么做）
> → 共同推断出在**当前新场景**下合适的交互行为，且**不依赖重复指令**。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph IN["🌍 输入"]
        SCENE["👁️ 视觉场景 (RGB)"]
        TASK["🗣️ 任务 / 目标"]
    end

    subgraph PERC["🧩 直觉感知器 Intuitive Perceptor"]
        REL["🔗 物理关系抽取"]
        AFF["🖐️ 可供性 (affordance) 提取"]
    end

    subgraph VLM["🧠 Grounded VLM"]
        REASON["🤔 场景语义推理"]
        GROUND["📍 落地到具体物体 / 行为"]
    end

    subgraph MEM["📚 记忆图 Memory Graph"]
        STORE["🗂️ 历史交互场景 + 决策"]
        RETR["🔍 相似情形检索 / 类比"]
    end

    subgraph OUT["🤖 交互行为推断"]
        INFER["🎯 推断合适的操作行为<br/>(无需重复指令)"]
        EXEC["✋ 人形机器人执行"]
    end

    SCENE --> PERC
    SCENE --> VLM
    TASK --> VLM
    REL --> GROUND
    AFF --> GROUND
    REASON --> GROUND
    GROUND --> INFER
    RETR --> INFER
    STORE --> RETR
    INFER --> EXEC
    EXEC -. 交互结果回写 .-> STORE

    style IN fill:#fff7e0,stroke:#d4a017
    style PERC fill:#e8f4fd,stroke:#1f78b4
    style VLM fill:#f3e8ff,stroke:#8e44ad
    style MEM fill:#e8f8e8,stroke:#27ae60
    style OUT fill:#fde8e8,stroke:#c0392b
</div>

---

## 💡 核心贡献

1. **提出 INTENTION 框架**：用「交互直觉」替代「精确模型 + 预定义序列」，让人形机器人在新场景里自主推断交互行为。
2. **Memory Graph**：以图结构沉淀历史交互经验，提供"类人"的任务记忆与决策类比能力。
3. **Intuitive Perceptor**：显式从视觉场景抽取物理关系与可供性，把人类的物理直觉接口化。
4. **Grounded VLM 落地**：把 VLM 的语义推理对齐到具体物体与可执行行为，打通"看懂场景 → 动手"的链路。
5. **去指令依赖**：核心卖点是**无需重复指令**即可泛化到未见场景，降低对人工编排的依赖。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 泛化性 | 借助记忆图与可供性感知，能在**新场景 / 新任务**上推断合理交互，而非依赖预定义序列 |
| 数据 / 经验复用 | Memory Graph 让历史交互可被检索复用，越用越"有经验" |
| 与传统方法对比 | 不再要求精确物理模型，对建模误差更鲁棒 |

> ⚠️ 上表为基于摘要与公开信息的结构性总结，具体实验设置、指标与数值请以论文正式版（IEEE / arXiv）为准。

---

## 🤖 对人形 / 导航领域的意义

| 方向 | 含义 |
|---|---|
| **直觉式交互范式** | 把"人凭直觉动手"建模成 VLM + 记忆 + 可供性的组合，是模型驱动控制之外的一条思路 |
| **记忆驱动决策** | Memory Graph 把"经验"显式化，为长程、多任务的人形自主操作提供可累积的知识载体 |
| **VLM 落地** | 展示了 Grounded VLM 如何从"会描述"走到"会动手"，对具身 VLA / 导航操作类工作有借鉴价值 |

---

## 🎤 面试参考

**Q：INTENTION 跟传统的 model-based 操作规划本质区别在哪？**
A：传统路线要先有精确物理模型再规划动作序列，对建模误差敏感、换任务难泛化；INTENTION 走"交互直觉"路线——用 VLM 理解场景、用可供性感知看清物体能怎么用、用记忆图复用过去经验，**不依赖精确模型也不预编排序列**，靠推断而非求解。

**Q：Memory Graph 起什么作用，和普通 replay buffer 有何不同？**
A：它以**图结构**存历史交互场景与决策，强调"相似情形的检索与类比"，更接近人类"这种东西我以前是这么处理的"的经验记忆，而不是单纯回放采样的转移样本。

**Q：为什么要单独设计 Intuitive Perceptor，而不直接让 VLM 端到端出动作？**
A：可供性与物理关系是"动手"前必须看清的几何 / 物理线索，单独抽取能让这些信息显式、可复用，并为 Grounded VLM 的落地提供结构化输入，降低端到端黑箱的不确定性。

---

## 🔗 相关阅读

- [EgoActor (2602.04515)](https://arxiv.org/abs/2602.04515)：用 VLM 把任务规划落到第一视角动作原语，本仓库已有笔记
- [NaVILA (2412.04453)](https://arxiv.org/abs/2412.04453)：足式机器人视觉 - 语言 - 动作导航
- [FocusNav (2601.12790)](https://arxiv.org/abs/2601.12790)：第一视角局部导航的空间注意力路线
- [LookOut (2508.14466)](https://arxiv.org/abs/2508.14466)：真实世界人形第一视角导航
