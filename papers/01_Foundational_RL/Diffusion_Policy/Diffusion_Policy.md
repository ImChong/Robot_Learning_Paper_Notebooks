---
layout: paper
paper_order: 10
title: "Diffusion Policy: Visuomotor Policy Learning via Action Diffusion"
category: "基础强化学习"
zhname: "Diffusion Policy：基于动作扩散的视觉运动策略学习"
demos: ["diffusion_policy"]
---

# Diffusion Policy: Visuomotor Policy Learning via Action Diffusion
**Diffusion Policy：基于动作扩散的视觉运动策略学习**

> 📅 阅读日期: 2026-04-21
>
> 🏷️ 板块: 扩散+控制主线起点
>
> 🚧 本笔记已填充基本信息，深度技术细节待细化。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2303.04137](https://arxiv.org/abs/2303.04137) |
| **PDF** | [Download](https://arxiv.org/pdf/2303.04137.pdf) |
| **作者** | Cheng Chi, Siyuan Feng, Yilun Du, Zhenjia Xu, Eric Cousineau, Benjamin Burchfiel, Shuran Song |
| **机构** | Columbia / MIT / Toyota Research Institute |
| **发布时间** | 2023-03 (arXiv), RSS 2023 |
| **扩展版** | 2024-03 期刊扩展版 arXiv v5：作者加 Russ Tedrake，补控制理论一节、编码器消融与 3 个双臂真机任务；本笔记与动画的数字以 v5 为准 |
| **项目主页** | [Diffusion Policy Website](https://diffusion-policy.cs.columbia.edu/) |
| **代码** | [GitHub - real-stanford/diffusion_policy](https://github.com/real-stanford/diffusion_policy)（原 columbia-ai-robotics/diffusion_policy） |

---

## 🎯 一句话总结

> Diffusion Policy 将机器人视觉运动策略表示为条件去噪扩散过程 $p(A_t \mid O_t)$：一次去噪出一整段动作、只执行前一段就带着新观测再规划，从而处理模仿学习里的多模态动作分布，训练也比能量模型（IBC）稳定。

> 🎮 **本文内嵌 1 段动画 + 1 段配音视频 + 3 个可交互演示**（不用装任何东西）：
> 1. [七幕动画：Diffusion Policy 全流程](#dp-explainer-anim) —— 约 88 秒串完「平均动作撞障 → 条件扩散 → action chunking → 视觉条件 + FiLM → DDIM 加速 → receding horizon → 定量证据与局限」
> 2. [配音讲解视频](#dp-video) —— 同样七幕，加中文配音与字幕，7 分 59 秒竖屏，可下载
> 3. [「平均动作」为什么会撞上障碍](#dp-multimodal-demo) —— 演示一半上绕一半下绕，MSE 给出的是两峰均值
> 4. [去噪：从噪声里捞出整条 chunk](#dp-denoise-demo) —— 浏览器里真的在跑 DDIM，整条 16 步一起锁模式
> 5. [Receding Horizon：预测 16，执行 8](#dp-rhc-demo) —— 拖 $T_a$，看反应延迟和推理开销怎么此消彼长

---

## 📌 英文缩写速查

> 从 PPO 到 PULSE 那几篇是在仿真里靠奖励做强化学习；这一篇是**照着演示学**（行为克隆），下面这些名词多半第一次见。

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| BC | Behavior Cloning（行为克隆） | 把演示里「看到的观测 → 做出的动作」配成对，当监督学习来学，不需要奖励 |
| MSE | Mean Squared Error（均方误差） | 预测与演示之差的平方再平均；用它回归，最优解是条件均值 |
| Push-T | — | 用圆形末端把 T 形积木推进目标框的平面任务（IBC 论文提出），左绕右绕都对，是典型的多峰任务 |
| LSTM-GMM | LSTM + Gaussian Mixture Model | 循环网络输出几个高斯叠加的分布，robomimic 里的 BC-RNN 基线；要预先定好峰的个数 |
| IBC | Implicit Behavioral Cloning（隐式行为克隆） | 用能量模型（EBM）给每个动作打分，推理时找能量最低的动作；训练要靠负样本，不稳 |
| BET | Behavior Transformer | 先把动作聚类成几类，再预测一个偏移；逐步采样，相邻两步可能换峰 |
| EBM | Energy-Based Model（能量模型） | 给每个输入打能量分，变成概率要除以对所有动作求和的归一化常数 $Z$ |
| Score | 分数 / 得分函数 | 对数概率对动作的梯度 $\nabla_a \log p(a \mid o)$；扩散网络学的就是它，$Z$ 求导后消失 |
| DDPM | Denoising Diffusion Probabilistic Model | 去噪扩散概率模型：一步一步去噪的标准扩散 |
| iDDPM | Improved DDPM | 改进版 DDPM（平方余弦噪声表），本文仿真基准用它推理 100 步 |
| DDIM | Denoising Diffusion Implicit Model | 能跳步的采样方法，训练与推理步数解耦，大幅减少推理步数 |
| UNet | — | 带跳连的卷积结构；本文的卷积版沿时间方向做一维卷积 |
| FiLM | Feature-wise Linear Modulation | 用条件（观测特征、去噪步）算出每个通道的缩放与偏置，调制去噪网络 |
| ResNet-18 | Residual Network, 18 层 | 常用的图像卷积网络，本文从头训练做视觉编码器 |
| EMA | Exponential Moving Average（指数滑动平均） | 训练时额外维护一份平滑过的权重，评估用它 |
| CLIP / ViT | Contrastive Language-Image Pre-training / Vision Transformer | 在海量图文配对上预训练的模型 / 用 Transformer 处理图像的网络 |
| RHC | Receding Horizon Control（滚动时域控制） | 预测一段，只执行前一部分，带着新观测再规划 |
| $T_o$ / $T_p$ / $T_a$ | observation / prediction / action horizon | 看几帧观测 / 一次预测几步 / 实际执行几步（默认 2 / 16 / 8） |

---

## 🎬 七幕动画：Diffusion Policy 全流程 {#dp-explainer-anim}

<div class="paper-demo" data-demo="dp-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#dp-video}

<div class="paper-demo" data-demo="dp-video" data-src="media/dp_explainer_video.mp4" data-poster="media/dp_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/dp_explainer_video.mp4" download="Diffusion_Policy_讲解视频.mp4">下载 mp4（9.9 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：前半部分（「要解决什么问题」「是怎么做的」）按小节收起，后面的具体实例、工程价值、源码对照、面试问题与附录整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图、交互演示留在外面。目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。

---

## ❓ Diffusion Policy 要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：多模态下 MSE 给出「平均动作」；GMM / 分桶要先定峰数，IBC（能量模型）训练不稳</summary>

- **多模态挑战 (Multimodality)**：传统 BC（Behavior Cloning）用网络直接回归动作，遇到人类演示里有多种解法时（例如从左绕开或从右绕开障碍），MSE 的最优解是条件均值 $\mathbb{E}[a \mid o]$，产生"平均动作"，导致机器人撞上障碍。论文图 3（Push-T）：LSTM-GMM 和 IBC 偏向一边，BET 两边来回切、定不下来，Diffusion Policy 两边都学到、每次只走一边。
- **显式多模态表示的局限**：混合高斯（LSTM-GMM / BC-RNN）、分桶或聚类 + 偏移（BET）要预先定好峰的个数，对超参敏感、会塌缩到一个峰（第 8 节相关工作），也很难扩展到「一整段动作序列」这样的高维输出。
- **训练稳定性**：隐式策略 IBC 用能量模型 $p_\theta(a \mid o) = e^{-E_\theta(o,a)} / Z(o,\theta)$，归一化常数 $Z$ 要靠负样本估计，训练不稳（图 6：成功率随训练上下震荡）；扩散学的是 $\nabla_a \log p$，与 $Z$ 无关（式 8）。

> 论文正文没有和 GAN / VAE 做对比，这里不再沿用「比 GAN 稳、比 VAE 表达力强」的说法。

</details>

「平均动作会撞上障碍」这句话值得亲眼看一次。下面这个实验台里，人类演示一半从上绕、一半从下绕——MSE 回归给出的是两峰的**均值**，正好是障碍所在的位置；扩散策略采的是分布，每次落在某一侧（简化模型，只复现机制）：

<div class="paper-demo" data-demo="dp-multimodal" id="dp-multimodal-demo"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## 🔧 方法详解

### Action Chunking：预测整条 horizon

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：不再预测单步，而是一次去噪出 T_p 步，只执行其中 T_a 步</summary>

在时刻 $t$，策略看最近 $T_o$ 步观测 $O_t$，一次预测 $T_p$ 步动作 $A_t$，其中 $T_a$ 步不再规划、直接执行（2.3 节）。附录表 7 的仿真配置是 $T_o = 2$、$T_p = 16$、$T_a = 8$，真机 Push-T 是 $T_a = 6$。

一次预测一整段带来两点好处（4.3 节）：

- **时间一致**：如果每一步单独从多峰分布里采（LSTM-GMM、BET 那样），相邻两步可能来自不同的峰，在两条可行轨迹之间来回抖；整段一起去噪，峰一旦选定，整段走同一侧。上文交互演示里「责任权重按整条 16 步算」是浏览器里的简化模型，用来复现这个机制。
- **不怕停顿（idle actions）**：演示里常有停顿，比如真机上用勺子从碗里舀番茄酱（倒酱任务），得停住等酱装满；单步策略容易学成原地不动；论文里 LSTM-GMM 和 IBC 在真机上不去掉停顿就常常停住。

为什么以前的方法很少预测序列：IBC 在高维、不光滑的能量面上采样困难，GMM / k-means 要预先定峰数；扩散在图像生成里已经证明能撑住高维输出（4.3 节）。

</details>

### 条件扩散：从噪声还原动作序列

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：学的是 p(A|O)，训练让 ε_θ 预测加进去的噪声，推理从高斯噪声走 K 步还原</summary>

策略不再回归一个动作向量，而是把动作生成写成条件去噪扩散过程（2.3 节）：

- **训练（式 5）**：从演示里取一段干净动作 $A^0_t$，随机选一个噪声步 $k$ 加噪，让网络预测加进去的噪声：$\mathcal{L} = \mathrm{MSE}\big(\varepsilon^k,\ \varepsilon_\theta(O_t,\ A^0_t + \varepsilon^k,\ k)\big)$。
- **推理（式 4）**：从 $A^K_t \sim \mathcal{N}(0, I)$ 出发，$A^{k-1}_t = \alpha\big(A^k_t - \gamma\,\varepsilon_\theta(O_t, A^k_t, k) + \mathcal{N}(0, \sigma^2 I)\big)$，重复 $K$ 次得到 $A^0_t$。

**多峰从哪来**（4.1 节）：每次采样从不同的高斯噪声出发，每一步还加随机扰动，样本会落进不同的峰，而不是落在均值上。

**为什么训练稳**（4.4 节）：$\varepsilon_\theta(a, o) \approx -\nabla_a \log p(a \mid o)$，而 $\nabla_a \log Z(o,\theta) = 0$（式 8），训练和推理都不用估计归一化常数，不像 IBC 那样依赖负样本。

</details>

### 视觉条件与 FiLM

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：观测只做条件、特征每次推理算一遍；ResNet-18 的两处改动；CNN（FiLM）与 Transformer（交叉注意力）两种骨干</summary>

**观测只做条件**：学 $p(A_t \mid O_t)$，而不是 Diffuser 做规划时的联合分布 $p(A_t, O_t)$。图像特征每次推理只算一遍，$K$ 步去噪都复用，推理快得多，视觉编码器也能端到端一起训练（2.3 节）。官方 rollout 喂最近 $T_o = 2$ 帧（`n_obs_steps = 2`），不是单张图；附录图 14：看图像的策略 1 帧不够、帧数多了反而下降。

**视觉编码器**（3.2 节）：从头训练的 ResNet-18，每个相机一个；全局平均池化换成空间 softmax（保留位置），BatchNorm 换成 GroupNorm（才能配合 EMA 权重）。表 5（Square）：ViT 从头训只有 22%，冻结预训练特征效果差，用小 10 倍学习率微调 CLIP ViT-B/16 最好（98%）。

两种去噪骨干（3.1 节）：

- **CNN-based + FiLM**：1D 时序卷积 UNet，每层卷积按通道做 $\gamma(O_t, k) \odot h + \beta(O_t, k)$。开箱即用、少调参，但动作变化快时（如速度控制）会被卷积平滑掉。
- **Transformer-based**：带噪动作作为 token，扩散步 $k$ 作第一个 token，因果注意力；观测经 MLP 后用交叉注意力读入。复杂、变化快的任务上往往最好，但对超参更敏感。论文建议新任务先试 CNN 版。

</details>

### 网络结构与 DDIM 加速

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：训练 100 步，DDIM 推理 10 步（RTX 3080 上 0.1 s）；真机配置 16 步</summary>

- 训练时扩散步数是 **100**（附录表 7），噪声表用 iDDPM 的平方余弦（3.3 节）。
- **DDIM** 把训练和推理的步数解耦（3.4 节）：真机实验里「训练 100 步、推理 10 步」，在 RTX 3080 上一次推理 **0.1 s**，即 $100 / 10 = 10\times$。
- 附录表 7 的真机配置写的是推理 **16 步**（官方 `eval_real_robot.py` 也是 `num_inference_steps = 16`）；仿真基准则没有用 DDIM，用 iDDPM 推理同样 100 步（附录 A.4）。
- 真机 Push-T 里策略以 10 Hz 出指令，再线性插值到 125 Hz 交给 UR5。
- 局限一节也承认：推理比 LSTM-GMM 慢，一次出一段动作能缓解，但还不够做高频控制。

</details>

### 📊 条件扩散策略与 RHC 执行流程

<div class="mermaid">
flowchart TB
    O["视觉观测 O"] --> Enc["视觉编码器"]
    Enc --> Cond["条件特征"]
    Cond --> S0["从高斯噪声初始化<br/>动作序列 A_K"]
    S0 --> Denoise["K 步去噪 ε_θ<br/>预测噪声 ε"]
    Denoise --> Ak["干净动作序列 A_0<br/>长度 H chunk"]
    Ak --> RHC["RHC：执行 T_a 步<br/>带新观测再规划"]
    RHC --> Exec["发送到机器人"]
    Exec --> O
</div>

下面这个演示真的在浏览器里跑 DDIM（数据分布是两条演示 + 高斯抖动的简化模型）：拖动步数滑块，看长度 16 的动作 chunk 怎么从一团高斯噪声收敛成一条平滑轨迹。注意**整条 chunk 是一起锁定模式的**——这正是 action chunking 除了「预测得远」之外的另一半价值：

<div class="paper-demo" data-demo="dp-denoise" id="dp-denoise-demo"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## 🚶 具体实例

<div class="mermaid">
flowchart TB
    O["观测：最近 2 帧 × 2 路相机 + 末端位置"] --> D["DDIM 16 步去噪 → 16 步动作"]
    D --> X["执行其中 6 步（10 Hz → 插值 125 Hz）"]
    X --> O
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：真机 Push-T 的一次推理：观测 / 去噪 / 切出执行段 / 成功率</summary>

以论文的真机 Push-T 为例（UR5，附录表 7 与官方 `eval_real_robot.py`）：

- **观测**：最近 $T_o = 2$ 帧，2 路相机 320×240（训练时随机裁成 288×216）+ 末端位置；动作是 2 维的末端目标位置。
- **去噪**：从高斯噪声出发，DDIM 走 16 步，得到 $T_p = 16$ 步的动作序列；论文 3.4 节的同类设置（10 步）在 RTX 3080 上是 **0.1 s**。
- **切出执行段**：官方 `predict_action` 里 `start = To - 1`，这 16 步从上一帧观测的时刻排起——仿真默认 $T_a = 8$ 时就是 $16 = 1 + 8 + 7$：过去 1 步、执行 8 步、丢掉 7 步；真机 Push-T 用 $T_a = 6$（`--steps_per_inference 6`）。
- **执行**：10 Hz 出指令，线性插值到 125 Hz 交给机械臂，执行完再带着新观测规划。
- **结果**（表 6）：20 次里成功率 **95%**（最好的 LSTM-GMM 20%、IBC 0%），终态 IoU 0.80，人类演示是 0.84。

</details>

「预测 16 步、执行 8 步」这个配置背后是一个取舍（论文图 5：多数任务的最佳点是 8 步）。拖动 $T_a$，看反应延迟和推理开销怎么此消彼长（简化模型，只画调度关系）：

<div class="paper-demo" data-demo="dp-rhc" id="dp-rhc-demo"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## 🤖 工程价值

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：4 个基准 15 个任务、仿真平均 +46.9%，真机 Push-T 95%；位置控制更合适；局限</summary>

- **定量结果**：扩展版在 4 个基准、15 个任务上评测（RSS 2023 版是 12 个任务）；仿真基准（表 1、2、4）上相对之前最好的方法平均提升 **46.9%**；子目标顺序随意的任务差距更大：Block Push $p_2$ +32%、Kitchen $p_4$ +213%。
- **真机**：Push-T 成功率 **95%**（LSTM-GMM 20%、IBC 0%），翻杯子 90%（20 次），倒酱 / 抹酱 0.74 / 0.77（人类 0.79 / 0.79）；扩展版再加 3 个双臂任务（打蛋器 55% 等）。
- **位置控制**（4.2 节、图 4）：换成位置控制，Diffusion Policy 成功率上升，LSTM-GMM、BET 反而下降；位置控制误差不累积，模拟延迟 ≤ 4 步性能基本不掉（图 5 右）。
- **输入**：RGB 图像 + 本体（末端位姿、夹爪宽度），也有只用状态 / 关键点的版本；论文没有用深度图。
- **局限**（论文自述）：继承行为克隆的局限，演示不够就学不好；算力与推理延迟高于 LSTM-GMM。
- **影响**（笔记的判断）：后续很多机器人模仿学习工作拿它当基线或起点。

</details>

---

## 📁 官方源码对照

Diffusion Policy **不在 MimicKit 内**；官方实现为 [real-stanford/diffusion_policy](https://github.com/real-stanford/diffusion_policy)（原 columbia-ai-robotics/diffusion_policy，GitHub 会重定向）。

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：UNet / FiLM / Transformer / predict_action / EMA 与论文概念的对照表</summary>

| 论文概念 | 官方路径 | 说明 |
|----------|----------|------|
| 条件去噪 UNet（1D 时序）+ FiLM | `diffusion_policy/model/diffusion/conditional_unet1d.py` | `ConditionalResidualBlock1D`：`cond_predict_scale=True` 时由条件算出每通道 `scale` / `bias`，`out = scale * out + bias` |
| Transformer 变体 | `diffusion_policy/model/diffusion/transformer_for_diffusion.py` | 带噪动作作 token，交叉注意力读观测 |
| 图像策略 + 切出执行段 | `diffusion_policy/policy/diffusion_unet_hybrid_image_policy.py` | `predict_action`：`start = To - 1`，`end = start + n_action_steps`，从 16 步里切出执行的 8 步 |
| 默认配置 | `image_pusht_diffusion_policy_cnn.yaml` | `horizon: 16`、`n_obs_steps: 2`、`n_action_steps: 8`、`num_train_timesteps: 100`、`beta_schedule: squaredcos_cap_v2`、`prediction_type: epsilon` |
| EMA | `diffusion_policy/model/diffusion/ema_model.py` | 训练时维护影子权重，评估加载 `ema_model` |
| 真机推理 | `eval_real_robot.py` | `num_inference_steps = 16`（DDIM）、`--steps_per_inference 6`、10 Hz |

</details>

<h3 id="源码运行时序图">源码运行时序图</h3>

官方仓库训练入口是 `train.py`（Hydra 按 `--config-name` 实例化对应 Workspace），评估入口是 `eval.py`。训练与推理（RHC 滚动执行）的时序如下：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant T as train.py / eval.py<br/>(Hydra)
    participant W as Workspace<br/>(TrainDiffusionUnetImageWorkspace)
    participant DL as ReplayBuffer +<br/>SequenceSampler
    participant P as DiffusionUnetImagePolicy<br/>(视觉编码器 + ConditionalUnet1D)
    participant ER as EnvRunner<br/>(仿真/真机环境)
    Note over U,ER: 训练（train.py --config-name=image_pusht_diffusion_policy_cnn.yaml）
    U->>T: python train.py --config-name=... training.seed=42
    T->>W: hydra 实例化 Workspace → workspace.run()
    loop 每个 epoch
        W->>DL: 采样 batch：obs 序列 + 长度 H 的动作 chunk A₀
        W->>P: 视觉编码器提取 obs 特征（FiLM 条件）
        W->>P: 随机采样扩散步 k，加噪 A₀ → A_k
        P-->>W: ConditionalUnet1D 预测噪声 ε̂ → MSE(ε̂, ε) 反向传播
        W->>W: EMA 更新影子权重
        W->>ER: 定期 env_runner.run()：整段 rollout 评估成功率
        W->>W: save_checkpoint()
    end
    Note over U,ER: 推理 / RHC 滚动执行（eval.py --checkpoint ...）
    U->>T: python eval.py --checkpoint ... --output_dir ...
    T->>ER: 加载 EMA 权重 → env_runner.run()
    loop 每个控制周期
        ER-->>P: 最近 n_obs_steps=2 帧观测
        P->>P: 从高斯噪声初始化动作 chunk A_K
        loop 去噪 K 步（仿真 DDPM 100 步；真机 DDIM 16 步）
            P->>P: ε̂ = UNet(A_k, k, obs 特征) → A_(k−1)
        end
        P->>P: 切出 start = To−1 起的 n_action_steps 步
        P-->>ER: 执行段（仿真 8 步 / 真机 6 步）
        ER-->>P: 新观测 → 滑动窗口重新预测
    end
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：训练学的是预测噪声，推理用 DDIM + RHC 滚动执行</summary>

- 训练阶段的核心就是 ⑤–⑥：不回归动作本身，而是学"从加噪 chunk 里预测噪声"；EMA（⑦）是复现成功率的关键工程细节。
- 推理阶段对应上文 RHC 流程图：⑬–⑮ 从噪声走 $K$ 步去噪（仿真基准用 iDDPM 推理 100 步，真机用 DDIM 16 步；3.4 节的 10 步在 RTX 3080 上是 0.1 s），⑯ 从 `start = To - 1` 切出执行段——默认 $16 = 1 + 8 + 7$：过去 1 步、执行 8 步、丢掉 7 步，⑰–⑱ 执行完带着新观测再规划，兼顾平滑与反应速度。

</details>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：MimicKit 没有接入 Columbia Diffusion Policy</summary>

<h3 id="mimickit-关系">MimicKit 关系</h3>

> ❌ MimicKit 面向物理仿真 RL 与运动模仿（PPO/AMP/ASE 等），**未集成视觉-运动扩散策略**。MimicKit 仓库中有 `mimickit/learning/tinymdm/` 子目录，属于另一套运动扩散实验，**不是** Columbia Diffusion Policy 实现。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：多模态 / 预测噪声还是动作 / 和 ACT 的差别</summary>

1. **为什么扩散模型擅长处理多模态？**
   - 它不回归均值，而是学得分函数 $\nabla_a \log p(a \mid o)$（式 8）；每次采样从不同的高斯噪声出发、每步再加随机扰动，样本会落进不同的峰（4.1 节）。
2. **预测噪声还是预测动作？**
   - 论文和官方配置都预测噪声 $\varepsilon$（`prediction_type: epsilon`）；预测噪声也正对应得分函数，训练不需要能量模型那样的归一化常数。
3. **Diffusion Policy vs ACT (Action Chunking Transformer)？**
   - ACT 侧重于 CVAE 框架，而 Diffusion Policy 利用扩散过程提供了更强的表达能力和训练稳定性。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：与路线图的关系、参考来源</summary>

<h3 id="a-与路线图的关系">A. 与路线图的关系</h3>

| 论文 | 关系 |
|------|------|
| **Diffusion Policy (2023)** | 扩散 + 控制主线的**起点** |
| BeyondMimic (2025) | 扩散控制在人形机器人全身动态运动上的突破性应用 |

<h3 id="b-参考来源">B. 参考来源</h3>

- [arXiv:2303.04137](https://arxiv.org/abs/2303.04137)
- [Project Website](https://diffusion-policy.cs.columbia.edu/)

</details>
