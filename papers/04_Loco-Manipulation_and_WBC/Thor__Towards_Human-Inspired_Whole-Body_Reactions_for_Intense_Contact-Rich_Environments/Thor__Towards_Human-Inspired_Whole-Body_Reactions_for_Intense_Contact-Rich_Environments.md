---
layout: paper
title: "Thor: Towards Human-Inspired Whole-Body Reactions for Intense Contact-Rich Environments"
zhname: "Thor：面向高强度接触环境的类人全身反应"
category: "Loco-Manipulation and WBC"
arxiv: "2510.26280"
---

# Thor: Towards Human-Inspired Whole-Body Reactions for Intense Contact-Rich Environments
**让人形在大力拉拽时会像人一样「往后仰」：把全身策略拆成下肢 / 腰 / 上肢三个共享观测、各自奖励和 critic 的 actor，再用准静态力矩平衡推出一个随手部受力变化的质心水平偏移参考 $d^{\ast}$，作为下肢的 FAT2 奖励；Unitree G1 双手后退拉力均值峰值 167.7 N（比 FALCON 高 68.9%），单手拉开约 60 N 的防火门，后退拖动 1.7 吨轿车。**

> 📅 总结日期: 2026-10-06
>
> 🏷️ 板块: 04 Loco-Manipulation & WBC · 大力交互 · 三策略分解（下肢 / 腰 / 上肢）· ZMP 推导的躯干倾斜奖励 · Unitree G1
>
> 🔁 推进轨: 模块轮转（13_Physics-Based_Animation → ~~14_Human_Motion~~ → **04_Loco-Manipulation_and_WBC**）· 14_Human_Motion 中上游 awesome-humanoid-robot-learning 收录的论文已全部有笔记，按 AGENTS.md「模块 04–14 只为上游已收录论文建笔记」顺延到 04；Thor 是 04 模块上游已收录、尚无独立笔记的最新论文（2025.10）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2510.26280](https://arxiv.org/abs/2510.26280) |
| HTML | arXiv 未提供 HTML 渲染（各版本均 404），可在线阅读 [alphaXiv 页面](https://www.alphaxiv.org/abs/2510.26280) |
| PDF | [下载 v4](https://arxiv.org/pdf/2510.26280v4) |
| **发布时间** | 2025-10-30（arXiv v1） |
| 依据版本 | 2026-09-21 的 arXiv v4 |
| 项目主页 | [baai-aether.github.io/baai-thor](https://baai-aether.github.io/baai-thor/)（含真机视频） |
| 源码 | ⏳ 项目主页标注 **Code (Coming Soon)**，暂未开源（故本笔记无源码运行时序图） |

**作者**：Gangyang Li, Hongzhe Shi, Qing Shi, Youhao Hu, Cong Ma, Zhongyuan Wang, Xinlong Wang, Shaqi Luo（北京智源人工智能研究院 BAAI · 北京理工大学 · 清华大学 · XYZ Embodied AI）

> 标题变化：v1 / v2 叫 *Towards **Human-Level** Whole-Body Reactions…*（上游列表仍用这个名字），v3 起改成 ***Human-Inspired***；v4 新增了容量匹配的仿真消融（图 5）和 HEFT、SONIC 等基线。

---

## 🎯 一句话总结

人拉一扇沉重的门，会自然地身体后仰、一步步往后退，用体重去「抵」住拉力。Thor 把这个直觉写成奖励：手上受多大的力、作用点多高，就要求整机质心往反方向偏多少（FAT2）；同时把全身策略拆成**下肢负责走路和抗力、腰负责躯干姿态、上肢负责跟踪动作**三个 actor，避免一个策略同时兼顾互相冲突的目标。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| FAT2 | Force-Adaptive Torso-Tilt | 力自适应躯干倾斜奖励：按手部受力给出质心偏移参考 |
| ZMP | Zero-Moment Point | 零力矩点；脚底合力矩为零的点，必须落在支撑多边形内 |
| CoM | Center of Mass | 整机质心 |
| EE | End-Effector | 末端执行器，这里指双手 |
| MAE / MPJPE | Mean Absolute Error / Mean Per-Joint Position Error | 腰关节误差 / 上肢关节位置误差 |
| GMR | General Motion Retargeting | 部署时把 VR 采集的人体动作重定向到 G1 上肢 |
| $F^{180^\circ} _ {db}$ | dual-hand, backward | 双手、后退、拉力方向与机体 x 轴成 180°；s = 单手，f = 前进，p = 原地 |

---

## ❓ 论文要解决什么问题？

1. **外力一大就站不稳、跟不住**：开防火门、拖货架、拉车时手上有上百牛的持续拉力，既要保持平衡，又要让腰和手臂继续跟踪遥操作指令。
2. **基于模型的方法依赖精确力信息**：需要准确的动力学模型和测得 / 估计的外力，碰到未知交互就不灵。
3. **一个策略管全身，目标互相打架**：下肢要为抗力调整姿态，腰要维持指定的躯干-骨盆朝向，上肢要跟踪参考动作；FALCON、HOMIE 已经把上下肢拆开，但腰仍和下肢绑在一起。
4. **已有工作重在「站得稳」，没去「借姿态多出力」**：FALCON / HAFO / FAME 关注稳定性或负载自适应，很少主动利用全身姿态去提高能持续输出的拉力。

---

## 🔧 方法拆解

**① 观测与指令**
- 本体观测 $\mathcal{O}_t$：29 维关节角、29 维关节速度、角速度、重力投影；上一步动作 $a _ {t-1} \in \mathbb{R}^{29}$；
- 指令 $\mathcal{C}_t$：平面线速度、偏航角速度、步态模式、髋高、3 维腰目标角；参考 $\mathcal{R}_t$：14 维上肢目标关节角（训练时取自 AMASS，部署时来自 VR + GMR）；
- 特权信息 $\mathcal{P}_t$（只给 critic）：线速度、姿态四元数、双手外力 $F_t \in \mathbb{R}^6$。

**② 三策略分解 $\pi = [\pi_l, \pi_w, \pi_u]$**
- $\pi_l$：12 个腿部关节，管行走、平衡和抗力姿态；$\pi_w$：3 个腰关节，跟踪腰目标；$\pi_u$：14 个手臂关节，跟踪上肢参考；
- 三个 actor 输入**同一份全身观测**，输出拼成 29 维关节目标；联合策略写成 $\pi_\Theta(a_t \mid x_t) = \prod_i \pi _ {\theta_i}(a^i_t \mid x_t)$；
- 每个部分有自己的奖励 $r^i_t$ 和 critic $V _ {\phi_i}$，各算各的 GAE 和 PPO 比率，总损失为三份 PPO 损失相加。

**③ FAT2：从准静态力矩平衡推出质心参考**
- 忽略质心加速度和角动量变化率，在矢状面对地面点 $p_0$（双脚中心）取力矩平衡：手部外力产生俯仰力矩 $M_h(p_0) = \sum_j [h _ {j,z} f^x _ {h,j} - (h _ {j,x} - p_0) f^z _ {h,j} + \tau^y _ {h,j}]$；
- 要让 ZMP 正好落在 $p_0$，质心水平偏移应为
  $$d^{\ast} = -\frac{M_h(p_0)}{mg}$$
- 奖励 $r _ {\mathrm{FAT2}} = \exp\!\left(-(d - d^{\ast})^2 / s_d^2\right)$，$d = c_x - p_0$，$s_d^2 = 0.0225$（即 $s_d = 0.15$ m），只给下肢策略，权重 2.0；
- 它只是一个**软的姿态先验**：不规定具体的躯干俯仰角，单脚支撑时 $p_0$ 冻结不更新，也不保证准静态可行，瞬态交给本体反馈去处理。

**④ 训练**
- Isaac Gym，4096 个并行环境，每个 actor / critic 隐层 [512, 256, 128]，γ = 0.98，λ = 0.95，ε = 0.15，lr = 5×10⁻⁴，共 1×10⁴ 次迭代；
- 两阶段课程：先在小外力下学会稳定运动，再加入极端外力；手部外力的大小和方向按高斯分布随机化；RTX 4090 上每阶段约 3.4 h；
- 其他奖励（附录表 IV）：下肢有速度跟踪、摆动脚高度、腾空时间、摔倒惩罚（−450）；腰有姿态跟踪（3.0）和躯干俯仰角速度阻尼；上肢有姿态跟踪（4.0）和手部速度平滑。

**⑤ 部署**
- 三个 actor 在 G1 上以 50 Hz 推理，PD 控制器 500 Hz 输出力矩；遥控器给移动指令，VR 采集操作者上肢动作经 GMR 重定向给 $\pi_u$。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph IN["📥 共享全身观测 x_t"]
        OBS["本体感受 O_t<br/>q, q̇ (29) · 角速度 · 重力投影<br/>+ 上一步动作 (29)"]
        CMD["指令 C_t<br/>平面速度 · 偏航 · 步态模式<br/>髋高 · 腰目标角 (3)"]
        REF["上肢参考 R_t (14)<br/>训练：AMASS · 部署：VR → GMR"]
    end

    subgraph POL["🧠 三策略分解（各自 actor / critic / 奖励）"]
        PL["π_l 下肢 12 DoF<br/>行走 · 平衡 · 抗力姿态"]
        PW["π_w 腰 3 DoF<br/>跟踪躯干-骨盆朝向"]
        PU["π_u 上肢 14 DoF<br/>跟踪手臂参考动作"]
    end

    subgraph FAT["⚖️ FAT2（只训练期）"]
        F["手部外力 f_h · 作用点 h"]
        MH["力矩平衡<br/>M_h(p0) = Σ h_z·f_x − (h_x − p0)·f_z + τ_y"]
        DSTAR["质心偏移参考<br/>d* = −M_h / (m g)"]
        R["r_FAT2 = exp(−(d − d*)² / 0.0225)<br/>权重 2.0 → 下肢奖励"]
    end

    CRIT["特权 critic 输入<br/>线速度 · 姿态 · 双手外力 F_t (6)"]
    ACT["拼成 29 维关节目标 a_t"]
    PD["PD 控制 500 Hz<br/>策略 50 Hz"]
    OUT["✅ G1：双手后退拉力 167.7 N<br/>单手开防火门 · 拖 1.7 t 轿车"]

    OBS --> PL & PW & PU
    CMD --> PL & PW & PU
    REF --> PL & PW & PU
    F --> MH --> DSTAR --> R --> PL
    CRIT -. 训练时 .-> PL & PW & PU
    PL --> ACT
    PW --> ACT
    PU --> ACT
    ACT --> PD --> OUT

    style IN fill:#eef6ff,stroke:#2e86de
    style POL fill:#f3eafe,stroke:#8e44ad
    style FAT fill:#fff7e0,stroke:#d4a017
    style OUT fill:#eafaf1,stroke:#27ae60,color:#1b1b1b
</div>

---

## 🚶 具体实例：拉 160 N 时质心该往后偏多少？

设 G1 双手握着一根水平绳，绳另一端拴在前方的车上，机器人后退拉车。取 $m = 35$ kg（论文给出的 G1 质量），$g = 9.81\ \mathrm{m/s^2}$，手的高度 $h_z \approx 0.8$ m（这是为算例假设的值），绳水平所以 $f^z = 0$、点力 $\tau = 0$。车通过绳子对手施加向前（$+x$）的力 $f^x = F$：

$$M_h = h_z F,\qquad d^{\ast} = -\frac{h_z F}{mg}$$

| 拉力 $F$ | $M_h$（N·m） | $d^{\ast}$（m） | 含义 |
|---|---|---|---|
| 20 N | 16 | −0.047 | 几乎直立 |
| 60 N（开防火门） | 48 | −0.140 | 明显后仰 |
| 160 N（拉车） | 128 | −0.373 | 质心投影落到脚后方很远 |

负号表示质心要往**远离拉力**的方向偏。160 N 时 $ \mid d^{\ast} \mid $ 已经超过 G1 的脚长，与论文图 4 的观察一致：大载荷下质心的地面投影落在支撑多边形之外，此时靠的是绳子的拉力本身来平衡，不再是普通意义上的静态站立。奖励宽度 $s_d = 0.15$ m 意味着质心偏离参考 15 cm 时奖励降到 $e^{-1} \approx 0.37$。

---

## 📊 关键结果

**仿真消融（图 5，容量匹配）**：单策略 / 双策略（下肢+腰一个、上肢一个）/ 三策略都保留 FAT2，参数总量差 < 1%。随外力增大，单、双策略的腰 MAE 明显上升；三策略在腰误差、上肢 MPJPE 和平面速度误差上都更低，也优于 FALCON。

**真机均值峰值拉力（表 II，节选，单位 N，20 次 × 稳定 10 s 内取峰值）**：

| 方法 | $F^{180^\circ} _ {db}$ 双手后退 | $F^{0^\circ} _ {df}$ 双手前进 | $F^{180^\circ} _ {sb}$ 单手后退 | $F^{135^\circ} _ {dp}$ 双手原地 |
|---|---|---|---|---|
| **Thor** | **167.7 ± 2.4** | **145.5 ± 2.0** | **147.5 ± 4.9** | **127.4 ± 3.3** |
| FALCON | 99.3 ± 1.3 | 83.3 ± 2.7 | 92.4 ± 6.2 | 97.8 ± 3.2 |
| HEFT | 91.9 ± 13.1 | 82.6 ± 4.2 | 79.8 ± 4.9 | 54.0 ± 4.6 |
| SONIC | 55.4 ± 1.3 | 44.2 ± 4.3 | 41.5 ± 8.1 | 44.4 ± 3.4 |
| HOMIE | 62.3 ± 3.7 | 48.1 ± 2.9 | 51.8 ± 5.4 | 40.7 ± 2.3 |
| Thor1（两策略 + FAT2） | 138.4 ± 5.4 | 128.0 ± 3.5 | 104.6 ± 2.4 | 103.5 ± 1.5 |
| Thor2（三策略，无 FAT2） | 104.6 ± 4.6 | 103.6 ± 3.9 | 98.5 ± 2.1 | 98.4 ± 1.6 |

- 167.7 N 约为 G1 体重的 48.8%，比 FALCON 高 68.9%（前进 74.7%）；
- 消融：给 Thor2 加上 FAT2，双手后退 / 前进拉力 +60.3% / +40.4%；保留 FAT2 时把腰拆成独立策略（Thor vs Thor1）再 +21.2% / +13.7%；
- 单手前进（$F^{0^\circ} _ {sf}$）与 FALCON 持平（78.2 vs 78.1）；原地 7 种方向中 6 种领先。

**真机任务成功率（表 III，每项 20 次）**：

| 方法 | 提 10 kg 水袋 | 推坐着 60 kg 机器人的轮椅 | 单手开防火门 | 拉 1.7 t 轿车 |
|---|---|---|---|---|
| **Thor** | **100** | **95** | **85** | **80** |
| FALCON | 90 | 85 | 60 | 0 |
| HEFT | 95 | 85 | 15 | 0 |
| SONIC | 75 | 20 | 0 | 0 |

拉车时轿车挂空挡、车里坐两个成年人，Thor 后退拖行超过 5 m，拉力约 160 N；基线都拉不动。

---

## 💡 核心贡献

1. **身体部位分解的三策略架构**：把腰从下肢里拆出来单独优化，三者共享观测、各有奖励和 critic，在容量匹配的对比中证明了分解本身的作用；
2. **FAT2 奖励**：用准静态力矩平衡把「手上受力 + 力臂」映射成质心水平偏移参考，给出随载荷变化、但不限定具体姿态的软目标；
3. **真机验证**：G1 上的拉力对比、组件消融，以及开门、推轮椅、提水、拉车四个大力交互任务。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **把物理分析变成奖励** | FAT2 不是硬约束，而是用简单的静力学给 RL 一个「该往哪边倾」的方向，减少大外力下的盲目探索；同样的思路可以推广到推、扛、侧拉 |
| **多 actor 分解的粒度** | HOMIE / FALCON 只拆上下肢，Thor 说明腰这个连接上下身的环节值得单独建模；代价是三套网络和三份奖励要调 |
| **与 FAME / HAFO 的区别** | FAME 让腿「知道」手上的力以站稳；HAFO 用虚拟弹簧-阻尼建模扰动；Thor 主动用身体姿态去「多出力」 |
| **局限** | FAT2 只考虑矢状面、准静态；外力只在训练期作为特权信息给 critic，部署时策略靠本体感受隐式推断；只评估了短时任务，地面摩擦变化、电机发热、长时间作业还没系统测试；代码暂未开源 |

---

## 🎤 面试参考

**Q：$d^{\ast} = -M_h / (mg)$ 是怎么来的？**
A：对双脚中心 $p_0$ 取矢状面力矩平衡：地面支反力 $N$ 作用在 ZMP $p$，重力 $mg$ 作用在质心 $c_x$，手部外力产生力矩 $M_h$，于是 $N(p - p_0) = mg(c_x - p_0) + M_h$。要求 $p = p_0$（ZMP 在支撑中心）就得到 $c_x - p_0 = -M_h / (mg)$。

**Q：为什么拆三个策略而不是一个大网络？**
A：下肢抗力需要躯干倾斜，腰要维持指令朝向，两者目标冲突；放在同一个策略和同一个价值函数里，梯度会互相干扰。分开后每个 critic 只评估自己那部分的回报，优势估计更干净。论文用参数量相差 < 1% 的单 / 双 / 三策略对比排除了「只是模型更大」的解释。

**Q：部署时不测力，策略怎么知道该倾多少？**
A：外力只在 critic 的特权输入和 FAT2 奖励里出现；actor 只看本体感受，通过关节角偏差、速度和姿态变化隐式感知外力，训练中被 FAT2 引导学出「力越大越后仰」的反应。

---

## 🔗 相关阅读

- [FALCON: Learning Force-Adaptive Humanoid Loco-Manipulation](../FALCON__Learning_Force-Adaptive_Humanoid_Loco-Manipulation/FALCON__Learning_Force-Adaptive_Humanoid_Loco-Manipulation.html)：Thor 直接在其双智能体架构上扩展，也是最强基线
- [HAFO: A Force-Adaptive Control Framework for Humanoid Robots](../HAFO__A_Force-Adaptive_Control_Framework_for_Humanoid_Robots_in_Intense_Interact/HAFO__A_Force-Adaptive_Control_Framework_for_Humanoid_Robots_in_Intense_Interact.html)：虚拟弹簧-阻尼扰动建模 + 课程
- [FAME: Force-Adaptive RL for Expanding the Manipulation Envelope](../FAME__Force-Adaptive_RL_for_Expanding_the_Manipulation_Envelope_of_a_Full-Scale_Humanoid/FAME__Force-Adaptive_RL_for_Expanding_the_Manipulation_Envelope_of_a_Full-Scale_Humanoid.html)：把上半身构型和手部力编码给站立策略
- [HEFT: Heavy-Payload Full-size Humanoid Teleoperation](../../07_Teleoperation/HEFT__Heavy-Payload_Full-size_Humanoid_Teleoperation_with_Privileged_Motion_Guidance/HEFT__Heavy-Payload_Full-size_Humanoid_Teleoperation_with_Privileged_Motion_Guidance.html)：表 II / III 的基线之一
- [HOMIE](../../03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.html) · [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)：另外两个基线
- [GMR: Retargeting Matters](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html)：部署时的上肢重定向
