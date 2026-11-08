---
layout: paper
paper_order: 17
title: "Walk Like This: Stylized Locomotion for Physics-Based Characters through Example-Driven Diffusion"
zhname: "Walk Like This：示例驱动扩散实现物理角色的风格化行走"
category: "物理动画"
arxiv: "2610.18147"
---

# Walk Like This: Stylized Locomotion for Physics-Based Characters through Example-Driven Diffusion
**给一段任意长度的风格示例（动捕或手机视频）加摇杆速度命令：风格编码器把示例压成一个单位长度的风格向量，自回归动作扩散模型按「过去动作 + 未来根部轨迹 + 风格」生成参考动作，RL 跟踪策略在物理里执行；训练时风格窗口和生成窗口取自同一段动作的不同位置，让风格和「往哪走」分开，推理时用注意力偏置加强风格、用速度反馈纠正漂移，没见过的风格也能走，G1 真机零样本部署**

> 📅 阅读日期: 2026-11-07
>
> 🏷️ 板块: 13 Physics-Based Animation · 风格化行走 · 自回归动作扩散 · 风格编码器 · RL 动作跟踪
>
> 🔁 推进轨: 模块轮转（12_Hardware_Design → **13_Physics-Based_Animation**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.18147](https://arxiv.org/abs/2610.18147) |
| HTML | [arXiv HTML](https://arxiv.org/html/2610.18147) |
| PDF | [下载](https://arxiv.org/pdf/2610.18147) |
| 项目页 / 视频 | 没有单独的项目页；补充视频在 [YouTube](https://www.youtube.com/watch?v=roFnS6N7nJ4) |
| 源码 | 截至 2026-11-07 未开源（论文与 arXiv 页面都没有代码链接），所以本笔记**没有源码运行时序图** |
| **发布时间** | 2026-10-13（arXiv v1） |
| 收录 | CoRL 2026 |

**作者**：Joshua Aurand、Agon Serifi、Sammy Christen、Ruben Grandia、Espen Knoop、Marco Hutter、Moritz Bächer。Disney Research Zürich、ETH Zürich。

**定位**：一个**实时、可交互**的风格化行走控制器：「怎么走」由一段示例决定，「往哪走」由摇杆决定，两者分开控制；底层仍是「运动学生成器 + RL 跟踪器」的两层结构。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| MDM | Motion Diffusion Model | 动作扩散模型，从噪声一步步去噪出动作 |
| CAMDM | Conditional Autoregressive MDM（Chen 等，SIGGRAPH 2024） | 本文的主要基线：自回归扩散 + 离散风格标签 |
| CFG | Classifier-Free Guidance | 无分类器引导，把有条件与去掉条件的两次预测加权 |
| FID | Fréchet Inception Distance | 生成分布与真实分布在特征空间的距离，越小越好 |
| MPJAE | Mean Per-Joint Angle Error | 平均关节角误差 |
| RSI | Reference State Initialization | 从参考动作的某一帧初始化角色 |
| PPO | Proximal Policy Optimization | 训练跟踪策略用的强化学习算法 |
| 100STYLE | — | 100 种行走风格的动捕数据集 |

---

## ❓ 这篇论文要解决什么问题？

物理角色 / 人形机器人已经能稳地走，但「**用某种风格走**」还不灵活：

| 已有路线 | 问题 |
|---|---|
| 风格迁移（把风格贴到内容动作上） | 离线、慢，不能实时用摇杆控制，也不管物理 |
| 隐式奖励（AMP 一类） | 一个策略只学一小类动作，训练完不能换新风格 |
| 「物理扩散」（扩散 + RL） | 生成能力强，但没有显式的风格控制 |
| CAMDM | 实时、可摇杆，但风格是离散标签，**没见过的风格做不了**，而且只是运动学 |

本文要的是表 1 的五个勾全占：实时、生成式、能用没见过的风格、物理可行、摇杆控制。

---

## 🔧 方法

### 1. 自回归动作扩散模型

在 CAMDM 的基础上，每次预测未来 $F$ 帧：

$$\mathbf{M}^{0} _ {\text{fut}}=\mathcal{M}(\mathbf{M}^{d} _ {\text{fut}},d;\ \mathbf{M} _ {\text{pst}},\mathbf{D} _ {\text{pst}},\mathbf{C} _ {\text{fut}},\mathbf{c} _ {\text{syl}})$$

| 条件 | 含义 | 和 CAMDM 的不同 |
|---|---|---|
| $\mathbf{M} _ {\text{pst}}$ | 过去 $P$ 帧动作（根位置 / 朝向、关节朝向、各 link 位置朝向，旋转用 6D） | — |
| $\mathbf{D} _ {\text{pst}}$ | 相邻帧的位置、旋转差 | **新加**：信息冗余，但让自回归时手臂摆向更连贯 |
| $\mathbf{C} _ {\text{fut}}$ | 未来根部 $x$–$y$ 轨迹 + **只给偏航角** | CAMDM 给完整旋转；只给偏航让横滚 / 俯仰完全由风格决定 |
| $\mathbf{c} _ {\text{syl}}$ | 风格向量 | CAMDM 是离散标签 |

网络是 4 层、4 头、宽 256 的 Transformer 编码器，每个时刻单独成一个 token；8 步扩散、余弦噪声表；训练时 15% 概率把过去动作置零。人形角色 30 fps、$F=20$、$P=10$；G1 50 fps、$F=30$、$P=15$。

### 2. 风格编码器 + 「两个窗口」采样（解耦的关键）

- 风格编码器 $\mathcal{E}$ 也是 Transformer 编码器，示例的每一帧一个 token，再加一个与输入无关的 **register token**，取它最后一层的输出当风格向量，并归一化到 $\|\mathbf{c} _ {\text{syl}}\|=1$（方便球面插值混合风格）；示例长度可变（训练时 1–5 s）。
- 训练时从一段动作里取 $P+F$ 帧当生成目标，**再从同一段动作里另取一个窗口**当风格示例。两个窗口里的「往哪走」（地面投影的根部轨迹，即内容）不同、风格相同，编码器只能把风格编进去。
- 消融：两个窗口取同一段时，生成的动作多样性只有 0.8°（关节角），模型塌缩成一直复读示例；分开取时 5.5°。

### 3. 推理时的两个小技巧

**注意力偏置**：自回归时模型太依赖过去的动作，常常忽略风格、卡在一种风格里。推理时在注意力分数上加偏置：

$$\text{attention}(\mathbf{Q},\mathbf{K},\mathbf{V};\mathbf{B})=\text{softmax}\!\left(\frac{\mathbf{Q}\mathbf{K}^{\top}}{\sqrt{D}}+\mathbf{B}\right)\mathbf{V}$$

所有查询对风格 token 加 $w _ {\text{syl}}=2.0$、对过去动作的 token 加 $w _ {\text{pst}}=-1.0$。不用重训，只算一次前向（CFG 要算两次）。

**速度纠偏**：摇杆命令积分出期望位置 / 偏航，和扩散模型自己生成的当前位置 / 偏航比较，每次调用扩散前修正命令：

$$\tilde{\mathbf{v}} _ {x,y}=\mathbf{v} _ {x,y}+k _ {\mathbf{p}}\mathbf{R} _ {\psi}(\psi^{\text{cur}})^{\top}(\mathbf{p}^{\text{des}} _ {x,y}-\mathbf{p}^{\text{cur}} _ {x,y}),\qquad \tilde{v} _ {\psi}=v _ {\psi}+k _ {\psi}(\psi^{\text{des}}-\psi^{\text{cur}})$$

增益取 $k=1/(F\Delta t)$，即在一次预测的时长里把误差补完；期望位置最多离当前 0.5 m、偏航最多 0.5 rad；偏航误差用过去 $P$ 帧的平均，免得受步态周期里根部摆动的影响。

**平滑拼接**：每 $F-K$ 帧就调用一次扩散（$K=3$），重叠的 $K$ 帧按 $i/(K+1)$ 线性 / 球面插值混合；摇杆命令变化时提前触发（人形 10 帧、G1 15 帧）。

### 4. RL 跟踪策略

- 训练数据**不是原始动捕**，而是扩散模型离线自回归生成的动作：训练集每段动作生成 10 分钟（每 1.5–4.5 s 换一次速度命令、每 5 s 换一次风格窗口），另加 10 小时跨风格切换的动作。
- 目标 $\mathbf{g}_t$：下一帧参考状态（在上一帧的朝向坐标系里）+ 参考根部线 / 角速度 + 纠偏后的摇杆命令；本体感受：关节角 / 速度、根部角速度、重力投影、前两步动作；输出 PD 目标。
- 奖励分三组：跟踪（根部、上 / 下身关节、踝、各 link，指数核）、摇杆（速度、方向、「卡住」惩罚 −10）、正则（动作变化率、力矩、限位、触地冲击、两种滑脚、摆动腿离地 2 cm）。摇杆奖励让策略在参考有滑脚等瑕疵时**不必死跟**。
- PPO，4096 个环境；RSI 时 20% 概率从别的动作取初始状态；±2 cm 的粗糙地面、推扰课程、G1 加观测噪声与物理随机化。
- **开环部署**：扩散模型只看自己过去的预测，不看机器人真实状态，所以可以用预先生成的数据训练，扰动也不会污染生成流。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DATA["📦 无标签动作数据"]
        D1["100STYLE（+ AMASS）<br/>G1 版用 ReActor 重定向"]
    end

    subgraph TRAIN["🎓 联合训练：扩散模型 + 风格编码器"]
        T1["同一段动作取两个窗口"]
        T2["窗口 A：过去 P 帧 + 未来 F 帧<br/>（生成目标，内容 = 根部轨迹）"]
        T3["窗口 B：1–5 s 风格示例"]
        T4["风格编码器 E<br/>register token → 单位向量 c_syl"]
        T5["自回归扩散 M<br/>条件：过去动作 + 帧差 + 未来根轨迹(只含偏航) + c_syl"]
        T1 --> T2 & T3
        T3 --> T4 --> T5
        T2 --> T5
    end

    subgraph INF["🎮 推理（实时）"]
        I1["摇杆速度命令"]
        I2["速度纠偏<br/>k = 1/(FΔt)，误差 ≤ 0.5 m / 0.5 rad"]
        I3["风格示例（动捕 / 视频姿态估计）<br/>编码后缓存"]
        I4["扩散生成未来 F 帧<br/>注意力偏置：风格 +2、过去 −1"]
        I5["K=3 帧重叠混合<br/>转动关节用摆动—扭转分解投影"]
        I1 --> I2 --> I4
        I3 --> I4 --> I5
        I5 -->|"开环：只看自己的预测"| I4
    end

    subgraph RL["🤖 RL 跟踪策略"]
        R1["离线生成训练数据<br/>每段 10 min + 跨风格 10 h"]
        R2["PPO：跟踪 + 摇杆 + 正则奖励<br/>粗糙地面、推扰、域随机化"]
        R3["物理人形 / G1 真机<br/>Jetson Thor 每步约 11 ms"]
        R1 --> R2 --> R3
    end

    DATA --> TRAIN
    TRAIN --> INF
    TRAIN -.->|"随机命令与风格滚动生成"| R1
    I5 -->|"参考动作 + 纠偏命令"| R3

    style DATA fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style TRAIN fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style INF fill:#f3e8ff,stroke:#8e44ad,color:#3d0f5a
    style RL fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
</div>

---

## 🚶 具体实例

### 例 1：注意力偏置把多少注意力拉回风格

设某个查询对三个 token 的原始分数（$\mathbf{Q}\mathbf{K}^{\top}/\sqrt{D}$）是：风格 0、两个过去动作各 1（**这是我们编的玩具数**）。

| | 风格 | 过去 1 | 过去 2 | 风格得到的权重 |
|---|---|---|---|---|
| 不加偏置 | 0 | 1 | 1 | $1/(1+2e) \approx 0.155$ |
| 加偏置（+2 / −1 / −1） | 2 | 0 | 0 | $e^2/(e^2+2) \approx 0.787$ |

softmax 后权重仍然加起来等于 1、仍是对同一组 token 的分布，这也是作者猜测它比 CFG 更接近训练分布的原因。

### 例 2：速度纠偏的增益

人形角色 30 fps、$F=20$：一次预测覆盖 $20/30 \approx 0.667$ s，$k = 1/0.667 = 1.5\ \text{s}^{-1}$；G1 50 fps、$F=30$：$0.6$ s，$k \approx 1.67\ \text{s}^{-1}$。

摇杆给 0.5 m/s 向前，角色已经落后期望位置 0.2 m：修正后命令 $0.5 + 1.5 \times 0.2 = 0.8$ m/s，正好在下一次预测的 0.667 s 里把 0.2 m 追回来（$0.3 \times 0.667 = 0.2$）。误差最多被截到 0.5 m，所以修正量最多 $1.5 \times 0.5 = 0.75$ m/s。

### 例 3：多久调用一次扩散

$K=3$ 帧重叠：人形每 $20-3=17$ 帧（约 0.57 s）调用一次，G1 每 $30-3=27$ 帧（0.54 s）一次；重叠的三帧里新预测的权重依次是 $1/4,\,2/4,\,3/4$。

---

## 📊 实验结果

### 扩散模型（100STYLE，表 2）

| 方法 | FID ↓ | 风格准确率 ↑ | 滑脚 ↓ (cm/帧) | 位置误差 ↓ (cm/帧) | 偏航误差 ↓ (°/帧) |
|---|---|---|---|---|---|
| CAMDM | 0.27 | 86.0% | 0.71 | 0.70 | 0.60 |
| Ours | 0.22 | 88.1% | 0.66 | 0.70 | 0.65 |
| CAMDM + 偏置 | 0.14 | 93.5% | 0.90 | 0.69 | 0.58 |
| Ours + CFG | 0.17 | 91.5% | 0.98 | 0.71 | 0.68 |
| **Ours + 偏置** | **0.07** | **96.3%** | 0.93 | 0.71 | 0.67 |
| Ours，没见过的 10 种风格 | 0.34 | 93.0% | 0.90 | 0.71 | 0.69 |

偏置提升风格、代价是滑脚变多（压低过去动作的权重，脚步更难连贯），由后面的 RL 策略来收拾。

### 风格切换与速度跟随

| | 切换成功率 | 推理耗时 |
|---|---|---|
| 不加 | 83.8% | 7.69 ms |
| CFG | 98.7% | 14.30 ms |
| 偏置 | 98.6% | 8.50 ms |

速度纠偏：每米漂移 0.117 → 0.003，平均速度误差 0.271 → 0.075 m/s（方形、圆、8 字与随机命令）。

### 风格向量分得开吗

线性判别分析从风格向量认出风格 95%；同一风格不同片段的差异只占总方差 19%；只用风格向量回归内容（根部轨迹）$R^2=0.07$。用开源姿态估计从手机视频抽 120 帧当示例，不做额外处理也能用（包括跳着走）。

### RL 跟踪（表 3）

| 训练数据 | 回路 | 推扰 600 N | FID ↓ | 风格准确率 ↑ | MPJAE ↓ | 每分钟摔倒 ↓ |
|---|---|---|---|---|---|---|
| 原始动捕 | 开环 | ✗ | 0.16 | 92.0% | 5.2° | 1.104 |
| 生成数据 | 开环 | ✗ | 0.35 | 85.1% | 8.3° | **0.001** |
| 生成数据 | 闭环 | ✗ | 0.45 | 79.6% | 7.8° | 0.001 |
| 生成数据 | 开环 | ✓ | 0.84 | 62.9% | 16.0° | **3.812** |
| 生成数据 | 闭环 | ✓ | 0.95 | 58.2% | 15.9° | 4.431 |

用扩散生成的数据训，策略学会「纠正」滑脚等瑕疵，摔倒几乎消失；开环比闭环风格更好、受扰时也更稳。插值出来的风格 MPJAE 7.9°、0 次摔倒。

### G1 真机

Unitree G1（1.32 m、35 kg、29 自由度），零样本部署；约 4 小时演示无摔倒。扩散模型在机载 Jetson Thor 上每步约 11 ms、命令到动作约 17 ms（RTX 5090 上 8 / 12 ms）。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| 接口 | 「一段示例 + 摇杆」比「风格标签」灵活得多，动画师或一段手机视频就能给机器人一个新步态 |
| 解耦 | 只靠「同一段动作取两个窗口」的采样，就在无标签数据上把风格和行走路线分开，不需要风格标注 |
| 推理时调参 | 注意力偏置是一个几乎免费的「风格强度旋钮」，比 CFG 快近一倍 |
| 两层结构 | 再次说明：跟踪器应该在**生成器的输出**上训练，而不是原始动捕，才能吸收生成器的瑕疵 |

---

## ⚠️ 局限

- 生成的动作和速度命令可能对不上，跟踪策略会多迈几步来保持平衡；
- 风格要和移动方向无关（甩手、宽步距）才好用；太空步、侧手翻这类和方向绑定的风格，需要配合对应的速度命令；
- 「边走边顺时针转」这种主要由根部轨迹定义的风格，和摇杆控制的是同一个量，冲突时以摇杆为准；
- 风格是隐式学的，不能只取示例的上半身或下半身；
- 只做平地行走，不涉及和物体 / 地形的精确交互（所以开环部署才可行）；
- 未开源。

---

## 🎤 面试参考

**Q：没有风格标签，怎么让编码器只学风格、不学路线？**
A：同一段动作里取两个不同窗口，一个当生成目标、一个当风格示例。两个窗口风格相同、根部轨迹不同，而生成所需的路线已经由未来根部轨迹条件给出，编码器只有编进风格才有用。如果两个窗口相同，模型会直接复读示例（多样性 0.8° vs 5.5°）。

**Q：注意力偏置和 CFG 有什么区别？**
A：CFG 要做有条件和去掉条件两次前向再线性外插，结果可能落到训练分布之外，耗时翻倍；注意力偏置只在 softmax 前给风格 token 加分、给过去动作减分，注意力仍是同一组 token 上的归一化分布，一次前向就行。本文里偏置在所有指标上都优于 CFG，切换成功率相近（98.6% vs 98.7%），耗时 8.50 vs 14.30 ms。

**Q：为什么用开环部署？**
A：扩散模型只条件于自己的过去预测：生成流不受仿真 / 真机状态的分布偏移污染，风格更好；受扰时恢复动作不会进到扩散的条件里，策略始终有干净的目标；也可以把扩散的输出预先生成成数据集来训练 RL。代价是生成器不感知真实状态，所以只适合不需要精确交互的行走。

---

## 🔗 相关阅读 / 类似方向

- [AMP](../../01_Foundational_RL/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control.html)：隐式奖励学风格的代表
- [SMP](../../01_Foundational_RL/SMP_Reusable_Score-Matching_Motion_Priors/SMP_Reusable_Score-Matching_Motion_Priors.html)：用扩散模型当可复用的风格先验
- [PhysibleMDM](../PhysibleMDM__Inference-Time_Physical_Feasibility_Constraints_on_Motion_Diffusion_Models/PhysibleMDM__Inference-Time_Physical_Feasibility_Constraints_on_Motion_Diffusion_Models.html)：同样是推理时调整动作扩散模型，但目标是物理可行（同模块）
- [RobotDancing](../RobotDancing__Residual-Action_RL_Enables_Robust_Long-Horizon_Motion_Tracking/RobotDancing__Residual-Action_RL_Enables_Robust_Long-Horizon_Motion_Tracking.html)：长时程动作跟踪（同模块）
- CAMDM（Taming Diffusion Probabilistic Models for Character Control，SIGGRAPH 2024）：本文的基线与骨架
- Design and Control of a Bipedal Robotic Character（Disney，RSS 2024）：同团队手工设计风格步态的前作

---

> 备注：本笔记依据 arXiv v1 的 HTML 版整理，数字以论文为准。论文没有公开源码，故只给出整体流程 mermaid、没有源码运行时序图；「🚶 具体实例」例 1 的注意力分数是我们编的玩具数，例 2、3 用的是论文附录的 $F$、$K$、帧率。
