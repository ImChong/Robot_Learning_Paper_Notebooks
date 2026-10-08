---
layout: paper
paper_order: 4
title: "Biomechanical Comparisons Reveal Divergence of Human and Humanoid Gaits"
zhname: "用生物力学定量度量人形步态：GDAF 框架与 28 速 G1 数据集"
category: "Locomotion"
---

# Biomechanical Comparisons Reveal Divergence of Human and Humanoid Gaits
**用生物力学定量度量人形步态：GDAF 框架与 28 速 G1 数据集**

> 📅 阅读日期: 2026-05-15
>
> 🏷️ 板块: Locomotion · 生物力学评估 · 步态分析 · Sim-to-Real 评估
>
> 🔁 推进轨: 模块轮转（04_WBC → **05_Locomotion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.21666](https://arxiv.org/abs/2602.21666) |
| HTML | [在线阅读](https://arxiv.org/html/2602.21666v1) |
| PDF | [下载](https://arxiv.org/pdf/2602.21666) |
| 项目主页 | [fengluying/GDAF](https://github.com/fengluying/GDAF)（作者仓库，代码随论文录用后释出） |
| **发布时间** | 2026-02-25 (arXiv) |
| 源码 | [fengluying/GDAF](https://github.com/fengluying/GDAF)（MuJoCo 可视化 `mujoco_gait_player.py` + `GDAF_01_Data_Visualization.ipynb` / `GDAF_02_Divergence_Analysis.ipynb`） |
| 数据集 | 28 速 Unitree G1 步态轨迹（关节位置 / 力矩 / 功率），与人类步态配对，随论文释出 |
| 提交日期 | 2026-02 |

**机构**：Westlake University（西湖大学）工学院 · Zhejiang University（浙江大学） · Ningbo Institute of Materials Technology and Engineering, CAS（中科院宁波材料所）

**机器人**：Unitree **G1**（29-DoF 人形机器人）

---

## 🎯 一句话总结

GDAF 提出一个**与控制器无关、面向生物力学**的评估框架，把"人形机器人走路像不像人"拆成**波形相似度 + 双侧对称性 + 能量学行为**三类指标，在 0.5–1.85 m/s 共 28 个速度档对一个 SOTA RL 人形控制器进行扫描，量化结论是：**视觉上像人，生物力学上仍系统性偏离**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| GDAF | Gait Divergence Analysis Framework | 步态分歧分析框架，本文核心方法 |
| DoF | Degrees of Freedom | 自由度（G1 为 29 DoF） |
| RL / IL | Reinforcement / Imitation Learning | 人形控制器主流训练范式 |
| DTW | Dynamic Time Warping | 波形相似度度量的常见候选 |
| Symmetry Index | 双侧对称性指数 | 度量左右肢能量/角度的不对称 |
| CoT | Cost of Transport | 行走能耗效率，能量学维度的常用指标 |

---

## ❓ 论文要解决什么问题？

近年 RL/IL 训练出的人形控制器在视频里看起来已经很"像人"。但「像不像人」一直只靠**人眼主观判断**或**奖励曲线 / tracking error** 这种工程化代理指标，缺少：

1. **生物力学维度的量化**：步态对称性、关节耦合、能量分布是不是真的接近人？
2. **跨速度可比性**：人在不同速度下步态会自然过渡（步频 / 关节贡献比变化），机器人在不同速度下的偏离模式是什么？
3. **可复现的公开基准**：没有公开的、带连续速度档的人 ↔ 人形配对数据集，研究无法横向比较。

GDAF 就是为了把这三件事一次性补齐：**统一指标 + 28 速扫描 + 数据集与可视化工具开放**。

---

## 🔧 方法拆解：GDAF 三维度

GDAF 把"人 vs 人形"的差距投影到 **三个互补维度**，**按关节 / 按速度** 分别计算，最后再聚合为综合分歧指数。

### 1. 波形相似度（Waveform Similarity）

- 对每个关节，比较一个步态周期内的**位置 / 力矩 / 功率曲线**与人类参考曲线的形状是否一致。
- 关键不只是"误差大小"，更是"形状（峰位 / 相位 / 拐点）"是否对齐。
- 实用上常用相关性 / DTW 等距离度量。

### 2. 双侧对称性（Bilateral Symmetry）

- 人类正常步态在左右肢上接近镜像（小幅度自然不对称）。
- 对每个**双侧关节对**（髋 / 膝 / 踝）计算 Symmetry Index 类指标。
- 这里捕获了 RL 策略常见的"偏好某条腿"或"轻微跛"的人眼难以发现的偏差。

### 3. 能量学行为（Energetic Behavior）

- 各关节做正/负功的分配、功率曲线峰值 / 时刻、整体 Cost of Transport。
- 人在加速时髋 / 踝的功率贡献会重新分配，这条线 RL 控制器目前最容易踩坑。

### 4. 28 速扫描 + 配对数据集

- 速度范围 **0.5–1.85 m/s**，步长 **0.05 m/s**，共 **28 个速度档**。
- 每个速度档采集 G1 在 SOTA RL 控制器下的关节位置、力矩、功率轨迹。
- 与同速度档的人类生物力学参考曲线**配对**，构成公开数据集。

### 5. 可视化与可复现工具

- 提供 MuJoCo 加载 29-DoF G1 模型的可视化工具，**人 / 机两条轨迹并排播放**，便于调试关节映射与运动学约束。
- 两个 Jupyter Notebook：
  - `GDAF_01_Data_Visualization.ipynb`：数据可视化与基础图表复现。
  - `GDAF_02_Divergence_Analysis.ipynb`：分歧度量计算与论文图复现。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph DATA["📂 配对步态数据 (28 个速度档, 0.5–1.85 m/s)"]
        H["👤 人类参考<br/>关节角 / 力矩 / 功率"]
        R["🤖 Unitree G1 (29-DoF)<br/>SOTA RL 控制器轨迹"]
    end

    subgraph GDAF["🧪 GDAF 三维度量"]
        D1["📈 波形相似度<br/>形状 / 相位 / 峰值"]
        D2["⚖️ 双侧对称性<br/>左右肢 Symmetry Index"]
        D3["⚡ 能量学行为<br/>正/负功分配 · CoT"]
    end

    subgraph OUT["📊 输出"]
        O1["逐关节 × 逐速度 分歧矩阵"]
        O2["综合分歧指数"]
        O3["MuJoCo 并排播放<br/>+ Jupyter 复现 Notebook"]
    end

    H --> D1
    R --> D1
    H --> D2
    R --> D2
    H --> D3
    R --> D3
    D1 --> O1
    D2 --> O1
    D3 --> O1
    O1 --> O2
    O1 --> O3

    style DATA fill:#fff7e0,stroke:#d4a017
    style GDAF fill:#e8f4fd,stroke:#1f78b4
    style OUT fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **GDAF 框架**：首个面向人形机器人评估的统一**生物力学**分析框架，三维度互补、按关节 × 按速度展开。
2. **28 速 G1 步态数据集**：业内首个**速度连续**的人 ↔ 人形配对生物力学数据集，公开发布。
3. **结论**：现代视觉上"像人"的 RL 人形控制器，**仍在对称性、能量分配、关节协调上存在系统性偏差**——视频好看 ≠ 生物力学接近人。
4. **工具链**：MuJoCo 可视化 + 两个复现 Notebook，**降低后续工作复现 / 扩展的门槛**。

---

## 📊 关键发现

| 维度 | 典型结论 |
|---|---|
| 波形相似度 | 摆动期外形大体接近人；触地 / 蹬地瞬间的形状偏离最明显 |
| 双侧对称性 | RL 策略普遍存在难以肉眼察觉的轻度左右不对称 |
| 能量分配 | 加减速时，G1 的髋 / 踝功率贡献比例与人不同，偏向"靠膝拉动" |
| 速度依赖 | 偏差**不是常数**——在低速 (< 0.7 m/s) 与高速 (> 1.5 m/s) 都被放大，中速最像人 |

> ⚠️ 具体数值与图表请以论文最终版为准；上表为结构性总结。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **奖励 / 评估** | 给 RL 训练提供更贴近"像人"目标的**生物力学惩罚项**或**评估指标**，而不是只看 tracking error |
| **跨控制器对比** | 把 PPO、动作模仿、Diffusion 等不同范式的控制器放进同一把"生物力学尺子" |
| **Sim-to-Real 调试** | 真机部署后，可用 GDAF 量化"真机 vs 仿真"或"真机 vs 人"的偏差，指导域随机化或执行器建模 |
| **临床 / 康复迁移** | 步态对称性 / 能量学是人类康复评估的标准指标，未来可桥接到机器人辅助康复研究 |

---

## 🎤 面试参考

**Q：GDAF 跟传统的 tracking error / reward 曲线相比，多了什么？**
A：tracking error 只衡量"和参考动作差多少"，对参考是否物理合理、是否人类化没有约束；reward 曲线是工程指标，不可跨实验比较。GDAF 用**生物力学三维度**（波形、对称性、能量），按关节 × 速度展开，输出**与控制器无关**、可跨实验复现的分歧度量。

**Q：为什么要做 28 个速度的扫描，而不是只测几个典型速度？**
A：人类步态随速度连续过渡（步频 / 关节贡献 / 重心轨迹都会变），偏差**不是常数**。只测一个速度可能错过"低速发抖、高速发飘、中速最像人"这类速度依赖结构。28 速给出**连续可比的曲线**，能直接指出策略最薄弱的速度区间。

**Q：能不能直接把 GDAF 接到 RL 训练里当奖励？**
A：原则上可以，但 GDAF 设计上**面向离线评估**——它依赖一段完整步态周期的统计量（波形 / 对称 / 能量），不是逐步可微的瞬时信号。最自然的用法是**离线诊断 + 训练后筛选**，或者把某一维度（如对称性）的简化版加进 reward 作惩罚项。

**Q：这套数据集相比 AMASS / HumanML3D 的差异？**
A：AMASS / HumanML3D 是**人类动作**为主，没有配对的机器人数据；GDAF 的数据集是**人 ↔ 人形配对**，且包含**力矩 / 功率**等动力学量，专门服务于机器人控制评估，而不是动作生成 / 重定向。

---

## 🔗 相关阅读

- [HumanoidBench (2403.10506)](https://arxiv.org/abs/2403.10506)：任务级别的人形 benchmark，与 GDAF 的"生物力学级 benchmark"互补
- [Real-World Humanoid Locomotion with RL (2303.03381)](https://arxiv.org/abs/2303.03381)：被评估的 SOTA RL 控制器代表，能跑但生物力学未必"像人"
- [Gait-Conditioned RL with Multi-Phase Curriculum (2505.20619)](https://arxiv.org/abs/2505.20619)：从控制器侧改善步态人类化
- [GaussGym (2510.15352)](https://arxiv.org/abs/2510.15352)：locomotion 仿真平台，可与 GDAF 评估管线联用
