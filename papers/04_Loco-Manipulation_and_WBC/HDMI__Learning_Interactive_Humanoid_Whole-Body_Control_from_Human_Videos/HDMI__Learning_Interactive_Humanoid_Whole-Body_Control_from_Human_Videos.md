---
layout: paper
title: "HDMI: Learning Interactive Humanoid Whole-Body Control from Human Videos"
zhname: "HDMI：从人类视频学习人形全身交互控制"
category: "Loco-Manipulation and WBC"
arxiv: "2509.16757"
demos: ["hdmi"]
---

# HDMI: Learning Interactive Humanoid Whole-Body Control from Human Videos
**把物体和接触写进参考，机器人和物体一起跟：单目视频经 GVHMR + LocoMujoco 变成 G1 的动作，物体轨迹和期望接触点逐段人工标注；DeepMimic 式的 PPO 训练加三个统一的设计——物体与接触点都换到机器人根部坐标系、动作加在参考关节角上的残差动作、「手贴近接触点、力够就行」的交互奖励；宇树 G1 零样本上真机，连续开门穿门 67 次，真机 6 个任务、仿真 14 个任务用同一套框架**

> 📅 阅读日期: 2026-10-05（2026-10-23 第二版：对照 arXiv v3 的 LaTeX 源码和官方仓库逐条核查重写；新增十八幕讲解动画、三个交互演示和配音视频）
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 人—物交互 · 从视频学习 · 机器人—物体共同跟踪 · 残差动作 · 交互奖励
>
> ℹ️ 笔记对照 [arXiv 2509.16757](https://arxiv.org/abs/2509.16757)（v3，2025-09-27；读的是 arXiv 上的 LaTeX 源码：正文、表 I–II、图 1–9）、[项目页](https://hdmi-humanoid.github.io/)和官方仓库 [LeCAR-Lab/HDMI](https://github.com/LeCAR-Lab/HDMI)（2026-01-17 的 `main`，提交 `32282f6`，含 `FAQ.md`）。论文没写的数（交互奖励的 $\sigma$ 与阈值、观测维数、终止的实现、域随机化范围、教师—学生的训练流程）都取自代码，下文逐处标明。动画与「🚶 具体实例」里的 G1 是我们按**官方开源的搬行李箱参考**和**仓库里录下的一段仿真回放**做的 3D 渲染，**不是论文的实验**，见[环境设定](#实例-环境设定)。

---

## 📋 基本信息

| 项目 | 链接 / 内容 |
|------|------|
| **arXiv** | [2509.16757](https://arxiv.org/abs/2509.16757)（v1 2025-09-20，v2 09-23，v3 09-27） |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2509.16757) |
| **项目主页** | [hdmi-humanoid.github.io](https://hdmi-humanoid.github.io/)（真机的开门穿门、35 分钟加速剪辑、搬纸箱、楚门式鞠躬、面包箱与泡沫垫，以及 12 个仿真任务的视频；没有标倍速） |
| **代码** | [LeCAR-Lab/HDMI](https://github.com/LeCAR-Lab/HDMI)（训练代码、13 个任务的配置、参考动作数据、`FAQ.md`）；真机部署在 [EGalahad/sim2real](https://github.com/EGalahad/sim2real) |
| **作者** | Haoyang Weng、Yitang Li、Nikhil Sobanbabu、Zihan Wang、Zhengyi Luo、Tairan He、Deva Ramanan、Guanya Shi |
| **机构** | 卡内基梅隆大学机器人研究所（LeCAR Lab） |
| **平台** | Unitree G1（29 个自由度；策略控制其中 23 个，不含手腕）；训练在 IsaacSim（IsaacLab v2.2.0） |
| **数据** | 单目 RGB 视频 → GVHMR 估计 SMPL 人体 → LocoMujoco 重定向到 G1；物体轨迹与接触人工标注。例外：搬行李箱的参考取自 OMOMO 数据集 |
| **关键词** | Humanoid–object interaction, learning from human videos, robot–object co-tracking, residual action, interaction reward |

**一行定位**：DeepMimic、BeyondMimic 这一路的动作跟踪只跟机器人自己的身体，跟得再好也说明不了门开没开、箱子动没动。HDMI 把**物体的轨迹、接触信号和期望接触点**写进参考，让一个 RL 策略同时跟住机器人和物体；换任务只换一段视频和标注，不改网络结构、不重写奖励。

---

## 🎯 一句话总结

> HDMI（HumanoiD iMitation for Interaction）把人形—物体交互写成**机器人—物体共同跟踪**：参考里除了机器人的动作，还写进物体的轨迹、接触信号和物体坐标系里的期望接触点（$s_t^{\mathrm{ref}} = (s_t^{\mathrm{robot}}, s_t^{\mathrm{obj}}, c_t)$）；参考来自单目视频（GVHMR + LocoMujoco），物体轨迹和接触点每段人工标注（问答原话）。训练沿用 DeepMimic 的三件套（参考状态初始化、相位、误差终止）和 PPO，再加三个统一的设计：**统一的物体表示**（物体位姿和接触点都换到机器人根部坐标系，换物体不改网络）、**残差动作**（$\theta_t^{\mathrm{target}} = \theta_t^{\mathrm{ref}} + a_t$，跪姿这种离默认站姿很远的动作一开始就能在参考附近探索）、**交互奖励**（式 1：$\exp(-\lVert p _ {\mathrm{eef}} - p _ {\mathrm{target}}\rVert_2/\sigma _ {\mathrm{pos}})$ 乘封顶为 1 的力项；式 2：按接触信号门控取平均）。官方代码里交互奖励的 $\sigma _ {\mathrm{pos}} = 0.3$ m、$\sigma _ {\mathrm{frc}} = 40$ N、$F _ {\mathrm{thres}} = 10$ N，要接触时乘 5、不用接触时给 1；训练其实是**特权教师 + 蒸馏学生**两步（PPO-ROA），残差动作只在教师里。真机上 G1 靠动捕拿到骨盆和物体的位姿，**连续开门穿门 67 次（约 34 分钟）**，搬纸箱连续 7 次、楚门式鞠躬连续 3 次；仿真 14 个任务里 6 个上了真机。消融：交互奖励在多数任务上差别不大，关键在「参考不准」（搬行李箱，两个都去掉成功率 0）和「接触位置要准」（推大箱子，开着接触终止评测时从 0.98 掉到 0.32）；残差动作让 8 个任务的 24 项跟踪误差全都最低，搬行李箱时没有它学不会跪下。

> 🎮 **本文内嵌 1 段讲解动画、1 段配音视频和 3 个交互演示**（不用装任何东西）：
> [十八幕动画：HDMI 全流程](#hdmi-explainer-anim) —— 约 288 秒串完「只跟身体不够 → 三段流水线（图 2）→ 从视频到参考 → 一帧参考 → DeepMimic 式训练三件套 → 统一的物体表示（图 3）→ 残差动作 → 交互奖励（式 1–2）→ 奖励与终止（表 I、表 II）→ 代码里的教师与学生 → 上真机：动捕给位姿 → 开门穿门 67 次 → 搬箱子与楚门式鞠躬 → 仿真 14 个任务 → 交互奖励的消融（图 6）→ 交互奖励管什么（图 7）→ 残差动作的消融（图 8、图 9）→ 局限与之后」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。
> [配音讲解视频](#hdmi-video) —— 同样十八幕，加中文配音与字幕，竖屏，可下载
> [参考与回放逐帧看](#demo-reference) —— 官方的搬行李箱参考和仓库里录下的仿真回放并排看，每一帧双手离期望接触点多远、位置项多少
> [交互奖励计算器](#demo-reward) —— 两只手各给一个距离和接触力，按式 1–2 与官方代码的参数算交互奖励
> [消融实验的数字](#demo-results) —— 图 6、图 7a、图 8、图 9a 从矢量图里抽出来的数

> 🚶 [具体实例](#实例-环境设定)用官方数据从头算一遍：一段参考里存了什么、学生的 615 维观测怎么拼、两只手的交互奖励、第 4.70 s 参考与回放的手离接触点多远、第 3.20 s 跪姿离默认站姿多少个动作单位、连续 25 步终止，最后读图 6、图 7、图 8 与图 9a。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **HDMI** | HumanoiD iMitation for Interaction | 本文：面向交互的人形模仿 |
| **HOI** | Human–Object Interaction | 人—物交互 |
| **GVHMR** | Gravity-View Human Motion Recovery | 从单目视频恢复世界坐标里的 SMPL 人体动作 |
| **SMPL** | Skinned Multi-Person Linear model | 参数化人体模型 |
| **OMOMO** | Object Motion Guided Human Motion Synthesis | 人搬物体的动捕数据集；搬行李箱的参考取自这里 |
| **RSI** | Reference State Initialization | 参考状态初始化：回合从参考的随机一帧开始 |
| **PPO** | Proximal Policy Optimization | 训练用的强化学习算法 |
| **ROA** | Regularized Online Adaptation | 正则化在线适应；代码的教师—学生训练借鉴它（问答原话） |
| **eef** | End-Effector | 末端：手（手腕偏航连杆往前 5 cm）或脚 |
| **DR** | Domain Randomization | 域随机化：质量、摩擦、质心、关节零位、动作延迟、物体质量与尺寸 |
| **Mocap** | Motion Capture | 动作捕捉；真机上给骨盆和物体的全局位姿 |

---

## 🎬 十八幕动画：HDMI 全流程 {#hdmi-explainer-anim}

<div class="paper-demo" data-demo="hdmi-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#hdmi-video}

<div class="paper-demo" data-demo="hdmi-video" data-src="media/hdmi_explainer_video.mp4" data-poster="media/hdmi_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/hdmi_explainer_video.mp4" download="HDMI_讲解视频.mp4">下载 mp4（19.8 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（要解决什么问题、方法详解、实验结果）按小节收起，再往后的具体实例、源码对照、在路线中的位置、面试和附录各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 3–8、16、18 幕里的 G1 和行李箱是我们按官方仓库的数据渲染的：`data/motion/g1/omomo/sub1_suitcase_011` 是搬行李箱的参考（OMOMO 重定向，472 帧），`record_motion/x65r1823` 是仓库里录下的一段 IsaacSim 回放（447 帧）；按关节角做正运动学，3D 外形照抄 [Robot Retarget Online](https://imchong.github.io/Robot_Retarget_Online/) 的 three.js 材质与光照，用正交相机逐帧离线渲染，期望接触点、手的末端点和两者的距离按同一个相机投影叠在上面；这两段和交互演示、「🚶 具体实例」是同一组数字。第 2、6、7、11、12、16、17 幕用论文图 2、3、9c、4a、5、7b / 7c、9b 的裁剪，第 9、15、16、17 幕的柱和曲线照表 I–II 与图 6–9a 的数重画（图 6–9a 是从论文 PDF 的矢量图里抽出的柱高与折线）；第 1、12–14 幕的真机与仿真画面剪自[项目页](https://hdmi-humanoid.github.io/)的视频（开门穿门、35 分钟加速剪辑、搬纸箱、面包箱、泡沫垫、楚门式鞠躬、12 个仿真任务；仿真片段按 2.5 倍速播放），只做讲解引用。

---

## ❓ 要解决什么问题

<div class="mermaid">
flowchart TB
    T["动作跟踪（DeepMimic / ASAP / BeyondMimic）<br/>只跟机器人自己的身体"] --> Q["开门、搬箱子：要看门开没开、箱子动没动"]
    Q --> C1["难点一：数据少<br/>同时带三维人体和物体运动的数据远少于纯人体动作"]
    Q --> C2["难点二：RL 难训<br/>参考不完美时怎么建立接触？跪、弯腰时怎么平衡？"]
    P["以前：每个任务单独做参考和奖励（搬箱子）<br/>或者靠 VLM / 基于模型的规划器"] --> G["换一个任务就要重新设计"]
    C1 --> H["HDMI：从单目视频学，参考里写进物体与接触<br/>一个 RL 策略同时跟机器人和物体"]
    C2 --> H
    G --> H
    H --> D["三个统一的设计：物体表示 · 残差动作 · 交互奖励"]

    style Q fill:#e8f4fd,stroke:#1f78b4
    style H fill:#e8f8e8,stroke:#27ae60
</div>

### 只跟身体不够（引言）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：从人的动作学，已经让人形走得、跑得、跳得像人；推广到全身、接触密集的人—物交互有两个难点：数据少、RL 难训；以前的做法要么每个任务单独设计，要么靠高层规划器</summary>

论文开篇：从人的动作学，是人形机器人的主流路线——大量人体数据让人形学会了敏捷的行走（ASAP、BeyondMimic、ExBody2），也让机械臂学会了灵巧操作。但推广到**全身、接触密集的人—物交互**（HOI）时有两个难点：

1. **数据少**：和自由空间里的行走相比，同时带三维人体和物体运动的数据很稀缺。
2. **RL 训练的新问题**：参考动作不完美时怎么引导出想要的接触？抱着物体、处在跪下这类难姿势时怎么保持平衡？

以前的人形—物体交互要么依赖**特定任务的参考生成流程或手工奖励**（搬箱子的 Opt2Skill 等），通用性有限；要么需要**高层的 VLM 或基于模型的规划器**（WildLMa、HITTER）。HDMI 的关键想法：**用一个端到端的 RL 策略同时跟踪视频里的机器人动作和物体运动**，绕开特定任务的奖励工程。它支持不同的身体部位（手、脚）和不同类型的物体（铰接 / 刚体、固定底座 / 可移动）。

</details>

### 贡献

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一个直接从 RGB 视频学人形交互技能的简单通用框架；三个简单统一的组件；G1 上的大量真机实验</summary>

论文列了三条：

- **HDMI**：直接从 RGB 视频学人形交互技能的简单通用框架；作者说据他们所知，这是第一个能从人类视频直接学**自主**的全身人形—物体交互技能的通用框架。
- 为了让复杂交互的训练稳定高效，设计了**三个简单统一的组件**：统一的**物体表示**、稳定探索难姿势的**残差动作空间**、在参考不完美时也能促成稳定精确接触的统一**交互奖励**。
- 在 Unitree G1 上做了大量 sim-to-real 实验：**连续 67 次**双向开门穿门，另外 **6 个**移动操作任务上了真机，仿真里 **14 个**任务。

</details>

---

## 🔧 方法详解（第 III 节）

<div class="mermaid">
flowchart TB
    subgraph S1["① 视频 → 参考（III-A）"]
        V["单目 RGB 视频"] --> G["GVHMR：世界坐标里的 SMPL 人体"] --> L["LocoMujoco：重定向到 G1"]
        V --> A["人工标注：物体轨迹 + 期望接触点<br/>每段视频一个后处理脚本"]
        L --> R["参考：s_t^ref = (机器人, 物体, 接触信号 c_t)<br/>接触点在物体坐标系里"]
        A --> R
    end
    subgraph S2["② 共同跟踪训练（III-B，IsaacSim）"]
        R --> I["参考状态初始化 · 相位 φ · 误差终止（DeepMimic）"]
        I --> O["观测：本体感受 + 相位 + 物体与接触点（根部坐标系）"]
        O --> PI["策略：残差动作 θ_target = θ_ref + a"]
        RW["奖励：机器人跟踪 + 物体跟踪 + 交互奖励 + 正则（表 I）"] --> PI
        TR["终止：表 II，连续 25 步超标"] --> PI
    end
    subgraph S3["③ 真机（第 IV 节）"]
        M["动捕：骨盆与物体的全局位姿"] --> B["换到根部坐标系"] --> D["G1 零样本部署"]
    end
    PI --> D

    style R fill:#e8f4fd,stroke:#1f78b4
    style PI fill:#fdebd0,stroke:#e67e22
    style D fill:#e8f8e8,stroke:#27ae60
</div>

### 从视频到参考（III-A）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：GVHMR 估计 SMPL 人体、LocoMujoco 重定向到 G1；物体轨迹和接触点每段人工标注、配专门的后处理脚本；搬行李箱的参考取自 OMOMO；官方这段参考 472 帧、50 fps</summary>

最大的难题是**怎么描述想要的行为**。HDMI 把人和物体交互的单目 RGB 视频当作丰富、可扩展的数据源：用 **GVHMR** 做 SMPL 姿态估计、用 **LocoMujoco** 重定向（官方 README 写的是「GVHMR → GMR / LocoMujoco」），再后处理并**标注物体轨迹和接触信号**，得到结构化的参考数据集。

物体那一半是怎么来的，论文正文只说「post-process and annotate」。官方 `FAQ.md` 第 1 条讲清楚了：**每段视频都人工标注物体轨迹和期望的接触位置，再跑一个这段视频专用的后处理脚本**。以行李箱为例：标出拿起和放下的两帧，拿着的时候让箱子跟着手腕，其余时间放在地上，再平滑插值。以后可能接入 [OmniRetarget](../../02_Motion_Retargeting/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.html) 这类自动流程。

第 IV 节补了一句：**所有参考都来自 RGB 视频，只有搬行李箱是从 OMOMO 数据集重定向的**。OMOMO 的质量高，但很多动作要用手抓握（搬显示器、台灯），需要灵巧手，不在这篇的范围里。

**官方数据**（`data/motion/g1/omomo/sub1_suitcase_011/motion.npz`）：472 帧、50 fps（9.44 s）；`body_pos_w` / `body_quat_w` 是 28 个 G1 连杆加 1 个行李箱的位姿，`joint_pos` 是 29 个关节角，`object_contact` 是逐帧的接触信号（170 帧要接触，第 3.40–6.78 s）。

</details>

### 一帧参考：机器人、物体、接触（III-A）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：s_t^ref = (s_t^robot, s_t^obj, c_t)；机器人是根部位置、朝向与参考关节角，物体是位置、朝向（铰接物体再加关节角），c_t ∈ {0, 1}；期望接触点定义在物体坐标系里</summary>

第 $t$ 帧的参考：

$$
s_t^{\mathrm{ref}} = (s_t^{\mathrm{robot}},\ s_t^{\mathrm{obj}},\ c_t)
$$

- $s^{\mathrm{robot}}$：参考的根部位置 $p^{\mathrm{robot}}$、根部朝向 $q^{\mathrm{robot}}$ 和参考关节角 $\theta_t^{\mathrm{ref}}$；
- $s^{\mathrm{obj}}$：物体的位置 $p^{\mathrm{obj}}$ 和朝向 $q^{\mathrm{obj}}$；门、折叠椅这类**铰接物体**还多一个关节状态 $\theta^{\mathrm{obj}}$；
- $c_t \in \{0, 1\}$：这一帧是不是该接触；
- 另外每帧还有**期望接触点** $p_t^{\mathrm{contact}}$，定义在**物体自己的坐标系**里——物体怎么动，接触点就跟着怎么动。

**代码**（`cfg/task/G1/hdmi/move_suitcase.yaml`）：行李箱两侧各一个接触点，在箱子坐标系里是 $(-0.1, \pm 0.18, 0.25)$ m；手的末端点取手腕偏航连杆（`*_wrist_yaw_link`）在自己的坐标系里往前 5 cm。其余 12 个任务各有自己的接触点和末端（用脚开门的末端是左脚踝连杆，开门穿门是右手腕加左脚踝；推大箱子换成不带手的 G1、末端是 L 形的块）。

</details>

### DeepMimic 式训练三件套（III-B）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：参考状态初始化（机器人和物体都从随机一帧开始，加小扰动）、相位变量 φ ∈ [0, 1]、跟踪误差太大就终止；奖励见表 I、终止见表 II，PPO 优化；代码里的扰动范围</summary>

论文把交互技能学习写成**机器人—物体共同跟踪**：给定参考 $\{s_t^{\mathrm{ref}}, p_t^{\mathrm{contact}}\}$，训一个全身控制策略，每一步同时跟住机器人和物体的参考轨迹。照 [DeepMimic](../../01_Foundational_RL/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills.html)、[ASAP](../../03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.html)、[BeyondMimic](../../01_Foundational_RL/BeyondMimic/BeyondMimic.html) 的做法：

1. **参考状态初始化**：每个回合，机器人**和物体**都从参考的随机一帧开始，再加一点随机扰动；
2. **相位变量**：策略收到 $\phi \in [0, 1]$，0 是动作开头、1 是结尾；论文说，跟单段动作时有它就够了；
3. **跟踪误差终止**：机器人或物体离参考太远就结束回合。

奖励（表 I）和终止条件（表 II）见下两节，用 PPO 优化。

**代码里的扰动**（`cfg/task/base/hdmi-base.yaml`）：根部位置 $x, y$ ±5 cm、$z$ ±1 cm，横滚 / 俯仰 ±0.1 rad、偏航 ±0.2 rad；线速度 ±0.2 m/s、角速度 ±0.5 rad/s；关节角和关节速度的噪声 0.1；物体位置 ±5 cm、朝向 ±0.1 rad。开门的两个任务把根部的 $x, y$ 放宽到 ±20 cm（问答说开门的起点约在 20 cm 范围里、面包箱约 10 cm）。

</details>

### 统一的物体表示（III-B-1，图 3）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：策略只看物体相对机器人根部的位姿，再加同样换到根部坐标系的期望接触点；加上本体感受和相位，换物体不改网络；代码里物体只占 10 维</summary>

为了让框架能推广到形状、类型各不相同的物体，每一步策略收到的是**物体相对机器人根部坐标系的位姿**。论文说这种「空间不变」的写法利于泛化，以后也能很自然地蒸馏成机载 RGB 或深度图像的输入（这是论文的展望，还没做）。

再给策略**期望接触点** $p^{\mathrm{contact}}$（图 3 的黄点：搬行李箱是箱子两侧，用脚开门是门板下沿，打开折叠椅是座面的边），同样换到根部坐标系；训练和部署时都这样。加上本体感受 $s_t^{\mathrm{proprio}}$ 和相位 $\phi$，这套统一的观测让框架**换一种物体不用改网络结构**。

**代码**（`observation.object`）：物体只占 **10 维**——水平位置 2 维（`object_xy_b`）、朝向的余弦和正弦 2 维（`object_heading_b`）、两个接触点各 3 维（`ref_contact_pos_b`，只按偏航换算）。噪声：位置、朝向 0.01；接触点每步 0.01，另加每个回合固定的 0.02。门、折叠椅这类铰接物体的关节角、角速度和力矩只放进教师的**特权观测**，学生看不到。

</details>

### 残差动作（III-B-2，图 9c）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：跪、弯腰这类姿势离默认站姿很远；普通动作围着默认站姿探索，从跪姿开始时一出手就被撑起来；残差动作 θ_target = θ_ref + a 让探索围着参考</summary>

复杂动作里常有跪下这类**离默认站姿很远**的姿势。训练刚开始时，普通策略的探索**围着默认站姿**：回合从跪姿开始，策略的第一个动作往往让机器人猛地「弹起来」回到站姿，马上失去平衡，采到的样本也没用。

HDMI 改用**残差动作空间**：策略不直接输出关节目标 $\theta_t^{\mathrm{target}}$，而是输出修正量 $a_t$，加在参考的关节角上：

$$
\theta_t^{\mathrm{target}} = \theta_t^{\mathrm{ref}} + a_t
$$

这样一开始的探索就围着**当前的参考姿态**。参考跪下时，残差策略只需学会平衡自己；直接输出的策略则要先学会输出离零位很大的偏移。论文说这让样本效率更高、收敛快得多，对离站姿很远的动作尤其明显。图 9c：上排有残差，在参考附近探索；下排没有，一出手就弹起来。

**代码**：动作 = 默认姿态 + 动作 × 缩放（髋偏航 / 俯仰、腰偏航 0.55，髋横滚、膝 0.35，其余 0.44），23 个关节、不含手腕；残差版本先把参考关节角换算成动作单位再加上网络输出（`ref_joint_pos_action_policy`）。默认站姿：髋俯仰 −0.312、膝 0.669、踝俯仰 −0.363、肘 0.6、肩横滚 ±0.2、肩俯仰 0.2 rad。第 3.20 s 的左膝要离默认 **5.9 个动作单位**，训练开始时的探索噪声标准差只有 1（[例 5](#实例-5-第-320-s-的跪姿离默认站姿多远)）。

</details>

### 交互奖励（III-B-3，式 1–2）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：视频重定向来的参考只是运动学的，接触不准、会穿模；对每个该接触的末端，位置项 exp(−距离/σ_pos) 乘封顶为 1 的力项，再按接触信号门控取平均；代码里 σ_pos 0.3 m、σ_frc 40 N、F_thres 10 N，要接触乘 5、不用接触给 1</summary>

视频重定向来的参考**只是运动学上的轨迹**，接触常常不准，还可能穿模，只靠跟踪奖励不够。HDMI 加了一个统一的交互奖励 $R _ {\mathrm{interaction}}$：参考说要接触（$c_t = 1$）时，鼓励策略建立并保持稳定的接触。对每个该接触的末端 $i$：

$$
R_{\mathrm{contact},i} = \exp\!\left(-\frac{\lVert p_{\mathrm{eef},i} - p_{\mathrm{target},i}\rVert_2}{\sigma_{\mathrm{pos}}}\right)\cdot \min\!\left(\exp\!\left(\frac{\lVert F_{\mathrm{contact},i}\rVert_2 - F_{\mathrm{thres}}}{\sigma_{\mathrm{frc}}}\right),\ 1\right)
\tag{1}
$$

- **位置项**：末端离物体上的目标接触点越近越好。注意分子是**距离本身**（L2 范数），不是平方。
- **力项**：接触力不够就打折扣，超过 $F _ {\mathrm{thres}}$ 封顶为 1——要的是「够但不过量」，论文说封顶也是为了部署安全。

再对所有该接触的末端取平均，用接触信号门控：

$$
R_{\mathrm{interaction}} = \frac{1}{N_c}\sum_{i=1}^{N_c} R_{\mathrm{contact},i}\cdot c_{t,i}
\tag{2}
$$

**代码**（`rewards.py` 的 `eef_contact_exp`，`hdmi-base.yaml`）：$\sigma _ {\mathrm{pos}} = 0.3$ m、$\sigma _ {\mathrm{frc}} = 40$ N、$F _ {\mathrm{thres}} = 10$ N，论文都没给。实现和式 2 有两处不同：**要接触的末端得分乘 `gain = 5`**；**不用接触的末端直接给 1**（不是 0），再对两个末端取平均，权重 1。所以表 I 里接触奖励的「5.0」就是这个 gain。

**域随机化**（论文一句话：随机机器人和物体的惯性与摩擦）的代码范围见[上真机](#上真机动捕给位姿第-iv-节)那一节。

</details>

<div class="paper-demo" data-demo="hdmi-reward" id="demo-reward"><p class="demo-fallback">（本节含交互演示：交互奖励计算器，需要启用 JavaScript）</p></div>

### 奖励与终止（表 I、表 II）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：表 I 的跟踪、物体、接触与七项正则的权重；表 II 的终止条件都要连续 25 步；代码里跟踪奖励拆成 10 个 0.5 exp(−误差/σ)、物体朝向阈值 0.8 rad、奖励分四组各有一个价值输出</summary>

**表 I：奖励**

| 类别 | 项 | 权重 |
|---|---|---|
| 机器人跟踪 | 身体局部位姿 | 2.0 |
| | 根部全局位姿 | 1.0 |
| | 身体全局速度 | 1.0 |
| | 关节跟踪 | 1.0 |
| 物体跟踪与交互 | 物体位姿 | 2.0 |
| | 接触奖励 | **5.0** |
| 正则 | 动作变化率 L2 | 0.1 |
| | 关节位置限位 L1 | 10.0 |
| | 关节速度 | 5.0e-4 |
| | 关节力矩限位 L1 | 0.01 |
| | 足底冲击力 L2 | 1.0 |
| | 脚打滑 | 0.5 |
| | 腾空时间 | 5.0 |

**表 II：终止条件**（每项都要连续超标 25 步）

| 条件 | 阈值 |
|---|---|
| 根部全局位姿误差 | 0.5 m、1.2 rad |
| 身体局部位姿误差 | 0.5 m、1.2 rad |
| 物体位姿误差 | 0.5 m、1.2 rad |
| 接触丢失 | 位置 0.2 m、力 1.0 N |

**代码和表的出入**（`hdmi-base.yaml`、`terminations.py`）：

- 跟踪奖励拆成 **10 个小项**，每项权重 0.5、形如 $0.5\exp(-\overline{e}/\sigma)$（$\overline{e}$ 是各关键点或关节误差的平均）：上身位置（$\sigma$ 0.5）/ 朝向（1.0）、下身位置（0.5）/ 朝向（1.0）合起来就是「身体局部位姿 2.0」；根部位置（0.5）/ 朝向（0.5）是「根部全局位姿 1.0」；身体线速度（0.5）/ 角速度（2.5）是「身体全局速度 1.0」；关节位置（0.25）/ 速度（2.5）是「关节跟踪 1.0」。物体位置、朝向各 1.0、$\sigma$ 0.5，合起来是「物体位姿 2.0」。
- 运动和脚两组各多一项**存活奖励** 1.0，表 I 没列；门类任务另有物体关节角的跟踪奖励 1.0。腾空时间的阈值 0.5 s。
- 终止按**连续超标的步数**累计到 25 步（0.5 s）才触发；物体朝向的阈值是 **0.8 rad**，不是表里的 1.2；接触丢失是「距离 ≥ 0.2 m **或** 力 < 1 N」且这一帧该接触。
- 奖励分成**跟踪、物体、运动、脚四组**，价值网络每组输出一个值，四组的优势各乘 1/4 再加起来。

</details>

### 代码里的教师与学生（论文没写）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文只说用 PPO；代码分两步：先训特权教师（残差动作只在这里）并让适应模块从普通观测猜特权特征，再让学生模仿教师的均值、之后自己用 PPO 微调；学生 615 维观测</summary>

论文只写了「用 PPO 优化」。官方代码（`active_adaptation/learning/ppo/ppo_roa.py`，README 叫它 PPO with residual action distillation）其实分两步：

1. **`ppo_roa_train`（教师）**：特权观测（仿真里才拿得到的：根部线速度、未来若干帧的参考与当前误差、脚踝的位置与速度、施加的动作与力矩、物体的真实位姿、未来的接触信号等）经编码器变成 **256 维**特征，教师的动作网络输出**加在参考关节角上**（残差动作只在这里）。同时，**适应模块**只看普通观测，用均方误差去猜那 256 维（问答：借鉴 ROA，去掉了显式的正则项、保留教师与学生编码器之间的潜空间行为克隆）；**学生的动作网络**用均方误差模仿教师的**动作均值**，输入是普通观测加猜出来的特征，**不再加参考关节角**。
2. **`ppo_roa_finetune`（学生）**：学生自己再用 PPO 微调。README 的流程是先训教师、再训学生、导出策略，部署的应该是学生——这是**我们的推断**，论文和 README 都没直接说部署的是哪个。

**学生的 615 维观测**：

| 部分 | 维数 | 内容 |
|---|---|---|
| 参考（`command`） | 356 | 未来 5 帧（第 1, 2, 8, 16, 32 步 = 0.02 / 0.04 / 0.16 / 0.32 / 0.64 s）的 16 个关键点局部位置 240 + 23 个关节角 115 + 相位 1 |
| 本体感受（`policy`） | 249 | 根部角速度 3 + 重力投影 3 + 29 个关节角 × 6 个历史步（0, 1, 2, 3, 4, 8）174 + 前 3 步动作 69 |
| 物体（`object`） | 10 | 水平位置 2 + 朝向 2 + 两个接触点 6 |

注意：论文说策略看「相位」，代码里策略还看**未来 5 帧的参考关键点和关节角**。网络：动作 MLP [512, 256, 256]，价值 MLP [512, 256, 128]；PPO 学习率 3e-4（按 KL 0.01 自适应）、$\gamma$ 0.99、$\lambda$ 0.95、每次 32 步、3 个 epoch、8 个小批量、裁剪 0.2、熵系数 0.001；4096 个并行环境、1.5 亿帧。

</details>

<div class="paper-demo" data-demo="hdmi-reference" id="demo-reference"><p class="demo-fallback">（本节含交互演示：参考与回放逐帧看，需要启用 JavaScript）</p></div>

---

## 📊 实验结果

### 上真机：动捕给位姿（第 IV 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：IsaacSim 里同一套超参数训练、零样本部署到 G1；动捕标记点贴在骨盆和物体上，物体位姿换到根部坐标系当观测；代码里的域随机化范围</summary>

所有策略都在 **IsaacSim** 里用**同一套超参数**训练，直接部署到 Unitree G1。真机上给策略的输入：**动捕标记点贴在机器人的骨盆和被操作的物体上**，拿到各自根连杆的全局位姿，再把物体位姿换到机器人的根部坐标系，作为策略观测。论文说第 IV 节评测**五个**真机交互任务（开门穿门、搬行李箱、搬面包箱、搬泡沫垫、楚门式鞠躬）；摘要和问答说的是 6 个任务上了真机，两处说法不完全一致。

**域随机化**（代码）：各连杆质量 ×0.9–1.1；脚和手腕的静摩擦 0.3–1.6、动摩擦 0.3–1.2、恢复系数 0–0.2；骨盆和躯干的质心 ±2 cm；关节零位 ±0.01 rad；动作延迟 2–6 个物理步（物理步长 5 ms，即 10–30 ms），动作再做一次系数在 0.8–1.0 之间的指数平滑；行李箱质量 1.2–1.8 kg、尺寸 ×0.9–1.1（推大箱子 6–12 kg、凳子 1.5–3 kg、折叠椅 2–5 kg）。策略 50 Hz（每 4 个物理步出一次动作）。PD 增益按 BeyondMimic 的做法由转子惯量算（固有频率 10 Hz、阻尼比 2）。

</details>

### Case I：开门穿门 67 次（图 4a）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：手推开门、走过去、掉头、脚踢开门、再走回来；连续 67 次约 34 分钟才失败；撤掉木板后又约 7 次；起点随机偏移 10–30 cm</summary>

这个任务考的是**依次处理不同的接触**：用手推开门、走过去、掉头、用脚把门踢开、再走过去、回到起点。

- 策略**连续完成 67 次**（34 分钟）才失败；
- 地形变了也稳：**撤掉地上的木板后又完成约 7 次**（图 4a 上标的是有木板「~60 trips」、撤掉后「~10 trips」，和正文的数不完全一致）；
- 每一轮的起点**随机偏移 10–30 cm**，机器人会调整步子，把手抬到门上正确的位置。

项目页的 35 分钟加速剪辑（108 s）里，画面上的计数一路走到 68，最后一段是第 68 次摔倒。

</details>

### Case II：搬箱子类（图 4b）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：搬行李箱连续 7 次（真机上搬的是纸箱）；面包箱完整做完 2 次，快速掉头 180° 时两腿偶尔相碰；泡沫垫：走过去、抓起、侧着走、放下</summary>

这些任务考的是用全身协调操作高度、重量不同的箱子类物体：跪下、抓住、搬运、转向、放下。

1. **搬行李箱**：连续成功 7 次，跪下、抬起、带着负载走之间衔接顺畅（项目页的标题是「Cardbox Whole-body Manipulation (7 Times)」，真机上搬的是纸箱）；
2. **搬面包箱**：完整做完 2 次，主要难点是快速转身 180°，两条腿偶尔会碰到一起；
3. **搬泡沫垫**：走过去、抓起泡沫垫、侧着走、放下。

</details>

### Case III：楚门式鞠躬（图 5）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上台阶、鞠躬、坐在台阶上、挥手、跳下来、走回去；上台阶有风险，操作员偶尔在背后轻扶；整段连续完成 3 次</summary>

一个多阶段的长序列：爬上台阶、做一个楚门式的鞠躬、坐在台阶上、挥手、跳下来、走回去。爬台阶有风险，操作员偶尔会在机器人背后轻轻扶一下。策略把整段**连续完成了 3 次**。论文说这同时考了动态、接触密集的物体—场景交互（爬上去、坐在台阶上）和精确的全身姿态（鞠躬、挥手）。名字我们猜是在致敬电影《楚门的世界》的结尾（论文没解释）。

</details>

### 仿真里的 14 个任务与消融设置（第 V 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：14 个任务同一套框架与超参数，官方仓库有 13 个的配置；6 个上了真机，球贴不了标记点、没有结实的折叠椅；消融在 IsaacSim 里从参考开头出发，不触发终止做完整段算成功，4096 个并行环境</summary>

官方仓库有 13 个任务的配置：搬面包箱、把箱子扛上肩、搬泡沫垫、搬凳子再爬上去、搬行李箱、用脚开门、打开折叠椅坐下、推大箱子、用手推门、推大球、推翻木板再走过去、开门穿门、楚门式鞠躬。问答：14 个里有 6 个上了真机，其余受硬件限制——**球上没法贴动捕标记点**，也**没有椅背结实的折叠椅**。

消融都在 IsaacSim 里做：每次评测从参考的开头出发，**不触发任何终止、做完整段**就算成功；均值和标准差来自 **4096 个并行环境**。

</details>

### 交互奖励的消融（图 6）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三种训练（完整 / 只去掉交互奖励 / 两个都去掉），评测时不开接触终止；多数任务三种接近；搬行李箱两个都去掉是 0，箱子扛上肩去掉交互奖励就是 0；8 个任务平均 0.99 / 0.87 / 0.75</summary>

比较两个引导接触的设计：**交互奖励**和**接触终止**（表 II 的「接触丢失」）。三种训练：

- **有交互奖励 + 接触终止**（完整方法，蓝）
- **只去掉交互奖励**（红）
- **两个都去掉**（绿）

除非特别说明，这组实验**评测时都不开接触终止**。图 6（8 个任务的最终成功率，越高越好）：多数任务去掉这两个设计并不影响最终成功率；但有两类任务离不开它们。

| 任务 | 完整 | 去掉交互奖励 | 两个都去掉 |
|---|---|---|---|
| 搬行李箱 | 1.00 | 0.996 | **0** |
| 搬面包箱 | 0.984 | 0.998 | 0.995 |
| 箱子扛上肩 | 0.996 | **0** | **0** |
| 用手推门 | 1.00 | 0.999 | 1.00 |
| 用脚开门 | 1.00 | 1.00 | 1.00 |
| 推大箱子 | 0.981 | 0.966 | 0.984 |
| 打开折叠椅坐下 | 1.00 | 1.00 | 1.00 |
| 推翻木板 | 0.981 | 0.973 | 0.982 |
| **平均（我们算的）** | **0.99** | **0.87** | **0.75** |

数是我们从论文 PDF 的矢量图里抽出的柱高；高度为 0 的柱子在图上看不见。

</details>

### 交互奖励管什么（图 7）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：参考不准时，交互奖励让策略偏离错的参考去抓牢；用回放录下完美参考重训，三种都能成功；推大箱子要把 L 形末端放在箱沿，开着接触终止评测时两个都去掉只剩 0.32</summary>

**① 交互奖励处理不完美的参考**（图 7b、图 7a 左）：重定向不完美时，参考里的手根本没抓到箱子（a）。有交互奖励的策略会**偏离参考**去抓牢（b）；没有它，策略照着错的参考做，抓不起来（c）。为了确认它的作用正在于此，作者**把（b）的回放录下来当完美参考（d）重训**：这时没有交互奖励也能成功（图 7a 右）。

官方仓库正好有一段 `record_motion/x65r1823`：447 帧，正好是搬行李箱的参考去掉前 25 帧（472 − 25），接触标签逐帧相同，`_save_motion` 存回放时也正好丢掉前 25 帧——我们推断它就是这种完美参考。要接触的帧里，参考的双手离期望接触点平均 **10.5 / 12.2 cm**，回放只有 **4.1 / 1.2 cm**（[例 4](#实例-4-第-470-s-参考与回放的手离接触点多远)）。

**② 交互奖励引导精确的接触位置**（图 7c、图 7a 右）：推大箱子要把 **L 形的末端准确地放在箱沿上**。没有交互奖励时策略做不到，常把末端按在箱子的竖直面上，接触很不稳。评测时不开接触终止，三种的成功率接近（0.987 / 0.966 / 0.995）；**一打开接触终止**，没有交互奖励训出来的策略大幅下降（第 1100 步：0.976 / 0.956 / **0.321**）。

</details>

### 残差动作的消融（图 8、图 9）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三种训练（残差 + 身体误差终止 / 去掉残差 / 两个都去掉），评测时去掉身体误差终止；8 个任务 24 项误差都是完整方法最低；有残差的第 400 步成功率就到 0.99；没有残差学不会跪下</summary>

比较**残差动作空间**和**身体跟踪误差终止**（表 II 的「身体局部位姿误差」）。三种训练：

- **残差 + 身体误差终止**（完整方法，蓝）
- **去掉残差**：动作相对默认关节角，不再相对参考关节角（红）
- **两个都去掉**：训练时只留根部误差终止，免得采到一堆躺在地上的样本（绿）

评测时去掉身体误差终止。图 8（越低越好）：完整方法在 8 个任务上的关节误差、身体位置误差、身体朝向误差**全都最低**；只加身体误差终止（红）比两个都去掉（绿）略好一点。8 个任务的平均（我们按图 8 的读数算）：

| 指标 | 完整 | 去掉残差 | 两个都去掉 |
|---|---|---|---|
| 关节位置误差（rad） | **0.090** | 0.142 | 0.151 |
| 身体位置误差（m） | **0.049** | 0.064 | 0.064 |
| 身体朝向误差（rad） | **0.183** | 0.237 | 0.253 |

图 8 没写单位，按代码里同名的调试量推断。**图 9a**（训练过程，论文没写是哪个任务）：有残差的关节误差一开始就低（约 0.12），第 400 步成功率就到 0.99；去掉残差要到第 900 步、两个都去掉要到第 800 步才到 0.97–0.98，误差也停在 0.18–0.19。**图 9b**：搬行李箱时两个都去掉的策略学不会跪下，收敛到「双脚平放、多弯腰」的次优解。论文的解释就是图 9c：没有残差时探索围着站姿，从跪姿开始就会弹起来。

</details>

<div class="paper-demo" data-demo="hdmi-results" id="demo-results"><p class="demo-fallback">（本节含交互演示：消融实验的数字，需要启用 JavaScript）</p></div>

---

## ⚠️ 局限与讨论

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文写的两条（依赖动捕、一个技能一个策略）；我们补充的：6 / 14 上真机、物体与接触靠人工标注、代码与论文的出入</summary>

**论文写的（第 VI 节）**：

1. **依赖动捕**：现在的系统用动捕给的真值（比如物体位姿），关键的下一步是让策略直接用机载传感器（相机），在没布置过的环境里部署。
2. **一个技能一个策略**：每个任务单独训一个专家策略；之后的方向是用多个技能的数据训一个统一的通才模型。

**我们补充的**：

- 14 个仿真任务只有 6 个上了真机；真机的评测是连续成功次数，没有成功率的统计。
- 「从视频学」的物体那一半是**人工标注**的（问答），每段视频还要一个专门的后处理脚本；真正的规模化要靠 OmniRetarget 这类自动流程。
- 论文和代码有几处出入（训练是教师—学生两步、学生还看未来 5 帧的参考、交互奖励乘 5 且不用接触时给 1、物体朝向阈值 0.8 rad），复现时以代码为准。

</details>

---

## 🚶 具体实例：用官方数据从头算一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（10 节）：环境设定 / 例 1 一段参考里存了什么 / 例 2 学生的 615 维 / 例 3 两只手的交互奖励 / 例 4 第 4.70 s 参考与回放的手离接触点多远 / 例 5 第 3.20 s 的跪姿离默认站姿多远 / 例 6 连续 25 步才终止 / 例 7 读图 6 / 例 8 读图 7 / 例 9 读图 8 与图 9a</summary>

<h3 id="实例-环境设定">环境设定</h3>

- **数据**：官方仓库的 `data/motion/g1/omomo/sub1_suitcase_011`（搬行李箱的参考，OMOMO 重定向，472 帧、50 fps）与 `record_motion/x65r1823`（仓库里录下的 IsaacSim 回放，447 帧）。我们**没有训练策略**，只是读这两份数据。
- **对齐**：回放的第 $k$ 帧对应参考的第 $k + 25$ 帧（例 4）。动画和演示从参考第 25 帧起每 3 帧取一帧，共 149 帧（第 0.50–9.38 s）；「要接触的帧」在这 149 帧里有 56 帧（第 3.44–6.74 s）。
- **末端点与接触点**：手的末端点 = 手腕偏航连杆的位姿往前 5 cm；期望接触点 = 箱子坐标系里的 $(-0.1, \pm 0.18, 0.25)$ m（`move_suitcase.yaml`）。都用数据里存的连杆与箱子位姿算，不做正运动学。
- **渲染**：按关节角在 [Robot Retarget Online](https://github.com/ImChong/Robot_Retarget_Online) 的 G1 模型上做正运动学，照它的 three.js 材质与光照离线渲染；行李箱按配置的尺寸画成纸箱色的盒子。
- 这是**读官方数据的小算例，不是论文的实验**。

<h3 id="实例-1-一段参考里存了什么">例 1：一段参考里存了什么</h3>

`motion.npz` 的键：`body_pos_w` (472, 29, 3)、`body_quat_w` (472, 29, 4)、`body_lin_vel_w`、`body_ang_vel_w`、`joint_pos` (472, 29)、`joint_vel`、`object_contact` (472, 1)。29 个「body」= 28 个 G1 连杆（骨盆、两腿各 6、躯干、两臂各 7）+ 1 个行李箱；29 个关节角是 G1 的全部关节。接触信号：472 帧里 **170 帧**要接触（36%），第 3.40–6.78 s。这就是 $s_t^{\mathrm{ref}} = (s_t^{\mathrm{robot}}, s_t^{\mathrm{obj}}, c_t)$ 的落地形式：物体只是「多加一个 body」。

<h3 id="实例-2-学生的-615-维">例 2：学生的 615 维</h3>

$$
\underbrace{16\times3\times5}_{240} + \underbrace{23\times5}_{115} + \underbrace{1}_{\text{相位}} = 356,\qquad
3 + 3 + \underbrace{29\times6}_{174} + \underbrace{23\times3}_{69} = 249,\qquad
2 + 2 + 6 = 10
$$

合计 $356 + 249 + 10 = 615$。16 个关键点：髋俯仰与髋偏航、膝、踝横滚、骨盆、躯干、肩俯仰、肘、手腕偏航（左右各一的算两个）。未来 5 帧是第 1, 2, 8, 16, 32 步，按 50 Hz 就是 0.02、0.04、0.16、0.32、0.64 s 之后。

<h3 id="实例-3-两只手的交互奖励">例 3：两只手的交互奖励</h3>

两只手都离接触点 5 cm，左手接触力 3 N、右手 15 N，这一帧要接触（$c_t = 1$）。代码参数 $\sigma _ {\mathrm{pos}} = 0.3$ m、$\sigma _ {\mathrm{frc}} = 40$ N、$F _ {\mathrm{thres}} = 10$ N：

| | 位置项 $e^{-0.05/0.3}$ | 力项 | $R _ {\mathrm{contact}}$ | 代码：$5R$ |
|---|---|---|---|---|
| 左手（3 N） | 0.8465 | $e^{(3-10)/40} = 0.8395$ | 0.7106 | 3.5529 |
| 右手（15 N） | 0.8465 | $\min(e^{5/40}, 1) = 1$ | 0.8465 | 4.2324 |

- 论文式 2：$(0.7106 + 0.8465)/2 = $ **0.7785**；
- 代码：$(3.5529 + 4.2324)/2 = $ **3.8927**；这一帧不用接触时，论文是 0，代码是 $(1 + 1)/2 = 1$。
- 右手的 15 N 已经超过阈值，力项封顶为 1，**再用力也不加分**。
- 旧版笔记把位置项写成了距离的平方：$e^{-0.05^2/0.3} = 0.9917$，5 cm 几乎不扣分，和原文的 0.8465 差很多。

交互演示「交互奖励计算器」默认就是这组数。

<h3 id="实例-4-第-470-s-参考与回放的手离接触点多远">例 4：第 4.70 s 参考与回放的手离接触点多远</h3>

参考第 4.70 s（第 235 帧，回放第 210 帧），这一帧要接触：

| | 左手 | 右手 | 位置项（左 / 右） |
|---|---|---|---|
| 参考（OMOMO 重定向） | 7.1 cm | 9.3 cm | 0.788 / 0.734 |
| 回放（仓库里录的） | 4.2 cm | 1.4 cm | 0.871 / 0.956 |

在 56 帧要接触的帧上平均：参考 **10.5 / 12.2 cm**，回放 **4.1 / 1.2 cm**。参考的手离箱子侧面还有十厘米左右——这就是论文说的「重定向不完美，参考里的手没抓到箱子」；回放里策略把手贴了上去（左手的 4 cm 大致是手腕连杆到箱面的厚度，我们的推测）。拿着箱子时回放的左手约 4.2 cm，假设接触力 15 N，代码给这只手 $5\times e^{-0.042/0.3} = 4.35$ 分。交互演示「参考与回放逐帧看」默认就是这一帧。

<h3 id="实例-5-第-320-s-的跪姿离默认站姿多远">例 5：第 3.20 s 的跪姿离默认站姿多远</h3>

参考第 3.20 s（第 160 帧）前后骨盆最低（第 159 帧 0.426 m）。每个关节离默认站姿多少个**动作单位** $u = (\theta^{\mathrm{ref}} - \theta^{\mathrm{default}})/\text{缩放}$：

| 关节 | 参考（rad） | 默认（rad） | 缩放 | $u$ |
|---|---|---|---|---|
| 左膝 | 2.731 | 0.669 | 0.35 | **5.89** |
| 右膝 | 2.446 | 0.669 | 0.35 | 5.08 |
| 右髋俯仰 | −2.238 | −0.312 | 0.55 | −3.50 |
| 左肩俯仰 | −1.375 | 0.2 | 0.44 | −3.58 |
| 右肩俯仰 | −1.522 | 0.2 | 0.44 | −3.91 |
| 左踝俯仰 | 0.454 | −0.363 | 0.44 | 1.86 |

23 个动作关节里 **8 个**要离默认超过 1 个单位，平均 $\lvert u\rvert = 1.37$。训练开始时动作分布的标准差是 1：普通动作要靠噪声「碰巧」探索到 5.9 个单位外的跪姿，几乎不可能；残差动作的零点就在参考上，第一步就跪着。

<h3 id="实例-6-连续-25-步才终止">例 6：连续 25 步才终止</h3>

策略 50 Hz，25 步 = **0.5 s**。代码按每个条件「连续超标的步数」累计，一回到阈值以内就清零；所以一次 0.3 s 的打滑不会结束回合，超标持续半秒才会。表 II 的「Min Steps 25」就是这个意思。

<h3 id="实例-7-读图-6">例 7：读图 6</h3>

8 个任务的平均：完整 $(1 + 0.984 + 0.996 + 1 + 1 + 0.981 + 1 + 0.981)/8 = 0.993$；去掉交互奖励 $6.932/8 = 0.867$；两个都去掉 $5.961/8 = 0.745$。差距全部来自两个任务：搬行李箱（绿 0）和箱子扛上肩（红、绿都是 0）；其余 6 个任务三种都在 0.966 以上。

<h3 id="实例-8-读图-7">例 8：读图 7</h3>

图 7a 每 100 步一个点（第 100–1100 步）：

- 搬行李箱、不完美参考：蓝第 400 步 0.979；红第 700 步 0.055、第 800 步 0.980；绿始终是 0。
- 搬行李箱、完美参考：蓝第 300 步 0.995；红第 300 步 0.955；绿第 400 步 0.973——三种都能成功。
- 推大箱子：评测不开接触终止时第 1100 步 0.987 / 0.966 / 0.995；开着接触终止时 0.976 / 0.956 / **0.321**（绿最高 0.595，在第 800 步）。

<h3 id="实例-9-读图-8-与图-9a">例 9：读图 8 与图 9a</h3>

图 8 的关节位置误差（rad，8 个任务）：蓝 0.117 / 0.116 / 0.135 / 0.049 / 0.051 / 0.075 / 0.083 / 0.092，平均 0.090；红平均 0.142；绿平均 0.151。三张图共 24 个数，蓝色每个都最低。图 9a：蓝的关节误差在 0.118–0.129 之间几乎不动；红从 0.329 降到 0.180，绿从 0.312 降到 0.191。成功率：蓝第 300 步 0.068、第 400 步 0.990；绿第 700 步 0.855、第 800 步 0.973；红第 900 步 0.983。

</details>

---

## 📁 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：目录、论文各部分落在哪个文件、论文与代码的出入、怎么跑</summary>

<h3 id="源码-目录">目录</h3>

```
HDMI/
├── active_adaptation/
│   ├── envs/mdp/commands/hdmi/
│   │   ├── command.py         # RobotObjectTracking：读参考、参考状态初始化与扰动、相位、未来帧、接触点
│   │   ├── observations.py    # ref_body_pos_future_local / object_xy_b / ref_contact_pos_b …
│   │   ├── rewards.py         # 10 个跟踪小项、物体跟踪、eef_contact_exp（交互奖励）
│   │   ├── terminations.py    # 连续超标 25 步的终止
│   │   └── randomizations.py  # 物体的质量、摩擦、尺寸
│   ├── learning/ppo/ppo_roa.py  # 教师（残差动作）+ 适应模块 + 学生；train / finetune 两个阶段
│   └── assets/g1.py             # G1 的默认姿态、执行器与转子惯量
├── cfg/
│   ├── task/base/hdmi-base.yaml # 观测、奖励权重与 σ、终止、域随机化、动作缩放与延迟
│   └── task/G1/hdmi/*.yaml      # 13 个任务：数据路径、物体、接触点与末端
├── data/motion/g1/              # 参考动作（omomo/、push_box/ …）
├── record_motion/x65r1823/      # 一段录下的搬行李箱回放（447 帧）
├── scripts/train.py / play.py   # 训练、评测、导出
└── FAQ.md                       # 物体轨迹怎么来、ROA、6 / 14 上真机、初始位置范围
```

<h3 id="源码-论文与代码">论文与代码</h3>

| 论文 | 代码 |
|---|---|
| 用 PPO 优化 | PPO-ROA：特权教师 + 适应模块 + 学生（模仿教师均值），再用 PPO 微调学生 |
| 残差动作 $\theta^{\mathrm{ref}} + a$ | 只在教师里；学生直接输出动作，但观测里有未来 5 帧的参考关节角 |
| 观测：相位 + 本体 + 物体 | 学生 615 维：未来 5 帧的关键点与关节角 + 相位 356、本体 249、物体 10 |
| 式 1 的 $\sigma _ {\mathrm{pos}}$、$\sigma _ {\mathrm{frc}}$、$F _ {\mathrm{thres}}$ | 0.3 m、40 N、10 N |
| 式 2：门控平均 | 要接触 × 5，不用接触给 1，再取平均 |
| 表 I 的跟踪四项 | 10 个 $0.5\exp(-\overline{e}/\sigma)$；另有两项存活奖励 1.0 |
| 表 II：物体 1.2 rad | 物体朝向 0.8 rad；接触丢失是距离 ≥ 0.2 m 或力 < 1 N |
| 域随机化：惯性与摩擦 | 质量 ×0.9–1.1、摩擦 0.3–1.6、质心 ±2 cm、关节零位 ±0.01 rad、延迟 10–30 ms、物体质量与尺寸 |
| （没写） | 价值网络按跟踪 / 物体 / 运动 / 脚四组各一个输出 |

<h3 id="源码-怎么跑">怎么跑（README）</h3>

```bash
# 环境：Python 3.10、isaacsim 4.5.0、IsaacLab v2.2.0，然后 pip install -e .
# 回放参考，检查数据
python scripts/play.py algo=ppo_roa_train task=G1/hdmi/move_suitcase +task.command.replay_motion=true
# 1. 教师
python scripts/train.py algo=ppo_roa_train task=G1/hdmi/move_suitcase
# 2. 学生（从教师的 wandb run 加载）
python scripts/train.py algo=ppo_roa_finetune task=G1/hdmi/move_suitcase checkpoint_path=run:<teacher-wandb_run_path>
# 3. 评测 / 导出（加 export_policy=true）
python scripts/play.py algo=ppo_roa_finetune task=G1/hdmi/move_suitcase checkpoint_path=run:<student-wandb_run_path>
# 真机：见 github.com/EGalahad/sim2real
```

</details>

---

## 🔗 在学习路线中的位置

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上承 DeepMimic / ASAP / BeyondMimic 的动作跟踪；同组的 FALCON 处理外力；下启 VIRAL、DoorMan 这类从相机学移动操作的工作，以及 OmniRetarget 这类自动生成交互数据的路线</summary>

- **上承**：[DeepMimic](../../01_Foundational_RL/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills.html)（参考状态初始化、相位、提前终止三件套）、[ASAP](../../03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.html)（从人类视频到真机的单段动作跟踪，同一个实验室）、[BeyondMimic](../../01_Foundational_RL/BeyondMimic/BeyondMimic.html)（PD 增益的做法）。
- **同期对照**：[FALCON](../FALCON__Learning_Force-Adaptive_Humanoid_Loco-Manipulation/FALCON__Learning_Force-Adaptive_Humanoid_Loco-Manipulation.html)（同组：处理末端被施加的外力，上下身双智能体）、[HOMIE](../../03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.html)（论文相关工作里列出的移动操作工作，走遥操作路线）、[TWIST](../../07_Teleoperation/TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.html)（同样是动作跟踪，但目标来自实时遥操作）。
- **下启**：[VIRAL](../VIRAL__Visual_Sim-to-Real_at_Scale_for_Humanoid_Loco-Manipulation/VIRAL__Visual_Sim-to-Real_at_Scale_for_Humanoid_Loco-Manipulation.html)（特权教师蒸馏成只看 RGB 的学生，去掉对动捕的依赖）、[DoorMan](../Opening_the_Sim-to-Real_Door_for_Humanoid_Pixel-to-Action_Policy_Transfer/Opening_the_Sim-to-Real_Door_for_Humanoid_Pixel-to-Action_Policy_Transfer.html)（从像素学开门）；[OmniRetarget](../../02_Motion_Retargeting/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.html)（在重定向阶段就保住人—物—地形的交互，问答说以后可能用它替掉人工标注）。
- **工程意义**（我们的观察）：「把物体当成参考里多加的一个 body、把接触点写进物体坐标系」让交互技能变成和动作跟踪同一类问题；残差动作只改了动作的零点，却让跪、坐、爬这些离站姿很远的技能变得可学。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：七问七答</summary>

**Q1：HDMI 和 DeepMimic / BeyondMimic 这类动作跟踪有什么区别？**

A：训练套路相同（参考状态初始化、相位、误差终止、PPO），区别在跟什么：HDMI 的参考里多了物体轨迹、接触信号和物体坐标系里的期望接触点，观测里有物体与接触点（都在根部坐标系），奖励里有物体跟踪和交互奖励，终止里有物体误差和接触丢失。

**Q2：为什么要残差动作？**

A：跪下这类姿势离默认站姿很远（第 3.20 s 的左膝要 5.9 个动作单位），普通动作的初始探索围着站姿，从跪姿开始一出手就弹起来，样本没用。残差把动作的零点放到参考上，策略一开始就只需要学平衡和小修正。消融：8 个任务的 24 项跟踪误差全都是有残差的最低，搬行李箱没有它学不会跪下。

**Q3：交互奖励的力项为什么要封顶？位置项为什么不用平方？**

A：封顶是为了「力够就行」，超过阈值不再加分，避免策略用更大的力（论文也说为了部署安全）。位置项用距离本身（L2 范数）而不是平方，近处的梯度不会消失——5 cm 时 $e^{-0.05/0.3} = 0.85$，用平方则是 0.99，几乎不扣分。

**Q4：交互奖励在哪些任务上真正起作用？**

A：两类：参考不准（搬行李箱，重定向出来的手没碰到箱子，有交互奖励的策略会偏离参考去抓牢）和接触位置要准（推大箱子要把 L 形末端放在箱沿）。用完美参考重训时没有它也能成功，说明它补的正是参考的缺陷。

**Q5：「统一的物体表示」统一在哪？**

A：不管什么物体，策略只看它相对机器人根部的位姿和换到根部坐标系的期望接触点，维数固定（代码里 10 维），换物体不改网络。门这类铰接物体的关节角在代码里只给教师当特权信息，学生靠接触点和物体位姿间接感知。

**Q6：真机上物体的位姿从哪里来？能去掉吗？**

A：动捕标记点贴在骨盆和物体上，拿全局位姿再换到根部坐标系。论文说这是第一条局限，下一步是机载相机；后来的 VIRAL 就是把特权教师蒸馏成只看 RGB 的学生。

**Q7：复现时要注意代码和论文的哪些出入？**

A：训练是教师—学生两步（残差只在教师）；学生还看未来 5 帧的参考；交互奖励要接触时乘 5、不用接触时给 1；物体朝向的终止阈值 0.8 rad；奖励分四组各有一个价值输出；论文没给的 $\sigma$、阈值都在 `hdmi-base.yaml` 里。

</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：2026-10-05 · 初读；2026-10-23 · 读代码和做讲解动画时看到的几件事</summary>

**2026-10-05 · 初读**

- 和 FALCON 对照着读：FALCON 处理的是「手上被施加了未知外力」，HDMI 处理的是「要主动和物体建立并维持接触」。
- 0.5 m / 1.2 rad 的终止阈值和 H2O 的 0.5 m 成功率阈值量级一致，都是「明显跟丢」才算失败。

**2026-10-23 · 读代码时看到的**

- 「从视频学」的物体那一半是人工标注的（问答第 1 条）；论文正文只写了「post-process and annotate」。
- 交互奖励的位置项用的是距离本身，不是平方；旧版笔记写错了，还假设了参数，现在换成代码里的 0.3 m / 40 N / 10 N。
- 仓库里那段 447 帧的回放和搬行李箱的参考逐帧对得上（去掉前 25 帧），我们推断就是图 7b 的完美参考。
- 摘要说「6 个真机任务」、第 IV 节说「五个真机交互任务」、图 4a 写「~60 / ~10 trips」而正文写「67 次 / 约 7 次」——几处数不完全一致，笔记都照原文分别引用。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX、开放问题、旧版笔记的改正</summary>

<h3 id="a-bibtex">A. BibTeX</h3>

```bibtex
@misc{weng2025hdmilearninginteractivehumanoid,
      title={HDMI: Learning Interactive Humanoid Whole-Body Control from Human Videos},
      author={Haoyang Weng and Yitang Li and Nikhil Sobanbabu and Zihan Wang and Zhengyi Luo and Tairan He and Deva Ramanan and Guanya Shi},
      year={2025},
      eprint={2509.16757},
      archivePrefix={arXiv},
      primaryClass={cs.RO},
      url={https://arxiv.org/abs/2509.16757},
}
```

<h3 id="b-开放问题">B. 开放问题</h3>

- 物体轨迹和接触点的标注能不能自动化？OmniRetarget 在重定向时保住交互，是一条路；直接从视频估计物体六自由度位姿是另一条。
- 一个技能一个策略：同一套观测和奖励能不能直接训多任务的通才？物体表示已经统一，难点可能在相位（单段动作的进度）不再够用。
- 去掉动捕后，物体位姿和接触点从机载相机来，噪声和遮挡会多大程度影响交互奖励学到的接触？

<h3 id="c-旧版笔记的改正">C. 旧版笔记的改正</h3>

- 式 1 的位置项旧版写成了距离的平方，原文是 L2 距离本身；改正，并用代码的参数重算具体实例（旧版假设的 $\sigma _ {\mathrm{pos}} = 0.01\ \text{m}^2$、$\sigma _ {\mathrm{frc}} = 2$ N、$F _ {\mathrm{thres}} = 5$ N 删去）。
- 残差动作的算例旧版是示意数（膝 1.8 / 0.3 rad），换成官方参考第 3.20 s 的真实关节角与代码的动作缩放。
- 「接触丢失为位置偏差 0.2 m **且**接触力 1.0 N」：表 II 只列了两个阈值，代码是「或」；改正。
- 「Truman's Bow」旧版译作「杜鲁门鞠躬」，按电影《楚门的世界》改译「楚门式鞠躬」（是不是致敬电影是我们的猜测）。
- 旧版局限第 3 条「任务失败后的重新选点、换技能仍需要高层逻辑」不是论文原话，删去。
- 新增：问答里的人工标注、教师—学生训练流程、观测维数、奖励与终止的实现、域随机化范围、record_motion 的推断，以及读官方数据的具体实例。

</details>

---

## 📎 参考来源

- arXiv：<https://arxiv.org/abs/2509.16757>（v3，2025-09-27，读的是 LaTeX 源码）
- 项目主页：<https://hdmi-humanoid.github.io/>（动画第 1、12–14 幕的片段剪自项目页的视频）
- 代码：<https://github.com/LeCAR-Lab/HDMI>（`main`，2026-01-17，提交 `32282f6`；`FAQ.md`、`cfg/task/base/hdmi-base.yaml`、`active_adaptation/learning/ppo/ppo_roa.py`）
- 真机部署：<https://github.com/EGalahad/sim2real>
- G1 模型与材质：[Robot Retarget Online](https://github.com/ImChong/Robot_Retarget_Online)
