---
layout: paper
paper_order: 10
title: "SMP: Reusable Score-Matching Motion Priors for Physics-Based Character Control"
category: "Foundational RL"
zhname: "SMP：面向物理角色控制的可复用分数匹配运动先验"
---

# SMP: Reusable Score-Matching Motion Priors for Physics-Based Character Control
**用预训练动作扩散模型 + 分数蒸馏采样（SDS）做冻结的运动先验，代替 AMP 每训一个控制器就要重训的对抗判别器**

> 📅 阅读日期: 2026-10-03
>
> 🏷️ 板块: 01_Foundational_RL
>
> 🧭 状态: 占位笔记，正文待补充。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2512.03028](https://arxiv.org/abs/2512.03028) |
| **PDF** | [arxiv.org/pdf/2512.03028](https://arxiv.org/pdf/2512.03028) |
| **发布时间** | 2025-12-02 (arXiv) |
| **官方代码** | [xbpeng/MimicKit](https://github.com/xbpeng/MimicKit)（实现 `mimickit/learning/smp_agent.py`，说明文档 [`docs/README_SMP.md`](https://github.com/xbpeng/MimicKit/blob/main/docs/README_SMP.md)，任务策略配置 `data/agents/smp_task_humanoid_agent.yaml`） |
| **作者** | Yuxuan Mu, Ziyu Zhang, Yi Shi, Dun Yang, Minami Matsumoto, Kotaro Imamura, Guy Tevet, Chuan Guo, Michael Taylor, Chang Shu, Pengcheng Xi, Xue Bin Peng |

---

## 🗺️ 在学习路线图中的位置

接在 AMP（对抗运动先验）与 Diffusion Policy（扩散模型）之后：它保留 AMP「运动先验当奖励」的思路，但把需要随任务重训的判别器换成预训练扩散模型给出的分数（score），先验冻结后可跨任务复用，训练任务策略时不再需要参考动作数据。

---

## 📝 正文

待补充。
