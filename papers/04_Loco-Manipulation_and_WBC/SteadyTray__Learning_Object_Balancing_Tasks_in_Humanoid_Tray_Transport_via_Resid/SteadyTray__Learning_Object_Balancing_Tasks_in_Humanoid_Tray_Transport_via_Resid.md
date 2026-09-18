---
layout: paper
paper_order: 26
title: "SteadyTray: Learning Object Balancing Tasks in Humanoid Tray Transport via Residual Reinforcement Learning"
zhname: "SteadyTray：用残差强化学习教人形机器人端着托盘稳稳走路"
category: "Loco-Manipulation and WBC"
---

# SteadyTray: Learning Object Balancing Tasks in Humanoid Tray Transport via Residual Reinforcement Learning
**SteadyTray：让 Unitree G1 端托盘走路不洒水的"残差师生 RL"**

> 📅 阅读日期: 2026-04-25
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 高动态平衡操作

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2603.10306](https://arxiv.org/abs/2603.10306) |
| **HTML** | [在线阅读](https://arxiv.org/html/2603.10306) |
| **PDF (arXiv)** | [下载](https://arxiv.org/pdf/2603.10306) |
| **项目主页** | [steadytray.github.io](https://steadytray.github.io) |
| **GitHub (官方)** | [AllenHuangGit/steadytray](https://github.com/AllenHuangGit/steadytray) |
| **作者主页** | [Anlun Huang](https://allenhuanggit.github.io/) |
| **发布时间** | 2026 年 3 月（arXiv） |
| **机构** | UC San Diego · Advanced Robotics and Controls Lab (ARCLAB) |
| **实验平台** | Unitree G1 (29-DoF) |
| **仿真器** | IsaacLab（训练）+ MuJoCo（Sim2Sim 验证） |
| **License** | Apache-2.0 |

**作者**: Anlun Huang, Zhenyu Wu, Soofiyan Atar, Yuheng Zhi, Michael Yip

---

## 🎯 一句话总结

SteadyTray 把"端托盘 + 走路"这件高耦合的活，**显式拆成两层 RL**：底层用一个稳健的人形行走策略当**老师**，上层挂一个**残差模块**专门抵消步态引起的末端抖动；通过四阶段课程（预训练 → 托盘微调 → 残差教师 → 学生蒸馏），在 Unitree G1 上做到 **96.9% 速度跟踪成功率 / 74.5% 抗扰鲁棒性**，并且**零样本** sim-to-real 落地真机。

---

## 📖 英文缩写速查

| 缩写 | 全称 | 简单解释 | 生活类比 |
|------|------|----------|----------|
| **ReST-RL** | Residual Student-Teacher RL | 残差师生强化学习 | 老师把粗活干完，徒弟负责"补微调" |
| **SteadyTray** | 论文方法名（也是 benchmark 名） | "稳托盘"任务套件 | 餐厅服务员训练手册 |
| **PPO** | Proximal Policy Optimization | 近端策略优化 | RL 里的"稳更新" |
| **RSL-RL** | ETH ASL/RSL 机器人学习库 | 行业常用的 PPO + 异步采样实现 | 机器人界的 stable-baselines |
| **IsaacLab** | NVIDIA Omniverse 物理仿真训练框架 | 大规模并行 GPU 仿真 | "万级机器人同时上学" |
| **MuJoCo** | Multi-Joint dynamics with Contact | 接触丰富的物理仿真器 | 接触模型最准的仿真器之一 |
| **Sim2Sim** | Simulation-to-Simulation | 跨仿真器迁移验证 | 换个考场再考一遍 |
| **Sim-to-Real** | Simulation to Real | 仿真到真机 | 训练场 → 实战 |
| **DAgger** | Dataset Aggregation | 在线师生蒸馏 | 老师跟着学生走，错了就纠 |
| **End-Effector** | 末端执行器 | 这里指端着托盘的双手 | 服务员的手 |
| **Domain Randomization** | 域随机化 | 仿真里随机化物理/视觉参数 | 故意把考题打乱 |

---

## ❓ 要解决什么问题

### 1. "端着东西走" 是一个被严重低估的难点
人形机器人在非结构化环境里要做家务/送餐/搬运等任务，必经一关：

> **手里端着没有固定夹紧的物体**（杯水、汤碗、零件托盘），双足动态行走会带来周期性身体晃动，物体很容易**侧翻、倾倒、滑落**。

这件事看上去简单，但本质上是一个**高耦合控制问题**——下肢的步态周期会从腰、肩、肘一路传递到手腕，把端在手里的物体推得哗啦响。

### 2. 端到端 RL 在这个任务上不好使
直接用一个大的 monolithic 策略去同时学"走路 + 托盘平衡"，会出两类问题：

- **行走能力被破坏**：为了稳住托盘，策略学会"小碎步、像踮脚走"，速度跟踪、抗扰能力都退化
- **托盘姿态不稳定**：端到端策略很难精细学到"步态相位 → 末端抖动"的映射，物体仍然抖

### 3. 现有方法要么牺牲移动性，要么牺牲精度
- 经典做法：低速行走 + 强力 IK，把速度压到很低
- 模仿学习：拿不到真人"端水走路"的高质量数据
- 端到端 RL：奖励函数难调，稳定性 / 速度 / 抗扰难以兼得

> 💡 **类比**：就像让一个人**第一次学走路**和**第一次学端汤**同时进行——一定双输。SteadyTray 的核心思路是：**先学会走路**，再请一个"专门盯着汤碗"的小副官，在走路命令上做微调。

---

## 🔧 方法详解：ReST-RL 的"残差师生"架构

### 总览

```
┌──────────────────────────────────────────────────┐
│  Base Locomotion Policy   (Teacher, frozen)      │
│  · 任意速度命令下的稳健双足行走                  │
│  · 学时是冻结的，专注于行走稳定                  │
└──────────────────────────────────────────────────┘
                    ↓ base action a_base
┌──────────────────────────────────────────────────┐
│  Residual Module          (Trainable)            │
│  · 输入：本体感觉 + 托盘姿态 + 步态相位          │
│  · 输出：动作残差 Δa（特别瞄准上肢/腰）          │
│  · 目标：抵消步态对末端的周期扰动                │
└──────────────────────────────────────────────────┘
                    ↓ a = a_base + Δa
                ┌─────────────────────┐
                │ Unitree G1 (29-DoF) │
                └─────────────────────┘
```

### 核心思想：Residual = "保留好习惯 + 补一个小修正"

设基础策略输出动作 $a _ {\text{base}} = \pi _ {\text{base}}(s)$，残差模块输出 $\Delta a = \pi _ {\text{res}}(s, p _ {\text{tray}}, \phi _ {\text{gait}})$，最终关节命令为：

$$
a = a_{\text{base}} + \Delta a
$$

- 这样一来：**主行为由 frozen 老师保证**，新增的"端托盘"目标只能通过残差影响输出，避免破坏底层行走
- 残差通常比 $a _ {\text{base}}$ 小几个量级，**安全且训练高效**

### 4 阶段训练课程

SteadyTray 把整个训练流水线显式拆成四步（命令名 = 仓库 task 名）：

| 阶段 | task name | 任务 | 训练对象 |
|:---:|------|------|------|
| **Stage 1** | `G1-Steady-Tray-Pre-Locomotion` | 学纯行走（上肢冻结） | 基础行走策略 |
| **Stage 2** | `G1-Steady-Tray-Tray-Finetune` | 在行走基础上加托盘奖励微调 | 行走策略再学一点托盘相关行为 |
| **Stage 3** | `G1-Steady-Object-Residual-Teacher` | 训练**特权**残差教师，专攻物体平衡 | 残差教师（带特权信息） |
| **Stage 4** | `G1-Steady-Object-Distillation` | 把特权教师**蒸馏**为可部署学生 | 学生策略（无特权，可跑真机） |

> 🔑 关键点：教师**带特权信息**（物体物理参数、精确接触状态等），学生**只用机载可观测**，通过 DAgger / 在线蒸馏迁移。

### 残差模块的输入设计
- **本体感觉 (proprio)**：关节位置 / 速度 / IMU
- **托盘 / 物体状态**：姿态、与重心的相对位置、滑动趋势
- **步态相位**：底层步态的相位角，让残差知道"现在是落地相还是腾空相"

### 奖励函数（论文主张的关键项）
- **行走奖励**：速度跟踪、姿态稳定、步频规整
- **托盘奖励**：托盘水平度、物体相对滑动量、物体位置惩罚
- **平滑性奖励**：动作幅度 / 抖动惩罚（不能让残差直接放飞）

### 部署：Sim-to-Real
- 训练用 IsaacLab + RSL-RL（PPO）+ 多 GPU
- 部署前 **Sim2Sim** 转 MuJoCo 验证：换个仿真器再考一遍，避免单一仿真器 overfitting
- 真机：Unitree G1 (29-DoF) **零样本** sim-to-real

---

## 🚶 具体实例："G1 端杯子走过来"

设定一个典型场景：G1 端着一杯没盖的水，从 A 走到 B，要求中途水不洒、杯子不翻。

1. **指令解析**：上层给定速度命令 $v_x = 0.6\,\text{m/s}$，腰部姿态命令"保持水平"
2. **Base 行走**：冻结的行走策略输出关节目标 $a _ {\text{base}}$，保证 G1 双足稳走
3. **残差感知**：残差模块拿到本体感觉 + 杯子姿态（仿真特权 → 真机用估计） + 步态相位 $\phi$
4. **残差出修正**：当腰随步态向左微微偏转，残差对应输出"右肩肘部小补偿"，保持托盘水平
5. **关节命令合成**：$a = a _ {\text{base}} + \Delta a$
6. **PD 跟踪 → 扭矩**：底层关节 PD 输出力矩驱动 G1
7. **闭环**：高频感知 → 残差更新；杯子越接近滑出，残差强度越大

最终的视觉表现：G1 端杯走起来肩膀**像有"防抖云台"**，下肢仍是大步流星的正常步态。

---

## 🧪 实验与结果

### 1）核心 benchmark：SteadyTray
论文同时贡献了一套 benchmark，覆盖：
- 不同速度命令下的稳定性
- 不同物体（杯/瓶/积木）下的泛化
- 外力扰动下的鲁棒性

### 2）核心数字（论文主张）
| 指标 | 数值 |
|------|------|
| 变速跟踪成功率 | **96.9%** |
| 抗外力扰动鲁棒性 | **74.5%** |
| 步态平滑度 | 显著优于 end-to-end 基线 |
| 末端姿态精度 | 显著优于 end-to-end 基线 |
| Sim-to-Real | Unitree G1 **零样本** |

### 3）消融 / 主张
- **去掉残差模块（纯 monolithic RL）**：步态平滑度下降，托盘姿态显著抖动
- **去掉特权教师 / 直接训学生**：训练效率与最终性能都明显退化
- **跳过 Stage 1 / 2 行走预训练**：行走稳定性下降，端托盘行为也跟着崩
- **跳过 Sim2Sim 验证**：会发现某些 IsaacLab 中调好的策略在 MuJoCo 上行为偏移，提示了仿真器迁移的重要性

### 4）对比基线
- End-to-End PPO（同样观测、同样奖励，但没有残差结构）
- 单阶段课程（不分预训练 / 微调 / 教师 / 蒸馏）

---

## 📁 源码对照（AllenHuangGit/steadytray）

### 1. 安装思路
- 两个仓库：**自定义版 IsaacLab fork** + **SteadyTray 主仓**
- 推荐 Docker 容器，里面 `pip install -e .` 安装 SteadyTray 包，再装 git lfs / tmux 等工具
- 训练后端：**RSL-RL**（PPO） + 多 GPU 分布式

### 2. 训练命令（四阶段示例）

```bash
# Stage 1：基础行走（冻结上肢）
python scripts/rsl_rl/train.py \
    --task G1-Steady-Tray-Pre-Locomotion \
    --num_envs 4096 --headless --max_iterations 10000

# Stage 2：托盘奖励微调
python scripts/rsl_rl/train.py \
    --task G1-Steady-Tray-Tray-Finetune \
    --num_envs 4096 --headless --max_iterations 10000

# Stage 3：残差教师（特权信息）
python scripts/rsl_rl/train.py \
    --task G1-Steady-Object-Residual-Teacher \
    --num_envs 4096 --headless --max_iterations 10000

# Stage 4：学生蒸馏（无特权 / 可部署）
python scripts/rsl_rl/train.py \
    --task G1-Steady-Object-Distillation \
    --num_envs 4096 --headless --max_iterations 10000
```

### 3. 推理与部署

```bash
# 用预训练模型做仿真回放
python scripts/rsl_rl/play.py \
    --task G1-Steady-Object-Distillation \
    --checkpoint "model/model_9999.pt"
```

- **Sim2Sim**：把训练好的策略迁到 MuJoCo 跑一遍，避免单仿真器 overfit
- **真机**：Unitree G1（29-DoF）零样本 sim-to-real，无需重训

### 4. 引用

```bibtex
@misc{huang2026steadytray,
  title={SteadyTray: Learning Object Balancing Tasks in Humanoid Tray Transport via Residual Reinforcement Learning},
  author={Huang, Anlun and Wu, Zhenyu and Atar, Soofiyan and Zhi, Yuheng and Yip, Michael},
  year={2026},
  eprint={2603.10306},
  archivePrefix={arXiv}
}
```

---

## 🏗️ 工程复现要点

| 环节 | 关键点 |
|------|--------|
| **底层行走老师** | 必须先单独训稳，且训练阶段 freeze，避免被托盘奖励"反向腐蚀" |
| **残差幅度** | 限幅 / 平滑惩罚是关键，否则残差自己变成"主策略"，原本走路也学坏 |
| **教师特权信息** | 物体物理参数、接触力等可在仿真里读，但学生只能依赖机载传感器 |
| **多阶段课程** | 不能跳；尤其 Stage 1 行走预训练丢了之后，托盘部分会牵连到走路 |
| **Sim2Sim 验证** | IsaacLab → MuJoCo，提前发现仿真器 overfit |
| **部署** | Unitree G1 零样本，实际真机里物体类型/形状泛化是亮点 |

---

## 🤖 工程价值

- **范式上**：把"操作 + 移动"显式分层，**冻结底层 + 残差上层**，给 loco-manipulation 提供了一个非常工程友好的训练秘方
- **数据上**：完全 RL（无需真人示范），但通过**师生 + 蒸馏**让训练可以利用特权信息又不影响真机可部署
- **泛化上**：在多种物体、多种速度、外力扰动下保持 70%+ 鲁棒，已经接近落地餐饮 / 家政场景的门槛
- **开源上**：训练流水线、benchmark 任务、Sim2Sim 部署 code 全都给出，社区可以直接对其他人形（H1、Tien Kung 等）复现
- **延伸**：残差思路可以推广到"端着抹布擦桌子""端着锅热菜走"等更多 contact-rich 操作场景

---

## 🎤 面试高频 Q&A

1. **为什么要把行走和端托盘拆成两层，而不是一个端到端 RL？**
   - 端到端策略会**用牺牲行走能力换托盘稳定**：步幅变小、速度跟踪退化。SteadyTray 的核心论证是：**行走是个已经被解决得很好的子问题，不该在端托盘任务里重新学一遍**。

2. **Residual 模块为什么不会破坏底层行走？**
   - 老师策略是 **frozen** 的；残差被限幅 + 平滑惩罚 + 阶段课程，最终幅度远小于基础动作；行为上更像"防抖云台"。

3. **特权教师的"特权"是什么？为什么需要蒸馏？**
   - 特权信息：物体精确姿态、接触力、物理参数等仿真里可拿、真机不可拿的量。教师用它训练**接近最优**的残差策略；之后通过 DAgger / 在线蒸馏，把这套能力压缩到只用机载观测的学生策略，确保 sim-to-real 可部署。

4. **96.9% / 74.5% 是怎么测的？**
   - 96.9% 来自变速命令下的稳定通过率；74.5% 来自外力扰动场景下不掉物体的成功率。两者都是相对 end-to-end PPO 等基线的显著领先。

5. **为什么需要 Sim2Sim（IsaacLab → MuJoCo）这一步？**
   - 防止策略 overfit IsaacLab 的接触模型。MuJoCo 的接触/摩擦特性与 IsaacLab 不同，能跑通 MuJoCo 一般也能跑通真机，是一道便宜又有效的"二审"。

6. **能不能把这一套搬到 H1 / Tien Kung / 其他人形？**
   - 理论上可以，残差结构对底层行走老师是黑盒接口；只需替换 base policy 与机器人 URDF，然后重跑 Stage 2-4 即可。论文目前只验证了 G1。

7. **和经典 hierarchical RL / options framework 的区别？**
   - 这里的"分层"不是离散 option 选择，而是**动作空间的连续叠加**（base + residual）；属于 residual policy 学派，更接近 ResMimic、RobotDancing、COMPASS 等近期工作。

---

## 🔗 与路线图其他论文的关联

| 论文 | 关系 |
|------|------|
| **ResMimic** | 同样采用残差结构，但聚焦 motion tracking 整体；SteadyTray 把残差做到上肢/平衡这一具体任务 |
| **RobotDancing** | 残差动作思路相似，目标是长程动作跟踪；SteadyTray 关注"端托盘"这种具体 loco-manipulation |
| **COMPASS** | 残差 RL + 跨形态导航；SteadyTray 在"操作—移动耦合"上做更细粒度的拆分 |
| **GentleHumanoid** | 同为接触丰富的 loco-manipulation，强调上肢柔顺；SteadyTray 强调上肢"防抖" |
| **LATENT** | 同期高动态体育技能（网球）的代表；与 SteadyTray 一起说明**人形高动态任务正从"会走"迈向"会一边走一边精细操作"** |
| **Ψ₀** | 通用人形 VLA 基础模型；SteadyTray 这种**任务专精的残差策略**可以作为 Ψ₀ 这类基础模型在专门任务上的微调起点 |

---

## 📎 参考来源

- arXiv 论文页：[https://arxiv.org/abs/2603.10306](https://arxiv.org/abs/2603.10306)
- HTML 版：[https://arxiv.org/html/2603.10306](https://arxiv.org/html/2603.10306)
- PDF：[https://arxiv.org/pdf/2603.10306](https://arxiv.org/pdf/2603.10306)
- 项目主页：[https://steadytray.github.io](https://steadytray.github.io)
- 源码：[https://github.com/AllenHuangGit/steadytray](https://github.com/AllenHuangGit/steadytray)
- 第一作者主页：[https://allenhuanggit.github.io/](https://allenhuanggit.github.io/)
- 实验室：[UCSD ARCLAB](https://ucsdarclab.com/)

> 📝 **备注**：本笔记基于公开资料（arXiv 摘要、官方 GitHub README、项目主页、相关综述报道）整理。具体网络结构超参（残差网络层数、特权信息维度、蒸馏 loss 权重等）以 arXiv PDF 与官方仓库代码为准。
