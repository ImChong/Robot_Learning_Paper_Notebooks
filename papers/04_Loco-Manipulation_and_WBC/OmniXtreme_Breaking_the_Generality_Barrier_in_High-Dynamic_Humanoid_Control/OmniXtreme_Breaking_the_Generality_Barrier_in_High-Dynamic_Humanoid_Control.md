---
layout: paper
paper_order: 12
title: "OmniXtreme: Breaking the Generality Barrier in High-Dynamic Humanoid Control"
zhname: "OmniXtreme：突破高动态人形控制的通用性壁垒"
category: "Loco-Manipulation and WBC"
---

# OmniXtreme: Breaking the Generality Barrier in High-Dynamic Humanoid Control
**Flow Matching 蒸馏多专家为统一策略，再叠加执行器感知残差 RL 与功率安全正则，让单一策略在 G1 真机完成翻跟头、霹雳舞等极限全身动作**

> 📅 阅读日期: 2026-03-08
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2602.23843](https://arxiv.org/abs/2602.23843) |
| **PDF** | [下载](https://arxiv.org/pdf/2602.23843) |
| **项目主页** | [extreme-humanoid.github.io](https://extreme-humanoid.github.io/) |
| **GitHub** | [Perkins729/OmniXtreme](https://github.com/Perkins729/OmniXtreme) |
| **收录** | RSS 2026 |
| **发布时间** | 2026年2月27日（arXiv） |
| **机构** | BIGAI、BIGAI & 宇树联合实验室、上交大、中科大、宇树科技、华科、北理工 |
| **实验平台** | Unitree G1 人形机器人 |
| **部署硬件** | 机载 NVIDIA Jetson Orin NX（推理全 onboard、实时） |
| **训练仿真器** | IsaacLab |
| **Sim-to-Sim 验证** | MuJoCo 3.2.3（`deploy_mujoco.py`） |

**作者**: Yunshen Wang\*¹'²'³, Shaohang Zhu\*¹'²'⁴, Peiyuan Zhi¹'², Yuhan Li¹'²'⁶, Jiaxin Li¹'²'⁷, Yong-Lu Li³, Yuchen Xiao⁵, Xingxing Wang⁵, Baoxiong Jia†¹'², Siyuan Huang†¹'²  
**机构编号**: ¹ BIGAI · ² BIGAI & Unitree 联合实验室 · ³ 上海交大 · ⁴ 中科大 · ⁵ 宇树科技 · ⁶ 华科 · ⁷ 北理工  
**通讯作者**: Baoxiong Jia, Siyuan Huang

---

## 🎯 一句话总结

OmniXtreme 提出**两阶段框架**：先用**流匹配（Flow Matching）生成式预训练**把多个专家策略蒸馏为统一策略，再用**执行器感知的残差 RL 后训练**——打破高动态人形机器人控制的"通用性壁垒"，让单一策略在真实 G1 上完成翻跟头、霹雳舞等极限全身动作。

---



## 📖 英文缩写速查

| 缩写 | 全称 | 简单解释 | 生活类比 |
|------|------|----------|----------|
| **RL** | Reinforcement Learning | 强化学习：通过奖惩反馈训练策略 | 训狗：做对了给零食，做错了没有 |
| **PPO** | Proximal Policy Optimization | 近端策略优化：稳定的 RL 训练算法 | 每次只微调一点点习惯，防止矫枉过正 |
| **FM / Flow Matching** | Flow Matching | 流匹配：生成式模型，学习从噪声到目标的速度场 | 学"从一团沙慢慢雕刻成雕塑"的过程 |
| **ODE** | Ordinary Differential Equation | 常微分方程：描述连续变化过程的方程 | 流匹配推理时按这个方程一步步"雕刻" |
| **DAgger** | Dataset Aggregation | 数据集聚合：学生上场，遇到新情况让专家批注 | 学徒边干边问师傅"这样对吗" |
| **ADR** | Aggressive Domain Randomization | 激进域随机化：大幅随机化物理参数以增强鲁棒性 | 在各种奇怪路况下练车，上普通马路反而轻松 |
| **BEMF / Back-EMF** | Back Electromotive Force | 反电动势：电机高速旋转时产生的反向电压，限制力矩 | 电机转得越快，"自己顶自己"越厉害，力矩上不去 |
| **CoM** | Center of Mass | 质心 | 扫帚能平衡在手指上的那个点 |
| **MPJPE** | Mean Per-Joint Position Error | 每关节平均位置误差 | 机器人和参考动作每个关节偏了多少厘米，取平均 |
| **MLP** | Multi-Layer Perceptron | 多层感知机：最基础的神经网络 | 多层"过滤器"叠起来的信息处理流水线 |
| **IMU** | Inertial Measurement Unit | 惯性测量单元：测加速度和角速度 | 手机陀螺仪，知道在倾斜还是旋转 |
| **LAFAN1** | — | 动捕数据集，包含丰富的人类运动片段 | "人类运动图书馆"之一 |
| **AMASS** | Archive of Motion Capture as Surface Shapes | 大规模人类动捕数据集 | 机器学习界最大的"人类运动图书馆" |
| **GMR** | — | 运动重定向工具，把人类动捕映射到 G1 关节 | 把姚明的动作翻译给小学生的"翻译官" |
| **BIGAI** | Beijing Institute for General Artificial Intelligence | 北京通用人工智能研究院 | — |
| **G1** | Unitree G1 | 宇树科技人形机器人平台 | — |
| **Sim-to-Real** | Simulation to Reality | 仿真训练迁移到真实机器人 | 游戏里练了一千小时，去真实赛场适应"真实手感" |


---

## ❓ 解决什么问题？

### 核心挑战：通用性壁垒（Generality Barrier）

当运动库多样性扩展时，跟踪保真度不可避免地崩溃——尤其是高动态运动在真机部署时。失败来自两个复合因素：

### 瓶颈一：学习瓶颈（Learning Bottleneck）

**表征层面**：大多数方法用简单的 MLP（如 [512, 256, 128]），随运动多样性增加，能力明显受限。

**优化层面**：联合训练统一策略时，不同运动的梯度互相干扰，导致"保守平均化"——在高动态动作上选择性失败。

### 瓶颈二：物理可执行性瓶颈（Physical Executability Bottleneck）

现有方法只用关节位置限制和简单力矩边界来建模执行器约束，忽略了高动态运动中的关键非线性：

- **转矩-速度特性**（反电动势）
- **速度相关的力矩损失**
- **再生制动功率现象**（急减速时过大电流触发保护）

结果：仿真里好好的动作，真机上直接失败。

> 💡 **类比**：以前的方法像用一本食谱同时教厨师做1000道菜——菜越多，每道菜的质量越差。而且食谱只写了"加油炒"，没告诉你大火快炒和小火慢炖对锅的要求完全不同。

---

## 🔧 方法详解

OmniXtreme = **两阶段训练框架**

```
阶段一：流匹配预训练（保真度）
  └── 每个运动单独训专家 → DAgger蒸馏 → 统一流匹配策略

阶段二：执行器感知后训练（真机可部署）
  └── 冻结流策略 + 学残差策略 + 激进域随机化 + 功率惩罚
```

---

### 阶段一：可扩展的流匹配预训练

#### Step 1：专家策略学习

为**每个运动**单独训一个 PPO 专家策略（不是一起训！）：

**专家策略 Actor 输入（MLP [512, 256, 128]）**：

| 分量 | 含义 | 维度 |
|------|------|------|
| $q^{\text{ref}}, \dot{q}^{\text{ref}}$ | 参考关节位置和速度 | 29×2 |
| $e _ {\text{torso}}$ | 躯干位置差 + 6D方向差 | 3+6=9 |
| $\mathcal{V} _ {\text{imu}}$ | 基座线速度 + 角速度 | 6 |
| $q - q^0$ | 相对关节位置 | 29 |
| $\dot{q}$ | 关节速度 | 29 |
| $a _ {\text{last}}$ | 上一步动作 | 29 |

**数据来源**：
- LAFAN1（Unitree重定向版）
- AMASS
- MimicKit
- Reallusion 运动库
- **重定向工具**：GMR

每个专家只负责一个运动，质量高，但数量多（多少个运动就多少个专家）。

#### Step 2：流匹配策略蒸馏（核心创新）

**为什么用流匹配而不用普通监督蒸馏？**

普通蒸馏是"给输入，预测输出"，对于高度异构的动作（翻跟头 vs 霹雳舞），一个 MLP 容量不够。流匹配是**生成式模型**，通过学习概率路径来建模动作分布，天然容量更大。

**核心损失函数**：

$$\mathcal{L} _ {\text{FM}}(\theta) = \mathbb{E} _ {t, \epsilon, a _ {\text{expert}}} \left[ \|v_\theta(a_t, t, o) - (\epsilon - a _ {\text{expert}})\|^2 \right]$$

- $a_t = (1-t)a _ {\text{expert}} + t\epsilon$：在专家动作和随机噪声之间插值
- $v_\theta$ 学习速度场，预测"往哪个方向走才能从噪声到达专家动作"
- 时间步 $t \sim \text{Beta}(\alpha, \beta)$，聚焦在关键区域加速收敛

**推理时的动作生成**（前向欧拉积分，$t: 1 \to 0$）：

$$a _ {t-\frac{1}{D}} = a_t - \frac{1}{D} v_\theta(a_t, t, o)$$

部署时 $D=5$（5步去噪），平衡质量与延迟。

**DAgger 训练流程**（防止分布偏移）：

| 步骤 | 描述 |
|------|------|
| 1 | 用当前流策略在仿真中 rollout |
| 2 | 对每个状态，调用对应专家获取"正确动作" |
| 3 | 把这些 (状态, 专家动作) 对加进数据集 |
| 4 | 流匹配损失更新策略 |
| 5 | 反复迭代，数据集越来越覆盖真实分布 |

> 💡 **类比**：流匹配像是学魔法变形术——不是直接"变"，而是学"从一团随机的细沙慢慢雕刻成目标形状的过程"，因为学的是过程，所以能处理各种不同的目标形状。

---

### 阶段二：执行器感知后训练

#### Step 3：残差策略建模

冻结阶段一的流匹配策略（不再改动），在其上面加一个**残差 PPO 策略**：

$$a _ {\text{final}} = a _ {\text{flow}} + a _ {\text{res}}$$

- $a _ {\text{flow}}$：流匹配策略输出（冻结）
- $a _ {\text{res}}$：残差策略学习的修正量
- 残差策略的观测 = 本体感觉 + 运动指令 + 当前的 $a _ {\text{flow}}$

> 💡 **类比**：流匹配策略是"写好的乐谱"，残差策略是"钢琴调音师"——乐谱不动，调音师微调每个音符让真实演出听起来完美。

#### Step 4：激进域随机化（Aggressive Domain Randomization, ADR）

后训练阶段把随机化范围**增加最高50%**，同时**放宽终止阈值1.5倍**——允许残差策略探索和修正大偏差但可恢复的状态：

| 参数 | 预训练（保守） | 后训练（激进） |
|------|----------------|----------------|
| 初始姿态噪声 (rad) | ±0.1 | **±0.15** |
| 初始线速度 xy (m/s) | ±0.5 | **±0.75** |
| 初始角速度 RP (rad/s) | ±0.52 | **±0.78** |
| 地形随机化 | 无 | **台阶0.01m** |
| 躯干方向终止阈值 (rad) | 0.8 | **1.2** |
| EE位置终止阈值 (m) | 0.25 | **0.375** |

#### Step 5：功率安全执行器正则化（核心工程贡献）

解决真机高动态运动中的**过流保护**问题，对过度负关节功率施加惩罚：

$$\mathcal{L} _ {\text{neg-power}} = \sum _ {j \in \mathcal{J}} \left( \frac{\max(-P_j - P _ {\text{db}}, 0)}{K} \right)^2$$

- $P_j = \tau_j \cdot \omega_j$：关节 $j$ 的瞬时机械功率
- $P _ {\text{db}} = 150W$：死区阈值（低于此不惩罚）
- $K = 500$：归一化常数
- **选择性应用于膝关节**（翻跟头时膝关节制动负载最大）
- 奖励权重 $w = -10$

#### Step 6：执行器感知的转矩-速度约束

建模真实执行器的**转矩-速度操作包络**（标准方法忽略了反电动势）：

$$\tau _ {\text{clipped}}(v) = \begin{cases} \tau _ {\max,0}, & \|v\| < v _ {x1} \\ \tau _ {\max,0}\left(1 - \frac{\|v\| - v _ {x1}}{v _ {x2} - v _ {x1}}\right), & v _ {x1} \leq \|v\| \leq v _ {x2} \\ 0, & \|v\| > v _ {x2} \end{cases}$$

最大转矩还取决于转矩与速度是否同向（驱动 vs 制动）：

$$\tau _ {\max,0} = \begin{cases} \tau _ {y1}, & v \cdot \tau _ {\text{in}} > 0 & \text{（驱动，力矩大）} \\ \tau _ {y2}, & v \cdot \tau _ {\text{in}} \leq 0 & \text{（制动，力矩小）} \end{cases}$$

> 💡 **类比**：这就像给赛车设置了真实的"油门-转速曲线"——低转速时力矩大，高转速时力矩下降，急刹车时还要额外限制，而不是简单地"最大转矩就是最大转矩"。

---

## 🎬 真机展示能力（统一策略）

项目主页 [Behavior Gallery](https://extreme-humanoid.github.io/) 展示了**单一统一策略**在 G1 真机上完成的极限动作，包括但不限于：

| 类别 | 代表动作 |
|------|----------|
| **Breaking / B-boy** | 连续后手翻、长段霹雳舞、Thomas flare、backspin |
| **体操 / 特技** | Webster flip（连续 5 次）、侧手翻、空翻侧手翻、自行车踢 |
| **武术 / 踢技** | Spinkick、butterfly kick |
| **基础高动态** | 前滚翻、后滚翻、交替手枪深蹲、倒立行走 |
| **补充 demo** | 攻击连招、俯卧撑、被击倒后恢复、滚翻-空翻组合 |

> 项目主页强调：推理 pipeline **全 onboard、实时执行**，无需外部算力或遥操介入。

---

## 🧪 消融实验（项目主页）

| 组件 | 作用 |
|------|------|
| **Power-Safety Regularization** | 显式惩罚过大负关节功率，防止高动态制动时能量吸收过载、触发过流保护 |
| **Motor Characteristic Modeling** | 在仿真中建模真实电机转矩-速度包络（含反电动势），缩小 sim-to-real 差距 |

两者共同构成「执行器感知后训练」的核心工程贡献；去掉任一项，真机高动态动作（尤其落地制动）成功率显著下降。

---

## 🏗️ 工程复现要点

### 官方开源状态（[GitHub README](https://github.com/Perkins729/OmniXtreme)）

**已发布**：

| 资源 | 说明 |
|------|------|
| 论文 & 演示视频 | 项目主页 + arXiv |
| **Checkpoints** | `policy/` 目录：`base_policy_trt.onnx`、`residual_policy.onnx`、`fk_trt.onnx` |
| **Sim-to-Sim 评估** | `deploy_mujoco.py` + `residual_policy.py` + `configs/` + `robots/` |
| **运动数据子集** | [Google Drive](https://drive.google.com/file/d/1-LXEmUfW80BXYQ0tAZx341PzY8u14Z9Q/view?usp=sharing)，解压至 `policy/` |

**计划中（Planned Releases）**：

- Flow Matching 基策略训练与推理代码
- 残差后训练与推理完整流水线
- C++ 真机部署代码

### 快速上手（Sim-to-Sim）

```bash
git clone https://github.com/Perkins729/OmniXtreme.git
cd OmniXtreme
conda create -n omnixtreme python=3.8
conda activate omnixtreme
conda install -c conda-forge cudnn=8
pip install -r requirements.txt
export LD_LIBRARY_PATH=$CONDA_PREFIX/lib:$LD_LIBRARY_PATH
# 下载 motion 数据至 policy/ 后：
python deploy_mujoco.py
```

**依赖栈**（`requirements.txt`）：MuJoCo 3.2.3、PyTorch 2.4.1、ONNX Runtime GPU 1.18.1、TensorRT 8.5.2.2 等。

### 仿真与部署

| 环节 | 关键点 |
|------|--------|
| **训练仿真器** | IsaacLab |
| **Sim-to-Sim** | MuJoCo 3.2.3，策略导出为 ONNX / TensorRT |
| **真机平台** | Unitree G1 |
| **机载推理** | Jetson Orin NX，base + residual 两路 ONNX 推理 |
| **数据集** | LAFAN1、AMASS、MimicKit、Reallusion 运动库 |
| **重定向工具** | [GMR](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.md) |

### 网络结构

| 模块 | 结构 | 备注 |
|------|------|------|
| **专家策略（Teacher）** | MLP [512, 256, 128]，Actor-Critic 分离 | PPO 训练，每运动一个 |
| **流匹配策略（预训练）** | Transformer + flow head | 统一策略，DAgger 蒸馏 |
| **残差策略（后训练）** | MLP，PPO 训练 | 输入包含 $a _ {\text{flow}}$；仓库提供 `residual_policy.onnx` |

### 训练流程
1. **Per-expert PPO**：每个运动单独训专家策略，保守随机化
2. **Flow Matching DAgger**：用专家批注学统一流匹配策略
3. **Residual RL**：冻结流策略，PPO 训残差修正，激进随机化 + 功率惩罚 + 转矩-速度约束

### 域随机化策略
- 预训练：保守（确保高质量参考动作）
- 后训练：激进 + 放宽终止阈值（增强真机鲁棒性）

---

## 📊 核心创新点

| 创新 | 描述 |
|------|------|
| **Flow Matching 蒸馏** | 用生成式模型统一多个专家，突破 MLP 容量瓶颈 |
| **残差 RL 后训练** | 冻结预训练策略，只学修正量，保真度 + 鲁棒性两全 |
| **功率安全正则化** | 惩罚过大制动功率，避免真机过流保护触发 |
| **转矩-速度包络建模** | 把真实执行器非线性搬进仿真，Sim-to-Real 更准确 |
| **两阶段随机化策略** | 预训练保守保质量，后训练激进保鲁棒性 |

---

## 🎤 面试高频问题 & 参考回答

### Q1：OmniXtreme 和 ULTRA 有什么区别？

**A**：ULTRA 的核心贡献是"双模式控制"——有参考跟踪，无参考自主感知行为；OmniXtreme 专注于高动态运动（翻跟头、霹雳舞）的保真度和真机可部署性。技术路线不同：ULTRA 用 Teacher-Student + 隐空间压缩，OmniXtreme 用 Flow Matching 蒸馏 + 残差 RL 后训练，并特别针对执行器非线性（转矩-速度包络、功率限制）做了建模。

### Q2：为什么用流匹配（Flow Matching）而不是普通监督学习或 Diffusion？

**A**：普通监督学习（如知识蒸馏）用简单 MLP 直接预测动作，多样性高时容量不足。Diffusion 需要多步去噪，推理延迟高（对实时控制不友好）。Flow Matching 是一种确定性 ODE 流，推理步数可以少（论文里用 5 步），而且通过学习速度场来建模复杂分布，天然适合统一多种异构动作。

### Q3：残差策略的设计逻辑是什么？

**A**：直接对流匹配策略 end-to-end RL 微调会破坏预训练建立的保真度（RL 容易过拟合到奖励而忽略参考跟踪）。用残差设计可以解耦：基础策略保证跟踪质量，残差策略只学"真机上哪里不对、怎么微调"，同时激进域随机化让残差策略能处理 OOD 情况。两者结合，保真度和鲁棒性都不损失。

### Q4：功率惩罚为什么只加在膝关节？

**A**：高动态运动（如翻跟头落地）中，膝关节需要承受最大的制动负载——身体重量全压在膝盖上急减速，瞬间制动功率可能超过电机安全阈值，触发过流保护导致失控。其他关节在这些动作中的制动功率相对小，不需要额外约束。选择性施加可以减少对其他关节正常动作的干扰。

### Q5：DAgger 在这里解决什么问题？

**A**：流匹配策略如果只用离线数据训练（专家动作），会有分布偏移问题——流策略执行时遇到的状态和专家示范的状态不一样，导致累积误差越来越大。DAgger 让流策略先上场，遇到新状态时调用专家批注"正确动作"，把这些新状态加进训练数据，反复迭代直到覆盖真实分布。

### Q6：Sim-to-Real 的关键技术是什么？

**A**：三个层面：1）**转矩-速度包络建模**——把真实执行器的非线性（反电动势、速度相关力矩损失）搬进仿真，让仿真中的物理行为更接近真机；2）**功率安全正则化**——训练中就惩罚真机上会触发保护的行为；3）**两阶段域随机化**——预训练保守保质量，后训练激进保鲁棒性，同时放宽终止阈值让策略能从大偏差中恢复。

### Q7：官方代码开源到什么程度？能复现真机吗？

**A**：截至 2026 年 6 月，[Perkins729/OmniXtreme](https://github.com/Perkins729/OmniXtreme) 已放出预训练 checkpoint（base + residual ONNX/TensorRT）、MuJoCo sim-to-sim 评估脚本 `deploy_mujoco.py` 和运动数据子集；**训练代码与 C++ 真机部署尚在 Planned Releases**。因此当前可直接在 MuJoCo 里验证统一策略的高动态跟踪效果，完整训练流水线和真机部署需等待后续释出。

### Q8：这篇论文的局限性是什么？

**A**：
- 流匹配推理需要 5 步，对极端低延迟场景仍有挑战
- 运动多样性受动捕数据集覆盖范围限制（需要 LAFAN1/AMASS 中有的动作）
- 残差策略的修正幅度有上限，极端情况下（动作偏差过大）可能修正不回来
- 实机实验以展示性动作为主，操作任务的泛化未系统评估
- 训练代码尚未完全开源，社区暂无法从零复现完整两阶段流水线

---

## 📖 相关工作速览

- **ULTRA** (2026.03): 多模态统一控制器，双模式（跟踪/自主）
- **OmniH2O** (2024): 通用人→机全身遥操控制
- **HOVER** (2024): 多功能神经全身控制
- **ExBody2** (2024): 表达性全身控制
- **PHC** (2023): 物理人体控制的 RL 方法

---

## 📎 参考来源

- arXiv 论文页：[https://arxiv.org/abs/2602.23843](https://arxiv.org/abs/2602.23843)
- PDF：[https://arxiv.org/pdf/2602.23843](https://arxiv.org/pdf/2602.23843)
- 项目主页：[https://extreme-humanoid.github.io/](https://extreme-humanoid.github.io/)
- 官方源码：[https://github.com/Perkins729/OmniXtreme](https://github.com/Perkins729/OmniXtreme)
- 运动数据子集：[Google Drive](https://drive.google.com/file/d/1-LXEmUfW80BXYQ0tAZx341PzY8u14Z9Q/view?usp=sharing)

> 📝 **备注**：本笔记 2026-06-29 根据项目主页与 GitHub README 更新开源状态、RSS 2026 收录、真机展示清单与 Sim-to-Sim 复现流程。具体网络超参、loss 权重与训练步数以 arXiv PDF 为准；训练代码释出后需再核对 README。

---

## 💬 讨论记录

> 此部分在阅读讨论后更新
