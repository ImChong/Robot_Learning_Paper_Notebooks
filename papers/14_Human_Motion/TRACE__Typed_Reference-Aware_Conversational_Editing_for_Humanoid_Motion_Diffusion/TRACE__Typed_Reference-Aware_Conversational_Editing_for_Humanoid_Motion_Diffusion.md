---
layout: paper
title: "TRACE: Typed Reference-Aware Conversational Editing for Humanoid Motion Diffusion"
zhname: "TRACE：面向人形动作扩散的类型化、参考感知对话式编辑"
category: "Human Motion"
arxiv: "2610.21515"
---

# TRACE: Typed Reference-Aware Conversational Editing for Humanoid Motion Diffusion
**先让 LLM 从文本预测时长和「脚撑不撑地、根部升降高低、手抬多高」三类可测事件，按 4 帧一格对齐后与原文本一起喂给扩散 Transformer 直接生成 Unitree G1 动作；再用另一个编辑扩散模型把「左手再抬高 5 cm」这类相对请求编译成身体—时间掩码和相对目标，每一步采样把掩码外的坐标投影回原动作，支持多轮连续修改**

> 📅 阅读日期: 2026-10-28
>
> 🏷️ 板块: 14 Human Motion · 文本到人形动作 · 稀疏事件规划 · 动作扩散 · 对话式相对编辑
>
> 🔁 推进轨: 模块轮转（13_Physics-Based_Animation → **14_Human_Motion**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.21515](https://arxiv.org/abs/2610.21515) |
| HTML | [在线阅读](https://arxiv.org/html/2610.21515) |
| PDF | [下载](https://arxiv.org/pdf/2610.21515) |
| 项目页 | 没有单独的项目页（真机视频放在 GitHub README 里） |
| 源码 | 🌟 [Multimodal-Perception-Action/TRACE](https://github.com/Multimodal-Perception-Action/TRACE)（Apache-2.0，推理代码 + 划分列表；权重在 [ModelScope](https://modelscope.cn/models/kangzejian/TRACE)，独立的训练入口尚未放出） |
| **发布时间** | 2026-10-15（arXiv v1） |
| 版本 | 本笔记依据 v2（2026-10-22） |

**作者**：Zejian Kang、Yifu Luo、Boyang Shen（共同一作）、Jingxuan Li、Zekai Chen、Zekun Shi、Yongxue Xu、Zhenyu Hou、Bingqian Wu、Shaolei Zhang、Wentao Yang、Xiangru Huang（通讯，西湖大学）；单位包括浙江大学、西湖大学、TUM、华科、北科、北理、北航、中山、南大、人大。

**定位**：和 [TextOp](../../04_Loco-Manipulation_and_WBC/TextOp__Real-time_Interactive_Text-Driven_Humanoid_Robot_Motion_Generation_and_C/TextOp__Real-time_Interactive_Text-Driven_Humanoid_Robot_Motion_Generation_and_C.html) 一样直接在 G1 的关节空间里生成参考动作，只管上游的「参考动作好不好」，真机执行交给另外的跟踪控制器；和 [UniMoFlow](../UniMoFlow__Grounding_Instruction-Driven_3D_Human_Motion_Editing_in_Generation/UniMoFlow__Grounding_Instruction-Driven_3D_Human_Motion_Editing_in_Generation.html) 这类人体动作编辑相比，TRACE 的编辑请求是**相对于当前动作**的、能量化的（「再高 5 cm」），并且要求连续多轮都成立。

---

## 🎯 一句话总结

一句文字描述没法决定「哪一帧哪只脚撑地、手抬到多高」，从文字推出来的计划也可能和配对的训练动作对不上。TRACE 的做法是**从训练动作本身用正运动学测出事件**（左右脚支撑、根部竖直速度三档、根部高度三档、左右手相对骨盆高度四档，每 4 帧一格共 16 个通道），拿它监督一个 Qwen3-4B 规划器；扩散 Transformer 同时看原始文本和这份按时间对齐的计划，状态用「绝对高度 + 相对重力的倾斜」表示，再加积分轨迹与支撑脚的 FK 接触损失。编辑时，另一个 LLM 把请求解析成「属性、部位、带符号的变化量、时间区间」，编译器展开成手臂 7 个关节 × 时间区间的掩码和 $\sin^2$ 包络的腕部高度偏移，独立训练的编辑器在 DDIM 每一步把掩码外的坐标换回加噪后的原动作。BONES-SEED 测试集 13,302 条上 R@1 73.84%、FID 0.0434，都是对比方法里最好的；四轮连续抬手编辑全部成功的比例 30.82%，对比 TMED-G1 的 6.48%、SimMotionEdit-G1 的 2.74%。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| TRACE | Typed Reference-Aware Conversational Editing | 「类型化」= 事件和编辑请求都有固定类别；「参考感知」= 当前动作既是相对变化的基准，也是要保留的部分 |
| Plan | Sparse Event Plan | 16 通道 × 每 4 帧一格的事件计划；「稀疏」指词表小，时间上每一格都有值 |
| DiT | Diffusion Transformer | 8 层、宽 448、8 头，约 3,251 万参数 |
| FK | Forward Kinematics | 正运动学，用来测脚底高度、手掌高度，也用于可微接触损失 |
| DDIM | Denoising Diffusion Implicit Models | 确定性采样器，推理 50 步 |
| CFG | Classifier-Free Guidance | 生成用 2.5，编辑用 1.5 |
| IoU | Intersection over Union | 掩码与参考掩码的交并比 |
| BONES-SEED | — | Bones Studio 的动捕数据集，自带 G1 重定向和文字描述 |

---

## ❓ 这篇论文要解决什么问题？

1. **文字不够确定**：「跳一个开合跳」没说哪一帧起跳、手举到多高；只从文字推一份计划，可能描述的是另一种同样合理的跳法，和配对的训练动作对不上，等于给扩散模型错误的条件。
2. **轨迹会漂、脚会滑**：只预测局部姿态时，根部位移靠积分，小误差会累积；姿态看着对，支撑脚却在地上滑。
3. **相对编辑要以当前动作为准**：「把手再抬高一点」是相对于现在这条动作说的，其余部分要原样保留；而且对话会持续好几轮，每一轮都在上一轮的输出上改。

---

## 🔧 方法拆解

### 1. 从训练动作测出事件（第 3.2 节、附录 B.1）

对每条干净的训练动作做 FK：每只脚底 4 个采样点、手掌高度（相对骨盆，在重力对齐的坐标系里），地面高度取所有帧最低脚底高度的第 5 百分位。按固定阈值打标签（表 2）：

| 通道 | 量 | 规则 |
|---|---|---|
| 0–1 | 左 / 右脚支撑 | 高度 ≤ 0.035 m 且速度 ≤ 0.20 m/s 进入；高度 > 0.055 m 或速度 > 0.30 m/s 离开（迟滞） |
| 2–4 | 根部竖直速度 | 下降 / 平 / 上升，分界 −0.08、+0.08 m/s |
| 5–7 | 根部高度 | 低 / 中 / 高，分界 0.60、0.85 m |
| 8–11 / 12–15 | 左 / 右手高度 | H0–H3，相对骨盆分界 0、0.25、0.45 m |

阈值附近的帧（高度差 0.025 m 以内、速度差 0.02 m/s 以内）、不到 3 帧的接触段记为「不确定」。每 4 帧一格，目标 $Y$ 是确定帧的直方图，置信度 $W$ 是确定帧所占比例。

### 2. LLM 规划器 + 混合训练条件（式 1、式 3）

Qwen3-4B-Instruct 上的 LoRA 适配器从文字联合预测时长和带类型的事件区间（一个 JSON），确定性地栅格化成 $C \in [0,1]^{L \times 16}$，$L = \lceil N/4 \rceil$。扩散训练时一半样本用 $W \odot Y + (1-W) \odot h(u,N)$（真值事件，不确定的部分退回预测值），另一半直接用预测值，让生成器习惯推理时不完美的计划；测试时**只用**从文字预测的时长和事件。

### 3. 以重力为参照的状态（式 4、附录 C.1）

每帧 40 维：平面位移增量 $(\Delta p_x, \Delta p_y)$、**绝对**根部高度 $h$、偏航增量的 $(\sin, \cos)$、去掉偏航后的倾斜旋转（6D）、29 个关节角。只有平面位移和偏航需要积分，高度和倾斜直接预测，不会累积误差。对比的「Heading-local」表示是 38 维。

### 4. 三组训练损失（式 5、附录 C.2）

- **动作**：状态、速度、加速度重建；
- **几何**：积分出来的根部位置、累计偏航、身体朝上方向、$(\sin,\cos)$ 模长（权重 0.25 / 0.10 / 0.25 / 0.02）；
- **接触**：可微 FK 罚支撑脚滑动、2 / 4 / 8 帧滞后的漂移、支撑时脚底高度误差（各 0.05，Huber 型），以及所有帧的穿地（权重 1）。支撑掩码取自干净动作，不用计划里的预测概率。

### 5. 对话式相对编辑（第 3.4 节、附录 D）

1. **解析**：编辑用的 LLM 适配器读请求、时长和源动作摘要（每 4 帧的左右腕相对骨盆高度），输出属性、部位、带符号变化量、时间区间；
2. **编译**：部位展开到运动链（手部高度 = 7 个手臂坐标），掩码 $S(f,j) = 1[j \in K(e)]\,1[a \le f < b]$；目标偏移 $D_f = d \sin^2\!\big(\pi (f-a)/(b-a-1)\big)$，$0 < \|d\| \le 0.10$ m；无效或否定的请求让掩码保持关闭、动作不变；
3. **编辑器**：独立训练的扩散模型（同样 8 层、宽 448，外加 2 层源动作编码器），条件是源动作特征、掩码、偏移和按偏移改过的源事件；训练数据是重定向后的 MotionFix 5,387 对加 3,690 对用 IK 构造的局部抬手对；
4. **参考投影**（式 8）：每一步 DDIM 之后 $x _ {k-1} = S \odot \tilde{x} _ {k-1} + (1-S) \odot q _ {k-1}(\mathrm{Enc}(M_t))$，掩码外换成加噪到同一噪声水平的原动作，最后一步原样拷贝。输出成为下一轮的参考。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph TRAIN["🏷️ 训练监督：从配对动作测事件"]
        M0["BONES-SEED G1 动作<br/>120→20 FPS · 110,882 条片段"]
        FK0["FK：脚底 4 点 · 手掌相对骨盆<br/>地面 = 最低脚底高度第 5 百分位"]
        EV["阈值 + 迟滞 + 置信度<br/>每 4 帧一格 · 16 通道 Y、W"]
        M0 --> FK0 --> EV
    end

    subgraph GEN["✍️ 生成"]
        U["文本 u"]
        EMB["Qwen3-Embedding-4B（冻结）<br/>2560 维文本特征 e"]
        LLM["Qwen3-4B 规划器（LoRA，扩散训练时冻结）<br/>时长 N + 类型化事件区间"]
        RAS["栅格化 Plan C ∈ [0,1]^(L×16)"]
        MIX["训练时 1/2 概率：W⊙Y + (1−W)⊙h<br/>否则：只用预测 h"]
        DIT["DiT 8 层 · 宽 448<br/>文本主干 + 事件投影残差 α(k)"]
        X["40 维重力参照状态<br/>Δp_xy · h · sin/cos Δψ · 6D 倾斜 · 29 关节"]
        L["损失：动作 + 几何（积分轨迹）<br/>+ 接触（滑动 / 漂移 / 高度 / 穿地）"]
        U --> EMB --> DIT
        U --> LLM --> RAS --> MIX --> DIT
        EV -. 监督 .-> LLM
        EV -. 真值事件 .-> MIX
        DIT --> X
        X -. 训练 .-> L
    end

    subgraph EDIT["🔁 对话式编辑（独立编辑器）"]
        R["请求：「左手再高 5 cm」"]
        PAR["编辑 LLM：属性 · 部位 · 变化量 · 区间"]
        CMP["编译器：掩码 S（7 个手臂坐标 × [a,b)）<br/>偏移 D = d·sin²"]
        ED["参考条件编辑器<br/>源特征 + 改过的源事件"]
        PROJ["每步 DDIM 后参考投影<br/>掩码外换回加噪的原动作"]
        R --> PAR --> CMP --> ED --> PROJ
    end

    X -->|当前参考 M_t| PAR
    X -->|源动作| ED
    PROJ -->|M_t+1 作为下一轮参考| PAR
    PROJ --> OUT["G1 参考动作 → 下游跟踪控制器 → 真机"]
    X --> OUT
</div>

---

## 🚶 具体实例

### 例 1：一格的置信度回退（附录 B.1 表 3、式 3）

论文给的真实训练样本「a simple jump in place」第 87 格（帧 348–351）：根部高度目标 $Y = (0.00, 0.67, 0.33)$（低 / 中 / 高），置信度 $W = 0.75$（4 帧里 3 帧确定）。**假设**规划器对这一格的预测是 $h = (0.0, 0.2, 0.8)$，走混合分支时：

$$C = 0.75 \times (0, 0.67, 0.33) + 0.25 \times (0, 0.2, 0.8) = (0,\ 0.5525,\ 0.4475)$$

不确定的那四分之一权重交给预测值，而不是当成「没有事件」。

### 例 2：事件残差什么时候起作用（第 3.2 节）

残差条件按 $\alpha(k) = \min\!\big(1, k / [0.25(K-1)]\big)$ 缩放，$K = 1000$。$k \ge 250$ 时 $\alpha = 1$；$k = 100$ 时 $\alpha = 100/249.75 \approx 0.40$；接近干净动作时趋于 0——计划主要在去噪前期定结构，后期交给细节。

### 例 3：抬手偏移的包络（式 29）

$d = +5$ cm、区间 $[a, b) = [20, 60)$：第 20 帧 0 cm，第 30 帧 $5\sin^2(10\pi/39) \approx 2.60$ cm，第 39.5 帧达到 5 cm 峰值，第 50 帧约 2.20 cm，第 59 帧回到 0。两端平滑接回原动作，不会在边界跳一下。

### 例 4：掩码消融的数从哪来（图 6）

全量编译器在 199 条请求上 IoU 100%。去掉部位选择会打开全部 40 个坐标，IoU = 7/40 = **17.50%**；去掉运动链展开只留 3 个腕关节，IoU = 3/7 = **42.86%**；去掉时间定位则整段都打开，IoU 53.64% 反映请求区间平均占全长的比例。这三个数是几何比例，不需要重新训练模型。

---

## 📊 关键结果

**生成（表 1，BONES-SEED 测试集 13,302 条，32 选 1 检索）**

| 方法 | R@1 ↑ | R@3 ↑ | MM-Dist ↓ | FID ↓ | 用户研究总分 ↑（1–3） |
|---|---|---|---|---|---|
| TextOP（官方权重） | 10.54 | 25.18 | 1.2950 | 0.3985 | 1.306 |
| ECHO（官方权重） | 24.08 | 44.05 | 1.2008 | 0.2577 | 1.469 |
| MDM（G1 重训） | 58.84 | 79.31 | 0.9716 | 0.0897 | 1.313 |
| MotionGPT3（G1 重训） | 68.46 | 85.81 | 0.8886 | 0.0628 | 1.419 |
| **TRACE** | **73.84** | **90.31** | **0.8165** | **0.0434** | **2.391** |

**计划消融（表 4、5）**：只用文本 R@1 73.10、FID 0.0464；把事件在全段取平均（Global Events）73.65 / 0.0448；按格对齐 73.84 / 0.0434。监督来源换成「从文字推出的事件」降到 73.26 / 0.0458。差距不大，但方向一致：**时间上对齐**和**从动作测出来**都有用。

**运动学消融（表 6，单位 cm，归一化到 Heading-local）**：重力参照 → 加几何 → 加接触，滑动 28.15 → 23.05（0.819）、漂移 31.76 → 26.38（0.831）、高度误差 3.39 → 2.37（0.699）、穿地 0.266 → 0.133（0.501）。加几何损失后穿地反而从 0.158 升到 0.197，要靠接触损失压回来。

**编辑（图 7、表 9，199 条源动作 × 3 种四轮脚本 = 597 条链）**：四轮全部成功 TRACE 30.82%（95% 区间 26.07–35.62%），TMED-G1 6.48%，SimMotionEdit-G1 2.74%；三者共用掩码和参考投影，所以保护坐标误差都是 0，差距全在「请求的变化有没有做到」。TRACE 第四轮的边界速度跳变 26.3°/s，也比两个基线（34.3、52.7）小。

---

## 💡 核心贡献

1. **从动作测出来的类型化事件**：16 通道带置信度的事件计划由配对的训练动作决定，规划器学的是「这条文字对应的这条动作」的结构，而不是从文字随便推一个。
2. **以重力为参照的动作扩散**：绝对高度 + 倾斜直接预测，只积分平面位移和偏航；积分轨迹损失加只作用于支撑脚的 FK 接触损失。
3. **相对、可连续的编辑**：请求编译成身体—时间掩码与相对目标，编辑器每步做参考投影，多轮编辑都以上一轮输出为准。

---

## 🤖 对人形机器人领域的意义

- 直接输出 G1 的 29 个关节角加根部位姿，省掉「先生成人体、再重定向」这一步；README 的真机视频用的是另外的跟踪控制器。
- 「事件」这一层是人和规划器都看得懂、也能测的中间表示，便于检查生成结果、也便于说「这里再高一点」。
- 局限：只在平地、没有场景感知；检索和分布指标不检查每个预测事件是否被严格执行；接触损失只是鼓励、不保证零滑动；定量编辑评测只覆盖抬手高度，开合跳「跳更高」只是定性展示。

---

## 🛠️ 源码运行时序图（`Multimodal-Perception-Action/TRACE`）

仓库提供的是推理与对话编辑：`run.sh` → `run.py` 把生成拆成五个阶段，**每个阶段起一个子进程**，跑完就释放显存（`trace_core/pipeline.py` 的 `run_stage`）；`converse.py` 管多轮会话；论文定量评测用的抬手编辑器走 `edit.py`。README 写明独立的生成器 / 编辑器训练入口尚未放出。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户（bash run.sh / converse.py）
    participant RUN as run.py generate()
    participant PL as planner 阶段<br/>Qwen3-4B + planner_adapter
    participant EM as embedding 阶段<br/>Qwen3-Embedding-4B
    participant DF as diffusion 阶段<br/>EventDenoiser / BoundaryEventDenoiser
    participant PP as smooth + contact 阶段
    participant RD as render.py（MuJoCo）
    participant CV as converse.py run_turn()
    participant ED as edit.py / experimental_reference_edit.py

    U->>RUN: --text "A person walks forward..." --boundary free
    RUN->>RUN: check_models()、校验参数、写 request.json
    RUN->>PL: 子进程 --stage planner
    PL->>PL: chat 模板 + 贪心生成 JSON
    PL->>PL: compile_response() 结构校验 → 失败直接报错
    PL-->>RUN: plan.json / plan.npz（时长 + 16 通道事件）
    RUN->>EM: 子进程 --stage embedding
    EM-->>RUN: text_embedding.npy（1 × 2560）
    RUN->>DF: 子进程 --stage diffusion
    DF->>DF: pack_events() 把 Plan 对齐到 4 帧一格
    alt boundary = standing
        DF->>DF: sample_with_boundaries()：首尾 8 帧锁成站姿参考
    else free / none
        DF->>DF: ddim_sample()：DDIM-50、CFG 2.5
    end
    DF->>DF: 反归一化 → from_gravity_gauge() 40 维 → 35 维姿态
    DF-->>RUN: motion_raw.sps、pose35_raw.npy
    RUN->>PP: 子进程 --stage smooth：低通滤波（根 3 Hz、关节 4 Hz）
    RUN->>PP: 子进程 --stage contact：plan_support() + 脚跟 / 脚尖多点最小二乘修复
    PP-->>RUN: motion_final.sps、motion_final_qpos.npz
    RUN->>RD: render.py 出 mp4 / index.html
    RUN-->>U: result.json（gt_used = False）

    U->>CV: --source outputs/bow --instruction "Bow more deeply..."
    CV->>CV: summarize_motion() 当前动作摘要
    CV->>CV: --stage resolve：LLM 产出意图 → compile_intent() 部位 / 区间 / 目标
    CV->>ED: experimental_reference_edit.py --body --active-span --strength
    ED->>ED: 每步 DDIM 后掩码外换回加噪的源动作
    ED-->>CV: edit/motion_edited.sps + result.json
    CV->>CV: 检查 protected_encoded_coordinates_exact
    CV->>CV: 通过才把输出写成新的 current_motion（下一轮的参考）
    Note over ED: edit.py 的 infer()：SourceEventExtractor 抽源事件<br/>→ revise_events() 按偏移改手高事件<br/>→ sample_edit() 104 帧、CFG 1.5、逐步参考投影
</div>

---

## 🎤 面试参考

1. **为什么事件要从训练动作测，而不是从文字推？** 同一句话有多种合理动作；扩散模型重建的是配对的那一条，条件应当描述那一条。表 5 的对照（从文字推的事件 R@1 73.26 vs 73.84）支持这一点。
2. **为什么训练时要混一半预测的计划？** 测试时只有预测计划，全用真值训练会让模型依赖完美条件；置信度低的部分也退回预测值。
3. **重力参照表示比 Heading-local 好在哪？** 高度和倾斜不靠积分，误差不累积；表 6 里高度误差从 3.39 降到 2.60 cm 主要来自这一步。
4. **参考投影能保证什么、不能保证什么？** 能保证掩码外的编码坐标逐位不变；但如果编辑改了根部，世界坐标下的其余部位不一定不动（论文第 3.4 节自己指出）。
5. **为什么用「四轮全部成功」做指标？** 每一轮都在自己上一轮的输出上评测，失败会累积，比单轮成功率更接近真实对话。

---

## 🔗 相关阅读

- [HumanML3D](../HumanML3D/HumanML3D.html)：文本到动作的数据集和 R-Precision / FID 评测协议，TRACE 在 G1 上沿用了同一套指标。
- [TextOp](../../04_Loco-Manipulation_and_WBC/TextOp__Real-time_Interactive_Text-Driven_Humanoid_Robot_Motion_Generation_and_C/TextOp__Real-time_Interactive_Text-Driven_Humanoid_Robot_Motion_Generation_and_C.html)：表 1 的 G1 官方权重基线之一。
- [UniMoFlow](../UniMoFlow__Grounding_Instruction-Driven_3D_Human_Motion_Editing_in_Generation/UniMoFlow__Grounding_Instruction-Driven_3D_Human_Motion_Editing_in_Generation.html)：人体动作的指令式编辑。
- [TimelineControl](../TimelineControl__Streaming_Multi-Track_Timeline_Control_for_3D_Human_Motion/TimelineControl__Streaming_Multi-Track_Timeline_Control_for_3D_Human_Motion.html)：同样处理「什么时候、哪个部位」的时间结构，走的是多轨时间线。
- [Kimodo](../Kimodo__Scaling_Controllable_Human_Motion_Generation/Kimodo__Scaling_Controllable_Human_Motion_Generation.html)：可控人体动作生成的大规模版本。
