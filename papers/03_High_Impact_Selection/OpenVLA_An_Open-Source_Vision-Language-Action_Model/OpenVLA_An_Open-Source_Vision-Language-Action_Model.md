---
layout: paper
title: "OpenVLA: An Open-Source Vision-Language-Action Model"
category: "高影响力精选 High Impact Selection"
subcategory: "Sim-to-Real & Foundation Model"
zhname: "OpenVLA：开源的视觉-语言-动作模型"
arxiv: "2406.09246"
demos: ["openvla"]
original_check: done
original_check_date: 2026-11-14
original_check_scope: "arXiv 2406.09246v3 的 LaTeX 源码全文（正文 + 附录 A–G）+ 官方代码 openvla/openvla @ c8f03f4 + HuggingFace openvla/openvla-7b 配置与权重索引 + 项目页 openvla.github.io"
---

# OpenVLA: An Open-Source Vision-Language-Action Model
**在双视觉编码器（DINOv2 + SigLIP）与 Llama 2 7B 组成的 Prismatic VLM 上，把 97 万条真实机器人示范的 7 维动作按分位数量化成词表最冷门的 256 个 token 自回归预测，并给出消费级单卡 LoRA 微调与 4-bit 推理配方**

> 📅 阅读日期: 2026-10-03（占位）；2026-11-14 第二版：对照 [arXiv:2406.09246v3](https://arxiv.org/abs/2406.09246) 的 LaTeX 源码（正文 §1–§6 与附录 A–G）、官方代码库 [openvla/openvla](https://github.com/openvla/openvla)（`main` 分支，commit `c8f03f4`）、HuggingFace 检查点 [openvla/openvla-7b](https://huggingface.co/openvla/openvla-7b)（`config.json` 与 `model.safetensors.index.json`）及[项目页](https://openvla.github.io/)逐项核对重写。
>
> 🏷️ 板块: `03_High_Impact_Selection` · Sim-to-Real & Foundation Model
>
> 🧭 状态: 全文核验完成。论文正文 §3.2 写的「256 个等宽区间（256 bins）」在 `action_tokenizer.py` 里是 `np.linspace(-1, 1, 256)` 生成的 256 个端点（共 255 个区间，最后两档解码合并）；正文多处统称 7B 参数，而开源 `openvla-7b` 权重索引合计 7.54B（7,541,237,184）；表 1、表 2 的消融跑在早期单编码器版本 `openvla-v01-7b`（SigLIP + Vicuna-v1.5-7B，表 1 全参 7,188.1M）上；图 5 的 `DP (matched)` 胡萝卜柱顶印成 `53.5`（`8/15 = 53.3%`），附录图 10 两张泛化照片位置对调——下文逐处标明。

---

## 📋 基本信息

| 项目 | 内容 |
|------|------|
| **标题** | OpenVLA: An Open-Source Vision-Language-Action Model |
| **作者** | Moo Jin Kim\*, Karl Pertsch\*, Siddharth Karamcheti\*, Ted Xiao, Ashwin Balakrishna, Suraj Nair, Rafael Rafailov, Ethan Foster, Grace Lam, Pannag Sanketi, Quan Vuong, Thomas Kollar, Benjamin Burchfiel, Russ Tedrake, Dorsa Sadigh, Sergey Levine, Percy Liang, Chelsea Finn |
| **机构** | Stanford University · UC Berkeley · Google DeepMind · Toyota Research Institute · MIT |
| **发表会议 / 时间** | CoRL 2024（PMLR 270）· arXiv v1 2024-06-13 / v3 2024-09-05 |
| **原文链接** | [arXiv:2406.09246](https://arxiv.org/abs/2406.09246) · [PDF](https://arxiv.org/pdf/2406.09246) |
| **项目主页** | [openvla.github.io](https://openvla.github.io/) |
| **官方代码与权重** | [openvla/openvla](https://github.com/openvla/openvla)（MIT License）· [openvla/openvla-7b](https://huggingface.co/openvla/openvla-7b) |

---

## 🗺️ 在学习路线图中的位置

- **先修基石**：[Transformer](../../01_Foundational_RL/Transformer_Attention_Is_All_You_Need/Transformer_Attention_Is_All_You_Need.html)（因果自注意力与下一个词预测）→ [Diffusion Policy](../../01_Foundational_RL/Diffusion_Policy/Diffusion_Policy.html) / [ACT](../ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware.html) / [EgoMimic](../../06_Manipulation/EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video/EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video.html)（从零或小骨干训练的连续动作块模仿策略，也是本文新机器人微调实验的主要对照）。
- **本文定位**：第四季 VLA 线的开源起点。RT-2 / RT-2-X 证明把预训练视觉-语言模型（VLM）直接微调成机器人策略能获得语义与视觉泛化，但模型权重、训练配方和微调流程全部闭源；OpenVLA 把「VLM 变机器人策略」从数据筛选、双视觉编码器融合、分位数动作分词，到消费级 GPU 的 LoRA 微调与 4-bit 量化推理完整做成了开源可复现的标准基线。
- **后续演进**：OpenVLA 把 7 维单步动作切成 7 个离散 token 逐个自回归生成，在 RTX 4090 上约 6 Hz、A5000 上约 3.4 Hz，不输出高频连续动作块（论文 §6 第一条局限）；紧接其后的 [π₀](../Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.html)、[π₀.₅](../Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.html) 与 [GR00T N1](../GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.html) 正是为了突破这一自回归离散动作瓶颈，在 VLM 主干旁接上流匹配动作专家，一次生成整段高频连续动作。

---

## 🎯 一句话总结

OpenVLA 以 7B 级开源视觉-语言模型 **Prismatic-7B**（DINOv2 + SigLIP 双视觉骨干拼成每格 2176 维特征、经 MLP 投到 **Llama 2 7B** 的 4096 维词空间）为底座，在 Open X-Embodiment（OXE）筛出的 **97 万条真实机器人轨迹**上，把每步 7 维末端增量动作按第 1%–99% 分位数归一化并量化成 Llama 词表最后 256 个 token，按标准下一个词交叉熵训练了 27 轮（64 张 A100 跑 14 天，共 21,500 A100-hours）。开箱评测跨 WidowX 与 Google 机器人共 **29 个任务（230 次真机测试）** 平均成功率 **74.3%**，比 55B 闭源模型 RT-2-X（57.8%）高 **16.5 个百分点**；迁到新机器人 Franka 时，LoRA 微调（可训练参数占 1.4%，单张 A100 跑 10–15 小时）接近全量微调效果，配合 4-bit 量化可在 7.0 GB 显存下保持原成功率运行。

> 🎮 **本文内嵌 1 段十七幕动画 + 1 段配音视频 + 3 个交互演示**：
> 1. [十七幕动画：OpenVLA 全流程](#openvla-explainer-anim) —— 从闭源巨无霸 vs 从零小策略讲到双编码器、动作分词、分位数归一化、97 万条数据配方、WidowX / Google / Franka / LIBERO 四套评测、LoRA 与 4-bit 量化，以及论文与官方代码的出入。
> 2. [配音讲解视频](#openvla-video) —— 同一套十七幕分镜的竖屏中文配音版，可在线播放或下载。
> 3. [动作分词与分位数实验台](#openvla-bins-demo) —— 用官方 `bridge_orig` 真实统计量对比第 1%–99% 分位数与最大最小值归一化，逐维查看 255 个区间中心、词表编号与反量化误差。
> 4. [微调显存与量化推理计算器](#openvla-lora-demo) —— 切换表 1 的 6 种微调方案与图 6 / 表 2 / 表 11 的 6 张显卡 × 3 种精度，对比可训练参数、显存、推理频率及阻塞/非阻塞控制下的成功率变化。
> 5. [四套基准与消融数据台](#openvla-results-demo) —— 汇总图 3（WidowX 17 任务）、图 4（Google 机器人 12 任务）、图 5 + 表 7（Franka 7 任务）、表 12（LIBERO 4 套件）与表 9/10 消融读数。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 在本文中的含义 |
|------|------|----------------|
| **VLA** | Vision-Language-Action Model | 视觉-语言-动作模型：读入相机图像和自然语言指令，直接输出机器人控制动作的模型 |
| **VLM** | Vision-Language Model | 视觉-语言模型：在互联网图文数据上预训练的模型；本文底座是 Prismatic-7B（Karamcheti et al., 2024） |
| **OXE** | Open X-Embodiment | 汇集 22 种机器人、超过 100 万条轨迹的开源机器人数据集；本文从中筛出约 97 万条单臂末端控制轨迹 |
| **SigLIP** | Sigmoid Loss for Language Image Pre-Training | 用图文成对 Sigmoid 对比损失训练的 ViT 视觉编码器，擅长语义对齐与文字/图标识别 |
| **DINOv2** | Self-Distillation with No Labels v2 | 自监督特征蒸馏训练的 ViT 视觉编码器，擅长局部几何结构与三维空间定位 |
| **LoRA** | Low-Rank Adaptation | 低秩适配微调：冻结原权重矩阵 $W_0$，旁路添加低秩乘积 $\Delta W = BA$（本文优选秩 $r = 32$） |
| **BPE** | Byte-Pair Encoding | 字节对编码分词器；Llama 2 使用 SentencePiece BPE（基础词表 32,000 个 token） |

---

## 🎬 十七幕动画：OpenVLA 全流程 {#openvla-explainer-anim}

<div class="paper-demo" data-demo="openvla-explainer"><p class="demo-fallback">（本节含十七幕讲解动画，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#openvla-video}

<div class="paper-demo" data-demo="openvla-video" data-src="media/openvla_explainer_video.mp4" data-poster="media/openvla_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/openvla_explainer_video.mp4" download="OpenVLA_讲解视频.mp4">下载 mp4（23.1 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（要解决什么问题、架构与动作分词、97 万条预训练配方、多机器人与微调实验）按小节收起，再往后的论文与代码对照、局限、具体实例、核心贡献和延伸阅读各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块。
>
> 动画第 1、8–10、12、13、16、17 幕的真机画面剪自[项目页](https://openvla.github.io/)的视频（WidowX 杂物取茄子、语言定位泰迪熊、指定朝向放胡萝卜、抓偏后自主恢复，Google Robot 抓可乐罐、挪粉杯与 Taylor Swift 指令，Franka 倒玉米、翻锅和擦桌子），画面里自带的倍速标签照原样保留，仅作讲解引用。第 1、7–10、12、14、17 幕使用论文图 1–5、7、8 的裁剪；图 6 的每秒动作数按论文 PDF 矢量图网格线像素读出近似值。第 2 幕的 WidowX 250 机械臂采用 [MuJoCo Menagerie](https://github.com/google-deepmind/mujoco_menagerie) 的 `trossen_wx250s`（BSD-3）离线渲染，末端标出 x 红、y 绿、z 蓝三维坐标系。

---

## ❓ 论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：传统机器人策略泛化窄、闭源 VLA 用不起也改不动——三个核心瓶颈</summary>

论文引言（§1）与相关工作（§2）把当时的通用机器人策略困境拆成两条路线的各自短板：

<h3 id="sec-problem-scratch">1. 从零或拼接预训练组件的传统模仿策略：泛化边界窄</h3>

以 [Diffusion Policy](../../01_Foundational_RL/Diffusion_Policy/Diffusion_Policy.html)、[ACT](../ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware.html) 为代表的单任务模仿策略在固定场景精细动作上表现突出，但面对未见过的物体外观、桌面杂物干扰或改写过的自然语言指令时容易失效。像 Octo（93M 参数）这样的开源通才策略虽然在多机器人数据上训练，却只把现成的语言嵌入或视觉编码器拼接到从零初始化的额外模块上，没有继承互联网规模 VLM 把视觉与语言对齐在同一个表示空间里的先验知识。

<h3 id="sec-problem-closed">2. 闭源视觉-语言-动作模型（RT-2 / RT-2-X）：不开放且部署门槛高</h3>

Google DeepMind 的 RT-2 与 RT-2-X（最高 55B 参数）把机器人动作直接当成大语言模型词表里的 token，在互联网图文数据与机器人轨迹上联合微调，展现出跨物体和跨语义概念的涌现能力。但论文指出当时存在三道门槛：

1. **模型闭源**：RT-2 / RT-2-X 只提供内部或受限接口，不公开模型权重、训练代码与数据处理细节；已有开源 VLA 尝试（如震旦/社区的 LLaRA、RT-1 复现等）要么只跑仿真和单机器人，要么规模停在较小参数量，缺少能在多台真机上抗衡 RT-2-X 的通用基础模型。
2. **数据与训练设计未探明**：把什么样的 VLM 主干、怎样的视觉分辨率、哪些跨构型机器人数据混合在一起，究竟要不要冻结视觉编码器、训多少轮才开始学会精细控制——此前缺乏公开的系统消融。
3. **新机器人微调与板载推理代价未知**：7B 级模型全参数微调需要多张 A100（表 1 测得批大小 16 时多卡显存总和 163.3 GB），高校实验室和普通机器人工作站往往只有单张消费级显卡（如 RTX 4090 或 RTX A5000）。能否用参数高效微调（LoRA）和低比特量化（int8 / int4）在不掉成功率的前提下把 7B VLA 装进单张显卡，需要实机实验验证。

OpenVLA 围绕这三点展开：先用 7B 级开源组件和 97 万条公开真机轨迹训出一个胜过 55B RT-2-X 的开源底座，再系统验证新机器人的 LoRA 微调配方与量化推理特性，并把代码、权重、微调笔记本全部以开源协议放出。

</details>

---

## 🔧 核心方法

<div class="mermaid">
flowchart LR
  IMG["输入 RGB 图像<br/>224 × 224 × 3"] --> DINO["DINOv2 ViT-L/14<br/>256 × 1024（空间几何）"]
  IMG --> SIG["SigLIP ViT-SO400M/14<br/>256 × 1152（语义对齐）"]
  DINO --> CAT["按通道拼接<br/>256 × 2176"]
  SIG --> CAT
  CAT --> PROJ["MLP 投影器（代码 3 层 GELU）<br/>256 × 4096 视觉卡片"]
  TXT["语言指令提示词<br/>In: What action... Out:"] --> TOK["Llama 2 BPE 分词<br/>N × 4096 文字卡片"]
  PROJ --> LLM["Llama 2 7B 因果 Transformer<br/>32 层 · 宽 4096 · 词表 32,064"]
  TOK --> LLM
  LLM --> ACT["自回归吐出 7 个动作词<br/>ID 31744..31999（最后 256 个冷门词）"]
  ACT --> DETOK["查区间中心 + 按 q01..q99 反归一化<br/>(Δx, Δy, Δz, Δroll, Δpitch, Δyaw, Grip)"]
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：双编码器 Prismatic 架构、256 档分位数动作分词、97 万条 OXE 数据配方与五大训练发现</summary>

<h3 id="sec-method-vlm">1. 底座架构：双视觉编码器 Prismatic-7B（§3.1 + 官方权重核对）</h3>

OpenVLA 建立在同组前作 **Prismatic VLM**（Karamcheti et al., 2024）之上，由三块组成：

1. **双流融合视觉编码器（Fused Vision Backbone）**：同一张 $224 \times 224$ 的第三视角单帧 RGB 图像，按各自归一化参数预处理后同时送入两个预训练 ViT（均取倒数第二层 patch 特征，`patch_size = 14`，输出 $16 \times 16 = 256$ 个空间块）：
   - **DINOv2**（`vit_large_patch14_reg4_dinov2.lvd142m`，忽略 CLS 与 4 个 register token）：输出 $256 \times 1024$，自监督特征擅长底层三维几何与精细空间定位；
   - **SigLIP**（`vit_so400m_patch14_siglip_224`）：输出 $256 \times 1152$，图文对比特征擅长高层语义、常见名人/图标与文字理解。
   两路特征在每个空间位置按通道拼接成 $256 \times 2176$。
2. **视觉-语言投影器（Projector）**：把每个空间块的 $2176$ 维向量投到语言模型的 $4096$ 维隐藏空间，得到 256 个视觉 token。
   - **论文与代码差异**：论文 §3.1 写的是「2 层 MLP 投影器」（对应早期单编码器 `v01` 配置的 `Linear → GELU → Linear`）；而开源主模型 `openvla-7b` 采用融合骨干专用的 `FusedMLPProjector`，由 **3 层线性层 + 2 个 GELU** 组成（$2176 \to 8704 \to 4096 \to 4096$，带偏置，共 **71,385,600** 参数）。
3. **语言主干（Llama 2 7B）**：32 层因果 Transformer，隐藏维 $4096$，前馈中间维 $11008$。输入序列依次拼入提示词前缀（官方代码格式为 `In: What action should the robot take to {instruction}?\nOut: `）与 256 个视觉 patch token，自回归预测动作 token。
   - **精确参数统计**（直接汇总 `openvla/openvla-7b` 的 `model.safetensors.index.json`）：视觉骨干 **730,911,680**（730.9M）+ 3 层投影器 **71,385,600**（71.4M）+ Llama 2 主干 **6,738,939,904**（6.74B，词表从 32,000 补齐 64 个 `<PAD>` 到 `32,064`）= **7,541,237,184（7.54B）**，`bfloat16` 权重文件总计 15.08 GB（官方 README 亦称「all 7.5 billion parameters」）。

<h3 id="sec-method-tokenizer">2. 连续动作词表化与第 1%–99% 分位数归一化（§3.2 + <code>action_tokenizer.py</code>）</h3>

为了让 Llama 2 不用改动模型头就能直接输出连续控制量，OpenVLA 沿用 Brohan et al.（RT-2）的离散化思路，针对 Llama 的 SentencePiece BPE 词表做了专门处理：

1. **分位数归一化（Quantile Normalization）**：开源机器人数据集中常混有极少数遥操作抖动或碰撞产生的离群峰值。若按传统的最大值/最小值（`[min, max]`）线性缩放到 $[-1, 1]$，正常动作会被挤压在零附近的十几个格子里，有效控制分辨率急剧恶化（附录 B）。因此，OpenVLA 按每个数据集、每个动作维度的**第 1 百分位数 $q _ {01}$ 与第 99 百分位数 $q _ {99}$** 把连续动作 $a_d$ 归一化并截断到 $[-1, 1]$：
   $$\tilde{a}_d = \operatorname{clip}\!\left(\frac{2\,(a_d - q _ {01,d})}{q _ {99,d} - q _ {01,d}} - 1,\;-1,\;1\right)$$
   在官方 `bridge_orig` 统计量中，前 6 维（平移增量 $\Delta x, \Delta y, \Delta z$ 与欧拉角增量 $\Delta\text{roll}, \Delta\text{pitch}, \Delta\text{yaw}$）开启该归一化（`mask = True`），第 7 维二值/开度夹爪（`[0, 1]`）保持原值（`mask = False`，不拉伸到 $-1$）。
2. **256 端点离散化与词表尾部覆盖**：
   - **论文表述**：将 $[-1, 1]$ 均匀切成 256 个区间（256 uniform bins），并用动作 token 覆盖 Llama 分词器基础词表中**使用频率最低的最后 256 个 token**。
   - **代码精确行为**（`prismatic/vla/action_tokenizer.py`）：代码写的是 `self.bins = np.linspace(-1, 1, 256)`，生成 **256 个端点**，两两构成 **255 个等宽区间**（步长 $\Delta = 2/255 \approx 0.007843$，区间中心数组 `bin_centers` 长度为 255，范围 $[-254/255, +254/255] \approx [-0.99608, +0.99608]$）。调用 `disc = np.digitize(a_norm, bins)` 得到 $1\dots 256$（仅当 $\tilde{a}_d = +1.0$ 时取 $256$），再映射为词表 ID：
     $$\text{token\_id} = 32000 - \text{disc} \in \{31744, \dots, 31999\}$$
     注意虽然模型嵌入矩阵为硬件对齐补了 64 行（`vocab_size = 32064`），`ActionTokenizer` 内部用 `tokenizer.vocab_size - num_added_tokens = 32000` 计算偏移，因此动作词落在 `31744..31999` 而不是 `31808..32063`。解码时先算 `disc = 32000 - token_id`，再将 `disc - 1` 截断到 `[0, 254]` 查 `bin_centers`——这意味着 `disc = 255`（ID `31745`）与 `disc = 256`（ID `31744`）在解码时**合并映射到同一个中心 $+0.99608$**，最后按：
     $$\hat{a}_d = \frac{\hat{\tilde{a}}_d + 1}{2}\,(q _ {99,d} - q _ {01,d}) + q _ {01,d}$$
     还原成物理动作单位（米、弧度、夹爪开度）。
3. **训练损失（§3.2 + `datasets.py`）**：标准下一个词预测交叉熵损失，**仅在 7 个动作 token 加上紧跟其后的 `<EOS>`（共 8 个位置）上计算梯度**：代码把提示词与图像位置对应的标签设为 `IGNORE_INDEX = -100`（`labels[:-(action_dim + 1)] = -100`），不对自然语言提示词算损失。

<h3 id="sec-method-data">3. 97 万条 OXE 真机数据筛选与采样配比（§3.3 + 附录 A）</h3>

OpenVLA 从 Open X-Embodiment（OXE）原始超百万轨迹中按三条原则整理出 **970k 条真实机器人操作轨迹**：

1. **输入输出空间对齐**：只保留至少包含**一路第三视角相机**且采用**单臂末端执行器控制**（7 维：末端平移/旋转 + 夹爪）的子集（约涵盖 20 余个数据集，最大三块在混合采样中的占比读数如官方配比：Fractal / RT-1 Google Robot、Kuka、BridgeData V2，另补入训练末期新发布的 **DROID** 10% 保守权重）。
2. **复用 Octo 的启发式权重重平衡**：降低超大但任务单一的数据集权重，上调任务与场景多样性高的子集，并对过采样倍率加封顶以防小数据集过拟合。
3. **排除纯仿真与极端低多样性子集**：与只训单机器人或混入大量仿真轨迹的工作不同，预训练混合全部来自真实机器人硬件。

<h3 id="sec-method-design">4. 五大关键训练设计发现（§3.4）</h3>

论文在正式扩大规模前通过小规模迭代总结出五条关键经验：

1. **必须微调视觉编码器（Fine-tuning Vision Backbone is Critical）**：在普通图文 VLM 训练中（包括底座 Prismatic 自身），冻结视觉编码器往往表现更好；但在 VLA 控制中，冻结的互联网视觉特征丢失了判断夹爪与物体相对位置所需的细粒度空间几何。附录表 10 的 6 组受控对比显示：冻结视觉骨干成功率 **46.7%**，端到端一起微调视觉骨干升至 **80.0%**（+33.3 个百分点）。
2. **双视觉编码器优于单一编码器**：DINOv2 的底层空间感知与 SigLIP 的高层语义互补（表 9 在 Bridge 单数据集上，DINOv2+SigLIP 45.6% vs 单 SigLIP 40.6%，跨构型完整模型达 76.3%）。
3. **更高图像分辨率并未带来收益**：将输入从 $224 \times 224$ 升至 $384 \times 384$，计算开销增加约 **3 倍**（patch token 从 256 个涨到 729 个），但控制评测未见提升，因此定在 $224 \times 224$。
4. **训练轮数远多于普通 VLM（27 Epochs vs 1–2 Epochs）**：普通 VLM 微调通常跑 1–2 轮即收敛；OpenVLA 观察到必须持续训练直到**训练集动作 token 预测准确率超过 95%**，真机成功率才不再明显攀升。最终完整运行共训练 **27 轮**（64 张 A100 跑 14 天，共 **21,500 A100-hours**，全局批大小 2048，固定学习率 $2\times 10^{-5}$，不加 warmup）。
5. **学习率与数据调整**：视觉编码器直接沿用与 LLM 相同的 $2\times 10^{-5}$ 固定学习率即可稳定收敛；训练最后三分之一阶段移除 Kuka 与新并入的 DROID 大集合，聚焦精细多任务数据收尾（附录 A）。

</details>

### 🎛️ 交互演示 1：动作分词与分位数实验台 {#openvla-bins-demo}

<div class="paper-demo" data-demo="openvla-bins"></div>

### 🎛️ 交互演示 2：微调显存与量化推理计算器 {#openvla-lora-demo}

<div class="paper-demo" data-demo="openvla-lora"></div>

---

## 🧪 实验与结果

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：开箱 29 个真机任务胜过 55B RT-2-X、新真机 Franka 与 LIBERO 微调、LoRA 与 4-bit 量化推理（含非阻塞陷阱分析）</summary>

论文围绕四个核心问题组织实验：① 多机器人开箱即用泛化（§5.1）；② 迁到未见过的机器人构型与仿真基准（§5.2 + 附录 F）；③ 参数高效微调（§5.3）；④ 量化推理与控制频率影响（§5.3 + 附录 E）。

<h3 id="sec-exp-oob">1. 开箱即用真机评测：WidowX 17 任务 + Google 机器人 12 任务（§5.1，图 3、图 4）</h3>

无需针对测试场景微调，直接在两套训练混合内见过构型的真机上对比 **RT-1-X（35M）**、**Octo（93M）**、**RT-2-X（55B 闭源）** 与 **OpenVLA（7B 开源）**：

- **BridgeData V2 WidowX-250 水槽环境（17 个任务，每个任务 10 次 = 170 次测试，按视觉/运动/物理/语义/语言接地五类泛化划分，图 3 + 附录 C 图 7）**：
  - 总体成功率：RT-1-X **18.5 ± 2.7%**、Octo **20.0 ± 2.6%**、RT-2-X **50.6 ± 3.5%**、**OpenVLA 70.6 ± 3.2%**（`120/170` vs RT-2-X `86/170`，高 20.0 个百分点）。
  - 分项成功率（RT-1-X / Octo / RT-2-X / OpenVLA）：
    - **视觉泛化**（未见背景、杂物干扰、未见颜色）：`8.0% / 29.0% / 52.0% / 87.0%`；
    - **运动泛化**（未见位置/高度/朝向）：`25.0% / 7.5% / 55.0% / 60.0%`；
    - **物理泛化**（未见尺寸与形状）：`10.0% / 20.0% / 26.7% / 76.7%`；
    - **语义泛化**（未见目标物体与互联网概念）：`26.3% / 0.0% / 38.8% / 36.3%`（唯一略逊 RT-2-X 2.5 个百分点的子项）；
    - **语言接地**（双物体同摆桌面，按指令抓指定那一个）：`30.0% / 40.0% / 85.0% / 90.0%`。
  - 定性行为：OpenVLA 在干扰杂物中定向接近目标、旋转手腕对齐细电池朝向，并在「把蓝杯放到盘子上」初次碰倒杯子后自主退回、改换姿态重抓恢复；而 Octo 常在杂物间乱挥，RT-2-X 偶发忽略语言指令或抓取姿态粗糙。作者将 OpenVLA 胜过 55B RT-2-X 归因于三点：训练数据量更大（970k vs 350k 轨迹）、Bridge 数据经过无动作帧清洗、以及 DINOv2 提供的空间定位特征。
- **Google 移动操作臂（12 个任务，每个任务 5 次 = 60 次测试，5 个分布内 + 7 个未见物体/干扰的分布外任务，图 4 + 图 9）**：
  - 总体成功率：RT-1-X **33.3 ± 6.1%**、Octo **26.7 ± 5.8%**、RT-2-X **78.3 ± 5.4%**（`47/60`）、**OpenVLA 85.0 ± 4.6%**（`51/60`）。
  - 分布内（ID，25 次）：`32.0% / 44.0% / 72.0% / 88.0%`；分布外（OOD，35 次）：`34.3% / 14.3% / 82.9% / 82.9%`。
  - **互联网图文协同微调（Co-fine-tuning）留给 RT-2-X 的优势**：在 Google OOD 子项「把可乐罐移到 Taylor Swift 照片旁」（训练机器人数据里从未出现名人照片）中，同时在互联网图文与机器人数据上协同微调的 RT-2-X 成功识别名人照片，而仅在机器人动作数据上微调（未做图文协同保留）的 OpenVLA 走向了错误照片。
- **摘要「比 RT-2-X 高 16.5%」的精确来历**：把两台真机共 29 个任务、**230 次测试**合在一起按总回合算，RT-2-X 成功 $86 + 47 = 133$ 次（$133/230 = 57.8\%$），OpenVLA 成功 $120 + 51 = 171$ 次（$171/230 = 74.3\%$），绝对差 $74.3\% - 57.8\% = +16.5\%$。

<h3 id="sec-exp-ablate">2. 跨机器人数据与视觉微调消融（附录 D 表 9、表 10）</h3>

在原始 BridgeData V2 的 8 个任务（共 80 次真机测试，图 8）上剥离各要素贡献（表 9）：

| 模型变体 | 视觉骨干 | 训练数据 | 8 任务平均成功率（80 次） |
|----------|----------|----------|---------------------------|
| **OpenVLA（完整版）** | DINOv2 + SigLIP（微调） | OXE 970k 跨机器人混合 | **76.3 ± 4.8%** |
| **OpenVLA（仅 Bridge）** | DINOv2 + SigLIP（微调） | 仅 BridgeData V2 | **45.6 ± 5.6%** |
| **OpenVLA（仅 Bridge · 单 SigLIP）** | 仅 SigLIP（微调） | 仅 BridgeData V2 | **40.6 ± 5.5%** |

加上 DINOv2 提升 **+5.0 个百分点**（40.6% → 45.6%），而引入跨机器人 OXE 混合预训练进一步带来 **+30.7 个百分点**（45.6% → 76.3%）跃升。表 10 则在 6 组任务上单独对比微调视觉编码器（**80.0%**）与冻结视觉编码器（**46.7%**）。

<h3 id="sec-exp-finetune">3. 迁移到新机器人与仿真基准：Franka 与 LIBERO（§5.2，图 5、表 7、表 12）</h3>

测试把预训练好的 OpenVLA 迁到未见过的控制设置（Franka Panda 机械臂 5 Hz 桌面控制与 Franka-DROID 15 Hz 环境，小数据集各 **10–150 条人类示范**）：

- **对比基线**：从零训练的 **Diffusion Policy**（UNet 动作块策略，输入 2 帧历史、预测 16 步执行 8 步）、输入输出与 OpenVLA 对齐的单步版 **Diffusion Policy (matched)**、预训练通才模型 **Octo** 微调、不加载机器人预训练直接拿底座 Prismatic VLM 微调的 **OpenVLA (scratch)**，以及完整 **OpenVLA**（LoRA 微调）。
- **7 个任务总平均（图 5 + 附录表 7）**：Diffusion Policy **43.4%**、DP (matched) **37.1%**、Octo **41.5%**、OpenVLA (scratch) **35.2%**、**OpenVLA 63.8%**——摘要写的「超过 Diffusion Policy 20.4%」正是 $63.8\% - 43.4\% = +20.4\%$（按 6 个桌面任务共 99 次 + DROID 擦桌子 12 次 × 每档半功计分共 60 分 = 总计 159 分加权平均）。
- **核心边界对比（窄单步任务 vs 多物体语言条件任务）**：
  - 在「把玉米倒进锅里（Pour Corn into Pot）」这类单一指令、需要高频灵巧轨迹协调的窄任务上，输出连续动作块的 **Diffusion Policy 拿到 77.8%**，单步离散输出的 OpenVLA 为 **44.4%**（Octo 0%、OpenVLA-scratch 22.2%）；
  - 一旦桌面同时摆出多个物体、需要根据语言指令区分目标（如「把黄玉米移到盘子上」「翻锅里的物体」「DROID 擦桌子」），纯视觉单任务 Diffusion Policy 因缺乏语言与语义接地掉到 **25.0%–35.0%**，而 **OpenVLA 达到 58.3%–83.3%**；同时对比 OpenVLA (scratch) 的 35.2%，证明 **OXE 机器人预训练**贡献了 +28.6 个百分点的提升（而非仅仅靠底座 VLM）。
- **LIBERO 仿真基准（附录 F 表 12，4 个套件各 10 任务，每套件 3 种子 × 500 次 = 1500 次评估）**：

| 套件 | Diffusion Policy（从零） | Octo（微调） | OpenVLA（LoRA $r=32$） |
|------|--------------------------|--------------|------------------------|
| LIBERO-Spatial | 78.3 ± 1.1% | 78.9 ± 1.0% | **84.7 ± 0.9%** |
| LIBERO-Object | **92.5 ± 0.7%** | 85.7 ± 0.9% | 88.4 ± 0.8% |
| LIBERO-Goal | 68.3 ± 1.2% | **84.6 ± 0.9%** | 79.2 ± 1.0% |
| LIBERO-Long | 50.5 ± 1.3% | 51.1 ± 1.3% | **53.7 ± 1.3%** |
| **四套件平均** | 72.4 ± 0.7% | 75.1 ± 0.6% | **76.5 ± 0.6%** |

<h3 id="sec-exp-peft">4. 参数高效微调（LoRA）与 4-bit 量化推理（§5.3，表 1、表 2、图 6、表 11）</h3>

注：论文 §5.3 脚注 3 说明，表 1 与表 2 的实验跑在早期预览版 `openvla-v01-7b`（单 SigLIP 骨干 + 2 层投影器 + Vicuna-v1.5-7B，全参合计 **7,188.1M**）上：

1. **6 种微调方案对比（表 1，Franka 3 个代表任务共 33 次测试，批大小 16）**：
   - **Full FT（全参数微调）**：成功率 **69.7 ± 7.2%**，可训练参数 7,188.1M（100%），显存 **163.3 GB\***（2 张 A100 FSDP 总和）；
   - **Last layer only（只训最后一层 + 投影器）**：**30.3 ± 6.1%**，465.1M，51.4 GB；
   - **Frozen vision（冻结视觉编码器，训其余全部）**：**47.0 ± 6.9%**，6,760.4M，156.2 GB\*（再次印证冻结视觉会掉 22.7 个百分点）；
   - **Sandwich decoding（只训视觉骨干 + 投影器 + 最后一层）**：**62.1 ± 7.9%**，914.2M，64.0 GB；
   - **LoRA ($r = 32$，加在视觉与语言所有线性层)**：**68.2 ± 7.5%**，可训练参数 **97.6M（占总参数 1.4%）**，单卡显存 **59.7 GB**，单张 A100 跑 **10–15 小时**即可追平全量微调（8 张 A100 则缩短至 1.5 小时）；升到 $r = 64$（195.2M，60.5 GB）成功率同为 **68.2 ± 7.8%**，无需更大秩。
2. **低比特量化推理与「8-bit 掉点」谜题（表 2、图 6、附录 E 表 11）**：
   - 在 WidowX 水槽 8 个原始 Bridge 任务（80 次测试，RTX A5000 显卡）默认**非阻塞异步控制（Non-blocking，目标 5 Hz）**下（表 2）：
     - `bfloat16`（16.8 GB 显存，3.44 Hz）：成功率 **71.3 ± 4.8%**；
     - `int8`（10.2 GB 显存，**1.20 Hz**）：成功率跌至 **58.1 ± 5.1%**；
     - `int4`（**7.0 GB** 显存，**2.92 Hz**）：成功率 **71.9 ± 4.7%**，与 `bfloat16` 持平且显存不到一半。
   - **为什么 8-bit 反而比 4-bit 差？** 图 6 测了 6 张显卡的吞吐率（RTX 4090 上 `bf16` 6.24 Hz、`int4` 6.01 Hz、`int8` 2.13 Hz）：`bitsandbytes` 的 8-bit 算子因 CPU–GPU 量化传输开销大，把 A5000 上的推理速度拖慢到 **1.2 Hz**。在非阻塞模式下，控制器不等新动作算完就拉长执行上一步动作，导致系统动力学相对 5 Hz 训练数据严重偏移。附录 E 表 11 改用**阻塞同步控制（Blocking：每走完一步停住等模型返回）**重新跑同一批 80 次测试：`bf16` **70.0%**、`int8` **74.4%**、`int4` **68.8%**——三者完全同一水准，证实 `int8` 在表 2 掉分并非数值精度损失，而是慢推理叠加非阻塞控制造成的动力学失配。

</details>

### 🎛️ 交互演示 3：四套基准与消融数据台 {#openvla-results-demo}

<div class="paper-demo" data-demo="openvla-results"></div>

---

## ⚠️ 局限与讨论

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文自述的四条局限（§6）+ 原文、代码与权重逐项核对出的六处出入</summary>

<h3 id="sec-lim-paper">1. 论文第 6 节明确列出的四条局限</h3>

1. **单帧输入、单步自回归输出，推理频率低且无高频动作块**：OpenVLA 目前只接收单张第三视角 RGB 图像，不读手腕相机、本体关节角（proprioception）或帧历史；每次控制必须串行自回归解码 7 个 token，在 RTX 4090 上约 6 Hz、A5000 上约 3.4 Hz，无法支撑 ALOHA 双臂穿扎带这类 50 Hz 高频接触操作。作者在 §6 建议后续结合动作分块（Action Chunking）或推测解码（Speculative Decoding）提速。
2. **高难度窄任务上的绝对成功率仍有缺口**：部分测试任务成功率仍低于 90%；在单任务窄分布灵巧轨迹（如 Franka 倒玉米）上落后于从零训练的连续动作块策略 Diffusion Policy。
3. **跨构型数据混合与 VLM 视觉推理机制尚缺理论解释**：OXE 混合权重和架构选择大多基于经验探索，尚未完整回答基础 VLM 特征与动作数据到底怎样协同。
4. **未在互联网图文与机器人动作数据上做协同微调（Co-fine-tuning）**：与闭源 RT-2-X 在微调阶段继续混入图文 VQA 数据不同，OpenVLA 预训练只在机器人轨迹上更新全部参数，导致互联网纯视觉语义保留受损（典型失败即 Google 机器人上的「移到 Taylor Swift 照片旁」）。

<h3 id="sec-lim-audit">2. 论文正文、图表与官方开源代码 / 权重的六处核对差异</h3>

| 编号 | 核对项 | 论文正文 / 图表说法 | 官方代码 `c8f03f4` / `openvla-7b` 实际实现 | 影响与阅读提示 |
|------|--------|---------------------|-------------------------------------------|----------------|
| 1 | **模型总参数与投影器层数** | 正文统称 7B、§3.1 写「2-layer MLP projector」 | `openvla-7b` 用 3 层 `FusedMLPProjector`（71.4M），连同双视觉骨干（730.9M）与 Llama 2（6.74B）合计 **7,541,237,184（7.54B）** | 2 层投影器对应早期单编码器版；开源主模型 README 写明「7.5 billion parameters」 |
| 2 | **256 档离散化的区间数与词表下标** | §3.2 写切成「256 个等宽区间（256 uniform bins）」，映射到词表最后 256 个词 | `np.linspace(-1, 1, 256)` 产生 256 个端点 = **255 个区间**；解码 `clip(disc - 1, 0, 254)` 把第 255、256 档合并到 $+0.99608$；词表补齐到 `32,064` 后动作词仍在 `31744..31999` | 步长为 $2/255$ 而非 $2/256$；自己写分词器对齐官方权重时必须照抄 `linspace(-1, 1, 256)` 与 `32000 - disc` |
| 3 | **表 1、表 2 的评测模型版本** | 主线讲双编码器 + Llama 2 7B | §5.3 脚注 3 注明表 1 与表 2 跑在早期 `openvla-v01-7b`（单 SigLIP + Vicuna-v1.5-7B，表 1 全参 7,188.1M）上；正文 §3.5 写 bf16 占 15 GB，表 2 实测 16.8 GB | 理解为何表 1 全参是 7,188.1M 而不是主模型的 7,541.2M |
| 4 | **损失计算包含 `<EOS>`** | §3.2 说交叉熵只算在预测的动作 token 上 | `datasets.py` 写 `labels[:-(action_dim + 1)] = -100`，7 个动作词加末尾 1 个 `<EOS>` 共 **8 个位置**计入损失 | 推理时靠固定解码 `get_action_dim()` 个 token 停下，但训练标签留了 `<EOS>` |
| 5 | **图 5 柱顶数字笔误** | 图 5 `Put Carrot on Plate` 的 `DP (matched)` 柱顶印 `53.5` | 附录表 7 给该任务测试总数为 15 次，$8/15 = 53.3\%$（没有整数分子能除出 53.5%） | 属于作图手填标签笔误，加权总平均不受影响 |
| 6 | **附录图 10 两张照片对调** | 图 10 左下角标 `Put Carrot on Plate (OOD)`、中下标 `Pour Corn into Pot (OOD)` | 左下照片里机械臂在往锅里倒玉米，中下照片里盘边摆着胡萝卜 | 两张 OOD 配图排版贴反，核对任务设置时以文字说明为准 |

</details>

---

## 🚶 具体实例

下面用官方开源 `openvla/openvla-7b` 的 `config.json`（含 `norm_stats["bridge_orig"]` 真实统计量）、`model.safetensors.index.json`、`action_tokenizer.py` 与论文表 1 / 图 3–6 的原始数字，完整手算四件事。本文三个交互演示与十七幕动画共用完全相同的数值。

### 实例 1：把一步 WidowX 7 维动作完整编成 Llama 2 词表 ID 再解码回来

取官方 `bridge_orig` 统计量（平移单位 $\text{m}$，旋转单位 $\text{rad}$，夹爪开度 $[0, 1]$）：

| 维度 $d$ | 物理含义 | 分位数 $[q _ {01}, q _ {99}]$ | 极值 $[\min, \max]$ | 极值跨度 / 分位数跨度 | `mask`（是否按分位数拉伸） |
|----------|----------|---------------------------|---------------------|-----------------------|---------------------------|
| 0 | $\Delta x$（前后平移） | $[-0.0287,\; +0.0283]\;\text{m}$ | $[-0.4008,\; +0.4169]\;\text{m}$ | **14.3 倍** | `True` |
| 1 | $\Delta y$（左右平移） | $[-0.0417,\; +0.0409]\;\text{m}$ | $[-0.1387,\; +0.2586]\;\text{m}$ | **4.8 倍** | `True` |
| 2 | $\Delta z$（上下平移） | $[-0.0261,\; +0.0402]\;\text{m}$ | $[-0.2255,\; +0.2122]\;\text{m}$ | **6.6 倍** | `True` |
| 3 | $\Delta\text{roll}$（横滚） | $[-0.0809,\; +0.0819]\;\text{rad}$ | $[-3.2011,\; +3.1222]\;\text{rad}$ | **38.8 倍** | `True` |
| 4 | $\Delta\text{pitch}$（俯仰） | $[-0.0929,\; +0.0779]\;\text{rad}$ | $[-1.8618,\; +1.8618]\;\text{rad}$ | **21.8 倍** | `True` |
| 5 | $\Delta\text{yaw}$（偏航） | $[-0.2072,\; +0.2038]\;\text{rad}$ | $[-6.2791,\; +6.2805]\;\text{rad}$ | **30.6 倍** | `True` |
| 6 | $\text{Gripper}$（夹爪） | $[0.0000,\; +1.0000]$ | $[0.0000,\; +1.0000]$ | 1.0 倍 | `False` |

设机械臂当前一步需要「向前上方靠近碗口、微调手腕并张开夹爪」，真实 7 维动作为：

$$a = [+0.010,\; -0.015,\; -0.020,\; +0.020,\; -0.030,\; +0.050,\; 1.0]$$

**第一步（按 $[q _ {01}, q _ {99}]$ 归一化到 $[-1, 1]$）**：以第 0 维 $\Delta x = +0.010\;\text{m}$ 为例，分位数跨度 $q _ {99} - q _ {01} = 0.0283 - (-0.0287) = 0.0570\;\text{m}$：

$$\tilde{a}_0 = \frac{2 \times (0.010 - (-0.0287))}{0.0570} - 1 = \frac{2 \times 0.0387}{0.0570} - 1 \approx +0.35789$$

同理算出全部 7 维归一化值（第 6 维 `mask = False`，保持原值 $1.0$）：

$$\tilde{a} \approx [+0.35789,\; -0.35351,\; -0.81599,\; +0.23956,\; -0.26347,\; +0.25158,\; +1.00000]$$

**第二步（255 个区间量化成 Llama 2 词表 ID）**：端点序列 $b_k = -1 + 2k/255$（$k = 0,\dots,255$），步长 $\Delta = 2/255 \approx 0.0078431$。对 $\tilde{a}_0 = +0.35789$，满足 $b _ {173} = +0.35686 \le 0.35789 < b _ {174} = +0.36471$，故 `np.digitize` 返回 $\text{disc}_0 = 174$，映射到词表编号 $32000 - 174 = 31826$。7 个维度的离散档位与 token ID 依次为：

- `disc` = $[174,\; 83,\; 24,\; 159,\; 94,\; 160,\; 256]$
- `token_id` = $[31826,\; 31917,\; 31976,\; 31841,\; 31906,\; 31840,\; 31744]$

**第三步（解码查区间中心并反归一化）**：对 $\text{token\_id}_0 = 31826$，先算 $\text{disc}_0 = 32000 - 31826 = 174$，下标 $\operatorname{clip}(174 - 1, 0, 254) = 173$，区间中心 $c _ {173} = -1 + (2\times 173 + 1)/255 = +92/255 \approx +0.36078$，反归一化得：

$$\hat{a}_0 = \frac{0.36078 + 1}{2}\times 0.0570 - 0.0287 \approx +0.01008\;\text{m}$$

单步量化误差为 **$0.08\;\text{mm}$**（每格物理步长 $57.0\;\text{mm} / 255 = 0.224\;\text{mm}$）；完整还原向量为：

$$\hat{a} \approx [+0.01008,\; -0.01499,\; -0.01999,\; +0.02030,\; -0.03025,\; +0.04990,\; +0.99608]$$

注意第 6 维夹爪输入 $1.0$ 时 $\text{disc}_6 = 256$（ID `31744`），解码截断到 `center[254] = +254/255 = +0.99608`。

**对照：假如改用极值 $[\min, \max]$ 归一化会怎样？**
- 在 $\Delta x$ 上，极值跨度 $0.4169 - (-0.4008) = 0.8177\;\text{m}$（宽 14.3 倍），每格物理宽度退化到 $3.21\;\text{mm}$，98% 的常规动作挤在中间 **18 个格子**里，上述 $+0.010\;\text{m}$ 解码变成 $+0.01129\;\text{m}$，单步误差放大到 **$1.29\;\text{mm}$（16 倍）**；
- 在 $\Delta\text{roll}$ 上更悬殊：极值跨度 $6.3233\;\text{rad}$ 是分位数跨度 $0.1628\;\text{rad}$ 的 **38.8 倍**，98% 的常规旋转全挤在中间 **7 个格子**里，每格 $0.0248\;\text{rad} \approx 1.42^\circ$，$+0.020\;\text{rad}$ 解码成 $+0.02984\;\text{rad}$，误差放大 **33 倍**。这就是为什么必须用第 1%–99% 分位数抗离群值。

### 实例 2：一次前向推理的卡片（Token）数与 7.54B 参数账本

给模型输入一张 $224 \times 224 \times 3$ 图像和指令 `"put eggplant into pot"`：

1. **视觉流形状**：
   - DINOv2 ViT-L/14（`patch_size = 14`）：$(224/14)\times(224/14) = 16 \times 16 = 256$ 个空间块，每块 $1024$ 维；
   - SigLIP ViT-SO400M/14：同样 $16 \times 16 = 256$ 个空间块，每块 $1152$ 维；
   - 逐块拼接得 $256 \times (1024 + 1152) = 256 \times 2176$；
   - 经 3 层 `FusedMLPProjector`（$2176 \to 8704 \to 4096 \to 4096$）：参数量 $(2176\times 8704 + 8704) + (8704\times 4096 + 4096) + (4096\times 4096 + 4096) = 18{,}948{,}608 + 35{,}655{,}680 + 16{,}781{,}312 = 71{,}385{,}600$（**71.4M**），输出 **256 张 4096 维视觉卡片**。
2. **语言与自回归解码步数**：
   - 提示词 `"In: What action should the robot take to put eggplant into pot?\nOut: "` 连同 `<BOS>` 约切成 $N \approx 19$ 个文字 token；
   - 首步前缀长度为 $1 + 256 + (N - 1) = 275$ 张卡片，通过 32 层 Llama 2 缓存 KV 后吐出第 1 个动作词（$\Delta x$）；接着把刚吐出的动作词喂回，依托 KV cache 再连续走 6 步单 token 前向，依次吐出 $\Delta y, \Delta z, \Delta\text{roll}, \Delta\text{pitch}, \Delta\text{yaw}, \text{Gripper}$，共 **7 次语言主干前向**完成一步控制。

### 实例 3：单卡 LoRA（$r = 32$）比全参数省掉多少可训练参数与显存？

以 Llama 2 单层里的注意力输出矩阵 $W_o \in \mathbb{R}^{4096 \times 4096}$ 和上投影矩阵 $W _ {\text{up}} \in \mathbb{R}^{4096 \times 11008}$ 为例：
- 全参数更新时，$W_o$ 要存 $4096^2 = 16{,}777{,}216$ 个参数及其 AdamW 一阶、二阶动量；加上 LoRA $r = 32$ 后，原矩阵冻结，旁路 $B \in \mathbb{R}^{4096 \times 32}$、$A \in \mathbb{R}^{32 \times 4096}$ 合计 $2 \times 4096 \times 32 = 262{,}144$ 个可训练参数，占原矩阵的 **$1/64 = 1.56\%$**；
- 对 $W _ {\text{up}}$，原参数 $45{,}088{,}768$，LoRA 参数 $(4096 + 11008)\times 32 = 483{,}328$，占 **$1.07\%$**。
- 汇总整个模型所有线性层（表 1）：可训练参数从 **7,188.1M** 降到 **97.6M（1.36% ≈ 1.4%）**，批大小 16 的训练显存从两张卡合计 **163.3 GB** 降到单卡 **59.7 GB**（若按 README 批大小 8 在单张 24 GB 消费卡上微调或配合梯度累积则进一步降低），Franka 3 任务成功率保持 **68.2% vs 69.7%**。

### 实例 4：非阻塞 5 Hz 下 8-bit 推理为何从 74.4% 掉到 58.1%？

在 WidowX 5 Hz 控制回路（名义控制周期 $T_0 = 0.20\;\text{s}$）中：
- **阻塞模式（Blocking，表 11）**：机械臂走完当前一步增量 $\Delta x = +10\;\text{mm}$ 后立刻停稳，等待显卡算完下一步。不管显卡是 `bf16`（耗时 $1/3.44 \approx 0.29\;\text{s}$）、`int4`（$1/2.92 \approx 0.34\;\text{s}$）还是 `int8`（$1/1.20 \approx 0.83\;\text{s}$），每一步物理位移都严格贴合训练示范，因此三者成功率分别为 **70.0% / 68.8% / 74.4%**，低比特量化本身不伤精度。
- **非阻塞模式（Non-blocking，表 2）**：底层控制器在新动作算完前不停车或持续沿用旧指令节拍，推理周期拉长到 $0.83\;\text{s}$（比名义 $0.20\;\text{s}$ 慢 **4.2 倍**）时，视觉反馈滞后超过 $0.8\;\text{s}$，夹爪靠近碗沿时来不及闭环修正，导致 `int8` 成功率跌到 **58.1%**，而维持 $2.92\;\text{Hz}$（周期 $0.34\;\text{s}$）的 `int4` 仍拿 **71.9%**。

---

## 📎 附录：超参数、算力与自包含基线说明

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：预训练与微调超参数表 + 文中对比基线一手说明</summary>

<h3 id="sec-app-config">1. 预训练与新机器人 LoRA 微调关键配置（§3.4、§5.2、附录 A 与官方代码）</h3>

| 项目 | OXE 大规模预训练 | 新真机 / LIBERO 微调 |
|------|------------------|----------------------|
| **初始化底座** | Prismatic-7B（DINOv2 ViT-L/14 + SigLIP ViT-SO400M/14 + Llama 2 7B） | 预训练好的 `openvla-7b` 检查点 |
| **输入图像** | 单张第三视角 $224\times 224$ RGB（推理时与训练一致中心裁剪/缩放） | 单张 $224\times 224$ RGB，开随机裁剪与颜色抖动增强 |
| **动作表示** | 7 维单步末端增量 + 夹爪，按各数据集 $[q _ {01}, q _ {99}]$ 量化为词表 `31744..31999` | 按目标数据集重新统计 $[q _ {01}, q _ {99}]$ 归一化并量化 |
| **优化器与学习率** | AdamW，固定学习率 $2\times 10^{-5}$，无 warmup，权重衰减 $0$ | LoRA（$r = 32$，`all-linear`），学习率 $5\times 10^{-4}$（代码默认） |
| **全局批大小与步数** | 批大小 $2048$，共训 **27 epochs**（动作词准确率 $>95\%$） | 数据集 10–150 条示范，批大小 16（表 1），训至动作词准确率 $\approx 95\%$ |
| **硬件与时长** | **64 张 A100** 连续训练 **14 天**（共 **21,500 A100-hours**，`bfloat16` + FSDP） | **单张 A100 跑 10–15 小时**（或 8 张 A100 跑 1.5 小时） |

<h3 id="sec-app-baselines">2. 文中涉及的前作与对比基线速览</h3>

- **RT-1-X**（O'Neill et al., 2023，*Open X-Embodiment*）：35M 参数 EfficientNet + FiLM + TokenLearner + Transformer 离散动作模型，在 OXE 数据集上从头训练。
- **RT-2-X**（O'Neill et al., 2023 / Brohan et al., 2023）：55B 参数闭源 VLA（基于 PaLI-X VLM），将机器人动作编成文本数字串 token，在互联网图文数据与 350k 机器人轨迹上协同微调。
- **Octo**（Octo Model Team, 2024，RSS 2024）：93M 参数开源跨构型通才机器人策略，用从头训练的 Transformer 主干配合小型扩散动作头输出连续动作块，在约 80 万条 OXE 轨迹上预训练。
- **Prismatic VLM**（Karamcheti et al., 2024，ICML 2024）：系统研究开源视觉-语言模型设计空间的工作，提出 DINOv2 + SigLIP 双编码器通道拼接方案，是 OpenVLA 的直接视觉-语言底座。

</details>

---

## 📎 参考来源

1. **论文原文（v3）**：Moo Jin Kim, Karl Pertsch, Siddharth Karamcheti et al., *OpenVLA: An Open-Source Vision-Language-Action Model*, CoRL 2024, [arXiv:2406.09246v3](https://arxiv.org/abs/2406.09246)（核对全部 LaTeX 源码 `sections/00_abstract.tex`–`06_appendix.tex`）。
2. **官方开源代码**：[openvla/openvla](https://github.com/openvla/openvla)（commit `c8f03f4`，重点核对 `prismatic/vla/action_tokenizer.py`、`prismatic/vla/datasets/datasets.py`、`prismatic/models/backbones/llm/prompting/`、`prismatic/extern/hf/modeling_prismatic.py` 与 `vla-scripts/finetune.py`）。
3. **官方开源权重与统计量**：[openvla/openvla-7b](https://huggingface.co/openvla/openvla-7b)（`config.json` 中 `norm_stats` 27 个子集真实分位数与极值、`model.safetensors.index.json` 逐张量字节大小统计）。
4. **官方项目页与真机回放视频**：[openvla.github.io](https://openvla.github.io/)（WidowX、Google Robot 与 Franka 共 17 段真机评估视频）。
