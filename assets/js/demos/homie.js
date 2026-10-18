/* Interactive HOMIE demos for
 * papers/03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit
 * （Ben, Jia, Zeng, Dong, Lin, Pang · HOMIE: Humanoid Loco-Manipulation with Isomorphic Exoskeleton Cockpit ·
 *   arXiv 2502.13013 v2，RSS 2025；代码 InternRobotics/OpenHomie）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["homie"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   homie-explainer  — 十七幕讲解动画：两条路各缺一半 → 一个驾驶舱 → 表 I → 下半身交给强化学习 → 上身姿态课程 →
 *                      高度跟踪奖励 → 训练场 → 对称 → 图 7 消融 → 换一台机器人 → 同构外骨骼 → 手套与踏板 → 表 IV →
 *                      真机任务 → 图 11、12 → 仿真与自主策略 → 局限与代码
 *   homie-video      — 同一套十七幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   homie-curriculum — 上身姿态课程：拖 ρ_a 看采样分布、关节目标的直方图与 1 s 重采样 + 线性插值的轨迹
 *   homie-knee       — r_knee 计算器：高度差 × (归一化膝角 − 1/2)，配我们在 MuJoCo 里跑官方策略的一段下蹲
 *   homie-tables     — 表 I–V、图 11、表 X 与我们的 MuJoCo 复现
 */

(function () {
  'use strict';

  var K = window.PaperDemoKit;
  function assetBase(rel) {
    var cs = document.currentScript;
    try {
      return cs && cs.src ? new URL(rel, cs.src).href : '';
    } catch (e) {
      return '';
    }
  }
  /* 论文的图（arXiv 2502.13013 的图 1、2、5–9、17、20）与项目页视频的片段放在 assets/img/papers/homie/；
     G1 的 3D 逐帧贴图（我们在 MuJoCo 里跑官方 deploy.onnx 的几段动作，同一台正交相机）在 assets/img/papers/homie/g1_3d/ */
  var IMG_BASE = assetBase('../../img/papers/');
  var PAPER_IMG_BASE = IMG_BASE ? IMG_BASE + 'homie/' : '';
  var CLIP_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'clips/' : '';
  var G1_3D_BASE = IMG_BASE ? IMG_BASE + 'homie/g1_3d/' : '';
  var el = K.el,
    fmt = K.fmt,
    clamp = K.clamp,
    card = K.card,
    controlsRow = K.controlsRow,
    slider = K.slider,
    buttonGroup = K.buttonGroup,
    statsRow = K.statsRow,
    verdictBox = K.verdictBox,
    note = K.note,
    table = K.table,
    stage = K.stage,
    begin = K.begin,
    line = K.line,
    dot = K.dot,
    text = K.text,
    registerRenderer = K.registerRenderer;

  // ─── 论文里的数字（arXiv 2502.13013 v2：正文、表 I–X、图 7、8、11、12） ─────────
  /* 表 I：遥操作系统对比。[名字, 价格, 手臂跟踪, 灵巧手跟踪, 移动操作, 全身, 不用动捕]；手 null 表示没有灵巧手 */
  var TABLE1 = [
    ['Mobile-ALOHA', '32k', '关节匹配', null, 1, 0, 1],
    ['GELLO', '0.6k', '关节匹配', null, 0, 0, 1],
    ['AirExo', '0.6k', '关节匹配', null, 0, 0, 1],
    ['ACE', '0.6k', '关节匹配', '视觉重定向', 0, 0, 1],
    ['DexCap', '4k', '视觉重定向', '动捕 + SLAM', 0, 0, 1],
    ['AnyTeleop', '~0.3k', '视觉重定向', '视觉重定向', 0, 0, 1],
    ['OpenTelevision', '4k', 'VR 设备', 'VR 设备', 0, 0, 1],
    ['HumanPlus', '0.05k', '视觉重定向', '视觉重定向', 1, 1, 0],
    ['OmniH2O', '0–3.5k', '视觉 / VR', '视觉 / VR', 1, 1, 0],
    ['Mobile-TeleVision', '3.5k', 'VR 设备', 'VR 设备', 1, 1, 0],
    ['HOMIE', '0.5k', '关节匹配', '关节匹配', 1, 1, 1]
  ];
  /* 表 II：同一套训练框架训 Unitree G1 与 Fourier GR-1（2k 步的策略，3 个种子，1000 个环境 × 20 s，ρ_a → 1）：[均值, ±] */
  var TABLE2 = [
    { zh: '线速度误差', unit: 'm/s', g1: [0.194, 0.003], gr1: [0.273, 0.003] },
    { zh: '角速度误差', unit: 'rad/s', g1: [0.451, 0.006], gr1: [0.540, 0.002] },
    { zh: '高度误差', unit: 'm', g1: [0.022, 0.019], gr1: [0.038, 0.003] },
    { zh: '对称损失', unit: '', g1: [0.019, 0.017], gr1: [0.009, 0.001] },
    { zh: '存活时间', unit: 's', g1: [19.947, 0.092], gr1: [19.960, 0.035] }
  ];
  /* 图 8：两台机器人的参数（手重占比 = 双手 / 全身；图注写成了全身 / 双手） */
  var ROBOTS = {
    g1: { zh: 'Unitree G1', cm: 130, kg: 36.4, hand: '7 自由度', handKg: 1.42, ratio: 3.9 },
    gr1: { zh: 'Fourier GR-1', cm: 165, kg: 56, hand: '6 自由度', handKg: 1.04, ratio: 1.9 }
  };
  /* 表 III：三件硬件的价格、采集频率（有线、115200 波特率）、精度（12 位读数） */
  var TABLE3 = [
    { zh: '外骨骼（两臂）', usd: 430, khz: 0.26, acc: '$2^{12}$（360°）' },
    { zh: '手套（每只）', usd: 30, khz: 0.3, acc: '$2^{12}$' },
    { zh: '踏板', usd: 20, khz: 0.5, acc: '$2^{12}$（270°）' }
  ];
  /* 表 IV：上身遥操作输出给机器人的频率（Hz） */
  var TABLE4 = [
    { zh: 'Telekinesis', hw: '2 块 RTX 3080 Ti', arm: 16, hand: 24 },
    { zh: 'AnyTeleop', hw: 'RTX 3090', arm: 125, hand: 111 },
    { zh: 'OpenTeleVision', hw: 'M2 芯片', arm: 60, hand: 60 },
    { zh: 'HOMIE', hw: '不用 GPU / SoC', arm: 263, hand: 293 }
  ];
  /* 图 11：完成时间（s），我们从论文 PDF 的矢量图里量的条高（读图近似值，误差条没量） */
  var FIG11 = [
    { zh: '抓放', en: 'Pick & Place', vr: 13.5, ours: 8.6 },
    { zh: '扫码', en: 'Scan Barcode', vr: 8.1, ours: 4.0 },
    { zh: '递手', en: 'Hand Over', vr: 15.3, ours: 7.6 },
    { zh: '开烤箱', en: 'Open Oven', vr: 12.3, ours: 8.9 }
  ];
  /* 表 X：用户研究的原始数据（Hand Over 任务，连做 5 次的用时，s） */
  var TABLE10 = [
    { id: 1, cm: 185, kg: 71, sex: '男', t: [34, 28, 15, 16, 9] },
    { id: 2, cm: 185, kg: 90, sex: '男', t: [19, 16, 13, 7, 6] },
    { id: 3, cm: 160, kg: 55, sex: '女', t: [19, 28, 14, 17, 12] },
    { id: 4, cm: 170, kg: 63, sex: '男', t: [29, 21, 14, 13, 6] },
    { id: 5, cm: 175, kg: 80, sex: '男', t: [23, 22, 15, 12, 7] }
  ];
  var TABLE10_AVG = [24.8, 23.0, 14.2, 13.0, 8.0];
  /* 表 V：模仿学习（每个任务 50 条示范、10 Hz，测 15 次） */
  var TABLE5 = [
    { zh: '蹲下拿沙发上的番茄', en: 'Squat Pick', sr: 73.3, n: 15 },
    { zh: '抓起番茄放进篮子', en: 'Pick & Place', sr: 80.0, n: 15 }
  ];
  /* 表 IX：手套的 15 个自由度（每根手指三个：指尖俯仰 α、指腹俯仰 β、指腹偏航 γ） */
  var TABLE9 = [
    ['拇指', 'α 指尖俯仰', 65, 528], ['拇指', 'β 指腹俯仰', 100, 1024], ['拇指', 'γ 指腹偏航', 90, 832],
    ['小指', 'α 指尖俯仰', 70, 880], ['小指', 'β 指腹俯仰', 90, 1136], ['小指', 'γ 指腹偏航', 45, 416],
    ['食指、中指、无名指', 'α 指尖俯仰', 70, 928], ['食指、中指、无名指', 'β 指腹俯仰', 90, 1072], ['食指、中指、无名指', 'γ 指腹偏航', 40, 512]
  ];
  /* 表 VI 的 33 项奖励（G1 的权重），分组只为讲解 */
  var REWARDS = {
    track: [['x 线速度', 1.5], ['y 线速度', 1.0], ['偏航角速度', 2.0], ['根部高度', 2.0]],
    squat: [['蹲姿膝角 $r_{knee}$', -0.75]],
    reg: [['z 线速度', -0.5], ['xy 角速度', -0.025], ['朝向', -1.5], ['动作变化率', -0.01], ['髋偏离', -0.2], ['踝偏离', -0.5],
      ['关节加速度', -2.5e-7], ['关节越限', -2.0], ['平滑', -0.05], ['关节功率', -2e-5], ['力矩', -2.5e-6], ['关节速度', -1e-4],
      ['速度越限', -2e-3], ['力矩越限', -0.1], ['跟踪误差', -0.1], ['动作越界', -1.0]],
    feet: [['腾空时间', 0.05], ['抬脚高度', -0.25], ['两脚间距', 0.5], ['两膝间距', 1.0], ['脚掌贴地', -2.0], ['两脚平行', -3.0],
      ['绊脚', -1.5], ['只有一只脚着地', 0.75], ['打滑', -0.25], ['触地力', -2.5e-4], ['触地动量', 2.5e-4], ['站着别动', -0.15]]
  };
  /* 表 VIII 与第 III-B 节：训练用的几个关键数 */
  var PARAMS = { hWalk: 0.74, hMin: 0.24, vx: [-0.8, 1.2], vy: [-0.5, 0.5], yaw: [-0.8, 0.8], upperDt: 1, cmdDt: 4, envs: 4096, episode: 20 };
  /* 部署（附录 C、第 IV-C 节）：Wi-Fi 一包 128 字节（32 个 float32），延迟 16 ms；手臂目标 10 Hz、每个插 50 次；π_loco 在 Orin 上 50 Hz */
  var DEPLOY = { bytes: 128, floats: 32, ms: 16, armHz: 10, interp: 50, locoHz: 50, tops: 275, cam: '640×480 约 30 Hz' };

  // ─── 官方代码里的数（OpenHomie：HomieRL 的 g1_29dof_config.py、legged_robot.py、him_ppo.py；HomieDeploy） ─────
  /* 一步观测 76 维 = 命令 4（vx、vy、偏航角速度、高度）+ 角速度 3 + 重力 3 + 关节角 27 + 关节速度 27 + 上一步下肢动作 12；叠 6 步 = 456 */
  var OBS = [['命令 $C_t$', 4, 'cmd'], ['角速度 $\\omega_t$', 3, 'imu'], ['重力 $g_t$', 3, 'imu'], ['关节角 $q_t$', 27, 'q'], ['关节速度 $\\dot q_t$', 27, 'q'], ['上一步动作 $a_{t-1}$', 12, 'act']];
  var OBS_DIM = 76, HIST = 6, N_JOINT = 27, N_LOWER = 12, N_UPPER = 15;
  /* 网络（附录 A 与 him_actor_critic.py）：估计器 456 → 256 → 256 → 35（3 维速度 + 32 维潜变量）；动作网络 35 + 76 = 111 → 512 → 256 → 256 → 12；
     价值网络 79（76 + 机身线速度 3）→ 512 → 256 → 256 → 1 */
  var NET = { est: [456, 256, 256, 35], actor: [111, 512, 256, 256, 12], critic: [79, 512, 256, 256, 1], proto: 64 };
  /* 课程：λ = 20 (1 − 0.99 ρ_a)（论文式 2、3 写 20 (1 − ρ_a)）；ρ_a 每次 +0.05 */
  function lam(r, paper) { return 20 * (1 - (paper ? 1 : 0.99) * r); }
  function density(x, r, paper) { var L = lam(r, paper); return L < 1e-9 ? 1 : L * Math.exp(-L * x) / (1 - Math.exp(-L)); }
  function meanRho(r, paper) { var L = lam(r, paper); return L < 1e-9 ? 0.5 : 1 / L - 1 / (Math.exp(L) - 1); }
  function sampleRho(r, u, paper) { var L = lam(r, paper); return L < 1e-9 ? u : -Math.log(1 - u + u * Math.exp(-L)) / L; }
  /* r_knee（代码 _reward_deviation_knee_joint）：膝角按硬限位 [−0.0873, 2.8798] rad 归一化 */
  var KNEE = { lo: -0.087267, hi: 2.8798, w: -0.75 };
  function kneeN(q) { return (q - KNEE.lo) / (KNEE.hi - KNEE.lo); }
  function rKnee(e, qL, qR) { return -(Math.abs((kneeN(qL) - 0.5) * e) + Math.abs((kneeN(qR) - 0.5) * e)); }
  /* 我们的复现（不是论文的实验）：官方 deploy.onnx 在 MuJoCo 里 200 段 × 20 s，随机命令 + ρ_a → 1 的随机上身，部署增益 */
  var OURS = { n: 200, full: 174, alive: 18.43, lin: 0.087, ang: 0.204, h: 0.0045, sym: 0.0044, symN: 3472 };
  /* 例：只抬左臂站着时，观测镜像前后的动作（左髋俯仰 ↔ 右髋俯仰） */
  var SYM_EX = { a: [-1.050, -0.349, -0.358, 1.212, -0.124, -0.029, -0.748, 0.262, 0.543, 1.585, 0.305, 0.090],
    af: [-0.758, -0.272, -0.540, 1.583, 0.319, -0.097, -1.049, 0.346, 0.362, 1.208, -0.117, 0.017], loss: 0.00071 };

  // ─── 本笔记的复现数据：在 MuJoCo 里跑官方 deploy.onnx 的五段动作（15 fps，和贴图表一帧对一帧） ─────────
  /* 每帧 24 个小端 int16：根部 x、y、z（mm）、偏航（mrad）、高度 h = 骨盆 z − 较低那只脚的踝 z（mm）、命令的目标高度（mm）、
     命令 vx（mm/s）、左膝、右膝（mrad）、上身 15 个关节的目标角（mrad：腰偏航、左臂 7、右臂 7） */
  var SEQ = {
    walk: { n: 45, data: 'HAXF//kCEgDXAuQC9AG/A3cCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAOwXN//kCIADXAuQC9AF2AxcCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAZAXa/+0C/P/QAuQC9AHdAuoCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAggXe//IC2//RAuQC9AHUAngDAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAnQXa//cCyv/VAuQC9AGfArMDAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAxAXP//oCuP/YAuQC9AE4ArQDAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAA5AXE//UCwP/QAuQC9AEhArECAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAAga7/+4C4P/OAuQC9AEqA/UCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAKQa5//QCAADSAuQC9AGvA8MCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAARga+//gCEADWAuQC9AHNA3sCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAZgbG//kCHgDWAuQC9AF1AxoCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAkAbT/+0C+f/PAuQC9AHfAu4CAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAArQbW//IC2f/QAuQC9AHQAn0DAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAyAbS//cCx//VAuQC9AGbArIDAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAA7gbH//kCuP/XAuQC9AE2AqkDAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAADQe8//MCw//SAuQC9AFIArACAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAALAez/+8C5f/PAuQC9AE+A/UCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAUgey//UCAgDTAuQC9AGxA7sCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAcAe3//kCFADXAuQC9AHGA28CAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAkQfA//kCIgDWAuQC9AFbAw0CAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAugfM/+0C+v/OAuQC9AHiAgUDAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAA1wfO//IC3P/RAuQC9AHKAogDAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAA8gfK//cCzP/VAuQC9AGYArwDAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAGQi+//kCv//XAuQC9AEyAqQDAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAOAiz//ICzf/SAuQC9AFjArcCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAVgir//AC7P/PAuQC9AFNA/ECAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAfAir//YCBwDUAuQC9AGxA7UCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAmgix//kCGQDXAuQC9AHBA2kCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAugi6//gCJQDWAuQC9AFEAwcCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAA4wjG/+0C+v/OAuQC9AHmAhYDAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAA/wjI//MC3P/RAuQC9AHGAosDAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAGwnD//cCy//VAuQC9AGQArsDAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAQgm4//oCvf/XAuQC9AEkApYDAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAYQmt//ACz//TAuQC9AF1Aq0CAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAfwml/+8C8v/PAuQC9AFSA/ICAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAApQmn//YCDQDUAuQC9AG2A7ACAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAwgmu//kCHgDXAuQC9AHDA2ECAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAA4wm3//gCKQDVAuQC9AEsAwYCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAACwrD/+0C+//OAuQC9AHoAiQDAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAJwrF//MC3//SAuQC9AHDAo8DAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAQwrA//gC0P/WAuQC9AGNArcDAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAagq1//oCwv/XAuQC9AEgAo4DAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAiQqq//AC1v/UAuQC9AGFAq0CAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAApgqj//AC+v/PAuQC9AFZA+sCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAywql//cCFwDVAuQC9AGwA6UCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAA' },
    squat: { n: 90, data: '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tv8CAPIC5f/PAuQCAACtAqsCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAuf8CAPIC5f/PAuQCAACwAqwCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAvv8CAPIC5v/PAuQCAACzAq4CAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAwf8CAPIC5v/PAuQCAAC0Aq8CAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAw/8CAPIC5v/PAuQCAAC1Aq8CAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAxv8CAPIC5v/PAuQCAAC2Aq8CAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAx/8CAPIC5//PAuQCAAC2Aq8CAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAx/8CAPIC5//PAuQCAAC1Aq8CAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAx/8CAPIC5//PAuQCAAC0Aq4CAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAx/8CAPIC5//QAuQCAACzAq4CAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAxv8CAPIC5//QAuQCAACxAq0CAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAxv8CAPIC5//QAuQCAACwAqwCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAxf8CAPIC5//QAuQCAACvAqwCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAxP8CAPIC5//QAuQCAACuAqsCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAAw/8CAPIC5//QAuQCAACtAqsCAAD6AJYAAACEAwAAAAAAAPoAav8AAIQDAAAAAAAA' },
    upper: { n: 60, data: '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' },
    upper_low: { n: 30, data: 'kwD+/+0CGgDNAuQCLAH3AuUCVABxAaIAGQDs/zYA//9oAPT/AgAdAPb/4f/h/93/oQD8//ECLQDQAuQCLAFWA8cCRwBaAZUAFgD0/zMA/f9iAPr/AQAaAPT/5v/y/+D/sgACAPYCRADUAuQCLAFOA3sCNQA7AYMAEwAAADAA+v9ZAAEAAAAXAPL/7P8KAOP/wAAIAPACQQDSAuQCLAHOApkCKAAkAXYAEAAIAC4A+P9TAAcA//8UAPH/8f8bAOb/0QAPAPACMwDPAuQCLAHiAgkDGgAMAWkADgAQACsA9v9MAAwA/v8RAPD/9v8tAOn/6AAOAPUCJwDTAuQCLAGcAk8DCQDtAFgACgAcACgA8/9EABQA/f8NAO7//f9FAO3/+wALAPUCHwDTAuQCLAFiAvsC+//WAEsACAAkACUA8f89ABkA/P8KAOz/AgBWAPD/DQEGAO4CMwDPAuQCLAHpAtsC7v++AD0ABQAtACMA7v83AB8A/P8HAOv/BwBoAPP/JQEGAPECRADQAuQCLAFhA8YC3P+fACwAAgA4AB8A6/8uACYA+v8DAOn/DgB/APf/NgEMAPQCUQDSAuQCLAF3A5MCz/+IAB8A//9AAB0A6f8oACwA+v8AAOj/EwCRAPr/RwETAPECVADOAuQCLAG6AoQCwf9xABIA/P9JABoA5/8iADEA+f/+/+b/GACjAPz/XgEdAO4CQADNAuQCLAHlAhsDsP9SAAAA+f9UABcA5P8ZADkA+P/6/+T/HwC6AAAAbgEeAPMCOQDRAuQCLAG7AlIDov86APP/9v9dABUA4v8TAD4A9//3/+P/JADMAAMAfgEbAPQCMQDSAuQCLAGLAiYDlf8jAOb/9P9lABIA4P8MAEQA9v/0/+L/KQDdAAYAlgEVAO0CRADMAuQCLAHYAvECg/8EANX/8P9wAA8A3f8EAEsA9f/w/+D/MAD1AAoAqAEVAO4CSgDMAuQCLAEPA+YCff/w/8z/7v9zABAA3P8AAE4A9P/m/97/MgD8AAgAuQEZAPACUgDOAuQCLAEjA7gChf/i/83/7P9rABcA3v8AAEkA9f/O/93/MADvAP3/0QEgAO0CTwDLAuQCLAH5As0CkP/Q/83/6v9hACAA4f8BAEMA9v+u/9v/LQDdAO//4wEkAO0CTQDLAuQCLAHwAu0CmP/D/87/6P9ZACcA5P8BAD8A9/+W/9r/KgDPAOT/9gEkAOwCSwDKAuQCLAHUAv4CoP+1/87/5/9RAC4A5v8CADoA+P9+/9j/KADCANn/EQIhAOwCVwDKAuQCLAHuAvoCq/+j/8//5P9HADgA6f8CADQA+P9d/9b/JACwAMv/JQIiAO0CYwDLAuQCLAEiA9kCs/+V/9D/4/8/AD8A7P8DADAA+f9F/9X/IgCiAMD/OAImAO0CdQDLAuQCLAEuA6gCvP+I/9D/4f83AEYA7v8DACsA+v8t/9P/HwCUALX/UgIvAOwCbQDKAuQCLAEGAxMDxv92/9H/3/8sAE8A8f8EACUA+/8N/9L/HACCAKb/ZQIyAPACaADOAuQCLAHfAmUDz/9o/9L/3f8lAFYA8/8EACEA/P/1/tD/GQB1AJz/eAIxAPICYADQAuQCLAGzAoED1/9b/9L/2/8dAF0A9v8FAB0A/P/d/s//FwBnAJH/kgIsAOwCZQDNAuQCLAG9AtMC4v9J/9P/2f8SAGcA+f8FABcA/f+9/s3/EwBVAIL/pQIoAO0CcQDLAuQCLAErA+oC6v87/9T/1/8KAG4A+/8GABIA/v+l/sv/EQBIAHf/tQIrAPECegDPAuQCLAF2A8AC8v8u/9T/1f8DAHUA/v8GAA4A//+M/sr/DgA6AG3/yQIzAPQCigDSAuQCLAE/A4AC/f8c/9X/0//4/34AAQAHAAgAAABs/sj/CwAoAF7/' },
    stand_arms: { n: 45, data: 'xv////ICBwDPAuQCAACoArACAABI/rQAtADQAgAAAAAAALD/av8AAIQDAAAAAAAAxf////ICCADPAuQCAACoArECAAAD/rcAxgC+AgAAAAAAAI//av8AAIQDAAAAAAAAxP////ICCADPAuQCAACpArICAACn/bsA3gCmAgAAAAAAAGP/av8AAIQDAAAAAAAAw/////ECCADPAuQCAACpArICAABi/b4A8ACUAgAAAAAAAEL/av8AAIQDAAAAAAAAwv/+//ECCADPAuQCAACpArMCAAAd/cEAAgGCAgAAAAAAACH/av8AAIQDAAAAAAAAwf/+//ECCADPAuQCAACpArMCAADB/MUAGgFqAgAAAAAAAPX+av8AAIQDAAAAAAAAwP/+//ECCADPAuQCAACpArQCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAwP/+//ECCADPAuQCAAClArQCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAwP/+//ICCADPAuQCAACiArUCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAwP/9//ICCQDPAuQCAACiArYCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAv//9//ECCgDPAuQCAAChArYCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAvv/9//ECCgDPAuQCAAChArYCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAvf/9//ECCgDPAuQCAAChArYCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAvP/9//ECCgDPAuQCAACgArYCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAu//9//ECCgDPAuQCAACfArUCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAu//9//ECCgDPAuQCAACfArUCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAuv/9//ECCgDPAuQCAACeArUCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAuf/9//ECCgDPAuQCAACeArYCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAuf/9//ECCgDPAuQCAACeArYCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAuf/9//ECCgDPAuQCAACeArYCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAuf/9//ECCgDPAuQCAACeArYCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAuf/9//ECCgDPAuQCAACeArYCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAuf/9//ECCADPAuQCAACdArcCAACg/MUAGgFqAgAAAAAAALD+Z//u/3IDAAAAAAAAuP/9//ECBQDPAuQCAACcArkCAADQ/MEAAgGCAgAAAAAAAID+Y//W/1oDAAAAAAAAuP/9//ECBADPAuQCAACcArkCAAD0/L4A8ACUAgAAAAAAAFz+YP/E/0gDAAAAAAAAuP/9//ECBADPAuQCAACcArkCAAAY/bsA3gCmAgAAAAAAADj+Xf+y/zYDAAAAAAAAuP/8//ECBgDPAuQCAACcArgCAABI/bcAxgC+AgAAAAAAAAj+Wf+a/x4DAAAAAAAAuP/8//ECBgDPAuQCAACdArgCAABs/bQAtADQAgAAAAAAAOT9Vv+I/wwDAAAAAAAAuP/8//ECBgDPAuQCAACdArgCAACQ/bEAogDiAgAAAAAAAMD9U/92//oCAAAAAAAAuP/9//ECBQDPAuQCAACeArgCAADA/a0AigD6AgAAAAAAAJD9T/9e/+ICAAAAAAAAuf/8//ECBQDPAuQCAACfArgCAADk/aoAeAAMAwAAAAAAAGz9TP9M/9ACAAAAAAAAuf/8//ECBQDPAuQCAACfArcCAAAI/qcAZgAeAwAAAAAAAEj9Sf86/74CAAAAAAAAuf/8//ECBADPAuQCAACfArcCAAA4/qMATgA2AwAAAAAAABj9Rf8i/6YCAAAAAAAAuf/8//ECBADPAuQCAACfArcCAABc/qAAPABIAwAAAAAAAPT8Qv8Q/5QCAAAAAAAAuf/8//ECBADPAuQCAACgArYCAACA/p0AKgBaAwAAAAAAAND8P//+/oICAAAAAAAAuf/8//ECAwDPAuQCAACgArUCAACw/pkAEgByAwAAAAAAAKD8O//m/moCAAAAAAAAuf/9//ECAwDPAuQCAACgArUCAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAuf/8//ECBADPAuQCAACiArMCAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAuP/8//ECBQDPAuQCAACkArECAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAuP/9//ECBQDPAuQCAACkArECAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAt//9//ECBADPAuQCAACkArECAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAt//+//ECAQDPAuQCAACkArECAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAt//+//ECAQDPAuQCAACkArECAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAuP/+//ECAQDPAuQCAACkArECAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAuP/+//ECAQDPAuQCAAClArECAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAA' }
  };
  /* 贴图表：R 像素/米，yaw / pitch 是正交相机，cw × ch 一格，(ax, ay) 是根部正下方地面点在格子里的位置 */
  var SHEETS = {
    walk: { file: 'g1_walk.webp', R: 220, yaw: 1.0, pitch: 0.1, cw: 138, ch: 302, cols: 12, n: 45, ax: 57.5, ay: 288.5 },
    squat: { file: 'g1_squat.webp', R: 220, yaw: 0.7, pitch: 0.1, cw: 164, ch: 298, cols: 12, n: 90, ax: 44.0, ay: 286.8 },
    upper: { file: 'g1_upper.webp', R: 220, yaw: 1.0, pitch: 0.1, cw: 213, ch: 336, cols: 12, n: 60, ax: 123.5, ay: 323.2 },
    upper_low: { file: 'g1_upper_low.webp', R: 220, yaw: 1.0, pitch: 0.1, cw: 141, ch: 301, cols: 12, n: 30, ax: 49.1, ay: 287.7 },
    stand_arms: { file: 'g1_stand_arms.webp', R: 220, yaw: 1.0, pitch: 0.1, cw: 156, ch: 297, cols: 12, n: 45, ax: 43.2, ay: 286.8 }
  };
  var PER = 24;
  function decode(b64) {
    var bin = atob(b64), n = bin.length >> 1, out = new Int16Array(n);
    for (var i = 0; i < n; i++) out[i] = (bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8)) << 16 >> 16;
    return out;
  }
  var CACHE = {};
  function frame(key, i) {
    var S = SEQ[key], k = clamp(Math.round(i), 0, S.n - 1);
    if (!CACHE[key]) CACHE[key] = { raw: decode(S.data), fr: [] };
    var C = CACHE[key];
    if (!C.fr[k]) {
      var a = C.raw, o = k * PER, up = [];
      for (var j = 0; j < N_UPPER; j++) up.push(a[o + 9 + j] / 1000);
      C.fr[k] = { k: k, root: [a[o] / 1000, a[o + 1] / 1000, a[o + 2] / 1000], yaw: a[o + 3] / 1000, h: a[o + 4] / 1000, hcmd: a[o + 5] / 1000,
        vx: a[o + 6] / 1000, knee: [a[o + 7] / 1000, a[o + 8] / 1000], upper: up };
    }
    return C.fr[k];
  }
  /* 「🚶 具体实例」例 3：下蹲那段的第 8 帧（第 0.53 s，命令刚从 0.74 m 换成 0.40 m）与第 60 帧（第 4.0 s，命令换回 0.74 m） */
  var EX_DOWN = 8, EX_UP = 60;

  // ─── 讲解动画：十七幕 ───────────────────────────────────────────────────────
  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    paint = K.paint,
    seg = K.seg,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
    polyPath = K.polyPath;

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_PURPLE = X.purple,
    C_MUTED = X.muted,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2;
  /* 全片的配色：下半身（踏板 → π_loco）蓝、上半身（外骨骼 → q_upper）黄、高度紫、HOMIE 绿、对手红 */
  var C_LOW = C_ACCENT, C_UP = C_WARN, C_H = C_PURPLE, C_HOMIE = C_GOOD;

  /* 视频里一幕要讲一分钟左右，画面不能停：draw(t, clock) 的 clock 是这一幕的真实时间
     （旁白比分镜长时 t 停在一段的末尾，clock 照走），G1 的走路、下蹲按 clock 播；网页播放器只传 t。
     各幕的 cue 时刻都落在 0.4 / 3.6 / 7.0 / 10.4 / 13.4，一次性的出场动画不跨过这些时刻。 */
  function nowOf(t, clock) {
    return clock == null ? t : clock;
  }
  /* 一段窗口：a 之后 0.3 s 起淡入 0.4 s，到 b 才开始淡出 0.3 s（先淡出再淡入，两层字不交叉）。
     淡出必须落在 b 之后：视频里旁白比分镜长时，stage.html 把 t 停在 b 前一点（AGENTS.md「面板到 cue 之后才淡出」） */
  function win(t, a, b) {
    return seg(t, a + 0.3, a + 0.7) * (b == null ? 1 : 1 - seg(t, b, b + 0.3));
  }
  /* 一幕里从 cue 起算的真实秒数：网页上就是 t − cue；视频里旁白比分镜长时 t 会停，改按 clock 走 */
  function since(t, clock, cue) {
    return clock == null ? t - cue : Math.max(0, clock - cue);
  }
  function group(parent) {
    var g = svgEl('g', {});
    parent.appendChild(g);
    return g;
  }
  function rectBox(parent, x, y, w, h, stroke, fill, dash) {
    var r = paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 7, 'stroke-width': 1.3 }), fill || C_SURFACE, stroke || C_BORDER);
    if (dash) r.setAttribute('stroke-dasharray', dash);
    parent.appendChild(r);
    return r;
  }
  function chip(parent, x, y, w, str, color, opts) {
    var o = opts || {};
    var g = group(parent), h = o.h || 28;
    rectBox(g, x, y, w, h, color, o.fill || C_SURFACE, o.dash);
    g.appendChild(svgRich(x + (o.left ? 10 : w / 2), y + h / 2 + 4, str, { size: o.size || 11.5, anchor: o.left ? 'start' : 'middle', w: w - 12, cls: o.cls || 'demo-x-ink2' }));
    if (o.strike) g.appendChild(paint(svgEl('line', { x1: x + 6, y1: y + h / 2, x2: x + w - 6, y2: y + h / 2, 'stroke-width': 2 }), null, C_BAD));
    return g;
  }
  function fmtPath(pts2) {
    return pts2.length ? polyPath(pts2.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })) : 'M 0 0';
  }
  function pathLine(parent, pts2, color, width, dash) {
    var p = paint(svgEl('path', { d: fmtPath(pts2), fill: 'none', 'stroke-width': width || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }), null, color);
    if (dash) p.setAttribute('stroke-dasharray', dash);
    parent.appendChild(p);
    return p;
  }
  function setPath(p, pts2) {
    p.setAttribute('d', fmtPath(pts2));
  }
  function dotAt(parent, cx, cy, r, color) {
    var c = paint(svgEl('circle', { cx: cx, cy: cy, r: r }), color);
    parent.appendChild(c);
    return c;
  }
  function moveDot(c, x, y) {
    c.setAttribute('cx', x.toFixed(1));
    c.setAttribute('cy', y.toFixed(1));
  }
  function hline(parent, x1, y1, x2, y2, color, w, dash) {
    var l = paint(svgEl('line', { x1: x1, y1: y1, x2: x2, y2: y2, 'stroke-width': w || 1.2 }), null, color);
    if (dash) l.setAttribute('stroke-dasharray', dash);
    parent.appendChild(l);
    return l;
  }
  function setLine(l, x1, y1, x2, y2) {
    l.setAttribute('x1', x1.toFixed(1)); l.setAttribute('y1', y1.toFixed(1));
    l.setAttribute('x2', x2.toFixed(1)); l.setAttribute('y2', y2.toFixed(1));
  }
  function hbar(parent, x, y, h, color, opacity) {
    var r = paint(svgEl('rect', { x: x, y: y, width: 0, height: h, rx: 2.5, opacity: opacity == null ? 0.9 : opacity }), color);
    parent.appendChild(r);
    return r;
  }
  function setW(node, w) {
    node.setAttribute('width', Math.max(0, w).toFixed(1));
  }
  function vbar(parent, x, w, color, opacity) {
    var r = paint(svgEl('rect', { x: x, y: 0, width: w, height: 0, rx: 2, opacity: opacity == null ? 0.9 : opacity }), color);
    parent.appendChild(r);
    return { node: r, set: function (y0, h) { r.setAttribute('y', (y0 - Math.max(0, h)).toFixed(1)); r.setAttribute('height', Math.max(0, h).toFixed(1)); } };
  }
  function label(parent, x, y, str, cls, size, anchor) {
    var n = svgText(x, y, str, cls || 'demo-x-ink2', size || 11, anchor);
    parent.appendChild(n);
    return n;
  }
  function tone(parent, x, y, str, color, size, anchor) {
    var n = paint(svgText(x, y, str, null, size || 11, anchor), color);
    parent.appendChild(n);
    return n;
  }
  function rich(parent, x, y, str, size, cls, anchor, w) {
    var n = svgRich(x, y, str, { size: size || 12, cls: cls || 'demo-x-ink2', anchor: anchor || 'start', w: w });
    parent.appendChild(n);
    return n;
  }
  function math(parent, x, y, tex, size, anchor) {
    var n = svgMath(x, y, tex, { size: size || 14, anchor: anchor || 'start' });
    parent.appendChild(n);
    return n;
  }
  function arrowHead(parent, color) {
    var p = paint(svgEl('path', { d: 'M 0 0', 'stroke-width': 0 }), color);
    parent.appendChild(p);
    return {
      node: p,
      set: function (x1, y1, x2, y2, size) {
        var a = Math.atan2(y2 - y1, x2 - x1), s = size || 8;
        var p1 = [x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45)], p2 = [x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)];
        p.setAttribute('d', 'M ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' L ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' L ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + ' Z');
      }
    };
  }
  /* 一支箭：线 + 箭头 */
  function arrow(parent, color, width, dash) {
    var g = group(parent), l = hline(g, 0, 0, 0, 0, color, width || 2.4, dash), h = arrowHead(g, color);
    return {
      g: g,
      set: function (x1, y1, x2, y2, size) { setLine(l, x1, y1, x2, y2); h.set(x1, y1, x2, y2, size || 9); }
    };
  }
  function arrowAt(parent, x1, y1, x2, y2, color, width, dash) {
    var a = arrow(parent, color, width, dash);
    a.set(x1, y1, x2, y2);
    return a;
  }
  /* 论文图的一块：图片 imgW × imgH 像素，按比例裁出 (u0, v0)–(u1, v1)，宽度为 w（高按比例）摆到 (x, y)，白底；返回实际高 */
  function figPart(parent, file, imgW, imgH, u0, v0, u1, v1, x, y, w, caption) {
    var g = group(parent), cw = (u1 - u0) * imgW, chh = (v1 - v0) * imgH, h = w * chh / cw;
    g.appendChild(svgEl('rect', { x: (x - 3).toFixed(1), y: (y - 3).toFixed(1), width: (w + 6).toFixed(1), height: (h + 6).toFixed(1), rx: 5, fill: '#ffffff', stroke: 'none' }));
    var box = svgEl('svg', { x: x.toFixed(1), y: y.toFixed(1), width: w.toFixed(1), height: h.toFixed(1), overflow: 'hidden', preserveAspectRatio: 'none',
      viewBox: [(u0 * imgW).toFixed(1), (v0 * imgH).toFixed(1), cw.toFixed(1), chh.toFixed(1)].join(' ') });
    box.appendChild(svgEl('image', { href: PAPER_IMG_BASE + file, x: 0, y: 0, width: imgW, height: imgH, preserveAspectRatio: 'none' }));
    g.appendChild(box);
    if (caption) g.appendChild(svgText(x + w / 2, y + h + 17, caption, 'demo-x-mut', 9.5, 'middle'));
    return { g: g, h: h, x: x, y: y, w: w };
  }
  var FIGS = {
    fig1: ['fig1_tasks.webp', 1501, 805],
    fig2: ['fig2_overview.webp', 1501, 589],
    fig5: ['fig5_exo.webp', 1700, 542],
    fig6: ['fig6_pedal.webp', 900, 447],
    fig7: ['fig7_ablation.webp', 1701, 794],
    fig8: ['fig8_g1gr1.webp', 800, 602],
    fig9: ['fig9_hands.webp', 1301, 342],
    fig17: ['fig17_terrain.webp', 1401, 236],
    fig20: ['fig20_glove.webp', 1400, 710]
  };
  function paperPart(parent, key, u0, v0, u1, v1, x, y, w, caption) {
    var F = FIGS[key];
    return figPart(parent, F[0], F[1], F[2], u0, v0, u1, v1, x, y, w, caption);
  }
  /* 项目页的一段视频：深色底框，下面一行小字写出处；draw 里调 .at(秒, 是否可见) */
  function projClip(parent, id, x, y, w, h, caption, opts) {
    var o = opts || {}, g = group(parent);
    g.appendChild(svgEl('rect', { x: (x - 2).toFixed(1), y: (y - 2).toFixed(1), width: (w + 4).toFixed(1), height: (h + 4).toFixed(1), rx: 5, fill: '#111111', stroke: 'none' }));
    var c = K.svgClip(x, y, w, h, CLIP_BASE + id + '.mp4', { poster: CLIP_BASE + id + '.webp' });
    g.appendChild(c);
    if (caption) label(g, o.capX == null ? x + w / 2 : o.capX, y + h + (o.capDy || 17), caption, 'demo-x-mut', o.capSize || 9.5, o.capAnchor || 'middle');
    return { g: g, x: x, y: y, w: w, h: h, at: function (sec, vis) { c.at(sec, vis); } };
  }
  /* 三维 → 画布：z 朝上；绕竖轴转 yaw、抬头 pitch 的正交投影。cam = { yaw, pitch, s(像素/米), ox, oy, cx, cy }：
     (cx, cy) 是地面上对准画布 (ox, oy) 的那一点。G1 的贴图是同一套相机离线渲染的 */
  function project(p, cam) {
    var dx = p[0] - (cam.cx || 0), dy = p[1] - (cam.cy || 0);
    var c = Math.cos(cam.yaw || 0), s = Math.sin(cam.yaw || 0);
    var xr = dx * c + dy * s, depth = -dx * s + dy * c;
    var cp = Math.cos(cam.pitch || 0), sp = Math.sin(cam.pitch || 0);
    return [cam.ox + cam.s * xr, cam.oy - cam.s * (p[2] * cp + depth * sp), depth];
  }
  /* 相机跟着根部走：G1 一直站在 (ox, oy) */
  function followCam(key, f, s, ox, oy) {
    var M = SHEETS[key];
    return { yaw: M.yaw, pitch: M.pitch, s: s, ox: ox, oy: oy, cx: f.root[0], cy: f.root[1] };
  }
  /* 一台 G1：贴图表里的一格；put(root, cam, 帧号) 摆到根部正下方的地面点。贴图第一次用到才设 href。
     opts.mirror 水平翻转（第 8 幕的镜像） */
  function g1Mesh(parent, key, opts) {
    var o = opts || {}, M = SHEETS[key], g = group(parent), rows = Math.ceil(M.n / M.cols);
    g.setAttribute('class', 'demo-x-g1mesh');
    var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: 0, height: 0 });
    var img = svgEl('image', { x: 0, y: 0, width: M.cw * M.cols, height: M.ch * rows, preserveAspectRatio: 'none' });
    box.appendChild(img);
    var holder = group(g);
    holder.appendChild(box);
    if (o.ghost) g.style.opacity = o.ghost;
    var woke = false, lastF = -1;
    return {
      g: g,
      put: function (root, cam, fr) {
        if (!woke && G1_3D_BASE) { woke = true; img.setAttribute('href', G1_3D_BASE + M.file); }
        var k = cam.s / M.R, a = project([root[0], root[1], 0], cam);
        var f = clamp(Math.round(fr || 0), 0, M.n - 1);
        var x = a[0] - M.ax * k, w = M.cw * k;
        /* 镜像：绕根部正下方那条竖线水平翻转 */
        if (o.mirror) holder.setAttribute('transform', 'translate(' + (2 * a[0]).toFixed(1) + ' 0) scale(-1 1)');
        box.setAttribute('x', x.toFixed(1));
        box.setAttribute('y', (a[1] - M.ay * k).toFixed(1));
        box.setAttribute('width', w.toFixed(1));
        box.setAttribute('height', (M.ch * k).toFixed(1));
        if (f !== lastF) {
          box.setAttribute('viewBox', [(f % M.cols) * M.cw, Math.floor(f / M.cols) * M.ch, M.cw, M.ch].join(' '));
          lastF = f;
        }
      }
    };
  }
  /* 一段动作循环播放：帧号 = clock × 15，取余 */
  function loopK(key, now, start) {
    var n = SEQ[key].n;
    return ((Math.floor((start || 0) + now * 15) % n) + n) % n;
  }
  /* 地上的刻度：每 0.5 m 一道，随根部后退，表示在往前走 */
  function groundTicks(parent, x1, x2, y, key) {
    var g = group(parent);
    hline(g, x1, y, x2, y, C_BORDER, 1.4);
    var ticks = [];
    for (var i = 0; i < 9; i++) ticks.push(hline(g, 0, 0, 0, 0, C_BORDER, 2));
    return {
      g: g,
      put: function (f, cam) {
        var base = Math.round(f.root[0] / 0.5) * 0.5;
        ticks.forEach(function (tk, i) {
          var p = project([base + (i - 4) * 0.5, f.root[1], 0], cam);
          var on = p[0] > x1 + 4 && p[0] < x2 - 10;
          setLine(tk, p[0], y, p[0] + 9, y + 5);
          tk.style.opacity = on ? 1 : 0;
        });
      }
    };
  }
  /* 一台会动的 G1：key 那段动作循环播，相机跟着根部；返回这一帧 */
  function g1Actor(parent, key, s, ox, oy, opts) {
    var o = opts || {}, g = group(parent);
    var ground = o.ground === false ? null : groundTicks(g, ox - (o.gw || 90), ox + (o.gw || 90), oy, key);
    var mesh = g1Mesh(g, key, o);
    return {
      g: g, mesh: mesh,
      put: function (k) {
        var f = frame(key, k), cam = followCam(key, f, s, ox, oy);
        if (ground) ground.put(f, cam);
        mesh.put(f.root, cam, f.k);
        return { f: f, cam: cam };
      }
    };
  }
  function f1(x) { return fmt(x, 1); }
  function f2(x) { return fmt(x, 2); }
  function f3(x) { return fmt(x, 3); }
  /* 排版用的负号 */
  function sgn(s) { return String(s).replace(/-/g, '−'); }
  /* 横向条形图的一行：标签、条、数字 */
  function barRowAt(parent, x, y, labelW, str, color, h) {
    var g = group(parent);
    label(g, x + labelW - 8, y + (h || 14) / 2 + 4, str, 'demo-x-ink2', 10.5, 'end');
    var b = hbar(g, x + labelW, y, h || 14, color);
    var v = label(g, x + labelW + 6, y + (h || 14) / 2 + 4, '', 'demo-x-ink', 10.5);
    return {
      g: g,
      set: function (w, txt) { setW(b, w); v.setAttribute('x', (x + labelW + Math.max(0, w) + 6).toFixed(1)); v.textContent = txt; }
    };
  }
  function legendRow(parent, x, y, items) {
    var g = group(parent), cx = x;
    items.forEach(function (it) {
      g.appendChild(paint(svgEl('rect', { x: cx, y: y - 9, width: 14, height: 10, rx: 2 }), it[1]));
      label(g, cx + 20, y, it[0], 'demo-x-mut', 10.5);
      cx += 28 + it[0].length * 11;
    });
    return g;
  }
  /* 一个小方框高亮（论文图上框出一块） */
  function hiBox(parent, color) {
    var r = paint(svgEl('rect', { x: 0, y: 0, width: 0, height: 0, rx: 5, fill: 'none', 'stroke-width': 2.4 }), null, color || C_BAD);
    parent.appendChild(r);
    return { node: r, set: function (x, y, w, h) { r.setAttribute('x', x.toFixed(1)); r.setAttribute('y', y.toFixed(1)); r.setAttribute('width', w.toFixed(1)); r.setAttribute('height', h.toFixed(1)); } };
  }

  /* ── scene 1: 两条路各缺一半 ── */
  function buildSceneTwoRoads() {
    var s = sceneSvg('左边一台 G1 在走路，代表强化学习的全身控制；中间一台 G1 站着只动手臂，代表只管上身的遥操作；右边先画货架示意够不着低处，再列出 HOMIE 的三件硬件，最后是论文图 1');
    s.appendChild(svgText(24, 26, '两条路各缺一半：会走的接不上遥操作，能遥操作的走不了', 'demo-x-ink2', 13.5));
    var pA = group(s);
    rectBox(pA, 16, 40, 248, 316);
    label(pA, 28, 62, '强化学习的全身控制', 'demo-x-ink', 13);
    label(pA, 28, 80, 'ExBody、HumanPlus、H2O、OmniH2O……', 'demo-x-mut', 10);
    var walk = g1Actor(pA, 'walk', 165, 140, 330, { gw: 100 });
    chip(pA, 16, 366, 248, '缺：实时、精确的遥操作接口', C_BAD, { size: 11.5 });
    var pB = group(s);
    rectBox(pB, 276, 40, 248, 316);
    label(pB, 288, 62, '只管上身的遥操作系统', 'demo-x-ink', 13);
    label(pB, 288, 80, 'OpenTelevision、AnyTeleop、GELLO……', 'demo-x-mut', 10);
    var arms = g1Actor(pB, 'stand_arms', 165, 400, 330, { gw: 100 });
    chip(pB, 276, 366, 248, '缺：走、蹲，工作空间被卡住', C_BAD, { size: 11.5 });
    /* 右栏：货架示意（不是论文的数），只动手臂够不着低处 */
    var pC = group(s);
    label(pC, 548, 62, '两头都吃亏', 'demo-x-ink', 13);
    var SX = 560, SY0 = 330, SH = 230;
    hline(pC, SX, SY0, SX + 200, SY0, C_BORDER, 1.4);
    [0.15, 0.55, 0.95].forEach(function (u, i) {
      var y = SY0 - u * SH;
      hline(pC, SX + 100, y, SX + 200, y, C_MUTED, 3);
      pC.appendChild(paint(svgEl('rect', { x: SX + 130, y: y - 22, width: 26, height: 20, rx: 3 }), [C_H, C_LOW, C_UP][i]));
    });
    hline(pC, SX + 200, SY0, SX + 200, SY0 - SH - 10, C_MUTED, 3);
    var band = paint(svgEl('rect', { x: SX + 40, y: SY0 - 0.85 * SH, width: 50, height: 0.42 * SH, rx: 5, opacity: 0.35 }), C_UP);
    pC.appendChild(band);
    label(pC, SX + 65, SY0 - 0.88 * SH, '只动手臂', 'demo-x-ink2', 10.5, 'middle');
    var band2 = paint(svgEl('rect', { x: SX + 40, y: SY0 - 0.98 * SH, width: 50, height: 0.95 * SH, rx: 5, opacity: 0.25 }), C_HOMIE);
    pC.appendChild(band2);
    var lowTag = label(pC, SX + 65, SY0 + 16, '加上下蹲、走路', 'demo-x-good', 10.5, 'middle');
    label(pC, 548, 396, '示意，不是论文的测量', 'demo-x-mut', 9.5);
    /* 右栏：HOMIE 的答案 */
    var pD = group(s);
    label(pD, 548, 62, 'HOMIE：一个驾驶舱', 'demo-x-ink', 13);
    chip(pD, 548, 82, 236, '脚 → 踏板 → 走、转、蹲', C_LOW, { size: 11.5, left: true, h: 34 });
    chip(pD, 548, 126, 236, '手臂 → 同构外骨骼 → 两臂关节角', C_UP, { size: 11.5, left: true, h: 34 });
    chip(pD, 548, 170, 236, '手指 → 体感手套 → 灵巧手', C_HOMIE, { size: 11.5, left: true, h: 34 });
    rich(pD, 548, 236, '下半身：强化学习策略 $\\pi_{loco}$', 11.5, 'demo-x-ink2');
    label(pD, 548, 258, '上半身：读数直接当关节角', 'demo-x-ink2', 11.5);
    label(pD, 548, 290, '一个人就能遥操作整台人形', 'demo-x-good', 12);
    label(pD, 548, 312, '硬件约 500 美元，代码开源', 'demo-x-mut', 11);
    /* 最后一段：论文图 1 盖住中、右两栏 */
    var pE = group(s);
    rectBox(pE, 276, 40, 508, 352, C_BORDER, C_SURFACE);
    var fig = paperPart(pE, 'fig1', 0, 0, 1, 1, 290, 54, 480);
    label(pE, 530, 54 + fig.h + 22, '论文图 1：蹲下拿低处的东西、两台机器人传苹果、推人、拉开烤箱……', 'demo-x-mut', 10, 'middle');
    label(pE, 530, 54 + fig.h + 42, 'RSS 2025 · 上海人工智能实验室、香港中文大学', 'demo-x-ink2', 11, 'middle');
    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(pA, win(t, 0.0));
      walk.put(loopK('walk', now));
      setOpacity(pB, win(t, 3.6, 13.4));
      arms.put(loopK('stand_arms', now));
      setOpacity(pC, win(t, 7.0, 10.4));
      var grow = seg(t, 8.2, 9.2);
      band2.style.opacity = 0.25 * grow;
      lowTag.style.opacity = grow;
      setOpacity(pD, win(t, 10.4, 13.4));
      setOpacity(pE, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 一个驾驶舱 ── */
  function buildSceneCockpit() {
    var s = sceneSvg('左边是项目页视频：操作员坐在驾驶舱里，脚踩踏板、手臂穿着外骨骼，旁边的 G1 跟着走、蹲、动手臂；右边是论文图 2 与四条信号通路，依次高亮踏板、外骨骼、第一视角画面、自主策略');
    s.appendChild(svgText(24, 26, '一个驾驶舱：脚踩踏板，手臂穿外骨骼，手戴手套', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'cockpit', 24, 44, 384, 216, '项目页视频（原速）：操作员遥操作 G1 走、蹲、动手臂');
    var rowsL = [
      chip(s, 24, 290, 384, '踏板 → $C_t = [v_x,\\ \\omega_{yaw},\\ h_t]$：前后速度、转向、躯干高度', C_LOW, { size: 11.5, left: true, h: 30 }),
      chip(s, 24, 328, 384, '外骨骼 → $q_{upper}$：读数直接设给上身，不解逆运动学', C_UP, { size: 11.5, left: true, h: 30 }),
      chip(s, 24, 366, 384, '手套 → 灵巧手：每只 15 个自由度', C_HOMIE, { size: 11.5, left: true, h: 30 })
    ];
    var R = 428;
    var pFig = group(s);
    var fig = paperPart(pFig, 'fig2', 0, 0, 1, 1, R, 46, 356, '论文图 2：(a) 驾驶舱与真机 / 仿真，(b) 策略');
    var Y0 = 46 + fig.h + 40;
    var rows = [
      { c: C_LOW, a: '踏板', b: '$\\pi_{loco}$（机载 Orin，50 Hz）→ 下肢 12 个关节' },
      { c: C_UP, a: '外骨骼 + 手套', b: '上身 15 个关节 + 灵巧手：直接设定' },
      { c: C_ACCENT, a: '头部相机', b: 'Wi-Fi 回传 → 舱内屏幕（第一视角）' },
      { c: C_HOMIE, a: '$\\pi_{auto}$', b: '学会之后替操作员给出 $C_t$ 与 $q_{upper}$' }
    ].map(function (r, i) {
      var g = group(s), y = Y0 + i * 46;
      chip(g, R, y, 104, r.a, r.c, { size: 11.5, h: 34 });
      arrowAt(g, R + 110, y + 17, R + 134, y + 17, r.c, 2);
      g.appendChild(svgRich(R + 140, y + 21, r.b, { size: 11.5, cls: 'demo-x-ink2', w: 216 }));
      return g;
    });
    function draw(t, clock) {
      clip.at(K.clipSince(t, 0), true);
      setOpacity(pFig, win(t, 0.0));
      rowsL.forEach(function (g, i) { setOpacity(g, win(t, i === 0 ? 3.6 : 7.0)); });
      var cues = [3.6, 7.0, 10.4, 13.4];
      rows.forEach(function (g, i) {
        var on = t >= cues[i] + 0.3;
        var next = i < 3 ? t >= cues[i + 1] + 0.3 : false;
        setOpacity(g, on ? (next ? 0.45 : 1) * seg(t, cues[i] + 0.3, cues[i] + 0.7) : 0);
      });
      void clock;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 表 I ── */
  function buildSceneTable1() {
    var s = sceneSvg('论文表 I：十一个遥操作系统的价格、手臂跟踪、灵巧手跟踪、能否移动操作、能否全身、是否不用动捕；按组依次高亮，最后是 HOMIE 一行');
    s.appendChild(svgText(24, 26, '表 I：和十个遥操作系统比', 'demo-x-ink2', 13.5));
    var COLS = [['系统', 40, 132, 'start'], ['价格（美元）', 178, 64, 'middle'], ['手臂', 252, 92, 'middle'], ['灵巧手', 350, 100, 'middle'],
      ['移动操作', 458, 70, 'middle'], ['全身', 532, 54, 'middle'], ['不用动捕', 594, 70, 'middle']];
    var Y0 = 52, RH = 24;
    var hi = paint(svgEl('rect', { x: 32, y: 0, width: 640, height: 0, rx: 5, opacity: 0.16 }), C_ACCENT);
    s.appendChild(hi);
    COLS.forEach(function (c) { label(s, c[3] === 'start' ? c[1] : c[1] + c[2] / 2, Y0, c[0], 'demo-x-ink', 11.5, c[3]); });
    hline(s, 32, Y0 + 7, 672, Y0 + 7, C_BORDER, 1.2);
    TABLE1.forEach(function (r, i) {
      var y = Y0 + 24 + i * RH, last = i === TABLE1.length - 1, cls = last ? 'demo-x-good' : 'demo-x-ink2';
      label(s, 40, y, r[0], last ? 'demo-x-good' : 'demo-x-ink', 11.5);
      label(s, 178 + 32, y, r[1], cls, 11, 'middle');
      label(s, 252 + 46, y, r[2], cls, 10.5, 'middle');
      label(s, 350 + 50, y, r[3] || '—', r[3] ? cls : 'demo-x-mut', 10.5, 'middle');
      [4, 5, 6].forEach(function (j, q) {
        var cx = [458 + 35, 532 + 27, 594 + 35][q];
        tone(s, cx, y, r[j] ? '✓' : '✗', r[j] ? C_GOOD : C_BAD, 13, 'middle');
      });
    });
    var groups = [[0, 4], [4, 7], [7, 10], [10, 11]];
    var notes = [
      '同构机械臂（Mobile-ALOHA、GELLO、AirExo、ACE）：关节匹配，准、快，但只有夹爪，也不管全身',
      '视觉 / VR（DexCap、AnyTeleop、OpenTelevision）：先估姿态再解逆运动学，延迟高、怕遮挡、有误差',
      '能全身移动操作的（HumanPlus、OmniH2O、Mobile-TeleVision）：训练要用动捕数据做动作先验',
      'HOMIE：手臂、手都是关节匹配，能移动操作、能全身、不用动捕，约 500 美元',
      '只有 HOMIE 一行全是勾；价格约是 Mobile-ALOHA 的 1/64、OpenTelevision 的 1/8'
    ].map(function (str) { return rich(s, 40, 360, str, 12, 'demo-x-ink2', 'start', 700); });
    var side = group(s);
    label(side, 690, 76, '每一列', 'demo-x-ink', 12);
    label(side, 690, 96, '手臂 / 灵巧手：', 'demo-x-mut', 10);
    label(side, 690, 114, '怎么拿到姿态', 'demo-x-mut', 10);
    label(side, 690, 136, '移动操作：边走', 'demo-x-mut', 10);
    label(side, 690, 154, '边操作', 'demo-x-mut', 10);
    label(side, 690, 176, '全身：遥操作', 'demo-x-mut', 10);
    label(side, 690, 195, '整台人形', 'demo-x-mut', 10);
    label(side, 690, 216, '不用动捕：训练', 'demo-x-mut', 10);
    label(side, 690, 235, '不靠动捕数据', 'demo-x-mut', 10);
    function draw(t) {
      var cues = [0.4, 3.6, 7.0, 10.4];
      var k = t < 3.6 ? 0 : t < 7.0 ? 1 : t < 10.4 ? 2 : t < 13.4 ? 3 : 4;
      var gr = groups[Math.min(k, 3)];
      hi.setAttribute('y', (Y0 + 24 + gr[0] * RH - 16).toFixed(1));
      hi.setAttribute('height', ((gr[1] - gr[0]) * RH).toFixed(1));
      hi.style.fill = k >= 3 ? C_GOOD : k === 2 ? C_WARN : C_ACCENT;
      hi.style.opacity = 0.16 * seg(t, 0.4, 0.8);
      notes.forEach(function (n, i) { setOpacity(n, win(t, i < 4 ? cues[i] : 13.4, i < 4 ? (i < 3 ? cues[i + 1] : 13.4) : null)); });
      setOpacity(side, seg(t, 0.4, 0.9));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 下半身交给强化学习 ── */
  function buildSceneLower() {
    var s = sceneSvg('左边一台 G1 在走路：下肢 12 个关节标蓝（策略输出），腰和两臂 15 个关节标黄（外骨骼直接设定）；右边依次是一步 76 维的观测、叠 6 步成 456 维、估计器与动作网络、PD 控制和训练设置');
    s.appendChild(svgText(24, 26, '下半身交给强化学习，上半身直接设定', 'demo-x-ink2', 13.5));
    var OX = 175, OY = 362, SC = 200;
    var walk = g1Actor(s, 'walk', SC, OX, OY, { gw: 105 });
    var br = group(s);
    var bLow = hline(br, 0, 0, 0, 0, C_LOW, 4), bUp = hline(br, 0, 0, 0, 0, C_UP, 4);
    var tLow1 = label(br, 20, 0, '下肢 12 个关节', 'demo-x-ink', 11.5), tLow2 = rich(br, 20, 0, '$\\pi_{loco}$ 输出', 11, 'demo-x-ink2');
    var tUp1 = label(br, 20, 0, '腰 + 两臂 15 个', 'demo-x-ink', 11.5), tUp2 = label(br, 20, 0, '外骨骼直接设', 'demo-x-ink2', 11);
    var R = 316;
    /* 一步观测：按维数比例分段 */
    var p1 = group(s);
    rich(p1, R, 62, '一步观测 $O_t$：76 维', 13, 'demo-x-ink');
    var segs = [], cx = R, W = 466;
    var segCol = { cmd: C_PURPLE, imu: C_MUTED, q: C_LOW, act: C_GOOD };
    OBS.forEach(function (o) {
      var w = W * o[1] / OBS_DIM;
      var r = paint(svgEl('rect', { x: cx.toFixed(1), y: 72, width: (w - 2).toFixed(1), height: 24, rx: 3 }), segCol[o[2]]);
      p1.appendChild(r); segs.push(r);
      cx += w;
    });
    /* 前 10 维太窄，标签另起一行；后三段标在各自的块下面 */
    var u = W / OBS_DIM;
    [['关节角 27', 10, 27], ['关节速度 27', 37, 27], ['上一步动作 12', 64, 12]].forEach(function (q) {
      label(p1, R + (q[1] + q[2] / 2) * u, 110, q[0], 'demo-x-mut', 9.5, 'middle');
    });
    hline(p1, R, 103, R + 10 * u - 2, 103, C_MUTED, 1.2);
    tone(p1, R, 128, '前 10 维：命令 4（紫）、角速度 3 + 重力 3（灰）', C_MUTED, 9.5);
    rich(p1, R, 146, '$C_t$：代码里是 4 维（$v_x$、$v_y$、$\\omega_{yaw}$、$h_t$），论文写 3 维', 10.5, 'demo-x-mut');
    /* 叠 6 步 */
    var p2 = group(s);
    var stack = [];
    for (var i = 0; i < HIST; i++) {
      var r = paint(svgEl('rect', { x: R + i * 10, y: 162 + i * 6, width: 200, height: 12, rx: 2, opacity: 0.35 + 0.1 * i }), C_LOW);
      p2.appendChild(r); stack.push(r);
    }
    rich(p2, R + 270, 188, '$O_{t-5:t}$：$6 \\times 76 = 456$ 维', 12.5, 'demo-x-ink');
    /* 网络 */
    var p3 = group(s);
    chip(p3, R, 226, 150, '估计器：$456 \\to 35$', C_PURPLE, { size: 11.5 });
    chip(p3, R + 176, 226, 150, '动作网络：$111 \\to 12$', C_LOW, { size: 11.5 });
    arrowAt(p3, R + 152, 240, R + 172, 240, C_MUTED, 2);
    arrowAt(p3, R + 328, 240, R + 348, 240, C_MUTED, 2);
    label(p3, R + 354, 245, '12 个目标角', 'demo-x-ink2', 11.5);
    label(p3, R, 274, '35 = 3 维机身速度 + 32 维潜变量（和下一步观测做对比学习）', 'demo-x-mut', 10.5);
    label(p3, R, 292, '111 = 35 + 当前一步 76 维；价值网络看 76 + 真实机身速度 3', 'demo-x-mut', 10.5);
    /* PD */
    var p4 = group(s);
    math(p4, R, 328, '\\tau_i = K_{p,i}\\,(q_{0,i} + 0.25\\,a_i - q_i) - K_{d,i}\\,\\dot q_i', 15);
    label(p4, R, 352, '代码：目标角 = 默认角 + 0.25 × 动作；每 4 个仿真步出一次动作（50 Hz）', 'demo-x-mut', 10.5);
    var p5 = group(s);
    chip(p5, R, 368, 466, 'Isaac Gym 4096 个并行环境 · RTX 4090 约 3 小时（项目页） · 不用任何动捕数据', C_HOMIE, { size: 11.5, h: 30 });
    function draw(t, clock) {
      var now = nowOf(t, clock), st = walk.put(loopK('walk', now)), cam = st.cam, f = st.f;
      var yHip = project([f.root[0], f.root[1], f.root[2] - 0.05], cam)[1], yFoot = OY, yTop = project([f.root[0], f.root[1], f.root[2] + 0.48], cam)[1];
      var bx = OX - 70;
      setLine(bLow, bx, yHip + 4, bx, yFoot); setLine(bUp, bx, yTop, bx, yHip - 4);
      [tLow1, tLow2].forEach(function (n, i) { if (n.setY) n.setY((yHip + yFoot) / 2 + i * 21); else n.setAttribute('y', ((yHip + yFoot) / 2 + i * 21).toFixed(1)); });
      [tUp1, tUp2].forEach(function (n, i) { n.setAttribute('y', ((yTop + yHip) / 2 + i * 21).toFixed(1)); });
      setOpacity(br, win(t, 0.0));
      setOpacity(p1, win(t, 3.6));
      setOpacity(p2, win(t, 7.0));
      var k = Math.floor(since(t, clock, 7.0) * 3) % (HIST + 2);
      stack.forEach(function (r, i) { r.style.opacity = i <= k ? 0.35 + 0.1 * i : 0.12; });
      setOpacity(p3, seg(t, 8.6, 9.0));
      setOpacity(p4, win(t, 10.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: 上身姿态课程 ── */
  function buildSceneCurriculum() {
    var s = sceneSvg('左边两台 G1 边走边被随机摆手臂：一台 ρ_a = 0.2 只动一点，一台 ρ_a 接近 1 大幅摆动；下面是左肘目标角的轨迹，每 1 秒换一个目标、中间线性插值；右边是不同 ρ_a 下的采样分布');
    s.appendChild(svgText(24, 26, '上身姿态课程：先小幅、再大幅地随机摆手臂', 'demo-x-ink2', 13.5));
    var pL = group(s);
    var aLow = g1Actor(pL, 'upper_low', 135, 82, 290, { gw: 60 });
    var aHigh = g1Actor(pL, 'upper', 135, 222, 290, { gw: 70 });
    rich(pL, 82, 64, '$\\rho_a = 0.2$', 12.5, 'demo-x-ink', 'middle');
    rich(pL, 222, 64, '$\\rho_a \\to 1$', 12.5, 'demo-x-ink', 'middle');
    /* 左肘目标角的轨迹（我们的回放；ρ_a → 1 那段） */
    var pT = group(s);
    var TX = 28, TY = 400, TW = 256, TH = 70;
    hline(pT, TX, TY, TX + TW, TY, C_BORDER, 1.2);
    rich(pT, TX, TY - TH - 6, '左肘目标角（$\\rho_a \\to 1$）：1 s 换一次，中间线性插值', 9.5, 'demo-x-mut');
    var trace = pathLine(pT, [], C_UP, 2);
    var cur = dotAt(pT, 0, 0, 4, C_UP);
    var ticks = [];
    for (var q = 1; q < 4; q++) ticks.push(hline(pT, TX + TW * q / 4, TY - TH, TX + TW * q / 4, TY, C_MUTED, 1, '3 3'));
    function traceY(v) { return TY - 6 - (v + 1.2) / 2.4 * (TH - 10); }
    var pts = [];
    for (var k = 0; k < SEQ.upper.n; k++) pts.push([TX + TW * k / (SEQ.upper.n - 1), traceY(frame('upper', k).upper[4])]);
    setPath(trace, pts);
    /* 右边：采样分布（代码的 λ） */
    var R = 330, PX = 360, PY = 236, PW = 400, PH = 150;
    var p1 = group(s);
    math(p1, R, 58, "p(\\rho_a' \\mid \\rho_a) = \\dfrac{\\lambda\\, e^{-\\lambda \\rho_a'}}{1 - e^{-\\lambda}},\\quad \\lambda = 20\\,(1 - \\rho_a)", 14);
    hline(p1, PX, PY, PX + PW, PY, C_BORDER, 1.2);
    hline(p1, PX, PY, PX, PY - PH, C_BORDER, 1.2);
    [0, 0.5, 1].forEach(function (u) { label(p1, PX + u * PW, PY + 14, fmt(u, 1), 'demo-x-mut', 9.5, 'middle'); });
    [10, 20].forEach(function (v) { label(p1, PX - 6, PY - v / 20 * PH + 3, String(v), 'demo-x-mut', 9.5, 'end'); });
    rich(p1, PX + PW + 6, PY - 8, "$\\rho_a'$", 11, 'demo-x-mut', 'start');
    var RHOS = [0, 0.5, 0.9, 1];
    var curves = RHOS.map(function (r, i) {
      var c = [C_BAD, C_WARN, C_GOOD, C_ACCENT][i], ps = [];
      for (var j = 0; j <= 80; j++) { var x = j / 80; ps.push([PX + x * PW, PY - Math.min(20, density(x, r)) / 20 * PH]); }
      var p = pathLine(p1, ps, c, 2.2);
      var lab = rich(p1, PX + PW - 4, PY - PH + 14 + i * 19, (i === 3 ? '$\\rho_a \\to 1$' : '$\\rho_a = ' + r + '$') + '：平均 ' + fmt(meanRho(r), 3), 10.5, 'demo-x-ink2', 'end');
      lab.style.color = c;
      return { p: p, lab: lab };
    });
    var p2 = group(s);
    rich(p2, R, 273, '$\\rho_a$ 从 0 开始；x 方向速度跟得好（奖励过阈值），就加 0.05', 11.5, 'demo-x-ink2');
    var p3 = group(s);
    math(p3, R, 296, "a_i \\sim \\mathcal{U}(0, \\rho_a')", 14);
    rich(p3, R + 120, 300, '：每个关节往上限或下限走 $a_i$ 那么远（占到限位的比例）', 11.5, 'demo-x-ink2');
    var p4 = group(s);
    label(p4, R, 330, '每 1 s 重采样一次目标，1 s 内线性插值过去', 'demo-x-ink2', 11.5);
    label(p4, R, 351, '论文：不插值的话，机器人在连续动作下站不稳', 'demo-x-mut', 10.5);
    var p5 = group(s);
    rich(p5, R, 380, '对比 $\\mathcal{U}(0, \\rho_a)$：$(\\rho_a, 1]$ 永远采不到；式 3 任何时候 $[0, 1]$ 都有概率', 11.5, 'demo-x-ink2');
    rich(p5, R, 402, '代码是 $\\lambda = 20\\,(1 - 0.99\\rho_a)$：最后也不完全均匀，平均 0.483', 10.5, 'demo-x-mut');
    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(pL, win(t, 0.0));
      aLow.put(loopK('upper_low', now));
      var kh = loopK('upper', now);
      aHigh.put(kh);
      setOpacity(pT, win(t, 0.0));
      moveDot(cur, pts[kh][0], pts[kh][1]);
      ticks.forEach(function (tk) { tk.style.opacity = t >= 10.4 ? 1 : 0.35; });
      trace.style.strokeWidth = t >= 10.4 && t < 13.4 ? 3 : 2;
      setOpacity(p1, win(t, 3.6));
      curves.forEach(function (c, i) { var a = seg(t, 4.0 + i * 0.6, 4.6 + i * 0.6); c.p.style.opacity = a; setOpacity(c.lab, a); });
      setOpacity(p2, win(t, 3.6));
      setOpacity(p3, win(t, 7.0));
      setOpacity(p4, win(t, 10.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 高度跟踪奖励 ── */
  function buildSceneKnee() {
    var s = sceneSvg('左边一台 G1 按命令蹲下又站起，旁边的竖条是目标高度和骨盆高度，下面实时显示归一化的膝角与 r_knee；右边是式 4 和两个算例：太高时鼓励弯膝，太低时鼓励伸膝');
    s.appendChild(svgText(24, 26, '高度跟踪奖励：蹲到踏板要的高度', 'demo-x-ink2', 13.5));
    var OX = 112, OY = 330, SC = 210;
    var act = g1Actor(s, 'squat', SC, OX, OY, { gw: 90 });
    var bar = group(s);
    var BX = 232;
    hline(bar, BX, OY, BX, OY - 0.8 * SC, C_BORDER, 1.4);
    [0, 0.4, 0.8].forEach(function (h) { hline(bar, BX - 4, OY - h * SC, BX + 4, OY - h * SC, C_BORDER, 1.2); label(bar, BX + 8, OY - h * SC + 4, fmt(h, 1) + ' m', 'demo-x-mut', 9.5); });
    var tLine = hline(bar, 40, 0, BX, 0, C_H, 2, '6 4'), pDot = dotAt(bar, BX, 0, 5, C_H);
    var tTag = rich(bar, BX + 40, 0, '$h_t$', 11, 'demo-x-ink2');
    var read = group(s);
    var rH = rich(read, 24, 362, '', 11.5, 'demo-x-ink2');
    var rN = rich(read, 24, 382, '', 11.5, 'demo-x-ink2');
    var rR = rich(read, 24, 402, '', 11.5, 'demo-x-ink');
    var R = 300;
    var p1 = group(s);
    rich(p1, R, 62, '蹲下去才够得着低处：中间那只踏板给目标高度 $h_t$', 11.5, 'demo-x-ink2');
    rich(p1, R, 82, '代码：蹲时 $h_t \\in [0.24, 0.74]$ m，走和站时 0.74 m', 10.5, 'demo-x-mut');
    var p2 = group(s);
    math(p2, R, 120, 'r_{knee} = -\\Big\\| (h_{r,t} - h_t) \\times \\Big( \\dfrac{q_{knee,t} - q_{knee,\\min}}{q_{knee,\\max} - q_{knee,\\min}} - \\dfrac{1}{2} \\Big) \\Big\\|', 15);
    label(p2, R, 166, '高度差 × （膝角归一化到 0–1 后减 1/2）：膝角在中间（1.40 rad）时为 0', 'demo-x-ink2', 11);
    /* 归一化膝角的刻度条 */
    var NX = R, NY = 190, NW = 300;
    hline(p2, NX, NY, NX + NW, NY, C_BORDER, 6);
    hline(p2, NX + NW / 2, NY - 8, NX + NW / 2, NY + 8, C_MUTED, 1.5);
    label(p2, NX, NY + 20, '直（0）', 'demo-x-mut', 9.5); label(p2, NX + NW / 2, NY + 20, '1/2', 'demo-x-mut', 9.5, 'middle'); label(p2, NX + NW, NY + 20, '弯（1）', 'demo-x-mut', 9.5, 'end');
    var nDot = dotAt(p2, NX, NY, 6, C_LOW);
    var p3 = group(s);
    var dA = frame('squat', EX_DOWN), eA = dA.root[2] - dA.hcmd, rA = KNEE.w * -rKnee(eA, dA.knee[0], dA.knee[1]);
    rectBox(p3, R, 222, 230, 108, C_LOW);
    label(p3, R + 10, 242, '算例 A：第 ' + f2(EX_DOWN / 15) + ' s，命令刚换成 0.40 m', 'demo-x-ink', 11);
    rich(p3, R + 10, 262, '骨盆 ' + f3(dA.root[2]) + ' m：高了 ' + f3(eA) + ' m', 11, 'demo-x-ink2');
    rich(p3, R + 10, 282, '膝 n = ' + f3(kneeN(dA.knee[0])) + '（偏直，< 1/2）', 11, 'demo-x-ink2');
    rich(p3, R + 10, 302, '× 权重 0.75：' + sgn(fmt(rA, 4)), 11, 'demo-x-ink');
    label(p3, R + 10, 322, '→ 膝再弯一点，罚得少：鼓励弯', 'demo-x-good', 11);
    var p4 = group(s);
    var dB = frame('squat', EX_UP), eB = dB.root[2] - dB.hcmd, rB = KNEE.w * -rKnee(eB, dB.knee[0], dB.knee[1]);
    rectBox(p4, R + 244, 222, 236, 108, C_H);
    label(p4, R + 254, 242, '算例 B：第 ' + f1(EX_UP / 15) + ' s，命令换回 0.74 m', 'demo-x-ink', 11);
    rich(p4, R + 254, 262, '骨盆 ' + f3(dB.root[2]) + ' m：低了 ' + f3(-eB) + ' m', 11, 'demo-x-ink2');
    rich(p4, R + 254, 282, '膝 n = ' + f3(kneeN(dB.knee[0])) + '（偏弯，> 1/2）', 11, 'demo-x-ink2');
    rich(p4, R + 254, 302, '× 权重 0.75：' + sgn(fmt(rB, 4)), 11, 'demo-x-ink');
    label(p4, R + 254, 322, '→ 膝伸一点，罚得少：鼓励伸', 'demo-x-good', 11);
    var p5 = group(s);
    rich(p5, R, 354, '代码：权重 −0.75，高度差用骨盆 $z$ 减 $h_t$；另有高度奖励 $\\exp(-4\\,|\\text{误差}|)$', 10.5, 'demo-x-mut');
    label(p5, R, 374, '论文正文说「低于目标鼓励弯、高于目标鼓励伸」，和公式算出来的方向相反', 'demo-x-ink2', 11);
    label(p5, R, 394, '（我们的理解：正文把不等号写反了）', 'demo-x-mut', 10.5);
    function draw(t, clock) {
      var now = nowOf(t, clock), k = loopK('squat', now);
      var st = act.put(k), f = st.f;
      var yT = OY - f.hcmd * SC, yP = OY - f.root[2] * SC;
      setLine(tLine, 40, yT, BX, yT); tTag.setY ? tTag.setY(yT + 4) : 0;
      moveDot(pDot, BX, yP);
      var n = kneeN(f.knee[0]), r = KNEE.w * -rKnee(f.root[2] - f.hcmd, f.knee[0], f.knee[1]);
      rH.setText('目标 $h_t$ = ' + f2(f.hcmd) + ' m，骨盆 ' + f2(f.root[2]) + ' m');
      rN.setText('左膝 ' + f2(f.knee[0]) + ' rad，归一化 $n$ = ' + f2(n));
      rR.setText('$0.75\\, r_{knee}$ = ' + sgn(fmt(r, 3)));
      moveDot(nDot, NX + n * NW, NY);
      setOpacity(read, win(t, 0.0));
      setOpacity(p1, win(t, 0.0));
      setOpacity(p2, win(t, 3.6));
      setOpacity(p3, win(t, 7.0));
      setOpacity(p4, win(t, 10.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 7: 训练场 ── */
  function buildSceneTraining() {
    var s = sceneSvg('左边是六个并行环境的时间轴，每 4 秒换一次命令，紫色是蹲、蓝色是走、灰色是站；右边依次是论文与代码的命令比例、速度与高度的范围、只在站着时才算的奖励、域随机化');
    s.appendChild(svgText(24, 26, '训练场：蹲、走、站轮着来', 'demo-x-ink2', 13.5));
    var LX = 24, LY = 70, LW = 340, ROWH = 34, NROW = 6, NBLK = 5;
    var pL = group(s);
    label(pL, LX, 58, '6 个并行环境 × 一回合 20 s（每 4 s 重采样一次命令）', 'demo-x-ink2', 11);
    var rng = K.mulberry32(20250218), cells = [];
    for (var i = 0; i < NROW; i++) {
      label(pL, LX + 6, LY + i * ROWH + 22, '环境 ' + (i + 1), 'demo-x-mut', 10);
      for (var j = 0; j < NBLK; j++) {
        var x = rng(), kind = x < 1 / 3 ? 'squat' : x > 1 / 2 ? 'walk' : 'stand';
        var col = kind === 'squat' ? C_H : kind === 'walk' ? C_LOW : C_MUTED;
        var r = paint(svgEl('rect', { x: LX + 54 + j * (LW - 54) / NBLK, y: LY + i * ROWH + 6, width: (LW - 54) / NBLK - 4, height: ROWH - 12, rx: 4 }), col);
        pL.appendChild(r); cells.push({ r: r, kind: kind, j: j });
        label(pL, LX + 54 + (j + 0.5) * (LW - 54) / NBLK - 2, LY + i * ROWH + 22, kind === 'squat' ? '蹲' : kind === 'walk' ? '走' : '站', 'demo-x-ink', 10.5, 'middle');
      }
    }
    var cursor = hline(pL, 0, LY, 0, LY + NROW * ROWH, C_BAD, 2);
    for (var q = 0; q <= NBLK; q++) label(pL, LX + 54 + q * (LW - 54) / NBLK - 2, LY + NROW * ROWH + 14, (q * 4) + ' s', 'demo-x-mut', 9.5, 'middle');
    legendRow(pL, LX + 54, LY + NROW * ROWH + 40, [['蹲', C_H], ['走', C_LOW], ['站', C_MUTED]]);
    var R = 392;
    var p1 = group(s);
    label(p1, R, 62, '论文：1/3 的环境练蹲，2/3 练站和走', 'demo-x-ink2', 11.5);
    var BW = 380;
    [[1 / 3, C_H, '蹲 1/3'], [2 / 3, C_LOW, '站和走 2/3']].reduce(function (x0, b) {
      p1.appendChild(paint(svgEl('rect', { x: R + x0 * BW, y: 72, width: b[0] * BW - 3, height: 22, rx: 3 }), b[1]));
      label(p1, R + (x0 + b[0] / 2) * BW, 88, b[2], 'demo-x-ink', 10.5, 'middle');
      return x0 + b[0];
    }, 0);
    rich(p1, R, 116, '代码：$x \\sim \\mathcal{U}(0, 1)$，$x < 1/3$ 蹲、$x > 1/2$ 走、其余站着不动', 11.5, 'demo-x-ink2');
    [[1 / 3, C_H, '蹲 1/3'], [1 / 6, C_MUTED, '站 1/6'], [1 / 2, C_LOW, '走 1/2']].reduce(function (x0, b) {
      p1.appendChild(paint(svgEl('rect', { x: R + x0 * BW, y: 126, width: b[0] * BW - 3, height: 22, rx: 3 }), b[1]));
      label(p1, R + (x0 + b[0] / 2) * BW, 142, b[2], 'demo-x-ink', 10.5, 'middle');
      return x0 + b[0];
    }, 0);
    var p2 = group(s);
    rich(p2, R, 178, '蹲：速度全是 0，高度 $\\mathcal{U}(0.24, 0.74)$ m', 11, 'demo-x-ink2');
    rich(p2, R, 198, '走：$v_x \\in [-0.8, 1.2]$、$v_y \\in [-0.5, 0.5]$ m/s，$\\omega_{yaw} \\in [-0.8, 0.8]$ rad/s', 11, 'demo-x-ink2');
    label(p2, R, 219, '同一个环境在蹲和走之间来回换，学会过渡', 'demo-x-good', 11.5);
    var p3 = group(s);
    label(p3, R, 248, '代码里有 7 项奖励只在目标高度 ≥ 0.735 m 时才算：', 'demo-x-ink2', 11);
    label(p3, R, 267, 'z 线速度、髋偏离、踝偏离、两脚 / 两膝间距的上限、两脚平行、', 'demo-x-mut', 10.5);
    label(p3, R, 286, '站着别动；抬脚高度在 ≥ 0.71 m 时才算 —— 蹲着不罚这些', 'demo-x-mut', 10.5);
    var p4 = group(s);
    label(p4, R, 318, '域随机化（表 VII）：手上加 −0.1~0.3 kg、躯干加 −5~10 kg、', 'demo-x-ink2', 11);
    rich(p4, R, 338, '每 4 s 推一下（±0.5 m/s）、摩擦、$K_p$ / $K_d$ ±10%、观测噪声……', 11, 'demo-x-ink2');
    chip(p4, R, 354, 380, '奖励共 33 项（表 VI），从 PIM 的人形行走改来', C_HOMIE, { size: 11.5, h: 30 });
    function draw(t, clock) {
      var u = (since(t, clock, 0) % 20) / 20;
      setLine(cursor, LX + 54 + u * (LW - 54), LY, LX + 54 + u * (LW - 54), LY + NROW * ROWH);
      var blk = Math.floor(u * NBLK);
      cells.forEach(function (c) { c.r.style.opacity = c.j === blk ? 0.95 : 0.4; });
      setOpacity(pL, win(t, 0.0));
      setOpacity(p1, win(t, 3.6));
      setOpacity(p2, win(t, 7.0));
      setOpacity(p3, win(t, 10.4));
      setOpacity(p4, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 对称 ── */
  function buildSceneSymmetry() {
    var s = sceneSvg('左边一台 G1 边走边摆手臂，旁边是它沿身体中面的镜像；右边依次是镜像的规则、数据翻倍的回放缓冲区、两项对称损失、官方策略在我们回放上的对称损失');
    s.appendChild(svgText(24, 26, '对称：一条数据当两条用', 'demo-x-ink2', 13.5));
    var pL = group(s);
    var a = g1Actor(pL, 'upper', 135, 92, 300, { gw: 70 });
    var b = g1Actor(pL, 'upper', 135, 232, 300, { gw: 70, mirror: true, ground: false });
    hline(pL, 162, 70, 162, 310, C_MUTED, 1.5, '5 4');
    rich(pL, 92, 330, '$T_t$', 13, 'demo-x-ink', 'middle');
    rich(pL, 232, 330, "$T_t'$（镜像）", 13, 'demo-x-ink', 'middle');
    label(pL, 162, 356, '沿机器人的 x-z 平面（身体中面）翻过去', 'demo-x-mut', 10.5, 'middle');
    var R = 316;
    var p1 = group(s);
    math(p1, R, 64, "T_t = (s_t,\\, a_t,\\, r_t,\\, s_{t+1}) \\;\\to\\; T_t'", 15);
    var p2 = group(s);
    [['左腿 6 个关节 ↔ 右腿 6 个关节（横滚、偏航取负）', C_LOW], ['腰偏航取负；左臂 ↔ 右臂', C_UP],
      ['命令的 $v_y$、$\\omega_{yaw}$ 取负；角速度的横滚、偏航取负；重力的 y 取负', C_PURPLE], ['$v_x$、高度、俯仰不变', C_MUTED]].forEach(function (q, i) {
      chip(p2, R, 84 + i * 34, 466, q[0], q[1], { size: 11, left: true, h: 28 });
    });
    var p3 = group(s);
    var cards = [];
    for (var i = 0; i < 6; i++) {
      var orig = i % 2 === 0;
      var r = paint(svgEl('rect', { x: R + i * 40, y: 236, width: 34, height: 26, rx: 4, opacity: 0.8 }), orig ? C_ACCENT : C_GOOD);
      p3.appendChild(r); cards.push(r);
      rich(p3, R + i * 40 + 17, 254, orig ? '$T$' : "$T'$", 10.5, 'demo-x-ink', 'middle');
    }
    label(p3, R + 250, 254, '两条都进回放缓冲区：数据量翻倍', 'demo-x-ink2', 11.5);
    var p4 = group(s);
    math(p4, R, 296, "\\mathcal{L}^{actor}_{sym} = \\mathrm{MSE}(a_t, a_t'),\\quad \\mathcal{L}^{critic}_{sym} = \\mathrm{MSE}(V_t, V_t')", 14);
    rich(p4, R, 322, '代码：比的是 $\\pi$(镜像观测) 与 镜像($\\pi$(观测))，系数 1.0', 10.5, 'demo-x-mut');
    var p5 = group(s);
    rectBox(p5, R, 336, 466, 70, C_HOMIE);
    rich(p5, R + 10, 355, '官方 deploy.onnx 在我们的 MuJoCo 回放上：平均 ' + fmt(OURS.sym, 4) + '（' + OURS.symN + ' 步；表 II 是 0.019）', 11, 'demo-x-ink');
    rich(p5, R + 10, 376, '只抬左臂站着：左髋俯仰 ' + sgn(f3(SYM_EX.a[0])) + '、右髋 ' + sgn(f3(SYM_EX.a[6])) + '；镜像观测后 ' + sgn(f3(SYM_EX.af[0])) + '、' + sgn(f3(SYM_EX.af[6])), 11, 'demo-x-ink2');
    rich(p5, R + 10, 397, '左右正好对调，差的平方和 ' + fmt(SYM_EX.loss, 5), 10.5, 'demo-x-mut');
    function draw(t, clock) {
      var now = nowOf(t, clock), k = loopK('upper', now);
      a.put(k); b.put(k);
      setOpacity(pL, win(t, 0.0));
      setOpacity(p1, win(t, 0.0));
      setOpacity(p2, win(t, 3.6));
      setOpacity(p3, win(t, 7.0));
      var n = Math.floor(since(t, clock, 7.0) * 2.5) % 8;
      cards.forEach(function (c, i) { c.style.opacity = i < n ? 0.85 : 0.15; });
      setOpacity(p4, win(t, 10.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: 图 7 消融 ── */
  function buildSceneAblation() {
    var s = sceneSvg('论文图 7 整张：三行分别是上身课程、高度奖励、对称的消融，五列是线速度误差、角速度误差、高度误差、对称损失、存活时间；按旁白依次框出一行');
    s.appendChild(svgText(24, 26, '图 7：三组消融（读图近似值）', 'demo-x-ink2', 13.5));
    var FX = 52, FY = 40, FW = 696;
    var fig = paperPart(s, 'fig7', 0, 0, 1, 1, FX, FY, FW);
    var box = hiBox(s, C_BAD);
    var notes = [
      '每组 3 个种子，评测 1000 个环境 × 20 s，上身姿态按 $\\rho_a \\to 1$ 随机；横轴是训练步数（0–2000）',
      '上身课程：ours（红）三项跟踪误差都更低；不用课程和 rand 最后差不多，rand 存活时间涨得慢',
      '高度奖励：只放大高度奖励（hei）速度误差大得多（2000 步时约 0.37 对 0.19 m/s），高度误差也没更快',
      '对称：只增强（w/ aug）对称损失涨到 20 左右；不增强的两组（w/ sym、none）存活时间一直约 1 s',
      '项目页：对称把训练加速 10 倍以上；增强提效率，对称损失保住左右对称'
    ].map(function (str) { return rich(s, 40, 400, str, 11.5, 'demo-x-ink2', 'start', 720); });
    function draw(t) {
      var k = t < 3.6 ? -1 : t < 7.0 ? 0 : t < 10.4 ? 1 : t < 13.4 ? 2 : -1;
      if (k >= 0) {
        var y0 = FY + fig.h * [0.0, 0.335, 0.665][k], h = fig.h * 0.335;
        box.set(FX - 6, y0 - 2, FW + 12, h + 4);
        box.node.style.opacity = 1;
      } else box.node.style.opacity = 0;
      var cues = [0.0, 3.6, 7.0, 10.4, 13.4];
      notes.forEach(function (n, i) { setOpacity(n, win(t, cues[i], i < 4 ? cues[i + 1] : null)); });
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: 换一台机器人 ── */
  function buildSceneGr1() {
    var s = sceneSvg('左边是项目页里 GR-1 在 Isaac Gym 里训练的片段和论文图 8 的两台机器人；右边依次是参数对比、改了什么、表 II、我们在 MuJoCo 里回放官方 G1 策略的结果');
    s.appendChild(svgText(24, 26, '换一台机器人：Fourier GR-1（表 II）', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'gr1gym', 24, 44, 320, 180, '项目页视频（原速）：GR-1 在 Isaac Gym 里边走边被随机摆手臂');
    var fig = paperPart(s, 'fig8', 0, 0, 1, 1, 92, 252, 184, '论文图 8：G1（左）与 GR-1（右）');
    var R = 370;
    var p1 = group(s);
    label(p1, R, 62, '两台差得很远', 'demo-x-ink', 13);
    var rowsP = [['身高', '130 cm', '165 cm'], ['体重', '36.4 kg', '56 kg'], ['灵巧手', '7 自由度', '6 自由度'], ['双手重', '1.42 kg', '1.04 kg'], ['双手占体重', '3.9%', '1.9%']];
    label(p1, R + 140, 84, 'G1', 'demo-x-ink', 11.5, 'middle'); label(p1, R + 250, 84, 'GR-1', 'demo-x-ink', 11.5, 'middle');
    rowsP.forEach(function (r, i) {
      label(p1, R, 106 + i * 20, r[0], 'demo-x-ink2', 11);
      label(p1, R + 140, 106 + i * 20, r[1], 'demo-x-ink2', 11, 'middle');
      label(p1, R + 250, 106 + i * 20, r[2], 'demo-x-ink2', 11, 'middle');
    });
    label(p1, R, 216, '图 8 的图注写「全身 ÷ 双手」，数其实是双手 ÷ 全身', 'demo-x-mut', 10);
    var p2 = group(s);
    label(p2, R, 62, '只改了跟身材有关的几个数', 'demo-x-ink', 13);
    label(p2, R, 86, '站立高度 0.74 → 0.90 m，蹲的范围跟着改', 'demo-x-ink2', 11.5);
    label(p2, R, 106, '两脚、两膝最大间距 0.35 → 0.40 m，抬脚目标 0.14 → 0.15 m', 'demo-x-ink2', 11.5);
    label(p2, R, 126, '奖励权重大多一样（表 VI 里 7 项不同，如偏航跟踪 2.0 → 1.0）', 'demo-x-ink2', 11.5);
    label(p2, R, 146, '训练流程不变', 'demo-x-good', 11.5);
    var p3 = group(s);
    label(p3, R, 62, '表 II：训练 2k 步后，3 个种子', 'demo-x-ink', 13);
    label(p3, R + 190, 84, 'G1', 'demo-x-ink', 11.5, 'middle'); label(p3, R + 300, 84, 'GR-1', 'demo-x-ink', 11.5, 'middle');
    TABLE2.forEach(function (r, i) {
      label(p3, R, 106 + i * 22, r.zh + (r.unit ? '（' + r.unit + '）' : ''), 'demo-x-ink2', 11);
      label(p3, R + 190, 106 + i * 22, fmt(r.g1[0], 3) + ' ± ' + fmt(r.g1[1], 3), 'demo-x-ink2', 11, 'middle');
      label(p3, R + 300, 106 + i * 22, fmt(r.gr1[0], 3) + ' ± ' + fmt(r.gr1[1], 3), 'demo-x-ink2', 11, 'middle');
    });
    label(p3, R, 226, '两台都活满 20 s 左右；GR-1 速度误差大一些', 'demo-x-good', 11.5);
    var p4 = group(s);
    rectBox(p4, R, 246, 414, 110, C_HOMIE);
    label(p4, R + 10, 266, '我们的复现：官方 deploy.onnx（G1）在 MuJoCo 里', 'demo-x-ink', 11.5);
    label(p4, R + 10, 286, '200 段 × 20 s，随机命令 + 随机上身：' + OURS.full + ' 段活满，平均 ' + fmt(OURS.alive, 2) + ' s', 'demo-x-ink2', 11);
    label(p4, R + 10, 306, '线速度 ' + fmt(OURS.lin, 3) + ' m/s、角速度 ' + fmt(OURS.ang, 3) + ' rad/s、高度 ' + fmt(OURS.h * 1000, 1) + ' mm、对称 ' + fmt(OURS.sym, 4), 'demo-x-ink2', 11);
    label(p4, R + 10, 326, '仿真器和误差的定义都不同，不能和表 II 直接比', 'demo-x-mut', 10.5);
    label(p4, R + 10, 346, '增益用真机部署的（腿 150 / 300）', 'demo-x-mut', 10.5);
    var p5 = group(s);
    label(p5, R, 382, 'GR-1 的训练代码没有放出来（README 的待办：更多机器人）', 'demo-x-ink2', 11.5);
    function draw(t) {
      clip.at(K.clipSince(t, 0), true);
      void fig;
      setOpacity(p1, win(t, 0.0, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 11: 同构外骨骼 ── */
  function buildSceneExo() {
    var s = sceneSvg('左边是项目页视频：操作员穿着外骨骼和手套，旁边 G1 的上身跟着动、把番茄从一只手递到另一只手；右边是论文图 5(b) 的外骨骼与 G1、舵机精度和零点标定的算例');
    s.appendChild(svgText(24, 26, '同构外骨骼：读数就是关节角', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'arm', 24, 44, 360, 203, '项目页视频（原速）：外骨骼 + 手套，G1 递番茄');
    var pL = group(s);
    label(pL, 24, 290, '关节匹配：外骨骼和 G1 的手臂结构一样', 'demo-x-ink', 12.5);
    label(pL, 24, 312, '舵机读数直接当关节角，不估姿态、不解逆运动学', 'demo-x-ink2', 11.5);
    label(pL, 24, 332, '→ 没有重定向误差，也没有逆运动学的迭代', 'demo-x-good', 11.5);
    var R = 404;
    var p1 = group(s);
    var fig = paperPart(p1, 'fig5', 0.29, 0, 1, 1, R, 46, 378, '论文图 5(b)：外骨骼 ↔ G1 的关节匹配');
    var Y = 46 + fig.h + 34;
    var p2 = group(s);
    chip(p2, R, Y, 378, '每条手臂 7 个自由度：肩 3 + 肘 1 + 腕 3', C_UP, { size: 11.5, left: true, h: 30 });
    var p3 = group(s);
    label(p3, R, Y + 52, '每个关节一个 DYNAMIXEL XL330-M288-T 舵机', 'demo-x-ink2', 11.5);
    label(p3, R, Y + 72, '一圈 4096 格：360° / 4096 = 0.088° 一格（论文写 0.09°）', 'demo-x-ink2', 11.5);
    label(p3, R, Y + 92, '舵机断电记得绝对位置：开机不用重新标定', 'demo-x-mut', 10.5);
    var p4 = group(s);
    math(p4, R, Y + 60, 'q_t = \\pm k_t \\Big(p_t + \\dfrac{n_t \\pi}{2}\\Big) + \\tau_t', 15);
    label(p4, R, Y + 92, '舵盘四个孔对称，装上去的零点偏差是 π/2 的整数倍；k = 1、τ = 0', 'demo-x-ink2', 11);
    rich(p4, R, Y + 112, '例：读数 1.20 rad、$n = -1$ → $q = 1.20 - 1.571 = -0.371$ rad', 11, 'demo-x-ink2');
    var p5 = group(s);
    label(p5, R, Y + 52, '外骨骼长度按人的手臂做，舵机轴对齐 G1 URDF 的关节轴', 'demo-x-ink2', 11.5);
    label(p5, R, Y + 72, 'PLA 3D 打印、背带固定；两条手臂 430 美元', 'demo-x-ink2', 11.5);
    label(p5, R, Y + 92, '同一套设计做了 G1 和 GR-1 两版（肩、腕不同）', 'demo-x-mut', 10.5);
    function draw(t) {
      clip.at(K.clipSince(t, 0), true);
      setOpacity(pL, win(t, 0.0));
      setOpacity(p1, win(t, 3.6));
      setOpacity(p2, win(t, 3.6));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 手套与踏板 ── */
  function buildSceneGlovePedal() {
    var s = sceneSvg('先放项目页里手套驱动灵巧手的片段与论文图 20 的霍尔传感器原理，再放论文图 6 的踏板，最后是表 III 三件硬件的价格和采集频率');
    s.appendChild(svgText(24, 26, '手套与踏板（表 III）', 'demo-x-ink2', 13.5));
    var pA = group(s);
    var clip = projClip(pA, 'glove', 24, 44, 360, 203, '项目页视频（原速）：手套驱动 Inspire 灵巧手');
    var R = 404;
    var a1 = group(pA);
    paperPart(a1, 'fig20', 0, 0, 0.5, 0.92, R, 46, 210, '论文图 20(a)：一根手指的三个角');
    label(a1, R + 222, 70, '磁铁跟着关节转，', 'demo-x-ink2', 11);
    label(a1, R + 222, 90, '霍尔传感器量磁场', 'demo-x-ink2', 11);
    label(a1, R + 222, 116, '每根手指 3 个角：', 'demo-x-ink2', 11);
    rich(a1, R + 222, 137, '$\\alpha$ 指尖俯仰', 11, 'demo-x-ink2');
    rich(a1, R + 222, 158, '$\\beta$ 指腹俯仰', 11, 'demo-x-ink2');
    rich(a1, R + 222, 179, '$\\gamma$ 指腹偏航', 11, 'demo-x-ink2');
    var a2 = group(pA);
    chip(a2, 24, 290, 360, '5 根手指 × 3 = 15 个自由度，比多数灵巧手还多', C_HOMIE, { size: 11.5, left: true, h: 30 });
    label(a2, 24, 344, '例：拇指指腹俯仰 100° 对应 1024 格，约 0.098° 一格（表 IX）', 'demo-x-ink2', 11);
    label(a2, 24, 364, '读数和角度不是线性的（近似指数）；G1 的 Dex3 用拇指、食指、中指', 'demo-x-mut', 10.5);
    label(a2, 24, 382, '手套能从外骨骼上拆下来，换到别的机器人的外骨骼上', 'demo-x-mut', 10.5);
    var pB = group(s);
    var f6 = paperPart(pB, 'fig6', 0, 0, 1, 1, 24, 50, 360, '论文图 6：三只小踏板 + 两个换向开关');
    rectBox(pB, R, 54, 378, 132, C_LOW);
    rich(pB, R + 12, 76, '左踏板 → 偏航角速度 $[0, \\pm\\omega_{max}]$', 11.5, 'demo-x-ink2');
    rich(pB, R + 12, 100, '中间白色踏板 → 高度 $[H_{min}, H_{max}]$', 11.5, 'demo-x-ink2');
    rich(pB, R + 12, 124, '右踏板 → 前后速度 $[0, \\pm V_{max}]$', 11.5, 'demo-x-ink2');
    label(pB, R + 12, 148, '两边的开关：左边切左 / 右转，右边切前进 / 后退', 'demo-x-ink2', 11.5);
    label(pB, R + 12, 170, '踩下加速、松开减速，像开车', 'demo-x-good', 11.5);
    var b2 = group(pB);
    label(b2, R, 214, '踏板下面是电位器（0932 型）：能转 270°，踏板只用 40°', 'demo-x-ink2', 11.5);
    label(b2, R, 234, '弹簧让踏板松脚就回位；换向开关是微动开关', 'demo-x-ink2', 11.5);
    label(b2, R, 258, '为什么不用手柄：手要留给手臂和手指；', 'demo-x-ink2', 11.5);
    label(b2, R, 278, '为什么不跟着人走：大场景里人没法跟着机器人走', 'demo-x-ink2', 11.5);
    label(pB, 24, 50 + f6.h + 46, '踏板也能改配置，重新分配命令', 'demo-x-mut', 10.5);
    var pC = group(s);
    label(pC, 160, 70, '表 III', 'demo-x-ink', 13, 'middle');
    var maxUsd = 430, BX = 140;
    TABLE3.forEach(function (r, i) {
      var y = 96 + i * 62;
      label(pC, BX - 10, y + 14, r.zh, 'demo-x-ink2', 11.5, 'end');
      var b = hbar(pC, BX, y, 22, [C_UP, C_HOMIE, C_LOW][i]); setW(b, 220 * r.usd / maxUsd);
      label(pC, BX + 220 * r.usd / maxUsd + 8, y + 15, r.usd + ' 美元', 'demo-x-ink', 11.5);
      rich(pC, BX, y + 42, '采集 ' + r.khz + ' kHz · 精度 ' + r.acc, 10.5, 'demo-x-mut');
    });
    chip(pC, 24, 300, 360, '合计 430 + 2 × 30 + 20 = 510 美元 ≈ 0.5k', C_HOMIE, { size: 12, h: 32 });
    label(pC, 24, 352, '采集频率：有线、115200 波特率下测的', 'demo-x-mut', 10.5);
    var pC2 = group(s);
    label(pC2, R + 40, 70, '贵在哪：外骨骼的舵机', 'demo-x-ink', 13);
    label(pC2, R + 40, 94, '手套和踏板的电路板、传感器模块都是自己设计焊的', 'demo-x-ink2', 11.5);
    label(pC2, R + 40, 116, '对比（表 I）：OpenTelevision、DexCap 约 4k，', 'demo-x-ink2', 11.5);
    label(pC2, R + 40, 136, 'Mobile-ALOHA 约 32k 美元', 'demo-x-ink2', 11.5);
    function draw(t) {
      var showA = t < 7.0 + 0.3;
      clip.at(K.clipSince(t, 0), showA);
      setOpacity(pA, win(t, -0.4, 7.0));
      setOpacity(a1, win(t, 0.0));
      setOpacity(a2, win(t, 3.6));
      setOpacity(pB, win(t, 7.0, 13.4));
      setOpacity(b2, win(t, 10.4));
      setOpacity(pC, win(t, 13.4));
      setOpacity(pC2, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 13: 表 IV ── */
  function buildSceneFreq() {
    var s = sceneSvg('左边是表 IV 四个系统输出给手臂和手的频率条形图；右边依次是为什么快、Wi-Fi 的包大小和延迟、G1 上的部署方式、论文图 9 的四种灵巧手');
    s.appendChild(svgText(24, 26, '表 IV：263 Hz，不用 GPU', 'demo-x-ink2', 13.5));
    var pL = group(s);
    label(pL, 24, 62, '上身遥操作输出给机器人的频率（Hz）', 'demo-x-ink', 12);
    var BX = 130, MAXW = 210, bars = [];
    TABLE4.forEach(function (r, i) {
      var y = 84 + i * 66, last = i === TABLE4.length - 1;
      label(pL, BX - 10, y + 14, r.zh, last ? 'demo-x-good' : 'demo-x-ink2', 11.5, 'end');
      label(pL, BX - 10, y + 33, r.hw, 'demo-x-mut', 9.5, 'end');
      var ba = barRowAt(pL, BX - 60, y, 60, '', C_UP, 16), bh = barRowAt(pL, BX - 60, y + 22, 60, '', C_HOMIE, 16);
      bars.push({ r: r, ba: ba, bh: bh });
    });
    legendRow(pL, BX, 360, [['手臂', C_UP], ['手', C_HOMIE]]);
    var R = 420;
    var p1 = group(s);
    label(p1, R, 62, '为什么快', 'demo-x-ink', 13);
    label(p1, R, 84, '不估姿态、不解逆运动学：读到就发', 'demo-x-ink2', 11.5);
    label(p1, R, 104, '输出频率 ≈ 采集频率（外骨骼 0.26 kHz → 263 Hz）', 'demo-x-ink2', 11.5);
    label(p1, R, 124, '比视觉 / VR 方案快 2–16 倍（对 16–125 Hz），也不要 GPU', 'demo-x-good', 11.5);
    var p2 = group(s);
    rectBox(p2, R, 142, 362, 70, C_ACCENT);
    label(p2, R + 10, 162, 'Wi-Fi（TCP）：一包 128 字节 = 32 个 float32', 'demo-x-ink2', 11.5);
    label(p2, R + 10, 182, '正常网络下延迟 16 ms，带校验和', 'demo-x-ink2', 11.5);
    label(p2, R + 10, 202, '机器人可以离驾驶舱很远', 'demo-x-mut', 10.5);
    var p3 = group(s);
    label(p3, R, 236, 'G1 上实际怎么跑（附录 C）', 'demo-x-ink', 12);
    rich(p3, R, 256, '$\\pi_{loco}$：机载 Jetson Orin（275 TOPS），50 Hz', 11.5, 'demo-x-ink2');
    label(p3, R, 276, '手臂目标 10 Hz 更新，每个目标插值 50 次', 'demo-x-ink2', 11.5);
    label(p3, R, 296, '受限于 G1 的硬件和 TCP；机器人吃得下的话能上 200 Hz', 'demo-x-mut', 10.5);
    label(p3, R, 314, 'D455 头部相机 640×480、约 30 Hz 回传到驾驶舱', 'demo-x-mut', 10.5);
    var p4 = group(s);
    paperPart(p4, 'fig9', 0, 0, 1, 1, R, 324, 280);
    label(p4, R + 140, 324 + 280 * 342 / 1301 + 14, '论文图 9：同一副手套在 SAPIEN 里驱动 12–20 个关节的手', 'demo-x-mut', 9.5, 'middle');
    function draw(t) {
      var p = seg(t, 0.4, 1.4);
      bars.forEach(function (b) {
        b.ba.set(MAXW * b.r.arm / 300 * p, p > 0.95 ? String(b.r.arm) : '');
        b.bh.set(MAXW * b.r.hand / 300 * p, p > 0.95 ? String(b.r.hand) : '');
      });
      setOpacity(pL, win(t, 0.0));
      setOpacity(p1, win(t, 3.6));
      setOpacity(p2, win(t, 7.0));
      setOpacity(p3, win(t, 10.4));
      setOpacity(p4, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 14: 真机任务 ── */
  var TASKS = [
    { id: 't_bottle', fig: '(g)', zh: '蹲下去，从地上捡起瓶子', cap: '项目页视频（原速）：蹲下捡瓶子' },
    { id: 't_oven', fig: '(e)', zh: '抓住把手、往后退，拉开烤箱门', cap: '项目页视频（原速）：后退拉开烤箱' },
    { id: 't_push', fig: '(d)', zh: '推一位坐在椅子上的人（约 60 kg）', cap: '项目页视频（原速）：推椅子上的人' },
    { id: 't_colla', fig: '(b)', zh: '两台机器人、两位操作员传苹果', cap: '项目页视频（原速）：两台机器人传苹果' },
    { id: 't_bang', fig: '项目页', zh: '用木棍用力打，也站得住', cap: '项目页视频（原速）：木棍击打' }
  ];
  function buildSceneReal() {
    var s = sceneSvg('左边依次放五段项目页的真机视频：蹲下捡瓶子、后退拉开烤箱、推椅子上的人、两台机器人传苹果、被木棍击打；右边是论文图 1 的任务清单，正在放的那一项高亮');
    s.appendChild(svgText(24, 26, '真机：图 1 的任务', 'demo-x-ink2', 13.5));
    var clips = TASKS.map(function (q) { return projClip(s, q.id, 24, 44, 448, 252, q.cap); });
    var R = 492;
    label(s, R, 62, '每台机器人一个操作员，全走 Wi-Fi', 'demo-x-ink', 12);
    var rows = TASKS.map(function (q, i) {
      var g = group(s);
      chip(g, R, 78 + i * 46, 290, q.fig + ' ' + q.zh, i === 4 ? C_BAD : C_HOMIE, { size: 11.5, left: true, h: 36 });
      return g;
    });
    var foot = group(s);
    label(foot, 24, 338, '图 1 还有：蹲下拿胶带放上高架 (a)、搬箱子换货架 (c)、', 'demo-x-ink2', 11);
    label(foot, 24, 358, '两只手递番茄 (f)、两臂抱花放进盒子 (h)、上身剧烈动作时保持平衡 (i)', 'demo-x-ink2', 11);
    label(foot, 24, 384, 'G1 约 36 kg，推的人约 60 kg，论文说「大约是机器人的两倍」', 'demo-x-mut', 10.5);
    function draw(t) {
      var cues = [0.4, 3.6, 7.0, 10.4, 13.4];
      var k = 0;
      cues.forEach(function (c, i) { if (i === 0 || t >= c) k = i; });
      clips.forEach(function (c, i) {
        var vis = i === k;
        setOpacity(c.g, vis ? 1 : 0);
        c.at(K.clipSince(t, i === 0 ? 0 : cues[i]), vis);
      });
      rows.forEach(function (g, i) { setOpacity(g, i === k ? 1 : i < k ? 0.45 : 0.2); });
      setOpacity(foot, seg(t, 7.3, 7.7));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 15: 图 11、12 ── */
  function buildSceneTime() {
    var s = sceneSvg('右边先放项目页里递番茄的片段，左边是论文图 11 四个任务的完成时间（我们从矢量图里量的），HOMIE 大约一半；之后右边换成表 X 五位新手连做五次的用时曲线');
    s.appendChild(svgText(24, 26, '图 11、图 12：一半的时间，五次就上手', 'demo-x-ink2', 13.5));
    var pL = group(s);
    label(pL, 24, 62, '图 11：完成时间（s，读图近似值）', 'demo-x-ink', 12);
    var BX = 40, BY = 300, BH = 200, BW = 340;
    hline(pL, BX, BY, BX + BW, BY, C_BORDER, 1.2);
    [0, 5, 10, 15].forEach(function (v) { label(pL, BX - 4, BY - v / 16 * BH + 3, String(v), 'demo-x-mut', 9.5, 'end'); hline(pL, BX, BY - v / 16 * BH, BX + BW, BY - v / 16 * BH, C_BORDER, 0.6, '2 4'); });
    var bars = FIG11.map(function (r, i) {
      var x = BX + 20 + i * 82;
      var a = vbar(pL, x, 28, C_BAD, 0.75), b = vbar(pL, x + 32, 28, C_HOMIE);
      label(pL, x + 30, BY + 16, r.zh, 'demo-x-ink2', 11, 'middle');
      var ta = label(pL, x + 14, 0, '', 'demo-x-mut', 9.5, 'middle'), tb = label(pL, x + 46, 0, '', 'demo-x-ink', 9.5, 'middle');
      var ratio = label(pL, x + 30, BY + 36, '×' + fmt(r.ours / r.vr, 2), 'demo-x-good', 10.5, 'middle');
      return { r: r, a: a, b: b, ta: ta, tb: tb, ratio: ratio };
    });
    legendRow(pL, BX + 20, 360, [['OpenTelevision（VR）', C_BAD], ['HOMIE', C_HOMIE]]);
    var pW = group(s);
    label(pW, 24, 390, '平均约为 VR 方案的 0.59；扫码、递手正好一半', 'demo-x-good', 11.5);
    var R = 410;
    var pR1 = group(s);
    var clip = projClip(pR1, 'handover', R, 44, 370, 208, '项目页视频（原速）：递手（Hand Over）');
    var pR1t = group(s);
    label(pR1t, R, 290, '四个任务：番茄放进果篮、按扫码枪扫条码、', 'demo-x-ink2', 11);
    label(pR1t, R, 310, '左手递右手、手指勾住把手拉开烤箱', 'demo-x-ink2', 11);
    label(pR1t, R, 334, '3 位操作员，每人每个任务做 3 次（项目页）', 'demo-x-mut', 10.5);
    var pR2 = group(s);
    label(pR2, R, 290, '差距在要精确定位、定朝向的任务上更明显：', 'demo-x-ink2', 11);
    label(pR2, R, 310, 'VR 估姿态在「切向」方向上不准，外骨骼没有这个问题', 'demo-x-ink2', 11);
    label(pR2, R, 334, '项目页：约快 2 倍，尤其是要沿径向移动的任务', 'demo-x-mut', 10.5);
    var pR3 = group(s);
    label(pR3, R, 62, '表 X / 图 12：5 位新手，递手任务连做 5 次（s）', 'demo-x-ink', 12);
    var UX = R + 30, UY = 290, UW = 330, UH = 200;
    hline(pR3, UX, UY, UX + UW, UY, C_BORDER, 1.2);
    [10, 20, 30].forEach(function (v) { label(pR3, UX - 4, UY - v / 36 * UH + 3, String(v), 'demo-x-mut', 9.5, 'end'); hline(pR3, UX, UY - v / 36 * UH, UX + UW, UY - v / 36 * UH, C_BORDER, 0.6, '2 4'); });
    for (var q = 0; q < 5; q++) label(pR3, UX + q / 4 * UW, UY + 16, '第 ' + (q + 1) + ' 次', 'demo-x-mut', 9.5, 'middle');
    function ux(q) { return UX + q / 4 * UW; }
    function uy(v) { return UY - v / 36 * UH; }
    TABLE10.forEach(function (u) { pathLine(pR3, u.t.map(function (v, q) { return [ux(q), uy(v)]; }), C_WARN, 1.4).style.opacity = 0.45; });
    pathLine(pR3, [[ux(0), uy(8)], [ux(4), uy(8)]], C_MUTED, 2, '7 5');
    label(pR3, ux(4) + 4, uy(8) - 6, '专家 8 s', 'demo-x-mut', 9.5, 'end');
    var avg = pathLine(pR3, [], C_GOOD, 3);
    var avgPts = TABLE10_AVG.map(function (v, q) { return [ux(q), uy(v)]; });
    var avgLab = label(pR3, ux(0) + 8, uy(24.8) - 8, '平均 24.8', 'demo-x-good', 10.5);
    var avgLab2 = label(pR3, ux(4) - 8, uy(8.0) + 18, '8.0', 'demo-x-good', 10.5, 'end');
    var pR4 = group(s);
    label(pR4, R, 330, '身高 160–185 cm、体重 55–90 kg，男 4 女 1，都没用过', 'demo-x-ink2', 11);
    label(pR4, R, 351, '上手流程 6 步、约 5 分钟：穿背带 → 调座椅和踏板 → 讲踏板 →', 'demo-x-ink2', 11);
    label(pR4, R, 372, '试手套 → 试外骨骼 → 开始做任务（附录 D）', 'demo-x-ink2', 11);
    function draw(t) {
      var p = seg(t, 3.9, 5.0);
      bars.forEach(function (b) {
        var ha = b.r.vr / 16 * BH * p, hb = b.r.ours / 16 * BH * p;
        b.a.set(BY, ha); b.b.set(BY, hb);
        b.ta.setAttribute('y', (BY - ha - 4).toFixed(1)); b.ta.textContent = p > 0.95 ? fmt(b.r.vr, 1) : '';
        b.tb.setAttribute('y', (BY - hb - 4).toFixed(1)); b.tb.textContent = p > 0.95 ? fmt(b.r.ours, 1) : '';
        b.ratio.style.opacity = seg(t, 5.0, 5.4);
      });
      setOpacity(pL, win(t, 3.6));
      setOpacity(pW, win(t, 7.0));
      var showClip = t < 10.4 + 0.3;
      clip.at(K.clipSince(t, 0), showClip);
      setOpacity(pR1, win(t, -0.4, 10.4));
      setOpacity(pR1t, win(t, -0.4, 7.0));
      setOpacity(pR2, win(t, 7.0, 10.4));
      setOpacity(pR3, win(t, 10.4));
      var u = seg(t, 10.9, 12.4), n = Math.max(1, Math.round(1 + u * 4));
      setPath(avg, avgPts.slice(0, n));
      avgLab.style.opacity = u > 0 ? 1 : 0; avgLab2.style.opacity = u > 0.99 ? 1 : 0;
      setOpacity(pR4, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 16: 仿真与自主策略 ── */
  function buildSceneAuto() {
    var s = sceneSvg('左边依次放三段项目页视频：G1 在 GRUtopia 仿真场景里被遥操作、自主策略蹲下拿沙发上的番茄、自主策略抓番茄放进篮子；右边是仿真迁移、数据采集、Seer 模型、表 V 成功率和数据飞轮');
    s.appendChild(svgText(24, 26, '仿真里也能开；采的数据训出自主策略', 'demo-x-ink2', 13.5));
    var cl = [projClip(s, 'sim', 24, 44, 384, 216, '项目页视频（原速）：G1 在 GRUtopia 场景里'),
      projClip(s, 'il_squat', 24, 44, 384, 216, '项目页视频（原速）：自主策略 · 蹲下拿番茄'),
      projClip(s, 'il_pick', 24, 44, 384, 216, '项目页视频（原速）：自主策略 · 抓放番茄')];
    var R = 428;
    var p1 = group(s);
    label(p1, R, 62, '仿真迁移：Isaac Gym → Isaac Sim（GRUtopia）', 'demo-x-ink', 12);
    label(p1, R, 84, '关节顺序：深度优先 → 广度优先；四元数 xyzw → wxyz', 'demo-x-ink2', 11);
    label(p1, R, 104, '相机挂在 USD 里对应的连杆上，参数照真机', 'demo-x-ink2', 11);
    label(p1, R, 125, '同一个驾驶舱也能开仿真里的机器人', 'demo-x-good', 11);
    var p2 = group(s);
    label(p2, R, 152, '采数据：两个任务，各 50 条示范，10 Hz', 'demo-x-ink', 12);
    rich(p2, R, 172, 'RGB（头上 D455 + 两臂上的 D435）、$q_t$、$q_{upper}$、$C_t$', 11, 'demo-x-ink2');
    var p3 = group(s);
    label(p3, R, 200, '模型：Seer（自回归 Transformer）', 'demo-x-ink', 12);
    label(p3, R, 221, 'MAE 预训练的 ViT-B 编码多视角图像，MLP 编码本体感受', 'demo-x-ink2', 11);
    label(p3, R, 241, '三个回归头：手臂关节、灵巧手、高度命令；SmoothL1 损失', 'demo-x-ink2', 11);
    label(p3, R, 261, '序列长 7，往前看 3 步；8 块 A100 训 40 个 epoch', 'demo-x-mut', 10.5);
    var p4 = group(s);
    label(p4, R, 288, '表 V：每个任务测 15 次', 'demo-x-ink', 12);
    var bars = TABLE5.map(function (r, i) { return barRowAt(p4, R, 300 + i * 26, 120, r.zh, C_HOMIE, 18); });
    label(p4, R, 364, '主机 RTX 4080，有线连 G1，整个回路 10 Hz', 'demo-x-mut', 10.5);
    var p5 = group(s);
    chip(p5, 24, 296, 384, '遥操作 → 示范数据 → $\\pi_{auto}$ → 替操作员给 $C_t$、$q_{upper}$', C_HOMIE, { size: 11.5, h: 32 });
    rich(p5, 24, 352, '数据飞轮：接口只有 $C_t$ 和 $q_{upper}$，什么策略都能接上来', 11, 'demo-x-ink2');
    function draw(t) {
      var k = t < 7.0 ? 0 : t < 10.4 ? 1 : 2;
      var starts = [0, 6.6, 10.0];
      cl.forEach(function (c, i) { setOpacity(c.g, i === k ? 1 : 0); c.at(K.clipSince(t, starts[i]), i === k); });
      setOpacity(p1, win(t, 0.0));
      setOpacity(p2, win(t, 3.6));
      setOpacity(p3, win(t, 7.0));
      setOpacity(p4, win(t, 10.4));
      var p = seg(t, 10.8, 11.8);
      bars.forEach(function (b, i) { b.set(200 * TABLE5[i].sr / 100 * p, p > 0.95 ? fmt(TABLE5[i].sr, 1) + '%（' + Math.round(TABLE5[i].sr * 15 / 100) + ' / 15）' : ''); });
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 17: 局限与代码 ── */
  function buildSceneLimits() {
    var s = sceneSvg('上面是论文图 17：仿真里上台阶、真机上撞台阶；下面依次列出局限、开源的代码、代码和论文的出入，最后总结');
    s.appendChild(svgText(24, 26, '局限与代码', 'demo-x-ink2', 13.5));
    var p1 = group(s);
    var fig = paperPart(p1, 'fig17', 0, 0, 1, 1, 40, 44, 720, '论文图 17：接上 PIM 在仿真里上台阶（左），真机上撞到台阶（右）');
    label(p1, 40, 44 + fig.h + 44, '地形：仿真里能上高台阶；真机上头上的激光雷达跟着晃、高程图分辨率低，会撞台阶', 'demo-x-ink2', 11.5);
    var Y = 44 + fig.h + 66;
    var p2 = group(s);
    [['手套的拇指设计不完全符合人手，控制某些灵巧手不顺手', C_BAD], ['没有力反馈，要靠触觉的精细操作做不了', C_BAD], ['外骨骼不能遥操作腰（策略本身支持任意上身姿态）', C_BAD]].forEach(function (q, i) {
      chip(p2, 40, Y + i * 34, 720, q[0], q[1], { size: 11.5, left: true, h: 28 });
    });
    var p3 = group(s);
    label(p3, 40, Y + 4, '开源：InternRobotics/OpenHomie', 'demo-x-ink', 12.5);
    label(p3, 40, Y + 26, 'HomieRL（Isaac Gym，基于 HIMLoco）· HomieDeploy（带训好的 deploy.onnx）· MuJoCo 部署', 'demo-x-ink2', 11);
    label(p3, 40, Y + 46, '硬件文件要填表申请；CC BY-NC-SA 4.0，禁止商用', 'demo-x-mut', 10.5);
    label(p3, 40, Y + 70, 'README 2026-07：v2 策略在 GR00T-WholeBodyControl 的 decoupled_wbc，作者建议直接用 SONIC', 'demo-x-mut', 10.5);
    var p4 = group(s);
    label(p4, 40, Y + 4, '代码和论文的出入', 'demo-x-ink', 12.5);
    [['命令 4 维：多了 $v_y$', C_PURPLE], ['蹲 1/3、站 1/6、走 1/2', C_LOW], ['$\\lambda = 20\\,(1 - 0.99\\rho_a)$', C_UP], ['部署增益：腿 150 / 300', C_ACCENT]].forEach(function (q, i) {
      chip(p4, 40 + (i % 2) * 364, Y + 16 + Math.floor(i / 2) * 36, 356, q[0], q[1], { size: 11.5, h: 30 });
    });
    var p5 = group(s);
    rectBox(p5, 40, Y - 14, 720, 92, C_HOMIE);
    label(p5, 56, Y + 8, 'HOMIE：一个驾驶舱，一个人遥操作整台人形', 'demo-x-ink', 13);
    rich(p5, 56, Y + 32, '脚踩踏板 → $C_t$ → 不用动捕训出来的 $\\pi_{loco}$：走、转、蹲到任意高度', 11.5, 'demo-x-ink2');
    rich(p5, 56, Y + 54, '手臂穿同构外骨骼 → $q_{upper}$ 直接设定；手戴霍尔手套 → 灵巧手；约 500 美元', 11.5, 'demo-x-ink2');
    function draw(t) {
      setOpacity(p1, win(t, 0.0));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  var HOMIE_SCENES = [
    {
      title: '两条路各缺一半',
      dur: 16,
      build: buildSceneTwoRoads,
      cues: [
        { at: 0.4, s: '强化学习训出来的全身控制会走、会适应环境，但没有实时、精确的**遥操作接口**。' },
        { at: 3.6, s: '遥操作系统大多只管上半身，不考虑走动对工作空间的影响：手很准，脚却站在原地。' },
        { at: 7.0, s: '两头都吃亏：要么移动时牺牲灵巧操作，要么操作时工作空间被卡住（货架是示意）。' },
        { at: 10.4, s: 'HOMIE 把它们装进一个**驾驶舱**：踏板管走和蹲，同构外骨骼管手臂，体感手套管手指。' },
        { at: 13.4, s: '论文图 1：操作员遥操作 G1 做各种移动操作。RSS 2025，硬件约 500 美元。' }
      ]
    },
    {
      title: '一个驾驶舱：踏板、外骨骼、手套',
      dur: 16,
      build: buildSceneCockpit,
      cues: [
        { at: 0.4, s: '论文图 2：左边是驾驶舱和真机 / 仿真，右边是两个策略。' },
        { at: 3.6, s: '脚踩踏板给出 $C_t = [v_x, \\omega_{yaw}, h_t]$，$\\pi_{loco}$ 在机载 Orin 上以 50 Hz 控制下肢。' },
        { at: 7.0, s: '外骨骼读出 $q_{upper}$，**直接**设给上身，不解逆运动学；手套驱动灵巧手。' },
        { at: 10.4, s: '头部相机的第一视角经 Wi-Fi 传回舱内屏幕；通信全走 Wi-Fi，机器人可以离得很远。' },
        { at: 13.4, s: '遥操作时顺便采数据，训练自主策略 $\\pi_{auto}$，学会后替操作员给出 $C_t$ 和 $q_{upper}$。' }
      ]
    },
    {
      title: '表 I：和十个遥操作系统比',
      dur: 16,
      build: buildSceneTable1,
      cues: [
        { at: 0.4, s: '同构机械臂（Mobile-ALOHA、GELLO、AirExo、ACE）：关节匹配，准、快，但只有夹爪、不管全身。' },
        { at: 3.6, s: '视觉 / VR 方案：先估姿态再解逆运动学，延迟高、怕遮挡、有误差。' },
        { at: 7.0, s: '能全身移动操作的 HumanPlus、OmniH2O、Mobile-TeleVision：训练都要动捕数据做动作先验。' },
        { at: 10.4, s: 'HOMIE：手臂、手都是关节匹配，能移动操作、能全身、不用动捕。' },
        { at: 13.4, s: '只有 HOMIE 一行全是勾；价格约是 Mobile-ALOHA 的 $1/64$。' }
      ]
    },
    {
      title: '下半身交给强化学习',
      dur: 16,
      build: buildSceneLower,
      cues: [
        { at: 0.4, s: '分工：下肢 12 个关节由策略 $\\pi_{loco}$ 输出；腰和两臂 15 个关节由外骨骼直接设定。' },
        { at: 3.6, s: '一步观测 76 维：命令、角速度、重力、27 个关节的角度和速度、上一步的 12 维动作。' },
        { at: 7.0, s: '叠 6 步共 456 维；估计器压成 3 维速度 + 32 维潜变量，再和当前观测一起出 12 个目标角。' },
        { at: 10.4, s: 'PD 控制：目标角 = 默认角 + 0.25 × 动作，策略 50 Hz。' },
        { at: 13.4, s: 'Isaac Gym 4096 个环境，RTX 4090 约 3 小时，**不用任何动捕数据**。' }
      ]
    },
    {
      title: '上身姿态课程',
      dur: 16,
      build: buildSceneCurriculum,
      cues: [
        { at: 0.4, s: '操作员的手臂随时在动：下半身要在**任意上身姿态**下站稳、走、蹲。一上来就随机大幅摆，学不会。' },
        { at: 3.6, s: '课程比例 $\\rho_a$ 从 0 开始，x 方向速度跟得好就加 0.05；$\\rho_a$ 越大，分布越往右铺开。' },
        { at: 7.0, s: "先按式 2 抽 $\\rho_a'$，再取 $a_i \\sim \\mathcal{U}(0, \\rho_a')$：每个关节往限位走 $a_i$ 那么远。" },
        { at: 10.4, s: '每 1 s 重采样一次目标，这 1 s 里线性插值过去；不插值的话机器人站不稳。' },
        { at: 13.4, s: '比 $\\mathcal{U}(0, \\rho_a)$ 平滑：任何时候 $[0, 1]$ 都有概率被采到。代码里 $\\lambda = 20(1 - 0.99\\rho_a)$。' }
      ]
    },
    {
      title: '高度跟踪奖励 $r_{knee}$',
      dur: 16,
      build: buildSceneKnee,
      cues: [
        { at: 0.4, s: '能蹲下去才够到低处。目标高度 $h_t$ 由中间那只踏板给，代码里蹲的范围是 0.24–0.74 m。' },
        { at: 3.6, s: '式 4：高度差乘「归一化膝角减 1/2」，取负的绝对值；膝角在中间时这一项为 0。' },
        { at: 7.0, s: '算例 A：比目标高 0.33 m、膝盖偏直，膝再弯一点罚得少——鼓励弯。' },
        { at: 10.4, s: '算例 B：比目标低 0.32 m、膝盖偏弯，膝伸一点罚得少——鼓励伸。' },
        { at: 13.4, s: '代码权重 $-0.75$；论文正文那句「低于目标鼓励弯」和公式的方向相反（我们的理解：笔误）。' }
      ]
    },
    {
      title: '训练场：蹲、走、站轮着来',
      dur: 16,
      build: buildSceneTraining,
      cues: [
        { at: 0.4, s: '每 4 s 重采样一次命令，一个回合 20 s；同一个环境会在蹲、走、站之间换来换去。' },
        { at: 3.6, s: '论文：1/3 的环境练蹲、2/3 练站和走。代码：蹲 1/3、站着不动 1/6、走 1/2。' },
        { at: 7.0, s: '蹲时速度清零、高度在 0.24–0.74 m 随机；走时三个速度随机、高度 0.74 m。' },
        { at: 10.4, s: '代码里有 7 项奖励只在目标高度 $\\geq 0.735$ m 时才算，蹲着时不罚髋、踝偏离和两脚间距。' },
        { at: 13.4, s: '域随机化：手上加重、躯干加重、每 4 s 推一下、摩擦、PD 增益；奖励一共 33 项。' }
      ]
    },
    {
      title: '对称：一条数据当两条用',
      dur: 16,
      build: buildSceneSymmetry,
      cues: [
        { at: 0.4, s: '每条转移 $T_t$ 沿机器人的 x-z 平面镜像，得到 $T_t\'$。' },
        { at: 3.6, s: '左右关节对调，横滚、偏航取负；命令的 $v_y$、$\\omega_{yaw}$ 也取负。' },
        { at: 7.0, s: '原始的和镜像的都进回放缓冲区：数据量翻倍。' },
        { at: 10.4, s: "再加两项损失：$\\mathrm{MSE}(a_t, a_t')$ 和 $\\mathrm{MSE}(V_t, V_t')$，逼网络左右对称。" },
        { at: 13.4, s: '官方策略在我们的 MuJoCo 回放上对称损失平均 0.0044；只抬左臂时，镜像后左右髋正好对调。' }
      ]
    },
    {
      title: '图 7：三组消融',
      dur: 16,
      build: buildSceneAblation,
      cues: [
        { at: 0.4, s: '图 7：每组 3 个种子、1000 个环境 × 20 s，上身按 $\\rho_a \\to 1$ 随机。' },
        { at: 3.6, s: '上身课程：ours 三项跟踪误差都更低、收敛更快。' },
        { at: 7.0, s: '只把高度奖励放大（hei）：速度误差大得多，高度误差最后也不比 ours 快。' },
        { at: 10.4, s: '对称：只增强时对称损失涨到 20 左右；不做增强的两组，存活时间一直在 1 s 左右。' },
        { at: 13.4, s: '增强提高数据效率，对称损失保住左右对称；项目页说训练快了 10 倍以上。' }
      ]
    },
    {
      title: '换一台机器人：GR-1（表 II）',
      dur: 16,
      build: buildSceneGr1,
      cues: [
        { at: 0.4, s: 'Fourier GR-1 比 G1 高 35 cm、重近 20 kg，手占体重的比例只有一半。' },
        { at: 3.6, s: '只改跟身材有关的几个数：站立高度、蹲的范围、两脚间距；训练流程不变。' },
        { at: 7.0, s: '表 II：两台都活满 20 s 左右，GR-1 的速度误差大一些。' },
        { at: 10.4, s: '我们在 MuJoCo 里回放官方 G1 策略：200 段里 174 段活满 20 s（定义不同，不能直接比）。' },
        { at: 13.4, s: 'GR-1 的训练代码没有放出来。' }
      ]
    },
    {
      title: '同构外骨骼：读数就是关节角',
      dur: 16,
      build: buildSceneExo,
      cues: [
        { at: 0.4, s: '关节匹配：外骨骼和 G1 的手臂结构一样，读数直接当关节角，不解逆运动学。' },
        { at: 3.6, s: '每条手臂 7 个自由度：肩 3、肘 1、腕 3，对上 G1 的手臂。' },
        { at: 7.0, s: '每个关节一个 XL330 舵机，一圈 4096 格，约 0.09° 一格；断电记得绝对位置。' },
        { at: 10.4, s: '零点偏差是 $\\pi/2$ 的整数倍：$q_t = p_t + n_t\\pi/2$；例如读数 1.20、$n = -1$，得 $-0.371$ rad。' },
        { at: 13.4, s: '长度按人的手臂做，舵机轴对齐 G1 的关节轴；3D 打印，两臂 430 美元。' }
      ]
    },
    {
      title: '手套与踏板（表 III）',
      dur: 16,
      build: buildSceneGlovePedal,
      cues: [
        { at: 0.4, s: '手套：每个关节一颗小磁铁和一个霍尔传感器，磁铁转、磁场变，量出角度。' },
        { at: 3.6, s: '每根手指 3 个角，5 根共 15 个自由度；手套能拆下来换到别的外骨骼上。' },
        { at: 7.0, s: '踏板：左管转向、中间管高度、右管前后速度，两边的开关换方向。' },
        { at: 10.4, s: '电位器量踏板转角，弹簧让它松脚回位。手留给手臂，人也不用跟着机器人走。' },
        { at: 13.4, s: '表 III：外骨骼 430、手套每只 30、踏板 20 美元，合计 510 美元。' }
      ]
    },
    {
      title: '表 IV：263 Hz，不用 GPU',
      dur: 16,
      build: buildSceneFreq,
      cues: [
        { at: 0.4, s: '表 IV：输出给手臂、手的频率，HOMIE 是 263 Hz 和 293 Hz，视觉 / VR 方案 16–125 Hz。' },
        { at: 3.6, s: '不估姿态、不解逆运动学，读到就发：输出频率几乎等于采集频率。' },
        { at: 7.0, s: 'Wi-Fi 一包 128 字节（32 个 float32），延迟 16 ms。' },
        { at: 10.4, s: '在 G1 上手臂目标其实是 10 Hz 更新、每个插值 50 次；$\\pi_{loco}$ 在机载 Orin 上 50 Hz。' },
        { at: 13.4, s: '图 9：同一副手套在仿真里驱动 Inspire、LEAP、Shadow、Schunk 四种手。' }
      ]
    },
    {
      title: '真机：图 1 的任务',
      dur: 16,
      build: buildSceneReal,
      cues: [
        { at: 0.4, s: '蹲下去从地上捡瓶子：踏板压低高度，手臂伸向地面。' },
        { at: 3.6, s: '抓住烤箱把手、边退边拉开门：腿和手同时在动。' },
        { at: 7.0, s: '推一位坐在椅子上、约 60 kg 的人，大约是机器人体重的两倍。' },
        { at: 10.4, s: '两台机器人、两位操作员配合传苹果。' },
        { at: 13.4, s: '用木棍用力打，也站得住（项目页的鲁棒性实验）。' }
      ]
    },
    {
      title: '图 11、12：一半的时间，五次上手',
      dur: 16,
      build: buildSceneTime,
      cues: [
        { at: 0.4, s: '四个桌面任务比完成时间：抓放、扫码、递手、开烤箱，对手是 VR 方案 OpenTelevision。' },
        { at: 3.6, s: '图 11（读图）：HOMIE 的用时约为 VR 方案的 0.50–0.72，平均约 0.59。' },
        { at: 7.0, s: '要精确定位、定朝向时差距更大：VR 估姿态在切向上不准，外骨骼没有这个问题。' },
        { at: 10.4, s: '表 X：5 位新手连做 5 次递手，平均从 24.8 s 降到 8.0 s，追上专家。' },
        { at: 13.4, s: '身高 160–185 cm 都能用；从穿戴到开始做任务，上手流程约 5 分钟。' }
      ]
    },
    {
      title: '仿真里开，数据训自主策略',
      dur: 16,
      build: buildSceneAuto,
      cues: [
        { at: 0.4, s: '把策略从 Isaac Gym 迁到 Isaac Sim 的 GRUtopia 场景：同一个驾驶舱也能开仿真里的机器人。' },
        { at: 3.6, s: '采数据：两个任务各 50 条示范，10 Hz 记录图像、$q_t$、$q_{upper}$ 和 $C_t$。' },
        { at: 7.0, s: '用 Seer 训练自主策略：看多视角图像和本体感受，输出手臂、手和高度命令。' },
        { at: 10.4, s: '表 V：蹲下拿番茄 73.3%，抓放 80.0%（各测 15 次）。' },
        { at: 13.4, s: '这就是数据飞轮：接口只有 $C_t$ 和 $q_{upper}$，什么上层策略都能接上来。' }
      ]
    },
    {
      title: '局限与代码',
      dur: 16,
      build: buildSceneLimits,
      cues: [
        { at: 0.4, s: '地形：接上 PIM 后仿真里能上台阶，真机上头部雷达晃、高程图粗，会撞台阶。' },
        { at: 3.6, s: '拇指设计不完全符合人手；没有力反馈；外骨骼不能遥操作腰。' },
        { at: 7.0, s: '开源 OpenHomie：训练代码、部署代码和一个训好的 deploy.onnx；硬件文件要申请，禁止商用。' },
        { at: 10.4, s: '代码和论文有几处出入：命令多了 $v_y$、蹲走站的比例、$\\lambda$ 的写法、部署增益。' },
        { at: 13.4, s: 'HOMIE：踏板控走与蹲、外骨骼控手臂、手套控手指，下半身一个不用动捕的强化学习策略。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十七幕动画：HOMIE 全流程速览',
      sub: '约 272 秒自动播放。空格播放/暂停，← → 换幕；G1 用我们在 MuJoCo 里跑官方策略 deploy.onnx 的动作按真实模型做 3D 渲染，表格与图来自论文，真机与仿真片段剪自项目页的视频。',
      ariaLabel: 'HOMIE 十七幕讲解动画',
      notes: [
        '取数依据：表 I–V、IX、X 与正文的数字照抄 arXiv 2502.13013 v2；图 11 的完成时间是我们从论文 PDF 的矢量图里量的条高（读图近似值），图 7 的说法是读图；代码里的数（观测 76 × 6 = 456 维、命令 4 维、蹲 / 站 / 走 1/3 / 1/6 / 1/2、λ = 20(1 − 0.99ρ_a)、只在站着时才算的 7 项奖励、部署增益）读自 InternRobotics/OpenHomie。',
        'G1 的动作是我们在 MuJoCo 里跑官方 HomieDeploy/deploy.onnx 得到的（sim-to-sim，不是论文的实验）：走路 0.5 m/s、蹲到 0.40 m 再站起、按代码的课程随机摆上身（ρ_a = 0.2 与 ρ_a → 1）、站着只动手臂；增益用真机部署的 g1_control.cpp。第 1 幕的货架是示意，第 7 幕的时间轴是按代码比例随机抽的示意。',
        'G1 的 3D 外形：Robot Retarget Online（ImChong/Robot_Retarget_Online）的带 Dex3 手的 G1 模型、材质与光照，按仿真的关节角用正交相机逐帧离线渲染；第 8 幕的镜像是把同一张贴图水平翻转。真机与仿真片段剪自项目页 homietele.github.io 的视频（原速），只做讲解引用。'
      ],
      scenes: HOMIE_SCENES
    });
  }

  // ─── the narrated vertical video of the same seventeen scenes ──────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：HOMIE 十七幕全流程',
      sub: '__VIDEO_LEN__竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十七幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '__VIDEO_SIZE__',
      fileName: 'HOMIE_讲解视频.mp4'
    });
  }

  // ─── 演示 1：上身姿态课程 ───────────────────────────────────────────────────
  function buildCurriculumDemo(host) {
    var root = card(host, {
      title: '上身姿态课程：拖 $\\rho_a$，看采样分布与关节目标',
      sub: '左图是式 2 的密度 $p(\\rho_a\' \\mid \\rho_a)$；中图是按式 3 抽 4000 次关节目标（占到限位的比例）的直方图；右图是一个关节 10 s 里的目标：每 1 s 重采样、1 s 内线性插值。'
    });
    var state = { r: 0.5, paper: false, seed: 1 };
    var row = controlsRow(root);
    slider(row, { label: '课程比例 $\\rho_a$', min: 0, max: 1, step: 0.05, value: 0.5, format: function (v) { return fmt(v, 2); }, onInput: function (v) { state.r = v; render(); } });
    buttonGroup(row, { label: '$\\lambda$ 的写法', items: [{ label: '代码：$20(1 - 0.99\\rho_a)$', value: false }, { label: '论文：$20(1 - \\rho_a)$', value: true }], value: false, onPick: function (v) { state.paper = v; render(); } });
    buttonGroup(row, { label: '', items: [{ label: '重新抽一次', value: 'again' }], value: null, onPick: function () { state.seed += 1; render(); } });
    var grid = K.stageGrid(root);
    var st1 = stage(grid, 240), st2 = stage(grid, 240), st3 = stage(grid, 240);
    var stats = statsRow(root);
    var sL = stats.add('λ'), sM = stats.add("$\\rho_a'$ 的均值"), sJ = stats.add('关节目标的均值'), sP = stats.add('超过一半限位的概率');
    note(root, ['$\\rho_a = 1$ 时论文的 λ 是 0，分布正好是 $\\mathcal{U}(0, 1)$；代码乘了 0.99，λ 最小是 0.2，$\\rho_a\'$ 的均值是 0.483 而不是 0.5。',
      '关节目标 = 默认角 +（上限或下限 − 默认角）× $a_i$，上限、下限各一半概率；G1 上身默认角都是 0。例：左肘上限 2.094 rad，$\\rho_a = 1$ 时往上限那边的平均目标约 0.506 rad（29°）。',
      '训练里 $\\rho_a$ 每次 +0.05：代码每 1000 步（一个回合的长度）查一次，x 方向速度跟踪的回合奖励过了满分的 80% 才加。']);
    function render() {
      var r = state.r, P;
      /* 密度 */
      var g = begin(st1); P = g.P;
      var pl = K.plot(g, { l: 34, r: 10, t: 16, b: 26 }, [0, 1], [0, 21]);
      K.axes(g, pl, { xTicks: [0, 0.5, 1], yTicks: [0, 10, 20], xLabel: "ρ_a'" });
      [0, 0.5, 0.9, 1].forEach(function (q) {
        var ps = []; for (var j = 0; j <= 100; j++) { var x = j / 100; ps.push([pl.sx(x), pl.sy(Math.min(21, density(x, q, state.paper)))]); }
        line(g.ctx, ps, P.grid, 1.2);
      });
      var ps = []; for (var j = 0; j <= 100; j++) { var x = j / 100; ps.push([pl.sx(x), pl.sy(Math.min(21, density(x, r, state.paper)))]); }
      line(g.ctx, ps, P.accent, 2.6);
      text(g.ctx, '密度', pl.x0 + 4, pl.y1 + 10, P.muted);
      /* 直方图：a_i = U(0, ρ') */
      var rng = K.mulberry32(state.seed * 7919 + Math.round(r * 100)), N = 4000, bins = new Array(20).fill(0), sum = 0, over = 0;
      for (var n = 0; n < N; n++) { var rho = sampleRho(r, rng(), state.paper), a = rho * rng(); sum += a; if (a > 0.5) over++; bins[Math.min(19, Math.floor(a * 20))]++; }
      var g2 = begin(st2);
      var mx = Math.max.apply(null, bins);
      var pl2 = K.plot(g2, { l: 34, r: 10, t: 16, b: 26 }, [0, 1], [0, mx * 1.1]);
      K.axes(g2, pl2, { xTicks: [0, 0.5, 1], xLabel: '占限位的比例' });
      bins.forEach(function (c, i) {
        g2.ctx.fillStyle = P.warn; var x0 = pl2.sx(i / 20) + 1, x1 = pl2.sx((i + 1) / 20) - 1;
        g2.ctx.fillRect(x0, pl2.sy(c), x1 - x0, pl2.sy(0) - pl2.sy(c));
      });
      text(g2.ctx, '4000 次抽样', pl2.x0 + 4, pl2.y1 + 10, P.muted);
      /* 一个关节 10 s 的目标轨迹 */
      var g3 = begin(st3);
      var pl3 = K.plot(g3, { l: 40, r: 10, t: 16, b: 26 }, [0, 10], [-1.1, 2.2]);
      K.axes(g3, pl3, { xTicks: [0, 5, 10], yTicks: [-1, 0, 1, 2], xLabel: 's', yLabel: 'rad' });
      var rng2 = K.mulberry32(state.seed * 104729 + Math.round(r * 100)), cur = 0, pts = [[pl3.sx(0), pl3.sy(0)]];
      for (var k = 0; k < 10; k++) {
        var rho2 = sampleRho(r, rng2(), state.paper), a2 = rho2 * rng2(), tgt = (rng2() - 0.5 >= 0 ? -1.047 : 2.094) * a2;
        pts.push([pl3.sx(k + 1), pl3.sy(tgt)]); cur = tgt;
      }
      line(g3.ctx, [[pl3.sx(0), pl3.sy(2.094)], [pl3.sx(10), pl3.sy(2.094)]], P.grid, 1, [4, 4]);
      line(g3.ctx, [[pl3.sx(0), pl3.sy(-1.047)], [pl3.sx(10), pl3.sy(-1.047)]], P.grid, 1, [4, 4]);
      line(g3.ctx, pts, P.warn, 2.4);
      text(g3.ctx, '左肘（限位 −1.047 ~ 2.094）', pl3.x0 + 4, pl3.y1 + 10, P.muted);
      void cur;
      sL.set(fmt(lam(r, state.paper), 2));
      sM.set(fmt(meanRho(r, state.paper), 3), 'accent');
      sJ.set(fmt(sum / N, 3) + '（理论 ' + fmt(meanRho(r, state.paper) / 2, 3) + '）');
      sP.set(fmt(100 * over / N, 1) + '%');
    }
    registerRenderer(render);
    render();
  }

  // ─── 演示 2：r_knee 计算器 ──────────────────────────────────────────────────
  function buildKneeDemo(host) {
    var root = card(host, {
      title: '$r_{knee}$ 计算器：高度差 × (归一化膝角 − 1/2)',
      sub: '拖「下蹲那段的帧」看我们在 MuJoCo 里跑官方策略的真实状态，或者直接拖高度差和膝角。热图是 $|r_{knee}|$（越亮罚得越多），十字是当前状态；箭头是只动膝角时罚款变少的方向。'
    });
    var state = { k: EX_DOWN, manual: false, e: 0.33, q: 0.96 };
    var row = controlsRow(root);
    var sk = slider(row, { label: '下蹲那段的帧（15 fps）', min: 0, max: SEQ.squat.n - 1, step: 1, value: EX_DOWN, format: function (v) { return '第 ' + f2(v / 15) + ' s'; }, onInput: function (v) { state.k = v; state.manual = false; render(); } });
    var row2 = controlsRow(root);
    slider(row2, { label: '高度差 $h_{r,t} - h_t$（m）', min: -0.5, max: 0.5, step: 0.01, value: 0.33, format: function (v) { return sgn(fmt(v, 2)); }, onInput: function (v) { state.e = v; state.manual = true; render(); } });
    slider(row2, { label: '膝角（rad）', min: -0.08, max: 2.87, step: 0.01, value: 0.96, format: function (v) { return fmt(v, 2); }, onInput: function (v) { state.q = v; state.manual = true; render(); } });
    void sk;
    var st = stage(root, 300);
    var stats = statsRow(root);
    var sN = stats.add('归一化膝角 $n$'), sR = stats.add('$r_{knee}$（两膝）'), sW = stats.add('× 权重 0.75'), sD = stats.add('只动膝角时');
    var verdict = verdictBox(root);
    note(root, ['代码 `_reward_deviation_knee_joint`：高度差用骨盆 $z$ 减目标高度；膝角按硬限位 $[-0.0873, 2.8798]$ rad 归一化；两条腿各算一次再相加，乘权重 −0.75，legged_gym 还会再乘 $dt = 0.02$。',
      '零点有两条线：高度差为 0，或膝角正好在中间（1.40 rad）。$n < 1/2$ 时它总是鼓励弯、$n > 1/2$ 时总是鼓励伸，和高度差的正负无关；所以真正把机器人带到目标高度的，是它和高度奖励 $\\exp(-4|\\text{误差}|)$ 一起作用（我们的分析）。',
      '下蹲那段：我们在 MuJoCo 里跑官方 deploy.onnx，命令在第 0.5 s 从 0.74 m 换成 0.40 m、第 4.0 s 换回 0.74 m；默认的第 0.53 s 与第 4.0 s 就是笔记「🚶 具体实例」的例 3。']);
    function render() {
      var e, qL, qR;
      if (state.manual) { e = state.e; qL = qR = state.q; }
      else { var f = frame('squat', state.k); e = f.root[2] - f.hcmd; qL = f.knee[0]; qR = f.knee[1]; }
      var g = begin(st), P = g.P, ctx = g.ctx;
      var pl = K.plot(g, { l: 44, r: 14, t: 14, b: 30 }, [0, 1], [-0.5, 0.5]);
      var nx = 60, ny = 40, cw = (pl.x1 - pl.x0) / nx, chh = (pl.y0 - pl.y1) / ny;
      for (var i = 0; i < nx; i++) for (var j = 0; j < ny; j++) {
        var n = (i + 0.5) / nx, ee = 0.5 - (j + 0.5) / ny;
        var v = Math.abs((n - 0.5) * ee) / 0.25;
        ctx.fillStyle = 'rgba(214, 69, 65,' + (0.05 + 0.85 * v).toFixed(3) + ')';
        ctx.fillRect(pl.x0 + i * cw, pl.y1 + j * chh, cw + 0.5, chh + 0.5);
      }
      K.axes(g, pl, { xTicks: [0, 0.5, 1], yTicks: [-0.4, 0, 0.4], xLabel: '归一化膝角 n', yLabel: '高度差 m' });
      var n0 = kneeN(qL), x = pl.sx(clamp(n0, 0, 1)), y = pl.sy(clamp(e, -0.5, 0.5));
      line(ctx, [[x - 9, y], [x + 9, y]], P.text, 2); line(ctx, [[x, y - 9], [x, y + 9]], P.text, 2);
      var dir = n0 < 0.5 ? 1 : -1;
      if (Math.abs(e) > 0.005 && Math.abs(n0 - 0.5) > 0.01) {
        line(ctx, [[x, y], [x + dir * 34, y]], P.good, 3);
        line(ctx, [[x + dir * 34, y], [x + dir * 26, y - 5]], P.good, 3); line(ctx, [[x + dir * 34, y], [x + dir * 26, y + 5]], P.good, 3);
      }
      var r = rKnee(e, qL, qR);
      sN.set(fmt(n0, 3));
      sR.set(sgn(fmt(r, 4)));
      sW.set(sgn(fmt(0.75 * r, 4)), 'accent');
      sD.set(Math.abs(e) < 0.005 ? '高度已对上' : n0 < 0.5 ? '弯膝罚得少' : '伸膝罚得少', 'good');
      var right = (e > 0 && n0 < 0.5) || (e < 0 && n0 > 0.5);
      verdict.set(Math.abs(e) < 0.005 ? '高度差约为 0：这一项几乎不罚。' : (e > 0 ? '比目标**高**' : '比目标**低**') + ' ' + fmt(Math.abs(e), 3) + ' m，膝' + (n0 < 0.5 ? '偏直' : '偏弯') + '：只动膝角时罚款变少的方向是' + (n0 < 0.5 ? '**弯**' : '**伸**') + '，' + (right ? '正好把高度往目标带。' : '这时反而离目标更远，要靠高度奖励拉回来。'), right || Math.abs(e) < 0.005 ? 'good' : 'warn');
    }
    registerRenderer(render);
    render();
  }

  // ─── 演示 3：表格 ───────────────────────────────────────────────────────────
  function buildTablesDemo(host) {
    var root = card(host, {
      title: '表 I–V、图 11、表 X 与我们的复现',
      sub: '论文的表照抄（图 11 是我们从矢量图量的条高）；最后一页是我们在 MuJoCo 里回放官方策略的结果，和论文的定义不同，只作参考。'
    });
    var VIEWS = [
      { v: 't1', label: '表 I 遥操作系统' }, { v: 't2', label: '表 II G1 与 GR-1' }, { v: 't34', label: '表 III、IV 硬件' },
      { v: 'f11', label: '图 11 完成时间' }, { v: 't10', label: '表 X 用户研究' }, { v: 't5', label: '表 V 模仿学习' }, { v: 'ours', label: '我们的 MuJoCo 复现' }
    ];
    var state = { view: 't1' };
    var row = controlsRow(root);
    buttonGroup(row, { label: '看哪张', items: VIEWS.map(function (q) { return { label: q.label, value: q.v }; }), value: 't1', onPick: function (v) { state.view = v; render(); } });
    var verdict = verdictBox(root);
    var tb = table(root);
    function yes(b) { return b ? '✓' : '✗'; }
    function render() {
      tb.clear();
      var v = state.view;
      if (v === 't1') {
        tb.row(['系统', '价格（美元）', '手臂跟踪', '灵巧手跟踪', '移动操作', '全身', '不用动捕'], true);
        TABLE1.forEach(function (r) { tb.row([r[0] === 'HOMIE' ? '**HOMIE**' : r[0], r[1], r[2], r[3] || '—', yes(r[4]), yes(r[5]), yes(r[6])]); });
        verdict.set('只有 HOMIE 一行全是 ✓：手臂和手都是关节匹配，又不需要动捕数据训全身策略。', 'good');
      } else if (v === 't2') {
        tb.row(['指标', 'Unitree G1', 'Fourier GR-1'], true);
        TABLE2.forEach(function (r) { tb.row([r.zh + (r.unit ? '（' + r.unit + '）' : ''), fmt(r.g1[0], 3) + ' ± ' + fmt(r.g1[1], 3), fmt(r.gr1[0], 3) + ' ± ' + fmt(r.gr1[1], 3)]); });
        tb.row(['身高 / 体重', ROBOTS.g1.cm + ' cm / ' + ROBOTS.g1.kg + ' kg', ROBOTS.gr1.cm + ' cm / ' + ROBOTS.gr1.kg + ' kg']);
        tb.row(['双手 / 占体重', ROBOTS.g1.handKg + ' kg / ' + ROBOTS.g1.ratio + '%', ROBOTS.gr1.handKg + ' kg / ' + ROBOTS.gr1.ratio + '%']);
        verdict.set('同一套训练框架，只改身材相关的几个数；两台都活满约 20 s。', 'good');
      } else if (v === 't34') {
        tb.row(['硬件', '价格（美元）', '采集频率', '精度'], true);
        TABLE3.forEach(function (r) { tb.row([r.zh, String(r.usd), r.khz + ' kHz', r.acc]); });
        tb.row(['合计', '430 + 2 × 30 + 20 = **510**', '', '']);
        tb.row(['遥操作系统（表 IV）', '硬件', '手臂（Hz）', '手（Hz）'], true);
        TABLE4.forEach(function (r) { tb.row([r.zh === 'HOMIE' ? '**HOMIE**' : r.zh, r.hw, String(r.arm), String(r.hand)]); });
        verdict.set('不估姿态、不解逆运动学，输出频率约等于采集频率：手臂 263 Hz、手 293 Hz。', 'good');
      } else if (v === 'f11') {
        tb.row(['任务', 'OpenTelevision（s）', 'HOMIE（s）', 'HOMIE / VR'], true);
        FIG11.forEach(function (r) { tb.row([r.zh + '（' + r.en + '）', fmt(r.vr, 1), fmt(r.ours, 1), fmt(r.ours / r.vr, 2)]); });
        var m = FIG11.reduce(function (a, r) { return a + r.ours / r.vr; }, 0) / FIG11.length;
        verdict.set('读图近似值：比值平均 ' + fmt(m, 2) + '，论文说「接近一半」。3 位操作员、每个任务做 3 次（项目页）。', 'good');
      } else if (v === 't10') {
        tb.row(['测试者', '身高 / 体重', '性别', '第 1 次', '第 2 次', '第 3 次', '第 4 次', '第 5 次'], true);
        TABLE10.forEach(function (u) { tb.row([String(u.id), u.cm + ' cm / ' + u.kg + ' kg', u.sex].concat(u.t.map(String))); });
        tb.row(['**平均**', '', ''].concat(TABLE10_AVG.map(function (x) { return '**' + fmt(x, 1) + '**'; })));
        verdict.set('递手任务：平均 24.8 → 8.0 s，第 5 次和专家（约 8 s）差不多。', 'good');
      } else if (v === 't5') {
        tb.row(['任务', '成功率', '次数'], true);
        TABLE5.forEach(function (r) { tb.row([r.zh + '（' + r.en + '）', fmt(r.sr, 1) + '%', Math.round(r.sr * r.n / 100) + ' / ' + r.n]); });
        verdict.set('每个任务 50 条遥操作示范，Seer 模型；数据确实能训出自主的全身移动操作。', 'good');
      } else {
        tb.row(['项', '我们（MuJoCo，官方 deploy.onnx）', '论文表 II（Isaac Gym，G1）'], true);
        tb.row(['回合', OURS.n + ' 段 × 20 s，' + OURS.full + ' 段活满', '1000 个环境 × 20 s × 3 个种子']);
        tb.row(['存活时间（s）', fmt(OURS.alive, 2), '19.947']);
        tb.row(['线速度误差（m/s）', fmt(OURS.lin, 3), '0.194']);
        tb.row(['角速度误差（rad/s）', fmt(OURS.ang, 3), '0.451']);
        tb.row(['高度误差（m）', fmt(OURS.h, 4), '0.022']);
        tb.row(['对称损失', fmt(OURS.sym, 4) + '（' + OURS.symN + ' 步）', '0.019']);
        verdict.set('我们的误差只在每次换命令 1 s 之后算、增益用部署的，仿真器也不同：数字不能和表 II 直接比。', 'warn');
      }
    }
    render();
  }

  K.mount({
    'homie-explainer': buildExplainerDemo,
    'homie-video': buildVideoDemo,
    'homie-curriculum': buildCurriculumDemo,
    'homie-knee': buildKneeDemo,
    'homie-tables': buildTablesDemo
  });
})();
