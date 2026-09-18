---
layout: paper
paper_order: 46
title: "HUSKY: Humanoid Skateboarding System via Physics-Aware Whole-Body Control"
zhname: "HUSKY：基于物理感知全身控制的人形滑板系统"
category: "Loco-Manipulation and WBC"
---

# HUSKY: Humanoid Skateboarding System via Physics-Aware Whole-Body Control
**把"人形 + 滑板"显式建模成一个耦合的混合动力学系统，再用物理感知 RL + AMP 把人形 G1 真的教会了上街滑板**

> 📅 阅读日期: 2026-05-07
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 滑板 · 人物-物体耦合 · 混合动力学

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.03205](https://arxiv.org/abs/2602.03205) |
| HTML | [在线阅读](https://arxiv.org/html/2602.03205v1) |
| PDF | [下载](https://arxiv.org/pdf/2602.03205) |
| 项目主页 | [husky-humanoid.github.io](https://husky-humanoid.github.io/) |
| **发布时间** | 2026-02-03 (arXiv) |
| 源码 | [TeleHuman/humanoid_skateboarding](https://github.com/TeleHuman/humanoid_skateboarding) |
| 收录 | RSS 2026 |
| 提交日期 | 2026-02 |

**作者**：Jinrui Han, Dewei Wang, Chenyun Zhang, Xinzhe Liu, Ping Luo, Chenjia Bai, Xuelong Li

**机器人**：Unitree G1（仿真 + 实机均验证）

---

## 🎯 一句话总结

HUSKY 把"人形机器人滑板"任务**显式拆成一个人形-滑板耦合的混合动力学系统**：先在物理上推出板倾角与桥转向角之间的等式约束，再把推板/转向/滑行划分成不同接触相位，最后用 DRL + AMP 训练一个**物理感知**的 WBC 策略，让 Unitree G1 在仿真和真实街道上都能稳定、敏捷、像人一样地滑板。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| WBC | Whole-Body Control | 全身控制 |
| DRL | Deep Reinforcement Learning | 深度强化学习 |
| AMP | Adversarial Motion Priors | 对抗式风格先验，用判别器学"像人" |
| Truck | 滑板桥（连接板与轮的转向机构） | 转向角与板倾角通过桥几何耦合 |
| Hybrid System | 混合动力学系统 | 含离散接触相位的连续动力学 |
| mjlab | MuJoCo + Isaac Lab 风格的训练栈 | MuJoCo 物理 + Lab 类 RL API |

---

## ❓ 论文要解决什么问题？

人形机器人滑板比"走路 / 跑跳"难得多，难点几乎全压在**人物-物体耦合**这一侧：

1. **欠驱动 + 非完整约束**：滑板有 4 个被动轮 + 2 个被动桥，机器人不能直接"命令"它向前。
2. **混合接触相位**：单脚踩板滑行 / 双脚踩板滑行 / 后脚蹬地推进 / 起步与停止 —— 每一相位的接触集合不同，动力学切换。
3. **机械耦合**：板的左右倾角 (tilt) 通过桥的几何，会**强制**等价于一个转向角 (steer)，机器人重心一偏，板就转。
4. **平衡极不稳定**：板下面是滚动接触，机器人质心稍偏即倒。

之前的人形 + 物体工作（HAIC、Tray 等）大都把物体当"被动负载"或"轻交互"，HUSKY 想把这套**显式物理建模 + 物理感知奖励**直接做进 DRL 框架里，把滑板当"系统的一部分"一起优化。

---

## 🔧 方法拆解：HUSKY 怎么工作

### 1. 系统建模：板倾 ↔ 桥转向耦合

- 把滑板桥看成一个倾斜轴的转动副，**推导板倾角 $\phi$ 与桥转向角 $\delta$ 的等式约束** $\delta = f(\phi, \alpha _ {\text{truck}})$。
- 这个解析关系直接**进入观测/奖励/课程**，让策略不必从零摸索"为什么我侧倾就转弯"。

### 2. 把任务建成混合动力学系统

- 用一组**离散相位**描述滑板生命周期：
  - $\mathcal{M}_1$：双脚踩板滑行（balance）
  - $\mathcal{M}_2$：后脚蹬地（push）
  - $\mathcal{M}_3$：转向（steer，重心倾斜驱动桥转）
- 每个相位定义了不同的接触集合与受力模型，奖励/终止条件按相位切换。

### 3. 训练框架：DRL + AMP

- **观测**：本体感知 + 板的位姿 / 倾角 / 速度 + 指令（速度、转向）
- **动作**：人形 29-DoF 关节目标
- **奖励**：跟踪指令速度/方向 + 维持板上接触 + 物理一致性正则（板倾 ↔ 转向）+ 安全（避免摔板）
- **AMP 风格先验**：用真实人类滑板动作做参考分布，**专门用来塑形 push 这一段**的姿态自然度，避免 RL 学出怪异的"机械式蹬地"。

### 4. 实现栈

- 训练栈：**mjlab** = MuJoCo 高保真物理 + Isaac Lab 风格可扩展 RL API
- 算法：基于 **rsl_rl** 的 PPO 类策略
- 部署：导出 **ONNX** + MuJoCo 验证 + 实机 G1

### 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph SYS["系统建模 (Physics-Aware)"]
        S1["人形 G1 + 滑板 (4 轮 + 2 桥)"]
        S2["推导板倾 φ ↔ 桥转向 δ 等式约束"]
        S3["划分混合相位:<br/>balance / push / steer"]
        S1 --> S2 --> S3
    end

    subgraph POL["WBC 策略"]
        P1["观测: 本体感知 + 板位姿 + 指令"]
        P2["策略 πθ (PPO + AMP)"]
        P3["动作: 29-DoF 关节目标"]
        P1 --> P2 --> P3
    end

    subgraph REW["物理感知奖励"]
        R1["速度/方向跟踪"]
        R2["板倾 ↔ 转向一致性正则"]
        R3["接触相位特定奖励"]
        R4["AMP 判别器 (人类 push 风格)"]
    end

    subgraph TRAIN["训练栈"]
        T1["mjlab = MuJoCo + Isaac Lab API"]
        T2["rsl_rl PPO"]
        T3["大规模并行仿真"]
    end

    subgraph DEPLOY["部署"]
        D1["ONNX 导出"]
        D2["MuJoCo 验证"]
        D3["Unitree G1 实机滑板"]
    end

    SYS --> POL
    POL <--> REW
    POL --> TRAIN
    TRAIN --> DEPLOY

    style SYS fill:#e8f4fd,stroke:#1f78b4
    style POL fill:#fdebd0,stroke:#e67e22
    style REW fill:#fceae8,stroke:#c0392b
    style TRAIN fill:#e8f8e8,stroke:#27ae60
    style DEPLOY fill:#f4ecf7,stroke:#8e44ad
</div>

---

## 💡 核心贡献

1. **首个开源的端到端人形滑板系统**，并通过 RSS 2026 收录 + 真机部署到 Unitree G1。
2. **显式人形-滑板系统建模**：推导板倾 ↔ 桥转向的等式耦合约束，把欠驱动滑板的"为什么侧倾就转弯"变成策略可直接利用的物理先验。
3. **混合动力学相位化**：把滑板任务切成 balance / push / steer 等接触相位，相位特定奖励避免单一奖励难以同时教会"蹬地"和"滑行"。
4. **AMP 用在 push 段**：只在需要"像人"的蹬地动作上加风格先验，既保留 RL 的物理求解能力，又避免出现机械式动作。
5. **工程开源**：基于 mjlab + rsl_rl 训练，支持 ONNX 推理与 MuJoCo 键控演示，复现门槛低。

---

## 📊 实验亮点

- **任务**：直线滑行、加速、变向、停下；从平地到轻微坡度。
- **平台**：仿真 (mjlab/MuJoCo) → MuJoCo 验证 → Unitree G1 真机。
- **对比**：
  - 去掉物理感知奖励 / 板倾-转向约束 → 策略难以学会稳定转向；
  - 去掉 AMP → 蹬地动作机械、效率低；
  - 不分相位 → 训练后期奖励冲突，难以同时学好 push 与 balance。
- **真机表现**：G1 能在真实街道完成 **稳定滑行 + 主动蹬地推进 + 通过侧倾转向** 的连贯动作，是公开演示中第一个"不作弊"（不靠外力推或外部控制板）地完成滑板的人形机器人。

---

## 🤖 对人形机器人领域的意义

| 影响方向 | 说明 |
|---------|------|
| **人物-物体耦合范式** | 把"机器人 + 物体"作为联合系统建模并把约束塞进 RL，是 loco-manipulation 的一种标准做法 |
| **混合动力学的 RL 接入** | 用相位划分 + 相位奖励处理离散接触切换，对滑板/楼梯/跨越等任务有迁移价值 |
| **AMP 的精细使用** | 只在需要"像人"的子动作上挂判别器，比全程 AMP 更稳更省 |
| **开源工程参考** | mjlab + rsl_rl + ONNX + 真机一条龙，是当前 G1 周边一个值得参考的训练-部署模板 |

---

## 🎤 面试参考

**Q：人形滑板和走/跑/跳的核心区别是什么？**
A：滑板下面是被动滚动的欠驱动机构，**机器人无法直接控制板的运动**，只能通过自身重心 + 蹬地间接驱动；同时板倾与桥转向通过桥几何强制耦合，所以"想转弯就要侧倾"。这导致策略必须显式理解物体动力学，单纯把板当负载会失败。

**Q：HUSKY 为什么把任务切成多个相位？**
A：滑板的 push（蹬地）和 balance（双脚踩板）需要的接触集合、奖励函数完全不同——push 需要"放掉一只脚"，balance 需要"两脚都踩稳"。一份大锅奖励同时鼓励两者会冲突，相位化后每段奖励干净，且策略能学到"什么时候该 push、什么时候该 balance"。

**Q：为什么只在 push 段用 AMP，而不是全程？**
A：转向和保持平衡更多是物理求解问题（侧倾、力矩平衡），RL 自己能学到正确解；蹬地姿态则更偏"风格化"，没有 AMP 约束容易出现非人化的机械蹬地。把 AMP 限定到 push 阶段，可以避免判别器对其他相位的姿态做不必要的约束。

---

## 🔗 相关阅读

- [AMP (2104.02180)](https://arxiv.org/abs/2104.02180)：本工作 push 段所用风格先验
- [HAIC (2602.11758)](https://arxiv.org/abs/2602.11758)：另一类人形 + 物体的"动力学感知世界模型"思路，可对照
- [HOMIE (2502.13013)](https://arxiv.org/abs/2502.13013)：人形 G1 上常见的工程模板
- [mjlab (MuJoCo + Isaac Lab API)](https://github.com/TeleHuman/humanoid_skateboarding)：本论文训练栈，repo 内包含一键复现入口
