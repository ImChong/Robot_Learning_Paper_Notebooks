---
layout: paper
title: "Make Tracking Easy: Neural Motion Retargeting for Humanoid Whole-body Control"
zhname: "让跟踪变简单：面向人形全身控制的神经动作重定向（NMR）"
category: "Motion Retargeting"
paper_order: 2
---

# Make Tracking Easy: Neural Motion Retargeting for Humanoid Whole-body Control
**让跟踪变简单：面向人形全身控制的神经动作重定向**

> 📅 阅读日期: 2026-05-13
>
> 🏷️ 板块: Motion Retargeting
>
> ℹ️ 笔记已对照 [arXiv HTML 2603.22201v3](https://arxiv.org/html/2603.22201v3) 全文结构整理；定量表格与实现细节以论文原文为准。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2603.22201v3](https://arxiv.org/abs/2603.22201) |
| **HTML 全文** | [2603.22201v3 (HTML)](https://arxiv.org/html/2603.22201v3) |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2603.22201v3.pdf) |
| **发布时间** | 2026 年 3 月（arXiv） |
| **硬件平台** | Unitree G1（全身动态技能实验） |

**作者**: Qingrui Zhao, Kaiyue Yang, Xiyu Wang, Shiqi Zhao, Yi Lu, Xinfang Zhang, Qiu Shen, Xiao-Xiao Long*, Xun Cao*（南京大学等）

**一行定位**：在「人体 SMPL 序列 → 人形关节轨迹」这一环节，用 **NMR（Neural Motion Retargeting）** 直接学习时序映射；用 **CEPR（Clustered-Expert Physics Refinement）** 先批量生成「物理上站得住脚」的人机配对数据，解决监督信号里混着 IK 局部最优噪声的鸡生蛋问题。

---

## 🎯 一句话总结

论文先用 Hessian 论证传统几何 / 优化式重定向（含 GMR 这类强基线）在 **SE(3) 对数映射 + 前向运动学曲率** 下会出现 **负曲率方向**，因而对初始化敏感、易产生关节跳变与自穿；随后把重定向改写成 **从人体运动分布到机器人可行流形上的监督学习**，配合 **聚类 + 多专家 RL 物理精修** 得到约 **3 万条** 高质量配对序列，再训练 **CNN 编码 + 全连接自注意力 Transformer（非自回归）** 的网络，在 G1 上显著抑制关节不连续与自碰撞，并加速下游全身控制策略收敛。

---

## 📌 英文缩写速查

| 缩写 | 含义 | 一句话 |
|------|------|--------|
| **NMR** | Neural Motion Retargeting | 学习式、时序感知的 SMPL→机器人映射 |
| **CEPR** | Clustered-Expert Physics Refinement | 聚类后分簇训练 RL 专家，用仿真 rollout 生成物理一致监督 |
| **GMR** | General Motion Retargeting | 论文中作为运动学重定向与过滤的前级（Araujo et al., 2025） |
| **TMR** | Text–Motion Retrieval 类表征 | 用于把动作编码到可与文本对齐的潜空间再做 K-Means |
| **PPO** | Proximal Policy Optimization | 各簇专家跟踪策略的训练算法 |
| **6D rotation** | 连续旋转表示 | 网络里根姿态用 6D 表示以降低不连续 |

---

## ❓ 论文在回应哪两个「老问题」？

1. **优化式重定向的非凸与局部最优**：逐帧 IK / 微分优化在实践里会留下关节速度尖峰、自穿透、脚滑等瑕疵；这些瑕疵不会 magically 被下游 tracking 消化，反而逼迫策略学补偿动作。
2. **监督学习缺干净数据**：若直接用 GMR 输出当标签，会 **继承同样的失败模式**；作者因此把「好标签」定义成 **在物理仿真里能被 RL 专家稳定复现的轨迹**，而不是单次优化器的 argmin。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DATA["CEPR：从 SMPL 到物理一致配对"]
        S1["原始 SMPL 库"] --> S2["物理感知筛选<br/>（急动度 / CoM 支撑 / 脚接触）"]
        S2 --> S3["GMR 运动学重定向"]
        S3 --> S4{"硬阈值过滤<br/>关节速度 / 自碰比例 / 脚漂浮"}
        S4 --> S5["TMR 潜表征 + K-Means 聚类"]
        S5 --> S6["每簇并行训练 PPO 跟踪专家"]
        S6 --> S7["专家 rollout 记录机器人状态<br/>与 SMPL 对齐成对"]
    end

    subgraph NET["NMR 网络与两阶段训练"]
        K1["大规模运动学数据"] --> T1["阶段1：L1 预训练<br/>CNN + 全连接自注意力 Transformer"]
        S7 --> T2["约 3 万条物理配对"]
        T1 --> T3["阶段2：在 CEPR 数据上微调<br/>把输出拉向可行流形"]
        T2 --> T3
    end

    subgraph DOWN["下游"]
        T3 --> D1["参考轨迹质量提升"]
        D1 --> D2["全身控制 / tracking 策略更快收敛"]
    end

    style DATA fill:#e8f4fd,stroke:#1f78b4
    style NET fill:#fdebd0,stroke:#e67e22
    style DOWN fill:#e8f8e8,stroke:#27ae60
</div>

---

## 🔧 方法详解

### 1. 非凸性动机（III-A）

论文在简化 surrogate 代价上写出 Hessian 的 **Gauss–Newton 正定项 + 曲率修正项**；说明除雅可比项外，**对数映射与运动学递归组合** 可产生 **负方向曲率**，从而解释「为何几何重定向会卡局部最优」——这不是实现小毛病，而是结构问题。读者若做工程排障，可把这一段当成 **给 IK 调参失败找理论借口的说明书**。

### 2. CEPR 三阶段数据管线（III-B）

| 阶段 | 目的 | 要点 |
|------|------|------|
| **Step 1** | 语义与粗物理合理 | 过滤明显不适合机器人的片段（大 jerk、CoM 出支撑、脚接触不足） |
| **Step 2** | 运动学候选 + 质检 | GMR 出初值；再用关节速度尖峰、MuJoCo 自碰比例、脚平均离地高度等规则剔除坏段 |
| **Step 3** | 物理「精修」真标签 | 先聚类缓解「单策略拟合全库」的分布冲突；每簇训一个高维观测的 tracking expert；收敛后在参考上 rollout，得到 **(SMPL 序列, 仿真一致机器人轨迹)** |

**聚类动机**：全文强调「一条 PPO 吃尽所有动作」会遇到 **distributional conflict**；折中方案是按 **语义相近** 的动作簇分别训专家，算力上比「每条序列一个策略」可行。

### 3. 运动表示与网络（III-C）

- 人体侧采用接近 MotionMillion 的字段：**根平面速度、根 6D 朝向、局部关节位置与速度**。
- 机器人侧在同样信息上 **追加关节 DoF** \(q\)。
- 网络：**1D ResNet 编码 → LLaMA 风格的 Transformer 块（此处用双向自注意力，利用全序列上下文）→ 上采样 + 1D 卷积解码**，整体 **非自回归**，一次前向预测整段对齐序列。
- 损失：对预测机器人表示 \(\hat{m}_{\text{bot}}\) 与目标做 **L1**。

### 4. 「先大后小」两阶段训练（III-D）

- **阶段 1（运动学预训练）**：数据量大、覆盖面广，学会 **embodiment 映射的主干**。
- **阶段 2（CEPR 微调）**：数据量小一个量级左右，但每条都经过 **RL+物理引擎** 筛选，负责把分布 **拉向动态可行集**。
- 消融逻辑：只做其一会出现 **缺物理** 或 **缺泛化** 的经典 trade-off，论文用「NMR w/o RL 微调」等实验支撑这一点。

---

## 📊 实验侧读者该抓什么？

- **artifact 指标**：关节跳变、自碰撞、关节限位违反相对强基线（含 GMR）是否系统下降。
- **下游效率**：用 NMR 轨迹作为参考时，全身控制 / tracking 训练是否 **更快收敛、终端误差更低**。
- **任务多样性**：武术、舞蹈等高动态片段上的定性视频对比，对应论文强调的「绕开几何陷阱」。

---

## 🤔 自测问答

**Q1：NMR 还需要在线跑 GMR 吗？**  
A：训练管线里 GMR 主要承担 **廉价大规模初值**；推理时网络一旦部署，理想情况是 **端到端从 SMPL 特征直出机器人轨迹**，具体工程是否保留 GMR 作 warm-start 属于系统实现选择，论文重心在 **学习式替代逐帧优化**。

**Q2：CEPR 和 PHC / 大规模 tracking 数据建设有何异同？**  
A：精神相近：都用 **物理仿真 + RL** 把「看起来对」变成「能站得住」。差异在于本文把这条管线 **明确服务神经重定向的监督构造**，并引入 **聚类专家** 降低单策略多模态冲突。

**Q3：最该小心的工程假设是什么？**  
A：**仿真域 gap**：专家标签再干净也仍是 MuJoCo（或同类）动力学下的真理；上真机仍需结合硬件限幅、延迟与接触模型差异做验证。

---

## 🔗 相关笔记与外链

- 同板块几何强基线：[Retargeting Matters (GMR)](https://arxiv.org/abs/2510.02252) — 仓库笔记路径 `papers/02_Motion_Retargeting/Retargeting_Matters__...`
- 本文 arXiv HTML：[2603.22201v3](https://arxiv.org/html/2603.22201v3)

---

## 📚 引用（BibTeX 备忘）

```bibtex
@article{zhao2026make,
  title={Make Tracking Easy: Neural Motion Retargeting for Humanoid Whole-body Control},
  author={Zhao, Qingrui and Yang, Kaiyue and Wang, Xiyu and others},
  journal={arXiv preprint arXiv:2603.22201},
  year={2026}
}
```
