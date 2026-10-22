---
layout: paper
title: "HOMIE: Humanoid Loco-Manipulation with Isomorphic Exoskeleton Cockpit"
category: "高影响力精选 High Impact Selection"
subcategory: "Teleoperation & Imitation Learning"
zhname: "HOMIE：同构外骨骼驾驶舱式人形遥操作系统"
demos: ["homie"]
---

# HOMIE: Humanoid Loco-Manipulation with Isomorphic Exoskeleton Cockpit
**一个人坐进驾驶舱就能遥操作整台人形：脚踩三只踏板给出前后速度、转向和躯干高度，交给一个不用动捕数据、靠上身姿态课程、膝角奖励和左右对称训出来的强化学习下肢策略；两条手臂穿和机器人同构的 7 自由度外骨骼，舵机读数直接当关节角设给机器人，手戴 15 自由度的霍尔手套；整套硬件约 500 美元，手臂输出 263 Hz，四个桌面任务的用时约为 VR 方案的一半，采到的数据还能训出自主策略**

> 📅 阅读日期: 2026-05-15（2026-10-18 第二版：对照 arXiv v2 的 LaTeX 源码和官方仓库逐条核查重写，改正旧版几处说法；新增十七幕讲解动画、三个交互演示和配音视频）
>
> 🏷️ 板块: 03 High Impact Selection · 遥操作与模仿学习 · 同构外骨骼 · 强化学习全身控制 · 数据采集
>
> ℹ️ 笔记对照 [arXiv 2502.13013](https://arxiv.org/abs/2502.13013) 的 v2（读的是 arXiv 上的 LaTeX 源码：正文、表 I–X、图 1–20 与附录）、[项目页](https://homietele.github.io/)和官方仓库 [InternRobotics/OpenHomie](https://github.com/InternRobotics/OpenHomie)（2026-10 的 `main`，最后一次提交 2026-09-08）。代码和论文有十几处不一样，下文「源码对照」单独列出。「🚶 具体实例」与动画里 G1 的动作，是我们在 MuJoCo 里**跑官方训好的 `HomieDeploy/deploy.onnx`** 得到的（sim-to-sim），不是论文的实验，见[环境设定](#实例-环境设定)。

---

## 📋 基本信息

| 项目 | 链接 / 内容 |
|------|------|
| **arXiv** | [2502.13013](https://arxiv.org/abs/2502.13013)（v1 2025-02-18；读的是 v2） |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2502.13013) |
| **项目主页** | [homietele.github.io](https://homietele.github.io/)（真机、仿真、模仿学习视频，页面写明都是原速） |
| **代码** | [InternRobotics/OpenHomie](https://github.com/InternRobotics/OpenHomie)：`HomieRL`（Isaac Gym 训练）、`HomieDeploy`（真机部署，附训好的 `deploy.onnx`）、`MujocoDeploy`（MuJoCo 回放）、`HomieHardware`（硬件文件要填表申请）；许可 CC BY-NC-SA 4.0，禁止商用 |
| **会议** | RSS 2025 |
| **作者** | Qingwei Ben\*、Feiyu Jia\*、Jia Zeng、Junting Dong、Dahua Lin、Jiangmiao Pang（\* 共同一作） |
| **机构** | 上海人工智能实验室、香港中文大学 |
| **平台** | Unitree G1（带 Dex3 灵巧手，训练用 27 个自由度：锁住腰的横滚、俯仰）、Fourier GR-1；仿真 Isaac Gym 训练，Isaac Sim 的 GRUtopia 场景遥操作 |
| **硬件** | 两条 7 自由度同构外骨骼手臂（430 美元）+ 两只 15 自由度霍尔手套（各 30 美元）+ 三只踏板（20 美元），合计 510 美元（表 III） |
| **关键词** | Humanoid teleoperation, isomorphic exoskeleton, joint matching, loco-manipulation, RL whole-body control, imitation learning |

**一行定位**：前面几期的 H2O、OmniH2O、HOVER 都是「人做动作，机器人跟」；HOMIE 换了个思路——**遥操作的设备直接长成机器人的样子**（同构外骨骼），读数就是关节角，上半身不用估姿态、不用逆运动学；走和蹲交给脚下的踏板和一个强化学习策略。

---

## 🎯 一句话总结

> HOMIE 把人形遥操作拆成上下两半：**下半身**由一个强化学习策略 $\pi _ {loco}$ 负责，它只认三个命令 $C_t = [v_x, \omega _ {yaw}, h_t]$（前后速度、转向、躯干高度），由操作员脚下的三只踏板给出；**上半身**由和机器人同构的外骨骼负责，舵机读数直接设成关节角 $q _ {upper}$，手指由霍尔手套驱动。$\pi _ {loco}$ 的训练**不用任何动捕数据**，靠三个技巧：**上身姿态课程**（课程比例 $\rho_a$ 从 0 涨到 1，按式 2 的截断指数分布抽上身关节离默认角多远，每 1 s 重采样并线性插值，模拟外骨骼连续的动作），**膝角奖励** $r _ {knee}$（式 4：高度差 × 归一化膝角减 1/2，帮机器人学会蹲到任意高度），**对称**（每条转移沿身体中面镜像一份一起进缓冲区，再加两项对称损失）。结果：三组消融里每个技巧都有用（图 7），换成更高更重的 GR-1 只改几个身材相关的数（表 II）；手臂输出 263 Hz、手 293 Hz，不用 GPU（表 IV）；四个桌面任务的用时约为 VR 方案 OpenTelevision 的一半（图 11）；5 位新手连做 5 次递手任务，平均用时从 24.8 s 降到 8.0 s（图 12）；两个任务各采 50 条示范训出的自主策略成功率 73.3% 和 80.0%（表 V）。

> 🎮 **本文内嵌 1 段讲解动画、1 段配音视频和 3 个交互演示**（不用装任何东西）：
> [十七幕动画：HOMIE 全流程](#homie-explainer-anim) —— 约 272 秒串完「两条路各缺一半 → 一个驾驶舱：踏板、外骨骼、手套 → 表 I：和十个遥操作系统比 → 下半身交给强化学习 → 上身姿态课程 → 高度跟踪奖励 → 训练场：蹲、走、站轮着来 → 对称：一条数据当两条用 → 图 7：三组消融 → 换一台机器人：GR-1（表 II）→ 同构外骨骼：读数就是关节角 → 手套与踏板（表 III）→ 表 IV：263 Hz，不用 GPU → 真机：图 1 的任务 → 图 11、12：一半的时间，五次上手 → 仿真里开，数据训自主策略 → 局限与代码」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。
> [配音讲解视频](#homie-video) —— 同样十七幕，加中文配音与字幕，竖屏，可下载
> [上身姿态课程](#demo-curriculum) —— 拖 $\rho_a$ 看式 2 的密度、4000 次抽样的关节目标直方图和一个关节 10 s 里的目标轨迹；可以切换论文与代码两种写法
> [$r _ {knee}$ 计算器](#demo-knee) —— 拖我们 MuJoCo 回放里一段下蹲的帧，看高度差、归一化膝角和罚分；也可以自己拖高度差和膝角
> [表 I–V、图 11、表 X 与我们的复现](#demo-tables) —— 论文的表照抄，图 11 是从矢量图量的条高，最后一页是我们的 MuJoCo 回放

> 🚶 [具体实例](#实例-环境设定)用官方策略在 MuJoCo 里的几段回放从头算一遍：一步观测 76 维怎么拼、课程比例为 0 / 0.5 / 1 时关节目标平均走多远、下蹲第 0.53 s 与第 4.0 s 的 $r _ {knee}$、命令怎么抽、镜像前后的动作、外骨骼零点怎么标、一个 Wi-Fi 包装什么、硬件多少钱，最后读图 11、表 X 和我们自己的回放统计。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **HOMIE** | Humanoid Loco-Manipulation with Isomorphic Exoskeleton Cockpit | 本文：同构外骨骼驾驶舱 |
| **Loco-Manipulation** | Locomotion + Manipulation | 移动操作：边走、边蹲边用手干活 |
| **Isomorphic Exoskeleton** | 同构外骨骼 | 关节的排布和机器人手臂一模一样，读数就是机器人的关节角 |
| **Joint Matching** | 关节匹配 | 遥操作设备的关节角直接设给机器人，跳过姿态估计和逆运动学 |
| **IK** | Inverse Kinematics | 逆运动学：由末端位置反解关节角，VR / 视觉方案要用 |
| **MoCap** | Motion Capture | 动作捕捉；ExBody、H2O 等用它的数据做动作先验，HOMIE 不用 |
| **FPV** | First-Person View | 机器人头部相机的第一视角画面，传回驾驶舱 |
| **HIM** | Hybrid Internal Model | Long 等人的四足行走框架，HOMIE 的网络与代码基底：估计器预测机身速度 + 潜变量 |
| **PIM** | Perceptive Internal Model | 同一组作者的人形感知行走，HOMIE 的奖励从这里改来，附录 A 拿它试了上台阶 |
| **PPO** | Proximal Policy Optimization | 训 $\pi _ {loco}$ 用的强化学习算法 |
| **IL** | Imitation Learning | 模仿学习：用遥操作采的示范训自主策略 $\pi _ {auto}$ |
| **DR** | Domain Randomization | 域随机化：仿真里随机质量、摩擦、增益、推力等，好上真机 |

---

## 🎬 十七幕动画：HOMIE 全流程 {#homie-explainer-anim}

<div class="paper-demo" data-demo="homie-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#homie-video}

<div class="paper-demo" data-demo="homie-video" data-src="media/homie_explainer_video.mp4" data-poster="media/homie_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/homie_explainer_video.mp4" download="HOMIE_讲解视频.mp4">下载 mp4（18.4 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（要解决什么问题、方法详解、实验结果）按小节收起，再往后的具体实例、源码对照、在路线中的位置、面试和附录各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 1、4、5、6、8 幕里的 G1，动作是我们在 MuJoCo 里跑官方 `HomieDeploy/deploy.onnx` 得到的（走路 0.5 m/s、蹲到 0.40 m 再站起、按代码的课程随机摆上身、站着只动手臂，以及第 1 幕同样往前下方伸手、一台站着一台蹲下；做法与数字见下文「🚶 具体实例」的环境设定），和第二个交互演示、「🚶 具体实例」是同一组数字。G1 的 3D 外形：带 Dex3 手的 G1 模型、材质与光照照抄 [Robot Retarget Online](https://imchong.github.io/Robot_Retarget_Online/) 的 three.js 场景，按仿真的关节角用正交相机逐帧离线渲染；第 8 幕的镜像是把同一张贴图水平翻转。表格和第 1、2、9–13、17 幕的图来自论文；第 2、10–12、14–16 幕的真机与仿真画面剪自[项目页](https://homietele.github.io/)的视频（项目页写明都是原速），只做讲解引用。第 1 幕的货架（只有高度按比例）、第 7 幕的时间轴是示意。

---

## ❓ 要解决什么问题

<div class="mermaid">
flowchart TB
    A["强化学习的全身控制<br/>ExBody / HumanPlus / H2O / OmniH2O<br/>会走、会适应环境"] --> A1["但没有实时、精确的遥操作接口<br/>训练还要动捕数据做动作先验"]
    B["遥操作系统<br/>OpenTelevision / AnyTeleop / GELLO<br/>手很准"] --> B1["但只管上半身<br/>机器人站在原地"]
    A1 --> Q["边走边干活：要么放弃灵巧操作<br/>要么被困在原地"]
    B1 --> Q
    Q --> H["HOMIE：一个驾驶舱<br/>踏板 → 强化学习下肢策略 π_loco<br/>同构外骨骼 + 手套 → 直接设上身关节角"]

    style Q fill:#e8f4fd,stroke:#1f78b4
    style H fill:#e8f8e8,stroke:#27ae60
</div>

### 两条路各缺一半（第 I 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：强化学习的全身控制没有遥操作接口；遥操作系统只管上身、不考虑走动；HOMIE 把两边装进一个驾驶舱</summary>

论文开头的判断：

- **强化学习全身控制**这条路（ExBody、HumanPlus、H2O、OmniH2O 等）让人形学会了走、适应环境，但**没有给遥操作留一个实时、精确的接口**——要么用 VR / 视觉估人的姿态再重定向，要么用动捕；而且训练这些策略时都要用动捕数据做**动作先验**。
- **遥操作系统**这条路（OpenTelevision、AnyTeleop、GELLO、AirExo 等）手很准，但**大多只管上半身**，机器人站在原地，不考虑走动对工作空间的影响。
- 两边各缺一半：遥操作人形时，要么边走边放弃灵巧操作，要么操作时被困在原地。动画第 1 幕用官方策略的 MuJoCo 回放对比：同样往前下方伸手，站着时双手的最低点在 0.53 m，够不到货架最低一层；再蹲到 0.40 m，手能下到 0.20 m（回放是我们的复现，货架是示意，都不是论文的图）。

HOMIE 的回答是一个**驾驶舱**（cockpit）：脚下的踏板管走和蹲，手臂上的同构外骨骼管两条胳膊，体感手套管手指；底下配一个强化学习的下肢策略，在任意上身姿态下都能稳走、稳蹲。论文图 1 是遥操作 Unitree G1 做的九件事：蹲下拿胶带放上高层货架、两台机器人传苹果、抱着箱子换到另一个货架、推坐在椅子上约 60 kg 的人（约为 G1 体重的两倍）、拉开烤箱门、拿番茄递手后放进果篮、从地上捡瓶子、拿花放进桌上的盒子、上身剧烈动作时保持平衡。

</details>

### 表 I：和十个遥操作系统比

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三组前人：同构机械臂只有夹爪、视觉 / VR 要逆运动学、能控全身的要动捕先验；只有 HOMIE 一行全是勾</summary>

表 I 的十一行（价格单位：美元；照抄论文）：

| 系统 | 价格 | 手臂跟踪 | 灵巧手跟踪 | 移动操作 | 全身 | 不用动捕 |
|------|------|------|------|:--:|:--:|:--:|
| Mobile-ALOHA | 32k | 关节匹配 | — | ✓ | ✗ | ✓ |
| GELLO | 0.6k | 关节匹配 | — | ✗ | ✗ | ✓ |
| AirExo | 0.6k | 关节匹配 | — | ✗ | ✗ | ✓ |
| ACE | 0.6k | 关节匹配 | 视觉重定向 | ✗ | ✗ | ✓ |
| DexCap | 4k | 视觉重定向 | 动捕 + SLAM | ✗ | ✗ | ✓ |
| AnyTeleop | ~0.3k | 视觉重定向 | 视觉重定向 | ✗ | ✗ | ✓ |
| OpenTelevision | 4k | VR 设备 | VR 设备 | ✗ | ✗ | ✓ |
| HumanPlus | 0.05k | 视觉重定向 | 视觉重定向 | ✓ | ✓ | ✗ |
| OmniH2O | 0–3.5k | 视觉 / VR | 视觉 / VR | ✓ | ✓ | ✗ |
| Mobile-TeleVision | 3.5k | VR 设备 | VR 设备 | ✓ | ✓ | ✗ |
| **HOMIE** | **0.5k** | **关节匹配** | **关节匹配** | ✓ | ✓ | ✓ |

- 第一组（Mobile-ALOHA、GELLO、AirExo、ACE）是**同构机械臂**做关节匹配，又准又快，但手上只有夹爪（ACE 的手是视觉重定向），也不控全身。
- 第二组（DexCap、AnyTeleop、OpenTelevision）用视觉或 VR 设备先估出人的手腕和手指，再用逆运动学解关节角；论文说这类方法延迟高、怕遮挡，还会有误差。
- 第三组（HumanPlus、OmniH2O、Mobile-TeleVision）能遥操作全身、边走边干活，但训练时都要用动捕数据做动作先验。
- HOMIE 这一行全是勾；0.5k 美元是 Mobile-ALOHA 的 1/64。

</details>

### 三条贡献

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一套强化学习训练框架（不用动捕、三个技巧）；一套低成本外骨骼硬件；整套系统在真机、仿真和模仿学习上的验证</summary>

1. **强化学习训练框架**：不用动捕数据，靠上身姿态课程、高度跟踪奖励（$r _ {knee}$）和对称，让不同的人形在任意连续变化的上身姿态下稳走、快速蹲到任意高度；
2. **低成本外骨骼硬件**：同构手臂 + 15 自由度霍尔手套 + 踏板，合计约 0.5k 美元，比动捕设备便宜得多；关节匹配让遥操作更快更准；
3. **系统验证**：消融、换机器人、硬件指标、真机任务、和 VR 方案比用时、用户研究、仿真遥操作，以及用采到的数据训自主策略。

</details>

---

## 🔧 方法详解（第 III 节）

<div class="mermaid">
flowchart LR
    subgraph COCKPIT["驾驶舱（操作员）"]
        P["三只踏板 + 两个换向开关"] --> C["C_t = [v_x, ω_yaw, h_t]"]
        E["同构外骨骼 7 自由度 × 2<br/>XL330 舵机，0.09°"] --> U["q_upper：直接设定"]
        G["霍尔手套 15 自由度 × 2"] --> F["灵巧手关节"]
        S["屏幕：机器人第一视角"]
    end
    subgraph ROBOT["Unitree G1"]
        C -->|"Wi-Fi，128 字节，16 ms"| L["π_loco（Orin，50 Hz）<br/>下肢 12 个关节"]
        U -->|"Wi-Fi"| UP["腰 + 两臂 15 个关节<br/>PD 跟目标"]
        F --> H["Dex3 手"]
        CAM["头部相机"] -->|"Wi-Fi"| S
    end
    subgraph TRAIN["π_loco 的训练（Isaac Gym，不用动捕）"]
        T1["① 上身姿态课程 ρ_a：式 2、3"] --> PPO["PPO + HIM 估计器<br/>4096 个环境，约 3 小时"]
        T2["② 膝角奖励 r_knee：式 4<br/>1/3 蹲、2/3 站和走"] --> PPO
        T3["③ 对称：镜像转移 + 式 5、6"] --> PPO
    end
    PPO -->|"零样本 sim-to-real"| L
    ROBOT -->|"采示范（10 Hz）"| IL["π_auto（Seer）<br/>接管 C_t 与 q_upper"]

    style L fill:#fdebd0,stroke:#e67e22
    style U fill:#fff4d6,stroke:#d4a017
    style IL fill:#e8f8e8,stroke:#27ae60
</div>

### 系统总览（第 III-A 节、图 2）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：踏板给 $C_t$、$\pi _ {loco}$ 控下半身；外骨骼给 $q _ {upper}$、直接设给上半身；第一视角经 Wi-Fi 回到驾驶舱；采到的数据训 $\pi _ {auto}$ 接管</summary>

- 任意时刻 $t$，机器人头部相机的**第一视角（FPV）**经 Wi-Fi 传到驾驶舱里的屏幕，操作员看着它遥操作。
- 操作员踩踏板给出**行走命令** $C_t = [v _ {x,t}, \omega _ {yaw,t}, h_t]$：前后速度、转向角速度、躯干的目标高度；**下肢策略** $\pi _ {loco}$ 根据 $C_t$ 控下半身。
- 同时，外骨骼给出**上身关节角** $q _ {upper}$，**直接设给机器人**（不估姿态、不解逆运动学）；手套驱动灵巧手。
- 驾驶舱与机器人之间全走 Wi-Fi，机器人可以离操作员很远；同一套驾驶舱也能开仿真里的机器人（图 2 左）。
- 遥操作时就能采示范，训一个**自主策略** $\pi _ {auto}$；训好后它替操作员给出 $C_t$ 和 $q _ {upper}$（图 2 右）。

</details>

### 训练设置：观测、网络与 PD（第 III-B-1 节、附录 A）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一步观测 $O_t$ 叠 6 步；HIM 的估计器 + 动作网络 + 价值网络；动作是下肢 12 个关节，PD 算力矩；代码基于 HIMLoco 和 legged_gym</summary>

- **观测**：一步 $O_t = [C_t, \omega_t, g_t, q_t, \dot q_t, a _ {t-1}]$——命令、机身角速度、重力方向在躯干坐标系里的投影、**所有**关节的角度和速度、上一步动作；策略看最近 6 步 $O _ {t-5:t}$。G1 训练用 27 个关节（锁住腰的横滚、俯仰），代码里一步是 76 维：命令 4（比论文多一个侧向速度 $v_y$）+ 角速度 3 + 重力 3 + 关节角 27 + 关节速度 27 + 上一步下肢动作 12；叠 6 步 456 维（[例 1](#实例-1-一步观测-76-维)）。
- **动作**：和下肢 12 个关节一一对应（每条腿髋 3、膝 1、踝 2）。腰和两臂 15 个关节的目标由外骨骼（训练时由课程）给出。
- **PD**：论文式 1 写成 $\tau _ {t,i} = K _ {p,i}(a _ {t,i} - q _ {0,t,i}) - K _ {d,i}\dot q _ {t,i}$（漏了当前角 $q$，我们认为是笔误）；代码是目标角 = 默认角 + 0.25 × 动作，$\tau = K_p(\text{目标} - q) - K_d \dot q$。仿真步长 1/200 s，每 4 步出一次动作（50 Hz）。
- **网络**（附录 A，沿用 HIM）：
  - 估计器 $\mathcal E$：456 → 256 → 256 → 35，输出 3 维机身线速度 + 32 维潜变量；潜变量用对比学习（SwAV 式，64 个原型）和下一步观测的编码对齐；
  - 动作网络 $\mathcal N$：35 + 当前一步 76 = 111 → 512 → 256 → 256 → 12；
  - 价值网络 $\mathcal C$：76 + 真实机身线速度 3 = 79 → 512 → 256 → 256 → 1（附录 A 写的是 2 + …，代码是 3，见源码对照）。
- **训练**：Isaac Gym、4096 个并行环境、RTX 4090；项目页说约 3 小时训好。代码基于 HIMLoco 与 legged_gym / rsl_rl。

</details>

### 上身姿态课程（式 2、3）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：课程比例 $\rho_a$ 从 0 起、跟踪达标就加 0.05；先按截断指数分布抽上限 $\rho_a'$，再在 $[0, \rho_a']$ 里均匀抽；每 1 s 重采样、线性插值</summary>

**目的**：操作员的手臂随时在动，$\pi _ {loco}$ 要在**任意连续变化**的上身姿态下都能走、能蹲。

**做法**：

1. 课程比例 $\rho_a$ 从 0 开始；每当机器人跟踪线速度的奖励过了阈值，$\rho_a$ 加 0.05，一直加到 1（代码：每 1000 步查一次，x 方向速度跟踪的回合奖励过了满分的 80% 才加）。
2. 先从截断指数分布里抽一个上限 $\rho_a'$（式 2）：

$$
p(\rho_a' \mid \rho_a) = \frac{20(1-\rho_a)\, e^{-20(1-\rho_a)\rho_a'}}{1 - e^{-20(1-\rho_a)}},\quad \rho_a' \in [0, 1]
$$

3. 再在 $[0, \rho_a']$ 里均匀抽 $a_i$（式 3 是两步合成一步的写法，逆变换采样）；每个上身关节的目标 = 默认角 +（限位 − 默认角）× $a_i$，往上限还是下限各一半概率。
4. 每 **1 s** 重新抽一次目标，这 1 s 里从当前值**线性插值**过去，模拟外骨骼的连续动作。论文说，不这样插值，机器人在连续动作下站不稳。

**为什么不直接 $\mathcal U(0, \rho_a)$**：式 2 的分布任何时候在整个 $[0, 1]$ 上都大于 0（大的幅度也能偶尔抽到），随 $\rho_a$ 增大逐渐从「贴着 0」变成 $\mathcal U(0, 1)$；直接 $\mathcal U(0, \rho_a)$ 永远抽不到 $(\rho_a, 1]$。图 7 第一行的 rand 就是这个对照。

**代码的出入**：指数系数是 $\lambda = 20(1 - 0.99\rho_a)$，所以 $\rho_a = 1$ 时 $\lambda = 0.2$，不是论文的 0（$\rho_a'$ 均值 0.483 而不是 0.5，[例 2](#实例-2-课程比例下关节目标走多远)）。

</details>

<div class="paper-demo" data-demo="homie-curriculum" id="demo-curriculum"><p class="demo-fallback">（本节含交互演示：上身姿态课程，需要启用 JavaScript）</p></div>

### 高度跟踪奖励 $r _ {knee}$（式 4）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：高度差 × (归一化膝角 − 1/2) 取负的绝对值；论文正文对它方向的描述和公式相反；每 4 s 重新抽命令，1/3 蹲、2/3 站和走</summary>

能蹲下去，工作空间就大得多（低处的东西也能拿）。$\pi _ {loco}$ 要能蹲到目标高度 $h_t$，为此新加：

$$
r_{knee} = -\left\| (h_{r,t} - h_t) \times \left( \frac{q_{knee,t} - q_{knee,min}}{q_{knee,max} - q_{knee,min}} - \frac{1}{2} \right) \right\|
$$

- $h _ {r,t}$ 是机器人的实际高度，$q _ {knee,t}$ 是当前膝角，归一化到 $[0, 1]$（代码用膝关节的硬限位 $[-0.0873, 2.8798]$ rad）。
- 膝角正好在中间（归一化 $n = 1/2$，即 1.40 rad）或高度对上了，这一项就是 0。
- **方向**：$n < 1/2$ 时把膝弯一点（$n$ 往 1/2 走）总能让罚分变小，$n > 1/2$ 时伸一点总能变小——和高度差的正负无关。论文正文写「$h _ {r,t} < h_t$ 时鼓励弯、$h _ {r,t} > h_t$ 时鼓励伸」，按公式算正好相反（机器人太低时膝盖往往已经很弯，$n > 1/2$，公式鼓励伸、站起来，这才是对的）；**我们认为正文是笔误**。[例 3](#实例-3-下蹲两帧的-rknee) 用两帧回放算一遍。
- 它本身不知道目标在哪，真正把机器人带到目标高度的是它和高度跟踪奖励 $\exp(-4 \mid h_t - h _ {r,t}\|^2)$ 一起作用（我们的理解；代码里高度奖励用的是 $\exp(-4\|\text{误差}\|)$）。
- 代码：权重 −0.75；高度差用骨盆的 $z$ 减目标；两条腿各算一次再相加。

**命令怎么抽**：每 4 s 重新抽一次全部命令；论文说 1/3 的环境练蹲、2/3 练站和走，同一个环境会在蹲和走之间来回切换，学会两者的过渡。代码的比例是蹲 1/3、站着不动 1/6、走 1/2（[例 4](#实例-4-命令怎么抽)）。

</details>

<div class="paper-demo" data-demo="homie-knee" id="demo-knee"><p class="demo-fallback">（本节含交互演示：$r _ {knee}$ 计算器，需要启用 JavaScript）</p></div>

### 训练场：奖励与随机化（附录 A，表 VI–VIII）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：33 项奖励（从 PIM 改来）；手和躯干随机加重、每 4 s 推一下；代码里 7 项奖励只在站着时才算</summary>

**奖励**（表 VI，G1 的权重；分组是我们为讲解加的）：

| 组 | 项（权重） |
|------|------|
| 跟踪 | x 线速度 1.5、y 线速度 1.0、偏航角速度 2.0、根部高度 2.0 |
| 蹲 | $r _ {knee}$ −0.75 |
| 正则 | z 线速度 −0.5、xy 角速度 −0.025、朝向 −1.5、动作变化率 −0.01、髋偏离默认角 −0.2、踝偏离 −0.5、关节加速度 $-2.5\times10^{-7}$、关节越限 −2.0、平滑 −0.05、关节功率 $-2\times10^{-5}$、力矩 $-2.5\times10^{-6}$、关节速度 $-10^{-4}$、速度越限 $-2\times10^{-3}$、力矩越限 −0.1、关节跟踪误差 −0.1、动作越界 −1.0 |
| 脚 | 腾空时间 0.05、抬脚高度 −0.25、两脚间距 0.5、两膝间距 1.0、脚掌贴地 −2.0、两脚平行 −3.0、绊脚 −1.5、只有一只脚着地 0.75、打滑 −0.25、触地力 $-2.5\times10^{-4}$、触地动量 $2.5\times10^{-4}$、站着别动 −0.15 |

共 33 项。GR-1 只有几项权重不同（偏航角速度 1.0、髋偏离 −0.5、踝偏离 −0.75、力矩越限 −0.2、只有一只脚着地 0.5、关节跟踪误差 −0.25、站着别动 −0.2）。

**代码里的门控**：z 线速度、髋偏离、踝偏离、两脚 / 两膝间距的上限、两脚平行、站着别动这 7 项，只在目标高度 ≥ 0.735 m（站着）时才算；蹲着时不罚（论文没写）。

**域随机化**（表 VII）：电机力矩偏移 ±0.05 N·m、躯干（与手）加重 −5 到 10 kg、**手上加重 −0.1 到 0.3 kg**（论文说是为了拿得住东西）、躯干质心偏移 ±0.1 m、连杆质量 × 0.8–1.2、摩擦 0.1–2.0（代码是 0.1–3.0）、恢复系数 0–1、$K_p$ / $K_d$ × 0.9–1.1、初始关节角 × 0.8–1.2 再加 ±0.1 rad、每 4 s 推一下（x、y 速度 ±0.5 m/s）、关节角 / 关节速度 / 角速度 / 重力观测加噪声。

**其他参数**（表 VIII）：站立目标高度 0.74 m（GR-1 0.90 m）；$v_x \in [-0.8, 1.2]$ m/s、$v_y \in [-0.5, 0.5]$、偏航 $[-0.8, 0.8]$ rad/s；两脚、两膝间距 0.20–0.35 m（GR-1 上限 0.40）；抬脚目标 0.14 m；上身姿态每 1 s、命令每 4 s 重采样。表里蹲的高度范围写成 $[-0.24, 0.74]$，代码是 0.74 + $\mathcal U(-0.5, 0)$ = $[0.24, 0.74]$ m（负号是笔误，我们的判断）。

</details>

### 对称（式 5、6）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：每条转移沿身体中面镜像一份，原始与镜像都进缓冲区；更新时再加动作与价值的对称损失</summary>

沿用 Su 等人（2024）的做法：

1. 每拿到一条转移 $T_t = (s_t, a_t, r_t, s _ {t+1})$，沿机器人的 x–z 平面（身体中面）**镜像**一份 $T_t'$：左右腿的关节对调、横滚和偏航取负；腰的偏航取负、左右手臂对调；命令里的侧向速度和转向也取负。
2. $T_t$ 和 $T_t'$ **都放进回放缓冲区**，数据量翻倍。
3. 更新时把缓冲区里的样本再镜像一次，原始和镜像都过一遍动作网络与价值网络，加两项损失：

$$
\mathcal L^{actor}_{sym} = \mathrm{MSE}(a_t, a_t'),\qquad \mathcal L^{critic}_{sym} = \mathrm{MSE}(V_t, V_t')
$$

代码里动作那一项比的是「镜像观测下的动作」和「原始动作的镜像」，系数 1.0；价值那一项把一边 `detach`。图 7 第三行说明：镜像增强大大提高数据效率（项目页说训练快 10 倍以上），对称损失保住左右对称。[例 5](#实例-5-镜像前后的动作) 是我们在回放里量的。

</details>

### 同构外骨骼（第 III-C-1 节、式 7）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：每臂 7 自由度、XL330 舵机 0.09°、断电记得绝对位置；舵盘四个孔让零点偏差是 $\pi/2$ 的整数倍</summary>

- **结构**：一对对称的手臂，每条 7 自由度（肩 3、肘 1、腕 3），对上 G1 / GR-1 的手臂；3D 打印。
- **舵机**：每个关节一个 DYNAMIXEL XL330-M288-T，读数和设定的精度 0.09°（一圈 4096 格）。和增量编码器比，舵机断电后还记得绝对位置，开机不用重新标定。
- **尺寸**：操作部分的长度按人的手臂来做；完全复刻机器人的大臂结构很难，所以只把舵机的转轴对齐机器人 URDF 的关节坐标系。
- **标定**（式 7）：舵机角 $p_t$ 和机器人关节角 $q_t$ 之间的偏差 $o_t$ 装好后就固定了；舵盘上有四个对称的孔，所以 $o_t = n_t \pi / 2$，$n_t$ 是整数：

$$
q_t = \pm k_t\left(p_t + \frac{n_t\pi}{2}\right) + \tau_t
$$

  论文取 $k_t = 1$、$\tau_t = 0$（不缩放、不补偿），正负号管方向。[例 6](#实例-6-外骨骼零点怎么标) 算一个。
- **上手**（附录 D）：用可调的绑带固定在背上，测试者身高 160–185 cm 都能穿；从穿戴到开始做任务约 5 分钟。

</details>

### 手套与踏板（第 III-C-2、3 节、表 IX）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：霍尔传感器 + 小磁铁，每根手指 3 个角共 15 自由度，可拆下换到别的外骨骼；三只踏板 + 两个换向开关，电位器测踩下多少</summary>

- **手套**：参考 Nepyope 的 Project Homunculus；每个关节放一颗小钕磁铁和一个霍尔传感器，关节一转磁铁跟着转，测到的磁场就变了。每根手指测 3 个角——指尖俯仰、指腹俯仰、指腹偏航——5 根手指共 15 自由度，比多数灵巧手多。单片机装在手背，传感器用端子插接，可以改映射；手套能从外骨骼上拆下来，换到别的机器人上用。读数到关节角不是严格线性，表 IX 列了每个角的量程（例如拇指指腹俯仰 100°、读数变化 1024）。
- **踏板**：代替遥控器给 $\pi _ {loco}$ 发 $C_t$。高精度旋转电位器把踩下的程度变成电信号；三只小踏板分别管转向 $[0, \pm\omega _ {max}]$、高度 $[H _ {min}, H _ {max}]$、前后速度 $[0, \pm V _ {max}]$（图 6），一对脚踩的瞬时开关切换左 / 右、前 / 后。踩下加速、松开减速，像开车；配置可以改。
- 手留给手臂，人也不用跟着机器人走来走去。

</details>

### 部署（附录 C）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：$\pi _ {loco}$ 在 G1 机载的 Orin 上 50 Hz；只用 CPU 的主机读四条数据线、经 Wi-Fi 发命令；手臂目标 10 Hz、每个插值 50 次</summary>

- $\pi _ {loco}$ 直接跑在 G1 机载的 Jetson Orin（275 TOPS）上，50 Hz，和训练一致。
- 一台只用 CPU 的主机用四条数据线连外骨骼、左右手套和踏板的单片机，实时读数，再经 Wi-Fi 把 $q _ {upper}$、手指和 $C_t$ 发给机器人；一个包 128 字节（32 个 float32），正常网络下延迟 16 ms，带校验和。
- 手臂目标在 G1 上其实是 **10 Hz** 更新、每个目标插值 50 次，受限于硬件和网络；论文说机器人吃得下的话可以到 200 Hz 以上。
- 头部 D455 相机 640×480、约 30 Hz，画面传回驾驶舱。G1 的部署代码改自 walk-these-ways。

</details>

---

## 📊 实验结果（第 IV 节）

### 图 7：三组消融

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：3 个种子、1000 个环境 × 20 s、$\rho_a \to 1$ 的随机上身；课程、膝角奖励、对称各有一组对照</summary>

**设置**：每种设定 3 个随机种子训 G1，在 1000 个环境里评 20 s，上身姿态按 $\rho_a \to 1$ 的式 3 随机；指标是线速度误差、角速度误差、高度误差、对称损失、存活时间，报 3 个种子的均值和标准差。

- **课程**（第一行）：ours 对 w/o cur（不用课程，直接 $a_i = \mathcal U(0, \mathcal U(0, 1))$）和 rand（同样的 $\rho_a$，但换成 $\mathcal U(0, \mathcal U(0, \rho_a))$）。ours 的三项跟踪误差都更低、收敛更快；后两者最后没有明显差别。三者的存活时间最后差不多，ours 和 w/o cur 收敛更快；rand 抽不到 $(\rho_a, 1]$，$\rho_a$ 变大后更难收敛。
- **膝角奖励**（第二行）：w/o knee（不用 $r _ {knee}$）和 hei（不用 $r _ {knee}$、把高度奖励放大）。速度误差 ours ≈ w/o knee，hei 大得多（读图约大一倍）；高度误差 ours 收敛最快，hei 在第 400 步时一度更好，但最后没有更快降下来。论文的解释：只放大高度奖励会压过其他奖励的反馈。
- **对称**（第三行）：w/ aug（只做镜像增强）、w/ sym（只加对称损失，正文有一处写成 nsym）、none。除对称损失外 ours 和 w/ aug 差不多，ours 稍好；w/ aug 的对称损失很高（读图到 20 左右）；w/ sym 和 none 训得慢得多，2000 步里存活时间一直很短（读图约 1 s）。结论：镜像增强提高数据效率，对称损失防止策略为了完成任务牺牲对称。

（图里的数是读图近似值。）

</details>

### 换一台机器人：GR-1（表 II、图 8）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：GR-1 高 35 cm、重约 20 kg，手的占比只有一半；只改高度范围和身材相关的距离；两台都活满约 20 s</summary>

- 图 8：G1 高 130 cm、36.4 kg，手 1.42 kg（7 自由度 Dex3），手占体重 3.9%；GR-1 高 165 cm、56 kg，手 1.04 kg（6 自由度），占 1.9%。图注写成「手重占比 = 全身 / 双手」，按数值应是「双手 / 全身」（我们的判断）。
- 训练 GR-1 只改了高度跟踪的范围（站立 0.74 → 0.90 m）和几个身材相关的距离（两脚 / 两膝最大间距 0.35 → 0.40 m），流程不变。正文说奖励权重也没改，但表 VI 里 GR-1 有 7 项权重和 G1 不同（见上文「训练场」），以表为准。
- 表 II（各训 2000 步，同图 7 的评测）：

| 指标 | Unitree G1 | Fourier GR-1 |
|------|------|------|
| 线速度误差（m/s） | 0.194 ± 0.003 | 0.273 ± 0.003 |
| 角速度误差（rad/s） | 0.451 ± 0.006 | 0.540 ± 0.002 |
| 高度误差（m） | 0.022 ± 0.019 | 0.038 ± 0.003 |
| 对称损失 | 0.019 ± 0.017 | 0.009 ± 0.001 |
| 存活时间（s） | 19.947 ± 0.092 | 19.960 ± 0.035 |

- GR-1 的训练代码没有开源（README 的待办里写着「为更多机器人放出训练代码」）。

</details>

### 硬件指标（表 III、表 IV、图 9）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：外骨骼 430、手套各 30、踏板 20 美元；手臂 263 Hz、手 293 Hz，不用 GPU；一副手套在仿真里驱动四种灵巧手</summary>

**表 III**（采集频率是有线、115200 波特率下测的；精度是 12 位读数）：

| 硬件 | 价格（美元） | 采集频率 | 精度 |
|------|------|------|------|
| 外骨骼（两臂） | 430 | 0.26 kHz | $2^{12}$（360°） |
| 手套（每只） | 30 | 0.3 kHz | $2^{12}$ |
| 踏板 | 20 | 0.5 kHz | $2^{12}$（270°） |

贵在外骨骼的舵机；手套和踏板的电路板、传感器模块是自己设计焊的。

**表 IV**（上身遥操作输出给机器人的频率）：

| 系统 | 硬件 | 手臂（Hz） | 手（Hz） |
|------|------|------|------|
| Telekinesis | 2 块 RTX 3080 Ti | 16 | 24 |
| AnyTeleop | RTX 3090 | 125 | 111 |
| OpenTeleVision | M2 芯片 | 60 | 60 |
| **HOMIE** | **不用 GPU / SoC** | **263** | **293** |

关节匹配读到就发，输出频率约等于采集频率。注意这是驾驶舱这一侧的输出频率；G1 上手臂目标实际 10 Hz 更新再插值（附录 C）。

**图 9**：同一副手套在 SAPIEN 里（AnyTeleop 的 Dex Retargeting 库）驱动四种灵巧手，关节数 12–20 个。

</details>

### 真机任务与通信（第 IV-C-1 节、图 1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Wi-Fi 一包 128 字节、16 ms；蹲下取物、搬盒子、双机传苹果、推 60 kg 的人、开烤箱；项目页还有棍子打的鲁棒性测试</summary>

- 通信：一个包只要 128 字节（32 位浮点），正常网络下延迟 16 ms，论文认为对实时控制够用；加了校验和保证完整。
- 图 1 的九个任务：(a) 蹲下拿胶带、放上高层货架；(b) 两台机器人传苹果（两位操作员各开一台）；(c) 抱着箱子换到另一个货架；(d) 推坐在椅子上约 60 kg 的人，约为 G1 体重的两倍；(e) 拉开烤箱门；(f) 拿番茄、递到另一只手、放进果篮；(g) 从地上捡瓶子；(h) 拿花放进桌上的盒子；(i) 上身剧烈动作时保持平衡。
- 项目页另有鲁棒性视频（棍子用力打也站得住）、捡瓶子等；动画第 14 幕的片段剪自那里（原速）。

</details>

### 图 11、12：用时与上手（第 IV-C-1 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：四个桌面任务的用时约为 OpenTelevision 的一半；精确定位、定朝向的任务差得更多；5 位新手 5 次内追上专家</summary>

- **图 11**：四个桌面任务（图 10）——把番茄放进果篮（Pick & Place）、拿扫码枪按键扫条码（Scan Barcode）、一只手抓番茄递给另一只手（Hand Over）、手指勾住把手拉开烤箱（Open Oven）——和 VR 方案 OpenTelevision 比完成时间；论文说「接近一半」。我们从 PDF 的矢量图里量了条高（[例 9](#实例-9-读图-11)）：比值 0.50–0.72，平均 0.59。
- 论文的解释：要精确定位、定朝向时差距更大，因为 VR 估姿态在切向上不准，外骨骼没有这个问题。项目页说完成时间是 3 位操作员各做 3 次。
- **图 12 与表 X（用户研究）**：5 位身高、体重、性别不同的新手（没用过这套系统，也没遥操作过人形），简短讲解后做递手任务、连做 5 次；平均用时 24.8、23.0、14.2、13.0、8.0 s，第 5 次追上专家（[例 10](#实例-10-用户研究)）。

</details>

### 仿真遥操作（第 IV-C-2 节、图 13）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：把 G1 和 GR-1 的策略从 Isaac Gym 迁到 Isaac Sim 的 GRUtopia，同一套驾驶舱开仿真里的机器人</summary>

- 训练好的策略从 Isaac Gym 迁到 GRUtopia（基于 Isaac Sim / Isaac Lab）的场景；附录 C 说主要是对齐两边的关节顺序和四元数写法。
- 操作员看着第一视角在逼真的场景里遥操作、导航；仿真里能比真机更便宜、更多样地做移动操作任务。

</details>

### 自主策略（第 IV-D 节、表 V）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两个任务各采 50 条、10 Hz；Seer 输出手臂、灵巧手和高度命令；成功率 73.3% 和 80.0%（各测 15 次）</summary>

- **数据**：Squat Pick（蹲下拿沙发上的番茄）、Pick & Place（抓起番茄放进篮子），每个任务 50 条示范；以 10 Hz 记录 RGB 图像、机器人状态 $q_t$、上身命令 $q _ {upper}$ 和行走命令 $C_t$（相机：头上的 D455 与手臂上的 D435，附录 C；README 的硬件清单写 D435 两个；整个推理循环 10 Hz）。
- **模型**：Seer（自回归 Transformer）。多视角图像过 MAE 预训练的 ViT-B，本体感受过 MLP，拼成 token 后由 Transformer 编码，三个回归头分别输出手臂关节、灵巧手和高度命令；SmoothL1 损失；序列长 7、视觉预见与动作预测各 3 步；8 块 A100 训 40 个 epoch，取验证损失最低的。
- **部署**：G1 用网线连一台 RTX 4080 的主机（TCP，传图更快）。
- **表 V**：Squat Pick 73.3%、Pick & Place 80.0%，各测 15 次（即 11/15、12/15）。

</details>

<div class="paper-demo" data-demo="homie-tables" id="demo-tables"><p class="demo-fallback">（本节含交互演示：表 I–V、图 11、表 X 与我们的复现，需要启用 JavaScript）</p></div>

---

## ⚠️ 局限与讨论

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：地形（接 PIM 后真机会撞台阶）、拇指设计、没有力反馈、外骨骼不能控腰；代码后来被 v2 与 SONIC 取代</summary>

论文自己写的局限（第 V 节）：

1. **地形**：策略还不能可靠地走各种地形。附录 A 把框架接到 PIM 上，仿真里 G1 能上高台阶（图 17 左），真机上走不稳、会撞台阶，虽然最后踩上去了（图 17 右）；原因是头上的激光雷达跟着晃，高程图的分辨率也不够。
2. **手套的拇指**：15 自由度的设计在拇指上不完全符合人手，操作某些灵巧手时不够直观顺手。
3. **没有力反馈**：需要精确触觉交互的任务受限。
4. **不能遥操作腰**：策略本身支持任意上身姿态，但外骨骼没做腰。

我们补充的（不是论文的说法）：

- 上身关节角是「直接设定」的，下肢策略只能被动适应；上身大幅、快速动作时，平衡全靠 $\pi _ {loco}$ 从课程里学到的鲁棒性（我们的理解）。
- 手臂目标在 G1 上实际 10 Hz，263 Hz 是驾驶舱侧的输出频率，两者不是一回事。
- README（2026-07）说作者在 NVIDIA GR00T-WholeBodyControl 的 `decoupled_wbc` 里做了一个 HOMIE v2 的强化学习策略，并建议直接用最新的 SONIC。

</details>

---

## 🚶 具体实例：用官方策略的 MuJoCo 回放从头算一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（12 节）：环境设定 / 例 1 一步观测 76 维 / 例 2 课程比例下关节目标走多远 / 例 3 下蹲两帧的 $r _ {knee}$ / 例 4 命令怎么抽 / 例 5 镜像前后的动作 / 例 6 外骨骼零点怎么标 / 例 7 一个 Wi-Fi 包 / 例 8 硬件多少钱 / 例 9 读图 11 / 例 10 用户研究 / 例 11 我们的回放统计</summary>

<h3 id="实例-环境设定">环境设定</h3>

- **策略**：官方仓库附带的 `HomieDeploy/deploy.onnx`（真机部署用的那一个），没有重新训练。
- **模型**：官方 `HomieRL/legged_gym/resources/robots/g1_description/g1.xml`（29 自由度 + Dex3 手），锁住腰的横滚、俯仰和全部手指关节，得到训练用的 27 个自由度；MuJoCo 3.16，步长 0.005 s，每 4 步出一次动作（50 Hz）。
- **观测**：照 HomieRL 的训练代码拼（命令按 $[2, 2, 0.5]$ 缩放、角速度 × 0.5、关节速度 × 0.05），叠 6 步、最旧的在前。
- **增益**：用真机部署 `HomieDeploy/unitree_sdk2/g1_control.cpp` 的——腿 $K_p$ 150 / 150 / 150 / 300 / 40 / 40、$K_d$ 2 / 2 / 2 / 4 / 2 / 2，腰 300 / 5，手臂 $K_p$ 150 / 150 / 150 / 100 / 10 / 10 / 5。HomieRL 配置里腿是 100 / 100 / 100 / 150 / 40 / 40，用那组增益时 `deploy.onnx` 会蹲得比命令低约 5 cm，换成部署增益后高度基本对上，所以**我们推断** `deploy.onnx` 是按部署增益训的。
- **几段动作**（15 fps 导出，和动画、演示一帧对一帧）：走路（$v_x = 0.5$ m/s，第 3.0–6.0 s）；下蹲（目标高度第 0.5 s 从 0.74 m 换成 0.40 m、第 4.0 s 换回，第 1.5–3.5 s 手臂往前下方伸，取第 0–6 s 共 90 帧）；按代码的课程随机摆上身（$\rho_a = 0.2$ 与 $\rho_a \to 1$）；站着只动手臂；第 1 幕的一对：手臂第 0.4–1.4 s 从下垂伸到往前下方（肩俯仰 −0.5、肘 1.5、肩横滚往外 0.2），一段一直站着、一段从第 1.4 s 起蹲到 0.40 m，取第 0.3–3.0 s 共 40 帧。双手的最低点是用 Robot Retarget Online 的带手 G1 模型按回放的关节角做正运动学、取手部可视网格最低的顶点：站着 0.53 m，蹲下 0.20 m。
- 这些都是我们的 sim-to-sim 复现，不是论文的实验；MuJoCo 和 Isaac Gym 的接触模型不同，数字不能和论文直接比。

<h3 id="实例-1-一步观测-76-维">例 1：一步观测 76 维</h3>

按代码（`legged_robot.py` 的 `compute_observations`）：

| 段 | 维数 | 缩放 |
|------|------|------|
| 命令 $v_x, v_y, \omega _ {yaw}$ | 3 | × 2、× 2、× 0.5 |
| 目标高度 $h_t$ | 1 | 原值 |
| 机身角速度 | 3 | × 0.5 |
| 重力投影 | 3 | — |
| 27 个关节角 − 默认角 | 27 | — |
| 27 个关节速度 | 27 | × 0.05 |
| 上一步下肢动作 | 12 | — |
| **合计** | **76** | |

叠 6 步 456 维进估计器；估计器输出 35 维（3 维速度 + 32 维潜变量），和当前一步 76 维拼成 111 维进动作网络。附录 A 的式子 $6 \times (9 + 2N _ {joints} + N _ {lower})$ 按 $N _ {joints} = 27$、$N _ {lower} = 12$ 算是 $6 \times 75 = 450$，比代码少的 6 维就是论文 $C_t$ 少写的 $v_y$（每步 1 维）。

<h3 id="实例-2-课程比例下关节目标走多远">例 2：课程比例下关节目标走多远</h3>

$\rho_a'$ 的均值是 $1/\lambda - 1/(e^\lambda - 1)$，$a_i$ 再在 $[0, \rho_a']$ 里均匀抽，均值减半：

| $\rho_a$ | 论文 $\lambda$ | 代码 $\lambda$ | $\rho_a'$ 均值（代码） | $a_i$ 均值 | $\rho_a' > 1/2$ 的概率 |
|------|------|------|------|------|------|
| 0 | 20 | 20 | 0.050 | 0.025 | ≈ 0 |
| 0.5 | 10 | 10.1 | 0.099 | 0.050 | 0.6% |
| 0.9 | 2 | 2.18 | 0.331 | 0.166 | 25.2% |
| 1.0 | 0 | 0.2 | 0.483 | 0.242 | 47.5% |

以左肘为例（上限 2.094 rad，默认角 0）：往上限那边的平均目标在 $\rho_a = 0$、0.5、1 时约 0.052、0.104、0.506 rad（0.506 rad ≈ 29°）。论文写法在 $\rho_a = 1$ 时 $\lambda = 0$，分布正好是 $\mathcal U(0, 1)$，$\rho_a'$ 均值 0.5。

<h3 id="实例-3-下蹲两帧的-rknee">例 3：下蹲两帧的 $r _ {knee}$</h3>

下蹲那段的第 8 帧与第 60 帧（代码：高度差 = 骨盆 $z$ − 目标；膝角按 $[-0.0873, 2.8798]$ 归一化，两条腿各算一次相加）：

| | 第 0.53 s（第 8 帧） | 第 4.0 s（第 60 帧） |
|------|------|------|
| 目标高度 | 0.40 m（刚换下来） | 0.74 m（刚换回去） |
| 骨盆 $z$ | 0.730 m | 0.423 m |
| 高度差 | +0.330 m | −0.317 m |
| 膝角（左 / 右） | 0.964 / 0.959 rad | 2.197 / 2.198 rad |
| 归一化 $n$ | 0.354 | 0.770 |
| 两膝 $r _ {knee}$ | −0.0967 | −0.1712 |
| × 0.75 | −0.0725 | **−0.128** |
| 只动膝角时罚得少的方向 | 弯（$n$ 往 1/2 走） | 伸 |

第 8 帧机器人太高、膝偏直，公式鼓励弯；第 60 帧太低、膝很弯，公式鼓励伸。论文正文的说法（低于目标鼓励弯、高于目标鼓励伸）和这两帧正好相反，所以我们认为正文写反了。legged_gym 最后还会再乘 $dt = 0.02$。这段回放里骨盆最低到 0.410 m（第 3.07 s），比 0.40 m 的目标高 1 cm。

<h3 id="实例-4-命令怎么抽">例 4：命令怎么抽</h3>

代码每 4 s 给每个环境抽 $x \sim \mathcal U(0, 1)$：

- $x < 1/3$：**蹲**——速度全清零，目标高度 0.74 + $\mathcal U(-0.5, 0)$，即 0.24–0.74 m；
- $x > 1/2$：**走**——$v_x \in [-0.8, 1.2]$、$v_y \in [-0.5, 0.5]$、偏航 $\in [-0.8, 0.8]$，高度 0.74 m；
- 其余（1/6）：**站着不动**，高度 0.74 m。

一个回合 20 s 抽 5 次命令，蹲的期望次数 5/3 ≈ 1.7 次。论文写的是「1/3 蹲、2/3 站和走」，代码把后者再分成站 1/6、走 1/2。

<h3 id="实例-5-镜像前后的动作">例 5：镜像前后的动作</h3>

站着、只把左臂抬起来时，官方策略的 12 维动作（左腿 6 个、右腿 6 个：髋俯仰、髋横滚、髋偏航、膝、踝俯仰、踝横滚）：

- 原始观测：左髋俯仰 −1.050、右髋俯仰 −0.748；
- 把观测镜像后：左髋俯仰 −0.758、右髋俯仰 −1.049——两个数基本对调；
- 「镜像观测下的动作」与「原始动作的镜像」之差的平方和 0.00071（代码的对称损失：对 12 维求和、对样本取平均；用上面三位小数的读数算是 0.00069）。

在全部回放里（3472 步）平均是 0.0044（中位数 0.0028）；表 II 里 G1 是 0.019 ± 0.017（评测设置不同，不能直接比）。

<h3 id="实例-6-外骨骼零点怎么标">例 6：外骨骼零点怎么标</h3>

式 7 取 $k_t = 1$、$\tau_t = 0$：$q_t = p_t + n_t\pi/2$。假设某个关节装好后，机器人在零位时舵机读 1.571 rad，就得到 $n_t = -1$；之后舵机读 1.20 rad，关节角就是 $1.20 - 1.571 = -0.371$ rad（这个读数是假设）。因为舵机断电记得绝对位置，$n_t$ 标一次就一直有效。

<h3 id="实例-7-一个-wi-fi-包">例 7：一个 Wi-Fi 包</h3>

128 字节 = 32 个 float32。论文没列包的格式；按需要发的量估计（我们的推测）：手臂 14 + 手指若干 + $C_t$ 3–4 维，能装进 32 个数。正常网络下延迟 16 ms，约是 $\pi _ {loco}$ 一步（20 ms）的 0.8 倍。

<h3 id="实例-8-硬件多少钱">例 8：硬件多少钱</h3>

外骨骼 430 + 手套 2 × 30 + 踏板 20 = **510 美元**，论文写约 0.5k。对比表 I：OpenTelevision、DexCap 约 4k（约 8 倍），Mobile-ALOHA 32k（约 64 倍）。

<h3 id="实例-9-读图-11">例 9：读图 11</h3>

我们把论文 PDF 的矢量图按 400 dpi 渲染，用坐标轴的刻度量条高（读图近似值，误差条没量）：

| 任务 | OpenTelevision（s） | HOMIE（s） | HOMIE / VR |
|------|------|------|------|
| 抓放 | 13.5 | 8.6 | 0.64 |
| 扫码 | 8.1 | 4.0 | 0.49 |
| 递手 | 15.3 | 7.6 | 0.50 |
| 开烤箱 | 12.3 | 8.9 | 0.72 |

比值平均 0.59；扫码和递手正好一半，开烤箱差得最少。

<h3 id="实例-10-用户研究">例 10：用户研究</h3>

表 X 的原始数据（递手任务，连做 5 次，单位 s）：

| 测试者 | 身高 / 体重 | 第 1–5 次 |
|------|------|------|
| 1（男） | 185 cm / 71 kg | 34、28、15、16、9 |
| 2（男） | 185 cm / 90 kg | 19、16、13、7、6 |
| 3（女） | 160 cm / 55 kg | 19、28、14、17、12 |
| 4（男） | 170 cm / 63 kg | 29、21、14、13、6 |
| 5（男） | 175 cm / 80 kg | 23、22、15、12、7 |
| **平均** | | **24.8、23.0、14.2、13.0、8.0** |

第 1 次到第 5 次用时降到约 1/3（8.0 / 24.8 = 0.32）；第 5 次的 8.0 s 和图 11 里专家的递手 7.6 s（读图值）很接近。

<h3 id="实例-11-我们的回放统计">例 11：我们的回放统计</h3>

200 段 × 20 s，命令按例 4 的代码规则每 4 s 随机，上身按 $\rho_a \to 1$ 的课程随机；误差只在每次换命令 1 s 之后算：

| 项 | 我们（MuJoCo） | 论文表 II（Isaac Gym） |
|------|------|------|
| 活满 20 s | 174 / 200 段 | — |
| 平均存活（s） | 18.43 | 19.947 |
| 线速度误差（m/s） | 0.087 | 0.194 |
| 角速度误差（rad/s） | 0.204 | 0.451 |
| 高度误差（m） | 0.0045 | 0.022 |

我们的误差算法、仿真器和增益都和论文不同（论文的误差可能包含换命令后的过渡），**不能直接比**；能说的只是：官方策略在 MuJoCo 里也能在随机上身下走、蹲，大多数回合不摔。

</details>

---

## 📁 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：目录、论文各部分落在哪个文件、论文与代码的十几处出入、怎么跑</summary>

<h3 id="源码-目录">目录</h3>

```text
OpenHomie/
├── HomieRL/                         # 训练（Isaac Gym Preview 4、Python 3.8；基于 HIMLoco / legged_gym / rsl_rl）
│   ├── legged_gym/legged_gym/envs/g1/g1_29dof_config.py   # G1 的配置：奖励权重、命令范围、随机化、PD
│   ├── legged_gym/legged_gym/envs/base/legged_robot.py    # 观测、命令采样、上身课程、r_knee 等奖励、终止
│   ├── legged_gym/legged_gym/scripts/{train,play,export_onnx}.py
│   └── rsl_rl/rsl_rl/{algorithms/him_ppo.py, modules/him_actor_critic.py, modules/him_estimator.py}  # PPO + 对称损失、网络
├── HomieDeploy/                     # 真机（G1 + Dex3）：deploy.onnx、g1_gym_deploy/（策略侧，改自 walk-these-ways）、unitree_sdk2/g1_control.cpp
├── MujocoDeploy/mujoco_deploy_g1.py # MuJoCo 回放
└── HomieHardware/                   # 硬件文件（README 里填表申请）
```

<h3 id="源码-论文与代码">论文与代码</h3>

| 论文 | 代码 | 说明 |
|------|------|------|
| $C_t = [v_x, \omega _ {yaw}, h_t]$，3 维 | 4 维，多了侧向速度 $v_y$ | 一步观测 76 维；附录 A 的公式对应 75 维 |
| 式 1：$\tau = K_p(a - q_0) - K_d\dot q$ | 目标 = $q_0 + 0.25a$，$\tau = K_p(\text{目标} - q) - K_d\dot q$ | 论文漏了 $q$，我们认为是笔误 |
| 式 2：$\lambda = 20(1 - \rho_a)$ | $\lambda = 20(1 - 0.99\rho_a)$ | 最后不完全是均匀分布 |
| $\rho_a$「奖励过阈值就 +0.05」 | 每 1000 步查一次，x 速度跟踪的回合奖励 > 满分的 80% | |
| 1/3 蹲、2/3 站和走 | 蹲 1/3、站 1/6、走 1/2 | 例 4 |
| 表 VIII：蹲 $[-0.24, 0.74]$ m | 0.74 + $\mathcal U(-0.5, 0)$ = $[0.24, 0.74]$ m | 负号是笔误（我们的判断） |
| 式 4 正文：低于目标鼓励弯 | 公式与代码：低于目标且膝很弯时鼓励伸 | 例 3；正文写反（我们的判断） |
| — | 7 项奖励只在目标高度 ≥ 0.735 m 时算 | 蹲着时不罚髋踝偏离、脚距等 |
| 式 5：$\mathrm{MSE}(a_t, a_t')$ | $\pi(\text{镜像}(o))$ 对 $\text{镜像}(\pi(o))$，系数 1.0 | 价值那一项一边 `detach` |
| 附录 A：价值网络输入 $2 + \dots$ | 3（真实机身线速度） | |
| 表 VII：摩擦 0.1–2.0 | 0.1–3.0 | |
| — | 终止：躯干接触力 > 10 N，或重力投影的 $xy$ 分量 > 0.8 | |
| 配置：腿 $K_p$ 100 / 100 / 100 / 150 / 40 / 40 | `g1_control.cpp`：150 / 150 / 150 / 300 / 40 / 40 | 我们推断 `deploy.onnx` 按部署增益训（环境设定） |
| 训练：偏航命令观测 × 0.5 | 部署 `lcm_agent.py`：× 0.25 | 真机上同样的踏板量，策略看到的转向命令减半（我们的观察，原因不明） |
| — | 官方 `MujocoDeploy/g1.yaml`：用自己导出的 `policy.pt`、训练配置的增益（腿 100 / 150）、角速度与偏航命令缩放都写 0.25 | 我们的回放没用这个脚本：用的是 `deploy.onnx` 和部署增益，观测缩放照训练代码（角速度、偏航 × 0.5，`legged_robot_config.py`） |
| 图 8 图注：全身 / 双手 | 数值是双手 / 全身 | |
| 第 IV-A 节：w/ sym | 同节另一处写 nsym | 同一个设定 |

<h3 id="源码-怎么跑">怎么跑（README）</h3>

```bash
# 训练（HomieRL；先在 g1_29dof_config.py 里填 wandb 的 run_name / experiment_name 等，或改用 tensorboard）
python legged_gym/legged_gym/scripts/train.py --task g1 --num_envs 4096 --headless --run_name my_policy --rl_device cuda:0 --sim_device cuda:0
# 看效果 / 导出（先在 task_registry.py 里设 resume_path）
python legged_gym/legged_gym/scripts/play.py --num_envs 32 --task g1 --resume
python legged_gym/legged_gym/scripts/export_onnx.py
# MuJoCo 回放与真机部署见 MujocoDeploy/、HomieDeploy/ 的 README
```

</details>

---

## 🔗 在学习路线中的位置

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上承 H2O、OmniH2O、HumanPlus、OpenTelevision 与同构机械臂；同期 HOVER、HugWBC；下启 TWIST、SONIC 等全身遥操作与数据采集</summary>

- **上承**：[H2O](../H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation/H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation.html)、[OmniH2O](../OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html)、[HumanPlus](../../07_Teleoperation/HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans/HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans.html)（视觉 / VR + 动捕先验的全身遥操作，表 I 的第三组）；[OpenTelevision](../../07_Teleoperation/Open-TeleVision__Teleoperation_with_Immersive_Active_Visual_Feedback/Open-TeleVision__Teleoperation_with_Immersive_Active_Visual_Feedback.html)（图 11 的 VR 对照）、[Mobile-TeleVision](../../07_Teleoperation/Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control/Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control.html)；GELLO、AirExo、Mobile-ALOHA（同构机械臂做关节匹配，HOMIE 把它扩到人形 + 灵巧手）；[ExBody](../Expressive_Whole-Body_Control_for_Humanoid_Robots/Expressive_Whole-Body_Control_for_Humanoid_Robots.html)（上身跟参考、下身跟速度的拆法）；HIM / PIM（网络与奖励的来源）；[PPO](../../01_Foundational_RL/PPO_Proximal_Policy_Optimization/PPO_Proximal_Policy_Optimization.html)、[域随机化](../../01_Foundational_RL/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World.html)。
- **同期**：[HOVER](../HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html)（一个控制器统一多种遥操作接口，HOMIE 是另一条路：接口做成硬件）；[HugWBC](../HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller.html)（同样是「下肢强化学习 + 上身可被外部设定」，多了步态参数）。
- **下启**：[TWIST](../../07_Teleoperation/TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.html)（动捕实时重定向，一个策略跟全身）；[SONIC](../SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)（README 推荐直接用它）；[GRUtopia](../../11_Simulation_Benchmark/GRUtopia__Dream_General_Robots_in_a_City_at_Scale/GRUtopia__Dream_General_Robots_in_a_City_at_Scale.html)（仿真遥操作用的场景）。
- **工程意义**（我们的观察）：「下肢一个只认少量命令的策略 + 上身直接设定」把遥操作接口压得很薄，任何能输出 $C_t$ 和 $q _ {upper}$ 的上层（人、模仿学习、VLA）都能接上；代价是上下身没有联合优化，上身怎么动不考虑平衡。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：七问七答</summary>

**Q1：HOMIE 和 H2O / OmniH2O / HumanPlus 的本质区别？**
A：后者用视觉或 VR 估人的姿态，再重定向到机器人，策略要跟住人的全身（或几个关键点），训练时要动捕数据做动作先验。HOMIE 把上下身拆开：上身用同构外骨骼直接给关节角（不估姿态、不解逆运动学），下身只听踏板的三个命令，下肢策略的训练不用任何动捕数据。

**Q2：为什么能「直接设定」上身关节角？**
A：外骨骼的 7 个关节排布和机器人手臂一样（同构），舵机转轴对齐机器人 URDF 的关节坐标系，读数加一个 $\pi/2$ 整数倍的零点偏差就是关节角（式 7）。所以输出频率约等于采集频率（手臂 263 Hz），也不需要 GPU。

**Q3：上身姿态课程为什么用截断指数分布，而不是 $\mathcal U(0, \rho_a)$？**
A：截断指数分布在任何 $\rho_a < 1$ 时都覆盖整个 $[0, 1]$，大幅动作也能偶尔抽到，随 $\rho_a$ 增大平滑过渡到均匀分布；$\mathcal U(0, \rho_a)$ 永远抽不到 $(\rho_a, 1]$，$\rho_a$ 变大时分布突然变宽，更难收敛（图 7 第一行的 rand）。另外每 1 s 重采样并线性插值，模拟外骨骼的连续动作。

**Q4：$r _ {knee}$ 怎么帮机器人蹲？**
A：它是高度差乘「归一化膝角 − 1/2」的负绝对值：高度对上或膝在中间时为 0。膝偏直时它鼓励弯、膝很弯时鼓励伸，给膝关节一个明确的梯度；和高度跟踪奖励一起作用，比单纯放大高度奖励收敛快（图 7 第二行的 hei 速度误差大一倍左右）。注意论文正文对它方向的描述和公式相反（我们认为是笔误）。

**Q5：对称为什么既要数据增强又要对称损失？**
A：增强让一条数据当两条用，训练快得多（不做增强的两组 2000 步里几乎学不会）；但只增强时策略仍可能左右不对称（对称损失涨到 20 左右），对称损失把它压住，任务表现也略好（图 7 第三行）。

**Q6：同样的踏板命令为什么能在不同机器人上用？**
A：$\pi _ {loco}$ 的接口只有 $C_t$ 和上身关节角；换 GR-1 只改站立高度、脚距等几个身材相关的数（表 II），驾驶舱换一套同构手臂即可，手套可以拆下来复用。

**Q7：HOMIE 的数据怎么用于自主策略？**
A：遥操作时以 10 Hz 记录图像、本体感受、$q _ {upper}$ 和 $C_t$；用 Seer 训一个视觉运动策略，输出手臂关节、灵巧手和高度命令，替代操作员接到同一个 $\pi _ {loco}$ 上。两个任务各 50 条示范，成功率 73.3% 和 80.0%（表 V）。

</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：2026-05-15 · 初读；2026-10-18 · 读代码和做回放时看到的五件事</summary>

- 初读的印象：卖点是系统集成和成本——一个人、一个驾驶舱、500 美元；强化学习那一半的三个技巧都不复杂，但每个都有消融。

第二版补充（都是我们的观察）：

1. **论文和代码有十几处不一样**（见源码对照），最影响复现的是命令的比例、$\lambda$ 的 0.99、7 项只在站着时算的奖励和部署增益。
2. **$r _ {knee}$ 的方向**：正文的说法和公式相反，按公式（也是代码）算才是对的。
3. **部署增益比训练配置大一倍**（膝 300 对 150）：按配置的增益跑官方策略，蹲得比命令低约 5 cm；所以 `deploy.onnx` 很可能是按部署增益训的。
4. **263 Hz 和 10 Hz**：表 IV 是驾驶舱侧的输出频率，G1 上手臂目标实际 10 Hz 再插值。
5. **作者自己已经往前走了**：README 推荐 GR00T-WholeBodyControl 里的 v2 和 SONIC。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX、开放问题、旧版笔记的改正</summary>

<h3 id="a-bibtex">A. BibTeX</h3>

```bibtex
@article{ben2025homie,
  title   = {HOMIE: Humanoid Loco-Manipulation with Isomorphic Exoskeleton Cockpit},
  author  = {Ben, Qingwei and Jia, Feiyu and Zeng, Jia and Dong, Junting and Lin, Dahua and Pang, Jiangmiao},
  journal = {arXiv preprint arXiv:2502.13013},
  year    = {2025}
}
```

<h3 id="b-开放问题">B. 开放问题</h3>

1. 上身动作不考虑平衡：操作员猛地伸手时，下肢策略来得及吗？上下身能不能联合优化而不失去「直接设定」的精度？
2. 力反馈怎么加？外骨骼的舵机本身能输出力矩，能不能把机器人手臂的受力反馈给操作员？
3. 地形：PIM 的接入在真机上撞台阶，换更稳的感知或把相机放到不晃的位置能解决多少？
4. 同构的代价：每换一种机器人就要做一套手臂；能不能做一个可调的外骨骼覆盖多种机器人？

<h3 id="c-旧版笔记的改正">C. 旧版笔记的改正</h3>

- **「观测堆叠 5 步历史」**：论文是 $O _ {t-5:t}$，即 6 步；代码也是 6 步。
- **「$r _ {knee}$：站太高就鼓励膝关节弯，反之鼓励膝伸」**：这是照抄正文；按公式与代码，鼓励的方向只看膝角在中点的哪一边（例 3），正文写反了。
- **「每 4 秒重采样命令，1/3 环境训蹲、2/3 训站走」**：论文是这么写的，补上代码的蹲 1/3、站 1/6、走 1/2。
- **「$\mathcal L _ {sym}$ 强制策略左右对称，等价于 2× 数据增强」**：数据增强和对称损失是两件事，图 7 第三行分开做了消融。
- **「姿态获取速度比 VR / 视觉方案快 ~200%」**：论文的表 IV 是输出频率 263 / 293 Hz 对 16–125 Hz，没有「200%」的说法，删去；「0.09° 读数精度」保留。
- **「Hall 传感手套 ≥15 DoF」**：论文是「最多 15 自由度」（每根手指 3 个）。
- **「HOMIE 可以直接接 VLA 吐 token」「HOVER 做底层、HOMIE 做上层的组合」**：论文里没有这些说法，是推测，删去。
- **其他**：补上表 I–V、IX、X 的全部数字、图 7 的三组消融、图 11 的读图数、33 项奖励与随机化、部署细节、论文与代码的出入；新增用官方策略做的 MuJoCo 回放与具体实例。

</details>

---

## 📎 参考来源

- arXiv：<https://arxiv.org/abs/2502.13013>（v2，读的是 LaTeX 源码；RSS 2025）
- 项目主页：<https://homietele.github.io/>（动画第 2、10–12、14–16 幕的真机与仿真片段剪自这里的视频，页面写明都是原速）
- 代码：<https://github.com/InternRobotics/OpenHomie>（`main`，2026-09-08；`HomieRL` 的 `g1_29dof_config.py`、`legged_robot.py`、`him_ppo.py`、`him_actor_critic.py`、`him_estimator.py`，`HomieDeploy` 的 `deploy.onnx`、`g1_control.cpp`、`lcm_agent.py`）
- README 2026-07 的说明：<https://github.com/NVlabs/GR00T-WholeBodyControl/tree/main/decoupled_wbc>（HOMIE v2）
- G1 的 3D 渲染：Robot Retarget Online（<https://github.com/ImChong/Robot_Retarget_Online>）的模型、材质与光照
