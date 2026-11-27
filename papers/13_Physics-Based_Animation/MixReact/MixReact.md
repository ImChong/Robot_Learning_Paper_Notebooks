---
layout: paper
title: "MixReact: Physics-Based Reactive Humanoid Control from Multimodal Cues via a Discrete-Continuous Mixture of Transformers"
zhname: "MixReact：基于离散连续混合 Transformer 的多模态物理人形反应控制"
arxiv: "2611.26218"
original_check: partial
original_check_date: 2026-11-27
original_check_scope: "依据本日此前获取的官方 HTML v2 与项目资料整理；本次重新访问 HTML 失败，PDF 未核验"
---

# MixReact: Physics-Based Reactive Humanoid Control from Multimodal Cues via a Discrete-Continuous Mixture of Transformers
**以离散反应规划、连续运动预测和物理闭环跟踪连接多模态条件与人形角色控制。**

> 📅 总结日期：2026-11-27

## 📋 基本信息

- 团队：上海科技大学；完整作者名单本次未能重新核实。
- 发表：2026-11-19，arXiv 预印本；此前记录 v2 更新于 2026-11-24。
- 模块：13 Physics-Based Animation
- 论文：[arXiv](https://arxiv.org/abs/2611.26218) · [HTML v2](https://arxiv.org/html/2611.26218v2)
- 核验状态：此前获取 HTML v2 与项目资料，本次重访失败；PDF 未核验；项目页地址本次未能复核；此前资料述源码将来发布，当前公开实现未确认。

## ❓ 研究问题

如何让物理模拟中的人形角色根据文本、音频、视频等条件产生及时、连贯的反应，而不只生成脱离动力学约束的运动序列？

## 🔧 核心方法

此前核对的资料将方法分为离散 Transformer 反应规划、连续扩散运动状态预测，以及 HAT 物理闭环控制。三个层次分别处理反应意图、连续运动参考和物理执行。以下为概念级流程，不代表已核对实现中的张量接口或调用顺序。

<div class="mermaid">
flowchart TD
 A["文本 / 音频 / 视频条件"] --> B["离散 Transformer 反应规划"]
 B --> C["连续扩散运动状态预测"]
 C --> D["HAT 物理闭环控制"]
 D --> E["物理人形角色"]
 E --> D
</div>

## 📊 实验与贡献

此前资料显示该方法面向多模态反应控制，将运动生成与物理执行结合。本次未能重新核对实验表格、基线、指标及消融，因此不提供具体性能数字或比较结论。

## ⚠️ 局限与阅读骨架

- 问题：多模态条件下的物理反应控制。
- 方法：理解离散规划与连续预测的分工，再检查 HAT 的反馈机制。
- 实验：后续核对各输入模态的评测协议、物理稳定性与反应时延。
- 局限：当前尚未验证完整原文、实验数字及源码，不能据此判断跨平台部署能力。
- 源码时序图：未确认可审阅的公开实现，不绘制。
