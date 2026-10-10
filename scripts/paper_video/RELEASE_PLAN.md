# 视频号合集发布清单：从头学人形机器人算法

[推荐学习路线图](../../README.md#学习路线图)里的 63 篇论文（含 day6 的 3 篇工程基础），共 63 集，按视频号发布顺序排好。已经发布的打勾；每发一集，把那一行的 `[ ]` 改成 `[x]`。截至 2026-10-10 已发布 001–019（含 019 Contact-Aided InEKF，用户确认）；下一集为 020 Berkeley Humanoid。

2026-10-04 对照公众号「具身智能研究室」国庆系列《具身智能从入门到精通》day1–3 的「经典脉络」补入 6 篇：Real-World Humanoid Locomotion（day2「换到人形身体」）、H2O 与 MaskedMimic（day3「参考进入闭环」「稀疏输入由谁补全」）、TWIST / TWIST2（day3 遥操作线）、BFM-Zero（day2「让技能可以调用」）。只插在未发布的 011 之后，已发的 001–010 编号不变。

2026-10-05 又对照 day4「移动操作」的「经典脉络」补入 5 篇：FALCON、CHIP（「让接触进入反馈」）与 HDMI、VIRAL、DoorMan（「让物体进入任务」），插在第三季 TWIST2（现 034）之后；同一部分点名的 ULC、SoFTA、SkillBlender 和拓展阅读里的 SteadyTray 列为第三批候选（见「扩展规则」）。已发的 001–012 编号不变。

2026-10-06 又对照 day5「世界模型」的「经典脉络」补入 3 篇：Dreamer（合讲前作 PlaNet）与 UniPi 插在第四季 Cosmos 之前，Cosmos Policy 插在第五季 DreamZero 之前；同一部分点名的 GR-1、VPP、UWM、LingBot-VA、Being-H0.7 列为第四批候选（见「扩展规则」）。已发的 001–015 编号不变。

2026-10-07 对照 day6「工程与实机部署」补入 InEKF、Berkeley Humanoid、ToddlerBot，排在 018 BeyondMimic 之后的 019–021；原 019–060 顺延为 022–063。〔取舍〕保留 017 ASAP → 018 BeyondMimic 的对照，再补状态估计、硬件与部署工具链，最后转入动作数据与重定向。新增三篇已同步进 README 与首页中英文路线图：InEKF 链接现有笔记，两篇硬件论文标注「原文」并链接 arXiv，待建笔记后再切换；PACE 列为优先候选，不占正式编号。

- 🎬 `<paper>`：仓库里已有渲染好的配音视频，`<paper>` 就是本目录 `node render.mjs <paper>` 用的名字（见 [README](README.md)）
- 🆕：还没有视频，要新做
- `[x]` 只表示已经发布；🎬 只表示已有成片，片尾预告仍需按当前排期核对
- 每行破折号后是排序依据：`A→B` 指首页路线图里的连线，其余是笔记里的说法；标〔取舍〕的是排序判断，路线图原文没这么写
- 已发视频的标题格式：「从头学人形机器人算法系列 (0NN)：<论文英文标题>」，英文标题与 `_data/papers.json` 的 `title` 一致

## 第一季 · 仿真里的模仿与技能（已完结）

01 模块「按推荐阅读路线顺序排列」的前 9 篇。

- [x] 001 [PPO](../../papers/01_Foundational_RL/PPO_Proximal_Policy_Optimization/PPO_Proximal_Policy_Optimization.md)（2017）🎬 `ppo`
- [x] 002 [AWR](../../papers/01_Foundational_RL/AWR_Advantage_Weighted_Regression/AWR_Advantage_Weighted_Regression.md)（2019）🎬 `awr`
- [x] 003 [DeepMimic](../../papers/01_Foundational_RL/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills.md)（2018）🎬 `deepmimic`
- [x] 004 [AMP](../../papers/01_Foundational_RL/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control.md)（2021）🎬 `amp`
- [x] 005 [PHC](../../papers/01_Foundational_RL/PHC_Perpetual_Humanoid_Control/PHC_Perpetual_Humanoid_Control.md)（2023）🎬 `phc`
- [x] 006 [ADD](../../papers/01_Foundational_RL/ADD_Adversarial_Differential_Discriminators/ADD_Adversarial_Differential_Discriminators.md)（2025）🎬 `add`
- [x] 007 [ASE](../../papers/01_Foundational_RL/ASE_Adversarial_Skill_Embeddings_for_Large-Scale_Motion_Control/ASE_Adversarial_Skill_Embeddings_for_Large-Scale_Motion_Control.md)（2022）🎬 `ase`
- [x] 008 [CALM](../../papers/01_Foundational_RL/CALM_Conditional_Adversarial_Latent_Models_for_Directable_Virtual_Characters/CALM_Conditional_Adversarial_Latent_Models_for_Directable_Virtual_Characters.md)（2023）🎬 `calm`
- [x] 009 [PULSE](../../papers/01_Foundational_RL/PULSE_Physics-based_Universal_Latent_Space/PULSE_Physics-based_Universal_Latent_Space.md)（2023）🎬 `pulse`

## 第二季 · 走出仿真：生成式策略、Sim-to-Real 与动作数据

- [x] 010 [Diffusion Policy](../../papers/01_Foundational_RL/Diffusion_Policy/Diffusion_Policy.md)（2023）🎬 `diffusion_policy` — PULSE→DP；01 模块里紧接 PULSE 的就是它
- [x] 011 [SMP](../../papers/01_Foundational_RL/SMP_Reusable_Score-Matching_Motion_Priors/SMP_Reusable_Score-Matching_Motion_Priors.md)（2025）🎬 `smp` — AMP→SMP、DP⇢SMP；MimicKit 里的算法。〔取舍〕紧跟 Diffusion Policy：它把 AMP 的对抗判别器换成预训练扩散模型的分数，得先懂扩散
- [x] 012 [Domain Randomization](../../papers/01_Foundational_RL/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World.md)（2017）🎬 `domain_randomization` — DR→OP3 足球、DR→LCP；〔取舍〕先建立后续人形真机工作的 sim-to-real 基础
- [x] 013 [四足地形 · 教师-学生](../../papers/03_High_Impact_Selection/Learning_Quadrupedal_Locomotion_over_Challenging_Terrain/Learning_Quadrupedal_Locomotion_over_Challenging_Terrain.md)（2020）🎬 `quadterrain` — DR→四足地形；笔记写明它「适合作为人形学习先修论文」，HOVER、ExBody2、BFM 等 WBC 笔记用到的特权教师 → 学生蒸馏从这里来
- [x] 014 [Real-World Humanoid Locomotion](../../papers/03_High_Impact_Selection/Real-World_Humanoid_Locomotion_with_RL/Real-World_Humanoid_Locomotion_with_RL.md)（2023）🎬 `realhumanoid` — 四足地形→真实世界人形行走；从四足的教师-学生换到全尺寸人形 Digit，因果 Transformer 读观测—动作历史直接出关节目标。〔取舍〕按年份排在 OP3 足球（2023-04）前：先看全尺寸人形怎么走稳，再看小人形踢球
- [x] 015 [OP3 足球](../../papers/03_High_Impact_Selection/Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL/Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL.md)（2023）🎬 `op3soccer` — DR→OP3 足球；2026-10-05 重做成十二幕，片头接 014 的片尾预告
- [x] 016 [LCP](../../papers/01_Foundational_RL/LCP_Sim-to-Real_Action_Smoothing/LCP_Sim-to-Real_Action_Smoothing.md)（2024）🎬 `lcp` — DR→LCP；2026-10-05 重做成十幕，片头接 015 的片尾预告（OP3 用输出端滤波，LCP 改成梯度惩罚）；同日按「公式太多」的反馈改成以动图为主，重配为 9 分 56 秒
- [x] 017 [ASAP](../../papers/03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.md)（2025）🎬 `asap` — LCP→ASAP、ASAP⇢BeyondMimic；BeyondMimic 笔记拿它当「单动作专用，每条动作要单独调 DR / 奖励」的对照；2026-10-06 新做十二幕，片头接 016 的片尾预告（LCP 改策略，ASAP 改仿真），片尾预告 018 BeyondMimic；截至 2026-10-08 已发布（用户确认）
- [x] 018 [BeyondMimic](../../papers/01_Foundational_RL/BeyondMimic/BeyondMimic.md)（2025）🎬 `beyondmimic` — DP→BeyondMimic；笔记把 CALM / PULSE 和 Diffusion Policy 列为它要补足的两类前作；2026-10-06 按 arXiv v4 重做成十二幕，片头接 017 的片尾预告（ASAP 一段动作一套配方 → BeyondMimic 一份配方），2026-10-07 片尾画面与配音的源文件已改为预告 019 InEKF「机器人怎样知道自己当前的姿态和速度」（借第 12 幕「还依赖状态估计」接过去，不说 BeyondMimic 用了 InEKF），同日参考 ASAP 改正火柴人（前踢反关节、侧手翻改成腾空）与几条曲线；2026-10-08 全片重渲为 9 分 47 秒、换进笔记；同日按看片反馈改 VAE 读法（逐字母念）、第 5 幕改成皮带减速器（电机小轮转 5 圈、关节大轮转 1 圈、同向）、第 11 幕说明灰虚线（只加路点代价时穿过障碍）、四处文字出框、SDF / CppAD 各加一句解释，随后以四段并行完成全片重渲（本次交付原片 10 分 9 秒，1080×1920、30 fps、18,282 帧），排版、完整帧数与全片解码检查均通过；截至 2026-10-08 已发布（用户确认）
- [x] 019 [Contact-Aided InEKF](../../papers/09_State_Estimation/Contact-Aided_Invariant_EKF_for_Legged_Robots/Contact-Aided_Invariant_EKF_for_Legged_Robots.md)（2018 / 2019）🎬 `inekf` — day6「状态估计先于动作」：融合 IMU、接触与足端运动学，估计身体姿态和速度。〔取舍〕先看 BeyondMimic 的跟踪能力，再补状态估计背景；这是教学关联，不表示 BeyondMimic 采用该论文的 InEKF。day6 对应 [RSS 2018 会议版](https://arxiv.org/abs/1805.10410)；上游清单收录的是 [IJRR 2020 扩展版](https://arxiv.org/abs/1904.09251)（标题去掉了 Legged，2019 年挂 arXiv），2026-10-08 以扩展版为准重写笔记、单列两版关系，新做十二幕动画、三个交互演示与配音视频（约 10 分钟），片头接 018 的片尾预告，片尾只预告 020 Berkeley Humanoid；同日按看片反馈换上 Robot_Description_Gallery 新的 Cassie 图（UMich BipedLab 展示模型，灰色），第 2、3、4、6、10 幕的火柴人改成 Cassie 鸟腿（画法同 014 真实世界人形行走的 Digit 下半身，Digit 的腿就是 Cassie 的腿；连杆按 MuJoCo Menagerie 的 Cassie 模型，大腿 : 小腿 : 跗骨 = 0.12 : 0.50 : 0.41 m，跗骨跟着大腿转），只出了第 1–4、6、10、12 幕的改动片段；2026-10-09 再按看片反馈把第 2 幕改成左右脚交替、旁白「C++」连成一个词念，并对照 IJRR 原文逐幕复查，改正第 6 幕 GPS 的归属（世界中心左不变、机器人中心右不变，表 2 / 3）、第 8 幕 QEKF 的宽度按图 6 读图（约为真值一半）、第 10 幕路标可观性（要有已知位置的路标）、第 1 幕激光雷达「怕暗」、第 5 幕图 4 的初始误差（旋转向量 (π/2, π/2, π/2)，约 156°）、第 6 幕「靠前 2 cm、高 2 cm」等，第 3 幕竖直分量放大 20 倍显出「多算一倍」，当时只出了改动的片段；截至 2026-10-10 已发布（用户确认）。发布标题用扩展版英文标题（与 `_data/papers.json` 一致）
- [ ] 020 [Berkeley Humanoid](../../papers/12_Hardware_Design/Berkeley_Humanoid_A_Research_Platform_for_Learning-based_Control/Berkeley_Humanoid_A_Research_Platform_for_Learning-based_Control.md)（2024）🎬 `berkeley_humanoid` — day6「仿真与硬件」：硬件、执行器辨识与仿真训练共同设计。LCP 在该平台上验证，属于部署平台关联。〔取舍〕承接状态估计，补上控制命令落到硬件这一环。2026-10-09 新建笔记：以 arXiv v1 为准（上游清单收录的是它，附录表 4–6 也只在这一版），对照 ICRA 2025 版（课题组主页 8 页 PDF）与官方训练代码；论文只说「用简单实验单独测每个执行器的摩擦」，没写台架细节，笔记与视频都按此表述。新做十二幕动画、三个交互演示（减速比与转子惯量、关节的力矩—速度包络与摩擦、窄 / 宽随机化的单关节玩具）与配音视频（11 分 16 秒），片头接 019 的片尾预告，片尾只预告 021 ToddlerBot；2026-10-10 按看片反馈修字幕「M L P」被切成两行（build.py 改为先换成字幕写法再切行），并在 MLP 第一次出现时加一句「多层感知机」的解释，只出了第 1 幕的改动片段；同日旁白里的 EtherCAT 改念 EE-ther-cat（大写的 CAT 会被逐字母念），再按「全局检查物理与逻辑」逐幕复查（分幕并行审查、逐条复核后再查一遍回归），改正第 2–12 幕：单摆一起松手计数、弹簧两端固定随膝压缩、转子与输出同向 9:1、线缆从前面穿进空心轴、从背后穿出、25 kHz 画成实心带、摔倒越倒越快且不再一帧躺平、髋两轴斜 45°、去掉四样分两种理由、库仑（滑动）/ 黏性摩擦与示意测点、「不属于这两类的笼统参数」不随机化、机身 ±1 kg 按躯干折算、命令与步态一致、踢到才推、坡上脚掌贴坡、跳跃走抛物线、安全绳定长等，笔记同步；配音重建为 11 分 35 秒，当时只出了第 2–12 幕的改动片段；同日基于最新合并提交重建配音，并用 8 路并行、24 段分三批完成整片重渲（11 分 35 秒，1080×1920、30 fps、20,854 帧，CRF 19 原片 37.8 MB），逐段帧数、音画时长、全片解码、Chrome 播放、排版与封面检查均通过，已修正 Chrome 回放因全范围标记而偏暗的问题，整片与网页版本统一为有限范围 `yuv420p`，渲染命令也同步修正；笔记内压缩视频与海报已更新；完整原片和封面已上传百度网盘 `/学习/RLPN/BerkeleyHumanoid/`，两者回下载的 SHA-256 均与本地一致，**待发布**。发布标题用 arXiv 英文标题（与 `_data/papers.json` 一致）
- [ ] 021 [ToddlerBot](../../papers/12_Hardware_Design/ToddlerBot_Open-Source_ML-Compatible_Humanoid_Platform_for_Loco-Manipulation/ToddlerBot_Open-Source_ML-Compatible_Humanoid_Platform_for_Loco-Manipulation.md)（2025）🎬 `toddlerbot` — day6「仿真与硬件」：把校准、数字孪生、遥操作采集与部署工具连成完整平台。〔取舍〕与 Berkeley Humanoid 连着讲，由硬件与仿真对齐走向整套工具链；片尾从遥操作采集引出 022 HumanML3D / 023 GMR 的动作数据与重定向。2026-10-09 新建笔记：以 arXiv v4（CoRL 2025 版）为准，对照 v1（执行器模型从 6 参数改成 9 参数、表 3 全部重测）与官方代码 2.0（50 → 200 Hz、膝去掉平行连杆、`rsl_rl`）；新做十二幕动画、三个交互演示（一台 Dynamixel 在仿真里长什么样、拿掉一个参数 chirp 跟踪差多少、功率因子按身高体重选电机）与配音视频，片头接 020 的片尾预告，片尾只预告 022 HumanML3D「人类动作数据从哪里来」；2026-10-10 按看片反馈把片头的 CoRL 改成一个词写、一个词念（原来逐字母念），整片重渲后换进笔记；同日又按「格式错位」与「多用图少用文字、动效符合物理」两轮反馈逐幕修改，已出 12 幕改动片段，整片待确认后重渲
- [ ] 022 [AMASS / HumanML3D](../../papers/14_Human_Motion/HumanML3D/HumanML3D.md)（2019 / 2022）🎬 `humanml3d` 可选 — AMASS / HumanML3D→GMR；视频讲的是 HumanML3D
- [ ] 023 [GMR](../../papers/02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.md)（2025）🎬 `gmr` — GMR 论文用 BeyondMimic 作中性训练框架做对比，所以排在它后面
- [ ] 024 [OmniRetarget](../../papers/02_Motion_Retargeting/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.md)（2025）🎬 `omniretarget` — GMR→OmniRetarget

### day6 补充集的制作与发布待办

- [x] 调整 018 BeyondMimic：片尾画面与配音已预告 019 InEKF「机器人怎样知道自己当前的姿态和速度」，全片重渲与验收完成，已发布；017 ASAP 继续预告 018 BeyondMimic。（2026-10-08 更新，用户确认发布）
- [x] 深化 019 InEKF：把现有起步笔记深化，并核对 RSS 2018 与 2019 扩展版的标题、年份、链接，保留版本关系说明。（2026-10-08：以扩展版为准重写，笔记新增「两个版本是什么关系」一节，并完成十二幕动画与配音视频）
- [x] 准备并制作 020 Berkeley Humanoid：已复核收录于[上游 Hardware Design](https://github.com/YanjieZe/awesome-humanoid-robot-learning#hardware-design)，在 12 模块建笔记，完成十二幕动画、三个交互演示与配音视频。（2026-10-09）
- [x] 准备并制作 021 ToddlerBot：已复核收录于[上游 Hardware Design](https://github.com/YanjieZe/awesome-humanoid-robot-learning#hardware-design)，在 12 模块建笔记，完成十二幕动画、三个交互演示与配音视频；片尾从遥操作采集引出「人类动作数据从哪里来」，衔接 022 HumanML3D（其片头「用一句话描述一个动作，机器能不能生成对应的 3D 人体动作」）。（2026-10-09）

## 第三季 · 全身控制、遥操作与移动操作

- [ ] 025 [Expressive WBC](../../papers/03_High_Impact_Selection/Expressive_Whole-Body_Control_for_Humanoid_Robots/Expressive_Whole-Body_Control_for_Humanoid_Robots.md)（2024）🆕 — PULSE→EWBC、BeyondMimic→EWBC
- [ ] 026 [H2O](../../papers/03_High_Impact_Selection/H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation/H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation.md)（2024）🆕 — H2O→OmniH2O、H2O→TWIST；下一行 OmniH2O 写的「HOVER 统一 ExBody / H2O / OmniH2O 的命令空间」里，H2O 之前一直没进清单。〔取舍〕和 Expressive WBC（2024-02）同期，按年份排在它后面
- [ ] 027 [OmniH2O](../../papers/03_High_Impact_Selection/OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.md)（2024）🆕 — OmniH2O→HOVER；HOVER 统一的就是 ExBody / H2O / OmniH2O / HumanPlus 各自的命令空间
- [ ] 028 [MaskedMimic](../../papers/03_High_Impact_Selection/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting.md)（2024）🆕 — MaskedMimic→HOVER；仿真角色上「随机遮掉部分目标」的统一控制，HOVER 的 mode mask + sparsity mask 把同一个问题搬到人形。〔取舍〕夹在 OmniH2O（固定头手三点）和 HOVER 之间，正好对照「固定接口」与「任意掩码」
- [ ] 029 [HOVER](../../papers/03_High_Impact_Selection/HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.md)（2024）🆕 — EWBC→HOVER
- [ ] 030 [ExBody2](../../papers/03_High_Impact_Selection/ExBody2_Advanced_Expressive_Whole-Body_Control/ExBody2_Advanced_Expressive_Whole-Body_Control.md)（2024）🆕 — EWBC→ExBody2
- [ ] 031 [HugWBC](../../papers/03_High_Impact_Selection/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller.md)（2025）🆕 — EWBC→HugWBC；025、029–031 组内按年份排
- [ ] 032 [HOMIE](../../papers/03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.md)（2025）🆕 — HOVER / HugWBC→HOMIE；〔取舍〕路线图还有 SONIC→HOMIE，但 HOMIE 比 SONIC 早，笔记只在延伸阅读表里提到 SONIC
- [ ] 033 [TWIST](../../papers/07_Teleoperation/TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.md)（2025）🆕 — H2O→TWIST；光学动捕重定向成参考，教师看未来动作、学生只用当前目标和本体历史。〔取舍〕按年份接在 HOMIE（2025-02）后面
- [ ] 034 [TWIST2](../../papers/07_Teleoperation/TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System/TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System.md)（2025）🆕 — TWIST→TWIST2；把动捕场地换成 PICO 头显 + 腿部追踪器，边遥操作边录示范
- [ ] 035 [FALCON](../../papers/04_Loco-Manipulation_and_WBC/FALCON__Learning_Force-Adaptive_Humanoid_Loco-Manipulation/FALCON__Learning_Force-Adaptive_Humanoid_Loco-Manipulation.md)（2025）🆕 — HOMIE⇢FALCON；FALCON 把 HOMIE 这类「下身 RL + 上身 IK」当基线，指出上身缺力补偿，改成上下身双智能体共享观测，再加按力矩上限算的 3D 外力课程。〔取舍〕按年份比 TWIST2 早（2025-05），但 TWIST / TWIST2 连着讲，移动操作这一组从这里开始
- [ ] 036 [HDMI](../../papers/04_Loco-Manipulation_and_WBC/HDMI__Learning_Interactive_Humanoid_Whole-Body_Control_from_Human_Videos/HDMI__Learning_Interactive_Humanoid_Whole-Body_Control_from_Human_Videos.md)（2025）🆕 — DeepMimic⇢HDMI；DeepMimic 式跟踪，但把物体位姿和期望接触点也写进目标，从人类视频学开门、搬箱
- [ ] 037 [VIRAL](../../papers/04_Loco-Manipulation_and_WBC/VIRAL__Visual_Sim-to-Real_at_Scale_for_Humanoid_Loco-Manipulation/VIRAL__Visual_Sim-to-Real_at_Scale_for_Humanoid_Loco-Manipulation.md)（2025）🆕 笔记是 2026-06 的速读版 — HOMIE→VIRAL；特权教师蒸馏成纯 RGB 学生，动作输出是 HOMIE 全身控制器的命令
- [ ] 038 [DoorMan](../../papers/04_Loco-Manipulation_and_WBC/Opening_the_Sim-to-Real_Door_for_Humanoid_Pixel-to-Action_Policy_Transfer/Opening_the_Sim-to-Real_Door_for_Humanoid_Pixel-to-Action_Policy_Transfer.md)（2025）🆕 笔记是 2026-06 的速读版 — HOMIE→DoorMan；开门拆成接近、抓握、转把手、推拉、穿门，同样以 HOMIE 为低层控制器。〔取舍〕和 VIRAL 是同一批机构的工作，紧跟着讲
- [ ] 039 [CHIP](../../papers/04_Loco-Manipulation_and_WBC/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation.md)（2025）🆕 笔记是 2026-06 的速读版 — FALCON⇢CHIP；同样处理末端受力，但目标从「扛住外力」变成「按指定柔顺度让位」
- [ ] 040 [iDP3](../../papers/03_High_Impact_Selection/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies.md)（2024）🆕 — BeyondMimic→iDP3

## 第四季 · 基础模型：VLA、世界模型与 BFM

- [ ] 041 [Transformer](../../papers/01_Foundational_RL/Transformer_Attention_Is_All_You_Need/Transformer_Attention_Is_All_You_Need.md)（2017）🎬 `transformer` — 仓库 README 写明「读 VLA 之前先读它」；Diffusion Policy 视频只在第 4 幕顺带提到 Transformer 骨干，不用提前看
- [ ] 042 [ACT / ALOHA](../../papers/03_High_Impact_Selection/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware.md)（2023）🆕 占位笔记待补充 — Transformer⇢ACT、ACT→EgoMimic、ACT→π₀；π₀ 笔记称它是「动作块的来源工作之一」
- [ ] 043 [EgoMimic](../../papers/06_Manipulation/EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video/EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video.md)（2024）🆕 — ACT→EgoMimic、iDP3→EgoMimic；〔取舍〕EgoMimic 用 ACT 当策略骨干，所以跟着 ACT 放进第四季
- [ ] 044 [OpenVLA](../../papers/03_High_Impact_Selection/OpenVLA_An_Open-Source_Vision-Language-Action_Model/OpenVLA_An_Open-Source_Vision-Language-Action_Model.md)（2024）🆕 占位笔记待补充 — OpenVLA→π₀；π₀ 的出发点就是 OpenVLA 一类「把动作离散成 token 自回归输出」做不了高频动作块
- [ ] 045 [π₀](../../papers/03_High_Impact_Selection/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.md)（2024）🎬 `pi0` — DP→π₀、Transformer→π₀
- [ ] 046 [π₀.₅](../../papers/03_High_Impact_Selection/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.md)（2025）🎬 `pi05` — π₀→π₀.₅
- [ ] 047 [Dreamer / PlaNet](../../papers/03_High_Impact_Selection/Dreamer_Learning_Behaviors_by_Latent_Imagination/Dreamer_Learning_Behaviors_by_Latent_Imagination.md)（2019 / 2018）🆕 — Dreamer⇢UniPi、Dreamer⇢Cosmos Policy；day5「世界模型」经典脉络的起点：PlaNet 在学到的潜空间里在线规划选动作，Dreamer 在同一个世界模型里想象轨迹、用价值梯度教策略，两篇合成一集讲。〔取舍〕和 041 Transformer 一样当「基础」放进第四季，排在 Cosmos 前面，先讲世界模型怎么帮决策，再讲视频世界模型；actor-critic 部分对照 001 PPO 讲
- [ ] 048 [UniPi](../../papers/03_High_Impact_Selection/UniPi_Learning_Universal_Policies_via_Text-Guided_Video_Generation/UniPi_Learning_Universal_Policies_via_Text-Guided_Video_Generation.md)（2023）🆕 — Dreamer⇢UniPi；相关工作引用 DreamerV2，指出传统世界模型要「状态—动作—奖励」格式的数据，改用文本条件视频扩散当规划器、逆动力学模型出动作。〔取舍〕视频扩散接 010 Diffusion Policy；放在 Cosmos 之前，先看「视频当策略」的最小形态，后面 GR00T N1 的「视频生成神经轨迹 + 逆动力学补伪动作」也是这个思路
- [ ] 049 [Cosmos](../../papers/03_High_Impact_Selection/Cosmos_World_Foundation_Model_Platform_for_Physical_AI/Cosmos_World_Foundation_Model_Platform_for_Physical_AI.md)（2025）🎬 `cosmos` — BeyondMimic→Cosmos；〔取舍〕GR00T N1 数据金字塔的中层用视频生成模型造「神经轨迹」，所以先讲世界模型
- [ ] 050 [GR00T N1](../../papers/03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.md)（2025）🎬 `groot` — π₀→GR00T N1
- [ ] 051 [BFM](../../papers/03_High_Impact_Selection/Behavior_Foundation_Model_for_Humanoid_Robots/Behavior_Foundation_Model_for_Humanoid_Robots.md)（2025）🆕 — 路线图第 ⑨ 层；笔记建议对照 HOVER 读
- [ ] 052 [BFM-Zero](../../papers/04_Loco-Manipulation_and_WBC/BFM-Zero__A_Promptable_Behavioral_Foundation_Model_for_Humanoid_Control/BFM-Zero__A_Promptable_Behavioral_Foundation_Model_for_Humanoid_Control.md)（2025）🆕 — BFM⇢BFM-Zero、ASE⇢BFM-Zero；无监督 RL（前向—后向表示）预训练，用目标姿态、动作或奖励当提示调用。〔取舍〕和 BFM 同属行为基础模型，紧跟着讲；比 SONIC（2025-11-11）早几天，排在它前面
- [ ] 053 [SONIC](../../papers/03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.md)（2025）🎬 `sonic` — 〔取舍〕路线图把它放在第 ④ 层 WBC；但它用 GR00T N1.5 当 System-2，还和 BeyondMimic 做对比，放在 GR00T 后面讲就不用提前提到没讲过的模型

## 第五季 · 2026 前沿（开放，一直往后加）

〔取舍〕路线图里第 ⑤–⑧ 层支线的箭头指向第 ⑨ 层（表示汇聚），但这几篇 2026 年的论文都在和 π₀ / GR00T N1 对比，所以整体放在第四季之后。

- [ ] 054 [NMR](../../papers/02_Motion_Retargeting/Make_Tracking_Easy__Neural_Motion_Retargeting_for_Humanoid_Whole-body_Control/Make_Tracking_Easy__Neural_Motion_Retargeting_for_Humanoid_Whole-body_Control.md)（2026）🆕 — GMR→NMR
- [ ] 055 [ReActor](../../papers/02_Motion_Retargeting/ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting/ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting.md)（2026）🆕 — GMR→ReActor
- [ ] 056 [ULTRA](../../papers/04_Loco-Manipulation_and_WBC/ULTRA_Unified_Multimodal_Control_for_Autonomous_Humanoid_Whole-Body_Loco-Manipulation/ULTRA_Unified_Multimodal_Control_for_Autonomous_Humanoid_Whole-Body_Loco-Manipulation.md)（2026）🆕 — HOMIE→ULTRA
- [ ] 057 [HumDex](../../papers/06_Manipulation/HumDex_Humanoid_Dexterous_Manipulation_Made_Easy/HumDex_Humanoid_Dexterous_Manipulation_Made_Easy.md)（2026）🆕 — EgoMimic→HumDex；笔记说 HumDex 是 Ψ₀ 的上游数据采集系统
- [ ] 058 [Ψ₀](../../papers/04_Loco-Manipulation_and_WBC/Ψ₀__An_Open_Foundation_Model_Towards_Universal_Humanoid_Loco-Manipulation/Ψ₀__An_Open_Foundation_Model_Towards_Universal_Humanoid_Loco-Manipulation.md)（2026）🆕 — ULTRA→Ψ₀；笔记拿它和 GR00T N1、π₀ 对比
- [ ] 059 [HAIC](../../papers/04_Loco-Manipulation_and_WBC/HAIC__Humanoid_Agile_Object_Interaction_Control_via_Dynamics-Aware_World_Model/HAIC__Humanoid_Agile_Object_Interaction_Control_via_Dynamics-Aware_World_Model.md)（2026）🆕 — ULTRA→HAIC
- [ ] 060 [DreamDojo](../../papers/06_Manipulation/DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos/DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos.md)（2026）🆕 — Cosmos→DreamDojo、HumDex→DreamDojo
- [ ] 061 [1X 世界模型](../../papers/11_Simulation_Benchmark/Generative_World_Modelling_for_Humanoids__1X_World_Model_Challenge_Technical_Report/Generative_World_Modelling_for_Humanoids__1X_World_Model_Challenge_Technical_Report.md)（2025）🆕 — DreamDojo→1X 世界模型
- [ ] 062 [Cosmos Policy](../../papers/03_High_Impact_Selection/Cosmos_Policy_Fine-Tuning_Video_Models_for_Visuomotor_Control_and_Planning/Cosmos_Policy_Fine-Tuning_Video_Models_for_Visuomotor_Control_and_Planning.md)（2026）🆕 — Cosmos→Cosmos Policy、Dreamer⇢Cosmos Policy；在 Cosmos-Predict2-2B 上一次后训练，把动作、本体状态和价值都写成潜帧，同一个模型兼任策略、世界模型和价值函数，相关工作引用 Dreamer 系列。〔取舍〕按年份（2026-01）排在 DreamZero（2026-02）前，day5 也是 Cosmos Policy → DreamZero 的顺序
- [ ] 063 [DreamZero](../../papers/06_Manipulation/DreamZero_World_Action_Models_are_Zero-shot_Policies/DreamZero_World_Action_Models_are_Zero-shot_Policies.md)（2026）🆕 — DreamDojo / 1X 世界模型→DreamZero；笔记标注它是「世界模型支线终点」

064 起：新论文追加在这里，规则见下一节。

## 扩展规则

- 第二到第四季是固定的经典主线，第五季开放。以后的新论文一律追加到末尾，标题加支线标签（如【重定向】【WBC】【VLA】【世界模型】），片头说明前置要看哪几集。这样已发视频不用改编号。
- 第一批可以直接用的扩展：下面几篇已有讲解动画、还没做视频，也不在路线图里——[UMR](../../papers/02_Motion_Retargeting/UMR__Unified_Motion_Retargeting_with_Learned_Point_Cloud_Correspondence/UMR__Unified_Motion_Retargeting_with_Learned_Point_Cloud_Correspondence.md)、[Perceptive BFM](../../papers/03_High_Impact_Selection/Perceptive_BFM_Adapting_Human_Motion_Priors_to_Robot-Centric_Terrain/Perceptive_BFM_Adapting_Human_Motion_Priors_to_Robot-Centric_Terrain.md)、[GentleHumanoid](../../papers/04_Loco-Manipulation_and_WBC/GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object/GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object.md)、[Perceptive Humanoid Parkour](../../papers/04_Loco-Manipulation_and_WBC/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching.md)。
- 第二批候选：下面几篇已有笔记、还没有讲解动画和视频，也不在路线图里，是《具身智能从入门到精通》day1 / day2「经典脉络」点名的 2026 年工作——[DynaRetarget](../../papers/04_Loco-Manipulation_and_WBC/DynaRetarget__Dynamically-Feasible_Retargeting_using_Sampling-Based_Trajectory_Optimization/DynaRetarget__Dynamically-Feasible_Retargeting_using_Sampling-Based_Trajectory_Optimization.md)、[HumanoidMimicGen](../../papers/11_Simulation_Benchmark/HumanoidMimicGen__Data_Generation_for_Loco-Manipulation_via_Whole-Body_Planning/HumanoidMimicGen__Data_Generation_for_Loco-Manipulation_via_Whole-Body_Planning.md)（这两篇是重定向 / 数据生成线，可以挨着 054 NMR 讲）、[Hiking in the Wild](../../papers/04_Loco-Manipulation_and_WBC/Hiking_in_the_Wild__A_Scalable_Perceptive_Parkour_Framework_for_Humanoids/Hiking_in_the_Wild__A_Scalable_Perceptive_Parkour_Framework_for_Humanoids.md)（AMP 风格奖励 + 深度感知的人形行走）。
- 第三批候选：day4「移动操作」经典脉络点名、上游已收录、但仓库里还没有笔记的三篇——[ULC](https://arxiv.org/abs/2507.06905)（根速度、高度、躯干与双臂目标进一个策略，命令逐步解锁）、[SoFTA（Hold My Beer）](https://arxiv.org/abs/2505.24198)（上下肢两个频率不同、奖励分开的策略，端液体时稳住末端）、[SkillBlender](https://arxiv.org/abs/2506.09366)（先学目标条件的基础技能，再按关节混合）；另有拓展阅读里已有笔记的 [SteadyTray](../../papers/04_Loco-Manipulation_and_WBC/SteadyTray__Learning_Object_Balancing_Tasks_in_Humanoid_Tray_Transport_via_Resid/SteadyTray__Learning_Object_Balancing_Tasks_in_Humanoid_Tray_Transport_via_Resid.md)（2026，冻结托盘行走基座后加残差稳住负载）。要做视频先补笔记。
- 第四批候选：day5「世界模型」经典脉络点名、仓库里还没有笔记、也不在上游人形列表里的五篇（要写笔记只能放 01 或 03 模块）。「视频预测接动作」一类，和 UniPi 讲的是同一个问题——[GR-1](https://arxiv.org/abs/2312.13139)（2023，大规模视频生成预训练再接机械臂操作）、[VPP](https://arxiv.org/abs/2412.14803)（2024，用视频扩散模型的预测表征当策略输入）、[UWM](https://arxiv.org/abs/2504.02792)（2025，视频扩散与动作扩散耦合，Cosmos Policy 在 RoboCasa 上的对照之一）；「世界—动作模型」一类，和 DreamZero 同类——[LingBot-VA](https://arxiv.org/abs/2601.21998)（2026，视频预测与动作解码交错在同一条因果序列里）、[Being-H0.7](https://arxiv.org/abs/2605.00078)（2026，不生成未来画面，在潜空间里学与动作相关的未来表征；仓库里 06 模块的 Being-H0 是初代）。要做视频先补笔记。
- 第五批候选（day6，优先）：[PACE](../../papers/10_Sim-to-Real/PACE_Systematic_Sim-to-Real_Transfer_for_Diverse_Legged_Robots/PACE_Systematic_Sim-to-Real_Transfer_for_Diverse_Legged_Robots.md)（2025，已有笔记，暂无讲解动画和视频）。执行器建模与系统辨识可对照 012 DR 的随机化、017 ASAP 的 delta 动作模型。先列候选，不占正式编号；现有笔记注明尚未完整核对论文全文，制作前需复核。若之后决定扩为四篇工程补充集，教学位置可考虑 Berkeley Humanoid 之后、ToddlerBot 之前，正式排期需同时核对发布状态与片尾衔接。
- 视频号合集里的视频能不能调整顺序没有核实到，所以这套规则不依赖调序。
- 新做完一集视频：把 🆕 改成 🎬，写上 `<paper>` 名，与 [README](README.md) 的表格一致。

## 可选变体：先连发现成视频

第三季 16 篇都要新做。想先把现成视频连着发，可以把 041 Transformer、042 ACT、044–050（OpenVLA → GR00T N1）提到第三季前面：这条线只接 Diffusion Policy 和 Transformer（DP→π₀、Transformer⇢π₀），中间新插的 Dreamer、UniPi 也只用到 PPO 和扩散，不依赖 WBC。EgoMimic 在路线图上接在 iDP3 后面，BFM 要对照 HOVER 读（BFM-Zero 跟着 BFM），SONIC 用到 GR00T N1.5 和 BeyondMimic，这四篇仍放在第三季之后。
