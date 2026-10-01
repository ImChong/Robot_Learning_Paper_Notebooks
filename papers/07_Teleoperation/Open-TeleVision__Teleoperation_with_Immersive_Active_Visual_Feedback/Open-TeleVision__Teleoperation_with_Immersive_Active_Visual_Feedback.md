---
layout: paper
title: "Open-TeleVision: Teleoperation with Immersive Active Visual Feedback"
zhname: "Open-TeleVision：带沉浸式主动视觉反馈的遥操作系统"
category: "Teleoperation"
arxiv: "2407.01512"
---

# Open-TeleVision: Teleoperation with Immersive Active Visual Feedback
**给人形机器人装一个跟着操作员头部转动的立体相机云台，把双目画面实时推到 Vision Pro 里，同时用 IK + dex-retargeting 把操作员的手腕与手指镜像到机器人双臂双手上：操作员「看到机器人看到的」，采到的演示带着主动转头这一维，直接拿来训练改版 ACT（DINOv2 + 双目输入）**

> 📅 阅读日期: 2026-10-01
>
> 🏷️ 板块: 07 Teleoperation · VR 遥操作 · 主动视觉 · 双目立体 · 灵巧手重定向 · 模仿学习数据采集
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2407.01512](https://arxiv.org/abs/2407.01512) |
| HTML | [arXiv HTML](https://arxiv.org/html/2407.01512v2) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2407.01512) |
| 项目主页 | [robot-tv.github.io](https://robot-tv.github.io/) |
| 源码 | 🌟 [OpenTeleVision/TeleVision](https://github.com/OpenTeleVision/TeleVision)（Vuer 流媒体服务 + 手部重定向 + 主动相机 + ACT 训练 / 部署脚本） |
| 数据 | [Google Drive 演示数据集](https://drive.google.com/drive/folders/11WO96mUMjmxRo9Hpvm4ADz7THuuGNEMY?usp=sharing) |
| **发布时间** | 2024-07-01（v1） |
| 会议 | CoRL 2024 |
| 机构 | UC San Diego、MIT |
| 作者 | Xuxin Cheng\*、Jialong Li\*、Shiqi Yang、Ge Yang、Xiaolong Wang（\* 共同一作） |
| 平台 | Unitree H1 + Inspire 六自由度灵巧手 + 自制 2-DoF 云台；Fourier GR-1 + 平行夹爪 + 原厂 3-DoF 颈部；ZED Mini 双目相机；Apple Vision Pro |

---

## 🎯 一句话总结

遥操作系统一半是「执行」（怎么把人的动作传给机器人），一半是「感知」（操作员怎么看到现场），以往工作大多卷执行。Open-TeleVision 反过来在感知上下功夫：机器人头上装一个**随操作员头部转动的双目相机**，把 480×640 / 眼的立体画面推回 VR 头显，整个回路跑在 **60 Hz**；手臂用 CLIK 逆运动学跟踪手腕，手指用 dex-retargeting 的向量优化映射。用它采的数据训练改版 ACT，H1 / GR-1 四个长时序精细任务上大多达到 87%–100% 的分段成功率；用户实验里双目比单目平均快约 1/3、成功率更高；还能从波士顿跨约 3000 英里遥控圣地亚哥的机器人。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VR | Virtual Reality | 本文用 Apple Vision Pro（也支持 Meta Quest 3） |
| Vuer | — | 基于 WebXR 的 3D 可视化 / 流媒体 Web 框架，作为遥操作服务端 |
| PoI | Point of Interest | 任务中需要盯住的关键位置（料箱、抓取点、放置点等） |
| CLIK | Closed-Loop Inverse Kinematics | 闭环逆运动学，基于 Pinocchio 求手臂关节角 |
| SLSQP | Sequential Least-Squares Quadratic Programming | 序列最小二乘二次规划，dex-retargeting 的求解器 |
| ACT | Action Chunking with Transformers | ALOHA 提出的动作分块 Transformer 模仿学习策略 |
| DINOv2 | — | 自监督预训练 ViT，替换 ACT 原来的 ResNet18 视觉骨干 |
| SE(3) | Special Euclidean group | 三维刚体位姿（旋转 + 平移） |

---

## ❓ 论文要解决什么问题？

- **关节复制（ALOHA 式）精度高，但必须同处一地**，每种机器人要配一套专用主手，而且还驱动不了多指灵巧手。
- **感知是被忽视的一半**：操作员直接用肉眼看（第三人称）会被机械臂 / 躯干挡住；看一路固定 RGB 视频又丢了深度。远程操作和立体深度在以往系统里不可兼得。
- **固定广角相机不够用**：一台静态相机很难同时覆盖所有关键点（PoI），要么多装相机、要么每个任务调相机位；画面里还有大量无关像素，拖慢训练和推理。
- **采到的数据要直接可学**：操作员看到的画面就应该是策略的输入，这样「人在哪看」本身也被记录下来。

---

## 🔧 方法拆解

### 1. 系统总体：Vuer Web 服务 + 60 Hz 闭环
- VR 头显把操作员的**头、手腕、手部关键点**（SE(3) 位姿）流给服务端；服务端做人→机器人重定向，下发关节位置目标；机器人把**双目画面（每眼 480×640）**流回头显。
- 与 VR 设备型号无关，论文用 Apple Vision Pro；局域网用自签证书走 WebXR，跨网用 ngrok 隧道。

### 2. 主动视觉（本文核心）
| 机器人 | 颈部 | 相机 |
|---|---|---|
| Unitree H1 | 自制 3D 打印云台，2 个 DYNAMIXEL XL330 电机（偏航 + 俯仰） | ZED Mini 双目 |
| Fourier GR-1 | 原厂 3-DoF 颈部（偏航 / 横滚 / 俯仰） | ZED Mini 双目 |

- 操作员转头 → 头部旋转换算成欧拉角 → 云台跟着转；视线始终落在画面中央（人用中央凹视觉对焦，盯画面边缘会不适）。
- 对策略学习的好处：相机只看「正在干活的地方」，画面可以裁剪下采样，图像 token 少、算得快。

### 3. 手臂控制
- **位置相对头、姿态取绝对**：机器人末端相对机器人头的位置 = 人手腕相对人头的位置；末端朝向直接对齐人手腕的绝对朝向。这样机器人转头时手不会乱晃。
- Pinocchio 的 **CLIK** 求 7-DoF 手臂关节角；输入位姿先过 SE(3) 插值滤波；接近可操作度极限时加一个投影到雅可比**零空间**的关节偏置，避免 IK 失败又不影响末端跟踪。

### 4. 手部控制：dex-retargeting 向量优化

$$\min _ {q_t}\sum _ {i=0}^{N}\big\|\alpha\, v_t^i - f_i(q_t)\big\|^2 + \beta\,\|q_t - q _ {t-1}\|^2$$

- $v_t^i$ 是人手第 $i$ 个关键向量，$f_i(q_t)$ 是机器人手正运动学算出的对应向量，$\alpha$ 补偿手的尺寸差（Inspire 手取 1.1），$\beta$ 项保证帧间平滑；用 NLopt 的 SLSQP 实时求解。
- 灵巧手用 **7 个向量**：手腕→五指尖 5 个 + 拇指尖→食指尖 / 中指尖 2 个（提高捏取精度）；夹爪只用 **1 个向量**（拇指尖→食指尖控制开合）。

### 5. 模仿学习：改版 ACT
- 视觉骨干 ResNet18 → **DINOv2**；输入从 ALOHA 的 4 路相机改成**双目 2 路**，每张图 16×22 个 token，加一个本体关节位置 token。
- 动作空间是**绝对关节位置**：H1 为 28 维（双臂 7×2 + 双手 6×2 + 颈部 2），GR-1 为 19 维（7×2 + 夹爪 1×2 + 颈部 3）——**颈部也是策略的输出**，策略学会了主动转头。
- 动作块长度 60（60 Hz 下约 1 s 记忆），Can Insertion 用 100；每任务仅 10–20 条演示，单张 RTX 4090 训练。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph OP["🥽 操作员端（Apple Vision Pro / Quest 3）"]
        H["头部位姿"]
        W["左右手腕 SE(3)"]
        K["手部关键点 25×2"]
        D["双目立体显示"]
    end

    subgraph SRV["🖥️ 服务端（Vuer Web 服务 · 60 Hz）"]
        PRE["坐标系变换<br/>Y-up → Z-up · 手腕相对头"]
        NECK["头部旋转 → 偏航 / 俯仰角"]
        IK["CLIK 逆运动学（Pinocchio）<br/>SE(3) 滤波 + 零空间偏置"]
        RT["dex-retargeting 向量优化<br/>SLSQP · α=1.1 · 帧间平滑 β"]
    end

    subgraph ROBOT["🤖 机器人端（H1 / GR-1）"]
        CAM["主动颈部 + ZED Mini<br/>双目 480×640 / 眼"]
        ARM["双臂 7-DoF ×2"]
        HAND["Inspire 手 6-DoF ×2<br/>或夹爪 1-DoF ×2"]
    end

    H --> PRE
    W --> PRE
    K --> PRE
    PRE --> NECK --> CAM
    PRE --> IK --> ARM
    PRE --> RT --> HAND
    CAM -- "立体视频回传" --> D

    CAM --> DATA["📼 演示数据<br/>双目图像 + 关节状态 + 关节动作（含颈部）"]
    ARM --> DATA
    HAND --> DATA
    DATA --> ACT["改版 ACT<br/>DINOv2 双目 token + 本体 token<br/>→ 60 步动作块"]
    ACT --> AUTO["🎯 自主执行<br/>分拣 / 插罐 / 叠毛巾 / 取管传递"]

    style OP fill:#fff7e0,stroke:#d4a017
    style SRV fill:#e8f4fd,stroke:#1f78b4
    style ROBOT fill:#f3e8fd,stroke:#8e44ad
    style AUTO fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💻 源码运行时序图（mermaid）

对应官方仓库 `OpenTeleVision/TeleVision`：`teleop/TeleVision.py` 的 `OpenTeleVision` 在子进程里起 Vuer 服务，`on_hand_move` / `on_cam_move` 回调把手与头的矩阵写进共享内存，`main_image` 不断把共享内存里的双目图作为 `ImageBackground` 推给头显；`teleop_active_cam.py` 演示真机主动相机（ZED 取图 + `DynamixelAgent` 转云台），`teleop_hand.py` 演示 Isaac Gym 里的双手遥操作（`VuerPreprocessor.process` → `RetargetingConfig.retarget`）；数据侧 `scripts/post_process.py` 按时间戳对齐 `.svo` 视频与 `.hdf5` 关节记录，`act/imitate_episodes.py` 训练并导出 TorchScript，`scripts/deploy_sim.py` 用时间聚合 `merge_act` 回放策略。

<div class="mermaid">
sequenceDiagram
    autonumber
    actor Op as 操作员（Vision Pro）
    participant TV as OpenTeleVision<br/>(Vuer 子进程)
    participant SHM as 共享内存<br/>(双目图 / 头手矩阵)
    participant Main as teleop_active_cam.py<br/>/ teleop_hand.py 主循环
    participant Pre as VuerPreprocessor
    participant Ret as dex-retargeting<br/>(inspire_hand.yml)
    participant Rob as ZED Mini + DynamixelAgent<br/>/ Isaac Gym 双手

    Op->>TV: 打开 https://IP:8012 → Enter VR
    loop 每帧（约 60 Hz）
        Op-->>TV: HAND_MOVE / CAMERA_MOVE 事件
        TV->>SHM: on_hand_move / on_cam_move 写入 left/right_hand、landmarks、head_matrix
        Main->>Pre: process(tv)
        Pre->>SHM: 读头 / 手腕 / 关键点
        Pre-->>Main: Y-up→Z-up 换基，手腕相对头，指尖相对手腕
        Main->>Ret: retarget(指尖关键点)
        Ret-->>Main: 左右手 12 维关节角（重排为 Inspire 顺序）
        Main->>Rob: 头部欧拉角 → command_joint_state(偏航, 俯仰)
        Main->>Rob: 手腕位姿 + 手指关节 → 机器人 / 仿真
        Rob-->>Main: ZED grab() 左右目 → hstack → RGB
        Main->>SHM: np.copyto(img_array)
        TV->>Op: main_image：ImageBackground 双目画面（左右眼分层）
    end

    Note over Main,Rob: 采集结束：.svo 双目视频 + .hdf5（qpos / action / cmd / 时间戳）
    participant PP as scripts/post_process.py
    participant Tr as act/imitate_episodes.py
    participant Dep as scripts/deploy_sim.py
    PP->>PP: load_svo 裁剪 → load_hdf5（10 ms 偏移）→ match_timestamps 对齐
    PP->>PP: 写 processed_*.hdf5（左右图 / state / qpos_action）
    Tr->>Tr: ACT 训练（DINOv2 · chunk 60 · kl_weight 10 · state 26 / action 28）
    Tr->>Tr: --save_jit 导出 traced_jit_*.pt
    loop 每个时间步
        Dep->>Dep: normalize_input(state, 左图, 右图) → policy → 60 步动作块
        Dep->>Dep: merge_act：对所有覆盖当前步的块指数加权（k=0.01）
    end
</div>

---

## 💡 核心贡献

1. **主动 + 立体的第一人称视觉反馈**：随头转动的双目相机让操作员获得深度感和自由视角，远程操作与立体深度不再二选一。
2. **一套跨设备、跨机器人的开源遥操作框架**：Web 端（WebXR）兼容 Vision Pro / Quest，已在 H1（灵巧手）与 GR-1（夹爪）两种形态上落地，支持跨网远程。
3. **采集到的数据「所见即所学」**：策略输入就是操作员看到的画面，颈部动作也进了动作空间，单相机即可完成需要左右扫视的长时序任务。
4. **对 ACT 的两处实用改动**：DINOv2 骨干 + 双目输入，显著提升了只用两路图像时的空间推理。

---

## 📊 关键结果

**自主策略分段成功率（表 1）**

| 方法 | H1 分拣 抓 / 放 | GR-1 分拣 抓 / 放 | 插罐 抓 / 插 | 取管 抽 / 传 / 放 |
|---|:-:|:-:|:-:|:-:|
| **DINOv2 + 双目（本文）** | **92% / 88%** | **87%** / 60% | **90% / 87%** | **100% / 100% / 100%** |
| ResNet18 | 74% / 58% | 83% / 50% | 53% / 70% | 85% / 100% / 95% |
| 仅左目（无双目） | 46% / 52% | 73% / 63% | 47% / 63% | 70% / 95% / 100% |

- 叠毛巾四个阶段本文与 ResNet18 都是 100%，仅左目在「把毛巾挪到桌边」阶段掉到 60%。
- GR-1 放置偏低是因为夹爪夹罐时把罐身颜色挡住了；附录里给罐子贴颜色标签后能缓解。

**主动视觉 vs 静态广角（表 2）**

| 设置 | 训练每批耗时 | 部署每步耗时 |
|---|:-:|:-:|
| 裁剪主动视角，batch 45（本文） | 0.41 s | 0.012 s（83 Hz） |
| 静态广角，batch 10 | 0.32 s | 0.024 s（42 Hz） |

- 每路图像 token 352 vs 1008：同 batch 训练快约 2 倍、单卡可容纳约 4 倍数据，推理快 2 倍，留出 IK / 重定向时间以维持 60 Hz 控制。

**用户实验（表 3，4 名研究生，双目 vs 单目）**

| 指标 | 分拣 | 插罐 | 叠毛巾 | 取管 |
|---|:-:|:-:|:-:|:-:|
| 平均用时（秒）双目 / 单目 | 66 / 91 | 58 / 85 | 34 / 50 | 67 / 97 |
| 平均成功率 双目 / 单目 | 100% / 93% | 100% / 71% | 100% / 100% | 100% / 50% |

- 泛化：H1 分拣在 4×4、格宽 3 cm 的网格上，演示覆盖到的区域抓取保持 100%。
- 遥操作还能完成电钻钻木板（约 1 kg 工具）、耳塞装盒、移液枪移液（管径 1.5 cm），以及波士顿→圣地亚哥的跨网遥控。

---

## ⚠️ 局限

- **只有视觉反馈**：没有力 / 触觉反馈，第一人称视角被手挡住或触觉主导的任务会吃亏。
- **没有数据重标注机制**：无法对专家数据做纠正（DAgger 式）来进一步提升成功率。
- **只用上半身**：腿、腰等自由度没有参与，论文把移动版列为未来工作（后来的 Mobile-TeleVision 正是这个方向）。
- **ACT 的记忆受限于动作块长度**：块长 60 只相当于约 1 秒记忆，长时序阶段判断容易出错。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **人形数据采集的「默认配置」** | 「VR 头显 + 头部双目主动相机 + 手腕 IK + dex-retargeting」后来成为大量人形操作数据采集系统的基础模板（如 Unitree 的 avp_teleoperate 即在本仓库基础上开发） |
| **主动感知进入动作空间** | 把颈部当成策略输出，为后续「学会去哪看」的工作（如主动感知类 VLA）提供了早期证据 |
| **单相机替代多相机** | 用一个会转的双目相机替代 ALOHA 式多相机布置，降低了部署和计算成本 |

---

## 🎤 面试参考

**Q：Open-TeleVision 的主要创新点在执行端还是感知端？**
A：感知端。执行端用的是成熟的 CLIK 逆运动学和 dex-retargeting；创新在于让机器人头部双目相机跟随操作员头部转动，并把立体画面实时推回 VR，既保留远程能力又提供深度。

**Q：手臂重定向为什么「位置用相对头、姿态用绝对」？**
A：机器人头会跟着人转。如果末端位置也按相机系或绝对系映射，转头会带着手一起动；用「手相对头」的位置差，配合手腕绝对朝向，转头时手保持稳定。

**Q：主动视觉对模仿学习有什么好处？**
A：一是视野集中在关键区域，可以裁剪下采样，图像 token 从 1008 降到 352，训练快约 2 倍、推理到 83 Hz；二是一个会转的相机就能覆盖左右两侧的关键点，不必多装相机；三是策略学会了在合适的时候转头。

**Q：为什么双目输入比单目好？**
A：双目隐式提供深度。消融里仅用左目时 H1 抓罐成功率从 92% 降到 46%，插罐从 90% 降到 47%；用户实验中单目也明显更慢、更容易失败。

---

## 🔗 相关阅读

- [Mobile-TeleVision](../Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control/Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control.md)：同组后续工作，把系统扩展到全身移动
- [Bunny-VisionPro](../Bunny-VisionPro__Real-Time_Bimanual_Dexterous_Teleoperation_for_Imitation_Learning/Bunny-VisionPro__Real-Time_Bimanual_Dexterous_Teleoperation_for_Imitation_Learning.md)：同期的 Vision Pro 双手灵巧遥操作，补了触觉反馈
- [ACE](../ACE__A_Cross-Platform_Visual-Exoskeletons_System_for_Low-Cost_Dexterous_Teleoperation/ACE__A_Cross-Platform_Visual-Exoskeletons_System_for_Low-Cost_Dexterous_Teleoperation.md)：同实验室的视觉外骨骼遥操作
- [iDP3](../../03_High_Impact_Selection/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies.md)：沿用 Vision Pro 遥操作采数据的人形 3D 扩散策略
- [ALOHA / ACT (2304.13705)](https://arxiv.org/abs/2304.13705)：本文模仿学习策略的出处
- [AnyTeleop / dex-retargeting (2307.04577)](https://arxiv.org/abs/2307.04577)：手部重定向库的出处
