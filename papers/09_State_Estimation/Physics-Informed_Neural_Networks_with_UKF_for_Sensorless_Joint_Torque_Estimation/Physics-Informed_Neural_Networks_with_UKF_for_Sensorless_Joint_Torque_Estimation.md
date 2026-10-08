---
layout: paper
paper_order: 4
title: "Physics-Informed Neural Networks with Unscented Kalman Filter for Sensorless Joint Torque Estimation in Humanoid Robots"
zhname: "PINN + UKF：让没有力矩传感器的人形机器人也能做精准全身力矩估计"
category: "State Estimation"
---

# Physics-Informed Neural Networks with Unscented Kalman Filter for Sensorless Joint Torque Estimation in Humanoid Robots
**PINN + UKF：让没有力矩传感器的人形机器人也能做精准全身力矩估计**

> 📅 阅读日期: 2026-05-20
>
> 🏷️ 板块: State Estimation · Sensorless 力矩估计 · PINN · UKF · 谐波减速器摩擦
>
> 🔁 推进轨: 模块轮转（08_Navigation → **09_State_Estimation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2507.10105](https://arxiv.org/abs/2507.10105) |
| HTML | [在线阅读](https://arxiv.org/html/2507.10105v1) |
| PDF | [下载](https://arxiv.org/pdf/2507.10105) |
| IEEE Xplore | [document/10971218](https://ieeexplore.ieee.org/document/10971218/) |
| 视频 Demo | [YouTube：PINNs with UKF for Sensorless Joint Torque Estimation](https://www.youtube.com/watch?v=FufYAPuL_nA) |
| **发布时间** | 2025-07-14 (arXiv) |
| 源码（主） | [ami-iit/paper_sorrentino_ral2024_balancing_torque](https://github.com/ami-iit/paper_sorrentino_ral2024_balancing_torque)（C++ 控制框架，BSD-3-Clause） |
| 源码（前作 PINN） | [ami-iit/paper_sorrentino_2024_humanoids_friction_estimation](https://github.com/ami-iit/paper_sorrentino_2024_humanoids_friction_estimation)（Python 训练 + ONNX 部署） |
| 数据集 | HuggingFace `ami-iit/sensorless-torque-control`（摩擦 / 力矩，前作配套，本文复用） |
| 发表 | IEEE Robotics and Automation Letters (RA-L) 2025 |
| 提交日期 | 2025-07-14 |

**作者**：Ines Sorrentino, Giulio Romualdi, Lorenzo Moretti, Silvio Traversaro, Daniele Pucci

**机构**：Istituto Italiano di Tecnologia (IIT) · **Dynamic Interaction Control lab**（PI：Daniele Pucci）；第一作者同时挂 University of Manchester

**机器人**：**ergoCub**（IIT 自研全尺寸人形，iCub 谱系，**带高减速比谐波减速器，无关节力矩传感器**）

---

## 🎯 一句话总结

要让一台**没有关节力矩传感器**的人形机器人也能做力矩控制，就必须把"力矩"从其他传感器里**估**出来；论文的做法是：**先用 PINN 把谐波减速器最难刻画的非线性摩擦学下来，再把 PINN 的摩擦估计当作 UKF 的一个测量量喂进去**，最终在 ergoCub 真机平衡实验上让腿部 6 个关节的力矩跟踪 RMSE 落到 0.08–1.41 Nm，整体优于工业界默认基线 RNEA。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| PINN | Physics-Informed Neural Network | 物理信息神经网络（损失里嵌入物理先验作为软约束） |
| UKF | Unscented Kalman Filter | 无迹卡尔曼滤波（用 sigma point 处理非线性，避免雅可比线性化） |
| RNEA | Recursive Newton-Euler Algorithm | 递归牛顿-欧拉算法，从 q / q̇ / q̈ 反推关节力矩 |
| JTS | Joint Torque Sensor | 关节力矩传感器 |
| Harmonic Drive | - | 谐波减速器，高减速比、回程间隙小、但摩擦非线性强 |
| ergoCub | - | IIT 新一代全尺寸人形（iCub 后续平台） |
| CoM | Center of Mass | 质心 |
| F/T | Force/Torque | 六维力 / 力矩传感器 |

---

## ❓ 论文要解决什么问题？

人形机器人要做**柔顺交互、平衡、抗干扰**，最理想的就是**力矩控制**（torque control）——比位置控制顺、比阻抗控制直接。但工程上有一个绕不开的难题：

1. **关节力矩传感器 (JTS) 贵、占空间、加重量**：要让全身二三十个关节每个都装一颗高精度 JTS，成本和机械集成成本都会爆炸。
2. **现有"无传感器"方案 = RNEA**：用关节位置 / 速度 / 加速度，配上动力学模型反推力矩。漂亮、实时——但**强依赖精确动力学**，对下面两件事束手无策：
   - **谐波减速器的非线性摩擦**（Stribeck 效应、stiction、随速度变化的阻尼）；
   - **电机出力但关节几乎不动**（电流流过、减速器卡住）这种"看不见的力矩"。
3. **后果**：力矩估计带系统性偏差 → 跟踪误差大、能耗高、被推一把就稳不住。

论文的切入点：**把"难建模的摩擦"和"难融合的非线性观测"分两层处理**——PINN 专门攻摩擦，UKF 专门攻多传感器融合。

---

## 🔧 方法拆解

### 1. 整体架构：两层实时力矩控制框架

```
传感器（电流 / 编码器 / F-T / IMU）
        │
        ├──► PINN 摩擦模型（输入: q̇, θ̇_m → 输出: τ_f）
        │
        ▼
   UKF 力矩观测器（过程: RNEA；测量: 各传感器 + PINN 摩擦估计）
        │
        ▼
   动量基力矩控制器 (Momentum-Based Torque Control)
        │
        ▼
   电机电流指令
```

### 2. 底层 — PINN 摩擦模型（沿用前作 arXiv 2410.12685）

- **输入**：关节角速度 $\dot{q}$、电机角速度 $\dot{\theta}_m$
- **输出**：静态 + 动态非线性摩擦力矩 $\tau_f$
- **物理损失项**：把 **Stribeck–Coulomb–Viscous** 摩擦动力学写成软约束加进 loss，缓解纯数据驱动外推差的问题
- **训练 / 部署**：Python + Weights & Biases 训练，转 ONNX 进 C++ 控制框架

> 关键 motivation：纯黑箱 MLP 在静态 / 动态摩擦边界（譬如电机出力但关节不动）容易失稳；嵌入摩擦学经典公式作为先验后，外推泛化明显好转。

### 3. 上层 — UKF 力矩观测器

- **状态变量**：关节力矩 $\tau_j$ 及相关动力学量
- **过程模型**：离散时间非线性刚体动力学（RNEA-based）
- **测量模型**：把所有可用传感器统一到一组观测向量——电机电流、关节编码器、六维 F/T、IMU
- **关键创新点**：把 **PINN 的摩擦输出当作 UKF 的"测量量"** 而不是直接塞进过程模型——这样 PINN 的不确定性通过 **测量噪声协方差** 自然处理，对 PINN 的局部不准确更鲁棒
- **为什么是 UKF 不是 EKF**：sigma point 路径不需要算雅可比，对 RNEA + 摩擦这种强非线性更友好

### 4. 跟动量基力矩控制器闭环

UKF 估出 $\hat{\tau}_j$ 后，反馈给 `MomentumBasedTorqueControl`（仓库主目录可见），完成"估计 → 控制 → 电机指令"的实时闭环。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph SENS["🦿 ergoCub 传感器"]
        ENC["⚙️ 关节 / 电机编码器<br/>(q, θ_m, q̇, θ̇_m)"]
        CUR["⚡ 电机电流"]
        FT["💪 六维力 / 力矩"]
        IMU["📡 IMU"]
    end

    subgraph PINN["🟧 PINN 摩擦模型"]
        IN["⬅️ 输入: q̇, θ̇_m"]
        NET["🧠 小型 MLP<br/>(Stribeck–Coulomb–Viscous 物理 loss)"]
        OUT["🎯 输出 τ_f<br/>(关节摩擦力矩估计)"]
    end

    subgraph UKF["🟦 UKF 力矩观测器"]
        PROC["🔮 过程模型<br/>(RNEA 刚体动力学)"]
        SIG["✨ Sigma Points<br/>(无迹变换)"]
        MEAS["📐 测量融合<br/>(电流 / F-T / IMU + τ_f)"]
        EST["🧭 输出: τ̂_j<br/>(关节力矩估计)"]
    end

    subgraph CTRL["🟪 动量基力矩控制器"]
        MTC["🎛️ Momentum-Based<br/>Torque Control"]
        CMD["⚡ 电机电流指令"]
    end

    ENC --> IN
    IN --> NET --> OUT
    OUT --> MEAS
    ENC --> PROC
    CUR --> MEAS
    FT --> MEAS
    IMU --> MEAS
    PROC --> SIG --> MEAS --> EST
    EST --> MTC --> CMD --> SENS

    style SENS fill:#fff7e0,stroke:#d4a017
    style PINN fill:#fde8e8,stroke:#c0392b
    style UKF fill:#e8f4fd,stroke:#1f78b4
    style CTRL fill:#f3e8ff,stroke:#8e44ad
</div>

---

## 💡 核心贡献

1. **首次把 PINN 摩擦模型显式作为 UKF 测量量**：以前要么把数据驱动摩擦直接加进过程模型（误差传播复杂），要么完全靠手工 Stribeck 公式（精度不够）；本文给出了一个"既数据驱动又能定量管理不确定性"的中间路径。
2. **嵌入 Stribeck–Coulomb–Viscous 物理先验**：让 PINN 在训练集外的动作 / 速度区域仍能给出合理外推，是纯黑箱 MLP 摩擦模型的痛点修复。
3. **真机 ergoCub 平衡实验闭环验证**：包含 CoM 正弦跟踪、外部推拉扰动、单脚下垫物三种情景，全部走通"估计 → 力矩控制 → 平衡"链路，不只是离线 RMSE。
4. **完整开源（控制 C++ + PINN Python + 数据集）**：在 sensorless 力矩控制这条赛道少见——别人想复现 / 迁移到自己机器人难度大大降低。

---

## 📊 关键发现

| 维度 | 结果（基于公开摘要 + 视频） |
|---|---|
| **腿部 6 个关节力矩 RMSE** | **1.31 / 1.41 / 0.31 / 0.64 / 0.38 / 0.08 Nm**；整体区间 0.05–2.5 Nm（含外接触场景） |
| **基线** | state-of-the-art RNEA |
| **跟踪精度** | 优于 RNEA（reduced RMSE） |
| **能效** | 改善 motor 能耗，因为补偿了真实摩擦而不是把摩擦当作误差被控制器硬抗 |
| **抗扰能力** | 外部推 / 拉下稳定性更好（superior disturbance rejection） |
| **环境适应** | 单脚下放入 / 移除物体时瞬变响应更平滑 |

> 📌 具体"提升 X%" 百分比数字论文在表格中有给出，本笔记基于公开摘要 / 二级索引整理，待 PDF 表格 / IEEE 正式版进一步比对后补充。

---

## ⚠️ 局限性 & Future Work（作者列出）

- **实时计算开销**：UKF + PINN 推理放进控制循环的代价仍偏高，作者把"优化计算效率"列为 future work。
- **泛化到全身**：目前主要在腿部关节验证，扩展到上肢需要逐关节调参（PINN 容量 / UKF 协方差）。
- **更复杂任务**：从 dynamic balancing 推到 walking / running / 双臂操作，需要把摩擦模型在更大动力学窗口里再训练。

---

## 🤖 对人形 / 状态估计领域的意义

| 方向 | 含义 |
|---|---|
| **干掉关节力矩传感器** | 全身铺 JTS 太贵，sensorless 是工业落地必然路径；本文给出了一个有真机数据支撑的工程蓝图 |
| **PINN 不是替代物理，而是补物理空白** | 物理 loss 让 PINN 在边界 / 外推区间不至于乱跑——同样思路可迁移到弹性件 / 串联弹性驱动 / 软关节 |
| **数据驱动模型应当进入"测量"，而非"过程"** | 这是本文最值得记的一条工程哲学：把不可信但有用的估计当作带噪测量，让滤波自己去权衡 |
| **跟 InEKFormer / AutoOdom 形成方法论三角** | InEKFormer 用网络替代 Q/R 调参；AutoOdom 直接用网络替代里程计；本文则在 UKF 内嵌摩擦学习——同一时期的三种"经典滤波 + 学习"配方 |

---

## 🎤 面试参考

**Q：为什么不直接用 RNEA？**
A：RNEA 是从 q / q̇ / q̈ 反推力矩的解析方法，前提是动力学模型精确——但谐波减速器的摩擦是非线性、随速度 / 温度变化的"脏活"，模型化误差大。本文用 PINN 把摩擦学下来再融合进 UKF，相当于给 RNEA 打了一个"实时摩擦补偿 + 不确定性管理"的补丁。

**Q：PINN 跟普通 MLP 摩擦模型区别在哪？**
A：PINN 在 loss 里加了一项物理先验（Stribeck–Coulomb–Viscous 摩擦公式作为软约束）。结果是：在训练数据覆盖良好的速度区间两者差不多；但在数据稀疏 / 极端速度区间，PINN 不会乱跑，普通 MLP 容易出现非物理跳变——这对放进闭环控制至关重要。

**Q：为什么 PINN 摩擦输出当 UKF 的"测量量"而不是"过程项"？**
A：如果当过程项，PINN 的偏差会跟刚体动力学一起向前传播，UKF 没机会去 reject；当测量量，PINN 输出带一个测量噪声协方差 $R_f$，UKF 可以根据残差自动决定到底"信 PINN 多少"。等价于在 PINN 不靠谱的工作点上自动降低权重。

**Q：为什么是 UKF 不是 EKF？**
A：状态过程是 RNEA + 非线性摩擦，雅可比矩阵难写且数值不稳定。UKF 通过 sigma point 采样近似分布，避免手算雅可比、对强非线性更鲁棒。代价是状态维度大时 sigma point 数量也大、计算成本更高——这也是论文承认要优化的部分。

**Q：能不能直接用 RL 端到端学力矩控制，跳过这层估计？**
A：可以做研究，但工程上短期内难替代。原因：(1) sensorless 力矩控制是底层底层（毫秒级），端到端 RL 训练成本和稳定性都还不到产品级；(2) 力矩估计还要喂给上层平衡 / walking 控制器，作为可观测量比"黑盒动作"友好得多；(3) 这条路线（PINN + UKF）可以在不破坏现有控制栈的前提下渐进落地。

---

## 🔗 相关阅读

- 前作（Humanoids 2024）[2410.12685](https://arxiv.org/abs/2410.12685)：PINN 摩擦建模本身，本文的底层模块
- 前作（ICRA 2024）[2402.18380](https://arxiv.org/abs/2402.18380)：UKF 多传感器融合的早期工作
- [AutoOdom (2511.18857)](https://arxiv.org/abs/2511.18857)：本目录索引 368，纯学习里程计路线，本仓库已有笔记
- [InEKFormer (2511.16306)](https://arxiv.org/abs/2511.16306)：本目录索引 369，InEKF + Transformer 隐式学 Q/R，本仓库已有笔记
- [Contact-Aided Invariant EKF (1904.09251)](https://arxiv.org/abs/1904.09251)：状态估计模块经典背景，本仓库已有笔记

---

> 备注：本笔记基于 arXiv 摘要 + IEEE Xplore 索引 + 配套 GitHub README + YouTube 演示视频整理；arXiv 主站对自动化访问临时 403，PINN 的精确架构层 / 神经元数、各传感器协方差具体数值、RNEA 对比的"X% 提升"百分比待论文 PDF 正式释出后补充。
