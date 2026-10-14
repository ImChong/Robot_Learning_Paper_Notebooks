---
layout: paper
title: "Benchmarking Behavioral Steerability in Behavior Foundation Models"
zhname: "RoboSteer：行为基础模型的行为可操控性基准"
category: "Simulation Benchmark"
arxiv: "2610.10198"
---

# Benchmarking Behavioral Steerability in Behavior Foundation Models
**行为基础模型（BFM）能生成像样的动作，但用户说「快一点」「右手别动」「先看视频再按文字做」时它能不能照做，现有基准没有测过。RoboSteer 把这件事叫作「行为可操控性」，按条件、约束、组合分三级出题，共 77.4 万道。每道题先算一个生成分 BG，再乘上各级的「意图实现率」IR 得到操控分 BS。9 个 BFM 在 BG 上分数接近，一加约束 BS 就大幅下降，其中「锁住某个身体部位」几乎没有模型做得到**

> 📅 总结日期: 2026-10-14
>
> 🏷️ 板块: 11 Simulation Benchmark · 行为基础模型 · 可操控性评测 · 多模态条件 · 文本 / 音频 / 视频 / 节奏 / 轨迹到动作 · Unitree G1
>
> 🔁 推进轨: 模块轮转（10_Sim-to-Real → **11_Simulation_Benchmark**）· 取本模块尚无笔记的最新论文（2026.10）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.10198](https://arxiv.org/abs/2610.10198) |
| HTML | [arxiv.org/html/2610.10198v2](https://arxiv.org/html/2610.10198v2) |
| PDF | [下载 v2](https://arxiv.org/pdf/2610.10198v2) |
| 项目主页 | [robosteer.github.io](https://robosteer.github.io/)（每类任务各有一个示例，另有[数据集说明](https://robosteer.github.io/docs/dataset-guide.html)） |
| **发布时间** | 2026-10-07（arXiv v1） |
| 版本 | 2026-10-11 更新 v2（本笔记据 v2），cs.RO |
| 数据集 | [YanCORANV/RoboSteer](https://huggingface.co/datasets/YanCORANV/RoboSteer)（23 个 TAR，约 355 GiB） |
| 评测器权重 | [Leontc/RoboSteer-evaluator](https://huggingface.co/Leontc/RoboSteer-evaluator)（文本 / 音频 / 节奏 / 轨迹 / 真人视频 / 骨架视频六个跨模态评测器 + 算 FID 用的动作编码器，附带 [OMG](https://github.com/Tsinghua-MARS-Lab/OMG) 的源码） |
| 源码（部分） | 没有 GitHub 仓库。Hugging Face 上放了[各基线的适配脚本与说明](https://huggingface.co/datasets/PhoebeCC/RoboSteer-Model-Resources)（MIT，只是参考材料，上游模型要自己装）、[预处理脚本](https://huggingface.co/datasets/PhoebeCC/RoboSteer-Preprocessing)（`scripts/build_dataset.py`、`level3/scripts/materialize_level3.py`）和[各模型的评测输出](https://huggingface.co/datasets/PhoebeCC/RoboSteer_Evaluation)。论文说「之后会放官方的适配与评测代码」，Model-Resources 里的 `docs/evaluation_protocol.md` 目前也写着 *pending*，所以 BG / IR 的统一打分脚本还没公开。下文的时序图按这些已发布资源和附录 C、D 整理 |

**作者**：Minghe Gao, Zhanxi Yan, Jiahui Liu, Wendong Bu, Xiaoting Chen, Qizhou Wang, Yi Su, Siliang Tang, Jun Xiao, Yueting Zhuang, Tat-Seng Chua, Juncheng Li（浙江大学 · 宇树科技 · 新加坡国立大学 · 中南大学；在浙大—宇树具身智能联合实验室完成）

**评测平台**：所有模型的输出统一成 Unitree G1 29 自由度、50 Hz 的动作，再交给 SONIC 跟踪策略在仿真里执行；另有一段组合任务的 G1 真机演示（图 6）

---

## 🎯 一句话总结

RoboSteer 是第一个专门测「行为基础模型能不能按用户意图改动作」的基准。它从网络视频里重建出 38,522 段人体动作，重定向到 G1 并用跟踪策略筛掉执行不了的，配上视频、文字、音频、关键帧，出了 773,716 道题，分三级：**条件操控**（给完整或不完整的条件，生成或补全动作）、**约束操控**（在第一级的题上再加一条速度、幅度、方向、顺序、次数、轨迹或锁住身体部位的要求）、**组合操控**（视频、文字、音频、关键帧按时间交替给出，要一口气做完）。打分是 $BS_l = BG\cdot\prod _ {k\le l} IR_k$：BG 看动作像不像参考、和输入对不对得上，IR 看这一级的要求有没有真的做到。9 个 BFM（GENMO、LoM、MotionCraft、TextOp、UniAct、UH-1、Video2Robot、BFM-Zero、LDA）在 BG 上差不多都在 80–120 分，一到第二级 BS 就掉到 13–24 分。最难的约束是 Body Restrain：GENMO 在文本条件下只有 0.7% 的样本做到了「锁住的部位不动、其他部位照常动」。

---

## 📌 英文缩写速查

| 缩写 / 术语 | 全称 | 解释 |
|---|---|---|
| BFM | Behavior Foundation Model | 一个模型接受多种条件（文字、视频、轨迹等），直接输出全身动作 |
| Steerability | Behavioral Steerability | 行为可操控性：生成的动作有多忠实地满足用户提的要求 |
| BG | Behavior Generation Score | $1000\exp(-0.3\,\mathrm{FID} - 1.6\,\mathrm{MM\text{-}Dist})$，只看生成质量 |
| IR$_k$ | Intention Realization at level $k$ | 第 $k$ 级要求的实现率，∈ [0, 1] |
| BS$_l$ | Behavior Steering Score | $BG\cdot\prod _ {k=1}^{l} IR_k$ |
| CG$_c$ | Constraint Grounding | 第二级里第 $c$ 类约束被满足的样本比例 |
| tIoU | temporal IoU | 生成时长与参考时长的重叠率 $\min(\hat d, d)/\max(\hat d, d)$ |
| JRO | Joint-Range Overlap | 关节角范围的重叠率，范围不够大或者太大都扣分 |
| FID / MM-Dist | — | 生成动作与参考动作的分布距离 / 生成动作与输入条件在共享嵌入空间里的距离 |
| GMR / SONIC | — | 人体动作到 G1 的重定向 / 全身动作跟踪策略，这里用来把所有输出变成「G1 真能执行的动作」 |

---

## ❓ 论文要解决什么问题？

现有 BFM 的评测基本都是「生成得好不好」：FID、多样性、MPJPE、文本检索 R@K。作者认为这假设了「会生成就会听话」，而用户实际提的要求往往是**怎么做**，例如「跟着这段参考动作做，但快一点、别用左手、最后走到那个点」。拿 LLM 打比方：GPT 系列先是好的文本生成器，ChatGPT 之后才变成能按指令调整输出的系统；BFM 现在也到了这一步，需要一个指标单独量「按意图调整」这件事。

论文把它写成：普通生成是 $B = f_\theta(x)$；可操控性要的是 $\max F\big(B, I(x)\big)$，其中 $I(x)$ 是输入里携带的意图，$F$ 衡量生成的动作实现了多少意图。模型不必显式抽出意图，只看结果。并且**可操控性建立在生成之上**：让机器人抬右腿，它先摔倒了，那是生成失败，谈不上听没听懂，所以 BS 要乘上 BG。

---

## 🔧 方法拆解

### 1. 三级题目（第 4.1 节、图 4）

| 级别 | 测什么 | 任务 |
|---|---|---|
| **L1 条件操控** | 给出完整或不完整的条件，能否做出对应的动作 | **完整条件复现**：文本、音频、视频、节奏、旋转到姿态；**时间补全**：动作预测、动作倒推、中间插值、关键帧条件；**空间补全**：给上半身补全身、给下半身补全身、到达目标姿态 |
| **L2 约束操控** | 在 L1 的题上加**一条**执行要求，原动作还要保住 | Speed（快 / 慢）、Amplitude（放大 / 缩小）、Direction（往左 / 右）、Order（A 在 B 前）、Times（做几次）、Trajectory（来回 / 绕圈 / S 形）、Body Restrain（锁住手臂或腿） |
| **L3 组合操控** | 多种来源的要求按时间交替出现，能否一段动作里全部满足 | Interleaved Multi-Source Steering：例如先模仿一段视频，再按文字做，再跟上音乐节奏，最后对上关键帧 |

### 2. 数据怎么来（第 4.2 节、附录 B）

- **五步流水线**：网络视频时空切片 → 多标准过滤（有人、清晰、无水印 / 字幕、全身可见、镜头不乱晃、音画一致等）→ 抽取多模态信息（Gemini-3-Flash 按动作切段，每段写全身 / 上肢 / 下肢描述）→ 从视频重建人体动作 → 优化、打分、过滤，经物理约束的重定向变成 G1 动作，**再用跟踪策略试跑，只留下能稳定跟住的**。
- **按任务裁文字**：给下半身补全身的题删掉上肢描述，反过来同理（有检查器拦泄漏）；时间补全按段切，设 $N$ 段、$k=\lceil N/2\rceil$，预测给前 $k$ 段、倒推给后 $k$ 段，插值把中间一或两段完全藏起来，并要求文字里恰好出现一次 "The middle sequence is missing."。文字改写由 GPT-5.5（温度 0.10）和 Gemini-3-Pro（0–0.05）分工，验证不过最多重试三次。
- **规模**：38,522 段源动作，人类视频 + 渲染骨架视频共 77,044 段、91.58 小时，773,716 道题；133 个细分动作类别，日常 / 行走 / 运动 / 表演占 83.9%，长尾明显（瑜伽、体操、武术很少）。

### 3. 打分：BG × 各级 IR（第 4.3 节、附录 C）

所有输出先统一成 G1 表示 $q_t = [r_t, u_t, \theta_t] \in \mathbb{R}^{36}$（根位置、根四元数、29 个关节角），50 Hz。

$$BS_l = BG\cdot\prod _ {k=1}^{l} IR_k,\qquad BG = 1000\exp(-0.3\,\mathrm{FID} - 1.6\,\mathrm{MM\text{-}Dist})$$

BG 用乘积而不是加和，是为了让「和参考不像」和「和输入对不上」任何一个差都会把分数拉下来。IR 是**看执行结果**算的，不是拿生成的动作去和参考比：

- **L1 的 IR$_1$**：完整条件 $IR_1 = 1$（即 $BS_1 = BG$）；时间补全用 tIoU；空间补全只看**缺失的那半身**的 JRO（给上半身补全身时只看 0–11 号腿关节，反之看 12–28 号腰和上身）；关键帧和目标姿态用 14 个 link 的骨盆对齐位置误差 $e$，在 ±0.04 s 窗口里取最小，再算 $\exp(-e/0.20\,\mathrm{m})$。
- **L2 的 IR$_2$**：每类约束各自给出 0/1 判定，七类的通过率 CG$_c$ 取宏平均。判定规则举例：
  - Speed：快就要求生成时长 $\hat d < d$，慢就要 $\hat d > d$；
  - Amplitude：29 个关节里的最大活动范围要变大或变小；
  - Direction：根的水平位移至少 0.10 m，且相对初始朝向的角度在目标 ±90° 的 60° 以内；
  - Order / Times：把动作渲染成视频交给固定的 VideoLLM 判断，**不告诉它目标顺序和目标次数**，只问「两个动作各做没做、谁先开始」「目标动作完整做了几次」；
  - Trajectory：位移至少 0.25 m，来回、绕圈、S 形各有一组几何阈值（例如绕圈要求包围面积 $A_N \ge 0.10$、累计转向 $\ge \pi$）；
  - Body Restrain：在根坐标系里算 link 速度的 RMS，被锁部位 $\le 0.10$ m/s **且**其余部位 $\ge 0.12$ m/s。第二个条件防止模型干脆整个人站着不动来过关。
- **L3 的 IR$_3$**：每个时间段 $i$ 有自己的实现分 $s_i$，按时长加权 $IR_3 = \sum \Delta t_i s_i / \sum \Delta t_i$。附录 C.5 说明 L3 刻意不把 L1、L2 的失败再算一遍，所以表 2 里 $BS_3$ 可以比 $BS_2$ 高，这三列不能看成同一条递减链。

### 4. 怎么让 9 个模型站在同一起跑线（第 5.1 节、附录 D）

- **按模型支持的模态分组**：文本（GENMO、LoM、MotionCraft、TextOp、UniAct、UH-1）；音频先用 Whisper 转文字再喂同样六个；视频（GENMO、Video2Robot / PromptHMR）；轨迹（BFM-Zero）；节奏（LDA、MotionCraft 的音乐分支）。
- **输入预处理**：Qwen2.5-3B-Instruct 把长描述改写成简短的英文祈使句；模型不能同时吃「原描述 + 一条约束」时，把两者合成一句（例如锁腿的题会明确写「腿保持不动」，并删掉需要腿的动作）；关键帧图片做成「每帧停到下一个时间戳」的静态视频。
- **输出统一**：人体动作模型的输出走 GMR 重定向到 G1、重采样到 50 Hz、转到 IsaacLab 坐标；UH-1 从 H1 转到 G1；TextOp 的 23 自由度补成 29；最后都交给 SONIC 在仿真里跟踪，验证能执行。跑失败的样本单独记录，不用别的结果替代。
- **冻结评测器**：FID / 多样性用 OMG 的动作编码器；MM-Distance / R@K 用为 RoboSteer 训练的六个跨模态评测器，训练完冻结，所有模型用同一套参数。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph Data["① 造题：从网络视频到 G1 动作"]
        V["网络视频"] --> SEG["时空切片 + 多标准过滤<br/>（有人 / 全身可见 / 无水印 / 镜头稳定…）"]
        SEG --> CAP["Gemini 按动作切段<br/>每段写全身 / 上肢 / 下肢描述"]
        SEG --> REC["从视频重建人体动作"]
        REC --> RT["物理约束重定向到 G1"]
        RT --> TRK{"跟踪策略能稳定跟住？"}
        TRK -->|"否"| DROP["丢弃"]
        TRK -->|"是"| CORPUS["38,522 段源动作<br/>+ 视频 / 文字 / 音频 / 关键帧"]
        CAP --> CORPUS
    end

    subgraph Tasks["② 三级题目（773,716 道）"]
        L1["L1 条件操控<br/>完整复现 / 时间补全 / 空间补全"]
        L2["L2 约束操控<br/>L1 + 一条约束：速度 / 幅度 / 方向 / 顺序 / 次数 / 轨迹 / 锁身体部位"]
        L3["L3 组合操控<br/>视频 · 文字 · 音频 · 关键帧按时间交替"]
        L1 --> L2 --> L3
    end

    subgraph Run["③ 跑模型"]
        PRE["输入预处理<br/>Whisper 转写 · Qwen 改写成祈使句 · 关键帧做成静态视频"]
        BFM["9 个 BFM 用各自原生接口推理"]
        UNI["GMR 重定向 → G1 29 自由度 50 Hz<br/>SONIC 仿真跟踪验证可执行"]
        PRE --> BFM --> UNI
    end

    subgraph Score["④ 打分"]
        BG["BG = 1000·exp(−0.3 FID − 1.6 MM-Dist)<br/>冻结的 OMG 编码器 + 跨模态评测器"]
        IR1["IR₁：tIoU / 缺失半身的 JRO / 关键帧位置误差"]
        IR2["IR₂：七类约束 0/1 判定的通过率宏平均<br/>（顺序、次数交给 VideoLLM，不告诉它答案）"]
        IR3["IR₃：各时间段实现分按时长加权"]
        BS["BSₗ = BG × ∏ IRₖ"]
        BG --> BS
        IR1 --> BS
        IR2 --> BS
        IR3 --> BS
    end

    CORPUS --> Tasks
    Tasks --> PRE
    UNI --> BG
    UNI --> IR1
    UNI --> IR2
    UNI --> IR3
</div>

---

## ⏱️ 评测运行时序图（按已发布的 Hugging Face 资源与附录 C、D 整理）

统一打分脚本还没公开，下图里「打分」这一段是按附录 C 的定义画的；下载、读题、适配、重定向、评测器这几步在已发布的资源里都有对应文件。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 使用者
    participant HF as Hugging Face<br/>（数据集 / 评测器）
    participant T as Tasks/LevelX/*.json
    participant P as 预处理<br/>（faster-whisper · Qwen2.5-3B）
    participant M as 被测 BFM<br/>（Model-Resources 的适配脚本）
    participant G as GMR 重定向
    participant S as SONIC 仿真跟踪
    participant E as 冻结评测器<br/>（OMG 编码器 + 跨模态评测器）
    participant J as IR 判定<br/>（几何规则 / VideoLLM）

    U->>HF: hf download YanCORANV/RoboSteer --include "archives/**"
    U->>HF: hf download Leontc/RoboSteer-evaluator
    HF-->>U: Data/ + Tasks/（约 352 GiB 解压后）与评测器权重
    U->>T: 读一道题：metadata / input.prompts / input.modalities<br/>（L3 读 input.interleave.sequence）
    T->>P: 文字、音频、图片条件
    P-->>M: 统一后的英文祈使句 / 转写文本 / 静态视频
    M->>M: 原生接口推理（权重不改）
    alt 输出是人体动作（GENMO / LoM / MotionCraft / LDA / Video2Robot）
        M->>G: SMPL(-X) 动作
        G-->>S: G1 29 自由度，50 Hz，IsaacLab 坐标
    else 输出已是机器人动作（TextOp / UniAct / UH-1 / BFM-Zero）
        M-->>S: 补齐到 29 自由度（UH-1 先从 H1 转 G1）
    end
    S-->>E: 能执行的 G1 动作 q_t = [r, u, θ] ∈ R^36
    E->>E: FID（与参考比）+ MM-Distance（与输入条件比）
    E-->>J: BG
    S-->>J: 根轨迹、关节角、link 速度
    J->>J: L1：tIoU / JRO / exp(−e / 0.20 m)
    J->>J: L2：速度、幅度、方向、轨迹、锁部位按阈值判 0/1<br/>顺序、次数渲染成视频交给 VideoLLM
    J->>J: L3：各时间段实现分按时长加权
    J-->>U: BS₁ = BG·IR₁，BS₂ = BS₁·IR₂，BS₃ = BS₂·IR₃
</div>

---

## 🚶 具体实例：一道题的分数是怎么乘出来的

先用几道玩具题把每种 IR 算一遍（数字是为说明而设的），最后用论文表 B.8 的真实数字看 Body Restrain 为什么几乎全军覆没。

**L1 时间补全（tIoU）**：参考的后半段动作长 4.0 s，模型补出来 3.2 s，$\mathrm{tIoU} = 3.2/4.0 = 0.80$。

**L1 空间补全（JRO）**：某个膝关节的参考范围是 $[-0.2, 0.6]$ rad（宽 0.8）。

| 生成范围 | 重叠长度 | 分母 | JRO |
|---|---|---|---|
| $[0.0, 0.5]$（动得不够） | 0.5 | 参考宽 0.8 | 0.625 |
| $[-0.4, 0.8]$（包住参考但动太大） | 0.8 | 生成宽 1.2 | 0.667 |
| $[-0.2, 0.6]$（刚好） | 0.8 | 0.8 | 1.000 |

分母在「生成范围包住参考范围」时换成生成范围的宽度，所以乱动一大圈不能刷满分。

**L2 Body Restrain（锁手臂）**：

| 情况 | 手臂 RMS 速度 | 其余部位 RMS 速度 | 判定 |
|---|---|---|---|
| 手臂锁住、腿照常走 | 0.06 m/s | 0.15 m/s | ✅ 1 |
| 整个人站着不动 | 0.02 m/s | 0.05 m/s | ❌ 0（其余部位低于 0.12） |
| 指令被忽略，照原样挥手 | 0.40 m/s | 0.30 m/s | ❌ 0 |

**L3 组合（IR$_3$）**：三段要求分别持续 3 s、5 s、2 s，实现分 0.9、0.4、1.0，$IR_3 = (3\times0.9 + 5\times0.4 + 2\times1.0)/10 = 0.67$。

**论文里的真实数字**：在表 B.8 的单约束任务上，$BS_1 = BG$（这些题的 $IR_1 = 1$），所以 $BS_2 / BS_1$ 就是这类约束的通过率。GENMO + GMR（文本条件）：

| 约束 | BG | BS₂ | 通过率 BS₂ / BG |
|---|---|---|---|
| Speed | 114.238 | 58.782 | 51.5% |
| Amplitude | 113.930 | 74.166 | 65.1% |
| Order | 88.884 | 12.926 | 14.5% |
| Times | 79.883 | 9.089 | 11.4% |
| Direction | 110.800 | 4.240 | 3.8% |
| Trajectory | 116.969 | 4.665 | 4.0% |
| **Body Restrain** | 113.041 | **0.832** | **0.7%** |

BG 七类都在 80–117 之间，说明动作本身生成得还行；但「整体快一点、幅度大一点」能做到一半以上，「锁住腿只动手」只有不到 1%。七类里最好的 MotionCraft 在 Body Restrain 上也只有 $11.714/118.997 = 9.8\%$，UniAct 的 Direction 和 Trajectory 都是 0。

（BG 本身可以验算：GENMO 文本 FID 0.387、MM-Distance 1.284，$1000\exp(-0.3\times0.387 - 1.6\times1.284) = 114.1$，与表 2 的 114.094 一致。）

---

## 💡 核心贡献

1. **提出「行为可操控性」**：把「按意图调整动作」从「生成动作」里分出来，定义成 $\max F(B, I(x))$，并规定它建立在生成成功之上。
2. **三级题目**：条件 → 约束 → 组合，七类显式约束，覆盖时间维和空间维；773,716 道题，五种条件模态。
3. **BG × IR 的打分**：BG 用乘积把「像参考」和「对得上输入」绑在一起；IR 看执行结果，并为每类约束设了防作弊的条件（JRO 罚过度运动、Body Restrain 要求其余部位在动、VideoLLM 不给答案）。
4. **第一次大规模横评**：9 个 BFM 统一到 G1 + SONIC 下比较，数据集、评测器权重和各基线的适配说明放在 Hugging Face。

---

## 📊 关键发现

**表 2（摘录，文本条件，第一级的复现部分 + 三级操控分）**

| 模型 | FID ↓ | MM-Dist ↓ | BG ↑ | BS₁ ↑ | BS₂ ↑ | BS₃ ↑ |
|---|---|---|---|---|---|---|
| GENMO + GMR | 0.387 | **1.284** | 114.1 | **68.4** | 16.1 | **42.1** |
| LoM + GMR | 0.586 | 1.303 | 104.6 | 66.3 | 16.8 | 39.3 |
| MotionCraft + GMR | **0.208** | 1.314 | **114.9** | 64.0 | **22.7** | 40.7 |
| TextOp | 0.812 | 1.408 | 82.7 | 43.5 | 20.4 | 31.1 |
| UniAct | 0.439 | 1.343 | 102.4 | 58.0 | 12.8 | 37.1 |
| UH-1 | 0.768 | 1.323 | 96.6 | 49.0 | 18.5 | 38.2 |

视频条件：GENMO 114.9 / 78.5 / 21.0 / 36.6，Video2Robot 119.3 / 92.0 / 23.7 / 35.0（BG / BS₁ / BS₂ / BS₃）。BFM-Zero（轨迹条件）BG = BS₁ = 95.4，LDA / MotionCraft（节奏）94.0 / 96.0，这几种只有第一级的题。

论文用六个问题总结：

- **Q1 会生成 ≠ 会听话**：BG 在模型之间差距不大，BS 一直低于 BG；加上第二级约束后 BS₂ 只剩 BG 的 1/8 到 1/4。BG 最高的模型 BS₂ 不一定最高（MotionCraft 的 BS₂ 最高，但 BS₁ 不如 GENMO）。
- **Q2 要求越复杂越难**：单条要求常常能落到动作上，几条要求要同时协调时就保持不住。
- **Q3 空间比时间弱**：表 B.7 里大多数模型「空间补全」的 BS₁ 低于「时间补全」。作者推测预训练主要学「动作怎么随时间演化」，对关节之间的空间依赖学得不够。
- **Q4 最难的约束是 Body Restrain**：要把指令对应到具体身体部位，还要保持平衡；与 Q3 一致，说明模型缺少按关节、按身体区域的细粒度表示。
- **Q5 组合操控需要多模态输入**：只靠语言很难说清精细的空间构型和身体部位关系，作者主张未来的 BFM 接受交错、甚至流式的多模态输入。
- **Q6 操控仍是开放问题**：还没有哪个 BFM 有 ChatGPT 那样的通用可操控性。

**数据偏差（附录 A.2）**：日常类占 48.7%，前六个细类占 65.3%；76% 的受试者在 18–39 岁，男女比约 2:1；腰部的活动范围在每个动作家族里都最小。

**局限**：评测依赖 GMR 重定向和 SONIC 跟踪，重定向本身的误差会算进人体动作模型的分数；Order / Times 依赖 VideoLLM 的判断；BG 的系数 0.3 / 1.6 是经验标定的；统一打分脚本尚未公开，目前没法完全复现表 2。

---

## 🤖 对人形机器人领域的意义

- **给「指令跟随」一个可比较的数**：以前 BFM 论文各报各的 FID、MPJPE，很难回答「这个模型听不听话」。RoboSteer 把「快一点」「别动左手」「往左走」变成了可自动判定的题，而且评的是 G1 上经过跟踪策略验证、能执行的动作。
- **指出下一步该补什么**：最弱的是**按身体部位控制**（Body Restrain、空间补全）和**方向 / 轨迹**这类空间约束，比「整体快慢、幅度」难得多。对做 BFM 的人，这意味着预训练里要有关节级、身体区域级的条件，而不只是整段文字。
- **和本站其他 BFM 笔记对照着读**：被测的 [BFM-Zero](../../04_Loco-Manipulation_and_WBC/BFM-Zero__A_Promptable_Behavioral_Foundation_Model_for_Humanoid_Control/BFM-Zero__A_Promptable_Behavioral_Foundation_Model_for_Humanoid_Control.html)、[TextOp](../../04_Loco-Manipulation_and_WBC/TextOp__Real-time_Interactive_Text-Driven_Humanoid_Robot_Motion_Generation_and_C/TextOp__Real-time_Interactive_Text-Driven_Humanoid_Robot_Motion_Generation_and_C.html)、[UniAct](../../04_Loco-Manipulation_and_WBC/UniAct__Unified_Motion_Generation_and_Action_Streaming_for_Humanoid_Robots/UniAct__Unified_Motion_Generation_and_Action_Streaming_for_Humanoid_Robots.html) 在各自论文里都展示了丰富的生成能力，放到这个基准下，加约束后的分数都掉得很厉害。

---

## 🎤 面试参考

- **问：为什么 BS 要乘 BG，而不是只看 IR？**  
  答：可操控性建立在生成成功之上。模型摔倒或者做出无效动作时，IR 可能碰巧过关（比如整个人不动也算「慢」），乘上 BG 才能把这种情况压下去。
- **问：Body Restrain 为什么要求「其余部位速度 ≥ 0.12 m/s」？**  
  答：否则模型站着不动就能满足「被锁部位不动」。这条把「锁住一部分」和「全部停下」区分开。
- **问：JRO 的分母为什么要分情况？**  
  答：生成范围包住参考范围时，如果仍除以参考宽度，重叠就是 1，动得再大也满分。换成生成宽度后，过度运动也会被扣分。
- **问：Order、Times 交给 VideoLLM 判断，怎么防止它被提示带偏？**  
  答：只告诉它候选动作，不告诉它目标顺序和目标次数；所有模型用同一个检查点、同一套渲染和确定性解码，输出必须是规定的 JSON。
- **问：为什么所有模型都要过 GMR + SONIC？**  
  答：被测模型有的输出人体 SMPL，有的输出不同机器人的关节角。统一到 G1 29 自由度并在仿真里跟踪一遍，才能在同一个机器人空间比较，也顺带检查了动作能不能真的执行。

---

## 🔗 相关阅读

- [BFM-Zero](../../04_Loco-Manipulation_and_WBC/BFM-Zero__A_Promptable_Behavioral_Foundation_Model_for_Humanoid_Control/BFM-Zero__A_Promptable_Behavioral_Foundation_Model_for_Humanoid_Control.html)：被测的轨迹条件 BFM
- [GENMO](../../14_Human_Motion/GENMO__A_Generalist_Model_for_Human_Motion/GENMO__A_Generalist_Model_for_Human_Motion.html)：文本 / 视频两组里都表现最好的人体动作通才模型
- [UH-1](../../03_High_Impact_Selection/UH-1_Learning_from_Massive_Human_Videos_for_Universal_Humanoid_Pose_Control/UH-1_Learning_from_Massive_Human_Videos_for_Universal_Humanoid_Pose_Control.html)：从海量人类视频学人形姿态控制，被测的文本条件模型
- [GMR](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html)：本文统一输出用的重定向
- [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)：本文验证可执行性用的全身跟踪策略
- [Behavior Foundation Model for Humanoid Robots](../../03_High_Impact_Selection/Behavior_Foundation_Model_for_Humanoid_Robots/Behavior_Foundation_Model_for_Humanoid_Robots.html)：BFM 概念的代表作
- [HumanoidBench](../HumanoidBench/HumanoidBench.html)、[Mimicking-Bench](../Mimicking-Bench__A_Benchmark_for_Generalizable_Humanoid-Scene_Interaction_Learning/Mimicking-Bench__A_Benchmark_for_Generalizable_Humanoid-Scene_Interaction_Learning.html)：图 2a 里对比的已有人形基准，评的是任务或技能，不评可操控性
