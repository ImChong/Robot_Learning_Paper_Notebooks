---
layout: paper
title: "Memory before Goal: Role of Pre-History Memory for Humanoid Loco-Manipulation"
zhname: "Memory before Goal：前史记忆在人形移动操作中的作用"
category: "Loco-Manipulation and WBC"
arxiv: "2610.31166"
---

# Memory before Goal: Role of Pre-History Memory for Humanoid Loco-Manipulation
**全身 VLA 只看当前画面，线索一消失（灯灭了、杯子藏起来了、机器人转身走开了）就只能瞎猜：WholeBodyMem 用冻结的 SAM3 跟踪任务物体，按「出现 / 消失 / 移动 / 变形」这些物体事件因果地挑出最多 7 帧关键帧，连同物体 token 一起由动作专家的交叉注意力 + FiLM 读取，「留对的帧，而不是留更多的帧」**

> 📅 阅读日期: 2026-10-29
>
> 🏷️ 板块: 04 Loco-Manipulation and WBC · 全身 VLA · 感知记忆 · 关键帧选择 · 记忆基准
>
> 🔁 推进轨: 模块轮转（14_Human_Motion → **04_Loco-Manipulation_and_WBC**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.31166](https://arxiv.org/abs/2610.31166) |
| HTML | [在线阅读](https://arxiv.org/html/2610.31166v1) |
| PDF | [下载](https://arxiv.org/pdf/2610.31166) |
| 项目页 | [memory-before-goal.github.io](https://memory-before-goal.github.io)（审稿用的匿名页，含真机视频） |
| 源码 | ⏳ 未开源（论文与项目页均未给代码仓库） |
| **发布时间** | 2026-10-22（arXiv v1） |
| 投稿 | IEEE Robotics and Automation Letters（RA-L） |

**作者**：Chenyuan Chen、Ran Ding、Lechen Zhang、Zewen He、Yoshihiko Nakamura（MBZUAI）。

**定位**：给 [Ψ₀](../Ψ₀__An_Open_Foundation_Model_Towards_Universal_Humanoid_Loco-Manipulation/Ψ₀__An_Open_Foundation_Model_Towards_Universal_Humanoid_Loco-Manipulation.html) 这类「VLM 骨干 + 流匹配动作专家」的全身 VLA 加一层**物体引导的感知记忆**；底层仍由全身控制器执行（仿真里是 AMO / SIMPLE 的解耦控制器，真机上是 [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)），评测平台是 [SIMPLE](../../11_Simulation_Benchmark/SIMPLE__Simulation-Based_Policy_Learning_and_Evaluation_for_Humanoid_Loco-manipulation/SIMPLE__Simulation-Based_Policy_Learning_and_Evaluation_for_Humanoid_Loco-manipulation.html)。同时提出记忆基准 **HuMeGo**（6 个仿真 + 6 个真机 G1 任务）。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VLA | Vision-Language-Action | 视觉—语言—动作模型 |
| SAM3 | Segment Anything Model 3 | 可用短语提示的视频分割模型，本文冻结后只当跟踪器 |
| FiLM | Feature-wise Linear Modulation | 用读出向量对特征做逐通道缩放 $\gamma$ 和平移 $\beta$ |
| DiT | Diffusion Transformer | 动作专家的 Transformer 块，本文 $L = 6$ |
| HuMeGo | Humanoid Memory before Goal | 本文的人形记忆基准 |
| O / S / T / P | Object / Spatial / Temporal / Progress | 记忆类型：是什么变了 / 东西去哪了 / 何时、几次 / 任务进度 |

---

## 🎯 一句话总结

动态场景里的移动操作是**非马尔可夫**的：可乐先停在哪个座位、灯闪了几次，决策那一刻都已经看不到了，而人形头部相机还会随转身、走路把线索甩出视野。WholeBodyMem 不存长视频、不压缩成摘要，而是学人类「只记关心的东西变化的那一刻」：SAM3 跟踪任务物体并扣除相机自身运动，把物体出现、消失、重现、移动、变形的帧标成事件，因果选择器在「首帧、中间帧、当前帧」之外最多再塞 4 帧事件帧（自适应预算 3–7 帧，平均 5.4 帧），每帧保留 77 个原生视觉 token，再加最多 14 个物体 token；动作专家的 6 个 DiT 块各用一次交叉注意力读记忆，读出量以 FiLM 调制动作 token。HuMeGo 六个仿真记忆任务成功率 29.1% → **72.6%**，记忆决策正确率 94%（随机 36%）；14 个标准 SIMPLE 任务 70.2% → **86.9%**；真机 G1 六个任务 22/60 → **53/60**。

---

## ❓ 要解决什么问题？

1. **全身 VLA 只看现在**：$\pi _ {0.5}$、GR00T、$\Psi_0$、WholeBodyVLA 都只以当前画面和很短的本体历史为条件，离开视野的事件不再影响动作；
2. **人形特有的两重难**：线索不仅会「被场景结束」（灯灭、物体被遮），还会「被自己的运动甩出视野」（转身去拿东西）；记忆还得在全身控制运行时**因果地**更新；
3. **桌面机械臂的记忆方案不合用**：长帧历史贵且把短暂线索稀释掉；压缩成 gist token / 记忆槽会丢掉决策需要的细节（线索可能不到画面的 1%）；等间隔采帧会漏掉 0.2 s 的闪烁；基于机器人自身操作的事件帧又不管场景里的物体；
4. **没有基准**：人形基准（HumanoidBench、SIMPLE、HumanoidArena、HumanoidMimicGen）里目标一直在视野中，记忆基准（RoboMME、RoboMemArena）都是桌面机械臂。

---

## 🔧 方法

### 1. HuMeGo 基准：什么叫「依赖记忆」

每个回合分三段：**线索**（场景变化从 2–3 个候选垫子里选出答案 $y$）→ **保持**（与答案无关的全身技能）→ **决策**（从 $t_d$ 起动作必须依 $y$ 而定）。三条要求：$t_d$ 时线索已不可见；指令和 $t_d$ 之前的动作都与 $y$ 无关；$y$ 在候选间均衡。于是无记忆策略的决策正确率就是随机水平 $1/\lvert\mathcal Y\rvert$，论文把**记忆决策正确率**和操作成功率分开打分。

| 仿真任务 | 记忆类型 | 线索 |
|---|---|---|
| FlashPad | T（计数） | 灯闪 1–3 次 |
| HideMug | S（持久性） | 一个杯子藏到三块挡板之一后面，诱饵杯离开 |
| ShellGame | S | 球扣在三个杯子之一下，然后交换杯子 |
| LitLamp | O（指代） | 两盏彩灯之一亮起 |
| BlinkPad / TouchPad | O | 三块垫子之一闪 0.2 s；最后放到 / 摸那块垫子 |

**数据生成**：MuJoCo（2 ms 物理、50 Hz 控制）里用脚本专家（预计算 Dex3 抓取 + cuRobo 手臂规划 + AMO 腿腰平衡）跑，Isaac Sim 回放渲染头部相机（640×360），导出 LeRobot v2.1（32 维状态、36 维全身动作）。每任务 100 条训练示范、90 个测试场景。平均回合 1,155 步（23 s，SIMPLE 只有 322 步）；线索只占回合的 0.8–14.7%，要记 13.5–22.5 s；**40.7% 的步数在决策点之后**。

### 2. 基础策略：$\Psi_0$ 式全身 VLA

$\pi_\theta(\mathbf a_t \mid I_t, s_t, \ell)$ 以 50 Hz 输出 $H = 30$ 步动作块：上身关节目标 + 下身命令（躯干朝向、基座高度、基座速度，由下身控制器转成腿部关节）。Qwen3-VL-2B 骨干冻结，流匹配动作专家生成动作。WholeBodyMem 加上记忆 token $\mathbf M_t$ 与物体 token $\mathbf O_t$：$\pi_\theta(\mathbf a_t \mid I_t, s_t, \ell, \mathbf M_t, \mathbf O_t)$。

### 3. 物体引导的记忆选择

- **物体跟踪**：冻结的 SAM3 用一两个短语提示（如「blue cup」）逐帧跟踪任务物体，给出掩码、框和置信度；提示词每任务写一次（由 Claude Opus 5.5 写好、评测前固定），事件规则和阈值全任务共用；相邻帧背景特征拟合相似变换，扣掉相机自身运动；
- **物体事件**：某帧上的物体**出现、消失（取最后可见帧）、重现、移动超过图像对角线 3%、形状变化（掩码与上一帧重叠 < 65%）**，这一帧才成为候选；消失 / 重现优先，其次按置信度排，置信度 < 0.35 的检测忽略；
- **因果选择（算法 1）**：首帧、中间帧、当前帧必留；再按分数从高到低最多加 4 帧事件帧，若该帧的物体在已选帧 $\pm g = 5$ 帧内已有一帧则跳过；剩下的槽位空着。只用 $\le t$ 的帧，所以记忆从不依赖未来；
- **预算**：每帧 $K = 77$ 个原生 token（$7 \times 11$ 网格），最多 $B _ {\max} = 7$ 帧 → 539 个记忆 token + 最多 14 个物体 token；token 有缓存，重复选同一帧不花钱。

### 4. 动作专家里的记忆交叉注意力

- **记忆 token**：每个原生 token $f_i \in \mathbb R^{2048}$ 拼上帧号 $\tau_i$ 与网格位置 $p_i$ 的正弦编码，投到动作专家的 1536 维：$m_i = W_m[f_i;\ \mathrm{SiLU}(W_p\phi(\tau_i, p_i))]$——选出来的帧间隔不规则，所以必须显式编码时间；每次策略调用算一次，所有块和流匹配步共享；
- **读取 + 调制**：6 个 DiT 块里，联合注意力之后，30 个动作 token 用 RMS 归一化后的形式查询记忆（多查询注意力：6 个 256 维查询头共用一组键值），读出 $\mathbf c_j$ 不进残差流，而是经 $W_F$ 变成 $[\gamma_j, \beta_j]$ 做 FiLM：$\tilde{\mathbf A}_j = \bar{\mathbf A}_j \odot (1 + \gamma_j) + \beta_j$。$W_F$ 初始化接近 0（标准差 0.002），开训时策略与预训练的一模一样；
- **物体 token**：每个记忆帧最多两个跟踪物体，用 SAM3 掩码对每格的覆盖率加权平均原生 token，再加帧号与掩码质心编码、框、面积、可见性和槽位嵌入；第二个交叉注意力（可学门控 $g$ 初值 1、输出投影零初始化）把读出加到 $\mathbf c_j$ 上；
- **决策头**：一个可学查询在记忆 token、物体 token 和一个空 token 上做注意力，MLP 给每个候选答案一个 logit，从决策步起用交叉熵监督；其 softmax 权重 $w$ 经零初始化映射注入每个块的自适应层归一化；
- **垫子 token**：当前帧可见的每块垫子一个 token（SAM3 框内池化 + 框几何 + 编号），交叉注意力给垫子 $k$ 的分数加 $\log w_k$，把被选中的垫子交给动作 token；只有最大权重与可见垫子上的权重都到 0.6 时才启用。

### 5. 训练

$\mathcal L = \mathbb E\,\lVert v_\theta(\mathbf a_t^\sigma, \sigma) - (\varepsilon - \mathbf a_t)\rVert^2 + 0.5\,\mathcal L _ {\mathrm{CE}}$，$\mathbf a_t^\sigma = (1-\sigma)\mathbf a_t + \sigma\varepsilon$。每任务从预训练基础策略单独微调：AdamW、学习率 $10^{-4}$ 余弦衰减、1k 步预热、bf16、全局 batch 128、40k 步。真机动作空间不同（SONIC 的 64 维运动 token + 14 维手部目标），每任务只用 15 条遥操作示范，动作专家的 Transformer 块从后训练的权重初始化，记忆模块从零训，部署 5k 步的检查点。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph IN["📷 输入（每个动作块一次）"]
        I["头部相机 I_t<br/>仿真 640×360 @ 50 Hz / 真机 D435 @ 30 Hz"]
        S["本体状态 s_t"]
        L["指令 ℓ"]
    end

    subgraph MEM["🧠 物体引导的记忆选择（因果）"]
        T1["冻结 SAM3：按任务短语提示跟踪物体<br/>掩码 / 框 / 置信度"]
        T2["相似变换扣除相机自身运动"]
        T3["物体事件：出现 · 消失 · 重现<br/>移动 > 对角线 3% · 掩码重叠 < 65%"]
        T4["算法 1：首 / 中 / 当前帧必留<br/>+ 最多 4 帧高分事件帧（±5 帧去重）"]
        T5["记忆 M_t：3–7 帧 × 77 原生 token<br/>+ 正弦编码（帧号、网格）"]
        T6["物体 token O_t：掩码加权池化<br/>+ 质心 / 框 / 面积 / 可见性（≤ 14 个）"]
        T1 --> T2 --> T3 --> T4 --> T5
        T1 --> T6
    end

    subgraph VLA["🤖 全身 VLA（Ψ0 式）"]
        B["Qwen3-VL-2B 骨干（冻结）"]
        subgraph DIT["流匹配动作专家：6 个 DiT 块"]
            J["联合注意力（预训练，不改）"]
            X["记忆交叉注意力：30 个动作 token 查询 M_t<br/>+ 物体交叉注意力（门控 g）"]
            F["FiLM：A·(1+γ)+β<br/>W_F 近零初始化"]
            J --> X --> F
        end
        D["决策头：候选垫子 logit → 权重 w<br/>交叉熵 λ = 0.5"]
        P["垫子 token：分数 + log w_k<br/>（w ≥ 0.6 才启用）"]
        B --> J
        D --> F
        D --> P --> X
    end

    subgraph EXE["🦿 执行"]
        A["30 步动作块：上身关节 + 下身命令<br/>真机执行前 24 步（实时分块）"]
        C["全身控制器：AMO / SIMPLE 解耦 WBC / SONIC"]
        R["Unitree G1 + Dex3"]
        A --> C --> R
    end

    I --> T1
    I --> B
    L --> B
    S --> J
    T5 --> X
    T6 --> X
    T5 --> D
    T6 --> D
    F --> A
    R -.转身 / 走路改变视野.-> I
</div>

---

## 🚶 具体实例

**① token 预算与自适应省下多少**（论文数字）：满预算 $7 \times 77 = 539$ 个记忆 token；自适应平均 5.4 帧 → $5.4 \times 77 \approx 416$ 个，少了 $1 - 5.4/7 = 22.9\%$，与论文「少 22.9% 的 token、成功率不降」一致（70.4% → 72.6%，反而略升）。

**② 消融里的 28.2 个百分点从哪来**（表 IV，从 Uniform memory 逐项加回）：

| 加上 | 成功率 | 增量 |
|---|---|---|
| Uniform memory（7 帧等间隔，无物体 token / 决策头） | 44.4% | — |
| 改按物体事件选关键帧 | 60.4% | **+16.0** |
| 加物体 token | 65.7% | +5.3 |
| 加决策头 | 70.4% | +4.7 |
| 加自适应预算（完整方法） | 72.6% | +2.2 |

决策头用到了答案标签，但只占约 1/6 的提升，大头是「选对帧」。反过来，把记忆 token 直接塞进冻结 VLM 的输入当上下文，成功率只有 25.9%，比无记忆的 $\Psi_0$（29.1%）还低——记忆必须走动作专家的交叉注意力。

**③ 算法 1 的一次选择**（自设的玩具时间线，不是论文数据）：$t = 100$，BlinkPad 里垫子 B 在第 20 帧亮起（出现事件，置信度 0.9）、第 22 帧仍在变化（同一物体）、第 30 帧熄灭（消失，记最后可见帧 29）；被搬运的盒子在第 60 帧移动了对角线的 4%。

1. 必留：`uniform([0,100], 3)` = 第 0、50、100 帧；
2. 按分数：消失事件优先 → 第 29 帧（垫子 B 在已选帧 ±5 内没有帧）**加入**；出现事件第 20 帧（离 29 有 9 帧 > 5）**加入**；第 22 帧（离 20 只有 2 帧）**跳过**；第 60 帧盒子移动（离 50 有 10 帧）**加入**；
3. 结果 6 帧 = 462 个记忆 token。等间隔 7 帧会取 0、17、33、50、67、83、100——第 20–29 帧这段闪烁一帧都没选到，这就是 Uniform memory 在 BlinkPad 上决策正确率只有 37%（随机 33%）的原因。

**④ 真机上 SAM3 多久跟一次**：实时分块每次执行 30 步预测中的前 24 步，SAM3 每个执行完的块跟踪一帧，即每 24 个相机帧一次；D435 是 30 Hz，所以约 $30/24 = 1.25$ Hz。

---

## 📊 实验与结果

**Q1：加记忆会不会伤反应式技能？（14 个 SIMPLE 任务，表 I）** 每任务 L0 / L1 / L2 各 10 回合：WholeBodyMem（此处用固定 7 帧、不用自适应）**365/420 = 86.9%**，Uniform memory 76.9%，$\Psi_0$ 70.2%，$\pi _ {0.5}$ 49.0%，ACT 41.9%，EgoVLA 40.2%，GR00T 37.9%，DP 32.4%，InternVLA-M1 21.2%。每个任务都追平或超过最好基线；比 Uniform memory 多出的 42 次成功里，T6（桌间走动拾取，21 vs 13）和 T8（开水龙头，20 vs 11）占 17 次——头部相机在走、弯腰时会丢目标，过去帧补上了。

**Q2：六个记忆任务（表 III，每级 30 回合）**

| 方法 | 平均成功（L0 / L1 / L2） | 成功率 | 记忆决策正确率 |
|---|---|---|---|
| 随机 | — | — | 36% |
| $\Psi_0$（无记忆） | 8.3 / 10.0 / 7.8 | 29.1% | 39% |
| Uniform memory | 12.0 / 14.3 / 13.7 | 44.4% | 50% |
| **WholeBodyMem** | **23.0 / 21.5 / 20.8** | **72.6%** | **94%** |

无记忆策略基本在随机水平；Uniform memory 只在 FlashPad（82%）、HideMug（57%）明显高于随机——等间隔帧会漏掉短暂线索；WholeBodyMem 各任务 84–100%，三个随机化等级上都稳定。

**Q4：真机 G1（表 V，每任务每策略 10 次）**：垃圾袋（S）9/10 vs 4/10，记住薯片（O）10 vs 3，咖啡馆 A（T）9 vs 4，咖啡馆 B（O+S）9 vs 3，咖啡馆 C（O+S+T）8 vs 3，薯片推车（P，记任务进度）8 vs 5；合计 **53/60（88.3%）vs 22/60（36.7%）**。真机任务里机器人要转身去另一张桌子拿东西再回来，线索是**被自己的运动甩出视野**的。

---

## 💡 核心贡献

1. **WholeBodyMem**：以物体事件（而非等间隔采样）挑自适应预算内的关键帧，连同物体 token 由动作专家交叉注意力 + FiLM 读取，零初始化保证从预训练策略平滑起步；
2. **HuMeGo**：首个依赖记忆的人形移动操作基准，6 个仿真任务覆盖物体 / 空间 / 时间记忆，决策正确率与操作成功分开打分；6 个真机任务额外引入运动导致的线索丢失；
3. **结论**：提升来自「选对帧」而不是「容量」——同样 539 个 token 预算，事件选帧单项就 +16 个百分点；且记忆在不需要记忆的 SIMPLE 任务上也有帮助。

---

## 🤖 对人形机器人的启示

- 人形的头部相机是移动的，「看不见」常常是自己造成的；给全身 VLA 加记忆时，相机自运动补偿是事件检测成立的前提；
- 记忆读入的位置很关键：塞进冻结 VLM 上下文反而比没记忆差，走动作专家的交叉注意力 + 零初始化 FiLM 才既不破坏预训练能力又能学到；
- 用现成的开放词汇分割模型（SAM3）当「注意什么」的先验，比从示范里学事件更省数据——真机每任务只有 15 条示范也能学会。

---

## ⚠️ 局限与可改进点

- **依赖 SAM3 检测**：线索物体如果从没被检测到就记不住；提示词需要每任务人写（这里由大模型写好后固定）；
- **在线跟踪有推理开销**，真机上只能约 1.25 Hz 跟一帧，更短的线索可能漏掉；
- **每任务单独微调**，且决策头、垫子 token 都假设答案是有限个候选位置，泛化到开放式记忆问题还没验证；
- 仿真示范是脚本生成的，渲染存在 sim-to-real 差距；未开源代码与基准，结果暂时无法复现。

---

## 🎤 面试参考

1. **为什么不直接把所有历史帧喂进去？** 代价随长度线性甚至平方增长，而且短暂线索（不到画面 1%、只持续 0.2 s）在大量无关帧里被稀释；论文的消融说明在同样预算下「选对帧」比「多放帧」重要。
2. **为什么用原生 token 不用池化摘要？** 决策可能取决于画面里很小的一块（某个垫子闪了一下），池化会把它抹平；代价是预算只够 7 帧，所以选帧必须准。
3. **为什么 FiLM 的 $W_F$ 要近零初始化？** 让加了记忆的策略在训练开始时与预训练策略完全一致，不破坏已有的全身技能，记忆分支再慢慢学会起作用。
4. **因果选择为什么重要？** 部署时只有过去帧，若训练时用了未来信息选帧，训练与部署分布就不一致；算法 1 只用 $\le t$ 的帧。
5. **记忆决策正确率为什么要和成功率分开？** 成功还受抓取、行走等操作能力影响；分开打分才能区分「记错了」和「记对了但没放好」。

---

## 🔗 相关阅读

- [SIMPLE](../../11_Simulation_Benchmark/SIMPLE__Simulation-Based_Policy_Learning_and_Evaluation_for_Humanoid_Loco-manipulation/SIMPLE__Simulation-Based_Policy_Learning_and_Evaluation_for_Humanoid_Loco-manipulation.html)：本文的仿真平台与 14 个标准任务
- [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)：真机上执行 64 维运动 token 的全身控制器，也用于遥操作采集
- [GR00T N1](../../03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.html)、[π₀.₅](../../03_High_Impact_Selection/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.html)：对比的无记忆 VLA 基线
- [Ψ₀](../Ψ₀__An_Open_Foundation_Model_Towards_Universal_Humanoid_Loco-Manipulation/Ψ₀__An_Open_Foundation_Model_Towards_Universal_Humanoid_Loco-Manipulation.html)：本文的无记忆基础策略（VLM 骨干 + 流匹配动作专家）
- RoboMME（ICML 2026）：桌面机械臂记忆基准，本文 Uniform memory 基线（FrameSamp + Modul）的来源
- SAM 3：[Segment Anything with Concepts](https://arxiv.org/abs/2511.16719)
