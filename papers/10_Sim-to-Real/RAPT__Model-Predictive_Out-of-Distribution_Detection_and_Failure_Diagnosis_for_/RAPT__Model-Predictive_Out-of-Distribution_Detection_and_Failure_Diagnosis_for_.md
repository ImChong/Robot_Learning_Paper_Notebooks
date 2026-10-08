---
layout: paper
paper_order: 2
title: "RAPT: Model-Predictive Out-of-Distribution Detection and Failure Diagnosis for Sim-to-Real Humanoid Robots"
zhname: "RAPT：给人形 sim-to-real 部署装一个 50 Hz 的「异常监控 + 自动归因」"
category: "Sim-to-Real"
---

# RAPT: Model-Predictive Out-of-Distribution Detection and Failure Diagnosis for Sim-to-Real Humanoid Robots
**RAPT：人形部署的模型预测分布外检测与故障诊断**

> 📅 阅读日期: 2026-05-16
>
> 🏷️ 板块: Sim-to-Real · OOD 检测 · 失败诊断 · 人形部署监控
>
> 🔁 推进轨: 模块轮转（09_State_Estimation → **10_Sim-to-Real**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.01515](https://arxiv.org/abs/2602.01515) |
| HTML | [在线阅读](https://arxiv.org/html/2602.01515v1) |
| PDF | [下载](https://arxiv.org/pdf/2602.01515) |
| **发布时间** | 2026-02-02 (arXiv) |
| 源码 / 权重 | 截至当前未见公开发布（作者主页 [humphreymunn](https://github.com/humphreymunn) 暂未上线 RAPT 代码） |
| 提交日期 | 2026-02 |

**作者**：Humphrey Munn, Brendan Tidd, Peter Böhm, Marcus Gallagher, David Howard

**机构**：The University of Queensland · CSIRO Robotics, Data61（澳大利亚）

**机器人**：**Unitree G1** 人形机器人（仿真 NVIDIA Isaac Lab + 实机部署）

---

## 🎯 一句话总结

RAPT（**R**ecurrent **A**nomaly **P**robabilistic **T**rajectory Model）不去碰策略本身，而是给已经 sim-to-real 上线的人形策略**额外挂一只「监控器」**：仿真期间用自监督学一个 50 Hz 的概率时空流形模型，部署时算每一维状态的预测偏差作为 **per-dim 校准异常分数**；一旦超阈值就触发报警，并通过「梯度时空显著性 + LLM 推理」自动给出**语义级别的失败归因**——在 Isaac Lab 上 TPR 比最强基线高 37%（FPR=0.5%），实机部署 TPR 再 +12.5% 且根因分类准确率 75%。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| OOD | Out-Of-Distribution | 分布外，与训练分布偏离的状态 |
| TPR / FPR | True / False Positive Rate | 真阳率 / 假阳率，OOD 检测核心指标 |
| RAPT | Recurrent Anomaly Probabilistic Trajectory | 本文方法名 |
| Saliency | - | 显著性，指梯度对输入的敏感度图 |
| LLM | Large Language Model | 大语言模型 |
| Sim-to-Real | - | 仿真到真实的迁移 |
| Proprioception | - | 本体感知（IMU + 关节传感器） |
| Calibration | - | 概率校准（让阈值在不同维度上"可比"） |

---

## ❓ 论文要解决什么问题？

人形机器人的 sim-to-real 部署有一个**最危险的失败模式**：**策略在 OOD 状态下仍然"自信地"执行**——动作输出看起来正常，但实际上已经进入了训练时从未见过的状态，下一秒可能就摔倒、撞坏自己或损坏硬件。

现有路线有三类痛点：

1. **Domain Randomization / 系统辨识**：努力让仿真分布**覆盖**真实分布，但永远存在没覆盖到的角落，且代价巨大；
2. **集成不确定性 (Ensemble / Dropout)**：估的是策略本身的不确定性，但**最危险的 OOD 恰恰是策略最自信的时候**；
3. **重建式异常检测**（AutoEncoder / VAE）：常用，但很难给出**逐维、可校准、还能解释**的 per-step 信号，更别说告诉你"为什么挂了"。

RAPT 的回答是：**别去消除 sim-to-real gap，而是把它作为一个可观测信号**——专门建一个概率轨迹模型，把每一步的预测偏差当作 OOD 度量，再叠加一层 LLM 归因，让人类**能看、能解释、能修**。

---

## 🔧 方法拆解

### 1. 整体哲学：监控器 ≠ 策略

RAPT **不修改也不重训练策略**。它作为一个并行的**自监督预测网络**与策略同步运行：

- **训练阶段（仿真内）**：在仿真里采集大量「proprioceptive + 动作」轨迹，让 RAPT 用循环架构学**下一步状态的概率分布** \(p(s_{t+1} \mid s_{\le t}, a_{\le t})\)；
- **部署阶段（实机）**：每一步把真实观测 \(s_{t+1}\) 喂进来，算它在预测分布下的**负对数似然**——这就是 per-dim 的 OOD 分数。

> 💡 关键直觉：**OOD ≠ 不确定**。OOD 是"模型没见过这种轨迹"，与策略的内在不确定性是两件事。RAPT 把这件事做成一个**外挂模块**，避免改动策略本身。

### 2. 概率时空流形（Probabilistic Spatio-Temporal Manifold）

- **时间维度**：循环网络捕捉「状态-动作-下一步状态」的序列模式；
- **空间维度**：每一维状态（如某个关节角、IMU 通道）单独建模其条件概率分布；
- **校准（Calibration）**：在仿真内留一份验证集，把每一维分数映射到统一尺度（例如 z-score 或分位数），这样**不同维度的报警阈值变得可比**。

最终给出的不是一个"标量异常分"，而是**逐维度、可校准、可累积**的信号——同一阈值在所有维度上都对应同样的统计意义。

### 3. 训练目标：自监督预测

| 项 | 说明 |
|---|---|
| 输入 | 本体感知历史窗口 \(s_{t-H:t}\) + 动作历史 \(a_{t-H:t}\) |
| 输出 | 下一步状态的概率分布 \(p(s_{t+1})\)（每一维独立高斯 / 多模态） |
| 损失 | 负对数似然 NLL（per-dim 求和） |
| 数据 | **仅仿真**，无需任何"失败示例" |

> ✨ 自监督是关键：**不需要采集"坏数据"**，所以可以用任意规模的 nominal 仿真轨迹去拟合"正常长什么样"。

### 4. 部署期 OOD 检测（50 Hz）

- 部署时每 20 ms 算一次：将真实 \(s_{t+1}\) 代入 RAPT 的预测分布，得到每一维的 NLL；
- 用仿真期间标定好的阈值判定哪些维度异常；
- 多维同时报警 = **几乎肯定**进入 OOD（FPR 极低）。

### 5. 失败归因（Post-hoc Root-Cause Analysis）

报警之后，RAPT 还要**告诉你为什么**——这是它最有工程价值的部分。

**Step A：梯度时空显著性**
- 对 RAPT 的重建/预测目标计算梯度，回传到输入；
- 得到每一维度、每一时间步对当前异常的**贡献值**；
- 自动定位「**哪个关节 / 哪个时间窗最先出问题**」。

**Step B：LLM 语义归因**
- 把显著性图 + 该时间窗的关节运动学（角度、速度、力矩）一起喂给 LLM；
- 让 LLM **zero-shot**（无需 fine-tune）给出**语义化的失败描述**：例如"右髋俯仰角在地面接触瞬间出现异常加速度，疑似踝部接触模型与实机不一致"；
- 这相当于把"一个看起来很专业的工程师"接到诊断流程里，**让数字信号变成可读语言**。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph TRAIN["🟦 仿真期：自监督训练 RAPT"]
        SIM["🕹️ Isaac Lab<br/>(Unitree G1 仿真轨迹)"]
        BUF["📦 Nominal 轨迹缓冲<br/>(状态 / 动作 / 下一步状态)"]
        RAPT_NET["🧠 RAPT 循环网络<br/>(逐维条件分布建模)"]
        NLL["🎯 NLL 损失<br/>(自监督, 无需失败标签)"]
        CALIB["🎚️ 验证集校准<br/>(per-dim 阈值)"]
        SIM --> BUF --> RAPT_NET --> NLL
        RAPT_NET --> CALIB
    end

    subgraph POLICY["🤖 上线策略 (任意训练好的人形 RL 策略)"]
        OBS["🦿 实时本体感知<br/>(IMU / 关节)"]
        ACT["🎮 策略动作输出"]
        OBS --> ACT
    end

    subgraph DEPLOY["🟧 部署期：50 Hz OOD 监控"]
        PRED["🔮 RAPT 预测 p(s_{t+1})"]
        SCORE["📊 per-dim NLL 异常分"]
        ALARM{"🚨 报警?<br/>(对照校准阈值)"}
        OBS -.同样输入.-> PRED
        ACT -.同样输入.-> PRED
        PRED --> SCORE --> ALARM
    end

    subgraph DIAG["🟨 失败归因（Post-hoc）"]
        SAL["📍 梯度时空显著性<br/>(定位异常关节 / 时段)"]
        LLM["🗣️ LLM Zero-shot 推理<br/>(语义化失败诊断)"]
        REPORT["📝 根因报告<br/>(可读 / 可修)"]
        ALARM -- 异常 --> SAL --> LLM --> REPORT
        ACT -.关节运动学.-> LLM
    end

    CALIB -.阈值.-> ALARM
    RAPT_NET -.权重冻结.-> PRED

    style TRAIN fill:#e8f4fd,stroke:#1f78b4
    style POLICY fill:#f3e8ff,stroke:#8e44ad
    style DEPLOY fill:#fde8e8,stroke:#c0392b
    style DIAG fill:#fff7e0,stroke:#d4a017
</div>

---

## 💡 核心贡献

1. **把 sim-to-real gap 从"要消除的对象"变成"要监控的信号"**：思路上的转变——不强求覆盖所有真实场景，而是承认 gap 存在并在线检测。
2. **per-dim 校准的 OOD 信号**：相比单一标量分数，逐维度信号更早、更解释性地暴露问题维度。
3. **完全自监督，无需失败示例**：训练只用 nominal 仿真轨迹，工程门槛极低；不像很多异常检测需要采集"挂掉的样本"。
4. **梯度显著性 + LLM 的零样本归因**：把"哪里挂"和"为什么挂"都自动化，可直接驱动后续修复（如改进 DR 范围、调整奖励、修硬件标定）。
5. **跨仿真 + 实机验证**：Isaac Lab 与 Unitree G1 实机都拿到了一致的提升，证明范式可落地。

---

## 📊 关键结果

| 评测场景 | 关键指标 | RAPT vs 最强基线 |
|---|---|---|
| Isaac Lab 大规模仿真（4 个复杂任务） | TPR @ FPR=0.5% | **+37%** |
| Unitree G1 真机部署 | TPR | **+12.5%** |
| 真机 16 次失败 | LLM 根因分类准确率 | **75%** |

> 📌 仅使用**本体感知信号**（IMU + 关节），不依赖任何视觉 / 外部 mocap。
>
> 📌 FPR=0.5% 是非常严格的工程阈值（每 200 episode 至多一次误报），TPR +37% 意味着相同误报率下能多抓三成的真异常。

---

## 🤖 对人形 / Sim-to-Real 领域的意义

| 方向 | 含义 |
|---|---|
| **从"消 gap"转向"测 gap"** | Domain Randomization 与 RAPT 是互补关系：DR 努力压窄 gap，RAPT 实时监控并报告残余 gap |
| **策略无关的安全护栏** | 任何已部署的人形策略都可以并联接入 RAPT，是真正"事后补救"友好的方案 |
| **闭环修复链路** | 报警 → 显著性 → LLM 根因 → 工程师修策略 / 修仿真 / 修硬件，是面向工厂、远程部署、大规模车队的运维范式 |
| **数据飞轮** | 报警样本本身就是宝贵的"实机失败示例"，可反哺 DR 范围扩展 / 课程式微调 |

---

## 🎤 面试参考

**Q：RAPT 跟传统的「策略不确定性估计（Ensemble / Dropout）」有什么本质区别？**
A：策略不确定性问的是"**我的输出有多确定**"——但 sim-to-real 最危险的失败恰恰是策略**很自信地**走错了。RAPT 不看策略输出，而是建一个**外挂的概率轨迹模型**，关心"**当前状态是否在我见过的流形上**"。一句话：策略不确定性是"我会不会乱蹦"，OOD 是"这地方我有没有来过"。

**Q：为什么要做 per-dim 而不是一个全局标量异常分？**
A：全局标量会**淹没局部异常**——例如只是右脚踝有问题，但整体均值还正常。per-dim 校准让每个维度都按统一统计意义（如分位数）报警，**报警还自带定位信息**，下游 LLM 归因也能直接知道是哪个关节先出问题。

**Q：为什么不用 VAE / AutoEncoder 做重建式异常检测？**
A：VAE 是空间重建，对**时序模式**（接触切换、步态相位、力矩节奏）建模不强，且其重建误差不天然校准。RAPT 用循环结构显式建模 \(p(s_{t+1} \mid s_{\le t}, a_{\le t})\)，**时序 + 概率校准**两件事一并解决，更适合人形高频控制场景。

**Q：LLM 归因这一步看着像"花架子"，到底有什么工程价值？**
A：异常检测只告诉你"有问题"，工程师还得人工去翻日志找因——这是 sim-to-real 调试最贵的时间。LLM 把"梯度显著性 + 关节运动学"翻译成自然语言诊断，**直接缩短从报警到 fix 的回路**；论文中 75% 的根因分类准确率说明它已经能覆盖大多数场景，剩下 25% 也至少给出了起点。

**Q：RAPT 跟 Domain Randomization 是不是互斥？**
A：完全互补。DR 在仿真期**扩大覆盖**，RAPT 在部署期**监控残余 gap**。DR 永远会有边界，RAPT 把边界外的那部分变成可观测、可解释、可反哺。理想流水线就是 DR + RAPT + 实机数据回流。

---

## 🔗 相关阅读

- [MOSAIC: Bridging the Sim-to-Real Gap in Generalist Humanoid Motion Tracking (2602.08594)](https://arxiv.org/abs/2602.08594)：同期 sim-to-real 残差适配的并行思路，本仓库已有笔记
- [Domain Randomization for Transferring Deep Neural Networks (1703.06907)](https://arxiv.org/abs/1703.06907)：DR 奠基工作
- [RMA: Rapid Motor Adaptation for Legged Robots (2107.04034)](https://arxiv.org/abs/2107.04034)：在线适应残差的另一条路，本仓库已有笔记
- [Can We Detect Failures Without Failure Data? (2503.08558)](https://arxiv.org/abs/2503.08558)：模仿学习中的运行时失败检测，方法学相关
- [PolySim: Multi-Simulator Dynamics Randomization (2510.01708)](https://arxiv.org/abs/2510.01708)：仿真侧扩 DR 的并行工作

---

> 备注：本笔记基于 arXiv 摘要 + 公开搜索结果整理。网络具体架构（循环单元类型、隐藏维度、训练 batch 等）与 LLM 调用细节，待完整 PDF / 官方代码释出后补充。
