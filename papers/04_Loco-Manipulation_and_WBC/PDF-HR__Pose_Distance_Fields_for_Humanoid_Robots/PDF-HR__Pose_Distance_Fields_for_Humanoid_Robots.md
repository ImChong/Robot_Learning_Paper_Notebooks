---
layout: paper
paper_order: 45
title: "PDF-HR: Pose Distance Fields for Humanoid Robots"
zhname: "PDF-HR：面向人形机器人的姿态距离场先验"
category: "Loco-Manipulation and WBC"
---

# PDF-HR: Pose Distance Fields for Humanoid Robots
**用一个轻量神经距离场表示"合理的人形姿态空间"，可即插即用作为奖励、正则项或可信度打分器**

> 📅 阅读日期: 2026-05-06
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 姿态先验 · 运动跟踪 / 重定向

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.04851](https://arxiv.org/abs/2602.04851) |
| HTML | [在线阅读](https://arxiv.org/html/2602.04851) |
| PDF | [下载](https://arxiv.org/pdf/2602.04851) |
| **发布时间** | 2026-02-04 (arXiv) |
| 源码 | [gaoyukang33/PDF_HR](https://github.com/gaoyukang33/PDF_HR)（已开源 · Apache-2.0；项目页 [gaoyukang33.github.io/PDF-HR](https://gaoyukang33.github.io/PDF-HR)） |
| 提交日期 | 2026-02-04 |

**作者**：Yi Gu, Yukang Gao, Yangchen Zhou, Xingyu Chen, Yixiao Feng, Mingle Zhao, Yunyang Mo, Zhaorui Wang, Lixin Xu, Renjing Xu

**思想来源**：受人体姿态先验工作 [Pose-NDF](https://github.com/garvita-tiwari/PoseNDF) 启发，将"神经距离场建模可行姿态流形"的思路从人体迁移到人形机器人。

---

## 🎯 一句话总结

PDF-HR 训练一个**神经距离场**：输入一个机器人姿态，输出它到"已知合理姿态语料库"的最短距离；这个连续可微的"姿态可信度"可以直接当作 RL 的奖励整形项、模仿学习的正则项，或作为运动重定向时的姿态打分器，**几乎零成本接入到现有 humanoid 任务流水线**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| PDF-HR | Pose Distance Fields for Humanoid Robots | 本文方法名 |
| NDF / SDF | Neural / Signed Distance Field | 神经距离场，输入坐标输出到目标流形的距离 |
| AMP | Adversarial Motion Priors | 用判别器学风格的对抗式先验 |
| ADD | Adversarial Differential Discriminators | 改进版对抗先验 |
| MoCap | Motion Capture | 人类动作捕捉数据 |

---

## ❓ 论文要解决什么问题？

人体运动恢复领域已经积累了非常成熟的姿态/运动先验（如 VPoser、Pose-NDF），但**人形机器人**这边却用得不多，主要原因有三：

1. **数据稀缺**：高质量、覆盖完整的人形机器人运动数据远不如 SMPL 人体数据丰富。
2. **离散关节空间**：机器人有自己的关节限位、自碰撞约束，不能直接复用人体先验。
3. **接口耦合**：现有 RL / 模仿学习流水线奖励/损失函数复杂，难以"塞进"一个先验项。

业界主流的对抗式先验（AMP、ADD）虽然能学风格，但训练不稳定、判别器需要和策略一起更新。论文想要一个**预训练、冻结使用、连续可微**的轻量先验。

---

## 🔧 方法拆解：PDF-HR 怎么工作

### 输入与输出

- **输入**：任意一个人形机器人姿态 $\mathbf{q}$（关节角向量，可含根姿态）
- **输出**：标量距离 $d(\mathbf{q}) \ge 0$，表示该姿态到"合理姿态流形"的最短距离
- 距离越小 → 姿态越像训练语料库里出现过的合理姿态

### 训练数据

- 采集大规模人体 MoCap → 通过运动重定向得到**机器人姿态语料库** $\mathcal{P}$
- 在 $\mathcal{P}$ 周围采样**正样本**（语料库中的姿态，距离≈0）
- 在合理姿态附近采样**扰动样本**（用真实欧氏距离 / 流形距离作为监督）

### 网络结构

- 一个轻量 MLP，输入姿态嵌入，输出距离值
- 监督目标：**回归到查询点到 $\mathcal{P}$ 的最近距离**（类似 SDF 训练）
- 训练完成后**冻结**，作为可微"插件"使用

### 三种用法

| 用法 | 形式 | 应用场景 |
|---|---|---|
| **奖励整形项** | $r _ {\text{prior}} = -\lambda \cdot d(\mathbf{q}_t)$ | 通用运动跟踪、风格化模仿 |
| **正则项** | 训练损失里加 $\lambda \cdot d(\mathbf{q})$ | 模仿学习、行为克隆 |
| **可信度打分器** | 推理时单独评估 $d$ | 运动重定向时筛选 / 排序候选姿态 |

### 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DATA["语料构建"]
        A1["人类 MoCap 数据"] --> A2["重定向到机器人 (29 DoF)"]
        A2 --> A3["合理姿态语料库 P"]
    end

    subgraph TRAIN["PDF-HR 训练"]
        A3 --> B1["正样本 (距离≈0)"]
        A3 --> B2["扰动样本 (带距离监督)"]
        B1 --> B3["MLP 距离场<br/>q → d(q)"]
        B2 --> B3
        B3 --> B4["冻结的 PDF-HR 先验"]
    end

    subgraph USE["三种使用方式"]
        B4 --> C1["RL 奖励整形<br/>r += -λ·d(q)"]
        B4 --> C2["模仿学习正则项<br/>L += λ·d(q)"]
        B4 --> C3["重定向打分器<br/>选择 d 最小的候选"]
    end

    subgraph TASK["下游任务验证"]
        C1 --> T1["单轨迹运动跟踪"]
        C1 --> T2["通用运动跟踪"]
        C2 --> T3["风格化模仿 (vs AMP/ADD)"]
        C3 --> T4["通用运动重定向"]
    end

    style DATA fill:#e8f4fd,stroke:#1f78b4
    style TRAIN fill:#fdebd0,stroke:#e67e22
    style USE fill:#e8f8e8,stroke:#27ae60
    style TASK fill:#fceae8,stroke:#c0392b
</div>

---

## 💡 核心贡献

1. **首个面向人形机器人的姿态距离场先验**：把 Pose-NDF 的思路从人体迁移到机器人关节空间，并显式考虑关节限位、重定向后的姿态分布。
2. **轻量、冻结、可微**：训练一次即可在多任务复用，不像 AMP/ADD 那样需要每次任务都重训判别器。
3. **三种统一接口**：奖励项 / 正则项 / 打分器，覆盖 RL、模仿学习、运动重定向三大流水线。
4. **多任务验证**：在四类典型任务上验证一致提升——单轨迹跟踪、通用运动跟踪、风格模仿、运动重定向。

---

## 📊 实验亮点

- **训练规模**：4096 并行仿真环境训练；每 100 次迭代在 4096 集测试集上评估，结果统计稳定。
- **基线对比**：与 **AMP、ADD** 等对抗式风格先验对比，PDF-HR 在多种动作（walk / run / jump / parkour）上均有更高的样本效率与更低的跟踪误差。
- **任务覆盖**：
  - 单轨迹运动跟踪：作为奖励项加快收敛
  - 通用运动跟踪：作为辅助奖励抑制非自然姿态漂移
  - 风格化模仿：作为正则项替代判别器
  - 通用运动重定向：作为打分器筛选自然候选

---

## 🤖 对人形机器人领域的意义

| 影响方向 | 说明 |
|---------|------|
| **预训练先验复用** | 训练一次即可服务多任务，避免重复训练判别器，明显降低工程成本 |
| **替代对抗式先验** | 在风格化模仿场景下提供一种**非对抗、稳定可微**的替代方案 |
| **运动重定向质量** | 把"姿态自然度"变成可微分数，可直接接入到优化式重定向流水线 |
| **数据驱动控制** | 距离场天然适合作为 MPC / 优化式控制的代价项，进一步下游应用空间大 |

---

## 🎤 面试参考

**Q：PDF-HR 与 AMP / ADD 这种对抗先验相比优劣？**
A：AMP/ADD 通过判别器学习"真假"分布，但训练时判别器需要和策略联合更新，存在不稳定与遗忘问题；PDF-HR 是**一次性训练、永远冻结**，输出一个连续可微距离，作奖励/正则更稳定，但不直接建模时序，因此风格化的"动态特征"不如 AMP 显式。两者可互补。

**Q：为什么不直接用人体的 Pose-NDF？**
A：机器人关节限位、自碰撞、肢体长度比例都和人体不同，把人体姿态当合理样本会让机器人学到不可执行的姿态。PDF-HR 用**重定向后的机器人姿态**训练，先验天然落在机器人可达空间内。

**Q：PDF-HR 能否用于实时控制？**
A：网络很轻（小型 MLP），单次前向毫秒级，且可微，因此既能作 RL 奖励，也能在基于优化的全身控制 / MPC 中作代价项使用。

---

## 🔬 源码解读

> 官方代码已开源：[gaoyukang33/PDF_HR](https://github.com/gaoyukang33/PDF_HR)（Apache-2.0，100% Python），可从项目页 [gaoyukang33.github.io/PDF-HR](https://gaoyukang33.github.io/PDF-HR) 进入。README 对应本文 arXiv 2602.04851，基于 **MimicKit** 运动模仿框架 + **IsaacGym (Preview 4)** 仿真 + **Viser** 可视化。

**目录结构**

| 路径 | 内容 |
|---|---|
| `prior_ckpts/PDFHR_epoch50.pt` | 预训练姿态距离场 checkpoint（已随仓库提供） |
| `data/` | 样例数据 / 资产（部分通过外链下载） |
| `scripts/` | 可视化与集成脚本 |
| `pose_denoising.py` | 姿态去噪 quick demo，展示先验核心推理 |
| `imgs/` `requirements.txt` `LICENSE` | 配图、依赖、许可证 |

**实现要点**

- 仓库把论文的"姿态距离场先验"封装成**即插即用模块**：预训练 checkpoint（`PDFHR_epoch50.pt`）直接提供论文所述的连续可微姿态合理性流形，无需用户自行训练即可使用。
- `pose_denoising.py` 演示核心推理——给定带噪姿态，用距离场梯度把它拉回合理流形，直观对应论文"距离越小越合理"的设计；这同时验证了距离场的可微性（可作奖励/正则/打分器三种用法的统一底座）。
- 集成钩子让该先验可挂载进基于 MimicKit/IsaacGym 的 RL 流水线，作为奖励整形或正则项；可视化用 Viser 在浏览器端渲染姿态。
- **释出进度**：先验 checkpoint 与去噪 demo 已可用；运动跟踪（motion tracking with PDF-HR）的完整训练 pipeline 仍标注为开发中（README TODO），故端到端复现"通用运动跟踪"实验尚需等待后续提交。

---

## 🔗 相关阅读

- [Pose-NDF](https://github.com/garvita-tiwari/PoseNDF)：人体姿态距离场，PDF-HR 的灵感来源
- [AMP (2104.02180)](https://arxiv.org/abs/2104.02180)：对抗式风格先验，常见基线
- [ADD](https://arxiv.org/abs/2410.05756)：对抗判别器的改进版
- [Representing Robot Geometry as Distance Fields (2307.00533)](https://arxiv.org/abs/2307.00533)：把距离场用于机器人**几何**而非姿态，可对照阅读
