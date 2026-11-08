---
layout: paper
title: "Vision as Proprioception: Estimating Humanoid Robot Pose from Video"
zhname: "HumanoidPose：视觉即本体感受，从视频估计人形机器人位姿"
category: "State Estimation"
arxiv: "2610.25288"
---

# Vision as Proprioception: Estimating Humanoid Robot Pose from Video
**只看一段普通 RGB 视频，不碰机载传感器，就恢复人形机器人每个关节的角度和世界坐标下的根部轨迹：冻结人体姿态预训练的图像特征，用机器人自己的 MJCF 里每个关节的几何描述生成查询，一个共享解码器服务 16 种人形；训练数据全部是 AMASS 重定向到 16 台机器人后在 Unreal 里渲染的合成图，再用网上无标注视频自训练 2D 检测器**

> 📅 总结日期: 2026-11-03
>
> 🏷️ 板块: 09 State Estimation · 视觉状态估计 · 外部视角的关节角恢复 · 跨本体 · 合成数据 · 自训练 · Unitree G1 / EngineAI PM01 / Fourier N1
>
> 🔁 推进轨: 模块轮转（08_Navigation → **09_State_Estimation**）· 上游 awesome-humanoid-robot-learning State Estimation 章节中尚无笔记的最新论文（2026-10-18，PROGRESS #1163，上游标 🌟）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.25288](https://arxiv.org/abs/2610.25288) |
| HTML | [arxiv.org/html/2610.25288v1](https://arxiv.org/html/2610.25288v1) |
| PDF | [下载 v1](https://arxiv.org/pdf/2610.25288v1) |
| **发布时间** | 2026-10-18（arXiv v1，cs.RO） |
| 项目页 | [siplab.org/projects/HumanoidPose](https://siplab.org/projects/HumanoidPose)（另有 [YouTube 视频](https://youtu.be/DVE6Szo524s)） |
| 源码 | ⏳ 未放出：官方仓库 [eth-siplab/HumanoidPose](https://github.com/eth-siplab/HumanoidPose)（MIT）截至 2026-11-03 只有 README 和三张图，「Code and models: Coming soon」。所以下文的时序图是**按论文第 III 节整理的推理流程**，不是从源码读出来的调用链 |
| 依赖的开源组件 | [PromptHMR](https://github.com/yufu-wang/PromptHMR)（冻结的图像 / 相机编码器与移动相机流程）、[GMR](https://github.com/YanjieZe/GMR)（重定向）、[mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie)（机器人描述）、[Ultralytics YOLO11-pose](https://github.com/ultralytics/ultralytics)（检测）、DROID-SLAM（相机运动） |

**作者**：Jiaxi Jiang、Matthias Heyrman、René Zurbrügg、Marco Hutter、Christian Holz（ETH Zürich，SIPLab 与 RSL）

---

## 🎯 一句话总结

机器人自己的关节编码器当然知道自己的姿态，但**外部观察者**常常拿不到这些读数——别人的机器人、隐私或通信限制、网上的宣传视频、AI 生成的视频里根本不存在编码器。HumanoidPose 把「看视频」当成一种外部的本体感受：YOLO11 检测器找到机器人、裁成方图（机器人占图高 55%），冻结的 PromptHMR 人体图像编码器提特征，**一个共享的 Transformer 解码器**用「每个关节一个查询」的方式读特征——查询由机器人 MJCF 里该关节的 27 维几何描述（轴、锚点、父子偏移、限位、树深度、左右侧……）经一个 MLP 生成，所以换一台没见过的机器人只要给它的 MJCF。根部的深度用「已知身高 × 焦距 ÷ 像素高度」做先验、网络只学对数修正；再乘上相机到世界的变换（移动相机用 DROID-SLAM）就得到世界坐标轨迹。训练只用合成数据：AMASS 经 GMR 重定向到 16 台人形（0.60–1.78 m、19–43 自由度），Unreal 里随机场景渲染 128,000 张。三台真机上关节角误差比每台最强的基线低 18–32%，G1 根部轨迹 RMSE 比按身高缩放的 PromptHMR 低 40%。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| MPJAE | Mean Per-Joint Angle Error | 关节角平均绝对误差（°），本文主指标 |
| MPJPE | Mean Per-Joint Position Error | 各刚体原点在机器人基座系下的平均位置误差（cm），根部位姿置零后算 |
| PCK | Percentage of Correct Keypoints | 2D 关键点落在阈值（框高 5%）内的比例 |
| FK | Forward Kinematics | 正运动学，训练时可微，把关节角误差传成刚体位置误差 |
| SynFT | Synthetic Finetuning | 在本文合成数据上微调基线 |
| ST | Self-Training | 用模型自己在无标注视频上的高置信检测当伪标签再训练 |
| GMR | General Motion Retargeting | 人体动作到人形的重定向方法 |
| HMR | Human Mesh Recovery | 从图像恢复人体网格（SMPL / SMPL-X） |

---

## ❓ 这篇论文要解决什么问题？

- **问题定义**：给一段外部 RGB 视频和机器人的 URDF / MJCF，逐帧输出 $n$ 个驱动关节的角度 $\hat{\mathbf q}_t\in\mathbb R^n$ 和根部到相机的变换 $\hat{\mathbf T} _ {C\leftarrow R,t}$，再拼成世界坐标下的运动。作者称之为 **visual proprioception**。
- **难点**：① 人形之间身材、关节布局、限位都不同，输出维度也不同（19–43）；② 遮挡和单目深度二义性让关节角欠定；③ 移动相机时要把机器人运动和相机运动分开；④ 没有成规模的「图像 + 同步编码器」数据。
- **现有路线的不足**：机械臂的位姿估计（RoboPose、HoRoPose、RoboPEPP）每台机器人训一个模型，没做过全身人形；「先估人体 SMPL-X 再 GMR 重定向」会把人体估计误差在重定向里放大，人和机器人的关节也不一一对应。

---

## 🔧 方法拆解

### 1. 合成数据（第 III-B 节，图 3）

AMASS → GMR 重定向到 16 台人形 → Unreal Engine 随机场景、光照、视角、外观渲染。每张图配：相机内参、根部位姿、**精确的关节角**（就是渲染用的那组）、15 个共享 2D 关键点（骨盆、颈、头，左右髋 / 膝 / 脚 / 肩 / 肘 / 腕）和包围框。每台机器人 8000 张，共 128,000 张。所有机器人编译成统一的模型约定（坐标、限位、FK），标签和损失口径一致。

### 2. 2D 检测器与自训练

YOLO11-pose 从人体关键点权重初始化，先在合成数据上微调（SynFT），再在**无标注的网上视频**上做两轮自训练：高置信、关键点够多的检测当时间锚点，相邻锚点之间插值补短缺口，只保留单机器人、框重叠的片段，混入合成图再训。评测录像排除在外。3D 解码器**只用合成数据**训练，自训练只改检测器。

### 3. 运动学条件的关节查询（式 1）

每个驱动关节 $j$ 拼一个 27 维描述 $\mathbf v_j$：局部的轴 $\mathbf a_j$、锚点 $\mathbf c_j$、父子偏移 $\mathbf o_j$ 与四元数 $\mathbf r_j$、偏移长度；限位 $\ell_j, u_j$ 与范围；树深度 $d_j$；左右侧符号 $\eta_j$；身高尺度 $\log s_R$；基座系下的静止锚点 $\bar{\mathbf c}_j$ 与轴 $\bar{\mathbf a}_j$；是否有限位 $m_j$。长度都除以 $s_R$ 做归一化，$\log s_R$ 保留绝对尺度。共享 MLP 把它映成查询 $\mathbf t_j=\phi(\mathbf v_j)$。**不依赖关节名字**：左右对称的关节靠基座系锚点和 $\eta_j$ 区分。

### 4. 共享解码器（式 2–3）

PromptHMR 的冻结图像 + 相机编码器出 $32\times32$ 个图像 token。解码器输入 $[\mathbf e _ {\rm root},\mathbf e _ {\rm aux},\mathbf t_1,\dots,\mathbf t_n]$，四层 pre-norm Transformer（自注意力 + 对图像 token 的交叉注意力 + FFN），宽 256、8 头、约 4.55 M 参数。共享线性头给每个关节一个标量 $z_j$，按限位解码：$\hat q_j=\ell_j+(u_j-\ell_j)\,\sigma(z_j)$（无限位关节取 wrap）。

### 5. 相机系下的根部位姿（式 4）

深度用身高先验：$\hat z=\frac{f_x H_R}{S\rho}\exp(\mathrm{clip}(p_z,-3,3))$，即「机器人占 $S\rho$ 像素高时应在多远」，网络只学对数修正 $p_z$；横纵向从裁剪中心射线出发加 $p_x,p_y$。朝向用 6D 表示。$H_R$ 由零位几何包围盒乘一个按 G1 真实身高标定的公共系数得到。

### 6. 训练目标（式 5）

$\mathcal L=\mathcal L_q+\lambda _ {\rm FK}\mathcal L _ {\rm FK}+\lambda _ {\rm end}\mathcal L _ {\rm end}+\lambda _ {\rm root}(\mathcal L _ {\rm rot}+\|\hat{\mathbf t}-\mathbf t\|_1/\tau)$：关节角的 wrap L1、可微 FK 后的刚体位置误差、末端刚体的四元数朝向（管那些不改变末端原点的转动，比如手腕自转）、根部测地旋转误差和平移（$\tau=5$ m）。$\lambda _ {\rm FK}=1$、$\lambda _ {\rm end}=0.1$、$\lambda _ {\rm root}=0.5$；AdamW、学习率 $4\times10^{-4}$、批 48、20 个 epoch，每个设备的 mini-batch 按本体分组。

### 7. 世界坐标（式 6）

$\hat{\mathbf T} _ {W\leftarrow R,t}=\mathbf T _ {W\leftarrow C,t}\,\hat{\mathbf T} _ {C\leftarrow R,t}$。固定相机时 $\mathbf T _ {W\leftarrow C}$ 是常数；移动相机时把机器人遮掉，用 PromptHMR 的相机流程 + DROID-SLAM 估相机运动，度量深度给尺度。**姿态是逐帧解码的**，时间信息只用在检测器自训练和相机估计上。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph DATA["🎨 合成数据（只用于训练）"]
        AM["AMASS 人体动作"]
        GMR["GMR 重定向到 16 台人形<br/>0.60–1.78 m · 19–43 DoF"]
        UE["Unreal Engine 随机渲染<br/>场景 · 光照 · 视角 · 外观"]
        LAB["128,000 张图<br/>关节角 · 根部位姿 · 内参<br/>15 个 2D 关键点 · 包围框"]
        AM --> GMR --> UE --> LAB
    end

    subgraph DET["🔍 2D 检测器"]
        Y0["YOLO11-pose<br/>人体关键点权重初始化"]
        YS["合成数据微调 SynFT"]
        YST["网上无标注视频自训练 ×2 轮<br/>高置信锚点 + 插值补缺口"]
        Y0 --> YS --> YST
    end

    subgraph POSE["🦾 运动学条件的 3D 解码"]
        MJ["机器人 MJCF<br/>每个关节 27 维描述 v_j"]
        Q["共享 MLP → 关节查询 t_j"]
        ENC["冻结 PromptHMR 编码器<br/>32×32 图像 token"]
        DEC["共享解码器 4 层<br/>[root, aux, t_1…t_n]<br/>自注意力 + 交叉注意力"]
        OUT["q̂_j = ℓ_j + (u_j − ℓ_j)·σ(z_j)<br/>根部：6D 旋转 + 身高先验深度"]
        MJ --> Q --> DEC
        ENC --> DEC --> OUT
    end

    subgraph WORLD["🌍 世界坐标"]
        CAM["相机运动<br/>固定：常数 · 移动：遮掉机器人 + DROID-SLAM"]
        W["T_WR = T_WC · T̂_CR<br/>FK 摆出整台机器人"]
        CAM --> W
    end

    LAB --> YS
    LAB -->|"只用合成数据训练"| DEC
    VID["输入：任意 RGB 视频<br/>真机录像 · 网上视频 · AI 生成视频"] --> YST
    YST -->|"方形裁剪，机器人占 55% 图高"| ENC
    OUT --> W
    style DEC fill:#d8ecff,stroke:#3b7dd8
    style Q fill:#d8ecff,stroke:#3b7dd8
    style YST fill:#fde7c8,stroke:#d08a2c
</div>

> 读法：蓝色是论文的核心——关节查询从机器人描述生成，所以一个解码器服务所有本体；橙色的自训练只改检测器，3D 解码器从头到尾没见过真实标签。

---

## ⏱️ 推理时序图（按论文第 III 节整理；源码未放出）

<div class="mermaid">
sequenceDiagram
    participant V as 视频帧 I_t
    participant Y as YOLO11-pose（自训练后）
    participant E as PromptHMR 编码器（冻结）
    participant K as 关节描述 MLP φ
    participant D as 共享解码器
    participant S as 相机估计（DROID-SLAM）
    participant F as FK / 世界坐标
    Note over K: 每台机器人只做一次：读 MJCF，<br/>算出 n 个 27 维 v_j → 查询 t_j
    V->>Y: 整帧图像
    Y-->>V: 包围框 + 15 个关键点
    V->>E: 方形裁剪（ρ = 0.55）+ 裁剪内参
    E->>D: 32×32 图像 token X
    K->>D: [e_root, e_aux, t_1 … t_n]
    D->>D: 4 层：自注意力 → 交叉注意力(X) → FFN
    D-->>F: q̂_t（按限位 sigmoid 解码）
    D-->>F: T̂_CR,t（6D 旋转 + 身高先验深度 × exp(p_z)）
    alt 移动相机
        V->>S: 遮掉机器人后的整帧序列
        S-->>F: T_WC,t（度量深度给尺度）
    else 固定相机
        S-->>F: T_WC 为常数
    end
    F->>F: T̂_WR,t = T_WC,t · T̂_CR,t，再 FK 摆出整台机器人
</div>

---

## 🚶 具体实例

### 例 1：身高先验给出的深度

G1 标称身高 $H_R=1.32$ m，参考裁剪 $S=480$ 像素、$\rho=0.55$，设裁剪像素下焦距 $f_x=600$（假设值）：$\hat z=\frac{600\times1.32}{480\times0.55}=\frac{792}{264}=3.0$ m。也就是说，机器人恰好占裁剪图 55% 高时，先验认为它在 3 米外。若机器人蹲下、在图里显得矮，网络就输出 $p_z>0$ 往远处修：$p_z=0.1$ 时 $\hat z=3.0\times e^{0.1}=3.32$ m。这就是论文说「按身高固定缩放不够、要学依赖图像的修正」的原因（表 II）。

### 例 2：按限位解码关节角

G1 膝关节限位约 $[-0.087,\,2.880]$ rad。$z_j=0$ 时 $\sigma=0.5$，$\hat q=-0.087+2.967\times0.5=1.396$ rad（范围正中）；$z_j=1$ 时 $\sigma=0.731$，$\hat q=2.082$ rad。不管网络输出多离谱，预测永远落在关节限位里——这是直接预测机器人坐标比「估人体再重定向」多出的一个好处。

### 例 3：「比最强基线低 18–32%」怎么算

真机 MPJAE（表 I）：G1 上最强基线是 PromptHMR + GMR + SynFT 的 10.46°，本文 7.10°，降 32.1%；PM01 最强是关键点拟合 6.99°，本文 5.65°，降 19.2%；N1 最强是 RoboPEPP 10.52°，本文 8.62°，降 18.1%。注意三台机器人上「最强基线」各不相同。

---

## 📊 关键结果

**表 I（MPJAE °）**

| 方法 | 合成 16 台平均 | 真机 G1 | 真机 PM01 | 真机 N1 |
|---|---|---|---|---|
| 关键点拟合 | 21.21 | 10.52 | 6.99 | 14.70 |
| PromptHMR + GMR | 18.03 | 12.50 | 16.11 | 19.57 |
| PromptHMR + GMR + SynFT | 16.82 | 10.46 | 16.45 | 15.42 |
| HoRoPose | 15.09 | 12.98 | 15.36 | 13.72 |
| RoboPEPP | 14.49 | 10.72 | 13.96 | 10.52 |
| **HumanoidPose** | **9.48** | **7.10** | **5.65** | **8.62** |

- **合成**：比 RoboPEPP 低 35%；MPJPE 4.49 cm（次好 7.98）。
- **G1 根部轨迹**（表 II，手机拍摄、动捕真值，刚体对齐不缩放）：RMSE 23.4 cm，按身高缩放的 PromptHMR 39.0 cm，关键点拟合 42.2 cm。
- **消融**（表 III，真机 MPJAE）：完整 7.09°；去掉关节身份（基座系锚点 / 轴 / 左右侧）7.15°；不直接解码（换成 PromptHMR + GMR）12.12°，退化最大；每台机器人学固定嵌入代替描述查询 7.62°；编码器换 DINOv2 7.95°。
- **没见过的本体**（第 IV-D 节）：训练时留出 G1 或 PM01，只给 MJCF 生成查询，真机 MPJAE 11.27° / 11.44°，根部误差中位数 8–16 cm；再用少量合成 G1 图微调，误差随样本数下降（图 5）。
- **自训练**（表 IV）：合成微调让 G1 / PM01 的真机检测覆盖率掉到 81% / 76%（过拟合渲染外观），自训练后回到 98.8% / 96.8%，三台的 MPJAE 也都最低。

---

## 💡 核心贡献

1. **定义 visual proprioception**：只从外部视频恢复人形全身关节角与世界坐标运动，不用机载状态。
2. **运动学条件的统一模型**：关节查询由机器人描述生成，一个解码器、一个预测头覆盖 16 种人形，新机器人只需给 MJCF。
3. **全合成监督 + 自训练检测器**：128,000 张带精确关节角的渲染图，3D 部分零真实标签迁移到三台真机。
4. **三台真机评测**：关节角、关节位置和 G1 根部轨迹都优于构造的基线。

---

## 🤖 对人形机器人领域的意义

- **把网上和生成的机器人视频变成动作数据**：机器人学习要的是关节轨迹，而宣传片、社交媒体视频、视频生成模型的输出都没有。和 [UH-1](../../03_High_Impact_Selection/UH-1_Learning_from_Massive_Human_Videos_for_Universal_Humanoid_Pose_Control/UH-1_Learning_from_Massive_Human_Videos_for_Universal_Humanoid_Pose_Control.html) 那种「人类视频 → 重定向」的路线互补：这里直接读机器人自己的视频，不经过人体中间表示。
- **多机交互里的「看懂别的机器人」**：协作、对抗、交接时拿不到对方状态，视觉就是唯一来源。
- **跨本体的设计值得借鉴**：「每个关节一个由几何描述生成的 token」和跨本体控制（MetaMorph、URMA）一脉相承，这里用在感知侧，并用消融说明几何描述比学固定嵌入好。
- **和本板块其他笔记的区别**：[PRIMO](../PRIMO__Prior-Informed_Odometry_from_Human-Motion_Tracking_for_Humanoid_Robots/PRIMO__Prior-Informed_Odometry_from_Human-Motion_Tracking_for_Humanoid_Robots.html)、[InEKF](../Contact-Aided_Invariant_EKF_for_Legged_Robots/Contact-Aided_Invariant_EKF_for_Legged_Robots.html) 是机器人用自己的 IMU / 编码器估自己；本文是外部观察者用相机估别人。
- **局限**（论文第 V 节 + 我们读出的）：只评测单机器人画面，多机互相遮挡、身份保持没做；姿态逐帧解码、没有时间平滑，抖动没报告（我们的推测）；根部深度依赖标称身高，换了身材或戴了外壳的机器人需要准确的 $H_R$；下游的动作预测、模仿学习用这些估计效果如何还没验证。

---

## 🎤 面试参考

1. **为什么不先估人体 SMPL-X 再 GMR 重定向？** 人和机器人关节不一一对应，重定向会放大估计误差；消融里这条路线真机 MPJAE 12.12°，比直接解码的 7.09° 差得最多。
2. **关节查询为什么不用关节名或每台机器人一套嵌入？** 名字在不同厂商间不统一；固定嵌入无法泛化到没见过的本体。几何描述（轴、锚点、限位、树深度、左右侧）对任何 MJCF 都能算出来。
3. **左右对称的关节怎么区分？** 局部几何几乎一样，靠基座系下的静止锚点 $\bar{\mathbf c}_j$、轴 $\bar{\mathbf a}_j$ 和侧向符号 $\eta_j$；去掉它们误差上升，合成数据上更明显。
4. **为什么要 $\mathcal L _ {\rm FK}$ 和 $\mathcal L _ {\rm end}$？** 关节角 L1 对每个关节一视同仁，而髋的小误差会让脚偏很远；FK 损失按刚体位置加权。末端自转不改变末端原点，FK 位置损失看不到，所以再加末端朝向项。
5. **单目怎么拿到度量深度？** 用已知身高做针孔先验，网络只学有界的对数修正，保证深度为正、初值合理。

---

## 🔗 相关阅读

- [GMR: Retargeting Matters](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html)——合成数据的重定向工具，也是基线的一部分
- [Domain Randomization](../../01_Foundational_RL/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World.html)——随机化渲染迁移到真实图像
- [UH-1: Learning from Massive Human Videos](../../03_High_Impact_Selection/UH-1_Learning_from_Massive_Human_Videos_for_Universal_Humanoid_Pose_Control/UH-1_Learning_from_Massive_Human_Videos_for_Universal_Humanoid_Pose_Control.html)——从人类视频学人形姿态的另一条路线
- [PRIMO](../PRIMO__Prior-Informed_Odometry_from_Human-Motion_Tracking_for_Humanoid_Robots/PRIMO__Prior-Informed_Odometry_from_Human-Motion_Tracking_for_Humanoid_Robots.html)——同样用 AMASS 人体动作造训练数据，但估的是机载本体里程计
- PromptHMR（[arXiv 2504.06397](https://arxiv.org/abs/2504.06397)）、RoboPEPP（[arXiv 2411.17662](https://arxiv.org/abs/2411.17662)）——编码器来源与最强的机械臂位姿基线
