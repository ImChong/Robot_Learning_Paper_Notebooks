---
layout: paper
title: "ReCHOIR: Contact-guided Human Object Interaction Retargeting to Diverse Characters"
zhname: "ReCHOIR：面向多样化角色的接触引导人—物交互动作重定向"
category: "人体动作"
arxiv: "2609.10982"
original_check: done
original_check_date: 2026-11-17
original_check_scope: "官方 arXiv PDF v1 共 23 页，正文第 1–6 节、表 1–4 及补充材料的实现与指标说明；官方 HTML 获取失败；未核验可运行源码"
---

# ReCHOIR: Contact-guided Human Object Interaction Retargeting to Diverse Characters
**先学习跨骨架、按身体部位划分的动作先验，再用物体几何和接触提示残差修正人体动作，同时预测适配目标角色的物体平移轨迹。**

> 📅 总结日期: 2026-11-17
>
> 🏷️ 板块: 14 Human Motion · 人—物交互（HOI）· 动作重定向
>
> 🔁 推进轨: 独立模块轮转（13_Physics-Based_Animation → **14_Human_Motion**）

## 📋 基本信息

| 项目 | 内容 |
|---|---|
| 中文标题 | ReCHOIR：面向多样化角色的接触引导人—物交互动作重定向 |
| 英文标题 | ReCHOIR: Contact-guided Human Object Interaction Retargeting to Diverse Characters |
| 作者 | Chaelin Kim、Seokhyeon Hong、Kwan Yun、Soojin Choi、Inseo Jang、Junyong Noh |
| 单位 | KAIST Visual Media Lab |
| 发表 | SIGGRAPH Asia 2026（Journal Track）；ACM Transactions on Graphics 45(6), Article 261 |
| 首次公开 | arXiv v1：2026-09-10 |
| 论文 | [arXiv](https://arxiv.org/abs/2609.10982) · [PDF](https://arxiv.org/pdf/2609.10982) · [ACM DOI](https://doi.org/10.1145/3842567) |
| HTML | [arXiv 实验性 HTML](https://arxiv.org/html/2609.10982)：本次访问失败，未据此核验 |
| 项目主页 | [ReCHOIR](https://cherry-leki.github.io/projects/ReCHOIR/) |
| 源码 | 截至 2026-11-17 未确认可审阅的官方 GitHub 源码仓库；不编造源码运行时序图 |
| 原文核验 | **done**：已通读官方 PDF v1 23 页（正文、结果、局限、补充材料）；未运行代码或复现实验 |

## ❓ 研究问题

常规人体动作重定向把源角色的骨架动作迁移到另一种骨架，却容易破坏**手与箱子、脚与物体、身体与椅子**的接触时机和位置。对于不同身高、骨长、关节数的目标角色，仅重定向人体或直接复制物体轨迹都不足以保证交互一致性。跨角色配对的 HOI 监督数据又很难收集。

## 🔧 方法核心

1. **阶段一：PAME 动作先验。** 将全身拆为六个部分（髋部、脊柱、左右腿、左右臂），学习可跨不同骨架复用的 part-wise latent。编码源角色动作，结合目标骨架解码得到初始目标人体动作。
2. **阶段二：Contact Encoder。** 从源物体网格、物体运动与接触提示中编码出与身体部位对齐的交互条件 token。
3. **Contact Guider。** 将交互条件与 PAME 潜变量融合，利用残差控制分支调整目标人体动作，尽量只改变与接触相关的部位而保留动作语义。
4. **Object Motion Decoder。** 从同一融合潜变量预测目标物体**位置**，与目标人体运动对齐。注意：论文当前实现**沿用源物体朝向**，并未预测完整的 6D 物体位姿。
5. **训练**：先训练人体动作先验，再训练接触引导分支与物体运动预测；不需要跨角色成对的 HOI 真值。

### 方法流程图（据论文图 2–3）

<div class="mermaid">
flowchart TD
    A["源角色骨架 + 人体动作"] --> B["PAME Encoder：六部位动作潜变量"]
    T["目标角色骨架"] --> C["PAME Decoder"]
    B --> C
    C --> D["初始目标人体动作"]
    E["源物体网格 + 物体运动 + 接触提示"] --> F["Contact Encoder：部位对齐条件"]
    B --> G["融合动作先验与接触条件"]
    F --> G
    G --> H["Contact Guider：残差修正 PAME Decoder"]
    D --> H
    T --> H
    G --> I["Object Motion Decoder：目标物体平移"]
    H --> J["目标人体动作"]
    I --> K["目标物体轨迹（沿用源朝向）"]
    J --> L["接触一致的目标 HOI 序列"]
    K --> L
</div>

## 📊 实验与贡献

论文在 **OMOMO-test** 与 **BEHAVE-test** 上对比仅重定向人体的 PAME，以及 IK、逐实例优化、交互网格优化等组合基线（表 1）。

| 指标（论文表 1） | PAME | PAME + IK | ReCHOIR |
|---|---:|---:|---:|
| OMOMO-test 接触 F1 ↑ | 0.8266 | 0.9864 | **0.9713** |
| BEHAVE-test 接触 F1 ↑ | 0.8928 | 0.9762 | **0.9818** |
| OMOMO-test 推理时间 ms/帧 ↓ | 0.200 | 15.542 | **0.421** |
| BEHAVE-test 推理时间 ms/帧 ↓ | 0.192 | 16.678 | **0.394** |

**结论要谨慎理解**：ReCHOIR 并非所有接触指标都第一。IK 在 OMOMO 的接触 F1 更高，但逐帧强制对齐可能破坏原动作语义；ReCHOIR 的优势是**接触、动作保真与前馈速度之间的折中**。论文表 2 的主观用户研究中，ReCHOIR 在动作语义保持、接触合理性、交互合理性和物体运动质量四项均为该表最高分。上述均为论文报告，非本笔记复现实验。

## 🧮 具体实例：如何读懂接触 F1 与运行速度

以下是对论文表 1 数字的**直接手算**，不是新增实验。在 OMOMO-test，ReCHOIR 的接触 F1 为 0.9713，PAME 为 0.8266，差值 `0.9713−0.8266=0.1447`，即 **14.47 个百分点**。与 PAME + IK 的 0.9864 相比，ReCHOIR 低 `0.9864−0.9713=0.0151`，即 **1.51 个百分点**。所以不能宣称 ReCHOIR 的接触 F1 全面超过 IK。

再比较速度：OMOMO-test 中 PAME + IK 为 15.542 ms/帧，ReCHOIR 为 0.421 ms/帧，计算 `15.542/0.421≈36.9`，即论文设置下 **约 36.9 倍的单帧推理时间比**。BEHAVE-test 则为 `16.678/0.394≈42.3` 倍。这说明前馈模型无需在每一帧执行额外 IK 修正，但**不能**由此推断实际机器人部署端到端延迟：这些是论文指定硬件与评测设置的推理时间，未包含传感、通信与执行器控制。

如果一个矮角色从高角色继承“单手提箱”的动作，手腕可能够不到源接触点。ReCHOIR 会尝试按源接触提示修正手臂、并调整箱子轨迹；但如果接触几何根本不可达，论文也承认局部修正无法保证成功。这个提箱情景仅用于说明方法边界，不是新的定量实验。

## ⚠️ 局限与阅读骨架

- **问题**：跨不同骨架保留人体动作语义，同时维持物体接触关系。
- **方法**：六部位 PAME 先验 + 接触条件残差引导 + 联合预测物体平移。
- **结果**：相较只处理人体的 PAME，接触 F1 提升；相较逐实例 IK/优化，前馈速度更快，但部分接触指标不占优。
- **局限**（原文第 5 节）：源接触点对目标角色可能不可达；稀疏交互关节难以表达精细抓握；只预测物体平移、不预测旋转；只支持**单个刚体物体**，不覆盖多物体或关节物体；主要评估的是角色动画的运动学一致性，不应等同于真机接触动力学验证。

## 📚 来源与核验边界

- [官方 arXiv PDF v1（23 页）](https://arxiv.org/pdf/2609.10982)：核对正文方法第 3 节、实验第 4 节、局限第 5 节及补充材料的损失与指标定义（2026-11-17）。
- [arXiv 记录](https://arxiv.org/abs/2609.10982)：作者、首次提交日期、SIGGRAPH Asia 2026 Journal Track。
- [作者项目页](https://cherry-leki.github.io/projects/ReCHOIR/)：项目入口；未确认官方公开实现，因此无源码时序图。
