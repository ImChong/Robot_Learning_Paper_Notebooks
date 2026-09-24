---
layout: paper
title: "Perceptive Behavior Foundation Model: Adapting Human Motion Priors to Robot-Centric Terrain"
category: "高影响力精选 High Impact Selection"
subcategory: "Sim-to-Real & Foundation Model"
zhname: "Perceptive BFM：让人类动作先验适应机器人所处地形的感知行为基础模型"
arxiv: "2606.08059"
demos: ["pbfm"]
---

# Perceptive Behavior Foundation Model: Adapting Human Motion Priors to Robot-Centric Terrain
**用户给的平地人类动作原样当命令，机器人用自己的高度图补上落脚点、抬脚高度、身体高度和接触时机：离线 TCRS 把平地片段改写成贴合地形的参考只用来当监督，盲教师跟踪它，再经「目标系动作对齐」蒸馏进一个带恒等门控地形残差的视觉学生**

> 📅 阅读日期: 2026-09-24
>
> 🏷️ 板块: 03_High_Impact_Selection / Sim-to-Real & Foundation Model · 感知运动跟踪 · 参考合成 · 教师—学生蒸馏
>
> ℹ️ 笔记已对照 [arXiv v2](https://arxiv.org/abs/2606.08059v2)（2026-06-15）全文与附录（Table V–IX、Alg. 1–2）、[项目主页](https://acodedog.github.io/perceptive-bfm/)，以及官方仓库 [Mondo-Robotics/PMT](https://github.com/Mondo-Robotics/PMT)（2026-08-13 的 `main`，读了 `TCRS/stair_mppi/`、`motion_tracking_rl/networks/`、`pmt_tasks/agent_cfgs/` 与 `configs/`）。
>
> 📌 板块说明：这篇不在上游 awesome-humanoid-robot-learning 列表里，按本仓库规则不能进 04–14，所以放在「高影响力精选」里与 [BFM](../Behavior_Foundation_Model_for_Humanoid_Robots/Behavior_Foundation_Model_for_Humanoid_Robots.html) 并列——它把「行为基础模型」的命令接口原样保留，只补上地形感知，并且训练代码、TCRS 与预训练权重都开源了。

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| **arXiv** | [2606.08059](https://arxiv.org/abs/2606.08059)（v1：2026-06-06；v2：2026-06-15） |
| HTML | [在线阅读](https://arxiv.org/html/2606.08059) |
| PDF | [下载](https://arxiv.org/pdf/2606.08059) |
| 项目主页 | [acodedog.github.io/perceptive-bfm](https://acodedog.github.io/perceptive-bfm/)（含 MuJoCo WASM + ONNX Runtime 的浏览器演示） |
| **源码** | [Mondo-Robotics/PMT](https://github.com/Mondo-Robotics/PMT)（BSD-3-Clause；Isaac Lab 训练、TCRS、预训练权重、mjlab 后端） |
| **发布时间** | 2026年6月6日（arXiv v1），CoRL 2026 |
| 其他 | 项目页同时标注 RSS 2026 WCBM Workshop |
| 作者 | Zifan Wang, Yizhao Li, Teli Ma, Qiang Zhang, Yudong Fan, Hao Xu, Shuo Yang\*, Junwei Liang\*（\* 通讯作者） |
| 机构 | Mondo Robotics · 香港科技大学（广州）· 香港科技大学 · 中国科学技术大学人工智能研究院 · 南京大学人工智能学院 |
| 实验平台 | Unitree G1（29 DoF），躯干上的深度相机 → 高度图 |
| 训练规模 | IsaacLab / IsaacSim，50 Hz 控制，每 GPU 6144 个环境 × 48 张 A800，最终 PPO 阶段 10k 迭代 |

**一行定位**：[SONIC](../SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)、[BFM](../Behavior_Foundation_Model_for_Humanoid_Robots/Behavior_Foundation_Model_for_Humanoid_Robots.html) 这类「一个策略跟任意人类动作」的控制器默认参考已经和机器人的环境物理兼容；[PHP](../../04_Loco-Manipulation_and_WBC/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching.html) 这类感知跑酷会看地形，但命令是速度、技能由系统挑。Perceptive BFM 卡在两者中间：**命令仍是用户给的任意动作参考，一个字不改**，地形感知只负责把它「落」到机器人脚下的真实地形上。

---

## 🎯 一句话总结

人形行为基础模型把人类动作当成通用命令接口，但示教者、操作者和机器人往往不在同一个环境里：平地上录的走路不告诉机器人台阶在哪、脚要抬多高、身体要升多少、什么时候落地——论文把这叫**操作者—环境错配**。Perceptive BFM 的训练算法 PMT 分四步：① **TCRS** 离线把平地片段和采样的高度场合成贴合地形的参考（接触检测 → 中足坐标系下的 MPPI 摆腿优化 → 支撑感知的根高度重建 → 碰撞修复 → 只动 12 个腿关节的多点 IK），它**只当监督、部署时从不调用**；② **盲教师**（Transformer，无感知）用 PPO 跟踪 TCRS 参考；③ **视觉学生**只拿原始参考和 17 × 11 高度图，经**目标系动作对齐**（把教师的 PD 目标换算到原始参考系下）蒸馏；④ 在原始参考命令下 **PPO 微调**，地形特征只通过两条**零初始化的恒等门控残差**进入，所以学生一开始就是纯原始参考跟踪器，只在地形需要时长出修正。日志统计里完整 PMT 成功率 55.1%，去掉 TCRS / 视觉 / 对齐都掉到 26%–27%；跨五类地形的固定策略回放完成 248/450 次（原始参考基线 123/450），小腿碰撞 45 vs 111；真机上同一套权重跑了后空翻、侧手翻、舞蹈、侧走、倒走与动捕遥操作。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| **BFM** | Behavior Foundation Model | 行为基础模型：一个策略跟任意人类动作参考 |
| **PMT** | Perceptive Motion Tracking | 本文的四阶段训练算法，也是开源仓库名 |
| **TCRS** | Terrain-Conformal Reference Synthesis | 地形贴合参考合成：离线把平地动作改写成贴合地形的参考 |
| **MPPI** | Model Predictive Path Integral | 采样式轨迹优化：撒噪声、按 $e^{-\text{代价}/\eta}$ 加权平均 |
| **Mid-foot frame** | — | 中足坐标系：以脚尖与脚跟中点为规划点 |
| **IK** | Inverse Kinematics | 逆运动学；这里只解 12 个腿关节 |
| **DAgger** | Dataset Aggregation | 学生自己跑、教师给标签的模仿学习 |
| **Identity gate** | — | 恒等门控：$x + \tanh(\alpha)\cdot\Delta$，$\alpha=0$ 时输出等于输入 |
| **Target-frame alignment** | — | 目标系对齐：把教师的动作换算到学生的命令系下再模仿 |
| **Anchor** | — | 运动锚点（躯干 / 骨盆），跟踪奖励与观测都以它为参考 |
| **Height scan** | — | 机器人中心的射线高度扫描，这里是 17 × 11 网格 + 有效掩码 |

---

## 🎬 七幕动画：Perceptive BFM 全流程 {#pbfm-explainer-anim}

<div class="paper-demo" data-demo="pbfm-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（问题、方法、实验）按小节收起，再往后的具体实例、源码对照、与其他笔记的关系、核心贡献、局限、面试参考与引用各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；整体框架图与源码时序图留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 3–6 幕里的小算例（MPPI 三条候选、根高度、膝角对齐、门控），和下文「🚶 具体实例」是同一组数字。

---

## ❓ 论文要解决什么问题？

### 问题 1：参考动作默认和环境兼容

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：「多准地复现参考」与「参考该怎么落到机器人环境里」是两个问题</summary>

大多数以参考为中心的方法问的是「机器人能多准地复现给定动作」，而不是「这个动作在机器人自己的环境里应该怎么物理地落地」。这是两个不同的问题：

- 平地走路参考不告诉你**台阶上的落脚点**；
- 控制室里的遥操作者不知道远端现场有**稀疏支撑、凹陷地形**；
- 干净地板上的示范不告诉你**要抬多高才不绊到障碍**。

参考传达的是**意图和风格**，但它未必是机器人所在世界里的一条地形合法轨迹。论文把这叫 **operator–environment mismatch**：人给出想要的行为，机器人要从自己的感知里解出地形相关的接触、身体高度、平衡与时机。

</details>

### 问题 2：两条成功路线之间的空档

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：通用跟踪不看地形；感知跑酷不保留任意命令；生成 / 修参考的方法改了命令</summary>

| 路线 | 代表 | 缺什么 |
|---|---|---|
| 通用动作跟踪 / 行为基础模型 | OmniH2O、HOVER、SONIC、BFM、BFM-Zero | 行为丰富、表达力强，但命令接口里没有「按环境调整接触」这回事 |
| 感知行走与跑酷 | Hiking in the Wild、Deep Whole-body Parkour、PHP | 会看高度图 / 深度，但围绕越障技能、动作匹配或系统挑选的动作组织，**不保留用户给的任意动作命令** |
| 生成 / 修复参考 | 在线生成地形条件动作、按地形调制参考、物理一致性过滤参考 | 在「可行性 / 自动选技能」为主要目标时很强，但部署时参考被改写了 |

缺的能力是：**用机器人中心的地形感知，重新解读一条人类动作命令在物理上需要什么**。

</details>

### Perceptive BFM 的回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：原始参考当命令、TCRS 只当监督、对齐 + 门控把修正装进学生</summary>

- **接口契约**：部署命令始终是原始运动学参考（目标关节位置 / 速度 + 局部锚点位移）；地形感知只提供局部实现——落脚点、净空、姿态、接触时机。
- **监督从哪来**：TCRS 离线把「原始片段 + 采样高度场」合成地形贴合参考，只喂给教师训练，部署时不查询。
- **怎么把教师的本事交给学生**：教师围绕 TCRS 参考行动、学生围绕原始参考行动，用目标系对齐把两者放到同一个坐标系。
- **怎么保证不破坏原有跟踪能力**：地形特征只从零初始化的门控残差进入，初始化时学生与原始参考跟踪器完全一样。

</details>

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    RAW["原始平地动作片段<br/>（走 / 跑 / 转身 / 侧走 / 舞蹈，约 8000 对配对轨迹）"]
    TER["采样的高度场 τ<br/>高度 −0.10–0.25 m · 台阶 5–15 cm · 坡 ≤ 30°"]

    subgraph S1["① TCRS（离线，只当监督）"]
        CON["接触检测：脚高 < 0.06 m 且脚速 < 0.5 m/s<br/>支撑脚贴地形"]
        MPPI["中足坐标系 MPPI 摆腿<br/>贴参考 + 平滑 + 净空 + 边缘 + 端点"]
        ROOT["支撑感知根高度（式 7）<br/>+ 非对称 EMA 限速"]
        IK["碰撞修复 + 多点雅可比 IK<br/>只动 12 个腿关节"]
    end

    subgraph S2["② 盲教师"]
        TEA["Transformer actor-critic<br/>PPO 跟踪 m_tcrs（无感知）"]
    end

    subgraph S3["③ 视觉学生蒸馏"]
        ALN["目标系对齐 a* = (q_tcrs + μ_tea) − q_raw"]
        STU["学生：原始参考 + 17×11 高度图<br/>教师接管概率 1 → 0"]
    end

    subgraph S4["④ PPO 微调"]
        GATE["恒等门控：u' = u + tanh(α_u)Δu<br/>μ = μ_base + tanh(α_a)r，α 从 0 起"]
    end

    DEP["✅ 部署：原始参考 + 本体 + 高度图<br/>G1 真机室内 / 室外 / 动捕错配"]

    RAW --> CON
    TER --> CON
    CON --> MPPI --> ROOT --> IK
    IK -->|"(m_raw, m_tcrs, τ)"| TEA
    TEA --> ALN --> STU --> GATE --> DEP
    RAW -. 部署命令 .-> DEP

    style S1 fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style S2 fill:#e0f7fa,stroke:#0097a7,color:#003f47
    style S3 fill:#f3e8ff,stroke:#7b3fbf,color:#2a0f4a
    style S4 fill:#f3e8ff,stroke:#7b3fbf,color:#2a0f4a
    style DEP fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
</div>

---

## 🔧 方法详解

### 1. 问题形式化与观测契约

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：残差动作、教师 / 学生的命令系、学生 actor 的全部输入</summary>

感知运动跟踪要的策略是

$$
a_t=\pi_\theta\!\left(o^{\mathrm{prop}}_t,\ o^{\mathrm{vis}}_t,\ m^{\mathrm{raw}}_{t:t+H}\right),\qquad q^{\mathrm{pd}}_t=q^{\mathrm{cmd}}_t+a_t
$$

输出是**围绕命令系关节参考的残差 PD 目标**。教师的 $q^{\mathrm{cmd}}_t=q^{\mathrm{tcrs}}_t$，部署的学生 $q^{\mathrm{cmd}}_t=q^{\mathrm{raw}}_t$——这个约定把迁移问题摆在明面上：教师学的是跟一个改过的命令，学生要在**没改过的用户命令**附近表达同样的地形修正。

学生 actor 的输入（Table VI）：

| 组 | 内容 | 形状 |
|---|---|---|
| 本体 | 投影重力、基座角速度、关节位置 / 速度、上一步动作 | 93 维（$3+3+29\times3$） |
| 本体历史 | 同上的历史 | 10 步 |
| 命令窗口 | 未来参考速度、重力、关节命令 token | 21 × 38 |
| 锚点位移窗口 | 局部锚点位移 | 21 × 3 |
| 视觉 | 躯干居中 1.6 m × 1.0 m、0.1 m 分辨率的射线高度扫描 + 有效掩码 | 17 × 11 |
| 特权（只给 critic / 辅助损失） | 参考 / 身体 / 基座真值 | 当前帧 |

真值身体位姿、全局锚点、基座线速度只给教师、critic 或辅助损失；学生 actor 读的是两个**估计头**（基座速度、锚点位置）的输出，而且梯度截断。

</details>

### 2. TCRS：地形贴合参考合成

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：接触检测与支撑贴合、中足坐标 MPPI（式 4–6）、根高度重建（式 7）、碰撞修复与多点 IK（式 12）</summary>

TCRS 是一个合成算子 $m^{\mathrm{tcrs}} _ {1:T}=S _ {\mathrm{TCRS}}(m^{\mathrm{raw}} _ {1:T},\tau)$。它**不解接触动力学**，只构造接触一致、平滑、保风格的运动学参考，让下游策略学得动。

**(a) 接触感知的地形参考**：用脚高、脚速和迟滞阈值估计支撑 / 摆动区间；支撑脚贴到地形支撑面上，摆动的起落时刻沿用原始片段。实现上很保守：保留原始步相和名义落地时刻，只在原始脚迹附近做局部支撑贴合与边缘罚项，不做全局落脚规划；不可靠的脚尖 / 脚跟约束会被削弱或放弃。所以 TCRS 应该读作**局部的参考修复**，不是完整的落脚重规划。

**(b) 中足坐标系下的摆腿优化**：脚尖、脚跟在踝坐标系里的偏移为 $r _ {\mathrm{toe}},r _ {\mathrm{heel}}$，

$$
r_{\mathrm{mid}}=\tfrac12(r_{\mathrm{toe}}+r_{\mathrm{heel}}),\qquad p^{\mathrm{mid}}_{f,t}=p^{\mathrm{ankle}}_{f,t}+R_{f,t}\,r_{\mathrm{mid}}
$$

在中足点上规划能同时平衡脚尖和脚跟在地形不连续处的净空。控制点 $Y=\lbrace y_k\rbrace$ 的代价：

$$
J_s=\lambda_{\mathrm{ref}}\sum_k\lVert y_k-y^{\mathrm{raw}}_k\rVert^2+\lambda_{\mathrm{sm}}\sum_k\lVert\Delta^2y_k\rVert^2+\lambda_{\mathrm{clr}}\sum_k\left[h_\tau(x_k,y_k)+\delta-z_k\right]_+^2+\lambda_{\mathrm{edge}}\Phi_{\mathrm{edge}}+\lambda_{\mathrm{end}}\left(\lVert y_1-\bar y_1\rVert^2+\lVert y_K-\bar y_K\rVert^2\right)
$$

依次是：贴原始摆腿、平滑、地形净空裕量 $\delta$、竖直面附近的边缘罚项（脚尖 / 脚跟邻域里出现竖直高度跳变就罚）、起落端点固定。用批量采样优化（MPPI）求解：

$$
Y\leftarrow Y+\sum_j\frac{\exp(-J_s(Y+\epsilon^{(j)})/\eta)}{\sum_\ell\exp(-J_s(Y+\epsilon^{(\ell)})/\eta)}\,\epsilon^{(j)}
$$

优化完的中足轨迹再换回踝、脚尖、脚跟目标，交给 IK。

**(c) 支撑感知的根高度重建**：

$$
z^\star_{\mathrm{root},t}=\frac{\sum_f w_{f,t}\left[h_\tau(x^{\mathrm{tcrs}}_{f,t},y^{\mathrm{tcrs}}_{f,t})+z^{\mathrm{raw}}_{\mathrm{root},t}-z^{\mathrm{raw}}_{f,t}\right]}{\sum_f w_{f,t}+\epsilon}
$$

即「支撑脚现在踩的地形高度 + 原始片段里骨盆比这只脚高多少」按支撑权重平均。再按腿的可达范围截断、在支撑切换处平滑；腾空或弱接触时退回原始的竖直轨迹，只限制每帧位移。

**(d) 碰撞修复与多点腿 IK**：修小腿与脚的碰撞，削弱台阶边上没踩实的脚尖 / 脚跟约束，然后在 12 个腿关节上解一个阻尼、支撑感知的多点雅可比 IK：

$$
\Delta q^{\mathrm{leg},\star}=\arg\min\sum_{f\in\lbrace L,R\rbrace}\sum_{p\in\lbrace\mathrm{ankle,toe,heel}\rbrace}W_{f,p}\lVert J_{f,p}\Delta q^{\mathrm{leg}}-e_{f,p}\rVert^2+\lambda_{\mathrm{post}}\lVert q^{\mathrm{leg}}-q^{\mathrm{raw,leg}}\rVert^2+\lambda_{\mathrm{cont}}\lVert q^{\mathrm{leg}}-q^{\mathrm{prev,leg}}\rVert^2+\lambda_{\mathrm{pen}}\Psi_{\mathrm{pen}}+\lambda_{\mathrm{dls}}\lVert\Delta q^{\mathrm{leg}}\rVert^2
$$

根平移固定为上一步重建的结果；**根朝向和非腿关节原样取自原始参考**。多种子兜底与连续性守卫会拒掉误差大或跳变的分支。输出成对数据 $(q^{\mathrm{raw}},q^{\mathrm{tcrs}},\tau)$。

> 这个分解让地形适配主要落在下半身接触上，上半身风格原样保留——也直接决定了它的主要失败模式：手臂不会躲障碍。

</details>

### 3. 盲教师

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Transformer actor-critic、奖励式 11 与 Table VII 权重</summary>

教师是 Transformer actor-critic，本体历史与参考命令窗口 token 化后输入，命令用 TCRS 参考，用 PPO 训练，**没有感知**（地形信息已经「烤」进 TCRS 参考里了）。奖励（式 11）是四个指数跟踪项减两个罚项：

$$
r_t=\sum_{k\in\lbrace a,R,f,v\rbrace}w_k\,e^{-\lVert\Delta_k\rVert^2/\sigma_k^2}-c_EE_t-c_CC_t
$$

| 项 | 权重 | 备注 |
|---|---|---|
| 全局锚点位置 | 1.0 | $\sigma=0.2$ m |
| 相对身体朝向 | 0.5 | $\sigma=0.35$ |
| 脚（踝）位置 | 1.0 | $\sigma=0.1$ m |
| 脚（踝）线速度 | 0.5 | $\sigma=1.0$ m/s |
| 能量 | $-2\times10^{-5}$ | 动作 / 力矩能量 |
| 脚 / 小腿侧向接触 | −0.03 | 踝、膝上 5 N 阈值 |

教师奖励对照 TCRS 参考算；学生微调在原始参考的命令系下进行。

</details>

### 4. 恒等门控的视觉学生

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两条零初始化残差（式 8、9）、Map CNN + MapTransformer、估计头与辅助损失</summary>

学生继承教师的命令 / 历史 Transformer，加一个高度图编码器（Map CNN → 以本体 + 意图为 query 的 MapTransformer）得到地形潜变量 $z^{\mathrm{vis}}_t$。地形只从两条**零初始化**残差进入 actor：

$$
u'_t=u_t+\tanh(\alpha_u)\odot f_u(z^{\mathrm{vis}}_t),\qquad \mu_t=\mu^{\mathrm{base}}_t+\tanh(\alpha_a)\odot f_a\!\left([o^{\mathrm{prop}}_t,z^{\mathrm{vis}}_t]\right)
$$

门向量初始化为 0，所以初始化时地形支路完全不起作用，学生就是一个**原始参考跟踪器**；只有当地形修正能改善跟踪目标时，门才会被推开。

另外三个辅助头：基座速度估计、锚点位置估计（输出截断梯度后拼进 actor 主干）、脚轨迹头（只做辅助监督，不进 actor）。训练目标 = PPO + value + entropy + 速度 / 锚点 / 脚轨迹的 Huber 损失（Fig. 7C）。

</details>

### 5. 目标系蒸馏与 PPO 微调

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：为什么不能直接抄教师残差、式 10、混合 rollout、分组学习率</summary>

教师和学生围绕不同的命令系行动，学生不能直接模仿教师的残差。改为模仿教师**真正的 PD 目标**，换算到原始参考系：

$$
a^\star_t=\left(q^{\mathrm{tcrs}}_t+\mu^{\mathrm{tea}}_t\right)-q^{\mathrm{raw}}_t,\qquad \mathcal{L}_{\mathrm{distill}}=\lVert\mu^{\mathrm{stu}}_t-a^\star_t\rVert_2^2
$$

DAgger 式 rollout 里教师接管概率从 1 退火到 0；教师接管时执行的也是**对齐后的动作**，而不是它自己命令系下的残差。对齐标签和学生均值在同样的残差关节位置单位下比较（经过共用的动作缩放），用于教师接管时同样套用残差上限与裁剪。

之后在原始参考命令、高度图和辅助估计损失下做 PPO 微调；迁移来的骨干学习率打折（Table VIII：0.3），地形编码器、critic 与残差支路用全学习率。论文强调微调**不是从零学地形适配**：对齐蒸馏已经把地形修正初始化成围绕原始命令的残差动作，微调只是在接触 / 碰撞罚项的约束下把它磨细，防止策略塌回「平地跟踪」。

| 阶段 | 学习率 | 熵 | 其他 |
|---|---|---|---|
| 盲教师 PPO | 5e-4 | 0.005 | 5 epoch、4 minibatch、KL 目标 0.01、速度 / 锚点 Huber |
| 蒸馏 | 1e-4 | – | MSE 动作损失，教师接管 1.0 → 0.0 |
| 视觉 PPO 微调 | 1e-4 | 0.001 | 骨干学习率 ×0.3，脚轨迹 Huber（δ = 0.05） |

</details>

### 6. 训练语料与域随机化

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：约 8000 对配对轨迹、地形分布、仿真设置、Table IX</summary>

- **动作语料**：偏走跑与舞蹈的人类动捕（走、跑、转身、侧走、多名受试者的走舞），每段随机平面摆放 + 偏航放到采样地形上，得到**约 8000 对**原始 / 地形贴合训练轨迹；动作以 30 fps 导出。
- **地形**：高度偏移 −0.10–0.25 m、支撑宽度 0.10–1.00 m、台阶高 5–15 cm、踏面 0.20–0.35 m、坡度 ≤ 30°。
- **仿真**：物理步长 5 ms、控制抽帧 4 → 50 Hz；一回合 15 s = 750 步。
- **域随机化（Table IX）**：静摩擦 [0.3, 1.6]、动摩擦 [0.3, 1.2]、基座质心 ±0.025 m、默认关节位置 ±0.1 rad（概率 0.2）、推力 ±0.2 m/s；高度扫描逐格加 ±0.06 m 噪声并加平面漂移，模拟深度 → 高度图的误差。

</details>

---

## 🚶 具体实例：一段平地走舞参考遇到 15 cm 台阶，从 TCRS 到部署走一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（9 节）：环境设定 / 第 1 步：接触判定 / 第 2 步：MPPI 摆腿 / 第 3 步：根高度 / 第 4 步：IK 与输出 / 第 5 步：教师 / 第 6 步：目标系对齐 / 第 7 步：门控与微调 / 第 8 步：表格换算</summary>

> ⚠️ 本节把论文的配方和开源仓库的默认参数代入一个具体场景逐步走通。**标「示意」的数字是我构造的**：摆腿的 5 个密集点与 A / B / C 三条候选、骨盆高度 0.72 m、膝角 0.30 / 0.62 / 0.05。其余参数取自论文（Table VI–IX）和仓库 `TCRS/stair_mppi/`、`pmt_tasks/`（2026-08-13 的 `main`）。我**没有实际运行** Isaac Lab 训练或 TCRS；仓库里的动作与权重是 Git LFS 指针，需要另外从 Hugging Face 镜像下载。动画第 3–6 幕用的是同一组数字。

<h3 id="实例-环境设定">环境设定</h3>

- 机器人：Unitree G1（29 DoF）；
- 命令：一段平地录的「边走边舞」片段（仓库样例目录名 `walk_dance1sub2start`），上半身有挥手动作；
- 地形：机器人前方随机摆了一个 15 cm 高的台阶（在论文的台阶高度 5–15 cm 范围内取上限）；
- 感知：躯干居中、随偏航对齐的射线高度扫描，1.6 m × 1.0 m、分辨率 0.1 m → $(1.6/0.1+1)\times(1.0/0.1+1)=17\times11=187$ 格，外加有效掩码（仓库 `stepping_stone.py`：`GridPatternCfg(resolution=0.1, size=(1.6, 1.0))`）。

<h3 id="实例-第-1-步接触判定">第 1 步：接触判定与支撑贴合</h3>

仓库 `gait_phase.py` 的判定：脚高 $<0.06$ m **且** 脚速 $<0.5$ m/s 才算支撑。

| 帧 | 左脚高 | 左脚速 | 判定 |
|---|---|---|---|
| 迈步前 | 0.02 m | 0.1 m/s | 支撑 → 贴到地面 |
| 抬脚中 | 0.09 m | 1.8 m/s | 摆动 → 交给 MPPI |
| 落脚前一帧 | 0.05 m | 0.9 m/s | 摆动（速度没降下来） |
| 落在台阶上 | 0.03 m | 0.2 m/s | 支撑 → 贴到台阶面（z = 0.15 m） |

（表中脚高 / 脚速是示意值，阈值来自代码。）起落时刻沿用原始片段——TCRS 不改节奏。

<h3 id="实例-第-2-步mppi-摆腿">第 2 步：MPPI 摆腿（5 个密集点，示意）</h3>

中足点沿前进方向走 5 个点 $\phi=0,0.25,0.5,0.75,1$，地形高度 $(0,0,0.15,0.15,0.15)$（台阶边在第 3 点）。

- **原始参考**（候选 A）：线性抬到台阶高度 + 平地摆腿的拱形 $(0,0.05,0.08,0.05,0)$ → $z^{\mathrm{ref}}=(0,\ 0.0875,\ 0.155,\ 0.1625,\ 0.15)$；
- **净空下限**：代码里净空包络是 $2h _ {\mathrm{clr}}\sin^2(\pi\phi)$，$h _ {\mathrm{clr}}=0.03$ → $(0,0.03,0.06,0.03,0)$，下限 = 地形 + 包络 $=(0,\ 0.03,\ 0.21,\ 0.18,\ 0.15)$；
- A 在台阶边（第 3 点）只有 0.155 m，比下限 0.21 m **低 5.5 cm**——照原样走会刮到台阶沿。

用仓库命令行默认权重 $w _ {\mathrm{track}}=10$、$w _ {\mathrm{terrain}}=1000$、$w _ {\mathrm{smooth}}=10$ 打分（跟踪 = $10\sum(z-z^{\mathrm{ref}})^2$，地形 = $1000\sum[\text{下限}-z]_+^2$，平滑 = $10\sum(\Delta^2z)^2$）：

| 候选 | $z$ | 跟踪 | 地形 | 平滑 | 总代价 | 权重（$\eta=0.1$） | 权重（$\eta=1$） |
|---|---|---|---|---|---|---|---|
| A 原始参考 | (0, 0.0875, 0.155, 0.1625, 0.15) | 0 | $1000\times(0.055^2+0.0175^2)=3.331$ | 0.044 | **3.375** | 0.000 | 0.026 |
| B 抬高一些 | (0, 0.11, 0.215, 0.19, 0.15) | 0.049 | 0 | 0.172 | **0.220** | 0.994 | 0.608 |
| C 抬得很高 | (0, 0.16, 0.30, 0.25, 0.15) | 0.339 | 0 | 0.390 | **0.729** | 0.006 | 0.366 |

权重 $w_j\propto\exp(-(J_j-J _ {\min})/\eta)$。$\eta=0.1$（仓库默认）时 B 占 99.4%，加权后的中点高度 $0.994\times0.215+0.006\times0.30\approx0.2155$ m——**温度越小越接近直接取最小值**（代码注释原话「越小越贪心」）；$\eta=1$ 时 C 能分到 36.6%，中点被拉到 0.245 m。

仓库里真实的规模：每次 128 个样本、10 次迭代、5 个内部控制点，clamped 三次样条展开到 100 个密集点；x / y 噪声 0.02 m、z 噪声 0.04 m。

<h3 id="实例-第-3-步根高度">第 3 步：支撑感知的根高度（式 7）</h3>

原始平地片段里骨盆高 0.72 m（示意），两只脚都贴地（$z^{\mathrm{raw}}_f=0$）。现在左脚踩台阶（$h=0.15$）、右脚在地面（$h=0$）：

| 支撑权重 左 / 右 | $z^\star=\dfrac{\sum_f w_f(h_f+0.72-0)}{\sum_f w_f}$ |
|---|---|
| 0.5 / 0.5 | $0.5\times0.87+0.5\times0.72=$ **0.795 m** |
| 0.8 / 0.2 | $0.8\times0.87+0.2\times0.72=$ **0.840 m** |
| 1.0 / 0.0 | 0.870 m |

再过规划器里的滤波（`SupportAwareRootZFilter(alpha_up=0.5, alpha_down=0.35, max_delta=0.035)`）：从 0.72 追 0.795，逐帧

| 帧 | EMA 目标 | 限幅后 |
|---|---|---|
| 1 | $0.72+0.5\times0.075=0.7575$，涨幅 0.0375 > 0.035 | **0.755** |
| 2 | $0.755+0.5\times0.04=0.775$ | **0.775** |
| 3 | $0.775+0.5\times0.02=0.785$ | **0.785** |
| 4 | | **0.790** |
| 5 | | **0.7925** |

每帧最多升 0.035 m；若按论文的 30 fps 导出频率换算，骨盆竖直速度上限约 $0.035\times30=1.05$ m/s（这是我的换算；仓库 README 说随附的演示片段是 50 fps，TCRS 在哪个帧率下跑取决于输入片段）。可达性截断：`PELVIS_ANKLE_REACH` $=0.251+0.494+0.06=0.805$ m，骨盆不能高于「最低那只脚 + 0.795 m」。

<h3 id="实例-第-4-步ik-与输出">第 4 步：碰撞修复、多点 IK 与输出</h3>

- **碰撞修复**（命令行默认值）：小腿当半径 0.06 m、脚当 0.04 m 的胶囊体，要求 0.025 m 裕量，最多 4 轮把摆动脚往外推，每帧最多推 0.06 m；
- **多点 IK**：未知数 12 个腿关节；残差 = 踝 / 脚尖 / 脚跟 3 点 × 2 只脚 × 3 维 = **18 行**，再加贴原始姿态、贴上一帧、穿透罚项与阻尼；台阶边上没踩实的脚尖 / 脚跟权重被调低（代码里打印为 "Support-aware IK downweights"）；
- **保持不动的**：根朝向 + 其余 $29-12=17$ 个关节——挥手的上半身原样保留；
- **输出**：`raw/`、`optimized/`、`ghost/` 三个目录各一份 `.npz`（`fps`、`joint_pos [T,29]`、`body_pos_w [T,30,3]` 等），文件名带随机摆放变换 `dx / dy / dyaw`。

<h3 id="实例-第-5-步教师跟踪">第 5 步：盲教师怎么给分</h3>

教师跟踪 TCRS 参考，奖励（Table VII）：

| 情况 | 算式 | 该项得分 |
|---|---|---|
| 锚点位置偏 0.1 m（$\sigma=0.2$） | $e^{-0.01/0.04}=e^{-0.25}$ | $1.0\times0.779$ |
| 脚位置偏 0.1 m（$\sigma=0.1$） | $e^{-1}$ | $1.0\times0.368$ |
| 脚位置偏 0.05 m | $e^{-0.25}$ | $1.0\times0.779$ |
| 四项全满 | $1.0+0.5+1.0+0.5$ | 3.0 |

脚位置的 $\sigma$ 只有 0.1 m，比锚点紧一倍：TCRS 参考里最值钱的就是**脚放在哪**。

<h3 id="实例-第-6-步目标系对齐">第 6 步：目标系动作对齐（式 10，示意）</h3>

看左膝一个关节：

| 量 | 数值 |
|---|---|
| 学生的命令 $q^{\mathrm{raw}}$（平地走路的膝角） | 0.30 rad |
| 教师的命令 $q^{\mathrm{tcrs}}$（上台阶膝盖弯得更多） | 0.62 rad |
| 教师残差 $\mu^{\mathrm{tea}}$ | 0.05 rad |
| 教师真正的 PD 目标 $q^{\mathrm{tcrs}}+\mu^{\mathrm{tea}}$ | 0.67 rad |
| **对齐标签** $a^\star=0.67-0.30$ | **0.37 rad** |
| 不对齐、直接抄 $\mu^{\mathrm{tea}}$ → 学生 PD 目标 $0.30+0.05$ | 0.35 rad，**差 0.32 rad** |

**读法**：不对齐的学生相当于在台阶上按平地的膝角走，只加了一点点教师的微调——差出来的 0.32 rad 落到脚上约是 10 cm 的高度差，足以让脚磕到 15 cm 台阶的沿。仓库 `_teacher_alignment.py` 里就是一行：`aligned = teacher_actions + (q_ref_teacher - q_ref_student)`，其中 `q_ref` 取命令窗口**中间那一帧**的后 29 维（窗口布局 `[v_ref_b(3), w_ref_b(3), g_ref_b(3), q_ref(29)]`）。

（「约 10 cm」是我按 G1 小腿长 0.30 m（`terrain_warp.py` 里的 `L_LOWER_LEG`）粗估的：$0.32\times0.30\approx0.096$ m，只为给 0.32 rad 一个直观尺度。）

<h3 id="实例-第-7-步门控与微调">第 7 步：恒等门控与微调</h3>

| $\alpha$ | $\tanh\alpha$（门开度） | $\tanh'\alpha=1-\tanh^2\alpha$ |
|---|---|---|
| 0（初始化） | 0.000 → 输出 = 盲跟踪器 | 1.000 |
| 0.25 | 0.245 | 0.940 |
| 0.5 | 0.462 | 0.786 |
| 1.0 | 0.762 | 0.420 |

- 初始化时 $\tanh(0)=0$：学生与原始参考跟踪器完全一样，地形支路不起作用；
- $\alpha$ 的梯度 $\propto\tanh'(\alpha)\cdot\Delta$，在 0 处 $\tanh'=1$ 最大，只要残差支路输出 $\Delta\neq0$，门就会被推开；
- 所以**残差支路不能也零初始化**——否则 $\partial\mathcal{L}/\partial\alpha\propto\Delta=0$、$\partial\mathcal{L}/\partial\Delta\propto\tanh(\alpha)=0$，两边梯度互锁，门永远打不开。仓库 `vision_transformer_actor_critic.py` 的注释正是这么写的（引 ReZero），只在没有门的 `PlainResidual` 消融里才把末层零初始化。论文正文写的是「门向量和最终残差层都初始化为零」，与代码不一致，以代码为准更说得通（这是我的判断）。

<h3 id="实例-第-8-步表格换算">第 8 步：论文表格里算出来的几个数</h3>

| 换算 | 算式 | 结果 |
|---|---|---|
| Table I 穿透深度 vs Z 偏移 | $(5.48-2.38)/5.48$ | $-56.6\%$ |
| Table I 净空违例 vs 三次插值 | $(14.3-7.4)/14.3$ | $-48.3\%$ |
| Table I 净空违例 vs Z 偏移 | $(33.8-7.4)/33.8$ | $-78.1\%$ |
| Table III 监督来源 原始 → TCRS | $55.1/27.3$ | 约 2.02 倍 |
| Table IV 每类地形槽位 | 30 条命令 × 3 个种子 | 90 |
| Table IV 台阶行 PMT | $53.3\%\times90=48$，$25.6\%\to23$，$21.1\%\to19$ | $48+23+19=90$ ✓ |
| Table IV 合计完成 | $48+60+38+47+55$ | **248 / 450 = 55.1%** |
| Table IV 原始参考合计完成 | $22+32+16+23+30$ | **123 / 450 = 27.3%** |
| Table IV 小腿碰撞 | $10+5+14+9+7$ vs $24+16+30+22+19$ | **45 vs 111**（10.0% vs 24.7%） |

五类地形的 Comp. / Fall / Track-loss 三列在每一行都能还原成加起来正好 90 的整数次数，说明表格是按 90 次回放算的百分比。

> 一个值得留意的巧合（我对照两张表发现的）：Table IV 固定策略回放的「All」行（55.1% / 27.3%）与 Table II 训练日志的成功率（55.1% / 27.3%）**完全相同**，而论文特意说明两者是不同协议、Table IV 不是 TensorBoard 计数。论文没有解释这个巧合。

</details>

---

## 📊 实验与结果

### 1. 参考质量（Table I，30 段、台阶 + 踏石）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：TCRS 主要赢在碰撞相关指标，浮空率与平滑度是代价</summary>

| 参考 | 穿透 cm ↓ | 浮空率 % ↓ | 净空违例 % ↓ | 脚平滑 m/s² ↓ | 上身偏差 cm ↓ |
|---|---|---|---|---|---|
| Z 偏移（FK 投影） | 5.48 | **12.4** | 33.8 | 15.1 | 6.51 |
| 三次插值 + IK | 2.69 | 31.7 | 14.3 | **6.9** | **3.98** |
| TCRS | **2.38** | 32.3 | **7.4** | 8.6 | 4.00 |

- 最清楚的收益在**碰撞相关**指标：穿透比 Z 偏移低 56.6%，净空违例比三次插值低 48.3%。
- **不是全面最好**：三次插值 + IK 在穿透上很接近，平滑度与上身偏差更好；Z 偏移的浮空率最低。更高的浮空率说明一些名义接触帧脚略悬空——可能发生在支撑切换或台阶边，合成器优先避免碰撞。
- 这些是在任何策略回放**之前**测的：论文的原则是「参考生成器要和它训练的跟踪器分开测」。

</details>

### 2. 训练日志消融（Table II）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：感知、TCRS、目标系对齐缺一不可；门控也有用，但需要种子方差才能细排</summary>

| 变体 | 成功率 % ↑ | 奖励 | 锚点误差 m ↓ | 关节误差 rad ↓ |
|---|---|---|---|---|
| **PMT（完整）** | **55.1** | 45.2 | **0.159** | **1.243** |
| 去掉恒等门控 | 30.4 | 14.9 | 0.231 | 1.428 |
| 视觉直接拼接（无门） | 29.9 | 14.5 | 0.234 | 1.421 |
| 去掉 TCRS（原始参考） | 27.3 | 17.9 | 0.229 | 1.833 |
| 去掉目标系对齐 | 26.7 | 9.3 | 0.221 | 1.959 |
| 去掉视觉（盲） | 26.5 | 10.6 | 0.238 | 2.464 |

- 去掉视觉、TCRS 或对齐都掉到 26%–27%；这几个之间 0.2–0.8 个点的差距没有种子方差，论文明说**不做排序**。
- 「去掉 TCRS」用同样的可部署架构直接在原始平地参考上 PPO，只有一半左右的成功率——增益不能只归功于感知输入。
- **比较的公平性**：去掉 TCRS / 视觉 / 对齐这三个阶段消融因为拿掉了预热阶段，只能从头训；完整 PMT 从蒸馏检查点接着微调。所以它们对齐的是**最终 PPO 预算与日志协议**，不是整条离线管线的总算力，奖励列也不可直接比。
- 成功率是训练末 100 次迭代里 `total_success / (total_success + total_failed)` 的平均，论文承认无法从日志确认它等价于「750 步超时完成」，也没有独立的留出命令—地形划分。

> 项目主页上的数字和 v2 论文不是同一口径：主页写「54.6 vs 3.6（完整 vs 盲）」「目标系蒸馏 +4.5（54.6 → 50.1）」「Transformer 比 MLP / GRU / CNN 高 5–8」，那是另一组训练曲线（主页注明「10k 次迭代中最后 1k 次的平均奖励」），而 v2 Table II 的奖励是 45.2 / 10.6 等。读的时候以论文表格为准。

</details>

### 3. 监督来源（Table III）与跨地形回放（Table IV）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：监督越贴地形成功率越高；五类地形上完成率都约翻倍、碰撞减半</summary>

**Table III**（同一可部署架构，只换教师的监督来源）：

| 监督来源 | 成功率 % | 锚点误差 m | 关节误差 rad |
|---|---|---|---|
| 原始参考（不合成） | 27.3 | 0.229 | 1.833 |
| Z 偏移参考 | 33.0 | 0.205 | 1.61 |
| 三次插值 + IK 参考 | 41.0 | 0.188 | 1.44 |
| **TCRS 参考** | **55.1** | **0.159** | **1.243** |

**Table IV**（固定策略、每类地形 30 条命令 × 3 种子 = 90 次；Comp. / Fall / Track-loss 互斥且加起来 100%，Coll. 是「至少一次小腿—地形接触」的比例）：

| 地形 | PMT 完成 / 摔 / 跟丢 / 碰 | 原始参考 完成 / 摔 / 跟丢 / 碰 |
|---|---|---|
| 台阶 | **53.3** / 25.6 / 21.1 / 11.1 | 24.4 / 47.8 / 27.8 / 26.7 |
| 斜坡 | **66.7** / 15.6 / 17.8 / 5.6 | 35.6 / 37.8 / 26.7 / 17.8 |
| 稀疏支撑 | **42.2** / 33.3 / 24.4 / 15.6 | 17.8 / 55.6 / 26.7 / 33.3 |
| 凹陷障碍 | **52.2** / 26.7 / 21.1 / 10.0 | 25.6 / 46.7 / 27.8 / 24.4 |
| 室内混合 | **61.1** / 17.8 / 21.1 / 7.8 | 33.3 / 41.1 / 25.6 / 21.1 |
| 合计 | **55.1** / 23.8 / 21.1 / 10.0 | 27.3 / 45.8 / 26.9 / 24.7 |

这里刻意**不报穿透深度**：在接触求解器里，穿透反映的是求解器容差和高度场离散化，而不是策略质量，所以闭环里用小腿碰撞作几何失败的诊断。稀疏支撑最难（42.2%），斜坡最容易（66.7%）。

</details>

### 4. 真机部署

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：同一套权重跨行为、跨地形；动捕错配协议；为什么只有定性证据</summary>

- **同一套权重**：Fig. 1 的八组「动作 × 地形」——单腿后空翻、从台阶上后空翻、台阶上跳舞、挥臂跑、自由摆臂走、台阶上侧走、倒走跨障碍、台阶上转身；不做逐命令调参、不按地形切控制器。
- **动捕错配协议（Fig. 5）**：人在平地上动捕，机器人在随机摆放的台阶和方块上执行同一条命令——直接测「命令里没有地形信息时，机器人自己的感知能不能把它落地」。
- **室外**：台阶、草地、单个台阶、凹陷花坛、人行道过渡；有运行时看门狗，力矩饱和或姿态超出训练包络时触发软倒地恢复。
- **证据性质**：后空翻这类高能量动作大量重复试验对机器人和环境都有风险，所以真机结果只作**定性**展示，定量证据靠仿真的 Table I–IV。
- **失败案例（Fig. 6）**：动捕遥操作时上半身命令不感知碰撞，手臂会甩到旁边的障碍上。

</details>

---

## 📁 源码对照（Mondo-Robotics/PMT）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：目录结构、论文 ↔ 代码对照表、关键默认参数、运行命令、论文与代码的出入</summary>

仓库：[Mondo-Robotics/PMT](https://github.com/Mondo-Robotics/PMT)（BSD-3-Clause），跑在已有的 Isaac Lab 环境里；`flat` 任务族另有 [mjlab](https://github.com/mujocolab/mjlab)（MuJoCo-Warp）后端。以下基于 2026-08-13 的 `main`。

<h3 id="源码-目录结构">目录结构（实地核对）</h3>

```text
PMT/
├── TCRS/stair_mppi/                       # ★ 论文的 TCRS（地形 MPPI 优化器）
│   ├── mppi_foot_planner_smooth.py        #   入口 CLI：MPPI 摆腿 → 根高度滤波 → IK
│   ├── mppi_foot.py                       #   MPPI 摆腿优化器（样条基矩阵 + softmin 更新）
│   ├── gait_phase.py                      #   接触判定（z < 0.06 且速度 < 0.5）
│   ├── terrain_warp.py                    #   SupportAwareRootZFilter（式 7 + 限速）
│   ├── ghost_ik.py                        #   雅可比多点 IK（默认后端）
│   └── minimal_mppi_demo.py               #   MotionClip / FootstepResolver（台阶边裕量）
├── motion_tracking_rl/
│   ├── networks/vision_transformer_actor_critic.py   # ★ 恒等门控学生（式 8、9）
│   ├── networks/residual_vision_action.py            #   GatedResidual：x + tanh(α)·r
│   ├── networks/_teacher_alignment.py                # ★ 目标系对齐（式 10）
│   ├── networks/transformer_actor_critic.py          #   盲教师骨干
│   ├── algorithms/{ppo,distillation}.py              #   PPO（分组学习率）/ 蒸馏
│   └── runners/distillation_runner.py                #   教师接管概率退火
├── pmt_tasks/                             # 任务层：env_cfgs / agent_cfgs / mdp
├── configs/task/*.yaml                    # 一个实验一份组合配置（robot / terrain / motion / obs / reward / network / algorithm / stage）
├── checkpoints/pretrained/                # 教师、蒸馏学生、微调学生等 G1 权重（Git LFS / HF 镜像）
└── assets/motions/terrain_mocaphouse/     # 99 对 raw ↔ optimized 演示片段
```

<h3 id="源码-论文与代码对照">论文 ↔ 代码对照</h3>

| 论文 | 代码 | 备注 |
|---|---|---|
| 式 1–2：残差动作 | 命令窗口布局 `[v_ref_b(3), w_ref_b(3), g_ref_b(3), q_ref(29)]` | 38 维 / 帧 |
| 17 × 11 高度图 | `RayCasterCfg(prim_path=".../torso_link", ray_alignment="yaw", GridPatternCfg(resolution=0.1, size=(1.6, 1.0)))` | 躯干居中、随偏航对齐 |
| (a) 接触检测 | `gait_phase.py`：`contact_z_threshold=0.06`、`contact_speed_threshold=0.5` | 注释：z 阈值与地形无关，恒为 0.06 |
| 式 5–6：MPPI | `MppiFootOptimizer.optimize_swing`：样本 0 固定为当前均值，softmax 权重对样本求加权平均 | 等价于式 6 的 $Y+\sum w\epsilon$ |
| 净空裕量 $\delta$ | `clearance = h_clearance * 2 * sin²(πφ)` | 端点 0、中摆 6 cm |
| 边缘罚项 $\Phi _ {\mathrm{edge}}$ | MPPI 代价里**没有**单独这一项；台阶边由 `FootstepResolver(edge_margin=0.03)` 收缩落脚区间、IK 里按支撑降权处理 | 我读代码的结论 |
| 式 7：根高度 | `SupportAwareRootZFilter(alpha_up=0.5, alpha_down=0.35, max_delta=0.035)` | 类默认值是 0.35 / 0.10 / 0.02，规划器里改大了 |
| 式 12：多点 IK | `--ik_backend jacobian`（`ghost_ik.py`，权重在 `ik_config.json`） | curobo / drake 后端在开源版里被删了 |
| 式 8–9：门控 | `GatedResidual`：`alpha = nn.Parameter(torch.zeros(dim))`，`x + tanh(alpha) * residual` | 另有 `map_proprio_gate` 一条门 |
| 式 10：对齐 | `align_teacher_actions()`：`teacher_actions + (q_ref_teacher - q_ref_student)` | `align_teacher_to_student_reference: bool = True` |
| 教师接管 1 → 0 | `teacher_mix_start=1.0`、`teacher_mix_end=0.0`、`teacher_mix_anneal_iters` | 视觉潜锚点蒸馏配置里是 100 次迭代 |

<h3 id="源码-关键默认参数">关键默认参数（TCRS 命令行 / 类默认）</h3>

| 参数 | 值 | 对应论文 |
|---|---|---|
| `--mppi_n_samples` / `--mppi_n_iterations` | 128 / 10 | 式 6 的样本数与迭代 |
| `--mppi_n_knots` | 5 | 控制点 $K$（不含首尾） |
| `--mppi_temperature` | 0.1 | 温度 $\eta$ |
| `noise_std_xy` / `noise_std_z` | 0.02 / 0.04 m | 扰动 $\epsilon$ |
| `--w_track` / `--w_terrain` / `w_smooth` | 10 / 1000 / 10 | $\lambda _ {\mathrm{ref}}$ / $\lambda _ {\mathrm{clr}}$ / $\lambda _ {\mathrm{sm}}$（类默认 `w_terrain` 是 10000） |
| `--h_clearance` | 0.03 m | 净空裕量（中摆翻倍） |
| `n_dense` | 100 | 每段摆腿的评估点数 |
| `--leg_collision_iters` / `--leg_collision_margin` | 4 / 0.025 m | 碰撞修复轮数与裕量 |
| `--shin_collision_radius` / `--foot_collision_radius` | 0.06 / 0.04 m | 小腿 / 脚胶囊半径 |
| `--collision_max_push` | 0.06 m | 每帧最多外推 |
| `PELVIS_ANKLE_REACH` | $0.251+0.494+0.06=0.805$ m | 根高度的可达性截断 |

<h3 id="源码-跑起来">跑起来（README / USAGE 实录）</h3>

```bash
# 在已有的 Isaac Lab 环境里安装
python scripts/download_robot_assets.py          # G1 URDF + 网格（沿用 BeyondMimic 的资源包）
python -m pip install -e .
hf download aCodeDog/PMT-assets --repo-type dataset --local-dir /tmp/PMT-assets   # 演示动作与权重

# ① TCRS：平地片段 + 台阶场景 → raw/ optimized/ ghost/
cd TCRS && MUJOCO_GL=egl python -u -m stair_mppi.mppi_foot_planner_smooth \
  --motion assets/motions/walk1_subject1.npz --start_frame 1100 --n_frames 500 \
  --planner mppi --ik_backend jacobian --n_rounds 8 --batch_output_dir outputs/my_experiment

# ② 盲教师：big_map 地形上跟踪 optimized 片段
python scripts/train.py --task PMT-WalkDanceBigMap-G1-v0 --num_envs <n> --headless

# ③ 蒸馏视觉学生：教师读 optimized，学生读同名 raw
python scripts/train.py --task PMT-Distill-SteppingStone-LatentAnchor-G1-v0 --num_envs <n> --headless

# 回放仓库给的盲教师（README 原命令）
export PMT_TERRAIN_MOTION_ROOT=$(pwd)/assets/motions
export PMT_TERRAIN_ASSET_DIR=$(pwd)/assets/terrain
python scripts/play.py --task PMT-WalkDanceBigMap-G1-v0 \
  --resume_path checkpoints/pretrained/walkdance_bigmap_teacher.pt --num_envs 4
```

随附权重（`checkpoints/pretrained/README.md`）：盲教师 `walkdance_bigmap_teacher.pt`（20k 次迭代）→ 蒸馏学生 `distill_bigmap_walkdance.pt`（5k）→ PPO 微调学生 `ppoft_vision_bigmap_walkdance.pt`（3.2k，对应 `PMT-PPOFinetune-VisionTeacher-SteppingStone-G1-v0`）。

<h3 id="源码-论文与代码的出入">论文与代码的出入（我核对到的）</h3>

1. **门控初始化**：论文说门向量和最终残差层都零初始化；代码在有门时**故意不**把残差支路置零，避免梯度互锁（见实例第 7 步）。
2. **微调超参**：论文 Table VIII 写微调熵系数 0.001、骨干学习率 ×0.3；开源 `agent_cfgs/finetune.py` 里 `entropy_coef=0.0`，也没有显式设置 `backbone_lr_scale`（`VisionTransformerActorCritic` 的默认值是 1.0）。
3. **微调时的奖励参考**：论文附录 D 说学生微调在原始参考的命令系下进行；开源微调任务的注释写的是「奖励按 optimized（TCRS）轨迹算、策略观测用 raw 轨迹」（`paired: true`）。两种说法是否等价我没能从代码完全确认。另外 `docs/USAGE.md` 说微调任务是一个「脚手架」，要等对应检查点与启动约定提供后才完整接上。
4. **动作帧率**：论文附录 H 说动作以 30 fps 导出；仓库 README 说随附的演示片段是 50 fps。
5. **边缘罚项**：见上表，MPPI 代价里没有显式的 $\Phi _ {\mathrm{edge}}$。
6. **迭代数**：随附权重的迭代数（教师 20k、蒸馏 5k、微调 3.2k）与论文消融统一的 10k 最终 PPO 预算不同，读 Table II 时不要拿随附权重去对数。

</details>

### 源码运行时序（mermaid）

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户 / CLI
    participant T as TCRS<br/>mppi_foot_planner_smooth
    participant P as PMT train.py
    participant Te as 盲教师<br/>TransformerActorCritic
    participant St as 视觉学生<br/>VisionTransformerActorCritic
    participant R as G1（部署）

    U->>T: 平地片段 .npz + 台阶场景 .xml
    loop 每个随机摆放 (dx, dy, dyaw)
        T->>T: 接触判定 → 支撑脚贴地形
        T->>T: 每段摆腿：MPPI（128 样本 × 10 次）
        T->>T: 根高度 EMA 限速 → 碰撞修复 → 12 关节多点 IK
    end
    T-->>P: raw/ + optimized/ 成对片段
    P->>Te: PPO 跟踪 optimized（无感知）
    Te-->>P: 教师权重
    P->>St: 蒸馏：教师读 optimized，学生读 raw + 高度图
    St->>St: 标签 = teacher_actions + (q_ref_teacher − q_ref_student)
    P->>St: PPO 微调（门控残差，α 从 0 起）
    St-->>R: 部署：原始参考 + 本体 + 17×11 高度图
</div>

---

## 🧩 与本仓库其他笔记的关系

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BFM / SONIC / BeyondMimic / PHP / Deep Whole-body Parkour / OmniRetarget / UMR 各自的位置</summary>

| 笔记 | 与 Perceptive BFM 的关系 |
|---|---|
| [BFM](../Behavior_Foundation_Model_for_Humanoid_Robots/Behavior_Foundation_Model_for_Humanoid_Robots.html) / [BFM-Zero](../../04_Loco-Manipulation_and_WBC/BFM-Zero__A_Promptable_Behavioral_Foundation_Model_for_Humanoid_Control/BFM-Zero__A_Promptable_Behavioral_Foundation_Model_for_Humanoid_Control.html) | 「行为基础模型」这个说法的来源；本文把它限定为「以运动参考为接口、面向运动的行为先验」，并补上地形感知。仓库里还带了 BFM-Zero 的复现任务 |
| [SONIC](../SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html) | 大规模平地通用跟踪的代表；仓库也集成了 SONIC 的官方 ONNX（`sonic_onnx/`）作为一个任务 |
| [BeyondMimic](../../01_Foundational_RL/BeyondMimic/BeyondMimic.html) | PMT 的跟踪任务与奖励栈就是从 `whole_body_tracking` 演化来的（README 致谢） |
| [PHP](../../04_Loco-Manipulation_and_WBC/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching.html) | 同样是「人类动作 + 感知 + 专家蒸馏」，但 PHP 的命令是**速度**、技能由策略自选；Perceptive BFM 的命令是**任意动作参考**，感知只补落地。两者都在蒸馏时处理教师 / 学生输入不一致的问题 |
| [Deep Whole-body Parkour](../../04_Loco-Manipulation_and_WBC/Deep_Whole-body_Parkour/Deep_Whole-body_Parkour.html) | 把外感知并进通用跟踪的另一条路线；本文把它归到「围绕越障技能组织」的一类 |
| [OmniRetarget](../../02_Motion_Retargeting/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.html) / [UMR](../../02_Motion_Retargeting/UMR__Unified_Motion_Retargeting_with_Learned_Point_Cloud_Correspondence/UMR__Unified_Motion_Retargeting_with_Learned_Point_Cloud_Correspondence.html) | 都是「让参考和环境兼容」的运动学方法；区别在于它们产出的参考**就是**要跟踪的命令，而 TCRS 的产出只当训练监督，部署命令仍是原始参考 |

</details>

---

## 💡 核心贡献

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：TCRS、原始参考命令下的教师—学生算法、恒等门控 Transformer 跟踪器</summary>

1. **TCRS**：可扩展的离线合成管线，把原始人类动作 + 采样高度场变成地形一致的监督——接触感知落脚构造、脚几何感知的摆腿优化、支撑感知的根重建、碰撞修复、多点腿 IK。
2. **PMT**：命令接口不变的教师—学生算法。盲教师跟踪 TCRS 参考，视觉学生拿原始参考；目标系对齐把教师的地形贴合行为换算进学生的动作系。
3. **恒等门控 Transformer 跟踪器**：初始化即原始参考跟踪器，从机器人中心感知里学地形条件的残差修正；同一个命令接口支持走跑、表达性动作、特技与动捕错配。

</details>

---

## ⚠️ 局限与可改进点

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：纯运动学合成、上半身不避障、证据以日志统计为主、代码与论文有出入</summary>

- **TCRS 是运动学合成器**：不解接触动力学，假设地形静止、刚性、可观测；不建模软、颗粒或湿滑介质；假设下半身修正后上半身命令仍可行。
- **上半身不避障**：适配以脚为中心、上半身原样保留，手臂 / 躯干可能撞到旁边的障碍（Fig. 6）。未来工作：碰撞感知的上半身适配、动态与可变形地形、把行为语料扩到更完整的基础模型规模。
- **评估口径**：Table II / III 是训练末的 TensorBoard 计数，没有种子方差、没有留出的命令—地形划分；阶段消融只对齐最终 PPO 预算，不对齐整条管线算力。论文自己把这些写进了局限，并说下一步是更大的固定检查点留出评估。
- **真机只有定性证据**，没有重复试验统计。
- **TCRS 不做落脚重规划**：保留原始步相和落地时刻，遇到必须改步幅的地形（例如很窄的稀疏支撑）能力有限——稀疏支撑也是 Table IV 里完成率最低的一类（42.2%）。
- **代码与论文的出入**：见「源码对照」最后一节；复现时建议以代码配置为准并自行确认微调阶段的奖励参考。

</details>

---

## 🎤 面试参考

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：八个高频问题：为什么不在线跑 TCRS、为什么要对齐、门控为什么不能全零、TCRS 为什么在中足上规划……</summary>

**Q：既然 TCRS 能把参考改得贴合地形，为什么不部署时在线跑 TCRS 再跟踪？**
A：TCRS 需要完整的地形高度场和整段参考（它按支撑区间、整段摆腿做优化），而遥操作 / 在线命令是流式的，机器人只有局部高度图；而且论文的目标是**不改命令接口**——用户给什么就跟什么。所以 TCRS 只用来给教师造监督，地形修正能力最终内化到学生的残差里。

**Q：为什么学生不能直接模仿教师的残差动作？**
A：两者的残差围绕不同的命令：教师是 $q^{\mathrm{tcrs}}+\mu^{\mathrm{tea}}$，学生是 $q^{\mathrm{raw}}+\mu^{\mathrm{stu}}$。直接抄 $\mu^{\mathrm{tea}}$ 等于丢掉了 $q^{\mathrm{tcrs}}-q^{\mathrm{raw}}$ 这部分地形修正。要模仿的是教师真正的 PD 目标在学生系下的表达 $a^\star=(q^{\mathrm{tcrs}}+\mu^{\mathrm{tea}})-q^{\mathrm{raw}}$。Table II 去掉对齐，成功率 55.1% → 26.7%。

**Q：恒等门控解决了什么问题？**
A：保证加入视觉不会破坏已经学好的跟踪能力。$\alpha=0$ 时 $\tanh(\alpha)=0$，学生输出与原始参考跟踪器完全一样，地形只能作为「需要时才长出来」的修正。直接把视觉特征拼进去（vision-concat）或不带门的残差，成功率都只有 30% 左右。

**Q：门向量和残差支路能不能都零初始化？**
A：不能都为零。$\partial\mathcal{L}/\partial\alpha\propto\Delta$，$\partial\mathcal{L}/\partial\Delta\propto\tanh(\alpha)$，两边都是 0 就互锁，门永远打不开。开源代码里有门时残差支路保持随机初始化，恒等性已经由 $\alpha=0$ 保证（ReZero 同理）。

**Q：TCRS 为什么在中足点而不是踝关节上规划摆腿？**
A：踝关节在脚的后部，按踝规划容易让脚尖撞台阶沿；按脚尖规划又可能让脚跟刮沿。脚尖和脚跟的中点能同时照顾两端在地形不连续处的净空，规划完再换回踝、脚尖、脚跟三个 IK 目标。

**Q：为什么 IK 只动 12 个腿关节？**
A：地形适配主要是下半身接触问题；根朝向和上半身关节原样保留，才能保住命令的风格（挥手、舞蹈）。代价是上半身不避障。

**Q：为什么 Table IV 不报穿透深度？**
A：闭环仿真里的穿透反映的是接触求解器容差和高度场离散化，不是策略质量；穿透只对运动学参考（Table I）有意义，闭环里改用「小腿—地形接触比例」作几何失败诊断。

**Q：这篇的实验证据有哪些要打折扣的地方？**
A：Table II / III 是训练日志计数、无种子方差、无留出集；阶段消融因为拿掉了预热阶段只能从头训，只对齐最终 PPO 预算；真机只有定性展示。论文自己都写明了，读的时候把 Table IV 的固定策略回放当主要定量证据更稳妥。

</details>

---

## 🔗 相关笔记与外链

- [Behavior Foundation Model for Humanoid Robots](../Behavior_Foundation_Model_for_Humanoid_Robots/Behavior_Foundation_Model_for_Humanoid_Robots.html) — 行为基础模型
- [SONIC](../SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html) — 大规模平地通用跟踪
- [Perceptive Humanoid Parkour](../../04_Loco-Manipulation_and_WBC/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching.html) — 速度命令 + 动作匹配的感知跑酷
- [BeyondMimic](../../01_Foundational_RL/BeyondMimic/BeyondMimic.html) — PMT 跟踪任务的源头
- [Deep Whole-body Parkour](../../04_Loco-Manipulation_and_WBC/Deep_Whole-body_Parkour/Deep_Whole-body_Parkour.html) · [BFM-Zero](../../04_Loco-Manipulation_and_WBC/BFM-Zero__A_Promptable_Behavioral_Foundation_Model_for_Humanoid_Control/BFM-Zero__A_Promptable_Behavioral_Foundation_Model_for_Humanoid_Control.html) · [OmniXtreme](../../04_Loco-Manipulation_and_WBC/OmniXtreme_Breaking_the_Generality_Barrier_in_High-Dynamic_Humanoid_Control/OmniXtreme_Breaking_the_Generality_Barrier_in_High-Dynamic_Humanoid_Control.html) — 相关工作
- 官方仓库：[Mondo-Robotics/PMT](https://github.com/Mondo-Robotics/PMT) · 资源镜像：[aCodeDog/PMT-assets](https://huggingface.co/datasets/aCodeDog/PMT-assets) · 项目主页：[acodedog.github.io/perceptive-bfm](https://acodedog.github.io/perceptive-bfm/)

---

## 📚 引用（BibTeX 备忘）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX</summary>

```bibtex
@inproceedings{wang2026perceptivebehaviorfoundationmodel,
  title     = {Perceptive Behavior Foundation Model: Adapting Human Motion Priors to Robot-Centric Terrain},
  author    = {Zifan Wang and Yizhao Li and Teli Ma and Qiang Zhang and Yudong Fan and Hao Xu and Shuo Yang and Junwei Liang},
  booktitle = {Conference on Robot Learning (CoRL)},
  year      = {2026},
  url       = {https://arxiv.org/abs/2606.08059}
}
```

</details>

---

> 备注：本笔记基于 arXiv v2 全文（2026-06-15）、项目主页与官方仓库 2026-08-13 的 `main` 整理。Table I–IX 的数字直接取自论文；默认超参取自仓库，可能随仓库更新而变化。文中「示意 / 我的判断 / 我读代码的结论」标出的部分不是论文原文。
