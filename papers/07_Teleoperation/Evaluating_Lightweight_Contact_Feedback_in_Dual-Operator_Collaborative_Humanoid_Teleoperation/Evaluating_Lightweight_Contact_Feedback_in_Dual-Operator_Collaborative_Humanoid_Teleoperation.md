---
layout: paper
title: "Evaluating Lightweight Contact Feedback in Dual-Operator Collaborative Humanoid Teleoperation"
zhname: "XRT：双操作员协作人形遥操作中的轻量接触反馈评估"
category: "Teleoperation"
arxiv: "2610.24257"
original_check: done
original_check_date: 2026-11-11
original_check_scope: arXiv v1 LaTeX 源码全文（摘要、第 I–VIII 节、式 1–2、表 I–II、图 1–4 图注）；项目页 system 页的代码说明；官方 proj_XRT 仓库（commit 3cbc786）的遥操作入口、触觉流与双机链路三个文件
---

# Evaluating Lightweight Contact Feedback in Dual-Operator Collaborative Humanoid Teleoperation
**两个人各戴一台 Quest 3、各遥操作一台跪着的 G1 一起翻转一个箱子：把机器人指尖触觉皮肤的接触状态量化成四档，分别用指尖振动手套和头显开放式扬声器的音符反馈给操作员。16 组 32 人的组内实验里，所有人都把振动排在声音前面，但完成时间、失败次数、负荷都没测出差别；练习带来的提速（每轮约 19%）比任何反馈条件的差别都大**

> 📅 总结日期: 2026-11-11
>
> 🏷️ 板块: 07 Teleoperation · 双操作员协作 · XR 遥操作 · 振动触觉 / 声音的感官替代 · 用户研究
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.24257](https://arxiv.org/abs/2610.24257) |
| HTML | [在线阅读](https://arxiv.org/html/2610.24257v1) |
| PDF | [下载](https://arxiv.org/pdf/2610.24257) |
| 项目页 | [xrt-teleop.github.io](https://xrt-teleop.github.io)（含 system / study / viewer 三页） |
| 源码 | [proj_XRT](https://github.com/Euler-Rodrigues-Lab/proj_XRT)（G1 + Inspire 手的 XRT 应用与论文用的实验栈）· [XRT-Client](https://github.com/Euler-Rodrigues-Lab/XRT-Client)（Quest 3 头显端 Unity 应用，MIT）· [XRT_devices](https://github.com/Euler-Rodrigues-Lab/XRT_devices)（WebRTC 接收端）· [g1_teleop](https://github.com/Euler-Rodrigues-Lab/g1_teleop) + [geo_kin_core](https://github.com/Euler-Rodrigues-Lab/geo_kin_core)（SEW-Mimic 重定向）；实验录像不公开 |
| **发布时间** | 2026-10-16（arXiv v1；文中注明投稿 ICRA 2027） |

**作者**：Austin Graves、Chuizheng Kong、Yunho Cho、Yuanshao Yang、Advaith Nidumukkala、Shreyas Kousik、Mohsen Moghaddam（佐治亚理工 Symbiotic and Augmented Intelligence Lab、Robot Danger Lab）。

**定位**：这是一篇**系统 + 用户研究**的论文，不训练策略。重定向沿用同组的 [SEW-Mimic](../SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation/SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation.html) 闭式几何解；论文的问题是「操作员觉得好用的接触反馈，能不能真的让两人协作更快、更稳」。结论偏「否定 / 未解决」，价值在于把主观评价和客观绩效分开测，并量出了新手练习效应有多大。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| XRT | eXtended Reality Teleoperation | 本文的 XR 遥操作框架 |
| V / A+V / T+V / T+A+V | Vision / Audio / Tactile | 四种反馈条件：只有立体视频、加声音、加振动、两者都加 |
| SEW | Shoulder–Elbow–Wrist | 用肩、肘、腕位置 + 腕朝向闭式求 7 自由度手臂关节角 |
| DDS | Data Distribution Service | Unitree 底层通信 |
| NASA-TLX | NASA Task Load Index | 主观工作负荷量表（0–100） |
| SUS | System Usability Scale | 系统可用性量表 |
| LRT | Likelihood-Ratio Test | 混合模型的似然比检验 |
| TOST | Two One-Sided Tests | 等效性检验 |
| MDE | Minimum Detectable Effect | 最小可检测效应 |

---

## 🎯 一句话总结

两人各遥操作一台人形一起搬东西时，谁都摸不到箱子。XRT 把机器人手上 12 块触觉皮肤的读数压成「轻 / 中 / 高 / 最大」四档，同一个信号用两种方式还给操作员：振动手套在**对应手指**上震一下，或头显扬声器按**手指定音高、按档位定八度与响度**响一声铃。16 组（32 人）组内对照实验：32 人全部把振动排在声音之前、18 人认为振动最有效；但完成时间、失败、负荷、不适、对搭档的感知都没测出条件差别，而一轮练习带来的提速（×0.75–0.81）比最大的条件差别（×1.16）还大——**好评不等于好用**，新手实验要先练到平台期。

---

## ❓ 要解决什么问题？

1. **双人遥操作丢了「通过物体感觉搭档」这条通道**：两个人一起抬桌子时，靠桌子传过来的力就知道对方什么时候抓住、什么时候要抬；两人各遥操作一台机器人时只剩立体视频和说话。
2. **已有的 XR 人形遥操作大多是单人、且没有接触反馈**：[Open-TeleVision](../Open-TeleVision__Teleoperation_with_Immersive_Active_Visual_Feedback/Open-TeleVision__Teleoperation_with_Immersive_Active_Visual_Feedback.html) 只有立体视频；最接近的双人系统 Duet 没有接触反馈，也没做双人评估。
3. **力反馈太重**：动觉力反馈要闭一个对延迟敏感的双边回路、还改变操作员的基线。作者想测一种**轻量的感官替代**：机器人皮肤只给「哪根手指、什么时候、多大激活、何时松开」，不给标定过的力。
4. **主观好评与客观绩效可能脱节**：所以论文问的不是「哪种模态更好」，而是「操作员怎么评价两种显示」以及「评价高的那种是否改变可测的协作绩效」。

---

## 🔧 方法

### 1. 硬件与工作空间（第 III-A 节）
- 两台 Unitree G1 EDU+ **跪在**可调高度的剪式升降台上、小腿绑住，只控制 7 自由度手臂、手和脖子（不走路、不平衡）；肩电机加了 50 W 水冷帕尔贴散热。
- 手：Inspire RH56DFTP 带触觉皮肤；头：两轴 Dynamixel 云台 + ZED Mini 立体相机。
- 操作员：Meta Quest 3（加了吹脸风扇减轻晕动）+ bHaptics TactGlove DK2（内外各套一层乳胶手套，外层是为了提升手部跟踪）。
- 箱子上 10 个 AprilTag + 桌面 1 个，由两台外部 D435 和每台 G1 的头部 RealSense 融合，15 Hz。

### 2. 重定向与控制（第 III-B 节）
- Quest 3 机载相机做无标记的手和上身跟踪，84 根骨骼的位姿经不可靠的 WebRTC 数据通道发出，最高 90 Hz。
- 笔记本以 60 Hz 用 SEW-Mimic 闭式解每只手臂 7 个关节；关节目标 500 Hz 走 DDS，手指角 50 Hz 走 Modbus，头的偏航 / 俯仰驱动脖子。
- 安全层：肩外展限位（避开散热器）、丢跟踪时保持姿态、电流触发柔顺、头部禁区、急停、摘头显时暂停。

### 3. 视频与延迟（第 III-C 节）
ZED Mini 以 HD720 / 60 fps 立体串流，头显里 90°×60° 视场。估计的视频端到端延迟 57 ± 3 ms（p95 66 ms），遥操作「动作到动作」延迟 87 ± 9 ms（p95 142 ms）。

### 4. 一个接触信号，两种显示（第 III-D 节、表 I、式 1）
- 每台机器人 12 个区域（每只手 5 指 + 掌心）各压成一个标量：指尖与指甲贴片取峰值、掌心取均值，减基线、低于标定噪声底（≤ 7 counts）置零，再除以 1024 的 ADC 量程 → 0–1 的归一化激活；以 120 Hz 发到头显，两种显示都在头显上量化成**同样的四档**。
- **振动手套**：档位每变一次，在对应手指上震一下，其余时间静默；手套没有掌心马达，掌心接触用手腕马达。
- **声音**：每个区域在「纯五度阶梯」上分一个音，$f(n)=130.81\cdot 2^{7n/12}$ Hz，$n=0..5$ 从掌心到小指；档位每变一次响一个 125 ms 的铃声，手指身份靠音高，档位同时编码在八度与响度里；向下变档时播放反向、低一个八度的铃声。

| 档位 | 轻 | 中 | 高 | 最大 |
|---|---|---|---|---|
| 激活范围 | 0.10–0.35 | 0.35–0.60 | 0.60–0.85 | 0.85–1 |
| 手套强度（满分 100） | 10 | 25 | 50 | 70 |
| 手套脉冲（20 ms） | 1 | 1 | 1 | 2 |
| 铃声八度（上升） | 0 | +1 | +1 | +2 |
| 铃声响度（相对） | 0.10 | 0.35 | 0.60 | 0.85 |

### 5. 双机同步与记录（第 III-E 节）
主笔记本通过 TCP 把实验动作广播给另一台，约定在 **0.8 s 后的共同时刻**同时执行；记录到的时钟偏差中位数 2.1 ms、最大 46 ms。每台机器人记关节、目标、约 50 Hz 的触觉阵列、操作员骨架、立体视频、反馈事件和延迟；主机另记箱子位姿。语音用本地 Whisper 实时转写、不留录音；离线用 MuJoCo 数字孪生按共同时钟回放两台机器人和箱子。

### 6. 实验设计（第 IV 节、式 2）
- **任务**：两人协作把 1.68 kg 的塑料箱（61×38 cm、内深 19 cm）抬起、翻转 180°、放回。每轮两次：第 1 次「翻过去」（抓箱沿，较难），第 2 次「翻回来」（抓箱底）。超时 180 s 由主持人叫停记为失败。
- **条件**：V、A+V、T+V、T+A+V 构成 2×2（触觉 × 声音）析因；每种条件都戴着手套和头显，只在软件里开关通道。
- **被试**：16 组 32 人（27 人从没遥操作过机器人），4×4 Williams 拉丁方平衡顺序与一阶残留；操作员站在帘子后面，只能通过头显看场景。
- **假设**：H1 每种反馈都比纯视觉成功率更高、更快；H2（主假设）振动比声音好、操作员也会认为振动更有效。
- **分析**：对数完成时间的线性混合模型
  $\log T _ {dbf}=\beta_0+\alpha _ {c(db)}+\delta(b-\bar b)+\gamma f+u_d+v _ {db}+\epsilon _ {dbf}$，
  其中 $\alpha_c$ 是条件效应、$\delta$ 是每轮的练习斜率、$\gamma$ 是「翻回来」的偏移，$u_d$、$v _ {db}$ 是组、组内轮次的随机截距；三条预先登记的对比（V vs A+V、A+V vs T+V、T+V vs T+A+V）用 Holm 校正。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart LR
    subgraph OP["操作员站（×2，镜像）"]
        Q["Quest 3<br/>手 + 上身跟踪<br/>84 骨骼 ≤90 Hz"]
        G["TactGlove DK2<br/>指尖振动"]
        S["头显开放式扬声器<br/>五度阶梯音符"]
        Q4["头显端量化<br/>四档：轻/中/高/最大"]
    end
    subgraph LAP["笔记本"]
        SEW["SEW-Mimic 闭式重定向<br/>60 Hz · 每臂 7 关节"]
        HAP["触觉皮肤 → 12 区域标量<br/>峰值/均值 − 基线 ÷ 1024"]
    end
    subgraph ROB["G1 EDU+（跪姿，腿腰固定）"]
        ARM["手臂 DDS 500 Hz"]
        HAND["Inspire 手 Modbus 50 Hz<br/>触觉皮肤"]
        NECK["Dynamixel 脖子<br/>ZED Mini 立体相机"]
    end
    CRATE[("共享的 1.68 kg 箱子<br/>AprilTag 15 Hz")]
    Q -->|WebRTC| SEW
    SEW --> ARM
    SEW --> HAND
    SEW -->|头偏航/俯仰| NECK
    NECK -->|HD720 60 fps<br/>≈57 ms| Q
    ARM --> CRATE
    HAND --> CRATE
    HAND -->|激活| HAP
    HAP -->|120 Hz| Q4
    Q4 -->|T：对应手指震| G
    Q4 -->|A：音高=手指<br/>八度+响度=档位| S
    MASTER["主机：TCP 锁步<br/>0.8 s 后共同时刻切换条件"] -.-> LAP
    LAP -.->|关节/触觉/骨架/事件| LOG["同步记录 → MuJoCo 孪生回放"]
    LOG --> STUDY["16 组 × 4 条件 × 2 次<br/>混合模型 + 问卷"]
</div>

---

## 🚶 具体实例

**例 1：一根食指碰到箱子，两种显示各给出什么**

- 设食指指尖贴片的峰值读数是 400 counts、标定基线 30：$(400-30)/1024\approx 0.361$，落在「中」档（0.35–0.60）。
- 振动手套：在操作员**食指**上发 1 个 20 ms 脉冲，强度 25/100。
- 声音：按论文「从掌心到小指」的阶梯，若顺序是掌心、拇指、食指……（论文没逐一列出，这是我们的读法），食指 $n=2$，基音 $130.81\cdot2^{14/12}\approx 293.7$ Hz；「中」档上升八度 +1 → 约 587 Hz，相对响度 0.35。
- 六个区域的基音依次约为 130.8、196.0、293.7、440.0、659.2、987.8 Hz——相邻差一个纯五度，最高音和最低音差 7.5 倍。操作员给的评价里，「看出这个信号指哪根手指」振动 7.47 分、声音只有 4.19 分。

**例 2：练习效应 vs 反馈效应**

- 主完成时间里「翻过去」每轮快 19%：三轮之后 $0.81^3\approx 0.53$，正好是论文说的「整场下来大约减半」；按「到翻完」的次要时间每轮快 25%，$0.75^3\approx 0.42$，与模型估计的第 4 轮是第 1 轮的 0.43 倍吻合。
- 三条预先登记对比里最大的是 A+V/V 的 ×1.16（反而更慢，95% CI [0.91, 1.48]），小于一轮练习（×0.75–0.81），也小于同一组同一条件下轮间的波动（SD ×1.22）和轮内两次之间的波动（SD ×1.51）。
- 再看最小可检测效应：80% 功效下约 45%。也就是说，16 组 × 每条件 2 次的设计只能可靠地看出「快将近一半」的效应，×1.1 左右的差别看不出来，论文也明确不做等效声明。

---

## 📊 实验与结果

| 条件 | V | A+V | T+V | T+A+V | 检验 p |
|---|---|---|---|---|---|
| 主完成时间中位数（s，失败记 180） | 55.6 | 64.9 | 57.6 | 62.5 | LRT .55 |
| 失败次数（共 32 次） | 2 | 3 | 2 | 1 | Cochran's Q .78 |
| NASA-TLX | 39.1 | 38.3 | 37.6 | 38.4 | .95 |
| 不适（0–10） | 4.98 | 4.62 | 4.86 | 5.12 | .60 |
| 对搭档的感知（1–5） | 3.75 | 3.81 | 4.00 | 3.78 | .35 |
| 有效性平均排名（1 最好） | 2.62 | 3.47 | 1.50 | 2.41 | Friedman < .001 |
| 排第一的人数 | 5 | 0 | 18 | 9 | |

- **主观：振动完胜**。32 人全部把 T+V 排在 A+V 之前，23 人把 T+V 排在 T+A+V 之前；八项感知评分均值 6.32 vs 4.62（$d_z=0.74$），差距最大的是「看懂信号是什么意思」（6.44 vs 3.03）。有人说声音「更像背景音乐」。
- **客观：没测出差别**。A+V/V ×1.16、T+V/A+V ×0.89、T+A+V/T+V ×1.10，Holm p 都是 .71；换各种失败处理方式、删失感知的秩检验也一样。成功率 120/128 接近天花板，成功率假设无法评估。
- **反馈确实送到了**：256 个机器人回合里反馈事件日志与计划条件 256/256 吻合，每台机器人每分钟 70–77 次升档、共 22,182 个事件。
- **主观排名与实际快慢几乎无关**：每人「有效性排名」和「完成时间排名」的 Kendall τ 平均 +0.03。
- **探索性分析**：数字孪生里只有 70% 的接触时间被触觉皮肤登记到，29% 的接触发生在手背、手腕、前臂等没皮肤的地方；振动开 / 关时提示后一秒内的握力变化差 +103 counts（CI 跨零）；说话越多完成越慢（弹性 +0.21）。
- **晕动**：18/32 人不适 ≥ 7 分，这些人 TLX 更高（44.8 vs 29.8）、SUS 更低；SUS 整体 60.4（「OK」）。

---

## 💡 核心贡献

1. **XRT 框架与双人双人形测试台**：一个触觉信号、两种轻量显示（指尖振动 / 开放式声音），时间对齐的多模态记录，两站锁步切换条件；代码开源。
2. **一项 16 组组内实验**，清楚地显示「感知上的有效」与「测得的绩效」可以分离。
3. **量化了新手协作遥操作里的练习效应和执行波动**，给后续接触反馈研究在训练量、每条件次数上的设计提供依据。

---

## 🤖 对人形机器人的启示

- 做遥操作数据采集时，操作员的主观偏好不能直接当作「反馈让数据更好 / 采得更快」的证据；要单独测绩效。
- 新手在一场实验里还在快速变好，比较界面差异之前应先练到平台期，或在模型里显式建模练习。
- 灵巧手的触觉皮肤只覆盖指尖和掌心，搬大件时近三成接触落在手背和前臂——想做全臂接触反馈，传感覆盖本身就是瓶颈。

---

## ⚠️ 局限与可改进点

- 样本量小：16 组、每条件 2 次，区间很宽；MDE 只是功效近似，[1/1.15, 1.15] 的等效区间没有建立。协议模型和三条对比之外的分析都是事后的。
- 「翻过去」和「翻回来」抓法不同且顺序固定；练习在四轮内没有到平台期；成功率接近天花板。
- 声音只测了一种设计（音高编码手指、开放式响度），结论只针对这种设计，不代表听觉反馈整体；搭档可以自由说话，语音可能已经承担了协调。
- 一半以上的操作员有晕动，增加了组间异质性；有效性排名是非盲自评。
- 摄像头跟踪会被遮挡；实验过程中机器人手退化（拇指屈伸范围变小，一台机器人在实验进行到 56% 时撞丢了拇指外展）；手相对手臂闭合偏慢。
- 不适只有单题，回溯式 TLX 不能反映瞬时负荷。

---

## 🛠️ 源码运行时序图（`Euler-Rodrigues-Lab/proj_XRT`）

读的是 `projects/inspire_hand_teleop/` 下的单人遥操作入口 `demo_g1_inspire_xr_robot_teleop_full_body_hw.py`、触觉流 `inspire_hand_haptics_streamer.py` 和双机链路 `study_link.py`（commit 3cbc786）。几处和论文对照：

- 代码里 SEW 求解频率是 `--ik_rate` 默认 60 Hz，肘部滤波截止 2 Hz，与论文一致；人体位置还乘了一组缩放 `mocap_cartesian_scale = [0.85, 0.85, 0.65]`、肩宽 ×0.8、髋宽 ×1.3（论文只说「重定向会把操作员身材缩放到 G1」）。
- 连上头显之前，一个后台线程以约 500 Hz 发保持姿态的 `rt/lowcmd`（注释说 G1 固件看门狗要求 ~500 Hz，否则约 10 s 后触发）；跪姿模式还会先释放高层运动模式。
- 触觉流构造时写的是 `rate_hz=120`，但这个入口并不启动后台线程，而是每个主循环迭代调一次 `send_once()`；`_build_payload()` 先采一段基线、再做减基线和噪声门限，按拇指 / 食指 / 中指 / 无名指 / 小指 / 掌心六个字段发 JSON。量化成四档在头显端（XRT-Client）做。
- 双人实验由 `XRT_user_study_manager.py` 管理，`study_link.py` 用「4 字节长度 + JSON」的 TCP 消息：主机收对方的箱子检测候选和状态，下发「在某个时刻开始 / 停止遥操作与录制」的命令。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户（python -m …demo_g1_inspire_xr_robot_teleop_full_body_hw）
    participant M as 主程序 main()
    participant HW as G1 底层 DDS Controller
    participant H as InspireHandController + HapticsStreamer
    participant D as XRRTCBodyPoseDevice（WebRTC）
    participant Q as Quest 3（XRT-Client）
    participant SV as G1FullBodySEWSolver

    U->>M: 参数（--ik_rate 60, --kneeling, --dry_run …）
    M->>M: 加载 MuJoCo 模型；可选连接 Ostrich 脖子并回零
    M->>D: start() 等待头显连接
    M->>SV: 构造（URDF, hand_type=inspire, 60 Hz, 肘滤波 2 Hz）
    M->>HW: Controller(config)（非 dry-run）
    M->>H: InspireHandController(haptics_only) + 触觉流
    M->>HW: 释放高层运动模式 → move_to_pose(跪姿)
    loop 等待连接（后台线程 ~500 Hz）
        M->>HW: send_upper_body_targets(零位, 跪姿腿)
    end
    Q-->>D: WebRTC 连上
    loop 主循环（每次迭代）
        HW-->>M: 读当前上身关节 → 同步到 MuJoCo
        alt 距上次 IK ≥ 1/60 s
            D-->>M: get_controller_state()：84 骨骼 + 手指
            M->>SV: preprocess（缩放 0.85/0.85/0.65，肩 ×0.8，髋 ×1.3）→ solve()
            SV-->>M: 两臂 7 关节 + 手指 + q_head
            M->>H: set_joint_goals(手指)
            M->>M: 脖子 move_from_angles(q_head)
        end
        M->>H: apply_control()（Modbus 发手指）
        H->>H: read() 触觉 → 减基线、噪声门限 → 6 区域强度
        H->>D: send_haptics(JSON)
        D-->>Q: 强度流 → 头显端量化四档 → 手套振动 / 铃声
        M->>HW: send_upper_body_targets(手臂目标，躯干置零，开始时线性过渡)
    end
    M->>HW: 退出时 enter_damping(0.3 s)
</div>

---

## 🎤 面试参考

- **问：为什么用振动 / 声音而不是力反馈？** 力反馈要闭合对延迟敏感的双边回路，硬件重；本文的机器人皮肤也只给接触状态、不给标定的力，所以用感官替代把「哪根手指、何时、多强、何时松开」告诉操作员，不加控制回路。
- **问：结果是「没有显著差别」，这篇论文的价值在哪？** 一是把主观有效性和客观绩效分开测，并给出两者几乎不相关（τ ≈ 0.03）的证据；二是给出了 MDE（约 45%）和练习效应大小（每轮 ×0.75–0.81），说明这类研究需要更多次数、更多训练。
- **问：为什么用对数时间的混合模型？** 完成时间右偏、同一组内重复测量；对数后条件效应可读成时间比，组和组内轮次用随机截距吸收相关性，练习用线性轮次项建模。

---

## 🔗 相关阅读

- [SEW-Mimic：上身人形遥操作的闭式几何重定向](../SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation/SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation.html)——本文的重定向器，同一实验室
- [Open-TeleVision](../Open-TeleVision__Teleoperation_with_Immersive_Active_Visual_Feedback/Open-TeleVision__Teleoperation_with_Immersive_Active_Visual_Feedback.html)——带立体视频的头显人形遥操作代表作，没有触觉反馈
- [TWIST2](../TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System/TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System.html)——同样用 VR 头显采人形数据，但单人、全身
