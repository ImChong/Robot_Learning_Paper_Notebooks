---
layout: paper
title: "LocoManiLab: A Unified Testbed for Data, Policies, Controllers, and Deployment in Humanoid Loco-Manipulation"
zhname: "LocoManiLab：人形移动操作的数据、策略、控制与部署统一测试平台"
category: "Simulation Benchmark"
arxiv: "2610.30876"
original_check: done
original_check_date: 2026-11-15
original_check_scope: "arXiv HTML v4：正文第 1–6 节、附录第 7–11 节、表 1–7 与主要实验协议；官方项目页及 GitHub README、__main__.py；未逐行审计完整代码或运行实验"
---

# LocoManiLab: A Unified Testbed for Data, Policies, Controllers, and Deployment in Humanoid Loco-Manipulation
**统一任务、数据、策略接口和全身控制器，让人形机器人的移动操作可以按任务成功率、泛化和运动质量进行可比较的评测。**

> 📅 总结日期：2026-11-15
>
> 🏷️ 模块：11 Simulation Benchmark（仿真与基准）
>
> 🔍 原文核验：已阅读官方 HTML v4 的正文及附录；未复现实验。官方源码仓库可访问，但未审计完整训练/评测实现。

## 📋 基本信息

| 项目 | 内容 |
|---|---|
| 中文标题 | LocoManiLab：人形移动操作的数据、策略、控制与部署统一测试平台 |
| 作者 | Dewei Wang、Jinrui Han、Jiyuan Shi、Chenyun Zhang 等 14 人 |
| 首发 | 2026-10-22，arXiv v1；核验版本 v4（2026-10-28） |
| 论文 | [arXiv:2610.30876](https://arxiv.org/abs/2610.30876) |
| PDF | [官方 PDF](https://arxiv.org/pdf/2610.30876)（已定位；本次以官方 HTML 核验） |
| HTML | [官方全文 v4](https://arxiv.org/html/2610.30876v4)（已阅读） |
| 项目 | [locomanilab.github.io](https://locomanilab.github.io/)（已核对） |
| 源码 | [Gamma-Robot/LocoManiLab](https://github.com/Gamma-Robot/LocoManiLab)（公开 MIT 仓库；README 与 `src/locomanilab/__main__.py` 已核对，未运行） |
| 数据 | [Hugging Face: GammaRobotics/LocoManiLab](https://huggingface.co/GammaRobotics/LocoManiLab)（官方 README 指向，未下载） |

## ❓ 研究问题

不同 VLA / WAM、全身控制器和示范数据来源的评测条件不同，只比较一个成功率会把策略泛化能力、控制执行质量和数据规模混在一起。如何建立可复用的任务、数据和执行接口，让不同策略在相同人形平台与可控干扰下比较？

## 🔧 核心方法

- **统一任务与数据**：13 个家庭场景实例，五类房间，共 234 个任务（102 原子、132 组合）；14,160 段仿真遥操作 episode、51.5 小时仿真数据，另有约 9 小时真机数据。
- **策略—控制器适配**：主实验在 SONIC 控制器下比较 12 个策略；补充实验将 2 个 VLA 与 5 种全身控制器搭配。策略接收头部 RGB、语言和相应本体状态，适配层输出对应控制指令，驱动器以 50 Hz 执行。
- **数据生成**：VR 遥操作、Kimodo 运动生成（与冻结的全身控制器闭环执行）及轨迹增强；生成动作只有经过任务成功与物理有效性筛选才用于示范。
- **评测维度**：已见任务、未见任务、未见场景、Low/Mid/High 视觉扰动；同时记录任务成功率、功率、接触滑移、动作变化率、跌倒率与相对完成时间。后三类运动质量指标主要统计成功 episode，不能直接与全量成功率混同。
- **仿真对照真机**：冰箱开门、杯子搬运、传送带搬箱三项任务在仿真和 G1 真机分别测试。

### 论文方法流程

<div class="mermaid">
flowchart TD
    TASK["234 个任务 / 13 个场景"] --> DATA["VR 遥操作数据"]
    TASK --> GEN["Kimodo 运动生成 + 轨迹增强"]
    GEN --> VALID["控制器执行 + 成功与物理有效性筛选"]
    DATA --> TRAIN["统一数据格式与策略适配"]
    VALID --> TRAIN
    TRAIN --> POL["VLA / WAM / Diffusion Policy"]
    POL --> ADAPT["策略-控制器接口适配"]
    ADAPT --> WBC["SONIC 等全身控制器 / 50 Hz"]
    WBC --> SIM["仿真任务执行"]
    SIM --> METRIC["成功率 + 运动质量 + 泛化 / DR"]
    SIM --> REAL["三项匹配 G1 真机任务"]
    REAL --> METRIC
</div>

### 公开代码运行时序（仅限已核对的 CLI 与 README 层级）

官方 `src/locomanilab/__main__.py` 将 `python -m locomanilab` 交给 `locomanilab.cli.main`；README 给出 `lab init`、`sample-data`、`validate`、`prepare`、`tasks`、`eval` 等命令。下图是**公开文档可证实的命令级工作流**，并非对内部调用栈的逐行审计。

<div class="mermaid">
sequenceDiagram
    actor User as 使用者
    participant CLI as lab CLI
    participant Data as 数据工具
    participant Model as 策略适配/模型环境
    participant Sim as 仿真器与控制器
    participant Result as 评测结果
    User->>CLI: lab init / sample-data
    CLI->>Data: 建立工作区 / 生成示例
    User->>CLI: lab validate / prepare
    CLI->>Data: 校验与整理 episode
    User->>CLI: lab tasks atomic/seen
    CLI-->>User: 列出基准任务
    User->>CLI: lab eval --model gr00t --sim --task ...
    CLI->>Model: 使用模型配置与 checkpoint
    Model->>Sim: 通过策略-控制器接口执行任务
    Sim-->>Result: 保存视频与 results.json
    Result-->>User: 任务结果与 summary.json
</div>

## 📊 实验与结果

论文表 2 中 XR-1 在已见任务平均成功率为 **80.2%**，未见任务为 **25.2%**；未见场景下 DM0.5 平均成功率最高也仅 **15.5%**。表 3 显示更强的视觉扰动普遍降低成功率。表 6 中，三项真机任务平均成功率：XR-1 **70.0%**、GR00T N1.7 **53.3%**、Fast-WAM **46.7%**，整体排序与仿真一致，但单项任务不总是一致。以上均为作者报告，非本次复现实验。

## 🧮 具体实例：如何计算基准任务成功率

以论文表 2 的 XR-1 为例，已见任务共有 **50 个原子任务 + 50 个组合任务**，各任务执行 **20 次**。论文报告原子任务平均成功率 **85.2%**、组合任务平均 **75.1%**。两组任务数量相同，因此按任务等权合并得到 \\( (50\\times85.2+50\\times75.1)/100=80.15\\% \\)，四舍五入约 **80.2%**，与表 2 的已见任务 Avg. 一致。

如果只报告 85.2%，就会忽略长时序任务需要导航与操作连续成功的难度。进一步看未见任务 **25.2%**，相较已见任务下降 **55.0 个百分点**；这里是两个成功率相减，**不是**“性能下降 55%”。对实验复现来说，必须保持相同的任务划分、每任务试验次数、随机种子、控制器和成功判据，否则平均分不能直接比较。

表 6 的 XR-1 真机三个任务成功率分别为冰箱 **80%**、杯子 **70%**、传送带 **60%**，简单平均 \\( (80+70+60)/3=70\\% \\)。每个策略—任务组合仅 **10 次**真机试验，因此单次成功与否就改变该任务成功率 **10 个百分点**；这说明小样本真机排序应结合任务级结果和重复实验解释，不能将它理解为确定性的性能保证。

## ⚠️ 局限与结论

- 主体覆盖室内家庭/办公场景；跨场景泛化仍弱。
- 真机只评估三项任务、三个策略，每个模型—任务对十次试验，无法保证所有任务都遵循相同排序。
- 各策略训练配置与预算并非完全相同，论文明确说明不能据此声称计算预算公平。
- 官方仓库 README 标注模型集成未全部重新完成端到端验证；公开仓库不等于所有模型一键可运行。
- 本笔记已核验论文 HTML 正文及附录，但未运行官方代码、未下载模型权重或数据，源码时序图仅代表已核实的公开命令层级。

## 📚 阅读骨架

1. **问题**：策略、控制器、数据规模如何分开比较？
2. **方法**：234 个任务如何拆成原子/组合、已见/未见、不同 DR 等级？
3. **实验**：表 2 的泛化落差、表 3 的扰动鲁棒性、表 6 的仿真/真机排序。
4. **局限**：训练预算、任务覆盖与真机样本量；后续按官方仓库的 CPU 示例和完整仿真配置复核。
