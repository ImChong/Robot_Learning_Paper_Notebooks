---
layout: paper
paper_order: 17
title: "Attention Is All You Need (Transformer)"
category: "基础强化学习 Foundational RL"
zhname: "Transformer：注意力就是你所需要的一切"
demos: ["transformer"]
---

# Attention Is All You Need (Transformer)
**用注意力代替循环：一层之内任意两个位置直接相连、训练整句并行——后来 Digit 的行走控制器、扩散策略、π₀ 和 GR00T N1 的骨架都是这块零件**

> 📅 阅读日期: 2026-09-30（2026-10-29 从机器人的角度重写，动画从七幕重做成十七幕，补三个交互演示，重录配音视频；同日按看片反馈把动画和旁白改成写给第一次接触的人的比喻版）
>
> 🏷️ 板块: 01_Foundational_RL / 基础架构（放在基础板块，是因为本站的 Diffusion Policy、真实世界人形行走、MaskedMimic、GR00T N1、π₀、π₀.₅ 都建立在它上面）
>
> 🧭 状态: 已对照 [arXiv:1706.03762v7](https://arxiv.org/abs/1706.03762) 正文、Table 1–4、附录图 3–5 与论文指向的官方实现 [tensorflow/tensor2tensor](https://github.com/tensorflow/tensor2tensor)。论文 §6.1 正文把英→法写成 41.0，Table 2 与摘要写 41.8，本笔记按表取 41.8 并注明差异。**论文只做机器翻译和句法分析，没有任何机器人实验**；笔记里「机器人那一侧」的数字逐处对照了各自的原论文 LaTeX 源码与官方代码（Digit：arXiv 2303.03381 v2；Diffusion Policy：arXiv 2303.04137 v5 与 real-stanford/diffusion_policy；MaskedMimic：arXiv 2409.14393 v1；π₀：arXiv 2410.24164 与 openpi；GR00T N1：arXiv 2503.14734 v2 与 Isaac-GR00T `n1-release`），只在代码里有、论文没写的数单独标明，清单见附录「数字出处」。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [1706.03762](https://arxiv.org/abs/1706.03762) |
| **PDF** | [arxiv.org/pdf/1706.03762](https://arxiv.org/pdf/1706.03762) |
| **项目页 / 博客** | [Google Research 博客：Transformer](https://research.google/blog/transformer-a-novel-neural-network-architecture-for-language-understanding/)（2017-08-31；没有单独的项目页） |
| **会议** | NIPS 2017（第 31 届，Long Beach） |
| **发布时间** | 2017年6月12日（arXiv v1），NIPS 2017 |
| **作者** | Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin（同等贡献，排名随机） |
| **机构** | Google Brain, Google Research, University of Toronto |
| **官方代码** | [tensorflow/tensor2tensor](https://github.com/tensorflow/tensor2tensor)（论文 §7 给出；仓库已归档，不再维护） |
| **本站相关笔记** | [真实世界人形行走](../../03_High_Impact_Selection/Real-World_Humanoid_Locomotion_with_RL/Real-World_Humanoid_Locomotion_with_RL.html)（Digit 的因果 Transformer）· [Diffusion Policy](../Diffusion_Policy/Diffusion_Policy.html) · [MaskedMimic](../../03_High_Impact_Selection/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting.html) · [π₀](../../03_High_Impact_Selection/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.html) · [GR00T N1](../../03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.html) · [ACT](../../03_High_Impact_Selection/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware.html) |

---

## 🎯 一句话总结

Transformer 把序列建模里的「时间步循环」换成「一层之内所有位置两两算注意力」：串行步数从 $O(n)$ 降到 $O(1)$，任意两个位置之间的路径长度也是 $O(1)$，训练可以整句并行。核心公式只有一行 $\mathrm{softmax}(QK^\top/\sqrt{d_k})V$，再加多头、正弦位置编码、残差 + LayerNorm、逐位置 FFN 和因果掩码。它是一篇**机器翻译**论文，不含任何机器人或强化学习内容；放进本站基础板块，是因为机器人模型换掉的只是**输入的 token 和输出头**，中间的注意力块原样沿用：[Digit 的行走控制器](../../03_High_Impact_Selection/Real-World_Humanoid_Locomotion_with_RL/Real-World_Humanoid_Locomotion_with_RL.html)把最近 16 步的「观测—动作」当 16 个 token、用因果掩码只看过去；[π₀](../../03_High_Impact_Selection/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.html) 把图像、文字、状态和 50 步动作拼成一串 867 个 token；[GR00T N1](../../03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.html) 的动作头用交叉注意力去读视觉语言模型的特征。

> 🎮 **本文内嵌 1 段讲解动画 + 1 段配音视频 + 3 个可交互演示**（不用装任何东西）：
> 1. [十七幕动画：从机器人的角度读 Transformer](#tf-explainer-anim) —— 约 272 秒，写给第一次接触的人：每一幕先给一个生活里的比喻（传话、开会、查资料、分披萨、评委、时钟、追剧……），再配一个小例子，最后对照本站机器人论文怎么用同一块零件
> 2. [配音讲解视频](#tf-video) —— 同样十七幕，加中文配音与字幕，15 分 43 秒竖屏，可下载
> 3. [注意力计算器](#demo-attention) —— 机器人最近 3 步的玩具向量：选哪一步当 query、缩不缩放、加不加因果掩码
> 4. [$\sqrt{d_k}$ 实验](#demo-scale) —— 维度越大点积散得越开，softmax 多尖、梯度还剩多少；可以拖到 Digit 的 48 维、π₀ 的 256 维
> 5. [表一计算器](#demo-cost) —— 序列多长、宽度多少，自注意力才比循环层便宜；因果掩码留下多少对

> 🚶 [具体实例](#实例-环境设定)一共七个：机器人最近 3 步的一次注意力、$d_k=64$ 不缩放会怎样、因果掩码留下多少对、$d _ {model}=4$ 的位置编码、数一数 base 和 big 的参数、按表一粗算 Digit 与 π₀、式 (3) 的学习率。[源码对照](#源码-缩放点积注意力)逐段对照 tensor2tensor，并列出代码与论文不一致的三处（位置编码的 sin/cos 排布、默认改成 pre-norm、掩码用 $-10^9$ 而不是 $-\infty$）。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 在这篇论文里指什么 |
|------|------|-------------------|
| **RNN / LSTM / GRU** | Recurrent Neural Network 等 | 当时主流的序列模型，按时间步串行计算 |
| **Q / K / V** | Query / Key / Value | 注意力的三组向量：用 Q 去和 K 比相似度，按相似度加权 V |
| **FFN** | Position-wise Feed-Forward Network | 每个位置独立过的两层全连接，$512\to2048\to512$ |
| **PE** | Positional Encoding | 加在词嵌入上的位置信号，本文用正弦 / 余弦 |
| **BLEU** | Bilingual Evaluation Understudy | 机器翻译的 n-gram 匹配分数，越高越好 |
| **BPE** | Byte-Pair Encoding | 子词切分，英—德共享约 37000 个 token |
| **WMT14** | Workshop on Machine Translation 2014 | 英→德约 450 万句对，英→法约 3600 万句 |
| **token** | — | 序列里的一个元素。翻译里是一个子词；机器人那边可以是一步「观测—动作」、一块图像、一步动作 |
| **VLA** | Vision-Language-Action model | 视觉—语言—动作模型，π₀、GR00T N1 这类（不是本文内容） |
| **DiT** | Diffusion Transformer | 用 Transformer 当去噪网络；GR00T N1 的动作头（不是本文内容） |
| **KV 缓存** | Key–Value cache | 推理时把已经算过的 K、V 存下来，后面的 token 直接复用；π₀ 用它只算一次图文前缀（不是本文内容） |

---

## 🎬 十七幕动画：从机器人的角度读 Transformer {#tf-explainer-anim}

<div class="paper-demo" data-demo="tf-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 十七幕按论文的顺序排，但写给**只看过本站前面几期、第一次接触这篇论文**的人：一篇研究「翻译」的论文（教电脑把英文翻成德文）→ 传话游戏：老办法为什么慢 → 开会的代价（表一）→ 先把输入切成一张张卡片 → Q、K、V：像去图书馆查资料 → 手算一次：打分、分比例、混合 → 为什么要先把分数缩小 → 多头：请 8 个评委 → 位置编码：给卡片装一只钟 → 一层里有什么 → 因果掩码：不许剧透 → 交叉注意力：回头看原文 → 训练一起改、使用一个个写 → 怎么训练：先热身 → 表二 → 表三 → 局限和机器人怎么接着用。每一幕先给一个比喻和小例子，专业名词只在讲完以后提一次「论文叫它……」；机器人那边只用前面几期讲过的 Digit（第 014 期）、扩散策略（第 010 期）和 MaskedMimic（第 028 期）。
>
> 比喻是我们为了讲解加的，不是论文的说法：「开会」指自注意力、「查资料」指 Q / K / V、「评委」指注意力头、「时钟」指位置编码、「保留原稿」指残差、「调整音量」指层归一化、「随机请假」指 dropout。画面里的素材：论文附录图 4 的裁剪（arXiv 源文件里的原图；论文首页写明注明出处后可在学术作品里复制图表）；第 1、11 幕 Digit 的两段视频和第 4 幕切成小方块的那一帧取自第 014 期[真实世界人形行走的项目页](https://learning-humanoid-locomotion.github.io/)（项目页没有标倍速）；格子里走路的 G1 借第 032 期 [HOMIE](../../03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.html) 在 MuJoCo 里回放官方策略的贴图，**只作示意**；Digit、UR5、G1 的真机图取自 [Robot_Description_Gallery_Online](https://github.com/ImChong/Robot_Description_Gallery_Online)（按各家开源 URDF 渲染）。第 6 幕的向量、第 7 幕的分数、第 8 幕各评委看哪一步都是我们编的玩具数，第 17 幕的柱子是第 014 期论文图 8A 的读图近似值。

## 📺 配音讲解视频（可下载） {#tf-video}

<div class="paper-demo" data-demo="tf-video" data-src="media/tf_explainer_video.mp4" data-poster="media/tf_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/tf_explainer_video.mp4" download="Transformer_讲解视频.mp4">下载 mp4（17.6 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：机器人的角度、问题、方法的每一块按小节收起，实验、局限、具体实例、源码对照、面试和附录各收成一块。想细读哪一块就点开，内容一字未删；流程图和三个交互演示留在外面。目录里的标题可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」。

---

## 🤖 从机器人的角度：同一块零件，换了 token 和输出头

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：本站五篇机器人论文分别怎么用 Transformer，哪些零件原样沿用、哪些换掉了</summary>

论文的结构图（图 1）可以拆成三层：最下面把输入变成一串等宽的 token（嵌入 + 位置编码），中间是 $N$ 个注意力块（多头注意力、残差、LayerNorm、FFN），最上面是输出头（线性层 + softmax，出下一个词）。机器人论文几乎都**只换最下面和最上面**：

| 本站笔记（一手出处） | token 是什么 | 用了论文的哪些零件 | 输出头 |
|---|---|---|---|
| [真实世界人形行走（第 014 期）](../../03_High_Impact_Selection/Real-World_Humanoid_Locomotion_with_RL/Real-World_Humanoid_Locomotion_with_RL.html)（arXiv 2303.03381 v2，Materials and Methods） | 策略 50 Hz，一步一对「观测—上一步动作」，经 MLP（[512, 512]）嵌入，嵌入维度 192；窗口 16 步 | 自注意力 + **因果掩码**、正弦位置编码；4 个块、4 个头，共 1.4M 参数 | 16 个关节的 PD 目标 + 8 个腿部关节的 PD 增益 |
| [Diffusion Policy（第 010 期）](../Diffusion_Policy/Diffusion_Policy.html) 的 Transformer 版（arXiv 2303.04137 v5 §3.1、图 2c） | 带噪声的动作，一步一个；论文写扩散步 $k$ 的正弦嵌入「放在最前面当第一个 token」（官方代码的编码器—解码器版把它放在条件序列的第一个） | 动作之间**因果注意力**，观测经共享 MLP 嵌入后用**交叉注意力**读入 | 预测噪声 |
| [MaskedMimic（第 028 期）](../../03_High_Impact_Selection/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting.html)（arXiv 2409.14393 v1 §6.4–6.5） | 每种输入各有编码器、各成 token：目标姿态（按关键帧）、物体、高度图、当前姿态、文字、历史姿态；关键帧里没给的关节置零、再拼上掩码 | 先验是一个 Transformer 编码器，没给的输入用**注意力掩码**挡掉，所以只给头、只给双手都行（§7.2） | 潜变量 $z$ 的分布 |
| [π₀（第 045 期）](../../03_High_Impact_Selection/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.html)（arXiv 2410.24164 §IV、附录 B；openpi） | 论文：每台机器人 2–3 张图、文字、1 个状态 token、$H=50$ 步动作；openpi 默认槽位：3 路相机各 256 个图像块、文字补齐到 48 个，共 867 个（这几个数论文没写） | PaliGemma（Gemma 2B）；**分块因果掩码**（3 块）；图文和动作两套权重，只在自注意力里交互；流匹配时间用正弦编码 | 50 步动作的速度场（流匹配） |
| [GR00T N1（第 050 期）](../../03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.html)（arXiv 2503.14734 v2 §2.1） | Eagle-2 每帧 64 个图像 token + 文字；动作头里 $H=16$ 个带噪动作 token | 动作头是 DiT，**交叉注意力**与自注意力块交替，交叉注意力读 LLM 第 12 层的特征 | 16 步动作（流匹配） |

两条在机器人这边格外要紧、论文里却只是顺带一提的性质：

1. **因果掩码让「只看过去」成为结构上的保证。** 控制器部署时看不到未来，因果掩码把这件事写进了注意力表（第 11 幕、例 3）。
2. **训练并行，推理仍然串行。** 论文结论自己把「让生成不那么串行」列为下一步。机器人每个控制周期只有几十毫秒（Digit 的策略 50 Hz，我们换算是每步 20 ms）；π₀ 一次推理出 50 步动作，并缓存前缀的 K、V（π₀ 论文 §IV），GR00T N1 一次出 16 步（GR00T N1 论文 §2.1）。把这两件事和本文的结论连起来，是我们的串联，不是任何一篇论文的说法。

</details>

---

## ❓ 论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：RNN 按时间串行、长距离依赖路径长、卷积要堆很多层才能连通；表一的三项比较</summary>

2017 年翻译模型的主流是编码器—解码器结构的 RNN（LSTM / GRU），再用注意力把两边连起来。引言里点出的毛病只有一个根源：**按时间步串行**。

1. **算得慢。** 隐状态 $h_t$ 是 $h _ {t-1}$ 和第 $t$ 个输入的函数，同一句话里的位置没法并行。句子越长越慢，而显存又限制了跨样本的批量（§1）。
2. **远距离依赖走得远。** 第 1 个词的信息要经过 $n-1$ 次状态更新才能影响第 $n$ 个词。前向、反向信号要穿过的路径越长，越难学（§4 引 Hochreiter 等人）。
3. **卷积也没解决干净。** ByteNet、ConvS2S 用卷积换来并行，但连通任意两个位置要 $O(n/k)$ 层（连续卷积核）或 $O(\log_k n)$ 层（空洞卷积）。

论文的提法是：**完全不用循环、也不用卷积，只靠注意力**建模输入输出之间的全局依赖（§1、§2）。在此之前注意力几乎总是和 RNN 搭配使用，作者说据他们所知这是第一个只靠自注意力的转导模型。

**换到机器人上。** 把机器人最近 $n$ 步的观测当成一串 token，问题是一样的：RNN 每个控制步都要按顺序把隐状态往后传；训练时一条轨迹也只能一步一步展开。第 014 期的 Digit 窗口是 16 步（Radosavovic 等，arXiv 2303.03381 v2「Model architecture」）；π₀ 按 openpi 的默认槽位一次要处理 867 个 token（第 2、3 幕）。

Table 1 把三种层放在一起比（三列都是越小越好）：

| 层类型 | 每层复杂度 | 最少串行操作 | 最长路径 |
|---|---|---|---|
| 自注意力 | $O(n^2 \cdot d)$ | $O(1)$ | $O(1)$ |
| 循环 | $O(n \cdot d^2)$ | $O(n)$ | $O(n)$ |
| 卷积 | $O(k \cdot n \cdot d^2)$ | $O(1)$ | $O(\log_k n)$ |
| 受限自注意力（邻域 $r$） | $O(r \cdot n \cdot d)$ | $O(1)$ | $O(n/r)$ |

自注意力的代价是 $n^2$。§4 的论证是：当句长 $n$ 小于表示维度 $d$（翻译里常见，$d=512$），它每层反而比循环层便宜；很长的序列可以改用受限自注意力，作者把这留作后续工作。按这个量级粗算（我们的估算），Digit（$n=16$、$d=192$）便宜约 12 倍，π₀（openpi 默认 $n=867$、Gemma 2B 的 $d=2048$）也便宜约 2.4 倍，见例 6。

</details>

<div class="paper-demo" data-demo="tf-cost" id="demo-cost"><p class="demo-fallback">（本节含交互演示「表一计算器」，需要启用 JavaScript）</p></div>

---

## 🔧 方法详解

### 1. 机器人的 token：嵌入、查表与共享权重

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：词怎么变成 512 维向量、为什么乘 √d_model、三处共享一个矩阵；机器人的 token 从哪来</summary>

**论文的做法（§3.4）。** 每个子词查一张可学习的嵌入表，得到 $d _ {model}=512$ 维的向量，再乘 $\sqrt{d _ {model}} = \sqrt{512} \approx 22.6$，然后加上位置编码（§3.5）。输入嵌入、输出嵌入和 softmax 前的线性层**共享同一个权重矩阵**（沿用 Press 与 Wolf 的做法）。词表是 BPE 子词：英—德共享约 37000 个，英—法用 32000 个 word-piece；训练时按句长分桶，每个 batch 约 25000 个源 token 加 25000 个目标 token（§5.1）。

**机器人的做法。** 机器人没有「词」，要先决定一个 token 装什么：

- 第 014 期 Digit：一步的观测和上一步的动作算一个 token，用 MLP（[512, 512]）嵌入，嵌入维度 192，窗口 16 个（Radosavovic 等，arXiv 2303.03381 v2「Model architecture」）。
- π₀：论文写每台机器人 2–3 张图、1 个状态 token、$H=50$ 步动作（arXiv 2410.24164 §IV、附录 B）；图像怎么切、文字多长论文没写，openpi 代码里是一张 $224\times224$ 的图按 $14\times14$ 的块切成 $16\times16=256$ 个 token（SigLIP So400m/14，`model.py`、`siglip.py`），3 路相机 768 个，文字补齐到 48 个（`pi0_config.py`），一共 867 个。
- GR00T N1：$224\times224$ 的图经 SigLIP-2 和 pixel shuffle 变成每帧 64 个 token，和文字一起进 Eagle-2（arXiv 2503.14734 v2 §2.1）。

只要能变成一串等宽的向量，后面的块就不用改——这是我们的概括，论文本身只处理文本。

</details>

### 2. Q、K、V 与缩放点积注意力

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一行公式、Q / K / V 的类比、点积对加性注意力、为什么除以 √d_k、三种用法</summary>

注意力把一个 query 和一组 key–value 对映射成输出：输出是 value 的加权和，权重由 query 和对应 key 的相似度（论文叫「相容度」）决定（§3.2）。本文用点积算相似度，再除以 $\sqrt{d_k}$：

$$
\mathrm{Attention}(Q, K, V) = \mathrm{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right) V
$$

$Q \in \mathbb{R}^{n_q \times d_k}$、$K \in \mathbb{R}^{n_k \times d_k}$、$V \in \mathbb{R}^{n_k \times d_v}$，一次矩阵乘法算完所有位置，得到整张 $n\times n$ 的分数表——这一层里没有「等上一步」这回事。

**一个类比（我们的说法，不是论文的）。** 把机器人最近几步当成一排抽屉：Q 是第 $t$ 步「要找什么」，K 是每一步贴在抽屉上的标签，V 是抽屉里的内容。按标签去找，按内容去拿。自注意力里 Q、K、V 都来自同一串输入，各乘一个可学习矩阵（$W^Q, W^K \in \mathbb{R}^{512\times 64}$，$W^V \in \mathbb{R}^{512\times 64}$），每一步乘的是同一组矩阵。

**为什么是点积而不是加性注意力。** 两者理论复杂度相近，但点积能用高度优化的矩阵乘法实现，更快也更省显存（§3.2.1）。

**为什么要除以 $\sqrt{d_k}$。** $d_k$ 小时两者表现差不多；$d_k$ 大时，不缩放的点积注意力不如加性注意力。作者的猜测（原文用 "We suspect"）是：点积的量级随 $d_k$ 变大，softmax 被推进梯度极小的区域。脚注 4 给出算式：若 $q$、$k$ 的分量独立、均值 0、方差 1，则

$$
q \cdot k = \sum_{i=1}^{d_k} q_i k_i,\qquad \mathbb{E}[q\cdot k]=0,\qquad \mathrm{Var}[q \cdot k] = d_k
$$

除以 $\sqrt{d_k}$ 把方差拉回 1。本文 $d_k = 64$，不缩放时点积的标准差是 8；Digit 每头 $192/4=48$ 维（论文写了 192 维、4 个头，48 是我们算的；它的式 1 也是除以 $\sqrt{d_k}$），标准差约 6.9；π₀ 的 Gemma 每头 256 维（openpi `gemma.py`），标准差 16（例 2）。

**三种用法（§3.2.3）。**

| 位置 | Q 来自 | K、V 来自 | 能看到 |
|---|---|---|---|
| 编码器自注意力 | 编码器上一层 | 编码器上一层 | 输入序列的所有位置 |
| 解码器自注意力 | 解码器上一层 | 解码器上一层 | 当前及之前的位置（掩码） |
| 编码器—解码器注意力 | 解码器上一层 | 编码器输出 | 输入序列的所有位置 |

解码器的掩码在 softmax 之前把非法连接的 logit 设为 $-\infty$，保住自回归性质。

</details>

<div class="paper-demo" data-demo="tf-attention" id="demo-attention"><p class="demo-fallback">（本节含交互演示「注意力计算器」，需要启用 JavaScript）</p></div>

<div class="paper-demo" data-demo="tf-scale" id="demo-scale"><p class="demo-fallback">（本节含交互演示「√d_k 实验」，需要启用 JavaScript）</p></div>

### 3. 多头注意力

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：8 个 64 维的头、为什么总计算量不变、Table 3 (A)(B)、附录图里的头；机器人模型的头数</summary>

与其用 $d _ {model}$ 维的 Q、K、V 做一次注意力，论文把它们用不同的可学习矩阵各投影 $h$ 次，并行算完再拼接、再投影（§3.2.2）：

$$
\mathrm{MultiHead}(Q,K,V) = \mathrm{Concat}(\mathrm{head}_1,\dots,\mathrm{head}_h)\,W^O,\qquad
\mathrm{head}_i = \mathrm{Attention}(QW_i^Q, KW_i^K, VW_i^V)
$$

其中 $W_i^Q, W_i^K \in \mathbb{R}^{d _ {model}\times d_k}$，$W_i^V \in \mathbb{R}^{d _ {model}\times d_v}$，$W^O \in \mathbb{R}^{hd_v \times d _ {model}}$。本文 $h = 8$，$d_k = d_v = d _ {model}/h = 64$。

作者给的理由是：单头只给一组权重，会把不同位置、不同表示子空间的信息**平均**掉，多头可以同时关注多种关系。每头维度缩成 $1/h$，所以**总计算量和满维度的单头相近**——多头不是额外买算力，而是换一种切分。

Table 3 (A) 在保持计算量不变的前提下只改头数（newstest2013 dev BLEU，越高越好）：

| $h$ | $d_k = d_v$ | PPL (dev) | BLEU (dev) |
|---|---|---|---|
| 1 | 512 | 5.29 | 24.9 |
| 4 | 128 | 5.00 | 25.5 |
| **8（base）** | **64** | **4.92** | **25.8** |
| 16 | 32 | 4.91 | 25.8 |
| 32 | 16 | 5.01 | 25.4 |

单头比最好设置低 0.9 BLEU；头太多、每头维度太窄时质量也回落。Table 3 (B) 另外显示单独缩小 $d_k$（16、32 时 25.1、25.4）会伤质量，作者据此推测「判断相容性并不容易，可能需要比点积更复杂的相容函数」。

附录图 3–5 把第 5 层的注意力可视化：有的头跟随长距离依赖（"making … more difficult"），有的头像在做指代消解（"its" → "Law"）。这是定性观察，论文没有量化每个头的功能。

**机器人模型的头数**：Digit 4 个头（Radosavovic 等，arXiv 2303.03381 v2「Model architecture」），每头 48 维是我们按 192 ÷ 4 算的；π₀ 的 Gemma 2B 是 8 个 query 头共用一组 K、V（multi-query，每头 256 维；openpi `gemma.py` 的 `gemma_2b`，与 Gemma 技术报告表 1 一致；π₀ 论文附录 B 写的 `num_heads=18` 对不上，按代码取 8）。

</details>

### 4. 位置编码

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：注意力本身不分先后、正弦 / 余弦、相对位置的线性关系、与可学习嵌入几乎一样；机器人里谁用了它</summary>

没有循环也没有卷积，模型本身对顺序不敏感：把输入打乱，自注意力的输出只是跟着换位。所以要在编码器和解码器最底层把位置信号**加**到嵌入上，维度同为 $d _ {model}$（§3.5）：

$$
PE_{(pos,2i)} = \sin\!\left(\frac{pos}{10000^{2i/d_{model}}}\right),\qquad
PE_{(pos,2i+1)} = \cos\!\left(\frac{pos}{10000^{2i/d_{model}}}\right)
$$

每个维度对应一条正弦，维度越高频率越低，波长从 $2\pi$ 到 $10000\cdot 2\pi$ 成几何级数。作者选它的理由写的是**假设**：对任意固定偏移 $k$，$PE _ {pos+k}$ 能表示成 $PE _ {pos}$ 的线性函数（每对 sin / cos 转过固定角度），模型可能因此容易学会按相对位置关注。

Table 3 (E) 换成可学习的位置嵌入，dev BLEU 25.7 对 base 的 25.8，几乎一样。最终选正弦，是因为它**可能**让模型外推到比训练时更长的序列——论文没有给出外推实验。

**机器人里，同一个正弦函数被借去编码别的「第几」**：Digit 给 16 个 token 加正弦位置编码（Radosavovic 等，arXiv 2303.03381 v2「Model architecture」）；Diffusion Policy 把扩散步 $k$ 的正弦嵌入当成一个 token（arXiv 2303.04137 v5 §3.1；代码是 `SinusoidalPosEmb`）；π₀ 用正弦位置编码函数编码流匹配时间 $\tau$（arXiv 2410.24164 附录 B）。编码的是「第几步」还是「去噪到哪」，函数是同一类。

</details>

### 5. 编码器层：残差、LayerNorm、FFN

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两个子层各包一层残差、逐位置 FFN、数一数参数、残差 dropout、tensor2tensor 后来的默认</summary>

**编码器**（§3.1）：$N = 6$ 个相同的层，每层两个子层——多头自注意力、逐位置 FFN。每个子层外面包残差再做 LayerNorm：

$$
\mathrm{LayerNorm}(x + \mathrm{Sublayer}(x))
$$

为了能加残差，所有子层和嵌入层的输出维度都是 $d _ {model} = 512$。残差来自 He 等人，LayerNorm 来自 Ba 等人。

**逐位置 FFN**（§3.3）：

$$
\mathrm{FFN}(x) = \max(0,\, xW_1 + b_1)\,W_2 + b_2
$$

对每个位置独立、相同地作用，等价于两个核宽为 1 的卷积；输入输出 512 维，中间 $d _ {ff} = 2048$。

**参数量。** 论文表 3 写 base 65 M、big 213 M。按标准结构数一遍（例 5，我们的计算）：base 约 6300 万，big 约 2.14 亿。机器人那边 Digit 的整个模型只有 1.4M 参数（Radosavovic 等，arXiv 2303.03381 v2「Model architecture」）。

**残差 dropout**（§5.4）：每个子层的输出在加回残差之前以 $P _ {drop}=0.1$ 随机丢掉，嵌入 + 位置编码之后也做一次。Table 3 (D) 去掉 dropout，dev BLEU 从 25.8 掉到 24.6。

**官方代码后来改了默认**：tensor2tensor 现在的 `transformer_base` 把 LayerNorm 挪到子层之前（pre-norm），预热也从 4000 步改成 8000 步；复现论文要切回 `transformer_base_v1`（见源码对照第 5 节）。

</details>

### 6. 因果掩码与交叉注意力

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：只看过去的注意力表、右移一位、−10⁹ 代替 −∞、交叉注意力的 Q / K / V 从哪来；机器人的三种接法</summary>

**因果掩码。** 解码器的自注意力只能看过去：softmax 之前，把未来位置的分数设成 $-\infty$，$e^{-\infty}=0$，权重就是 0。再配合输出右移一位，位置 $i$ 的预测只依赖 $i$ 之前已经知道的输出（§3.1、§3.2.3）。$n$ 个位置留下 $n(n+1)/2$ 对，6 个是 21 / 36（例 3）。

**机器人部署时同样看不到未来**：Digit 的因果 Transformer 16 个 token 留下 136 / 256 对（我们算的）。那篇论文引言举的例子是：模型可以用历史里「想要的状态和实际的状态」（desired vs actual states）来琢磨怎么调整动作。

代码里 $-\infty$ 写成 $-10^9$，softmax 之后同样是 0；半精度下另换一个能表示的大负数（源码对照第 3 节）。掩码还可以是别的形状：π₀ 用三块的分块因果掩码（图文、状态、动作，块内互相看、块间只看前面的块；π₀ 论文附录 B），MaskedMimic 用注意力掩码挡掉没给的输入（MaskedMimic 论文 §6.5）。

**交叉注意力（编码器—解码器注意力）。** query 来自解码器上一层，key 和 value 来自编码器的输出，解码器每个位置都能看全部输入位置；这仿照了 seq2seq 里经典的编码器—解码器注意力。两串 token 的长度可以不一样。

**机器人的三种接法**：

- GR00T N1：DiT 动作头里交叉注意力块和自注意力块交替，交叉注意力去读 LLM 第 12 层的特征（GR00T N1 论文 §2.1）。
- Diffusion Policy 的 Transformer 版：带噪动作之间因果注意力，观测经共享 MLP 嵌入后用交叉注意力读进来；论文建议新任务先试 CNN 版，因为 Transformer 版对超参数更敏感（Diffusion Policy 论文 §3.1「Recommendations」）。
- π₀ 换了一种接法：图文、状态、动作拼成一串，两套权重只在同一个自注意力里交互（π₀ 论文附录 B）。GR00T N1 论文 §5 明确写：和 π₀ 用「混合专家」接 VLM 与动作生成不同，它用的是简单的交叉注意力。

</details>

### 7. 训练整句并行，推理一个一个来

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：自回归解码、beam search 与检查点平均；机器人每步 20 ms 的预算，π₀ 一次推理 73 ms</summary>

解码器是自回归的（§3）：生成下一个符号时，把已经生成的当作额外输入。训练时目标句整句已知，配合掩码一次算完所有位置（teacher forcing）；推理时没有答案，$n$ 个 token 就要前向 $n$ 次。

**翻译时怎么生成（§6.1）**：beam 宽 4，长度惩罚 $\alpha = 0.6$，最大输出长度为输入长度 + 50；base 取最后 5 个检查点的平均，big 取最后 20 个。论文结论把「让生成不那么串行」列为下一步目标（§7）。

**机器人这边的时间预算**：

- Digit 的策略 50 Hz（Radosavovic 等，arXiv 2303.03381 v2「Sim-to-real transfer」），我们换算是每步 20 ms：因果 Transformer 每步前向一次，只出下一步的动作；输入里每个 token 都带着上一步的动作。
- π₀ 一次推理出一整块 50 步动作：图像编码 14 ms、观测前向 32 ms、10 次流匹配积分 27 ms，RTX 4090 板载一次 73 ms（π₀ 论文附录 D 表 I，3 路相机）；前缀的 K、V 缓存起来只算一次（§IV）。openpi 代码里状态 token 放在后缀，每步积分重算 51 个后缀 token。除 20 Hz 的 UR5e、Franka（每 0.8 s、执行 16 步后推理一次）外，其余 50 Hz 的机器人每 0.5 s、执行 25 步后重新推理（附录 D）。
- GR00T N1：流匹配 $K=4$ 步，一块 $H=16$ 步动作，L40 上 bf16 算一次 63.9 ms（GR00T N1 论文 §2；`n1-release` 的 README 在 L40 上量的是 62.53 ms）。

「机器人后来用动作块加流匹配走了论文结论里那一步」是我们的串联，两篇机器人论文并没有这样表述。

</details>

### 8. 训练配方

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：数据、硬件、学习率预热、dropout 与标签平滑；机器人模型的训练配方</summary>

**数据**（§5.1）：WMT14 英→德约 450 万句对，BPE 共享词表约 37000；英→法 3600 万句，32000 word-piece。按长度近似分桶，每个 batch 约 25000 个源 token 和 25000 个目标 token。

**硬件**（§5.2）：一台机器 8 张 NVIDIA P100。base 每步约 0.4 秒，10 万步、12 小时；big 每步 1.0 秒，30 万步、3.5 天。

**优化器**（§5.3）：Adam，$\beta_1 = 0.9$，$\beta_2 = 0.98$，$\epsilon = 10^{-9}$。学习率按式 (3)：

$$
lrate = d_{model}^{-0.5}\cdot\min\!\left(step^{-0.5},\; step\cdot warmup\_steps^{-1.5}\right),\qquad warmup\_steps = 4000
$$

前 4000 步线性上升，峰值约 $6.99\times10^{-4}$，之后按 $1/\sqrt{step}$ 衰减，第 10 万步约 $1.40\times10^{-4}$（例 7）。

**正则**（§5.4）：残差 dropout $P _ {drop} = 0.1$；标签平滑 $\epsilon _ {ls} = 0.1$。后者让困惑度变差（模型更「不确定」），但 BLEU 和准确率更高。

**机器人模型也这么配**：Diffusion Policy 用余弦学习率加线性预热，CNN 版 500 步、Transformer 版 1000 步（Diffusion Policy 论文附录 A.4；仓库的 Transformer 配置多数是 1000，`train_diffusion_transformer_real_hybrid_workspace.yaml` 是 500）；GR00T N1 用 AdamW、学习率 $10^{-4}$、余弦学习率、预热占 5%、预训练 batch 16384、20 万步（GR00T N1 论文附录表 6）。

</details>

---

## 🧭 一次前向的数据流（mermaid）

<div class="mermaid">
flowchart TB
  SRC["源句 token<br/>（机器人：一步观测 / 一块图像 / 一步动作）"] --> EMB1["嵌入 × √d_model + 位置编码"]
  EMB1 --> ENC["编码器 × 6<br/>多头自注意力 → Add&amp;Norm<br/>FFN 512→2048→512 → Add&amp;Norm"]
  TGT["目标句右移一位"] --> EMB2["嵌入 × √d_model + 位置编码"]
  EMB2 --> DEC1["解码器 × 6 · 带掩码的自注意力"]
  ENC -->|"K、V"| DEC2["编码器—解码器注意力"]
  DEC1 -->|"Q"| DEC2
  DEC2 --> FFN["FFN → Add&amp;Norm"]
  FFN --> OUT["Linear（与嵌入共享权重）→ softmax → 下一个 token<br/>（机器人：换成动作头）"]
</div>

## 🧭 一个注意力头里发生了什么（mermaid）

<div class="mermaid">
flowchart LR
  X["输入 x（n × 512）"] --> WQ["× W_Q → Q（n × 64）"]
  X --> WK["× W_K → K（n × 64）"]
  X --> WV["× W_V → V（n × 64）"]
  WQ --> S["Q Kᵀ / √64（n × n 分数）"]
  WK --> S
  S --> M["加掩码（仅解码器自注意力）"]
  M --> P["softmax 按行归一化"]
  P --> O["× V → 该头输出（n × 64）"]
  WV --> O
  O --> C["8 个头拼接（n × 512）× W_O"]
</div>

---

## 📊 实验里实际报了什么

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Table 2 的翻译结果与训练开销、Table 3 的消融、Table 4 的句法分析</summary>

**翻译（Table 2，newstest2014，BLEU 越高越好；训练 FLOPs 越少越省）：**

| 模型 | EN-DE BLEU | EN-FR BLEU | 训练 FLOPs（EN-DE） |
|---|---|---|---|
| GNMT + RL | 24.6 | 39.92 | $2.3\times10^{19}$ |
| ConvS2S | 25.16 | 40.46 | $9.6\times10^{18}$ |
| MoE | 26.03 | 40.56 | $2.0\times10^{19}$ |
| GNMT + RL 集成 | 26.30 | 41.16 | $1.8\times10^{20}$ |
| ConvS2S 集成 | 26.36 | 41.29 | $7.7\times10^{19}$ |
| **Transformer base** | **27.3** | 38.1 | $3.3\times10^{18}$ |
| **Transformer big** | **28.4** | **41.8** | $2.3\times10^{19}$ |

- 英→德：big 比此前最好的结果（含集成，26.36）高 2 分以上；base 也超过所有已发表的单模型和集成。
- 英→法：§6.1 正文写 big 得 41.0，Table 2 和摘要写 41.8。两处不一致，本笔记按表取 41.8。big 的英→法把 dropout 从 0.3 改成 0.1。
- FLOPs 是作者按「训练时间 × GPU 数 × 单卡持续算力估计」算的（P100 取 9.5 TFLOPS，脚注 5），不是实测：base $43200\,\mathrm{s}\times8\times9.5\times10^{12}\approx3.3\times10^{18}$，big $302400\,\mathrm{s}\times8\times9.5\times10^{12}\approx2.3\times10^{19}$，正好对上表里的两格（我们的验算）。

**消融（Table 3，newstest2013 dev，比 Table 2 的数字低，因为没做检查点平均）：**

| 组 | 改动 | dev BLEU |
|---|---|---|
| base | $N=6$, $d _ {model}=512$, $d _ {ff}=2048$, $h=8$ | 25.8 |
| (A) | 1 个头 | 24.9 |
| (B) | $d_k = 16$ / $32$ | 25.1 / 25.4 |
| (C) | $N = 2$ / $4$ / $8$ | 23.7 / 25.3 / 25.5 |
| (C) | $d _ {model} = 256$ / $1024$ | 24.5 / 26.0 |
| (C) | $d _ {ff} = 1024$ / $4096$ | 25.4 / 26.2 |
| (D) | $P _ {drop}=0$ / $0.2$ | 24.6 / 25.5 |
| (D) | $\epsilon _ {ls} = 0$ / $0.2$ | 25.3 / 25.7 |
| (E) | 可学习位置嵌入 | 25.7 |
| big | $d _ {model}=1024$, $d _ {ff}=4096$, $h=16$, $P _ {drop}=0.3$ | 26.4 |

结论写得很朴素：模型越大越好，dropout 很有用，位置编码形式无所谓。

**英语句法分析（Table 4，WSJ §23 F1）：** 4 层、$d _ {model} = 1024$，只在 WSJ 4 万句上训练得 91.3，半监督（约 1700 万句）得 92.7。作者强调几乎没为这个任务调参，除 RNN Grammar（93.3）外好于此前报告的模型；只用 WSJ 也超过了 BerkeleyParser。这是在说明「这块零件能搬到别的任务」，不是句法分析的新 SOTA。

</details>

---

## ⚠️ 局限

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：平方复杂度、推理仍串行、若干设计理由只是假设；机器人这边的证据在别的论文里</summary>

- **$n^2$ 的代价。** 自注意力每层 $O(n^2 \cdot d)$，序列长一倍、注意力表大四倍；图像、音频、视频这类长输入会很贵。论文自己把只看局部的受限注意力列为后续方向（§4、§7）。机器人里涨得最快的是图像 token：按 openpi 的默认设置，π₀ 三路相机就占 768 个。
- **推理仍然逐个。** 训练并行不等于生成并行，解码器仍是自回归。
- **几处理由是假设或猜测。** $1/\sqrt{d_k}$ 的动机用的是 "We suspect"；正弦位置编码便于相对位置、可能外推，都没有单独实验验证。
- **注意力可视化不是解释。** 附录图只是挑出的例子，不能直接当作每个头的功能说明。
- **和机器人的关系是后来的事。** 论文只做文本任务，没有任何控制或 RL 结论。机器人这边的证据在第 014 期：同一个行走任务只换学生网络，Transformer 约 97%、LSTM 约 89%、TCN 约 86%、MLP 约 75%（那篇论文图 8A 的读图近似值，3 个场景共 30 次）。那篇给的理由是更容易随数据和算力扩展、也更方便接入更多种输入。
- **官方代码和论文有三处不同**：位置编码的排布、LayerNorm 的位置、掩码的写法（源码对照第 6 节），代码注释自己也承认。

</details>

---

## 🚶 具体实例：机器人最近 3 步的一次注意力，以及六个小算例

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（8 节）：环境设定 / 例 1：一次注意力 / 例 2：不缩放会怎样 / 例 3：因果掩码留下多少对 / 例 4：位置编码 / 例 5：数参数 / 例 6：按表一粗算 Digit 与 π₀ / 例 7：学习率</summary>

<h3 id="实例-环境设定">环境设定</h3>

下面的向量是**笔记自己构造的玩具数**，只演示机制；动画第 5、6 幕和演示「注意力计算器」用的是同一组数。机器人最近 3 步 $t-2$、$t-1$、$t$，只看第 $t$ 步这一个 query，$d_k = 4$，value 取 2 维方便画在平面上：

| 步 | key $k_i$ | value $v_i$ |
|---|---|---|
| $t-2$ | $[1, 0, 0, 0]$ | $[1, 0]$ |
| $t-1$ | $[1, 1, 1, 0]$ | $[0, 1]$ |
| $t$ | $[0, 0, 1, 1]$ | $[1, 1]$ |

第 $t$ 步的 query $q = [1, 0, 1, 0]$。真实模型里 $q$、$k$、$v$ 都是 token 乘可学习矩阵得到的，这里直接给出向量，跳过了投影。

<h3 id="实例-例-1一次注意力">例 1：一次注意力</h3>

**点积：**

$$
q\cdot k_{t-2} = 1,\qquad q\cdot k_{t-1} = 1+0+1+0 = 2,\qquad q\cdot k_{t} = 0+0+1+0 = 1
$$

**缩放与 softmax：** 除以 $\sqrt{4} = 2$ 得 $[0.5,\ 1.0,\ 0.5]$。$e^{0.5} = 1.6487$，$e^{1} = 2.7183$，和为 $1.6487\times2 + 2.7183 = 6.0157$：

$$
w = [0.274,\ 0.452,\ 0.274]
$$

**加权求和：**

$$
\text{输出} = 0.274\,[1,0] + 0.452\,[0,1] + 0.274\,[1,1] = [0.548,\ 0.726]
$$

第 $t$ 步最关注 key 和自己最像的 $t-1$ 步，它分到的 value 最多。谁和我像，就多拿谁的 value。

<h3 id="实例-例-2不缩放会怎样">例 2：不缩放会怎样（$d_k = 64$）</h3>

$d_k = 64$ 时点积标准差是 8。取一组量级合理的分数 $[12, 4, -4, 6]$（同样是玩具数）：

| | 分数 | softmax |
|---|---|---|
| 不缩放 | $[12, 4, -4, 6]$ | $[0.997,\ 3.3\times10^{-4},\ 1.1\times10^{-7},\ 0.0025]$ |
| 除以 8 | $[1.5, 0.5, -0.5, 0.75]$ | $[0.506,\ 0.186,\ 0.069,\ 0.239]$ |

softmax 第 $j$ 项对自身 logit 的导数是 $p_j(1-p_j)$。最大项处：不缩放 $0.9972\times0.0028 \approx 0.0028$，缩放后 $0.506\times0.494 \approx 0.250$，相差约 89 倍。这就是脚注 4 那句「推进梯度极小的区域」的具体样子。

机器人模型的头更窄或更宽：Digit 每头 48 维（192 ÷ 4，我们算的），不缩放时点积标准差 $\sqrt{48}\approx6.9$；π₀ 的 Gemma 每头 256 维（openpi `gemma.py`），标准差 16。

<h3 id="实例-例-3因果掩码留下多少对">例 3：因果掩码留下多少对</h3>

$n$ 个位置的注意力表有 $n^2$ 格，因果掩码只留下下三角（含对角线）：

$$
\frac{n(n+1)}{2}:\qquad n=6 \Rightarrow 21 / 36,\qquad n=16 \Rightarrow 136 / 256
$$

$n=6$ 是动画第 11 幕的 6 步；$n=16$ 是 Digit 的上下文窗口。

<h3 id="实例-例-4位置编码">例 4：位置编码（$d _ {model} = 4$）</h3>

玩具 $d _ {model} = 4$：$i = 0$ 的频率是 1，$i = 1$ 的频率是 $1/10000^{2/4} = 1/100$。

$$
PE(1) = [\sin 1,\ \cos 1,\ \sin 0.01,\ \cos 0.01] = [0.841,\ 0.540,\ 0.010,\ 1.000]
$$

$$
PE(2) = [\sin 2,\ \cos 2,\ \sin 0.02,\ \cos 0.02] = [0.909,\ -0.416,\ 0.020,\ 1.000]
$$

前两维每步转 1 弧度，后两维每步只转 0.01 弧度。

<h3 id="实例-例-5数参数">例 5：数一数参数</h3>

按标准结构数（我们的计算；照 tensor2tensor，Q、K、V 与输出投影不带偏置，FFN 带偏置，每个 LayerNorm $2d$ 个参数；词表取论文写的「约 37000」，嵌入三处共享只算一次）：

| | base（$d=512$，$d _ {ff}=2048$） | big（$d=1024$，$d _ {ff}=4096$） |
|---|---|---|
| 共享嵌入 $37000\times d$ | 18,944,000 | 37,888,000 |
| 一层编码器：$4d^2$ + FFN + $2\times2d$ | 3,150,336 | 12,592,128 |
| 一层解码器：$8d^2$ + FFN + $3\times2d$ | 4,199,936 | 16,788,480 |
| 合计（6 层 + 6 层 + 嵌入） | **63,045,632（约 6300 万）** | **214,171,648（约 2.14 亿）** |
| 论文表 3 | 65 M | 213 M |

差的几百万多半来自词表大小（论文只写「约 37000」）和输出层偏置等细节——这是我们的推测。机器人那边，Digit 的整个模型 1.4M 参数（Radosavovic 等，arXiv 2303.03381 v2「Model architecture」），比 base 小四十多倍。

<h3 id="实例-例-6按表一粗算-digit-与-π">例 6：按表一粗算 Digit 与 π₀</h3>

只看量级、忽略常数（我们的估算）：自注意力每层 $n^2 d$，循环层 $n d^2$，两者之比是 $d/n$。

| | $n$ | $d$ | 自注意力便宜多少倍 $d/n$ | 注意力表格数 $n^2$ |
|---|---|---|---|---|
| Digit 行走（第 014 期；论文写窗口 16、嵌入维度 192） | 16 | 192 | $192/16 = 12$ | 256 |
| π₀ 一次推理（第 045 期；$n$ 是 openpi 的默认槽位，$d$ 是 Gemma 2B 的宽度） | $768+48+1+50 = 867$ | 2048 | $2048/867 \approx 2.4$ | 751,689（约 75 万） |

两者都在 $n<d$ 的一侧，但 π₀ 已经很接近交叉点；再多几路相机或更高分辨率，$n$ 就会超过 $d$。

<h3 id="实例-例-7学习率">例 7：学习率</h3>

$d _ {model} = 512$：第 4000 步两项相等，

$$
lrate = 512^{-0.5}\times4000^{-0.5} = 0.04419\times0.01581 \approx 6.99\times10^{-4}
$$

第 10 万步（base 训练结束）是 $0.04419\times100000^{-0.5} \approx 1.40\times10^{-4}$。

</details>

---

## 📁 tensor2tensor 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（6 节）：缩放点积注意力 / 缩放放在哪 / 因果掩码 / 正弦位置编码 / 超参数与 pre-norm / 论文与代码对照表</summary>

> 💡 论文 §7 给出的官方实现是 [tensorflow/tensor2tensor](https://github.com/tensorflow/tensor2tensor)（下文取 `master` 分支）。仓库已归档，默认超参数在论文之后改过几轮，下面逐处标出。

<h3 id="源码-缩放点积注意力">1. 缩放点积注意力：`dot_product_attention`</h3>

```python
# tensor2tensor/layers/common_attention.py - dot_product_attention()
logits = tf.matmul(q, k, transpose_b=True)  # [..., length_q, length_kv]
if bias is not None:
  bias = common_layers.cast_like(bias, logits)
  logits += bias                             # 掩码以加性 bias 的形式进来
logits = maybe_upcast(logits, activation_dtype, weight_dtype)
weights = tf.nn.softmax(logits, name="attention_weights")
...
weights = common_layers.dropout_with_broadcast_dims(
    weights, 1.0 - dropout_rate, broadcast_dims=dropout_broadcast_dims)
return tf.matmul(weights, v)
```

这里没有 $1/\sqrt{d_k}$：缩放在调用它之前做（下一节）。注意力权重上还有一层 dropout（`attention_dropout`），论文 §5.4 只写了残差 dropout。

<h3 id="源码-缩放放在哪">2. 缩放放在哪：乘在 q 上</h3>

```python
# tensor2tensor/layers/common_attention.py - multihead_attention()
q = split_heads(q, num_heads)
...
key_depth_per_head = total_key_depth // num_heads
if not vars_3d:
  q *= key_depth_per_head**-0.5
```

先把 $q$ 乘 $d_k^{-0.5}$ 再和 $k$ 做点积，数学上等价于把 $QK^\top$ 除以 $\sqrt{d_k}$，但只缩放一个 $n\times d_k$ 的矩阵，而不是 $n \times n$ 的分数矩阵。

<h3 id="源码-因果掩码">3. 因果掩码：$-10^9$ 而不是 $-\infty$</h3>

```python
# tensor2tensor/layers/common_attention.py - attention_bias_local()（被 attention_bias_lower_triangle 调用）
band = common_layers.ones_matrix_band_part(
    length, length, max_backward, max_forward, out_shape=[1, 1, length, length])
return -1e9 * (1.0 - band)
```

下三角带内为 0，带外加 $-10^9$，softmax 后权重在浮点意义上为 0。半精度下 $-10^9$ 溢出，所以另有 `large_compatible_negative()` 换一个能表示的大负数。

<h3 id="源码-正弦位置编码">4. 正弦位置编码：先全部 sin、再全部 cos</h3>

```python
# tensor2tensor/layers/common_attention.py - get_timing_signal_1d()
position = tf.to_float(tf.range(length) + start_index)
num_timescales = channels // 2
log_timescale_increment = (
    math.log(float(max_timescale) / float(min_timescale)) /
    tf.maximum(tf.to_float(num_timescales) - 1, 1))
inv_timescales = min_timescale * tf.exp(
    tf.to_float(tf.range(num_timescales)) * -log_timescale_increment)
scaled_time = tf.expand_dims(position, 1) * tf.expand_dims(inv_timescales, 0)
# Please note that this slightly differs from the published paper.
# See a discussion here: https://github.com/tensorflow/tensor2tensor/pull/177
signal = tf.concat([tf.sin(scaled_time), tf.cos(scaled_time)], axis=1)
```

两处和论文公式不同，代码注释自己也承认了：

- 论文是 sin / cos **交错**（偶数维 sin、奇数维 cos），代码是前一半全 sin、后一半全 cos。对后面的线性层来说只是维度重排，效果等价。
- 频率按 $\exp(-k\cdot\log(10^4)/(d/2-1))$ 取，最低频正好是 $1/10^4$；论文公式的指数是 $2i/d _ {model}$，最低频略高于 $1/10^4$。

<h3 id="源码-超参数与-pre-norm">5. 超参数：现在的 `transformer_base` 已经是 pre-norm</h3>

```python
# tensor2tensor/models/transformer.py - transformer_base_v1()
hparams.norm_type = "layer"
hparams.hidden_size = 512
hparams.optimizer_adam_beta1 = 0.9
hparams.optimizer_adam_beta2 = 0.98
hparams.optimizer_adam_epsilon = 1e-9
hparams.learning_rate_decay_scheme = "noam"
hparams.learning_rate_warmup_steps = 4000
hparams.num_hidden_layers = 6
hparams.label_smoothing = 0.1
hparams.shared_embedding_and_softmax_weights = True
hparams.add_hparam("filter_size", 2048)
hparams.add_hparam("num_heads", 8)

# transformer_base_v2()：在 v1 之上
hparams.layer_preprocess_sequence = "n"    # 子层之前先 LayerNorm
hparams.layer_postprocess_sequence = "da"  # 子层之后 dropout + 残差相加
hparams.learning_rate_warmup_steps = 8000

# transformer_big()
hparams.hidden_size = 1024
hparams.filter_size = 4096
hparams.num_heads = 16
hparams.layer_prepostprocess_dropout = 0.3
```

`transformer_base_v1` 对应论文：`common_hparams` 的默认后处理是 `"dan"`（dropout → add → norm），即 $\mathrm{LayerNorm}(x + \mathrm{Dropout}(\mathrm{Sublayer}(x)))$。当前默认的 `transformer_base` 继承 v2/v3，改成了 **pre-norm**：$x + \mathrm{Dropout}(\mathrm{Sublayer}(\mathrm{LayerNorm}(x)))$，预热也变成 8000 步。用仓库默认配置复现论文数字前，要先切回 v1。

<h3 id="源码-论文与代码对照表">6. 论文与代码对照表</h3>

| 论文 | tensor2tensor | 说明 |
|---|---|---|
| 式 (1) $\mathrm{softmax}(QK^\top/\sqrt{d_k})V$ | `multihead_attention` 里 `q *= d_k**-0.5` + `dot_product_attention` | 缩放挪到 $q$ 上，等价 |
| 掩码设为 $-\infty$ | `attention_bias_lower_triangle`：$-10^9$ | 数值上等价 |
| §3.5 正弦 / 余弦交错 | `get_timing_signal_1d`：先 sin 后 cos | 注释写明与论文略有不同 |
| $\mathrm{LayerNorm}(x+\mathrm{Sublayer}(x))$ | v1：`"dan"`；当前默认：pre-norm `"n"` + `"da"` | 默认配置已不是论文的 post-norm |
| $h=8$，$d _ {ff}=2048$，$d _ {model}=512$ | `num_heads=8`，`filter_size=2048`，`hidden_size=512` | 一致 |
| warmup 4000，Adam $\beta_2=0.98$ | v1 一致；v2 改 8000，v3 改 $\beta_2=0.997$ | 版本演进 |
| 标签平滑 0.1、共享嵌入 | `label_smoothing=0.1`、`shared_embedding_and_softmax_weights=True` | 一致 |
| big：$h=16$，$d _ {ff}=4096$，$P _ {drop}=0.3$ | `transformer_big` | 一致（batch 改 2048 以适配 12 GB 显卡） |

</details>

---

## 🔗 在学习路线中的位置

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：读这篇之前、之后各读什么</summary>

- **之前**：不需要强化学习的前置知识；会矩阵乘法和 softmax 就够了。本站的 [PPO](../PPO_Proximal_Policy_Optimization/PPO_Proximal_Policy_Optimization.html) 和 [Diffusion Policy](../Diffusion_Policy/Diffusion_Policy.html) 不依赖它，可以先读也可以后读。
- **紧接着**：[ACT](../../03_High_Impact_Selection/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware.html) 用 Transformer 一次预测一整段动作，是 π₀ 笔记里说的「动作块的来源工作之一」。
- **之后**：[π₀](../../03_High_Impact_Selection/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.html)、[π₀.₅](../../03_High_Impact_Selection/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.html)、[GR00T N1](../../03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.html) 这些 VLA；人形控制这边是[真实世界人形行走](../../03_High_Impact_Selection/Real-World_Humanoid_Locomotion_with_RL/Real-World_Humanoid_Locomotion_with_RL.html)和 [MaskedMimic](../../03_High_Impact_Selection/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting.html)。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：七问 —— 为什么除以 √d_k、多头的意义、位置编码、复杂度、训练并行与推理串行、机器人的 token 怎么选、和机器人 VLA 的关系</summary>

**Q：为什么要除以 $\sqrt{d_k}$？**  
A：若 $q$、$k$ 分量独立、均值 0、方差 1，点积方差是 $d_k$。$d_k=64$ 时标准差 8，softmax 容易饱和成 one-hot，梯度 $p(1-p)$ 接近 0（例 2 里 0.0028 对 0.250，差约 89 倍）。除以 $\sqrt{d_k}$ 把方差拉回 1。论文把这写成猜测（"We suspect"），依据是大 $d_k$ 时不缩放的点积注意力不如加性注意力。

**Q：多头比单头强在哪？计算量会变多吗？**  
A：单头只有一组权重，会把不同关系平均掉；多头在不同投影子空间里各自算注意力。每头维度是 $d _ {model}/h$，总计算量和单头满维度相近。Table 3 (A)：1 头 24.9，8 头 25.8，32 头又降到 25.4。

**Q：为什么需要位置编码？为什么选正弦？**  
A：自注意力对输入顺序是置换等变的，不加位置信号就分不出顺序。正弦的理由是相对偏移可以写成线性变换、可能外推到更长序列——都是作者的假设。Table 3 (E) 里可学习嵌入 25.7 对 25.8，几乎一样。

**Q：自注意力的复杂度是多少？什么时候比 RNN 便宜？**  
A：每层 $O(n^2 d)$，串行步数 $O(1)$，最长路径 $O(1)$；RNN 是 $O(nd^2)$、$O(n)$、$O(n)$。$n<d$ 时自注意力每层更便宜。长序列可以用邻域为 $r$ 的受限注意力，把复杂度降到 $O(rnd)$，代价是最长路径变成 $O(n/r)$。

**Q：Transformer 训练并行，那推理也并行吗？**  
A：不。训练时目标句已知，用因果掩码一次算完所有位置；推理仍是逐个自回归。π₀ 和 GR00T N1 这类 VLA 用流匹配一次生成整块动作（π₀ 50 步、GR00T N1 16 步）；说它们「是为了绕开逐 token 解码的延迟」是我们的关联，不是本文内容。

**Q：把 Transformer 用到机器人上，token 怎么选？**  
A：看任务和时间预算。行走控制器可以一步「观测—动作」一个 token（Digit，16 步窗口、50 Hz）；操作模型把图像切块、文字分词、动作一步一个（π₀ 按 openpi 默认一共 867 个）。图像 token 涨得最快，而注意力是 $n^2$ 的；控制频率又限制了每一步能算多久，所以要在窗口长度、图像分辨率和动作块长度之间取舍。这是我们根据这几篇原论文的归纳。

**Q：这篇和机器人学习有什么关系？**  
A：论文本身没有。后来的模型用它做主干：π₀ 的 PaliGemma（Gemma 2B）是 decoder-only Transformer，动作专家通过自注意力和它交互；GR00T N1 的动作头是 DiT，用交叉注意力读视觉语言特征；Diffusion Policy 也提供了时序 Transformer 版本的去噪网络；Digit 的行走控制器是一个只看过去的因果 Transformer。读懂 Q/K/V、掩码和位置编码，是读这些论文的前提。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：数字从哪一节来，动画与视频的素材，以及和本站其他笔记的关系</summary>

<h3 id="数字出处">数字出处</h3>

- 复杂度表：Table 1 与 §4。
- $h=8$、$d_k=d_v=64$、$N=6$、$d _ {model}=512$、$d _ {ff}=2048$：§3.1–3.3。
- $\sqrt{d_k}$ 与方差 $d_k$：§3.2.1 与脚注 4。
- 嵌入共享、乘 $\sqrt{d _ {model}}$：§3.4；位置编码：§3.5。
- 学习率、Adam、dropout、标签平滑：§5.3–5.4；硬件与训练时长：§5.2；数据与 batch：§5.1。
- BLEU 与 FLOPs：Table 2 与脚注 5；英→法正文 41.0 与表中 41.8 的出入见 §6.1；beam search 与检查点平均：§6.1。
- 头数、位置嵌入等消融：Table 3；句法分析：Table 4；注意力可视化：附录图 3–5。
- 源码：tensor2tensor `master` 分支的 `layers/common_attention.py`、`models/transformer.py`、`layers/common_hparams.py`。
- 具体实例与动画第 6–8 幕的向量、分数和各评委看哪一步是我们构造的玩具数；例 5、例 6 是我们的计算。动画里的比喻（传话、开会、查资料、评委、时钟等）是我们为讲解加的。
- 机器人那一侧（都对照了原论文的 LaTeX 源码；代码只在论文没写时引用，并注明）：
  - Digit：Radosavovic 等，[arXiv 2303.03381](https://arxiv.org/abs/2303.03381) v2。窗口 16、嵌入维度 192、MLP [512, 512]、4 个块 4 个头、1.4M 参数、正弦位置编码、因果掩码：「Model architecture」；策略 50 Hz：「Sim-to-real transfer」；16 个关节的 PD 目标 + 8 个腿部关节的 PD 增益：「Joint optimization with RL」；desired vs actual states：引言；被台阶绊住后腿抬得更高更快：「Emergent recovery from foot-trapping」与图 6；只换网络的 30 次（3 个场景）成功率：「Neural network comparisons」与图 8A，条高是我们从 `ablation_v11.pdf` 里量的（Transformer 96.7%、LSTM 88.9%、TCN 86.2%、MLP 75.0%）；更容易随数据和算力扩展、方便接入更多模态：讨论「Possible extensions」。每头 48 维、每步 20 ms、16 步 0.32 s 是我们算的。v1 没有 50 Hz 和图 8，结构对比是表 V（MLP / CNN / LSTM）。
  - Diffusion Policy：Chi 等，[arXiv 2303.04137](https://arxiv.org/abs/2303.04137) v5。CNN 与 Transformer 两种去噪网络、带噪动作当 token、扩散步的正弦嵌入放在最前、因果注意力、观测经共享 MLP 后走交叉注意力、建议先试 CNN：§3.1 与图 2c；预热 500 / 1000 步：附录 A.4。代码：[real-stanford/diffusion_policy](https://github.com/real-stanford/diffusion_policy) `main@5ba07ac`，`model/diffusion/transformer_for_diffusion.py`、`positional_embedding.py`（`SinusoidalPosEmb`）与 `config/train_diffusion_transformer_*_workspace.yaml`。
  - MaskedMimic：Tessler 等，[arXiv 2409.14393](https://arxiv.org/abs/2409.14393) v1。先验是 Transformer 编码器、每种输入一种 token、没给的输入用注意力掩码挡掉：§6.5；关键帧里没给的关节置零再拼掩码：§6.4；只给头、只给双手：§7.2；只在 Isaac Gym 的仿真角色上做实验：§7。
  - π₀：Black 等，[arXiv 2410.24164](https://arxiv.org/abs/2410.24164)（v1–v4 这些数相同）。两套权重只在自注意力里交互、3 块的分块因果掩码、流匹配时间的正弦编码：附录 B；$H=50$、10 步积分、缓存前缀的 K / V：§IV；73 ms 的三段耗时与执行 16 / 25 步后重新推理：附录 D。论文没写的 224 × 224、每张图 256 个 token、文字 48 个、合计 867、Gemma 8 个头每头 256 维取自 [openpi](https://github.com/Physical-Intelligence/openpi) `main@215abfb` 的 `models/model.py`、`siglip.py`、`pi0.py`、`pi0_config.py`、`tokenizer.py`、`gemma.py`；论文附录 B 写的 `num_heads=18` 与代码、Gemma 技术报告（[arXiv 2403.08295](https://arxiv.org/abs/2403.08295) 表 1）都对不上。
  - GR00T N1：NVIDIA，[arXiv 2503.14734](https://arxiv.org/abs/2503.14734) v2。Eagle-2、每帧 64 个图像 token、第 12 层特征、DiT 里交叉注意力与自注意力交替、$H=16$、$K=4$：§2.1；63.9 ms：§2；AdamW、$10^{-4}$、batch 16384、20 万步：附录表 6；和 π₀ 的接法对比：§5。代码对照 [Isaac-GR00T](https://github.com/NVIDIA/Isaac-GR00T) 的 `n1-release` 标签。
  - ACT：Zhao 等，[arXiv 2304.13705](https://arxiv.org/abs/2304.13705)：用 Transformer 一次预测接下来 $k$ 步动作（§IV-C），ALOHA 整套不到 2 万美元（图 1）。
  - 动画里提到的几篇旁证：BPE 把罕见词切成子词（Sennrich 等，[arXiv 1508.07909](https://arxiv.org/abs/1508.07909) 摘要；本文 §5.1 训练用的 BPE 引的是 Britz 等 2017）；ViT 把图切成 16 × 16 像素的块（[arXiv 2010.11929](https://arxiv.org/abs/2010.11929) 图 1、§3.1，224 × 224 时 196 块是我们算的）；残差把网络叠到 152 层（He 等，[arXiv 1512.03385](https://arxiv.org/abs/1512.03385) 摘要）；层归一化在一层内对一个样本求均值方差（Ba 等，[arXiv 1607.06450](https://arxiv.org/abs/1607.06450) 摘要）；dropout「防止单元之间过度互相依赖」（Srivastava 等，JMLR 15, 2014，摘要）；BLEU 数候选译文与参考译文相同的 n-gram（Papineni 等，ACL 2002，§2；本文没有引用这篇）。

<h3 id="动画与视频的素材">动画与视频的素材</h3>

- 论文附录图 4（"its" → "Law"）：从 arXiv 源文件里的原图裁剪，放在 `assets/img/papers/transformer/`。论文首页写明，注明出处后允许在新闻或学术作品里复制其中的表格和图。
- 第 1、11 幕的 Digit 视频（第 4 幕切成小方块的是第 1 幕那段的首帧）：剪自第 014 期[真实世界人形行走的项目页](https://learning-humanoid-locomotion.github.io/)（项目页没有标倍速），放在 `assets/img/papers/transformer/clips/`，只做讲解引用。
- 格子里走路的 G1：第 032 期 HOMIE 在 MuJoCo 里回放官方 `deploy.onnx` 的贴图，只作示意。
- Digit、UR5、G1 的真机图：[Robot_Description_Gallery_Online](https://github.com/ImChong/Robot_Description_Gallery_Online) 按各家开源 URDF 渲染的缩略图。

<h3 id="相关阅读">相关阅读</h3>

- 本站 [真实世界人形行走](../../03_High_Impact_Selection/Real-World_Humanoid_Locomotion_with_RL/Real-World_Humanoid_Locomotion_with_RL.html)：Digit 的 16 步因果 Transformer，图 8A 只换学生网络的对比。
- 本站 [Diffusion Policy](../Diffusion_Policy/Diffusion_Policy.html)：去噪网络除了 CNN 还有时序 Transformer 版本。
- 本站 [MaskedMimic](../../03_High_Impact_Selection/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting.html)：先验是一个 Transformer 编码器，用注意力掩码挡掉没给的输入。
- 本站 [GR00T N1](../../03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.html)：Eagle-2 VLM + DiT 动作头，交叉注意力连接。
- 本站 [π₀](../../03_High_Impact_Selection/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.html)：同一个 Transformer 里两套权重，只在自注意力层交互；位置编码的正弦函数被借来编码流匹配时间步。
- 本站 [π₀.₅](../../03_High_Impact_Selection/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.html)：在 π₀ 上加了语义子任务预测和异构数据的联合训练（[arXiv 2504.16054](https://arxiv.org/abs/2504.16054) 摘要）。
- 本站 [ACT](../../03_High_Impact_Selection/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware.html)：用 Transformer 一次预测一整段动作。
- [Layer Normalization（Ba et al., 2016）](https://arxiv.org/abs/1607.06450)、[Deep Residual Learning（He et al., 2016）](https://arxiv.org/abs/1512.03385)：残差 + LayerNorm 的来源。

</details>
