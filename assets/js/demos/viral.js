/* Interactive VIRAL demos for
 * papers/04_Loco-Manipulation_and_WBC/VIRAL__Visual_Sim-to-Real_at_Scale_for_Humanoid_Loco-Manipulation
 * （He, Wang, Xue, Ben 等 · VIRAL: Visual Sim-to-Real at Scale for Humanoid Loco-Manipulation · arXiv 2511.15200，
 *   CVPR 2026；代码 NVlabs/GR00T-VisualSim2Real，2026-04 开源）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["viral"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   viral-explainer — 十八幕讲解动画：人形缺自主的移动操作 → 两阶段：特权教师到视觉学生 → 一轮任务：走、放、抓、转 →
 *                     教师：全状态进，HOMIE 命令出 → 奖励按阶段开关 → 增量动作 → 参考状态初始化 → 学生只看一张图 →
 *                     视觉骨干与历史 → DAgger 与行为克隆各一半 → 教师的算力 → 学生的算力：平铺渲染 → 手指的系统辨识 →
 *                     相机：对齐与外参随机化 → 视觉随机化 → 真机：59 次成功 54 次 → 泛化 → 局限：四个覆盖缺口
 *   viral-video     — 同一套十八幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   viral-replay    — 示范回放：一段官方遥操作示范逐帧看，阶段、HOMIE 命令、右手开合、学生相机的画面，绝对 / 增量动作的玩具
 *   viral-randomize — 视觉随机化：同一帧学生画面换材质与光照、照代码的七种图像增强、相机外参抖动
 *   viral-results   — 论文结果：图 7、9、11、13、14、15、16
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
  /* 论文的图（arXiv 2511.15200 的图 1–8、10、12）与项目页视频的片段放在 assets/img/papers/viral/；
     G1 的 3D 逐帧贴图与学生相机的画面（我们按官方示范数据重渲）在 assets/img/papers/viral/g1_3d/ */
  var IMG_BASE = assetBase('../../img/papers/');
  var PAPER_IMG_BASE = IMG_BASE ? IMG_BASE + 'viral/' : '';
  var CLIP_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'clips/' : '';
  var G1_3D_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'g1_3d/' : '';
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
    text = K.text,
    registerRenderer = K.registerRenderer;

  // ─── 论文里的数字（arXiv 2511.15200：正文、图 7–16、附录表 1–7） ──────────────────────────
  /* 图 7：真机，成功率与每轮用时 */
  var FIG7 = [
    { key: 'viral', zh: 'VIRAL', succ: 92, cycle: 20.2 },
    { key: 'expert', zh: '专家遥操作', succ: 100, cycle: 21.4 },
    { key: 'novice', zh: '新手遥操作', succ: 73, cycle: 47.0 }
  ];
  var REAL = { trials: 59, ok: 54, loops: 54, lapse: '19:25' };
  /* 图 11 右：教师开的环境比例 α 与成功率 */
  var FIG11 = [[0, 0.80], [0.25, 1.00], [0.5, 1.00], [0.75, 0.30], [1, 0.00]];
  /* 图 13：评测时全开随机化，按全随机化归一化的成功率 */
  var FIG13 = [['全部随机化', 1.000], ['去掉材质', 0.947], ['去掉穹顶光', 0.947], ['去掉外参', 0.893], ['不随机', 0.649]];
  /* 图 16（读图近似）：仿真里的抓取子任务（教师），多物体训练 vs 只训圆柱 */
  var FIG16 = [['圆柱', 1.00, 0.85], ['杯子', 0.99, 0.05], ['水瓶', 0.75, 0.10], ['酒杯', 0.50, 0.09], ['马克杯', 0.43, 0.03],
    ['咖啡杯', 0.38, 0.02], ['门把手', 0.31, 0.12], ['苹果', 0.29, 0.05], ['鸭子', 0.27, 0.03], ['闹钟', 0.18, 0.08]];
  /* 图 10 / 图 12 右（读图近似）：最后的成功率 */
  var FIG10 = [['小 CNN', 0.77], ['ResNet-18', 0.87], ['DINOv3-ViT-S', 0.87], ['DINOv3-ViT-S+', 0.87]];
  var FIG12 = [['MLP 看 32 步', 0.83], ['MLP 看 8 步', 0.80], ['LSTM 看 32 步', 0.79], ['不看历史', 0.74], ['LSTM 看 8 步', 0.72]];
  /* 表 1、表 2：观测维数 */
  var OBS_T = [['本体', 137, '线速度 3、角速度 3、重力 3、动作 31、增量 11、关节 43 + 43'], ['阶段', 5, '独热'],
    ['物体与桌子', 77, '两只瓶子的指尖力、位姿、相对手的位姿，桌子、放置与举起目标'], ['HOMIE 命令', 7, '']];
  var OBS_S = [['本体', 106, '角速度 3、重力 3、动作 31、增量 11、关节 29 + 29'], ['HOMIE 命令', 7, '']];
  var DIM = { teacher: 226, student: 113, vision: 128, act: 11, wbc: 31, imgH: 108, imgW: 192 };
  /* 表 5、6：环境数与 PPO 每次的步数（代码 num_steps_per_env 24） */
  var COMPUTE = { tEnv: 32768, tSteps: 24, sEnv: 65536, tGpu: 16, sGpu: 64 };
  /* 表 7 与代码（domain_rand/wsdpt_student.yaml）：图像增强，[名字, 概率, 低, 高] */
  var AUG = [['亮度', 0.25, 0.7, 2], ['对比度', 0.25, 0.5, 1.5], ['色相', 0.5, -0.1, 0.1], ['饱和度', 0.25, 0.5, 2], ['噪声', 0.25, 0, 0.15], ['模糊', 0.25, 3, 5]];
  /* 外参随机化：论文表 7 与代码（x / z 不同） */
  var EXTR = { paper: [0.02, 0.05, 0.02, 0.05, 0.1, 0.05], code: [0.01, 0.05, 0.01, 0.05, 0.1, 0.05] };
  /* 相机内参（config/simulator/isaacsim.yaml）：焦距 1.88 mm、光圈 2.6035 × 1.4621 mm */
  var CAMERA = { f: 1.88, ax: 2.6035, ay: 1.4621 };
  var HFOV = 2 * Math.atan(CAMERA.ax / 2 / CAMERA.f) * 180 / Math.PI; // 69.4°
  var VFOV = 2 * Math.atan(CAMERA.ay / 2 / CAMERA.f) * 180 / Math.PI; // 42.5°
  /* 增量动作（delta_action_base.py）：c_t = c_{t−1} + 0.1 a_t；右臂目标 = 默认 + 0.25 × 累加值 */
  var DELTA = { scale: 0.1, arm: 0.25, noise: 0.5 };
  /* 代码的阶段时限（步，50 Hz）与切换条件 */
  var STAGE_MAX = [300, 50, 50, 100, 100];
  var STAGES = [
    { zh: '走近', long: '走向桌上的瓶子', rule: '骨盆离瓶子 < 0.45 m' },
    { zh: '预放', long: '手臂到预放位置', rule: '手里的瓶子离托盘 < 0.3 m' },
    { zh: '放下', long: '把瓶子放进托盘', rule: '手掌离手里的瓶子 > 0.2 m' },
    { zh: '抓起', long: '抓起另一只并举高', rule: '右臂到举起姿态、指尖贴着瓶子' },
    { zh: '转身', long: '转身走向另一张桌子', rule: '朝向与 −x 的点积 > 0.7' }
  ];
  /* 示范 A 上照代码条件算出的时刻（s）：0→1、1→2、2→3 用代码条件；抓起 → 转身按遥操作开始转向的 7.72 s 划；转身完成 10.52 s */
  var STAGE_T = [0, 2.74, 3.08, 3.88, 7.72, 10.52];
  var DEMO_EVENTS = { open: 3.72, close: 6.30, lift: 6.96, turnStart: 7.72, turnEnd: 11.24, len: 11.94 };
  /* 295 段示范的统计（我们数的） */
  var DEMOS = { n: 295, minutes: 59.7, med: 12.0, lo: 8.5, hi: 17.9, hLo: 0.664, hHi: 0.775,
    days: [['10-14', 33], ['10-26', 101], ['10-27', 97], ['10-31', 64]], med4: [2.74, 3.66, 6.72, 10.52] };
  /* 项目页的 sim-to-real 日志（Our Visual Sim2Real Journey） */
  var JOURNEY = [['05-30', '第一次 RGB 伸手'], ['06-19', '第一次 RGB 抓取'], ['07-25', '抓取还是不行'], ['08-06', '抓取终于成功'],
    ['10-20', '第一次整轮跑通'], ['11-10', '连续 54 轮']];
  /* 示范 A：record_2025-10-31_04-50-31_0.717m.npz 每 3 帧取 1 帧（16.67 帧/秒，199 帧）；每帧 24 个 int16：
     HOMIE 命令 vx、vy、ωz（×1000）、右手开合原语（×1000）、骨盆—桌上瓶子水平距离、手里瓶子—托盘距离、手掌—手里瓶子距离、
     桌上瓶子中心比桌面高多少（mm）、骨盆偏航（mrad，展开）、骨盆 x、y（mm）、右臂 7 个关节（mrad）、手里瓶子 xyz、桌上瓶子 xyz（mm） */
  var DEMO = { n: 199, fps: 50 / 3, per: 24, table: 0.717, tray: [2.4675, -0.1533, 0.717], data: '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' };
  /* 图 9（读图近似，3 万次迭代，每 0.5k 一个点）：成功率、奖励 */
  var FIG9S = { full: [0,0.02,0.026,0.031,0.043,0.042,0.068,0.125,0.21,0.281,0.322,0.364,0.441,0.543,0.634,0.692,0.728,0.759,0.783,0.809,0.83,0.849,0.865,0.881,0.891,0.899,0.903,0.91,0.912,0.916,0.918,0.923,0.926,0.927,0.927,0.93,0.93,0.934,0.935,0.938,0.937,0.938,0.938,0.937,0.934,0.935,0.937,0.938,0.938,0.936,0.937,0.936,0.94,0.939,0.938,0.936,0.938,0.941,0.942,0.939,0.936], noRSI: [0,0.012,0.012,0.012,0.012,0.012,0.012,0.012,0.012,0.012,0.013,0.014,0.016,0.025,0.042,0.05,0.046,0.032,0.031,0.029,0.031,0.028,0.03,0.031,0.032,0.031,0.029,0.029,0.027,0.028,0.03,0.03,0.029,0.026,0.025,0.026,0.027,0.025,0.02,0.016,0.017,0.019,0.018,0.018,0.017,0.017,0.017,0.016,0.016,0.018,0.019,0.028,0.031,0.029,0.019,0.015,0.017,0.018,0.019,0.017,0.015], noDelta: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] };
  var FIG9R = { full: [3,86,170,165,154,145,158,182,218,253,270,279,292,325,368,412,455,490,523,548,568,580,592,601,611,620,624,627,631,635,642,646,648,647,628,621,620,640,649,651,651,652,655,656,657,660,662,665,664,666,665,661,657,655,655,652,650,649,644,637,630], noRSI: [-23,43,99,97,91,84,75,72,81,93,106,126,147,162,168,183,203,223,240,258,285,311,332,350,369,393,415,437,452,460,459,458,462,469,472,466,460,458,462,470,482,491,497,501,504,498,491,485,485,487,478,473,466,467,469,477,493,499,494,482,474], noDelta: [-125,-99,-72,-68,-67,-66,-65,-64,-63,-62,-61,-60,-60,-60,-60,-60,-59,-59,-59,-59,-59,-59,-59,-59,-59,-59,-59,-59,-59,-59,-59,-59,-59,-59,-59,-59,-59,-59,-59,-58,-58,-58,-58,-58,-58,-58,-58,-58,-58,-58,-58,-58,-58,-58,-58,-58,-58,-58,-58,-58,-58] };
  /* 图 14 右（读图近似）：教师成功率，墙钟 0–10 h，每 0.1 h 一个点 */
  var FIG14 = { g16: [0,0.016,0.027,0.059,0.1,0.132,0.15,0.187,0.204,0.219,0.273,0.369,0.461,0.557,0.65,0.718,0.745,0.764,0.778,0.797,0.814,0.834,0.852,0.873,0.886,0.897,0.906,0.914,0.918,0.921,0.924,0.927,0.931,0.933,0.936,0.939,0.938,0.94,0.942,0.944,0.946,0.95,0.95,0.952,0.95,0.951,0.95,0.949,0.948,0.95,0.95,0.951,0.951,0.953,0.952,0.949,0.95,0.952,0.951,0.953,0.954,0.954,0.953,0.955,0.954,0.956,0.957,0.957,0.956,0.958,0.958,0.958,0.958,0.957,0.957,0.955,0.954,0.954,0.955,0.954,0.955,0.955,0.955,0.954,0.953,0.953,0.954,0.954,0.955,0.954,0.956,0.955,0.954,0.953,0.952,0.951,0.951,0.949,0.949,0.948,0.946], g8: [0,0.021,0.024,0.025,0.031,0.036,0.04,0.055,0.087,0.131,0.18,0.237,0.284,0.324,0.368,0.427,0.492,0.561,0.627,0.678,0.713,0.739,0.763,0.785,0.803,0.821,0.838,0.852,0.865,0.876,0.884,0.892,0.896,0.9,0.904,0.909,0.912,0.916,0.919,0.922,0.923,0.923,0.924,0.925,0.925,0.927,0.93,0.931,0.932,0.933,0.933,0.933,0.932,0.93,0.931,0.932,0.932,0.934,0.935,0.934,0.933,0.933,0.933,0.934,0.936,0.936,0.936,0.933,0.934,0.932,0.934,0.935,0.936,0.934,0.931,0.93,0.928,0.929,0.93,0.931,0.93,0.93,0.929,0.93,0.93,0.93,0.929,0.931,0.931,0.932,0.931,0.932,0.931,0.93,0.93,0.93,0.927,0.924,0.923,0.922,0.922], g4: [0,0.033,0.032,0.03,0.033,0.048,0.069,0.104,0.143,0.179,0.206,0.223,0.234,0.241,0.249,0.254,0.263,0.266,0.272,0.275,0.274,0.271,0.276,0.278,0.283,0.293,0.309,0.326,0.369,0.433,0.498,0.561,0.624,0.667,0.687,0.707,0.724,0.739,0.748,0.757,0.764,0.773,0.779,0.783,0.79,0.798,0.802,0.81,0.819,0.824,0.829,0.836,0.837,0.836,0.837,0.835,0.833,0.833,0.837,0.839,0.838,0.839,0.839,0.835,0.834,0.838,0.838,0.836,0.838,0.839,0.841,0.842,0.845,0.846,0.85,0.85,0.851,0.848,0.845,0.843,0.837,0.837,0.834,0.831,0.824,0.819,0.812,0.808,0.804,0.806,0.807,0.804,0.803,0.802,0.797,0.79,0.783,0.778,0.772,0.766,0.764], g2: [0,0.016,0.015,0.014,0.013,0.011,0.013,0.012,0.012,0.012,0.012,0.012,0.012,0.012,0.013,0.014,0.014,0.015,0.015,0.016,0.016,0.02,0.026,0.032,0.04,0.051,0.064,0.081,0.103,0.127,0.149,0.17,0.188,0.197,0.207,0.216,0.223,0.227,0.233,0.237,0.238,0.241,0.246,0.253,0.258,0.264,0.27,0.275,0.28,0.286,0.292,0.298,0.3,0.301,0.302,0.302,0.301,0.302,0.304,0.305,0.305,0.31,0.312,0.313,0.311,0.308,0.299,0.292,0.286,0.287,0.294,0.3,0.286,0.276,0.262,0.246,0.233,0.239,0.243,0.248,0.252,0.256,0.261,0.265,0.27,0.274,0.278,0.283,0.287,0.291,0.296,0.3,0.304,0.309,0.313,0.317,0.322,0.326,0.333,0.339,0.345], g1: [0,0.013,0.013,0.012,0.01,0.009,0.007,0.007,0.006,0.005,0.005,0.005,0.004,0.004,0.004,0.004,0.003,0.004,0.004,0.004,0.005,0.006,0.006,0.006,0.007,0.007,0.008,0.01,0.011,0.011,0.013,0.014,0.014,0.015,0.018,0.023,0.03,0.037,0.042,0.046,0.049,0.051,0.055,0.057,0.062,0.071,0.08,0.092,0.105,0.116,0.123,0.133,0.145,0.157,0.169,0.183,0.192,0.195,0.196,0.2,0.201,0.2,0.202,0.206,0.204,0.204,0.209,0.211,0.214,0.219,0.223,0.225,0.225,0.226,0.226,0.226,0.227,0.229,0.231,0.234,0.237,0.241,0.245,0.249,0.253,0.257,0.261,0.265,0.269,0.273,0.277,0.281,0.285,0.289,0.293,0.297,0.301,0.305,0.306,0.307,0.307] };
  /* 图 15 左（读图近似）：学生蒸馏损失，墙钟 0–50 h，每 0.5 h 一个点；2、1 张 GPU 35 h 之后被图例挡住 */
  var FIG15 = { g64: [0.4475,0.4475,0.4475,0.4475,0.4475,0.4475,0.4475,0.4259,0.3929,0.3567,0.3178,0.2771,0.2551,0.2409,0.2284,0.2171,0.2071,0.1974,0.1894,0.1823,0.1762,0.1698,0.1652,0.1619,0.1585,0.1546,0.1516,0.1487,0.1459,0.1434,0.1413,0.139,0.137,0.1352,0.1335,0.1323,0.1309,0.1298,0.1286,0.1273,0.1259,0.1247,0.1232,0.1222,0.1213,0.1207,0.1203,0.1197,0.119,0.1183,0.1176,0.1168,0.1161,0.1154,0.1148,0.114,0.1133,0.1128,0.1124,0.1119,0.1113,0.1107,0.11,0.1092,0.109,0.1085,0.1081,0.1078,0.1073,0.1065,0.106,0.1055,0.1048,0.1045,0.1043,0.1039,0.1036,0.1034,0.1032,0.1027,0.1023,0.1019,0.1012,0.1007,0.1004,0.1003,0.1002,0.1002,0.0999,0.0996,0.0991,0.0986,0.0983,0.098,0.0977,0.0976,0.0975,0.0974,0.097,0.0965,0.0961], g32: [0.4377,0.4377,0.4377,0.4377,0.4377,0.4427,0.4419,0.4381,0.4439,0.4436,0.4194,0.3907,0.3593,0.3142,0.2726,0.2479,0.2304,0.218,0.2083,0.1994,0.1915,0.1864,0.1805,0.1751,0.1708,0.1669,0.1627,0.1596,0.1565,0.1541,0.1518,0.1491,0.1469,0.1454,0.1436,0.1418,0.1405,0.139,0.1368,0.1353,0.134,0.1327,0.1316,0.1312,0.1303,0.1292,0.1285,0.1274,0.1267,0.1257,0.1249,0.1244,0.1237,0.123,0.1224,0.1215,0.1205,0.1198,0.1189,0.1181,0.1177,0.1169,0.1163,0.1156,0.1151,0.1146,0.1144,0.114,0.1134,0.113,0.1126,0.1117,0.1112,0.1107,0.11,0.1095,0.1092,0.109,0.1086,0.1083,0.108,0.1075,0.1071,0.1069,0.1065,0.106,0.1058,0.1052,0.1046,0.1043,0.1044,0.104,0.1039,0.1039,0.1035,0.1033,0.1028,0.1025,0.1021,0.1018,0.1013], g16: [0.4695,0.4695,0.4695,0.4695,0.4695,0.4695,0.4492,0.4482,0.439,0.4156,0.4086,0.4068,0.3828,0.3571,0.3393,0.3028,0.278,0.2555,0.2399,0.2282,0.2182,0.2108,0.2026,0.1958,0.1908,0.1856,0.1802,0.1759,0.1725,0.1694,0.1664,0.1634,0.1608,0.1589,0.1564,0.1539,0.1523,0.1504,0.1489,0.1469,0.1459,0.1443,0.1431,0.1417,0.1411,0.14,0.1394,0.1385,0.1371,0.1359,0.1353,0.1342,0.1334,0.1328,0.1326,0.1318,0.131,0.1302,0.1296,0.1283,0.1274,0.1264,0.1258,0.1251,0.1244,0.1239,0.1235,0.123,0.1228,0.1222,0.1217,0.1218,0.1213,0.1203,0.12,0.1194,0.1185,0.1179,0.1171,0.117,0.1169,0.1164,0.1161,0.1158,0.1152,0.1145,0.1142,0.1138,0.1135,0.1133,0.1131,0.1124,0.1122,0.1118,0.1111,0.1109,0.1108,0.1104,0.1097,0.1093,0.1085], g8: [0.488,0.488,0.488,0.488,0.488,0.488,0.4768,0.4545,0.4268,0.3949,0.3581,0.327,0.3079,0.2913,0.2753,0.2618,0.2511,0.2391,0.23,0.2223,0.2167,0.2106,0.2064,0.2013,0.1981,0.1941,0.1927,0.1892,0.1857,0.1824,0.1804,0.1777,0.1757,0.1743,0.1725,0.1697,0.1689,0.1677,0.1663,0.1649,0.1637,0.1617,0.16,0.1581,0.1573,0.156,0.1549,0.1533,0.1523,0.151,0.1496,0.1484,0.1485,0.1481,0.1466,0.1465,0.1459,0.1441,0.1424,0.1421,0.1412,0.1402,0.1396,0.1394,0.1389,0.1382,0.1381,0.1379,0.1373,0.1368,0.1362,0.1354,0.1347,0.1338,0.1331,0.133,0.1326,0.1323,0.1318,0.1313,0.1306,0.1302,0.1297,0.1295,0.1292,0.1288,0.1282,0.1278,0.1272,0.1268,0.1258,0.1257,0.1251,0.125,0.1241,0.1239,0.1232,0.123,0.1232,0.1238,0.1245], g4: [0.4808,0.4808,0.4808,0.4814,0.4827,0.4847,0.4873,0.4905,0.4779,0.4594,0.4374,0.4063,0.3708,0.3481,0.3286,0.3096,0.2968,0.2858,0.2755,0.2678,0.2597,0.2523,0.2458,0.242,0.2354,0.2297,0.2237,0.219,0.2115,0.2075,0.2043,0.2036,0.2021,0.2007,0.1981,0.1954,0.1921,0.1895,0.1886,0.1867,0.1865,0.1851,0.1828,0.1807,0.1792,0.1771,0.1751,0.1747,0.1733,0.1718,0.1696,0.1689,0.1672,0.1666,0.1656,0.1659,0.1652,0.1636,0.1622,0.1622,0.1602,0.1591,0.159,0.1588,0.1566,0.1566,0.1555,0.1556,0.1537,0.1538,0.1533,0.1519,0.1489,0.1476,0.1457,0.1443,0.1443,0.1445,0.1445,0.1439,0.1432,0.1429,0.1426,0.1419,0.1418,0.1415,0.1414,0.1411,0.1412,0.1412,0.1412,0.1405,0.1396,0.1397,0.14,0.1395,0.1395,0.139,0.1388,0.1383,0.1385], g2: [0.497,0.497,0.497,0.497,0.497,0.497,0.497,0.497,0.4957,0.4929,0.4766,0.4644,0.4478,0.425,0.3965,0.379,0.3574,0.3371,0.3217,0.3137,0.3063,0.2976,0.2904,0.2852,0.2804,0.274,0.2672,0.2627,0.2587,0.2528,0.2486,0.2478,0.2433,0.2385,0.235,0.2334,0.2295,0.2273,0.2248,0.2223,0.2202,0.22,0.2189,0.2178,0.2155,0.212,0.2066,0.2045,0.202,0.2006,0.2008,0.2007,0.1997,0.1988,0.1983,0.1966,0.195,0.1927,0.1915,0.1899,0.188,0.1866,0.1849,0.1834,0.183,0.1823,0.1817,0.1832,0.182,0.1798,0.1794,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null], g1: [0.4871,0.4871,0.4871,0.4871,0.4871,0.4871,0.4871,0.4871,0.4871,0.4871,0.4871,0.4871,0.4802,0.4644,0.4462,0.4248,0.3992,0.3772,0.3653,0.354,0.3441,0.3364,0.3305,0.3247,0.3168,0.3115,0.3053,0.2993,0.2916,0.2856,0.2811,0.2806,0.2767,0.2785,0.2748,0.2694,0.2638,0.2602,0.2507,0.2489,0.248,0.2441,0.2435,0.2419,0.2407,0.2369,0.2358,0.2342,0.2345,0.2341,0.2346,0.2331,0.2299,0.226,0.2254,0.2224,0.2215,0.2221,0.2228,0.22,0.2196,0.2182,0.2153,0.2128,0.2119,0.211,0.2095,0.21,0.2094,0.2078,0.2053,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null] };

  function decode(b64) {
    var bin = atob(b64), n = bin.length >> 1, out = new Int16Array(n);
    for (var i = 0; i < n; i++) {
      var v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
      out[i] = v > 32767 ? v - 65536 : v;
    }
    return out;
  }
  var CACHE = {};
  /* 示范 A 的逐帧数据 */
  function demoFrames() {
    if (CACHE.demo) return CACHE.demo;
    var a = decode(DEMO.data), out = [];
    for (var j = 0; j < DEMO.n; j++) {
      var o = j * DEMO.per, arm = [];
      for (var k = 0; k < 7; k++) arm.push(a[o + 11 + k] / 1000);
      out.push({
        j: j, t: j / DEMO.fps,
        cmd: [a[o] / 1000, a[o + 1] / 1000, a[o + 2] / 1000], prim: a[o + 3] / 1000,
        dFront: a[o + 4] / 1000, dTray: a[o + 5] / 1000, dPalm: a[o + 6] / 1000, lift: a[o + 7] / 1000,
        yaw: a[o + 8] / 1000, pel: [a[o + 9] / 1000, a[o + 10] / 1000], arm: arm,
        hold: [a[o + 18] / 1000, a[o + 19] / 1000, a[o + 20] / 1000], front: [a[o + 21] / 1000, a[o + 22] / 1000, a[o + 23] / 1000]
      });
    }
    CACHE.demo = out;
    return out;
  }
  function stageAt(t) {
    for (var s = 4; s >= 0; s--) if (t >= STAGE_T[s]) return s;
    return 0;
  }
  /* 走近奖励：正文的 r_walk */
  function rWalk(d) {
    return Math.exp(-4 * (d - 0.45) * (d - 0.45));
  }
  /* 确定性随机：第 i 个、种子 s 的 [0, 1) 随机数（mulberry32） */
  function rnd(i, s) {
    var a = (i * 2654435761 + (s || 1) * 40503) >>> 0;
    a = (a + 0x6d2b79f5) >>> 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function gaussI(i, s) {
    var u = Math.max(1e-9, rnd(i, s)), v = rnd(i, s + 7919);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  /* 玩具：同一串探索噪声（标准差 0.5，表 5 的初始噪声）下，绝对动作与增量动作的前进命令；
     策略都想走 0.25 m/s：绝对动作直接输出 0.25，增量动作输出 2 ×（0.25 − c），把命令往 0.25 拉（不拉的话命令会一路漂到上限贴着） */
  function toyCommand(n, seed) {
    var abs = [], del = [], c = 0;
    for (var i = 0; i < n; i++) {
      var e = DELTA.noise * gaussI(i, seed || 3);
      abs.push(clamp(0.25 + e, -0.5, 0.5));
      c = clamp(c + DELTA.scale * (2 * (0.25 - c) + e), -0.5, 0.5);
      del.push(c);
    }
    return { abs: abs, del: del };
  }

  // ─── 讲解动画：十八幕 ───────────────────────────────────────────────────────
  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    paint = K.paint,
    seg = K.seg,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
    polyPath = K.polyPath;
  /* 视频里分镜按 1080 宽、约 1.2 倍放大，9–10.5 号字只有 11–12 px，手机上看不清（FALCON / HDMI 的看片反馈）：9–9.5 号放到 11，10–10.5 号放到 11.5 */
  function minFont(size) {
    return size == null ? size : size < 9.75 ? Math.max(size, 11) : size < 11 ? Math.max(size, 11.5) : size;
  }
  var kitText = svgText, kitRich = svgRich;
  svgText = function (x, y, str, cls, size, anchor) { return kitText(x, y, str, cls, minFont(size), anchor); };
  svgRich = function (x, y, str, opts) {
    var o = {}, k;
    for (k in opts || {}) o[k] = opts[k];
    o.size = minFont(o.size);
    return kitRich(x, y, str, o);
  };

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
  /* 全片配色：教师橙（warn）、学生紫、真机 / 成功绿、仿真蓝、失败红 */
  var C_TEA = C_WARN, C_STU = C_PURPLE, C_REAL = C_GOOD, C_SIM = C_ACCENT, C_ERR = C_BAD;
  var STAGE_C = [C_ACCENT, C_PURPLE, C_WARN, C_GOOD, C_BAD];

  /* 视频里一幕要讲一分钟左右，画面不能停：draw(t, clock) 的 clock 是这一幕的真实时间
     （旁白比分镜长时 t 停在一段的末尾，clock 照走），G1 的回放按 clock 播；网页播放器只传 t。
     各幕的 cue 时刻都落在 0.4 / 3.6 / 7.0 / 10.4 / 13.4，一次性的出场动画不跨过这些时刻。 */
  function nowOf(t, clock) {
    return clock == null ? t : clock;
  }
  /* 一段窗口：a 之后 0.3 s 起淡入 0.4 s，到 b 才开始淡出 0.3 s（AGENTS.md「面板到 cue 之后才淡出」） */
  function win(t, a, b) {
    return seg(t, a + 0.3, a + 0.7) * (b == null ? 1 : 1 - seg(t, b, b + 0.3));
  }
  /* 一幕里从 cue 起算的秒数：网页上就是 t − cue；视频里按时间线算 cue 那一刻起过了多久（K.clipSince）。
     不能用 clock − cue：clock 从这一幕开头算，前面几段旁白比分镜长时，到 cue 那一刻 clock 早已大于 cue（HOMIE 2026-10-22） */
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
  function ringAt(parent, cx, cy, r, color, w) {
    var c = paint(svgEl('circle', { cx: cx, cy: cy, r: r, fill: 'none', 'stroke-width': w || 2 }), null, color);
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
  function vbar(parent, x, w, color) {
    var r = paint(svgEl('rect', { x: x, y: 0, width: w, height: 0, rx: 2 }), color);
    parent.appendChild(r);
    return {
      node: r,
      set: function (yBase, h) { r.setAttribute('y', (yBase - Math.max(0, h)).toFixed(1)); r.setAttribute('height', Math.max(0, h).toFixed(1)); }
    };
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
  /* 一支箭：线 + 箭头 */
  function arrow(parent, color, width, dash) {
    var g = group(parent), l = hline(g, 0, 0, 0, 0, color, width || 2.4, dash), h = arrowHead(g, color);
    return {
      g: g,
      set: function (x1, y1, x2, y2, size) { setLine(l, x1, y1, x2, y2); h.set(x1, y1, x2, y2, size || 9); }
    };
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
    fig2: ['fig2_pipeline.webp', 1600, 475],
    fig4: ['fig4_rsi.webp', 1767, 300],
    fig5: ['fig5_sysid.webp', 1500, 394],
    fig6: ['fig6_fov.webp', 1500, 292],
    fig8: ['fig8_general.webp', 1600, 625],
    fig10: ['fig10_backbone.webp', 1400, 391],
    fig12: ['fig12_history.webp', 1400, 388]
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
    if (caption) label(g, o.capX == null ? x + w / 2 : o.capX, y + h + (o.capDy || 15), caption, o.capCls || 'demo-x-mut', o.capSize || 9.5, o.capAnchor || 'middle');
    return { g: g, x: x, y: y, w: w, h: h, at: function (sec, vis) { c.at(sec, vis); } };
  }
  /* 片段按顺序放几段：parts = [[秒, 名称]]，seqAt(片段内秒) 标出放到第几段 */
  function seqClip(parent, id, x, y, w, h, caption, parts) {
    var g = group(parent), total = 0, last = -1;
    parts.forEach(function (p) { total += p[0]; });
    var c = projClip(g, id, x, y, w, h, caption, { capDy: 48 });
    var acc = 0, bars = parts.map(function (p) {
      var r = paint(svgEl('rect', { x: (x + acc / total * w).toFixed(1), y: (y + h + 7).toFixed(1), width: (p[0] / total * w - 4).toFixed(1), height: 5, rx: 2.5 }), C_ACCENT);
      acc += p[0];
      g.appendChild(r);
      return r;
    });
    var name = label(g, x, y + h + 27, '', 'demo-x-ink', 12.5);
    return {
      g: g, total: total,
      at: function (sec, vis) {
        sec = Math.max(0, sec);
        c.at(sec, vis);
        var m = ((sec % total) + total) % total, idx = 0, a = 0;
        parts.forEach(function (p, i) { if (m >= a) idx = i; a += p[0]; });
        if (idx === last) return;
        last = idx;
        bars.forEach(function (r, i) { r.style.opacity = i === idx ? 1 : 0.25; });
        name.textContent = (idx + 1) + ' / ' + parts.length + '　' + parts[idx][1];
      }
    };
  }

  /* 三维 → 画布：z 朝上；绕竖轴转 yaw、抬头 pitch 的正交投影（G1 的贴图是同一套相机离线渲染的：yaw −0.35、pitch 0.25，
     贴图里 170 px/m，锚点是世界坐标 (2.2, 0.3, 0)，落在贴图格子的 (215, 233)） */
  var CAM_YAW = -0.35, CAM_PITCH = 0.25, ANCHOR = [2.2, 0.3, 0];
  function proj0(p) {
    var c = Math.cos(CAM_YAW), s = Math.sin(CAM_YAW), cp = Math.cos(CAM_PITCH), sp = Math.sin(CAM_PITCH);
    var xr = p[0] * c + p[1] * s, depth = -p[0] * s + p[1] * c;
    return [xr, p[2] * cp + depth * sp];
  }
  var A0 = proj0(ANCHOR);
  function project(p, cam) {
    var q = proj0(p);
    return [cam.ox + cam.s * (q[0] - A0[0]), cam.oy - cam.s * (q[1] - A0[1])];
  }
  function camAt(s, ox, oy) { return { s: s, ox: ox, oy: oy }; }
  var SHEETS = {
    demoA: { file: 'demoA.webp', R: 170, cw: 440, ch: 290, cols: 12, n: 199, ax: 215, ay: 233 },
    rsi: { file: 'rsi.webp', R: 170, cw: 440, ch: 290, cols: 6, n: 6, ax: 215, ay: 233 }
  };
  /* 一格 3D 贴图：put(cam, 帧号) 让锚点落在 (cam.ox, cam.oy)。贴图第一次用到才设 href */
  function g1Mesh(parent, key, opts) {
    var o = opts || {}, M = SHEETS[key], g = group(parent), rows = Math.ceil(M.n / M.cols);
    g.setAttribute('class', 'demo-x-g1mesh');
    var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: 0, height: 0 });
    var img = svgEl('image', { x: 0, y: 0, width: M.cw * M.cols, height: M.ch * rows, preserveAspectRatio: 'none' });
    box.appendChild(img);
    g.appendChild(box);
    if (o.ghost) g.style.opacity = o.ghost;
    var woke = false, lastF = -1;
    return {
      g: g,
      put: function (cam, fr) {
        if (!woke && G1_3D_BASE) { woke = true; img.setAttribute('href', G1_3D_BASE + M.file); }
        var k = cam.s / M.R;
        var f = clamp(Math.round(fr || 0), 0, M.n - 1);
        box.setAttribute('x', (cam.ox - M.ax * k).toFixed(1));
        box.setAttribute('y', (cam.oy - M.ay * k).toFixed(1));
        box.setAttribute('width', (M.cw * k).toFixed(1));
        box.setAttribute('height', (M.ch * k).toFixed(1));
        if (f !== lastF) {
          box.setAttribute('viewBox', [(f % M.cols) * M.cw, Math.floor(f / M.cols) * M.ch, M.cw, M.ch].join(' '));
          lastF = f;
        }
      }
    };
  }
  /* 学生相机的画面：108 × 192 的小图按像素放大（不插值），x、y、w 是显示位置与宽度 */
  var EGO = {
    egoA: { file: 'egoA.webp', cols: 12, n: 199 },
    dr: { file: 'dr.webp', cols: 8, n: 16 },
    ext: { file: 'ext.webp', cols: 11, n: 11 },
    aug: { file: 'aug.webp', cols: 12, n: 12 }
  };
  function egoView(parent, key, x, y, w, opts) {
    var o = opts || {}, M = EGO[key], g = group(parent), h = w * 108 / 192, rows = Math.ceil(M.n / M.cols);
    if (o.frame !== false) g.appendChild(svgEl('rect', { x: x - 2, y: y - 2, width: w + 4, height: h + 4, rx: 4, fill: '#111111', stroke: 'none' }));
    var box = svgEl('svg', { x: x, y: y, width: w, height: h, overflow: 'hidden', preserveAspectRatio: 'none', viewBox: '0 0 192 108' });
    var img = svgEl('image', { x: 0, y: 0, width: 192 * M.cols, height: 108 * rows, preserveAspectRatio: 'none' });
    img.style.imageRendering = 'pixelated';
    box.appendChild(img);
    g.appendChild(box);
    var woke = false, lastF = -1;
    return {
      g: g, h: h,
      put: function (fr) {
        if (!woke && G1_3D_BASE) { woke = true; img.setAttribute('href', G1_3D_BASE + M.file); }
        var f = clamp(Math.round(fr || 0), 0, M.n - 1);
        if (f !== lastF) { box.setAttribute('viewBox', [(f % M.cols) * 192, Math.floor(f / M.cols) * 108, 192, 108].join(' ')); lastF = f; }
      }
    };
  }
  /* 示范 A 按真实时间来回播放（16.67 帧/秒）：正着放完再倒着放回去，不从转完身的最后一帧跳回开头（TWIST2 / HDMI 的看片反馈：循环贴图首尾不跳） */
  function loopFrame(now, start) {
    var N = DEMO.n, P = 2 * (N - 1);
    var k = ((Math.floor(((start || 0) + now) * DEMO.fps) % P) + P) % P;
    return k < N ? k : P - k;
  }
  function f1(x) { return fmt(x, 1); }
  function f2(x) { return fmt(x, 2); }
  function f3(x) { return fmt(x, 3); }
  /* 排版用的负号 */
  function sgn(s) { return String(s).replace(/-/g, '−'); }
  /* 横向条形图的一行：标签、条、数字 */
  function barRowAt(parent, x, y, labelW, str, color, h, size) {
    var g = group(parent);
    label(g, x + labelW - 8, y + (h || 14) / 2 + 4, str, 'demo-x-ink2', size || 10.5, 'end');
    var b = hbar(g, x + labelW, y, h || 14, color);
    var v = label(g, x + labelW + 6, y + (h || 14) / 2 + 4, '', 'demo-x-ink', size || 10.5);
    return {
      g: g, bar: b,
      set: function (w, txt) { setW(b, w); v.setAttribute('x', (x + labelW + Math.max(0, w) + 6).toFixed(1)); v.textContent = txt; }
    };
  }
  function legendRow(parent, x, y, items, size) {
    var g = group(parent), cx = x;
    items.forEach(function (it) {
      g.appendChild(paint(svgEl('rect', { x: cx, y: y - 8, width: 12, height: 10, rx: 2 }), it[1]));
      label(g, cx + 16, y, it[0], 'demo-x-ink2', size || 10.5);
      cx += 16 + (it[2] || it[0].length * (size || 10.5) * 0.95) + 16;
    });
    return g;
  }
  /* 折线图：在 (x, y, w, h) 的框里，横轴 x0..x1、纵轴 y0..y1（log 为真时纵轴取对数）；
     curve(数组, 每点横轴间隔, 颜色) 返回可逐步画出的折线（upto 之前的部分） */
  function plotBox(parent, x, y, w, h, x0, x1, y0, y1, log) {
    var g = group(parent);
    rectBox(g, x, y, w, h, C_BORDER, C_SURFACE);
    function px(v) { return x + (v - x0) / (x1 - x0) * w; }
    function py(v) {
      if (log) return y + h - (Math.log10(v) - Math.log10(y0)) / (Math.log10(y1) - Math.log10(y0)) * h;
      return y + h - (v - y0) / (y1 - y0) * h;
    }
    return {
      g: g, px: px, py: py,
      curve: function (arr, dt, color, width, dash) {
        var p = pathLine(g, [], color, width || 2, dash);
        return {
          node: p,
          upto: function (tt) {
            var pts = [];
            for (var i = 0; i < arr.length; i++) {
              var xx = i * dt;
              if (xx > tt) break;
              if (arr[i] == null) break;
              pts.push([px(xx), py(clamp(arr[i], y0, y1))]);
            }
            setPath(p, pts);
            return pts.length ? pts[pts.length - 1] : null;
          }
        };
      }
    };
  }

  /* ── 动效小部件：少写字，多让东西动起来 ── */
  /* 压在网格线、折线上的字描一圈底色 */
  function halo(n) {
    n.style.paintOrder = 'stroke'; n.style.stroke = C_SURFACE; n.style.strokeWidth = '3px'; n.style.strokeLinejoin = 'round';
    return n;
  }
  /* 一行读法：横轴、纵轴、颜色、越大还是越小越好 */
  function readHint(parent, x, y, str, size, w) {
    return rich(parent, x, y, '**读法**　' + str, size || 10.5, 'demo-x-ink2', 'start', w);
  }
  /* 一段流向：一条虚线，几颗小点沿着走；at(秒, 起点, 终点, 是否可见)。起点终点都放在框外，小点不从字上划过 */
  function flowSeg(parent, color, n, r, speed, noLine) {
    var g = group(parent), ln = noLine ? null : hline(g, 0, 0, 0, 0, color, 1.2, '3 4'), dots = [];
    for (var j = 0; j < (n || 3); j++) dots.push(dotAt(g, 0, 0, r || 3.4, color));
    return {
      g: g,
      at: function (sec, a, b, vis) {
        if (ln) setLine(ln, a[0], a[1], b[0], b[1]);
        var tot = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]));
        dots.forEach(function (c, j) {
          var d = (((sec * (speed || 60) + j * tot / dots.length) % tot) + tot) % tot, u = d / tot;
          moveDot(c, [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
          c.style.opacity = vis === false ? 0 : Math.min(1, Math.min(d, tot - d) / 8);
        });
      }
    };
  }
  /* 勾与叉 */
  function tick(parent, x, y, s, color) {
    var p = paint(svgEl('path', { d: 'M' + x + ' ' + (y + s * 0.5) + ' l' + s * 0.35 + ' ' + s * 0.38 + ' l' + s * 0.65 + ' ' + (-s * 0.8), fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }), null, color || C_GOOD);
    parent.appendChild(p);
    return p;
  }
  function cross(parent, x, y, s, color) {
    var p = paint(svgEl('path', { d: 'M' + x + ' ' + y + ' l' + s + ' ' + s + ' M' + (x + s) + ' ' + y + ' l' + (-s) + ' ' + s, fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round' }), null, color || C_BAD);
    parent.appendChild(p);
    return p;
  }
  /* 数字从 0 数到 v（u ∈ [0, 1]），千分位 */
  function countTo(v, u, digits) {
    var x = v * clamp(u, 0, 1);
    return digits ? x.toFixed(digits) : Math.round(x).toLocaleString('en-US');
  }
  /* 随机化的一个参数：数轴上一段区间，小点每 period 秒跳到区间里一个新的随机值（域随机化） */
  function rangeRow(parent, x, y, w, name, lo, hi, axLo, axHi, fmtV, color) {
    var g = group(parent), px = function (v) { return x + 92 + (v - axLo) / (axHi - axLo) * (w - 176); };
    label(g, x, y + 4, name, 'demo-x-ink2', 11);
    hline(g, px(axLo), y, px(axHi), y, C_BORDER, 1.4);
    var band = paint(svgEl('rect', { x: px(lo).toFixed(1), y: y - 4, width: (px(hi) - px(lo)).toFixed(1), height: 8, rx: 4 }), color || C_ACCENT);
    band.style.opacity = 0.35; g.appendChild(band);
    var d = dotAt(g, px(lo), y, 5, color || C_ACCENT), v = label(g, x + w, y + 4, '', 'demo-x-ink', 11, 'end');
    return {
      g: g,
      at: function (sec, seed, period) {
        var k = Math.floor(Math.max(0, sec) / (period || 0.8)), val = lo + (hi - lo) * rnd(k, seed);
        moveDot(d, [px(val), y]);
        v.textContent = fmtV(val);
      }
    };
  }
  /* 一条阶段时间轴：五段颜色，光标按时间走；put(t) 返回当前阶段 */
  function stageBar(parent, x, y, w, opts) {
    var o = opts || {}, g = group(parent), T = DEMO_EVENTS.len, segs = [];
    for (var s = 0; s < 5; s++) {
      var a = STAGE_T[s], b = s < 4 ? STAGE_T[s + 1] : STAGE_T[5];
      var r = paint(svgEl('rect', { x: (x + a / T * w).toFixed(1), y: y, width: Math.max(2, (b - a) / T * w - 1.5).toFixed(1), height: o.h || 12, rx: 3 }), STAGE_C[s]);
      g.appendChild(r);
      segs.push(r);
    }
    var tail = paint(svgEl('rect', { x: (x + STAGE_T[5] / T * w).toFixed(1), y: y, width: ((T - STAGE_T[5]) / T * w).toFixed(1), height: o.h || 12, rx: 3 }), C_MUTED);
    tail.style.opacity = 0.35; g.appendChild(tail);
    var cur = hline(g, x, y - 4, x, y + (o.h || 12) + 3, 'var(--text)', 2.2);
    var names = o.names === false ? [] : STAGES.map(function (st, s) {
      var a = STAGE_T[s], b = s < 4 ? STAGE_T[s + 1] : STAGE_T[5], cx = x + (a + b) / 2 / T * w;
      /* 预放、放下两段很短，名字一个往左靠、一个往右靠，免得叠在一起 */
      return label(g, cx + (s === 1 ? 3 : s === 2 ? -3 : 0), y + (o.h || 12) + 18, st.zh, 'demo-x-ink2', 10, s === 1 ? 'end' : s === 2 ? 'start' : 'middle');
    });
    return {
      g: g,
      put: function (t) {
        var xx = x + clamp(t / T, 0, 1) * w, s = stageAt(t);
        setLine(cur, xx, y - 4, xx, y + (o.h || 12) + 3);
        segs.forEach(function (r, i) { r.style.opacity = i === s ? 1 : 0.35; });
        names.forEach(function (n, i) { n.style.fontWeight = i === s ? 700 : 400; });
        return s;
      }
    };
  }
  /* 要点里数字和单位之间用不换行空格（公式里不动），免得单位单独落到下一行开头（HOMIE 2026-10-21） */
  function nb(str) {
    return str.split(/(\$[^$]*\$)/).map(function (p, i) { return i % 2 ? p : p.replace(/(\d)(\*\*)? (?=[^\s\d+\-−→×<>=\/·（(])/g, '$1$2 ').replace(/(\d)–(\d)/g, '$1–⁠$2'); }).join('');
  }

  /* ── scene 1: 人形缺自主的移动操作 ── */
  function buildSceneIntro() {
    var s = sceneSvg('左边是项目页的 48 倍速视频：G1 在两张桌子之间连续放下、抓起、转身；右边依次出现：现在四类人形系统各缺什么（逐个打叉）；' +
      '堆真机数据的成本越往人形移动操作越高的示意柱；成排亮起的仿真环境；论文的问题；最后是 VIRAL 的出处和三组关键元素');
    s.appendChild(svgText(24, 26, '人形缺的是自主的移动操作', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'loops48', 24, 44, 380, 214, '项目页视频（48 倍速）：连续 54 轮，全程自主');
    label(s, 24, 298, 'Unitree G1 · 头上一个 RGB 相机', 'demo-x-ink2', 11.5);
    label(s, 24, 318, '任务全部在仿真里学，零样本上真机', 'demo-x-mut', 11);
    var R = 424, W = 352;
    /* 第 1 段：四类现有系统，逐个打叉 */
    var p1 = group(s);
    label(p1, R, 64, '现在的人形系统', 'demo-x-ink', 14);
    var kinds = [['只会**走**，不看环境', 'BeyondMimic、HOVER'], ['固定在**桌前**操作', '不移动'], ['靠**人**遥操作', 'HOMIE、TWIST2'], ['靠**外部动捕**看物体', 'HDMI']];
    var kindG = kinds.map(function (k, i) {
      var g = group(p1);
      chip(g, R, 80 + i * 46, W - 40, k[0], C_MUTED, { size: 12.5, left: true, h: 36 });
      label(g, R + W - 52, 80 + i * 46 + 23, k[1], 'demo-x-mut', 10, 'end');
      return { g: g, x: cross(p1, R + W - 30, 80 + i * 46 + 9, 18, C_BAD) };
    });
    label(p1, R, 274, '机载相机 + 真机 + 自主：很少有人做到', 'demo-x-ink2', 11.5);
    /* 第 2 段：堆真机数据，越往人形越贵（示意） */
    var p2 = group(s);
    label(p2, R, 64, '学大模型：堆真机遥操作数据', 'demo-x-ink', 14);
    var costs = [['固定桌面', 50], ['移动操作', 105], ['人形移动操作', 165]], BASE = 250;
    var costBars = costs.map(function (c, i) {
      var b = vbar(p2, R + 30 + i * 110, 70, i === 2 ? C_BAD : C_WARN);
      label(p2, R + 65 + i * 110, BASE + 18, c[0], 'demo-x-ink2', 11, 'middle');
      return b;
    });
    hline(p2, R + 16, BASE, R + W - 6, BASE, C_BORDER, 1.4);
    label(p2, R, 296, '变化越多，要的数据越多；人形的每条又更贵', 'demo-x-ink2', 11);
    label(p2, R + W - 6, 318, '示意，不是论文的数', 'demo-x-mut', 9.5, 'end');
    /* 第 3 段：仿真——成排的环境一起亮 */
    var p3 = group(s);
    label(p3, R, 64, '另一条路：GPU 仿真', 'demo-x-ink', 14);
    var cells = [];
    for (var gy = 0; gy < 8; gy++) for (var gx = 0; gx < 24; gx++) {
      var c = paint(svgEl('rect', { x: R + gx * 14.5, y: 84 + gy * 14.5, width: 11, height: 11, rx: 2 }), C_SIM);
      p3.appendChild(c); cells.push(c);
    }
    var envN = label(p3, R, 222, '', 'demo-x-ink', 13);
    label(p3, R, 246, '边际成本很低，数据多几个数量级', 'demo-x-ink2', 11.5);
    label(p3, R, 268, '腿式行走里 sim-to-real 早是标准做法', 'demo-x-mut', 11);
    /* 第 4 段：问题 —— 走路、操作、看三件事汇进一个问题框；下面的阶段轴光标在走：一轮有五个阶段 */
    var p4 = group(s);
    label(p4, R, 64, '论文的问题', 'demo-x-ink', 14);
    var abil = [['走路', C_ACCENT], ['操作', C_WARN], ['看', C_STU]];
    abil.forEach(function (a, i) { chip(p4, R + 6 + i * 116, 80, 104, '**' + a[0] + '**', a[1], { size: 13, h: 30 }); });
    var fl4 = abil.map(function (a) { return flowSeg(p4, a[1], 2, 3, 36); });
    rectBox(p4, R + 36, 150, W - 72, 56, C_ACCENT, C_SURFACE);
    rich(p4, R + W / 2, 173, '只用**机载相机**，', 13, 'demo-x-ink', 'middle');
    rich(p4, R + W / 2, 195, '能不能自主**移动操作**？', 13, 'demo-x-ink', 'middle');
    var qBar = stageBar(p4, R + 16, 236, W - 32, { h: 10 });
    label(p4, R, 296, '一轮有五个阶段，时程长', 'demo-x-ink2', 11.5);
    /* 第 5 段：VIRAL */
    var p5 = group(s);
    tone(p5, R, 82, 'VIRAL', C_ACCENT, 30);
    label(p5, R, 108, 'NVIDIA GEAR、CMU、伯克利、港中文 · CVPR 2026', 'demo-x-ink2', 11.5);
    rich(p5, R, 140, '不是新算法：一份**完整配方**', 13.5);
    var elems = [['教师', '4 个关键元素', C_TEA], ['学生', '3 个关键元素', C_STU], ['上真机', '3 个关键元素', C_REAL]];
    var elemG = elems.map(function (e, i) {
      var g = group(p5);
      chip(g, R + i * 120, 160, 110, '**' + e[0] + '**', e[2], { size: 13, h: 34 });
      label(g, R + i * 120 + 55, 212, e[1], 'demo-x-mut', 10.5, 'middle');
      return g;
    });
    function draw(t, clock) {
      var now = nowOf(t, clock);
      clip.at(K.clipSince(t, 0), true);
      kindG.forEach(function (k, i) {
        setOpacity(k.g, seg(t, 0.4 + i * 0.5, 0.8 + i * 0.5));
        k.x.style.opacity = seg(t, 2.4 + i * 0.25, 2.6 + i * 0.25);
      });
      costBars.forEach(function (b, i) { b.set(BASE, costs[i][1] * K.ease(seg(since(t, clock, 3.6), 0.3 + i * 0.5, 1.0 + i * 0.5))); });
      var u3 = seg(since(t, clock, 7.0), 0.2, 2.2);
      cells.forEach(function (c, i) { c.style.opacity = i / cells.length < u3 ? 0.35 + 0.65 * Math.abs(Math.sin(now * 2 + i * 0.37)) : 0.08; });
      envN.textContent = countTo(COMPUTE.tEnv, u3) + ' 个环境同时跑';
      elemG.forEach(function (g, i) { setOpacity(g, seg(t, 13.8 + i * 0.4, 14.2 + i * 0.4)); });
      fl4.forEach(function (f, i) { f.at(now, [R + 58 + i * 116, 114], [R + W / 2 + (i - 1) * 70, 146], true); });
      qBar.put((since(t, clock, 10.4) * 1.6) % DEMO_EVENTS.len);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 两阶段：特权教师 → 视觉学生（图 2） ── */
  function buildScenePipeline() {
    var s = sceneSvg('左上是论文图 2，讲到哪一段就框出哪一段：第一阶段的特权教师、第二阶段的视觉学生、右边冻结的全身控制器；左下两排方块是两个阶段用的 GPU 数；' +
      '右边依次出现：教师的四个特点、学生的四个特点、50 Hz 到 200 Hz 的控制链路（小点沿链路走）、上真机两头对齐、零样本');
    s.appendChild(svgText(24, 26, '两阶段：特权教师 → 视觉学生（图 2）', 'demo-x-ink2', 13.5));
    var FW = 500, fig = paperPart(s, 'fig2', 0, 0, 1, 1, 24, 44, FW, '论文图 2：VIRAL 的教师—学生流程');
    var FH = fig.h;
    function frame(u0, v0, u1, v1, color) {
      var r = rectBox(s, 24 + u0 * FW, 44 + v0 * FH, (u1 - u0) * FW, (v1 - v0) * FH, color, 'none');
      r.style.fill = 'none'; r.setAttribute('stroke-width', 3);
      return r;
    }
    var boxes = [frame(0.195, 0.12, 0.765, 0.48, C_TEA), frame(0.195, 0.56, 0.765, 0.985, C_STU), frame(0.875, 0.22, 0.965, 0.91, C_REAL)];
    /* 左下：两个阶段的 GPU */
    var gpuY = 44 + FH + 36;
    label(s, 24, gpuY, '第一阶段：16 张 L40S，不渲染', 'demo-x-ink2', 11);
    var g16 = [], g64 = [], i;
    for (i = 0; i < 16; i++) { var a = paint(svgEl('rect', { x: 24 + i * 12, y: gpuY + 8, width: 9, height: 9, rx: 1.5 }), C_TEA); s.appendChild(a); g16.push(a); }
    label(s, 24, gpuY + 44, '第二阶段：64 张 L40S，平铺渲染', 'demo-x-ink2', 11);
    for (i = 0; i < 64; i++) { var b = paint(svgEl('rect', { x: 24 + (i % 32) * 12, y: gpuY + 52 + Math.floor(i / 32) * 12, width: 9, height: 9, rx: 1.5 }), C_STU); s.appendChild(b); g64.push(b); }
    var R = 544, W = 232;
    /* 第 1 段：教师 —— 四种特权信息流进教师，教师输出命令增量 */
    var p1 = group(s);
    label(p1, R, 64, '① 特权教师', 'demo-x-ink', 14);
    ['物体位姿', '桌子', '指尖力', '所处阶段'].forEach(function (k, j) { chip(p1, R + (j % 2) * 122, 78 + Math.floor(j / 2) * 32, 110, k, C_TEA, { size: 11.5, h: 26 }); });
    var fl1 = [flowSeg(p1, C_TEA, 2, 3, 30), flowSeg(p1, C_TEA, 2, 3, 30), flowSeg(p1, C_TEA, 2, 3, 30)];
    rectBox(p1, R + 46, 160, 140, 40, C_TEA, C_SURFACE);
    label(p1, R + 116, 185, '特权教师 · PPO', 'demo-x-ink', 12.5, 'middle');
    chip(p1, R + 46, 224, 140, 'HOMIE 命令增量', C_TEA, { size: 11.5, h: 26 });
    label(p1, R, 278, '不渲染图像：只算物理，跑得快', 'demo-x-ink2', 11.5);
    /* 第 2 段：学生 —— 一张 RGB 图和本体感受流进学生，标签来自教师 */
    var p2 = group(s);
    label(p2, R, 64, '② 视觉学生', 'demo-x-ink', 14);
    var ego2 = egoView(p2, 'egoA', R, 80, 110);
    chip(p2, R + 122, 96, 110, '本体感受', C_ACCENT, { size: 11.5, h: 28 });
    var fl2 = [flowSeg(p2, C_STU, 2, 3, 30), flowSeg(p2, C_ACCENT, 2, 3, 30), flowSeg(p2, C_STU, 2, 3, 30), flowSeg(p2, C_TEA, 2, 3, 30)];
    rectBox(p2, R + 46, 162, 140, 42, C_STU, C_SURFACE);
    label(p2, R + 116, 178, '视觉学生', 'demo-x-ink', 12.5, 'middle');
    label(p2, R + 116, 198, 'DAgger + BC', 'demo-x-ink2', 11.5, 'middle');
    chip(p2, R, 226, 110, '同样的命令', C_STU, { size: 11.5, h: 26 });
    chip(p2, R + 122, 226, 110, '教师给标签', C_TEA, { size: 11.5, h: 26 });
    label(p2, R, 278, '64 张 GPU 平铺渲染图像', 'demo-x-ink2', 11.5);
    /* 第 3 段：链路 */
    var p3 = group(s);
    label(p3, R, 64, '底层：HOMIE（冻结）', 'demo-x-ink', 14);
    var chain = [['教师 / 学生', '50 Hz', C_STU], ['HOMIE 全身控制器', '50 Hz', C_REAL], ['PD 控制器', '200 Hz', C_MUTED], ['Unitree G1', '', C_ACCENT]];
    chain.forEach(function (c, j) { chip(p3, R, 78 + j * 46, W, c[0] + (c[1] ? '　**' + c[1] + '**' : ''), c[2], { size: 12, h: 30 }); });
    var fl3 = [0, 1, 2].map(function () { return flowSeg(p3, C_REAL, 2, 3, 22, true); });
    /* 第 4 段：两头对齐 —— 仿真和真机之间的红条（差距，示意），每补上一项就短一截 */
    var p4 = group(s);
    label(p4, R, 64, '③ 上真机：两头对齐', 'demo-x-ink', 14);
    chip(p4, R, 80, 96, '**仿真**', C_SIM, { size: 12.5, h: 30 });
    chip(p4, R + 136, 80, 96, '**真机**', C_REAL, { size: 12.5, h: 30 });
    var gapBar = paint(svgEl('rect', { x: R + 98, y: 92, width: 36, height: 6, rx: 3 }), C_ERR);
    p4.appendChild(gapBar);
    var fixes = ['光照', '材质', '外参', '画质', '延迟'].map(function (k, j) { return chip(p4, R, 120 + j * 26, 96, k, C_SIM, { size: 11.5, h: 22 }); })
      .concat(['手指辨识', '相机标定'].map(function (k, j) { return chip(p4, R + 136, 120 + j * 26, 96, k, C_REAL, { size: 11.5, h: 22 }); }));
    label(p4, R, 262, '左：仿真随机化　右：硬件对齐', 'demo-x-ink2', 11.5);
    label(p4, R, 282, '红条是差距，一项项变短（示意）', 'demo-x-mut', 11);
    /* 第 5 段：零样本 —— 十个关键元素逐个亮起 */
    var p5 = group(s);
    label(p5, R, 64, '零样本：真机上不再训练', 'demo-x-ink', 14);
    var keyDots = [];
    [['教师', 4, C_TEA], ['学生', 3, C_STU], ['上真机', 3, C_REAL]].forEach(function (e, j) {
      label(p5, R, 106 + j * 42, e[0], 'demo-x-ink2', 12);
      for (var q = 0; q < e[1]; q++) keyDots.push(dotAt(p5, R + 80 + q * 34, 102 + j * 42, 11, e[2]));
    });
    label(p5, R, 248, '十个关键元素，后面按论文的', 'demo-x-ink2', 11.5);
    label(p5, R, 268, '顺序一个一个看', 'demo-x-ink2', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      g16.forEach(function (c, j) { c.style.opacity = seg(t, 0.6 + j * 0.05, 0.8 + j * 0.05) * (t < 3.6 ? 1 : 0.4) + 0.08; });
      g64.forEach(function (c, j) { c.style.opacity = seg(t, 3.9 + j * 0.02, 4.1 + j * 0.02) * (t >= 3.6 && t < 7.0 ? 1 : 0.4) + 0.08; });
      fl3.forEach(function (f, j) { f.at(now, [R + W / 2, 78 + j * 46 + 32], [R + W / 2, 78 + (j + 1) * 46 - 2], true); });
      fl1[0].at(now, [R + 55, 138], [R + 96, 158], true);
      fl1[1].at(now, [R + 177, 138], [R + 136, 158], true);
      fl1[2].at(now, [R + 116, 202], [R + 116, 222], true);
      ego2.put(loopFrame(now));
      fl2[0].at(now, [R + 55, 146], [R + 96, 160], true);
      fl2[1].at(now, [R + 177, 126], [R + 136, 160], true);
      fl2[2].at(now, [R + 82, 206], [R + 55, 224], true);
      fl2[3].at(now, [R + 177, 224], [R + 150, 206], true);
      var u4 = since(t, clock, 10.4), lit = 0;
      fixes.forEach(function (g, j) { var v = seg(u4, 0.4 + j * 0.45, 0.7 + j * 0.45); setOpacity(g, 0.25 + 0.75 * v); lit += v; });
      var gw = 36 * (1 - 0.85 * lit / fixes.length);
      gapBar.setAttribute('x', (R + 116 - gw / 2).toFixed(1)); setW(gapBar, gw);
      keyDots.forEach(function (d, j) { d.style.opacity = 0.15 + 0.85 * seg(since(t, clock, 13.4), 0.4 + j * 0.25, 0.6 + j * 0.25); });
      setOpacity(boxes[0], win(t, 0.3, 3.6));
      setOpacity(boxes[1], win(t, 3.6, 7.0));
      setOpacity(boxes[2], win(t, 7.0, 10.4));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 一轮任务：走、放、抓、转 ── */
  function buildSceneTask() {
    var s = sceneSvg('左边是我们按官方示范数据重渲的 G1：走到桌前、把手里的绿瓶放进托盘、抓起橙色瓶子、转身，下面一条时间轴标出五个阶段；' +
      '右边依次出现：五个阶段的名字随回放高亮；代码里的切换条件和此刻的数值；每个阶段的时限；两张桌子之间来回走的俯视图；示范数据的出处');
    s.appendChild(svgText(24, 26, '一轮任务：走、放、抓、转', 'demo-x-ink2', 13.5));
    var bot = g1Mesh(s, 'demoA'), cam = camAt(150, 24 + 215 * 150 / 170, 40 + 233 * 150 / 170);
    var bar = stageBar(s, 24, 300, 380);
    var tLab = label(s, 404, 288, '', 'demo-x-mut', 10, 'end');
    var F = demoFrames();
    var R = 424, W = 352;
    /* 第 1 段：五个阶段 */
    var p1 = group(s);
    label(p1, R, 64, '一轮放—取 = 五个阶段', 'demo-x-ink', 14);
    var rows1 = STAGES.map(function (st, i) {
      var g = group(p1);
      dotAt(g, R + 10, 92 + i * 40, 7, STAGE_C[i]);
      label(g, R + 10, 96 + i * 40, String(i), 'demo-x-on', 10, 'middle').style.fill = '#ffffff';
      label(g, R + 28, 97 + i * 40, st.zh, 'demo-x-ink', 13);
      label(g, R + 70, 97 + i * 40, st.long, 'demo-x-ink2', 11.5);
      return g;
    });
    /* 第 2 段：切换条件与此刻的数值 */
    var p2 = group(s);
    label(p2, R, 64, '代码里怎么切换', 'demo-x-ink', 14);
    var rows2 = STAGES.map(function (st, i) {
      var g = group(p2);
      dotAt(g, R + 8, 92 + i * 40, 6, STAGE_C[i]);
      label(g, R + 22, 96 + i * 40, st.rule, 'demo-x-ink2', 11);
      var v = label(g, R + W, 96 + i * 40, '', 'demo-x-ink', 11, 'end');
      return { g: g, v: v };
    });
    label(p2, R, 300, '每步最多前进一个阶段', 'demo-x-mut', 10);
    /* 第 3 段：时限 */
    var p3 = group(s);
    label(p3, R, 64, '每个阶段都有时限（代码）', 'demo-x-ink', 14);
    var limitBars = STAGES.map(function (st, i) {
      var b = barRowAt(p3, R, 82 + i * 30, 60, st.zh, STAGE_C[i], 16, 11);
      return b;
    });
    label(p3, R, 248, '超时 → 重置，扣终止分', 'demo-x-ink2', 12);
    label(p3, R, 270, '一回合：教师 12 s，学生 8 s', 'demo-x-mut', 11);
    /* 第 4 段：俯视图——两张桌子来回 */
    var p4 = group(s);
    label(p4, R, 64, '两张桌子相距 5.4 m', 'demo-x-ink', 14);
    var TX0 = R + 30, TX1 = R + W - 30, TY = 150;
    rectBox(p4, TX0 - 14, TY - 52, 28, 104, C_WARN, C_SURFACE2);
    rectBox(p4, TX1 - 14, TY - 52, 28, 104, C_WARN, C_SURFACE2);
    label(p4, TX0, TY + 72, '桌子 A', 'demo-x-ink2', 10.5, 'middle');
    label(p4, TX1, TY + 72, '桌子 B', 'demo-x-ink2', 10.5, 'middle');
    hline(p4, TX0 + 20, TY + 64, TX1 - 20, TY + 64, C_BORDER, 1.2, '4 4');
    label(p4, (TX0 + TX1) / 2, TY + 60, '5.4 m', 'demo-x-mut', 10, 'middle');
    var walker = dotAt(p4, TX0 + 30, TY, 7, C_ACCENT), heading = hline(p4, 0, 0, 0, 0, C_ACCENT, 2.5);
    label(p4, R, 258, '放、抓、转身，再走向另一张：循环下去', 'demo-x-ink2', 11.5);
    /* 第 5 段：出处 —— 295 段示范一格一段，按录制的日子上色，示范 A 是最后一格 */
    var p5 = group(s);
    label(p5, R, 64, '这一段从哪来', 'demo-x-ink', 14);
    var dayC = [C_ACCENT, C_PURPLE, C_WARN, C_GOOD], cells5 = [], acc5 = 0;
    DEMOS.days.forEach(function (d, k) {
      for (var q = 0; q < d[1]; q++, acc5++) {
        var c = paint(svgEl('rect', { x: R + (acc5 % 25) * 14, y: 80 + Math.floor(acc5 / 25) * 11, width: 11, height: 8, rx: 1.5 }), dayC[k]);
        p5.appendChild(c); cells5.push(c);
      }
    });
    var hiA = ringAt(p5, R + (294 % 25) * 14 + 5.5, 80 + Math.floor(294 / 25) * 11 + 4, 8, 'var(--text)', 2.5);
    legendRow(p5, R, 234, DEMOS.days.map(function (d, k) { return [d[0], dayC[k], 36]; }), 11);
    label(p5, R, 258, '官方 295 段 = ' + DEMOS.days.map(function (d) { return d[1]; }).join(' + ') + '，按录制日期上色', 'demo-x-ink2', 11.5);
    label(p5, R, 280, '圈出的这段：11.94 s，桌高 0.717 m', 'demo-x-ink2', 11.5);
    label(p5, R, 302, '我们按它记下的刚体位姿重渲；瓶子画成圆柱', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock), j = loopFrame(now), f = F[j];
      bot.put(cam, j);
      var st = bar.put(f.t);
      tLab.textContent = '第 ' + f1(f.t) + ' s';
      rows1.forEach(function (g, i) { setOpacity(g, i === st ? 1 : 0.4); });
      var vals = [f2(f.dFront) + ' m', f2(f.dTray) + ' m', f2(f.dPalm) + ' m', '离桌 ' + f2(Math.max(0, f.lift - 0.075)) + ' m', '转过 ' + Math.round(Math.abs(f.yaw - F[0].yaw) * 180 / Math.PI) + '°'];
      rows2.forEach(function (r, i) { r.v.textContent = vals[i]; setOpacity(r.g, i === st ? 1 : 0.45); });
      var u3 = K.ease(seg(since(t, clock, 7.0), 0.2, 1.4));
      limitBars.forEach(function (b, i) { b.set(STAGE_MAX[i] / 300 * 190 * u3, STAGE_MAX[i] / 50 + ' s'); });
      var cyc = (since(t, clock, 10.4) % 8) / 8, side = cyc < 0.5 ? 0 : 1, u = (cyc % 0.5) / 0.5;
      var xA = TX0 + 30, xB = TX1 - 30, px = side === 0 ? xA + (xB - xA) * K.ease(clamp((u - 0.25) / 0.75, 0, 1)) : xB - (xB - xA) * K.ease(clamp((u - 0.25) / 0.75, 0, 1));
      var turning = u < 0.25, ang = side === 0 ? (turning ? Math.PI * (1 - u / 0.25) : 0) : (turning ? Math.PI * u / 0.25 : Math.PI);
      moveDot(walker, [px, TY]);
      var u5 = seg(since(t, clock, 13.4), 0.3, 2.2);
      cells5.forEach(function (c, i) { c.style.opacity = i / cells5.length < u5 ? 0.85 : 0.08; });
      hiA.style.opacity = u5 >= 1 ? 0.55 + 0.45 * Math.abs(Math.sin(now * 3)) : 0;
      setLine(heading, px, TY, px + 16 * Math.cos(ang), TY - 16 * Math.sin(ang) * 0);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 教师：全状态进，HOMIE 命令出 ── */
  function buildSceneTeacher() {
    var s = sceneSvg('左边是重渲的 G1 回放，前两段圈出要放下的瓶子、要抓起的瓶子和托盘（标签在右上方，虚线引过去），都是教师能直接读到的位置；右边依次出现：226 维观测分成四组的横条；' +
      '11 维输出的三组；从累加到 HOMIE 再到关节的链路（小点沿链路走）；把 HOMIE 当 API 的三个理由；代码里两个 HOMIE 模型');
    s.appendChild(svgText(24, 26, '教师：全状态进，HOMIE 命令出', 'demo-x-ink2', 13.5));
    var bot = g1Mesh(s, 'demoA'), cam = camAt(150, 24 + 215 * 150 / 170, 40 + 233 * 150 / 170);
    var F = demoFrames();
    var ov = group(s);
    /* 标签固定在机器人右上方的空白处，虚线引到物体上；按角色命名，机器人放下、拿起之后也对得上 */
    var tags = [['要放下的瓶子', C_GOOD], ['要抓起的瓶子', C_WARN], ['托盘', C_ACCENT]].map(function (k, i) {
      var g = group(ov);
      return { g: g, ring: ringAt(g, 0, 0, 9, k[1], 2.5), line: hline(g, 0, 0, 0, 0, k[1], 1.2, '3 3'), txt: halo(tone(g, 300, 62 + i * 20, k[0], k[1], 11, 'start')) };
    });
    label(s, 24, 318, '教师能直接读到物体、托盘、桌子的位姿', 'demo-x-mut', 10.5);
    var R = 424, W = 352;
    /* 第 1 段：226 维 */
    var p1 = group(s);
    label(p1, R, 64, '教师看什么：226 维', 'demo-x-ink', 14);
    var cols1 = [C_ACCENT, C_PURPLE, C_WARN, C_GOOD], x0 = R, segBars = [];
    OBS_T.forEach(function (o, i) {
      var w = o[1] / DIM.teacher * W, r = paint(svgEl('rect', { x: x0, y: 82, width: 0, height: 26, rx: 3 }), cols1[i]);
      p1.appendChild(r); segBars.push({ r: r, x: x0, w: w });
      x0 += w;
    });
    OBS_T.forEach(function (o, i) {
      var g = group(p1), y = 134 + i * 42;
      g.appendChild(paint(svgEl('rect', { x: R, y: y - 11, width: 12, height: 12, rx: 2 }), cols1[i]));
      label(g, R + 18, y, o[0] + ' ' + o[1], 'demo-x-ink', 12);
      if (o[2]) label(g, R + 18, y + 20, o[2], 'demo-x-mut', 9.5);
    });
    /* 第 2 段：11 维输出 —— 跟着回放动：3 个速度、右臂 7 个关节、右手开合（示范此刻累加出的命令） */
    var p2 = group(s);
    label(p2, R, 64, '教师输出什么：11 维增量', 'demo-x-ink', 14);
    label(p2, R + W, 64, '示范此刻的命令', 'demo-x-mut', 11, 'end');
    label(p2, R, 112, '速度 ×3', 'demo-x-ink', 12.5);
    var VC = R + 236;
    hline(p2, VC, 84, VC, 140, C_BORDER, 1.2);
    var velRows = ['前后', '左右', '转向'].map(function (n, k) {
      label(p2, R + 126, 96 + k * 20, n, 'demo-x-ink2', 11.5, 'end');
      return { b: hbar(p2, VC, 86 + k * 20, 13, C_ACCENT), v: label(p2, R + W, 96 + k * 20, '', 'demo-x-ink', 11.5, 'end') };
    });
    label(p2, R, 186, '右臂 ×7', 'demo-x-ink', 12.5);
    hline(p2, R + 96, 182, R + 96 + 7 * 34 - 8, 182, C_BORDER, 1.2);
    var armBars = [0, 1, 2, 3, 4, 5, 6].map(function (k) { return vbar(p2, R + 96 + k * 34, 18, C_WARN); });
    label(p2, R + 96, 232, '肩 ×3 · 肘 · 腕 ×3（rad）', 'demo-x-mut', 11);
    label(p2, R, 268, '右手 ×1', 'demo-x-ink', 12.5);
    var handChip = chip(p2, R + 96, 250, 120, '', C_GOOD, { size: 12, h: 28 }), handTxt = handChip.lastChild;
    label(p2, R, 304, '左臂、左手不动；整机给 PD 的是 31 维', 'demo-x-mut', 11);
    /* 第 3 段：链路 */
    var p3 = group(s);
    label(p3, R, 64, '把 HOMIE 当 API', 'demo-x-ink', 14);
    var chain = [['策略输出 11 维增量', C_TEA], ['累加成命令 $(v_x, v_y, \\omega_z)$', C_ACCENT], ['HOMIE（冻结）', C_REAL], ['腿和腰 15 个关节', C_MUTED]];
    chain.forEach(function (c, j) { chip(p3, R, 78 + j * 46, 250, c[0], c[1], { size: 12, h: 30 }); });
    label(p3, R + 262, 180, '高度 0.74 m', 'demo-x-mut', 10);
    label(p3, R + 262, 200, '躯干角 0', 'demo-x-mut', 10);
    var fl3 = [0, 1, 2].map(function () { return flowSeg(p3, C_REAL, 2, 3, 22, true); });
    /* 第 4 段：三个理由 —— 少写奖励；命令被限在安全范围（灰点是原始输出，绿点是限幅后）；底层换成别的控制器也行 */
    var p4 = group(s);
    label(p4, R, 64, '为什么不从头学走路', 'demo-x-ink', 14);
    chip(p4, R, 80, W, '少写很多奖励：平衡和走路交给 HOMIE', C_REAL, { size: 12, left: true, h: 30 });
    label(p4, R, 138, '动作在安全范围', 'demo-x-ink', 12);
    var AX0 = R + 150, AXW = 190, axX = function (v) { return AX0 + (v + 1) / 2 * AXW; };
    hline(p4, AX0, 134, AX0 + AXW, 134, C_BORDER, 1.4);
    var safeBand = paint(svgEl('rect', { x: axX(-0.5), y: 129, width: axX(0.5) - axX(-0.5), height: 10, rx: 5 }), C_GOOD);
    safeBand.style.opacity = 0.3; p4.appendChild(safeBand);
    var rawDot = dotAt(p4, axX(0), 134, 5, C_MUTED), clipDot = dotAt(p4, axX(0), 134, 5.5, C_GOOD);
    label(p4, axX(0), 158, '±0.5 m/s', 'demo-x-mut', 11, 'middle');
    label(p4, R, 192, '换个全身控制器也行', 'demo-x-ink', 12);
    chip(p4, R, 206, 70, '策略', C_TEA, { size: 12, h: 28 });
    var swapG = group(p4);
    rectBox(swapG, R + 110, 206, 130, 28, C_REAL, C_SURFACE);
    var swapTxt = label(swapG, R + 175, 224, 'HOMIE', 'demo-x-ink', 12.5, 'middle');
    chip(p4, R + 280, 206, 72, 'G1', C_ACCENT, { size: 12, h: 28 });
    var fl4 = [flowSeg(p4, C_TEA, 2, 3, 30), flowSeg(p4, C_REAL, 2, 3, 30)];
    label(p4, R, 268, '灰点：原始输出　绿点：真正发出去的命令', 'demo-x-mut', 11);
    /* 第 5 段：代码里的两个 HOMIE */
    var p5 = group(s);
    label(p5, R, 64, '代码里：两个冻结的 HOMIE', 'demo-x-ink', 14);
    var walkC = chip(p5, R, 84, 160, '**走**', C_REAL, { size: 13, h: 34 }), standC = chip(p5, R + 180, 84, 160, '**站**', C_REAL, { size: 13, h: 34 });
    label(p5, R, 150, '速度命令够大用「走」，否则用「站」', 'demo-x-ink2', 11.5);
    var cmdTxt = label(p5, R, 178, '', 'demo-x-ink', 12);
    label(p5, R, 210, '手不是 7 个关节各给目标：', 'demo-x-ink2', 11.5);
    label(p5, R, 230, '累加值 ≥ 0 握住，< 0 张开', 'demo-x-ink2', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock), j = loopFrame(now), f = F[j];
      bot.put(cam, j);
      var pts = [f.hold, f.front, DEMO.tray];
      tags.forEach(function (k, i) {
        var q = project(pts[i], cam);
        moveDot(k.ring, q);
        setLine(k.line, q[0], q[1], 296, 58 + i * 20);
      });
      setOpacity(ov, win(t, 0.3, 7.0));
      velRows.forEach(function (r, k) {
        var v = f.cmd[k], w = Math.abs(v) * 100;
        r.b.setAttribute('x', (v < 0 ? VC - w : VC).toFixed(1)); setW(r.b, w);
        r.v.textContent = sgn(f2(v));
      });
      armBars.forEach(function (b, k) { var v = f.arm[k], h = Math.abs(v) * 22; b.node.setAttribute('y', (v >= 0 ? 182 - h : 182).toFixed(1)); b.node.setAttribute('height', h.toFixed(1)); });
      var closed = f.prim >= 0.5;
      handTxt.textContent = closed ? '握住' : '张开';
      handChip.firstChild.style.stroke = closed ? C_GOOD : C_MUTED;
      var u4 = since(t, clock, 10.4), raw = -1 + 2 * rnd(Math.floor(u4 / 0.7), 17);
      moveDot(rawDot, [axX(raw), 134]); moveDot(clipDot, [axX(clamp(raw, -0.5, 0.5)), 134]);
      swapTxt.textContent = ['HOMIE', 'TWIST2', 'SONIC'][Math.floor(u4 / 1.4) % 3];
      fl4[0].at(now, [R + 72, 220], [R + 108, 220], true);
      fl4[1].at(now, [R + 242, 220], [R + 278, 220], true);
      var u1 = seg(since(t, clock, 0.4), 0.2, 2.0);
      segBars.forEach(function (b) { setW(b.r, clamp((u1 * DIM.teacher * 1.0 - (b.x - R) / W * DIM.teacher) / DIM.teacher * W, 0, b.w)); });
      fl3.forEach(function (fl, i) { fl.at(now, [R + 125, 78 + i * 46 + 32], [R + 125, 78 + (i + 1) * 46 - 2], true); });
      var n = Math.hypot(2 * f.cmd[0], 2 * f.cmd[1], 0.5 * f.cmd[2]), walk = n > 0.5;
      setOpacity(walkC, walk ? 1 : 0.3); setOpacity(standC, walk ? 0.3 : 1);
      cmdTxt.textContent = '此刻：vx ' + sgn(f2(f.cmd[0])) + '，vy ' + sgn(f2(f.cmd[1])) + '，ωz ' + sgn(f2(f.cmd[2]));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: 奖励按阶段开关（附录表 3） ── */
  var REWARD_ROWS = [
    ['走近', '+2', [1, 1, 1, 1, 1]], ['朝向物体', '−10000', [1, 0, 0, 0, 0]], ['手保持握住', '+9', [1, 1, 0, 1, 1]],
    ['托盘附近放下', '+10', [1, 1, 0, 0, 0]], ['手离瓶子近', '+20', [0, 0, 0, 1, 1]], ['举高', '+200', [0, 0, 0, 1, 1]],
    ['举起目标', '+10', [0, 0, 0, 1, 1]], ['转身', '+15', [0, 0, 0, 0, 1]], ['瓶子在桌上滑', '−1000', [0, 1, 1, 1, 1]],
    ['单脚着地时手指在动', '−3000', [0, 1, 1, 1, 0]]
  ];
  function buildSceneReward() {
    var s = sceneSvg('左边是附录表 3 里十项奖励在五个阶段的开关矩阵，实心点表示这一项在该阶段生效，高亮的一列跟着右边示范回放的阶段走；' +
      '右边依次出现：走近奖励随距离变化的钟形曲线和示范里此刻的点；托盘附近还捏着瓶子就扣分；举高的刻度条；转身的朝向表盘；代码里的写法');
    s.appendChild(svgText(24, 26, '奖励按阶段开关（附录表 3）', 'demo-x-ink2', 13.5));
    var MX = 168, MY = 70, CW = 44, RH = 23;
    STAGES.forEach(function (st, i) {
      label(s, MX + i * CW + CW / 2, MY - 10, i + ' ' + st.zh, 'demo-x-ink2', 10.5, 'middle');
    });
    var colHi = paint(svgEl('rect', { x: MX, y: MY - 2, width: CW, height: RH * REWARD_ROWS.length + 4, rx: 5 }), C_SURFACE2);
    s.appendChild(colHi);
    var dots = REWARD_ROWS.map(function (r, i) {
      label(s, MX - 52, MY + i * RH + 15, r[0], 'demo-x-ink2', 10.5, 'end');
      tone(s, MX - 8, MY + i * RH + 15, r[1], r[1].charAt(0) === '−' ? C_BAD : C_GOOD, 10, 'end');
      return r[2].map(function (on, k) {
        var c = on ? dotAt(s, MX + k * CW + CW / 2, MY + i * RH + 11, 5.5, r[1].charAt(0) === '−' ? C_BAD : C_GOOD) : ringAt(s, MX + k * CW + CW / 2, MY + i * RH + 11, 3, C_BORDER, 1);
        return c;
      });
    });
    label(s, 24, MY + RH * REWARD_ROWS.length + 42, '表 3 一共三十多项，这里挑了十项', 'demo-x-mut', 10);
    var F = demoFrames();
    var stLab = label(s, MX + 2.5 * CW, 318, '', 'demo-x-ink', 11, 'middle');
    var R = 424, W = 352;
    /* 第 1 段：走近奖励的钟形曲线 */
    var p1 = group(s);
    label(p1, R, 64, '走近：离瓶子 0.45 m 时满分', 'demo-x-ink', 14);
    math(p1, R, 96, 'r_{\\text{walk}}=\\exp\\!\\big(-4\\,(d-0.45)^2\\big)', 15);
    var pb = plotBox(p1, R + 30, 116, W - 40, 132, 0, 1.6, 0, 1.05);
    var dd = [];
    for (var k = 0; k <= 64; k++) dd.push(rWalk(k * 0.025));
    pb.curve(dd, 0.025, C_GOOD, 2.2).upto(9);
    var pdot = dotAt(p1, 0, 0, 6, C_ACCENT), pval = label(p1, R, 287, '', 'demo-x-ink', 11.5);
    label(p1, R + 30, 265, '0', 'demo-x-mut', 9.5, 'middle');
    label(p1, R + 30 + (W - 40) * 0.45 / 1.6, 265, '0.45', 'demo-x-mut', 9.5, 'middle');
    label(p1, R + W - 10, 265, '1.6 m', 'demo-x-mut', 9.5, 'middle');
    readHint(p1, R, 310, '横轴：骨盆到瓶子的水平距离；纵轴：这一项的分', 10, W);
    /* 第 2 段：放下 */
    var p2 = group(s);
    label(p2, R, 64, '放下：到了托盘还捏着，扣分', 'demo-x-ink', 14);
    rectBox(p2, R + 100, 170, 130, 50, C_ACCENT, C_SURFACE2);
    label(p2, R + 242, 200, '托盘', 'demo-x-ink2', 11);
    ringAt(p2, R + 165, 160, 70, C_ACCENT, 1.2).setAttribute('stroke-dasharray', '4 4');
    label(p2, R + 250, 108, '0.3 m 以内', 'demo-x-mut', 10.5);
    var bottle2 = paint(svgEl('rect', { x: R + 152, y: 120, width: 26, height: 56, rx: 6 }), C_GOOD);
    p2.appendChild(bottle2);
    var fingers = [hline(p2, 0, 0, 0, 0, C_BAD, 4), hline(p2, 0, 0, 0, 0, C_BAD, 4)];
    var forceTxt = label(p2, R, 290, '', 'demo-x-ink', 12);
    /* 第 3 段：举高 */
    var p3 = group(s);
    label(p3, R, 64, '抓起：举高，封顶 0.15 m', 'demo-x-ink', 14);
    var GX = R + 60, GB = 268, GT = 98;
    rectBox(p3, GX - 14, GT, 28, GB - GT, C_BORDER, C_SURFACE2);
    var gauge = paint(svgEl('rect', { x: GX - 12, y: GB, width: 24, height: 0, rx: 3 }), C_GOOD);
    p3.appendChild(gauge);
    var capY = GB - (GB - GT) * 0.15 / 0.4;
    hline(p3, GX - 22, capY, GX + 60, capY, C_BAD, 1.5, '4 3');
    label(p3, GX + 66, capY + 4, '0.15 m 封顶', 'demo-x-ink2', 11);
    var liftTxt = label(p3, GX + 66, 150, '', 'demo-x-ink', 12);
    label(p3, GX + 66, 238, '另有一项：离举起目标越近越好', 'demo-x-mut', 10.5);
    label(p3, GX + 66, 258, '代码：放在桌上是 0，举高 10 cm 封顶', 'demo-x-mut', 10.5);
    /* 第 4 段：转身 */
    var p4 = group(s);
    label(p4, R, 64, '转身：朝向差多少扣多少', 'demo-x-ink', 14);
    var DX = R + 110, DY = 180;
    ringAt(p4, DX, DY, 70, C_BORDER, 1.5);
    var want = arrow(p4, C_GOOD, 2.5, '5 4'); want.set(DX, DY, DX - 64, DY, 10);
    label(p4, DX - 70, DY - 12, '目标朝向', 'demo-x-ink2', 10.5, 'end');
    var cur = arrow(p4, C_ACCENT, 3);
    var arc = pathLine(p4, [], C_BAD, 3);
    var yawTxt = label(p4, DX + 86, 170, '', 'demo-x-ink', 12);
    label(p4, DX + 86, 194, '转过约 134° 算完成', 'demo-x-mut', 10.5);
    /* 第 5 段：代码 —— 每项都乘步长 0.02：两根条从表里的权重缩到每一步真正给的分；「按阶段」就是左边矩阵里的开关 */
    var p5 = group(s);
    label(p5, R, 64, '代码里的写法：每项 × 步长 0.02', 'demo-x-ink', 14);
    var scaleRows = [['走近', 2, C_GOOD], ['终止惩罚', -2000, C_BAD]].map(function (r, j) {
      label(p5, R, 100 + j * 52, r[0], 'demo-x-ink2', 12);
      var b = hbar(p5, R + 80, 88 + j * 52, 16, r[2]);
      return { b: b, v: label(p5, R + 86, 100 + j * 52, '', 'demo-x-ink', 12), w0: r[1] };
    });
    label(p5, R, 200, '条长按对数画；一步最多 0.04 分，终止一次 −40', 'demo-x-mut', 11);
    label(p5, R, 236, '「按阶段」：每项只在某几个阶段打开，', 'demo-x-ink2', 12);
    rich(p5, R, 258, '就是左边矩阵里的实心点；没有 $w_i$', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock), j = loopFrame(now), f = F[j], st = stageAt(f.t);
      colHi.setAttribute('x', MX + st * CW);
      dots.forEach(function (row, i) { row.forEach(function (c, k) { c.style.opacity = REWARD_ROWS[i][2][k] ? (k === st ? 1 : 0.35) : 0.6; }); });
      stLab.textContent = '示范第 ' + f1(f.t) + ' s：阶段 ' + st + '（' + STAGES[st].zh + '）';
      moveDot(pdot, [pb.px(clamp(f.dFront, 0, 1.6)), pb.py(rWalk(f.dFront))]);
      pval.textContent = '此刻 d = ' + f2(f.dFront) + ' m，r = ' + f3(rWalk(f.dFront));
      var c2 = since(t, clock, 3.6) % 4, drop = clamp((c2 - 1.6) / 0.8, 0, 1), grip = c2 < 1.6;
      bottle2.setAttribute('y', (120 + 44 * drop).toFixed(1));
      setLine(fingers[0], R + 146, 132 + 44 * drop, R + 146 - (grip ? 0 : 14), 160 + 44 * drop);
      setLine(fingers[1], R + 184, 132 + 44 * drop, R + 184 + (grip ? 0 : 14), 160 + 44 * drop);
      fingers.forEach(function (l) { l.style.stroke = grip ? C_BAD : C_GOOD; });
      forceTxt.textContent = grip ? '还捏着：扣分（−捏力）' : '松开了：不扣';
      var lift = clamp(f.lift - 0.075, 0, 0.4), gh = (GB - GT) * lift / 0.4;
      gauge.setAttribute('y', (GB - gh).toFixed(1)); gauge.setAttribute('height', gh.toFixed(1));
      liftTxt.textContent = '此刻离桌 ' + f2(lift) + ' m → 得 ' + f2(Math.min(lift + 0.075, 0.15));
      /* 朝向按示范里骨盆的偏航画（俯视，x 朝右）；目标朝向是 −x，红弧是还差的角度 */
      var h = f.yaw, rem = Math.abs(((h - Math.PI) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
      cur.set(DX, DY, DX + 64 * Math.cos(h), DY - 64 * Math.sin(h), 10);
      var arcPts = [], tgt = h <= 0 ? -Math.PI : Math.PI;
      for (var q = 0; q <= 20; q++) { var a = h + (tgt - h) * q / 20; arcPts.push([DX + 40 * Math.cos(a), DY - 40 * Math.sin(a)]); }
      setPath(arc, arcPts);
      yawTxt.textContent = '还差 ' + Math.round(rem * 180 / Math.PI) + '°';
      var u5 = K.ease(seg(since(t, clock, 13.4), 0.6, 2.4));
      scaleRows.forEach(function (r) {
        var v = r.w0 * (1 - 0.98 * u5), lw = 40 * (Math.log10(Math.abs(v)) + 2);
        setW(r.b, Math.max(4, lw)); r.v.setAttribute('x', (R + 86 + Math.max(4, lw)).toFixed(1)); r.v.textContent = sgn(Math.abs(v) >= 10 ? Math.round(v) : fmt(v, 2));
      });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 增量动作 ── */
  function buildSceneDelta() {
    var s = sceneSvg('左边两张小图是同一串探索噪声下的前进命令：上面是绝对动作，命令每一步都在两头乱跳；下面是增量动作，命令围着 0.25 m/s 慢慢变（玩具，种子固定）；' +
      '右边依次出现：累加公式；示范里 0.1 s 起步到 0.5 m/s 的台阶；手臂每步 0.025 rad 和手的开合；图 9 里去掉增量动作的曲线；我们的理解');
    s.appendChild(svgText(24, 26, '增量动作：输出变化量，累加到命令上', 'demo-x-ink2', 13.5));
    var toy = toyCommand(6200, 3);  // 两分钟长：左边两张小图一直往前滚，不绕回开头
    var pa = plotBox(s, 24, 58, 380, 100, 0, 2, -0.55, 0.55), pd = plotBox(s, 24, 204, 380, 100, 0, 2, -0.55, 0.55);
    label(s, 24, 50, '绝对动作：命令 = 这一步的输出', 'demo-x-ink', 12);
    label(s, 24, 196, '增量动作：命令 = 上一步 + 0.1 × 输出', 'demo-x-ink', 12);
    [pa, pd].forEach(function (p) { hline(s, p.px(0), p.py(0), p.px(2), p.py(0), C_BORDER, 1, '3 3'); });
    var la = pa.curve([], 0.02, C_BAD, 1.6), ld = pd.curve([], 0.02, C_GOOD, 2);
    label(s, 404, 176, '±0.5 m/s 之间乱跳', 'demo-x-ink2', 10.5, 'end');
    label(s, 404, 322, '每步只变 0.05 左右', 'demo-x-ink2', 10.5, 'end');
    readHint(s, 24, 342, '横轴：最近 2 秒；纵轴：前进命令（m/s）。玩具：噪声标准差 0.5（表 5）', 10, 380);
    var R = 424, W = 352;
    /* 第 1 段：公式 —— 数轴上的绿点是命令 c，每一步按这一步的输出 a 挪 0.1·a（蓝箭头） */
    var p1 = group(s);
    label(p1, R, 64, '每一步（代码）', 'demo-x-ink', 14);
    math(p1, R, 106, 'c_t=c_{t-1}+0.1\\,a_t', 20);
    var NX0 = R + 24, NXW = W - 48, nx = function (v) { return NX0 + (v + 0.5) * NXW; };
    hline(p1, NX0, 182, NX0 + NXW, 182, C_BORDER, 1.4);
    [-0.5, 0, 0.5].forEach(function (v) { hline(p1, nx(v), 177, nx(v), 187, C_BORDER, 1.4); label(p1, nx(v), 204, sgn(String(v)), 'demo-x-mut', 11, 'middle'); });
    var stepArr = arrow(p1, C_ACCENT, 2.5), cDot = dotAt(p1, nx(0), 182, 7, C_GOOD);
    var aTxt = label(p1, R, 238, '', 'demo-x-ink', 12.5);
    label(p1, R, 266, '想保持不动：输出 0 就行', 'demo-x-ink2', 12);
    /* 第 2 段：起步台阶 */
    var p2 = group(s);
    label(p2, R, 64, '起步：5 步、0.1 s 到 0.5 m/s', 'demo-x-ink', 14);
    var stepBars = [];
    for (var i = 0; i < 8; i++) {
      var b = vbar(p2, R + 20 + i * 38, 26, i < 5 ? C_ACCENT : C_GOOD);
      label(p2, R + 33 + i * 38, 262, String(i + 1), 'demo-x-mut', 10, 'middle');
      stepBars.push(b);
    }
    hline(p2, R + 10, 248, R + W - 10, 248, C_BORDER, 1.2);
    hline(p2, R + 10, 248 - 150, R + W - 10, 248 - 150, C_BAD, 1, '4 3');
    label(p2, R + W - 10, 248 - 156, '0.5 m/s（命令上限）', 'demo-x-ink2', 10.5, 'end');
    label(p2, R, 290, '每步输出 a = 1：前 5 步往上加，之后输出 0 保持', 'demo-x-mut', 10.5);
    /* 第 3 段：手臂与手 */
    var p3 = group(s);
    label(p3, R, 64, '手臂再乘 0.25，手看正负', 'demo-x-ink', 14);
    var JX = R + 70, JY = 190;
    ringAt(p3, JX, JY, 8, C_WARN, 3);
    var armLine = hline(p3, JX, JY, JX, JY + 80, C_WARN, 6);
    var armTxt = label(p3, JX + 80, 150, '', 'demo-x-ink', 12);
    label(p3, JX + 80, 174, '输出 1：每步 0.025 rad', 'demo-x-ink2', 11);
    label(p3, JX + 80, 196, '转 1 rad 要 40 步（0.8 s）', 'demo-x-mut', 10.5);
    var handC = chip(p3, JX + 80, 220, 150, '', C_GOOD, { size: 12, h: 30 });
    var handT = handC.lastChild;
    /* 第 4 段：图 9 去掉增量动作 */
    var p4 = group(s);
    label(p4, R, 64, '图 9：去掉增量动作', 'demo-x-ink', 14);
    var p9 = plotBox(p4, R + 30, 82, W - 40, 150, 0, 30, 0, 1);
    var c9 = p9.curve(FIG9S.full, 0.5, C_GOOD, 2.2), c9n = p9.curve(FIG9S.noDelta, 0.5, C_BAD, 2.6);
    label(p4, R + 30, 248, '0', 'demo-x-mut', 9.5, 'middle'); label(p4, R + W - 10, 248, '3 万次迭代', 'demo-x-mut', 9.5, 'end');
    label(p4, R + 22, 90, '1', 'demo-x-mut', 9.5, 'end'); label(p4, R + 22, 236, '0', 'demo-x-mut', 9.5, 'end');
    legendRow(p4, R, 272, [['完整', C_GOOD, 30], ['绝对关节目标', C_BAD, 80]], 10.5);
    readHint(p4, R, 298, '纵轴：成功率，越高越好；红线贴着 0', 10, W);
    /* 第 5 段：理解 —— 左边玩具里命令每步平均变多少（同一串噪声），两根条对比 */
    var p5 = group(s);
    label(p5, R, 64, '为什么这么关键', 'demo-x-ink', 14);
    chip(p5, R, 80, W, '论文：显著**加快、稳定**训练（原因没说）', C_ACCENT, { size: 12, left: true, h: 30 });
    var dAbs = 0, dDel = 0;
    for (var q = 1; q < 3000; q++) { dAbs += Math.abs(toy.abs[q] - toy.abs[q - 1]); dDel += Math.abs(toy.del[q] - toy.del[q - 1]); }
    dAbs /= 2999; dDel /= 2999;
    label(p5, R, 140, '我们的理解：左边玩具里，命令每步平均变多少', 'demo-x-ink2', 11.5);
    var b5 = [['绝对动作', dAbs, C_BAD], ['增量动作', dDel, C_GOOD]].map(function (r, j) { return { b: barRowAt(p5, R, 154 + j * 30, 80, r[0], r[2], 18, 12), v: r[1] }; });
    label(p5, R, 236, '探索噪声每步只把命令推一点；', 'demo-x-ink2', 12);
    label(p5, R, 258, '站着、手停住，输出 0 就行；', 'demo-x-ink2', 12);
    label(p5, R, 280, '手要连着几步同号才翻转，不会抖', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var k0 = Math.floor(now * 50) % 6000, wa = [], wd = [];
      for (var q = 0; q < 100; q++) { wa.push(toy.abs[k0 + q]); wd.push(toy.del[k0 + q]); }
      la.upto && setPath(la.node, wa.map(function (v, i) { return [pa.px(i * 0.02), pa.py(v)]; }));
      setPath(ld.node, wd.map(function (v, i) { return [pd.px(i * 0.02), pd.py(v)]; }));
      var u2 = since(t, clock, 3.6) % 4;
      stepBars.forEach(function (b, i) { var v = Math.min(i + 1, 5) * 0.1; b.set(248, i < u2 * 3 ? v / 0.5 * 150 : 0); });
      var u3 = since(t, clock, 7.0), steps = Math.floor((u3 % 3) * 15), ang = 0.025 * steps;
      setLine(armLine, JX, JY, JX + 80 * Math.sin(ang), JY + 80 * Math.cos(ang));
      armTxt.textContent = steps + ' 步：' + f3(ang) + ' rad';
      var acc = Math.sin(now * 1.3) * 0.6;
      handT.textContent = acc >= 0 ? '累加 ≥ 0：握住' : '累加 < 0：张开';
      var u4 = seg(since(t, clock, 10.4), 0.2, 2.6) * 30;
      var A_SEQ = [1, 1, 1, 0, 0, -1, -1, -1, -1, -1, 0, 0, 1, 1, 0, 0], k1 = Math.floor(since(t, clock, 0.4) / 0.7), cPrev = 0, cNow = 0, aNow = 0;
      for (var q = 0; q <= k1; q++) { aNow = A_SEQ[q % A_SEQ.length]; cPrev = cNow; cNow = clamp(cNow + 0.1 * aNow, -0.5, 0.5); }
      moveDot(cDot, [nx(cNow), 182]);
      stepArr.set(nx(cPrev), 166, nx(cNow) + (aNow === 0 ? 0.01 : 0), 166, aNow === 0 ? 0.1 : 8);
      stepArr.g.style.opacity = aNow === 0 ? 0 : 1;
      aTxt.textContent = '这一步 a = ' + sgn(String(aNow)) + '：c 从 ' + sgn(f1(cPrev)) + ' 到 ' + sgn(f1(cNow));
      b5.forEach(function (r) { var u = K.ease(seg(since(t, clock, 13.4), 0.3, 1.3)); r.b.set(r.v / dAbs * 180 * u, f3(r.v * u) + ' m/s'); });
      c9.upto(u4); c9n.upto(u4);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 7: 参考状态初始化（图 4、图 9） ── */
  function buildSceneRSI() {
    var s = sceneSvg('左上是论文图 4 的示范帧，下面六格是我们从官方另外六段示范里各取一帧重渲的起点（不同阶段、不同桌高），逐个亮起；' +
      '右边依次出现：五个阶段一个比一个难碰到的示意；从一段示范里随机抽一帧当起点；代码里的示范数量与抽法；图 9 里有无 RSI 的成功率曲线；我们的读法');
    s.appendChild(svgText(24, 26, '参考状态初始化：从示范的某一帧开始', 'demo-x-ink2', 13.5));
    var fig = paperPart(s, 'fig4', 0, 0, 1, 1, 24, 44, 380, '');
    label(s, 24, 44 + fig.h + 16, '论文图 4：教师的参考状态初始化', 'demo-x-mut', 9.5);
    var snaps = [['走近', 0.667], ['预放', 0.685], ['松手后', 0.705], ['抓起', 0.735], ['举起', 0.755], ['转身', 0.775]];
    var snapG = snaps.map(function (sn, i) {
      var g = group(s), cx = 24 + (i % 3) * 128, cy = 136 + Math.floor(i / 3) * 96;
      rectBox(g, cx, cy, 122, 88, C_BORDER, C_SURFACE);
      var m = g1Mesh(g, 'rsi'), k = 118 / 440; m.put(camAt(170 * k, cx + 2 + 215 * k, cy - 4 + 233 * k), i);
      label(g, cx + 6, cy + 83, sn[0] + ' · ' + sn[1] + ' m', 'demo-x-ink2', 9.5);
      return g;
    });
    label(s, 24, 340, '每格：阶段 · 桌高（我们从六段示范里各取一帧重渲）', 'demo-x-mut', 11);
    var R = 424, W = 352;
    /* 第 1 段：越往后越难碰到 */
    var p1 = group(s);
    label(p1, R, 64, '长时程：后面的阶段很难碰到', 'demo-x-ink', 14);
    var reach = [1, 0.55, 0.25, 0.08, 0.02];
    var reachBars = STAGES.map(function (st, i) { return barRowAt(p1, R, 84 + i * 30, 60, st.zh, STAGE_C[i], 16, 11); });
    label(p1, R, 252, '从头开始探索：前一个没学会，后一个见不到', 'demo-x-ink2', 11);
    label(p1, R + W, 274, '示意，不是论文的数', 'demo-x-mut', 9.5, 'end');
    /* 第 2 段：随机抽一帧 */
    var p2 = group(s);
    label(p2, R, 64, '200 段仿真里的遥操作示范', 'demo-x-ink', 14);
    var TB = stageBar(p2, R, 100, W, { h: 14 });
    var pick = ringAt(p2, R, 107, 9, 'var(--text)', 2.5);
    var pickTxt = label(p2, R, 160, '', 'demo-x-ink', 12.5);
    label(p2, R, 190, '每次重置：抽一段、抽一帧，', 'demo-x-ink2', 12);
    label(p2, R, 212, '机器人、物体、桌子都照那一帧摆好', 'demo-x-ink2', 12);
    label(p2, R, 244, '还到不了的阶段，一开始就能练', 'demo-x-ink', 12);
    /* 第 3 段：代码 */
    var p3 = group(s);
    label(p3, R, 64, '代码里', 'demo-x-ink', 14);
    var demoN = label(p3, R, 104, '', 'demo-x-ink', 22);
    label(p3, R + 110, 104, '段示范（论文写 200）', 'demo-x-ink2', 12);
    label(p3, R, 136, '共 59.7 分钟，每段 8.5–17.9 s', 'demo-x-ink2', 11.5);
    DEMOS.days.forEach(function (d, i) {
      var b = barRowAt(p3, R, 152 + i * 24, 50, d[0], C_ACCENT, 14, 10.5);
      b.set(d[1] / 101 * 200, d[1] + ' 段');
    });
    label(p3, R, 268, '每次重置都从示范开始；1 s 窗口 × 10 帧', 'demo-x-mut', 10.5);
    /* 第 4 段：图 9 */
    var p4 = group(s);
    label(p4, R, 64, '图 9：去掉 RSI', 'demo-x-ink', 14);
    var p9 = plotBox(p4, R + 30, 82, W - 40, 150, 0, 30, 0, 1);
    var c9 = p9.curve(FIG9S.full, 0.5, C_GOOD, 2.2), c9r = p9.curve(FIG9S.noRSI, 0.5, C_WARN, 2.4);
    hline(p4, p9.px(0), p9.py(0.1), p9.px(30), p9.py(0.1), C_BAD, 1, '4 3');
    halo(label(p4, p9.px(30) - 4, p9.py(0.1) - 5, '0.1', 'demo-x-ink2', 9.5, 'end'));
    label(p4, R + 30, 248, '0', 'demo-x-mut', 9.5, 'middle'); label(p4, R + W - 10, 248, '3 万次迭代', 'demo-x-mut', 9.5, 'end');
    legendRow(p4, R, 272, [['完整（约 0.94）', C_GOOD, 90], ['去掉 RSI（< 0.1）', C_WARN, 100]], 10.5);
    readHint(p4, R, 298, '纵轴：成功率，越高越好', 10, W);
    /* 第 5 段：读法 */
    var p5 = group(s);
    label(p5, R, 64, '奖励不低，成功率却几乎是 0', 'demo-x-ink', 14);
    var rb = [['完整', 650, C_GOOD], ['去掉 RSI', 480, C_WARN], ['去掉增量', -60, C_BAD]].map(function (r, i) {
      var b = barRowAt(p5, R, 90 + i * 32, 70, r[0], r[2], 18, 11);
      return { b: b, v: r[1] };
    });
    label(p5, R, 214, '图 9 左：最后的奖励（读图）', 'demo-x-mut', 10);
    label(p5, R, 244, '我们的读法：前几个阶段的分拿到了，', 'demo-x-ink2', 11.5);
    label(p5, R, 266, '抓起、转身一直没被探索到', 'demo-x-ink2', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      snapG.forEach(function (g, i) { setOpacity(g, seg(t, 0.4 + i * 0.35, 0.7 + i * 0.35)); });
      reachBars.forEach(function (b, i) { b.set(reach[i] * 190 * K.ease(seg(since(t, clock, 0.4), 0.3 + i * 0.3, 0.9 + i * 0.3)), ''); });
      var k = Math.floor(since(t, clock, 3.6) / 1.2), tt = rnd(k, 5) * DEMO_EVENTS.len;
      moveDot(pick, [R + tt / DEMO_EVENTS.len * W, 107]);
      TB.put(tt);
      pickTxt.textContent = '抽到第 ' + f1(tt) + ' s：阶段 ' + stageAt(tt) + '（' + STAGES[stageAt(tt)].zh + '）';
      demoN.textContent = countTo(DEMOS.n, seg(since(t, clock, 7.0), 0.2, 1.2));
      var u4 = seg(since(t, clock, 10.4), 0.2, 2.6) * 30;
      c9.upto(u4); c9r.upto(u4);
      rb.forEach(function (r) { var w = Math.abs(r.v) / 650 * 200 * K.ease(seg(since(t, clock, 13.4), 0.3, 1.3)); r.b.set(w, sgn(String(r.v))); });
      void now;
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 学生只看一张图 ── */
  function buildSceneStudent() {
    var s = sceneSvg('左边是学生相机的画面：108 × 192 的小图按像素放大，跟着示范回放走（我们按代码的相机安装位置与内参重渲）；' +
      '右边依次出现：学生的输入怎么拼；比教师少了哪些（逐个打叉）；相机的视场和瓶子只占十几个像素；项目页里真机上学生看到的画面；代码里的归一化和延迟');
    s.appendChild(svgText(24, 26, '学生只看一张图：108 × 192', 'demo-x-ink2', 13.5));
    var ego = egoView(s, 'egoA', 24, 48, 380);
    label(s, 24, 48 + ego.h + 18, '学生相机（我们按代码的安装位置与内参重渲）', 'demo-x-mut', 9.5);
    var tLab = label(s, 404, 48 + ego.h + 18, '', 'demo-x-mut', 9.5, 'end');
    var bbox = rectBox(s, 24 + 111 / 192 * 380, 48 + 34 / 108 * ego.h, 24 / 192 * 380, 37 / 108 * ego.h, C_BAD, 'none');
    bbox.style.fill = 'none'; bbox.setAttribute('stroke-width', 2.5);
    var F = demoFrames();
    var R = 424, W = 352;
    /* 第 1 段：输入 */
    var p1 = group(s);
    label(p1, R, 64, '学生的输入', 'demo-x-ink', 14);
    chip(p1, R, 82, 150, '一张 RGB 图', C_STU, { size: 12, h: 30 });
    chip(p1, R, 126, 150, '视觉编码器', C_STU, { size: 12, h: 30 });
    chip(p1, R, 170, 150, '128 维特征', C_STU, { size: 12, h: 30 });
    chip(p1, R + 190, 170, 150, '本体感受 113 维', C_ACCENT, { size: 12, h: 30 });
    chip(p1, R + 95, 222, 150, '策略头 → 11 维', C_GOOD, { size: 12, h: 30 });
    var fl1 = [0, 1, 2, 3].map(function () { return flowSeg(p1, C_STU, 2, 3, 20, true); });
    label(p1, R, 284, '113 + 128 = 241 维进策略头', 'demo-x-ink2', 11.5);
    /* 第 2 段：少了什么 */
    var p2 = group(s);
    label(p2, R, 64, '比教师少了什么', 'demo-x-ink', 14);
    var lost = ['物体和桌子的位姿', '指尖力', '当前阶段', '基座线速度', '手指关节'];
    var lostG = lost.map(function (k, i) {
      var g = group(p2);
      chip(g, R, 80 + i * 40, W - 40, k, C_MUTED, { size: 12, left: true, h: 30 });
      return { g: g, x: cross(p2, R + W - 28, 80 + i * 40 + 7, 16, C_BAD) };
    });
    label(p2, R, 296, '226 维 → 113 维 + 一张图', 'demo-x-ink2', 11.5);
    /* 第 3 段：视场 */
    var p3 = group(s);
    label(p3, R, 64, '头上的 RealSense D435i', 'demo-x-ink', 14);
    var CX = R + 40, CY = 170;
    var fov = paint(svgEl('path', { d: 'M' + CX + ' ' + CY + ' L' + (CX + 150) + ' ' + (CY - 104) + ' L' + (CX + 150) + ' ' + (CY + 104) + ' Z', 'stroke-width': 1.5 }), C_SURFACE2, C_STU);
    p3.appendChild(fov);
    dotAt(p3, CX, CY, 6, C_STU);
    label(p3, CX + 160, CY - 20, '水平 69.4°', 'demo-x-ink', 12.5);
    label(p3, CX + 160, CY + 2, '竖直 42.5°', 'demo-x-ink', 12.5);
    label(p3, CX + 160, CY + 30, '焦距 1.88 mm', 'demo-x-mut', 10.5);
    label(p3, R, 296, '0.53 m 外的瓶子：约 16 像素宽（红框）', 'demo-x-ink2', 11.5);
    /* 第 4 段：真机上看到的 */
    var p4 = group(s);
    label(p4, R, 64, '真机上学生看到的', 'demo-x-ink', 14);
    var real = projClip(p4, 'rgbinput', R, 80, 324, 180, '项目页视频（4 倍速）：真机的 RGB 输入', { capDy: 16 });
    /* 第 5 段：代码 —— 左边小图是 3 步（60 ms）前的画面，右边是相机此刻拍到的；下面一条 50 Hz 的时间轴 */
    var p5 = group(s);
    label(p5, R, 64, '代码里：用 3 步前的图', 'demo-x-ink', 14);
    var egoOld = egoView(p5, 'egoA', R, 82, 160), egoNow = egoView(p5, 'egoA', R + W - 160, 82, 160);
    var oldBox = rectBox(p5, R - 3, 79, 166, egoOld.h + 6, C_GOOD, 'none'); oldBox.style.fill = 'none'; oldBox.setAttribute('stroke-width', 2.5);
    label(p5, R, 82 + egoOld.h + 20, '策略用的（第 t − 3 步）', 'demo-x-ink', 11.5);
    label(p5, R + W, 82 + egoOld.h + 20, '相机此刻（第 t 步）', 'demo-x-ink2', 11.5, 'end');
    var TX0 = R + 80, TXW = W - 160, TY = 82 + egoOld.h + 58;
    hline(p5, R + 40, TY, R + W - 40, TY, C_BORDER, 1.4);
    var ticks = [0, 1, 2, 3].map(function (i) {
      var x = TX0 + i * TXW / 3;
      hline(p5, x, TY - 5, x, TY + 5, C_BORDER, 1.4);
      label(p5, x, TY + 20, i === 3 ? 't' : 't − ' + (3 - i), 'demo-x-mut', 11, 'middle');
      return dotAt(p5, x, TY, 5, i ? C_MUTED : C_GOOD);
    });
    label(p5, R + W / 2, TY - 12, '每步 20 ms，固定落后 60 ms', 'demo-x-ink2', 11.5, 'middle');
    chip(p5, R, 262, W, '再按 ImageNet 的均值方差归一化', C_STU, { size: 12, left: true, h: 28 });
    rich(p5, R, 312, '相机挂在 `d435_link` 上：偏移 3.5 cm、转 3.4°', 11, 'demo-x-mut');
    function draw(t, clock) {
      var now = nowOf(t, clock), freeze = t >= 7.0 && t < 10.4, j = freeze ? 62 : loopFrame(now);
      ego.put(j);
      tLab.textContent = '示范第 ' + f1(F[j].t) + ' s';
      setOpacity(bbox, win(t, 7.0, 10.4));
      fl1[0].at(now, [R + 75, 114], [R + 75, 124], true);
      fl1[1].at(now, [R + 75, 158], [R + 75, 168], true);
      fl1[2].at(now, [R + 75, 202], [R + 150, 220], true);
      fl1[3].at(now, [R + 265, 202], [R + 190, 220], true);
      lostG.forEach(function (k, i) { k.x.style.opacity = seg(t, 4.2 + i * 0.4, 4.5 + i * 0.4); });
      real.at(K.clipSince(t, 10.4), t >= 10.4 && t < 13.7);
      egoNow.put(loopFrame(now)); egoOld.put(loopFrame(now - 0.06));
      var hop = Math.floor(now * 2) % 4;  // 放慢了画：真实一格 20 ms
      ticks.forEach(function (d, i) { d.setAttribute('r', i === hop ? 6.5 : 4.5); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: 视觉骨干与历史（图 10、图 12） ── */
  function buildSceneBackbone() {
    var s = sceneSvg('左边先是论文图 10 右（四种视觉骨干的成功率曲线），再换成图 12 右（几种带历史的策略头）；右边依次出现：学生网络的结构；' +
      '图 10 最后的成功率横条；图 12 最后的成功率横条；论文和放出来的代码对比；我们的推测');
    s.appendChild(svgText(24, 26, '视觉骨干与历史（图 10、图 12）', 'demo-x-ink2', 13.5));
    var f10 = paperPart(s, 'fig10', 0.555, 0, 1, 1, 24, 50, 380, '论文图 10 右：四种视觉骨干的成功率');
    var f12 = paperPart(s, 'fig12', 0.555, 0, 1, 1, 24, 50, 380, '论文图 12 右：几种策略头的成功率');
    var R = 424, W = 352;
    /* 第 1 段：结构 */
    var p1 = group(s);
    label(p1, R, 64, '论文：DINOv3 抽特征', 'demo-x-ink', 14);
    var chainB = [['RGB 108 × 192', C_STU], ['DINOv3', C_STU], ['128 维 ⊕ 本体 113', C_ACCENT], ['策略头（可带历史）', C_GOOD], ['11 维命令增量', C_TEA]];
    chainB.forEach(function (c, j) { chip(p1, R + 40, 78 + j * 42, 260, c[0], c[1], { size: 12, h: 28 }); });
    var flB = [0, 1, 2, 3].map(function () { return flowSeg(p1, C_STU, 2, 3, 20, true); });
    /* 第 2 段：图 10 */
    var p2 = group(s);
    label(p2, R, 64, '图 10：骨干强，学得快', 'demo-x-ink', 14);
    var b10 = FIG10.map(function (r, i) { return barRowAt(p2, R, 86 + i * 36, 110, r[0], i ? C_STU : C_MUTED, 20, 11); });
    readHint(p2, R, 252, '最后的成功率（读图），越长越好', 10, W);
    label(p2, R, 276, 'DINOv3 前 2.5 万次涨得最快', 'demo-x-ink2', 11);
    /* 第 3 段：图 12 */
    var p3 = group(s);
    label(p3, R, 64, '图 12：带历史的头更好', 'demo-x-ink', 14);
    var b12 = FIG12.map(function (r, i) { return barRowAt(p3, R, 84 + i * 32, 110, r[0], r[0] === '不看历史' ? C_MUTED : C_GOOD, 18, 11); });
    readHint(p3, R, 262, '最后的成功率（读图），越长越好', 10, W);
    label(p3, R, 286, 'LSTM 看 8 步那条略低于不看历史', 'demo-x-mut', 10.5);
    /* 第 4 段：论文 vs 代码 —— 两条小网络并排，代码里不同的那几块标红 */
    var p4 = group(s);
    label(p4, R, 64, '放出来的代码不一样', 'demo-x-ink', 14);
    var CW = 160, colX = [R, R + W - CW];
    label(p4, colX[0] + CW / 2, 94, '论文', 'demo-x-ink', 12.5, 'middle');
    label(p4, colX[1] + CW / 2, 94, '代码（学生检查点）', 'demo-x-ink', 12.5, 'middle');
    var NET = [[['RGB 图', C_STU], ['DINOv3', C_STU], ['带历史的策略头', C_GOOD]], [['RGB 图', C_STU], ['ResNet-18（可训练）', C_BAD], ['单帧策略头', C_BAD]]];
    NET.forEach(function (col, c) { col.forEach(function (n, j) { chip(p4, colX[c], 106 + j * 52, CW, n[0], n[1], { size: 12, h: 30 }); }); });
    chip(p4, colX[1], 264, CW, '辅助头：预测物体位置', C_MUTED, { size: 11.5, h: 28, dash: '4 3' });
    label(p4, colX[1] + CW / 2, 310, '系数 0：其实没在用', 'demo-x-mut', 11, 'middle');
    var fl4 = [0, 1, 2, 3].map(function () { return flowSeg(p4, C_STU, 2, 3, 20, true); });
    /* 第 5 段：推测 —— 学生的图按 16 像素切块：宽 12 块正好，高 6.75 块切不整 */
    var p5 = group(s);
    label(p5, R, 64, '为什么不一样：DINOv3 按 16 像素切块', 'demo-x-ink', 14);
    var PW = 288, egoP = egoView(p5, 'egoA', R + 32, 80, PW), PS = PW / 12;
    var vLines = [], hLines = [];
    for (var q = 1; q < 12; q++) vLines.push(hline(p5, R + 32 + q * PS, 80, R + 32 + q * PS, 80 + egoP.h, '#ffffff', 1));
    for (q = 1; q <= 6; q++) hLines.push(hline(p5, R + 32, 80 + q * PS, R + 32 + PW, 80 + q * PS, '#ffffff', 1));
    var rest = rectBox(p5, R + 32, 80 + 6 * PS, PW, egoP.h - 6 * PS, C_BAD, C_BAD); rest.style.fillOpacity = 0.35; rest.setAttribute('rx', 0);
    var wTxt = rich(p5, R + 32, 80 + egoP.h + 24, '宽：192 ÷ 16 = **12** 块，正好 ✓', 12);
    var hTxt = rich(p5, R + 32, 80 + egoP.h + 46, '高：108 ÷ 16 = **6.75** 块，切不整，代码会报错 ✗', 12);
    label(p5, R, 80 + egoP.h + 80, '我们的推测：论文的最终版本', 'demo-x-ink2', 11.5);
    label(p5, R, 80 + egoP.h + 102, '和放出来的检查点不是同一个', 'demo-x-ink2', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(f10.g, t < 7.0 ? 1 : 1 - seg(t, 7.0, 7.3));
      setOpacity(f12.g, seg(t, 7.3, 7.7));
      flB.forEach(function (f, j) { f.at(now, [R + 170, 78 + j * 42 + 30], [R + 170, 78 + (j + 1) * 42 - 2], true); });
      fl4.forEach(function (f, j) { var c = j >> 1, k = j & 1; f.at(now, [colX[c] + CW / 2, 106 + k * 52 + 32], [colX[c] + CW / 2, 106 + (k + 1) * 52 - 2], true); });
      var u5 = since(t, clock, 13.4);
      egoP.put(loopFrame(now));
      vLines.forEach(function (l, q) { l.style.opacity = 0.75 * seg(u5, 0.4 + q * 0.12, 0.5 + q * 0.12); });
      hLines.forEach(function (l, q) { l.style.opacity = 0.75 * seg(u5, 2.0 + q * 0.2, 2.1 + q * 0.2); });
      setOpacity(wTxt, seg(u5, 1.6, 1.9)); setOpacity(rest, seg(u5, 3.3, 3.6)); setOpacity(hTxt, seg(u5, 3.3, 3.6));
      b10.forEach(function (b, i) { var u = K.ease(seg(since(t, clock, 3.6), 0.2 + i * 0.3, 0.8 + i * 0.3)); b.set(FIG10[i][1] * 220 * u, f2(FIG10[i][1] * u)); });
      b12.forEach(function (b, i) { var u = K.ease(seg(since(t, clock, 7.0), 0.2 + i * 0.25, 0.8 + i * 0.25)); b.set(FIG12[i][1] * 220 * u, f2(FIG12[i][1] * u)); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 学生相机画面上的增强：照 legged_robot_base.py 的顺序与概率随机抽了 12 次（只留至少一项生效的），图在 aug.webp */
  var AUG_DRAWS = [[['模糊', 1]], [['模糊', 1]], [['亮度', 0.9], ['色相', -0.087], ['模糊', 1]], [['亮度', 1.45], ['对比度', 1.0]], [['噪声', 0.135]],
    [['噪声', 0.132]], [['亮度', 1.87], ['饱和度', 1.94], ['模糊', 1]], [['亮度', 1.88], ['色相', 0.04], ['噪声', 0.061]], [['色相', 0.043], ['模糊', 1]],
    [['色相', 0.038], ['噪声', 0.106]], [['色相', 0.06], ['模糊', 1]], [['亮度', 1.87], ['饱和度', 0.94], ['色相', 0.071]]];
  /* 外参抖动：按代码的范围抽的 9 组 [dx, dy, dz（m）, 横滚, 俯仰, 偏航（rad）]，图在 ext.webp 的第 3–11 格（第 1、2 格是对齐前 / 后） */
  var EXT_DRAWS = [[-0.0035, -0.0349, 0.003, -0.0428, 0.0072, -0.0134], [-0.0088, 0.0007, -0.0093, -0.0066, -0.086, -0.0409],
    [-0.0015, 0.0327, -0.0075, -0.0277, 0.0255, 0.0448], [0.0015, -0.0103, 0.0095, -0.0453, 0.0717, -0.021], [-0.0071, -0.0382, -0.0038, 0.0316, -0.0639, 0.0082],
    [0.0028, -0.0128, 0.001, -0.0437, -0.0881, -0.0294], [0.0036, -0.0072, -0.0037, 0.0086, -0.0094, -0.02], [0.0059, 0.0199, -0.0051, 0.0074, 0.005, 0.0375],
    [0.0046, -0.0212, 0.0096, -0.0382, -0.0164, 0.0257]];
  /* 材质与光照的 8 种示意（dr.webp 每帧 8 格）：地板纹理 */
  var DR_NAMES = ['木地板', '地毯', '瓷砖', '石材', '草地', '金属', '塑料', 'Isaac 默认地面'];

  /* ── scene 10: DAgger 与行为克隆各一半（图 11） ── */
  function buildSceneDAgger() {
    var s = sceneSvg('左边是一排排训练环境：左半边由教师开（行为克隆），轨迹干净；右半边由学生自己开（DAgger），轨迹会偏，橙色小箭头是教师在这个状态上给的动作标签；' +
      '右边依次出现：蒸馏损失的公式；两种数据各自的好处；图 11 五种比例的成功率柱；损失低不等于部署好；代码里怎么分');
    s.appendChild(svgText(24, 26, 'DAgger 与行为克隆各一半（图 11）', 'demo-x-ink2', 13.5));
    label(s, 24 + 95, 52, '教师开（BC）', 'demo-x-ink', 12, 'middle');
    label(s, 24 + 285, 52, '学生开（DAgger）', 'demo-x-ink', 12, 'middle');
    hline(s, 214, 60, 214, 300, C_BORDER, 1.2, '4 4');
    var cells = [];
    for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
      var x = 24 + c * 48 + (c >= 2 ? 92 : 0) + (c >= 2 ? 2 : 0), y = 64 + r * 58, teach = c < 2;
      var X0 = 24 + (c % 2) * 92 + (teach ? 0 : 190), Y0 = 64 + r * 58;
      var g = group(s);
      rectBox(g, X0 + 2, Y0, 86, 52, teach ? C_TEA : C_STU, C_SURFACE);
      var goal = dotAt(g, X0 + 76, Y0 + 26, 4, C_GOOD);
      var trace = pathLine(g, [], teach ? C_TEA : C_STU, 1.8);
      var bot = dotAt(g, X0 + 12, Y0 + 26, 4.5, teach ? C_TEA : C_STU);
      var lab = arrow(g, C_TEA, 1.8);
      cells.push({ X0: X0, Y0: Y0, teach: teach, trace: trace, bot: bot, lab: lab, seed: r * 4 + c });
      void x; void y; void goal;
    }
    label(s, 24, 318, 'α = 0.5：一半环境由教师开；标签都来自教师', 'demo-x-ink2', 11);
    var R = 424, W = 352;
    /* 第 1 段：公式 */
    var p1 = group(s);
    label(p1, R, 64, '同一个均方误差，只差数据从谁来', 'demo-x-ink', 14);
    math(p1, R, 104, '\\mathcal L=\\mathbb E_{o\\sim\\rho}\\,\\big\\lVert\\pi_{T}(o^{T})-\\pi_{S}(o^{S})\\big\\rVert^2', 15);
    rich(p1, R, 140, '数据分布 $\\rho=\\alpha\\,\\rho_{T}+(1-\\alpha)\\,\\rho_{S}$', 12.5);
    /* α 在 1、0.5、0 之间换：十个环境格子里有几个由教师开 */
    var aCells = [];
    for (var q = 0; q < 10; q++) aCells.push(rectBox(p1, R + q * 35, 168, 29, 29, C_BORDER, C_SURFACE));
    var aTxt = rich(p1, R, 226, '', 12.5);
    legendRow(p1, R, 256, [['教师开（BC）', C_TEA, 80], ['学生开（DAgger）', C_STU, 100]], 11.5);
    /* 第 2 段：各自的好处 */
    var p2 = group(s);
    label(p2, R, 64, '两种数据各有好处', 'demo-x-ink', 14);
    chip(p2, R, 82, W, '教师开：数据**干净**、接近最优，学得快', C_TEA, { size: 12, left: true, h: 36 });
    chip(p2, R, 128, W, '学生开：走到**自己犯错**之后的状态', C_STU, { size: 12, left: true, h: 36 });
    label(p2, R + 12, 190, '→ 在那里学会纠错，部署时不会一错再错', 'demo-x-ink2', 11.5);
    label(p2, R, 230, '混合：BC 的快 + DAgger 的覆盖', 'demo-x-ink', 12.5);
    /* 第 3 段：图 11 柱 */
    var p3 = group(s);
    label(p3, R, 64, '图 11：成功率', 'demo-x-ink', 14);
    var BB = 246, bars11 = FIG11.map(function (f, i) {
      var b = vbar(p3, R + 20 + i * 66, 40, f[0] === 0.5 ? C_GOOD : C_STU);
      label(p3, R + 40 + i * 66, BB + 16, 'α ' + f[0], 'demo-x-ink2', 10.5, 'middle');
      return { b: b, v: label(p3, R + 40 + i * 66, BB - 6, '', 'demo-x-ink', 11, 'middle'), f: f[1] };
    });
    hline(p3, R + 10, BB, R + W - 10, BB, C_BORDER, 1.2);
    readHint(p3, R, 290, '横轴：教师开的比例 α；纵轴：成功率，越高越好', 10, W);
    label(p3, R, 312, '论文没写这组成功率在哪测的', 'demo-x-mut', 9.5);
    /* 第 4 段：损失低 ≠ 部署好 —— 左列只画训练损失的高低顺序，右列是部署成功率 */
    var p4 = group(s);
    label(p4, R, 64, '损失低，不等于部署好', 'demo-x-ink', 14);
    label(p4, R + 96, 92, '训练损失（只看高低）', 'demo-x-ink2', 11.5);
    label(p4, R + 232, 92, '成功率', 'demo-x-ink2', 11.5);
    var LR = [['α = 1', 1, '最低', 0.0, C_BAD], ['α = 0.5', 2, '居中', 1.0, C_GOOD], ['α = 0', 3, '最高', 0.8, C_STU]].map(function (k, j) {
      var y = 106 + j * 44;
      label(p4, R + 86, y + 17, k[0], 'demo-x-ink', 12, 'end');
      var lb = hbar(p4, R + 96, y + 2, 20, C_MUTED), sb = hbar(p4, R + 232, y + 2, 20, k[4]);
      return { lb: lb, sb: sb, lv: label(p4, R + 96, y + 17, '', 'demo-x-ink2', 11), sv: label(p4, R + 232, y + 17, '', 'demo-x-ink', 11.5), k: k };
    });
    label(p4, R, 256, '纯 BC 的策略脆：自己犯的错纠正不回来', 'demo-x-ink2', 11.5);
    readHint(p4, R, 280, '图 11 左：损失 α = 1 最低、α = 0 最高；右：成功率，越长越好', 10, W);
    /* 第 5 段：代码 —— 一个进程 8 个环境：前一半执行教师的动作，后一半执行学生的；标签都是教师的确定性动作；每次只走 1 步就更新 */
    var p5 = group(s);
    label(p5, R, 64, '代码里：一个进程的环境', 'demo-x-ink', 14);
    var envs = [];
    for (q = 0; q < 8; q++) {
      var ex = R + 4 + q * 43;
      rectBox(p5, ex, 92, 36, 36, q < 4 ? C_TEA : C_STU, C_SURFACE);
      envs.push({ d: dotAt(p5, ex + 18, 110, 5, q < 4 ? C_TEA : C_STU), tag: dotAt(p5, ex + 18, 150, 4, C_TEA), x: ex + 18 });
    }
    label(p5, R + 84, 84, '前一半：执行教师的动作', 'demo-x-ink2', 11, 'middle');
    label(p5, R + 256, 84, '后一半：执行学生的动作', 'demo-x-ink2', 11, 'middle');
    var batch = rectBox(p5, R + 66, 178, 220, 32, C_TEA, C_SURFACE);
    label(p5, R + 176, 199, '8 条样本，标签都来自教师', 'demo-x-ink', 12, 'middle');
    var stepTxt = label(p5, R + 176, 238, '', 'demo-x-ink', 13, 'middle');
    label(p5, R + 176, 262, '每个环境只走 1 步就更新，不攒数据', 'demo-x-ink2', 11.5, 'middle');
    label(p5, R + 176, 286, '学习率 2e-4 不变', 'demo-x-mut', 11, 'middle');
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var ai = Math.floor(Math.max(0, since(t, clock, 0.4)) / 2.2) % 3, aV = [1, 0.5, 0][ai];
      aCells.forEach(function (c, q) { c.style.fill = q < aV * 10 ? C_TEA : C_STU; c.style.fillOpacity = 0.75; });
      aTxt.setText(['$\\alpha=1$：十个全由教师开，纯行为克隆', '$\\alpha=0.5$：一半教师开、一半学生开', '$\\alpha=0$：全由学生开，纯 DAgger'][ai]);
      LR.forEach(function (r, j) { var u = K.ease(seg(since(t, clock, 10.4), 0.3 + j * 0.3, 0.9 + j * 0.3)), lw = r.k[1] * 34 * u, sw = r.k[3] * 100 * u;
        setW(r.lb, lw); setW(r.sb, sw); r.lv.setAttribute('x', (R + 100 + lw).toFixed(1)); r.lv.textContent = u > 0.9 ? r.k[2] : '';
        r.sv.setAttribute('x', (R + 236 + sw).toFixed(1)); r.sv.textContent = u > 0.9 ? f1(r.k[3]) : ''; });
      var sp = Math.max(0, since(t, clock, 13.4)), ph5 = sp % 1.2, k5 = Math.floor(sp / 1.2);
      envs.forEach(function (e, q) { moveDot(e.d, [e.x + 8 * Math.sin((k5 + q) * 1.7), 110 + 6 * Math.cos((k5 + q) * 2.3)]);
        moveDot(e.tag, [e.x + (R + 176 - e.x) * seg(ph5, 0.2, 0.8), 150 + 24 * seg(ph5, 0.2, 0.8)]); e.tag.style.opacity = ph5 < 0.85 ? 1 : 0; });
      batch.style.strokeWidth = ph5 > 0.8 ? 3 : 1.3;
      stepTxt.textContent = '第 ' + (k5 + 1) + ' 次更新';
      cells.forEach(function (c) {
        var ph = ((now * 0.4 + rnd(c.seed, 9)) % 1), pts = [], dev = c.teach ? 0 : 1, last;
        for (var q = 0; q <= 20; q++) {
          var u = q / 20; if (u > ph) break;
          var wob = dev * (10 * Math.sin(u * 6 + c.seed) * Math.sin(u * Math.PI));
          last = [c.X0 + 12 + u * 64, c.Y0 + 26 + wob];
          pts.push(last);
        }
        setPath(c.trace, pts);
        if (last) moveDot(c.bot, last);
        var off = c.teach ? 0 : 10 * Math.sin(ph * 6 + c.seed) * Math.sin(ph * Math.PI);
        if (last && !c.teach && Math.abs(off) > 2) { c.lab.set(last[0], last[1], last[0] + 10, last[1] - off * 0.8, 5); c.lab.g.style.opacity = 1; }
        else c.lab.g.style.opacity = 0;
      });
      bars11.forEach(function (b, i) { var u = K.ease(seg(since(t, clock, 7.0), 0.2 + i * 0.3, 0.8 + i * 0.3)); b.b.set(BB, b.f * 140 * u); b.v.textContent = u > 0.95 ? f2(b.f) : ''; b.v.setAttribute('y', (BB - b.f * 140 * u - 6).toFixed(1)); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 11: 教师的算力（图 14） ── */
  var G14 = [['16', 'g16', C_GOOD], ['8', 'g8', C_ACCENT], ['4', 'g4', C_PURPLE], ['2', 'g2', C_WARN], ['1', 'g1', C_BAD]];
  function buildSceneTeacherScale() {
    var s = sceneSvg('左边按论文图 14 右重画的教师成功率曲线（读图近似），横轴是墙钟时间 0–10 小时，五条线是 1、2、4、8、16 张 GPU，随时间逐步画出；' +
      '右边依次出现：16 张 GPU 的方块亮起；到 0.8 成功率要多久的横条；到 0.2 时 4 张与 2 张的对比；10 小时时的成功率；一次 PPO 迭代合多少仿真经验');
    s.appendChild(svgText(24, 26, '教师的算力：1 → 16 张 GPU（图 14）', 'demo-x-ink2', 13.5));
    var pb = plotBox(s, 54, 50, 350, 226, 0, 10, 0, 1);
    var curves = G14.map(function (g) { return pb.curve(FIG14[g[1]], 0.1, g[2], 2.2); });
    [0, 0.5, 1].forEach(function (v) { label(s, 48, pb.py(v) + 4, String(v), 'demo-x-mut', 9.5, 'end'); });
    [0, 2, 4, 6, 8, 10].forEach(function (v) { label(s, pb.px(v), 292, String(v), 'demo-x-mut', 9.5, 'middle'); });
    label(s, 404, 313, '小时（墙钟）', 'demo-x-mut', 9.5, 'end');
    legendRow(s, 54, 326, G14.map(function (g) { return [g[0] + ' 张', g[2], 26]; }), 10);
    var mark = group(s), m08 = hline(mark, 54, pb.py(0.8), 404, pb.py(0.8), C_BORDER, 1, '4 3');
    void m08;
    var m02 = group(s);
    hline(m02, 54, pb.py(0.2), 404, pb.py(0.2), C_BORDER, 1, '4 3');
    var x4 = hline(m02, pb.px(1.0), pb.py(0.2), pb.px(1.0), pb.py(0), C_PURPLE, 1.5, '3 3'), x2 = hline(m02, pb.px(3.3), pb.py(0.2), pb.px(3.3), pb.py(0), C_WARN, 1.5, '3 3');
    void x4; void x2;
    var R = 424, W = 352;
    /* 第 1 段：GPU */
    var p1 = group(s);
    label(p1, R, 64, '教师：从 1 张加到 16 张 GPU', 'demo-x-ink', 14);
    var sq = [];
    for (var i = 0; i < 16; i++) { var q = paint(svgEl('rect', { x: R + (i % 8) * 40, y: 82 + Math.floor(i / 8) * 40, width: 32, height: 32, rx: 4 }), C_TEA); p1.appendChild(q); sq.push(q); }
    var envT = label(p1, R, 196, '', 'demo-x-ink', 13);
    label(p1, R, 220, '每张 2048 个环境，不渲染', 'demo-x-ink2', 11.5);
    readHint(p1, R, 252, '左图横轴：墙钟小时；纵轴：成功率，越高越好', 10, W);
    /* 第 2 段：到 0.8 */
    var p2 = group(s);
    label(p2, R, 64, '更快：到 0.8 成功率要多久', 'demo-x-ink', 14);
    var b08 = [['16 张', 2.1, C_GOOD], ['8 张', 2.4, C_ACCENT], ['4 张', 4.6, C_PURPLE], ['2 张', null, C_WARN], ['1 张', null, C_BAD]].map(function (r, j) {
      return { b: barRowAt(p2, R, 84 + j * 30, 50, r[0], r[2], 16, 11), v: r[1] };
    });
    label(p2, R, 252, '读图近似；2 张、1 张 10 小时内到不了', 'demo-x-mut', 10);
    /* 第 3 段：前期快过线性 */
    var p3 = group(s);
    label(p3, R, 64, '前期快过线性', 'demo-x-ink', 14);
    label(p3, R, 92, '成功率先到 0.2：', 'demo-x-ink2', 12);
    var b02 = [['4 张', 1.0, C_PURPLE], ['2 张', 3.3, C_WARN]].map(function (r, j) { return { b: barRowAt(p3, R, 104 + j * 34, 50, r[0], r[2], 20, 11.5), v: r[1] }; });
    label(p3, R, 200, '算力翻倍，用时不到一半', 'demo-x-ink', 12.5);
    label(p3, R, 224, '论文：环境多，单位时间覆盖的状态更广', 'demo-x-ink2', 11);
    /* 第 4 段：上限 */
    var p4 = group(s);
    label(p4, R, 64, '上限更高：10 小时时', 'demo-x-ink', 14);
    var fin = [['16 张', 0.95, C_GOOD], ['8 张', 0.93, C_ACCENT], ['4 张', 0.77, C_PURPLE], ['2 张', 0.30, C_WARN], ['1 张', 0.30, C_BAD]].map(function (r, j) {
      return { b: barRowAt(p4, R, 84 + j * 30, 50, r[0], r[2], 16, 11), v: r[1] };
    });
    label(p4, R, 252, '1–2 张：一直到不了高成功率', 'demo-x-ink2', 11.5);
    label(p4, R, 274, '论文：大规模仿真常常是必需的', 'demo-x-ink', 12);
    /* 第 5 段：一次迭代 */
    var p5 = group(s);
    label(p5, R, 64, '一次 PPO 迭代有多少经验', 'demo-x-ink', 14);
    rich(p5, R, 100, '32,768 个环境 × 24 步', 14);
    var stepsT = label(p5, R, 134, '', 'demo-x-ink', 20);
    label(p5, R, 162, '每步 0.02 s：合约 4.4 小时的仿真经验', 'demo-x-ink2', 12);
    label(p5, R, 190, '图 9 的 3 万次迭代 ≈ 15 年', 'demo-x-ink2', 12);
    label(p5, R, 222, '真机上一轮约 20 s', 'demo-x-mut', 11);
    function draw(t, clock) {
      var hrs = seg(t, 0.4, 7.0) * 10;
      curves.forEach(function (c) { c.upto(hrs); });
      setOpacity(mark, win(t, 3.6, 7.0));
      setOpacity(m02, win(t, 7.0, 10.4));
      sq.forEach(function (q, i) { q.style.opacity = 0.15 + 0.85 * seg(since(t, clock, 0.4), 0.2 + i * 0.08, 0.35 + i * 0.08); });
      envT.textContent = countTo(COMPUTE.tEnv, seg(since(t, clock, 0.4), 0.2, 1.6)) + ' 个环境同时跑';
      b08.forEach(function (r, j) { var u = K.ease(seg(since(t, clock, 3.6), 0.2 + j * 0.25, 0.8 + j * 0.25)); r.b.set(r.v ? r.v / 10 * 230 * u : 0, r.v ? f1(r.v) + ' h' : '到不了'); });
      b02.forEach(function (r, j) { var u = K.ease(seg(since(t, clock, 7.0), 0.2 + j * 0.4, 0.9 + j * 0.4)); r.b.set(r.v / 4 * 230 * u, f1(r.v * u) + ' h'); });
      fin.forEach(function (r, j) { var u = K.ease(seg(since(t, clock, 10.4), 0.2 + j * 0.2, 0.8 + j * 0.2)); r.b.set(r.v * 230 * u, f2(r.v * u)); });
      stepsT.textContent = '= ' + countTo(COMPUTE.tEnv * COMPUTE.tSteps, seg(since(t, clock, 13.4), 0.2, 1.4)) + ' 步';
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 学生的算力：平铺渲染（图 15） ── */
  var G15 = [['64', 'g64', C_GOOD], ['16', 'g16', C_ACCENT], ['4', 'g4', C_PURPLE], ['2', 'g2', C_WARN], ['1', 'g1', C_BAD]];
  function buildSceneStudentScale() {
    var s = sceneSvg('左边先是平铺渲染的示意：几十个学生相机的画面拼成一张大图，每格是示范里不同时刻、不同材质的画面；之后换成按论文图 15 左重画的蒸馏损失曲线（读图近似，纵轴对数），' +
      '1 到 64 张 GPU 的线逐步画出；右边依次出现：渲染比纯物理慢；平铺渲染；8 台 × 8 卡；损失降到 0.2 要多久；更稳更平滑');
    s.appendChild(svgText(24, 26, '学生的算力：平铺渲染，1 → 64 张 GPU（图 15）', 'demo-x-ink2', 13.5));
    var tiles = group(s), tl = [];
    for (var i = 0; i < 48; i++) {
      var c = i % 8, r = Math.floor(i / 8), v = egoView(tiles, i % 3 === 2 ? 'dr' : 'egoA', 24 + c * 47.5, 50 + r * 27, 45, { frame: false });
      tl.push({ v: v, kind: i % 3 === 2 ? 'dr' : 'egoA', off: Math.floor(rnd(i, 4) * 199), dr: Math.floor(rnd(i, 6) * 16) });
    }
    label(tiles, 24, 230, '平铺渲染：每个环境一台相机，拼成一张大图一次渲', 'demo-x-ink2', 11);
    label(tiles, 24, 250, '示意：我们重渲的学生画面', 'demo-x-mut', 9.5);
    var plot = group(s);
    var pb = plotBox(plot, 54, 50, 350, 226, 0, 50, 0.08, 0.5, true);
    var curves = G15.map(function (g) { return pb.curve(FIG15[g[1]], 0.5, g[2], 2.2); });
    [0.1, 0.2, 0.4].forEach(function (v) { label(plot, 48, pb.py(v) + 4, String(v), 'demo-x-mut', 9.5, 'end'); });
    [0, 10, 20, 30, 40, 50].forEach(function (v) { label(plot, pb.px(v), 292, String(v), 'demo-x-mut', 9.5, 'middle'); });
    label(plot, 404, 313, '小时（墙钟）', 'demo-x-mut', 9.5, 'end');
    legendRow(plot, 54, 326, G15.map(function (g) { return [g[0] + ' 张', g[2], 26]; }), 10);
    hline(plot, pb.px(0), pb.py(0.2), pb.px(50), pb.py(0.2), C_BORDER, 1, '4 3');
    var R = 424, W = 352;
    /* 第 1 段：渲染慢 */
    var p1 = group(s);
    label(p1, R, 64, '视觉仿真贵得多', 'demo-x-ink', 14);
    var thr = [['只算物理', 1, C_TEA], ['还要渲染', 0.1, C_STU]].map(function (r, j) { return { b: barRowAt(p1, R, 92 + j * 40, 80, r[0], r[2], 24, 12), v: r[1] }; });
    label(p1, R, 196, '吞吐量通常慢至少一个数量级', 'demo-x-ink2', 12);
    label(p1, R + W, 218, '示意', 'demo-x-mut', 9.5, 'end');
    /* 第 2 段：平铺渲染 —— 一格一台相机，格子一格格拼进同一张大图，拼满后整张一次渲完（示意画 128 格） */
    var p2 = group(s);
    label(p2, R, 64, '平铺渲染（Isaac Lab）', 'demo-x-ink', 14);
    var bigImg = rectBox(p2, R - 2, 82, W + 4, 132, C_STU, C_SURFACE);
    var tileC = [];
    for (var q = 0; q < 128; q++) {
      var tc = paint(svgEl('rect', { x: R + 1 + (q % 16) * 22, y: 85 + Math.floor(q / 16) * 16, width: 19, height: 13, rx: 2 }), C_STU);
      p2.appendChild(tc); tileC.push(tc);
    }
    var tileTxt = label(p2, R, 238, '', 'demo-x-ink', 12.5);
    label(p2, R, 262, '每张卡 1024 个环境；示意只画 128 格', 'demo-x-ink2', 11.5);
    label(p2, R, 286, '学生：65,536 个环境，每次每个走 1 步', 'demo-x-ink2', 11.5);
    /* 第 3 段：8 台 × 8 卡 */
    var p3 = group(s);
    label(p3, R, 64, 'TRL + Accelerate：8 台 × 8 卡', 'demo-x-ink', 14);
    var nodes = [];
    for (var n = 0; n < 8; n++) {
      var g = group(p3), nx = R + (n % 4) * 88, ny = 82 + Math.floor(n / 4) * 62;
      rectBox(g, nx, ny, 80, 54, C_STU, C_SURFACE);
      for (var k = 0; k < 8; k++) g.appendChild(paint(svgEl('rect', { x: nx + 6 + (k % 4) * 18, y: ny + 8 + Math.floor(k / 4) * 20, width: 14, height: 14, rx: 2 }), C_STU));
      nodes.push(g);
    }
    label(p3, R, 226, '保留单卡训练的简单，接近线性地扩到集群', 'demo-x-ink2', 11.5);
    /* 第 4 段：损失到 0.2 */
    var p4 = group(s);
    label(p4, R, 64, '蒸馏损失降到 0.2 要多久', 'demo-x-ink', 14);
    var to02 = [['64 张', 8.5, C_GOOD], ['16 张', 11.5, C_ACCENT], ['4 张', 17, C_PURPLE], ['2 张', 25.5, C_WARN], ['1 张', 35, C_BAD]].map(function (r, j) {
      return { b: barRowAt(p4, R, 84 + j * 30, 50, r[0], r[2], 16, 11), v: r[1] };
    });
    readHint(p4, R, 252, '读图近似；越短越快', 10, W);
    label(p4, R, 276, '64 倍算力，快 4 倍多；1 张的线 35 h 后被图例挡住', 'demo-x-ink2', 11);
    /* 第 5 段：更稳 —— 示意：1 张卡的成功率曲线抖、64 张的平滑，最后都在 0.85–0.88 */
    var p5 = group(s);
    label(p5, R, 64, 'GPU 多：更稳、更平滑', 'demo-x-ink', 14);
    var sb5 = plotBox(p5, R + 30, 80, W - 40, 130, 0, 50, 0.4, 1);
    var noisy = [], smooth = [];
    for (q = 0; q <= 100; q++) {
      var hx = q * 0.5;
      smooth.push(0.885 - 0.42 * Math.exp(-hx / 7) + 0.006 * (rnd(q, 21) - 0.5));
      noisy.push(0.855 - 0.42 * Math.exp(-hx / 12) + 0.09 * (rnd(q, 22) - 0.5) * (0.5 + 0.5 * Math.exp(-hx / 20)));
    }
    var cN = sb5.curve(noisy, 0.5, C_BAD, 1.6), cS = sb5.curve(smooth, 0.5, C_GOOD, 2.4);
    label(p5, R + 22, sb5.py(1) + 10, '1', 'demo-x-mut', 11, 'end'); label(p5, R + 22, sb5.py(0.4) + 4, '0.4', 'demo-x-mut', 11, 'end');
    legendRow(p5, R, 234, [['64 张：平滑', C_GOOD, 70], ['1 张：抖得多', C_BAD, 80]], 11.5);
    readHint(p5, R, 258, '纵轴：成功率；示意，按论文的文字画，不是读图', 10, W);
    label(p5, R, 290, '论文：大算力不是方便，是实际的需要', 'demo-x-ink', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock), fr = Math.floor(now * DEMO.fps);
      tl.forEach(function (o) { o.v.put(o.kind === 'dr' ? (o.dr + Math.floor(now / 2)) % 16 : (o.off + fr) % DEMO.n); });
      setOpacity(tiles, t < 7.0 ? 1 : 1 - seg(t, 7.0, 7.3));
      setOpacity(plot, seg(t, 7.3, 7.7));
      var hrs = seg(t, 7.4, 12.8) * 50;
      var u2 = Math.max(0, since(t, clock, 3.6)) % 3, nT = Math.floor(seg(u2, 0.1, 1.9) * 128);
      tileC.forEach(function (c, q) { c.style.opacity = q < nT ? 0.8 : 0.08; });
      bigImg.setAttribute('stroke-width', u2 > 2.0 && u2 < 2.8 ? 3.5 : 1.3);
      tileTxt.textContent = u2 > 2.0 ? '拼满了：整张大图一次渲完' : '一台相机一格：拼进第 ' + Math.max(1, nT) + ' 格';
      var u5 = seg(since(t, clock, 13.4), 0.2, 2.8) * 50; cN.upto(u5); cS.upto(u5);
      curves.forEach(function (c) { c.upto(hrs); });
      thr.forEach(function (r, j) { var u = K.ease(seg(since(t, clock, 0.4), 0.2 + j * 0.4, 0.9 + j * 0.4)); r.b.set(r.v * 240 * u, ''); });
      nodes.forEach(function (g, j) { setOpacity(g, 0.2 + 0.8 * seg(since(t, clock, 7.0), 0.2 + j * 0.15, 0.4 + j * 0.15)); });
      to02.forEach(function (r, j) { var u = K.ease(seg(since(t, clock, 10.4), 0.2 + j * 0.25, 0.8 + j * 0.25)); r.b.set(r.v / 37 * 230 * u, (j === 4 && u > 0.99 ? '> ' : '') + f1(r.v * u) + ' h'); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 13: 手指的系统辨识（图 5） ── */
  function toyFinger(tau, n, dt) {
    var y = 0, out = [];
    for (var i = 0; i < n; i++) {
      var tt = i * dt, target = Math.floor(tt / 1.0) % 2 ? 0 : 1;
      y += (target - y) * Math.min(1, dt / tau);
      out.push([tt, target, y]);
    }
    return out;
  }
  function buildSceneSysID() {
    var s = sceneSvg('左上是项目页的视频：辨识前（左）和辨识后（右），仿真里的手指叠在真机画面上，下面是关节角曲线；左下是论文图 5；' +
      '右边依次出现：高减速比的齿轮；真机做抓—放、仿真回放同一串动作；三个参数的旋钮往真机拧、仿真曲线（蓝）贴向真机（绿）的示意；图 5 的结论；论文给的增益');
    s.appendChild(svgText(24, 26, '手指的系统辨识（图 5）', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'sysid', 24, 48, 380, 179, '项目页视频：辨识前（左）、辨识后（右），仿真叠在真机上');
    var fig = paperPart(s, 'fig5', 0, 0, 1, 1, 24, 252, 380, '');
    label(s, 24, 252 + fig.h + 16, '论文图 5：红虚线目标、绿线真机、蓝线仿真', 'demo-x-mut', 9.5);
    var R = 424, W = 352;
    /* 第 1 段：齿轮 */
    var p1 = group(s);
    label(p1, R, 64, 'G1 的三指手：减速比很大', 'demo-x-ink', 14);
    function gear(g, cx, cy, r, teeth, color) {
      var pts = [];
      for (var k = 0; k < teeth * 2; k++) { var a = k / (teeth * 2) * Math.PI * 2, rr = k % 2 ? r : r + 6; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
      var p = paint(svgEl('path', { d: fmtPath(pts) + ' Z', 'stroke-width': 2 }), C_SURFACE2, color);
      g.appendChild(p);
      return p;
    }
    var gA = group(p1), gB = group(p1);
    gear(gA, 0, 0, 16, 8, C_WARN); gear(gB, 0, 0, 52, 26, C_WARN);
    label(p1, R + 50, 250, '电机', 'demo-x-ink2', 11, 'middle');
    label(p1, R + 160, 250, '手指', 'demo-x-ink2', 11, 'middle');
    label(p1, R + 236, 120, '腿：低减速比', 'demo-x-ink2', 11.5);
    label(p1, R + 236, 140, '仿真建模得准', 'demo-x-mut', 10.5);
    label(p1, R + 236, 180, '手：高减速比', 'demo-x-ink', 11.5);
    label(p1, R + 236, 200, '仿真和真机差得多', 'demo-x-mut', 10.5);
    /* 第 2 段：原语回放 */
    var p2 = group(s);
    label(p2, R, 64, '同一串动作，两边各跑一次', 'demo-x-ink', 14);
    chip(p2, R, 82, 160, '真机：抓—放原语', C_REAL, { size: 12, h: 32 });
    chip(p2, R + 192, 82, 160, '仿真：回放同一串', C_SIM, { size: 12, h: 32 });
    var fl2 = flowSeg(p2, C_MUTED, 3, 3, 30, false);
    var sq2 = pathLine(p2, [], C_BAD, 2, '5 4');
    label(p2, R, 252, '目标关节角：张开 ↔ 握住的方波', 'demo-x-ink2', 11.5);
    label(p2, R, 274, '比两边的关节轨迹', 'demo-x-ink2', 11.5);
    /* 第 3 段：三个旋钮 */
    var p3 = group(s);
    label(p3, R, 64, '辨识三个参数（示意）', 'demo-x-ink', 14);
    var knobs = ['转子惯量', '刚度', '阻尼'].map(function (k, j) {
      var y = 92 + j * 30;
      label(p3, R, y + 4, k, 'demo-x-ink2', 11.5);
      hline(p3, R + 70, y, R + 200, y, C_BORDER, 3);
      return dotAt(p3, R + 70, y, 7, C_SIM);
    });
    var tp = plotBox(p3, R, 182, W, 100, 0, 4, -0.1, 1.15);
    var tgt = pathLine(p3, [], C_BAD, 1.6, '4 3'), realL = pathLine(p3, [], C_REAL, 2), simL = pathLine(p3, [], C_SIM, 2.2);
    label(p3, R + W, 298, '示意：按图 5 的形状画，不是辨识出的数', 'demo-x-mut', 9.5, 'end');
    /* 第 4 段：图 5 结论 —— 两张小图：辨识前仿真（蓝）跟得慢、像三角波；辨识后和真机（绿）几乎重合（示意） */
    var p4 = group(s);
    label(p4, R, 64, '图 5：辨识前后', 'demo-x-ink', 14);
    var mini = [['辨识前：像三角波', C_BAD], ['辨识后：几乎重合', C_GOOD]].map(function (k, j) {
      var x = R + j * 184, pb4 = plotBox(p4, x, 84, 168, 110, 0, 4, -0.1, 1.15);
      tone(p4, x + 84, 214, k[0], k[1], 12, 'middle');
      return { pb: pb4, tg: pathLine(p4, [], C_BAD, 1.4, '4 3'), re: pathLine(p4, [], C_REAL, 2), si: pathLine(p4, [], C_SIM, 2.2) };
    });
    legendRow(p4, R, 242, [['目标', C_BAD, 26], ['真机', C_REAL, 26], ['仿真', C_SIM, 26]], 11.5);
    label(p4, R, 270, '项目页视频：辨识后两只手几乎一起动', 'demo-x-ink2', 11.5);
    label(p4, R + W, 294, '示意：按图 5 的形状画', 'demo-x-mut', 11, 'end');
    /* 第 5 段：增益 —— 表 4 的 Kp，按对数刻度画，手指比手臂小两个数量级 */
    var p5 = group(s);
    label(p5, R, 64, '表 4：手指的增益小得多', 'demo-x-ink', 14);
    var LX = R + 96, lgx = function (v) { return LX + 56 * (Math.log10(v) + 1); };
    var gains = [['食指、中指', 0.5, 0.1, C_WARN], ['拇指根部', 2.0, 0.1, C_WARN], ['肘', 40, 2, C_MUTED], ['肩', 100, 5, C_MUTED]].map(function (r, j) {
      var y = 86 + j * 34;
      label(p5, LX - 8, y + 15, r[0], 'demo-x-ink2', 11.5, 'end');
      return { b: hbar(p5, LX, y, 20, r[3]), v: label(p5, LX, y + 15, '', 'demo-x-ink', 11.5), r: r };
    });
    hline(p5, LX, 228, lgx(100) + 10, 228, C_BORDER, 1.2);
    [0.1, 1, 10, 100].forEach(function (v) { hline(p5, lgx(v), 224, lgx(v), 232, C_BORDER, 1.2); label(p5, lgx(v), 248, String(v), 'demo-x-mut', 11, 'middle'); });
    readHint(p5, R, 274, '横轴：比例增益 Kp，对数刻度；Kd 写在数字后面', 10, W);
    label(p5, R, 298, '辨识出来的三个参数，论文没给', 'demo-x-ink2', 11.5);
    var REALS = toyFinger(0.08, 200, 0.02), BEFORE = toyFinger(0.6, 200, 0.02);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      clip.at(K.clipSince(t, 0), true);
      gA.setAttribute('transform', 'translate(' + (R + 50) + ',170) rotate(' + (now * 180).toFixed(1) + ')');
      gB.setAttribute('transform', 'translate(' + (R + 160) + ',170) rotate(' + (-now * 180 * 8 / 26).toFixed(1) + ')');
      fl2.at(now, [R + 162, 98], [R + 190, 98], true);
      var sw = [];
      for (var q = 0; q <= 80; q++) { var x = q / 80 * 4, v = Math.floor(x) % 2 ? 0 : 1; sw.push([R + 20 + x * 80, 220 - v * 90]); }
      setPath(sq2, sw);
      var u3 = K.ease(seg(since(t, clock, 7.0), 0.3, 2.6));
      knobs.forEach(function (k, j) { moveDot(k, [R + 70 + (j === 1 ? 110 : 40) * u3 + 10, 92 + j * 30]); });
      var tau = 0.6 + (0.09 - 0.6) * u3, SIM = toyFinger(tau, 200, 0.02);
      setPath(tgt, REALS.map(function (p) { return [tp.px(p[0]), tp.py(p[1])]; }));
      setPath(realL, REALS.map(function (p) { return [tp.px(p[0]), tp.py(p[2] * 0.95)]; }));
      setPath(simL, SIM.map(function (p) { return [tp.px(p[0]), tp.py(p[2])]; }));
      void BEFORE;
      var AFTER = toyFinger(0.09, 200, 0.02), u4 = seg(since(t, clock, 10.4), 0.2, 2.4) * 4;
      mini.forEach(function (m, j) {
        var S = j ? AFTER : BEFORE, cut = function (arr, f) { return arr.filter(function (p) { return p[0] <= u4; }).map(function (p) { return [m.pb.px(p[0]), m.pb.py(f(p))]; }); };
        setPath(m.tg, cut(REALS, function (p) { return p[1]; }));
        setPath(m.re, cut(REALS, function (p) { return p[2] * 0.95; }));
        setPath(m.si, cut(S, function (p) { return p[2]; }));
      });
      gains.forEach(function (g, j) { var u = K.ease(seg(since(t, clock, 13.4), 0.2 + j * 0.3, 0.8 + j * 0.3)), w = (lgx(g.r[1]) - LX) * u;
        setW(g.b, w); g.v.setAttribute('x', (LX + w + 6).toFixed(1)); g.v.textContent = u > 0.95 ? g.r[1] + ' / ' + g.r[2] : ''; });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 14: 相机：对齐与外参随机化（图 6） ── */
  var EXT_NAMES = ['x', 'y', 'z', '横滚', '俯仰', '偏航'];
  function buildSceneCamera() {
    var s = sceneSvg('左上是论文图 6：真机视场、对齐前、对齐后；下面是我们按代码重渲的学生画面：先在对齐前后之间切换，再每秒换一组随机外参；' +
      '右边依次出现：内参算出的视场；三台相机朝向略有不同的示意；轻量标定；六个外参的随机区间（小点跳到当前那一组的值）；图 13 里外参随机化的作用');
    s.appendChild(svgText(24, 26, '相机：对齐与外参随机化（图 6）', 'demo-x-ink2', 13.5));
    var fig = paperPart(s, 'fig6', 0, 0, 1, 1, 24, 44, 380, '');
    label(s, 24, 44 + fig.h + 18, '论文图 6：真机视场 / 仿真对齐前 / 仿真对齐后', 'demo-x-mut', 9.5);
    var ego = egoView(s, 'ext', 24, 148, 300);
    var egoLab = label(s, 24, 148 + ego.h + 18, '', 'demo-x-ink2', 11);
    var R = 424, W = 352;
    /* 第 1 段：内参 */
    var p1 = group(s);
    label(p1, R, 64, '内参：照厂家规格', 'demo-x-ink', 14);
    var CX = R + 30, CY = 170;
    p1.appendChild(paint(svgEl('path', { d: 'M' + CX + ' ' + CY + ' L' + (CX + 140) + ' ' + (CY - 97) + ' L' + (CX + 140) + ' ' + (CY + 97) + ' Z', 'stroke-width': 1.5 }), C_SURFACE2, C_STU));
    dotAt(p1, CX, CY, 6, C_STU);
    label(p1, CX + 150, 130, '焦距 1.88 mm', 'demo-x-ink2', 11.5);
    label(p1, CX + 150, 152, '光圈 2.60 × 1.46 mm', 'demo-x-ink2', 11.5);
    label(p1, CX + 150, 182, '→ 69.4° × 42.5°', 'demo-x-ink', 13);
    label(p1, CX + 150, 206, 'D435i 彩色相机的规格', 'demo-x-mut', 10.5);
    /* 第 2 段：每台不一样 */
    var p2 = group(s);
    label(p2, R, 64, '外参：每台 G1 都不一样', 'demo-x-ink', 14);
    var cams = [-0.08, 0.0, 0.1].map(function (d, j) {
      var g = group(p2), x = R + 50 + j * 110, y = 150;
      rectBox(g, x - 26, y - 34, 52, 60, C_BORDER, C_SURFACE2);
      var l1 = hline(g, x, y - 10, x, y - 10, C_STU, 2), l2 = hline(g, x, y - 10, x, y - 10, C_STU, 2);
      dotAt(g, x, y - 10, 5, C_STU);
      label(g, x, y + 46, '第 ' + (j + 1) + ' 台', 'demo-x-ink2', 10.5, 'middle');
      return { x: x, y: y - 10, l1: l1, l2: l2, d: d };
    });
    label(p2, R, 236, '机械公差不同，同一台还会随时间漂', 'demo-x-ink2', 11.5);
    label(p2, R + W, 258, '示意', 'demo-x-mut', 9.5, 'end');
    /* 第 3 段：标定 —— 两个小视图跟着左图在对齐前 / 后之间切：从背后看往左挪 3.5 cm，从侧面看低头 3.4°（都放大 4 倍画） */
    var p3 = group(s);
    label(p3, R, 64, '轻量标定：对着图目测对齐', 'demo-x-ink', 14);
    rectBox(p3, R + 20, 96, 120, 92, C_BORDER, C_SURFACE2);
    var ghostF = ringAt(p3, R + 80, 132, 7, C_MUTED, 1.5); ghostF.setAttribute('stroke-dasharray', '3 2');
    var camF = dotAt(p3, R + 80, 132, 7, C_STU);
    var shiftA = arrow(p3, C_STU, 2);
    label(p3, R + 80, 214, '从背后看：往左挪 3.5 cm', 'demo-x-ink2', 11.5, 'middle');
    rectBox(p3, R + 192, 96, 80, 92, C_BORDER, C_SURFACE2);
    var SX = R + 272, SY = 132;
    var ghostS = hline(p3, SX, SY, SX + 70, SY, C_MUTED, 1.5, '4 3');
    var camS = pathLine(p3, [], C_STU, 2), camSD = dotAt(p3, SX, SY, 6, C_STU);
    label(p3, R + 264, 214, '从侧面看：低头 3.4°', 'demo-x-ink2', 11.5, 'middle');
    var calTxt = label(p3, R, 244, '', 'demo-x-ink', 12.5);
    label(p3, R, 270, '渲染图对着真实图看，调到对上为止', 'demo-x-ink2', 11.5);
    label(p3, R + W, 294, '示意：位移和角度放大 4 倍画', 'demo-x-mut', 11, 'end');
    /* 第 4 段：外参随机化 */
    var p4 = group(s);
    label(p4, R, 64, '训练时随机化外参（代码的范围）', 'demo-x-ink', 14);
    var rows4 = EXT_NAMES.map(function (n, j) {
      var lim = EXTR.code[j], unit = j < 3 ? ' cm' : ' rad', mul = j < 3 ? 100 : 1;
      return rangeRow(p4, R, 90 + j * 28, W, n + (j < 3 ? '（±' + lim * 100 + ' cm）' : '（±' + lim + '）'), -lim, lim, -0.1, 0.1, function (v) { return sgn(fmt(v * mul, j < 3 ? 1 : 3)) + unit; }, j < 3 ? C_ACCENT : C_PURPLE);
    });
    label(p4, R, 266, '论文表 7：x、z 是 ±2 cm', 'demo-x-ink2', 11);
    var extIdx = 0;
    /* 第 5 段：图 13 */
    var p5 = group(s);
    label(p5, R, 64, '图 13：外参这一类最要紧', 'demo-x-ink', 14);
    var b13 = [FIG13[0], FIG13[3], FIG13[4]].map(function (r, j) { return { b: barRowAt(p5, R, 90 + j * 34, 90, r[0], j === 1 ? C_PURPLE : j === 2 ? C_BAD : C_GOOD, 20, 11), v: r[1] }; });
    label(p5, R, 214, '去掉外参随机化：降 10.7%', 'demo-x-ink', 12);
    readHint(p5, R, 240, '按全随机化归一化的成功率，越高越好', 10, W);
    function draw(t, clock) {
      var now = nowOf(t, clock), fr;
      if (t < 10.4) { fr = Math.floor(now / 1.2) % 2; egoLab.textContent = fr ? '对齐后（偏移 3.5 cm、转 3.4°）' : '对齐前（直接挂在 d435_link 上）'; }
      else { extIdx = Math.floor(since(t, clock, 10.4) / 1.0) % 9; fr = 2 + extIdx; egoLab.textContent = '随机外参第 ' + (extIdx + 1) + ' 组'; }
      ego.put(fr);
      var al = t < 10.4 ? fr : 1, eu = K.ease(al ? seg((now / 1.2) % 1, 0, 0.35) : 1 - seg((now / 1.2) % 1, 0, 0.35));
      if (t >= 10.4) eu = 1;
      moveDot(camF, [R + 80 - 14 * eu, 132]);
      shiftA.set(R + 80, 160, R + 80 - 14 * eu - 0.01, 160, eu > 0.2 ? 6 : 0.1); shiftA.g.style.opacity = eu > 0.2 ? 1 : 0;
      var ang = -0.0593 * 4 * eu, half = 0.37;
      setPath(camS, [[SX + 70 * Math.cos(ang + half), SY - 70 * Math.sin(ang + half)], [SX, SY], [SX + 70 * Math.cos(ang - half), SY - 70 * Math.sin(ang - half)]]);
      ghostS.setAttribute('x2', (SX + 70).toFixed(1));
      calTxt.textContent = eu > 0.5 ? '对齐后：和真机的画面对上了' : '对齐前：直接挂在 d435_link 上';
      cams.forEach(function (c) {
        var a = Math.PI / 2 + c.d + 0.02 * Math.sin(now * 1.5 + c.x);
        setLine(c.l1, c.x, c.y, c.x + 40 * Math.cos(a - 0.35), c.y - 40 * Math.sin(a - 0.35));
        setLine(c.l2, c.x, c.y, c.x + 40 * Math.cos(a + 0.35), c.y - 40 * Math.sin(a + 0.35));
      });
      var e = EXT_DRAWS[extIdx];
      rows4.forEach(function (r, j) {
        var v = e[j], g = r.g, dot = g.querySelector('circle'), lab = g.querySelectorAll('text');
        var px = R + 92 + (v + 0.1) / 0.2 * (W - 176);
        moveDot(dot, [px, 90 + j * 28]);
        lab[lab.length - 1].textContent = sgn(fmt(v * (j < 3 ? 100 : 1), j < 3 ? 1 : 3)) + (j < 3 ? ' cm' : ' rad');
      });
      b13.forEach(function (r, j) { var u = K.ease(seg(since(t, clock, 13.4), 0.2 + j * 0.3, 0.8 + j * 0.3)); r.b.set((r.v - 0.6) / 0.4 * 200 * u, fmt(r.v, 3)); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 15: 视觉随机化（图 3、表 7、图 13） ── */
  function buildSceneDR() {
    var s = sceneSvg('左上是项目页的仿真视频：每隔几秒换一套光照、材质和桌子颜色，右下角小窗是学生相机；右边依次出现：照代码抽的图像增强（每秒换一张，写出这次生效的几项）；' +
      '穹顶光的强度和朝向在区间里跳；我们照代码类别重渲的八种地板与光照；图 13 五根柱子；代码里的几处细节');
    s.appendChild(svgText(24, 26, '视觉随机化（图 3、表 7）', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'allrand', 24, 48, 380, 214, '项目页视频：仿真里全部随机化，右下小窗是学生相机');
    label(s, 24, 300, '画质、光照、材质、外参、延迟一起随机', 'demo-x-ink2', 11.5);
    var R = 424, W = 352;
    /* 第 1 段：图像增强 */
    var p1 = group(s);
    label(p1, R, 64, '图像增强：每步对整批图抽一次', 'demo-x-ink', 14);
    var aug = egoView(p1, 'aug', R, 80, 224);
    var augTxt = label(p1, R, 80 + aug.h + 20, '', 'demo-x-ink', 11.5);
    AUG.forEach(function (a, j) {
      label(p1, R + 236, 92 + j * 22, a[0], 'demo-x-ink2', 10.5);
      label(p1, R + W, 92 + j * 22, 'p ' + a[1], 'demo-x-mut', 10, 'end');
    });
    label(p1, R, 268, '照代码的顺序和概率在示范画面上抽', 'demo-x-mut', 10);
    /* 第 2 段：穹顶光 */
    var p2 = group(s);
    label(p2, R, 64, '光照：穹顶光', 'demo-x-ink', 14);
    var rl = [rangeRow(p2, R, 100, W, '强度', 800, 2000, 600, 2200, function (v) { return Math.round(v); }, C_WARN),
      rangeRow(p2, R, 136, W, '朝向', -Math.PI, Math.PI, -3.5, 3.5, function (v) { return sgn(f2(v)) + ' rad'; }, C_WARN)];
    var maps = ['室内', '晴天', '阴天', '夜晚', '影棚'].map(function (m, j) { return chip(p2, R + j * 70, 170, 64, m, C_WARN, { size: 11.5, h: 28 }); });
    label(p2, R, 228, '环境图五选一，每次重置都换', 'demo-x-ink2', 11.5);
    /* 第 3 段：材质 */
    var p3 = group(s);
    label(p3, R, 64, '材质：地板、桌子、物体、机器人', 'demo-x-ink', 14);
    var dr = egoView(p3, 'dr', R, 80, 224);
    var drTxt = label(p3, R, 80 + dr.h + 20, '', 'demo-x-ink', 11.5);
    ['地板：8 类纹理', '桌子：木纹', '物体：全部基础材质', '机器人：粗糙 / 金属 / 高光'].forEach(function (k, j) { label(p3, R + 236, 94 + j * 22, k.split('：')[0], 'demo-x-ink2', 10.5); });
    label(p3, R, 268, '示意：我们照代码的类别重渲，不是 Isaac Sim 的画面', 'demo-x-mut', 9.5);
    /* 第 4 段：图 13 */
    var p4 = group(s);
    label(p4, R, 64, '图 13：去掉一类或全去掉', 'demo-x-ink', 14);
    var b13 = FIG13.map(function (r, j) { return { b: barRowAt(p4, R, 84 + j * 30, 90, r[0], j === 0 ? C_GOOD : j === 4 ? C_BAD : C_ACCENT, 18, 11), v: r[1] }; });
    readHint(p4, R, 248, '评测时全开随机化；按全随机化归一化，越高越好；柱从 0.6 画起', 10, W);
    label(p4, R, 290, '全去掉：降 35.1%；去掉任何一类都会降', 'demo-x-ink', 11.5);
    /* 第 5 段：代码细节 —— 谁随机化了什么：教师、学生 × 物理、视觉，四格逐个亮 */
    var p5 = group(s);
    label(p5, R, 64, '代码里：谁随机化了什么', 'demo-x-ink', 14);
    label(p5, R + 150, 98, '物理', 'demo-x-ink', 12.5, 'middle');
    label(p5, R + 282, 98, '视觉', 'demo-x-ink', 12.5, 'middle');
    var mCells = [];
    [['教师', C_TEA, [0, 0]], ['学生', C_STU, [0, 1]]].forEach(function (r, i) {
      var y = 110 + i * 52;
      chip(p5, R, y, 76, r[0], r[1], { size: 12.5, h: 40 });
      r[2].forEach(function (on, j) {
        var g = group(p5), cx = R + 150 + j * 132;
        rectBox(g, cx - 56, y, 112, 40, C_BORDER, C_SURFACE);
        if (on) g.appendChild(paint(svgEl('path', { d: 'M' + (cx - 10) + ' ' + (y + 20) + ' l7 8 l14 -16', fill: 'none', 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }), null, C_GOOD));
        else cross(g, cx - 8, y + 12, 16, C_BAD);
        mCells.push(g);
      });
    });
    label(p5, R, 240, '物理：摩擦、质量、推力都不随机', 'demo-x-ink2', 11.5);
    label(p5, R, 264, '模糊核固定 (3, 5)；桌子尺寸按示范定', 'demo-x-ink2', 11.5);
    label(p5, R, 290, '读的是放出来的代码', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      clip.at(K.clipSince(t, 0), true);
      var ka = Math.floor(since(t, clock, 0.4) / 1.0) % AUG_DRAWS.length;
      aug.put(ka);
      augTxt.textContent = '这次：' + AUG_DRAWS[ka].map(function (o) { return o[0] + (o[0] === '模糊' ? '' : ' ' + sgn(String(o[1]))); }).join('、');
      rl.forEach(function (r, j) { r.at(since(t, clock, 3.6), 11 + j, 0.9); });
      var km = Math.floor(since(t, clock, 3.6) / 0.9) % 5;
      maps.forEach(function (m, j) { setOpacity(m, j === km ? 1 : 0.35); });
      var kd = Math.floor(since(t, clock, 7.0) / 1.0) % 8;
      dr.put(kd);
      drTxt.textContent = '地板：' + DR_NAMES[kd];
      b13.forEach(function (r, j) { var u = K.ease(seg(since(t, clock, 10.4), 0.2 + j * 0.25, 0.8 + j * 0.25)); r.b.set((r.v - 0.6) / 0.4 * 200 * u, fmt(r.v, 3)); });
      void now;
      mCells.forEach(function (g, i) { setOpacity(g, seg(since(t, clock, 13.4), 0.3 + i * 0.5, 0.6 + i * 0.5)); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 16: 真机：59 次成功 54 次（图 7） ── */
  function buildSceneReal() {
    var s = sceneSvg('左边是项目页 4 倍速的真机视频：G1 在两张桌子之间连续放、抓、转身；右边依次出现：59 个圆点逐个亮起（54 绿 5 红）；' +
      '专家与新手两位遥操作者；图 7 的成功率柱；图 7 的每轮用时柱；48 倍速视频里 54 轮的总用时');
    s.appendChild(svgText(24, 26, '真机：59 次成功 54 次（图 7）', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'real4x', 24, 48, 380, 214, '项目页视频（4 倍速）：连续 20 轮里的两轮');
    label(s, 24, 298, 'G1 + 三指手 · D435i · 台式机的 RTX 4090 推理', 'demo-x-ink2', 11.5);
    label(s, 24, 318, '策略零样本，没有任何真机微调', 'demo-x-mut', 11);
    var R = 424, W = 352;
    /* 第 1 段：59 次 */
    var p1 = group(s);
    label(p1, R, 64, '连续 59 轮：走、放、抓、转', 'demo-x-ink', 14);
    var FAIL = [11, 23, 34, 46, 52], dots = [];
    for (var i = 0; i < REAL.trials; i++) dots.push(dotAt(p1, R + 12 + (i % 12) * 28, 92 + Math.floor(i / 12) * 28, 9, FAIL.indexOf(i) >= 0 ? C_BAD : C_GOOD));
    var cnt = label(p1, R, 254, '', 'demo-x-ink', 16);
    label(p1, R, 280, '失败的位置是示意，论文只给了总数', 'demo-x-mut', 9.5);
    /* 第 2 段：和人比 —— 两位遥操作者的经验按对数刻度画条：专家 1000 小时以上，新手约 1 小时 */
    var p2 = group(s);
    label(p2, R, 64, '和人比：同样用 HOMIE', 'demo-x-ink', 14);
    var EX = R + 118, lgE = function (v) { return EX + 50 * (Math.log10(v) + 0.3); };
    var ppl = [['VIRAL', null, C_WARN], ['专家遥操作', 1000, C_GOOD], ['新手遥操作', 1, C_ACCENT]].map(function (k, j) {
      var y = 84 + j * 42;
      chip(p2, R, y, 108, '**' + k[0] + '**', k[2], { size: 12, h: 32 });
      if (k[1] == null) { label(p2, EX + 4, y + 21, '不用人：自主，一个相机', 'demo-x-ink2', 11.5); return null; }
      return { b: hbar(p2, EX, y + 6, 20, k[2]), v: label(p2, EX, y + 21, '', 'demo-x-ink', 11.5), k: k };
    }).filter(Boolean);
    hline(p2, EX, 218, lgE(1000) + 10, 218, C_BORDER, 1.2);
    [1, 10, 100, 1000].forEach(function (v) { hline(p2, lgE(v), 214, lgE(v), 222, C_BORDER, 1.2); label(p2, lgE(v), 238, String(v), 'demo-x-mut', 11, 'middle'); });
    readHint(p2, R, 264, '横轴：遥操作 G1 的经验（小时），对数刻度', 10, W);
    label(p2, R, 290, '几乎是同条件的对比', 'demo-x-ink2', 11.5);
    /* 第 3 段：成功率 */
    var p3 = group(s);
    label(p3, R, 64, '图 7：成功率', 'demo-x-ink', 14);
    var cols = [C_WARN, C_GOOD, C_ACCENT], BB = 236;
    var sb = FIG7.map(function (f, j) {
      var b = vbar(p3, R + 40 + j * 100, 56, cols[j]);
      label(p3, R + 68 + j * 100, BB + 16, f.zh, 'demo-x-ink2', 11, 'middle');
      return { b: b, v: label(p3, R + 68 + j * 100, BB, '', 'demo-x-ink', 12, 'middle'), f: f.succ };
    });
    hline(p3, R + 20, BB, R + W - 10, BB, C_BORDER, 1.2);
    readHint(p3, R, 282, '纵轴：成功率，越高越好', 10, W);
    /* 第 4 段：用时 */
    var p4 = group(s);
    label(p4, R, 64, '图 7：每轮用时', 'demo-x-ink', 14);
    var cb = FIG7.map(function (f, j) { return { b: barRowAt(p4, R, 92 + j * 40, 90, f.zh, cols[j], 24, 11.5), v: f.cycle }; });
    readHint(p4, R, 232, '越短越快', 10, W);
    label(p4, R, 258, 'VIRAL 比专家快约 1 s', 'demo-x-ink', 12);
    label(p4, R, 280, '新手慢一倍多，成功率也低', 'demo-x-ink2', 11.5);
    /* 第 5 段：54 轮 */
    var p5 = group(s);
    label(p5, R, 64, '项目页的 48 倍速视频', 'demo-x-ink', 14);
    var lap = label(p5, R, 110, '', 'demo-x-ink', 24);
    label(p5, R, 140, '连续 54 轮的计时', 'demo-x-ink2', 12);
    label(p5, R, 172, '平均每轮约 21.6 s（含中间的停顿）', 'demo-x-ink2', 12);
    label(p5, R, 204, '论文的结论：接近专家的成功率，', 'demo-x-ink', 12);
    label(p5, R, 226, '速度比专家还快', 'demo-x-ink', 12);
    function draw(t, clock) {
      clip.at(K.clipSince(t, 0), true);
      var u1 = seg(since(t, clock, 0.4), 0.2, 2.6), lit = Math.floor(u1 * REAL.trials), ok = 0;
      dots.forEach(function (d, i) { d.style.opacity = i < lit ? 1 : 0.12; if (i < lit && FAIL.indexOf(i) < 0) ok += 1; });
      cnt.textContent = '成功 ' + ok + ' / ' + lit;
      ppl.forEach(function (p, j) { var u = K.ease(seg(since(t, clock, 3.6), 0.3 + j * 0.4, 1.1 + j * 0.4)), w = (lgE(p.k[1]) - EX) * u;
        setW(p.b, w); p.v.setAttribute('x', (EX + w + 6).toFixed(1)); p.v.textContent = u > 0.95 ? (p.k[1] === 1 ? '约 1 h' : '1000+ h') : ''; });
      sb.forEach(function (r, j) { var u = K.ease(seg(since(t, clock, 7.0), 0.2 + j * 0.35, 0.9 + j * 0.35)); r.b.set(BB, r.f * 1.4 * u); r.v.setAttribute('y', (BB - r.f * 1.4 * u - 6).toFixed(1)); r.v.textContent = u > 0.95 ? r.f + '%' : ''; });
      cb.forEach(function (r, j) { var u = K.ease(seg(since(t, clock, 10.4), 0.2 + j * 0.35, 0.9 + j * 0.35)); r.b.set(r.v / 47 * 200 * u, f1(r.v * u) + ' s'); });
      var u5 = seg(since(t, clock, 13.4), 0.2, 1.6), secs = Math.round(u5 * (19 * 60 + 25));
      lap.textContent = Math.floor(secs / 60) + ' 分 ' + (secs % 60) + ' 秒';
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 17: 泛化（图 8、图 16） ── */
  var GEN_PARTS = [[4, '托盘伸出桌沿 15 cm'], [4, '桌高 80.7 cm'], [4, '闪烁的灯光'], [4, '红色桌布'], [4, '保龄球瓶']];
  var GEN_LIST = ['托盘位置 · 横向', '托盘位置 · 纵向', '圆柱的位置', '起点 · 横向', '起点 · 离桌 1–2.5 m', '桌高 66.5–80.7 cm', '灯光：亮、暗、闪烁', '桌布颜色八种', '桌子类型', '物体十几种'];
  var GEN_HI = [1, 5, 6, 7, 9];
  function buildSceneGeneral() {
    var s = sceneSvg('左边是项目页的泛化视频，一次放一段：托盘伸出桌沿、更高的桌子、闪烁的灯光、红色桌布、保龄球瓶；右边依次出现：十类变化，正在放的那一类亮起；' +
      '论文图 8；图 16 的十种物体两组柱（多物体训练对只训圆柱）；结论；代码里的物体');
    s.appendChild(svgText(24, 26, '泛化：换位置、桌子、灯光、物体（图 8、图 16）', 'demo-x-ink2', 13.5));
    var clip = seqClip(s, 'general', 24, 48, 380, 214, '项目页视频：每类泛化各剪一段', GEN_PARTS);
    var R = 424, W = 352;
    /* 第 1 段：十类 */
    var p1 = group(s);
    label(p1, R, 64, '真机上改了十类条件', 'demo-x-ink', 14);
    var listG = GEN_LIST.map(function (k, j) { return chip(p1, R + (j % 2) * 178, 80 + Math.floor(j / 2) * 40, 170, k, C_ACCENT, { size: 11, h: 32 }); });
    label(p1, R, 292, '不调参，都能完成', 'demo-x-ink', 12);
    /* 第 2 段：图 8 */
    var p2 = group(s);
    label(p2, R, 64, '论文图 8', 'demo-x-ink', 14);
    var f8 = paperPart(p2, 'fig8', 0, 0, 1, 1, R, 80, W, '');
    label(p2, R, 80 + f8.h + 18, '托盘与物体位置、起点、桌高、灯光、桌布、桌型、物体', 'demo-x-mut', 9.5);
    /* 第 3 段：图 16 */
    var p3 = group(s), p3t = group(s);
    label(p3t, R, 64, '图 16：仿真里抓不同物体（教师）', 'demo-x-ink', 14);
    var BB = 240, bw = 14, b16 = FIG16.map(function (r, j) {
      var x = R + 8 + j * 34;
      var a = vbar(p3, x, bw, C_ACCENT), b = vbar(p3, x + bw + 1, bw, C_MUTED);
      var lb = label(p3, x + bw, BB + 15 + (j % 2) * 20, r[0], 'demo-x-ink2', 9.5, 'middle');  // 放大到 11 号后相邻三个字会挨上，上下错开
      void lb;
      return { a: a, b: b, v: r };
    });
    hline(p3, R, BB, R + W, BB, C_BORDER, 1.2);
    legendRow(p3, R, 300, [['训 10 种物体', C_ACCENT, 70], ['只训圆柱', C_MUTED, 50]], 10.5);
    readHint(p3, R, 324, '纵轴：按圆柱归一化的成功率（读图近似）', 10, W);
    /* 第 4 段：结论 —— 图 16 留在原处，标出杯子和闹钟两组，其余几组变淡 */
    var p4 = group(s);
    label(p4, R, 64, '多物体训练：每一类都更好', 'demo-x-ink', 14);
    var CUP = R + 8 + 34 + bw, CLK = R + 8 + 9 * 34 + bw;
    hline(p4, CUP + bw + 2, BB - 0.99 * 150 + 8, CUP + 52, BB - 0.99 * 150 + 8, C_ACCENT, 1.4);
    tone(p4, CUP + 56, BB - 0.99 * 150 + 12, '杯子：0.99 对 0.05', C_ACCENT, 12.5);
    label(p4, CUP + 56, BB - 0.99 * 150 + 34, '只训圆柱，换个物体几乎抓不起', 'demo-x-ink2', 11.5);
    hline(p4, CLK, BB - 0.18 * 150 - 4, CLK, 182, C_ACCENT, 1.4);
    tone(p4, CLK + 8, 176, '最难的闹钟：0.18 对 0.08', C_ACCENT, 12, 'end');
    /* 第 5 段：论文的解释 + 代码 */
    var p5 = group(s);
    label(p5, R, 64, '为什么能泛化', 'demo-x-ink', 14);
    chip(p5, R, 82, W, '论文：仿真里的**域随机化**', C_GOOD, { size: 12, left: true, h: 34 });
    chip(p5, R, 126, W, '加上**强化学习**本身的鲁棒性', C_GOOD, { size: 12, left: true, h: 34 });
    label(p5, R, 196, '代码里物体只配了「bottle」一类', 'demo-x-ink2', 11.5);
    label(p5, R, 218, '项目页的真机物体有十几种', 'demo-x-mut', 10.5);
    function draw(t, clock) {
      var sec = K.clipSince(t, 0);
      clip.at(sec, true);
      var m = ((sec % clip.total) + clip.total) % clip.total, part = Math.min(4, Math.floor(m / 4));
      listG.forEach(function (g, j) { setOpacity(g, j === GEN_HI[part] ? 1 : 0.4); });
      b16.forEach(function (r, j) {
        var u = K.ease(seg(since(t, clock, 7.0), 0.2 + j * 0.12, 0.8 + j * 0.12));
        r.a.set(BB, r.v[1] * 150 * u); r.b.set(BB, r.v[2] * 150 * u);
        var dim = t >= 10.4 && j !== 1 && j !== 9 ? 0.3 : 1; r.a.node.style.opacity = dim; r.b.node.style.opacity = dim;
      });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 13.4));
      setOpacity(p3t, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 18: 局限：四个覆盖缺口 ── */
  var FAIL_PARTS = [[4, '手被卡住'], [4, '摔倒'], [5, '没见过的物体抓不起来']];
  function buildSceneLimits() {
    var s = sceneSvg('左边是项目页的失败案例，一次放一段：手被卡住、摔倒、没见过的物体抓不起来；右边依次出现论文讨论的四个覆盖缺口：' +
      '难以模拟的物理（逐个出现）、成千上万种任务的格子、奖励太密与太稀疏的拔河和一句原话、硬件的四个毛病；最后是展望和项目页的五个多月的时间线');
    s.appendChild(svgText(24, 26, '局限：四个覆盖缺口（第 6 节）', 'demo-x-ink2', 13.5));
    var clip = seqClip(s, 'failures', 24, 48, 380, 214, '项目页视频：失败案例', FAIL_PARTS);
    var R = 424, W = 352;
    /* 第 1 段：物理 */
    var p1 = group(s);
    label(p1, R, 64, '① 物理覆盖', 'demo-x-ink', 14);
    var phys = ['舀米', '用夹子夹面', '切蒜', '做寿司', '咖啡机倒豆子', '纸箱的阻尼', '衣服的刚度', '油渍的摩擦'];
    var physG = phys.map(function (k, j) { return chip(p1, R + (j % 3) * 118, 80 + Math.floor(j / 3) * 40, 110, k, C_WARN, { size: 11, h: 30 }); });
    label(p1, R, 222, '不是仿真器做不到，是对齐真实的工程量', 'demo-x-ink2', 11.5);
    label(p1, R, 244, '可能比直接采真机数据还贵', 'demo-x-ink', 12);
    /* 第 2 段：任务 */
    var p2 = group(s);
    label(p2, R, 64, '② 任务覆盖', 'demo-x-ink', 14);
    var taskCells = [];
    for (var i = 0; i < 120; i++) { var c = paint(svgEl('rect', { x: R + (i % 20) * 17.5, y: 82 + Math.floor(i / 20) * 17.5, width: 13, height: 13, rx: 2 }), C_ACCENT); p2.appendChild(c); taskCells.push(c); }
    label(p2, R, 208, '洗碗一个任务：几何、功能、脏 / 干净、交互逻辑', 'demo-x-ink2', 11);
    label(p2, R, 230, '家务有成千上万种；还有想不到的「未知的未知」', 'demo-x-ink2', 11);
    /* 第 3 段：奖励 */
    var p3 = group(s);
    label(p3, R, 64, '③ 奖励与策略覆盖', 'demo-x-ink', 14);
    var rope = hline(p3, R + 40, 130, R + W - 40, 130, C_MUTED, 3);
    var knot = dotAt(p3, R + W / 2, 130, 8, C_BAD);
    label(p3, R + 20, 110, '太密：钻空子', 'demo-x-ink2', 11);
    label(p3, R + W - 20, 110, '太稀疏：起不了步', 'demo-x-ink2', 11, 'end');
    rectBox(p3, R, 162, W, 70, C_ACCENT, C_SURFACE2);
    label(p3, R + 14, 188, '「几天高质量的遥操作数据，', 'demo-x-ink', 12.5);
    label(p3, R + 14, 212, '常常胜过几个月的 sim-to-real 工程」', 'demo-x-ink', 12.5);
    label(p3, R, 256, '人在示范里隐式地给出了奖励', 'demo-x-ink2', 11.5);
    void rope;
    /* 第 4 段：硬件 */
    var p4 = group(s);
    label(p4, R, 64, '④ 硬件覆盖', 'demo-x-ink', 14);
    var hw = ['没建模的摩擦', '背隙', '过热降频', '传感器噪声'].map(function (k, j) { return chip(p4, R + (j % 2) * 178, 82 + Math.floor(j / 2) * 44, 170, k, C_BAD, { size: 12, h: 34 }); });
    label(p4, R, 196, '灵巧手最明显：依赖精确手指位置或力反馈的', 'demo-x-ink2', 11);
    label(p4, R, 218, '策略，上不了不够可靠的硬件', 'demo-x-ink2', 11);
    /* 第 5 段：展望 + 时间线 */
    var p5 = group(s);
    label(p5, R, 64, '展望：仿真补充、而不是取代真实世界', 'demo-x-ink', 13.5);
    hline(p5, R + 8, 128, R + W - 8, 128, C_BORDER, 2);
    var jdots = JOURNEY.map(function (j, k) {
      var x = R + 8 + k * (W - 16) / (JOURNEY.length - 1), g = group(p5), last = k === JOURNEY.length - 1;
      /* 两头的说明往里靠，免得伸到左边的片段上 */
      var an = k === 0 ? 'start' : last ? 'end' : 'middle', dx = k === 0 ? -8 : last ? 8 : 0;
      dotAt(g, x, 128, 6, last ? C_GOOD : C_ACCENT);
      label(g, x, 112, j[0], 'demo-x-ink2', 10, 'middle');
      label(g, x + dx, 150 + (k % 2) * 22, j[1], 'demo-x-mut', 9.5, an);
      return g;
    });
    label(p5, R, 214, '项目页的 sim-to-real 日志（2025 年）', 'demo-x-mut', 10);
    chip(p5, R, 230, W, '代码 2026-04 开源：NVlabs/GR00T-VisualSim2Real', C_GOOD, { size: 11.5, left: true, h: 32 });
    function draw(t, clock) {
      var now = nowOf(t, clock);
      clip.at(K.clipSince(t, 0), true);
      physG.forEach(function (g, j) { setOpacity(g, seg(t, 0.5 + j * 0.25, 0.8 + j * 0.25)); });
      var u2 = seg(since(t, clock, 3.6), 0.2, 2.4);
      taskCells.forEach(function (c, i) { c.style.opacity = i / 120 < u2 ? 0.3 + 0.7 * rnd(i, 2) : 0.06; });
      moveDot(knot, [R + W / 2 + 70 * Math.sin(now * 1.6), 130]);
      hw.forEach(function (g, j) { setOpacity(g, seg(t, 10.7 + j * 0.4, 11.0 + j * 0.4)); });
      jdots.forEach(function (g, j) { setOpacity(g, seg(t, 13.8 + j * 0.25, 14.1 + j * 0.25)); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  var VIRAL_SCENES = [
    {
      title: '人形缺自主的移动操作',
      dur: 16,
      build: buildSceneIntro,
      cues: [
        { at: 0.4, s: '现在的人形：只会走、只在桌前、靠人遥操作、靠外部动捕。' },
        { at: 3.6, s: '堆真机数据：移动操作要的数据多得多，人形的每条又更贵。' },
        { at: 7.0, s: '另一条路：GPU 仿真，数据多几个数量级。' },
        { at: 10.4, s: '问题：**视觉 sim-to-real** 能不能让人形用机载相机做移动操作？' },
        { at: 13.4, s: '**VIRAL**：NVIDIA 等，CVPR 2026；不是新算法，是一份完整配方。' }
      ]
    },
    {
      title: '两阶段：特权教师 → 视觉学生（图 2）',
      dur: 16,
      build: buildScenePipeline,
      cues: [
        { at: 0.4, s: '① 特权教师：看全部状态、不渲染，PPO，16 张 GPU。' },
        { at: 3.6, s: '② 视觉学生：只看 RGB 和本体，DAgger + BC，64 张 GPU 平铺渲染。' },
        { at: 7.0, s: '底层是冻结的 HOMIE：策略 50 Hz → HOMIE 50 Hz → PD 200 Hz。' },
        { at: 10.4, s: '③ 上真机：仿真这头随机化，硬件这头对齐手指和相机。' },
        { at: 13.4, s: '零样本：真机上不做任何微调。' }
      ]
    },
    {
      title: '一轮任务：走、放、抓、转',
      dur: 16,
      build: buildSceneTask,
      cues: [
        { at: 0.4, s: '五个阶段：走近、预放、放下、抓起、转身。' },
        { at: 3.6, s: '代码里的切换：离瓶子 < 0.45 m、离托盘 < 0.3 m、手掌离瓶 > 0.2 m……' },
        { at: 7.0, s: '每个阶段都有时限：6、1、1、2、2 s；超时就重置，扣终止分。' },
        { at: 10.4, s: '两张桌子相距 5.4 m：转身走向另一张，一轮接一轮循环下去。' },
        { at: 13.4, s: '画面是官方 295 段遥操作示范之一，我们按记下的位姿重渲。' }
      ]
    },
    {
      title: '教师：全状态进，HOMIE 命令出',
      dur: 16,
      build: buildSceneTeacher,
      cues: [
        { at: 0.4, s: '教师看 226 维：本体、阶段、物体与桌子的位姿和指尖力、HOMIE 命令。' },
        { at: 3.6, s: '输出 11 维增量：3 个速度、右臂 7 个关节、右手开合 1 个。' },
        { at: 7.0, s: '累加成 HOMIE 命令；高度固定 0.74 m，HOMIE 管腿和腰。' },
        { at: 10.4, s: '当 API 的好处：少写奖励、动作在安全范围、能换别的控制器。' },
        { at: 13.4, s: '代码里：走、站两个 HOMIE 模型；手不分关节，只有一个开合原语。' }
      ]
    },
    {
      title: '奖励按阶段开关（附录表 3）',
      dur: 16,
      build: buildSceneReward,
      cues: [
        { at: 0.4, s: '走近：$r_{\\text{walk}}=\\exp(-4(d-0.45)^2)$；骨盆离瓶子 0.45 m 时满分。' },
        { at: 3.6, s: '放下：瓶子到了托盘 0.3 m 以内还捏着，按捏的力扣分。' },
        { at: 7.0, s: '抓起：举得越高越好，封顶 0.15 m；离举起目标越近越好。' },
        { at: 10.4, s: '转身：朝向和目标差多少，扣多少。' },
        { at: 13.4, s: '代码：每项乘步长 0.02；「按阶段」是每项只在几个阶段生效。' }
      ]
    },
    {
      title: '增量动作',
      dur: 16,
      build: buildSceneDelta,
      cues: [
        { at: 0.4, s: '每一步：$c_t=c_{t-1}+0.1\\,a_t$；想保持不动，输出 0 就行。' },
        { at: 3.6, s: '起步：每步输出 1，5 步、0.1 s 到 0.5 m/s。' },
        { at: 7.0, s: '手臂再乘 0.25：每步 0.025 rad；右手看累加值是正是负。' },
        { at: 10.4, s: '图 9：换成绝对关节目标，奖励一直约 −60，成功率是 0。' },
        { at: 13.4, s: '论文只说加快、稳定训练；我们的理解：探索噪声只把命令推一点。' }
      ]
    },
    {
      title: '参考状态初始化（图 4、图 9）',
      dur: 16,
      build: buildSceneRSI,
      cues: [
        { at: 0.4, s: '长时程：前一个阶段没学会，后一个就见不到。' },
        { at: 3.6, s: '200 段仿真里的遥操作示范：每次重置抽一帧，照那一帧摆好。' },
        { at: 7.0, s: '代码：目录里 295 段、59.7 分钟；每次重置都从示范开始。' },
        { at: 10.4, s: '图 9：不用 RSI，成功率停在 10% 以下；用了接近 95%。' },
        { at: 13.4, s: '奖励还有约 480：前几个阶段学会了，后面的没探索到（我们的读法）。' }
      ]
    },
    {
      title: '学生只看一张图',
      dur: 16,
      build: buildSceneStudent,
      cues: [
        { at: 0.4, s: '学生：一张 108 × 192 的 RGB → 128 维，加本体 113 维。' },
        { at: 3.6, s: '少了物体与桌子的位姿、指尖力、阶段、线速度和手指关节。' },
        { at: 7.0, s: 'D435i：69.4° × 42.5°；半米外的瓶子只有约 16 像素宽。' },
        { at: 10.4, s: '项目页：真机上学生看到的画面。' },
        { at: 13.4, s: '代码：ImageNet 归一化；用 3 步之前（约 60 ms）的那张图。' }
      ]
    },
    {
      title: '视觉骨干与历史（图 10、图 12）',
      dur: 16,
      build: buildSceneBackbone,
      cues: [
        { at: 0.4, s: '论文：DINOv3 抽特征，和本体拼起来进策略头。' },
        { at: 3.6, s: '图 10：小 CNN 约 0.77，ResNet-18 和 DINOv3 约 0.87。' },
        { at: 7.0, s: '图 12：带历史的策略头大多更好，MLP 看 32 步约 0.83。' },
        { at: 10.4, s: '放出来的学生：ResNet-18、单帧，没有历史。' },
        { at: 13.4, s: '按代码，DINOv3 要求边长是 16 的倍数，图高 108 配不上。' }
      ]
    },
    {
      title: 'DAgger 与行为克隆各一半（图 11）',
      dur: 16,
      build: buildSceneDAgger,
      cues: [
        { at: 0.4, s: '同一个均方误差，只差数据由谁开出来；$\\alpha$ 是教师开的比例。' },
        { at: 3.6, s: '教师开：干净、学得快；学生开：见过自己的错，学会纠错。' },
        { at: 7.0, s: '图 11：$\\alpha$ = 0、0.25、0.5、0.75、1 的成功率 0.8、1、1、0.3、0。' },
        { at: 10.4, s: '纯 BC 损失最低，部署却完全不行。' },
        { at: 13.4, s: '代码：每个进程前一半环境执行教师的动作，标签都来自教师。' }
      ]
    },
    {
      title: '教师的算力（图 14）',
      dur: 16,
      build: buildSceneTeacherScale,
      cues: [
        { at: 0.4, s: '教师从 1 张加到 16 张 GPU，32,768 个环境。' },
        { at: 3.6, s: '更快：16 张约 2.1 小时到 0.8 成功率（读图）。' },
        { at: 7.0, s: '前期快过线性：成功率到 0.2，4 张用的时间不到 2 张的一半。' },
        { at: 10.4, s: '上限更高：1–2 张 10 小时只有约 0.3。' },
        { at: 13.4, s: '一次 PPO 迭代：786,432 步，相当于约 4.4 小时的仿真经验。' }
      ]
    },
    {
      title: '学生的算力：平铺渲染（图 15）',
      dur: 16,
      build: buildSceneStudentScale,
      cues: [
        { at: 0.4, s: '视觉仿真比纯物理慢至少一个数量级。' },
        { at: 3.6, s: '平铺渲染：每个环境一台相机，画面拼成一张大图，一次渲完。' },
        { at: 7.0, s: 'TRL + Accelerate：8 台 × 8 卡，保留单卡的简单，接近线性扩展。' },
        { at: 10.4, s: '图 15：蒸馏损失降到 0.2，64 张约 8.5 h，1 张要 35 h 以上（读图）。' },
        { at: 13.4, s: 'GPU 多：曲线更平滑，最后成功率都在 0.85–0.88。' }
      ]
    },
    {
      title: '手指的系统辨识（图 5）',
      dur: 16,
      build: buildSceneSysID,
      cues: [
        { at: 0.4, s: 'G1 的三指手减速比大，仿真和真机差得多。' },
        { at: 3.6, s: '真机上做一串抓—放动作，仿真里回放同一串，比关节轨迹。' },
        { at: 7.0, s: '辨识转子惯量、刚度、阻尼，让仿真的关节轨迹对上真机。' },
        { at: 10.4, s: '图 5：辨识前像三角波，辨识后几乎重合。' },
        { at: 13.4, s: '表 4 的手指增益：$K_p$ 0.5、$K_d$ 0.1；论文里没有给辨识出来的参数。' }
      ]
    },
    {
      title: '相机：对齐与外参随机化（图 6）',
      dur: 16,
      build: buildSceneCamera,
      cues: [
        { at: 0.4, s: '内参照厂家规格：焦距 1.88 mm，算出 69.4° × 42.5°。' },
        { at: 3.6, s: '外参每台不一样，同一台还会随时间漂。' },
        { at: 7.0, s: '轻量标定：渲染图对着真实图目测对齐。' },
        { at: 10.4, s: '训练时随机化外参；代码里 x、z 是 ±1 cm（论文 ±2 cm）。' },
        { at: 13.4, s: '图 13：去掉外参随机化掉得最多，降到 0.893。' }
      ]
    },
    {
      title: '视觉随机化（图 3、表 7）',
      dur: 16,
      build: buildSceneDR,
      cues: [
        { at: 0.4, s: '图像增强：亮度、对比度、色相、饱和度、噪声、模糊，各有概率。' },
        { at: 3.6, s: '光照：穹顶光强度 800–2000，朝向随机，环境图五选一。' },
        { at: 7.0, s: '材质：地板 8 类纹理，桌子、物体和机器人的材质也随机。' },
        { at: 10.4, s: '图 13：全不随机降到 0.649，降 35.1%；去掉任何一类都会降。' },
        { at: 13.4, s: '代码：教师完全不随机；学生只随机视觉。' }
      ]
    },
    {
      title: '真机：59 次成功 54 次（图 7）',
      dur: 16,
      build: buildSceneReal,
      cues: [
        { at: 0.4, s: '连续 59 轮走、放、抓、转，成功 54 轮。' },
        { at: 3.6, s: '对比两位遥操作者：专家 1000 小时以上、新手约 1 小时。' },
        { at: 7.0, s: '图 7：成功率 92%、100%、73%。' },
        { at: 10.4, s: '每轮用时 20.2 s、21.4 s、47.0 s：VIRAL 比专家还快约 1 s。' },
        { at: 13.4, s: '项目页 48 倍速视频：54 轮共 19 分 25 秒。' }
      ]
    },
    {
      title: '泛化：换桌子、换灯光、换物体（图 8、图 16）',
      dur: 16,
      build: buildSceneGeneral,
      cues: [
        { at: 0.4, s: '真机上改了十类条件：位置、起点、桌高、灯光、桌布、桌型、物体。' },
        { at: 3.6, s: '论文图 8：不调参都能完成。' },
        { at: 7.0, s: '图 16：仿真里抓十种物体，多物体训练的每一类都更好。' },
        { at: 10.4, s: '只训圆柱：换成杯子只有 0.05；训十种：0.99。' },
        { at: 13.4, s: '论文归功于域随机化和强化学习的鲁棒性。' }
      ]
    },
    {
      title: '局限：四个覆盖缺口',
      dur: 16,
      build: buildSceneLimits,
      cues: [
        { at: 0.4, s: '物理：难的不是仿真器，是把每种材料对齐到真实的工程量。' },
        { at: 3.6, s: '任务：家务有成千上万种，还有想不到的「未知的未知」。' },
        { at: 7.0, s: '奖励：几天的遥操作数据，常胜过几个月的 sim-\u2060to-\u2060real 工程。' },
        { at: 10.4, s: '硬件：灵巧手没建模的摩擦、背隙、过热降频、传感器噪声。' },
        { at: 13.4, s: '展望：仿真补充、而不是取代真实世界；代码 2026-04 已开源。' }
      ]
    }
  ];
  VIRAL_SCENES.forEach(function (sc) { sc.cues.forEach(function (c) { c.s = nb(c.s); }); });

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十八幕动画：VIRAL 全流程速览',
      sub: '约 288 秒自动播放。空格播放/暂停，← → 换幕；G1 与学生相机的画面是我们按官方示范数据重渲的，表格与图来自论文，真机片段剪自项目页的视频。',
      ariaLabel: 'VIRAL 十八幕讲解动画',
      notes: [
        '取数依据：图 7、11、13 的数字照抄 arXiv 2511.15200（v1 与 v2 正文相同）；图 9、10、12、14、15、16 是位图，曲线和柱按颜色读出来，是读图近似值。代码里的数（11 维输出、增量 ×0.1、手臂 ×0.25、阶段条件与时限、相机内参与安装位置、外参随机化的范围、延迟 3 步、ResNet-18）取自官方仓库 NVlabs/GR00T-VisualSim2Real 的 `main`（2026-04-20 的 `92bf086`）。',
        'G1 的画面是我们的重渲，不是论文的实验：取官方仓库里的一段遥操作示范 `record_2025-10-31_04-50-31_0.717m.npz`（11.94 s），按里面记下的 53 个刚体位姿摆好带三指手的 G1（网格、材质与光照照抄 Robot Retarget Online），桌子按示范里存的尺寸、托盘按代码里的 28 × 28 × 10 cm 搭，瓶子画成 15 cm 的圆柱；学生相机按代码的安装位置与内参渲成 108 × 192；材质与光照的八种变化是照代码的类别做的示意。',
        '真机与仿真片段剪自项目页 viral-humanoid.github.io 的视频（画面里标了倍速），只做讲解引用。'
      ],
      scenes: VIRAL_SCENES
    });
  }

  // ─── the narrated vertical video of the same eighteen scenes ──────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：VIRAL 十八幕全流程',
      sub: '21 分 35 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十八幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '26.1 MB',
      fileName: 'VIRAL_讲解视频.mp4'
    });
  }

  // ─── 演示 1：示范回放 ──────────────────────────────────────────────────────
  function buildReplayDemo(host) {
    var root = card(host, {
      title: '示范回放：一段官方遥操作示范逐帧看',
      sub: '`record_2025-10-31_04-50-31_0.717m.npz`（11.94 s，桌高 0.717 m）。左边是我们按记下的刚体位姿重渲的 G1，右边是同一时刻学生相机（108 × 192）看到的画面；下面按代码的条件判断阶段。'
    });
    var F = demoFrames(), state = { j: 62 };
    var row = controlsRow(root);
    slider(row, { label: '时刻', min: 0, max: DEMO.n - 1, step: 1, value: state.j, format: function (v) { return '第 ' + f2(v / DEMO.fps) + ' s'; }, onInput: function (v) { state.j = v; render(); } });
    var svg = sceneSvg('左边是重渲的 G1 和桌子，右边是学生相机的画面，下面是五个阶段的时间轴', '0 0 660 270');
    var wrap = el('div', 'demo-stage');
    wrap.appendChild(svg);
    root.appendChild(wrap);
    var bot = g1Mesh(svg, 'demoA'), cam = camAt(120, 10 + 215 * 120 / 170, 4 + 233 * 120 / 170);
    var ego = egoView(svg, 'egoA', 336, 24, 310);
    label(svg, 336, 24 + ego.h + 16, '学生相机（按代码的安装位置与内参重渲）', 'demo-x-mut', 10);
    var bar = stageBar(svg, 20, 238, 620, { h: 10 });
    var stats = statsRow(root);
    var sSt = stats.add('阶段'), sCmd = stats.add('HOMIE 命令'), sHand = stats.add('右手');
    var tb = table(root);
    note(root, ['阶段按代码的切换条件判：0→1 骨盆离桌上瓶子 < 0.45 m，1→2 手里瓶子离托盘 < 0.3 m，2→3 手掌离手里瓶子 > 0.2 m；3→4 的代码条件（右臂到「举起」姿态）这段示范不满足，按遥操作开始转向的 7.72 s 划；转过约 134° 算完成。',
      '默认停在第 3.72 s：开合原语刚从 1 变成 0（松手），学生画面里桌上的橙色瓶子约 16 像素宽（笔记「🚶 具体实例」例 6）。HOMIE 命令是遥操作时记下的，示范里存的命令在训练时并不用（RSI 只恢复状态）。']);
    function render() {
      var f = F[state.j], st = bar.put(f.t);
      bot.put(cam, state.j);
      ego.put(state.j);
      sSt.set(st + ' · ' + STAGES[st].zh, 'accent');
      sCmd.set('vx ' + sgn(f2(f.cmd[0])) + '、vy ' + sgn(f2(f.cmd[1])) + '、ωz ' + sgn(f2(f.cmd[2])));
      sHand.set(f.prim > 0.5 ? '握住（原语 1）' : '张开（原语 0）', f.prim > 0.5 ? 'good' : 'warn');
      tb.clear();
      tb.row(['阶段', '代码的条件', '此刻', '满足'], true);
      var vals = [[f2(f.dFront) + ' m', f.dFront < 0.45], [f2(f.dTray) + ' m', f.dTray < 0.3], [f2(f.dPalm) + ' m', f.dPalm > 0.2],
        ['离桌 ' + f2(Math.max(0, f.lift - 0.075)) + ' m', f.t >= STAGE_T[4]], ['转过 ' + Math.round(Math.abs(f.yaw - F[0].yaw) * 180 / Math.PI) + '°', f.t >= STAGE_T[5]]];
      STAGES.forEach(function (s, i) { tb.row([i + ' ' + s.zh, s.rule, vals[i][0], vals[i][1] ? '✓' : '—']); });
    }
    registerRenderer(render);
    render();

    /* 绝对 vs 增量动作的玩具 */
    var row2 = controlsRow(root);
    var mode = { v: 'both' };
    buttonGroup(row2, { label: '动作表示（玩具）', items: [{ label: '两种一起看', value: 'both' }, { label: '绝对动作', value: 'abs' }, { label: '增量动作', value: 'del' }], value: 'both', onPick: function (v) { mode.v = v; renderToy(); } });
    var seedS = slider(row2, { label: '噪声种子', min: 1, max: 20, step: 1, value: 3, onInput: function () { renderToy(); } });
    var st2 = stage(root, 200);
    var v2 = verdictBox(root);
    function renderToy() {
      var g = begin(st2), ctx = g.ctx, P = g.P, toy = toyCommand(100, seedS.get());
      var pl = K.plot(g, { l: 46, r: 14, t: 16, b: 30 }, [0, 2], [-0.6, 0.6]);
      line(ctx, [[pl.x0, pl.sy(0)], [pl.x1, pl.sy(0)]], P.grid, 1, [3, 3]);
      [-0.5, 0, 0.5].forEach(function (v) { text(ctx, String(v), pl.x0 - 6, pl.sy(v), P.text, 'right'); });
      text(ctx, '前 2 秒（100 步）', pl.x1, g.h - 10, P.text, 'right');
      if (mode.v !== 'del') line(ctx, toy.abs.map(function (v, i) { return [pl.sx(i * 0.02), pl.sy(v)]; }), P.bad, 1.6);
      if (mode.v !== 'abs') line(ctx, toy.del.map(function (v, i) { return [pl.sx(i * 0.02), pl.sy(v)]; }), P.good, 2.2);
      var dA = 0, dD = 0;
      for (var i = 1; i < 100; i++) { dA += Math.abs(toy.abs[i] - toy.abs[i - 1]); dD += Math.abs(toy.del[i] - toy.del[i - 1]); }
      v2.set('同一串噪声（标准差 0.5，表 5 的初始噪声），策略都想走 0.25 m/s（增量动作输出 2 × (0.25 − c)）：前进命令每步平均变化，绝对动作 ' + f3(dA / 99) + ' m/s，增量动作 ' + f3(dD / 99) + ' m/s。红线：绝对；绿线：增量。玩具，不是论文的实验。', 'good');
    }
    registerRenderer(renderToy);
    renderToy();
  }

  // ─── 演示 2：视觉随机化 ─────────────────────────────────────────────────────
  /* 照 legged_robot_base.py（torchvision v2.functional）的写法在浏览器里算：亮度 → 饱和度 → 色相 → 对比度 → 噪声 → 模糊 */
  function augPixels(src, o, seed) {
    var n = src.length, d = new Float32Array(n), i;
    for (i = 0; i < n; i++) d[i] = src[i] / 255;
    function gray(k) { return 0.2989 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]; }
    for (i = 0; i < n; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2];
      r = clamp(r * o.bright, 0, 1); g = clamp(g * o.bright, 0, 1); b = clamp(b * o.bright, 0, 1);
      var gr = 0.2989 * r + 0.587 * g + 0.114 * b;
      r = clamp(o.sat * r + (1 - o.sat) * gr, 0, 1); g = clamp(o.sat * g + (1 - o.sat) * gr, 0, 1); b = clamp(o.sat * b + (1 - o.sat) * gr, 0, 1);
      if (o.hue) {
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn, h = 0, s = mx > 1e-8 ? dd / mx : 0, v = mx;
        if (dd > 1e-8) { h = mx === r ? (g - b) / dd : mx === g ? 2 + (b - r) / dd : 4 + (r - g) / dd; h = ((h / 6) % 1 + 1) % 1; }
        h = ((h + o.hue) % 1 + 1) % 1;
        var k6 = Math.floor(h * 6) % 6, fr = h * 6 - Math.floor(h * 6), p = v * (1 - s), q = v * (1 - s * fr), tt = v * (1 - s * (1 - fr));
        var rgb = [[v, tt, p], [q, v, p], [p, v, tt], [p, q, v], [tt, p, v], [v, p, q]][k6];
        r = rgb[0]; g = rgb[1]; b = rgb[2];
      }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    if (o.con !== 1) {
      var mean = 0;
      for (i = 0; i < n; i += 4) mean += gray(i);
      mean /= n / 4;
      for (i = 0; i < n; i += 4) for (var c = 0; c < 3; c++) d[i + c] = clamp(o.con * d[i + c] + (1 - o.con) * mean, 0, 1);
    }
    if (o.noise > 0) for (i = 0; i < n; i += 4) for (var c2 = 0; c2 < 3; c2++) d[i + c2] = clamp(d[i + c2] + o.noise * gaussI(i + c2, seed || 1), 0, 1);
    if (o.blur) {
      var W = 192, H = 108, wy = [], sum = 0, k;
      for (k = -2; k <= 2; k++) { var w = Math.exp(-0.5 * (k / 1.5) * (k / 1.5)); wy.push(w); sum += w; }
      wy = wy.map(function (w) { return w / sum; });
      var out = new Float32Array(n);
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) for (var c3 = 0; c3 < 3; c3++) {
        var acc = 0;
        for (k = -2; k <= 2; k++) { var yy = Math.min(H - 1, Math.max(0, y + k)); acc += wy[k + 2] * d[(yy * W + x) * 4 + c3]; }
        out[(y * W + x) * 4 + c3] = acc;
      }
      for (i = 0; i < n; i += 4) { d[i] = out[i]; d[i + 1] = out[i + 1]; d[i + 2] = out[i + 2]; }
    }
    var res = new Uint8ClampedArray(n);
    for (i = 0; i < n; i++) res[i] = i % 4 === 3 ? 255 : Math.round(d[i] * 255);
    return res;
  }
  function buildRandomizeDemo(host) {
    var root = card(host, {
      title: '视觉随机化：同一帧学生画面，换材质、加增强、抖外参',
      sub: '画面是我们按代码的相机重渲的示范 A。材质与光照的八种是照代码类别做的示意；图像增强照官方 `legged_robot_base.py` 的顺序在浏览器里算；外参照代码的范围抽了 9 组。'
    });
    var o = { frame: 0, mat: 7, ext: 'none', bright: 1, con: 1, sat: 1, hue: 0, noise: 0, blur: false, seed: 1 };
    var imgs = {}, ready = 0;
    ['dr', 'ext'].forEach(function (k) { var im = new Image(); im.onload = function () { ready++; render(); }; im.src = G1_3D_BASE + EGO[k].file; imgs[k] = im; });
    var row1 = controlsRow(root);
    buttonGroup(row1, { label: '哪一帧', items: [{ label: '第 3.72 s：桌前要松手', value: 0 }, { label: '第 6.6 s：抓瓶子', value: 1 }], value: 0, onPick: function (v) { o.frame = v; render(); } });
    buttonGroup(row1, { label: '相机外参', items: [{ label: '原样', value: 'none' }, { label: '对齐前', value: 'noalign' }, { label: '随机一组', value: 'rand' }], value: 'none', onPick: function (v) { o.ext = v; if (v === 'rand') o.extK = (o.extK == null ? 0 : (o.extK + 1) % 9); render(); } });
    var row2 = controlsRow(root);
    buttonGroup(row2, { label: '地板与光照（示意）', items: DR_NAMES.map(function (n, i) { return { label: n, value: i }; }), value: 7, onPick: function (v) { o.mat = v; render(); } });
    var row3 = controlsRow(root);
    var sl = {
      bright: slider(row3, { label: '亮度', min: 0.7, max: 2, step: 0.01, value: 1, format: f2, onInput: function (v) { o.bright = v; render(); } }),
      con: slider(row3, { label: '对比度', min: 0.5, max: 1.5, step: 0.01, value: 1, format: f2, onInput: function (v) { o.con = v; render(); } }),
      sat: slider(row3, { label: '饱和度', min: 0.5, max: 2, step: 0.01, value: 1, format: f2, onInput: function (v) { o.sat = v; render(); } }),
      hue: slider(row3, { label: '色相', min: -0.1, max: 0.1, step: 0.005, value: 0, format: function (v) { return sgn(f3(v)); }, onInput: function (v) { o.hue = v; render(); } }),
      noise: slider(row3, { label: '噪声标准差', min: 0, max: 0.15, step: 0.005, value: 0, format: f3, onInput: function (v) { o.noise = v; render(); } })
    };
    var row4 = controlsRow(root);
    var blurBox = K.checkbox(row4, '模糊（代码里固定：纵向 σ = 1.5）', false, function (v) { o.blur = v; render(); });
    K.button(row4, '按代码的概率随机抽一次', function () {
      o.seed++;
      var r = function (k) { return rnd(o.seed * 13 + k, 77); };
      o.bright = r(1) < 0.25 ? 0.7 + 1.3 * r(2) : 1; o.sat = r(3) < 0.25 ? 0.5 + 1.5 * r(4) : 1; o.hue = r(5) < 0.5 ? -0.1 + 0.2 * r(6) : 0;
      o.con = r(7) < 0.25 ? 0.5 + r(8) : 1; o.noise = r(9) < 0.25 ? 0.15 * r(10) : 0; o.blur = r(11) < 0.25;
      sl.bright.set(o.bright, true); sl.sat.set(o.sat, true); sl.hue.set(o.hue, true); sl.con.set(o.con, true); sl.noise.set(o.noise, true); blurBox.checked = o.blur;
      render();
    });
    K.button(row4, '复原', function () {
      o.bright = 1; o.con = 1; o.sat = 1; o.hue = 0; o.noise = 0; o.blur = false;
      sl.bright.set(1, true); sl.con.set(1, true); sl.sat.set(1, true); sl.hue.set(0, true); sl.noise.set(0, true); blurBox.checked = false;
      render();
    });
    var box = el('div', 'demo-stage');
    var cv = document.createElement('canvas');
    cv.width = 192; cv.height = 108;
    cv.style.width = '100%'; cv.style.maxWidth = '576px'; cv.style.imageRendering = 'pixelated'; cv.style.display = 'block'; cv.style.margin = '0 auto';
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', '学生相机画面（108 × 192），按选择的随机化处理');
    box.appendChild(cv);
    root.appendChild(box);
    var verdict = verdictBox(root);
    note(root, ['图像增强的概率（表 7 / 代码）：亮度 0.25 U(0.7, 2)、饱和度 0.25 U(0.5, 2)、色相 0.5 U(−0.1, 0.1)、对比度 0.25 U(0.5, 1.5)、噪声 0.25 标准差 U(0, 0.15)、模糊 0.25。顺序照代码：亮度 → 饱和度 → 色相 → 对比度 → 噪声 → 模糊；代码里每一步对整批图只抽一次。',
      '「随机一组」的外参（dx、dy、dz 单位 m，横滚、俯仰、偏航单位 rad）是按代码的范围（x、z ±0.01 m，y ±0.05 m，横滚、偏航 ±0.05，俯仰 ±0.1）抽的 9 组之一；外参的两种画面用的是默认材质。']);
    function render() {
      if (ready < 2) return;
      var ctx = cv.getContext('2d'), src, k;
      if (o.ext === 'none') { src = imgs.dr; k = o.frame * 8 + o.mat; ctx.drawImage(src, (k % 8) * 192, Math.floor(k / 8) * 108, 192, 108, 0, 0, 192, 108); }
      else { src = imgs.ext; k = o.ext === 'noalign' ? 0 : 2 + (o.extK || 0); ctx.drawImage(src, k * 192, 0, 192, 108, 0, 0, 192, 108); }
      try {
        var im = ctx.getImageData(0, 0, 192, 108);
        im.data.set(augPixels(im.data, o, o.seed));
        ctx.putImageData(im, 0, 0);
      } catch (e) { /* file:// 下取不到像素：只显示原图 */ }
      var on = [];
      if (o.bright !== 1) on.push('亮度 ' + f2(o.bright)); if (o.sat !== 1) on.push('饱和度 ' + f2(o.sat)); if (o.hue) on.push('色相 ' + sgn(f3(o.hue)));
      if (o.con !== 1) on.push('对比度 ' + f2(o.con)); if (o.noise) on.push('噪声 ' + f3(o.noise)); if (o.blur) on.push('模糊');
      var extTxt = o.ext === 'none' ? '' : o.ext === 'noalign' ? '；外参：对齐前（不加 3.5 cm 偏移和 3.4° 转动）' : '；外参第 ' + ((o.extK || 0) + 1) + ' 组：' + EXT_DRAWS[o.extK || 0].map(function (v) { return sgn(fmt(v, 3)); }).join('、');
      verdict.set((on.length ? '生效的增强：' + on.join('、') : '没有图像增强') + extTxt + '。', on.length ? 'warn' : 'good');
    }
    registerRenderer(render);
  }

  // ─── 演示 3：论文结果 ──────────────────────────────────────────────────────
  function buildResultsDemo(host) {
    var root = card(host, {
      title: '论文结果：真机、消融与算力',
      sub: '选一张图看。图 7、11、13 是图上标的数；图 9、14、15、16 是从论文位图按颜色读出的近似值。'
    });
    var state = { view: 'fig7' };
    var row = controlsRow(root);
    buttonGroup(row, { label: '看哪张', items: [{ label: '图 7 真机', value: 'fig7' }, { label: '图 9 教师消融', value: 'fig9' }, { label: '图 11 DAgger 比例', value: 'fig11' },
      { label: '图 13 随机化消融', value: 'fig13' }, { label: '图 14 教师算力', value: 'fig14' }, { label: '图 15 学生算力', value: 'fig15' }, { label: '图 16 物体', value: 'fig16' }], value: 'fig7', onPick: function (v) { state.view = v; render(); } });
    var st = stage(root, 300);
    var verdict = verdictBox(root);
    var tb = table(root);
    function bars(g, cats, series, ymax, unit) {
      var ctx = g.ctx, P = g.P, n = cats.length, m = series.length, gw = (g.w - 50) / n, bw = Math.min(26, (gw - 12) / m), base = g.h - 40, top = 18 + m * 16;
      cats.forEach(function (c, i) {
        series.forEach(function (s2, k) {
          var v = s2.v[i], x = 40 + i * gw + (gw - bw * m) / 2 + k * bw, h = v / ymax * (base - top);
          ctx.fillStyle = s2.c(P); ctx.fillRect(x, base - h, bw - 2, h);
          if (m === 1) text(ctx, String(v) + (unit || ''), x + bw / 2, base - h - 8, P.text, 'center', '11px sans-serif');
        });
        text(ctx, c, 40 + i * gw + gw / 2, base + 14, P.text, 'center', gw < 60 ? '10px sans-serif' : '11px sans-serif');
      });
      line(ctx, [[34, base], [g.w - 8, base]], P.grid, 1);
      series.forEach(function (s2, k) { text(ctx, '■ ' + s2.zh, 14, 14 + k * 16, s2.c(P), 'left', 'bold 11px sans-serif'); });
    }
    function curves(g, xs, xmax, ylo, yhi, series, log, xlab) {
      var ctx = g.ctx, P = g.P, pl = K.plot(g, { l: 50, r: 16, t: 18 + series.length * 15, b: 30 }, [0, xmax], log ? [Math.log10(ylo), Math.log10(yhi)] : [ylo, yhi]);
      line(ctx, [[pl.x0, pl.y0], [pl.x1, pl.y0]], P.grid, 1); line(ctx, [[pl.x0, pl.y0], [pl.x0, pl.y1]], P.grid, 1);
      (log ? [0.1, 0.2, 0.4] : [ylo, (ylo + yhi) / 2, yhi]).forEach(function (v) { text(ctx, String(v), pl.x0 - 6, pl.sy(log ? Math.log10(v) : v), P.text, 'right'); });
      text(ctx, xlab, pl.x1, g.h - 10, P.text, 'right');
      series.forEach(function (s2, k) {
        var pts = [];
        s2.v.forEach(function (v, i) { if (v != null) pts.push([pl.sx(i * xs), pl.sy(log ? Math.log10(v) : v)]); });
        line(ctx, pts, s2.c(P), 2);
        text(ctx, '— ' + s2.zh, 14 + (k % 4) * 110, 12 + Math.floor(k / 4) * 15, s2.c(P), 'left', 'bold 11px sans-serif');
      });
    }
    var CP = { good: function (P) { return P.good; }, accent: function (P) { return P.accent; }, warn: function (P) { return P.warn; }, bad: function (P) { return P.bad; }, purple: function (P) { return P.purple; }, muted: function (P) { return P.text; } };
    function render() {
      var g = begin(st);
      tb.clear();
      if (state.view === 'fig7') {
        bars(g, FIG7.map(function (f) { return f.zh; }), [{ zh: '成功率 %', v: FIG7.map(function (f) { return f.succ; }), c: CP.warn }], 110, '%');
        tb.row(['', '成功率', '每轮用时'], true);
        FIG7.forEach(function (f) { tb.row([f.zh, f.succ + '%', f.cycle + ' s']); });
        verdict.set('VIRAL 连续 59 轮成功 54 轮（92%），每轮 20.2 s；专家 100%、21.4 s；新手 73%、47.0 s。接近专家的成功率，速度比专家快一点。', 'good');
      } else if (state.view === 'fig9') {
        curves(g, 0.5, 30, 0, 1, [{ zh: 'RSI + 增量动作', v: FIG9S.full, c: CP.good }, { zh: '去掉 RSI', v: FIG9S.noRSI, c: CP.warn }, { zh: '去掉增量动作', v: FIG9S.noDelta, c: CP.bad }], false, '千次迭代');
        tb.row(['', '最后的成功率', '最后的奖励'], true);
        [['RSI + 增量动作', '约 0.94', '约 650'], ['去掉 RSI', '约 0.02（最高约 0.07）', '约 480'], ['去掉增量动作', '0', '约 −60']].forEach(function (r) { tb.row(r); });
        verdict.set('两样缺一不可：去掉 RSI 奖励还在涨、成功率却停在 10% 以下；去掉增量动作什么都学不会。', 'good');
      } else if (state.view === 'fig11') {
        bars(g, FIG11.map(function (f) { return 'α = ' + f[0]; }), [{ zh: '成功率', v: FIG11.map(function (f) { return f[1]; }), c: CP.purple }], 1.15, '');
        tb.row(['教师开的比例 α', '成功率'], true);
        FIG11.forEach(function (f) { tb.row([String(f[0]), f2(f[1])]); });
        verdict.set('纯行为克隆（α = 1）的蒸馏损失最低，部署成功率却是 0；α = 0.25、0.5 都是 1.0，默认 0.5。', 'warn');
      } else if (state.view === 'fig13') {
        bars(g, FIG13.map(function (f) { return f[0]; }), [{ zh: '归一化成功率', v: FIG13.map(function (f) { return f[1]; }), c: CP.accent }], 1.1, '');
        tb.row(['训练时', '归一化成功率', '降了'], true);
        FIG13.forEach(function (f) { tb.row([f[0], fmt(f[1], 3), f[1] < 1 ? fmt((1 - f[1]) * 100, 1) + '%' : '—']); });
        verdict.set('评测时全开随机化。全都不随机降 35.1%；去掉外参降得最多（10.7%）；去掉任何一类都会降。', 'good');
      } else if (state.view === 'fig14') {
        curves(g, 0.1, 10, 0, 1, G14.map(function (r, i) { return { zh: r[0] + ' 张 GPU', v: FIG14[r[1]], c: [CP.good, CP.accent, CP.purple, CP.warn, CP.bad][i] }; }), false, '墙钟小时');
        tb.row(['GPU', '到 0.8 成功率', '10 小时时'], true);
        [['16', '约 2.1 h', '约 0.95'], ['8', '约 2.4 h', '约 0.93'], ['4', '约 4.6 h', '约 0.77'], ['2', '到不了', '约 0.3'], ['1', '到不了', '约 0.3']].forEach(function (r) { tb.row(r); });
        verdict.set('教师：GPU 多不只更快，上限也更高；1–2 张 10 小时只有约 0.3。', 'good');
      } else if (state.view === 'fig15') {
        curves(g, 0.5, 50, 0.08, 0.5, G15.map(function (r, i) { return { zh: r[0] + ' 张 GPU', v: FIG15[r[1]], c: [CP.good, CP.accent, CP.purple, CP.warn, CP.bad][i] }; }), true, '墙钟小时（纵轴对数）');
        tb.row(['GPU', '蒸馏损失降到 0.2', '50 h 时'], true);
        [['64', '约 8.5 h', '约 0.097'], ['32', '约 9.5 h', '约 0.10'], ['16', '约 11.5 h', '约 0.11'], ['8', '约 12 h', '约 0.12'], ['4', '约 17 h', '约 0.14'], ['2', '约 25.5 h', '（被图例挡住）'], ['1', '35 h 以上', '（被图例挡住）']].forEach(function (r) { tb.row(r); });
        verdict.set('学生：64 张比 1 张降到 0.2 快 4 倍多；最后的成功率都在 0.85–0.88，GPU 多的更平滑。', 'good');
      } else {
        bars(g, FIG16.map(function (f) { return f[0]; }), [{ zh: '训 10 种物体', v: FIG16.map(function (f) { return f[1]; }), c: CP.accent }, { zh: '只训圆柱', v: FIG16.map(function (f) { return f[2]; }), c: CP.muted }], 1.1, '');
        tb.row(['物体', '训 10 种', '只训圆柱'], true);
        FIG16.forEach(function (f) { tb.row([f[0], f2(f[1]), f2(f[2])]); });
        verdict.set('仿真里的抓取子任务（教师），按圆柱归一化：多物体训练每一类都更好；只训圆柱，换成杯子只有约 0.05。', 'good');
      }
    }
    registerRenderer(render);
    render();
  }

  K.mount({
    'viral-explainer': buildExplainerDemo,
    'viral-video': buildVideoDemo,
    'viral-replay': buildReplayDemo,
    'viral-randomize': buildRandomizeDemo,
    'viral-results': buildResultsDemo
  });
})();
