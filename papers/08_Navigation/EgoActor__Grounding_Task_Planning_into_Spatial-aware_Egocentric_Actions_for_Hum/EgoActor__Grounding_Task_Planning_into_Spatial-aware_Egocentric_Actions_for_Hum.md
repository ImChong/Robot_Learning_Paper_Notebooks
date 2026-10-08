---
layout: paper
paper_order: 2
title: "EgoActor: Grounding Task Planning into Spatial-aware Egocentric Actions for Humanoid Robots via Visual-Language Models"
zhname: "EgoActor：用 VLM 把任务规划落到人形机器人的空间感知第一视角动作上"
category: "Navigation"
---

# EgoActor: Grounding Task Planning into Spatial-aware Egocentric Actions for Humanoid Robots via Visual-Language Models
**EgoActor：用 VLM 把任务规划落到人形机器人的空间感知第一视角动作上**

> 📅 阅读日期: 2026-05-18
>
> 🏷️ 板块: Navigation · VLM · 任务规划 · 第一视角
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.04515](https://arxiv.org/abs/2602.04515) |
| HTML | [在线阅读](https://arxiv.org/html/2602.04515) |
| PDF | [下载](https://arxiv.org/pdf/2602.04515) |
| 项目主页 | [baai-agents.github.io/EgoActor](https://baai-agents.github.io/EgoActor/) |
| Hugging Face | [papers/2602.04515](https://huggingface.co/papers/2602.04515) |
| **发布时间** | 2026-02-04 (arXiv) |
| 源码（官方）| ✅ 已开源：[BAAI-Agents/RoboNoid](https://github.com/BAAI-Agents/RoboNoid) → 子目录 [`papers/EgoActor/`](https://github.com/BAAI-Agents/RoboNoid/tree/main/papers/EgoActor)（截至 2026-06 已放出推理代码与预训练权重） |
| 预训练权重 | [EgoActor-8b-Qwen3VL](https://huggingface.co/BAAI-Agents/EgoActor-8b-Qwen3VL) · [EgoActor-4b-Qwen3VL](https://huggingface.co/BAAI-Agents/EgoActor-4b-Qwen3VL) |
| 提交日期 | 2026-02 |

**机构**：北京智源人工智能研究院（BAAI）— `BAAI-Agents` 团队

**任务定位**：人形机器人**视觉 - 语言 - 动作（VLA）**导航 / 通用执行模型，强调**第一视角空间感知**与**多技能联合输出**。

---

## 🎯 一句话总结

EgoActor 把"高层语言指令 → 低层人形动作"的落地过程**统一成一个 VLM**：仅用第一视角 RGB 与指令，就能同时输出**移动 / 头部姿态 / 操作 / 人机交互**这四类动作原语，亚秒级推理，4B / 8B 双尺寸，覆盖仿真与真机环境。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VLM | Vision-Language Model | 视觉 - 语言基础模型 |
| VLA | Vision-Language-Action | 视觉 - 语言 - 动作模型，端到端输出动作 |
| VLN | Vision-and-Language Navigation | 视觉语言导航 |
| QA | Question Answering | 这里指**空间推理问答** |
| Ego | Egocentric | 第一人称 / 自我中心视角 |
| HRI | Human-Robot Interaction | 人机交互 |

---

## ❓ 论文要解决什么问题？

现有人形导航 / 任务规划路线大致分两类，各有痛点：

1. **VLM 规划 + 底层控制器解耦**：高层 VLM 出语言子目标，低层另训控制器执行。痛点是**接口高度抽象、丢失空间细节**——VLM 说"走近桌子"，但具体走几步、转多少度、要不要蹲下、是不是要躲人，这些**空间感知 + 细粒度动作**信息全靠下游补。
2. **端到端 VLA 直接出关节级动作**：粒度过细、采样效率低，且**导航 / 操作 / 交互很难放在同一个动作空间**。

EgoActor 提出折中路线——**EgoActing 任务**：给定第一视角 RGB + 自然语言指令，要求模型**直接输出一组带空间量的动作原语**，覆盖：

- **移动原语**：前进 / 横移 / 后退 N 米、转向 ±θ 度、变换高度（站立 / 半蹲 / 蹲下）；
- **头部动作**：主动改变注视方向（active perception）；
- **操作命令**：粗粒度抓取 / 放置 / 推 / 拉等接口；
- **人机交互**：靠近、招呼、对话触发等社交动作。

这样既保留 VLM 的语义推理能力，又把"机器人到底该怎么动"压进了模型本身。

---

## 🔧 方法拆解

### 1. EgoActing：被定义出来的新任务

- **输入**：单目第一视角 RGB（可带历史帧）+ 自然语言指令；
- **输出**：上面四类动作原语之一，带可执行的数值参数（距离 / 角度 / 高度 / 目标对象）；
- **特点**：**空间感知 + 多技能联合**，比起"出文本子目标"更接近真实控制接口。

### 2. EgoActor 模型架构

- 在通用 VLM 上做指令微调，统一输出**结构化动作 token**；
- 提供 **8B / 4B** 两个尺寸：8B 在细粒度场景（多人、属性识别）下更稳；4B 主打**亚秒级实时推理**；
- 行为粒度介于"VLN 文本指令"与"VLA 关节级动作"之间，**直接对齐下游的运动 / 操作控制器**。

### 3. 三类数据的混合监督

| 数据 | 作用 |
|---|---|
| 真实世界第一视角演示（RGB-only） | 学习"看到什么 → 做什么" 的动作分布 |
| **空间推理 QA** | 强化对距离 / 方向 / 朝向 / 可达性的几何理解 |
| 仿真演示 | 提供高量级、可控难度的动作 - 结果配对 |

> 这里的关键是：用 **RGB-only + QA + 仿真** 替代昂贵的真机遥操数据，**显著降低人工标注代价**，同时让模型对"空间量"建立内在表征。

### 4. 实时性 & 真机部署

- 4B / 8B 两个权重都达到 **< 1 s** 推理；
- 在仿真与真机环境做了**跨任务、跨场景**的评测，验证从抽象任务规划到具体动作执行的桥接能力；
- 论文同时承诺**开源代码、模型、数据与评测协议**，便于后续复现。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph IN["🧑 输入层（操作者 / 任务）"]
        INST["📝 自然语言指令<br/>(去厨房 / 把杯子递给我)"]
        EGO["👁️ 第一视角 RGB"]
    end

    subgraph DATA["📚 训练数据混合"]
        REAL["🎬 真实世界演示<br/>RGB-only"]
        QA["🧩 空间推理 QA<br/>(距离 / 方向 / 朝向)"]
        SIM["🕹️ 仿真演示<br/>动作-结果配对"]
    end

    subgraph MODEL["🧠 EgoActor VLM (4B / 8B)"]
        VENC["🖼️ 视觉编码"]
        LENC["📜 指令编码"]
        FUSE["🔗 多模态融合 + 空间推理"]
        HEAD["🎯 结构化动作 Token 解码"]
    end

    subgraph ACT["🤖 动作原语输出 (< 1s 推理)"]
        LOCO["🚶 移动: 前/后/横移 N 米, 转向 θ"]
        HEIGHT["🪑 高度: 站 / 半蹲 / 蹲"]
        HEAD2["👀 头部: 主动注视"]
        MANIP["✋ 操作: 抓 / 放 / 推 / 拉"]
        HRI["🤝 人机交互"]
    end

    subgraph EVAL["🧪 评测环境"]
        REALWORLD["🌍 真机"]
        SIMENV["🖥️ 仿真"]
    end

    REAL --> MODEL
    QA --> MODEL
    SIM --> MODEL

    INST --> LENC
    EGO --> VENC
    VENC --> FUSE
    LENC --> FUSE
    FUSE --> HEAD
    HEAD --> LOCO
    HEAD --> HEIGHT
    HEAD --> HEAD2
    HEAD --> MANIP
    HEAD --> HRI

    LOCO --> REALWORLD
    LOCO --> SIMENV
    MANIP --> REALWORLD
    HRI --> REALWORLD

    style IN fill:#fff7e0,stroke:#d4a017
    style DATA fill:#e8f4fd,stroke:#1f78b4
    style MODEL fill:#f3e8ff,stroke:#8e44ad
    style ACT fill:#fde8e8,stroke:#c0392b
    style EVAL fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **定义 EgoActing 新任务**：把"高层规划"和"低层执行"之间最容易丢失的"空间感知动作原语"层显式建模出来。
2. **统一多技能动作空间**：在一个 VLM 里同时输出移动 / 头部 / 操作 / HRI 四类动作，避免多模型拼接的接口断点。
3. **RGB + QA + 仿真混合监督**：用**空间推理 QA** 替代部分昂贵真机数据，是性价比很高的数据工程方案。
4. **4B / 8B 双尺寸 + 亚秒推理**：直接服务"真机实时控制"，不只是离线评测玩具。
5. **承诺开源代码、模型、数据与评测协议**：对 VLA / 人形 VLM 社区的复现友好度高。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 跨任务泛化 | 在多种任务 / 未见环境下，仍能给出可执行的动作原语 |
| 模型尺寸 | 8B 在**多人 / 属性识别**等细粒度场景下显著优于 4B；4B 胜在延迟 |
| 仿真 → 真机 | RGB-only 训练 + 空间 QA 监督的组合，使**仿真数据迁移到真机**成本可控 |
| 数据效率 | 引入空间推理 QA 后，所需真机演示数据规模明显下降 |

> ⚠️ 上表为结构性总结，具体数值请以论文正式版与项目页为准。

---

## 🤖 对人形机器人 / 导航领域的意义

| 方向 | 含义 |
|---|---|
| **VLA 粒度新基准** | 提出"动作原语 + 空间量"这一中间层，作为 VLN 文本子目标与端到端关节动作之间的折中接口 |
| **导航不再只是移动** | 一次性把头部、姿态、操作、HRI 拉进同一个动作空间，覆盖"日常任务"完整闭环 |
| **数据工程范式** | 用 **RGB-only + 空间 QA** 替代昂贵真机数据是可复用的训练秘方 |
| **真机实时性** | 4B 模型 < 1 s 推理证明 VLM 路线已具备真机闭环可行性 |

---

## 🧰 官方源码分析

> 📦 论文承诺的开源已落地：代码发布在 BAAI-Agents 的总项目仓库 **[RoboNoid](https://github.com/BAAI-Agents/RoboNoid)** 下的子目录 [`papers/EgoActor/`](https://github.com/BAAI-Agents/RoboNoid/tree/main/papers/EgoActor)（注意仓库**顶层** README 仍标 "Coming Soon"，但 EgoActor 子目录已是可运行代码 + 已发布权重）。README 内引用了本文标题与 `arXiv: 2602.04515`，可确认为官方实现。

**仓库结构**：`papers/EgoActor/` 目录包含 4 个条目——`README.md`（用法与引用）、`sample_inference.py`（推理入口脚本）、`utils.py`（核心工具库）、`sample_inference_trace/`（示例第一视角观测序列，含当前帧 `000001.jpg` 与对应低分辨率历史帧 `_half.jpg`）。当前以**推理示例 + 预训练权重**为主，训练脚本与完整 benchmark/数据集尚未在该目录给出。

**关键模块（`utils.py`，约 17.8 KB）**：

| 函数 | 作用 |
|---|---|
| `format_data_sft_with_step_and_hist` | 构建带**历史观测帧 + 历史动作**的多帧 SFT 输入，对应论文"可带历史帧"的设计 |
| `image_file_to_base64_url` / `convert_messages_for_vllm_api` | 把本地图像编码为 base64、组装成 vLLM 的多模态消息格式 |
| `get_vllm_multimodal_response` | 向 vLLM 的 OpenAI 兼容接口发起多图视觉-语言请求 |
| `parse_action` / `merge_turn_and_go_straight_action` | 把模型的自然语言输出**解析/合并为离散动作原语**（如 `turn_right`、`go_straight`、`sidestep_right` 及其幅度参数）——即笔记中"结构化动作 Token 解码 → 动作原语"那一步的具体实现 |

`sample_inference.py` 则负责加载观测图像、拆分当前帧与历史帧、构建多帧输入并调用上述工具完成一次推理。

**依赖与运行方式**：基于 **vLLM 0.11.0** 部署多图 VLM。

```bash
pip install vllm==0.11.0
# 启动模型服务（model_name 填下载的权重路径/名）
vllm serve [model_name] --host 127.0.0.1 --port 8000 \
    --max_model_len 6400 --chat-template-content-format auto \
    --limit-mm-per-prompt.image 15 --served-model-name "vlm_agent"
# 运行示例推理
python sample_inference.py
```

`--limit-mm-per-prompt.image 15` 对应"当前帧 + 多张历史帧"的多图输入上限，印证了论文的历史帧聚合做法。

**提供的资产**：HuggingFace 上开源两个预训练模型——[`EgoActor-8b-Qwen3VL`](https://huggingface.co/BAAI-Agents/EgoActor-8b-Qwen3VL)（基于 Qwen3-VL，空间推理更强）与 [`EgoActor-4b-Qwen3VL`](https://huggingface.co/BAAI-Agents/EgoActor-4b-Qwen3VL)（轻量、主打亚秒级实时），与正文"4B/8B 双尺寸"完全对应。

> 🔎 **源码印证笔记的要点**：① 动作以**离散原语 + 数值参数**形式由 `parse_action` 解出，证实了"结构化动作 Token"而非关节级连续动作；② 多图 + 历史动作输入坐实了"可带历史帧"的设计；③ 底座为 **Qwen3-VL**（笔记此前只写"通用 VLM"，源码进一步明确了具体底模）。

---

## 🎤 面试参考

**Q：EgoActor 跟 NaVILA / VLN 类工作的本质区别是什么？**
A：NaVILA 等 VLN 路线**只负责导航文本子目标**，把"具体怎么走"留给底层 locomotion；EgoActor 把"走多少 / 转多少 / 蹲不蹲 / 头看哪里 / 同时要不要抓东西"全部压进 VLM 输出里，是**显式带空间量、显式覆盖多技能**的更厚一层接口。

**Q：为什么不直接做端到端 VLA（VLM 出关节级动作）？**
A：关节级动作空间维度高、采样效率差，**移动 + 操作 + 头部 + 交互**很难放在同一个连续动作空间里。EgoActor 用"结构化动作原语"做折中：保留对空间量的细粒度控制，又避免与具体机器人形态强耦合，便于复用到不同人形平台。

**Q：空间推理 QA 在训练里到底起什么作用？**
A：RGB-only 数据本身没法直接监督"距离 / 角度 / 朝向"的概念，QA 数据相当于**显式地教模型"如何用视觉估算空间量"**，把几何推理能力打进 VLM 内部。后续动作头要输出"前进 1.2 m / 左转 30°"就自然有了内部表征支撑。

**Q：4B vs 8B 怎么选？**
A：真机闭环 / 延迟敏感任务用 4B，多人 / 复杂语义指代任务用 8B。论文给出的差异主要在**细粒度属性识别**上——人少、指令简单时 4B 已经够用。

---

## 🔗 相关阅读

- [NaVILA (2412.04453)](https://arxiv.org/abs/2412.04453)：足式机器人 VLA 导航，本仓库已有笔记
- [NoMaD (2310.07896)](https://arxiv.org/abs/2310.07896)：导航 + 探索的扩散策略
- [LookOut (2508.14466)](https://arxiv.org/abs/2508.14466)：真实世界人形第一视角导航对比工作
- [FocusNav (2601.12790)](https://arxiv.org/abs/2601.12790)：第一视角局部导航的空间注意力路线
- [EgoVLA (2507.12440)](https://arxiv.org/abs/2507.12440)：第一视角人类视频学到的 VLA 模型，思想互补
