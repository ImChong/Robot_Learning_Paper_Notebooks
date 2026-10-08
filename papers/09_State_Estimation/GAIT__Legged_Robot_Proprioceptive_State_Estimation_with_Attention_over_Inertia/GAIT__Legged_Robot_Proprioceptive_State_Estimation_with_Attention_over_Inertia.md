---
layout: paper
paper_order: 8
title: "GAIT: Legged Robot Proprioceptive State Estimation with Attention over Inertial-Leg Tokens"
zhname: "GAIT：用「惯性-腿部」分词与注意力做足式机器人本体感知状态估计"
category: "State Estimation"
---

# GAIT: Legged Robot Proprioceptive State Estimation with Attention over Inertial-Leg Tokens
**GAIT：用「惯性-腿部」分词与注意力做足式机器人本体感知状态估计**

> 📅 阅读日期: 2026-07-04
>
> 🏷️ 板块: State Estimation · 本体感知状态估计 · 注意力分词 · IEKF
>
> 🔁 推进轨: 模块轮转（08_Navigation → **09_State_Estimation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2606.14160](https://arxiv.org/abs/2606.14160) |
| HTML | [在线阅读](https://arxiv.org/html/2606.14160v1) |
| PDF | [下载](https://arxiv.org/pdf/2606.14160) |
| **发布时间** | 2026-06-12 (arXiv) |
| 源码 / 权重 | 截至当前未见公开发布（论文未给出 GitHub / 项目页链接） |
| 提交日期 | 2026-06 |

**作者**：Young-Rang Seo, Hajun Kim, Sangmin Kim, Dongyun Kang, Hae-Won Park

**机构**：韩国科学技术院（**KAIST**），通讯作者 haewonpark@kaist.ac.kr

**机器人**：**Unitree Go1** 四足机器人（RaiSim 仿真采集 + 真机验证）

---

## 🎯 一句话总结

GAIT 把足式机器人的本体感知测量做成「**惯性-腿部（Inertial-Leg, IL）分词**」——IMU 是一路 token、每条腿各是一路 token——再用轻量的 **Perceiver IO 交叉注意力** 学习「哪路测量此刻更可信」。因为一条腿只有**触地时**的前向运动学速度才可靠，注意力天然学到了「按接触状态重新赋权」这件事，**不需要显式接触估计器**。网络只用 **trot（对角小跑）** 数据训练，却能泛化到 bound / pace / pronk 等**未见步态**，并把估出的机身速度喂进 **IEKF** 得到完整位姿——同时推理只需 0.12 MFLOPs、0.7 ms。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| Proprioceptive | - | 本体感知（IMU + 关节编码器），不含视觉 / LiDAR |
| IL Token | Inertial-Leg Token | 把惯性测量与各条腿测量分别编码成独立 token |
| Perceiver IO | - | 用少量可学习 latent token 做交叉注意力，把复杂度从 O(N²) 降到 O(MN) |
| IEKF / InEKF | (Invariant) Extended Kalman Filter | 不变扩展卡尔曼滤波，状态定义在李群 SE₂(3) 上 |
| NMN | Neural Measurement Network | 对比基线：学习式测量网络，预测接触概率 + 机身速度 |
| GRU | Gated Recurrent Unit | 门控循环单元，这里用来编码时间维 |
| RMSE / ATE / RE | Root Mean Sq. Err / Absolute Traj. Err / Relative Err | 速度与轨迹误差指标 |
| Slip Rejection (SR) | - | 打滑异常剔除，接触辅助 IEKF 的增强版 |

---

## ❓ 论文要解决什么问题？

足式机器人估计机身速度 / 位姿时，主流有两条路，各有死结：

1. **接触辅助 IEKF（模型驱动）**：靠「支撑足零速度」假设做测量更新，但**接触判断一旦出错**（打滑、软地形、腾空步态）就会注入错误约束，需要额外的接触估计器 + 打滑剔除逻辑来打补丁；
2. **学习式估计（如 NMN）**：直接把所有传感器**拼成一个大向量**喂进网络。问题是网络看不到「测量的结构」——它不知道第 3 维来自哪条腿、这条腿此刻是否触地，泛化到训练时没见过的步态就容易崩。

GAIT 的答案：**保留测量的结构**。把 IMU 和每条腿分别做成 token，用注意力显式学习「按接触状态给每路测量赋权」，从而**不需要显式接触检测**，也天然对未见步态鲁棒。

---

## 🔧 方法拆解

### 1. Inertial-Leg（IL）分词

- **惯性 token**：角速度、线加速度，用两个独立 embedding 层编码；
- **腿部 token**：每条腿的关节角、关节速度、跟踪误差，用一个**共享** embedding 层编码；
- 对四足 → 共 **6 个 token**（2 惯性 + 4 腿）。相比「拍平成一个大向量」，这保留了「哪路来自哪条腿」的结构信息。

### 2. Perceiver IO 交叉注意力

- 用 **2 个可学习 latent token** 做交叉注意力，把复杂度从标准自注意力的 O(N²D) 降到 **O(MND)**（M 为 latent 数）；
- **2 个注意力头**，在 IL 轴与时间轴上都加 2D 位置编码；
- 关键收益：注意力权重会**随接触状态变化**——触地腿的前向运动学速度可信 → 权重高；腾空腿不可信 → 权重压低。这一步**没有显式接触标签**，完全由数据里的一致性学出来。

### 3. GRU-MLP 时间编码 + 不确定度输出

- **时间窗口 Nₜ = 7 步**，GRU（64 维隐状态）编码测量的时序；
- 网络输出：机身系线速度 **v_B ∈ ℝ³** + 对应的**不确定度 u ∈ ℝ³**（对角协方差 Σ = diag(e^{2u})）。

### 4. 两段式损失

- **前 400 次迭代**：平均绝对误差 ℒ_MAE，先把速度学准；
- **后续迭代**：高斯最大似然 ℒ_ML，联合学「速度 + 不确定度」，让网络知道**自己什么时候没把握**。
- 训练用 **20% 概率随机掩掉 IL token**，逼网络在缺测量时也能工作。

### 5. 接进 IEKF 做完整状态

- 网络输出的 (v_B, u) 作为**带自适应协方差的速度测量**，喂给 **IEKF**；
- IEKF 状态 X_t ∈ SE₂(3)（世界系下的姿态、线速度、位置 + IMU bias），输出完整、低漂移的位姿轨迹。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph SENS["🦿 本体感知测量"]
        IMU["📡 IMU<br/>(角速度 / 加速度)"]
        LEG["⚙️ 各条腿<br/>(关节角/速度/跟踪误差)"]
    end

    subgraph TOK["🟦 IL 分词"]
        TI["🟠 惯性 token ×2<br/>(独立 embedding)"]
        TL["🟢 腿部 token ×4<br/>(共享 embedding)"]
        IMU --> TI
        LEG --> TL
    end

    subgraph NET["🧠 注意力网络"]
        ATTN["🔀 Perceiver IO 交叉注意力<br/>(2 latent · 2 head · 2D 位置编码)"]
        GRU["⏱️ GRU-MLP 时序编码<br/>(窗口 Nt=7)"]
        OUT["📈 输出: 机身速度 v_B<br/>+ 不确定度 u (对角协方差)"]
        TI --> ATTN
        TL --> ATTN
        ATTN --> GRU --> OUT
    end

    subgraph FILT["🟧 IEKF 融合"]
        IEKF["🧮 IEKF on SE₂(3)<br/>(姿态/速度/位置 + IMU bias)"]
        POSE["🧭 完整低漂移位姿轨迹"]
        OUT -->|速度测量 + 自适应协方差| IEKF
        IMU -->|预测步| IEKF
        IEKF --> POSE
    end

    subgraph KEY["💡 关键机制"]
        WGT["注意力按接触状态<br/>自动给每路测量赋权<br/>(无需显式接触检测)"]
    end

    ATTN -.体现.-> WGT

    style SENS fill:#fff7e0,stroke:#d4a017
    style TOK fill:#e8f4fd,stroke:#1f78b4
    style NET fill:#f3e8ff,stroke:#8e44ad
    style FILT fill:#fde8e8,stroke:#c0392b
    style KEY fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **Inertial-Leg 分词**：不再把测量拍平成大向量，而是保留「惯性 / 各条腿」的结构，让网络能按测量来源区别对待。
2. **接触隐式建模**：注意力自动学出「触地腿权重高、腾空腿权重低」，**省掉了显式接触估计器与打滑剔除逻辑**。
3. **跨步态泛化**：只用 trot 训练，就在 bound / pace / pronk 等未见步态上大幅超越 NMN。
4. **轻量高效**：0.12 MFLOPs / 步、0.7 ms 延迟，比标准自注意力低约 2.8×、比 NMN 低约 3.3×，适合真机实时部署。

---

## 📊 关键发现

**未见步态下的机身线速度 RMSE（vs NMN）**

| 步态 | GAIT | NMN | 提升 |
|---|---|---|---|
| Trot（训练可见） | 0.105 m/s | 0.135 m/s | — |
| Bound（未见） | 0.318 m/s | 0.401 m/s | ~21% |
| Pace（未见） | 0.318 m/s | 0.677 m/s | ~53% |
| Pronk（未见） | 0.363 m/s | 0.566 m/s | ~36% |

**完整状态估计（多地形均值）**

| 指标 | GAIT | 基线 | 提升 |
|---|---|---|---|
| ATE（速度） | 0.134 m/s | 0.152 m/s（IEKF+SR） | ~12% |
| 相对位置误差 | 0.165 m | 0.235 m（NMN） | ~30% |

> 📌 消融：在**仿真里没建模的 debris（碎石）地形**上，去掉 IL 分词时相对位置误差比理想大 114.6%，加上 IL 分词后降到 73.6%——分词结构对分布外地形的鲁棒性贡献明显。

---

## 🤖 对人形 / 状态估计领域的意义

| 方向 | 含义 |
|---|---|
| **省掉接触估计器** | 接触辅助 IEKF 的老大难是「接触判断错 → 约束错」，GAIT 用注意力把接触信息隐式吸进权重，绕开了这条脆弱链路 |
| **结构化输入范式** | 「按传感器语义分词」是比「拼大向量」更可迁移的输入设计，对人形（更多自由度、更多接触点）尤其有价值 |
| **学习 + 滤波的干净接口** | 网络只负责出「速度 + 不确定度」，重活交给 IEKF，兼顾学习的表达力与滤波的几何一致性 |
| **实时友好** | 亚毫秒推理 + 极低 FLOPs，可直接跑在机载算力受限的四足 / 人形上 |

---

## 🎤 面试参考

**Q：GAIT 为什么能不做显式接触检测就利用接触信息？**
A：因为它把每条腿做成独立 token，交叉注意力会学习「这路测量此刻可不可信」的权重。而一条腿的前向运动学速度**只有触地时才可靠**，所以「按可信度赋权」在物理上就等价于「按接触状态赋权」——接触信息是被注意力**隐式**学进去的，不需要单独的接触估计器和打滑剔除。

**Q：只用 trot 训练，为什么能泛化到 bound / pace / pronk？**
A：关键在输入结构。把测量拍平成大向量的网络（如 NMN）学到的是「这些维度的具体数值组合」，换步态数值分布一变就失效；而 IL 分词让网络学的是「**惯性 token 与腿部 token 之间该如何按接触相互加权**」这条更本质的规律——这条规律跨步态是共享的，所以能迁移。

**Q：网络为什么要同时输出不确定度？**
A：因为它下游要接 IEKF。IEKF 做测量更新时需要知道这个速度测量的**协方差**；GAIT 用高斯最大似然损失让网络学出「自己此刻有多大把握」，于是 IEKF 拿到的是**自适应协方差**——不确定时自动放大方差、少信这一测量，这比给一个固定协方差鲁棒得多。

**Q：和 AutoOdom 那种纯学习里程计比，思路差别在哪？**
A：AutoOdom 是**端到端纯学习**出位姿增量、绕开滤波；GAIT 是**学习负责局部速度测量、滤波负责几何积分**的混合式。GAIT 更强调「保留测量结构 + 输出不确定度喂给 IEKF」，工程上与经典 InEKF 栈的兼容性更好。

---

## 🔗 相关阅读

- [Contact-Aided Invariant EKF (1904.09251)](https://arxiv.org/abs/1904.09251)：接触辅助 IEKF 的奠基工作，本仓库已有笔记，是 GAIT 的主要模型驱动对比对象
- [AutoOdom (2511.18857)](https://arxiv.org/abs/2511.18857)：纯学习式本体感知里程计，本仓库已有笔记，走「绕开滤波」的另一条路
- [InEKFormer (2511.16306)](https://arxiv.org/abs/2511.16306)：InEKF + Transformer 混合式状态估计，本仓库已有笔记
- [Neural Measurement Network / 学习式测量网络](https://arxiv.org/abs/2402.00366)：GAIT 的主要学习式对比基线思路（拼大向量的代表）
- [OCELOT: Odometry and Contact Estimation for Legged Robots (2605.21863)](https://arxiv.org/abs/2605.21863)：同期的里程计 + 接触估计并行工作
- [Four Simple Proprioceptive Estimators for Legged Robots (2605.23100)](https://arxiv.org/abs/2605.23100)：同期极简本体感知估计器对照

---

> 备注：本笔记基于 arXiv 摘要 + HTML 全文 + 公开搜索整理，部分超参数（latent/头数、GRU 维度、迭代数等）以论文正文为准；截至当前作者未公开代码，网络实现细节待官方释出后补充。
