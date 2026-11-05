---
layout: paper
title: "BiGym 2.0: Benchmarking Learned and Agent-Developed Policies for Humanoid Household Manipulation"
zhname: "BiGym 2.0：人形家务操作中学习型策略与智能体编写策略的基准"
category: "Simulation Benchmark"
arxiv: "2610.07594"
---

# BiGym 2.0: Benchmarking Learned and Agent-Developed Policies for Humanoid Household Manipulation
**把 BiGym 从「浮动底座 + 播放腿部动画」的 H1 搬到真正靠腿走路的 G1：20 个家务任务、每个 60 条 VR 人类示范，采数据、训练、评测都经过同一个冻结的 GR00T-WBC 下肢控制器；在同样的三路 84×84 图像 + 本体感受 + 同一套动作接口下，横向比较 π₀.₅ 微调、模仿学习、示范驱动 RL 和「冷启动」编程智能体写出来的程序**

> 📅 总结日期: 2026-11-05
>
> 🏷️ 板块: 11 Simulation Benchmark · 家务移动操作 · 全身控制下的操作基准 · VR 人类示范 · VLA / 模仿学习 / 示范驱动 RL / 编程智能体 · MuJoCo · Unitree G1
>
> 🔁 推进轨: 模块轮转（10_Sim-to-Real → **11_Simulation_Benchmark**）· 上游 awesome-humanoid-robot-learning Simulation Benchmark 章节中尚无笔记的最新论文（2026-10，PROGRESS #672，🌟）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.07594](https://arxiv.org/abs/2610.07594) |
| HTML | [arxiv.org/html/2610.07594](https://arxiv.org/html/2610.07594) |
| PDF | [下载](https://arxiv.org/pdf/2610.07594) |
| **发布时间** | 2026-10-06（arXiv v1，cs.RO） |
| 项目主页 | [bigym2.github.io](https://bigym2.github.io/) |
| 源码 | [swirl-uk/BiGym2](https://github.com/swirl-uk/BiGym2)（Apache-2.0，含环境、评测协议、VR 采集、编程智能体 harness） |
| 数据 | [SWIRL-Lab/bigym-g1-native60](https://huggingface.co/datasets/SWIRL-Lab/bigym-g1-native60)（1,200 条示范）· [SWIRL-Lab/bigym2-agent-rollouts](https://huggingface.co/datasets/SWIRL-Lab/bigym2-agent-rollouts)（5,400 条智能体评测回合） |
| 前作 | [BiGym（CoRL 2024）](../BiGym__A_Demo-Driven_Mobile_Bi-Manual_Manipulation_Benchmark/BiGym__A_Demo-Driven_Mobile_Bi-Manual_Manipulation_Benchmark.html) |

**作者**：Zexi Zhang\*、Zecheng Zhu\*、Zidong Chen、Zulkhuu Tuya、Stephen James（Imperial College London，Department of Computing；\* 共同一作）

---

## 🎯 一句话总结

BiGym 原版的 H1 用浮动底座直接设定骨盆位姿、腿只跟着高度播放运动学轨迹，等于一台全向移动底盘；BiGym 2.0 换成 29 自由度 G1 + 两个 Dex1 夹爪，底盘命令改成「速度 + 高度（+ 躯干俯仰）」交给冻结的 GR00T-WBC 走路和保持平衡，于是走路带来的步态冲击、滞后会直接耦合进手上的操作。作者把 20 个任务的几何改到 G1 的工作空间，用同一个控制器采了 1,200 条 VR 示范，并在评测时恢复控制器内部状态，让同一个种子的回合逐位可复现。九个代表任务上：**π₀.₅ 微调九任务平均最高（75%）**，ACT 68%，两个编程智能体（GPT-6 Astra 65%、Claude Opus 5.5 61%）都高于所有示范驱动 RL；**双手同时伸手**时编程智能体领先（程序可以分别控两条手臂），而**多物体搬运**（两只盘子、装杯子）对模仿学习、RL 和编程智能体都难，**跨工作台叠积木**几乎没人做得出来。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| WBC | Whole-Body Controller | 全身控制器；这里是 NVIDIA 的 GR00T-WBC 行走 / 平衡策略，冻结不训练 |
| VLA | Vision-Language-Action | 视觉-语言-动作模型；本文用 π₀.₅ 微调 |
| IL | Imitation Learning | 模仿学习；ACT、Diffusion Policy（DP） |
| CQN-AS | Coarse-to-fine Q-Network with Action Sequence | 粗到细离散化的 Q 学习，输出动作序列；在线 + 示范 |
| DrQ-v2+ | Data-regularized Q v2 | 图像增强的 actor-critic；在线 + 示范 |
| DEAS | DEtached value learning with Action Sequence | 离线 RL，按动作序列学价值，AWR 提取策略 |
| AWR | Advantage-Weighted Regression | 优势加权回归 |
| IK | Inverse Kinematics | 逆运动学；严格接口下不给智能体 |
| SE | Standard Error | 标准误，三次训练运行之间 |

---

## ❓ 这篇论文要解决什么问题？

- **人形家务操作 = 手在干活、腿在走路和平衡**。轮式底盘能直接执行速度命令，腿式控制器却要靠步态去实现，会滞后、晃动、冲击躯干——这正是操作要面对的执行条件。
- **现有基准缺一个组合**：家务任务 + 通过主动全身控制采的人类示范 + 可确定性恢复的控制器状态 + 学习型策略与「智能体写的程序」放在一起公平比较。BiGym 原版的示范是浮动底座模式，把行走控制隔离掉了。
- **两条产出能力的路线该怎么比**：数据驱动（VLA、模仿学习、示范驱动 RL）vs. 智能体开发（编程智能体从环境 API 拼出可执行程序）。它们在同样的观测、动作和控制器下，各自能可靠完成什么、在哪分叉、在哪一起失败？

---

## 🔧 方法拆解（基准设计）

### 1. 两个物理挑战 + 一个评测问题（第 III-A 节）

- **步态扰动下的交互**：手臂动作时腿在迈步和保持平衡；
- **协调的多物体搬运**：在桌子、台面之间搬东西，视角一直在变；
- **跨范式的可靠性**：观测、动作、控制器完全相同时，学习型策略和程序谁更可靠。

20 个任务分四类场景：**伸手 3**（左手 / 任一只手 / 双手同时）、**桌面 5**（搬一只盘、两只盘、翻杯子、翻餐具、跨桌叠积木）、**洗碗机 4**（关门、装杯、装餐具、装盘）、**厨房台面 8**（抽屉、吊柜开关、搬 3 kg 箱子、放杯子、平底锅上灶、用锅铲转移三明治）。几何按 G1（1.32 m）改过：盘架降低内移，洗碗机垫 0.25 m 底座，搬箱子的边桌 0.50 m、台面 0.71 m。**成功按场景状态判定**，且须保持 1 s（50 个控制步），物体掉地即失败。

### 2. 全身执行（第 III-B 节、附录 B）

- G1 29 自由度（腿 12、腰 3、两条 7 自由度手臂）+ 两个 Dex1 平行夹爪，MuJoCo，物理步 1 ms，高层 50 Hz（每步 20 个子步）。
- **动作 20 / 21 维**：前四维是给 GR00T-WBC 的身体命令 $v_x\in[-0.35,0.35]$ m/s、$v_y\in[-0.25,0.25]$ m/s、底座高度 $z\in[0.40,1.00]$ m、偏航角速度 $\omega_z\in[-0.5,0.5]$ rad/s；14 个任务再加一维躯干俯仰 $[-0.20,0.80]$ rad；之后是 14 个手臂关节绝对目标和 2 个夹爪命令。全部归一化到 $[-1,1]$。
- **被动骨盆倾斜**：底座仍是 BiGym 式的平面滑动 + 偏航关节，额外加了两个无驱动的横滚 / 俯仰铰链；锁死时侧移 0.25 m/s 会带出 0.059 m/s 的意外前进，加上铰链后降到 0.014 m/s。
- **复位**：恢复仿真状态和控制器状态，再跑 200 个高层预热步让机器人站稳；提供 Gymnasium 接口（论文图 3）。

### 3. 人类示范（第 III-C 节）

操作员用 VR 给手部目标（Mink IK 解手臂）、用摇杆给身体命令，GR00T-WBC 执行并保持平衡；采集时成功须保持 3 s，训练视图只保留前 1 s，与评测一致。每任务 60 条成功示范、共 1,200 条，存同步 RGB、本体感受、归一化动作、奖励与终止标志，另存仿真与控制器快照供重放和重渲染。各任务底座平面行进中位数 0.06–8.10 m。

### 4. 观测与评测（第 III-D 节、附录 E）

- 所有方法看同样的**三路 84×84 RGB**（头部 torso_link、两个手腕 wrist_yaw_link，视场 60°）+ **50 / 56 维本体感受**，没人拿到物体位姿；非 VLA 方法堆叠 4 帧；π₀.₅ 额外有语言指令。
- 每个检查点 100 回合，种子 $620000+i$；**分数 = 每次运行最后 5 个检查点的平均**，再报 3 次运行的均值 ± 标准误（π₀.₅ 是每任务一次运行、最后 5 个检查点各 50 回合合并）。不取最好检查点，因为那等于偷看评测种子。
- **复位确定性是测出来的**：不恢复控制器状态时，用过的环境按种子复位与全新环境的配置差 $9.5\times10^{-2}$，50 步后变成 $2.1\times10^{-1}$；恢复后轨迹逐位一致。

### 5. 五类策略家族（第 III-E 节）

| 家族 | 方法 | 预算 |
|---|---|---|
| VLA 微调 | π₀.₅（相对增量手臂动作，每次预测执行 16 步） | 30k 次更新 |
| 模仿学习 | ACT（每步重规划）、DP（每 8 步） | 101k 次更新，batch 256 |
| 示范驱动 RL（在线） | CQN-AS、DrQ-v2+ | 101k 次环境交互，各 256 条回放 + 256 条示范转移 |
| 示范驱动 RL（离线） | DEAS（每 16 步，AWR 提取） | 101k 次更新 |
| 编程智能体（冷启动） | GPT-6 Astra、Claude Opus 5.5 | 101,000 个环境步（与在线 RL 相同），每次复位记 200 步 |

**编程智能体协议**：每个任务开一个全新会话，只给任务描述、环境 API 和一条示范的三路同步画面，不继承其他任务的任何代码；允许 NumPy / SciPy / OpenCV / Pillow，禁止训网络、拟合回归或建示范查找表。**严格接口**下不给相机标定、像素到射线的投影、IK、特权手腕位置和限速器；提交的程序在没见过的种子上运行、不再调用 LLM，并重复 10 回合检查结果确定。每个智能体每个任务 3 个会话。另有一组**工具增强接口**（640×480 画面 + 标定 + 投影 + 微分 IK + 世界系手腕 / 底座位置）只给 Astra 跑，衡量经典机器人工具能补多少。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph S0["0. 从 BiGym 到 BiGym 2.0"]
        A0["BiGym：H1 浮动底座<br/>直接设骨盆位姿，腿播放动画"]
        A1["BiGym 2.0：29 自由度 G1 + 两个 Dex1 夹爪<br/>冻结 GR00T-WBC 走路与平衡"]
        A2["20 个家务任务按 G1 改几何<br/>伸手 3 · 桌面 5 · 洗碗机 4 · 台面 8"]
        A0 --> A1 --> A2
    end

    subgraph S1["1. 示范采集（与评测同一控制器）"]
        B1["VR 手部目标 → Mink IK → 手臂关节"]
        B2["摇杆 → 速度 / 高度 / 俯仰命令"]
        B3["GR00T-WBC 50 Hz → 腿 12 + 腰 3 关节目标<br/>MuJoCo 1 ms 物理步"]
        B4["每任务 60 条成功示范，共 1,200 条<br/>RGB + 本体感受 + 动作 + 控制器快照"]
        B1 --> B3
        B2 --> B3
        B3 --> B4
    end

    subgraph S2["2. 五类策略，同一接口"]
        C0["观测：三路 84×84 RGB + 50/56 维本体感受<br/>动作：4（+1）维身体命令 + 14 手臂 + 2 夹爪"]
        C1["π₀.₅ 微调"]
        C2["ACT / DP 模仿学习"]
        C3["CQN-AS / DrQ-v2+ / DEAS<br/>示范驱动 RL"]
        C4["编程智能体（Astra / Opus 5.5）<br/>一条示范 + 101k 步预算，冷启动写程序"]
        C0 --> C1
        C0 --> C2
        C0 --> C3
        C0 --> C4
    end

    subgraph S3["3. 确定性评测"]
        D1["复位：恢复仿真 + 控制器状态<br/>再跑 200 步预热"]
        D2["100 个种子 620000+i<br/>成功状态保持 1 s"]
        D3["最后 5 个检查点平均 × 3 次运行<br/>（程序：3 个会话 × 100 回合）"]
        D1 --> D2 --> D3
    end

    A2 --> B1
    B4 --> C1
    B4 --> C2
    B4 --> C3
    B4 -->|只给一条| C4
    C1 --> D1
    C2 --> D1
    C3 --> D1
    C4 --> D1
    D3 --> E["结论：π₀.₅ 九任务平均最高；程序在双手伸手领先；<br/>多物体搬运与跨工作台叠积木仍是难点"]
</div>

---

## 🛠️ 源码运行时序图（`swirl-uk/BiGym2`）

按仓库的 `bigym/loco/eval/runner.py`（`evaluate`）、`bigym/loco/env.py`（`BiGym.reset` / `BiGym.step`）、`bigym/loco/lowerbody.py`（`reset` / `run_reset_warmup` / `update_command` / `expand_action`）、`bigym/loco/adapters/groot_wbc.py`（`step`）与 `bigym/bigym_env.py`（`BiGymEnv.step`）整理，展示**一个评测回合**的调用顺序。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant EV as eval.runner.evaluate
    participant PI as 待评测策略 / 程序
    participant LE as loco.env.BiGym（外层）
    participant LB as lowerbody（命令与动作扩展）
    participant WBC as groot_wbc 适配器（GR00T-WBC ONNX）
    participant IE as BiGymEnv（内层任务环境）
    participant MJ as MuJoCo

    EV->>EV: eval_seeds(100) → 620000 + i
    loop 每个种子
        EV->>PI: policy.reset()（若有）
        EV->>LE: reset(seed)
        LE->>IE: inner_env.reset(seed)：任务随机化物体 / 目标
        LE->>LB: reset()：设骨盆初始高度，controller.reset()
        LB->>WBC: 首次复位存 canonical_state，之后 set_state 恢复（保证逐位可复现）
        loop 200 个预热步（hold 动作）
            LB->>LB: update_command + expand_action
            LB->>IE: step(fast=True)，不渲染观测
        end
        LB->>IE: reset_success_hold()（预热不计入成功保持）
        LE-->>EV: 首个 TimeStep（三路 RGB 帧栈 + 本体感受）
        loop 直到 timestep.last()
            EV->>PI: action = policy(timestep)（归一化 20/21 维）
            PI-->>EV: action
            EV->>LE: step(action)
            LE->>LE: denormalize_action → 物理单位
            LE->>LB: update_command：取 vx, vy, 高度, 偏航, 俯仰
            LE->>LB: expand_action：手臂、夹爪映射进内层动作
            LB->>WBC: controller.step()
            WBC->>WBC: 读关节 q/dq + 浮动底座位姿速度 → 策略推理
            WBC-->>LB: 腿 12 + 腰 3 关节位置目标（裁剪到关节限位）
            LE->>IE: step(expanded_action)
            IE->>MJ: action_mode.step + 再推 19 个 1 ms 子步，forward()
            IE->>IE: 成功谓词计数（须连续 50 步）
            IE-->>LE: obs, reward, terminated, truncated
            LE->>LE: 摔倒标记 · 数值异常当失败 · 时间上限截断
            LE-->>EV: TimeStep
        end
        EV->>EV: is_success / episode_fell / 记录本回合
    end
    EV->>EV: success_rate + 底层指纹（模型 SHA256）+ 协议违规检查
    EV-->>EV: 100 回合且无违规 → 生成排行榜记录
</div>

---

## 🚶 具体实例

### 例 1：一维归一化动作对应多大的身体命令

策略输出 $a\in[-1,1]$，线性映射到物理范围 $[\ell, h]$：$\ell + \frac{a+1}{2}(h-\ell)$。

- 前进速度 $a=0.5$：$-0.35 + 0.75\times0.70 = 0.175$ m/s；
- 底座高度 $a=0$：$0.40 + 0.5\times0.60 = 0.70$ m（范围中点）；
- 21 维动作 = 4 维身体命令 + 1 维躯干俯仰 + 7 + 7 维手臂 + 2 维夹爪。

### 例 2：九任务平均怎么来（表 II）

ACT 的九个任务：$61+81+30+100+92+60+39+93+56=612$，$612/9=68.0$，与表中的 68 一致。Astra：$54+89+89+99+99+14+16+100+21=581$，$581/9\approx64.6$，表中写 65。π₀.₅ 用表中取整后的数算是 $670/9\approx74.4$，表中写 75——应是用未取整的成功率平均后再取整（论文没说明，我们的推测）。

### 例 3：为什么叠积木连试错都难（第 V-C 节）

叠积木一个回合上限 8,750 步（175 s），每次复位再记 200 步；101,000 步的预算里，跑满的试验只能做 $101000/(8750+200)\approx11.3$，即 **11 个回合**。示范里中位数要走 8.1 m、两次往返、每块积木平面误差在 5 cm 以内，修一个长时程程序的余地非常窄：工具增强的 Astra 三个会话分别是 19%、0%、0%。

---

## 📊 关键结果

**表 II：九个代表任务成功率（%）**

| 任务 | π₀.₅ | ACT | DP | CQN-AS | DrQ-v2+ | DEAS | Opus 5.5 | Astra |
|---|---|---|---|---|---|---|---|---|
| 搬箱子 | 19 | 61 | 10 | 48 | 0 | 14 | **71** | 54 |
| 任一只手伸手 | 90 | 81 | 84 | 19 | 0 | 79 | **100** | 89 |
| 双手伸手 | 58 | 30 | 27 | 3 | 0 | 34 | 78 | **89** |
| 关抽屉 | 100 | 100 | 100 | 100 | 99 | 100 | 100 | 99 |
| 开抽屉 | 99 | 92 | 98 | 89 | 0 | 79 | 99 | 99 |
| 搬一只盘 | **65** | 60 | 62 | 48 | 0 | 27 | 20 | 14 |
| 搬两只盘 | **68** | 39 | 18 | 21 | 0 | 2 | 15 | 16 |
| 关洗碗机 | 79 | 93 | 51 | 78 | 0 | 27 | 33 | **100** |
| 装杯子 | **92** | 56 | 51 | 47 | 0 | 6 | 28 | 21 |
| **平均** | **75** | 68 | 56 | 50 | 11 | 41 | 61 | 65 |

- **双手伸手把方法分开了**：学习型策略从「任一只手」到「两只手同时」都大幅下降；六个智能体程序都给两条手臂各设目标、各自修正，所以领先。
- **加第二只盘子**让 ACT、DP、CQN-AS、DEAS 都下降，π₀.₅ 不降；编程智能体在搬盘、装杯上大多失败，且会话之间差异很大（一个会话做成、另两个失败）。
- **检查点选择会改变排名**：搬一只盘上，ACT 的最好检查点最高，DP 的最后 5 个平均最高——在 20 个噪声估计里取最大值是有偏的。
- **其余 11 个任务（表 III）**：ACT 或 CQN-AS 都至少有一个达到 10%，只有跨工作台叠积木两者都不超过 1%。
- **工具增强（表 IV，Astra，预发布版环境）**：九任务平均 53% → 76%；伸手和关抽屉几乎不变（像素空间伺服已够），开抽屉 +44、关洗碗机 +67、装杯子 +53；每会话平均花费反而从 $12.1 降到 $8.7（少了无 IK 的反复试错）。
- **先验知识**：Opus 5.5 在 27 个严格接口程序里有 24 个用数值 IK，其中 22 个用的是它记住的 Unitree 公开模型里的连杆偏移，而不是从仿真器读的；Astra 没有这样做。两者平均相近，记住运动学也没解决接触密集任务的失败。
- **仿真吞吐**：单环境带 GR00T-WBC、不渲染 360–550 步/s（7–11 倍实时），带三路 84×84 相机 210–278 步/s。

---

## 💡 核心贡献

1. **腿式执行的家务基准**：20 个任务改到 G1，冻结 GR00T-WBC 同时用于示范采集、训练与评测，步态扰动成为操作必须面对的条件。
2. **1,200 条原生 VR 人类示范**：在与评测相同的全身控制下采集，含控制器快照，可重放、可重渲染（例如 224×224 给 VLA）。
3. **可复现的评测协议**：复位时恢复控制器内部状态（逐位一致）、固定种子、最后 5 个检查点平均，避免挑最好检查点。
4. **学习型策略与编程智能体同台**：相同观测、动作、控制器与交互预算下比较 VLA、IL、示范驱动 RL 和冷启动编程智能体，并单独量化经典工具（标定、IK）给程序带来的增益。

---

## 🤖 对人形机器人领域的意义

- **「下肢交给通用控制器、上层学操作」的分层范式需要专门的基准**：BiGym 2.0 让上层策略真实地承受行走控制器的滞后和晃动，比浮动底座更接近部署时的情形。
- **编程智能体是一个值得认真对待的基线**：只看一条示范、不训练网络，严格接口下九任务平均已超过所有示范驱动 RL；但接触密集与长时程任务仍是短板，冷启动结果也是下限而不是上限（技能积累尚未测试）。
- **局限**：只在仿真；每台机器人只用一个冻结控制器，结论刻画的是「策略 + 控制器」整体；编程智能体受益于对 G1 这种文档齐全机器人的预训练记忆，换到陌生本体可能更差。

---

## 🎤 面试参考

1. **BiGym 2.0 和 BiGym 最大的区别？** 原版示范用浮动底座直接设骨盆位姿、腿播放动画；2.0 用 GR00T-WBC 真的走路，身体命令变成速度和高度参考，步态动态直接影响手上的操作。
2. **为什么评测时要恢复控制器状态？** GR00T-WBC 适配器跨步保留内部状态，只按种子复位不能复现轨迹（配置差 $9.5\times10^{-2}$，50 步后 $2.1\times10^{-1}$）；恢复后逐位一致。
3. **为什么不报最好检查点？** 选最好检查点要用评测种子，等于在测试集上调参；20 个噪声估计取最大值也有正偏差，会改变方法排名。
4. **编程智能体为什么在双手伸手上领先？** 程序可以给两条手臂分别设目标、各自闭环（像素空间伺服），学习型策略则必须从示范里学出双手协调。
5. **在线 RL 和离线 RL 的预算为什么不能直接比？** 在线方法的 101k 是环境交互次数，离线 DEAS 的 101k 是在固定数据上的更新次数，单位不同，论文分别报告。

---

## 🔗 相关阅读

- [BiGym](../BiGym__A_Demo-Driven_Mobile_Bi-Manual_Manipulation_Benchmark/BiGym__A_Demo-Driven_Mobile_Bi-Manual_Manipulation_Benchmark.html)——前作，H1 上的 40 个家务任务与浮动底座示范
- [π₀.₅](../../03_High_Impact_Selection/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.html)——本文九任务平均最高的 VLA
- [ACT](../../03_High_Impact_Selection/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware.html)、[Diffusion Policy](../../01_Foundational_RL/Diffusion_Policy/Diffusion_Policy.html)——模仿学习基线
- [SIMPLE](../SIMPLE__Simulation-Based_Policy_Learning_and_Evaluation_for_Humanoid_Loco-manipulation/SIMPLE__Simulation-Based_Policy_Learning_and_Evaluation_for_Humanoid_Loco-manipulation.html)、[HumanoidMimicGen](../HumanoidMimicGen__Data_Generation_for_Loco-Manipulation_via_Whole-Body_Planning/HumanoidMimicGen__Data_Generation_for_Loco-Manipulation_via_Whole-Body_Planning.html)——同样基于 G1 的移动操作基准，表 I 的对比对象
- [HumanoidBench](../HumanoidBench/HumanoidBench.html)——更早的人形行走 + 操作 RL 基准
- [HOMIE](../../03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.html)——同样是「下肢 RL 控制器 + 上身遥操作」的分层思路
- Code as Policies（[arXiv 2209.07753](https://arxiv.org/abs/2209.07753)）、CaP-X（[arXiv 2603.22435](https://arxiv.org/abs/2603.22435)）——编程智能体写机器人策略的路线
