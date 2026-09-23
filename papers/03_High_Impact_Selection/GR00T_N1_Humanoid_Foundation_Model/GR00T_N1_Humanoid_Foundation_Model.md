---
layout: paper
paper_order: 1
title: "GR00T N1: An Open Foundation Model for Generalist Humanoid Robots"
category: "高影响力精选 High Impact Selection"
subcategory: "Sim-to-Real & Foundation Model"
zhname: "GR00T N1：面向通用人形机器人的开放基础模型"
demos: ["groot"]
---

# GR00T N1: An Open Foundation Model for Generalist Humanoid Robots
**Eagle-2 的中间层视觉语言特征经交叉注意力送进流匹配 DiT，人类视频、仿真和真机轨迹按数据金字塔一起训，放出 2.2B 开放权重。**

> 📅 阅读日期: 2026-04-21（2026-09-23 对照论文正文、附录表与 Isaac-GR00T 的流匹配实现重写）
>
> 🏷️ 板块: 03_High_Impact_Selection / Sim-to-Real & Foundation Model（H19）
>
> 🧭 状态: 已对照 [arXiv:2503.14734](https://arxiv.org/abs/2503.14734) 与开源仓库 [NVIDIA/Isaac-GR00T](https://github.com/NVIDIA/Isaac-GR00T) 里的 `velocity = actions - noise`。仿真数据来自 DexMimicGen / RoboCasa，120 Hz 是动作块的播放节拍，真机表只有 Fourier GR-1 上的短程桌面操作。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2503.14734](https://arxiv.org/abs/2503.14734) |
| **HTML** | [arxiv.org/html/2503.14734](https://arxiv.org/html/2503.14734) |
| **PDF** | [arxiv.org/pdf/2503.14734](https://arxiv.org/pdf/2503.14734) |
| **发布时间** | 2025-03（arXiv） |
| **作者** | NVIDIA Project GR00T（研究负责 Linxi “Jim” Fan、Yuke Zhu） |
| **机构** | NVIDIA |
| **模型** | [Hugging Face · nvidia/GR00T-N1-2B](https://huggingface.co/nvidia/GR00T-N1-2B)（全模型 2.2B，其中 VLM 1.34B） |
| **官方代码** | [NVIDIA/Isaac-GR00T](https://github.com/NVIDIA/Isaac-GR00T) |
| **真机** | Fourier GR-1（实验表里只报了这一台） |
| **仿真** | RoboCasa 厨房（Franka）、DexMimicGen 跨本体（双臂 Panda / GR-1）、自建 GR-1 桌面 |

---

## 🎯 一句话总结

GR00T N1 是一个开放权重的视觉-语言-动作模型：Eagle-2 读图像和语言，扩散 Transformer 用流匹配一次生成 16 步动作，两条网络端到端一起训练。数据按「人类视频 → 仿真 / 神经轨迹 → 真机」堆成金字塔，用来缓解「没有人形互联网」这件事。论文给出的强结果是**短程桌面操作**上的数据效率，不是行走，也不是移动到另一个房间取物。

> 🎮 **本文内嵌 1 段讲解动画和 3 个交互图**（不用装任何东西）：
> [七幕动画：GR00T N1 全流程](#groot-explainer-anim) —— 约 87 秒串完「数据孤岛 → 10 Hz 与 63.9 ms → 流匹配 → 数据金字塔 → 潜动作 / IDM → 一套权重多套 MLP → 表上的数字」。空格播放/暂停，← → 换幕，也可以点分幕标签跳着看。

> 🧪 [动作块时间尺](#动作块和推理预算)、[四步流匹配](#四步流匹配动手走一遍)、[按任务加权的实验表](#实验数字自己算)可拖动或点击，分别解释频率、生成过程和成功率。

> 🚶 [具体实例](#实例-环境设定)用官方仓库自带的 GR-1 取放 demo 数据，把一条样本从切片、归一化、Eagle-2、DiT 到四步欧拉逐步手算一遍；[源码对照](#源码-类图)逐段对照 Isaac-GR00T `n1-release` 的实现，并列出论文与代码不一致的地方（checkpoint 里的去噪步数是 16，不是 4）。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 在这篇论文里指什么 |
|------|------|-------------------|
| **VLA** | Vision-Language-Action | 图像 + 语言进，动作块出；GR00T N1 的整体 |
| **VLM** | Vision-Language Model | System 2，这里是 Eagle-2（SmolLM2 + SigLIP-2） |
| **DiT** | Diffusion Transformer | System 1 的骨干；自适应 LayerNorm 吃去噪步 |
| **IDM** | Inverse Dynamics Model | 给没有动作的视频补伪动作 |
| **LAPA** | Latent Action Pretraining | 把 VQ-VAE 潜动作当成一种单独的「本体」 |
| **OXE** | Open X-Embodiment | 跨机器人数据集合；本文只用了其中若干子集 |

---

## 🎬 七幕动画：GR00T N1 全流程 {#groot-explainer-anim}

<div class="paper-demo" data-demo="groot-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 📖 **动画之后的正文默认全部折叠**：问题、双系统、流匹配、数据金字塔、潜动作、跨本体、实验数字和边界按小节收起，具体实例、源码对照、面试和附录各收成一块。想细读哪一块就点开，内容一字未删；下面那张流程图留在外面。目录里的标题可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」。

---

## ❓ 论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：没有人形互联网、跨本体仍是孤岛、黑盒 VLM 接不上执行</summary>

引言把通用机器人拆成三件必须一起有的东西：硬件、模型、数据。人形被选成硬件，是因为它的身体和人的世界更像。模型和数据才是这篇要动手的部分。

1. **单台人形的真机数据小几个数量级。** 词和像素有互联网，人形轨迹没有。
2. **把别的机器人数据拼进来，拼出来的仍是孤岛。** Open X-Embodiment 已经试过跨本体汇数据，但自由度、传感器、控制模式都不一样，还构不成一份能预训练通用模型的语料。
3. **把现成的视觉语言模型当黑盒规划器，得先假定低层技能存在。** 相关工作里这条路（SayCan 一类）和「把 VLM 微调成 VLA」是分开的。GR00T N1 走第二条：Eagle-2 和动作头一起训，中间用交叉注意力，而不是 π₀ 那种 mixture-of-experts。

第 4.6 节把边界写死了：当前模型主要做**短时程桌面操作**。长程 loco-manipulation 被留作后续，而且作者认为那还要换硬件、架构和语料。

</details>

---

## 🔧 方法详解

### 1. 双系统：10 Hz 的特征，和 63.9 ms 的动作块

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：第 12 层、64 个图像 token、一块 16 步；120 Hz 是动作率</summary>

两个模块都是 Transformer，训练时捆在一起，不是「想完再交给一个现成控制器」。

**System 2。** Eagle-2，从 SmolLM2 和 SigLIP-2 微调来。图像 $224\times224$，pixel shuffle 之后每帧 **64** 个图像 token，再和文本一起进 LLM。策略训练时，任务描述和图像走视觉语言训练用过的 chat 格式。GR00T-N1-2B 取的是 **第 12 层**的表示，不用最后一层——论文说这样推理更快，下游成功率也更高。全模型 2.2B，VLM 占 1.34B。论文写 System 2 在 NVIDIA L40 上以 **10 Hz** 跑。

**System 1。** DiT 变体：自注意力看加了噪声的动作 token 和本体状态，交叉注意力读 VLM 的 $\phi_t$。每个本体各有一套 MLP，把不同维度的状态和动作投到共享宽度；动作编码器还把扩散时间步和带噪动作编在一起。最后再用一个按本体的 MLP 解出动作。论文写它生成闭环电机动作的频率是 **120 Hz**。

这两句频率不能读成「DiT 每秒前向 120 次」。同节给出的测量是：采样 **一块 16 步动作** 在 L40、bf16 下耗时 **63.9 ms**。按 120 Hz，这 16 步要播放 $16/120=133\ \text{ms}$。63.9 ms 算完、133 ms 才播完，所以实时性来自「一块动作算得比播得快」，不是整网 8 ms 跑一次。遥操采集本身是 **20 Hz**，和这两个数又不是一回事。

</details>

### 读懂一次推理的数据形状

下图把 Figure 2–3 拆到 token 和张量层：图像经视觉编码器与 pixel shuffle 变成每帧 **64 个视觉 token**；文本进入语言模型。两者在 Eagle-2 内融合，取第 12 层的特征 $\phi_t$。机器人状态 $q_t$ 走对应本体的 MLP；带噪的未来动作块 $A^\tau$ 与时间 $\tau$ 也先被编码，然后动作 token 在 DiT 里用**自注意力**互相交流，用**交叉注意力**读取 $\phi_t$，最后由本体专属的输出 MLP 解码。这里的 $H=16$ 是时间步数，**不是 16 个关节**；动作维度取决于本体。

| 输入或中间量 | 可把它想成 | 最终去向 |
|---|---|---|
| 图像、文字 | 当前场景与「把苹果放进篮子」 | Eagle-2 的视觉/语言 token |
| $\phi_t$ | 第 12 层的上下文特征序列 | DiT 交叉注意力的条件 |
| $q_t$ | 当前关节等本体状态 | 本体 MLP → DiT |
| $A^\tau\in\mathbb R^{16\times d_a}$ | 一次生成的 16 帧带噪动作 | DiT 自注意力；$d_a$ 随本体变 |
| $\tau$ | 从噪声走向动作的进度 | 动作编码与 DiT 的时间条件 |

<div class="mermaid">
flowchart TB
  I["图像 → 视觉 token"] --> V["Eagle-2 · 第 12 层 φₜ"]
  T["语言 → 文字 token"] --> V
  V -->|"交叉注意力条件"| D["DiT · 自注意力 + 交叉注意力"]
  Q["本体状态 qₜ → 本体 MLP"] --> D
  A["带噪动作块 16×dₐ + 时间 τ"] --> D
  D --> O["本体输出 MLP → 16 步动作"]
</div>

**一次注意力的直觉**：动作 token 的 query 在视觉语言 token 中寻找相关的 key，再把对应 value 汇入动作特征。这个解释只说明交叉注意力的信息流；论文没有把每个 token 明确标注成「苹果」或「篮子」，注意力权重也不能直接当作可靠的语义解释。

### 动作块和推理预算

<div class="paper-demo" data-demo="groot-timing"><p class="demo-fallback">（时间尺需要启用 JavaScript；论文数值：16 步、120 Hz、63.9 ms）</p></div>

若假设每块都完整播放，块时长为 $H/f=16/120\approx133.3$ ms；63.9 ms 是论文在 **L40 / bf16** 上测的一次完整采样耗时，留约 $69.4$ ms 的算术余量。交互图只比较采样耗时和播放时长的**预算**：论文没有给出真实部署的排队、网络传输、动作重规划、块间拼接或控制器调度细节，也不能由此推出固定端到端延迟。10 Hz 是 System 2 的报告频率，120 Hz 是动作频率，不可把两者直接当作同一个推理循环。

---

### 2. 流匹配：直线路径，K = 4

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：速度是 A−ε，四步欧拉；Eq.(1) 的印刷符号和代码相反</summary>

动作按块处理，$H=16$：

$$
A_t=[a_t,a_{t+1},\ldots,a_{t+15}]
$$

训练时采 $\tau\in[0,1]$ 和噪声 $\epsilon\sim\mathcal{N}(0,I)$，把动作块放到直线上。与开源实现对齐的写法是（$t$ 就是论文里的 $\tau$）：

$$
A^{\tau}=(1-\tau)\,\epsilon+\tau A,\qquad v=A-\epsilon
$$

损失是预测速度和 $v$ 的均方误差。时间步用 $p(\tau)=\mathrm{Beta}\big((s-\tau)/s;\,1.5,\,1\big)$，$s=0.999$，和 π₀ 同一族。推理从 $A\sim\mathcal{N}(0,I)$ 出发，做 $K$ 步欧拉：

$$
A\leftarrow A+\frac{1}{K}V_\theta(\phi_t,A,q_t)
$$

论文说 **$K=4$** 在所有本体上都够用。

仓库 [Isaac-GR00T](https://github.com/NVIDIA/Isaac-GR00T) 的动作头就是 `noisy = (1-t)·noise + t·actions`、`velocity = actions - noise`、`actions = actions + dt·pred`。ar5iv 排版的 Eq.(1) 把目标印成 $\epsilon-A$。那个符号和「$\tau$ 从 0 到 1」、和欧拉更新、和仓库都相反：若真去预测 $\epsilon-A$，从噪声出发会往反方向走。本笔记和动画采用与代码一致的 $v=A-\epsilon$。

玩具标量可以手算完。取 $\epsilon=-1$、$A=1$，则 $v=2$，步长 $1/4=0.25$：

| 步 | 更新 | 值 |
|----|------|----|
| 0 | 从噪声出发 | −1 |
| 1 | −1 + 0.25×2 | −0.5 |
| 2 | −0.5 + 0.5 | 0 |
| 3 | 0 + 0.5 | 0.5 |
| 4 | 0.5 + 0.5 | 1 |

四步正好落回数据。这只说明积分方向，不是论文里的关节角。

</details>

### 四步流匹配，动手走一遍

<div class="paper-demo" data-demo="groot-flow"><p class="demo-fallback">（流匹配示意需要启用 JavaScript；可参照上方公式手算）</p></div>

训练中随机抽一个 $\tau$，把噪声 $\epsilon$ 与真实动作 $A$ 混成 $A^\tau$，让网络预测速度 $A-\epsilon$。推理时没有真实 $A$ 可用，网络**每一步重新预测**速度 $V_\theta(\phi_t,A^\tau,q_t,\tau)$，再以步长 $1/4$ 更新。交互图刻意使用常数速度的**一维玩具直线**，所以四步刚好到终点；真实模型的速度随状态变化，不能把这个例子当成模型预测精度。

---

### 3. 数据金字塔

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：底座是人类视频，中层是仿真和神经轨迹，顶层才是真机</summary>

Figure 1 把语料画成金字塔：往下数量变大，往上越来越像目标机器人。三层不是一个均匀的数据池。

**底座。** VLM 预训练用过的网络数据，加上第一视角人类视频：Ego4D、Ego-Exo4D、Assembly-101、EPIC-KITCHENS、HOI4D、HoloAssist、RH20T-Human。这些视频没有机器人动作。

**中层，仿真。** 用 DexMimicGen 把少量人类演示拆成物体中心的子任务，对齐到新的物体位置再重放，只留成功的。预训练任务是「把 A 从容器 B 拿到容器 C」，54 组源/目标容器，每组 1 万条，共 **54 万**条；算上前训练和后训练，一共 **78 万**条仿真轨迹，约 6500 小时，墙钟 **11 小时**生成完（$6500/11\approx591$ 倍）。仿真环境是 RoboCasa 那套桌面重排，不是把策略放进 Isaac Lab 里用强化学习训出来的。

**中层，神经轨迹。** 在 88 小时自有遥操上微调图像到视频的模型，用新的语言提示生成反事实视频，扩到 **827 小时**。$827/88=9.4$，论文口语是「大约 10×」。生成前会让多模态模型列出物理上说得通的「从 A 拿到 B」，生成后再用抽帧做过滤和重新配文。单卡 L40 大约 2 分钟生成 1 秒视频，全部大约 10.5 万 L40·时。

**顶层，真机。**

- GR-1 遥操：VIVE 追手腕，Xsens 手套追手指，也试过 Apple Vision Pro 和 Leap Motion；人的动作经 IK 重定向，控制频率 20 Hz。标注分细粒度原子动作和粗粒度任务。
- Open X-Embodiment 的子集：RT-1、Bridge-v2、Language Table、DROID、MUTEX、RoboSet、Plex。
- AgiBot-Alpha：训练启动时可用的 **14 万**条。

预训练在这三层上按混合比例采样，损失都是流匹配。GR00T-N1-2B 大约用了 **5 万 H100·时**。优化器 AdamW，学习率 $10^{-4}$，预训练 batch 16384、20 万步。语言模型的文本侧冻结，视觉编码器和 DiT 不冻。

</details>

### 4. 没有动作的视频怎么进同一条损失

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：VQ-VAE 潜动作当成 LAPA 本体，IDM 补伪动作，后训练 1:1 混采</summary>

人类视频和神经轨迹没有 $a_t$。做法是另训一个 VQ-VAE：编码器看 $x_t$ 和 $x _ {t+H}$，量化进码本得到潜动作 $z_t$；解码器用 $x_t$ 和 $z_t$ 重建未来帧。训完之后，预训练用的是量化前的连续向量，把它当成一种名叫 **LAPA** 的本体，损失仍是流匹配。Figure 4 用「右手往左 / 往右」说明：相近的潜动作能在机器人和人之间检索到同类运动。

标签怎么配：

| 数据 | 流匹配的目标 |
|------|----------------|
| 人类视频 | 只有潜动作 |
| 真机（GR-1、Open X 等） | 真值动作和潜动作都用 |
| 神经轨迹 | 潜动作，加上在真机数据上训练的 IDM 伪动作 |

后训练是按**单个本体**微调，语言模型继续冻着。数据不够时，可以用神经轨迹补：视频模型只用任务上有限的人类演示来微调（仿真任务用人类采集的轨迹，真机基准只用后训练数据的 10%），伪动作仍由潜动作或 IDM 提供，和真轨迹 **1:1** 采样。RoboCasa 上，30 条演示时 LAPA 略好于 IDM；到 100、300 条，IDM 拉开差距——伪动作终于更像真值。真机上作者只报了 IDM。神经轨迹在 RoboCasa 三个数据档平均多 **+4.2 / +8.8 / +6.8** 个点，真机 8 个任务平均 **+5.8** 个点。

</details>

### 数据来源与动作标签对照

| 来源 | 图像/视频 | 真值机器人动作 | 本文用来训练动作头的标签 | 为什么要这一层 |
|---|---|---|---|---|
| 人类第一视角视频 | 有 | 无 | VQ-VAE 的连续潜动作 | 大规模动作与物体变化 |
| 仿真轨迹 | 有 | 有 | 仿真动作及相应表示 | 可控地扩充任务和场景 |
| 神经生成轨迹 | 有 | 无 | 潜动作及 IDM 预测的伪动作 | 用新指令与初始状态扩充有限遥操 |
| 真机遥操 | 有 | 有 | 真值动作及潜动作 | 锚定目标本体的实际动作 |

**关键区别**：从两帧学出的潜动作是一个学习到的变化表示，IDM 伪动作是从视频反推的动作估计；两者都不是人类视频里凭空出现的真实关节力矩。表格概括训练路径，具体各数据集的抽样比例与质量过滤仍见论文 §2.2–3。

---

### 5. 跨本体是「共享骨干 + 按本体的 MLP」

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：仿真有三条身体，真机表只有 GR-1；Table 2 是后训练之后的数</summary>

「一套权重」出现在引言里，指的是预训练模型能对单臂、双臂、人形生成操作行为。评测数字不是这份权重零样本打出来的。

仿真三条身体：

- **RoboCasa，24 个任务，Franka。** 公开的每任务 3000 条 MimicGen 演示。三路 RGB（左、右、腕），动作是末端相对位姿加夹爪。
- **DexMimicGen，9 个任务。** 双臂 Panda + 夹爪（穿线、组装、搬运）、双臂 Panda + 灵巧手（收拾盒子、收拾抽屉、抬托盘）、GR-1 + 灵巧手（倒、咖啡、分拣罐头）。每任务 1000 条。
- **GR-1 桌面，24 个任务。** 头戴相机，关节空间含双臂、双手、腰和颈；其中 18 个重排任务的容器组合在预训练里没见过，另有 6 个要把东西放进柜、抽屉或微波炉再关上。

后训练默认全局 batch 1024、6 万步；DexMG 因为每个本体任务少，GR00T 的 batch 降到 128。单卡 A6000 上如果只训各本体的 MLP 和 DiT，batch 可以到 200；连视觉编码器一起训，batch 大约 16。

真机后训练数据是人遥操 **15 分钟到 3 小时**再滤掉差轨迹。实验表里的真机只有 Fourier GR-1。致谢感谢了 1X 的硬件支持，1X 没有出现在成功率表里。

</details>

---

## 🧭 数据金字塔进双系统（mermaid）

<div class="mermaid">
flowchart TB
  subgraph base["底座 · 数量最大，没有关节动作"]
    V["人类第一视角<br/>Ego4D / EPIC-KITCHENS / …"]
    W["VLM 预训练用过的网络数据"]
  end
  subgraph mid["中层 · DexMimicGen 与神经轨迹"]
    S["仿真 78 万条<br/>11 小时墙钟"]
    N["88 h 遥操 → 827 h 视频"]
  end
  subgraph peak["顶层 · 最像目标机器人"]
    R["GR-1 遥操 20 Hz<br/>OXE 子集 · AgiBot 14 万条"]
  end
  LA["潜动作 LAPA / IDM 伪动作"]
  S2["System 2 · Eagle-2 第 12 层<br/>10 Hz @ L40"]
  S1["System 1 · DiT 流匹配<br/>H=16 · K=4 · 63.9 ms / 块"]
  V --> LA
  N --> LA
  LA --> S2
  W --> S2
  S --> S2
  R --> S2
  Q["本体状态 q_t<br/>按本体的 MLP"] --> S1
  S2 -->|"交叉注意力 φ_t"| S1
  S1 --> OUT["动作块 16 步<br/>按 120 Hz 播放约 133 ms"]
</div>

---

## 🚶 具体实例：一条 GR-1 取放数据怎么走完训练与推理

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（11 节）：环境设定 / 两条命令 / 第 0 步：加载权重、决定训哪些参数 / 第 1 步：切出一个样本 / 第 2 步：图像、状态、动作的变换 / 第 3 步：Eagle-2 只跑到第 12 层 / 第 4 步：1 个状态 token + 16 个带噪动作 token / 第 5 步：DiT 前向 / 第 6 步：损失 / 第 7 步：四步欧拉推理 / 第 8 步：一块动作覆盖多长时间</summary>

> 💡 **平台说明**：论文预训练用的数据金字塔和 GR-1 真机遥操数据都没有开源。下面改用官方仓库 [Isaac-GR00T](https://github.com/NVIDIA/Isaac-GR00T/tree/n1-release) 的 `n1-release` 标签里自带的 `demo_data/robot_sim.PickNPlace`（GR-1 仿真取放，5 条轨迹、2096 帧、20 fps），配合 `gr1_arms_only` 数据配置走一遍。
>
> 张量形状、超参数和公式都直接读自源码，以及 Hugging Face 上 [`nvidia/GR00T-N1-2B` 的 `config.json`](https://huggingface.co/nvidia/GR00T-N1-2B/blob/main/config.json)。**噪声 $\epsilon$、时间 $t$、网络预测值这几个数是我为了能手算而取的**，文中会逐处标出来，它们不是跑出来的结果。

<h3 id="实例-环境设定">环境设定</h3>

| 项目 | 具体值 | 出处 |
|------|--------|------|
| **数据集** | `demo_data/robot_sim.PickNPlace`，LeRobot v2.0 格式，另附 `meta/modality.json` | README |
| **任务文本** | `"pick the pear from the counter and place it in the plate"` 等（`meta/tasks.jsonl`） | demo 数据 |
| **相机** | `video.ego_view`，头戴视角，256×256，20 fps | `meta/info.json` |
| **原始状态 / 动作** | 各 44 维：左右臂各 7、左右手各 6、左右腿各 6、颈 3、腰 3 | `meta/modality.json` |
| **`gr1_arms_only` 实际用的** | 左臂、右臂、左手、右手：$7+7+6+6=26$ 维，腿、颈、腰都不用 | `data_config.py` |
| **观测时刻** | `observation_indices = [0]`：只看当前一帧图像、一帧状态 | `data_config.py` |
| **动作块** | `action_indices = list(range(16))`：当前帧起连续 16 帧动作，即 $H=16$ | `data_config.py` |
| **本体编号** | 预训练里 `gr1` 对应第 24 套投影；微调时的新本体 `new_embodiment` 用第 31 套（最后一套） | `transforms.py` |

<h3 id="实例-两条命令">两条命令</h3>

```bash
# ① 不训练：用预训练权重在 demo 数据上做离线评测并画图（README 的 quick try）
python scripts/eval_policy.py --plot --model_path nvidia/GR00T-N1-2B
#    其余参数取默认值：--data_config gr1_arms_only  --embodiment_tag gr1  --denoising_steps 4
#    每 16 步调用一次 get_action，把整块 16 步动作和真值轨迹画在一起比

# ② 在同一份数据上后训练（单卡）
python scripts/gr00t_finetune.py --dataset-path ./demo_data/robot_sim.PickNPlace --num-gpus 1
#    默认值：data_config=gr1_arms_only  embodiment_tag=new_embodiment
#            batch_size=16  learning_rate=1e-4  weight_decay=1e-5  warmup_ratio=0.05  max_steps=10000
```

下面 8 步按一个 batch 里的**一条样本**讲，batch 维记成 $B$。

<h3 id="实例-第-0-步加载权重决定训哪些参数">第 0 步：加载权重，决定训哪些参数</h3>

`GR00T_N1.from_pretrained()` 下载 2.2B 的权重，然后按四个开关冻结或放开参数。`gr00t_finetune.py` 的默认值如下：

| 开关 | 默认 | 管哪一块 | 对应论文 |
|------|------|---------|---------|
| `tune_llm` | **False** | Eagle-2 里的语言模型（SmolLM2） | 后训练冻结语言模型 |
| `tune_visual` | True | 视觉塔（SigLIP-2）和把图像特征投进 LLM 的 `mlp1` | 视觉编码器继续训 |
| `tune_projector` | True | 按本体的状态编码器、动作编码器、动作解码器，以及位置嵌入 | 各本体的 MLP |
| `tune_diffusion_model` | True | DiT 本体 | DiT 继续训 |

这四个开关和论文后训练的设置一一对应（冻结语言模型，其余继续训）。附带一个细节：`EagleBackbone.__init__` 会把 LLM 从 24 层删到只剩前 12 层，`lm_head` 也换成了 `Identity`。所以 LLM 的后 12 层**根本不在模型里**，冻不冻结和它们无关，推理时也不计算。

<h3 id="实例-第-1-步切出一个样本">第 1 步：从轨迹里切出一个样本</h3>

`LeRobotSingleDataset` 以某一帧为基准下标，把 `delta_indices` 加上去取数据。假设抽到某条轨迹的第 `base_index = 100` 帧：

```
video.ego_view   delta [0]          → 第 100 帧图像           (1, 256, 256, 3)
state.left_arm   delta [0]          → 第 100 帧左臂关节角     (1, 7)
state.right_arm / left_hand / right_hand  同上                (1, 7) (1, 6) (1, 6)
action.left_arm  delta [0..15]      → 第 100~115 帧左臂目标   (16, 7)
action.right_arm / left_hand / right_hand  同上               (16, 7) (16, 6) (16, 6)
annotation.human.action.task_description → "pick the pear from the counter and place it in the plate"
```

如果 100 离轨迹末尾不足 16 帧，超出的部分要补齐。这里的状态和动作都是**绝对量**（`absolute=True`），所以用 `"first_last"` 策略，即重复最后一帧；只有相对量才补 0。

<h3 id="实例-第-2-步图像状态动作的变换">第 2 步：图像、状态、动作的变换</h3>

`Gr1ArmsOnlyDataConfig.transform()` 按顺序做下面这些事：

**图像**：`VideoCrop(scale=0.95)` 裁掉边缘、保留 95% → `VideoResize` 到 **224×224** → `VideoColorJitter`（亮度 0.3、对比度 0.4、饱和度 0.5、色相 0.08）。

**状态：先取 sin / cos，再补零。** `StateActionSinCosTransform` 对每个关节角 $q$ 输出 $[\sin q,\cos q]$。例如某个关节角 $q=0.5$ rad：

$$
0.5 \;\mapsto\; [\sin 0.5,\ \cos 0.5] = [0.479,\ 0.878]
$$

26 维就这样变成 52 维。`GR00TTransform` 再补零到 `max_state_dim = 64`，同时生成 `state_mask`：前 52 位为 True，后 12 位为 False。状态只算 **1 个 token**（`state_horizon = 1`）。

**动作：min-max 归一化到 $[-1,1]$，再补零。** `StateActionTransform` 的 `min_max` 模式：

$$
\tilde a = 2\cdot\frac{a-\min}{\max-\min}-1
$$

以左臂第 0 维为例。demo 数据的 `meta/stats.json` 里，这一维 $\min=-0.01077$、$\max=0.03447$，均值 $0.02413$。把均值代进去：

$$
\tilde a = 2\cdot\frac{0.02413-(-0.01077)}{0.03447-(-0.01077)}-1 = 2\times0.7714-1 = \mathbf{0.543}
$$

16×26 的动作块补零到 `max_action_dim = 32`，变成 **16×32**。`action_mask` 标出前 26 列为真实维度，后 6 列是补的零。

**语言 + 图像 → 对话模板**：system 消息是 `"You are a helpful assistant."`，user 消息同时带任务文本和这张图像，交给 `EagleProcessor` 分词，得到 `input_ids` / `attention_mask` / `pixel_values`。

**本体编号**：`embodiment_id = 31`（微调用 `new_embodiment`；离线评测时用 `gr1`，编号是 24）。

变换结束后，一条样本长这样：

| 键 | 形状 | 说明 |
|----|------|------|
| `pixel_values` | 1×3×224×224 | 一帧图像 |
| `input_ids`, `attention_mask` | $S _ {\text{txt}}$ | 模板 + 任务文本 + 64 个图像占位符 |
| `state`, `state_mask` | 1×64 | 52 维 sin/cos，补零到 64 |
| `action`, `action_mask` | 16×32 | 26 维归一化动作，补零到 32 |
| `embodiment_id` | 标量 | 31 |

<h3 id="实例-第-3-步eagle-2-只跑到第-12-层">第 3 步：System 2 —— Eagle-2 只跑到第 12 层</h3>

1. **SigLIP-2 视觉塔**：224×224 的图、patch 14，得到 $16\times16=256$ 个 patch 特征，每个 1152 维。
2. **pixel shuffle**：`downsample_ratio = 0.5`，把 2×2 相邻的 patch 并成一个 token，$256/4=\mathbf{64}$ 个图像 token，再经 `mlp1` 投到 LLM 的宽度 2048。这就是论文里「每帧 64 个图像 token」。
3. **填进文本序列**：`get_embeddings()` 先把 `input_ids` 查成词向量，再把 64 个图像 token 写到 `<IMG_CONTEXT>` 占位符所在的位置。
4. **只跑前 12 层**：SmolLM2-1.7B 本来有 24 层，这里只剩前 12 层，取最后一层输出 `hidden_states[-1]`，也就是原模型的第 12 层。
5. **投到动作头的宽度**：`self.linear = Linear(2048, 1536)`（`projector_dim = 2048`）。

输出 $\phi_t$ 的形状是 $(B,\ S,\ 1536)$，其中 $S$ = 64 个图像 token + 模板和文本 token。**每块动作只算一次** $\phi_t$，后面四步去噪都复用它。

<h3 id="实例-第-4-步1-个状态-token--16-个带噪动作-token">第 4 步：System 1 的输入 —— 1 个状态 token + 16 个带噪动作 token</h3>

**① 采时间 $t$。** `sample_time()` 先从 $\mathrm{Beta}(1.5,1)$ 采一个 $u$，再令 $t=(0.999-u)/0.999$。$\mathrm{Beta}(1.5,1)$ 的均值是 $1.5/2.5=0.6$，所以 $t$ 的均值约为 $(0.999-0.6)/0.999=0.40$。训练因此偏向**噪声更多**的那一端（$t$ 小），和 π₀ 的做法同一族。

**② 加噪，定目标。** 为了能手算，**我取** $t=0.3$，并且只看上一步那个动作元素 $a=0.54$，假设它抽到的噪声是 $\epsilon=-0.8$：

$$
A^{t} = (1-t)\,\epsilon + t\,a = 0.7\times(-0.8)+0.3\times0.54 = -0.398
$$

$$
v = a-\epsilon = 0.54-(-0.8) = \mathbf{1.34}
$$

整个 16×32 的块都按这两行公式逐元素计算，噪声是同形状的 `torch.randn`。时间还要离散成桶号：`t_discretized = int(0.3 × 1000) = 300`。

**③ 编码状态。** `state_encoder` 是按本体选权重的两层 MLP：$64\to1024\to1536$，中间 ReLU，权重取第 31 套。输出 1 个 token，形状 $(B,1,1536)$。

**④ 编码带噪动作。** `MultiEmbodimentActionEncoder`，三层都是按本体选权重的线性层：

```
带噪动作 (B,16,32) ──W1──► (B,16,1536)
桶号 300 ──正弦位置编码──► (B,16,1536)   # 同一个 t 复制给 16 个时间步
拼接 (B,16,3072) ──W2──► swish ──W3──► (B,16,1536)
+ 可学习位置嵌入 position_embedding[0..15]
```

**⑤ 拼成 DiT 的输入序列**：`sa_embs = cat(state_features, action_features)`，形状 $(B,\ 1+16=\mathbf{17},\ 1536)$。

<h3 id="实例-第-5-步dit-前向交叉注意力和自注意力交替">第 5 步：DiT 前向 —— 交叉注意力和自注意力交替</h3>

checkpoint 的 `diffusion_model_cfg`：**16 层**，32 头 × 48 维 = 1536 维，`interleave_self_attention = true`，`norm_type = "ada_norm"`，`dropout = 0.2`。

| 第几层（从 0 数） | 注意力的 Q | 注意力的 K / V | 作用 |
|------|------|------|------|
| 0, 2, 4, …, 14（8 层） | 17 个状态 / 动作 token | $\phi_t$ 的 $S$ 个视觉语言 token | **交叉注意力**：动作读场景和指令 |
| 1, 3, 5, …, 15（8 层） | 17 个 token | 同样这 17 个 token | **自注意力**：16 步动作之间、动作和状态之间对齐 |

注意，**每层只有一个注意力模块**（`attn1`）：传了 `encoder_hidden_states` 它就是交叉注意力，没传就是自注意力。每层后面接一个 FFN（GELU-tanh）。

时间 $t$ 不放进序列里，而是通过 AdaLayerNorm 调制每一层：桶号 300 → `Timesteps(256)` 正弦编码 → `TimestepEmbedding` 得到 1536 维的 $e_t$，再按

$$
x \leftarrow \mathrm{LN}(x)\,(1+\text{scale}(e_t)) + \text{shift}(e_t)
$$

逐层缩放和平移。最后一层之后，再做一次同样的 AdaLN 调制，由 `proj_out_2` 输出 1024 维，然后交给按本体的 `action_decoder`：$1024\to1024\to32$，权重取第 31 套。输出的 17 个位置里取**最后 16 个**，形状 $(B,16,32)$，就是预测的速度。

> 🔎 **读代码时看到的一个细节**：`BasicTransformerBlock.forward` 里把 `encoder_attention_mask` 传给注意力的那一行**被注释掉了**，`DiT.forward` 调用每层时也传的是 `None`。所以交叉注意力没有用上视觉语言序列的 padding mask。这一点是源码里的事实；至于「批内有长短不一的指令时，动作 token 会注意到 padding 位置」，是**我据此做的推断**，我没有在这个仓库里做实验验证。

<h3 id="实例-第-6-步损失只在真实的-26-维上算">第 6 步：损失 —— 只在真实的 26 维上算</h3>

```python
loss = F.mse_loss(pred_actions, velocity, reduction="none") * action_mask
loss = loss.sum() / action_mask.sum()
```

继续上面那个元素，**假设**网络给出的预测是 $1.2$，目标是 $1.34$：

$$
(1.2-1.34)^2 = 0.0196
$$

每条样本的 `action_mask` 一共有 $16\times26=416$ 个真值位置，补零的 $16\times6=96$ 个位置乘以 0，不参与损失。分母是 mask 的总数，所以本体的动作维度不同，也不会让损失的量级不同。

这就是 GR00T N1 训练的**全部监督信号**：一条流匹配 MSE。没有 KL、没有对比损失，也没有语言建模损失。

<h3 id="实例-第-7-步四步欧拉从纯噪声到动作块">第 7 步：推理 —— 四步欧拉，从纯噪声到动作块</h3>

`Gr00tPolicy.get_action(obs)` 的流程：

1. 用同一套变换处理观测（推理时没有动作，也就不生成 `action` 键）；
2. `backbone(...)` 跑**一次**，得到 $\phi_t$；
3. `action_head.get_action(...)`：从 `torch.randn(B, 16, 32)` 出发，循环 $K$ 次。

$K=4$ 时 `dt = 0.25`，每一步：

| 步 | `t_cont` | 桶号 | 做什么 |
|----|---------|------|--------|
| 1 | 0.00 | 0 | 编码当前 $A$ → DiT → 解码出速度 $\hat v$ → $A\leftarrow A+0.25\,\hat v$ |
| 2 | 0.25 | 250 | 同上，DiT 用新的 $A$ 重新预测 $\hat v$ |
| 3 | 0.50 | 500 | 同上 |
| 4 | 0.75 | 750 | 同上，结束时 $A$ 就是归一化空间里的 16×32 动作块 |

整块动作 = 1 次 VLM 前向 + 4 次 DiT 前向。论文 §2 测的 **63.9 ms**（L40、bf16）就是这一整套的耗时。

> ⚠️ **$K$ 的默认值有两处写法不一致**：论文写 $K=4$。`scripts/eval_policy.py` 和 `deployment_scripts/gr00t_inference.py` 的 `--denoising_steps` 默认也是 4，`getting_started/5_policy_deployment.md` 还写了「4 步与 16 步效果相当」。但发布的 checkpoint `config.json` 里 `num_inference_timesteps` 是 **16**。如果自己写代码时直接 `from_pretrained` 然后调 `get_action`，不经过 `Gr00tPolicy(denoising_steps=4)`，跑的就是 16 步。

**反归一化**：取前 26 列，用 min-max 的逆变换 $a=(\tilde a+1)/2\cdot(\max-\min)+\min$ 还原：

$$
0.543 \;\to\; \frac{0.543+1}{2}\times0.04524-0.01077 = 0.02413
$$

`ConcatTransform.unapply` 再按 `left_arm(7) / right_arm(7) / left_hand(6) / right_hand(6)` 切开。最后返回 `action.left_arm` 等 4 个键，形状分别是 (16,7)、(16,7)、(16,6)、(16,6)。补的 6 列不属于任何键，直接丢掉。

<h3 id="实例-第-8-步一块动作覆盖多长时间">第 8 步：一块动作覆盖多长时间</h3>

「16 步」在不同地方对应的时间不一样，下面分开写：

| 口径 | 16 步对应的时间 | 出处 |
|------|----------------|------|
| demo 数据（20 fps） | $16/20=0.8$ s 的轨迹 | `meta/info.json` 的 `fps: 20.0` |
| 论文 GR-1 遥操采集 | 同样 20 Hz，即 0.8 s | 论文 §2.2 |
| 论文部署口径（120 Hz 动作率） | $16/120\approx133$ ms | 论文 §2 |
| 一次采样耗时 | 63.9 ms（L40、bf16） | 论文 §2 |

离线评测脚本 `utils/eval.py` 的做法是：每到 `step_count % 16 == 0` 就调用一次 `get_action`，然后把 16 步**整块开环**播完，再推理下一块。

论文和 `n1-release` 代码都**没有说明** 20 Hz 采集的数据怎样对应到 120 Hz 的动作率。我推测部署端会在动作块内部做时间插值，但这只是推测，仓库里找不到对应代码。所以正文和动画里「133 ms」只是按论文 120 Hz 的换算，不是从代码里读出来的。

</details>

---

## 📊 实验里实际报了什么

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Table 2 / Table 3 的加权平均、预训练的两个真机任务、DexMG 两张表对不上</summary>

对照是 RoboMimic 的 **BC-Transformer**（10 帧观测 → 10 步动作，高斯混合）和 **Diffusion Policy**（单帧观测，U-Net，一次 16 步）。仿真成功率是 100 次试验的平均，取最后 5 个 checkpoint（每 500 步存一次）里的最高分。真机一般每任务 10 次；Pack Machinery 是 30 秒内 5 个零件放进箱子的比例，只做 5 次。

**仿真，每任务 100 条演示（Table 2）。** 单位是成功率 %。

| | RoboCasa（24） | DexMG（9） | GR-1（24） | 论文的 Average |
|--|--|--|--|--|
| BC-Transformer | 26.3 | 53.9 | 16.1 | 26.4 |
| Diffusion Policy | 25.6 | 56.1 | 32.7 | 33.4 |
| GR00T-N1-2B | 32.1 | 66.5 | 50.0 | 45.0 |

Average **不是三列再平均**。按任务数加权，$24+9+24=57$：

$$
\frac{32.1\times24+66.5\times9+50.0\times24}{57}=45.07
$$

论文印成 45.0。DP 同样复核是 33.41，印成 33.4。GR-1 这一列 $50.0-32.7=17.3$，对应正文「超过 17 个点」。

附录 Table 4 把 DexMG 的 9 个任务直接平均，100 条演示时 DP 是 **46.9**、GR00T 是 **58.5**，和 Table 2 的 56.1 / 66.5 对不上。RoboCasa 和 GR-1 两列两张表一致。本笔记引用 Table 2 作为论文的主表，不把附录的 9 任务平均混进主表。

附录里还能看见数据档，不宜只记 100 条这一列。GR-1 仿真上 GR00T 在 30 / 100 / 300 条时是 43.2 / 50.0 / **49.3**：300 条并没有比 100 条更高。RoboCasa 上则是 17.4 / 32.1 / 49.6，仍高于 DP 的 14.7 / 25.6 / 43.2。

**真机 GR-1（Table 3）。** 平均按任务数加权：取放 5 + 关节物体 3 + 工业 3 + 双机协作 2 = 13。全量 GR00T 四类是 82.0 / 70.9 / 70.0 / 82.5，加权复核 76.75，论文印 **76.8**。

| | 10% 数据 | 全量 |
|--|--|--|
| Diffusion Policy | 10.2 | 46.4 |
| GR00T-N1-2B | 42.6 | 76.8 |

正文用的差值就是这两个印出来的平均：10% 数据上 GR00T 比 DP 高 **32.4** 个点；全量高 **30.4** 个点；GR00T 只用 10% 数据，比 DP 的全量低 **3.8** 个点。Table 5 把取放再拆开：见过的物体全量平均 92%，没见过的 72%。

**不微调的预训练权重**，在真机上另有两个任务，各 5 个物体、每物体 3 次：左手够不着、必须换手再放到架子上，**11.5/15（论文写作 76.6%）**；新物体放进没见过的容器，**11/15（73.3%）**。0.5 分表示抓住了但没放进容器。定性例子里，预训练模型能把放在身体左侧的红苹果换手放进篮子；后训练数据若全是右手，这个换手会消失。苹果是桌面上的操作，不是导航到厨房。

</details>

---

### 实验数字自己算

<div class="paper-demo" data-demo="groot-results"><p class="demo-fallback">（实验图需要启用 JavaScript；上方表格列有原始数值）</p></div>

交互图只重算论文 Table 2 的 **100 条/任务、后训练后的仿真**成功率。RoboCasa 与 GR-1 各 24 个任务，DexMG 9 个任务；因此总平均按任务数加权。切换模型可以查看每一列如何贡献平均值；论文印刷平均可能与显示到一位小数的分项复算结果相差 0.1 个点，保留两种数值供核对。

---

## ⚠️ 边界

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：短程桌面、后训练会忘掉换手、合成数据仍受物理约束</summary>

- **任务范围**停在短时程桌面。论文没有报行走、没有报「去另一个房间拿苹果」。
- **真机数字只有 Fourier GR-1。** 仿真里的跨本体不能写成「同一份权重在两台人形上成功率一样」。
- **后训练会改掉预训练里的行为。** 右手数据上的微调，把左侧换手学没了。数据效率的收益和这种遗忘是同时存在的。
- **合成数据**被作者自己标成还不够：视频模型要多样、要反事实，还得守物理；这三件还没同时做好。
- **DexMG 的主表和附录平均不一致**，引用时要写明是 Table 2 还是 Table 4。

</details>

---

## 📁 Isaac-GR00T 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（13 节）：源码类图 / 源码运行时序图 / 1. 顶层 GR00T_N1 / 2. Eagle 骨干删到第 12 层 / 3. GR00TTransform 补零与本体编号 / 4. 按本体选权重的线性层 / 5. 动作编码器 / 6. DiT 交叉与自注意力交替 / 7. 训练前向：流匹配损失 / 8. 推理：K 步欧拉 / 9. 配置与超参数 / 10. 论文与代码对照表 / 关键文件速查</summary>

以下代码摘自 [NVIDIA/Isaac-GR00T](https://github.com/NVIDIA/Isaac-GR00T/tree/n1-release) 的 **`n1-release` 标签**（commit `755876a`，2025-06-10）。`main` 分支后来改成了 N1.5 / N1.6 的实现，文件路径和类名都变了，对照 N1 论文时请切到这个标签。代码只删去了日志和参数校验，保留原有逻辑；中文注释是我加的。

<h3 id="源码-类图">源码类图：GR00T N1 由哪些模块组成</h3>

<div class="mermaid">
classDiagram
    class Gr00tPolicy {
        policy.py 推理入口
        +get_action(obs)
        #apply_transforms()
        #unapply_transforms()
    }
    class GR00T_N1 {
        gr00t_n1.py
        +forward(inputs) 训练
        +get_action(inputs) 推理
    }
    class EagleBackbone {
        eagle_backbone.py System 2
        select_layer=12
        +forward(vl_input)
    }
    class FlowmatchingActionHead {
        flow_matching_action_head.py System 1
        +forward() 流匹配 MSE
        +get_action() K 步欧拉
        #sample_time() Beta 采样
    }
    class DiT {
        cross_attention_dit.py
        16 层 交叉/自注意力交替
        +forward(hidden, encoder_hidden, timestep)
    }
    class CategorySpecificMLP {
        按 embodiment_id 选权重
    }
    class MultiEmbodimentActionEncoder {
        动作 + 时间步编码
    }
    class GR00TTransform {
        transforms.py
        补零到 64 / 32
        打 embodiment_id
    }
    Gr00tPolicy o-- GR00T_N1 : model
    Gr00tPolicy o-- GR00TTransform : modality_transform
    GR00T_N1 o-- EagleBackbone : backbone
    GR00T_N1 o-- FlowmatchingActionHead : action_head
    FlowmatchingActionHead o-- DiT : model
    FlowmatchingActionHead o-- CategorySpecificMLP : state_encoder / action_decoder
    FlowmatchingActionHead o-- MultiEmbodimentActionEncoder : action_encoder
</div>

- **System 2 与 System 1 的边界**就是 `GR00T_N1` 里的两个成员：`backbone`（Eagle-2）和 `action_head`（流匹配 DiT）。两者之间只传一个张量 `backbone_features`，也就是 $\phi_t$。
- **跨本体**全部由 `CategorySpecificMLP` / `MultiEmbodimentActionEncoder` 实现：同一个模块里存 32 套权重，用 `embodiment_id` 查表选出其中一套。DiT 和 Eagle 是所有本体共享的。

<h3 id="源码-运行时序图">源码运行时序图</h3>

下图以 `python scripts/eval_policy.py --model_path nvidia/GR00T-N1-2B` 为入口，画一次推理的调用顺序（方法名对应 `n1-release` 的真实源码）：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant E as eval_policy
    participant P as Gr00tPolicy
    participant T as Transform
    participant B as Eagle 骨干
    participant H as 动作头
    participant D as DiT
    E->>P: get_action(obs)
    P->>T: apply()：224、sin/cos、补零
    P->>B: forward()：前 12 层
    B-->>P: φ_t (B,S,1536)
    P->>H: get_action(φ_t, state, id)
    H->>H: 状态 token；A ← randn(16,32)
    loop K 次（脚本默认 4）
        H->>D: 17 个 token + φ_t + 桶号
        D-->>H: (B,17,1024)
        H->>H: 解码速度；A += dt·v
    end
    H-->>P: action_pred (B,16,32)
    P->>T: unapply()：切键、反归一化
    P-->>E: 4 个动作键
</div>

- ② 对应上文「具体实例」第 2 步；③④ 对应第 3 步（图中把 `GR00T_N1.get_action()` 这一层省掉了，它只是依次调用骨干和动作头）；⑤–⑩ 对应第 4、5、7 步；⑪⑫ 对应第 7 步末尾的反归一化。
- 训练走的是 `GR00T_N1.forward()`：同样先调用 `backbone`，然后调用 `action_head.forward()`，只前向一次 DiT，返回 `loss`。`GR00TTrainer.compute_loss()` 直接取 `outputs["loss"]`。

<h3 id="源码-1-顶层-gr00t_n1">1. 顶层 GR00T_N1：两个子模块，一个中间张量</h3>

```python
# gr00t/model/gr00t_n1.py
class GR00T_N1(PreTrainedModel):
    def __init__(self, config, local_model_path):
        ...
        self.backbone = EagleBackbone(**config.backbone_cfg)            # System 2：Eagle-2 VLM
        action_head_cfg = FlowmatchingActionHeadConfig(**config.action_head_cfg)
        self.action_head = FlowmatchingActionHead(action_head_cfg)      # System 1：流匹配 DiT

    def forward(self, inputs):                                          # 训练
        backbone_inputs, action_inputs = self.prepare_input(inputs)
        backbone_outputs = self.backbone(backbone_inputs)               # → backbone_features = φ_t
        action_head_outputs = self.action_head(backbone_outputs, action_inputs)  # → {"loss": ...}
        return action_head_outputs

    def get_action(self, inputs):                                       # 推理
        backbone_inputs, action_inputs = self.prepare_input(inputs)
        backbone_outputs = self.backbone(backbone_inputs)               # VLM 只跑这一次
        action_head_outputs = self.action_head.get_action(backbone_outputs, action_inputs)
        return action_head_outputs                                      # → {"action_pred": (B,16,32)}
```

论文所说的「两个系统端到端一起训」，在代码里就是这一个 `forward`：损失只在动作头里算，梯度经 `backbone_features` 回传到视觉塔。LLM 默认冻结，所以不更新。

`from_pretrained()` 额外接收四个开关，默认值是 `tune_visual=True, tune_llm=False, tune_projector=True, tune_diffusion_model=True`，分别调用 `backbone.set_trainable_parameters()` 和 `action_head.set_trainable_parameters()`。

<h3 id="源码-2-eagle-骨干删到第-12-层">2. Eagle 骨干：「取第 12 层」其实是删掉后 12 层</h3>

```python
# gr00t/model/backbone/eagle_backbone.py - EagleBackbone.__init__()
self.model.language_model.lm_head = torch.nn.Identity()      # 不要词表输出头
while len(self.model.language_model.model.layers) > select_layer:   # select_layer = 12
    self.model.language_model.model.layers.pop(-1)            # SmolLM2 的 24 层删到只剩前 12 层
...
if projector_dim != -1:
    self.linear = torch.nn.Linear(projector_dim, 1536)        # 2048 → 1536，对齐 DiT 宽度
```

```python
# gr00t/model/backbone/eagle_backbone.py - get_embeddings()
vit_embeds = self.extract_feature(pixel_values)               # SigLIP-2 + pixel shuffle + mlp1 → 每帧 64 个 token
input_embeds = self.language_model.get_input_embeddings()(input_ids)
selected = input_ids == self.img_context_token_id             # 找到文本里的图像占位符
input_embeds[selected] = vit_embeds.reshape(-1, C)            # 把图像 token 写进这些位置
embeddings = self.language_model.forward(inputs_embeds=input_embeds,
                                         attention_mask=attention_mask,
                                         output_hidden_states=True)
embeddings = embeddings.hidden_states[-1]                     # 只剩 12 层，[-1] 就是第 12 层
```

论文说用中间层「推理更快、下游成功率更高」。「更快」在代码里的来源很直接：后 12 层被 `pop` 掉，根本不计算。「成功率更高」是论文的实验结论，代码里看不出来。

<h3 id="源码-3-gr00ttransform-补零与本体编号">3. GR00TTransform：补零到 64 / 32，打上本体编号</h3>

```python
# gr00t/model/transforms.py
class GR00TTransform(InvertibleModalityTransform):
    _EMBODIMENT_TAG_MAPPING = {
        "gr1": 24,                    # 预训练里 GR-1 用第 24 套投影
        "new_embodiment": 31,         # 新本体一律用最后一套（共 32 套）
    }

    def _prepare_state(self, data):
        state = data["state"]                                    # (1, 52)：26 个关节的 sin/cos
        n_state_dims = state.shape[-1]
        if n_state_dims > self.max_state_dim:                    # 超过 64 维直接截断
            state = state[:, : self.max_state_dim]
            n_state_dims = self.max_state_dim
        else:
            state = np.pad(state, ((0, 0), (0, self.max_state_dim - n_state_dims)), "constant")
        state_mask = np.zeros_like(state).astype(bool)
        state_mask[:, :n_state_dims] = True                      # 标出真实维度
        return state, state_mask, state.shape[0]                 # 状态只有 1 个 token

    def _prepare_action(self, data):
        actions = data["action"]                                 # (16, 26)
        n_action_dims = actions.shape[1]
        assert n_action_dims <= self.max_action_dim              # 动作超过 32 维会直接报错
        actions = np.pad(actions, ((0, 0), (0, self.max_action_dim - n_action_dims)), "constant")
        actions_mask = np.zeros((actions.shape[0], self.max_action_dim), dtype=bool)
        actions_mask[:, :n_action_dims] = True                   # 损失只算这 26 列
        return actions, actions_mask, actions.shape[0]
```

「一个模型支持不同维度的本体」在数据侧就是**补零 + mask**：状态上限 64 维，动作上限 32 维。状态超出会被截断，动作超出则直接报错。所以新本体的动作维度不能超过 32（这是 `n1-release` 的限制）。

<h3 id="源码-4-按本体选权重的线性层">4. 按本体选权重的线性层：一张表里存 32 套 W</h3>

```python
# gr00t/model/action_head/flow_matching_action_head.py
class CategorySpecificLinear(nn.Module):
    def __init__(self, num_categories, input_dim, hidden_dim):
        super().__init__()
        self.W = nn.Parameter(0.02 * torch.randn(num_categories, input_dim, hidden_dim))  # (32, in, out)
        self.b = nn.Parameter(torch.zeros(num_categories, hidden_dim))

    def forward(self, x, cat_ids):
        selected_W = self.W[cat_ids]                       # 每条样本按 embodiment_id 取自己那套权重
        selected_b = self.b[cat_ids]
        return torch.bmm(x, selected_W) + selected_b.unsqueeze(1)

class CategorySpecificMLP(nn.Module):                      # 两层版：状态编码器、动作解码器都用它
    def forward(self, x, cat_ids):
        hidden = F.relu(self.layer1(x, cat_ids))
        return self.layer2(hidden, cat_ids)
```

一个 batch 里可以混着不同本体的样本，`bmm` 逐样本各用各的权重。这就是论文「每个本体一套 MLP」的实现方式。它们没有写成 32 个独立的 `nn.Linear`，而是存在一个张量里，用下标索引。

<h3 id="源码-5-动作编码器动作--时间步">5. 动作编码器：把带噪动作和时间步编进同一个 token</h3>

```python
# gr00t/model/action_head/flow_matching_action_head.py
class MultiEmbodimentActionEncoder(nn.Module):
    def __init__(self, action_dim, hidden_size, num_embodiments):
        self.W1 = CategorySpecificLinear(num_embodiments, action_dim, hidden_size)      # 32 → 1536
        self.W2 = CategorySpecificLinear(num_embodiments, 2 * hidden_size, hidden_size) # 3072 → 1536
        self.W3 = CategorySpecificLinear(num_embodiments, hidden_size, hidden_size)     # 1536 → 1536
        self.pos_encoding = SinusoidalPositionalEncoding(hidden_size)

    def forward(self, actions, timesteps, cat_ids):
        B, T, _ = actions.shape                                     # (B, 16, 32)
        timesteps = timesteps.unsqueeze(1).expand(-1, T)            # 同一个桶号复制给 16 个时间步
        a_emb = self.W1(actions, cat_ids)                           # (B, 16, 1536)
        tau_emb = self.pos_encoding(timesteps).to(dtype=a_emb.dtype)  # 桶号的正弦编码 (B, 16, 1536)
        x = torch.cat([a_emb, tau_emb], dim=-1)                     # (B, 16, 3072)
        x = swish(self.W2(x, cat_ids))
        x = self.W3(x, cat_ids)                                     # (B, 16, 1536)
        return x
```

去噪时间 $\tau$ 在模型里用了**两次**：这里拼进每个动作 token，DiT 的每层 AdaLayerNorm 又用了一次（见下一节）。

<h3 id="源码-6-dit-交叉与自注意力交替">6. DiT：交叉注意力和自注意力隔层交替，时间走 AdaLN</h3>

```python
# gr00t/model/action_head/cross_attention_dit.py
class AdaLayerNorm(nn.Module):
    def forward(self, x, temb):
        temb = self.linear(self.silu(temb))
        scale, shift = temb.chunk(2, dim=1)
        x = self.norm(x) * (1 + scale[:, None]) + shift[:, None]   # 时间步调制 LayerNorm
        return x

class BasicTransformerBlock(nn.Module):
    def forward(self, hidden_states, attention_mask=None, encoder_hidden_states=None,
                encoder_attention_mask=None, temb=None):
        norm_hidden_states = self.norm1(hidden_states, temb)        # ada_norm
        attn_output = self.attn1(
            norm_hidden_states,
            encoder_hidden_states=encoder_hidden_states,           # 传了就是交叉注意力，None 就是自注意力
            attention_mask=attention_mask,
            # encoder_attention_mask=encoder_attention_mask,       # ← 原文就是注释掉的
        )
        hidden_states = attn_output + hidden_states
        norm_hidden_states = self.norm3(hidden_states)
        hidden_states = self.ff(norm_hidden_states) + hidden_states  # FFN
        return hidden_states

class DiT(ModelMixin, ConfigMixin):
    def forward(self, hidden_states, encoder_hidden_states, timestep=None, ...):
        temb = self.timestep_encoder(timestep)                      # 桶号 → 1536 维
        for idx, block in enumerate(self.transformer_blocks):       # 16 层
            if idx % 2 == 1 and self.config.interleave_self_attention:
                hidden_states = block(hidden_states, encoder_hidden_states=None, temb=temb)  # 奇数层：自注意力
            else:
                hidden_states = block(hidden_states, encoder_hidden_states=encoder_hidden_states,
                                      temb=temb)                    # 偶数层：交叉注意力读 φ_t
        shift, scale = self.proj_out_1(F.silu(temb)).chunk(2, dim=1)
        hidden_states = self.norm_out(hidden_states) * (1 + scale[:, None]) + shift[:, None]
        return self.proj_out_2(hidden_states)                       # → 1024 维
```

- 论文 Figure 3 画的是「自注意力 + 交叉注意力」。代码里**每层只有一种**，靠 `interleave_self_attention=true` 隔层交替，16 层中交叉、自注意力各 8 层。
- 这就是论文和 π₀ 的区别：π₀ 让动作 token 与 VLM token 在同一个 Transformer 里做 MoE 式的联合注意力，GR00T 只让动作 token 用 cross-attention 去「读」VLM 的输出，VLM 自己不看动作。

<h3 id="源码-7-训练前向流匹配损失">7. 训练前向：流匹配损失（对照上文第 4–6 步）</h3>

```python
# gr00t/model/action_head/flow_matching_action_head.py - FlowmatchingActionHead
def sample_time(self, batch_size, device, dtype):
    sample = self.beta_dist.sample([batch_size]).to(device, dtype=dtype)   # Beta(1.5, 1.0)
    return (self.config.noise_s - sample) / self.config.noise_s            # s = 0.999，偏向小 t（噪声多）

def forward(self, backbone_output, action_input):
    vl_embeds = backbone_output.backbone_features                 # φ_t (B, S, 1536)
    embodiment_id = action_input.embodiment_id
    state_features = self.state_encoder(action_input.state, embodiment_id)   # (B, 1, 1536)

    actions = action_input.action                                 # (B, 16, 32)，已归一化
    noise = torch.randn(actions.shape, device=actions.device, dtype=actions.dtype)
    t = self.sample_time(actions.shape[0], device=actions.device, dtype=actions.dtype)
    t = t[:, None, None]

    noisy_trajectory = (1 - t) * noise + t * actions              # A^τ = (1-τ)ε + τA
    velocity = actions - noise                                    # 目标 v = A - ε（不是 ar5iv Eq.1 的 ε - A）

    t_discretized = (t[:, 0, 0] * self.num_timestep_buckets).long()   # 连续 τ → 0..999 的桶号
    action_features = self.action_encoder(noisy_trajectory, t_discretized, embodiment_id)
    if self.config.add_pos_embed:
        pos_ids = torch.arange(action_features.shape[1], dtype=torch.long, device=vl_embeds.device)
        action_features = action_features + self.position_embedding(pos_ids).unsqueeze(0)

    sa_embs = torch.cat((state_features, action_features), dim=1) # (B, 17, 1536)
    model_output = self.model(hidden_states=sa_embs,
                              encoder_hidden_states=vl_embeds,
                              encoder_attention_mask=backbone_output.backbone_attention_mask,
                              timestep=t_discretized)
    pred = self.action_decoder(model_output, embodiment_id)       # (B, 17, 32)
    pred_actions = pred[:, -actions.shape[1]:]                    # 只取后 16 个动作位置

    action_mask = action_input.action_mask
    loss = F.mse_loss(pred_actions, velocity, reduction="none") * action_mask
    loss = loss.sum() / action_mask.sum()                         # 只在真实维度上平均
    return BatchFeature(data={"loss": loss})
```

<h3 id="源码-8-推理k-步欧拉">8. 推理：K 步欧拉（对照上文第 7 步）</h3>

```python
# gr00t/model/action_head/flow_matching_action_head.py - FlowmatchingActionHead
@torch.no_grad()
def get_action(self, backbone_output, action_input):
    vl_embeds = backbone_output.backbone_features
    embodiment_id = action_input.embodiment_id
    state_features = self.state_encoder(action_input.state, embodiment_id)   # 状态 token 只算一次

    batch_size = vl_embeds.shape[0]
    actions = torch.randn(size=(batch_size, self.config.action_horizon, self.config.action_dim),
                          dtype=vl_embeds.dtype, device=vl_embeds.device)   # τ=0：纯噪声 (B,16,32)

    num_steps = self.num_inference_timesteps                      # Gr00tPolicy 传 4；config.json 里是 16
    dt = 1.0 / num_steps
    for t in range(num_steps):
        t_cont = t / float(num_steps)                             # 0, 0.25, 0.5, 0.75
        t_discretized = int(t_cont * self.num_timestep_buckets)   # 0, 250, 500, 750
        timesteps_tensor = torch.full(size=(batch_size,), fill_value=t_discretized, device=vl_embeds.device)
        action_features = self.action_encoder(actions, timesteps_tensor, embodiment_id)
        # ...（加位置嵌入，同训练）
        sa_embs = torch.cat((state_features, action_features), dim=1)
        model_output = self.model(hidden_states=sa_embs, encoder_hidden_states=vl_embeds,
                                  timestep=timesteps_tensor)
        pred = self.action_decoder(model_output, embodiment_id)
        pred_velocity = pred[:, -self.action_horizon:]
        actions = actions + dt * pred_velocity                    # 欧拉一步：A ← A + (1/K)·v
    return BatchFeature(data={"action_pred": actions})
```

训练时 `t=1` 是数据端，推理时 $\tau$ 从 0 走到 1，方向一致。所以速度必须是 `actions - noise`：如果按 ar5iv 上 Eq.(1) 的 $\epsilon-A$ 训练，同一条更新 `actions + dt * pred` 会把动作推离数据。

```python
# gr00t/model/policy.py - Gr00tPolicy.__init__()
self._load_metadata(self.model_path / "experiment_cfg")        # 归一化统计量取自 checkpoint，而不是当前数据集
if denoising_steps is not None:
    self.model.action_head.num_inference_timesteps = denoising_steps   # eval / 部署脚本默认传 4
```

`_load_metadata()` 从 checkpoint 的 `experiment_cfg/metadata.json` 里，按 `embodiment_tag` 读出归一化用的 min / max。所以离线评测预训练权重时，用的是 checkpoint 自带的 `gr1` 统计量。「具体实例」第 2、7 步用 demo 数据的 `stats.json` 手算，对应的是**在 demo 数据上微调之后**保存下来的那份统计量。

<h3 id="源码-9-配置与超参数">9. 配置与超参数（`nvidia/GR00T-N1-2B/config.json` + 微调脚本）</h3>

```yaml
# Hugging Face: nvidia/GR00T-N1-2B/config.json（节选，改写成 YAML 便于阅读）
backbone_cfg:
  select_layer: 12            # LLM 只留前 12 层
  projector_dim: 2048         # SmolLM2-1.7B 的隐藏宽度 → Linear 到 1536
  tune_llm: false
  tune_visual: true
  processor_cfg:
    model_spec: {num_image_token: 64, template: qwen2-chat}
action_head_cfg:
  action_horizon: 16          # H = 16
  action_dim: 32              # = max_action_dim，按本体补零
  max_state_dim: 64
  hidden_size: 1024           # 状态编码器中间层、DiT 输出、动作解码器宽度
  input_embedding_dim: 1536   # 状态 / 动作 token 宽度，与 φ_t 相同
  noise_beta_alpha: 1.5       # τ 的 Beta(1.5, 1)
  noise_beta_beta: 1.0
  noise_s: 0.999
  num_timestep_buckets: 1000
  num_inference_timesteps: 16 # ← checkpoint 写的是 16；论文与脚本用 4
  diffusion_model_cfg:
    num_layers: 16
    num_attention_heads: 32
    attention_head_dim: 48    # 32 × 48 = 1536
    interleave_self_attention: true
    norm_type: ada_norm
    dropout: 0.2
    output_dim: 1024
```

Eagle-2 自己的配置（`gr00t/model/backbone/eagle2_hg_model/config.json`）里：LLM 是 `SmolLM2-1_7B-Instruct`（24 层，宽 2048），视觉塔是 SigLIP（27 层，宽 1152，输入 224、patch 14），`downsample_ratio: 0.5`。

微调脚本 `scripts/gr00t_finetune.py` 的默认值：`batch_size=16`、`learning_rate=1e-4`、`weight_decay=1e-5`、`warmup_ratio=0.05`、`max_steps=10000`、`lora_rank=0`（不开 LoRA）。论文写的仿真后训练默认是全局 batch 1024、6 万步（见上文「跨本体」一节），两者口径不同：脚本是给单卡跑 demo 用的默认值。

<h3 id="源码-10-论文与代码对照表">10. 论文与代码对照表</h3>

| 论文里的说法 | `n1-release` 源码 |
|------------|-----------------|
| ✅ 取 LLM 第 12 层 | `select_layer=12`，删掉后 12 层后取 `hidden_states[-1]` |
| ✅ 每帧 64 个图像 token | `num_image_token: 64`，224/14=16 → 256 patch，pixel shuffle 0.5 → 64 |
| ✅ 动作块 $H=16$ | `action_horizon: 16`，`action_indices = range(16)` |
| ✅ 速度目标 $v=A-\epsilon$ | `velocity = actions - noise`（ar5iv 上 Eq.(1) 印成 $\epsilon-A$，和代码相反） |
| ✅ $\tau\sim\mathrm{Beta}((s-\tau)/s;1.5,1)$，$s=0.999$ | `sample_time()` 里 `(noise_s - Beta(1.5,1)) / noise_s` |
| ⚠️ 推理 $K=4$ | `eval_policy.py` / 部署脚本默认 `--denoising_steps 4`；checkpoint 的 `config.json` 是 16 |
| ✅ 每个本体一套状态 / 动作 MLP | `CategorySpecificLinear`，32 套权重，按 `embodiment_id` 索引 |
| ✅ DiT 自注意力 + 交叉注意力 | 16 层隔层交替，每层只有一种注意力（比论文的图更具体） |
| ✅ 时间步用 AdaLN 注入 | `norm_type: ada_norm` + 动作编码器里再拼一次 |
| ✅ 后训练冻结语言模型 | `tune_llm=False` |
| ❌ 潜动作 LAPA、IDM 伪动作、神经轨迹 | 仓库里**没有**训练代码；`dataset.py` 只留了 `lapa_action` / `dream_actions` 两个键名的特判 |
| ❌ 预训练数据混合比例 | 仓库只有单数据集微调的入口 |

✅ 一致，⚠️ 有出入，❌ 仓库里没有。所以这个仓库能完整复现的是**后训练和推理**这一半。数据金字塔、潜动作、神经轨迹这些预训练侧的做法，只能以论文 §2.2–3 的文字为准。

<h3 id="源码-关键文件速查">关键文件速查</h3>

| 文件（`n1-release`） | 看什么 |
|------|--------|
| `gr00t/model/gr00t_n1.py` | 顶层模型，`forward` / `get_action` / 四个 `tune_*` 开关 |
| `gr00t/model/backbone/eagle_backbone.py` | 删到第 12 层、图像 token 写进文本序列、2048→1536 |
| `gr00t/model/action_head/flow_matching_action_head.py` | 流匹配加噪、损失、K 步欧拉、按本体的 MLP |
| `gr00t/model/action_head/cross_attention_dit.py` | DiT、AdaLayerNorm、交叉 / 自注意力交替 |
| `gr00t/model/transforms.py` | `GR00TTransform`：补零到 64 / 32、`embodiment_id`、对话模板 |
| `gr00t/experiment/data_config.py` | 各本体的键、`delta_indices`、图像增强和归一化方式 |
| `gr00t/data/transform/state_action.py` | `min_max` / `q99` / `mean_std` 归一化和 sin/cos |
| `gr00t/model/policy.py` | `Gr00tPolicy`：读 checkpoint 统计量、设 `denoising_steps`、反归一化 |
| `scripts/gr00t_finetune.py` / `scripts/eval_policy.py` | 后训练与离线评测入口 |

```bash
git clone https://github.com/NVIDIA/Isaac-GR00T.git && cd Isaac-GR00T
git checkout n1-release                                    # 与 N1 论文对应的版本
grep -n "velocity = actions - noise" -r gr00t/             # 流匹配目标
grep -n "select_layer" -r gr00t/model/backbone/            # 第 12 层
grep -n "interleave_self_attention" -r gr00t/model/        # 交叉 / 自注意力交替
grep -n "_EMBODIMENT_TAG_MAPPING" -A3 gr00t/model/transforms.py   # 本体编号
```

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：六问 —— 两个频率、为什么是交叉注意力、无动作视频、10% 数据、源码里两个系统怎么接、模型做不了什么</summary>

**Q：System 1 和 System 2 各管什么，120 Hz 是什么？**  
A：System 2 是 Eagle-2，读图像和语言，GR00T-N1-2B 用第 12 层，论文写 L40 上 10 Hz。System 1 是流匹配 DiT，交叉注意力读这些 token，一次生成 16 步动作，测得 63.9 ms。120 Hz 是这 16 步的播放节拍：16 步要播 133 ms，算得比播得快。不是整网每秒前向 120 次。

**Q：为什么动作头用流匹配 DiT，而且用交叉注意力而不是 MoE？**  
A：动作分布是多模态的，流匹配沿直线从噪声走到数据，4 步欧拉就够用。交叉注意力把 VLM 和动作头拆开，换骨干不用改成 mixture-of-experts；不同本体靠各自的状态 / 动作 MLP 对齐维度。速度目标是 $A-\epsilon$，与 Isaac-GR00T 的 `actions - noise` 一致。

**Q：人类视频没有动作，怎么和真机数据一起训？**  
A：VQ-VAE 从当前帧和未来帧抽出潜动作，当成 LAPA 这一种本体，损失仍是流匹配。神经轨迹再加一个逆动力学模型的伪动作。真机数据则真值和潜动作都用。这和「数据金字塔分三层」是两件事：金字塔说数据放哪，潜动作说标签从哪来。

**Q：10% 数据那个结论到底强在哪？**  
A：真机 13 个任务的加权平均里，GR00T 用 10% 遥操达到 42.6%，Diffusion Policy 用全量是 46.4%，只差 3.8 个点；同一 10% 数据上 DP 只有 10.2%。这是后训练的数据效率，不是零样本。仿真 GR-1 上 300 条演示（49.3%）并没有好过 100 条（50.0%），不能说数据越多一定越好。

**Q：开源代码里 System 2 和 System 1 是怎么接起来的？**  
A：`GR00T_N1` 只有两个成员：`backbone`（Eagle-2，LLM 只保留前 12 层，输出再经 `Linear(2048→1536)`）和 `action_head`（流匹配 DiT）。两者之间只传一个 `backbone_features` 张量 $\phi_t$。DiT 的 16 层隔层交替：偶数层用交叉注意力读 $\phi_t$，奇数层在 1 个状态 token + 16 个动作 token 之间做自注意力；时间步通过 AdaLayerNorm 注入。跨本体靠 `CategorySpecificLinear` 在 32 套权重里按 `embodiment_id` 取一套，状态补零到 64 维、动作补零到 32 维，损失用 `action_mask` 只算真实维度。

**Q：它现在做不了什么？**  
A：长程移动操作。真机表也只有 GR-1。后训练数据若覆盖不全，预训练里会的换手会被忘掉。合成视频的物理一致性仍是作者列出的缺口。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：数字从哪一节来，以及和本站其他笔记的关系</summary>

<h3 id="数字出处">数字出处</h3>

- 10 Hz、120 Hz、63.9 ms、2.2B / 1.34B、第 12 层、64 token、$H=16$、$K=4$：§2 与 §2.1。
- 88 h → 827 h、78 万条 / 11 小时、5 万 H100·时：§2.2 与 §3。
- Table 2、Table 3、11.5/15 与 11/15：§4.3。DexMG 的 46.9 / 58.5：附录 Table 4。
- 流匹配符号：仓库里 `velocity = actions - noise`。ar5iv Eq.(1) 印成的 $\epsilon-A$ 不采用。
- 源码、张量形状与超参数：Isaac-GR00T `n1-release` 标签（commit `755876a`）与 Hugging Face `nvidia/GR00T-N1-2B/config.json`；demo 数据的统计量来自仓库里 `demo_data/robot_sim.PickNPlace/meta/stats.json`。

<h3 id="相关阅读">相关阅读</h3>

- [π₀（Black et al., 2024）](https://arxiv.org/abs/2410.24164)：流匹配 VLA。GR00T 用交叉注意力，π₀ 用 MoE。
- [Diffusion Policy](https://arxiv.org/abs/2303.04137)：本文真机和仿真的主要模仿学习对照，U-Net 扩散，一次同样 16 步。
- [DexMimicGen（Jiang et al., 2024）](https://arxiv.org/abs/2410.24185)：中层仿真轨迹的生成器。生成流程以本文 §2.2 为准。
- [LAPA（Ye et al., 2024）](https://arxiv.org/abs/2410.11758)：潜动作预训练，本文的 VQ-VAE 标签来源。
- 本站 [SONIC](../SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.md)：后来的全身跟踪控制器，把 GR00T N1.5 接成 System 2。那是另一篇论文，不要把 N1 的 120 Hz 动作率和 SONIC 的 50 Hz 关节控制混成一个数。

</details>
