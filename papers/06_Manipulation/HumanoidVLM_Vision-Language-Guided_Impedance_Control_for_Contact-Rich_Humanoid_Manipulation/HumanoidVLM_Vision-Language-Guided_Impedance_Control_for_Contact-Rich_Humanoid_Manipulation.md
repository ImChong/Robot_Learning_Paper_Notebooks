---
layout: paper
paper_order: 5
title: "HumanoidVLM: Vision-Language-Guided Impedance Control for Contact-Rich Humanoid Manipulation"
zhname: "HumanoidVLM：用视觉语言模型 + RAG 检索为人形机器人挑选阻抗参数与抓取角"
category: "Manipulation"
---

# HumanoidVLM: Vision-Language-Guided Impedance Control for Contact-Rich Humanoid Manipulation
**给 Unitree G1 一张第一视角图，VLM + FAISS-RAG 直接吐出"该用多硬的手"与"该怎么握"**

> 📅 阅读日期: 2026-05-24
>
> 🏷️ 板块: 06 Manipulation · 接触富集操作 · 阻抗控制 · VLM + RAG
>
> 🔁 推进轨: 模块轮转（05_Locomotion → **06_Manipulation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2601.14874](https://arxiv.org/abs/2601.14874) |
| HTML | [arXiv HTML v1](https://arxiv.org/html/2601.14874v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2601.14874) |
| 会议版 | [HRI 2026 Companion · ACM DOI 10.1145/3776734.3794528](https://doi.org/10.1145/3776734.3794528) |
| 作者 | Yara Mahmoud, Yasheerah Yaqoot, Miguel Altamirano Cabrera, Dzmitry Tsetserukou |
| 机构 | Skoltech · Intelligent Space Robotics Lab |
| 发表时间 | 2026-01（HRI 2026 Companion Proceedings） |
| **发布时间** | 2026-01-21 (arXiv), [HRI 2026 Companion · ACM DOI 10.1145/3776734.3794528](https://doi.org/10.1145/3776734.3794528) |
| 源码 | 截至当前未见官方仓库公开（同组前作 ImpedanceGPT 路径可参考） |
| 平台 | Unitree G1（双臂 + 三指夹爪，task-space 阻抗控制） |

---

## 🎯 一句话总结

> HumanoidVLM 把"挑阻抗参数 + 选抓取角"这件**老靠手调**的事，外包给一个**轻量管线**：VLM 看一眼第一视角图把任务和物体说出来 → FAISS-RAG 从两个小数据库（9 个任务 + 9 个物体）里查出实验验证过的 **stiffness/damping** 与**手指角**→ 直接喂给 G1 的任务空间阻抗控制器，让接触富集的人形操作"软硬合适"。**14 个测试场景命中率 93%**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VLM | Vision-Language Model | 视觉语言模型，输入一张图 + 提示，输出对任务/物体的语义描述 |
| RAG | Retrieval-Augmented Generation | 检索增强：用向量检索把"小知识库"接到大模型上，避免模型瞎编 |
| FAISS | Facebook AI Similarity Search | Meta 开源的向量索引库，本文用来做 RAG 的近邻检索 |
| Cartesian Impedance | 任务空间阻抗 | 在末端坐标系下用"虚拟质量-弹簧-阻尼"建模手与环境的耦合 |
| Stiffness / Damping | 刚度 / 阻尼 | 阻抗控制最核心的两个参数：决定接触时是"硬碰硬"还是"软贴上" |
| TCP | Tool Center Point | 末端工具中心，阻抗控制的参考点 |

---

## ❓ 论文要解决什么问题？

人形机器人做"接触富集"的活——倒水、按按钮、擦桌子、把书推到位——绕不开两件事：

1. **阻抗参数（刚度/阻尼）该设多少？** 太硬会把杯子打翻、把按钮按穿；太软会推不动、抓不稳。
2. **手指该怎么张合？** 不同物体、不同抓取面（顶抓、侧抓、捏取）的最佳手型并不一样。

工业上这两个参数**几乎都是工程师手调**：换个任务就重调一次，跨任务、跨物体不可迁移。已有 VLA 流派让大模型直接生成动作，但对**机械合规性**没有可控保证——VLM 输出"按按钮"很容易，输出"用 600 N/m 的 z 向刚度按按钮"就很难，幻觉风险高。

HumanoidVLM 的想法很直接：**VLM 别做物理量预测**，只负责把图变成 *(task, object)* 这种"语义标签"；真正的阻抗 / 抓取参数走**离线人工标定 + 在线检索**这条稳路。

---

## 🔧 方法详解

整个管线只有四步，且每一步都是可解释、可单独替换的模块：

### 1. 输入：一张第一视角 RGB 图

G1 头部相机拍到当前桌面，例如一个红按钮 + 一杯水。该图直接喂给 VLM，**不依赖深度图、不依赖力觉**。

### 2. VLM 语义推理：图 → 任务名 + 物体名

VLM 输出两个字段（典型如 `task = "push_button"`，`object = "soft_button"`），相当于把视觉问题压缩成两条简短的文本查询。

### 3. FAISS-RAG 双库检索

- **任务库（9 条）**：每条 = *任务名 → (Kx, Ky, Kz, Dx, Dy, Dz)* 实验验证过的刚度/阻尼向量。
- **物体库（9 条）**：每条 = *物体名 → 三指目标角度（°）*。

两次独立的向量近邻检索，分别命中"该用多硬"和"手指怎么张"。

> 💡 为什么用 RAG 而不让 VLM 直接吐数？
> ① VLM 没见过力控参数，硬让它生成会幻觉；
> ② 小数据库由人离线一次性测好，**安全可审计**；
> ③ 加新任务/新物体只需"加一行"，不用重训。

### 4. 任务空间阻抗执行

阻抗控制器实现的虚拟模型在 TCP 处：

$$F _ {ext} = K(x_d - x) + D(\dot{x}_d - \dot{x})$$

其中 $K, D$ 由检索结果填入；$x_d$ 是目标位姿（任务相关的笛卡尔参考轨迹）。同时三指夹爪闭合到检索出来的目标角，完成接触。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph SENSE["📷 感知层"]
        IMG["🖼️ 第一视角 RGB<br/>(G1 头部相机)"]
    end

    subgraph VLM_BOX["🧠 VLM 语义推理"]
        VLM["Vision-Language Model<br/>(图 → task & object)"]
        TASK["📝 任务标签<br/>e.g. push_button"]
        OBJ["📝 物体标签<br/>e.g. soft_button"]
    end

    subgraph RAG_BOX["🔎 FAISS-RAG 双库检索"]
        DB1[("📚 任务库 (9 条)<br/>task → K, D")]
        DB2[("📚 物体库 (9 条)<br/>object → 手指角")]
        KD["⚙️ 刚度 K / 阻尼 D"]
        GA["✋ 三指目标角 θ"]
    end

    subgraph CTRL["🦾 任务空间阻抗执行"]
        IMP["🌀 Cartesian Impedance<br/>F = K(x_d - x) + D(ẋ_d - ẋ)"]
        GRP["🤏 三指夹爪闭合到 θ"]
        ROBOT["🤖 Unitree G1 双臂<br/>接触富集任务"]
    end

    EVAL["✅ 14 场景检索命中率 93%<br/>z 向轨迹误差 1~3.5 cm"]

    IMG --> VLM
    VLM --> TASK
    VLM --> OBJ
    TASK --> DB1
    OBJ --> DB2
    DB1 --> KD
    DB2 --> GA
    KD --> IMP
    GA --> GRP
    IMP --> ROBOT
    GRP --> ROBOT
    ROBOT --> EVAL

    style SENSE fill:#e8f4fd,stroke:#1f78b4
    style VLM_BOX fill:#fff7e0,stroke:#d4a017
    style RAG_BOX fill:#f3e8ff,stroke:#8e44ad
    style CTRL fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **首次把 VLM-RAG 范式落到人形阻抗控制**：VLM 只做语义、RAG 给可执行参数、控制器保证物理合规，把"幻觉风险"挡在控制环外。
2. **两小型人工验证数据库**：9 任务 × 9 物体足以覆盖一类常见桌面接触任务，扩展只需追加条目。
3. **真机闭环验证**：在 Unitree G1 上跑通 14 个视觉场景，**检索命中率 93%**，z 向轨迹误差稳定在 **1~3.5 cm**，虚拟力随任务难度合理变化。
4. **可解释 + 可审计**：每一步输出都是离散标签或数值，便于事故追溯，符合 HRI 场景的安全合规需求。

---

## 📊 关键数据

| 维度 | 数值 |
|---|---|
| 任务库条目 | **9 条**（典型接触富集任务） |
| 物体库条目 | **9 条**（按钮/把手/杯子/书本等） |
| 评测视觉场景数 | **14** |
| 检索准确率 | **93%** |
| 真机 z 向跟踪误差 | **1 ~ 3.5 cm** |
| 平台 | Unitree G1（双臂 + 三指夹爪，task-space 阻抗） |

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **VLA 流派的安全补丁** | 让 VLM 负责"是什么"、让小数据库负责"用多大力"，避开端到端策略的物理幻觉 |
| **运营友好** | 加新任务/新物体只需追加一行 RAG 记录，无需重训也无需调参 |
| **HRI 适配** | 离散决策路径便于人机协作时的"为什么这么做"问答，对家庭/办公场景友好 |
| **与同组 ImpedanceGPT 一脉相承** | 把无人机集群上验证过的"VLM + 变阻抗"模板搬到人形上，证明范式可迁移 |

---

## ⚠️ 局限与开放问题

- **数据库规模有限**：9 任务 / 9 物体仍偏 demo 规模，长尾任务（拧螺丝、缝针等）尚未覆盖。
- **VLM 误检会贯穿管线**：检索命中率 93% 的另一面是 7% 直接误用阻抗参数，未给出后端的兜底力反馈安全网。
- **未引入触觉/力觉闭环**：检索值是开环填入，物体属性偏离数据库时仍可能"硬碰硬"。
- **代码未公开**：复现需要参照同组 ImpedanceGPT 的栈自行搭建。

---

## 🎤 面试参考

**Q：为什么不让 VLM 直接生成阻抗参数？**
A：VLM 训练语料里几乎没有数值化的力控参数，直接生成等于让大模型"瞎编"。HumanoidVLM 把责任拆开：VLM 做语义识别（强项），RAG 数据库做参数选择（可控/可审计），从架构上消除幻觉对物理量的影响。

**Q：为什么用 FAISS 而不是直接关键词查？**
A：① 关键词查很难处理同义词（"按钮 / button / push pad"）；② FAISS 把任务名映射成向量后做余弦最近邻，VLM 输出的近义描述也能命中；③ 扩展只需 `index.add(vector)`，无需改逻辑。

**Q：与端到端 VLA 模型相比的优缺点？**
A：优点是**可解释 + 可审计 + 易扩展**，每一步输出都有明确语义；缺点是**仅适用于已知任务模板**，强泛化（看到从没见过的物体也能合理出参数）的能力弱于真正的 VLA。两者其实互补。

**Q：z 向 1~3.5 cm 误差能接受吗？**
A：对"按按钮、推书本"这类接触富集任务足够：阻抗模型本身是为容忍位置误差而设计的，关键是接触力被刚度 $K_z$ 限制在安全区间。如果是精密装配（位置误差 < 0.5 mm）就需要换控制器或引入力反馈。

---

## 🔗 相关阅读

- arXiv：[2601.14874](https://arxiv.org/abs/2601.14874) · [HTML](https://arxiv.org/html/2601.14874v1) · [PDF](https://arxiv.org/pdf/2601.14874)
- HRI 2026 Companion：[DOI 10.1145/3776734.3794528](https://doi.org/10.1145/3776734.3794528)
- 同组前作 ImpedanceGPT（无人机版变阻抗 + VLM）：[arXiv 2503.02723](https://arxiv.org/abs/2503.02723)
- 同会议姊妹篇 SafeHumanoid（VLM-RAG 安全阻抗）：[DOI 10.1145/3776734.3794539](https://doi.org/10.1145/3776734.3794539)
- 同模块对照：[HumDex](../HumDex_Humanoid_Dexterous_Manipulation_Made_Easy/HumDex_Humanoid_Dexterous_Manipulation_Made_Easy.md)（IMU 全身遥操作）· [cuRoboV2](../cuRoboV2_Dynamics-Aware_Motion_Generation_with_Depth-Fused_Distance_Fields/cuRoboV2_Dynamics-Aware_Motion_Generation_with_Depth-Fused_Distance_Fields.md)（GPU 运动生成）· [DreamDojo](../DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos/DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos.md)（视频扩散世界模型）
