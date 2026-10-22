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
  var OURS = { n: 200, full: 168, alive: 18.17, lin: 0.087, ang: 0.180, h: 0.0037, sym: 0.0046, symN: 3250 };
  /* 例：只抬左臂站着时，观测镜像前后的动作（左髋俯仰 ↔ 右髋俯仰） */
  var SYM_EX = { a: [-1.050, -0.349, -0.358, 1.212, -0.124, -0.029, -0.748, 0.262, 0.543, 1.585, 0.305, 0.090],
    af: [-0.758, -0.272, -0.540, 1.583, 0.319, -0.097, -1.049, 0.346, 0.362, 1.208, -0.117, 0.017], loss: 0.00071 };

  // ─── 本笔记的复现数据：在 MuJoCo 里跑官方 deploy.onnx 的七段动作（15 fps，和贴图表一帧对一帧） ─────────
  /* 每帧 24 个小端 int16：根部 x、y、z（mm）、偏航（mrad）、高度 h = 骨盆 z − 较低那只脚的踝 z（mm）、命令的目标高度（mm）、
     命令 vx（mm/s）、左膝、右膝（mrad）、上身 15 个关节的目标角（mrad：腰偏航、左臂 7、右臂 7） */
  var SEQ = {
    walk: { n: 45, data: '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' },
    squat: { n: 90, data: '2P////IC/v/PAuQCAACwArQCAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAA2P////IC/v/PAuQCAACvArQCAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAA1/////IC/v/QAuQCAACvArMCAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAA1v////IC/v/QAuQCAACuArMCAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAA1v////IC/v/QAuQCAACuArICAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAA1v////IC/v/QAuQCAACtArICAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAA1f////IC/v/QAuQCAACtArICAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAA1f////IC/v/QAuQCAACtArICAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAzv///9kC/v+sApABAADHA8IDAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAxf///6EC/P+AApABAADQBNAEAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAwP///2gC+/9GApABAADnBekFAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAuf///yEC+v/+AZABAAAHBwsHAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAs/8AAPAB8//OAZABAACzB7YHAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAqv8BAM4B6/+sAZABAAAfCCAIAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAn/8CALUB5/+SAZABAABpCGgIAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAmP8DAKwB5/+JAZABAAB/CH4IAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAkv8DAKgB5/+FAZABAACHCIUIAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAi/8DAKUB5/+DAZABAACHCIYIAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAhv8DAKQB6P+CAZABAACFCIQIAAD6AF4BAABMBAAAAAAAAPoA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uP8BAPIC5f/PAuQCAACvAq0CAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAu/8BAPIC5f/PAuQCAACxAq4CAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAwP8BAPIC5f/PAuQCAAC1Aq8CAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAw/8BAPEC5f/PAuQCAAC2ArACAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAxf8BAPEC5f/PAuQCAAC4ArECAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAyP8BAPEC5f/PAuQCAAC4ArECAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAyf8BAPEC5v/PAuQCAAC4ArECAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAyv8BAPIC5v/PAuQCAAC3ArECAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAyv8BAPIC5v/PAuQCAAC2ArACAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAyf8BAPIC5v/PAuQCAAC1ArACAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAyf8BAPIC5v/PAuQCAAC0Aq8CAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAyP8BAPIC5v/QAuQCAACyAq4CAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAx/8BAPIC5v/QAuQCAACxAq4CAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAxv8BAPIC5v/QAuQCAACwAq0CAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAAxf8BAPIC5v/QAuQCAACvAq0CAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAA' },
    upper: { n: 60, data: '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' },
    upper_low: { n: 30, data: 'jwAHAPACDADOAuQCLAGGAssCHQAYAAkAvP+e/+f/pf8PAHj/EgARACYAYADU/wUAngAAAO4CJADNAuQCLAEXA+MCHgAWAAsAvf+i/+H/qf8RAJP/EgALACYAXADY/wQAsAABAPQCMgDSAuQCLAFuA60CHwAUAA0AwP+n/9n/rv8VALf/EgADACUAWADe/wMAvgAGAPcCQADVAuQCLAFRA3YCIAATAA8Awf+q/9P/sv8YANL/EgD+/yUAVQDi/wEAzQAMAPACPgDTAuQCLAG/ApICIQARABAAw/+u/83/tv8bAO3/EgD4/yQAUgDm/wAA5AAUAPACLgDPAuQCLAHfAhMDIgAPABMAxf+z/8X/vP8fABEAEgDw/yMATgDs//7/9QATAPQCJADSAuQCLAGrAkgDIwAOABQAxv+2/7//wP8hACwAEgDr/yMASgDw//3/BwEQAPQCHADSAuQCLAF4AvMCJAAMABYAyP+6/7n/xP8kAEcAEgDl/yIARwD0//z/IQELAO4CLQDNAuQCLAEGA+QCJQAKABgAyv+//7H/yv8oAGsAEgDd/yIAQwD6//r/MgEMAPECNQDPAuQCLAFOA8wCJgAJABoAzP/C/6v/zv8rAIYAEgDY/yEAQAD+//n/RAERAPMCPwDRAuQCLAFQA50CJwAHABwAzf/G/6X/0v8uAKAAEgDS/yEAPAACAPj/WwEaAOwCNwDNAuQCLAHlAsoCKAAFAB4Az//L/53/1/8xAMQAEgDK/yAAOAAIAPb/bQEfAO0CLQDMAuQCLAHpAgYDKQAEACAA0f/O/5f/3P80AN8AEgDF/x8ANQAMAPX/fgEfAPACJQDOAuQCLAHFAigDKgACACEA0//S/5L/4P83APoAEgC//x8AMgAQAPT/lwEbAO0CKQDLAuQCLAG5Av4CKwAAACQA1f/X/4r/5f87AB4BEgC3/x4ALgAWAPL/qQEYAOsCLQDKAuQCLAHbAgIDKwABACQA1v/b/4j/6P87ACoBEgC1/yoAJwAYAPD/uwEaAOsCMQDJAuQCLAH6AukCJgAGACEA2f/g/5D/6P83ABkBEgC5/04AGQAYAO7/1QEgAOwCLwDKAuQCLAH/AtoCIAANAB0A3P/n/5r/6f8xAAEBEgC+/34ABgAYAOr/6AEiAO8CKQDMAuQCLAHTAicDHAASABoA3v/t/6H/6f8tAO8AEgDC/6MA9/8XAOf//AEhAPACHADNAuQCLAGcAlIDGAAXABgA4P/y/6n/6v8oAN0AEgDG/8cA6f8XAOX/GAIdAOoCIwDLAuQCLAHUAvUCEgAeABQA4//5/7P/6v8jAMYAEgDL//cA1v8XAOH/KwIaAO4CMgDNAuQCLAFgA+QCDQAjABEA5v///7v/6/8eALQAEgDP/xsByP8XAN7/PAIdAPMCOgDRAuQCLAGWA7YCCQAoAA4A6P8EAML/6/8aAKIAEQDT/0ABuv8WANz/UwImAPMCRADQAuQCLAH7AoICAwAuAAoA6/8LAMz/7P8UAIsAEQDZ/3ABp/8WANj/ZAIuAOwCMQDMAuQCLAHkAusC//8zAAgA7f8RANT/7P8QAHkAEQDd/5QBmf8WANX/dQIxAO8CJQDOAuQCLAHQAkcD+v84AAUA8P8WANz/7f8LAGcAEQDg/7gBi/8VANL/iQItAPQCFgDSAuQCLAGGAl8D9f8/AAEA8/8dAOb/7f8GAE8AEQDm/+kBeP8VAM//mQIpAO4CGwDRAuQCLAGjAtAC8P9EAP7/9f8jAO3/7f8BAD4AEQDq/w0Cav8VAMz/rAIlAO4CLADOAuQCLAEVA/QC7P9JAPv/9/8oAPX/7v/9/ywAEQDu/zECXP8UAMn/wgIoAPQCOgDSAuQCLAFXA7UC5v9QAPf/+v8vAP//7v/3/xQAEQDz/2ECSf8UAMb/' },
    stand_arms: { n: 45, data: 'xv////ICAgDPAuQCAACqArECAABI/gQBtAAgAwAAAAAAALD/Gv8AANQDAAAAAAAAxv////ICAgDPAuQCAACrArECAAAD/vsAxgACAwAAAAAAAI//Jv8AAMgDAAAAAAAAxv////ECAgDPAuQCAACsArICAACn/e8A3gDaAgAAAAAAAGP/Nv8AALgDAAAAAAAAxv/+//ECAgDPAuQCAACsArMCAABi/eYA8AC8AgAAAAAAAEL/Qv8AAKwDAAAAAAAAxf/+//ECAgDPAuQCAACtArMCAAAd/d0AAgGeAgAAAAAAACH/Tv8AAKADAAAAAAAAxf/+//ECAwDPAuQCAACsArQCAADB/NEAGgF2AgAAAAAAAPX+Xv8AAJADAAAAAAAAxP/+//ECAwDPAuQCAACsArQCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAxP/+//ICAgDPAuQCAACnArQCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAxP/9//ICBADPAuQCAACkArUCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAw//9//ICBQDPAuQCAACjArUCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAwv/9//ICBQDPAuQCAACiArUCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAwP/9//ECBQDPAuQCAACiArUCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAv//8//ECBQDPAuQCAAChArUCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAvf/8//ECBQDPAuQCAACgArQCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAvP/8//ECBQDPAuQCAACfArQCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAu//8//ECBQDPAuQCAACeArQCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAuv/8//ECBQDPAuQCAACeArQCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAuf/8//ECBQDPAuQCAACeArQCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAuf/9//ECBQDPAuQCAACeArQCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAuf/9//ECBQDPAuQCAACeArUCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAuf/9//ECBQDPAuQCAACeArUCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAuf/9//ECBQDPAuQCAACeArUCAAB8/MgALAFYAgAAAAAAANT+av8AAIQDAAAAAAAAuf/9//ECAwDPAuQCAACdArYCAACg/MUAGgFqAgAAAAAAALD+Z//u/3IDAAAAAAAAuP/9//ECAADPAuQCAACcArkCAADQ/MEAAgGCAgAAAAAAAID+Y//W/1oDAAAAAAAAuP/9//EC///PAuQCAACcArkCAAD0/L4A8ACUAgAAAAAAAFz+YP/E/0gDAAAAAAAAuP/8//ECAADPAuQCAACdArgCAAAY/bsA3gCmAgAAAAAAADj+Xf+y/zYDAAAAAAAAuP/8//ECAQDPAuQCAACdArgCAABI/bcAxgC+AgAAAAAAAAj+Wf+a/x4DAAAAAAAAuf/8//ECAgDPAuQCAACeArgCAABs/bQAtADQAgAAAAAAAOT9Vv+I/wwDAAAAAAAAuf/8//ECAQDPAuQCAACeArgCAACQ/bEAogDiAgAAAAAAAMD9U/92//oCAAAAAAAAuf/8//ECAQDPAuQCAACfArgCAADA/a0AigD6AgAAAAAAAJD9T/9e/+ICAAAAAAAAuf/8//ECAADPAuQCAACfArcCAADk/aoAeAAMAwAAAAAAAGz9TP9M/9ACAAAAAAAAuf/8//ECAADPAuQCAACgArcCAAAI/qcAZgAeAwAAAAAAAEj9Sf86/74CAAAAAAAAuf/8//ECAADPAuQCAACgArcCAAA4/qMATgA2AwAAAAAAABj9Rf8i/6YCAAAAAAAAuf/8//ECAADPAuQCAACgArYCAABc/qAAPABIAwAAAAAAAPT8Qv8Q/5QCAAAAAAAAuf/8//EC///PAuQCAAChArYCAACA/p0AKgBaAwAAAAAAAND8P//+/oICAAAAAAAAuv/8//EC///PAuQCAAChArUCAACw/pkAEgByAwAAAAAAAKD8O//m/moCAAAAAAAAuv/8//EC/v/PAuQCAAChArQCAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAuv/8//EC///PAuQCAACiArICAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAuf/8//ECAQDPAuQCAACkArECAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAuP/9//ECAQDPAuQCAAClArACAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAuP/9//EC///PAuQCAAClArACAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAuP/+//EC/f/PAuQCAAClArACAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAuP/+//EC/P/PAuQCAAClArACAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAuP/+//EC/P/PAuQCAAClArACAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAAuf/+//EC/f/PAuQCAAClArACAADU/pYAAACEAwAAAAAAAHz8OP/U/lgCAAAAAAAA' },
    reach_stand: { n: 40, data: '1v////IC/v/QAuQCAACuArICAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAA1f////IC/v/QAuQCAACtArICAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAA1f////IC/v/QAuQCAACtArICAADcAF4BAABcBAAAAAAAANwAov4AAFwEAAAAAAAA0/////IC/v/QAuQCAACtArICAACvAF4BAAB0BAAAAAAAAK8Aov4AAHQEAAAAAAAA0f////IC/v/PAuQCAACtArICAACCAF4BAACMBAAAAAAAAIIAov4AAIwEAAAAAAAAzv////IC/v/PAuQCAACtArMCAABGAF4BAACsBAAAAAAAAEYAov4AAKwEAAAAAAAAzf////IC/v/PAuQCAACtArICAAAZAF4BAADEBAAAAAAAABkAov4AAMQEAAAAAAAAzP////IC/v/PAuQCAACtArICAADs/14BAADcBAAAAAAAAOz/ov4AANwEAAAAAAAAzP////IC/v/PAuQCAACtArMCAACw/14BAAD8BAAAAAAAALD/ov4AAPwEAAAAAAAAy/////IC/v/PAuQCAACuArQCAACD/14BAAAUBQAAAAAAAIP/ov4AABQFAAAAAAAAy/////EC/v/PAuQCAACvArUCAABW/14BAAAsBQAAAAAAAFb/ov4AACwFAAAAAAAAyv////EC/v/PAuQCAACwArUCAAAa/14BAABMBQAAAAAAABr/ov4AAEwFAAAAAAAAyv////EC/v/PAuQCAACxArYCAADt/l4BAABkBQAAAAAAAO3+ov4AAGQFAAAAAAAAyv////EC/v/PAuQCAACyArcCAADA/l4BAAB8BQAAAAAAAMD+ov4AAHwFAAAAAAAAyf////EC/v/PAuQCAACzArgCAACE/l4BAACcBQAAAAAAAIT+ov4AAJwFAAAAAAAAyP////EC/v/OAuQCAACzArgCAABX/l4BAAC0BQAAAAAAAFf+ov4AALQFAAAAAAAAx/////EC/v/OAuQCAAC0ArkCAAAq/l4BAADMBQAAAAAAACr+ov4AAMwFAAAAAAAAxv////EC/v/OAuQCAACzArgCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAxf////EC/v/OAuQCAACyArcCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAxf////EC/v/PAuQCAACyArcCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAxf////EC/v/OAuQCAACyArcCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAxP////EC/v/OAuQCAACxArcCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAw/////EC/v/OAuQCAACxArcCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAwf////EC/v/PAuQCAACvArUCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAwP////EC/v/PAuQCAACuArUCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAvv////EC/v/PAuQCAACtArQCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAvf////EC/v/OAuQCAACtArQCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAvP////EC/v/OAuQCAACtArQCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAu/////EC/v/OAuQCAACsArQCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAu/////EC/v/OAuQCAACsArQCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAuv////EC/v/OAuQCAACsArQCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAuv////EC/v/OAuQCAACtArQCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAuv////EC/v/OAuQCAACtArQCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAuv////EC/v/OAuQCAACtArQCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAuv////EC/v/OAuQCAACtArQCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAuv////EC/v/OAuQCAACtArQCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAu/////EC/v/OAuQCAACuArUCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAu/////EC/v/OAuQCAACuArUCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAu/////EC/v/OAuQCAACuArUCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAu/////EC/v/OAuQCAACuArUCAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAA' },
    reach_squat: { n: 40, data: '1v////IC/v/QAuQCAACuArICAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAA1f////IC/v/QAuQCAACtArICAAD6AF4BAABMBAAAAAAAAPoAov4AAEwEAAAAAAAA1f////IC/v/QAuQCAACtArICAADcAF4BAABcBAAAAAAAANwAov4AAFwEAAAAAAAA0/////IC/v/QAuQCAACtArICAACvAF4BAAB0BAAAAAAAAK8Aov4AAHQEAAAAAAAA0f////IC/v/PAuQCAACtArICAACCAF4BAACMBAAAAAAAAIIAov4AAIwEAAAAAAAAzv////IC/v/PAuQCAACtArMCAABGAF4BAACsBAAAAAAAAEYAov4AAKwEAAAAAAAAzf////IC/v/PAuQCAACtArICAAAZAF4BAADEBAAAAAAAABkAov4AAMQEAAAAAAAAzP////IC/v/PAuQCAACtArICAADs/14BAADcBAAAAAAAAOz/ov4AANwEAAAAAAAAzP////IC/v/PAuQCAACtArMCAACw/14BAAD8BAAAAAAAALD/ov4AAPwEAAAAAAAAy/////IC/v/PAuQCAACuArQCAACD/14BAAAUBQAAAAAAAIP/ov4AABQFAAAAAAAAy/////EC/v/PAuQCAACvArUCAABW/14BAAAsBQAAAAAAAFb/ov4AACwFAAAAAAAAyv////EC/v/PAuQCAACwArUCAAAa/14BAABMBQAAAAAAABr/ov4AAEwFAAAAAAAAyv////EC/v/PAuQCAACxArYCAADt/l4BAABkBQAAAAAAAO3+ov4AAGQFAAAAAAAAyv////EC/v/PAuQCAACyArcCAADA/l4BAAB8BQAAAAAAAMD+ov4AAHwFAAAAAAAAyf////EC/v/PAuQCAACzArgCAACE/l4BAACcBQAAAAAAAIT+ov4AAJwFAAAAAAAAyP////EC/v/OAuQCAACzArgCAABX/l4BAAC0BQAAAAAAAFf+ov4AALQFAAAAAAAAx/////EC/v/OAuQCAAC0ArkCAAAq/l4BAADMBQAAAAAAACr+ov4AAMwFAAAAAAAAvv///9YC/v+hApABAAAKBAcEAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAs////5sC+/97ApABAADiBOQEAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAArf///1gC+/81ApABAAAvBi4GAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAp////wgC+//lAZABAABjB2MHAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAo/8AANgB9/+1AZABAAAHCAcIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAm/8BALoB9P+XAZABAABhCGEIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAkv8BAKcB8v+FAZABAACUCJMIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAjv8CAKMB8v+BAZABAACeCJ0IAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAi/8CAKIB8f+AAZABAACfCJ0IAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAif8CAKIB8f+AAZABAACeCJwIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAh/8CAKIB8f+AAZABAACdCJsIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAhf8CAKIB8f+AAZABAACcCJoIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAhP8CAKIB8f+AAZABAACaCJkIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAg/8CAKIB8f+AAZABAACZCJgIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAg/8CAKMB8f+AAZABAACZCJgIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAgv8CAKMB8f+AAZABAACYCJcIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAgv8CAKMB8f+AAZABAACYCJcIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAgv8CAKMB8f+AAZABAACYCJcIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAgv8CAKMB8f+BAZABAACYCJcIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAg/8CAKMB8f+BAZABAACXCJcIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAg/8CAKMB8f+BAZABAACXCJcIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAg/8CAKMB8f+BAZABAACXCJYIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAAg/8CAKMB8f+BAZABAACXCJYIAAAM/l4BAADcBQAAAAAAAAz+ov4AANwFAAAAAAAA' }
  };
  /* 贴图表：R 像素/米，yaw / pitch 是正交相机，cw × ch 一格，(ax, ay) 是根部正下方地面点在格子里的位置 */
  var SHEETS = {
    walk: { file: 'g1_walk.webp', R: 220, yaw: 1.0, pitch: 0.1, cw: 155, ch: 302, cols: 12, n: 45, ax: 70.2, ay: 288.5 },
    squat: { file: 'g1_squat.webp', R: 220, yaw: 0.7, pitch: 0.1, cw: 196, ch: 299, cols: 12, n: 90, ax: 66.0, ay: 286.8 },
    upper: { file: 'g1_upper.webp', R: 220, yaw: 1.0, pitch: 0.1, cw: 227, ch: 302, cols: 12, n: 60, ax: 99.0, ay: 288.5 },
    upper_low: { file: 'g1_upper_low.webp', R: 220, yaw: 1.0, pitch: 0.1, cw: 138, ch: 300, cols: 12, n: 30, ax: 48.2, ay: 287.7 },
    stand_arms: { file: 'g1_stand_arms.webp', R: 220, yaw: 1.0, pitch: 0.1, cw: 159, ch: 297, cols: 12, n: 45, ax: 45.7, ay: 286.8 },
    reach_stand: { file: 'g1_reach_stand.webp', R: 220, yaw: 1.0, pitch: 0.1, cw: 171, ch: 297, cols: 12, n: 40, ax: 67.7, ay: 286.8 },
    reach_squat: { file: 'g1_reach_squat.webp', R: 220, yaw: 1.0, pitch: 0.1, cw: 176, ch: 298, cols: 12, n: 40, ax: 67.7, ay: 286.8 }
  };
  /* 第 1 幕：两只手（腕偏航 link 及以下，含 Dex3 手指）可视网格的最低点，每帧 3 个小端 int16：世界坐标 x、y、z（mm）。
     用 Robot Retarget Online 的带手 G1 模型按回放的关节角做正运动学；两段的手臂姿势一样，只差高度命令 */
  var HAND = {
    reach_stand: '4P+w/u4B4P+w/u4B3/+w/u0B5f+v/uwB+P+v/u0BFACv/vABIwCw/vIBMACw/vQBQgCw/vcBUQCx/voBYACy/v4BdACz/gQCggC0/gkCkAC2/g4CowC4/hYCsAC5/hwCvgC7/iQCzwC9/i0C1QC+/jEC0QC+/i8CyAC9/ioCxQC8/ioCxQC8/ioCxAC9/isCwwC9/iwCwgC9/isCwAC9/isCvwC9/isCvgC9/isCvgC9/ioCvQC9/ioCvQC9/ioCvQC9/ioCvAC9/ioCvQC9/ioCvQC9/ioCvQC9/ioCvQC9/ioCvQC9/ioCvQC9/ioC',
    reach_squat: '4P+w/u4B4P+w/u4B3/+w/u0B5f+v/uwB+P+v/u0BFACv/vABIwCw/vIBMACw/vQBQgCw/vcBUQCx/voBYACy/v4BdACz/gQCggC0/gkCkAC2/g4CowC4/hYCsAC5/hwCvgC7/iQC3AC3/hwC6wBKAeQBygBDAYIBcAA5AQABRwA4AcIAQAA4AZ4ATwA3AYsAVgA4AYkAVgA6AYoAUwA7AYwAUgA7AY0AUgA7AY4AUQA7AY8AUQA7AY8AUAA7AZAAUAA7AZAAUAA7AZAAUAA7AZAAUAA8AZAAUAA8AZAAUAA8AZAAUAA8AZAAUAA8AZAA'
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
  /* 一幕里从 cue 起算的真实秒数：网页上就是 t − cue；视频里旁白比分镜长时 t 会停，改按 cue 那一刻起的视频时间走（K.clipSince）。
     不能用 clock − cue：clock 从这一幕开头算，前面几段旁白比分镜长，到 cue 那一刻 clock 早就大于 cue，
     一次性的计数、填格子在这一段一开始就已经满了（第 16 幕的示范条一出场就是 50 / 50，2026-10-22） */
  function since(t, clock, cue) {
    return clock == null ? t - cue : Math.max(0, K.clipSince(t, cue));
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
  /* 数字、标签压在网格线或折线上时，描一圈和底色相同的边，线从字后面过去不打断字形 */
  function halo(n) {
    n.style.paintOrder = 'stroke'; n.style.stroke = C_SURFACE; n.style.strokeWidth = '3px'; n.style.strokeLinejoin = 'round';
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

  /* ── 动效小部件（2026-10-22 看片反馈「多一些动效、少一些纯文字」） ── */
  /* 第 i 个确定性随机数，0–1：同一时刻网页和视频画出来一样 */
  function hrand(i) {
    var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }
  /* 一条虚线上匀速走的几个小圆点（数据流），两端可以每帧换；at(秒, 起点, 终点, 可见) */
  function flowSeg(parent, color, n, r, speed, noLine) {
    var g = group(parent), line = noLine ? null : hline(g, 0, 0, 0, 0, color, 1.2, '3 4'), dots = [];
    for (var j = 0; j < (n || 3); j++) dots.push(dotAt(g, 0, 0, r || 3.4, color));
    return {
      g: g,
      at: function (sec, a, b, vis) {
        if (line) setLine(line, a[0], a[1], b[0], b[1]);
        var tot = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]));
        dots.forEach(function (c, j) {
          var d = (((sec * (speed || 70) + j * tot / dots.length) % tot) + tot) % tot, u = d / tot;
          moveDot(c, a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u);
          c.style.opacity = vis === false ? 0 : Math.min(1, Math.min(d, tot - d) / 10);
        });
      }
    };
  }
  /* 一片小方格：n 个，cols 列；set(已出现的个数, 其中前几个算「好」)，好的绿、其余红、没出现的灰 */
  function squareGrid(parent, x, y, cols, n, size, gap) {
    var g = group(parent), cells = [];
    for (var i = 0; i < n; i++) {
      var r = paint(svgEl('rect', { x: x + (i % cols) * (size + gap), y: y + Math.floor(i / cols) * (size + gap), width: size, height: size, rx: 1.5 }), C_BORDER);
      g.appendChild(r);
      cells.push(r);
    }
    return {
      g: g,
      set: function (shown, good) {
        cells.forEach(function (c, i) {
          c.style.fill = i >= shown ? C_BORDER : i < good ? C_HOMIE : C_BAD;
          c.style.opacity = i >= shown ? 0.35 : 0.9;
        });
      }
    };
  }
  /* 一个圆盘：n 道刻度（每 n/8 道一道长的）、一根指针；set(弧度，0 朝上、顺时针) */
  function dial(parent, cx, cy, r, n, color) {
    var g = group(parent);
    g.appendChild(paint(svgEl('circle', { cx: cx, cy: cy, r: r, fill: 'none', 'stroke-width': 1.4 }), null, C_BORDER));
    for (var i = 0; i < n; i++) {
      var a = 2 * Math.PI * i / n, long = i % (n / 8) === 0;
      hline(g, cx + (r - (long ? 9 : 5)) * Math.sin(a), cy - (r - (long ? 9 : 5)) * Math.cos(a), cx + r * Math.sin(a), cy - r * Math.cos(a), long ? X.ink2 : C_MUTED, long ? 1.6 : 0.8);
    }
    var hand = hline(g, cx, cy, cx, cy - r + 12, color || C_UP, 3);
    dotAt(g, cx, cy, 4, color || C_UP);
    return {
      g: g,
      set: function (ang) { setLine(hand, cx, cy, cx + (r - 12) * Math.sin(ang), cy - (r - 12) * Math.cos(ang)); }
    };
  }
  /* 「论文 → 代码」翻牌：先是论文的写法，再换成代码的；set(0–1) */
  function flipCard(parent, x, y, w, h, title, a, b, color) {
    var g = group(parent);
    rectBox(g, x, y, w, h, color);
    g.appendChild(svgRich(x + 10, y + 18, title, { size: 10, cls: 'demo-x-mut', w: w - 20 }));
    var ga = group(g), gb = group(g);
    ga.appendChild(svgRich(x + 10, y + h - 12, '论文：' + a, { size: 12, cls: 'demo-x-ink2', w: w - 20 }));
    gb.appendChild(svgRich(x + 10, y + h - 12, '代码：' + b, { size: 12, cls: 'demo-x-ink', w: w - 20 }));
    return {
      g: g,
      set: function (u) { setOpacity(ga, 1 - seg(u, 0.35, 0.5)); setOpacity(gb, seg(u, 0.5, 0.65)); }
    };
  }
  /* 驾驶舱示意：左边三件设备，右边一台会蹲的 G1（下蹲那段回放）；小点从设备流向肩、手和膝 */
  function cockpitRig(parent, x0, y0, s, ox, oy) {
    var g = group(parent);
    var dev = [['外骨骼', '两臂关节角', C_UP], ['手套', '灵巧手', C_HOMIE], ['踏板', '走、转、蹲', C_LOW]];
    dev.forEach(function (d, i) {
      chip(g, x0, y0 + i * 70, 84, d[0], d[2], { size: 12, h: 30 });
      label(g, x0 + 42, y0 + i * 70 + 46, d[1], 'demo-x-mut', 9.5, 'middle');
    });
    var act = g1Actor(g, 'squat', s, ox, oy, { gw: 52 });
    var flows = dev.map(function (d) { return flowSeg(g, d[2], 3, 3.4, 70); });
    return {
      g: g,
      put: function (k, sec) {
        var z = act.put(k).f.root[2];
        /* 肩、手、膝的大致位置（相对骨盆高度，示意） */
        var tg = [[ox - 4, oy - s * (z + 0.33)], [ox + 0.24 * s, oy - s * (z - 0.02)], [ox + 0.08 * s, oy - s * z * 0.5]];
        flows.forEach(function (f, i) { f.at(sec, [x0 + 88, y0 + i * 70 + 15], tg[i], true); });
      }
    };
  }

  /* ── scene 1: 两条路各缺一半 ── */
  /* 第 1 幕的货架：竖柱在右边，三层板；高度按米画、和 G1 同一个比例（地面 oy、像素/米 s），只是示意 */
  function shelfAt(parent, x0, w, s, oy) {
    var zy = function (z) { return oy - s * z * Math.cos(0.1); };
    var g = group(parent);
    hline(g, x0 - 6, oy, x0 + w + 2, oy, C_BORDER, 1.4);
    hline(g, x0 + w, oy, x0 + w, zy(1.2), C_MUTED, 3);
    var boxes = [[0.12, 0.15, C_H], [0.62, 0.12, C_LOW], [1.05, 0.12, C_UP]].map(function (r) {
      hline(g, x0, zy(r[0]), x0 + w, zy(r[0]), C_MUTED, 3);
      var y1 = zy(r[0] + r[1]);
      g.appendChild(paint(svgEl('rect', { x: x0 + 4, y: y1, width: 26, height: zy(r[0]) - y1 - 1.5, rx: 3 }), r[2]));
      return { x: x0 + 4, y: y1, w: 26, h: zy(r[0]) - y1 - 1.5 };
    });
    return { g: g, zy: zy, low: boxes[0] };
  }
  /* 第 1 幕两台 G1 的帧号：从 cue 起按真实时间播一遍（40 帧），之后在最后 12 帧里来回放，保持站稳的微动 */
  function reachK(sec) {
    var k = Math.max(0, sec) * 15;
    if (k <= 39) return k;
    var p = (k - 39) % 24;
    return p < 12 ? 39 - p : 27 + (p - 12);
  }
  var HAND_CACHE = {};
  function handAt(key, k) {
    if (!HAND_CACHE[key]) HAND_CACHE[key] = decode(HAND[key]);
    var a = HAND_CACHE[key], o = clamp(Math.round(k), 0, SEQ[key].n - 1) * 3;
    return [a[o] / 1000, a[o + 1] / 1000, a[o + 2] / 1000];
  }
  /* 一台伸手的 G1 加一个货架：虚线从手的最低点画到货架右边，读数写在货架里 */
  function reachRig(parent, key, ox, shelfX, good) {
    var S1 = 165, OY = 330, g = group(parent);
    var act = g1Actor(g, key, S1, ox, OY, { gw: 90 });
    var sh = shelfAt(g, shelfX, 48, S1, OY);
    var line = hline(g, 0, 0, 0, 0, good ? C_GOOD : C_BAD, 1.8);
    line.setAttribute('stroke-dasharray', '5 4');
    var dot = paint(svgEl('circle', { cx: 0, cy: 0, r: 4 }), good ? C_GOOD : C_BAD);
    g.appendChild(dot);
    var val = label(g, shelfX + 24, 0, '', good ? 'demo-x-good' : 'demo-x-bad', 10.5, 'middle');
    var L = sh.low, mark = group(g);
    if (good) mark.appendChild(paint(svgEl('path', { d: 'M' + (L.x + 5) + ' ' + (L.y - 14) + ' l6 6 l11 -12', fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }), null, C_GOOD));
    else mark.appendChild(paint(svgEl('path', { d: 'M' + (L.x + 3) + ' ' + (L.y + 3) + ' L' + (L.x + L.w - 3) + ' ' + (L.y + L.h - 3) + ' M' + (L.x + L.w - 3) + ' ' + (L.y + 3) + ' L' + (L.x + 3) + ' ' + (L.y + L.h - 3), fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round' }), null, C_BAD));
    return {
      g: g,
      /* k 是这一帧的帧号（播完后来回放），sec 是从 cue 起的秒数：✓ / ✗ 按 sec 出现，来回放时不再闪 */
      put: function (k, sec) {
        var r = act.put(k), hp = handAt(key, k), y = sh.zy(hp[2]), x = project(hp, r.cam)[0];
        setLine(line, x, y, shelfX + 48, y);
        dot.setAttribute('cx', x.toFixed(1));
        dot.setAttribute('cy', y.toFixed(1));
        /* 站稳以后（第 27 帧起）读数固定写最后一帧的值，不随来回放的微动跳 0.14 / 0.15 */
        val.textContent = f2(k >= 27 ? handAt(key, 39)[2] : hp[2]) + ' m';
        val.setAttribute('y', (good ? OY - 6 : y + 15).toFixed(1));
        mark.style.opacity = seg(sec * 15, 26, 28);
      }
    };
  }
  function buildSceneTwoRoads() {
    var s = sceneSvg('左边一台 G1 在走路，代表强化学习的全身控制；中间一台 G1 站着只动手臂，代表只管上身的遥操作，随后它站着往前下方伸手，旁边的货架最低一层够不到；右边一台用同样的手臂姿势再蹲下，手够到了最低一层；之后列出 HOMIE 的三件硬件，最后是论文图 1');
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
    /* 第三段起：同一台站着往前下方伸手，旁边是货架（MuJoCo 回放；货架是示意） */
    var stand = reachRig(pB, 'reach_stand', 400, 470, false);
    chip(pB, 276, 366, 248, '缺：走、蹲，工作空间被卡住', C_BAD, { size: 11.5 });
    /* 右栏：同样的手臂姿势，再蹲到 0.40 m */
    var pC = group(s);
    rectBox(pC, 536, 40, 248, 316);
    label(pC, 548, 62, '同样伸手，再蹲到 0.40 m', 'demo-x-ink', 13);
    label(pC, 548, 84, '读法：虚线是双手的最低位置', 'demo-x-ink2', 10.5);
    label(pC, 548, 102, 'MuJoCo 回放（官方策略），货架是示意', 'demo-x-mut', 10);
    var squat = reachRig(pC, 'reach_squat', 650, 724, true);
    chip(pC, 536, 366, 248, '蹲下去，就够到最低一层', C_HOMIE, { size: 11.5 });
    /* 右栏：HOMIE 的答案——三件设备的读数流向一台会蹲的 G1（下蹲那段回放） */
    var pD = group(s);
    rectBox(pD, 536, 40, 248, 316);
    label(pD, 548, 62, 'HOMIE：一个驾驶舱', 'demo-x-ink', 13);
    var rig = cockpitRig(pD, 548, 92, 135, 700, 330);
    chip(pD, 536, 366, 248, '一个人遥操作整台人形，约 500 美元', C_HOMIE, { size: 11.5 });
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
      setOpacity(arms.g, 1 - seg(t, 7.0, 7.3));
      arms.put(loopK('stand_arms', now));
      /* 从 cue 起的真实秒数要按时间线算（K.clipSince）：视频里前几段旁白比分镜长，clock − 7.0 会多出好几秒，一出场就已经蹲完了 */
      var sec = Math.max(0, K.clipSince(t, 7.0)), k = reachK(sec);
      setOpacity(stand.g, win(t, 7.0));
      stand.put(k, sec);
      setOpacity(pC, win(t, 7.0, 10.4));
      squat.put(k, sec);
      setOpacity(pD, win(t, 10.4, 13.4));
      if (t > 10.4 && t < 13.8) rig.put(loopK('squat', now), now);
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
    /* 跟着旁白框出图 2 里对应的一块：踏板与行走、外骨骼与手套、第一视角画面、自主策略 */
    var HL = [[0.24, 0.53, 0.72, 0.97, C_LOW], [0.015, 0.09, 0.235, 0.96, C_UP], [0.39, 0.11, 0.58, 0.37, C_ACCENT], [0.775, 0.17, 0.995, 0.66, C_HOMIE]].map(function (b) {
      var h = hiBox(pFig, b[4]);
      h.set(R + b[0] * 356, 46 + b[1] * fig.h, (b[2] - b[0]) * 356, (b[3] - b[1]) * fig.h);
      return h;
    });
    var Y0 = 46 + fig.h + 40;
    var flowsR = [];
    var rows = [
      { c: C_LOW, a: '踏板', b: '$\\pi_{loco}$（机载 Orin，50 Hz）→ 下肢 12 个关节' },
      { c: C_UP, a: '外骨骼 + 手套', b: '上身 15 个关节 + 灵巧手：直接设定' },
      { c: C_ACCENT, a: '头部相机', b: 'Wi-Fi 回传 → 舱内屏幕（第一视角）' },
      { c: C_HOMIE, a: '$\\pi_{auto}$', b: '学会之后替操作员给出 $C_t$ 与 $q_{upper}$' }
    ].map(function (r, i) {
      var g = group(s), y = Y0 + i * 46;
      chip(g, R, y, 104, r.a, r.c, { size: 11.5, h: 34 });
      arrowAt(g, R + 110, y + 17, R + 134, y + 17, r.c, 2);
      flowsR.push({ f: flowSeg(g, r.c, 2, 2.6, 30, true), y: y + 17 });
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
        var live = on && !next, now = nowOf(t, clock);
        flowsR[i].f.at(now, [R + 106, flowsR[i].y], [R + 132, flowsR[i].y], live);
        HL[i].node.style.opacity = win(t, cues[i], i < 3 ? cues[i + 1] : null) * (0.65 + 0.35 * Math.sin(now * 4));
      });
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
      '同构机械臂（Mobile-ALOHA、GELLO、AirExo、ACE）：关节匹配，又准又快；前三个只有夹爪，ACE 的手靠视觉，都不管全身',
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
    label(side, 690, 262, '读法：✓ 有，✗ 没有', 'demo-x-ink2', 10);
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
    var s = sceneSvg('左边两台 G1 边走边被随机摆手臂：一台 ρ_a = 0.2 只动一点，一台 ρ_a 接近 1 大幅摆动；下面是左肘目标角的轨迹，每 1 秒换一个目标、中间线性插值；右边是采样分布：ρ_a 一格一格加到 1、虚线跟着变，再演示按曲线抽 ρ′、在 [0, ρ′] 里抽关节走多远，最后叠上 U(0, ρ_a) 的方块对比');
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
    rich(pT, TX, TY - TH - 10, '横轴时间、纵轴左肘目标角（$\\rho_a \\to 1$）：1 s 换一次，中间线性插值', 9.5, 'demo-x-mut');
    var trace = pathLine(pT, [], C_UP, 2);
    var cur = dotAt(pT, 0, 0, 4, C_UP);
    var ticks = [];
    for (var q = 1; q < 4; q++) ticks.push(hline(pT, TX + TW * q / 4, TY - TH, TX + TW * q / 4, TY, C_MUTED, 1, '3 3'));
    function traceY(v) { return TY - 6 - (v + 1.2) / 2.4 * (TH - 10); }
    var pts = [];
    for (var k = 0; k < SEQ.upper.n; k++) pts.push([TX + TW * k / (SEQ.upper.n - 1), traceY(frame('upper', k).upper[4])]);
    setPath(trace, pts);
    /* 右边：采样分布（代码的 λ） */
    var R = 330, PX = 360, PY = 236, PW = 400, PH = 128;
    var p1 = group(s);
    math(p1, R, 58, "p(\\rho_a' \\mid \\rho_a) = \\dfrac{\\lambda\\, e^{-\\lambda \\rho_a'}}{1 - e^{-\\lambda}},\\quad \\lambda = 20\\,(1 - \\rho_a)", 14);
    rich(p1, R, 89, "读法：横轴是抽到的上限 $\\rho_a'$，纵轴是概率密度；四种颜色是四个 $\\rho_a$", 10, 'demo-x-ink2');
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
    /* 第二段：ρ_a 从 0 一格一格加到 1（每格 0.05），白色虚线是当前 ρ_a 的分布 */
    var p2 = group(s);
    var liveC = pathLine(p1, [], X.ink, 1.6, '5 3');
    var SX0 = R, SW = 300, SY = 268;
    hline(p2, SX0, SY, SX0 + SW, SY, C_BORDER, 3);
    for (var q5 = 0; q5 <= 20; q5++) hline(p2, SX0 + SW * q5 / 20, SY - 4, SX0 + SW * q5 / 20, SY + 4, C_MUTED, 0.8);
    var knob = dotAt(p2, SX0, SY, 7, C_ACCENT);
    var knobLab = rich(p2, SX0 + SW + 14, SY + 4, '', 11.5, 'demo-x-ink');
    label(p2, SX0, SY + 22, '速度跟得好就 +0.05', 'demo-x-mut', 10);
    /* 第三段：按 ρ_a = 0.9 的曲线抽一个 ρ'（图上竖线），再在 [0, ρ'] 里抽 a_i，关节就往限位走这么远。
       每 2 s 抽一次，一步一步出：竖线挪到新的 ρ' → 绿条从默认角伸出 ρ' 那么长 → 黄点从默认角走到 a_i
       （2026-10-22 看片反馈「默认角那条看不懂」：原先三样东西每秒同时跳，也没写读法） */
    var p3 = group(s);
    var drop = hline(p3, 0, PY, 0, PY - PH, C_GOOD, 2, '4 3');
    math(p3, R, 296, "a_i \\sim \\mathcal{U}(0, \\rho_a')", 14);
    var JX = R + 140, JW = 280, JY = 292;
    hline(p3, JX, JY, JX + JW, JY, C_BORDER, 4);
    label(p3, JX, JY + 16, '下限', 'demo-x-mut', 9.5, 'middle'); label(p3, JX + JW, JY + 16, '上限', 'demo-x-mut', 9.5, 'middle');
    label(p3, JX + JW / 2, JY + 16, '默认角 0', 'demo-x-mut', 9.5, 'middle');
    hline(p3, JX + JW / 2, JY - 8, JX + JW / 2, JY + 8, C_MUTED, 1.2);
    var span = paint(svgEl('rect', { x: JX + JW / 2, y: JY - 5, width: 0, height: 10, rx: 3, opacity: 0.35 }), C_GOOD);
    p3.appendChild(span);
    var aDot = dotAt(p3, JX + JW / 2, JY, 6, C_UP);
    /* 两个标签在同一行：黄点走到绿条末端附近时，ρ' 的标签让开 */
    var rhoTag = rich(p3, JX + JW / 2, JY - 11, "$\\rho_a'$", 10.5, 'demo-x-good', 'middle');
    var aTag = rich(p3, JX + JW / 2, JY - 11, '$a_i$', 10.5, 'demo-x-warn', 'middle');
    var p3r = group(p3);
    label(p3r, R, 330, '读法：灰条是一个关节，两端是它的上下限，中间是默认角（两边按比例画）', 'demo-x-ink2', 10.5);
    rich(p3r, R, 350, "绿条：这一次最多能偏多远（$\\rho_a'$）；黄点：实际抽到的目标角（$a_i$）", 10.5, 'demo-x-ink2');
    var p4 = group(s);
    label(p4, R, 330, '每 1 s 重采样一次目标，1 s 内线性插值过去', 'demo-x-ink2', 11.5);
    label(p4, R, 351, '论文：不插值的话，机器人在连续动作下站不稳', 'demo-x-mut', 10.5);
    var p5 = group(s);
    /* 图上叠一个 U(0, 0.5) 的方块：(0.5, 1] 永远采不到 */
    var uh = PY - 2 / 20 * PH;
    pathLine(p5, [[PX, PY], [PX, uh], [PX + 0.5 * PW, uh], [PX + 0.5 * PW, PY]], X.ink, 2, '6 4');
    p5.appendChild(paint(svgEl('rect', { x: PX + 0.5 * PW + 2, y: PY - 30, width: 0.5 * PW - 4, height: 28, rx: 3, opacity: 0.18 }), C_BAD));
    label(p5, PX + 0.75 * PW, PY - 12, 'U(0, 0.5) 采不到这一段', 'demo-x-bad', 10, 'middle');
    rich(p5, R, 380, '虚线方块是 $\\mathcal{U}(0, \\rho_a)$：$(\\rho_a, 1]$ 永远采不到；式 3 任何时候都有概率', 11.5, 'demo-x-ink2');
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
      setOpacity(p2, win(t, 3.6, 7.0));
      /* ρ_a 每 0.25 s 加 0.05，到 1 停一会儿再从 0 开始 */
      var st5 = Math.floor(since(t, clock, 3.6) * 4) % 25, rho = Math.min(1, st5 * 0.05);
      moveDot(knob, SX0 + SW * rho, SY);
      knobLab.setText('$\\rho_a = ' + fmt(rho, 2) + '$');
      var lp = [];
      for (var j5 = 0; j5 <= 60; j5++) { var x5 = j5 / 60; lp.push([PX + x5 * PW, PY - Math.min(20, density(x5, rho)) / 20 * PH]); }
      setPath(liveC, lp);
      liveC.style.opacity = win(t, 3.6, 7.0);
      setOpacity(p3, win(t, 7.0));
      /* 每 2 s 抽一次：ρ' 按 ρ_a = 0.9 的曲线（代码的 λ），a_i ~ U(0, ρ')，往哪一侧也随机。
         0–0.4 s 竖线挪过去，0.4–0.9 s 绿条伸出，0.9–1.4 s 黄点从默认角走过去，之后停住 */
      var s5 = since(t, clock, 7.0), n5 = Math.floor(s5 / 2), tau = s5 - 2 * n5;
      var draw5 = function (n) { return { rp: sampleRho(0.9, hrand(n * 3 + 1)), u: hrand(n * 3 + 2), sd: hrand(n * 3 + 3) < 0.5 ? -1 : 1 }; };
      var d5 = draw5(n5), rp = d5.rp, ai = rp * d5.u, sd = d5.sd, rpPrev = n5 > 0 ? draw5(n5 - 1).rp : rp;
      var ease = function (v) { return v * v * (3 - 2 * v); };
      var rpx = rpPrev + (rp - rpPrev) * ease(seg(tau, 0, 0.4)), gB = ease(seg(tau, 0.4, 0.9)), gA = ease(seg(tau, 0.9, 1.4));
      setLine(drop, PX + rpx * PW, PY, PX + rpx * PW, PY - PH);
      drop.style.opacity = win(t, 7.0, 10.4);
      var x0s = JX + JW / 2, xe = x0s + sd * rp * gB * JW / 2, xa = x0s + sd * ai * gA * JW / 2;
      span.setAttribute('x', Math.min(x0s, xe).toFixed(1)); span.setAttribute('width', Math.abs(xe - x0s).toFixed(1));
      moveDot(aDot, xa, JY);
      rhoTag.setX(xe); setOpacity(rhoTag, gB * seg(Math.abs(xe - xa), 20, 28));
      aTag.setX(xa); setOpacity(aTag, gA);
      setOpacity(p3r, win(t, 7.0, 10.4));
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
    rich(read, 24, 46, '读法：竖条是高度，紫点是骨盆，虚线是目标', 10, 'demo-x-ink2');
    var rH = rich(read, 24, 364, '', 11.5, 'demo-x-ink2');
    var rN = rich(read, 24, 384, '', 11.5, 'demo-x-ink2');
    var rR = rich(read, 24, 404, '', 11.5, 'demo-x-ink');
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
    label(p2, NX + NW + 14, NY + 4, '蓝点：当前膝角', 'demo-x-ink2', 10);
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
    var s = sceneSvg('左边是六个并行环境的时间轴，每 4 秒换一次命令，紫色是蹲、蓝色是走、灰色是站；右边依次是论文与代码的命令比例、两张每秒重抽一次的命令卡（蹲的高度、走的速度箭头）、目标高度过 0.735 m 才亮起来的 7 项奖励、一台 G1 上的域随机化（手和躯干随机加重、每 4 秒推一下）');
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
    pL.insertBefore(cursor, pL.firstChild);  // 压在格子下面，只在格子之间的缝里露出来，不从字上划过
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
    /* 第三段：两张会动的命令卡——蹲：高度每 1 s 随机一次、速度 0；走：速度箭头每 1 s 随机一次、高度 0.74 m */
    var p2 = group(s);
    var CY = 176, CH = 150;
    rectBox(p2, R, CY, 184, CH, C_H);
    rectBox(p2, R + 196, CY, 184, CH, C_LOW);
    label(p2, R + 10, CY + 20, '蹲：速度 0', 'demo-x-ink', 12);
    label(p2, R + 206, CY + 20, '走：高度 0.74 m', 'demo-x-ink', 12);
    var GX = R + 60, GY0 = CY + CH - 16, GH = 90;
    hline(p2, GX, GY0, GX, GY0 - GH, C_BORDER, 6);
    [0.24, 0.74].forEach(function (h) { label(p2, GX - 10, GY0 - (h - 0.24) / 0.5 * GH + 4, fmt(h, 2) + ' m', 'demo-x-mut', 9.5, 'end'); });
    var hDot = dotAt(p2, GX, GY0, 7, C_H);
    var hLab = label(p2, GX + 14, GY0, '', 'demo-x-ink', 11.5);
    var VX = R + 196 + 92, VY = CY + 92;
    p2.appendChild(paint(svgEl('circle', { cx: VX, cy: VY, r: 38, fill: 'none', 'stroke-width': 1.2, 'stroke-dasharray': '3 4' }), null, C_BORDER));
    var vArr = arrow(p2, C_LOW, 3);
    var wArc = pathLine(p2, [], C_PURPLE, 2.4);
    label(p2, VX, CY + CH - 6, '箭头：前后、左右速度；紫弧：转向', 'demo-x-mut', 9.5, 'middle');
    label(p2, R, CY + CH + 20, '同一个环境在蹲和走之间来回换，学会过渡', 'demo-x-good', 11.5);
    /* 第四段：目标高度上下走，过了 0.735 m 那 7 项奖励才亮 */
    var p3 = group(s);
    label(p3, R, CY + 4, '代码：这 7 项只在目标高度 ≥ 0.735 m 时才算', 'demo-x-ink2', 11.5);
    var TX3 = R + 30, TY0 = CY + CH - 6, TH3 = 120;
    hline(p3, TX3, TY0, TX3, TY0 - TH3, C_BORDER, 6);
    var thrY = TY0 - (0.735 - 0.24) / 0.5 * TH3;
    hline(p3, TX3 - 14, thrY, TX3 + 14, thrY, C_BAD, 2);
    label(p3, TX3 - 18, thrY + 4, '0.735', 'demo-x-bad', 9.5, 'end');
    var tDot = dotAt(p3, TX3, TY0, 7, C_H);
    var PILLS = ['z 线速度', '髋偏离', '踝偏离', '两脚间距上限', '两膝间距上限', '两脚平行', '站着别动'];
    var pills = PILLS.map(function (nm, i) {
      var g = group(p3), x = R + 74 + (i % 2) * 150, y = CY + 22 + Math.floor(i / 2) * 32;
      chip(g, x, y, 140, nm, C_HOMIE, { size: 11, h: 24 });
      return g;
    });
    label(p3, R + 74, CY + CH + 10, '蹲着的时候这些都不罚', 'demo-x-mut', 10);
    /* 第五段：域随机化画在一台 G1 上——手和躯干随机加重、每 4 s 推一下 */
    var p4 = group(s);
    var dr = g1Actor(p4, 'stand_arms', 115, R + 110, CY + CH - 4, { gw: 70 });
    chip(p4, R + 180, CY + 44, 78, '', C_UP, { size: 10.5, h: 22 });
    chip(p4, R + 180, CY + 4, 78, '', C_PURPLE, { size: 10.5, h: 22 });
    var wHandT = label(p4, R + 219, CY + 59, '', 'demo-x-ink', 10.5, 'middle');
    var wTorsoT = label(p4, R + 219, CY + 19, '', 'demo-x-ink', 10.5, 'middle');
    var push = arrow(p4, C_BAD, 3.4);
    var pushT = label(p4, R + 6, CY + 74, '', 'demo-x-bad', 10.5);
    label(p4, R + 268, CY + 20, '躯干 −5~10 kg', 'demo-x-mut', 9.5);
    label(p4, R + 268, CY + 60, '手 −0.1~0.3 kg', 'demo-x-mut', 9.5);
    rich(p4, R + 180, CY + 100, '还有摩擦、$K_p$ / $K_d$ ±10%、观测噪声', 9.5, 'demo-x-mut');
    chip(p4, R, 354, 380, '奖励共 33 项（表 VI），从 PIM 的人形行走改来', C_HOMIE, { size: 11.5, h: 30 });
    function draw(t, clock) {
      var u = (since(t, clock, 0) % 20) / 20;
      setLine(cursor, LX + 54 + u * (LW - 54), LY, LX + 54 + u * (LW - 54), LY + NROW * ROWH);
      var blk = Math.floor(u * NBLK);
      cells.forEach(function (c) { c.r.style.opacity = c.j === blk ? 0.95 : 0.4; });
      setOpacity(pL, win(t, 0.0));
      setOpacity(p1, win(t, 3.6));
      var now = nowOf(t, clock);
      setOpacity(p2, win(t, 7.0, 10.4));
      var n7 = Math.floor(now), hh = 0.24 + 0.5 * hrand(n7 * 5 + 1);
      moveDot(hDot, GX, GY0 - (hh - 0.24) / 0.5 * GH);
      hLab.setAttribute('y', (GY0 - (hh - 0.24) / 0.5 * GH + 4).toFixed(1)); hLab.textContent = fmt(hh, 2) + ' m';
      var vx = -0.8 + 2.0 * hrand(n7 * 5 + 2), vy = -0.5 + hrand(n7 * 5 + 3), wz = -0.8 + 1.6 * hrand(n7 * 5 + 4);
      vArr.set(VX, VY, VX + vy * -30, VY - vx * 30);
      var arc = [];
      for (var a7 = 0; a7 <= 16; a7++) { var th = -Math.PI / 2 + wz * a7 / 16 * 1.6; arc.push([VX + 48 * Math.cos(th), VY + 48 * Math.sin(th)]); }
      setPath(wArc, arc);
      setOpacity(p3, win(t, 10.4, 13.4));
      var ht = 0.24 + 0.5 * (0.5 - 0.5 * Math.cos(since(t, clock, 10.4) * 1.4));
      moveDot(tDot, TX3, TY0 - (ht - 0.24) / 0.5 * TH3);
      pills.forEach(function (g) { g.style.opacity = ht >= 0.735 ? 1 : 0.22; });
      setOpacity(p4, win(t, 13.4));
      dr.put(loopK('stand_arms', now));
      var n4 = Math.floor(now / 4);
      wHandT.textContent = '+' + fmt(-0.1 + 0.4 * hrand(n4 * 3 + 7), 2) + ' kg';
      wTorsoT.textContent = '+' + fmt(-5 + 15 * hrand(n4 * 3 + 8), 1) + ' kg';
      var ph = (now % 4) / 4, kick = ph < 0.18 ? Math.sin(ph / 0.18 * Math.PI) : 0;
      push.set(R + 6, CY + 92, R + 6 + 22 + 40 * kick, CY + 92);
      push.g.style.opacity = 0.25 + 0.75 * kick;
      pushT.textContent = kick > 0.05 ? '每 4 s 推一下' : '';
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 对称 ── */
  function buildSceneSymmetry() {
    var s = sceneSvg('左边一台 G1 边走边摆手臂，旁边是它沿身体中面的镜像；右边依次是两条腿 12 个动作的条形图在原始与镜像之间来回变（左右互换、横滚和偏航取负）、数据翻倍的回放缓冲区、两项对称损失、官方策略在我们回放上的对称损失');
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
    /* 第二段：只抬左臂站着时 12 维下肢动作（SYM_EX），左右两组条互换，横滚、偏航（紫）取负 */
    var p2 = group(s);
    var JN = ['髋俯仰', '髋横滚', '髋偏航', '膝', '踝俯仰', '踝横滚'], FLIPJ = [false, true, true, false, false, true];
    var BY = 150, BS = 26, colW = 34;
    label(p2, R + 100, 94, '左腿', 'demo-x-ink', 12, 'middle');
    label(p2, R + 330, 94, '右腿', 'demo-x-ink', 12, 'middle');
    hline(p2, R, BY, R + 200, BY, C_BORDER, 1.2);
    hline(p2, R + 230, BY, R + 430, BY, C_BORDER, 1.2);
    var legBars = [];
    for (var i8 = 0; i8 < 12; i8++) {
      var side = i8 < 6 ? 0 : 1, j8 = i8 % 6, x8 = R + side * 230 + j8 * colW + 6;
      legBars.push({ b: vbar(p2, x8, colW - 10, FLIPJ[j8] ? C_PURPLE : C_LOW), x: x8 });
      label(p2, x8 + (colW - 10) / 2, BY + 56, JN[j8], 'demo-x-mut', 8.5, 'middle');
    }
    var swapT = label(p2, R + 215, 94, '', 'demo-x-ink2', 11, 'middle');
    rich(p2, R, 226, '紫色：横滚、偏航取负；腰偏航、命令的 $v_y$、$\\omega_{yaw}$ 也取负，左臂 ↔ 右臂', 10.5, 'demo-x-ink2');
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
      /* 2.4 s 一个来回：原始 → 镜像 → 原始 */
      var m8 = 0.5 - 0.5 * Math.cos(since(t, clock, 3.6) * Math.PI / 2.4);
      var mir = [SYM_EX.a[6], -SYM_EX.a[7], -SYM_EX.a[8], SYM_EX.a[9], SYM_EX.a[10], -SYM_EX.a[11], SYM_EX.a[0], -SYM_EX.a[1], -SYM_EX.a[2], SYM_EX.a[3], SYM_EX.a[4], -SYM_EX.a[5]];
      legBars.forEach(function (lb, i) {
        var v = SYM_EX.a[i] * (1 - m8) + mir[i] * m8, h = Math.abs(v) * BS;
        if (v >= 0) lb.b.set(BY, h); else { lb.b.node.setAttribute('y', BY.toFixed(1)); lb.b.node.setAttribute('height', h.toFixed(1)); }
      });
      swapT.textContent = m8 < 0.5 ? '原始' : '镜像';
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
      '读法：横轴是训练步数（0–2000）；前四列是误差，越低越好；最后一列是存活时间，越高越好；红线是 ours',
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
    var s = sceneSvg('左边是项目页里 GR-1 在 Isaac Gym 里训练的片段和论文图 8 的两台机器人；右边依次是身高、体重、双手占比的对比条，只改的几个数在 G1 与 GR-1 之间来回变，表 II 的成对条形图，我们 200 段回放一格一段地填满（绿色活满、红色摔倒）');
    s.appendChild(svgText(24, 26, '换一台机器人：Fourier GR-1（表 II）', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'gr1gym', 24, 44, 320, 180, '项目页视频（原速）：GR-1 在 Isaac Gym 里边走边被随机摆手臂');
    var fig = paperPart(s, 'fig8', 0, 0, 1, 1, 92, 252, 184, '论文图 8：G1（左）与 GR-1（右）');
    var R = 370;
    /* 第一段：图 8 的三组数画成条，G1 蓝、GR-1 紫 */
    var p1 = group(s);
    label(p1, R, 62, '两台差得很远（图 8）', 'demo-x-ink', 13);
    legendRow(p1, R + 220, 62, [['G1', C_ACCENT], ['GR-1', C_PURPLE]]);
    var CMP = [['身高', ROBOTS.g1.cm, ROBOTS.gr1.cm, 'cm', 0], ['体重', ROBOTS.g1.kg, ROBOTS.gr1.kg, 'kg', 1], ['双手占体重', ROBOTS.g1.ratio, ROBOTS.gr1.ratio, '%', 1]];
    var cmpBars = CMP.map(function (c, i) {
      var y = 84 + i * 54;
      label(p1, R, y + 20, c[0], 'demo-x-ink2', 11.5);
      return { c: c, mx: Math.max(c[1], c[2]), b1: barRowAt(p1, R + 40, y, 64, '', C_ACCENT, 16), b2: barRowAt(p1, R + 40, y + 21, 64, '', C_PURPLE, 16) };
    });
    label(p1, R, 260, '图 8 的图注写「全身 ÷ 双手」，数其实是双手 ÷ 全身', 'demo-x-mut', 10);
    /* 第二段：只改了跟身材有关的几个数——条在 G1 和 GR-1 的值之间来回变 */
    var p2 = group(s);
    label(p2, R, 62, '只改了跟身材有关的几个数', 'demo-x-ink', 13);
    var CHG = [['站立高度', 0.74, 0.90], ['两脚、两膝最大间距', 0.35, 0.40], ['抬脚目标', 0.14, 0.15]];
    var chg = CHG.map(function (c, i) {
      var y = 86 + i * 52;
      label(p2, R, y + 12, c[0] + '（m）', 'demo-x-ink2', 11.5);
      return { c: c, b: hbar(p2, R, y + 20, 16, C_PURPLE), v: label(p2, R, y + 33, '', 'demo-x-ink', 11.5), y: y };
    });
    var chgT = label(p2, R + 300, 62, '', 'demo-x-ink2', 11.5);
    label(p2, R, 262, '奖励权重大多一样（表 VI 里 7 项不同），训练流程不变', 'demo-x-good', 11.5);
    /* 第三段：表 II 画成成对的条：前四行是误差（越短越好），最后一行存活时间（满分 20 s） */
    var p3 = group(s);
    label(p3, R, 62, '表 II：训练 2k 步后，3 个种子', 'demo-x-ink', 13);
    legendRow(p3, R + 240, 62, [['G1', C_ACCENT], ['GR-1', C_PURPLE]]);
    var t2 = TABLE2.map(function (r, i) {
      var y = 74 + i * 38;
      label(p3, R + 92, y + 17, r.zh, 'demo-x-ink2', 11, 'end');
      return { r: r, mx: Math.max(r.g1[0], r.gr1[0]), b1: barRowAt(p3, R + 40, y, 60, '', C_ACCENT, 12), b2: barRowAt(p3, R + 40, y + 18, 60, '', C_PURPLE, 12) };
    });
    label(p3, R, 274, '读法：前四行是误差，条越短越好；存活时间满分 20 s', 'demo-x-ink2', 10);
    label(p3, R, 294, '两台都活满 20 s 左右；GR-1 速度误差大一些', 'demo-x-good', 11.5);
    /* 第四段：我们的复现——200 段，一格一段，绿 = 活满 20 s，红 = 中途摔倒 */
    var p4 = group(s);
    label(p4, R, 62, '我们的复现：官方 deploy.onnx（G1）在 MuJoCo 里', 'demo-x-ink', 12.5);
    label(p4, R, 80, '读法：一格一段 20 s，绿 = 活满，红 = 中途摔倒', 'demo-x-ink2', 10);
    var grid = squareGrid(p4, R, 92, 20, OURS.n, 9, 3);
    var gridT = label(p4, R, 232, '', 'demo-x-good', 11.5);
    [['平均存活', fmt(OURS.alive, 2) + ' s'], ['线速度误差', fmt(OURS.lin, 3) + ' m/s'], ['角速度误差', fmt(OURS.ang, 3) + ' rad/s'], ['高度误差', fmt(OURS.h * 1000, 1) + ' mm'], ['对称损失', fmt(OURS.sym, 4)]].forEach(function (q, i) {
      label(p4, R + 262, 100 + i * 24, q[0], 'demo-x-mut', 10);
      label(p4, R + 414, 100 + i * 24, q[1], 'demo-x-ink', 11, 'end');
    });
    label(p4, R, 256, '仿真器和误差的定义都不同，不能和表 II 直接比；增益用真机部署的', 'demo-x-mut', 10);
    var p5 = group(s);
    label(p5, R, 382, 'GR-1 的训练代码没有放出来（README 的待办：更多机器人）', 'demo-x-ink2', 11.5);
    function draw(t, clock) {
      clip.at(K.clipSince(t, 0), true);
      void fig;
      setOpacity(p1, win(t, 0.0, 3.6));
      var g1 = seg(t, 0.4, 1.4);
      cmpBars.forEach(function (q) {
        q.b1.set(240 * q.c[1] / q.mx * g1, g1 > 0.95 ? fmt(q.c[1], q.c[4]) + ' ' + q.c[3] : '');
        q.b2.set(240 * q.c[2] / q.mx * g1, g1 > 0.95 ? fmt(q.c[2], q.c[4]) + ' ' + q.c[3] : '');
      });
      setOpacity(p2, win(t, 3.6, 7.0));
      var m10 = 0.5 - 0.5 * Math.cos(since(t, clock, 3.6) * Math.PI / 1.6);
      chg.forEach(function (q) {
        var v = q.c[1] + (q.c[2] - q.c[1]) * m10, w = 300 * v / 0.9;
        setW(q.b, w);
        q.v.setAttribute('x', (R + w + 8).toFixed(1)); q.v.textContent = fmt(v, 2);
      });
      chgT.textContent = m10 < 0.5 ? 'G1' : 'GR-1';
      chgT.style.fill = m10 < 0.5 ? C_ACCENT : C_PURPLE;
      setOpacity(p3, win(t, 7.0, 10.4));
      var g3 = seg(t, 7.4, 8.4);
      t2.forEach(function (q) {
        q.b1.set(220 * q.r.g1[0] / q.mx * g3, g3 > 0.95 ? fmt(q.r.g1[0], 3) : '');
        q.b2.set(220 * q.r.gr1[0] / q.mx * g3, g3 > 0.95 ? fmt(q.r.gr1[0], 3) : '');
      });
      setOpacity(p4, win(t, 10.4));
      var shown = Math.min(OURS.n, Math.floor(since(t, clock, 10.4) * 80));
      grid.set(shown, OURS.full);
      gridT.textContent = shown >= OURS.n ? OURS.full + ' / ' + OURS.n + ' 段活满 20 s' : '';
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 11: 同构外骨骼 ── */
  function buildSceneExo() {
    var s = sceneSvg('左边是项目页视频：操作员穿着外骨骼和手套，旁边 G1 的上身跟着动、把番茄从一只手递到另一只手；右边是论文图 5(b) 的外骨骼与 G1、一个转着数格子的舵机圆盘、舵盘四个孔换着装时零点差 90 度的整数倍');
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
    /* 第三段：一个舵机圆盘，指针转、读数跟着数格子 */
    var p3 = group(s);
    var DC = [R + 52, Y + 100];
    var dl = dial(p3, DC[0], DC[1], 44, 64, C_UP);
    label(p3, R + 124, Y + 64, 'XL330 舵机：一圈 4096 格', 'demo-x-ink2', 11.5);
    var cnt = label(p3, R + 124, Y + 96, '', 'demo-x-ink', 16);
    label(p3, R + 124, Y + 120, '0.088° 一格（论文写 0.09°）', 'demo-x-mut', 10.5);
    label(p3, R + 124, Y + 140, '断电记得绝对位置，开机不用标定', 'demo-x-mut', 10.5);
    /* 第四段：舵盘四个孔对称，装上去可能差 0、±π/2、π：同一个读数，换一种装法就差 90° */
    var p4 = group(s);
    var horn = group(p4);
    horn.appendChild(paint(svgEl('circle', { cx: 0, cy: 0, r: 32, 'stroke-width': 2 }), C_SURFACE2, C_UP));
    [0, 1, 2, 3].forEach(function (k) { horn.appendChild(paint(svgEl('circle', { cx: 24 * Math.sin(k * Math.PI / 2), cy: -24 * Math.cos(k * Math.PI / 2), r: 4.5 }), k === 0 ? C_BAD : C_MUTED)); });
    horn.appendChild(paint(svgEl('line', { x1: 0, y1: 0, x2: 0, y2: -42, 'stroke-width': 3 }), null, C_UP));
    var hornT = label(p4, R + 124, Y + 158, '', 'demo-x-ink', 11.5);
    math(p4, R + 124, Y + 70, 'q_t = \\pm k_t \\Big(p_t + \\dfrac{n_t \\pi}{2}\\Big) + \\tau_t', 15);
    rich(p4, R + 124, Y + 112, '例：读数 1.20、$n = -1$ → $-0.371$ rad', 11, 'demo-x-ink2');
    label(p4, R + 124, Y + 134, '红孔：装在哪个孔上，零点就差多少', 'demo-x-mut', 10.5);
    var p5 = group(s);
    label(p5, R, Y + 52, '外骨骼长度按人的手臂做，舵机轴对齐 G1 URDF 的关节轴', 'demo-x-ink2', 11.5);
    label(p5, R, Y + 72, 'PLA 3D 打印、背带固定；两条手臂 430 美元', 'demo-x-ink2', 11.5);
    label(p5, R, Y + 92, '同一套设计做了 G1 和 GR-1 两版（肩、腕不同）', 'demo-x-mut', 10.5);
    function draw(t, clock) {
      clip.at(K.clipSince(t, 0), true);
      setOpacity(pL, win(t, 0.0));
      setOpacity(p1, win(t, 3.6));
      setOpacity(p2, win(t, 3.6));
      setOpacity(p3, win(t, 7.0, 10.4));
      var ang = since(t, clock, 7.0) * 0.7;
      dl.set(ang);
      cnt.textContent = '读数 ' + (Math.floor(ang / (2 * Math.PI) * 4096) % 4096) + ' / 4096';
      setOpacity(p4, win(t, 10.4, 13.4));
      /* 每 1.5 s 换一种装法，转过去用 0.4 s */
      var s11 = since(t, clock, 10.4) / 1.5, k11 = Math.floor(s11), u11 = seg(s11 - k11, 0, 0.27);
      var nn = [0, -1, 2, 1][k11 % 4], np = [0, -1, 2, 1][(k11 + 3) % 4], th11 = (np + (nn - np) * u11) * Math.PI / 2;
      horn.setAttribute('transform', 'translate(' + DC[0] + ' ' + DC[1] + ') rotate(' + (th11 * 180 / Math.PI).toFixed(1) + ')');
      hornT.textContent = 'n = ' + sgn(String(nn)) + '：差 ' + sgn(String(nn * 90)) + '°';
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 手套与踏板 ── */
  function buildSceneGlovePedal() {
    var s = sceneSvg('先放项目页里手套驱动灵巧手的片段与论文图 20，旁边一块磁铁来回转、霍尔传感器量到的磁场跟着变，下面 15 个关节点一个个亮起；再放论文图 6 的踏板，三只踏板轮流踩下、各推一个读数，电位器的指针跟着转；最后是表 III 与别家价格的条形图');
    s.appendChild(svgText(24, 26, '手套与踏板（表 III）', 'demo-x-ink2', 13.5));
    var pA = group(s);
    var clip = projClip(pA, 'glove', 24, 44, 360, 203, '项目页视频（原速）：手套驱动 Inspire 灵巧手');
    var R = 404;
    var a1 = group(pA);
    paperPart(a1, 'fig20', 0, 0, 0.5, 0.92, R, 46, 210, '论文图 20(a)：一根手指的三个角');
    /* 磁铁跟着关节转，下面的霍尔传感器量到的磁场跟着变 */
    var MC = [R + 300, 112];
    label(a1, R + 300, 64, '磁铁跟着关节转', 'demo-x-ink2', 11, 'middle');
    var mag = group(a1);
    mag.appendChild(paint(svgEl('rect', { x: -26, y: -9, width: 26, height: 18, rx: 2 }), C_BAD));
    mag.appendChild(paint(svgEl('rect', { x: 0, y: -9, width: 26, height: 18, rx: 2 }), C_ACCENT));
    mag.appendChild(svgText(-13, 4, 'N', 'demo-x-ink', 10, 'middle'));
    mag.appendChild(svgText(13, 4, 'S', 'demo-x-ink', 10, 'middle'));
    a1.appendChild(paint(svgEl('rect', { x: MC[0] - 16, y: MC[1] + 28, width: 32, height: 14, rx: 3 }), C_SURFACE2, C_HOMIE));
    label(a1, MC[0] + 22, MC[1] + 39, '霍尔', 'demo-x-mut', 9.5);
    var bField = hbar(a1, R + 240, 180, 12, C_HOMIE);
    label(a1, R + 240, 172, '磁场', 'demo-x-mut', 9.5);
    var angT = label(a1, R + 300, 212, '', 'demo-x-ink', 11.5, 'middle');
    /* 5 根手指 × 3 个角，一个一个亮起来 */
    var a2 = group(pA);
    chip(a2, 24, 290, 360, '5 根手指 × 3 = 15 个自由度，比多数灵巧手还多', C_HOMIE, { size: 11.5, left: true, h: 30 });
    var FN = ['拇指', '食指', '中指', '无名指', '小指'], fdots = [];
    FN.forEach(function (nm, i) {
      label(a2, 74 + i * 58, 392, nm, 'demo-x-mut', 9.5, 'middle');
      for (var j = 0; j < 3; j++) fdots.push(dotAt(a2, 74 + i * 58, 374 - j * 16, 5, C_HOMIE));
    });
    ['$\\gamma$', '$\\beta$', '$\\alpha$'].forEach(function (g, j) { rich(a2, 40, 378 - j * 16, g, 10, 'demo-x-mut', 'middle'); });
    var fCnt = label(a2, 384, 360, '', 'demo-x-ink', 14, 'end');
    var pB = group(s);
    var f6 = paperPart(pB, 'fig6', 0, 0, 1, 1, 24, 50, 360, '论文图 6：三只小踏板 + 两个换向开关');
    /* 三只踏板轮流踩下去，各自推动一个读数：转向、高度、前后速度；松脚就回位 */
    var PED = [['左：转向', C_PURPLE], ['中：高度', C_H], ['右：前后速度', C_LOW]];
    var peds = PED.map(function (q, i) {
      var px = R + 20 + i * 126, g = group(pB);
      var pedal = paint(svgEl('rect', { x: 0, y: -10, width: 82, height: 20, rx: 6, 'stroke-width': 1.6 }), C_SURFACE2, q[1]);
      var pg = group(g); pg.appendChild(pedal);
      g.appendChild(paint(svgEl('circle', { cx: px, cy: 92, r: 4 }), C_MUTED));
      label(g, px + 41, 70, q[0], 'demo-x-ink2', 11, 'middle');
      hline(g, px, 150, px + 82, 150, C_BORDER, 6);
      return { g: g, pg: pg, px: px, bar: hbar(g, px, 144, 12, q[1]) };
    });
    label(pB, R + 20, 176, '踩下去读数变大，松脚弹簧把踏板推回去', 'demo-x-good', 11.5);
    /* 第四段：踏板下面是电位器——能转 270°，踏板只用其中 40° */
    var b2 = group(pB);
    var PC = [R + 70, 262];
    b2.appendChild(paint(svgEl('path', { d: 'M ' + (PC[0] + 46 * Math.sin(-0.75 * Math.PI)).toFixed(1) + ' ' + (PC[1] - 46 * Math.cos(-0.75 * Math.PI)).toFixed(1) + ' A 46 46 0 1 1 ' + (PC[0] + 46 * Math.sin(0.75 * Math.PI)).toFixed(1) + ' ' + (PC[1] - 46 * Math.cos(0.75 * Math.PI)).toFixed(1), fill: 'none', 'stroke-width': 5 }), null, C_BORDER));
    var a40 = 40 / 180 * Math.PI;
    b2.appendChild(paint(svgEl('path', { d: 'M ' + PC[0] + ' ' + (PC[1] - 46) + ' A 46 46 0 0 1 ' + (PC[0] + 46 * Math.sin(a40)).toFixed(1) + ' ' + (PC[1] - 46 * Math.cos(a40)).toFixed(1), fill: 'none', 'stroke-width': 6 }), null, C_LOW));
    var potHand = hline(b2, PC[0], PC[1], PC[0], PC[1] - 38, C_LOW, 3);
    dotAt(b2, PC[0], PC[1], 4, C_LOW);
    label(b2, R + 140, 236, '电位器能转 270°，踏板只用 40°（蓝）', 'demo-x-ink2', 11.5);
    label(b2, R + 140, 260, '手留给手臂和手指，不用手柄', 'demo-x-mut', 10.5);
    label(b2, R + 140, 280, '大场景里人不用跟着机器人走', 'demo-x-mut', 10.5);
    label(pB, 24, 50 + f6.h + 46, '踏板也能改配置，重新分配命令', 'demo-x-mut', 10.5);
    var pC = group(s);
    label(pC, 160, 70, '表 III', 'demo-x-ink', 13, 'middle');
    label(pC, 24, 88, '读法：条长是价格（美元）；每条下面是采集频率和精度', 'demo-x-ink2', 10);
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
    /* 和表 I 里别家的价格比：条长是价格 */
    var pC2 = group(s);
    label(pC2, R + 20, 70, '和别家比（表 I，千美元）', 'demo-x-ink', 13);
    var PR = [['Mobile-ALOHA', 32, C_BAD], ['OpenTelevision', 4, C_MUTED], ['DexCap', 4, C_MUTED], ['HOMIE', 0.51, C_HOMIE]];
    var prBars = PR.map(function (q, i) { return { q: q, b: barRowAt(pC2, R + 20, 86 + i * 30, 104, q[0], q[2], 18) }; });
    label(pC2, R + 20, 222, '贵在外骨骼的舵机；手套、踏板的电路板都是自己设计焊的', 'demo-x-mut', 10);
    function draw(t, clock) {
      var showA = t < 7.0 + 0.3;
      clip.at(K.clipSince(t, 0), showA);
      setOpacity(pA, win(t, -0.4, 7.0));
      setOpacity(a1, win(t, 0.0));
      setOpacity(a2, win(t, 3.6));
      setOpacity(pB, win(t, 7.0, 13.4));
      setOpacity(b2, win(t, 10.4));
      setOpacity(pC, win(t, 13.4));
      setOpacity(pC2, win(t, 13.4));
      var now = nowOf(t, clock);
      /* 手套：磁铁角度来回摆，磁场 ∝ cos */
      var th12 = 0.9 * Math.sin(now * 1.4);
      mag.setAttribute('transform', 'translate(' + MC[0] + ' ' + MC[1] + ') rotate(' + (th12 * 180 / Math.PI).toFixed(1) + ')');
      setW(bField, 120 * Math.cos(th12));
      angT.textContent = '关节角 ' + sgn(fmt(th12 * 180 / Math.PI, 0)) + '°';
      var nOn = Math.min(15, Math.floor(since(t, clock, 3.6) * 5));
      fdots.forEach(function (d, i) { d.style.opacity = i < nOn ? 1 : 0.15; });
      fCnt.textContent = nOn + ' / 15';
      /* 踏板：每 1.4 s 换一只踩，踩下 0.5 s、松开 0.5 s */
      var sp = since(t, clock, 7.0), cur12 = Math.floor(sp / 1.4) % 3, ph12 = (sp % 1.4) / 1.4, dep = Math.sin(Math.min(1, ph12 / 0.75) * Math.PI);
      peds.forEach(function (q, i) {
        var d = i === cur12 ? dep : 0;
        q.pg.setAttribute('transform', 'translate(' + q.px + ' 92) rotate(' + (d * 16).toFixed(1) + ')');
        setW(q.bar, 82 * d);
      });
      var potA = dep * a40;
      setLine(potHand, PC[0], PC[1], PC[0] + 38 * Math.sin(potA), PC[1] - 38 * Math.cos(potA));
      var gC = seg(t, 13.8, 14.8);
      prBars.forEach(function (q) { q.b.set(220 * q.q[1] / 32 * gC, gC > 0.95 ? fmt(q.q[1], q.q[1] < 1 ? 2 : 0) + 'k' : ''); });
    }
    return { el: s, draw: draw };
  }

  /* ── scene 13: 表 IV ── */
  function buildSceneFreq() {
    var s = sceneSvg('左边是表 IV 四个系统输出给手臂和手的频率条形图；右边依次是两条流水线（视觉 / VR 的包稀、外骨骼的包密）、一包 32 格的数据经 Wi-Fi 送到机器人、10 Hz 的目标台阶和插值出来的点、论文图 9 的四种灵巧手');
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
    label(pL, 24, 386, '读法：条越长，每秒发给机器人的次数越多，越流畅', 'demo-x-ink2', 10);
    var R = 420;
    /* 第二段：两条流水线——视觉 / VR 要先估姿态、再解逆运动学，包发得稀；外骨骼读到就发，包很密 */
    var p1 = group(s);
    label(p1, R, 62, '为什么快：读到就发', 'demo-x-ink', 13);
    var LA = 112, LB = 200;
    [['相机', 0], ['估姿态', 92], ['逆运动学', 184], ['G1', 290]].forEach(function (q) {
      rectBox(p1, R + q[1], LA - 12, q[1] === 290 ? 70 : 76, 24, C_MUTED);
      label(p1, R + q[1] + (q[1] === 290 ? 35 : 38), LA - 20, q[0], 'demo-x-ink2', 11, 'middle');
    });
    [['舵机读数', 0], ['G1', 290]].forEach(function (q) {
      rectBox(p1, R + q[1], LB - 12, q[1] === 290 ? 70 : 76, 24, C_UP);
      label(p1, R + q[1] + (q[1] === 290 ? 35 : 38), LB - 20, q[0], 'demo-x-ink2', 11, 'middle');
    });
    var laneA = flowSeg(p1, C_MUTED, 2, 4, 55), laneB = flowSeg(p1, C_UP, 9, 4, 140);
    label(p1, R, LA + 36, '视觉 / VR：16–125 Hz，还要显卡或专门的芯片', 'demo-x-mut', 10.5);
    label(p1, R, LB + 36, '外骨骼：263 Hz，输出频率 ≈ 采集频率', 'demo-x-good', 11);
    /* 第三段：一包 128 字节 = 32 个 float32，经 Wi-Fi 送到机器人，约 16 ms */
    var p2 = group(s);
    label(p2, R, 62, 'Wi-Fi（TCP）：一包 128 字节', 'demo-x-ink', 13);
    chip(p2, R, 150, 76, '驾驶舱', C_ACCENT, { size: 11, h: 30 });
    chip(p2, R + 290, 150, 70, 'G1', C_ACCENT, { size: 11, h: 30 });
    pathLine(p2, [[R + 80, 165], [R + 286, 165]], C_BORDER, 1.4, '4 4');
    var pkt = group(p2), cells13 = [];
    for (var c13 = 0; c13 < 32; c13++) {
      var r13 = paint(svgEl('rect', { x: (c13 % 16) * 7, y: Math.floor(c13 / 16) * 7, width: 6, height: 6, rx: 1 }), C_UP);
      pkt.appendChild(r13); cells13.push(r13);
    }
    label(p2, R, 222, '一包 = 32 个 float32 = 128 字节（一格一个 float32）', 'demo-x-ink2', 11.5);
    label(p2, R, 244, '正常网络下延迟约 16 ms，带校验和', 'demo-x-ink2', 11.5);
    label(p2, R, 266, '机器人可以离驾驶舱很远', 'demo-x-mut', 10.5);
    /* 第四段：G1 上手臂目标 10 Hz 更新（台阶），每个目标插值 50 次（斜线上的小点） */
    var p3 = group(s);
    label(p3, R, 62, 'G1 上实际怎么跑（附录 C）', 'demo-x-ink', 13);
    var IX = R + 10, IY = 230, IW = 340, IH = 120;
    hline(p3, IX, IY, IX + IW, IY, C_BORDER, 1.2);
    var TGT = [0.2, 0.75, 0.45, 0.9];
    var stairs = [], interp = [];
    for (var i13 = 0; i13 < 3; i13++) {
      var xa = IX + i13 * IW / 3, xb = IX + (i13 + 1) * IW / 3;
      stairs.push([xa, IY - TGT[i13 + 1] * IH], [xb, IY - TGT[i13 + 1] * IH]);
      for (var k13 = 0; k13 <= 50; k13 += 5) interp.push([xa + (xb - xa) * k13 / 50, IY - (TGT[i13] + (TGT[i13 + 1] - TGT[i13]) * k13 / 50) * IH]);
    }
    pathLine(p3, stairs, C_MUTED, 2, '5 4');
    var iDots = interp.map(function (q) { return dotAt(p3, q[0], q[1], 2.6, C_UP); });
    var cur13 = hline(p3, IX, IY, IX, IY - IH, C_BAD, 1.6);
    p3.insertBefore(cur13, p3.firstChild);
    [0, 0.1, 0.2, 0.3].forEach(function (x, i) { label(p3, IX + i * IW / 3, IY + 14, fmt(x, 1) + ' s', 'demo-x-mut', 9.5, 'middle'); });
    label(p3, R, 92, '读法：虚线台阶是 10 Hz 的目标，黄点是插值出来的每一步', 'demo-x-ink2', 10);
    rich(p3, R, 270, '$\\pi_{loco}$ 在机载 Jetson Orin 上 50 Hz；机器人吃得下的话能上 200 Hz', 10.5, 'demo-x-mut');
    var p4 = group(s);
    paperPart(p4, 'fig9', 0, 0, 1, 1, R, 324, 280);
    label(p4, R + 140, 324 + 280 * 342 / 1301 + 14, '论文图 9：同一副手套在 SAPIEN 里驱动 12–20 个关节的手', 'demo-x-mut', 9.5, 'middle');
    function draw(t, clock) {
      var p = seg(t, 0.4, 1.4);
      bars.forEach(function (b) {
        b.ba.set(MAXW * b.r.arm / 300 * p, p > 0.95 ? String(b.r.arm) : '');
        b.bh.set(MAXW * b.r.hand / 300 * p, p > 0.95 ? String(b.r.hand) : '');
      });
      setOpacity(pL, win(t, 0.0));
      var now = nowOf(t, clock);
      setOpacity(p1, win(t, 3.6, 7.0));
      laneA.at(now, [R + 6, LA], [R + 354, LA], true);
      laneB.at(now, [R + 6, LB], [R + 354, LB], true);
      setOpacity(p2, win(t, 7.0, 10.4));
      var u13 = (now % 1.2) / 1.2;
      pkt.setAttribute('transform', 'translate(' + (R + 82 + 150 * Math.min(1, u13 / 0.8)).toFixed(1) + ' 133)');
      pkt.style.opacity = u13 < 0.85 ? 1 : 0;
      setOpacity(p3, win(t, 10.4, 13.4));
      var u3 = (since(t, clock, 10.4) % 3) / 3;
      setLine(cur13, IX + u3 * IW, IY, IX + u3 * IW, IY - IH);
      iDots.forEach(function (d, i) { d.style.opacity = interp[i][0] <= IX + u3 * IW ? 1 : 0.2; });
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
    label(pL, 24, 62, '图 11：完成时间（s，读图近似值），越短越快', 'demo-x-ink', 12);
    var BX = 40, BY = 300, BH = 200, BW = 340;
    hline(pL, BX, BY, BX + BW, BY, C_BORDER, 1.2);
    [0, 5, 10, 15].forEach(function (v) { label(pL, BX - 4, BY - v / 16 * BH + 3, String(v), 'demo-x-mut', 9.5, 'end'); hline(pL, BX, BY - v / 16 * BH, BX + BW, BY - v / 16 * BH, C_BORDER, 0.6, '2 4'); });
    var bars = FIG11.map(function (r, i) {
      var x = BX + 20 + i * 82;
      var a = vbar(pL, x, 28, C_BAD, 0.75), b = vbar(pL, x + 32, 28, C_HOMIE);
      label(pL, x + 30, BY + 16, r.zh, 'demo-x-ink2', 11, 'middle');
      var ta = halo(label(pL, x + 14, 0, '', 'demo-x-mut', 9.5, 'middle')), tb = halo(label(pL, x + 46, 0, '', 'demo-x-ink', 9.5, 'middle'));
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
    label(pR3, R, 80, '读法：横轴第几次，纵轴用时，越低越好', 'demo-x-ink2', 10);
    var UX = R + 30, UY = 290, UW = 330, UH = 200;
    hline(pR3, UX, UY, UX + UW, UY, C_BORDER, 1.2);
    [10, 20, 30].forEach(function (v) { label(pR3, UX - 4, UY - v / 36 * UH + 3, String(v), 'demo-x-mut', 9.5, 'end'); hline(pR3, UX, UY - v / 36 * UH, UX + UW, UY - v / 36 * UH, C_BORDER, 0.6, '2 4'); });
    for (var q = 0; q < 5; q++) label(pR3, UX + q / 4 * UW, UY + 16, '第 ' + (q + 1) + ' 次', 'demo-x-mut', 9.5, 'middle');
    function ux(q) { return UX + q / 4 * UW; }
    function uy(v) { return UY - v / 36 * UH; }
    TABLE10.forEach(function (u) { pathLine(pR3, u.t.map(function (v, q) { return [ux(q), uy(v)]; }), C_WARN, 1.4).style.opacity = 0.45; });
    pathLine(pR3, [[ux(0), uy(8)], [ux(4), uy(8)]], C_MUTED, 2, '7 5');
    halo(label(pR3, ux(1.2), uy(8) + 15, '专家 8 s（虚线）', 'demo-x-mut', 9.5));
    label(pR3, UX + UW, uy(33), '细线：每位新手', 'demo-x-ink2', 9.5, 'end');
    var avg = pathLine(pR3, [], C_GOOD, 3);
    var avgPts = TABLE10_AVG.map(function (v, q) { return [ux(q), uy(v)]; });
    var avgLab = halo(label(pR3, UX - 6, uy(24.8) + 4, '平均 24.8', 'demo-x-good', 10.5, 'end'));
    var avgLab2 = halo(label(pR3, ux(4) + 5, uy(8.0) + 4, '8.0', 'demo-x-good', 10.5));
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
    var s = sceneSvg('左边依次放三段项目页视频：G1 在 GRUtopia 仿真场景里被遥操作、自主策略蹲下拿沙发上的番茄、自主策略抓番茄放进篮子；右边依次是关节编号从深度优先换成广度优先、三台相机和关节数据流进示范库、Seer 的方块图、表 V 成功率、绕一圈的数据飞轮');
    s.appendChild(svgText(24, 26, '仿真里也能开；采的数据训出自主策略', 'demo-x-ink2', 13.5));
    var cl = [projClip(s, 'sim', 24, 44, 384, 216, '项目页视频（原速）：G1 在 GRUtopia 场景里'),
      projClip(s, 'il_squat', 24, 44, 384, 216, '项目页视频（原速）：自主策略 · 蹲下拿番茄'),
      projClip(s, 'il_pick', 24, 44, 384, 216, '项目页视频（原速）：自主策略 · 抓放番茄')];
    var R = 428;
    /* 第一段：从 Isaac Gym 迁到 Isaac Sim——关节换个编号顺序（深度优先 → 广度优先），四元数换个排法 */
    var p1 = group(s);
    chip(p1, R, 50, 140, 'Isaac Gym（训练）', C_MUTED, { size: 11, h: 28 });
    chip(p1, R + 210, 50, 146, 'Isaac Sim · GRUtopia', C_HOMIE, { size: 11, h: 28 });
    arrowAt(p1, R + 146, 64, R + 204, 64, C_HOMIE, 2.4);
    var TREE = [[R + 120, 112], [R + 60, 156], [R + 180, 156], [R + 30, 200], [R + 90, 200], [R + 150, 200], [R + 210, 200]];
    [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]].forEach(function (e) {
      var a = TREE[e[0]], b = TREE[e[1]], d = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d;
      hline(p1, a[0] + 13 * ux, a[1] + 13 * uy, b[0] - 13 * ux, b[1] - 13 * uy, C_BORDER, 1.6);
    });
    var DFS = [0, 1, 3, 4, 2, 5, 6], BFS = [0, 1, 2, 3, 4, 5, 6];
    var tNodes = TREE.map(function (q) {
      var g = group(p1);
      g.appendChild(paint(svgEl('circle', { cx: q[0], cy: q[1], r: 12, 'stroke-width': 1.6 }), C_SURFACE2, C_ACCENT));
      return { g: g, t: label(g, q[0], q[1] + 4, '', 'demo-x-ink', 11, 'middle') };
    });
    var orderT = label(p1, R + 120, 236, '', 'demo-x-ink2', 11, 'middle');
    var QX = R + 262, quat = ['x', 'y', 'z', 'w'].map(function (c) { return label(p1, QX, 160, c, c === 'w' ? 'demo-x-good' : 'demo-x-ink', 16, 'middle'); });
    label(p1, QX + 40, 124, '四元数', 'demo-x-mut', 10, 'middle');
    label(p1, R, 262, '同一个驾驶舱也能开仿真里的机器人', 'demo-x-good', 11.5);
    /* 第二段：采数据——三台相机加关节和命令，10 Hz 一帧，两个任务各采 50 条 */
    var p2 = group(s);
    label(p2, R, 62, '采数据：10 Hz 一帧', 'demo-x-ink', 13);
    var CAMS = [['头上 D455', 92], ['左臂 D435', 132], ['右臂 D435', 172]];
    CAMS.forEach(function (c) { chip(p2, R, c[1] - 13, 96, c[0], C_ACCENT, { size: 10.5, h: 26 }); });
    chip(p2, R, 199, 96, '$q_t$、$q_{upper}$、$C_t$', C_UP, { size: 10.5, h: 26 });
    var dsX = R + 200, dsY = 120;
    p2.appendChild(paint(svgEl('rect', { x: dsX, y: dsY, width: 74, height: 80, rx: 10, 'stroke-width': 1.6 }), C_SURFACE2, C_HOMIE));
    label(p2, dsX + 37, dsY + 46, '示范', 'demo-x-ink', 12, 'middle');
    var camFlows = CAMS.concat([['', 212]]).map(function (c, i) { return { f: flowSeg(p2, i < 3 ? C_ACCENT : C_UP, 2, 3, 60), y: c[1] }; });
    var demoBars = [0, 1].map(function (i) { return barRowAt(p2, R + 150, 218 + i * 36, 0, '', C_HOMIE, 12); });
    var demoT = [0, 1].map(function (i) { return label(p2, R + 150, 244 + i * 36, '', 'demo-x-mut', 9.5); });
    /* 第三段：Seer——图像经 ViT-B、本体经 MLP，进 Transformer，出三个回归头 */
    var p3 = group(s);
    label(p3, R, 62, '模型：Seer（自回归 Transformer）', 'demo-x-ink', 13);
    chip(p3, R, 84, 86, '多视角图像', C_ACCENT, { size: 10.5, h: 26 });
    chip(p3, R, 160, 86, '本体感受', C_UP, { size: 10.5, h: 26 });
    chip(p3, R + 104, 84, 64, 'ViT-B', C_ACCENT, { size: 10.5, h: 26 });
    chip(p3, R + 104, 160, 64, 'MLP', C_UP, { size: 10.5, h: 26 });
    chip(p3, R + 186, 104, 80, 'Transformer', C_HOMIE, { size: 10.5, h: 62 });
    [['手臂关节', 70], ['灵巧手', 122], ['高度命令', 174]].forEach(function (q) { chip(p3, R + 284, q[1], 72, q[0], C_HOMIE, { size: 10.5, h: 26 }); });
    var seerF = [[[R + 87, 97], [R + 103, 97]], [[R + 87, 173], [R + 103, 173]], [[R + 169, 97], [R + 185, 120]], [[R + 169, 173], [R + 185, 150]],
      [[R + 267, 135], [R + 283, 83]], [[R + 267, 135], [R + 283, 135]], [[R + 267, 135], [R + 283, 187]]].map(function (e, i) { return { e: e, f: flowSeg(p3, i < 4 ? C_ACCENT : C_HOMIE, 2, 3, 30) }; });
    label(p3, R, 236, '序列长 7、往前看 3 步；MAE 预训练的 ViT-B', 'demo-x-mut', 10);
    /* 第四段：表 V 的成功率条 */
    var p4 = group(s);
    label(p4, R, 62, '表 V：成功率，条越长越好（各测 15 次）', 'demo-x-ink', 12);
    var bars = TABLE5.map(function (r, i) { return barRowAt(p4, R, 80 + i * 34, 120, r.zh, C_HOMIE, 22); });
    label(p4, R, 160, '主机 RTX 4080，有线连 G1，整个回路 10 Hz', 'demo-x-mut', 10.5);
    /* 第五段：数据飞轮——遥操作 → 示范数据 → π_auto → 替操作员给 C_t、q_upper，绕一圈。
       四个卡片摆在圆环外面，小点沿整圈一直走、不从字上划过；走到哪个卡片跟前，哪个卡片亮一下 */
    var p5 = group(s);
    var FC = [R + 180, 280], FR = 48, FLY_W = 104, FLY_H = 26;
    var ring = [];
    for (var k16 = 0; k16 <= 72; k16++) { var aa = 2 * Math.PI * k16 / 72; ring.push([FC[0] + FR * Math.cos(aa), FC[1] + FR * Math.sin(aa)]); }
    pathLine(p5, ring, C_BORDER, 1.6, '4 4');
    /* 四段弧的中点各一个箭头，顺时针（屏幕上 y 朝下，角度增大就是顺时针） */
    for (var q16 = 0; q16 < 4; q16++) {
      var am = -Math.PI / 4 + q16 * Math.PI / 2, mx = FC[0] + FR * Math.cos(am), my = FC[1] + FR * Math.sin(am), dx = -Math.sin(am), dy = Math.cos(am);
      arrowAt(p5, mx - 6 * dx, my - 6 * dy, mx + 6 * dx, my + 6 * dy, C_HOMIE, 1.8);
    }
    var FLY = ['遥操作', '示范数据', '$\\pi_{auto}$', '$C_t$、$q_{upper}$'];
    var FLY_XY = [[FC[0] - FLY_W / 2, FC[1] - FR - 10 - FLY_H], [FC[0] + FR + 10, FC[1] - FLY_H / 2],
      [FC[0] - FLY_W / 2, FC[1] + FR + 10], [FC[0] - FR - 10 - FLY_W, FC[1] - FLY_H / 2]];
    var flyGlow = FLY.map(function (q, i) {
      var gl = rectBox(p5, FLY_XY[i][0] - 3, FLY_XY[i][1] - 3, FLY_W + 6, FLY_H + 6, C_HOMIE, 'none');
      gl.setAttribute('stroke-width', 2.6);
      chip(p5, FLY_XY[i][0], FLY_XY[i][1], FLY_W, q, C_HOMIE, { size: 11, h: FLY_H });
      return gl;
    });
    var flyTrail = [0.5, 0.25].map(function (o) { var d = dotAt(p5, FC[0], FC[1] - FR, 4, C_HOMIE); d.style.opacity = o; return d; });
    var flyDot = dotAt(p5, FC[0], FC[1] - FR, 5.5, C_HOMIE);
    rich(p5, 24, 352, '数据飞轮：接口只有 $C_t$ 和 $q_{upper}$，什么上层策略都能接上来', 11, 'demo-x-ink2');
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var k = t < 7.0 ? 0 : t < 10.4 ? 1 : 2;
      var starts = [0, 6.6, 10.0];
      cl.forEach(function (c, i) { setOpacity(c.g, i === k ? 1 : 0); c.at(K.clipSince(t, starts[i]), i === k); });
      setOpacity(p1, win(t, 0.0, 3.6));
      var dfs = Math.floor(now / 2.5) % 2 === 0, ord = dfs ? DFS : BFS;
      var nShow = Math.floor((now % 2.5) / 0.25) + 1;
      tNodes.forEach(function (n, i) { var pos = ord.indexOf(i); n.t.textContent = pos < nShow ? String(pos) : ''; });
      orderT.textContent = dfs ? '深度优先（Isaac Gym）' : '广度优先（Isaac Sim）';
      var qm = 0.5 - 0.5 * Math.cos(now * Math.PI / 2.5), order = [0, 1, 2, 3];
      /* w 先往下沉、再往左走、最后升回来，不和别的字母、标题擦过 */
      var qx = seg(qm, 0.15, 0.85), qd = 26 * seg(qm, 0, 0.15) * (1 - seg(qm, 0.85, 1));
      quat.forEach(function (n, i) {
        var from = i, to = i === 3 ? 0 : i + 1, y0 = 160 + (i === 3 ? qd : 0);
        n.setAttribute('x', (QX + 22 * (from + (to - from) * qx)).toFixed(1)); n.setAttribute('y', y0.toFixed(1));
      });
      void order;
      setOpacity(p2, win(t, 3.6, 7.0));
      camFlows.forEach(function (c) { c.f.at(now, [R + 98, c.y], [dsX - 2, dsY + 40], true); });
      var nd = Math.min(50, Math.floor(since(t, clock, 3.6) * 12));
      demoBars.forEach(function (b, i) { b.set(150 * nd / 50, ''); demoT[i].textContent = ['蹲下拿番茄', '抓放番茄'][i] + ' ' + nd + ' / 50'; });
      setOpacity(p3, win(t, 7.0, 10.4));
      seerF.forEach(function (q) { q.f.at(now, q.e[0], q.e[1], true); });
      setOpacity(p4, win(t, 10.4));
      var p = seg(t, 10.8, 11.8);
      bars.forEach(function (b, i) { b.set(200 * TABLE5[i].sr / 100 * p, p > 0.95 ? fmt(TABLE5[i].sr, 1) + '%（' + Math.round(TABLE5[i].sr * 15 / 100) + ' / 15）' : ''); });
      setOpacity(p5, win(t, 13.4));
      /* 一圈约 6.3 s；从「遥操作」出发 */
      var fa = -Math.PI / 2 + since(t, clock, 13.4) * 1.0;
      moveDot(flyDot, FC[0] + FR * Math.cos(fa), FC[1] + FR * Math.sin(fa));
      flyTrail.forEach(function (d, j) { var b = fa - 0.2 * (j + 1); moveDot(d, FC[0] + FR * Math.cos(b), FC[1] + FR * Math.sin(b)); });
      flyGlow.forEach(function (gl, i) {
        var d = Math.abs(((fa - (-Math.PI / 2 + i * Math.PI / 2)) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
        gl.style.opacity = Math.max(0, 1 - d / 0.6).toFixed(2);
      });
    }
    return { el: s, draw: draw };
  }

  /* ── scene 17: 局限与代码 ── */
  function buildSceneLimits() {
    var s = sceneSvg('上面是论文图 17：仿真里上台阶、真机上撞台阶；下面依次是三条局限的小动画、开源代码的目录、代码和论文对不上的四处（先论文、后代码地翻过来），最后是驾驶舱的示意：三件设备的读数流向一台会蹲的 G1');
    s.appendChild(svgText(24, 26, '局限与代码', 'demo-x-ink2', 13.5));
    var p1 = group(s);
    var fig = paperPart(p1, 'fig17', 0, 0, 1, 1, 40, 44, 720, '论文图 17：接上 PIM 在仿真里上台阶（左），真机上撞到台阶（右）');
    label(p1, 40, 44 + fig.h + 44, '地形：仿真里能上高台阶；真机上头上的激光雷达跟着晃、高程图分辨率低，会撞台阶', 'demo-x-ink2', 11.5);
    var Y = 44 + fig.h + 66;
    /* 第二段：三条局限，各一张会动的小卡 */
    var p2 = group(s);
    var CW = 232, CH = 150;
    [['拇指和人手对不完全上', 40], ['没有力反馈', 284], ['外骨骼管不了腰', 528]].forEach(function (q) {
      rectBox(p2, q[1], Y, CW, CH, C_BAD);
      label(p2, q[1] + CW / 2, Y + CH - 12, q[0], 'demo-x-ink2', 11.5, 'middle');
    });
    /* 卡 1：人的拇指（灰虚线）和手套的拇指（黄）一起弯，弯到后面就对不上了 */
    var TB = [40 + 80, Y + 92];
    var thH = [pathLine(p2, [], C_MUTED, 3, '4 3'), pathLine(p2, [], C_UP, 3.4)];
    dotAt(p2, TB[0], TB[1], 5, X.ink2);
    label(p2, 40 + 150, Y + 36, '灰：人手', 'demo-x-mut', 9.5); label(p2, 40 + 150, Y + 56, '黄：手套', 'demo-x-mut', 9.5);
    /* 卡 2：机器人的手推箱子，反作用力传不回操作员 */
    var C2 = 284;
    chip(p2, C2 + 12, Y + 70, 60, '操作员', C_MUTED, { size: 10, h: 24 });
    var hand2 = dotAt(p2, C2 + 150, Y + 82, 11, C_UP);
    var box2 = paint(svgEl('rect', { x: C2 + 162, y: Y + 64, width: 40, height: 36, rx: 3 }), C_SURFACE2, X.ink2);
    p2.appendChild(box2);
    var force = arrow(p2, C_BAD, 2.6, '5 4');
    var block = group(p2);
    hline(block, C2 + 98, Y + 50, C2 + 118, Y + 74, C_BAD, 3); hline(block, C2 + 118, Y + 50, C2 + 98, Y + 74, C_BAD, 3);
    /* 卡 3：俯视的肩膀线绕腰转，外骨骼读不到这个角度 */
    var C3 = [528 + 116, Y + 76];
    var sh = group(p2);
    sh.appendChild(paint(svgEl('ellipse', { cx: 0, cy: 0, rx: 52, ry: 14, 'stroke-width': 2 }), C_SURFACE2, C_PURPLE));
    sh.appendChild(paint(svgEl('circle', { cx: 0, cy: -2, r: 9 }), X.ink2));
    var waistArc = pathLine(p2, [], C_PURPLE, 2);
    label(p2, C3[0], Y + 26, '俯视：腰偏航', 'demo-x-mut', 9.5, 'middle');
    /* 第三段：开源代码的目录，一行一行长出来 */
    var p3 = group(s);
    label(p3, 40, Y + 14, 'InternRobotics/OpenHomie', 'demo-x-ink', 13);
    var TREE = [['HomieRL', 'Isaac Gym 训练（基于 HIMLoco）'], ['HomieDeploy', '真机部署，带训好的 deploy.onnx'], ['MujocoDeploy', 'MuJoCo 回放'], ['HomieHardware', '硬件文件：填表申请']];
    var treeRows = TREE.map(function (q, i) {
      var g = group(p3), y = Y + 44 + i * 28;
      hline(g, 50, y - 24, 50, y - 4, C_BORDER, 1.2);
      hline(g, 50, y - 4, 64, y - 4, C_BORDER, 1.2);
      label(g, 70, y, q[0], 'demo-x-ink', 12);
      label(g, 200, y, q[1], 'demo-x-mut', 10.5);
      return g;
    });
    chip(p3, 520, Y + 30, 240, 'CC BY-NC-SA 4.0：禁止商用', C_BAD, { size: 11.5, h: 30 });
    label(p3, 520, Y + 86, 'README 2026-07：v2 策略在', 'demo-x-mut', 10);
    label(p3, 520, Y + 104, 'GR00T-WholeBodyControl，作者建议用 SONIC', 'demo-x-mut', 10);
    /* 第四段：代码和论文对不上的四处，先显示论文的写法，再翻成代码的 */
    var p4 = group(s);
    var FLIP = [['命令的维数', '3 维', '4 维，多了 $v_y$', C_PURPLE], ['蹲 / 站 / 走的比例', '蹲 1/3，站和走 2/3', '蹲 1/3、站 1/6、走 1/2', C_LOW],
      ['课程的 $\\lambda$', '$20\\,(1 - \\rho_a)$', '$20\\,(1 - 0.99\\rho_a)$', C_UP], ['腿的 $K_p$（髋 / 膝）', '没写', '训练 100 / 150，部署 150 / 300', C_ACCENT]];
    var flips = FLIP.map(function (q, i) { return flipCard(p4, 40 + (i % 2) * 368, Y + 8 + Math.floor(i / 2) * 70, 352, 58, q[0], q[1], q[2], q[3]); });
    /* 第五段：图 17 退场，换成驾驶舱的示意和三行总结 */
    var p5 = group(s);
    var rig = cockpitRig(p5, 60, 96, 150, 330, 360);
    label(p5, 450, 120, 'HOMIE：一个人遥操作整台人形', 'demo-x-ink', 14);
    rich(p5, 450, 152, '下半身：不用动捕训出来的 $\\pi_{loco}$', 12, 'demo-x-ink2');
    label(p5, 450, 180, '上半身：外骨骼读数直接当关节角', 'demo-x-ink2', 12);
    label(p5, 450, 208, '手指：霍尔手套；整套约 500 美元', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(p1, win(t, 0.0, 13.4));
      setOpacity(p2, win(t, 3.6, 7.0));
      var bend = 0.5 + 0.5 * Math.sin(now * 1.6);
      [[0, 0], [1, 0.28 * bend]].forEach(function (q, i) {
        var a1 = -1.2 + 0.9 * bend + q[1], a2 = a1 + 0.5 + 0.6 * bend + q[1];
        var p1x = TB[0] + 34 * Math.cos(a1), p1y = TB[1] + 34 * Math.sin(a1);
        setPath(thH[i], [TB, [p1x, p1y], [p1x + 26 * Math.cos(a2), p1y + 26 * Math.sin(a2)]]);
      });
      var push2 = 4 * Math.sin(now * 3);
      moveDot(hand2, C2 + 150 + push2, Y + 82);
      box2.setAttribute('x', (C2 + 162 + push2).toFixed(1));
      force.set(C2 + 158, Y + 62, C2 + 78, Y + 62);
      block.style.opacity = 0.5 + 0.5 * Math.sin(now * 5);
      var yaw = 0.45 * Math.sin(now * 1.2);
      sh.setAttribute('transform', 'translate(' + C3[0] + ' ' + C3[1] + ') rotate(' + (yaw * 180 / Math.PI).toFixed(1) + ')');
      var arcP = [];
      for (var k = 0; k <= 12; k++) { var aa = Math.PI / 2 + yaw * k / 12; arcP.push([C3[0] + 30 * Math.cos(aa), C3[1] + 30 * Math.sin(aa)]); }
      setPath(waistArc, arcP);
      setOpacity(p3, win(t, 7.0, 10.4));
      treeRows.forEach(function (g, i) { setOpacity(g, seg(t, 7.4 + i * 0.5, 7.8 + i * 0.5)); });
      setOpacity(p4, win(t, 10.4, 13.4));
      flips.forEach(function (f, i) { f.set(seg(t, 10.9 + i * 0.5, 11.9 + i * 0.5)); });
      setOpacity(p5, win(t, 13.4));
      if (t > 13.4) rig.put(loopK('squat', now), now);
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
        { at: 7.0, s: '站着伸手，手最低 0.55 m，够不到最低一层；再蹲到 0.40 m，手到 0.14 m。' },
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
        { at: 3.6, s: '脚踩踏板给出 $C_t = [v_x, \\omega_{yaw}, h_t]$，$\\pi_{loco}$ 在机载 Orin 上以 50 Hz 控制下肢。' },
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
        { at: 0.4, s: '✓ 是有、✗ 是没有。同构机械臂又准又快，可手只有夹爪或靠视觉，也都不管全身。' },
        { at: 3.6, s: '视觉 / VR 方案：先估姿态再解逆运动学，延迟高、怕遮挡、有误差。' },
        { at: 7.0, s: '能全身移动操作的 HumanPlus、OmniH2O、Mobile-TeleVision：训练要用动捕数据做先验。' },
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
        { at: 10.4, s: 'PD 控制：目标角 = 默认角 + 0.25 × 动作，策略 50 Hz。' },
        { at: 13.4, s: 'Isaac Gym 4096 个环境，RTX 4090 约 3 小时，**不用任何动捕数据**。' }
      ]
    },
    {
      title: '上身姿态课程',
      dur: 16,
      build: buildSceneCurriculum,
      cues: [
        { at: 0.4, s: '下半身要在**任意上身姿态**下站稳、行走、下蹲；一上来就大幅乱摆，策略学不会。' },
        { at: 3.6, s: '课程比例 $\\rho_a$ 从 0 开始，x 方向速度跟得好就加 0.05；$\\rho_a$ 越大，分布越往右铺开。' },
        { at: 7.0, s: "先按式 2 抽 $\\rho_a'$（绿线、绿条），再取 $a_i \\sim \\mathcal{U}(0, \\rho_a')$（黄点）：关节往限位偏 $a_i$ 那么远。" },
        { at: 10.4, s: '每 1 s 重采样一次目标，这 1 s 里线性插值过去；不插值的话机器人站不稳。' },
        { at: 13.4, s: '比 $\\mathcal{U}(0, \\rho_a)$ 平滑：任何时候 $[0, 1]$ 都有概率被采到。代码里 $\\lambda = 20(1 - 0.99\\rho_a)$。' }
      ]
    },
    {
      title: '高度跟踪奖励 $r_{knee}$',
      dur: 16,
      build: buildSceneKnee,
      cues: [
        { at: 0.4, s: '能蹲下去才够到低处。目标高度 $h_t$ 由中间那只踏板给，代码里蹲的范围是 0.24–0.74 m。' },
        { at: 3.6, s: '式 4：高度差乘「归一化膝角减 1/2」，取负的绝对值；膝角在中间时这一项为 0。' },
        { at: 7.0, s: '算例 A：比目标高 0.33 m、膝盖偏直，膝再弯一点罚得少——鼓励弯。' },
        { at: 10.4, s: '算例 B：比目标低 0.32 m、膝盖偏弯，膝伸一点罚得少——鼓励伸。' },
        { at: 13.4, s: '代码权重 $-0.75$；论文正文那句「低于目标鼓励弯」和公式的方向相反（我们的理解：笔误）。' }
      ]
    },
    {
      title: '训练场：蹲、走、站轮着来',
      dur: 16,
      build: buildSceneTraining,
      cues: [
        { at: 0.4, s: '每 4 s 重采样一次命令，一个回合 20 s；同一个环境会在蹲、走、站之间换来换去。' },
        { at: 3.6, s: '论文：1/3 的环境练蹲、2/3 练站和走。代码：蹲 1/3、站着不动 1/6、走 1/2。' },
        { at: 7.0, s: '蹲时速度清零、高度在 0.24–0.74 m 随机；走时三个速度随机、高度 0.74 m。' },
        { at: 10.4, s: '代码里有 7 项奖励只在目标高度 $\\geq 0.735$ m 时才算，蹲着时不罚髋、踝偏离和两脚间距。' },
        { at: 13.4, s: '域随机化：手上加重、躯干加重、每 4 s 推一下、摩擦、PD 增益；奖励一共 33 项。' }
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
        { at: 13.4, s: '官方策略在我们的 MuJoCo 回放上对称损失平均 0.0046；只抬左臂时，镜像后左右髋正好对调。' }
      ]
    },
    {
      title: '图 7：三组消融',
      dur: 16,
      build: buildSceneAblation,
      cues: [
        { at: 0.4, s: '图 7：每组 3 个种子、1000 个环境 × 20 s，上身按 $\\rho_a \\to 1$ 随机。' },
        { at: 3.6, s: '上身课程：ours 的三项跟踪误差都更低，收敛也更快。' },
        { at: 7.0, s: '只把高度奖励放大（hei）：速度误差大得多，高度误差最后也不比 ours 快。' },
        { at: 10.4, s: '对称：只增强时对称损失涨到 20 左右；不做增强的两组，存活时间一直在 1 s 左右。' },
        { at: 13.4, s: '增强提高数据效率，对称损失保住左右对称；项目页说训练快了 10 倍以上。' }
      ]
    },
    {
      title: '换一台机器人：GR-1（表 II）',
      dur: 16,
      build: buildSceneGr1,
      cues: [
        { at: 0.4, s: 'Fourier GR-1 比 G1 高 35 cm、重近 20 kg，手占体重的比例只有一半。' },
        { at: 3.6, s: '只改跟身材有关的几个数：站立高度、蹲的范围、两脚间距；训练流程不变。' },
        { at: 7.0, s: '表 II：两台都活满 20 s 左右，GR-1 的速度误差大一些。' },
        { at: 10.4, s: '我们在 MuJoCo 里回放官方 G1 策略：200 段里 168 段活满 20 s（定义不同，不能直接比）。' },
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
        { at: 0.4, s: '表 IV：输出给手臂、手的频率，HOMIE 是 263 Hz 和 293 Hz，视觉 / VR 方案 16–125 Hz。' },
        { at: 3.6, s: '不估姿态、不解逆运动学，读到就发：输出频率几乎等于采集频率。' },
        { at: 7.0, s: 'Wi-Fi 一包 128 字节（32 个 float32），延迟 16 ms。' },
        { at: 10.4, s: '在 G1 上手臂目标其实是 10 Hz 更新、每个插值 50 次；$\\pi_{loco}$ 在机载 Orin 上 50 Hz。' },
        { at: 13.4, s: '图 9：同一副手套在仿真里驱动 Inspire、LEAP、Shadow、Schunk 四种手。' }
      ]
    },
    {
      title: '真机：图 1 的任务',
      dur: 16,
      build: buildSceneReal,
      cues: [
        { at: 0.4, s: '蹲下去从地上捡瓶子：踏板压低高度，手臂伸向地面。' },
        { at: 3.6, s: '抓住烤箱把手，边退边拉开门：腿和手是同时在动的。' },
        { at: 7.0, s: '推一位坐在椅子上、约 60 kg 的人，大约是机器人体重的两倍。' },
        { at: 10.4, s: '两台机器人、两位操作员配合传苹果。' },
        { at: 13.4, s: '用木棍用力打，机器人也站得住（项目页的鲁棒性实验）。' }
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
        { at: 10.4, s: '表 X：5 位新手连做 5 次递手，平均从 24.8 s 降到 8.0 s，接近专家。' },
        { at: 13.4, s: '身高 160–185 cm 都能用；从穿戴到开始做任务，上手流程约 5 分钟。' }
      ]
    },
    {
      title: '仿真里开，数据训自主策略',
      dur: 16,
      build: buildSceneAuto,
      cues: [
        { at: 0.4, s: '把策略从 Isaac Gym 迁到 Isaac Sim 的 GRUtopia 场景：同一个驾驶舱也能开仿真里的机器人。' },
        { at: 3.6, s: '采数据：两个任务各 50 条示范，10 Hz 记录图像、$q_t$、$q_{upper}$ 和 $C_t$。' },
        { at: 7.0, s: '用 Seer 训练自主策略：看多视角图像和本体感受，输出手臂、手和高度命令。' },
        { at: 10.4, s: '表 V：蹲下拿番茄 73.3%，抓放番茄 80.0%，各测 15 次。' },
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
        { at: 7.0, s: '开源 OpenHomie：训练、部署代码和训好的 deploy.onnx；硬件要申请，禁止商用。' },
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
        'G1 的动作是我们在 MuJoCo 里跑官方 HomieDeploy/deploy.onnx 得到的（sim-to-sim，不是论文的实验）：走路 0.5 m/s、蹲到 0.40 m 再站起、按代码的课程随机摆上身（ρ_a = 0.2 与 ρ_a → 1）、站着只动手臂，以及第 1 幕同样往前下方伸手、一台站着一台蹲到 0.40 m（双手最低点 0.55 / 0.14 m，按回放的关节角做正运动学）；增益用真机部署的 g1_control.cpp。第 1 幕的货架是示意（只有高度按比例），第 7 幕的时间轴是按代码比例随机抽的示意。',
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
      sub: '16 分 23 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十七幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '19.1 MB',
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
      var pl = K.plot(g, { l: 34, r: 10, t: 16, b: 36 }, [0, 1], [0, 21]);
      K.axes(g, pl, { xTicks: [0, 0.5, 1], yTicks: [0, 10, 20], xLabel: '抽到的上限 ρ′' });
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
      var pl2 = K.plot(g2, { l: 34, r: 10, t: 16, b: 36 }, [0, 1], [0, mx * 1.1]);
      K.axes(g2, pl2, { xTicks: [0, 0.5, 1], xLabel: '占限位的比例' });
      bins.forEach(function (c, i) {
        g2.ctx.fillStyle = P.warn; var x0 = pl2.sx(i / 20) + 1, x1 = pl2.sx((i + 1) / 20) - 1;
        g2.ctx.fillRect(x0, pl2.sy(c), x1 - x0, pl2.sy(0) - pl2.sy(c));
      });
      text(g2.ctx, '4000 次抽样', pl2.x0 + 4, pl2.y1 + 10, P.muted);
      /* 一个关节 10 s 的目标轨迹 */
      var g3 = begin(st3);
      var pl3 = K.plot(g3, { l: 40, r: 10, t: 22, b: 36 }, [0, 10], [-1.1, 2.2]);
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
      var pl = K.plot(g, { l: 62, r: 14, t: 24, b: 36 }, [0, 1], [-0.5, 0.5]);
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
