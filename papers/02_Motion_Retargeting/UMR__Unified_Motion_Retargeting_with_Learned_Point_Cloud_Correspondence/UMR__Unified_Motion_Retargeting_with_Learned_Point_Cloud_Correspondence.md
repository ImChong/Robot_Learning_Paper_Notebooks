---
layout: paper
title: "Unified Motion Retargeting for Humanoids with Learned Point Cloud Correspondence"
zhname: "UMR：基于学习点云对应的人形统一动作重定向"
category: "Motion Retargeting"
paper_order: 5
arxiv: "2609.02134"
---

# Unified Motion Retargeting for Humanoids with Learned Point Cloud Correspondence
**把人和机器人的「体表点云」当作统一接口：先在 T-pose 下学一套稠密的人—机表面对应，再用这些点对当锚点做带约束的位姿优化，重定向从此不需要手工指定关节映射，接触关系也能一并搬过去。**

> 📅 阅读日期: 2026-09-19
>
> 🏷️ 板块: Motion Retargeting · 稠密表面对应 · 约束 Gauss-Newton QP · 接触迁移
>
> ℹ️ 笔记已对照 [arXiv HTML 2609.02134v2](https://arxiv.org/html/2609.02134v2) 全文（含 Table I–IV 数字）、[项目主页](https://hanyang9.github.io/UMR/) 与官方仓库 [hanyang9/UMR](https://github.com/hanyang9/UMR)（README、`humanoid_retarget_defaults.json`、`scripts/` 目录）整理。

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| **arXiv** | [2609.02134](https://arxiv.org/abs/2609.02134) |
| HTML | [在线阅读 v2](https://arxiv.org/html/2609.02134v2) |
| PDF | [下载](https://arxiv.org/pdf/2609.02134) |
| 项目主页 | [hanyang9.github.io/UMR](https://hanyang9.github.io/UMR/) |
| **源码** | [hanyang9/UMR](https://github.com/hanyang9/UMR) — 官方实现，含 5 款机器人配置与 8 类数据源适配指引 |
| 配套工具 | [UMR Studio](https://hanyang9.github.io/UMR/umr_studio.html)（浏览器里摆机器人 T-pose、导出 `tpose_qpos`） |
| 作者 | Hanyang Cao, Yuetong Fang, Taesoo Kwon（共同一作），Runyi Yu, Ji Ma, Jing Tan, Yangchen Zhou, Baoze Du, Yi Gu, Yukang Gao, Ruoli Dai, Lei Han†, Renjing Xu† |
| 机构 | 香港科技大学（广州）· Noitom Robotics（诺亦腾）· 汉阳大学 · HKUST · 香港大学 |
| **发布时间** | 2026年9月2日（arXiv v1） |
| 许可 | 论文 CC BY 4.0；代码仓库未声明 License |
| 评测平台 | 定量评测全部在 Unitree G1 上完成；定性展示覆盖 5 款人形（身高 0.75 m – 1.83 m） |
| 实现依赖 | MuJoCo（前向运动学 / 几何）+ Clarabel（锥规划求解 QP 子问题）+ PyTorch（对应网络） |

**一行定位**：GMR 那条「手写 YAML 关节映射 → mink IK」的路线，被换成「学一套 4096 点的人—机表面对应 → 用点对做约束 Gauss-Newton」。**换机器人不再需要重写映射表，只要给一个 T-pose**；而且因为对应是稠密的、落在体表上，人和物体/地面/自身之间的**接触关系可以直接搬**，不用再为接触单独写一套身体部位配对。

---

## 🎯 一句话总结

现有人形重定向（GMR、OmniRetarget、ReActor 等）都是**骨架中心**的：先由人手工挑一组关键点或刚体对，把「人的哪块 ↔ 机器人的哪块」写死，再去解优化。换一款机器人就要重写这张表，而且**稀疏的关节约束管不住关节之间的那一大片表面**，细节姿态和接触都只能靠拟合出来的副产物。UMR 把接口从骨架换成**体表点云**：在人和机器人各自的标准 T-pose 上采样体表点，用一个 PointNet 编码器 + MLP 解码器**学出一一编号的稠密对应**（人点云的索引直接继承给机器人点云），再把这些点对分别绑定到人体网格与机器人连杆上；动起来以后，人点云由网格带着走、机器人点云由前向运动学带着走，每一对点就成了一条「位置 + 法向」残差，塞进一个**带关节限位、地面不穿透与信赖域的 Gauss-Newton QP** 里逐帧求解。同一套点对还能顺手做**接触图迁移**（人点到最近环境点的向量 → 机器人点到同一环境点的向量）。结果：在 LAFAN1 上跟踪成功率与误差全面超过 GMR、逼近 Unitree 官方精修数据；在 SONIC 大规模训练上（不带 SMPL encoder 时）比已发布参考数据好约 10%；在 OmniContact / GRAIL 的接触密集任务上关节误差比 OmniRetarget 低约 40%–56%，并在真机上跑通了旋风踢、搬球倒走、上楼跳下三类部署。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| **UMR** | Unified Motion Retargeting | 本文方法：统一动作重定向 |
| **Correspondence** | Point Cloud Correspondence | 点云对应：人身上第 $i$ 个点该由机器人身上哪个点去追 |
| **Canonical T-pose** | — | 标准站姿，人和机器人都摆成这个姿势时学对应 |
| **Chamfer Distance** | — | 两堆点云之间「互相找最近邻」的对称距离 |
| **Geodesic Graph** | — | 沿体表测地线建的邻接图（胳膊贴着躯干时不会被误连） |
| **Barycentric Transport** | — | 点被绑在三角面片上，用重心坐标随网格形变一起动 |
| **FK** | Forward Kinematics | 前向运动学：给定关节角算出各连杆/表面点在哪 |
| **Gauss-Newton** | — | 对非线性最小二乘做局部线性化的迭代解法 |
| **QP** | Quadratic Programming | 二次规划；这里每次迭代解一个带不等式约束的 QP |
| **Trust Region** | — | 信赖域：限制单步 $\lVert\Delta\mathbf{q}\rVert$，防止线性化失效时跳飞 |
| **Contact Map** | — | 接触图：体表点指向最近环境点的向量场 |
| **HOI / HSI** | Human-Object / Human-Scene Interaction | 人-物 / 人-场景交互 |
| **SMPL-X / SOMA** | — | 参数化人体网格模型（SOMA 是 2026 年的统一版本） |
| **BONES-SEED** | Skeletal Everyday Embodied Dataset | SOMA 表示的日常动作大数据集 |
| **LAFAN1** | Lafayette Animation Dataset | 常用 BVH 动作数据集，本文转成 SMPL-X 后使用 |
| **GRAIL / OmniContact** | — | 两个人-场景 / 人-物交互数据集，本文的接触实验来源 |

---

## ❓ 论文要解决什么问题？

### 问题 1：骨架中心的对应是「一款机器人一套配方」

不管是几何优化（GMR）、学习式适配（ReActor 这类）还是交互感知约束（OmniRetarget），对应关系都建立在**人手工挑出来的关节 / 刚体对**上。这张表继承了两副骨架的拓扑与语义，所以：

- 换一款目标机器人 → 重新定义身体部位映射、重新调拟合权重；
- 换一种动作源（SMPL-X / BVH / 角色动画）→ 骨架语义又不一样，还得再适配一遍。

### 问题 2：稀疏关节只约束了身体几何的一小撮点

关节是离散的点，**关节与关节之间的那一大片体表没人管**。于是：

- 细粒度姿态对不齐（肩背、胯部这种"面"上的姿态全靠插值出来）；
- 接触没法可靠迁移——手掌贴在箱子哪一块、脚掌压在台阶哪个位置，这些都是**面**的信息，骨架表示里根本没有。

### 问题 3：接触迁移目前靠手工规则

OmniRetarget 这类交互感知方法要靠**启发式的支撑相检测 + 脚部硬约束粘地**。论文在 GRAIL 实验里点出了它的代价：这类启发式**跨动作分布时会失配**，把不该保持的接触一直粘住（这也是 OmniRetarget 在 Stair 上只有 11.01% 成功率的一个可能原因）。

### UMR 的回答

把**体表**当成人和机器人之间唯一的公共接口：

- 对应关系从**几何**里学出来，不是从**语义**里指定出来 → 不挑源骨架、不挑机器人拓扑；
- 对应是**稠密**的（默认 4096 点）→ 姿态对齐落在表面级别；
- 接触是**同一套点**上的向量场 → 接触图可以零额外配置地搬过去。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    SRCT["源模板 T-pose 网格<br/>SMPL-X / SOMA / 角色动画 / 扫描人体"]
    ROBT["机器人 T-pose MJCF<br/>(UMR Studio 导出 tpose_qpos)"]

    subgraph S1["🧩 阶段一 · 点云对应学习"]
        SAMP["体表采样（一次性，全程约 26 秒）<br/>各 4096 点，first-hit 只取外表面"]
        ENC["PointNet 编码器 E_θ<br/>吃机器人点云 → 潜向量"]
        DEC["MLP 解码器 D_θ<br/>为每个人点输出形变向量 d_i"]
        LOSS["L_corr = λ_c·Chamfer + λ_r·Repulsion + λ_e·Edge<br/>(1.0 / 0.002 / 0.4)"]
        BIND["绑定：人点→网格重心坐标<br/>机器人点→连杆局部坐标"]
    end

    subgraph S2["🎯 阶段二 · 重定向求解"]
        MOVE["逐帧：人点随源网格运动<br/>机器人点随 FK 运动"]
        RP["位姿残差 r_p：位置 + 表面法向偏移"]
        RC["接触残差 r_c：接触向量 c^h 与 c^r 对齐"]
        QP["阻尼约束 Gauss-Newton QP（Clarabel）<br/>关节限位 + 地面不穿透 + 信赖域"]
    end

    OUT["✅ 机器人广义坐标序列 q_t<br/>表面级对齐 + 接触保真"]
    DOWN["下游：BeyondMimic 单段跟踪 · SONIC 大规模训练<br/>OmniContact / GRAIL 交互策略 · Unitree G1 真机"]

    SRCT --> SAMP
    ROBT --> SAMP
    SAMP --> ENC --> DEC --> LOSS
    LOSS --> BIND
    BIND --> MOVE --> RP --> QP
    MOVE --> RC --> QP
    QP --> OUT --> DOWN

    style S1 fill:#e0f7fa,stroke:#0097a7,color:#003f47
    style S2 fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style OUT fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
    style DOWN fill:#f3e8ff,stroke:#7b3fbf,color:#2a0f4a
</div>

> 关键工程性质：**阶段一的产物可复用**。同一个「源模板 × 目标机器人」组合只需学一次对应，之后这套点对被该组合下的所有动作共享——这就是整条管线能跑到 65 FPS 的原因。

---

## 🔧 方法详解

### 阶段一：点云对应学习（在 T-pose 上学一次）

记人体 T-pose 上采出的**有序**外表面点云为 $\mathbf{X}^{h}=\lbrace\mathbf{x}^{h} _ {i}\rbrace _ {i=1}^{N}$，机器人 T-pose 上采出的**无序**点云为 $\mathbf{X}^{r}=\lbrace\mathbf{x}^{r} _ {j}\rbrace _ {j=1}^{N}$。PointNet 编码器 $E _ {\theta}$ 把机器人点云压成一个潜向量，MLP 解码器 $D _ {\theta}$ 为**每个人点**吐一个形变向量：

$$
\hat{\mathbf{X}}^{r}=\mathbf{X}^{h}+D_{\theta}(E_{\theta}(\mathbf{X}^{r})),\qquad \hat{\mathbf{x}}^{r}_{i}=\mathbf{x}^{h}_{i}+\mathbf{d}_{i}
$$

**注意这里的巧思**：网络不是去「配对」，而是把人点云**整体形变**成机器人的形状。索引 $i$ 自然从人点云继承到机器人侧——第 $i$ 个人点和第 $i$ 个机器人点天生就是一对，**根本不存在匹配这一步**。

损失是三项之和 $\mathcal{L} _ {\mathrm{corr}}=\lambda _ {c}\mathcal{L} _ {c}+\lambda _ {r}\mathcal{L} _ {r}+\lambda _ {e}\mathcal{L} _ {e}$：

| 项 | 作用 | 形式 | 默认权重 |
|---|---|---|---|
| **Chamfer** $\mathcal{L} _ {c}$ | 主几何监督：形变后的点云要覆盖住机器人真实表面 | 对称最近邻平方距离 | 1.0 |
| **Repulsion** $\mathcal{L} _ {r}$ | 防止一堆点塌到同一小块区域（否则大片体表没人对应） | $\exp(-\lVert\hat{\mathbf{x}}^{r} _ {i}-\hat{\mathbf{x}}^{r} _ {\ell}\rVert^2/r^2)$，取 $K _ {r}$ 近邻 | 0.002（$K _ {r}=8$，$r=0.035$ m） |
| **Edge smoothness** $\mathcal{L} _ {e}$ | 沿人体模板**测地图**的相邻点，形变向量要接近 | $\lVert\mathbf{d} _ {i}-\mathbf{d} _ {\ell}\rVert^2$ | 0.4（测地图，$k=32$） |

> 论文明确说 $\mathcal{L} _ {e}$ 是「学到连贯对应的关键」。直觉：只有 Chamfer 的话，网络完全可以把左手的点甩到机器人右手上——几何上 Chamfer 一样低，但**动起来就废了**。测地图平滑强制「人身上挨着的点，在机器人身上也得挨着」，把语义一致性从几何里逼出来。用测地距离而不是欧氏距离，是为了避免 T-pose 下**手臂贴着躯干**这种"空间上近、身体上远"的误连。

学完之后还有一个白送的好处：**机器人点云继承了人体的身体分区标签**。于是「哪块表面该加重权重」这种参数可以定义在人体模板上，**在不同机器人之间直接复用**（仓库里 `retarget_body_segment_surface*.py` 正是这么组织的：权重按动作源分文件，不按机器人分）。

### 阶段二：对应引导的重定向（逐帧求解）

点对被绑定后就变成了运动目标：人点通过**重心坐标**跟着源网格走，机器人点通过**连杆局部绑定 + FK** 跟着关节角走。每帧求解

$$
\min _ {\mathbf{q} _ t}\ \lVert\mathbf{r} _ p(\mathbf{q} _ t)\rVert_{2}^2+\lVert\mathbf{r} _ c(\mathbf{q} _ t)\rVert_{2}^2
$$

**位姿残差**同时管位置和表面朝向：

$$
\mathbf{r} _ {p,i}(\mathbf{q} _ t)=\begin{bmatrix}\sqrt{w_{i}^{p}}\bigl(\mathbf{x}^{r}_{i}(\mathbf{q} _ t)-\mathbf{x}^{h}_{t,i}\bigr)\\ \sqrt{w_{i}^{n}}\bigl(\bar{\mathbf{n}}^{r}_{i}(\mathbf{q} _ t)-\bar{\mathbf{n}}^{h}_{t,i}\bigr)\end{bmatrix}
$$

其中法向量 $\bar{\mathbf{n}}$ 测的是**相对各自 T-pose 绑定的朝向变化**（仓库里对应 `surface_normal_cost_mode: "tpose_offset"`）——这很重要：人和机器人的表面法向绝对值本来就对不上（一个是肉、一个是塑料壳），能比的只有「相对初始状态转了多少」。权重 $w _ {i}^p,w _ {i}^n$ 按身体分区给。

**接触残差**沿用 BimArt 的接触表示。设环境（物体 / 场景 / 地面）点云为 $\mathbf{Y} _ {t}$，对每个人点先找最近的环境点 $\pi _ {t}(i)$，然后人和机器人**共用这个环境点**：

$$
\mathbf{c}^{h}_{t,i}=\mathbf{x}^{h}_{t,i}-\mathbf{y}_{t,\pi_{t}(i)},\qquad \mathbf{c}^{r}_{i}(\mathbf{q} _ t)=\mathbf{x}^{r}_{i}(\mathbf{q} _ t)-\mathbf{y}_{t,\pi_{t}(i)}
$$

只有落进阈值 $\tau _ {c}$ 内的点才算活跃接触：$\mathcal{C} _ {t}=\lbrace i\in\mathcal{I}\mid\lVert\mathbf{c}^{h} _ {t,i}\rVert _ {2}\le\tau _ {c}\rbrace$（仓库默认 $\tau _ {c}=0.1$ m）。**同一套构造统一处理地面、被操作物体与场景几何**；自接触则把环境点换成另一个**不相邻身体分区**上的对应点。

> 这一步是 UMR 相对 OmniRetarget 的结构性差别：接触不是「检测到支撑相就硬粘住脚」，而是**每帧算出来的一个向量残差**，人手离开箱子时残差自然退出活跃集，不需要相位状态机。

### 约束更新：阻尼 Gauss-Newton + QP

残差通过 FK 非线性依赖 $\mathbf{q} _ {t}$，所以线性化 $\mathbf{r}(\mathbf{q} _ {t}+\Delta\mathbf{q})\approx\mathbf{r}(\mathbf{q} _ {t})+\mathbf{J}(\mathbf{q} _ {t})\Delta\mathbf{q}$，每步解一个凸 QP：

$$
\min _ {\Delta\mathbf{q}}\ \tfrac12\lVert\mathbf{r}(\mathbf{q} _ t)+\mathbf{J}(\mathbf{q} _ t)\Delta\mathbf{q}\rVert_{2}^2+\tfrac{\mu}{2}\lVert\Delta\mathbf{q}\rVert_{2}^2
$$

约束三条：

| 约束 | 式子 | 作用 |
|---|---|---|
| 关节限位 | $\mathbf{q}^{-}\le\mathbf{q} _ {t}+\Delta\mathbf{q}\le\mathbf{q}^{+}$ | 解出来的角度机器人转得到 |
| 地面净空 | $-\mathbf{J}^{z} _ {i}(\mathbf{q} _ {t})\Delta\mathbf{q}\le z^{r} _ {i}(\mathbf{q} _ {t})-z _ {f}$ | 对靠近地面的**表面点**线性化 $z _ {i}\ge z _ {f}$，硬约束不穿地 |
| 信赖域 | $\lVert\Delta\mathbf{q}\rVert _ {2}\le\eta$ | 线性化只在局部成立，限步长防跳飞 |

阻尼 $\mu$ 在仓库里默认 `damping: 0.01`，信赖域 `max_dq: 0.15`（L2 模式）。QP 子问题交给 **Clarabel** 求解，几何与 FK 走 **MuJoCo**。

> 与 GMR 对照着看会更清楚：GMR 是 mink + DAQP 解**关节层面**的 IK task（每个 task 盯一个 body 的位姿），UMR 是 Clarabel 解**表面层面**的最小二乘（几千条点残差），并且把地面不穿透从"事后修"变成了 QP 的**硬不等式**。

---

## 📊 实验与结果

### 1. 计算开销（Table I，LAFAN1 上平均）

> 硬件：NVIDIA RTX 4070 Ti SUPER + Intel Core Ultra 7 265KF；下游 RL 策略在 RTX 4090 上训练。

| 阶段 | 环节 | 开销 |
|---|---|---|
| **阶段一**（一次性，可复用） | 点云采样 | 9.83 s |
| | 测地预计算 | 5.58 s |
| | 对应训练 | 10.38 s |
| | **合计** | **25.79 s** |
| **阶段二**（每段动作） | 数据预处理 | 141.46 FPS |
| | 重定向求解 | 121.26 FPS |
| | **端到端吞吐** | **65.29 FPS** |

半分钟的一次性准备 + 65 FPS 的端到端吞吐——对"把 AMASS / BONES-SEED 整库翻译一遍"这种规模是够用的。

### 2. 单段跟踪质量（Table II / III，Unitree G1 + BeyondMimic）

评测方式：跟着 GMR 的协议，取 40 段有 Unitree 官方参考的 LAFAN1 序列，用 **BeyondMimic** 训跟踪策略，每格 4096 次 trial，跑完整个参考窗口且不触发终止判据算成功。三种设定：无域随机化仿真、带域随机化仿真、Sim2Sim。

成功率（%，UMR / GMR / Unitree 官方）：

| 动作 | Sim (无 DR) | Sim (带 DR) | Sim2Sim |
|---|---|---|---|
| Dance | **99.35** / 97.55 / 99.40 | **98.94** / 95.07 / 98.68 | **96.79** / 89.68 / 96.10 |
| Fall and GetUp | 96.98 / 84.72 / **97.05** | 95.62 / 81.60 / **95.67** | 34.92 / 32.10 / **46.90** |
| Fight | **99.94** / 87.60 / 99.86 | **98.86** / 83.04 / 98.75 | 95.30 / 79.49 / **95.91** |
| Jump | 99.58 / 99.62 / **99.99** | 99.15 / 98.89 / **99.51** | **92.86** / 89.27 / 91.53 |
| Run | **99.99** / 99.95 / 99.99 | **98.57** / 98.01 / 98.56 | **91.19** / 81.24 / 89.40 |
| Sprint | **100.00** / 99.94 / 99.98 | **99.10** / 97.72 / 98.22 | 86.43 / 71.46 / **90.83** |
| Walk | 98.98 / 98.99 / **99.99** | 98.71 / 98.61 / **99.77** | 92.76 / 86.84 / **95.19** |

跟踪误差（Table III，均值，Sim 无 DR / 带 DR）：

| 指标 | UMR | GMR | Unitree 官方 |
|---|---|---|---|
| 全局部位位置误差 $E _ {\mathrm{g\text{-}mpbpe}}$ (mm) ↓ | 89.61 / 176.79 | 198.89 / 322.57 | **83.99** / 177.52 |
| 根相对部位位置误差 $E _ {\mathrm{mpbpe}}$ (mm) ↓ | 29.71 / 36.81 | 43.23 / 53.36 | **28.63** / **35.62** |
| 关节角误差 $E _ {\mathrm{mpjpe}}$ ($10^{-3}$ rad) ↓ | **610.19** / **648.77** | 758.52 / 808.62 | 620.05 / 658.60 |

**怎么读这两张表**：

1. **对 GMR 是全面压制**，而且差距在 Fall and GetUp（+12 个百分点）和 Fight（+12 个百分点）这类**接触密集 / 大幅翻滚**的动作上最大——正是稀疏关键点最管不住的那一类。
2. **对 Unitree 官方参考是打平**。这条基线是闭源人工精修过的，UMR 在关节角误差上甚至最低，其余指标咬得很紧。
3. 差距在**带域随机化和 Sim2Sim 下被放大**（GMR 在 Sprint 的 Sim2Sim 掉到 71.46%，UMR 还有 86.43%）——论文的解释是 UMR 的参考本身更「可信服（plausible）」，策略不需要为了追一个物理上别扭的姿态而把自己逼到鲁棒性边缘。
4. **Fall and GetUp 的 Sim2Sim 是三方共同的坑**（34.92 / 32.10 / 46.90），躺地起身这类动作的 sim2sim 差距不是重定向能补的。

### 3. 大规模策略学习（SONIC + BONES-SEED）

BONES-SEED 已发布的 G1 参考是**用 GMR 从 SOMA-Uniform 重定向**的；UMR 直接重定向**演员自身体型的 SOMA-Proportional** 动作——**不需要为不同演员准备不同配置**，这是稠密对应带来的直接好处（Fig. 6 展示 GMR 在这里出现下肢姿态畸变与地面接触伪影）。

在 SONIC 框架下训练通用跟踪器：

- **带 SMPL encoder** 时，UMR 与已发布参考**打平**——因为此时源人体动作和潜空间对齐提供了额外引导，掩盖了机器人参考本身的质量差异；
- **不带 SMPL encoder** 时（更直接地反映参考质量），UMR 在总奖励、锚点位置误差、平均关节角误差**三项上一致更好，训练后期约有 10% 的相对提升**。

### 4. 接触密集交互（Table IV）

协议：完全沿用 OmniContact / OmniRetarget 的下游训练流程，**只换重定向出来的参考**。

| 任务 | 成功率 (%) ↑ UMR / OmniRetarget | 关节误差 (rad) ↓ | 物体误差 (m) ↓ |
|---|---|---|---|
| Carry（人-物） | **99.28** / 82.89 | **0.570** / 1.030 | **0.081** / 0.252 |
| Kick（人-物） | **99.98** / 83.13 | **0.619** / 1.396 | **0.038** / 0.215 |
| Push（人-物） | **99.99** / 99.87 | **0.630** / 1.043 | **0.048** / 0.049 |
| Chair（人-场景） | 75.24 / **79.67** | 0.315 / **0.308** | N/A |
| Stair（人-场景） | **43.53** / 11.01 | **0.229** / 0.327 | N/A |
| Slope（人-场景） | **58.32** / 52.37 | **0.152** / 0.179 | N/A |

要点：

- 三个人-物任务的**关节误差降低约 40%–56%**。论文提醒：OmniContact 的终止判据比较宽松，**成功率对跟踪保真度不敏感**——用 OmniRetarget 参考训出来的策略「虽然把物体推动了，但姿态已经跑偏很远」，所以关节误差比成功率更能说明问题。
- Fig. 8 的定性例子：两种方法都能把手放到大致位置，**OmniRetarget 会把接触落到物体错误的表面区域**，UMR 保住了手-物接触几何。
- 人-场景部分的源数据（GRAIL）本身是从 VFM 生成视频经 4D 人体重建得到的，**噪声比动捕大得多**；即便如此 UMR 在 Stair 上把成功率从 11.01% 拉到 43.53%。论文归因于 OmniRetarget 的**启发式支撑相检测 + 脚部硬粘**在跨动作分布时失配，把不该保持的接触一直粘着；UMR 没有这类手工启发式。
- **Chair 上 OmniRetarget 略优**——论文如实报了这一格，没有回避。

### 5. 跨源 / 跨机器人 + 真机（Fig. 3 / Fig. 5）

- **四种动作源**：MimicKit 的角色动画、BONES-SEED 的 SOMA、LAFAN1 的 SMPL-X、自采扫描人体网格；**五款人形**，身高 0.75 m – 1.83 m。对应学习与重定向流程**完全不变**，源之间的差别只在于「有没有身体分区定义」——SMPL-X 与 SOMA 共用一套分区，角色动画用它自己简化几何的分区，**没有分区的扫描网格就当成一整块全身区域**处理。
- **真机部署**（Unitree G1）：(a) 旋风踢（源自 MimicKit 的高动态角色动画）；(b) 捡球 + 带转向的倒着走（配动捕系统）；(c) 上楼梯 + 跳下。

---

## 📁 源码对照

仓库：[hanyang9/UMR](https://github.com/hanyang9/UMR)（2026-09-07 建库，随论文 v2 一起放出）。

### 目录结构（实地核对）

```text
UMR/
├── robot_configs/                                  # 一款机器人一个 json，只写 tpose_qpos / 限位 / MJCF 路径
│   ├── humanoid_retarget_unitree_g1_example.json
│   ├── humanoid_retarget_unitree_h2_example.json
│   ├── humanoid_retarget_booster_k1_example.json
│   ├── humanoid_retarget_engineai_t800_example.json
│   ├── humanoid_retarget_hightorque_pipluspro_example.json
│   └── humanoid_retarget_mimickit_humanoid_example.json
├── humanoid_retarget_defaults*.json                # 一种动作源 / 任务一套默认参数（与机器人无关）
├── scripts/
│   ├── surface_sampling.py                         # ★ 体表点云采样（first-hit 只取外表面）
│   ├── build_correspondence_ae_dataset.py          # ★ 阶段一数据集：T-pose 点云 + 测地图
│   ├── train_correspondence_template_residual_ae.py# ★ 阶段一训练：PointNet 编码 + 残差解码
│   ├── retarget_smpl_to_humanoid_surface_vector.py # ★ 阶段二核心：表面残差 + 约束 GN
│   ├── retarget_body_segment_surface*.py           # 身体分区权重（按动作源分文件，不按机器人）
│   ├── humanoid_retarget_pipeline.py               # 入口：SMPL/SMPL-X
│   ├── humanoid_retarget_pipeline_character.py     # 入口：MimicKit 角色动画
│   ├── humanoid_retarget_pipeline_hsi_hoi.py       # 入口：GRAIL / OmniContact / OMOMO 交互
│   ├── humanoid_retarget_pipeline_nr.py            # 入口：FBX / BVH
│   ├── humanoid_retarget_pipeline_batch.py         # 批量：双向 warm start + 动态规划
│   ├── source_self_contact.py                      # 自接触对（非相邻身体分区）
│   ├── mujoco_geom_surface.py                      # 机器人几何 → 表面点
│   └── visualize_robot_retarget_result.py          # 结果可视化（GLFW / Viser）
└── sample_data/                                    # 8 类数据源各一份样例 + 适配指引
```

**架构上最值得抄的一点**：配置被切成**正交的两半** —— `robot_configs/*.json` 只描述机器人（T-pose、限位、MJCF），`humanoid_retarget_defaults*.json` 只描述动作源与任务（采样、损失、求解器参数）。接一款新机器人**只动前者**，而且前者里唯一需要人工产出的东西就是 `tpose_qpos`——用 UMR Studio 在浏览器里把机器人摆成 T-pose 点一下「Copy T-pose Config」就有了。对比 GMR 每款机器人要手写 10–20 行「人体骨骼 ↔ 机器人 body + 权重 + 偏移」的 YAML，**手工语义设计这一步真的被删掉了**。

### 关键默认参数（`humanoid_retarget_defaults.json`）

| 组 | 参数 | 默认值 | 对应论文里的什么 |
|---|---|---|---|
| 采样 | `num_points` | 4096 | $N$，人 / 机器人各采这么多点 |
| 采样 | `exterior_method` | `first_hit` | 「exterior point cloud」：只要射线第一次打到的外表面 |
| 训练 | `epochs` / `lr` | 500 / 1e-3（cosine） | 阶段一训练（约 10 秒） |
| 训练 | `chamfer_weight` | 1.0 | $\lambda _ {c}$ |
| 训练 | `repulsion_weight` / `repulsion_k` / `repulsion_radius` | 0.002 / 8 / 0.035 | $\lambda _ {r}$ / $K _ {r}$ / $r$ |
| 训练 | `edge_weight` / `edge_graph` / `edge_k` | 0.4 / `geodesic` / 32 | $\lambda _ {e}$ 与测地邻接图 $\mathcal{E}$ |
| 求解 | `surface_normal_cost_mode` | `tpose_offset` | 式 (7) 里法向量测的是相对 T-pose 绑定的偏移 |
| 求解 | `body_segment.schema` | `smplx_55_to_19_upper_arm_v1` | 身体分区 → 权重 $w^p _ {i},w^n _ {i}$ |
| 求解 | `ground_contact_map_threshold` | 0.1 | 地面接触的 $\tau _ {c}$ |
| 求解 | `ground_penetration_hard_constraint` | `true` | 式 (14) 的地面净空硬不等式 |
| 求解 | `self_contact_map_cost` / `_threshold` / `_max_pairs` | 500.0 / 0.1 / 256 | 自接触残差（环境点换成非相邻分区的对应点） |
| 求解 | `damping` | 0.01 | 阻尼 $\mu$ |
| 求解 | `max_dq` / `step_limit_mode` | 0.15 / `l2` | 信赖域半径 $\eta$ |
| 求解 | `temporal_smooth_cost` | 0.5 | 帧间时序一致性 |
| 求解 | `trajectory_filter_mode` | `lqr` | 轨迹后处理（加速度 0.1 / jerk 0.01 代价） |

### 跑起来（README 实录）

```bash
conda create -n umr python=3.12 pip -y && conda activate umr
python -m pip install --index-url https://download.pytorch.org/whl/cu121 torch==2.4.1
python -m pip install -r requirements-umr.txt
# SMPL-X 模型需自行到官网同意条款后下载，放到 smpl/SMPLX_NEUTRAL.pkl 或 .npz

# 默认例子：LAFAN1 转成的 SMPL-X 序列 → Unitree G1，跑完直接开 MuJoCo viewer
python scripts/humanoid_retarget_pipeline.py \
  --config robot_configs/humanoid_retarget_unitree_g1_example.json
```

换机器人的完整流程（README 原话的压缩版）：**复制一份 `robot_configs/` 里的样例 → 改名字和 MJCF 路径 → 在 UMR Studio 里摆好 T-pose 并粘贴 `tpose_qpos` → 用新 config 跑同一条命令**。原文强调：*No manual human-robot mapping is required.*

### 源码运行时序（mermaid）

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户/CLI
    participant P as humanoid_retarget_pipeline.py
    participant S as surface_sampling.py<br/>+ mujoco_geom_surface.py
    participant T as train_correspondence_<br/>template_residual_ae.py
    participant R as retarget_smpl_to_<br/>humanoid_surface_vector.py
    participant M as MuJoCo + Clarabel

    U->>P: --config unitree_g1_example.json
    P->>P: 合并 robot_config 与 defaults
    alt 该「源模板 × 机器人」的对应已缓存
        P-->>R: 直接复用点对（跳过阶段一）
    else 首次运行
        P->>S: 采 T-pose 外表面点云（各 4096 点，first-hit）
        S-->>P: X^h, X^r + 人体模板测地图
        P->>T: 训 PointNet 编码器 + MLP 解码器（500 epoch）
        T->>T: L_corr = Chamfer + Repulsion + Edge
        T-->>P: 有序点对，并绑定到网格 / 连杆
    end

    P->>R: 送入源动作序列（SMPL-X / SOMA / 角色动画）
    loop 每一帧 t
        R->>R: 人点走重心坐标；机器人点走 FK
        R->>R: 组装 r_p（位置 + 法向）与 r_c（活跃接触）
        R->>M: 线性化后解阻尼约束 QP
        M-->>R: Δq（满足限位 / 不穿地 / 信赖域）
        R->>R: 时序平滑 + warm start 给下一帧
    end
    R->>R: LQR 轨迹滤波（加速度 / jerk 代价）
    R-->>U: output/机器人名/片段名.npz + MuJoCo viewer
</div>

---

## 🧩 与本仓库其他重定向笔记的关系

| 笔记 | 对应关系怎么定 | 接触怎么处理 | 与 UMR 的关系 |
|---|---|---|---|
| [GMR（Retargeting Matters）](../Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html) | 每款机器人手写 IK YAML（人体骨骼 ↔ body + 权重 + 偏移） | 无显式接触项，靠下游 RL 补 | UMR 的**主要定量基线**，两者都是纯运动学优化 |
| [OmniRetarget](../OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.html) | interaction mesh + 人工指定的身体/物体配对 | 启发式支撑相 + 脚部硬粘 | UMR 的**交互任务基线**；论文指出其启发式跨分布会失配 |
| [ReActor](../ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting/ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting.html) | 稀疏语义刚体对 + 双层优化自动解偏移 | 物理仿真在环，接触自然涌现 | **正交路线**：ReActor 用物理仿真兜底，UMR 用几何稠密度兜底；UMR 不需要训 RL，快两个数量级 |
| [NMR（Make Tracking Easy）](../Make_Tracking_Easy__Neural_Motion_Retargeting_for_Humanoid_Whole-body_Control/Make_Tracking_Easy__Neural_Motion_Retargeting_for_Humanoid_Whole-body_Control.html) | 学一个骨架层面的分布映射 | 靠仿真洗监督信号 | 同为「学习式」，但 NMR 学的是**关节映射**，UMR 学的是**表面对应** |
| [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html) | — | — | UMR 的**下游消费者**：用它验证大规模训练下参考质量的差异 |

一句话串起来：**ReActor 把物理放进回路、UMR 把几何放稠密**，两者都在回答「GMR 那张手写映射表能不能不要」，但一个靠 RL 在仿真里试出来，一个靠体表对应在 T-pose 上学出来。

---

## 💡 核心贡献

1. **表面中心的统一重定向框架**：从体表点云里**学**出稠密人—机对应，取代手工骨架/身体映射，同时支持异构动作表示与机器人形态。
2. **高效的重定向管线**：同一套对应既做表面级位姿匹配、又做接触图直接迁移；对应本身可在同一「源模板 × 机器人」下复用，端到端 65 FPS。
3. **系统性的下游评估**：从单段跟踪（BeyondMimic）、大规模策略学习（SONIC）到接触密集交互（OmniContact / GRAIL）三个尺度上验证参考质量，并完成真机部署。

---

## ⚠️ 局限与可改进点

- **必须有网格化的源几何与标准模板**：论文自己列的头号限制。只有骨架的 BVH 需要先转成 SMPL-X（README 给的路子是 `lafan_to_smplx`），视频重建这类"不太结构化"的观测目前进不来。
- **OmniContact 的 BVH 走不通**：论文数据是用**内部开发版**的 BVH→SMPL-X 转换器做的，那个转换器**没有放进开源仓库**，所以当前 release 不能直接吃 OmniContact 的 BVH。复现这块要留意。
- **纯运动学，没有动力学**：UMR 解的是带几何约束的 IK，不保证力矩可行或动量守恒；物理可行性仍然留给下游 RL（这点与 GMR 同构，与 ReActor 相反）。
- **人-场景不是全胜**：Chair 任务上 OmniRetarget 仍略优，说明"完全不用支撑相启发式"在某些静态支撑场景里也有代价。
- **表面权重调在 G1 上**：README 明说这些分区权重"在 G1 上好用、一般也能迁移到其他机器人，但不保证对每种形态都最优"。
- **尚未覆盖灵巧手与多智能体**：论文把「更精细的形态（灵巧手）+ 多人交互」列为未来工作。
- **代码仓库没有 License 文件**：商用/二次分发前需要先问作者。

---

## 🎤 面试参考

**Q：UMR 为什么可以不要人工的关节映射？**
A：因为它把对应关系建立在**几何**而不是**语义**上。网络不做"配对"，而是把人体 T-pose 点云整体形变成机器人形状，索引天然从人点云继承到机器人点云——第 $i$ 个人点和第 $i$ 个机器人点就是一对。人只需要提供两个 T-pose。

**Q：只用 Chamfer 距离学对应会出什么问题？**
A：Chamfer 只管"形变后的点云盖住机器人表面"，完全允许把左手的点甩到右手上——几何 loss 一样低，但动起来就乱套。所以必须加**沿人体模板测地图的边平滑项** $\mathcal{L} _ {e}$（默认权重 0.4）逼出语义一致性，再加 repulsion 防止点塌成一堆。论文原文就说 $\mathcal{L} _ {e}$ 是"学到连贯对应的关键"。

**Q：为什么用测地图而不是欧氏近邻建边？**
A：T-pose 下手臂贴着躯干、大腿内侧互相贴着，欧氏近邻会把"空间上近、身体上远"的点连起来，平滑项反而会把手臂的形变和躯干的形变绑死。测地距离沿表面走，不会跨过这种间隙。

**Q：接触是怎么被"搬"过去的？**
A：对每个人体表面点，先找它在环境点云上的最近点 $\pi _ {t}(i)$，人侧接触向量是 $\mathbf{x}^h-\mathbf{y} _ {\pi _ {t}(i)}$，机器人侧用**同一个环境点**算 $\mathbf{x}^r-\mathbf{y} _ {\pi _ {t}(i)}$，两者的差作为残差。只有向量模长小于 $\tau _ {c}$（默认 0.1 m）的点进入活跃集。地面、物体、场景统一走这套；自接触把环境点换成另一个非相邻身体分区上的对应点。

**Q：和 OmniRetarget 的接触处理差在哪？**
A：OmniRetarget 用启发式检测支撑相再把脚硬粘住，跨动作分布容易失配、把不该保持的接触一直粘着（GRAIL Stair 上只有 11% 成功率）。UMR 的接触是**每帧算出来的向量残差**，人手离开物体时残差自动退出活跃集，不需要相位状态机。

**Q：为什么求解要带信赖域？**
A：残差通过 FK 非线性依赖关节角，Gauss-Newton 是局部线性化。一旦某帧目标离当前位形太远，线性化外推会解出大步长、把机器人甩到奇异位形。所以 QP 里同时放阻尼项 $\mu$（默认 0.01）与硬信赖域 $\lVert\Delta\mathbf{q}\rVert _ {2}\le\eta$（默认 0.15）。

**Q：它比 GMR 好在哪、又在哪没有明显优势？**
A：好在**接触密集与大幅翻滚的动作**（Fall and GetUp、Fight 成功率各高约 12 个百分点）以及**域随机化 / Sim2Sim 下的鲁棒性**；Walk、Jump 这类平稳动作两者基本打平——稀疏关键点本来就足以描述平稳步态，稠密对应的收益体现不出来。

**Q：SONIC 实验里"带 SMPL encoder 时打平"说明了什么？**
A：说明当训练框架本身能拿到源人体动作并做潜空间对齐时，它会**补偿掉**机器人参考的质量差异。所以要测参考质量，得关掉这个补偿通道——关掉之后 UMR 一致好约 10%。这也是评估重定向方法时值得注意的方法论陷阱。

---

## 🔗 相关笔记与外链

- [Retargeting Matters: General Motion Retargeting for Humanoid Motion Tracking](../Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html) — GMR，本文的主要基线
- [OmniRetarget: Interaction-Preserving Data Generation for Humanoid Whole-Body Loco-Manipulation](../OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.html) — 交互任务上的基线
- [ReActor: Reinforcement Learning for Physics-Aware Motion Retargeting](../ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting/ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting.html) — 物理在环的另一条去手工化路线
- [Make Tracking Easy: Neural Motion Retargeting for Humanoid Whole-body Control](../Make_Tracking_Easy__Neural_Motion_Retargeting_for_Humanoid_Whole-body_Control/Make_Tracking_Easy__Neural_Motion_Retargeting_for_Humanoid_Whole-body_Control.html) — 学习式骨架映射（NMR）
- [SONIC: Supersizing Motion Tracking for Natural Humanoid Whole-Body Control](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html) — 本文大规模实验用的训练框架
- 官方仓库：[hanyang9/UMR](https://github.com/hanyang9/UMR) · 项目主页：[hanyang9.github.io/UMR](https://hanyang9.github.io/UMR/)
- 相关外部资源：[BONES-SEED 数据集](https://huggingface.co/datasets/bones-studio/seed) · [Unitree LAFAN1 重定向数据集](https://huggingface.co/datasets/lvhaidong/LAFAN1_Retargeting_Dataset) · [GRAIL](https://research.nvidia.com/labs/dair/grail/) · [OmniContact](https://omnicontact.github.io/)

---

## 📚 引用（BibTeX 备忘）

```bibtex
@misc{cao2026unifiedmotionretargetinghumanoids,
  title={Unified Motion Retargeting for Humanoids with Learned Point Cloud Correspondence},
  author={Hanyang Cao and Yuetong Fang and Taesoo Kwon and Runyi Yu and Ji Ma and Jing Tan and Yangchen Zhou and Baoze Du and Yi Gu and Yukang Gao and Ruoli Dai and Lei Han and Renjing Xu},
  year={2026},
  eprint={2609.02134},
  archivePrefix={arXiv},
  primaryClass={cs.RO},
  url={https://arxiv.org/abs/2609.02134},
}
```

---

> 备注：本笔记基于 arXiv v2 全文（2026-09-07 更新）、项目主页与官方仓库整理。Table I–IV 的数字直接取自论文；默认超参取自仓库 `humanoid_retarget_defaults.json`，可能随仓库更新而变化，以官方仓库为准。
