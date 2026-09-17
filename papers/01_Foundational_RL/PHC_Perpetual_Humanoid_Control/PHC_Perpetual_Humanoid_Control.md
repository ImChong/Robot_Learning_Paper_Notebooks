---
layout: paper
paper_order: 5
title: "PHC: Perpetual Humanoid Control for Real-time Simulated Avatars"
category: "Foundational RL"
demos: ["phc"]
---

# PHC: Perpetual Humanoid Control for Real-time Simulated Avatars
**永续人形控制：面向实时仿真虚拟角色**

> 📅 阅读日期: -
>
> 🏷️ 板块: Reinforcement Learning / Motion Imitation / Fault Recovery

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2305.06456](https://arxiv.org/abs/2305.06456) |
| **PDF** | [下载](https://arxiv.org/pdf/2305.06456) |
| **作者** | Zhengyi Luo, Jinkun Cao, Alexander W. Winkler, Kris Kitani, Weipeng Xu |
| **机构** | Carnegie Mellon University, Meta Reality Labs |
| **发布时间** | 2023-05-10 (arXiv), ICCV 2023 |
| **项目主页** | [zhengyiluo.github.io/PHC](https://zhengyiluo.github.io/PHC/) |
| **代码** | [GitHub](https://github.com/ZhengyiLuo/PHC) |

---

## 🎯 一句话总结

PHC 通过**渐进式乘法控制策略（PMCP）**，让仿真人形角色能模仿上万条动作序列、从摔倒中自然恢复、永不需要 reset——是从 DeepMimic "单动作模仿"迈向"大规模通用控制"的关键一步。

> 🎮 **本文内嵌 1 段动画 + 3 个可交互演示**（不用装任何东西）：
> 1. [六幕动画：PHC 全流程](#phc-explainer-anim) —— 约 96 秒串完「DeepMimic 之后的三堵墙 → PMCP 渐进扩容 → Composer 连续混合 → 摔倒恢复 → 噪声输入换成关键点 → 两阶段训练闭环」（三堵墙各有一幕交代，所以比其余几篇多一幕）
> 2. PMCP 实验台 —— 点一次「训练下一轮」就新增一列 primitive，对照单网络微调怎么被洗掉
> 3. Composer 演示 —— 只有一个温度旋钮，拉满就能看到连续混合退化成硬切换那一跳
> 4. 摔倒恢复实验台 —— 画出一整条 episode，右边那根短柱是「没有 Pᶠ 时会在第几步结束」

---

## 📌 英文缩写速查

| 缩写 | 全称 | 中文 |
|------|------|------|
| PHC | Perpetual Humanoid Control | 永续人形控制 |
| PMCP | Progressive Multiplicative Control Policy | 渐进式乘法控制策略 |
| MCP | Multiplicative Compositional Policies | 乘法组合策略 |
| PNN | Progressive Neural Networks | 渐进式神经网络 |
| RSI | Reference State Initialization | 参考状态初始化 |
| RET | Relaxed Early Termination | 放松早停 |
| AMP | Adversarial Motion Priors | 对抗运动先验 |
| AMASS | Archive of Motion Capture as Surface Shapes | 动作捕捉数据集 |
| SMPL | Skinned Multi-Person Linear Model | 蒙皮多人线性模型 |
| PD | Proportional-Derivative | 比例-微分控制 |
| PULSE | Physics-based Universal Latent Skill Extraction | 基于物理的通用潜在技能提取 |

---

## 🎬 六幕动画：PHC 全流程 {#phc-explainer-anim}

<div class="paper-demo" data-demo="phc-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 📖 动画覆盖的两块——「这篇论文要解决什么问题」和「PHC 是怎么做的」——**文字讲解默认折叠**，想看推导、公式和对照表时点开各节的折叠条即可，内容一字未删；流程图、源码片段、具体实例与附录不在折叠范围内。

---

## ❓ 这篇论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：DeepMimic 之后还剩下什么</summary>

回顾一下我们的学习路线：DeepMimic 解决了"如何模仿一段动作"的问题。但实际应用中，问题远不止于此：
</details>

### 问题一：大规模学习的灾难性遗忘

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三条路各堵在哪，以及钢琴学生的类比</summary>

假如你有 10000 段不同的动作捕捉数据（走路、跑步、跳舞、翻跟斗……），想让一个策略网络全都学会。

- **直接训全部**：简单动作（走路）学会了，但复杂动作（后空翻）总学不好
- **先学简单再学复杂**：学会后空翻了，但走路又忘了（灾难性遗忘）
- **用多个独立策略**：每个动作一个网络？那 10000 个网络怎么切换？

> 💡 **类比**：就像一个钢琴学生，先学了《小星星》再学《钢琴协奏曲》——学完协奏曲回头弹《小星星》反而手生了。需要一个"不忘旧技能、还能学新技能"的方法。
</details>

### 问题二：摔倒后怎么办？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：为什么 reset 和 invisible hand 都不够</summary>

DeepMimic 和之前的方法有个共同问题：角色一旦偏离参考动作太多就直接 reset 重来。但真实应用中（比如 VR 虚拟角色），你不能让角色摔倒后"消失重置"。

- 之前的方案用**外部稳定力**（invisible hand）帮角色站稳——但这不真实
- PHC 的目标是：**不用任何外力，角色摔倒后自己爬起来继续**
</details>

### 问题三：输入噪声

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：参考动作从哪来，噪声有多大</summary>

真实使用中，参考动作来自视频姿态估计或文本生成，噪声很大。控制器需要对噪声输入鲁棒。
</details>

---

## 🔧 PHC 是怎么做的？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：PHC 不是「把 DeepMimic 做大一点」：四件事的拆解</summary>

先给一句最核心的话：**PHC 不是“把 DeepMimic 做大一点”这么简单，它本质上是把“动作模仿”升级成了“分层可扩展控制系统”。**

DeepMimic 的思路是：
- 给一段参考动作
- 训练一个策略去跟它
- 偏离太多就 reset

PHC 的思路则变成：
- 大量动作一起学，但不是硬塞进一个网络
- 用多个 primitive 分阶段吸收难度
- 再用 composer 在运行时动态调度
- 还额外训练一个 get-up / recovery 能力，让角色摔倒后自己接回主任务

所以理解 PHC，不能只盯着 imitation reward，得把它看成：

> **大规模 motion tracking + 渐进式容量扩展 + 在线技能混合 + fail-state recovery**

这四件事一起构成了 PHC。
</details>

### 整体架构

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：PMCP 由哪三个组件构成</summary>

PHC 的核心是 **PMCP（Progressive Multiplicative Control Policy）**，由三个关键组件组成：

（架构见下方 PMCP 运行时数据流图）
</details>

### 📊 PMCP 运行时数据流

<div class="mermaid">
flowchart TB
    S["状态 s_t + 目标姿态"] --> P1["Primitive P¹ 基础"]
    S --> P2["Primitive P² 进阶"]
    S --> P3["Primitive P³ 高难度"]
    S --> Pf["Primitive Pᶠ 起身恢复"]
    P1 --> C["Composer C<br/>动态权重混合"]
    P2 --> C
    P3 --> C
    Pf --> C
    C --> A["PD 目标 a_t"]
    A --> Sim["物理仿真 τ"]
    Sim --> S
</div>

### 第一步：状态和动作设计

**状态空间 $s_t$：**

| 组成 | 内容 | 说明 |
|---|---|---|
| 本体感知 | 身体 3D 姿态 $q_t$，速度 $\dot{q}_t$ | 当前身体在干嘛 |
| 目标差异 | 参考与当前的旋转/位置/速度差 | 下一步应该去哪 |

两种目标表示：
- **Rotation-based** $s_{rot}$：关节旋转差、位置差、线速度差、角速度差
- **Keypoint-based** $s_{kp}$：3D 关键点位置差、速度差（更鲁棒，适合噪声输入）

所有量都相对于角色当前朝向和根节点归一化。

**动作空间 $a_t$：**

直接输出各关节的 PD 控制目标（**不加残差**，不用外力）：

$$\tau = k_p(a_t - q_{sim}) - k_d(\dot{q}_{sim})$$

> ⚠️ 关键区别：DeepMimic 用的是参考动作 + 残差，PHC 直接输出绝对目标。这更难学但更通用。

### 第二步：奖励设计

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三项奖励各管什么（含 $r_t \approx 0.5 r_{task} + 0.5 r_{amp} + r_{energy}$ 那张表）</summary>

PHC 没有走 DeepMimic 那种“手工拆四项：pose/vel/ee/com”的路子，而是把 imitation reward 写成了**全身刚体级别的统一误差**。这比 DeepMimic 更适合大规模动作库，因为它不需要你手工盯着每一类动作重新调细节。

整体奖励可以概括为：

$$r_t \approx 0.5 \cdot r_{task} + 0.5 \cdot r_{amp} + r_{energy}$$

其中：

| 奖励项 | 公式/说明 | 作用 |
|--------|----------|------|
| $r_{task}$（模仿） | 刚体位置、旋转、线速度、角速度误差的指数奖励加权和 | 跟上参考动作 |
| $r_{amp}$（对抗） | 判别器打分，鼓励动作像真实人类运动分布 | 保持自然与稳定 |
| $r_{energy}$ | 功率/能量惩罚 | 防止高频抖动和暴力打关节 |
</details>

源码里 imitation reward 的实现非常直接：

```python
# phc/env/tasks/humanoid_im.py - compute_imitation_reward()
r_body_pos = torch.exp(-k_pos * diff_body_pos_dist)
r_body_rot = torch.exp(-k_rot * diff_global_body_angle_dist)
r_vel = torch.exp(-k_vel * diff_global_vel_dist)
r_ang_vel = torch.exp(-k_ang_vel * diff_global_ang_vel_dist)

reward = w_pos * r_body_pos + w_rot * r_body_rot + w_vel * r_vel + w_ang_vel * r_ang_vel
```

对应默认配置（论文代码公开版）是：

```yaml
reward_specs:
  k_pos: 100
  k_rot: 10
  k_vel: 0.1
  k_ang_vel: 0.1

  w_pos: 0.5
  w_rot: 0.3
  w_vel: 0.1
  w_ang_vel: 0.1
```

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：为什么提升到全身刚体空间，以及恢复模式下的 $r_{recover}$</summary>

> 🔑 **直觉**：PHC 把“像不像参考动作”这件事提升到**全身刚体状态空间**去比较，而不是像 DeepMimic 那样更偏任务工程式地拆成 pose/ee/com 四块。这样做在大动作库上更统一，也更容易接噪声输入。

恢复模式下，任务目标会被放松成“先回到目标附近再说”，不要求一开始就精确追全身姿态。你可以把它理解成：

$$r_{recover} \approx 0.5 \cdot r_{point} + 0.5 \cdot r_{amp} + 0.1 \cdot r_{energy}$$

其中 $r_{point}$ 主要关心根节点是否靠近目标位置——先站起来、先回去，再重新接轨迹。
</details>

### 第三步：渐进式训练（Progressive Training）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：这一步为什么是分水岭</summary>

这是 PHC 最核心的创新，也是它和“单网络硬吃全部 AMASS”最大的分水岭。

训练过程分多轮：
</details>

<div class="mermaid">
flowchart TB
    R1["第1轮：P¹ 在全部 AMASS Q"] --> F1["冻结 P¹ → 导出 Q_hard²"]
    F1 --> R2["第2轮：P² 仅 Q_hard²"] --> F2["冻结 P² → Q_hard³"]
    F2 --> R3["第3轮：P³ 仅 Q_hard³"] --> F3["冻结 P³"]
    F3 --> RF["第F轮：Pᶠ 摔倒恢复"] --> FC["冻结 Pᶠ"]
    FC --> C["训练 Composer C 混合所有 Primitive"]
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：课程学习 vs 容量扩展，以及对应的两套结构</summary>

你可以把它理解成一个**课程学习 + 容量扩展**的组合：

- **不是**把训练样本从 easy → hard 一路喂给同一个网络
- **而是**每次给系统新增一个新的“专科医生”
- 旧 primitive 不再被改写，所以不会被新任务覆盖掉

源码里这件事对应两套结构：

1. **PNN / Progressive 列网络**：用于逐个 primitive 扩展容量  
2. **MCP / Composer 网络**：用于推理时把多个 primitive 混起来
</details>

PNN builder 里最关键的逻辑是：

```python
# phc/learning/amp_network_pnn_builder.py
self.pnn = PNN(actor_mlp_args,
               output_size=kwargs['actions_num'],
               numCols=self.num_prim,
               has_lateral=self.has_lateral)
self.pnn.freeze_pnn(self.training_prim)
```

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：逐行读 PNN builder，以及 PMCP 的核心闭环与老师类比</summary>

这段代码的含义很直接：
- `numCols=self.num_prim`：有多少个 primitive，就建多少列网络
- `freeze_pnn(self.training_prim)`：训练当前这一列时，把之前列冻结

而 `scripts/pmcp/forward_pmcp.py` 里还能看到一个非常“工程味”的细节：
- 训练完某一列 primitive 后，会把它的权重拷贝到下一列做初始化
- 同时把最近一段时间仍然失败的 motion clip 导出成新的 hard set

这正是 PMCP 的核心闭环：

> **先训全量 → 找失败样本 → 新增容量 → 只打难例 → 再找更难的失败样本**

> 💡 **类比**：像老师带学生。普通老师先教全班；实在教不会的，交给更强的老师；再不会，再交给更专门的老师。最关键的是，前面的老师不会被后面的内容“洗掉记忆”。
</details>

下面这个实验台把这个闭环跑了出来：左边是整个动作库（每格一条 clip，按难度排序），点一次「训练下一轮」就新增一列 primitive。右边同时画着**单网络微调**那条线——它每轮也在难例上训，但会把旧技能洗掉：

<div class="paper-demo" data-demo="phc-pmcp"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 第四步：乘法组合（Multiplicative Composition）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：$\Pi_{PHC}$ 那一式，以及「连续混合」的含义</summary>

所有 Primitive 冻结后，Composer $C$ 学习动态混合它们：

$$
\Pi_{PHC}(a_t \mid s_t) = \frac{1}{\sum_i C_i(s_t)} \sum_i C_i(s_t) \cdot \Pi_{P^{(i)}}(a_t \mid s_t)
$$

- $C_i(s_t) \geq 0$：Composer 对第 $i$ 个 Primitive 的权重
- 这不是简单的开关切换，而是**连续混合**，允许多个技能同时发挥作用
</details>

源码层面，Composer 是单独的 MLP：

```python
# phc/learning/amp_network_mcp_builder.py
self.composer = self._build_mlp(..., units=self.units + [self.num_primitive], ...)
if self.has_softmax:
    self.composer.append(nn.Softmax(dim=1))
```

而真正执行时，环境会把 composer 输出的权重拿去对多个 primitive 的动作做加权：

```python
# phc/env/tasks/humanoid_im_mcp.py
_, actions = self.pnn(curr_obs)
x_all = torch.stack(actions, dim=1)
actions = torch.sum(weights[:, :, None] * x_all, dim=1)
```

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：这两行代码为什么值得看</summary>

这两行代码特别值得看，因为它把 PHC 的抽象概念直接落成了实现：
- `actions` 不是一个网络给的
- 而是多个 primitive 都给一份动作建议
- 然后由 composer 给权重，做连续混合

> 🔑 **关键理解**：PHC 不是“当前时刻只选一个专家”，而是更像“多个专家同时给意见，再做加权融合”。这也是它在动作过渡和失败恢复时更顺的原因。
</details>

「连续混合」和「只选一个专家」差在哪？下面这个演示只有一个旋钮：Composer 的温度。把它拉满，softmax 变成 one-hot，输出曲线就会在交界处出现**台阶**——那一跳在 30Hz 的控制回路上就是一次力矩冲击：

<div class="paper-demo" data-demo="phc-mcp"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 第五步：摔倒恢复（Fail-State Recovery）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：$P^F$ 的四条专门设计</summary>

$P^F$ 的训练有专门设计：

- **初始化**：角色被随机扔到地上（各种姿态）、距参考 2-5m 远
- **简化目标**：恢复模式下只关注根节点位置，不管全身姿态
- **切换机制**：当角色根节点距参考 < 0.5m 时，自动切回正常模仿模式
- **训练数据**：只用简单移动数据 $Q_{loco}$
</details>

这一块源码其实非常硬核，而且很能体现 PHC 的工程价值。

在 `HumanoidAMPGetup` 里，系统会先**离线生成一批摔倒状态**：

```python
# phc/env/tasks/humanoid_amp_getup.py
root_states[..., 3:7] = torch.randn_like(root_states[..., 3:7])
root_states[..., 3:7] = torch.nn.functional.normalize(root_states[..., 3:7], dim=-1)
...
for i in range(max_steps):
    self.gym.simulate(self.sim)
...
self._fall_root_states = self._humanoid_root_states.clone()
self._fall_dof_pos = self._dof_pos.clone()
```

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：fail-state 库是怎么「滚」出来的</summary>

意思是：
- 先把角色随机旋转、随机打乱到不稳定姿态
- 让物理引擎自己滚一段时间
- 最终停下来的那些状态，就被当成“真实摔倒状态库”
</details>

之后 reset 时，不再总是回到标准参考状态，而是有一定概率直接从这些 fail-state 开始：

```python
recoveryEpisodeProb: 0.5
fallInitProb: 0.3
recoverySteps: 90
```

<div class="mermaid">
flowchart TB
    N["正常 episode：标准参考 init"] 
    F["fail init：随机摔倒状态库"]
    F --> R["recovery 90 步内禁止 reset"]
    R --> OK["根节点距参考 <0.5m → 切回模仿"]
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三个概率开关分别对应什么</summary>

对应逻辑是：
- 有些 episode 从正常轨迹开始
- 有些 episode 直接从摔倒状态开始
- 在 recovery 窗口内，环境**禁止 reset**，强迫策略自己爬起来
</details>

源码里这一句非常关键：

```python
is_recovery = self._recovery_counter > 0
self.reset_buf[is_recovery] = 0
self._terminate_buf[is_recovery] = 0
```

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：「不许 reset」为什么就是 perpetual</summary>

也就是说：

> **只要处于恢复阶段，哪怕你看起来“本来该终止了”，环境也不让你 reset。**

这就是 PHC 真正“perpetual”的地方：不是口头上说永续，而是训练机制上就不允许你靠 reset 逃避失败。
</details>

把运行时的模式切换画成状态机，“永续”的含义就非常直白——DeepMimic 摔倒只能 reset，PHC 摔倒后多了一条**自己爬起来接回轨迹**的回路：

<div class="mermaid">
stateDiagram-v2
    state "模仿模式：精确跟踪全身参考姿态" as IM
    state "恢复模式：只追根节点位置（r_point）" as REC
    state "recovery 窗口（90 步）：reset_buf 强制为 0" as WIN
    [*] --> IM
    IM --> REC : 摔倒 / 偏离参考 2~5m
    REC --> WIN : 进入恢复窗口，禁止 reset
    WIN --> WIN : Pᶠ 主导：翻身 → 起身 → 走向目标
    WIN --> IM : 根节点距参考 < 0.5m，切回模仿
    IM --> IM : composer 混合 P¹…P³ 持续跟踪
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：和 DeepMimic 的 episode 状态机对照</summary>

> 🔑 对照 DeepMimic 笔记的 episode 状态机看：DeepMimic 的 FAIL 是**终态**（只能 reset 重来），PHC 把 FAIL 变成了**中间态**（恢复模式），这正是论文标题里 “Perpetual” 的机制来源。
</details>

这套「摔倒 → 恢复 → 切回」的逻辑跑起来是什么样？下面这个实验台画了一整条 episode：注意底下那条模式带，以及右边那根短柱——它代表没有 $P^F$ 时这条 episode 会在第几步结束：

<div class="paper-demo" data-demo="phc-recovery"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## 📁 PHC 源码对照

PHC 没有收进 MimicKit，但官方仓库已经公开，而且代码结构和论文是一一对得上的。下面给你一个“论文概念 ↔ 代码实现”的对照表。

### 源码运行时序图

官方仓库 [ZhengyiLuo/PHC](https://github.com/ZhengyiLuo/PHC) 的统一入口是 `phc/run_hydra.py`（Hydra 配置 + rl_games 训练器 + IsaacGym）。训练分两个大阶段：先渐进式训练 primitive（PNN 列网络 + 硬负例挖掘），再冻结 primitive 训练 composer（MCP）：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant R as run_hydra.py<br/>(rl_games 训练器)
    participant E as HumanoidIm 环境<br/>(humanoid_im.py)
    participant P as PNN primitives<br/>(amp_network_pnn_builder.py)
    participant C as Composer<br/>(amp_network_mcp_builder.py)
    participant S as IsaacGym 仿真
    Note over U,S: 阶段一：渐进训练 primitives（learning=im_pnn_big env=env_im_pnn）
    U->>R: python phc/run_hydra.py learning=im_pnn_big env=env_im_pnn env.motion_file=AMASS
    R->>P: freeze_pnn(training_prim)：冻结旧列，只训当前列 P(k)
    loop 每轮 rollout + PPO 更新
        E->>E: 采样参考动作（训练 P(0) 用全量，P(k) 用上一列的失败序列 = 硬负例）
        E-->>R: obs = 当前状态 + 目标参考帧
        R->>P: 当前列 P(k) 前向 → 动作 a_t
        P->>S: 仿真一步
        E-->>R: imitation reward = w·exp(−k·误差)（pos/rot/vel/ang_vel 四项）
        R->>P: PPO 更新当前列（旧列梯度冻结，防遗忘）
    end
    R->>R: 评估全数据集 → 收集失败序列 → 新增一列 P(k+1)，重复阶段一
    Note over U,S: 阶段二：训练 composer（learning=im_mcp_big env=env_im_getup_mcp，含 getup 恢复）
    U->>R: python phc/run_hydra.py learning=im_mcp_big env=env_im_getup_mcp env.models=[Humanoid.pth]
    R->>P: 加载并冻结全部 primitives
    loop 每轮 rollout + PPO 更新
        alt 正常 episode（标准参考 init）
            E->>E: 从参考轨迹初始化
        else recovery episode（recoveryEpisodeProb=0.5, fallInitProb=0.3）
            E->>E: 从离线生成的摔倒状态库初始化
            E->>E: recovery 90 步内强制 reset_buf=0（不许 reset，必须自己爬起）
        end
        R->>P: pnn(curr_obs) → 每个 primitive 各出一份动作
        R->>C: composer(obs) → softmax 权重 w
        C-->>R: 最终动作 = Σ wᵢ · aᵢ（humanoid_im_mcp.py 加权求和）
        R->>S: 仿真一步 → imitation reward → PPO 只更新 composer
    end
    Note over U,S: 评估：learning=im_mcp test=True im_eval=True → AMASS 全量成功率/G-MPJPE
</div>

- 阶段一对应第 1 节：`numCols` 个 primitive 逐列训练，硬负例（上一列跟不上的序列）驱动新列专攻难动作。
- 阶段二对应第 2、3、5 节：composer 输出权重做动作融合；getup 环境混入"从摔倒状态开始 + 恢复窗口禁止 reset"的 episode，这就是 perpetual 的训练机制。

### 1. Progressive Primitive（PNN 列网络）

```python
# phc/learning/amp_network_pnn_builder.py
self.pnn = PNN(actor_mlp_args,
               output_size=kwargs['actions_num'],
               numCols=self.num_prim,
               has_lateral=self.has_lateral)
self.pnn.freeze_pnn(self.training_prim)
```

这对应论文里的 progressive primitive：
- `numCols` = primitive 数量
- 每一列是一个 primitive
- 训练新列时，旧列冻结，避免遗忘

### 2. Composer / MCP 网络

```python
# phc/learning/amp_network_mcp_builder.py
self.composer = self._build_mlp(..., units=self.units + [self.num_primitive], ...)
if self.has_softmax:
    self.composer.append(nn.Softmax(dim=1))
```

这对应论文里的 composer $C(s)$，输出每个 primitive 的权重。

### 3. Composer 执行动作融合

```python
# phc/env/tasks/humanoid_im_mcp.py
_, actions = self.pnn(curr_obs)
x_all = torch.stack(actions, dim=1)
actions = torch.sum(weights[:, :, None] * x_all, dim=1)
```

这就是 PHC 最核心的运行时逻辑：
- 每个 primitive 都输出一份动作
- composer 给出权重
- 最终动作 = 所有 primitive 动作的加权和

### 4. Imitation Reward

```python
# phc/env/tasks/humanoid_im.py
r_body_pos = torch.exp(-k_pos * diff_body_pos_dist)
r_body_rot = torch.exp(-k_rot * diff_global_body_angle_dist)
r_vel = torch.exp(-k_vel * diff_global_vel_dist)
r_ang_vel = torch.exp(-k_ang_vel * diff_global_ang_vel_dist)
reward = w_pos * r_body_pos + w_rot * r_body_rot + w_vel * r_vel + w_ang_vel * r_ang_vel
```

对应配置：

```yaml
reward_specs:
  k_pos: 100
  k_rot: 10
  k_vel: 0.1
  k_ang_vel: 0.1
  w_pos: 0.5
  w_rot: 0.3
  w_vel: 0.1
  w_ang_vel: 0.1
```

### 5. Fail-State Recovery / Getup

```python
# phc/env/tasks/humanoid_amp_getup.py
recoveryEpisodeProb: 0.5
fallInitProb: 0.3
recoverySteps: 90
```

```python
self._fall_root_states = self._humanoid_root_states.clone()
self._fall_dof_pos = self._dof_pos.clone()
...
self.reset_buf[is_recovery] = 0
self._terminate_buf[is_recovery] = 0
```

含义：
- 一部分 episode 直接从摔倒状态开始
- 一旦进入恢复窗口，就不允许 reset
- 策略必须自己把人形重新拉起来

### 6. 公开结果（代码仓库 README）

官方仓库当前 README 给出的 cleaned AMASS（11313 sequences）结果是：

| 模型 | 成功率 Succ | G-MPJPE | ACC |
|------|------------:|--------:|----:|
| **PHC** | 98.9% | 37.5 | 3.3 |
| **PHC-KP** | 98.7% | 40.7 | 3.5 |
| **PHC+ / PULSE** | 100% | 26.6 | 2.7 |
| **PHC-Prim** | 99.9% | 25.9 | 2.3 |

> 注：这里是官方代码仓库后来补充的结果汇总，不完全等同于 ICCV 2023 论文原始表格；但它很好地说明了 PHC 系列后续演进到了什么程度。

---

## 🚶 具体实例：PHC 如何处理一段视频输入

### 场景

用户在摄像头前做动作，视频姿态估计器（HybrIK）输出带噪声的骨骼姿态，PHC 驱动虚拟角色实时模仿。

### 第 1 步：获取参考姿态

```
用户做"挥手"动作
  → HybrIK 提取每帧关节旋转 θ_t（有噪声）
  → 高斯滤波平滑
  → 得到参考动作序列 {q_ref_1, q_ref_2, ...}
```

### 第 2 步：计算状态

```
当前帧 t：
  本体感知: q_sim = 角色当前关节角度和速度
  目标差异: s_goal = (q_ref_{t+1} - q_sim, p_ref - p_sim, ...)
  → 拼接得到状态 s_t
```

### 第 3 步：Primitive 各自输出

```
P¹(s_t) → μ¹, σ¹   (基础技能建议: "左臂向上抬 30°")
P²(s_t) → μ², σ²   (进阶技能建议: "协调肩膀旋转")  
Pᶠ(s_t) → μᶠ, σᶠ  (恢复技能建议: "不需要恢复")
```

### 第 4 步：Composer 混合

```
C(s_t) → w = [0.7, 0.3, 0.0]  (主要用P¹，辅以P²，不需要恢复)
最终动作 = 0.7 * μ¹ + 0.3 * μ²
→ PD 控制 → 关节扭矩 → 角色挥手
```

### 第 5 步：突然摔倒！

```
用户突然蹲下，噪声导致参考姿态跳变
→ 角色失衡摔倒

下一帧:
  C(s_t) → w = [0.0, 0.0, 1.0]  (全部交给恢复 Primitive)
  Pᶠ: "先撑地，然后站起来，走向参考位置"
  
几秒后:
  角色站稳，距参考 < 0.5m
  → 切回正常模仿模式
  C(s_t) → w = [0.6, 0.4, 0.0]
```

---

## 🤖 PHC 在学习路线中的位置

```
DeepMimic (2018)     →    PHC (2023)         →    PULSE (2024)
单动作模仿              大规模+自恢复           通用运动潜空间
"学会翻跟斗"           "学会10000个动作        "把所有技能压缩成
                        +摔倒自己爬起来"        一个潜空间编码"
```

PHC 解决了 DeepMimic 的三个痛点：
1. **规模**：从几个动作 → 10000+ 动作（PMCP 解决遗忘）
2. **鲁棒性**：摔倒自恢复，无需 reset（Fail-state Recovery）
3. **噪声容忍**：支持视频/语言等噪声输入（Keypoint-based 输入）

---

## 🎤 面试高频问题 & 参考回答

### Q1: PHC 和 DeepMimic 的核心区别？

DeepMimic 一次只学一个动作片段，用参考动作 + 残差作为动作空间，角色偏离就 reset。PHC 能同时学上万条动作、直接输出绝对 PD 目标（不加残差不用外力），摔倒后自动恢复，支持永续运行。核心创新是 PMCP 架构解决大规模学习的灾难性遗忘问题。

### Q2: PMCP 怎么解决灾难性遗忘？

渐进式训练：先学全部数据，收敛后冻结参数，找出失败的难例交给新网络学习。新网络从旧网络权重初始化（权重共享），保留已有技能。最终用 Composer 网络动态混合所有 Primitive 的输出。这样新技能不会覆盖旧技能，因为旧网络参数是冻结的。

### Q3: 为什么用乘法组合（MCP）而不是简单切换？

简单切换（mixture of experts）在技能边界会出现不连续的动作跳变。MCP 允许多个 Primitive 同时贡献、连续混合，过渡更平滑。比如从走路过渡到跑步时，两个 Primitive 可以按比例混合而不是硬切换。

### Q4: PHC 的摔倒恢复是怎么实现的？

专门训练一个 Recovery Primitive $P^F$：(1) 初始化时将角色随机扔到各种摔倒姿态，(2) 简化目标为只追踪根节点位置，(3) 用简单移动数据训练。当角色根节点距参考 < 0.5m 时自动切回正常模仿。关键是不使用任何外部稳定力。

### Q5: PHC 为什么不用残差动作？

残差动作（$a = a_{ref} + \Delta a$）依赖参考动作作为基准，限制了策略的表达能力。PHC 直接输出绝对 PD 目标，虽然更难学习，但在处理噪声输入和恢复场景时更灵活——因为恢复时根本没有合理的参考动作可以加残差。

### Q6: PHC 的 Relaxed Early Termination 是什么？

当平均关节距参考超过 0.5m 就终止 episode，但**排除脚踝和脚趾关节**。这是因为脚部的精确匹配对维持平衡不那么重要，过早终止反而阻碍了策略学习平衡技巧。

### Q7: PHC 能处理什么样的输入？

两种：(1) Rotation-based：完整关节旋转，适合 MoCap 或 HybrIK 等旋转估计器；(2) Keypoint-based：只需 3D 关键点位置，适合 MeTRAbs 等位置估计器或 VR 控制器。后者更鲁棒，对噪声容忍度更高。

---

## 💬 讨论记录

（待补充）

---

## 📎 附录

### A. 网络架构

| 组件 | 架构 | 参数 |
|------|------|------|
| 每个 Primitive $P^{(k)}$ | MLP [1024, 512] | 高斯策略 $\mathcal{N}(\mu, \sigma)$ |
| Progressive 结构 | PNN（多列网络） | 新 primitive 扩列，旧列冻结 |
| Composer $C$ | MLP（输出 primitive 权重） | 可带 softmax，也可不带 |
| 判别器 $D$ | MLP [1024, 512] | AMP 风格，含梯度惩罚 |
| 人体模型 | SMPL（24 刚体，23 驱动） | 支持不同体型 $\beta$ |

> 🔑 一个容易搞混的点：**PNN 负责“学多个 primitive”**，**Composer/MCP 负责“运行时混这些 primitive”**。前者解决遗忘，后者解决调度。

### B. 训练超参数

| 参数 | 值 | 说明 |
|------|-----|------|
| RL 算法 | PPO | 与 DeepMimic 一致 |
| 控制频率 | 30 Hz | 策略推理 |
| 仿真频率 | 60 Hz | 物理仿真 |
| 终止阈值 | 0.5m | 平均关节距离（排除脚踝/脚趾） |
| 能量惩罚系数 | 0.0005 | $r_{energy}$ |
| Primitive 数量 | 4（含恢复） | 3 个模仿 + 1 个恢复 |
| 训练数据 | AMASS（过滤后） | 去除坐姿、人物交互等 |
| 训练时间 | ~1 周 | 单张 A100 GPU |
| 模型大小 | 28.8 MB | 含所有 Primitive 和 Composer |

### C. 与 DeepMimic、AMP 的对比

| 特性 | DeepMimic | AMP | PHC |
|------|-----------|-----|-----|
| 动作规模 | 单个/少量 | 中等 | 10000+ |
| 动作空间 | 参考+残差 | 直接输出 | 直接输出（PD 目标） |
| 外部力 | 无 | 无 | 无 |
| 摔倒恢复 | ❌ reset | ❌ reset | ✅ 自恢复 |
| 永续运行 | ❌ | ❌ | ✅ |
| 噪声输入 | ❌ | ❌ | ✅ |
| 灾难性遗忘 | N/A | 有 | PMCP 解决 |

### D. PHC+ 改进（ICLR 2024）

PHC+ 是 PHC 的升级版，发表于 ICLR 2024（论文标题：Universal Humanoid Motion Representations for Physics-Based Control）：

| 改进 | 说明 |
|------|------|
| AMASS 成功率 100% | 从 PHC 的部分成功提升到全部动作 |
| PULSE 潜空间 | 将所有技能蒸馏到一个潜空间，可作为下游任务基础模型 |
| 下游泛化 | 支持导航、地形行走、VR 控制等，无需重新训练 |

### E. 关键实验指标

| 数据集 / 模型 | 成功率 | MPJPE / G-MPJPE |
|--------|--------|------------|
| AMASS 测试集（PHC） | 98.9% | 37.5 |
| AMASS 测试集（PHC-KP） | 98.7% | 40.7 |
| AMASS 测试集（PHC+） | 100% | 26.6 |
| H36M-Motion*（MoCap） | 高 | 竞争力强 |
| H36M-Test-Video*（视频噪声） | 鲁棒 | 噪声下仍可用 |

### F. 你该怎么理解 PHC？

如果只记一句：

> **DeepMimic 解决“学会一个动作”，PHC 解决“在大动作库里持续地活着、跟着、摔了还能自己起来”。**

如果只记两句，再加一句：

> **PHC 的真正价值不只是 tracking 精度，而是它把 motion imitation 从“单技能 demo”推进成了“可扩展控制系统”。**
