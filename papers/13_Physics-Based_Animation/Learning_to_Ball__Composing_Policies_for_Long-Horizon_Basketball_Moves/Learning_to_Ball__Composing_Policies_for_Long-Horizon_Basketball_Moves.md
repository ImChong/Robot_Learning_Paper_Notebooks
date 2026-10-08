---
layout: paper
paper_order: 7
title: "Learning to Ball: Composing Policies for Long-Horizon Basketball Moves"
zhname: "Learning to Ball：用「策略组合 + 高层软路由」拼出长程篮球连招"
category: "Physics-Based Animation"
---

# Learning to Ball: Composing Policies for Long-Horizon Basketball Moves
**Learning to Ball：用「策略组合 + 高层软路由」拼出长程篮球连招**

> 📅 阅读日期: 2026-06-11
>
> 🏷️ 板块: 13 Physics-Based Animation · 策略组合 / 长程任务 / 技能切换 / 物理角色控制
>
> 🔁 推进轨: 模块轮转（12_Hardware_Design → **13_Physics-Based_Animation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2509.22442](https://arxiv.org/abs/2509.22442) |
| HTML | [在线阅读](https://arxiv.org/html/2509.22442v1) |
| PDF | [下载](https://arxiv.org/pdf/2509.22442) |
| 项目主页 | [pei-xu.github.io/basketball](https://pei-xu.github.io/basketball) |
| **发布时间** | 2025-09-26 (arXiv) |
| 源码 | [xupei0610/basketball](https://github.com/xupei0610/basketball)（SIGGRAPH Asia 2025，MIT，含预训练模型） |
| 发表 | **ACM TOG / SIGGRAPH Asia 2025**（Vol. 44, No. 6，[DOI 10.1145/3763367](https://doi.org/10.1145/3763367)） |
| 提交日期 | 2025-09-26 |

**作者**：Pei Xu, Zhen Wu, Ruocheng Wang, Vishnu Sarukkai, Kayvon Fatahalian（Stanford），Ioannis Karamouzas（UC Riverside），Victor Zordan（Roblox & Clemson），C. Karen Liu（Stanford）

**机构**：**Stanford University（The Movement Lab）** · UC Riverside · Roblox · Clemson University

---

## 🎯 一句话总结

**把篮球里「运球 / 投篮 / 上篮 / 跑动 / 转身 / 捡球」这些差异极大、各自训好的子技能策略，用一套策略组合框架 + 一个高层「软路由器」拼起来——关键在于处理那些「目标说不清」的过渡段，让物理仿真角色能连贯打出 shoot-off-the-dribble（运球急停跳投）、catch-and-shoot（接球就投）、board-and-bang（抢下前场篮板立刻补篮）这类多阶段长程连招。**

---

## 📌 英文缩写速查

| 缩写 / 术语 | 全称 / 含义 | 解释 |
|---|---|---|
| Long-Horizon Task | 长程任务 | 由多个连续子任务串成、跨度很长的复合动作 |
| Subtask | 子任务 | 一段有明确目标的动作（如投篮、上篮） |
| Transitional Subtask | 过渡子任务 | 连接两个子任务、**目标定义不清晰**的中间段 |
| Soft Router | 软路由器 | 高层控制器，按当前状态**软性加权 / 切换**到合适的子策略 |
| Policy Composition | 策略组合 | 把多个独立训练的子策略整合成一个连贯控制器 |
| Composite Motion Learning | 复合运动学习 | 本文方法的前身（Xu et al.，带任务控制的复合运动学习） |
| Shoot-off-the-dribble | 运球后急停跳投 | 运球 → 急停 → 起跳投篮 |
| Catch-and-shoot | 接球就投 | 接球 → 立刻投篮 |
| Board-and-bang | 抢板补篮 | 抢下进攻篮板 → 立即二次进攻得分 |

---

## ❓ 论文要解决什么问题？

物理仿真角色要打出一套「真实的篮球连招」，难点不在单个动作，而在**怎么把一堆差异巨大的动作串成长程序列**：

1. **子技能彼此差异极大**：运球是周期性拍球节奏、投篮是爆发性全身发力、上篮是带球起跳落地——动力学、目标、奖励都不一样，**塞进一个单体策略很难同时学好**；
2. **过渡段「目标说不清」**：长程任务可以拆成「目标明确的子任务（投篮要进框）」+「**目标不明确的过渡子任务**（从运球切换到起跳的那半秒，到底该是什么姿态？没有清晰 reward）」。传统分层 / 有限状态机在过渡段最容易**抖动、卡顿甚至摔倒**；
3. **切换要平滑且鲁棒**：什么时候从「运球」切到「投篮」？硬切换会动作断裂，时机错了直接失败。

本文的答案：**别强求一个大策略包打天下**——分别训好子技能策略，再用一套**策略组合框架 + 高层软路由器**，专门把「过渡段」这件难事接管下来，做到平滑、鲁棒的技能拼接。

---

## 🔧 方法详解

整体是**「低层子技能策略库」+「高层软路由器」**的两层结构，思路承接作者前作 *Composite Motion Learning with Task Control*。

### 1. 低层：一组各管一段的子技能策略

- 为每个篮球基本功**单独训练**一个物理控制策略：**运球（dribble）、投篮（shoot）、上篮（layup）、跑动（run）、转身/急停（turn）、捡球/抢板（pick-up / rebound）**等；
- 每个子策略在自己的目标下学到位（投篮就练「球进框」、运球就练「稳定控球前进」），**互不干扰、可独立复用**。

### 2. 高层：软路由器（核心创新）

- 软路由器是一个**高层控制器**，根据当前角色 + 球 + 任务状态，**软性地决定「现在该激活/混合哪些子策略、各占多大权重」**；
- 「软」的意义：不是非黑即白地在子策略间硬切，而是在**过渡段做加权混合**，让从「运球」滑向「投篮」的那半秒动作连续、不断裂；
- 它专门负责那些**目标不清晰的过渡子任务**——这正是长程任务最易崩的地方，软路由把它从「需要人工设计中间目标」变成「由高层学出来的平滑混合」。

### 3. 策略组合框架：处理「目标不清晰的中间状态」

- 框架显式区分两类子任务：**目标明确的子任务**（有清晰 reward，直接交给对应子策略）与**过渡子任务**（无清晰 reward，由软路由器接管）；
- 这样既保住了子技能的高质量，又不需要为每个过渡段手工定义「中间应该长什么样」，**让组合后的长程动作既连贯又鲁棒**。

### 4. 训练 & 系统

- 物理仿真：**NVIDIA Isaac Gym（Preview 4）**，PyTorch 2.1.2，单 GPU 即可训练 / 评测；
- 代码与**预训练模型**已开源（[xupei0610/basketball](https://github.com/xupei0610/basketball)，MIT），`pretrained` 目录可直接评测复现。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph IN["🎯 任务输入"]
        T["🏀 长程篮球连招目标<br/>(如：运球急停跳投)"]
        S["🧍 角色 + 球 + 场景状态"]
    end

    subgraph HI["🧠 高层：软路由器 (Soft Router)"]
        ROUTE["🎚 按状态软性加权<br/>该激活哪些子策略、各占多重"]
        TRANS{"❓ 当前是<br/>明确子任务 / 过渡段?"}
    end

    subgraph LIB["🗂 低层：子技能策略库 (各自独立训练)"]
        P1["🏃 跑动 run"]
        P2["⛹ 运球 dribble"]
        P3["🔄 转身/急停 turn"]
        P4["🆙 上篮 layup"]
        P5["🎯 投篮 shoot"]
        P6["🤲 捡球/抢板 rebound"]
    end

    subgraph OUT["⚙️ 物理仿真 (Isaac Gym)"]
        ACT["🦿 关节力矩 / 动作"]
        MOVE["✅ 连贯长程连招<br/>shoot-off-dribble · catch-and-shoot · board-and-bang"]
    end

    T --> ROUTE
    S --> ROUTE
    ROUTE --> TRANS
    TRANS -- "明确子任务 → 直接调用对应策略" --> LIB
    TRANS -- "过渡段 → 软性混合相邻子策略" --> LIB
    LIB --> ACT --> MOVE
    MOVE -- "状态反馈" --> S

    style IN fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style HI fill:#ffe8ec,stroke:#c0392b,color:#5a1010
    style LIB fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
</div>

---

## 💡 核心贡献

1. **策略组合框架**：第一次系统性地针对「**多阶段、长程、且含目标不清晰中间状态**」的任务，提出把差异极大的子技能策略组合起来的统一框架；
2. **高层软路由器**：用软性加权而非硬切换接管过渡段，实现**平滑、鲁棒的技能切换**，避免动作断裂 / 抖动 / 摔倒；
3. **过渡子任务的显式建模**：把「目标说不清的过渡段」单列出来交给高层学习，**省去为每个过渡段手工设计中间目标**；
4. **真实篮球长程连招**：在物理仿真角色上打出 **shoot-off-the-dribble（运球急停跳投）、catch-and-shoot（接球就投）、board-and-bang（抢板补篮）** 等高难度复合动作；
5. **完整开源**：代码 + 预训练模型（Isaac Gym + PyTorch，MIT 许可）可直接复现。

---

## 🤖 对人形机器人 / 物理动画的意义

| 方向 | 含义 |
|---|---|
| **长程技能编排** | 给「先 A 再 B 再 C」的复合任务提供一条不靠手搓有限状态机的路子——人形机器人做「走过去 → 拿起 → 投放」这类长程 loco-manipulation 同理受用 |
| **过渡段难题** | 真实机器人里「换步态 / 换技能」的过渡段同样最易摔；软路由「软性混合」思路可迁移到运动控制的技能切换 |
| **技能库复用** | 子策略独立训练、即插即用，新连招=重新配路由，不必从零再训一遍底层技能 |
| **体育 / 角色动画** | 篮球、足球、网球这类「拆得开、串得难」的运动技能，提供了可复用的组合范式 |
| **数据/课程友好** | 子技能各自有清晰 reward，避免长程稀疏奖励的训练难题 |

---

## 🎤 面试参考

**Q：为什么不直接训一个端到端大策略去打整套连招，非要拆子策略 + 路由？**
A：篮球子技能（周期性运球 vs 爆发性投篮 vs 带球起跳的上篮）在动力学和奖励上差异极大，**塞进单体策略会互相干扰、难收敛**；而长程任务又含「目标说不清的过渡段」，端到端很难为这些中间状态设计 reward。拆成「独立训好的子策略 + 高层软路由」既保住单技能质量，又把「怎么连」这件难事单独交给高层学。

**Q：软路由器的「软」具体软在哪？比有限状态机 / 硬切换好在哪？**
A：FSM / 硬切换在子技能之间是离散跳变，过渡瞬间动作会断裂、抖动甚至失稳；软路由在过渡段对相邻子策略做**加权混合**，输出是连续过渡，动作自然衔接，对切换时机也更鲁棒——时机略偏也能靠混合权重平滑过渡。

**Q：什么叫「目标不清晰的过渡子任务」，为什么是难点？**
A：投篮要「球进框」、运球要「稳定控球」——这些有明确 reward。但从「运球」切到「起跳投篮」的那半秒，**该摆成什么姿态没有标准答案**，硬定一个中间目标既费人工又容易把动作框死。本文把过渡段交给软路由按状态学习混合，**用不着手工指定中间应该长什么样**。

**Q：这套方法和作者前作 Composite Motion Learning 的关系？**
A：本文沿用复合运动学习「把多技能组合 + 任务控制」的底子，**重点扩展到长程、多阶段、且含目标不清晰过渡段的篮球任务**，新增高层软路由专门解决子任务之间的平滑鲁棒切换。

**Q：用 Isaac Gym 训出来的篮球策略能上真机吗？**
A：本文定位是**物理仿真角色 / 物理动画**（SIGGRAPH Asia / ACM TOG），目标是仿真里的逼真长程连招，未做真机部署。但「子策略库 + 软路由处理过渡」的组合范式，对人形机器人的长程技能编排有直接借鉴价值。

---

## 🔗 相关阅读

- [PhysHMR (#451)](../PhysHMR__Learning_Humanoid_Control_Policies_from_Vision_for_Physical_HMR/PhysHMR__Learning_Humanoid_Control_Policies_from_Vision_for_Physical_HMR.html)：同模块上一个推进，视觉条件的物理人体重建
- [SkillMimic (#462)](https://arxiv.org/abs/2408.15270)：同样从篮球互动 demo 学技能，可对比「模仿 vs 组合」两条路
- [Learning to Ball 项目页](https://pei-xu.github.io/basketball)：含连招视频演示
- [Composite Motion Learning with Task Control](https://github.com/xupei0610/CompositeMotion)：本文方法的前身
- [Perpetual Humanoid Control (PHC, #465)](https://arxiv.org/abs/2305.06456)：物理仿真人形控制器经典基线

---

> 备注：本笔记基于 arXiv 元信息、SIGGRAPH Asia 2025 / ACM TOG 公开页、项目主页（pei-xu.github.io/basketball）、官方 GitHub 仓库（xupei0610/basketball）README 与公开摘要整理；arXiv 全文页抓取时临时 403，方法细节（软路由的具体网络结构、各子技能 reward、定量指标）以摘要 / 项目页 / 仓库公开口径为准，后续若 PDF 抓取恢复可补充消融与数值。
