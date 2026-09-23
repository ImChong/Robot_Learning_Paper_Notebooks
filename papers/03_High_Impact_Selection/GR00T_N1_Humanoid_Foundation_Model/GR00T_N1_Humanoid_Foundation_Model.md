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

> 🎮 **本文内嵌 1 段讲解动画**（不用装任何东西）：
> [七幕动画：GR00T N1 全流程](#groot-explainer-anim) —— 约 87 秒串完「数据孤岛 → 10 Hz 与 63.9 ms → 流匹配 → 数据金字塔 → 潜动作 / IDM → 一套权重多套 MLP → 表上的数字」。空格播放/暂停，← → 换幕，也可以点分幕标签跳着看。

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

> 📖 **动画之后的正文默认全部折叠**：问题、双系统、流匹配、数据金字塔、潜动作、跨本体、实验数字和边界按小节收起，面试和附录各收成一块。想细读哪一块就点开，内容一字未删；下面那张流程图留在外面。目录里的标题可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」。

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

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：五问 —— 两个频率、为什么是交叉注意力、无动作视频、10% 数据、模型做不了什么</summary>

**Q：System 1 和 System 2 各管什么，120 Hz 是什么？**  
A：System 2 是 Eagle-2，读图像和语言，GR00T-N1-2B 用第 12 层，论文写 L40 上 10 Hz。System 1 是流匹配 DiT，交叉注意力读这些 token，一次生成 16 步动作，测得 63.9 ms。120 Hz 是这 16 步的播放节拍：16 步要播 133 ms，算得比播得快。不是整网每秒前向 120 次。

**Q：为什么动作头用流匹配 DiT，而且用交叉注意力而不是 MoE？**  
A：动作分布是多模态的，流匹配沿直线从噪声走到数据，4 步欧拉就够用。交叉注意力把 VLM 和动作头拆开，换骨干不用改成 mixture-of-experts；不同本体靠各自的状态 / 动作 MLP 对齐维度。速度目标是 $A-\epsilon$，与 Isaac-GR00T 的 `actions - noise` 一致。

**Q：人类视频没有动作，怎么和真机数据一起训？**  
A：VQ-VAE 从当前帧和未来帧抽出潜动作，当成 LAPA 这一种本体，损失仍是流匹配。神经轨迹再加一个逆动力学模型的伪动作。真机数据则真值和潜动作都用。这和「数据金字塔分三层」是两件事：金字塔说数据放哪，潜动作说标签从哪来。

**Q：10% 数据那个结论到底强在哪？**  
A：真机 13 个任务的加权平均里，GR00T 用 10% 遥操达到 42.6%，Diffusion Policy 用全量是 46.4%，只差 3.8 个点；同一 10% 数据上 DP 只有 10.2%。这是后训练的数据效率，不是零样本。仿真 GR-1 上 300 条演示（49.3%）并没有好过 100 条（50.0%），不能说数据越多一定越好。

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

<h3 id="相关阅读">相关阅读</h3>

- [π₀（Black et al., 2024）](https://arxiv.org/abs/2410.24164)：流匹配 VLA。GR00T 用交叉注意力，π₀ 用 MoE。
- [Diffusion Policy](https://arxiv.org/abs/2303.04137)：本文真机和仿真的主要模仿学习对照，U-Net 扩散，一次同样 16 步。
- [DexMimicGen（Jiang et al., 2024）](https://arxiv.org/abs/2410.24185)：中层仿真轨迹的生成器。生成流程以本文 §2.2 为准。
- [LAPA（Ye et al., 2024）](https://arxiv.org/abs/2410.11758)：潜动作预训练，本文的 VQ-VAE 标签来源。
- 本站 [SONIC](../SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.md)：后来的全身跟踪控制器，把 GR00T N1.5 接成 System 2。那是另一篇论文，不要把 N1 的 120 Hz 动作率和 SONIC 的 50 Hz 关节控制混成一个数。

</details>
