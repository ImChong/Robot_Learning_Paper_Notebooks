---
layout: paper
title: "π0: A Vision-Language-Action Flow Model for General Robot Control"
category: "高影响力精选 High Impact Selection"
subcategory: "Sim-to-Real & Foundation Model"
zhname: "π₀：面向通用机器人控制的视觉-语言-动作流模型"
demos: ["pi0"]
---

# π0: A Vision-Language-Action Flow Model for General Robot Control
**π₀：面向通用机器人控制的视觉-语言-动作流模型**

> 📅 阅读日期: 2026-09-30
>
> 🏷️ 板块: 03_High_Impact_Selection / Sim-to-Real & Foundation Model（H25）
>
> 🧭 状态: 已对照 [arXiv:2410.24164v4](https://arxiv.org/abs/2410.24164) 正文、附录 B–E 与官方开源 [Physical-Intelligence/openpi](https://github.com/Physical-Intelligence/openpi)（`main` 分支，commit `215abfb`）。论文的流匹配时间 $\tau$ 与 openpi 代码方向相反，代码注释里作者自己道了歉；附录 B 写的「num heads=18」与代码里的 8 头不一致，下文逐处注明。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2410.24164](https://arxiv.org/abs/2410.24164) |
| **PDF** | [arxiv.org/pdf/2410.24164](https://arxiv.org/pdf/2410.24164) |
| **发布时间** | 2024年10月31日（arXiv v1） |
| **作者** | Kevin Black, Noah Brown, Danny Driess, …, Chelsea Finn, Karol Hausman, Brian Ichter, Sergey Levine, Karl Pertsch, Quan Vuong 等 24 人 |
| **机构** | Physical Intelligence（San Francisco） |
| **项目页** | [physicalintelligence.company/blog/pi0](https://physicalintelligence.company/blog/pi0) |
| **官方代码** | [Physical-Intelligence/openpi](https://github.com/Physical-Intelligence/openpi)（JAX + PyTorch，含 π₀ / π₀-FAST / π₀.₅ 权重） |
| **模型规模** | 3.3B（PaliGemma 约 3B + 动作专家约 300M） |
| **机器人** | UR5e、双臂 UR5e、Franka、双臂 Trossen、双臂 ARX / AgileX、移动 Trossen / ARX、移动 Fibocom（7 种构型） |

---

## 🎯 一句话总结

π₀ 是一个视觉-语言-动作模型：图像和语言走从 PaliGemma 继承来的大权重，机器人状态和动作走一套新加的小权重（「动作专家」），两者在同一个 Transformer 的自注意力里交互；动作不再是一个个离散 token，而是用**流匹配**从噪声一次积分出 50 步的连续动作块，最高支持 50 Hz 控制。训练仿照大语言模型：先在约 1 万小时、68 个任务的混合数据上预训练，再用 5 到 100 多小时的高质量数据做任务后训练。论文的强项是**长程灵巧操作**（叠衣服、收桌子、折纸箱），不是行走，也不是开放环境泛化——后者是 [π₀.₅](../Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.html) 要做的事。

> 🎮 **本文内嵌 1 段讲解动画 + 1 段配音视频**（不用装任何东西）：
> 1. [七幕动画：π₀ 全流程](#pi0-explainer-anim) —— 约 88 秒串完「通才策略的三道坎 → 一个 Transformer 两套权重 → 分块因果掩码与 KV 缓存 → 流匹配从噪声走到动作块 → 动作块与推理预算 → 数据与配方 → 实验读数与边界」
> 2. [配音讲解视频](#pi0-video) —— 同样七幕，加中文配音与字幕，6 分 14 秒竖屏，可下载

> 🚶 [具体实例](#实例-环境设定)用 openpi 的 `pi0_aloha_towel` 配置把一次推理从 3 路图像数到 816 个前缀 token、51 个后缀 token，再手算掩码、流匹配十步积分、Beta 时间采样和 $n^{0.43}$ 加权；[源码对照](#源码-类图)逐段对照 openpi 的 `pi0.py` / `gemma.py`，列出代码与论文的四处差异。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 在这篇论文里指什么 |
|------|------|-------------------|
| **VLA** | Vision-Language-Action | 图像 + 语言进，动作出的模型；π₀ 本身 |
| **VLM** | Vision-Language Model | 这里是 PaliGemma（SigLIP 视觉编码器 + Gemma 2B 语言模型） |
| **MoE** | Mixture of Experts | 论文把「两套权重、按 token 类型路由」类比成只有两个专家的 MoE |
| **OXE** | Open X-Embodiment | 22 种机器人的开源数据集合；π₀ 用其子集 OXE Magic Soup |
| **ACT** | Action Chunking with Transformers | 动作块的来源工作之一，也是微调实验的对照 |
| **KV cache** | Key-Value 缓存 | 前缀只前向一次，积分时复用它的 K、V |

---

## 🎬 七幕动画：π₀ 全流程 {#pi0-explainer-anim}

<div class="paper-demo" data-demo="pi0-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#pi0-video}

<div class="paper-demo" data-demo="pi0-video" data-src="media/pi0_explainer_video.mp4" data-poster="media/pi0_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/pi0_explainer_video.mp4" download="pi0_讲解视频.mp4">下载 mp4（8.2 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：问题、两套权重、掩码、流匹配、数据配方、推理和实验按小节收起，具体实例、源码对照、面试和附录各收成一块。想细读哪一块就点开，内容一字未删；两张流程图留在外面。目录里的标题可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」。

---

## ❓ 论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：规模、架构、配方三道坎；自回归离散动作做不了高频动作块</summary>

引言的出发点是：语言和视觉里，**在多样数据上预训练的通用模型**往往比专门模型更好；机器人也许同理——先在大量不同任务、不同机器人的数据上预训练，再为具体任务微调或提示。这样可以借到别的任务、别的机器人甚至非机器人数据来缓解数据稀缺，也让模型见过更多纠错与恢复动作。

作者把「机器人基础模型」难做的原因归成三条（§I）：

1. **必须足够大规模。** 大规模预训练的好处在小规模上往往看不出来。
2. **要有合适的架构。** 既能吃下异构数据，又能表达接触丰富场景里细腻的连续动作。
3. **要有合适的训练配方。** 作者认为这是**最重要**的一条：大模型的进展很大程度来自对预训练 / 后训练数据的精细取舍。

架构上的具体痛点是：之前的 VLA（RT-2、OpenVLA 一类）把动作离散化成 token，**自回归**地一个个吐出来。这对高频、灵巧的连续控制不友好——OpenVLA 不支持动作块，在论文的开箱评测里表现很差（§VI-A）。π₀ 的回应是保留 VLM 主干，但换成**流匹配**输出连续的动作块，最高 50 Hz。

作者强调贡献是**集成性的**：架构、预训练 / 后训练配方和一整套真机实验放在一起，而不是某一个新组件。

</details>

---

## 🔧 方法详解

### 1. 一个 Transformer，两套权重

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：PaliGemma 主干 + 300M 动作专家、按 token 类型路由、只在自注意力里交互</summary>

模型要建的是条件分布 $p(A_t \mid o_t)$（§IV）：

- 动作块 $A_t = [a_t, a _ {t+1}, \dots, a _ {t+H-1}]$，论文所有任务 $H = 50$。
- 观测 $o_t = [I_t^1, \dots, I_t^n, \ell_t, q_t]$：每台机器人 2 或 3 路 RGB 图像、语言指令 token、关节角向量。
- 图像和状态各经编码器，再线性投影到和语言 token 相同的嵌入空间。

结构仿照 Transfusion：一个 Transformer，离散输出用交叉熵、连续输出用流匹配损失。π₀ 的改动是给**机器人专属的 token（状态、动作）单独一套权重**，作者发现这样更好。论文把它类比成只有两个元素的混合专家：第一个专家处理图像和文字，第二个处理状态和动作，后者叫**动作专家**。

附录 B 的具体配置：

| | VLM 主干 | 动作专家 |
|---|---|---|
| 初始化 | PaliGemma（Gemma 2B + SigLIP） | 从零 |
| 宽度 | 2048 | 1024 |
| MLP 维 | 16,384 | 4096 |
| 层数 | 18 | 18 |
| 注意力 | multi-query，kv 头 1，head dim 256 | 同左（必须一致） |
| 参数 | 约 3B | 约 300M |

两套权重**只在自注意力层交互**：每层里各自算自己的 Q、K、V，拼在一起做一次注意力，再各自过自己的输出投影和 MLP。所以宽度和 MLP 维可以不同，但头数、head dim、kv 头数必须相同。动作专家缩小到约 300M，是为了加速推理——每生成一块动作要前向它 10 次。合计 **3.3B**。

**时间步怎么进来**（附录 B）：每个带噪动作 $a^\tau _ {t'}$ 先线性投影，再和正弦编码 $\phi(\tau)$ 拼接，过一个两层 swish MLP：

$$
W_3 \cdot \mathrm{swish}\big(W_2 \cdot \mathrm{concat}(W_1 a^\tau_{t'},\ \phi(\tau))\big)
$$

$\phi$ 就是 [Transformer](../../01_Foundational_RL/Transformer_Attention_Is_All_You_Need/Transformer_Attention_Is_All_You_Need.html) 里的正弦位置编码函数，这里拿来编码标量 $\tau$。

**对照模型 π₀-small**（附录 C）：470M，不用 VLM 初始化，语言用 DistilBERT 编码，动作专家用 DiT 并以 AdaLN-Zero 注入 $\tau$，交叉注意力读观测（更像经典编码器—解码器）。它用来衡量 VLM 预训练的作用，但作者也承认参数量不同是一个无法去掉的混淆因素。

</details>

### 2. 分块因果掩码与 KV 缓存

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三块的注意力掩码为什么这样分、推理时为什么只重算 50 个 token</summary>

附录 B：π₀ 用**三块的分块因果掩码** $[I_t^1, \dots, I_t^n, \ell_t]$、$[q_t]$、$[a^\tau_t, \dots, a^\tau _ {t+H-1}]$。块内双向注意力，块间只能看前面的块。

| query 块 \ key 块 | 图像 + 文字 | 状态 | 动作 |
|---|---|---|---|
| 图像 + 文字 | ✅ | ❌ | ❌ |
| 状态 | ✅ | ✅ | ❌ |
| 动作 | ✅ | ✅ | ✅ |

每一格的理由：

- **图文块看不到后面**：这些是 PaliGemma 预训练见过的模态，挡住新输入可以减少和预训练之间的分布偏移。
- **状态单独一块、不看动作**：它在流匹配积分过程中不变，挡住动作后，它的 K、V 可以在采样时缓存。
- **动作块看全部**：50 个动作 token 互相可见（论文 §IV 写「动作专家用完整的双向注意力」），并且能读到全部观测。

推理（附录 D）：先把前缀跑一次、存下 KV 缓存；之后 10 步积分，每步**只对动作 token 做前向**。这就是 Table I 里「10 次动作前向只要 27 ms」的来源。

</details>

### 3. 流匹配：从噪声积分出动作块

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：线性高斯路径、速度目标 A−ε、10 步欧拉、偏向高噪声的 Beta 时间采样</summary>

训练用条件流匹配损失（§IV）：

$$
L^\tau(\theta) = \mathbb{E}_{p(A_t\mid o_t),\,q(A_t^\tau\mid A_t)}\big\lVert v_\theta(A_t^\tau, o_t) - u(A_t^\tau \mid A_t)\big\rVert^2
$$

路径取线性高斯（最优传输）路径 $q(A^\tau_t\mid A_t) = \mathcal{N}(\tau A_t, (1-\tau)I)$。实际做法：采 $\epsilon\sim\mathcal{N}(0,I)$，

$$
A_t^\tau = \tau A_t + (1-\tau)\,\epsilon,\qquad u(A_t^\tau\mid A_t) = A_t - \epsilon
$$

$\tau = 0$ 是纯噪声，$\tau = 1$ 是动作。推理从 $A^0_t\sim\mathcal{N}(0,I)$ 出发做前向欧拉：

$$
A_t^{\tau+\delta} = A_t^\tau + \delta\, v_\theta(A_t^\tau, o_t),\qquad \delta = 0.1\ \ (\text{10 步})
$$

**为什么时间采样要偏向高噪声**（附录 B）。原始流匹配用 $\tau\sim U(0,1)$；图像生成里 Esser 等人改用强调中间段的 logit-normal，理由是低噪声时只需学恒等映射、高噪声时只需学数据均值。π₀ 的作者认为动作预测不一样：观测 $o_t$ 对动作的约束远强于文字标签对图像的约束，所以「给定观测预测动作均值 $\mathbb{E}[A_t\mid o_t]$」本身就难，高噪声段更需要练。于是用

$$
p(\tau) = \mathrm{Beta}\!\left(\frac{s-\tau}{s};\ 1.5,\ 1\right),\qquad s = 0.999
$$

它在 $\tau = 0$ 附近密度最高，$\tau > s$ 的不采样——只要积分步长 $\delta > 1-s$ 就用不到那一段，$s = 0.999$ 最多允许 1000 步积分。

**为什么是流匹配而不是自回归 token。** 作者给的理由是精度高、能建模多峰分布，适合高频灵巧任务（§IV）；实验里自回归的 OpenVLA 不支持动作块，是它在开箱评测里吃亏的主因之一（§VI-A）。

</details>

### 4. 数据与训练配方

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：9.03 亿时间步、n^0.43 加权、补零到 18 维、预训练 70 万步、后训练 5–100+ 小时</summary>

**预训练混合**（§V-A、图 4）按时间步计数（每个样本是一个 $(o_t, A_t)$）：

- **开源 9.1%**：OXE（论文用其子集 OXE Magic Soup）、Bridge v2、DROID。一两路相机，2–10 Hz 低频控制，但物体和环境覆盖广。
- **自有 π 数据集 9.03 亿步**：单臂 1.06 亿、双臂 7.97 亿，68 个任务、7 种构型。论文的「任务」定义很宽，例如「收餐桌」一个任务里就有各种碗碟、杯子、餐具和垃圾，所以实际行为种类远多于 68。
- 语言标签：任务名 + 细粒度分段标注（每段约 2 秒）。

**加权**：各「任务—机器人」组合的样本量差别很大（叠衣服这类难任务数据偏多），每个组合按 $n^{0.43}$ 加权，$n$ 是该组合的样本数，过多的组合被压低。

**异构本体**：状态 $q_t$ 和动作 $a_t$ 一律补零到数据集里最大的维度 **18**（两条 6 自由度臂、2 个夹爪、移动底盘、升降躯干）；不足 3 路相机的，把空位图像打掩码。

**后训练**：用较小的任务数据集微调，简单任务 5 小时，最复杂的任务 100 小时以上。

**为什么要两段。** §V 的直觉论证：高质量数据里很少出现失误，只用它训练的模型学不会从失误中恢复；只用低质量的预训练数据，又学不会高效、稳健地完成任务。两者结合，模型尽量模仿高质量数据的做法，同时保留一套纠错动作。讨论部分（§VII）再次类比 LLM：知识主要在预训练里获得，后训练告诉模型怎么用。

**高层策略**（§V-B）：收餐桌这类需要语义推理的任务，可以再用一个高层 VLM 把「收拾桌子」拆成「拿起餐巾」「把餐巾扔进垃圾桶」这样的子任务指令喂给 π₀，类似 SayCan。这是**两个模型**的层级结构；π₀.₅ 后来把高层也并进同一个模型。

</details>

### 5. 推理与部署

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：73 ms 一次推理、每 0.5 秒重推理、开环执行、不做时间集成</summary>

附录 D Table I（RTX 4090，3 路相机）：

| 部分 | 耗时 |
|---|---|
| 图像编码器 | 14 ms |
| 观测前向（前缀） | 32 ms |
| 10 次动作前向（流匹配） | 27 ms |
| 网络延迟（仅离机推理） | 13 ms |
| **板载合计** | **73 ms** |
| **离机合计** | **86 ms** |

移动机器人是通过 Wi-Fi 离机推理的。

**执行节拍**：一次生成 $H$ 步，理论上可以执行满 $H$ 步再推理。实际做法：20 Hz 的 UR5e 和 Franka **每 0.8 秒**（执行 16 步后）推理一次；其余 50 Hz 的机器人**每 0.5 秒**（执行 25 步后）推理一次。动作块**开环执行**，不和上一块融合——作者早期试过 ACT 的时间集成（temporal ensembling），发现反而伤性能。

</details>

---

## 🧭 一次推理的数据流（mermaid）

<div class="mermaid">
flowchart TB
  IMG["2–3 路 RGB 图像"] --> SIG["SigLIP 视觉编码器"]
  TXT["语言指令"] --> EMB["Gemma 词嵌入"]
  SIG --> PRE["前缀：图像 + 文字 token<br/>VLM 权重（宽 2048）"]
  EMB --> PRE
  PRE -->|"只前向一次 → KV 缓存"| KV["KV cache"]
  Q["状态 q_t → 线性投影"] --> SUF["后缀：状态 + 50 个带噪动作 token<br/>动作专家权重（宽 1024）"]
  N["A⁰ ~ N(0, I)"] --> SUF
  KV --> SUF
  SUF --> V["速度场 v_θ（线性解码）"]
  V -->|"A ← A + 0.1·v，共 10 步"| SUF
  V --> OUT["动作块 50 步<br/>50 Hz 下执行 25 步后重推理"]
</div>

## 🧭 预训练到后训练（mermaid）

<div class="mermaid">
flowchart LR
  WEB["互联网图文<br/>（PaliGemma 预训练）"] --> INIT["VLM 主干初始化"]
  OWN["π 数据集 9.03 亿步<br/>7 种构型 · 68 任务"] --> MIX["预训练混合<br/>按 n^0.43 加权 · 补零到 18 维"]
  OXE["OXE Magic Soup · Bridge v2 · DROID<br/>（占 9.1%）"] --> MIX
  INIT --> BASE["π₀ 基座模型<br/>700k 步"]
  MIX --> BASE
  BASE -->|"直接用语言提示"| OOB["开箱任务"]
  HQ["任务后训练数据<br/>5 h ～ 100+ h"] --> FT["后训练"]
  BASE --> FT
  FT --> HARD["叠衣服 · 收桌子 · 折纸箱 · 装鸡蛋"]
  HL["高层 VLM 给子任务指令"] -.-> HARD
</div>

---

## 🚶 具体实例：一次 ALOHA 叠毛巾推理怎么走完

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（8 节）：环境设定 / 第 1 步：数 token / 第 2 步：掩码编号 / 第 3 步：时间编码 / 第 4 步：训练时的一个样本 / 第 5 步：十步积分 / 第 6 步：推理预算 / 第 7 步：数据加权</summary>

<h3 id="实例-环境设定">环境设定</h3>

用 openpi 仓库里的 `pi0_aloha_towel` 配置（π₀ 在内部 ALOHA 数据上微调，默认提示词 `"fold the towel"`）。模型配置取 `Pi0Config()` 的默认值：`action_dim=32`、`action_horizon=50`、`max_token_len=48`、图像分辨率 224×224、三路相机 `base_0_rgb` / `left_wrist_0_rgb` / `right_wrist_0_rgb`。

> 💡 下面的 token 数由 openpi 的配置推出；第 4、5、7 步里的具体数值（$\epsilon$、$A$、两个组合的样本量）是笔记构造的**玩具数**，动画第四、六幕用的是同一组数。

<h3 id="实例-第-1-步数-token">第 1 步：数 token</h3>

- SigLIP So400m/14，patch 14：$224/14 = 16$，每路图像 $16\times16 = 256$ 个 token，三路 **768** 个。
- 语言指令补齐到 **48** 个 token（多余位置 `input_mask=False`）。
- 前缀合计 $768 + 48 = 816$ 个位置。
- 后缀：π₀ 模式下 1 个状态 token + 50 个动作 token = **51** 个。

<h3 id="实例-第-2-步掩码编号">第 2 步：掩码编号</h3>

openpi 的 `make_attn_mask` 用 `ar_mask` 的**累加和**给每个 token 编号，token $i$ 能看 token $j$ 当且仅当 $\mathrm{cumsum}_j \le \mathrm{cumsum}_i$：

| 段 | `ar_mask` | 累加和 | 能看到 |
|---|---|---|---|
| 816 个前缀 token | 全 `False` | 0 | 前缀 |
| 状态 token | `True` | 1 | 前缀 + 自己 |
| 第 1 个动作 token | `True` | 2 | 全部 |
| 其余 49 个动作 token | `False` | 2 | 全部 |

正好就是附录 B 的三块掩码。

<h3 id="实例-第-3-步时间编码">第 3 步：时间编码</h3>

`posemb_sincos(τ, 1024, min_period=4e-3, max_period=4.0)`：512 个周期从 0.004 到 4.0 按几何级数取，拼成 $[\sin, \cos]$ 共 1024 维。π₀ 模式下它和动作投影拼成 2048 维，经 `action_time_mlp_in`（2048→1024）、swish、`action_time_mlp_out`（1024→1024）得到动作专家的输入 token——对应附录 B 的 $W_3\,\mathrm{swish}(W_2\,\mathrm{concat}(W_1 a, \phi(\tau)))$：代码是 `mlp_out(swish(mlp_in(concat(in_proj(a), φ(τ)))))`，与论文一致。

<h3 id="实例-第-4-步训练时的一个样本">第 4 步：训练时的一个样本</h3>

取一维玩具：某个关节的真动作 $A = 0.8$，采到噪声 $\epsilon = -1.2$，采到 $\tau = 0.25$：

$$
A^{0.25} = 0.25\times0.8 + 0.75\times(-1.2) = 0.2 - 0.9 = -0.7,\qquad u = 0.8 - (-1.2) = 2.0
$$

若网络此时输出 $v_\theta = 1.6$，这一维的损失是 $(1.6-2.0)^2 = 0.16$。openpi 对动作维取平均（`jnp.mean(..., axis=-1)`），得到每个时间步一个损失值。

**$\tau$ 落在哪。** $x = (s-\tau)/s \sim \mathrm{Beta}(1.5, 1)$，其 CDF 是 $x^{1.5}$。$\tau < 0.5 \iff x > (0.999-0.5)/0.999 = 0.4995$，概率 $1 - 0.4995^{1.5} = 1 - 0.353 = 0.647$：约 **64.7%** 的训练样本落在噪声更大的那一半。$\tau$ 的均值是 $0.999\times(1 - 1.5/2.5) = 0.40$。

<h3 id="实例-第-5-步十步积分">第 5 步：十步积分</h3>

推理时从 $\epsilon = -1.2$ 出发。假设网络每步都给出理想速度 $2.0$：

| 步 | $\tau$ | 值 |
|---|---|---|
| 0 | 0.0 | −1.2 |
| 1 | 0.1 | −1.0 |
| 2 | 0.2 | −0.8 |
| … | … | … |
| 9 | 0.9 | 0.6 |
| 10 | 1.0 | **0.8** |

每步前进 $0.1\times2.0 = 0.2$。真实模型的速度随 $A^\tau$ 变化，这张表只说明积分方向和步长。

openpi 代码里时间方向相反：从 `time = 1.0`（噪声）出发，`dt = -1/num_steps = -0.1`，更新 `x_t + dt * v_t`，训练目标是 `u_t = noise - actions`。代入同样的数：速度目标是 $-1.2 - 0.8 = -2.0$，乘上负的 `dt` 后每步同样前进 $+0.2$，结果一致。

<h3 id="实例-第-6-步推理预算">第 6 步：推理预算</h3>

ALOHA（双臂 Trossen）是 50 Hz：一块 50 步覆盖 1 秒，执行 25 步（0.5 秒）后重推理。板载一次推理 $14 + 32 + 27 = 73$ ms，只占 0.5 秒间隔的 14.6%。

<h3 id="实例-第-7-步数据加权">第 7 步：数据加权</h3>

两个「任务—机器人」组合，样本量 100M 和 1M。按样本量直接混合是 100 : 1；按 $n^{0.43}$ 加权：

$$
\frac{100^{0.43}}{1^{0.43}} = e^{0.43\times\ln 100} = e^{1.980} \approx 7.24
$$

大组合的采样占比从 $100/101 = 99.0\%$ 降到 $7.24/8.24 = 87.9\%$。

</details>

---

## 📊 实验里实际报了什么

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：开箱、语言跟随、新任务微调、复杂多阶段任务四组实验</summary>

所有实验都在真机上跑，每个条件 10 次，按附录 E 的评分细则给部分分（例如收餐桌按正确归位的物体比例计分）。柱状图的具体数值只在图 7、9、11、13 里，下面只转述正文结论。

**① 开箱评测**（§VI-A，图 7）：只预训练、不后训练，用语言直接指挥。任务：叠衬衫（双臂 ARX）、收餐桌简单 / 困难（UR5e）、装杂货袋（UR5e）、从烤面包机取吐司（双臂 Trossen）。

- 对照：OpenVLA（7B，在同一混合上训练 16 万步）、只用 UR5e 数据的 OpenVLA、Octo（93M，32 万步）、π₀-small。
- π₀ 在所有任务上最好，叠衬衫和简单收餐桌接近满分。
- 只训 16 万步的「对齐算力」版 π₀ 也赢过所有基线；连 π₀-small 也好过 OpenVLA 和 Octo。
- OpenVLA 吃亏的主因：自回归离散化不支持动作块。Octo 支持动作块，但表达能力有限。

**② 语言跟随**（§VI-B，图 9）：收餐桌、摆餐具、装杂货袋三个任务，每段约 2 秒一条子指令。

- 比较 π₀ 和 π₀-small 在 flat（只给总任务）、human（专家给中间指令）、HL（高层 VLM 给中间指令）三种条件下的表现。
- π₀ 的语言跟随准确率明显高于 π₀-small，这种能力也转化成 human、HL 条件下更好的任务表现。π₀-small 的语言能力有限，加了高层指令整体也不涨。

**③ 新任务微调**（§VI-C，图 11）：叠碗、叠毛巾（简单）、微波炉放保鲜盒（中等）、换卷纸、Franka 抽屉收纳（困难），微调数据 1、5、10 小时。

- 对照：OpenVLA、Octo（公开权重再微调）、ACT、Diffusion Policy（只在微调数据上训练）、π₀ 从零训练。
- π₀ 整体最好。有意思的是，先前方法里最强的是从零训练的 ACT / DP，说明它们难以利用预训练。
- 预训练对和预训练数据越像的任务帮助越大；相对从零训练，预训练版有时高到 **2 倍**。

**④ 复杂多阶段任务**（§VI-D，图 13）：叠衣服（固定 / 移动）、烘干机取衣、收餐桌（全新物体）、折纸箱、打包外卖盒、装鸡蛋，单次 5–20 分钟。

- 其他方法都做不了，只和自身消融比：完整配方 vs 只预训练（开箱）vs 从零训练。
- 完整 π₀ 在所有任务上拿到最高分的 **50% 以上**，通常好于两个消融；越难的任务，预训练的提升越大。

</details>

---

## ⚠️ 边界

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：数据怎么配还不知道、不是所有任务都可靠、跨很远的领域未验证</summary>

作者在 §VII 自己列出的局限：

- **预训练数据该怎么组成还没有系统理解**：他们把能拿到的数据都混进去了，哪类数据更有用、该怎么加权仍是开放问题。
- **不是所有评测任务都稳定可靠**，也还不能预测要多少、什么样的数据才能接近满分。
- **跨异构数据的正迁移有多大**仍待研究；能否推广到驾驶、导航、**足式运动**这类差异很大的领域，留作后续。

阅读时再补几点（笔者的判断）：

- 实验全是**桌面 / 移动机械臂操作**，没有人形或足式机器人，本站读者不要把它直接当成人形全身控制器。
- 大部分评测场景和训练数据相近，「进一个没见过的家」这件事要看 π₀.₅。
- 自有数据集未开源；openpi 放出的是基座与若干微调权重，复现论文里的完整预训练做不到。

</details>

---

## 📁 openpi 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（8 节）：源码类图 / 1. 配置 / 2. 两套权重怎么在注意力里汇合 / 3. 前缀与后缀 / 4. 掩码 / 5. 训练损失 / 6. 推理：KV 缓存 + 十步积分 / 7. 论文与代码对照表</summary>

> 💡 官方开源 [Physical-Intelligence/openpi](https://github.com/Physical-Intelligence/openpi)（下文取 `main` 分支 commit `215abfb`）。π₀ 与 π₀.₅ 共用 `src/openpi/models/pi0.py`，用 `Pi0Config(pi05=...)` 区分。

<h3 id="源码-类图">源码类图</h3>

<div class="mermaid">
classDiagram
  class Pi0Config {
    paligemma_variant = gemma_2b
    action_expert_variant = gemma_300m
    action_dim = 32
    action_horizon = 50
    max_token_len = 48
    pi05 = False
  }
  class Pi0 {
    PaliGemma.img : SigLIP So400m/14
    PaliGemma.llm : gemma.Module(两份配置)
    state_proj
    action_in_proj
    action_time_mlp_in / out
    action_out_proj
    embed_prefix()
    embed_suffix()
    compute_loss()
    sample_actions()
  }
  class GemmaModule {
    configs : [gemma_2b, gemma_300m]
    Attention : 各自 QKV → 拼接 → 一次注意力
    FeedForward : 各自一份
  }
  Pi0Config --> Pi0 : create()
  Pi0 --> GemmaModule
</div>

<h3 id="源码-1-配置">1. 配置：动作维是 32，不是 18</h3>

```python
# src/openpi/models/pi0_config.py
@dataclasses.dataclass(frozen=True)
class Pi0Config(_model.BaseModelConfig):
    dtype: str = "bfloat16"
    paligemma_variant: _gemma.Variant = "gemma_2b"
    action_expert_variant: _gemma.Variant = "gemma_300m"

    # Set the model specific defaults.
    action_dim: int = 32
    action_horizon: int = 50
    max_token_len: int = None  # type: ignore
    # Pi05 has two differences from Pi0: ...
    pi05: bool = False
```

```python
# src/openpi/models/gemma.py - get_config()
if variant == "gemma_300m":
    return Config(width=1024, depth=18, mlp_dim=4096,
                  num_heads=8, num_kv_heads=1, head_dim=256)
if variant == "gemma_2b":
    return Config(width=2048, depth=18, mlp_dim=16_384,
                  num_heads=8, num_kv_heads=1, head_dim=256)
```

- 论文说补零到 18 维；开源代码统一补到 **32 维**，给更多构型留余量。
- 附录 B 写 `num heads=18`，代码里两份配置都是 **8 头**。Gemma 2B 的宽度 $2048 = 8\times256$，笔者推测论文的 18 是笔误（和 `depth=18` 混了）。

<h3 id="源码-2-两套权重怎么在注意力里汇合">2. 两套权重怎么在注意力里汇合</h3>

```python
# src/openpi/models/gemma.py - Attention.__call__()（节选）
# all experts must share the same head dim, num heads, and num kv heads for self-attention to work
assert all(config.head_dim == self.configs[0].head_dim for config in self.configs)
...
for i, (x, config) in enumerate(zip(xs, self.configs, strict=True)):
    if x is None:
        continue
    q = q_einsum("BTD,NDH->BTNH", x)            # 第 i 个专家自己的 W_Q
    k, v = kv_einsum("BSD,2KDH->2BSKH", x)      # 第 i 个专家自己的 W_K、W_V
    qkvs.append((q, k, v))

q, k, v = (jnp.concatenate(y, axis=1) for y in zip(*qkvs, strict=True))  # 沿序列拼接
q = _apply_rope(q, positions=positions)
q *= self.configs[0].head_dim ** -0.5
...
logits = jnp.einsum("BTKGH,BSKH->BKGTS", q, k, preferred_element_type=jnp.float32)
masked_logits = jnp.where(attn_mask[:, :, None, :, :], logits, big_neg)
probs = jax.nn.softmax(masked_logits, axis=-1).astype(dtype)
```

这就是「只在自注意力里交互」的实现：前缀 token 用 VLM 的投影矩阵、后缀 token 用动作专家的投影矩阵，各自算出 Q、K、V 后**沿序列拼接**，做一次注意力，再按原长度切开、各自过自己的输出投影和 MLP。位置编码用 Gemma 自带的 RoPE。

<h3 id="源码-3-前缀与后缀">3. 前缀与后缀：`embed_prefix` / `embed_suffix`</h3>

```python
# src/openpi/models/pi0.py - Pi0.embed_suffix()（π₀ 分支）
if not self.pi05:
    # add a single state token
    state_token = self.state_proj(obs.state)[:, None, :]
    tokens.append(state_token)
    input_mask.append(jnp.ones((obs.state.shape[0], 1), dtype=jnp.bool_))
    # image/language inputs do not attend to state or actions
    ar_mask += [True]

action_tokens = self.action_in_proj(noisy_actions)
# embed timestep using sine-cosine positional encoding with sensitivity in the range [0, 1]
time_emb = posemb_sincos(timestep, self.action_in_proj.out_features, min_period=4e-3, max_period=4.0)
...
    # mix timestep + action information using an MLP (no adaRMS)
    time_tokens = einops.repeat(time_emb, "b emb -> b s emb", s=self.action_horizon)
    action_time_tokens = jnp.concatenate([action_tokens, time_tokens], axis=-1)
    action_time_tokens = self.action_time_mlp_in(action_time_tokens)
    action_time_tokens = nnx.swish(action_time_tokens)
    action_time_tokens = self.action_time_mlp_out(action_time_tokens)
...
# image/language/state inputs do not attend to action tokens
ar_mask += [True] + ([False] * (self.action_horizon - 1))
```

和附录 B 的 $W_3\,\mathrm{swish}(W_2\,\mathrm{concat}(W_1 a, \phi(\tau)))$ 一一对应：`action_in_proj` 是 $W_1$，`action_time_mlp_in` 是 $W_2$，`action_time_mlp_out` 是 $W_3$。

<h3 id="源码-4-掩码">4. 掩码：`make_attn_mask`</h3>

```python
# src/openpi/models/pi0.py
def make_attn_mask(input_mask, mask_ar):
    """Tokens can attend to valid inputs tokens which have a cumulative mask_ar
    smaller or equal to theirs. ..."""
    mask_ar = jnp.broadcast_to(mask_ar, input_mask.shape)
    cumsum = jnp.cumsum(mask_ar, axis=1)
    attn_mask = cumsum[:, None, :] <= cumsum[:, :, None]
    valid_mask = input_mask[:, None, :] * input_mask[:, :, None]
    return jnp.logical_and(attn_mask, valid_mask)
```

`ar_mask` 的每个 `True` 开一个新块。前缀全 `False`（编号 0），状态 `True`（编号 1），第一个动作 `True`（编号 2）、其余 `False`（仍是 2），见[实例第 2 步](#实例-第-2-步掩码编号)。

<h3 id="源码-5-训练损失">5. 训练损失：时间方向和论文相反</h3>

```python
# src/openpi/models/pi0.py - Pi0.compute_loss()
noise = jax.random.normal(noise_rng, actions.shape)
time = jax.random.beta(time_rng, 1.5, 1, batch_shape) * 0.999 + 0.001
time_expanded = time[..., None, None]
x_t = time_expanded * noise + (1 - time_expanded) * actions
u_t = noise - actions
...
v_t = self.action_out_proj(suffix_out[:, -self.action_horizon :])
return jnp.mean(jnp.square(v_t - u_t), axis=-1)
```

代码里 `time = 1` 是噪声、`time = 0` 是动作，和论文的 $\tau$ 正好反过来：`time` $= 1-\tau$。Beta(1.5, 1) 偏向 1，也就是偏向噪声，和论文「强调高噪声」一致；`* 0.999 + 0.001` 对应论文的 $s = 0.999$ 截断。速度目标也随之取反：`noise - actions` $= -(A-\epsilon)$。

<h3 id="源码-6-推理kv-缓存--十步积分">6. 推理：KV 缓存 + 十步积分</h3>

```python
# src/openpi/models/pi0.py - Pi0.sample_actions()
# note that we use the convention more common in diffusion literature, where t=1 is noise and t=0 is the target
# distribution. yes, this is the opposite of the pi0 paper, and I'm sorry.
dt = -1.0 / num_steps
...
# first fill KV cache with a forward pass of the prefix
prefix_tokens, prefix_mask, prefix_ar_mask = self.embed_prefix(observation)
prefix_attn_mask = make_attn_mask(prefix_mask, prefix_ar_mask)
positions = jnp.cumsum(prefix_mask, axis=1) - 1
_, kv_cache = self.PaliGemma.llm([prefix_tokens, None], mask=prefix_attn_mask, positions=positions)

def step(carry):
    x_t, time = carry
    suffix_tokens, suffix_mask, suffix_ar_mask, adarms_cond = self.embed_suffix(
        observation, x_t, jnp.broadcast_to(time, batch_size))
    ...
    (prefix_out, suffix_out), _ = self.PaliGemma.llm(
        [None, suffix_tokens], mask=full_attn_mask, positions=positions,
        kv_cache=kv_cache, adarms_cond=[None, adarms_cond])
    v_t = self.action_out_proj(suffix_out[:, -self.action_horizon :])
    return x_t + dt * v_t, time + dt

x_0, _ = jax.lax.while_loop(cond, step, (noise, 1.0))
```

前缀（`[prefix_tokens, None]`）只跑一次拿到 `kv_cache`；每步积分只把后缀（`[None, suffix_tokens]`）送进去。`num_steps` 默认 10。

<h3 id="源码-7-论文与代码对照表">7. 论文与代码对照表</h3>

| 论文 | openpi | 说明 |
|---|---|---|
| $A^\tau = \tau A + (1-\tau)\epsilon$，$u = A-\epsilon$，$\tau$: 0→1 | `x_t = t·noise + (1-t)·actions`，`u_t = noise - actions`，`t`: 1→0 | 方向相反，代码注释里作者道歉；数值上等价 |
| $p(\tau) = \mathrm{Beta}((s-\tau)/s; 1.5, 1)$，$s = 0.999$ | `beta(1.5, 1) * 0.999 + 0.001` | 一致（换成 `t` 的方向） |
| 10 步欧拉，$\delta = 0.1$ | `num_steps=10`，`dt=-0.1` | 一致 |
| 状态、动作补零到 18 维 | `action_dim=32` | 开源版留了更多余量 |
| 附录 B：num heads=18 | `gemma_2b` / `gemma_300m`：`num_heads=8` | 笔者推测论文笔误 |
| 三块分块因果掩码 | `ar_mask` 累加和 + `make_attn_mask` | 一致 |
| 动作专家约 300M，宽 1024、MLP 4096 | `gemma_300m` | 一致 |
| $W_3\,\mathrm{swish}(W_2\,\mathrm{concat}(W_1 a, \phi(\tau)))$ | `action_in_proj` → concat → `action_time_mlp_in` → swish → `action_time_mlp_out` | 一致 |

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：六问 —— 为什么流匹配、两套权重的意义、掩码怎么分、为什么偏向高噪声、预训练与后训练、和 GR00T N1 的区别</summary>

**Q：为什么用流匹配而不是把动作离散成 token？**  
A：离散 token 要自回归一个个生成，不支持动作块、做不了 50 Hz 灵巧控制；OpenVLA 在开箱评测里吃亏主要就在这。流匹配一次对整块 50 步动作做 10 步积分，精度高、能表示多峰分布，前缀还能 KV 缓存。

**Q：「两套权重」到底是什么？为什么不直接共用 VLM 的权重？**  
A：图像和文字 token 用 PaliGemma 的权重，状态和动作 token 用一套新的、从零初始化的约 300M 权重，两者只在每层自注意力里拼接后交互。作者发现给机器人专属 token 单独权重效果更好；动作专家还能做小，积分 10 次时只前向它。

**Q：分块掩码为什么这样分三块？**  
A：图文块不看后面，减少和 VLM 预训练的分布偏移；状态单独一块、不看动作，积分过程中它不变，K、V 能缓存；动作块看全部，块内双向。实现上是 `ar_mask` 的累加和：同编号互相可见，只能看编号不大于自己的。

**Q：时间步采样为什么偏向高噪声？**  
A：作者认为动作预测里观测约束很强，「给定观测预测动作均值」本身就难，高噪声段更需要练，所以用 $\mathrm{Beta}((s-\tau)/s; 1.5, 1)$。按这个分布约 64.7% 的样本落在 $\tau<0.5$。$\tau > 0.999$ 不采样，最多支持 1000 步积分。

**Q：预训练和后训练各起什么作用？**  
A：预训练数据广而杂、质量参差，让模型见过大量场景和失误恢复；后训练数据少而精，让模型学会流畅高效的做法。只用后者学不会纠错，只用前者不够流畅。复杂任务上，完整配方明显好于只预训练或从零训练。

**Q：π₀ 和 GR00T N1 的动作头有什么不同？**  
A：两者都用流匹配生成动作块。π₀ 是同一个 Transformer 里两套权重、在自注意力里交互（论文类比 MoE），10 步积分、$H = 50$；GR00T N1 是 VLM 取中间层特征，经**交叉注意力**送进独立的 DiT，4 步积分、$H = 16$。GR00T N1 的论文自己把这点写成和 π₀ 的区别。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：数字从哪一节来，以及和本站其他笔记的关系</summary>

<h3 id="数字出处">数字出处</h3>

- 3.3B、300M、PaliGemma 3B、$H = 50$、10 步积分：§IV。
- 两套权重的宽度、层数、掩码、时间嵌入、$p(\tau)$：附录 B 与图 14。
- π₀-small 的 470M 与结构差异：§IV 与附录 C。
- 9.1%、9.03 亿 / 1.06 亿 / 7.97 亿、$n^{0.43}$、18 维、5–100+ 小时：§V-A；7 种构型与各自维度：§V-C。
- 73 / 86 ms、0.5 / 0.8 秒重推理、不用时间集成：附录 D 与 Table I。
- 70 万步、16 万步对齐算力版、OpenVLA 16 万步、Octo 32 万步：§VI-A。
- 评分细则：附录 E。
- 源码：openpi `main` 分支 commit `215abfb` 的 `pi0.py`、`pi0_config.py`、`gemma.py`、`training/config.py`。
- 具体实例里 $\epsilon=-1.2$、$A=0.8$、$\tau=0.25$、$v_\theta = 1.6$、100M / 1M 是笔记构造的玩具数；64.7% 按论文的 Beta 分布现算。

<h3 id="相关阅读">相关阅读</h3>

- 本站 [Transformer](../../01_Foundational_RL/Transformer_Attention_Is_All_You_Need/Transformer_Attention_Is_All_You_Need.html)：自注意力、掩码与正弦编码的来源。
- 本站 [Diffusion Policy](../../01_Foundational_RL/Diffusion_Policy/Diffusion_Policy.html)：动作块 + 去噪生成的前身，也是本文微调实验的对照。
- 本站 [GR00T N1](../GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.html)：同为流匹配 VLA，改用交叉注意力 + DiT，面向人形。
- 本站 [π₀.₅](../Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.html)：在 π₀ 上加异构协同训练、离散 + 连续两段训练和同模型高层推理，面向陌生家庭。
- [FAST（Pertsch et al., 2025）](https://arxiv.org/abs/2501.09747)：π₀-FAST 与 π₀.₅ 预训练用的动作 tokenizer。
- [Transfusion（Zhou et al., 2024）](https://arxiv.org/abs/2408.11039)：一个 Transformer 同时做交叉熵与扩散损失，π₀ 架构的直接灵感。

</details>
