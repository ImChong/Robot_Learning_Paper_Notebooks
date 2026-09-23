---
layout: paper
title: "Cosmos World Foundation Model Platform for Physical AI"
zhname: "Cosmos：面向物理 AI 的世界基础模型平台"
category: "高影响力精选 High Impact Selection"
subcategory: "Sim-to-Real & Foundation Model"
arxiv: "2501.03575"
demos: ["cosmos"]
---

# Cosmos World Foundation Model Platform for Physical AI
**NVIDIA 提出的物理 AI 世界基础模型平台：整理大规模视频，训练因果视频 tokenizer 与两类视频生成模型，再针对相机、机器人和驾驶场景进行后训练。**

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 论文 | [arXiv:2501.03575](https://arxiv.org/abs/2501.03575) · [HTML](https://arxiv.org/html/2501.03575v3) · [PDF](https://arxiv.org/pdf/2501.03575) |
| 作者 | NVIDIA（Niket Agarwal 等） |
| 首次发布 | 2025 年 1 月 7 日（arXiv） |
| 官方代码与模型 | [NVIDIA Cosmos-Predict1](https://github.com/nvidia-cosmos/cosmos-predict1) |

## 🎯 一句话理解

给模型看大量视频，让它学习“接下来可能出现什么画面”；再用指定领域的视频与条件微调，让它预测该任务下可能的未来。**模型生成的是视频，不是机器人关节命令**。预测结果可以辅助数据生成或规划，但真实机器人仍需要策略、控制器和安全验证。

> 🎮 **本页有五幕动画 + 3 个交互图**：视频类别占比、token 压缩量、1 帧与 9 帧条件下的物理预测指标。演示图只解释机制；图表标明的论文数值均来自 [§3.1、图 7、表 10 与表 20](https://arxiv.org/html/2501.03575v3)。想动手读，可直接跳到[逐步案例](#cosmos-case-study)和[官方源码参考](#cosmos-source-guide)。

## 🎬 五幕动画：Cosmos 如何构建世界模型 {#cosmos-explainer-anim}

<div class="paper-demo" data-demo="cosmos-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 📖 动画之后的正文默认全部折叠，按主题逐节展开；交互图保持可见。点击展开可以核对公式、条件和论文中的实验。

## ❓ 为什么需要世界模型？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：世界模型与策略模型的区别</summary>

强化学习的策略模型回答“**现在采取什么动作**”，世界模型回答“**观察和条件给定后，未来可能怎样变化**”。真实机器人大量试错有成本，通用世界模型提供一个可再训练的视觉预测起点。不过视频中的“看起来合理”不代表力学上正确，也不自动给出可执行的动作。

<div class="mermaid">
flowchart TB
    A["过去观察 + 可选文字或动作条件"] --> B["Cosmos 视频世界模型"]
    B --> C["可能的未来视频"]
    C --> D["下游规划 / 训练 / 评估"]
    D --> E["策略 + 控制器：真实动作"]
</div>

论文平台包含**视频整理管线、视频 tokenizer、扩散与自回归基础模型、后训练样例及 Guardrail**。这篇笔记讨论的是 2025 年论文的 **Predict1**，不能把后来的 Predict2 或 Cosmos Transfer 细节倒填进来。

</details>

## ① 数据：从原始视频到训练片段

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：五步整理、规模与类别占比</summary>

论文 §3 处理约 **2000 万小时**原始视频（720p–4K），得到约 **1 亿段预训练片段**和约 **1000 万段微调片段**。原始视频时长并不等于机器人演示时长，也不等于最终训练片段的总时长。

| 步骤 | 做什么 | 为什么 |
|---|---|---|
| 1 切分 | 按镜头变化分段；短于 2 秒丢弃，长于 60 秒再切分 | 避免让剪辑跳转冒充真实世界的连续运动 |
| 2 过滤 | 排除无用、低质量或缺少有效运动的片段 | 把训练算力留给更有价值的变化 |
| 3 标注 | 为片段添加视频描述 | 给文字条件模型提供配对文本 |
| 4 去重 | 移除语义重复内容 | 避免大量相似片段挤占数据配比 |
| 5 分片 | 按分辨率和宽高比组织数据 | 方便模型批量训练 |

<div class="mermaid">
flowchart TB
    A["原始视频 约 2000 万小时"] --> B["镜头切分 2–60 秒"]
    B --> C["过滤 → 标注 → 语义去重"]
    C --> D["按尺寸分片"]
    D --> E["约 1 亿段预训练片段"]
</div>

下图百分比是论文 **§3.1 对视频类别的组成描述**，各类相加为 100%，不是某个模型的成功率。点击类别可查看它为何出现在物理 AI 的训练数据中。

</details>

<div class="paper-demo" data-demo="cosmos-data"><p class="demo-fallback">（视频类别交互图需要 JavaScript）</p></div>

## ② 视频 tokenizer：先压缩再学习未来

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：因果性、连续/离散 token 与压缩量怎么算</summary>

原始视频像素太密集。编码器把视频变为较短的潜表示，解码器再尝试还原：$\hat{x} _ {0:T}=\mathcal D(\mathcal E(x _ {0:T}))$。tokenizer 训练的是**压缩后仍能还原关键视觉信息**；下游世界模型在潜空间生成，而非直接对每个 RGB 像素预测。

**因果**是指表示当前时刻时只使用当前及过去帧。论文采用因果时间卷积和注意力，也先用小波变换减少冗余。它允许单张图像与视频共用一套 tokenizer：首帧保留一个单独的时间 token，后续帧按时间压缩。

| 路线 | 本文对应 tokenizer | 表示 | 后续模型 |
|---|---|---|---|
| 连续 | CV8×8×8 | 每个时空位置是连续向量；论文示例潜通道数 $C=16$ | 扩散模型在连续潜空间去噪 |
| 离散 | DV8×16×16 | 每个时空位置是离散编号；FSQ 的 $8×8×8×5×5×5=64{,}000$ 种组合 | 自回归模型逐个预测 token |

上表名字中的数字分别表示**时间、高度、宽度的压缩倍率**，不是 8 帧生成 1 帧视频，也不是在 8 Hz 运行。例如输入连续 33 帧、空间 128×128，在空间可整除且时间按首帧单列的教学算例中，CV 路线的位置数为 $(1+32/8)×(128/8)×(128/8)=1280$；DV 则为 $(1+32/8)×(128/16)×(128/16)=320$。**位置数不是字节压缩率**：连续向量有 16 个通道，离散编号还涉及位宽、解码器与存储格式；更强压缩也可能损失细节。

</details>

<div class="paper-demo" data-demo="cosmos-tokens"><p class="demo-fallback">（tokenizer 交互图需要 JavaScript）</p></div>

## ③ 两条并列的预训练路线

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：扩散如何去噪、自回归如何预测下一个 token</summary>

| 比较 | 扩散（Diffusion） | 自回归（Autoregressive） |
|---|---|---|
| 输入表示 | 连续潜变量 CV8×8×8 | 离散 token DV8×16×16 |
| 学习目标 | 对带噪潜变量反复去噪 | 根据前面的 token 预测下一个 token |
| 基础模型 | 7B、14B Text2World → 各自微调为 Video2World | 4B、12B 纯视频预测 → 加文本交叉注意力为 5B、13B Video2World |
| 文字怎么进模型 | 文本条件经交叉注意力进入网络 | 基础 4B/12B 无语言理解；衍生模型才接入 T5 文本特征 |
| 本文的增强模块 | 提示词扩写器，缓解人写提示与训练描述的分布差异 | 可选扩散解码器，改善重压缩后的模糊或伪影 |

**扩散的训练**：从干净的视频潜变量 $x_0$ 加上噪声 $n\sim\mathcal N(0,\sigma^2 I)$，让去噪网络 $D_\theta$ 复原 $x_0$。论文公式 (5) 的直观形式是 $\mathbb E\lVert D_\theta(x_0+n;\sigma)-x_0\rVert_2^2$。生成时重复去噪，文字或已有视频提供条件。

**自回归的训练**：把视频离散编号排成序列，以前面的编号为条件预测下一个；逐个采样再解码为视频。论文使用类似 Llama3 的 GPT 架构，加入 3D 位置编码；文字版通过交叉注意力接入文字。**两者是并列家族**，不能把“先扩散再自回归”当作统一主干。扩散解码器只是自回归输出的可选视觉增强环节。

> 💡 **与强化学习的区别**：这里的训练目标是重建/生成视频，不是 PPO 那种根据 advantage 更新动作策略。即便给后训练模型输入动作，输出仍是动作导致的**预测画面**。

</details>

## ④ 后训练：把通用模型对准具体条件

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：相机轨迹、机器人指令与动作、自动驾驶</summary>

| 论文 §6 示例 | 条件输入 | 预测输出 | 应怎样理解 |
|---|---|---|---|
| 相机控制 | 参考画面 + 相机位姿轨迹 | 新视角的视频 | 条件是“镜头怎么走”，不是机器人腿部动作 |
| 机器人指令 | 机器人当前画面 + 文字指令 | 执行任务的未来视频 | 内部 Cosmos-1X 数据约 200 小时，筛选约 1.2 万段 1–9 秒片段 |
| 机器人动作 | 当前画面 + 夹爪坐标系 7 维动作 $(\Delta x,\Delta y,\Delta z,\Delta\theta_r,\Delta\theta_p,\Delta\theta_y,\Delta g)$ | **下一帧**；多次递推才构成视频 | Bridge 数据约 2 万段机械臂 episode；不等于人形机器人全身 7 维动作 |
| 自动驾驶 | 驾驶画面 + 任务条件 | 未来交通画面/多视角 | 用于驾驶域的专门适配示例 |

动作是一种预训练时未见过的新条件，论文为它增加动作 embedder MLP。论文将这些后训练权重称为 **Sample**：它们展示适配方法，不等于通用规划器或可直接上机的全身控制策略。

</details>

## ⑤ 怎么评估“像真的”和“符合物理”？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：3D 一致性、物理对齐与条件帧的作用</summary>

**画质与 3D 一致性**：除了图像/视频质量，论文还看关键点的几何关系、相机位姿能否重建，以及从生成视频拟合 3D 场景后能否合成保留视角。视觉指标高并不自动证明物理正确。

**物理对齐**：论文用 PhysX / Isaac Sim 设计自由落体、斜坡、积木、骨牌、跷跷板和陀螺等 8 类场景，总计 800 段、每段 100 帧的参考视频。把前 **1 帧或 9 帧**喂给模型，在最长 33 帧的比较窗口里用 PSNR、SSIM、DreamSim 和物体掩码 IoU 比对未来。IoU 越高，物体位置/形状与参考越接近，但它也不是完整的动力学证明。

论文表 20：7B-Video2World 使用“文字 + 1 帧”时平均 IoU **0.332**，用“文字 + 9 帧”时为 **0.592**；14B 对应 **0.338 → 0.598**。更多过去帧有助于判断速度趋势；**更大的模型却没有带来明确的物理对齐提升**。物体凭空消失、形变和违反重力等问题依然存在。下图可切换论文的 7B 与 14B，看各条件下的原始 IoU；图中的柱长按 0–1 全刻度绘制。

</details>

<div class="paper-demo" data-demo="cosmos-physics"><p class="demo-fallback">（物理预测交互图需要 JavaScript）</p></div>

## 🦾 具体实例：给定机械臂动作，逐步预测下一帧 {#cosmos-case-study}

<details class="paper-fold" markdown="1">
<summary>📖 展开完整案例：任务设定 → 数据样本 → 动作编码 → 训练 → 单步预测 → 多步递推 → 排查</summary>

<h3 id="cosmos-walkthrough-1">第 0 步：先说清楚我们想让模型学什么</h3>

假设桌上有一个杯子，机械臂夹爪在杯子旁边。我们给出一段动作，要求夹爪先向杯子靠近，再改变夹爪开合状态。现在要训练的能力是：**看到当前相机画面，并知道下一步动作，预测下一时刻相机将看到什么**。

这对应论文 §6.2 的 **action-based next-frame generation**。下面选用官方仓库的 `video2world_action_bridge_2frames` 配置，沿着扩散式 7B 模型走一遍。杯子场景、动作数值和手算损失是教学设定，不是论文报告的一次成功抓取实验；配置名、数据尺寸和代码调用来自后面的固定版本源码。

| 问题 | 本例的回答 |
|---|---|
| 模型已经看到了什么？ | 当前 RGB 图像 $I_t$ |
| 还额外告诉它什么？ | 下一步的 7 维动作 $a_t$ |
| 模型应该输出什么？ | 预测的下一帧 $\hat I _ {t+1}$ |
| 训练时怎么知道答案？ | 演示数据里真实记录的下一帧 $I _ {t+1}$ |
| 谁决定动作？ | 本例动作来自已有数据；要自主操作时还需要独立的策略或规划器 |
| 本例涉及哪一版？ | Cosmos-Predict1 7B 的动作条件后训练示例 |

可以把任务简写成 $\hat I _ {t+1}\sim p_\theta(I _ {t+1}\mid I_t,a_t)$。这里写成概率分布，是因为单张图像和一个动作未必能唯一确定未来：物体可能被遮挡，摩擦和接触状态也可能未知。换随机种子，模型可能给出不同预测。

<h3 id="cosmos-walkthrough-2">第 1 步：把演示拆成“前一帧、动作、后一帧”</h3>

假设演示保存了 $I_0,I_1,I_2,I_3$ 和相邻帧之间的动作 $a_0,a_1,a_2$。训练时可以组成三条样本：

| 样本 | 可作为条件的内容 | 要学习预测的答案 |
|---|---|---|
| A | $I_0,a_0$ | $I_1$ |
| B | $I_1,a_1$ | $I_2$ |
| C | $I_2,a_2$ | $I_3$ |

**训练程序会读取两张真实图像，但这不意味着推理时可以偷看下一帧。** 第二张真实图像在训练中是监督目标；推理时没有答案，需要由模型生成。官方配置的 `num_frames=2` 就对应这类两帧片段，`sequence_interval=1` 表示相邻采样，`accumulate_action=False` 表示动作按相邻状态求增量。

官方示例使用 Bridge 数据，处理尺寸为 **高 256、宽 320**。论文对 Bridge 的介绍是 5 FPS，即相邻采集帧约隔 0.2 秒；这只是数据时间间隔，不能据此断言模型每次推理只耗时 0.2 秒。后面还会看到，保存 MP4 的 FPS 和模型内部的 FPS 条件也需要分别检查。

<h3 id="cosmos-walkthrough-3">第 2 步：7 个动作数字分别表示什么？</h3>

用一个便于手算的动作表示：

$$a_t=[0.02,0,0,0,0,0,g].$$

在**位置单位为米且第一轴指向杯子**的教学假设下，前三项可以理解为夹爪局部坐标中的 2 厘米位移，接着三项表示旋转变化，最后的 $g$ 表示夹爪控制相关量。它不是“第一个关节转 0.02 弧度”，也不能脱离坐标系解释成“画面向右移动”。

这里有一个值得对照源码的细节：论文写的是夹爪相关的第七维动作，而本次核对的 `Dataset_3D._get_actions()` 实际用 `curr_gripper` 填入第七维。**不要自行把它再做一次差分，也不要未经数据格式核对就把 0/1 分别认定为开/关。** 数据集的编码约定决定它的含义。

官方数据加载器用 `[20,20,20,20,20,20,1]` 缩放动作；推理端 `get_traj()` 对 JSON 的前六维也乘 20。于是本例的第一维从 `0.02` 变为 `0.4`。这只是给网络的数值缩放，机械臂的物理位移依然是教学设定中的 2 厘米。

| 环节 | 本例第一维 | 含义 |
|---|---:|---|
| 原始动作 | 0.02 | 数据约定下的位移增量 |
| 输入网络前 | 0.40 | 乘 20 后的模型输入 |
| 错误地重复缩放 | 8.00 | 同一物理动作被错误放大，输入分布发生偏移 |

因此移植模型时，除了检查动作维数，还要核对**单位、坐标系、旋转表示、夹爪编码、缩放次数和动作与图像的时间对齐**。七个数字的长度相同，不代表语义相同。

<h3 id="cosmos-walkthrough-4">第 3 步：图像和动作分别怎样进入网络？</h3>

图像经过 tokenizer 变为连续潜变量，动作经过 MLP 变为网络能使用的条件向量。官方动作网络 `ActionConditionalVideoExtendGeneralDIT` 有两条动作 MLP 分支，输出维度分别是模型宽度 $D$ 和 $3D$；在 `forward_before_blocks()` 中与时间嵌入及 AdaLN-LoRA 分支相加。读到这里应建立的直觉是：**动作会调节这一次去噪生成，而不是单独被解码成视频。**

<div class="mermaid">
flowchart TB
    I["当前图像"] --> E["Tokenizer：视觉潜变量"]
    A["7 维动作"] --> M["动作 MLP 条件"]
    N["带噪目标潜变量 + 噪声等级"] --> D["条件 DiT 去噪"]
    E --> D
    M --> D
    D --> O["解码：预测下一帧"]
</div>

这个动作后训练配置还包含一个很容易误读的地方：虽然引用了 `comp8x8x8` tokenizer 配置，但它同时覆盖 **`vae.pixel_chunk_duration=1`**，以图像方式编码。实验的潜变量形状明确设置为 `[16,2,32,40]`。所以，**不能直接把上文通用长视频的时间压缩公式套在本例两帧训练上**。

| 数据阶段 | 本例形状或配置 | 怎么读 |
|---|---|---|
| 推理中组装两帧槽位 | `[1,3,2,256,320]` | batch、RGB 通道、时间、高、宽 |
| 一步动作条件 | `[1,1,7]` | 一个样本、一次动作、7 个分量 |
| 网络读取动作后 | `[1,7]` | 代码取 `action[:,0,:]` |
| 实验配置的潜变量 | `[16,2,32,40]`，不含 batch | 16 潜通道、2 个时间位置、空间各缩小 8 倍 |
| 已知的条件 | 第一张真实图像对应的条件区域 | 第二帧是要生成的目标 |

`[16,2,32,40]` 描述的是该动作实验的完整潜变量配置，并不等于 `_run_tokenizer_encoding()` 在所有路径下都返回完全相同的条件张量。条件编码、完整采样状态和网络 patch 化后的 token 序列是不同对象，读代码时要看变量实际处于哪一步。

<h3 id="cosmos-walkthrough-5">第 4 步：训练时，模型怎样知道自己猜错了？</h3>

先把真实的两帧数据准备好，再对需要学习生成的潜变量施加噪声。模型接收当前观察、动作条件和噪声等级，学习恢复干净潜变量。这里继承前文的 EDM 去噪训练思想；实际训练还涉及条件区域处理、预条件化、损失权重等，不是把输出视频直接与答案做一次简单像素相减。

为了理解误差怎样推动学习，暂时只看**一个目标潜变量分量**，并省略权重和预条件化。假设干净目标是 `0.8`，加噪后变成 `1.1`，网络预测 `0.5`，这项平方误差就是 $(0.5-0.8)^2=0.09$。更新参数后，如果预测变成 `0.7`，误差就是 `0.01`。这组数字只解释损失的作用，不能用来推算论文训练曲线。

重复看大量不同场景中的“图像—动作—结果”，模型才有机会学到动作与视觉变化之间的关联。它可能学会“夹爪靠近时杯子通常仍在原位”，却仍可能在真正接触时生成不正确的形变或运动。因此低训练损失和真实机器人上可靠的物理预测要分别验证。

<h3 id="cosmos-walkthrough-6">第 5 步：推理时只给第一帧，模型怎么生成第二帧？</h3>

官方 `generate()` 先取输入视频的第一帧作为 `curr_frame`。对每个动作，构造“当前帧 + 全零占位帧”的两帧张量，再计算条件潜变量并调用生成函数。这个全零帧只用于组织输入张量，**不是模型已经知道下一帧是黑色，也不是最终输出**。

接着执行多次去噪计算，解码出图像。代码取 `video_np_THWC_v1[1]` 作为当前动作对应的新预测帧，并添加到输出列表。一次预测有多次网络计算，“输出一个时间步”不等于“只做一次前向传播”。

<h3 id="cosmos-walkthrough-7">第 6 步：连续三个动作怎样得到一段视频？</h3>

| 轮次 | 本轮输入画面 | 本轮动作 | 输出画面 |
|---|---|---|---|
| 0 | 真实 $I_0$ | $a_0$ | $\hat I_1$ |
| 1 | 刚生成的 $\hat I_1$ | $a_1$ | $\hat I_2$ |
| 2 | 刚生成的 $\hat I_2$ | $a_2$ | $\hat I_3$ |

这里外层确实是在按时间递推，但内部生成下一帧仍使用**扩散模型**。所以“这个动作示例会自回归地滚动预测”与“论文还有离散 token 的自回归模型家族”是两个层面的说法，不能混为一谈。

<div class="mermaid">
flowchart TB
    A["真实首帧 + 第一个动作"] --> B["扩散生成下一帧"]
    B --> C["把预测帧作为新的当前帧"]
    C --> D{"还有动作？"}
    D -->|"有：读取下一个动作"| B
    D -->|"无"| E["汇总预测视频"]
</div>

多步预测会累积误差：第一步把夹爪位置猜偏，第二步就从错误画面继续预测。如果接入真实机器人，可在取得新观察后重新预测；但这需要额外设计观察更新、规划和控制接口，当前离线演示并不自动提供这样的闭环。

<h3 id="cosmos-walkthrough-8">第 7 步：该怎样判断本例有没有学到有用的东西？</h3>

先做**单步验证**：给真实 $I_t$ 与真实动作 $a_t$，与真实 $I _ {t+1}$ 比较。再做**多步验证**：只给真实首帧，后续持续使用预测结果。前者检查短期条件预测，后者暴露误差累积，两种评估不能互相替代。

| 现象 | 优先检查什么 | 原因 |
|---|---|---|
| 夹爪向相反方向移动 | 坐标系、相机视角、旋转约定 | 局部动作轴不等于屏幕坐标轴 |
| 动作很小，预测变化却很大 | 单位与乘 20 的位置 | 数据缩放错误会改变输入分布 |
| 单步尚可，多步很快漂移 | 预测帧递推与分布偏移 | 后续输入已不是真实采集帧 |
| 杯子消失或变形 | 对象持续性、遮挡、接触场景覆盖 | 外观生成质量不等于物理约束满足 |
| MP4 播放很快，但生成很慢 | 分别记录输出 FPS 与墙钟耗时 | 视频播放速度不能当作推理吞吐 |

论文表 20 的 IoU 是另一套刚体物理场景评估结果，**不能当成本例机械臂抓取成功率**。这个案例最终交付的是一个动作条件视觉预测器；要验证抓取任务成功率，还需让真实策略执行任务并单独统计。

</details>

## 📁 官方源码参考：从配置到生成循环 {#cosmos-source-guide}

<details class="paper-fold" markdown="1">
<summary>📖 展开源码对照：固定版本链接、阅读顺序、配置、调用图、训练与推理命令</summary>

<h3 id="cosmos-walkthrough-9">1. 参考版本与阅读入口</h3>

这一节参考 [nvidia-cosmos/cosmos-predict1，提交 `724daa1`](https://github.com/nvidia-cosmos/cosmos-predict1/tree/724daa1b2df5ec96bdf111bb947479d2216b3b08)。下面链接固定到该提交，避免以后分支更新导致文件内容与笔记不一致。**论文原理以 2025 年论文为准，源码配置以这里固定的实现版本为准**；后续实现不应自动视为论文原始实验的全部设置。

| 建议顺序 | 文件 / 符号 | 阅读时重点回答的问题 |
|---|---|---|
| ① 用法 | [动作后训练指南](https://github.com/nvidia-cosmos/cosmos-predict1/blob/724daa1b2df5ec96bdf111bb947479d2216b3b08/examples/post-training_diffusion_video2world_action.md) | 数据怎样摆放，权重如何下载与使用？ |
| ② 实验配置 | [video2world_action/experiment.py](https://github.com/nvidia-cosmos/cosmos-predict1/blob/724daa1b2df5ec96bdf111bb947479d2216b3b08/cosmos_predict1/diffusion/training/config/video2world_action/experiment.py) | 两帧、动作条件、图像式 tokenizer 在哪里设定？ |
| ③ 数据加载 | [dataset_3D.py：Dataset_3D](https://github.com/nvidia-cosmos/cosmos-predict1/blob/724daa1b2df5ec96bdf111bb947479d2216b3b08/cosmos_predict1/diffusion/training/datasets/dataset_3D.py) | 相邻机器人状态怎样变成局部动作，何时缩放？ |
| ④ 动作网络 | [general_dit_action.py](https://github.com/nvidia-cosmos/cosmos-predict1/blob/724daa1b2df5ec96bdf111bb947479d2216b3b08/cosmos_predict1/diffusion/training/networks/general_dit_action.py) | 7 维动作怎样通过 MLP 进入 DiT 条件分支？ |
| ⑤ 推理入口 | [video2world_action.py：demo](https://github.com/nvidia-cosmos/cosmos-predict1/blob/724daa1b2df5ec96bdf111bb947479d2216b3b08/cosmos_predict1/diffusion/inference/video2world_action.py) | 命令行参数怎样传进 pipeline？ |
| ⑥ 推理主循环 | [world_generation_pipeline.py：DiffusionVideo2WorldActionGenerationPipeline](https://github.com/nvidia-cosmos/cosmos-predict1/blob/724daa1b2df5ec96bdf111bb947479d2216b3b08/cosmos_predict1/diffusion/inference/world_generation_pipeline.py#L713-L913) | 当前帧和动作怎样组 batch，下一轮用了哪张图？ |
| ⑦ 生成工具 | [inference_long_video.py：generate_video_from_batch_with_loop](https://github.com/nvidia-cosmos/cosmos-predict1/blob/724daa1b2df5ec96bdf111bb947479d2216b3b08/cosmos_predict1/diffusion/training/utils/inference_long_video.py) | 条件区域、潜变量采样与解码如何衔接？ |

<h3 id="cosmos-walkthrough-10">2. 把论文概念落到配置项</h3>

以下均来自上述动作后训练配置，属于**这份配置的值**，不要写成所有 Cosmos 模型的统一超参数。

| 配置 | 值 | 实际作用 |
|---|---|---|
| `num_frames` | `2` | 每条训练样本含两个时间位置 |
| `video_size` | `[256,320]` | 输入高、宽 |
| `load_action` / `load_t5_embeddings` | `True` / `False` | 使用动作条件，不要求预计算文字嵌入 |
| `batch_size` | `8` | 训练 DataLoader 的 batch 参数；全局 batch 还取决于并行配置 |
| `latent_shape` | `[16,2,32,40]` | 模型潜空间形状，不含 batch |
| `vae.pixel_chunk_duration` | `1` | 以图像方式编码，本例不能照搬长视频时间压缩公式 |
| `optimizer.lr` | `4e-4` | 本配置的学习率 |
| `trainer.max_iter` | `100000` | 本配置的最大迭代数，不是收敛保证 |
| `checkpoint.save_iter` | `10000` | 保存间隔；目录名由 job 配置决定 |
| `load_training_state` | `False` | 不恢复原训练器状态；不能把它当作原训练的无缝续跑 |

<h3 id="cosmos-walkthrough-11">3. 源码运行时序图</h3>

<div class="mermaid">
sequenceDiagram
    participant E as 推理入口
    participant P as Action Pipeline
    participant T as Tokenizer
    participant D as 条件扩散模型
    E->>P: 构造 pipeline，传入视频与动作路径
    P->>P: get_traj：读取帧与动作，缩放前六维
    loop 每个给定动作
        P->>P: 当前帧与占位帧组成两帧 batch
        P->>T: 编码当前观察条件
        T-->>P: condition_latent
        P->>D: 图像条件、动作、采样参数
        D->>D: 多次去噪计算
        D->>T: 解码生成的潜变量
        T-->>P: 生成图像
        P->>P: 取第二帧，作为下轮当前帧
    end
    P-->>E: 生成视频（经 Guardrail 检查）
    E->>E: save_video 保存 MP4
</div>

下面是**按源码行为改写的教学伪代码**，用于看清外层时间循环，不是可以替换原文件的实现。真实代码还处理 GPU、数据类型、条件掩码、模型配置切换和输出检查。

```python
frames, actions = pipeline.get_traj(video_path, annotation_path)
current = frames[0]
result = [current]
for action in actions:
    batch = make_two_frame_batch(current, placeholder_frame)
    batch["action"] = action.reshape(1, 1, 7)
    condition = encode_observation(batch)
    generated = conditional_diffusion_sample_and_decode(batch, condition)
    current = generated[1]
    result.append(current)
```

读源码时不要只看 docstring：该 pipeline 有沿用通用文本生成模板的注释，但实际执行的是 `get_traj()`、`raw_video_batch["action"]` 和逐动作循环。判断输入模态应以调用和张量赋值为依据。

<h3 id="cosmos-walkthrough-12">4. 训练命令：已有基础模型怎样后训练？</h3>

先按官方 [INSTALL.md](https://github.com/nvidia-cosmos/cosmos-predict1/blob/724daa1b2df5ec96bdf111bb947479d2216b3b08/INSTALL.md) 完成依赖环境，并按动作指南下载权重、准备 Bridge 数据。官方该示例建议 8 张 H100-80GB 或 A100-80GB；以下命令用于复现入口说明，本次笔记工作未实际启动 GPU 训练。

```bash
# 在 cosmos-predict1 仓库根目录运行；数据与权重需提前准备好。
export OUTPUT_ROOT=checkpoints
torchrun --nproc_per_node=8 \
  -m cosmos_predict1.diffusion.training.train \
  --config=cosmos_predict1/diffusion/training/config/config.py \
  -- experiment=video2world_action_bridge_2frames
```

启动后，配置决定训练数据、模型和 checkpoint。数据集交付真实帧对与动作，训练器负责计算损失和更新参数。希望了解“动作从哪来”时先读 `Dataset_3D`，希望了解“动作如何影响生成”时读 `general_dit_action.py`；这与 PPO / DeepMimic 笔记按数据、模型、训练循环分层阅读的方式一致。

<h3 id="cosmos-walkthrough-13">5. 推理命令：使用后训练权重预测动作结果</h3>

把实际生成的后训练权重按官方指南放到 `checkpoints/Cosmos-Predict1-7B-Video2World_action_post-trained/model.pt`。下列 `346` 是官方示例中的数据路径；运行前应确认下载数据中确实有对应视频与 JSON，不能凭编号假定文件存在。

```bash
CUDA_HOME="$CONDA_PREFIX" PYTHONPATH="$PWD" \
python cosmos_predict1/diffusion/inference/video2world_action.py \
  --checkpoint_dir checkpoints \
  --diffusion_transformer_dir Cosmos-Predict1-7B-Video2World_action_post-trained \
  --seed 0 \
  --input_image_or_video_path datasets/bridge/videos/test/346/rgb.mp4 \
  --action_annotation_path datasets/bridge/annotation/test/346.json \
  --height 256 \
  --width 320 \
  --fps 3
```

这里修正了官方指南示例中视频路径后续行符与下一参数挤在同一行的排版，参数名与实际解析器一致。脚本使用 `save_video()` 保存结果，输入动作已经确定；它不会帮你搜索最优动作，也不会给机器人发送命令。

<h3 id="cosmos-walkthrough-14">6. 三个读源码时必须分清的细节</h3>

1. **图像张量的时间长度与已知条件数量**：代码组装两帧槽位，但第一帧才是实际观察，另一帧是待生成区域；不要仅凭 `num_input_frames` 的名字判断“模型看了两张真实图”。
2. **三种 FPS / 速度**：论文 Bridge 数据采样为 5 FPS；本固定版本动作 pipeline 内部 batch 的 `fps` 写为 `4.0`；上面命令的 `--fps 3` 会用于保存视频。三者属于不同层面，尤其都不能替代 GPU 上测得的实际推理耗时。改时间间隔时，应核对训练数据、模型条件与输出播放设置是否一致。
3. **命令行参数不一定都传到底层**：入口解析了 `num_of_loops` 等选项，但这个版本的 `demo()` 调用 `pipeline.generate()` 时只显式传入动作路径和视频路径。排查参数不生效时应顺着函数调用检查，而不是只读帮助文字。复现实验先使用官方已展示的调用方式。

</details>

## 🧭 放在学习路线图的哪里？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Cosmos、DreamDojo、DreamZero 与 GR00T 的关系</summary>

本篇位于 **⑦ 世界模型**：先理解通用视频世界模型如何训练和适配，再看 DreamDojo 等面向机器人的世界模型，以及把预测与动作生成结合的 DreamZero。DreamDojo 使用的是后续 Cosmos-Predict2.5 骨干，不能等同本篇 Predict1。GR00T N1 侧重从视觉、语言和本体状态输出机器人动作；Cosmos Predict1 的重点是预测未来视觉观察。两者可在系统层面协作，但本论文并未报告把 Predict1 直接接到 GR00T N1 控制循环的实验。

</details>

## 📚 来源与阅读顺序

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文各章节对应本笔记的位置</summary>

- [原论文与版本记录](https://arxiv.org/abs/2501.03575)；[HTML v3 全文](https://arxiv.org/html/2501.03575v3)。
- §3 / 图 5：视频整理与类别；§4 / 图 7：连续、离散 tokenizer 与因果结构；§5 / 表 10：两条预训练路线；§5.3 / 表 20：物理对齐；§6：三类后训练样例。
- [官方 Cosmos-Predict1 仓库](https://github.com/nvidia-cosmos/cosmos-predict1)：代码、配置和权重入口。数值与表格以论文 v3 为准。

</details>
