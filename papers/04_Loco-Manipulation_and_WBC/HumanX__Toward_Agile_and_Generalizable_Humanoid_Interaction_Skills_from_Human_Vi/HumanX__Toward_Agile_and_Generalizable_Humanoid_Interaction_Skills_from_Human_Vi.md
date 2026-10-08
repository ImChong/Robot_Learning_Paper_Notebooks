---
layout: paper
paper_order: 48
title: "HumanX: Toward Agile and Generalizable Humanoid Interaction Skills from Human Videos"
zhname: "HumanX：从人类视频学习敏捷且可泛化的人形交互技能"
category: "Loco-Manipulation and WBC"
---

# HumanX: Toward Agile and Generalizable Humanoid Interaction Skills from Human Videos
**HumanX：从人类视频学习敏捷且可泛化的人形交互技能**

> 📅 阅读日期: 2026-05-09
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 视频→技能 · 真到仿到真 · 师生蒸馏

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.02473](https://arxiv.org/abs/2602.02473) |
| HTML | [在线阅读](https://arxiv.org/html/2602.02473v1) |
| PDF | [下载](https://arxiv.org/pdf/2602.02473) |
| 项目主页 | [wyhuai.github.io/human-x](https://wyhuai.github.io/human-x/) |
| 作者主页 | [@wyhuai](https://github.com/wyhuai) |
| **发布时间** | 2026-02-02 (arXiv) |
| 源码 | 截至论文发布暂未公开（同作者前作 [PhysHOI](https://github.com/wyhuai/PhysHOI)、[SkillMimic](https://github.com/wyhuai/SkillMimic) 可参考） |
| 提交日期 | 2026-02 |

**作者**：Yinhuai Wang, Qihan Zhao, Yuen Fui Lau, Runyi Yu, Hok Wai Tsui, Qifeng Chen, Jingbo Wang, Jiangmiao Pang, Ping Tan（HKUST × Shanghai AI Lab）

**机器人**：Unitree G1（真机零样本部署）

---

## 🎯 一句话总结

HumanX 把"**单目人类视频 → 物理可行的机器人交互数据 → 师生蒸馏出板载策略 → 真机零样本部署**"做成了一条端到端流水线：靠 **XGen** 把视频里的人体动作和物体接触合成为 G1 可执行的轨迹并大规模数据增强，再靠 **XMimic** 用师生 RL 训练出只依赖本体感知的策略，在篮球、足球、羽毛球、搬运、对抗 5 个领域共 10 项技能上达到先前方法 **8× 的泛化成功率**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| HumanX | Human-to-X (Embodied skill) | 把人类动作"通用化"到机器人 |
| XGen | eXperience Generation | 视频→可仿真交互数据的合成与增强管线 |
| XMimic | eXperience Mimic | 统一的模仿学习框架（师生蒸馏） |
| HOI | Human-Object Interaction | 人-物交互动作 |
| Privileged Info | 特权信息 | 教师在仿真里能看到的全局真值（球的精确位姿等） |
| Real→Sim→Real | 真到仿到真 | 视频是"真"的输入，落点也是"真"机器人 |

---

## ❓ 论文要解决什么问题？

把人类视频转成可在人形机器人上跑的技能，过去通常卡在四个环节上：

1. **数据稀缺**：每项新技能（投篮、扣球）都得手工采集真机数据或写专门 reward；
2. **物理不可行**：直接重定向人体动作到机器人，常常出现穿模、飞物、接触失稳；
3. **依赖外部感知**：很多 demo 在仿真里能跑，是因为有了球/对手的真值，**真机一旦只剩 IMU/关节传感器就崩**；
4. **任务定制化严重**：每个任务一套奖励、一套网络，泛化到新动作要重训。

HumanX 的目标：**让一份框架吃下若干段视频，就能让 G1 在真机上学会一组多样的"接触密集"任务**，并且 **不写任务特定 reward**、**不依赖外部传感器**。

---

## 🔧 方法拆解：HumanX 怎么工作

### 1. XGen：从单目视频 → 物理可行的交互数据

- **人体动作恢复**：从单目视频估计 SMPL/类似的人体姿态序列（含手、躯干、下肢）。
- **重定向到 G1**：将人体动作映射到 Unitree G1 的运动学，使用关节限位 + 重定向约束保证形态一致。
- **接触/物体合成**：根据动作语义合成被交互的物体（球、箱子等）的轨迹与接触事件，让物体在物理引擎里"被驱动"得合理。
- **数据增强**：在物体轨迹、接触时点、初始位姿、扰动力等维度做随机化，把"一段视频"扩成"成百上千段可训练片段"，覆盖大量新场景，是 8× 泛化提升的关键来源之一。

> 直觉：XGen 把"难以采集的真机数据"变成"可在仿真里随便复用、可注入随机性的数据集"。

### 2. XMimic：师生蒸馏的统一 IL 框架

- **教师 (Teacher)**：在物理仿真里训练，能看到 *特权信息*（球的精确位姿、对手位置等），用 RL/模仿混合目标拟合 XGen 数据。教师任务是"用 cheating 视角把动作做对"。
- **学生 (Student)**：从教师蒸馏，**只用机器人板载传感**（关节状态、IMU、内部力矩等），通过推断接触和物体状态来完成任务。
- **关键能力**：让 G1 能用"关节内力矩感觉到球"，从而无外部摄像头也能完成投篮等任务。
- **统一性**：同一套训练流程覆盖 10 项不同技能，无需为篮球/足球分别设计 reward。

### 3. 真机部署

- 教师/学生都在仿真训练，最终只把**学生策略**导出到 Unitree G1 板载。
- 真机零样本：不在真机上做 fine-tune，靠 XGen 提供的物理一致数据 + XMimic 的本体感知策略，跨过 sim-to-real 鸿沟。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    V["📹 单目人类视频<br/>(篮球/足球/羽毛球/搬运/对抗)"]

    subgraph XGEN["🛠️ XGen：数据生成与增强"]
        P1["人体姿态估计<br/>(SMPL/手部/全身)"]
        P2["重定向到 G1<br/>(关节限位 + 形态约束)"]
        P3["合成物体轨迹<br/>+ 接触事件"]
        P4["数据增强<br/>(轨迹/扰动/初始化随机化)"]
        P1 --> P2 --> P3 --> P4
    end

    subgraph XMIMIC["🎓 XMimic：师生蒸馏"]
        T["教师策略 π_T<br/>(看得到球/对手等特权信息)"]
        S["学生策略 π_S<br/>(只用本体感知 + 内力矩)"]
        T -->|DAgger / 蒸馏| S
    end

    SIM["🎮 物理仿真 (Isaac 类)"]

    subgraph DEPLOY["🤖 真机零样本部署"]
        D1["Unitree G1 板载策略"]
        D2["10 项技能 × 5 个域<br/>(投篮/对抗/搬运/...)"]
    end

    V --> XGEN
    XGEN --> SIM
    SIM --> T
    S --> DEPLOY

    style XGEN fill:#e8f4fd,stroke:#1f78b4
    style XMIMIC fill:#fdebd0,stroke:#e67e22
    style DEPLOY fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **首条端到端"视频→板载策略"流水线**：覆盖人体动作估计、物理重定向、接触合成、数据增强、师生蒸馏、真机部署完整链路。
2. **XGen 的物理一致数据增强**：把"一段视频"扩成上千个可训练片段，是 8× 泛化的工程基石。
3. **XMimic 的师生分工**：教师吃特权信息把动作做对，学生用本体感知替代外部摄像头——这是"真机能用"的关键。
4. **任务无关训练**：5 个域 10 项技能用同一套框架训出来，**无任务特定 reward**。
5. **零样本真机表现**：在 Unitree G1 上完成转身后仰跳投、与人连续传 10 球的对抗、搬运、对抗等高接触动作。

---

## 📊 实验亮点

- **任务覆盖**：5 个域共 10 项技能
  - 篮球：运球 / 跳投 / 转身后仰跳投 / 假动作 / 单脚轴心；
  - 足球：踢球；
  - 羽毛球：挥拍；
  - 物流：搬运箱体；
  - 对抗：反应性"格斗"动作。
- **泛化提升**：相对于先前 SOTA，泛化成功率提升 **>8×**。
- **真机鲁棒性**：与人类持续传球 ≥10 个回合；无外部感知完成跳投。
- **消融**：去掉 XGen 的数据增强 / 去掉学生的内力矩接触线索后性能显著下降——说明物理一致数据 + 内力矩感知是真机能跑的两根支柱。

---

## 🤖 对人形机器人领域的意义

| 影响方向 | 说明 |
|---------|------|
| **数据范式** | 把"采真机数据"换成"扩展视频数据"，把 sim-to-real 的负担前移到 XGen 的物理一致性 |
| **真机交互** | 证明 *只用本体感知* 也能完成接触密集任务（投篮、传球），降低对昂贵相机/Mocap 的依赖 |
| **训练框架** | 教师-学生模板再次被验证为"特权 → 板载"的稳定桥梁，可与 OmniH2O、HOVER 等其它 WBC 框架组合 |
| **任务泛化** | 任务无关 reward 让一条流水线能滚动接入新视频，向"从 YouTube 学技能"靠近一步 |

---

## 🎤 面试参考

**Q：为什么不直接把人体动作 retarget 给机器人就行了？**
A：纯 retarget 出的轨迹通常物理不可行——关节限位、动力学差异、接触时序错位都会导致仿真就翻车，更别提真机。XGen 在 retarget 之外额外合成物体轨迹和接触事件，再用增强覆盖各种扰动，保证教师 RL 阶段每一帧都"物理上能解"。

**Q：教师为什么需要特权信息？直接用学生从头学不行吗？**
A：直接学生从头学等于在"高维状态 + 接触不可观测"的环境里盲探，样本效率极低，常常不收敛。让教师先用特权信息把动作"做对"，再用 DAgger 把策略蒸馏成"本体感知版"，能稳定继承教师的行为分布，规避 covariate shift。

**Q：HumanX 和 OmniH2O / HumanPlus 的区别？**
A：OmniH2O / HumanPlus 偏向"实时遥操作 / 整体跟踪"，输入端依赖人类操作者或在线动作；HumanX 是离线"视频→技能"的产线，关注**接触密集**任务的离线训练与零样本部署。两类工作互补：HumanX 的输出（学生策略）可以直接挂在 OmniH2O 风格的高层指令接口下做组合。

**Q：泛化提升 8× 主要靠什么？**
A：消融指出两点最关键：(1) XGen 的物体轨迹/扰动数据增强让训练分布远比"原视频"宽；(2) 学生从内力矩中推断接触，让策略对球/对手的真实位姿误差更鲁棒。

---

## 🔗 相关阅读

- [PhysHOI (2023)](https://github.com/wyhuai/PhysHOI)：作者前作，物理化人-物交互模仿
- [SkillMimic / SkillMimic-V2 (CVPR/SIGGRAPH 2025)](https://github.com/wyhuai/SkillMimic)：篮球技能模仿的角色动画前作，是 HumanX 的直接前身
- [OmniH2O (2406.08858)](https://arxiv.org/abs/2406.08858)：实时人-人形遥操作，与 HumanX 在"离线 vs 在线"维度互补
- [HumanPlus (2406.10454)](https://arxiv.org/abs/2406.10454)：人形 shadowing & 视频模仿
- [DAgger (1011.0686)](https://arxiv.org/abs/1011.0686)：师生蒸馏的经典算法
