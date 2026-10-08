---
layout: paper
title: "AnyWorld: Factorized Egocentric World Models for Cross-Embodiment Generalization"
zhname: "AnyWorld：可分解的第一人称世界模型，把人类视频「改写」成跨本体机器人经验"
category: "Manipulation"
---

# AnyWorld: Factorized Egocentric World Models for Cross-Embodiment Generalization
**AnyWorld：可分解的第一人称世界模型，把人类视频「改写」成跨本体机器人经验**

> 📅 阅读日期: 2026-09-04
>
> 🏷️ 板块: Manipulation · 世界模型 · 第一人称视频 · 跨本体泛化 · 数据生成 · VLA 下游增强
>
> 🔁 推进轨: 模块轮转（05_Locomotion → **06_Manipulation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2608.29242](https://arxiv.org/abs/2608.29242) |
| HTML | [在线阅读](https://arxiv.org/html/2608.29242v2) |
| PDF | [下载](https://arxiv.org/pdf/2608.29242) |
| 项目主页 | [xpeng-robotics.github.io/anyworld](https://xpeng-robotics.github.io/anyworld/) |
| 源码 | 🌟 **已开源** [xpeng-robotics/AnyWorld](https://github.com/xpeng-robotics/AnyWorld)（`image_editing/` 本体编辑器 + `world_model/` 因子化世界模型推理 + `scripts/`） |
| **发布时间** | 2026-08-29 (v1) / 2026-09-01 (v2) |

**作者**：Cheng Chen、Jerry Bai、Jiacheng Wei、Boyu Chen、Xiaoji Zheng、Fan Wu、Minghao Yang、Tianrun Chen、Ruibo Li、Xiaoyu Yue、Xiaoyang Guo、Yixiao Ge、Guosheng Lin、Fayao Liu

**机构**：小鹏机器人（XPeng Robotics）等（含南洋理工 NTU / A*STAR 等学术合作）

**机器人 / 平台**：真机 **IRON** 人形（抓取实验）· 仿真 **RoboCasa GR1**（桌面操作）· 人类参考数据 **EgoDex**

---

## 🎯 一句话总结

机器人学习最缺的是数据，而人类第一人称视频（戴头显做家务、操作物体）多到用不完——但它们是「人手 + 人的视角」，没法直接喂给机器人。既有做法要么做**成对的人-机重定向**（贵、难扩），要么用视频生成但**动作 / 视角 / 本体纠缠在一起**、改一个就全乱。AnyWorld 的核心是**因子化（factorize）**：把一段交互拆成**动作条件、相机条件、本体条件**三路彼此独立的信号，再用一个视频世界模型按这三路重新「渲染」——于是**同一段人类动作**可以被自由地换成 GR1 / IRON 等不同机器人、换视角、换场景，生成机器人自视角、且保留原交互动力学的 rollout。全程**不需要成对人-机演示**，把稀缺人类视频扩成规模化、可控的机器人训练经验，真机 IRON 抓取成功率从 20% 提到 55%。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| AnyWorld | — | 本文方法名，因子化第一人称世界模型 |
| Egocentric | — | 第一人称（自视角）视频，如头显采集的人手操作 |
| Cross-Embodiment | — | 跨本体，指人手 ↔ 不同机器人间迁移 |
| Plücker Ray | — | 普吕克射线嵌入，用来把相机内外参编码成逐像素几何 |
| VLA | Vision-Language-Action | 视觉-语言-动作策略，本文用作下游被增强对象 |
| DiT | Diffusion Transformer | 扩散 Transformer，视频世界模型骨干 |
| EgoDex | — | 大规模第一人称人手操作数据集，本文预训练来源 |
| RoboCasa | — | 仿真操作基准（GR1 本体） |
| Unpaired | — | 非成对，指训练不需要「同一场景人做一遍+机器人做一遍」 |

---

## ❓ 论文要解决什么问题？

想把人类第一人称视频变成机器人训练数据，路上有两道坎：

1. **本体鸿沟**——视频里是**人手 + 人视角**，机器人是另一套形态和相机；直接学会「学到人手外观」而非可执行的机器人技能。
2. **纠缠难控**——如果用一个视频生成模型直接改写，**动作、相机运动、机器人外观**是耦在一起的，你想「只换机器人、动作和视角不变」却做不到，生成结果既不可控也不保真。

传统折中是采**成对数据**（同一任务让人做一遍、再让机器人做一遍做对齐），但这种配对采集**昂贵且难以规模化**。AnyWorld 的主张：**不要成对数据，也不要纠缠生成**——把交互显式**分解成三路独立条件**，让世界模型按需重组，从一段人类视频派生出任意本体 / 视角 / 场景的机器人经验。

---

## 🔧 方法拆解

### 1. 因子化三条件（核心思想）

把一次交互解耦为彼此正交、可独立替换的三路条件：

- **动作条件（Action）**：渲染成**像素空间的骨架控制视频**，把运动放在图像坐标而非某个机器人的关节命令上 → 天然**本体无关**，可跨形态复用。
- **相机条件（Camera）**：用相机内外参 + **普吕克射线嵌入（Plücker ray）**编码，把「相机怎么动」和「物体 / 手怎么动」分开 → 可自由换视角。
- **本体条件（Embodiment）**：由**首帧图像**（给出机器人外观、场景、物体布局）+ **文本标签**（指明是哪种机器人）共同指定 → 可换成 GR1 / IRON 等不同本体。

### 2. 世界模型：潜空间扩散视频模型（差异化条件注入）

以 **Wan2.1 Combined-Control（14B）** 视频扩散模型为底座，三路条件用**不同方式**注入，互不干扰：

| 条件 | 注入方式 |
|---|---|
| 动作控制 | 与带噪视频 latent **拼接为输入通道** |
| 相机控制 | 经**轻量 adapter** 加到 patch embedding |
| 本体标签 | 在 Transformer 块里经**交叉注意力**注入 |

推理时按 `V̂ = G_θ(Ĩ⁰, A, C, τ)` 生成目标 rollout：给定目标本体首帧 `Ĩ⁰`、动作序列 `A`、相机序列 `C`、本体标签 `τ`，输出机器人自视角、可控重组的视频。

### 3. 两阶段训练（关键：非成对）

- **阶段一 · 预训练**：在 **20 万段 EgoDex 人类交互片段**上训 30K 步，先学**动作-相机先验**（怎样的手部运动配怎样的视角变化）。
- **阶段二 · 混合本体微调**：用 EgoDex / RoboCasa GR1 / IRON 的**非成对数据**微调 5K 步，把先验**接地**到机器人的外观与几何——**不需要成对人-机片段**。

### 4. 配套：本体编辑器（image_editing）

开源仓库还含一条**逆向伪配对（reverse pseudo-pair）**构造 + 本体编辑器：基于 Qwen-Image-Edit 把人手 / 场景改写成机器人外观首帧，为世界模型提供目标本体的初始观测。

### 5. 下游用法

生成的机器人自视角 rollout 用来**扩增 VLA 策略的训练数据**，从而在真机 / 仿真上提升抓取与操作成功率；还可做**状态条件的策略修复**（用重置场景 + 校准动作纠正策略的「伪完成」捷径）与**空间指令接地**。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph SRC["🎥 人类第一人称视频 (EgoDex)"]
        EGO["单段人手交互<br/>戴头显自视角"]
    end

    subgraph FACT["🧩 因子化三条件"]
        A["动作条件<br/>像素空间骨架控制视频<br/>(本体无关)"]
        C["相机条件<br/>Plücker 射线嵌入<br/>(视角可换)"]
        E["本体条件<br/>目标首帧 + 文本标签<br/>(本体可换)"]
    end

    subgraph WM["🌀 世界模型 (潜空间扩散视频 · Wan2.1-14B)"]
        CAT["动作↔通道拼接"]
        ADP["相机↔patch adapter"]
        XATT["本体↔交叉注意力"]
        GEN["G_θ 生成机器人自视角 rollout"]
    end

    OUT["🤖 机器人经验<br/>换本体 / 视角 / 场景<br/>保留交互动力学"]
    VLA["📈 增强下游 VLA 策略<br/>(GR1 桌面 / IRON 真机抓取)"]

    EGO --> A & C & E
    A --> CAT --> GEN
    C --> ADP --> GEN
    E --> XATT --> GEN
    GEN --> OUT --> VLA

    style SRC fill:#fff7e0,stroke:#d4a017
    style FACT fill:#e8f4fd,stroke:#1f78b4
    style WM fill:#f3e8fd,stroke:#8e44ad
    style OUT fill:#e8f8e8,stroke:#27ae60
    style VLA fill:#fde8ee,stroke:#c0392b
</div>

---

## 🖥️ 源码运行时序图（mermaid）

> 基于开源仓库 [xpeng-robotics/AnyWorld](https://github.com/xpeng-robotics/AnyWorld)：`image_editing/`（本体编辑器：逆向伪配对构造 + 训练/推理）、`world_model/`（因子化动作-相机-本体世界模型推理）、`scripts/`（训练/推理启动器）、`docs/`（输入格式 / 几何约定 / 外部权重布局）。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户 / CLI
    participant EDT as scripts/train_image_editor.sh<br/>(DiffSynth-Studio)
    participant IE as image_editing/infer.py<br/>(本体编辑器)
    participant EXT as 外部权重<br/>Qwen-Image-Edit / Wan2.1
    participant WM as world_model/scripts/infer.py
    participant CFG as JSON 输入配置<br/>(动作/相机/本体标签)
    participant OUT as 生成 rollout 视频

    U->>EDT: ① 训练本体编辑器 (逆向伪配对)
    EDT->>EXT: 载入 Qwen-Image-Edit-2511
    EDT-->>U: 导出编辑器 checkpoint

    U->>IE: ② 推理：把人手/场景改写成机器人首帧
    IE->>EXT: 调用编辑器权重
    IE-->>CFG: 产出目标本体初始观测 Ĩ⁰

    U->>WM: ③ 世界模型推理 (因子化条件注入)
    WM->>EXT: 载入 Wan2.1 Combined-Control + AnyWorld 适配 Transformer
    WM->>CFG: 读取动作 A / 相机 C(Plücker) / 本体 τ
    WM-->>WM: 通道拼接(A) + patch adapter(C) + 交叉注意力(τ)
    WM->>OUT: 生成机器人自视角 rollout V̂

    U->>OUT: ④ 采集为机器人训练数据
    OUT-->>U: 扩增 VLA 训练集 → 提升下游抓取/操作
</div>

---

## 💡 核心贡献

1. **因子化世界模型**：首次把「动作 / 相机 / 本体」显式解耦为三路可独立替换的条件，让一段人类视频可被**自由重组**成任意本体、视角、场景的机器人经验。
2. **无需成对人-机数据**：两阶段（人类视频预训练 → 混合本体非成对微调）即可把动作-相机先验接地到机器人外观，绕开昂贵的配对采集。
3. **差异化条件注入**：动作走通道拼接、相机走 Plücker + adapter、本体走交叉注意力，三者互不干扰、各自可控。
4. **下游可用、真机验证**：生成数据显著增强 VLA 策略，真机 IRON 抓取 20%→55%（+35pt）；并支持策略修复与空间指令接地等定向能力迁移。

---

## 📊 关键结果

| 指标 | 数值 |
|---|---|
| 可控性总分（动作/相机/本体对齐均值） | **0.778**（基线 WAN Fun-Control 0.609） |
| 动作对齐 ActionAlign | **0.659**（基线 0.170–0.655） |
| 相机对齐 CameraAlign | **0.789**（基线 0.315–0.402） |
| 本体正确率 EmbodAcc | **0.886**（基线 0.765–0.769） |
| 视频质量 VBench（主体/背景/平滑一致性） | 0.942 / 0.949 / 0.996（有竞争力） |
| 下游 RoboCasa GR1 桌面操作成功率 | **49.8% → 54.6%**（+4.8pt，18 任务） |
| 下游 IRON 真机抓取成功率 | **20.0% → 55.0%**（+35.0pt，20 次试验） |

> ⚠️ 具体数值以论文最终版为准；上表为结构性摘录。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **数据规模化** | 把「用不完的人类第一人称视频」变成机器人可用训练数据，缓解操作数据稀缺瓶颈 |
| **跨本体迁移** | 动作放在像素/骨架空间、本体作为可换条件，为「一份人类演示喂多种机器人」提供通用范式 |
| **可控生成** | 相机与本体解耦，能定向做视角泛化、场景增广、策略捷径修复等，而非只做一次性风格改写 |
| **世界模型作数据引擎** | 延续 DreamGen / DreamDojo / DreamZero 路线，把视频世界模型当「可控数据工厂」而非直接策略 |

---

## 🎤 面试参考

**Q：为什么不直接用一个视频生成模型改写人类视频成机器人数据？**
A：因为动作、相机、本体是纠缠的——你想「只换机器人、保持动作和视角」却做不到，生成既不可控也不保真。AnyWorld 把它们**因子化**成三路独立条件，各自用不同机制注入（动作拼通道、相机 Plücker+adapter、本体交叉注意力），才能自由重组、逐项可控。

**Q：不用成对人-机数据，怎么保证生成贴合真实机器人？**
A：两阶段——先在 20 万段 EgoDex 人类视频上学「动作-相机先验」，再用 EgoDex/GR1/IRON 的**非成对数据**微调把先验接地到各机器人的外观与几何。关键在于动作被表示为本体无关的像素骨架，本体只作为可替换条件，所以不需要同场景配对。

**Q：动作条件为什么要放到像素/骨架空间，而不是关节命令？**
A：关节命令是**本体相关**的，不同机器人自由度和结构都不一样，无法跨形态复用。把动作渲染成像素空间骨架控制视频后，它就与具体机器人解耦，同一段人类动作能被复用到 GR1、IRON 等任意本体。

**Q：生成的数据到底怎么帮下游策略？**
A：作为 VLA 的训练增广——把一段人类演示扩成多视角、多场景、目标本体自视角的 rollout，覆盖策略没见过的情形；论文里真机 IRON 抓取从 20% 提到 55%。此外还能做状态条件的策略修复（纠正「伪完成」捷径）和空间指令接地。

---

## 🔗 相关阅读

- [DreamGen: Unlocking Generalization in Robot Learning through Neural Trajectories (2505.12705)](https://arxiv.org/abs/2505.12705)：同属「视频世界模型造数据」路线，可对比其神经轨迹与本文的因子化条件
- [DreamDojo: A Generalist Robot World Model from Large-Scale Human Videos (2602.06949)](https://arxiv.org/abs/2602.06949)：从人类视频学通用机器人世界模型，与本文同源问题
- [DreamZero: World Action Models are Zero-shot Policies (2602.15922)](https://arxiv.org/abs/2602.15922)：把世界模型直接当零样本策略，与本文「世界模型作数据引擎」形成对照
- [EgoDex: Learning Dexterous Manipulation from Large-Scale Egocentric Video (2505.11709)](https://arxiv.org/abs/2505.11709)：本文预训练所用的第一人称人手操作数据集
