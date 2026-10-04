---
layout: paper
title: "DexUMI: Using Human Hand as the Universal Manipulation Interface for Dexterous Manipulation"
zhname: "DexUMI：以人手作为灵巧操作的通用操作接口"
category: "Manipulation"
---

# DexUMI: Using Human Hand as the Universal Manipulation Interface for Dexterous Manipulation
**把 UMI「手持夹爪采数据」的思路搬到多指灵巧手：为每款目标机器人手优化一副可穿戴外骨骼（硬件适配，抹平运动学差距），再用 SAM2 分割 + ProPainter 补背景 + 真手回放合成把视频里的人手换成机器人手（软件适配，抹平视觉差距），不用机器人就能采到可直接训练扩散策略的灵巧操作数据**

> 📅 阅读日期: 2026-09-30
>
> 🏷️ 板块: Manipulation · 灵巧手 · 可穿戴外骨骼 · 无机器人数据采集 · 视频修补 · 扩散策略
>
> 🔁 推进轨: 模块轮转（05_Locomotion → **06_Manipulation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2505.21864](https://arxiv.org/abs/2505.21864) |
| HTML | [在线阅读](https://arxiv.org/html/2505.21864v3) |
| PDF | [下载](https://arxiv.org/pdf/2505.21864) |
| 项目主页 | [dex-umi.github.io](https://dex-umi.github.io/) |
| 源码 | 🌟 [real-stanford/DexUMI](https://github.com/real-stanford/DexUMI)（采集 / 数据生成 / 训练 / 部署 / 外骨骼连杆优化全流程） |
| 数据 | [umi-data.github.io](https://umi-data.github.io/) |
| **发布时间** | 2025-05-28 (v1) |

**作者**：Mengda Xu\*、Han Zhang\*、Yifan Hou、Zhenjia Xu、Linxi Fan、Manuela Veloso、Shuran Song（\* 共同一作）

**机构**：Stanford University、Columbia University、J.P. Morgan AI Research、CMU、NVIDIA

**会议**：CoRL 2025（Best Paper Finalist）

**机器人 / 平台**：UR5 机械臂 + 两款灵巧手——**Inspire Hand**（12 DoF，6 主动，欠驱动）与 **XHand**（12 DoF 全驱动）

---

## 🎯 一句话总结

人手本身就是最好的灵巧操作接口，难点在于人手和机器人手之间的「具身差距」。DexUMI 把这道差距拆成两半分别处理：**动作侧**用一副为目标机器人手量身优化的外骨骼，让人戴着它操作时指尖轨迹天然落在机器人手的可达空间里，关节编码器直接读出可执行的关节动作；**观测侧**把演示视频里的人手 + 外骨骼抠掉、补背景，再把「同一组关节动作在真机器人手上回放」拍下来的手贴回去，得到仿佛机器人手亲自采的视频。在两款灵巧手、四个真实任务上平均成功率 **86%**，采数效率是遥操作的 **3.2 倍**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| UMI | Universal Manipulation Interface | 前作：手持夹爪 + GoPro 无机器人采数据，DexUMI 把它推广到多指手 |
| DoF | Degrees of Freedom | 自由度 |
| SAM2 | Segment Anything Model 2 | Meta 的视频分割模型，用来抠出外骨骼 / 机器人手 |
| ProPainter | — | 基于光流的视频修补（inpainting）模型，填回被抠掉的背景 |
| ARKit | — | iPhone 的 AR 位姿追踪，用于记录 6DoF 手腕位姿 |
| FSR | Force Sensitive Resistor | 力敏电阻，Inspire Hand 上自装的低成本触觉传感器 |
| DP | Diffusion Policy | 扩散策略，DexUMI 的下游模仿学习策略 |
| DINOv2 | — | 自监督视觉 ViT，作为图像编码器（训练时不冻结） |
| FK | Forward Kinematics | 正运动学 |

---

## ❓ 论文要解决什么问题？

- **遥操作做灵巧手很别扭**：空间观测错位、没有直接触觉反馈，操作员很难做精细的多指接触；而且必须有真机在场。
- **重定向（retargeting）不准**：用视觉追踪人手指尖再映射到机器人手，受限于形态差异（尤其拇指），精度不够。
- **人手视频缺动作标签、外观又不同**：直接学人手视频需要额外的机器人数据或仿真特权信息。
- **灵巧手型号五花八门**：自由度、驱动方式、尺寸各不相同，方案必须能覆盖不同硬件。

DexUMI 的问题是：**怎么把具身差距压到最小，让人手成为各种机器人手的「通用操作接口」？**

---

## 🔧 方法拆解

### 1. 硬件适配：为每款机器人手优化一副外骨骼（抹平动作差距）
- **两个目标**：① 外骨骼与机器人手共享同一「关节 → 指尖位姿」映射（含关节限位），动作才能直接迁移；② 人能舒服地戴着用。
- **设计初始化**：从机器人手 URDF 参数化；像 Inspire Hand 这种内部连杆未公开的，用同自由度的通用四连杆替代，再用动捕到的指尖轨迹反推参数。
- **双层优化目标**：最大化外骨骼与机器人手**指尖工作空间**（SE(3) 中所有可达指尖位姿集合）的相似度，采样实现为两项：外骨骼要**覆盖**机器人手的每个采样位姿，同时外骨骼的位姿要**落在**机器人手的工作空间之内（不产生机器人够不到的动作）。
- **可穿戴性写成约束**：例如把外骨骼拇指摆动关节沿 x 轴往手腕方向挪，避免与人拇指旋前/旋后动作打架——指尖映射保持不变，只改不易接触物体的中间连杆。

### 2. 传感器集成（外骨骼与机器人手读到「同一种信号」）
| 信号 | 实现 | 要点 |
|---|---|---|
| 关节动作 | 每个主动关节装 Alps 电阻式编码器 | 摩擦 / 背隙导致非线性，每个关节训一个小回归模型映射到电机值 |
| 手腕位姿 | iPhone ARKit（Record3D） | 只在采集时需要，部署时用 UR5 读数 |
| 视觉 | 腕下 150° 广角 OAK-1 相机 | 外骨骼和机器人手上**相机相对手腕的位姿完全相同** |
| 触觉 | 与目标手同型号传感器 | XHand 用自带电磁式触觉阵列；Inspire 两边都装 FSR |

### 3. 软件适配：把视频里的人手换成机器人手（抹平视觉差距）
1. **分割**：SAM2 抠出人手 + 外骨骼（操作员每次用同一起始手势，固定 prompt 点；戴绿手套、外骨骼用绿色 PLA-CF 打印，分割更稳）。
2. **补背景**：ProPainter 光流修补被抠掉的区域。
3. **回放拍真手**：把录下的关节动作在真机器人手上回放（不需要机械臂），再用 SAM2 抠出机器人手。
4. **遮挡感知合成**：外骨骼掩码 ∩ 机器人手掩码 = 「可见部分」，只在这部分贴机器人手像素，保留手被物体挡住的自然遮挡关系。

### 4. 模仿学习策略
- 输入：合成后的腕部图像（DINOv2 CLS token，训练时一起更新）+ 触觉读数。
- 输出：扩散策略一次预测 **16 步**动作块 = 6DoF 末端**相对**动作 + N 维手部动作（Inspire 6 / XHand 12）。
- 时间对齐：用滚动二维码测相机 / iPhone 延迟，用「外骨骼图 vs 机器人手回放图」叠加对齐编码器延迟，再插值到相机时间戳、3 倍下采样。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph HW["🦾 硬件适配：外骨骼（动作侧）"]
        U["机器人手 URDF / 动捕指尖轨迹"] --> OPT["双层优化<br/>指尖工作空间相似度<br/>+ 可穿戴性约束"]
        OPT --> EXO["3D 打印外骨骼<br/>编码器 + 腕下相机 + 触觉 + iPhone"]
    end

    DEMO["👋 人戴外骨骼直接操作<br/>有真实触觉反馈 · 无需机器人"]
    EXO --> DEMO

    DEMO --> ACT["关节编码器 → 回归映射 → 机器人手电机值<br/>ARKit → 6DoF 手腕位姿"]
    DEMO --> VID["腕下相机视频<br/>（画面里是人手 + 外骨骼）"]

    subgraph SW["🎨 软件适配：视频换手（观测侧）"]
        S1["SAM2 分割外骨骼"] --> S2["ProPainter 修补背景"]
        R1["关节动作在真机器人手上回放<br/>SAM2 抠出机器人手"] --> S3
        S2 --> S3["遮挡感知合成<br/>只贴 外骨骼∩机器人手 的可见像素"]
    end

    VID --> S1
    ACT --> R1

    S3 --> DS["机器人视角数据集<br/>图像 + 触觉 + 相对动作"]
    ACT --> DS
    DS --> DP["扩散策略<br/>DINOv2 + 触觉 → 16 步动作块"]
    DP --> DEP["🤖 UR5 + Inspire / XHand 真机部署<br/>4 任务平均成功率 86%"]

    style HW fill:#e8f4fd,stroke:#1f78b4
    style SW fill:#f3e8fd,stroke:#8e44ad
    style DEMO fill:#fff7e0,stroke:#d4a017
    style DEP fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💻 源码运行时序图（mermaid）

对应官方仓库 `real-stanford/DexUMI` 的 README 流程：`record_exoskeleton.py` 采集 → `process.sh`（`0_interpolation.py` + `1_replay_hand.py`）→ `render_all_dataset.py`（按 GPU 分片调 `render_dataset.py`，依次跑 `2_to_jpg` / `3_segment` / `4_inpaint_exo` / `5_compose_video`）→ `6_generate_dataset.py` → `train_diffusion_policy.py` → `open_server.py` + `eval_xhand.py`。

<div class="mermaid">
sequenceDiagram
    autonumber
    actor Op as 操作员（戴外骨骼）
    participant Rec as record_exoskeleton.py
    participant Proc as process.sh<br/>0_interpolation / 1_replay_hand
    participant Hand as 真机器人手<br/>(ExoXhandSDK / Inspire)
    participant Rend as render_all_dataset.py<br/>→ render_dataset.py
    participant Gen as 6_generate_dataset.py
    participant Train as train_diffusion_policy.py
    participant Srv as open_server.py<br/>(CameraServer / DexServer / UR5Server)
    participant Eval as eval_xhand.py<br/>(RealPolicy)

    Op->>Rec: 操作物体（45 / 30 FPS）
    Rec-->>Rec: 记录 camera_0 视频 + numeric（编码器 / iPhone 位姿 / FSR）及接收时间戳
    Proc->>Proc: 0_interpolation：按传感器延迟对齐并插值到相机时间戳，3× 下采样
    Proc->>Hand: 1_replay_hand：回放 joint_angles → hand_motor_value
    Hand-->>Proc: dex_camera_0.mp4（仅机器人手画面）
    Rend->>Rend: 按可用 GPU 切分 episode，子进程并行
    Rend->>Rend: 2_to_jpg → 3_segment（SAM2：exo / dex 掩码）
    Rend->>Rend: 4_inpaint_exo（ProPainter 补背景）
    Rend->>Rend: 5_compose_video（可见掩码合成 combined.mp4）
    Gen->>Gen: 打包 camera_0 / fsr / hand_action / pose / proprioception（zarr）
    Train->>Train: accelerate 训练：DINOv2 CLS ⊕ FSR → 扩散去噪 16 步动作
    Srv->>Srv: 启动相机 / 灵巧手 / UR5 服务
    loop 每个推理周期（FrameRateContext）
        Eval->>Srv: 取最新腕部相机帧 + 触觉（FSR 二值化 cutoff）
        Eval->>Eval: RealPolicy.predict_action：随机噪声 → DDIM/DDPM 去噪 → 反归一化
        Eval->>Eval: 相对位姿 × 推理时刻的末端位姿（按时间戳插值）→ 基座系目标
        Eval->>Srv: 丢弃已过期的动作，schedule_waypoint 下发 UR5 与手部航点
    end
</div>

---

## 💡 核心贡献

1. **人手 = 通用灵巧操作接口**：用「可穿戴外骨骼 + 视频换手」两层适配，把人手演示直接变成机器人手可用的训练数据，全程不需要机器人在场。
2. **外骨骼的机构优化框架**：以指尖工作空间相似度为目标、可穿戴性为约束，能处理欠驱动（Inspire）与全驱动（XHand）两类手；连杆结构未知时还能用动捕反推等效四连杆。
3. **遮挡感知的机器人手修补管线**：全部用现成预训练模型（SAM2 + ProPainter）+ 真手回放，不需要额外训练生成模型。
4. **动作表示与触觉的实证**：相对手指轨迹明显优于绝对位置，且只有相对轨迹才能从噪声大的触觉里获益。

---

## 📊 关键结果

**阶段累计成功率（每任务 20 次，Rel + 触觉 + Inpaint 为完整方法）**

| 配置（手指动作 / 触觉 / 视觉） | Cube | Carton | Tea(IH) 叶 | Tea(XH) 叶 | Kitchen 撒盐 |
|---|:-:|:-:|:-:|:-:|:-:|
| **Rel / 有 / Inpaint** | **1.00** | 0.85 | 0.85 | 0.85 | **0.75** |
| Abs / 有 / Inpaint | 0.10 | 0.35 | 0.00 | 0.25 | 0.00 |
| Rel / 无 / Inpaint | 0.95 | 0.90 | 0.90 | 0.80 | 0.15 |
| Abs / 无 / Inpaint | 0.90 | 0.85 | 0.60 | 0.75 | 0.00 |
| Rel / 无 / Mask | 0.60 | 0.10 | 0.50 | — | — |
| Rel / 无 / Raw | 0.20 | 0.05 | 0.05 | — | — |

- **视觉换手是刚需**：不做修补、直接喂带外骨骼的原图（Raw），Carton 从 0.90 掉到 0.05；绿色掩码（Mask）也只到 0.10。
- **相对动作更鲁棒**：相对轨迹会「持续累加直到关键事件发生」（如手指碰到才合拢），绝对动作学的是静态映射，映射一有误差就卡住。
- **触觉只在力信号干净时有用**：撒盐任务里相机被碗挡住、而手指插入盐时触觉读数又大又清楚，触觉把成功率从 0.15 拉到 0.75；夹镊子几乎不产生触觉读数，就没帮助。
- **采数效率**：15 分钟内成功演示数是遥操作的 **3.2 倍**（仍慢于徒手）。
- **数据量**：Cube 310 条、Carton 175 条、Tea 400 条、Kitchen 370 + 100 条（关旋钮）。

---

## ⚠️ 局限

- **一款手一副外骨骼**：可穿戴性仍需针对硬件手调，未来希望全自动化或用生成模型加速设计。
- **只匹配指尖**：手掌等其他可能的接触面尚未建模。
- **触觉传感器不可靠**：FSR 对安装方式敏感；XHand 电磁触觉在人手施加的高压下会漂移。
- **3D 打印材料 / 编码器精度**：部分精细动作编码器捕捉不准，手指有时无法完全伸直。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **灵巧手数据规模化** | 不依赖真机的采集方式，是给人形机器人双手攒大规模真实灵巧数据的一条现实路线 |
| **具身差距的拆解** | 「动作差距靠硬件、观测差距靠软件」的拆法，可迁移到其他人→机器人数据管线（如 HumDex、EgoMimic 一类） |
| **动作表示选择** | 相对手指轨迹 + 触觉的组合结论，对人形双手扩散策略 / VLA 的动作空间设计有直接参考价值 |

---

## 🎤 面试参考

**Q：DexUMI 和 UMI 的关系？**
A：UMI 用手持平行夹爪 + GoPro 在无机器人条件下采数据，但只适用于简单夹爪。DexUMI 把同样的「无机器人采集 + 腕部相机」思路推广到多指灵巧手，新增了两件事：为每款手优化的外骨骼（保证动作可执行）和视频换手管线（保证观测一致）。

**Q：外骨骼优化的目标函数在优化什么？**
A：指尖工作空间的相似度。采样机器人手配置，要求外骨骼能找到一个配置让指尖位姿接近它（覆盖）；同时采样外骨骼配置，要求它的指尖位姿也落在机器人手能到的范围（不越界）。可穿戴性写成设计参数的上下界约束，比如把拇指关节往手腕方向挪。

**Q：为什么合成时要取外骨骼掩码和机器人手掩码的交集？**
A：机器人手不是总在画面最上层——物体可能挡住手指。外骨骼掩码反映的是「这次演示中手真实可见的区域」，机器人手掩码是「回放时手占的区域」，两者因为运动学和腕部相机位姿一致而高度重合，取交集就只在真正可见的地方贴机器人手，保留了遮挡关系。

**Q：为什么相对手指动作比绝对动作好这么多？**
A：一是分布更简单、更好学；二是相对动作天然具备反应性，增量会一直累加直到接触等关键事件发生；绝对动作是静态映射，编码器回归或硬件误差会让它停在错误位置。

---

## 🔗 相关阅读

- [UMI: Universal Manipulation Interface (2402.10329)](https://arxiv.org/abs/2402.10329)：DexUMI 的直接前作，手持夹爪无机器人采集
- [DexCap (2403.07788)](https://arxiv.org/abs/2403.07788)：动捕手套采灵巧数据，仍依赖重定向与真机数据
- [HumDex: Humanoid Dexterous Manipulation Made Easy](../HumDex_Humanoid_Dexterous_Manipulation_Made_Easy/HumDex_Humanoid_Dexterous_Manipulation_Made_Easy.html)：人形灵巧操作的人手数据路线
- [ActiveUMI](../ActiveUMI__Robotic_Manipulation_with_Active_Perception_from_Robot-Free_Human_Demonstrations/ActiveUMI__Robotic_Manipulation_with_Active_Perception_from_Robot-Free_Human_Demonstrations.html)：UMI 家族的主动感知扩展
- [Diffusion Policy](../../01_Foundational_RL/Diffusion_Policy/Diffusion_Policy.html)：DexUMI 下游使用的策略类别
