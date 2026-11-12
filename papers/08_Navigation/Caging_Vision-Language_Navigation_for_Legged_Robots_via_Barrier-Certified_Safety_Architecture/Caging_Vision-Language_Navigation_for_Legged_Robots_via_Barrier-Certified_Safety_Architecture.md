---
layout: paper
title: "Caging Vision-Language Navigation for Legged Robots via Barrier-Certified Safety Architecture"
zhname: "Caging VLN：用屏障函数认证的足式机器人视觉语言导航安全架构"
category: "Navigation"
arxiv: "2611.04972"
original_check: done
original_check_date: 2026-11-12
original_check_scope: arXiv v1 LaTeX 源码全文（摘要、第 I–V 节、式 1–10、定理 1 与附录证明、算法 1、表 I–V、图 1–4 图注）；未找到官方源码
---

# Caging Vision-Language Navigation for Legged Robots via Barrier-Certified Safety Architecture
**不改 VLM / VLA 本身，而是把它的导航输出当成「提议」关进一个笼子：先把「左转 15°、前进 25 cm」这类离散动作投影成 SDF 里离障碍 ≥ 0.3 m 的目标位姿，再由 Bézier 参数化的低维 MPPI 规划速度，只执行每一步都满足离散指数屏障条件 $h _ {k+1}\ge\gamma h_k$ 的那条轨迹的第一个命令，否则原地停下；G1 上四种前端（ChatGPT / Gemini / Claude / NaVILA）的碰撞率从 80–100% 降到 0**

> 📅 总结日期: 2026-11-12
>
> 🏷️ 板块: 08 Navigation · 视觉语言导航（VLN）· 安全过滤 · 离散屏障函数 · MPPI · SDF · Unitree G1 / Ghost Vision 60
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）· 上游 awesome-humanoid-robot-learning Navigation 章节中尚无笔记的最新论文（2026-11-03，PROGRESS #1195）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2611.04972](https://arxiv.org/abs/2611.04972) |
| HTML | [arxiv.org/html/2611.04972](https://arxiv.org/html/2611.04972) |
| PDF | [下载 v1](https://arxiv.org/pdf/2611.04972) |
| **发布时间** | 2026-11-03（arXiv v1，cs.RO，CC BY 4.0）；LaTeX 首页注明 *Accepted to IEEE-RAS Humanoids 2026* |
| 项目页 | 没有单独的项目页 |
| 源码 | ⏳ 截至 2026-11-12 未找到：论文、arXiv 页面都没有代码链接，所以本文没有源码运行时序图 |
| 依赖的开源组件 | 里程计：G1 用 FAST-LIVO2，Vision 60 用不变 EKF（腿运动学 + IMU，见本站 [Contact-Aided InEKF](../../09_State_Estimation/Contact-Aided_Invariant_EKF_for_Legged_Robots/Contact-Aided_Invariant_EKF_for_Legged_Robots.html)）；增量 SDF（FIESTA, Han 2019）；可选全局规划 JPS；目标检测 Grounding-DINO + SAM2；VLA 前端之一是 [NaVILA](../NaVILA_Legged_Robot_Vision-Language-Action_Model_for_Navigation/NaVILA_Legged_Robot_Vision-Language-Action_Model_for_Navigation.html) |

**作者**：Abhijeet Mangesh Kulkarni、Saimouli Katragadda、Yuze Du、Guoquan Huang（特拉华大学 RPNG 组），Zijun Sha（丰田 Frontier Research Center）

---

## 🎯 一句话总结

VLM / VLA 很会理解「出门左转、停在自行车旁」，但它输出的动作不知道机器人有多宽、眼前障碍在哪，也没有任何安全保证。本文的做法是**不动语义模型、在它和行走控制器之间插一层「笼子」**：语义层给出离散动作 → **运动学目标投影器**把它变成 SDF 里安全的平面目标位姿；物理层用**低维 Bézier-MPPI** 采样速度序列，代价里加一项 dEBF 违反惩罚引导采样，最后按代价排序**硬检查**每条轨迹每一步、每个机体球是否满足 $h_i(\mathbf{x} _ {k+1})\ge\gamma h_i(\mathbf{x}_k)$，选第一条通过的执行首个命令，都不通过就执行「零速」备份。在常速平面模型与 SDF 正确的假设下可证 $h_i(\mathbf{x}_k)\ge\gamma^k h_i(\mathbf{x}_0)\ge 0$（安全集前向不变）。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VLN | Vision-Language Navigation | 视觉语言导航：按自然语言指令走到目标 |
| VLA / VLM | Vision-Language-Action / Vision-Language Model | 视觉语言动作模型 / 视觉语言模型，这里当语义前端 |
| SDF | Signed Distance Field | 有符号距离场：每个点到最近障碍表面的距离，障碍内为负 |
| MPPI | Model Predictive Path Integral | 采样式模型预测控制：采样一批控制序列，按 $\exp(-J/\lambda)$ 加权平均 |
| dEBF | discrete Exponential Barrier Function | 离散指数屏障函数：每步屏障值至少保留 $\gamma$ 倍 |
| CBF | Control Barrier Function | 控制屏障函数（连续时间版本） |
| JPS | Jump Point Search | 栅格上加速 A* 的全局路径搜索 |
| SR / CR / E2E SR / NE | Success / Collision / End-to-End Success Rate / Navigation Error | 成功率 / 碰撞率 / 成功且无碰撞的比例 / 终点离目标的距离 |

---

## ❓ 这篇论文要解决什么问题？

1. **语义正确 ≠ 物理可执行**：NaVILA 这类足式 VLA、或者直接让 GPT / Gemini 看图出动作，输出忽略了机器人运动学、局部障碍和任何形式的安全约束，可能让机器人直接撞上去。
2. **不想放弃端到端 VLA 的推理能力**：重新训练一个「安全的 VLA」（如 SafeVLA 的约束学习）会把安全责任交给学习出来的模型；作者希望语义模型保持原样、可随时更换。
3. **需要有证明的安全层，而且要实时、跨平台**：同一层要能挂在人形 G1 和四足 Vision 60 上，只换机体几何和里程计。

---

## 🔧 方法拆解

### 1. 系统总览（第 III 节，图 1）

- 机器人在平面上建模：状态 $\mathbf{x}=[p_x,p_y,\psi]$，控制为机体系速度 $\mathbf{u}=[v_x,v_y,\omega]$，常速离散模型 $\mathbf{x} _ {k+1}=\mathbf{x}_k+\mathbf{R}(\psi_k)\mathbf{u}_k\Delta t$（式 1），人形和四足共用。
- 环境用增量更新的 2D SDF $\phi(\mathbf{p})$ 表示。
- **语义接地层**（上）：VLM 看当前画面 + 指令，输出离散动作——左 / 右转 15° 一档、最多 45°，前进 25 cm 一档、最多 75 cm。
- **物理接地层**（下）：里程计 + SDF + 屏障认证 MPPI，可选 JPS 全局规划减轻局部极小。

### 2. 运动学目标投影器（第 IV 节）

- 把离散动作换算成期望位置 $\mathbf{p}_d$，查 SDF：$\phi(\mathbf{p})\ge d _ {\text{clear}}=0.3$ m 才算安全。
- 被占就在附近一圈采候选点，用 $C _ {\text{goal}}(\mathbf{p})=\|\mathbf{p}-\mathbf{p}_d\|+w_\psi\|\Delta\psi\|-w_\phi\phi(\mathbf{p})$ 选代价最小的（离期望近、不偏离前方、离障碍远），送给局部规划器。

### 3. 开放词汇的终点对齐（第 IV 节）

- 指令序列走完后，可选启用 Grounding-DINO 检测 + SAM2 分割，把掩码 / 框中心用激光、里程计、相机内参投到全局系。
- 目标距离必须在 $[0.5, 3.0]$ m 内才认，状态机 `SEARCHING → APPROACHING → CLOSE`，距离 < $d _ {\text{stop}}=0.5$ m 停下。

### 4. 低维屏障认证 MPPI（第 V 节，算法 1）

- **Bézier 参数化**：整段 2.5 s 的速度序列用 $d$ 阶 Bézier 曲线的 $d+1$ 个控制点表示（式 2），优化维度从「每步一个三维命令」降到几个控制点，命令天然平滑。
- **代价** $J=C _ {\text{goal}}+C _ {\text{ctl}}+C _ {\text{safety}}$：
  - $C _ {\text{goal}}$：位置误差 + 朝向误差，离目标远时朝向对准运动方向、近时对准终点朝向，用 sigmoid $\alpha_\psi$ 在 $d _ {\text{switch}}$ 处过渡；
  - $C _ {\text{ctl}}$：命令大小 + 超出各轴速度上限的 hinge 惩罚；
  - $C _ {\text{safety}}$：$\sum_k\sum_i w_i[\gamma h_i(\mathbf{x}_k)-h_i(\mathbf{x} _ {k+1})+\varepsilon _ {\text{bar}}]_+$——只用来**引导采样**，不负责保证安全。
- **机体几何**：机器人用 $M$ 个机体固连的圆近似（图 2），屏障 $h_i=\phi(\mathbf{p}_i)-r_i$，全部 $\ge0$ 即无碰撞；只需查 SDF 的值，不需要 SDF 的梯度。
- **硬认证**：迭代结束后按代价从低到高检查每条 rollout，**每一步、每个球**都满足 $h_i(\mathbf{x} _ {k+1})\ge\gamma h_i(\mathbf{x}_k)$ 的第一条，执行它的首个命令；一条都没有就用备份 $\kappa(\mathbf{x})$（常速模型下零速就是合法备份）。
- **定理 1**：在 (A1) 常速模型、(A2) 几何与 SDF 正确、(A3) 备份存在、(A4) 只执行认证过的命令、(A5) 初始安全下，$h_i(\mathbf{x}_k)\ge\gamma^k h_i(\mathbf{x}_0)\ge0$，附录用归纳法证明。
- **参数**：$\gamma=0.95$，200 个样本 × 10 次迭代，步长 0.05 s × 50 步 = 2.5 s 视界；建图与规划跑在 NVIDIA A4500 上。论文没给 Bézier 阶数 $d$、球数 $M$、各权重的数值。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TD
    U["用户指令<br/>「出门左转，停在自行车旁」"] --> VLM
    CAM["机载 RGB 画面"] --> VLM
    subgraph SEM["语义接地层（可替换前端）"]
        VLM["VLM / VLA 前端<br/>ChatGPT · Gemini · Claude · NaVILA"] --> ACT["离散动作<br/>转 15°/30°/45° · 前进 25/50/75 cm"]
        ACT --> KGP["运动学目标投影器<br/>查 SDF：φ(p) ≥ 0.3 m？<br/>被占→邻域采样，按 C_goal 选点"]
    end
    subgraph PHY["物理接地层（安全笼子）"]
        SENSE["LiDAR / IMU / 腿运动学"] --> ODOM["里程计<br/>G1：FAST-LIVO2<br/>Vision 60：不变 EKF"]
        SENSE --> SDF["增量 2D SDF"]
        ODOM --> SDF
        KGP --> GOAL["目标位姿 x_goal"]
        GOAL --> JPS["可选 JPS 全局路径"]
        GOAL --> MPPI
        JPS --> MPPI
        SDF --> MPPI["Bézier-MPPI<br/>200 样本 × 10 迭代 · 50 步 × 0.05 s<br/>J = C_goal + C_ctl + C_safety"]
        MPPI --> CERT{"按代价排序逐条检查<br/>∀k,i：h_i(x_k+1) ≥ 0.95·h_i(x_k)？"}
        CERT -- 有一条通过 --> CMD["执行首个命令 (v_x, v_y, ω)"]
        CERT -- 全都不通过 --> BK["备份 κ(x)：零速停下"]
    end
    CMD --> LOCO["平台自带行走控制器<br/>G1 / Vision 60"]
    BK --> LOCO
    LOCO --> SENSE
    KGP -. 指令序列走完 .-> OBJ["开放词汇终点对齐<br/>Grounding-DINO + SAM2 → 3D 目标<br/>SEARCHING→APPROACHING→CLOSE，<0.5 m 停"]
    OBJ --> GOAL
</div>

---

## 🚶 具体实例

### 例 1：$\gamma=0.95$ 等于一个随间隙变化的「靠近速度上限」

屏障条件 $h _ {k+1}\ge0.95\,h_k$ 意味着每步最多减少 $0.05\,h_k$。步长 $\Delta t=0.05$ s，所以朝障碍的接近速度上限是

$$\dot h _ {\max}\approx\frac{(1-\gamma)h_k}{\Delta t}=\frac{0.05\,h_k}{0.05}=h_k\ (\text{m/s})$$

- 间隙 1.0 m 时：每步最多靠近 5 cm，约 1.0 m/s，基本不受限；
- 间隙 0.2 m 时：每步最多 1 cm，约 0.2 m/s；
- 间隙 0.05 m 时：约 0.05 m/s，几乎停住。

这就是图 3(b) 里 MPPI+dEBF 在窄道中「越靠近越慢」、而纯碰撞惩罚的 MPPI 一直保持高速直到贴边的原因（这里的数是我们按论文参数算的，论文没列）。

### 例 2：定理的下界有多松

若一直贴着条件走，$h_k\ge0.95^k h_0$。一个 2.5 s 视界（50 步）后 $0.95^{50}\approx0.077$：初始 1 m 的间隙最坏能降到 7.7 cm，但永远不会变负——下界只保证「不穿」，留多少余量由 $\gamma$ 和 $\varepsilon _ {\text{bar}}$ 调。

### 例 3：目标投影器

VLM 说「前进 75 cm」，正前方 75 cm 处 $\phi=0.12$ m < 0.3 m，不合格。投影器在这一点周围一圈采候选，例如左前方一点 $\phi=0.45$ m、离期望点 0.2 m、偏航 10°，按 $C _ {\text{goal}}$ 打分后它胜出，送给 MPPI 的就是这一点，而不是那个贴着桌子的点（候选数值为示意）。

---

## 📊 关键结果

**G1 4 m × 4 m 受控消融**（每个前端 5 次，dEBF 关 / 开）：

| 设置 | CR 关 → 开 | Object SR 关 → 开 | E2E SR 关 → 开 |
|---|---|---|---|
| 表 I：静态障碍、无 JPS（合计 20 次） | 80% → **0%** | 35% → 40% | 15% → **40%** |
| 表 II：有 JPS、行进中突然放障碍（合计 20 次） | 100% → **0%** | 55% → **70%** | 0% → **70%** |

- 40 次开启 dEBF 的受控试验一次碰撞都没有。
- 碰撞降低不等于语义变好：表 I 里 Claude 开启 dEBF 后 0 碰撞，但物体接近成功率 80% → 0%，作者明确说这一层不改语义推理。

**端到端（表 III）**：G1 在 6 m × 6 m 场地，25 条指令 × 3 次 = 每种配置 75 次；简单 / 复杂任务 CR 0.33 / 0.50 → **0.00 / 0.00**，SR 都保持 0.75。Vision 60 室内外：CR 0.67 / 0.91 → 0.20 / 0.08，SR 0.47 / 0.46 → 0.73 / 0.54；剩下的碰撞主要来自老款 VLP-16 看不到的细电线、桌沿、细杆和盲区。

**系统级（表 IV）**：G1 在 12 m × 12 m 场地，15 条长指令 × 4 个前端，整个笼子（MPPI + JPS + dEBF）关闭时 60/60 碰撞，开启时 0/60。

**终点对齐（表 V，Vision 60）**：平均终点误差 1.50 m（5 次）→ **0.29 m**（3 次）。

---

## 💡 核心贡献

1. **「笼子」式双层架构**：把 VLM / VLA 输出当提议，经目标投影器落到 SDF 的安全区域，语义前端与机器人平台都可替换。
2. **屏障认证的低维 MPPI**：Bézier 控制点降维 + dEBF 软代价引导采样 + 逐条硬认证 + 零速备份，只用 SDF 值查询，带前向不变性证明。
3. **跨平台实机验证**：同一规划接口跑在 G1 人形和 Vision 60 四足上，四种语义前端都显著降低碰撞。

---

## 🤖 对人形机器人领域的意义

- 给「大模型当大脑」的人形导航提供了一个很实际的分工：**语义交给大模型，安全交给有证明的几何层**，换模型不用重新验证安全。
- 屏障条件把「离障碍多远」直接变成「最多能以多快靠近」，比单纯碰撞惩罚更适合人形这种刹车距离不短、又要在人群和家具间走的平台。
- 但它把人形当成平面上的几个圆、速度命令完全由底层行走控制器跟踪，跟踪误差、跌倒风险都不在证明里。

---

## ⚠️ 局限与可改进点

- **证明只覆盖规划模型**：A1–A5 假设常速平面模型、SDF 完整准确；状态估计误差、延迟、行走控制器的跟踪误差都没进证明（论文第 VI 节自己承认），实机上「0 碰撞」是统计结果而非保证。
- **看不见的障碍无从认证**：Vision 60 剩余的碰撞都来自 SDF 里没有的细物体；动态障碍（行人）也不在模型里，作者列为后续工作。
- **样本量小**：受控实验每个前端 5 次；表 III 的 Vision 60 只写「可用的分类级比率」，没给试验次数；表 V 只有 5 / 3 个终点。
- **语义失败不归它管**：笼子不能纠正错误或不可达的语义目标，SR 主要取决于前端（G1 端到端 SR 开关都是 0.75）。
- **关键参数没公开**：Bézier 阶数、球的数量与半径、各项权重、$\varepsilon _ {\text{bar}}$ 都没给，也没放代码，复现要自己调。
- 表 IV 的「笼子关闭」同时关了 MPPI、JPS 和 dEBF，只能说明整套笼子的作用，不能单独归因于 dEBF（单独的作用看表 I、II）。

---

## 🎤 面试参考

- **dEBF 和碰撞惩罚有什么本质区别？** 碰撞惩罚只看单个预测状态，可以和目标进度做交换；dEBF 约束相邻两步屏障值的比例，限制的是「接近边界的速率」，间隙越小允许的靠近越少，相当于自带减速。
- **为什么 MPPI 的软代价不足以保证安全？** 加权平均后的轨迹不一定满足约束；本文用软代价只是让好样本更多，真正执行前对候选逐条做硬检查，并保留零速备份，才有递归可行性。
- **为什么用 Bézier 控制点？** 降维提高采样效率（200 个样本就够），并且命令天然平滑，适合足式机器人的速度接口。
- **这种安全证明在实机上的缺口在哪？** 模型误差（常速、平面、圆近似）、感知缺失（SDF 不完整）、估计与跟踪误差、动态障碍。

---

## 🔗 相关阅读

- [NaVILA：足式机器人视觉语言动作导航模型](../NaVILA_Legged_Robot_Vision-Language-Action_Model_for_Navigation/NaVILA_Legged_Robot_Vision-Language-Action_Model_for_Navigation.html)——本文测试的 VLA 前端之一
- [Contact-Aided Invariant EKF](../../09_State_Estimation/Contact-Aided_Invariant_EKF_for_Legged_Robots/Contact-Aided_Invariant_EKF_for_Legged_Robots.html)——Vision 60 用的里程计
- [Adaptive Traversal Tubes](../Adaptive_Traversal_Tubes_for_Posture-Aware_Navigation_of_Bipedal_Humanoids/Adaptive_Traversal_Tubes_for_Posture-Aware_Navigation_of_Bipedal_Humanoids.html)——同样把导航层输出成全向速度命令交给人形行走控制器
- 论文引用的相关方法：MPPI（Williams 2018 T-RO）、离散屏障函数（Agrawal & Sreenath 2017 RSS）、SafeVLA、VLSA/AEGIS、Splat-Nav
