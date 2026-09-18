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
| **作者** | Zhengyi Luo, Jinkun Cao, Alexander Winkler, Jessica Hodgins, Weipeng Xu, Kris Kitani |
| **机构** | CMU / Meta Reality Labs |
| **发布时间** | 2023-10 (arXiv), 2024-05 (ICLR) |
| **项目主页** | [PULSE Project Page](https://zhengyiluo.github.io/projects/pulse/) |
| **代码** | [GitHub - ZhengyiLuo/PULSE](https://github.com/ZhengyiLuo/PULSE) |

---

## 🎯 一句话总结

> PULSE 通过 Variational Information Bottleneck (VIB) 将大规模 AMASS 动作集压缩进一个 32 维的通用物理潜空间，使下游任务能以即插即用的方式调用多样化的人形技能。

> 🎮 **本文内嵌 1 段动画 + 3 个可交互演示**（不用装任何东西）：
> 1. [六幕动画：PULSE 全流程](#pulse-explainer-anim) —— 约 85 秒串完「缺一个通用表示 → 阶段 1 大规模模仿 → 阶段 2 VIB 瓶颈 → 本体感受先验 → 阶段 3 下游只搜 32 维 → 闭环与源码落点」
> 2. VIB 实验台 —— 拖 $\beta$，看潜空间在「把 AMASS 背下来」和「posterior collapse」之间怎么取舍
> 3. 本体感受先验实验台 —— 换身体状态，看固定的 $\mathcal{N}(0, I)$ 采出来的 $z$ 有多少这一步根本执行不了
> 4. 下游任务实验台 —— 32 维潜空间与 69 维关节空间的学习曲线并排，顺便看残差拉太大会发生什么

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

> 📖 **动画之后的正文默认全部折叠**：前半部分（「要解决什么问题」「方法详解」「具体实例」）按小节收起，后面的工程价值、源码对照、面试问题与附录整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图、三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。

---

## ❓ PULSE 要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：覆盖率不足 / 规模怎么压 / 下游要免重训</summary>

PULSE 旨在构建人形控制的"基础模型"：
- **覆盖率不足**：之前的 ASE/CALM 虽然有 latent skill，但通常针对特定任务或较小数据集，难以覆盖人类全谱系动作。
- **通用性挑战**：如何将 AMASS 这种数万个动作片段的规模（覆盖人类 99.8% 的动作）压进一个统一且可控的潜空间？
- **下游适配**：如何让 high-level 策略在无需重新训练底层控制器的前提下，直接利用这个潜空间完成新任务？

</details>

---

## 🔧 方法详解

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两阶段学习框架与下游任务适配</summary>

PULSE 采用两阶段学习框架：
1. **第一阶段：大规模模仿 (Large-scale Imitation)**
   - 训练一个高保真运动模仿器，学习跟踪 AMASS 数据集中极其多样且无结构的动作。
2. **第二阶段：技能蒸馏与潜空间构建 (Distillation via VIB)**
   - 使用变分信息瓶颈将模仿器的技能蒸馏到一个概率潜空间。
   - 引入 **Proprioceptive Prior**（本体感受先验）：学习一个以当前状态（姿态、速度）为条件的先验分布，确保生成的动作在长时间序列下依然物理可行且稳定。
3. **下游任务适配**
   - High-level 策略只需在 32 维潜空间中进行采样/优化，即可驱动机器人执行地形导航、击打物体等任务。

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
| 本体感受先验 | `phc/learning/ar_prior.py` | 以当前状态为条件的先验 $p(z\|s)$ |
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
    participant PRI as 先验 p(z|s)<br/>(ar_prior.py)
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
        R->>R: 蒸馏损失 ‖a_student − a_teacher‖ + KL(q(z|s,ref) ‖ p(z|s))
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

- 阶段 2 对应表中 `humanoid_im_distill.py` + `ar_prior.py`：**教师出动作、学生带信息瓶颈地模仿**，KL 项把 latent 压向"本体感受先验"，保证长序列滚动不发散。
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
