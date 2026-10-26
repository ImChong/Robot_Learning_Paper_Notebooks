---
layout: paper
title: "RoboQuest: Generalist Physical Agents that Search, Inspect and Test"
zhname: "RoboQuest：会搜索、检查与试探的通用物理智能体基准"
category: "Simulation Benchmark"
arxiv: "2610.10388"
---

# RoboQuest: Generalist Physical Agents that Search, Inspect and Test
**一个「信息不在画面里」的移动操作基准：十个厨房任务各藏一条关键信息（目标在哪、杯底贴什么、哪个包裹更重、插销的阻挡顺序……），机器人必须靠物理交互把它找出来，再自己决定什么时候按下 SUBMIT。五个前沿多模态模型零样本最好也只有 23.2% 成功率，单独测执行技能却有 72–81%，失败分析显示主要输在「没去看」和「看了没用上」，而不是手不稳**

> 📅 总结日期: 2026-10-25
>
> 🏷️ 板块: 11 Simulation Benchmark · 具身探索 · 主动感知 / 交互感知 · 移动操作 · 前沿多模态智能体 · π₀.₅ 微调基线 · RoboCasa365 · MuJoCo
>
> 🔁 推进轨: 模块轮转（10_Sim-to-Real → **11_Simulation_Benchmark**）· 取本模块尚无笔记的最新论文（2026.10）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.10388](https://arxiv.org/abs/2610.10388) |
| HTML | [arxiv.org/html/2610.10388v1](https://arxiv.org/html/2610.10388v1) |
| PDF | [下载 v1](https://arxiv.org/pdf/2610.10388v1) |
| 项目主页 | [declare-lab.github.io/RoboQuest](https://declare-lab.github.io/RoboQuest/) |
| 源码 | [declare-lab/RoboQuest](https://github.com/declare-lab/RoboQuest)（任务、评测 harness、打分、500 个评测实例的注册表与五个模型的 `results/eval50`；笔记对照的是 2026-10-09 的 `c2a1d3d`） |
| 数据集 | [declare-lab/RoboQuest（Hugging Face）](https://huggingface.co/datasets/declare-lab/RoboQuest)：5,000 条示范，LeRobot v2.1 格式 + 可回放的仿真记录 |
| **发布时间** | 2026-10-07（arXiv v1） |
| 许可 | 论文 CC BY-SA 4.0 |

**作者**：Liu Renhang, Navonil Majumder, Tej Deep Pala, Soujanya Poria（新加坡南洋理工大学 DeCLaRe Lab）

**平台**：RoboCasa365 厨房（MuJoCo），带移动底座的 Franka Panda（RoboCasa PandaOmron），20 Hz 控制，两台场景相机 + 一台腕部相机

---

## 🎯 一句话总结

RoboQuest 是一个把关键信息藏起来、逼机器人靠物理交互去找的移动操作基准。现有操作基准（LIBERO、ManiSkill3、RoboCasa 等）的关键信息基本都在画面里，考的是执行；RoboQuest 把完成任务所需的信息藏起来，只能通过物理交互获得——打开柜子、翻转方块、倾斜杯子读底部标签、拿天平称包裹、放个球看往哪滚——并且要机器人自己按下场景里的 SUBMIT 按钮来交卷。十个任务分「搜索 / 检查 / 试探」三类，各 50 个评测实例。GPT-6 Astra 总成功率 23.2%，其他三个强模型 11–14%，微调的 π₀.₅ 几乎为零；把隐藏信息直接告诉模型时，执行技能成功率有 72–81%。失败里「证据没拿到」和「决策错了」合计占 66–74%，执行失败只占 18–21%。

---

## 📌 英文缩写速查

| 缩写 / 术语 | 全称 | 解释 |
|---|---|---|
| SR | Success Rate | 按下 SUBMIT 那一刻所有目标条件都满足的回合占比 |
| Prog | Progress | 每个任务分阶段定义的部分得分（0–1），按回合结束时的状态算，失败回合也计 |
| SUBMIT | — | 场景里的红色实体按钮；第一次按下就冻结分数、结束回合 |
| Oracle | Scripted oracle | 读私有任务规格的脚本，生成示范；探索过程照「不知道答案」的方式写 |
| VLA | Vision-Language-Action | 视觉—语言—动作模型；这里的 π₀.₅ 没有显式记忆 |
| Inspect Robots | — | 评测框架（Robocurve），本文在其上搭统一的模型 harness |
| Missing evidence / Wrong decision / Side effect / Execution failure | — | 失败分析的四类：证据没拿到 / 拿到了没用对 / 动作成功但破坏了场景 / 动作执行失败 |

---

## ❓ 论文要解决什么问题？

1. **执行变强以后，瓶颈转移了**：前沿多模态模型已经能零样本直接当机器人策略，但在陌生环境里，「执行得好」不等于「完成任务」——关键信息可能根本不在当前观测里。
2. **现有基准考不到这一点**：标准操作基准是完全可观或一眼可知的；主动感知类基准只考挪相机视角、一步掀开遮挡、或记住历史。如果每个不确定性都有显而易见的一步解法，成功只说明智能体做了那个规定动作。
3. **真正要测的是「自己组织调查」**：决定去看哪里、用什么交互去揭示信息、每条新证据怎么改变下一步、什么时候证据已经足够可以交卷；而且探索本身会改变场景，有些动作不可逆（方块扔进箱子、墨印在最终板上、令牌锁进隔间）。

---

## 🔧 方法拆解（基准设计）

### 1. 十个任务、三类不确定性（第 3.1 节、表 2）

| 类别 | 任务 | 藏了什么 | 怎么揭示 |
|---|---|---|---|
| 搜索 Search | Locked Storage | 上锁隔间后的目标 | 找到能解锁每个隔间的彩色令牌 |
| | Search Room | 目标在哪 | 依次打开储物处直到找齐 |
| | Blackout Search | 黑暗里的目标 | 拿着灯，只看得见灯照到的地方 |
| 检查 Inspect | Painted Cubes | 看不见的面上的记号 | 把每个方块各面翻给相机看 |
| | Marked Mugs | 杯碗底部的标签 | 拿起或倾斜读底部（里面有球会洒） |
| | Unfamiliar Containers | 容器怎么打开 | 逐个尝试开启机构（含不开的假把手） |
| 试探 Test | Puzzle Box | 插销的阻挡顺序 | 试推插销、看哪个能动 |
| | Stamp Composition | 印章图案与朝向 | 先在测试板上试印 |
| | Wobbly Stand | 哪条腿短、缺多少 | 放一个球看往哪滚，再塞垫片 |
| | Odd Parcel | 哪个包裹重量不同 | 在天平上分组比较 |

- **环境**：RoboCasa365 厨房，物品分散在整个厨房，机器人要开着底座在各处之间移动；指令只给可验证的物理目标，不给调查方法，隐藏信息放在智能体拿不到的私有规格里。
- **实例**：由种子 + 主参数生成；种子决定厨房、布局、材质。五个任务还按遮挡分 Visible / Look（有物体在所有相机视野外）/ Uncover（有物体被盖住）。每任务 50 个评测实例，覆盖 18 种厨房布局、5 种风格。
- **交卷与打分**：只有物理按下 SUBMIT 才算交卷，成功当且仅当按下那一刻所有目标条件成立；一个单元错就整局失败，所以另设分阶段的 Progress。

### 2. 示范数据（第 3.2 节）

- 每任务一个脚本 oracle：它读私有规格以保证执行可靠，但**探索过程照没有答案的智能体来写**（就近开柜子直到看到目标、逐个倾斜杯子读标签、逐面翻方块、先试印再盖章、上天平称、塞完垫片再放球复查），否则示范直接走向答案，学不到探索。
- 5,000 条（每任务 500 条），共 366 小时、20 Hz，平均每条 4.4 分钟（Puzzle Box 1.6 分钟，Blackout Search 7.5 分钟）；每帧带「阶段 + 子任务」两级语言标注。
- 评测集留出厨房风格和部分任务配置（某些印章图案、插销链结构），训练出来的策略总是在没见过的场景上评测。

### 3. 三部分评测（第 4 节）

- **前沿模型零样本**（主线）：GPT-6 Astra、Claude Opus 5.5、GPT-6.1 Sol、Claude Fable 5.1（medium thinking）与 Gemini 3.8 Flash（high thinking），每个模型 500 回合。每次决策收到本体感受、已过的仿真时间、剩余决策数和三张 512×512 图，只能回一个工具调用：`ARM`（世界坐标下移动夹爪）、`BASE`（底座速度）、`WAIT`、`STOP`，每条命令最多跑 10 s 仿真时间；**没有定位或抓取的语义工具**。对话全程累积（含模型自己之前的推理），图像只保留最近两次观测；上限 200 次决策。
- **执行技能单测**：前三名模型在 8 个技能上各测 20 个场景，隐藏信息直接给出（写进指令，或场景里只放一个明确目标），把探索和执行分开。
- **学习策略基线**：在示范上 SFT 的 π₀.₅，三路相机 + 16 维本体感受 + 任务提示，预测子任务标签和 20 步动作块（20 Hz 下 1 s），损失是流匹配动作损失加因果子任务预测；在仿真里闭环重规划直到 SUBMIT 或超时。

### 4. 失败归因（第 5 节）

- 每个失败回合里每条没满足的要求算一个单元，按它自己路径上**第一个没修复的错误**归到四类之一；每个任务一组有序的确定性规则（隔间开过没有、物体出现在相机画面里没有、放下的东西是否落地……），第一条匹配的规则定类。
- 一个失败回合权重为 1，平分给它的各个单元。规则和每个单元的标签随基准发布。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph S0["0. 任务与实例"]
        K["RoboCasa365 厨房（MuJoCo）<br/>移动底座 Franka Panda · 20 Hz · 三台相机"]
        T["十个任务 · 三类不确定性<br/>搜索 / 检查 / 试探"]
        P["私有规格：隐藏信息<br/>（目标位置、底部标签、阻挡顺序……）"]
        I["种子 + 主参数 → 实例<br/>每任务 50 个评测实例 · 留出厨房风格"]
        K --> I
        T --> I
        P --> I
    end

    subgraph S1["1. 智能体回合"]
        OBS["观测：本体感受 + 剩余决策数 + 三张图"]
        ACT["一个工具调用<br/>ARM / BASE / WAIT / STOP"]
        SIM["物理仿真执行 ≤ 10 s"]
        EXP{"证据够了吗？"}
        SUB["物理按下 SUBMIT<br/>冻结分数"]
        OBS --> ACT --> SIM --> OBS
        SIM --> EXP
        EXP -- 否：继续探索 --> OBS
        EXP -- 是 --> SUB
    end

    subgraph S2["2. 评测"]
        SR["成功率 SR + 分阶段 Progress"]
        SK["执行技能单测<br/>隐藏信息直接给出"]
        FA["失败归因四类<br/>没拿到证据 / 决策错 / 副作用 / 执行失败"]
    end

    subgraph S3["3. 学习基线"]
        DEMO["脚本 oracle 示范 5,000 条<br/>366 h · 每帧两级子任务标注"]
        PI["SFT π₀.₅<br/>20 步动作块 + 子任务预测"]
        DEMO --> PI
    end

    I --> OBS
    SUB --> SR
    SR --> FA
    SK --> FA
    PI -->|openpi WebSocket| OBS
</div>

---

## 🚶 具体实例

### 例 1：一局 Puzzle Box 在考什么

指令只说「木盒的盖子能侧滑，但被几根带黑色圆把手的插销锁着；一个零件只有在没有东西挡住时才能动，自己想出顺序」。有盖板时看不见谁挡着谁，只能试推一根插销、看它动没动，再换下一根，直到盖子能滑开，取出橘子立在托盘里，松手，再按 SUBMIT。

把盖板去掉（阻挡关系直接看得见）做对照，链长 4 和 5 上（表 5 右）：

| 模型 | 无盖板 SR | 有盖板 SR | 决策数（无 / 有） |
|---|---|---|---|
| GPT-6 Astra | 94.4% | 96.4% | 120 / 85 |
| Claude Opus 5.5 | 94.4% | 36.8% | — |
| GPT-6.1 Sol | 72.2% | 60.1% | — |

Opus 5.5 在有盖板时掉得最多：它失败的 26 次里有 12 次是**同一根被挡住的插销拉三次以上而不更新计划**。这正是「试错学习」的能力，而不是执行能力。

### 例 2：执行不是瓶颈（表 3 vs 表 4）

- Opus 5.5 在技能单测里平均 81%，略高于 GPT-6 Astra 的 80%；但完整任务里 GPT-6 Astra 的成功率（23.2%）是 Opus 5.5（13.8%）的 1.7 倍。所以两者差距不在执行。
- 反过来，最难的单项技能「打开抽屉 / 柜门」单测只有 30–60%，在完整任务里尝试打开装有目标的隔间却有 75–90% 成功，平均决策数也更少（GPT-6 Astra 10 次 vs 单测 22 次）。论文推测是前面的步骤里机器人已经适应了控制方式。

### 例 3：失败的大头（图 5、表 17）

GPT-6 Astra / Opus 5.5 / GPT-6.1 Sol 的失败单元分别有 931 / 1143 / 1182 个：

| 失败类别 | 占比 |
|---|---|
| 证据没拿到 | 43 / 43 / 46% |
| 决策错 | 23 / 31 / 25% |
| 执行失败 | 21 / 19 / 18% |
| 副作用 | 13 / 7 / 12% |

- 约一半失败是「任务需要的物体从没放到位」，其中 27–29% 的物体一直在没打开的抽屉、柜子、盒子里——而那个藏身处通常在画面里出现过 5 次以上，从没被看到的藏身处只占 1–2%。看见了，但没去开。
- Odd Parcel 里选错的包裹有 71–84% 在称重之前就已经装箱；Marked Mugs 场景里本来给了一个空碗用来暂放球，50 局里只用了 2–8 次；球掉出去后 38 次补救只成功 4 次。

---

## 📊 关键结果

| 模型 | 总 SR | 总 Prog | 去掉 Puzzle Box 的 SR |
|---|---|---|---|
| GPT-6 Astra | **23.2** | **48.0** | **15.1** |
| Claude Opus 5.5 | 13.8 | 37.3 | 7.8 |
| GPT-6.1 Sol | 12.2 | 34.0 | 5.6 |
| Claude Fable 5.1 | 11.4 | 31.0 | 4.9 |
| Gemini 3.8 Flash | 2.0 | 9.2 | 0.9 |

- **两个开放搜索任务谁都做不了**：Blackout Search 没有任何一局成功，Search Room 只有 Gemini 3.8 Flash 成功过一局。Puzzle Box 是所有模型最容易的任务（GPT-6 Astra 96%），比各自第二好的任务高 44–58 个点。
- **唯一明显赢过 GPT-6 Astra 的格子**：Wobbly Stand，Opus 5.5 SR 24% vs 10%。
- **交卷方式**：两个 GPT 模型几乎总是按 SUBMIT，但只有 27% / 16% 的交卷是对的；Opus 5.5 更常自己 STOP，交卷时最准（30%）；没有一个模型是因为「做完了」而停下的。
- **成本**：五个模型 500 局总共 $21,352，从 GPT-6.1 Sol 的 $997 到 Fable 5.1 的 $9,610；GPT-6.1 Sol 每次成功最便宜。
- **π₀.₅ 微调基线**：只有 Puzzle Box 有 2.0% 成功（Progress 43.3%，能拔掉前几根插销但走不完整条依赖链），其余任务 0%、几乎零进度，多数超时。作者把原因归于分布外场景加上没有显式情景记忆，小的执行误差会滚雪球、陷入重复循环。

---

## 💡 核心贡献

1. **RoboQuest 基准**：十个以探索为核心的移动操作任务，信息只能通过物理交互获得，交卷靠物理按钮、由智能体自己决定。
2. **会探索的示范数据**：5,000 条脚本示范（366 h），探索过程照「不知道答案」来写，每帧有两级子任务标注，脚本可以继续生成更多。
3. **系统评测与归因**：五个前沿模型 + 微调 π₀.₅，加上执行技能单测和基于确定性规则的失败归因，把「执行」与「探索 / 决策」分开量化。

---

## 🤖 对人形机器人领域的意义

- 平台是轮式底座的 Franka，不是人形；但它测的是上层能力——当 VLA / 大模型负责「看哪里、试什么、何时收手」时会怎样失败。人形 loco-manipulation 走向开放环境时同样会碰到这类信息缺失。
- 结论对系统设计有直接指向：给智能体更强的执行技能收益有限，更需要的是**探索覆盖的自检**（还有哪些藏身处没开）、**证据充分性判断**（在称重前不要装箱）和**对副作用的预防**（倒球前先找个碗）。
- 记忆的作用很突出：无记忆的 π₀.₅ 在需要多步假设检验的任务上几乎全军覆没，而保留完整对话的前沿模型能做一部分。
- 局限：只在仿真里；动作接口是末端位姿与底座速度，不涉及全身控制；示范来自脚本 oracle，探索策略比较固定。

---

## 🛠️ 源码运行时序图（`declare-lab/RoboQuest`）

按 README 与 `scripts/run_benchmark.py`、`roboquest/harness/episode_runner.py`、`roboquest/harness/agent.py`（`run_policy_trial`）、`roboquest/harness/openpi_trial.py` 整理。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant BS as bootstrap_*.sh
    participant BM as benchmark.sh / run_benchmark.py
    participant EP as run_episode.py → episode_runner.run_episode
    participant AD as 任务 adapter（RoboCasa365 + MuJoCo，EGL 渲染）
    participant AG as 智能体（API 模型 / CLI 智能体 / openpi 策略服务）
    participant SC as 打分（roboquest/scoring）

    U->>BS: bootstrap_simulator.sh（uv · Python 3.11 · MuJoCo / robosuite / RoboCasa 固定版本 + 厨房资产）
    U->>BS: bootstrap_agent.sh（Inspect Robots 固定版本）
    U->>U: scripts/run.sh scripts/smoke.py（所有任务能构建）
    U->>BM: --model provider/id --env-file keys.env
    BM->>BM: plan_episodes：suite/v1 各任务的 registry 里取 50 个评测实例 × 10 任务
    loop 每个实例（--max-parallel 个并行，每局约 2 GB 显存）
        BM->>EP: 子进程 run_episode.sh --task roboquest_任务@实例
        EP->>EP: 写 config.json、system-prompt.txt、tool-schemas.json、instruction.txt
        EP->>AD: construct_adapter(scene, seed) → reset()，保存 initial-*.png
        loop 每次决策（≤ 200 次）
            AD-->>AG: 观测包：本体感受、仿真时间、剩余决策数、三张图（只留最近两次）
            AG-->>EP: 一个工具调用 ARM / BASE / WAIT / STOP（≤ 200 tick）
            EP->>AD: adapter.execute(command)，逐 tick 写 physical-trace-private.jsonl 与 rollout.mp4
            AD-->>EP: 是否 episode_ended（第一次按下 SUBMIT 即结束）
        end
        EP->>SC: adapter.score()：按下 SUBMIT 时的目标状态 + 分阶段 progress
        SC-->>EP: result.json、task-progress.json
    end
    BM->>BM: summarize：每任务 SR 与平均 Progress 表

    Note over AG,AD: 策略模式：openpi WebSocket 发三路 256×256 图 + 16 维状态 + 目标文本，<br/>收回 N × 12 的 PandaOmron 动作块，按 20 Hz 一 tick 一个执行，<br/>上限 36,000 tick（30 分钟仿真时间），记录 inference.jsonl
    U->>EP: verify_replay.py --one 回合目录：用录下的模型回复重跑，逐项比对请求、命令、物理与分数
</div>

---

## 🎤 面试参考

**Q：RoboQuest 和普通「部分可观」基准有什么不同？**
A：它要求的不只是掀开一个遮挡或换个视角，而是自己组织多步调查：不同交互揭示不同证据，证据要跨多次交互积累，探索本身会改变（甚至不可逆地破坏）任务状态，而且由智能体自己决定什么时候证据够了、按下 SUBMIT。

**Q：怎么证明失败不是因为执行太差？**
A：两条证据。一是技能单测：把隐藏信息直接给出，三个强模型 8 项技能平均 72–81%；而且 Opus 5.5 单测略高于 GPT-6 Astra，完整任务却只有它的约六成。二是失败归因：执行失败只占 18–21%，证据没拿到和决策错误合计 66–74%。

**Q：为什么示范要「假装不知道答案」？**
A：oracle 读私有规格，如果直接走向答案，示范里就没有探索行为，学出来的策略也不会探索。所以 oracle 只用规格保证执行可靠，探索顺序按无信息智能体来写（就近搜索、逐个检查、先试后做）。

**Q：π₀.₅ 为什么几乎完全失败？**
A：评测场景的厨房风格、材质、机构配置都是训练里没有的；π₀.₅ 没有显式情景记忆，需要多步假设检验的任务里，小的执行误差在分布外场景会累积，策略陷入重复循环或空等到超时。

---

## 🔗 相关阅读

- [RoboCasa365](../RoboCasa365__A_Large-Scale_Simulation_Framework_for_Training_and_Benchmarking_Generalist_Robots/RoboCasa365__A_Large-Scale_Simulation_Framework_for_Training_and_Benchmarking_Generalist_Robots.html)：RoboQuest 的厨房场景与机器人都来自它
- [RoboCasa](../RoboCasa__Large-Scale_Simulation_of_Everyday_Tasks_for_Generalist_Robots/RoboCasa__Large-Scale_Simulation_of_Everyday_Tasks_for_Generalist_Robots.html)、[ManiSkill3](../ManiSkill3__GPU_Parallelized_Robotics_Simulation_and_Rendering/ManiSkill3__GPU_Parallelized_Robotics_Simulation_and_Rendering.html)：论文表 1 对比的「执行为中心」基准
- [π₀.₅](../../03_High_Impact_Selection/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.html)：本文微调的学习策略基线
- [Has GPT-6 Astra Achieved Embodied Intelligence?](../../03_High_Impact_Selection/Has_GPT-6-Astra_Achieved_Embodied_Intelligence/Has_GPT-6-Astra_Achieved_Embodied_Intelligence.html)：另一份把前沿模型当机器人策略来评测的报告
- [RoboSteer](../RoboSteer__Benchmarking_Behavioral_Steerability_in_Behavior_Foundation_Models/RoboSteer__Benchmarking_Behavioral_Steerability_in_Behavior_Foundation_Models.html)：同模块另一篇 2026.10 的基准，测的是行为基础模型能否按意图改动作
