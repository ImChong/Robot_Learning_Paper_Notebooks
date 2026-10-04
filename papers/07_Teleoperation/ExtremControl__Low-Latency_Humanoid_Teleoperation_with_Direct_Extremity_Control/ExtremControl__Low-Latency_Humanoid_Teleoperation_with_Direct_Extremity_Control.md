---
layout: paper
paper_order: 3
title: "ExtremControl: Low-Latency Humanoid Teleoperation with Direct Extremity Control"
zhname: "ExtremControl：用直接末端控制把人形遥操作的端到端延迟压到 50 ms"
category: "Teleoperation"
---

# ExtremControl: Low-Latency Humanoid Teleoperation with Direct Extremity Control
**绕开全身重定向，直接在末端 SE(3) 空间做映射 + 速度前馈，把端到端延迟从 200 ms 量级压到 50 ms**

> 📅 阅读日期: 2026-05-19
>
> 🏷️ 板块: 07 Teleoperation · 全身控制 · 低延迟遥操作 · 末端 SE(3) 控制
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.11321](https://arxiv.org/abs/2602.11321) |
| HTML | [arXiv HTML](https://arxiv.org/html/2602.11321) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2602.11321) |
| 项目主页 | [extremcontrol.github.io](https://extremcontrol.github.io) |
| **发布时间** | 2026-02-11 (arXiv) |
| 源码 | [UMass-Embodied-AGI/Genesis-Humanoid `extremcontrol` 分支](https://github.com/UMass-Embodied-AGI/Genesis-Humanoid/tree/extremcontrol) |
| 机构 | UMass Amherst · CMU · MIT-IBM Watson AI Lab |
| 作者 | Ziyan Xiong · Lixing Fang · Junyun Huang · Kashu Yamazaki · Hao Zhang · Chuang Gan |
| 发表时间 | 2026-02 |
| 平台 | Unitree G1（含夹爪 / 手持基筐 / 球拍等末端工具） |

---

## 🎯 一句话总结

> ExtremControl 砍掉传统遥操作里的"全身重定向 + 全关节跟踪"管道，直接把人手 / 球拍 / 工具的 **SE(3) 末端位姿**作为控制变量，配合 **笛卡尔空间直映射** 和 **底层速度前馈**，把端到端遥操作延迟压到 **50 ms**——足够 Unitree G1 完成乒乓球接发、托球、抛接、移动接飞盘、合作抬箱等需要高速反应的任务。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| SE(3) | Special Euclidean Group in 3D | 三维空间刚体位姿（位置 + 朝向） |
| FF | Velocity Feedforward | 速度前馈，给低层控制器额外的速度参考 |
| IK | Inverse Kinematics | 逆运动学 |
| WBC | Whole-Body Control | 全身控制 |
| EE | End-Effector | 末端执行器（手 / 工具） |

---

## ❓ 论文要解决什么问题？

人形遥操作过去普遍存在一个"延迟天花板"：
- **整链路 ≥ 200 ms**：动捕 → SMPL 拟合 → 全身重定向 → 全关节 IK / 跟踪策略 → 低层 PD，再加上通信传输。
- 这个延迟对**乒乓球接发、抛接、移动中接物**这种"反应时间窗 < 100 ms"的高速任务来说**完全失效**——球都飞过来了，机器人的手才动。

为什么传统管线这么慢？三个互相纠缠的原因：
1. **重定向开销**：每帧都要把人体 SMPL 解算到机器人骨架上，求 IK 对全身关节。
2. **跟踪策略要顾全身**：策略输出对所有 DoF 一起负责，反应总是"全身一起慢半拍"。
3. **低层只跟位置**：忽略速度参考，剧烈变化时延迟会被低通滤波再放大一次。

ExtremControl 的判断：**操作员关心的其实只是几个末端的 SE(3) 位姿，剩下的可以让机器人自己解决。** 把控制变量从"全身关节"换成"少数末端的 SE(3)"，链路自然变短。

---

## 🔧 方法详解

### 1. 控制目标只盯 SE(3) 末端，不做全身重定向

- 把人形上少量"刚体链接"（两只手 + 工具，必要时加躯干）作为**直接控制目标**。
- 操作员的输入设备（OptiTrack / SteamVR / Vision Pro 等）给出的就是这些链接的 SE(3) 期望位姿。
- **不做 SMPL 拟合**、**不做全身重定向**，省掉传统管线里耗时最大的一段。
- 全身其它 DoF 交给上层 RL 策略 / IK 求解器自己决定，目标只有一个：让末端跟到期望 SE(3)。

### 2. 笛卡尔空间直接映射

- 不在关节空间里做"人 → 机器人"的对齐，而是直接把人末端的 SE(3) 增量映射到机器人末端的 SE(3) 增量：
  - 位置维度：按机器人 / 人臂长比例缩放。
  - 旋转维度：通过坐标系基底对齐做一次性换算。
- 好处：**0 IK / 0 关节插值** 这部分延迟几乎是 0；同时也避免了"重定向出错 → 关节自冲撞"的难调毛病。

### 3. 底层速度前馈

- 传统底层只跟期望位置（PD with position reference），输入剧变时输出会被低通响应再延迟 1–2 个控制周期。
- ExtremControl 在低层加 **velocity feedforward**：把人手末端的速度估计直接喂给低层。
  - 等效于"PD + 速度前馈"，对**输入快速变化**的工况显著提升响应。
- 这步是 50 ms 延迟达成的关键工程细节——不靠提高频率，而靠**降低相位滞后**。

### 4. 任务侧扩展：让"末端控制"足够通用

为了让一个末端控制系统能覆盖广泛任务，作者准备了一组**手持工具**：球拍、基筐、夹爪。机器人侧只需把"末端目标"换成对应工具的 SE(3) 即可，不必为每个任务重训练。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph HUMAN["🧑 操作员侧"]
        DEV["🎯 输入设备<br/>OptiTrack / SteamVR / VR"]
        POSE["🧱 末端 SE(3) 位姿 + 速度"]
    end

    subgraph MAP["🗺️ 笛卡尔直映射 (≈0 延迟)"]
        SCALE["📐 位置缩放 + 旋转对齐"]
        TARGET["🎯 机器人末端目标<br/>SE(3) + v_ref"]
    end

    subgraph ROBOT["🤖 机器人侧 (Unitree G1)"]
        HIGH["🧠 上层策略 / IK<br/>解算其它 DoF"]
        LOW["⚡ 低层控制<br/>PD + 速度前馈"]
        ACT["🦾 关节力矩"]
    end

    TASK["🏓 任务: 接乒乓球 / 托球 / 抛接<br/>飞盘 / 合作抬箱"]

    DEV --> POSE --> SCALE --> TARGET
    TARGET --> HIGH --> LOW --> ACT --> TASK
    TARGET -.->|v_ref 前馈| LOW

    style HUMAN fill:#e8f4fd,stroke:#1f78b4
    style MAP fill:#fff7e0,stroke:#d4a017
    style ROBOT fill:#f3e8ff,stroke:#8e44ad
    style TASK fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **末端 SE(3) 直接控制**：把"控制变量"从全身关节降到极少数链接，是延迟最大的一刀。
2. **笛卡尔空间直映射**：跳过 SMPL 拟合 / 全身 IK，工程上立刻拿到几十毫秒。
3. **底层速度前馈**：用极简改动把相位滞后压下来，让快速反应任务成为可能。
4. **50 ms 端到端延迟**：在真机 Unitree G1 上做到了过去多数遥操作管线只能在仿真里谈的延迟量级。
5. **任务多样性**：乒乓球接发 / 托球 / 抛接 / 移动接飞盘 / 抛物接物 / 合作抬箱，证明"末端控制 + 工具切换"可以覆盖广义 loco-manipulation。

---

## 📊 关键数据

| 维度 | ExtremControl | 既有遥操作管线 |
|---|---|---|
| 端到端延迟 | **≈ 50 ms** | 通常 ≥ 200 ms |
| 末端控制变量数 | 少数刚体链接（2–3 处） | 全身全关节 |
| 关键任务 | 乒乓球接发 / 托球 / 抛接 / 移动接飞盘 / 合作抬箱 | 多数无法在线完成 |
| 平台 | Unitree G1（含手持工具切换） | — |

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **遥操作延迟工程** | 给出一个"敢做高速任务"的延迟参考线（50 ms），下游遥操作系统应把它当作工程目标而非上限 |
| **重定向必要性的再讨论** | 传统全身重定向并非"必须"——当任务是末端定向的接触型操控时，直接 SE(3) 控制更短链路、更易调 |
| **VLA / 模仿学习数据采集** | 末端 SE(3) 轨迹天然是稳定、低维的演示信号，对下游 BC / 扩散策略训练友好 |
| **工具中心化建模** | 「机器人末端 = 当前工具的位姿」让任务复用变得平凡：换工具 ≈ 换坐标系 |

---

## 🎤 面试参考

**Q：为什么 ExtremControl 能比传统遥操作低 4 倍延迟？**
A：把控制目标从"全身关节"换成"末端 SE(3)"，省掉 SMPL 拟合 + 全身重定向 + 全身 IK 三大块；笛卡尔直映射让"人 → 机器人"的换算几乎 0 延迟；底层加速度前馈避免在剧烈变化时被低通响应再延迟一拍。综合下来 200 ms → 50 ms。

**Q：直接控末端不会撞自己、不会失稳吗？全身关节怎么办？**
A：全身其它 DoF 交给上层策略 / IK 解算，约束（自碰撞、平衡、关节限位）写在那一层；末端目标只是"上层接到的命令"。这本质是**功能解耦**：操作员只负责"末端要去哪"，机器人负责"用什么姿态去"。

**Q：速度前馈相比单纯提高控制频率有什么本质区别？**
A：提高频率只能让"每次更新"更密集，但对每次更新内部的相位滞后没有帮助；速度前馈把"下一步该往哪儿走"显式告诉低层，相当于在**控制律**层面把延迟扣掉，而不是在**采样率**层面叠 buff。

**Q：和 HumanPlus / CLOT 这类全身遥操作相比，ExtremControl 的取舍是？**
A：HumanPlus / CLOT 强调**全身表达力 / 长时序跟踪稳定性**，适合走路、姿态丰富、长时间持续的任务；ExtremControl 牺牲全身表达，换**极低延迟**与**高速反应**，适合接发、抛接这类反应窗 < 100 ms 的任务。两条线互补，不互相替代。

**Q：源码方面，作者给了什么？**
A：`Genesis-Humanoid` 仓库的 `extremcontrol` 分支提供：基于 Genesis 的仿真环境、PPO 教师 + BC 蒸馏的训练管线、`deploy/g1_teleop.py` 与 `deploy/g1_motion.py` 部署脚本、以及多输入源（OptiTrack / SteamVR / 自定义 publisher）的接入。基线安装命令为 `uv sync --package gs-env`，并提供动作缩放选项以安全过渡到真机。

---

## 🔗 相关阅读

- [ExtremControl 项目主页](https://extremcontrol.github.io)
- [Genesis-Humanoid `extremcontrol` 分支](https://github.com/UMass-Embodied-AGI/Genesis-Humanoid/tree/extremcontrol)
- 同模块对照：[CLOT](../CLOT__Closed-Loop_Global_Motion_Tracking_for_Whole-Body_Humanoid_Teleoperation/CLOT__Closed-Loop_Global_Motion_Tracking_for_Whole-Body_Humanoid_Teleoperation.html)（闭环全局跟踪、强调长时序稳定） · [HumanPlus](../HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans/HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans.html)（全身重定向 + 模仿学习）
- 跨模块对照：[HumDex](../../06_Manipulation/HumDex_Humanoid_Dexterous_Manipulation_Made_Easy/HumDex_Humanoid_Dexterous_Manipulation_Made_Easy.html)（IMU 全身遥操作 + 学习式手部重定向）
