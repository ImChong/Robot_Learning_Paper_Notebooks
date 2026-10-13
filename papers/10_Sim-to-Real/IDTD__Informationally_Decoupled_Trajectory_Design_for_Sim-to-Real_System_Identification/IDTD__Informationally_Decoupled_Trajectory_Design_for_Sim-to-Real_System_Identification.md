---
layout: paper
title: "Informationally Decoupled Trajectory Design for Sim-to-Real System Identification"
zhname: "IDTD：面向 Sim-to-Real 系统辨识的信息解耦轨迹设计"
category: "Sim-to-Real"
arxiv: "2610.10905"
---

# Informationally Decoupled Trajectory Design for Sim-to-Real System Identification
**采样式系统辨识要先上真机录一段轨迹。以往按 Fisher 信息的迹 $\mathrm{tr}(F^{-1})$ 设计这段轨迹，动作越猛分数越高，但参数之间的效果可能仍然缠在一起，辨识出来的是一组「能凑出同样轨迹的错参数」。IDTD 改用每个参数的 Schur 补，先除掉信息量本身（只留「还剩几成是它独有的」），再把 10 s 轨迹切成 5 段、每个参数取最好的那一段，最后对所有参数取对数和，让每个参数至少在某一段里被单独看清**

> 📅 总结日期: 2026-10-13
>
> 🏷️ 板块: 10 Sim-to-Real · 系统辨识 · 主动探索 · 实验设计 · Fisher 信息 · Schur 补 · Go2 / G1 / Crazyflie / Booster K1
>
> 🔁 推进轨: 模块轮转（09_State_Estimation → **10_Sim-to-Real**）· 取本模块尚无笔记的最新论文（2026.10）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.10905](https://arxiv.org/abs/2610.10905) |
| HTML | [arxiv.org/html/2610.10905v1](https://arxiv.org/html/2610.10905v1) |
| PDF | [下载 v1](https://arxiv.org/pdf/2610.10905v1) |
| **发布时间** | 2026-10-07（arXiv v1） |
| 状态 | 10 页（含附录），cs.RO |
| 源码 | 论文和 arXiv 页面都没有给代码或项目主页链接，截至 2026-10-13 也没搜到公开仓库，所以本篇**没有源码运行时序图**。仿真用的是 [Newton](https://newton-physics.github.io/newton/)，被比较的主动探索基线 SPI-Active 的笔记见[这里](../SPI-Active__Sampling-Based_System_Identification_with_Active_Exploration/SPI-Active__Sampling-Based_System_Identification_with_Active_Exploration.html) |

**作者**：Sangwoo Shin, Ashvin Anilkumar, Ryan Gao, Josiah P. Hanna（University of Wisconsin–Madison）

**平台**：仿真里是一维质量—阻尼系统、Unitree Go2（辨识 50 个参数）、Unitree G1（68 个）、Crazyflie 四旋翼（17 个）；真机是 Booster K1 人形（60 个执行器与关节参数）

---

## 🎯 一句话总结

IDTD 是一个给采样式系统辨识设计探索轨迹的目标函数：它让每个物理参数在轨迹的某一段里留下其他参数凑不出来的效果，避免辨识时「这个参数偏大、那个偏小，误差互相抵掉」。做法是把每个参数的 Schur 补拆成「信息量 × 解耦比」两半，用指数 $\alpha_i$ 压掉信息量，把轨迹切成 $M=5$ 段让每个参数取最好的那段，再对所有参数求 $\sum_i \log c_i$。用 CMA-ES 只优化预训练策略的**指令序列**（策略不动，真机采数据安全）。在 Newton 仿真里，相对最强的主动探索基线，参数辨识误差平均降 39.6%（Go2 10.28% → 7.31%，G1 3.72% → 1.28%），按辨识出的动力学重训的 Go2 策略摔倒率 1.81% → 0.71%；在真机 K1 上，留出轨迹的开环预测代价比标称模型降 14.4%（SPI-Active 10.0%）。

---

## 📌 英文缩写速查

| 缩写 / 术语 | 全称 | 解释 |
|---|---|---|
| SysID | System Identification | 系统辨识：调仿真器参数，让仿真轨迹对上真机轨迹 |
| FIM | Fisher Information Matrix | 轨迹对参数的「敏感度」累积，$F = \sigma^{-2}\sum_t J_t^\top J_t$ |
| CRB | Cramér–Rao Bound | 无偏估计的协方差下界是 $F^{-1}$ |
| A-optimal | — | 最小化 $\mathrm{tr}(F^{-1})$，SPI-Active / ASID 用的准则 |
| E-optimal | — | 最大化 $\lambda _ {\min}(F)$ |
| Schur 补 | Schur complement | $S_i = F _ {ii} - F _ {i,\backslash i}F _ {\backslash i,\backslash i}^{-1}F _ {\backslash i,i}$：扣掉其他参数能解释的部分后，关于 $\theta_i$ 还剩多少信息 |
| VIF | Variance Inflation Factor | 方差膨胀因子；IDTD 的「解耦比」就是 $1/\mathrm{VIF}_i$ |
| CMA-ES | Covariance Matrix Adaptation Evolution Strategy | 黑盒进化优化；本文既用它优化指令，也用它做辨识 |
| QOED | — | 只挑一部分任务相关参数提高可分辨性的对照方法 |

---

## ❓ 论文要解决什么问题？

采样式 SysID 的流程是：在真机上跑一段轨迹 → 在 GPU 并行仿真里撒一批候选参数 → 找让仿真轨迹最像真机的那组（式 1，用 CMA-ES）。它不用对仿真求导，接触、执行器这些难建模的效应都能直接算进去。但辨识得准不准，**很大程度取决于录的是哪段轨迹**。

以往的主动探索（SPI-Active、ASID）用 A-optimal 准则 $\mathrm{tr}(F^{-1})$ 选轨迹。问题在于这个准则把「信息有多少」和「参数分不分得开」混在一个数里：动作越猛，总信息越多，分数就越好看，即使某几个参数的效果仍然几乎共线。论文的例子：辨识质点的质量 $m$ 和阻尼 $c$，A-optimal 会让质点猛加速、跑得飞快，可这时 $m$ 与 $c$ 的敏感度几乎同向，「质量加一点、阻尼减一点」得到几乎一样的轨迹。人工设计时会交替安排「以加速度为主（$c\dot x \approx 0$）」和「以速度为主（$m\ddot x \approx 0$）」两种阶段；可现代机器人有几十个互相耦合的参数，每个参数需要的激励方式都不一样，没法手工排。

**目标**：给定一个预训练、受指令驱动的策略 $\pi$、一个标称参数 $\theta_0$ 和固定的采数据时长，设计一个替代式 4 的目标，让**所有**物理参数都能被准确辨识。

---

## 🔧 方法拆解

### 1. 为什么误差会「被别的参数吸收」（第 IV-A 节）

一维系统 $x _ {t+1} = x_t + \theta^\star u_t - \phi^\star \dot x_t + w_t$。固定阻尼的估计 $\hat\phi$ 后，$\theta$ 的最小二乘解满足

$$\mathbb{E}[\hat\theta] - \theta^\star = -(\hat\phi - \phi^\star)\cdot\frac{I _ {\theta\phi}}{I _ {\theta\theta}}$$

$\hat\phi$ 本身也是估出来的，不可能保证准，所以唯一能控制的是耦合比 $I _ {\theta\phi}/I _ {\theta\theta}$：要压的是**非对角项**，光把对角信息 $I _ {\theta\theta}$ 做大没用。Schur 补 $S_\theta = I _ {\theta\theta} - I _ {\theta\phi}I _ {\phi\phi}^{-1}I _ {\phi\theta}$ 同时反映信息量和可分离性。

### 2. 每个参数一个 Schur 补，然后拆成两半（第 IV-B、IV-C 节）

推广到 $N$ 维：$S_i(F)$ 衡量「扣掉其余参数能解释的部分后，关于 $\theta_i$ 还剩多少」。和 A-optimal 的关系是 $\mathrm{tr}(F^{-1}) = \sum_i 1/S_i$，所以 A-optimal 其实隐含地考虑了耦合，只是没把它和信息量分开。IDTD 做了两步归一化：

- **敏感度归一化**：$J_t$ 用有限差分算。参数量级差几个数量级，同一个绝对步长 $10^{-3}$ 对摩擦系数是 0.2%、对 $k_p$ 只有 0.001%，算出来的 FIM 会虚高摩擦、低估增益。所以每个参数的步长按搜索范围缩放，$\delta\theta_i \propto \mathrm{range}(\theta_i)$。
- **解耦归一化**：把 $S_i = F _ {ii}\cdot\big(1 - F _ {i,\backslash i}F _ {\backslash i,\backslash i}^{-1}F _ {\backslash i,i}/F _ {ii}\big)$ 拆成「信息量 $F _ {ii}$」×「解耦比 ∈ [0, 1]」。$F _ {ii}$ 在参数之间能差几个量级，直接最大化 $\sum S_i$ 会偏向「被激得很猛但仍分不开」的参数。于是定义 $d_i = S_i / F _ {ii}^{\alpha_i}$，$\alpha_i = 1$ 时只剩纯解耦比，$\alpha_i = 0$ 退回原始 Schur 补；实验里 $\alpha_i \in [0.7, 1.0]$，按参数组设定（附录表 VI）。

### 3. 分段覆盖 + 对数聚合（第 IV-D 节）

一段动作很难同时把所有参数分开，所以把轨迹切成 $M$ 段，每段算自己的 $F^{(s)}$：

- **覆盖分**：$c_i = \max_s d_i(F^{(s)};\alpha_i)$，每个参数挑自己最清楚的那一段，不同段可以各管一批参数；
- **目标**：$\max_c \sum_i \log(c_i + \varepsilon)$。哪个参数在所有段里都分不开（$c_i \to 0$），目标就掉向 $-\infty$，所以优化会优先照顾最差的参数。

### 4. 优化什么、怎么优化（第 V-B 节、附录 A–B）

- **只改指令、不动策略**：Go2 用 Walk These Ways 式的多行为策略（9 维指令：速度、步频、相位、抬脚高度、身高），G1 用 3 维速度跟踪，Crazyflie 用 2 维位置跟踪；
- 10 s 轨迹切 5 段、每段 2 s，每段每个指令通道用 6 个控制点的 5 次 Bézier 曲线；
- CMA-ES：$\sigma_0 = 0.25$，种群 20 / 12 / 20，最多 3000 代，目标变化 < $10^{-3}$ 早停；
- 有限差分：每个候选并行 8 组「标称 + $N$ 个单参数扰动」环境，每 5 个仿真步把扰动环境同步回标称，避免发散；Schur 补里的子块加 $10^{-6}I$ 正则。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph Pre["准备"]
        P0["仿真里预训练的指令条件策略 π<br/>（Go2：Walk These Ways 9 维指令；G1：3 维速度）"]
        P1["标称参数 θ₀<br/>与每个参数的搜索范围"]
    end

    subgraph Design["① 轨迹设计（仿真 · CMA-ES）"]
        C["候选指令序列 c⁽ᵖ⁾<br/>5 段 × 2 s，每段 5 次 Bézier"]
        R0["在 θ₀ 下滚出标称轨迹 τ"]
        RI["每个参数单独扰动 θ₀ + δθᵢ eᵢ<br/>δθᵢ ∝ range(θᵢ)，每 5 步同步回标称"]
        J["有限差分敏感度 Jₜ = (τᵢ − τ) / δθᵢ"]
        F["分段 Fisher 信息 F⁽ˢ⁾ = σ⁻² Σ Jₜᵀ Jₜ"]
        S["每个参数的 Schur 补 Sᵢ(F⁽ˢ⁾)"]
        D["解耦因子 dᵢ = Sᵢ / Fᵢᵢ^αᵢ<br/>（αᵢ ∈ [0.7, 1]，压掉信息量）"]
        CV["覆盖分 cᵢ = maxₛ dᵢ<br/>每个参数挑最清楚的一段"]
        OBJ["目标 Σᵢ log(cᵢ + ε)"]
        C --> R0 --> RI --> J --> F --> S --> D --> CV --> OBJ
        OBJ -->|"更新 CMA-ES 分布"| C
    end

    subgraph Real["② 上真机 / 目标系统采数据"]
        E["执行最优指令 c★<br/>策略 π 不变，只换指令"]
        Rec["记录 IMU 朝向 / 角速度、关节角 / 角速度"]
        E --> Rec
    end

    subgraph ID["③ 采样式系统辨识（式 1）"]
        CM["CMA-ES 搜索 θ"]
        Sim["并行仿真单步 f(sₜ, aₜ; θ)"]
        Loss["Σ ‖f(sₜ, aₜ; θ) − sₜ₊₁‖²"]
        CM --> Sim --> Loss -->|"更新"| CM
    end

    subgraph Out["④ 评估"]
        O1["参数误差（仿真有真值）"]
        O2["留出轨迹的开环预测误差"]
        O3["按辨识出的动力学重训策略<br/>→ 跟踪误差 / 摔倒率 / 能耗"]
    end

    Pre --> Design
    OBJ -->|"收敛后取最优 c★"| E
    Rec --> CM
    Loss --> Out
</div>

---

## 🚶 具体实例：为什么 $\mathrm{tr}(F^{-1})$ 会选错轨迹

沿用论文的一维质量—阻尼系统，两个参数 $(\theta, \phi)$，取 $\sigma = 1$，比较两条轨迹的 Fisher 信息（数字是为说明而设的，不是论文的实验）：

| | $I _ {\theta\theta}$ | $I _ {\phi\phi}$ | $I _ {\theta\phi}$ | 解耦比 $1-\rho^2$ | 原始 $S_\theta$ | $\mathrm{tr}(F^{-1})$ | 泄漏系数 $-I _ {\theta\phi}/I _ {\theta\theta}$ |
|---|---|---|---|---|---|---|---|
| 猛推型（一直正向用力） | 100 | 100 | −97 | 0.059 | 5.91 | **0.338** | 0.97 |
| 交替型（加速段 + 匀速段） | 4.5 | 4.5 | −0.8 | 0.968 | 4.36 | 0.459 | **0.178** |

- **A-optimal 选猛推型**：0.338 < 0.459。可是按第 1 节的式子，阻尼估偏 0.1，$\theta$ 就跟着偏 $0.97 \times 0.1 = 0.097$；交替型只偏 0.018。
- **原始 Schur 补（$\alpha=0$）也选猛推型**：5.91 > 4.36，因为信息量 $I _ {\theta\theta}=100$ 盖过了只有 0.059 的解耦比。这正是消融里 $\alpha=0$ 误差从 7.31% 涨到 22.68% 的原因。
- **IDTD（$\alpha=1$，$M=2$ 段）**：交替型的两段分别是加速段 $(4, 0.5, -0.4)$ 和匀速段 $(0.5, 4, -0.4)$，每段解耦比 $1 - 0.16/2 = 0.92$，目标 $2\ln 0.92 = -0.17$；猛推型的两段都是 $(50, 50, -48.5)$，解耦比 0.059，目标 $2\ln 0.059 = -5.66$。IDTD 选交替型。

（两参数时两个参数的解耦比相同，都是 $1-\rho^2$；参数一多，各参数的解耦比就不一样了，分段取 max 才有意义：一段管 $k_p$，另一段管摩擦。）

---

## 💡 核心贡献

1. **把「分不分得开」从「信息有多少」里拆出来**：每个参数的 Schur 补拆成信息量与解耦比两半，用 $\alpha_i$ 控制信息量占多少权重。
2. **分段覆盖 + 对数和**：不要求一段动作同时分开所有参数，只要求每个参数在**某一段**里分得开，最差的参数主导目标。
3. **两处工程细节**：有限差分步长按参数范围缩放；只优化预训练策略的指令，真机采数据时不改策略。
4. **覆盖四种平台**：线性系统、四足、人形、四旋翼的仿真，加 Booster K1 真机。

---

## 📊 关键发现

**参数辨识误差（表 I，按搜索范围归一化的百分比，2 个策略 × 5 个种子）**

| 平台 | IDTD | SPI-Active | E-Optimal | QOED | Passive |
|---|---|---|---|---|---|
| Go2（50 维） | **7.31** | 10.28 | 13.54 | 36.65 | 11.20 |
| G1（68 维） | **1.28** | 3.72 | 5.15 | 2.33 | 10.50 |
| Crazyflie（17 维） | 2.11 | 2.79 | **1.59** | 4.00 | 2.66 |

- Go2 上提升最大的是 $k_p$、$k_d$、关节摩擦和基座惯性参数，这几类在行走中最容易互相替代；Crazyflie 参数少，E-Optimal 略好，IDTD 仍有竞争力。

**下游迁移（表 II，Go2 按辨识出的动力学重训策略，在真值动力学下评测）**

| 方法 | 线速度误差 (m/s) | 角速度误差 (rad/s) | 摔倒率 (%) | 能耗 (J/m) |
|---|---|---|---|---|
| IDTD | **0.159** | **0.177** | **0.71** | **242.8** |
| SPI-Active | 0.186 | 0.187 | 1.81 | 255.4 |
| Passive | 0.190 | 0.234 | 2.59 | 270.2 |
| Zero-shot（标称参数） | 0.364 | 0.433 | 22.35 | 547.9 |

（E-Optimal 与 QOED 在 Go2 上辨识误差太大，按它们的参数训不出稳定策略，没有列入。）

**机理分析（图 5、图 6，G1）**

- 腕俯仰关节 $(k_p, k_d)$ 的 95% 置信椭圆：IDTD 接近圆，SPI-Active 和 E-Optimal 被拉得很长，长轴方向就是「一个偏大、另一个偏小」也看不出来的方向；
- 把各目标直接当奖励训 G1 全身策略：IDTD 的手臂、腿关节速度是 SPI-Active 的 1.95× / 1.44×，SPI-Active 主要靠躯干和腰的大幅运动刷分；E-Optimal 每个通道的激励都比 SPI-Active 弱。IDTD 的三组参数解耦因子都最高。

**消融（表 III，Go2 总误差）**：完整 7.31% · 段间取均值、参数间直接平均 10.47%（关节摩擦退化最明显）· 统一步长 8.31% · $\alpha=0$ 22.68%（最伤）。

**真机 Booster K1（表 IV）**：只用板载 IMU 和编码器、不用动捕，所以只辨识执行器和关节级的 60 个参数（力矩滞后时间常数 8、速度相关增益 8、关节摩擦 22、关节 armature 22）。留出轨迹的开环预测代价：标称 2.291 → Passive 2.018（−11.9%）· SPI-Active 2.061（−10.0%）· **IDTD 1.961（−14.4%）**，关节角 / 角速度 / 朝向误差也最低。

**局限**：K1 上的前向预测变好了，但下游控制的提升有限，作者认为是只靠板载传感器能辨识的参数太少，之后想加外部动捕去辨识更多参数。

---

## 🤖 对人形机器人领域的意义

- 对**用采样式 SysID 做 sim-to-real** 的团队，这篇把「录什么轨迹」从一个总分拆成了每个参数的可解释分数，换目标函数就能用，辨识器和策略都不用动；
- 它讲清楚了一个常被忽略的现象：**轨迹匹配代价低不等于参数准**。图 2 的线性系统里两条轨迹的匹配代价都降到了噪声底，但耦合的那条参数误差很大、留出轨迹预测也差，所以评估 SysID 必须看留出轨迹；
- G1 上 68 个参数、K1 上 60 个参数的规模说明，这套目标在人形的高维参数空间里仍然能用；但它依赖一个已经能稳定执行各种指令的预训练策略，指令空间多大，能探索的动作就有多大。

---

## 🎤 面试参考

- **问：A-optimal 准则 $\mathrm{tr}(F^{-1})$ 为什么会选出耦合的轨迹？**  
  答：$\mathrm{tr}(F^{-1}) = \sum_i 1/S_i$，而 $S_i$ 等于信息量乘解耦比。动作越猛信息量越大，即使解耦比很小，$S_i$ 也能很大，总分就好看。
- **问：IDTD 里 $\alpha_i$ 起什么作用？取 0 和 1 分别是什么？**  
  答：控制信息量在分数里占多少。$\alpha=1$ 是纯解耦比（与激励强度无关），$\alpha=0$ 是原始 Schur 补；实验用 0.7–1.0，消融里 $\alpha=0$ 误差翻了三倍。
- **问：为什么段间取 max、参数间取 log？**  
  答：max 允许不同段专门负责不同参数；log 让任何一个分不开的参数把目标拉向 $-\infty$，优化会先照顾最差的参数。
- **问：为什么只优化指令而不重训探索策略？**  
  答：保持预训练策略不变，真机采数据时行为仍在策略熟悉的范围内，比较安全；代价是能探索的动作被指令空间限制，所以 Go2 特意用了 Walk These Ways 的多行为指令。

---

## 🔗 相关阅读

- [SPI-Active](../SPI-Active__Sampling-Based_System_Identification_with_Active_Exploration/SPI-Active__Sampling-Based_System_Identification_with_Active_Exploration.html)：本文的主要对照，采样式 SysID + A-optimal 主动探索
- [PACE](../PACE_Systematic_Sim-to-Real_Transfer_for_Diverse_Legged_Robots/PACE_Systematic_Sim-to-Real_Transfer_for_Diverse_Legged_Robots.html)：另一条系统化执行器辨识的 sim-to-real 路线
- [DiffCoTune](../DiffCoTune__Differentiable_Co-Tuning_for_Cross-domain_Robot_Control/DiffCoTune__Differentiable_Co-Tuning_for_Cross-domain_Robot_Control.html)：可微仿真路线的跨域调参
- [域随机化](../../01_Foundational_RL/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World.html)：SysID 想替代的另一条路
- ASID（ICLR 2024）：操作臂上的 A-optimal 主动探索 SysID
- QOED（arXiv 2605.12084）：只针对任务相关参数子集最大化 Schur 补迹的对照方法
- Walk These Ways（CoRL 2023）：Go2 实验采用的多行为指令策略
