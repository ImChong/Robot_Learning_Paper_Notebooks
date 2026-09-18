---
layout: paper
paper_order: 5
title: "APEX: Learning Adaptive High-Platform Traversal for Humanoid Robots"
zhname: "APEX：用棘轮式进度奖励学习「攀越式」高平台穿越的人形机器人技能"
category: "Locomotion"
---

# APEX: Learning Adaptive High-Platform Traversal for Humanoid Robots
**用棘轮式（ratchet）进度奖励，把"攀爬式"高平台穿越压进单一通用策略**

> 📅 阅读日期: 2026-05-18
>
> 🏷️ 板块: 05 Locomotion · 攀爬 / 富接触 / 多技能编排
>
> 🔁 推进轨: 模块轮转（04_WBC → **05_Locomotion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.11143](https://arxiv.org/abs/2602.11143) |
| HTML | [arXiv HTML](https://arxiv.org/html/2602.11143v2) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2602.11143) |
| 项目主页 | [apex-humanoid.github.io](https://apex-humanoid.github.io/) |
| 视频 | [YouTube 介绍视频](https://www.youtube.com/watch?v=jq7xx9Fusd8) |
| 概览（alphaXiv） | [alphaxiv.org/overview/2602.11143v1](https://www.alphaxiv.org/overview/2602.11143v1) |
| **发布时间** | 2026-02-11 (arXiv) |
| 源码 | 截至当前未见独立公开训练仓库；最新动态以 [项目页](https://apex-humanoid.github.io/) 为准 |
| 机构 | Carnegie Mellon University · Bosch Center for Artificial Intelligence |
| 发表时间 | 2026-02（v1）/ 2026-03（v2） |
| 评测平台 | Unitree **G1**（29 DoF）真机 + 仿真，最高平台 **0.8 m（≈ 腿长 114%）** |

---

## 🎯 一句话总结

> 把"高平台穿越"从**起跳式**改成**攀爬式**：用 6 个 *(climb-up · climb-down · walk · crawl · stand-up · lie-down)* 子技能 + 一个把"局部 LiDAR 几何"映射到全身动作的单一策略，配上**棘轮式进度奖励（ratchet progress reward）**只允许"已最佳进度"被记账、抑制反复试探的伪进步——结果是在 G1 上零样本翻越 **0.8 m 高 ≈ 腿长 114%** 的台子，全程不靠跳跃。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| RL | Reinforcement Learning | 强化学习 |
| DRL | Deep RL | 深度强化学习 |
| DoF | Degrees of Freedom | 自由度（G1 为 29 DoF） |
| LiDAR | Light Detection and Ranging | 激光雷达，用于本文的局部高程图感知 |
| Ratchet | 棘轮（单向，不许回退） | "best-so-far progress" 的形象化命名 |
| Sim2Real | Simulation-to-Real | 仿真到真机迁移 |

---

## ❓ 论文要解决什么问题？

人形 locomotion 这几年在**平地 / 不平地形**上已经做得不错，但**"翻越远高于腿长的平台"**还是个空白：

1. **跳跃式解法不安全**：RL 让策略自由探索，最容易学到"全身蓄力起跳"——冲击大、力矩饱和、真机部署危险。
2. **稀疏奖励难训**：长程目标（先靠近 → 抬腿上沿 → 撑住身体 → 站起 → 走过 → 下台）的奖励信号天然稀疏；用速度奖励替代又会逼出跳跃。
3. **多技能编排**：上去要"爬"，台上空间不够要"匍匐"，姿态错了要"先躺下再起身"——这些不能拆成多个独立策略，否则切换处会摔。

APEX 的目标：**一个策略**，**端到端**根据局部几何 + 命令自适应选择上述 6 个子技能，**安全**地穿越 ≥ 腿长的平台。

---

## 🔧 方法详解

### 1. 把"高平台穿越"分解成 6 个可学习的接触行为

| 子技能 | 触发场景 | 关键约束 |
|---|---|---|
| Climb-up | 立于垂直边缘下沿 | 手 / 膝 / 脚多点接触，反复抬腿压沿 |
| Climb-down | 立于上沿向下 | 控制下落速度，避免硬冲击 |
| Walk | 平台空间足够 | 常规双足步行 |
| Crawl | 平台空间不足 | 四肢着地匍匐前进 |
| Stand-up | 从趴/躺姿恢复 | 富接触站起 |
| Lie-down | 从站姿主动趴下 | 进入 crawl 的姿态前置 |

→ 所有 6 个技能被**蒸馏进一个**策略，由策略自己根据局部几何 + 命令做选择和切换。

### 2. 核心创新：棘轮式进度奖励（Ratchet Progress Reward）

> 棘轮 = 只能往前转、不能往回退。

- 维护一个"**到目前为止已达成的最佳任务进度**" $p^{\ast}_t$。
- 当前步进度 $p_t > p^{\ast}_t$ 才给**正奖励**并更新 $p^{\ast}_t \leftarrow p_t$；否则**惩罚**或零回报。
- 这样得到的是**密集**但**与速度无关**的监督——策略不再被诱导"跑得越快越好"或"跳起来抢分"，而是被引导"逐步把身体往目标方向"挪过去。
- 与"安全正则化（关节限位 / 接触冲击 / 自碰撞）"配合时，棘轮信号也避免了"为了拿一次大奖而冒大风险"。

### 3. LiDAR 局部高程图 + 双向 Sim2Real 缝合

- 感知：从机身 LiDAR 抽出**局部高程图（elevation map）**作为策略输入。
- 训练时（Sim 端）：**显式建模**真机建图常见的伪影（缺洞、噪点、薄边缘抖动）注入仿真高程图。
- 部署时（Real 端）：对真机高程图做**滤波 + 修补（inpainting）**抹平异常。
- 这套"训练时加噪 + 部署时降噪"的对偶策略，是 APEX **零样本** sim-to-real 的关键。

### 4. 单策略 → 自动编排

- 输入：本体感知 + 命令 + 局部高程图。
- 输出：全身动作。
- 子技能切换由策略**内部自发涌现**，不需要外部状态机或显式触发器；论文展示了平滑的多技能拼接。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph IN["📥 输入"]
        CMD["🎯 命令<br/>目标航向 / 朝向"]
        PROP["🦿 本体感知<br/>关节角 / 速度 / 重力"]
        MAP["🗺 局部高程图<br/>来自机身 LiDAR"]
    end

    subgraph S2R["🔁 双向 Sim2Real 缝合"]
        TRAIN_NOISE["训练时：注入建图伪影<br/>缺洞 / 抖动 / 噪点"]
        DEPLOY_FILT["部署时：滤波 + inpainting"]
    end

    subgraph CORE["🤖 单一策略 π(a #124; s)"]
        POLICY["全身 29-DoF 控制器<br/>蒸馏 6 个子技能"]
    end

    subgraph REW["🏁 棘轮式进度奖励"]
        BEST["维护最佳进度 p*_t"]
        STEP["若 p_t > p*_t → 正回报 + 更新<br/>否则 → 零/惩罚"]
        SAFE["+ 安全正则<br/>关节限位 / 冲击 / 自碰撞"]
    end

    subgraph SKILLS["🧩 自动编排的 6 子技能"]
        CU["⬆ Climb-up"]
        CD["⬇ Climb-down"]
        WK["🚶 Walk"]
        CR["🐛 Crawl"]
        ST["🪑 Stand-up"]
        LD["🛌 Lie-down"]
    end

    CMD --> POLICY
    PROP --> POLICY
    MAP --> TRAIN_NOISE
    TRAIN_NOISE --> POLICY
    DEPLOY_FILT --> POLICY
    POLICY --> SKILLS
    SKILLS -. 训练监督 .-> BEST
    BEST --> STEP
    STEP --> SAFE
    SAFE -. RL 反馈 .-> POLICY

    REAL["🚀 Unitree G1 真机<br/>0.8 m 平台 ≈ 114% 腿长"]
    POLICY ==零样本部署==> REAL

    style IN fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style S2R fill:#fef6e4,stroke:#d35400,color:#5e2c00
    style CORE fill:#e8f8e8,stroke:#27ae60,color:#1b5e20
    style REW fill:#fde2e2,stroke:#c0392b,color:#5d1a14
    style SKILLS fill:#f3e8fd,stroke:#7b3fbf,color:#3b1e60
</div>

---

## 💡 核心贡献

1. **范式切换**：把高平台穿越从"跳跃"重定义为"攀爬式多接触行为"，从根本上规避高冲击。
2. **棘轮式进度奖励**：提供**密集 + 与速度解耦**的目标导向监督，对长程稀疏任务通用，不仅限于本文。
3. **单策略多技能编排**：6 个子技能在同一策略里自发切换，避免显式状态机带来的接缝失稳。
4. **零样本 Sim2Real**：高程图"训练加噪 + 部署降噪"的对偶处理，G1 实机翻越 0.8 m 平台（≈ 腿长 114%）。

---

## 📊 关键实验结果（结构性总结）

| 维度 | 主要结论 |
|---|---|
| 最大平台高度 | **0.8 m**，约为 G1 腿长 **114%**，远高于传统跨步可触达 |
| 成功率 | 综合任务（含攀上 + 通过 + 下台）的成功率显著高于"跳跃式" baseline（公开报道引用为 ~80%） |
| 策略复用 | 同一策略对不同平台高度、不同起始姿态稳定泛化 |
| 安全性 | 关节力矩 / 冲击在限位内，不出现起跳时常见的大冲击事件 |

> ⚠️ 详细数字以论文最终版 v2 为准；本表为结构性提炼，便于二次定位。

---

## 🤖 工程价值

- **真机可部署**：把"跳跃"换成"攀爬"，对人形真机的执行器、关节寿命、跌落风险都是明显利好。
- **奖励范式可复用**：棘轮式奖励是一种**通用的稀疏 → 密集**信号设计，可移植到攀岩、攀梯、跨栏、过门等长程接触任务。
- **多技能单策略路线**：相比"小专家网络 + 状态机切换"，单策略蒸馏在接缝处更平滑，符合 HOVER / HugWBC 等同期工作的统一控制趋势。

---

## 🎤 面试参考

**Q：棘轮式进度奖励比"速度奖励 / 距离差分奖励"好在哪？**
A：速度奖励会鼓励"跳一下抢一大段进度"，距离差分奖励则容易陷入"上一秒前进 0.1 m、下一秒后退 0.1 m"的零和振荡。棘轮只记账**比之前更好**的进度，从结构上抑制了反复试探的伪进步，又保留了密集信号。

**Q：6 个子技能为什么不直接训成 6 个网络再拼？**
A：拼接式会在状态机切换处产生不连续接触和姿态突变，是人形最容易摔的地方。单策略蒸馏让"什么时候切"也成为可学习的内部决策，落地更平滑。

**Q：本文为什么不用纯视觉，要用 LiDAR 高程图？**
A：高平台攀爬需要**精确的边缘高度 / 距离**，纯单目深度在贴近边缘时误差大；LiDAR 高程图与本体动作耦合好，便于做密集脚步落点判断。代价是要处理建图伪影——所以才有"训练加噪 + 部署降噪"。

**Q：和「Real-World Humanoid Locomotion」、「Humanoid Parkour Learning」相比，APEX 的定位？**
A：前两者面向**平地 / 不平 / 跨越 / 跳跃**的运动控制；APEX 把任务上限往上推到"**高于腿长**的垂直平台"，靠的是**接触丰富的攀爬**而不是高动态跳跃，是一个新的能力边界。

---

## 🔗 相关阅读

- [Humanoid Parkour Learning (2406.10759)](https://arxiv.org/abs/2406.10759)：跑酷式高动态运动控制，与 APEX 形成"跳跃 vs 攀爬"的对照
- [Real-World Humanoid Locomotion with RL (2303.03381)](https://arxiv.org/abs/2303.03381)：经典 RL 真机行走基线
- [Extreme Parkour with Legged Robots](https://extreme-parkour.github.io/)：四足跑酷工作，灵感来源之一
- [Learning Getting-Up Policies for Real-World Humanoid Robots (2502.12152)](https://arxiv.org/abs/2502.12152)：stand-up / lie-down 子技能可借鉴
- [HOVER (2410.21229)](https://arxiv.org/abs/2410.21229) · [HugWBC (2502.03206)](https://arxiv.org/abs/2502.03206)：单策略多技能编排的同期范式

---

> 备注：本笔记基于 arXiv 摘要、项目页与公开二次报道整理；具体数值（成功率、平台高度区间、消融实验）以 arXiv [2602.11143v2](https://arxiv.org/abs/2602.11143) 论文正文为准，后续若官方释出训练代码或数据集会在此节追加更新。
