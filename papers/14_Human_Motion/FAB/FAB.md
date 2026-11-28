---
layout: paper
title: "Fast and Accurate Body Estimation in Pixels, World Space and Scenes"
zhname: "FAB：像素、世界空间与场景中的快速准确人体估计"
arxiv: "2611.25801"
original_check: partial
original_check_date: 2026-11-28
original_check_scope: "HTML v1 主要正文、表 1/8、项目页及源码入口已核对；PDF 和附录未逐项复核"
---

# Fast and Accurate Body Estimation in Pixels, World Space and Scenes
**以人体表面点作为统一表示，连接视觉姿态估计、场景接触与人形机器人重定向。**

## 📋 基本信息

- 作者：Jinkun Cao（个人独立研究，非 Amazon FAR 职务项目）。
- 日期：2026-11-19，arXiv v1 预印本。
- 模块：14 Human Motion
- 来源：[论文摘要](https://arxiv.org/abs/2611.25801) · [HTML](https://arxiv.org/html/2611.25801v1) · [项目主页](https://www.jinkuncao.com/FAB/) · [源码](https://github.com/noahcao/FAB)
- 核验：HTML 主要正文及实验表已核对，PDF 未独立读取，附录未逐项核验；官方 README、pyproject.toml、demo.py、fab/cli.py、fab/entry.py 已读取，训练和求解器内部尚未完整审核。

## ❓ 研究问题

如何从普通视频恢复快速、准确且与环境接触一致的人体运动，并将其转换为机器人可跟踪的参考轨迹？

## 🔧 核心方法

FAB-L 采用蒸馏后的 ViT-L 预测关节点、表面点及深度；由点拟合 SMPL，再进行两次 Gauss–Newton 修正。接触预测区分静态接触和一般接触。世界空间阶段联合校正场景尺度和人体运动。FAB-Retarget 以整段轨迹优化骨骼方向、接触、地形避碰和速度约束，生成 G1 参考。

<div class="mermaid">
flowchart TD
 A["视频与人体检测"] --> B["FAB 点预测"]
 B --> C["SMPL 拟合"]
 B --> D["接触预测"]
 A --> E["相机与场景重建"]
 C --> F["人体场景联合优化"]
 D --> F
 E --> F
 F --> G["FAB-Retarget 轨迹优化"]
 B --> G
 G --> H["G1 参考轨迹"]
</div>

### 源码运行时序（已核验入口级）

依据 pyproject.toml、fab/cli.py 与 fab/entry.py；不描述未审阅的求解器内部。

<div class="mermaid">
sequenceDiagram
 participant U as 用户
 participant C as fab.cli.main
 participant P as FABPredictor
 participant E as fab.entry
 participant W as fab_world.sh
 participant R as fab_retarget.py
 U->>C: 输入图片
 C->>P: 初始化模型并 predict
 P-->>C: 每人预测结果
 C-->>U: 保存 pkl
 U->>E: fab-world 视频
 E->>W: subprocess 调用
 W-->>U: 世界空间 npz 与场景
 U->>E: fab-retarget npz
 E->>R: Python 子进程
 R-->>U: G1 参考文件
</div>

## 📊 实验与贡献

表 1：FAB-L 单人 39.2 fps，3DPW PA-MPJPE 32.7 mm；SAM 3D Body 对应 8.5 fps 与 33.7 mm，运行后端不同。表 8：25 段平地动作经 SONIC 在 MuJoCo 跟踪，points 模式跌倒 4 段，跌倒前骨骼方向误差 18.3°。

## ⚠️ 局限与阅读骨架

先读第 3.1 节的点表示，再读第 3.2–3.4 节的接触、场景和重定向，最后对照表 1 与表 8 的不同评测口径。复杂姿态和长序列相机漂移仍是局限；论文明确没有真机验证。源码时序图仅覆盖入口，训练及重定向内部需继续核查。
