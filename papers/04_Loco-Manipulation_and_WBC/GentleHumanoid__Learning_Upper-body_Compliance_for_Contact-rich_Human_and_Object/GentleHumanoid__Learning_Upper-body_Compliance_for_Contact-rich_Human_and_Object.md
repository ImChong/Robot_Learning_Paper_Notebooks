---
layout: paper
paper_order: 14
title: "GentleHumanoid: Learning Upper-body Compliance for Contact-rich Human and Object Interaction"
zhname: "GentleHumanoid：面向密集接触人机与物体交互的上半身柔顺学习"
category: "Loco-Manipulation and WBC"
---

# GentleHumanoid: Learning Upper-body Compliance for Contact-rich Human and Object Interaction
**让人形机器人在拥抱、搀扶和脆弱物体操作中学会“上半身柔顺”**

> 📅 阅读日期: 2026-04-19
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2511.04679](https://arxiv.org/abs/2511.04679) |
| **HTML** | [在线阅读](https://arxiv.org/html/2511.04679) |
| **PDF** | [下载](https://arxiv.org/pdf/2511.04679) |
| **项目主页** | [gentle-humanoid.axell.top](https://gentle-humanoid.axell.top) |
| **GitHub** | [Deployment](https://github.com/Axellwppr/gentle-humanoid) / [Training](https://github.com/Axellwppr/gentle-humanoid-training) |
| **发布时间** | 2025年11月6日（arXiv） |
| **机构** | Stanford University |
| **实验平台** | Unitree G1 humanoid |
| **控制频率** | 高层策略 50 Hz，低层 PD 跟踪 |

**作者**: Qingzhou Lu*, Yao Feng*, Baiyu Shi, Michael Piseno, Zhenan Bao, C. Karen Liu

---

## 🎯 一句话总结

GentleHumanoid 通过将**阻抗控制（Impedance Control）模型**整合进**全身动作跟踪强化学习（RL）**框架，实现了上肢（肩、肘、手）在接触过程中的柔顺响应。其核心在于将原本僵硬的“轨迹跟踪”转变为对“柔顺动力学参考”的模仿，并支持通过**可调安全力阈值**在真机上实时平衡任务表现与交互安全。

---

## 📖 英文缩写速查

| 缩写 | 全称 | 简单解释 | 生活类比 |
|------|------|----------|----------|
| **RL** | Reinforcement Learning | 强化学习：通过奖惩训练控制策略 | 像带小孩学骑车，做对了鼓励、做错了纠正 |
| **PPO** | Proximal Policy Optimization | 常用稳定 RL 算法 | 每次只小步改策略，避免一把改坏 |
| **PD** | Proportional-Derivative | 比例-微分控制 | 像弹簧 + 阻尼器，一边拉回目标一边防抖 |
| **HRI** | Human-Robot Interaction | 人机交互 | 人和机器人发生直接协作或身体接触 |
| **SMPL / SMPL-X** | Skinned Multi-Person Linear Model | 参数化人体模型 | 用一串数字描述人体姿态和形状 |
| **GMR** | General Motion Retargeting | 人类动作到机器人动作的重定向方法 | 把“人做的动作”翻译成“机器人能做的动作” |
| **AMASS** | Archive of Motion Capture as Surface Shapes | 大规模人体动捕数据集 | 人类运动的大图书馆 |
| **InterX** | Human-Human Interaction Dataset | 人-人交互数据集 | 专门收录接触互动动作的录像库 |
| **LAFAN** | Lafayette Animation Dataset | 动作捕捉数据集 | 常见的全身动作素材库 |
| **BEDLAM** | Benchmark for Detailed Human Body Shape & Motion | 用于支撑 body mesh 估计的人体网格与动作数据集 | 像一个“真人体型与动作素材库”，帮助视觉模型学会从图像还原人体外形 |
| **PromptHMR** | Promptable Human Mesh Recovery | 从单目 RGB 视频估计人体 SMPL-X 运动序列的方法 | 用手机视频恢复人的 3D 动作和身体网格的“视觉重建器” |
| **RGB** | Red-Green-Blue | 普通彩色相机图像 | 手机拍照那种彩色画面 |
| **Sim-to-Real** | Simulation to Reality | 仿真训练迁移到真机 | 游戏里练熟，再上真实赛场 |

---

## ❓ 要解决什么问题

这篇论文解决的是一个很“反直觉”但很关键的问题：

**为什么现在很多人形机器人看起来动作很强，但一跟人或脆弱物体接触就显得太“硬”？**

### 1. 现有 tracking policy 默认追求“别偏离参考动作”
很多最近的人形 RL 控制器本质上都在做一件事：
- 尽量跟踪参考 motion
- 把外力当成扰动
- 一旦被推、被拉、接触物体，就拼命“拉回去”

这会导致机器人在拥抱、搀扶、握手、拿气球这类任务里显得很僵硬。

### 2. 以前的柔顺控制大多只管末端，不管整条上肢链路
有些方法把 impedance / admittance 控制接到 base 或 end-effector 上，但真正的人机接触通常不是只碰“手掌一个点”：
- 拥抱时，手、前臂、肘、肩都可能同时接触
- 搀扶站起时，力量会沿手—肘—肩—躯干传递
- 处理软物体时，局部挤压和整体姿态也会联动

只控制末端执行器，往往做不到整条运动链的自然协调。

### 3. “安全”和“任务成功”常常互相打架
如果你把策略训得很软，它可能抱不住人、扶不起人、拿不稳东西；
如果你把策略训得很硬，它虽然能完成任务，但会让接触很生硬，甚至超过安全或舒适阈值。

> 💡 **类比**：以前很多策略像“只会按既定动作出拳的拳击陪练”。GentleHumanoid 更像一个有分寸的康复师——既能给力，也知道什么时候该顺着你、托着你，而不是硬顶着你。

---

## 🔧 方法详解

GentleHumanoid 的核心思想可以概括成一句话：

**先用阻抗模型定义“应该怎样柔顺”，再让 RL 策略去学习复现这种柔顺的参考动力学。**

### 1）问题建模：上半身多链接柔顺系统
论文把上半身关键点建成一个多链接的阻抗系统，重点跟踪这些 link：
- shoulder
- elbow
- hand

每个 link 的运动都受两类力共同影响：

$$M \ddot{x}_i = f _ {drive,i} + f _ {interact,i}$$

其中：
- $M$ 是虚拟质量，论文里每个 link 取 **0.1 kg**
- $f _ {drive}$ 是“把机器人拉向目标 motion”的驱动力
- $f _ {interact}$ 是“来自人或物体接触”的交互力

这一步很关键，因为它把“柔顺”从一个模糊概念，变成了一个明确可积分的参考动力学系统。

### 2）驱动力：来自目标 motion 的阻抗弹簧-阻尼
驱动力采用经典 spring-damper 形式：

$$f _ {drive} = K_p(x _ {tar} - x _ {cur}) + K_d(v _ {tar} - v _ {cur})$$

其中：
- $x _ {tar}, v _ {tar}$ 来自参考动作
- $x _ {cur}, v _ {cur}$ 是当前 link 状态
- $K_d = 2\sqrt{MK_p}$，即取临界阻尼

直观理解：
- 参考 motion 不是“死命令”
- 而是像一根弹簧，把机器人温和地拉回目标
- 外界施力时，系统允许偏移，但不会完全散掉

### 3）交互力：统一的 spring-based 建模
论文最核心的创新，是把 interaction force 统一成：

$$f _ {interact} = K _ {spring}(x _ {anchor} - x _ {cur})$$

但 anchor 的定义分两种：

#### A. Resistive contact（阻抗式抵抗接触）
当机器人自己压到表面上时：
- 把**刚开始接触那一刻的 link 位置**固定为弹簧锚点
- 之后如果继续偏离，就产生 restoring force

即：
- 像一根“接触后锁住起点”的虚拟弹簧
- 适合描述“压住某个物体/人体后，对方把你往外推时”的回复

#### B. Guiding contact（引导式接触）
当外部主体在推/拉机器人手臂时：
- 不从当前接触面随机造力
- 而是从**人类 motion dataset 的完整上半身姿态**中采样一个 posture
- 把采样姿态里的 link 位置作为 spring anchor

这样做的意义很大：
- 不是给肩/肘/手各自独立乱施力
- 而是从整个人体姿态里采样，保证肩-肘-腕之间的**运动学一致性**
- 学到的是“整条上肢一起顺从/一起引导”的协调力响应

### 4）如何做多样化 force exposure
训练时，作者会随机化：
- **弹簧刚度**：$K _ {spring} \sim U(5, 250)$
- **受力 link 集合**：
  - 40% 无外力
  - 15% 双臂 6 个 link 同时受力
  - 30% 单臂 3 个 link 受力
  - 15% 单个 link 受力
- **重采样频率**：每 5 秒重采样一次，并加过渡窗口保证连续

这样策略在训练中见过非常多的人/物体接触情况，不会只会一种“标准拥抱姿势”。

### 5）安全力阈值：让柔顺程度可调
论文引入了一个很实用的设计：**force-thresholding**。

当驱动力太大时，不允许无限增大，而是按阈值缩放：

$$f _ {drive}^{limited} = \min\left(1, \frac{\tau _ {safe}}{\|f _ {drive}\|} \right) f _ {drive}$$

其中：
- 训练时 $\tau _ {safe}$ 在 **5 N 到 15 N** 之间分段采样
- 部署时用户可以按任务调节这个阈值

它带来的直接效果是：
- **5 N**：适合握手、气球、柔和接触
- **10 N**：适合普通拥抱
- **15 N**：适合 sit-to-stand 这类需要更强支撑的场景

### 6）RL 控制策略：学会追随“参考柔顺动力学”
策略目标不是直接拟合 reference motion，而是拟合积分后的 reference dynamics：

$$\dot{x}^{ref} _ {t+1} = \dot{x}^{ref}_t + \Delta t \cdot \frac{f _ {drive} + f _ {interact}}{M}$$

$$x^{ref} _ {t+1} = x^{ref}_t + \Delta t \cdot \dot{x}^{ref} _ {t+1}$$

也就是说：
- reference motion 先经过“驱动力 + 交互力”的动力学融合
- 得到一个更柔顺、更接触感知的参考轨迹
- RL 策略再学习在仿真里复现这个 reference dynamics

---

## 📁 GentleHumanoid 源码对照（基于公开仓库可核对内容）

> ✅ 本节已改为“可核对的真实仓库内容”。
> 
> 之前版本里 `learning/reference_dynamics.py`、`env/force_sampler.py`、`compute_compliance_reward(...)` 等路径/函数并不在公开仓库中（至少在 `main` 分支当前可见文件里没有对应同名文件），因此这里改为引用**真实存在**的训练入口与配置文件。

### 1. 训练流水线入口（对应论文的三类策略对比）

```bash
# gentle-humanoid-training/train.sh
run_pipeline "G1/G1_gentle" "gentle" "1215"
# run_pipeline "G1/G1_no_force" "noforce" "1215"
# run_pipeline "G1/G1_extreme_force" "extremeforce" "1215"
```

对应关系：
- `G1_gentle`：论文方法（含柔顺/阻抗建模）
- `G1_no_force`：vanilla tracking baseline
- `G1_extreme_force`：大扰动/强力 baseline

这与论文实验里对比 GentleHumanoid vs Vanilla-RL vs Extreme-RL 的设定是一致的。

### 2. Gentle 配置中的力相关参数（对应论文 Table II）

```yaml
# gentle-humanoid-training/cfg/task/G1/G1_gentle.yaml
command:
  _target_: active_adaptation.envs.mdp.commands.motion_tracking.MotionTrackingCommand_impedance
  max_force: 30.0
  net_force_limit: 30.0
  net_torque_limit: 20.0
```

以及同文件中的奖励权重：

```yaml
reward:
  impedance:
    force_reward: {weight: 2.0}
    force_exd_penalty: {weight: 6.0}
    force_target_tracking: {weight: 2.0}
```

这与论文正文/附录给出的参数范围一致（`Fmax=30N`, `τF=30N`, `τM=20N·m`，以及力相关奖励权重 2/2/6）。

### 3. 评估与部署入口（对应“可调力阈值部署”）

```bash
# gentle-humanoid-training/README.md
python scripts/eval.py --run_path ${wandb_run_path} -p
python scripts/eval.py --run_path ${wandb_run_path} -p --export
```

`eval.py` 支持按 run checkpoint 加载策略并进行 `play/export`，对应论文里“同一策略在不同交互场景部署并调参验证”的实验流程。

### 4. 与论文描述对齐后的勘误说明

- ✅ **正确**：多链路（肩/肘/手）阻抗建模、`K_spring~U(5,250)`、接触组合概率（40/15/30/15）、参考动力学半隐式积分、50 Hz 位置目标下发。
- ⚠️ **需修正**：先前笔记中的“源码对照”给出了若干**无法在公开仓库定位**的 Python 文件与函数，容易让读者误以为这些是官方实现路径。
- ✅ **现已修正**：改为仓库中可直接定位的入口文件（`train.sh` / `G1_gentle.yaml` / `eval.py`）与参数对照，避免虚构路径。

## 🚶 具体实例：这篇论文到底怎么让机器人“抱得更柔和”？

### 例子 1：拥抱中被人往外拉
假设 G1 正在执行 hugging motion：
- 参考动作希望手臂继续闭合
- 但人往外轻拉机器人手腕

如果是传统 tracking RL：
- 会把这股外力当成扰动
- 力图迅速把手拉回参考位置
- 导致手、肘、肩上的接触力上冲，动作很僵硬

在 GentleHumanoid 里：
1. wrist、elbow、shoulder 同时有 interaction force
2. guiding / resistive spring 让整条手臂都“跟着让一点”
3. 如果当前 $\tau _ {safe}=10N$，驱动力也会被限制在大约这个量级
4. 结果不是“硬顶住”，而是边保持 hug、边顺着外力调整姿态

### 例子 2：拿气球
这是很能说明问题的场景：
- 力太小：抓不住
- 力太大：气球被挤爆或变形，机器人还可能失衡

论文把 GentleHumanoid 的阈值设成 **5 N**：
- 成功抓住并保持气球
- baseline 因为太硬，会越挤越狠，最后把气球挤坏甚至导致 G1 失衡掉落

---

## 🏗️ 工程复现要点

### 平台与控制栈
- **机器人**：Unitree G1
- **策略输出**：29 维 joint position target (由底层 PD 跟踪)
- **控制频率**：50 Hz (High-level) / 500 Hz (Low-level PD)
- **积分方法**：Semi-implicit Euler (步长 0.005s)

### 训练关键点
1. **构建参考动力学**：不要直接拟合原始 motion，而是拟合积分后的 ref dynamics。
2. **多样化受力暴露**：训练中随机组合不同 link 的受力，让策略学会多关节协同。
3. **阈值随机化**：训练时在 [5, 15] N 范围内随机采样安全阈值，赋予策略任务适应性。
4. **Teacher-Student 架构**：Teacher 辅助 Student 在缺乏显式力传感器的真机上复现柔顺行为。

---

## 🧪 实验与结果（按 arXiv HTML v1 补全）

### A. 仿真对比（Hugging + 外力拉拽）

论文在 hugging reference 上施加“把机器人往外拉”的交互扰动，比较 `GentleHumanoid`、`Vanilla-RL`、`Extreme-RL`：

- **手部力**：GentleHumanoid 稳定在约 **10N**；Vanilla-RL 高于 **20N**；Extreme-RL 超过 **13N**
- **肘/肩力**：GentleHumanoid 约 **7–10N**；两类 baseline 常见 **15–20N** 饱和与僵硬响应

核心结论：GentleHumanoid 在上肢多 link 上都能降低峰值力并减小波动。

### B. 真机实验（三个场景）

#### 1) 静态姿态 + 手腕受外力（Mark-10 M5-10）
- Extreme-RL 需要峰值约 **51.14N**
- Vanilla-RL 需要峰值约 **24.59N**
- GentleHumanoid 在指定阈值附近表现出**姿态无关的一致柔顺性**（示例阈值 10N，对应有效范围约 5–15N）

#### 2) Hugging mannequin（含对齐 / 错位）
- 使用定制腰部压力传感垫评估接触分布（论文介绍了标定流程与压力到力的映射）
- GentleHumanoid 在错位接触下仍保持更稳定、可控的接触力；baseline 易出现局部高压峰值与不稳定增长

#### 3) 脆弱物体（气球）
- 阈值设为 **5N** 时，GentleHumanoid 可稳定持球且不挤爆
- 两类 baseline 更易施加过大压力并导致失衡/掉落

### C. 额外应用（IV-C）

1. **遥操作联动**：与 G1 locomotion teleoperation 结合，可触发 hugging / sit-to-stand / object handling 等动作。  
2. **自主 shape-aware hugging**：通过头部 RGB + 人体 mesh 估计得到个体体型，提取腰部目标点优化抱姿，实现“按人定制”的拥抱轨迹。

---

## ⚠️ 论文明确给出的局限（V）

1. **数据覆盖限制**：力分布依赖人类动作数据，肩部等方向样本不足会限制外力分布多样性。  
2. **接触物理简化**：训练用弹簧力建模不完全等价真实接触（摩擦、组织黏弹性等）。  
3. **sim-to-real 残差**：真机偶有 **1–3N** overshoot，若要更精细力控需额外触觉传感。  
4. **感知依赖 mocap**：当前定位/身高仍依赖 mocap，未来需更完整视觉自治 pipeline。

---

## ✅ 对“要点是否都提取”的结论

不是完全提取。相较 `https://arxiv.org/html/2511.04679v1`，此前笔记缺少了：
- 真实实验中的**关键定量数字**（51.14N、24.59N、多 link 力区间）
- **IV-C 应用管线**（遥操作 + 形体感知自主拥抱）
- **V 局限性**（数据覆盖、接触物理、1–3N overshoot、mocap 依赖）

以上已在本次笔记中补齐。

---

## 🔚 总结与评价

GentleHumanoid 是第一篇深入探讨人形机器人**全身接触品质**的强化学习工作。它通过将经典的阻抗模型与现代 RL 结合，成功地让机器人学会了“分寸感”。对于想要在康复辅助、居家陪伴或安全协作领域应用人形机器人的开发者来说，这套**参考动力学 + 安全阈值**的框架具有极高的实战参考价值。
