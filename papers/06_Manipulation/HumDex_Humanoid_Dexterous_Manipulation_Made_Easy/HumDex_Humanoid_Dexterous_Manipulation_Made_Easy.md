---
layout: paper
paper_order: 2
title: "HumDex: Humanoid Dexterous Manipulation Made Easy"
zhname: "HumDex：让人形灵巧操作变简单（IMU 全身遥操作 + 学习式手部重定向）"
category: "Manipulation"
---

# HumDex: Humanoid Dexterous Manipulation Made Easy
**HumDex：让人形灵巧操作变简单**

> 📅 阅读日期: 2026-05-16
>
> 🏷️ 板块: Manipulation · 遥操作 · 灵巧手 · 模仿学习
>
> 🔁 推进轨: 模块轮转（05_Locomotion → **06_Manipulation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2603.12260](https://arxiv.org/abs/2603.12260) |
| HTML | [在线阅读](https://arxiv.org/html/2603.12260v2) |
| PDF | [下载](https://arxiv.org/pdf/2603.12260) |
| 项目主页 | [psi-lab.ai/humdex](https://psi-lab.ai/humdex) |
| **发布时间** | 2026-03-12 (arXiv) |
| 源码 | [physical-superintelligence-lab/HumDex](https://github.com/physical-superintelligence-lab/HumDex) |
| 模型权重 | [huggingface.co/heng222/humdex](https://huggingface.co/heng222/humdex) |
| 提交日期 | 2026-03 |

**机构**：USC Physical Superintelligence (PSI) Lab · WorldEngine AI

**机器人**：Unitree **G1** 人形 + **2 × 20-DoF 灵巧手**

---

## 🎯 一句话总结

HumDex 把人形灵巧操作的「**数据采集瓶颈**」拆成两块各自击破：用 **IMU 可穿戴动捕** 解决全身遥操作的便携性—精度权衡，用 **学习式手部重定向** 替代传统优化式 retarget；把整套从动捕到训练再到 G1 部署的管线完整开源，让"采人形灵巧操作数据"这件事真正变便宜。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| IMU | Inertial Measurement Unit | 惯性测量单元，测加速度/角速度，可穿戴动捕的核心传感 |
| Retargeting | Motion Retargeting | 把人体动作映射到机器人骨架的过程 |
| BC / IL | Behavior Cloning / Imitation Learning | 行为克隆 / 模仿学习 |
| DoF | Degrees of Freedom | 自由度（手 20 DoF × 2） |
| VLA | Vision-Language-Action | 视觉—语言—动作模型，与 PSI Lab 的 Ψ₀ 协同 |

---

## ❓ 论文要解决什么问题？

人形灵巧操作的数据采集长期被三件事卡住：

1. **遥操作系统不便携**：基于 Vicon / OptiTrack 的视觉动捕需要外部基站，出实验室就用不了；视觉方案受遮挡 & 视场限制。
2. **手部重定向手动调参**：传统的优化式 retarget（如 Dex-Pilot 类方案）依赖大量手工权重 / 损失项调参，每只新手、每个新人都要重调。
3. **采集流水线碎片化**：动捕、retarget、控制、训练、部署各家用各家的工具，研究复现成本高。

HumDex 的解法：**便携 IMU 全身动捕 + 学习式手部 retarget + 端到端开源管线**——一句话，让"出实验室都能随时采人形灵巧操作数据"成为可能。

---

## 🔧 方法拆解

### 1. 全身遥操作：IMU 可穿戴动捕

- 抛弃外部光学基站，全身用 **IMU 套装**（系统支持 SlimeVR / Xsens 等多种）实时跟踪躯干、四肢姿态。
- 关键工程价值：在**任意场地**（厨房、户外、楼道）都可以直接戴上就采。
- 配合手部传感（**Manus** 数据手套等）拿到完整的"上身 + 双手"运动学。

### 2. 学习式手部重定向（核心创新）

- 把"人手关节 → 灵巧手关节"的映射建模成一个**可学习函数**，离线训练一次后**全程零调参**。
- 相比传统优化式 retarget：
  - 输出**更平滑、更自然**的手部轨迹；
  - 在真机部署上**显著优于**优化基线；
  - 不需要为每只新手 / 新操作者反复调权重。

### 3. 数据 → 策略 → 部署 闭环

- 数据：在 G1 + 双 20-DoF 手上**遥操作采集**长时序、含丰富接触的灵巧操作轨迹。
- 训练：
  - 上身/双手用 **ACT 类模仿学习**框架训练策略；
  - 全身控制层兼容 **TWIST2** 与 **SONIC（GR00T 体系）**。
- 跨实体迁移：通过在**多样化人类数据**上预训练，策略可泛化到机器人数据未见过的新位置 / 新物体 / 新背景。

### 4. 开源工程栈

- 仿真：Isaac Gym + MuJoCo
- 重定向：`wuji-retargeting`（与 GMR 兼容的 Python 环境）
- 策略：`wuji_policy` + `act` 训练框架（HDF5 数据集流水线）
- 控制：真机/仿真部署脚本 + G1 控制层

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph CAP["🧥 便携动捕（任意场地）"]
        IMU["📡 IMU 全身套装<br/>SlimeVR / Xsens"]
        GLV["🧤 数据手套<br/>Manus 等"]
    end

    subgraph RET["🔁 重定向"]
        BR["🦴 全身 Retarget<br/>(GMR / wuji-retargeting)"]
        HR["✨ 学习式手部 Retarget<br/>零调参 · 平滑自然"]
    end

    subgraph ROBOT["🤖 G1 + 2×20-DoF 手"]
        WBC["🦾 全身控制器<br/>TWIST2 / SONIC"]
        EXEC["✋ 灵巧手执行"]
    end

    subgraph DATA["💾 数据集"]
        H5["📦 HDF5 轨迹<br/>(上身姿态 + 手部 + 视觉)"]
    end

    subgraph TRAIN["🧠 模仿学习"]
        ACT["🎯 ACT / wuji_policy<br/>BC + 时序解码"]
        POL["📜 灵巧操作策略"]
    end

    IMU --> BR
    GLV --> HR
    BR --> WBC
    HR --> EXEC
    WBC --> H5
    EXEC --> H5
    H5 --> ACT
    ACT --> POL
    POL -.->|部署| WBC

    style CAP fill:#fff7e0,stroke:#d4a017
    style RET fill:#e8f4fd,stroke:#1f78b4
    style ROBOT fill:#f3e8ff,stroke:#8e44ad
    style DATA fill:#fde8e8,stroke:#c0392b
    style TRAIN fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **便携 IMU 全身遥操作管线**：摆脱外部基站，把人形数据采集从实验室搬出去。
2. **学习式灵巧手 Retargeting**：用一个学习模型替代手工调参的优化式 retarget，输出更自然 + 真机更好用。
3. **完整开源**：从动捕、retarget、训练到 G1 部署的全栈代码 + 模型权重 + 项目页全部公开。
4. **跨实体泛化**：基于多样化人类数据预训练后，策略对未见过的位置 / 物体 / 背景具备一定泛化能力。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 便携性 | IMU 方案可在无基站环境采集，部署成本远低于光学动捕 |
| 手部 Retarget | 学习式方案在平滑性 + 真机部署成功率上**系统性优于**优化基线 |
| 数据效率 | 大规模人类数据预训练 + 少量机器人数据微调，能拿到泛化能力 |
| 长时序任务 | 含丰富接触的长 horizon 灵巧操作（含烹饪 / 桌面整理类）可成功执行 |

> ⚠️ 具体数值与对比表请以论文正式版为准；上表为结构性总结。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **数据 Scaling** | 把人形灵巧操作数据从"实验室单点"升级为"任意场地 × 多操作者"，为基础模型提供燃料 |
| **手部建模** | 用学习模型解决高 DoF 手的 retarget 痛点，思路可迁移到其他多指手 |
| **基础模型** | 与 PSI Lab 的 **Ψ₀**（Psi-Zero VLA）形成"数据采集 ↔ 策略训练"闭环 |
| **工程复现** | 全栈开源 + HuggingFace 权重，是少数"拿来即可跑通灵巧操作"的人形开源仓库 |

---

## 🎤 面试参考

**Q：为什么不直接用视觉动捕（Vicon / OptiTrack / 多视图相机）做全身遥操作？**
A：视觉方案精度高但**不便携**——必须基站标定 + 受遮挡 + 视场受限，出实验室就难用。HumDex 用 IMU，把"在任意场地直接采"这件事变成可能，代价是要更聪明的全身重定向 / 滤波，但这换来了数据规模。

**Q：学习式手部 Retarget 相比优化式有什么本质区别？**
A：优化式 retarget 每次给一帧人手姿态，要求解一个非凸的 IK + 接触约束问题，对损失项和权重非常敏感，**手手不同、人人不同**都要重调。学习式则是一次离线训练、推理时直接前向，**零调参 + 时序连续**，并且可以在大量数据上学到"自然的手部协同模式"，输出更平滑。

**Q：HumDex 跟 HOMIE / OmniH2O 这些遥操作工作的差异？**
A：HOMIE 用**外骨骼**（同构 cockpit），精度高但成本高、不便携；OmniH2O 偏向**视觉 + 全身重定向**的策略层。HumDex 把宝押在**便携 IMU + 学习式手部 retarget**上，定位是"数据采集门槛"的解决方案，而不是单点演示性能。

**Q：用 IMU 做全身动捕，漂移问题怎么解决？**
A：现代 IMU 套装（如 Xsens、SlimeVR）通过传感器融合 + 关节约束 + 周期性零速更新已能把短时漂移压得可用；HumDex 的策略层进一步用上半身相对位姿（而非全局位姿）做控制，对全局漂移**天然鲁棒**。

---

## 🔗 相关阅读

- [Ψ₀ (Psi-Zero) VLA](https://github.com/physical-superintelligence-lab/Psi0)：同 lab 的人形 VLA，HumDex 是其上游数据采集系统
- [HOMIE (2502.13013)](https://arxiv.org/abs/2502.13013)：外骨骼 cockpit 路线的对照工作（笔记见 03 高影响力精选）
- [DexUMI (2025.05)](https://dex-umi.github.io/)：用人手做"通用操作接口"的另一思路
- [DexCap (2403.07788)](https://arxiv.org/abs/2403.07788)：便携动捕做灵巧操作数据采集的早期代表
- [SONIC (2511.07820)](https://arxiv.org/abs/2511.07820)：HumDex 兼容的全身控制器之一
