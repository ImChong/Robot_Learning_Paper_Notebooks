---
layout: paper
paper_order: 24
title: "LATENT: Learning Athletic Humanoid Tennis Skills from Imperfect Human Motion Data"
zhname: "LATENT：从不完美的人类动作数据中学习人形机器人网球运动技能"
category: "Loco-Manipulation and WBC"
---

# LATENT: Learning Athletic Humanoid Tennis Skills from Imperfect Human Motion Data
**LATENT：从不完美的人类动作片段中学出会打网球的 Unitree G1**

> 📅 阅读日期: 2026-04-24
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 高动态体育技能

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2603.12686](https://arxiv.org/abs/2603.12686) |
| **HTML** | [在线阅读](https://arxiv.org/html/2603.12686v1) |
| **PDF (arXiv)** | [下载](https://arxiv.org/pdf/2603.12686) |
| **PDF (项目主页)** | [Humanoid_Tennis.pdf](https://zzk273.github.io/LATENT/static/scripts/Humanoid_Tennis.pdf) |
| **项目主页** | [zzk273.github.io/LATENT](https://zzk273.github.io/LATENT/) |
| **GitHub** | [GalaxyGeneralRobotics/LATENT](https://github.com/GalaxyGeneralRobotics/LATENT) |
| **发布时间** | 2026 年 3 月（arXiv） |
| **机构** | Tsinghua University · Peking University · Galbot 等 |
| **实验平台** | Unitree G1 humanoid |
| **仿真器** | MuJoCo（JAX/Brax 训练，ONNX 部署） |

**作者**: Zhikai Zhang, Haofei Lu, Yunrui Lian, Ziqing Chen, Yun Liu, Chenghuai Lin, Han Xue, Zicheng Zeng, Zekun Qi, Shaolin Zheng, Qing Luan, Jingbo Wang, Junliang Xing, He Wang, Li Yi

---

## 🎯 一句话总结

LATENT 只用 **5 小时、3 × 5 米小场地采集的"业余网球动作碎片"**，就把 Unitree G1 训练成会在真人对打下完成连续多拍回合的"人形网球手"——核心办法是先用动作跟踪器学出一个**可修正的 latent 动作空间**，再让高层策略在该空间里做 **"修正 + 组合"**，并用 **Latent Action Barrier (LAB)** 约束策略别跑出先验分布。

---

## 📖 英文缩写速查

| 缩写 | 全称 | 简单解释 | 生活类比 |
|------|------|----------|----------|
| **LATENT** | Learning Athletic humanoid TEnnis skills from imperfect human motioN daTa | 本论文方法名 | "靠烂素材也能打出好球"的训练配方 |
| **MoCap** | Motion Capture | 光学动作捕捉 | 给人贴反光小球拍"动作电影" |
| **OpenTrack** | Open-source motion tracking framework | 作者引用的开源动作跟踪训练框架 | 通用的"教机器人跟动作"底座 |
| **DAgger** | Dataset Aggregation | 在线蒸馏中常用的师生学习 | 老师看着学生做，错了就补一条示范 |
| **LAB** | Latent Action Barrier | 潜动作势垒 | 让策略别跳出"合理动作圈" |
| **PPO** | Proximal Policy Optimization | 近端策略优化，RL 基石 | 每次策略只小步更新，稳 |
| **VAE / Prior** | Variational / State-conditioned Prior | 以当前状态为条件的 latent 先验 | "这种局势下正常人会怎么挥拍" |
| **Sim-to-Real** | Simulation to Reality | 仿真到真机的迁移 | 训练场练熟，再上实战 |
| **MuJoCo** | Multi-Joint dynamics with Contact | 接触丰富的物理仿真器 | 物理引擎里的"接触专家" |
| **ONNX** | Open Neural Network Exchange | 跨框架部署格式 | 模型的"通用插头" |

---

## ❓ 要解决什么问题

这篇论文回答了一个很具体的问题：

> **在"没有人-球完整匹配数据"的前提下，能不能让 Unitree G1 与真人进行多拍网球对打？**

难点集中在三条：

### 1. 网球动作的数据极难收集
真正的比赛数据有两个门槛：
- 需要整块球场和专业球员
- 需要同步采集动作与球的轨迹

很少有数据集能同时满足，更别说整理成可用于 RL 的参考轨迹。

### 2. 重定向到人形机器人后，动作会"残缺"
即便有人类动作：
- 球拍在哪？
- 手腕往往会抖动
- G1 的自由度、长度与人不完全一致，重定向后容易扭曲

直接把这些"半真半假"的轨迹当 ground truth，会让模仿器学出扭曲的动作。

### 3. 网球是典型"高动态 + 高精度"任务
- 来球速度快、方向多变
- 回球落点要求精确
- 挥拍时机与步法需要紧密配合
- 对安全阈值要求高，不能把高动态动作学成"乱挥"

> 💡 **类比**：之前的方法像"照着完整武术表演视频学武术"。LATENT 像"只看到几段零散的挥拳、跨步、转身短片，就要去打实战"——必须把零件拼起来并在实战中自己修正。

---

## 🔧 方法详解

LATENT 把训练拆成 **三个阶段**：先学"怎么动"，再学"怎么安全地动"，最后学"什么时候该怎么动"。

### Stage 1：动作跟踪器预训练（Motion Tracker Pre-training）

这一阶段的目标：在 MuJoCo 里训练一个策略 $\pi _ {\text{track}}$，让它能跟踪 **"不完美的"** 人类网球动作碎片。

数据侧：
- **5 位业余球员**在 **3 × 5 m** 的小 MoCap 空间里做基础动作
- **5 小时**短片段，不做编辑、不做标注
- 包含 4 类 **primitives**：
  1. **Forehand stroke**（正手击球）
  2. **Backhand stroke**（反手击球）
  3. **Lateral shuffle**（侧滑步）
  4. **Crossover step**（交叉步）

训练侧：
- 基于开源框架 **OpenTrack**
- 典型的 RL + 模仿奖励：root 位置/朝向、关节位置/速度、关键链路姿态
- **有意放弃右腕信号**：由于右腕是球拍方向的关键，原始 MoCap 在高动态下抖动严重，直接跟踪会让动作失真。作者选择 **不把右腕加入追踪项**，并在训练中加扰动，让下游阶段再由 high-level policy 去"修正"它

> 🔑 **要点**：这一步得到的不是"完美网球手"，而是一个能粗略跟住人类片段的 baseline 控制器。它的 latent 特征将成为下一阶段的"技能字典"。

### Stage 2：在线蒸馏构建可修正的潜动作空间（Online Distillation to a Correctable Latent Action Space）

直接把 Stage 1 的 tracker 挪去打球是不行的——它只会复述输入的参考轨迹，缺乏实时修正能力。LATENT 的核心创新：

- 用 **DAgger 风格的在线蒸馏**，把 tracker 的行为压进一个 **state-conditioned latent 先验** $p(z \mid s)$
- latent $z$ 作为**原语动作的压缩表达**，解码器把 $z$ 映射到关节目标
- 同时保留 **残差修正通道**：$a = \text{decode}(z + \delta z, s)$，$\delta z$ 由高层策略输出

这样得到了一个**可修正的 latent 动作空间**：
- 从 $p(z \mid s)$ 采样 → 得到"一个合理的网球动作原语"
- 叠加小 $\delta z$ → 在该原语附近做微调，使真实状态下击球时机/位置对齐

> 🔑 **直观理解**：Stage 1 学的是"挥拍、步法的肌肉记忆"；Stage 2 把这些肌肉记忆压成一个"状态 → 合理动作分布"的查表，并留出可调参数让上层决策去拧螺丝。

### Stage 3：高层策略 + Latent Action Barrier（High-Level Policy with LAB）

高层策略 $\pi _ {\text{hi}}(z, \delta z \mid s, \text{ball})$ 接受机器人状态 + 球的状态，输出两样东西：

1. latent 动作 $z$（选哪个原语、怎么组合）
2. 残差 $\delta z$（对原语做局部修正）

**任务奖励**（典型设置）：
- 击球成功：拍与球碰撞
- 回球落点接近目标位置
- 步法流畅、姿态自然（借助模仿奖励 / 原语先验）

**Latent Action Barrier (LAB)**：
策略如果完全自由地搜 latent 空间，会迅速发现"钻 latent 漏洞"的捷径——产生虽然能击中球、但动作抖动、非人类的行为。LAB 是一种基于 **Mahalanobis 距离**的势垒：

$$\mathcal{B}(z, s) = (z - \mu(s))^\top \Sigma(s)^{-1} (z - \mu(s))$$

- 中心 $\mu(s)$ 来自 Stage 2 的 state-conditioned 先验均值
- 协方差 $\Sigma(s)$ 来自先验方差，**自适应缩放**
- 当 $\mathcal{B}$ 超过阈值时，对 reward / loss 加入惩罚，阻止策略跑到先验分布之外

实际效果：
- 没有 LAB：策略会利用 latent 空间搞出 jittery（抖动、非自然）动作，反而拉低整体表现
- 有了 LAB：动作自然、稳定，回球精度高

### 配套设计：右腕修正与扰动鲁棒性
- **Tracker 侧**：不跟踪右腕 + 在训练中对腕部施加扰动，让下游策略接管"真正打球手"
- **高层侧**：通过 $\delta z$ 精调腕部，适配不同来球角度
- **Sim-to-Real**：训练阶段对质量、摩擦、延迟等做随机化；部署阶段导出 ONNX 直接上 G1

---

## 🚶 具体实例：一次多拍回合是怎么打出来的？

假设人类向机器人打了一个正手深球：

1. **感知**：球的当前位置、速度、预测落点送入高层策略
2. **决策**：
   - 策略输出 $z$ → 在 state-conditioned 先验中对应"侧滑 + 正手挥拍"原语
   - 同时输出 $\delta z$ → 调整挥拍角度，让拍面对准球的预测落点
3. **动作解码**：latent 解码器把 $z + \delta z$ 解码为关节目标
4. **低层执行**：底层 PD 控制器跟踪关节目标
5. **击球**：G1 抬脚侧滑两步 → 身体转向 → 完成正手挥拍 → 将球击回对面指定区域
6. **下一拍**：回到防守站位（另一个 latent 原语），等待人类回球

整个循环，每一步都在 latent prior 附近的"小圆圈"里调整，保证动作既有战术针对性、又不失自然人类风格。

---

## 🧪 实验与结果

### 1）核心指标
- **最高回球成功率 96.5%**（定义：返回到目标位置 2.5 m 内的比例）
- 另一组设定给出 **约 90.9%** 的回球精度（更严格场景）
- 成功与真人进行**多拍连续对打**（multi-shot rally）

### 2）覆盖的技能组合
- 正手 / 反手 击球
- 左右侧滑、交叉步接近不同落点
- 对不同速度、角度的来球做出回击
- 自然的步法衔接与"归位"动作

### 3）Ablation（文献主张）
- **去掉 LAB**：策略收敛到"能打中球但动作僵硬/抖动"的退化解，评测指标下降
- **直接跟踪完整人类-网球动作（无原语分解）**：因数据稀缺，成功率显著下降
- **跟踪右腕**：腕部抖动被学进模型，影响击球精度

### 4）Sim-to-Real
- 训练完全在 MuJoCo 中，使用域随机化
- 部署通过 ONNX，在 Unitree G1 上直接运行高层 + 解码器
- 无需依赖完整球场的现场标定

---

## 📁 源码对照（GalaxyGeneralRobotics/LATENT）

> 基于 GitHub 仓库 README 可核对内容（在线蒸馏部分仓库注明仍在发布中）。

### 1. 仓库定位
- `latent_mj/`：基于 MuJoCo + JAX/Brax 的主训练包
- `scripts/process_motion/`：MoCap → 机器人可用参考轨迹的数据处理
- `storage/assets/`：G1 机器人 URDF / MJCF / 参考动作
- `storage/data/mocap/Tennis/`：网球动作数据（通过 Google Drive 下载）

### 2. 训练入口
```bash
# 训练 Stage 1 tracker（G1 网球）
python -m latent_mj.learning.train.train_ppo_track_tennis \
    --task G1TrackingTennis
```
这一条命令对应论文的 **Motion Tracker Pre-training**，其他阶段 (online distillation / high-level policy) 的代码仓库注明将陆续补齐。

### 3. 推理 / 部署
- 训练产物可导出为 ONNX
- Unitree G1 侧直接加载 ONNX 执行高层策略 + 解码器
- 多 GPU 并行训练支持在仓库内开启

### 4. 引用
仓库 README 内附 BibTeX，可直接用于论文引用。

---

## 🏗️ 工程复现要点

| 环节 | 关键点 |
|------|--------|
| **数据采集** | 3 × 5 m 小场地 + 5 位业余球员 + 5 小时原语片段 |
| **跟踪器预训练** | 基于 OpenTrack；**不追踪右腕**；对腕部加扰动 |
| **在线蒸馏** | DAgger 风格；构造 state-conditioned latent prior $p(z\|s)$；保留残差通道 $\delta z$ |
| **高层策略** | 任务奖励（击球/落点）+ LAB 势垒；PPO 训练 |
| **LAB 势垒** | 基于 Mahalanobis 距离，中心为先验均值，方差自适应缩放 |
| **Sim-to-Real** | MuJoCo 随机化；ONNX 部署到 Unitree G1 |

---

## 🤖 工程价值

- **低门槛数据范式**：3 × 5 m 小空间、5 小时业余数据就能训出真正可对打的网球策略，极大降低体育型任务的数据成本
- **"模仿 + 修正"范式**：把"模仿人"与"在线纠正"解耦，使得人形机器人能在真实对抗环境中持续适配
- **LAB 机制**：为 latent-based RL 控制器提供了一个通用的"别作弊"约束，这一思路可以迁移到其他动作类任务（羽毛球、乒乓球、击剑等）
- **可部署性**：MuJoCo + JAX/Brax + ONNX 的组合让训练与部署相对独立，便于工程化

---

## 🎤 面试高频 Q&A

1. **为什么叫"imperfect human motion data"？**
   - 不是完整的比赛轨迹，而是业余球员在小场地里做的**动作碎片**（primitive clips），既没有球的配对信息，右腕数据也存在抖动。

2. **LATENT 三个 Stage 各自负责什么？**
   - Stage 1 学"怎么挥、怎么走"；Stage 2 把技能压进可修正的 latent 空间；Stage 3 学"面对什么球该选哪个技能 + 怎么微调"。

3. **Latent Action Barrier (LAB) 在解决什么问题？**
   - 防止高层策略利用 latent 空间"钻漏洞"产生抖动/非自然动作。它用先验的 Mahalanobis 距离作为软约束，把策略压在合理分布内。

4. **为什么训练时特意不追踪右腕？**
   - MoCap 的右腕信号在高动态下噪声大；让 tracker 追腕部会把抖动学进模型。作者选择让跟踪器不管腕部，反过来由高层策略用 $\delta z$ 精调，兼顾鲁棒性与精度。

5. **96.5% 的数字怎么界定？**
   - 在特定评测下，返回球落到目标位置 2.5 m 半径内视为成功，最高一组设定下达到 96.5%。

6. **和 PULSE / ASE 这些 latent-based 方法有什么不同？**
   - 相同：都用潜空间组织原语技能；不同：LATENT 聚焦"数据极不完美且高动态"的竞技场景，并新增了 LAB 势垒与右腕补偿这两项针对网球的工程设计。

7. **能否迁移到乒乓球 / 羽毛球？**
   - 理论上可以：只要能采集到相应的原语片段，LATENT 的三阶段 + LAB 框架是任务不可知的。关键挑战是数据的动作速率与接触精度要求。

---

## 🔗 与路线图其他论文的关联

| 论文 | 关系 |
|------|------|
| PHC / PULSE | 提供"把海量动作压进 latent 空间"的思路基础 |
| ASE / CALM | 可控 latent 动作空间、风格组合的前驱 |
| DeepMimic / AMP | 参考动作模仿 + 风格先验的经典范式 |
| **LATENT** | 将 latent 技能库推广到"数据不完美的高动态对抗任务" |
| HITTER / Table Tennis 工作 | 同属"球类运动人形机器人"家族，可横向对比 |

---

## 📎 参考来源

- arXiv 论文页：[https://arxiv.org/abs/2603.12686](https://arxiv.org/abs/2603.12686)
- HTML 版：[https://arxiv.org/html/2603.12686v1](https://arxiv.org/html/2603.12686v1)
- PDF（项目主页）：[https://zzk273.github.io/LATENT/static/scripts/Humanoid_Tennis.pdf](https://zzk273.github.io/LATENT/static/scripts/Humanoid_Tennis.pdf)
- 项目主页：[https://zzk273.github.io/LATENT/](https://zzk273.github.io/LATENT/)
- 源码：[https://github.com/GalaxyGeneralRobotics/LATENT](https://github.com/GalaxyGeneralRobotics/LATENT)
- 作者推文：Zhikai Zhang @ X
- 业界报道：techxplore / humanoidsdaily / interestingengineering 等

> 📝 **备注**：本笔记基于公开资料（arXiv 摘要、HTML 版、项目主页、源码 README、多个业界综述报道）整理。部分数值（如奖励权重、网络层数、扰动范围）在后续读者核对时，建议直接以 arXiv PDF 与 GitHub 仓库为准。
