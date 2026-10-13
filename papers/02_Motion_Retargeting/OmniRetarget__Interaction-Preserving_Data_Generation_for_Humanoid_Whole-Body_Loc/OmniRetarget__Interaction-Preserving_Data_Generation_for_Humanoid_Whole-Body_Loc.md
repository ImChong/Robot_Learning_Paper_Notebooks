---
layout: paper
title: "OmniRetarget: Interaction-Preserving Data Generation for Humanoid Whole-Body Loco-Manipulation and Scene Interaction"
zhname: "OmniRetarget：面向人形全身运动操作与场景交互的交互保持数据生成"
category: "Motion Retargeting"
paper_order: 4
demos: ["omniretarget"]
---

# OmniRetarget: Interaction-Preserving Data Generation for Humanoid Whole-Body Loco-Manipulation and Scene Interaction
**把人、物体和地形连成一张交互网格，用硬约束解出不穿透、不滑脚的机器人参考动作，一条演示还能扩成一族；参考干净了，5 项奖励的极简强化学习就能上真机**

> 📅 阅读日期: 2026-06-08（2026-10-12 第二版：对照论文 LaTeX 源码与官方仓库逐条核查重写，改正十余处；讲解动画从七幕改成十二幕，G1 用官方代码跑出的复现结果做 3D 渲染，新增三个交互演示、重做配音视频）
>
> 🏷️ 板块: 02 Motion Retargeting · 交互保持重定向 · 约束优化 · 数据扩增
>
> ℹ️ 笔记对照 [arXiv 2509.26633 v3](https://arxiv.org/abs/2509.26633v3)（2026-06-15；读的是 arXiv 上的 LaTeX 源码，表 I–II、图 1–7 与附录）、[项目页](https://omniretarget.github.io) 和官方仓库 [amazon-far/holosoma](https://github.com/amazon-far/holosoma)（2026-10 的 `main`，`src/holosoma_retargeting/` 与 `src/holosoma/` 的 WBT 配置）。「🚶 具体实例」里的 G1 动作，是我们照官方代码在仓库自带的演示数据上跑出来的，**不是论文的实验**。

---

## 📋 基本信息

| 项目 | 链接 / 内容 |
|------|------|
| **arXiv** | [2509.26633](https://arxiv.org/abs/2509.26633)（v1 2025-09-30，v2 2025-10-08，v3 2026-06-15） |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2509.26633v3) |
| **项目页** | [omniretarget.github.io](https://omniretarget.github.io)（带物体位姿、尺寸、地形高度、本体扩增与基线对比的 3D 可视化） |
| **代码** | [amazon-far/holosoma](https://github.com/amazon-far/holosoma)（重定向在 `src/holosoma_retargeting/`，强化学习跟踪在 `src/holosoma/`） |
| **数据集** | [Hugging Face · omniretarget/OmniRetarget_Dataset](https://huggingface.co/datasets/omniretarget/OmniRetarget_Dataset) |
| **会议** | ICRA 2026；项目页标注 **Best Conference Paper Award** 与 **Best Paper Award on Robot Manipulation and Locomotion** |
| **作者** | Lujie Yang\*、Xiaoyu Huang\*、Zhen Wu\*、Angjoo Kanazawa†、Pieter Abbeel†、Carmelo Sferrazza†、C. Karen Liu†、Rocky Duan†、Guanya Shi†（\* 共同一作，在 Amazon FAR 实习时完成；† Amazon FAR 团队共同负责人） |
| **机构** | Amazon FAR（Frontier AI & Robotics）、MIT、UC Berkeley、Stanford、CMU |
| **平台** | Unitree G1（真机）；重定向管线还跑了 Unitree H1、Booster T1（图 3） |

**一行定位**：第一个在重定向里**显式保住人—物—地形交互**、并把不穿透 / 关节限位 / 速度限位 / 脚不打滑**写成硬约束**的开源人形重定向框架；同一套优化还能把一条人类演示扩成不同物体位姿、形状、地形高度和机器人本体的一族参考动作。

---

## 🎯 一句话总结

> OmniRetarget 把人身上的关键关节和物体、地面表面的采样点一起做 Delaunay 四面体剖分，得到一张**交互网格**；每一帧找一个机器人姿态，让这张网格在机器人这边的 **Laplacian 坐标**（每个顶点减去邻居的平均）尽量和人那边一样，同时满足**不穿透、关节限位、速度限位、支撑脚不动**四条硬约束，用「目标二次近似 + 约束线性化 + 信赖域」的**序贯 SOCP**求解。固定人那一侧、只改机器人这一侧的场景再解一遍，就是**扩增**。参考动作干净了，下游只用 **5 项奖励 + 4 项机器人随机化 + 纯本体感受观测**、照搬 BeyondMimic 的超参数，就在 G1 上零样本跑出 30 秒跑酷和蹬墙后空翻；在 39 段有难度的动作上，强化学习成功率比三家基线（PHC、GMR、VideoMimic）高 10 个百分点以上。

> 🎮 **本文内嵌 1 段讲解动画、1 段配音视频和 3 个交互演示**（不用装任何东西）：
> [十二幕动画：OmniRetarget 全流程](#omniretarget-explainer-anim) —— 约 202 秒串完「只盯关键点交互就丢了 → 交互网格 → Laplacian 坐标 → 四条硬约束 → 序贯 SOCP → 一条演示扩成六条 → 别让整台机器人跟着箱子平移 → 地形与本体 → 极简强化学习 → 表 II → 下游强化学习 → 真机、数据与局限」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。
> [配音讲解视频](#omniretarget-video) —— 同样十二幕，加中文配音与字幕，12 分 45 秒竖屏，可下载
> [硬约束开关](#demo-constraints) —— 同一段搬箱子，官方代码 / 关掉不穿透 / 关掉脚粘地三种设定，逐帧看穿透深度与支撑脚滑动
> [扩增浏览](#demo-aug) —— 改偏移和时间常数，看箱子起点的偏移怎样按指数衰减回原轨迹，并叠上五种扩增的复现结果
> [表 II 与图 7](#demo-table) —— 三类任务的六个指标（均值 ± 标准差）与每段动作的成功率分布

> 🚶 [具体实例](#实例-环境设定)用官方代码在仓库自带的 OMOMO 搬箱演示 `sub3_largebox_003`（196 帧）上从头走一遍：缩放比例、115 个顶点的网格、一个顶点的 Laplacian 坐标、一次 SQP 迭代的代价与约束、关掉约束的对照、五种扩增、下身锚定与初始双脚，再加爬平台的三档高度，最后是输出格式与强化学习的奖励。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **Interaction mesh** | 交互网格（Ho, Komura, Tai, TOG 2010） | 把身体关节和物体 / 环境采样点连成的体积网格，用来保相对位置 |
| **Laplacian 坐标** | — | 一个顶点减去邻居的加权平均；只记相对位置，不随整体平移变 |
| **SQP / SOCP** | Sequential Quadratic Programming / Second-Order Cone Program | 序贯二次规划；每一步的子问题带一条二阶锥（信赖域）约束，所以论文叫「序贯 SOCP」 |
| **SDF** | Signed Distance Function | 有向距离：分开为正、穿进去为负 |
| **IMMA** | Interaction Mesh based Motion Adaptation（Nakaoka & Komura, Humanoids 2012） | 用交互网格给**双足人形机器人**改编动作的前作，没开源、不管关节限位和物体 / 环境 |
| **PHC** | Perpetual Humanoid Control | 这里指它代码里的重定向：拟合 SMPL 身材后整段梯度下降 |
| **GMR** | General Motion Retargeting | 关键点位置 + 朝向匹配，mink 逐帧求解（论文引的是 TWIST） |
| **VideoMimic** | Visual Imitation Enables Contextual Humanoid Control | 从视频重建人和地形，软接触 / 碰撞惩罚，JAX 里做 Levenberg–Marquardt |
| **OMOMO** | Object Motion Guided Human Motion Synthesis 的数据集 | 人搬箱子等人—物交互动捕；OmniRetarget 用的是 InterMimic 处理过的版本 |
| **LAFAN1** | Ubisoft La Forge Animation dataset | Ubisoft La Forge 发布的 BVH 动捕（Harvey 等，SIGGRAPH 2020） |
| **WBT** | Whole-Body Tracking | holosoma 里全身跟踪策略的配置名 |
| **DR** | Domain Randomization | 域随机化 |

---

## 🎬 十二幕动画：OmniRetarget 全流程 {#omniretarget-explainer-anim}

<div class="paper-demo" data-demo="omniretarget-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#omniretarget-video}

<div class="paper-demo" data-demo="omniretarget-video" data-src="media/omniretarget_explainer_video.mp4" data-poster="media/omniretarget_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/omniretarget_explainer_video.mp4" download="OmniRetarget_讲解视频.mp4">下载 mp4（12.9 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（要解决什么问题、方法详解、实验结果）按小节收起，再往后的具体实例、源码对照、与主线的关系、面试和附录各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 2–8 幕里的 G1、箱子和平台，是我们照官方代码跑出的复现结果，和三个交互演示、下文「🚶 具体实例」是同一组数字；表格和第 1、8、10–12 幕的图来自论文。G1 的 3D 外形：材质与光照照抄 [Robot Retarget Online](https://imchong.github.io/Robot_Retarget_Online/) 的 three.js 场景，读 holosoma 的 `g1_29dof_w_largebox.xml`，按复现的 qpos 用正交相机逐帧离线渲染，关键点和网格边按同一个相机投影叠在上面。

---

## ❓ 要解决什么问题

<div class="mermaid">
flowchart TB
    NEED["移动操作要保住的是关系"] --> I1["手 ↔ 箱子"]
    NEED --> I2["脚 ↔ 台面"]
    NEED --> I3["身体 ↔ 平台 / 墙"]

    GAP["PHC / GMR：只做关键点匹配"] --> MISS["物体、地形不进优化"]
    SOFT["VideoMimic：软接触 / 碰撞惩罚"] --> NOG["没有保证，权重难定"]
    MISS --> ART["穿透、滑脚、接触丢失"]
    NOG --> ART
    ART --> PATCH["下游强化学习加一堆临时正则<br/>滞空时间 / 接触时长 ……"]

    style NEED fill:#e8f4fd,stroke:#1f78b4
    style PATCH fill:#fdebd0,stroke:#e67e22
</div>

### 关键点匹配丢了交互

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：重定向只让关节点贴关节点，物体和地形不在优化里</summary>

教人形机器人复杂技能的主流做法，是把人的动作重定向成机器人的参考轨迹，再训练强化学习策略去跟（第 I 节）。重定向要跨过人和机器人身材、比例、自由度的差别；而移动操作和场景交互里，真正要紧的是**手和箱子、脚和台面、身体和平台**之间的空间关系与接触。

现有方法（PHC、GMR、VideoMimic）大多是无约束或软惩罚的优化，靠**关键点匹配**，并不显式保住交互（「do not explicitly consider interaction preservation」）。论文图 6 是同一段搬箱子：

- PHC：膝盖和一只手穿进箱子，另一只手没碰到箱子；
- GMR：把人手的关键点按比例缩放后直接去贴，手插进箱子；
- VideoMimic：碰撞软约束和关键点代价打架，机器人和箱子错开，「not interaction preserving」；
- OmniRetarget：没有明显瑕疵，接触保住了。

</details>

### 软约束没有保证，下游只好打补丁

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：参考有瑕疵 → 奖励工程；BeyondMimic 说明参考干净时极简奖励就够</summary>

参考动作里的穿透、滑脚、关节突变会让跟踪更难：实践里要么手工清洗数据，要么重新引入大量奖励工程，例如脚的滞空时间、接触时长、打滑这类临时正则（论文点名 TWIST、ASAP 等）。这些项调起来「tedious and fragile」。

反过来，BeyondMimic 说明：参考动作干净时（如 Unitree 公开的 LAFAN1 重定向数据），极简的奖励就足以高质量跟踪。但这类高质量参考很少，而且只有机器人本身、没有物体和场景。

VideoMimic 用软的接触、打滑、碰撞惩罚改善了一些，但「offers no guarantees and requires careful tuning」。

</details>

### 一条演示扩不开

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：遥操作难规模化；离线重定向要能从一条演示扩到不同物体、地形和本体</summary>

数据来源有两条路：遥操作（只重定向操作员自己的动作，靠人在线适应场景，但费人力、难规模化）和**离线交互重定向**（把人的动作连同场景交互一起改编到机器人上）。后者如果每个物体位置、每个平台高度都要单独采一条演示，数据成本依旧很高。论文借鉴了接触丰富操作里的数据扩增（Yang 等，RSS 2025），想让一条人类演示自动扩成一族。

</details>

### OmniRetarget 的回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：四个贡献，以及表 I 的对比</summary>

论文列了四个贡献：

1. 第一个处理丰富的机器人—物体—地形交互、同时施加硬物理约束的交互保持重定向框架；
2. 一条人类演示 → 不同机器人本体上一大批高质量运动学轨迹的系统性扩增管线；
3. 大规模开源的重定向数据集；
4. 纯本体感受的强化学习策略零样本上真机，包括搬东西、爬平台、跳下、翻滚、蹬墙后空翻的长序列。

表 I：

| 方法 | 硬运动学约束 | 物体交互 | 地形交互 | 数据扩增 | 优化方法 |
|------|:---:|:---:|:---:|:---:|------|
| IMMA | ✓ | ✗ | ✗ | ✗ | QP |
| PHC | ✗ | ✗ | ✗ | ✗ | 梯度下降 |
| GMR | ✗ | ✗ | ✗ | ✗ | Mink |
| VideoMimic | 软惩罚 | ✗ | ✓ | ✗ | JAX L-M |
| **OmniRetarget** | **✓** | **✓** | **✓** | **✓** | **序贯 SOCP** |

附录表 III 再比了一遍各家的形式：PHC 和 VideoMimic 整条轨迹一起优化、先把 SMPL 拟合到机器人身材；GMR 和 OmniRetarget 逐帧优化、直接按身高比缩放（论文里为简单起见只用一个全局比例 $\alpha = h _ {\text{robot}}/h _ {\text{demo}}$），都能读 SMPL 和 BVH；IMMA 是多阶段的轨迹优化。

</details>

---

## 🔧 方法详解（第 III 节）

<div class="mermaid">
flowchart TB
    DEMO["人类演示<br/>OMOMO / LAFAN1 / 自采动捕"] --> SC["按身高比缩放<br/>α = h_robot / h_demo"]
    SC --> MESH

    subgraph MESH["交互网格（每帧）"]
        KP["人的关键关节<br/>代码：15 个"] --> DEL["Delaunay 四面体剖分"]
        SAMP["物体 / 环境表面采样<br/>代码：箱子 100 个点"] --> DEL
    end

    MESH --> OPT

    subgraph OPT["每帧的约束优化（式 3）"]
        OBJ["min Laplacian 形变能 + 平滑项"]
        C1["s.t. 不穿透 φ ≥ 0"]
        C2["关节限位 / 速度限位"]
        C3["支撑脚钉在上一帧"]
    end

    OPT --> SOCP["序贯 SOCP：二次近似 + 线性化 + 信赖域 ε = 0.2<br/>热启动，每帧最多 10 次"]
    SOCP --> REF["机器人参考轨迹"]
    REF -.->|"固定人那一侧，改机器人这一侧"| AUG["扩增：物体位姿 / 形状、地形高度、本体"]
    AUG -.-> OPT
    REF --> RL["强化学习跟踪<br/>5 项奖励 + 4 项随机化"]
    RL --> HW["G1 真机，零样本"]

    style MESH fill:#e8f4fd,stroke:#1f78b4
    style OPT fill:#fdebd0,stroke:#e67e22
    style HW fill:#e8f8e8,stroke:#27ae60
</div>

### 交互网格（第 III-A 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：顶点 = 关键关节 + 物体 / 环境采样点；Delaunay 四面体剖分；人和机器人只需语义对应</summary>

交互网格是一个体积结构：顶点由人（或机器人）的关键关节，加上在物体和环境表面随机采样的点组成；对这些点做 **Delaunay 四面体剖分**。为了把接触关系保得更准，物体和环境采得比身体关节**更密**。

两组对应的点：

- 源 $\mathcal{P}_t^{\text{source}}$：人身上用户指定的解剖学关键点 + 物体和环境上的采样点；
- 目标 $\mathcal{P}_t^{\text{target}}$：机器人身上对应的关键点（由正运动学 $f_i(q_t)$ 给出）+ **同一批**物体和环境点。

方法对关键点放在哪里比较鲁棒，只需要人和机器人之间**语义一致**的对应（手对手）。

对人—物交互，网格要**建在物体的局部坐标系里**（附录 C-B）：这样 Laplacian 坐标不随物体整体的平移和转动变化。附录图里，物体转了 180°，机器人在物体上方，世界系里的 Laplacian 坐标从 $(0, 1)$ 变成 $(0, -1)$，物体系里的始终是 $(0, 1)$。扩增时手能自然跟着物体走，靠的就是这一点。

</details>

### Laplacian 形变能（式 1、式 2）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一个顶点减去邻居的平均；源和目标逐点之差的平方和</summary>

第 $i$ 个顶点的 Laplacian 坐标是它减去邻居 $\mathcal{N}(i)$ 的加权平均：

$$
L(p_{t,i}) = p_{t,i} - \sum_{j \in \mathcal{N}(i)} w_{ij}\, p_{t,j}
$$

所有实验都用**均匀权重** $w _ {ij} = 1/\|\mathcal{N}(i) \mid $。形变能是源网格和目标网格逐点 Laplacian 坐标之差的平方和：

$$
E_L = \sum_i \big\| L(p_{t,i}^{\text{source}}) - L(p_{t,i}^{\text{target}}) \big\|^2
$$

整体平移不改变 Laplacian 坐标，所以它只记「相对位置」；但它会随尺度变——人那一侧是缩到机器人身高的，物体在两侧是否同尺寸要看实现（见「具体实例」例 1）。

</details>

### 每帧的约束优化（式 3）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：最小化形变能 + 平滑项，满足不穿透、关节限位、速度限位、支撑脚不动</summary>

机器人构型 $q_t$ 包括浮动基位姿（四元数 + 平移）和所有关节角。每一帧解这样一个非凸问题：

$$
\begin{aligned}
q_t^\star = \arg\min_{q_t}\;& \sum_i \big\|L(p_{t,i}^{\text{source}}) - L(p_{t,i}^{\text{target}}(q_t))\big\|^2 + \|q_t - q_{t-1}\|_Q^2 \\
\text{s.t.}\;& \phi_j(q_t) \ge 0,\ \forall j \\
& q_{\min} \le q_t \le q_{\max} \\
& v_{\min}\, dt \le q_t - q_{t-1} \le v_{\max}\, dt \\
& p_t^F = p_{t-1}^F,\ \forall\ \text{stance foot}
\end{aligned}
$$

- $Q$ 是鼓励时间平滑的代价矩阵；
- $\phi_j$ 是第 $j$ 对碰撞体的有向距离（**硬约束**，不是惩罚）；
- 支撑脚：源动作里这只脚的水平速度低于 **1 cm/s** 就算支撑，它的位置钉在上一帧。

这个形式很通用：换机器人（G1 / H1 / T1）只改网格里的关键点对应和机器人的碰撞模型；交互类型覆盖机器人—物体（OMOMO）、机器人—地形（自采动捕）和纯机器人（LAFAN1）。附录 C-B 还说，式 3 的目标可以再叠加任务相关的代价，比如 GMR 的朝向匹配项。

</details>

<div class="paper-demo" data-demo="omniretarget-constraints" id="demo-constraints"><p class="demo-fallback">（本节含交互演示：硬约束开关，需要启用 JavaScript）</p></div>

### 序贯 SOCP（附录 C-C）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：每一步二次近似目标、线性化约束、加一条信赖域二阶锥；热启动；Drake 自动微分</summary>

每一帧迭代求解构型的增量 $dq_n$，从上一帧的解出发（$\bar q_0 = q _ {t-1}^\star$，**热启动**），$\bar q _ {n+1} = \bar q_n + dq_n^\star$，**最多 10 次**、直到收敛。第 $n$ 步的子问题在 $\bar q_n$ 附近线性化：

$$
\begin{aligned}
dq_n^\star = \arg\min_{dq_n}\;& \big\|L^{\text{source}} - (J_L^n\, dq_n + \bar L_n^{\text{target}})\big\|^2 + \|\bar q_n + dq_n - q_{t-1}\|_Q^2 \\
\text{s.t.}\;& J_j^n\, dq_n + \phi_j(\bar q_n) \ge 0 \\
& q_{\min} \le \bar q_n + dq_n \le q_{\max} \\
& v_{\min}\, dt \le \bar q_n + dq_n - q_{t-1} \le v_{\max}\, dt \\
& p_t^F(\bar q_n) + J_F^n\, dq_n = p_{t-1}^F \\
& \|dq_n\|_2 \le \epsilon
\end{aligned}
$$

最后一条是**信赖域**（$\epsilon = 0.2$）：一条二阶锥约束，让每一步足够小，线性化才可信——这就是「序贯 SOCP」里的 SOC。浮动基朝向用四元数，导数不好求，论文用 **Drake** 的自动微分，它能正确处理 $\mathbb{S}^3$ 上的旋转。

线性化会留下少量穿透：表 II 里 OmniRetarget 的最深穿透 1.34 cm，论文说「minimal and can be efficiently fixed by RL」。

</details>

### 扩增：物体位姿与形状（第 III-B 节、附录 C-A）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：固定人那一侧，改机器人这一侧再解；物体起点的偏移按指数衰减</summary>

扩增的做法：**固定** $\mathcal{P}_t^{\text{source}}$，只改目标侧的场景，重新解同一个优化问题——最小化网格形变，就会得到一条新的、运动学可行、保住交互的机器人动作。

**物体位姿**：平移、旋转物体的初始位姿，再用指数衰减和原物体轨迹混合（式 7）。记原轨迹 $(p _ {obj}(t), \theta _ {obj}(t))$，物体开始动的时刻 $t_m$：

$$
\tilde p_{obj}(t) =
\begin{cases}
\Delta p_{obj} + p_{obj}(0) & t < t_m \\
\Delta p_{obj}\, e^{-(t-t_m)/\tau_p} + p_{obj}(t) & t \ge t_m
\end{cases}
$$

转角同理（$\oplus$ 是四元数复合，时间常数 $\tau_\theta$）。论文没给 $\tau$ 的取值，开源代码是平移 50 帧、转角 25 帧。

**物体形状**：三个方向分别缩放物体（图 4c，小箱子 / 大箱子）。关键是**在物体局部坐标系里建网格**，机器人接触物体的部位才会跟着物体一起变换。

</details>

<div class="paper-demo" data-demo="omniretarget-aug" id="demo-aug"><p class="demo-fallback">（本节含交互演示：扩增浏览，需要启用 JavaScript）</p></div>

### 防平凡解：下身锚定与初始双脚

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：只改物体会得到「整台机器人跟着平移」；论文加代价 + 硬约束，代码只有代价</summary>

只在物体系里建网格，会得到平凡的扩增：**整台机器人跟着物体做一次刚体变换**。为了得到真正新的交互，论文加了两样，把身体的一部分锚在名义解 $\{\bar q_t^\star\}$（原始演示的重定向结果）上。以搬箱子为例：

- 代价 $\|q_t - \bar q_t^\star\|_W$，$W$ 对**下半身**的权重很大，逼机器人找新的上半身协调；
- 约束 $p_0^F = \bar p_0^{F\star}$：**第 0 帧的双脚位置**和名义解一致。

开源代码（`retarget_motion`）只实现了第一条：浮动基 7 维 + 双腿 12 个关节共 19 维，权重 $5e^{-t/\tau}$；人—物任务没把配置里的 $\tau = 10^6$ 传进去，用的是构造函数默认的 $\tau = 10$，也就是只在开头约 1 秒拉住（爬平台任务传了 $10^6$）。第 0 帧没有双脚约束，而且人—物任务特意把第 0 帧的脚粘地关掉了。我们复现时，箱子往前挪 20 cm，第 0 帧整台 G1 跟着平移了约 17 cm；按论文把第 0 帧的双脚钉住再跑，脚只挪 1 mm（见「具体实例」例 7）。

</details>

### 扩增：地形与本体

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：平台按高度 / 深度缩放；地面加一层网格点；换机器人只改关键点对应和碰撞模型</summary>

**地形**：缩放平台的高度和深度（图 4a 是 0.56 m、0.70 m、0.84 m 三档，对应原始高度的 0.8 / 1 / 1.2 倍），再加约束；例如平台升高时，为了鼓励稳定的着地接触，在**地面上均匀采一层网格点**放进交互网格。开源代码：`climbing_ground_size = 8`、`climbing_ground_range = (−2, 2)`，即 8 × 8 个点铺在 4 m 见方的地面上；平台缩放 `z_scale ∈ {0.8, 0.9, 1.1, 1.2}`。

**本体**：换成 H1、T1 只改网格里的关键点对应和机器人的碰撞模型（图 3：H1 / T1 搬箱子、爬平台）。开源代码的 `RobotConfig` 目前内置 G1（29 自由度、1.32 m）和 T1（23 自由度、1.2 m）。

</details>

### 下游强化学习：极简配方（第 IV 节）

<div class="mermaid">
flowchart TB
    REF["OmniRetarget 参考轨迹<br/>关节 + 物体位姿"] --> OBS

    subgraph OBS["观测：只有本体感受"]
        O1["参考关节位置 / 速度"]
        O2["参考骨盆位姿误差"]
        O3["骨盆线 / 角速度、关节位置 / 速度"]
        O4["上一步动作"]
    end

    OBS --> POL["策略 π"]

    subgraph REW["5 项奖励（BeyondMimic 的权重与超参数，不改）"]
        R1["身体跟踪"]
        R2["物体跟踪"]
        R3["动作变化率"]
        R4["关节软限位"]
        R5["自碰撞 > 1 N"]
    end

    subgraph DR["4 项机器人随机化"]
        D1["躯干质心"]
        D2["关节零位"]
        D3["随机推一把"]
        D4["观测噪声"]
    end

    REW --> POL
    DR --> POL
    POL --> DEPLOY["G1 零样本上真机<br/>没有课程学习"]

    style OBS fill:#e8f4fd,stroke:#1f78b4
    style REW fill:#fdebd0,stroke:#e67e22
    style DR fill:#f5eef8,stroke:#8e44ad
    style DEPLOY fill:#e8f8e8,stroke:#27ae60
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：观测、奖励、终止、随机化的数值、训练分组</summary>

论文的立场：既然参考动作干净，就照搬 BeyondMimic 的极简形式，**不调任何超参数**。

**观测**（故意做成纯本体感受，看不到场景和物体，只能精确地跟参考）：参考关节位置 / 速度、参考骨盆位置 / 朝向误差；骨盆线 / 角速度、关节位置 / 速度；上一步动作。状态估计不可靠的敏捷动作，把骨盆线位置误差和线速度屏蔽掉。

**奖励**（5 项）：

1. 身体跟踪：DeepMimic 式的身体位置、朝向、线 / 角速度跟踪；
2. 物体跟踪（有物体时）：物体位置、朝向，超参数和身体跟踪一样；
3. 动作变化率；
4. 关节软限位；
5. 自碰撞：每个身体的自碰撞力超过 1 N 就给一个二值惩罚。

权重和超参数照搬 BeyondMimic。

**终止**：身体跟踪偏差太大就终止（同 BeyondMimic）；搬物体时，物体偏离参考超过 **1.0 m 和 45°** 也终止，这一条等策略的身体跟踪学得差不多了才启用。

**域随机化**：物体参数——质量 0.1–2 kg、质心 ±0.08 m、惯量 50–150%、形状 ±10%。机器人只有 4 项（相比之下，别人常用随机外力、电机 PD、动作延迟等很多项）：

| 项 | 范围 |
|----|------|
| 躯干质心 | x ±0.025 m、y ±0.05 m、z ±0.075 m |
| 关节零位 | ±0.01 rad |
| 随机推一把 | 0.3 m/s、0.78 rad/s，每 1–3 s |
| 观测噪声 | 朝向（Rot6D）±0.05，线速度 ±0.5 m/s、角速度 ±0.2 rad/s，关节位置 ±0.01 rad、速度 ±0.5 rad/s |

**训练分组**：所有搬箱子的动作共用**一个多任务策略**；爬平台**每条参考一个策略**。

</details>

---

## 📊 实验结果（第 V 节）

### 真机：跑酷、蹬墙后空翻与其他技能

<div class="mermaid">
flowchart LR
    subgraph PARKOUR["30 s 跑酷（图 1a）"]
        P1["搬 4.6 kg 椅子"] --> P2["踩椅子登台"]
        P2 --> P3["跳下"]
        P3 --> P4["翻滚缓冲"]
    end

    subgraph SKILLS["其他真机技能"]
        S1["OMOMO 搬箱子<br/>多种风格"]
        S2["爬 0.9 m 平台<br/>约身高的 70%"]
        S3["斜坡上爬"]
        S4["蹬墙后空翻<br/>15 rad/s · 5/5"]
    end

    style PARKOUR fill:#e8f4fd,stroke:#1f78b4
    style SKILLS fill:#e8f8e8,stroke:#27ae60
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：30 s 跑酷、蹬墙后空翻的放宽条件、0.9 m 平台</summary>

全部策略在 G1 上零样本迁移：

- 搬箱子：重定向自 OMOMO，多种自然的搬法；
- 爬 **0.9 m** 高的平台（约机器人身高的 70%），斜坡上爬，接触序列干净；图 1(d) 是约 3 m/s 冲上平台再坐下；
- **30 s 长序列**（灵感来自 Boston Dynamics Atlas 的工具使用演示）：把 **4.6 kg** 的椅子搬到平台边，踩着椅子登台，再跳下、做跑酷式翻滚缓冲落地；
- **蹬墙后空翻**（v2 起加入，动作来自 ActorCore）：约 **0.5 s** 翻完，峰值角速度 **15 rad/s**，最大线速度 3.5 m/s，真机 **5/5** 成功。IMU 要能测 15 rad/s 以上。人的脚弓能弯着贴墙生摩擦，机器人的脚是硬的，得更贴墙；所以训练时把末端位置误差的终止阈值从 0.25 m 放宽到 **0.5 m**，并去掉脚的朝向跟踪项，其余不变。

</details>

### 扩增数据上真机

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：79.1% 对 82.2%；只靠随机化扰动物体效果很差</summary>

图 4 的扩增动作（不同形状和位置的搬箱子、不同高度的爬平台）不调奖励也能上真机。

对照：不扩增、只在训练时随机扰动物体的形状和位姿，在这套极简配方下效果很差——策略很难探索到离名义参考太远的地方（论文说可以靠更多奖励工程补，但违背极简的初衷）。

定量：**在全部扩增数据上训练并评测，成功率 79.1%**；**只在名义动作上评测是 82.2%**（即表 II 的 82.20%）。覆盖范围大了很多，成功率只低一点。

</details>

### 表 II：运动学质量

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三类任务 × 六个指标的全表，以及 GMR 接触保持高的原因</summary>

指标：**穿透**（时长按轨迹长度归一化、最深深度）；**打滑**（支撑脚还在动的时长，按应粘地的总长归一化，以及最大打滑速度）；**接触保持**（该接触的时长里接触住的比例：人—物看手和物体，人—地形看手、脚尖、脚跟和地形）；以及下游强化学习的成功率。三个「时长」都是归一化后的比例（0–1），不是秒，论文表头也没写单位（定义见第 V-B 节的 Kinematics Quality）。

| 方法 | 穿透时长（比例）↓ | 最深穿透（cm）↓ | 打滑时长（比例）↓ | 最大打滑（cm/s）↓ | 接触保持（比例）↑ | 下游成功率 ↑ |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **人—物（OMOMO）** | | | | | | |
| PHC | 0.68 ± 0.21 | 5.11 ± 3.09 | 0.05 ± 0.05 | 1.40 ± 0.80 | 0.96 ± 0.09 | 71.28% ± 22.55% |
| GMR | 0.83 ± 0.14 | 8.50 ± 3.94 | 0.02 ± 0.01 | 1.46 ± 0.45 | **0.99 ± 0.04** | 50.83% ± 23.89% |
| VideoMimic | 0.60 ± 0.27 | 7.48 ± 4.95 | 0.12 ± 0.07 | 1.50 ± 0.70 | 0.77 ± 0.25 | 3.85% ± 8.41% |
| OmniRetarget | **0.00 ± 0.01** | **1.34 ± 0.34** | **0** | **0** | 0.96 ± 0.09 | **82.20%±9.74%** |
| **人—地形（自采动捕）** | | | | | | |
| PHC | 0.66 ± 0.36 | 7.74 ± 4.53 | 0.15 ± 0.04 | 2.03 ± 1.83 | 0.45 ± 0.28 | 52.63% ± 49.93% |
| GMR | 0.91 ± 0.16 | 5.72 ± 3.84 | 0.04 ± 0.05 | 1.75 ± 3.01 | 0.67 ± 0.26 | 78.94% ± 40.77% |
| VideoMimic | 0.83 ± 0.11 | 5.97 ± 3.58 | 0.14 ± 0.05 | 1.85 ± 1.38 | 0.47 ± 0.25 | 51.75% ± 49.23% |
| OmniRetarget | **0.01 ± 0.02** | **1.37 ± 0.18** | **0** | **0** | **0.72 ± 0.19** | **94.73% ± 22.33%** |
| **纯机器人（LAFAN1）** | | | | | | |
| Unitree | 0.09 ± 0.13 | 3.22 ± 2.64 | 0.06 ± 0.03 | 1.46 ± 0.01 | N/A | **100%** |
| OmniRetarget | **0.00 ± 0.00** | **1.07 ± 0.00** | **0** | **0** | N/A | **100%** |

读法：

- 人—物这一栏，GMR 的接触保持最高（0.99）。论文解释这主要来自它的关键点匹配目标：人手的关键点按比例缩放到机器人尺寸后，常常把机器人的手带进物体里（图 6b），看起来一直在接触，代价是很深的穿透。
- 纯机器人这一栏对照 Unitree 公开的 LAFAN1 重定向数据（BeyondMimic 用的就是它）：OmniRetarget 的穿透与打滑更少。
- 论文脚注：基线的表现可能依赖超参数，他们从公开代码的默认值出发，又改进到在不同任务上表现稳定。

</details>

<div class="paper-demo" data-demo="omniretarget-table" id="demo-table"><p class="demo-fallback">（本节含交互演示：表 II 与图 7，需要启用 JavaScript）</p></div>

### 下游强化学习：成功率与图 7

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：39 段动作、同一套超参数；PHC 在物体上好、在地形上差；图 7 的失败分布</summary>

论文挑了 **39 段**有难度的动作，所有方法用 BeyondMimic 同一套超参数训练、不手调，在仿真里用训练时的终止条件判成功。

- OmniRetarget 在各任务上都最高，**比基线高 10% 以上**，方差也更小（学得更稳）。
- PHC 在物体任务上比 GMR 好（穿透更少、接触也够），在地形任务上更差：它的接触保持掉了将近 50%。地形任务里，接触保持和成功率几乎成正比。
- VideoMimic 交互保得最差（图 6c）：碰撞软代价和关键点代价打架，碰撞模型原本是给高度图设计的、太粗，搬东西时几乎学不会。

附录图 7 按每段动作画了成功率直方图（不含扩增动作，基线不支持扩增）。读图值（10% 一格）：

| | PHC | GMR | VideoMimic | OmniRetarget |
|---|---|---|---|---|
| 人—物（20 段） | 多数在 60–100% | 分布很散，20–90% | 17 段在 0–10% | 集中在 70–100% |
| 人—地形（19 段） | 9 段 ≈ 0%，10 段 ≈ 100% | 4 段 ≈ 0% | 9 段 ≈ 0% | 1 段 ≈ 0%，18 段 ≈ 100% |

人—物任务里动作不激进、物体参数随机化很重，策略多少都能成功几次，这一栏测的是鲁棒性；爬平台要精确的参考，质量差就一次都不成功。剩下那 1 段，论文认为受限于极简的强化学习形式，以后可以加课程学习。

</details>

### 数据规模

<div class="mermaid">
flowchart LR
    OMOMO["OMOMO 搬箱子<br/>2.78 h"] --> RET["OmniRetarget"]
    MOCAP["自采动捕<br/>1 h"] --> RET
    LAFAN["LAFAN1<br/>4.6 h"] --> RET
    RET --> DS["8.38 h 参考轨迹"]
    DS --> HF["Hugging Face 数据集"]
    DS --> HS["holosoma 训练栈"]

    style RET fill:#e8f4fd,stroke:#1f78b4
    style DS fill:#e8f8e8,stroke:#27ae60
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：2.78 + 1 + 4.6 = 8.38 h；摘要写 8 小时以上，项目页写 9 小时以上</summary>

第 V-B 节：开源数据集包括 OMOMO 搬箱子 **2.78 h**、自采动捕 **1 h**、LAFAN1 **4.6 h**，合计 **8.38 h**。arXiv 摘要写「over 8-hour」，项目页的摘要写「over 9-hour」；以正文给的三段为准。

</details>

### 局限（第 VI 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：逐帧优化；更嘈杂的数据源；剩下 1 段要课程学习</summary>

- 优化是**逐帧**做的，大多数时候够用；以后可以整条轨迹一起优化，对视频这类更嘈杂的数据源更鲁棒，或者学视觉运动策略。
- 爬平台还有 1 段动作学不会，论文认为是极简强化学习形式的限制，可以加课程学习。
- 论文总结的范式转变：与其用复杂的奖励工程修补低质量参考，不如在源头把数据生成做对。

</details>

---

## 🚶 具体实例：一段 OMOMO 搬箱子，用官方代码从头走一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（11 节）：环境设定 / 例 1 读数据与缩放 / 例 2 交互网格 / 例 3 一个顶点的 Laplacian 坐标 / 例 4 一次 SQP 迭代 / 例 5 关掉一条约束 / 例 6 五种扩增 / 例 7 下身锚定与初始双脚 / 例 8 爬平台三档 / 例 9 输出与强化学习 / 例 10 命令</summary>

> ⚠️ 本节是**我们的复现实验，不是论文的实验**：照 holosoma 仓库的 `examples/robot_retarget.py`、`examples/parallel_robot_retarget.py` 原样跑仓库自带的演示数据；「关掉不穿透」「关掉脚粘地」「去掉锚定」「钉住第 0 帧的双脚」是我们加的对照。动画第 2–8 幕和三个交互演示用的是同一组数字，G1 的关键点、接触球、箱子位姿以毫米精度嵌在 `assets/js/demos/omniretarget.js` 里。

<h3 id="实例-环境设定">环境设定</h3>

| 项目 | 值 | 出处 |
|------|----|------|
| 演示 | `demo_data/OMOMO_new/sub3_largebox_003.pt`：**196 帧**、30 fps（6.5 s）；人蹲下抱起大箱子，侧着走约 1.4 m 再放下 | 仓库自带 |
| 人的身高 | `height_dict.pkl['sub3']` = **1.941 m** | 仓库自带 |
| 机器人 | Unitree G1，29 自由度，`ROBOT_HEIGHT = 1.32` m；模型 `models/g1/g1_29dof_w_largebox.xml` | `config_types/robot.py` |
| 箱子 | `models/largebox/largebox.obj`，包围盒 0.47 × 0.46 × 0.41 m | 模型文件 |
| 优化变量 | 浮动基 7 维（位置 + 四元数）+ 29 个关节 = 36 维 | `q_a_init_idx = -7` |
| 环境 | MuJoCo **3.3.7**、numpy 2.3.5、scipy 1.15、cvxpy 1.9 + Clarabel；4 核 CPU 单进程约 7 分钟（≈ 2.2 s/帧） | 我们的机器 |

版本的坑（我们实际碰到的）：numpy ≥ 2.4 会在 MuJoCo 的雅可比里报「only 0-dimensional arrays」（仓库已在 `pyproject.toml` 里钉了 2.3.5）；MuJoCo **3.15** 在第 45 帧解不出来（两个手—箱子的不穿透约束 + 信赖域互相矛盾，CVXPY 报 infeasible），换 3.3.7 就能跑通；scipy 1.18 下旋转扩增的 `Rotation.from_euler("z", 数组)` 会报维度错误，1.15 没问题。

<h3 id="实例-1-读数据与缩放">例 1：读数据与缩放</h3>

缩放比例按身高算：

$$
s = \frac{1.32}{1.941} = 0.680
$$

`preprocess_motion_data()` 做三件事：用两只脚尖整段的最低高度当地面（≥ 0.1 m 就当站在垫子上、少减 0.1 m），人整体乘 $s$；箱子的 $xy$ 乘 $s$，高度只缩「相对第一帧的抬升量」$z'_t = z_0 + s(z_t - z_0)$——机器人这边的箱子是**原尺寸**，第一帧的高度不缩，箱子才不会插进地面。

两侧的箱子尺寸不一样：`load_object_data(..., sample_count=100)` 在箱面均匀撒 100 个点（`trimesh.sample.sample_surface_even`，seed 42），人那一侧用「点 × $s$」（≈ 0.32 × 0.31 × 0.28 m 的小箱子），G1 这一侧用原始点（0.47 × 0.46 × 0.41 m）。Laplacian 坐标不随平移变、但随尺度变，所以两边的尺寸差要靠优化去折中——不穿透约束在这里很关键（例 5）。

<h3 id="实例-2-交互网格">例 2：交互网格</h3>

人 ↔ G1 的 15 对关键点（`JOINTS_MAPPINGS[("smplh", "g1")]`，手指、胸椎、头都不用）：

| SMPL-H | G1 | SMPL-H | G1 |
|--------|----|--------|----|
| `Pelvis` | `pelvis_contour_link` | `L/R_Elbow` | `left/right_elbow_link` |
| `L/R_Hip` | `left/right_hip_pitch_link` | `L/R_Wrist` | `left/right_rubber_hand_link` |
| `L/R_Knee` | `left/right_knee_link` | `L/R_Ankle` | `left/right_ankle_intermediate_1_link` |
| `L/R_Shoulder` | `left/right_shoulder_roll_link` | `L/R_Toe` | `left/right_ankle_roll_sphere_5_link` |

每一帧：15 个人体关键点变到**箱子坐标系**，和 100 个箱面点一起（115 个顶点）交给 `scipy.spatial.Delaunay`。我们这段 196 帧里每帧 **576–607 个四面体**；第 76 帧（抱着箱子往前走）是 598 个四面体、737 条边。G1 这一侧用**同一套邻接关系**，顶点换成 G1 的 15 个部位和原尺寸箱子的 100 个点。

<h3 id="实例-3-一个顶点的-laplacian-坐标">例 3：一个顶点的 Laplacian 坐标</h3>

第 76 帧，人的左手腕在网格里连着 **22 个邻居**：18 个箱面点，加左髋、左膝、左肘、左脚尖。均匀权重 $1/22$，在箱子坐标系里：

- 人：$L \approx (3.6,\ 1.7,\ 0.2)$ cm；
- G1：同一个顶点、同一批邻居，$L \approx (6.6,\ 2.1,\ 0.5)$ cm，两者差 **3.1 cm**。

把人和箱子一起平移，$L$ 不变。整段 196 帧的形变能 $\sum_i \|\Delta L_i\|^2$ 平均 0.069 m²，折合到每个顶点平均差 **2.4 cm**。代码里每个顶点的权重是 `laplacian_weights = 10`，和平滑项、腰部代价一起构成求解器打印的那个代价（第 76 帧约 0.654）。

<h3 id="实例-4-一次-sqp-迭代">例 4：一次 SQP 迭代</h3>

`solve_single_iteration()`：决策变量是 36 维的 $\Delta q$ 和 345 维（115 × 3）的 Laplacian 辅助变量，用 cvxpy 建模、**Clarabel** 求解；雅可比由 MuJoCo 的 `mj_jac` 解析算（不是 Drake 自动微分）。

| 代价 | 写法 | 权重 |
|------|------|------|
| Laplacian 形变 | $\sum_i 10\,\|\text{lap}_i - L_i^{\text{src}}\|^2$ | 10 |
| 时间平滑 | $0.2\,\|\Delta q - (q _ {t-1} - q)\|^2$ | 0.2 |
| 腰部扭转 | 只罚腰 yaw、腰 roll 两维的绝对值 | 0.2 |
| 下身锚定 | 只在扩增时有，见例 7 | $5e^{-t/\tau}$ |

| 约束 | 线性化形式 | 默认参数 |
|------|-----------|---------|
| 不穿透 | $J_n \Delta q \ge -\phi - 0.001$ | 只查 0.1 m 以内的「G1—箱子」「G1—地面」碰撞对 |
| 脚粘地 | $\lvert J _ {xy} \Delta q - (p _ {t-1} - p) \rvert \le 0.001$ | 每只脚 4 个接触球，只管 $x$、$y$ |
| 关节限位 | $q _ {lb} - q \le \Delta q \le q _ {ub} - q$ | URDF 范围再手工收紧（腰 roll ±0.3 等） |
| 信赖域 | $\|\Delta q\|_2 \le 0.2$ | `cp.SOC(step_size, dqa)` |

没有单独的速度限位：相邻帧的变化只靠信赖域和平滑项管。第 0 帧最多迭代 50 次、之后每帧最多 10 次，代价 `np.isclose` 不变就停。我们这段：第 0 帧跑满 50 次，代价 4.16 → 1.18；之后 195 帧里 **179 帧跑满 10 次**——代价在第四位小数上来回跳（第 76 帧在 0.6539–0.6542 之间），是约束线性化后来回修正，`isclose` 的相对容差 $10^{-5}$ 判不到收敛。

两条约束的手算（数值是示意）：右手和箱面的有向距离 $\phi = 0.03$ m 时，约束是 $J_n\Delta q \ge -0.031$，这一步最多让手朝箱子走 3.1 cm；已经插进去 5 mm（$\phi = -0.005$）时，变成 $J_n\Delta q \ge 0.004$，这一步至少退出 4 mm。

<h3 id="实例-5-关掉一条约束">例 5：关掉一条约束</h3>

| 设定 | 最深穿透 | 支撑脚每帧挪（平均 / 最多） |
|------|---------|-------------------|
| 官方代码 | **0.26 cm**（左踝 → 地面，第 57 帧） | 1.20 / **1.45 mm** |
| 关掉不穿透 | 箱子 **5.4 cm**（第 26 帧，左髋）、地面 **7.6 cm**（第 124 帧，右踝）；163 帧手 / 腿插进箱子超过 1 cm，196 帧脚都陷进地面超过 1 cm | 1.14 / 1.41 mm |
| 关掉脚粘地 | 0.23 cm | **4.6 / 32.7 mm** |

- 「关掉不穿透」：仓库的 `activate_obj_non_penetration` 开关其实没被读到，我们是在求解前把碰撞对清空做的。人那一侧的箱子缩到了 0.68 倍，只看形状，手和腿就被拉进原尺寸的箱子里。
- 「关掉脚粘地」：官方的 `--retargeter.no-activate-foot-sticking`。
- 支撑脚按官方代码判定：人的脚尖相邻两帧水平位移 ≤ 0.01 m（30 fps 下相当于 30 cm/s，比论文写的 1 cm/s 宽得多）。开着脚粘地时，接触球每帧仍挪约 1.2 mm——贴着「相对上一帧 ±1 mm」这个窗口的对角线 $\sqrt{2}$ mm；人的脚尖在这些帧里中位数只挪 0.25 mm。所以代码的脚粘地是「每帧最多挪约 1.5 mm」，长时间支撑会慢慢累积。论文的评测把每帧挪动超过 1 cm 才算打滑，所以表 II 记为 0。

<h3 id="实例-6-五种扩增">例 6：五种扩增</h3>

`generate_augmentation_configs()`：在「人的坐标系」（$x$ 轴从人的初始骨盆指向箱子，$z$ 朝上）里挪箱子的起点。箱子开始动的帧 $t_m$ 由相邻帧位姿差的范数第一次超过 0.0025 判定，这段是**第 25 帧**；之后平移偏移乘 $e^{-k/50}$、转角乘 $e^{-k/25}$：搬起后 50 帧平移剩 37%（20 cm → 7.4 cm），150 帧剩 5%；45° 在 25 帧后剩 16.6°。

| 名字 | 平移（人的坐标系） | 绕 $z$ 转 | 最深穿透 | 支撑脚每帧最多 |
|------|------------------|----------|---------|-------------|
| `trans_0` | 往前 20 cm | 0 | 0.26 cm | 1.44 mm |
| `trans_1` | 往左 20 cm | 0 | 0.28 cm | 1.44 mm |
| `trans_2` | 往右 20 cm | 0 | 0.28 cm | 1.43 mm |
| `rot_0` | 往左 20 cm | +45° | 0.26 cm | 1.43 mm |
| `rot_1` | 往右 20 cm | −45° | 0.20 cm | 1.43 mm |

交互保住了：搬运那段（第 50–140 帧），五种扩增里 G1 两只手在箱子坐标系里的平均位置相差不到 0.6 cm。人—物任务的代码只做位姿扩增，没有论文图 4(c) 的箱子缩放。

<h3 id="实例-7-下身锚定与初始双脚">例 7：下身锚定与初始双脚</h3>

扩增时以原始解为名义轨迹：第 0 帧从 $\bar q_0^\star$ 出发，下身锚定代价 $w\,\|q _ {[0:19]} - \bar q^\star _ {[0:19]}\|^2$，$w = 5e^{-t/10}$（$t = 10$ 帧时 1.84，$t = 30$ 帧时 0.25）。箱子往前挪 20 cm（`trans_0`）时，第 0 帧相对原始解：

| 设定 | 骨盆挪了 | 双脚（8 个接触球的平均）挪了 |
|------|---------|------------------------|
| 去掉锚定（`--retargeter.w-nominal-tracking-init 0`） | 17.8 cm | 19.9 cm |
| 官方代码（只有锚定代价） | 17.1 cm | 19.2 cm |
| 按论文钉住第 0 帧的双脚（我们打开第 0 帧的脚粘地） | **10.5 cm** | **0.1 cm** |

官方代码基本就是论文说的「平凡扩增」：整台 G1 跟着箱子挪；钉住双脚后，脚站在原地，骨盆往前探、上身弯过去够箱子，才是图 4(b) 那样的新交互。`rot_0` 同样：官方代码骨盆 7.7 cm / 脚 11.5 cm，钉住后骨盆 4.5 cm、脚不到 0.1 cm。

<h3 id="实例-8-爬平台三档">例 8：爬平台三档</h3>

`demo_data/climb/mocap_climb_seq_0`：自采动捕 2801 帧，每 4 帧取一帧 → 701 帧（23.4 s），人身高按 1.78 m 缩放（$s = 0.742$）。三个箱体组成台阶—高台—低台，高台 0.95 m × 0.742 = **0.705 m**，正好是图 4(a) 的「Original 0.70 m」；`z_scale` 0.8 / 1.2 得到 0.56 / 0.85 m（图里写 0.84 m）。我们跑了三档：

| 平台 | 最深穿透 | 支撑脚每帧（平均 / 最多） |
|------|---------|-------------------|
| 0.56 m | 0.26 cm | 1.03 / 1.42 mm |
| 0.70 m | 1.08 cm | 1.02 / 2.86 mm |
| 0.85 m | 0.28 cm | 1.06 / 1.43 mm |

爬平台用 `g1_29dof_spherehand.urdf`（手换成球，方便撑台面），扩增时地面加 8 × 8 个网格点；第 0 帧 50 次、之后平均 6.1 次迭代，比搬箱子收敛得快。

<h3 id="实例-9-输出与强化学习">例 9：输出与强化学习</h3>

输出 `sub3_largebox_003_original.npz`：

| 字段 | 形状 | 内容 |
|------|------|------|
| `qpos` | (196, 43) | `[0:3]` 基座位置、`[3:7]` 基座四元数 wxyz、`[7:36]` 29 个关节、`[36:43]` 箱子位置 + 四元数 |
| `human_joints` | (196, 52, 3) | 缩放、落地后的人体关节 |
| `fps` | 标量 | 30 |
| `cost` | 标量 | 最后一帧的代价 |

`data_conversion/convert_data_format_mj.py` 把它插值到 50 fps（位置线性、旋转 slerp），在 MuJoCo 里前向算出身体与物体的位置、朝向、线 / 角速度，供 `exp:g1-29dof-wbt-w-object` 训练。奖励 `g1_29dof_wbt_reward_w_object` 和论文的 5 项对得上：

| 论文 | holosoma 里的项 | 权重 |
|------|----------------|------|
| 身体跟踪 | 全局参考位置 / 朝向（σ 0.3 / 0.4）、相对身体位置 / 朝向（σ 0.3 / 0.4）、身体线 / 角速度（σ 1.0 / 3.14） | 0.5、0.5、1.0、1.0、1.0、1.0 |
| 物体跟踪 | 物体全局位置 / 朝向（σ 0.3 / 0.4） | 1.0、1.0 |
| 动作变化率 | `penalty_action_rate` | −0.1 |
| 关节软限位 | `limits_dof_pos`（`soft_dof_pos_limit = 0.9`） | −10.0 |
| 自碰撞 | `UndesiredContacts`：除脚底接触点、腕、踝以外的身体接触力 > 1 N 就计数 | −0.1 |

最后一行按代码看罚的是「不该碰的部位的任何接触」，比论文字面上的「自碰撞」宽（**这是我们读 `UndesiredContacts` 的配置得出的**）。

<h3 id="实例-10-命令">例 10：命令</h3>

```bash
cd src/holosoma_retargeting/holosoma_retargeting
pip install "numpy==2.3.5" "mujoco==3.3.7" "scipy<1.16"   # 我们实测能跑通的版本组合

# 原始序列（README 原命令）
python examples/robot_retarget.py --data_path demo_data/OMOMO_new \
    --task-type object_interaction --task-name sub3_largebox_003 --data_format smplh
#    → demo_results/g1/object_interaction/omomo/sub3_largebox_003_original.npz

# 关掉脚粘地（我们的对照）
python examples/robot_retarget.py ... --retargeter.no-activate-foot-sticking

# 五种扩增（README 原命令；需要先有 original）
python examples/parallel_robot_retarget.py --data-dir demo_data/OMOMO_new \
    --task-type object_interaction --data_format smplh --augmentation \
    --save_dir demo_results_parallel/g1/object_interaction/omomo --task-config.object-name largebox

# 爬平台（README 原命令），扩增再加 --augmentation
python examples/robot_retarget.py --data_path demo_data/climb --task-type climbing \
    --task-name mocap_climb_seq_0 --data_format mocap --robot-config.robot-urdf-file models/g1/g1_29dof_spherehand.urdf
```

批量扩增脚本在当前 `main` 上有个坑：`process_single_task()` 循环里把参数 `retargeter`（一个 `RetargeterConfig`）重新赋值成了 `InteractionMeshRetargeter` 实例，第二个配置会报 `'InteractionMeshRetargeter' object has no attribute 'self_collision'`；我们在外面包了一层，把配置换回去才跑通。

</details>

---

## 📁 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：目录、论文各部分落在哪个函数、论文与代码的出入</summary>

| 论文 | 代码（`src/holosoma_retargeting/holosoma_retargeting/`） |
|------|------|
| 交互网格、Laplacian | `src/utils.py`：`create_interaction_mesh()`（scipy Delaunay）、`get_adjacency_list()`、`calculate_laplacian_coordinates()` / `calculate_laplacian_matrix()`（默认均匀权重） |
| 式 3 与序贯 SOCP | `src/interaction_mesh_retargeter.py`：`retarget_motion()` 逐帧、`iterate()` 迭代、`solve_single_iteration()` 建 cvxpy 子问题 |
| 不穿透 | `_update_jacobians_and_phis_from_q()`：`mj_collision` 预筛 0.1 m 以内的碰撞对，再 `mj_geomDistance` |
| 支撑脚 | `utils.extract_foot_sticking_sequence_velocity()`；约束在 `solve_single_iteration()` |
| 扩增 | `utils.augment_object_poses()`（式 7）、`transform_from_human_to_world()`；`examples/parallel_robot_retarget.py` 的 `generate_augmentation_configs()` |
| 评测（表 II 的指标） | `evaluation/eval_retargeting.py`：穿透（容差 1 cm）、打滑（每帧 > 0.01 m）、接触保持（手离物体原点 ≤ 0.28 m） |
| 强化学习 | `src/holosoma/holosoma/config_values/wbt/g1/`（`reward.py`、`randomization.py`、`termination.py`） |

论文与代码的出入（2026-10 的 `main`）：

| 细节 | 论文 | 开源代码 |
|------|------|---------|
| 求解与微分 | 自定义 SQP + Drake 自动微分 | cvxpy + Clarabel，雅可比由 MuJoCo 解析计算 |
| 每帧迭代 | 最多 10 次 | 第 0 帧 50 次、之后 10 次 |
| 速度限位 | 式 3 里有 | 没有单独实现 |
| 支撑脚阈值 | 水平速度 < 1 cm/s | 相邻帧位移 ≤ 0.01 m（30 fps 下 30 cm/s）；LAFAN 建议放宽 `--retargeter.foot-sticking-tolerance 0.02` |
| 支撑脚约束 | $p_t^F = p _ {t-1}^F$ | 相对上一帧 ±1 mm（只管 $x$、$y$） |
| 自碰撞硬约束 | 碰撞对都算 | 默认关闭（`SelfCollisionConfig.enable = False`），要手配身体对 |
| 不穿透开关 | — | `activate_obj_non_penetration` 没被读到，始终开着 |
| 下身锚定 | 代价 + 第 0 帧双脚约束 | 只有代价，人—物任务 $\tau = 10$ 帧；第 0 帧的脚粘地反而关掉 |
| 物体扩增 | 位姿 + 形状 | 人—物任务只有位姿（±20 cm、±45°），形状缩放只在爬平台里 |
| 关键点 / 采样点数 | 没给 | 15 个关键点 + 100 个箱面点 |

</details>

---

## 🔗 与重定向主线关系

<div class="mermaid">
flowchart TB
    IN["人体动捕 / 视频重建"] --> GMR
    IN --> PHC
    IN --> REACT
    IN --> NMR
    IN --> OMNI

    GMR["GMR / PHC<br/>关键点 IK<br/>无交互建模"] --> OUT1["平地动作跟踪"]
    REACT["ReActor<br/>RL 内嵌双层优化"] --> OUT2["跨本体<br/>物理可行参考"]
    NMR["NMR<br/>学习式时序映射"] --> OUT3["抑制 IK 跳变"]
    OMNI["OmniRetarget<br/>交互网格 + 硬约束 + 扩增"] --> OUT4["人—物—地形交互<br/>移动操作数据工厂"]

    OUT1 --> RL["下游 RL 跟踪 / 模仿"]
    OUT2 --> RL
    OUT3 --> RL
    OUT4 --> RL

    style OMNI fill:#e8f8e8,stroke:#27ae60
    style RL fill:#e8f4fd,stroke:#1f78b4
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：先读 GMR、BeyondMimic，再看本文怎样把交互也保住</summary>

**阅读顺序建议**：先读 [Retargeting Matters（GMR）](../Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html) 理解「重定向质量决定下游 RL」，再读 [BeyondMimic](../../01_Foundational_RL/BeyondMimic/BeyondMimic.html) 看极简奖励的跟踪框架；本文把两者接起来：在重定向里保住交互、写成硬约束，就能直接套用 BeyondMimic 的极简配方去学搬箱子、爬平台。

- [PHC](../../01_Foundational_RL/PHC_Perpetual_Humanoid_Control/PHC_Perpetual_Humanoid_Control.html)：表 II 的基线之一（它代码里的 SMPL 拟合 + 梯度下降重定向）。
- [ReActor](../ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting/ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting.html)、[NMR](../Make_Tracking_Easy__Neural_Motion_Retargeting_for_Humanoid_Whole-body_Control/Make_Tracking_Easy__Neural_Motion_Retargeting_for_Humanoid_Whole-body_Control.html)：同板块的另外两条路线（物理可行性、学习式映射）。
- [HDMI](../../04_Loco-Manipulation_and_WBC/HDMI__Learning_Interactive_Humanoid_Whole-Body_Control_from_Human_Videos/HDMI__Learning_Interactive_Humanoid_Whole-Body_Control_from_Human_Videos.html)：从人类视频学交互式全身控制，物体进入任务的另一种做法。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：五问五答</summary>

**Q1：为什么用 Laplacian 坐标而不是直接匹配关键点？**
关键点匹配管的是「每个点在哪」，人和机器人尺寸不同，硬贴会把手带进物体里（GMR 的接触保持 0.99、最深穿透 8.5 cm）。Laplacian 坐标管的是「每个点相对邻居在哪」，对整体平移不变；邻居里有物体表面的采样点，手和物体的相对关系就被编码进去了。

**Q2：网格为什么要建在物体坐标系里？**
物体被搬着走、转的时候，世界系里的相对向量会跟着转，Laplacian 坐标变了，优化会把手往错的方向拉。在物体系里建，Laplacian 坐标对物体的整体运动不变；扩增时挪动物体，接触部位也自然跟着走。

**Q3：「序贯 SOCP」里的 SOC 是什么？**
每一步把目标二次近似、约束线性化，得到一个 QP；再加一条信赖域 $\|dq\|_2 \le 0.2$，这是二阶锥约束，所以子问题是 SOCP。步长小，线性化才可信。

**Q4：扩增为什么会退化成平凡解，怎么防？**
网格建在物体系里，物体挪了，最省事的解就是整台机器人一起挪。论文用下半身锚定代价 + 第 0 帧双脚约束逼机器人用上半身去够。我们复现发现开源代码只有代价没有双脚约束，往前挪 20 cm 时机器人整体平移了 17 cm；补上双脚约束后脚只挪 1 mm。

**Q5：为什么下游 RL 能这么简单？**
BeyondMimic 已经说明参考干净时极简奖励就够；OmniRetarget 把参考做干净（穿透 ≈ 0、打滑 = 0、交互保住），所以只用 5 项奖励、4 项随机化、纯本体感受观测，不加课程学习，39 段动作上成功率比基线高 10% 以上，并能零样本上真机。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX、开放问题、旧版笔记的改正</summary>

<h3 id="a-bibtex">A. BibTeX</h3>

```bibtex
@inproceedings{yang2026omniretarget,
  title     = {OmniRetarget: Interaction-Preserving Data Generation for Humanoid Whole-Body Loco-Manipulation and Scene Interaction},
  author    = {Yang, Lujie and Huang, Xiaoyu and Wu, Zhen and Kanazawa, Angjoo and Abbeel, Pieter and Sferrazza, Carmelo and Liu, C. Karen and Duan, Rocky and Shi, Guanya},
  booktitle = {IEEE International Conference on Robotics and Automation (ICRA)},
  year      = {2026},
  note      = {arXiv:2509.26633}
}
```

<h3 id="b-开放问题">B. 开放问题</h3>

1. 逐帧优化在视频重建这类嘈杂数据上会不会抖？整条轨迹一起优化代价多大？
2. 人那一侧的物体随人一起缩小、机器人这一侧用原尺寸，两边的尺寸差由优化折中；如果人和机器人身材差更大（儿童尺寸的机器人），交互还能保住多少？
3. 代码的脚粘地是「每帧 ±1 mm」，长时间支撑会累积挪动；评测按每帧 1 cm 算打滑，对慢速滑动不敏感。更严格的评测下表 II 的「0」还成立吗？
4. 只靠纯本体感受，策略其实「看不到」物体；物体位置偏离参考很多时怎么办？扩增数据 + 视觉能不能接上？

<h3 id="c-旧版笔记的改正">C. 旧版笔记的改正</h3>

- **扩增的成功率**：旧版写「全扩增集训练、名义轨迹上评测 79.1%，仅名义轨迹评测 82.2%」，论文是「在全部扩增数据上训练**并评测** 79.1%，只在名义动作上评测 82.2%」；旧动画与旁白同错，已改。
- **参考文献**：Interaction mesh 是 Ho、Komura、Tai（TOG 2010），不是「Kim et al. SIGGRAPH 2013」；BeyondMimic 的作者是 Liao 等，不是 Luo；论文里 GMR 引的是 TWIST。
- **缩写**：LAFAN1 是 Ubisoft La Forge Animation dataset（不是 Lafayette）；OMOMO 是「Object Motion Guided Human Motion Synthesis」的数据集；IMMA 是给双足人形机器人做的（Humanoids 2012），不是图形学方法。
- **观测**：论文只说「状态估计不可靠的敏捷动作」屏蔽骨盆线位置误差和线速度，没点名蹬墙后空翻。
- **数据时长**：「9+ 小时」是项目页的说法，arXiv 摘要是「8 小时以上」，正文三段加起来 8.38 h。
- **会议与奖项**：补上项目页标注的 ICRA 2026 Best Conference Paper Award 与 Best Paper Award on Robot Manipulation and Locomotion。
- **补充**：随机化的具体数值、终止条件（1.0 m / 45°）、39 段动作、图 7、只靠随机化的对照、后空翻的放宽条件与 3.5 m/s、表 II 的最大打滑速度一列和另外两栏。
- **具体实例**：旧版假设人高 1.75 m（$s = 0.754$），仓库里 sub3 的身高是 1.941 m（$s = 0.680$）；手腕的 Laplacian 例子、扩增的数值都换成了官方代码实际跑出的结果；并补上代码与论文的几处出入（速度限位、初始双脚约束、不穿透开关、批量扩增脚本的 bug、版本坑）。

</details>
