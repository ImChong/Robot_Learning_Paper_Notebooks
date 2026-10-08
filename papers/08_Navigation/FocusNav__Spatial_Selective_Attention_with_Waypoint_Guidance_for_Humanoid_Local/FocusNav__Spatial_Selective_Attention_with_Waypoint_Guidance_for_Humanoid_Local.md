---
layout: paper
paper_order: 3
title: "FocusNav: Spatial Selective Attention with Waypoint Guidance for Humanoid Local Navigation"
zhname: "FocusNav：用路径点引导的空间选择性注意力做人形局部导航"
category: "Navigation"
---

# FocusNav: Spatial Selective Attention with Waypoint Guidance for Humanoid Local Navigation
**FocusNav：用路径点引导的空间选择性注意力做人形局部导航**

> 📅 阅读日期: 2026-05-19
>
> 🏷️ 板块: Navigation · 局部导航 · 路径点引导 · 注意力机制 · 稳定性感知
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2601.12790](https://arxiv.org/abs/2601.12790) |
| HTML | [在线阅读](https://arxiv.org/html/2601.12790v1) |
| PDF | [下载](https://arxiv.org/pdf/2601.12790) |
| **发布时间** | 2026-01-19 (arXiv) |
| 源码 / 项目主页 | 截至当前未见公开发布（论文未给出开源链接） |
| 提交日期 | 2026-01 |

**机构**：上海交通大学 · 上海创新研究院（Shanghai Jiao Tong University · Shanghai Innovation Institute）

**任务定位**：人形机器人**局部导航**——在非结构化、动态环境中，把"避障 + 稳定性 + 任务相关感知"压进一个端到端策略。

---

## 🎯 一句话总结

FocusNav 把人形局部导航做成**"路径点先告诉我往哪走，注意力再去看那条路上的细节"**：用 **WGSCA**（路径点引导的空间交叉注意力）把感知聚焦到未来轨迹附近，用 **SASG**（稳定性感知选择门控）在打滑/失稳时主动屏蔽远端信息、把策略压回到脚下安全，在 Unitree G1 上显著提升复杂场景下的导航成功率。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| WGSCA | Waypoint-Guided Spatial Cross-Attention | 路径点引导的空间交叉注意力 |
| SASG | Stability-Aware Selective Gating | 稳定性感知的选择门控 |
| DoF | Degree of Freedom | 自由度 |
| LiDAR | Light Detection and Ranging | 激光雷达 |
| RL | Reinforcement Learning | 强化学习 |

---

## ❓ 论文要解决什么问题？

人形机器人的**局部导航**在真实场景里有两个老大难：

1. **感知冗余**：第一视角 / LiDAR 给的信息量很大，但**真正与"我下一步该往哪走"相关的部分非常窄**。把全部视场都喂给策略，既浪费算力又容易学到无关相关性，导致**避障对环境分布敏感、泛化差**。
2. **稳定性与远视野的冲突**：人形腿足结构在不规则地面 / 接触富集场景下**稳定性脆弱**，但常见的"看远一点提前规划"会让策略**忽视脚下接触安全**，在打滑、踩边、踏空时反应不过来。

FocusNav 给出的回答是**两条机制叠加**：

- 用**路径点**这个低维、可解释的中间变量，**显式告诉感知系统"接下来应该看哪一段空间"**——避免全场注意力。
- 用一个**稳定性感知的门控**，根据本体感知信号实时检测失稳风险，**当稳定性下降时自动截断远端感知，强迫策略关注当前落脚点**。

---

## 🔧 方法拆解

### 1. WGSCA：路径点引导的空间交叉注意力

- **输入**：第一视角 / 深度 / LiDAR 等环境特征 + **预测的一串无碰撞路径点**（waypoints）。
- **机制**：把路径点作为 query，环境特征作为 key/value，做**空间交叉注意力**——只在每个 waypoint 附近聚合特征。
- **作用**：让感知特征**沿着规划轨迹走**，避免被无关区域分散注意力；也让"我走这条路要不要避障"这件事变成一个**路径点条件下的局部决策**。

### 2. SASG：稳定性感知选择门控

- **输入**：本体感知（IMU / 关节力矩 / 接触状态）+ 当前注意力特征。
- **机制**：用一个**门控网络**估计当前**失稳风险**；当风险升高时，**门控值降低**，把更远距离的环境特征"关掉"，只保留近端 / 脚下信息。
- **作用**：在打滑、踩边、单脚支撑等场景下，**强制策略把容量留给"立刻不要摔"**，而不是"我远处还要避哪个障碍"。

### 3. 训练 & 部署

- 仿真环境：**IsaacGym**，分布式训练在 **4 × NVIDIA RTX 4090**。
- 平台：**Unitree G1**（29-DoF），**Livox MID-360 LiDAR** + **RealSense D435i** 深度相机做环境感知。
- 训练范式：基于 RL 的端到端策略，**WGSCA + SASG** 作为感知模块的两个核心机制嵌入策略网络。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph SENSE["👁️ 感知输入"]
        LIDAR["📡 LiDAR (Livox MID-360)"]
        DEPTH["🎥 深度 (RealSense D435i)"]
        PROP["🦿 本体感知<br/>IMU / 关节 / 接触"]
    end

    subgraph PLAN["🗺️ 路径点预测"]
        WP["🎯 无碰撞 Waypoints<br/>(短时序未来轨迹)"]
    end

    subgraph PERCEPT["🧠 感知融合模块"]
        ENC["🔡 环境特征编码"]
        WGSCA["🎯 WGSCA<br/>路径点引导<br/>空间交叉注意力"]
        SASG["🛡️ SASG<br/>稳定性感知<br/>选择门控"]
        FUSED["✨ 任务 & 稳定性 双关注特征"]
    end

    subgraph POLICY["🤖 RL 策略 (Unitree G1, 29-DoF)"]
        ACT["🎮 局部动作<br/>速度 / 朝向 / 落脚"]
    end

    subgraph TRAIN["⚙️ 训练 / 部署"]
        SIM["🧪 IsaacGym<br/>4× RTX 4090"]
        REAL["🌍 Unitree G1 真机"]
    end

    LIDAR --> ENC
    DEPTH --> ENC
    PROP --> SASG

    WP --> WGSCA
    ENC --> WGSCA
    WGSCA --> FUSED
    SASG -->|"按稳定性截断远端"| FUSED

    FUSED --> ACT
    ACT --> SIM
    SIM --> REAL

    style SENSE fill:#e8f4fd,stroke:#1f78b4
    style PLAN fill:#fff7e0,stroke:#d4a017
    style PERCEPT fill:#f3e8ff,stroke:#8e44ad
    style POLICY fill:#fde8e8,stroke:#c0392b
    style TRAIN fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **把路径点重新定位为"感知锚点"**：以往路径点只用来给底层控制器跟踪，FocusNav 把它当成**注意力的 query**，让感知特征聚合**与未来意图对齐**。
2. **WGSCA 模块**：路径点引导的空间交叉注意力，显著降低无关区域噪声，提升避障成功率。
3. **SASG 模块**：本体感知驱动的远端信息截断，把"走远 vs 站稳"这一冲突显式建模成**门控**，在富接触地形上更稳健。
4. **真机验证**：在 Unitree G1 上完成端到端 RL 训练与部署，复杂动态场景下成功率显著优于基线。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 导航成功率 | 复杂 / 动态场景下显著超过常见 RL 局部导航基线 |
| 避障 vs 稳定性 | WGSCA + SASG 同时提升两端，证明感知聚焦与稳定性约束不冲突 |
| 真机迁移 | IsaacGym 训练 → G1 真机部署可行，注意力 + 门控对 sim-real gap 有正贡献 |
| 失稳响应 | SASG 在踩边 / 打滑等场景能及时压制远端注意力，避免"看远摔近"的失败模式 |

> ⚠️ 上表为结构性总结，具体数值请以论文正式版与项目页（如后续释出）为准。

---

## 🤖 对人形 / 局部导航领域的意义

| 方向 | 含义 |
|---|---|
| **感知与规划的接口** | 路径点不只是"控制目标"，还可以作为"感知 query"——这是人形导航里很轻、很可解释的中间表示 |
| **稳定性显式建模** | 把"我现在站得稳不稳"做成门控信号，是比"在 reward 里加一项"更直接、更可控的稳定性注入手段 |
| **真机闭环** | 验证了 RL + 注意力路线在 29-DoF 平台上做局部导航的可行性，给后续做"VLN 子目标 + FocusNav 执行"的二级架构留下接口 |

---

## 🎤 面试参考

**Q：WGSCA 跟"普通的视觉注意力 + 目标 token"有什么本质不同？**
A：普通注意力的 query 通常是单一 goal embedding 或 token，FocusNav 用的是**一串带几何意义的路径点**——这相当于在注意力机制里**显式注入了空间路径先验**，让感知特征沿着轨迹「条状」聚合，而不是围绕一个点 / 一团 embedding 聚合。对人形局部导航这种"轨迹敏感"的任务更对症。

**Q：SASG 跟"在 reward 里加稳定性奖励"有何区别？**
A：reward 是间接信号、对策略影响慢；SASG 是**前向计算时的硬切换**——稳定性一旦下降，门控立刻把远端特征压低，策略**结构上**就被迫关注脚下。前者塑形，后者约束，组合使用更稳。

**Q：路径点是怎么得到的？依赖外部规划器吗？**
A：论文里路径点是策略内部预测的"无碰撞 waypoints"，定位为**短时序未来轨迹**的低维表示；它和动作头共享主干特征，不依赖外部全局规划。这样既保持端到端，又显式拿到一个"接下来走哪一段"的语义抽象。

**Q：和 NaVILA / EgoActor 这种 VLM 路线的关系？**
A：VLM 路线提供**高层任务规划与跨场景泛化**，FocusNav 解决**最后一段"局部安全执行"**。理想形态是：上游 VLM 给出语义子目标和粗糙路径，下游 FocusNav 把它落到稳健、富接触的人形足端动作上。两者粒度互补、可以串联。

---

## 🔗 相关阅读

- [EgoActor (2602.04515)](https://arxiv.org/abs/2602.04515)：上游 VLM 任务规划，与本文形成"高层 → 局部"的天然组合
- [NaVILA (2412.04453)](https://arxiv.org/abs/2412.04453)：足式 VLA 导航，关注语言 + 视觉指令
- [LookOut (2508.14466)](https://arxiv.org/abs/2508.14466)：真实世界人形第一视角导航
- [STATE-NAV (2506.01046)](https://arxiv.org/abs/2506.01046)：粗糙地形上的稳定性感知可通过性估计，思想与 SASG 互补
- [Skill-Nav (2506.21853)](https://arxiv.org/abs/2506.21853)：四足平台上"路径点接口 + 多技能切换"的相关探索
