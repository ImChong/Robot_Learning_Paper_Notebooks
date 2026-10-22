---
layout: paper
title: "Spark-0: Scaling Spatially Aligned Tactile Pretraining for Robot Dexterous Manipulation"
zhname: "Spark-0：面向机器人灵巧操作的空间对齐触觉预训练规模化"
category: "Manipulation"
arxiv: "2610.22342"
---

# Spark-0: Scaling Spatially Aligned Tactile Pretraining for Robot Dexterous Manipulation
**触觉有两种用法：训练时把手套测到的接触区域画进头部相机视角、监督 VLM 的视觉 token（部署时去掉），同时让一条触觉通路只喂给动作专家；1,000 小时全手触觉人类数据让不带触觉部署的成功率也大幅提升**

> 📅 总结日期: 2026-10-20
>
> 🏷️ 板块: 06 Manipulation · 视觉-触觉-语言-动作（VTLA）· 触觉预训练 · 双手灵巧手 · 流匹配动作专家 · 人类数据迁移
>
> 🔁 推进轨: 模块轮转（05_Locomotion → **06_Manipulation**）· 上游 awesome-humanoid-robot-learning Manipulation 章节中尚无笔记的最新论文（2026.10）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.22342](https://arxiv.org/abs/2610.22342) |
| HTML | [arxiv.org/html/2610.22342](https://arxiv.org/html/2610.22342)（截至总结日 arXiv 未生成 HTML 版，请看 PDF） |
| PDF | [下载 v1](https://arxiv.org/pdf/2610.22342v1) |
| **发布时间** | 2026-10-15（arXiv v1） |
| 项目主页 | [xsparkai.com/Spark-0](https://xsparkai.com/Spark-0) |
| 源码 | 🌟 [XsparkAI/Spark-0](https://github.com/XsparkAI/Spark-0)（独立发布版：训练 / 数据重定向 / websocket 部署）· [XPolicyLab/policy/Spark_0](https://github.com/XPolicyLab/XPolicyLab/tree/main/policy/Spark_0)（基准对比用的集成版，权重互通）· 权重 [TianxingChen/Spark-0](https://huggingface.co/TianxingChen/Spark-0) |

**作者**：Tianxing Chen\*§, Wenwei Lin\*, Chuqiao Lyu\*§, Peicheng Xiang\*, Junyuan Tang\*, Tian Nian\*, Zijian Cai, … , Renjing Xu, Ping Luo†, Wenbo Ding†（Xspark AI · 清华 · 港大 MMLab · 港科大（广州）· 北大；\* 共同一作，§ 项目负责人，† 通讯作者）

---

## 🎯 一句话总结

VLA 靠大规模视觉预训练拿到了很强的语义和视觉运动先验，但灵巧手的接触力、柔顺和刚开始的打滑从图像里很难看出来，手还常把接触区域挡住。Spark-0 用触觉手套采了 **1,000 小时**全手触觉的人类操作数据（HumanTouch），让触觉在预训练里扮演两个角色：**「哪里接触」**——把手套测到的接触点画成头部相机视角的接触图，和冻结的 Depth-Anything-3 几何特征一起监督 VLM 第 25 层的视觉 token，只在训练时用；**「接触怎么变化」**——20 帧区域力历史和 320 个三维触点组成 24 个触觉 token，只送进动作专家、不进 VLM。所以同一份权重既能纯视觉部署，也能接上在线触觉。和「同样数据、同样算力、丢掉触觉」的纯视觉预训练比，保留触觉让 Ego Humanoid（部署时没有触觉、换了身体）的成功率从 52.5% 涨到 71.7%，真机接触密集任务从 44.0% 涨到 52.0%。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VTLA | Vision-Tactile-Language-Action | 在 VLA 上加触觉的模型 |
| HumanTouch | — | 本文的人类触觉数据集：1,000 h、100+ 任务、32 名操作者、双手每只 460 个压阻触点（去掉弯折区 140 个后用 320 个）、25 关节手指追踪、60 Hz 同步 |
| SparkArena | — | 本文的基准：同一台双臂灵巧手（Gen 1 Prototype：Marvin M6S 手臂 + WUJI Hand 2）上 7 个仿真纯视觉任务 + 5 个真机带触觉任务 |
| DA3 | Depth-Anything-3 | 冻结的三维几何教师，提供每个视觉 token 的几何特征目标 |
| DiT | Diffusion Transformer | 动作专家的主干：36 层、宽 1024，偶数层对 VLM 做交叉注意力、奇数层做 State–Tactile–Action 联合自注意力 |
| AdaLN | Adaptive LayerNorm | 用条件向量调制 LayerNorm；这里条件是流时间 τ 加上拉平的区域力窗口 |
| SR / PSR | Success Rate / Partial Success Rate | 成功率 / 部分成功率；SparkArena 另报按子目标给分的完成度 |
| RTC | Real-Time Chunking | 部署时异步预取下一个动作块（代码里每 16 步重规划一次） |

---

## ❓ 论文要解决什么问题？

1. **接触信息在图像里很弱**：插试管、装鞋、扶瓶子这类任务，成败取决于力和细微打滑，相机看不到，手还会挡住接触处。只靠视觉预训练的通用 VLA（GR00T-N1.7、RDT-1B）在高自由度灵巧手上表现很差。
2. **三个空缺**（论文引言）：
   - 和手部姿态、多视角视频同步的大规模**全手**触觉数据很少；
   - 触觉一般只拿来当策略输入或预测目标，**没人用它监督视觉表征**；
   - 很少有基准能在**同一个身体**上同时测「纯视觉灵巧度」和「带触觉的接触控制」。
3. 核心问题：**触觉能不能成为视觉运动预训练的可扩展监督信号**，而不只是多一路输入？

---

## 🔧 方法拆解

### 1. 数据：HumanTouch 与预训练混合

- **采集**：双手柔性压阻手套（每只 460 点，弯折区 140 点会因弯曲产生假压力，屏蔽后用 320 点）+ 25 关节手指追踪 + 6 自由度手腕追踪 + 头戴相机 + 两个腕部相机，全部 60 Hz 同步。操作者不带机器人、自然地做接触密集任务。**同一副手套能装到 WUJI 灵巧手上**，所以人和机器人数据的触点排布一样。
- **统一动作空间**：所有来源离线转成目标身体的双手格式——每侧末端位姿 $T_t^k \in SE(3)$（平移 + 6D 旋转共 9 维）+ WUJI Hand 2 的 20 个关节角。人类数据用手腕轨迹配准到机器人坐标系，手部关键点用逆运动学重定向到 WUJI 手。状态是头部相机系下的绝对位姿，动作块是相对当前末端的位姿 + 绝对关节目标，合起来 $2 \times (9 + 20) = 58$ 维。
- **预训练混合（附录表 5，按采样权重而非时长决定曝光）**：

| 来源 | 时长 (h) | 采样权重 | 作用 |
|---|---|---|---|
| HumanTouch | 1,000 | 0.35 | 人类接触监督（带触觉） |
| EgoDex | 662 | 0.39 | 场景与动作多样性 |
| 同手套机器人 play | 20 | 0.09 | 目标身体 + 接触（带触觉） |
| 机器人 play（去掉触觉） | 24 | 0.05 | 同场景的纯视觉控制 |
| 仿真 | 25 | 0.05 | 视觉域随机化 |
| Fourier ActionNet | 153 | 0.04 | 机器人任务多样性 |
| AgiBot World | 60 | 0.03 | 多视角机器人多样性 |

### 2. 主干：Qwen3-VL-4B + 逐层流匹配动作专家

- 基于 StarVLA 与 XPolicyLab 代码库。VLM 产生每层隐状态 $h^{(1)}, \dots, h^{(L)}$；当前状态以离散 token 进 VLM，3 帧状态历史以连续向量进动作专家；VLM 序列末尾接 64 个可学习 action query。
- 动作专家 36 层 DiT（和 VLM 层数一样）：**偶数层**对对应 VLM 层做交叉注意力，**奇数层**在 State（3）+ Tactile（24）+ Action（50）这 77 个 token 上做联合自注意力。
- 流匹配：$a_\tau = (1-\tau)\epsilon + \tau a$，回归速度 $a - \epsilon$；每个样本平均 6 次噪声采样；推理用 4 步欧拉积分出 $H = 50$ 的动作块。

### 3. 角色一：空间对齐——训练时告诉视觉「哪里接触」（部署时删掉）

两个只在训练时存在的目标，都加在 VLM 第 $\ell^\star = 25$ 层（深但不是最后一层，且正好被一个交叉注意力层读取）：

- **几何对齐**：冻结的 DA3 教师给出每个视觉 token 位置的几何特征，投影后的 VLM token 与之做余弦对齐（$L _ {geo}$），每个视角先内部平均再跨视角平均，避免 token 多的相机占主导。
- **接触对齐**：检测每只手上处于接触的触点 → 挂到从手套重建的 MANO 手网格上 → 沿手表面扩散强度 → 渲染进头部相机视角，两手逐像素取最大 → 池化到 token 网格得到软目标 $y \in [0,1]$。一个轻量头从头部视角 token 预测接触 logits，因为接触区域稀疏，用 focal + soft Dice：$L _ {con} = 0.1 L _ {focal} + 0.1 L _ {dice}$。
- **接触图只当训练目标，从不当策略输入**。部署时 DA3 教师和两个对齐头都被拿掉。

### 4. 角色二：触觉通路——让动作知道「接触怎么变化」

- **两种时间尺度**：压力在毫秒级变化，接触几何一帧就够。
  - 区域力：每只手 6 个区域，20 帧（≈ 333 ms）力历史过时间卷积 → 12 个区域力 token；
  - 三维触点：当前帧每只手 320 个触点（头部相机系 xyz + 压力）过共享点编码器，在同样 6 个区域内注意力池化 → 12 个 3D token。
- **原始触觉从不进 VLM**，只进动作专家。
- **缺触觉 ≠ 零压力**：只有一部分预训练数据带触觉。存在的流乘以可学习标量门 $\gamma$（初始化 0.1），缺失或无效的流换成同一个可学习占位符 $e_\varnothing$：$\tilde e_q = m_q \gamma_q e_q + (1-m_q) e_\varnothing$。这样纯视觉样本和触觉样本能放在同一个 batch，模型不会把「没传感器」误读成「没接触」。3D 流训练时以 0.15 概率丢弃。
- **非对称注意力偏置**：触觉 query 去看 State / Action key 时加偏置 $b(g) = -6\,(1-\sigma(g))$（$g$ 可学习、初始 1.0），反方向（State / Action 看触觉）不加偏置，只由门 $\gamma$ 控制——让触觉 token 主要保持「传感器读数」的身份，而不是被动作同化。
- **触觉捷径（tactile shortcut）**：动作专家很容易只走视觉-语言那条路、忽略触觉。训练带触觉样本时，以一定概率（前 20k 步从 0 线性升到 0.1）把 State / Action 行的交叉注意力输出清零，只留 24 个触觉行继续读 VLM，迫使上下文经过触觉 token 流向动作。推理时关掉。
- 区域力窗口还通过零初始化的 AdaLN 调制每一层（$c = \mathrm{Embed}(\tau) + \mathrm{Embed}(\mathrm{flatten}(F_l, F_r))$）。

### 5. 总损失与部署

$$L = L _ {act} + \lambda _ {geo} L _ {geo} + L _ {con}, \quad \lambda _ {geo} = 0.2$$

预训练 400k 步（12 节点 × 8 卡，全局 batch 576），再在每个基准的下游数据上微调；**评测任务都不在预训练数据里**。部署时同一份权重：纯视觉用触觉占位符，有手套就接在线信号。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DATA["📦 预训练数据（7 个来源，约 1.9k h）"]
        D1["HumanTouch 1,000 h<br/>双手全手触觉手套 · 60 Hz<br/>采样权重 0.35"]
        D2["EgoDex 第一视角视频 0.39"]
        D3["同手套机器人 play 0.09<br/>（触点排布与人一致）"]
        D4["其他机器人 / 仿真 0.17"]
        D5["统一到目标身体<br/>头部相机系末端位姿 + WUJI 20 关节<br/>58 维状态 / 动作"]
        D1 --> D5
        D2 --> D5
        D3 --> D5
        D4 --> D5
    end

    subgraph VLM["👁️ Qwen3-VL-4B（视觉-语言）"]
        V1["头部 + 腕部图像 · 指令 · 离散化状态<br/>+ 64 个 action query"]
        V2["逐层隐状态 h1 … h36"]
        V1 --> V2
    end

    subgraph ALIGN["🎯 角色一：哪里接触（只在训练时）"]
        A1["DA3 冻结几何教师<br/>余弦对齐 L_geo（×0.2）"]
        A2["手套接触点 → MANO 网格扩散<br/>→ 渲染到头部视角接触图"]
        A3["接触头预测 logits<br/>focal + Dice：L_con"]
        A2 --> A3
    end

    subgraph TAC["✋ 角色二：接触怎么变（训练 + 可选部署）"]
        T1["区域力 2 手 × 6 区 × 20 帧<br/>时间卷积 → 12 个 token"]
        T2["3D 触点 2 手 × 320<br/>点编码 + 区域池化 → 12 个 token"]
        T3{"这一路触觉存在？"}
        T4["乘以门 γ（初始 0.1）"]
        T5["换成共享占位符 e∅"]
        T1 --> T3
        T2 --> T3
        T3 -- 是 --> T4
        T3 -- 否 --> T5
    end

    subgraph DIT["⚙️ 动作专家：36 层 DiT · 流匹配"]
        X1["序列：State 3 + Tactile 24 + Action 50"]
        X2["偶数层：交叉注意力读对应 VLM 层<br/>（训练时以 ≤0.1 概率清零 State/Action 行 = 触觉捷径）"]
        X3["奇数层：联合自注意力<br/>触觉 query → State/Action 加偏置 −6(1−σ(g))"]
        X4["AdaLN 条件：流时间 τ + 区域力窗口"]
        X5["4 步欧拉 → 50 步动作块"]
        X1 --> X2 --> X3 --> X5
        X4 -.-> X2
        X4 -.-> X3
    end

    subgraph DEP["🤖 同一份权重两种部署"]
        P1["纯视觉：SparkArena-Sim / Ego Humanoid<br/>触觉 token 用占位符"]
        P2["带触觉：SparkArena-Real<br/>Moxian 手套在线信号"]
    end

    D5 --> V1
    D5 --> T1
    D5 --> T2
    V2 -- 第 25 层 --> A1
    V2 -- 第 25 层 --> A3
    V2 --> X2
    T4 --> X1
    T5 --> X1
    X5 --> DEP

    style DATA fill:#eef6ff,stroke:#2e86de
    style VLM fill:#fff7e0,stroke:#d4a017
    style ALIGN fill:#fdecea,stroke:#c0392b
    style TAC fill:#f3eafe,stroke:#8e44ad
    style DIT fill:#eafaf1,stroke:#27ae60
    style DEP fill:#f4f6f7,stroke:#566573
</div>

---

## 🚶 具体实例：门和偏置在初始化时有多大影响

用附录 B 的初始化值算一遍，看「触觉 token 刚开始能影响动作多少、动作能影响触觉多少」。

**① 触觉 query 看 State / Action key 时的偏置**（$g$ 初始化 1.0）：

$$\sigma(1.0) = 0.731, \qquad b = -6 \times (1 - 0.731) = -1.61$$

softmax 里加 $-1.61$ 相当于把这些 key 的未归一化权重乘上 $e^{-1.61} \approx 0.20$。假设某个触觉 query 对 24 个触觉 key 和 53 个 State / Action key 的点积都一样，那么不加偏置时它约有 $53 / 77 = 69\%$ 的注意力落在 State / Action 上；加偏置后变成

$$\frac{53 \times 0.20}{24 + 53 \times 0.20} = \frac{10.6}{34.6} \approx 31\%$$

也就是触觉 token 一开始主要看彼此、保持传感器读数的身份；$g$ 学大了偏置趋近 0，学小了（$\sigma(g) \to 0$）最多压到 $-6$，即 $e^{-6} \approx 0.25\%$。

**② 反方向：State / Action 看触觉**——不加偏置，只靠门 $\gamma = 0.1$ 把触觉 token 缩小 10 倍再进序列，所以训练初期动作几乎不被触觉扰动，模型自己决定要不要把门开大；缺触觉的样本用占位符 $e_\varnothing$，不乘门。

**③ 触觉捷径的概率**：前 20k 步线性升到 0.1，例如第 5k 步时 $0.1 \times 5/20 = 0.025$，即每 40 个带触觉的样本里约有 1 个把 State / Action 的交叉注意力输出清零，只能通过 24 个触觉行间接拿到视觉-语言上下文。

（这是按论文给的初始化值做的示意，假设点积相等只为看清比例，不代表训练后的真实注意力分布。）

---

## 📊 关键结果

**SparkArena-Sim（表 1，7 个纯视觉仿真任务，每任务 50 次，Spark-0 不用触觉）**：平均成功率 **36.86%** / 完成度 39.74，最强基线 FastWAM 28.29% / 33.51（+8.57 / +6.23）；π₀.₅ 26.00%，GR00T-N1.7 14.00%，RDT-1B 9.71%——大规模多机器人预训练本身不够应付高自由度灵巧手。

**Ego Humanoid（表 2，换了身体，部署不用触觉）**：8 项汇总指标全部第一，且任务越长领先越多：

| 设定 | Spark-0 SR | 最强基线 SR | 差距 |
|---|---|---|---|
| 短程 · 见过 | 80.95 | 77.78（EgoVLA） | +3.17 |
| 短程 · 没见过 | 75.97 | 69.11（EgoVLA） | +6.86 |
| 长程 · 见过 | 68.15 | 49.63（FastWAM） | +18.52 |
| 长程 · 没见过 | 61.82 | 39.70（VITRA） | +22.12 |

**SparkArena-Real（表 3，5 个接触密集真机任务，每任务 10 次，带触觉）**：平均 **52.00%** / 62.80，触觉基础策略 FTP-1 36.00% / 47.80（+16 / +15）；Place the Phone 50 vs 20、Stand Up Bottle 80 vs 50；三孔都插满的 Insert Test Tubes 没有任何方法成功，Spark-0 完成度最高（31.00）。纯视觉基线常常动作开头对、接触过程收不了尾：π₀.₅ / GR00T-N1.7 完成度约 30 但成功率只有 14 / 16%。

**预训练消融（表 4，四个变体下游数据和优化预算相同，只差预训练）**：

| 变体 | SparkArena-Sim SR | Ego Humanoid SR | SparkArena-Real SR |
|---|---|---|---|
| Scratch（不预训练） | 31.71 | 58.34 | 38.00 |
| Visual PT（同数据、丢掉全部触觉） | 36.57 | 52.45 | 44.00 |
| 100H（保留 100 h 触觉） | 35.14 | 59.42 | 40.00 |
| **1000H**（保留 1,000 h 触觉） | **36.86** | **71.72** | **52.00** |

- 只做视觉预训练反而让 Ego Humanoid 掉了 5.89 个点；同样的 RGB 数据加回触觉后涨 19.27 个点——Ego Humanoid 评测时没有触觉，所以这个增益来自**触觉预训练**（接触图监督视觉 token + 预训练过的触觉通路），不是在线触觉反馈。
- 作者的解释：接触监督提升了向**没见过的视觉域**迁移的能力；SparkArena-Sim 几乎没变（+0.29），因为 Gen 1 Prototype 的数据本来就在预训练里。
- 100H 在 Sim / Real 上没超过 Visual PT，只有 1000H 在三个基准上都最好——触觉的收益要到完整规模才明显。

---

## 💡 核心贡献

1. **HumanTouch**：1,000 小时、100+ 任务、32 名操作者的全手触觉人类操作数据，手套也能装在机器人手上，人和机器人触点排布一致；
2. **Spark-0**：触觉一路当**只在训练时用的视觉 token 监督**（接触图 + 几何对齐），一路当**动作专家的输入**（区域力 + 3D 触点），一份权重同时支持纯视觉和带触觉部署；
3. **SparkArena**：同一台双手灵巧机器人上「仿真纯视觉 + 真机带触觉」两个赛道，公开任务定义、资产（附采购链接）、成对初始条件和评分规则；
4. **证据**：在相同数据和算力下对照「丢掉触觉」，说明触觉本身就是可扩展的视觉运动预训练信号。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **人类数据带触觉才更值钱** | 第一视角视频只有「看起来」，加上手套触觉后连视觉表征都学得更好，换到没见过的人形（Ego Humanoid）也受益；对靠人类视频扩数据的路线（EgoVLA、VITRA、GR00T 的人类数据层）是一个直接的补充 |
| **部署时没有触觉也能用** | 触觉主要在训练时起作用，没装触觉传感器的人形也能拿到增益；装了手套再接在线触觉 |
| **异构数据的工程细节** | 「缺失 ≠ 零压力」的占位符、门控、非对称偏置、触觉捷径，是把只有一部分带触觉的数据混训的具体做法，可直接借鉴到其他多传感器 VLA |
| **局限** | 真机每任务只 10 次、成对初始条件但方差仍大；100H 不如纯视觉预训练，说明小规模触觉数据未必有用；接触图依赖手套 + MANO 重建质量；只验证了一种灵巧手身体（Ego Humanoid 是仿真基准）；没有单独拆开「接触图监督」与「触觉通路预训练」各自贡献多少 |

---

## 🛠️ 源码运行时序图（部署推理）

基于 [XsparkAI/Spark-0](https://github.com/XsparkAI/Spark-0)（2026-10-17 提交 `2c2981d`）的 `scripts/serve.sh` → `spark0/serving/server.py` → `spark0/policy.py::SparkPolicy` 路径。服务端单进程单卡，加载权重后按 checkpoint 里保存的训练配置（身体、位姿格式、归一化、相机、触觉排布）回放；机器人端只需要 `spark0.serving.client`，不需要 torch。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant R as 机器人控制循环
    participant C as SparkClient（websocket）
    participant S as PolicyServer（server.py）
    participant P as SparkPolicy（policy.py）
    participant W as PolicyServerWrapper（starVLA）
    participant M as Qwen3-VL + 36 层 DiT

    R->>S: scripts/serve.sh 启动服务（指定 checkpoint、GPU 与端口）
    S->>W: build_backend()：加载权重（不加载 DA3 教师）
    S->>P: SparkPolicy(model_cfg)：回放训练配置
    C->>S: 连接
    S-->>C: 元数据（action_chunk_size=50、state_history_frames=3、rtc、tactile…）
    C->>S: reset()：清空历史、缓存的动作块与 RTC 队列
    loop 每个控制步
        R->>C: update_obs(obs)：图像 + 头部相机外参 + 双手末端位姿 / WUJI 20 关节 + 可选触觉
        C->>S: update_obs（每 obs_period 步才上传完整观测）
        S->>P: _convert_obs()：位姿换到头部相机系、6D 旋转、状态历史环形缓冲
        R->>C: get_action()
        C->>S: get_action
        alt 缓存里还有动作行
            P-->>S: 直接取下一行
        else 需要新动作块（同步：每 50 行；RTC：剩 34 行时异步预取，即每 16 步）
            P->>P: _tactile_blocks()：区域力 / 3D 触点打包，缺失则留给占位符
            P->>W: predict_action(query)
            W->>M: VLM 逐层隐状态 → DiT 4 步欧拉积分
            M-->>W: 归一化动作块 50 × 58
            W-->>P: 动作块
            P->>P: _decode_chunk()：反归一化，相对位姿按当前末端位姿恢复成绝对目标
            P-->>S: 第一行（其余进缓存 / RTC 拼接）
        end
        S-->>C: 一行动作：双手末端位姿 + WUJI 关节目标
        C-->>R: robot.apply(action)
    end
    Note over S,P: 启动参数 set tactile=false 可用同一权重做有 / 无触觉的 A/B 对比
</div>

**代码与论文的出入**（按 README 记录，供复现时注意）：

- README 里 `pretrain_spark_0` 配方写的是 500k 步（论文与附录表 6 是 400k 步）；`sft_spark_0` 微调 80k 步、8k 热身。
- 磁盘上状态 / 动作是 54 维（四元数位姿 7 + 20 关节，双手），打包进模型时转成论文说的 58 维（9 维位姿含 6D 旋转）。
- 部署默认 `rtc: default`：动作块 50 行、剩 34 行时触发下一次推理，所以实际每 16 步重规划一次；`execute_horizon: null` 时每 50 行重规划一次。

---

## 🎤 面试参考

**Q：部署时没有触觉传感器，触觉预训练凭什么还有用？**
A：触觉有一半作用是**训练信号**：手套接触点渲染成头部视角的接触图，监督 VLM 第 25 层的视觉 token，让视觉特征编码「手和物体在哪里接触」；这个头部署时删掉，但学到的视觉表征留下了。另外缺触觉时用的是训练中学过的占位符，模型见过大量「没有触觉」的样本，不会把它当成「零压力」。表 4 里 Ego Humanoid 没有触觉，1000H 比 Visual PT 高 19.27 个点。

**Q：为什么原始触觉不送进 VLM？**
A：一是保持 VLM 的视觉-语言先验不被一种新模态打乱；二是让同一份权重能在有 / 无触觉两种部署下用——触觉只影响动作专家，VLM 的输入分布两种情况下一样。

**Q：「缺失」为什么要和「零压力」区分开？**
A：零压力是真实的物理读数（手没碰东西），缺失是没有传感器。如果把缺失填 0，模型会在 EgoDex 这类纯视频数据上学到「这时候手什么都没碰」的错误关联。用单独的可学习占位符 $e_\varnothing$，并且只给存在的流乘门 $\gamma$，两类样本就能放在同一个 batch 里训练。

**Q：触觉捷径（shortcut）解决什么问题？**
A：动作专家每个偶数层都能直接读 VLM，最省事的解法是完全忽略触觉。训练时偶尔（≤10%）把 State / Action 行的交叉注意力清零，只让触觉行读 VLM，上下文必须经过触觉 token 才能到动作，逼模型真正用上触觉通路；推理时关掉。

**Q：为什么 100 h 触觉不如纯视觉预训练？**
A：论文只给了现象：100H 在 SparkArena-Sim / Real 上没超过 Visual PT，只有 1000H 全面最好。一个可能的理解（我们的推测）是少量触觉数据带来的额外目标和门控结构在训练早期反而分走了容量，规模够大时监督信号才压过这部分代价。

---

## 🔗 相关阅读

- [GR00T N1](../../03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.html)：同样是「VLM + 流匹配 DiT 动作头」的人形基础模型，本文用其 N1.7 版当基线
- [π₀.₅](../../03_High_Impact_Selection/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.html)：异构数据混训的 VLA 代表，本文基线之一
- [Visual-Tactile Pretraining and Online Multitask Learning for Humanlike Manipulation Dexterity](../Visual-Tactile_Pretraining_and_Online_Multitask_Learning_for_Humanlike_Manipulation_Dexterity/Visual-Tactile_Pretraining_and_Online_Multitask_Learning_for_Humanlike_Manipulation_Dexterity.html)：另一条视觉-触觉预训练路线
- [RoboTacDex](../RoboTacDex__A_Dexterous_Visual-Tactile-Action_Dataset_for_Humanoid_Manipulation/RoboTacDex__A_Dexterous_Visual-Tactile-Action_Dataset_for_Humanoid_Manipulation.html)：人形灵巧操作的视觉-触觉-动作数据集
- FTP-1（[arXiv 2606.13102](https://arxiv.org/abs/2606.13102)）：真机赛道最强基线，跨传感器的触觉基础策略；EgoVLA（[arXiv 2507.12440](https://arxiv.org/abs/2507.12440)）：Ego Humanoid 基准的出处
