---
layout: paper
paper_order: 1
title: "Generating Diverse and Natural 3D Human Motions from Text (HumanML3D)"
category: "人类运动数据"
zhname: "HumanML3D：从文本生成多样且自然的 3D 人体动作"
demos: ["humanml3d"]
---

# Generating Diverse and Natural 3D Human Motions from Text
**HumanML3D：从文本生成多样且自然的 3D 人体动作**

> 📅 阅读日期: 2026-04-21（2026-10-03 第二版：对照论文、补充材料与两个官方仓库重写；2026-10-11 第三版：讲解动画改成十二幕，用片段 012314 的真实骨架和论文原图，新增三个交互演示、重做配音视频，并按逐条核查改正十余处）
>
> 🏷️ 板块: 14 Human Motion · 文本生成动作 · 数据集 · 时序 VAE · 评测协议 · CVPR 2022
>
> ℹ️ 笔记对照 [CVPR 2022 正文](https://openaccess.thecvf.com/content/CVPR2022/papers/Guo_Generating_Diverse_and_Natural_3D_Human_Motions_From_Text_CVPR_2022_paper.pdf)（含 Table 1–4）、[补充材料](https://openaccess.thecvf.com/content/CVPR2022/supplemental/Guo_Generating_Diverse_and_CVPR_2022_supplemental.pdf)（附录 A–K），以及官方仓库 [EricGuo5513/HumanML3D](https://github.com/EricGuo5513/HumanML3D)（数据处理）与 [EricGuo5513/text-to-motion](https://github.com/EricGuo5513/text-to-motion)（模型与评测）整理，两个仓库都取的 `main`。**这篇论文没有 arXiv 版本**：旧版笔记里写的 arXiv 2204.09419 实际是一篇天体物理论文（超亮超新星的中红外研究），已删除。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **论文** | Generating Diverse and Natural 3D Human Motions from Text |
| **会议** | CVPR 2022（pp. 5152–5161） |
| **论文 PDF** | [CVF OpenAccess](https://openaccess.thecvf.com/content/CVPR2022/papers/Guo_Generating_Diverse_and_Natural_3D_Human_Motions_From_Text_CVPR_2022_paper.pdf) |
| **补充材料** | [Supplemental PDF](https://openaccess.thecvf.com/content/CVPR2022/supplemental/Guo_Generating_Diverse_and_CVPR_2022_supplemental.pdf) |
| **作者** | Chuan Guo, Shihao Zou, Xinxin Zuo, Sen Wang, Wei Ji, Xingyu Li, Li Cheng |
| **机构** | University of Alberta |
| **发布时间** | 2022 年 6 月（CVPR 2022） |
| **项目主页** | [ericguo5513.github.io/text-to-motion](https://ericguo5513.github.io/text-to-motion/) |
| **数据集仓库** | [EricGuo5513/HumanML3D](https://github.com/EricGuo5513/HumanML3D) |
| **代码** | [EricGuo5513/text-to-motion](https://github.com/EricGuo5513/text-to-motion) |

---

## 🎯 一句话总结

> HumanML3D 把 AMASS 与 HumanAct12 的动捕统一到 20 fps、同一副骨架与朝向，再请人每段写 3 句话，得到 14,616 段动作 / 44,970 条描述 / 28.59 小时；论文同时给出两阶段生成方法（text2length 采长度 → 时序 VAE 在 snippet code 上逐段生成）和一套基于对比学习特征的评测器（R-Precision、FID、MultiModal Dist 等）。后来的文本生成动作论文大多在这套数据和评测器上报数。

> 🎮 **本文内嵌 1 段讲解动画、1 段配音视频和 3 个交互演示**（不用装任何东西）：
> [十二幕动画：HumanML3D 全流程](#humanml3d-explainer-anim) —— 约 192 秒串完「一句话生成动作卡在哪（论文图 1）→ 动作从哪来 → 每段配三句话（标注界面）→ 一帧 263 维（片段 012314 的真实骨架）→ 每 4 帧一个 snippet code → Text2Length（补充材料图 6 的长度分布）→ 文本编码器与词注意力 → 先验、后验、生成器 → 三项损失与课程学习 → 评测器与 R-Precision → 结果（图 4、用户研究）→ 消融、局限与遗产（图 6、失败案例）」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。
> [配音讲解视频](#humanml3d-video) —— 同样十二幕，加中文配音与字幕，@@VIDEO_DUR@@竖屏，可下载
> [片段 012314 的 263 维](#demo-clip) —— 拖帧号、改触地阈值、勾「镜像」，看真实骨架、触地标签和镜像扩增
> [Text2Length 采样](#demo-length) —— 补充材料图 6 的八条长度分布（读图值），拖累积概率、随机采样，看同一句话能生成多长的动作
> [R-Precision 玩具](#demo-rprec) —— 32 条描述里排第几：生成偏差和「描述本身有歧义」各让分数掉多少

> 🚶 [具体实例](#实例-环境设定)拿官方仓库自带的一段真实片段 `012314`（AMASS 里 Eyes_Japan 的一段网球一发，170 帧特征）从头走一遍：三条描述怎么分词打标、263 维逐段拆开、触地阈值换算、Z-score 放大、压成 42 个 snippet code、补充材料图 6 的长度分布与交叉熵、时序 VAE 每一步的维度账、课程学习里它参加哪几个阶段，最后列出论文与代码的出入。

---

## 📌 核心数据集参数

| 维度 | 数值 | 出处 / 备注 |
|------|------|------|
| **动作段数** | 14,616 | 论文 Table 1；官方 `index.csv` 正好 14,616 行 |
| **文本描述数** | 44,970 | 论文 Table 1；平均每段 44,970 / 14,616 ≈ 3.08 条 |
| **总时长** | 28.59 h | 论文 Table 1；单段 2–10 s，论文写平均 7.1 s |
| **词表** | 5,371 个不同词 | 论文 Table 1；描述平均 12 词、中位数 10 词 |
| **帧率** | 20 fps | 超过 10 s 的随机裁成 10 s |
| **骨架** | 22 个关节（SMPL 的前 22 个关节） | 存的是统一骨架下的关节位置与旋转特征，**不是 SMPL 的 pose / shape 参数** |
| **每帧特征** | 263 维 | 根节点 4 + 局部位置 63 + 6D 旋转 126 + 局部速度 66 + 触地 4 |
| **来源** | AMASS 17 个子集 13,425 段 + HumanAct12 1,191 段 | 按官方 `index.csv` 的 `source_path` 数出来（18 个来源）；最大的是 AMASS 里的 KIT 子集（4,648 段） |
| **扩增与切分** | 镜像后 29,232 段；train : test : val = 0.8 : 0.15 : 0.05 | 三个 split 文件实际合计 29,228 行（train 23,384 / test 4,384 / val 1,460），少的 4 行是 `index.csv` 里两段只有 1 帧的退化片段（009707、011059）和它们的镜像 |

---

## 🎬 十二幕动画：HumanML3D 全流程 {#humanml3d-explainer-anim}

<div class="paper-demo" data-demo="humanml3d-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#humanml3d-video}

<div class="paper-demo" data-demo="humanml3d-video" data-src="media/humanml3d_explainer_video.mp4" data-poster="media/humanml3d_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/humanml3d_explainer_video.mp4" download="HumanML3D_讲解视频.mp4">下载 mp4（@@VIDEO_MB@@）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（要解决什么问题、方法详解、实验结果）按小节收起，再往后的具体实例、源码对照、工程价值、讨论、面试与参考来源各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 3–5、7–9 幕里的片段 `012314`（骨架、263 维、触地、42 个 snippet code、注意力示意、课程阶段），第 6 幕从补充材料图 6 量出来的两条长度分布，和三个交互演示、下文「🚶 具体实例」是同一组数字。

---

## ❓ 要解决什么问题

<div class="mermaid">
flowchart LR
    TXT["一句话<br/>the figure rises from a lying position<br/>and walks in a counterclockwise circle ..."] --> OLD["已有方法<br/>Seq2Seq / Language2Pose / Text2Gesture"]
    OLD --> P1["确定性一对一"]
    OLD --> P2["长度固定"]
    OLD --> P3["只有 KIT-ML<br/>3,911 段，偏走路"]
    TXT --> C1["① 长度可变"]
    TXT --> C2["② 一句多解"]
    TXT --> C3["③ 文本有短有长"]

    style OLD fill:#fdebd0,stroke:#e67e22
    style C1 fill:#e8f4fd,stroke:#1f78b4
    style C2 fill:#e8f4fd,stroke:#1f78b4
    style C3 fill:#e8f4fd,stroke:#1f78b4
</div>

### 已有方法的四个短板

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：输入短、确定性（动作趋于僵住）、长度固定、只有 KIT-ML</summary>

论文第 1 节列出当时（2022 年以前）文本生成动作的共同问题：

- **输入短**：通常只处理一个短句；
- **确定性**：任务被写成确定性的 sequence-to-sequence，一句话只能生成一段动作，生成结果「趋于静止、没有生气」（stationary and lifeless）；
- **长度固定**：生成长度要事先给定。评测时基线直接用真实长度，这句出处是 Table 2 的表注和补充材料附录 C（三个确定性基线还额外拿到了真值初始姿态："These methods requires initial pose as well as ground truth motion length during inference"）；
- **数据少**：唯一可用的数据集 KIT Motion-Language 规模小、以走路为主。论文正文第 1 节写 3,010 段，Table 1 与第 2 节写 3,911 段 / 6,278 条描述——两处数字不一致，官方数据集仓库 README 用的是 3,911 / 6,278。

</details>

### 三个内在难点

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：同一句话 → 长短不一、做法不一；文本本身从短语到长句</summary>

1. **长度可变**：同一个模型生成的动作长度应当不同（「挥手」可长可短）；
2. **一句多解**：同一句描述通常有多种合理的做法（论文图 1 同一句话的两次生成）；
3. **文本形式多样**：描述可能是一个短语，也可能是一串带先后顺序的复杂长句。

论文的回应分两部分：方法上是 **text2length + text2motion** 两阶段，中间表示换成 **motion snippet code**；数据上构建 **HumanML3D**，覆盖日常、运动、杂技、舞蹈等动作，不止走路。

</details>

---

## 🔧 方法详解

<div class="mermaid">
flowchart TB
    subgraph PRE["(a) 预处理：运动自编码器"]
      P["姿态序列 p_1..p_T'<br/>263 维 / 帧"] -->|"2 层 Conv1d k=4 s=2"| CS["snippet code c_s^1..c_s^T<br/>T = T'/4，512 维"]
      CS -->|"2 层 ConvTranspose1d"| PH["重建姿态 + 触地"]
    end
    subgraph INF["(c) 推理"]
      X["文本"] --> TL["text2length<br/>50 类长度分布"]
      TL -->|"采样 T"| VAE["时序 VAE<br/>先验采 z_t，生成器滚 T 步"]
      X --> TE["文本编码器<br/>GloVe + 词性 → Bi-GRU"]
      TE -->|"句向量 s / 词特征 w"| VAE
      VAE -->|"ĉ_s^1..ĉ_s^T"| DEC["运动解码器 D"]
      DEC --> OUT["4T 帧动作"]
    end
    style CS fill:#e8f4fd,stroke:#1f78b4
    style VAE fill:#eafaf1,stroke:#27ae60
</div>

### 1. 数据集构建：从动捕到「每段三句话」

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：20 fps、≤10 s、统一骨架与朝向、AMT 标注、镜像扩增</summary>

论文第 4 节与补充材料附录 D：

- **来源**：HumanAct12 与 AMASS，两者都是公开动捕，覆盖日常（walking、jumping）、运动（swimming、karate）、杂技（cartwheel）、艺术（dancing），但都没有文字描述。官方 `index.csv` 一共 18 个来源：17 个 AMASS 子集 13,425 段（KIT 4,648、CMU 2,913、BMLmovi 1,839、Eyes_Japan 1,465 ……）加 HumanAct12 1,191 段。
- **归一化**：缩放到 20 FPS；超过 10 秒的**随机裁成 10 秒**；重定向到一副默认人体骨架模板；初始朝向统一转到 **Z+**。代码里「统一骨架」是三步：按腿长比例缩放 → 逆运动学求关节旋转 → 套上模板（样例 `000021`）的骨长再正运动学（`uniform_skeleton()`）。
- **标注**：在 Amazon Mechanical Turk 上招募英语母语、平均通过率 **>92%** 的标注者，每段至少写 **5 个词**，每段收集 **3 条**来自不同标注者的描述；界面（补充材料图 3）鼓励写清动作类型、方向、身体部位、速度、轨迹、相对位置与风格，避免过于笼统（a man walks）或过于具体（绝对距离、角度），说明不用描述开头的 T-Pose、也不要写相对地面的绝对位置；动作太复杂时允许只描述其中一段并标出起止秒数；不合格描述人工剔除。
- **统计**：14,616 段 / 44,970 条描述 / 5,371 个词 / 28.59 小时；平均 7.1 秒，最短 2 秒、最长 10 秒；描述平均 12 词、中位数 10 词。
- **扩增与切分**（第 5 节）：把动作左右镜像，同时替换描述里的关键词（left ↔ right，仓库 README 还举了 clockwise ↔ counterclockwise），数据量翻倍；按 0.8 : 0.15 : 0.05 切成训练 / 测试 / 验证。

几个小核对（我们在官方 `texts.zip` 与 `index.csv` 上数的）：

- 28.59 h × 3600 ÷ 14,616 段 = 7.04 s，与论文写的「平均 7.1 s」同一量级（差异可能来自取整或统计口径，**这是我的推测**）；
- 14,616 个非镜像文本里一共 43,692 行描述，平均 12.37 词、中位数 10；1,617 条（3.70%）只描述了一个子区间（起止秒数不是 0.0），333 条不足 5 个词。

</details>

### 2. 姿态表示：一帧 263 维

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：根节点存角速度、xz 速度和绝对高度，关节存相对根的位置 / 6D 旋转 / 速度，再加 4 维触地</summary>

论文第 5 节把一帧定义为元组 $(\dot r^a, \dot r^x, \dot r^z, r^y, j^p, j^v, j^r, c^f)$：

| 分量 | 含义 | HumanML3D 维数（代码） |
|---|---|---|
| $\dot r^a$ | 根节点绕 Y 轴的角速度 | 1 |
| $\dot r^x, \dot r^z$ | 根节点在 XZ 平面的线速度 | 2 |
| $r^y$ | 根节点高度（**绝对值**，不是速度） | 1 |
| $j^p$ | 关节在根坐标系下的位置（ric） | $3 \times 21 = 63$ |
| $j^r$ | 关节的 6D 连续旋转 | $6 \times 21 = 126$ |
| $j^v$ | 关节在根坐标系下的速度 | $3 \times 22 = 66$ |
| $c^f$ | 脚跟 / 脚尖速度阈值化得到的触地标签 | 4 |

合计 $1+2+1+63+126+66+4 = 263$；KIT-ML 只有 21 个关节，是 251 维（补充材料附录 A）。论文还写了两句容易漏的：训练时所有动作都裁成 4 的倍数帧（这是 $T = T'/4$ 成立的前提），姿态处理沿用文献 [13]（Holden 等人的 PFNN）的做法。

设计意图（论文没展开，下面是**我们的理解**）：根节点在水平方向只存**速度**、关节都以根为参照，全局平移和水平朝向就不进特征；高度存绝对值，是因为蹲下、跳起需要它。6D 旋转避免四元数 / 欧拉角的不连续——它是代码从关节位置反解逆运动学得到的，不是 SMPL 的 pose 参数；触地标签是由速度阈值得到的 0 / 1，不是接触力，用来让解码器预测脚是否着地、压制脚滑。

</details>

<div class="paper-demo" data-demo="humanml3d-clip" id="demo-clip"><p class="demo-fallback">（本节含交互演示：片段 012314 的 263 维，需要启用 JavaScript）</p></div>

### 3. 运动自编码器：每 4 帧一个 snippet code

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两层 kernel 4 / stride 2 卷积，L1 重建 + 稀疏 + 平滑，触地只给解码器</summary>

论文 3.1 节。编码器 $E$ 在时间轴上做一维卷积，把姿态序列 $P=(p_1,\dots,p _ {T'})$ 变成 snippet code 序列 $C_s=(c_s^1,\dots,c_s^T)$，解码器 $D$ 用反卷积还原：

$$C_s = E(P), \qquad \hat P = D(C_s)$$

损失（式 2）：

$$\mathcal{L} _ {E,D} = \sum _ {t'} \lVert \hat p _ {t'} - p _ {t'} \rVert_1 + \lambda _ {spr} \sum_t \lVert c_s^t \rVert_1 + \lambda _ {smt} \sum_t \lVert c_s^t - c_s^{t-1} \rVert_1$$

- 两层卷积、kernel 4、stride 2，所以 $T = T'/4$；code 是 512 维（附录 A）。代码里编码器每层卷积后接 Dropout(0.2) 和 LeakyReLU(0.2)，解码器不带 Dropout。
- **触地标签不喂给编码器**，只让解码器预测，用来防脚滑。
- $\lambda _ {spr} = \lambda _ {smt} = 0.001$（附录 A）：稀疏项压 code 的幅度，平滑项让相邻 code 连续。
- 论文说一个 code 的感受野是 8 帧、约 0.5 秒；按两层 $k=4, s=2$ 卷积严格算是 $4 + 3 \times 2 = 10$ 帧，20 fps 下正好 0.5 秒（8 帧只有 0.4 秒；**10 帧是我的推算**）。
- 自编码器单独先训：官方命令 `--window_size 24`，即每次取 24 帧（6 个 code）的窗口。

为什么要这一层：相比逐帧姿态，snippet code 携带局部时间语义，生成器只需走 $T'/4$ 步。Table 4 消融里去掉它（w/o SnC），R-Precision top-1 从 0.455 掉到 0.370；论文图 6 观察到去掉它之后，动作开头看着合理、贴合上下文，越往后越跟不上文字描述（论文归因于缺少时间上的刻画）。

</details>

### 4. Text2Length：从文本得到长度分布

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：50 个离散长度类、交叉熵训练、推理时按分布采样；补充材料图 6 的八条分布</summary>

论文 3.2 节：把「动作多长」当成条件密度估计 $p(T \mid x_1,\dots,x_M)$，论文说沿用 pixelCNN 的做法。文本编码器得到句向量，接 MLP + softmax，输出离散长度上的多项分布；**每增加 1 等于 4 帧**，$T _ {max}=50$ 对应 200 帧 = 10 秒；用交叉熵训练。推理时从这个分布**采样**，同一句话因此能生成不同时长的动作。代码里这是一个独立的 `MotionLenEstimatorBiGRU`（不和时序 VAE 共用文本编码器），MLP 是 1024 → 512 → 256 → 128 → 50。

补充材料附录 F 与图 6：训练时丢掉不足 40 帧（2 秒）的动作，所以图里画的是 10 到 50；概率高的长度离真实值都不远；**周期动作（如「挥左手」）的分布比非周期动作（如「绊一下、向右弯腰」）更平**。我们把图 6 的八张子图按像素量了一遍（读图近似值，零线附近 1–2 像素被坐标轴挡住，误差约 ±0.001）：

- 八张里有 3 张的众数正好等于真实长度（34 / 49 / 40）；偏得最远的是「左右各踏一步」，众数 21、真实 25；
- 「挥左手」是双峰（16 和 44 附近），「跑去搬东西再走回」也是双峰（30 和 49 附近）；
- 按读图值算熵：「挥左手」3.28、「绊一下」2.29（40 类均匀分布的上限是 3.69）——周期动作更平，和论文的说法一致；
- 图里 k = 50 那一格八张都是空的：代码是 `num_classes = 200 // 4 = 50`，类下标 0–49。

</details>

<div class="paper-demo" data-demo="humanml3d-length" id="demo-length"><p class="demo-fallback">（本节含交互演示：Text2Length 采样，需要启用 JavaScript）</p></div>

### 5. Text2Motion：时序 VAE

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：词注意力、先验 / 后验 / 生成器三个 GRU、到达倒计时位置编码、ELBO</summary>

论文 3.3 节。文本编码器给出词特征 $w _ {1:M}$ 与句向量 $s$；时序 VAE 由**生成器 $F_\theta$、后验 $F_\phi$、先验 $F_\psi$** 三个循环网络组成，逐个生成 snippet code。

- **文本编码器**：GloVe 300 维词向量 + 词性（POS）标签；另外人工整理一个动作相关词典，把方向（DIR）、身体部位（BOD）、物体（OBJ）、动作（ACT）四类词单独标出来，标签经嵌入后**加**到词向量上，再进双向 GRU（补充材料图 2(a)）。句向量用来初始化 VAE 各 GRU 的隐状态，词特征在每一步经注意力进入。
- **局部词注意力**（式 4）：查询来自生成器上一步隐状态，键 / 值来自词特征；每一步只算一次，三个网络共用这一个注意力向量：

$$Q = h_\theta^{t-1} W^Q,\quad K = w _ {1:M} W^K,\quad V = w _ {1:M} W^V,\quad w _ {att}^t = \mathrm{softmax}\!\left(\frac{QK^\top}{\sqrt{d _ {att}}}\right) V$$

- **到达倒计时位置编码**（式 5）：每一步加上 $\mathrm{PE}(T-t)$，$\mathrm{PE} _ {T-t, 2i} = \sin\big((T-t)/10000^{2i/d}\big)$、$\mathrm{PE} _ {T-t, 2i+1} = \cos\big((T-t)/10000^{2i/d}\big)$，$d = 1024$；加在「输入拼接 → MLP」之后、进 GRU 之前。论文的动机是让网络知道「现在在哪、还要走多远」；Table 4 里去掉它 top-1 只掉 0.011（0.455 → 0.444），论文自己也说它和词性标签的影响相对小。
- **三个网络的输入**：后验看 $[c_s^{t-1}, c_s^t, w _ {att}^t]$，输出 $\mathcal{N}(\mu_\phi(t), \sigma_\phi(t))$；先验看 $[c_s^{t-1}, w _ {att}^t]$，输出 $\mathcal{N}(\mu_\psi(t), \sigma_\psi(t))$；生成器看 $[c_s^{t-1}, w _ {att}^t, z_t]$，重建 $\hat c_s^t$。训练时 $z_t$ 从后验采，推理时从先验采。三个 GRU 都是单层、隐层 1,024（补充材料附录 A），$z$ 是 128 维。
- 先验不是固定的 $\mathcal{N}(0, I)$，而是学出来的 $p_\psi(z_t \mid c_s^{1:t-1}, c)$。整个模型最大化一个带权的变分下界（式 3）：

$$\log p(C_s) \ge \sum _ {t=1}^{T} \Big[ \mathbb{E} _ {q_\phi(z_t \mid c_s^{1:t}, c)} \log p_\theta(c_s^t \mid c_s^{1:t-1}, z _ {1:t}, c) - \lambda _ {KL}\, D _ {\mathrm{KL}}\big(q_\phi(z_t \mid c_s^{1:t}, c) \,\Vert\, p_\psi(z_t \mid c_s^{1:t-1}, c)\big) \Big]$$

  条件里的 $1:t$ 靠 GRU 的循环记忆实现；下面式 6 的 L1 损失是它的实用版。
- 最后用预训练的解码器 $D$ 把 code 序列还原成姿态；text2motion 训练时 $D$ 一起微调。

</details>

### 6. 训练方案：三项损失 + 课程学习 + teacher forcing

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：λ_KL = 0.01、从短到长逐个加 code、p_tf = 0.4、c^0 是平均姿态</summary>

总损失（式 6）：

$$\mathcal{L} = \mathcal{L}^{code} _ {rec} + \lambda _ {mot}\,\mathcal{L}^{mot} _ {rec} + \lambda _ {KL}\,\mathcal{L} _ {KL}$$

其中 $\mathcal{L}^{code} _ {rec} = \sum_t \lVert \hat c_s^t - c_s^t \rVert_1$，$\mathcal{L}^{mot} _ {rec} = \sum _ {t'} \lVert \hat p _ {t'} - p _ {t'} \rVert_1$（生成的 code 经正在微调的解码器 $D$ 还原后，和真值姿态比），$\mathcal{L} _ {KL}$ 是逐步的后验—先验 KL。附录 A：$\lambda _ {mot}=1$，$\lambda _ {KL}$ 在 HumanML3D 上取 0.01、KIT-ML 上取 0.005（附录 J 的表里写成 0.05(K)，是笔误，官方 README 的 KIT 命令也是 0.005）；Adam，学习率 $2\times10^{-4}$，解码器 $D$ 的学习率小 10 倍（$2\times10^{-5}$）。

- **课程学习**：先只学前 $T _ {cur}$ 个 code，只用长度不少于 $T _ {cur}$ 的动作；验证集重建损失开始上升就多加一个 code，直到 $T _ {max}$（附录 A：$T _ {max}=50$、$T _ {cur}=8$；代码从 10 起步，见「🚶 第 8 步」）。
- **teacher forcing / scheduled sampling**：以概率 $p _ {tf}=0.4$ 对**整条**目标序列用真值 code 作下一步输入，否则用自己生成的。
- **边界条件**：$c_s^0$ 是编码器 $E$ 对平均姿态的输出。
- 附录 A 还提到：Z-score 归一化后，把 $(\dot r^a, \dot r^x, \dot r^z, r^y, c^f)$ 的幅度放大 5 倍以强调它们（官方脚本实际是 25 倍，见「🚶 第 4 步」）；训练时以抛硬币的概率砍掉输入序列最后 4 帧，增加随机性。

</details>

### 7. 评测指标

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：对比学习特征提取器 + R-Precision / MultiModal Dist / FID / Diversity / MultiModality</summary>

没有现成的「动作版 Inception」，论文（补充材料附录 B 与图 2(b)）自己训一对特征提取器：文本提取器与文本编码器同结构，动作先经预训练编码器 $E$ 变成 snippet code，再进隐层 1,024 的双向 GRU；两边的特征都是 512 维，$E$ 冻结、只训两个提取器。用对比损失训练：

$$D _ {s,m} = \lVert s - m \rVert_2,\qquad \mathcal{L} _ {Cta} = (1-y)\,D _ {s,m}^2 + y\,\max(0,\ m - D _ {s,m})^2$$

$y=0$ 表示配对，margin $m=10$。测试数据不参与这一步。代码里的负样本是把整个 batch 的文本循环移位（`shift` 随机取）。

- **R-Precision**（本文新提出）：每个生成动作，配上它的真值描述和测试集里随机 31 条不相关描述，共 32 条；按特征欧氏距离排序，统计真值落在 top-1 / 2 / 3 的比例。随机猜的 top-1 是 $1/32 \approx 3.1\%$，top-3 是 $3/32 \approx 9.4\%$。代码里这 32 条就是一个 batch（`batch_size = 32`）。
- **MultiModal Dist**（本文新提出）：生成动作特征与其描述特征的平均欧氏距离。
- **FID / Diversity / MultiModality**：沿用 Action2Motion 的定义。FID 是生成动作与真实动作特征分布的 Fréchet 距离；Diversity 从所有生成动作里随机抽两组各 $S_d=300$ 个，算成对平均距离（越接近真实动作的值越好）；MultiModality 对同一描述生成多次，每句抽两组各 $S_m=10$ 个，算平均距离。
- 每个实验重复 20 次，报 95% 置信区间（代码是 $1.96\,\sigma/\sqrt{20}$）。

</details>

<div class="paper-demo" data-demo="humanml3d-rprec" id="demo-rprec"><p class="demo-fallback">（本节含交互演示：R-Precision 玩具，需要启用 JavaScript）</p></div>

---

## 📊 实验结果

### HumanML3D 测试集（Table 2）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：top-1 0.455 vs 真实 0.511 vs Language2Pose 0.246；FID 1.087，约为 Language2Pose 的 1/10</summary>

| 方法 | Top-1 ↑ | Top-2 ↑ | Top-3 ↑ | FID ↓ | MM Dist ↓ | Diversity → | MModality ↑ |
|---|---|---|---|---|---|---|---|
| 真实动作 | 0.511 | 0.703 | 0.797 | 0.002 | 2.974 | 9.503 | - |
| Seq2Seq | 0.180 | 0.300 | 0.396 | 11.75 | 5.529 | 6.223 | - |
| Language2Pose | 0.246 | 0.387 | 0.486 | 11.02 | 5.296 | 7.676 | - |
| Text2Gesture | 0.165 | 0.267 | 0.345 | 7.664 | 6.030 | 6.409 | - |
| MoCoGAN | 0.037 | 0.072 | 0.106 | 94.41 | 9.643 | 0.462 | 0.019 |
| Dance2Music | 0.033 | 0.065 | 0.097 | 66.98 | 8.116 | 0.725 | 0.043 |
| Ours w/ real length | 0.457 | 0.639 | 0.740 | 1.067 | 3.340 | 9.188 | 2.090 |
| Ours | 0.455 | 0.636 | 0.736 | 1.087 | 3.347 | 9.175 | 2.219 |

（表中置信区间略去；所有基线都直接用真实长度，「Ours」用 text2length 采样的长度。论文里加粗的是每列最好的结果——除 MModality 外都是「Ours w/ real length」那一行，「Ours」是下划线的第二名。）

几个现算的比例：

- Ours 的 top-1 是真实动作的 $0.455 / 0.511 = 89.0\%$，top-3 是 $0.736 / 0.797 = 92.3\%$；
- FID 是 R-Precision 最好的基线 Language2Pose 的 $1.087 / 11.02$，约 1/10（$11.02 / 1.087 \approx 10.1$）；FID 最好的基线其实是 Text2Gesture（7.664），本文约为它的 1/7；
- 用采样长度代替真实长度，MultiModality 从 2.090 升到 2.219（+6.2%），top-1 只差 0.002；不过两者的 95% 置信区间重叠（2.090 + 0.083 = 2.173 > 2.219 − 0.074 = 2.145），KIT-ML 上的差别（1.482 → 2.052，+38.5%，区间不重叠）更能说明采样长度带来了多样性；
- Diversity 一列是越接近真实值（9.503）越好，Ours（9.175）反而比 w/ real length（9.188）略远，所以「更多样」只有 MultiModality 撑得住；
- MoCoGAN、Dance2Music 的 top-1（0.037 / 0.033）几乎就是随机猜的 $1/32 \approx 0.031$。

</details>

### KIT-ML 测试集（Table 3）与用户研究

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：KIT-ML 上 top-1 0.361 vs 真实 0.424；约 72% 的生成动作被用户排进前二</summary>

| 行 | Top-1 | Top-2 | Top-3 | FID | MM Dist | Diversity | MModality |
|---|---|---|---|---|---|---|---|
| 真实动作 | 0.424 | 0.649 | 0.779 | 0.031 | 2.788 | 11.08 | - |
| Language2Pose（最好的基线） | 0.221 | 0.373 | 0.483 | 6.545 | 5.147 | 9.073 | - |
| Ours w/ real length | 0.370 | 0.569 | 0.693 | 2.770 | 3.401 | 10.91 | 1.482 |
| Ours | 0.361 | 0.559 | 0.681 | 3.022 | 3.488 | 10.72 | 2.052 |

（Seq2Seq 一行的 ± 在 pdftotext 里错了位，以 PDF 渲染为准：0.103 / 0.178 / 0.241 / 24.86 / 7.960 / 6.744。）

用户研究（正文 §5.1.2 与补充材料附录 C、D、图 4）：AMT、master 资格，测试集随机 50 条描述；每条描述把 7 段火柴人动画（5 个基线 + 本文 + 真实动作，顺序打乱）给 5 个用户排序，评判标准是自然程度、和描述是否对得上、连贯与真实感，30 秒内交卷的自动拒收。本文最受偏好，约 **72%** 的生成动作被排进前二；按论文图 5 的堆叠柱读，是第 1 名 21.3% + 第 2 名 50.7%，也就是有两成多的时候用户把本文排在了真实动作前面（真实动作自己是第 1 名 71.0%、第 2 名 19.8%）。Language2Pose 第二受偏好；两个非确定性基线最差（最不受欢迎一档里 Dance2Music 40.5%、MoCoGAN 38.6%）。

</details>

### 消融（Table 4）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：去掉 snippet code 或词注意力掉得最多，词性与位置编码影响较小；局限分三类</summary>

| 变体 | Top-1 | Top-2 | Top-3 | FID |
|---|---|---|---|---|
| Ours | 0.455 | 0.636 | 0.736 | 1.087 |
| w/o SnC（snippet code） | 0.370 | 0.538 | 0.642 | 1.200 |
| w/o Att（词注意力） | 0.396 | 0.570 | 0.674 | 1.833 |
| w/o PoS（词性标签） | 0.443 | 0.622 | 0.723 | 1.157 |
| w/o PoE（位置编码） | 0.444 | 0.627 | 0.729 | 1.229 |

top-1 的掉幅：SnC −0.085、Att −0.059、PoS −0.012、PoE −0.011。论文说「去掉 SnC 或 Att，R-Precision 下降超过 6%」，又说词性和位置编码「下降约 2%」——两句话都按**相对掉幅**读才对得上（**口径是我按表算的**）：

| 去掉 | top-1 相对掉幅 | top-2 相对掉幅 |
|---|---|---|
| SnC | 18.7% | 15.4% |
| Att | 13.0% | 10.4% |
| PoS | 2.6% | 2.2% |
| PoE | 2.4% | 1.4% |

FID 的排序和 R-Precision 不一样：去掉词注意力 FID 升到 1.833（+68.6%），最差；去掉位置编码的 1.229 比去掉 snippet code 的 1.200 还差。

局限（附录 I 与补充材料图 7、8），论文分开写了三类：

- **数据集外的罕见动作**：补充材料图 7 里「stomp（跺脚）」之后的「step back」没做出来；
- **太复杂的动作**：补充材料图 8 里的「scratch（挠头）」「pitching baseball（投棒球）」超出了方法的能力；
- **细粒度的身体部位**：对「左腿 / 右腿」这类描述不敏感（图 8 的「lightly kicks … with their left leg」）。

另外，超长文本和与环境的交互都还没覆盖。

</details>

---

## 🚶 具体实例：官方片段 012314 从数据到生成的每一步

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（9 节）：环境设定 / 第 1 步：三条描述与分词 / 第 2 步：263 维逐段拆开 / 第 3 步：触地阈值 / 第 4 步：Z-score 与放大 / 第 5 步：42 个 snippet code / 第 6 步：长度分布与交叉熵 / 第 7 步：时序 VAE 每一步的维度账 / 第 8 步：课程学习里的这一段</summary>

> ⚠️ 本节的统计量是我们用 numpy 读官方仓库自带的 `HumanML3D/new_joint_vecs/012314.npy`、`new_joints/012314.npy`、`Mean.npy` / `Std.npy`、`index.csv` 和 `texts.zip` 算的；网络结构与超参来自 `text-to-motion` 仓库的代码；第 6 步的长度分布是从补充材料图 6 量出来的读图近似值。**我们没有下载 AMASS、也没有跑训练或推理**。标「示意」的数字（注意力打分、KL 算例）是构造的，用来演示机制。动画第 3–9 幕和三个交互演示用的是同一组数字。

<h3 id="实例-环境设定">环境设定</h3>

- 片段：`012314`，官方仓库为了让使用者核对处理结果而自带的那一段（`motion_representation.ipynb` 用它做 double check）。按 `index.csv` 第 12316 行，它来自 AMASS 的 Eyes_Japan 子集，源文件是 `tennis-15-first service-yamaoka_poses.npy` 的第 149–320 帧——**一段网球一发**。它在 `train.txt` 里（镜像版 `M012314` 也在），属于训练集。
- 特征：`new_joint_vecs/012314.npy` 形状 $(170, 263)$；关节位置 `new_joints/012314.npy` 形状 $(170, 22, 3)$；20 fps，$170/20 = 8.5$ 秒。
- 速度要相邻两帧相减，所以 `process_file` 输出的特征比原始帧少一帧：原始片段是 $320 - 149 = 171$ 帧。

<h3 id="实例-第-1-步三条描述与分词">第 1 步：三条描述与分词</h3>

`texts/012314.txt` 的三行（`原句#分词/词性#起#止`）：

```text
a person appears to be playing tennis and shoots the ball with the racket in his right hand#a/DET person/NOUN appear/VERB to/PART be/AUX play/VERB tennis/NOUN and/CCONJ shoot/VERB the/DET ball/NOUN with/ADP the/DET racket/NOUN in/ADP his/DET right/ADJ hand/NOUN#0.0#0.0
walking sideways and almost falling.#walk/VERB sideways/ADV and/CCONJ almost/ADV fall/VERB#0.0#0.0
a person lunges and hits something, then backing up.#a/DET person/NOUN lunge/VERB and/CCONJ hit/VERB something/PRON then/ADV back/VERB up/ADP#0.0#0.0
```

- 起止都是 0.0，表示描述整段；三个人对同一段动作的理解差别不小（打网球 / 侧着走、险些摔一跤 / 前冲击打再后退），这正是「一句多解」的反面——**一段动作也有多种说法**。镜像版 `M012314` 的第一句把 right 换成了 left。
- `text_process.py` 用 spaCy 分词，名词、动词取原形（`playing → play`），去掉非字母 token；两个细节：分词前先 `replace('-', '')`，`left` 不做词形还原（免得被还原成 leave）。第一句得到 18 个 token，加上 `sos` / `eos` 是 20 个，再用 `unk` 补到 `max_text_len + 2 = 22`。
- `WordVectorizer` 把词性变成 15 维 one-hot（9 个词性 + 5 个关键词类 + OTHER）。关键词类**取代**原词性：`ball` 在物体表里 → `Obj_VIP`，`right` 在方向表里 → `Loc_VIP`，`hand` 在身体部位表里 → `Body_VIP`；第二句的 `walk` → `Act_VIP`，第三句的 `back`、`up` → `Loc_VIP`。`play`、`shoot` 不在动作词表里；`PART`、`CCONJ` 不在 15 类里，记作 `OTHER`。

<h3 id="实例-第-2-步263-维逐段拆开">第 2 步：263 维逐段拆开</h3>

| 下标区间 | 分量 | 维数 | 片段 012314 上的读数 |
|---|---|---|---|
| [0, 1) | 根角速度 | 1 | 存的是每帧转角的**一半**（取相邻帧根四元数 y 分量的 arcsin）：170 行累加 −22.8°，乘 2 才是转角，约 **−45.6°**（按 `recover_root_rot_pos` 只累加前 169 行是 −45.3°） |
| [1, 3) | 根 xz 线速度 | 2 | 水平累计走了 5.46 m：先侧向冲出约 2.3 m（第 49 帧离起点 2.34 m），第 50–60 帧停在那里，再退回起点，首尾只差 6 cm |
| [3, 4) | 根高度 | 1 | 绝对高度：平均 0.88 m，最高 1.06 m（第 27 帧，发球起跳），最低 0.70 m（第 41 帧，落地弓步） |
| [4, 67) | 21 个关节的局部位置 | 63 | 右腕最高 1.94 m（第 27 帧），比头部关节最高点 1.52 m 还高 |
| [67, 193) | 21 个关节的 6D 旋转 | 126 | 由关节位置反解逆运动学得到 |
| [193, 259) | 22 个关节的局部速度 | 66 | 右腕峰值 10.0 m/s（第 28 帧，1.4 s），左腕峰值 3.7 m/s |
| [259, 263) | 触地 | 4 | 见第 3 步 |

右腕在第 27 帧举到 1.94 m、第 28 帧速度冲到 10 m/s，骨盆也在第 27 帧到最高点——这就是发球时的起跳挥拍；左腕只有 3.7 m/s，和「右手持拍」的描述对得上。侧向冲出再退回，正好对应第二、三条描述（walking sideways / lunges … then backing up）。

<h3 id="实例-第-3-步触地阈值">第 3 步：触地阈值</h3>

`foot_detect(positions, 0.002)`：某只脚的关节相邻两帧位移平方和小于 0.002 m²，就记作触地。

$$\sqrt{0.002} = 0.0447\ \text{m/帧} \quad\Rightarrow\quad 0.0447 \times 20 = 0.894\ \text{m/s}$$

四个通道依次是左踝（7）、左脚（10）、右踝（8）、右脚（11）。片段 012314 上触地占比分别是 79.4%、81.2%、74.7%、74.7%（135 / 138 / 127 / 127 帧，共 170）；全数据集的均值（`Mean.npy`）是 84.8%、86.1%、84.9%、86.1%——这段比平均更「离地」，符合发球的起跳和垫步。用同一公式从 `new_joints` 重算，前 169 帧逐帧一致（只有 169 对相邻帧，占比是 79.3% / 81.1% / 74.6% / 74.6%，第一个交互演示用的就是这个重算版）。

<h3 id="实例-第-4-步z-score-与放大">第 4 步：Z-score 与放大</h3>

`cal_mean_variance.ipynb` 把每一组特征的标准差取组内平均；训练时 `Text2MotionDataset` 再把根节点 4 维和触地 4 维的标准差除以 `feat_bias = 5`，等于把它们的数值放大 5 倍（附录 A 说的「放大 5 倍以强调」）。

以触地通道 259 为例，均值 0.848、组标准差 0.356：

| | 原始值 0 | 原始值 1 |
|---|---|---|
| 不放大 $(x-\mu)/\sigma$ | −2.38 | +0.43 |
| 放大 5 倍 $(x-\mu)/(\sigma/5)$ | **−11.9** | **+2.13** |
| 官方脚本实际 $(x-\mu)/(\sigma/25)$ | −59.6 | +10.7 |

最后一行是我们读代码推出来的（**没有用发布的 checkpoint 核对**）：`train_comp_v6.py` 只读一次 `Std.npy`，再用同一个数组先后构造训练集和验证集两个 `Text2MotionDataset`；构造函数里的 `std[0:1] = std[0:1] / opt.feat_bias` 是原地赋值，所以这几维被除了两次，等于放大 25 倍。保存下来的 `meta/std.npy` 也是除过 25 的版本，评测时读的就是它，所以训练和评测前后一致。不管 5 倍还是 25 倍，「脚离地」在 L1 损失里的分量都比普通关节通道大一个量级，网络会优先把它学对。

<h3 id="实例-第-5-步42-个-snippet-code">第 5 步：42 个 snippet code</h3>

- 裁到 4 的倍数：评测用的 `Text2MotionDatasetV2` 与 `Text2MotionDataset` 的非训练分支都以 2/3 概率取 `single`（$\lfloor 170/4 \rfloor \times 4 = 168$ 帧）、1/3 概率取 `double`（再少 4 帧，164 帧），窗口起点再在 0–2 帧（`single`）或 0–6 帧（`double`）里随机。这就是附录 A「抛硬币砍掉最后 4 帧」在代码里的样子，只不过概率是 1/3、起点也是随机的。
- 编码器输入去掉 4 维触地：$168 \times 259$。
- `Conv1d(259→512, k=4, s=2, p=1)`：长度 $\lfloor (168+2-4)/2 \rfloor + 1 = 84$；再一层 `Conv1d(512→512)`：$84 \to 42$；最后 `Linear(512→512)`。结果是 **42 个 512 维 code**。
- 数据量：$168 \times 263 = 44{,}184$ 个数 → $42 \times 512 = 21{,}504$ 个数，少 2.05 倍；更重要的是生成器只需走 42 步。
- 参数量（我按层数的）：编码器 $259\cdot512\cdot4+512 + 512\cdot512\cdot4+512 + 512\cdot512+512 = 1{,}842{,}688$；解码器 `ConvTranspose1d(512→512)`、`ConvTranspose1d(512→263)`、`Linear(263→263)` 共 1,657,407。
- 窗口起点为 0 时，右腕峰值所在的第 28 帧落在第 8 个 code（帧 28–31）里；两层卷积叠起来，第 8 个 code 看得到第 25–34 帧（10 帧）。起点取 1 或 2 时，原第 28 帧会落进第 7 个 code。

<h3 id="实例-第-6-步长度分布与交叉熵">第 6 步：长度分布与交叉熵</h3>

`train_length_est.py`：`num_classes = 200 // 4 = 50`，标签是 `m_lens // 4`。这段裁成 168 帧时标签是 42，裁成 164 帧时是 41。

论文没有给片段 012314 的长度分布，我们用补充材料图 6 里量出来的两条（读图近似值，归一化后）走一遍；动画第 6 幕和第二个交互演示是同一组数：

| | 「Person stumbles and bends to their right side」 | 「A person waves with their left hand」 |
|---|---|---|
| 类型 | 非周期 | 周期 |
| 真实长度 | 25 个 code（100 帧，5.0 s） | 45 个 code（180 帧，9.0 s） |
| 众数 / 最高概率 | 26 / 0.233 | 44 / 0.108 |
| $p(\text{真实})$ / 交叉熵 $-\ln p$ | 0.168 / **1.79** | 0.043 / **3.14** |
| 真实长度 ±2 以内的概率 | 80.7% | 23.7% |
| 熵（nats，均匀分布上限 3.69） | 2.29 | 3.28 |
| 累积概率 0.2 / 0.5 / 0.9 取到 | **23 / 25 / 27** 个 code | **15 / 21 / 44** 个 code |
| 对应时长 | 4.6 / 5.0 / 5.4 s | 3.0 / 4.2 / 8.8 s |

推理时 `torch.multinomial` 采样，若采到不足 10 个 code，`comp_v6_model_dataset.py` 会再采（最多再采两次）。周期动作的分布摊得开，同一句话三次采样能从 3 秒采到 8.8 秒。

<h3 id="实例-第-7-步时序-vae-每一步的维度账">第 7 步：时序 VAE 每一步的维度账</h3>

| 部件（`networks/modules.py`） | 输入 → 输出 |
|---|---|
| `TextEncoderBiGRU` | GloVe 300 + `pos_emb: Linear(15→300)` 相加 → `Linear(300→512)` → 双向 GRU(512)：每个词 1024 维特征，句向量 1024 |
| `AttLayer` | 查询 $h_\theta^{t-1}$（1024）→ `W_q`；键 / 值 = 词特征（1024）→ `W_k`（无 bias）/ `W_v`；输出 $w _ {att}^t$ 512 维，缩放 $\sqrt{512} \approx 22.6$ |
| 先验 `TextDecoder` | $[c^{t-1}, w _ {att}^t]$ = 512 + 512 = **1,024** → GRUCell(1024) → $\mu, \log\sigma^2$ 各 128 |
| 后验 `TextDecoder` | $[c^{t-1}, c^t, w _ {att}^t]$ = **1,536** → 同上 |
| 生成器 `TextVAEDecoder` | $[c^{t-1}, w _ {att}^t, z_t]$ = 512 + 512 + 128 = **1,152** → GRUCell(1024) → `Linear(1024→1024)` → `Linear(1024→512)`：$\hat c^t$ |

这三个输入维数和补充材料 Table 1 里 `embedding` 层的 1024 / 1536 / 1152 对得上。三个 GRU 的初始隐状态都由句向量经 `z2init: Linear(1024→1024)` 得到；位置编码维数 1024，加在 `emb` 的输出上。词特征按句子实际长度打包编码（`pack_padded_sequence`），这一句单独编码是 20 × 1024；只有和更长的句子同一个 batch 时才补零到 22 行，而 `AttLayer` 没有 mask，补零的位置打分为 0、仍会分到一点注意力权重。

- **注意力示意**（打分是编的）：对 play / tennis / shoot / ball / racket 五个词，第 2 步打分 $[1.8, 1.5, 0.2, 0.1, 0.4]$，softmax 后权重 0.422 / 0.312 / 0.085 / 0.077 / 0.104；第 8 步（挥拍那个 code）打分 $[0.2, 0.4, 2.0, 1.3, 1.1]$，权重 0.073 / 0.089 / 0.440 / 0.219 / 0.179。
- **到达倒计时**：这段 $T = 42$，论文记号里第 $t=8$ 步还剩 $T-t = 34$ 个 code。代码里循环下标 $i$ 从 0 开始，`tta = m_lens // 4 - i`，第 8 步（$i=7$）传入的是 35，比论文记号多 1。
- **KL 示意**：代码的 `kl_criterion` 按 $\log\frac{\sigma_\psi}{\sigma_\phi} + \frac{\sigma_\phi^2 + (\mu_\phi-\mu_\psi)^2}{2\sigma_\psi^2} - \frac12$ 逐维求和。若某维后验 $\mathcal{N}(0.5, 0.8^2)$、先验 $\mathcal{N}(0, 1)$，这一维是 $\ln 1.25 + (0.64 + 0.25)/2 - 0.5 = 0.168$；128 维都这样就是 21.5，乘 $\lambda _ {KL}=0.01$ 后计入总损失 0.215。代码最后对「batch × 步数」取平均（`kld.sum() / mu1.shape[0]`），不是论文式 6 写的对步数求和。

<h3 id="实例-第-8-步课程学习里的这一段">第 8 步：课程学习里的这一段</h3>

`CompTrainerV6.train()` 对 HumanML3D 从 `schedule_len = 10` 起步，每阶段 +1，`schedule_len > 49` 时结束，共 40 个阶段；每阶段最多 50 个 sub-epoch。验证损失不再创新低时计数加 1，计到 3 之后再不创新低（也就是连续第 4 次）就进入下一阶段；比最低值高出 0.1 也直接进入下一阶段。

- 每阶段只取长度 ≥ `schedule_len × 4` 帧的样本（数据按长度排序后用 `searchsorted` 定位）。这段 170 帧，从 $T _ {cur}=10$（40 帧）一直参加到 $T _ {cur}=42$（168 帧），$T _ {cur}=43$（172 帧）起被排除：**参加 33 个阶段**。
- 在 $T _ {cur}=10$ 阶段，`__getitem__` 只截 40 帧（10 个 code）的窗口来训练，窗口起点只在第 0–2 帧（`single`）或第 0–6 帧（`double`）里随机；但传给网络的长度是 168 或 164 帧，所以到达倒计时从 42（或 41）开始数——**网络一开始就知道这段「总共多长」，只是先学开头**（这是我读代码的理解）。
- teacher forcing：每个 batch 抛一次硬币，40% 整条序列喂真值 code，60% 喂自己生成的 code。

</details>

---

## 📁 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两个仓库的目录、论文 ↔ 代码对照表、训练与评测命令、论文与代码的出入</summary>

<h3 id="源码-两个仓库">两个仓库</h3>

| 仓库 | 作用 | 关键文件 |
|---|---|---|
| [EricGuo5513/HumanML3D](https://github.com/EricGuo5513/HumanML3D) | 从 AMASS 复现数据集（AMASS 不允许直接分发） | `raw_pose_processing.ipynb`（SMPL+H 前向得到关节、降采样、裁剪、镜像）、`motion_representation.ipynb`（统一骨架、263 维特征）、`cal_mean_variance.ipynb`（Mean / Std）、`text_process.py`（spaCy 分词）、`index.csv`（14,616 段的来源与起止帧）、`paramUtil.py`（运动链） |
| [EricGuo5513/text-to-motion](https://github.com/EricGuo5513/text-to-motion) | 模型、训练与评测 | `networks/modules.py`、`networks/trainers.py`、`data/dataset.py`、`utils/word_vectorizer.py`、`train_decomp_v3.py`、`train_length_est.py`、`train_comp_v6.py`、`train_tex_mot_match.py`、`final_evaluations.py`、`utils/metrics.py` |

<h3 id="源码-论文与代码对照">论文 ↔ 代码对照</h3>

| 论文 | 代码 |
|---|---|
| 降到 20 FPS（§4） | `amass_to_pose()`：`down_sample = int(fps / ex_fps)`，`ex_fps = 20`，按整数步长抽帧 |
| 裁剪与去头 | `index.csv` 的 `start_frame` / `end_frame`；另对 Eyes_Japan、HDM05 去掉前 3 秒，TotalCapture、MPI_Limits 去掉前 1 秒，Transitions 去掉前 0.5 秒 |
| 镜像扩增（§5） | `swap_left_right()`：x 取反并交换左右链，存成 `M` 前缀的文件 |
| 统一骨架、面朝 Z+ | `uniform_skeleton()` 按腿长比缩放 → IK → 用目标骨架（样例 `000021`）的骨长 FK；`process_file()` 落地、根节点 xz 归零、用髋与肩的横向量把初始朝向转到 Z+ |
| 263 维特征（§5） | `process_file()` 的拼接顺序：`root_data`(4) + `ric_data`(63) + `rot_data`(126) + `local_vel`(66) + `feet_l, feet_r`(4)；`root_data` 是 `[r_velocity, l_velocity, root_y]`，高度不做差分 |
| 运动自编码器（§3.1） | `MovementConvEncoder` / `MovementConvDecoder`；`DecompTrainerV3.backward()`：L1 重建 + `lambda_sparsity`·mean\|code\| + `lambda_smooth`·L1(相邻 code) |
| Text2Length（§3.2） | `MotionLenEstimatorBiGRU`（自己一套文本编码，MLP 1024 → 512 → 256 → 128 → 50）；`LengthEstTrainer` 用 `CrossEntropyLoss`，标签 `m_lens // unit_length` |
| 文本编码器 | `TextEncoderBiGRU`；词性 one-hot 来自 `WordVectorizer`（`POS_enumerator` 15 类，VIP 词表覆盖原词性） |
| 局部词注意力（式 4） | `AttLayer`：`W_q`、`W_k`（无 bias）、`W_v`，除以 $\sqrt{512}$ |
| 先验 / 后验 / 生成器 | `TextDecoder`（先验与后验）、`TextVAEDecoder`（生成器），都是 GRUCell + `PositionalEncoding` |
| 到达倒计时 PE（式 5） | `CompTrainerV6.forward()`：`tta = m_lens // unit_length - i` |
| 总损失 | `CompTrainerV6.backward_G()`：动作重建 + code 重建 + `lambda_kld`·KL |
| 课程学习 + teacher forcing | `CompTrainerV6.train()`：`schedule_len` 10 → 49，`tf_ratio = 0.4`，`early_stop_count = 3` |
| 评测提取器（附录 B） | `TextEncoderBiGRUCo`、`MotionEncoderBiGRUCo`、`ContrastiveLoss`；`--negative_margin 10.0` |
| R-Precision / MM Dist / FID / Diversity / MultiModality | `final_evaluations.py` + `utils/metrics.py`：`batch_size = 32`、`diversity_times = 300`、`mm_num_samples = 100`、`mm_num_repeats = 30`、`mm_num_times = 10`、`replication_times = 20` |

<h3 id="源码-跑起来">跑起来（README 实录）</h3>

```bash
# 运动自编码器
python train_decomp_v3.py --name Decomp_SP001_SM001_H512 --gpu_id 0 --window_size 24 --dataset_name t2m
# text2length
python train_length_est.py --name length_est_bigru --gpu_id 0 --dataset_name t2m
# text2motion（HumanML3D 用 λ_KL = 0.01）
python train_comp_v6.py --name Comp_v6_KLD01 --gpu_id 0 --lambda_kld 0.01 --dataset_name t2m
# 评测用的文本 / 动作提取器
python train_tex_mot_match.py --name text_mot_match --gpu_id 1 --batch_size 8 --dataset_name t2m
# 用采样长度生成并画出动画
python eval_comp_v6.py --name Comp_v6_KLD01 --est_length --repeat_time 3 --num_results 10 --ext default --gpu_id 1
```

<h3 id="源码-论文与代码的出入">论文与代码的出入（我们核对到的）</h3>

1. **姿态维数的写法**：论文写 $j^p \in \mathbb{R}^{3j}$、$j^r \in \mathbb{R}^{6j}$、$j^v \in \mathbb{R}^{3j}$，$j=22$ 时会得到 $4 + 66 + 132 + 66 + 4 = 272$；代码里位置与旋转都**去掉了根节点**（$j-1 = 21$），所以是 263，和附录 A 写的 263 一致。
2. **补充材料 Table 1 的卷积维数**：标题写「on dataset HumanML3D」，但编码器输入 247、解码器输出 251、隐层 384 是 KIT-ML 的数（$251-4=247$）；HumanML3D 的代码是 $259 \to 512 \to 512$（模型名 `H512`）。
3. **课程起点**：附录 A 写 $T _ {cur}=8$、$T _ {max}=50$；`CompTrainerV6.train()` 对 HumanML3D 从 10 起步（KIT-ML 从 6），到 49 停。数据集也只收不足 200 帧的动作，`max_motion_length = 196`。
4. **长度类**：论文写 $\{1, \dots, T _ {max}\}$，补充材料说分布画在 10 到 50；代码是 `num_classes = 200 // 4 = 50`，类下标 0–49，补充材料图 6 里 50 那一格八张都是空的。训练 text2length 时数据集的 `max_length` 一直停在 20（`LengthEstTrainer` 从不调用 `reset_max_len`），按 `Text2MotionDataset` 的裁剪规则，40–43 帧的动作抽到 `double` 会被裁成 $20 + 4 \times 4 = 36$ 帧，所以实际训练标签落在 9–49，不是 10–49（按 `index.csv` 粗估，训练集里有 49 段是 40–43 帧）。
5. **「抛硬币」砍 4 帧**：代码是从 `['single', 'single', 'double']` 里随机选，`double` 的概率是 1/3，不是 1/2；窗口起点也随机（`single` 在 0–2 帧，`double` 在 0–6 帧）。
6. **重建损失**：论文写 L1；`CompTrainerV6` 里名为 `l1_criterion` 的其实是 `SmoothL1Loss`（`DecompTrainerV3` 用的是真 L1）。`backward_G()` 里 `lambda_rec_mov` 与 `lambda_rec_mot` 乘反了，两者默认都是 1，不影响结果。KL 对「batch × 步数」取平均，不是对步数求和。
7. **λ_KL 默认值**：`train_options.py` 默认 0.005，HumanML3D 的 README 命令显式传 `--lambda_kld 0.01`（模型名 `Comp_v6_KLD01`），与附录 A 一致；附录 J 的表里 KIT-ML 写成 0.05，是笔误（附录 A 与 README 都是 0.005）。
8. **关键词类**：论文说词典分四类（方向、身体部位、物体、动作），代码有五个 VIP 表（多一个描述词表 slowly / happily 等），而且 VIP 类**替换**原词性，而不是另加一个标签——补充材料图 2(a) 的「doing/VERB jumping/ACT jacks/NOUN」也是这么画的。
9. **R-Precision 的方向**：论文写「对每个生成动作，在 32 条描述里排序」；`evaluate_matching_score()` 是在 batch（32）内算文本 × 动作的距离矩阵、**对每条文本给 32 个动作排序**。两种方向在一个 32 × 32 的 batch 里口径接近，但并不完全相同（这是我读代码的理解）。测试集 4,384 条是 2,192 段原始动作加各自的镜像，一段动作和它的镜像碰巧进同一个 batch 的概率约 0.7%，影响很小。
10. **降采样**：`int(fps / 20)` 取整步长，源帧率不是 20 的整数倍时（例如 250 fps 会得到步长 12、约 20.8 fps），实际帧率会略偏（**例子是我按公式推的**，没有逐个核对 AMASS 子集的帧率）。
11. **描述条数**：仓库 `texts.zip` 里 14,616 个非镜像文件我们数到 43,692 行描述（14,434 个文件正好 3 行），比论文的 44,970 少 1,278 条；按 lemma 去重的词表是 5,331（论文 5,371）。差异的原因我们没有找到出处。
12. **feat_bias 被除了两次**：附录 A 说根节点与触地特征放大 5 倍；`train_comp_v6.py` 用同一个 `std` 数组构造训练集与验证集，`Text2MotionDataset` 里是原地除法，实际放大 25 倍（见「🚶 第 4 步」，按代码推断）。
13. **根角速度存的是半角**：通道 0 是相邻帧根四元数 y 分量的 arcsin，即每帧转角的一半；`recover_root_rot_pos` 把累加值直接当四元数的半角用，所以还原是对的，但直接把通道 0 当转角读会少一半（见「🚶 第 2 步」）。另外 `skeleton.py` 求朝向时髋部横向量与肩部横向量的方向是反的（`face_joint_idx = [2, 1, 17, 16]` 解包成 `l_hip, r_hip, sdr_r, sdr_l`）；按这个写法复现才和通道 0 对得上。
14. **其余模块的学习率**：附录 A 只写了 $2\times10^{-4}$；`train_options.py` 里自编码器、text2length、评测提取器都是 $1\times10^{-4}$（batch 分别 128 / 64 / 32，README 的提取器命令传 8）。

</details>

---

## 🤖 工程价值

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：对人形机器人是「语言到动作的先验」，不是可直接执行的参考</summary>

- **文本到参考动作**：先由文本生成人体动作，再映射（retarget）到 G1 / H1 等人形骨架（如 [GMR](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html)），作为跟踪策略的参考。
- **动作先验**：HumanML3D 常和 AMASS、BABEL、Motion-X 一起用来训练更大的运动先验或运动 tokenizer。注意重叠：HumanML3D 有 13,425 段来自 AMASS，BABEL 也是 AMASS 上的标注，混在一起用时要按源文件去重。
- **标准评测**：后续 [MDM](https://github.com/GuyTevet/motion-diffusion-model)、[T2M-GPT](https://github.com/Mael-zys/T2M-GPT)、[MoMask](https://github.com/EricGuo5513/momask-codes) 等都在 HumanML3D 上沿用本文的 263 维特征与评测器（R-Precision、FID、MM Dist、Diversity、MultiModality）报数。
- 注意：HumanML3D 存的是统一骨架下的关节位置与旋转特征，**没有 SMPL 的 shape 参数**；6D 旋转是从关节位置反解出来的，4 维触地是速度阈值得到的 0 / 1，**没有接触力**这类物理量。直接拿来做机器人参考，需要处理骨长差异、脚滑、关节限位与动力学可行性。

在发布清单里，它排在 [ToddlerBot](../../12_Hardware_Design/ToddlerBot_Open-Source_ML-Compatible_Humanoid_Platform_for_Loco-Manipulation/ToddlerBot_Open-Source_ML-Compatible_Humanoid_Platform_for_Loco-Manipulation.html) 之后、GMR 之前：前者讲机器人自己怎样采数据，这一篇讲人类动作数据从哪里来、怎样配上文字，下一篇讲怎样把人的动作搬到机器人身上。

</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：retargeting 与物理过滤是关键中间层；描述噪声与一段多说法</summary>

- HumanML3D 对机器人不是「可直接执行的数据集」，而是语言到人体动作先验的来源。
- 机器人使用时最关键的中间层是 retargeting 和 physics filtering。没有这层，文本生成的动作可能视觉上合理但动力学不可行。
- 描述质量参差：片段 012314 的三条描述分别是打网球、侧着走险些摔一跤、前冲击打再后退（见具体实例第 1 步），评测时 R-Precision 的上限（真实动作 top-1 也只有 0.511）一部分就来自这种标注分歧（**这是我们的推测**，论文没有分析；[R-Precision 玩具](#demo-rprec)里把「描述歧义 q」调大就能看到这种上限）。
- 后续 text-to-humanoid 工作往往会把 HumanML3D 与 AMASS、BABEL、Motion-X 等数据一起使用，训练更大的 motion prior。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：数据怎么来、263 维里存了什么、为什么要 snippet code 与 text2length、R-Precision 怎么算</summary>

1. **HumanML3D 的数据是怎么来的？**
   - 现成动捕（AMASS 17 个子集 + HumanAct12）统一到 20 fps、≤10 s、同一副骨架与初始朝向，再在 AMT 上每段收 3 条描述（≥5 词），最后左右镜像（描述里 left / right 一起换）把数据翻倍。
2. **263 维特征里根节点存了什么？**
   - 绕竖轴的角速度、水平面的两个线速度分量——水平方向只存速度；第 4 维是根节点的**绝对高度**，不做差分。这样特征与全局平移、水平朝向无关（这是常见的解读，论文只说沿用 PFNN 的处理），模型学的是「怎么动」而不是「在哪」；生成后再把速度积分回全局轨迹（`recover_from_ric`）。
3. **HumanML3D 用的是 SMPL 吗？**
   - 关节来自 SMPL+H 前向得到的前 22 个关节，并统一到一副骨架；数据里存的是关节位置 / 旋转 / 速度特征，6D 旋转是从关节位置反解出来的，不是 SMPL 的 pose 与 shape 参数。要驱动 SMPL 网格或机器人，还要额外拟合或 retarget。
4. **为什么要 snippet code？**
   - 4 帧压一个 code，生成器步数降到 1/4，每个 code 带局部时间语义；消融里去掉它 top-1 从 0.455 掉到 0.370，论文图 6 里越往后越跟不上文字。
5. **为什么单独做 text2length？**
   - 让长度也成为随机变量：从 $p(T \mid \text{text})$ 采样，同一句话能生成不同时长。HumanML3D 上用采样长度的 MultiModality 比用真实长度高 6.2%（置信区间重叠），KIT-ML 上高 38.5%（不重叠），R-Precision 几乎不变；补充材料图 6 里周期动作的长度分布更平。
6. **R-Precision 怎么算？随机水平是多少？**
   - 1 条真值描述 + 31 条随机描述共 32 条，按评测器特征的欧氏距离排序，看真值是否在 top-k；随机猜 top-1 是 $1/32 \approx 3.1\%$，top-3 是 $9.4\%$。代码里 32 条就是一个 batch。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：参考来源</summary>

<h3 id="附录-参考来源">A. 参考来源</h3>

- [CVPR 2022 OpenAccess：论文页](https://openaccess.thecvf.com/content/CVPR2022/html/Guo_Generating_Diverse_and_Natural_3D_Human_Motions_From_Text_CVPR_2022_paper.html)
- [CVPR 2022 OpenAccess：正文 PDF](https://openaccess.thecvf.com/content/CVPR2022/papers/Guo_Generating_Diverse_and_Natural_3D_Human_Motions_From_Text_CVPR_2022_paper.pdf)
- [CVPR 2022 OpenAccess：补充材料 PDF](https://openaccess.thecvf.com/content/CVPR2022/supplemental/Guo_Generating_Diverse_and_CVPR_2022_supplemental.pdf)
- [项目主页](https://ericguo5513.github.io/text-to-motion/)
- [GitHub：EricGuo5513/HumanML3D](https://github.com/EricGuo5513/HumanML3D)
- [GitHub：EricGuo5513/text-to-motion](https://github.com/EricGuo5513/text-to-motion)
- 后续沿用评测器的工作（官方代码仓库）：[MDM](https://github.com/GuyTevet/motion-diffusion-model)、[T2M-GPT](https://github.com/Mael-zys/T2M-GPT)、[MoMask](https://github.com/EricGuo5513/momask-codes)
- 上游收录：[YanjieZe/awesome-humanoid-robot-learning](https://github.com/YanjieZe/awesome-humanoid-robot-learning)（以 CVPR 2022 链接收录，无 arXiv）
- 动画与交互演示里的论文图（正文图 1、4、6，补充材料图 3、6、8）只做讲解引用，版权归原作者；片段 012314 的骨架与特征热图按官方仓库的数据画。

</details>
