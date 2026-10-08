---
layout: paper
paper_order: 6
title: "PhysHMR: Learning Humanoid Control Policies from Vision for Physically Plausible Human Motion Reconstruction"
zhname: "PhysHMR：用视觉条件策略直接产出物理可行的人体动作重建"
category: "物理动画"
---

# PhysHMR: Learning Humanoid Control Policies from Vision for Physically Plausible Human Motion Reconstruction
**PhysHMR：用视觉条件策略直接产出物理可行的人体动作重建**

> 📅 阅读日期: 2026-05-31
>
> 🏷️ 板块: 13 Physics-Based Animation · 视频驱动 HMR / 物理可行性 / 视觉条件 RL / 像素射线投射
>
> 🔁 推进轨: 模块轮转（12_Hardware_Design → **13_Physics-Based_Animation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2510.02566](https://arxiv.org/abs/2510.02566) |
| HTML | [在线阅读](https://arxiv.org/html/2510.02566) |
| PDF | [下载](https://arxiv.org/pdf/2510.02566) |
| 项目主页 | [fengq1a0.github.io/projects/physhmr](https://fengq1a0.github.io/projects/physhmr/index.html) |
| 会议 | **SIGGRAPH Asia 2025**（[ACM DOI 10.1145/3757377.3763951](https://doi.org/10.1145/3757377.3763951)） |
| 提交日期 | 2025-10-02 |
| 作者 | Qiao Feng, Yiming Huang, Yufu Wang, Jiatao Gu, Lingjie Liu |
| 机构 | **University of Pennsylvania** |
| **发布时间** | 2025-10-02 (arXiv), **SIGGRAPH Asia 2025**（[ACM DOI 10.1145/3757377.3763951](https://doi.org/10.1145/3757377.3763951)） |
| 源码 | ✅ [fengq1a0/physhmr](https://github.com/fengq1a0/physhmr)（Isaac Gym + PHC 基线 + AIST++ 数据集） |

---

## 🎯 一句话总结

**把 HMR 从"先估姿态、再做物理后修"的两段式拼接，压缩成一个端到端的视觉条件 RL 策略**：用 GVHMR 抽到的视觉特征做局部 pose 推理，加上把 2D 关键点抬成"3D 射线"的 **pixel-as-ray** 软全局对齐，再叠一层从 MoCap 专家蒸馏来的运动先验 + 物理 reward 微调；输出直接是物理仿真中跑得动、又对齐视频的人体动作。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| HMR | Human Mesh Recovery | 从图像/视频恢复 3D 人体网格（SMPL 等） |
| GVHMR | Global Video-based HMR | 一种全局轨迹感知的视觉 HMR 网络，本文当**视觉特征提取器** |
| SMPL / SMPLX | Skinned Multi-Person Linear Model | 标准 3D 人体参数化模型 |
| PHC | Perpetual Humanoid Control | 物理仿真中的"通用动作追踪策略"基线（Z. Luo 等，本文延伸 + 替换观测） |
| RL | Reinforcement Learning | 强化学习 |
| BC | Behavior Cloning | 行为克隆，本文用于把 MoCap 专家策略蒸馏到视觉条件策略 |
| Kpt2D | 2D Keypoints | 视频帧的 2D 人体关键点 |
| Pixel-as-Ray | Pixel-as-Ray | 把 2D 像素 + 相机内参抬成世界系下的 3D 射线，做软全局约束 |
| AIST++ | AIST++ Dance Dataset | 多视角同步舞蹈视频 + MoCap，本文主评测集 |

---

## ❓ 要解决什么问题？

视频 → 物理可行的人体动作，主流是 **两段式**：

1. **视觉 HMR**（GVHMR / WHAM / SLAHMR …）：从视频估出 SMPL 参数序列；
2. **物理后修**：用物理仿真器 / IK / 动力学约束把这条"看上去对、物理上漂浮"的轨迹打回可行域。

两段式的痛：

- **误差累积**：第一步的脚陷地、抖动、自接触穿模，被第二步当作"参考"硬追，反而把策略训歪；
- **物理后修是补丁**：不能反过来指导前端视觉，前端不知道自己产出的姿态在物理上是否可行；
- **全局轨迹漂移**：单目视频天然缺尺度，前端给出的全局 root 位置噪声大，后修策略一旦把它当硬约束就发散。

**本文目标**：把整条流水线压成**一个视觉条件 RL 策略** —— 输入视频特征（局部）+ 像素射线（全局软约束），输出仿真器里的动作扭矩；用"物理可执行"反过来约束"视觉对齐"，端到端学。

---

## 🔧 方法核心

### ① 整体形态：一个视觉条件控制策略，不再是 "HMR → 后修"

```
视频  →  GVHMR 视觉特征 (局部)  ─┐
       2D 关键点 → pixel-as-ray (全局) ─┼─→  策略 π(a | s_sim, vision)  →  Isaac Gym 仿真  →  物理可行动作
       (BC 专家先验 + 物理 reward)      ─┘
```

策略本身**就是 HMR 输出**：它在仿真里执行的动作直接被当作"重建结果"，而不是只用来事后修正一条已有的 SMPL 序列。

### ② Pixel-as-Ray：把 2D 像素抬成 3D 射线做全局软对齐

单目视频最难处理的就是**全局根位置**。直接预测出的 root 噪声大，硬塞给策略容易把它训乱。作者的做法：

- 取每帧关键 2D 关键点 `(u, v)`，配上**已知相机内参 K** 和已知相机外参（或假设），抬成**世界系下的 3D 射线**：

  ```
  ray(u,v) = R · K⁻¹ · [u, v, 1]ᵀ  ,   原点 = camera_center
  ```

- 把这些射线编码进策略观测，策略只需让自身仿真关节**沿着对应射线**靠拢即可，不需要承诺一个具体深度；
- 等价于一个**深度方向自由、横向严格对齐**的软约束 —— 远比"硬塞一个噪声 3D 关键点"鲁棒。

> 💡 与 Mimic2DM 的"重投影 reward"是同一类思想的**对偶版**：Mimic2DM 把仿真姿态投回 2D 做奖励；PhysHMR 把 2D 像素抬到 3D 射线做观测。

### ③ 局部视觉特征：复用 GVHMR encoder

光有 2D 关键点会丢掉"具体姿态"的细节信号（手指扭转、脚朝向）。作者把 **GVHMR pretrained encoder** 的中间特征也塞进策略观测，作为**局部 pose hint**：

- 全局靠 pixel-as-ray；
- 局部靠 GVHMR feature；
- 策略在两路条件下做"物理上可执行的 SMPL pose"输出。

### ④ 训练流程：MoCap 专家蒸馏 + 物理 reward 微调

直接 RL 学"看视频做动作"难度极大（探索稀疏）。作者用三阶段课程：

1. **MoCap 专家训练**：先按 PHC 套路在仿真里训一个**只看 ground-truth MoCap 状态**的强追踪策略 π_expert；
2. **BC 蒸馏到视觉策略**：把 π_expert 在同样 MoCap 上的动作作为监督，让**视觉条件**学生策略 π_vis 行为克隆出来 —— 学生看到的是 GVHMR feature + pixel-as-ray + 仿真本体状态；
3. **物理 reward 微调**：在 BC 之后接 RL，奖励里加 **关键点重投影对齐 + 物理可行性（接触/能量/平滑）+ 视觉 token 一致性**，把蒸馏出来的策略推到既对得上视频、又在物理上活得下去的解空间。

仓库 ckpt 命名 `BC+RL+kp2d_mixed_rerun` 印证了"BC → RL + 2D 关键点混合监督"这条流程。

### ⑤ 实现栈

- **仿真器**：NVIDIA **Isaac Gym**
- **角色模型**：SMPL v1.1.0 / SMPLX v1.1（male / female / neutral）
- **数据集**：**AIST++**（多视角同步舞蹈视频 + 3D MoCap）
- **依赖**：PyTorch 2.4.1，Python 3.8，PHC 子模块
- **预训练权重**：`download_data.sh` 自动拉取（含视觉 encoder + BC+RL 策略）

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph INPUT["📹 输入"]
        VID["单目视频 (T 帧 RGB)"]
        K["相机内外参 (已知/估出)"]
    end

    subgraph PERCEPT["👁️ 视觉条件 (双路)"]
        GV["GVHMR encoder<br/>(pretrained, frozen)"]
        F_LOCAL["局部视觉特征<br/>(细节 pose hint)"]
        KP["2D 关键点检测"]
        RAY["Pixel-as-Ray<br/>R·K⁻¹·[u,v,1]"]
        VID --> GV --> F_LOCAL
        VID --> KP
        KP --> RAY
        K --> RAY
    end

    subgraph TRAIN["🛠️ 三阶段训练"]
        subgraph EXPERT["阶段 1 · MoCap 专家"]
            EX["π_expert(a #124; s_sim, s_mocap)<br/>(PHC 风格强追踪)"]
        end
        subgraph BC["阶段 2 · 视觉策略 BC 蒸馏"]
            VS["π_vis(a #124; s_sim, F_LOCAL, RAY)"]
            EX -. "动作监督" .-> VS
        end
        subgraph RL["阶段 3 · 物理 reward 微调"]
            R1["关键点重投影 reward"]
            R2["物理可行性 reward<br/>(接触/能量/平滑)"]
            R3["视觉一致性 reward"]
            VS --> R1
            VS --> R2
            VS --> R3
        end
    end

    subgraph DEPLOY["🚀 推理 (端到端 HMR)"]
        IG["Isaac Gym 仿真"]
        OUT["物理可行 3D 人体动作<br/>(SMPL/SMPLX 序列)"]
        VS -->|"action"| IG --> OUT
    end

    F_LOCAL --> VS
    RAY --> VS

    style INPUT fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style PERCEPT fill:#e0f7fa,stroke:#0097a7,color:#003f47
    style TRAIN fill:#fbe9e7,stroke:#d84315,color:#4e1a0e
    style DEPLOY fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
</div>

---

## 💡 核心贡献

1. **统一视觉-动作 RL 策略**：首次把"HMR + 物理"合并成单一可端到端训练的视觉条件控制策略，去掉两段式累积误差；
2. **Pixel-as-Ray 软全局约束**：把脆弱的"预测 3D root"换成"从已知相机抬升的 3D 射线"，对单目深度歧义鲁棒；
3. **MoCap 专家 → 视觉学生 → 物理 RL 微调** 的课程式训练，让稀疏的视觉条件 RL 实际可学；
4. **开源完整管线**：Isaac Gym 训练代码 + PHC 集成 + AIST++ 评测，复现门槛低于多数同类方法。

---

## 🤖 工程价值与对人形机器人的启示

| 方向 | 影响 |
|---|---|
| **数据成本** | 复用 GVHMR 这类现成视觉 encoder，意味着可以把**互联网级人类视频**直接当 RL 数据源，不依赖昂贵 MoCap |
| **重定向 / Sim-to-Real** | 输出本来就是仿真器里物理可行的动作 → 后续重定向到真实人形机器人时少了"轨迹物理可行性"的修复步骤 |
| **观测设计** | 「pixel-as-ray」是对"全局信号噪声大"的优雅处理 —— 人形机器人远场感知（深度/雷达噪声大）可以借同样思路，把硬距离换成方向射线 |
| **课程式蒸馏** | 「MoCap 专家 → 视觉学生 → 物理 reward 微调」三段式课程，与人形机器人"特权学生 → 部署学生 → real-world RL"完全同构，模板可直接搬 |
| **Foundation HMR + WBC** | 对应人形社区常说的"Foundation Motion Model + Whole-Body Controller"分层：本文证明把两层合一也可行，给闭环动作生成提供另一条路径 |

---

## ⚠️ 局限与可改进点

- **相机内参假设已知**：野生视频常常不准 → 后续可联合估计内参 / 自标定；
- **GVHMR encoder 是冻结的**：视觉端的 OOD 失败仍会传到策略；端到端联合微调视觉 + 策略是一条自然延伸；
- **AIST++ 主要是舞蹈**：高接触 / 物体交互 / 户外极端动作的泛化尚待验证；
- **SMPL/SMPLX 中心**：迁到人形机器人需做 retargeting-aware 训练 —— 仓库主要面向角色动画社区；
- **依赖 Isaac Gym**：随着 Isaac Lab 取代旧版，长期维护需要迁仓。

---

## 📊 与同类思路对比

| 方案 | 输入 | 物理约束 | 全局对齐 | 端到端 RL |
|---|---|---|---|---|
| GVHMR / WHAM / SLAHMR | 视频 | ❌ 纯运动学 | ✅（视觉预测） | ❌ |
| HMR + SimPo / Embodied Pose | 视频 → 3D 姿态 → 物理后修 | ✅（后修） | ⚠️（受第一步噪声拖累） | ❌（两段式） |
| Mimic2DM（仓库 #450） | 2D 关键点 | ✅（仿真内 reward） | ⚠️（多视角软三角化） | ✅（纯 2D 监督） |
| **PhysHMR (本文)** | **视频 (GVHMR feat) + 2D Kpt 射线** | **✅ 端到端在仿真内** | **✅ pixel-as-ray 软对齐** | **✅（BC+RL 联合）** |

> 📌 一句话：把"视觉先验"和"物理仿真"用同一个策略黏起来，不再让两个网络隔着 SMPL 中间格式打架。

---

## 🎤 面试参考

**Q：为什么不用预测出来的 3D root 而要做 pixel-as-ray？**
A：单目视频深度歧义本质无解，预测出来的 3D root 噪声大、不一致；用射线观测，策略只需对齐**方向**而不需要承诺**距离**，把深度自由度交给仿真物理+多帧时间约束去自行收敛。

**Q：和 Mimic2DM 都在用 2D 信号，有什么本质区别？**
A：Mimic2DM 是把仿真姿态**投回 2D 做 reward**；PhysHMR 是把 2D **抬到 3D 射线做 observation**。前者完全不依赖任何视觉网络，后者还借助 GVHMR 的局部特征拿到更细的姿态信号 —— 两者可互补。

**Q：为什么需要 MoCap 专家先训？**
A：直接 RL 学"看视频做动作"的探索空间太大、奖励太稀疏。先训一个看 ground-truth 的专家把基本动作学下来，再 BC 给视觉学生，能把"运动技能本身"和"从视觉读出技能"两个难题解耦。

**Q：能不能直接迁到人形机器人？**
A：可以但有 gap —— ① 需要把 SMPL 输出重定向到机器人 URDF；② 物理 reward 里要加机器人专属约束（执行器力矩饱和、扭矩平滑、ZMP）；③ Isaac Gym → Isaac Lab 迁仓。范式本身（pixel-as-ray + 视觉条件 RL + 课程蒸馏）则完全通用。

**Q：训练上最大的工程坑是什么？**
A：仓库依赖 Isaac Gym 老版本 + Python 3.8，环境冲突常见；GVHMR 预训练权重大、AIST++ 数据集要走 `download_data.sh`，建议预留盘空间。

---

## 🔗 相关阅读

- [PHC: Perpetual Humanoid Control (ICCV 2023)](https://arxiv.org/abs/2305.06456) — 本文复用的物理追踪基线（仓库 #465）
- [GVHMR (CVPR 2024)](https://arxiv.org/abs/2408.10125) — 本文的视觉 encoder 来源
- [Mimic2DM (仓库 #450)](https://arxiv.org/abs/2512.08500) — 同类"非 3D 监督"思路的对偶版本
- [SLAHMR (CVPR 2023)](https://arxiv.org/abs/2304.01693) — 视频 → 全局 SMPL 的代表性 baseline
- [Embodied Pose (NeurIPS 2022)](https://arxiv.org/abs/2206.09106) — 早期"HMR + 物理后修"代表
- [AIST++ 数据集](https://google.github.io/aistplusplus_dataset/) — 多视角舞蹈视频 + 3D MoCap

---

> 备注：本笔记基于 arXiv 摘要、SIGGRAPH Asia 2025 出版页、官方 GitHub README（[fengq1a0/physhmr](https://github.com/fengq1a0/physhmr)）整理；arXiv HTML / 项目主页在写入时返回 403 不可直接抓取，部分定量数值（具体 G-MPJPE / accel error / penetration ratio）以官方 PDF 与 SIGGRAPH Asia 2025 论文集为准；待复现后再补：消融（去 pixel-as-ray / 去 BC / 去 RL 微调）的具体 delta、与 SimPo / Embodied Pose / SLAHMR-Physics 的对照表。
