---
layout: paper
title: "Genesis: A Generative and Universal Physics Engine for Robotics and Beyond"
zhname: "Genesis：面向机器人及更广领域的生成式通用物理引擎"
category: "Simulation Benchmark"
---

# Genesis: A Generative and Universal Physics Engine for Robotics and Beyond
**Genesis：面向机器人及更广领域的生成式通用物理引擎**

> 📅 总结日期: 2026-10-03
>
> 🏷️ 板块: 11 Simulation Benchmark · GPU 并行仿真 · 多物理耦合 · 可微仿真 · 光线追踪渲染 · 仿真评测
>
> 🔁 推进轨: 模块轮转（09_State_Estimation → ~~10_Sim-to-Real~~ → **11_Simulation_Benchmark**）· 10_Sim-to-Real 中上游 awesome-humanoid-robot-learning 收录的论文已全部有笔记（剩下的 1901.08652 已在 03_High_Impact_Selection 有笔记），顺延到 11；本模块上游仅剩 Genesis 这一条没有笔记

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 论文 | ⚠️ **没有 arXiv 论文 / PDF**。官方引用格式是 GitHub 仓库（`@misc{Genesis, ..., month = December, year = 2024}`）和 2026 年的技术博客 |
| HTML | [技术博客：The Role of Simulation in Scalable Robotics, Genesis World 1.0, and the Path Forward](https://www.genesis.ai/blog/the-role-of-simulation-in-scalable-robotics-genesis-world-10-and-the-path-forward)（Genesis AI Team，2026-05-27）· [文档](https://genesis-world.readthedocs.io/en/latest/) · [项目页](https://genesis-embodied-ai.github.io/) |
| PDF | 无（作者只发布了代码与博客） |
| **发布时间** | 2024-12-18 (GitHub · PyPI v0.2.0) · 2026-05-27 (Genesis World 1.0 blog) |
| 源码 | 🌟 [Genesis-Embodied-AI/genesis-world](https://github.com/Genesis-Embodied-AI/genesis-world)（原名 Genesis，Apache-2.0，`pip install genesis-world`，Python 3.10–3.13）· 编译器 [Quadrants](https://github.com/Genesis-Embodied-AI/quadrants) · 渲染器 [genesis-nyx](https://github.com/Genesis-Embodied-AI/genesis-nyx) |
| 作者 | Genesis Authors：最初是多所高校实验室的学术合作项目，现由 Genesis AI 公司维护 |

---

## 🎯 一句话总结

Genesis 想把机器人研究里分散的几样东西装进一个 Python 包：**多种物理求解器**（刚体 / 关节体、FEM、MPM、SPH、PBD、稳定流体）、**GPU 并行与可微**、**照片级渲染**，以及长期目标里的「**生成式数据引擎**」（用自然语言生成场景和任务，至今未完整开源）。2024 年 12 月首次发布时以「单张 RTX 4090 仿真 Franka 机械臂超过 4300 万 FPS」引起关注；到 2026 年的 **Genesis World 1.0**，团队给出的定位变了：**仿真首先是评测基础模型的工具**，先让仿真评测与真机结果高度相关，再考虑用仿真数据训练。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| MPM | Material Point Method | 物质点法，用于沙土、雪、弹塑性材料 |
| FEM | Finite Element Method | 有限元，用于弹性体、布料 |
| SPH | Smoothed Particle Hydrodynamics | 光滑粒子流体动力学，用于液体 |
| PBD | Position-Based Dynamics | 基于位置的动力学，快速布料 / 液体 |
| IPC | Incremental Potential Contact | 增量势接触，保证无穿透的接触模型 |
| SAP | Semi-Analytic Primal | Drake 风格的半解析原问题接触求解，配合 hydroelastic 接触 |
| MMRV | Mean Maximum Rank Violation | 平均最大排序违例，衡量仿真是否保持模型的真实排名（来自 SimplerEnv） |
| FID | Fréchet Inception Distance | 图像分布距离，这里用来衡量渲染与真实图像的差距 |

---

## ❓ 要解决什么问题？

1. **一个场景里往往不止一种物理**：真实操作同时涉及刚体机械臂、布料、液体、颗粒物，而常见机器人仿真器（Isaac Gym、MuJoCo 等）以刚体为主，软体 / 流体要么不支持、要么要另拼一个引擎。
2. **好用和快很难兼得**：GPU 并行仿真器通常需要 C++ / CUDA 知识或受限于特定硬件，研究者希望用纯 Python 写、在笔记本和集群上都能跑。
3. **真机评测是迭代瓶颈**（2026 博客的重点）：一次完整评测要几百个任务 × 每任务几百回合，真机上需要两百多小时；结果还受场地、操作员、硬件磨损影响，难以复现。
4. **仿真结果能否相信**：仿真评测只有在与真机结果高度相关时才有意义，这要求从执行器、控制时序、接触到渲染每一层都与真机对齐。

---

## 🔧 方法拆解

**① 统一多物理引擎**
- `Simulator` 里固定挂着 8 个求解器：Tool、Rigid、Kinematic、MPM、SPH、PBD、FEM、SF（稳定流体），没用到的求解器不激活；
- 刚体部分读 MJCF / URDF / USD（含 xacro、mimic 关节、等式约束），可同时放入 Unitree G1、各种灵巧手、夹爪等；
- 三种耦合器共用同一套场景 API，改一行配置即可切换：通用快速耦合器（Legacy）、Drake 风格 SAP 耦合器（hydroelastic 接触）、IPC 耦合器（无穿透接触，适合精细软体）；
- 异构并行：同一批并行环境里可以放不同物体、不同运动学树、不同布局。

**② Genesis World 1.0 新增的两项接触技术（博客）**
- **外部关节约束（External Articulation Constraint）**：扩展 libuipc，把关节空间动力学直接写进 IPC 的优化目标——刚体求解器先预测关节位移 $\tilde{\delta\theta}$ 和关节空间等效质量矩阵 $M_t$，再加一项动能 $K = \tfrac12 (\delta\theta - \tilde{\delta\theta})^\top M_t (\delta\theta - \tilde{\delta\theta})$ 与接触势垒一起最小化。没有接触时结果与关节体预测完全一致，有接触时按等效质量加权地最小程度偏离；
- **无势垒弹性动力学**：用增广拉格朗日替代 IPC 的对数势垒，每对接触引入松弛变量把 $c_i(x) \ge 0$ 变成等式，交替更新 $x$、$s_i$ 和乘子 $\lambda_i$。Hessian 在大应力下也保持良态，博客称接触密集场景比传统 IPC 最多快 103 倍，且仍保证无穿透。

**③ Quadrants 编译器**
- 约一年前从 Taichi 分叉：kernel 用普通 Python 写，JIT 编译到 CUDA、ROCm、Apple Metal、Vulkan 与 x86 / ARM64 CPU；
- 每个物理步录成一张 kernel 图（CUDA Graph），去掉逐 kernel 启动开销；16×16 分块的 Cholesky / 三角求解；首次调用时自动挑最快的 kernel 变体；三层编译缓存把启动从几分钟缩短到几秒；
- 反向模式自动微分在所有后端可用，张量通过 DLPack 与 PyTorch 零拷贝共享；博客称相对 fork 时在操作 / 行走基准上最多快 4.6 倍。

**④ Nyx 渲染器**
- 以路径追踪为基线，只在不影响策略所见图像的地方用光栅化捷径；目标是高端消费级 GPU 上 4 ms 内出一张无噪 1080p 图；
- HDRI 实测光照、扫描 / 摄影测量资产、3D Gaussian Splatting 补足网格重建不了的部分；由批量物理直接驱动，几千个并行回合各自有不同场景、光照与相机轨迹。

**⑤ 仿真评测流程（博客的核心观点）**
- 评测时**只用真机数据训练的策略**，训练和评测分开，避免「分数涨了其实只是更拟合仿真器」；
- 搭建仿真与真机同初始状态并排运行的装置，观测（图像、本体感受）可以来自仿真、真机或两者混合，一次换一个部件，把差距定位到物理、渲染、通信或控制某一层；
- 扰动按三类轴组织：视觉（光照、相机、背景）、行为（未见组合、物体摆放、机器人构型）、语义（指令改写、子任务顺序、视角），每次只改一个参数，统计相对名义设置的性能保持率。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph IF["🐍 仿真接口（纯 Python）"]
        ASSET["资产解析<br/>MJCF / URDF / USD / OBJ / GLB"]
        API["gs.Scene · add_entity · build(n_envs)<br/>传感器 · 控制器 · 异构并行环境"]
    end

    subgraph PHY["⚙️ 统一多物理引擎"]
        RIG["刚体 / 关节体"]
        DEF["FEM · MPM · SPH · PBD · 稳定流体"]
        CPL{"耦合器（一行切换）"}
        LEG["Legacy：通用快速"]
        SAP["SAP：hydroelastic 接触"]
        IPC["IPC：无穿透<br/>+ 外部关节约束<br/>+ 无势垒增广拉格朗日"]
    end

    subgraph REN["🎥 渲染"]
        NYX["Nyx 路径追踪<br/>目标 1080p ≤ 4 ms"]
        RAS["Luisa / Pyrender"]
    end

    subgraph CMP["🧮 Quadrants 编译器（Taichi 分支）"]
        BK["CUDA · ROCm · Metal · Vulkan · CPU"]
        AD["反向自动微分 · kernel 图 · 编译缓存"]
    end

    subgraph EVAL["📊 仿真评测（Genesis World 1.0）"]
        TWIN["数字孪生<br/>执行器 → 控制时序 → 接触 → 像素"]
        SBS["仿真 / 真机并排装置<br/>逐层定位差距"]
        AX["扰动轴：视觉 · 行为 · 语义"]
        COR["与真机相关性<br/>Pearson 0.90 · MMRV 0.017"]
    end

    ASSET --> API --> RIG & DEF
    RIG --> CPL
    DEF --> CPL
    CPL --> LEG & SAP & IPC
    PHY --> REN
    CMP -.编译所有 kernel.-> PHY
    CMP -.-> REN
    REN --> TWIN --> SBS --> AX --> COR
    NEXT["下一步：扩大仿真环境<br/>做 RL 后训练"]
    COR -.-> NEXT

    style IF fill:#fff7e0,stroke:#d4a017
    style PHY fill:#eef6ff,stroke:#2e86de
    style REN fill:#f3eafe,stroke:#8e44ad
    style CMP fill:#eafaf1,stroke:#27ae60
    style EVAL fill:#fdecea,stroke:#c0392b
</div>

---

## 🖥️ 源码运行时序（Genesis-Embodied-AI/genesis-world）

> 以仓库自带的 `examples/rigid/franka_cube.py`（Franka 抓方块）为例，函数名取自 `genesis/__init__.py`、`genesis/engine/scene.py` 与 `genesis/engine/simulator.py`（main 分支）。只有刚体且不需要梯度时，`Simulator.step()` 走「只推进刚体」的快速路径；多物理或 `requires_grad=True` 时走「预处理 → 耦合前 → 耦合 → 耦合后」的完整子步，并按子步保存检查点供 `_step_grad()` 反向使用。

<div class="mermaid">
sequenceDiagram
    participant User as franka_cube.py
    participant GS as genesis（gs）
    participant Scene as Scene
    participant Sim as Simulator
    participant Sol as 各求解器<br/>Rigid / FEM / MPM ...
    participant Cpl as 耦合器<br/>Legacy / SAP / IPC
    participant Vis as Visualizer / 传感器

    User->>GS: gs.init(backend=gs.cpu 或 gs.gpu)
    GS->>GS: qd.init()（Quadrants 选择后端）
    User->>Scene: gs.Scene(sim_options, rigid_options, viewer_options)
    Scene->>Sim: Simulator(...)：创建 8 个求解器 + 按选项选耦合器
    User->>Scene: add_entity(Plane / MJCF panda / Box)
    Scene->>Sim: _add_entity()：交给对应求解器
    User->>Scene: build(n_envs)
    Scene->>Scene: _parallelize()：批维度 B 与环境偏移
    Scene->>Sim: build()：统一子步数
    Sim->>Sol: solver.build()（分配批量缓冲区）
    Sim->>Cpl: coupler.build()
    Sim->>Vis: sensor_manager.build()
    Scene->>Sim: step()（首步：JIT 编译全部 kernel）
    Scene->>Vis: visualizer.build()

    User->>Sol: set_dofs_kp / kv · set_qpos · inverse_kinematics()
    loop 每个控制步
        User->>Sol: control_dofs_position(qpos)
        User->>Scene: step()
        Scene->>Vis: recorder_manager.step()
        Scene->>Sim: step()
        alt 只有刚体且不求梯度
            loop substeps
                Sim->>Sol: rigid_solver.substep(f)
            end
        else 多物理或可微模式
            Sim->>Sol: process_input()
            loop substeps
                Sim->>Cpl: preprocess(f)
                Sim->>Sol: substep_pre_coupling(f)
                Sim->>Cpl: couple(f)
                Sim->>Sol: substep_post_coupling(f)
                Sim->>Sim: save_ckpt()（每个检查点窗口一次）
            end
        end
        Sim->>Sol: rigid_solver.clear_external_force()
        Sim->>Vis: sensor_manager.step()
        Scene->>Vis: visualizer.update() · camera.update_recording()
    end
    opt requires_grad=True
        User->>Scene: _step_grad()
        Scene->>Sim: collect_output_grads() → _step_grad()<br/>load_ckpt → sub_step_grad（倒序）
    end
</div>

---

## 💡 核心贡献

1. **一个 Python 包里的多物理仿真**：8 类求解器共享场景与状态，三种耦合器可一行切换，覆盖刚体、弹性体、布料、颗粒、液体、气体。
2. **跨硬件的 GPU 并行与可微**：Quadrants 编译器让同一份 Python kernel 跑在 NVIDIA、AMD、Apple 与 CPU 上，反向自动微分在所有后端可用。
3. **面向机器人的渲染**：Nyx 以路径追踪为基线、由批量物理驱动，用于让策略看到接近真实相机的图像。
4. **两项接触算法**（2026）：把关节动力学写进 IPC 的外部关节约束，以及用增广拉格朗日替代对数势垒的无势垒弹性动力学。
5. **「先评测、后数据」的方法论**（2026）：先证明仿真评测与真机结果相关、能保持模型排名，再考虑仿真数据进入训练。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 速度（2024 首发 README） | 单张 RTX 4090 仿真 Franka 机械臂「超过 4300 万 FPS，比实时快 43 万倍」。这个数字发布后曾被社区质疑测试设置过于理想（场景几乎静止、碰撞简化），不宜直接与其他仿真器的接触密集任务吞吐对比 |
| 评测速度（2026 博客） | 几百个任务 × 每任务几百回合的完整评测，真机需两百多小时，仿真不到 0.5 小时，结果每次逐位一致 |
| 仿真-真机相关性 | 3 个规模不同的模型 × 14 个任务 × 每任务 200 回合，Pearson 相关 0.8996（95% CI [0.7439, 0.9314]），MMRV 0.0166（95% CI [0.0102, 0.0474]）；同一批模型的离线开环指标（动作预测 R²、MAE）区分不出真机表现差异 |
| 渲染差距 | 以 FID 衡量，现实差距比次优仿真器小 45%（博客未给出对比对象与数据集细节） |
| 接触求解 | 无势垒弹性动力学在复杂接触场景比传统 IPC 最多快 103 倍 |
| 编译器 | Quadrants 相对 fork 时在操作 / 行走基准上最多快 4.6 倍；编译缓存让启动快 10 倍以上 |

> ⚠️ 以上数字来自官方 README 与博客，没有经过同行评审的论文，也没有公开评测代码与任务集，引用时应注明来源。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **行走 RL 的另一个选择** | 仓库自带 Go2 行走等 RL 示例，与 Isaac Lab、MuJoCo Playground 一起成为人形 / 四足 RL 训练的候选后端；纯 Python、支持 Mac 本地调试是它的特点 |
| **软体与接触丰富操作** | 人形灵巧操作常碰到布料、液体、软物体，Genesis 的多物理耦合与 IPC 无穿透接触比纯刚体仿真器覆盖更广 |
| **仿真评测的方法论** | 「只用真机数据训练、在仿真里评测、用相关性与 MMRV 验证仿真可信度」这套做法可以直接借鉴到人形 VLA / 全身控制策略的评测上 |
| **可微仿真** | 跨后端可用的反向自动微分为系统辨识、轨迹优化、软体设计等提供了条件 |
| **局限** | 没有正式论文，大部分数字无法独立复现；首发时宣传的「生成式数据引擎」至今未完整开源；IPC 后端（pyuipc）只支持 Linux / Windows + NVIDIA；与 Isaac 生态相比，人形相关的现成环境和社区工作仍较少 |

---

## 🎤 面试参考

**Q：多物理仿真里「耦合器」负责什么？为什么要提供好几种？**
A：每个求解器只负责自己那类材料的时间积分，不同材料之间的接触和力交换由耦合器处理。不同耦合器在速度与精度之间取舍：通用耦合器最快但允许少量穿透；SAP 用凸优化求解柔顺接触，物理更准确；IPC 保证无穿透，适合布料、薄壳这类一穿透就会出错的物体，但计算最贵。

**Q：IPC 的对数势垒有什么问题，增广拉格朗日怎么解决？**
A：对数势垒在接触很紧时刚度趋于无穷，Hessian 变得病态，线搜索也要过滤步长，收敛慢。增广拉格朗日把非穿透不等式加松弛变量变成等式，靠更新拉格朗日乘子而不是不断加大罚刚度来满足约束，Hessian 保持良态，同时 CCD 返回的接触对都立即进入活跃集。

**Q：为什么 Genesis 团队主张先用仿真做评测、再用仿真做数据？**
A：如果训练和评测都在同一个仿真分布里，分数提升可能只是更拟合仿真器动力学，而不是模型真的变好。先用只靠真机数据训练的模型验证仿真评测与真机结果高度相关、能保持排名，确认仿真可信，再把仿真数据引入训练才有可靠的度量依据。

---

## 🔗 相关阅读

- [MuJoCo Playground](https://playground.mujoco.org/)：同板块，基于 MJX / MuJoCo Warp 的 GPU 并行机器人学习框架
- [ManiSkill3](https://www.maniskill.ai/)（arXiv 2410.00425）：同板块，GPU 并行仿真与渲染
- [ComFree-Sim](https://irislab.tech/comfree-sim/)（arXiv 2603.12185）：同板块，GPU 并行的解析接触物理引擎
- [Evaluating Real-World Robot Manipulation Policies in Simulation (SimplerEnv)](https://simpler-env.github.io/)（arXiv 2405.05941）：MMRV 指标与仿真评测相关性的出处
- [Taichi: a language for high-performance computation on spatially sparse data structures (SIGGRAPH Asia 2019)](https://dl.acm.org/doi/10.1145/3355089.3356506)：Quadrants 编译器的前身
- [RoboGen](https://robogen-ai.github.io/)（arXiv 2311.01455）：Genesis 首发 README 列出的生成式仿真相关工作
