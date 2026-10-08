---
layout: paper
paper_order: 50
title: "ZEST: Zero-shot Embodied Skill Transfer for Athletic Robot Control"
zhname: "ZEST：动捕 / 视频 / 动画一锅炖，跨形态零样本迁移到 Atlas、G1、Spot"
category: "Loco-Manipulation and WBC"
---

# ZEST: Zero-shot Embodied Skill Transfer for Athletic Robot Control
**ZEST：面向敏捷机器人控制的零样本跨形态技能迁移**

> 📅 阅读日期: 2026-05-14
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 运动模仿 · 跨形态迁移 · Sim-to-Real

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.00401](https://arxiv.org/abs/2602.00401) |
| HTML | [在线阅读](https://arxiv.org/html/2602.00401v1) |
| PDF | [下载](https://arxiv.org/pdf/2602.00401) |
| 项目主页 | 暂未释出（参考 [The AI Institute](https://theaiinstitute.com/)） |
| 视频解读 | [YouTube AI Podcast](https://www.youtube.com/watch?v=HDv2RJ5pUeY) |
| **发布时间** | 2026-01-30 (arXiv) |
| 源码 | 截至论文发布暂未公开 |
| 提交日期 | 2026-02 |

**机构**：The AI Institute（前 Boston Dynamics AI Institute / RAI Institute），与 Boston Dynamics 合作

**机器人**：Boston Dynamics **Atlas** (humanoid) · Unitree **G1** (humanoid) · Boston Dynamics **Spot** (quadruped)

---

## 🎯 一句话总结

ZEST 把"**异质来源的动作参考（高保真动捕 + 噪声单目视频 + 物理无约束的动画）→ 一个极简的 RL 模仿管线 → 同一组超参 → 零样本部署到 Atlas / G1 / Spot**"打通成一条流水线，**不需要接触标注、不需要参考观测窗口、不需要状态估计器、不需要繁琐的 reward shaping**，就能让 Atlas 学会陆军匍匐、霹雳舞、爬箱子，让 Spot 通过动画学会连续后空翻。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| ZEST | Zero-shot Embodied Skill Transfer | 跨载体的零样本技能迁移 |
| MoCap | Motion Capture | 高保真动作捕捉数据 |
| RL | Reinforcement Learning | 模仿+RL 训练策略的标准范式 |
| Domain Randomization | 域随机化 | 仿真里扰动质量、摩擦、传感延迟，提升 sim-to-real 鲁棒性 |
| Assistive Wrench | 辅助力旋量 | 训练初期由模型计算并施加在机器人身上的"训练辅轮力" |
| Adaptive Sampling | 自适应采样 | 把训练资源集中到失败率高的动作片段上 |

---

## ❓ 论文要解决什么问题？

让人形 / 足式机器人做"运动员级别"的高动态动作，过去的范式通常陷入三类障碍：

1. **数据来源单一**：要么纯靠动捕（贵 & 难覆盖野外动作），要么纯靠视频（噪声大、缺三维），要么纯靠动画（物理不可行）。
2. **管线繁琐**：标注每一帧的接触脚序列、构造长长的参考观测窗口、为每个技能精雕 reward / 调一组超参。
3. **跨载体不可迁移**：Atlas 学会的策略基本不能套到 G1，更别说和四足 Spot 共用配方。

**ZEST 的目标**：用 *同一个* 极简模仿框架吃下所有这些异质参考、训完一次就能在多种机器人上零样本部署，且每个机器人只用 *同一组* 超参数。

---

## 🔧 方法拆解：ZEST 的极简配方

### 1. 统一参考动作接口

- **MoCap**：直接拿 SMPL/AMASS 风格的高保真关节序列。
- **单目视频**：用现成的 3D 人体姿态估计抽出动作序列，**接受其噪声**，不再做精细清洗。
- **动画**：来自艺术创作，**不要求物理可行**（例如让 Spot 后空翻的动画就是手 K 的）。

三种来源被映射到相同的 *目标位姿轨迹* 接口，作为 RL 训练的参考信号。**没有接触标注、没有相位变量、没有滑窗观测**。

### 2. 极简策略与奖励

- **网络**：一个简单的前馈 MLP（不用 RNN/Transformer），输入只用本体感知（关节、IMU、上一动作），不依赖外部状态估计器。
- **奖励**：仅由"目标位姿跟踪 + 物理稳定性正则"构成；**砍掉了大量任务特定 reward shaping**。

### 3. 自适应采样（Adaptive Sampling）

- 训练过程中持续记录 *每个动作片段的失败率*。
- 高失败率片段会被**重采样**到 batch 里，使训练资源自动倾向于"难段"（比如霹雳舞的支撑切换、爬箱子的高接触段）。
- 直观上等价于"自动课程"，但不需要手工切分阶段。

### 4. 模型驱动的辅助力课程（Assistive Wrench Curriculum）

- 训练初期，给机器人施加一个由模型估计的 *辅助力旋量*（assistive wrench），相当于"训练辅轮"——稳住躯干 / 抵消重力。
- 随着策略变强，辅助力按课程**渐进退火到 0**，最终策略完全靠自己。
- 这是 ZEST 让 Spot 学会连续后空翻的关键：纯 RL + 动画参考几乎不可能直接收敛，靠 wrench 课程才把"绝望区域"拓出可学路径。

### 5. 同一组超参 × 中等域随机化

- 训练完全在仿真里完成，使用 *中等强度* 的域随机化（关节摩擦、电机延迟、惯量噪声、传感器噪声）。
- **每个机器人**（Atlas / G1 / Spot）使用 *同一套超参*，不针对动作微调；**跨机器人**只需替换 URDF 与执行器模型。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph SRC["🎬 异质动作参考"]
        S1["🎯 高保真动捕 MoCap"]
        S2["📹 噪声单目视频<br/>(3D 姿态估计)"]
        S3["🎨 物理无约束动画"]
    end

    subgraph PIPE["🧪 ZEST 极简训练管线"]
        P1["统一目标位姿接口<br/>(无接触标注 / 无相位)"]
        P2["前馈 MLP 策略<br/>仅本体感知输入"]
        P3["跟踪 + 稳定性 奖励<br/>(无任务特定 shaping)"]
        P4["自适应采样<br/>聚焦失败段"]
        P5["辅助力旋量课程<br/>(Wrench Curriculum)"]
        P1 --> P2
        P3 --> P2
        P4 --> P2
        P5 --> P2
    end

    subgraph SIM["🧱 仿真训练"]
        I1["中等域随机化<br/>(摩擦/延迟/噪声)"]
        I2["同一组超参<br/>(per robot)"]
        I1 --> I2
    end

    subgraph DEPLOY["🤖 零样本部署"]
        D1["Boston Dynamics Atlas<br/>陆军匍匐 / 霹雳舞 / 爬箱"]
        D2["Unitree G1<br/>表达性舞蹈 / 视频技能"]
        D3["Boston Dynamics Spot<br/>连续后空翻 (动画)"]
    end

    SRC --> PIPE
    PIPE --> SIM
    SIM -->|"前馈 MLP π"| DEPLOY

    style SRC fill:#fff7e0,stroke:#d4a017
    style PIPE fill:#e8f4fd,stroke:#1f78b4
    style SIM fill:#fdebd0,stroke:#e67e22
    style DEPLOY fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **多源数据等价化**：用同一接口同时吃 MoCap / 视频 / 动画，**不再为不同数据源造不同管线**。
2. **极简策略 / 极简奖励**：前馈 MLP + 仅本体感知输入 + 跟踪 + 稳定性奖励，把工程负担降到最低。
3. **自适应采样 + 辅助力课程**：两个轻量训练技巧，让长程、高动态、多接触动作（霹雳舞 / 后空翻）也能可靠收敛。
4. **跨载体一致配方**：同一组超参在 Atlas / G1 / Spot 上都成立，验证了"配方而非模型架构"的迁移能力。
5. **零样本上硬件**：仿真训完直接部署到三种真实机器人，覆盖人形 + 四足，覆盖动捕 / 视频 / 动画三类参考。

---

## 📊 实验亮点

| 机器人 | 参考来源 | 代表技能 |
|---|---|---|
| Atlas | MoCap | 陆军匍匐、霹雳舞 |
| Atlas | 单目视频 | 表达性舞蹈、爬箱 |
| Unitree G1 | 单目视频 | 表达性舞蹈、与场景交互 |
| Spot | 动画 | **连续后空翻** |

- 全部为 **真机零样本** 部署，无在线微调、无现场再训。
- 同一机器人下，多种动作共享同一套超参数 / 奖励。
- 跨形态（人形 ↔ 四足）只换 URDF + 执行器模型即可适配。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **数据收集** | 视频和动画也能直接拿来当训练参考，**显著降低动捕硬性依赖** |
| **训练范式** | 证明了"极简管线 + 两个轻量训练技巧"足以达到运动员级别动作，可作为 motion-imitation 的新基线 |
| **跨载体** | 同一配方贯穿 Atlas / G1 / Spot，意味着 sim-to-real 的关键不在网络结构，而在**数据接口 + 训练课程** |
| **工程价值** | 不写任务 reward、不调任务超参，新增技能成本极低，适合工业 / 表演场景的快速迭代 |

---

## 🎤 面试参考

**Q：和 DeepMimic / AMP 等动作模仿方法相比，ZEST 的核心差异是什么？**  
A：DeepMimic 强依赖高保真动捕 + 接触相位 + 滑窗参考；AMP 用判别器风格奖励但仍倾向单源数据。ZEST 把所有源（MoCap / 视频 / 动画）抽象到同一个"目标位姿"接口，**砍掉接触标注、相位变量、参考观测窗口、状态估计器和任务 reward**，只靠跟踪 + 稳定性奖励 + 自适应采样 + 辅助力课程把高动态动作训出来。

**Q：动画里 Spot 的后空翻在物理上根本不可行，怎么训出来的？**  
A：关键是 *Assistive Wrench* 课程。训练早期模型施加一个估计的辅助力旋量帮机器人"撑过"那些物理上极难的瞬间，给策略一个稳定的探索基线；随着学习推进，辅助力按课程退火到 0。终态策略完全自力更生，但中间过程靠"训练辅轮"才走出梯度。

**Q：为什么不用 RNN / Transformer 学历史，而是只用前馈 MLP？**  
A：作者强调极简——本体感知本身已经包含足够多的瞬时信息（角速度、姿态、关节速度），加上前一动作就能形成基本时序约束。前馈 MLP **部署延迟更低、SIM2REAL 鲁棒性更可控**，也避免了 RNN 在长动作中的状态漂移问题。

**Q：自适应采样和"按相位/按课程切片"的传统做法有什么区别？**  
A：传统做法需要人工把动作分阶段（起跳、空中、落地等）并手工设权重；自适应采样基于**实时失败率**自动重采样，不需要任何先验分段，对动捕 / 视频 / 动画三种来源都一视同仁。

**Q：跨形态（人形 ↔ 四足）真的只换 URDF 吗？**  
A：本质上是。前提是参考动作已经被映射到目标机器人的关节空间，且该机器人的执行器模型在仿真里被合理建模。ZEST 没有为 Spot 重新设计奖励或网络架构，只调整了执行器参数和动作参考的重定向，这恰好是论文想强调的"配方比模型重要"。

---

## 🔗 相关阅读

- [DeepMimic (1804.02717)](https://arxiv.org/abs/1804.02717)：动作模仿的奠基（仿真角色）
- [AMP: Adversarial Motion Priors (2104.02180)](https://arxiv.org/abs/2104.02180)：用判别器替代逐帧跟踪
- [PHC: Perpetual Humanoid Control (2305.06456)](https://arxiv.org/abs/2305.06456)：跨大规模动作的统一控制器
- [HumanX (2602.02473)](https://arxiv.org/abs/2602.02473)：同期"视频→人形技能"思路，可与 ZEST 互为参考
- [TTT-Parkour (2602.02331)](https://arxiv.org/abs/2602.02331)：sim-to-real 的另一条路线（现场 TTT）
