---
layout: paper
title: "What the Elevation Map Cannot See: Semantic-Aware Locomotion and Execution-Aware Navigation for Humanoid Robot"
zhname: "高程图看不见的东西：面向人形机器人的语义感知行走与执行感知导航"
category: "Navigation"
arxiv: "2610.07396"
---

# What the Elevation Map Cannot See: Semantic-Aware Locomotion and Execution-Aware Navigation for Humanoid Robot
**给 AME 行走策略加一条 RGB + DINOv2 的语义分支，让 G1 能避开高程图里看不出来的倒瓶、手机和水渍；再用定位反馈把绕障造成的偏航拉回 VLN 指定的目标位姿，并配一套带「高程不可见危险物」与执行偏差的导航基准**

> 📅 总结日期: 2026-10-22
>
> 🏷️ 板块: 08 Navigation · 视觉语言导航（VLN）· 语义可踩性 · 感知行走 · 教师—学生蒸馏 · 执行偏差纠正 · Unitree G1 · Isaac Sim 基准
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）· 上游 awesome-humanoid-robot-learning Navigation 章节中尚无笔记的最新论文（2026.10.05，PROGRESS #706）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.07396](https://arxiv.org/abs/2610.07396) |
| HTML | [arxiv.org/html/2610.07396v1](https://arxiv.org/html/2610.07396v1) |
| PDF | [下载 v1](https://arxiv.org/pdf/2610.07396v1) |
| **发布时间** | 2026-10-05（arXiv v1） |
| 项目主页 | 没有单独的项目页 |
| 源码 | ⏳ 截至 2026-10-22 未公开（论文与 arXiv 页面都没有代码链接） |
| 依赖的开源组件 | 高层 VLN 用 [NaVILA](https://github.com/AnjieCheng/NaVILA)（场景与划分来自其 [VLN-CE-Isaac](https://github.com/yang-zj1026/legged-loco)），行走底座是 AME 预训练策略，视觉特征用冻结的 [DINOv2-S](https://github.com/facebookresearch/dinov2)，部署时双目深度用 Fast-FoundationStereo，仿真里的定位用 LingBot-Map |

**作者**：Shunyu Yao, Songyang Liu, Dinghao Chen, Yuanyuan Lei, Shuai Li（佛罗里达大学可持续基础设施与环境工程学院、计算机与信息科学与工程系；Dinghao Chen 署名独立研究者）

---

## 🎯 一句话总结

现有物理 VLN 基准默认两件事：**危险都能从高程图里看出来**、**机器人走出来的轨迹就是命令的轨迹**。真实家里两条都不成立——倒在地上的瓶子在高程图里像噪声，手机几乎贴地，水渍和油渍高度为零；而行走策略为了绕开它们会侧步、转向，偏差一路累积，VLN 下一步就基于错位的状态做决策。本文在 AME 行走策略上加一条**语义分支**（教师用真值高程 + 语义图，学生用腰部 RGB-D + DINOv2 特征，DAgger 蒸馏），配两项「跨过危险物」的奖励；导航层用 **anti-deviation** 模块，把 VLN 每一步给出的相对位姿锚定在决策时刻，用定位反馈把绕障产生的位置 / 朝向误差换成补偿速度。仿真里语义分支把对「高程不可见」危险物的接触率差距补上 74–100%，真机 G1 在三种地面上 clean 成功率 40–60%（只用深度的基线是 0）；anti-deviation 让导航 SR 从 19.5% 升到 29.8%、Safe SR 从 12.0% 升到 23.7%。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VLN | Vision-and-Language Navigation | 按自然语言指令在环境里导航 |
| VLN-CE | VLN in Continuous Environments | 连续环境版 VLN，不再在预设视点之间跳 |
| AME | Attention-Based Map Encoding | 用注意力读高程图选落脚点的感知行走策略，本文的预训练底座 |
| DAgger | Dataset Aggregation | 学生自己开、老师逐状态标答案的模仿学习，用来蒸馏 |
| FFS | Fast-FoundationStereo | 双目立体匹配网络，部署时从双目图得到更干净的深度 |
| SR / Safe SR | Success Rate / Safe Success Rate | 到达目标的比例；Safe SR 还要求全程脚没进过危险区 |
| HCR | Hazard Contact Rate | 脚碰到危险物的比例，按可见 / 模糊 / 不可见三类分别统计 |
| FR | Fall Rate | 摔倒率 |
| VTE | Velocity Tracking Error | 实际速度与命令速度之差 |
| SPL | Success weighted by Path Length | 按路径效率加权的成功率 |

---

## ❓ 论文要解决什么问题？

1. **高程图有盲区**：在 FAST-LIO2 重建的地图里，箱子清清楚楚（elevation-visible），倒瓶只有 7.1 cm 高、和地面噪声分不开（ambiguous），手机 1.4 cm、水 / 油渍 0 cm 根本看不到（invisible）。几何上「可通行」不等于「可以踩」。
2. **命令和执行不一致**：安全的行走需要侧步、缩短步长、转弯来避险，每次都让实际位姿偏离 VLN 预期一点；VLN 是开环把相对位姿变成恒定速度执行的，偏差会带进下一次决策，最后走到别处。
3. **两件事是耦合的**：语义上发现危险 → 绕开 → 轨迹改变 → 高层看到的观测与预期不符。现有基准（VLN-PE、VLN-CE-Isaac 等）只评几何可通行性和碰撞，看不出这条「感知—执行」回路上的失败。

---

## 🔧 方法拆解

### 1. 问题分层

- **高层 VLN**（沿用 NaVILA）：输入指令 $I$、当前 RGB 与前 $L$ 帧历史，输出机器人坐标系下的相对目标位姿 $w_t = (\Delta x_t, \Delta y_t, \Delta\theta_t)$；与决策时的位姿复合得到目标位姿 $p_t^{\mathrm{tar}} = p_t \oplus w_t$。
- **低层行走**：输入腰部 RGB-D 与 96 维本体感受（基座速度、投影重力、速度命令 $c_t = (v_x, v_y, \psi)$、29 维关节位置 / 速度 / 上一步动作），输出 29 维关节位置偏移，$q^{\mathrm{target}} = q^{\mathrm{default}} + a$。

### 2. 语义分支：三阶段课程（图 4）

| 阶段 | 观测 | 训练 | 做什么 |
|---|---|---|---|
| ① 增强几何策略 | 真值高程图 + 真值语义图 | PPO | 保留预训练 AME 的结构和权重，**新增一条独立的语义分支**（「可踩性」表示）；地形里加入可见 / 模糊 / 不可见三类危险物，加两项跨越奖励 |
| ② 鲁棒教师 | 同上 | 继续 PPO | 课程式随机化动力学、负载、本体噪声、推搡与持续外力 |
| ③ 可部署学生 | 腰部 RGB-D + 本体 | DAgger | 几何分支吃相机深度；语义分支吃 RGB 加冻结 DINOv2-S 特征（可训练投影后拼进语义 CNN 的输入通道）；部署时深度换成 FFS 的双目深度 |

蒸馏目标是逐状态动作均值的 MSE（式 4，按 29 维平均）。前 200 次迭代由教师开车，之后 800 次迭代逐步把控制权交给学生，教师始终提供监督。Grad-CAM（图 6）显示右腿动作关注的是可落脚的桩顶和要避开的语义危险物，而不是机器人自己的腿。

### 3. 跨越危险物的两项奖励（式 5–6）

两项都只在「摆动脚的脚底投影与危险物重叠」时生效，其余时候恒为 0，不改变正常步态。记离终止边界的余量 $d_i = z_i - (h_i + 0.03\,\mathrm{m})$（$h_i$ 是脚底范围内最高的危险物顶面）：

- **跨越净空奖励** $r _ {\mathrm{over}}$：脚在水平移动（$\tanh(4\lVert v _ {xy}\rVert)$，原地抬脚不给分）且余量越大越好，$d_i$ 到 2 cm 封顶；检测时往前探 0 / 0.08 / 0.16 m。
- **过早下落惩罚** $p _ {\mathrm{desc}}$：脚还压在危险物上方就往下落，离边界越近（$1 - d_i / 0.2$）、下落越快（$\tanh(-v_z / 1.0)$）罚得越重；低于边界直接终止回合。

两项都要求命令速度 $\lVert c\rVert > 0.1$ 且该脚处在摆动相。

### 4. Anti-deviation：把绕出去的再拉回来（式 7）

- **不加时（消融）**：$c_t = w_t / \Delta t$，恒定速度开环执行一段固定时间，绕障带来的偏差留给下一次 VLN 决策。
- **加了之后**：仿真里用 LingBot-Map 从同一路单目 RGB 估计当前平面位姿 $\hat p_t$；目标位姿锚定在**决策时刻**（不随后续位姿重算），误差 $d_t = p_t^{\mathrm{tar}} - \hat p_t$ 经控制律 $\kappa _ {\mathrm{ad}}$ 变成补偿速度，替换本体观测里的速度命令槽位。行走策略的输入和动作接口不变。论文没有给出 $\kappa _ {\mathrm{ad}}$ 的具体形式和增益。

### 5. 基准

- **六类共享危险物**（表 4）：可见的板条箱（0.06–0.24 m）、箱子（0.05–0.18 m）；模糊的倒瓶（0.071 m）；不可见的手机（0.014 m）、水 / 油渍（0 m）。
- **行走基准**：程序生成的走廊，四组地形（不平地、台阶、梅花桩、石板桥）各三档难度；扰动分 0.5× / 1.0× / 1.5× 三档（表 3：摩擦 0.4–1.0、$k_p/k_d$ ±15%、负载 ±2 kg、每 3–7 s 推 ±0.8 m/s、深度噪声 2 cm + 2% 丢点、光照、相机位姿 ±5 mm / ±4°、延迟 60–100 ms 等）。
- **导航基准**：在 VLN-CE-Isaac 的训练 / 未见验证划分上脚本化加障碍，40% 放在参考路径上、60% 放在路径 1 m 以内；指标在 SR 之外加 Safe SR、危险侵入率、SPL、最终测地距离、VLM 提前停止与超时。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph TRAIN["🏋️ 行走策略训练（Isaac Sim）"]
        AME["预训练 AME 策略<br/>（高程图 → 落脚点）"]
        T1["① 增加独立语义分支<br/>真值高程 + 真值语义图<br/>PPO + 跨越净空奖励 + 过早下落惩罚"]
        T2["② 鲁棒教师<br/>动力学 / 负载 / 推搡 / 外力 / 本体噪声"]
        ST["③ RGB-D 学生<br/>深度 → 几何分支<br/>RGB + DINOv2-S → 语义分支<br/>DAgger：前 200 次教师开，再 800 次渐交"]
        AME --> T1 --> T2 --> ST
    end

    subgraph NAV["🧭 导航闭环（仿真评测）"]
        I["语言指令 I + RGB 历史"]
        VLN["NaVILA VLN<br/>w_t = (Δx, Δy, Δθ)"]
        TAR["目标位姿锚定在决策时刻<br/>p_tar = p_t ⊕ w_t"]
        LOC["LingBot-Map 定位<br/>估计 p̂_t"]
        AD["Anti-deviation<br/>d_t = p_tar − p̂_t → 补偿速度 c_comp"]
        LOCO["语义感知行走策略<br/>腰部 RGB-D + 96 维本体 → 29 维关节目标"]
        I --> VLN --> TAR --> AD
        LOC --> AD
        AD -- 替换速度命令槽位 --> LOCO
        LOCO -- 绕开倒瓶 / 手机 / 水渍<br/>实际位姿偏离 --> LOC
    end

    ST --> LOCO

    subgraph BENCH["📏 基准与结果"]
        HZ["危险物按高程可见性分三类<br/>可见：箱子 · 模糊：倒瓶 · 不可见：手机 / 水渍"]
        R1["行走：不可见类 HCR 差距补上 74–100%<br/>模糊类 51–61%，可见类只有 12–24%"]
        R2["真机 G1 三种地面：clean SR 40–60%<br/>只用深度的基线 0%"]
        R3["导航：anti-deviation 让 SR 19.5 → 29.8%<br/>Safe SR 12.0 → 23.7%，碰撞 35.9 → 12.3%"]
        HZ --> R1
        HZ --> R2
        HZ --> R3
    end

    LOCO --> BENCH

    style TRAIN fill:#eef6ff,stroke:#2e86de
    style NAV fill:#fff7e0,stroke:#d4a017
    style BENCH fill:#eafaf1,stroke:#27ae60
</div>

---

## 🚶 具体实例

### 例 1：跨过一只倒瓶，两项奖励各给多少

倒瓶高 $h = 0.071$ m，终止边界在 $0.071 + 0.03 = 0.101$ m。设摆动脚水平速度 0.5 m/s、竖直速度 $-0.5$ m/s（正在往下落），两只脚 $N_f = 2$，只有这只脚在瓶子上方：

| 脚底最低点 $z$ | 余量 $d$ | 净空奖励（单脚） | 下落惩罚（单脚） |
|---|---|---|---|
| 0.111 m | 0.01 m | $\tanh(4 \times 0.5) \times \tfrac{0.01}{0.02} = 0.964 \times 0.5 = 0.482$ | $(1 - \tfrac{0.01}{0.2}) \times \tanh(0.5) = 0.95 \times 0.462 = 0.439$ |
| 0.171 m | 0.07 m | $0.964 \times 1$（2 cm 封顶）$= 0.964$ | $(1 - \tfrac{0.07}{0.2}) \times 0.462 = 0.300$ |

除以 $N_f = 2$ 后分别是 0.241 / 0.220 与 0.482 / 0.150。可以看到：抬得越高，净空奖励越快饱和、下落惩罚越小；脚贴着瓶顶还往下落时两项几乎打平，策略就会学着「先越过去再落脚」。（这里只是代公式，奖励权重论文没给。）

### 例 2：表 6 的「差距补上了多少」

论文按 $(\mathrm{HCR} _ {\text{Elev}} - \mathrm{HCR} _ {\text{Ours}}) / (\mathrm{HCR} _ {\text{Elev}} - \mathrm{HCR} _ {\text{Oracle}})$ 计算。以不平地、无扰动为例：

| 类别 | Elevation-only | Ours | Oracle | 补上的比例 |
|---|---|---|---|---|
| 不可见（手机 / 水渍） | 21.1% | 6.1% | 1.9% | $15.0 / 19.2 = 78\%$ |
| 模糊（倒瓶） | 41.4% | 17.2% | 1.7% | $24.2 / 39.7 = 61\%$ |
| 可见（箱子） | 27.8% | 24.7% | 2.2% | $3.1 / 25.6 = 12\%$ |

四档扰动都算一遍，得到论文说的不可见类 74–100%（1.5× 时 Ours 与 Oracle 都是 6.7%，正好 100%）、模糊类 51–61%、可见类 12–24%。语义分支补的正是高程图的盲区；可见障碍上和 Oracle 的差距大部分还在，说明剩下的差距不全是感知覆盖的问题。

### 例 3：开环与 anti-deviation（玩具，$\kappa _ {\mathrm{ad}}$ 是假设）

VLN 给出 $w_t = (1.0\,\mathrm{m}, 0, 0)$、$\Delta t = 2$ s。开环时 $c_t = (0.5\,\mathrm{m/s}, 0, 0)$ 恒速执行；若途中为绕水渍侧移，2 s 后实际在 $(0.8, 0.3)$、朝向偏 $0.2$ rad，这 0.3 m 和 0.2 rad 就留给了下一步。加上 anti-deviation，目标固定在 $(1.0, 0, 0)$，误差 $d = (0.2, -0.3, -0.2)$；假设用比例律 $c^{\mathrm{comp}} = K d$、$K = 1\,\mathrm{s}^{-1}$（还要转到机体坐标系），得到往前 0.2 m/s、往右 0.3 m/s、右转 0.2 rad/s 的补偿命令，交给同一个行走策略执行。

---

## 📊 关键结果

**行走（仿真，表 5，无扰动 SR）**：

| 难度 | Oracle | Elevation-only | Ours |
|---|---|---|---|
| L1 | 99.0 | 47.9 | **71.5** |
| L2 | 95.6 | 32.7 | **61.2** |
| L3 | 95.0 | 25.2 | **51.0** |

Ours 在所有难度和扰动档上 SR、Progress 都高于 Elevation-only（无扰动 SR 高 23.6 / 28.5 / 25.8 点），VTE 基本持平或略高——绕障本来就会偏离命令速度，这正是 anti-deviation 的动机。L3 + 1.5× 扰动时 Progress 56.7% 而 SR 只有 22.7%。

**真机 G1（表 7，每种地面 5 次，%）**：

| 地面 | 方法 | Clean SR ↑ | 出走廊 ↓ | HCR 可见 / 模糊 / 不可见 ↓ |
|---|---|---|---|---|
| 深色塑料地板（很滑） | Elevation-only | 0 | 20 | 20 / 80 / 100 |
|  | Sonic + 人类专家给速度 | 20 | 80 | 0 / 40 / 40 |
|  | Ours | **40** | 20 | 0 / 20 / 20 |
| 木板（粗糙、窄） | Elevation-only | 0 | 0 | 20 / 80 / 100 |
|  | Sonic | 0 | 100 | 0 / 20 / 20 |
|  | Ours | **60** | 40 | 0 / 0 / 20 |
| 防水塑料布（滑、窄） | Elevation-only | 0 | 20 | 0 / 20 / 100 |
|  | Sonic | 0 | 100 | 0 / 20 / 20 |
|  | Ours | **60** | 20 | 0 / 20 / 0 |

没有环境感知的 Sonic 靠人给速度能躲开危险物，但 80–100% 的试次走出了走廊——窄空间里只靠速度命令绕不开，需要感知落脚点。抗干扰（表 8）：无干扰 60%、2000 lm 手电照射 40%、加 1 kg 负载 40%、泡沫棒敲打 60%。

**导航（仿真，表 10，扰动 1.0×、5 个障碍）**：

| 方法 | Safe SR ↑ | SR ↑ | SPL ↑ | 碰撞 ↓ | 危险侵入 ↓ | FR ↓ | Progress ↑ |
|---|---|---|---|---|---|---|---|
| Ours | **23.68** | **29.80** | **0.256** | **12.26** | **12.81** | 10.86 | 43.20 |
| 去掉 anti-deviation | 11.98 | 19.50 | 0.169 | 35.93 | 18.38 | 8.64 | 46.12 |

去掉 anti-deviation 后 Progress 反而略高：机器人大方向朝着目标走，但偏差累积导致到不了；VLM 提前停止从 18.4% 增到 29.2% 是加了之后的副作用。语义分支消融（表 9）：四种设定下 Safe SR 高 3.3–12.3 点，危险侵入降 8.6–11.2 点、FR 降 8.6–9.8 点。

**局限**：无扰动的不平地上 Ours 50.6% vs Oracle 93.6%，可见障碍 HCR 24.7% vs 2.2%；1.5× 扰动时 Ours 摔倒率 11.9%（Oracle 5.8%、Elevation-only 3.1%），作者推测是相机对光照敏感；完整导航框架只在仿真里验证，基准还没模拟踩到水渍后的打滑。

---

## 💡 核心贡献

1. **语义感知行走**：在预训练几何策略上外挂一条独立的语义「可踩性」分支，三阶段课程 + DAgger 蒸馏到腰部 RGB-D + DINOv2 的学生，配两项只在危险物上方生效的跨越奖励；
2. **执行感知导航**：anti-deviation 把 VLN 目标锚定在决策时刻、用定位反馈补偿绕障偏差，不改行走策略的接口；
3. **新的基准维度**：按高程可见性划分的危险物分类、执行偏差与物理扰动，以及 HCR、Safe SR 等把「到没到」和「踩没踩」分开评的指标。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **感知行走不能只看几何** | 家里的危险物很多是平的或小的；把 RGB 语义直接喂给行走策略（而不是只给高层规划）能在落脚层面避开它们 |
| **分层系统要闭环** | 低层的安全行为会改变高层假设的轨迹；把目标锚定在决策时刻再用定位反馈纠偏，是一种代价很小的耦合方式 |
| **评测要同时看完成与安全** | SR 与 Safe SR、Progress 与 SR 之间的差距说明，只报到达率会掩盖踩危险物和偏航累积的问题 |
| **局限** | 代码与基准未放出；anti-deviation 的控制律、增益与 LingBot-Map 误差都没有量化；真机每种地面只有 5 次；导航只在仿真里做 |

---

## 🛠️ 运行时序图（按论文描述；官方代码未开源）

论文没有放出代码，下图按第 3.1、3.4 节的描述画导航时的一次决策周期，用来对照各模块的调用顺序；控制频率、$\Delta t$ 与 $\kappa _ {\mathrm{ad}}$ 的形式论文未给出。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant ENV as Isaac Sim 场景（VLN-CE-Isaac + 脚本加的危险物）
    participant VLN as NaVILA VLN 策略
    participant LOC as LingBot-Map 定位
    participant AD as Anti-deviation 模块
    participant LOCO as 语义感知行走策略（学生）
    participant G1 as G1 关节 PD

    ENV->>VLN: 指令 I + 当前 RGB + 前 L 帧
    VLN-->>AD: w_t = (Δx, Δy, Δθ)
    AD->>AD: 读决策时刻位姿 p_t，锚定 p_tar = p_t ⊕ w_t
    loop 执行这一段 waypoint
        ENV->>LOC: 同一路单目 RGB
        LOC-->>AD: 当前位姿估计 p̂
        AD->>AD: d = p_tar − p̂ → c_comp = κ_ad(d)
        AD->>LOCO: c_comp 写入 96 维本体观测的速度命令槽位
        ENV->>LOCO: 腰部 RGB-D（深度 → 几何分支，RGB + DINOv2 → 语义分支）
        LOCO-->>G1: a ∈ R^29，q_target = q_default + a
        G1->>ENV: 迈步：遇到倒瓶 / 手机 / 水渍时侧步或跨越，实际位姿偏离
    end
    ENV->>VLN: 下一次决策（偏差已被纠正，观测与预期一致）
</div>

---

## 🎤 面试参考

**Q：为什么不直接把语义分割结果写进高程图，交给原来的几何策略？**
A：语义风险和几何形状不是一回事——水渍高度是 0，写进高程图要么人为抬高（引入假障碍）、要么丢失；本文让语义作为独立的「可踩性」通道并行输入，保留原几何策略的权重，再用 RL 学会怎么结合两者。

**Q：教师用真值语义图，学生凭什么学得会？**
A：学生的语义分支吃 RGB 和冻结的 DINOv2 特征，DINO 的通用视觉表示能区分外观（反光的水渍、手机），DAgger 在学生自己走到的状态上让教师标动作，避免分布偏移。但差距仍大：不平地 50.6% vs 93.6%。

**Q：去掉 anti-deviation 后 Progress 更高，为什么还说它有用？**
A：Progress 只看离目标的测地距离缩短了多少，机器人可以大方向往目标走却因偏差累积永远到不了；加上之后 SR、Safe SR、SPL 都明显提升、碰撞率从 35.9% 降到 12.3%，说明它把「接近」变成了「到达」。

**Q：两项跨越奖励为什么都要求「水平速度」或「下落速度」？**
A：净空奖励若不看水平速度，策略会学会把脚抬着不动来刷分；下落惩罚乘下落速度，只罚「还没越过就往下踩」，正常抬脚或已经越过时不罚，避免破坏原有步态。

---

## 🔗 相关阅读

- [NaVILA](../NaVILA_Legged_Robot_Vision-Language-Action_Model_for_Navigation/NaVILA_Legged_Robot_Vision-Language-Action_Model_for_Navigation.html)：本文的高层 VLN 模块与 VLN-CE-Isaac 场景来源
- [AME-2](../../05_Locomotion/AME-2__Agile_and_Generalized_Legged_Locomotion_via_Attention-Based_Neural_Map_Encoding/AME-2__Agile_and_Generalized_Legged_Locomotion_via_Attention-Based_Neural_Map_Encoding.html)：注意力读高程图的感知行走，本文几何底座 AME 的后续工作
- [Hiking in the Wild](../../04_Loco-Manipulation_and_WBC/Hiking_in_the_Wild__A_Scalable_Perceptive_Parkour_Framework_for_Humanoids/Hiking_in_the_Wild__A_Scalable_Perceptive_Parkour_Framework_for_Humanoids.html)：深度直接到关节动作的人形感知行走
- [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)：真机对比里的盲走基线
- [HumanoidVLN](../HumanoidVLN__Physics-Grounded_Simulator_and_Benchmark_for_Vision-Language_Navigation/HumanoidVLN__Physics-Grounded_Simulator_and_Benchmark_for_Vision-Language_Navigation.html) / [TAPNAV](../TAPNAV__Humanoid_Navigation_through_Tactile_Active_Perception/TAPNAV__Humanoid_Navigation_through_Tactile_Active_Perception.html)：同模块里的物理 VLN 基准与「看不见的东西用触觉探」的另一条思路
