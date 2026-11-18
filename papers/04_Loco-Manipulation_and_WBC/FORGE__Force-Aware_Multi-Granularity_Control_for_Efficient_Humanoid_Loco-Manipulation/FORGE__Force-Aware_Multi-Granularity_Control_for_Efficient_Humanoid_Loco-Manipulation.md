---
layout: paper
title: "FORGE: Force-Aware Multi-Granularity Control for Efficient Humanoid Loco-Manipulation"
zhname: "FORGE：面向高效人形移动操作的力感知多粒度控制"
category: "全身控制"
arxiv: "2611.17142"
original_check: done
original_check_date: 2026-11-18
original_check_scope: "arXiv HTML v1 正文 I–V 节、公式 (1)–(6)、表 I–V；项目页；官方仓库训练/评估脚本、任务注册、环境及配置入口；PDF 未独立逐页核对，未运行代码"
---

# FORGE: Force-Aware Multi-Granularity Control for Efficient Humanoid Loco-Manipulation
**用同一个全身策略接受导航速度、落脚点、双腕位姿和可选接触力指令；冻结行走先验，通过非对称残差与无腕部力传感器的混合力估计实现精细移动操作。**

> 📅 总结日期：2026-11-18
>
> 🏷️ 板块：04 Loco-Manipulation and WBC · 力感知 · 残差强化学习 · 人形机器人
>
> 🔁 独立轮转：14_Human_Motion → **04_Loco-Manipulation_and_WBC**；下次 05_Locomotion

## 📋 基本信息

| 项目 | 内容 |
|---|---|
| 中文标题 | FORGE：面向高效人形移动操作的力感知多粒度控制 |
| 英文标题 | FORGE: Force-Aware Multi-Granularity Control for Efficient Humanoid Loco-Manipulation |
| 作者 | Liangjun Xing、Ke Fan、Kailin Li、Bin Wang、Xiaojie Niu、Qingwei Ben、Jiafei Cao、Wei Yao、Yebin Liu、Jingbo Wang、Weinan Zhang |
| 机构 | 上海人工智能实验室、清华大学、浙江大学、上海交通大学、香港中文大学 |
| 发表 | 2026-11-12 首次提交；arXiv 预印本 v1 |
| 论文 | [arXiv](https://arxiv.org/abs/2611.17142) · [HTML v1](https://arxiv.org/html/2611.17142v1) · [PDF](https://arxiv.org/pdf/2611.17142) |
| 项目 | [FORGE 官方项目页](https://bb0928.github.io/forge/) |
| 代码 | [bb0928/FORGE](https://github.com/bb0928/FORGE)；已核对公开训练/评估入口与任务环境，**未运行** |
| 核验 | **HTML：已逐节阅读正文 I–V、方法/实验与表 I–V；PDF：链接可见但未独立逐页核对；源码：已读入口及环境结构，未完成全仓库代码审计** |

## ❓ 研究问题

人形机器人移动操作既要稳定行走，又要精确定位脚和手腕，还要在持续接触时避免用刚性位置目标挤压物体。只跟踪完整人体动作参考难以表达任务空间中的精细目标；简单拆成行走与上肢两个控制器又会损失身体协同。FORGE 尝试在**一个 29 维动作空间**中同时覆盖粗粒度导航与精粒度力接触。

## 🔧 核心方法

1. **四组可组合指令**：Navigation（底盘速度）、Stance（左右足平面目标）、Pose（左右腕 SE(3) 位姿）、Force（可选的期望施力）。训练时按组采样激活掩码，**同时屏蔽未激活组的观测与奖励**，避免旧目标互相干扰。部署只需要骨盆相对双腕目标、粗指令和本体状态，不需要完整人体关节轨迹。
2. **策略网络**：6 帧可观测历史，经共享 MLP、两层 Transformer（128 维隐状态）和 adaptation encoder，输出 29 维动作。辅助解码器预测 6 维力估计修正；训练期还有腕位置和机身速度的辅助监督，仿真特权力仅用于监督，不输入部署策略。
3. **混合无传感器力估计**：对双臂 14 个关节用动量观测器从关节状态、重力/摩擦模型和**重构的低层 PD 力矩**估计扰动；通过腕雅可比投影为腕等效平动力。网络学习仿真接触力相对观测器的残差，得到 `f_hat = f_observer + delta_f`。
4. **准静态虚拟目标**：定义环境反作用力与期望机器人施力的平衡误差 `e_f = f_env_hat + f_cmd`，按论文式 (5) 生成 `p_virtual = p_nominal + K_f^(-1) e_f`。这是**低频、腕等效三维力**的目标偏置，不是六维力矩传感、动态阻抗控制或精确力跟踪保证。
5. **冻结行走先验 + 非对称残差**：先训练 15 维下肢行走专家并冻结；残差策略同时输出下肢小幅修正与 14 维上肢动作：`a = [a_base_leg + delta_a_leg; delta_a_arm]`。限制下肢探索标准差为 0.2，上肢为 1.0，避免操控任务破坏行走稳定性。

### 方法流程图（论文 Fig. 2–3、III 节）

<div class="mermaid">
flowchart TD
    A["Navigation / Stance / Pose / Force 指令"] --> B["激活掩码：关闭非当前指令及奖励"]
    B --> C["6 帧可观测历史 + MLP / Transformer"]
    D["关节状态 + 重构 PD 力矩"] --> E["双臂动量观测器"]
    E --> F["腕雅可比投影"]
    C --> G["Adaptation Encoder：力残差"]
    F --> H["混合腕等效力估计"]
    G --> H
    H --> I["与期望施力比较"]
    I --> J["准静态虚拟腕目标修正"]
    J --> C
    K["冻结下肢行走专家"] --> L["下肢基准动作"]
    C --> M["非对称残差策略：下肢小残差 + 上肢动作"]
    L --> N["合成 29 维全身动作"]
    M --> N
    N --> O["关节目标 / 机器人交互"]
    O --> D
</div>

### 官方源码运行时序图（已核对的公开入口）

以下是**已读脚本的调用路径**，不是实际运行日志；真实机器人部署脚本在仓库 README 中仍标为未开源。

<div class="mermaid">
sequenceDiagram
    participant S as scripts/train_stage2_residual.sh
    participant T as legged_gym/scripts/train.py
    participant R as task_registry
    participant E as LeggedRobotEEResidual
    participant P as PPO Runner
    S->>T: --task g1_ee_residual --num_envs 4096 --base_model_path model_17000.pt
    T->>R: make_env(task)
    R->>E: 初始化 Isaac Gym 环境及配置
    T->>R: make_alg_runner(env, task)
    R-->>T: ppo_runner, train_cfg
    T->>P: learn(max_iterations, init_at_random_ep_len=True)
    loop 训练采样和 PPO 更新
        P->>E: step(actions)
        E-->>P: observations, rewards, dones, infos
    end
    Note over S,P: 评估入口 scripts/test_res_pf.sh 调用 legged_gym/scripts/play_res.py
</div>

已核对源码：[训练 shell](https://github.com/bb0928/FORGE/blob/main/scripts/train_stage2_residual.sh)、[评估 shell](https://github.com/bb0928/FORGE/blob/main/scripts/test_res_pf.sh)、[train.py](https://github.com/bb0928/FORGE/blob/main/legged_gym_repo/legged_gym/scripts/train.py)、[play_res.py](https://github.com/bb0928/FORGE/blob/main/legged_gym_repo/legged_gym/scripts/play_res.py)、[任务注册](https://github.com/bb0928/FORGE/blob/main/legged_gym_repo/legged_gym/envs/__init__.py)、[残差环境](https://github.com/bb0928/FORGE/blob/main/legged_gym_repo/legged_gym/envs/g1/legged_robot_ee_residual.py)、[配置](https://github.com/bb0928/FORGE/blob/main/legged_gym_repo/legged_gym/envs/g1/g1_29dof_ee_residual_config.py)。训练脚本实际设定 **4096 env**，论文报告的训练设置是 **2048 env**，应区分仓库当前脚本默认值与论文实验配置；未确认二者的版本差异原因。

## 📊 实验与贡献（论文原文表 I、III–V）

| 评估 | FORGE | 对照 / 范围 | 说明 |
|---|---:|---|---|
| 命令到腕到达延迟 | **22 ms** | HOMIE 27、TWIST2 197、SONIC 252 ms | 20 次硬件试验/方法；**不是纯神经网络推理延迟** |
| 腕位置平均误差 | **4.15 cm** | TWIST2 7.76、SONIC 6.42 cm | 硬件目标跟踪 |
| 脚平面位置平均误差 | **5.42 cm** | TWIST2 7.87、SONIC 7.35 cm | 硬件目标跟踪 |
| 同目标夹箱接触力 | **8.52 N** | HOMIE 15.48、TWIST2 17.16、SONIC 15.32 N | **仿真**下平均法向挤压力；越小仅表示该测试更少挤压 |
| 混合力估计 RMSE | **0.81 / 1.97 / 0.87 N** | x/y/z 轴 | 论文表 IV 的代表性分级加载轨迹；非全部工况平均 |
| 跨负载箱体搬运 | **20/20、20/20、18/20、18/20** | 空箱 / 0.5 / 1 / 2 kg | 统一 Diffusion Policy，320 条示范，每负载 20 次硬件试验 |

移除指令掩码后，仿真有效 rollout 从 **19.46±0.52 s** 降到 **15.69±1.32 s**，腕 MPE 从 **0.079±0.004 m** 增至 **0.115±0.003 m**（表 III）。这些数值来自作者实验，尚未独立复现。

## 🧮 具体实例：从期望力到虚拟腕目标

以论文式 (5) 和论文设置 `K_f=200 N/m` 为例。假设单腕希望沿世界 x 轴**向物体施加 +10 N**，则平衡所需环境反作用力是 `-10 N`。如果混合估计器此刻估得环境反作用力为 `-6 N`，那么该轴的误差为 `e_f = (-6) + (+10) = +4 N`；虚拟目标偏移为 `delta_p = 4/200 = +0.02 m`，即沿该轴增加 **2 cm** 的腕位置目标。若估计反作用力恰好是 `-10 N`，误差为零，虚拟目标回到名义位置。

这只是**根据论文公式构造的教学算例**，不是原文的一组实测数据；正负号依赖世界坐标轴定义，且该控制律适用于文中持续、准静态接触。估计器的 50 N 限幅与平滑作用在估计力上，不应误写成虚拟位置偏移本身的硬限幅。策略以 **50 Hz** 更新，对应一个策略周期 **20 ms**；这个周期也不能与表 I 的端到端目标到达延迟 22 ms 混为一谈。

## ⚠️ 局限与阅读骨架

- **问题**：同时实现稳定移动、精确腕足定位和接触自适应。
- **方法**：多粒度指令掩码、动量观测器 + 学习修正、准静态虚拟目标、冻结下肢专家与非对称残差 PPO。
- **结果**：作者报告硬件跟踪与端到端搬运有效；仿真中掩码与残差先验有助于稳定训练。
- **局限**：力估计主要针对腕等效**低频平动力**；臂简化模型遗漏全身耦合；更高外力的误差增大（35/40/50 N 竖直外力 RMSE 分别为 8.28/9.66/12.35 N）；下游验证只覆盖特定箱体搬运任务与 0–2 kg 负载；仓库当前未开放底层先验训练及实机部署脚本。
- **阅读重点**：式 (1)–(3) 动量观测与雅可比投影、式 (4) 残差监督、式 (5) 虚拟目标符号约定、式 (6) 冻结行走先验与上下肢动作合成。

## 📚 核验记录

2026-11-18：核对 [arXiv v1 正文](https://arxiv.org/html/2611.17142v1) 的 I–V 节、公式和表 I–V；核对 [官方项目](https://bb0928.github.io/forge/) 和 [官方 GitHub](https://github.com/bb0928/FORGE) 的 README、训练/评估 shell、任务注册、训练入口、环境与配置入口。PDF 可从官方 arXiv 下载但本次未独立逐页校对；源码**已静态审阅上述关键入口，未执行训练/评估、未复现指标**。健康度只以仓库实际脚本报告为准。
