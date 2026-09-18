---
layout: paper
paper_order: 1
title: "RoboStriker: Hierarchical Decision-Making for Autonomous Humanoid Boxing"
zhname: "RoboStriker：用潜空间神经虚拟自博弈实现自主人形拳击对抗"
category: "Loco-Manipulation and WBC"
---

# RoboStriker: Hierarchical Decision-Making for Autonomous Humanoid Boxing
**RoboStriker：把"打拳"拆成"动作技能 + 潜空间策略博弈"，让 Unitree G1 在零和对抗里学会自主出拳**

> 📅 阅读日期: 2026-05-22
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 双人零和博弈 · 自博弈 · 拳击对抗 · 潜空间动作
>
> 🔁 推进轨: 模块轮转（14_Human_Motion → **04_Loco-Manipulation_and_WBC**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2601.22517](https://arxiv.org/abs/2601.22517) |
| HTML | [arXiv HTML](https://arxiv.org/html/2601.22517v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2601.22517) |
| 项目主页 | [yinkangning0124.github.io/RoboStriker](https://yinkangning0124.github.io/RoboStriker/) |
| **发布时间** | 2026-01-30 (arXiv) |
| 源码 | [yinkangning0124/RoboStriker-Preview](https://github.com/yinkangning0124/RoboStriker-Preview)（已开源 · MIT；作者预览版） |
| 相关源码（动作重定向） | [YanjieZe/GMR](https://github.com/YanjieZe/GMR)（论文采用的 General Motion Retargeting） |
| 作者 | Kangning Yin, Zhe Cao, Wentao Dong, Weishuai Zeng, Tianyi Zhang, Qiang Zhang, Jingbo Wang, Jiangmiao Pang, Ming Zhou, Weinan Zhang |
| 机构 | 上海交通大学、上海人工智能实验室（OpenRobotLab / Jiangmiao Pang） |
| 提交日期 | 2026-01-30 |
| 评测平台 | Unitree G1（29 DoF）+ Isaac Lab（4096 并行环境） |

---

## 🎯 一句话总结

> RoboStriker 把"两个人形机器人互殴"建成 **两玩家零和马尔可夫博弈**，先用单智能体追真人拳击 MoCap 训出 **运动跟踪器**（46 段、约 14 分钟 Xsens 数据，经 GMR 重定向到 Unitree G1），再把这些技能蒸馏成一个 **投到单位超球面的潜空间动作流形**，最后在这个潜空间上跑 **Latent-Space Neural Fictitious Self-Play (LS-NFSP)**，让两个智能体只挑"高层动作意图"而不直接挑电机指令——动作天然物理可行又像人，多智能体训练也稳定收敛。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| LS-NFSP | Latent-Space Neural Fictitious Self-Play | 潜空间神经虚拟自博弈，本文核心算法 |
| NFSP | Neural Fictitious Self-Play | 经典 imperfect-info 博弈算法，对手策略用历史平均策略 |
| WBC | Whole-Body Control | 全身控制 |
| MoCap | Motion Capture | 人体动作捕捉，本文用 Xsens 录 46 段拳击 |
| GMR | General Motion Retargeting | 通用人体→人形机器人动作重定向 |
| Sim-to-Real | Simulation to Real-world | 仿真到真机的迁移 |
| Zero-sum Game | — | 一方所得即另一方所失（你打中我我就掉血） |
| Isaac Lab | — | NVIDIA Omniverse 上的强化学习仿真平台 |

---

## ❓ 论文要解决什么问题？

让人形机器人真正"打拳击"远比"打沙袋"难，本质瓶颈有三：

1. **多智能体训练发散**：两个 29 DoF 人形机器人直接在电机空间里互打、互学，状态-动作空间巨大，自博弈的梯度极不稳定，常常一边训成"傻站着"另一边训成"乱挥手"。
2. **动作既要物理可行又要像人**：电机空间里的随机探索很容易输出"反人类"的扭曲动作；而拳击是观赏性项目，姿态垮掉就不能用。
3. **策略要会"战术"，不只是会"出拳"**：除了基本攻击技能，还得学会进攻 / 防守 / 闪避 / 反击的时序选择，简单 reward shaping 很难直接学到这种长时序对抗策略。

RoboStriker 给出的答案是：**把动作生成和战术决策分层解耦——动作交给"经过 MoCap 训出来的潜空间解码器"保证物理与拟人性，战术放在"潜空间高层动作"上做零和自博弈**。

---

## 🔧 方法详解：三阶段流水线

### 阶段 I：单智能体运动跟踪（Motion Learning）

- **数据**：用 Xsens 系统录了 **46 段、≈14 分钟、50 Hz** 的真人专业拳击动作（直拳 / 勾拳 / 摆拳 / 闪避 / 步伐等）。
- **重定向**：按 **GMR (General Motion Retargeting)** 框架把人体动作迁到 Unitree G1（29 DoF）。
- **训练**：在 Isaac Lab（NVIDIA Omniverse 平台）上以 **4096 并行环境**、物理 **200 Hz** / 控制 **50 Hz** 训一个**单智能体追踪策略**，专门追这些重定向后的拳击参考动作。
- **产物**：一个底层电机执行器 $\pi _ {\text{low}}$，输入"潜空间动作意图 + 本体感知"，输出关节指令；保证任何被解码出来的高层意图都对应一个**物理合法、人类风格**的真实拳击动作。

### 阶段 II：技能蒸馏到潜空间（Skill Distillation）

- 把阶段 I 的技能压成 **结构化的潜空间流形**：用一个高斯参数化的隐变量分布表达"所有可执行的拳击意图"。
- 关键正则：将高斯分布**投影到单位超球面（unit hypersphere）**，从拓扑上把探索约束在"已经被人类验证物理可行"的子流形里——后续高层策略再怎么乱探，也不会跳出 MoCap 覆盖的动作空间。
- 此时的潜空间向量 $z \in \mathbb{S}^{d-1}$（单位球面）就是"高层动作意图"，由共享的**专家运动解码器**翻译回真实关节指令。

### 阶段 III：潜空间零和自博弈（LS-NFSP）

把两个人形机器人之间的拳击形式化为 **两玩家零和马尔可夫博弈**：

- **状态**：双方机器人的本体感知 + 相对位置 / 朝向。
- **动作空间**：阶段 II 的潜空间 $z$，而不是 29 DoF 电机！
- **奖励**：击中对手得正，被对手击中得负，零和。
- **算法**：**Latent-Space Neural Fictitious Self-Play (LS-NFSP)**
  - **NFSP**：每个智能体维护一个 best-response 策略 + 一个"过去策略的平均"作为对手观测目标，从博弈论上能收敛到近似纳什均衡。
  - **Latent-Space**：把 NFSP 搬到潜空间执行——智能体只挑高层意图，电机层动作天然可行，多智能体训练的梯度噪声大幅下降，收敛稳定性显著提升。
- 训练前还有一个 **行为预热（behavioral warmup）** 阶段，让两位选手先在简单对手 / 课程奖励下学会基本接近、出拳等行为，再切到完整自博弈。

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph S1["阶段 I · 单智能体运动学习"]
        D1["真人拳击 MoCap<br/>Xsens · 46 段 / 14 min / 50 Hz"]
        D2["GMR 重定向到 Unitree G1<br/>(29 DoF)"]
        D3["Isaac Lab 4096 并行环境<br/>物理 200Hz / 控制 50Hz"]
        D4["低层运动跟踪器 π_low<br/>(MoCap → 关节指令)"]
        D1 --> D2 --> D3 --> D4
    end

    subgraph S2["阶段 II · 技能蒸馏 → 潜空间"]
        D4 --> E1["蒸馏出技能潜空间"]
        E1 --> E2["高斯参数化分布<br/>投影到单位超球面 S^(d-1)"]
        E2 --> E3["共享专家运动解码器<br/>z → 物理合法 + 拟人动作"]
    end

    subgraph S3["阶段 III · 潜空间零和自博弈 LS-NFSP"]
        E3 --> F1["行为预热<br/>(简单对手 / 课程奖励)"]
        F1 --> F2["两玩家零和马尔可夫博弈<br/>动作空间 = 潜空间 z"]
        F2 --> F3["NFSP: best-response + 历史平均策略"]
        F3 --> F4["稳定收敛 → 近似纳什均衡"]
    end

    F4 --> G["仿真对抗实验<br/>+ Sim-to-Real 真机展示"]

    style S1 fill:#e8f4fd,stroke:#1f78b4
    style S2 fill:#fdebd0,stroke:#e67e22
    style S3 fill:#e8f8e8,stroke:#27ae60
    style G fill:#fceae8,stroke:#c0392b
</div>

---

## 💡 核心贡献

| 创新 | 描述 |
|---|---|
| **拳击=两玩家零和博弈** | 首次把人形机器人对抗拳击形式化为零和马尔可夫博弈并端到端训练 |
| **潜空间动作 + 单位球面约束** | 高斯分布投影到 $\mathbb{S}^{d-1}$，从拓扑上锁住"物理合法+像人"的探索空间 |
| **LS-NFSP** | 在潜空间上跑 NFSP，比直接在电机空间自博弈的训练稳定性大幅提升 |
| **行为预热 → 完整对抗** | 用课程化的 warmup 缓解 NFSP 早期对手不稳定带来的崩溃 |
| **真人 MoCap → 真机迁移** | 46 段 14 分钟的拳击 MoCap 经 GMR 重定向后即可驱动整个上下游流水线，Unitree G1 真机展示 sim-to-real |

---

## 📊 实验亮点

- **平台**：Unitree G1（29 DoF）
- **仿真**：Isaac Lab @ NVIDIA Omniverse，**4096 并行环境**，物理 200 Hz / 控制 50 Hz
- **数据**：46 段真人拳击 MoCap（Xsens，50 Hz，≈14 min）
- **基线对比**：相对在原始电机空间做自博弈 / 单纯运动追踪的基线，RoboStriker 在 **对抗胜率、收敛稳定性、姿态自然度** 三项均显著占优。
- **Sim-to-Real**：仿真训出的策略可迁到真机 Unitree G1 上展示拳击对抗行为。

---

## 🤖 对人形机器人领域的意义

| 影响方向 | 说明 |
|---|---|
| **对抗类技能** | 给"竞技格斗 / 体育对抗"类任务提供了一条可复制的训练范式（MoCap → 潜空间 → 零和自博弈） |
| **多智能体 RL 稳定化** | LS-NFSP 的"动作空间放在潜空间"思路可直接复用到双机协作 / 编队 / 对抗等任务 |
| **保留人类风格** | 单位超球面约束的潜空间是个非常优雅的"动作合法性护栏"，适用于任何"风格至关重要"的人形控制任务 |
| **赛事应用** | 朝着"人形机器人擂台赛 / 表演赛"这种工业-娱乐复合场景又靠近一步 |

---

## 🎤 面试参考

**Q：为什么不直接在电机空间做自博弈？**
A：29 DoF 双机互打的联合动作空间太大、奖励信号稀疏，自博弈的对手分布漂移会让梯度极不稳定，常见结局是策略退化到"傻站着"或者输出反人类抖动。RoboStriker 把动作空间换成"已经被人类 MoCap 验证可行"的潜空间，等于先用模仿学习把可行区域压成一个低维流形，再在这个流形上做对抗，训练就稳了。

**Q：投影到单位超球面有什么用？**
A：把高斯分布的均值-方差表达投到 $\mathbb{S}^{d-1}$ 等价于在拓扑上限制潜空间动作只能在一个紧致流形上变化，避免高层策略输出"远离 MoCap 分布"的潜变量去解码出诡异动作。直觉上类似 NLP 里把 token embedding 归一化到球面，让相似动作距离更稳定。

**Q：和 ASE / PULSE 这类"风格化潜空间"工作的区别？**
A：ASE / PULSE 等主要解决"如何把多种动作技能压成可复用 latent"，对应 RoboStriker 的阶段 II；RoboStriker 真正的贡献在阶段 III——它把这个潜空间作为多智能体零和博弈的动作空间来用，并配上 NFSP 的对手平均策略机制，去解决"稳定学到对抗战术"这个新问题。

**Q：为什么要 behavioral warmup？**
A：NFSP 在早期对手策略很差（还没学到打拳），如果直接进零和对抗，胜率信号几乎全是噪声，两个策略都学不到东西。warmup 用课程化的简单奖励（比如接近对手、出拳）先把基本行为种下去，再切到完整 NFSP 自博弈，能显著缩短磨合期。

---

## 🔬 源码解读

> 官方代码已开源（作者预览版）：[yinkangning0124/RoboStriker-Preview](https://github.com/yinkangning0124/RoboStriker-Preview)（MIT），基于 **Isaac Lab v2.1.0 + Isaac Sim 4.5.0 + Python 3.10**，沿用 `rsl_rl` 强化学习工作流。仓库标题为 "RoboStriker Code"，三阶段架构与论文一致（README 未直接印 arXiv 号，但作者身份 + 完全一致的分阶段流水线 + 项目页链接可确认对应 2601.22517）。

**目录结构**

| 路径 | 内容 |
|---|---|
| `source/whole_body_tracking/` | 核心库：运动跟踪、潜空间、对抗环境 |
| `scripts/rsl_rl/` | 入口：`train.py` / `play.py`，以及多智能体 `run_marl_env.py` / `play_selfplay.py` |
| `logs/.../stage3/combat/` | 预训练的 Stage-3 combat checkpoint |
| `pyproject.toml` `LICENCE` | 安装配置与 MIT 许可证 |

**实现要点**

- 三阶段命令逐一对应论文方法：**Stage 1** 单智能体运动跟踪（任务 `Tracking-Flat-G1-v0`）；**Stage 2** 蒸馏到潜空间（`Tracking-Flat-G1-v0-stage2-latent`）；**Stage 3** 在潜空间上做对抗——先 `sandbag warmup`（对应论文的 behavioral warmup），再切 `CombatSandbag-Stage3-SMPLOLYMPICRewards` 的 LS-NFSP 自博弈。
- 每个阶段都暴露独立的 `train` 与 `play` 命令，多智能体自博弈用 `run_marl_env.py` / `play_selfplay.py` 驱动，体现"两玩家零和马尔可夫博弈"的训练循环。
- 仓库内置 Stage-3 checkpoint，配合从 Google Drive 单独下载的 **motion 数据与资产**（放入 `whole_body_tracking/` 目录），即可直接跑通拳击对抗策略。
- 作者注明这是初步预览版、仍在整理，后续会有更规范版本——复现时以当前 README 步骤为准。

---

## 💬 讨论记录

> 此部分在阅读讨论后更新
