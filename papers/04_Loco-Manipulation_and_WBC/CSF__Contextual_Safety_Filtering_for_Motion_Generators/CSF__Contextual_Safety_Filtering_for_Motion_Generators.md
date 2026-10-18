---
layout: paper
title: "CSF: Contextual Safety Filtering for Motion Generators"
zhname: "CSF：面向动作生成器的情境安全过滤"
category: "Loco-Manipulation and WBC"
arxiv: "2610.12467"
---

# CSF: Contextual Safety Filtering for Motion Generators
**同一个「出拳」打沙袋可以、打人不行：CSF 让冻结的文本到动作生成器自己生成每条安全规则的「危险参考」和「安全参考」，两者之差定义一个仿射安全裕度，再由场景与指令门控选出要生效的规则，用带安全参考跟踪项的 CBF-QP 在采样器的每一步修正输出估计，不训练任何模型**

> 📅 阅读日期: 2026-10-18
>
> 🏷️ 板块: 04 Loco-Manipulation and WBC · 语言驱动全身控制 · 安全过滤 · 控制屏障函数（CBF）· 免训练
>
> 🔁 推进轨: 模块轮转（14_Human_Motion → **04_Loco-Manipulation_and_WBC**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.12467](https://arxiv.org/abs/2610.12467) |
| HTML | [在线阅读](https://arxiv.org/html/2610.12467v1) |
| PDF | [下载](https://arxiv.org/pdf/2610.12467) |
| 项目页 | [lzyang2000.github.io/csf](https://lzyang2000.github.io/csf/) |
| 源码 | [lzyang2000/csf](https://github.com/lzyang2000/csf)（Apache-2.0；过滤器 `csf/filter/`、四个生成器的适配器 `csf/backbones/`、交互 Demo `csf/app/`，规则写在 `configs/rules.yaml`） |
| **发布时间** | 2026-10-08（arXiv v1） |

**作者**：Lizhi Yang、Yiling Hou、Yao Tang、Junheng Li、Daniel Weng、Blake Werner、Aaron D. Ames（Caltech AMBER Lab · NYU）。

**定位**：「语言 → 动作生成器 → 通用跟踪器」管线里插在生成器和跟踪器之间的一层**语义安全过滤**。生成器换成 [Kimodo](../../14_Human_Motion/Kimodo__Scaling_Controllable_Human_Motion_Generation/Kimodo__Scaling_Controllable_Human_Motion_Generation.html)、ECHO、MotionHiFlow 或 [ARDY](../../14_Human_Motion/ARDY__Autoregressive_Diffusion_with_Hybrid_Representation_for_Interactive_Human_Motion/ARDY__Autoregressive_Diffusion_with_Hybrid_Representation_for_Interactive_Human_Motion.html) 都只换一个适配器；真机上由 [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html) 跟踪过滤后的动作。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| CSF | Contextual Safety Filtering | 本文方法：按场景情境决定哪些安全规则生效的免训练过滤器 |
| CBF | Control Barrier Function | 控制屏障函数：$h(x) \ge 0$ 定义安全集，约束让状态不离开安全集 |
| CBF-QP | CBF Quadratic Program | 在 CBF 约束下找离名义输入最近的修正量的二次规划 |
| $\rho_t$ | barrier contraction rate | 屏障收缩率：每一步把违反量缩小到原来的 $1-\rho_t$ |
| $\gamma$ | safe-reference tracking weight | 安全参考跟踪权重：0 是最小修正，越大越往安全动作拉 |
| CFG | Classifier-Free Guidance | 无分类器引导，各条引导路径都要在同一预测空间里套 QP |

---

## 🎯 一句话总结

文本到动作生成器只管动作像不像、能不能跟，不管「对谁做」：踢球和踢人几乎是同一个身体动作。CSF 对每条用自然语言写的规则（如「攻击性地击打另一个人」），让**冻结的生成器自己**生成一条危险参考，再从一组中性动作里挑出与当前指令最接近的良性版本生成安全参考；当前输出估计在「安全 → 危险」方向上的投影取负，就是仿射安全裕度。语义门控用指令文本和相机检测到的实体（「一个人」「一个孩子」）决定哪些规则生效，CBF-QP 只在生效规则被违反时修正 $\hat x$，再把修正后的估计送回采样器。四个生成器上危险事件率最多降 90%，良性动作保留 88–100%，ARDY + SONIC 在 G1 真机上拦住了对人出拳 / 踢腿，并能在执行途中有人走进画面时改写剩下的参考。

---

## ❓ 要解决什么问题？

已有的安全手段各管一部分，都没回答「**这个场景下这个动作该不该做**」：

1. **只看提示词**（语言护栏）：可以被误导性提示绕过；「打那根柱子」看起来无害，但柱子旁边站着人；
2. **训一个动作分类器**：要标注数据，换生成器就得重训或重新验证；
3. **推理时引导**（GMD、PhysDiff）：规定动作往哪儿走、怎么物理可行，不规定能不能做；
4. **经典安全过滤**：约束碰撞区、关节限位这类几何集合，但这里的伤害是**语义的**，不是几何的；
5. **概念擦除 / 动作遗忘**：改模型参数会连带伤到用同一表示的良性动作；[SafeFlow](../SafeFlow__Real-Time_Text-Driven_Humanoid_Whole-Body_Control_via_Physics-Guided_Rectified_Flow/SafeFlow__Real-Time_Text-Driven_Humanoid_Whole-Body_Control_via_Physics-Guided_Rectified_Flow.html) 式的门控则是全有或全无。

CSF 要的是：生成器不动、不训新模型，规则用自然语言写，**同样的出拳在只有沙袋时原样放行，有人时才改**。

---

## 🔧 方法

### 1. 接口：采样器的「输出估计」

只要求采样器每一步能吐出「它认为最后会返回什么动作」的当前估计 $\hat x(s_t, c)$：扩散模型是调度器的干净估计 $x_0$，流匹配是由速度推出的终点估计，自回归模型是当前尚未提交的窗口。CSF 把 $\hat x$ 换成 $\hat x _ {\mathrm{filt}}$，再交还给采样器做它原本的更新，提示词不变。

### 2. 语义参考与裕度（式 1）

- 共 $K$ 条规则，每条 = 一段危险行为描述 + 它保护的实体（「另一个人」「一个孩子」「一只动物」）；
- 生成器用规则描述生成 $x^{(i)} _ {\mathrm{unsafe}}$，用中性动作库里与指令最近的那句（如「一个人以中性方式慢走」，都不近就用「放松站立」）生成 $x _ {\mathrm{safe}}$；不用无条件均值，因为那会把动作拉成静止姿态；
- 裕度：

$$m_i(\hat x) = -\frac{\langle \hat x - x _ {\mathrm{safe}},\; x^{(i)} _ {\mathrm{unsafe}} - x _ {\mathrm{safe}} \rangle}{\lVert x^{(i)} _ {\mathrm{unsafe}} - x _ {\mathrm{safe}} \rVert}$$

越负说明越往危险方向走。它是 $\hat x$ 的仿射函数（引理 1），$m_i(x _ {\mathrm{safe}}) = 0$；所有规则共用同一个 $x _ {\mathrm{safe}}$，所以「往 $x _ {\mathrm{safe}}$ 插值」对所有规则都是可行方向。参考和预测在同一个表示里，不需要嵌入对齐或成对数据；改规则只要重新生成参考。

### 3. 安全参考跟踪 CBF-QP（式 3）

把裕度直接当屏障函数 $h_i = m_i$，生效规则集合记作 $\mathcal A$：

$$\hat x _ {\mathrm{filt}} = \arg\min_x \tfrac12 \big\lVert x - \big((1-\gamma)\hat x + \gamma x _ {\mathrm{safe}}\big) \big\rVert^2 \quad \text{s.t.}\quad h_i(x) \ge (1-\rho_t)\,h_i(\hat x),\ i \in \mathcal A$$

- **定理 1**：可行集非空（$(1-\rho_t)\hat x + \rho_t x _ {\mathrm{safe}}$ 总可行）；安全集前向不变、每步违反量至少缩到 $1-\rho_t$，$\rho_t = 1$ 时一步进安全集；$\gamma = 0$ 时是最小范数修正，**本来就安全的估计原样通过**；
- **对偶求解**：原问题每个通道一个变量（Kimodo 是 417 维 × 帧数），约束只有 $\lvert\mathcal A\rvert \le 6$ 条，所以在对偶上用 Hildreth 坐标上升，$\hat x _ {\mathrm{filt}} = \hat x + \gamma c_s + A^\top\lambda$；
- **岭松弛**（命题 1）：相关的规则方向会让 Gram 矩阵病态，加 $\varepsilon I$（代码默认 $10^{-2}$），等价于铰链平方罚，单条规则的残差是 $h_i(\hat x _ {\mathrm{filt}}) = (1-\gamma)\frac{\varepsilon}{1+\varepsilon}h_i(\hat x)$（式 4）。

### 4. 语义情境门控（式 5）

$g_i = g_i^{\mathrm{perception}} \lor g_i^{\mathrm{prompt}}$，两个信号都用生成器自带的文本编码器算余弦相似度：

- **感知信号**（按规则）：检测到的实体标签离哪个「被保护实体」最近（候选里还有「无生命物体」「墙或建筑」「家具或器材」这些中性归宿），就激活保护它的规则；
- **指令信号**：指令离某条危险描述比离所有良性对照（「打沙袋」「踢球」「切菜」……）都近，就激活整组规则。

$\mathcal A$ 为空时 $\hat x _ {\mathrm{filt}} = \hat x$，完全不碰生成器。

### 5. 套到不同生成器上（表 I）

| 生成器 | 预测空间 | $\gamma$ | 根通道 |
|---|---|---|---|
| Kimodo-G1（DDIM 扩散） | 417 维动作特征 | 0 | 排除（5 维） |
| ECHO（DPM-Solver 扩散） | 38 维动作特征 | 0.2 | 不可分 |
| MotionHiFlow（VAE 潜空间流匹配） | VAE 潜变量 | 0.5 | 不可分 |
| ARDY（窗口自回归，混合 token） | 20 + 128 维 | 0.2 | 排除（20 维） |

- **动作空间**：用对角投影 $M$ 只修姿态通道（式 6），根通道不动，免得过滤器靠「把人整个挪远」来满足规则；
- **潜空间**：潜变量距离未必能分开概念，论文给了在解码后算裕度、沿解码器梯度做牛顿式步进的选项（式 7–8），但基准里实际是直接在潜空间解 QP、配 $\gamma = 0.5$；
- **自回归**：每个窗口提交前过滤、再重新量化（式 9），已提交的历史不可改，所以只修姿态，根轨迹留给生成器。

### 6. 运行时安全护盾（式 10）

执行途中场景变了（有人走进画面）：在剩余参考上按窗口算裕度，找当前光标 $\ell$ 之后第一个低于阈值 $\tau$ 的窗口，从拼接帧 $e = \min(\ell + b, T-1)$ 起换成对齐朝向和位置的安全续接（站立），过渡段混合。$\tau$ 由「独立再采一次的站立」和「中性行走」两段真正安全的片段的最低裕度再减 25% 标定；已执行的帧不改，护盾一旦触发就保持到片段结束。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph SPEC["📜 安全规则（自然语言，configs/rules.yaml）"]
        S1["6 条规则：打人 / 踢人 / 抓人 / 攻击人<br/>伤害孩子 / 伤害动物"]
        S2["每条 = 危险描述 + 被保护实体"]
    end

    subgraph IN["🎙️ 输入"]
        P["语音指令 c<br/>例：Throw a forward punch"]
        V["相机感知 → 实体标签<br/>例：a person / a pillar"]
    end

    subgraph REF["🧪 参考（冻结生成器自己生成）"]
        R1["x_unsafe^(i)：每条规则的危险描述"]
        R2["x_safe：中性动作库里离 c 最近的一句<br/>都不近 → 放松站立"]
    end

    subgraph GATE["🚦 语义情境门控（式 5）"]
        G1["感知信号：实体最近的被保护实体"]
        G2["指令信号：c 更像危险描述还是良性对照"]
        G3["A = 两个信号任一触发的规则"]
        G1 --> G3
        G2 --> G3
    end

    subgraph GEN["🌊 冻结生成器的采样循环（四种生成器通用）"]
        L1["采样状态 s_t → 输出估计 x̂"]
        L2["裕度 m_i(x̂)：沿「安全 → 危险」方向投影取负"]
        L3["CBF-QP（式 3）<br/>min ‖x − ((1−γ)x̂ + γ x_safe)‖²<br/>s.t. h_i(x) ≥ (1−ρ) h_i(x̂)"]
        L4["Hildreth 对偶 + 岭 ε<br/>x̂_filt = x̂ + γc + Aᵀλ"]
        L5["采样器用 x̂_filt 做原本的更新"]
        L1 --> L2 --> L3 --> L4 --> L5 --> L1
    end

    subgraph RUN["🤖 执行"]
        E1["过滤后的参考动作"]
        E2["SONIC 跟踪器 → Unitree G1"]
        E3["运行时护盾（式 10）<br/>有人进画面 → 第一个违规窗口之后<br/>拼接安全续接"]
        E1 --> E2
        E3 --> E2
    end

    SPEC --> REF
    SPEC --> GATE
    P --> GATE
    V --> GATE
    P --> REF
    REF --> GEN
    GATE --> GEN
    GEN --> E1
    V -.执行途中场景变化.-> E3
</div>

---

## 🚶 具体实例：二维玩具上的一步 QP

为了看清式 1、3、4，把动作压成二维（数字是自己设的玩具，不是论文的数据）：$x _ {\mathrm{safe}} = (0, 0)$，$x _ {\mathrm{unsafe}} = (2, 0)$，当前估计 $\hat x = (1.5, 1)$，只有这一条规则生效。

**裕度**：方向 $d = (2, 0)$，$\lVert d \rVert = 2$，$a = -d/\lVert d\rVert = (-1, 0)$，

$$m(\hat x) = -\frac{\langle (1.5, 1), (2, 0)\rangle}{2} = -1.5$$

为负，说明在危险方向上走了 1.5 个单位；安全集就是半平面 $x_1 \le 0$。

| 设置 | 修正后 $\hat x _ {\mathrm{filt}}$ | 修正后裕度 | 说明 |
|---|---|---|---|
| $\rho = 1,\ \gamma = 0$，精确解 | $(0,\ 1)$ | $0$ | 最小范数投影：只削掉危险方向那一维，第二维（与规则无关的动作内容）原样保留 |
| $\rho = 0.5,\ \gamma = 0$ | $(0.75,\ 1)$ | $-0.75$ | 每步只收缩一半违反量，留给后续采样步继续修 |
| $\rho = 1,\ \gamma = 0.2$，精确解 | $(0,\ 0.8)$ | $0$ | 先往 $x _ {\mathrm{safe}}$ 拉 20%（$y_\gamma = (1.2, 0.8)$）再投影，第二维也被带向安全动作 |
| $\rho = 1,\ \gamma = 0.2$，岭 $\varepsilon = 0.01$ | $(0.0119,\ 0.8)$ | $-0.0119$ | 对偶 $b = 1.5 - 0.2 \times 1.5 = 1.2$，$\lambda = 1.2 / 1.01 = 1.188$；残差正好是式 4 的 $(1-\gamma)\frac{\varepsilon}{1+\varepsilon}h(\hat x) = 0.8 \times 0.0099 \times (-1.5)$ |

对照 $\gamma = 0$ 的第一行：若 $\hat x$ 本来在 $x_1 \le 0$ 一侧（比如对着沙袋出拳、门控根本没激活规则，或激活了但没越界），QP 什么也不改——这就是「良性动作原样放行」的来源。$\gamma > 0$ 则用一点放行精度换取「改成一个像样的安全动作」，潜空间概念分得越不开（MotionHiFlow），越需要大的 $\gamma$。

**门控那一步**：指令「Throw a forward punch」最像的是良性对照「对空出拳 / 练拳」，指令信号不触发；相机报出「a person」，它离被保护实体「another person」最近，于是前四条保护人的规则进 $\mathcal A$，孩子和动物两条不进。若相机只报出「a pillar」，它会落到「墙或建筑」这个中性归宿，$\mathcal A$ 为空，出拳原样执行——这正是图 1 / 图 6 里同一句指令一放一拦的情形。

---

## 🧑‍💻 源码运行时序图（mermaid）

基于 [lzyang2000/csf](https://github.com/lzyang2000/csf)（2026-10-08 提交 `df4dd26`）的 Demo 路径 `csf/app/generate.py::run_generation`，以 ARDY 适配器为例（真机用的也是 ARDY）：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant UI as Demo / 真机前端
    participant APP as app/generate.py
    participant H as AdapterFilterHandle<br/>(filter/handle.py)
    participant GT as gate.rule_signals
    participant M as ARDY 模型
    participant FD as FilteredDenoiser<br/>(ardy/filter_proxy.py)
    participant QP as filter_correction + hildreth<br/>(filter/qp.py)
    participant SH as RuntimeShield<br/>(filter/shield.py)

    UI->>APP: run_generation(prompts, durations, seed, entities)
    APP->>H: attach_filter()：按 configs/backbones 设 γ、ρ、root_dims
    APP->>H: set_entities(["a pillar"] / ["a person"])
    APP->>M: 先生成一遍未过滤动作（对照 + 看根速度）
    APP->>H: choose_safe_references → select_for_motion<br/>原地 → 站立；在走 → 最近的中性行走
    APP->>H: filtering(prompts, durations, steps)
    H->>GT: decide(prompt)：实体 / 指令余弦相似度
    GT-->>H: active_mask g_i（空 → 本段直接放行）
    H->>M: reference_feat(规则危险描述) × K、reference_feat(x_safe)<br/>（一次生成、按 key 缓存）
    H->>M: set_filter_context(unsafe, safe, cfg, mask)
    loop 每个自回归窗口 × 每个去噪步
        M->>FD: forward(...)：内层去噪器给出干净估计
        FD->>FD: 取 generation token 作 x̂，按窗口偏移截取参考块
        FD->>QP: filter_correction(x̂, x_safe, x_unsafe, mask)
        QP->>QP: 排除根通道，算裕度 m_k 与单位方向 a_k
        QP->>QP: hildreth(AAᵀ + εI)：CPU float64 坐标上升 ≤ 20 轮
        QP-->>FD: delta = γc + Aᵀλ
        FD-->>M: 只改 generation token，历史不动
    end
    M-->>APP: 过滤后动作（posed_joints, global_rot_mats）
    APP->>UI: present()：橙色原始 vs 蓝色 CSF
    APP->>SH: arm()：按窗口算剩余参考裕度，τ = 安全片段最低裕度 − 25%
    UI->>APP: 执行中勾选 Person in scene → person_enters_view()
    APP->>SH: step(cursor, context_active=True)
    SH->>SH: first_violation：光标后第一个裕度 < τ 的窗口
    SH-->>APP: splice：e = cursor + 缓冲起拼接站立，0.3 s 过渡
    APP-->>UI: 跟踪器继续跟改写后的参考
</div>

---

## 📊 实验与结果

**基准**：6 条规则 × 28 对「危险—良性」指令 × 3 个随机种子，每对在「允许场景」与「有被保护实体的场景」里各跑一遍，有无 CSF 各一遍；每个生成器 672 段，共 2,688 段。危险事件用独立于裕度的检测器判定：末端执行器持续快速伸展超过「未过滤良性动作第 95 百分位」的阈值。

| 指标 | 结果 |
|---|---|
| 残余危险率（过滤 / 未过滤） | Kimodo、MotionHiFlow、ARDY 降到 **0.1**（即降 90%），ECHO 0.2 |
| 保留代价（良性动作被推向站立的 Mahalanobis 距离，归一化） | Kimodo 0.21（最小）… MotionHiFlow 0.64（最大），ECHO、ARDY 居中 |
| 规则激活 | 四个生成器上所有「明说的」和「场景触发的」危险用例都选中了正确规则，匹配的允许场景里都不激活 |
| 良性保留 | **88–100%** 的良性片段原样通过或落到选定的安全对照上；Kimodo 的修正量比同指令两次采样的自然差异还小 |
| 对比退化基线 | 四个生成器都在「不过滤」与「混向站立」两个端点连线之下：每丢一单位良性动作压掉的危险更多 |

- **代价跟着表示走**：Kimodo 的动作空间里概念分得开，$\gamma = 0$ 的最小修正就够；MotionHiFlow 潜空间里裕度几乎是平的，只能靠 $\gamma = 0.5$ 强拉；
- **推理开销**（RTX 4090）：对偶求解 1–6 条规则 0.01–0.18 ms，一次完整过滤 0.3–1.2 ms；ECHO / MotionHiFlow / ARDY 一次性准备参考 0.6–0.9 s、之后每段最多多 19%；Kimodo 要在采样中构造步匹配参考，生成 4 s 动作从 1.61 s 涨到 7.60 s，其中 QP 只占 0.14 s——**大头是参考构造，不是 QP**；
- **G1 真机**（图 6）：语音指令 + 相机感知 → ARDY → CSF → SONIC。明说对人出拳 / 踢腿、对柱子出拳但旁边有人这两种都被改写，只有柱子时原样执行；运行时护盾试验里机器人开始对物体出拳，有人走进画面后没有打完。

---

## 💡 核心贡献

1. **免训练的语义安全过滤器**：规则用自然语言写，危险 / 安全参考由冻结生成器自己生成，场景决定规则是否生效；
2. **安全参考跟踪 CBF-QP**：在仿射语义裕度上证明每步可行、安全集不变、任意 $\gamma$ 下最优，$\gamma = 0$ 时退化为最小干预与精确放行，并刻画了岭松弛的残差；
3. **跨架构**：同一套规则、裕度、门控、QP 套在扩散、流匹配潜空间、自回归窗口四类生成器上，只换适配器；
4. **完整真机闭环**：感知 + 生成 + 跟踪在 G1 上跑通，运行时护盾能改写正在执行的参考。

---

## 🤖 对人形机器人的启示

- 语言驱动的全身控制越来越像「生成器 + 通用跟踪器」，安全检查放在**参考动作层**最便宜：跟踪器不用重训，换生成器也只换适配器；
- 把 CBF 从状态空间搬到「生成器的输出估计空间」，屏障函数由生成器自己的两条样本定义——这是 Ames 组把 CBF-RL、PAC-Man 那条路线从「物理安全」推到「语义安全」；
- 门控把「做什么」和「对谁做」分开：同一技能在不同场景下有不同许可，比一刀切地擦除概念更适合要干活的机器人（打桩、踢门、搬东西都是「像攻击」的动作）。

---

## ⚠️ 局限与可改进点

- **只修姿态、不修根轨迹**：机器人不会因为规则生效而绕开或后退，作者列为未来工作；
- **安全参考是一次性生成的**：运行时护盾只能换成站立续接，不能根据实时场景重新生成更自然的安全动作；
- **规则得靠方向分开**：裕度假设危险与安全参考之差能代表这个概念；潜空间里概念分不开时（MotionHiFlow）保留代价明显变大；
- **门控依赖检测标签与文本编码器**：感知漏检或标签含糊，规则就不会激活；指令信号是「最近邻」判定，良性对照写得不全会误触发或漏触发；
- 危险事件检测器本身是启发式（末端快速伸展），真机只做了定性演示，没有统计成功率；Kimodo 路径的推理时间涨了约 4.7 倍。

---

## 🎤 面试参考

1. **为什么裕度是仿射的这么重要？** 参考固定时 $h_i(x) = a_i^\top(x - x _ {\mathrm{safe}})$，约束是半空间，QP 是凸的；可行性证明也直接来自「往 $x _ {\mathrm{safe}}$ 插值让所有裕度等比缩小」。
2. **$\gamma = 0$ 和 $\gamma > 0$ 的取舍？** $\gamma = 0$ 是最小范数修正，安全的估计一点不动，但修正后的动作可能只是「危险分量被削掉的半成品」；$\gamma > 0$ 往安全动作拉，动作更完整，但良性动作也会被改一点（失去精确放行）。
3. **为什么在对偶上解？** 原问题维度是「通道数 × 帧数」（几千到几万），约束只有生效规则条数（≤ 6），对偶只有 $\lvert\mathcal A\rvert$ 个变量，表示维度只出现在 Gram 矩阵的内积里。
4. **为什么要排除根通道？** 否则 QP 可以通过把整个人平移远离目标来满足裕度，而不是改掉出拳本身。
5. **运行时护盾的阈值怎么定？** 用同一后端生成的「再采一次的站立」和「中性行走」两段真正安全的片段，取它们的最低窗口裕度再减 25%，所以不同生成器的裕度尺度不用互相比较。

---

## 🔗 相关阅读

- [SafeFlow](../SafeFlow__Real-Time_Text-Driven_Humanoid_Whole-Body_Control_via_Physics-Guided_Rectified_Flow/SafeFlow__Real-Time_Text-Driven_Humanoid_Whole-Body_Control_via_Physics-Guided_Rectified_Flow.html)：同样做文本驱动全身控制的安全，但走「物理引导 + 选择性门控」，执行前全有或全无
- [Kimodo](../../14_Human_Motion/Kimodo__Scaling_Controllable_Human_Motion_Generation/Kimodo__Scaling_Controllable_Human_Motion_Generation.html)：本文四个生成器之一，保留代价最小
- [ARDY](../../14_Human_Motion/ARDY__Autoregressive_Diffusion_with_Hybrid_Representation_for_Interactive_Human_Motion/ARDY__Autoregressive_Diffusion_with_Hybrid_Representation_for_Interactive_Human_Motion.html)：真机部署用的自回归生成器
- [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)：G1 上跟踪过滤后参考的通用跟踪器
- [RLPF](../../13_Physics-Based_Animation/RLPF__RL_from_Physical_Feedback_Aligning_Large_Motion_Models_with_Humanoid_Control/RLPF__RL_from_Physical_Feedback_Aligning_Large_Motion_Models_with_Humanoid_Control.html)：另一条「让生成器适配机器人」的路线（物理反馈后训练），与 CSF 的免训练过滤互补
- CBF-QP 经典：[Control Barrier Function Based Quadratic Programs for Safety Critical Systems](https://arxiv.org/abs/1609.06408)（Ames et al., TAC 2017）
- [CBF-RL](https://arxiv.org/abs/2510.14959) / [PAC-Man](https://arxiv.org/abs/2607.28623)：同组把 CBF 用进人形 RL 训练的前作
