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

> 🎮 **本页有五幕动画 + 3 个交互图**：视频类别占比、token 压缩量、1 帧与 9 帧条件下的物理预测指标。演示图只解释机制；图表标明的论文数值均来自 [§3.1、图 7、表 10 与表 20](https://arxiv.org/html/2501.03575v3)。

## 🎬 五幕动画：Cosmos 如何构建世界模型 {#cosmos-explainer-anim}

<div class="paper-demo" data-demo="cosmos-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 📖 动画后的长文按主题折叠，交互图保持可见。点击展开可以核对公式、条件和论文中的实验。

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
