---
layout: paper
paper_order: 9
title: "HoRD: Robust Humanoid Control via History-Conditioned Reinforcement Learning and Online Distillation"
zhname: "HoRD：历史条件 RL 与在线蒸馏的鲁棒人形控制"
category: "Locomotion"
---

# HoRD: Robust Humanoid Control via History-Conditioned Reinforcement Learning and Online Distillation
**HoRD：历史条件 RL 与在线蒸馏的鲁棒人形控制**

> 📅 阅读日期: 2026-06-14
>
> 🏷️ 板块: 05 Locomotion · 鲁棒控制 / 历史条件自适应 / 在线蒸馏 / 关键点观测 / 零样本迁移
>
> 🔁 推进轨: 模块轮转（04_WBC → **05_Locomotion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.04412](https://arxiv.org/abs/2602.04412) |
| HTML | [arXiv HTML v2](https://arxiv.org/html/2602.04412v2) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2602.04412) |
| 项目主页 | [tonywang-0517.github.io/hord](https://tonywang-0517.github.io/hord/) |
| **发布时间** | 2026-02-04 (arXiv) |
| 源码 | [hong-labs/hord](https://github.com/hong-labs/hord)（已开源 · MIT；模型/数据集见 HF [tony0517/HoRD](https://huggingface.co/tony0517)） |
| 平台 | Unitree G1 |
| 发表时间 | 2026-02 |

---

## 🎯 一句话总结

> 人形机器人对**动力学、任务设定、环境布置**的微小变化非常敏感，换个域往往性能骤降；HoRD 用**两阶段**配方解决：① 教师策略通过**历史条件 RL** 从近期 state-action 轨迹在线推断「隐式动力学上下文」，在大范围随机化动力学下自适应；② 通过**在线蒸馏**把教师的鲁棒控制能力转移给一个吃**稀疏 root-relative 3D 关节关键点轨迹**的 Transformer 学生策略——最终**单一策略零样本适配未见域、抗外部扰动**，无需逐域重训。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| HoRD | History-conditioned RL + Online Distillation | 本文方法名 |
| History-Conditioned | 历史条件 | 策略额外吃近期 state-action 历史，用以在线推断动力学 |
| Online Distillation | 在线蒸馏 | 教师与学生同时在环境中交互、实时把教师行为蒸到学生 |
| Keypoint | 关键点 | root-relative 的稀疏 3D 关节点，作为学生策略观测 |
| Domain Shift | 域偏移 | 动力学/任务/环境的变化，本文鲁棒性的攻击对象 |
| Zero-shot | 零样本 | 未见域直接部署，不再逐域微调 |

---

## ❓ 论文要解决什么问题？

1. 人形控制策略**泛化脆弱**：仿真里调好的策略，一旦真机的质量分布、摩擦、传动、任务目标或场景稍变，性能就明显掉，甚至失稳。
2. 传统做法靠**逐域重训 / 大量域随机化 + 显式系统辨识**，成本高且难以覆盖所有未见情况。
3. 直接用「特权信息教师 → 盲学生」蒸馏的经典 teacher-student 范式，学生往往**对分布外动力学不够鲁棒**，因为它没学到「如何根据历史自适应」。

**目标**：训出一个**单一**策略，能在**未见域 + 外部扰动**下零样本保持鲁棒控制，且观测可在真机上廉价获得。

---

## 🔧 方法详解

### 阶段一：历史条件强化学习教师（History-Conditioned RL Teacher）

- 在**大范围随机化动力学**（质量、惯量、摩擦、电机/传动参数等）的仿真里训练教师；
- 关键点：策略**不靠显式 sysid**，而是从**近期 state-action 历史轨迹**中在线推断出「隐式动力学上下文（latent dynamics context）」，据此实时调整动作；
- 即「我从刚才几步的反馈，推断出当前这台机器人/这个环境的脾气，然后自适应」，得到一个高性能、强自适应的教师。

### 阶段二：在线蒸馏到 Transformer 学生（Online Distillation）

- 学生是一个 **Transformer**，观测为**稀疏的 root-relative 3D 关节关键点轨迹**（比特权状态更接近真机可得的信号）；
- **在线蒸馏**：学生在环境中交互，实时模仿教师的鲁棒行为，把教师「历史条件自适应」的能力迁移到学生上；
- 结合两者，单一学生策略即可**零样本适配未见域**，无需逐域重训。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph S1["🎓 阶段一：历史条件 RL 教师"]
        DR["大范围动力学随机化<br/>(质量/惯量/摩擦/传动)"]
        HIST["近期 state-action 历史"]
        CTX["在线推断<br/>隐式动力学上下文"]
        TEACH["教师策略<br/>(高性能 + 自适应)"]
    end

    subgraph S2["🧪 阶段二：在线蒸馏"]
        KP["稀疏 root-relative<br/>3D 关键点轨迹"]
        STU["Transformer 学生策略"]
        DIST["在线蒸馏<br/>(实时模仿教师)"]
    end

    subgraph OUT["🚀 部署：Unitree G1"]
        ZS["零样本适配未见域"]
        ROB["抗外部扰动"]
    end

    DR --> TEACH
    HIST --> CTX --> TEACH
    TEACH --> DIST
    KP --> STU
    DIST --> STU
    STU --> ZS
    STU --> ROB

    style S1 fill:#fef6e4,stroke:#d35400,color:#5e2c00
    style S2 fill:#e8f8e8,stroke:#27ae60,color:#1b5e20
    style OUT fill:#fff3e0,stroke:#fb8c00,color:#4e342e
</div>

---

## 💡 核心贡献

1. **历史条件 RL 教师**：用近期轨迹在线推断隐式动力学上下文，省掉显式系统辨识，在随机化动力学下强自适应。
2. **在线蒸馏到关键点学生**：把教师能力迁到一个吃稀疏 3D 关键点的 Transformer 学生，观测更贴近真机可得信号。
3. **单策略零样本鲁棒**：两者结合，单一策略在未见域 + 外部扰动下零样本工作，无需逐域重训。
4. **实证优于强基线**：在鲁棒性与迁移上，尤其在未见域与外部扰动下，优于强 baseline。

---

## 📊 关键实验结果（结构性总结）

| 维度 | 结论 |
|---|---|
| 平台 | Unitree G1 |
| 核心指标 | 未见域 / 外部扰动下的鲁棒性与迁移性能 |
| 对比 | 显著优于强 baseline，尤其在分布外动力学与扰动场景 |
| 卖点 | 单策略**零样本**适配未见域，无需逐域重训 |

> ⚠️ 详细数值（各域成功率、扰动幅度、消融）以 arXiv [2602.04412](https://arxiv.org/abs/2602.04412) 论文正文与[项目主页](https://tonywang-0517.github.io/hord/)为准。

---

## 🤖 工程价值

- **降低逐域调参成本**：一套策略覆盖多种动力学/任务/环境变化，省掉「换一个场景重训一次」的工程开销。
- **关键点观测更易落地**：学生吃 root-relative 3D 关键点，比特权状态更接近真机传感可得的信号，利于部署。
- **历史条件 = 在线自适应**：用历史推断动力学上下文是一种轻量替代 sysid 的思路，可迁移到其他足式/全身控制任务。
- **限制**：极端超出训练随机化包络的域仍可能退化；蒸馏依赖教师质量与在线交互预算。

---

## 🎤 面试参考

**Q：HoRD 和经典 teacher-student（特权教师→盲学生）有何不同？**
A：经典范式学生只是「盲学」教师动作，对分布外动力学不够鲁棒；HoRD 的教师本身是**历史条件自适应**的，蒸馏把「根据历史在线适配」的能力也带给学生，所以零样本鲁棒性更强。学生观测也换成了更易获取的稀疏 3D 关键点。

**Q：为什么用「历史」而不用显式系统辨识？**
A：显式 sysid 要额外传感/估计且易错；历史条件让策略从近期 state-action 轨迹中**隐式**推断当前动力学上下文，端到端学习、无需独立辨识模块。

**Q：在线蒸馏相比离线蒸馏的好处？**
A：学生在真实交互分布（含自身误差累积）上学习，缓解 covariate shift，蒸馏出的策略在闭环部署时更稳。

---

## 🔬 源码解读

> 官方代码已开源：[hong-labs/hord](https://github.com/hong-labs/hord)（MIT，版权署名 "Hong's Lab"，对应论文资深作者）。README 带 arXiv 2602.04412 徽章，是一个 **Hydra 驱动**的 PyTorch(-Lightning) 框架（约 147 个 Python 文件 + 105 个 YAML 配置），扩展自 ProtoMotions / MaskedMimic 人形模仿谱系。项目页的 "Code" 链接指向此仓库（注意作者个人账号下的 `tonywang-0517/hord` 描述较旧，以 `hong-labs/hord` 为准）。

**目录结构**

| 路径 | 内容 |
|---|---|
| `hord/` | 核心代码：`agents/`（PPO/AMP/ASE/mimic/masked_mimic）、`envs/`、`simulator/`（可插拔后端） |
| `data/` | 数据集与 AMASS/SMPL 处理脚本（`data/scripts/`） |
| `poselib/` `isaac_utils/` | 姿态处理与 Isaac 工具库 |
| `results/` | 训练输出与 checkpoint |

**实现要点**

- **可插拔仿真后端**：通过 `+simulator=` 标志在 IsaacLab / IsaacGym / Genesis 间切换，配合 Unitree G1/H1 机器人与多地形 config，体现论文"大范围动力学随机化"训练设定。
- **两阶段训练**严格对应方法章节：阶段一 `hord/train_agent.py +exp=full_body_tracker/transformer` 训练历史条件 RL 教师；阶段二 `+exp=masked_mimic/no_vae` 用在线蒸馏把教师迁移到吃稀疏关键点的 Transformer 学生。另有 `train_domain_transformation.py`、`target_domain_data_collect.py` 做域迁移与目标域数据采集。
- **历史条件**落地为专门的 `historical_self_obs_with_actions` 模型（Transformer 或 MLP，例如 4 时间步 × 523 维）喂给 actor——这正是论文"从近期 state-action 历史在线推断隐式动力学上下文"的实现，被 33 个文件引用。
- **资源托管**：预训练 checkpoint 与数据集放在 Hugging Face（`tony0517/HoRD`），仓库内 `data/scripts/` 提供 AMASS/SMPL 预处理，可端到端复现。

---

## 🔗 相关阅读

- [RMA: Rapid Motor Adaptation (2107.04034)](https://arxiv.org/abs/2107.04034) — 用历史在线推断环境上下文做自适应的代表作
- [XHugWBC (2602.05791)](https://arxiv.org/abs/2602.05791) — 跨本体通用 WBC，同属「单策略广泛适配」思路
- [HOVER (2410.21229)](https://arxiv.org/abs/2410.21229) — 通用神经全身控制器

---

> 备注：本笔记基于 arXiv 摘要、[项目主页](https://tonywang-0517.github.io/hord/)与公开搜索结果整理；详细数值（各域/扰动成功率、消融、训练规模）以 arXiv [2602.04412](https://arxiv.org/abs/2602.04412) 论文正文为准。
