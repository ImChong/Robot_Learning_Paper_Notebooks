---
layout: paper
title: "RGMP: Recurrent Geometric-prior Multimodal Policy for Generalizable Humanoid Robot Manipulation"
zhname: "RGMP：面向可泛化人形操作的递归几何先验多模态策略"
category: "Manipulation"
arxiv: "2511.09141"
---

# RGMP: Recurrent Geometric-prior Multimodal Policy for Generalizable Humanoid Robot Manipulation
**RGMP：面向可泛化人形操作的递归几何先验多模态策略**

> 📅 阅读日期: 2026-07-12
>
> 🏷️ 板块: 06 Manipulation · 灵巧/多模态操作 · 几何先验 · 递归空间建模 · 高斯混合 · 数据高效
>
> 🔁 推进轨: 模块轮转（05_Locomotion → 06_Manipulation）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月（v1）· 2025 年 12 月修订（v2）· AAAI 2026 |
| arXiv | [2511.09141](https://arxiv.org/abs/2511.09141) · [PDF](https://arxiv.org/pdf/2511.09141) · [HTML](https://arxiv.org/html/2511.09141v2) |
| 源码 | 🌟 [xtli12/RGMP](https://github.com/xtli12/RGMP) |
| 作者 | Xuetao Li、Wenke Huang、Nengyuan Pan、Songhua Yang、Yiming Wang、Mang Ye、Jifeng Xuan、Miao Li 等（武汉大学 Wuhan University） |
| 主题 | cs.RO · 可泛化人形操作 / 几何推理 / 视觉运动策略 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。后续工作为 RGMP-S（[2601.09031](https://arxiv.org/abs/2601.09031)，把运动合成主干换成递归脉冲网络）。

---

## 🎯 一句话总结

> RGMP 是一套 **两段式可泛化人形操作框架**：上层 **几何先验技能选择器（GSS）** 给视觉-语言模型（Qwen-VL）挂上**低秩几何适配器**，先用 VLM 理解人类指令并框出目标物体，再结合物体几何（位置/形状）用**规则约束**从**预训练技能库**里挑参数化技能——让机器人能凭几何区分「抓 vs 捏」等相似动作；下层 **自适应递归高斯网络（ARGN）** 做运动合成：**递归空间建模**逐块建立全局空间记忆、**自适应衰减机制（ADM）**放大任务关键 patch 权重并防梯度消失、**高斯混合模型（GMM）**用 6 个高斯分布拟合六自由度机械臂的多簇动作分布。仅用 **40 条演示**训练，在未见物体（可乐罐、喷壶、人手）上取得 **87% 平均成功率**，比 Diffusion Policy **省 5× 数据**、性能高 8%。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| RGMP | 本文框架名（递归几何先验多模态策略） |
| GSS | Geometric-prior Skill Selector，几何先验技能选择器 |
| ARGN | Adaptive Recursive Gaussian Network，自适应递归高斯网络 |
| ADM | Adaptive Decay Mechanism，自适应衰减机制 |
| GMM | Gaussian Mixture Model，高斯混合模型 |
| VLM | Vision-Language Model，视觉-语言模型（此处用 Qwen-VL） |
| RoPE | Rotary Position Embedding，旋转位置编码 |

---

## ❓ 论文要解决什么问题？

当前人形/机械臂操作学习有两大痛点：

1. **几何推理弱**：面对未见场景选技能时，缺乏对物体几何（形状、可供性）的显式推理，容易把相似动作（抓/捏）混淆；
2. **数据效率低**：数据驱动方法动辄需 **10k+ 条轨迹**，且对「机器人-目标」关系建模低效，浪费训练资源。

RGMP 的目标：**用几何先验补上推理短板 + 用高效运动网络把演示数据需求压到几十条量级**，实现跨物体、跨域的泛化。

---

## 🔧 方法详解

### 1. 几何先验技能选择器 GSS（上层，选"做什么"）
给 VLM（Qwen-VL）挂**低秩几何适配器**，两阶段选技能：
- **阶段一**：VLM 解析人类指令、用**边界框**定位目标物体；
- **阶段二**：用 **YOLOv8n-seg** 抽取物体几何（位置、形状），结合 **20 条规则约束**从**预训练参数化技能库**里挑技能。

核心是「几何-物体分解」：把几何先验（形状/可供性启发式）注入语义任务规划，使系统能凭几何区分抓取与捏取等细粒度动作。

### 2. 自适应递归高斯网络 ARGN（下层，合成"怎么做"）
即插即用的视觉运动主干，三大机制：
- **递归空间建模（Spatial Mixing Block）**：从第一个视觉 patch 递归推进到最后一个，逐步建立**全局空间记忆**，定位与任务最相关的末端执行器位置；
- **自适应衰减机制 ADM**：动态调节历史记忆衰减率，**防止关键空间记忆消失**、自适应**放大任务关键 patch 权重**（解决递归计算的梯度消失）；
- **高斯混合模型 GMM**：用 **6 个高斯分布**近似六自由度机械臂由不同关节控制的一系列动作；不是回归单一均值，而是建模多个动作簇（各有均值/协方差），更准确刻画动作分布。

辅以 **RoPE** 旋转位置编码提供方向感知、多尺度层级特征融合。

### 3. 评测设置
- 两个真机平台：人形机器人（上肢）+ 桌面双臂机器人；
- 训练仅 **40 条**交互样本（Fanta 罐抓取），泛化测未见物体（可乐罐、喷壶、人手）；
- 另在 **ManiSkill2** 仿真上跑 5 类复杂操作任务。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    CMD["🗣️ 人类指令 + 📷 RGB 观测"] --> GSS
    subgraph GSS["① 几何先验技能选择器 GSS（选做什么）"]
        V["VLM (Qwen-VL) + 低秩几何适配器<br/>解析指令 · 框出目标"] --> GEO["几何抽取 YOLOv8n-seg<br/>位置/形状 + 20 条规则约束"]
        GEO --> SEL["从预训练技能库<br/>选参数化技能（抓 vs 捏）"]
    end
    GSS --> ARGN
    subgraph ARGN["② 自适应递归高斯网络 ARGN（合成怎么做）"]
        SM["递归空间建模<br/>逐 patch 建全局空间记忆"] --> ADM["自适应衰减 ADM<br/>防记忆消失 · 放大关键 patch"]
        ADM --> GMM["高斯混合 GMM<br/>6 高斯拟合 6-DoF 多簇动作"]
    end
    ARGN --> ACT["🤖 末端动作轨迹<br/>40 条演示 · 87% 泛化成功率 · 省 5× 数据"]

    style GSS fill:#e8f0fd,stroke:#2c5aa0,color:#12305e
    style ARGN fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style ACT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 📊 关键结果

- **数据效率**：仅 **40 条**演示即达 0.98 精度；Diffusion Policy 需 **200 条**才可比——**约 5× 数据效率**；
- **泛化成功率**：未见物体平均 **0.87**（Dex-VLA 0.77、Diffusion Policy 0.70、RDT-1b / ManiSkill2-1st 0.64），比 Diffusion Policy 高约 **8 个百分点**；
- **消融**：
  - GMM 有效性（压扁可乐罐）：ARGN+GSS+GMM 0.69 vs 去 GMM 0.60；
  - ARGN 组件（RoPE + Spatial Mixing + Channel Mixing 全上）：Fanta 0.98 / Coke 0.78 / Spray 0.81 / Hands 0.90，缺任一组件全面下降。

---

## 💡 核心贡献

1. **几何先验技能选择器**：首个通过「几何-物体分解」显式把**几何推理**与**语义任务规划**打通的框架；
2. **自适应递归高斯网络**：即插即用、数据高效的视觉运动主干，用自适应衰减 + 旋转编码捕捉方向性空间依赖、用 GMM 建多簇动作分布；
3. **真机全面验证**：在人形上肢 + 桌面双臂两平台上展示强跨域泛化。

---

## 🤖 对人形机器人学习的启发

- **几何先验是数据效率的抓手**：把「形状/可供性」显式喂给 VLM 选技能，比纯数据驱动更省样本、更抗未见场景；
- **递归空间记忆 + 自适应衰减**为长序列视觉 patch 建模提供了一条轻量替代注意力的思路；
- **GMM 多簇动作**避免单均值回归对多模态动作的平均化，值得在灵巧操作策略头借鉴；
- 与后续 **RGMP-S**（递归脉冲网络主干）构成同组「几何先验 + 递归」方法线，可对照阅读。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.09141](https://arxiv.org/abs/2511.09141) | 论文正文（GSS、ARGN、真机 + ManiSkill2 实验） |
| 🌟 [xtli12/RGMP](https://github.com/xtli12/RGMP) | 官方代码仓库 |
| [RGMP-S 2601.09031](https://arxiv.org/abs/2601.09031) | 后续工作（递归脉冲特征学习，见本模块 RGMP-S 笔记） |

> ℹ️ 备注：本笔记依据 arXiv 摘要与 HTML 正文整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同组后续工作**：[RGMP-S：几何先验 + 递归脉冲特征学习](../RGMP-S__Generalizable_Geometric_Prior_and_Recurrent_Spiking_Feature_Learning_for_Humanoid_Manipulation/RGMP-S__Generalizable_Geometric_Prior_and_Recurrent_Spiking_Feature_Learning_for_Humanoid_Manipulation.html)
- **数据高效视觉运动策略对照**：[Unified Video Action Model](../Unified_Video_Action_Model/Unified_Video_Action_Model.html) · [HumanoidVLM（接触富集 · VLM + 阻抗）](../HumanoidVLM_Vision-Language-Guided_Impedance_Control_for_Contact-Rich_Humanoid_Manipulation/HumanoidVLM_Vision-Language-Guided_Impedance_Control_for_Contact-Rich_Humanoid_Manipulation.html)
