---
layout: paper
title: "Retargeting Matters: General Motion Retargeting for Humanoid Motion Tracking"
zhname: "Retargeting Matters：面向人形运动跟踪的通用动作重定向"
category: "Motion Retargeting"
paper_order: 1
demos: ["gmr"]
---

# Retargeting Matters: General Motion Retargeting for Humanoid Motion Tracking
**把"人类动作 → 机器人动作"这一步做到好，是 RL tracking 能不能跟上的关键**

> 📅 阅读日期: 2026-04-19
>
> 🏷️ 板块: Motion Retargeting
>
> ℹ️ 笔记已核对 arXiv HTML 全文（2510.02252）+ `YanjieZe/GMR` GitHub 仓库（README、`DOC.md`、`TEST_MOTIONS.md`、核心代码）。论文独有的 ablation 数字、用户研究结论见下文「实验结果」。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2510.02252](https://arxiv.org/abs/2510.02252) |
| **GitHub** | [YanjieZe/GMR](https://github.com/YanjieZe/GMR) |
| **项目主页** | [jaraujo98.github.io/retargeting_matters](https://jaraujo98.github.io/retargeting_matters) |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2510.02252) |
| **会议** | **ICRA 2026**（README 已标注） |
| **发布时间** | 2025 年 10 月（arXiv） |
| **许可** | MIT License（代码） |
| **机构** | Stanford University（C. Karen Liu / Jiajun Wu 组） |
| **联系方式** | lastyanjieze@gmail.com（提交新机器人 / 新格式支持） |

**作者**: João Pedro Araújo, Yanjie Ze, Pei Xu, Jiajun Wu, C. Karen Liu

**一行定位**：TWIST 遥操 / GentleHumanoid / OmniXtreme 等一批工作**共用**的那个"人类动作 → 机器人动作"翻译器 —— 把它从藏在实验代码里的工具单独拎出来做成开源论文，并且发到了 ICRA 2026。

---

## 🎯 一句话总结

GMR 把"人类动作重定向到人形机器人"这件过去被各家方法**藏在附录里**的事情单独做成一个**通用、快速、CPU-only**的库，一条管线支持 18+ 款人形硬件与 5 种人体运动格式，让下游的 RL tracking / 遥操 / 模仿学习研究者可以**不重新造轮子**就拿到高质量的机器人参考动作。

> 🎮 **本文内嵌 1 段讲解动画**（不用装任何东西）：
> [七幕动画：GMR 全流程](#gmr-explainer-anim) —— 约 90 秒串完「retargeting 被当成前处理脚本 → 一条管线接 5 种格式 × 18+ 款机器人 → 论文的五步显式流程 → 非均匀局部缩放为什么是关键 → mink + DAQP 的两阶段约束 IK → Retargeting Matters 的定量论据 → 闭环、已知失败与源码落点」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 | 生活类比 |
|------|------|----------|----------|
| **GMR** | General Motion Retargeting | 本文方法 / 库的名字 | 一个通用的"动作翻译官" |
| **Retargeting** | Motion Retargeting | 把 A 骨架的动作搬到 B 骨架上 | 把姚明的舞步翻译给小学生跳 |
| **DOF** | Degree of Freedom | 自由度 | 一个关节能转几个方向 |
| **SMPL-X** | — | 参数化人体模型（含手指 / 表情） | 用一组数字描述人体的姿态 + 形状 |
| **AMASS** | Archive of Motion Capture as Surface Shapes | 大规模人体 mocap 数据集（统一到 SMPL） | mocap 的"大图书馆" |
| **OMOMO** | Object MOtion with human MOtion | 含人 - 物交互的 mocap 数据集 | 专门录"人和东西一起动"的库 |
| **BVH / FBX** | 标准动捕格式 | 另外两种常见 mocap 文件 | 不同工作室的"录音格式" |
| **LAFAN1** | Lafayette Animation Dataset | 常用动画 BVH 数据集 | 一份 BVH 格式的素材库 |
| **GVHMR** | 近年单目视频 → 人体 motion 方法 | 把手机视频转 SMPL 动作 | 视频 → 骨架的"视觉重建器" |
| **IK** | Inverse Kinematics | 逆运动学：从目标位姿解关节角 | "手要摸到那里" → 算出每个关节转多少 |
| **TWIST** | Teleoperated Whole-body Imitation System | 同组的遥操框架，直接使用 GMR | GMR 的头号"用户"工作 |
| **RL tracking policy** | — | 让机器人跟着一段参考动作跑的 RL 策略 | 让机器人跟拍子跳舞的"训练好的演员" |
| **CPU-only** | — | 不依赖 GPU / CUDA | 普通笔记本也能跑 |

---

## 🎬 七幕动画：GMR 全流程 {#gmr-explainer-anim}

<div class="paper-demo" data-demo="gmr-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（问题定义、方法详解、实验结果）按小节收起，再往后的具体实例、工程价值、源码对照、面试参考、讨论记录与附录各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；两阶段 IK 的流程图留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。

---

## ❓ Retargeting Matters 要解决什么问题？

这篇论文标题里的 "Matters" 有点叫板味道。在 humanoid RL tracking 这条技术主线上：

### 问题 1：大家都把 retargeting 当"前处理脚本"，但它其实是瓶颈

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：默认流程长什么样，以及为什么这一步的质量决定下游 RL 跟不跟得上</summary>

很多 humanoid tracking 论文（OmniH2O / ExBody2 / OmniXtreme / GentleHumanoid 等）都有一条默认流程：

```
人类 mocap (SMPL-X) → [某种 retargeting 脚本] → 机器人关节轨迹 → RL tracking policy
```

作者观察到的痛点：**retargeting 这一步的质量直接决定下游 RL 能否跟得上**。如果翻译的参考动作本身就不可行（超过关节限制、脚穿地板、手臂自碰撞），RL 训练要么跟不上、要么跟上了但 sim-to-real 崩掉。

</details>

### 问题 2：每家论文都自己写 retargeting，配方互不兼容

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：OmniH2O / ExBody2 / OmniXtreme 各一套配方，换机器人就得重写</summary>

- OmniH2O 的 retargeting 参数化是自家定制的；
- ExBody2 的有自己的 loss；
- OmniXtreme 的又是另一套；
- 搞到研究者每做一个新机器人 / 新数据集，都要重新写一遍。

</details>

### 问题 3：很多实现要 GPU 甚至 CUDA，部署不方便

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：遥操现场带台笔记本就办不成事</summary>

在"带笔记本到实验室做遥操 demo"这种场景里，GPU 依赖是个障碍。

</details>

### GMR 的回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：通用 / 快速 / CPU-only / 全开源：一条命令、18+ 款机器人、60–70 FPS</summary>

一套**通用、快速、CPU-only、全开源**的管线：

- 一条命令把 SMPL-X / BVH / FBX / Xsens / GVHMR 的人体动作翻译到 18+ 款人形机器人。
- 单 CPU 60–70 FPS（Ryzen Threadripper） / 35–45 FPS（i9-13900K），实时遥操没压力。
- MIT 协议，配合 TWIST 遥操系统发布，后续 GentleHumanoid / OmniXtreme 等都把 GMR 作为默认 retargeting 工具。

</details>

---

## 🔧 方法详解

### 论文官方五步流程（arXiv 全文）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：五步各做什么，以及为什么第 ③ 步非均匀局部缩放是关键创新</summary>

GMR 把 retargeting 分解为**五个显式步骤**，与大多数隐式 IK 脚本相比，每一步的目标和约束都可单独检查：

| 步骤 | 名称 | 做什么 |
|------|------|--------|
| 1 | **定义骨骼对应关系** | 手动指定人体骨骼 → 机器人 body 的语义映射（写成 YAML，一次性） |
| 2 | **对齐静止姿态旋转** | 修正人类 T-pose 与机器人静止姿态之间的坐标系偏差，避免所有帧都带系统性旋转偏差 |
| 3 | **非均匀局部缩放** ⭐ | 针对每条骨骼链分别估计长度比例，**不强行等比例缩放**；这是防止四肢比例差异导致 IK 解出大误差的关键创新 |
| 4 | **带旋转约束的 IK** | 在步骤 3 的缩放参考下，对关节角进行优化（mink + DAQP），施加关节限位约束 |
| 5 | **全约束精调** | 加入地面接触、自碰撞等更完整的约束，做一轮最终精修 |

> **关键创新点**：步骤 3 的**非均匀局部缩放（non-uniform local scaling）**。传统方法常用全局缩放因子或直接忽略比例差异，导致手臂短的机器人被要求"摆到人手那个位置"时解出极端关节角。GMR 分骨骼链各自估计比例，从根源上减少 IK 求解时的残差。

</details>

---

### 输入输出

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：输入格式、机器人规格、输出 .pkl 的三张表</summary>

| 部件 | 内容 |
|------|------|
| 输入 | 人类 motion sequence（SMPL-X / BVH / FBX / Xsens / GVHMR，含 root 位姿 + 各骨骼旋转） |
| 机器人规格 | URDF / MJCF + 关节限位 + IK 配置表（18+ 款已内置于 `general_motion_retargeting/ik_configs/`） |
| 输出 | `.pkl` 文件：每帧的 `root_pos / root_quat / dof_pos`（关节角），可直接喂给 RL tracking 策略或 PD 控制器 |

</details>

### 核心管线：基于 mink 的两阶段约束 IK

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：求解器是谁、底层 QP 用什么</summary>

GMR 的 retargeting **不是黑盒**，而是一个**两阶段 IK 优化**，求解器是 [`mink`](https://github.com/kevinzakka/mink)（Kevin Zakka 的 MuJoCo IK 库），底层 QP 用 **DAQP**（默认）或 **quadprog**。

</details>

```
人体 motion 帧 (SMPL-X / BVH / ...)
        │
        ▼
┌──────────────────────────────┐
│ Stage 1: ik_match_table1     │  ← 先把 root + 主干骨骼对齐
│  (root, pelvis, torso, head) │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Stage 2: ik_match_table2     │  ← 再细化四肢和末端
│  (hands, feet, elbows, knees)│
└──────────────────────────────┘
        │
        ▼
机器人关节角序列 (dof_pos)
```

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：为什么非要分两阶段，不能一个 QP 解完</summary>

**两阶段的好处**：先锁定 root + 躯干的位姿，再去拟合手脚。如果一次性把所有 task 塞进同一个 QP，远端误差会拉着 root 漂移；分两步可以避免"为了把手放对而牺牲躯干姿态"。

</details>

### 关键超参（写死在 `motion_retarget.py`）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：lm_damping 0.5 / 3π rad/s / max_iters 10 / err < 0.001 / DAQP 五项</summary>

| 参数 | 取值 | 含义 |
|------|------|------|
| `lm_damping` | **0.5** | Levenberg-Marquardt 阻尼。值越大越稳但越慢；0.5 是经验调出来的折中 |
| 关节速度限位 | **3π rad/s** | 单次 IK 步的最大角速度（防止解出"瞬移" pose） |
| `max_iters` | **10** | 单帧最多 10 步 Newton 迭代 |
| 收敛阈值 | **error < 0.001** | 提前停止（10 步内达到即跳出） |
| QP 求解器 | `daqp` (默认) 或 `quadprog` | DAQP 在多约束下更快 |

</details>

### IK 配置表的 schema（DOC.md）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：接一款新机器人要手写的那 10–20 行 YAML 长什么样</summary>

每款机器人的 `ik_configs/*.yaml` 把"人体哪个骨骼 → 机器人哪个 body → 用多大权重对齐"写成一张表：

```yaml
# 示例条目（每个被对齐的机器人 body）
- body: pelvis              # 机器人 body 名
  human: pelvis             # 对应的人体骨骼名（SMPL-X / BVH）
  position_weight: 1.0      # 位置 task 权重
  rotation_weight: 1.0      # 旋转 task 权重
  position_offset: [0, 0, 0]      # 人体到机器人的局部偏移 (xyz)
  rotation_offset: [1, 0, 0, 0]   # 局部旋转偏移 (wxyz 四元数)
```

→ **接入新机器人的"一次性手工活"** 就是写这张表（每个机器人 ~10–20 行 YAML）。

</details>

### Forward kinematics：自研 PyTorch FK

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：为什么不用 MuJoCo 自带的 FK，自研那套支持哪些关节</summary>

`kinematics_model.py` 没有用 MuJoCo 自带的 FK，而是**自己实现了一套 PyTorch 版前向运动学**：
- 支持 0-DOF 固定关节、1-DOF hinge、3-DOF ball joint；
- 全程可微（虽然 retargeting 本身不需要梯度，但便于后续接其他可微管线）；
- CPU 上 batch 跑得动整段 motion，与 mink 的 Jacobian 求解互不打架。

</details>

### 与其他 retargeting 思路的对比

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一次 IK 全解 / 学习式 / 物理仿真 / 自写 LM 四条路线的差异</summary>

| 思路 | 代表工作 | GMR 的差异 |
|------|---------|-----------|
| 一次 IK 全解 | 大多数自家脚本 | GMR 用**两阶段 IK**避免远端 task 拖动 root |
| 基于学习的 retargeting | SkeletonPose 等 | GMR 选择**非学习路线**：确定性 + 速度 + 无需训练 |
| 物理仿真 + 策略跟随 | PHC 等把 RL 和 retargeting 混在一起 | GMR 只做 kinematic retargeting，RL 留给下游 |
| 自写 LM / SLSQP | OmniH2O 等的内嵌脚本 | GMR 复用 mink + DAQP，求解器经过 robotics 社区打磨 |

</details>

### 已知失败模式（来自仓库 `TEST_MOTIONS.md`）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：五类跟不好的动作，以及「接触丰富 + 大幅旋转」这个共性</summary>

仓库专门维护了一份"哪些 motion 当前 retarget 不好"的清单，是诚意满满的工程文档：

| 数据集 / 文件 | 失败现象 |
|----------------|----------|
| AMASS · `BMLrub/rub081/0031_normal_walk1` | 步态相位漂移 |
| AMASS · `KIT/3/walk_6m_straight_line` | 行走稳态被破坏 |
| DanceDB · 部分快速旋转片段 | 高频抖动 |
| CMU · `111/111_21` | "laying on ground—right arm wristed on G1"（地面支撑动作里手腕被卡住） |
| LAFAN1 · `dance1_subject2` | 大幅抛甩动作上肢失稳 |

→ 共性：**接触丰富 + 大幅旋转**的动作。这是显式 IK retargeting 的固有局限——没有物理一致性约束，碰到地面 / 自碰撞场景容易解出"几何上对、物理上崩"的姿态。论文层面的解法仍以孔后续的 RL tracking 阶段去补救为主。

</details>

---

## 🚶 具体实例（仓库脚本走通）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三条可复制的命令（SMPL-X → G1 / BVH → H1 / 可视化）与典型下游串接</summary>

<h3 id="例-1把-amass-中的一段-smpl-x-动作重定向到-unitree-g1">例 1：把 AMASS 中的一段 SMPL-X 动作重定向到 Unitree G1</h3>

```bash
conda create -n gmr python=3.10 -y
conda activate gmr
pip install -e .

python scripts/smplx_to_robot.py \
    --smplx_file data/amass/Dance_01.npz \
    --robot unitree_g1 \
    --save_path outputs/g1_dance_01.pkl \
    --rate_limit
```

输出：`outputs/g1_dance_01.pkl`，内容是一段与输入同帧率的 G1 关节角 + root 轨迹。

<h3 id="例-2把-lafan1-的-bvh-翻译成-unitree-h1-的参考动作">例 2：把 LAFAN1 的 BVH 翻译成 Unitree H1 的参考动作</h3>

```bash
python scripts/bvh_to_robot.py \
    --bvh_file data/lafan1/walk1_subject1.bvh \
    --robot unitree_h1 \
    --save_path outputs/h1_walk.pkl \
    --format lafan1
```

<h3 id="例-3可视化">例 3：可视化</h3>

```bash
python scripts/vis_robot_motion.py \
    --robot unitree_g1 \
    --robot_motion_path outputs/g1_dance_01.pkl
```

<h3 id="典型下游串接">典型下游串接</h3>

```
(手机 RGB 视频) --GVHMR--> (SMPL-X) --GMR--> (G1 关节角)
                                              └─► RL tracking policy
                                              └─► 真机 PD 控制器
```

</details>

---

## 📊 实验结果（arXiv 全文）

### 实验设置

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BeyondMimic 这个中性框架、LAFAN1 的 21 段、三个对比基线</summary>

| 项目 | 内容 |
|------|------|
| **被测机器人** | Unitree G1（唯一，ICRA 2026 版本局限之一） |
| **评估数据集** | LAFAN1（21 段多样动作序列） |
| **训练框架** | **BeyondMimic**（用于隔离 retargeting 效果，不依赖大量 reward 工程） |
| **对比基线** | PHC（开源）、ProtoMotions（开源）、Unitree 官方数据集（闭源基线） |
| **测试条件** | ① 纯仿真 ② 仿真 + domain randomization ③ 仿真 + ROS/MuJoCo |

> BeyondMimic 是刻意选择的"中性框架"——不针对特定 retargeter 调奖励，使 retargeting 质量的差异在 tracking 结果上被放大。

</details>

### 主要结论

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：GMR ≈ Unitree、21 段只有 3 段全对、三类 artifact、初始帧差 50+ 个百分点</summary>

| 结论 | 详情 |
|------|------|
| **GMR ≈ Unitree 基线，PHC 明显落后** | GMR 与 ProtoMotions 的 tracking success rate 接近闭源 Unitree 数据集；PHC 整体表现更差 |
| **21 段动作中仅 3 段全方法都完美** | 说明通用跟踪仍很难，大部分动作至少有一种方法跟不上 |
| **三类 artifact 显著降低策略鲁棒性** | ① 地面穿透（ground penetration）② 自碰撞（self-intersection）③ 关节值突变（sudden joint value jumps） |
| **初始参考帧选择影响巨大** | 同一段动作，不同初始 reference frame 可导致成功率差 **50+ 个百分点**（令人意外的发现） |
| **用户研究** | 20 名参与者打分：GMR 感知保真度介于 PHC 和 Unitree 基线之间，与定量结果一致 |

</details>

### "Retargeting Matters"的定量论据

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文核心主张那一句，以及它是怎么被验证的</summary>

> 论文核心主张："在不做大量 reward 工程的前提下，retargeting artifact 会实质性地阻碍策略跟踪某些动作。" 实验通过 BeyondMimic 框架验证了这一点——相同 RL 训练，换 retargeter 后成功率差异显著。

</details>

---

## 🤖 工程价值

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：对研究者 / 对 sim-to-real / 对整个 stack 的三层意义，以及本仓库里已引用 GMR 的笔记</summary>

1. **对研究者**：做人形 tracking / 遥操时**不再需要从零写 retargeting**，也不用从同行那里 copy 个别人自用的脚本。`pip install -e .` + 一行命令就能产出训练可用的参考动作。
2. **对 sim-to-real**：GMR 内置了关节限位 / 自碰撞等 feasibility 约束，比"一把 IK 解完就用"的脚本更容易让下游 RL 收敛，也更不容易在真机上崩。
3. **对整个 stack 的意义**：humanoid RL tracking 这条线有一个**长期没被单独命名的瓶颈**，GMR 的贡献就是**把这块砍下来单独发表**，让后续工作可以显式引用它、讨论它，而不是每篇论文都塞在附录 "retargeting details"。

本仓库中已引用 GMR 作为默认 retargeting 工具的笔记（表示本工具的工程辐射范围）：

| 笔记 | 如何引用 GMR |
|------|--------------|
| `04_Loco-Manipulation_and_WBC/GentleHumanoid` | 全部训练 / 视频 → 机器人链路使用 GMR 做 retargeting |
| `04_Loco-Manipulation_and_WBC/OmniXtreme` | 在"重定向工具"表中显式列 GMR |

</details>

---

## 📁 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：仓库目录树、三个入口脚本、.pkl 字段表、性能基准与支持的机器人 / 格式清单</summary>

仓库目录（实地核对）：

```
GMR/
├── assets/                              # 18+ 机器人 URDF / MJCF 资产
├── general_motion_retargeting/
│   ├── ik_configs/                      # 每款机器人一份 IK YAML（人体↔body 映射 + 权重）
│   ├── optitrack_vendor/                # OptiTrack FBX 解析
│   ├── utils/                           # 数学工具
│   ├── motion_retarget.py               # ★ 核心：mink + DAQP + 两阶段 IK
│   ├── kinematics_model.py              # ★ 自研 PyTorch FK
│   ├── data_loader.py                   # SMPL-X / BVH / FBX / Xsens / GVHMR 读入
│   └── ...（共 10 个 .py）
├── scripts/
│   ├── smplx_to_robot.py                # 入口：SMPL-X → robot
│   ├── bvh_to_robot.py                  # 入口：BVH → robot
│   └── vis_robot_motion.py              # 入口：可视化
├── third_party/poselib/                 # 骨架处理子库
├── DOC.md                               # IK 配置 schema 文档
├── TEST_MOTIONS.md                      # 已知失败动作清单（见上）
└── CLAUDE.md                            # 仓库自带的 AI 协作说明
```

| 入口脚本 | 作用 |
|----------|------|
| `scripts/smplx_to_robot.py` | SMPL-X → 机器人关节序列 |
| `scripts/bvh_to_robot.py` | BVH → 机器人关节序列 |
| `scripts/vis_robot_motion.py` | 可视化重定向结果 |
| `general_motion_retargeting/ik_configs/*.yaml` | 18+ 款人形的人体↔body 映射 + 权重 + 偏移 |

输出 `.pkl` 的字段（`data_loader.py`）：

| key | 含义 |
|-----|------|
| `root_pos` | (T, 3) 浮坐标 root 位置 |
| `root_quat` | (T, 4) wxyz 四元数 |
| `dof_pos` | (T, num_dof) 关节角 |
| `fps` | 帧率（与输入一致） |

性能基准（README 给出）：
- AMD Ryzen Threadripper 7960X：**60–70 FPS**
- Intel Core i9-13900K：**35–45 FPS**

支持的 18+ 款机器人（部分）：
Unitree G1 (29 DOF) · Unitree H1 (19 DOF) · Unitree H1-2 (27 DOF) · Booster T1 / K1 · Fourier N1 / GR3 · Berkeley Humanoid Lite · HighTorque Hi · PAL Talos · Galaxea R1 Pro · Kuavo S45 · ...（完整列表见仓库 README）。

支持的输入格式：
- **SMPL-X**：AMASS / OMOMO
- **BVH**：LAFAN1 / Nokov
- **FBX**：OptiTrack
- **Xsens MVN**
- **GVHMR**（单目视频）

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：六问六答：为什么值得单独发、为什么 CPU-only、和 PHC 的区别、为什么用 mink、为什么非均匀缩放是关键</summary>

**Q1：为什么 retargeting 这件事值得单独发一篇论文？它不就是一个 IK 脚本吗？**
A：两点。一是**通用性**——过去每家工作都自己写，兼容一款机器人、一种输入格式，换个机器人就要重写；GMR 把 18+ 款人形 + 5 种格式做成一个库。二是**feasibility 约束的工程价值**——很多下游 RL 训练失败的根本原因是参考动作本身不可行（关节超限、自碰撞、脚穿地板），把这些约束做对，下游 RL 就好收敛、sim-to-real 更稳。

**Q2：GMR 为什么是 CPU-only 的？不是 GPU 快吗？**
A：retargeting 的计算量是**每帧几十到上百关节的一个非线性最小二乘**，规模不大；CPU 上的成熟 IK 求解器（SLSQP / LM / ceres 风格的 solver）单帧就几毫秒。GPU 的启动开销反而划不来。CPU-only 还带来部署便利：遥操场景里一台笔记本就够，不必等 CUDA 环境。

**Q3：GMR 和 PHC 的 retargeting 有什么区别？**
A：PHC 的 retargeting 嵌在 kinematic policy + RL 里，是"一边训练一边学 retargeting"的路线；GMR 走**非学习的显式优化**路线，牺牲一点表现力（比如无法"创造"原动作里没有的关节补偿）换来确定性、速度和零训练门槛。两条路线互补：GMR 做一层干净的 kinematic 重定向，下游可以继续叠 PHC 式的 RL tracking 做物理精修。

**Q4：为什么"Retargeting Matters"在标题里用了个略叫板的口气？**
A：从同组工作（TWIST / GentleHumanoid / OmniXtreme）的引用方式看，作者希望**把 retargeting 提到和 policy learning / sim-to-real 同一级的地位**——过去它是"随便写个脚本就行"的工具，实际却是影响 tracking 成败的关键环节。仓库里专门维护了 `TEST_MOTIONS.md` 这种"诚实展示失败案例"的文档，也是在主张这一点。

**Q6：用 mink 而不是自己写 IK，工程上的好处？**
A：mink 是 Kevin Zakka 维护的 MuJoCo IK 库，把"task / barrier / limit / damping"等 robotics-IK 常见组件抽象得很干净，QP 直接对接 DAQP / quadprog 等成熟求解器。GMR 复用它意味着：(1) 不需要自己处理 Jacobian + 阻尼；(2) 切换求解器只改一行；(3) 后续社区对 mink 的优化（比如新增 barrier）GMR 自动受益。代价是引入一个外部依赖。

**Q7：为什么非均匀局部缩放（step 3）是关键？等比例缩放不行吗？**
A：人类和机器人的四肢比例差异是**非均匀的**——手臂可能差 20%，腿差 15%，躯干几乎一样。如果用全局缩放因子，必然让某些骨骼链的目标位置比机器人可达空间更远，IK 解不出来或解出极端关节角。非均匀缩放让每条链各自对齐比例，IK 的起点就更合理，解的质量也更高。

**Q5：GMR 支持手指 / SMPL-X 表情吗？**
A：输入格式里 SMPL-X 原生有手指，但是否真的被重定向到机器人手上取决于机器人自由度——G1 / H1 等主流人形大多只到手腕，GMR 会截断到这些关节；支持灵巧手的平台（如 ByteDexter、Galaxea R1）可以通过扩展 `robot_cfgs/` 加入。

</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两条：kinematic retargeting 怎么影响 sim-to-real、接新人形需要哪些信息</summary>

- **Q**（2026-04-19）：GMR 是 kinematic retargeting，为什么 OmniXtreme / GentleHumanoid 的 Q&A 里还说它"影响 sim-to-real"？
  A：**间接影响**。GMR 本身不做物理；但它产出的参考动作是 RL tracking 的 target。如果 retargeting 就不 feasible，RL 要么追不上要么追上了也无法在真机复现。**Sim-to-real 的起点是 feasible 的参考动作**。

- **Q**：如果要给一个新的人形（比如 Fourier GR3）接入 GMR，需要哪些信息？
  A：URDF / MJCF 模型、关节限位表、人体骨骼到机器人关节的手动映射表（一次性工作）、可选的接触 / 自碰撞配置。按 `robot_cfgs/` 里现有的条目抄一份即可。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX、与其他方向的关联、六条开放问题、GitHub 关键文件指引</summary>

<h3 id="a-bibtex">A. BibTeX</h3>

```bibtex
@article{joao2025gmr,
  title={Retargeting Matters: General Motion Retargeting for Humanoid Motion Tracking},
  author={Joao Pedro Araujo and Yanjie Ze and Pei Xu and Jiajun Wu and C. Karen Liu},
  year={2025},
  journal={arXiv preprint arXiv:2510.02252}
}

@software{ze2025gmr,
  title={GMR: General Motion Retargeting},
  author={Yanjie Ze and João Pedro Araújo and Jiajun Wu and C. Karen Liu},
  year={2025},
  url={https://github.com/YanjieZe/GMR}
}
```

<h3 id="b-与其他方向的关联">B. 与其他方向的关联</h3>

| 方向 | 关系 |
|------|------|
| TWIST (Ze 2025, arXiv 2505.02833) | GMR 的头号使用者，一起发布 |
| GentleHumanoid | 用 GMR 把 AMASS / InterX / OMOMO 翻译到 G1，训练阻抗 tracking policy |
| OmniXtreme | 在"重定向工具"中明确列出 GMR |
| PHC / ExBody2 | retargeting 思路的前辈，GMR 走的是"显式、通用、CPU"路线 |
| GVHMR / PromptHMR | 视频 → SMPL-X 的上游，GVHMR 已作为 GMR 的一种输入格式 |

<h3 id="c-开放问题">C. 开放问题</h3>

1. ~~GMR 的 IK 用的是哪个 solver？~~ → 已确认：`mink` + DAQP（默认） / quadprog。
2. ~~显式 IK 在接触丰富动作上是否稳定？~~ → 已确认：`TEST_MOTIONS.md` 列 5 类失败案例；论文层面以 RL tracking 阶段补救为主。
3. ~~论文 ablation 对比对象与指标？~~ → 已确认：对比 PHC / ProtoMotions / Unitree 闭源基线，指标为 LAFAN1 上的 tracking success rate（BeyondMimic 框架）。
4. ~~artifact 类型有哪些？~~ → 已确认：地面穿透、自碰撞、关节值突变三类。
5. **仍待确认**：非均匀局部缩放步骤的消融实验（单独去掉 step 3 后成功率下降多少）——HTML 版未给出逐步 ablation 数字，需查 PDF 附录。
6. **仍待确认**：灵巧手扩展是否在论文中有专节讨论。

<h3 id="d-关键文件指引github">D. 关键文件指引（GitHub）</h3>

- 求解器与两阶段 IK：[`general_motion_retargeting/motion_retarget.py`](https://github.com/YanjieZe/GMR/blob/main/general_motion_retargeting/motion_retarget.py)
- IK 配置 schema：[`DOC.md`](https://github.com/YanjieZe/GMR/blob/main/DOC.md)
- 已知失败动作清单：[`TEST_MOTIONS.md`](https://github.com/YanjieZe/GMR/blob/main/TEST_MOTIONS.md)
- 自研 PyTorch FK：[`general_motion_retargeting/kinematics_model.py`](https://github.com/YanjieZe/GMR/blob/main/general_motion_retargeting/kinematics_model.py)
- 数据 IO 与 `.pkl` 字段：[`general_motion_retargeting/data_loader.py`](https://github.com/YanjieZe/GMR/blob/main/general_motion_retargeting/data_loader.py)

</details>

