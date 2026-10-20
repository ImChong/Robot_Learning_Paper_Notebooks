/* Interactive ExBody2 demos for
 * papers/03_High_Impact_Selection/ExBody2_Advanced_Expressive_Whole-Body_Control
 * （Ji, Peng, Liu, Li, Yang, Cheng, Wang · ExBody2: Advanced Expressive Humanoid Whole-Body Control ·
 *   arXiv 2412.13196 v2，2025-03-12；官方没有开源代码）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["exbody2"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   exbody2-explainer — 十八幕讲解动画：表现力和稳定，要兼得 → 前人卡在哪 → 两步走：通才再专才 → 人的动作搬到 G1 →
 *                       特权教师看什么 → 奖励：表达目标 + 移动目标 → 全局关键点会越跑越偏 → 局部关键点 + 速度：解耦 →
 *                       学生：10 步历史 + DAgger → 可行又多样 → 自动筛选：e(s) 与阈值 → 阈值扫一遍 → 专才：从通才微调 →
 *                       Cha-Cha → 和基线比 → 消融：历史长度与 DAgger → 动作从哪来、怎么部署 → 局限与没说清的地方
 *   exbody2-video     — 同一套十八幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   exbody2-frames    — 全局关键点 vs 局部关键点：一段 G1 大步走，机器人比参考慢 / 偏，误差与关键点奖励怎么变，定期拉回
 *   exbody2-curation  — 数据筛选：图 8 的累积分布上拖阈值，图 4 的六种误差，e(s) 计算器
 *   exbody2-tables    — 表 II、表 III、表 IV 与附录的表 X、表 XI
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
  /* 论文的图（arXiv 2412.13196 v2 的图 1、2、5、6、7）与项目页视频的片段放在 assets/img/papers/exbody2/；
     G1 与 SMPL 的 3D 逐帧贴图在 assets/img/papers/exbody2/g1_3d/ */
  var IMG_BASE = assetBase('../../img/papers/');
  var PAPER_IMG_BASE = IMG_BASE ? IMG_BASE + 'exbody2/' : '';
  var CLIP_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'clips/' : '';
  var G1_3D_BASE = IMG_BASE ? IMG_BASE + 'exbody2/g1_3d/' : '';
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
    table = K.table;

  // ─── 论文里的数字（arXiv 2412.13196 v2 的正文、表 I–IV、附录表 V–XI、图 4、图 8） ─────────
  /* 表 I：跟踪奖励。[名字, 组, 权重, 表达式]；e 是表达目标 G^e，m 是移动目标 G^m */
  var T1 = [
    ['关节角', 'e', 3.0, '\\exp(-0.7\\,|\\mathbf q_{\\text{ref}}-\\mathbf q|)'],
    ['关键点位置', 'e', 2.0, '\\exp(-|\\mathbf p_{\\text{ref}}-\\mathbf p|)'],
    ['线速度', 'm', 6.0, '\\exp(-4.0\\,|\\mathbf v_{\\text{ref}}-\\mathbf v|)'],
    ['速度方向', 'm', 6.0, '\\exp(-4.0\\cos(\\mathbf v_{\\text{ref}},\\mathbf v))'],
    ['横滚与俯仰', 'm', 1.0, '\\exp(-|\\Omega^{\\phi\\theta}_{\\text{ref}}-\\Omega^{\\phi\\theta}|)'],
    ['偏航', 'm', 1.0, '\\exp(-|\\Delta y|)']
  ];
  /* 附录表 IX：九项正则 [名字, 权重] */
  var REG = [['关节越限', -10], ['关节加速度', -3e-7], ['偏离默认关节角', -0.1], ['动作变化率', -0.1], ['腾空时间', 10],
    ['足底接触力', -0.003], ['绊脚', -2], ['腰部横滚俯仰偏离', -0.5], ['踝关节动作', -0.1]];
  /* 附录表 V–VII：本体感受 75、特权 62、跟踪目标 69；学生 10 步历史；网络 */
  var DIM = { prop: 75, priv: 62, goal: 69, hist: 10, act: 23, keypoints: 12,
    teacherMlp: [512, 256, 128], studentMlp: [1024, 1024, 512] };
  var PROP_PARTS = [['关节角', 23], ['关节速度', 23], ['上一步动作', 23], ['根角速度', 3], ['横滚俯仰偏航', 3]];
  var PRIV_PARTS = [['关节角之差', 23], ['关键点之差', 36], ['根部速度', 3]];
  var GOAL_PARTS = [['关节角', 23], ['关键点', 36], ['根速度', 3], ['根角速度', 3], ['横滚俯仰偏航', 3], ['高度', 1]];
  /* 表 II（仿真，D_CMU）：七项 [E_vel, MPKPE, 上, 下, MPJPE, 上, 下] */
  var METRICS = ['$E_{\\text{vel}}$', '$E_{\\text{mpkpe}}$', '$E^{\\text{upper}}_{\\text{mpkpe}}$', '$E^{\\text{lower}}_{\\text{mpkpe}}$',
    '$E_{\\text{mpjpe}}$', '$E^{\\text{upper}}_{\\text{mpjpe}}$', '$E^{\\text{lower}}_{\\text{mpjpe}}$'];
  var METRIC_ZH = ['速度', '关键点', '上半身关键点', '下半身关键点', '关节角', '上半身关节角', '下半身关节角'];
  var T2 = [
    { zh: 'ExBody', v: [0.4700, 0.1339, 0.1249, 0.1428, 0.2020, 0.1343, 0.2952] },
    { zh: 'ExBody†', v: [0.4195, 0.1150, 0.1106, 0.1198, 0.1496, 0.1416, 0.1607] },
    { zh: 'OmniH2O*', v: [0.3725, 0.1253, 0.1266, 0.1240, 0.1681, 0.1564, 0.1843] },
    { zh: 'ExBody2 不筛数据', v: [0.2787, 0.1133, 0.1087, 0.1182, 0.1355, 0.1192, 0.1579] },
    { zh: 'ExBody2', v: [0.2930, 0.1000, 0.0960, 0.1040, 0.1079, 0.0953, 0.1253] }
  ];
  /* 表 III（真机）：[MPJPE, 上, 下] */
  var T3 = [
    { zh: 'ExBody', v: [0.2178, 0.1223, 0.3239] },
    { zh: 'ExBody†', v: [0.1465, 0.1314, 0.1672] },
    { zh: 'OmniH2O*', v: [0.1396, 0.1273, 0.1533] },
    { zh: 'ExBody2 不筛数据', v: [0.1361, 0.1254, 0.1481] },
    { zh: 'ExBody2', v: [0.1074, 0.1092, 0.1054] }
  ];
  /* 表 IV：四组数据 × 三种训法（专才 / 从头 / 通才），七项同表 II */
  var T4 = [
    { zh: '易', rows: [[0.0828, 0.0561, 0.0564, 0.0558, 0.0772, 0.0647, 0.0944], [0.0853, 0.0608, 0.0623, 0.0592, 0.0843, 0.0711, 0.1024],
      [0.0986, 0.0699, 0.0708, 0.0690, 0.1041, 0.0882, 0.1259]] },
    { zh: '中', rows: [[0.0991, 0.0571, 0.0582, 0.0559, 0.0760, 0.0636, 0.0930], [0.1188, 0.0676, 0.0688, 0.0663, 0.0924, 0.0794, 0.1103],
      [0.1217, 0.0741, 0.0727, 0.0755, 0.1092, 0.0914, 0.1337]] },
    { zh: '难', rows: [[0.1712, 0.0827, 0.0829, 0.0826, 0.1047, 0.0911, 0.1234], [0.1631, 0.0886, 0.0898, 0.0873, 0.1188, 0.1067, 0.1354],
      [0.1452, 0.0890, 0.0867, 0.0912, 0.1181, 0.1011, 0.1414]] },
    { zh: 'ACCAD', rows: [[0.4021, 0.1149, 0.1079, 0.1215, 0.1402, 0.1290, 0.1557], [0.4153, 0.1246, 0.1154, 0.1332, 0.1609, 0.1490, 0.1771],
      [0.3361, 0.1268, 0.1156, 0.1391, 0.1716, 0.1532, 0.1967]] }
  ];
  var T4_METHODS = ['专才', '从头训', '通才'];
  /* 附录表 X：在三个评测集上，三种训练集（D50 / D250 / D_CMU）的七项 */
  var T10 = [
    { zh: '在 $\\mathcal D_{50}$ 上评', rows: [[0.1375, 0.0627, 0.0571, 0.0682, 0.0753, 0.0626, 0.0928], [0.1454, 0.0669, 0.0600, 0.0738, 0.0870, 0.0689, 0.1119],
      [0.1543, 0.0767, 0.0649, 0.0885, 0.1099, 0.0854, 0.1437]] },
    { zh: '在 $\\mathcal D_{\\text{CMU}}$ 上评', rows: [[0.3509, 0.1076, 0.1074, 0.1076, 0.1338, 0.1285, 0.1410], [0.2834, 0.1048, 0.1021, 0.1073, 0.1148, 0.1012, 0.1335],
      [0.2622, 0.1071, 0.1036, 0.1110, 0.1291, 0.1129, 0.1512]] },
    { zh: '在 $\\mathcal D_{\\text{ACCAD}}$ 上评', rows: [[0.4226, 0.1277, 0.1210, 0.1330, 0.1720, 0.1618, 0.1861], [0.3533, 0.1234, 0.1141, 0.1315, 0.1421, 0.1223, 0.1692],
      [0.3452, 0.1267, 0.1146, 0.1381, 0.1780, 0.1635, 0.1979]] }
  ];
  var T10_TRAIN = ['$\\mathcal D_{50}$ 训', '$\\mathcal D_{250}$ 训', '$\\mathcal D_{\\text{CMU}}$ 训'];
  /* 附录表 XI：历史长度（0 / 10 / 25 / 50 / 100 步）与 DAgger；w/o-DAgger 这一行和表 II 的 ExBody† 一字不差 */
  var T11_HIST = [
    { n: 0, v: [0.4151, 0.1047, 0.1010, 0.1081, 0.1119, 0.0986, 0.1303] },
    { n: 10, v: [0.2930, 0.1000, 0.0960, 0.1040, 0.1079, 0.0953, 0.1253] },
    { n: 25, v: [0.2950, 0.1032, 0.0984, 0.1078, 0.1128, 0.0965, 0.1351] },
    { n: 50, v: [0.2648, 0.1004, 0.0956, 0.1051, 0.1114, 0.0967, 0.1317] },
    { n: 100, v: [0.3242, 0.1063, 0.1001, 0.1122, 0.1225, 0.1050, 0.1466] }
  ];
  var T11_NODAGGER = [0.4195, 0.1150, 0.1106, 0.1198, 0.1496, 0.1416, 0.1607];
  /* 图 4（读图值，按像素颜色量出来的）：六种误差 × [τ = 0.075, 0.100, 0.125, 0.150, 0.175, π0]；下半身关节角在 0.175 处被图例挡住 */
  var FIG4_X = ['0.075', '0.100', '0.125', '0.150', '0.175', '$\\pi_0$'];
  var FIG4 = [
    { zh: '关键点', unit: 'm', v: [0.120, 0.113, 0.101, 0.099, 0.107, 0.112] },
    { zh: '上半身关键点', unit: 'm', v: [0.116, 0.108, 0.097, 0.095, 0.104, 0.107] },
    { zh: '下半身关键点', unit: 'm', v: [0.123, 0.117, 0.105, 0.102, 0.109, 0.117] },
    { zh: '关节角', unit: 'rad', v: [0.129, 0.118, 0.109, 0.106, 0.122, 0.134] },
    { zh: '上半身关节角', unit: 'rad', v: [0.115, 0.101, 0.095, 0.092, 0.108, 0.116] },
    { zh: '下半身关节角', unit: 'rad', v: [0.149, 0.142, 0.127, 0.126, null, 0.157] }
  ];
  /* 图 8：e(s) 的经验累积分布（读图值，每 2.5% 一个点）；五档阈值的竖线落在的百分位 */
  var CDF = [[0, 0.0334], [2.5, 0.0505], [5, 0.0566], [7.5, 0.0613], [10, 0.0652], [12.5, 0.0697], [15, 0.0736], [17.5, 0.0775], [20, 0.0812],
    [22.5, 0.0838], [25, 0.0865], [27.5, 0.0892], [30, 0.0914], [32.5, 0.0941], [35, 0.0969], [37.5, 0.0993], [40, 0.1022], [42.5, 0.1044],
    [45, 0.1065], [47.5, 0.1091], [50, 0.1115], [52.5, 0.1142], [55, 0.116], [57.5, 0.1182], [60, 0.1216], [62.5, 0.1249], [65, 0.1269],
    [67.5, 0.1312], [70, 0.1352], [72.5, 0.1394], [75, 0.1443], [77.5, 0.1499], [80, 0.1563], [82.5, 0.1642], [85, 0.1764], [87.5, 0.1848],
    [90, 0.1979], [92.5, 0.2137], [95, 0.2305], [97.5, 0.2731], [100, 0.3675]];
  var TAUS = [{ tau: 0.075, pct: 14.0 }, { tau: 0.10, pct: 37.8 }, { tau: 0.125, pct: 61.8 }, { tau: 0.15, pct: 76.9 }, { tau: 0.175, pct: 84.8 }];
  var E_W = { alpha: 0.1, beta: 0.9 };
  var CMU = { paper: 1919, amass: 2082, manual: 250 };
  function eScore(eKey, eDof) { return E_W.alpha * eKey + E_W.beta * eDof; }
  /* e → 百分位：在读图的累积分布上线性插值 */
  function pctOf(e) {
    if (e <= CDF[0][1]) return 0;
    for (var i = 1; i < CDF.length; i++) {
      if (e <= CDF[i][1]) return CDF[i - 1][0] + (CDF[i][0] - CDF[i - 1][0]) * (e - CDF[i - 1][1]) / (CDF[i][1] - CDF[i - 1][1]);
    }
    return 100;
  }
  function eAtPct(p) {
    for (var i = 1; i < CDF.length; i++) {
      if (p <= CDF[i][0]) return CDF[i - 1][1] + (CDF[i][1] - CDF[i - 1][1]) * (p - CDF[i - 1][0]) / (CDF[i][0] - CDF[i - 1][0]);
    }
    return CDF[CDF.length - 1][1];
  }
  /* 部署（附录 A） */
  var DEPLOY = { hz: 50, delayLo: 18, delayHi: 30, lowHz: 500 };
  /* v1 的几个数：定期重置的消融（D250 上的速度误差）、历史 25 步 */
  var V1 = { resetVel: 0.1891, noResetVel: 0.2545, hist: 25 };

  // ─── 本笔记的复现：用 ASAP 开源的 SMPL → G1 重定向脚本，在 AMASS 的 CMU 上重算的动作 ─────────
  /* 例 1：14 对点的平均残差（mm），整段 30 fps */
  var RESID = [['大步走', '08_07', 34.8], ['挥手', '141_16', 31.6], ['Macarena', '143_35', 25.3], ['小鸡舞', '143_34', 25.8], ['扭摆舞', '141_12', 33.9],
    ['开合跳 / 扭腰 / 弯腰 / 下蹲', '13_29', 53.4], ['侧手翻', '49_06', 35.7], ['侧手翻接后空翻', '88_05', 45.2], ['跳起踢腿转身', '87_01', 33.0]];
  /* 大步走 08_07：15 fps 共 38 帧。每帧 65 个小端 int16：骨盆位置 3（mm）、横滚俯仰偏航 3（mrad，外旋 xyz）、23 个关节角（mrad）、
     12 个关键点（mm；顺序见 KP_ZH，用 ASAP 的 MJCF 做正运动学）。第一帧骨盆挪到原点、整段水平位移转到 +x；
     ASAP 的重定向保留 SMPL 的根部高度，G1 的腿和人比例不同，脚会离地或陷进地里，所以每帧把网格最低点贴到地面（大步走、Macarena、扭摆舞、弯腰下蹲都这样修过） */
  var WALK = { clip: '08_07', fps: 15, n: 38, per: 65, data: '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' };
  var KP_ZH = ['左肩', '左肘', '左手', '右肩', '右肘', '右手', '左髋', '左膝', '左踝', '右髋', '右膝', '右踝'];
  var KP_UPPER = [0, 1, 2, 3, 4, 5];
  /* 挥手 141_16 的第 0.5–3.5 s：15 fps 共 45 帧。每帧 89 个 int16：G1 骨盆 3、14 个 G1 上的点 42、缩放到 G1 身材的 SMPL 关节 42
     （14 对：骨盆、左髋、左膝、左踝、右髋、右膝、右踝、左肩、左肘、左手、右肩、右肘、右手、头）、SMPL 人体骨盆的水平位置 2（mm） */
  var WAVE = { clip: '141_16', fps: 15, n: 45, per: 89, data: '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' };
  var PAIR_ZH = ['骨盆', '左髋', '左膝', '左踝', '右髋', '右膝', '右踝', '左肩', '左肘', '左手', '右肩', '右肘', '右手', '头'];
  /* 贴图表：R 像素/米，yaw / pitch 是正交相机，cw × ch 一格，(ax, ay) 是骨盆正下方地面点在格子里的位置 */
  var SHEETS = {
    walk: { file: 'g1_walk.webp', R: 240, yaw: 0.4, pitch: 0.12, cw: 295, ch: 335, cols: 10, n: 38, ax: 141.0, ay: 325.0 },
    wave: { file: 'g1_wave.webp', R: 240, yaw: 1.1, pitch: 0.1, cw: 179, ch: 358, cols: 10, n: 45, ax: 73.0, ay: 351.0 },
    smpl: { file: 'smpl_wave.webp', R: 240, yaw: 1.1, pitch: 0.1, cw: 241, ch: 436, cols: 10, n: 45, ax: 112.5, ay: 432.5 },
    macarena: { file: 'g1_macarena.webp', R: 150, yaw: 1.1, pitch: 0.1, cw: 115, ch: 209, cols: 12, n: 45, ax: 31.0, ay: 201.5 },
    chicken: { file: 'g1_chicken.webp', R: 150, yaw: 1.1, pitch: 0.1, cw: 134, ch: 208, cols: 12, n: 45, ax: 37.5, ay: 200.0 },
    sidetwist: { file: 'g1_sidetwist.webp', R: 150, yaw: 1.1, pitch: 0.1, cw: 179, ch: 205, cols: 12, n: 45, ax: 82.0, ay: 197.5 },
    flip: { file: 'g1_flip.webp', R: 150, yaw: 0.3, pitch: 0.1, cw: 251, ch: 309, cols: 12, n: 38, ax: 120.5, ay: 303.0 }
  };
  function decode(b64) {
    var bin = atob(b64), n = bin.length >> 1, out = new Int16Array(n);
    for (var i = 0; i < n; i++) out[i] = (bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8)) << 16 >> 16;
    return out;
  }
  function pts(a, o, n) {
    var r = [];
    for (var j = 0; j < n; j++) r.push([a[o + 3 * j] / 1000, a[o + 3 * j + 1] / 1000, a[o + 3 * j + 2] / 1000]);
    return r;
  }
  var WALK_RAW = null, WALK_F = [];
  function walkFrame(i) {
    var k = clamp(Math.round(i), 0, WALK.n - 1);
    if (!WALK_F[k]) {
      if (!WALK_RAW) WALK_RAW = decode(WALK.data);
      var a = WALK_RAW, o = k * WALK.per, dof = [];
      for (var j = 0; j < 23; j++) dof.push(a[o + 6 + j] / 1000);
      WALK_F[k] = { k: k, root: [a[o] / 1000, a[o + 1] / 1000, a[o + 2] / 1000], rpy: [a[o + 3] / 1000, a[o + 4] / 1000, a[o + 5] / 1000],
        dof: dof, kp: pts(a, o + 29, 12) };
    }
    return WALK_F[k];
  }
  var WAVE_RAW = null, WAVE_F = [];
  function waveFrame(i) {
    var k = clamp(Math.round(i), 0, WAVE.n - 1);
    if (!WAVE_F[k]) {
      if (!WAVE_RAW) WAVE_RAW = decode(WAVE.data);
      var a = WAVE_RAW, o = k * WAVE.per;
      WAVE_F[k] = { k: k, root: [a[o] / 1000, a[o + 1] / 1000, a[o + 2] / 1000], g1: pts(a, o + 3, 14), hum: pts(a, o + 45, 14),
        smplRoot: [a[o + 87] / 1000, a[o + 88] / 1000] };
    }
    return WAVE_F[k];
  }
  function dist3(p, q) { return Math.sqrt((p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]) + (p[2] - q[2]) * (p[2] - q[2])); }
  /* 例 1：挥手这一段 14 对点的平均距离（m） */
  function waveResidual() {
    var s = 0, per = PAIR_ZH.map(function () { return 0; });
    for (var k = 0; k < WAVE.n; k++) {
      var f = waveFrame(k);
      f.g1.forEach(function (p, i) { var d = dist3(p, f.hum[i]); s += d; per[i] += d; });
    }
    return { mean: s / (WAVE.n * 14), per: per.map(function (v) { return v / WAVE.n; }) };
  }
  /* 局部关键点：减去骨盆、转到只转偏航的机器人坐标系（例 2） */
  function localKp(f) {
    var c = Math.cos(f.rpy[2]), s = Math.sin(f.rpy[2]), r = f.root;
    return f.kp.map(function (p) {
      var dx = p[0] - r[0], dy = p[1] - r[1];
      return [c * dx + s * dy, -s * dx + c * dy, p[2] - r[2]];
    });
  }
  /* 例 3：机器人的姿态和参考一样，水平位移只有参考的 ratio 倍（假设）；period > 0 时每隔 period 秒把关键点拉回机器人的坐标系。
     返回每个关键点落后的距离（m）、36 维误差的长度、关键点奖励 2·exp(−|Δp|) */
  function lagAt(k, ratio, period) {
    var f = walkFrame(k), k0 = 0;
    if (period > 0) k0 = Math.floor(k / (period * WALK.fps)) * Math.round(period * WALK.fps);
    var f0 = walkFrame(Math.min(k0, k));
    var dx = (1 - ratio) * (f.root[0] - f0.root[0]), dy = (1 - ratio) * (f.root[1] - f0.root[1]);
    var lag = Math.sqrt(dx * dx + dy * dy), norm = lag * Math.sqrt(DIM.keypoints);
    return { lag: lag, norm: norm, reward: T1[1][2] * Math.exp(-norm), dx: dx, dy: dy };
  }
  /* 这段走路的平均速度（15 fps 相邻帧差分，水平） */
  function walkSpeed() {
    var s = 0;
    for (var k = 1; k < WALK.n; k++) {
      var a = walkFrame(k - 1).root, b = walkFrame(k).root;
      s += Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]));
    }
    return s * WALK.fps / (WALK.n - 1);
  }
  /* 例 4：表 I 按字面算一步（errs 是假设的误差）；dirMode 'lit' 用 cos，'fix' 用 1 − cos（我们的推测） */
  var EX4 = { dq: 0.30, dp: 0.10, dv: 0.10, angDeg: 10, drp: 0.05, dy: 0.10 };
  function rewardTerms(e, dirMode) {
    var cosA = Math.cos(e.angDeg * Math.PI / 180);
    var dir = dirMode === 'fix' ? Math.exp(-4 * (1 - cosA)) : Math.exp(-4 * cosA);
    return [3 * Math.exp(-0.7 * e.dq), 2 * Math.exp(-e.dp), 6 * Math.exp(-4 * e.dv), 6 * dir, Math.exp(-e.drp), Math.exp(-e.dy)];
  }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }

  // ─── 讲解动画：十八幕 ───────────────────────────────────────────────────────
  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    paint = K.paint,
    seg = K.seg,
    ease = K.ease,
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
  /* 全片配色：表达目标（关节角、关键点）黄、移动目标（速度、姿态）紫、ExBody2 绿、参考 / 全局目标红、局部蓝 */
  var C_EXP = C_WARN, C_MOV = C_PURPLE, C_OURS = C_GOOD, C_REF = C_BAD, C_LOC = C_ACCENT;

  /* 视频里一幕要讲一分钟左右：draw(t, clock) 的 clock 是这一幕的真实时间（旁白比分镜长时 t 停在一段的末尾，clock 照走），
     G1 的动作和片段按 clock 播；网页播放器只传 t。各幕的 cue 都落在 0.4 / 3.6 / 7.0 / 10.4 / 13.4 */
  function nowOf(t, clock) {
    return clock == null ? t : clock;
  }
  /* 一段窗口：a 之后 0.3 s 起淡入 0.4 s，到 b 才开始淡出 0.3 s（AGENTS.md「面板到 cue 之后才淡出」） */
  function win(t, a, b) {
    return seg(t, a + 0.3, a + 0.7) * (b == null ? 1 : 1 - seg(t, b, b + 0.3));
  }
  var CUES = [0.4, 3.6, 7.0, 10.4, 13.4];
  /* 五块面板依次占一个 cue 段 */
  function panels(t, list) {
    list.forEach(function (p, i) { if (p) setOpacity(p, win(t, i ? CUES[i] : 0.3, i < 4 ? CUES[i + 1] : null)); });
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
  function dotAt(parent, cx, cy, r, color, stroke) {
    var c = paint(svgEl('circle', { cx: cx, cy: cy, r: r, 'stroke-width': stroke ? 1.2 : 0 }), color, stroke || null);
    parent.appendChild(c);
    return c;
  }
  function moveDot(c, p) {
    c.setAttribute('cx', p[0].toFixed(1));
    c.setAttribute('cy', p[1].toFixed(1));
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
  function arrow(parent, color, width, dash) {
    var g = group(parent), l = hline(g, 0, 0, 0, 0, color, width || 2.4, dash), h = arrowHead(g, color);
    return {
      g: g,
      set: function (x1, y1, x2, y2, size) { setLine(l, x1, y1, x2, y2); h.set(x1, y1, x2, y2, size || 9); }
    };
  }
  /* 论文图的一块：图片 imgW × imgH，按比例裁出 (u0, v0)–(u1, v1)，宽 w 摆到 (x, y)，白底；返回实际高 */
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
    fig1: ['fig1_teaser.webp', 1800, 1319],
    fig2: ['fig2_pipeline.webp', 2600, 817],
    fig5: ['fig5_chacha.webp', 1800, 1522],
    fig6: ['fig6_multisource.webp', 2200, 1480],
    fig7: ['fig7_results.webp', 1800, 801]
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
  function camOf(key, s, ox, oy, cx, cy) {
    var M = SHEETS[key];
    return { yaw: M.yaw, pitch: M.pitch, s: s, ox: ox, oy: oy, cx: cx || 0, cy: cy || 0 };
  }
  /* 一台 G1（或 SMPL 人体）：贴图表里的一格；put(root, cam, 帧号) 摆到骨盆正下方的地面点；at(ox, oy, s, 帧号) 直接摆到画布上一点。
     贴图第一次用到才设 href */
  function sprite(parent, key, opts) {
    var o = opts || {}, M = SHEETS[key], g = group(parent), rows = Math.ceil(M.n / M.cols);
    g.setAttribute('class', 'demo-x-g1mesh');
    var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: 0, height: 0 });
    var img = svgEl('image', { x: 0, y: 0, width: M.cw * M.cols, height: M.ch * rows, preserveAspectRatio: 'none' });
    box.appendChild(img);
    g.appendChild(box);
    if (o.ghost) g.style.opacity = o.ghost;
    var woke = false, lastF = -1;
    function place(x, y, s, fr) {
      if (!woke && G1_3D_BASE) { woke = true; img.setAttribute('href', G1_3D_BASE + M.file); }
      var k = s / M.R, f = ((Math.round(fr || 0) % M.n) + M.n) % M.n;
      box.setAttribute('x', (x - M.ax * k).toFixed(1));
      box.setAttribute('y', (y - M.ay * k).toFixed(1));
      box.setAttribute('width', (M.cw * k).toFixed(1));
      box.setAttribute('height', (M.ch * k).toFixed(1));
      if (f !== lastF) {
        box.setAttribute('viewBox', [(f % M.cols) * M.cw, Math.floor(f / M.cols) * M.ch, M.cw, M.ch].join(' '));
        lastF = f;
      }
    }
    return {
      g: g,
      put: function (root, cam, fr) { var a = project([root[0], root[1], 0], cam); place(a[0], a[1], cam.s, fr); },
      at: place
    };
  }
  /* 帧号：按真实时间循环播放 */
  function loopFrame(now, n, fps, start) {
    return ((Math.floor((start || 0) + now * (fps || 15)) % n) + n) % n;
  }
  /* 原地的动作（Macarena、左右扭腰、小鸡舞）来回播：放到最后一帧再倒着放，首尾不会突然跳一下 */
  function pingFrame(now, n, fps) {
    var k = loopFrame(now, 2 * n - 2, fps);
    return k < n ? k : 2 * n - 2 - k;
  }
  /* 地上的刻度：每 0.5 m 一道，随骨盆后退，表示在往前走 */
  function groundTicks(parent, x1, x2, y) {
    var g = group(parent);
    hline(g, x1, y, x2, y, C_BORDER, 1.4);
    var ticks = [];
    for (var i = 0; i < 11; i++) ticks.push(hline(g, 0, 0, 0, 0, C_BORDER, 2));
    return {
      g: g,
      put: function (root, cam) {
        var base = Math.round(root[0] / 0.5) * 0.5;
        ticks.forEach(function (tk, i) {
          var p = project([base + (i - 5) * 0.5, root[1], 0], cam);
          var on = p[0] > x1 + 4 && p[0] < x2 - 10;
          setLine(tk, p[0], y, p[0] + 9, y + 5);
          tk.style.opacity = on ? 1 : 0;
        });
      }
    };
  }
  /* 横向条形图的一行：标签、条、数字 */
  function barRowAt(parent, x, y, labelW, str, color, h, size) {
    var g = group(parent);
    rich(g, x + labelW - 8, y + (h || 14) / 2 + 4, str, size || 10.5, 'demo-x-ink2', 'end');
    var b = hbar(g, x + labelW, y, h || 14, color);
    var v = label(g, x + labelW + 6, y + (h || 14) / 2 + 4, '', 'demo-x-ink', size || 10.5);
    return {
      g: g, bar: b,
      set: function (w, txt) { setW(b, w); v.setAttribute('x', (x + labelW + Math.max(0, w) + 6).toFixed(1)); v.textContent = txt; }
    };
  }
  /* 竖直柱状图：values（可为 null）、颜色；返回 set(进度 0..1) 让柱子长出来 */
  function vbars(parent, x, y, w, h, values, colors, opts) {
    var o = opts || {}, g = group(parent), n = values.length, gap = o.gap || 10, bw = (w - gap * (n + 1)) / n;
    var max = o.max || Math.max.apply(null, values.filter(function (v) { return v != null; })), min = o.min || 0;
    hline(g, x, y + h, x + w, y + h, C_BORDER, 1.2);
    var bars = values.map(function (v, i) {
      var bx = x + gap + i * (bw + gap);
      var r = paint(svgEl('rect', { x: bx.toFixed(1), y: y + h, width: bw.toFixed(1), height: 0, rx: 3 }), colors[i] || C_ACCENT);
      g.appendChild(r);
      var t = label(g, bx + bw / 2, y + h - 4, '', 'demo-x-ink', o.vsize || 10.5, 'middle');
      if (o.names) rich(g, bx + bw / 2, y + h + 15, o.names[i], o.nsize || 10, 'demo-x-ink2', 'middle');
      return { r: r, t: t, v: v };
    });
    return {
      g: g,
      set: function (p) {
        bars.forEach(function (b) {
          if (b.v == null) { b.t.textContent = ''; return; }
          var hh = h * clamp((b.v - min) / (max - min), 0, 1) * clamp(p, 0, 1);
          b.r.setAttribute('y', (y + h - hh).toFixed(1));
          b.r.setAttribute('height', hh.toFixed(1));
          b.t.setAttribute('y', (y + h - hh - 5).toFixed(1));
          b.t.textContent = p > 0.95 ? (o.fmt ? o.fmt(b.v) : String(b.v)) : '';
        });
      }
    };
  }
  /* 表里的数照论文写四位小数 */
  function f4(x) { return x.toFixed(4); }
  function f3(x) { return x.toFixed(3); }
  function f2(x) { return x.toFixed(2); }
  function f1(x) { return x.toFixed(1); }
  function pct(a, b) { return ((b - a) / a * 100); }
  function sgn(s) { return String(s).replace(/-/g, '−'); }

  /* ── scene 1: 表现力和稳定，要兼得 ── */
  function buildSceneProblem() {
    var s = sceneSvg('左边是项目页视频：一台 G1 和人牵着手跳华尔兹；右边依次出现：要做的动作、人和机器人的身体不一样（蓝色 SMPL 人体与 G1 并排挥手）、论文图 1 的六个真机例子、论文信息、要回答的问题');
    s.appendChild(svgText(24, 26, '真实的人形机器人：要像人，又不能倒', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'waltz', 28, 46, 352, 198, '项目页视频（真机，原速）：G1 牵着人的手跳华尔兹');
    var bal = group(s);
    rectBox(bal, 28, 278, 352, 118, C_BORDER, C_SURFACE2);
    chip(bal, 44, 296, 140, '**表现力**：像人', C_EXP, { size: 12.5, h: 32 });
    chip(bal, 224, 296, 140, '**稳定**：不倒', C_OURS, { size: 12.5, h: 32 });
    var ab = arrow(bal, C_MUTED, 2); ab.set(190, 312, 218, 312, 7);
    var ab2 = arrow(bal, C_MUTED, 2); ab2.set(218, 312, 190, 312, 7);
    label(bal, 204, 352, '动作越大越像人，越容易摔', 'demo-x-ink2', 12, 'middle');
    label(bal, 204, 376, '控制器要在两者之间取舍', 'demo-x-mut', 11, 'middle');
    var R = 404, W = 372;
    var p1 = group(s);
    label(p1, R, 64, '想让机器人照着人体动作做：', 'demo-x-ink', 13.5);
    ['跳舞', '出拳', '蹲下', '大步走', '挥手', '侧步'].forEach(function (n, i) {
      chip(p1, R + (i % 3) * 124, 82 + Math.floor(i / 3) * 40, 116, n, C_EXP, { size: 12.5 });
    });
    label(p1, R, 192, '能走、能跑已经不难；难的是', 'demo-x-ink2', 12);
    label(p1, R, 214, '全身都像人一样动，同时稳稳地站住', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 64, '难处一：人和机器人的身体不一样', 'demo-x-ink', 13.5);
    rectBox(p2, R, 76, W, 250, C_BORDER, C_SURFACE2);
    var hum = sprite(p2, 'smpl'), bot = sprite(p2, 'wave');
    label(p2, R + 100, 318, '人（SMPL 人体）', 'demo-x-mut', 10.5, 'middle');
    label(p2, R + 270, 318, 'Unitree G1 · 23 个自由度', 'demo-x-mut', 10.5, 'middle');
    label(p2, R, 352, '动力学、运动学都有差距：腿长、关节限位、', 'demo-x-ink2', 12);
    label(p2, R, 374, '电机力矩……人能做的，机器人不一定做得到', 'demo-x-ink2', 12);
    var p3 = group(s);
    var f1 = paperPart(p3, 'fig1', 0, 0, 1, 1, R + 40, 50, 292);
    label(p3, R + 186, 50 + f1.h + 20, '论文图 1：(a) 大步走 (b) 43 秒长舞 (c) 侧步', 'demo-x-mut', 10.5, 'middle');
    label(p3, R + 186, 50 + f1.h + 38, '(d) 不同高度出拳 (e) 上身动作 (f) 右勾拳', 'demo-x-mut', 10.5, 'middle');
    var p4 = group(s);
    label(p4, R, 64, 'ExBody2', 'demo-x-ink', 20);
    label(p4, R, 88, 'Advanced Expressive Humanoid Whole-Body Control', 'demo-x-ink2', 11.5);
    chip(p4, R, 106, 112, 'UC San Diego', C_ACCENT, { size: 11.5 });
    chip(p4, R + 122, 106, 112, 'UC Berkeley', C_ACCENT, { size: 11.5 });
    chip(p4, R + 244, 106, 60, 'MIT', C_ACCENT, { size: 11.5 });
    label(p4, R, 164, 'arXiv 2412.13196（v1 2024-12，v2 2025-03）', 'demo-x-ink2', 12);
    label(p4, R, 188, '本片按 v2 讲；v2 和 v1 的主线、数字都不一样', 'demo-x-mut', 11.5);
    label(p4, R, 220, '平台：Unitree G1，仿真 Isaac Gym', 'demo-x-ink2', 12);
    label(p4, R, 244, '官方没有开源代码', 'demo-x-bad', 12);
    label(p4, R, 268, '同一组作者的前作：ExBody（只跟上半身）', 'demo-x-mut', 11.5);
    var p5 = group(s);
    label(p5, R, 64, '要回答的问题：', 'demo-x-ink', 13.5);
    rectBox(p5, R, 80, W, 66, C_OURS, C_SURFACE);
    label(p5, R + 16, 108, '一个策略，跟任意的人体参考动作，', 'demo-x-ink', 13);
    label(p5, R + 16, 132, '在真机上全身都做出来，又像又稳', 'demo-x-ink', 13);
    label(p5, R, 178, '三条做法：', 'demo-x-ink2', 12);
    chip(p5, R, 190, W, '① 自动筛掉下半身做不到的动作 → **通才**', C_OURS, { size: 11.5, left: true });
    chip(p5, R, 226, W, '② 在一小组动作上微调 → **专才**', C_OURS, { size: 11.5, left: true });
    chip(p5, R, 262, W, '③ 关键点在机器人坐标系里跟，全局交给**速度**', C_OURS, { size: 11.5, left: true });
    function draw(t, clock) {
      var now = nowOf(t, clock);
      clip.at(K.clipSince(t, 0), true);
      var fw = loopFrame(now, WAVE.n, WAVE.fps);
      hum.at(R + 100, 300, 120, fw);
      bot.at(R + 270, 300, 120, fw);
      setOpacity(bal, seg(t, 3.9, 4.3));
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 前人卡在哪 ── */
  function buildScenePrior() {
    var s = sceneSvg('上面三张卡片依次点亮：ExBody 只跟上半身（G1 挥手，上身的点亮着、腿灰着）；挑数据（Macarena 与侧手翻接后空翻两段 G1）；全局关键点（红点跑到机器人前面）；下面的文字依次讲三件事、三条做法与对比的基线');
    s.appendChild(svgText(24, 26, '前人卡在三处：只跟上身、数据难挑、全局关键点', 'demo-x-ink2', 13.5));
    var cards = [], CW = 240, CY = 40, CH = 196;
    ['ExBody：只跟上半身', '数据：怎么挑', 'H2O / OmniH2O：全局关键点'].forEach(function (tt, i) {
      var g = group(s), x = 24 + i * (CW + 12);
      rectBox(g, x, CY, CW, CH, C_BORDER, C_SURFACE2);
      label(g, x + CW / 2, CY + 20, tt, 'demo-x-ink', 12.5, 'middle');
      cards.push({ g: g, x: x });
    });
    /* 卡片 1：挥手的 G1，上身 6 个点亮（黄）、腿上的点灰 */
    var c1 = cards[0], wv = sprite(c1.g, 'wave'), dots1 = [];
    for (var i = 0; i < 14; i++) dots1.push(dotAt(c1.g, 0, 0, 3.4, i >= 7 && i <= 12 ? C_EXP : C_MUTED, C_SURFACE));
    label(c1.g, c1.x + CW / 2, CY + CH - 8, '腿只跟速度和姿态，不跟步子', 'demo-x-mut', 10.5, 'middle');
    /* 卡片 2：两段 G1 */
    var c2 = cards[1], mac = sprite(c2.g, 'macarena'), flp = sprite(c2.g, 'flip');
    chip(c2.g, c2.x + 12, CY + 34, 92, '标签「dance」', C_EXP, { size: 10.5, h: 24 });
    chip(c2.g, c2.x + 120, CY + 34, 108, '虚拟人能翻', C_REF, { size: 10.5, h: 24 });
    label(c2.g, c2.x + CW / 2, CY + CH - 8, '真机能不能做，标签和虚拟人都说不准', 'demo-x-mut', 10, 'middle');
    /* 卡片 3：全局关键点跑在前面 */
    var c3 = cards[2], wk = sprite(c3.g, 'walk'), tgt = [], errL = [];
    for (var j = 0; j < 12; j++) { errL.push(hline(c3.g, 0, 0, 0, 0, C_REF, 1, '3 2')); tgt.push(dotAt(c3.g, 0, 0, 3, C_REF)); }
    label(c3.g, c3.x + CW / 2, CY + CH - 8, '落后 0.3 m：每个红点都差 0.3 m', 'demo-x-mut', 10.5, 'middle');
    var Y = 258, p1 = group(s);
    label(p1, 24, Y + 14, 'ExBody（同一组作者的前作）：', 'demo-x-ink', 13.5);
    label(p1, 24, Y + 40, '上半身照着人做（关节角 + 6 个关键点），腿只跟根部的速度、横滚俯仰、偏航和高度', 'demo-x-ink2', 12);
    label(p1, 24, Y + 64, '全身跟会过度约束，所以它把腿放开了；代价是步子不像人', 'demo-x-mut', 11.5);
    var p2 = group(s);
    label(p2, 24, Y + 14, '数据：动捕里有很多机器人做不到的动作', 'demo-x-ink', 13.5);
    label(p2, 24, Y + 40, 'ExBody 按文字标签挑：「dance」这种词太含糊，照样混进做不到的动作', 'demo-x-ink2', 12);
    label(p2, 24, Y + 64, 'H2O / OmniH2O 用 SMPL 虚拟人在仿真里筛：虚拟人做得到，真机不一定', 'demo-x-ink2', 12);
    var p3 = group(s);
    label(p3, 24, Y + 14, '跟踪方式：H2O、OmniH2O 跟全局关键点', 'demo-x-ink', 13.5);
    label(p3, 24, Y + 40, '机器人只要有一步没对上，所有目标都在前面，后面一直对不上', 'demo-x-ink2', 12);
    label(p3, 24, Y + 64, '论文：只能用在基本不走动的场景', 'demo-x-mut', 11.5);
    var p4 = group(s);
    label(p4, 24, Y + 14, 'ExBody2 的三条：', 'demo-x-ink', 13.5);
    chip(p4, 24, Y + 28, 236, '① 自动筛数据的**通才**', C_OURS, { size: 12 });
    chip(p4, 272, Y + 28, 236, '② 微调出的**专才**', C_OURS, { size: 12 });
    chip(p4, 520, Y + 28, 256, '③ **速度与关键点解耦** + 教师—学生', C_OURS, { size: 12 });
    label(p4, 24, Y + 90, '全身都跟（腿的关节角和关键点也跟），但不怕位置漂', 'demo-x-mut', 11.5);
    var p5 = group(s);
    label(p5, 24, Y + 14, '实验里对比的基线（都在 G1 上）：', 'demo-x-ink', 13.5);
    chip(p5, 24, Y + 28, 170, 'ExBody', C_MUTED, { size: 12 });
    chip(p5, 204, Y + 28, 170, 'ExBody†（全身版）', C_MUTED, { size: 12 });
    chip(p5, 384, Y + 28, 190, 'OmniH2O*（论文复现）', C_MUTED, { size: 12 });
    chip(p5, 584, Y + 28, 192, 'ExBody2 不筛数据', C_MUTED, { size: 12 });
    label(p5, 24, Y + 90, 'ExBody2 也在 G1 上部署；v1 还试过 21 个自由度的升级版 H1', 'demo-x-mut', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* 卡片 1 */
      var fw = loopFrame(now, WAVE.n, WAVE.fps), w = waveFrame(fw);
      var cam1 = camOf('wave', 92, c1.x + CW / 2, CY + CH - 26, w.root[0], w.root[1]);
      wv.put(w.root, cam1, fw);
      w.g1.forEach(function (p, i) { moveDot(dots1[i], project(p, cam1)); });
      /* 卡片 2 */
      /* 比例按贴图里最高的一帧定：举手、空翻时也不碰上面的两个标签 */
      mac.at(c2.x + 64, CY + CH - 26, 74, pingFrame(now, SHEETS.macarena.n, 15));
      flp.at(c2.x + 172, CY + CH - 26, 50, loopFrame(now, SHEETS.flip.n, 15));
      /* 卡片 3：机器人落后参考 0.3 m（假设），红点是参考的全局关键点 */
      var fk = loopFrame(now, WALK.n, WALK.fps), f = walkFrame(fk);
      var cam3 = camOf('walk', 92, c3.x + 92, CY + CH - 26, f.root[0], f.root[1]);
      wk.put(f.root, cam3, fk);
      f.kp.forEach(function (p, i) {
        var a = project(p, cam3), b = project([p[0] + 0.3, p[1], p[2]], cam3);
        moveDot(tgt[i], b); setLine(errL[i], a[0], a[1], b[0], b[1]);
      });
      var act = [win(t, 0.3, 3.6), win(t, 3.6, 7.0), win(t, 7.0, 10.4)];
      cards.forEach(function (c, i) { setOpacity(c.g, t < 10.4 ? 0.35 + 0.65 * act[i] : 1); });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 两步走：通才再专才（图 2） ── */
  function buildScenePipeline() {
    var s = sceneSvg('上面是论文图 2 的整条流水线，讲到哪一块就用彩色框框出哪一块：(a) 重定向、(b) 自动筛数据、(c) 专才微调、(d) 真机部署；下面的文字跟着讲，最后一段配一小段项目页的真机大步走');
    s.appendChild(svgText(24, 26, '整条流水线：通才—专才（论文图 2）', 'demo-x-ink2', 13.5));
    var fx = 24, fy = 42, fw = 752, F = paperPart(s, 'fig2', 0, 0, 1, 1, fx, fy, fw);
    var parts = [[0, 0.185, C_ACCENT], [0.185, 0.60, C_WARN], [0.185, 0.60, C_OURS], [0.60, 0.82, C_PURPLE], [0.82, 1.0, C_REF]];
    var hl = paint(svgEl('rect', { x: fx, y: fy - 2, width: 10, height: F.h + 4, rx: 6, fill: 'none', 'stroke-width': 3 }), null, C_ACCENT);
    s.appendChild(hl);
    var Y = fy + F.h + 18, p1 = group(s);
    label(p1, 24, Y + 14, '(a) 重定向：把人体动作库搬到 G1 的身体上', 'demo-x-ink', 13.5);
    label(p1, 24, Y + 40, '数据是 CMU 动捕全集（论文写 1,919 段），里面有俯卧撑、在地上打滚、空翻', 'demo-x-ink2', 12);
    rich(p1, 24, Y + 64, '先在全集上训一个初始策略 $\\pi_0$，用它给每段动作打分', 11.5, 'demo-x-mut');
    var p2 = group(s);
    label(p2, 24, Y + 14, '(b) 自动筛数据：按跟踪误差 e(s) 从易到难排好', 'demo-x-ink', 13.5);
    label(p2, 24, Y + 40, '按几档阈值取子集，各训一个策略，挑在全集上表现最好的那一档', 'demo-x-ink2', 12);
    label(p2, 24, Y + 64, '得到的就是通才', 'demo-x-mut', 11.5);
    var p3 = group(s);
    label(p3, 24, Y + 14, '背后的原则：可行性—多样性', 'demo-x-ink', 13.5);
    chip(p3, 24, Y + 28, 360, '上半身：要**多样**，各种手势、舞蹈都留着', C_EXP, { size: 12 });
    chip(p3, 396, Y + 28, 380, '下半身：要**做得到**，空翻、打滚这类去掉', C_OURS, { size: 12 });
    var p4 = group(s);
    label(p4, 24, Y + 14, '(c) 专才：在走路、跳舞、功夫这样一小组动作上，从通才接着微调', 'demo-x-ink', 13.5);
    label(p4, 24, Y + 40, '比通才更准，也比在同一组数据上从头训更准', 'demo-x-ink2', 12);
    label(p4, 24, Y + 64, '代价：每个专才只管自己那一组', 'demo-x-mut', 11.5);
    var p5 = group(s);
    label(p5, 24, Y + 14, '(d) 部署到真机 G1', 'demo-x-ink', 13.5);
    label(p5, 24, Y + 40, '大步走、街舞、出拳……', 'demo-x-ink2', 12);
    label(p5, 24, Y + 64, '策略在机载电脑上 50 Hz 推理', 'demo-x-mut', 11.5);
    var clip = projClip(p5, 'stride', 580, Y - 4, 196, 110, '');
    label(p5, 570, Y + 100, '项目页视频（真机，原速）：大步走', 'demo-x-mut', 9.5, 'end');
    function draw(t, clock) {
      var idx = t < 3.6 ? 0 : t < 7.0 ? 1 : t < 10.4 ? 2 : t < 13.4 ? 3 : 4, P = parts[idx];
      hl.setAttribute('x', (fx + P[0] * fw).toFixed(1));
      hl.setAttribute('width', ((P[1] - P[0]) * fw).toFixed(1));
      hl.style.stroke = P[2];
      setOpacity(hl, seg(t, 0.4, 0.8));
      panels(t, [p1, p2, p3, p4, p5]);
      clip.at(K.clipSince(t, 13.4), t > 13.4);
      void clock;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 人的动作搬到 G1 ── */
  function buildSceneRetarget() {
    var s = sceneSvg('左边：同一段挥手，蓝色的 SMPL 人体和重定向出来的 G1 并排；第二步起 G1 身上叠出 14 对点：蓝点是 G1 上的点，橙点是缩放到 G1 身材的人体关节，红线连着每一对；右边依次是论文的那一句、我们的复现步骤、残差、运动学看不出可不可行、G1 的 23 个自由度');
    s.appendChild(svgText(24, 26, '人的动作搬到 G1：论文只写了一句', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 420, 360, C_BORDER, C_SURFACE2);
    var GY = 372, SC = 172;
    hline(left, 40, GY, 428, GY, C_BORDER, 1.4);
    var hum = sprite(left, 'smpl'), bot = sprite(left, 'wave');
    label(left, 130, 58, 'SMPL 人体（形状参数取 0）', 'demo-x-mut', 10.5, 'middle');
    label(left, 330, 58, 'G1（ASAP 的流程重定向）', 'demo-x-mut', 10.5, 'middle');
    var pairG = group(left), pairL = PAIR_ZH.map(function () { return hline(pairG, 0, 0, 0, 0, C_REF, 1.4); });
    var gD = PAIR_ZH.map(function () { return dotAt(pairG, 0, 0, 3.2, C_LOC, C_SURFACE); });
    var hD = PAIR_ZH.map(function () { return dotAt(pairG, 0, 0, 3.2, C_EXP, C_SURFACE); });
    /* 放大镜：几厘米的残差在 172 px/m 下只有几个像素，右肘（这段里相距最远的一对）放大 3 倍看 */
    var MAG = { c: [244, 122], r: 38, k: 3, i: PAIR_ZH.indexOf('右肘') };
    var mag = group(left);
    var magLead = hline(mag, 0, 0, 0, 0, C_MUTED, 1, '2 2');
    mag.appendChild(paint(svgEl('circle', { cx: MAG.c[0], cy: MAG.c[1], r: MAG.r, 'stroke-width': 1.4 }), C_SURFACE, C_MUTED));
    var magL = hline(mag, 0, 0, 0, 0, C_REF, 2), magG = dotAt(mag, 0, 0, 5, C_LOC, C_SURFACE), magH = dotAt(mag, 0, 0, 5, C_EXP, C_SURFACE);
    var magT = label(mag, MAG.c[0], MAG.c[1] - MAG.r - 7, '', 'demo-x-ink2', 10, 'middle');
    var R = 464, W = 312;
    var p1 = group(s);
    label(p1, R, 64, '论文：把人体动作适配到', 'demo-x-ink', 13.5);
    label(p1, R, 86, '机器人的形态上（图 2 (a)）', 'demo-x-ink', 13.5);
    var f7 = paperPart(p1, 'fig7', 0.668, 0, 1, 0.49, R + 20, 104, 272);
    label(p1, R, 104 + f7.h + 22, '附录图 7：SMPL 参考 → 仿真 → 真机', 'demo-x-mut', 10.5);
    label(p1, R, 104 + f7.h + 42, '怎么重定向、对齐哪些点，论文都没写', 'demo-x-bad', 11);
    var p2 = group(s);
    label(p2, R, 64, '我们的复现（不是论文的做法）', 'demo-x-ink', 13.5);
    label(p2, R, 88, '用 ASAP 开源的 SMPL → G1 脚本：', 'demo-x-ink2', 12);
    chip(p2, R, 100, W, '① 拟合 SMPL 的形状和缩放：14 对点对上', C_EXP, { size: 11.5, left: true });
    chip(p2, R, 136, W, '② 逐帧梯度下降，解 23 个关节角', C_LOC, { size: 11.5, left: true });
    chip(p2, R, 172, W, '③ 截断到关节限位，整段贴地', C_MUTED, { size: 11.5, left: true });
    label(p2, R, 228, '数据：AMASS 里的 CMU 动作', 'demo-x-mut', 11);
    label(p2, R, 248, '（这段是 141_16 的挥手）', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, '对得怎么样：14 对点的距离', 'demo-x-ink', 13.5);
    var res = waveResidual();
    var big = label(p3, R, 104, '', 'demo-x-ink', 22);
    big.textContent = '平均 ' + f1(res.mean * 1000) + ' mm';
    var order = res.per.map(function (v, i) { return [v, i]; }).sort(function (a, b) { return b[0] - a[0]; });
    var resBars = order.slice(0, 4).concat(order.slice(-2)).map(function (o, j) {
      var b = barRowAt(p3, R, 124 + j * 24, 56, PAIR_ZH[o[1]], j < 4 ? C_REF : C_OURS, 15);
      return { b: b, v: o[0] };
    });
    label(p3, R, 282, '肩、肘差得最多：G1 的手臂比例和人不同', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 64, '运动学看不出做不做得到', 'demo-x-ink', 13.5);
    var flp = sprite(p4, 'flip');
    var rows = [['大步走', 34.8, C_OURS], ['挥手', 31.6, C_OURS], ['侧手翻', 35.7, C_REF], ['侧手翻接后空翻', 45.2, C_REF]];
    var rBars = rows.map(function (r, j) { var b = barRowAt(p4, R + 120, 200 + j * 24, 96, r[0], r[2], 15); return { b: b, v: r[1] }; });
    label(p4, R, 316, '侧手翻的残差和走路差不多：G1 照样「翻」得过去', 'demo-x-mut', 11);
    label(p4, R, 336, '能不能做，要让策略在仿真里真去跟一遍', 'demo-x-ink2', 11.5);
    var p5 = group(s);
    label(p5, R, 64, 'G1 的 23 个自由度', 'demo-x-ink', 13.5);
    [['腿', 12, C_OURS], ['腰', 3, C_EXP], ['两臂', 8, C_LOC]].forEach(function (r, j) {
      chip(p5, R, 84 + j * 40, W, r[0] + '：**' + r[1] + '** 个', r[2], { size: 12, left: true, h: 30 });
    });
    label(p5, R, 222, '附录：腰部 3 个都跟；两臂各 4 个是我们按', 'demo-x-mut', 11);
    label(p5, R, 242, '23 − 12 − 3 推的（G1 的手腕 6 个锁住）', 'demo-x-mut', 11);
    label(p5, R, 274, '动作是 23 个关节的 PD 目标角', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock), fw = loopFrame(now, WAVE.n, WAVE.fps), w = waveFrame(fw);
      var camH = camOf('smpl', SC, 130, GY, w.smplRoot[0], w.smplRoot[1]);
      var camR = camOf('wave', SC, 330, GY, w.root[0], w.root[1]);
      hum.put(w.smplRoot, camH, fw);
      bot.put(w.root, camR, fw);
      w.g1.forEach(function (p, i) {
        var a = project(p, camR), b = project(w.hum[i], camR);
        setLine(pairL[i], a[0], a[1], b[0], b[1]); moveDot(gD[i], a); moveDot(hD[i], b);
      });
      setOpacity(pairG, seg(t, 3.9, 4.5));
      setOpacity(bot.g, 1 - 0.45 * seg(t, 3.9, 4.5));
      var ga = project(w.g1[MAG.i], camR), hb = project(w.hum[MAG.i], camR), mid = [(ga[0] + hb[0]) / 2, (ga[1] + hb[1]) / 2];
      var dx = mid[0] - MAG.c[0], dy = mid[1] - MAG.c[1], dl = Math.sqrt(dx * dx + dy * dy) || 1;
      setLine(magLead, mid[0], mid[1], MAG.c[0] + dx / dl * MAG.r, MAG.c[1] + dy / dl * MAG.r);
      var g2 = [MAG.c[0] + (ga[0] - mid[0]) * MAG.k, MAG.c[1] + (ga[1] - mid[1]) * MAG.k], h2 = [MAG.c[0] + (hb[0] - mid[0]) * MAG.k, MAG.c[1] + (hb[1] - mid[1]) * MAG.k];
      setLine(magL, g2[0], g2[1], h2[0], h2[1]); moveDot(magG, g2); moveDot(magH, h2);
      magT.textContent = '右肘放大 3 倍：相距 ' + f1(dist3(w.g1[MAG.i], w.hum[MAG.i]) * 1000) + ' mm';
      setOpacity(mag, seg(t, 4.6, 5.2) * (1 - seg(t, 13.4, 13.7)));
      var pb = seg(t, 7.4, 8.2);
      resBars.forEach(function (r) { r.b.set(r.v * 1000 * 2.8 * pb, f1(r.v * 1000) + ' mm'); });
      var pr = seg(t, 10.8, 11.6);
      rBars.forEach(function (r) { r.b.set(r.v * 1.6 * pr, f1(r.v) + ' mm'); });
      flp.at(R + 52, 290, 54, loopFrame(now, SHEETS.flip.n, 15));
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: 特权教师看什么 ── */
  function buildSceneTeacher() {
    var s = sceneSvg('左边：G1 大步走，身上 12 个黄点是我们假设的关键点，紫箭头是根部速度；右边依次出现教师的三块输入（特权 62 维、本体感受 75 维、跟踪目标 69 维）、网络与 PPO、项目页的仿真片段');
    s.appendChild(svgText(24, 26, '特权教师：仿真里什么都看得见', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 360, 360, C_BORDER, C_SURFACE2);
    var GY = 368, SC = 150;
    var ground = groundTicks(left, 40, 368, GY), bot = sprite(left, 'walk');
    var vArr = arrow(left, C_MOV, 3);
    var kpD = KP_ZH.map(function () { return dotAt(left, 0, 0, 4, C_EXP, C_SURFACE); });
    label(left, 204, 58, '黄点：12 个关键点（论文没写是哪 12 个，我们的推测）', 'demo-x-mut', 10.5, 'middle');
    var R = 404, W = 372;
    function parts(g, y, list, color, total) {
      var x = R;
      /* 每块先给 76 宽放得下字，剩下的按维数分；块多了就分两排 */
      var rowsOf = list.length > 3 ? [list.slice(0, 3), list.slice(3)] : [list];
      rowsOf.forEach(function (row, r) {
        var sub = row.reduce(function (a, p) { return a + p[1]; }, 0), free = W - 76 * row.length;
        x = R;
        row.forEach(function (p) {
          var w = 76 + free * p[1] / sub;
          chip(g, x, y + r * 36, w - 6, p[0] + ' ' + p[1], color, { size: 10.5, h: 28 });
          x += w;
        });
      });
      return y + (rowsOf.length - 1) * 36;
    }
    var p1 = group(s);
    rich(p1, R, 64, '特权信息 $p_t$：**62** 维，只有仿真里有', 13.5, 'demo-x-ink');
    var y1 = parts(p1, 80, PRIV_PARTS, C_REF, DIM.priv);
    label(p1, R, y1 + 54, '真实的根速度、真实的关键点位置', 'demo-x-ink2', 12);
    label(p1, R, y1 + 76, '正文还说有摩擦系数、电机强度（表里没列）', 'demo-x-mut', 11);
    var p2 = group(s);
    rich(p2, R, 64, '本体感受 $o_t$：**75** 维，真机也拿得到', 13.5, 'demo-x-ink');
    var yy = parts(p2, 80, PROP_PARTS, C_LOC, DIM.prop);
    label(p2, R, yy + 54, '姿态来自 IMU；教师看几步历史论文没写', 'demo-x-mut', 11);
    var p3 = group(s);
    rich(p3, R, 64, '跟踪目标 $g_t$：**69** 维', 13.5, 'demo-x-ink');
    var y3 = parts(p3, 80, GOAL_PARTS, C_EXP, DIM.goal);
    label(p3, R, y3 + 54, '全身的关节角和关键点都跟（ExBody 只跟上身）', 'demo-x-ink2', 12);
    label(p3, R, y3 + 82, '哪 12 个点论文没写。我们推测（左边黄点）：', 'demo-x-ink2', 11.5);
    chip(p3, R, y3 + 92, 180, 'ExBody 跟的：两肩、两肘、两手', C_EXP, { size: 11, h: 26 });
    chip(p3, R + 192, y3 + 92, 180, '+ 两髋、两膝、两踝', C_EXP, { size: 11, h: 26, dash: '4 3' });
    label(p3, R, y3 + 140, 'ExBody 的代码里本来就定义了这 12 个，只用了上身 6 个', 'demo-x-ink2', 11);
    label(p3, R, y3 + 162, '12 × 3 = 36 维，和表 VII 对得上', 'demo-x-mut', 11);
    label(p3, R, y3 + 184, '速度、姿态也能当摇杆命令来给', 'demo-x-mut', 11);
    var p4 = group(s);
    math(p4, R, 74, '\\hat{\\pi}(\\hat a_t \\mid p_t,\\ o_t,\\ g_t),\\quad \\hat a_t \\in \\mathbb{R}^{23}', 15);
    [512, 256, 128].forEach(function (n, i) {
      var h = n / 512 * 110;
      p4.appendChild(paint(svgEl('rect', { x: R + 70 + i * 86, y: 104 + (110 - h) / 2, width: 44, height: h, rx: 5 }), C_WARN));
      label(p4, R + 92 + i * 86, 232, String(n), 'demo-x-ink', 12, 'middle');
    });
    var a4 = arrow(p4, C_MUTED, 2); a4.set(R + 6, 159, R + 62, 159, 8);
    var a4b = arrow(p4, C_MUTED, 2); a4b.set(R + 300, 159, R + 344, 159, 8);
    label(p4, R + 348, 163, '23', 'demo-x-ink', 12);
    label(p4, R, 264, '三层 MLP；输出 23 个关节的 PD 目标角', 'demo-x-ink2', 12);
    label(p4, R, 288, 'PPO，Isaac Gym 里大规模并行', 'demo-x-mut', 11);
    var p5 = group(s);
    var clip = projClip(p5, 'g1sim', R + 66, 50, 240, 203, '');
    label(p5, R + 186, 272, '项目页视频（仿真）：绿点是跟踪的关键点', 'demo-x-mut', 10, 'middle');
    label(p5, R, 304, '这些信息真机上多半拿不到：教师只在仿真里用', 'demo-x-ink2', 12);
    label(p5, R, 326, '它不部署，只给学生当老师', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock), k = loopFrame(now, WALK.n, WALK.fps), f = walkFrame(k);
      var cam = camOf('walk', SC, 190, GY, f.root[0], f.root[1]);
      ground.put(f.root, cam);
      bot.put(f.root, cam, k);
      f.kp.forEach(function (p, i) { moveDot(kpD[i], project(p, cam)); });
      var f2 = walkFrame(Math.min(k + 1, WALK.n - 1)), f0 = walkFrame(Math.max(k - 1, 0));
      var vx = (f2.root[0] - f0.root[0]) * WALK.fps / 2, vy = (f2.root[1] - f0.root[1]) * WALK.fps / 2;
      var a = project(f.root, cam), b = project([f.root[0] + 0.35 * vx, f.root[1] + 0.35 * vy, f.root[2]], cam);
      vArr.set(a[0], a[1], b[0], b[1], 9);
      panels(t, [p1, p2, p3, p4, p5]);
      clip.at(K.clipSince(t, 13.4), t > 13.4);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 奖励：表达目标 + 移动目标（表 I） ── */
  function buildSceneReward() {
    var s = sceneSvg('左边：表 I 六项奖励的权重条，黄色两项是表达目标（合计 5），紫色四项是移动目标（合计 14）；右边依次出现：表达目标、移动目标、一个假设的误差算出的六项得分、速度方向那一项按字面是反的（两条曲线）、九项正则');
    s.appendChild(svgText(24, 26, '奖励：像不像（表达目标）+ 怎么动（移动目标）', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 360, 360, C_BORDER, C_SURFACE2);
    math(left, 40, 72, 'r = \\sum_i w_i \\exp(-c_i \\cdot \\text{误差}_i)', 15);
    var bars = T1.map(function (r, i) {
      var b = barRowAt(left, 40, 100 + i * 34 + (r[1] === 'm' ? 16 : 0), 86, r[0], r[1] === 'e' ? C_EXP : C_MOV, 18, 11.5);
      return { b: b, w: r[2] };
    });
    label(left, 40, 330, '表达目标 3 + 2 = 5', 'demo-x-ink2', 12);
    label(left, 40, 352, '移动目标 6 + 6 + 1 + 1 = 14', 'demo-x-ink2', 12);
    label(left, 40, 380, '满分 19：「怎么动」几乎是「像不像」的三倍', 'demo-x-mut', 11);
    var R = 404, W = 372;
    var p1 = group(s);
    rich(p1, R, 64, '表达目标 $G^e$：像不像', 13.5, 'demo-x-ink');
    math(p1, R, 104, '3.0\\cdot\\exp(-0.7\\,|\\mathbf q_{\\text{ref}}-\\mathbf q|)', 14);
    label(p1, R, 128, '全身 23 个关节角', 'demo-x-mut', 11);
    math(p1, R, 168, '2.0\\cdot\\exp(-|\\mathbf p_{\\text{ref}}-\\mathbf p|)', 14);
    label(p1, R, 192, '12 个关键点、36 维', 'demo-x-mut', 11);
    label(p1, R, 230, '五项和 ExBody 一字不差，只是全身都跟了', 'demo-x-ink2', 12);
    var p2 = group(s);
    rich(p2, R, 64, '移动目标 $G^m$：怎么动', 13.5, 'demo-x-ink');
    chip(p2, R, 80, 180, '线速度 6.0', C_MOV, { size: 12 });
    chip(p2, R + 190, 80, 180, '速度方向 6.0（新加）', C_MOV, { size: 12 });
    chip(p2, R, 118, 180, '横滚与俯仰 1.0', C_MOV, { size: 12 });
    chip(p2, R + 190, 118, 180, '偏航 1.0', C_MOV, { size: 12 });
    label(p2, R, 178, '跟根部的速度、方向、姿态：整体往哪走、多快', 'demo-x-ink2', 12);
    label(p2, R, 200, '比 ExBody 多了「速度方向」一项', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, '算一步（误差都是假设的）：', 'demo-x-ink', 13.5);
    label(p3, R, 86, '关节 0.30 rad、关键点 0.10 m、速度 0.10 m/s、', 'demo-x-mut', 11);
    label(p3, R, 106, '方向偏 10°、横滚俯仰 0.05、偏航 0.10 rad', 'demo-x-mut', 11);
    var termsFix = rewardTerms(EX4, 'fix'), termsLit = rewardTerms(EX4, 'lit');
    var tBars = T1.map(function (r, i) {
      var b = barRowAt(p3, R, 118 + i * 24, 86, r[0], r[1] === 'e' ? C_EXP : C_MOV, 15);
      return { b: b, v: termsFix[i] };
    });
    rich(p3, R, 282, '合计 ' + f2(sum(termsFix)) + '（满分 19；方向一项按 $1-\\cos$ 算）', 12, 'demo-x-ink2');
    var p4 = group(s);
    label(p4, R, 64, '速度方向那一项，按字面是反的', 'demo-x-ink', 13.5);
    var PX = R + 30, PY = 92, PW = 300, PH = 150;
    hline(p4, PX, PY + PH, PX + PW, PY + PH, C_BORDER, 1.2);
    hline(p4, PX, PY, PX, PY + PH, C_BORDER, 1.2);
    label(p4, PX, PY + PH + 18, '0°', 'demo-x-mut', 10, 'middle');
    label(p4, PX + PW, PY + PH + 18, '180°', 'demo-x-mut', 10, 'middle');
    label(p4, PX + PW / 2, PY + PH + 18, '机器人速度和参考速度的夹角', 'demo-x-mut', 10, 'middle');
    label(p4, PX - 6, PY + 4, '1', 'demo-x-mut', 10, 'end');
    label(p4, PX - 6, PY + PH, '0', 'demo-x-mut', 10, 'end');
    var litPts = [], fixPts = [];
    for (var d = 0; d <= 180; d += 3) {
      var c = Math.cos(d * Math.PI / 180), x = PX + d / 180 * PW;
      litPts.push([x, PY + PH - PH * Math.min(1, Math.exp(-4 * c))]);
      fixPts.push([x, PY + PH - PH * Math.exp(-4 * (1 - c))]);
    }
    pathLine(p4, fixPts, C_OURS, 2.6);
    pathLine(p4, litPts, C_REF, 2.6);
    rich(p4, PX + 40, PY + 20, '$\\exp(-4(1-\\cos))$', 11, 'demo-x-good');
    rich(p4, PX + 190, PY + 20, '$\\exp(-4\\cos)$', 11, 'demo-x-bad');
    label(p4, PX + PW, PY - 8, '超过 1 的部分没画：180° 时是 54.6', 'demo-x-bad', 10, 'end');
    label(p4, R, 284, '按字面：方向一致时只有 0.018，完全相反时 54.6', 'demo-x-ink2', 11.5);
    rich(p4, R, 306, '我们推测原意是 $1-\\cos$（没有代码可以核对）', 11, 'demo-x-mut');
    var p5 = group(s);
    label(p5, R, 64, '另有 9 项正则（附录表 IX）', 'demo-x-ink', 13.5);
    REG.forEach(function (r, i) {
      var str = r[0] + ' ' + (Math.abs(r[1]) < 1e-3 ? sgn('-3e-7') : sgn(String(r[1])));
      chip(p5, R + (i % 2) * 188, 80 + Math.floor(i / 2) * 36, 180, str, r[1] > 0 ? C_OURS : C_MUTED, { size: 11 });
    });
    label(p5, R, 270, 'v1 还有能量、竖直速度等五项，v2 去掉了', 'demo-x-mut', 11);
    function draw(t, clock) {
      var pb = seg(t, 0.6, 1.4);
      bars.forEach(function (b) { b.b.set(b.w * 38 * pb, b.w.toFixed(1)); });
      var p = seg(t, 7.4, 8.2);
      tBars.forEach(function (b) { b.b.set(b.v * 34 * p, f2(b.v)); });
      void termsLit; void clock;
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* 第 7、8 幕共用：一段大步走的侧视条，参考（淡）和机器人（实）各一台，机器人只走到参考的 ratio 倍（假设）。
     mode(t) 返回 'global' / 'local' / 'reset'：全局目标是参考的关键点；局部目标贴在机器人身上；reset 每 1 s 拉回一次 */
  var LAG = { ratio: 0.9, period: 1.0 };
  function lagStrip(parent, x1, x2, y1, y2, cfg) {
    var C = cfg || LAG, g = group(parent);
    rectBox(g, x1, y1, x2 - x1, y2 - y1, C_BORDER, C_SURFACE2);
    var GY = y2 - 22, SC = 108, OX = (x1 + x2) / 2;
    hline(g, x1 + 12, GY, x2 - 12, GY, C_BORDER, 1.4);
    var ticks = [];
    for (var q = 0; q <= 8; q++) ticks.push({ l: hline(g, 0, 0, 0, 0, C_BORDER, 1.6), t: label(g, 0, 0, '', 'demo-x-mut', 9.5, 'middle'), m: q * 0.5 });
    var ref = sprite(g, 'walk', { ghost: 0.32 }), bot = sprite(g, 'walk');
    var errL = [], tgt = [], mine = [];
    for (var j = 0; j < 12; j++) {
      errL.push(hline(g, 0, 0, 0, 0, C_REF, 1.2, '3 2'));
      mine.push(dotAt(g, 0, 0, 3, C_LOC, C_SURFACE));
      tgt.push(dotAt(g, 0, 0, 3.4, C_REF));
    }
    var vArr = arrow(g, C_MOV, 3);
    var tagRef = label(g, 0, 0, '参考', 'demo-x-mut', 10, 'start'), tagBot = label(g, 0, 0, '机器人', 'demo-x-ink2', 10, 'end');
    return {
      g: g,
      put: function (k, mode) {
        var f = walkFrame(k), f0 = walkFrame(0);
        var cam = camOf('walk', SC, OX, GY, 2.1, 0);
        ticks.forEach(function (tk) {
          var p = project([tk.m, 0, 0], cam);
          setLine(tk.l, p[0], GY, p[0], GY + 5);
          tk.t.setAttribute('x', p[0].toFixed(1)); tk.t.setAttribute('y', (GY + 16).toFixed(1));
          tk.t.textContent = tk.m % 1 === 0 ? tk.m + ' m' : '';
        });
        var rob = [f0.root[0] + C.ratio * (f.root[0] - f0.root[0]), f0.root[1] + C.ratio * (f.root[1] - f0.root[1])];
        var shift = [f.root[0] - rob[0], f.root[1] - rob[1]];
        ref.put(f.root, cam, k);
        bot.put(rob, cam, k);
        var lagNow = mode === 'reset' ? lagAt(k, C.ratio, C.period) : null;
        f.kp.forEach(function (p, i) {
          var mp = [p[0] - shift[0], p[1] - shift[1], p[2]];
          var tp = mode === 'local' ? mp : mode === 'reset' ? [mp[0] + lagNow.dx, mp[1] + lagNow.dy, mp[2]] : p;
          var a = project(mp, cam), b = project(tp, cam);
          moveDot(mine[i], a); moveDot(tgt[i], b); setLine(errL[i], a[0], a[1], b[0], b[1]);
        });
        var fa = walkFrame(Math.max(k - 1, 0)), fb = walkFrame(Math.min(k + 1, WALK.n - 1));
        var vx = C.ratio * (fb.root[0] - fa.root[0]) * WALK.fps / 2;
        var a0 = project([rob[0], rob[1], f.root[2]], cam), a1 = project([rob[0] + 0.3 * vx, rob[1], f.root[2]], cam);
        vArr.set(a0[0], a0[1], a1[0], a1[1], 8);
        /* 头顶上方：参考写在右边，机器人写在左边，两台靠得再近也不重叠 */
        var rp = project([f.root[0], f.root[1], 1.45], cam), bp = project([rob[0], rob[1], 1.45], cam);
        tagRef.setAttribute('x', (rp[0] + 4).toFixed(1)); tagRef.setAttribute('y', rp[1].toFixed(1));
        tagBot.setAttribute('x', (bp[0] - 4).toFixed(1)); tagBot.setAttribute('y', bp[1].toFixed(1));
        return { rob: rob, cam: cam };
      },
      vel: vArr
    };
  }
  /* 误差—时间小图：x 0–2.47 s，y 0–0.45 m；series 是 [ { color, fn(k) → m, dash } ]，画到第 k 帧为止 */
  function lagPlot(parent, x, y, w, h, series) {
    var g = group(parent);
    hline(g, x, y + h, x + w, y + h, C_BORDER, 1.2);
    hline(g, x, y, x, y + h, C_BORDER, 1.2);
    [0, 0.2, 0.4].forEach(function (v) {
      var yy = y + h - v / 0.45 * h;
      label(g, x - 6, yy + 4, v.toFixed(1), 'demo-x-mut', 9.5, 'end');
      if (v) hline(g, x, yy, x + w, yy, C_BORDER, 0.6, '2 3');
    });
    /* 原点的刻度字靠右写，不和纵轴的 0.0 挤在一起 */
    [0, 1, 2].forEach(function (v) { label(g, x + v / 2.47 * w, y + h + 17, v + ' s', 'demo-x-mut', 9.5, v ? 'middle' : 'start'); });
    label(g, x + 4, y - 6, '每个关键点落后（m）', 'demo-x-mut', 10);
    var lines = series.map(function (sr) { return { sr: sr, p: pathLine(g, [], sr.color, 2.4, sr.dash), dot: dotAt(g, 0, 0, 3.5, sr.color) }; });
    function px(k) { return x + (k / WALK.fps) / 2.47 * w; }
    function py(v) { return y + h - clamp(v / 0.45, 0, 1) * h; }
    return {
      g: g,
      put: function (k) {
        lines.forEach(function (L) {
          var pp = [];
          for (var i = 0; i <= k; i++) pp.push([px(i), py(L.sr.fn(i))]);
          setPath(L.p, pp);
          moveDot(L.dot, [px(k), py(L.sr.fn(k))]);
        });
      },
      lines: lines
    };
  }

  /* ── scene 7: 全局关键点会越跑越偏 ── */
  function buildSceneGlobal() {
    var s = sceneSvg('上面一条侧视：淡色的是参考，实色的是机器人，机器人只走到参考 90% 的速度（假设）；红点是全局关键点（参考的绝对位置），蓝点是机器人自己的关键点，红虚线是误差，越走越长；左下画每个关键点落后的距离随时间涨，右边是文字');
    s.appendChild(svgText(24, 26, '全局关键点：一步跟不上，后面一直对不上', 'demo-x-ink2', 13.5));
    var strip = lagStrip(s, 24, 776, 38, 238);
    var plot = lagPlot(s, 70, 272, 340, 104, [{ color: C_REF, fn: function (k) { return lagAt(k, LAG.ratio, 0).lag; } }]);
    var R = 452, p1 = group(s);
    label(p1, R, 270, '动作跟踪两件事：跟关节角、跟关键点', 'demo-x-ink', 13);
    label(p1, R, 296, '训练时关键点往往更关键：关节角的误差', 'demo-x-ink2', 12);
    label(p1, R, 318, '会沿运动链传到全身，关键点直接管身体', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 270, 'H2O、OmniH2O 跟全局关键点', 'demo-x-ink', 13);
    label(p2, R, 296, '目标 = 参考人在世界里的绝对位置', 'demo-x-ink2', 12);
    label(p2, R, 318, '红点：参考的关键点；蓝点：机器人自己的', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 270, '机器人只走到参考 90% 的速度（假设）', 'demo-x-ink', 13);
    var l3a = label(p3, R, 296, '', 'demo-x-ink2', 12), l3b = label(p3, R, 318, '', 'demo-x-ink2', 12);
    label(p3, R, 344, '12 个点每个都落后这么多，姿态却一模一样', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 270, '关键点奖励一路往下掉', 'demo-x-ink', 13);
    math(p4, R, 302, '2\\exp(-|\\Delta\\mathbf p|),\\ |\\Delta\\mathbf p| = \\sqrt{12}\\times\\text{落后}', 13);
    var l4 = label(p4, R, 336, '', 'demo-x-ink2', 12);
    label(p4, R, 360, '策略被逼着去追绝对位置', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 270, '论文：全局关键点会随时间漂，', 'demo-x-ink', 13);
    label(p5, R, 294, '误差越积越多，最后拖垮学习', 'demo-x-ink', 13);
    label(p5, R, 322, '所以 H2O、OmniH2O 只适合基本不走动的场景', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock), k = loopFrame(now, WALK.n, WALK.fps);
      strip.put(k, 'global');
      plot.put(k);
      var A = lagAt(15, LAG.ratio, 0), B = lagAt(WALK.n - 1, LAG.ratio, 0), C = lagAt(k, LAG.ratio, 0);
      l3a.textContent = '1.0 s 后落后 ' + f2(A.lag) + ' m，' + f2((WALK.n - 1) / WALK.fps) + ' s 后 ' + f2(B.lag) + ' m';
      l3b.textContent = '参考平均 ' + f2(walkSpeed()) + ' m/s，机器人 ' + f2(walkSpeed() * LAG.ratio) + ' m/s';
      l4.textContent = '这一刻：落后 ' + f2(C.lag) + ' m → 奖励 ' + f2(C.reward) + '（满分 2.0）';
      setOpacity(plot.g, seg(t, 3.9, 4.3));
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 局部关键点 + 速度：解耦 ── */
  function buildSceneLocal() {
    var s = sceneSvg('同一条侧视：关键点改在机器人自己的坐标系里，目标贴在机器人身上，误差为零，紫箭头是速度跟踪；第三段训练时让目标漂一小段、每 1 s 拉回一次（周期是假设），左下的误差变成锯齿；第四段是 v1 的消融柱；最后一段是项目页的户外真机片段');
    s.appendChild(svgText(24, 26, '局部关键点 + 速度：姿态归关键点，位置归速度', 'demo-x-ink2', 13.5));
    var strip = lagStrip(s, 24, 776, 38, 238);
    var plot = lagPlot(s, 70, 272, 340, 104, [
      { color: C_REF, fn: function (k) { return lagAt(k, LAG.ratio, 0).lag; }, dash: '4 3' },
      { color: C_WARN, fn: function (k) { return lagAt(k, LAG.ratio, LAG.period).lag; } },
      { color: C_LOC, fn: function () { return 0; } }
    ]);
    var R = 452, p1 = group(s);
    label(p1, R, 270, '① 关键点转到机器人当前的坐标系', 'demo-x-ink', 13);
    label(p1, R, 296, '目标贴在机器人身上：只管姿态像不像', 'demo-x-ink2', 12);
    label(p1, R, 318, '落后多少都不影响，误差是 0（蓝线）', 'demo-x-mut', 11);
    var p2 = group(s);
    label(p2, R, 270, '② 全局位置交给速度去跟', 'demo-x-ink', 13);
    label(p2, R, 296, '紫箭头：根部的线速度、方向、姿态', 'demo-x-ink2', 12);
    var l2 = label(p2, R, 318, '', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 270, '③ 训练时：让目标漂一小段，再定期拉回', 'demo-x-ink', 13);
    var l3 = label(p3, R, 296, '', 'demo-x-ink2', 12);
    label(p3, R, 318, '漂多久、多久拉一次，论文没写（这里取 1 s）', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 270, 'v1 的消融：去掉定期拉回（D250 上）', 'demo-x-ink', 13);
    var vb = vbars(p4, R + 20, 288, 240, 80, [V1.resetVel, V1.noResetVel], [C_OURS, C_REF], { max: 0.3, names: ['有拉回', '去掉'], fmt: f4, gap: 40 });
    label(p4, R + 270, 340, '速度误差', 'demo-x-mut', 10.5);
    label(p4, R + 270, 358, '（m/s）', 'demo-x-mut', 10.5);
    var p5 = group(s);
    label(p5, R, 270, '④ 部署时：只用局部关键点', 'demo-x-ink', 13);
    var clip = projClip(p5, 'stroll', R, 282, 160, 90, '');
    label(p5, R + 172, 300, '项目页视频（真机，', 'demo-x-mut', 10);
    label(p5, R + 172, 318, '原速）：户外边走', 'demo-x-mut', 10);
    label(p5, R + 172, 336, '边做动作', 'demo-x-mut', 10);
    label(p5, R + 172, 364, 'v2 删了③的消融', 'demo-x-mut', 10);
    function mode(t) { return t >= 7.0 && t < 10.4 ? 'reset' : 'local'; }
    function draw(t, clock) {
      var now = nowOf(t, clock), k = loopFrame(now, WALK.n, WALK.fps);
      strip.put(k, mode(t));
      plot.put(k);
      plot.lines[0].p.style.opacity = 0.45; plot.lines[0].dot.style.opacity = 0.45;
      setOpacity(plot.lines[1].p, seg(t, 7.3, 7.7)); setOpacity(plot.lines[1].dot, seg(t, 7.3, 7.7));
      var vNow = walkSpeed() * LAG.ratio, vErr = walkSpeed() - vNow;
      l2.textContent = '速度误差 ' + f2(vErr) + ' m/s → 线速度那项 ' + f2(6 * Math.exp(-4 * vErr)) + '（满分 6）';
      var mx = 0;
      for (var i = 0; i < WALK.n; i++) mx = Math.max(mx, lagAt(i, LAG.ratio, LAG.period).lag);
      l3.textContent = '误差变成锯齿，最多 ' + f2(mx) + ' m（一直不拉是 ' + f2(lagAt(WALK.n - 1, LAG.ratio, 0).lag) + ' m）';
      vb.set(seg(t, 10.8, 11.6));
      setOpacity(plot.g, 1 - 0.7 * seg(t, 13.4, 13.8));
      panels(t, [p1, p2, p3, p4, p5]);
      clip.at(K.clipSince(t, 13.4), t > 13.4);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: 学生：10 步历史 + DAgger ── */
  function buildSceneStudent() {
    var s = sceneSvg('左上：10 格本体感受历史的纸带一格格往左走，加上跟踪目标，送进学生网络；左下：DAgger 的回路，学生开、教师标答案、算均方误差；右边依次是学生缺什么、维数、损失、网络大小、v1 的 25 步');
    s.appendChild(svgText(24, 26, '学生：拿不到特权信息，就看最近 10 步', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 400, 360, C_BORDER, C_SURFACE2);
    label(left, 40, 62, '本体感受历史（每格 75 维）', 'demo-x-ink2', 11.5);
    var cells = [];
    for (var i = 0; i < 12; i++) {
      var g = group(left);
      rectBox(g, 0, 0, 30, 30, C_LOC, C_SURFACE);
      cells.push(g);
    }
    var cellTag = rich(left, 40, 112, '$o_{t-9}, \\dots, o_t$', 11, 'demo-x-mut');
    chip(left, 40, 128, 120, '目标 $g_t$ · 69', C_EXP, { size: 11 });
    var stu = group(left);
    [1024, 1024, 512].forEach(function (n, j) {
      var h = n / 1024 * 70;
      stu.appendChild(paint(svgEl('rect', { x: 200 + j * 50, y: 92 + (70 - h) / 2, width: 34, height: h, rx: 4 }), C_OURS));
      label(stu, 217 + j * 50, 176, String(n), 'demo-x-ink', 10.5, 'middle');
    });
    var aIn = arrow(left, C_MUTED, 2); aIn.set(168, 127, 194, 127, 7);
    var aOut = arrow(left, C_MUTED, 2); aOut.set(340, 127, 372, 127, 7);
    rich(left, 378, 131, '$a_t$', 12, 'demo-x-ink');
    /* DAgger 回路 */
    var dag = group(left);
    var nodes = [['学生开：动作 $a_t$', 60, 214, C_OURS], ['仿真走到新状态', 230, 214, C_MUTED], ['教师标答案 $\\hat a_t$', 230, 300, C_REF], ['损失 $\\lVert a_t-\\hat a_t\\rVert^2$', 60, 300, C_WARN]];
    nodes.forEach(function (n) { chip(dag, n[1], n[2], 150, n[0], n[3], { size: 11, h: 34 }); });
    var d1 = arrow(dag, C_MUTED, 2); d1.set(212, 231, 228, 231, 7);
    var d2 = arrow(dag, C_MUTED, 2); d2.set(305, 250, 305, 296, 7);
    var d3 = arrow(dag, C_MUTED, 2); d3.set(228, 317, 212, 317, 7);
    var d4 = arrow(dag, C_MUTED, 2); d4.set(135, 296, 135, 250, 7);
    var pulse = dotAt(dag, 0, 0, 5, C_OURS);
    label(dag, 224, 372, '在学生自己走到的状态上问老师', 'demo-x-mut', 10.5, 'middle');
    var R = 444, W = 332;
    var p1 = group(s);
    label(p1, R, 64, '学生拿不到这些（教师才有）：', 'demo-x-ink', 13.5);
    ['真实的根速度', '真实的关键点位置', '摩擦、电机强度'].forEach(function (n, j) { chip(p1, R, 80 + j * 38, W, n, C_REF, { size: 12, strike: true }); });
    label(p1, R, 216, '只能从过去的本体感受里推出来', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 64, '输入：历史 + 目标', 'demo-x-ink', 13.5);
    math(p2, R, 104, 'a_t \\sim \\pi(\\cdot \\mid o_{t-H:t},\\ g_t),\\ H = 10', 14);
    label(p2, R, 140, '75 × 10 = 750 维本体感受', 'demo-x-ink2', 12);
    label(p2, R, 164, '+ 69 维目标 = 819 维（我们按附录表加的）', 'demo-x-ink2', 12);
    label(p2, R, 196, '教师 62 + 75 + 69 = 206 维（假设只看一步）', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, 'DAgger：学生开，老师标答案', 'demo-x-ink', 13.5);
    math(p3, R, 104, 'l = \\lVert a_t - \\hat a_t \\rVert^2', 15);
    label(p3, R, 140, '学生在仿真里自己开，对每个走到的状态，', 'demo-x-ink2', 12);
    label(p3, R, 162, '教师算出该怎么做；在累积的数据上反复训', 'demo-x-ink2', 12);
    label(p3, R, 192, '学生一偏，教师就在那里纠正（和行为克隆的区别）', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 64, '学生的网络更大', 'demo-x-ink', 13.5);
    chip(p4, R, 82, W, '教师：MLP 512 · 256 · 128', C_REF, { size: 12 });
    chip(p4, R, 120, W, '学生：MLP 1024 · 1024 · 512', C_OURS, { size: 12 });
    label(p4, R, 180, '输入直接拼起来送进 MLP（附录表 VIII）', 'demo-x-ink2', 12);
    label(p4, R, 204, '优化器 Adam，学习率 1e-4，批大小 4096', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, '历史取几步？', 'demo-x-ink', 13.5);
    chip(p5, R, 82, 150, 'v1：25 步', C_MUTED, { size: 12 });
    chip(p5, R + 166, 82, 166, 'v2：10 步', C_OURS, { size: 12 });
    label(p5, R, 140, '两版的消融里各自的最佳不一样，', 'demo-x-ink2', 12);
    label(p5, R, 162, '数字也全部重做了（第 16 幕细看）', 'demo-x-ink2', 12);
    label(p5, R, 194, '论文强调：历史要足够长', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock), ph = (now * 1.25) % 1;
      cells.forEach(function (c, j) {
        var x = 40 + (j - ph) * 13, vis = x >= 34 && x <= 160 ? 1 : 0;
        c.setAttribute('transform', 'translate(' + x.toFixed(1) + ',72) scale(0.4,0.6)');
        c.style.opacity = vis * (j === 11 ? 0.6 : 1);
      });
      setOpacity(cellTag, 1);
      var q = (now * 0.5) % 4, seg4 = Math.floor(q), fr = q - seg4;
      var P = [[212, 231], [305, 250], [212, 317], [135, 250]], Q = [[228, 231], [305, 296], [228, 317], [135, 296]];
      var A = P[seg4], B = Q[seg4];
      moveDot(pulse, [A[0] + (B[0] - A[0]) * fr, A[1] + (B[1] - A[1]) * fr]);
      setOpacity(dag, seg(t, 7.3, 7.7) * 0.75 + 0.25);
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: 可行又多样（附录表 X） ── */
  function buildSceneDatasets() {
    var s = sceneSvg('上面三个数据集的框：50 段只有走路、250 段多了 Macarena、左右扭腰、小鸡舞（脚都踩平、重心落在两脚之间）、全集还有侧手翻接后空翻（都是我们重定向的 G1，示意）；左下按三个评测集依次长出关节误差的柱子；右边是文字');
    s.appendChild(svgText(24, 26, '先人工试：数据要多大、多杂（附录表 X）', 'demo-x-ink2', 13.5));
    var BY = 40, BH = 180;
    var b50 = group(s), b250 = group(s), bAll = group(s);
    rectBox(b50, 24, BY, 170, BH, C_MUTED, C_SURFACE2);
    rectBox(b250, 206, BY, 300, BH, C_OURS, C_SURFACE2);
    rectBox(bAll, 518, BY, 258, BH, C_REF, C_SURFACE2);
    rich(b50, 109, BY + 20, '$\\mathcal D_{50}$：站、走', 12, 'demo-x-ink', 'middle');
    rich(b250, 356, BY + 20, '$\\mathcal D_{250}$：+ 上身花样、跳舞、小跳', 12, 'demo-x-ink', 'middle');
    rich(bAll, 647, BY + 20, '$\\mathcal D_{\\text{CMU}}$：全集 1,919 段', 12, 'demo-x-ink', 'middle');
    var spW = sprite(b50, 'walk'), spM = sprite(b250, 'macarena'), spT = sprite(b250, 'sidetwist'), spS = sprite(b250, 'chicken'), spF = sprite(bAll, 'flip');
    label(bAll, 647, BY + BH - 8, '+ 俯卧撑、打滚、空翻', 'demo-x-bad', 10.5, 'middle');
    label(b250, 356, BY + BH - 8, '人工挑的，避开极端动作', 'demo-x-mut', 10.5, 'middle');
    label(b50, 109, BY + BH - 8, '可行，但单调', 'demo-x-mut', 10.5, 'middle');
    label(s, 24, BY + BH + 16, '（框里的 G1 是我们重定向的几段动作，只是示意每个集合里大概有什么）', 'demo-x-mut', 10);
    var GX = 40, GYb = 262, groups = [];
    T10.forEach(function (g, i) {
      var gg = group(s), x = GX + i * 136;
      var vb = vbars(gg, x, GYb, 124, 100, g.rows.map(function (r) { return r[4]; }), [C_MUTED, C_OURS, C_REF], { min: 0.05, max: 0.19, fmt: f3, gap: 8, vsize: 9.5 });
      rich(gg, x + 62, GYb + 118, g.zh, 10.5, 'demo-x-ink2', 'middle');
      groups.push({ g: gg, vb: vb });
    });
    var lg = group(s);
    [['50 段训', C_MUTED], ['250 段训', C_OURS], ['全集训', C_REF]].forEach(function (r, j) {
      dotAt(lg, 50 + j * 110, 394, 5, r[1]); label(lg, 60 + j * 110, 398, r[0], 'demo-x-mut', 10.5);
    });
    var R = 452, p1 = group(s);
    label(p1, R, 252, '人工做了三个数据集，各训一个策略', 'demo-x-ink', 13);
    label(p1, R, 278, '在三个集合上评：分布内、全集、', 'demo-x-ink2', 12);
    label(p1, R, 300, '分布外的 ACCAD（训练里完全没有）', 'demo-x-ink2', 12);
    label(p1, R, 326, '柱子是全身关节误差（rad），越低越好', 'demo-x-mut', 11);
    var p2 = group(s);
    label(p2, R, 252, '分布内：50 段训的最好（0.075）', 'demo-x-ink', 13);
    label(p2, R, 278, '多加数据，对分布内不一定有帮助', 'demo-x-ink2', 12);
    var p3 = group(s);
    label(p3, R, 252, '全集上：250 段训的反而最好', 'demo-x-ink', 13);
    label(p3, R, 278, '0.115，比在全集上训的 0.129 还低', 'demo-x-ink2', 12);
    label(p3, R, 302, '论文：策略把力气花在跟做不到的动作上，', 'demo-x-mut', 11);
    label(p3, R, 322, '做得到的反而跟不准', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 252, '分布外：还是 250 段最好（0.142）', 'demo-x-ink', 13);
    label(p4, R, 278, '只有站和走的 50 段误差很大（0.172）', 'demo-x-ink2', 12);
    label(p4, R, 302, '速度误差上，全集训的最好', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 252, '可行性—多样性原则', 'demo-x-ink', 13.5);
    chip(p5, R, 266, 324, '上半身：越**多样**越好', C_EXP, { size: 12 });
    chip(p5, R, 302, 324, '下半身：必须**做得到**', C_OURS, { size: 12 });
    label(p5, R, 356, '但 250 段是人挑的 → 下一步：自动挑', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* 比例按每张贴图里最高的那一帧定：举手、空翻时头顶也不碰框里的标题 */
      spW.at(109, BY + BH - 28, 62, loopFrame(now, WALK.n, WALK.fps));
      spM.at(266, BY + BH - 28, 80, pingFrame(now, SHEETS.macarena.n, 15));
      spT.at(356, BY + BH - 28, 80, pingFrame(now, SHEETS.sidetwist.n, 15));
      spS.at(450, BY + BH - 28, 80, pingFrame(now, SHEETS.chicken.n, 15));
      spF.at(647, BY + BH - 28, 58, loopFrame(now, SHEETS.flip.n, 15));
      groups.forEach(function (g, i) {
        var at = [3.9, 7.3, 10.7][i];
        g.vb.set(seg(t, at, at + 0.8));
        setOpacity(g.g, seg(t, at - 0.3, at));
      });
      setOpacity(lg, seg(t, 3.6, 4.0));
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* 图 8 的累积分布小图：x 百分位 0–100，y e(s) 0–0.40 */
  function cdfPlot(parent, x, y, w, h) {
    var g = group(parent);
    hline(g, x, y + h, x + w, y + h, C_BORDER, 1.2);
    hline(g, x, y, x, y + h, C_BORDER, 1.2);
    [0, 0.1, 0.2, 0.3, 0.4].forEach(function (v) {
      var yy = y + h - v / 0.4 * h;
      label(g, x - 6, yy + 4, v.toFixed(1), 'demo-x-mut', 9.5, 'end');
      if (v) hline(g, x, yy, x + w, yy, C_BORDER, 0.6, '2 3');
    });
    [0, 25, 50, 75, 100].forEach(function (v) { label(g, x + v / 100 * w, y + h + 17, v + '%', 'demo-x-mut', 9.5, v ? 'middle' : 'start'); });
    function px(p) { return x + p / 100 * w; }
    function py(e) { return y + h - clamp(e / 0.4, 0, 1) * h; }
    var curve = pathLine(g, [], C_ACCENT, 2.6);
    var full = CDF.map(function (c) { return [px(c[0]), py(c[1])]; });
    return {
      g: g, px: px, py: py,
      grow: function (p) {
        var n = p > 0 ? Math.max(2, Math.round(clamp(p, 0, 1) * full.length)) : 0;
        setPath(curve, full.slice(0, n));
      }
    };
  }

  /* ── scene 11: 自动筛选：e(s) 与阈值 ── */
  function buildSceneCuration() {
    var s = sceneSvg('左边是论文图 8 的累积分布（读图值）：横轴是动作按误差从小到大排的百分位，纵轴是 e(s)；两个假设的例子（一段走路、一段侧手翻）标在曲线上；第四段出现五档阈值的横线和留下的比例；右边依次是四步做法');
    s.appendChild(svgText(24, 26, '自动筛选：让初始策略给每段动作打分', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 410, 360, C_BORDER, C_SURFACE2);
    label(left, 44, 62, 'e(s) 的累积分布（论文图 8，读图值）', 'demo-x-ink2', 11.5);
    var P = cdfPlot(left, 76, 80, 330, 250);
    label(left, 241, 364, '动作按 e(s) 从小到大排的百分位', 'demo-x-mut', 10, 'middle');
    var ex = group(left);
    var eWalk = eScore(0.08, 0.10), eFlip = eScore(0.60, 0.30);
    var mW = dotAt(ex, P.px(pctOf(eWalk)), P.py(eWalk), 5.5, C_OURS, C_SURFACE);
    var mF = dotAt(ex, P.px(pctOf(eFlip)), P.py(eFlip), 5.5, C_REF, C_SURFACE);
    void mW; void mF;
    var spW = sprite(ex, 'walk'), spF = sprite(ex, 'flip');
    rich(ex, P.px(pctOf(eWalk)) + 10, P.py(eWalk) + 22, '走路 $e = ' + f3(eWalk) + '$', 10, 'demo-x-good', 'start');
    rich(ex, P.px(pctOf(eFlip)) - 10, P.py(eFlip) + 4, '侧手翻（假设）$e = ' + f2(eFlip) + '$', 10, 'demo-x-bad', 'end');
    /* 第二段：每段动作先按数据集里的顺序打一个分（41 个点代表整条分布）；第三段排好序，点落到曲线上 */
    var dots = group(left), NS = CDF.length;
    var sDots = CDF.map(function (c, i) {
      var k = (i * 17) % NS;
      return { d: dotAt(dots, 0, 0, 2.8, C_ACCENT), from: [P.px(k / (NS - 1) * 100), P.py(c[1])], to: [P.px(c[0]), P.py(c[1])], k: k };
    });
    var unsorted = label(left, 396, 96, '还没排序：按数据集里的顺序', 'demo-x-mut', 10, 'end');
    var th = group(left);
    TAUS.forEach(function (T, i) {
      var yy = P.py(T.tau), xx = P.px(T.pct), col = T.tau === 0.15 ? C_OURS : C_MUTED;
      hline(th, P.px(0), yy, xx, yy, col, T.tau === 0.15 ? 2 : 1.2, '4 3');
      hline(th, xx, yy, xx, P.py(0), col, 1, '2 3');
      rich(th, P.px(0) + 4, yy - 3, '$\\tau = ' + T.tau + '$', 9.5, T.tau === 0.15 ? 'demo-x-good' : 'demo-x-mut');
      label(th, xx + 3, P.py(0) - 6 - i * 12, Math.round(T.pct) + '%', T.tau === 0.15 ? 'demo-x-good' : 'demo-x-mut', 9.5);
    });
    var R = 452, W = 324;
    var p1 = group(s);
    rich(p1, R, 64, '① 先在全集上训一个初始策略 $\\pi_0$', 13, 'demo-x-ink');
    label(p1, R, 90, '不筛，里面有很多做不到的动作', 'demo-x-ink2', 12);
    label(p1, R, 112, '它不必很好，只要能用来打分', 'demo-x-mut', 11);
    var p2 = group(s);
    rich(p2, R, 64, '② 用 $\\pi_0$ 跟一遍每段动作，打分：', 13, 'demo-x-ink');
    math(p2, R, 104, 'e(s) = 0.1\\,E_{\\text{key}}(s) + 0.9\\,E_{\\text{dof}}(s)', 14);
    label(p2, R, 136, '侧重下半身：关键点误差 + 关节角误差', 'demo-x-ink2', 12);
    label(p2, R, 158, '平衡和可行性主要由下半身决定；', 'demo-x-ink2', 12);
    label(p2, R, 180, '上半身再花哨也留着，保住多样性', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, '③ 按 e(s) 排序，画成累积分布', 'demo-x-ink', 13);
    label(p3, R, 90, '曲线前 85% 涨得慢，最后 15% 陡升', 'demo-x-ink2', 12);
    label(p3, R, 112, '最难的一小撮误差能到 0.37', 'demo-x-ink2', 12);
    label(p3, R, 140, '两个圆点是假设的例子：', 'demo-x-mut', 11);
    label(p3, R, 160, '走路排第 ' + Math.round(pctOf(eWalk)) + ' 百分位，侧手翻排最后约 1%', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 64, '④ 定几档阈值 τ，只留 e(s) ≤ τ', 'demo-x-ink', 13);
    TAUS.forEach(function (T, i) {
      chip(p4, R, 80 + i * 34, W, 'τ = ' + T.tau + '：留约 ' + Math.round(T.pct) + '%，约 ' + Math.round(T.pct / 100 * CMU.paper / 10) * 10 + ' 段',
        T.tau === 0.15 ? C_OURS : C_MUTED, { size: 11, left: true, h: 28 });
    });
    label(p4, R, 268, '竖线的位置是读图值，段数按 1,919 估的', 'demo-x-mut', 10.5);
    var p5 = group(s);
    rich(p5, R, 64, '⑤ 每档都从 $\\pi_0$ 接着训', 13, 'demo-x-ink');
    rich(p5, R, 90, '不从零开始，用上 $\\pi_0$ 学到的先验', 12, 'demo-x-ink2');
    math(p5, R, 126, '\\tau^* = \\arg\\max_\\tau\\ \\mathbb E_{s\\in\\mathcal D}[\\text{Perf}(\\pi_\\tau, s)]', 13);
    label(p5, R, 160, '全部在 CMU 全集上评，挑最好的一档', 'demo-x-ink2', 12);
    label(p5, R, 184, '论文说是贪心地试了五档', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var mv = ease(seg(t, 7.2, 8.4));
      sDots.forEach(function (o) {
        moveDot(o.d, [o.from[0] + (o.to[0] - o.from[0]) * mv, o.from[1]]);
        setOpacity(o.d, seg(t, 3.9 + o.k * 0.06, 4.1 + o.k * 0.06) * (1 - 0.6 * seg(t, 9.2, 9.6)));
      });
      setOpacity(unsorted, seg(t, 3.9, 4.3) * (1 - seg(t, 7.0, 7.3)));
      P.grow(seg(t, 8.4, 9.4));
      setOpacity(P.g, 0.25 + 0.75 * seg(t, 3.6, 4.0));
      setOpacity(ex, seg(t, 9.4, 10.0));
      spW.at(P.px(pctOf(eWalk)) - 30, P.py(eWalk) - 60, 40, loopFrame(now, WALK.n, WALK.fps));
      spF.at(P.px(pctOf(eFlip)) - 190, P.py(eFlip) + 30, 34, loopFrame(now, SHEETS.flip.n, 15));
      setOpacity(th, seg(t, 10.7, 11.3));
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 阈值扫一遍（图 4） ── */
  function buildSceneTau() {
    var s = sceneSvg('左边按论文图 4 的读图值画六条误差线：横轴是五档阈值和不筛的 π0，六条线都在 0.15 处最低、呈 U 形；右边依次是阈值太低、太高、刚好、留下多少、和表 II 对不上的几位小数');
    s.appendChild(svgText(24, 26, '五档阈值扫一遍：0.15 最好（论文图 4）', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 410, 360, C_BORDER, C_SURFACE2);
    var x = 76, y = 66, w = 330, h = 222, lo = 0.085, hi = 0.16;
    hline(left, x, y + h, x + w, y + h, C_BORDER, 1.2);
    hline(left, x, y, x, y + h, C_BORDER, 1.2);
    [0.09, 0.11, 0.13, 0.15].forEach(function (v) {
      var yy = y + h - (v - lo) / (hi - lo) * h;
      label(left, x - 6, yy + 4, v.toFixed(2), 'demo-x-mut', 9.5, 'end');
      hline(left, x, yy, x + w, yy, C_BORDER, 0.6, '2 3');
    });
    function px(i) { return x + 20 + i * (w - 40) / 5; }
    function py(v) { return y + h - (v - lo) / (hi - lo) * h; }
    var best = paint(svgEl('rect', { x: px(3) - 22, y: y, width: 44, height: h, rx: 6, opacity: 0.18 }), C_OURS);
    left.appendChild(best);
    FIG4_X.forEach(function (lab, i) { rich(left, px(i), y + h + 16, lab, 10, 'demo-x-ink2', 'middle'); });
    rich(left, x + w / 2, y + h + 36, '训练集的阈值 $\\tau$（$\\pi_0$ 是不筛）', 10, 'demo-x-mut', 'middle');
    var cols = [C_ACCENT, C_WARN, C_GOOD, C_BAD, C_PURPLE, C_MUTED];
    /* 图例：两排三列，和图 4 一样六种误差；关键点三条单位 m，关节角三条单位 rad */
    FIG4.forEach(function (sr, j) {
      var lx = 44 + (j % 3) * 128, ly = y + h + 58 + Math.floor(j / 3) * 20;
      hline(left, lx, ly - 4, lx + 20, ly - 4, cols[j], 2.4, j === 5 ? '5 3' : null);
      dotAt(left, lx + 10, ly - 4, 3, cols[j]);
      label(left, lx + 26, ly, sr.zh + '（' + sr.unit + '）', 'demo-x-ink2', 10);
    });
    var series = FIG4.map(function (sr, j) {
      var ptsS = [];
      sr.v.forEach(function (v, i) { if (v != null) ptsS.push([px(i), py(v)]); });
      var p = pathLine(left, ptsS, cols[j], 2.2, j === 5 ? '5 3' : null);
      var ds = ptsS.map(function (q) { return dotAt(left, q[0], q[1], 3.2, cols[j]); });
      return { p: p, ds: ds };
    });
    var R = 452, p1 = group(s);
    label(p1, R, 64, '阈值太低（0.075）：只剩约 14%', 'demo-x-ink', 13);
    label(p1, R, 90, '多半是静止、简单的动作：稳，但不够多样', 'demo-x-ink2', 12);
    label(p1, R, 112, '六种误差都比 0.15 高', 'demo-x-mut', 11);
    var p2 = group(s);
    rich(p2, R, 64, '阈值太高（0.175、不筛的 $\\pi_0$）', 13, 'demo-x-ink');
    label(p2, R, 90, '混进剧烈、不稳的动作，训练噪声大', 'demo-x-ink2', 12);
    rich(p2, R, 112, '$\\pi_0$ 的关节误差最高：0.134 rad（读图）', 11, 'demo-x-mut');
    var p3 = group(s);
    label(p3, R, 64, '适中（0.15）：六条线一起最低', 'demo-x-ink', 13);
    var rows = FIG4.map(function (sr, j) { return [sr.zh, sr.v[3], sr.unit, cols[j]]; });
    rows.forEach(function (r, j) {
      dotAt(p3, R + 6, 88 + j * 22, 4, r[3]);
      label(p3, R + 16, 92 + j * 22, r[0] + ' ' + f3(r[1]) + ' ' + r[2], 'demo-x-ink2', 11.5);
    });
    var p4 = group(s);
    label(p4, R, 64, '0.15 留下多少？', 'demo-x-ink', 13);
    label(p4, R, 90, '按图 8 的竖线约 77%，约 1,480 段', 'demo-x-ink2', 12);
    label(p4, R, 112, '只筛掉最难的约 23%', 'demo-x-ink2', 12);
    label(p4, R, 140, '比人工挑的 250 段（约 13%）宽松得多', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, '图 4 和表 II 差几位小数', 'demo-x-ink', 13);
    label(p5, R, 90, '0.15 的关节误差：图上 0.106，表 II 是 0.1079', 'demo-x-ink2', 12);
    rich(p5, R, 112, '$\\pi_0$：图上 0.134，表 II 不筛的版本 0.1355', 12, 'demo-x-ink2');
    label(p5, R, 140, '可能是不同的评测轮次，论文没说（我们发现的）', 'demo-x-mut', 11);
    label(p5, R, 162, '下半身关节角那条线在 0.175 处被图例挡住了', 'demo-x-mut', 11);
    function draw(t, clock) {
      var g = seg(t, 0.6, 2.0);
      series.forEach(function (sr) { setOpacity(sr.p, g); sr.ds.forEach(function (d) { setOpacity(d, g); }); });
      setOpacity(best, 0.2 * seg(t, 7.3, 7.8));
      void clock;
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 13: 专才：从通才微调（表 IV） ── */
  function buildSceneSpecialist() {
    var s = sceneSvg('左上是项目页的真机跳舞片段，左下依次出现微调的三条理由；右边：表 IV 四组数据上专才、从头训、通才的关节误差柱，专才比从头训低多少，难组和 ACCAD 上通才的速度误差反而最低，最后是项目页的真机勾拳片段');
    s.appendChild(svgText(24, 26, '专才：在一小组动作上，从通才接着微调（表 IV）', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'kpop', 28, 46, 352, 198, '项目页视频（真机，原速）：跳舞（K-pop）');
    var why = group(s);
    label(why, 28, 282, '为什么不从头训（论文的三条理由）：', 'demo-x-ink', 12.5);
    chip(why, 28, 294, 352, '① 热启动：难的动作从零可能学不会', C_OURS, { size: 11.5, left: true });
    chip(why, 28, 328, 352, '② 更抗扰动：通才见过的动作多，上真机更稳', C_OURS, { size: 11.5, left: true });
    chip(why, 28, 362, 352, '③ 省时间、省算力', C_OURS, { size: 11.5, left: true });
    var R = 404, W = 372;
    var p1 = group(s);
    label(p1, R, 64, '三种训法比一比', 'demo-x-ink', 13.5);
    chip(p1, R, 80, W, '**专才**：从通才（τ = 0.15）微调', C_OURS, { size: 12, left: true });
    chip(p1, R, 116, W, '**从头训**：同样的数据，总迭代数 = 预训练 + 微调', C_WARN, { size: 12, left: true });
    chip(p1, R, 152, W, '**通才**：不微调，直接用', C_MUTED, { size: 12, left: true });
    label(p1, R, 212, '四组数据：易、中、难（按动作剧烈程度人工分）', 'demo-x-ink2', 12);
    label(p1, R, 234, '和分布外的 ACCAD', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 64, '全身关节误差（rad，越低越好）', 'demo-x-ink', 13.5);
    var gb = T4.map(function (g, i) {
      var x = R + i * 93;
      var vb = vbars(p2, x, 84, 88, 170, g.rows.map(function (r) { return r[4]; }), [C_OURS, C_WARN, C_MUTED], { min: 0.04, max: 0.18, fmt: f3, gap: 5, vsize: 8.5 });
      label(p2, x + 44, 274, g.zh, 'demo-x-ink2', 11, 'middle');
      return vb;
    });
    var lg2 = group(p2);
    T4_METHODS.forEach(function (m, j) { dotAt(lg2, R + 10 + j * 90, 298, 5, [C_OURS, C_WARN, C_MUTED][j]); label(lg2, R + 20 + j * 90, 302, m, 'demo-x-mut', 10.5); });
    var p3 = group(s);
    label(p3, R, 64, '专才比从头训低多少（关节误差）', 'demo-x-ink', 13.5);
    var dBars = T4.map(function (g, i) {
      var v = -pct(g.rows[1][4], g.rows[0][4]);
      var b = barRowAt(p3, R, 84 + i * 30, 60, g.zh, C_OURS, 18);
      return { b: b, v: v };
    });
    label(p3, R, 222, '论文说「越难，微调的优势越大」；', 'demo-x-ink2', 12);
    label(p3, R, 244, '按表里的数，中等组最大，不是单调的（我们的读法）', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 64, '但剧烈的动作上，通才的速度误差最低', 'demo-x-ink', 13.5);
    var vh = vbars(p4, R, 84, 170, 150, T4[2].rows.map(function (r) { return r[0]; }), [C_OURS, C_WARN, C_MUTED], { min: 0, max: 0.2, fmt: f3, gap: 10, vsize: 9.5 });
    var va = vbars(p4, R + 196, 84, 170, 150, T4[3].rows.map(function (r) { return r[0]; }), [C_OURS, C_WARN, C_MUTED], { min: 0, max: 0.45, fmt: f3, gap: 10, vsize: 9.5 });
    label(p4, R + 85, 252, '难（m/s）', 'demo-x-ink2', 11, 'middle');
    label(p4, R + 281, 252, 'ACCAD（m/s）', 'demo-x-ink2', 11, 'middle');
    label(p4, R, 284, '论文：通才见过更多动作，速度跟得更好', 'demo-x-mut', 11);
    var p5 = group(s);
    var clip2 = projClip(p5, 'punch', R, 50, 132, 198, '');
    label(p5, R + 66, 266, '项目页视频（真机）：勾拳', 'demo-x-mut', 9.5, 'middle');
    label(p5, R + 150, 70, '功夫这一组也有自己的专才', 'demo-x-ink2', 12);
    label(p5, R + 150, 104, '怎么挑专才？引言说可以用', 'demo-x-ink2', 12);
    label(p5, R + 150, 126, '动作标签或动作识别模型，', 'demo-x-ink2', 12);
    label(p5, R + 150, 148, '但没有做这一步的实验', 'demo-x-ink2', 12);
    label(p5, R + 150, 184, 'ACCAD 的专才拿什么微调，', 'demo-x-mut', 11);
    label(p5, R + 150, 204, '论文也没写（我们的疑问）', 'demo-x-mut', 11);
    function draw(t, clock) {
      clip.at(K.clipSince(t, 0), true);
      setOpacity(why, seg(t, 0.6, 1.0));
      gb.forEach(function (vb) { vb.set(seg(t, 3.9, 4.7)); });
      var p = seg(t, 7.3, 8.1);
      dBars.forEach(function (d) { d.b.set(d.v * 12 * p, '−' + f1(d.v) + '%'); });
      vh.set(seg(t, 10.7, 11.5)); va.set(seg(t, 10.7, 11.5));
      clip2.at(K.clipSince(t, 13.4), t > 13.4);
      panels(t, [p1, p2, p3, p4, p5]);
      void clock;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 14: Cha-Cha（图 5） ── */
  function buildSceneChacha() {
    var s = sceneSvg('论文图 5：先是恰恰舞的五个时刻，三排依次是 SMPL 参考、仿真、真机，讲到哪一排就框出哪一排；第三、四段把下面三排逐帧关节误差曲线放大到整个宽度，蓝线专才、橙线从头训、绿线通才；最后回到五个时刻，右边是 v1 的对比');
    s.appendChild(svgText(24, 26, '恰恰（Cha-Cha）：专才几乎整段最低（论文图 5）', 'demo-x-ink2', 13.5));
    var top = group(s);
    var L = paperPart(top, 'fig5', 0.212, 0, 0.936, 0.63, 28, 46, 360);
    var rowsY = [[0, 0.2], [0.2, 0.415], [0.415, 0.63]];
    var hl = paint(svgEl('rect', { x: 24, y: 0, width: 368, height: 10, rx: 6, fill: 'none', 'stroke-width': 3 }), null, C_ACCENT);
    top.appendChild(hl);
    var rowZh = ['SMPL 参考', '仿真', '真机'];
    var R = 412, W = 364;
    var p1 = group(s);
    label(p1, R, 64, '舞蹈组里一段有代表性的：恰恰', 'demo-x-ink', 13.5);
    label(p1, R, 90, '下半身动作剧烈，上半身动作丰富', 'demo-x-ink2', 12);
    label(p1, R, 116, '比三种训法：', 'demo-x-ink2', 12);
    chip(p1, R, 128, W, '专才：在舞蹈数据上从通才微调', C_ACCENT, { size: 11.5, left: true });
    chip(p1, R, 164, W, '从头训：同样的舞蹈数据', C_WARN, { size: 11.5, left: true });
    chip(p1, R, 200, W, '通才：在筛过的 CMU 上训的', C_GOOD, { size: 11.5, left: true });
    var p2 = group(s);
    label(p2, R, 64, '左边三排：同一段舞的五个时刻', 'demo-x-ink', 13.5);
    rowZh.forEach(function (z, i) { chip(p2, R, 82 + i * 36, 180, (i + 1) + ' · ' + z, [C_ACCENT, C_WARN, C_GOOD][i], { size: 11.5 }); });
    label(p2, R, 212, '参考是 SMPL 人体；仿真和真机都是专才', 'demo-x-mut', 11);
    /* 第三、四段：误差曲线铺满整个宽度（图 5 下面三排，原图里只有这一块的 1/3 高） */
    var big = group(s);
    var E = paperPart(big, 'fig5', 0, 0.645, 1, 1, 28, 46, 744);
    var p3 = group(s);
    label(p3, 28, 46 + E.h + 30, '三排依次是全身、上半身、下半身的关节误差（rad），横轴是时间（s）', 'demo-x-ink2', 12);
    label(p3, 28, 46 + E.h + 52, '同一段恰恰，三种训法各跟一遍', 'demo-x-mut', 11);
    var p4 = group(s);
    [['蓝（专才）几乎整段最低：全身误差多在 0.05 上下', C_ACCENT], ['绿（通才）常到 0.10 左右；橙（从头训）在两者之间（读图）', C_GOOD]].forEach(function (r, j) {
      dotAt(p4, 34, 46 + E.h + 26 + j * 24, 4.5, r[1]);
      label(p4, 46, 46 + E.h + 30 + j * 24, r[0], 'demo-x-ink2', 12);
    });
    label(p4, 28, 46 + E.h + 80, '论文：微调能抓住细节，同时保持稳定', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, 'v1 也画了这段恰恰', 'demo-x-ink', 13.5);
    label(p5, R, 90, '但比的是四个方法：ExBody2、ExBody†、', 'demo-x-ink2', 12);
    label(p5, R, 112, 'ExBody、OmniH2O*；第一排是速度误差', 'demo-x-ink2', 12);
    label(p5, R, 146, 'v2 换成了专才 / 从头 / 通才，', 'demo-x-ink2', 12);
    label(p5, R, 168, '用来说明微调的好处', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var idx = t < 3.6 ? -1 : t < 4.8 ? 0 : t < 6.0 ? 1 : t < 7.0 ? 2 : -1;
      if (idx >= 0) {
        hl.setAttribute('y', (46 + rowsY[idx][0] / 0.63 * L.h - 3).toFixed(1));
        hl.setAttribute('height', ((rowsY[idx][1] - rowsY[idx][0]) / 0.63 * L.h + 6).toFixed(1));
        hl.style.stroke = [C_ACCENT, C_WARN, C_GOOD][idx];
      }
      setOpacity(hl, idx >= 0 ? 1 : 0);
      setOpacity(top, Math.min(1, 1 - seg(t, 7.0, 7.3) + seg(t, 13.7, 14.0)));
      setOpacity(big, win(t, 7.0, 13.4));
      panels(t, [p1, p2, p3, p4, p5]);
      void clock;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 15: 和基线比（表 II、表 III） ── */
  function buildSceneBaselines() {
    var s = sceneSvg('左边两组柱：上面是仿真（表 II）、下面是真机（表 III）的全身关节误差，五个方法；右边依次是基线、仿真里的数、速度的代价、真机的数，最后是项目页的 SMPL → 仿真 → 真机片段');
    s.appendChild(svgText(24, 26, '和基线比：仿真表 II、真机表 III', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 400, 360, C_BORDER, C_SURFACE2);
    var names = ['ExBody', 'ExBody†', 'OmniH2O*', '不筛数据', 'ExBody2'], cols = [C_MUTED, C_MUTED, C_MUTED, C_WARN, C_OURS];
    label(left, 40, 62, '仿真（CMU 全集）· 全身关节误差（rad）', 'demo-x-ink2', 11.5);
    var simB = vbars(left, 40, 74, 368, 110, T2.map(function (r) { return r.v[4]; }), cols, { min: 0, max: 0.25, fmt: f4, names: names, vsize: 10 });
    label(left, 40, 242, '真机（挑出的一组动作）· 全身关节误差（rad）', 'demo-x-ink2', 11.5);
    var realB = vbars(left, 40, 254, 368, 110, T3.map(function (r) { return r.v[0]; }), cols, { min: 0, max: 0.26, fmt: f4, names: names, vsize: 10 });
    var R = 444, W = 332;
    var p1 = group(s);
    label(p1, R, 64, '对比的四个', 'demo-x-ink', 13.5);
    chip(p1, R, 80, W, 'ExBody：只跟上身，没有教师—学生，5 步历史', C_MUTED, { size: 11, left: true });
    chip(p1, R, 114, W, 'ExBody†：ExBody 的全身版', C_MUTED, { size: 11, left: true });
    chip(p1, R, 148, W, 'OmniH2O*：复现，训练时跟全局关键点', C_MUTED, { size: 11, left: true });
    chip(p1, R, 182, W, 'ExBody2 不筛数据：在全集上训', C_WARN, { size: 11, left: true });
    label(p1, R, 236, '每段动作在仿真里循环 10 遍取平均', 'demo-x-mut', 11);
    var p2 = group(s);
    label(p2, R, 64, '仿真：七项里六项最好', 'demo-x-ink', 13.5);
    label(p2, R, 92, '全身关节误差 0.1079 rad', 'demo-x-ink2', 12);
    label(p2, R, 116, '比 ExBody† 低 ' + f1(-pct(T2[1].v[4], T2[4].v[4])) + '%，比 OmniH2O* 低 ' + f1(-pct(T2[2].v[4], T2[4].v[4])) + '%', 'demo-x-ink2', 12);
    label(p2, R, 140, '不筛 → 筛：' + f4(T2[3].v[4]) + ' → ' + f4(T2[4].v[4]) + '（−' + f1(-pct(T2[3].v[4], T2[4].v[4])) + '%）', 'demo-x-ink2', 12);
    label(p2, R, 170, '下半身提升最明显：0.1579 → 0.1253', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, '唯一的代价：速度误差', 'demo-x-ink', 13.5);
    var vb = vbars(p3, R + 20, 84, 260, 110, [T2[3].v[0], T2[4].v[0]], [C_WARN, C_OURS], { min: 0, max: 0.32, fmt: f4, names: ['不筛数据', 'ExBody2'], gap: 50 });
    label(p3, R, 236, '0.2787 → 0.2930（m/s，+5.1%）', 'demo-x-ink2', 12);
    label(p3, R, 258, '论文：全集的速度模式更广，也带来噪声', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 64, '真机：三项都最好', 'demo-x-ink', 13.5);
    label(p4, R, 92, '全身 0.1074、上半身 0.1092、下半身 0.1054', 'demo-x-ink2', 12);
    label(p4, R, 116, '不筛 → 筛：−' + f1(-pct(T3[3].v[0], T3[4].v[0])) + '%；比 OmniH2O* 低 ' + f1(-pct(T3[2].v[0], T3[4].v[0])) + '%', 'demo-x-ink2', 12);
    label(p4, R, 146, '用板载电机读数算的（真机只有关节角）', 'demo-x-mut', 11);
    label(p4, R, 168, '挑了哪些动作、测几遍，论文没写', 'demo-x-mut', 11);
    var p5 = group(s);
    var clip = projClip(p5, 'expressive', R, 50, 332, 187, '');
    label(p5, R + 166, 256, '项目页视频（原速）：SMPL → 仿真 → 真机', 'demo-x-mut', 10, 'middle');
    label(p5, R, 290, '上身各种动作，下身稳稳地站着', 'demo-x-ink2', 12);
    function draw(t, clock) {
      simB.set(seg(t, 0.6, 1.6));
      realB.set(seg(t, 10.7, 11.5));
      setOpacity(realB.g, seg(t, 10.4, 10.8));
      vb.set(seg(t, 7.3, 8.1));
      clip.at(K.clipSince(t, 13.4), t > 13.4);
      panels(t, [p1, p2, p3, p4, p5]);
      void clock;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 16: 消融：历史长度与 DAgger（表 XI） ── */
  function buildSceneAblation() {
    var s = sceneSvg('左边两组柱：上面是五种历史长度的速度误差，下面是关节误差；右边依次是不用历史、太长、50 步、去掉 DAgger，以及去掉 DAgger 那一行和表 II 的 ExBody† 一行七个数完全相同');
    s.appendChild(svgText(24, 26, '消融：历史取几步、要不要 DAgger（附录表 XI）', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 400, 360, C_BORDER, C_SURFACE2);
    var nm = T11_HIST.map(function (r) { return r.n + ' 步'; }), cols = T11_HIST.map(function (r) { return r.n === 10 ? C_OURS : C_MUTED; });
    label(left, 40, 62, '速度误差（m/s）', 'demo-x-ink2', 11.5);
    var vB = vbars(left, 40, 74, 368, 110, T11_HIST.map(function (r) { return r.v[0]; }), cols, { min: 0, max: 0.5, fmt: f4, names: nm, vsize: 10 });
    label(left, 40, 242, '全身关节误差（rad）', 'demo-x-ink2', 11.5);
    var jB = vbars(left, 40, 254, 368, 110, T11_HIST.map(function (r) { return r.v[4]; }), cols, { min: 0.09, max: 0.13, fmt: f4, names: nm, vsize: 10 });
    label(left, 408, 230, '纵轴从 0.09 起', 'demo-x-mut', 9.5, 'end');
    var R = 444, W = 332;
    var p1 = group(s);
    label(p1, R, 64, '不给历史：速度跟不上', 'demo-x-ink', 13.5);
    label(p1, R, 92, '0 步的速度误差 0.4151，是 10 步的 ' + f2(T11_HIST[0].v[0] / T11_HIST[1].v[0]) + ' 倍', 'demo-x-ink2', 12);
    label(p1, R, 116, '学生没有真实根速度，只能从历史里推', 'demo-x-mut', 11);
    var p2 = group(s);
    label(p2, R, 64, '太长也不好：100 步全面变差', 'demo-x-ink', 13.5);
    label(p2, R, 92, '关节误差 0.1225，比 10 步高 ' + f1(pct(T11_HIST[1].v[4], T11_HIST[4].v[4])) + '%', 'demo-x-ink2', 12);
    label(p2, R, 116, '论文：越长越难拟合特权信息', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, '50 步：速度误差最低（0.2648）', 'demo-x-ink', 13.5);
    label(p3, R, 92, '但关节误差 0.1114 不如 10 步', 'demo-x-ink2', 12);
    label(p3, R, 116, '论文取整体最好的 10 步', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 64, '去掉 DAgger：全面变差', 'demo-x-ink', 13.5);
    label(p4, R, 92, '速度 0.4195、关键点 0.1150、关节 0.1496', 'demo-x-ink2', 12);
    label(p4, R, 116, '论文：没有特权的速度引导，学生只能从', 'demo-x-mut', 11);
    label(p4, R, 136, '原始观测直接学速度跟踪', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, '可是这一行……', 'demo-x-ink', 13.5);
    label(p5, R, 92, '表 XI 去掉 DAgger：', 'demo-x-ink2', 11.5);
    label(p5, R, 164, '表 II 的 ExBody†：', 'demo-x-ink2', 11.5);
    T11_NODAGGER.forEach(function (v, i) {
      label(p5, R + (i % 4) * 82, 114 + Math.floor(i / 4) * 21, f4(v), 'demo-x-bad', 11);
      label(p5, R + (i % 4) * 82, 186 + Math.floor(i / 4) * 21, f4(T2[1].v[i]), 'demo-x-bad', 11);
    });
    label(p5, R, 244, '七个数一字不差（我们发现的）', 'demo-x-ink', 12);
    label(p5, R, 266, '巧合还是贴错了行，论文没交代', 'demo-x-mut', 11);
    function draw(t, clock) {
      vB.set(seg(t, 0.6, 1.6));
      jB.set(seg(t, 3.9, 4.9));
      setOpacity(jB.g, seg(t, 3.6, 4.0));
      panels(t, [p1, p2, p3, p4, p5]);
      void clock;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 17: 动作从哪来、怎么部署 ── */
  function buildSceneSources() {
    var s = sceneSvg('左边先是论文附录图 6 的动作来源那一块（头显、RGB 摄像头、动捕服、生成模型）；从第二段起换成项目页的真机片段：一台普通摄像头拍人，HybrIK 估计姿态，G1 实时模仿着搬箱子，第三段下面再出现图 6 的动作生成那一块；右边依次是几种来源、单目实时模仿、CVAE、部署的时间线');
    s.appendChild(svgText(24, 26, '动作从哪来、怎么上真机（附录 A、D）', 'demo-x-ink2', 13.5));
    var cg = group(s), clip = projClip(cg, 'box', 28, 46, 352, 198, '项目页视频（真机，原速）：单目 RGB 实时模仿，搬箱子');
    var fsrc = group(s), F6 = paperPart(fsrc, 'fig6', 0, 0, 0.36, 0.72, 79, 46, 250);
    label(fsrc, 79 + F6.w / 2, 46 + F6.h + 17, '附录图 6：多种动作来源', 'demo-x-mut', 9.5, 'middle');
    var fsyn = group(s), F6c = paperPart(fsyn, 'fig6', 0, 0.73, 1, 1, 28, 290, 352);
    label(fsyn, 204, 290 + F6c.h + 18, '附录图 6 (c)：CVAE 生成接下来的动作', 'demo-x-mut', 9.5, 'middle');
    var R = 404, W = 372;
    var p1 = group(s);
    label(p1, R, 64, '同一个策略，参考可以从几处来', 'demo-x-ink', 13.5);
    chip(p1, R, 82, W, '① 动捕库：按类别微调的专才（功夫、跳舞）', C_OURS, { size: 11.5, left: true });
    chip(p1, R, 118, W, '② 单目 RGB：实时估计人的姿态', C_ACCENT, { size: 11.5, left: true });
    chip(p1, R, 154, W, '③ 生成模型：CVAE 接着往下编', C_PURPLE, { size: 11.5, left: true });
    label(p1, R, 210, '图里还画了 VR 和动捕服', 'demo-x-mut', 11);
    var p2 = group(s);
    label(p2, R, 64, '单目 RGB 实时模仿', 'demo-x-ink', 13.5);
    ['一台摄像头', 'HybrIK：三维姿态', '重定向到 G1', 'ExBody2 策略'].forEach(function (n, i) {
      chip(p2, R, 82 + i * 40, 220, n, C_ACCENT, { size: 11.5 });
      if (i < 3) { var a = arrow(p2, C_MUTED, 2); a.set(R + 110, 112 + i * 40, R + 110, 120 + i * 40, 6); }
    });
    label(p2, R, 262, '比多相机动捕轻；估计不如它准，', 'demo-x-ink2', 12);
    label(p2, R, 284, '论文说策略对带噪信号鲁棒，下身也稳', 'demo-x-ink2', 12);
    var p3 = group(s);
    label(p3, R, 64, 'CVAE：给过去的动作，生成接下来的', 'demo-x-ink', 13.5);
    label(p3, R, 92, '生成的帧和动捕一样重定向，策略看不出区别', 'demo-x-ink2', 12);
    label(p3, R, 116, '机器人就能连续做下去，不靠固定的动作库', 'demo-x-ink2', 12);
    label(p3, R, 150, 'v1 的细节：过去 M 步预测未来 H 步，', 'demo-x-mut', 11);
    rich(p3, R, 170, '损失 $l_{\\text{recon}}+0.5\\,l_{\\text{KL}}+0.5\\,l_{\\text{smooth}}$，推理时 $z=0$', 11, 'demo-x-mut');
    var p4 = group(s);
    label(p4, R, 64, '部署：Unitree G1 + Jetson Orin NX', 'demo-x-ink', 13.5);
    var TX = R + 10, TW = 340, TY = 110;
    hline(p4, TX, TY, TX + TW, TY, C_BORDER, 1.4);
    for (var k = 0; k <= 3; k++) {
      var xx = TX + k * TW / 3;
      hline(p4, xx, TY - 14, xx, TY + 14, C_OURS, 2.4);
      label(p4, xx, TY - 20, (k * 20) + ' ms', 'demo-x-mut', 10, 'middle');
    }
    for (var m = 0; m <= 30; m++) hline(p4, TX + m * TW / 30, TY - 4, TX + m * TW / 30, TY + 4, C_MUTED, 0.8);
    var dly = paint(svgEl('rect', { x: TX + 18 / 60 * TW, y: TY + 22, width: 12 / 60 * TW, height: 12, rx: 3, opacity: 0.6 }), C_WARN);
    p4.appendChild(dly);
    label(p4, TX + 24 / 60 * TW, TY + 50, '指令延迟 18–30 ms', 'demo-x-ink2', 11, 'middle');
    label(p4, R, 196, '绿线：策略 50 Hz，每步 20 ms', 'demo-x-ink2', 12);
    label(p4, R, 218, '细刻度：底层 500 Hz，每步 PD 跑 10 次', 'demo-x-ink2', 12);
    label(p4, R, 240, '策略和底层接口之间用 LCM 通信', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, '时间账', 'demo-x-ink', 13.5);
    label(p5, R, 92, '50 Hz → 每步 20 ms', 'demo-x-ink2', 12);
    label(p5, R, 116, '延迟 18–30 ms → 晚 0.9–1.5 步', 'demo-x-ink2', 12);
    label(p5, R, 140, '500 Hz ÷ 50 Hz = 每步 PD 跑 10 次', 'demo-x-ink2', 12);
    label(p5, R, 174, '论文没写的：域随机化范围、环境数、', 'demo-x-mut', 11);
    label(p5, R, 194, '训练多少次迭代', 'demo-x-mut', 11);
    function draw(t, clock) {
      clip.at(K.clipSince(t, 3.6), t > 3.6);
      setOpacity(cg, win(t, 3.6));
      setOpacity(fsrc, win(t, 0, 3.6));
      setOpacity(fsyn, win(t, 7.0));
      panels(t, [p1, p2, p3, p4, p5]);
      void clock;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 18: 局限与没说清的地方 ── */
  function buildSceneLimits() {
    var s = sceneSvg('左边先是三个专才（走路、跳舞、功夫）各管一组、中间的切换打了叉，再依次换成：G1 身上我们推测的 12 个关键点（实心 6 个是前作 ExBody 用的）、速度方向那一项按字面和按原意随夹角怎么变、表 II 与表 XI 里完全相同的两行；右边依次是论文写的局限、以后的方向、方法里没写的三处、速度方向那一项、几处对不上的数');
    s.appendChild(svgText(24, 26, '局限，和论文没说清的地方', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 360, 360, C_BORDER, C_SURFACE2);
    /* 左 ①（0–7.0）：三个专才各管一组 */
    var lA = group(left);
    var specs = [['走路专才', 'walk', 90], ['跳舞专才', 'chicken', 204], ['功夫专才', 'macarena', 318]];
    var sps = specs.map(function (sp) {
      var g = group(lA);
      rectBox(g, sp[2] - 52, 62, 104, 190, C_OURS, C_SURFACE);
      label(g, sp[2], 82, sp[0], 'demo-x-ink', 11.5, 'middle');
      return { s: sprite(g, sp[1]), x: sp[2], key: sp[1] };
    });
    var xs = group(lA);
    [[142, 156], [256, 270]].forEach(function (p) {
      var a = arrow(xs, C_MUTED, 2); a.set(p[0], 160, p[1], 160, 6);
      var cx = (p[0] + p[1]) / 2;
      hline(xs, cx - 5, 175, cx + 5, 185, C_BAD, 2.2); hline(xs, cx - 5, 185, cx + 5, 175, C_BAD, 2.2);
    });
    label(lA, 204, 292, '一次跟踪里在专才之间切换，', 'demo-x-ink2', 12, 'middle');
    label(lA, 204, 314, '动作类型之间的过渡可能不顺', 'demo-x-ink2', 12, 'middle');
    label(lA, 204, 352, '（示意：框里是我们重定向的 G1）', 'demo-x-mut', 10, 'middle');
    /* 左 ②（7.0–10.4）：推测的 12 个关键点。ExBody 的 h1_mimic.py 定义了 12 个关键体，只取肩、肘、手 6 个 */
    var lB = group(left);
    var GY = 368, SC = 150;
    var ground = groundTicks(lB, 40, 368, GY), bot = sprite(lB, 'walk');
    var kpD = KP_ZH.map(function (n, i) { return i < 6 ? dotAt(lB, 0, 0, 4.2, C_EXP, C_SURFACE) : dotAt(lB, 0, 0, 4.2, C_SURFACE, C_EXP); });
    kpD.slice(6).forEach(function (c) { c.setAttribute('stroke-width', 2); });
    dotAt(lB, 44, 57, 4.2, C_EXP, C_SURFACE);
    label(lB, 54, 61, '实心：ExBody 跟的 6 个（两肩、两肘、两手）', 'demo-x-ink2', 11);
    var hollow = dotAt(lB, 44, 79, 4.2, C_SURFACE, C_EXP); hollow.setAttribute('stroke-width', 2);
    label(lB, 54, 83, '空心：代码里也定义了、没用（两髋、两膝、两踝）', 'demo-x-ink2', 11);
    label(lB, 40, 105, '我们推测 ExBody2 跟全身，12 个都用', 'demo-x-mut', 10.5);
    /* 左 ③（10.4–13.4）：速度方向那一项随夹角 θ 怎么变；θ 按真实时间 0° → 180° → 0° 来回转 */
    var lC = group(left);
    rich(lC, 40, 62, '机器人速度偏离参考方向 $\\theta$ 时，这一项得几分', 11.5, 'demo-x-ink2');
    var O = [204, 196], VL = 104;
    var aRef = arrow(lC, C_REF, 3); aRef.set(O[0], O[1], O[0] + VL, O[1], 10);
    label(lC, O[0] + VL + 6, O[1] + 4, '参考', 'demo-x-bad', 11);
    var aV = arrow(lC, C_MOV, 3);
    var vTag = label(lC, 0, 0, '机器人', 'demo-x-ink2', 11, 'middle');
    var arc = pathLine(lC, [], C_MUTED, 1.4);
    /* 夹角的读数放在右上角固定的位置，不跟着弧走（小角度时会压住「机器人」） */
    rich(lC, 300, 104, '夹角 $\\theta$', 11.5, 'demo-x-mut', 'end');
    var thTag = label(lC, 306, 104, '', 'demo-x-ink', 12);
    rich(lC, 40, 252, '按字面 $\\exp(-4\\cos\\theta)$', 11.5, 'demo-x-ink2');
    var litV = label(lC, 368, 252, '', 'demo-x-bad', 12, 'end');
    var litB = hbar(lC, 40, 260, 12, C_REF);
    rich(lC, 40, 302, '原意 $\\exp(-4(1-\\cos\\theta))$', 11.5, 'demo-x-ink2');
    var fixV = label(lC, 368, 302, '', 'demo-x-good', 12, 'end');
    var fixB = hbar(lC, 40, 310, 12, C_OURS);
    label(lC, 40, 350, '条满格：按字面 54.6，原意 1', 'demo-x-mut', 10.5);
    label(lC, 40, 372, '「原意」是我们的推断，没有代码可以核对', 'demo-x-mut', 10.5);
    /* 左 ④（13.4–）：表 II 的 ExBody† 与表 XI 的「去掉 DAgger」，7 个数一个不差 */
    var lD = group(left);
    label(lD, 40, 62, '同一组 7 个数，出现在两个设置下', 'demo-x-ink2', 12);
    label(lD, 40, 92, '表 II · ExBody†（ExBody 的全身版）', 'demo-x-ink', 11.5);
    var COLS = ['速度', '关键点', '上', '下', '关节', '上', '下'], CX = 36, CS = 48.5, CW = 45;
    COLS.forEach(function (c, i) { label(lD, CX + i * CS + CW / 2, 112, c, 'demo-x-mut', 10, 'middle'); });
    var T2B = T2.filter(function (r) { return r.zh === 'ExBody†'; })[0].v;
    T2B.forEach(function (v, i) { chip(lD, CX + i * CS, 120, CW, v.toFixed(4), C_MUTED, { size: 10, h: 26 }); });
    var eqs = T11_NODAGGER.map(function (v, i) {
      var g = group(lD);
      label(g, CX + i * CS + CW / 2, 168, '=', 'demo-x-good', 15, 'middle');
      chip(g, CX + i * CS, 176, CW, v.toFixed(4), C_OURS, { size: 10, h: 26 });
      return g;
    });
    label(lD, 40, 226, '表 XI · ExBody2 去掉 DAgger', 'demo-x-ink', 11.5);
    label(lD, 40, 268, '一个是前作的全身版，一个是本文的消融；', 'demo-x-ink2', 12);
    label(lD, 40, 290, '是同一次实验还是贴错了行，论文没交代', 'demo-x-ink2', 12);
    label(lD, 40, 330, '（我们发现的）', 'demo-x-mut', 10.5);
    var R = 404, W = 372;
    var p1 = group(s);
    label(p1, R, 64, '论文写的局限', 'demo-x-ink', 13.5);
    label(p1, R, 92, '通才覆盖广，但达不到每个专才的精度', 'demo-x-ink2', 12);
    label(p1, R, 116, '专才之间不能无缝组合、切换', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 64, '以后的方向（论文自己提的）', 'demo-x-ink', 13.5);
    label(p2, R, 92, '一个动态整合的机制：', 'demo-x-ink2', 12);
    label(p2, R, 116, '实时混合或切换专才，通才的覆盖面 +', 'demo-x-ink2', 12);
    label(p2, R, 140, '专才的精度，两全', 'demo-x-ink2', 12);
    var p3 = group(s);
    label(p3, R, 64, '没说清 ①：方法里没写的三处', 'demo-x-ink', 13.5);
    chip(p3, R, 80, W, '重定向：只写了「重定向到 G1」', C_WARN, { size: 11.5, left: true });
    label(p3, R, 128, '我们用 ASAP 开源的脚本复现（第 4 幕）', 'demo-x-mut', 11);
    chip(p3, R, 144, W, '12 个关键点：只写了 36 维', C_WARN, { size: 11.5, left: true });
    label(p3, R, 192, '我们推测是 ExBody 代码里定义的那 12 个：', 'demo-x-ink2', 11.5);
    label(p3, R, 213, '左右的肩、肘、手、髋、膝、踝（左图）', 'demo-x-ink2', 11.5);
    rich(p3, R, 234, 'ExBody 只用上身 6 个（`h1_mimic.py` 第 78–82 行）', 10.5, 'demo-x-mut');
    chip(p3, R, 252, W, '漂多久、多久拉回一次：没写', C_WARN, { size: 11.5, left: true });
    label(p3, R, 300, '第 7、8 幕按每 1 s 拉回一次假设', 'demo-x-mut', 11);
    label(p3, R, 321, '第一版有拉回的消融，第二版删了', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 64, '没说清 ②：速度方向那一项', 'demo-x-ink', 13.5);
    math(p4, R, 100, '6.0\\cdot\\exp(-4.0\\cos(\\mathbf v_{\\text{ref}},\\mathbf v))', 14);
    rich(p4, R, 128, '表 I 原文，没定义 $\\cos(\\cdot,\\cdot)$ 指什么', 11, 'demo-x-mut');
    label(p4, R, 160, '按夹角余弦算：同向 0.018，反向 54.6', 'demo-x-ink2', 12);
    label(p4, R, 182, '越往反方向走，奖励越高', 'demo-x-bad', 12);
    label(p4, R, 218, '作者的意图应是「方向对齐」：', 'demo-x-ink', 12.5);
    label(p4, R, 242, '① 正文说这一项是在跟踪方向', 'demo-x-ink2', 11.5);
    rich(p4, R, 264, '② 表 I 其余五项都是 $\\exp(-c\\cdot\\text{误差})$', 11.5, 'demo-x-ink2');
    label(p4, R, 286, '③ ExBody 代码里的方向奖励：对齐时最大', 'demo-x-ink2', 11.5);
    math(p4, R, 324, '\\exp(-4(1-\\cos\\theta))', 14);
    label(p4, R + 190, 324, '同向 1，反向 0.0003', 'demo-x-good', 11.5);
    label(p4, R, 352, '（我们的推断；没有代码可以核对）', 'demo-x-mut', 10.5);
    var p5 = group(s);
    label(p5, R, 64, '没说清 ③：几处数对不上，也没有代码', 'demo-x-ink', 13.5);
    chip(p5, R, 80, W, '表 XI「去掉 DAgger」= 表 II 的 ExBody†', C_WARN, { size: 11.5, left: true });
    label(p5, R, 128, '7 个数一个不差（左图）', 'demo-x-mut', 11);
    chip(p5, R, 144, W, '阈值 0.15 的关节误差：图 4 读 0.106，表 II 写 0.1079', C_WARN, { size: 11.5, left: true });
    chip(p5, R, 186, W, 'CMU：论文写 1,919 段，AMASS 里是 2,082 段', C_WARN, { size: 11.5, left: true });
    label(p5, R, 234, '差的 163 段没交代', 'demo-x-mut', 11);
    chip(p5, R, 250, W, '没有代码：环境数、迭代次数、随机化范围都没给', C_WARN, { size: 11.5, left: true });
    label(p5, R, 298, '所以前面凡是论文没写的，都标了「推测」或「假设」', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(lA, 1 - seg(t, 7.0, 7.3));
      setOpacity(lB, win(t, 7.0, 10.4));
      setOpacity(lC, win(t, 10.4, 13.4));
      setOpacity(lD, win(t, 13.4));
      if (t < 7.4) {
        sps.forEach(function (sp) {
          var M = SHEETS[sp.key];
          sp.s.at(sp.x, 238, sp.key === 'walk' ? 92 : 100, sp.key === 'walk' ? loopFrame(now, M.n, 15) : pingFrame(now, M.n, 15));
        });
        setOpacity(xs, seg(t, 0.8, 1.2));
      }
      if (t > 6.9 && t < 10.8) {
        var k = loopFrame(now, WALK.n, WALK.fps), f = walkFrame(k);
        var cam = camOf('walk', SC, 190, GY, f.root[0], f.root[1]);
        ground.put(f.root, cam);
        bot.put(f.root, cam, k);
        f.kp.forEach(function (p, i) { moveDot(kpD[i], project(p, cam)); });
      }
      if (t > 10.3 && t < 13.8) {
        var th = Math.PI / 2 * (1 - Math.cos(2 * Math.PI * Math.max(0, now - 10.4) / 8)), c = Math.cos(th);
        /* 机器人的箭头比参考短一点，同向时也看得见参考的箭头；标签放在箭头中段的法向上，不和「参考」挤在一起 */
        var VV = 0.82 * VL, sn = Math.sin(th), tip = [O[0] + VV * c, O[1] - VV * sn];
        aV.set(O[0], O[1], tip[0], tip[1], 10);
        vTag.setAttribute('x', (O[0] + 0.55 * VV * c - 20 * sn).toFixed(1));
        vTag.setAttribute('y', (O[1] - 0.55 * VV * sn - 16 * c + 4).toFixed(1));
        var pts = [];
        for (var q = 0; q <= 24; q++) { var a = th * q / 24; pts.push([O[0] + 30 * Math.cos(a), O[1] - 30 * Math.sin(a)]); }
        setPath(arc, pts);
        thTag.textContent = Math.round(th * 180 / Math.PI) + '°';
        var lit = Math.exp(-4 * c), fix = Math.exp(-4 * (1 - c));
        setW(litB, 328 * lit / Math.exp(4)); litV.textContent = lit < 1 ? lit.toFixed(3) : lit.toFixed(1);
        setW(fixB, 328 * fix); fixV.textContent = fix < 0.001 ? fix.toFixed(4) : fix.toFixed(3);
      }
      eqs.forEach(function (g, i) { setOpacity(g, seg(t, 13.9 + i * 0.25, 14.2 + i * 0.25)); });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  var EXBODY2_SCENES = [
    {
      title: '表现力和稳定，要兼得',
      dur: 16,
      build: buildSceneProblem,
      cues: [
        { at: 0.4, s: '想让真实的人形机器人照着人体动作做：跳舞、出拳、蹲下、大步走——全身都像人，还得**稳稳站住**。' },
        { at: 3.6, s: '难处之一：人和机器人的身体不一样，动力学、运动学都有差距——人能做的动作，机器人不一定做得到。' },
        { at: 7.0, s: '论文图 1：从站立迈大步、43 秒的长舞、侧步、不同高度的出拳、上身动作、右勾拳，都在真机 G1 上。' },
        { at: 10.4, s: 'ExBody2：UC San Diego、UC Berkeley、MIT，arXiv 2412.13196；本片按 v2 讲，官方没有开源代码。' },
        { at: 13.4, s: '问题：**一个策略**跟任意的人体参考动作，在真机上全身都做出来，又像又稳。' }
      ]
    },
    {
      title: '前人卡在哪',
      dur: 16,
      build: buildScenePrior,
      cues: [
        { at: 0.4, s: '前作 ExBody 只让**上半身**照着人做，腿只跟速度和姿态，步子不像人。' },
        { at: 3.6, s: '数据难挑：按文字标签挑，「dance」太含糊；用 SMPL 虚拟人在仿真里筛，虚拟人做得到的真机不一定做得到。' },
        { at: 7.0, s: 'H2O、OmniH2O 跟**全局关键点**：机器人一步没对上，所有目标都在前面，后面一直对不上。' },
        { at: 10.4, s: 'ExBody2 的三条：自动筛数据的通才、微调出的专才、速度与关键点解耦 + 教师—学生。' },
        { at: 13.4, s: '对比的基线：ExBody、全身版 ExBody†、复现的 OmniH2O*，以及不筛数据的自己。' }
      ]
    },
    {
      title: '两步走：通才再专才',
      dur: 16,
      build: buildScenePipeline,
      cues: [
        { at: 0.4, s: '论文图 2 (a)：把 CMU 动捕全集重定向到 G1，先训一个初始策略 $\\pi_0$。' },
        { at: 3.6, s: '(b)：按 $\\pi_0$ 的跟踪误差 $e(s)$ 从易到难排序，挑最优的子集训**通才**。' },
        { at: 7.0, s: '背后是可行性—多样性原则：上半身要多样，下半身要做得到。' },
        { at: 10.4, s: '(c)：在走路、跳舞、功夫这样一小组动作上，从通才微调出**专才**。' },
        { at: 13.4, s: '(d)：部署到真机 G1，策略在机载电脑上推理，每秒 50 次。' }
      ]
    },
    {
      title: '人的动作搬到 G1',
      dur: 16,
      build: buildSceneRetarget,
      cues: [
        { at: 0.4, s: '论文只写了一句「把人体动作适配到机器人的形态上」；附录图 7 的参考是 SMPL 人体，具体怎么做没写。' },
        { at: 3.6, s: '我们用 ASAP 开源的 SMPL → G1 脚本复现（不是论文的做法）：先拟合形状，让 14 对点对上，再逐帧解出 23 个关节角。' },
        { at: 7.0, s: '这段挥手 14 对点平均差约 32 mm，肩和肘差得最多。' },
        { at: 10.4, s: '侧手翻接后空翻只差 45 mm、侧手翻 36 mm，和走路的 35 mm 差不多：**光看运动学，看不出真机能不能做**。' },
        { at: 13.4, s: 'G1 的 23 个自由度：腿 12、腰 3、两臂各 4（手腕锁住）；动作是 23 个关节的 PD 目标角。' }
      ]
    },
    {
      title: '特权教师看什么',
      dur: 16,
      build: buildSceneTeacher,
      cues: [
        { at: 0.4, s: '特权信息 $p_t$ 62 维：关节角之差、关键点之差、真实根速度；正文还提到摩擦、电机强度。' },
        { at: 3.6, s: '本体感受 $o_t$ 75 维：关节角、关节速度、上一步动作、根角速度、横滚俯仰偏航。' },
        { at: 7.0, s: '跟踪目标 $g_t$ 69 维：全身 23 个关节角、12 个关键点、根部的速度姿态高度；哪 12 个点没写，我们推测是 ExBody 代码里定义的那 12 个（它只用了上身 6 个）。' },
        { at: 10.4, s: '教师 $\\hat\\pi$ 用 PPO 训，三层 MLP 512 · 256 · 128，输出 23 个关节的 PD 目标角。' },
        { at: 13.4, s: '项目页的仿真片段：绿点是跟踪的关键点。教师只在仿真里用，不部署。' }
      ]
    },
    {
      title: '奖励：表达目标 + 移动目标',
      dur: 16,
      build: buildSceneReward,
      cues: [
        { at: 0.4, s: '表 I：表达目标是关节角 3.0、关键点 2.0，管**像不像**；五项都和 ExBody 一样。' },
        { at: 3.6, s: '移动目标是线速度 6.0、速度方向 6.0、横滚俯仰 1.0、偏航 1.0，管**怎么动**；满分 14 对 5。' },
        { at: 7.0, s: '一个假设的误差算一步：六项合计约 15.8（满分 19）。' },
        { at: 10.4, s: '速度方向写成 $\\exp(-4\\cos)$，按字面方向越反奖励越高；我们推测原意是 $1-\\cos$。' },
        { at: 13.4, s: '另有 9 项正则：关节越限 −10、腾空时间 +10、绊脚 −2、踝关节动作 −0.1 等。' }
      ]
    },
    {
      title: '全局关键点会越跑越偏',
      dur: 16,
      build: buildSceneGlobal,
      cues: [
        { at: 0.4, s: '动作跟踪有两件事：跟关节角、跟关键点；训练时关键点更关键，它直接管身体。' },
        { at: 3.6, s: 'H2O、OmniH2O 跟**全局关键点**：目标是参考人在世界里的绝对位置。' },
        { at: 7.0, s: '假设机器人只走到参考 90% 的速度：1 s 后落后 0.17 m，2.47 s 后落后 0.42 m。' },
        { at: 10.4, s: '姿态一点没错，关键点奖励却从 2.0 掉到 0.46。' },
        { at: 13.4, s: '论文：全局关键点会漂、误差越积越多，最后拖垮学习。' }
      ]
    },
    {
      title: '局部关键点 + 速度：解耦',
      dur: 16,
      build: buildSceneLocal,
      cues: [
        { at: 0.4, s: '① 关键点转到**机器人当前的坐标系**里：只管姿态，落后多少都不影响。' },
        { at: 3.6, s: '② 全局位置交给**速度**去跟：根部的线速度、方向和姿态。' },
        { at: 7.0, s: '③ 训练时让关键点漂一小段、再定期拉回；周期论文没写，这里取 1 s，误差变成锯齿。' },
        { at: 10.4, s: 'v1 的消融：去掉定期拉回，速度误差从 0.1891 涨到 0.2545；v2 删了这组。' },
        { at: 13.4, s: '④ 部署时只用局部关键点，配合速度控制。' }
      ]
    },
    {
      title: '学生：10 步历史 + DAgger',
      dur: 16,
      build: buildSceneStudent,
      cues: [
        { at: 0.4, s: '学生拿不到真实根速度、真实关键点位置、摩擦这些特权信息。' },
        { at: 3.6, s: '改看最近 **10 步**本体感受：$75 \\times 10 = 750$ 维，加上 69 维目标。' },
        { at: 7.0, s: 'DAgger：学生自己开，教师给每个走到的状态标答案，损失是 $\\lVert a_t - \\hat a_t \\rVert^2$。' },
        { at: 10.4, s: '学生的网络更大：MLP 1024 · 1024 · 512。' },
        { at: 13.4, s: 'v1 用 25 步，v2 改成 10 步，两版的消融数字完全不同。' }
      ]
    },
    {
      title: '可行又多样',
      dur: 16,
      build: buildSceneDatasets,
      cues: [
        { at: 0.4, s: '附录表 X：人工做了 50 段、250 段两个子集，和 CMU 全集各训一个策略，在三个集合上评。' },
        { at: 3.6, s: '分布内：只有站和走的 50 段训得最好。' },
        { at: 7.0, s: '在全集上：250 段训的反而比在全集上训的更好（0.115 对 0.129）。' },
        { at: 10.4, s: '分布外的 ACCAD：还是 250 段最好；只有站和走的 50 段，误差很大。' },
        { at: 13.4, s: '**可行性—多样性原则**：上半身越多样越好，下半身必须做得到。' }
      ]
    },
    {
      title: '自动筛选：e(s) 与阈值',
      dur: 16,
      build: buildSceneCuration,
      cues: [
        { at: 0.4, s: '250 段是人挑的。自动挑：先在全集上训一个初始策略 $\\pi_0$。' },
        { at: 3.6, s: '用 $\\pi_0$ 把每段动作跟一遍、打分，侧重下半身：$e(s) = 0.1\\,E_{\\text{key}} + 0.9\\,E_{\\text{dof}}$。' },
        { at: 7.0, s: '按 $e(s)$ 排序画成累积分布（论文图 8）：最后 15% 陡升，最难的能到 0.37。' },
        { at: 10.4, s: '五档阈值 $\\tau$：0.075 到 0.175，分别留下约 14% 到 85% 的动作。' },
        { at: 13.4, s: '每档从 $\\pi_0$ 接着训，在全集上评，挑最好的一档。' }
      ]
    },
    {
      title: '阈值扫一遍',
      dur: 16,
      build: buildSceneTau,
      cues: [
        { at: 0.4, s: '论文图 4：阈值太低（0.075）只剩简单动作，不够多样，误差偏高。' },
        { at: 3.6, s: '阈值太高（0.175、不筛的 $\\pi_0$）混进做不到的动作，误差也高。' },
        { at: 7.0, s: '$\\tau = 0.15$：六种误差一起最低，呈 U 形。' },
        { at: 10.4, s: '0.15 大约留下 77%、约 1,480 段：只筛掉最难的约 23%。' },
        { at: 13.4, s: '图 4 的点和表 II 差几位小数（0.106 对 0.1079），论文没解释。' }
      ]
    },
    {
      title: '专才：从通才微调',
      dur: 16,
      build: buildSceneSpecialist,
      cues: [
        { at: 0.4, s: '三种训法：专才（从通才微调）、从头训（同样数据、同样总迭代）、通才。' },
        { at: 3.6, s: '表 IV：易、中、难和分布外的 ACCAD 四组上，专才的关节误差都最低。' },
        { at: 7.0, s: '比从头训低 8.4%、17.7%、11.9%、12.9%：中等组优势最大，并不是越难越大。' },
        { at: 10.4, s: '但在难组和 ACCAD 上，通才的**速度误差**反而最低，论文说它见过的动作更多。' },
        { at: 13.4, s: '功夫这一组也有专才；怎么自动挑专才，论文没有实验。' }
      ]
    },
    {
      title: 'Cha-Cha',
      dur: 16,
      build: buildSceneChacha,
      cues: [
        { at: 0.4, s: '论文图 5：舞蹈组里的恰恰，下半身剧烈、上半身动作丰富。' },
        { at: 3.6, s: '三行依次是 SMPL 参考、仿真、真机，同一段舞的五个时刻。' },
        { at: 7.0, s: '放大图下面三排：逐帧的全身、上半身、下半身关节误差，横轴是时间。' },
        { at: 10.4, s: '蓝线（专才）几乎整段最低：全身误差多在 0.05 rad 上下。' },
        { at: 13.4, s: 'v1 也画了这段恰恰，但比的是四个方法；v2 换成了三种训法。' }
      ]
    },
    {
      title: '和基线比',
      dur: 16,
      build: buildSceneBaselines,
      cues: [
        { at: 0.4, s: '表 II 在 CMU 全集上比：ExBody、ExBody†、OmniH2O*、不筛数据的 ExBody2。' },
        { at: 3.6, s: '仿真：全身关节误差 0.1079 rad，比 ExBody† 低 27.9%、比 OmniH2O* 低 35.8%。' },
        { at: 7.0, s: '唯一的代价：速度误差比不筛的版本高一点，0.2787 → 0.2930。' },
        { at: 10.4, s: '表 III 真机：0.1074 rad，比不筛数据低 21.1%，下半身 0.1054。' },
        { at: 13.4, s: '项目页片段：SMPL 参考、仿真、真机三栏，上身做各种动作，下身稳稳站着。' }
      ]
    },
    {
      title: '消融：历史长度与 DAgger',
      dur: 16,
      build: buildSceneAblation,
      cues: [
        { at: 0.4, s: '表 XI：不给历史，速度误差 0.4151，是 10 步的 1.42 倍。' },
        { at: 3.6, s: '太长也不好：100 步的关节误差比 10 步高 13.5%。' },
        { at: 7.0, s: '50 步速度误差最低，但关节误差不如 10 步；论文取 10 步。' },
        { at: 10.4, s: '去掉 DAgger：速度 0.4195、关节 0.1496，全面变差。' },
        { at: 13.4, s: '可是这一行的七个数，和表 II 里 ExBody† 那一行一字不差（我们发现的）。' }
      ]
    },
    {
      title: '动作从哪来、怎么部署',
      dur: 16,
      build: buildSceneSources,
      cues: [
        { at: 0.4, s: '参考可以来自动捕库、单目 RGB、生成模型（附录图 6）。' },
        { at: 3.6, s: '单目 RGB：HybrIK 估计三维姿态，重定向后实时送进策略；论文说策略对带噪信号鲁棒。' },
        { at: 7.0, s: 'CVAE 根据过去的动作生成接下来的，机器人能连续做下去。' },
        { at: 10.4, s: '部署：Jetson Orin NX 上 50 Hz 推理，指令延迟 18–30 ms，底层 500 Hz，LCM 通信。' },
        { at: 13.4, s: '时间账：每步 20 ms，延迟约 0.9–1.5 步，每步 PD 跑 10 次。' }
      ]
    },
    {
      title: '局限与没说清的地方',
      dur: 16,
      build: buildSceneLimits,
      cues: [
        { at: 0.4, s: '论文的局限：通才达不到专才的精度，专才之间又不能无缝组合、切换。' },
        { at: 3.6, s: '以后的方向：实时混合或切换专才，两全。' },
        { at: 7.0, s: '方法里没写的三处：重定向（我们用 ASAP 复现）；12 个关键点（推测是 ExBody 代码里定义的那 12 个）；多久拉回（按 1 s 假设）。' },
        { at: 10.4, s: '速度方向：按字面同向 0.018、反向 54.6；结合正文和 ExBody 的代码，原意应是 $1-\\cos$（我们的推断）。' },
        { at: 13.4, s: '对不上的数：表 XI 去掉 DAgger = 表 II 的 ExBody†；图 4 的 0.106 对表 II 的 0.1079；CMU 1,919 对 2,082 段；没有代码。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十八幕动画：ExBody2 全流程速览',
      sub: '约 288 秒自动播放。空格播放/暂停，← → 换幕；G1 用我们重定向的 CMU 动作按真实模型做 3D 渲染，表格与图来自论文，真机与仿真片段剪自项目页的视频。',
      ariaLabel: 'ExBody2 十八幕讲解动画',
      notes: [
        '取数依据：表 I–IV、附录表 V–XI 的数字照抄 arXiv 2412.13196 v2 的 LaTeX 源码；图 4、图 8 的数是按像素颜色量出来的读图值；v1 的数（定期拉回的消融、25 步历史）读自 v1 的源码。官方没有开源代码。',
        'G1 的动作是我们用 ASAP 开源的 `fit_smpl_shape.py`、`fit_smpl_motion.py`，以 SMPL 在 AMASS 的 CMU 动作上重定向的（大步走 `08_07`、挥手 `141_16`、Macarena `143_35`、左右扭腰 `13_29`、小鸡舞 `143_34`、侧手翻接后空翻 `88_05`），不是论文的数据；ASAP 的重定向照搬 SMPL 的根部高度、脚会离地，我们每帧把网格最低点挪到地面；它也不管脚的朝向，原地的三段我们只把两个踝关节改成让脚掌放平，并挑了脚平、两脚着地、重心一直落在两脚之间的 3 秒。12 个关键点（两肩、两肘、两手、两髋、两膝、两踝）是我们的推测：36 维 = 12 × 3，前作 ExBody 的代码（`h1_mimic.py` 第 78–82 行）本来就定义了这 12 个关键体，只用了上身 6 个，ExBody2 跟全身。第 7、8 幕「机器人只走到 90% 的速度」与「每 1 s 拉回一次」、第 11 幕两个例子的 $e(s)$ 都是假设。',
        'G1 的 3D 外形：材质与光照照抄 Robot Retarget Online（ImChong/Robot_Retarget_Online）的 three.js 场景，按关节角用正交相机逐帧离线渲染成贴图；第 4 幕的蓝色人体是 SMPL 中性模型、形状参数取 0。真机与仿真片段剪自项目页 exbody2.github.io 的视频。'
      ],
      scenes: EXBODY2_SCENES
    });
  }

  // ─── the narrated vertical video of the same eighteen scenes ─────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：ExBody2 十八幕全流程',
      sub: '17 分 43 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十八幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '20.7 MB',
      fileName: 'ExBody2_讲解视频.mp4'
    });
  }

  // ─── 演示 1：全局关键点 vs 局部关键点 ─────────────────────────────────────
  function buildFramesDemo(host) {
    var root = card(host, {
      title: '全局关键点 vs 局部关键点：机器人慢一点，会差多少',
      sub: '一段 G1 大步走（我们用 ASAP 的脚本在 AMASS 的 CMU 08_07 上重定向的）逐帧看：淡色是参考，实色是机器人；机器人的姿态和参考一样，只是走得慢（比例是假设）。红点是目标，红虚线是误差。'
    });
    var cfg = { ratio: 0.9, period: 0 }, state = { k: 15, mode: 'global' };
    var row = controlsRow(root);
    slider(row, { label: '第几帧（15 fps）', min: 0, max: WALK.n - 1, step: 1, value: 15, format: function (v) { return '第 ' + f2(v / WALK.fps) + ' s'; }, onInput: function (v) { state.k = v; render(); } });
    slider(row, { label: '机器人走到参考的', min: 70, max: 100, step: 1, value: 90, format: function (v) { return v + '% 的速度'; }, onInput: function (v) { cfg.ratio = v / 100; render(); } });
    var row2 = controlsRow(root);
    buttonGroup(row2, { label: '关键点怎么跟', items: [{ label: '全局（H2O / OmniH2O）', value: 'global' }, { label: '局部（ExBody2 部署时）', value: 'local' }, { label: '训练时：漂一段再拉回', value: 'reset' }], value: 'global', onPick: function (v) { state.mode = v; render(); } });
    buttonGroup(row2, { label: '拉回周期（论文没写，假设）', items: [{ label: '0.5 s', value: 0.5 }, { label: '1 s', value: 1 }, { label: '2 s', value: 2 }], value: 1, onPick: function (v) { cfg.per = v; render(); } });
    cfg.per = 1;
    var svg = sceneSvg('一条侧视：参考和机器人各一台 G1，红点是目标、蓝点是机器人自己的关键点、红虚线是误差；下面是落后距离随时间的曲线', '92 0 576 330');
    var wrap = el('div', 'demo-stage');
    wrap.appendChild(svg);
    root.appendChild(wrap);
    /* 这段走路只走到 4.2 m：侧视条只留这一段的宽度，手机上 G1 不至于太小 */
    var strip = lagStrip(svg, 96, 664, 8, 208, cfg);
    var plot = lagPlot(svg, 136, 238, 512, 72, [
      { color: C_REF, fn: function (k) { return lagAt(k, cfg.ratio, 0).lag; } },
      { color: C_WARN, fn: function (k) { return lagAt(k, cfg.ratio, cfg.per).lag; } },
      { color: C_LOC, fn: function () { return 0; } }
    ]);
    var stats = statsRow(root);
    var sLag = stats.add('每个关键点落后'), sNorm = stats.add('36 维误差的长度'), sRew = stats.add('关键点奖励（满分 2）');
    var verdict = verdictBox(root);
    var tb = table(root);
    note(root, ['关键点奖励照表 I 的 $2\\exp(-|\\mathbf p_{\\text{ref}}-\\mathbf p|)$，$|\\cdot|$ 按整个 36 维向量的 L2 长度算（ExBody 的代码这么做，ExBody2 没有代码，我们沿用）。12 个关键点是哪几个论文没写，这里取两肩、两肘、两手、两髋、两膝、两踝（我们的推测：36 维 = 12 × 3，ExBody 的代码里本来就定义了这 12 个关键体，只用了上身 6 个）。',
      '「局部」是减去骨盆、再转到只转偏航的机器人坐标系；姿态一样时误差就是 0，位置的落后交给速度那几项去管。「漂一段再拉回」照论文的描述，周期论文没写；红线（一直不拉）、黄线（定期拉回）、蓝线（局部）对照着看。默认的第 1.0 s、90% 就是笔记「🚶 具体实例」的例 2、例 3。']);
    function render() {
      var mode = state.mode, k = state.k;
      cfg.period = mode === 'reset' ? cfg.per : 0;
      strip.put(k, mode);
      plot.put(k);
      plot.lines[1].p.style.opacity = mode === 'reset' ? 1 : 0.25;
      var L = mode === 'local' ? { lag: 0, norm: 0, reward: 2 } : lagAt(k, cfg.ratio, mode === 'reset' ? cfg.per : 0);
      sLag.set(f3(L.lag) + ' m', L.lag > 0.2 ? 'bad' : L.lag > 0 ? 'warn' : 'good');
      sNorm.set(f3(L.norm) + ' m');
      sRew.set(f3(L.reward), L.reward > 1.5 ? 'good' : L.reward > 0.8 ? 'warn' : 'bad');
      verdict.set(mode === 'local' ? '局部关键点：姿态和参考一样，误差是 **0**，奖励一直是 2.0；落后的 ' + f2(lagAt(k, cfg.ratio, 0).lag) + ' m 交给速度那几项。'
        : mode === 'reset' ? '每 ' + cfg.per + ' s 拉回一次：误差变成锯齿，这一刻 **' + f3(L.lag) + ' m**（一直不拉是 ' + f3(lagAt(k, cfg.ratio, 0).lag) + ' m）。'
          : '全局关键点：姿态一点没错，每个点都落后 **' + f3(L.lag) + ' m**，奖励只剩 ' + f3(L.reward) + '。', mode === 'global' ? 'bad' : 'good');
      var f = walkFrame(k), loc = localKp(f);
      tb.clear();
      tb.row(['关键点', '世界坐标（m）', '机器人坐标（m）'], true);
      KP_ZH.forEach(function (n, i) {
        tb.row([n, '(' + f.kp[i].map(function (v) { return sgn(f3(v)); }).join(', ') + ')', '(' + loc[i].map(function (v) { return sgn(f3(v)); }).join(', ') + ')']);
      });
    }
    K.registerRenderer(render);
    render();
  }

  // ─── 演示 2：数据筛选 e(s) 与阈值 ─────────────────────────────────────────
  function buildCurationDemo(host) {
    var root = card(host, {
      title: '数据筛选：e(s) 与阈值 τ',
      sub: '左边是论文图 8 的累积分布（读图值）：拖阈值看 CMU 留下多少段；下面输入一段动作下半身的两项误差，算它的 $e(s)$、排在第几百分位、会不会被留下。'
    });
    var state = { tau: 0.15, ek: 0.08, ed: 0.10 };
    var row = controlsRow(root);
    slider(row, { label: '阈值 $\\tau$', min: 0.05, max: 0.35, step: 0.005, value: 0.15, format: function (v) { return f3(v); }, onInput: function (v) { state.tau = v; render(); } });
    var row2 = controlsRow(root);
    slider(row2, { label: '下半身关键点误差 $E_{\\text{key}}$', min: 0, max: 0.8, step: 0.01, value: 0.08, format: function (v) { return f2(v) + ' m'; }, onInput: function (v) { state.ek = v; render(); } });
    slider(row2, { label: '关节角误差 $E_{\\text{dof}}$', min: 0, max: 0.5, step: 0.005, value: 0.10, format: function (v) { return f3(v) + ' rad'; }, onInput: function (v) { state.ed = v; render(); } });
    var svg = sceneSvg('图 8 的累积分布曲线：横轴是动作按误差排的百分位，纵轴是 e(s)；绿色横线是当前阈值，圆点是输入的这段动作', '0 0 640 320');
    var wrap = el('div', 'demo-stage');
    wrap.appendChild(svg);
    root.appendChild(wrap);
    var P = cdfPlot(svg, 70, 24, 540, 250);
    P.grow(1);
    label(svg, 340, 312, '动作按 e(s) 从小到大排的百分位', 'demo-x-mut', 10.5, 'middle');
    var keep = paint(svgEl('rect', { x: 70, y: 24, width: 0, height: 250, opacity: 0.12 }), C_OURS);
    svg.insertBefore(keep, svg.firstChild);
    var tl = hline(svg, 70, 0, 610, 0, C_OURS, 2, '5 3'), vl = hline(svg, 0, 24, 0, 274, C_OURS, 1.2, '2 3');
    var mk = dotAt(svg, 0, 0, 6, C_ACCENT, C_SURFACE);
    TAUS.forEach(function (T) { dotAt(svg, P.px(T.pct), P.py(T.tau), 3.5, C_MUTED); });
    var stats = statsRow(root);
    var sPct = stats.add('留下的比例'), sN = stats.add('约多少段（按 1,919）'), sE = stats.add('这段的 $e(s)$'), sRank = stats.add('排在');
    var verdict = verdictBox(root);
    var tb = table(root);
    note(root, ['$e(s)=0.1\\,E_{\\text{key}}+0.9\\,E_{\\text{dof}}$，权重取自图 4 的图注；$E_{\\text{key}}$ 是下半身关键点的平均误差，$E_{\\text{dof}}$ 是关节角的平均误差（是否也只算下半身原文没说清）。真正的 $e(s)$ 要用初始策略 $\\pi_0$ 在仿真里跟一遍才有，这里的两项误差是你输入的。',
      '曲线和五档阈值的位置（灰点）是按像素量论文图 8 得到的读图值；段数按论文写的 1,919 段估（我们下到的 AMASS CMU 是 2,082 段）。表格是图 4 读出来的六种误差（读图值），只有五档阈值和不筛的 $\\pi_0$ 有数。']);
    function render() {
      var p = pctOf(state.tau), e = eScore(state.ek, state.ed), pr = pctOf(e);
      setLine(tl, P.px(0), P.py(state.tau), P.px(p), P.py(state.tau));
      setLine(vl, P.px(p), P.py(state.tau), P.px(p), P.py(0));
      keep.setAttribute('width', (P.px(p) - P.px(0)).toFixed(1));
      moveDot(mk, [P.px(pr), P.py(Math.min(e, 0.4))]);
      sPct.set(f1(p) + '%', 'accent');
      sN.set('约 ' + Math.round(p / 100 * CMU.paper) + ' 段');
      sE.set(f3(e));
      sRank.set(e > CDF[CDF.length - 1][1] ? '比最难的还难' : '第 ' + Math.round(pr) + ' 百分位');
      verdict.set(e <= state.tau ? '这段动作 $e = ' + f3(e) + ' \\le \\tau$：**留下**，进 $\\mathcal D_\\tau$。' : '这段动作 $e = ' + f3(e) + ' > \\tau$：**筛掉**。', e <= state.tau ? 'good' : 'bad');
      tb.clear();
      tb.row(['图 4（读图）'].concat(FIG4_X), true);
      FIG4.forEach(function (sr) {
        tb.row([sr.zh + '（' + sr.unit + '）'].concat(sr.v.map(function (v, i) { var s = v == null ? '—' : f3(v); return i === 3 ? '**' + s + '**' : s; })));
      });
    }
    K.registerRenderer(render);
    render();
  }

  // ─── 演示 3：表 II–IV 与附录表 X、表 XI ─────────────────────────────────
  function buildTablesDemo(host) {
    var root = card(host, {
      title: '表 II、III、IV 与附录表 X、XI',
      sub: '选一张表：每一列最低的（越低越好）标粗。速度误差 m/s，关键点误差 m，关节误差 rad。'
    });
    var state = { view: 't2', i: 0 };
    var row = controlsRow(root), row2 = controlsRow(root);
    var VIEWS = [{ label: '表 II（仿真）', value: 't2' }, { label: '表 III（真机）', value: 't3' }, { label: '表 IV（专才）', value: 't4' },
      { label: '表 X（数据集）', value: 't10' }, { label: '表 XI（历史与 DAgger）', value: 't11' }];
    function subItems() {
      if (state.view === 't4') return T4.map(function (g, i) { return { label: g.zh, value: i }; });
      if (state.view === 't10') return T10.map(function (g, i) { return { label: g.zh, value: i }; });
      return null;
    }
    function buildSub() {
      row2.innerHTML = '';
      var items = subItems();
      if (items) buttonGroup(row2, { label: state.view === 't4' ? '哪组数据' : '在哪个集合上评', items: items, value: state.i, onPick: function (v) { state.i = v; render(); } });
    }
    buttonGroup(row, { label: '哪张表', items: VIEWS, value: 't2', onPick: function (v) { state.view = v; state.i = 0; buildSub(); render(); } });
    buildSub();
    var verdict = verdictBox(root);
    var tb = table(root);
    note(root, ['表 II 每段动作在仿真里循环 10 遍取平均；表 III 用板载电机读数算，只有关节误差；表 IV 的「从头训」总迭代数等于通才预训练加微调；表 X 是 5 个种子。',
      '表 XI 里「去掉 DAgger」那一行的七个数，和表 II 里 ExBody† 那一行完全相同（我们发现的，论文没交代）。']);
    function rowsNow() {
      if (state.view === 't2') return { head: ['方法'].concat(METRICS), rows: T2.map(function (r) { return [r.zh, r.v]; }) };
      if (state.view === 't3') return { head: ['方法', METRICS[4], METRICS[5], METRICS[6]], rows: T3.map(function (r) { return [r.zh, r.v]; }) };
      if (state.view === 't4') return { head: ['训法'].concat(METRICS), rows: T4[state.i].rows.map(function (r, j) { return [T4_METHODS[j], r]; }) };
      if (state.view === 't10') return { head: ['训练集'].concat(METRICS), rows: T10[state.i].rows.map(function (r, j) { return [T10_TRAIN[j], r]; }) };
      return { head: ['设置'].concat(METRICS), rows: T11_HIST.map(function (r) { return [r.n + ' 步历史' + (r.n === 10 ? '（本文）' : ''), r.v]; }).concat([['去掉 DAgger', T11_NODAGGER]]) };
    }
    function render() {
      var d = rowsNow(), n = d.rows[0][1].length;
      var best = [];
      for (var j = 0; j < n; j++) best.push(Math.min.apply(null, d.rows.map(function (r) { return r[1][j]; })));
      tb.clear();
      tb.row(d.head, true);
      d.rows.forEach(function (r) { tb.row([r[0]].concat(r[1].map(function (v, j) { return v === best[j] ? '**' + f4(v) + '**' : f4(v); }))); });
      var msg;
      if (state.view === 't2') msg = 'ExBody2 七项里六项最低；只有速度误差不筛数据的版本更低（0.2787 对 0.2930）。';
      else if (state.view === 't3') msg = '真机上 ExBody2 三项都最低：全身 0.1074，比不筛数据低 ' + f1(-pct(T3[3].v[0], T3[4].v[0])) + '%。';
      else if (state.view === 't4') {
        var g = T4[state.i];
        msg = g.zh + '：专才的关节误差比从头训低 ' + f1(-pct(g.rows[1][4], g.rows[0][4])) + '%，比通才低 ' + f1(-pct(g.rows[2][4], g.rows[0][4])) + '%' + (g.rows[2][0] < g.rows[0][0] ? '；速度误差通才最低。' : '。');
      } else if (state.view === 't10') msg = ['分布内：50 段训的最好。', '全集上：250 段训的比全集训的还好（关节 0.1148 对 0.1291）。', '分布外：250 段训的最好，50 段误差很大。'][state.i];
      else msg = '10 步整体最好；0 步速度跟不上，100 步反而变差。去掉 DAgger 那一行和表 II 的 ExBody† 一字不差。';
      verdict.set(msg, 'good');
    }
    K.registerRenderer(render);
    render();
  }

  K.mount({
    'exbody2-explainer': buildExplainerDemo,
    'exbody2-video': buildVideoDemo,
    'exbody2-frames': buildFramesDemo,
    'exbody2-curation': buildCurationDemo,
    'exbody2-tables': buildTablesDemo
  });
})();
