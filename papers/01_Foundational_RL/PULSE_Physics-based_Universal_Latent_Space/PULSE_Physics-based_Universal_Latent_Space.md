---
layout: paper
paper_order: 9
title: "Universal Humanoid Motion Representations for Physics-Based Control (PULSE)"
category: "基础强化学习"
zhname: "PULSE：物理可行的通用潜在技能提取"
demos: ["pulse"]
---

# PULSE: Universal Humanoid Motion Representations for Physics-Based Control
**PULSE：物理可行的通用潜在技能提取**

> 📅 阅读日期: 2026-04-21
>
> 🏷️ 板块: 技能组合主线 · ASE → CALM → **PULSE**
>
> 🚧 本笔记已填充基本信息，深度技术细节待细化。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2310.04582](https://arxiv.org/abs/2310.04582) (ICLR 2024 Spotlight) |
| **PDF** | [Download](https://arxiv.org/pdf/2310.04582.pdf) |
| **作者** | Zhengyi Luo, Jinkun Cao, Josh Merel, Alexander Winkler, Jing Huang, Kris Kitani, Weipeng Xu |
| **机构** | Meta Reality Labs Research / CMU |
| **发布时间** | 2023-10 (arXiv), 2024-05 (ICLR) |
| **项目主页** | [PULSE Project Page](https://zhengyiluo.github.io/projects/pulse/) |
| **代码** | [GitHub - ZhengyiLuo/PULSE](https://github.com/ZhengyiLuo/PULSE) |

---

## 🎯 一句话总结

> PULSE 先训一个能跟住全部 AMASS（清洗后 11313 段、约 40 小时）的教师 PHC+，再用 Variational Information Bottleneck (VIB) 在线蒸馏出一个 32 维潜空间，并同时学一个以本体感受为条件的先验；下游任务冻结解码器与先验，只在先验均值上输出残差。

> 🎮 **本文内嵌 1 段动画 + 1 段配音视频 + 3 个可交互演示**（不用装任何东西）：
> 1. [六幕动画：PULSE 全流程](#pulse-explainer-anim) —— 约 90 秒串完「缺一个通用表示 → 阶段 1 大规模模仿 → 阶段 2 VIB 瓶颈 → 本体感受先验 → 阶段 3 下游只搜 32 维 → 闭环与源码落点」
> 2. [配音讲解视频](#pulse-video) —— 同样六幕，加中文配音与字幕，6 分 51 秒竖屏，可下载
> 3. VIB 实验台 —— 拖 $\beta$，看潜空间在「把 AMASS 背下来」和「posterior collapse」之间怎么取舍
> 4. 本体感受先验实验台 —— 换身体状态，看固定的 $\mathcal{N}(0, I)$ 采出来的 $z$ 有多少这一步根本执行不了
> 5. 下游任务实验台 —— 32 维潜空间与 69 维关节空间的学习曲线并排，顺便看残差拉太大会发生什么

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| PULSE | Physics-based Universal motion Latent SpacE | 物理通用的运动潜空间 |
| VIB | Variational Information Bottleneck | 变分信息瓶颈，用于压缩和提取核心特征 |
| AMASS | Archive of Motion Capture as Surface Shapes | 大规模人体动作捕捉数据集 |

---

## 🎬 六幕动画：PULSE 全流程 {#pulse-explainer-anim}

<div class="paper-demo" data-demo="pulse-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#pulse-video}

<div class="paper-demo" data-demo="pulse-video" data-src="media/pulse_explainer_video.mp4" data-poster="media/pulse_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/pulse_explainer_video.mp4" download="PULSE_讲解视频.mp4">下载 mp4（8.9 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：前半部分（「要解决什么问题」「方法详解」「具体实例」）按小节收起，后面的工程价值、源码对照、面试问题与附录整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图、三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。

---

## ❓ PULSE 要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：覆盖率不足 / 规模怎么压 / 下游要免重训</summary>

PULSE 旨在构建人形控制的"基础模型"：
- **覆盖率不足**：之前的 ASE/CALM 虽然有 latent skill，但通常针对特定任务或较小数据集，难以覆盖人类全谱系动作。
- **通用性挑战**：如何将 AMASS 这种规模（清洗后训练集 11313 段、测试集 138 段，约 40 小时）压进一个统一、且能从中采样的潜空间？论文把 ASE / CALM 也放到 AMASS 上训练，下游效果明显落后（图 4、表 2）。
- **下游适配**：如何让 high-level 策略在无需重新训练底层控制器的前提下，直接利用这个潜空间完成新任务？

</details>

---

## 🔧 方法详解

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两阶段学习框架与下游任务适配</summary>

PULSE 采用两阶段学习框架：
1. **第一阶段：大规模模仿 (Large-scale Imitation)**
   - 训练教师 **PHC+**（PHC 的改进版，4.1 节）：清掉穿模 / 跳帧的坏数据、改进渐进式难例训练、换 SiLU 和更大的 MLP，用 3 个基元 + 组合器在 AMASS 训练集上做到 100% 成功率（PHC 为 98.9%，表 1），并能跌倒后爬起。
   - 奖励为 $0.5\,r^{\text{imitation}} + 0.5\,r^{\text{amp}} + r^{\text{energy}}$（附录式 5），动作是 69 维 PD 目标。
2. **第二阶段：技能蒸馏与潜空间构建 (Online Distillation via VIB)**
   - 编码器 $q(z_t \mid s^p_t, s^g_t)$、解码器 $D(a_t \mid s^p_t, z_t)$、先验 $p(z_t \mid s^p_t)$ 三者一起训；DAgger 式在线蒸馏：学生滚出状态、教师 PHC+ 标注动作，不用 RL 目标（再混进 RL 目标，VR 跟踪成功率 93.4% → 71.0%，表 3）。
   - 损失（式 3）：$\mathcal{L} = \|a^{\text{PHC+}}_t - a_t\|^2 + \alpha \|\mu_t - \mu _ {t-1}\|^2 + \beta\,\mathrm{KL}(q \,\|\, p)$，$\alpha = 0.005$，$\beta$ 从 0.01 退火到 0.001（附录 C.1、表 4）。去掉平滑项，VR 跟踪成功率 93.4% → 60.8%。
   - 加了瓶颈，训练集成功率从 100% 降到 99.8%（表 1）：论文第 6 节说这是有损压缩。
   - **Proprioceptive Prior**（本体感受先验）：输入当前姿态与速度，输出 $z$ 的均值与方差。论文的理由是「站着不动和空中翻跟头的动作分布完全不同」；去掉可学先验，VR 跟踪 93.4% → 45.6%（表 3）。
3. **下游任务适配（4.3 节）**
   - 冻结解码器与先验，高层策略输出相对先验均值的 32 维残差：$a_t = D(\pi _ {\text{task}} + \mu^p_t)$（式 4），探索方差固定 0.22。不用残差、直接输出 $z$，VR 跟踪只有 18.1%（表 3）。
   - 任务：速度、伸手够点、击打、复杂地形轨迹跟随与 VR 三点跟踪。图 4 中 PULSE 在四个生成任务上回报都最高、收敛更快；从零训练回报最接近，但动作不像人。

</details>

第二阶段那个 KL 项前面的系数 $\beta$ 是整个方法的命门：太小，潜空间只是把 AMASS **背下来**；太大，后验塌成先验，latent 什么也没记住。下面这个实验台把这条 rate–distortion 曲线画了出来：

<div class="paper-demo" data-demo="pulse-vib"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 📊 PULSE 两阶段与下游调用流程

<div class="mermaid">
flowchart TB
    AMASS["AMASS 大规模动作"] --> M1["阶段1：模仿器<br/>跟踪多样动作"]
    M1 --> M2["阶段2：VIB 蒸馏<br/>32 维潜变量 z"]
    Prop["本体感受先验<br/>p(z#124;s)"] --> M2
    M2 --> Z["通用潜空间 Z"]
    Z --> HL["高层策略<br/>采样或优化 z"]
    HL --> Low["低层执行 / 跟踪器"]
    Low --> Robot["物理人形控制"]
</div>

而「本体感受先验」解决的是另一件事：**固定的 $\mathcal{N}(0, I)$ 不知道你此刻是站着还是在空中**。换个身体状态试试，看固定先验采出来的 $z$ 有多少在这一步根本执行不了——以及这个误差在长序列上怎么指数放大：

<div class="paper-demo" data-demo="pulse-prior"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## 🚶 具体实例

<div class="mermaid">
flowchart TB
  subgraph sample["随机采样 z"]
    Z1["z ~ p(z#124;s)"] --> M1["连贯动作：转圈/挥手/小跑"]
  end
  subgraph search["奖励引导"]
    R["任务奖励"] --> Z2["在 latent 搜索 z"]
    Z2 --> M2["击打等任务动作"]
  end
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：随机采样能采出连贯动作，给个奖励就能在 latent 里搜</summary>

通过 PULSE，用户可以：
- 从 latent space 中随机采样，机器人会自发产生连贯的人类动作（如转圈、挥手、小跑）。
- 给定一个简单的奖励函数（如"击打目标"），策略能快速学会在 latent 中寻找合适的动作序列。

</details>

「不再从零开始学怎么动」具体省了多少？下面这个演示把 32 维潜空间和 69 维关节空间的学习曲线放在一起，顺便看看高层残差拉太大时会发生什么：

<div class="paper-demo" data-demo="pulse-downstream"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## 🤖 工程价值

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（3 条）：学术地位 / 扩展性 / 效率</summary>

- **学术地位**：ICLR 2024 Spotlight，是人形机器人运动表示领域的重要里程碑。
- **扩展性**：其潜空间设计思想影响了后续如 OmniH2O 等多项全身控制与遥操作工作。
- **效率**：显著提升了复杂任务的训练速度，因为智能体不再从零开始学习"怎么动"，而是学习"何时用什么技能"。

</details>

---

## 📁 PULSE 官方源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（3 节）：论文概念 ↔ 官方路径对照表 / 源码运行时序图 / MimicKit 关系</summary>

PULSE **不在 MimicKit 内**，官方实现为独立仓库 [ZhengyiLuo/PULSE](https://github.com/ZhengyiLuo/PULSE)，代码基于 PHC/IsaacGym 栈扩展。

| 论文概念 | 官方路径 | 说明 |
|----------|----------|------|
| 大规模模仿（阶段 1） | `phc/env/tasks/humanoid_im.py` | 跟踪 AMASS 多样动作 |
| VIB 潜空间蒸馏（阶段 2） | `phc/env/tasks/humanoid_im_distill.py` | 将模仿器蒸馏到潜变量 |
| 潜空间策略网络 | `phc/learning/amp_network_z_builder.py` | 32 维 latent $z$ 的 actor-critic |
| 本体感受先验 | `phc/learning/amp_network_z_builder.py` 的 `compute_prior()` | 以当前状态为条件的先验 $p(z\|s)$（`z_prior` MLP 输出均值与 log 方差）；同目录的 `ar_prior.py` 只是一个未被调用的 AR(1) 辅助类 |
| 蒸馏损失与 $\beta$ 退火 | `phc/learning/amp_agent.py` 的 `_optimize_kin()` | 动作误差 + $\beta$·KL + 相邻帧 AR(1) 平滑项（`ar1_coefficient: 0.005`，见 `env_im_vae.yaml`） |
| 下游残差 | `phc/env/tasks/humanoid_z.py` | `action_z = prior_mu + action_z`，再交给冻结的解码器 |
| 下游任务配置 | `phc/data/cfg/learning/pulse_z_task.yaml` 等 | 击打、地形、VR 等任务 |

训练入口见仓库 `scripts/` 与 `phc/data/cfg/env/env_pulse_*.yaml`。

<h3 id="源码运行时序图">源码运行时序图</h3>

PULSE 复用 PHC 的代码栈，统一入口同样是 `phc/run_hydra.py`。README 给出的两条核心命令分别对应 **VIB 蒸馏**（阶段 2）和**下游任务训练**（阶段 3）；阶段 1 的模仿器直接使用训练好的 PHC 模型（`env.models=[phc_3, phc_comp_3]`）：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant R as run_hydra.py
    participant T as PHC 教师模仿器<br/>(冻结, humanoid_im)
    participant ENC as Encoder q(z|s, ref)
    participant PRI as 先验 p(z|s)<br/>(compute_prior)
    participant DEC as Decoder 低层策略
    participant S as IsaacGym 仿真
    Note over U,S: 阶段 2：VIB 蒸馏（env.task=HumanoidImDistillGetup env=env_im_vae learning=im_z_fit）
    U->>R: python phc/run_hydra.py env.task=HumanoidImDistillGetup env.models=[PHC 权重] env.motion_file=AMASS
    R->>T: 加载并冻结 PHC 教师（含 getup 恢复能力）
    loop 在线蒸馏（DAgger 式）
        S-->>ENC: 当前状态 s + 参考帧 ref
        ENC->>ENC: 采样 z ~ q(z|s, ref)（32 维）
        ENC->>DEC: z + s → 学生动作 a_student
        R->>T: 同一状态问教师 → a_teacher
        R->>R: 蒸馏损失 ‖a_student − a_teacher‖ + β·KL(q(z|s,ref) ‖ p(z|s)) + 相邻帧平滑项
        R->>PRI: 先验同步学习"当前状态下合理的 z 分布"
        DEC->>S: 学生动作驱动仿真，滚动收集新状态
    end
    Note over U,S: 阶段 3：下游任务（env.task=Humanoid*Z env=env_pulse_amp learning=pulse_z_task）
    U->>R: python phc/run_hydra.py env.task=HumanoidSpeedZ env.models=[pulse_vae 权重]
    R->>DEC: 冻结 Decoder + 先验，只训高层策略
    loop 每轮 rollout + PPO 更新
        S-->>R: 任务观测（目标速度 / 击打目标等）
        R->>PRI: 高层策略在 p(z|s) 基础上输出残差 → 得到 z
        PRI->>DEC: z + s → 动作
        DEC->>S: 仿真一步 → 任务奖励
        R->>R: PPO 只更新高层策略（32 维 z 空间，收敛远快于原始动作空间）
    end
</div>

- 阶段 2 对应表中 `humanoid_im_distill.py` + `amp_agent.py` + `compute_prior()`：**教师出动作、学生带信息瓶颈地模仿**，KL 项把 latent 压向"本体感受先验"，保证长序列滚动不发散。
- 阶段 3 对应 `amp_network_z_builder.py` + `pulse_z_task.yaml`：下游只在 32 维潜空间里探索，物理可行性由冻结的 Decoder 保底。

<h3 id="mimickit-关系">MimicKit 关系</h3>

> ❌ MimicKit 仅覆盖 ASE（`ase_agent.py`）等对抗潜空间方法，**未实现 PULSE 的 VIB 蒸馏与 proprioceptive prior**。读 PULSE 请直接用官方仓库；读 ASE 对照可用 MimicKit `docs/README_ASE.md`。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（2 问）：PULSE 与 ASE/CALM 的核心区别 / 为什么需要 VIB</summary>

1. **PULSE 与 ASE/CALM 的核心区别？**
   - ASE 是无方向的随机探索，CALM 增加了方向性条件，而 PULSE 追求的是覆盖全量数据的通用表示（Universal coverage）并引入了本体感受先验。
2. **为什么 PULSE 需要 VIB？**
   - VIB 能有效平衡潜空间的表达能力与压缩度，防止过拟合到特定动作片段，增强泛化性。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（2 节）：A. 与路线图其他论文的关联 / B. 参考来源</summary>

<h3 id="a-与路线图其他论文的关联">A. 与路线图其他论文的关联</h3>

| 论文 | 关系 |
|------|------|
| ASE | 提供对抗技能潜空间基础 |
| CALM | 引入条件引导，使潜空间可导向 |
| **PULSE** | 实现全量数据覆盖，构建通用的运动表示"基础" |

<h3 id="b-参考来源">B. 参考来源</h3>

- [arXiv:2310.04582](https://arxiv.org/abs/2310.04582)
- [Zhengyi Luo Project Page](https://zhengyiluo.github.io/projects/pulse/)

</details>
