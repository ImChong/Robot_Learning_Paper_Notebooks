---
layout: paper
title: "TANGO: Humanoid Navigation in Cluttered Environments with a Whole-Body Vision-Language-Action Model"
zhname: "TANGO：面向杂乱环境的人形全身视觉-语言-动作导航模型"
category: "Navigation"
arxiv: "2609.09158"
---

# TANGO: Humanoid Navigation in Cluttered Environments with a Whole-Body Vision-Language-Action Model
**把「导航」从 2D 路径规划升级为全身几何自适应：TANGO 用一个「7B 视觉-语言骨干 + 流匹配 MM-DiT 动作专家 + 低层运动跟踪器」的分层 VLA，直接由语言指令 + 第一视角图像输出 29 自由度全身关节角，让人形一边侧身、屈膝、调姿一边穿越杂乱室内空间；训练全在仿真里靠 Plan-Edit-Track 合成无碰撞轨迹 + RL 完成，零样本迁移到 Unitree G1 真机。**

> 📅 总结日期: 2026-09-11
>
> 🏷️ 板块: 08 Navigation · 视觉-语言导航(VLN) · 全身控制 · 杂乱环境穿越 · 分层 VLA
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2609.09158](https://arxiv.org/abs/2609.09158) |
| HTML | [在线阅读](https://arxiv.org/html/2609.09158v1) |
| PDF | [下载](https://arxiv.org/pdf/2609.09158) |
| 项目页 | [tango-vla.github.io](https://tango-vla.github.io/) |
| 视频 | [YouTube 演示](https://www.youtube.com/watch?v=67a-jjJpXKE) |
| **发布时间** | 2026-09-08 (arXiv v1) · CoRL 2026（RSS-WS'26 Oral） |
| 源码 | 论文声明「将开源数据管线 / 生成数据集 / VLA 框架 / 模型权重 / 部署系统」，但截至笔记时项目页与 GitHub 尚未放出代码（故暂无源码运行时序图，仅据论文描述给出推理运行架构图） |

**作者**：Anqi Li, Yuxin Chen, Zhaobo Li, Zhuo Cao, Junli Ren, Masayoshi Tomizuka, Dhruv Shah

**机构**：加州大学伯克利分校 · 北京大学 · 清华大学 · 香港大学 · 普林斯顿大学

**平台**：Unitree G1 人形机器人（29-DoF）· 仿真基于增广后的 VLNVerse + SAGE-3D 场景

---

## 🎯 一句话总结

传统机器人导航把问题当成「2D 平面上找一条无碰撞路径」，让底盘/双足沿路径走即可。但**人形在杂乱室内穿行时，光靠脚下路径不够**——要绕过桌角、钻过低矮横杆、贴着墙侧身通过，必须**手臂收拢、躯干侧倾、步态调整**协同起来做**全身几何自适应**。TANGO 是**首个面向杂乱环境、语言条件的人形全身视觉-语言导航框架**：输入自然语言指令 + 第一视角 RGB 历史 + 本体感知，直接输出 **29 自由度关节角 + 6D 基座旋转**，让全身在移动中避障。为解决「没有真实全身导航数据」的难题，作者提出 **Plan-Edit-Track (PET)** 数据合成管线，在仿真里自动造出 6.4 万条无碰撞全身轨迹做监督 + RL 跟踪；模型侧用「Qwen2.5VL-7B 骨干 + 流匹配 MM-DiT 动作专家 + SONIC 低层跟踪器」的 System-2/1/0 分层结构，兼顾语义理解与高频控制，最终零样本迁移到 Unitree G1 真机，在杂乱 3D 环境实测 10/15 成功、平均每次 0.73 次碰撞。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VLN | Vision-Language Navigation | 视觉-语言导航：按自然语言指令 + 视觉观测走到目标 |
| VLA | Vision-Language-Action | 视觉-语言-动作模型：直接由图像 + 语言输出动作 |
| DoF | Degrees of Freedom | 自由度，本文人形为 29 个可控关节 |
| PET | Plan-Edit-Track | 本文数据合成三段管线：规划 → 编辑 → 跟踪 |
| MM-DiT | Multimodal Diffusion Transformer | 多模态扩散 Transformer，这里做流匹配动作专家 |
| SR / SPL | Success Rate / Success weighted by Path Length | 成功率 / 按路径长度加权的成功率 |
| NE / OSR | Navigation Error / Oracle Success Rate | 导航终点误差 / 理想停止下的成功率 |
| System-2/1/0 | — | 分层认知：慢速语义(2) → 中频动作生成(1) → 高频底层跟踪(0) |

---

## ❓ 论文要解决什么问题？

1. **导航被过度简化为 2D 问题**：传统 VLN/局部规划把机器人当质点或圆盘，只在平面上找路，忽略人形在 3D 杂乱空间里需要的**全身几何避障**（伸缩手臂、侧身、屈膝、变步态）。
2. **缺少「全身导航」数据**：既要语言指令、又要第一视角视觉、还要 29-DoF 全身动作 + 无碰撞标注的数据几乎不存在，真机采集代价极高。
3. **语义理解与高频控制难兼得**：大 VLM 懂语言但推理慢，低层控制要高频稳。如何把「慢思考」与「快执行」拼成一个可实时部署、可零样本迁移真机的系统。

---

## 🔧 方法拆解

**① Plan-Edit-Track (PET) 数据合成管线**（在仿真里造监督数据）
- **Plan（规划）**：全局路径规划 + 参考步态合成，先给出一条可行的整体走法。
- **Edit（编辑）**：面向障碍的**全身避障编辑**——针对侧向、地面、头顶三类障碍，调整手臂/躯干/步态，把路径「改」成几何可行的无碰撞全身运动。
- **Track（跟踪）**：用 RL 跟踪器验证动力学可行性并过滤不可行样本，保证造出来的轨迹真的能被物理执行。
- 产出 **64,633 条轨迹**，来自增广后的 **VLNVerse + SAGE-3D** 场景（含侧向/地面/头顶障碍）。

**② 分层 VLA 模型（System-2/1/0）**
- **System-2 语义骨干**：**Qwen2.5VL-7B**，理解语言指令 + 第一视角 RGB 历史，服务端低频运行。
- **System-1 动作专家**：**流匹配 MM-DiT**，生成动作块（action chunk），预测 **29-DoF 关节角 + 6D 基座旋转**；配合 **real-time chunking** 让训练与流式执行对齐。
- **System-0 低层跟踪器**：**SONIC** 运动跟踪器，机上高频执行，保证响应与稳定。
- **云-边协同**：VLA 在服务端低频推理，跟踪器在机上高频执行，兼顾大模型算力与实时控制。

**③ 训练与迁移**
- 全程**仿真训练**：PET 合成的无碰撞轨迹做模仿监督 + RL 跟踪，无需真机微调。
- **零样本 sim-to-real**：直接部署到 Unitree G1，在真实杂乱室内完成侧身、屈膝、跨步等几何感知穿越。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DATA["① PET 数据合成管线（仿真）"]
        PLAN["🗺️ Plan<br/>全局路径规划 + 参考步态"]
        EDIT["✏️ Edit<br/>全身避障编辑<br/>(侧向/地面/头顶障碍)"]
        TRACK["✅ Track<br/>RL 跟踪验证动力学可行性<br/>过滤不可行样本"]
        PLAN --> EDIT --> TRACK
        TRACK -->|64,633 条无碰撞轨迹| DSET["📦 VLNVerse + SAGE-3D 增广数据集"]
    end

    subgraph MODEL["② 分层 VLA（System-2/1/0）"]
        S2["🧠 System-2: Qwen2.5VL-7B<br/>语言指令 + 第一视角 RGB 历史"]
        S1["🌊 System-1: 流匹配 MM-DiT 动作专家<br/>→ 29-DoF 关节角 + 6D 基座旋转"]
        S0["🎮 System-0: SONIC 低层跟踪器<br/>机上高频执行"]
        S2 --> S1 --> S0
    end

    DSET -->|模仿监督 + RL| MODEL
    INSTR["🗣️ 语言指令<br/>“穿过桌子走到门口”"] --> S2
    OBS["📷 第一视角 RGB + 本体感知"] --> S2
    S0 -->|全身关节指令| G1["🤖 Unitree G1 (29-DoF)<br/>零样本 sim-to-real"]
    G1 -->|侧身/屈膝/变步态<br/>下一步观测| OBS

    style DATA fill:#fff7e0,stroke:#d4a017
    style MODEL fill:#eef6ff,stroke:#2e86de
    style G1 fill:#eafaf1,stroke:#27ae60
</div>

---

## 🖥️ 推理运行架构（云-边协同，据论文描述）

> 说明：官方代码尚未释出，以下为**依据论文描述**整理的推理时序，非源码调用时序图。

<div class="mermaid">
sequenceDiagram
    participant U as 用户(语言指令)
    participant Cam as G1 相机/本体感知
    participant S2 as System-2 VLM(服务端·低频)
    participant S1 as System-1 MM-DiT 动作专家
    participant S0 as System-0 SONIC 跟踪器(机上·高频)
    participant Robot as G1 关节

    U->>S2: 自然语言指令
    loop 每个 VLA 推理周期(低频)
        Cam->>S2: 第一视角 RGB 历史 + 本体状态
        S2->>S1: 语义/子目标条件
        S1->>S1: 流匹配去噪生成 action chunk
        S1-->>S0: 29-DoF 关节角 + 6D 基座旋转(动作块)
    end
    loop 高频控制回路
        S0->>Robot: 高频关节指令(全身跟踪)
        Robot-->>Cam: 执行侧身/屈膝/变步态
        Cam-->>S0: 本体反馈
    end
</div>

---

## 💡 核心贡献

1. **首个杂乱环境人形全身 VLN 框架**：把导航从 2D 路径规划提升为「语言条件 + 全身几何自适应」的 29-DoF 控制问题。
2. **PET 数据合成管线**：Plan-Edit-Track 三段式在仿真里自动造出 6.4 万条无碰撞全身导航轨迹，绕开真机采集难题。
3. **System-2/1/0 分层 VLA**：7B VLM 慢思考 + 流匹配 MM-DiT 中频动作 + SONIC 高频跟踪，云-边协同兼顾语义与实时性。
4. **零样本 sim-to-real**：纯仿真训练直接迁移 Unitree G1，真实杂乱室内可做侧身、屈膝、跨步等几何感知穿越。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| VLNVerse 基准 | SR 54.69%(seen)/52.89%(unseen)，SPL 40.18%，OSR ~70–71%，NE ~3.7–3.9 |
| 杂乱环境基准 | SR 43.75%，SPL 31.83%，碰撞率 9.90% |
| 真机杂乱 3D 实测 | 10/15 成功，平均每次 0.73 次碰撞 |
| 对比基线 | InternVLA-N1、Uni-NaVid、RDP、HumanoidPF、Unitree WBC |
| 数据规模 | 64,633 条轨迹（VLNVerse + SAGE-3D 增广，含侧向/地面/头顶障碍） |

> ⚠️ 上表数值取自论文 v1，具体以正式版为准。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **导航范式升级** | 从「质点找路」到「全身几何自适应」，把避障与全身控制统一进一个 VLA |
| **数据瓶颈的解法** | PET 用仿真合成替代昂贵真机采集，为「全身导航」这类稀缺数据提供可扩展范式 |
| **慢思考+快执行** | System-2/1/0 分层 + 云-边协同，是大 VLM 落地实时人形控制的一条可行工程路线 |
| **可复现承诺** | 论文承诺开源数据管线/数据集/框架/权重/部署系统，若兑现将显著降低复现门槛 |

---

## 🎤 面试参考

**Q：为什么人形导航不能沿用传统的 2D 路径规划？**
A：人形在杂乱 3D 空间穿行时，脚下有路不代表全身能过——桌角要收手臂、横杆要屈膝、窄道要侧身。这些都需要手臂/躯干/步态协同的**全身几何自适应**，2D 质点规划无法表达，所以 TANGO 直接输出 29-DoF 全身动作。

**Q：没有全身导航数据，TANGO 怎么训练？**
A：靠 **Plan-Edit-Track** 在仿真里合成：先规划全局路径与参考步态(Plan)，再针对侧向/地面/头顶障碍做全身避障编辑(Edit)，最后用 RL 跟踪器验证动力学可行并过滤(Track)，共造出 6.4 万条无碰撞轨迹做监督 + RL。

**Q：System-2/1/0 分层各自负责什么？**
A：System-2 是 Qwen2.5VL-7B，慢速理解语言与视觉；System-1 是流匹配 MM-DiT，中频生成 29-DoF 动作块；System-0 是 SONIC 跟踪器，机上高频执行。VLA 在服务端低频推理、跟踪器在机上高频跟踪，云-边协同兼顾语义与实时。

---

## 🔗 相关阅读

- [EgoNav (2608.25642)](https://arxiv.org/abs/2608.25642)：学习式路点 + 几何精修的鲁棒室内导航（同板块上一篇）
- [HumanoidVLN (2608.12860)](https://arxiv.org/abs/2608.12860)：面向多本体人形的物理接地视觉-语言导航基准
- [NaVILA (2412.04453)](https://arxiv.org/abs/2412.04453)：腿足机器人 VLA 导航，分层「语言中层动作 + 运动策略」
- [FocusNav (2601.12790)](https://arxiv.org/abs/2601.12790)：面向人形局部导航的空间选择性注意 + 路点引导
- [Gallant (2511.14625)](https://arxiv.org/abs/2511.14625)：体素网格的人形运动与局部导航，跨 3D 受限地形
