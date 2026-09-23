---
layout: paper
paper_order: 1
title: "GR00T N1: An Open Foundation Model for Generalist Humanoid Robots"
category: "高影响力工作"
subcategory: "Sim-to-Real & Foundation Model"
zhname: "GR00T N1：面向通用人形机器人的开放基础模型"
demos: ["gr00t"]
---

# GR00T N1: An Open Foundation Model for Generalist Humanoid Robots
**以 Eagle-2 理解图像和语言，以 DiT 生成分块动作，并混合真机、合成轨迹与人类视频训练的跨具身 VLA 模型。**

> 📅 阅读日期: 2026-04-21
>
> 🏷️ 板块: 02 High Impact · 基础模型
>
> 📖 论文版本：arXiv:2503.14734v2。下文的频率与延迟均以原论文的测量条件为准。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2503.14734](https://arxiv.org/abs/2503.14734) |
| **PDF** | [Download](https://arxiv.org/pdf/2503.14734.pdf) |
| **作者** | NVIDIA Project GR00T Team (Linxi Fan, Yuke Zhu 等) |
| **机构** | NVIDIA |
| **发布时间** | 2025-03 (arXiv) |
| **项目主页** | [NVIDIA Research](https://research.nvidia.com/labs/lpr/publication/gr00tn1_2025/) |
| **代码 / 模型** | [NVIDIA/Isaac-GR00T](https://github.com/NVIDIA/Isaac-GR00T) · [GR00T-N1-2B](https://huggingface.co/nvidia/GR00T-N1-2B) |

---

## 🎯 一句话总结

> GR00T N1 将 Eagle-2 视觉语言骨干与 flow-matching DiT 动作头联合训练；用机型专属编码/解码器对接不同状态与动作维度，并从图像、语言和本体状态预测动作块。论文主要验证跨具身**桌面操作**，真机实验使用 Fourier GR-1。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| VLA | Vision-Language-Action | 视觉 - 语言 - 动作模型，端到端学习从图像到行为的映射 |
| DiT | Diffusion Transformer | 扩散 Transformer，GR00T 用于生成高频动作的核心模块 |
| IDM | Inverse Dynamics Model | 逆动力学模型，用视频前后帧推断伪动作标签 |
| Flow matching | 流匹配 | 从噪声动作到目标动作学习连续的更新方向 |

---

## 🎬 六幕动画：GR00T N1 从数据到动作 {#gr00t-explainer-anim}

<div class="paper-demo" data-demo="gr00t-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 📖 动画之后的正文默认全部折叠；流程图保持展开。点开各条可以读技术细节，目录跳转会自动展开对应折叠块。

---

## ❓ GR00T N1 要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：跨机型数据孤岛、没有动作标签的人类视频，以及通用策略的样本效率</summary>

- **数据孤岛**：机器人机型、传感器和动作空间各异，单机真机示教昂贵且数量有限。
- **无动作视频**：人类视频提供大量视觉与行为经验，但通常没有机器人动作标签；论文用 latent-action codebook 与 IDM 推断伪动作。
- **跨具身学习**：希望共享视觉语言与动作生成能力，同时以机型专属状态/动作编解码器处理维度差异。

</details>

---

## 🧭 双系统 VLA 管线（mermaid）

<div class="mermaid">
flowchart LR
  subgraph data["数据金字塔"]
    D1["人类视频 / 遥操轨迹"]
    D2["仿真合成数据"]
  end
  subgraph s2["System 2 · Eagle-2 VLM"]
    E2["图像 + 语言 → 视觉语言 token"]
  end
  subgraph s1["System 1 · flow-matching DiT"]
    E1["状态 + 噪声动作块<br/>self-attention / cross-attention"]
    A["机型专属解码 → 16 步动作块"]
  end
  D1 --> E2
  D2 --> E2
  E2 -->|"视觉语言条件"| E1
  E1 --> A
</div>

---

## 🔧 方法详解（架构设计）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Eagle-2 与 DiT 如何用注意力连接；10/120 Hz 分别表示什么</summary>

<h3 id="双系统和注意力">双系统和注意力</h3>

System 2 使用 **Eagle-2 VLM** 将 224×224 图像和任务语言编码为视觉语言 token（每张图像经处理得 64 个图像 token）。System 1 是 **DiT**：状态和加噪的动作 token 经 self-attention 处理，cross-attention 读取 VLM token，最终由该机型的动作解码器输出动作。两模块联合训练。

论文在 **L40 GPU** 上描述 System 2 约 **10 Hz**，动作输出 **120 Hz**。后者是模型动作频率，不能直接解释成电机底层 PD 环的频率，也不能移植成 Jetson 上的延迟保证。

</details>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：机型专属 MLP、共享 DiT 与动作块的四步去噪</summary>

<h3 id="跨具身与动作块">跨具身与动作块</h3>

每种机型用自己的状态/动作 MLP 投影到共享嵌入维度，并用对应动作解码器恢复该机型的输出维度。模型一次预测 **16 个时间步**的动作块 $A_t=[a_t,\ldots,a_{t+15}]$；在 flow matching 推理中从噪声开始，论文报告 **4 步** Euler 更新即可生成动作块。

在 L40、bf16 条件下，论文报告生成**整块** 16 步动作耗时 **63.9 ms**。$16/120\approx0.133$ 秒仅是按动作输出频率换算的块跨度；论文没有由此规定每次必须全部执行 16 步再重算。

</details>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：人类视频、合成数据和真机轨迹怎样混合训练</summary>

<h3 id="数据金字塔">数据金字塔</h3>

金字塔底部是大量网络视觉语言数据和人类第一视角视频，中间层是仿真轨迹与神经生成轨迹，顶部是真机遥操作轨迹。论文为没有动作标签的视频学习 latent action codebook，并用逆动力学模型（IDM）估计伪动作，随后将异构数据混合用于预训练与任务后训练。数据来源和机型支持不意味着同一权重在任意新机器人上无需接口适配。

</details>

---

## 🚶 具体实例

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文实际验证的 GR-1 双手桌面任务和边界</summary>

论文在仿真中评测多机型操作，在 **Fourier GR-1** 真机上评估语言条件的双手桌面操作，包括抓取放置、带抽屉或柜门的操作、工业零件和协作任务。原笔记中的“去厨房取苹果并递给我”跨导航与操作的完整示例，并非这篇论文展示的真机基准。论文明确将**长程移动操作**列为未来工作。

</details>

---

## 🤖 工程价值

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：开放模型、跨具身接口与部署时应核对的指标</summary>

- **可复用模型**：公开 GR00T-N1-2B 检查点、数据与仿真基准，便于复现与迁移。
- **接口设计**：机型专属编解码器连接共享主干，新增机型仍需检查状态、动作语义及控制接口。
- **部署量测**：分开记录视觉语言更新、整块动作推理、动作下发和底层伺服环；论文的 L40 测量不能直接代替板载 benchmark。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：双系统、DiT 动作块和模型与底层控制的分工</summary>

1. **System 1 / System 2 分别是什么？** Eagle-2 处理图像与语言，DiT 以其 token 和机器人状态为条件，从噪声生成动作块；两者联合训练。
2. **动作块如何执行？** GR00T N1 输出 16 步动作，4 步去噪是**生成动作块的迭代次数**，不是执行四个关节动作。执行与重新规划策略要看部署控制器，不能从 $H=16$ 单独推断。
3. **120 Hz 是底层 PD 吗？** 不是；论文写的是生成闭环 motor actions 的频率。底层伺服频率需要另查具体机器人控制栈。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文、官方研究页与代码/模型</summary>

- [原论文 arXiv:2503.14734v2](https://arxiv.org/abs/2503.14734)
- [NVIDIA Research 论文页](https://research.nvidia.com/labs/lpr/publication/gr00tn1_2025/)
- [NVIDIA Isaac-GR00T 代码](https://github.com/NVIDIA/Isaac-GR00T)
- [GR00T-N1-2B 模型](https://huggingface.co/nvidia/GR00T-N1-2B)

</details>
