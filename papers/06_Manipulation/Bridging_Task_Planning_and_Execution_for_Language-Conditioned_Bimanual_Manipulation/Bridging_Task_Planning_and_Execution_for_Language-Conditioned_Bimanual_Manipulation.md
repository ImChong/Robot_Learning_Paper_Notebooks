---
layout: paper
title: "Bridging Task Planning and Execution for Language-Conditioned Bimanual Manipulation"
zhname: "连接语言条件双臂操作的任务规划与实际执行"
category: "灵巧操作"
arxiv: "2611.12409"
original_check: done
original_check_date: 2026-11-20
original_check_scope: "官方 arXiv PDF v1 全 8 页，正文 I–V、表 I–IV、图 1–6；官方 HTML 未成功访问；项目页已核对，未确认公开实现源码"
---

# Bridging Task Planning and Execution for Language-Conditioned Bimanual Manipulation
**将语言任务规划与抓取方向、障碍物可达性、双臂并行调度和分层失败恢复统一起来，让 VLM 规划的动作在真实拥挤桌面上更可执行。**

> 📅 总结日期：2026-11-20
>
> 🏷️ 板块：06 Manipulation · 双臂操作 · VLM · 执行感知规划
>
> 🔁 独立模块轮转：05_Locomotion → **06_Manipulation** → 07_Teleoperation

## 📋 基本信息

| 项目 | 内容 |
|---|---|
| 英文标题 | Bridging Task Planning and Execution for Language-Conditioned Bimanual Manipulation |
| 中文标题 | 连接语言条件双臂操作的任务规划与实际执行 |
| 作者 | Emanuele Cuzzocrea、Giuseppina Iannotti（共同一作）、Luca Rossini、Arturo Laurenzi、Nikos Tsagarakis |
| 机构 | 意大利技术研究院 IIT；热那亚大学 |
| 发表 | 2026-11-09 arXiv v1；Humanoids 2026 录用 |
| 论文 | [arXiv](https://arxiv.org/abs/2611.12409) · [PDF v1](https://arxiv.org/pdf/2611.12409) · [HTML（官方入口，当前未能读取）](https://arxiv.org/html/2611.12409) |
| 项目主页 | [Bridging Planning and Execution](https://advrhumanoids.github.io/bridging-planning-execution/)（有演示视频） |
| 官方源码 | 截至 2026-11-20 未从已核对的论文及项目页确认可审阅的实现仓库；不编造源码运行时序图 |
| 原文核验 | **done**：2026-11-20 通读官方 8 页 PDF v1 正文、图表和参考文献；HTML 读取失败；源码未审阅，未复现实验 |

## ❓ 研究问题

语言模型可以给出“拿出白盒子”之类的任务步骤，却不一定知道目标盒子两侧是否留有足够夹爪空间、哪只手能触及、哪些障碍物必须先移动，以及失败后该重试、修改动作还是重新规划。论文要缩小**语义规划与物理执行**之间的落差，同时利用双臂并行能力。

## 🔧 方法核心

1. **结构化场景图**：VLM 从 RGB 图像识别物体及关系，FoundationPose 利用 CAD 模型估计 6D 位姿；图中包含物体、末端执行器、上下左右前后等语义关系。以物体包围盒六个面为候选接触方向，分别标注**可接近性**（周围空间是否足够）和**可达性**（是否存在 IK 解），并记录遮挡原因。
2. **执行感知动作规划**：VLM 接收自然语言与场景图，生成有序动作 `a_k=(action,target,mode,contact,side)`；基本动作是 `grasp/place/push/release`，同时指定左右臂、是否使用夹爪以及接触侧面。抓不到目标时，先考虑替代接近方向，再移动挡路物体。
3. **双臂调度**：把相互兼容、不会冲突的动作合并为并行执行阶段；每阶段记录局部目标及可检查的前置/后置条件。
4. **分层验证与恢复**：每条条件评估为 `satisfied/uncertain/violated`。不确定时先补充感知；确定失败后，依据执行历史选择 **repeat（重试）→ modify（修改接触侧/手臂等参数）→ replan（重新规划）**，必要时 abort，避免每次失败都全局重算。
5. **实际控制**：在 CENTAURO 双臂平台上执行；双臂各 6 DoF、Dagana 夹爪、QP 逆运动学求关节参考。实验期间底盘保持静止，模型默认使用 Gemini Robotics-ER 1.6。

### Mermaid 方法流程图（依据论文 Fig. 2、III 节）

<div class="mermaid">
flowchart TD
    A["RGB 场景 + 自然语言指令"] --> B["VLM 语义关系 + FoundationPose 物体 6D 位姿"]
    B --> C["场景图：物体/末端、遮挡依赖、六面可接近性与 IK 可达性"]
    C --> D["执行感知规划：grasp / place / push / release"]
    D --> E["指定左/右/双臂、接触模式、接触侧"]
    E --> F["调度兼容动作到并行阶段；记录前后置条件"]
    F --> G["执行前条件检查"]
    G -->|满足| H["CENTAURO 双臂动作执行"]
    H --> I["执行后条件检查"]
    G -->|不确定| J["重新感知与条件复核"]
    I -->|不确定| J
    J --> G
    I -->|满足| K{"是否完成所有阶段？"}
    K -->|否| F
    K -->|是| L["任务完成"]
    I -->|违反| M{"依据执行历史定位失败"}
    M -->|有进展| N["Repeat：重试当前阶段"]
    M -->|参数可修正| O["Modify：修改动作属性"]
    M -->|阶段不适用| P["Replan：重建剩余计划"]
    N --> G
    O --> G
    P --> C
</div>

## 📊 实验与主要贡献

论文在真实 **CENTAURO** 上设置 **9 个桌面场景**，每场景 **20 次执行**。表 III 区分“非执行感知 + 二值验证”“执行感知 + 二值验证”和“执行感知 + 分层验证”：

| 场景 | 非执行感知成功率 | 执行感知 + 二值 | 完整方法 |
|---|---:|---:|---:|
| Boxes Aside | 0% | 75% | **85%** |
| Fragile Box | 0% | 70% | **70%** |
| Long Horizon | 0% | 35% | **50%** |
| Push Failure | 15% | 85% | **95%** |

- **可执行性是主要增益来源**：对“并排摆放导致夹爪没有侧向空间”的场景，单纯语义关系无法识别障碍；显式的侧面可接近性和 IK 可达性让规划器先挪开障碍。
- **分层恢复节省 VLM 查询**：Bottle Failure 场景中，二值验证每次失败总是重规划，恢复决策需要 3 次查询；分层恢复平均 **1.1 次**，整次成功执行的平均查询数从 **10 降到 8.1**（表 III、Fig. 5）。
- **并行调度**：Bottles on Box 从 5 个执行阶段降至 3 个，机器人动作时间从 60 s 降至 36 s；Long Horizon 从 9 阶段降至 8 阶段、108 s 降至 96 s（Fig. 6）。这些是论文展示的案例，**不是 20 次试验的平均时间**，且不包括 VLM 查询耗时。
- **模型敏感性**：在三个指定场景上，Gemini Robotics-ER 1.6 成功率 73.3%、延迟 41.9 s；GPT-o3 为 80.0%、91.4 s；GPT-5.2 为 5.0%、34.6 s（表 IV）。不能把此结果外推为模型通用排行榜。

## 🧮 具体实例：重试比重新规划节省多少查询？

以论文的 Bottle Failure 实验为例，二值验证一旦发现夹取失败，就重新调用感知、规划和调度，**每次恢复决策 3 次 VLM 查询**。分层验证发现抓取条件仍可成立、只是动作没有成功，倾向于原阶段重试；论文测得该场景平均 **1.1 次查询/恢复决策**。因此每次恢复平均节省 `3−1.1=1.9` 次，即 `1.9/3≈63.3%` 的**恢复决策查询量**。在表 III 的完整成功执行中，平均查询数由 10 降为 8.1，减少 `(10−8.1)/10=19%`。注意 63.3% 和 19% 的分母不同，前者不包括正常执行中的其他查询，不能混为“整套系统推理加速 63%”。

再看 Fig. 6 的双臂并行示例：Bottles on Box 的动作时间从 60 s 变为 36 s，节约 `24 s`，即 `24/60=40%`。这是**机器人运动阶段**的时间收益，论文没有将 VLM 调用延迟计入该数字；不能据此断言端到端任务耗时也减少 40%。

## ⚠️ 局限与阅读骨架

- **问题**：语义正确的 VLM 任务计划，怎样同时满足抓取几何、双臂协同和失败后的闭环恢复？
- **方法**：场景图显式记录侧面可接近性、IK 可达性和遮挡依赖，调度并行阶段，三态验证与局部优先恢复。
- **结果**：在 9 个真实桌面场景中，执行感知规划显著改善拥挤目标取物成功率；局部恢复减少部分场景的模型查询。
- **局限**：使用已知物体 CAD 与包围盒/对向抓取假设；不适合必须抓杯柄等特殊 affordance；底盘固定、不能通过移动底盘扩大可达域；QP-IK 与预定义动作原语限制复杂接触；VLM 规划延迟仍可能达到数十秒；9 个固定场景不能证明开放世界泛化。

## 📚 一手资料与核验记录

- [arXiv 官方摘要与版本信息](https://arxiv.org/abs/2611.12409)：2026-11-09 首次提交，Humanoids 2026 录用。
- [arXiv PDF v1（8 页）](https://arxiv.org/pdf/2611.12409)：2026-11-20 已阅读 I–V 节、表 I–IV、图 1–6，实验数字均从原文核对。
- [作者项目主页](https://advrhumanoids.github.io/bridging-planning-execution/)：已确认项目页存在。官方 HTML 入口未能读取，未确认可审阅的官方源码，因此**没有源码运行时序图**，未执行代码或复现实验。
