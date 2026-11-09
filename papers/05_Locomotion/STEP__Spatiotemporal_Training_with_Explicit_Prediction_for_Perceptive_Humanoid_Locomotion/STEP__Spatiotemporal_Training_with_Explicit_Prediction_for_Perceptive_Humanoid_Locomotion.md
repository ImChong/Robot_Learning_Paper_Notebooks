---
layout: paper
title: "STEP: Spatiotemporal Training with Explicit Prediction for Perceptive Humanoid Locomotion"
zhname: "STEP：显式时空预测训练的感知式人形行走"
category: "Locomotion"
arxiv: "2611.08097"
original_check: done
original_check_date: 2026-11-09
original_check_scope: arXiv v1 LaTeX 源码全文（引言、方法与实现细节、式 1–11、表 I–V、实验与结论）；图 2–4 按图注与正文核对；论文没有附录，也没有放出源码
---

# STEP: Spatiotemporal Training with Explicit Prediction for Perceptive Humanoid Locomotion
**4 个可学习查询把 5 帧本体感受和 96 个深度 token 读成一个 64 维的控制状态；训练时再加两种预测监督：遮掉一种模态、用另一种去预测它的潜特征（跨模态），以及用当前状态加动作预测下一步的融合状态（时间）。两者和 PPO 一阶段联合训练、部署时全部拿掉，Noetix E1 真机 100 次穿越成功 98 次**

> 📅 总结日期: 2026-11-09
>
> 🏷️ 板块: 05 Locomotion · 感知式行走 · 深度 + 本体融合 · 可学习查询注意力 · 自监督预测表示
>
> 🔁 推进轨: 模块轮转（04_Loco-Manipulation_and_WBC → **05_Locomotion**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2611.08097](https://arxiv.org/abs/2611.08097) |
| HTML | [在线阅读](https://arxiv.org/html/2611.08097v1) |
| PDF | [下载](https://arxiv.org/pdf/2611.08097) |
| 项目页 | 论文未给出项目页 |
| 源码 | ⏳ 未开源（论文正文与 arXiv 页面都没有代码链接） |
| **发布时间** | 2026-11-05（arXiv v1） |

**作者**：Youhao Lyu\*、Chenghao Sun\*、Zhenxuan Ding、Shuting Zhang、Ziyang Dong、Wenhao Cui†（中国科学技术大学、松延动力 Noetix Robotics、北京化工大学、国防科技大学；\* 共同一作，† 通讯作者）。

**定位**：属于「本体感受去查询深度地图」这条线（[AME-2](../AME-2__Agile_and_Generalized_Legged_Locomotion_via_Attention-Based_Neural_Map_Encoding/AME-2__Agile_and_Generalized_Legged_Locomotion_via_Attention-Based_Neural_Map_Encoding.html)、CReF），区别在于：①查询不来自本体，而是 4 个与输入无关的可学习查询，同时读本体和深度；②在策略表示上直接加跨模态、时间两种预测损失（借鉴 Kepler 的掩码跨模态预测、SPR 的 EMA 目标），和 PPO 一起训，不另做预训练。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| STEP | Spatiotemporal Training with Explicit Prediction | 本文框架 |
| CM | Cross-Modal prediction | 遮掉一种模态，用另一种预测它的潜特征 |
| Next | Action-conditioned next-state prediction | 用 $s_t$ 和动作 $a_t$ 预测下一步融合状态 |
| EMA | Exponential Moving Average | 慢更新的教师网络，提供预测目标 |
| SIGReg | Sketched Isotropic Gaussian Regularization | LeJEPA 的防坍缩正则 |
| Soft-MoE | Soft Mixture of Experts | 4 个专家按门控权重全部参与的稠密混合专家 actor |
| SR / TR | Success Rate / Traversal Rate | 到达目标的比例 / 走过距离占目标距离的比例 |

---

## 🎯 一句话总结

感知式行走里，台阶边、落脚面「有没有用」取决于机器人此刻的身体状态以及动作之后两者怎么变。光做特征融合不规定该学哪种跨模态关系，只在同一时刻做跨模态预测又不约束「随动作的演化」。STEP 用多查询注意力把深度和本体压成 64 维状态，并在这个状态上同时监督**跨模态关系**（CM）与**动作条件的下一步状态**（Next），这些预测头只在训练时存在。仿真 16 项 SR/TR 平均 **95.17%**（去掉预测 91.02%、单查询 69.98%、本体查询深度 86.17%）；Noetix E1 真机 **98/100** 成功，包括看不到后方地形的倒退上下楼梯。

---

## ❓ 要解决什么问题？

1. **融合方式只管「怎么读」，不管「学什么」**：本体去查询深度（AME-2、CReF）提高了信息获取，但没有任何信号告诉表示「身体和地形之间该有什么关系」；
2. **跨模态预测缺了时间**：CMS、RPT、Kepler 等的预测发生在同一时刻的观测之间，没约束动作之后状态怎么变；RPT 还要单独预训练，Kepler 只在单时间步上评测；
3. **控制状态要紧凑、推理要快**：每 20 ms 推理一次，表示不能太大。

---

## 🔧 方法

### 1. 策略接口
- 控制周期 $\Delta t = 0.02$ s；输入 5 帧本体历史 $H_t \in \mathbb R^{5\times77}$（命令 3、角速度 3、横滚俯仰 2、关节位置 23、关节速度 23、上一步动作 23）与 $16\times24$ 的深度图（0.3–2.0 m 之外置 0 再减 1，无效值 = −1；相机周期 0.015 s，不假设与控制同步）。
- actor 输入 $x_t = [o_t^p, \mathrm{sg}(\hat v_t), s_t] \in \mathbb R^{144}$：当前本体 77 + 单独训练的速度估计器给出的机体线速度 3（停梯度）+ 融合状态 64；4 专家的稠密 Soft-MoE 输出 23 维动作；critic 用特权信息；奖励 = 任务奖励（表 II 共 23 项）+ AMP 风格奖励。

### 2. 多查询融合（式 2）
5 个本体 token（加时间位置与模态嵌入）+ 深度 CNN 的 $8\times12=96$ 个 token 组成共享的 key–value；4 个与输入无关的可学习查询 $Q_0 \in \mathbb R^{4\times64}$ 经两层残差交叉注意力（各 4 头）读取，4 个输出取平均就是 $s_t \in \mathbb R^{64}$。

### 3. 跨模态预测 CM（式 3）
同一套融合权重跑两条掩码路径：只看 5 个本体 token 得 $s_t^{-d}$，只看 96 个深度 token 得 $s_t^{-p}$。EMA 教师用完整观测给目标：深度 token 池化到 $2\times2$ 投影成 $4\times32$，本体 token 平均后投影成 32 维。两个预测头分别回归，两个方向各占一半权重。因为查询与输入无关，被遮掉的模态不会从查询初始化里漏进来。

### 4. 动作条件的下一步预测 Next（式 4–6）
预测器 $g_\phi$（$87 \to 64 \to 64$，GELU）输入 $[s_t, \mathrm{sg}(a_t)]$（$a_t$ 截断到 ±18），目标是 EMA 教师对下一步观测编码出的**未投影的 64 维融合状态**——目标直接在策略的表示空间里。

### 5. 防坍缩与联合训练（式 7–9）
SIGReg 作用于在线的模态投影和融合状态；总损失
$\mathcal L = \mathcal L _ {\mathrm{PPO}} + \alpha_k(\mathcal L _ {\mathrm{Next}} + \mathcal L _ {\mathrm{CM}} + 0.02\mathcal R _ {\mathrm{modal}} + 0.005\mathcal R _ {\mathrm{joint}})$，$\alpha_k = 0.1\min(k/200, 1)$ 前 200 次迭代线性升温。每个 PPO 迭代结束时教师更新一次 $\bar\theta \leftarrow 0.99\bar\theta + 0.01\theta$。预测头与教师部署时都去掉，不做潜空间推演或规划。

### 6. 训练与部署
Isaac Lab + RSL-RL，PPO 每环境 24 步、5 轮、4 个 minibatch；六种地形课程（粗糙平地、平台 0.2–0.4 m、上下台阶 0.05–0.25 m、沟 0.15–0.75 m、梅花桩）。部署输入为展平的 $[B,385]$ 本体与 $[B,384]$ 深度，动作按 $q^{\mathrm{des}} = q^{\mathrm{default}} + 0.25\,\frac{e^{\mathrm{lim}}}{K_p}\,a$ 换成关节位置目标。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart LR
    subgraph IN["观测（每 20 ms）"]
        H["本体历史 H_t<br/>5 × 77"]
        D["深度图 16 × 24<br/>机身相机俯 60°"]
    end
    H --> TP["时间位置 + 模态嵌入<br/>5 个本体 token"]
    D --> CNN["深度 CNN<br/>8 × 12 = 96 个 token"]
    TP --> KV["共享 key / value<br/>101 个 token"]
    CNN --> KV
    Q0["4 个可学习查询 Q0<br/>与输入无关"] --> FUSE["两层残差交叉注意力<br/>4 头"]
    KV --> FUSE
    FUSE --> S["融合状态 s_t（64 维）<br/>4 个查询取平均"]
    H --> VE["速度估计器（单独优化）<br/>v̂_t，停梯度"]
    S --> ACT["Soft-MoE actor<br/>4 专家，输入 144 维"]
    VE --> ACT
    H --> ACT
    ACT --> A["23 维动作 → 关节目标<br/>Noetix E1"]

    subgraph TRAIN["仅训练时（部署去掉）"]
        CM["CM：遮深度 / 遮本体<br/>预测 EMA 教师的另一模态特征"]
        NX["Next：g_φ([s_t, a_t])<br/>预测 EMA 教师的 s_t+1"]
        SIG["SIGReg 防坍缩"]
        PPO["PPO + AMP 风格奖励<br/>非对称特权 critic"]
    end
    FUSE -.->|掩码路径| CM
    S -.-> NX
    A -.-> NX
    S -.-> SIG
    ACT -.-> PPO
    CM -.->|αₖ 加权| LOSS["联合损失<br/>一阶段训练编码器 + 策略"]
    NX -.-> LOSS
    SIG -.-> LOSS
    PPO -.-> LOSS
    LOSS -.->|每次迭代后 EMA 0.99| TEACH["EMA 教师"]
    TEACH -.->|预测目标| CM
    TEACH -.->|预测目标| NX
</div>

---

## 🚶 具体实例

**例 1：actor 输入与预测器输入的维数**。actor 看 $77 + 3 + 64 = 144$ 维；Next 预测器看 $64 + 23 = 87$ 维，输出 64 维，正好对上表 I 的 $87 \to 64 \to 64$。融合的 key/value 一共 $5 + 96 = 101$ 个 token，4 个查询把它压成 64 个数——比把 384 个深度像素和 385 维本体直接拼接紧凑得多。

**例 2：辅助损失的升温**。$\alpha_k = 0.1\min(k/200, 1)$：第 50 次迭代 $\alpha = 0.025$，第 100 次 $0.05$，第 200 次起封顶 $0.1$。所以训练初期以 PPO 为主，表示先被控制任务塑形，预测损失再逐渐加进来；两个 SIGReg 项再各乘 0.02、0.005。

**例 3：EMA 教师有多「慢」**。每个 PPO 迭代只更新一次、系数 0.99：一个旧参数的权重在 69 次迭代后剩 $0.99^{69} \approx 0.50$，100 次后剩约 0.37。教师因此比在线网络滞后几十次迭代，给预测提供平稳的目标。

**例 4：AMP 风格奖励的取值**。$r^{\mathrm{style}} = 0.16[e^{\tanh(0.3 d_t)} - e^{-1}]$：判别器 logit $d_t = 0$（分不清）时为 $0.16 \times (1 - 0.368) = 0.101$；$d_t = 3$（很像参考动作）时 $0.16 \times (e^{0.716} - 0.368) \approx 0.269$；$d_t = -3$ 时约 0.019。这一项不乘控制周期、也不归一化，任务奖励则先乘 0.02 再乘 0.8。

---

## 📊 实验与结果

**表 III：仿真地形穿越（L5 / L8 两档课程，2048 个并行环境）**

| 方法 | 沟 L8 SR | 下台阶 L8 SR | 梅花桩 L5 SR | 梅花桩 L8 SR | 16 项平均 |
|---|---|---|---|---|---|
| **STEP** | **99.41** | **95.46** | **93.80** | **74.90** | **95.17** |
| 去掉预测 | 99.22 | 81.93 | 85.06 | 57.23 | 91.02 |
| 单查询 | 83.69 | 62.89 | 33.20 | 17.87 | 69.98 |
| 本体查询深度（参照 AME-2 / CReF） | 99.02 | 80.13 | 75.15 | 43.51 | 86.17 |

- 差别主要在难的下台阶和梅花桩；单查询掉得最多，梅花桩 L8 只剩 17.87%。
- **图 3**：成功率—推理延迟（p50）的帕累托前沿上只有 STEP（成功率最高）和直接拼接 Concat（延迟最低）；逐个去掉查询，$q_1$ 对平台与上台阶最重要，$q_2$ 对梅花桩与下台阶最重要；注意力图随机器人前进在落脚面之间移动。论文不给每个查询指定语义角色。

**表 IV：视觉退化（L6，SR %）**

| 方法 | 沟 · 延迟 | 下台阶 · 延迟 | 梅花桩 · 延迟 | 高平台 · 断流 | 上台阶 · 断流 |
|---|---|---|---|---|---|
| **STEP** | **96.8** | **98.7** | **88.6** | **89.1** | **100** |
| 去掉 CM | 23.5 | 65.4 | 0 | 75.8 | 94.2 |
| 去掉 Next | 92.1 | 64.2 | 54.1 | 84.5 | 92.8 |
| 只有融合 | 19.4 | 61.0 | 0 | 71.2 | 88.5 |

- 深度延迟一个控制步（20 ms）时，去掉 CM 在沟与梅花桩上崩掉，去掉 Next 在梅花桩上明显变差；
- 深度**一直断流**（停在最后一帧）时，所有方法在沟和梅花桩上都是 0。

**表 V：Noetix E1 真机**（23 自由度，机载 IMU、关节编码器、俯 60° 的机身深度相机；每项 20 次，无人工干预）：20 cm 台阶 20/20、40 cm 平台 20/20、70 cm 沟 18/20、随机梅花桩 20/20、15 cm 台阶倒退上下 20/20，合计 **98/100**。倒退时相机看不到后方地形，序列里第一步脚碰到台阶，之后的步子没再碰。

---

## 💡 核心贡献

1. **与输入无关的多查询融合**：4 个可学习查询同时读本体与深度，比「本体去查询深度」更好，也让掩码预测时被遮掉的模态无从泄漏；
2. **在策略表示上同时做跨模态与时间预测**：CM 监督同一时刻的身体—地形关系，Next 以动作为条件监督下一步融合状态，目标就在策略的 64 维空间；
3. **一阶段训练、部署零开销**：预测头与 EMA 教师只在训练时存在，不需要单独的表示预训练；
4. 在 Noetix E1 上完成 98/100 次真机多地形穿越。

---

## 🤖 对人形机器人的启示

- 感知行走里的辅助损失可以直接挂在策略的融合状态上，和 PPO 一起训，不必另起一个世界模型或预训练阶段；
- 「用动作预测下一步表示」在视觉延迟 20 ms 时就能看出价值——实机上相机与控制本来就不同步，这类时间监督相当于让表示在两帧深度之间也能往前推；
- 查询的数量本身是个关键超参：1 个查询在梅花桩上几乎崩掉。

---

## ⚠️ 局限与可改进点

- **深度长时间断流仍无解**：所有变体在沟和梅花桩上都是 0，论文计划把预测拉长到一步以上、加入地形记忆；
- 时间预测只有一步；
- 仿真基线只有内部消融和一个参照 AME-2 / CReF 的「本体查询深度」实现，没有和原论文代码直接比；
- 真机只测了 STEP 本身，没有和基线做真机对比；沟上 2 次失败；
- 未开源，奖励 23 项、SIGReg 细节都只能从文字复现。

---

## 🎤 面试参考

- **为什么查询要与输入无关？** CM 要遮掉一种模态再预测它；如果查询由本体生成，遮深度时查询本身仍带着本体信息、遮本体时则会把本体从查询漏进来，掩码就不干净。
- **Next 的目标为什么用 EMA 教师、而且不投影？** EMA 目标稳定、防止在线网络把目标一起拉向平凡解；直接用 64 维融合状态当目标，监督的就是策略真正用的那个表示。
- **为什么还要 SIGReg？** 预测式自监督容易坍缩到常数表示（预测常数最省事），SIGReg 让表示在随机方向上接近各向同性高斯。
- **部署时多花多少？** 不多花：预测头、教师都拿掉，部署网络只有速度估计器、编码器与 actor。

---

## 🔗 相关阅读

- [AME-2](../AME-2__Agile_and_Generalized_Legged_Locomotion_via_Attention-Based_Neural_Map_Encoding/AME-2__Agile_and_Generalized_Legged_Locomotion_via_Attention-Based_Neural_Map_Encoding.html)：本体查询地图的注意力编码，本文 Proprio-Query 基线的参照之一
- [AMP](../../01_Foundational_RL/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control.html)：本文的风格奖励来源
- [PPO](../../01_Foundational_RL/PPO_Proximal_Policy_Optimization/PPO_Proximal_Policy_Optimization.html)：主优化器
- SPR（Schwarzer et al., 2021）、LeJEPA / SIGReg（Balestriero & LeCun, 2025）、Kepler（Singh et al., 2026）
