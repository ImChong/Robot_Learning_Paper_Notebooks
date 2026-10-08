---
layout: paper
paper_order: 5
title: "OSMO: Open-Source Tactile Glove for Human-to-Robot Skill Transfer"
zhname: "OSMO：人机共用的开源触觉手套——把「接触力」从人手直接迁移到机器手"
category: "硬件设计"
---

# OSMO: Open-Source Tactile Glove for Human-to-Robot Skill Transfer
**OSMO：面向人机技能迁移的开源触觉手套**

> 📅 阅读日期: 2026-06-10
>
> 🏷️ 板块: 12 Hardware Design · 触觉传感 / 可穿戴数据采集 / 人到机器人技能迁移
>
> 🔁 推进轨: 模块轮转（11_Simulation_Benchmark → **12_Hardware_Design**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2512.08920](https://arxiv.org/abs/2512.08920) |
| HTML | [在线阅读](https://arxiv.org/html/2512.08920v1) |
| PDF | [下载](https://arxiv.org/pdf/2512.08920) |
| 项目主页 | [jessicayin.github.io/osmo_tactile_glove](https://jessicayin.github.io/osmo_tactile_glove/) |
| **发布时间** | 2025-12-09 (arXiv) |
| 源码 / 硬件 | [github.com/jessicayin/osmo_tactile_glove](https://github.com/jessicayin/osmo_tactile_glove)（含固件、PCB、装配指南，硬件文件在 `website` 分支） |
| 演示视频 | [YouTube](https://www.youtube.com/watch?v=rhLiipDpKRc) |
| 机构 | Meta FAIR · UC Berkeley · University of Pennsylvania |
| 提交日期 | 2025-12（v1） |

**作者**：Jessica Yin, Haozhi Qi, Youngsun Wi, Sayantan Kundu, Mike Lambeta, William Yang, Changhao Wang, Tingfan Wu, Jitendra Malik, Tess Hellebrekers。（Meta FAIR 触觉团队主导，DIGIT / ReSkin 系磁触觉传感的延续工作。）

**定位**：一套**开源、可穿戴、人机同构**的触觉手套，用来在「野外」采集带接触力的人类演示，并把这些演示**零真实机器人数据**地迁移到机器手上完成富接触操作任务。

---

## 🎯 一句话总结

OSMO 的核心思路是：**让人和机器人戴上「同一只」触觉手套**——人戴它采数据、机器手也装它来执行，从而同时抹平**视觉外观差异**和**触觉模态差异**，把视频学不到的连续法向力/剪切力反馈，原封不动地从人手迁移到机器手，最终仅靠人类演示就训出能持续保压擦拭的策略。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| OSMO | Open-Source tactile glove for huMan-to-rObot | 本文的开源触觉手套系统 |
| Embodiment Gap | 本体差异 | 人手与机器手在外观/运动学/感知上的不一致 |
| Shear / Normal Force | 剪切力 / 法向力 | 接触面切向与垂直方向的力，磁触觉传感可连续测量 |
| HAMER | Hand Mesh Recovery | 从单目视频恢复人手关键点的方法，OSMO 用它做手部追踪 |
| Diffusion Policy | 扩散策略 | 用扩散模型生成动作序列的模仿学习策略（仓库内 `glovedp`） |
| BoM | Bill of Materials | 物料清单（开源硬件成本） |

---

## ❓ 这篇论文要解决什么问题？

「用人类视频教机器人」是当前最便宜的数据来源，但视频有一个**根本性缺陷**：它只能看到「手到哪了」，看不到「手按了多大力」。

而很多操作任务的成败恰恰取决于**接触力**——擦桌子要持续压住、插插头要对准后用力、拧瓶盖要边压边转。靠纯视觉去**反推接触力**（图像修复、力的视觉推断）既不准又脆弱。

OSMO 给出的解法不是「让算法去猜力」，而是**直接把力测出来、并保证人和机器人测的是同一种力**：

- **人采数据时**戴 OSMO，手套记录指尖和手掌的三轴力；
- **机器人执行时**机器手也装同样的 OSMO 传感单元；
- 于是策略输入里的「触觉通道」在**人侧和机器人侧是同分布的**，迁移时不需要任何跨模态对齐或域随机化。

---

## 🧱 硬件与方法的关键设计

### 1. 人机同构的触觉手套

- **12 个三轴触觉传感器**，分布在**指尖 + 手掌**，可连续输出法向力与剪切力（磁触觉传感谱系，承接 ReSkin/AnySkin 的低成本可复制路线）。
- 手套设计为**与主流手部追踪方法兼容**——戴着它仍能用单目相机 + HAMER 提取手部关键点，支持「野外」自由采集，不依赖动捕棚。
- 同一套传感单元可装到 **Psyonic 机器手**上，做到「人戴的」和「机器人装的」是同一套硬件，**最小化视觉与触觉的本体差异**。

### 2. 数据采集与重定向流水线

1. 单目视频 → **HAMER** 提取人手关键点；
2. 通过相机标定矩阵把关键点**重定向到 Psyonic 机器手**的运动学；
3. 触觉通道直接对齐（人机同传感器），无需图像修复或视觉力推断。

### 3. 触觉感知的策略学习

- 用扩散策略（仓库 `glovedp`，glove diffusion policy）在**纯人类演示**上训练，**完全不使用真实机器人数据**；
- 输入同时包含视觉/本体 + 触觉力通道，让策略学会「保压」这类纯视觉无法表达的行为。

### 4. 完全开源

公开**硬件设计、PCB、固件、装配指南与数据/训练代码**，面向社区低门槛复制——这也是「Open-Source」写进标题的原因。

---

## 🔄 方法流程图

<div class="mermaid">
flowchart TD
    A["人手戴 OSMO 手套<br/>12×三轴触觉传感(指尖+手掌)"] --> B["野外采集人类演示<br/>单目视频 + 连续法向/剪切力"]
    B --> C["HAMER 提取手部关键点"]
    C --> D["相机标定矩阵重定向<br/>→ Psyonic 机器手运动学"]
    B --> E["触觉力通道直接对齐<br/>(人机同传感器, 无需视觉推断)"]
    D --> F["构建人类演示数据集<br/>动作 + 触觉力"]
    E --> F
    F --> G["训练触觉感知扩散策略<br/>glovedp · 零真实机器人数据"]
    G --> H["机器手部署<br/>(同款 OSMO 传感单元)"]
    H --> I["富接触操作: 持续保压擦拭<br/>成功率 72% > 纯视觉基线"]

    subgraph KEY["关键: 人机同构, 抹平双重本体差异"]
        K1["视觉差异: 人/机器人戴同一只手套"]
        K2["触觉差异: 力信号同分布, 免域对齐"]
    end
    A -.-> K1
    E -.-> K2
</div>

---

## 📊 实验与结果

- 任务：**真实世界擦拭（wiping）**，需要**持续接触压力**才能擦干净——是典型的「视觉看不出、必须靠力」的富接触任务。
- 结果：**仅用人类演示训练、零真实机器人数据**的触觉感知策略达到 **72% 成功率**；
- 对比：显著**优于纯视觉基线**，主要收益来自**消除了与接触相关的失败模式**（视觉策略常因压不住/压太猛而失败）。

---

## 💡 启发与点评

- **「同构传感」是迁移学习里被低估的硬件手段**：与其让算法去跨模态对齐人手和机器手，不如在硬件层面让两侧戴同一只手套，把对齐问题从「学习」降级为「物理一致」。
- **触觉是视频范式的关键补充**：人类视频解决「数据量」，但富接触任务的「数据质」要靠力信号补上，OSMO 给出了一个低成本、可复制的补法。
- **完全开源**降低了触觉操作研究的入门门槛，对学术社区复现富接触模仿学习很友好。
- **局限**：当前验证集中在擦拭这类平面保压任务，更复杂的多指协同、精细装配上的泛化仍待检验；Psyonic 手与人手的运动学差异在更灵巧任务上可能重新放大本体差异。

---

## 🎤 面试参考

**Q：为什么纯视频学不好富接触操作？**
A：视频只编码「位姿/轨迹」，不编码「接触力」。擦桌、插拔、拧盖这类任务的成败取决于持续/瞬时的法向与剪切力，靠图像反推力既不准也不稳，OSMO 选择直接把力测出来。

**Q：OSMO 怎么抹平人手到机器手的迁移鸿沟？**
A：双管齐下——视觉上让人和机器人**戴同一只手套**（外观一致），触觉上**用同一套传感器**使力信号同分布。于是迁移时既不用图像修复，也不用跨模态域对齐。

**Q：策略训练用了机器人数据吗？**
A：没有。论文亮点正是**零真实机器人数据**，仅靠人类用 OSMO 采的演示，就让扩散策略在真实擦拭任务上拿到 72% 成功率。

---

## 🔗 相关阅读 / 类似方向

- [RUKA: Rethinking the Design of Humanoid Hands with Learning (arXiv 2504.13165)](https://arxiv.org/abs/2504.13165)：学习驱动的灵巧手设计（本仓库 #431）
- [ORCA: Open-Source Anthropomorphic Robotic Hand (arXiv 2504.04259)](https://arxiv.org/abs/2504.04259)：另一条开源灵巧手路线（#432）
- [RAPID Hand: Perception-Integrated Dexterous Platform (arXiv 2506.07490)](https://arxiv.org/abs/2506.07490)：感知一体化灵巧操作平台（#428）
- [Antagonistic Bowden-Cable Actuation of a Lightweight Robotic Hand (arXiv 2512.24657)](https://arxiv.org/abs/2512.24657)：轻量灵巧手驱动设计（#412）

---

> 备注：本笔记基于 arXiv 元信息（2512.08920 v1）、项目主页与 GitHub README 公开信息整理；自动化抓取 arXiv 全文临时 403，部分数值（如 72% 成功率、12 个三轴传感器）以官方摘要与项目页公开陈述为准。若后续论文 PDF / 硬件 BoM 释出更详尽的传感器型号、成本与训练细节，可补全至对应字段。
