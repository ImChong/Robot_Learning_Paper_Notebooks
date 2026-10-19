---
layout: paper
title: "Push the Limit: Learning High-Speed Sprinting and Aggressive Cornering on a Full-Scale Humanoid"
zhname: "Push the Limit：全尺寸人形机器人的高速冲刺与激进过弯"
category: "Locomotion"
arxiv: "2610.14840"
---

# Push the Limit: Learning High-Speed Sprinting and Aggressive Cornering on a Full-Scale Humanoid
**让 1.8 m 的全尺寸人形跑出 7 m/s 以上、还能带 25° 内倾高速过弯：因果注意力历史编码器读高频步态反馈，航向方向奖励替代被步态振荡污染的偏航角速度奖励，按技能分开的 Multi-AMP 判别器防止原地转向塌缩**

> 📅 总结日期: 2026-10-19
>
> 🏷️ 板块: 05 Locomotion · 高速奔跑 · 过弯 · 对抗运动先验（Multi-AMP）· 注意力历史编码器 · Sim-to-Real
>
> 🔁 推进轨: 模块轮转（04_Loco-Manipulation_and_WBC → **05_Locomotion**）· 上游 awesome-humanoid-robot-learning Locomotion 章节中尚无笔记的最新论文（2026.10，PROGRESS #1125）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.14840](https://arxiv.org/abs/2610.14840) |
| HTML | [arxiv.org/html/2610.14840v1](https://arxiv.org/html/2610.14840v1) |
| PDF | [下载 v1](https://arxiv.org/pdf/2610.14840v1) |
| **发布时间** | 2026-10-10（arXiv v1） |
| 会议 | CoRL 2026（据上游 awesome-humanoid-robot-learning 的标注） |
| 视频 | [YouTube：全部测试协议与消融对比](https://youtu.be/YWf62XkiApc) |
| 源码 | ⏳ 论文未给出代码仓库或项目页，截至 2026-10-19 未检索到公开实现（故本笔记没有源码运行时序图） |

**作者**：Huaxing Huang\*、Ruidong Li\*、Jinchao Han、Ziyang Dong、Wenhao Cui（\* 共同一作）

**机构**：松延动力 Noetix Robotics · 清华大学

---

## 🎯 一句话总结

人形机器人直线冲刺已经很快，但跑起来不像人、也没人展示过高速转弯；用 AMP 做出来的步态像人，却只在中低速成立。这篇论文把速度推到 4 m/s 以上后发现三处同时失效——**扁平历史 MLP 读不懂高频的触地振荡、偏航角速度奖励和步态本身的扭转打架、一个共用判别器分不清当前该做哪种技能**——各用一个针对性设计修掉：因果多头注意力历史编码器、只看低频速度方向的航向奖励、按技能分开的 Multi-AMP 判别器。结果是 1.8 m、17 自由度的人形零样本上真机，100 m 计时跑出 **7.14 m/s**，并能在 5.5 m/s 下以超过 25° 的躯干内倾过弯。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| AMP | Adversarial Motion Priors | 用判别器给「像不像参考动作」打分作为风格奖励（Peng et al. 2021） |
| Multi-AMP | Multiple Adversarial Motion Priors | 每种风格一个判别器（Vollenweider et al. 2023，原用于四足） |
| MHA | Multi-Head Attention | 本文指单层两头的因果 Transformer 历史编码器 |
| HIM | Hybrid Internal Model | 用学到的估计器从历史里推隐变量；本文以 Huang et al. 2025 的 HIM+MLP 作外部基线 |
| WGAN | Wasserstein GAN | 判别器用 Wasserstein 距离而非最小二乘损失 |
| DTW | Dynamic Time Warping | 把 rollout 与参考动作对齐后算平均逐帧距离，衡量风格质量（沿用 WASABI 的测法） |
| RSI | Reference State Initialization | 20% 的回合从参考动作的状态开始，保证一开始就见到高速状态 |
| GMR | General Motion Retargeting | 把人体动捕重定向到机器人上的工具 |

---

## ❓ 论文要解决什么问题？

把一个学到的双足控制器推到 4 m/s 以上，会同时暴露走路速度下看不见的三个问题：

1. **状态估计（历史编码）**：高速时左右脚交替撞地，本体感受信号被高频振荡占满；把 $T$ 帧历史拍平喂进 MLP，抽不出相对相位、触地时机、加速度轮廓这些时间结构。
2. **转向奖励**：跑步时躯干必须左右扭转来平衡摆腿，瞬时偏航角速度 $\omega_z$ 成了「真实转向 + 步态振荡」的混合信号。跟踪它的奖励要么逼策略减速让信号变干净，要么让它干脆放弃转向。
3. **多技能风格**：站立、原地转、走、跑共用一个判别器时，判别器只问「像不像任何一段参考动作」，不问「像不像现在要求的那种技能」。原地转向在任务奖励里和站着几乎没区别，于是塌缩成站着不动。

---

## 🔧 方法拆解

**① 问题设定：一个策略、速度 + 技能命令**
- 50 Hz 控制，观测 $\mathbf{o}_t=(\mathbf{c}_t,\mathbf{p}_t)$：命令 $\mathbf{c}_t\in\mathbb{R}^7$ = 期望 $(v_x, v_y, \omega_z)$ + 4 维 one-hot 技能标签（站立 / 原地转 / 走 / 跑）；本体 $\mathbf{p}_t\in\mathbb{R}^{56}$ = 机身角速度 3 + roll/pitch 2 + 关节角 17 + 关节速度 17 + 上一步动作 17。
- 技能标签由命令自动生成：$v_x^{\text{cmd}}\ge 2.0$ m/s 为跑，线速度接近 0 但 $\|\omega_z^{\text{cmd}} \mid $ 明显时为原地转，命令都接近 0 为站，其余为走。
- 动作是 17 个关节目标角，PD 出力矩；**不用任何状态估计器**，机身线速度只给 critic。
- 总奖励 $r_t=\lambda(r^{\text{task}}_t+r^{\text{reg}}_t)+(1-\lambda)\,r^{\text{style}}_t$，$\lambda=0.8$，PPO + GAE。

**② 因果多头注意力 actor（解决问题 1）**
- 沿用 Ma et al.（RGMT）的因果自注意力历史编码器，但命令只有 7 维，把交叉注意力换成 MLP 融合。
- $T=10$ 帧：每帧 56 维本体 → MLP 嵌成 128 维 token + 正弦位置编码 → 单层、两头、$d=128$ 的 pre-norm 因果 Transformer → LayerNorm → 时间上平均池化得到动态摘要；与命令嵌入拼接、两层 MLP 融合成 128 维 $\mathbf{u}_t$；最后把当前观测（63 维）与 $\mathbf{u}_t$ 拼成 191 维进 $[512,256,128]$ 的 actor MLP 输出 17 维动作均值。
- actor 总参数 471,970，比吃同样 630 维拍平历史的 MLP（489,506）**少 3.6%**——提升来自时间结构的归纳偏置，不是容量。

**③ 航向方向奖励（解决问题 2）**
- 每个训练回合在初始朝向附近采样目标航向 $\psi^\star$，奖励**平面速度方向**与目标航向对齐，而不是瞬时偏航角速度：

$$
r^{\text{head}}_t=\exp\!\Big(-\frac{e_{\text{align}}}{\sigma^2}\Big)-\beta\,e_{\text{align}},\qquad e_{\text{align}}=1-\hat{\mathbf{v}}_t\cdot\hat{\mathbf{n}}_t
$$

- 直觉：平移速度是净力对时间的积分除以质量，一个步态周期里来回的力大多抵消，只剩低频的转向趋势；瞬时 $\omega_z$ 则把每一下躯干扭动都记进去。
- $-\beta e _ {\text{align}}$ 是指数核饱和区外的 L1 梯度，训练初期对得很偏时仍有信号。
- 只在 $v^{\text{cmd}}>v _ {\min}=2.0$ m/s 时启用，低速退回普通偏航角速度奖励；训练时 $\omega_z^{\text{cmd}}=\mathrm{clip}(k_\psi(\psi^\star-\psi_t),-1,1)$（$k_\psi=0.5$），让命令与航向目标一致。
- 参数：$\sigma=0.7$，$\beta=0.1$，奖励权重 3.0。

**④ 按技能分开的 Multi-AMP 判别器（解决问题 3）**
- $K=4$ 个判别器，各自有参考数据集和策略回放池；当前技能 $i$ 产生的转移**只更新、只由** $D_i$ 打分，风格奖励于是变成 $D(\boldsymbol\phi\mid\mathbf g)$。
- 判别器用 Wasserstein 损失，并针对高速双足加了三处稳定化：
  - $\tanh(\alpha x)$ 限幅（$\alpha=0.3$），防止判别器分数无界导致梯度爆炸；
  - 非负映射 $\rho(x)=\exp(\tanh(\alpha x))-e^{-1}$，取值在 $(0, 2.35)$：没有它，策略会学会**提前终止回合**来躲负的风格惩罚；
  - 对专家样本和策略样本都加梯度惩罚（$R_1+R_2$，指数 $p=6$、系数 5），让整个动作流形上的决策边界都平滑。
- 风格奖励 $r^{\text{style}}_t=w_s\,\rho(D _ {i(t)}(\boldsymbol\phi_t))$，$w_s=0.5$；判别器输入是 4 帧 × 96 维（关节角 17、关键点位置 54、机身线速度 3、角速度 3、关节速度 17、足底接触 2）。
- 参考动作：人体动捕经 GMR 重定向，四类共 13,400 帧（268 s，50 Hz），训练时四种技能等概率采样。

**⑤ 训练与部署**
- IsaacLab，物理 200 Hz、降采样 4 → 50 Hz；8 张 RTX 4090 × 4096 环境，回合 20 s，10,000 次迭代约 15 h；速度课程训练到 5.5 m/s。
- 域随机化：摩擦 0.3–1.0、机身质量 ±5 kg、质心 ±5 cm、刚度 / 阻尼 ×0.8–1.2、关节摩擦与 armature ×0.7–1.5、每 5–10 s 推一下（XY ±1.0 m/s）；`DelayedImplicitActuator` 随机 0–20 ms 执行延迟；地形是 50% 粗糙 + 20% 波浪 + 30% 缓坡的课程。
- 导出 ONNX，零样本在 Gazebo（同一个 ROS 控制器）和真机上 50 Hz 运行。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    CMD["命令 (v_x, v_y, ω_z)"] --> SKILL{"自动生成技能标签<br/>v_x ≥ 2 m/s → 跑<br/>只有 ω_z → 原地转<br/>全为 0 → 站，其余 → 走"}
    CMD --> C7["c_t ∈ R⁷ = 速度命令 + one-hot 技能"]
    SKILL --> C7

    subgraph ACTOR["🧠 MHA actor（471,970 参数，比 MLP 少 3.6%）"]
        HIST["10 帧本体历史 p ∈ R⁵⁶<br/>角速度·roll/pitch·关节角/速度·上一步动作"]
        TOK["MLP 嵌入 128 维 token<br/>+ 正弦位置编码"]
        TF["单层 2 头因果 Transformer<br/>→ LayerNorm → 时间平均池化"]
        FUSE["与命令嵌入拼接<br/>MLP 融合 → u_t ∈ R¹²⁸"]
        HEAD["[o_t, u_t] 191 维 → 512-256-128 → 17 维关节目标"]
        HIST --> TOK --> TF --> FUSE --> HEAD
    end
    C7 --> FUSE

    HEAD --> PD["PD 控制器 → 17 关节力矩"] --> SIM["IsaacLab 200 Hz<br/>域随机化 + 地形课程 + 推力"]

    subgraph REW["🎯 奖励 r = 0.8(task + reg) + 0.2·style"]
        SW{"v_cmd > 2 m/s ?"}
        HD["航向方向奖励<br/>速度方向 · 目标航向<br/>（低频，不压制步态扭转）"]
        YR["偏航角速度奖励<br/>（低速时使用）"]
        SW -->|是| HD
        SW -->|否| YR
        subgraph MAMP["Multi-AMP：每种技能一个 WGAN 判别器"]
            D1["D_stand"]
            D2["D_turn"]
            D3["D_walk"]
            D4["D_run"]
        end
        ROUTE["转移按命令技能路由<br/>只更新、只由 D_i 打分<br/>ρ = exp(tanh(0.3x)) − 1/e ≥ 0"]
        ROUTE --> MAMP
    end

    SIM --> SW
    SIM --> ROUTE
    REF["GMR 重定向的人体动捕<br/>站 / 转 / 走 / 跑，共 268 s"] --> MAMP
    REW --> PPO["PPO + GAE<br/>8×4090，10k 迭代 ≈ 15 h"]
    PPO --> ACTOR

    PPO --> ONNX["导出 ONNX，零样本部署"]
    ONNX --> GZ["Gazebo（同一 ROS 控制器）<br/>6.5 m/s 阶跃 · 过弯 · 消融"]
    ONNX --> REAL["真机 1.8 m / 17 DoF<br/>100 m 计时 7.14 m/s<br/>5.5 m/s 过弯内倾 > 25°"]

    style ACTOR fill:#e8f4fd,stroke:#1f78b4
    style REW fill:#fff7e0,stroke:#d4a017
    style MAMP fill:#fdecef,stroke:#c0392b
</div>

---

## 🚶 具体实例：为什么偏航角速度奖励在冲刺时帮倒忙？

用论文附录的参数 $\sigma=0.7$、$\beta=0.1$，把两个奖励放在同样的尺度下比较。

**航向方向奖励只看速度方向偏了多少度**（$e _ {\text{align}}=1-\cos\theta$）：

| 速度方向偏差 θ | $e _ {\text{align}}$ | $r^{\text{head}}$ |
|---|---|---|
| 0° | 0 | 1.000 |
| 5° | 0.0038 | 0.992 |
| 15° | 0.0341 | 0.929 |
| 30° | 0.134 | 0.747 |
| 90° | 1 | 0.030 |
| 180° | 2 | −0.183 |

步态让躯干左右扭，但只要质心速度方向对，奖励几乎不受影响；方向偏 90° 以后指数项已近饱和，靠 $-\beta e$ 那一小段 L1 继续给梯度。

**偏航角速度奖励在「转得完全正确」时也会被振荡扣分**：假设平均转向正好等于命令，但躯干在其上叠加了一个幅度为 $A$ 的正弦扭转（$A$ 的取值是我们为了示意假设的，论文没给具体幅度），一个周期内的平均奖励是：

| 步态扭转幅度 $A$（rad/s） | 平均 $r^{\omega}$ |
|---|---|
| 0（走路时几乎没有） | 1.000 |
| 0.3 | 0.895 |
| 0.6 | 0.678 |
| 1.0 | 0.397 |

所以在偏航角速度奖励下，策略「提高奖励」最省事的办法是**把步态扭转压下去**——也就是减速或者把躯干绷直，这正是 E2 里偏航角速度策略「几乎保持直立、转弯半径 146.7 m」的样子。

**过弯时的内倾角差不多就是物理要求**（下面是我们自己的核对，不是论文的计算）：命令 $(6.5, 0, 0.35)$ 对应理论半径 $6.5/0.35=18.6$ m、向心加速度 $6.5\times0.35=2.28$ m/s²，平衡所需的内倾角 $\arctan(2.28/9.81)\approx 13.1°$，与论文测到的 13° 一致。若反过来按 5.5 m/s、25° 内倾估算，向心加速度约 4.57 m/s²，对应偏航角速度约 0.83 rad/s、半径约 6.6 m——论文只说「更大的偏航角速度命令」，没有给出具体值。

---

## 📊 关键结果

**主结果**
- Gazebo：6.5 m/s 阶跃命令稳态误差约 0.1 m/s（训练课程只到 5.5 m/s，外推 18%）；$(6.5, 0, 0.35)$ 下转弯半径 24.2 m、内倾 13°；5.5 m/s 加大偏航命令时最大内倾 > 25°（仿真与真机都观察到）。
- 真机 100 m 计时：7.0 m/s 命令下 **14 s 跑完，平均 7.14 m/s**（用的是减重到 60 kg 的同款执行器 / 运动学版本，常规实验配置为 70 kg）；同一框架在另一台 1.36 m / 40 kg / 23 自由度人形上跑出 22 s（4.55 m/s），两台都在顶速时碰到力矩上限。

**E1 历史编码器（Gazebo）**

| 编码器 | 6.5 m/s 阶跃 | $(6.5, 0, 0.35)$ 过弯 |
|---|---|---|
| **MHA（本文）** | ✅ 跟上 | 半径 **24.2 m**，明显内倾 |
| LSTM | ✅ 跟上 | 半径约 1.8 倍 |
| GRU | ✅ 跟上 | 半径约 2.2 倍 |
| HIM + MLP（外部基线） | ✅ 跟上 | **摔倒** |
| 拍平历史 MLP | ❌ 约 6.0 m/s 饱和 | — |

- 直线高速主要靠「有结构的时间编码」本身，不挑具体架构；历史长度在 5–20 帧之间扫一遍影响很小。差距出在激进过弯的动态稳定性上。

**E2 航向方向奖励 vs 偏航角速度奖励**（15 圈，理论半径 18.6 m）

| 指标 | 航向方向（本文） | 偏航角速度 |
|---|---|---|
| 拟合转弯半径 | **24.2 m（+30%）** | 146.7 m（+690%） |
| 每圈圆心漂移 | **1.7 ± 0.9 m** | 8.2 ± 2.7 m |
| 躯干内倾 | > 13° | 几乎直立 |

**E3 按技能判别器 vs 共用判别器**（Isaac Lab，每种技能 48 条 rollout，DTW ↓）

| | 站 | 原地转 | 走 | 跑 |
|---|---|---|---|---|
| **Multi-AMP** | **0.23** | **2.62** | **2.72** | **4.64** |
| 共用判别器 | 0.25 | 5.66 | 3.79 | 5.67 |
| 站着不动（对照） | – | 5.76 | 6.95 | 14.34 |

- 共用判别器下原地转向塌缩：命令 0.6 rad/s 只转出 0.08 rad/s（Multi-AMP 0.59），97% 时间双脚着地（Multi-AMP 32%，参考动作 33%），每秒抬脚 0.25 次（Multi-AMP 2.4）；转向 DTW 5.66 ≈ 站着不动的 5.76。
- 原因分析：共用判别器给参考里的「站」和「转」打分差不多（1.83 vs 1.56），而 $D _ {\text{turn}}$ 能把两者拉开 2.8 倍；正确转向相对不转的每步奖励优势，共用判别器下只有偏航跟踪给的约 0.03，$D _ {\text{turn}}$ 把它提到 0.10–0.12，才足以学出原地转向需要的踏步。平移技能不塌缩，是因为速度跟踪项本身就会给站着不动每步扣约 0.08。

**鲁棒性**：仿真里以训练最大幅度推一下（后向 −1.0 / 侧向 +1.0 m/s，各 50 次），1.0 和 5.5 m/s 下全部恢复，6.5 m/s 下只恢复 56%（后向）/ 72%（侧向）——跑得越接近力矩极限，抗扰余量越小。

---

## 💡 核心贡献

1. 指出高速双足的三种耦合失效：高频本体反馈下的历史编码、被步态振荡污染的转向奖励、多技能共用判别器的模式塌缩；
2. 针对性的三件套：因果 MHA 历史编码器（参数更少）、只在高速启用的航向方向奖励、按技能路由的 WGAN Multi-AMP 判别器（tanh 限幅 + 非负映射 + 双侧梯度惩罚）；
3. 全尺寸人形零样本上真机：100 m 计时 7.14 m/s，高速过弯自然出现 25° 以上内倾；
4. 标准化的阶跃 / 转弯测试协议与逐组件消融，并把顶速瓶颈定位到关节力矩（髋、膝俯仰约 99%，踝约 90%）。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| 奖励设计 | 「监督哪个频段的信号」值得单独考虑：被步态调制的瞬时量（角速度）可以换成积分后的低频量（速度方向） |
| 风格先验 | 多技能 AMP 里判别器必须以技能为条件，否则任务奖励区分度弱的技能（原地转）会塌缩 |
| 历史编码 | 高频触地场景下注意力 / RNN 明显优于拍平 MLP，且注意力在激进机动时最稳 |
| 硬件边界 | 顶速已被关节力矩卡住，再快需要更强执行器、能耗约束与新的高速参考动作 |
| 局限 | 只有本体感受，地形只覆盖轻度起伏；只在两台运动学相近的人形上验证；未开源 |

---

## 🎤 面试参考

**Q：为什么高速时不直接跟踪偏航角速度，而要换成航向方向？**
A：跑步时躯干必须随摆腿左右扭转，瞬时 $\omega_z$ 里混着很大的步态振荡分量。即使平均转向完全正确，这部分振荡也会持续扣分，策略最省事的应对是减速或压住躯干扭转，转向能力反而丢了。速度方向是净力的积分，步态内的往返力大多抵消，只剩低频的转弯趋势，所以监督它不会和自然步态打架。低速时步态扭转小，仍可用 $\omega_z$。

**Q：Multi-AMP 和在一个判别器输入里加技能标签有什么区别？**
A：论文的做法是按技能把转移路由到各自的判别器，每个判别器只见自己技能的参考和回放，风格奖励天然就是 $D(\boldsymbol\phi\mid\mathbf g)$。共用判别器只判「像不像任何参考」，站和转都能拿高分，原地转向就没有足够的激励。在单判别器里拼技能标签理论上也能做条件化，但论文没比较这一种。

**Q：为什么要把风格奖励映射成非负？**
A：Wasserstein 判别器的分数可正可负，若风格奖励为负，策略会发现「早点摔倒结束回合」能少吃惩罚。$\rho(x)=\exp(\tanh(\alpha x))-e^{-1}$ 把它压到 $(0, 2.35)$，活着总比死了好。

**Q：MHA 参数更少却更好，说明了什么？**
A：说明收益来自时间结构的归纳偏置——注意力能在一个步态周期里挑出最有信息量的几帧（如触地瞬间），而不是靠更大的网络。但直线跟速上 GRU / LSTM / HIM 也都行，MHA 的优势主要体现在高速过弯的稳定性。

---

## 🔗 相关阅读

- [AMP: Adversarial Motion Priors（本仓库已有笔记）](../../01_Foundational_RL/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control.html)：风格奖励的出发点
- [Robust and Generalized Humanoid Motion Tracking（本仓库已有笔记）](../../04_Loco-Manipulation_and_WBC/Robust_and_Generalized_Humanoid_Motion_Tracking/Robust_and_Generalized_Humanoid_Motion_Tracking.html)：本文沿用的因果自注意力历史编码器来源（Ma et al.）
- [Real-World Humanoid Locomotion with RL（本仓库已有笔记）](../../03_High_Impact_Selection/Real-World_Humanoid_Locomotion_with_RL/Real-World_Humanoid_Locomotion_with_RL.html)：用因果 Transformer 做人形行走的先例
- [Retargeting Matters / GMR（本仓库已有笔记）](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html)：参考动作的重定向工具
- [Advanced Skills through Multiple Adversarial Motion Priors（arXiv 2203.14912）](https://arxiv.org/abs/2203.14912)：每种风格一个判别器的原始做法（四足）
- [Think on Your Feet（arXiv 2502.18901）](https://arxiv.org/abs/2502.18901)：同一团队的 HIM+MLP 人形步态切换工作，本文的外部基线
