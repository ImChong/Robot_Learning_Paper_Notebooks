---
layout: paper
title: "Adaptive Traversal Tubes for Posture-Aware Navigation of Bipedal Humanoids"
zhname: "ATT：面向双足人形姿态感知导航的自适应通行管道"
category: "Navigation"
arxiv: "2610.27688"
---

# Adaptive Traversal Tubes for Posture-Aware Navigation of Bipedal Humanoids
**沿参考路径给每一点算一个「可通行宽度」$w(s)$（墙的距离与行人的舒适距离取最小），再用 smoothstep 把宽度连续映射成「正面走 → 侧身横移」的姿态比例和全向速度命令 $(v_x, v_y, \omega_z)$，交给一个专门加了侧步动作的 AMP 行走策略执行；人形不再被当成固定圆盘，窄门和让行人走的是同一条通路**

> 📅 总结日期: 2026-11-02
>
> 🏷️ 板块: 08 Navigation · 姿态感知导航 · 窄通道通行 · 社交让行 · 侧步行走 · AMP 运动先验 · Unitree G1
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）· 上游 awesome-humanoid-robot-learning Navigation 章节中尚无笔记的最新论文（2026-10-20，PROGRESS #1162，上游标 🌟）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.27688](https://arxiv.org/abs/2610.27688) |
| HTML | [arxiv.org/html/2610.27688v1](https://arxiv.org/html/2610.27688v1) |
| PDF | [下载 v1](https://arxiv.org/pdf/2610.27688v1) |
| **发布时间** | 2026-10-20（arXiv v1，cs.RO，CC BY 4.0） |
| 项目页 | [lborogzj997/Humanoid-Navigation-in-Crowds-and-Narrow-Spaces](https://github.com/lborogzj997/Humanoid-Navigation-in-Crowds-and-Narrow-Spaces)（GitHub 仓库当项目页，放了 MuJoCo 仿真与 G1 真机的演示视频） |
| 源码 | ⏳ 截至 2026-11-02 未公开：上述仓库只有 README 和视频，写明「论文投稿后再放源码」，所以本文没有源码运行时序图 |
| 依赖的开源组件 | 定位用 FAST-LIO2（Livox Mid-360）；动作捕捉用 [GVHMR](https://github.com/zju3dv/GVHMR)，重定向用 [GMR](https://github.com/YanjieZe/GMR)（`unitree_g1` 配置）；行走先验按 [AMP](../../01_Foundational_RL/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control.html) 训练 |

**作者**：Zijian Ge（独立署名；作者此前在拉夫堡大学做移动机器人的拥挤感知路径规划与社交导航，见论文引用 [8–10]）

**定位**：这是一篇**只讲方法的预印本**——论文脚注与第 IV 节都写明「定量实验还在进行，会在修订版补上」，图 3 只是定性示意。读的时候把它当成一个清晰、可直接实现的导航层设计，而不是有实验结论的工作。

---

## 🎯 一句话总结

轮式机器人的底盘占地是固定的，遇到窄门只能判「过不去」，遇到行人只能绕或减速；人形却可以**转身侧着走**，把迎面宽度从肩宽缩到身体厚度。本文把这个能力提到导航层：**ATT**（自适应通行管道）沿 A* / Hybrid A* 的参考路径算一个有上下界的宽度场 $w(s)$，几何上取「到最近障碍距离 × 2 − 安全余量」，有行人时再和「到行人舒适边界的余量 × 2」取最小，墙和人走的是同一个标量；**IVH**（区间速度—朝向跟踪）把 $w(s)$ 在「身体厚度 $w _ {dp}$ — 肩宽 $w _ {sh}$」这个区间里用三次 smoothstep 连续映射成侧步比例 $\rho\in[0,1]$，期望朝向 = 路径切向 + $\sigma\cdot\frac{\pi}{2}\rho$（左右侧由最小转角 + 迟滞锁存决定），再把「沿切向前进 + 横向纠偏」的世界系速度转到机体系，得到 $(v_x, v_y, \omega_z)$；执行层是一个**加了侧步与过渡动作的 AMP 策略**（单目视频 → GVHMR → GMR 重定向到 G1，奖励把行进方向和面朝方向当两个独立命令），也可以直接换回 G1 自带的行走控制器。论文没有定量结果。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| ATT | Adaptive Traversal Tube | 自适应通行管道：参考路径 + 沿路径的可通行宽度场 $w(s)$ |
| IVH | Interval Velocity–Heading | 区间速度—朝向跟踪：宽度在区间内连续决定侧步比例、朝向和速度 |
| AMP | Adversarial Motion Priors | 对抗运动先验：判别器给风格奖励，让策略的动作像参考动作库 |
| GVHMR | Gravity-View Human Motion Recovery | 从单目视频恢复世界坐标下的人体动作（SMPL-X） |
| GMR | General Motion Retargeting | 通用动作重定向，把人体动作映射到 G1 |
| FAST-LIO2 | Fast LiDAR-Inertial Odometry 2 | 激光—惯性里程计，用于在先验地图上定位 |
| EDT | Euclidean Distance Transform | 欧氏距离变换：栅格地图每格到最近障碍的距离 |
| WBC / MPC | Whole-Body Control / Model Predictive Control | 全身控制 / 模型预测控制，经典落脚点规划路线 |

---

## ❓ 这篇论文要解决什么问题？

室内的门、走廊、家具间距往往只比人的肩宽宽一点，同时还要和行人共用空间。论文点出三个难点：

1. **通行宽度依赖姿态**：要紧的不是墙到墙的距离，而是「按机器人当前（以及计划中的）朝向，这个口子过不过得去」。把人形当固定圆盘，要么把侧身能过的门判成不可行，要么解释不了为什么撞上。
2. **几何约束和社交约束要统一**：在人多的地方，可用空间还会被舒适距离再压缩一层。对双足而言，社交压缩应该和物理瓶颈触发**同一种连续的姿态反应**（更早侧身、横向让行），而不只是绕路或减速。
3. **姿态调度要放在导航层、对接现成的速度接口**：落脚点 / 全身规划器能钻窄缝，但计算重心在落脚点和平衡，没有「宽度 → 身体偏航」这种可调的显式映射；Nav2 这类轮式导航栈成熟，却没有「正面 / 侧身」的概念。现在的人形大多对外暴露全向速度命令，导航层只需决定该发什么速度和朝向。

---

## 🔧 方法拆解

### 1. 系统总览（第 III-A 节，图 2）

Mid-360 激光雷达 + FAST-LIO2 在先验地图上定位 → 全局 A* 给长程参考路径，局部 Hybrid A* 在近场按更新后的代价图细化 → **ATT** 给路径挂上宽度场 $w(s)$ → **IVH** 跟踪路径并输出机体系 $(v_x, v_y, \omega_z)$ → 速度条件的行走策略执行（默认是侧步增强的 AMP 策略，也可以换成 G1 自带控制器）。

### 2. ATT：沿路径的可通行宽度（第 III-B 节）

- **管道定义**：参考路径 $\mathbf{p}(s)$（弧长 $s\in[0,L]$，切向 $\mathbf{t}(s)$，左法向 $\mathbf{n}(s)$）加一个标量宽度 $w(s)>0$，左右边界是 $\mathbf{p}(s)\pm\frac{1}{2}w(s)\mathbf{n}(s)$。$w(s)$ 回答的是「在 $s$ 处该假设多宽的正面通道」，不是两堵墙之间的欧氏距离。
- **几何宽度**：在占据栅格上做距离变换，得到路径点到最近障碍的距离 $c(s)$，

$$w _ {\mathrm{static}}(s)=\mathrm{clip}\bigl(2c(s)-m _ {\mathrm{safe}},\;w _ {\min},\;w _ {\mathrm{nom}}\bigr)$$

  $m _ {\mathrm{safe}}$ 给地图噪声、定位误差和身体厚度留余量；$w _ {\mathrm{nom}}$ 是上限——开阔处 IVH 只需要知道「够正面走」，不需要知道真有多空；$w _ {\min}$ 保证极窄处宽度仍为正，后面的比值不出问题。之后沿 $s$ 做一段滑动平均，宽度局部极小处再做长度 $\ell _ {\mathrm{blend}}$ 的过渡，避免门口、拐角处宽度突变；前方一段视野内用局部代价图，再远用全局地图，接缝处平滑混合。
- **社交压缩**：有行人时中心线不变，只压宽度。$d(s)$ 是路径点到最近行人的距离，$r_a$ 是其半径（或舒适半径），

$$w(s)=\min\Bigl(w _ {\mathrm{static}}(s),\;\mathrm{clip}\bigl(2\max(0,\,d(s)-r_a-m _ {\mathrm{safe}}),\,w _ {\min},\,w _ {\mathrm{nom}}\bigr)\Bigr)$$

  墙逼近和人逼近都只是让 $w(s)$ 变小，后面触发的是同一个侧步比例。没有行人时 $w=w _ {\mathrm{static}}$。

### 3. IVH：宽度 → 姿态 → 速度（第 III-C 节）

固定的链条：$w(s)\rightarrow\rho(s)\rightarrow\theta _ {\mathrm{des}}(s)\rightarrow(v_x,v_y,\omega_z)$。「区间」指姿态不是正面 / 侧身的二值开关，而是宽度落在两个身体尺寸之间时连续变化。

- **侧步比例**：$w _ {sh}$ 是正面宽度（约肩宽），$w _ {dp}$ 是身体前后厚度。$w\ge w _ {sh}$ 时 $\rho=0$（正面走），$w\le w _ {dp}$ 时 $\rho=1$（完全侧身），中间 $\rho=1-S(w;w _ {dp},w _ {sh})$，$S$ 是先归一化到 $[0,1]$ 再套三次 smoothstep $S(t)=t^2(3-2t)$。两端斜率为 0，所以宽度跨过阈值时朝向曲线仍是 $C^1$，进出窄段不会有转角上的折点。
- **期望朝向**：$\theta _ {\mathrm{des}}=\psi(s)+\sigma\cdot\frac{\pi}{2}\cdot\rho(s)$，$\psi$ 是路径切向角。侧哪一边 $\sigma\in\{\pm1\}$ 在窄段开始时按「离当前朝向转得更少」选一次，再用**迟滞锁存**：$\rho$ 超过进入阈值后冻结 $\sigma$，直到 $\rho$ 降到更低的释放阈值，避免宽度在阈值附近抖动时左右来回换。也可以按路径曲率或行人在哪一侧给 $\sigma$ 加偏好，锁存后局部重规划不翻转。
- **速度命令**：把机器人投影到路径上得到 $s$ 和带符号横向误差 $e _ {lat}$；前进速度 $v$ 从巡航值起、近目标时减、$\rho$ 大时再减（越窄越慢）。世界系期望速度 $\mathbf{v}_w=v\,\mathbf{t}(s)-k _ {lat}e _ {lat}\mathbf{n}(s)$（过渡中途可加大 $k _ {lat}$ 保持居中），转到机体系得 $(v_x,v_y)=\mathbf{R}(\mathrm{yaw})^\top\mathbf{v}_w$，偏航角速度 $\omega_z=\mathrm{clip}(k_\theta\,\mathrm{wrap}(\theta _ {\mathrm{des}}-\mathrm{yaw}),\pm\omega _ {\max})$。最后加限速率、低通，以及死区：一旦进入侧步（或正面）就保持最小的 $ \mid v_y \mid $（或 $v_x$），过渡时命令不会在 0 附近来回抖。

### 4. 侧步增强的 AMP 行走先验（第 III-D 节）

ATT、IVH 本身不管平衡，任何能跟速度命令的行走控制器都能接。但通用控制器偏向正面走，持续要 $v_y$、或在转身过程中 $v_x$ 和 $v_y$ 同时不为零时会变差，所以作者另训了一个首选后端，改动刻意收窄：

- **参考动作**：单目视频录人演示 IVH 会发的三类动作——正面走（约 0.3–1.0 m/s）、左右侧身横移（躯干与行进方向约 ±90°）、边平移边连续转身的过渡（含原地慢转）；正面、左侧、右侧、过渡四类时长大致相等，免得判别器被正面步态主导。GVHMR 恢复成 SMPL-X 世界坐标动作 → GMR 重定向到 G1 → 在仿真 G1 上回放检查脚接触、根高度和自穿模，有明显瑕疵的片段丢弃或重录，不指望 RL 去「修」坏示范。
- **命令与奖励**：每个回合给一个独立的转向命令 $(\mathbf{d}_t, v^\star, \mathbf{f})$——行进方向、期望速度、面朝方向。$\mathbf{f}\approx\mathbf{d}_t$ 是正面走，$\mathbf{f}\perp\mathbf{d}_t$ 是纯侧步，中间是部分偏航。任务奖励

$$r _ {\mathrm{task}}=w_v\exp\bigl(-\alpha_v\lVert v^\star\mathbf{d}_t-\mathbf{v}\rVert^2\bigr)+w_f\max(0,\mathbf{f}^\top\mathbf{h})$$

  默认 $w_v=0.7$、$w_f=0.3$、$\alpha_v=0.5$；沿 $\mathbf{d}_t$ 的速度为负时速度项清零，防止侧步时倒着走也能拿分。总奖励 $r=0.5\,r _ {\mathrm{task}}+0.5\,r _ {\mathrm{disc}}$。
- **课程**：转向命令每 4–7 s 重抽一次；A 阶段（可选）只学风格；B 阶段 $\phi\in\{0,\pm\pi/2\}$ 等概率、$v^\star\sim\mathcal{U}[0.2,0.8]$ m/s；C 阶段 $\phi\sim\mathcal{U}[-\pi/2,\pi/2]$，偶尔让 $\mathbf{d}_t$ 和 $\mathbf{f}$ 一起转，模拟 IVH 的过渡。约 4096 个并行环境、10 s 回合、摔倒终止，判别器用回放缓冲与梯度惩罚。
- **部署与替换**：IVH 的 $(v_x,v_y,\omega_z)$ 换算成等价的 $(\mathbf{d}_t,v^\star,\mathbf{f})$（或直接用机体系速度训练，论文说两者等价）；导出的策略放在和 G1 默认控制器同一个 SDK 接口后面，换后端不动 ATT / IVH。

### 5. 计划中的评估（第 IV 节）

- **场景**：窄走廊 / 门（宽度介于肩宽与身体厚度之间，正面过不去、侧身能过）；可选的迎面行人让行。
- **对照**：只正面走的基线（同样的定位、路径和行走后端，偏航锁在路径切向、$v_y\approx0$）对比完整 ATT + IVH；后续消融包括「二值 ±90° 不用平滑 $\rho$」「只用几何宽度、不压社交」「默认行走控制器 vs 增强 AMP」。
- **指标**：成功率、碰撞 / 卡住次数、最小障碍间距（及最小人际距离）、通行时间；比较行走后端时加朝向误差和 $(v_x,v_y)$ 联合跟踪误差。**本版没有任何定量数字。**

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph OFF["🎥 离线：侧步增强 AMP 先验"]
        VID["单目视频<br/>正面 · 左右侧步 · 转身过渡"]
        GV["GVHMR → SMPL-X 世界坐标动作"]
        GM["GMR 重定向到 G1<br/>仿真回放筛掉坏片段"]
        AMP["AMP + PPO（~4096 环境）<br/>命令 d_t · v* · f<br/>r = 0.5 r_task + 0.5 r_disc"]
        VID --> GV --> GM --> AMP
    end

    subgraph NAV["🧭 在线导航层"]
        LOC["Mid-360 + FAST-LIO2<br/>先验地图定位"]
        PLAN["全局 A* + 局部 Hybrid A*<br/>参考路径 p(s)"]
        ATT["ATT 宽度场 w(s)<br/>min( 几何 2c−m_safe , 社交 2(d−r_a−m_safe) )<br/>clip 到 [w_min, w_nom] + 平滑"]
        RHO["侧步比例 ρ(s)<br/>w ≥ 肩宽 → 0；w ≤ 厚度 → 1<br/>中间 smoothstep"]
        HEAD["期望朝向 θ = ψ + σ·π/2·ρ<br/>σ：最小转角 + 迟滞锁存"]
        VEL["v_w = v·t − k_lat·e_lat·n<br/>转机体系 → (v_x, v_y, ω_z)<br/>限速率 · 低通 · 死区"]
        LOC --> PLAN --> ATT --> RHO --> HEAD --> VEL
        PED["行人检测（真机仍在开发）"] -.-> ATT
    end

    subgraph EXE["🦿 执行"]
        POL["侧步增强 AMP 策略"]
        DEF["G1 默认行走控制器<br/>（同一接口，可替换）"]
        G1["Unitree G1：正面走 ↔ 侧身挤过 / 让行"]
        POL --> G1
        DEF -.-> G1
    end

    AMP -. 导出 .-> POL
    VEL --> POL
    VEL -.-> DEF
    style ATT fill:#d8ecff,stroke:#3b7dd8
    style RHO fill:#d8ecff,stroke:#3b7dd8
    style POL fill:#fde7c8,stroke:#d08a2c
</div>

> 读法：蓝色两块是论文的核心——墙和行人都只通过同一个宽度 $w(s)$ 进入，再连续地变成侧步比例；橙色的 AMP 策略是首选执行后端，虚线的默认控制器表示可以直接换上，ATT / IVH 不用改。

---

## 🚶 具体实例

论文没有给 G1 的 $w _ {sh}$、$w _ {dp}$ 和 $m _ {\mathrm{safe}}$ 等取值，下面的数都是**我们假设的**，只为看清映射怎么走：$w _ {sh}=0.45$ m、$w _ {dp}=0.25$ m、$m _ {\mathrm{safe}}=0.10$ m、$w _ {\min}=0.20$ m、$w _ {\mathrm{nom}}=1.0$ m。

### 例 1：门宽 → 侧步比例 → 转多少度

路径从门正中穿过，所以 $2c$ 就是门宽。

| 门宽 $2c$ | $w=\mathrm{clip}(2c-0.1)$ | 归一化 $t=\frac{w-0.25}{0.20}$ | $\rho=1-t^2(3-2t)$ | 偏航偏移 $90^\circ\rho$ |
|---|---|---|---|---|
| 1.20 m | 1.00（上限） | — | 0 | 0°（正面走） |
| 0.50 m | 0.40 | 0.75 | 0.156 | 14.1° |
| 0.40 m | 0.30 | 0.25 | 0.844 | 75.9° |
| 0.30 m | 0.20（下限） | — | 1 | 90°（完全侧身） |

门宽从 0.5 m 缩到 0.4 m，偏航偏移从 14° 跳到 76°：smoothstep 中段最陡，大部分转身集中在宽度接近身体厚度的那一段。

### 例 2：行人和门是同一个量

开阔走廊（$w _ {\mathrm{static}}=1.0$）里，一个行人离路径点 $d=0.6$ m、舒适半径 $r_a=0.3$ m：社交宽度 $=2\max(0,0.6-0.3-0.1)=0.4$ m，$w=\min(1.0,0.4)=0.4$ m——和例 1 里 0.5 m 的门完全一样，机器人同样侧过 14.1°。人再走近到 $d=0.5$ m，社交宽度 0.2 m，直接完全侧身让行。

### 例 3：完全侧身时的机体系速度

路径沿世界 $+x$，$\psi=0$；$\rho=1$、$\sigma=+1$，机器人已经转到 $\mathrm{yaw}=90^\circ$，横向误差为 0，$v=0.5$ m/s。$\mathbf{v}_w=(0.5,0)$，转到机体系：$v_x=\cos90^\circ\cdot0.5=0$，$v_y=-\sin90^\circ\cdot0.5=-0.5$ m/s，$\omega_z=0$——也就是面朝左边、向自己的右侧横移。这正是通用控制器最不擅长、AMP 先验专门补的命令。

### 例 4：AMP 任务奖励

命令：$\mathbf{d}_t=(1,0)$、$v^\star=0.5$、$\mathbf{f}=(0,1)$（纯侧步）。实际速度 $\mathbf{v}=(0.4,0.1)$，朝向偏了 10°（$\mathbf{f}^\top\mathbf{h}=\cos10^\circ=0.985$）。速度误差平方 $0.1^2+0.1^2=0.02$，速度项 $e^{-0.5\times0.02}=0.990$；$r _ {\mathrm{task}}=0.7\times0.990+0.3\times0.985=0.988$。可见 $\alpha_v=0.5$ 时速度项很平——误差 0.14 m/s 只扣 1%，论文也提到若 G1 室内速度比人慢，会再调低 $\alpha_v$ 避免过尖；真正区分好坏的更多靠判别器的风格奖励。

---

## 📊 关键结果

**没有定量结果。** 论文第 IV-C 节明确写「定量表格与统计比较有意省略，试验完成后补上」，图 3 的 G1 真机画面（迎面行人时侧身让行、窄走廊侧身挤过再恢复正面）只能当定性示意。

项目仓库 README 列出的进度（截至 2026-08 的最后一次提交）：MuJoCo 全栈仿真（规划 → 跟踪 → 行走）有演示视频；真机 FAST-LIO2 定位、全局规划 + 通道跟踪已测试；**基于视觉的行人检测与局部规划仍在开发中**——也就是说真机上的社交压缩目前还没有完整打通。

---

## 💡 核心贡献

1. **ATT 宽度场**：把几何间隙和社交舒适距离统一成沿路径的一个有界、可视化、参数可解释的标量 $w(s)$。
2. **IVH 姿态调度**：用肩宽 / 身体厚度两个阈值 + smoothstep，把宽度连续映射为正面 → 侧身的偏航和全向速度命令，带迟滞锁存和死区防抖。
3. **侧步增强 AMP 先验**：用自录的正面 / 侧步 / 过渡视频，把行进方向与面朝方向解耦成两个命令来训练，可与默认控制器即插即换。
4. **评估协议**：G1 上与「只正面走」基线的对照方案（结果待补）。

---

## 🤖 对人形机器人领域的意义

- **轻量、模块化的姿态感知导航**：和 [STATE-NAV](../STATE-NAV__Stability-Aware_Traversability_Estimation_for_Bipedal_Navigation_on_Rough_Terrain/STATE-NAV__Stability-Aware_Traversability_Estimation_for_Bipedal_Navigation_on_Rough_Terrain.html) 这类「可通行性估计」、或端到端 RL 导航不同，ATT + IVH 只在已有的全向速度接口上加一层几何规则，几乎不需要训练，换地图栈或行走后端都只要调参。思路可以直接借到任何对外暴露 $(v_x,v_y,\omega_z)$ 的人形上。
- **「人形占地可变」是值得做成一等公民的概念**：轮式栈的膨胀半径默认占地固定；人形侧身能把迎面宽度从肩宽降到厚度，这在门、电梯、拥挤走廊里很实用。
- **局限**（结合论文与仓库）：没有定量实验；宽度只取路径点到最近障碍的**单侧距离 × 2**，路径不在通道正中时会低估一侧、高估另一侧（论文把 $c(s)$ 当「半宽估计」，这是它自带的假设，我们读出的）；侧身时只考虑了身体厚度，没考虑侧步时双脚横向张开的宽度和摆臂；真机行人检测尚未完成。和 [EgoNav（从人类数据学导航）](../EgoNav__Learning_Humanoid_Navigation_from_Human_Data/EgoNav__Learning_Humanoid_Navigation_from_Human_Data.html) 这类学习式方法相比，规则式的好处是可解释，代价是复杂人群里的交互行为要靠宽度这一个标量表达。

---

## 🎤 面试参考

1. **为什么用 smoothstep 而不是线性插值或二值切换？** smoothstep 在两端斜率为 0，宽度跨过 $w _ {dp}$ / $w _ {sh}$ 时朝向曲线保持 $C^1$，进出窄段不会出现角速度突变；二值 ±90° 会在阈值处猛转，论文把它列为计划中的消融。
2. **为什么 $w(s)$ 要设上限 $w _ {\mathrm{nom}}$？** IVH 只关心「够不够正面走」，开阔区域的真实宽度对决策没意义；设上限后宽度场更稳定、也更好调。
3. **左右侧的选择为什么要迟滞锁存？** 宽度在阈值附近抖动时 $\rho$ 会在进入 / 退出之间来回，若每拍都按最小转角重选 $\sigma$，机器人会左右来回扭；锁存后一旦决定从哪边侧就坚持到窄段结束。
4. **AMP 奖励里为什么把行进方向和面朝方向分开？** 普通速度跟踪奖励默认机器人面朝前进方向，侧步和「边走边转」学不出来；把 $\mathbf{d}_t$、$\mathbf{f}$ 设成独立命令，$\phi$ 从离散 {0, ±90°} 过渡到连续，策略才学会任意偏航下的全向平移。
5. **为什么速度项在沿 $\mathbf{d}_t$ 的投影为负时清零？** 防止策略在侧步时倒退也能靠朝向项和风格项拿分。

---

## 🔗 相关阅读

- [AMP: Adversarial Motion Priors](../../01_Foundational_RL/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control.html)——行走先验的训练框架
- [GMR: Retargeting Matters](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html)——人体视频动作到 G1 的重定向
- [STATE-NAV](../STATE-NAV__Stability-Aware_Traversability_Estimation_for_Bipedal_Navigation_on_Rough_Terrain/STATE-NAV__Stability-Aware_Traversability_Estimation_for_Bipedal_Navigation_on_Rough_Terrain.html)——双足导航的另一种「可通行性」表示
- [EgoNav: Learning Humanoid Navigation from Human Data](../EgoNav__Learning_Humanoid_Navigation_from_Human_Data/EgoNav__Learning_Humanoid_Navigation_from_Human_Data.html)——论文引用 [21]，从人类步行数据学导航先验
- EmoBipedNav（[arXiv 2503.12538](https://arxiv.org/abs/2503.12538)）——论文引用 [18]，情绪感知的双足社交导航（本仓库待读）
