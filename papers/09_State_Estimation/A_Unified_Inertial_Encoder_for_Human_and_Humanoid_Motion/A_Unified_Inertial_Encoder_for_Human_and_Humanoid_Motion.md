---
layout: paper
title: "A Unified Inertial Encoder for Human and Humanoid Motion"
zhname: "面向人体与人形机器人运动的统一惯性编码器"
category: "状态估计"
arxiv: "2611.10137"
original_check: done
original_check_date: 2026-11-23
original_check_scope: "官方 arXiv HTML v1 正文 I–V 节、方法、实验表格与项目页；官方源码 README、src/train.py、src/eval_foundation.py 关键入口；PDF 未独立逐页核对，未运行源码"
---

# A Unified Inertial Encoder for Human and Humanoid Motion
**利用人体运动与运动学重定向的 G1 数据训练共享惯性编码器，在统一的 12 处身体传感器表示上联合学习速度估计和运动文本检索，并零样本迁移至真实 Unitree G1。**

> 📅 总结日期：2026-11-23
>
> 🏷️ 板块：09 State Estimation · 惯性里程计 · 人体到人形机器人迁移

## 📋 基本信息

| 项目 | 内容 |
|---|---|
| 中文标题 | 面向人体与人形机器人运动的统一惯性编码器 |
| 英文标题 | A Unified Inertial Encoder for Human and Humanoid Motion |
| 作者 | Yutian Chen、Shibo Zhao、Rocky Duan、Karen Liu、Carmelo Sferrazza、Guanya Shi、Yuheng Qiu、Koushil Sreenath |
| 机构 | Amazon FAR、UC Berkeley、Stanford University、Carnegie Mellon University |
| 发表 | arXiv:2611.10137v1，2026-11-06，预印本 |
| 论文 | [arXiv](https://arxiv.org/abs/2611.10137) · [HTML v1](https://arxiv.org/html/2611.10137v1) · [PDF](https://arxiv.org/pdf/2611.10137) |
| 项目 | [官方项目页](https://unified-inertial-encoder.github.io/) |
| 代码 | [amazon-far/Unified-Inertial-Encoder](https://github.com/amazon-far/Unified-Inertial-Encoder)（Apache-2.0） |
| 原文核验 | **done（2026-11-23）**：通读官方 HTML v1 正文 I–V 节，核对方法与实验；PDF 未单独逐页复核。已核对公开代码 README 与训练/评估入口，**未运行训练、评估或复现实验** |

## ❓ 研究问题

机器人惯性里程计通常依赖机器人自身采集的运动轨迹，但控制器尚未覆盖的动作也难以用于训练。人体运动数据更丰富，却与人形机器人的尺寸、传感器布置、坐标轴、采样频率及真实硬件冲击存在域差异。能否在**不使用真实机器人训练轨迹、物理仿真或部署微调**的条件下，从人体运动迁移状态估计和运动语义理解？

## 🔧 核心方法

1. **共享 12 部位惯性接口**：骨盆、头部以及双侧上臂、前臂、大腿、小腿和足部。人体采用真实/虚拟 IMU；G1 使用骨盆 IMU、关节角/速度及 URDF 运动学，将角速度和比力运动学传播到相应连杆，再统一至 Xsens 坐标约定；无需世界位姿或根速度输入。
2. **连续时间编码**：按时间戳进行连续卷积与固定时间跨度池化，兼容不等采样率、丢样及时间抖动，不必强制重采样至统一频率。Transformer 交替进行部位内和跨部位注意力。
3. **联合训练**：速度回归、短时轨迹一致性、运动与冻结 CLIP 文本特征的对齐，以及去噪重建四项损失，共享主干，分别用于惯性里程计和自然语言运动检索。
4. **随机化与零样本部署**：对体型、动作速度、重力、噪声、漂移、振动、撞击和采样进行扰动；真实 G1 只用于最终评估，不作为梯度训练数据。

### 方法流程图（依据论文 Fig. 2、III 节）

<div class="mermaid">
flowchart TD
    A["人体真实/虚拟 IMU 数据"] --> C["12 个对应身体部位"]
    B["G1 骨盆 IMU + 关节状态 + URDF"] --> D["运动学合成多部位 IMU"]
    D --> C
    C --> E["传感器坐标系对齐"]
    E --> F["按时间戳连续卷积与固定时长 token"]
    F --> G["交替部位内/跨部位注意力 Transformer"]
    G --> H["速度预测与短时轨迹一致性"]
    G --> I["去噪加速度与角速度"]
    G --> J["运动特征与冻结 CLIP 文本对齐"]
    H --> K["联合训练 + 传感器/动作随机化"]
    I --> K
    J --> K
    K --> L["零样本真实 G1：里程计与文本检索"]
</div>

### 公开源码运行时序图（已核对 README、训练/评估入口）

以下描述**公开入口的模块级调用关系**，不代表已逐行审计内部全部数据加载器和训练细节。

<div class="mermaid">
sequenceDiagram
    participant U as 开发者
    participant T as src.train
    participant D as 数据加载器
    participant M as FoundationIMU
    participant E as src.eval_foundation
    U->>T: python -m src.train experiment=exp15_full_train_C
    T->>D: 按 Hydra 配置构建多来源数据集
    D-->>T: IMU 窗口与监督信号
    T->>M: Lightning 训练步骤/联合损失
    M-->>T: 模型输出与损失
    T-->>U: checkpoint 与 Hydra 配置
    U->>E: python -m src.eval_foundation --ckpt ... --data_from ... --dataset ...
    E->>M: 加载 checkpoint 并推理多部位输入
    M-->>E: 多部位预测
    E->>E: pelvis_restrict 仅评估骨盆流
    E-->>U: AVE / ATE 指标
</div>

## 📊 实验与贡献

论文表 III 在五个数据集上比较惯性里程计，模型的**平均速度误差 AVE** 均为所列方法最低；真实 G1 上 AVE 为 **0.099 m/s**，`ATE_GT` 为 **3.153 m**，`ATE_Pred` 为 **11.50 m**。其中 `ATE_GT` 使用真值姿态积分预测速度，`ATE_Pred` 使用陀螺积分姿态，两者不可混淆。真实 G1 训练轨迹不参与训练。

在 G1 的**未见运动类别（仅人体训练中出现）**上，运动到文本检索 R@1 为 **53.8%**，对比 IMU2CLIP 的 **17.3%**；这组结果针对重定向 G1 数据，不应误写为真实 G1 的大规模标注检索精度。联合人体与 G1 训练将真实 G1 的 `ATE_GT` 从仅 G1 训练时的 **5.901 m** 降到 **3.153 m**。项目页报告 TensorRT 在 NVIDIA L40S 上处理 4 秒、12 IMU 窗口约 **1.78 ms**，不是已验证的板载端到端延迟。

## 🧮 具体实例：量化人体运动迁移收益

仅用论文消融表报告的真实 G1 `ATE_GT` 数字进行可复算计算：

- 仅使用重定向人形数据训练：**5.901 m**。
- 联合人体与重定向人形数据训练：**3.153 m**。
- 绝对误差减少：`5.901 - 3.153 = 2.748 m`。
- 相对减少：`2.748 / 5.901 × 100% ≈ 46.57%`。

这说明在论文**指定数据集、轨迹和使用真值姿态的评价条件**下，人体数据显著改善位移累计误差；并不表示所有真实机器人轨迹都能减少 46.57%，也不能推导出不使用真值姿态时同等幅度的收益。

## ⚠️ 局限与阅读骨架

- **问题**：如何用人体动作补充人形机器人惯性状态估计的数据覆盖？
- **方法**：运动学合成共享 IMU 接口、连续时间 token、交替注意力、速度/轨迹/语言/去噪多任务训练。
- **结果**：五数据集 AVE 最低；真实 G1 零样本 AVE 0.099 m/s；重定向 G1 未见类别文本检索 R@1 53.8%。
- **局限**：真实 G1 轨迹集仅约 0.7 小时；骨盆 IMU 与关节状态仍依赖标定、微分和传感器质量；运动学合成不能完全复现碰撞和结构振动；`ATE_GT` 依赖真值姿态；跨机器人平台泛化与在线闭环稳定性仍需额外验证。
- **复现边界**：官方已公开训练、预处理、评估入口及预训练权重，但本笔记仅检查了关键入口和文档，未下载数据/权重，未实际运行源码。

## 📚 一手来源

- [官方论文 HTML v1](https://arxiv.org/html/2611.10137v1)（I–V 节、表 I–III、消融及结论；2026-11-23）
- [官方项目页](https://unified-inertial-encoder.github.io/)（公开交互演示、评测说明）
- [官方源码](https://github.com/amazon-far/Unified-Inertial-Encoder)（README、`src/train.py`、`src/eval_foundation.py`）
