---
layout: paper
paper_order: 6
title: "Now You See That: Learning End-to-End Humanoid Locomotion from Raw Pixels"
zhname: "Now You See That：高保真深度仿真 + 视觉感知行为蒸馏，让人形机器人从「原始像素」端到端学会复杂地形行走"
category: "Locomotion"
---

# Now You See That: Learning End-to-End Humanoid Locomotion from Raw Pixels
**Now You See That：从原始像素端到端学习人形行走**

> 📅 阅读日期: 2026-05-20
>
> 🏷️ 板块: 05 Locomotion · 视觉感知 / 端到端 / Sim2Real
>
> 🔁 推进轨: 模块轮转（04_WBC → **05_Locomotion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.06382](https://arxiv.org/abs/2602.06382) |
| HTML | [arXiv HTML](https://arxiv.org/html/2602.06382) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2602.06382) |
| 项目主页 | [hellod035.github.io/Now_You_See_That](https://hellod035.github.io/Now_You_See_That/) |
| **发布时间** | 2026-02-06 (arXiv) |
| 源码 | [Hellod035/Now_You_See_That](https://github.com/Hellod035/Now_You_See_That) |
| 机构 | Harbin Institute of Technology · HONOR Robot Team |
| 发表时间 | 2026-02 |
| 评测平台 | 全尺寸人形机器人 + 双目（立体）深度相机，机载 **50 Hz** 推理 |

---

## 🎯 一句话总结

> 现有人形 vision-based locomotion 在仿真里跑得很好、上真机经常崩——根因是**深度图的 sim2real gap** 与**多地形目标互相冲突**。本文把这两件事一起解决：①搭了一个**高保真深度仿真器**显式建模立体匹配伪影与标定误差；②设计**视觉感知行为蒸馏（vision-aware behavior distillation）**，把"特权高度图教师"的策略蒸馏到"原始深度像素学生"，并引入**噪声不变辅助任务**约束 latent；③用**地形专属奖励 / 多 critic + 多 discriminator**把"上高台、过缝隙、爬长楼梯、踩瓦砾"等几类冲突动力学塞进**一个统一策略**——最终零样本上全尺寸人形 50 Hz 跑通 8 类复杂地形。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| E2E | End-to-End | 端到端：直接从深度像素映射到关节动作 |
| RGBD / Depth | Depth image | 深度图（本文使用立体匹配深度） |
| Heightmap | Privileged elevation grid | 特权高度图，只在仿真里可用 |
| Distillation | Behavior Distillation | 行为蒸馏：从教师策略学到学生策略 |
| AMP | Adversarial Motion Prior | 对抗式运动先验，本文用多个 discriminator |
| Multi-Critic | Multiple Value Functions | 多 critic：不同地形 / 不同奖励项用不同价值估计 |
| Sim2Real | Simulation-to-Real | 仿真到真机迁移 |

---

## ❓ 论文要解决什么问题？

人形 locomotion 已经能在仿真里端到端用视觉走得很猛了，但搬到真机上还有两道大坎：

1. **深度感知的 sim2real gap**。
   - 仿真里常见的"理想深度图"（每像素都有正确深度）和真机立体匹配输出差距巨大：
     - 立体匹配在低纹理、强反光、远距离区域会大面积**缺失 / 黑边**；
     - 相机内外参标定误差会让深度产生**系统性偏移**；
     - 边缘抖动、噪点、闪烁让网络学到的"细节"在真机上全是错位。
   - 后果：在仿真里用 height map 学到的精确落脚，到真机就**踩空**。

2. **多地形目标互相打架**。
   - 上 0.4~0.6 m 高的台子、跨 30~50 cm 的缝、踩斜的瓦砾、上长楼梯——它们对**步长 / 抬腿高度 / 接触模式 / 关节扭矩配比**的要求完全不同。
   - 一个 PPO + 单一奖励混训，要么"什么都会一点、什么都不稳"，要么干脆崩到某种主导地形上。

**目标**：一个端到端策略，**输入只有原始深度像素 + 本体感知**，**输出全身关节动作**，能在全尺寸人形真机上 50 Hz 跑通 8 类复杂地形，零样本不微调。

---

## 🔧 方法详解

### 1. 高保真深度仿真：把"立体匹配伪影"喂回训练

不是给真值深度图加高斯噪声那么简单，而是**模拟立体匹配的物理过程**：

| 真实伪影 | 仿真侧建模 |
|---|---|
| 低纹理 / 反光 → 大块缺失 | 基于材质 / 视差置信度做"块状洞" |
| 远距离 → 深度量化阶梯 | 视差量化（disparity → depth 反比导致远处粗） |
| 标定误差 → 系统偏移 | 在每次 episode 随机扰动相机内外参 |
| 边缘抖动 | 在物体轮廓做时间抖动 + 边缘膨胀 / 腐蚀 |

→ 训练时学生看到的深度图，**就是真机会看到的样子**。

### 2. 视觉感知行为蒸馏（Vision-Aware Behavior Distillation）

经典两阶段流程：

1. **第一阶段**：在特权信息（精确高度图 + 完整本体）下用 PPO + AMP + multi-critic 训练**教师策略 πT**。
2. **第二阶段**：把 πT 蒸馏到只看深度像素 + 本体的**学生策略 πS**：
   - **动作监督**：MSE / KL 对齐 πS 与 πT 的输出动作；
   - **latent 对齐**：把 πS 在深度图编码后的 latent 与 πT 在高度图编码后的 latent 做对齐（latent space alignment）；
   - **噪声不变辅助任务**：对同一帧 ground truth，给 πS 两张不同噪声版本的深度图，要求其 latent / 动作一致，强制**学到的特征对深度伪影鲁棒**。

这一步是本文核心，因为它把"高度图能告诉策略的所有几何信息"通过 latent 灌进了"只看深度像素"的学生里。

### 3. 地形专属奖励 + 多 critic / 多 discriminator

不让所有地形挤一个 critic：

- 给"上台 / 跨缝 / 楼梯 / 瓦砾 / 上斜坡 / 高平台 / 网格洞 / 平地"等各开**独立 critic 头**估值；
- 同时配**多个 AMP discriminator**，每个对应一类动作先验（爬上动作、跨步动作、走楼梯动作……）；
- 训练时按地形分配回报与 discriminator，**让冲突目标在各自空间内被最大化**，主干策略只承担"什么时候用什么风格"的选择。

### 4. 全身闭环 50 Hz

- 输入：本体感知（关节角 / 速度 / IMU / 命令）+ 单目机载立体深度（经过仿真伪影预训练后能直接吃）；
- 输出：全身关节目标位置，PD 跟随；
- 推理：全部在机载算力上 50 Hz 运行，无任何真机微调。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph SIM["🧪 仿真训练侧"]
        HM["🗺 特权高度图<br/>(精确几何)"]
        T["👨‍🏫 教师策略 π_T<br/>PPO + AMP + multi-critic"]
        HM --> T
        TR["🏗 地形池<br/>台阶 / 缝隙 / 瓦砾 / 楼梯 / 高台..."]
        TR --> T
    end

    subgraph DEPTH["🎛 高保真深度仿真"]
        D0["理想深度"]
        ART["注入伪影<br/>块状缺失 / 量化 / 边缘抖动 / 标定扰动"]
        D0 --> ART --> DN["真实风格深度图"]
    end

    subgraph STU["🎓 学生策略 π_S（端到端）"]
        ENC["深度图编码器"]
        PROP["本体感知<br/>关节 / IMU / 命令"]
        POL["全身控制 MLP / Transformer"]
        DN --> ENC
        ENC --> POL
        PROP --> POL
    end

    subgraph DIST["🌀 视觉感知行为蒸馏"]
        ACT["动作监督<br/>MSE / KL"]
        LAT["latent 对齐<br/>把 π_S(latent) 拉到 π_T(latent)"]
        AUX["噪声不变辅助任务<br/>同帧两份不同噪声 → 一致 latent"]
    end

    T -. 监督 .-> ACT
    T -. latent .-> LAT
    DN -. 双噪声样本 .-> AUX
    ACT --> POL
    LAT --> POL
    AUX --> POL

    POL --> ACTOUT["🦿 全身关节目标位置<br/>50 Hz 机载推理"]
    ACTOUT --> ROBOT["🤖 全尺寸人形真机<br/>零样本部署"]

    style SIM fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style DEPTH fill:#fef6e4,stroke:#d35400,color:#5e2c00
    style STU fill:#e8f8e8,stroke:#27ae60,color:#1b5e20
    style DIST fill:#fde2e2,stroke:#c0392b,color:#5d1a14
</div>

---

## 💡 核心贡献

1. **高保真深度仿真器**：把立体匹配的真实伪影（块状缺失、视差量化、标定偏移、边缘抖动）建进训练循环，让学生**直接在"真机风格深度"上训练**，而不是事后微调。
2. **视觉感知行为蒸馏**：动作监督 + latent 对齐 + 噪声不变辅助任务，三件套把特权高度图教师"几何先验"灌进只看像素的学生。
3. **多 critic + 多 discriminator + 地形专属奖励**：把"上高台 / 跨缝 / 楼梯 / 瓦砾"等动力学冲突的地形塞进一个统一策略而不崩。
4. **真机端到端、零样本**：在全尺寸人形 + 立体深度相机上 50 Hz 机载推理，覆盖 8 类挑战地形。

---

## 📊 关键实验结果（结构性总结）

| 维度 | 结论 |
|---|---|
| 评测地形 | 高石头、长楼梯、瓦砾场、不同高度缝隙、推车（trolleys）、高平台、网格孔、平台-斜坡-缝隙组合 |
| 策略数量 | **1 个统一策略**覆盖以上全部地形 |
| 仿真→真机 | **零样本**，无真机数据 / 微调 |
| 机载推理频率 | **50 Hz** |
| 主要消融 | 关闭"伪影注入" → 真机深度下崩溃；关闭"latent 对齐" → 落脚精度下降；关闭"多 critic / 多 discriminator" → 多地形主导冲突，部分地形成功率明显下降 |

> ⚠️ 详细数字（成功率、对比基线、消融定量）以 arXiv 论文正文为准；本表为结构性提炼，便于二次定位。

---

## 🤖 工程价值

- **"深度仿真侧建伪影" 是普适做法**：这套思路完全可以平移到 4 足、移动机械臂、室内导航——只要训练时用立体深度，就该用类似的伪影建模来抹掉 sim2real。
- **latent 对齐 + 噪声不变正则** 是行为蒸馏的实用 baseline，相比"只对动作做 MSE"更稳；很多 humanoid 视觉策略可以直接套这个目标函数。
- **多 critic / 多 discriminator** 是当前人形 locomotion 处理多地形冲突的主流路线（与 APEX / ANYmal Parkour 等同期工作思路一致），本文给出了一个干净的视觉版本实现。

---

## 🎤 面试参考

**Q：为什么要做高保真深度仿真，不直接 domain randomization 加高斯噪声？**
A：立体匹配的真实噪声**不是各向同性高斯**，而是**结构化的**：低纹理区会**整块缺失**、远处会出现**深度量化阶梯**、标定误差会让深度图**整体偏移**。高斯噪声训出来的策略对这种结构化失效完全没准备。

**Q：行为蒸馏的 latent 对齐和"DAgger / 模仿学习"有什么区别？**
A：DAgger 只对齐动作，等价于"老师在每一步告诉学生踩哪"；本文额外要求**学生看深度像素后的内部表示 ≈ 教师看高度图后的内部表示**，相当于把教师的"几何脑回路"也搬过去。再加噪声不变约束，让学生的脑回路不被深度伪影带跑。

**Q：8 类地形为什么不分 8 个策略再切？**
A：切换瞬间是人形最容易摔的位置（接触模式突变 / 姿态不连续）。统一策略让"什么时候用什么风格"成为可学习的内部决策，过渡更平滑。多 critic / 多 discriminator 解决了"统一策略难训"的问题。

**Q：相比 APEX、DPL，本文的定位？**
A：APEX 解决的是"垂直高于腿长平台" 的攀爬式接触；DPL 关注深度合成 + 跨注意力地形重建；本文更强调**"原始深度像素直接驱动 + 立体匹配真实伪影建模"的端到端管线**——三者解决的是同一现实约束的不同侧面。

---

## 🔗 相关阅读

- [APEX: Learning Adaptive High-Platform Traversal (2602.11143)](https://arxiv.org/abs/2602.11143)：用棘轮式进度奖励解决"高于腿长"的攀爬式高平台
- [DPL: Depth-only Perceptive Humanoid Locomotion (2510.07152)](https://arxiv.org/abs/2510.07152)：纯深度感知 + 跨注意力地形重建
- [ANYmal Parkour: Robust Perceptive Locomotion (2306.14874)](https://arxiv.org/abs/2306.14874)：四足跑酷视觉 locomotion 的代表工作
- [Extreme Parkour with Legged Robots](https://extreme-parkour.github.io/)：极限跑酷视觉策略
- [GeoLoco: Leveraging 3D Geometric Priors from VFM (2603.07624)](https://arxiv.org/abs/2603.07624)：与本文同期的 RGB-only 视觉 locomotion 思路

---

> 备注：本笔记基于 arXiv 摘要、项目页与 GitHub 仓库信息整理；具体数值（各地形成功率、消融定量、对比基线）以 arXiv [2602.06382](https://arxiv.org/abs/2602.06382) 论文正文为准。
