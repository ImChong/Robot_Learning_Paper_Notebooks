---
layout: paper
title: "LHNav: Long-Horizon Humanoid Navigation via Multirate Coordination and Physics-Grounded Action Data"
zhname: "LHNav：基于多速率协同与物理约束动作数据的长程人形导航"
category: "导航"
arxiv: "2611.12136"
original_check: done
original_check_date: 2026-11-22
original_check_scope: "已通读官方 arXiv HTML v1 的 I–VI 节、式 (1)–(4)、表 I–VII 与图注；PDF 链接已确认但未独立逐页核对；官方 GitHub 仅可核实 README 标题，未发现可审阅实现"
---

# LHNav: Long-Horizon Humanoid Navigation via Multirate Coordination and Physics-Grounded Action Data
**LHNav 用异步的任务规划 Brain、动作 token VLA Cerebellum 与冻结的 SONIC 全身控制 Brainstem 协同多个目标点，并通过物理执行对齐的数据引擎训练稳定、贴合路线的人形导航。**

> 📅 总结日期: 2026-11-22
>
> 🏷️ 板块: 08 Navigation · 长程导航 · 人形 VLA
>
> 🔁 推进轨: 独立模块轮转（07_Teleoperation → **08_Navigation**）

## 📋 基本信息

| 项目 | 内容 |
|---|---|
| 中文标题 | LHNav：基于多速率协同与物理约束动作数据的长程人形导航 |
| 英文标题 | LHNav: Long-Horizon Humanoid Navigation via Multirate Coordination and Physics-Grounded Action Data |
| 作者 | Xueyang Wang、Zehong Shen、Dingkun Wei、Huaijin Pi、Changpeng Wang、Xing Zhu、Hujun Bao、Yujun Shen、Xiaowei Zhou |
| 机构 | 浙江大学、Robbyant、香港大学 |
| 发表 | arXiv 预印本 v1，首次提交 **2026-11-09** |
| 原文 | [arXiv](https://arxiv.org/abs/2611.12136) · [HTML v1](https://arxiv.org/html/2611.12136v1) · [PDF](https://arxiv.org/pdf/2611.12136) |
| 项目主页 | [Robbyant LHNav](https://robbyant-research.github.io/LHNav/) |
| 官方 GitHub | [robbyant-research/LHNav](https://github.com/robbyant-research/LHNav)（2026-11-22 可读取 README 仅含 `# LHNav`，**未确认公开训练/推理实现**） |
| 核验状态 | **HTML：已通读**（I–VI、公式、实验表、结论）；**PDF：链接存在，未独立逐页核对**；**源码：仅 README，关键实现不可审阅**；**实验：未复现** |

## ❓ 研究问题

多目标导航需要持续维护任务进度、处理目标切换与抵达验证；而只预测 waypoint 的导航器，即使局部路线几何可行，也不保证人形全身运动平顺、稳定且不偏离可通行区域。如何把低频语义决策与高频全身控制解耦，同时让视觉导航训练标签真正对应物理执行？

## 🔧 核心方法

1. **Brain（异步任务管理）**：规划代理维护 completed / active / pending 目标序列；任务管理工具可以根据新指令删改未执行目标，独立到达验证 VLM 最高约 **1 Hz** 更新反馈。完成验证还需要运动计划耗尽与里程计确认站稳，然后再切换目标。
2. **Cerebellum（导航 VLA）**：基于 GR00T N1.7 与 SONIC，接收子任务文本、目标参考图像、当前 RGB 和本体状态，联合预测长度 **H=40** 的 **64 维 motion token** 与 **5 维辅助 waypoint**；约 **8 Hz** 更新，4 次去噪。waypoint 的位置、朝向和到达标志用于训练几何监督，并非逐帧直接控制指令。
3. **几何约束**：从背景可通行网格与可移动前景障碍物生成平面 SDF；对预测 waypoint 取最小有符号距离，用 softplus 惩罚越界，并与 joint flow matching loss 联合优化，避免少量危险点被平均掩盖。
4. **Brainstem（冻结控制器）**：冻结 SONIC decoder，以 **50 Hz** 将 motion token 和本体反馈转为关节目标，交给 PD 控制；新的 token chunk 替换尚未执行的尾部，跳过推理期间已经执行的前缀。
5. **物理落地的数据引擎**：100 个 InteriorGS 训练场景（另 20 个留出测试）；BgMesh/FgMesh 与 A* 路径、平滑处理后由 ARDY 生成 50 Hz 全身参考动作；P-SONIC 编码器引入未来 pelvis 位置差与历史机体速度，在冻结 FSQ/decoder 的前提下优化追踪；MuJoCo 物理执行筛选未跌倒轨迹，回放机器人状态渲染第一视角 RGB，按执行轨迹标注 token 与 waypoint。

### 方法流程图（依据官方 Fig. 3–5、III–IV 节）

<div class="mermaid">
flowchart TD
    A["语言指令 + 目标图像目录"] --> B["Brain：任务分解 / 管理 / 到达验证"]
    B --> C["当前子目标文本 + 目标图像"]
    D["RGB + 本体状态"] --> E["Cerebellum：VLA 联合预测"]
    C --> E
    E --> F["Motion token chunk，约 8 Hz"]
    E --> G["辅助 waypoint + SDF 几何监督（训练）"]
    F --> H["冻结 SONIC Brainstem，50 Hz"]
    H --> I["关节目标 + PD 控制"]
    I --> J["机器人状态 / 抵达反馈"]
    J --> B
    K["GS+Mesh / A* 路径"] --> L["ARDY 参考动作"]
    L --> M["P-SONIC 物理跟踪 / 筛选"]
    M --> N["执行状态渲染 RGB + token/waypoint 标签"]
    N -.-> E
</div>

## 📊 实验结果与贡献

| 评估（论文表） | LHNav | 对照或说明 |
|---|---:|---|
| 单目标 SR@0.5m（表 I） | **52.3%** | OmniNav 36.0%，DualVLN 18.6%；522 episodes / 20 留出场景 |
| 单目标 SR@1.5m（表 I） | **75.7%** | OmniNav 69.0%，DualVLN 48.7% |
| 单目标 CR（表 I） | **8.6%** | OmniNav 19.5%，DualVLN 25.8% |
| 长程 Task SR@1.5m（表 II） | **75.6%**（摘要精度 75.56%） | 45 个任务，每个至少三个有序目标；不含任务管理降为 0%，不含抵达验证为 55.6% |
| 真机长程（表 III） | **4/5 = 80%** | Unitree G1，指定三目标任务，仅 5 次测试 |
| 跟踪误差（表 IV） | **1.76 cm** | P-SONIC 对照原 SONIC 48.65 cm；100 条 10m 合成路径 |

数据引擎共生成 **185,401** 条单目标训练演示；在 184,990 条共享路径对照中，物理执行越界路径比例由 **3.318% 降至 1.841%**，关节位置 jerk 下降 **44.7%**。这些是作者报告的实验，未在本仓库复现。

## 🧮 具体实例：多速率与成功率如何理解

以下是基于论文公开参数的**教学计算**，并非作者额外报告的实验。假设连续导航 10 秒，50 Hz 的 Brainstem 理论上执行 `10×50=500` 次控制更新；8 Hz 的 Cerebellum 理论上更新 `10×8=80` 次 token chunk；1 Hz 的到达验证最多进行约 `10×1=10` 次检查。三者不必同步等待，才允许规划与动作执行重叠；实际次数会受延迟、停机和异步调度影响。

论文表 II 的 45 项长程任务中，`34/45≈75.56%`，对应摘要的长程成功率；若只报告一位小数即 **75.6%**。去掉抵达验证后报告 **55.6%**，两者相差 **20.0 个百分点**，不能直接解释为 20% 相对提升。表 IV 的平均终点误差从 **48.65 cm** 降到 **1.76 cm**，按 `(48.65−1.76)/48.65×100%≈96.38%`，与作者报告的约 **96.4%** 相符。注意此跟踪实验在合成 10m 路径上进行，不能把该误差降低幅度等同于真机导航成功率提升。

## ⚠️ 局限与阅读骨架

- **问题**：长程语言目标切换与物理可执行的人形全身导航之间存在时间尺度与监督接口差异。
- **方法**：异步 Brain / Cerebellum / Brainstem、motion-token + waypoint 联合训练、SDF 几何损失、P-SONIC 物理执行数据。
- **结果**：单目标 522 条评测、长程 45 项任务、G1 少量真机实验；模型依赖冻结 SONIC 解码器。
- **边界**：真实长程任务仅 5 次试验；场景与目标目录需预设，导航与实际完成“做饭/取物”不是同一能力；真机多目标只证明顺序到达，不等于完整操作任务成功；缺少可审阅的 LHNav 训练/部署源码，无法复现其完整系统；实验对照受数据、控制接口与硬件设置限制。
- **后续阅读**：重点核对式 (1)–(3) 的 motion token / waypoint 联合目标、SDF 最小 clearance 监督，以及式 (4) P-SONIC privileged encoder 如何消除长程漂移。

## 📚 来源与核验边界

一手来源：[官方 arXiv HTML v1](https://arxiv.org/html/2611.12136v1)（2026-11-22 核对正文 I–VI、图 1–11、表 I–VII）；[官方项目主页](https://robbyant-research.github.io/LHNav/)（演示与作者信息）；[官方 GitHub](https://github.com/robbyant-research/LHNav)（当前可读取 README 仅含标题，未确认训练或推理代码）。PDF 链接已确认但未独立逐页审阅；因此不绘制虚构的源码运行时序图，不声称源码审计或复现实验。
