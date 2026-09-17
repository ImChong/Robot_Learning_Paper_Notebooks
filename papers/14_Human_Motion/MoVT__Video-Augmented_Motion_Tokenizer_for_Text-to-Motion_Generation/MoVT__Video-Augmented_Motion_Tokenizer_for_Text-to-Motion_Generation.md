---
layout: paper
title: "MoVT: Video-Augmented Motion Tokenizer for Text-to-Motion Generation"
zhname: "MoVT：用视频增强运动分词器的文本到动作生成"
category: "Human Motion"
arxiv: "2609.14965"
---

# MoVT: Video-Augmented Motion Tokenizer for Text-to-Motion Generation
**3D 动作训练数据太少限制了文本到动作模型对开放文本的响应能力；MoVT 把离散 3D 运动 token 投影到 2D 域，用海量人体动作视频扩充码本，再抬回 3D，得到对齐的 3D/2D 双码本，喂进模态无关的掩码 Transformer 生成器——用视频里的真实动作模式补齐动作码本**

> 📅 阅读日期: 2026-09-17
>
> 🏷️ 板块: 14 Human Motion · 文本到动作生成 / 跨模态运动分词 / 视频增强码本 / 掩码 Transformer
>
> 🔁 推进轨: 模块轮转（13_Physics-Based_Animation → **14_Human_Motion**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2609.14965](https://arxiv.org/abs/2609.14965) |
| HTML | [在线阅读](https://arxiv.org/html/2609.14965v1) |
| PDF | [下载](https://arxiv.org/pdf/2609.14965) |
| 项目主页 | [x-motion.github.io/MoVT-website](https://x-motion.github.io/MoVT-website/) |
| 源码 | [github.com/X-mOtion/MoVT](https://github.com/X-mOtion/MoVT)（官方标注 **Coming soon**，暂未公开，故本笔记无源码运行时序图） |
| 作者 | Beibei Jing, Tianle Guo, Youjia Zhang, Zikai Song, Yawei Luo, Junqing Yu, Tao Guan, Wei Yang |
| 机构 | 华中科技大学（HUST）· 浙江大学 |
| 发表 | ACM Multimedia 2026（MM '26，Oral） |
| 平台 | HumanML3D / KIT-ML（评测）· MotionX++（视频增强） |
| **发布时间** | 2026-09-14（arXiv v1） |

---

## 🎯 一句话总结

文本到动作（text-to-motion）生成的最大瓶颈是**3D 动捕数据稀缺**：主流做法先用 VQ-VAE 把动作压成离散 token 码本，再用生成模型建模，但码本只见过有限的动捕动作，遇到多样、无约束的文本提示就"词穷"。MoVT 的思路是**借视频**——人体动作视频海量且覆盖丰富真实动作。它构造一个**跨模态增强运动分词器（cross-modal augmented motion tokenizer）**：把离散 3D 运动 token 通过一对前向/后向映射网络**投影到 2D 域**（类比"2D↔3D 人体姿态"的转换），在 2D 域用大规模视频**扩充码本**，再把增强后的 2D 码本**抬回 3D**，得到一套**3D 与 2D 对齐**（同一动作映射到相同 token 索引）、表达复杂动作能力更强的双码本。最后把双码本接进一个**生成式掩码 Transformer**，以**模态无关**的方式预测被 mask 的动作 token 索引——这样文本-视频对也能参与生成、增强只用文本-动作对训练的生成器。在 HumanML3D 上取得 **FID 0.032 / R-Precision@3 0.814 / Diversity 9.960** 的强结果。

---

## ❓ 要解决什么问题？

- **3D 动作数据稀缺**：动捕采集昂贵，文本-动作配对数据量远小于图文/视频数据，导致码本覆盖的动作模式有限，模型对开放、多样文本的泛化差。
- **VQ 码本"词汇量"不足**：离散分词方案的表达上限由码本决定；码本只在小规模动捕上学，复杂、真实世界动作难以被准确重建/生成。
- **视频里有动作但难直接用**：视频含丰富动作却是 2D、无 3D 标注，如何把 2D 视频动作知识"翻译"进 3D 动作码本是关键难点。

**目标**：在**不依赖更多 3D 动捕**的前提下，用现成的大规模动作视频扩充 3D 运动码本的表达能力，提升文本到动作生成的多样性与保真度。

---

## 🔧 方法核心（五阶段流水）

### ① 3D 残差 VQ-VAE 预训练
先在动捕数据上训练分层的**残差 VQ-VAE（RVQ）**，把动作序列量化成多层离散 token，得到基础的 3D 运动码本。

### ② 2D VQ-VAE + 3D↔2D 双向映射
再训练一个 2D 域的 VQ-VAE，并学一对映射网络：**前向 ℱ**（3D token → 2D）与**后向 ℛ**（2D token → 3D）。联合**重构损失 + 对齐损失**训练，约束"同一动作的 3D 与 2D 序列映射到相同的 token 索引"——这是后续跨模态互通的基础，类比 2D 与 3D 人体姿态之间的转换关系。

### ③ 用视频扩充 2D 码本
冻结已对齐的 2D 码本，另训一个**增强码本 𝒞†₂d**，在大规模视频数据集 **MotionX++** 上用重构/嵌入/承诺（commitment）损失学习，把视频里复杂的真实动作模式吸收进 2D 码本。

### ④ 把增强 2D 码本抬回 3D
通过后向网络 ℛ 把增强后的 2D 码本**抬升回 3D 域**并微调（残差层随机初始化）。注意：**只有第一层（first-level）码本由 2D 抬升得到**，从而在不新增 3D 动捕的情况下增强 3D 码本。

### ⑤ 模态无关的掩码 Transformer 生成
把对齐的 3D/2D 双码本接进**生成式掩码 Transformer**，迭代预测被 mask 的动作 token 索引。由于两域码本对齐、索引一致，**文本-视频对生成的 token 序列可以直接增强只用文本-动作对训练的生成器**，实现模态无关的联合建模。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    MOCAP["🎞️ 动捕动作数据"] --> RVQ["① 3D 残差 VQ-VAE<br/>基础 3D 码本"]
    RVQ -->|前向 ℱ| MAP["② 3D↔2D 双向映射<br/>重构 + 对齐损失<br/>同动作→同索引"]
    MAP -->|后向 ℛ| C2D["对齐的 2D 码本（冻结）"]

    VIDEO["📹 大规模动作视频<br/>MotionX++"] --> AUG["③ 视频增强码本 𝒞†₂d<br/>重构/嵌入/承诺损失"]
    C2D -. 提供对齐结构 .-> AUG
    AUG -->|后向 ℛ 抬回 3D| LIFT["④ 抬升 + 微调<br/>仅第一层码本来自 2D"]

    LIFT --> DUAL["🧩 对齐的 3D / 2D 双码本"]
    C2D --> DUAL
    TXT["📝 文本提示"] --> GEN
    DUAL --> GEN["⑤ 生成式掩码 Transformer<br/>模态无关预测 token 索引"]
    GEN --> DEC["VQ 解码器"]
    DEC --> MOT["🕺 输出 3D 动作序列"]

    style MOCAP fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style VIDEO fill:#fde2e2,stroke:#c0392b,color:#5a1a1a
    style MAP fill:#e0f7fa,stroke:#0097a7,color:#003f47
    style DUAL fill:#e6e0f7,stroke:#6a4caf,color:#2a1a4a
    style GEN fill:#e0f7fa,stroke:#0097a7,color:#003f47
    style MOT fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
</div>

---

## 📊 实验与结果

- **HumanML3D**（n=1024）：**FID = 0.032（最优）**、R-Precision Top-3 = **0.814**、MM-Distance = **2.947**、Diversity = **9.960（最优）**。
- **KIT-ML**：作为第二基准评测，同样取得有竞争力的结果。
- **对比基线**：MoMask、BAMM、MDM、MLD、CoMo、GraphMotion、MotionGPT-2、ENERGYMOGEN 等主流文本到动作方法。
- **消融**：验证跨模态增强分词器优于"朴素拼接码本""混合训练"等简单方案，证明 3D↔2D 对齐 + 视频抬升是收益来源。

> 结论：用现成动作视频扩充码本，可在**不新增 3D 动捕**的前提下同时提升生成的**保真（FID）与多样性（Diversity）**，为数据受限的文本到动作生成给出一条"借外部模态补数据"的可行路径。

---

## 💡 核心贡献

1. **跨模态增强运动分词器**：提出把离散 3D 运动 token 投影到 2D 域、用视频扩充码本再抬回 3D 的思路，用 2D 视频知识补齐 3D 动作码本表达力；
2. **3D↔2D 对齐双码本**：前向/后向映射 + 对齐损失使同一动作在两域共享 token 索引，为跨模态联合建模打通接口；
3. **模态无关的掩码生成**：双码本对齐后，文本-视频对可直接增强只用文本-动作对训练的掩码 Transformer 生成器；
4. **数据受限下的 SOTA**：在 HumanML3D / KIT-ML 上取得强结果（HumanML3D FID 0.032 / Diversity 9.960），验证"用视频补数据"的有效性（ACM MM 2026 Oral）。

---

## 🤖 对人形机器人的启示

| 方向 | 影响 |
|---|---|
| **动作数据来源** | "用海量视频补 3D 动作码本"的思路，对人形机器人动作/技能库同样受制于真机数据稀缺的场景有直接借鉴 |
| **跨模态对齐** | 把 2D 视频与 3D 动作对齐到共享离散表示，可迁移到"从人类视频学机器人可执行动作"的重定向/模仿管线 |
| **离散码本表示** | 对齐的双码本作为紧凑动作词表，便于作为上层策略的动作原语库，供下游追踪控制器解码执行 |
| **数据高效** | 在不新增昂贵动捕的前提下扩充表达力，契合机器人学习"少真机数据、多外部先验"的现实约束 |

---

## ⚠️ 局限与可改进点

- **纯运动学、无物理**：生成的是运动学动作序列，不含接触/动力学约束，直接上真机仍需下游物理追踪与稳定控制；
- **依赖 3D↔2D 对齐质量**：收益建立在双向映射对齐良好之上，映射误差会传导到抬升后的 3D 码本；
- **视频动作噪声**：MotionX++ 等视频中的 2D 动作估计本身含噪，可能把不准确模式引入码本；
- **源码尚未公开**：官方仓库标注 Coming soon，复现细节（映射网络结构、抬升微调超参）待代码/权重发布后核对。

---

## 🎤 面试参考

**Q：文本到动作生成为什么要"借视频"？**
A：3D 动捕数据稀缺，VQ 码本只见过有限动作，遇到多样文本泛化差。视频里有海量真实动作，MoVT 把 3D token 投到 2D 域、用视频扩充码本再抬回 3D，用视频补 3D 动作数据的不足。

**Q：3D↔2D 对齐是怎么做的、为什么重要？**
A：训一对前向 ℱ / 后向 ℛ 映射网络，配重构 + 对齐损失，约束同一动作的 3D 与 2D 序列映射到相同 token 索引。对齐后两域码本索引一致，文本-视频对生成的序列才能直接增强文本-动作生成器，实现模态无关建模。

**Q：为什么只有第一层码本由 2D 抬升得到？**
A：MoVT 用分层残差 VQ，第一层承载主体动作结构、最适合吸收视频带来的粗粒度真实动作模式；残差高层负责细节、随机初始化后微调，避免视频噪声污染细粒度重建。

---

## 🔗 相关阅读

- [MoGeFlow: Flowing Through Motion Codebook Geometry (2026)](../MoGeFlow__Flowing_Through_Motion_Codebook_Geometry_for_Text-to-Motion_Generation/MoGeFlow__Flowing_Through_Motion_Codebook_Geometry_for_Text-to-Motion_Generation.html) — 同为"离散运动码本"路线，关注码本几何而非跨模态增强
- [ARDY: Autoregressive Diffusion with Hybrid Representation (SIGGRAPH 2026)](../ARDY__Autoregressive_Diffusion_with_Hybrid_Representation_for_Interactive_Human_Motion/ARDY__Autoregressive_Diffusion_with_Hybrid_Representation_for_Interactive_Human_Motion.html) — 交互式文本到动作生成的对照路线
- [OmniControl: Control Any Joint at Any Time (ICLR 2024)](../OmniControl__Control_Any_Joint_at_Any_Time_for_Human_Motion_Generation/OmniControl__Control_Any_Joint_at_Any_Time_for_Human_Motion_Generation.html) — 可控文本到动作扩散代表工作
- [Go to Zero: Towards Zero-shot Motion Generation with Million-scale Data](../Go_to_Zero__Towards_Zero-shot_Motion_Generation_with_Million-scale_Data/Go_to_Zero__Towards_Zero-shot_Motion_Generation_with_Million-scale_Data.html) — 用大规模数据提升生成泛化的对照视角
- [HumanML3D](../HumanML3D/HumanML3D.html) — MoVT 主评测基准数据集

---

> 备注：本笔记基于 arXiv 摘要、HTML v1 与项目主页整理。方法命名（跨模态增强运动分词器、3D↔2D 双向映射 ℱ/ℛ、视频增强码本 𝒞†₂d、模态无关掩码 Transformer）与关键数字（HumanML3D FID 0.032 / R-Precision@3 0.814 / MM-Dist 2.947 / Diversity 9.960）以官方 PDF 为准。官方源码标注 Coming soon，暂未公开，故本笔记未附源码运行时序图；待代码发布后再行补充。
