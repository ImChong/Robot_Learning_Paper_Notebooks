---
layout: paper
title: "MoGeFlow: Flowing Through Motion Codebook Geometry for Text-to-Motion Generation"
zhname: "MoGeFlow：在运动码本几何上做流匹配的文本到动作生成"
category: "Human Motion"
---

# MoGeFlow: Flowing Through Motion Codebook Geometry for Text-to-Motion Generation
**MoGeFlow：在运动码本几何上做流匹配的文本到动作生成**

> 📅 阅读日期: 2026-08-10
>
> 🏷️ 板块: 14 Human Motion · 文本到动作生成 / 运动码本几何 / 流匹配 / PartVQ 分组分词
>
> 🔁 推进轨: 模块轮转（13_Physics-Based_Animation → **14_Human_Motion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2606.11656](https://arxiv.org/abs/2606.11656) |
| HTML | [在线阅读](https://arxiv.org/html/2606.11656v2) |
| PDF | [下载](https://arxiv.org/pdf/2606.11656) |
| 源码 | 🌟 [github.com/PengchengFang-cs/MoGeFlow](https://github.com/PengchengFang-cs/MoGeFlow)（含训练/推理/评测脚本，MIT 许可） |
| 预训练权重 | [HuggingFace · AmberJar/CodeFlow-HumanML3D](https://huggingface.co/AmberJar/CodeFlow-HumanML3D)（EMA 推理模型 + 冻结 PartVQ 分词器） |
| 作者 | Pengcheng Fang, Tengjiao Sun, Xiaoyu Zhan, Hansung Kim, Xiaohao Cai, Dongjie Fu |
| 机构 | University of Southampton · Nanjing University · MOGO AI |
| 平台 | HumanML3D / KIT-ML / MotionMillion · PartVQ 六分组码本 · 流匹配 ODE 采样 |
| **发布时间** | 2026-06-10（arXiv v1）· 2026-06-25（v2） |

---

## 🎯 一句话总结

文本到动作（text-to-motion）近年被 **VQ 离散分词 + 生成式建模** 主导：把动作压成一串码本 token，再用自回归/掩码 Transformer 生成。但主流做法把码本 token 当成**无序类别标签**（One-hot），忽略了一个关键事实——**运动码本内部是有几何结构的**：相邻的码对应相近的运动原型（论文测得码本距离与运动原型距离的平均 Spearman 相关达 **0.821**）。MoGeFlow 抓住这一点，① 用 **PartVQ** 按数据驱动的关节分组（根/上臂/腿/颈/头等六组）分别建码本，把一帧动作表示成**分组结构化的连续嵌入集合**；② 训练一个**文本条件的流匹配（flow matching）向量场**，把高斯噪声沿整流路径「流」到结构化的运动码嵌入；③ ODE 采样得到的终态再**最近邻投影**回冻结码本的合法条目后解码成动作。于是它**同时拿到离散分词的稳定性与连续生成的平滑可控**，在 HumanML3D / KIT-ML / MotionMillion 三个基准上取得有竞争力乃至 SOTA 的结果。

---

## ❓ 要解决什么问题？

- **离散 token 被当作无序标签**：VQ 类方法把动作码当类别，用分类损失/掩码预测生成，丢掉了「相近码 ↔ 相近动作」的**局部运动学几何**，语义相邻的动作在建模时彼此割裂。
- **离散 vs 连续的老矛盾**：纯离散生成稳、易训、便于建模长序列，但离散跳变不利于平滑；纯连续扩散平滑自然，但直接在原始运动空间生成负担重、易漂移。
- **想两头都要**：既保留 VQ 分词带来的紧凑、鲁棒表示，又要连续生成的平滑与几何一致性。

**目标**：把码本的几何结构显式利用起来——在**码嵌入空间**里做连续流生成，末端再落回合法码本，取离散与连续之长。

---

## 🔧 方法核心

### ① PartVQ：按关节分组的结构化码本
不再用单一整体码本，而是把骨架按**数据驱动**的方式划成六组（根 root、上臂、腿、颈、头等），**每组一个独立码本**。一帧动作 → 一组「分组码嵌入」的集合。这样每个码本各管一片身体，语义更集中、几何更规整。

> 关键观察：码本内**距离结构有意义**——相邻码对应相近的运动原型（平均 Spearman ≈ 0.821）。这正是「几何可流」的前提。

### ② 在码本几何上做文本条件流匹配
- 把「分组码嵌入」拼成**结构化运动码帧**作为流匹配的目标分布；
- 训练一个 **Transformer 向量场**，用**整流插值路径（rectified interpolation）**学习把高斯噪声连续搬运到运动码帧；
- 文本表示经一个**专门的条件模块**注入 Transformer 各层，实现文本 → 动作的条件生成。

### ③ 终态最近邻投影 + 解码
连续 ODE 采样得到终态嵌入后，做**最近邻投影**回冻结码本的合法条目（保证落在 VQ 解码器能理解的离散点上），再交给解码器还原成连续动作序列。**离散的稳 + 连续的顺**在这一步合流。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    TXT["📝 文本提示<br/>text prompt"] --> COND["文本条件模块<br/>注入 Transformer 各层"]

    subgraph VQ["🧩 PartVQ 分组码本（冻结）"]
        G1["根 root 码本"]
        G2["上臂码本"]
        G3["腿码本"]
        G4["颈/头等码本"]
    end

    NOISE["🎲 高斯噪声"] --> FLOW
    COND --> FLOW

    subgraph FLOW["🌊 文本条件流匹配向量场（Transformer）"]
        RECT["整流插值路径<br/>rectified path"]
        ODE["ODE 采样<br/>噪声 → 结构化运动码帧"]
        RECT --> ODE
    end

    VQ -. 提供几何结构 .-> FLOW
    FLOW --> PROJ["🎯 终态最近邻投影<br/>回冻结码本合法条目"]
    VQ -. 合法码集 .-> PROJ
    PROJ --> DEC["VQ 解码器"]
    DEC --> MOT["🕺 输出动作序列"]

    style TXT fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style VQ fill:#e6e0f7,stroke:#6a4caf,color:#2a1a4a
    style FLOW fill:#e0f7fa,stroke:#0097a7,color:#003f47
    style PROJ fill:#fde2e2,stroke:#c0392b,color:#5a1a1a
    style MOT fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
</div>

---

## 🧩 源码运行时序（mermaid）

> 基于官方仓库 [PengchengFang-cs/MoGeFlow](https://github.com/PengchengFang-cs/MoGeFlow) README 的工作流整理：环境安装 → 数据/评测依赖准备 → 下载冻结 PartVQ 与权重 →（训练或）文本到动作推理 → 评测。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant ENV as conda/pip 环境
    participant DATA as dataset/HumanML3D
    participant HF as HuggingFace（权重 + PartVQ）
    participant TR as train_*_pscf_standard.sh
    participant GEN as gen_codeflow_t2m.py
    participant EVAL as eval_*_t2m.py

    Note over U,ENV: 步骤 1 · 安装环境
    U->>ENV: conda env create -f environment.yml<br/>conda activate mogeflow
    ENV-->>U: 就绪

    Note over U,DATA: 步骤 2 · 准备数据与评测依赖
    U->>DATA: 组织 HumanML3D（train/val/test·Mean/Std·new_joint_vecs·texts）
    U->>DATA: 下载 HumanML3D 评测器 + GloVe → checkpoints/

    Note over U,HF: 步骤 3 · 拉取冻结 PartVQ 与权重
    U->>HF: huggingface-cli download AmberJar/CodeFlow-HumanML3D<br/>--local-dir checkpoints/mogeflow_hml3d_release
    HF-->>U: MoGeFlow EMA + 冻结 PartVQ + 骨架分组配置 + 归一化统计

    Note over U,TR: 步骤 4a · （可选）训练
    U->>TR: bash scripts/launch/train_humanml3d_pscf_standard.sh
    TR-->>U: 600 epoch·bs 64·lr 1e-4·CFG 6.0，每 10 epoch 评测

    Note over U,GEN: 步骤 4b · 文本到动作推理
    U->>GEN: gen_codeflow_t2m.py --text_prompt "..."<br/>--motion_length 196 --output_dir generation/... --gpu_id 0
    GEN->>HF: 加载权重（本地或自动下载）
    GEN-->>U: 生成动作（流匹配 ODE 采样 + 最近邻投影 + 解码）

    Note over U,EVAL: 步骤 5 · 评测
    U->>EVAL: eval_codeflow_part_structured_t2m.py --checkpoint ...<br/>--dataset_opt_path ... --data_root dataset/HumanML3D
    EVAL-->>U: FID / R-Precision / MM-Dist（JSON 存于 checkpoint 目录）
</div>

---

## 📊 实验与结果

- **HumanML3D**：R-Precision Top-1/2/3 = **0.592 / 0.783 / 0.873**，MultiModal Distance = **2.599**（生成方法中最优），FID 保持强表现。
- **KIT-ML**：R-Precision Top-1/2/3 = **0.496 / 0.723 / 0.835**，FID = **0.723**（生成方法中最优）。
- **MotionMillion**（百万级大规模）：R@1/2/3 = **0.91 / 0.97 / 0.99**，FID = **28.1**（已报告最优）。
- **码本几何验证**：码本距离与局部运动原型距离的平均 **Spearman 相关 0.821**，为「在码本几何上流生成」提供直接证据。

> 结论：把「码本几何」显式纳入生成，能在三个规模差异很大的基准上一致取得竞争力/SOTA 结果，验证了「离散分词 + 连续流匹配」这条中间路线的有效性。

---

## 💡 核心贡献

1. **提出并量化「运动码本几何」**：指出 VQ 码本内相邻码对应相近运动原型（Spearman 0.821），把「被当作无序标签的码」重新看成有几何结构的连续对象；
2. **PartVQ 分组结构化码本**：按数据驱动的关节分组各建码本，让每帧动作成为结构化的分组码嵌入集合；
3. **码本几何上的文本条件流匹配**：用整流路径把噪声连续搬运到运动码帧，末端最近邻投影回合法码本，兼得离散稳定与连续平滑；
4. **多基准 SOTA/竞争力 + 开源**：在 HumanML3D / KIT-ML / MotionMillion 上验证，代码与预训练权重（MIT）公开。

---

## 🤖 对人形机器人的启示

| 方向 | 影响 |
|---|---|
| **动作先验来源** | 文本条件、几何一致的动作生成可作人形上层「动作库/参考轨迹」来源，供下层追踪控制器跟踪 |
| **分组码本 ↔ 分层控制** | PartVQ 按关节分组建模，天然契合人形「按身体部位分层控制」的直觉，便于对根/上肢/下肢分别约束 |
| **离散+连续折中** | 「离散分词稳、连续流匹配顺」的折中，对机载受限算力下既要鲁棒表示又要平滑输出的场景有借鉴价值 |
| **码本几何观点** | 「把离散码看作带几何的连续量」这一视角，可迁移到机器人技能/动作原语的表示与检索 |

---

## ⚠️ 局限与可改进点

- **纯运动学、无物理**：生成的是运动学动作，不含接触/动力学约束，直接上真机仍需下游物理追踪与稳定控制；
- **依赖 VQ 码本质量**：几何一致性的收益建立在 PartVQ 码本本身几何良好之上，码本训练不佳会削弱「码本几何」假设；
- **骨架/分组耦合**：PartVQ 的关节分组与特定骨架绑定，跨骨架/跨形态迁移需重新划分与训练；
- **投影可能引入量化误差**：终态最近邻投影回离散码会带来量化损失，连续终态与最近码之间的偏差如何最小化仍可深入。

---

## 🎤 面试参考

**Q：为什么说「把运动码当无序标签」是个问题？MoGeFlow 怎么改？**
A：VQ 类方法用分类/掩码预测生成，把码当类别，丢掉了「相近码对应相近动作」的局部几何（论文测得 Spearman 0.821）。MoGeFlow 把码看成有几何的连续嵌入，在码嵌入空间做文本条件流匹配，末端再投影回合法码本，从而利用而非丢弃这份几何。

**Q：PartVQ 的「分组」有什么意义？**
A：按数据驱动把骨架分成根/上臂/腿/颈/头等六组、每组一个码本，让每个码本聚焦一片身体，语义更集中、几何更规整，也便于对不同部位施加不同约束。

**Q：流匹配相比扩散在这里的作用是什么？**
A：流匹配用整流插值路径学一个把噪声连续搬运到目标（结构化运动码帧）的向量场，ODE 采样平滑高效；配合码本几何，让离散分词的稳定与连续生成的平滑在码嵌入空间合流。

**Q：终态最近邻投影为什么必要？**
A：ODE 采样得到的是连续终态，而 VQ 解码器只认识码本中的离散条目；最近邻投影把终态落回合法码集，保证能被正确解码，也把「连续生成」重新锚回「离散稳定表示」。

---

## 🔗 相关阅读

- [ARDY: Autoregressive Diffusion with Hybrid Representation (SIGGRAPH 2026)](../ARDY__Autoregressive_Diffusion_with_Hybrid_Representation_for_Interactive_Human_Motion/ARDY__Autoregressive_Diffusion_with_Hybrid_Representation_for_Interactive_Human_Motion.html) — 同为「离散/连续折中」的自回归扩散路线，混合表征视角对照
- [OmniControl: Control Any Joint at Any Time (ICLR 2024)](../OmniControl__Control_Any_Joint_at_Any_Time_for_Human_Motion_Generation/OmniControl__Control_Any_Joint_at_Any_Time_for_Human_Motion_Generation.html) — 可控文本到动作扩散的代表工作
- [Kimodo: Scaling Controllable Human Motion Generation](../Kimodo__Scaling_Controllable_Human_Motion_Generation/Kimodo__Scaling_Controllable_Human_Motion_Generation.html) — 同走「规模化可控动作生成」路线
- [Go to Zero: Towards Zero-shot Motion Generation with Million-scale Data](../Go_to_Zero__Towards_Zero-shot_Motion_Generation_with_Million-scale_Data/Go_to_Zero__Towards_Zero-shot_Motion_Generation_with_Million-scale_Data.html) — MotionMillion 大规模数据视角对照
- [HumanML3D](../HumanML3D/HumanML3D.html) — MoGeFlow 主基准数据集

---

> 备注：本笔记基于 arXiv 摘要、HTML v2 与官方仓库 [PengchengFang-cs/MoGeFlow](https://github.com/PengchengFang-cs/MoGeFlow) README 整理。方法命名（PartVQ 分组码本、码本几何、文本条件流匹配、终态最近邻投影）与关键数字（Spearman 0.821；HumanML3D R-Precision Top-1 0.592 / MM-Dist 2.599；KIT-ML FID 0.723；MotionMillion FID 28.1）以官方 PDF 为准。源码运行时序图依据仓库 README 的安装—数据—权重—训练/推理—评测流程绘制，实际脚本参数以仓库为准。
