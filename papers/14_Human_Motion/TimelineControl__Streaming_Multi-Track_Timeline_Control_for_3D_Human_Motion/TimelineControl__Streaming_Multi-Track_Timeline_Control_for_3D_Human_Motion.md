---
layout: paper
title: "Streaming Multi-Track Timeline Control for 3D Human Motion Generation"
zhname: "TimelineControl：流式多轨时间线控制的三维人体动作生成"
category: "Human Motion"
arxiv: "2610.03873"
---

# Streaming Multi-Track Timeline Control for 3D Human Motion Generation
**指令边生成边到达、各有自己的起止时间、还能相互重叠（边走路边接电话）：TimelineControl 在 ActionPlan 的流式整流流生成器上，用「区间编码 + 可见性掩码 + sigmoid 多轨注意力」让每条指令只作用在自己的时间段，再用六个身体部位的因果潜变量和文本分类器给出的部位偏置，把重叠指令分到不同肢体上**

> 📅 阅读日期: 2026-10-17
>
> 🏷️ 板块: 14 Human Motion · 文本到动作生成 · 流式生成 · 多轨时间线 · 部位感知去噪
>
> 🔁 推进轨: 模块轮转（13_Physics-Based_Animation → **14_Human_Motion**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.03873](https://arxiv.org/abs/2610.03873) |
| HTML | [在线阅读](https://arxiv.org/html/2610.03873v1) |
| PDF | [下载](https://arxiv.org/pdf/2610.03873) |
| 项目页 | [mael-zys.github.io/TimelineControl](https://mael-zys.github.io/TimelineControl/) |
| 源码 | [Mael-zys/TimelineControl](https://github.com/Mael-zys/TimelineControl)（截至 2026-10-17 仓库只有 README：预训练模型、在线 Demo、TimelineMotion 数据集、训练评测代码四项都标着 Coming soon，故本笔记**没有源码运行时序图**） |
| **发布时间** | 2026-10-02（arXiv v1） |

**作者**：Yangsong Zhang、Anujith Muraleedharan、Rikhat Akizhanov、Gül Varol、Fabio Pizzati、Ivan Laptev（MBZUAI · École des Ponts / LIGM）。

**定位**：把 STMC 的「多轨时间线」（每条文本有自己的区间、可以重叠、可以指定身体部位）和 ActionPlan / [ARDY](../ARDY__Autoregressive_Diffusion_with_Hybrid_Representation_for_Interactive_Human_Motion/ARDY__Autoregressive_Diffusion_with_Hybrid_Representation_for_Interactive_Human_Motion.html) 的「流式生成」（指令随时到达）合成一个问题，生成的动作最后交给 [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html) 在 G1 真机上跟踪执行。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| OMPC | Online Multi-Prompt Conditioning | 本文的在线多指令条件：每条指令单独编码，按区间决定作用范围 |
| RoPE / RoTE | Rotary Position / Interval Encoding | 旋转位置编码给动作帧，旋转区间编码（取自 TIE）按指令的中点与时长编码文本 |
| STMC | Spatio-Temporal Motion Collage | 离线多轨时间线方法：给定完整时间线，按部位拼接各轨去噪结果 |
| MTT | Multi-Track Timeline benchmark | STMC 提出的多轨时间线测试集（只有测试集） |
| TAE | Temporal AutoEncoder | MotionStreamer 的因果时序自编码器 |
| AP / AUC | Average Precision / Area Under Curve | 本文的「时间遵从」指标：指令区间内的滑窗是否比区间外更像这条指令 |

---

## 🎯 一句话总结

以前的方法只能二选一：**流式**方法（MotionStreamer、ActionPlan、ARDY、DartControl）能随时换文本，但同一时刻只有一句话，两条重叠指令只能拼成 "A while B"；**多轨时间线**方法（STMC、FrankenMotion）能处理重叠、按部位分工，但要求开始前就拿到整条时间线。TimelineControl 让每条指令 $e_i = (\ell_i, [s_i, u_i))$ 在起始时刻到达、单独用 CLIP 编码，用可见性掩码 $M$ 只让它影响自己区间内的帧，用 sigmoid 注意力加 $\sqrt{\max(1, c)}$ 归一化把同时生效的几条指令叠起来；动作潜空间按躯干、头、双臂、双腿拆成六个部位，文本分类器估计「这句话主要动哪个部位」后转成注意力偏置 $B$，再经门控融合回全身分支保证协调。训练数据 TimelineMotion（44,944 条）由 HumanML3D 经 STMC 拼接并修补接缝得到。在 TimelineMotion 上 R@3 0.603（重训的 ActionPlan\* 0.502）、FID 0.017（离线 STMC 0.055）。

---

## ❓ 要解决什么问题？

游戏角色或机器人在交互中会遇到这种情况：正在往前走，电话响了，要「右手接电话」但**腿继续走**；接完电话后手放下，走路也没被打断。这里有三件事同时成立：

1. **看不到未来**：下一条指令什么时候来、说什么，生成时都不知道；
2. **各自计时**：每条指令有自己的起止，它们可以部分重叠；
3. **按部位协调**：重叠的指令往往动的是不同肢体，但整体还得是一个连贯的人。

把重叠指令用 "while" 拼成一句话交给单文本模型，模型分不清哪句管哪段、哪句管哪只手（论文图 3：ActionPlan\* 直接忽略了「举左手」，STMC 把「左转」做成了右转）。

---

## 🔧 方法

### 0. 底座：流式整流流（沿用 ActionPlan）

潜变量序列 $z = (z_1, \dots, z_N)$，训练目标是整流流的速度回归 $z^t = (1-t)z^0 + t\epsilon$，$v^\star = \epsilon - z^0$，用 Diffusion Forcing 给每个潜变量独立的噪声级。推理时窗口里前面的潜变量是已输出、固定不动的历史，只对后面的续写去噪；**新指令到达就更新条件集合 $C_\tau$，重新生成当前窗口的续写**，已经输出的动作不改。窗口最多 78 个待预测潜变量加 8 个干净历史，潜变量速率 7.5 fps（一个潜变量 4 帧，约 10.4 s 一窗）。RTX 6000 Ada 上首个 token 280 ms，之后每个 35 ms。ActionPlan 的「帧级动作计划」分支原样保留。

### 1. 因果部位结构自编码器

- 每个潜变量 $z_n = [r_n; b^1_n; \dots; b^6_n] \in \mathbb{R}^{68}$：根轨迹 $r_n \in \mathbb{R}^{20}$（4 帧 × 三维位置 + 朝向的 sin / cos）**不进编码器**、保持显式以便做路径控制（同 ARDY），六个部位各 8 维；
- 编解码器各三级因果时序卷积（4 倍压缩），级内用**骨架图消息传递**把躯干连到头和四肢（取自 SALAD），各部位不合并；
- 损失 = 重建（高斯 NLL）+ KL + 加速度（抑制抖动），训练完冻结。

### 2. 在线多指令条件（OMPC）

1. 每条已到达的指令单独过冻结 CLIP，得到 $H = [h_1; \dots; h_J]$；
2. 动作帧做 query 加 RoPE，指令做 key 加 RoTE（按区间中点与时长），得到打分 $W \in \mathbb{R}^{N \times J}$；
3. 可见性掩码 $M _ {ni} = 1$ 当且仅当 $s_i \le n < u_i$，于是

$$A _ {\text{multitrack}} = \frac{M \odot \sigma(W + B)}{\sqrt{\max(1, c)}},\qquad c_n = \textstyle\sum_i M _ {ni}$$

用 sigmoid 而不是 softmax：softmax 会让几条指令互相抢权重，sigmoid 保留每条指令自己的强度，再按同时生效的条数做 $\sqrt{\cdot}$ 归一化，防止重叠时文本贡献过大。

### 3. 部位感知去噪

- **两条流**：六个部位（加根）各自一份特征 $f^k_n$，另有全身特征 $g_n = \text{MLP}([f^0_n; \dots; f^6_n])$；
- **块因果自注意力**（只在训练时）：指令在 $\tau$ 到达时划出一个生成块，块内双向、对之前的动作可见、对之后不可见，模拟「指令到了才开始规划这一段」；
- **部位偏置**：与去噪器一起训一个文本分类器，用 Qwen3-8B 标注的部位标签监督，输出 $\Pi \in [0,1]^{J \times 6}$；部位 $k$ 的偏置 $B^k _ {ni} = \lambda_r(\Pi _ {ik} - \bar\Pi_i)$，$\lambda_r = 0.25$，梯度在分类器处截断，根的偏置为 0；
- **门控融合**：$g_n \leftarrow g_n + \alpha_n \text{Attn}(g_n, \{f'^k_n\})$，全身流再过四层 Transformer（全身流的文本注意力不加偏置、按行求和归一化），输出头预测速度。

### 4. 训练数据 TimelineMotion

MTT 只有测试集，所以自己造：用 Qwen3-8B 给 HumanML3D 描述标注「动了哪些部位、什么属性」→ 按部位兼容性组合成多轨标签（同一只手不能同时拍手又指东西）→ 非重叠段直接取源动作，重叠段用 STMC 按部位拼接 → 阈值检测关节位置 / 旋转的跳变并插值平滑（类似 InterPose）→ 丢掉仍有突变或抖动过大的序列，最后 44,944 条。训练时与 HumanML3D 混合。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph IN["⏱️ 流式多轨时间线"]
        I1["指令 e_i = 文本 + 区间 [s_i, u_i)<br/>在 s_i 时刻才到达"]
        I2["可重叠：走路 + 右手接电话"]
    end

    subgraph DATA["📦 训练数据 TimelineMotion（44,944 条）"]
        D1["HumanML3D 描述<br/>Qwen3-8B 标部位"] --> D2["按部位兼容性<br/>组合多轨标签"]
        D2 --> D3["STMC 拼接重叠段"] --> D4["跳变检测 + 插值平滑<br/>过滤抖动序列"]
    end

    subgraph AE["🦴 因果部位结构自编码器（冻结）"]
        E1["根轨迹 r ∈ R²⁰ 显式保留"]
        E2["六部位 × 8 维潜变量<br/>因果时序卷积 + 骨架图消息传递"]
    end

    subgraph GEN["🌊 TimelineControl 去噪器（整流流 + Diffusion Forcing）"]
        G1["CLIP 单独编码每条指令<br/>RoPE（帧）× RoTE（区间）"]
        G2["可见性掩码 M<br/>sigmoid 多轨注意力 / √max(1,c)"]
        G3["文本分类器 → 部位概率 Π<br/>部位偏置 B = 0.25(Π − 均值)"]
        G4["部位流：块因果自注意力"]
        G5["门控融合 → 全身流四层 Transformer"]
        G6["速度头 v_θ"]
        G1 --> G2
        G3 --> G2
        G2 --> G4 --> G5 --> G6
    end

    subgraph RUN["▶️ 流式推理"]
        R1["窗口：8 个历史潜变量（固定）<br/>+ 最多 78 个续写"]
        R2["新指令到达 → 更新 C_τ<br/>只重生成续写"]
        R3["解码成动作 30 fps<br/>首 token 280 ms，之后 35 ms/个"]
        R1 --> R2 --> R3
    end

    subgraph OUT["🤖 应用"]
        O1["文本 + 根路径 / 朝向 / 手腕 / 关键帧控制"]
        O2["SONIC 跟踪器 → G1 真机实时执行"]
    end

    IN --> GEN
    DATA --> GEN
    AE --> GEN
    GEN --> RUN --> OUT
</div>

---

## 🚶 具体实例：重叠时右臂听谁的？

设第 $n$ 个潜变量处两条指令同时生效：$e_1$「往前走」、$e_2$「右手接电话」，$c_n = 2$。看**右臂**这一路的注意力（数字是假设的，只为演示式 5 和部位偏置）：

| | 走路 $e_1$ | 接电话 $e_2$ |
|---|---|---|
| 打分 $W _ {ni}$（假设） | 0.2 | 0.4 |
| 分类器 $\Pi$（躯干、头、左臂、右臂、左腿、右腿） | 0.6, 0.1, 0.2, 0.2, 0.95, 0.95（均值 0.5） | 0.1, 0.3, 0.05, 0.95, 0.05, 0.05（均值 0.25） |
| 右臂偏置 $B = 0.25(\Pi _ {\text{右臂}} - \bar\Pi)$ | $0.25 \times (0.2 - 0.5) = -0.075$ | $0.25 \times (0.95 - 0.25) = 0.175$ |
| 不加偏置 $\sigma(W)/\sqrt 2$ | $0.5498 / 1.4142 = 0.389$ | $0.5987 / 1.4142 = 0.423$ |
| 加偏置 $\sigma(W + B)/\sqrt 2$ | $\sigma(0.125)/\sqrt 2 = 0.376$ | $\sigma(0.575)/\sqrt 2 = 0.453$ |

加了偏置后，右臂上「接电话 : 走路」的权重比从 $0.423/0.389 = 1.09$ 拉到 $0.453/0.376 = 1.20$；同样的偏置在**腿**上方向相反，腿更多听「走路」。而在 $e_2$ 到达之前的帧，$M$ 把 $e_2$ 那一列清零、$c_n = 1$，右臂只看到走路：$\sigma(0.125) = 0.531$。sigmoid 的好处也在这里：两列各自独立，不会因为多了一条指令就把另一条的权重「挤掉」一半。

---

## 📊 实验与结果

**表 1（流式指令，节选）**：

| 方法 | 流式 | TM R@3 ↑ | TM FID ↓ | TM AP ↑ | MTT R@3 ↑ | MTT AUC ↑ |
|---|:---:|---|---|---|---|---|
| STMC（离线、拿完整时间线） | ✗ | 0.525 | 0.055 | 0.803 | 0.566 | 0.729 |
| ActionPlan | ✓ | 0.405 | 0.274 | 0.733 | 0.514 | 0.716 |
| ActionPlan\*（同数据重训） | ✓ | 0.502 | 0.055 | 0.784 | 0.574 | 0.742 |
| DartControl\* | ✓ | 0.454 | 0.244 | 0.793 | 0.543 | 0.764 |
| ARDY | ✓ | 0.303 | 0.340 | 0.697 | 0.369 | 0.621 |
| **TimelineControl** | ✓ | **0.603** | **0.017** | **0.832** | **0.628** | **0.777** |

- 连用来造训练数据的离线 STMC 都被超过（FID 0.055 → 0.017），说明不是在复现拼接程序；
- 衔接距离 Trans 是弱项：TimelineMotion 上 1.31 cm，比 ActionPlan\* / STMC 的 0.92 cm 大；
- **单文本 HumanML3D**（表 2）：R@3 0.874（ActionPlan\* 0.830），FID 0.027（第二，ActionPlan 0.022），多轨能力没有牺牲单文本生成；
- **用户研究**：文本一致性上对 STMC 胜率 66.2%、对 ActionPlan\* 72.1%；
- **自编码器**（表 3）：同样 48 维，部位结构 AE 把 TimelineMotion 生成 FID 从 TAE 的 0.040 降到 0.017，去掉骨架图后重建 MPJPE 从 3.09 涨到 7.46 mm；
- **消融**（表 4，TimelineMotion）：只用 RoTE、不加掩码 R@3 0.586；去掉 RoTE 0.572；去掉部位偏置 0.591；去掉部位分支（只用全身流）FID 0.017 → 0.030。

---

## 💡 核心贡献

1. 提出**流式多轨时间线控制**这个设定：指令按时到达、各自计时、可以重叠；
2. **在线多指令条件**：单独编码 + RoTE + 可见性掩码 + sigmoid 归一化，替代把重叠指令拼成一句话；
3. **部位感知去噪**：六部位因果潜空间 + 分类器部位偏置 + 门控融合全身流；
4. 构造 **TimelineMotion** 数据集（带重叠区间与部位标签），并给出时间遵从指标 AP / AUC。

---

## 🤖 对人形机器人的启示

- 这是「语言 → 运动学参考 → 通用跟踪器」管线里**上游生成器**的一环：生成器能边执行边插入新指令，下游的 SONIC 不用改就能在 G1 上实时跟（附录 F：握手、指方向、挥手告别叠在走路和转弯上）；
- 根轨迹保持显式，路径 / 朝向控制和文本控制可以同时用，对导航中的人形更实用；
- 生成器本身不管物理，真机可行性全靠跟踪器兜底；和 RLPF、DIGHT 那条「物理反馈后训练生成器」的路线可以互补。

---

## ⚠️ 局限与可改进点

- **数据是拼出来的**：TimelineMotion 由 HumanML3D 片段按部位拼接，不是真实采集的「边走边接电话」，自然共现动作的多样性有限；
- **区间要显式给**：不知道结束时间时只能按固定时长（如 5 s）续期，模型不会从语言或动作状态推断动作该何时结束；
- **部位标签靠 LLM**：六个固定部位 + 自动标注，跨部位的复杂动作（双手抱物同时转身）会受限；
- 不支持撤回、修改已下达的指令，也不处理冲突指令（作者列为未来工作）；
- 衔接距离 Trans 比 STMC / ActionPlan\* 略大；代码、数据、模型截至本笔记都未放出。

---

## 🎤 面试参考

1. **为什么多指令注意力用 sigmoid 而不是 softmax？** softmax 在指令维上归一，多一条指令就会稀释其他指令的权重，且即使都不相关也必须分出总和 1；sigmoid 每条独立打分，再用 $\sqrt{\max(1,c)}$ 控制叠加后的总量。
2. **可见性掩码 $M$ 和 RoTE 的分工？** RoTE 只是给打分加了时间相关的偏好，不能保证区间外为零；$M$ 是硬约束。消融里只留 RoTE（R@3 0.586）和去掉 RoTE（0.572）都比完整模型差。
3. **新指令到达时会不会改已经输出的动作？** 不会。已输出的潜变量是窗口里的固定历史，只对续写部分重新去噪。
4. **为什么根轨迹不进自编码器？** 保持全局位置和朝向显式，才能直接施加路径、航向这类空间约束（ARDY 的做法）。

---

## 🔗 相关阅读

- [ARDY](../ARDY__Autoregressive_Diffusion_with_Hybrid_Representation_for_Interactive_Human_Motion/ARDY__Autoregressive_Diffusion_with_Hybrid_Representation_for_Interactive_Human_Motion.html)：显式根轨迹 + 身体潜变量的在线文本 / 空间控制，本文的基线之一
- [HumanML3D](../HumanML3D/HumanML3D.html)：TimelineMotion 的源数据与单文本评测基准
- [Kimodo](../Kimodo__Scaling_Controllable_Human_Motion_Generation/Kimodo__Scaling_Controllable_Human_Motion_Generation.html)：可控人体动作生成的规模化路线
- [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)：本文真机执行用的通用动作跟踪器
- STMC：[Multi-Track Timeline Control for Text-Driven 3D Human Motion Generation](https://mathis.petrovich.fr/stmc/)（CVPRW 2024）
- ActionPlan：[Future-aware Streaming Motion Synthesis via Frame-level Action Planning](https://coral79.github.io/ActionPlan/)（本文骨干）
