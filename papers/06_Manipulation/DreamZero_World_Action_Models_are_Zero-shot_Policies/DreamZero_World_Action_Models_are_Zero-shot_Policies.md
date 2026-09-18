---
layout: paper
paper_order: 5
title: "DreamZero: World Action Models are Zero-shot Policies"
zhname: "DreamZero：世界-动作模型即零样本策略"
category: "Manipulation"
---

# DreamZero: World Action Models are Zero-shot Policies
**把 14B 视频扩散骨干改造成「同时做梦、同时动手」的世界-动作模型，真机零样本泛化超 SOTA VLA 2×**

> 📅 阅读日期: 2026-06-08
>
> 🏷️ 板块: 06 Manipulation · 世界-动作模型 (WAM) · 视频扩散 · 机器人基础模型
>
> 🔁 推进轨: 世界模型支线终点（DreamDojo → **DreamZero** → GR00T / BFM）
>
> ✅ 深度技术细节已填充

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.15922](https://arxiv.org/abs/2602.15922) |
| HTML | [arXiv HTML v1](https://arxiv.org/html/2602.15922v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2602.15922) |
| 项目主页 | [dreamzero0.github.io](https://dreamzero0.github.io/) |
| **发布时间** | 2026-02-17 (arXiv) |
| 源码 / 权重 | [dreamzero0/dreamzero](https://github.com/dreamzero0/dreamzero) |
| 机构 | NVIDIA（合作含 UC Berkeley、CMU 等） |
| 发表时间 | 2026-02 |
| 模型规模 | **14B** 自回归扩散 Transformer（基于 Wan 图像→视频预训练骨干） |
| 训练数据 | ~**500 h** 真实机器人异构轨迹（非重复示范为主） |
| 真机平台 | AgiBot G1 · YAM 等双臂操作机器人 |
| 控制频率 | 动作 chunk 48 步 @ 30 Hz（1.6 s/chunk）；闭环推理 **~7 Hz** |

---

## 🎯 一句话总结

> DreamZero 提出 **World Action Model (WAM)**：在预训练视频扩散骨干上**联合去噪未来视频与动作**，把动作学习从「状态-动作模仿」转成「对齐预测视觉未来」的逆动力学；因此能从**异构、非重复**机器人数据学到通才策略，在未见任务/环境上零样本泛化比 SOTA VLA **>2×**，并通过 DreamZero-Flash + 系统优化把 14B 扩散模型压到 **7 Hz 真机闭环**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| WAM | World Action Model | 世界-动作模型：联合预测未来世界状态（视频）与动作 |
| VLA | Vision-Language-Action | 视觉-语言-动作模型，多从静态 VLM 初始化 |
| IDM | Inverse Dynamics Model | 逆动力学：由未来观测反推动作 |
| DiT | Diffusion Transformer | 扩散 Transformer 主干 |
| CFG | Classifier-Free Guidance | 无分类器引导，需条件/无条件两次前向 |
| KV-cache | Key-Value Cache | 自回归推理缓存，避免重复计算历史 token |

---

## ❓ 论文要解决什么问题？

SOTA **VLA** 擅长语义泛化（换物体、换语言指令），但在**新环境**和**新物理动作/技能**上泛化弱：

| VLA 能做好 | VLA 做不好 |
|---|---|
| 「把可乐罐移到 Taylor Swift 海报旁」（靠 VLM 网络知识 + 已学 `move` 技能） | 「解开鞋带」（训练数据里没出现过该动作的精细时空模式） |
| 物体级、语义级迁移 | 几何、动力学、电机控制级的「怎么做」 |

根因：VLM 预训练在**静态图文**上，缺少**时空物理先验**；而机器人数据若只靠「每任务重复示范」，无法覆盖海量可能的接触与运动。

DreamZero 的切入点：**视频是「世界如何演化」的稠密表征**——每一对相邻帧都是监督信号。在 web-scale 视频预训练骨干上，**同时生成未来视频 + 动作**，继承物理动力学先验，并把动作对齐到「梦见的未来」。

---

## 🔧 方法详解

### 1. 问题形式化：联合分布 = 视频预测 × 逆动力学

给定语言指令 $\mathbf{c}$、本体状态 $\mathbf{q}_l$、历史观测 $\mathbf{o} _ {0:l}$，DreamZero 联合预测未来 $H$ 步视频与动作：

$$
\underbrace{\pi_\theta(\mathbf{o}_{l:l+H}, \mathbf{a}_{l:l+H} \mid \mathbf{o}_{0:l}, \mathbf{c}, \mathbf{q}_l)}_{\text{DreamZero}}
=
\underbrace{\pi_\theta(\mathbf{o}_{l:l+H} \mid \mathbf{o}_{0:l}, \mathbf{c}, \mathbf{q}_l)}_{\text{视频预测}}
\underbrace{\pi_\theta(\mathbf{a}_{l:l+H} \mid \mathbf{o}_{0:l+H}, \mathbf{q}_l)}_{\text{IDM}}
$$

与「先训视频模型 + 再训 IDM」的两段式不同，DreamZero **端到端单模型**联合去噪，强化视频-动作对齐。预训练视频骨干已学好通用视频预测，机器人侧主要补：**机器人 embodiment 视频** + **从生成视频提取动作**。

### 2. 模型架构（Figure 4）

| 模块 | 作用 |
|---|---|
| **VAE** | 编码视觉上下文 $\mathbf{o} _ {0:l}$ |
| **Text Encoder** | 编码语言 $\mathbf{c}$ |
| **State Encoder** | 编码本体 $\mathbf{q}_l$ |
| **自回归 DiT 主干** | Flow-matching 联合去噪视频潜变量与动作 |
| **Video / Action Decoder** | 分别解码未来帧与动作 chunk |

设计要点：

- **最小增量参数**：只加 state/action encoder-decoder，保留视频骨干泛化能力。
- **多视角**：多相机画面**拼成单帧**输入，不改骨干结构。
- **Chunk-wise 自回归**：每 chunk 含 $K$ 个潜帧，对齐动作 horizon；类似 LLM 处理变长 token。
- **仅视频自回归**：动作不做闭环自回归预测，避免误差传播；视频用 teacher forcing 训练。

### 3. Flow-Matching 训练目标

对 chunk $k$，共享去噪时间 $t_k \in [0,1]$，构造噪声插值：

$$
\mathbf{z}_{t_k}^k = t_k \mathbf{z}_1^k + (1-t_k)\mathbf{z}_0^k,\quad
\mathbf{a}_{t_k}^k = t_k \mathbf{a}_1^k + (1-t_k)\mathbf{a}_0^k
$$

其中 $\mathbf{z}_0, \mathbf{a}_0 \sim \mathcal{N}(0,I)$，$\mathbf{z}_1, \mathbf{a}_1$ 为干净潜视频与归一化动作。干净历史上下文 $\mathcal{C}_k = \{(\mathbf{z}_1^j, \mathbf{a}_1^j)\} _ {j=1}^{k-1}$。

联合速度目标：

$$
\mathcal{L}(\theta) = \mathbb{E}\left[\frac{1}{K}\sum_{k=1}^{K} w(t_k)\left\|\mathbf{u}_\theta([\mathbf{z}_{t_k}^k, \mathbf{a}_{t_k}^k]; \mathcal{C}_k, \mathbf{c}, \mathbf{q}_k, t_k) - \mathbf{v}^k\right\|^2\right]
$$

$\mathbf{v}^k := [\mathbf{z}_1^k, \mathbf{a}_1^k] - [\mathbf{z}_0^k, \mathbf{a}_0^k]$。与部分 WAM 不同，DreamZero **视频与动作共享 $t_k$** 以加速早期收敛；并对历史 chunk 用 **teacher forcing**（条件为干净上下文）。

### 4. 闭环推理：KV-cache + 真值观测回填

纯视频自回归会累积幻觉；DreamZero 利用**机器人闭环**优势：

1. 联合去噪当前 chunk 的视频 + 动作；
2. **执行动作 chunk**；
3. 用**真机新观测**替换 KV-cache 中预测帧；
4. 重复 → 消除开环视频漂移，同时保留视觉历史做有状态策略。

这是 WAM 相对「纯世界模型 rollout」的独特优势。

### 5. 实时执行：从 5.7 s/chunk 到 7 Hz

朴素单卡推理约 **5.7 s/chunk**（16 步扩散 × 14B DiT × 串行阻塞）。三层优化合计 **38× 加速**：

| 层级 | 技术 | 效果 |
|---|---|---|
| **执行范式** | 异步闭环：控制器持续执行最新 chunk，推理并行 | 约束从「推理完才能动」→「chunk 过期前推理完」 |
| **系统** | CFG 双卡并行（-47% 每步延迟）；DiT 速度缓存（16→4 有效步） | 吞吐提升 |
| **实现** | torch.compile + CUDA Graph；NVFP4 量化；cuDNN attention | 延迟降低 |
| **算法 DreamZero-Flash** | **解耦视频/动作噪声日程**：视频偏向高噪声 Beta 分布，动作保持均匀噪声 | 少步去噪下动作仍干净 |

目标：48 步 @ 30 Hz = 1.6 s/chunk → 推理 **<200 ms** → 实测约 **7 Hz** 动作 chunk 生成。

### 6. 数据与泛化洞见

- **异构非重复数据** > 同小时数的「多任务重复示范」——数据**多样性**比重复覆盖更重要。
- **更大预训练视频骨干** → 更高质量视频预测 → **直接转化为更好动作执行**（策略性能与视频生成质量强相关）。
- **自回归** > 双向扩散（后者常需降采样 FPS，损害视频-动作对齐）。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph IN["📥 输入"]
        OBS["历史观测 o₀:ₗ<br/>(VAE 编码)"]
        LANG["语言指令 c"]
        PROP["本体状态 qₗ"]
    end

    subgraph WAM["🌀 DreamZero · 14B 自回归 DiT"]
        FM["Flow-Matching<br/>联合去噪 z + a"]
        AR["Chunk-wise 自回归<br/>+ Teacher Forcing"]
        KV["KV-cache"]
    end

    subgraph OUT["📤 输出"]
        VID["未来视频 chunk"]
        ACT["动作 chunk aₗ:ₗ₊H"]
    end

    subgraph LOOP["🔁 真机闭环"]
        EXEC["执行动作 @ 30Hz"]
        GT["真值观测回填 cache"]
    end

    subgraph FLASH["⚡ DreamZero-Flash"]
        DS["解耦噪声日程"]
        SYS["CFG 并行 · DiT 缓存 · 量化"]
    end

    OBS --> FM
    LANG --> FM
    PROP --> FM
    AR --> FM
    FM --> VID
    FM --> ACT
    KV --> FM
    ACT --> EXEC
    EXEC --> GT
    GT --> KV
    DS --> FM
    SYS --> FM

    style IN fill:#e8f4fd,stroke:#1f78b4
    style WAM fill:#f3e8ff,stroke:#8e44ad
    style OUT fill:#e8f8e8,stroke:#27ae60
    style LOOP fill:#fff7e0,stroke:#d4a017
    style FLASH fill:#fce4ec,stroke:#c0392b
</div>

---

## 💡 核心贡献

1. **WAM 范式**：联合预测视频+动作，把「改进机器人能力」归结为「改进视频生成 + 对齐」。
2. **零样本泛化**：未见动词/动作/环境上，真机任务进度平均 **>2× SOTA VLA**；任务特定后训练后环境泛化仍 **+10%**。
3. **异构数据有效性**：~500 h 非重复真实轨迹即可训出通才策略，打破「每任务需大量重复 demo」惯例。
4. **跨本体迁移**：仅视频示范（人类 12 min / 异构机器人 20 min）→ 未见任务 **+42%** 相对提升；30 min play data 可 **few-shot 适配新 embodiment** 并保留零样本能力。
5. **38× 推理加速**：14B 扩散 WAM 首次达到 **7 Hz 真机闭环**；开源权重、推理与 RoboArena / PolaRiS / Genie Sim 3.0 评测代码。

---

## 📊 关键数据

| 维度 | 数值 |
|---|---|
| 参数量 | **14B** |
| 预训练骨干 | Wan 图像→视频扩散 |
| 机器人训练数据 | ~**500 h** 真实异构轨迹 |
| 零样本泛化 vs SOTA VLA | **>2×** 平均任务进度 |
| 跨本体视频-only 微调 | 10–20 min → **+42%** 未见任务 |
| Few-shot 新 embodiment | **30 min** play data（G1→YAM） |
| 朴素推理延迟 | ~5.7 s/chunk |
| 优化后 | **38× 加速 · ~7 Hz** |
| 动作 chunk | 48 步 @ 30 Hz（1.6 s） |
| 仿真零样本 | Genie Sim 3.0（100 任务，未用其 10k h 训练数据） |

---

## 🆚 WAM vs VLA vs 纯世界模型

| | VLA | 纯视频 WM（如 DreamDojo） | DreamZero (WAM) |
|---|---|---|---|
| 预训练先验 | 静态 VLM 语义 | 视频时空物理 | 视频时空物理 |
| 输出 | 动作 | 未来视频（动作需后处理） | **视频 + 动作联合** |
| 新技能泛化 | 弱（依赖见过 demo） | 强（生成）但非直接策略 | **强 + 直接可执行** |
| 闭环 | 原生 | 开环 rollout 易漂移 | **真值观测回填 cache** |
| 实时性 | 高 | 低（纯生成） | 中（7 Hz，需 Flash） |

---

## 🤖 对人形 / 通才机器人路线的意义

| 方向 | 含义 |
|---|---|
| **路线图顶点** | 从 PPO → 模仿 → 扩散 → 世界模型，WAM 是「世界模型直接当策略」的落地形态 |
| **GR00T 2 技术源头** | NVIDIA 称 GR00T 2 基于 DreamZero 研究，MolmoSpaces / RoboArena 榜单领先 |
| **数据经济学** | 不必为每个新动作采集重复 teleop；异构日常轨迹 + 视频先验即可 |
| **跨本体** | 人类/异构机器人**仅视频**即可给目标机注入新技能先验 |
| **与 DreamDojo 分工** | DreamDojo = 通用像素世界模型（人类视频预训练）；DreamZero = 联合动作、零样本策略 |

---

## ⚠️ 局限与开放问题

- **算力门槛**：14B + 多卡优化才能 7 Hz；边缘部署仍困难。
- **视频-动作绑定**：少步去噪必须靠 DreamZero-Flash 解耦噪声，否则动作质量掉。
- **记忆任务**：论文未专门评测/后训练需长期记忆的任务。
- **接触精细度**：像素扩散「看起来对」≠ 力学精确；高精度装配仍需谨慎。
- **人形全身**：论文主实验为双臂操作平台（G1/YAM），通用人形全身 WAM 仍待验证。

---

## 🎤 面试参考

**Q：WAM 和 VLA 的本质区别？**
A：VLA 从**静态 VLM** 接动作头，擅长语义但缺时空物理；WAM 从**视频扩散**出发，把动作学习变成「对齐我预测的视觉未来」的逆动力学，每一帧视频都是监督，因此更能泛化到新动作。

**Q：为什么联合训练比「视频模型 + IDM」两段式好？**
A：端到端共享去噪时间步与梯度，视频预测充当**隐式视觉规划器**，动作与「梦见的未来」深度对齐；两段式容易模态漂移。

**Q：闭环 KV-cache 回填为什么关键？**
A：纯自回归视频会累积幻觉；机器人每步有**真观测**，用其替换 cache 中预测帧，既保留 AR 效率又消除开环漂移——这是 WAM 相对纯生成模型的结构性优势。

**Q：DreamZero-Flash 做了什么？**
A：训练时**解耦视频与动作的噪声日程**——视频可保持高噪声、动作学「从嘈杂视觉上下文预测干净动作」，从而推理时可少步去噪而不损动作质量。

**Q：和 DreamDojo 的关系？**
A：DreamDojo 用人类视频 + LAM 训**通用世界模型**（预测未来像素）；DreamZero 在此基础上走向 **WAM**：同一扩散过程**同时出动作**，直接当零样本策略，并针对真机闭环做 38× 加速。

---

## 🔗 与路线图其他论文的关联

| 论文 | 关系 |
|---|---|
| [DreamDojo](../DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos/DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos.md) | 同 NVIDIA 线：DreamDojo 训 WM，DreamZero 升级为 WAM |
| [GR00T N1](../../03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.md) | VLA 代表；DreamZero 在未见动作上 >2× 泛化 |
| [BFM](../../03_High_Impact_Selection/Behavior_Foundation_Model_for_Humanoid_Robots/Behavior_Foundation_Model_for_Humanoid_Robots.md) | 路线图「行为基础模型」顶点，与 WAM 并列的通才策略路线 |
| [Diffusion Policy](../../01_Foundational_RL/Diffusion_Policy/Diffusion_Policy.md) | 扩散动作生成先驱；DreamZero 把扩散升到视频-动作联合 |
| [HumDex](../HumDex_Humanoid_Dexterous_Manipulation_Made_Easy/HumDex_Humanoid_Dexterous_Manipulation_Made_Easy.md) | 人类视频→机器人；DreamZero 用异构机器人视频做跨本体迁移 |

---

## 🔗 相关阅读

- 项目主页：[dreamzero0.github.io](https://dreamzero0.github.io/)
- 源码：[github.com/dreamzero0/dreamzero](https://github.com/dreamzero0/dreamzero)
- arXiv：[2602.15922](https://arxiv.org/abs/2602.15922)
- NVIDIA WAM 术语：[World Action Model Glossary](https://www.nvidia.com/en-us/glossary/world-action-model/)
- 评测：RoboArena · PolaRiS · Genie Sim 3.0
