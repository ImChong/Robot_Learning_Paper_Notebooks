# 📚 每日论文阅读计划

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen.svg)](https://imchong.github.io/Robot_Learning_Paper_Notebooks/)
[![License](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](LICENSE)
[![Papers](https://img.shields.io/badge/Papers-761-orange.svg)](papers/PROGRESS.md)
[![Notes](https://img.shields.io/badge/Notes-357-green.svg)](papers/)

人形机器人学习方向的每日论文精读笔记，逐篇部署为 [在线网页](https://imchong.github.io/Robot_Learning_Paper_Notebooks/)。

**来源**：[awesome-humanoid-robot-learning](https://github.com/YanjieZe/awesome-humanoid-robot-learning) · **待读清单**：[papers/PROGRESS.md](papers/PROGRESS.md)

## 在线演示

[![站点使用演示：展开学习路线图，搜索 DeepMimic 并打开论文笔记，通过目录跳转到训练流程，点击流程图进入大图查看器](media/site-demo.gif)](https://imchong.github.io/Robot_Learning_Paper_Notebooks/)

↑ 点击动图进入[在线站点](https://imchong.github.io/Robot_Learning_Paper_Notebooks/)。展开**推荐学习路线图**了解阅读顺序；按论文标题或 arXiv 编号**即时搜索**；打开笔记后通过**目录**定位章节，点击流程图可进入大图查看器，支持缩放与拖拽。

## 规则

1. 每天早上 7:00 推送当日论文阅读提醒。
2. 回复"理解了"才进入下一篇；当天未回复，次日继续同一篇。
3. 回复"理解了"后，对话记录会一并保存到对应 MD 笔记。
4. 可随时说"读下一篇"跳到下一篇。

## 学习路线图

> 💡 括号内为论文 arXiv 首次发布年份，与首页路线图节点下方的年份小字一致。

```
① 【基础 RL】
  PPO (2017) → AWR (2019)
              ↓
   【人体动作数据层】        ← 模仿类方法开始需要参考数据
  AMASS (2019) / HumanML3D (2022)  →  人体 SMPL 动作数据集
       ↓
   【动作重定向层】          ← 人体骨架 → 机器人骨架的桥梁
  几何重定向 (IK-based)  →  GMR / Retargeting Matters (2025)
       ↓                    ↑ 决定模仿策略的动作质量上限
       ↓
② 【精确模仿主线】        【风格学习主线】
  DeepMimic (2018)  →→→  AMP (2021)
       ↓                    ↓
  PHC (2023)            ADD (2025)
       ↓
③ 【技能组合 / 扩散】
  ASE (2022) → CALM (2023) → PULSE (2023)
  Diffusion Policy (2023) → BeyondMimic (2025)
       ↓
④ 【全身控制 WBC】        ← 把技能 / 扩散策略落到整机关节
  Expressive WBC (2024) → HOVER (2024) / HugWBC (2025) / ExBody2 (2024) / SONIC (2025)
       ↓
   ┌── 从 WBC / 扩散分出多条上行支线，最终都汇聚到 ⑨ ──┐
   │
   ├─ ⑤ 操作 Manipulation：         iDP3 (2024) → EgoMimic (2024) → HumDex (2026)
   │                                （3D 扩散策略 / 自我中心视频 / 灵巧手）
   │
   ├─ ⑥ 移动操作 Loco-Manipulation： HOMIE (2025) → ULTRA (2026) → Ψ₀ (2026)
   │                                （外骨骼遥操作 → 多模态全身控制 → loco-manip 基础模型）
   │
   └─ ⑦ 世界模型 World Model：       Cosmos (2025) → DreamDojo (2026) → 1X World Model (2025)；HAIC (2026)（动力学感知 WM）
            ↓（世界模型"会做梦"预测未来 / 动力学，再升级为可直接当策略的模型）
       ⑧ 世界-动作模型 WAM：         DreamZero (2026)（World Action Models are Zero-shot Policies）
       ↓
⑨ 【基础模型终点 (VLA / BFM)】   ← 一路从 PPO 爬到这里
  VLA：GR00T N1 (2025)                  ── 视觉-语言-动作，端到端通才策略
  BFM：Behavior Foundation Model (2025) ── 行为基础模型 / 全身控制先验

【Sim-to-Real 工程层】  ← 横跨整个路线
  Domain Randomization (2017) → LCP (2024)
  ↑ sim环境随机化迁移        ↑ 动作平滑，替代低通滤波器
```

- **动作重定向单列一层**：精确模仿 / 风格学习 / 遥操作都依赖"人体动作 → 机器人可执行轨迹"的转换，重定向质量直接决定下游策略能学到什么动作。
- **从 WBC 上行到基础模型**：全身控制把底层技能 / 扩散策略落到整机关节后，分出操作、移动操作、世界模型等支线，最终都汇聚到 VLA（GR00T N1）与 BFM（行为基础模型）这一顶点。

### 基础强化学习 · 官方源码 / MimicKit

笔记涉及的算法，**如果**在 [MimicKit](https://github.com/xbpeng/MimicKit)（xbpeng 的运动模仿框架，支持 Isaac Gym / Isaac Lab / Newton）中有官方实现，会附「📁 MimicKit 源码对照」章节，含关键代码块、YAML 配置与训练 / 测试命令。下表中 ✅ 表示已被 MimicKit 覆盖，❌ 表示有独立官方仓库、不在 MimicKit 内。

| 论文 | 官方源码 | MimicKit | 核心实现 / 入口 |
|------|----------|:--------:|-----------------|
| PPO | [openai/baselines](https://github.com/openai/baselines/tree/master/baselines/ppo2) | ✅ | `mimickit/learning/ppo_agent.py` |
| AWR | [xbpeng/awr](https://github.com/xbpeng/awr) | ✅ | `mimickit/learning/awr_agent.py` |
| DeepMimic | [xbpeng/MimicKit](https://github.com/xbpeng/MimicKit) | ✅ | `mimickit/envs/deepmimic_env.py` + `ppo_agent.py` |
| AMP | [nv-tlabs/ASE](https://github.com/nv-tlabs/ASE)（含 AMP） | ✅ | `mimickit/learning/amp_agent.py` |
| ASE | [nv-tlabs/ASE](https://github.com/nv-tlabs/ASE) | ✅ | `mimickit/learning/ase_agent.py` |
| ADD | [xbpeng/MimicKit](https://github.com/xbpeng/MimicKit) | ✅ | `mimickit/learning/add_agent.py` |
| LCP | [zixuan417/smooth-humanoid-locomotion](https://github.com/zixuan417/smooth-humanoid-locomotion) | ✅ | `mimickit/learning/lcp_agent.py` |
| PHC | [ZhengyiLuo/PHC](https://github.com/ZhengyiLuo/PHC) | ❌ | `phc/learning/amp_network_pnn_builder.py`（独立仓库） |
| CALM | [NVlabs/CALM](https://github.com/NVlabs/CALM) | ❌ | IsaacGym 独立实现，不在 MimicKit |
| PULSE | [ZhengyiLuo/PULSE](https://github.com/ZhengyiLuo/PULSE) | ❌ | `phc/learning/amp_network_z_builder.py`（基于 PHC 扩展） |
| Diffusion Policy | [columbia-ai-robotics/diffusion_policy](https://github.com/columbia-ai-robotics/diffusion_policy) | ❌ | 视觉模仿学习框架，与 MimicKit 定位不同 |
| BeyondMimic | [HybridRobotics/whole_body_tracking](https://github.com/HybridRobotics/whole_body_tracking)（训练）· [motion_tracking_controller](https://github.com/HybridRobotics/motion_tracking_controller)（部署） | ❌ | Isaac Lab + RSL-RL；引导扩散部分尚未单独开源 |
| Domain Randomization | 无官方代码，可参考 [matwilso/domrand](https://github.com/matwilso/domrand) | N/A | 作为通用技术体现在各 env 的 `events` 中 |
| MimicKit | [xbpeng/MimicKit](https://github.com/xbpeng/MimicKit) | ✅ | 框架本身，汇总上表 ✅ 项 |

### ⭐ 高影响力精选

主线之外的重点补充阅读，按子模块与发表时间（旧→新）排列，跟踪进度见 [PROGRESS.md](papers/PROGRESS.md)：

- **全身控制核心**：[Expressive WBC](https://arxiv.org/abs/2402.16796) · [HOVER](https://arxiv.org/abs/2410.21229) · [ExBody2](https://arxiv.org/abs/2412.13196) · [UH-1](https://arxiv.org/abs/2412.14172) · [HugWBC](https://arxiv.org/abs/2502.03206) · [SONIC](https://arxiv.org/abs/2511.07820)
- **遥操作与模仿学习**：[OmniH2O](https://arxiv.org/abs/2406.08858) · [iDP3](https://arxiv.org/abs/2410.10803) · [HOMIE](https://arxiv.org/abs/2502.13013)
- **行走经典**：Learning Quadrupedal Locomotion · [Real-World Humanoid Locomotion](https://arxiv.org/abs/2303.03381) · [Locomotion as Next Token Prediction](https://arxiv.org/abs/2402.19469) · [Humanoid Parkour](https://arxiv.org/abs/2406.10759) · [15-Minute Sim-to-Real](https://arxiv.org/abs/2512.01996) · [ECO](https://arxiv.org/abs/2602.06445)
- **仿真到现实与基座模型**：[Agile Motor Skills (ANYmal)](https://arxiv.org/abs/1901.08652) · [ASAP](https://arxiv.org/abs/2502.01143) · [GR00T N1](https://arxiv.org/abs/2503.14734) · [Behavior Foundation Model](https://arxiv.org/abs/2509.13780)
- **仿真平台与工具**：[Humanoid-Gym](https://arxiv.org/abs/2404.05695) · [BEHAVIOR Robot Suite](https://arxiv.org/abs/2503.05652) · Isaac Lab · [ProtoMotions3](https://arxiv.org/abs/2409.14393)

## 笔记说明

每篇笔记结构统一，兼顾深度理解与面试准备：

- **正文**：基本信息 → 一句话总结 → 英文缩写速查 → 问题背景（生活化类比）→ 方法详解（公式 / 图表）→ 具体实例（数值走通）→ 工程价值 →（可选）MimicKit 源码对照 → 面试高频 Q&A → 讨论记录。
- **附录**（按需）：算法变体、Loss 完整拆解、网络架构、超参数速查表、训练可视化、实验结果、相关工作。

## 项目结构

```
papers/          # 论文笔记，按方向分 14 个目录（01_基础RL … 14_人体运动）
                 # 另含 PROGRESS.md（全量进度表）与 todos/（开发待办）
scripts/         # prepare_pages.py 等预处理 / 部署脚本
_data/ _includes/ _layouts/ assets/   # Jekyll 站点数据、模板与样式
_config.yml      # Jekyll 配置（baseurl = /Robot_Learning_Paper_Notebooks）
```

> 协作与工程规范（Spec/TDD、Code Review、站点构建与截图验收等）见 [AGENTS.md](AGENTS.md)。
