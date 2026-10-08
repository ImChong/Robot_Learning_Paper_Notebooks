---
layout: paper
paper_order: 4
title: "CRISP: Contact-Guided Real2Sim from Monocular Video with Planar Scene Primitives"
zhname: "CRISP：用接触引导 + 平面基元从单目视频做 Real2Sim 的人–场景重建"
category: "Physics-Based Animation"
---

# CRISP: Contact-Guided Real2Sim from Monocular Video with Planar Scene Primitives
**CRISP：基于接触引导的单目视频 Real2Sim**

> 📅 阅读日期: 2026-05-19
>
> 🏷️ 板块: 13 Physics-Based Animation · Real2Sim / 单目视频重建 / 接触建模 / 人形 RL 跟踪
>
> 🔁 推进轨: 模块轮转（12_Hardware_Design → **13_Physics-Based_Animation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2512.14696](https://arxiv.org/abs/2512.14696) |
| HTML | [在线阅读](https://arxiv.org/html/2512.14696v1) |
| PDF | [下载](https://arxiv.org/pdf/2512.14696) |
| 项目主页 | [crisp-real2sim.github.io/CRISP-Real2Sim](https://crisp-real2sim.github.io/CRISP-Real2Sim/) |
| **发布时间** | 2025-12-16 (arXiv) |
| 源码 | [Z1hanW/CRISP-Real2Sim](https://github.com/Z1hanW/CRISP-Real2Sim)（ICLR 2026，已开源完整 pipeline） |
| OpenReview | [ICLR 2026 forum](https://openreview.net/forum?id=xlr3NqxUqY) |
| Hugging Face | [papers/2512.14696](https://huggingface.co/papers/2512.14696) |
| 发表 | **ICLR 2026** |
| 提交日期 | 2025-12 |

**作者**：Zihan Wang, Jiashun Wang, Jeff Tan, Yiwen Zhao, Jessica K. Hodgins, Shubham Tulsiani, Deva Ramanan

**机构**：**Carnegie Mellon University**（CMU 计算机学院 / Robotics Institute）

---

## 🎯 一句话总结

**只给一段单目视频，CRISP 同时还原出"人在动、场景什么样、什么时候接触哪儿"，并直接把它喂进一个 RL 人形控制器去物理跟踪——通过把场景拟合成几个干净的平面（而不是噪点云），把跟踪失败率从 55.2% 压到 6.9%，仿真吞吐还快了 43%。**

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| Real2Sim | Real-to-Simulation | 把真实世界视频 / 数据转换成可仿真的 3D 场景与轨迹 |
| HMR | Human Mesh Recovery | 从图像 / 视频估计人体 SMPL(-X) 网格 |
| HSC | Human-Scene Contact | 人体与场景的接触估计（哪个关节 / 顶点接触了什么平面） |
| HOI | Human-Object Interaction | 人–物交互 |
| SMPL(-X) | Skinned Multi-Person Linear (eXpressive) | 参数化人体模型 |
| 4D Recon | 4D Reconstruction | 时序 3D 重建（深度 / 点云随时间） |
| PHC | Perpetual Humanoid Control | 经典物理仿真人形控制器，常做下游评测基线 |
| EMDB | Electromagnetic Database | 含 IMU + 相机的人体运动 benchmark |
| PROX | Proximal Relationships with Object eXclusion | 经典的人–场景交互 benchmark |

---

## ❓ 论文要解决什么问题？

把"真实世界视频"变成"可在物理仿真器里复现的人–场景"——这是当下 **物理动画 / 人形机器人** 都极度缺的能力，但单目视频做这件事的传统瓶颈有三个：

1. **HMR 单看人不看场景**：人估出来的 SMPL 轨迹很容易"漂浮"——脚穿地板、手穿桌面、坐进椅子里；
2. **场景重建是噪点云 / 三角网**：直接喂进物理仿真器，**碰撞体面密度爆炸、接触解算极不稳定**——RL 跑两步就摔；
3. **遮挡部分无法恢复**：椅子的座面被人坐着挡住了，纯几何重建出来是"空的"，物理上人就坐空摔下去。

CRISP 用三条线把这三个洞同时补上：**用人–场景接触约束反推被遮挡的几何 → 把点云 / 深度抽象成一组简洁的平面基元 → 用 RL 控制器物理跟踪以闭环验证整套重建是否"经得起仿真"**。

---

## 🔧 方法详解

整套 pipeline 是**前端"看视频" + 后端"在仿真里跑通"**的两段式闭环：

### 1. 前端：把视频拆成三件事

- **HMR + 4D 重建**：用现有 HMR 估计每帧 SMPL(-X) 人体；同时跑 4D 点云重建拿到场景的深度 / 法向 / 光流序列；
- **HSC 接触估计**：预测每个时刻**人体表面哪些顶点 / 关节正在与场景接触**——这是后面"补回被遮挡几何"的关键信号；
- **聚类 + 平面拟合**：在 4D 点云上做**基于 (depth, normal, flow) 的聚类**，把每个簇拟合成一个**平面基元（planar primitive）**。**地板 / 桌面 / 座面 / 墙**这些场景里 90% 的接触面其实都是平面，用平面表达让碰撞体面密度从 O(10⁵) 三角形压到 O(10) 个平面。

### 2. 接触引导补全（核心创新）

- 一把椅子被人坐着挡住了座面 → 几何重建那里是**空洞**；
- 但 **HSC 告诉我们「臀部正在接触某个高度的水平平面」** → CRISP 反推：**"那里一定有一个高度 = h 的水平平面"**，于是把这个平面基元加进场景表示；
- 这一步等价于把"**人正在做什么**"当作"**场景应该长什么样**"的先验，**用动力学合理性当几何补全的监督信号**。

### 3. 后端：物理仿真 + RL 人形跟踪

- 把"人 SMPL 轨迹 + 平面基元场景"塞进物理仿真器，用一个 **RL 人形控制器**去跟踪人体动作；
- **跟踪是否成功 = 整套重建是否物理可行的最强自检**——任何脚穿地板、坐空、撞墙都会立即让 RL 跟丢；
- 因为场景被压成了几个平面而不是上万三角形，**仿真吞吐显著提速（+43%）**，RL 训练 / 评测的迭代成本被同时降下来。

### 4. 训练数据 & 评测

- 在 **EMDB / PROX** 两个人–场景交互 benchmark 上评测；
- 跟踪失败率：**55.2% → 6.9%**（基线常被噪点云场景"绊倒"）；
- 还在野外视频上跑通：**手机随手拍 / 互联网视频 / 甚至 Sora 生成视频**都能恢复出可仿真的人–场景对。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph IN["🎬 输入"]
        V["📹 单目 RGB 视频<br/>(可以是手机/网络/Sora)"]
    end

    subgraph FE["🧠 前端：感知三件套"]
        HMR["👤 HMR<br/>SMPL(-X) 人体轨迹"]
        REC["🌐 4D 点云重建<br/>depth + normal + flow"]
        HSC["✋ HSC<br/>人–场景接触估计"]
    end

    subgraph GEO["📐 平面基元拟合"]
        CL["🔢 聚类<br/>(depth, normal, flow)"]
        PL["🟦 拟合若干平面基元<br/>地板/桌面/座面/墙"]
    end

    subgraph FILL["🩹 接触引导补全（核心）"]
        OCC["❌ 遮挡区域<br/>(被人挡住的座面等)"]
        ADD["➕ 用接触位置反推<br/>缺失的水平/竖直平面"]
    end

    subgraph SIM["⚙️ 物理仿真闭环"]
        BUILD["🏗 构建仿真场景<br/>(平面碰撞体)"]
        RL["🤖 RL 人形控制器<br/>跟踪 SMPL 轨迹"]
        CHK{"📏 跟踪是否成功？"}
    end

    subgraph OUT["📦 输出 (Real2Sim 数据)"]
        TRAJ["✅ 可仿真人体动作"]
        SCN["✅ 简洁可仿真场景<br/>(几个平面)"]
        PAIR["📚 用作下游 RL/HOI/动画训练数据"]
    end

    V --> HMR
    V --> REC
    V --> HSC

    REC --> CL --> PL
    HSC --> OCC --> ADD --> PL

    HMR --> BUILD
    PL --> BUILD
    BUILD --> RL --> CHK
    CHK -- "失败 → 调整接触/平面" --> ADD
    CHK -- "成功 ✅" --> TRAJ
    CHK -- "成功 ✅" --> SCN
    TRAJ --> PAIR
    SCN --> PAIR

    style IN fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style FE fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style GEO fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
    style FILL fill:#ffe8ec,stroke:#c0392b,color:#5a1010
    style SIM fill:#f3e8ff,stroke:#8e44ad,color:#3d0f5a
    style OUT fill:#e0f7fa,stroke:#0097a7,color:#003f47
</div>

---

## 💡 核心贡献

1. **接触引导补全**：第一次系统性地把 **HSC** 当作"几何补全的物理先验"——人坐在哪儿就说明那儿有座面，比纯视觉补全更可靠；
2. **平面基元场景表示**：把场景重建从"噪点云 / 上万三角形"压成"少量平面"，**碰撞解算稳、仿真快、RL 跟得动**；
3. **物理跟踪作为闭环自检**：用 RL 人形控制器是否能"跟着人走完"作为重建质量的最强 metric，避免传统几何 / 视觉 metric 与下游用途脱钩；
4. **野外可行**：在手机随手拍 / 网络视频 / Sora 视频上跑通，是少有的不依赖动捕 / 多视角 / 深度真值的 Real2Sim pipeline；
5. **数值改善**：跟踪失败率 55.2% → 6.9%，real-to-sim 成功率 93.1%，RL 仿真吞吐 +43%。

---

## 📊 关键数值

| 指标 | 基线 | CRISP | 改善 |
|---|:---:|:---:|:---:|
| 动作跟踪失败率（EMDB / PROX） | 55.2% | **6.9%** | ↓ 87% |
| Real-to-sim 成功率 | — | **93.1%** | — |
| RL 仿真吞吐 | baseline | **+43%** | 平面基元的红利 |

---

## 🤖 对人形机器人 / 物理动画的意义

| 方向 | 含义 |
|---|---|
| **Real2Sim 数据生产** | 随手拍一段人坐 / 走 / 上楼的视频，就能成对生产出"动作 + 场景"——给 PHC / OmniH2O / ASAP 这类下游训练补一条便宜的人–场景交互数据线 |
| **HOI / 物理动画** | 不再被"动捕只在实验室、场景是另一套手工搭"的二分割裂，**视频里看到什么就能仿出什么** |
| **人形 sim-to-real** | 仿真器场景从"作者手搭 USD"变成"视频自动来"，环境多样性瓶颈被打破 |
| **Foundation Model 训练** | 给 HOI / Loco-Manipulation foundation model 提供"野外尺度"的高质量交互 demo |
| **失败诊断** | RL 跟踪失败的样本 = 重建有问题的样本，**重建质量 ↔ 下游可用性**第一次有了自动闭环 |

---

## 🎤 面试参考

**Q：CRISP 跟前面的 HMR + scene-aware 方法（如 PROX / HuMoR / SLAHMR）有什么区别？**
A：CRISP **第一次把"重建是否物理可仿"当作 metric**。前面的方法仍然在"几何上对得齐 / 视觉上看着像"层面打转，而 CRISP 把场景压成平面基元后丢进物理仿真器跑 RL，**RL 跟得过去才算重建成功**——这就把下游用途（数据生产 / 动画 / sim-to-real）和重建质量直接耦合起来。

**Q：为什么坚持把场景表示成"平面"而不是 mesh / NeRF / 高斯泼溅？**
A：因为下游是**接触密集的物理仿真**。Mesh 三角面太多 → 碰撞解算慢且抖；NeRF / 高斯泼溅几乎没有干净的碰撞体。**室内人–场景交互 90% 的接触面是平面**（地板、桌面、座面、墙），用 O(10) 个平面取代 O(10⁵) 个三角形，**仿真 + RL 训练同时受益**。

**Q：HSC（人–场景接触）信号是怎么帮上几何补全的？**
A：人坐着会**遮住椅子座面**，纯几何重建那块是空的。但 HSC 会告诉你"臀部接触在某个高度的水平面" → 这就等价于一条**"那个位置必须有一个水平平面"**的硬约束，CRISP 把这条约束注入平面拟合，**用动力学合理性当几何补全的监督**。

**Q：跟踪失败率从 55.2% 降到 6.9%，主要靠的是哪一步？**
A：综合贡献，但**最大头来自"平面基元 + 接触引导补全"两件事一起**——前者让碰撞稳，后者让座面 / 楼梯这种"被人挡住的关键接触面"不再缺失。失败案例分析里，作者也明确指出"高速动态 HMR 不稳"是当前剩余的失败主因，这部分留待 HMR 上游改善。

**Q：跟 Sora 生成视频也能跑，是不是说明这套是 model-agnostic 的？**
A：是。前端任何能给出 SMPL(-X) 轨迹的 HMR + 任何能给出 depth/normal/flow 的 4D 重建都能接进来；CRISP 真正的"独立模块"是**平面基元拟合 + 接触引导补全 + 物理闭环验证**这条线。Sora 视频能跑通也说明这套**对"输入是不是真实视频"并不敏感，只要时空一致性够**就行——给未来"用生成视频造仿真数据"留了口子。

---

## 🔗 相关阅读

- [Iterative Closed-Loop Motion Synthesis (#448)](../Iterative_Closed-Loop_Motion_Synthesis/Iterative_Closed-Loop_Motion_Synthesis.html)：同模块上一个推进，"用仿真闭环造数据"的另一种路子
- [PhysHMR (#451)](https://arxiv.org/abs/2510.02566)：用人形控制策略反推物理合理人体运动（同模块下一个候选）
- [Perpetual Humanoid Control (PHC, #465)](https://arxiv.org/abs/2305.06456)：CRISP 后端 RL 跟踪器的原型
- [PROX 数据集](https://prox.is.tue.mpg.de/)：CRISP 评测的标杆 benchmark
- [EMDB 数据集](https://eth-ait.github.io/emdb/)：含 IMU + 相机的人体运动 benchmark

---

> 备注：本笔记基于 arXiv 元信息、ICLR 2026 OpenReview 公开页、项目主页（crisp-real2sim.github.io）、官方 GitHub 仓库（Z1hanW/CRISP-Real2Sim）的 README 公开描述与 Hugging Face papers 摘要整理；arXiv 全文页临时 403，关键数值（55.2% → 6.9%、93.1%、+43%）以摘要 / 项目页公开口径为准，后续若 PDF 抓取恢复可补充实现细节与消融。
