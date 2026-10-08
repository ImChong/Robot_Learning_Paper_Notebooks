---
layout: paper
paper_order: 3
title: "InterPrior: Scaling Generative Control for Physics-Based Human-Object Interactions"
zhname: "InterPrior：可扩展的物理人–物交互生成式控制框架"
category: "Physics-Based Animation"
---

# InterPrior: Scaling Generative Control for Physics-Based Human-Object Interactions
**InterPrior：可扩展的物理人–物交互生成式控制框架**

> 📅 阅读日期: 2026-06-27
>
> 🏷️ 板块: 13 Physics-Based Animation · 人–物交互 / 全身控制 / 运动先验
>
> 🔁 推进轨: 模块轮转（12_Hardware_Design → **13_Physics-Based_Animation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.06035](https://arxiv.org/abs/2602.06035) |
| HTML | [在线阅读](https://arxiv.org/html/2602.06035) |
| PDF | [下载](https://arxiv.org/pdf/2602.06035) |
| 项目主页 | [sirui-xu.github.io/InterPrior](https://sirui-xu.github.io/InterPrior/) |
| **发布时间** | 2026-02-05 (arXiv) |
| 源码 | ⚠️ 截至当前未见官方代码发布；项目主页已上线（含视频 demo） |

**作者**：Sirui Xu, Samuel Schulter, Morteza Ziyadi, Xialin He, Xiaohan Fei, Yu-Xiong Wang, Liangyan Gui

**机构**：UIUC（Sirui Xu / Xialin He / Yu-Xiong Wang / Liangyan Gui）+ Amazon（Schulter / Ziyadi / Fei）。延续作者团队在 **InterMimic / InterAct** 上的人–物交互工作线。

---

## 🎯 一句话总结

> 让仿真人形**学会协调的全身人–物交互**：不显式规划"先伸手再抓再搬"，而是只给**高层意图（affordance / 目标）**，让"平衡、接触、操作"从底层的**物理先验 + 运动先验**里自然涌现；通过"专家模仿 → 扰动增广 → RL 微调"三段式把策略**扩展到训练分布之外**的新物体与新场景。

---

## ❓ 论文要解决什么问题？

物理仿真下的**全身人–物交互（whole-body HOI）**——拿起、搬运、推拉、安放物体——比单纯的运动跟踪难在：

1. **配置空间巨大**：物体形状、初始摆放、目标位姿组合爆炸，逐一采集参考动作不现实；
2. **强耦合**：全身平衡、手–物接触、物体动力学三者互相牵制，单独学某一项都会破坏其他项；
3. **泛化差**：纯模仿参考动作的控制器一旦遇到没见过的物体/初始化就容易失败、摔倒。

InterPrior 的思路：把 HOI 控制做成一个**可扩展的生成式运动先验（generative motion prior）**——用尽量少的"显式规划"，把交互能力压进一个**目标条件的变分策略**里，让它在新目标上也能自洽地产出物理可行的全身动作。

---

## 🔧 方法详解 —— 三段式管线

### 1. 模仿预训练（Imitation Pretraining）
- 先训练一个**全参考模仿专家**（full-reference expert），它能高保真复现参考 HOI 动作；
- 再把专家**蒸馏**进一个**目标条件的变分策略**（goal-conditioned variational policy）：输入是多模态观测 + **高层意图**（affordance / 稀疏目标），输出全身动作。变分结构让"同一意图、多种合理实现"得以共存。

### 2. 物理扰动增广（Data Augmentation）
- 面对巨大的配置空间，纯参考动作覆盖不足；
- 在仿真中对状态/物体施加**物理扰动**（不同初始化、摆位、力扰动），自动扩出大量"参考之外"的交互情形，提升泛化。

### 3. 强化学习微调（RL Finetuning）
- 在**未见目标与未见初始化**上用 RL 继续打磨策略，提升成功率与鲁棒性；
- 最终把技能**固化（consolidate）**成一个**通用运动先验**，可被稀疏目标条件驱动，支持多物体交互、失败后起身恢复、长程任务中切换目标。

> 直觉：阶段 1 给"会做"，阶段 2 给"见多识广"，阶段 3 给"在没见过的情况下也稳"。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph STAGE1["①模仿预训练"]
        EXP["🎯 全参考模仿专家<br/>高保真复现 HOI 参考动作"]
        VPOL["🎲 目标条件变分策略<br/>输入: 多模态观测 + 高层意图(affordance)<br/>蒸馏自专家"]
        EXP --蒸馏--> VPOL
    end

    subgraph STAGE2["②物理扰动增广"]
        AUG["🌪 仿真内物理扰动<br/>变初始化 / 变摆位 / 加力扰动<br/>覆盖参考之外的配置空间"]
    end

    subgraph STAGE3["③RL 微调"]
        RL["🏋️ 未见目标 / 未见初始化上 RL<br/>提升成功率 + 鲁棒性"]
        PRIOR["🧩 通用运动先验<br/>稀疏目标驱动 · 多物体 · 失败恢复 · 长程切换"]
        RL --固化--> PRIOR
    end

    VPOL --> AUG --> RL

    subgraph EMERGE["涌现行为(非显式规划)"]
        B1["⚖️ 全身平衡"]
        B2["🤝 手–物接触"]
        B3["📦 物体操作"]
    end
    PRIOR -.高层意图驱动.-> B1 & B2 & B3

    style STAGE1 fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style STAGE2 fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style STAGE3 fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
    style EMERGE fill:#f3e8ff,stroke:#8e44ad,color:#3d0f5a
</div>

---

## 💡 核心贡献

1. **意图驱动的涌现式 HOI**：用 affordance/稀疏目标定义"做什么"，把"怎么协调全身完成"交给物理先验 + 运动先验自然涌现，避免脆弱的显式分步规划；
2. **可扩展的三段式范式**：模仿蒸馏给出强初始化，物理扰动增广廉价扩展配置空间，RL 微调把能力推到训练分布之外；
3. **通用运动先验**：最终策略可被稀疏目标条件驱动，支持多物体交互、失败恢复（起身）、长程任务中目标切换；
4. **面向真机的物理一致性**：全程保持物理可行（项目页含 Unitree G1 的 sim-to-sim 演示），为后续真机部署留出路径。

---

## 📊 与相关路线的关系

| 路线 | 思路 | 局限 / 区别 |
|---|---|---|
| 运动跟踪（PHC / ExBody / HOVER） | 跟踪参考全身动作 | 不显式建模手–物接触与物体动力学 |
| 运动学 HOI 生成（扩散类） | 直接生成 HOI 序列 | 无物理约束，接触/穿模不保证可行 |
| **InterPrior（本文）** | **物理仿真 + 目标条件变分策略 + RL 固化先验** | 物理可行 + 可泛化到新物体/新目标 |
| InterMimic（作者前作） | 通用全身 HOI 控制（模仿） | InterPrior 更强调"生成式控制 + 规模化泛化" |

---

## 🎤 面试参考

**Q：为什么强调"不显式规划"？**
A：HOI 的全身平衡、接触、操作高度耦合，把它拆成手工子步骤既脆弱又难泛化。InterPrior 只给高层意图（affordance/目标），让低层协调从物理先验里涌现，鲁棒性更好。

**Q：为什么要用变分策略而不是确定性策略？**
A：同一个"把箱子搬到目标点"的意图可以有多种合理的全身实现，变分（goal-conditioned variational）结构能容纳这种多模态性，蒸馏时也更稳。

**Q：三个阶段各解决什么？**
A：模仿预训练→"会做且有强初始化"；物理扰动增广→廉价覆盖参考之外的配置空间；RL 微调→在未见目标/初始化上提升成功率并把技能固化成通用先验。

---

## 🔗 相关阅读

- **作者前作 / 同线**：InterMimic（[arXiv 2502.20390](https://arxiv.org/abs/2502.20390)）、InterAct（人–物交互数据集与基准）
- **运动跟踪控制器**：PHC（[arXiv 2305.06456](https://arxiv.org/abs/2305.06456)）、HOVER（[arXiv 2410.21229](https://arxiv.org/abs/2410.21229)）
- **物理 HOI 相关**：SimGenHOI（[arXiv 2508.14120](https://arxiv.org/abs/2508.14120)）、TokenHSI（[arXiv 2503.19901](https://arxiv.org/abs/2503.19901)）

---

> 备注：本笔记基于 arXiv 摘要与项目主页（[sirui-xu.github.io/InterPrior](https://sirui-xu.github.io/InterPrior/)）公开信息整理；论文正文 / 代码正式释出后建议补充：(1) 各任务/数据集上的定量成功率与对照基线；(2) 物理扰动增广的具体设计与规模；(3) 变分策略的网络结构与目标条件表示；(4) Unitree G1 sim-to-sim / 真机迁移细节。
