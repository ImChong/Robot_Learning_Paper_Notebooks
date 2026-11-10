---
layout: paper
title: "AffectiveVLA: Safe and Intent-Aware VLA Control for Human-Humanoid Social Interaction"
zhname: "AffectiveVLA：面向人与人形社交互动的安全、意图感知 VLA 控制"
category: "Manipulation"
arxiv: "2611.07712"
original_check: done
original_check_date: 2026-11-10
original_check_scope: arXiv v1 LaTeX 源码全文（摘要、引言、相关工作、第 3–5 节、式 1、表 1–3、局限）；图 1–2 按图注核对；每个意图模型的完整结果在补充材料里，arXiv 源码没有附；论文没有放出源码
---

# AffectiveVLA: Safe and Intent-Aware VLA Control for Human-Humanoid Social Interaction
**握手、碰拳、拥抱这类社交触碰：先用一个约 6 ms 的轻量 RGB 视频分类器从两路机载相机认出对方想做哪一种，连续三步概率 > 0.6 才「确认」并写成 VLA 的语言提示（确认前不让动），VLA 输出 SONIC 动作 token + 灵巧手指令；同时按动作类型调手臂阻抗增益，另有一路语音「stop」锁存安全停。GR00T N1.6 单独用时 macro-F1 0.75，加上意图门控升到 0.90**

> 📅 总结日期: 2026-11-10
>
> 🏷️ 板块: 06 Manipulation · 人机社交触碰 · VLA 微调对比 · 意图识别门控 · 按任务调阻抗 · 语音安全停
>
> 🔁 推进轨: 模块轮转（05_Locomotion → **06_Manipulation**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2611.07712](https://arxiv.org/abs/2611.07712) |
| HTML | [在线阅读](https://arxiv.org/html/2611.07712v1) |
| PDF | [下载](https://arxiv.org/pdf/2611.07712) |
| 项目页 | 论文未给出项目页 |
| 源码 | ⏳ 未开源（论文正文与 arXiv 页面都没有代码链接） |
| **发布时间** | 2026-11-05（arXiv v1） |

**作者**：Nikita Kuzmin、Georgii Demianchuk、Mariya Lezina、Yara Mahmoud、Iana Zhura、Miguel Altamirano Cabrera、Dzmitry Tsetserukou（俄罗斯斯科尔科沃科学技术研究院 Skoltech）。

**定位**：这是一篇偏系统与实测的短文（ACM 模板）。它不提新的网络结构，而是把四个现成部件串起来：意图识别 → VLA 生成全身动作 → 按任务调阻抗 → 独立的语音安全停，并在同一份遥操作数据上微调、对比了四个 VLA（GR00T N1.6、RLDX-1、Being-H0.5、UnifoLM-VLA-0）。底层全身控制器是 [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VLA | Vision-Language-Action | 图像 + 语言 → 机器人动作的大模型 |
| HRI | Human–Robot Interaction | 人机交互 |
| SONIC | （NVIDIA GEAR 的通用运动跟踪控制器） | 接收 64 维运动 token，输出全身关节目标并负责平衡 |
| RMSE | Root Mean Square Error | 离线开环动作误差 |
| macro-F1 | 各类 F1 的算术平均 | 本文在握手 / 碰拳 / 拥抱三类上取平均 |
| p95 | 95th percentile | 推理延迟的 95 分位数 |
| $K_p$ / $K_d$ | 比例 / 微分增益 | 关节阻抗的刚度与阻尼 |

---

## 🎯 一句话总结

社交触碰和抓物体不同：对方是一个会动、会主动发起的人，机器人得先猜对「他要握手还是碰拳」，再在碰到人时足够软。AffectiveVLA 把「猜意图」从 VLA 里拆出来交给一个专门的小视频分类器（TinyViT + VideoLightFormer，p95 延迟 6.27 ms），只有连续三步高置信才放行并把意图写成提示词；VLA 只负责「怎么做」。真机 150 次试验上，GR00T 的 macro-F1 从 0.75 升到 0.90（碰拳 0.50 → 0.78，拥抱 0.89 → 1.00）；另一个结论是：离线 RMSE 几乎一样的 VLA，上真机差别巨大（Being-H0.5 离线 RMSE 0.135，真机 macro-F1 只有 0.12）。

---

## ❓ 要解决什么问题？

1. **意图要从人身上读出来**：已有的拥抱 / 握手策略（ECHO、RHINO、D-STAR 等）用固定技能集，由操作员选择做哪一种，不会自己判断对方想干什么；
2. **VLM 推理意图太慢、又不会动手**：HIAER 一类方法的延迟是秒级，而且不执行接触动作；
3. **端到端 VLA 在意图不确定时会「乱动」**：误触发一次拥抱，对人是安全问题；
4. **接触时要柔顺，而且不同动作需要的柔顺不一样**：已有的柔顺控制（如 [GentleHumanoid](../../04_Loco-Manipulation_and_WBC/GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object/GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object.html)）多用一套固定设置。

论文据此提了三个研究问题：RQ1 哪个 VLA 微调后最适合社交触碰；RQ2 合适的手臂柔顺度是否随动作类型变化；RQ3 意图门控能否选对动作、接触中能否安全中断。

---

## 🔧 方法

### 1. 平台与数据（第 3.1–3.2 节）
- **机器人**：Unitree G1 + BrainCo 灵巧手（每只手 6 个执行器），由 SONIC 全身控制器驱动，上身 17 个电机带各自的 $K_p$、$K_d$。
- **遥操作**：PICO 4 Ultra 头显跑 XRoboToolkit，头 / 手柄位姿与 26 关节手部追踪 90 Hz；上身指令转给 SONIC、手指轨迹发给 BrainCo，50 Hz。
- **记录**：三路 RGB——机器人上的第一视角（1280×720）与头部相机（1600×896）各 15 FPS，加主机上的外部视角（1280×960）；上身遥测（关节状态、速度、力矩、指令）50 Hz，LeRobot 格式。
- **数据**：四类（握手、碰拳、拥抱、无交互），每段人工标四个时刻：接近开始、接触开始、松开开始、空闲开始（用来训练意图模型）。剔除跟踪丢失、安全停、意外接触、时长异常的片段后，共 **1,270 段、19 名参与者**；扩展集 982 段 / 15 人，测试集 288 段 / 4 名没见过的人，两者不重叠（摘要写的是「约 1,300 段」）。

### 2. 四个 VLA 的统一微调（第 3.3 节）
- 统一动作空间 **76 维**：64 维 SONIC 运动 token（上身）+ 每只手 6 维手指指令（$64 + 2\times6 = 76$），一个动作块 **40 步**。
- 都是「ViT 视觉语言骨干 + 投影层 + 动作专家」结构。Being-H0.5、RLDX-1、UnifoLM-VLA-0 冻结语言骨干，训练 ViT、投影层与动作专家；GR00T N1.6 只训动作专家与投影层。单张 A100 80GB、30k 步。

### 3. 意图识别（第 4.1 节）
- 输入两路机载 RGB：一路看全身动作、一路看手部接触区；每次取最近 **16 对帧**（15 Hz，约 1 s），letterbox 到 224×224。
- 共享 TinyViT 编码逐帧特征 → 每路一个因果 VideoLightFormer 聚合时间 → 注意力融合两路 → 四分类（handshake / hug / fist_bump / no_interaction）。
- **提交规则**：某一意图的概率连续 **3 个推理步 > 0.6** 才算确认；确认前不执行动作。

### 4. VLA 全身执行（第 4.2 节）
- 确认的意图映射成提示词（*hug* / *handshake* / *fist bump*），同时激活对应的柔顺档位；VLA 输入提示词、两路相机、机器人状态、BrainCo 手的实测状态。
- VLA **5 Hz** 推理，动作 **50 Hz** 执行；运动 token 交给 GEAR-SONIC 出全身关节目标并管平衡，手指指令直发 BrainCo。
- 安全细节：每个执行器限速，避免块与块之间跳变；手指「指令 − 实测」偏差判定接触，接触后只许张开、不许继续握紧；提示词一变就丢弃排队的动作，等到匹配的新块再执行；柔顺档位靠 10 Hz 心跳维持，心跳停了保持最后一组增益。

### 5. 按任务调柔顺（第 4.3 节，式 1、表 1）
只缩放 14 个手臂关节的增益，躯干和腿不变：

$$K _ {p,i} = \alpha_i K^{0} _ {p,i}, \qquad K _ {d,i} = \beta_i K^{0} _ {d,i}, \qquad \beta_i \ge \sqrt{\alpha_i}$$

| 档位（$K_p$ 倍数, $K_d$ 倍数） | 肩 | 肘 | 腕 |
|---|---|---|---|
| 握手 | (1.00, 1.00) | (0.60, 0.83) | (1.00, 1.00) |
| 拥抱 | (0.60, 0.83) | (0.60, 0.83) | (0.60, 0.83) |
| 碰拳 | (0.60, 0.83) | (0.60, 0.83) | (1.00, 1.00) |
| 软（安全停用） | (0.25, 0.50) | (0.25, 0.50) | (0.25, 0.50) |

档位之间按最小加加速度曲线过渡（变软 0.3 s、变硬 1.0 s），过渡时阻尼保持在高位。论文写明这些是**试点中挑的暂定值**，最终值等用户研究定。

### 6. 语音安全停（第 4.4 节）
离线 Vosk 识别器，只认「stop」「hold on」。一旦触发就**锁存**：忽略操作员与 VLA 指令、行走置为空闲、手臂先切到「软」档再放回休息位（检测到正在拥抱时先往外张开）、BrainCo 手指张开；只有人工解除才能恢复。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart LR
    subgraph PERC["(a) 感知"]
        C1["机载 RGB 1：全身"]
        C2["机载 RGB 2：手部接触区"]
        MIC["机载麦克风"]
    end
    C1 --> ENC["共享 TinyViT<br/>16 对帧，224×224"]
    C2 --> ENC
    ENC --> VLF["两路因果 VideoLightFormer<br/>+ 注意力融合"]
    VLF --> CLS["四分类：握手 / 碰拳 / 拥抱 / 无交互"]
    CLS --> GATE{"连续 3 步<br/>概率 > 0.6？"}
    GATE -- 否 --> HOLD["不执行动作"]
    GATE -- 是 --> PROMPT["提示词 hug / handshake / fist bump"]
    GATE -- 是 --> PROF["选柔顺档位（表 1）<br/>最小加加速度过渡"]

    subgraph VLA["(b) 机载 VLA 桥"]
        PROMPT --> POL["VLA（GR00T N1.6 等）<br/>5 Hz，40 步动作块"]
        C1 --> POL
        C2 --> POL
        ST["机器人状态 + 手的实测状态"] --> POL
        POL --> SM["限速平滑；提示词变了就丢队列<br/>手指接触后只许张开"]
    end
    SM -->|64 维运动 token，50 Hz| SONIC["SONIC 全身控制器<br/>关节目标 + 平衡"]
    SM -->|2 × 6 维手指指令| HAND["BrainCo 灵巧手"]
    PROF -->|"手臂 14 关节 Kp·α, Kd·β（10 Hz 心跳）"| SONIC

    MIC --> VOSK["Vosk：stop / hold on"]
    VOSK --> STOP["锁存安全停：<br/>忽略指令、手臂变软放下、手指张开"]
    STOP -.->|覆盖| SONIC
    STOP -.->|覆盖| HAND
    SONIC --> G1["Unitree G1：握手 / 碰拳 / 拥抱"]
    HAND --> G1
</div>

---

## 🚶 具体实例

**例 1：一个动作块真正执行了多少**。VLA 每 0.2 s（5 Hz）出一个 40 步的块，动作 50 Hz 执行，一块覆盖 $40 / 50 = 0.8$ s；新块 0.2 s 后就来了，所以每块大约只执行前 $0.2 \times 50 = 10$ 步（25%）。这正是论文说「真机上主要执行块的开头，第一步的精度最要紧」的原因：GR00T 第一步 RMSE 0.085 是四个模型里最低的，虽然它的总体 RMSE（0.135）并不是最低（RLDX-1 是 0.133）。（10 步是我们按两个频率算的，论文只说「主要执行开头」。）

**例 2：柔顺档位里的 $\beta \ge \sqrt\alpha$**。拥抱时肩的 $K_p$ 乘 0.60，$\sqrt{0.60} = 0.775$，表里 $K_d$ 乘 0.83 ≥ 0.775，满足约束；「软」档 $K_p$ 乘 0.25，$\sqrt{0.25} = 0.50$，$K_d$ 正好乘 0.50，取在边界上。对一个质量不变的二阶系统，阻尼比 $\zeta \propto K_d / \sqrt{K_p}$，所以 $\beta = \sqrt\alpha$ 时阻尼比不变，$\beta > \sqrt\alpha$ 时更「阻尼」——拥抱档的阻尼比是原来的 $0.83 / 0.775 \approx 1.07$ 倍。（这条阻尼比的解释是我们的理解，论文只写了约束本身和「过渡时阻尼保持在高位」。）

**例 3：意图门控的等待时间**。意图模型每次看最近 16 对帧（15 Hz，约 1.07 s 的历史），要连续 3 步 > 0.6 才确认。验证集上，54 段「无交互」里一次误触发都没有；77% 的交互在身体接触之前就确认了，中位提前量 2.1 s——也就是说，人伸手过来的那一两秒里，机器人通常已经知道要做什么。

**例 4：macro-F1 怎么平均**。GR00T + 意图：$(0.92 + 0.78 + 1.00) / 3 = 0.90$；GR00T 单独：$(0.86 + 0.50 + 0.89) / 3 = 0.75$。提升主要来自碰拳（+0.28），拥抱从 0.89 到 1.00 意味着加了意图以后拥抱不再出错。

---

## 📊 实验与结果

**表 2：离线开环动作误差**（288 段测试集，40 步块，RMSE 越小越好）

| 模型 | 总体 | 身体 | 手 | 第一步 | 最后一步 |
|---|---|---|---|---|---|
| Being-H0.5 | 0.135 | **0.100** | 0.353 | 0.093 | 0.161 |
| GR00T | 0.135 | 0.103 | **0.341** | **0.085** | **0.156** |
| RLDX-1 | **0.133** | **0.100** | **0.341** | 0.096 | 0.158 |
| UnifoLM-VLA-0 | 0.148 | 0.114 | 0.373 | 0.110 | 0.177 |

**表 3：真机在线评测**（5 名参与者 × 3 种动作 × 10 次 = 每个策略 150 次；F1 越大越好；判对 = 机器人做的正是对方发起的动作）

| 模型 | 握手 | 碰拳 | 拥抱 | 平均 |
|---|---|---|---|---|
| Being-H0.5 | 0.09 | 0.00 | 0.26 | 0.12 |
| UnifoLM-VLA-0 | 0.57 | 0.38 | 0.94 | 0.63 |
| RLDX-1 | 0.68 | 0.38 | 0.54 | 0.53 |
| GR00T | 0.86 | 0.50 | 0.89 | 0.75 |
| **GR00T + 意图（本文）** | **0.92** | **0.78** | **1.00** | **0.90** |

- **RQ1**：离线前三名的总体 RMSE 都在 0.133–0.135，上真机却天差地别——Being-H0.5 几乎从不做出被请求的动作，离线最差的 UnifoLM 反而真机第二。论文的结论：开环误差不能代替真机评测来挑 VLA。
- **RQ3（意图）**：六种「视觉编码器 × 时序模块」组合（TinyViT / MobileViT / EfficientFormer × VTN / VideoLightFormer，编码器冻结）在测试集上 macro-F1 0.51–0.76、p95 延迟 5.31–6.73 ms；TinyViT + VideoLightFormer 最好（macro-F1 0.76、准确率 0.736、p95 6.27 ms）。开发数据清洗后 790 段（632 训练 / 158 验证）；测试集没有「无交互」片段，所以测试 macro-F1 只在三类上算。
- **RQ3（安全停）**：两个停止词在近距离通过机载麦克风 10/10 检出，对话中没有误触发。
- **RQ2（柔顺）**：用户研究在进行中——肩、肘、腕各在硬 / 软（$K_p \times 0.6$、$K_d \times 0.83$）之间切换的 $2\times2\times2$ 被试内设计，平衡拉丁方排序，每次互动后按 7 分量表评安全、舒适、自然；两次试点只用来改进流程，**论文还没有给出结果**。

---

## 💡 核心贡献

1. **四个 VLA 在社交触碰上的同数据对比**：统一 76 维动作空间（SONIC token + 手指），离线 RMSE 与真机 F1 排名不一致；
2. **意图门控**：毫秒级的双视角视频分类器决定「做哪个动作」并写成提示词，低置信时不动，VLA 只管「怎么做」；
3. **按任务调手臂阻抗** + **独立的锁存语音安全停**，两者都在 VLA 之外、不依赖它的输出。

---

## 🤖 对人形机器人的启示

- 把「做什么」从「怎么做」里拆出来：VLA 自己从画面里猜意图时容易混淆相似动作（碰拳和握手），一个专门的小分类器 + 置信门槛更便宜、也更可控；
- 选 VLA 别只看离线开环误差，尤其是带人的接触任务——真机评测的排序可以完全不同；
- 安全机制（限速、手指接触后只许张开、提示词变化即清空队列、心跳维持增益、锁存急停）都放在模型外面，模型出错时也能兜住。

---

## ⚠️ 局限与可改进点

- 参与者少（真机 5 人），只有三种预设动作，环境与人群多样性有限，只在一台机器人、一种全身控制器上验证；
- 「无交互」只在标注好的片段里评过，长时间连续运行里的误触发还没测；
- 意图模型对没见过的人可能泛化差，碰拳尤其明显；嘈杂环境下语音识别可能失效；
- 降 $K_p$ 不给接触力的形式化上界，没有重力补偿时手臂会略微下垂——对这几个手势可以接受，对精细低刚度任务不行；
- 柔顺档位是暂定值，RQ2 的用户研究尚未完成；意图模型逐项结果在补充材料里，arXiv 源码没附；代码未开源。

---

## 🎤 面试参考

- **为什么不直接让 VLA 从画面里判断意图？** 实测 GR00T 单独用时碰拳 F1 只有 0.50；专门的意图模型只做四分类、6 ms 一次，还能用「连续 3 步 > 0.6」这种显式门槛压住误触发，VLA 拿到的提示词就是确定的。
- **为什么只缩手臂增益、不动腿和躯干？** 腿和躯干要靠 SONIC 维持平衡，接触柔顺只需要手臂让开；论文的式 1 只作用于 14 个手臂关节。
- **离线 RMSE 为什么不可靠？** 开环误差衡量的是在示范轨迹上逐步预测得像不像，而真机是闭环、有人在动，模型能不能在正确的时机做出正确的动作类别，开环指标看不出来（Being-H0.5 离线并列第二、真机 0.12）。
- **安全停为什么要「锁存」？** 让停下的状态不会被 VLA 或操作员的下一条指令覆盖，只有人工解除才恢复。

---

## 🔗 相关阅读

- [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)：本文的底层全身控制器（64 维运动 token 接口）
- [GR00T N1](../../03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.html)：本文表现最好的 VLA 所属系列（本文用的是 N1.6）
- [Being-H0](../Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos/Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos.html)：本文对比的 Being-H0.5 的前作
- [GentleHumanoid](../../04_Loco-Manipulation_and_WBC/GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object/GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object.html)：固定柔顺设置的上身柔顺控制，本文的对照
- RLDX-1（arXiv 2605.03269）、UnifoLM-VLA-0、HIAER（arXiv 2506.01563）、XRoboToolkit、Vosk
