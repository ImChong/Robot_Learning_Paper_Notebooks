---
layout: paper
title: "Cosmos World Foundation Model Platform for Physical AI"
zhname: "Cosmos：面向物理 AI 的世界基础模型平台"
category: "高影响力精选 High Impact Selection"
subcategory: "Sim-to-Real & Foundation Model"
arxiv: "2501.03575"
demos: ["cosmos"]
---

# Cosmos World Foundation Model Platform for Physical AI
**NVIDIA 提出的物理 AI 世界基础模型平台：用视频整理、分词和预训练建立通用视频世界模型，再针对机器人操作等场景进行后训练。**

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 论文 | [arXiv:2501.03575](https://arxiv.org/abs/2501.03575) · [HTML](https://arxiv.org/html/2501.03575v3) · [PDF](https://arxiv.org/pdf/2501.03575) |
| 作者 | NVIDIA（Niket Agarwal 等） |
| 首次发布 | 2025 年 1 月 7 日（arXiv） |
| 官方代码与模型 | [NVIDIA Cosmos-Predict1](https://github.com/nvidia-cosmos/cosmos-predict1) |

## 🎯 一句话理解

给模型看大量真实世界视频，让它学习“场景接下来可能怎样变化”；针对机器人任务再用专门数据微调，使模型能生成与任务条件相符的未来视频。论文介绍的是一套**构建世界模型的平台**，而不是直接输出关节控制指令的机器人策略。

## 🎬 五幕动画：Cosmos 如何构建世界模型 {#cosmos-explainer-anim}

<div class="paper-demo" data-demo="cosmos-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 📖 动画之后的正文默认全部折叠。点开对应部分可读细节；目录跳转会自动展开对应折叠块。

## 🔧 核心管线

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：从视频整理、分词到两类模型及后训练</summary>

1. **整理视频数据**：对约 2000 万小时原始视频做分段、过滤、标注、去重，抽出约 1 亿段、每段 2–60 秒的训练片段。这是视频库的规模，不是机器人采集时长。
2. **视频分词器**：因果 tokenizer 把视频压进潜空间，计算当前帧时不看未来帧。扩散路线用连续潜变量（维度 16），自回归路线用离散 token（FSQ，6 个量化层级）。
3. **预训练世界基础模型**：扩散（7B / 14B）与自回归（4B / 12B，加上文字后为 5B / 13B）是两条并列路线，都根据上下文生成后续视频，不是前后串联的两级模型。
4. **后训练适配任务**：用目标场景微调。论文给出的示例是相机位姿、机器人操作（指令或动作条件）和自动驾驶多视角，并标明这些是 Sample，不是可直接部署的成品。

例如，机器人看见桌上的杯子并计划伸手抓取时，定制世界模型可预测这项操作可能产生的视觉结果。**预测结果仍需与策略和真实机器人控制系统结合**；生成视频本身并不保证动作可执行或物理完全准确。论文的物理对齐评估里，各尺寸模型都会出现物体突然消失、形变和违反重力。平台另有 pre-Guard / post-Guard，用来拦截有害输入和输出。

</details>

## 🧭 放在学习路线图的哪里？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Cosmos、DreamDojo、DreamZero 与 GR00T 的关系</summary>

本篇位于 **⑦ 世界模型**：先理解通用世界基础模型如何训练和适配，再对照 DreamDojo 等机器人世界模型，以及后续将预测和动作生成结合的 DreamZero。DreamDojo 的视频骨干是后续的 Cosmos-Predict2.5，不是本篇的 Predict1。Cosmos 的重点是**平台与通用视频世界模型**；GR00T N1 所代表的 VLA 侧重从感知和指令生成机器人动作，两者职责不同。

</details>

## 📚 来源

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文与官方材料</summary>

- [原论文（NVIDIA，2025）](https://arxiv.org/abs/2501.03575)
- [论文 HTML：平台组成、模型架构及后训练示例](https://arxiv.org/html/2501.03575v3)

</details>
