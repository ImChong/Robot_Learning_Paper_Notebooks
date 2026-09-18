---
layout: paper
title: "HOMIE: Humanoid Loco-Manipulation with Isomorphic Exoskeleton Cockpit"
category: "高影响力精选 High Impact Selection"
subcategory: "Teleoperation & Imitation Learning"
zhname: "HOMIE：同构外骨骼驾驶舱式人形遥操作系统"
---

# HOMIE: Humanoid Loco-Manipulation with Isomorphic Exoskeleton Cockpit
**HOMIE：同构外骨骼驾驶舱式人形遥操作系统**

> 📅 阅读日期: 2026-05-15
>
> 🏷️ 板块: 03_High_Impact_Selection / Teleoperation & Imitation Learning
>
> 🧭 状态: 首版基础摘要（含 mermaid 流程图）；后续可结合论文消融表格与硬件 BOM 二读补表。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2502.13013](https://arxiv.org/abs/2502.13013) |
| **HTML** | [arxiv.org/html/2502.13013v2](https://arxiv.org/html/2502.13013v2) |
| **PDF** | [arxiv.org/pdf/2502.13013](https://arxiv.org/pdf/2502.13013) |
| **项目主页** | [homietele.github.io](https://homietele.github.io/) |
| **发布时间** | 2025-02-18 (arXiv), RSS 2025 |
| **源码** | [InternRobotics/OpenHomie](https://github.com/InternRobotics/OpenHomie) |
| **OpenReview** | [WSZKGX2Ty7](https://openreview.net/forum?id=WSZKGX2Ty7) |
| **作者** | Qingwei Ben*, Feiyu Jia*, Jia Zeng, Junting Dong, Dahua Lin, Jiangmiao Pang |
| **机构** | Shanghai AI Laboratory / CUHK MMLab |
| **会议** | RSS 2025 |
| **机器人** | Unitree G1、Fourier GR-1（适配多机型） |
| **硬件成本** | ~$500（含外骨骼 + 手套 + 踏板） |

---

## 🎯 一句话总结

HOMIE 把"踩踏板控腿、同构外骨骼控臂、Hall 传感手套控手"塞进一个像赛车座舱的低成本平台，配套一个**不依赖任何 MoCap 动作先验**的 RL 全身策略——通过上身姿态课程学习 + 高度跟踪奖励 + 对称性增强，让 Unitree G1 / Fourier GR-1 在任意上身姿态下都能稳走稳蹲，把人形遥操作从"VR + IK 解算"路线切回了高精度、低延迟的关节匹配路线，仅 $500 BOM 即可一人独立完成全身 loco-manipulation 数据采集。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **WBC** | Whole-Body Control | 同时协调腿、躯干、手臂、手指的全身控制 |
| **Loco-Manip.** | Locomotion + Manipulation | 移动操作，行走/蹲下时仍能精准操作物体 |
| **FPV** | First-Person View | 机器人头部相机的第一视角画面 |
| **Joint-matching** | 关节匹配 | 同构机械臂直接 1:1 复制关节角，跳过 IK |
| **IK** | Inverse Kinematics | 逆运动学求解，主流 VR 遥操依赖项 |
| **MoCap** | Motion Capture | 动捕设备，传统 WBC 训练所需的动作先验源 |
| **DoF** | Degrees of Freedom | 自由度，HOMIE 手套支持 ≥15 DoF |
| **PPO** | Proximal Policy Optimization | 训练 $\pi _ {\text{loco}}$ 的 RL 算法 |

---

## ❓ 论文要解决什么问题？

当前人形遥操作存在三条路线，但每条都有硬伤：

1. **VR / 视觉 + IK 路线**（OpenTelevision / Mobile-TeleVision / AnyTeleop）：抓得到大致姿态，但 IK 是迭代近似，**延迟高 + 精度差 + 遮挡敏感**；
2. **MoCap + 关节匹配路线**（DexCap 等）：精度好但**设备贵到 $4k+**，且 WBC 训练还得依赖 retargeted MoCap 数据做 motion prior；
3. **同构外骨骼路线**（GELLO / AirExo / Mobile-ALOHA）：精度和频率都漂亮，**但只覆盖单/双臂，不支持灵巧手，更不涉及行走与蹲下**。

更糟的是，**控腿和控臂被天然割裂**：RL locomotion 策略善于在地形上稳定行走，但没有面向遥操的姿态接口；遥操系统又只关心上肢，从不考虑行走对工作空间的影响。

HOMIE 要做的就是把这三条线**收成一个驾驶舱**：底层 $\pi _ {\text{loco}}$ 用 PPO 学一个**不需要 MoCap 先验**的 loco 策略；上层用同构外骨骼 + Hall 手套做 joint-matching；行走和蹲下命令则被压成一只踏板上的三维向量 $C_t = [v_x, \omega _ {\text{yaw}}, h]$，让操作员双手始终空闲。

---

## 🔧 方法详解

### 1. 系统总览：踏板 + 外骨骼 + 手套 = 一套驾驶舱

操作员坐在驾驶舱里：

- **下肢**：踩踏板生成 $C_t = [v_x, \omega _ {\text{yaw}}, h]$（前进速度、转向速度、躯干目标高度），通过 Wi-Fi 发给机器人；策略 $\pi _ {\text{loco}}$ 在机上以 50 Hz 接管下半身；
- **上肢**：同构 7-DoF 外骨骼直接读关节角 $q _ {\text{upper}}$，1:1 设给机器人对应电机，**完全跳过 IK**；
- **手指**：Hall 传感手套提供 ≥15 DoF 的指关节信号，可适配任意灵巧手；
- **视觉反馈**：机器人 FPV 通过 Wi-Fi 回传到舱内屏幕。

通信全部走 Wi-Fi，远距离作业也能用。

### 2. RL 训练框架（$\pi _ {\text{loco}}$）三件套

观测堆叠 5 步历史：$O_t = [C_t, \omega_t, g_t, q_t, \dot q_t, a _ {t-1}]$，喂给 MLP 输出关节目标位置，再经 PD 转扭矩。**整个训练完全不需要 AMASS / MoCap 数据**，这是 HOMIE 相对 ExBody/HumanPlus/H2O 路线的最大差异。

#### ① 上身姿态课程（Upper-body Pose Curriculum）

为了让 $\pi _ {\text{loco}}$ 适应**任意连续变化的上身姿态**，引入比率 $\rho_a$（初始 0、线速度跟踪达标就 +0.05，最终到 1）：

$$ p(\rho_a' \mid \rho_a) = \frac{20(1-\rho_a)\,e^{-20(1-\rho_a)\rho_a'}}{1 - e^{-20(1-\rho_a)}} $$

按此采样得到上身关节角范围，再每 1 s 重采样 + 线性插值平滑过渡。比直接 $\mathcal{U}(0, \rho_a)$ 平滑得多，避免上身突然甩动让下肢失衡。

#### ② 高度跟踪奖励（Height Tracking Reward）

蹲下能力对于"拾取地面物体 / 操作高低不同的桌面"是刚需。引入：

$$ r _ {\text{knee}} = -\Big\| (h _ {r,t} - h_t) \times \big( \frac{q _ {\text{knee},t} - q _ {\text{knee},\min}}{q _ {\text{knee},\max} - q _ {\text{knee},\min}} - \tfrac{1}{2} \big) \Big\| $$

含义是：当 $h _ {r,t} > h_t$（站太高）就鼓励膝关节弯，反之鼓励膝伸。每 4 秒重采样命令，**1/3 环境训蹲、2/3 训站走**，同一环境会在蹲/走之间切换，保证 $\pi _ {\text{loco}}$ 蹲走过渡丝滑。

#### ③ 对称性利用（Symmetry Utilization）

每条转移 $T_t = (s_t, a_t, r_t, s _ {t+1})$ 沿机器人 x-z 平面镜像得到 $T_t'$，**一起入 rollout buffer**，并在 policy 网络上加：

$$ \mathcal{L}^{\text{actor}} _ {\text{sym}} = \text{MSE}(a_t, a_t'),\quad \mathcal{L}^{\text{critic}} _ {\text{sym}} = \text{MSE}(V_t, V_t') $$

强制策略左右对称，**等价于 2× 数据增强**，且大幅减小左右肢动作不一致导致的偏漂。

### 3. 硬件设计要点

- **同构外骨骼**：3 (shoulder) + 1 (elbow) + 3 (wrist) = 7 DoF/臂，每关节用 DYNAMIXEL XL330-M288-T 伺服，**0.09° 读数精度**；用伺服而非增量编码器是为了断电后保留绝对位置；
- **Hall 传感手套**：摒弃舵机，用霍尔传感器在小尺寸下塞下 15+ DoF，可拆卸后复用到不同机器人外骨骼；
- **踏板**：模拟开车的"踩-松"动作，把腿解放出来。

外骨骼几何与机器人 URDF 关节坐标系对齐，开机一次性标定后直接做 $q_t = p_t - o_t$ 的偏置映射。

### 4. 数据飞轮：$\pi _ {\text{loco}} \to$ 遥操采集 $\to \pi _ {\text{auto}}$

遥操产生的状态-动作流可直接作为模仿学习数据训练 $\pi _ {\text{auto}}$；训好后 $\pi _ {\text{auto}}$ 接管驾驶舱角色，自动给出 $(C_t, q _ {\text{upper}})$，让机器人自主完成同类任务。这是把"低成本遥操"打成"低成本数据工厂"的关键闭环。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph COCKPIT["🪑 驾驶舱（人）"]
        P1["踏板<br/>Pedal"]
        P2["同构外骨骼 7-DoF×2<br/>+ Hall 手套 15-DoF×2"]
        P3["FPV 屏幕<br/>实时机器人视角"]
    end

    subgraph CMD["📡 命令空间"]
        C1["C_t = [v_x, ω_yaw, h]<br/>locomotion 命令"]
        C2["q_upper = 同构关节角<br/>(跳过 IK)"]
        C3["手指 15+ DoF"]
    end

    subgraph TRAIN["🎓 RL 训练（无 MoCap）"]
        T1["上身姿态课程 ρ_a<br/>0→1 渐进采样"]
        T2["高度跟踪奖励 r_knee<br/>1/3 蹲 + 2/3 走"]
        T3["对称性利用<br/>镜像增强 + L_sym"]
        T4["PPO + 5 步历史<br/>MLP → PD 扭矩"]
        T1 --> T4
        T2 --> T4
        T3 --> T4
    end

    subgraph ROBOT["🤖 真机执行 (Unitree G1 / Fourier GR-1)"]
        R1["π_loco<br/>下肢策略（50 Hz）"]
        R2["上肢直接 joint-matching"]
        R3["灵巧手 joint-matching"]
    end

    subgraph FLYWHEEL["🔁 数据飞轮"]
        F1["遥操示范采集"]
        F2["训练 π_auto"]
        F3["自主任务执行"]
        F1 --> F2 --> F3
    end

    P1 --> C1
    P2 --> C2
    P2 --> C3
    P3 -.观察.-> P1
    TRAIN -->|sim-to-real| R1
    C1 --> R1
    C2 --> R2
    C3 --> R3
    ROBOT --> F1
    F3 -->|接管| C1
    F3 -->|接管| C2

    style COCKPIT fill:#e8f4fd,stroke:#1f78b4
    style CMD fill:#f4ecf7,stroke:#8e44ad
    style TRAIN fill:#fdebd0,stroke:#e67e22
    style ROBOT fill:#e8f8e8,stroke:#27ae60
    style FLYWHEEL fill:#fce4ec,stroke:#c2185b
</div>

---

## 📊 实验亮点（节选）

- **硬件成本** $0.5k，对比 OpenTelevision/DexCap 的 $4k、Mobile-ALOHA 的 $32k 是数量级下降；
- **姿态获取速度** 比 VR / 视觉方案快 **~200%**，且精度由 0.09° 伺服读数保证；
- **任务完成时间**：在抓放、装配等代表任务上**用 ~1/2 时间**完成同等任务；
- **零样本 sim-to-real**：仅在 Isaac Gym 训出的 $\pi _ {\text{loco}}$ 可直接迁移至 Unitree G1、Fourier GR-1；
- **消融**：去掉上身姿态课程 / 高度奖励 / 对称性增强中的任一项，要么不能蹲、要么上身大幅动作时下肢失衡；
- **下游 IL**：HOMIE 采集的数据直接喂 imitation learning，机器人可自主完成抓放类任务。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|------|------|
| **遥操作路线** | 把"VR + IK"主流路线拉回"同构 + 关节匹配"，证明低成本机械方案的精度和效率上限 |
| **WBC 训练** | 首次系统化证明**不依赖 MoCap 先验**也能稳定做含动态蹲下的人形 loco-manipulation |
| **数据采集** | $500 即可一人独立采全身 demo，是替代 HumanPlus / OmniH2O 这类 VR-based 数据飞轮的可行选项 |
| **多机型适配** | 外骨骼 + 手套均设计为可换躯壳，方便迁移到不同 humanoid（论文实测 G1 / GR-1） |

---

## 🎤 面试参考

**Q：HOMIE 和 OmniH2O / HumanPlus 路线上的本质区别？**  
A：OmniH2O / HumanPlus 用 VR 或视觉先估出人体姿态，再 retarget + IK 解算关节角，**训练依赖 MoCap motion prior**；HOMIE 用同构外骨骼直接拿到机器人坐标系下的关节角（joint-matching），完全跳过 IK 和 retargeting，且 $\pi _ {\text{loco}}$ 训练不需要任何 MoCap 数据，靠"姿态课程 + 高度奖励 + 对称性"三件套自适应任意上身姿态。

**Q：为什么用踏板而不是手柄或身体跟随做 locomotion 命令？**  
A：手柄占用一只手，跟下肢操作冲突；身体跟随（HumanPlus 风格）要求操作员的物理空间和机器人匹配，不利于大场景或远距离作业。踏板把"控走 / 控蹲"塞到脚上，**双手全部留给上肢和手指**，符合"驾驶舱"隐喻，也方便单人完成全身 loco-manipulation。

**Q：上身姿态课程为何要用非均匀分布而不是直接 $\mathcal{U}(0, \rho_a)$？**  
A：因为上身姿态变化对下肢扰动是**非线性陡峭**的：早期策略稍微开个 30° 关节角就可能翻车。论文用指数采样分布让初始阶段大概率采到接近零的姿态偏移，随 $\rho_a \to 1$ 才平滑过渡到均匀分布，避免一上来就过难导致策略坍塌。

**Q：HOMIE 能不能直接接 LLM / VLA 实现自主？**  
A：可以。$\pi _ {\text{auto}}$ 就是占位的"上层规划器"，HOMIE 提供的 $(C_t, q _ {\text{upper}})$ 接口非常薄，任何能输出这个指令格式的策略（IL、Diffusion Policy、甚至 VLA 直接吐 token）都能接入。论文已经演示了 IL 直接驱动机器人做抓放任务。

**Q：和 HOVER 同样追求"统一接口"，差别在哪？**  
A：HOVER 把多个**已有控制模式**用 mask 统一到一个学生策略里，强调控制层面的可复用；HOMIE 把**人 ↔ 机器人的物理接口**统一到同构硬件 + 踏板，强调采集端的可用性。两者其实正交：HOVER 可以做底层 motor backbone，HOMIE 做上层数据飞轮，组合起来就是一套完整的人形遥操栈。

---

## 🔗 相关阅读

- [OmniH2O (2406.08858)](https://arxiv.org/abs/2406.08858)：H2H 通用遥操，HOMIE 直接对比的 VR 路线 (H8)
- [HumanPlus (2406.10454)](https://arxiv.org/abs/2406.10454)：身体跟随 + RGB 估姿，遥操开山作 (H7)
- [GELLO / AirExo](https://wuphilipp.github.io/gello_site/)：同构外骨骼前作（HOMIE 在此基础上扩展到 humanoid + 灵巧手）
- [Mobile-ALOHA (2401.02117)](https://arxiv.org/abs/2401.02117)：双臂 + 移动底盘的 joint-matching 系统
- [InternRobotics/OpenHomie](https://github.com/InternRobotics/OpenHomie)：官方实现，含驾驶舱 CAD、电路与 RL 训练代码

---

## 📎 附录：与该笔记并行的"高影响力精选"笔记

| 类别 | 已完成 | 待补 |
|------|------|------|
| 全身控制核心 | ExBody1 / ExBody2 / HOVER | HugWBC / SONIC / UH-1 |
| 遥操作与模仿学习 | OmniH2O / **HOMIE (本文)** | HumanPlus / EgoMimic / iDP3 |
| 仿真平台与工具 | ProtoMotions3 / Isaac Lab | Humanoid-Gym / HumanoidBench / BEHAVIOR Robot Suite |
