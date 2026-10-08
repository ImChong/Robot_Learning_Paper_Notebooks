---
layout: paper
paper_order: 3
title: "InEKFormer: A Hybrid State Estimator for Humanoid Robots"
zhname: "InEKFormer：用 InEKF + Transformer 的混合滤波替代手调噪声协方差"
category: "State Estimation"
---

# InEKFormer: A Hybrid State Estimator for Humanoid Robots
**InEKFormer：人形机器人混合状态估计器**

> 📅 阅读日期: 2026-05-19
>
> 🏷️ 板块: State Estimation · 不变 EKF / Transformer 混合 · 人形浮动基状态估计
>
> 🔁 推进轨: 模块轮转（08_Navigation → **09_State_Estimation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2511.16306](https://arxiv.org/abs/2511.16306) |
| HTML | [在线阅读](https://arxiv.org/html/2511.16306) |
| PDF | [下载](https://arxiv.org/pdf/2511.16306) |
| 项目页 | [DFKI 出版页](https://www.dfki.de/en/web/research/projects-and-publications/publication/16541) |
| **发布时间** | 2025-11-20 (arXiv) |
| 源码 | 截至当前未见公开发布（论文未给出 GitHub 链接） |
| 提交日期 | 2025-11 |

**作者**：Lasse Hohmeyer, Mihaela Popescu, Ivan Bergonzani, Dennis Mronga, Frank Kirchner

**机构**：University of Bremen · DFKI Robotics Innovation Center（德国不来梅大学 / 德国人工智能研究中心机器人创新中心）

**机器人**：**RH5**（DFKI 自研全尺寸人形，32 DoF；IMU 400 Hz、关节编码器 ~150 Hz、踝部六维力/力矩 1 kHz）

---

## 🎯 一句话总结

InEKFormer 把经典 **不变扩展卡尔曼滤波（InEKF）** 的几何结构保留下来，但**让 Transformer 从一段「状态 / 观测残差」的历史里隐式输出噪声相关的修正量**，从而绕开「手调噪声协方差 Q/R」这件让所有滤波工程师头大的活；在 RH5 真机数据上跟 InEKF / KalmanNet 两条基线对照，验证了 Transformer 在人形高维状态估计里的可行性，同时也点出了「自回归训练不鲁棒就会爆」的现实问题。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| EKF | Extended Kalman Filter | 扩展卡尔曼滤波 |
| InEKF | Invariant EKF | 不变扩展卡尔曼滤波（在李群上建模，误差动力学线性化质量更高） |
| KalmanNet | - | 用 RNN 在线学 Kalman 增益的混合滤波（Revach et al., 2022） |
| Q / R | Process / Measurement Covariance | 过程噪声 / 观测噪声协方差矩阵 |
| Floating Base | - | 浮动基，足式机器人 base 坐标系相对于世界系的位姿+速度 |
| AR | Auto-regressive | 自回归（训练时用模型自己上一步的预测） |
| RH5 | - | DFKI 全尺寸人形，32-DoF |

---

## ❓ 论文要解决什么问题？

人形机器人在跑控制器之前，需要**精确估计浮动基状态**（base 的位姿 + 线速度 + 角速度），让运动控制器收到一个干净的反馈。传统做法有两条路：

1. **InEKF 等经典滤波**：在 SE(3) / SE_2(3) 等李群上做几何建模，理论漂亮、实时性好——但 **过程噪声 Q 和观测噪声 R 必须靠专家手调**，调一次换一台机器，调一次换一个步态，调一次又换一片地面，调坏一次就**整体发散**。
2. **纯数据驱动**：直接用网络回归状态。但人形是高维非线性系统，监督信号不好拿，模型缺少几何结构容易在分布外失稳。

InEKFormer 提出的折中：**保留 InEKF 的几何结构作为「骨架」，让 Transformer 从「状态/观测残差的历史窗口」里隐式学出原本要手调的那部分信息**——本质上是用 Transformer 把「不知道怎么调 Q/R」这个工程黑盒变成可学习的、能跨数据集泛化的模块。

---

## 🔧 方法拆解

### 1. 整体思路：把 Transformer 嫁接到 InEKF 上

InEKFormer 是个 **InEKF + Transformer 的混合滤波**：

- **InEKF 骨架**：状态在 SE_2(3)（或类似的李群）上传播；预测 / 更新两步的几何形式保持不变；
- **Transformer 模块**：吃一段历史的 **「状态差 + 观测差」**（也就是滤波过程中天然产生的 innovation / residual 序列），输出一个**与噪声相关的修正量**，注入到滤波的预测 / 更新环节里。

> 这里的关键设计哲学：**不学滤波的几何部分**（那是 InEKF 已经做得很好的），**只学传统上需要手调的那部分**（噪声协方差 / 增益）。

### 2. 为什么不直接学整个 Kalman 增益？

这是 **KalmanNet** 的做法（用 RNN 在线学增益矩阵 K）。InEKFormer 选 Transformer 的两点考虑：

| 维度 | RNN（KalmanNet） | Transformer（InEKFormer） |
|---|---|---|
| 历史依赖 | 隐状态滚动，长程容易遗忘 | 自注意力，对一段窗口的长程关系建模更直接 |
| 高维输入 | 维度爆炸时训练不稳 | 注意力机制能更好处理多传感器多维度的残差序列 |
| 训练形式 | 容易受 Exposure Bias 影响 | 同样有 AR 训练难题，论文专门点出了这一点 |

### 3. 输入 / 输出形态（基于论文描述与同类工作推断）

| 项 | 内容 |
|---|---|
| **滤波状态** | base 旋转 / 位置 / 速度 + IMU 偏置（InEKF 标准状态向量） |
| **传感器输入** | IMU 400 Hz（线加速度 + 角速度）、关节编码器 ~150 Hz、踝部 6 轴 F/T 1 kHz |
| **Transformer 输入** | 一段历史的「状态差 + 观测差」序列（innovation + 状态增量） |
| **Transformer 输出** | 噪声相关修正量（实际形态可能是协方差缩放、增益偏置或更新残差） |
| **滤波输出** | 浮动基 6D 位姿 + 速度，喂给下游运动控制器 |

### 4. 训练范式与「自回归坑」

- 训练时让 Transformer 看到的「残差历史」必须和测试时一致——但测试时残差是用模型当前估计算出来的，存在 **Exposure Bias**；
- 论文实证发现：**如果不做鲁棒的自回归训练**，Transformer 在高维 RH5 状态估计上会被自己的预测误差滚雪球放大；
- 这与 AutoOdom（索引 368）的结论相互印证——**自回归训练不是可选项，是这类「用网络在闭环系统里替代手调参数」工作的标准动作**。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph SENS["🦿 RH5 传感器 (400 Hz / 150 Hz / 1 kHz)"]
        IMU["📡 IMU<br/>(线加速度 / 角速度)"]
        ENC["⚙️ 关节编码器"]
        FT["💪 踝部 6 轴 F/T"]
    end

    subgraph INEKF["🟦 InEKF 几何骨架 (李群预测/更新)"]
        PRED["🔮 预测步<br/>(IMU 积分, SE_2(3))"]
        MEAS["📐 观测模型<br/>(运动学 + 接触约束)"]
        STATE["🧭 估计状态<br/>(base R / p / v, IMU bias)"]
    end

    subgraph TRANS["🟧 Transformer 学习模块"]
        BUF["📚 历史窗口缓存<br/>(状态差 + 观测差)"]
        ATT["🧠 自注意力<br/>(残差序列建模)"]
        OUT["🎯 噪声相关修正量<br/>(替代手调 Q / R)"]
    end

    subgraph TRAIN["🟪 训练范式"]
        SUP["📊 监督信号<br/>(基于 RH5 数据)"]
        AR["🔁 自回归训练<br/>(论文重点提示:必须鲁棒)"]
    end

    IMU --> PRED
    ENC --> MEAS
    FT --> MEAS
    PRED --> STATE
    MEAS --> STATE
    STATE --> BUF
    PRED --> BUF
    MEAS --> BUF
    BUF --> ATT --> OUT
    OUT --> PRED
    OUT --> MEAS
    STATE --> CTRL["🤖 运动控制器"]

    SUP --> ATT
    AR --> ATT

    style SENS fill:#fff7e0,stroke:#d4a017
    style INEKF fill:#e8f4fd,stroke:#1f78b4
    style TRANS fill:#fde8e8,stroke:#c0392b
    style TRAIN fill:#f3e8ff,stroke:#8e44ad
</div>

---

## 💡 核心贡献

1. **首次把 Transformer 显式嵌入 InEKF 几何骨架做人形浮动基状态估计**：保留李群理论优势，同时摆脱噪声协方差手调。
2. **学习目标聚焦在「传统手调那一层」**：不是端到端替换滤波，而是替换 Q / R 这类专家先验，工程上更容易接受、也更易解释。
3. **在 RH5 真实人形数据上对照 InEKF / KalmanNet 双基线**：直接对齐两条主流路径（解析 / RNN 混合）。
4. **诚实指出自回归训练的脆弱性**：论文不只展示好结果，还把「高维状态估计下 AR 训练必须鲁棒」当作主要 take-away，对后续工作有参考价值。

---

## 📊 关键发现（基于论文摘要）

| 维度 | 结论 |
|---|---|
| **跟 InEKF 比** | 在 RH5 真实数据上，Transformer 隐式学到的修正能带来收益（无需逐场景手调 Q/R） |
| **跟 KalmanNet 比** | Transformer 对长历史 / 高维残差的建模能力更具优势 |
| **训练范式警示** | **不做鲁棒自回归训练，高维状态估计会被自身预测误差放大** |
| **可迁移性** | 方法论可推广到 wheeled / aerial 等任何依赖噪声协方差的滤波场景 |

> 📌 具体数值（ATE / RMSE 等）以论文表格为准，本笔记基于 arXiv 摘要 + DFKI 出版条目整理，待 PDF / 源码释出后再补充。

---

## 🤖 对人形 / 状态估计领域的意义

| 方向 | 含义 |
|---|---|
| **解放调参工程师** | 把「Q/R 调一周才能上机」的痛点变成「网络从数据里学」 |
| **几何先验仍然重要** | 没有完全抛弃 InEKF——李群结构提供的不变性是高维稳定的关键 |
| **AR 训练成为标配** | 跟 AutoOdom 的结论一致，凡是在闭环系统里用网络替代某层参数，**训练时就要让模型吃自己的预测** |
| **跨平台潜力** | 只要滤波框架是 Kalman-like，就可以把这套 Transformer 修正模块接上去 |
| **与纯学习里程计互补** | AutoOdom 这类「纯学习」走的是另一条路；InEKFormer 走的是「几何 + 学习」中间路径，两者都在 2025 末同时出现，反映了趋势 |

---

## 🎤 面试参考

**Q：InEKFormer 和 KalmanNet 最大的区别是什么？**
A：两者都是「保留 Kalman 滤波几何 + 用网络学难调的部分」，但 (1) **学的对象**：KalmanNet 学的是 Kalman 增益 K；InEKFormer 学的是「噪声相关修正量」，再注回滤波；(2) **网络结构**：KalmanNet 用 RNN，长程残差容易遗忘；InEKFormer 用 Transformer，对一段窗口的状态/观测差建模更直接；(3) **几何骨架**：InEKFormer 用的是 InEKF（在李群上做预测/更新），相比 EKF 误差线性化更准、不变性更强。

**Q：为什么不直接用 Transformer 端到端做状态估计？**
A：人形是高维 + 强非线性 + 接触切换频繁的系统，纯网络缺少几何结构会在分布外失稳；而且监督数据需要高精度真值（动捕 / GPS），代价高。保留 InEKF 几何骨架的好处是：**先验先把状态约束在合理流形上**，网络只需要学「专家本来要手调的那一层」，问题维度被大大压低。

**Q：论文说「自回归训练必须鲁棒」，这是什么意思？**
A：训练时模型看到的「残差历史」是用 ground-truth 状态算出来的；测试时只能用模型自己的估计算残差。如果训练 / 测试分布不一致（Exposure Bias），模型在闭环里会被自身误差滚雪球放大——尤其在高维状态空间，几条维度同时偏一点点，整体就会发散。鲁棒的 AR 训练就是要在训练阶段就让模型经历「自己造的误差」，跟 AutoOdom (索引 368) 在纯学习里程计上的结论是一样的。

**Q：这种方法能直接迁移到四足或无人机吗？**
A：可以。论文明确指出方法适用于「任何依赖状态估计、且存在模型失配 / 传感器噪声的机器人平台」——只要底座滤波是 Kalman-like，把 Transformer 修正模块挂到 innovation / residual 序列上就行。差别只在传感器配置和接触模型。

---

## 🔗 相关阅读

- [AutoOdom (2511.18857)](https://arxiv.org/abs/2511.18857)：**同期** 09_State_Estimation 中的「纯学习自回归」路线，本仓库已有笔记
- [Contact-Aided Invariant EKF (1904.09251)](https://arxiv.org/abs/1904.09251)：InEKF 在足式机器人上的经典实现，本仓库已有笔记
- [The invariant extended Kalman filter as a stable observer (1410.1465)](https://arxiv.org/abs/1410.1465)：InEKF 的理论奠基
- [KalmanNet: Neural Network Aided Kalman Filtering (2107.10043)](https://arxiv.org/abs/2107.10043)：用 RNN 学 Kalman 增益的混合滤波，InEKFormer 的主要对照基线
- [Multi-IMU Proprioceptive State Estimator for Humanoid Robots (2307.14125)](https://arxiv.org/abs/2307.14125)：多 IMU 本体感知状态估计的并行方向

---

> 备注：本笔记基于 arXiv 摘要 + DFKI 出版页 + 公开搜索结果整理，方法细节（Transformer 架构层数 / 注意力头数 / loss 形式 / 鲁棒 AR 训练的具体做法 / 实测 ATE / RMSE 数值）待官方代码 / 完整 PDF 进一步释出后补充。
