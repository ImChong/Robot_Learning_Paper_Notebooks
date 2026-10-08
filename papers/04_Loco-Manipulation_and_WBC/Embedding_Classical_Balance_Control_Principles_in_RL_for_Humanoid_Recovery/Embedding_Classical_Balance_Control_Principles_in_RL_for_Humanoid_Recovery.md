---
layout: paper
paper_order: 28
title: "Embedding Classical Balance Control Principles in Reinforcement Learning for Humanoid Recovery"
zhname: "将经典平衡控制原理嵌入强化学习：用于人形机器人跌倒恢复"
category: "Loco-Manipulation and WBC"
---

# Embedding Classical Balance Control Principles in Reinforcement Learning for Humanoid Recovery
**将经典平衡控制原理嵌入强化学习：用于人形机器人跌倒恢复**

> 📅 阅读日期: 2026-04-28
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 跌倒恢复

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2603.08619](https://arxiv.org/abs/2603.08619) |
| HTML | [在线阅读](https://arxiv.org/html/2603.08619) |
| PDF | [下载](https://arxiv.org/pdf/2603.08619) |
| 代码 | 暂未公开（截至 2026-04-28） |
| 平台 | Unitree H1-2 |
| 仿真器 | Isaac Lab（训练）+ MuJoCo（Sim2Sim） |
| 发布时间 | 2026-03-09 (arXiv) |

**作者**：Nehar Poddar, Stephen McCrory, Luigi Penco, Geoffrey Clark, Hakki Erhan Svil, Robert Griffin

---

## 🎯 一句话总结

这篇论文的核心不是“再堆一个更大的网络”，而是把**经典平衡控制里可解释的物理量**（Capture Point、CoM 状态、质心动量）嵌入到 RL 训练中：
- 在训练时作为**特权 critic 输入**和**奖励塑形信号**；
- 在部署时 actor 仍然只依赖本体感觉，保证可落地。  

结果是在一个统一策略中实现了从小扰动到大跌倒后的恢复行为链，并报告 **93.4%** 的恢复成功率。

---

## ❓要解决什么问题

现有人形“起身/恢复”RL 往往把任务当成黑盒奖励优化：
- 奖励写得不够好时，策略容易学到局部最优；
- 学习信号对“是否真正接近平衡”不敏感；
- 训练成本高且稳定性弱。  

论文给出的方向是：
> 不改变 RL 主干范式，而是把控制理论中长期有效的平衡指标，变成可学习结构的一部分。

---

## 🔧 方法要点（结构化理解）

### 1) Balance-informed critic（训练期特权）
critic 除常规状态外，还使用平衡相关特征（如捕获点、CoM、动量）来评估价值，
让价值函数更早区分“看似站住”与“真正可恢复”的状态。

### 2) Balance-shaped reward（奖励塑形）
奖励项不只看“有没有站起来”，还看：
- 质心状态是否回到稳定域；
- 动量是否被合理耗散；
- 是否形成正确的恢复动作序列（踝策略/髋策略/补步/多接触起身）。

### 3) Actor deployment constraint（部署约束）
部署策略仍保持纯本体感觉输入，不依赖难以实时感知的特权量，
从而维持零样本上机的现实可行性。

---

## 🧪 论文报告结果（按原文主张）

- 统一策略覆盖：
  - 小扰动：踝/髋恢复；
  - 大扰动：补步恢复；
  - 已跌倒：多接触（手/肘/膝）辅助起身。
- 在随机初始姿态与非脚本化跌倒配置上，恢复成功率 **93.4%**。
- 去掉“平衡结构嵌入”后，作者报告站起学习会显著失败，说明该结构并非可有可无。
- 另外给出 Sim2Sim（Isaac Lab→MuJoCo）与初步硬件实验结果，支持一定跨环境泛化。

---

## 💡 我的阅读备注（面向后续复现）

1. 这类“控制先验 + RL”路线的价值在于：
   - 比纯黑盒 RL 更稳；
   - 比纯模型法更灵活，能覆盖非结构化恢复动作。

2. 真正决定复现质量的点通常不在“模型层”，而在：
   - 恢复场景随机化是否充分；
   - 失败状态分布是否覆盖“坏姿态”；
   - 奖励项权重是否与机器人尺度一致。

3. 若后续代码公开，优先检查：
   - 特权 critic 特征具体定义；
   - 各平衡奖励项数学形式与权重；
   - 训练课程和扰动采样策略。

---

## 🔗 参考

```bibtex
@article{poddar2026embedding,
  title={Embedding Classical Balance Control Principles in Reinforcement Learning for Humanoid Recovery},
  author={Poddar, Nehar and McCrory, Stephen and Penco, Luigi and Clark, Geoffrey and Svil, Hakki Erhan and Griffin, Robert},
  journal={arXiv preprint arXiv:2603.08619},
  year={2026}
}
```
