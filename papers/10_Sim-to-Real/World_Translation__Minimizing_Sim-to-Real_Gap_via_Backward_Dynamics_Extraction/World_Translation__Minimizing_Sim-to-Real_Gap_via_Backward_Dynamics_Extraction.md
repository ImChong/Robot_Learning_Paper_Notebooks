---
layout: paper
title: "World Translation: Minimizing Sim-to-Real Gap with Backward Dynamics Extraction and Unpaired Domain Translation"
zhname: "World Translation：以反向动力学提取与非配对域翻译最小化 Sim-to-Real 差距"
category: "Sim-to-Real"
arxiv: "2607.18154"
---

# World Translation: Minimizing Sim-to-Real Gap with Backward Dynamics Extraction and Unpaired Domain Translation
**不再「从历史观测正向预测下一步」，而是「从一次真实转移里反向读出那些看不见的动力学信息」，再把这段信息当成风格迁移问题、在仿真域与真实域之间做非配对翻译——从而绕开 real-to-sim 学习动力学模型时的「部分可观」难题，把仿真训练的策略更准地迁到真机。**

> 📅 总结日期: 2026-09-13
>
> 🏷️ 板块: 10 Sim-to-Real · real-to-sim · 反向动力学提取 · 非配对域翻译 · 部分可观 · 动力学建模
>
> 🔁 推进轨: 模块轮转（09_State_Estimation → **10_Sim-to-Real**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2607.18154](https://arxiv.org/abs/2607.18154) |
| HTML | [在线阅读 v1](https://arxiv.org/html/2607.18154v1) |
| PDF | [下载](https://arxiv.org/pdf/2607.18154) |
| 源码 | 截至笔记时论文未给出公开的 GitHub 仓库 / 项目主页链接；故本篇给出的是**据论文描述整理的方法流程**，而非源码调用时序图 |
| **发布时间** | 2026-07-20 (arXiv v1) |

**作者**：Xinchen Yao, Leixin Chang, Hua Chen
**机构**：浙江大学（Zhejiang University）· 逐际动力（LimX Dynamics）
**验证平台**：人形（Humanoid）/ 四足（Quadruped）/ 机械臂（Manipulator）三类系统仿真评测 + Unitree Go2 四足真机部署

---

## 🎯 一句话总结

Sim-to-Real 的一条主流路线是 **real-to-sim**：用真机数据学一个更真实的「转移动力学模型」，把仿真世界修得更像现实。但这类学习式动力学模型有个根本毛病——**部分可观（partial observability）**：同一个观测，可能因为一些**看不见的因素**（突发接触、负载晃动、外力扰动）而走向不同的下一状态。现有方法假设「这些隐藏因素能从观测历史里恢复」，可一旦历史本身没有信息（比如毫无预兆的突然撞击），假设就失效了。

World Translation 换了个角度：**仿真器虽然物理不精确，但它是确定性的；学习式模型虽然精确，但在部分可观下欠定**——两者优势正好互补。于是它**不再从历史正向预测**，而是**从一次已经观测到的转移里「反向」提取出那份看不见的动力学信息**（因为隐藏原因的效果，其实已经写在这一步的转移结果里了），再把这段特征当作一个**非配对域翻译（unpaired domain translation）**问题，在仿真域与真实域之间迁移——**保留动力学内容、只转换域风格**。跨人形/四足/机械臂三类平台的实验表明，其动力学建模比基线更准，且在「隐藏因素无法从历史恢复」时增益最大；Go2 真机部署也验证了策略迁移效果的提升。

---

## 📌 英文缩写速查

| 缩写 / 术语 | 全称 | 解释 |
|---|---|---|
| Sim-to-Real | Simulation-to-Reality | 仿真训练、真实部署 |
| Real-to-Sim | Reality-to-Simulation | 用真机数据把仿真世界修得更真实（本文所属路线） |
| Partial Observability | 部分可观 | 观测不足以确定下一状态，存在看不见的隐藏因素 |
| Forward Dynamics | 正向动力学 | 从「历史/当前 → 下一步」预测转移 |
| Backward Extraction | 反向提取 | 从「已观测到的转移结果」反推隐藏动力学信息（本文核心） |
| Unpaired Domain Translation | 非配对域翻译 | 无需成对样本，在两个域间做风格迁移（借鉴 CycleGAN 思想） |

---

## ❓ 论文要解决什么问题？

**问题陈述**：把仿真训练好的策略迁到真机，real-to-sim 是常见思路——从真机数据里学一个转移动力学模型，让仿真世界更逼近现实。但**学习式动力学模型受困于部分可观**：

- 同一观测 `o_t` + 动作 `a_t`，在真机上可能因**看不见的因素**（突发接触、负载偏移、外力）而转移到不同的 `o_{t+1}`；
- 现有方法默认「把观测历史喂进去，就能把这些隐藏因素推出来」；
- 可**当历史本身没信息时**（无预兆的突然撞击、瞬时外力），这个假设直接崩塌，动力学模型只能给出「平均化/模糊」的错误预测。

**核心问题**：

> 能不能不依赖「从历史恢复隐藏因素」，也能把真实动力学中那些看不见的部分补进仿真世界，从而更准地弥合 sim-real gap？

---

## 🔧 方法拆解：World Translation

### 关键洞察 · 隐藏原因的「效果」已经写在转移里

一次已经发生的转移 `(o_t, a_t) → o_{t+1}`，其结果**本身**就编码了那些看不见的原因（撞了、被推了、负载动了）。所以与其**正向猜**，不如**反向读**：从观测到的转移里**反向提取**出这份隐藏动力学特征。这天然避开了「历史不够用」的死结。

### 互补性 · 仿真器 vs 学习式模型

- **仿真器**：物理不完美，但**确定性**强、结构清晰；
- **学习式模型**：精确，但在**部分可观**下欠定、易模糊。

World Translation 让两者互补：用仿真器提供确定性骨架，用反向提取补上真实世界的隐藏动力学。

### 域翻译 · 保留内容、迁移风格

把反向提取出的动力学特征，视作一个**非配对域翻译**问题——在**仿真域**与**真实域**之间迁移这份特征：**动力学内容（content）保持不变，只把域风格（style）从一边转到另一边**。这样就能把「真实世界特有的、看不见的动力学」翻译进仿真，或反之，让仿真训练的策略在真机上表现更稳。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph PROB["❓ 痛点：real-to-sim 的部分可观"]
        H["观测历史 o_{t-k:t}, a_t"]
        FWD["正向动力学模型<br/>预测 o_{t+1}"]
        FAIL["⚠️ 隐藏因素(突发接触/外力/负载)<br/>无法从历史恢复 → 预测模糊"]
        H --> FWD --> FAIL
    end

    subgraph BACK["① 反向动力学提取"]
        TR["已观测到的一步转移<br/>(o_t, a_t) → o_{t+1}"]
        Z["反向读出隐藏动力学特征 z<br/>(隐藏原因的效果已写在转移结果里)"]
        TR --> Z
    end

    subgraph TRANS["② 非配对域翻译"]
        SIM["仿真域<br/>确定性、物理不完美"]
        REAL["真实域<br/>精确、含隐藏动力学"]
        TL["保留动力学内容 / 迁移域风格<br/>(unpaired translation)"]
        Z --> TL
        SIM <--> TL
        REAL <--> TL
    end

    subgraph OUT["🤖 结果：更准的动力学 → 更好的策略迁移"]
        WORLD["修正后的仿真世界<br/>补上真实隐藏动力学"]
        POL["仿真训练策略 π"]
        DEP["零/少样本迁移<br/>Go2 真机部署改善"]
        TL --> WORLD --> POL --> DEP
    end

    FAIL -. 换个角度 .-> TR

    style PROB fill:#fdecec,stroke:#c0392b
    style BACK fill:#e8f4fd,stroke:#1f78b4
    style TRANS fill:#fff7e0,stroke:#d4a017
    style OUT fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **提出「反向动力学提取」**：不从历史正向预测，而是从已观测到的转移里反向读出看不见的动力学信息，从原理上绕开 real-to-sim 学习动力学模型的部分可观难题；
2. **把 sim-real 建模转成非配对域翻译**：将动力学特征在仿真域与真实域之间迁移，保留动力学内容、只换域风格，无需成对数据；
3. **仿真器与学习式模型的互补利用**：用仿真器的确定性 + 学习模型的精确性，各补其短；
4. **跨形态实证**：在人形 / 四足 / 机械臂三类平台上动力学建模优于基线，**隐藏因素越难从历史恢复、增益越大**；Unitree Go2 真机部署验证策略迁移改善。

---

## 📊 关键设定与结果

| 维度 | 值 |
|---|---|
| 所属路线 | real-to-sim（从真实侧缩小 sim-real gap） |
| 核心机制 | 反向动力学提取 + 非配对域翻译 |
| 针对痛点 | 学习式动力学模型的部分可观（隐藏因素无法从历史恢复） |
| 评测平台 | 人形 / 四足 / 机械臂 三类系统 |
| 真机验证 | Unitree Go2 四足，策略迁移效果提升 |
| 主要结论 | 动力学建模较基线更准；隐藏因素越无法从历史恢复，优势越明显 |

> 📌 各平台的精确数值、消融与翻译网络细节请以 arXiv v1 PDF 实验章节为准。

---

## 🤖 对 Sim-to-Real 领域的意义

| 方向 | 含义 |
|---|---|
| **重构 real-to-sim 的建模范式** | 从「正向预测 + 靠历史恢复隐藏因素」转向「反向提取 + 域翻译」，直击部分可观这一长期痛点 |
| **借风格迁移的思路做动力学** | 把 CycleGAN 式非配对翻译引入动力学建模，动力学内容与域风格解耦 |
| **与「辨识/随机化」互补** | 不同于 [SPI-Active](../SPI-Active__Sampling-Based_System_Identification_with_Active_Exploration/SPI-Active__Sampling-Based_System_Identification_with_Active_Exploration.md) 的参数辨识、[PolySim](../PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato/PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato.md) 的多仿真随机化，本文从「学习式世界模型」侧改进 |
| **跨本体通用** | 人形/四足/机械臂同一套方法，泛化性好 |

---

## 🎤 面试参考

**Q：real-to-sim 里的「部分可观」到底难在哪？**
A：难在**同因不同果**：同样的观测和动作，真机上会因为一些传感器没测到的因素（突然撞了一下、负载晃了、被外力推了）走向不同的下一状态。学习式动力学模型只能看到观测，于是被迫把这些分叉「平均」成一个模糊预测。现有方法寄希望于「把历史喂进去就能把隐藏因素推出来」，但当撞击毫无预兆、历史里根本没线索时，这条路就断了。

**Q：World Translation 的「反向提取」为什么能绕开这个难题？**
A：关键洞察是——**隐藏原因的效果，已经写在这一步的转移结果里了**。撞没撞、被没被推，看 `o_{t+1}` 相对 `o_t` 的变化就知道。所以与其正向去「猜」隐藏因素，不如反向从已发生的转移里「读」出来。这份信息不依赖历史是否有预兆，天然避开了部分可观。

**Q：为什么把它做成「非配对域翻译」而不是直接监督学一个模型？**
A：因为仿真和真实**没有成对样本**（你没法让真机和仿真在完全相同的隐藏状态下各走一步）。非配对翻译（CycleGAN 思路）正好适配：只需两个域各自的分布，就能学到「保留动力学内容、只换域风格」的映射，把真实世界特有的隐藏动力学翻译进仿真。

**Q：它和参数辨识（SysID）、域随机化是什么关系？**
A：三者都在弥合 sim-real gap，但切入点不同。域随机化「盖住」gap（练得鲁棒但保守）；参数辨识「量准」gap（估物理参数）；World Translation 属于**学习式世界模型**一支，用数据把仿真世界「修真」，且专门解决世界模型里的部分可观。它们可以互补叠加。

---

## 🔗 相关阅读

- [Sampling-Based System Identification with Active Exploration (SPI-Active, 2505.14266)](../SPI-Active__Sampling-Based_System_Identification_with_Active_Exploration/SPI-Active__Sampling-Based_System_Identification_with_Active_Exploration.md)：辨识优先路线，与本文「修真世界模型」思路对照，本仓库已有笔记
- [PolySim: Multi-Simulator Domain Randomization (2510.01708)](../PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato/PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato.md)：仿真侧随机化路线，本仓库已有笔记
- [Simulator Adaptation via Proprioceptive Distribution Matching (2604.11090)](../Simulator_Adaptation_via_Proprioceptive_Distribution_Matching/Simulator_Adaptation_via_Proprioceptive_Distribution_Matching.md)：同属「把仿真修得更像真机」的思路，本仓库已有笔记
- [Closing the Sim-to-Real Loop: Adapting Simulation Randomization with Real World Experience (1810.05687)](https://arxiv.org/abs/1810.05687)：real-to-sim 自适应随机化经典

---

> 备注：本笔记基于 arXiv 摘要与 v1 HTML 整理；**各平台精确数值、消融与网络结构细节**请以 arXiv v1 PDF 为准。截至笔记时论文未给出公开源码 / 项目主页链接，故未附源码运行时序图；若后续开源，可再补充源码调用时序。
