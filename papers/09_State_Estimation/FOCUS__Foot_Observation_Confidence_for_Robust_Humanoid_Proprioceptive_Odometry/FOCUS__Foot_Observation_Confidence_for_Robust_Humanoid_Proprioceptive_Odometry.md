---
layout: paper
title: "FOCUS: Foot Observation Confidence for Robust Humanoid Proprioceptive Odometry"
zhname: "FOCUS：面向鲁棒人形本体里程计的足部观测置信度"
category: "State Estimation"
arxiv: "2609.02222"
original_check: partial
original_check_date: 2026-11-13
original_check_scope: "已核对 arXiv 元数据、摘要及公开方法解读；原始 PDF/HTML 全文未能直接读取，尚未完成全文核验"
---

# FOCUS: Foot Observation Confidence for Robust Humanoid Proprioceptive Odometry
**用连续的足部正运动学（FK）观测可信度取代二值触地门控，在保留经典 EKF 的同时减轻滑脚、拖脚和部分支撑引起的里程计漂移。**

> 📅 总结日期: 2026-11-13
>
> 🏷️ 板块: 09 State Estimation · 本体里程计 · FK 可信度 · EKF
>
> 🔁 推进轨: 模块轮转（08_Navigation → **09_State_Estimation** → 10_Sim-to-Real）
>
> ⚠️ **核验范围**：已核对 arXiv 论文元数据与摘要，方法细节参照公开论文解读交叉整理；本次工具无法直接读取原始 PDF / HTML 正文，故标记 `original_check: partial`，**不声称通读原文**。数值、公式与架构细节在取得原文后仍需复核。

---

## 📋 基本信息

| 项目 | 内容 |
|---|---|
| 英文题目 | FOCUS: Foot Observation Confidence for Robust Humanoid Proprioceptive Odometry |
| 中文题目 | FOCUS：面向鲁棒人形本体里程计的足部观测置信度 |
| 作者 | Kaixin Feng、Angsong Li、Shaopeng Zhang、Enyu Li、Peiwen Lin、Chuang Wang、You Li、Haiyu Lan |
| 单位 | 武汉大学、智元机器人（AgiBot） |
| 发表时间 | 2026-09-02，arXiv v1 预印本（未核实正式会议发表） |
| arXiv | [2609.02222](https://arxiv.org/abs/2609.02222) |
| PDF | [arxiv.org/pdf/2609.02222](https://arxiv.org/pdf/2609.02222)（官方链接已定位，**正文未成功读取**） |
| HTML | [arxiv.org/html/2609.02222](https://arxiv.org/html/2609.02222)（官方链接已定位，**页面未成功读取**） |
| 源码 | 截至 2026-11-13 未核实到与此论文对应的**官方公开源码**，不附不相关的同名 FOCUS 项目 |
| 辅助解读（非原文） | [alphaXiv](https://www.alphaxiv.org/gu/abs/2609.02222)（仅供交叉核验，不能代替全文） |

## 🎯 一句话总结

FOCUS 不直接用网络预测机器人位姿，而是学习每只脚的 FK 速度约束在当前运动状态下有多可信，再以连续权重调整 EKF 的速度观测和不确定性。

## ❓ 研究问题

传统接触辅助里程计把足部视为「接触/不接触」两个状态。实际行走中，即便触地，脚也可能发生滑移、拖曳或只有脚尖着地；若仍将 FK 速度当成稳定锚点，估计器会累积位移漂移。论文研究如何在**仅使用 IMU 和关节编码器**的部署约束下，区分接触状态与观测可信度。

## 🔧 核心方法

1. **仿真生成训练信号**：在仿真中获得运动真值、IMU、关节状态与接触信息，不需要人工标注连续 FK 可信度；通过 FK 速度一致性损失和较轻的接触正则训练网络。
2. **预测连续足部权重**：因果时序网络读取 IMU、下肢关节位置与速度历史，分别输出左脚、右脚的可信度 `w_L, w_R ∈ [0,1]`，不是二值接触概率的硬切换。
3. **速度观测融合**：根据足部可信度，在「IMU 传播的机体速度」和「假定足部固定时 FK 推得的机体速度」之间平滑插值；脚越不可信，越少依赖该脚的 FK。
4. **自适应 EKF 不确定性**：对低可信度足部提高速度/足位置等观测噪声，使滤波器自然降低该足部约束的影响，而非直接丢弃整只脚的观测。

### 方法流程（依据公开摘要与方法解读整理）

<div class="mermaid">
flowchart TD
    subgraph TRAIN["离线训练"]
        SIM["仿真动作与域随机化"] --> SIGNAL["IMU / 关节 / 真值速度 / 接触"]
        SIGNAL --> NET["因果时序网络"]
        SIGNAL --> LOSS["FK 速度一致性损失 + 接触正则"]
        NET --> LOSS
    end
    subgraph DEPLOY["在线本体里程计"]
        SENSOR["IMU + 下肢关节编码器"] --> MODEL["训练后的可信度网络"]
        SENSOR --> FK["双足 FK 速度观测"]
        SENSOR --> IMU["IMU 状态传播"]
        MODEL --> WEIGHT["左右脚连续可信度"]
        FK --> BLEND["FK / 传播速度平滑融合"]
        IMU --> BLEND
        WEIGHT --> BLEND
        WEIGHT --> COV["自适应观测协方差"]
        BLEND --> EKF["EKF 状态更新"]
        COV --> EKF
        IMU --> EKF
        EKF --> ODOM["机体速度与里程计"]
    end
</div>

## 📊 实验与结果

arXiv 摘要报告：相对其对照方法，**仿真行走 ATE 下降 83.7%**；**19 段真实行走 ATE 下降 70.8%**；**4 套真实动态动作平均 ATE 下降 42.7%**。这些是作者报告的相对改善，不是本文复现实验；基线、统计口径、误差分布及动态频谱指标仍需以 PDF 原表为准。

## ⚠️ 局限与结论

- 依赖仿真训练得到的可信度对真实接触、摩擦和动作分布的泛化；极端未见运动的稳定性仍需验证。
- 本体里程计不等同于全局定位；仅靠 IMU 与关节读数，长时间漂移不可能完全消除。
- 论文尚无已核实的公开实现，因此**不绘制伪装成源码调用链的 sequenceDiagram**。
- 当前笔记属于**部分核验稿**：原始 PDF / HTML 未能直接读取，未满足「原文通读」；后续获得全文应复核方法公式、训练配置与实验表。

## 📚 阅读骨架与待核验事项

1. **问题**：二值触地为什么不等于 FK 观测可信？
2. **方法**：仿真监督如何避免连续可信度人工标签？如何融合 FK 与 IMU？
3. **实验**：分别检查仿真行走、真机行走和动态动作的 ATE、运动幅值与频谱。
4. **局限**：对滑移、部分接触、硬件差异的适用边界，以及与直接学习里程计的对比。

> 原始来源：[arXiv:2609.02222](https://arxiv.org/abs/2609.02222)；辅助公开方法说明：[alphaXiv](https://www.alphaxiv.org/gu/abs/2609.02222)。核验日期：2026-11-13。
