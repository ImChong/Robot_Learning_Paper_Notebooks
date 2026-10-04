---
layout: paper
paper_order: 10
title: "LapSurgie: Humanoid Robots Performing Surgery via Teleoperated Handheld Laparoscopy"
zhname: "LapSurgie：人形机器人经遥操作手持腹腔镜执行手术"
category: "Teleoperation"
arxiv: "2510.03529"
---

# LapSurgie: Humanoid Robots Performing Surgery via Teleoperated Handheld Laparoscopy
**首个「人形机器人 + 手持腹腔镜」遥操作手术框架：让 G1 人形直接握住现成的手动腕式腹腔镜器械，用一套满足远心点（RCM）约束的逆映射策略，把操作者手的位姿映射到器械末端，配立体视觉控制台实现免改造的微创手术遥操作——无需专用手术机器人，直接在为人设计的手术室里部署。**

> 📅 阅读日期: 2026-06-23
>
> 🏷️ 板块: 07 Teleoperation · 医疗外科遥操作 / 手持腹腔镜 / 远心点约束 / 逆映射重定向 / 人形通用平台
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2510.03529](https://arxiv.org/abs/2510.03529) |
| HTML | [arXiv HTML](https://arxiv.org/html/2510.03529v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2510.03529) |
| **发布时间** | 2025-10-03（arXiv v1；v2 2026-02-16） |
| 项目主页 | [UCSD ARCLAB 论文页](https://ucsdarclab.com/autopublication/lapsurgie-humanoid-robots-performing-surgery-via-teleoperated-handheld-laparoscopy/) |
| 源码 | 截至当前未见公开代码仓库（以 arXiv 后续版本 / 项目页为准） |
| 作者 | Zekai Liang, Xiao Liang, Soofiyan Atar, Sreyan Das, Zoe Chiu, Peihan Zhang, Calvin Joyce, Florian Richter, Shanglei Liu, Michael C. Yip |
| 机构 | UC San Diego（ARCLAB，Michael C. Yip 组）等 |
| 平台 | Unitree G1 人形 + 现成腕式腹腔镜钳（ArtiSential）；控制台用 dVRK 的 MTM 主手 |
| 验证 | 14 人用户研究（2 名外科医生 + 12 名新手），标准化 peg-transfer 任务 |

---

## 🎯 一句话总结

> 现有手术机器人（如 da Vinci）昂贵、专用、只在高资源医疗中心普及，难以广泛部署。人形机器人能直接在**为人设计的环境**（含手术室）里工作、无需大改基础设施，是一条更可部署的路。**LapSurgie** 提出首个**基于人形机器人**的腹腔镜遥操作框架：让 G1 人形**握住现成的手动腕式腹腔镜器械**，核心是一套**满足远心点（RCM）约束的逆映射策略**，把操作者手部目标位姿解算成器械手柄该摆的姿态，从而精确控制**未经改装的市售手术工具**；再配一个带**立体视觉**实时反馈的控制台。14 人用户研究（peg-transfer）显示：在**精度**上人形系统可与 dVRK 金标准相当（新手 p=0.386，外科医生甚至更优），但**完成时间明显更慢**——证明了用人形机器人做微创手术遥操作的**可行性**，同时也暴露了速度瓶颈。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| RCM | Remote Center-of-Motion | 远心点约束：器械必须绕固定的切口点转动，腹腔镜手术的核心力学约束 |
| MIS | Minimally Invasive Surgery | 微创手术 |
| dVRK | da Vinci Research Kit | da Vinci 手术机器人研究套件，本文作金标准对比 + 提供 MTM 主手 |
| MTM | Master Tool Manipulator | dVRK 的主手操作器，作遥操作输入手柄 |
| HMD | Head-Mounted Display | 头戴显示（GOOVIS G3 Max），呈现立体内窥镜画面 |
| TRF | Trust-Region Reflective | 信赖域反射算法，用于求解逆映射的非线性最小二乘 |

---

## ❓ 论文要解决什么问题？

1. **手术机器人太贵太专用**：da Vinci 等平台成本高、依赖专用基础设施，只在高资源医院普及，难规模化下沉。
2. **能否用「通用人形」替代专用手术机器人？** 人形机器人可直接在为人类设计的手术室里操作现成器械，部署门槛低——但此前从未有人让人形执行腹腔镜手术。
3. **关键技术难点**：手动腕式腹腔镜器械是**被动运动链**，且必须满足**远心点（RCM）约束**（绕切口点转动）。如何把操作者的手部意图精确映射到这种无主动驱动、带 RCM 约束的器械上？

**目标**：一套**免改造现成器械、满足 RCM、带实时立体反馈**的人形腹腔镜遥操作框架，并用用户研究验证可行性。

---

## 🔧 方法详解

### 逆映射策略（核心）

把手动腕式腹腔镜器械建模为**被动运动链**：给定期望的**器械末端位姿**，反解出手柄（被人形手抓握处）应处的位形。用 **Trust-Region Reflective（信赖域反射）** 算法求解一个加权非线性最小二乘，平衡 **位姿重投影误差** 与 **被动关节角度限制**——即在器械机械可达范围内，让末端尽量贴合操作者意图。

### 远心点（RCM）约束

腹腔镜手术中器械须绕**固定切口点**转动、末端在体内移动而切口不动。系统用 **ArUco 标记**标定 RCM 位置，并通过几何方程强制**垂直性与距离约束**，保证遥操作过程中始终维持自然的腹腔镜力学。

### 硬件构成

- **人形侧**：Unitree **G1** 人形，经定制夹具抓握市售腕式腹腔镜钳（ArtiSential bipolar fenestrated forceps），**无需改装器械**即可全腕关节活动；人形上搭载内窥镜提供术野。
- **控制台**：用 dVRK 的两只 **MTM** 主手作遥操作手柄；双 1920p 内窥镜相机 + **GOOVIS G3 Max** 头戴立体显示给出沉浸式反馈，配脚踏与工作站控制。
- **通信**：ROS2 网络接口协调控制台与人形。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph OP["🧑‍⚕️ 操作者控制台"]
        MTM["dVRK MTM 主手<br/>手部目标位姿"]
        HMD["GOOVIS 立体 HMD<br/>双 1920p 内窥镜画面"]
    end

    subgraph MAP["🧠 逆映射 + RCM 约束"]
        INV["逆映射 (TRF / 非线性最小二乘)<br/>末端位姿 → 手柄位形"]
        RCM["RCM 约束 (ArUco 标定)<br/>绕固定切口点转动"]
    end

    subgraph ROB["🤖 人形执行侧"]
        G1["Unitree G1 抓握<br/>现成腕式腹腔镜钳"]
        SCOPE["机载内窥镜<br/>采集术野"]
    end

    MTM --> INV
    INV --> RCM
    RCM -->|"动力学/几何可行手柄指令"| G1
    G1 --> SCOPE
    SCOPE -->|"立体视频"| HMD
    HMD -.实时反馈.-> MTM

    style OP fill:#e8eef8,stroke:#2c3e80,color:#1a2452
    style MAP fill:#fdecea,stroke:#c0392b,color:#641e16
    style ROB fill:#e8f8e8,stroke:#27ae60,color:#1b5e20
</div>

---

## 💡 核心贡献

1. **首个人形腹腔镜遥操作框架**：证明通用人形机器人可在不改基础设施的前提下执行微创手术遥操作，开辟「手术机器人去专用化」的新路。
2. **RCM 约束下的逆映射重定向**：把被动腕式器械建模为运动链，闭式 + 优化求解手柄位形，精确驱动**未改装的现成手术工具**。
3. **沉浸式立体控制台**：dVRK MTM + 双目内窥镜 + 头戴立体显示，提供接近临床的遥操作体验。
4. **系统化用户研究**：14 名受试（含 2 名外科医生）在标准化 peg-transfer 上与手动、dVRK 金标准三方对比。

---

## 📊 关键实验结果（结构性总结）

| 维度 | 设置 / 结论 |
|---|---|
| 任务 | 标准化 peg-transfer（橡胶 O 环在 4 个间距 40mm 的桩间双臂转移） |
| 受试 | 14 人（2 名外科医生 + 12 名新手），三平台随机顺序、各 8 次正式计时 |
| 误差指标 | 加权错误分（失败拾取×2、拉伸 2–4、掉落×5、碰撞×3、移位×3）+ 完成时间 |
| 新手·精度 | 人形 **5.78±6.47** ≈ dVRK 5.11±4.72（p=0.386，无显著差异）；手动最差 8.19±9.67 |
| 新手·耗时 | 人形 99.69±73.78s ≫ dVRK 46.15±28.33s（**显著更慢**） |
| 外科医生·精度 | 人形 **2.60±2.72**（三平台最佳，优于 dVRK 3.56±3.86） |
| 外科医生·耗时 | 人形 71.20±26.25s vs dVRK 39.16±11.63s（仍更慢） |
| 主观反馈 | 人形较手动更省脑力/体力、略逊于 dVRK；运动精度与反馈质量评分良好 |

> ⚠️ 详细数值与图表以 arXiv [2510.03529](https://arxiv.org/abs/2510.03529) 正文为准。

---

## 🤖 工程价值

- **「通用人形 = 可部署手术平台」**：核心论点是**部署性**——人形能直接进现成手术室、操作现成器械，绕开专用手术机器人的成本与基础设施壁垒。
- **逆映射是关键**：把被动器械显式建模 + RCM 几何约束，比硬 IK 更能稳定驱动手动腕式工具，思路可迁移到其他「人形操作现成人类工具」场景。
- **速度是主要短板**：完成时间约为 dVRK 的 2 倍，受控制方案复杂度与系统延迟拖累，是落地前必须攻克的瓶颈。
- **限制**：① 仅 14 人、以新手为主，泛化性待验证；② 仅 peg-transfer 单一受控任务，未测真实复杂术式；③ 从未真实临床部署；④ 逆映射需器械专属运动学参数，灵活性受限；⑤ 硬件设计、控制效率、几何建模精度均需提升。
- **未来**：更高效控制方案、更精确几何建模、面向真实术式的拓展与临床验证。

---

## 🎤 面试参考

**Q：LapSurgie 为什么用「通用人形」而不是专用手术机器人？**
A：核心动机是可部署性。da Vinci 等专用平台昂贵、依赖专用基础设施、只在高资源医院普及；人形机器人能直接在为人类设计的手术室里操作现成器械、无需大改环境，是把微创手术能力下沉的更可行路径。

**Q：手持腹腔镜器械控制的难点是什么，怎么解决？**
A：手动腕式器械是**被动运动链**且必须满足**远心点（RCM）约束**（绕固定切口点转动）。LapSurgie 把器械建模为被动链，用信赖域反射算法解非线性最小二乘，由期望末端位姿反解手柄位形，同时用 ArUco 标定的 RCM 几何约束强制垂直性/距离，从而精确驱动未改装的现成工具。

**Q：用户研究说明了什么？**
A：在 peg-transfer 上人形系统的**精度**可与 dVRK 金标准相当（新手无显著差异，外科医生甚至更优），证明可行性；但**完成时间显著更慢**，揭示速度是当前主要瓶颈。

---

## 🔗 相关阅读

- [SEW-Mimic: 上肢闭式几何重定向](../SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation/SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation.html) — 同为「把人手位姿映射到机器人」的几何重定向，可与本文 RCM 逆映射对照
- [X-OP: Cross-Morphology Whole-Body Teleoperation via MPC Retargeting](../X-OP__Cross-Morphology_Whole-Body_Teleoperation_via_MPC_Retargeting/X-OP__Cross-Morphology_Whole-Body_Teleoperation_via_MPC_Retargeting.html) — 全身遥操作里的「优化式重定向」另一路线
- [Stability-Aware Retargeting for Humanoid Multi-Contact Teleoperation](../Stability-Aware_Retargeting_for_Humanoid_Multi-Contact_Teleoperation/Stability-Aware_Retargeting_for_Humanoid_Multi-Contact_Teleoperation.html) — 多接触遥操作的重定向与稳定性约束
- [A Rapid Instrument Exchange System for Humanoid Robots in MIS (2604.02707)](https://arxiv.org/abs/2604.02707) — 同一方向的后续工作：人形微创手术中的快速换械
- [LapSurgie arXiv 2510.03529](https://arxiv.org/abs/2510.03529)

---

> 备注：本笔记基于 arXiv 摘要、[arXiv HTML 正文](https://arxiv.org/html/2510.03529v1)与公开搜索结果整理；公式记号与详细数值以 arXiv [2510.03529](https://arxiv.org/abs/2510.03529) 论文正文为准。
