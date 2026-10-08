---
layout: paper
title: "π0.5: a Vision-Language-Action Model with Open-World Generalization"
category: "高影响力精选 High Impact Selection"
subcategory: "Sim-to-Real & Foundation Model"
zhname: "π₀.₅：具备开放世界泛化能力的视觉-语言-动作模型"
demos: ["pi05"]
---

# π0.5: a Vision-Language-Action Model with Open-World Generalization
**π₀.₅：具备开放世界泛化能力的视觉-语言-动作模型**

> 📅 阅读日期: 2026-09-30
>
> 🏷️ 板块: 03_High_Impact_Selection / Sim-to-Real & Foundation Model（H26）
>
> 🧭 状态: 已对照 [arXiv:2504.16054v1](https://arxiv.org/abs/2504.16054) 正文与附录 A–E、官方开源 [Physical-Intelligence/openpi](https://github.com/Physical-Intelligence/openpi) 的 `pi05` 分支（`main`，commit `215abfb`）。论文里大部分结果是柱状图，正文没有给出具体数值；本笔记只转述正文结论，不读图估数。openpi README 写明开源版 π₀.₅ **只支持流匹配头**，论文里的 FAST 离散预训练与高层子任务推理不在开源代码里。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2504.16054](https://arxiv.org/abs/2504.16054) |
| **PDF** | [arxiv.org/pdf/2504.16054](https://arxiv.org/pdf/2504.16054) |
| **发布时间** | 2025年4月22日（arXiv v1） |
| **作者** | Kevin Black, Noah Brown, James Darpinian, …, Chelsea Finn, Karol Hausman, Sergey Levine, Karl Pertsch, Lucy Xiaoyang Shi, Quan Vuong 等 36 人 |
| **机构** | Physical Intelligence |
| **项目页** | [pi.website/blog/pi05](https://pi.website/blog/pi05) |
| **官方代码** | [Physical-Intelligence/openpi](https://github.com/Physical-Intelligence/openpi)（2025 年 9 月放出 `pi05_base`、`pi05_libero`、`pi05_droid`） |
| **模型** | PaliGemma（SigLIP 400M + Gemma 2B）+ 300M 动作专家，与 π₀ 同尺寸 |
| **机器人** | 两款移动双臂机械臂（各 18 / 19 维），外加训练用的非移动机械臂与实验室多种机器人 |

---

## 🎯 一句话总结

π₀.₅ 不换网络主干，换的是**训练配方**：绝大部分训练样本（预训练阶段 97.6%）都不是「家里的移动机械臂在做家务」，而是别的机器人、实验室数据、子任务标注和网页数据；模型学会先用文字说出下一步子任务，再按这个子任务出连续动作，高层和低层是**同一个模型**。结果是一台移动机械臂能在训练时从没见过的真实家里，只凭一句「收拾厨房」完成 10–15 分钟的多阶段家务。它回答的是**开放环境泛化**，而不是 [π₀](../Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.html) 那种在熟悉场景里把灵巧长程任务做好。

> 🎮 **本文内嵌 1 段讲解动画 + 1 段配音视频**（不用装任何东西）：
> 1. [七幕动画：π₀.₅ 全流程](#pi05-explainer-anim) —— 约 87 秒串完「开放世界的难题 → 异构数据配方 → 一个模型两层推理 → 离散预训练 + 连续后训练 → 输入输出与部署 → 训练环境数量 → 消融：什么最重要」
> 2. [配音讲解视频](#pi05-video) —— 同样七幕，加中文配音与字幕，6 分 27 秒竖屏，可下载

> 🚶 [具体实例](#实例-环境设定)把「把东西放进抽屉」这条真实输出拆成高层 / 低层两次推理，手算状态分桶、分位数归一化、式 (1) 在两个阶段的取值和注意力掩码；[源码对照](#源码-1-pi05-开关)对照 openpi 的 `pi05` 分支，说明哪些是论文、哪些是开源版的实现。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 在这篇论文里指什么 |
|------|------|-------------------|
| **MM** | Diverse Mobile Manipulator data | 约 100 个家里的移动机械臂数据，约 400 小时 |
| **ME** | Diverse Multi-Environment non-mobile robot data | 固定在台面上的单 / 双臂，在更多家里采集 |
| **CE** | Cross-Embodiment laboratory data | 实验室里各种机器人的数据，外加 OXE |
| **HL** | High-Level subtask prediction | 人工标注的子任务文字与边界框 |
| **WD** | Multi-modal Web Data | 图像描述、视觉问答、物体定位 |
| **VI** | Verbal Instructions | 专家用语言一步步指挥机器人得到的高层示范，仅后训练用 |
| **FAST** | Frequency-space Action Sequence Tokenization | 把动作块压缩成离散 token 的 tokenizer，用于预训练 |

---

## 🎬 七幕动画：π₀.₅ 全流程 {#pi05-explainer-anim}

<div class="paper-demo" data-demo="pi05-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#pi05-video}

<div class="paper-demo" data-demo="pi05-video" data-src="media/pi05_explainer_video.mp4" data-poster="media/pi05_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/pi05_explainer_video.mp4" download="pi05_讲解视频.mp4">下载 mp4（8.7 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：问题、数据、两层推理、两阶段训练、系统和实验按小节收起，具体实例、源码对照、面试和附录各收成一块。想细读哪一块就点开，内容一字未删；两张流程图留在外面。目录里的标题可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」。

---

## ❓ 论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：VLA 大多在和训练相近的环境里评测；复杂长程任务没法靠堆机器人数据覆盖</summary>

引言的出发点：机器人只有离开实验室、应付真实世界的多样情况才真正有用。VLA 已经能端到端控制机器人，但**能在野外泛化到什么程度**仍是开放问题——大多数 VLA 仍在和训练数据很像的环境里评测（§II）。

作者用「让移动机器人收拾一个从没见过的厨房」说明泛化有好几层（§I）：

1. 数据里覆盖充分的动作（拿刀、拿盘子），场景和物体够多就能泛化；
2. 有些要把已有技能换顺序、换用法；
3. 有些要靠对场景的语义理解（该开哪个抽屉、台面上哪个像沥水架）。

对简单技能（抓取、开抽屉），已有工作表明扩大采集环境就能泛化；但对清理厨房这种长程任务，靠暴力扩大机器人数据去覆盖所有可能场景**不可行**（§II）。

作者的类比：人解决新问题时，用到的经验不全是亲手练的——有别人告诉的、书上读的、别的场景里的零碎经验。所以机器人系统也应当能从**异构的知识来源**迁移：别的机器人、别的环境、口头指令、网页上的感知任务、高层语义子任务预测。VLA 把各种模态都放进同一个序列建模框架，恰好提供了这样的工具。

</details>

---

## 🔧 方法详解

### 1. 异构数据配方

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：预训练的五类数据、后训练的取舍、动作归一化</summary>

**预训练**（§IV-C、图 4）用五类数据，全部当作下一个 token 预测：

| 类别 | 内容 | 作用 |
|---|---|---|
| **MM** | 约 400 小时，约 100 个家里的移动机械臂做家务 | 和评测最直接相关 |
| **ME** | 单臂 / 双臂固定在台面或支架上，在更多家里采集 | 更轻便、环境更多样，但本体不同 |
| **CE** | 实验室里多种机器人（单 / 双臂、固定 / 移动）的各种任务，外加 OXE（比 π₀ 用的版本更大） | 有的和评测相关（碗碟放进盆），有的无关（磨咖啡豆） |
| **HL** | 对 MM、ME、CE 里多子任务的片段**人工标注子任务文字**，并标出相关物体的边界框 | 让模型既能当高层（输出子任务），也能当低层（按子任务出动作）；先预测边界框再预测子任务 |
| **WD** | 图像描述（CapsFusion、COCO）、问答（Cambrian-7M、PixMo、VQAv2）、物体定位（含额外的室内家居标注） | 保住并扩展语义与视觉能力 |

预训练阶段 **97.6%** 的训练样本不来自家里的移动机械臂（§I）。

**动作表示的统一**（§IV-C）：所有动作数据都预测目标关节位姿与末端位姿，在 prompt 里加 `<control mode> joint/end effector <control mode>` 区分；每个数据集的每一维用 1% 与 99% 分位数归一化到 $[-1, 1]$；动作维度补零到最大的那台机器人。

**后训练**（§IV-D）：

- 动作数据只用 MM 和 ME，并过滤成**成功且短于固定长度阈值**的片段；
- **去掉 CE**，把模型聚焦到家里的移动操作；
- 保留 WD（保住语义与视觉能力），保留与 ME 对应的那部分 HL；
- **新加 VI**：专家实时用语言「遥操作」——给已训练好的低层策略一条条下子任务指令，得到好的高层示范。

</details>

### 2. 一个模型，两层推理

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：分布拆成高层 × 低层、动作只条件在子任务上、和 SayCan 与思维链的区别</summary>

§IV-A 把模型要建的分布写成：

$$
\pi_\theta(a_{t:t+H}, \hat\ell \mid o_t, \ell) = \pi_\theta(a_{t:t+H}\mid o_t, \hat\ell)\;\pi_\theta(\hat\ell\mid o_t, \ell)
$$

- $o_t = [I_t^1,\dots,I_t^n, q_t]$：所有相机图像和机器人构型（关节角、夹爪位姿、躯干升降、底盘速度）。
- $\ell$：总任务，如「put away the dishes」。
- $\hat\ell$：模型输出的文字——可以是预测的子任务（「pick up the plate」），也可以是网页数据里视觉问答的答案。
- **动作分布只依赖 $\hat\ell$，不依赖 $\ell$。**

高层推理对应 $\pi_\theta(\hat\ell\mid o_t,\ell)$，低层推理对应 $\pi_\theta(a\mid o_t,\hat\ell)$，**两者是同一个模型**。

和已有做法的区别（§II）：

- 很多方法用**两个模型**：一个 VLM 预测语义步骤、另一个低层策略执行（SayCan 一类，也包括 π₀ 论文里用高层 VLM 给子任务指令的做法）。
- π₀.₅ 更像思维链或测试时计算：先推理出子任务，再据此出动作。但和具身思维链方法不同，**高层推理的频率低于低层动作推理**。

这个拆分的好处是两层可以吃不同的数据：低层能从别的机器人（包括更简单的固定机械臂）的动作数据受益，高层能从网页语义、子任务标注和口头指令受益（§I）。

</details>

### 3. 离散预训练 + 连续后训练

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：式 (1)、α 在两个阶段的取值、为什么先用 FAST 再接动作专家、注意力约束</summary>

§IV-B：连续动作仍用流匹配，但 VLA 训练在动作用**离散 token**表示时快得多（尤其是 FAST 这种高效压缩动作块的 tokenizer）；离散表示的问题是推理要自回归解码，实时控制太慢。理想做法是：**训练时用离散动作，推理时用流匹配出连续动作**。于是模型同时学两种动作表示，目标是

$$
\mathbb{E}_{\mathcal{D},\tau,\omega}\Big[\,H\big(x_{1:M},\, f^\ell_\theta(o_t,\ell)\big) + \alpha\,\big\lVert \omega - a_{t:t+H} - f^a_\theta(a^{\tau,\omega}_{t:t+H}, o_t, \ell)\big\rVert^2\,\Big]
\tag{1}
$$

- $H(\cdot)$：文本 token（**包括 FAST 编码的动作 token**）上的交叉熵；
- 第二项：动作专家输出与流匹配目标的均方误差，$a^{\tau,\omega} _ {t:t+H} = \tau a _ {t:t+H} + (1-\tau)\omega$，$\omega\sim\mathcal{N}(0, I)$；
- $\alpha$：两项的取舍。

| 阶段 | $\alpha$ | 动作专家 | 步数 | 数据 |
|---|---|---|---|---|
| 预训练 | 0 | 无（纯离散 token） | 280k | MM · ME · CE · HL · WD |
| 后训练 | 10.0 | 加入，**随机初始化** | 80k | MM · ME（过滤）· WD · HL（ME 部分）· VI |

后训练同时保留下一个 token 预测，以保住文本预测能力。作者说这样的流程让预训练稳定、语言跟随好。推理时先标准自回归解码出文本 $\hat\ell$，再以 $\hat\ell$ 为条件做 **10 步去噪**得到动作。

**注意力约束**（附录 E、图 18）：图像、prompt 和本体状态用完整的前缀掩码；FAST 动作 token 看前缀、并自回归地看之前的动作 token；动作专家的 token 看前缀和彼此，**但不看 FAST 动作 token**，以免两种动作表示之间泄漏信息。信息只从 VLM 流向动作专家，没有 VLM 的 token 会看动作专家。

**一个符号细节。** 本文的插值式 $\tau a + (1-\tau)\omega$ 与 π₀ 论文相同（$\tau = 1$ 是动作），但把速度目标写成 $\omega - a$，和 π₀ 论文的 $A - \epsilon$ 正好反号。按插值式求导得到的是 $a - \omega$；$\omega - a$ 对应的是 openpi 代码里「$t = 1$ 是噪声」的约定。笔者推测是两种约定混写，读公式时以代码为准。

**和 π₀-FAST+Flow 的关系**（§V-D）：作者还训练了一个「π₀-FAST+Flow」，用同一个式 (1) 的混合训练，但只用有动作的数据（没有 HL、WD），所以不能做高层推理。它用来把「训练方式」和「协同数据」这两个因素分开。

</details>

### 4. 结构细节与机器人系统

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：状态走离散 token、时间用 adaRMSNorm、四路相机、50 Hz 目标值交给 PD</summary>

**和 π₀ 的结构差别**（§IV-A、附录 E）：

- **状态离散化成文本 token** 输入 VLM（π₀ 里状态是动作专家的一个连续 token）。
- **时间步注入方式**：π₀ 把 $\tau$ 的正弦编码和带噪动作拼接后过 MLP；π₀.₅ 用单独的 MLP $\mathrm{swish}(W_2\,\mathrm{swish}(W_1\,\phi(\tau)))$ 处理 $\tau$，再用**自适应 RMSNorm** 注入动作专家的每一层。带噪动作只经一个线性层投影。
- **尺寸不变**：VLM 为 PaliGemma（宽度 2048、18 层、MLP 16,384），动作专家宽度 1024、MLP 4096，约 300M。
- 附录 E 写「action horizon of 50, i.e. $H = 49$」。笔者推测是按 $a _ {t:t+H}$ 含两端计数，实际仍是 50 步。
- 时间采样与 π₀ 相同：$p(\tau) = \mathrm{Beta}((s-\tau)/s; 1.5, 1)$，$s = 0.999$。
- 图像增强（按顺序）：随机裁剪 95%、缩放回原尺寸、旋转 ±5°、颜色抖动（亮度 0.3、对比度 0.4、饱和度 0.5）。

**机器人**（§IV-E、图 5）：两款移动机械臂，都是两条 6 自由度臂 + 平行夹爪 + 腕部单目 RGB、全向底盘（状态与动作是线速度 2 维 + 角速度 1 维）、升降躯干（1 维上下，或 2 维上下 + 前后）。另有前、后两路相机装在两臂之间。**高层推理用全部四路相机，低层用两个手腕 + 前向三路。** 总状态 / 动作维度 18 或 19。

**控制**：模型直接以 **50 Hz**（配合动作块）输出双臂、夹爪、躯干的目标位姿和底盘目标速度，交给简单的 PD 控制器跟踪，**没有额外的轨迹规划或碰撞检测**；所有操作和导航都是端到端的。

</details>

---

## 🧭 训练的两个阶段（mermaid）

<div class="mermaid">
flowchart TB
  subgraph PRE["阶段 1 · 预训练（α = 0，280k 步，全部离散 token）"]
    MM["MM 约 400 h · 约 100 个家"]
    ME["ME 非移动机械臂 · 更多的家"]
    CE["CE 实验室跨本体 + OXE"]
    HL["HL 子任务文字 + 边界框"]
    WD["WD 描述 · 问答 · 定位"]
  end
  VLM["PaliGemma 初始化<br/>SigLIP 400M + Gemma 2B"] --> M1["VLA（FAST 动作 token）"]
  MM --> M1
  ME --> M1
  CE --> M1
  HL --> M1
  WD --> M1
  subgraph POST["阶段 2 · 后训练（α = 10，80k 步）"]
    P1["MM · ME 过滤成功短片段"]
    P2["WD · HL（ME 部分）"]
    P3["VI 口头指令示范（新增）"]
  end
  M1 --> M2["+ 随机初始化的动作专家 300M<br/>交叉熵 + 流匹配"]
  P1 --> M2
  P2 --> M2
  P3 --> M2
  M2 --> DEPLOY["π₀.₅：先写子任务，再 10 步去噪出 50 Hz 动作块"]
</div>

## 🧭 一次推理的两层（mermaid）

<div class="mermaid">
flowchart LR
  CAM4["四路相机 + 离散化状态"] --> HIGH["高层：自回归文本<br/>π(ℓ̂ #124; o, ℓ)"]
  CMD["总任务 ℓ：put the items in the drawer"] --> HIGH
  HIGH --> SUB["子任务 ℓ̂：pick up tong"]
  CAM3["手腕 ×2 + 前向相机"] --> LOW["低层：动作专家 10 步去噪<br/>π(a #124; o, ℓ̂)"]
  SUB --> LOW
  LOW --> ACT["50 Hz 目标位姿 / 底盘速度"]
  ACT --> PD["PD 跟踪（无规划、无碰撞检测）"]
</div>

---

## 🚶 具体实例：「把东西放进抽屉」的一次高层 + 低层推理

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（7 节）：环境设定 / 第 1 步：高层写子任务 / 第 2 步：状态变成文本 / 第 3 步：动作归一化 / 第 4 步：两个阶段的损失 / 第 5 步：注意力掩码 / 第 6 步：一次任务的节奏</summary>

<h3 id="实例-环境设定">环境设定</h3>

取图 7 家 1 的真实片段：人给的总任务是「put the items in the drawer」，模型在图中依次预测的子任务是「pull out the top right drawer」→「pick up tong」→「put tong into drawer」→「push the top drawer」。

> 💡 子任务序列来自论文图 7；下面的状态值、分位数和损失里的具体数字是笔记构造的**玩具数**，动画第三、五幕用的是同一组数。状态分桶按 openpi 的 `pi05` 实现（论文只写「离散化」，没有给桶数）。

<h3 id="实例-第-1-步高层写子任务">第 1 步：高层写子任务</h3>

输入：四路相机图像 + 离散化状态 + 总任务 $\ell$。模型先（可选地）输出相关物体的边界框（HL 数据训练时就是先框后子任务），再自回归写出 $\hat\ell$ =「pick up tong」。这一步是普通的文本解码。

<h3 id="实例-第-2-步状态变成文本">第 2 步：状态变成文本</h3>

openpi 把归一化到 $[-1, 1]$ 的每一维状态分进 256 个等宽桶（宽 $2/256 = 0.0078125$）：

$$
\text{bin}(x) = \#\{\,k:\ -1 + k\cdot 0.0078125 \le x\,\} - 1
$$

$x = 0.3$：$(0.3 + 1)/0.0078125 = 166.4$，落在第 **166** 桶（左边界 $-1 + 166\times0.0078125 = 0.296875$）。整个状态被写成 `"Task: put the items in the drawer, State: 166 …;\nAction: "` 这样的一段文字。

<h3 id="实例-第-3-步动作归一化">第 3 步：动作归一化</h3>

每个数据集每一维按 1% / 99% 分位数 $q _ {01}, q _ {99}$ 线性映射到 $[-1, 1]$：

$$
\tilde a = 2\cdot\frac{a - q_{01}}{q_{99} - q_{01}} - 1
$$

取 $q _ {01} = -0.8$、$q _ {99} = 1.2$、$a = 0.2$：$\tilde a = 2\times1.0/2.0 - 1 = 0.00$。用分位数而不是最小 / 最大值，可以让偶尔的离群值不把正常范围压扁。

<h3 id="实例-第-4-步两个阶段的损失">第 4 步：两个阶段的损失</h3>

设某个样本的交叉熵项为 $H = 2.3$，流匹配项的均方误差为 $0.16$：

| 阶段 | $\alpha$ | 式 (1) 的值 |
|---|---|---|
| 预训练 | 0 | $2.3 + 0\times0.16 = 2.3$（动作专家还不存在） |
| 后训练 | 10 | $2.3 + 10\times0.16 = 3.9$ |

后训练里流匹配项被放大 10 倍，但交叉熵项仍在，文本能力不会被冲掉。预训练时 $H$ 里已经包含 FAST 动作 token 的交叉熵，所以模型在预训练就学会了动作，只是用离散形式。

<h3 id="实例-第-5-步注意力掩码">第 5 步：注意力掩码</h3>

后训练时序列里同时有 FAST 动作 token 和动作专家 token（按图 18 的描述）：

| query \ key | 前缀（图像、prompt、状态） | FAST 动作 token | 动作专家 token |
|---|---|---|---|
| 前缀 | ✅ | ❌ | ❌ |
| FAST 动作 token | ✅ | ✅（仅之前的，自回归） | ❌ |
| 动作专家 token | ✅ | ❌（防泄漏） | ✅ |

如果动作专家能看到 FAST token，它就可以直接「抄」离散版本的答案，流匹配学不到东西；反之亦然。

<h3 id="实例-第-6-步一次任务的节奏">第 6 步：一次任务的节奏</h3>

低层以 50 Hz 输出动作块，高层频率更低（论文没有给出具体频率）。每个子任务完成后高层写出下一个，直到四个子任务走完。真实家庭里的单个评测任务约 2–5 分钟（§V-A）；清理整个厨房或卧室这类完整家务是 10–15 分钟（图 1）。

</details>

---

## 📊 实验里实际报了什么

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：真实家庭、训练地点数、配方消融、对比 π₀、高层推理消融</summary>

所有实验都在**训练时没见过的环境**里做：定量对比用若干模拟家（mock kitchens / bedrooms），最终评测在三个不在训练集里的真实家（图 6）。评分按附录 B 的细则，大致对应完成步骤的百分比；每个策略每个任务 10 次，四个任务共 40 次，交错执行以控制环境变化，显著性用双侧 t 检验。

| 任务 | 满分 | 计分 |
|---|---|---|
| Dishes in Sink | 8 | 4 件餐具，每件拿起 +1、放进水槽 +1 |
| Items in Drawer | 4 | 拿起、开抽屉、放进去、关抽屉（物体在里面时） |
| Laundry in Basket | 3 | 走过去拿起衣物、放到篮子上 / 里、完全在篮子里 |
| Make the Bed | 5 | 拉平被子、两个枕头各 +1、被子很整齐 +1、枕头很整齐 +1 |

**① 真实家庭**（§V-A、图 7）：三个家、各做厨房和卧室任务，两款机器人都用。π₀.₅ 在每个家里都能稳定完成多种任务；很多任务是多阶段的，持续约 2–5 分钟；模型只拿到一句简单指令，高层自主决定步骤。作者还说模拟家里的表现能代表真实家里的表现。

**② 训练地点数**（§V-B、图 8–9）：后训练里的移动操作数据分别来自 3、12、22、53、82、104 个地点（预训练里去掉移动操作数据以节省算力），每个模型训 4 万步、见到的独立样本数相同。

- 四个家务任务的平均表现**随地点数上升**；
- 104 个地点的模型与「训练集包含测试家」的对照表现相近；
- 不用其他协同数据、直接在测试家数据或 104 地点数据上训练的两个基线**明显更差**；
- 语言跟随（五个物体里挑指定的一个，放进抽屉或水槽；干扰物更近，瞎猜约 20%）：地点越多越好，见过类别的物体提升更快，没见过类别的物体也在变好。

**③ 配方消融**（§V-C、图 10–11、附录 D 图 16）：

- 去掉 ME 或 CE：明显变差；两个都去掉更差——跨本体迁移（来自其他环境、其他任务）很关键；
- 去掉 WD：四个家务任务上差异**不显著**，但**没见过类别的物体**上语言跟随明显变差；作者推测网页数据提供了对物体的广泛知识；
- 分任务看：Items in Drawer 对去掉 ME / CE / WD 都敏感（需要认识大量常见物体）；Dishes in Sink 对去掉 WD 较稳，但对去掉 ME / CE 敏感。

**④ 对比其他 VLA**（§V-D、图 12、附录图 15）：同一套跨本体机器人训练集、可比步数下，π₀.₅ 显著好于 π₀ 和 π₀-FAST+Flow；即便把 π₀ 训到 30 万步也一样，作者据此认为 FAST token 训练在算力上更高效。语言跟随上 π₀.₅ 略高于 π₀-FAST+Flow，明显高于 π₀。

**⑤ 高层推理**（§V-E、图 13、附录图 17）：低层都用 π₀.₅，只换高层：

- 完整 π₀.₅ **最好**，甚至**好过人当高层**的「上界」对照；
- 第二是 **implicit HL**（推理时不显式写子任务，但训练含子任务数据）——大部分好处来自训练配方本身；
- no HL（训练里也没有子任务数据）明显更差；
- no VI 明显更差，而 VI 只占高层移动操作样本的约 **11%**；
- no WD 明显更差，说明网页数据的好处主要体现在高层；
- **GPT-4 零样本当高层最差**（给了任务描述和常用子任务标签列表），说明高层也要用机器人数据适配。

</details>

---

## ⚠️ 边界

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：仍会犯错、只处理简单指令、上下文短</summary>

作者在 §VI 列出的局限：

- **仍会犯错**：陌生的抽屉把手、机器人难以打开的柜门；部分可观测（手臂挡住了要擦的污渍）；高层子任务推理容易分心（放东西时反复开关抽屉）。
- **只处理比较简单的指令**：能接受的指令复杂度由训练数据决定，更复杂的偏好需要更丰富的标注（人工或合成）。
- **上下文较短**：没有更长的上下文和记忆，跨房间导航、记住东西放在哪这类强部分可观测任务做不好。
- 数据来源的组合还可以探索得更广，口头指令这种新监督方式值得继续研究。

阅读时再补几点（笔者的判断）：

- 机器人是**轮式移动双臂**，不是人形；「开放世界」指家庭环境与物体的新颖性，不涉及腿足运动。
- 结果大多以柱状图给出，正文没有具体数值；和其他论文比较时要回到原图。
- openpi 开源版 π₀.₅ 只支持流匹配头（README 原话），且 README 说它用 knowledge insulation 训练——这和论文描述的训练流程并不完全相同，复现论文的高层推理与 FAST 预训练做不到。

</details>

---

## 📁 openpi 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（5 节）：1. pi05 开关 / 2. 状态变成文本 / 3. adaRMSNorm 注入时间 / 4. 微调配置 / 5. 论文与代码对照表</summary>

> 💡 π₀.₅ 在 openpi 里不是单独的模型类，而是 `Pi0Config(pi05=True)`（`main` 分支 commit `215abfb`）。README：「in this repository, we currently only support the flow matching head for both π₀.₅ training and inference」。

<h3 id="源码-1-pi05-开关">1. `pi05` 开关</h3>

```python
# src/openpi/models/pi0_config.py
    # Pi05 has two differences from Pi0:
    # - the state input is part of the discrete language tokens rather than a continuous input that is part of the suffix
    # - the action expert uses adaRMSNorm to inject the flow matching timestep
    pi05: bool = False
    ...
    def __post_init__(self):
        if self.max_token_len is None:
            object.__setattr__(self, "max_token_len", 200 if self.pi05 else 48)
        if self.discrete_state_input is None:
            object.__setattr__(self, "discrete_state_input", self.pi05)
```

代码注释列出的两处差别，正好对应附录 E 的「状态离散化输入 VLM」和「adaRMSNorm 注入时间步」。prompt 长度从 48 放到 200，是因为状态也变成了文字。

<h3 id="源码-2-状态变成文本">2. 状态变成文本</h3>

```python
# src/openpi/models/tokenizer.py - PaligemmaTokenizer.tokenize()
if state is not None:
    # This is the Pi05 format, where the state is part of the discrete language input.
    discretized_state = np.digitize(state, bins=np.linspace(-1, 1, 256 + 1)[:-1]) - 1
    state_str = " ".join(map(str, discretized_state))
    full_prompt = f"Task: {cleaned_text}, State: {state_str};\nAction: "
    tokens = self._tokenizer.encode(full_prompt, add_bos=True)
```

256 个等宽桶；见[实例第 2 步](#实例-第-2-步状态变成文本)。论文没有写桶数，256 取自代码。

<h3 id="源码-3-adarmsnorm-注入时间">3. adaRMSNorm 注入时间</h3>

```python
# src/openpi/models/pi0.py - Pi0.embed_suffix()（π₀.₅ 分支）
action_tokens = self.action_in_proj(noisy_actions)
time_emb = posemb_sincos(timestep, self.action_in_proj.out_features, min_period=4e-3, max_period=4.0)
if self.pi05:
    # time MLP (for adaRMS)
    time_emb = self.time_mlp_in(time_emb)
    time_emb = nnx.swish(time_emb)
    time_emb = self.time_mlp_out(time_emb)
    time_emb = nnx.swish(time_emb)
    action_expert_tokens = action_tokens
    adarms_cond = time_emb
```

```python
# src/openpi/models/gemma.py - RMSNorm.__call__()
if cond is None:
    # regular RMSNorm
    scale = self.param("scale", nn.initializers.zeros_init(), (x.shape[-1]))
    normed_inputs = normed_inputs * (1 + scale)
    return normed_inputs.astype(dtype), None
# adaptive RMSNorm
modulation = nn.Dense(x.shape[-1] * 3, kernel_init=nn.initializers.zeros, dtype=dtype)(cond)
scale, shift, gate = jnp.split(modulation[:, None, :], 3, axis=-1)
normed_inputs = normed_inputs * (1 + scale) + shift
return normed_inputs.astype(dtype), gate
```

- 时间 MLP 是 $\mathrm{swish}(W_2\,\mathrm{swish}(W_1\,\phi(\tau)))$，和附录 E 一致；带噪动作只过 `action_in_proj` 一个线性层。
- adaRMSNorm 从时间向量回归出**缩放、平移、门控**三组参数（门控用于残差分支）；`Dense` 用零初始化，训练开始时等价于普通 RMSNorm。VLM 一侧 `adarms_cond=None`，走普通 RMSNorm。

<h3 id="源码-4-微调配置">4. 微调配置：`pi05_libero`</h3>

```python
# src/openpi/training/config.py
TrainConfig(
    name="pi05_libero",
    model=pi0_config.Pi0Config(pi05=True, action_horizon=10, discrete_state_input=False),
    ...
    batch_size=256,
    lr_schedule=_optimizer.CosineDecaySchedule(
        warmup_steps=10_000, peak_lr=5e-5, decay_steps=1_000_000, decay_lr=5e-5),
    optimizer=_optimizer.AdamW(clip_gradient_norm=1.0),
    ema_decay=0.999,
    weight_loader=weight_loaders.CheckpointWeightLoader("gs://openpi-assets/checkpoints/pi05_base/params"),
    num_train_steps=30_000,
)
```

LIBERO 仿真基准上，动作块缩到 10 步，并关掉离散状态输入。这说明开源版把「状态是否离散」「动作视界多长」都当成可调配置，而不是论文里固定的 50 步 + 离散状态。

<h3 id="源码-5-论文与代码对照表">5. 论文与代码对照表</h3>

| 论文 | openpi | 说明 |
|---|---|---|
| 预训练用 FAST 离散动作（$\alpha = 0$），后训练加动作专家（$\alpha = 10$） | 只有流匹配头 | README 明确说明；`pi0_fast.py` 是单独的 π₀-FAST 模型 |
| 同模型先输出子任务 $\hat\ell$ 再出动作 | 无高层文本解码 | 开源推理直接用给定 prompt 出动作 |
| 状态离散化成文本 | `discrete_state_input=True`（π₀.₅ 默认），256 桶 | 桶数取自代码 |
| 时间用 adaRMSNorm 注入 | `time_mlp_in/out` + `RMSNorm(cond)` | 一致 |
| 动作视界 50（「即 $H = 49$」） | 默认 `action_horizon=50`；`pi05_libero` 用 10 | 可配置 |
| 1% / 99% 分位数归一化到 $[-1, 1]$ | `transforms.Normalize._normalize_quantile`：`(x - q01) / (q99 - q01 + 1e-6) * 2.0 - 1.0`；`use_quantile_norm = model_type != PI0` | 一致；π₀ 仍用 z-score，π₀.₅ 与 π₀-FAST 用分位数 |
| 速度目标 $\omega - a$（插值式 $\tau a + (1-\tau)\omega$） | `u_t = noise - actions`，`x_t = t·noise + (1-t)·actions` | 代码约定 $t = 1$ 为噪声，与 $\omega - a$ 自洽 |

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：六问 —— 和 π₀ 差在哪、为什么两阶段、高层低层为什么同一个模型、哪类数据最重要、implicit HL 说明什么、边界</summary>

**Q：π₀.₅ 和 π₀ 差在哪？**  
A：主干和尺寸一样，差在配方和推理：① 异构协同训练（非移动机械臂、实验室跨本体、子任务标注、网页数据、口头指令）；② 预训练用 FAST 离散动作、后训练才接流匹配动作专家；③ 同一个模型先写子任务再出动作；④ 结构上状态改成离散文本 token，时间步用 adaRMSNorm 注入。

**Q：为什么先离散后连续？**  
A：离散 token（FAST）训练快、稳、语言跟随好，但推理要自回归解码，实时控制太慢；流匹配推理快、动作细。式 (1) 让两者共存：预训练 $\alpha = 0$ 纯离散 280k 步，后训练加随机初始化的动作专家、$\alpha = 10$ 再训 80k 步。掩码保证动作专家看不到 FAST token，防止互相抄答案。

**Q：高层和低层为什么放在同一个模型里？**  
A：分布拆成 $\pi(a\mid o,\hat\ell)\pi(\hat\ell\mid o,\ell)$，两层共享权重，高层能吃网页和语言数据、低层能吃别的机器人的动作数据，知识在同一组参数里互通。实验里完整模型甚至好过人当高层，GPT-4 零样本当高层最差。

**Q：哪类数据最重要？**  
A：去掉跨本体数据（ME 或 CE）在家务任务上掉得最明显；去掉网页数据在家务总分上不显著，但对没见过类别的物体和高层推理影响大；口头指令只占高层移动操作样本约 11%，去掉却明显变差。

**Q：implicit HL 排第二说明什么？**  
A：推理时不显式写子任务、只要训练数据里有子任务预测，就能拿到大部分好处——说明子任务数据本身在塑造表示，显式推理是锦上添花。

**Q：它还做不了什么？**  
A：陌生把手、难开的柜门、被手臂挡住的污渍会失败；高层会分心反复开关抽屉；指令只能比较简单；上下文短，没有跨房间记忆。机器人是轮式移动双臂，不涉及人形全身或腿足运动。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：数字从哪一节来，以及和本站其他笔记的关系</summary>

<h3 id="数字出处">数字出处</h3>

- 97.6%、约 400 小时、10–15 分钟：§I、图 1；约 100 个家：§IV-C。
- 六类数据：图 4 与 §IV-C–D；动作归一化与 control mode：§IV-C。
- 式 (1)、280k / 80k 步、$\alpha = 10$、10 步去噪：§IV-B–D。
- 机器人与 50 Hz 控制：§IV-E、图 5。
- 地点数 3–104、40k 步：§V-B；语言跟随 20% 基线：附录 C。
- 消融：§V-C–E、附录 D 图 16–17；约 11%：§V-E。
- 结构、adaRMSNorm、$H = 49$ 的写法、图像增强：附录 E。
- 评分细则：附录 B。
- 源码：openpi `main` 分支 commit `215abfb` 的 `pi0.py`、`pi0_config.py`、`gemma.py`、`tokenizer.py`、`training/config.py` 与 README。
- 具体实例里的 $x = 0.3$、$q _ {01} = -0.8$、$q _ {99} = 1.2$、$H = 2.3$、$0.16$ 是笔记构造的玩具数。

<h3 id="相关阅读">相关阅读</h3>

- 本站 [π₀](../Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.html)：主干、流匹配、动作专家的来源。
- 本站 [Transformer](../../01_Foundational_RL/Transformer_Attention_Is_All_You_Need/Transformer_Attention_Is_All_You_Need.html)：前缀掩码、自回归与正弦时间编码的来源。
- 本站 [GR00T N1](../GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.html)：同期面向人形的 VLA，同样用异构数据（数据金字塔），但高层 / 低层是 System 2 / System 1 两个模块。
- [FAST（Pertsch et al., 2025）](https://arxiv.org/abs/2501.09747)：预训练阶段的动作 tokenizer。
- [SayCan（Ahn et al., 2022）](https://arxiv.org/abs/2204.01691)、[RT-H（Belkhale et al., 2024）](https://arxiv.org/abs/2403.01823)：用语言做层级动作的前作，π₀.₅ 把两层合进一个模型。

</details>
