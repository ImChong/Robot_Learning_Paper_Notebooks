---
layout: paper
title: "Cosmos World Foundation Model Platform for Physical AI"
zhname: "Cosmos：面向物理 AI 的世界基础模型平台"
category: "高影响力精选 High Impact Selection"
subcategory: "Sim-to-Real & Foundation Model"
arxiv: "2501.03575"
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

## 🔧 核心管线

1. **整理视频数据**：对视频分段、过滤、标注、去重，挑选运动信息和画质适合训练的片段。
2. **视频分词器**：将连续视频压缩到适合模型学习的潜在表示。
3. **预训练世界基础模型**：探索扩散式与自回归式 Transformer 两条生成路线，以视频上下文和提示生成后续视频。
4. **后训练适配任务**：用目标场景的数据微调，论文展示相机控制、机器人操作和自动驾驶等方向。

例如，机器人看见桌上的杯子并计划伸手抓取时，定制世界模型可预测这项操作可能产生的视觉结果。**预测结果仍需与策略和真实机器人控制系统结合**；生成视频本身并不保证动作可执行或物理完全准确。

## 🧭 放在学习路线图的哪里？

本篇位于 **⑦ 世界模型**：先理解通用世界基础模型如何训练和适配，再对照 DreamDojo 等机器人世界模型，以及后续将预测和动作生成结合的 DreamZero。Cosmos 的重点是**平台与通用视频世界模型**；GR00T N1 所代表的 VLA 侧重从感知和指令生成机器人动作，两者职责不同。

## 📚 来源

- [原论文（NVIDIA，2025）](https://arxiv.org/abs/2501.03575)
- [论文 HTML：平台组成、模型架构及后训练示例](https://arxiv.org/html/2501.03575v3)
