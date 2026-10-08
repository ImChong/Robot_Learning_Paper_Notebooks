---
layout: paper
paper_order: 25
title: "Ψ₀: An Open Foundation Model Towards Universal Humanoid Loco-Manipulation"
zhname: "Ψ₀：迈向通用人形机器人 Loco-Manipulation 的开源基础模型"
category: "Loco-Manipulation and WBC"
---

# Ψ₀: An Open Foundation Model Towards Universal Humanoid Loco-Manipulation
**Ψ₀：迈向通用人形机器人 Loco-Manipulation 的开源基础模型**

> 📅 阅读日期: 2026-04-25
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 通用人形基础模型

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2603.12263](https://arxiv.org/abs/2603.12263) |
| **HTML** | [在线阅读](https://arxiv.org/html/2603.12263v1) |
| **PDF (arXiv)** | [下载](https://arxiv.org/pdf/2603.12263) |
| **项目主页** | [psi-lab.ai/Psi0](https://psi-lab.ai/Psi0/) |
| **实验室主页** | [Physical Superintelligence Lab](https://psi-lab.ai/) |
| **GitHub** | [physical-superintelligence-lab/Psi0](https://github.com/physical-superintelligence-lab/Psi0) |
| **发布时间** | 2026 年 3 月（arXiv） |
| **机构** | USC Physical Superintelligence (PSI) Lab 等 |
| **实验平台** | Unitree G1（29-DoF + Dex3-1 七指手）/ Unitree H1（27-DoF + INSPIRE 六指手） |
| **License** | Apache 2.0 |

**作者（部分）**：Songlin Wei, Hongyi Jing 等（详见 GitHub 仓库 BibTeX）

---

## 🎯 一句话总结

Ψ₀ 用 **三层 "System-2 / System-1 / System-0"** 架构和**两阶段训练范式**——先在 ~**829 小时**人类第一人称视频上自回归预训练 VLM 主干，再在 ~**30 小时**遥操作机器人数据上后训练流模型动作专家——以**1/10 的机器人数据**就把多任务长程 loco-manipulation 平均成功率拉高 **40%+**，并把整套数据/训练/部署流水线全部开源。

---

## 📖 英文缩写速查

| 缩写 | 全称 | 简单解释 | 生活类比 |
|------|------|----------|----------|
| **Ψ₀ / Psi-Zero** | 模型名（希腊字母 ψ 下标 0） | "物理超级智能 0 号" | 项目代号 |
| **VLA** | Vision-Language-Action | 视觉-语言-动作模型 | "看图读令、出手动作"的全栈机器人模型 |
| **VLM** | Vision-Language Model | 视觉-语言模型 | "看图说话"的多模态底座 |
| **MM-DiT** | Multi-Modal Diffusion Transformer | 多模态扩散 Transformer | Stable Diffusion 3 风格的动作生成器 |
| **Flow Matching** | 流匹配 | 比扩散更稳的生成式建模 | 把噪声沿"流"推到目标分布 |
| **EgoDex** | 第一人称巨型手部数据集 | 人在做事的第一视角视频 | 海量"我手在干活"录像 |
| **Humanoid Everyday** | 人形日常任务数据集 | 260 任务 / 7 大类 | 给机器人当 "ImageNet" 用 |
| **LeRobot** | HuggingFace 机器人数据格式 | 标准化轨迹/数据集格式 | 机器人界的 "parquet" |
| **RTC** | Real-Time Client | 实时客户端-服务端推理 | 模型放大服务器，机器人当客户端 |
| **SIMPLE** | 仿真器（论文配套） | 域随机化物理仿真 | "考前模拟卷" |
| **Dex3-1 / INSPIRE** | 灵巧手品牌型号 | 7-DoF / 6-DoF 末端 | G1 / H1 的"手" |

---

## ❓ 要解决什么问题

### 1. "通用人形机器人基础模型" 的核心矛盾
人形机器人想做 **通用 loco-manipulation**（既能走又能用手干活），却卡在数据上：

- 人类视频海量但**没有动作标签 / 关节扭矩**
- 机器人遥操数据**精确但极少**（百小时量级）
- 直接把人和机器人数据混着 co-train，会被**运动学差异**（手臂长度、关节限位、足式 vs 双足）拉偏

### 2. 既要 "看懂任务"，又要 "稳定执行"
Loco-manipulation 任务通常是**多子步骤、长程**的，例如：

> "把柜子打开 → 蹲下 → 拿起瓶子 → 走到桌边 → 倒水 → 关柜门"

这要求模型同时具备：
- **高层语义理解**（VLM 视角）
- **低层精确控制**（关节扭矩 / 步态平衡）

只用一个端到端大模型搞两件事，要么任务推理弱、要么底层动作抖。

### 3. 现有开源方案不够 "全栈"
GR00T N1、π₀ 等模型部分开源，但常缺数据流水线、训练代码、实时推理引擎之一。社区**很难端到端复现 + 落到自家机器人**。

> 💡 **类比**：之前的方法像"半成品菜谱"——主菜单看了，配料、火候、出餐节奏没给齐。Ψ₀ 是把"原料采购清单 + 备菜流程 + 主厨配方 + 上菜机器人"一起开源。

---

## 🔧 方法详解：三层 System 架构 + 两阶段训练

### 总览

```
┌──────────────────────────────────────────────────┐
│  System-2 : Vision-Language Backbone             │
│            (Qwen3-VL-2B-Instruct)                │
│            看图 + 读令 → 隐藏特征                │
└──────────────────────────────────────────────────┘
                       ↓ hidden features
┌──────────────────────────────────────────────────┐
│  System-1 : Multi-Modal DiT Action Expert        │
│            (~500M params, Flow / SD3 风格)       │
│            预测整身动作块 (action chunk)         │
└──────────────────────────────────────────────────┘
                       ↓ joint targets
┌──────────────────────────────────────────────────┐
│  System-0 : RL Tracking Controller               │
│            执行下肢命令 + 维持平衡               │
└──────────────────────────────────────────────────┘
                       ↓ torques
                    Unitree G1 / H1
```

### System-2：视觉-语言主干
- 基于 **Qwen3-VL-2B-Instruct**，把摄像头画面 + 自然语言指令编码成隐藏特征
- **预训练阶段**用大规模 **EgoDex 第一人称人类视频** 自回归训练，让 VLM 学到"任务-视觉-动作"对齐先验
- 关键点：人类视频里**没有机器人关节值**，论文用动作伪标签或潜动作 token 做自回归目标，使主干掌握"做事流程"

### System-1：动作专家（MM-DiT）
- **多模态扩散 Transformer**，~500M 参数，灵感来自 **Stable Diffusion 3**
- 用 **Flow-Matching** 范式：从噪声沿连续流回归到真实动作 chunk
- 输入：System-2 隐藏特征 + 机器人本体感（proprio）+ 历史动作
- 输出：未来若干步的**整身关节目标**（手臂 + 腰 + 下肢命令）
- **后训练阶段**才解锁，喂以遥操机器人数据，学习"这台机器到底怎么动"

### System-0：低层 RL 控制器
- 一个**预先用 RL 训好**的下肢/全身跟踪策略
- 接收 System-1 的关节目标，**实时跟随同时维持平衡**
- 让上层只关心"该做什么"，平衡这种高频细活留给 System-0

### 两阶段训练范式

| 阶段 | 数据 | 训练对象 | 目标 |
|------|------|----------|------|
| **Stage 1：预训练** | EgoDex（~829h 人类第一人称）+ Humanoid Everyday | System-2（VLM 主干） | 学习视觉-动作语义；理解任务结构 |
| **Stage 2：后训练** | ~30h 遥操作真机数据（G1 + H1） | System-1（动作专家） | 学习当前 embodiment 的动力学/控制 |

> 🔑 **核心主张**：人和机器人**不要 co-train**——他们的运动学差距太大，混在一起反而把两边都教坏。**先用人类视频学语义，再用机器人数据学执行**，比简单合并 10× 数据量都强。

### 推理 / 部署
仓库提供三种部署模式：
- **Open-loop**：在采集的数据集上做离线推理评测
- **RTC（Real-Time Client）**：模型放服务器，机器人当客户端，**实时控制**
- **SIMPLE**：物理仿真 + 域随机化的评测环境

---

## 🚶 具体实例：长程 "倒水" 任务怎么跑下来

假设给 G1 下指令："Walk to the table, pick up the bottle, and pour water into the cup."

1. **感知 (System-2)**：摄像头流 + 文本指令送入 Qwen3-VL-2B → 提取出 "目标 = bottle on table, then pour into cup" 的隐藏特征
2. **决策 (System-1)**：MM-DiT 在 Flow Matching 步进里采样未来 ~1s 的关节动作 chunk
   - chunk 包含上肢关节角 + 腰部 + 下肢命令（行走方向、步频）
3. **执行 (System-0)**：RL 控制器收到下肢命令，实时输出关节扭矩，让 G1 一边走一边维持平衡
4. **闭环更新**：下一步采样时新的图像 + 本体感觉再过一遍 System-2/1，动作 chunk 持续滚动
5. **子步骤切换**：当 VLM 看到"已抓到瓶子"，隐特征自然切到"对准杯子"语义，System-1 输出倒水动作
6. **结束**：直到任务完成或超时

整个流程**由高到低自然分工**：System-2 管"任务",System-1 管"动作",System-0 管"平衡"。

---

## 🧪 实验与结果

### 1）核心数据预算
- **预训练**：~829 小时人类第一视角视频（EgoDex 等）
- **后训练**：~30 小时真机遥操数据，覆盖 G1（29-DoF + Dex3-1）与 H1（27-DoF + INSPIRE）
- **微调下游新技能**：仅需 **80 条轨迹**

### 2）评测任务
- **8 个真实世界长程 loco-manipulation 任务**
- 每个任务由 **3-5 个子步骤**串成
- 子动作覆盖：抓取 / 倾倒 / 旋转 / 行走 / 蹲下 / 搬运 / 推 / 拉

### 3）核心数字
| 指标 | 数值 |
|------|------|
| 整体平均成功率领先基线 | **+40%+** |
| 使用的机器人数据相对量 | **不到基线 1/10** |
| 微调新技能所需轨迹 | **~80 条** |
| 动作专家参数量 | **~500M** |
| VLM 主干参数量 | **2B (Qwen3-VL-2B)** |

### 4）消融 / 主张（论文主张）
- **直接 co-train 人类与机器人数据**：成功率明显下降，证实"两阶段优于合训"
- **去掉 EgoDex 预训练**：长程任务表现急剧退化
- **去掉 System-0 RL 跟踪**：行走/蹲起阶段稳定性大幅下滑
- **缩减 System-1 参数**：长程一致性变差

### 5）对比基线
GR00T N1、π₀ 等开源 / 半开源 VLA 基础模型；Ψ₀ 在更小机器人数据预算下取得 SOTA。

---

## 📁 源码对照（physical-superintelligence-lab/Psi0）

### 1. 仓库定位
- 主包：`pyproject.toml` 管理，包含依赖组 `base / psi / viz / serve`
- `baselines/`：每个对比基线维护独立 `requirements.txt`，互不污染
- `examples/`：可视化、推理样例
- 数据格式统一为 **LeRobot**

### 2. 安装（uv 管理）
```bash
git clone git@github.com:physical-superintelligence-lab/Psi0.git
uv venv .venv-psi --python 3.10
source .venv-psi/bin/activate
GIT_LFS_SKIP_SMUDGE=1 uv sync --all-groups
uv pip install flash_attn==2.7.4.post1 --no-build-isolation
```

### 3. 数据
- 预训练：**EgoDex** + **Humanoid Everyday**
- 微调：**9 个开源真机任务 + SIMPLE 仿真数据**
- 通过工具脚本转 LeRobot 格式 + 计算 modality statistics

### 4. 推理三模式
- **Open-loop**：跑离线数据，便于打榜与回归测试
- **RTC**：客户端-服务器架构，模型留在大显存机，**机器人侧轻量调用**
- **SIMPLE**：物理仿真器 + 域随机化，验证 sim-to-real

### 5. 引用
```
@misc{wei2026psi0,
  title={Ψ₀: An Open Foundation Model Towards Universal Humanoid Loco-Manipulation},
  author={Songlin Wei and Hongyi Jing and others},
  year={2026},
  eprint={2603.12263},
  archivePrefix={arXiv}
}
```

---

## 🏗️ 工程复现要点

| 环节 | 关键点 |
|------|--------|
| **VLM 主干选型** | Qwen3-VL-2B-Instruct（保持参数量、显存可控） |
| **预训练数据** | ~829h 第一视角人类视频（EgoDex）；伪/潜动作目标 |
| **动作专家** | MM-DiT + Flow Matching（SD3 风格），~500M params |
| **后训练数据** | ~30h G1/H1 遥操数据 + LeRobot 格式 + modality stats |
| **低层控制器** | 提前 RL 训好的 System-0；保护平衡 |
| **微调** | 80 条轨迹即可解锁新技能 |
| **部署** | RTC（客户端-服务器）或 SIMPLE（仿真）；Apache 2.0 |

---

## 🤖 工程价值

- **数据效率范式革新**：用人类视频替代大量机器人数据，把"造机器人"的最大成本（采集）降一个量级
- **三层 System 解耦**：高层语义、中层动作、低层控制各有所长，避免 monolithic VLA 的"任务弱 / 动作抖"两难
- **两阶段训练**：明确否定简单 human + robot co-train，给整个社区一个更稳的训练秘方
- **全栈开源**：数据流水线 + 训练 + 实时推理引擎一条龙；Apache 2.0 许可适合二次商业化
- **跨 embodiment**：在 G1 + H1 两台不同 DoF 与不同末端的人形机器人上一致工作，验证了泛化性

---

## 🎤 面试高频 Q&A

1. **Ψ₀ 的训练为什么不像别人那样 human + robot 一起 co-train？**
   - 论文核心主张：**人和人形机器人的运动学差异巨大**（手臂长度、足式 vs 轮式、关节限位），直接 co-train 会把双方语义/动力学拉偏。Ψ₀ 用 VLM 学语义、用机器人数据学动力学，**Stage 化解耦**。

2. **System-2 / System-1 / System-0 的角色有什么区别？**
   - System-2 = VLM (Qwen3-VL-2B)，理解任务和场景；System-1 = MM-DiT 动作专家，预测关节级动作；System-0 = RL 跟踪控制器，保平衡 + 高频执行。

3. **为什么动作专家用 Flow Matching / MM-DiT 而不是 Diffusion / Autoregressive？**
   - Flow Matching 在连续动作上**收敛更稳、推理更快**；MM-DiT 模仿 SD3 的多模态条件方式，把视觉/语言/本体特征都注入。

4. **40% 的提升是怎么测出来的？**
   - 在 8 个真实世界长程 loco-manipulation 任务（每个 3-5 子步）上对比 GR00T N1 等基线，**整体平均成功率领先 40%+**，而机器人数据用量不到对方 1/10。

5. **EgoDex 在预训练里用作什么目标？**
   - 大致做"自回归视觉-动作对齐"——用人手轨迹作为伪/潜在动作 token，让 VLM 主干学到"看到这种画面 + 这种指令时，下一步该是什么动作语义"。

6. **微调 80 条轨迹这个数字意味着什么？**
   - 表明 Ψ₀ 学到了**强泛化的动作先验**，下游新任务的样本效率非常高，落地复现成本低。

7. **和 GR00T N1、π₀ 的本质区别？**
   - 同属 VLA 基础模型家族，但 Ψ₀ 强调：(a) 三层 System 解耦；(b) 两阶段而非合训；(c) **全栈开源**（数据/训练/RTC 推理引擎）。

---

## 🔗 与路线图其他论文的关联

| 论文 | 关系 |
|------|------|
| GR00T N1 | 同代开源人形 VLA，Ψ₀ 的主要对比基线之一 |
| π₀ / π₀.5 | 提供了 VLA + Flow Matching 动作专家范式的先驱 |
| Humanoid Everyday | Ψ₀ 后训练数据集来源之一（260 任务 / 7 大类） |
| EgoDex | Ψ₀ 预训练核心人类视频源（~829 小时） |
| HOMIE / 各类遥操方案 | 提供后训练阶段的高质量遥操数据 |
| **Ψ₀** | 把"VLM 预训 + 动作专家后训 + RL 低层"的三层范式整合成开源全栈方案 |

---

## 📎 参考来源

- arXiv 论文页：[https://arxiv.org/abs/2603.12263](https://arxiv.org/abs/2603.12263)
- HTML 版：[https://arxiv.org/html/2603.12263v1](https://arxiv.org/html/2603.12263v1)
- PDF：[https://arxiv.org/pdf/2603.12263](https://arxiv.org/pdf/2603.12263)
- 项目主页：[https://psi-lab.ai/Psi0/](https://psi-lab.ai/Psi0/)
- 源码：[https://github.com/physical-superintelligence-lab/Psi0](https://github.com/physical-superintelligence-lab/Psi0)
- 实验室：[Physical Superintelligence Lab @ USC](https://psi-lab.ai/)
- 业界报道：MANUS Use Case、alphaXiv、wispaper 等综述

> 📝 **备注**：本笔记基于公开资料（arXiv 摘要、GitHub README、项目主页、相关综述报道）整理。具体网络结构超参（层数、头数、训练步数、各项 loss 权重）以 arXiv PDF 与仓库代码为准。
