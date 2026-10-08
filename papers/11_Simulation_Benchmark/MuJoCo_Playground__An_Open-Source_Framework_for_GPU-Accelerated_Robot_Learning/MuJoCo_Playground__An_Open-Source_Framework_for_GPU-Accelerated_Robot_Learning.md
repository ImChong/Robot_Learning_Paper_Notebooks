---
layout: paper
paper_order: 11
title: "MuJoCo Playground: An Open-Source Framework for GPU-Accelerated Robot Learning and Sim-to-Real Transfer"
zhname: "MuJoCo Playground：面向机器人学习与仿真到真实迁移的 GPU 加速开源框架"
category: "Simulation Benchmark"
---

# MuJoCo Playground: An Open-Source Framework for GPU-Accelerated Robot Learning and Sim-to-Real Transfer

**MuJoCo Playground：GPU 加速的机器人学习开源框架**

> 📅 总结日期: 2026-08-18
>
> 🏷️ 板块: 11 Simulation Benchmark · GPU 并行仿真 / MJX / 足式+操作+灵巧手统一环境 / 零样本 sim-to-real
>
> 🔁 推进轨: 模块轮转（10_Sim-to-Real → **11_Simulation_Benchmark**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2502.08844](https://arxiv.org/abs/2502.08844) |
| HTML | [在线阅读](https://arxiv.org/html/2502.08844) |
| PDF | [下载](https://arxiv.org/pdf/2502.08844) |
| **发布时间** | 2025-01-15（技术报告）/ 2025-02-12（arXiv v1） |
| 项目主页 | [playground.mujoco.org](https://playground.mujoco.org/) |
| 源码 | 🌟 [google-deepmind/mujoco_playground](https://github.com/google-deepmind/mujoco_playground)（环境 + 训练脚本 + Colab 教程，Apache-2.0 / CC BY 4.0） |

**作者团队**：Kevin Zakka、Baruch Tabanpour、Qiayuan Liao、Mustafa Haiderbhai、Samuel Holt、Jing Yuan Luo、Arthur Allshire、Erik Frey、Koushil Sreenath、Lueder A. Kahrs、Carmelo Sferrazza、Yuval Tassa、Pieter Abbeel 等。
**机构**：UC Berkeley × Google DeepMind × University of Toronto × University of Cambridge。

---

## 📌 名词速查

| 名词 | 解释 |
|---|---|
| MJX | MuJoCo 的 JAX 实现，可在 GPU/TPU 上对成千上万个环境做并行、可微的批量仿真 |
| Madrona 批渲染器 | 高吞吐并行渲染引擎，让「像素输入」策略也能在单 GPU 上直接大规模并行训练，免蒸馏 |
| DM Control Suite | DeepMind Control Suite 经典连续控制任务（cartpole、cheetah、humanoid 等） |
| 零样本 sim-to-real | 仿真里训好的策略不再微调、直接部署到真机即可工作 |
| Menagerie | MuJoCo 官方高质量机器人模型库，Playground 按需自动下载对应资产 |

---

## ❓ 要解决什么问题？

机器人强化学习长期被两件事卡住：**（1）仿真慢**——CPU 物理引擎并行度低，训练动辄数小时到数天，迭代成本高；**（2）工具链割裂**——运动、操作、灵巧手、像素输入各有一套仿真/训练代码，环境定义、渲染、RL 算法难以复用，sim-to-real 更是各做各的。

MuJoCo Playground 想做的是：**用一个统一、开箱即用、GPU 全并行的开源框架**，把连续控制、足式运动、灵巧操作等任务放进同一套 MJX 仿真里，让研究者「pip 装完、单卡几分钟训好一个策略」，并覆盖从状态到像素的零样本真机迁移。

---

## 🔧 框架怎么搭的？

### 1. 底座：MJX（MuJoCo on JAX）
用 JAX 重写的 MuJoCo，物理步进天然向量化，可在单张 GPU 上同时并行数千~数万个环境，且全程可微，为大批量 on-policy RL（如 PPO）提供极高吞吐。

### 2. 三大环境套件
- **`dm_control_suite`**：DeepMind Control Suite 的经典连续控制任务，作为标准基线；
- **`locomotion`**：四足与双足/人形运动（如四足摇杆行走、倒立、摔倒恢复；Booster T1、Berkeley Humanoid、Op3、Unitree G1 等双足运动）；
- **`manipulation`**：机械臂与灵巧手操作（Franka、ALOHA 插销、Leap Hand 手内重定向、非抓取式推动等）。

### 3. 像素训练：Madrona 批渲染器
接入 Madrona 高吞吐批渲染，使**视觉/像素输入**策略也能在单 GPU 上大规模并行训练，**无需先训状态策略再蒸馏**，并展示了视觉抓取等任务的零样本迁移。

### 4. 环境注册与训练脚本
环境按模块级函数注册、首次访问自动下载 Menagerie 资产；训练侧同时支持 **JAX/Brax PPO**（`train_jax_ppo.py` / CLI `train-jax-ppo`）与 **RSL-RL PPO**（`train-rsl-ppo`），命令行指定 `--env_name` 即可切换任务。

### 5. 零样本 sim-to-real
配合域随机化与统一的机器人模型，多个足式与操作任务把仿真策略**直接**部署到真机，验证状态与像素两类输入的迁移可行性。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph CORE["⚙️ 仿真底座"]
        MJX["MJX（MuJoCo on JAX）<br/>单 GPU 数千~数万环境并行 · 可微"]
        MEN["Menagerie 资产库<br/>按需自动下载机器人模型"]
        MAD["Madrona 批渲染器<br/>像素输入并行渲染"]
        MJX --- MEN
        MJX --- MAD
    end

    subgraph ENVS["📦 三大环境套件"]
        E1["dm_control_suite<br/>经典连续控制基线"]
        E2["locomotion<br/>四足 + 双足/人形"]
        E3["manipulation<br/>机械臂 + 灵巧手"]
    end

    subgraph TRAIN["🏋️ 训练"]
        T1["JAX/Brax PPO<br/>train_jax_ppo.py"]
        T2["RSL-RL PPO<br/>train-rsl-ppo"]
    end

    CORE --> ENVS
    ENVS --> TRAIN
    TRAIN --> POLICY["策略（状态 / 像素输入）<br/>单卡「分钟级」训练"]
    POLICY --> DR["域随机化"]
    DR --> REAL["🤖 零样本 sim-to-real<br/>足式运动 · 摔倒恢复 · 视觉抓取 · 手内重定向"]

    style CORE fill:#e8f4fd,stroke:#1f78b4
    style ENVS fill:#e8fbe8,stroke:#27ae60
    style TRAIN fill:#fde8e8,stroke:#c0392b
    style REAL fill:#fff7e0,stroke:#d4a017
</div>

---

## 🧩 源码运行时序图（mermaid）

> 基于官方仓库 [google-deepmind/mujoco_playground](https://github.com/google-deepmind/mujoco_playground) 的 `learning/train_jax_ppo.py`、`mujoco_playground` 环境注册（`locomotion` / `manipulation` / `dm_control_suite`）与 Brax PPO 训练环路梳理。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant USR as 用户 / CLI<br/>(train-jax-ppo)
    participant REG as 环境注册表<br/>(registry.load)
    participant MEN as Menagerie 资产
    participant ENV as MJX 环境<br/>(向量化 step/reset)
    participant PPO as Brax/RSL-RL PPO
    participant REN as Madrona 批渲染器
    participant CKPT as 检查点 / 部署

    USR->>REG: 指定 --env_name 加载环境
    REG->>MEN: 首次访问自动下载机器人模型
    REG-->>ENV: 返回已注册的 MJX 环境
    Note over ENV: JAX jit + vmap 编译为 GPU 批量算子
    loop 每个训练迭代
        PPO->>ENV: 并行 reset/step 数千环境采样 rollout
        opt 像素输入任务
            ENV->>REN: 批量渲染观测图像
            REN-->>ENV: 返回像素 obs
        end
        ENV-->>PPO: 返回 obs / reward / done
        PPO->>PPO: 计算优势 + 更新 Actor-Critic
    end
    PPO->>CKPT: 保存策略权重
    CKPT-->>USR: 导出策略 → 域随机化 → 真机零样本部署
</div>

---

## 💡 核心贡献

1. **统一 GPU 并行仿真栈**：把 DM Control、足式运动、灵巧操作放进同一套 MJX 环境，环境定义 / 渲染 / RL 训练全部可复用。
2. **像素也能并行训练**：接入 Madrona 批渲染器，让视觉输入策略在单 GPU 上直接大规模训练、免「状态→蒸馏→像素」的迂回。
3. **分钟级迭代**：单张 GPU 上「pip 装完即用、几分钟训好一个策略」，显著降低机器人 RL 的算力与工程门槛。
4. **覆盖零样本 sim-to-real**：多机器人、多任务演示状态与像素两类输入的直接真机迁移，给出可复现的 sim-to-real 基线。
5. **完全开源 + 教程齐全**：环境、训练脚本、四套 Colab 教程与预设任务全部开放，社区可直接扩展新机器人 / 新任务。

---

## 🤖 对人形 / 具身 AI 领域的意义

| 方向 | 含义 |
|---|---|
| **训练效率** | 单卡分钟级迭代，让人形运动 / 操作策略的搜索与调参成本大幅下降 |
| **统一工具链** | 运动 + 操作 + 灵巧手同栈，便于研究「全身移动操作」这类跨模态任务 |
| **视觉策略** | 批渲染让像素输入策略可规模化训练，贴近真机「靠摄像头做决策」的部署形态 |
| **可复现 sim-to-real** | 开源的零样本迁移基线，成为人形 / 足式社区对比方法的通用底座 |

---

## 🎤 面试参考

**Q：MuJoCo Playground 相比传统 MuJoCo / Isaac Gym 这类仿真最大的价值在哪？**
A：它把「MJX 的 GPU 全并行仿真 + 统一环境套件（运动/操作/灵巧手/经典控制）+ 开箱即用的 PPO 训练脚本 + Madrona 像素批渲染」打包成一个开源框架，让研究者在单卡上几分钟就能训好并零样本迁到真机。相比各自为战的仿真+训练代码，它的关键是「统一、可复用、低门槛」，而不是发明新物理引擎。

**Q：为什么像素输入训练需要 Madrona 批渲染器？**
A：RL 需要海量 rollout，若渲染吞吐跟不上物理并行，视觉任务就会退化为「先训状态策略再蒸馏到像素」的迂回。Madrona 提供高吞吐并行渲染，使成千上万个环境的图像观测能与 MJX 物理步进同步产出，从而直接端到端训练像素策略并零样本迁移。

**Q：它对「人形全身移动操作」研究有什么用？**
A：全身移动操作天然是「运动 + 操作」的跨模态问题，过去要拼接不同仿真/代码库。Playground 把足式运动与机械臂/灵巧手操作放进同一 MJX 栈，环境接口、渲染和训练算法一致，便于在统一框架里训练、评测并做 sim-to-real，是搭建人形 loco-manipulation 基线的顺手底座。

---

## 🔗 相关阅读

- [MuJoCo Playground 项目主页](https://playground.mujoco.org/)：各机器人运动 / 操作演示与 sim-to-real 视频
- [google-deepmind/mujoco_playground](https://github.com/google-deepmind/mujoco_playground)：环境、训练脚本与 Colab 教程
- [HumanoidBench (arXiv 2403.10506)](https://arxiv.org/abs/2403.10506)：全身运动与操作仿真基准，本仓库已有笔记
- [Isaac Lab GPU Simulation（本仓库已有笔记）](../../03_High_Impact_Selection/Isaac_Lab_GPU_Simulation/Isaac_Lab_GPU_Simulation.html)：另一主流 GPU 并行机器人学习框架

---

> 备注：本笔记基于 arXiv 摘要、技术报告与官方仓库 README 整理。各机器人 / 任务的逐项训练时长、奖励与域随机化配置、Madrona 像素训练与 RSL-RL 路径的实现细节，待完整阅读正式 PDF 与源码后回填。
