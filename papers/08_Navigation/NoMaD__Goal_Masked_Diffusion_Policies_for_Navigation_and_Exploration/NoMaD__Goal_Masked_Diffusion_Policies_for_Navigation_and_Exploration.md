---
layout: paper
title: "NoMaD: Goal Masked Diffusion Policies for Navigation and Exploration"
zhname: "NoMaD：面向导航与探索的目标掩码扩散策略"
category: "Navigation"
arxiv: "2310.07896"
---

# NoMaD: Goal Masked Diffusion Policies for Navigation and Exploration
**NoMaD：面向导航与探索的目标掩码扩散策略**

> 📅 阅读日期: 2026-08-15
>
> 🏷️ 板块: 08 Navigation · 图像目标导航 · 无目标探索 · 扩散策略 · 目标掩码
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）· 该模块最新发表论文均已有笔记，按「跳过已有内容取下一篇」补齐模块内唯一尚无笔记的白名单论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2310.07896](https://arxiv.org/abs/2310.07896) |
| HTML | [在线阅读](https://arxiv.org/html/2310.07896v4) |
| PDF | [下载](https://arxiv.org/pdf/2310.07896) |
| **发布时间** | 2023-10-11 (arXiv v1) · ICRA 2024 |
| 项目主页 | [General Navigation Models: NoMaD](https://general-navigation-models.github.io/nomad/) |
| 源码 | 🌟 [robodhruv/visualnav-transformer](https://github.com/robodhruv/visualnav-transformer)（GNM / ViNT / NoMaD 统一训练与部署代码，含预训练权重） |

**作者**：Ajay Sridhar、Dhruv Shah、Catherine Glossop、Sergey Levine（UC Berkeley）

**平台**：多机器人导航数据集训练（GNM 数据集：RECON / SACSoN / SCAND 等），LoCoBot 等移动机器人真机部署

---

## 🎯 一句话总结

以往的视觉导航系统通常把「照着目标图走（goal-conditioned navigation）」和「没有目标、先去探索建图（undirected exploration）」当成两套东西，要么各训一个模型、要么在目标条件模型外再套一个独立的子目标生成器（如 ViNT + 图像扩散生成子目标），既笨重又容易在岔路口「取平均」撞墙。NoMaD 的核心是把二者收进**同一个策略**：在 ViNT 的 Transformer 视觉骨干上引入一个**目标掩码（goal masking）二值开关**——开关打开就屏蔽目标 token、策略做自由探索；关闭就条件于目标图做定向导航。动作端不再回归单条轨迹，而是用一个**条件扩散模型（diffusion policy, DDPM + 1D 卷积 U-Net）**从噪声里采样出未来若干步的动作序列，天然表达岔路口的**多模态**（可以左也可以右，而不是取中间撞墙）。结果是：一个**比 ViNT+子目标扩散基线更小**的模型，在陌生环境里导航到「图像指定目标」时性能更好、碰撞更少，同时还能独立承担探索任务。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| ViNT | Visual Navigation Transformer | NoMaD 复用的视觉导航 Transformer 骨干，输入观测/目标图像 token |
| DDPM | Denoising Diffusion Probabilistic Model | 去噪扩散概率模型，NoMaD 的动作生成头 |
| GNM | General Navigation Models | 该团队的通用导航模型系列与多机器人数据集 |
| Goal Masking | 目标掩码 | 二值开关：屏蔽/保留目标 token，切换探索 vs 定向导航 |
| Temporal Distance | 时间距离 | 预测到目标还要几步，用于拓扑图节点选择 |
| Topomap | Topological Map | 由图像节点构成的拓扑地图，支撑长程导航 |
| U-Net (1D) | 一维卷积 U-Net | 扩散去噪网络主体，逐步去噪出动作序列 |
| EfficientNet | — | ViNT 中对每帧图像做特征提取的 CNN 编码器 |

---

## ❓ 论文要解决什么问题？

一个能在真实世界跑的移动机器人，导航时常常要在两种模式间切换：

1. **定向导航（goal-conditioned）**：已知目标（一张目标图 / 拓扑图里的节点），沿已知/相似路径走过去。
2. **无目标探索（undirected exploration）**：目标还未知或不可达，需要先自主四处走、把环境「看」出来，为建图 / 找目标服务。

以往做法的痛点：

- **两套模型**：定向导航与探索各训一个，部署重、迁移差。
- **子目标生成器笨重**：像 ViNT 那样先用图像扩散**生成候选子目标图**、再喂给目标条件策略，多一层大模型、推理慢。
- **单模态回归撞墙**：把动作学成回归单条轨迹，遇到岔路口会对多个可行方向**取平均**，直接怼墙。

NoMaD 的答案：**一个策略 + 一个掩码开关**统一两种模式，**用扩散生成多模态动作**避免取平均，模型反而更小。

---

## 🔧 方法拆解

### 1. 共享视觉骨干（ViNT Transformer）
- 用一段**观测历史图像**（当前 + 过去若干帧）和**一张可选的目标图像**，各经 EfficientNet 编码成 token，送入 ViNT 的 Transformer 得到上下文表征。

### 2. 目标掩码（Goal Masking）——统一探索与导航的开关
- 引入二值掩码 *m*：
  - **m = 0（保留目标）**：策略条件于目标图 → **定向导航**。
  - **m = 1（屏蔽目标）**：目标 token 被 mask 掉 → 策略只看观测、做**无目标探索**。
- 训练时随机采样 *m*，让同一套权重同时学会两种模式；部署时按需要拨开关。

### 3. 扩散动作头（Diffusion Policy）——多模态动作序列
- 以 Transformer 上下文为条件，用 **DDPM + 1D 卷积 U-Net** 从高斯噪声迭代去噪，生成**未来若干步的动作序列（航点/位移）**。
- 扩散的分布建模能力让岔路口输出**多个可行模态**而非其平均值，显著降低撞墙。

### 4. 时间距离预测 + 拓扑图（长程导航）
- 另有一个**时间距离**头预测「到目标还要几步」，用于在**拓扑图（topomap）**里选择下一个子目标节点，把短程策略串成长程导航。

### 5. 训练数据与规模
- 在多机器人导航数据集（GNM：RECON / SACSoN / SCAND 等）上联合训练，跨机型、跨环境。
- 相比 ViNT + 独立子目标扩散的方案，NoMaD **模型更小**却导航更好、碰撞更少。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph OBS["👁️ 观测输入"]
        HIST["观测历史图像<br/>当前 + 过去数帧"]
        GOAL["目标图像（可选）"]
        ENC["EfficientNet 逐帧编码 → token"]
    end

    subgraph MASK["🔀 目标掩码开关 (Goal Masking)"]
        SW["二值 m<br/>m=0 保留目标→定向导航<br/>m=1 屏蔽目标→自主探索"]
    end

    subgraph BACKBONE["🧠 ViNT Transformer 骨干"]
        CTX["融合观测(+目标)上下文表征"]
    end

    subgraph HEADS["🎯 双输出头"]
        DIFF["扩散动作头 (DDPM + 1D U-Net)<br/>去噪采样未来动作序列<br/>表达岔路口多模态"]
        TD["时间距离头<br/>预测到目标步数"]
    end

    subgraph LONG["🗺️ 长程导航"]
        TOPO["拓扑图 topomap<br/>按时间距离选下一子目标节点"]
    end

    subgraph ROBOT["🤖 部署"]
        WP["输出航点 → PD 控制器 → 速度指令"]
        BASE["移动机器人 (LoCoBot 等)"]
    end

    HIST --> ENC --> CTX
    GOAL --> ENC
    SW --> CTX
    CTX --> DIFF --> WP --> BASE
    CTX --> TD --> TOPO --> GOAL

    style OBS fill:#eef6ff,stroke:#2e86de
    style MASK fill:#fff7e0,stroke:#d4a017
    style BACKBONE fill:#f3e8ff,stroke:#8e44ad
    style HEADS fill:#eafaf1,stroke:#27ae60
    style LONG fill:#fdf2ff,stroke:#c0398d
    style ROBOT fill:#fde8e8,stroke:#c0392b
</div>

---

## 🧩 源码运行时序图（mermaid）

> 基于官方仓库 [robodhruv/visualnav-transformer](https://github.com/robodhruv/visualnav-transformer) 的部署脚本（`deployment/src/navigate.py`、`explore.py`、`pd_controller.py`）与 ROS 话题梳理。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant CAM as usb_cam<br/>(/usb_cam/image_raw)
    participant NAV as navigate.py / explore.py<br/>(推理节点)
    participant TOPO as 拓扑图 topomap<br/>(节点图像目录)
    participant NET as NoMaD 模型<br/>(ViNT + 扩散头)
    participant PD as pd_controller.py
    participant BASE as 机器人底盘<br/>(cmd_vel)

    Note over NAV,NET: 启动：加载 config/models.yaml 中的 .pth 权重
    NAV->>TOPO: 载入目标 / 子目标节点图像
    loop 每个控制周期
        CAM-->>NAV: 订阅当前观测图像
        NAV->>NAV: 拼接观测历史 (context)
        alt 定向导航 navigate.py
            NAV->>NET: 观测历史 + 目标图 (m=0)
            NET->>NET: 时间距离头选最近子目标节点
        else 自主探索 explore.py
            NAV->>NET: 观测历史 (goal masking m=1)
        end
        NET->>NET: 扩散去噪采样未来动作序列
        NET-->>NAV: 返回航点 (waypoints)
        NAV->>PD: 发布 /waypoint
        PD->>PD: 航点 → 线速度/角速度
        PD-->>BASE: 发布 /cmd_vel 执行
    end
    Note over NAV,BASE: joy_teleop.py 可随时人工接管
</div>

---

## 💡 核心贡献

1. **单策略统一导航与探索**：用一个目标掩码开关让同一套权重既能定向导航、又能无目标探索，免去「两套模型 / 额外子目标生成器」。
2. **扩散动作头建模多模态**：以扩散策略生成未来动作序列，天然表达岔路口的多个可行方向，避免回归取平均导致的撞墙。
3. **更小更省**：相比 ViNT + 独立子目标扩散方案，NoMaD 参数更少、推理更省，却导航性能更好、碰撞更低。
4. **全链路开源**：GNM / ViNT / NoMaD 共享一套训练与部署代码及预训练权重，便于跨机型复用与真机部署。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 统一性 | 一个策略 + goal masking 同时覆盖「定向导航」与「无目标探索」 |
| vs 子目标生成基线 | 相比 ViNT + 图像子目标扩散，导航性能更好、碰撞率更低 |
| 模型规模 | 参数量小于上述基线，却取得更优效果（论文强调「smaller models」） |
| 多模态 | 扩散动作头在岔路口输出多个可行模态，缓解取平均撞墙 |
| 泛化 | 在多机器人数据集训练，陌生真实环境可零/少样本部署 |

> ⚠️ 上表为定性归纳，具体数值以论文与项目页为准。

---

## 🤖 对（人形）机器人导航领域的意义

| 方向 | 含义 |
|---|---|
| **模式统一** | 把「探索」与「导航」压进一个策略，简化系统、降低部署与迁移成本，对算力受限的移动/人形本体尤其友好 |
| **动作多模态** | 扩散策略给出「多条可行路径分布」而非单点回归，是应对真实环境岔路、动态障碍的通用范式 |
| **可复用骨干** | ViNT/NoMaD 作为跨机型视觉导航基础模型，可作为人形导航的图像目标 / 探索模块的现成起点 |

---

## 🎤 面试参考

**Q：NoMaD 的「goal masking」到底解决了什么？**
A：解决「导航」和「探索」被迫分家的问题。以往定向导航需要目标、探索不需要目标，往往各训一个模型或额外挂子目标生成器。NoMaD 用一个二值掩码控制是否保留目标 token：保留就定向导航，屏蔽就自主探索。同一套权重、拨个开关就切换，系统更简洁、迁移更好。

**Q：动作端为什么用扩散策略而不是直接回归航点？**
A：真实导航里岔路口是**多模态**的——左走右走都对。直接回归单条轨迹会对多个方向取平均，结果朝中间怼墙。扩散策略把动作建成一个分布，从噪声去噪采样出多条可行的未来动作序列，保住了多模态，碰撞率因此更低。

**Q：NoMaD 和 ViNT 是什么关系？**
A：NoMaD 复用 ViNT 的 Transformer 视觉骨干（观测/目标图像 token），但把「ViNT + 独立图像子目标扩散生成器」这套重方案，换成「共享骨干 + goal masking + 扩散动作头」的轻方案：一个更小的模型统一了导航与探索，性能反而更好。

---

## 🔗 相关阅读

- [ViNT (2306.14846)](https://arxiv.org/abs/2306.14846)：NoMaD 的视觉导航 Transformer 骨干与前作
- [NavDP (2505.08712)](https://arxiv.org/abs/2505.08712)：另一条 sim-to-real 导航扩散策略路线（同模块）
- [NaVILA (2412.04453)](https://arxiv.org/abs/2412.04453)：足式机器人视觉-语言-动作导航模型
- [ARMOR (2412.00396)](https://arxiv.org/abs/2412.00396)：人形第一视角避障与运动规划（同模块）
