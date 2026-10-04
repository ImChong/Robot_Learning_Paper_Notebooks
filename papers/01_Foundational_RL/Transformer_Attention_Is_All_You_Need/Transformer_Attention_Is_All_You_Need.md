---
layout: paper
paper_order: 17
title: "Attention Is All You Need (Transformer)"
category: "基础强化学习 Foundational RL"
zhname: "Transformer：注意力就是你所需要的一切"
demos: ["transformer"]
---

# Attention Is All You Need (Transformer)
**去掉循环和卷积，只用缩放点积注意力、多头、正弦位置编码和残差 + LayerNorm 搭成编码器—解码器；整句并行训练，WMT14 英→德 28.4 BLEU，后来成了 VLA、扩散策略、世界模型的共同骨架。**

> 📅 阅读日期: 2026-09-30
>
> 🏷️ 板块: 01_Foundational_RL / 基础架构（放在基础板块，是因为本站的 Diffusion Policy、GR00T N1、π₀、π₀.₅ 都建立在它上面）
>
> 🧭 状态: 已对照 [arXiv:1706.03762v7](https://arxiv.org/abs/1706.03762) 正文、Table 1–3 与论文指向的官方实现 [tensorflow/tensor2tensor](https://github.com/tensorflow/tensor2tensor)。论文 §6.1 正文把英→法写成 41.0，Table 2 与摘要写 41.8，本笔记按表取 41.8 并注明差异。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [1706.03762](https://arxiv.org/abs/1706.03762) |
| **PDF** | [arxiv.org/pdf/1706.03762](https://arxiv.org/pdf/1706.03762) |
| **会议** | NIPS 2017（第 31 届，Long Beach） |
| **发布时间** | 2017年6月12日（arXiv v1），NIPS 2017 |
| **作者** | Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin（同等贡献，排名随机） |
| **机构** | Google Brain, Google Research, University of Toronto |
| **官方代码** | [tensorflow/tensor2tensor](https://github.com/tensorflow/tensor2tensor)（论文 §7 给出；仓库已归档，不再维护） |

---

## 🎯 一句话总结

Transformer 把序列建模里的「时间步循环」换成「一层之内所有位置两两算注意力」：串行步数从 $O(n)$ 降到 $O(1)$，训练可以整句并行。核心公式只有一行 $\mathrm{softmax}(QK^\top/\sqrt{d_k})V$，再加多头、正弦位置编码、残差 + LayerNorm 和逐位置 FFN。它是一篇**机器翻译**论文，不含任何机器人或强化学习内容；放进本站基础板块，是因为后面读到的 [Diffusion Policy](../Diffusion_Policy/Diffusion_Policy.md) 的 Transformer 变体、[GR00T N1](../../03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.md) 的 DiT 动作头、[π₀](../../03_High_Impact_Selection/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.md) 的 Gemma 主干都直接用这套块。

> 🎮 **本文内嵌 1 段讲解动画 + 1 段配音视频**（不用装任何东西）：
> 1. [七幕动画：Transformer 全流程](#tf-explainer-anim) —— 约 87 秒串完「RNN 的串行瓶颈 → 缩放点积注意力手算 → 为什么除以 $\sqrt{d_k}$ → 多头 → 位置编码 → 编码器 / 解码器与因果掩码 → 训练配方与结果」
> 2. [配音讲解视频](#tf-video) —— 同样七幕，加中文配音与字幕，5 分 51 秒竖屏，可下载

> 🚶 [具体实例](#实例-环境设定)用 $d_k = 4$ 的三个词把一次注意力从点积算到输出，再算 $\sqrt{d_k}$ 缩放前后的梯度、$d _ {model}=4$ 的位置编码和第 4000 步的学习率；[源码对照](#源码-缩放点积注意力)逐段对照 tensor2tensor，并列出代码与论文不一致的三处（位置编码的 sin/cos 排布、默认改成 pre-norm、掩码用 $-10^9$ 而不是 $-\infty$）。

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

---

## 🎬 七幕动画：Transformer 全流程 {#tf-explainer-anim}

<div class="paper-demo" data-demo="tf-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#tf-video}

<div class="paper-demo" data-demo="tf-video" data-src="media/tf_explainer_video.mp4" data-poster="media/tf_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/tf_explainer_video.mp4" download="Transformer_讲解视频.mp4">下载 mp4（7.7 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：问题、注意力、多头、位置编码、整体结构和训练配方按小节收起，具体实例、源码对照、面试和附录各收成一块。想细读哪一块就点开，内容一字未删；下面两张流程图留在外面。目录里的标题可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」。

---

## ❓ 论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：RNN 按时间串行、长距离依赖路径长、卷积要堆很多层才能连通</summary>

2017 年翻译模型的主流是编码器—解码器结构的 RNN（LSTM / GRU），再用注意力把两边连起来。引言里点出的毛病只有一个根源：**按时间步串行**。

1. **算得慢。** 隐状态 $h_t$ 是 $h _ {t-1}$ 和第 $t$ 个输入的函数，同一句话里的位置没法并行。句子越长越慢，而显存又限制了跨样本的批量（§1）。
2. **远距离依赖走得远。** 第 1 个词的信息要经过 $n$ 次状态更新才能影响第 $n$ 个词。前向、反向信号要穿过的路径越长，越难学（§4 引 Hochreiter 等人）。
3. **卷积也没解决干净。** ByteNet、ConvS2S 用卷积换来并行，但连通任意两个位置要 $O(n/k)$ 层（连续卷积核）或 $O(\log_k n)$ 层（空洞卷积）。

论文的提法是：**完全不用循环、也不用卷积，只靠注意力**建模输入输出之间的全局依赖（§1、§2）。在此之前注意力几乎总是和 RNN 搭配使用，作者说据他们所知这是第一个只靠自注意力的转导模型。

Table 1 把三种层放在一起比：

| 层类型 | 每层复杂度 | 最少串行操作 | 最长路径 |
|---|---|---|---|
| 自注意力 | $O(n^2 \cdot d)$ | $O(1)$ | $O(1)$ |
| 循环 | $O(n \cdot d^2)$ | $O(n)$ | $O(n)$ |
| 卷积 | $O(k \cdot n \cdot d^2)$ | $O(1)$ | $O(\log_k n)$ |
| 受限自注意力（邻域 $r$） | $O(r \cdot n \cdot d)$ | $O(1)$ | $O(n/r)$ |

自注意力的代价是 $n^2$。§4 的论证是：当句长 $n$ 小于表示维度 $d$（翻译里常见，$d=512$），它每层反而比循环层便宜；很长的序列可以改用受限自注意力，作者把这留作后续工作。

</details>

---

## 🔧 方法详解

### 1. 缩放点积注意力

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一行公式、为什么除以 √d_k、三种用法</summary>

注意力把一个 query 和一组 key–value 对映射成输出：输出是 value 的加权和，权重由 query 和对应 key 的相似度决定（§3.2）。本文用点积算相似度，再除以 $\sqrt{d_k}$：

$$
\mathrm{Attention}(Q, K, V) = \mathrm{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right) V
$$

$Q \in \mathbb{R}^{n_q \times d_k}$、$K \in \mathbb{R}^{n_k \times d_k}$、$V \in \mathbb{R}^{n_k \times d_v}$，一次矩阵乘法算完所有位置。

**为什么是点积而不是加性注意力。** 两者理论复杂度相近，但点积能用高度优化的矩阵乘法实现，更快也更省显存（§3.2.1）。

**为什么要除以 $\sqrt{d_k}$。** $d_k$ 小时两者表现差不多；$d_k$ 大时，不缩放的点积注意力不如加性注意力。作者的猜测（原文用 "We suspect"）是：点积的量级随 $d_k$ 变大，softmax 被推进梯度极小的区域。脚注 4 给出算式：若 $q$、$k$ 的分量独立、均值 0、方差 1，则

$$
q \cdot k = \sum_{i=1}^{d_k} q_i k_i,\qquad \mathbb{E}[q\cdot k]=0,\qquad \mathrm{Var}[q \cdot k] = d_k
$$

除以 $\sqrt{d_k}$ 把方差拉回 1。本文 $d_k = 64$，不缩放时点积的标准差是 8。

**三种用法（§3.2.3）。**

| 位置 | Q 来自 | K、V 来自 | 能看到 |
|---|---|---|---|
| 编码器自注意力 | 编码器上一层 | 编码器上一层 | 输入序列的所有位置 |
| 解码器自注意力 | 解码器上一层 | 解码器上一层 | 当前及之前的位置（掩码） |
| 编码器—解码器注意力 | 解码器上一层 | 编码器输出 | 输入序列的所有位置 |

解码器的掩码在 softmax 之前把非法连接的 logit 设为 $-\infty$，保住自回归性质。

</details>

### 2. 多头注意力

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：8 个 64 维的头、为什么总计算量不变、Table 3 (A)</summary>

与其用 $d _ {model}$ 维的 Q、K、V 做一次注意力，论文把它们用不同的可学习矩阵各投影 $h$ 次，并行算完再拼接、再投影（§3.2.2）：

$$
\mathrm{MultiHead}(Q,K,V) = \mathrm{Concat}(\mathrm{head}_1,\dots,\mathrm{head}_h)\,W^O,\qquad
\mathrm{head}_i = \mathrm{Attention}(QW_i^Q, KW_i^K, VW_i^V)
$$

其中 $W_i^Q, W_i^K \in \mathbb{R}^{d _ {model}\times d_k}$，$W_i^V \in \mathbb{R}^{d _ {model}\times d_v}$，$W^O \in \mathbb{R}^{hd_v \times d _ {model}}$。本文 $h = 8$，$d_k = d_v = d _ {model}/h = 64$。

作者给的理由是：单头会把不同位置、不同表示子空间的信息**平均**掉，多头可以同时关注多种关系。每头维度缩成 $1/h$，所以**总计算量和满维度的单头相近**——多头不是额外买算力，而是换一种切分。

Table 3 (A) 在保持计算量不变的前提下只改头数（newstest2013 dev BLEU）：

| $h$ | $d_k = d_v$ | PPL (dev) | BLEU (dev) |
|---|---|---|---|
| 1 | 512 | 5.29 | 24.9 |
| 4 | 128 | 5.00 | 25.5 |
| **8（base）** | **64** | **4.92** | **25.8** |
| 16 | 32 | 4.91 | 25.8 |
| 32 | 16 | 5.01 | 25.4 |

单头比最好设置低 0.9 BLEU；头太多、每头维度太窄时质量也回落。Table 3 (B) 另外显示单独缩小 $d_k$（到 16、32）会伤质量，作者据此推测「判断相容性并不容易，可能需要比点积更复杂的相容函数」。

附录图 3–5 把第 5 层的注意力可视化：有的头跟随长距离依赖（"making … more difficult"），有的头像在做指代消解（"its" → "Law"）。这是定性观察，论文没有量化每个头的功能。

</details>

### 3. 位置编码

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：正弦 / 余弦、相对位置的线性关系、与可学习嵌入几乎一样</summary>

没有循环也没有卷积，模型本身对词序不敏感：把输入打乱，自注意力的输出只是跟着换位。所以要在编码器和解码器最底层把位置信号**加**到词嵌入上，维度同为 $d _ {model}$（§3.5）：

$$
PE_{(pos,2i)} = \sin\!\left(\frac{pos}{10000^{2i/d_{model}}}\right),\qquad
PE_{(pos,2i+1)} = \cos\!\left(\frac{pos}{10000^{2i/d_{model}}}\right)
$$

每个维度对应一条正弦，波长从 $2\pi$ 到 $10000\cdot 2\pi$ 成几何级数。作者选它的理由写的是**假设**：对任意固定偏移 $k$，$PE _ {pos+k}$ 能表示成 $PE _ {pos}$ 的线性函数（每对 sin / cos 转过固定角度），模型可能因此容易学会按相对位置关注。

Table 3 (E) 换成可学习的位置嵌入，dev BLEU 25.7 对 base 的 25.8，几乎一样。最终选正弦，是因为它**可能**让模型外推到比训练时更长的序列——论文没有给出外推实验。

</details>

### 4. 整体结构：编码器 × 6、解码器 × 6

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：残差 + LayerNorm、逐位置 FFN、共享嵌入、为什么推理还是逐词</summary>

**编码器**（§3.1）：$N = 6$ 个相同的层，每层两个子层——多头自注意力、逐位置 FFN。每个子层外面包残差再做 LayerNorm：

$$
\mathrm{LayerNorm}(x + \mathrm{Sublayer}(x))
$$

为了能加残差，所有子层和嵌入层的输出维度都是 $d _ {model} = 512$。

**解码器**：同样 $N = 6$ 层，在两个子层之间多插一个编码器—解码器注意力。解码器自注意力加掩码，加上输出嵌入右移一位，保证位置 $i$ 的预测只依赖已知的 $<i$ 位置。

**逐位置 FFN**（§3.3）：

$$
\mathrm{FFN}(x) = \max(0,\, xW_1 + b_1)\,W_2 + b_2
$$

对每个位置独立、相同地作用，等价于两个核宽为 1 的卷积；输入输出 512 维，中间 $d _ {ff} = 2048$。

**嵌入与 softmax**（§3.4）：两个嵌入层与 softmax 前的线性层**共享同一个权重矩阵**，嵌入层里再把权重乘以 $\sqrt{d _ {model}}$。

**训练并行、推理逐词。** 训练时目标句整句已知，配合掩码一次算完所有位置（teacher forcing）。推理时仍然是自回归：生成一个词、拼回输入、再算下一个。论文结论里把「让生成不那么串行」列为下一步目标。

</details>

### 5. 训练配方

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：数据、硬件、学习率预热、dropout 与标签平滑</summary>

**数据**（§5.1）：WMT14 英→德约 450 万句对，BPE 共享词表约 37000；英→法 3600 万句，32000 word-piece。按长度近似分桶，每个 batch 约 25000 个源 token 和 25000 个目标 token。

**硬件**（§5.2）：一台机器 8 张 NVIDIA P100。base 每步约 0.4 秒，10 万步、12 小时；big 每步 1.0 秒，30 万步、3.5 天。

**优化器**（§5.3）：Adam，$\beta_1 = 0.9$，$\beta_2 = 0.98$，$\epsilon = 10^{-9}$。学习率按式 (3)：

$$
lrate = d_{model}^{-0.5}\cdot\min\!\left(step^{-0.5},\; step\cdot warmup\_steps^{-1.5}\right),\qquad warmup\_steps = 4000
$$

前 4000 步线性上升，之后按 $1/\sqrt{step}$ 衰减。

**正则**（§5.4）：残差 dropout（每个子层输出加回残差之前，以及嵌入 + 位置编码之和）$P _ {drop} = 0.1$；标签平滑 $\epsilon _ {ls} = 0.1$。后者让困惑度变差（模型更「不确定」），但 BLEU 和准确率更高。

**推理**（§6.1）：base 取最后 5 个 checkpoint 的平均，big 取最后 20 个；beam size 4，长度惩罚 $\alpha = 0.6$，最大输出长度为输入长度 + 50。

</details>

---

## 🧭 一次前向的数据流（mermaid）

<div class="mermaid">
flowchart TB
  SRC["源句 token"] --> EMB1["嵌入 × √d_model + 位置编码"]
  EMB1 --> ENC["编码器 × 6<br/>多头自注意力 → Add&amp;Norm<br/>FFN 512→2048→512 → Add&amp;Norm"]
  TGT["目标句右移一位"] --> EMB2["嵌入 × √d_model + 位置编码"]
  EMB2 --> DEC1["解码器 × 6 · 带掩码的自注意力"]
  ENC -->|"K、V"| DEC2["编码器—解码器注意力"]
  DEC1 -->|"Q"| DEC2
  DEC2 --> FFN["FFN → Add&amp;Norm"]
  FFN --> OUT["Linear（与嵌入共享权重）→ softmax → 下一个 token"]
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

## 🚶 具体实例：手算一次注意力、一次缩放和一次学习率

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（6 节）：环境设定 / 第 1 步：点积 / 第 2 步：缩放与 softmax / 第 3 步：加权求和 / 第 4 步：不缩放会怎样 / 第 5 步：位置编码和学习率</summary>

<h3 id="实例-环境设定">环境设定</h3>

下面的向量是**笔记自己构造的玩具数**，只演示机制；动画第二、三幕用的是同一组数。句子 "The cat sat"，只看「sat」这一个 query，$d_k = 4$，value 取 2 维方便看：

| 词 | key $k_i$ | value $v_i$ |
|---|---|---|
| The | $[1, 0, 0, 0]$ | $[1, 0]$ |
| cat | $[1, 1, 1, 0]$ | $[0, 1]$ |
| sat | $[0, 0, 1, 1]$ | $[1, 1]$ |

query $q = [1, 0, 1, 0]$。

<h3 id="实例-第-1-步点积">第 1 步：点积</h3>

$$
q\cdot k_{\text{The}} = 1,\qquad q\cdot k_{\text{cat}} = 1+0+1+0 = 2,\qquad q\cdot k_{\text{sat}} = 0+0+1+0 = 1
$$

<h3 id="实例-第-2-步缩放与-softmax">第 2 步：缩放与 softmax</h3>

除以 $\sqrt{4} = 2$ 得 $[0.5,\ 1.0,\ 0.5]$。$e^{0.5} = 1.6487$，$e^{1} = 2.7183$，和为 $1.6487\times2 + 2.7183 = 6.0157$：

$$
w = [0.274,\ 0.452,\ 0.274]
$$

<h3 id="实例-第-3-步加权求和">第 3 步：加权求和</h3>

$$
\text{输出} = 0.274\,[1,0] + 0.452\,[0,1] + 0.274\,[1,1] = [0.548,\ 0.726]
$$

「sat」最关注和自己 query 最像的「cat」。真实模型里 Q、K、V 都是 $x$ 乘可学习矩阵得到的，这里直接给出向量，跳过了投影。

<h3 id="实例-第-4-步不缩放会怎样">第 4 步：不缩放会怎样（$d_k = 64$）</h3>

$d_k = 64$ 时点积标准差是 8。取一组量级合理的分数 $[12, 4, -4, 6]$（同样是玩具数）：

| | 分数 | softmax |
|---|---|---|
| 不缩放 | $[12, 4, -4, 6]$ | $[0.997,\ 3.3\times10^{-4},\ 1.1\times10^{-7},\ 0.0025]$ |
| 除以 8 | $[1.5, 0.5, -0.5, 0.75]$ | $[0.506,\ 0.186,\ 0.069,\ 0.239]$ |

softmax 第 $j$ 项对自身 logit 的导数是 $p_j(1-p_j)$。最大项处：不缩放 $0.9972\times0.0028 \approx 0.0028$，缩放后 $0.506\times0.494 \approx 0.250$，相差约 89 倍。这就是脚注 4 那句「推进梯度极小的区域」的具体样子。

<h3 id="实例-第-5-步位置编码和学习率">第 5 步：位置编码和学习率</h3>

**位置编码**，玩具 $d _ {model} = 4$：$i = 0$ 的频率是 1，$i = 1$ 的频率是 $1/10000^{2/4} = 1/100$。

$$
PE(1) = [\sin 1,\ \cos 1,\ \sin 0.01,\ \cos 0.01] = [0.841,\ 0.540,\ 0.010,\ 1.000]
$$

$$
PE(2) = [\sin 2,\ \cos 2,\ \sin 0.02,\ \cos 0.02] = [0.909,\ -0.416,\ 0.020,\ 1.000]
$$

前两维每步转 1 弧度，后两维每步只转 0.01 弧度。

**学习率**，$d _ {model} = 512$：第 4000 步两项相等，

$$
lrate = 512^{-0.5}\times4000^{-0.5} = 0.04419\times0.01581 \approx 6.99\times10^{-4}
$$

第 10 万步（base 训练结束）是 $0.04419\times100000^{-0.5} \approx 1.40\times10^{-4}$。

</details>

---

## 📊 实验里实际报了什么

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Table 2 的翻译结果、Table 3 的消融、Table 4 的句法分析</summary>

**翻译（Table 2，newstest2014）：**

| 模型 | EN-DE BLEU | EN-FR BLEU | 训练 FLOPs（EN-DE） |
|---|---|---|---|
| GNMT + RL | 24.6 | 39.92 | $2.3\times10^{19}$ |
| ConvS2S | 25.16 | 40.46 | $9.6\times10^{18}$ |
| MoE | 26.03 | 40.56 | $2.0\times10^{19}$ |
| GNMT + RL 集成 | 26.30 | 41.16 | $1.8\times10^{20}$ |
| ConvS2S 集成 | 26.36 | 41.29 | $7.7\times10^{19}$ |
| **Transformer base** | **27.3** | 38.1 | $3.3\times10^{18}$ |
| **Transformer big** | **28.4** | **41.8** | $2.3\times10^{19}$ |

- 英→德：big 比此前最好的结果（含集成）高 2 分以上；base 也超过所有已发表的单模型和集成。
- 英→法：§6.1 正文写 big 得 41.0，Table 2 和摘要写 41.8。两处不一致，本笔记按表取 41.8。big 的英→法把 dropout 从 0.3 改成 0.1。
- FLOPs 是作者按「训练时间 × GPU 数 × 单卡持续算力估计」算的（P100 取 9.5 TFLOPS），不是实测。

**消融（Table 3，newstest2013 dev）：**

| 行 | 改动 | dev BLEU |
|---|---|---|
| base | $N=6$, $d _ {model}=512$, $d _ {ff}=2048$, $h=8$ | 25.8 |
| (A) | 1 个头 | 24.9 |
| (C) | $N = 2$ | 23.7 |
| (C) | $d _ {model} = 1024$ | 26.0 |
| (C) | $d _ {ff} = 4096$ | 26.2 |
| (D) | 去掉 dropout（$P _ {drop}=0$） | 24.6 |
| (E) | 可学习位置嵌入 | 25.7 |
| big | $d _ {model}=1024$, $d _ {ff}=4096$, $h=16$, $P _ {drop}=0.3$ | 26.4 |

结论写得很朴素：模型越大越好，dropout 很有用，位置编码形式无所谓。

**英语句法分析（Table 4，WSJ §23 F1）：** 4 层、$d _ {model} = 1024$，只在 WSJ 4 万句上训练得 91.3，半监督（约 1700 万句）得 92.7。作者强调几乎没为这个任务调参，除 RNN Grammar（93.3）外好于此前报告的模型；这是在说明「能泛化到别的任务」，不是句法分析的新 SOTA。

</details>

---

## ⚠️ 边界

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：平方复杂度、推理仍串行、若干设计理由只是假设</summary>

- **$n^2$ 的代价。** 自注意力每层 $O(n^2 \cdot d)$，长序列（图像、音频、视频）会很贵。论文自己把受限的局部注意力列为后续方向（§4、§7）。
- **推理仍然逐词。** 训练并行不等于生成并行，解码器仍是自回归。
- **几处理由是假设或猜测。** $1/\sqrt{d_k}$ 的动机用的是 "We suspect"；正弦位置编码便于相对位置、可能外推，都没有单独实验验证。
- **注意力可视化不是解释。** 附录图只是挑出的例子，不能直接当作每个头的功能说明。
- **和机器人的关系是后来的事。** 论文只做文本任务。本站把它放在基础板块，是因为后续 VLA 与扩散策略直接复用这套块；论文本身没有提供任何控制或 RL 结论。

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

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：六问 —— 为什么除以 √d_k、多头的意义、位置编码、复杂度、训练并行与推理串行、和机器人 VLA 的关系</summary>

**Q：为什么要除以 $\sqrt{d_k}$？**  
A：若 $q$、$k$ 分量独立、均值 0、方差 1，点积方差是 $d_k$。$d_k=64$ 时标准差 8，softmax 容易饱和成 one-hot，梯度 $p(1-p)$ 接近 0。除以 $\sqrt{d_k}$ 把方差拉回 1。论文把这写成猜测（"We suspect"），依据是大 $d_k$ 时不缩放的点积注意力不如加性注意力。

**Q：多头比单头强在哪？计算量会变多吗？**  
A：单头只有一组权重，会把不同关系平均掉；多头在不同投影子空间里各自算注意力。每头维度是 $d _ {model}/h$，总计算量和单头满维度相近。Table 3 (A)：1 头 24.9，8 头 25.8，32 头又降到 25.4。

**Q：为什么需要位置编码？为什么选正弦？**  
A：自注意力对输入顺序是置换等变的，不加位置信号就分不出词序。正弦的理由是相对偏移可以写成线性变换、可能外推到更长序列——都是作者的假设。Table 3 (E) 里可学习嵌入 25.7 对 25.8，几乎一样。

**Q：自注意力的复杂度是多少？什么时候比 RNN 便宜？**  
A：每层 $O(n^2 d)$，串行步数 $O(1)$，最长路径 $O(1)$；RNN 是 $O(nd^2)$、$O(n)$、$O(n)$。$n<d$ 时自注意力每层更便宜。长序列可以用邻域为 $r$ 的受限注意力，把复杂度降到 $O(rnd)$，代价是最长路径变成 $O(n/r)$。

**Q：Transformer 训练并行，那推理也并行吗？**  
A：不。训练时目标句已知，用因果掩码一次算完所有位置；推理仍是逐词自回归。π₀ 和 GR00T N1 这类 VLA 用流匹配一次生成整块动作，正是为了绕开逐 token 解码的延迟（这是本站的关联，不是本文内容）。

**Q：这篇和机器人学习有什么关系？**  
A：论文本身没有。后来的 VLA 用它做主干：π₀ 的 PaliGemma（Gemma 2B）是 decoder-only Transformer，动作专家通过自注意力和它交互；GR00T N1 的动作头是 DiT；Diffusion Policy 也提供了时序 Transformer 版本的去噪网络。读懂 Q/K/V、掩码和位置编码，是读这些论文的前提。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：数字从哪一节来，以及和本站其他笔记的关系</summary>

<h3 id="数字出处">数字出处</h3>

- 复杂度表：Table 1 与 §4。
- $h=8$、$d_k=d_v=64$、$N=6$、$d _ {model}=512$、$d _ {ff}=2048$：§3.1–3.3。
- $\sqrt{d_k}$ 与方差 $d_k$：§3.2.1 与脚注 4。
- 学习率、Adam、dropout、标签平滑：§5.3–5.4；硬件与训练时长：§5.2。
- BLEU 与 FLOPs：Table 2；英→法正文 41.0 与表中 41.8 的出入见 §6.1。
- 头数、位置嵌入等消融：Table 3；句法分析：Table 4。
- 源码：tensor2tensor `master` 分支的 `layers/common_attention.py`、`models/transformer.py`、`layers/common_hparams.py`。
- 具体实例与动画第二、三幕的向量和分数是笔记构造的玩具数。

<h3 id="相关阅读">相关阅读</h3>

- 本站 [Diffusion Policy](../Diffusion_Policy/Diffusion_Policy.md)：去噪网络除了 CNN 还有时序 Transformer 版本。
- 本站 [GR00T N1](../../03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.md)：Eagle-2 VLM + DiT 动作头，交叉注意力连接。
- 本站 [π₀](../../03_High_Impact_Selection/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.md)：同一个 Transformer 里两套权重，只在自注意力层交互；位置编码的正弦函数被借来编码流匹配时间步。
- 本站 [π₀.₅](../../03_High_Impact_Selection/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.md)：同一个模型先输出文本子任务，再输出连续动作。
- [Layer Normalization（Ba et al., 2016）](https://arxiv.org/abs/1607.06450)、[Deep Residual Learning（He et al., 2016）](https://arxiv.org/abs/1512.03385)：残差 + LayerNorm 的来源。

</details>
