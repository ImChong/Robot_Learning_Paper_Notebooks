---
layout: paper
paper_order: 6
title: "Generalizable Geometric Prior and Recurrent Spiking Feature Learning for Humanoid Robot Manipulation"
zhname: "RGMP-S：用 2D 几何先验做长程技能选择 + 递归脉冲网络稀疏示范下学动作"
category: "Manipulation"
---

# Generalizable Geometric Prior and Recurrent Spiking Feature Learning for Humanoid Robot Manipulation
**RGMP-S：用 2D 几何先验做长程技能选择 + 递归脉冲网络稀疏示范下学动作**

> 📅 阅读日期: 2026-05-29
>
> 🏷️ 板块: 06 Manipulation · 长程技能选择 · 递归脉冲网络 · 几何先验
>
> 🔁 推进轨: 模块轮转（05_Locomotion → **06_Manipulation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2601.09031](https://arxiv.org/abs/2601.09031) |
| HTML | [arXiv HTML v1](https://arxiv.org/html/2601.09031v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2601.09031) |
| **发布时间** | 2026-01-13 (arXiv) |
| 源码 | [GitHub · xtli12/RGMP-S](https://github.com/xtli12/RGMP-S) |
| 第一作者 | Xuetao Li 等 |
| 机构 | Wuhan University · School of Computer Science / School of Robotics / Institute of Technological Sciences |
| 发表时间 | 2026-01-13（arXiv 预印本） |
| 后续版本 | RGMP（[arXiv 2511.09141](https://arxiv.org/abs/2511.09141)）为同一思路的扩展工作 |
| 评测平台 | ManiSkill2 + 自研人形 + 桌面机械臂 + 商用机器人（共 3 个真机平台） |

---

## 🎯 一句话总结

> RGMP-S 把"人形机器人做长程操作"拆成两段：**上层**让 VLM 在轻量级 2D 几何先验的帮助下"看懂场景 → 选对技能 → 拆分任务"；**下层**让一种递归自适应脉冲网络（RASNet）在**稀疏示范**下学到时间一致的动作，避免过拟合。**ManiSkill2 + 3 个真机平台**上验证有效。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| RGMP-S | Recurrent Geometric-prior Multimodal Policy with Spiking features | 本文整体框架名 |
| LGSS | Long-horizon Geometric-prior Skill Selector | 上层"技能选择器"，把长程任务拆成短技能 |
| RASNet | Recursive Adaptive Spiking Network | 下层"递归脉冲网络"，用脉冲神经元做时空特征蒸馏 |
| SNN | Spiking Neural Network | 脉冲神经网络，事件式触发、稀疏激活 |
| VLM | Vision-Language Model | 视觉语言模型，本文用 Qwen-VL 做语义理解 |
| Geometric Prior | 几何先验 | 2D 检测/分割得到的几何关系，用于辅助 VLM 做 3D 推理 |
| Skill Library | 技能库 | side_grasp / lift_up / top_pinch 等可复用原子技能 |

---

## ❓ 论文要解决什么问题？

人形机器人做"端到端的长程操作"通常会卡在两件事上：

1. **"看懂场景 + 拆任务"靠 VLM 不够稳**：纯 VLM 缺乏 3D 空间感，对"杯子在书的左前方 5cm"这种空间关系经常说不准，长程任务（先开柜门、再取物、再合上）的子目标拆解经常错位。
2. **"动作生成"靠少量示范容易过拟合**：人形机器人的真机示范非常贵，几十条轨迹下普通 Transformer/Diffusion 策略很容易记轨迹而不是学技能，时间一致性差。

RGMP-S 给出的解法是**分层 + 几何先验**：

- 上层 **LGSS**：让 YOLOv8 提供轻量 2D 几何先验（物体框、相对位置），把它喂给 Qwen-VL，让 VLM 在"看得见空间关系"的条件下做技能选择；
- 下层 **RASNet**：用脉冲神经网络的"事件触发 + 递归"性质做时空一致性归纳偏置，从稀疏示范里抠出"什么时候该出力、出多大力"的节律。

---

## 🔧 方法详解

整套管线可拆成 4 块，并且**上层和下层解耦**——上层只决定"该用哪条技能 + 参考目标"，下层负责执行。

### 1. 输入：第一视角 RGB-D + 自然语言指令

观测来自机器人头部相机；指令形如 *"把红色杯子放到柜子第二层"*。

### 2. 几何先验提取（YOLOv8 检测 + 分割）

YOLOv8 给出所有可见物体的 2D 框、类别置信度以及粗略相对位置（中心点距离、相对方位）。这些 2D 几何关系作为"轻量先验"喂给 VLM——不需要重建完整 3D 场景，就足以让大模型避免"瞎指方向"。

### 3. 上层：LGSS 长程技能选择器

- **输入**：原始指令 + 2D 几何先验 + 当前观测；
- **VLM (Qwen-VL)**：基于上述输入做技能链拆解，输出 *(skill_i, target_object_i, reference_pose_i)* 的序列；
- **技能库**：side_grasp、lift_up、top_pinch 等若干原子技能（每条对应一段控制策略）；
- **更新**：每完成一段子技能就触发一次重检索/重规划，类似闭环 ReAct。

> 💡 为什么用 2D 几何先验而不是 3D 重建？
> ① 2D 检测器成熟、推理快，单 GPU 实时；② VLM 本身已经能从 RGB 学到很强的 3D 概念，**轻量先验 + 大模型常识**比"硬塞 3D 体素"更易部署；③ 把跨平台迁移成本压下来——只要换一组 YOLOv8 权重就能用在桌面机械臂上。

### 4. 下层：RASNet 递归自适应脉冲网络

- **结构**：DenseNet 块 + 脉冲神经元 + 递归连接，输出末端轨迹/关节增量；
- **关键点**：
  - **递归**：让短窗口示范也能学到跨时间的依赖；
  - **脉冲触发**：稀疏激活天然抗过拟合，"该出动作时"才点火；
  - **自适应阈值**：避免脉冲网络常见的"全零或全爆"问题。
- **训练**：少量（数十～数百）示范 + 行为克隆 / 残差微调，关键技能从仿真迁移。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph SENSE["📷 感知层"]
        RGB["🖼️ 第一视角 RGB-D"]
        INSTR["💬 自然语言指令<br/>例：把杯子放进柜子"]
    end

    subgraph PRIOR["🧩 2D 几何先验"]
        YOLO["YOLOv8 检测 / 分割<br/>(物体框 + 相对位置)"]
    end

    subgraph LGSS["🧠 上层：LGSS 长程技能选择"]
        VLM["Qwen-VL<br/>(语义 + 空间推理)"]
        PLAN["📝 技能链<br/>side_grasp → lift_up → top_pinch ..."]
        LIB[("📚 技能库<br/>side_grasp / lift_up / top_pinch / ...")]
    end

    subgraph RASNET["⚡ 下层：RASNet 递归脉冲网络"]
        SNN["脉冲神经元 + DenseNet 块"]
        REC["递归连接<br/>(短窗口时间依赖)"]
        ACT["🎯 动作输出<br/>末端轨迹 / 关节增量"]
    end

    subgraph ROBOT["🤖 多平台执行"]
        H["自研人形"]
        DESK["桌面机械臂"]
        COM["商用机器人"]
    end

    EVAL["✅ ManiSkill2 仿真<br/>+ 3 个真机平台验证"]

    RGB --> YOLO
    RGB --> VLM
    INSTR --> VLM
    YOLO --> VLM
    VLM --> PLAN
    PLAN <--> LIB
    PLAN --> SNN
    SNN --> REC
    REC --> ACT
    ACT --> H
    ACT --> DESK
    ACT --> COM
    H --> EVAL
    DESK --> EVAL
    COM --> EVAL

    style SENSE fill:#e8f4fd,stroke:#1f78b4
    style PRIOR fill:#fff7e0,stroke:#d4a017
    style LGSS fill:#f3e8ff,stroke:#8e44ad
    style RASNET fill:#ffe8e8,stroke:#c0392b
    style ROBOT fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **几何先验 + VLM 的"轻量 3D"路线**：用 2D 检测器吐出的几何关系作为 VLM 的"空间感知补丁"，避免重建 3D 体素的算力代价，又显著提升长程子任务拆解的成功率。
2. **递归自适应脉冲网络 RASNet**：把脉冲神经元的稀疏触发用于稀疏示范，缓解人形机器人示范数据贵+少导致的过拟合，时间一致性也比纯前馈策略好。
3. **跨平台真机验证**：ManiSkill2 仿真任务（PlugCharger、MoveBucket、PushChair、OpenCabinetDoor/Drawer）+ 自研人形、桌面机械臂、商用机器人三个真机平台跑通典型长程任务（叠毛巾、倒水、分拣 bin picking）。
4. **开源代码**：[xtli12/RGMP-S](https://github.com/xtli12/RGMP-S) 公开了 LGSS、RASNet、技能库和 ROS 兼容控制接口。

---

## 📊 关键数据

| 维度 | 说明 |
|---|---|
| 仿真任务 | ManiSkill2 · PlugCharger / MoveBucket / PushChair / OpenCabinetDoor / OpenCabinetDrawer |
| 真机平台 | 自研人形 + 桌面机械臂 + 商用机器人（共 **3** 个异构平台） |
| 真机任务 | 叠毛巾、倒水、bin picking、人机交互、新物体泛化、长程任务 |
| 原子技能 | side_grasp / lift_up / top_pinch ...（可扩展） |
| 上层 VLM | Qwen-VL 系列 |
| 上层检测器 | YOLOv8（轻量 2D 几何先验） |
| 下层策略 | RASNet（脉冲 + 递归 + DenseNet 块） |

> 详细数值见论文表 / 图（HTML 版本：[arXiv 2601.09031](https://arxiv.org/html/2601.09031v1)）。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **VLA 的轻量化空间感知** | 不用上 3D 体素 / NeRF，2D 检测的几何关系就足以让 VLM 把长程任务的子目标拆对 |
| **脉冲网络在机器人控制的实战检验** | SNN 终于不只是"模仿大脑"的玩具，**稀疏激活 → 稀疏示范不过拟合**是个对人形机器人非常对症的特性 |
| **跨平台部署友好** | 上层用通用 VLM + 2D 检测器，下层 RASNet 体量小，换平台主要是换 YOLOv8 权重 + 重训末端策略 |
| **开源促进对比** | 代码 + 演示视频公开，方便后续工作直接拿来当基线 |

---

## ⚠️ 局限与开放问题

- **2D 先验 ≠ 真 3D**：物体被遮挡、相机视角差时几何先验质量下降，对长程任务的子目标定位影响不可忽视。
- **技能库需要人工维护**：side_grasp 等原子技能仍由工程师定义并校准，新技能上线有人力成本。
- **SNN 的训练工程**：脉冲触发阈值需要自适应调节，超参敏感、训练曲线不稳的情况比 GRU/Transformer 多。
- **没有给出与端到端 VLA 的直接对比**：相对 GR00T、ACT、Diffusion Policy 等强基线，在同一任务上的胜率差距仍待补充。

---

## 🎤 面试参考

**Q：为什么把"几何先验"做成 2D 而不是 3D？**
A：2D 检测器（YOLOv8）成熟、单 GPU 实时；VLM 本身从大量 RGB 训练里已经学到了较强的 3D 常识，再给一组**显式的 2D 几何关系**（"杯子在书的左 8cm、上方 3cm"），就足以让它把空间推理稳住——属于"花小钱解决大半空间感问题"。

**Q：脉冲神经网络在这里到底解决了什么？**
A：人形机器人的真机示范又贵又少（典型 50~200 条），普通 Transformer/Diffusion 在这种数据量下会**死记轨迹**。脉冲神经元只在"事件超过阈值"时点火，等价于一个**强稀疏正则**；再加上递归连接保住时间一致性，就能在稀疏示范下挤出可泛化的动作。

**Q：LGSS 和经典的 hierarchical RL 有什么区别？**
A：经典 hierarchical RL 的上层和下层都要 RL 训练；LGSS 上层直接复用预训练 VLM + 检索式技能选择，**零 RL**；下层 RASNet 用模仿学习训。落地路径更轻，但牺牲了"自动发现新技能"的能力——新技能仍靠人加。

**Q：如果换一个机器人本体，最大的工作量在哪？**
A：① 重训 YOLOv8 适配新相机 / 新物体；② 重训 RASNet（或做行为克隆微调）让动作匹配新关节空间；③ 校准技能库里 side_grasp 等原子技能。上层 LGSS 几乎不用动。

---

## 🔗 相关阅读

- arXiv：[2601.09031](https://arxiv.org/abs/2601.09031) · [HTML](https://arxiv.org/html/2601.09031v1) · [PDF](https://arxiv.org/pdf/2601.09031)
- 源码：[GitHub · xtli12/RGMP-S](https://github.com/xtli12/RGMP-S)
- 后续工作（RGMP，2025-11）：[arXiv 2511.09141](https://arxiv.org/abs/2511.09141) — 把同一框架进一步扩展为更通用的"多模态策略"
- 同模块对照：
  - [HumanoidVLM](../HumanoidVLM_Vision-Language-Guided_Impedance_Control_for_Contact-Rich_Humanoid_Manipulation/HumanoidVLM_Vision-Language-Guided_Impedance_Control_for_Contact-Rich_Humanoid_Manipulation.html)（VLM + FAISS-RAG 选阻抗参数）
  - [cuRoboV2](../cuRoboV2_Dynamics-Aware_Motion_Generation_with_Depth-Fused_Distance_Fields/cuRoboV2_Dynamics-Aware_Motion_Generation_with_Depth-Fused_Distance_Fields.html)（GPU 加速运动生成）
  - [DreamDojo](../DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos/DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos.html)（视频扩散世界模型）
