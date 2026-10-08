---
layout: paper
title: "Cosmos Policy: Fine-Tuning Video Models for Visuomotor Control and Planning"
category: "高影响力精选 High Impact Selection"
subcategory: "Sim-to-Real & Foundation Model"
zhname: "Cosmos Policy：微调视频模型用于视觉运动控制与规划"
---

# Cosmos Policy: Fine-Tuning Video Models for Visuomotor Control and Planning
**Cosmos Policy：微调视频模型用于视觉运动控制与规划**

> 📅 阅读日期: 2026-10-06
>
> 🏷️ 板块: 03_High_Impact_Selection / Sim-to-Real & Foundation Model
>
> 🧭 状态: 精读版；数值均取自 arXiv v1 正文、表 1–5、图 7 与附录 A。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2601.16163](https://arxiv.org/abs/2601.16163) |
| **项目主页** | [research.nvidia.com/labs/dir/cosmos-policy](https://research.nvidia.com/labs/dir/cosmos-policy/) |
| **代码** | [NVlabs/cosmos-policy](https://github.com/NVlabs/cosmos-policy)（论文称同时发布模型权重与训练数据） |
| **作者** | Moo Jin Kim, Yihuai Gao, Tsung-Yi Lin, Yen-Chen Lin, Yunhao Ge, Grace Lam, Percy Liang, Shuran Song, Ming-Yu Liu, Chelsea Finn, Jinwei Gu |
| **机构** | NVIDIA；Stanford University |
| **发布时间** | 2026-01-22 |
| **基座** | Cosmos-Predict2-2B-Video2World（Wan2.1 时空 VAE + 扩散 Transformer，EDM 去噪目标，T5-XXL 文本条件） |
| **对象** | LIBERO、RoboCasa（单臂 Franka 仿真）与真实 ALOHA 双臂（2 台 ViperX 300 S，3 路相机） |
| **关键词** | Video foundation model, latent frame injection, policy + world model + value, best-of-N planning, learning from rollouts |

---

## 🎯 一句话总结

此前用视频模型做机器人策略，通常要「先微调视频模型、再训一个动作头或逆动力学模型」，或者从头训一个自定义的视频—动作模型。Cosmos Policy 的做法是**潜帧注入（latent frame injection）**：在视频扩散序列里插入空白占位帧，编码后用归一化、复制铺满的本体状态 / 动作块 / 价值覆盖这些潜帧，于是 $(s, a, s', V(s'))$ 全变成「视频的一部分」，用原本的扩散目标一次微调完成。作为直接策略，它在 LIBERO 平均 98.5%、RoboCasa（每任务只用 50 条演示）67.1%、ALOHA 真机平均 93.6 分，均为文中最高；再用 648 条 rollout 精修世界模型和价值函数做 best-of-N 规划，两个最难的真机任务平均再涨 12.5 分。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **VAE** | Variational Autoencoder | 这里指 Wan2.1 时空 tokenizer：时间压 4 倍、空间压 8 倍、16 通道 |
| **EDM** | Elucidating the Design space of diffusion Models | Karras 等人的扩散训练 / 采样框架，按噪声水平 $\sigma$ 参数化 |
| **DiT** | Diffusion Transformer | 去噪网络，经交叉注意力接文本、经 AdaLN 接 $\sigma$ |
| **VLA** | Vision-Language-Action model | 视觉—语言—动作模型，如 π₀、π₀.₅、OpenVLA-OFT |
| **MC return** | Monte Carlo return | 用整条 rollout 实际拿到的回报当价值标签 |
| **Best-of-N** | — | 采 N 个候选动作，各自预测后果并打分，执行分最高的那个 |
| **ID / OOD** | In-Distribution / Out-of-Distribution | 初始条件是否与演示相近 |

---

## ❓ Cosmos Policy 要解决什么问题？

1. **VLA 的先验来自静态图文**：RT-2、OpenVLA、π₀.₅ 等的骨干是视觉—语言模型，学到的是语义概念；视频生成模型从海量视频里学到的是时间因果、隐式物理和运动规律，论文假设后者更适合当低层控制的初始化。
2. **已有视频策略太复杂**：要么多阶段训练（先视频微调，再训动作模块），要么加新的结构（独立动作扩散头、逆动力学模型）；而统一的视频—动作模型（UVA、UWM）又是自定义结构，用不上预训练视频模型。
3. **策略、世界模型、价值函数通常是三个模型**：FLARE、SAILOR、Latent Policy Steering 等都要分开训练、多数从头训。

论文的目标：**一个预训练视频模型、一个训练阶段、零结构改动**，同时当策略、世界模型和价值函数用。

---

## 🔧 方法详解

### 1. 底座：Cosmos-Predict2 的潜扩散序列

Wan2.1 tokenizer 把 $(1+T)\times H\times W\times 3$ 的视频压成 $(1+T')\times H'\times W'\times 16$ 的潜帧序列，$T' = T/4$、$H' = H/8$、$W' = W/8$；**第一帧单独编码、不做时间压缩**，其余每 4 帧压成 1 个潜帧。训练时第一个潜帧保持干净当条件，其余加噪，按 EDM 目标 $\lVert D_\theta(x_0 + n;\sigma, c) - x_0\rVert_2^2$ 去噪。

### 2. 潜帧注入：把新模态变成「帧」

以 3 路相机为例，序列一共 11 个潜帧（第 4.1 节）：

| 位置 | 内容 | 类型 |
|------|------|------|
| 1 | 空白占位 | 实现细节（首帧单独编码） |
| 2 | 当前本体状态 | **新模态** |
| 3–5 | 当前 3 路相机图像 | 图像（多出的视角是新增的） |
| 6 | 动作块 | **新模态** |
| 7 | 未来本体状态 | **新模态** |
| 8–10 | 未来 3 路相机图像 | 图像 |
| 11 | 未来状态价值 | **新模态** |

顺序就是 $(s, a, s', V(s'))$，从左到右可以自回归解码。只有 1 路相机时去掉多余视角，剩 7 个潜帧。

**怎么注入**（附录 A.1）：先在图像序列里插入全零的空白图，经 VAE 编码后，把这些占位潜帧**整块覆盖**成新模态：每个维度归一化到 $[-1, 1]$，展平后复制 $\frac{H' W' C'}{K\, d _ {\mathrm{act}}}$ 次铺满 $H'\times W'\times C'$。为了让「每个模态、每个视角各占一个潜帧」，每张图在像素序列里复制 4 份（恰好被时间压缩成 1 个潜帧）。**推理时**反过来：对潜帧里所有副本取平均、反归一化，**不用经过 VAE 解码**。

### 3. 一次训练三个函数：靠「哪些帧当条件」区分

序列固定，**条件 / 目标的划分**决定训练的是谁（第 4.2 节、图 12）：

| 批内占比 | 训练对象 | 条件（干净） | 目标（去噪） | 数据来源 |
|------|------|------|------|------|
| 50% | 策略 | $s$ | $a, s', V(s')$ | 演示（过滤失败的） |
| 25% | 世界模型 | $s, a$ | $s', V(s')$ | rollout 集（初始 = 演示全集，含失败的） |
| 25% | 价值函数 | $s, a, s'$ | $V(s')$ | rollout 集 |

两个细节：

- **辅助目标**：策略学的是 $p(a, s', V(s') \mid s)$ 而不只是 $p(a \mid s)$，世界模型学 $p(s', V(s') \mid s, a)$。消融显示这很重要（见实验）。
- **价值标签**：稀疏终端奖励 $R \in [0, 1]$，每个时刻的标签是蒙特卡洛回报 $\gamma^{H-t}R(s_H, a_H)$。LIBERO、RoboCasa 里约 10%–20% 的演示回放会失败，正好给价值函数提供负样本；ALOHA 演示没有失败的，演示集与 rollout 集相同。

### 4. 噪声分布：为动作精度改的两处

动作要直接控制机器人，误差容忍度比视频低得多（附录 A.2.1）：

- **训练**：原模型 $\ln\sigma \sim \mathcal N(1.39, 1.2^2)$ 的权重集中在低噪声；改为 70% 概率按原分布、30% 概率在 $[1, 85]$ 上均匀采样，加厚高噪声尾部（因为采样从 $\sigma _ {\max} = 80$ 开始，高噪声区学不好会一路错下去）。
- **推理**：$\sigma _ {\min}$ 从 0.002 提到 4，因为接近 0 的最后几步反而不准。

### 5. 从 rollout 学习 + best-of-N 规划（第 4.3 节）

只用演示训出来的世界模型和价值函数只见过成功轨迹，无法评估「会失败的动作」。于是：

1. 部署策略、记录 rollout 和结果（成败或部分得分）；
2. 在 rollout 上继续微调，批内 90% 平分给世界模型和价值函数，只留 10% 给策略；
3. **双模型部署**：原检查点当「策略模型」出候选动作，精修后的检查点当「规划模型」预测后果和价值；
4. **Best-of-N**：采 N 个动作块 → 每个预测 3 次未来状态 → 每个未来状态预测 5 次价值，共 15 个价值 → 用 **majority mean** 聚合（先按固定阈值看多数预测成功还是失败，再只在多数那组里求平均）→ 执行分最高的完整动作块。

价值函数可以通过输入掩码选成 $V(s')$（只看未来状态，需要世界模型 = 基于模型的规划）或 $Q(s, a)$（不看未来状态 = 无模型规划），论文两种都比了。

### 6. 训练与推理配置（附录 A.2、A.4.2）

| 设定 | 动作块 / 执行 | 训练 | 去噪步数 | 单次推理（1×H100） |
|------|------|------|------|------|
| LIBERO | 16 步 / 全执行 | 40K 步，64×H100，batch 1920，48 h | 5 | 0.61 s |
| RoboCasa | 32 步 / 执行 16 | 45K 步，32×H100，batch 800，48 h | 5（1 步时 0.16 s） | 0.61 s |
| ALOHA | 50 步（25 Hz 下 2 s）/ 全执行 | 50K 步，8×H100，batch 200，48 h；4 个任务共 185 条演示 | 10 | 0.95 s |

三套都是**全参数微调**。真机规划：N = 8，8 块 H100 并行，每次搜索约 4.9 s。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
  subgraph T1["阶段 1：演示上一次后训练"]
    D["演示：多视角图像<br/>本体状态、动作块、回报"] --> J["潜帧注入<br/>11 个潜帧 s, a, s', V"]
    J --> M["Cosmos-Predict2-2B<br/>同一扩散目标"]
    M --> P["策略 50%<br/>世界模型 25%<br/>价值函数 25%"]
  end
  subgraph T2["阶段 2（可选）：从 rollout 学习"]
    P --> R["部署收集 rollout<br/>记录成败 / 得分"]
    R --> F["精修：世界模型 + 价值<br/>占 90%"]
  end
  subgraph T3["部署"]
    P --> A["直接策略<br/>并行解码，只取动作"]
    P --> B["best-of-N：采 N 个动作块"]
    F --> B
    B --> E["每个预测 3 个未来 × 5 个价值<br/>majority mean 取最优"]
  end
</div>

---

## 🚶 具体实例

### 例 1：ALOHA 的一次输入长什么样

ALOHA 有 3 路相机（1 路俯视 + 2 路腕部）、14 维关节状态，动作块 50 步：

1. **像素序列**：1 张空白首帧 + 10 个「4 张相同图」的组（当前本体占位、3 路当前图像、动作占位、未来本体占位、3 路未来图像、价值占位），共 $1 + 4 \times 10 = 41$ 张；
2. **VAE 编码**：首帧单独 1 个潜帧，其余 40 张按 4 帧一组压成 10 个，合计 $1 + 40/4 = 11$ 个潜帧，与上表一致；
3. **动作块注入**：$50 \times 14 = 700$ 个数，每维归一化到 $[-1, 1]$ 后展平，复制铺满一个潜帧；推理时把所有副本取平均、反归一化得到 50×14 的动作；
4. **价值注入**：价值原始范围 $[0, 1]$，线性映射到 $[-1, 1]$ 即 $v' = 2v - 1$。例如 $v = 0.8$ 写进去是 $0.6$；读出时整块平均得到 0.6，再 $(0.6 + 1)/2 = 0.8$。

### 例 2：一次 best-of-N 搜索要做多少次预测

N = 8 时，每个候选动作块：3 次世界模型预测 × 每个未来状态 5 次价值预测 = 15 个价值。整次搜索 = 8 次动作采样 + 24 次未来状态预测 + 120 次价值预测，在 8 块 H100 上约 4.9 s（论文附录 A.4.2）。对比直接策略在 ALOHA 上 0.95 s 出一个 2 s 的动作块。

### 例 3：majority mean 为什么比直接平均稳（玩具数字）

论文只说「按固定阈值」，没给阈值数值。设阈值 0.5，某候选的 15 个价值里 10 个落在 0.82 附近、5 个落在 0.10 附近（价值分布双峰，常见于「抓住 / 没抓住」两种结局）：

- 直接平均：$(10 \times 0.82 + 5 \times 0.10)/15 = 0.58$；
- majority mean：多数（10 个）判成功，只平均这 10 个 → 0.82。

直接平均会把「大概率成功」的候选和「一半一半」的候选拉到相近的分数；majority mean 先判方向再求均值，对少数离群预测不敏感。

---

## 📊 实验结果

### LIBERO（表 1，成功率 %，6000 次试验）

| 方法 | Spatial | Object | Goal | Long | 平均 |
|------|------|------|------|------|------|
| Diffusion Policy | 78.3 | 92.5 | 68.3 | 50.5 | 72.4 |
| π₀ | 96.8 | 98.8 | 95.8 | 85.2 | 94.2 |
| π₀.₅ | 98.8 | 98.2 | 98.0 | 92.4 | 96.9 |
| OpenVLA-OFT | 97.6 | 98.4 | 97.9 | 94.5 | 97.1 |
| CogVLA | 98.6 | 98.8 | 96.6 | 95.4 | 97.4 |
| **Cosmos Policy** | 98.1 | **100.0** | 98.2 | **97.6** | **98.5** |

### RoboCasa（表 2，24 个任务平均成功率，3600 次试验）

| 方法 | 每任务演示数 | 平均 % |
|------|------|------|
| GR00T-N1 | 300 | 49.6 |
| UVA | 50 | 50.0 |
| UWM | 1000 | 60.8 |
| π₀ | 300 | 62.5 |
| GR00T-N1.5 | 300 | 64.1 |
| Video Policy | 300 | 66.0 |
| FLARE | 300 | 66.4 |
| **Cosmos Policy** | **50** | **67.1** |

### ALOHA 真机（附录表 3，任务完成度得分，ID + OOD 共 101 次试验）

| 方法 | put X on plate | fold shirt | put candies in bowl | put candy in ziploc bag | 平均 |
|------|------|------|------|------|------|
| Diffusion Policy | 63.3 | 23.5 | 32.8 | 14.6 | 33.6 |
| OpenVLA-OFT+ | 68.3 | 99.5 | 21.6 | 58.5 | 62.0 |
| π₀ | 85.0 | 98.5 | 71.2 | 56.9 | 77.9 |
| π₀.₅ | 98.3 | 99.5 | **95.2** | 61.5 | 88.6 |
| **Cosmos Policy** | **100.0** | **99.5** | 89.6 | **85.4** | **93.6** |

- 只看 OOD 初始条件时 π₀.₅ 略高（92.5 vs 89.3），论文也承认这一点。
- 失败模式（图 5）：π₀.₅ 抓不稳 ziploc 袋的拉链头；OpenVLA-OFT+ 常把手伸到两颗糖中间（作者推测是 L1 回归平均掉了多峰动作分布）。

### 消融

| 实验 | 结果 |
|------|------|
| LIBERO 去掉辅助目标（表 4） | 98.5 → 97.0（−1.5） |
| LIBERO 不用预训练、从头训（表 4） | 98.5 → 94.6（−3.9）；Long 从 97.6 掉到 88.6 |
| ALOHA fold shirt 从头训 | 99.5 → 80.8（−18.7），且动作抖动明显，作者停止了后续评测 |
| RoboCasa 逐步去掉联合训练（表 5） | 67.1 → 66.6（去价值样本）→ 64.0（去世界模型与价值样本）→ 62.5（策略不再预测价值）→ **44.4**（策略只预测动作） |
| RoboCasa 1 步去噪（表 5） | 66.4（−0.5），推理 0.16 s，约快 4 倍 |

表 5 最后一行说明：**让策略同时预测未来状态**是最关键的一项。

### 规划（图 7，两个最难的 ALOHA 任务，困难 ID + OOD 初始条件）

- rollout 数据：之前所有直接策略评测攒下的 505 条 + 为 ziploc 任务额外收集的 143 条，共 648 条；
- 基于模型的 $V(s')$ 规划比不规划平均高 **12.5 分**；
- 基于模型（$V(s')$）优于无模型（$Q(s, a)$）。作者的解释：rollout 数据有限时直接学 Q 函数难，且输入维度更高、容易过拟合。

---

## ⚠️ 局限（论文第 6 节、附录 A.4.2）

- **规划慢**：一次 best-of-N 约 5 s，难以用于动态操作或行走；直接策略也要 0.6–0.95 s 出一个动作块，执行时机器人会停顿。
- **规划依赖大量 rollout**：要让世界模型和价值在演示分布之外也准，需要相当数量的策略 rollout。
- **只有一层搜索**：best-of-N 只往前看一个动作块；更长视野、更深的搜索树留给未来。
- **没有历史**：$s$ 和 $s'$ 只是 $t$ 与 $t+K$ 两个时刻的观测，不输入历史帧。

---

## 🤖 对人形机器人的意义

- **视频世界模型 → 策略的「最短路径」**：Cosmos 平台论文展示了视频世界基础模型可以后训练到机器人场景，Cosmos Policy 进一步说明同一个模型不用加结构就能直接出动作。对人形团队，这意味着视频预训练的先验可以不经过 VLA 那套图文骨干直接用于控制。
- **一模型三用**：策略、世界模型、价值函数共享权重，且世界模型 / 价值可以从策略自己的失败中学习，这和 Dreamer「在模型里评估动作」的思路一脉相承，只是把潜空间 RSSM 换成了 2B 参数的视频扩散模型、把梯度优化换成了 best-of-N 搜索。
- **离人形还差什么**（笔者推测，论文未做人形实验）：0.6 s 以上的单次推理、5 s 的规划延迟，与人形全身控制所需的高频闭环差距很大；论文自己也把「动态任务与行走」列为受限场景。实际落地更可能是给人形的上层操作或离线数据评估用，低层仍交给 WBC。

---

## 🎤 面试高频问题 & 参考回答

**Q1：「零结构改动」是怎么做到让视频模型输出动作的？**

A：靠潜帧注入。在像素序列里插空白图，VAE 编码后把对应潜帧整块覆盖成归一化、复制铺满的动作 / 本体 / 价值。对扩散 Transformer 来说它们只是另几个潜帧，用原本的去噪目标训练即可；推理时对副本求平均再反归一化，不需要 VAE 解码。

**Q2：同一个模型怎么区分自己是在当策略、世界模型还是价值函数？**

A：看哪些潜帧是干净条件、哪些是加噪目标。条件只有 $s$ 时是策略，条件是 $(s, a)$ 时是世界模型，条件是 $(s, a, s')$ 时是价值函数；训练时按 50/25/25 混在同一批里。

**Q3：为什么规划前要先在 rollout 上精修？**

A：演示基本都是成功轨迹，世界模型和价值函数没见过「做错了会怎样」，无法给坏动作打低分。用策略自己的 rollout（含失败）微调后，世界模型能预测出「拉链头会滑脱」这类后果（图 6），价值函数才有区分度。

**Q4：为什么用 $V(s')$ 而不是 $Q(s, a)$ 做规划？**

A：$V(s')$ 先让世界模型显式预测未来状态，再评估状态好坏，利用了学到的动力学；$Q(s, a)$ 要直接从动作映射到回报，数据少时更难学、更易过拟合。图 7 中前者更好。

**Q5：为什么要改噪声分布？视频生成不是好好的吗？**

A：视频允许轻微的不精确，动作不行。原分布在高噪声区训练样本少，而采样恰好从 $\sigma _ {\max} = 80$ 开始，开头去噪不准会一路累积；所以训练时加厚高噪声尾部，推理时把 $\sigma _ {\min}$ 抬到 4、跳过最不准的最后几步。

---

## 💬 讨论记录

- 国庆系列《具身智能从入门到精通》day5「世界模型」一节把 Cosmos Policy 作为「视频世界模型直接当策略」的代表；本站据此补进路线图与发布清单，放在 DreamZero 之前。
- 读 RoboCasa 表时注意演示数口径：Cosmos Policy 和 UVA 每任务 50 条，多数方法 300 条，UWM 1000 条，DP-VLA 3000 条。

---

## 🔗 相关阅读

| 论文 | 关系 |
|------|------|
| [Cosmos](../Cosmos_World_Foundation_Model_Platform_for_Physical_AI/Cosmos_World_Foundation_Model_Platform_for_Physical_AI.html) | 视频世界基础模型平台；Cosmos Policy 介绍基座 Cosmos-Predict2 时引用的就是这篇 |
| [Dreamer](../Dreamer_Learning_Behaviors_by_Latent_Imagination/Dreamer_Learning_Behaviors_by_Latent_Imagination.html) | 「世界模型 + 在模型里评估行为」的经典路线，相关工作中引用 |
| [UniPi](../UniPi_Learning_Universal_Policies_via_Text-Guided_Video_Generation/UniPi_Learning_Universal_Policies_via_Text-Guided_Video_Generation.html) | 视频规划 + 逆动力学的两段式做法，属于本文相关工作所说的「另训动作模块 / 逆动力学」一类（原文没有直接引用 UniPi） |
| [ACT](../ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware.html) | ALOHA 平台与动作块的来源 |
| [Diffusion Policy](../../01_Foundational_RL/Diffusion_Policy/Diffusion_Policy.html) | 从头训练的扩散策略基线 |
| [π₀.₅](../Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.html) | 真机最强的 VLA 对照 |
| [GR00T N1](../GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.html) | RoboCasa 对照（N1 / N1.5） |
| [UVA](../../06_Manipulation/Unified_Video_Action_Model/Unified_Video_Action_Model.html) | 自定义结构的统一视频—动作模型，LIBERO / RoboCasa 对照 |
| [DreamZero](../../06_Manipulation/DreamZero_World_Action_Models_are_Zero-shot_Policies/DreamZero_World_Action_Models_are_Zero-shot_Policies.html) | 世界—动作模型直接当零样本策略 |

---

## 📎 附录：参考来源

- arXiv：<https://arxiv.org/abs/2601.16163>（v1，2026-01-22）
- 项目主页：<https://research.nvidia.com/labs/dir/cosmos-policy/>
- 代码：<https://github.com/NVlabs/cosmos-policy>
