---
layout: paper
title: "ManiSkill3: GPU Parallelized Robotics Simulation and Rendering for Generalizable Embodied AI"
zhname: "ManiSkill3：面向可泛化具身智能的 GPU 并行机器人仿真与渲染"
category: "Simulation Benchmark"
arxiv: "2410.00425"
---

# ManiSkill3: GPU Parallelized Robotics Simulation and Rendering for Generalizable Embodied AI
**基于开源 SAPIEN + PhysX 的 GPU 并行机器人仿真框架：物理和渲染都在 GPU 上批量完成，「仿真 + 渲染」吞吐可达 30,000+ FPS，显存只有 Isaac Lab 的 1/2–1/3；它还支持异构并行（每个并行环境里的物体、关节数甚至整个房间都可以不同），提供面向对象的批量 API、12 类共享同一接口的任务、20+ 款机器人（含 Unitree H1 / G1 人形）、大规模演示数据，以及统一评测口径的 RL / IL 基线。**

> 📅 总结日期: 2026-09-25
>
> 🏷️ 板块: 11 Simulation & Benchmark · GPU 并行仿真 · 并行渲染 · 异构仿真 · 视觉强化学习 · 数字孪生 / Real2Sim
>
> 🔁 推进轨: 模块轮转（09_State_Estimation → ~~10_Sim-to-Real~~ → **11_Simulation_Benchmark**）· 10_Sim-to-Real 中上游 awesome-humanoid-robot-learning 收录的论文已全部有笔记，顺延到 11；本模块上游剩余条目里有 arXiv 论文的只剩 ManiSkill3（2024.10），Genesis（2024.12）只发布了代码、没有论文，因此选 ManiSkill3

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2410.00425](https://arxiv.org/abs/2410.00425) |
| HTML | [在线阅读（arXiv HTML 视图）](https://arxiv.org/html/2410.00425) |
| PDF | [下载](https://arxiv.org/pdf/2410.00425) |
| 会议 | Robotics: Science and Systems (RSS) 2025 |
| **发布时间** | 2024-10-01 (arXiv v1) · 2025-05-30 (arXiv v2) |
| 项目主页 | [maniskill.ai](http://maniskill.ai/) · [文档](https://maniskill.readthedocs.io/) |
| 源码 | 🌟 [github.com/haosulab/ManiSkill](https://github.com/haosulab/ManiSkill)（Python，`pip install mani_skill`；刚体环境为 Apache-2.0 等宽松许可，资产为 CC BY-NC 4.0；自带 `examples/baselines/` 下的 PPO / SAC / TD-MPC2 / Diffusion Policy / RLPD / RFCL 等基线） |

**作者**：Stone Tao, Fanbo Xiang, Arth Shukla, Yuzhe Qin, Xander Hinrichsen, Xiaodi Yuan, Chen Bao, Xinsong Lin, Yulin Liu, Tse-kai Chan, Yuan Gao, Xuanlin Li, Tongzhou Mu, Nan Xiao, Arnav Gurha, Zhiao Huang, Roberto Calandra, Rui Chen, Shan Luo, Hao Su（UC San Diego / Hillbot，合作方 CMU、TU Dresden、清华、KCL）

---

## 🎯 一句话总结

ManiSkill3 想让**视觉操作任务也能像行走一样靠 GPU 大规模并行仿真来训练**。以往 GPU 仿真器（Isaac Gym / Isaac Lab、MJX）主要服务于不需要图像的行走任务：渲染慢、显存占用大，而且每个并行环境只能放同一个场景。ManiSkill3 在开源的 SAPIEN 上同时并行化了**物理仿真和相机渲染**，仿真 + 渲染最高 **30,000+ FPS**，在 640×480 相机设置下比 Isaac Lab 快约 2 倍、显存省 2–3 倍（128 个并行环境：4.4 GB 对 14.1 GB）。它还首次支持**异构 GPU 仿真**：不同并行环境可以放不同的物体、不同自由度的铰接体，甚至不同的房间。在 RTX 4090 上，用 PPO 从一张 128×128 RGB 图像学会 PickCube 只要几分钟。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| SAPIEN | SimulAted Part-based Interactive ENvironment | UCSD 开源的物理仿真 + 渲染引擎，ManiSkill3 的底层 |
| PhysX | NVIDIA PhysX | 刚体物理引擎，ManiSkill3 与 Isaac Lab 都用它的 GPU 版本 |
| FPS | Frames / Steps Per Second | 这里指每秒能完成多少个「环境步」（含渲染） |
| Heterogeneous Sim | — | 异构仿真：各并行环境中的物体、自由度、场景可以不同 |
| Real2Sim / Sim2Real | — | 用仿真评测真实策略 / 用仿真训练的策略直接上真机 |
| SIMPLER | — | 用数字孪生评测通用操作策略（Octo、RT-1X）的基准 |
| MMRV | Mean Maximum Rank Violation | 仿真与真机的策略排序是否一致，越低越好 |
| RLPD / RFCL | RL with Prior Data / Reverse Forward Curriculum Learning | 结合少量演示的在线模仿学习算法 |
| TD-MPC2 | Temporal Difference MPC 2 | 基于模型的 RL 基线 |

---

## ❓ 论文要解决什么问题？

1. **GPU 仿真只在行走任务上奏效**：Isaac Gym / MJX 让「用 RL 训行走」变得很便宜，但操作任务往往要看图像。现有框架要么不支持并行渲染，要么渲染慢、显存高，视觉 RL 训练太慢，不实用。
2. **每个并行环境只能是同一个场景**：想让策略泛化到不同物体、不同柜子，最好在同一批数据里同时见到它们。但以往 GPU 仿真要求所有并行环境的结构完全一样（同样的物体数、同样的自由度）。
3. **写 GPU 任务太难**：IsaacGymEnvs 要手动管理 GPU 缓冲区和索引，Isaac Lab 也只做到部分面向对象，取一个把手的位姿或一个关节角都要来回算下标。
4. **CPU 仿真的基准太慢**：RoboCasa、RLBench、OmniGibson、Habitat、AI2-THOR 只有 CPU 后端，比 GPU 方案慢几个数量级，研究者基本只能做模仿学习 / 运动规划，很难跑在线 RL。
5. **评测口径不统一**：不同框架对提前终止、成功 / 失败的定义各不相同（比如 Isaac Lab 里 termination 有时表示成功、有时表示失败），不同论文报的数字没法直接比。

---

## 🔧 方法拆解

**① GPU 并行仿真 + 并行渲染（核心卖点）**
- 物理在 PhysX GPU 上批量步进；渲染用 SAPIEN 的**并行光栅化渲染器**，一次批量输出所有环境的 RGB / 深度 / 分割，还可以直接输出点云和体素；
- 系统设计上尽量减少 Python / PyTorch 的额外开销，观测、奖励、动作全程都是 GPU 上的 `torch.Tensor`，不经过 CPU；
- 因为渲染便宜，可以做新的视觉域随机化：1024 个并行环境里每个环境的相机内外参、物体纹理都可以不同；
- 另外提供不并行的光线追踪模式，用于高质量渲染。

**② 异构 GPU 仿真**
- 每个并行子场景可以各自构建不同的物体（`builder.set_scene_idxs([i])`），再用 `Actor.merge` / `Articulation.merge` 合成一个批量视图，任务代码像操作单个物体一样操作一整批；
- 例子：OpenCabinetDrawer 里每个环境是不同的 PartNet-Mobility 柜子（自由度各不相同），PickClutterYCB 里每个环境的 YCB 物体数量都不同。

**③ 面向对象的统一 API**
- Articulation → Link → Joint → Mesh 全部是对象，属性都是批量张量（例如 `drawer_link.joint.qpos`）；
- 位姿是批量的 `Pose` 对象，支持链式调用（`pose_a * pose_b.inv()`）；
- 机器人直接读 URDF / MJCF，并提供可在运行时切换的 GPU 并行控制器（关节位置控制，以及基于 PyTorch Kinematics 的 IK 末端控制）。

**④ 12 类任务，20+ 机器人**
- 桌面操作、移动操作、房间级场景（ReplicaCAD / AI2-THOR）、四足 / 人形行走、人形 / 双臂操作、多机器人协作、绘画 / 清洁、灵巧手、视触觉、经典控制、数字孪生、软体；
- 人形相关：Unitree H1 / G1 的行走与操作任务。为了训练快，有些操作任务把腿固定住，也提供全关节可控的版本。

**⑤ 演示数据与基线**
- 演示来源分三级：简单任务用运动规划脚本，有密集奖励的任务用收敛的 RL 策略，难任务先遥操作约 10 条，再用 RFCL / RLPD 在线模仿学出策略，然后批量生成演示；
- 轨迹回放工具可以换观测模式（state ↔ rgbd）和动作空间（关节位置 ↔ 末端增量位姿）；
- 基线分四类：追求墙钟时间的 RL、追求样本效率的 RL（PPO / SAC / TD-MPC2）、离线模仿学习（BC / Diffusion Policy）、在线模仿学习（RLPD / RFCL）。

**⑥ 统一评测口径**
- 评测时**不提前终止**，统一记录 `success_once`、`success_at_end`、`fail_once`、`fail_at_end`、回报和回合长度；
- IL 结果会标注演示数量、演示类型（神经网络 / 运动规划 / 人类）和具体来源，因为这些对 BC 类算法的结果影响很大。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DEF["🧩 任务定义（统一 API）"]
        ROBOT["机器人<br/>URDF / MJCF · 20+ 款<br/>(Panda / H1 / G1 / 四足 / 灵巧手)"]
        TASK["任务类 BaseEnv 子类<br/>_load_scene · _initialize_episode<br/>evaluate · compute_dense_reward"]
        HET["异构子场景<br/>set_scene_idxs → Actor/Articulation.merge"]
    end

    subgraph GPU["⚡ SAPIEN on GPU（N 个并行环境）"]
        PHYS["PhysX GPU 批量物理步进"]
        REND["并行光栅化渲染<br/>RGB / 深度 / 分割 / 点云 / 体素"]
        DR["视觉域随机化<br/>每个环境的相机内外参、纹理都不同"]
    end

    subgraph DATA["📦 数据来源"]
        MP["运动规划脚本"]
        RLD["收敛的 RL 策略"]
        TELE["~10 条遥操作 → RFCL / RLPD"]
        REPLAY["轨迹回放 / 转换<br/>观测模式 · 动作空间"]
    end

    subgraph LEARN["🧠 基线（torch 向量化）"]
        RL["RL：PPO / SAC / TD-MPC2"]
        IL["IL：BC / Diffusion Policy<br/>在线 IL：RLPD / RFCL"]
    end

    EVAL["📏 统一评测包装器<br/>不提前终止 · success/fail once & at end"]
    OUT["✅ 应用<br/>分钟级视觉 RL · Sim2Real（PickCube 真机 95%）<br/>Real2Sim（SIMPLER 相关系数 0.93）"]

    ROBOT --> TASK
    HET --> TASK
    TASK --> PHYS
    PHYS --> REND
    DR --> REND
    REND --> RL
    PHYS --> RL
    MP --> REPLAY
    RLD --> REPLAY
    TELE --> REPLAY
    REPLAY --> IL
    RL --> RLD
    RL --> EVAL
    IL --> EVAL
    EVAL --> OUT

    style DEF fill:#fff7e0,stroke:#d4a017
    style GPU fill:#eef6ff,stroke:#2e86de
    style DATA fill:#f3eafe,stroke:#8e44ad
    style LEARN fill:#fdecea,stroke:#c0392b
    style OUT fill:#eafaf1,stroke:#27ae60,color:#1b1b1b
</div>

---

## 🖥️ 源码运行时序（haosulab/ManiSkill）

> 以 `examples/baselines/ppo/ppo.py` 在 `PickCube-v1` 上训练为例，函数名取自 `mani_skill/envs/sapien_env.py`（`BaseEnv`）、`mani_skill/envs/scene.py`（`ManiSkillScene`）、`mani_skill/vector/wrappers/gymnasium.py`（`ManiSkillVectorEnv`）和 `mani_skill/envs/tasks/tabletop/pick_cube.py`。所有环境都在同一个进程、同一块 GPU 上，靠批量张量并行，而不是多进程向量化。

<div class="mermaid">
sequenceDiagram
    participant PPO as ppo.py（训练脚本）
    participant Vec as ManiSkillVectorEnv
    participant Env as BaseEnv / PickCubeEnv
    participant Scene as ManiSkillScene
    participant PX as PhysX GPU + SAPIEN 渲染

    PPO->>Env: gym.make("PickCube-v1", num_envs=N, sim_backend="physx_cuda")
    PPO->>Vec: ManiSkillVectorEnv(envs, N, ignore_terminations, record_metrics=True)
    PPO->>Vec: reset(seed)
    Vec->>Env: reset(seed, options)
    Env->>Env: _reconfigure()：_setup_scene()
    Env->>Env: _load_agent() · _load_scene()（桌面 / 方块 / 目标球）
    Env->>Scene: _setup(enable_gpu=True)
    Scene->>PX: px.gpu_init() · gpu_apply_* · _gpu_fetch_all()
    Env->>Env: _setup_sensors() · _initialize_episode(env_idx)
    Env->>Scene: _gpu_apply_all() · gpu_update_articulation_kinematics()
    Env-->>Vec: obs（GPU 张量，形状 N×…）

    loop 每个 rollout 步
        PPO->>Vec: step(action[N, act_dim])
        Vec->>Env: step(action)
        Env->>Env: _step_action()：agent.set_action()
        Env->>PX: gpu_apply_articulation_target_position()
        loop sim_steps_per_control 次
            Env->>Scene: scene.step() → px.step()
        end
        Env->>Scene: _gpu_fetch_all()
        Env->>Env: get_info() → evaluate()（success / fail）
        Env->>Env: get_obs()（视觉模式下 update_render + capture_sensor_data）
        Env->>Env: get_reward() → compute_dense_reward()
        Env-->>Vec: obs, reward, terminated, truncated, info
        opt 有环境结束 且 auto_reset
            Vec->>Env: reset(options={env_idx: 结束的环境})（只重置这几个）
        end
        Vec-->>PPO: obs, reward, done, infos（含 success_once / success_at_end）
    end
    PPO->>PPO: GAE + PPO 更新（全程张量留在 GPU）
</div>

---

## 💡 核心贡献

1. **最快的「状态 + 视觉」GPU 并行仿真**：仿真 + 渲染最高 30,000+ FPS，比其他平台快 10–1000 倍，显存省 2–3 倍，视觉 RL 从小时级缩短到分钟级。
2. **异构 GPU 仿真**：据论文所述是唯一支持在各并行环境中放不同物体、不同自由度铰接体和不同场景的框架，可以一次在整个 YCB 或 PartNet-Mobility 数据集上训练。
3. **覆盖最广的 GPU 任务集**：12 类任务、20+ 款机器人，共用同一接口，并提供添加新任务 / 新机器人的教程。
4. **面向对象的批量 API**：从铰接体到网格都是对象，位姿可以链式运算，省去大量下标操作。
5. **演示 + 基线 + 统一评测**：百万帧级演示、四类 RL / IL 基线，评测时统一记录 once / at end 两种成功 / 失败指标。
6. **Sim2Real 与 Real2Sim 都做了验证**：PickCube 纯仿真训练的点云策略在真机上成功率 95%；SIMPLER 的 4 个数字孪生任务移植过来后，评测速度约为原实现的 10 倍。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 仿真 + 渲染速度 | 单个 128×128 相机、每 2 个物理步渲染一次，并行输出 RGB / 深度 / 分割，最高 30,000+ FPS |
| 对比 Isaac Lab（Cartpole，640×480） | 128 个并行环境：ManiSkill3 显存 **4.4 GB** vs Isaac Lab **14.1 GB**；Isaac Lab 超过 128 个环境后显存不够 |
| 真实数据集相机设置 | Open-X（1×640×480）和 DROID（3×320×180）设置下，ManiSkill3 约快 2 倍、显存省 2–3 倍 |
| 相机尺寸消融 | 小分辨率 + 大量环境时 Isaac Lab 最多快约 1.2 倍；分辨率越大，ManiSkill3 优势越明显（速度约 2 倍，显存约 3 倍） |
| PPO 训练（RTX 4090，PickCube） | 状态输入和 128×128 RGB 输入的训练都比 ManiSkill2 CPU 仿真快约 5 倍（墙钟时间） |
| Sim2Real | 纯仿真训练的 PointNet + PPO 抓方块，真机 50 cm × 50 cm 工作区成功率 **95%** |
| Real2Sim（SIMPLER 4 个任务） | 评测 Octo / RT-1X：仿真与真机成功率相关系数 **0.9284**，MMRV **0.0147**，比原 SIMPLER 实现快约 10 倍，是真实世界的 60–100 倍速 |

> ⚠️ 论文也说明，与 Isaac Lab 的渲染对比不完全对等：Isaac Lab 用光线追踪，ManiSkill3 用光栅化。上表数值取自论文正文与附录 B，具体以 RSS 正式版为准。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **人形操作的视觉 RL** | 人形上半身操作多半要靠视觉，ManiSkill3 让从像素训练 RL 的成本大幅下降；H1 / G1 的双臂操作任务可以直接当起点 |
| **异构训练带来泛化** | 同一批数据里同时见到不同的柜子、杯子和场景，更适合训练「见过很多种物体」的操作策略，而不是只会处理单一物体的专才 |
| **视觉域随机化** | 并行环境各用不同相机位姿和纹理，是头部 / 腕部相机策略做 sim-to-real 的关键；人形头部相机位置会随步态晃动，这种随机化正好用得上 |
| **与 Isaac Lab / MuJoCo Playground 的分工** | 人形全身行走的社区生态仍以 Isaac Lab 和 MJX 为主；ManiSkill3 的长处在操作、异构场景和并行渲染，本板块的 ManiSkill-HAB 就建在它上面 |
| **局限** | 同样基于 PhysX，接触精度和 Isaac 同级；人形全身 loco-manipulation 任务相对较少；非并行模式下才有光线追踪，并行渲染的真实感不如光追 |

---

## 🎤 面试参考

**Q：ManiSkill3 和 Isaac Lab 最大的区别是什么？**
A：两者都用 PhysX GPU 做物理，但 ManiSkill3 基于开源的 SAPIEN，用并行光栅化渲染，在常见相机分辨率下更快、显存更省；它还支持异构仿真，各并行环境可以放不同的物体和场景。Isaac Lab 依赖闭源的 Isaac Sim，渲染走光线追踪，行走类任务的生态更成熟。

**Q：「异构 GPU 仿真」为什么难，ManiSkill3 怎么做？**
A：GPU 批量仿真要求数据按固定形状排进大张量，不同物体数、不同自由度会打乱下标。ManiSkill3 让每个子场景单独构建自己的物体（`set_scene_idxs`），再用 `Actor.merge` / `Articulation.merge` 包成一个批量视图，并在底层管理每个对象在 GPU 缓冲区里的下标，任务代码就不用关心这些下标了。

**Q：为什么要区分 success_once 和 success_at_end？**
A：有的策略中途做成过一次，最后又弄砸了（比如抓起来又掉了）。success_once 相当于「成功就提前终止」的口径，success_at_end 看最后一步是否仍然成功。两个都报，才能避免不同终止设置下的数字混在一起比较。

---

## 🔗 相关阅读

- [ManiSkill2: A Unified Benchmark for Generalizable Manipulation Skills (2302.04659)](https://arxiv.org/abs/2302.04659)：前代，CPU 仿真 + 统一操作基准
- [ManiSkill-HAB: A Benchmark for Low-Level Manipulation in Home Rearrangement Tasks (2412.13211)](https://arxiv.org/abs/2412.13211)：基于 ManiSkill3 的家居重排基准（同板块）
- [MuJoCo Playground (2502.08844)](https://arxiv.org/abs/2502.08844)：MJX 路线的 GPU 仿真框架（同板块）
- [RoboCasa: Large-Scale Simulation of Everyday Tasks for Generalist Robots (2406.02523)](https://arxiv.org/abs/2406.02523)：CPU 仿真 + MimicGen 扩增的对照路线（同板块）
- [Evaluating Real-World Robot Manipulation Policies in Simulation (SIMPLER, 2405.05941)](https://arxiv.org/abs/2405.05941)：ManiSkill3 移植的 Real2Sim 评测基准
- [Orbit / Isaac Lab (2301.04195)](https://arxiv.org/abs/2301.04195)：主要对比对象
