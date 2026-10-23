---
layout: paper
title: "TWIST2: Scalable, Portable, and Holistic Humanoid Data Collection System"
zhname: "TWIST2：可扩展、便携、整体式的人形数据采集系统"
category: "Teleoperation"
arxiv: "2511.02832"
demos: ["twist2"]
---

# TWIST2: Scalable, Portable, and Holistic Humanoid Data Collection System
**把 TWIST 的光学动捕换成一台 PICO 4 Ultra 头显加两个绑在小腿上的追踪器（约 1000 美元），给 Unitree G1 外挂一个 250 美元、两个自由度的脖子和 ZED Mini 双目相机；人的全身动作经改过的 GMR 实时重定向成 35 维命令（根部的相对速度、高度、横滚俯仰、偏航角速度，加 29 个关节角），交给一个一阶段强化学习训的通用动作跟踪器执行，一个操作员戴着头显、看着机器人的第一视角就能边遥操作边录数据（表 II：18.5 分钟采 98 条，成功率 100%）；再用扩散策略从第一视角图像直接输出同样的 35 维全身命令，让 G1 自主地弯腰取放杯子、用脚把 T 形箱踢到目标**

> 📅 阅读日期: 2026-06-21（2026-10-19 第二版：对照 arXiv v1 的 LaTeX 源码、项目页和官方仓库逐条核查重写，改正旧版几处说法；新增十八幕讲解动画、三个交互演示和配音视频）
>
> 🏷️ 板块: 07 Teleoperation · 数据采集 · 免动捕 · VR 全身遥操作 · 第一视角主动视觉 · 分层视觉运动策略 · 开源
>
> ℹ️ 笔记对照 [arXiv 2511.02832](https://arxiv.org/abs/2511.02832) 的 v1（2025-11-04，目前唯一的版本；读的是 arXiv 上的 LaTeX 源码：正文、表 I–III、图 1–15）、[项目页](https://yanjieze.com/TWIST2/)和官方仓库 [amazon-far/TWIST2](https://github.com/amazon-far/TWIST2)（2026-10 的 `master`）。项目页写着论文已被 ICRA 2026 接收。**注意**：官方仓库只有底层控制器的训练与部署、遥操作和录数据；高层的扩散策略 README 说会另开一个仓库（基于 iDP3），还没有放出来。代码和论文有几处不一样，下文单独列出。「🚶 具体实例」与动画里的 G1 是我们拿官方仓库自带的两段 PICO 走路样例和官方控制器权重，在 MuJoCo 里**照官方 sim2sim 脚本重跑**的结果，不是论文的实验，见[环境设定](#实例-环境设定)。

---

## 📋 基本信息

| 项目 | 链接 / 内容 |
|------|------|
| **arXiv** | [2511.02832](https://arxiv.org/abs/2511.02832)（v1 2025-11-04） |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2511.02832) |
| **项目主页** | [yanjieze.com/TWIST2](https://yanjieze.com/TWIST2/)（真机视频、颈部 3D 模型、复现步骤） |
| **代码** | [amazon-far/TWIST2](https://github.com/amazon-far/TWIST2)（底层控制器训练 / sim2sim / sim2real、PICO 遥操作、录数据、颈部说明；附官方权重 `twist2_1017_20k.onnx` 和 10 段 PICO 采的走路样例） |
| **数据** | [twist-data.github.io](https://twist-data.github.io/)（可视化；数据放在 HuggingFace） |
| **会议** | ICRA 2026（项目页） |
| **作者** | Yanjie Ze、Siheng Zhao、Weizhuo Wang、Angjoo Kanazawa†、Rocky Duan†、Pieter Abbeel†、Guanya Shi†、Jiajun Wu†、C. Karen Liu†（† 共同指导；前三位是在 Amazon FAR 实习期间做的） |
| **机构** | Amazon FAR、Stanford、USC、UC Berkeley、CMU |
| **平台** | Unitree G1（29 自由度）+ 两只 Unitree Dex3-1 三指手（各 7 个自由度）+ TWIST2 Neck（2 自由度）+ ZED Mini 双目相机 |
| **关键词** | Humanoid teleoperation, data collection, mocap-free, egocentric active vision, general motion tracking, visuomotor policy |

**一行定位**：同一作者的 [TWIST](../TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.html) 证明了「全身跟着人动」的遥操作很强，但要光学动捕、离不开实验室。TWIST2 把动捕换成 VR 头显和两个追踪器，给 G1 加了一个能转的脖子，把整套系统做成一个人、一分钟就能架起来的数据采集工具，并在采来的数据上训了自主的全身视觉运动策略。

---

## 🎯 一句话总结

> TWIST2 是一套**便携、免动捕、保留完整全身控制**的人形遥操作与数据采集系统。论文先把控制拆成两层：**底层** $\pi _ {\text{low}}$ 是一个和任务无关的通用动作跟踪器，每一步接收 35 维命令 $\mathbf p _ {\text{cmd}}$（根部 $x$、$y$ 速度，根部高度，横滚、俯仰，偏航角速度，再加 29 个关节角），50 Hz 输出关节目标交给 PD；**高层** $\pi _ {\text{high}}$ 负责产生命令，遥操作时是「操作员 + 重定向器」，自主时是扩散策略。硬件上，PICO 4 Ultra 头显、两个手柄和两个绑在小腿上的 PICO Motion Tracker 实时估计全身姿态（约 1000 美元、100 Hz、一分钟装好）；G1 头上外挂的 **TWIST2 Neck**（两台 Dynamixel XC330，250 美元）带着 ZED Mini，让操作员通过头显看到机器人的双目第一视角。人的身体用改过的 GMR 重定向（下身对位置和朝向、上身只对朝向），三指手当夹爪用（抓握量 $\alpha$ 在张开、闭合两个姿态之间插值），脖子直接取人头相对脊柱的偏航和俯仰。底层控制器用一阶段 PPO 在约 2 万段动作上训练。结果：一个人能遥操作 G1 连续叠 3 条毛巾、搬两个篮子推门过门；18.5 分钟采 98 条双臂取放（表 II）；拿掉立体视觉、脖子或第一视角都会变慢或更容易失败（表 III）；在采来的数据上训的扩散策略能自主弯腰取放杯子（54 次里 33 次成功）、把 T 形箱踢到目标（7 次里 6 次）。

> 🎮 **本文内嵌 1 段讲解动画、1 段配音视频和 3 个交互演示**（不用装任何东西）：
> [十八幕动画：TWIST2 全流程](#twist2-explainer-anim) —— 约 288 秒串完「人形缺一套采集系统（表 I）→ 两层：高层给命令，底层来跟 → 命令：相对的根部，完整的关节 → G1 加一个 250 美元的脖子 → PICO 头显加两个追踪器 → 身体：下身对位置，上身只对朝向 → 手：三指手当夹爪 → 脖子：头转多少就转多少 → 底层控制器：数据与奖励 → 底层控制器：网络与跟踪 → 遥操作链路：不到 0.1 秒 → 一个人就能采 → 长时程遥操作 → 表 II：20 分钟采多少 → 表 III：拿掉哪一样 → 扩散策略出全身命令 → WB-Dex 与 Kick-T → 局限、数据与代码」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。
> [配音讲解视频](#twist2-video) —— 同样十八幕，加中文配音与字幕，竖屏，可下载
> [命令浏览器](#demo-cmd) —— 官方样例里的走路和蹲下逐帧看：35 维命令每一维是多少，参考动作和官方控制器在 MuJoCo 里跟出来的 G1 差多少；再看一整段走路，相对命令让机器人漂了多远
> [手和脖子](#demo-retarget) —— 拖抓握量 $\alpha$ 看三指手怎么合（握 / 捏两套姿态），拖人头的偏航、俯仰看脖子两台电机的目标
> [表 II、表 III 与图 14](#demo-tables) —— 20 分钟能采多少、拿掉立体 / 脖子 / 第一视角各慢多少、WB-Dex 的 54 次试验落在哪

> 🚶 [具体实例](#实例-环境设定)用官方仓库的 PICO 样例和官方权重从头算一遍：走路时 35 维命令长什么样、蹲到最低时根部速度几乎是 0、相对命令让机器人漂多远、底层的 1432 维观测怎么来、数据集按什么比例抽、手和脖子的插值、表 II 与表 III 换算成每分钟几条、64 步动作块执行多久、WB-Dex 每一步的成功率。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **TWIST** | Teleoperated Whole-Body Imitation System | 同一作者的前作：光学动捕 + 全身跟踪的遥操作 |
| **PICO 4U** | PICO 4 Ultra | 本文用的 VR 头显；配 PICO Motion Tracker 估计全身姿态 |
| **GMR** | General Motion Retargeting | 同一团队的实时重定向方法，本文改了它的第二阶段 |
| **Dex3-1** | Unitree Dex3-1 | G1 的三指灵巧手，每只 7 个自由度；论文写作 Dex31 |
| **ZED Mini** | — | Stereolabs 的双目相机，装在颈部上当机器人的眼睛 |
| **XRoboToolkit** | — | PICO 上的遥操作工具：流出全身姿态、在头显里显示双目画面 |
| **Redis / ZMQ / GStreamer** | — | 系统里传数据用的：命令走 Redis，图像用 GStreamer 推给头显、用 ZMQ 推给录数据的进程 |
| **PPO** | Proximal Policy Optimization | 训底层控制器的强化学习算法 |
| **DP** | Diffusion Policy | 扩散策略：高层的视觉运动策略 |
| **R3M** | Reusable Representations for Robot Manipulation | 预训练视觉表征，这里给 ResNet-18 初始化 |
| **ONNX** | Open Neural Network Exchange | 把训好的网络导出来加速推理的格式 |
| **WB-Dex / Kick-T** | Whole-Body Dexterous pick & place / Kick T-shaped box | 两个自主任务：弯腰取放杯子、用脚把 T 形箱踢到目标 |

---

## 🎬 十八幕动画：TWIST2 全流程 {#twist2-explainer-anim}

<div class="paper-demo" data-demo="twist2-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#twist2-video}

<div class="paper-demo" data-demo="twist2-video" data-src="media/twist2_explainer_video.mp4" data-poster="media/twist2_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/twist2_explainer_video.mp4" download="TWIST2_讲解视频.mp4">下载 mp4（21.7 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（要解决什么问题、方法详解、实验结果）按小节收起，再往后的具体实例、源码对照、在路线中的位置、面试和附录各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 3、6、9、10 幕里的 G1，动作是官方仓库自带的两段 PICO 样例（作者自己用 PICO 采、用 GMR 重定向的走路 `0807_yanjie_walk_001` 和蹲下 `0807_yanjie_walk_006`），「跟出来的 G1」是我们用官方权重 `twist2_1017_20k.onnx` 在 MuJoCo 里照官方 sim2sim 脚本重跑的（做法与数字见下文「🚶 具体实例」的环境设定），和第一个交互演示、「🚶 具体实例」是同一组数字；第 7 幕的三指手按官方代码里的张开 / 闭合姿态插值。G1 的 3D 外形：模型（带 Dex3-1 手）、材质与光照照抄 [Robot Retarget Online](https://imchong.github.io/Robot_Retarget_Online/) 的 three.js 场景，按关节角用正交相机逐帧离线渲染，标注按同一个相机投影叠在上面。表格和第 1、2、4–8、11、12、15–17 幕的图来自论文；第 1、3–5、8、11、13、14、17 幕的真机画面剪自[项目页](https://yanjieze.com/TWIST2/)的视频（第 1 幕的动捕服片段是项目页转载的 TWIST 视频），画面上标了项目页写的倍速，只做讲解引用。

---

## ❓ 要解决什么问题

<div class="mermaid">
flowchart TB
    D["大规模数据推动了 LLM 和 VLA<br/>双臂操作有 ALOHA / GELLO 这样的采集系统"] --> Q0["人形机器人没有同样好用的采集系统"]
    Q0 --> A["a) 解耦：上下身分开控制<br/>HOMIE、Mobile-TeleVision"]
    Q0 --> B["b) 部分全身：手臂、躯干协调<br/>腿只跟根部速度（AMO、CLONE）"]
    Q0 --> C["c) 完整全身：每个关节都跟人<br/>HumanPlus、TWIST"]
    B --> X1["VR 方案便携<br/>但只会简单的走，做不了需要全身协调的动作"]
    C --> X2["TWIST 最灵活<br/>但要昂贵、不便携的动捕，离不开实验室"]
    X1 --> Q["能不能既保留完整全身控制，又便携、能规模化？"]
    X2 --> Q
    Q --> T["TWIST2：PICO 头显 + 两个追踪器 + 250 美元的脖子<br/>一个人就能边遥操作边采数据"]

    style Q fill:#e8f4fd,stroke:#1f78b4
    style T fill:#e8f8e8,stroke:#27ae60
</div>

### 数据驱动的进展还没到人形（第 I 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：GPT-4、π₀、π₀.₅ 都靠大规模数据；双臂操作的数据来自 ALOHA、GELLO 这类成熟的采集系统；人形还没有</summary>

大规模数据改变了机器学习：从 GPT-4 这样的大语言模型，到机器人里的视觉—语言—动作（VLA）模型。双臂操作上，[π₀](../../03_High_Impact_Selection/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.html) 和 [π₀.₅](../../03_High_Impact_Selection/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.html) 的能力直接来自稳定、可规模化的数据采集设施（ALOHA、ALOHA 2、GELLO）。

人形还没有赶上这一波，论文认为主要原因是**缺一个同样有效的数据采集框架**，这限制了它往人类水平的操作和移动发展。

</details>

### 现有的人形遥操作分三类（表 I）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：解耦、部分全身、完整全身；VR 方案便携但腿只跟根部速度，TWIST 全身但要动捕；表 I 的 7 列只有 TWIST2 全勾</summary>

论文按控制方式把近期的人形遥操作分成三类：

- **a) 解耦控制**：上下身分开控制，比如 [HOMIE](../../03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.html)、[Mobile-TeleVision](../Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control/Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control.html)；
- **b) 部分全身控制**：协调手臂、躯干这些部位，腿只跟根部速度命令，比如 AMO、[CLONE](../CLONE__Closed-Loop_Whole-Body_Humanoid_Teleoperation_for_Long-Horizon_Tasks/CLONE__Closed-Loop_Whole-Body_Humanoid_Teleoperation_for_Long-Horizon_Tasks.html)；
- **c) 完整全身控制**：手臂、躯干、腿的所有关节统一地跟着人的姿态，比如 [HumanPlus](../HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans/HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans.html)、[TWIST](../TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.html)。

AMO、CLONE 这类 VR 方案实用，但只能做带简单行走的移动技能，做不了人自然会的动态全身协调动作；完整全身控制最能发挥人形的多面性（TWIST 证明了这一点），但这类系统通常依赖**昂贵、不便携的动作捕捉**，只能在实验室里用。

表 I 从「便携与可规模化」和「整体控制」两方面比了 5 个系统（✓ / ✗ 照抄论文）：

| 系统 | 类别 | 来源 | 便携 | 免标定 | 单人 | 全身跟踪 | 第一视角 | 脚 | 手腕 |
|---|---|---|---|---|---|---|---|---|---|
| HOMIE | 解耦 | 外骨骼 | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| AMO | 部分 | VR | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✓ |
| CLONE | 部分 | VR | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| TWIST | 完整 | 动捕 | ✗ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ |
| **TWIST2** | 完整 | VR | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

图注的说法：以前的工作要么为了全身控制牺牲便携（TWIST），要么为了便携牺牲全身控制（AMO、CLONE），TWIST2 是第一个把完整全身控制和便携结合起来的系统。

</details>

### 三条贡献

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：便携免动捕的全身遥操作与采集系统（带可拆装的脖子）；分层的全身视觉运动策略；长时程遥操作、高效采数据和两个新的自主技能</summary>

1. 一个便携、免动捕、带完整全身控制的人形遥操作与数据采集系统，配一个可拆装的脖子，提供第一视角的主动视觉；
2. 一个分层的全身视觉运动策略学习框架，能控制完整的全身；
3. 展示了长时程遥操作（叠 / 展开毛巾、搬东西穿过门）、高效的数据采集，以及新的自主人形技能（全身灵巧取放、Kick-T）。

论文强调系统、数据和模型全部开源，保证可复现。引言里还有一句：据作者所知，这是第一个**基于视觉、自主控制完整人形全身**的策略学习框架，不再把下身简化成根部速度这类命令。

</details>

---

## 🔧 方法详解（第 III 节）

<div class="mermaid">
flowchart LR
    subgraph H["遥操作端（便携设备）"]
        P["PICO 4 Ultra 头显 + 2 个手柄<br/>+ 2 个小腿追踪器（约 1000 美元）"] --> R["重定向（第 III-D 节）<br/>身体：改过的 GMR<br/>手：α 插值；脖子：偏航 + 俯仰"]
    end
    R -->|"p_cmd：35 维<br/>经 Redis"| L["底层 π_low（第 III-E 节）<br/>一阶段 PPO 的通用动作跟踪器<br/>50 Hz → PD"]
    L --> G["G1 29 自由度 + 2 只 Dex3-1 手<br/>+ TWIST2 Neck（250 美元）"]
    G -->|"ZED Mini 双目画面<br/>GStreamer H.265"| P
    G -->|"图像 + 状态 + 命令<br/>30 Hz 录数据"| D["示范数据"]
    D --> DP["高层 π_high^auto（第 III-G 节）<br/>扩散策略：第一视角图像 → 64 步 p_cmd"]
    DP -->|"p_cmd"| L

    style L fill:#fdebd0,stroke:#e67e22
    style DP fill:#e8f8e8,stroke:#27ae60
    style R fill:#e8f4fd,stroke:#1f78b4
</div>

### 两层控制（第 III-A 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：底层是和任务无关的通用动作跟踪器，输入 35 维命令和本体感受，50 Hz 输出关节目标；高层出命令，遥操作版是「操作员 + 重定向器」，自主版是扩散策略</summary>

目标是在一个统一框架里，让人形靠自己的第一视角和本体感受做各种全身灵巧任务。做法是两层：底层控制器 $\pi _ {\text{low}}$ 和高层控制器 $\pi _ {\text{high}}$。

**底层**：把 $\pi _ {\text{low}}$ 写成一个**通用动作跟踪**问题，所以底层和任务无关。每一步它收到一个命令向量：

$$
\mathbf{p}_{\text{cmd}}=\big[\,\dot{x}_{\text{ref}},\ \dot{y}_{\text{ref}},\ z_{\text{ref}},\ \phi_{\text{ref}},\ \theta_{\text{ref}},\ \dot{\psi}_{\text{ref}},\ \mathbf{q}_{\text{ref}}\,\big]
$$

依次是根部在 $x$、$y$ 方向的速度，根部高度，根部横滚、俯仰角，偏航角速度，和全身的关节角（G1 是 29 个，所以一共 $6+29=35$ 维）。它还看本体感受 $\mathbf s=[\omega,\dot\omega,\mathbf q,\dot{\mathbf q}]$（论文的写法：IMU 给的根部朝向和角速度，编码器给的关节位置和速度），输出关节目标 $\mathbf q _ {\text{tgt}}=\pi _ {\text{low}}(\mathbf s,\mathbf p _ {\text{cmd}})$，**50 Hz**，再由 PD 控制器算力矩：

$$
\tau = K_{\text{P}}(\mathbf q_{\text{tgt}}-\mathbf q) - K_{\text{D}}\dot{\mathbf q}
$$

**高层**：$\pi _ {\text{high}}$ 根据第一视角图像产生任务相关的命令 $\mathbf p _ {\text{cmd}}=\pi _ {\text{high}}(\mathbf o,\mathbf s)$。有两个版本：遥操作版 $\pi _ {\text{high}}^{\text{teleop}}$（就是**操作员 + 动作重定向器**）和视觉运动策略 $\pi _ {\text{high}}^{\text{auto}}$（比如扩散策略）。先用遥操作版采集 $(\mathbf o,\mathbf s,\mathbf p _ {\text{cmd}})$，再拿来训自主版。图 2 的说法：可控的自由度一共 45 个 = 脖子 2 + 身体 29 + 手 14。

</details>

### 命令接口的两个设计（第 III-A 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：根部只给相对量，不依赖全局状态估计、长时间也稳；下身给完整的关节角，不简化成根部速度，才能做用脚的操作和跳舞</summary>

论文点出命令接口里两个关键的选择：

1. **根部用相对的平移和旋转，不用绝对位姿**：系统不依赖准确的全局状态估计（引了 [BeyondMimic](../../01_Foundational_RL/BeyondMimic/BeyondMimic.html)），在很长时间的操作里也能保持稳定。35 维里根部的 6 维全是「速度、高度、倾角」这类不需要知道机器人在世界里哪儿的量。
2. **下身给全身关节角，而不是只给根部速度**（AMO、CLONE、Mobile-TeleVision 的做法）：下身的动作能控制得更精确，解锁用腿做操作（踢东西）和跳舞这类任务。

代价是什么？相对命令下，机器人走过的路线会和参考慢慢偏开（全局误差没人管）。我们用官方控制器在 MuJoCo 里跟官方的一段 14 s 走路，终点和参考差约 1 m、中途最大差约 2 m（见[例 3](#实例-3-相对命令会漂多远)，这是我们的复现，不是论文的实验）。遥操作时操作员看着第一视角画面自己会纠正，这个漂移不影响用（我们的理解）。

</details>

<div class="paper-demo" data-demo="twist2-cmd" id="demo-cmd"><p class="demo-fallback">（本节含交互演示：命令浏览器，需要启用 JavaScript）</p></div>

### 机器人与 TWIST2 Neck（第 III-B 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：G1 29 自由度 + 两只 Dex3-1 手；外挂式两自由度脖子：两台 XC330-T288、U2D2、机载 12 V/5 A 供电、3D 打印，250 美元；ZED Mini 另加 400 美元；有 MuJoCo 模型</summary>

机器人是 29 个自由度的 Unitree G1（腰 3 + 两条腿各 6 + 两只手臂各 7），配两只 7 个自由度的 Dex3-1 手。作者发现**脖子的自由度对有效、长时程的遥操作很关键**，所以做了一个带偏航和俯仰的便携脖子。

**TWIST2 Neck**（图 3）：和 AMO、Vision in Action 那种内置的脖子不同，这是一个**外挂模块**，不用拆 G1 原来的头和激光雷达就能装上、卸下。设计参考了 [ToddlerBot](../../12_Hardware_Design/ToddlerBot_Open-Source_ML-Compatible_Humanoid_Platform_for_Loco-Manipulation/ToddlerBot_Open-Source_ML-Compatible_Humanoid_Platform_for_Loco-Manipulation.html)：

- 两台 Dynamixel XC330-T288 电机分别管偏航和俯仰，经 U2D2 连接，用机载的 12 V/5 A 电源；
- 结构件全部 3D 打印；
- 颈部成本 **250 美元**；双目相机是 ZED Mini，另加 **400 美元**；
- 不要横滚：人在日常交互里很少用横滚，两个自由度已经能做出平滑、像人的颈部动作（图 5）；
- 做了对应的 MuJoCo 模型（图 4），方便仿真研究、统一数据格式。

图 15：已经造了 3 个 TWIST2 Neck，说明好装、能推广（项目页后来写的是 4 个）。官方的颈部说明（`doc/TWIST2_NECK.md`）里，偏航电机设成 ID 0、俯仰电机 ID 1，波特率 2 Mbps。

</details>

### 便携、免动捕的人体数据（第 III-C 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：PICO 4 Ultra + 两个绑在小腿上的 PICO Motion Tracker；两个追踪器比更多个稳；约 1000 美元；XRoboToolkit 100 Hz 流出；不用重标定，一分钟装好</summary>

为了便携地拿到实时的全身姿态，用 **PICO 4 Ultra** 加两个绑在**小腿**上的 **PICO Motion Tracker**，得到人体各部位的全局位置和朝向：

- PICO 支持更多追踪器，但作者发现**两个追踪器的模式姿态估计更稳**；
- 整套约 **1000 美元**，比光学动捕便宜、实用得多；
- 用 XRoboToolkit 从 PICO 取动作流，**100 Hz**（图 6 左是它输出的 24 个关节的人体骨架）；
- 不像动捕那样要繁重的标定，从进门到装好约 **1 分钟**（图 1）。

和 Boston Dynamics 近期演示里用的 HTC Vive Tracker 比，PICO 的全身估计**不需要另外架第三视角的相机**，更灵活。

</details>

### 身体重定向：下身对位置，上身只对朝向（第 III-D 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：沿用 GMR 的两阶段优化，把第二阶段改成「下身同时对位置和朝向，上身只对朝向」，人的位置先换到骨盆坐标系；脚更不打滑，上身不受全局位置跳变影响</summary>

把 [GMR](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html)（实时运动重定向方法）改到 PICO 的人体格式（图 6：人的骨盆、髋、膝、脚、肩、肘、腕对应 G1 的 pelvis、hip_yaw_link、knee_link、ankle_roll_link、shoulder_yaw_link、elbow_link、wrist_yaw_link）。原版 GMR 是两阶段优化：(1) 让各连杆的朝向一致；(2) 再精调全局位姿。PICO 的全局位姿估计常常不准，所以把第二阶段改成：

- **下身**同时优化位置和朝向；
- **上身**只优化朝向。

把连杆分成下身 $\mathcal L _ {\text{low}}$（骨盆、髋、膝、踝、脚）和上身 $\mathcal L _ {\text{up}}$（脊柱、肩、肘、腕、头），位置项只对下身选出的点 $\mathcal P _ {\text{low}}$（通常是脚 / 踝，可选骨盆）。为了降低对全局位姿噪声的敏感（也为了支持操作员「瞬移」），人的所有位置都先换到**骨盆坐标系**里。第二阶段（式 8）：

$$
\mathbf q^{*}=\arg\min_{\mathbf q}\sum_{i\in\mathcal L_{\text{up}}\cup\mathcal L_{\text{low}}} w_i^{R}\,\big\lVert R_i^{\text{human}}-R_i^{\text{robot}}(\mathbf q)\big\rVert_F^2+\lambda_{\text{pos}}\sum_{k\in\mathcal P_{\text{low}}} w_k^{p}\,\big\lVert p_k^{\text{human,pelvis}}-p_k^{\text{robot}}(\mathbf q)\big\rVert_2^2
$$

效果：脚和踝的位置对得准，**脚更不打滑**；上身没有位置项，全局位置的跳变（比如瞬移）不会带来伪影——上身的重定向只取决于局部的旋转。

**官方配置**（GMR 仓库的 `ik_configs/xrobot_to_g1.json`）：第二张匹配表里两只脚（`left_toe_link` / `right_toe_link`）的位置权重 100、朝向 10，骨盆、髋、膝的位置权重 10、朝向 5，躯干、肩、肘、腕的位置权重 0、朝向 10；人体缩放下身 0.9、手臂 0.8。遥操作脚本 `teleop.sh` 把 `actual_human_height` 设成 1.6 m，注释说要比操作员真实身高小一点，补 PICO 估计的偏差。

</details>

### 手：三指手当夹爪（第 III-D 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：五指映射到三指不直观，干脆不估手的姿态、按手柄的键；张开 / 闭合两个标定姿态之间按 α 线性插值；握力抓和捏各一套</summary>

把人手的五指直接映射到 Dex3-1 并不直观：它只有三根手指、自由度有限，功能上更像平行夹爪而不是多指灵巧手。所以手的重定向简化成夹爪：**不用手的姿态估计，用 PICO 手柄上的按键控制**。定义两个标定姿态：张开 $\mathbf q _ {\text{open}}$ 和闭合 $\mathbf q _ {\text{close}}$；从人的手部信号算出抓握量 $\alpha\in[0,1]$（0 全开、1 全闭），手的关节目标（式 7）：

$$
\mathbf q_{\text{hand}}=(1-\alpha)\,\mathbf q_{\text{open}}+\alpha\,\mathbf q_{\text{close}}
$$

需要握力抓的任务（抓杯子）和需要精细捏的任务（叠衣服）各用一套 $\mathbf q _ {\text{open}}$、$\mathbf q _ {\text{close}}$。

**官方代码**（`deploy_real/xrobot_teleop_to_robot_w_hand.py`）：$\alpha$ 不是直接从手柄读出来的，而是按住扳机（`index_trig`）就每个循环加 0.05、按住侧握键（`grip`）就减 0.05；遥操作循环 100 Hz，所以从全开到全闭要 20 个循环 = 0.2 s。握力抓的闭合姿态是拇指、中指、食指都卷起；捏的模式（`--pinch_mode`）把食指一直收着、用拇指和中指捏，张开姿态取在 80% 处，缩短开合的距离。

</details>

### 脖子：头转多少就转多少（第 III-D 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：取人头相对脊柱的旋转，偏航 = atan2(r21, r11)、俯仰 = arcsin(−r31) 直接当两个电机的目标；代码里再乘 1.5</summary>

设 $R _ {\text{head}}$、$R _ {\text{spine}}\in SO(3)$ 是人头和脊柱在世界系的旋转，相对旋转 $R _ {\text{rel}}=R _ {\text{spine}}^{\top}R _ {\text{head}}=[r _ {ij}]$，脖子的两个关节目标（式 10）：

$$
q_{\text{neck}}^{\text{yaw}}=\psi=\operatorname{atan2}(r_{21},r_{11}),\qquad q_{\text{neck}}^{\text{pitch}}=\theta=\arcsin(-r_{31})
$$

**官方代码**（GMR 仓库的 `neck_retarget.py` 的 `human_head_to_robot_neck`）：脊柱取 PICO 骨架的 `Spine3`（注释说用 `Neck` 不行，它和头几乎是对齐的），在 PICO 的坐标系里按 xyz 欧拉角分解，取偏航 = −pitch、俯仰 = roll（坐标轴的约定不同），再在遥操作脚本里乘 `neck_retarget_scale = 1.5` 放大。暂停时脖子停在最后的角度，空闲时回到 0。

</details>

<div class="paper-demo" data-demo="twist2-retarget" id="demo-retarget"><p class="demo-fallback">（本节含交互演示：手和脖子，需要启用 JavaScript）</p></div>

### 底层控制器：一阶段强化学习（第 III-E 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：不用教师—学生两阶段，直接一阶段 PPO；约 2 万段动作（GMR 7k + TWIST 13k），73 段 PICO 采的很关键；r = r_track + r_reg；卷积历史编码器 + MLP</summary>

要把重定向出的运动学动作放到真机上，需要一个读参考动作、输出 PD 目标的全身控制器 $\pi _ {\text{low}}$。和以前用复杂的教师—学生流程训全身控制器的工作（TWIST、GMT、[OmniH2O](../../03_High_Impact_Selection/OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html)）不同，TWIST2 设计了一个**一阶段**的通用动作跟踪训练框架：

- **数据**：约 2 万段动作，其中 7k 段是用 GMR 重定向的，13k 段是 TWIST 原来的数据；来源有 AMASS、OMOMO 和自采的动捕。这样的混合让策略学会全向行走。
- **PICO 采的 73 段**：和 TWIST 发现的一样，从遥操作设备本身采一小批动作对缩小域差距很关键；只采了 73 段，因为已经覆盖了走、蹲、操作这些日常动作。
- **奖励**：$r=r _ {\text{track}}+r _ {\text{reg}}$，其中 $r _ {\text{track}}=e^{-\alpha\lVert\mathbf p _ {\text{cmd}}-\mathbf p _ {\text{cur}}\rVert}$，$\mathbf p _ {\text{cur}}$ 是机器人实际达到的状态；$r _ {\text{reg}}$ 是正则项，比如动作变化的惩罚。
- **网络**：PPO 训练，主要两部分：**卷积历史编码器**和 MLP 主干。作者发现把历史的本体感受和历史的参考动作压成一个紧凑的隐向量，能提升学习效率。

**官方代码**（`train.sh` 训的任务是 `g1_stu_future`，配置在 `legged_gym/envs/g1/g1_mimic_future_config.py`）：

- `--teacher_exptid None`：教师不加载，DAgger 的 KL 损失关掉，实际就是 PPO，这就是论文说的「一阶段」。价值网络看特权信息（未来 20 帧参考、真实线速度、接触、质量 / 摩擦 / 电机强度等，共 1734 维），策略网络只看真机拿得到的。
- 数据集配置 `twist2_dataset.yaml` 一共 **19,426** 段：TWIST 转来的 12,788 段、OMOMO 的 GMR 重定向 5,841 段、AMASS 的 GMR 重定向 724 段、PICO 采的 73 段；PICO 那 73 段采样权重是 10，其余是 1。
- 奖励不是一项，而是 21 项（权重）：关节角 2.0、关节速度 0.2、根部高度 1.0、根部朝向 1.0、根部线速度 1.0、根部角速度 1.0、关键点位置（相对根部）2.0、关键点位置（全局）2.0、存活 0.5、抬脚时间 5.0；惩罚有动作变化 −0.05、关节限位 −5、力矩限位 −1、绊脚 −1.25、脚打滑 −0.1 等。跟踪项都是 $\exp(-k\cdot\text{误差平方和})$ 的形式，关节角 $k=0.15$、关键点 $k=10$。
- 策略观测 **1432** 维 = 当前一步（35 维命令 + 92 维本体感受）+ 10 步历史 × 127 + 35 维「未来」命令（配置里只取当前一帧，部署时就填当前命令）。历史编码器把 10 × 127 用一维卷积压成 128 维；主干 MLP 512–512–256–128，SiLU。
- 训练：4096 个并行环境，每次迭代每个环境 24 步；官方权重叫 `twist2_1017_20k`（第 2 万次迭代）。域随机化：摩擦 0.6–2、质量 ±5 kg、质心 ±0.1 m、电机强度 0.8–1.2、每 8 s 推一下（1 m/s）、动作延迟、重力 ±0.1。

</details>

### 一个人的第一视角遥操作（第 III-F 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：命令经 Redis 发给底层；双目画面 GStreamer H.265 推给头显、JPEG 经 ZMQ 推给录数据；手柄当控制中心，一个人就能开始、暂停、结束；暂停后插值恢复；所有模块 50 Hz 以上，延迟不到 0.1 s；后处理界面切分示范</summary>

**第一视角全身遥操作**：从 PICO 拿到实时的人体动作，映射成命令 $\mathbf p _ {\text{cmd}}$，经 **Redis** 发给 $\pi _ {\text{low}}$。头显里有立体视觉：XRoboToolkit 的自定义着色器调整瞳距、把焦点放在约 3.3 英尺（约 1 m），操作员有深度感（图 8：机器人的画面浮在视野中央）。双目图像从 ZED Mini 用 **GStreamer** 以 H.265 推给 PICO，同时以 JPEG 经 **ZMQ** 推给录数据的进程。

**一个操作员**：实用的采集系统应该只要一个人。近期的全身遥操作多半只展示能力，没说清怎么开始、暂停、结束；AMO 和 Mobile-TeleVision 要两个人（一个管上身、一个管下身）；TWIST 和 CLONE 遥操作只要一个人，但还要另一个人控制整个流程的开始和结束。TWIST2 给 PICO 手柄编了程，手柄就是控制中心（图 9：开始 / 结束录数据、开始 / 结束遥操作、手的开合），操作员不需要任何帮手。

**安全**：人形很脆，系统能完全控制机器人时这一点更要紧。状态切换用动作插值：比如手柄可以暂停，暂停结束时从机器人最后的姿态插值到当前目标，避免突然跳变。这样系统能长时间安全运行，操作员累了随时停。

**延迟**：所有模块都在 50 Hz 以上，整体延迟低于 0.1 s；TWIST 是 0.5 s。

**数据过滤**：采集时连续录，再用一个后处理图形界面把长序列切成一段一段（每段完成一次任务），并去掉空闲的动作和失败的示范。

**官方代码**：按键在 `doc/TELEOP.md` 和遥操作脚本的注释里——右手 A 在「空闲 → 遥操作 → 暂停 → 遥操作」之间切换，左手 X 退出（插值回默认姿态），左手 Y 开始 / 停止录一段（会语音提示 "episode recording started"），左摇杆按下是急停（直接结束底层进程）。插值是线性的，`start_interpolation` 的默认时长 1 s。遥操作循环 100 Hz（`--target_fps 100`），录数据 30 Hz（图像、身体 / 手 / 颈部的状态与命令）。

</details>

### 分层的全身视觉运动策略（第 III-G 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：输入第一视角 RGB（缩到 224×224）和历史命令；输出同样的 p_cmd；1D 卷积扩散策略，一次出 64 步；ResNet-18 用 R3M 预训练；本体感受加 10% 噪声；ONNX 在 4090 上 20 Hz，64 步里执行 48 步、30 Hz</summary>

用遥操作采来的数据训练高层的视觉运动策略 $\pi _ {\text{high}}^{\text{auto}}$（图 7：System 2 是扩散策略，System 1 是底层跟踪器）。

- **观测**：ZED Mini 的 $360\times640$ RGB 图像，缩到 $224\times224$；本体感受用**历史命令** $\mathbf p _ {\text{cmd}}$，不用原始的机器人状态 $\mathbf s$。两个理由：(1) 高层和底层解耦，可以分开训练、分开部署；(2) 在这个高维系统里不直接依赖带噪的原始状态，减少误差累积。
- **动作**：和遥操作时一样的命令 $\mathbf p _ {\text{cmd}}$，保证采数据和执行一致；所有本体感受输入都做归一化。
- **网络**：[Diffusion Policy](../../01_Foundational_RL/Diffusion_Policy/Diffusion_Policy.html)，用一维卷积块建模动作序列；一次预测 **64 步**动作块（按 iDP3 / DP3 的做法预测样本），对应执行频率下约 2 秒的未来命令；视觉编码器是 ResNet-18，用 R3M 预训练。
- **增强**：本体感受加 10% 的高斯噪声，让策略更多依赖视觉、别过拟合精确的状态；图像做随机裁剪、随机旋转、颜色抖动。
- **部署**：转成 ONNX，在一张 RTX 4090 上推理 **20 Hz**；64 步里执行 48 步，执行频率 **30 Hz**，和采数据的频率一致。

图 7 画的是 $p_t$ 到 $p _ {t+31}$（32 步），和正文的 64 步对不上，以正文为准（我们的核对）。高层策略的代码还没放出来（README：会基于 iDP3 另开一个仓库）。

</details>

---

## 📊 实验结果（第 IV 节）

### 长时程遥操作（第 IV-A 节、图 10）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：叠毛巾——能连着叠 3 条随机放的毛巾，瓶颈是电机过热；搬篮子穿门——调脚步、弯腰捡两个篮子、推门过门、放到架子上；关键是第一视角主动视觉和平滑的全身跟踪</summary>

论文展示了两个以前的系统做不到的长时程任务，并观察到：(1) 第一视角的主动感知、(2) 平滑的全身跟踪（而不是解耦控制），是做成这类自然、平滑、长时程、全身、移动任务的关键。

- **叠毛巾**：机器人用第一视角找到毛巾，拉到面前、抓起来抖开，捏住两个角对折，再重复折成三折（或四折）到目标大小，沿折痕压平，整齐地放到左手边。整个过程要精细地控制手腕和手、主动看、全身去够。能**连续叠 3 条**随机放在桌上的毛巾；瓶颈在电机的耐久，比如电机过热。
- **搬篮子穿门**：机器人先调整脚的位置、弯腰分别捡起左边和右边的篮子（篮子随手放，操作员要靠机器人的主动视觉先找到它），走到门前用手臂推开门、走过去，把篮子轻放到架子上。所有的底盘移动都由一个操作员**跟踪自己下身的动作**完成。

项目页还有找到衣服并叠好、踢足球、投篮、从地上捡砖、长距离行走、绕圈等遥操作视频。

</details>

### 表 II：20 分钟采多少（第 IV-B 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：专家操作员连续采：双臂取放 18.5 分钟 98 条、每条 11 s；移动取放 19.5 分钟 46 条、每条 25 s；成功率都是 100%；摘要、引言、图 1、项目页的说法各不相同</summary>

| 任务 | 时长 | 采到的条数 | 成功率 | 平均每条 |
|---|---|---|---|---|
| 双臂取放 | 18.5 min | 98 | 100% | 11 s |
| 移动取放 | 19.5 min | 46 | 100% | 25 s |

正文：20 分钟内，专家操作员能连续采约 100 条成功的双臂取放，或约 50 条成功的移动取放。几个地方的说法不一样（我们的核对）：摘要写「15 分钟采 100 条、成功率接近 100%」，引言写「20 分钟约 100 条、没有失败」，图 1 写「15～20 分钟 100 条」，图 2 写「20 分钟 100 条 / 50 条」，项目页写「15 分钟 128 条双臂取放、15 分钟 50 条移动取放」（项目页的 64 倍速视频里计数器在约 15 分钟走到 48）。笔记以表 II 为准。

</details>

### 表 III 与图 12：拿掉哪一样都更难（第 IV-B 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一个专家、一个第一次用的新手，各采 10 条；完整系统 20/23 次成功、平均 67.8 s；拿掉立体视觉 98.3 s，拿掉脖子 112.3 s；第三人称只有站在旁边时才快</summary>

用户研究：一个用这套系统采过很多数据的**专家**，一个测试时第一次用的**新手**。新手会越用越熟练，所以让新手先用完整系统、再逐个拿掉功能，分离每个部件的作用。任务是采 10 条成功的示范。

| 设置 | 成功 / 尝试（新手） | （专家） | 合计 | 用时 s（新手） | （专家） | 平均 |
|---|---|---|---|---|---|---|
| **TWIST2** | 10/12 | 10/11 | **20/23** | 75.6 | 59.9 | **67.8** |
| 去掉立体视觉 | 10/12 | 10/15 | 20/27 | 90.6 | 105.9 | 98.3 |
| 去掉脖子 | 7/17 | 9/12 | 16/29 | 144.0 | 80.5 | 112.3 |
| 去掉第一视角 | 10/13 | 10/10 | **20/23** | 94.3 | 43.0 | 68.7 |

（「去掉脖子」时新手只成功了 7 次、专家 9 次，没凑满 10 条；论文没解释，我们推测是试了 17 / 12 次就停了。）

图 12 的三点观察：

1. **没有立体视觉**：操作员估不出真实的深度，往往抓得比物体实际位置高，抓取失败明显变多；
2. **没有脖子**：看不到固定视野之外的物体，遥操作非常吃力；
3. **用第三人称 + VR 透视**（去掉第一视角）：专家采得特别快（10 条 43 秒），但这只是因为专家直接站在机器人旁边；需要靠第一视角远程操作的长时程移动操作做不到。

表注的结论：主动的第一视角立体视觉是必须的。

</details>

### 两个自主任务：WB-Dex 与 Kick-T（第 IV-C 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：WB-Dex——170 条示范，54 次里 49 次够到、33 次抓起放好、16 次抓失败；Kick-T——50 条示范，左脚踢、右脚跟一步，7 次里 6 次踢到目标；目前只会往前踢</summary>

图 13 可视化了训练数据（机器人第一视角 + 全身关节）。

- **全身灵巧取放（WB-Dex）**：机器人弯腰用灵巧手从架子上拿起杯子，放进地上的箱子。用 **170 条**示范训练。图 14 列出了全部 54 次试验：49 次够到杯子，其中 33 次抓起并放好、16 次抓取失败；5 次没够到。策略多数时候都能可靠地够到杯子，但杯子很轻，抓取需要非常精确的控制，一点漂移就会抓空。图 11 底部是连续 6 次成功抓取。
- **把 T 形箱踢到目标（Kick-T）**：机器人用脚把一个绿色的 T 形箱踢向地上一个固定的 T 形目标。用 **50 条**示范训练；数据里的动作模式是一致的——左脚踢，踢完右脚向前迈一步保持平衡——这样学到的策略踢得稳。**7 次里 6 次**把箱子送到目标（图 11）。目前只会往前踢，不会绕着箱子走、调整踢的角度这类更灵活的策略，留给以后。

项目页还放了扩散策略预测的未来全身关节（画成「鬼影」轨迹），WB-Dex 与 Kick-T 各一段。

</details>

<div class="paper-demo" data-demo="twist2-tables" id="demo-tables"><p class="demo-fallback">（本节含交互演示：表 II、表 III 与图 14，需要启用 JavaScript）</p></div>

---

## ⚠️ 局限与讨论

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：底层跟不上冲刺这样的高动态动作；PICO 的估计不如动捕，肘和膝没有追踪器；先统一硬件再规模化、让采集平民化、共享数据；代码与论文的出入</summary>

**论文写的局限**：

1. 通用动作跟踪器跟不上冲刺这类**高动态**的动作，快而复杂的动作难跟；
2. PICO 的全身姿态估计**不如高价的动捕**准，尤其是没有放追踪器的**肘和膝**，动作质量会下降。

**论文对「规模化人形数据」的讨论**（第 V 节）：

- **统一硬件**：现在研究用的人形五花八门（Unitree G1 / R1、Booster T1 / K1），数据跨形态难复用；G1 在性能和价格之间平衡得好，最近越来越多人用。作者主张**先统一硬件，再规模化采数据**；他们用 G1 + 低价的脖子，认为这套能提供人类大约 **80%** 的核心功能（作者的估计）。
- **让采集平民化**：高质量的人形数据以前靠动捕棚和专门设备；TWIST2 给了一个便携、便宜、又保留丰富操作能力（不只是移动）的替代方案。
- **共享数据**：采到的数据全部放到 HuggingFace，并在 twist-data 网站上可视化，希望能被社区直接复用、扩展。数据网站写明统一的状态 / 动作格式：{底盘 xy 速度、底盘高度、底盘横滚俯仰、底盘偏航角速度、身体 / 手 / 脖子的关节角}。

**我们读代码看到的**（详见[源码对照](#源码-论文与代码)）：

- 「一阶段」在代码里是关掉教师的 DAgger-PPO 任务 `g1_stu_future`，README 仍叫教师 / 学生，权重叫 student；
- 奖励是 21 项（不只是论文写的一个指数项加正则），还跟关键点位置——这些不在 35 维命令里，只在训练时用参考动作算；
- 训练和真机都是 50 Hz，`sim2sim.sh` 却用 100 Hz 跑策略；手腕的 PD 增益训练配置 40 / 5、sim2sim 4 / 0.2、真机 20 / 1，三处都不一样；
- 高层扩散策略和数据处理界面还没开源。

**我们的推测**：相对命令让系统不依赖全局定位、长时间也稳，但路线会漂（[例 3](#实例-3-相对命令会漂多远)）；对遥操作没关系（人看着画面纠正），对自主策略则意味着导航这类需要全局位置的任务要靠上层自己处理。

</details>

---

## 🚶 具体实例：用官方的 PICO 样例从头算一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（13 节）：环境设定 / 例 1 走路时的 35 维命令 / 例 2 蹲下时根部速度几乎是 0 / 例 3 相对命令会漂多远 / 例 4 底层的 1432 维观测 / 例 5 数据集按什么比例抽 / 例 6 手的插值 / 例 7 脖子 / 例 8 读表 II / 例 9 读表 III / 例 10 64 步动作块 / 例 11 读图 14 与 Kick-T / 例 12 延迟差多少</summary>

<h3 id="实例-环境设定">环境设定</h3>

- **动作**：官方仓库 `assets/example_motions/` 里的两段 PICO 样例（README：作者自己录的，没有版权问题）：`0807_yanjie_walk_001`（走出去再走回来，13.9 s，约 29.9 fps）和 `0807_yanjie_walk_006`（第 2.5–5.5 s 蹲下再站起，15.0 s）。已经是 GMR 重定向好的 G1 动作：每帧有根部位置、朝向和 29 个关节角。
- **命令**：照 `deploy_real/server_motion_lib.py` 的 `build_mimic_obs` 和 `pose/utils/motion_lib_pkl.py` 用 numpy 重写（不需要 Isaac Gym）：根部速度用中心差分，角速度用四元数的中心差分，转到根部坐标系，取 $x$、$y$ 速度、高度、横滚、俯仰、偏航角速度，加 29 个关节角，每 0.02 s 发一帧（`--steps 1`，即下一帧的参考）。
- **底层**：官方权重 `assets/ckpts/twist2_1017_20k.onnx`（输入 1432 维、输出 29 维），照 `deploy_real/server_low_level_g1_sim.py` 拼观测、算 PD（MuJoCo 3.16、`assets/g1/g1_sim2sim_29dof.xml`、仿真步长 1 ms），去掉 Redis 直接在一个进程里跑；策略频率用 **50 Hz**（训练配置和真机配置都是 50 Hz，`sim2sim.sh` 写的 100 Hz 我们也跑了一遍，漂移的量级一样）。动作开始前先站 1 s。
- **这不是论文的实验**：论文没有报底层控制器的定量跟踪误差；下面的误差、漂移都是我们这次复现的结果。动画和演示里画 G1 时，把每段的朝向按窗口中间那一帧摆正，参考和跟出来的各摆各的。

<h3 id="实例-1-走路时的-35-维命令">例 1：走路时的 35 维命令</h3>

走路样例的第 2.0 s：

- 根部 6 维：$\dot x=0.967$ m/s（向前）、$\dot y=-0.138$ m/s、高度 $z=0.815$ m、横滚 $0.056$ rad、俯仰 $-0.084$ rad、偏航角速度 $\dot\psi=-0.166$ rad/s；
- 腿：左膝 0.85 rad（左腿在摆动）、右膝 0.04 rad（右腿撑地）；两髋俯仰都接近 0；
- 上身：腰俯仰 0.13 rad，两肘 1.24 / 1.32 rad（手臂自然弯着）。

35 维里没有一个是「机器人在世界里的哪儿」：速度、高度、倾角都能从机器人自己的传感器得到对应量。

<h3 id="实例-2-蹲下时根部速度几乎是-0">例 2：蹲下时，根部速度几乎是 0</h3>

蹲下样例的第 4.27 s（蹲到最低）：

- 根部：$\dot x=0.052$、$\dot y=0.064$ m/s，偏航角速度 $0.013$ rad/s——几乎不动；高度 $z=0.419$ m（站着时 0.808 m），俯仰 0.136 rad；
- 腿：两髋俯仰 −1.57 rad、左膝 2.28、右膝 2.21 rad、两踝俯仰 −0.69 / −0.61 rad；腰俯仰 0.52 rad。

如果接口只给根部速度，这一帧几乎没有信息；告诉机器人「怎么蹲」的是 12 个腿部关节角。官方控制器跟出来：骨盆最低 0.404 m（参考最低 0.419 m），这一帧左右膝 2.24 / 2.18 rad；4 s 的窗口里 29 个关节的平均绝对误差 0.081 rad（腿 0.089、腰 0.054、手臂 0.079）。走路那段 4 s 窗口是 0.053 rad。

<h3 id="实例-3-相对命令会漂多远">例 3：相对命令会漂多远</h3>

整段走路样例（13.9 s，走出去约 5 m、转身走回来）。把参考的起点和朝向对齐到机器人的起点：

- 参考的骨盆走了 10.7 m（每 0.2 s 取一点、连起来的路程，含身体左右晃），机器人走了 9.3 m；
- 两条路线的形状一样（走出去、转身、走回来），但方向慢慢偏开：第 5 s 相距 1.17 m，第 10 s 1.62 m，中途最大 2.01 m，终点 0.99 m；
- 偏航：参考转了约 204°，机器人转了约 213°。

机器人没有摔、关节也跟得上，只是路线漂了：命令里只有速度和偏航角速度，积分的误差没人纠正。遥操作时操作员看着画面会自己纠正（我们的理解）。

<h3 id="实例-4-底层的-1432-维观测">例 4：底层的 1432 维观测</h3>

照 `server_low_level_g1_sim.py`（和训练配置一致）：

| 部分 | 维数 |
|---|---|
| 当前命令 $\mathbf p _ {\text{cmd}}$ | 35 |
| 本体感受：根部角速度 3（× 0.25）+ 横滚俯仰 2 + 关节角减默认 29 + 关节速度 29（× 0.05，四个踝关节置 0）+ 上一步动作 29 | 92 |
| 10 步历史，每步 35 + 92 | 1270 |
| 「未来」命令（只取当前帧） | 35 |
| **合计** | **1432** |

（脚本注释写的是 1402，算错了：$127\times 11+35=1432$；ONNX 的输入确实是 1432 维。）输出 29 维动作 $a$，关节目标 $=0.5a+$ 默认姿态，PD 的 $K_P$：髋 100、膝 150、踝 40、腰 150、肩肘 40、手腕 4（sim2sim）。

<h3 id="实例-5-数据集按什么比例抽">例 5：数据集按什么比例抽</h3>

`twist2_dataset.yaml`：19,426 段，PICO 的 73 段权重 10、其余 19,353 段权重 1。按权重，一开始抽到 PICO 段的概率是 $730/(19{,}353+730)=730/20{,}083\approx3.6\%$，是它在段数里占比（0.38%）的约 10 倍。训练中还会按每段动作的难度调整采样（`motion_curriculum`），这个比例会变。

<h3 id="实例-6-手的插值">例 6：手的插值</h3>

握力抓的左手：张开是 7 个 0，闭合是（拇指 0、1.0、1.74，中指 −1.57、−1.74，食指 −1.57、−1.74）rad。$\alpha=0.5$ 时目标就是闭合的一半：（0、0.5、0.87，−0.785、−0.87，−0.785、−0.87）。按住扳机，$\alpha$ 每个循环加 0.05，100 Hz 下 0.2 s 从全开到全闭；松开就停在当前的 $\alpha$。

<h3 id="实例-7-脖子">例 7：脖子</h3>

人头相对脊柱向左转 30°、低头 20°（先偏航后俯仰），$R _ {\text{rel}}=R_z(30^\circ)R_y(20^\circ)$，$r _ {11}=\cos30^\circ\cos20^\circ=0.814$，$r _ {21}=\sin30^\circ\cos20^\circ=0.470$，$r _ {31}=-\sin20^\circ=-0.342$：$\psi=\operatorname{atan2}(0.470,0.814)=30^\circ$，$\theta=\arcsin(0.342)=20^\circ$，论文的式子原样取回两个角。代码再乘 1.5：偏航 45°、俯仰 30°——机器人的头比人转得多。

<h3 id="实例-8-读表-ii">例 8：读表 II</h3>

双臂取放 98 条 / 18.5 分钟 = 每分钟 5.3 条，$18.5\times60/98=11.3$ s 一条（表里写 11 s）；移动取放 46 / 19.5 = 每分钟 2.4 条，$19.5\times60/46=25.4$ s 一条（表里 25 s）。移动取放每条多花一倍多的时间，因为要走过去。

<h3 id="实例-9-读表-iii">例 9：读表 III</h3>

- 平均用时就是新手和专家的平均：$(75.6+59.9)/2=67.75\approx67.8$ s；
- 完整系统的成功率 $20/23=87.0\%$；去掉立体 $20/27=74.1\%$，用时多 45%（98.3 / 67.8）；去掉脖子 $16/29=55.2\%$，用时多 66%（112.3 / 67.8），新手最惨：17 次只成功 7 次、144 s；
- 去掉第一视角：成功率和完整系统一样（20/23），平均 68.7 s 也差不多，但这是专家站在旁边、43 s 拉低的；新手要 94.3 s。

<h3 id="实例-10-64-步动作块">例 10：64 步动作块</h3>

一次预测 64 步，执行频率 30 Hz：$64/30=2.13$ s（正文说约 2 秒）；只执行前 48 步：$48/30=1.6$ s 后重新预测。推理 20 Hz（一次约 50 ms），远快于 1.6 s 的重规划间隔。每一步给底层的仍是 35 维身体命令；按数据网站的统一格式，再加手 14 维、脖子 2 维（我们的推算：51 维）。

<h3 id="实例-11-读图-14-与-kick-t">例 11：读图 14 与 Kick-T</h3>

WB-Dex 的 54 次：够到 49 次（90.7%）；够到之后抓起放好 33 次（$33/49=67.3\%$）；整体成功率 $33/54=61.1\%$。失败里抓失败 16 次、够不到 5 次，多数输在抓。Kick-T：$6/7=85.7\%$，训练数据 50 条，比 WB-Dex 的 170 条少得多。

<h3 id="实例-12-延迟差多少">例 12：延迟差多少（玩具）</h3>

假设操作员的手以 0.5 m/s 移动（玩具假设），机器人看到的是 0.1 s 前的目标：手落后 5 cm；TWIST 的 0.5 s 延迟则是 25 cm，已经比一个杯子还宽。这个算例只说明量级，不是论文的测量。

</details>

---

## 📁 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：目录、论文各部分落在哪个文件、论文与代码的出入、怎么跑</summary>

<h3 id="源码-目录">目录</h3>

```
TWIST2/
├── train.sh / to_onnx.sh                    # 训底层（任务 g1_stu_future，--teacher_exptid None）/ 导出 ONNX
├── sim2sim.sh / sim2real.sh                 # MuJoCo 里跑底层（策略 100 Hz）/ 真机（control_dt 0.02）
├── run_motion_server.sh / teleop.sh         # 离线动作流 / PICO 在线遥操作（Redis）
├── data_record.sh                           # 30 Hz 录数据
├── legged_gym/
│   ├── legged_gym/envs/g1/g1_mimic_future*.py   # 1432 维观测、奖励权重、动作库
│   ├── legged_gym/envs/base/humanoid_mimic.py   # 21 项奖励的实现、动作难度课程
│   └── motion_data_configs/twist2_dataset.yaml  # 19,426 段动作，PICO 73 段权重 10
├── rsl_rl/rsl_rl/modules/actor_critic_future.py # 卷积历史编码器 + MLP 主干
├── deploy_real/
│   ├── xrobot_teleop_to_robot_w_hand.py     # PICO → GMR → 35 维命令、手的 α、脖子、状态机与插值
│   ├── server_low_level_g1_sim.py / _real.py   # 底层：拼观测、跑 ONNX、PD
│   ├── server_motion_lib.py                 # 从动作文件发命令
│   └── server_data_record.py                # 录图像与状态 / 命令
├── assets/ckpts/twist2_1017_20k.onnx        # 官方权重
├── assets/example_motions/0807_yanjie_walk_*.pkl  # 10 段 PICO 样例
└── doc/TELEOP.md, TWIST2_NECK.md            # 遥操作流程与按键、颈部组装
```

身体重定向和脖子的角度在 GMR 仓库：`general_motion_retargeting/ik_configs/xrobot_to_g1.json`、`neck_retarget.py`。

<h3 id="源码-论文与代码">论文与代码</h3>

| 论文 | 代码 |
|---|---|
| 一阶段训练 | 任务 `g1_stu_future` 不加载教师（DAgger 的 KL 损失关掉）= PPO；价值网络看 1734 维特权观测；README 仍叫 teacher / student |
| 约 2 万段：GMR 7k + TWIST 13k，PICO 73 段 | 19,426 段：TWIST 12,788 + OMOMO 5,841 + AMASS 724 + PICO 73（权重 10） |
| $r _ {\text{track}}=e^{-\alpha\lVert\mathbf p _ {\text{cmd}}-\mathbf p _ {\text{cur}}\rVert}$ + 正则 | 21 项：8 项跟踪（含关键点位置，局部 + 全局）、存活、抬脚时间、11 项惩罚 |
| 50 Hz | 训练 0.002 s × 10、真机 `control_dt: 0.02` 都是 50 Hz；`sim2sim.sh` 用 100 Hz |
| PD 增益未写 | 腿和腰一致；手腕训练 40 / 5、sim2sim 4 / 0.2、真机 20 / 1 |
| $\alpha$ 从手部信号算出 | 按住扳机 / 侧握键每循环 ±0.05（100 Hz） |
| 脖子：ZYX 的偏航、俯仰 | PICO 坐标系里按 xyz 分解再换轴，乘 1.5 |
| 暂停后插值 | 线性，默认 1 s；退出时插值回默认姿态 |
| 扩散策略、数据过滤界面 | 未放出（README：高层策略基于 iDP3，另开仓库） |

<h3 id="源码-怎么跑">怎么跑（README）</h3>

```bash
# 两个 conda 环境：twist2（Python 3.8，Isaac Gym，训练与部署）和 gmr（Python 3.10，在线重定向）
bash train.sh 1021_twist2 cuda:0          # 训底层
bash to_onnx.sh $YOUR_POLICY_PATH          # 导出 ONNX
bash run_motion_server.sh                  # 先发一段离线动作（也给 Redis 热身）
bash sim2sim.sh                            # MuJoCo 里跑底层，默认站着；再开一个终端发动作或遥操作
bash teleop.sh                             # PICO 在线遥操作（需要 XRoboToolkit 与 PC 服务）
bash sim2real.sh                           # 真机（网线直连 G1）
bash data_record.sh                        # 录数据
```

我们在[具体实例](#实例-环境设定)里做的，就是去掉 Redis 把 `run_motion_server.sh` 和 `sim2sim.sh` 合成一个进程跑。

</details>

---

## 🔗 在学习路线中的位置

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上承 TWIST、GMR、H2O / OmniH2O 与 iDP3；同期的 AMO、CLONE、HOMIE；下启用遥操作数据训全身自主策略的工作</summary>

- **上承**：[TWIST](../TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.html)（同一作者：动捕 + 全身跟踪的遥操作；底层控制器和 13k 段数据从这里来）、[GMR](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html)（重定向）、[H2O](../../03_High_Impact_Selection/H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation/H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation.html) 与 [OmniH2O](../../03_High_Impact_Selection/OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html)（用 VR 遥操作人形、拿数据训自主策略）、[iDP3](../../03_High_Impact_Selection/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies.html)（高层策略的基础）、[Diffusion Policy](../../01_Foundational_RL/Diffusion_Policy/Diffusion_Policy.html)、[ToddlerBot](../../12_Hardware_Design/ToddlerBot_Open-Source_ML-Compatible_Humanoid_Platform_for_Loco-Manipulation/ToddlerBot_Open-Source_ML-Compatible_Humanoid_Platform_for_Loco-Manipulation.html)（颈部设计的参考）、[Open-TeleVision](../Open-TeleVision__Teleoperation_with_Immersive_Active_Visual_Feedback/Open-TeleVision__Teleoperation_with_Immersive_Active_Visual_Feedback.html)（主动第一视角的遥操作）。
- **同期对照**：AMO、[CLONE](../CLONE__Closed-Loop_Whole-Body_Humanoid_Teleoperation_for_Long-Horizon_Tasks/CLONE__Closed-Loop_Whole-Body_Humanoid_Teleoperation_for_Long-Horizon_Tasks.html)（VR、腿只跟根部速度）、[HOMIE](../../03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.html)（外骨骼驾驶舱、上下身解耦）、[Mobile-TeleVision](../Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control/Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control.html)、[HumanPlus](../HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans/HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans.html)。
- **视觉人形控制**：[HEAD](../../08_Navigation/HEAD__Hand-Eye_Autonomous_Delivery_Humanoid_Navigation_Locomotion_and_Reaching/HEAD__Hand-Eye_Autonomous_Delivery_Humanoid_Navigation_Locomotion_and_Reaching.html)（关键点分层框架，限于简单导航）、VideoMimic、PDC（只在仿真）——论文在相关工作里拿它们对比。
- **工程意义**：「底层通用跟踪器 + 统一的命令接口」让遥操作和自主策略共用一个执行器，采到的命令就是自主策略的动作；「颈部 + 第一视角立体」把遥操作者的视角和策略的输入对齐。这两点是后来很多「遥操作采数据 → 训全身策略」工作的基本做法（我们的观察）。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：七问七答</summary>

**Q1：TWIST2 和 TWIST 的主要区别是什么？**
A：人的动作从光学动捕换成 PICO 头显 + 两个小腿追踪器（便携、免标定、约 1000 美元、一分钟装好）；加了 250 美元的两自由度脖子和 ZED Mini，操作员看机器人的第一视角立体画面；底层控制器从教师—学生两阶段换成一阶段 PPO；手柄当控制中心，一个人就能完成整个采集；延迟从 0.5 s 降到 0.1 s 以内；还在采来的数据上训了自主的全身视觉运动策略。

**Q2：35 维命令由什么组成？为什么根部给相对量？**
A：根部 $x$、$y$ 速度、高度、横滚、俯仰、偏航角速度，加 29 个关节角。根部给相对量，系统就不需要准确的全局状态估计，长时间运行也稳；代价是路线会漂（我们的复现里 14 s 走路，终点差约 1 m），遥操作时人会纠正。

**Q3：为什么下身要给关节角，不能像 AMO、CLONE 那样只给根部速度？**
A：只给根部速度，下身怎么动由控制器自己决定，做不了用脚踢、蹲着够东西、跳舞这类需要精确下身姿态的任务。比如蹲到最低时根部速度几乎是 0，真正告诉机器人怎么蹲的是 12 个腿部关节角。Kick-T 就依赖这一点。

**Q4：PICO 的全局位置不准，重定向怎么处理？**
A：改 GMR 的第二阶段：下身同时对位置和朝向（脚的位置对准，减少打滑），上身只对朝向（不受全局位置跳变影响）；人的位置先换到骨盆坐标系。

**Q5：为什么高层策略的本体感受用历史命令而不是机器人状态？**
A：一是让高层和底层解耦，可以分开训练、部署；二是在高维系统里不依赖带噪的原始状态，减少误差累积。高层输出的也是同一个 $\mathbf p _ {\text{cmd}}$，所以采数据和执行一致。

**Q6：表 III 里「去掉第一视角」为什么最快？那还需要第一视角吗？**
A：专家站在机器人旁边、用 VR 透视直接看，10 条只要 43 s；但这只对眼前的桌面任务成立，长时程的移动任务（走到别的房间）必须靠机器人的第一视角远程操作。去掉立体视觉会抓得偏高、去掉脖子会看不到视野外的东西，都会变慢、失败更多。

**Q7：WB-Dex 的失败主要在哪？**
A：在抓：54 次里 49 次够到，够到后只有 33 次抓起放好；杯子很轻，要非常精确，一点漂移就抓空。

</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：2026-06-21 · 初读（摘要速读）；2026-10-19 · 读代码和做算例时看到的六件事</summary>

- 初读的印象：卖点是「把 TWIST 的全身遥操作做成人人能用的采集工具」，算法上的新东西不多，系统设计和工程细节是主体。

第二版补充（都是我们的观察）：

1. **数字的口径不一**：「多少分钟采多少条」在摘要、引言、图 1、图 2、表 II、项目页各有一个说法，表 II 最具体（18.5 分钟 98 条）。
2. **「一阶段」在代码里是一个关掉教师的 DAgger 任务**，README 还留着教师 / 学生的叫法，读代码时容易误会。
3. **奖励比论文写的丰富得多**：21 项，跟踪的不只是 35 维命令，还有关键点位置。
4. **观测里的「未来」只有当前一帧**：网络结构为未来帧留了接口，但配置里只取 `[0]`，部署时就把当前命令再拼一遍。
5. **相对命令的漂移**：我们用官方权重在 MuJoCo 里跑官方样例，走 14 s 终点差约 1 m，关节跟得很好，路线在漂。
6. **频率与增益**：sim2sim 用 100 Hz、手腕增益 4，和训练、真机都不一样；照着 `sim2sim.sh` 跑不完全等于真机的设置。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX、开放问题、旧版笔记的改正</summary>

<h3 id="a-bibtex">A. BibTeX</h3>

```bibtex
@article{ze2025twist2,
  title   = {TWIST2: Scalable, Portable, and Holistic Humanoid Data Collection System},
  author  = {Ze, Yanjie and Zhao, Siheng and Wang, Weizhuo and Kanazawa, Angjoo and Duan, Rocky and
             Abbeel, Pieter and Shi, Guanya and Wu, Jiajun and Liu, C. Karen},
  journal = {arXiv preprint arXiv:2511.02832},
  year    = {2025}
}
```

<h3 id="b-开放问题">B. 开放问题</h3>

1. PICO 的肘、膝没有追踪器，加追踪器反而不稳——有没有办法在不加硬件的前提下补上肘、膝的估计？
2. 相对命令会漂：自主策略做长距离导航时，全局位置该放在哪一层处理？
3. 高层只用历史命令、不看机器人真实状态：底层跟不上时（比如摔了一半），高层能不能察觉？
4. 统一到 G1 + Dex3-1 + TWIST2 Neck，能让各家的数据直接合起来训吗？不同操作员的习惯会不会成为新的「形态差异」？

<h3 id="c-旧版笔记的改正">C. 旧版笔记的改正</h3>

- **「15 分钟采集 100 条演示、近 100% 成功率」**：是摘要的说法；表 II 是 18.5 分钟 98 条（双臂）、19.5 分钟 46 条（移动），都是 100%，补上各处说法的对照。
- **「代码：全开源（系统 + 数据集）」**：底层、遥操作、录数据、颈部、数据都放出了，高层扩散策略还没有。
- **「保留完整全身控制」**：补上具体的接口——35 维命令（根部相对量 + 29 个关节角）和两个设计理由。
- **方法**：旧版只有四条概述，补上两层结构的式子、颈部的电机与成本、PICO 的配置、改过的 GMR 第二阶段（式 8）、手的 $\alpha$ 插值（式 7）、脖子的角度（式 10）、一阶段训练的数据与奖励、遥操作链路、单人操作、安全插值、延迟、扩散策略的细节。
- **实验**：补上表 II、表 III、图 12 的三点观察、WB-Dex 的 54 次试验、Kick-T 的 6/7。
- **其他**：补上代码与论文的出入、局限与「规模化人形数据」的讨论；新增用官方样例和官方权重做的具体实例。

</details>

---

## 📎 参考来源

- arXiv：<https://arxiv.org/abs/2511.02832>（v1，2025-11-04，读的是 LaTeX 源码）
- 项目主页：<https://yanjieze.com/TWIST2/>（动画第 1、3–5、8、11、13、14、17 幕的真机片段剪自这里的视频；第 1 幕的动捕服片段来自项目页转载的 TWIST 视频）
- 代码：<https://github.com/amazon-far/TWIST2>（`master`）；重定向与脖子：<https://github.com/YanjieZe/GMR>
- 数据：<https://twist-data.github.io/>
- 复现：官方权重 `twist2_1017_20k.onnx`、官方样例 `0807_yanjie_walk_001` / `006`，MuJoCo 3.16；G1（带 Dex3-1 手）的模型与材质：[Robot Retarget Online](https://github.com/ImChong/Robot_Retarget_Online) 仓库里的 `unitree_g1_with_hands`
