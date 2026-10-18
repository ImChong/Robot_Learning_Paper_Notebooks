/* Interactive HOVER demos for
 * papers/03_High_Impact_Selection/HOVER_Versatile_Neural_Whole-Body_Controller
 * （He, Xiao, Lin, Luo, Xu, Jiang, Kautz, Liu, Shi, Wang, Fan, Zhu · HOVER: Versatile Neural Whole-Body Controller for
 *   Humanoid Robots · arXiv 2410.21229 v2，ICRA 2025；代码 NVlabs/HOVER，Isaac Lab 版）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["hover"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   hover-explainer — 十六幕讲解动画：每篇一套接口 → 共同的底座：全身模仿 → 一个命令空间：三种目标 → 前人的接口都是子集（表 I）→
 *                     数据：AMASS 重定向到 H1 → 特权教师：全都看、全都跟 → 学生的本体感受：25 步历史 → 模式掩码：上下身各挑一种 →
 *                     稀疏掩码：再关掉一部分 → DAgger：学生开车，老师标答案 → 表 III：和四个专才比 → 表 IV：只跟一只手或头 →
 *                     图 4：从头强化学习不行 → 真机：表 V 与图 5 → 边走边切模式 → 局限与代码
 *   hover-video     — 同一套十六幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   hover-mask      — 掩码浏览器：一段 H1 走路逐帧看，选模式、开稀疏掩码，看 49 位掩码、95 维命令与学生的 1782 维观测
 *   hover-radar     — 图 3 与图 4 的雷达图：每种模式下 HOVER 对专才 / 对多模式强化学习
 *   hover-tables    — 表 III、表 IV、表 V
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
  /* 论文的图（arXiv 2410.21229 的图 1–6）与项目页视频的片段放在 assets/img/papers/hover/；
     H1 与 SMPL 的 3D 逐帧贴图（同一段重定向、同一台正交相机）在 assets/img/papers/hover/h1_3d/ */
  var IMG_BASE = assetBase('../../img/papers/');
  var PAPER_IMG_BASE = IMG_BASE ? IMG_BASE + 'hover/' : '';
  var CLIP_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'clips/' : '';
  var H1_3D_BASE = IMG_BASE ? IMG_BASE + 'hover/h1_3d/' : '';
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

  // ─── 论文里的数字（arXiv 2410.21229 v2 的正文、表 I–V、图 3–4；与 v1 相同） ─────────
  /* 表 III：仿真里在 Q̂ 上，同一个 HOVER 套上固定掩码 vs 为这种模式专门用强化学习训的专才（5 个种子）。
     12 项依次是 [存活 %, 全局 MPJPE mm, MPJPE mm, 加速度 mm/帧², 速度 mm/帧, 上身关节 rad, 下身关节 rad,
     根部速度 m/s, 根部高度 m, 横滚 rad, 俯仰 rad, 偏航 rad]；bold 是加粗（显著更好）的下标，track 是这种模式真正在跟的指标 */
  var T3_METRICS = ['存活', '$E_{\\text{g-mpjpe}}$', '$E_{\\text{mpjpe}}$', '$E_{\\text{acc}}$', '$E_{\\text{vel}}$', '$E_{\\text{upper-j}}$',
    '$E_{\\text{lower-j}}$', '$E_{\\text{root-vel}}$', '$E_{\\text{root-h}}$', '$E_{\\text{root-r}}$', '$E_{\\text{root-p}}$', '$E_{\\text{root-y}}$'];
  var T3_ORACLE = [99.3, 119, 59.4, 2.63, 5.43, 0.153, 0.206, 0.456, 0.066, 0.065, 0.083, 0.282];
  var TABLE3 = [
    { key: 'exbody', zh: 'ExBody', spec: [99.1, 275, 83.1, 2.63, 6.31, 0.166, 0.243, 0.428, 0.074, 0.070, 0.147, 0.276],
      hover: [99.1, 185, 63.9, 3.01, 6.06, 0.148, 0.210, 0.452, 0.063, 0.068, 0.091, 0.279], boldS: [3, 7], boldH: [1, 2, 4, 5, 6, 8, 10], track: [5, 7, 8, 9, 10, 11] },
    { key: 'humanplus', zh: 'HumanPlus', spec: [98.4, 266, 80.1, 2.53, 6.16, 0.177, 0.222, 0.422, 0.061, 0.080, 0.124, 0.228],
      hover: [98.9, 182, 64.5, 2.85, 5.91, 0.145, 0.211, 0.455, 0.067, 0.069, 0.104, 0.237], boldS: [3, 7, 8], boldH: [1, 2, 4, 5, 6, 9, 10], track: [5, 6, 7, 8, 9, 10, 11] },
    { key: 'h2o', zh: 'H2O', spec: [99.2, 137, 66.3, 2.63, 5.75, 0.177, 0.221, 0.457, 0.078, 0.067, 0.095, 0.415],
      hover: [98.9, 121, 60.6, 2.73, 5.49, 0.158, 0.207, 0.456, 0.065, 0.067, 0.086, 0.365], boldS: [3], boldH: [1, 2, 4, 5, 6, 8, 10, 11], track: [0, 1, 2, 3, 4] },
    { key: 'omnih2o', zh: 'OmniH2O', spec: [99.0, 149, 76.4, 2.69, 6.18, 0.199, 0.232, 0.456, 0.071, 0.070, 0.125, 0.306],
      hover: [99.0, 128, 62.5, 2.69, 5.65, 0.162, 0.213, 0.457, 0.065, 0.068, 0.089, 0.310], boldS: [11], boldH: [1, 2, 4, 5, 6, 8, 10], track: [0, 1, 2, 3, 4] }
  ];
  /* 表 IV：只报这种模式在跟的点的 [全局 MPJPE, MPJPE, 加速度, 速度] */
  var T4_METRICS = ['$E_{\\text{g-mpjpe-mode}}$', '$E_{\\text{mpjpe-mode}}$', '$E_{\\text{acc-mode}}$', '$E_{\\text{vel-mode}}$'];
  var TABLE4 = [
    { zh: '左手', spec: [189, 147, 5.82, 11.2], hover: [138, 151, 5.45, 10.3], boldS: [1], boldH: [0, 2, 3] },
    { zh: '右手', spec: [220, 216, 6.77, 12.5], hover: [128, 141, 5.83, 10.8], boldS: [], boldH: [0, 1, 2, 3] },
    { zh: '双手', spec: [137, 145, 5.72, 11.2], hover: [120, 119, 5.60, 10.1], boldS: [], boldH: [0, 1, 2, 3] },
    { zh: '头', spec: [186, 104, 2.22, 6.63], hover: [133, 80.0, 2.31, 6.40], boldS: [2], boldH: [0, 1, 3] }
  ];
  /* 表 V：真机上 20 段站立动作（每种设置测 5 次），[全局 MPJPE, MPJPE, 上身关节, 根部 RPY] */
  var T5_METRICS = ['$E_{\\text{g-mpjpe}}$', '$E_{\\text{mpjpe}}$', '$E_{\\text{upper-j}}$', '$E_{\\text{root-rpy}}$'];
  var TABLE5 = [
    { zh: 'ExBody', spec: [51.3, 39.3, 0.131, 0.036], hover: [48.9, 36.8, 0.126, 0.032], boldS: [], boldH: [0, 1, 2, 3] },
    { zh: 'HumanPlus', spec: [51.0, 36.7, 0.128, 0.035], hover: [47.4, 35.3, 0.121, 0.038], boldS: [3], boldH: [0, 1, 2] },
    { zh: 'OmniH2O', spec: [51.2, 42.1, 0.153, 0.040], hover: [47.5, 41.0, 0.145, 0.037], boldS: [], boldH: [0, 1, 2, 3] }
  ];
  /* 图 3（雷达图上标的数）：六个轴 [上身关节, 局部位置, 全局位置, 根部旋转, 根部速度, 下身关节]；根部旋转是横滚、俯仰、偏航的平均
     （OmniH2O 专才图上写 0.250，按表 III 平均是 0.167，图表对不上，见笔记） */
  var FIG3_AXES = ['上身关节', '局部位置', '全局位置', '根部旋转', '根部速度', '下身关节'];
  var FIG3 = [
    { zh: 'ExBody', hover: [0.148, 63.9, 185.0, 0.146, 0.452, 0.210], other: [0.166, 83.1, 275.1, 0.164, 0.428, 0.243] },
    { zh: 'HumanPlus', hover: [0.145, 64.5, 181.7, 0.136, 0.455, 0.211], other: [0.177, 80.1, 266.1, 0.144, 0.422, 0.222] },
    { zh: 'H2O', hover: [0.158, 60.6, 120.8, 0.172, 0.456, 0.207], other: [0.177, 66.2, 137.5, 0.192, 0.457, 0.222] },
    { zh: 'OmniH2O', hover: [0.162, 62.5, 128.4, 0.155, 0.457, 0.213], other: [0.199, 76.4, 149.3, 0.250, 0.456, 0.232] }
  ];
  /* 图 4（雷达图上标的数）：8 种模式 × [根部 RPY rad, 上身关节 rad, 局部位置 mm, 全局位置 mm]，HOVER 与多模式强化学习 */
  var FIG4_AXES = ['根部 RPY', '上身关节', '局部位置', '全局位置'];
  var FIG4 = [
    { zh: 'H2O', hover: [0.17, 0.16, 60.6, 121], other: [0.21, 0.18, 69.13, 138] },
    { zh: 'ExBody', hover: [0.15, 0.15, 63.9, 185], other: [0.15, 0.16, 79.79, 220] },
    { zh: '双手', hover: [0.30, 0.17, 76.3, 156], other: [0.40, 0.23, 100, 295] },
    { zh: '右手', hover: [0.34, 0.25, 100, 191], other: [0.43, 0.29, 120, 374] },
    { zh: '左手', hover: [0.35, 0.25, 104, 204], other: [0.40, 0.29, 121, 350] },
    { zh: 'OmniH2O', hover: [0.16, 0.16, 62.5, 128], other: [0.22, 0.2, 80.4, 198] },
    { zh: 'HumanPlus', hover: [0.14, 0.15, 64.5, 182], other: [0.14, 0.16, 79.0, 211] },
    { zh: '头', hover: [0.14, 0.33, 104, 171], other: [0.22, 0.34, 108, 249] }
  ];
  /* 论文的缩放：(E^max − E) / (E^max − E^min)，网越大越好。最大、最小在什么范围里取论文没说；这里按一张图里同一个轴的全部数取（我们的理解） */
  function radarScale(v, lo, hi) { return hi > lo ? (hi - v) / (hi - lo) : 0.5; }
  function axisRange(rows, j) {
    var all = []; rows.forEach(function (r) { all.push(r.hover[j], r.other[j]); });
    return [Math.min.apply(null, all), Math.max.apply(null, all)];
  }
  /* 表 I：前人工作各占命令空间的哪几格 [多模式, 上身关键点, 上身关节角, 下身关键点, 下身关节角, 下身根部] */
  var TABLE1 = [
    { zh: 'ExBody', v: [0, 0, 1, 0, 0, 1] },
    { zh: 'H2O', v: [0, 1, 0, 1, 0, 0] },
    { zh: 'OmniH2O', v: [0, 1, 0, 0, 0, 0] },
    { zh: 'HumanPlus', v: [0, 0, 1, 0, 1, 1] },
    { zh: 'MHC', v: [1, 0, 1, 0, 1, 1] },
    { zh: 'HOVER', v: [1, 1, 1, 1, 1, 1] }
  ];
  /* 表 II：教师的奖励（惩罚 4、正则 12、任务 8） */
  var REWARD = {
    penalty: [['力矩越限', -2], ['关节位置越限', -125], ['终止', -250], ['关节速度越限', -50]],
    reg: [['关节加速度', -1.1e-5], ['关节速度', -4e-3], ['下身动作变化率', -3], ['上身动作变化率', -0.625], ['力矩', -1e-4], ['脚的朝向', -62.5],
      ['腾空时间', 1000], ['足底接触力', -0.75], ['绊脚', -1250], ['打滑', -75], ['双脚腾空', -200], ['每一步的最高抬脚', -3000]],
    task: [['关节位置', 32], ['关节速度', 16], ['刚体位置', 80], ['刚体旋转', 20], ['刚体速度', 8], ['刚体角速度', 8], ['根部速度', 100], ['根部旋转', 20]]
  };
  /* 真机：19 个自由度的 Unitree H1，约 51.5 kg、1.8 m；20 段站立动作 */
  var H1_HW = { dof: 19, kg: 51.5, m: 1.8, standing: 20 };
  /* LaTeX 源码里注释掉的一行：(2^12 + 2^9) × (2^11 + 2^10 + 2^7) 种模式 */
  var COUNT = { upKin: 12, upJnt: 9, loKin: 11, loJnt: 10, root: 7 };
  function modeCount() {
    return (Math.pow(2, COUNT.upKin) + Math.pow(2, COUNT.upJnt)) * (Math.pow(2, COUNT.loKin) + Math.pow(2, COUNT.loJnt) + Math.pow(2, COUNT.root));
  }
  /* 官方 README 的训练时长（RTX 4090）：教师 10 万次 × 0.84 s，学生 1 万次 × 0.097 s */
  var TRAIN = { teachIter: 100000, teachSec: 0.84, stuIter: 10000, stuSec: 0.097 };

  // ─── 官方代码里的命令空间（neural_wbc/core/mask.py、student_observations.py、neural_wbc_env_cfg_h1.py） ──
  /* 23 个刚体：20 个连杆 + 左手（左肘往前 0.3 m）+ 右手 + 头（骨盆往上 0.75 m）；19 个关节；7 个根部量。
     命令 95 维 = 23 × 3 + 19 + 7，掩码 49 位 = 23 + 19 + 7 */
  var BODY_ZH = ['骨盆', '左髋偏航', '左髋横滚', '左髋俯仰', '左膝', '左踝', '右髋偏航', '右髋横滚', '右髋俯仰', '右膝', '右踝', '躯干',
    '左肩俯仰', '左肩横滚', '左肩偏航', '左肘', '右肩俯仰', '右肩横滚', '右肩偏航', '右肘', '左手', '右手', '头'];
  var JOINT_ZH = ['左髋偏航', '左髋横滚', '左髋俯仰', '左膝', '左踝', '右髋偏航', '右髋横滚', '右髋俯仰', '右膝', '右踝', '躯干',
    '左肩俯仰', '左肩横滚', '左肩偏航', '左肘', '右肩俯仰', '右肩横滚', '右肩偏航', '右肘'];
  var ROOT_ZH = ['根部速度 x', '根部速度 y', '根部速度 z', '横滚', '俯仰', '偏航之差', '根部高度'];
  var NB = 23, NJ = 19, NR = 7, NBIT = NB + NJ + NR, NCMD = 3 * NB + NJ + NR; // 49, 95
  /* 学生的观测：一步本体感受 44（关节位置 19 + 速度 19 + 根角速度 3 + 投影重力 3）+ 命令 95 + 掩码 49 + 上一步动作 19 + 25 步历史 × 63 */
  var STU = { prop: 44, cmd: NCMD, mask: NBIT, act: 19, hist: 25, per: 63 };
  var STU_DIM = STU.prop + STU.cmd + STU.mask + STU.act + STU.hist * STU.per; // 1782
  var TEACH_DIM = 913, CRITIC_DIM = 990, OMNI_STU_DIM = 1665;
  function range(a, b) { var r = []; for (var i = a; i < b; i++) r.push(i); return r; }
  /* 掩码的位：第 0–22 位刚体，第 23–41 位关节角，第 42–48 位根部 */
  function jbit(j) { return NB + j; }
  var ROOT_BITS = range(NB + NJ, NBIT);
  /* 官方代码的四种模式（DISTILL_MASK_MODES_ALL，按正则匹配掩码元素的名字）。H2O 的 .*shoulder.*link.* 会匹配每侧三个肩部连杆，所以是 12 个点 */
  var MODES = [
    { key: 'exbody', zh: 'ExBody', desc: '上身关节角 + 根部', bits: range(NB + 10, NB + NJ).concat(ROOT_BITS) },
    { key: 'humanplus', zh: 'HumanPlus', desc: '全身关节角 + 根部', bits: range(NB, NBIT) },
    { key: 'h2o', zh: 'H2O', desc: '12 个关键点（论文写 8 个）', bits: [5, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] },
    { key: 'omnih2o', zh: 'OmniH2O', desc: '头和双手 3 个点', bits: [20, 21, 22] }
  ];
  function modeOf(key) { return MODES.filter(function (m) { return m.key === key; })[0]; }
  /* 论文的模式掩码：上下身 × 三种目标的五个开关（下身才有根部）；LaTeX 注释里的计数按这个分法 */
  var CELLS = [
    { key: 'upKin', zh: '上身 · 关键点', kind: 'kin', bits: range(11, 23) },
    { key: 'upJnt', zh: '上身 · 关节角', kind: 'jnt', bits: range(NB + 10, NB + NJ) },
    { key: 'loKin', zh: '下身 · 关键点', kind: 'kin', bits: range(0, 11) },
    { key: 'loJnt', zh: '下身 · 关节角', kind: 'jnt', bits: range(NB, NB + 10) },
    { key: 'loRoot', zh: '下身 · 根部', kind: 'root', bits: ROOT_BITS }
  ];
  function maskFrom(bits) {
    var m = []; for (var i = 0; i < NBIT; i++) m.push(0);
    bits.forEach(function (b) { m[b] = 1; });
    return m;
  }
  function maskCount(m) { return m.reduce(function (a, b) { return a + b; }, 0); }
  function cellsMask(on) {
    var bits = []; CELLS.forEach(function (c, i) { if (on[i]) bits = bits.concat(c.bits); });
    return maskFrom(bits);
  }
  /* 稀疏掩码：打开的每一位以 0.5 的概率保留（mask.py 的 torch.bernoulli(mask * 0.5)）；rng 用 kit 的确定性随机数 */
  function sparsify(m, rng) { return m.map(function (b) { return b && rng() < 0.5 ? 1 : 0; }); }
  /* 论文图 2 的例子：上身跟关键点，下身跟关节角和根部 */
  var FIG2_EXAMPLE = [1, 0, 0, 1, 1];
  /* 论文的稀疏例子：上身只跟两只手的位置，下身只跟躯干的关节角 */
  var SPARSE_EXAMPLE = maskFrom([20, 21, jbit(10)]);

  // ─── 本笔记的复现数据：用官方 human2humanoid 的两个脚本，以 SMPL 在 AMASS CMU 07_01 上重算的走路 ─────────
  /* grad_fit_h1_shape.py 先拟合 SMPL 的形状 β′（14 对点，Adam 1000 步），grad_fit_h1.py 再逐帧解关节角（11 对点，Adadelta 500 步）；
     我们用这两个脚本在 AMASS（SMPL+H G）的 07_01 上跑的，不是论文的数据。
     第 0–2.6 s，15 fps 共 40 帧。每帧 166 个小端 int16：根部位置 3（mm）、横滚俯仰偏航 3（mrad，外旋 xyz）、19 个关节角（mrad）、
     23 个刚体（mm；用官方仓库 neural_wbc/data/data/mujoco/models/h1.xml 做正运动学，手 = 肘 + (0.3, 0, 0)、头 = 骨盆 + (0, 0, 0.75)）、
     拟合后的 SMPL 的 24 个关节（mm，顺序见 HJ；和 H1 一起按官方抬高到离地 0.08 m）。第 0 帧的骨盆挪到原点、偏航转成 0 */
  var WALK = { clip: '07_01', fps: 15, n: 40, per: 166, data: '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' };
  /* 贴图表：R 像素/米，yaw / pitch 是正交相机，cw × ch 一格，(ax, ay) 是 H1 根部正下方地面点在格子里的位置。
     H1 的材质与光照照抄 Robot Retarget Online；SMPL 两张：形状参数 β = 0 的平均身材（只为对比，整段挪到贴地）与拟合后的 β′（和关节同一套坐标） */
  var SHEET = { file: 'h1_walk_amass.webp', R: 220, yaw: 1.1, pitch: 0.1, cw: 188, ch: 422, cols: 12, n: 40, ax: 93, ay: 408 };
  var SMPL_SHEET = { beta0: 'smpl_beta0.webp', fit: 'smpl_fit.webp', R: 220, yaw: 1.1, pitch: 0.1, cw: 200, ch: 470, cols: 12, n: 40, ax: 88, ay: 458 };
  var HJ = ['Pelvis', 'L_Hip', 'R_Hip', 'Torso', 'L_Knee', 'R_Knee', 'Spine', 'L_Ankle', 'R_Ankle', 'Chest', 'L_Toe', 'R_Toe', 'Neck',
    'L_Thorax', 'R_Thorax', 'Head', 'L_Shoulder', 'R_Shoulder', 'L_Elbow', 'R_Elbow', 'L_Wrist', 'R_Wrist', 'L_Hand', 'R_Hand'];
  function hj(name) { return HJ.indexOf(name); }
  /* 官方 grad_fit_h1.py 的 11 对点：[23 个刚体里的下标, SMPL 关节下标] */
  var PAIRS = [[0, 0], [4, 4], [5, 7], [9, 5], [10, 8], [13, 16], [15, 18], [20, 22], [17, 17], [19, 19], [21, 23]];
  function decode(b64) {
    var bin = atob(b64), n = bin.length >> 1, out = new Int16Array(n);
    for (var i = 0; i < n; i++) out[i] = (bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8)) << 16 >> 16;
    return out;
  }
  var RAW = null;
  function raw() { if (!RAW) RAW = decode(WALK.data); return RAW; }
  function pts(a, o, n) {
    var r = [];
    for (var j = 0; j < n; j++) r.push([a[o + 3 * j] / 1000, a[o + 3 * j + 1] / 1000, a[o + 3 * j + 2] / 1000]);
    return r;
  }
  var FRAMES = [];
  function frame(i) {
    var k = clamp(Math.round(i), 0, WALK.n - 1);
    if (!FRAMES[k]) {
      var a = raw(), o = k * WALK.per, dof = [];
      for (var j = 0; j < NJ; j++) dof.push(a[o + 6 + j] / 1000);
      FRAMES[k] = { k: k, root: [a[o] / 1000, a[o + 1] / 1000, a[o + 2] / 1000], rpy: [a[o + 3] / 1000, a[o + 4] / 1000, a[o + 5] / 1000],
        dof: dof, pts: pts(a, o + 25, NB), hum: pts(a, o + 25 + 3 * NB, 24) };
    }
    return FRAMES[k];
  }
  function sub3(p, q) { return [p[0] - q[0], p[1] - q[1], p[2] - q[2]]; }
  /* 骨盆的世界速度（15 fps 的中心差分，两端用单侧差分） */
  function pelvisVel(k) {
    var a = clamp(k - 1, 0, WALK.n - 2), b = clamp(k + 1, 1, WALK.n - 1);
    return sub3(frame(b).pts[0], frame(a).pts[0]).map(function (v) { return v * WALK.fps / (b - a); });
  }
  /* 外旋 xyz 的旋转矩阵 R = Rz · Ry · Rx（和数据的横滚俯仰偏航一致） */
  function rotXYZ(rpy) {
    var cr = Math.cos(rpy[0]), sr = Math.sin(rpy[0]), cp = Math.cos(rpy[1]), sp = Math.sin(rpy[1]), cy = Math.cos(rpy[2]), sy = Math.sin(rpy[2]);
    return [[cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr], [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr], [-sp, cp * sr, cp * cr]];
  }
  /* 95 维命令（照官方 student_observations.py）：参考取第 kref 帧，机器人在第 kref − lag 帧。
     关键点 = 参考的 23 个点减机器人的根部，转到机器人只转偏航的朝向坐标系；关节角 = 参考 − 当前；
     根部 = 参考的根部线速度（转到参考的根部坐标系）、参考的横滚、俯仰、偏航之差、参考的根部高度 */
  function command(kref, lag) {
    var kr = clamp(kref, 1, WALK.n - 2), ref = frame(kr), rob = frame(Math.max(0, kr - lag));
    var r0 = rob.pts[0], c = Math.cos(rob.rpy[2]), s = Math.sin(rob.rpy[2]);
    var kin = ref.pts.map(function (p) { var d = sub3(p, r0); return [c * d[0] + s * d[1], -s * d[0] + c * d[1], d[2]]; });
    var joint = ref.dof.map(function (q, j) { return q - rob.dof[j]; });
    var v = sub3(frame(kr + 1).pts[0], frame(kr - 1).pts[0]).map(function (x) { return x * WALK.fps / 2; });
    var R = rotXYZ(ref.rpy);
    var vloc = [0, 1, 2].map(function (i) { return R[0][i] * v[0] + R[1][i] * v[1] + R[2][i] * v[2]; });
    var root = vloc.concat([ref.rpy[0], ref.rpy[1], ref.rpy[2] - rob.rpy[2], ref.pts[0][2]]);
    var flat = []; kin.forEach(function (p) { flat.push(p[0], p[1], p[2]); });
    return { kref: kr, lag: lag, kin: kin, joint: joint, root: root, flat: flat.concat(joint, root) };
  }
  /* 命令乘掩码：每个刚体的一位管它的 x、y、z 三维 */
  function maskCommand(cmd, m) {
    return cmd.flat.map(function (v, i) {
      var bit = i < 3 * NB ? Math.floor(i / 3) : i - 2 * NB;
      return m[bit] ? v : 0;
    });
  }
  /* 「🚶 具体实例」例 2 / 例 3：第 1.33 s（第 20 帧）的参考，机器人落后 0.2 s（3 帧，假设） */
  var EX_K = 20, EX_LAG = 3;

  // ─── 讲解动画：十六幕 ───────────────────────────────────────────────────────
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
  /* 全片统一照论文图 1 的配色：关键点位置蓝、关节角黄、根部紫；HOVER 绿；人的骨架灰 */
  var C_KIN = C_ACCENT, C_JNT = C_WARN, C_ROOT = C_PURPLE, C_HOVER = C_GOOD, C_HUMAN = C_MUTED;
  function kindColor(kind) { return kind === 'kin' ? C_KIN : kind === 'jnt' ? C_JNT : C_ROOT; }
  function bitColor(b) { return b < NB ? C_KIN : b < NB + NJ ? C_JNT : C_ROOT; }

  /* 视频里一幕要讲一分钟左右，画面不能停：draw(t, clock) 的 clock 是这一幕的真实时间
     （旁白比分镜长时 t 停在一段的末尾，clock 照走），H1 的走路、掩码的回合按 clock 播；网页播放器只传 t。
     各幕的 cue 时刻都落在 0.4 / 3.6 / 7.0 / 10.4 / 13.4，一次性的出场动画不跨过这些时刻。 */
  function nowOf(t, clock) {
    return clock == null ? t : clock;
  }
  /* 一段窗口：a 之后 0.3 s 起淡入 0.4 s，到 b 才开始淡出 0.3 s（先淡出再淡入，两层字不交叉）。
     淡出必须落在 b 之后：视频里旁白比分镜长时，stage.html 把 t 停在 b 前一点（AGENTS.md「面板到 cue 之后才淡出」） */
  function win(t, a, b) {
    return seg(t, a + 0.3, a + 0.7) * (b == null ? 1 : 1 - seg(t, b, b + 0.3));
  }
  /* 一幕里从 cue 起算的真实秒数：网页上就是 t − cue；视频里旁白比分镜长时 t 会停，回合、片段改按 clock 走 */
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
  function ring(parent, cx, cy, rx, ry, color) {
    var e = paint(svgEl('ellipse', { cx: cx, cy: cy, rx: rx, ry: ry || rx, fill: 'none', 'stroke-width': 2.2 }), null, color);
    parent.appendChild(e);
    return e;
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
    fig1: ['fig1_command.webp', 1170, 1246],
    fig2: ['fig2_distill.webp', 1767, 395],
    fig3: ['fig3_radar.webp', 1275, 1100],
    fig4: ['fig4_radar.webp', 1183, 1097],
    fig5: ['fig5_real.webp', 1739, 549]
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
    /* 一个镜头里并排几台机器人、各跑一种模式时，在片段正下方逐台标出模式（不压在片段上） */
    (o.labels || []).forEach(function (t, i, all) { label(g, x + w * (i + 0.5) / all.length, y + h + 15, t, 'demo-x-ink2', 10.5, 'middle'); });
    if (caption) label(g, o.capX == null ? x + w / 2 : o.capX, y + h + (o.capDy || (o.labels ? 33 : 17)), caption, 'demo-x-mut', o.capSize || 9.5, o.capAnchor || 'middle');
    return { g: g, x: x, y: y, w: w, h: h, at: function (sec, vis) { c.at(sec, vis); } };
  }
  /* 片段的时长（秒）：切模式的时刻按片段时间算，循环播放时取余 */
  var CLIP_DUR = { sw_walk: 15.04, sw_turn: 11.76, sw_pitch: 17.32, vr_two: 13.4, vr_left: 8.84, sim_modes: 8.7, sim_hands: 8.7, group: 8.0 };
  /* 项目页切模式视频里字幕换掉的时刻（逐帧比对右侧字幕区量出来的） */
  var SWITCH_AT = { sw_walk: 8.4, sw_turn: 4.8, sw_pitch: 4.2 };
  /* 三维 → 画布：z 朝上；绕竖轴转 yaw、抬头 pitch 的正交投影。cam = { yaw, pitch, s(像素/米), ox, oy, cx, cy }：
     (cx, cy) 是地面上对准画布 (ox, oy) 的那一点。H1 的贴图是同一套相机离线渲染的 */
  function project(p, cam) {
    var dx = p[0] - (cam.cx || 0), dy = p[1] - (cam.cy || 0);
    var c = Math.cos(cam.yaw || 0), s = Math.sin(cam.yaw || 0);
    var xr = dx * c + dy * s, depth = -dx * s + dy * c;
    var cp = Math.cos(cam.pitch || 0), sp = Math.sin(cam.pitch || 0);
    return [cam.ox + cam.s * xr, cam.oy - cam.s * (p[2] * cp + depth * sp), depth];
  }
  /* 相机跟着根部走：H1 一直站在 (ox, oy)，地上的刻度往后退 */
  function followCam(f, s, ox, oy) {
    return { yaw: SHEET.yaw, pitch: SHEET.pitch, s: s, ox: ox, oy: oy, cx: f.root[0], cy: f.root[1] };
  }
  /* 一台 H1：贴图表里的一格；put(root, cam, 帧号) 摆到根部正下方的地面点。贴图第一次用到才设 href。
     opts.sheet / opts.file 换成别的贴图表（第 5 幕的 SMPL） */
  function h1Mesh(parent, opts) {
    var o = opts || {}, M = o.sheet || SHEET, file = o.file || M.file, g = group(parent), rows = Math.ceil(M.n / M.cols);
    g.setAttribute('class', 'demo-x-g1mesh');
    var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: 0, height: 0 });
    var img = svgEl('image', { x: 0, y: 0, width: M.cw * M.cols, height: M.ch * rows, preserveAspectRatio: 'none' });
    box.appendChild(img);
    g.appendChild(box);
    if (o.ghost) g.style.opacity = o.ghost;
    var woke = false, lastF = -1;
    return {
      g: g,
      put: function (root, cam, fr) {
        if (!woke && H1_3D_BASE) { woke = true; img.setAttribute('href', H1_3D_BASE + file); }
        var k = cam.s / M.R, a = project([root[0], root[1], 0], cam);
        var f = clamp(Math.round(fr || 0), 0, M.n - 1);
        box.setAttribute('x', (a[0] - M.ax * k).toFixed(1));
        box.setAttribute('y', (a[1] - M.ay * k).toFixed(1));
        box.setAttribute('width', (M.cw * k).toFixed(1));
        box.setAttribute('height', (M.ch * k).toFixed(1));
        if (f !== lastF) {
          box.setAttribute('viewBox', [(f % M.cols) * M.cw, Math.floor(f / M.cols) * M.ch, M.cw, M.ch].join(' '));
          lastF = f;
        }
      }
    };
  }
  /* 地上的刻度：每 0.5 m 一道，随根部后退，表示在往前走 */
  function groundTicks(parent, x1, x2, y) {
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
  /* H1 身上的三种目标：蓝点 = 关键点位置（23 个）、黄菱形 = 关节角（19 个，画在子连杆的原点）、紫箭头 = 根部（速度 + 高度）。
     put(f, cam, mask)：mask 是 49 位（null 表示全开）；opts.ghost 给关掉的关键点留一个淡灰圈 */
  function modeOverlay(parent, opts) {
    var o = opts || {}, g = group(parent), r = o.r || 3.6;
    var ghosts = [], kin = [], jnt = [];
    var rootG = group(g);
    var hLine = hline(rootG, 0, 0, 0, 0, C_ROOT, 1.8, '4 3');
    var hTop = hline(rootG, 0, 0, 0, 0, C_ROOT, 1.8);
    var vArr = arrow(rootG, C_ROOT, o.aw || 3);
    var jg = group(g), kg = group(g);
    for (var i = 0; i < NB; i++) {
      var gh = paint(svgEl('circle', { cx: 0, cy: 0, r: r, fill: 'none', 'stroke-width': 1.1 }), null, C_MUTED);
      kg.appendChild(gh); ghosts.push(gh);
      var d = paint(svgEl('circle', { cx: 0, cy: 0, r: r, 'stroke-width': 1.2 }), C_KIN, C_SURFACE);
      kg.appendChild(d); kin.push(d);
    }
    var js = o.js || 3.4;
    for (var j = 0; j < NJ; j++) {
      var dm = paint(svgEl('path', { d: 'M 0 0', 'stroke-width': 1 }), C_JNT, C_SURFACE);
      jg.appendChild(dm); jnt.push(dm);
    }
    return {
      g: g,
      put: function (f, cam, mask) {
        var m = mask || null;
        var P = f.pts.map(function (p) { return project(p, cam); });
        P.forEach(function (q, i) {
          var on = !m || m[i];
          moveDot(kin[i], q); moveDot(ghosts[i], q);
          kin[i].style.opacity = on ? 1 : 0;
          ghosts[i].style.opacity = !on && o.ghost ? 0.55 : 0;
        });
        for (var j = 0; j < NJ; j++) {
          var on = !m || m[jbit(j)], q = P[j + 1], dx = j === 0 || j === 5 ? -4 : j === 2 || j === 7 ? 4 : 0, x = q[0] + dx, y = q[1];
          jnt[j].setAttribute('d', 'M ' + (x - js).toFixed(1) + ' ' + y.toFixed(1) + ' L ' + x.toFixed(1) + ' ' + (y - js).toFixed(1) + ' L ' + (x + js).toFixed(1) + ' ' + y.toFixed(1) + ' L ' + x.toFixed(1) + ' ' + (y + js).toFixed(1) + ' Z');
          jnt[j].style.opacity = on ? 1 : 0;
        }
        var rootOn = !m || ROOT_BITS.some(function (b) { return m[b]; });
        var v = pelvisVel(f.k), p0 = f.pts[0], a = project(p0, cam), b = project([p0[0] + 0.6 * v[0], p0[1] + 0.6 * v[1], p0[2]], cam);
        vArr.set(a[0], a[1], b[0], b[1], 8);
        var gx = a[0] - (o.hx || 30), gy = project([p0[0], p0[1], 0], cam)[1];
        setLine(hLine, gx, gy, gx, a[1]); setLine(hTop, gx - 5, a[1], gx + 5, a[1]);
        rootG.style.opacity = rootOn ? 1 : 0;
        return P;
      }
    };
  }
  /* 人的骨架（SMPL 的 24 个关节）：两腿、脊柱到头、两臂 */
  var H_CHAINS = [
    ['Pelvis', 'L_Hip', 'L_Knee', 'L_Ankle', 'L_Toe'],
    ['Pelvis', 'R_Hip', 'R_Knee', 'R_Ankle', 'R_Toe'],
    ['Pelvis', 'Torso', 'Spine', 'Chest', 'Neck', 'Head'],
    ['Chest', 'L_Thorax', 'L_Shoulder', 'L_Elbow', 'L_Wrist', 'L_Hand'],
    ['Chest', 'R_Thorax', 'R_Shoulder', 'R_Elbow', 'R_Wrist', 'R_Hand']
  ].map(function (ch) { return ch.map(hj); });
  function humanSkel(parent, opts) {
    var o = opts || {}, g = group(parent), color = o.color || C_HUMAN;
    var paths = H_CHAINS.map(function () { return pathLine(g, [], color, o.sw || 3); });
    var head = paint(svgEl('circle', { cx: 0, cy: 0, r: o.head || 8, fill: 'none', 'stroke-width': o.sw || 3 }), null, color);
    g.appendChild(head);
    return {
      g: g,
      put: function (P3, cam) {
        var P = P3.map(function (p) { return project(p, cam); });
        H_CHAINS.forEach(function (ch, i) { setPath(paths[i], ch.map(function (j) { return P[j]; })); });
        var hd = P[hj('Head')];
        head.setAttribute('cx', hd[0].toFixed(1)); head.setAttribute('cy', (hd[1] - (o.head || 8) * 0.6).toFixed(1));
        return P;
      }
    };
  }
  /* 帧号：按真实时间循环播放 */
  function loopFrame(now, start) {
    return ((Math.floor((start || 0) + now * WALK.fps) % WALK.n) + WALK.n) % WALK.n;
  }
  /* 表里的数照论文的写法：小于 1 的三位小数（0.070、0.210），其余三位有效数字（51.0、80.0、6.40、275） */
  function paperNum(v) { return v < 1 ? v.toFixed(3) : v.toPrecision(3); }
  /* 雷达图上标的数：图 3 小于 1 的三位小数、其余一位（185.0、275.1）；图 4 的角度两位小数，位置照图上 */
  function radarNum(fig, j, v) { return fig === 'fig3' ? (v < 1 ? v.toFixed(3) : v.toFixed(1)) : j < 2 ? v.toFixed(2) : String(v); }
  function f1(x) { return fmt(x, 1); }
  function f2(x) { return fmt(x, 2); }
  function f3(x) { return fmt(x, 3); }
  /* 排版用的负号 */
  function sgn(s) { return String(s).replace(/-/g, '−'); }
  function vec(p, d) { return '(' + p.map(function (v) { return sgn(fmt(v, d == null ? 3 : d)); }).join(', ') + ')'; }
  /* 一台走路的 H1 + 三种目标 + 地上的刻度 */
  function walker(parent, s, ox, oy, x1, x2, opts) {
    var o = opts || {}, g = group(parent);
    var ground = groundTicks(g, x1, x2, oy);
    var mesh = h1Mesh(g, { ghost: o.meshGhost });
    var ov = modeOverlay(g, o);
    return {
      g: g, ov: ov,
      put: function (now, mask, phase) {
        var k = loopFrame(now, phase || 0), f = frame(k), cam = followCam(f, s, ox, oy);
        ground.put(f, cam);
        mesh.put(f.root, cam, k);
        return { f: f, cam: cam, P: ov.put(f, cam, mask) };
      }
    };
  }
  /* 49 位的掩码条：23 个蓝格（刚体）、19 个黄格（关节角）、7 个紫格（根部）；set(mask) 点亮打开的位 */
  function maskStrip(parent, x, y, w, h, opts) {
    var o = opts || {}, g = group(parent), cw = w / NBIT, cells = [];
    for (var i = 0; i < NBIT; i++) {
      var r = paint(svgEl('rect', { x: (x + i * cw + 0.6).toFixed(1), y: y, width: (cw - 1.2).toFixed(1), height: h, rx: 1.5, 'stroke-width': 1 }), C_SURFACE, bitColor(i));
      g.appendChild(r); cells.push(r);
    }
    if (!o.noLabels) {
      label(g, x + cw * NB / 2, y + h + 14, '23 个刚体的位置', 'demo-x-mut', 9.5, 'middle');
      label(g, x + cw * (NB + NJ / 2), y + h + 14, '19 个关节角', 'demo-x-mut', 9.5, 'middle');
      label(g, x + cw * (NB + NJ + NR / 2), y + h + 14, '根部 7', 'demo-x-mut', 9.5, 'middle');
    }
    return {
      g: g,
      set: function (m) {
        cells.forEach(function (c, i) { c.style.fill = m && m[i] ? bitColor(i) : C_SURFACE; });
      }
    };
  }
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
  /* 一个回合一种掩码：从 cue 起每 per 秒换一个回合，种子按回合号定 */
  function episodeOf(sec, per) { return Math.max(0, Math.floor(sec / per)); }
  function rngFor(ep, salt) { return K.mulberry32 ? K.mulberry32(ep * 7919 + (salt || 1)) : Math.random; }

  /* ── scene 1: 每篇一套接口 ── */
  function buildSceneInterfaces() {
    var s = sceneSvg('四台 H1 走同一段路，各自只跟一种接口：ExBody 跟上身关节角和根部、HumanPlus 跟全身关节角和根部、H2O 跟 12 个关键点、' +
      'OmniH2O 跟头和双手三个点；下面依次出现：走路、表情动作、遥操作各用一种接口，一种接口要一套观测和奖励，一个控制器只会一种模式，上层的设备与策略五花八门，最后是问题');
    s.appendChild(svgText(24, 26, '同一段走路，四篇工作各跟各的（官方代码里的四种模式）', 'demo-x-ink2', 13.5));
    var GY = 244, SC = 86;
    var bots = MODES.map(function (m, i) {
      var cx = 112 + i * 192, g = group(s);
      rectBox(g, cx - 88, 38, 176, 238, C_BORDER, C_SURFACE2);
      label(g, cx, 58, m.zh, 'demo-x-ink', 13, 'middle');
      var w = walker(g, SC, cx + 6, GY, cx - 80, cx + 80, { r: 3, js: 3, hx: 26 });
      label(g, cx, 266, m.desc, 'demo-x-mut', 10.5, 'middle');
      return { w: w, mask: maskFrom(m.bits), phase: i * 9 };
    });
    var lg = group(s);
    dotAt(lg, 30, 290, 4, C_KIN); label(lg, 38, 294, '关键点位置', 'demo-x-mut', 10);
    lg.appendChild(paint(svgEl('path', { d: 'M 118 286 L 122 290 L 118 294 L 114 290 Z' }), C_JNT)); label(lg, 128, 294, '关节角', 'demo-x-mut', 10);
    hline(lg, 184, 290, 204, 290, C_ROOT, 3); label(lg, 210, 294, '根部（速度 + 高度）', 'demo-x-mut', 10);
    var Y = 308;
    var p1 = group(s);
    label(p1, 24, Y + 14, '每篇工作按自己的任务选了一种接口', 'demo-x-ink', 13.5);
    chip(p1, 24, Y + 28, 240, '走路、导航：跟**根部速度**', C_ROOT, { size: 12 });
    chip(p1, 276, Y + 28, 240, '表情动作：跟**关节角**', C_JNT, { size: 12 });
    chip(p1, 528, Y + 28, 248, '遥操作：跟几个**关键点的位置**', C_KIN, { size: 12 });
    label(p1, 24, Y + 86, '目标其实都是动作跟踪，只是跟的东西不一样', 'demo-x-mut', 11.5);
    var p2 = group(s);
    label(p2, 24, Y + 14, '一种接口，就要一整套', 'demo-x-ink', 13.5);
    chip(p2, 24, Y + 28, 170, '自己的观测', C_WARN, { size: 12 });
    chip(p2, 206, Y + 28, 170, '自己的奖励设计', C_WARN, { size: 12 });
    chip(p2, 388, Y + 28, 170, '单独训一个策略', C_WARN, { size: 12 });
    chip(p2, 570, Y + 28, 206, '换任务 → 从头再来', C_BAD, { size: 12 });
    label(p2, 24, Y + 86, '开发重复、费时，训出来的控制器也只会这一种模式', 'demo-x-mut', 11.5);
    var p3 = group(s);
    label(p3, 24, Y + 14, '一个控制器只会一种模式', 'demo-x-ink', 13.5);
    chip(p3, 24, Y + 28, 300, '在不平的地上走路：跟根部速度', C_ROOT, { size: 12 });
    var a3 = arrow(p3, C_MUTED, 2); a3.set(332, Y + 42, 372, Y + 42, 8);
    chip(p3, 380, Y + 28, 300, '停下来做双臂精细操作：要关节角', C_JNT, { size: 12 });
    label(p3, 690, Y + 47, '✗ 换不了', 'demo-x-bad', 13);
    label(p3, 24, Y + 86, '论文的例子：走路的控制器很难无缝切到需要关节角或末端跟踪的操作', 'demo-x-mut', 11.5);
    var p4 = group(s);
    label(p4, 24, Y + 14, '上面接的东西也五花八门', 'demo-x-ink', 13.5);
    chip(p4, 24, Y + 28, 360, '手柄、键盘、动捕、外骨骼、VR 头显', C_ACCENT, { size: 12 });
    chip(p4, 396, Y + 28, 380, '预训练的操作策略（OpenVLA 等）：输出关节角或末端', C_ACCENT, { size: 12 });
    label(p4, 24, Y + 86, '→ 需要一个统一的底层人形控制器，适配各种控制模式', 'demo-x-mut', 11.5);
    var p5 = group(s);
    label(p5, 24, Y + 14, '问题：能不能一个控制器支持所有模式，兼得各自的长处？', 'demo-x-ink', 13.5);
    chip(p5, 24, Y + 30, 360, '**HOVER** = Humanoid Versatile Controller', C_HOVER, { size: 12.5 });
    label(p5, 400, Y + 49, '同一套权重，换掩码就换模式', 'demo-x-ink2', 12.5);
    label(p5, 24, Y + 86, 'NVIDIA GEAR、CMU 等 · ICRA 2025 · 19 个自由度的 Unitree H1', 'demo-x-mut', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      bots.forEach(function (b) { b.w.put(now, b.mask, b.phase); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 共同的底座：全身运动学模仿 ── */
  function buildSceneInsight() {
    var s = sceneSvg('左边：一台 H1 走路，23 个关键点、19 个关节、根部的速度和高度全部亮着——教师要把这些全都跟上；右边依次出现：四种接口都汇到全身运动学模仿、' +
      '论文图 2 的蒸馏总览、两步走的做法、论文对通才为什么更好的假设、三条贡献');
    s.appendChild(svgText(24, 26, '把全身都跟上：23 个点、19 个关节、根部', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 360, 360, C_BORDER, C_SURFACE2);
    var bot = walker(left, 150, 210, 370, 40, 368, { r: 4, js: 4, hx: 40 });
    var R = 404;
    var p1 = group(s);
    label(p1, R, 64, '四种接口的共同点', 'demo-x-ink', 14);
    var ys = [84, 122, 160, 198];
    MODES.forEach(function (m, i) {
      chip(p1, R, ys[i], 168, m.zh + '：' + m.desc.replace('（论文写 8 个）', ''), i < 2 ? C_JNT : C_KIN, { size: 10.5 });
      var a = arrow(p1, C_MUTED, 1.8); a.set(R + 172, ys[i] + 14, R + 214, 156, 7);
    });
    chip(p1, R + 218, 134, 156, '**全身运动学模仿**', C_HOVER, { size: 12.5, h: 44 });
    label(p1, R, 260, '接口不同，底下的目标一样：', 'demo-x-ink2', 12.5);
    label(p1, R, 282, '稳、像人的全身动作', 'demo-x-ink2', 12.5);
    var p2 = group(s);
    label(p2, R, 64, '论文图 2：蒸馏的总览', 'demo-x-ink', 14);
    var fig = paperPart(p2, 'fig2', 0, 0, 1, 1, R, 80, 372, '论文图 2（全图）');
    var zoom = paperPart(p2, 'fig2', 0.13, 0.0, 0.72, 1.0, R, 80 + fig.h + 34, 300, '放大中间：下行全部目标 → 模式掩码 → 稀疏掩码');
    label(p2, R, 80 + fig.h + 34 + zoom.h + 40, '右边：教师（下）的动作监督 HOVER 策略（上）', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, '两步走', 'demo-x-ink', 14);
    chip(p3, R, 84, 372, '① **特权教师**：PPO，在 AMASS 重定向到 H1 的大规模动作上，全身都跟', C_WARN, { size: 11, left: true, h: 34 });
    chip(p3, R, 130, 372, '② **学生**：命令被掩码随机遮掉一部分，DAgger 照着教师的动作学', C_HOVER, { size: 11, left: true, h: 34 });
    var a3 = arrow(p3, C_MUTED, 2); a3.set(R + 186, 120, R + 186, 128, 7);
    label(p3, R, 200, '教师不部署，只当老师；部署的是学生', 'demo-x-ink2', 12.5);
    label(p3, R, 222, '一套权重，换掩码就换模式', 'demo-x-ink2', 12.5);
    var p4 = group(s);
    label(p4, R, 64, '论文的假设：为什么通才更好', 'demo-x-ink', 14);
    chip(p4, R, 84, 372, '平衡、像人的动作、精确的肢体控制：各模式**共享**', C_HOVER, { size: 12, left: true });
    chip(p4, R, 122, 372, '专才：容易**过拟合**自己的奖励和训练环境', C_BAD, { size: 12, left: true });
    label(p4, R, 180, '这是论文提出的解释，没有单独的实验去验证', 'demo-x-mut', 11.5);
    var p5 = group(s);
    label(p5, R, 64, '三条贡献', 'demo-x-ink', 14);
    chip(p5, R, 84, 372, '① 一个支持多种控制模式的统一全身神经控制器', C_ACCENT, { size: 11.5, left: true });
    chip(p5, R, 122, 372, '② 蒸馏让技能跨模式共享，比单独训的策略好', C_ACCENT, { size: 11.5, left: true });
    chip(p5, R, 160, 372, '③ 仿真与真机：模式之间无缝切换', C_ACCENT, { size: 11.5, left: true });
    label(p5, R, 222, '引言：给 19 个自由度的人形支持超过 15 种模式', 'demo-x-mut', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      bot.put(now, null, 0);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 一个命令空间：三种目标 ── */
  function buildSceneSpace() {
    var s = sceneSvg('左边一台 H1 走路，身上的目标一层层出现：蓝点是 23 个刚体的位置，黄色菱形是 19 个关节角，紫色箭头和虚线是根部的速度和高度；' +
      '右边一条 95 维的命令条按 69、19、7 三段出现，下面依次讲每一种目标、论文图 1 中间的命令空间、两条设计标准');
    s.appendChild(svgText(24, 26, '命令空间：上半身、下半身 × 三种目标', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 330, 360, C_BORDER, C_SURFACE2);
    var bot = walker(left, 150, 196, 372, 40, 338, { r: 4, js: 4, hx: 40 });
    var R = 374, BW = 402, BX = R, BY = 52, BH = 22;
    var segs = [[3 * NB, C_KIN, '69'], [NJ, C_JNT, '19'], [NR, C_ROOT, '7']];
    var segG = [], acc = 0;
    segs.forEach(function (sg) {
      var g = group(s), x = BX + BW * acc / NCMD, w = BW * sg[0] / NCMD;
      g.appendChild(paint(svgEl('rect', { x: x.toFixed(1), y: BY, width: (w - 1).toFixed(1), height: BH, rx: 3 }), sg[1]));
      label(g, x + w / 2, BY + BH + 15, sg[2], 'demo-x-ink', 11.5, 'middle');
      segG.push(g); acc += sg[0];
    });
    var eq = group(s);
    math(eq, BX + BW, BY + BH + 38, '95 = 23 \\times 3 + 19 + 7', 14, 'end');
    var Y = 128;
    var p1 = group(s);
    label(p1, R, Y + 10, '① 运动学位置：选定刚体点的 3D 位置', 'demo-x-ink', 13);
    chip(p1, R, Y + 24, 402, '23 个：20 个连杆 + 左手、右手（肘往前 0.3 m）+ 头（骨盆往上 0.75 m）', C_KIN, { size: 10.5, left: true });
    label(p1, R, Y + 80, '前人：H2O 跟 8 个点、OmniH2O 跟头和双手', 'demo-x-mut', 11.5);
    label(p1, R, Y + 100, '代码里是参考的点减去机器人自己的根部（朝向坐标系）', 'demo-x-mut', 11.5);
    var p2 = group(s);
    label(p2, R, Y + 10, '② 局部关节角：每个电机的目标角度', 'demo-x-ink', 13);
    chip(p2, R, Y + 24, 402, '19 个：两腿各 5、躯干 1、两臂各 4', C_JNT, { size: 11, left: true });
    label(p2, R, Y + 80, '前人：ExBody 跟上身、HumanPlus 跟全身', 'demo-x-mut', 11.5);
    label(p2, R, Y + 100, '相当于丢掉了全局位置的运动学模仿', 'demo-x-mut', 11.5);
    var p3 = group(s);
    label(p3, R, Y + 10, '③ 根部：速度、高度、朝向', 'demo-x-ink', 13);
    ROOT_ZH.forEach(function (n, i) {
      chip(p3, R + (i % 4) * 101, Y + 24 + Math.floor(i / 4) * 34, 96, n, C_ROOT, { size: 10.5 });
    });
    label(p3, R, Y + 112, '走路、导航用；偏航给差值（本体感受估不出绝对偏航）', 'demo-x-mut', 11.5);
    var p4 = group(s);
    var fig = paperPart(p4, 'fig1', 0, 0.443, 1, 0.725, R + 20, Y + 4, 362, '论文图 1 中间：亮着的格子在跟，右边的虚线框是掩码');
    var p5 = group(s);
    label(p5, R, Y + 10, '两条设计标准', 'demo-x-ink', 13);
    chip(p5, R, Y + 24, 402, '**通用性**：覆盖前人的配置，能接手柄、键盘、动捕、外骨骼、VR', C_HOVER, { size: 11, left: true });
    chip(p5, R, Y + 62, 402, '**原子性**：维度互相独立，可以任意组合', C_HOVER, { size: 11, left: true });
    label(p5, R, Y + 122, '分上半身、下半身两块；下半身才有根部', 'demo-x-ink2', 12);
    label(p5, R, Y + 144, '一个 one-hot 掩码选哪些分量生效', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var show = [seg(t, 0.3, 0.7), seg(t, 3.9, 4.3), seg(t, 7.3, 7.7)];
      var m = [];
      for (var i = 0; i < NBIT; i++) m.push(i < NB ? show[0] > 0.5 : i < NB + NJ ? show[1] > 0.5 : show[2] > 0.5);
      bot.put(now, m, 0);
      segG.forEach(function (g, i) { setOpacity(g, show[i]); });
      setOpacity(eq, seg(t, 7.6, 8.0));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
      void fig;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 前人的接口都是子集（表 I） ── */
  function buildSceneSubsets() {
    var s = sceneSvg('左边是论文表 I：ExBody、H2O、OmniH2O、HumanPlus、MHC、HOVER 各占命令空间的哪几格，一行行出现；右边的 H1 和 49 位掩码条跟着当前这一行亮：' +
      'ExBody 16 位、H2O 12 位、OmniH2O 3 位、HumanPlus 26 位，最后 HOVER 49 位全开、可以任意组合');
    s.appendChild(svgText(24, 26, '论文表 I：前人的接口都是命令空间的子集', 'demo-x-ink2', 13.5));
    var X0 = 24, NW = 82, CW = 54, Y0 = 44;
    var heads = [['多模式', ''], ['上身', '关键点'], ['上身', '关节角'], ['下身', '关键点'], ['下身', '关节角'], ['下身', '根部']];
    var kinds = ['multi', 'kin', 'jnt', 'kin', 'jnt', 'root'];
    var hg = group(s);
    rectBox(hg, X0, Y0, NW + CW * 6, 44, C_BORDER, C_SURFACE2);
    label(hg, X0 + 10, Y0 + 27, '控制器', 'demo-x-ink2', 11.5);
    heads.forEach(function (h, j) {
      var cx = X0 + NW + CW * j + CW / 2;
      tone(hg, cx, Y0 + (h[1] ? 18 : 27), h[0], kinds[j] === 'multi' ? C_HOVER : kindColor(kinds[j]), 10.5, 'middle');
      if (h[1]) tone(hg, cx, Y0 + 36, h[1], kindColor(kinds[j]), 10.5, 'middle');
    });
    var rows = TABLE1.map(function (r, i) {
      var g = group(s), y = Y0 + 50 + i * 40;
      var hi = rectBox(g, X0, y, NW + CW * 6, 34, C_BORDER, C_SURFACE);
      label(g, X0 + 10, y + 22, r.zh, r.zh === 'HOVER' ? 'demo-x-ink' : 'demo-x-ink2', 12);
      r.v.forEach(function (v, j) {
        var cx = X0 + NW + CW * j + CW / 2;
        if (v) {
          var col = kinds[j] === 'multi' ? C_HOVER : kindColor(kinds[j]);
          g.appendChild(paint(svgEl('rect', { x: cx - 13, y: y + 7, width: 26, height: 20, rx: 4 }), col));
          label(g, cx, y + 22, '✓', null, 12, 'middle').style.fill = C_SURFACE;
        } else {
          label(g, cx, y + 22, '✗', 'demo-x-mut', 12, 'middle');
        }
      });
      return { g: g, hi: hi };
    });
    label(s, X0, Y0 + 50 + 6 * 40 + 14, '论文：HOVER 覆盖前人的所有设计，还能跟踪任意子集；MHC 是 v2 新加的一行', 'demo-x-mut', 10.5);
    var R = 470, RW = 306;
    var right = group(s);
    rectBox(right, R, 38, RW, 262, C_BORDER, C_SURFACE2);
    var bot = walker(right, 116, R + RW / 2 + 6, 286, R + 14, R + RW - 14, { r: 3.4, js: 3.4, hx: 32, ghost: true });
    var strip = maskStrip(s, R, 312, RW, 18);
    var cnt = label(s, R, 368, '', 'demo-x-ink', 12.5);
    var sub = label(s, R, 390, '', 'demo-x-mut', 10.5);
    /* 每个 cue 亮一行：ExBody、H2O、OmniH2O、HumanPlus（+ MHC）、HOVER */
    var STEPS = [
      { at: 0.4, row: 0, mask: maskFrom(modeOf('exbody').bits), txt: 'ExBody：9 个上身关节角 + 根部 7 = 16 位', sub: '代码 DISTILL_MASK_MODES_ALL 里的 exbody' },
      { at: 3.6, row: 1, mask: maskFrom(modeOf('h2o').bits), txt: 'H2O：12 个关键点 = 12 位', sub: '论文：肩、肘、手、踝共 8 个点；代码的正则多匹配了肩部连杆' },
      { at: 7.0, row: 2, mask: maskFrom(modeOf('omnih2o').bits), txt: 'OmniH2O：头和双手 = 3 位', sub: 'VR 头显给得出的就是这 3 个点' },
      { at: 10.4, row: 3, mask: maskFrom(modeOf('humanplus').bits), txt: 'HumanPlus：19 个关节角 + 根部 7 = 26 位', sub: 'MHC 也是这几格：多模式，但只有关节角和根部、不能任意子集' },
      { at: 13.4, row: 5, mask: null, txt: 'HOVER：49 位全有，可以任意组合', sub: '下一步：怎么在训练里随机挑这些组合' }
    ];
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var st = STEPS[0];
      STEPS.forEach(function (x) { if (t >= x.at) st = x; });
      rows.forEach(function (r, i) {
        var shown = i <= 3 ? seg(t, 0.3 + 0.25 * i, 0.6 + 0.25 * i) : i === 4 ? seg(t, 10.7, 11.1) : seg(t, 13.7, 14.1);
        setOpacity(r.g, shown);
        var on = i === st.row || (st.row === 3 && i === 4);
        r.hi.style.stroke = on ? C_HOVER : C_BORDER;
        r.hi.style.strokeWidth = on ? 2.4 : 1.3;
      });
      var m = st.mask;
      if (!m) {
        /* HOVER：每 1.6 s 换一个随机子集（演示「任意组合」） */
        var ep = episodeOf(since(t, clock, 13.4), 1.6), rng = rngFor(ep, 11);
        m = ep === 0 ? maskFrom(range(0, NBIT)) : sparsify(maskFrom(range(0, NBIT)), rng);
      }
      bot.put(now, m, 0);
      strip.set(m);
      cnt.textContent = st.mask ? st.txt : st.txt + '（这一刻 ' + maskCount(m) + ' 位）';
      sub.textContent = st.sub;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: 数据：AMASS 重定向到 H1 ── */
  function buildSceneRetarget() {
    var s = sceneSvg('左边：SMPL 人体（先是形状参数为 0 的平均身材，第二步换成拟合后的身材）和重定向出来的 H1 并排走同一段路，第三步时人体变淡、露出 SMPL 的 24 个关节并叠到 H1 上，11 对对应点之间连上细线；右边依次是重定向的四步和 README 的说明');
    s.appendChild(svgText(24, 26, '数据：AMASS 重定向到 H1（流程沿用 H2O）', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 420, 360, C_BORDER, C_SURFACE2);
    var GY = 372, SC = 150;
    var ground = groundTicks(left, 40, 428, GY);
    var mesh = h1Mesh(left);
    var body0 = h1Mesh(left, { sheet: SMPL_SHEET, file: SMPL_SHEET.beta0 });
    var bodyF = h1Mesh(left, { sheet: SMPL_SHEET, file: SMPL_SHEET.fit });
    var hum = humanSkel(left, { color: C_HUMAN, sw: 2.4, head: 6 });
    var pairG = group(left), pairL = PAIRS.map(function () { return hline(pairG, 0, 0, 0, 0, C_BAD, 1.4); });
    var kinG = group(left), kinD = PAIRS.map(function () { return dotAt(kinG, 0, 0, 3.6, C_KIN); });
    var tag0 = rich(left, 120, 56, 'SMPL · 形状参数 $\\beta = 0$', 10.5, 'demo-x-mut', 'middle');
    var tagF = rich(left, 120, 56, 'SMPL · 拟合后的 $\\beta\'$', 10.5, 'demo-x-mut', 'middle');
    var tagR = label(left, 0, 0, 'H1', 'demo-x-mut', 10.5, 'middle');
    var R = 464, W = 312;
    var steps = [
      ['① 正运动学：由关节角算出 H1 的关键点', C_KIN],
      ['② 拟合 SMPL：14 对点对上 H1 的身材', C_ACCENT],
      ['③ 梯度下降：逐帧解关节角，对齐 11 对点', C_BAD],
      ['④ 仿真里筛掉做不到的动作 → 数据集 $\\hat Q$', C_HOVER]
    ];
    var sg = steps.map(function (st, i) { var g = group(s); chip(g, R, 60 + i * 44, W, st[0], st[1], { size: 11.5, left: true, h: 32 }); return g; });
    var pB = group(s);
    rich(pB, R, 246, '拟合后 $\\beta\'$ 有一维到了 −42.5：关节点对上了，', 11, 'demo-x-mut');
    label(pB, R, 266, '网格已经不像人（损失只看 14 对关节点）', 'demo-x-mut', 11);
    var pC = group(s);
    label(pC, R, 292, '500 步后 11 对点平均还相距 66 mm', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 318, 'README：AMASS 的许可不让分发重定向好的数据', 'demo-x-mut', 11);
    label(p5, R, 338, '整个 AMASS 在 32 核机器上重定向最多要跑 4 天', 'demo-x-mut', 11);
    var foot = label(s, R, 370, '这段走路：AMASS 的 CMU 07_01，我们用官方两个脚本', 'demo-x-mut', 11);
    var foot2 = label(s, R, 390, '用 SMPL 重算的（不是论文的数据）', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock), k = loopFrame(now, 0), f = frame(k);
      /* 第 ③ 步前人和 H1 并排；之后人慢慢挪到 H1 身上，网格变淡、露出 SMPL 的关节 */
      var mix = seg(t, 7.2, 8.4), oxH = 120 + (300 - 120) * mix, fit = seg(t, 4.0, 5.2);
      var camR = followCam(f, SC, 300, GY), camH = followCam(f, SC, oxH, GY);
      ground.put(f, camR);
      mesh.put(f.root, camR, k);
      body0.put(f.root, camH, k); bodyF.put(f.root, camH, k);
      setOpacity(body0.g, 1 - fit);
      setOpacity(bodyF.g, fit * (1 - 0.75 * mix));
      var HP = hum.put(f.hum, camH);
      setOpacity(hum.g, mix);
      PAIRS.forEach(function (p, i) {
        var a = project(f.pts[p[0]], camR), b = HP[p[1]];
        setLine(pairL[i], a[0], a[1], b[0], b[1]);
        moveDot(kinD[i], a);
      });
      setOpacity(kinG, seg(t, 0.4, 0.8));
      setOpacity(pairG, mix);
      [tag0, tagF].forEach(function (tg) { tg.setX(oxH); });
      tagR.setAttribute('x', 300); tagR.setAttribute('y', 56);
      /* 两个标签先后出现，不同时在场 */
      setOpacity(tag0, 1 - seg(t, 4.0, 4.6));
      setOpacity(tagF, seg(t, 4.6, 5.2) * (1 - seg(t, 7.2, 7.6)));
      sg.forEach(function (g, i) { setOpacity(g, seg(t, [0.3, 3.9, 7.3, 10.7][i], [0.7, 4.3, 7.7, 11.1][i])); });
      setOpacity(pB, seg(t, 5.2, 5.6));
      setOpacity(pC, seg(t, 8.6, 9.0));
      setOpacity(p5, seg(t, 13.7, 14.1));
      setOpacity(foot, seg(t, 0.6, 1.0)); setOpacity(foot2, seg(t, 0.6, 1.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 特权教师：全都看、全都跟（表 II） ── */
  function buildSceneOracle() {
    var s = sceneSvg('左边是项目页的仿真视频：一大群 H1 同时跟踪 AMASS 里的各种动作；右边依次出现：教师看什么、网络多大、奖励表 II 的三类、域随机化、教师在表 III 里的成绩');
    s.appendChild(svgText(24, 26, '特权教师：仿真里什么都看得见，全身都跟', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'group', 28, 46, 352, 198, '项目页视频（仿真；文件名标的是慢放）：大量 H1 同时跟踪不同的动作');
    var stat = group(s);
    rectBox(stat, 28, 278, 352, 112, C_HOVER, C_SURFACE);
    label(stat, 44, 302, '教师是上限（表 III 第一行）', 'demo-x-ink', 13);
    label(stat, 44, 328, '存活 99.3%', 'demo-x-good', 13);
    label(stat, 160, 328, '全局误差 119 mm', 'demo-x-ink2', 12.5);
    label(stat, 44, 352, '局部误差 59.4 mm', 'demo-x-ink2', 12.5);
    label(stat, 200, 352, '上身关节 0.153 rad', 'demo-x-ink2', 12.5);
    label(stat, 44, 376, '它不部署，只给学生当老师', 'demo-x-mut', 11.5);
    var R = 404, W = 372;
    var p1 = group(s);
    math(p1, R, 66, '\\pi^{\\text{oracle}}(a_t \\mid s^{\\text{p-oracle}}_t,\\ s^{\\text{g-oracle}}_t)', 15);
    label(p1, R, 104, '本体感受：所有刚体的', 'demo-x-ink2', 12);
    ['位置', '旋转', '线速度', '角速度', '上一步动作'].forEach(function (n, i) { chip(p1, R + i * 75, 114, 70, n, C_WARN, { size: 11 }); });
    label(p1, R, 172, '目标：所有刚体与下一帧参考之差，加上参考本身', 'demo-x-ink2', 12);
    ['旋转之差', '位置之差', '速度之差', '角速度之差', '参考姿态'].forEach(function (n, i) { chip(p1, R + i * 75, 182, 70, n, C_ACCENT, { size: 10.5 }); });
    label(p1, R, 240, '这些真机上多半拿不到：只有仿真里的教师能用', 'demo-x-mut', 11.5);
    var p2 = group(s);
    label(p2, R, 70, '网络：三层 MLP（和 OmniH2O 一样）', 'demo-x-ink', 13.5);
    [512, 256, 128].forEach(function (n, i) {
      var h = n / 512 * 120;
      p2.appendChild(paint(svgEl('rect', { x: R + 60 + i * 90, y: 100 + (120 - h) / 2, width: 46, height: h, rx: 5 }), C_WARN));
      label(p2, R + 83 + i * 90, 240, String(n), 'demo-x-ink', 12, 'middle');
    });
    var a2 = arrow(p2, C_MUTED, 2); a2.set(R, 160, R + 52, 160, 8);
    var a2b = arrow(p2, C_MUTED, 2); a2b.set(R + 292, 160, R + 340, 160, 8);
    label(p2, R + 346, 164, '19', 'demo-x-ink', 12);
    label(p2, R, 280, '官方代码：观测 913 维（同 OmniH2O 的教师），价值网络 990 维', 'demo-x-mut', 11.5);
    label(p2, R, 300, '论文没给维数；动作是 19 个关节的目标角', 'demo-x-mut', 11.5);
    var p3 = group(s);
    label(p3, R, 70, '奖励（表 II）：三类 24 项', 'demo-x-ink', 13.5);
    var RW = [['惩罚', REWARD.penalty.length, C_BAD], ['正则', REWARD.reg.length, C_WARN], ['任务', REWARD.task.length, C_HOVER]];
    RW.forEach(function (r, i) {
      var b = barRowAt(p3, R, 88 + i * 24, 46, r[0], r[2], 16); b.set(r[1] * 18, r[1] + ' 项');
    });
    label(p3, R, 182, '任务奖励：', 'demo-x-ink2', 12);
    REWARD.task.forEach(function (r, i) {
      var neu = r[0] === '根部速度' || r[0] === '根部旋转';
      chip(p3, R + (i % 4) * 93, 192 + Math.floor(i / 4) * 34, 88, r[0] + ' ' + r[1], neu ? C_ROOT : C_HOVER, { size: 10.5, fill: neu ? C_SURFACE2 : C_SURFACE });
    });
    label(p3, R, 282, '紫色两项比 OmniH2O 多（我们的理解：命令空间里有根部）', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 70, '域随机化：照搬 OmniH2O', 'demo-x-ink', 13.5);
    ['摩擦', '连杆质量', '躯干质心', 'PD 增益', '力矩噪声', '控制延迟', '推一把', '地形'].forEach(function (n, i) {
      chip(p4, R + (i % 4) * 93, 88 + Math.floor(i / 4) * 38, 88, n, C_ACCENT, { size: 11 });
    });
    label(p4, R, 196, '为了上真机：物理参数和环境都随机', 'demo-x-ink2', 12);
    label(p4, R, 218, '（具体范围见 OmniH2O 笔记的表 16）', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 70, '教师训好了：', 'demo-x-ink', 13.5);
    rich(p5, R, 98, '在 $\\hat Q$ 的全部动作上，把全身都跟上', 12.5, 'demo-x-ink2');
    rich(p5, R, 128, '下一步：学生只看真机拿得到的东西', 13, 'demo-x-ink2');
    rich(p5, R, 152, '和**被掩码遮掉一部分**的命令', 13, 'demo-x-ink2');
    function draw(t, clock) {
      clip.at(K.clipSince(t, 0), true);
      setOpacity(stat, seg(t, 13.7, 14.1));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
      void clock;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 7: 学生的本体感受：25 步历史 ── */
  function buildSceneProprio() {
    var s = sceneSvg('上面一步本体感受的五段：关节位置、关节速度、根角速度、重力、上一步动作；中间 25 格历史纸带往左走；下面学生观测的 1782 维一段段拼起来；最后和 OmniH2O 学生的 1665 维对比');
    s.appendChild(svgText(24, 26, '学生：只看真机拿得到的东西', 'demo-x-ink2', 13.5));
    var top = group(s);
    math(top, 24, 58, 's^{\\text{p-student}}_t \\triangleq [q,\\ \\dot q,\\ \\omega^{\\text{base}},\\ g]_{t-25:t} \\cup [a_{t-25:t-1}]', 15);
    var PROP = [['关节位置 $q$', 19, C_ACCENT, '编码器'], ['关节速度 $\\dot q$', 19, C_ACCENT, '编码器'], ['根角速度', 3, C_HOVER, 'IMU'], ['重力方向', 3, C_HOVER, 'IMU'], ['上一步动作', 19, C_WARN, '自己']];
    var X0 = 24, W0 = 752, Y1 = 92, ux = W0 / 63, acc = 0;
    var stepG = group(s);
    PROP.forEach(function (p, i) {
      var x = X0 + acc * ux, w = p[1] * ux, narrow = p[1] < 10;
      stepG.appendChild(paint(svgEl('rect', { x: x.toFixed(1), y: Y1, width: (w - 2).toFixed(1), height: 30, rx: 4 }), p[2]));
      /* 根角速度、重力只有 3 维，色块太窄：名字写到色块上方，一个向左、一个向右 */
      if (narrow) stepG.appendChild(svgRich(i === 2 ? x + w - 4 : x + 2, Y1 - 7, p[0] + ' ' + p[1], { size: 10.5, anchor: i === 2 ? 'end' : 'start', cls: 'demo-x-ink2' }));
      else stepG.appendChild(svgRich(x + w / 2, Y1 + 20, p[0] + ' ' + p[1], { size: 11, anchor: 'middle', cls: 'demo-x-ink' }));
      label(stepG, x + w / 2, Y1 + 46, p[3], 'demo-x-mut', 10, 'middle');
      acc += p[1];
    });
    label(stepG, X0 + W0, Y1 + 68, '一步 63 维（本体感受 44 + 动作 19）；没有全局线速度', 'demo-x-mut', 10.5, 'end');
    var tape = group(s), Y2 = 180, SW = 27, slots = [];
    for (var i = 0; i < 27; i++) {
      var g = group(tape);
      var acc2 = 0;
      PROP.forEach(function (p) {
        g.appendChild(paint(svgEl('rect', { x: 0, y: (acc2 / 63 * 40).toFixed(1), width: SW - 4, height: (p[1] / 63 * 40 - 0.6).toFixed(1) }), p[2]));
        acc2 += p[1];
      });
      slots.push(g);
    }
    var clipR = svgEl('clipPath', { id: 'hover-tape-clip' });
    clipR.appendChild(svgEl('rect', { x: X0, y: Y2 - 4, width: 25 * SW, height: 50 }));
    s.appendChild(clipR);
    tape.setAttribute('clip-path', 'url(#hover-tape-clip)');
    var tl = group(s);
    rich(tl, X0, Y2 + 62, '$t-25$', 11, 'demo-x-mut');
    rich(tl, X0 + 25 * SW, Y2 + 62, '$t$', 11, 'demo-x-mut', 'end');
    label(tl, X0 + 25 * SW + 12, Y2 + 20, '25 步历史', 'demo-x-ink2', 11.5);
    label(tl, X0 + 25 * SW + 12, Y2 + 44, '照搬 OmniH2O', 'demo-x-mut', 10.5);
    var Y3 = 270, sx = W0 / STU_DIM;
    var OBS = [['本体感受 44', STU.prop, C_ACCENT], ['命令 95', STU.cmd, C_KIN], ['掩码 49', STU.mask, C_PURPLE], ['动作 19', STU.act, C_WARN], ['25 步历史 1575', STU.hist * STU.per, C_MUTED]];
    var obsG = [], acc3 = 0;
    OBS.forEach(function (o, i) {
      var g = group(s), x = X0 + acc3 * sx, w = o[1] * sx;
      g.appendChild(paint(svgEl('rect', { x: x.toFixed(1), y: Y3, width: Math.max(2, w - 1).toFixed(1), height: 24, rx: 3 }), o[2]));
      var lx = i < 4 ? X0 + [0, 70, 150, 230][i] : x + w / 2;
      label(g, lx, Y3 + (i < 4 ? 42 : 16), o[0], i < 4 ? 'demo-x-ink2' : 'demo-x-ink', 10.5, i < 4 ? 'start' : 'middle');
      if (i < 4) hline(g, x + w / 2, Y3 + 25, lx + 8, Y3 + 31, C_BORDER, 1);
      obsG.push(g); acc3 += o[1];
    });
    var total = label(s, X0 + W0, Y3 - 8, '学生合计 1782 维（官方代码）', 'demo-x-ink', 12.5, 'end');
    var cmp = group(s);
    var bA = barRowAt(cmp, X0, 344, 150, 'OmniH2O 学生', C_MUTED, 16), bB = barRowAt(cmp, X0, 368, 150, 'HOVER 学生', C_HOVER, 16);
    bA.set(OMNI_STU_DIM / STU_DIM * 420, '1665 维：目标 27（3 个点 × 3 种量）');
    bB.set(420, '1782 维：命令 95 + 掩码 49');
    var c1 = label(s, X0, 404, '命令那一块从 27 维换成 144 维，其余照旧', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock), shift = (now * 6) % SW;
      slots.forEach(function (g, i) { g.setAttribute('transform', 'translate(' + (X0 + (i - 1) * SW - shift).toFixed(1) + ',' + Y2 + ')'); });
      setOpacity(top, seg(t, 0.3, 0.7));
      setOpacity(stepG, seg(t, 0.5, 0.9));
      setOpacity(tape, seg(t, 3.9, 4.3)); setOpacity(tl, seg(t, 3.9, 4.3));
      obsG.forEach(function (g, i) { setOpacity(g, i === 0 || i === 3 ? seg(t, 7.3, 7.7) : i === 4 ? seg(t, 7.5, 7.9) : seg(t, 7.8 + 0.3 * (i - 1), 8.2 + 0.3 * (i - 1))); });
      setOpacity(total, seg(t, 10.7, 11.1));
      setOpacity(cmp, seg(t, 13.7, 14.1)); setOpacity(c1, seg(t, 13.9, 14.3));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 模式掩码：上下身各挑一种 ── */
  function buildSceneModeMask() {
    var s = sceneSvg('左边 H1 走路，身上亮着的目标跟着右边的五个开关变：上身关键点、上身关节角、下身关键点、下身关节角、下身根部；每个回合开始时开关重新随机，' +
      '先是论文图 2 的例子，再是论文说的逐位随机，最后是官方代码从四种模式里挑一种');
    s.appendChild(svgText(24, 26, '模式掩码：上半身、下半身各自挑跟哪种目标', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 330, 360, C_BORDER, C_SURFACE2);
    var bot = walker(left, 148, 196, 372, 40, 338, { r: 4, js: 4, hx: 40, ghost: true });
    var R = 374;
    var fx = group(s);
    math(fx, R, 64, 's^{\\text{g-student}}_t = M_{\\text{sparsity}} \\odot [\\,M_{\\text{mode}} \\odot s^{\\text{g-upper}}_t,\\ M_{\\text{mode}} \\odot s^{\\text{g-lower}}_t\\,]', 14);
    var sw = CELLS.map(function (c, i) {
      var g = group(s), x = R + (i < 2 ? i * 136 : (i - 2) * 136), y = i < 2 ? 98 : 150;
      var box = rectBox(g, x, y, 128, 38, kindColor(c.kind), C_SURFACE);
      var tx = label(g, x + 64, y + 24, c.zh, 'demo-x-ink2', 11.5, 'middle');
      return { box: box, tx: tx, c: c };
    });
    var epTx = label(s, R, 214, '', 'demo-x-ink', 12);
    var Y = 236;
    var p1 = group(s);
    label(p1, R, Y + 14, '先挑模式：上下身各自独立', 'demo-x-ink', 13);
    label(p1, R, Y + 38, '上身：关键点 / 关节角；下身：关键点 / 关节角 / 根部', 'demo-x-ink2', 11.5);
    label(p1, R, Y + 60, '开着的格子，这一类目标的所有维度都给学生', 'demo-x-mut', 11);
    var p2 = group(s);
    label(p2, R, Y + 14, '论文图 2 的例子：上身跟关键点，下身跟关节角和根部', 'demo-x-ink', 12.5);
    var fig = paperPart(p2, 'fig2', 0.13, 0.0, 0.72, 1.0, R, Y + 30, 300, '论文图 2：下行全部目标 → 中行模式掩码之后 → 上行稀疏掩码之后');
    var p3 = group(s);
    rich(p3, R, Y + 14, '论文：每一位都是 $\\mathcal{B}(0.5)$', 13, 'demo-x-ink');
    label(p3, R, Y + 40, '回合开始时抽一次，整个回合不变', 'demo-x-ink2', 11.5);
    var tlG = group(p3), tlBars = [];
    for (var e = 0; e < 6; e++) tlBars.push(rectBox(tlG, R + e * 66, Y + 56, 62, 14, C_BORDER, C_SURFACE));
    label(p3, R, Y + 92, '一格一个回合；开关只在回合开头变', 'demo-x-mut', 10.5);
    var p4 = group(s);
    label(p4, R, Y + 14, '官方代码：从列出的四种模式里均匀挑一个', 'demo-x-ink', 12.5);
    var modeChips = MODES.map(function (m, i) { return { g: chip(p4, R + i * 102, Y + 28, 96, m.zh + ' · 1/4', C_HOVER, { size: 10.5 }), m: m }; });
    label(p4, R, Y + 82, '整组位一起开，不是逐位抽；README：手挑的四种，可以自己加', 'demo-x-mut', 10.5);
    var p5 = group(s);
    label(p5, R, Y + 14, '学生在训练里见过各种组合', 'demo-x-ink', 13);
    label(p5, R, Y + 38, '部署时：权重不变，换掩码就换模式', 'demo-x-ink2', 12);
    label(p5, R, Y + 60, '模式选好了，接着还有第二层：稀疏掩码', 'demo-x-mut', 11);
    var EP = 2.4;
    function draw(t, clock) {
      var now = nowOf(t, clock), on, txt;
      if (t < 3.6) { on = [1, 1, 1, 1, 1]; txt = '五个开关'; }
      else if (t < 7.0) { on = FIG2_EXAMPLE; txt = '图 2 的例子'; }
      else if (t < 10.4) {
        var ep = episodeOf(since(t, clock, 7.0), EP), rng = rngFor(ep, 5);
        on = CELLS.map(function () { return rng() < 0.5 ? 1 : 0; });
        txt = '第 ' + (ep + 1) + ' 个回合' + (on.every(function (b) { return !b; }) ? '：五个都关，这一回合什么都不跟' : '');
        tlBars.forEach(function (b, i) { b.style.fill = i === ep % 6 ? C_HOVER : C_SURFACE; });
      } else {
        var ep2 = episodeOf(since(t, clock, t < 13.4 ? 10.4 : 13.4), EP), pick = MODES[Math.floor(rngFor(ep2, 9)() * 4)];
        var mk = maskFrom(pick.bits);
        on = CELLS.map(function (c) { return c.bits.some(function (b) { return mk[b]; }) ? 1 : 0; });
        txt = '第 ' + (ep2 + 1) + ' 个回合：' + pick.zh + ' 模式';
        modeChips.forEach(function (mc) { mc.g.style.opacity = mc.m === pick ? 1 : 0.4; });
        bot.put(now, mk, 0);
      }
      if (t < 10.4) bot.put(now, cellsMask(on), 0);
      sw.forEach(function (w, i) {
        w.box.style.fill = on[i] ? kindColor(w.c.kind) : C_SURFACE;
        w.tx.setAttribute('class', on[i] ? 'demo-x-ink' : 'demo-x-mut');
        w.tx.style.fill = on[i] ? C_SURFACE : '';
      });
      epTx.textContent = txt;
      setOpacity(fx, seg(t, 0.3, 0.7));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
      void fig;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: 稀疏掩码：再关掉一部分 ── */
  function buildSceneSparsity() {
    var s = sceneSvg('左边 H1 走路，亮着的点随回合变；右边是 49 位的掩码条：挑中的模式里，每一位以一半的概率保留；接着是论文的例子、掩码本身也进观测、源码里注释掉的组合数、README 说的歧义');
    s.appendChild(svgText(24, 26, '稀疏掩码：挑中的模式里，再随机关掉一部分', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 330, 360, C_BORDER, C_SURFACE2);
    var bot = walker(left, 148, 196, 372, 40, 338, { r: 4, js: 4, hx: 40, ghost: true });
    var R = 374, RW = 402;
    var strip = maskStrip(s, R, 48, RW, 20);
    var info = label(s, R, 106, '', 'demo-x-ink', 12);
    var Y = 128;
    var p1 = group(s);
    label(p1, R, Y + 14, '打开的每一位，以 0.5 的概率保留', 'demo-x-ink', 13);
    label(p1, R, Y + 38, '例如 H2O 模式的 12 个点，每个回合随机留一半左右', 'demo-x-ink2', 11.5);
    label(p1, R, Y + 60, '代码：torch.bernoulli(mask × 0.5)', 'demo-x-mut', 11);
    var p2 = group(s);
    label(p2, R, Y + 14, '论文的例子', 'demo-x-ink', 13);
    chip(p2, R, Y + 28, 196, '上身：只跟两只手的位置', C_KIN, { size: 11.5 });
    chip(p2, R + 206, Y + 28, 196, '下身：只跟躯干的关节角', C_JNT, { size: 11.5 });
    label(p2, R, Y + 84, '模式掩码挑类别，稀疏掩码挑这一类里的哪几维', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, Y + 14, '掩码本身也进观测（论文没写，代码里有）', 'demo-x-ink', 13);
    chip(p3, R, Y + 28, 196, '左膝目标 = 0（要伸直）', C_JNT, { size: 11 });
    chip(p3, R + 206, Y + 28, 196, '左膝没给目标', C_MUTED, { size: 11, dash: '4 3' });
    label(p3, R, Y + 82, '代码注释：乘过掩码后两者都是 0，网络分不清；', 'demo-x-ink2', 11.5);
    label(p3, R, Y + 102, '再拼上 49 位掩码：1 是「目标为 0」，0 是「没给」', 'demo-x-ink2', 11.5);
    var p4 = group(s);
    label(p4, R, Y + 14, 'LaTeX 源码里注释掉的一行：能组合出多少种', 'demo-x-ink', 12.5);
    math(p4, R, Y + 52, '(2^{12}+2^{9}) \\times (2^{11}+2^{10}+2^{7}) = 14{,}745{,}600', 15);
    label(p4, R, Y + 86, '上身 12 个点或 9 个关节角的任意子集；', 'demo-x-ink2', 11.5);
    label(p4, R, Y + 106, '下身 11 个点、10 个关节角或 7 个根部量的任意子集', 'demo-x-ink2', 11.5);
    label(p4, R, Y + 128, '正式的 PDF 里没有这一行', 'demo-x-mut', 10.5);
    var p5 = group(s);
    label(p5, R, Y + 14, 'README：照这样随机关，会带来动作歧义', 'demo-x-ink', 13);
    label(p5, R, Y + 38, '默认关掉稀疏；若打开，OmniH2O 模式 3 位全关的概率', 'demo-x-ink2', 11.5);
    rich(p5, R, Y + 60, '$0.5^3 = 1/8$：那个回合学生什么目标都没有', 11.5, 'demo-x-ink2');
    label(p5, R, Y + 84, '代码注释建议：只在同一身体区域里关掉一小部分', 'demo-x-mut', 11);
    var EP = 2.4;
    function draw(t, clock) {
      var now = nowOf(t, clock), m, txt;
      if (t < 3.6 || (t >= 7.0 && t < 13.4)) {
        var ep = episodeOf(since(t, clock, t < 3.6 ? 0.4 : 7.0), EP), base = maskFrom(modeOf('h2o').bits);
        m = ep === 0 && t < 3.6 ? base : sparsify(base, rngFor(ep, 3));
        txt = 'H2O 模式 12 位 → 这个回合留 ' + maskCount(m) + ' 位';
      } else if (t < 7.0) {
        m = SPARSE_EXAMPLE; txt = '两只手的位置 + 躯干的关节角 = 3 位';
      } else {
        var ep5 = episodeOf(since(t, clock, 13.4), EP), b5 = maskFrom(modeOf('omnih2o').bits);
        m = sparsify(b5, rngFor(ep5, 17));
        txt = 'OmniH2O 模式 3 位 → 留 ' + maskCount(m) + ' 位' + (maskCount(m) ? '' : '：什么都不跟');
      }
      bot.put(now, m, 0);
      strip.set(m);
      info.textContent = txt;
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: DAgger：学生开车，老师标答案 ── */
  function buildSceneDagger() {
    var s = sceneSvg('一张循环图：仿真里的 H1 把状态交给学生，学生给出动作再交回仿真；同一个状态也交给教师，教师给出参考动作；两个动作的差就是损失，' +
      '沿虚线箭头回去更新学生；最后是官方代码的设置和训练时长对比');
    s.appendChild(svgText(24, 26, 'DAgger：学生自己开，教师在同一个状态上给答案', 'demo-x-ink2', 13.5));
    var simG = group(s);
    rectBox(simG, 30, 70, 210, 230, C_BORDER, C_SURFACE2);
    label(simG, 135, 92, '仿真（Isaac Gym）', 'demo-x-ink2', 12, 'middle');
    var bot = walker(simG, 92, 135, 286, 40, 230, { r: 2.6, js: 2.6, hx: 22, ghost: false });
    var stuG = group(s), teaG = group(s), lossG = group(s);
    var SX = 340, SY = 84, TY = 236, BW = 176, BH = 52;
    rectBox(stuG, SX, SY, BW, BH, C_HOVER, C_SURFACE);
    rich(stuG, SX + BW / 2, SY + 22, '学生 $\\pi^{\\text{student}}$', 12.5, 'demo-x-ink', 'middle');
    label(stuG, SX + BW / 2, SY + 42, '25 步历史 + 掩码后的命令', 'demo-x-mut', 10, 'middle');
    rectBox(teaG, SX, TY, BW, BH, C_WARN, C_SURFACE);
    rich(teaG, SX + BW / 2, TY + 22, '教师 $\\pi^{\\text{oracle}}$（冻结）', 12.5, 'demo-x-ink', 'middle');
    label(teaG, SX + BW / 2, TY + 42, '同一状态的特权观测', 'demo-x-mut', 10, 'middle');
    var LX = 600, LY = 160;
    rectBox(lossG, LX, LY, 170, BH, C_BAD, C_SURFACE);
    math(lossG, LX + 85, LY + 34, '\\mathcal{L} = \\lVert \\hat a_t - a_t \\rVert_2^2', 14, 'middle');
    var aStuIn = arrow(s, C_HOVER, 2.2), aStuOut = arrow(s, C_HOVER, 2.6), aTeaIn = arrow(s, C_WARN, 2.2), aTea = arrow(s, C_WARN, 2.6), aA = arrow(s, C_HOVER, 2), aUp = arrow(s, C_BAD, 2, '6 4');
    aStuIn.set(240, 120, SX - 4, SY + 18, 9);
    aStuOut.set(SX, SY + 40, 244, 156, 9);
    aTeaIn.set(240, 250, SX - 4, TY + 26, 9);
    aTea.set(SX + BW, TY + 20, LX + 30, LY + BH + 2, 9);
    aA.set(SX + BW, SY + 30, LX + 30, LY - 2, 9);
    aUp.set(LX + 140, LY - 4, SX + BW + 4, SY + 6, 9);
    var tags = group(s);
    rich(tags, 258, 104, '状态', 10.5, 'demo-x-mut');
    rich(tags, 256, 178, '动作 $a_t$', 11, 'demo-x-good');
    rich(tags, 252, 272, '同一个状态', 10.5, 'demo-x-mut');
    rich(tags, 528, 228, '$\\hat a_t$', 12, 'demo-x-warn');
    rich(tags, 528, 112, '$a_t$', 12, 'demo-x-good');
    rich(tags, 640, 104, '更新学生', 11, 'demo-x-bad');
    var dots = [dotAt(s, 0, 0, 4, C_HOVER), dotAt(s, 0, 0, 4, C_HOVER), dotAt(s, 0, 0, 4, C_WARN), dotAt(s, 0, 0, 4, C_WARN), dotAt(s, 0, 0, 4, C_BAD)];
    var paths = [[240, 120, SX - 4, SY + 18], [SX, SY + 40, 244, 156], [240, 250, SX - 4, TY + 26], [SX + BW, TY + 20, LX + 30, LY + BH + 2], [LX + 140, LY - 4, SX + BW + 4, SY + 6]];
    var Y = 322;
    var p1 = group(s);
    label(p1, 30, Y + 14, '每个回合在仿真里让学生自己开：它的动作决定下一步的状态', 'demo-x-ink', 13);
    label(p1, 30, Y + 38, '学生会犯错、会走到教师没去过的状态——数据就从那里来', 'demo-x-mut', 11.5);
    var p2 = group(s);
    label(p2, 30, Y + 14, '同一个状态，算出教师的特权观测，问教师该怎么做', 'demo-x-ink', 13);
    label(p2, 30, Y + 38, '教师已经训好、冻结；只负责标答案', 'demo-x-mut', 11.5);
    var p3 = group(s);
    label(p3, 30, Y + 14, '损失就是两个动作之差，监督学习更新学生', 'demo-x-ink', 13);
    label(p3, 30, Y + 38, '19 维的关节目标，一维一维地对答案：比奖励密得多', 'demo-x-mut', 11.5);
    var p4 = group(s);
    label(p4, 30, Y + 14, '和行为克隆的区别：数据来自学生自己走出的状态分布', 'demo-x-ink', 13);
    label(p4, 30, Y + 38, '学生一偏，教师就在偏了的地方纠正它', 'demo-x-mut', 11.5);
    var p5 = group(s);
    label(p5, 30, Y + 14, '官方代码：第 0 次迭代起就由学生开；每次每个环境走 1 步就更新', 'demo-x-ink', 12.5);
    label(p5, 30, Y + 36, '损失写的是不带平方的 L2 范数取平均；Adam，学习率 5e-4', 'demo-x-mut', 11);
    var tb = group(p5);
    var b1 = barRowAt(tb, 470, Y + 2, 72, '教师 PPO', C_WARN, 14), b2 = barRowAt(tb, 470, Y + 24, 72, '学生 DAgger', C_HOVER, 14);
    b1.set(150, '23.3 h'); b2.set(Math.max(2, 150 * TRAIN.stuIter * TRAIN.stuSec / (TRAIN.teachIter * TRAIN.teachSec)), '0.27 h');
    label(p5, 470, Y + 56, 'README，单张 RTX 4090', 'demo-x-mut', 10);
    var fx = [stuG, aStuIn, aStuOut], fy = [teaG, aTeaIn, aTea], fz = [lossG, aA, aUp];
    function draw(t, clock) {
      var now = nowOf(t, clock);
      bot.put(now, null, 0);
      var a1 = seg(t, 0.3, 0.7), a2 = seg(t, 3.9, 4.3), a3 = seg(t, 7.3, 7.7);
      fx.forEach(function (n) { setOpacity(n.g || n, a1); });
      fy.forEach(function (n) { setOpacity(n.g || n, a2); });
      fz.forEach(function (n) { setOpacity(n.g || n, a3); });
      setOpacity(tags, a1);
      var vis = [a1, a1, a2, a2, a3];
      dots.forEach(function (d, i) {
        var p = paths[i], u = ((now * 0.6) + i * 0.17) % 1;
        moveDot(d, [p[0] + (p[2] - p[0]) * u, p[1] + (p[3] - p[1]) * u]);
        d.style.opacity = vis[i];
      });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 两组横向条：专才 vs HOVER（或多模式 RL vs HOVER）；rows = [{ zh, a, b }]，返回 set(进度) */
  function pairBars(parent, x, y, labelW, maxW, rows, vmax, colA, colB, fmtV, rowH) {
    var g = group(parent), rh = rowH || 34, items = [];
    rows.forEach(function (r, i) {
      var yy = y + i * rh;
      label(g, x + labelW - 8, yy + rh / 2 + 2, r.zh, 'demo-x-ink2', 11, 'end');
      var bh = rh / 2 - 3, ba = hbar(g, x + labelW, yy + 2, bh, colA), bb = hbar(g, x + labelW, yy + rh / 2 + 1, bh, colB);
      var va = label(g, 0, yy + 2 + bh / 2 + 3.5, '', 'demo-x-mut', 9.5), vb = label(g, 0, yy + rh / 2 + 1 + bh / 2 + 3.5, '', 'demo-x-ink', 10);
      items.push({ r: r, ba: ba, bb: bb, va: va, vb: vb });
    });
    return {
      g: g,
      set: function (p) {
        items.forEach(function (it) {
          var wa = maxW * it.r.a / vmax * p, wb = maxW * it.r.b / vmax * p;
          setW(it.ba, wa); setW(it.bb, wb);
          it.va.setAttribute('x', (x + labelW + wa + 5).toFixed(1)); it.va.textContent = p > 0.95 ? fmtV(it.r.a) : '';
          it.vb.setAttribute('x', (x + labelW + wb + 5).toFixed(1)); it.vb.textContent = p > 0.95 ? fmtV(it.r.b) : '';
        });
      }
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

  /* ── scene 11: 表 III：和四个专才比 ── */
  function buildSceneTable3() {
    var s = sceneSvg('左边是项目页的仿真视频：同一个 HOVER 依次在头、H2O、OmniH2O 三种模式下跟同一段动作；右边是表 III 四种模式的全局位置误差，专才与 HOVER 各一条，' +
      '接着是每种模式加粗的项数、专才赢的那几项、论文图 3 的雷达图');
    s.appendChild(svgText(24, 26, '表 III：同一个 HOVER 套上固定掩码 vs 为这种模式专门训的专才', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'sim_modes', 28, 46, 300, 169, '项目页视频（仿真）：同一个 HOVER 同时跑三种模式', { labels: ['头模式', 'H2O 模式', 'OmniH2O 模式'] });
    var cg = group(s);
    label(cg, 28, 270, '加粗（5 个种子下显著更好）的项数 / 12', 'demo-x-ink', 12);
    var bolds = TABLE3.map(function (r, i) {
      var g = group(cg), y = 283 + i * 28;
      label(g, 28, y + 15, r.zh, 'demo-x-ink2', 11.5);
      chip(g, 116, y, 100, 'HOVER **' + r.boldH.length + '**', C_HOVER, { size: 11, h: 24 });
      chip(g, 226, y, 100, '专才 ' + r.boldS.length, C_ACCENT, { size: 11, h: 24 });
      return g;
    });
    var R = 360;
    var p1 = group(s);
    label(p1, R, 64, '比法', 'demo-x-ink', 14);
    chip(p1, R, 82, 416, '专才：只给它那种模式需要的观测，用**强化学习**训', C_ACCENT, { size: 11.5, left: true });
    chip(p1, R, 120, 416, 'HOVER：同一套权重，评测时套上对应模式的**固定掩码**', C_HOVER, { size: 11.5, left: true });
    rich(p1, R, 180, '在整个 $\\hat Q$ 上跑，12 项指标，5 个随机种子', 12, 'demo-x-ink2');
    label(p1, R, 204, '每种模式真正在跟的指标，表里涂了颜色', 'demo-x-mut', 11);
    var p2 = group(s);
    rich(p2, R, 64, '全局位置误差 $E_{\\text{g-mpjpe}}$（mm，越短越好）', 13, 'demo-x-ink');
    var bars = pairBars(p2, R, 80, 86, 270, TABLE3.map(function (r) { return { zh: r.zh, a: r.spec[1], b: r.hover[1] }; }), 280, C_ACCENT, C_HOVER, function (v) { return String(v); }, 40);
    legendRow(p2, R + 86, 260, [['专才', C_ACCENT], ['HOVER', C_HOVER]]);
    var red = label(p2, R, 290, 'ExBody 模式 275 → 185（−33%），H2O 模式 137 → 121（−12%）', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, '专才赢的 7 项', 'demo-x-ink', 14);
    [['加速度误差', 'ExBody、HumanPlus、H2O'], ['根部速度', 'ExBody、HumanPlus'], ['根部高度', 'HumanPlus'], ['偏航', 'OmniH2O']].forEach(function (r, i) {
      chip(p3, R, 82 + i * 38, 130, r[0], C_ACCENT, { size: 11.5 });
      label(p3, R + 142, 100 + i * 38, r[1], 'demo-x-ink2', 11.5);
    });
    label(p3, R, 252, '专才的动作更平滑、根部速度跟得更紧', 'demo-x-ink2', 12);
    label(p3, R, 274, '通才赢在位置和关节角：每种模式至少 7/12', 'demo-x-ink2', 12);
    var p4 = group(s);
    var fig = paperPart(p4, 'fig3', 0, 0, 1, 1, R + 60, 46, 300, '论文图 3：绿是 HOVER，蓝是专才（网越大越好）');
    var p5 = group(s);
    label(p5, R, 64, '论文的结论', 'demo-x-ink', 14);
    chip(p5, R, 82, 416, '即使只看一种模式，从教师**蒸馏**也比用强化学习训专才好', C_HOVER, { size: 11.5, left: true });
    label(p5, R, 142, '和教师比：H2O 模式全局 121 mm，教师 119 mm', 'demo-x-ink2', 12);
    label(p5, R, 164, 'ExBody 模式 185 mm：这个模式根本不给位置目标', 'demo-x-ink2', 12);
    label(p5, R, 196, '图 3 的根部旋转是横滚、俯仰、偏航的平均；', 'demo-x-mut', 11);
    label(p5, R, 216, 'OmniH2O 专才图上写 0.250，按表 III 平均是 0.167', 'demo-x-mut', 11);
    function draw(t, clock) {
      clip.at(K.clipSince(t, 0), true);
      setOpacity(cg, seg(t, 7.3, 7.7));
      bolds.forEach(function (g, i) { setOpacity(g, seg(t, 7.3 + 0.2 * i, 7.7 + 0.2 * i)); });
      bars.set(seg(t, 3.9, 5.2));
      setOpacity(red, seg(t, 5.4, 5.8));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
      void clock; void fig;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 表 IV：只跟一只手或头 ── */
  function buildSceneTable4() {
    var s = sceneSvg('左边是项目页的仿真视频：同一个 HOVER 在右手、双手、左手三种模式下跟动作；右边是表 IV：四种模式各训一个专才，只报在跟的那几个点的误差');
    s.appendChild(svgText(24, 26, '表 IV：只跟一只手、只跟头——再训四个专才比', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'sim_hands', 28, 46, 300, 169, '项目页视频（仿真）：同一个 HOVER 同时跑三种模式', { labels: ['右手模式', '双手模式', '左手模式'] });
    var lg = group(s);
    label(lg, 28, 270, '只给一只手的参考时：', 'demo-x-ink2', 12);
    label(lg, 28, 292, '专才只看得到这只手，要凭它把全身控制好', 'demo-x-ink2', 12);
    label(lg, 28, 318, 'HOVER：同一套权重，只开对应的几位', 'demo-x-ink2', 12);
    var R = 360;
    var p1 = group(s);
    label(p1, R, 64, '四种额外的模式', 'demo-x-ink', 14);
    TABLE4.forEach(function (r, i) {
      var ids = r.zh === '左手' ? [20] : r.zh === '右手' ? [21] : r.zh === '双手' ? [20, 21] : [22];
      chip(p1, R + (i % 2) * 210, 82 + Math.floor(i / 2) * 38, 200, r.zh + '模式：' + ids.length + ' 个关键点', C_KIN, { size: 11.5 });
    });
    label(p1, R, 180, '表里只报这种模式在跟的点（带 -mode 后缀）', 'demo-x-ink2', 12);
    var p2 = group(s);
    rich(p2, R, 64, '在跟的点的全局误差 $E_{\\text{g-mpjpe-mode}}$（mm）', 13, 'demo-x-ink');
    var bars = pairBars(p2, R, 80, 60, 290, TABLE4.map(function (r) { return { zh: r.zh, a: r.spec[0], b: r.hover[0] }; }), 230, C_ACCENT, C_HOVER, function (v) { return String(v); }, 40);
    legendRow(p2, R + 60, 260, [['专才', C_ACCENT], ['HOVER', C_HOVER]]);
    label(p2, R, 290, '右手：220 → 128 mm（−42%），差距最大', 'demo-x-mut', 11);
    var p3 = group(s);
    rich(p3, R, 64, '局部误差 $E_{\\text{mpjpe-mode}}$（mm）', 13, 'demo-x-ink');
    var bars2 = pairBars(p3, R, 80, 60, 290, TABLE4.map(function (r) { return { zh: r.zh, a: r.spec[1], b: r.hover[1] }; }), 230, C_ACCENT, C_HOVER, function (v) { return String(v); }, 40);
    label(p3, R, 260, '左手模式专才更好：147 对 151', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 64, '加速度与速度误差', 'demo-x-ink', 14);
    TABLE4.forEach(function (r, i) {
      label(p4, R, 100 + i * 34, r.zh, 'demo-x-ink2', 12);
      label(p4, R + 60, 100 + i * 34, '加速度 ' + r.spec[2] + ' → ' + r.hover[2], r.boldS.indexOf(2) >= 0 ? 'demo-x-bad' : 'demo-x-ink2', 11.5);
      label(p4, R + 230, 100 + i * 34, '速度 ' + r.spec[3] + ' → ' + r.hover[3], 'demo-x-ink2', 11.5);
    });
    label(p4, R, 252, '头模式的加速度专才更好：2.22 对 2.31', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, '16 项里 HOVER 显著更好 14 项', 'demo-x-ink', 14);
    chip(p5, R, 82, 416, '专才赢 2 项：左手的局部误差、头的加速度', C_ACCENT, { size: 11.5, left: true });
    label(p5, R, 140, '全局误差降幅：左手 −27%、右手 −42%、', 'demo-x-ink2', 12);
    label(p5, R, 162, '双手 −12%、头 −28%', 'demo-x-ink2', 12);
    label(p5, R, 196, '输入越稀疏，专才越吃力（我们的理解）', 'demo-x-ink2', 12);
    function draw(t, clock) {
      clip.at(K.clipSince(t, 0), true);
      bars.set(seg(t, 3.9, 5.2));
      bars2.set(seg(t, 7.3, 8.6));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
      void clock;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 13: 图 4：从头强化学习不行 ── */
  function buildSceneFig4() {
    var s = sceneSvg('左边是论文图 4 的四张雷达图；右边是 8 种模式的全局位置误差，多模式强化学习与 HOVER 各一条；接着是 32/32、论文的缩放公式和结论');
    s.appendChild(svgText(24, 26, '图 4：同样的掩码，从头用强化学习训一个多模式策略', 'demo-x-ink2', 13.5));
    var fig = paperPart(s, 'fig4', 0, 0, 1, 1, 30, 46, 300, '论文图 4：绿是 HOVER，紫是多模式强化学习');
    var R = 356;
    var p1 = group(s);
    label(p1, R, 64, '基线：多模式强化学习', 'demo-x-ink', 14);
    chip(p1, R, 82, 420, '命令上**同样的掩码过程**：回合开始时随机模式和稀疏，整回合不变', C_PURPLE, { size: 11, left: true });
    chip(p1, R, 120, 420, '但**不蒸馏**：直接用强化学习从头训', C_PURPLE, { size: 11.5, left: true });
    label(p1, R, 180, '比 8 种模式 × 4 项误差：根部 RPY、上身关节、', 'demo-x-ink2', 12);
    label(p1, R, 202, '局部位置、全局位置', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 64, '全身的全局位置误差（mm，越短越好）', 'demo-x-ink', 13);
    var bars = pairBars(p2, R, 76, 76, 270, FIG4.map(function (r) { return { zh: r.zh, a: r.other[3], b: r.hover[3] }; }), 380, C_PURPLE, C_HOVER, function (v) { return String(v); }, 36);
    legendRow(p2, R + 76, 380, [['多模式 RL', C_PURPLE], ['HOVER', C_HOVER]]);
    var p3 = group(s);
    label(p3, R, 64, '论文：HOVER 在 32/32 项上误差更低', 'demo-x-ink', 14);
    label(p3, R, 92, '差得最多的是只跟一只手：', 'demo-x-ink2', 12);
    chip(p3, R, 104, 200, '右手：374 对 191（1.96 倍）', C_PURPLE, { size: 11.5 });
    chip(p3, R + 210, 104, 200, '左手：350 对 204（1.72 倍）', C_PURPLE, { size: 11.5 });
    label(p3, R, 166, '8 种模式平均：254.4 对 167.25 mm', 'demo-x-ink2', 12);
    label(p3, R, 194, '图上两位小数的根部 RPY 有两处一样（ExBody、HumanPlus）', 'demo-x-mut', 10.5);
    label(p3, R, 216, '这里算全身所有点；表 IV 只算在跟的点，所以数不一样', 'demo-x-mut', 10.5);
    var p4 = group(s);
    label(p4, R, 64, '雷达图的缩放：网越大越好', 'demo-x-ink', 14);
    math(p4, R + 40, 118, '\\frac{E^{\\max} - E}{E^{\\max} - E^{\\min}}', 20);
    label(p4, R, 168, '最大、最小在什么范围里取，论文没说；', 'demo-x-ink2', 12);
    label(p4, R, 190, '按一张图里同一轴的 16 个数取：', 'demo-x-ink2', 12);
    label(p4, R, 212, 'HOVER 的 OmniH2O 模式 0.97，多模式 RL 的右手 0', 'demo-x-ink2', 12);
    label(p4, R, 236, '（我们的理解）', 'demo-x-mut', 10.5);
    var p5 = group(s);
    label(p5, R, 64, '结论', 'demo-x-ink', 14);
    chip(p5, R, 82, 420, '关键是从**跟踪全身运动学的教师**蒸馏', C_HOVER, { size: 12, left: true });
    label(p5, R, 140, '输入越稀疏，强化学习越难从零探索出好的全身动作；', 'demo-x-ink2', 12);
    label(p5, R, 162, '教师先学会全身模仿，学生只要照着它的动作学', 'demo-x-ink2', 12);
    function draw(t, clock) {
      bars.set(seg(t, 3.9, 5.4));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
      void clock; void fig;
    }
    return { el: s, draw: draw };
  }

  /* 切模式片段下面的标签：片段时间过了 SWITCH_AT 就换成第二个模式（循环播放时取余） */
  function switchTag(parent, x, y, w, id, a, b) {
    var g = group(parent);
    var ca = chip(g, x, y, w, a[0], a[1], { size: 11.5 });
    var cb = chip(g, x, y, w, b[0], b[1], { size: 11.5 });
    return {
      g: g,
      set: function (sec) {
        /* 换幕淡入时还没到 cue，sec 是负的：和 kit.js 的 svgClip 一样停在片段开头，不绕到片尾 */
        if (sec < 0) sec = 0;
        var u = ((sec % CLIP_DUR[id]) + CLIP_DUR[id]) % CLIP_DUR[id], second = u >= SWITCH_AT[id];
        ca.style.opacity = second ? 0 : 1; cb.style.opacity = second ? 1 : 0;
      }
    };
  }

  /* ── scene 14: 真机：表 V 与图 5 ── */
  function buildSceneReal() {
    var s = sceneSvg('左边是项目页的真机视频：H1 先站着跟零的根部速度，再跟根部俯仰，弯腰又直起来；右边是表 V 三种模式的全局位置误差、12 项赢 11 项、论文图 5、真机与仿真的误差对比');
    s.appendChild(svgText(24, 26, '真机：19 个自由度的 Unitree H1，20 段站立动作', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'sw_pitch', 40, 44, 256, 278, '项目页视频（真机）');
    var tag = switchTag(s, 40, 346, 256, 'sw_pitch', ['根部速度模式：0 m/s', C_ROOT], ['根部俯仰模式：−0.5 ~ 0.5 rad', C_ROOT]);
    var R = 330;
    var p1 = group(s);
    label(p1, R, 64, '真机评测', 'demo-x-ink', 14);
    chip(p1, R, 82, 446, 'Unitree H1：19 个自由度，约 51.5 kg、1.8 m', C_ACCENT, { size: 11.5, left: true });
    chip(p1, R, 120, 446, '$\\hat Q$ 里 20 段站立动作，每种设置测 5 次', C_ACCENT, { size: 11.5, left: true });
    label(p1, R, 180, '比 ExBody、HumanPlus、OmniH2O 三种模式的专才', 'demo-x-ink2', 12);
    var p2 = group(s);
    rich(p2, R, 64, '表 V：全局位置误差 $E_{\\text{g-mpjpe}}$（mm）', 13, 'demo-x-ink');
    var bars = pairBars(p2, R, 80, 90, 300, TABLE5.map(function (r) { return { zh: r.zh, a: r.spec[0], b: r.hover[0] }; }), 55, C_ACCENT, C_HOVER, function (v) { return f1(v); }, 44);
    legendRow(p2, R + 90, 230, [['专才', C_ACCENT], ['HOVER', C_HOVER]]);
    var p3 = group(s);
    label(p3, R, 64, '12 项里 HOVER 显著更好 11 项', 'demo-x-ink', 14);
    TABLE5.forEach(function (r, i) {
      label(p3, R, 98 + i * 30, r.zh, 'demo-x-ink2', 12);
      label(p3, R + 100, 98 + i * 30, '赢 ' + r.boldH.length + ' / 4', r.boldH.length === 4 ? 'demo-x-good' : 'demo-x-ink2', 12);
    });
    chip(p3, R, 196, 446, '唯一输的：HumanPlus 模式的根部 RPY，0.038 对 0.035', C_ACCENT, { size: 11.5, left: true });
    var p4 = group(s);
    var fig = paperPart(p4, 'fig5', 0, 0, 1, 1, R, 54, 446, '论文图 5：上身关节模式 · 根部俯仰模式 · 全身运动学模式（跑步）');
    label(p4, R, 54 + fig.h + 44, '右边：全身运动学跟踪下，真机跟上了高动态的跑步动作', 'demo-x-ink2', 12);
    var p5 = group(s);
    label(p5, R, 64, '真机误差比仿真小得多', 'demo-x-ink', 14);
    var bb = barRowAt(p5, R, 84, 120, '真机（表 V）', C_HOVER, 16); bb.set(47.4 / 185 * 260, '47–49 mm');
    var bc = barRowAt(p5, R, 108, 120, '仿真（表 III）', C_HOVER, 16); bc.set(260, '121–185 mm');
    label(p5, R, 156, '真机只测了站立动作，专才也跟得不错（我们的理解）', 'demo-x-mut', 11);
    label(p5, R, 178, '差距：全局误差只低 5–7%', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var sec = K.clipSince(t, 0);
      clip.at(sec, true);
      tag.set(sec);
      bars.set(seg(t, 3.9, 5.2));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
      void clock;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 15: 边走边切模式 ── */
  function buildSceneSwitch() {
    var s = sceneSvg('前半：两段项目页的真机视频并排，左边向前走时从 ExBody 模式切到 H2O 模式，右边转身后退时从 HumanPlus 模式切到 OmniH2O 模式，下面的标签按视频里字幕换掉的时刻切换；' +
      '后半：Vision Pro 遥操作，先是只跟双手，再是只跟左手');
    s.appendChild(svgText(24, 26, '同一套权重，运行中突然换掩码', 'demo-x-ink2', 13.5));
    var A = group(s);
    var cW = projClip(A, 'sw_walk', 40, 44, 196, 263, '项目页视频（真机）：向前走');
    var cT = projClip(A, 'sw_turn', 268, 44, 196, 263, '项目页视频（真机）：转身、后退');
    var tW = switchTag(A, 40, 334, 196, 'sw_walk', ['ExBody 模式', C_JNT], ['H2O 模式', C_KIN]);
    var tT = switchTag(A, 268, 334, 196, 'sw_turn', ['HumanPlus 模式', C_JNT], ['OmniH2O 模式', C_KIN]);
    var B = group(s);
    var cV = projClip(B, 'vr_two', 40, 56, 424, 239);
    var cL = projClip(B, 'vr_left', 40, 56, 424, 239);
    label(B, 252, 312, '项目页视频（真机）：Vision Pro 遥操作，画面右上绿字在跟、白字遮掉', 'demo-x-mut', 9.5, 'middle');
    var R = 494;
    var p1 = group(s);
    label(p1, R, 64, '图 6(a)：向前走时', 'demo-x-ink', 14);
    chip(p1, R, 82, 282, 'ExBody：上身关节角 + 根部', C_JNT, { size: 11.5 });
    var a1 = arrow(p1, C_MUTED, 2); a1.set(R + 141, 112, R + 141, 126, 7);
    chip(p1, R, 130, 282, 'H2O：肩、肘、手、踝的位置', C_KIN, { size: 11.5 });
    label(p1, R, 190, '视频第 8.4 s 切换', 'demo-x-mut', 11);
    var p2 = group(s);
    label(p2, R, 64, '图 6(b)：转身、后退时', 'demo-x-ink', 14);
    chip(p2, R, 82, 282, 'HumanPlus：全身关节角 + 根部', C_JNT, { size: 11.5 });
    var a2 = arrow(p2, C_MUTED, 2); a2.set(R + 141, 112, R + 141, 126, 7);
    chip(p2, R, 130, 282, 'OmniH2O：头和双手的位置', C_KIN, { size: 11.5 });
    label(p2, R, 190, '视频第 4.8 s 切换', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, '切换时只换掩码', 'demo-x-ink', 14);
    label(p3, R, 92, '权重一点不变：', 'demo-x-ink2', 12);
    label(p3, R, 114, '关节角目标关掉、位置目标打开', 'demo-x-ink2', 12);
    label(p3, R, 146, '论文：能平滑地跟踪各种模式', 'demo-x-ink2', 12);
    label(p3, R, 178, '切换前后的误差、摔倒率论文没给', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 64, '图 6(c)：Vision Pro 遥操作', 'demo-x-ink', 14);
    chip(p4, R, 82, 282, '双手模式：只跟两只手', C_KIN, { size: 11.5 });
    label(p4, R, 140, '随机遮掉头和手的位置', 'demo-x-ink2', 12);
    label(p4, R, 162, '画面右上：绿字在跟，白字遮掉', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, '左手模式：只跟左手', 'demo-x-ink', 14);
    chip(p5, R, 82, 282, '人的右手怎么挥，机器人都不管', C_KIN, { size: 11.5 });
    label(p5, R, 140, '论文：参考动作有遮挡时也能跟', 'demo-x-ink2', 12);
    label(p5, R, 162, '（比如 VR 看不到一只手）', 'demo-x-mut', 11);
    function draw(t, clock) {
      var sa = K.clipSince(t, 0.4), visA = t < 10.4;
      cW.at(sa, visA); cT.at(sa, visA); tW.set(sa); tT.set(sa);
      cV.at(K.clipSince(t, 10.4), t >= 10.4 && t < 13.4);
      cL.at(K.clipSince(t, 13.4), t >= 13.4);
      setOpacity(A, 1 - seg(t, 10.4, 10.7));
      setOpacity(B, seg(t, 10.7, 11.0));
      setOpacity(cV.g, 1 - seg(t, 13.4, 13.55));
      setOpacity(cL.g, seg(t, 13.55, 13.7));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
      void clock;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 16: 局限与代码 ── */
  function buildSceneLimits() {
    var s = sceneSvg('左边 H1 走路，每 2.4 秒换一种代码里的模式；右边依次是：论文的局限、官方代码和论文的不同、专才不是全输、掩码进观测、最后一句总结');
    s.appendChild(svgText(24, 26, '局限、代码与小结', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 330, 360, C_BORDER, C_SURFACE2);
    var bot = walker(left, 148, 196, 372, 40, 338, { r: 4, js: 4, hx: 40, ghost: true });
    var modeTx = label(left, 189, 62, '', 'demo-x-ink', 13, 'middle');
    var R = 374, W = 402;
    var p1 = group(s);
    label(p1, R, 64, '论文的局限', 'demo-x-ink', 14);
    chip(p1, R, 82, W, '用哪种模式由人指定：以后要做**自动切换模式**的模块', C_BAD, { size: 11.5, left: true });
    label(p1, R, 140, '真机的定量评测只有 20 段站立动作；', 'demo-x-ink2', 12);
    label(p1, R, 162, '切模式只有视频，没有切换前后的数字', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 64, '官方代码（Isaac Lab 版）和论文不一样', 'demo-x-ink', 14);
    ['模式掩码：从四种模式里均匀挑一个', '稀疏掩码：默认关，README 说会有歧义', '默认配置训的是 OmniH2O 专才', '奖励：没有根部速度、根部旋转、刚体旋转'].forEach(function (n, i) {
      chip(p2, R, 82 + i * 36, W, n, C_WARN, { size: 11.5, left: true });
    });
    label(p2, R, 240, '论文的实验在 Isaac Gym 里做；代码是之后的重写版', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, '专才不是全输', 'demo-x-ink', 14);
    chip(p3, R, 82, W, '表 III：加速度误差、根部速度，专才更好', C_ACCENT, { size: 11.5, left: true });
    label(p3, R, 140, '「通才更好是因为共享物理知识」是论文的假设', 'demo-x-ink2', 12);
    var p4 = group(s);
    label(p4, R, 64, '一个论文没写的细节', 'demo-x-ink', 14);
    chip(p4, R, 82, W, '掩码本身（49 维）也拼进学生的观测', C_PURPLE, { size: 11.5, left: true });
    label(p4, R, 140, '学生合计 1782 维：44 + 95 + 49 + 19 + 1575', 'demo-x-ink2', 12);
    var p5 = group(s);
    label(p5, R, 64, '三句话', 'demo-x-ink', 14);
    chip(p5, R, 82, W, '① 各种接口都是**全身运动学模仿**的子集', C_HOVER, { size: 11.5, left: true });
    chip(p5, R, 120, W, '② 教师全都看、全都跟；学生看**掩码后的命令**', C_HOVER, { size: 11.5, left: true });
    chip(p5, R, 158, W, '③ 同一套权重，**换掩码就换模式**', C_HOVER, { size: 11.5, left: true });
    function draw(t, clock) {
      var now = nowOf(t, clock), ep = episodeOf(now, 2.4), m = MODES[ep % 4];
      bot.put(now, maskFrom(m.bits), 0);
      modeTx.textContent = m.zh + ' 模式';
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  var HOVER_SCENES = [
    {
      title: '每篇一套接口',
      dur: 16,
      build: buildSceneInterfaces,
      cues: [
        { at: 0.4, s: '走路、导航跟**根部速度**，表情动作跟**关节角**，遥操作跟几个**关键点的位置**：每篇工作选了一种接口。' },
        { at: 3.6, s: '一种接口就要自己的观测、自己的奖励设计、单独训一个策略；换一个任务，就得从头再来。' },
        { at: 7.0, s: '一个控制器只会一种模式：在不平的地上走路的控制器，很难无缝切到需要关节角的双臂精细操作。' },
        { at: 10.4, s: '上面接的东西也五花八门：手柄、动捕、外骨骼、VR，预训练的操作策略又输出关节角或末端位置。' },
        { at: 13.4, s: '问题：能不能**一个控制器**支持所有模式？HOVER = Humanoid Versatile Controller，ICRA 2025。' }
      ]
    },
    {
      title: '共同的底座：全身模仿',
      dur: 16,
      build: buildSceneInsight,
      cues: [
        { at: 0.4, s: '四种接口底下是同一件事：**全身运动学模仿**——稳、像人的全身动作。' },
        { at: 3.6, s: '论文图 2：左边是重定向的动作库，中间是三种目标和两层掩码，右边是教师监督 HOVER 策略。' },
        { at: 7.0, s: '两步走：先用 PPO 训一个**特权教师**把全身都跟上，再用 DAgger 把它蒸馏进看**掩码后命令**的学生。' },
        { at: 10.4, s: '论文的假设：平衡、像人的动作、精确的肢体控制在各种模式之间共享；专才容易过拟合自己的奖励。' },
        { at: 13.4, s: '三条贡献：统一的多模式控制器；蒸馏让技能跨模式共享、比专才好；仿真和真机里无缝切换模式。' }
      ]
    },
    {
      title: '一个命令空间：三种目标',
      dur: 16,
      build: buildSceneSpace,
      cues: [
        { at: 0.4, s: '① **运动学位置**：23 个刚体点的 3D 位置（20 个连杆 + 两手 + 头），69 维。' },
        { at: 3.6, s: '② **关节角**：19 个电机的目标角度。相当于丢掉了全局位置的运动学模仿。' },
        { at: 7.0, s: '③ **根部**：三个方向的线速度、横滚、俯仰、偏航之差、高度，7 维；合起来 $95 = 23 \\times 3 + 19 + 7$。' },
        { at: 10.4, s: '论文图 1 中间：亮着的格子是正在跟的命令，右边的虚线框是掩码，决定打开哪几块。' },
        { at: 13.4, s: '两条标准：**通用性**（覆盖前人、能接各种设备）和**原子性**（维度独立、可任意组合）；分上下身两块。' }
      ]
    },
    {
      title: '前人的接口都是子集（表 I）',
      dur: 16,
      build: buildSceneSubsets,
      cues: [
        { at: 0.4, s: '表 I：**ExBody** 跟上身关节角 + 根部。官方代码里是 9 个关节角 + 7 个根部量 = 16 位。' },
        { at: 3.6, s: '**H2O** 跟关键点位置：论文写 8 个点（肩、肘、手、踝），代码的正则匹配到每侧 3 个肩部连杆，实际是 12 位。' },
        { at: 7.0, s: '**OmniH2O** 只跟头和双手 3 个点：3 位。' },
        { at: 10.4, s: '**HumanPlus** 跟全身关节角 + 根部，26 位；v2 加的 **MHC** 也是这几格：多模式，但只有关节角和根部、不能任意子集。' },
        { at: 13.4, s: '**HOVER** 六格全有、49 位都能开，还能跟踪**任意子集**。' }
      ]
    },
    {
      title: '数据：AMASS 重定向到 H1',
      dur: 16,
      build: buildSceneRetarget,
      cues: [
        { at: 0.4, s: '① 正运动学：由关节角算出 H1 的关键点位置。' },
        { at: 3.6, s: '② 拟合 SMPL：优化 10 个形状参数，让 14 对关节点对上 H1。我们用官方脚本跑出来，$\\beta\'$ 有一维到了 −42.5：关节点对上了，网格已经不像人。' },
        { at: 7.0, s: '③ 梯度下降：逐帧解出 H1 的关节角，对齐 11 对点，把 AMASS 的动作重定向到 H1；500 步后平均还相距 66 mm。' },
        { at: 10.4, s: '④ 沿用 H2O 的 sim-to-data：在仿真里筛掉做不到的动作，得到数据集 $\\hat{Q}$。' },
        { at: 13.4, s: 'README：AMASS 的许可不让分发重定向好的数据；整个 AMASS 在 32 核机器上最多要跑 4 天。' }
      ]
    },
    {
      title: '特权教师：全都看、全都跟',
      dur: 16,
      build: buildSceneOracle,
      cues: [
        { at: 0.4, s: '教师看所有刚体的位置、旋转、速度、角速度和上一步动作，加上与下一帧参考之差：$\\pi^{\\text{oracle}}$。' },
        { at: 3.6, s: '网络照搬 OmniH2O：三层 MLP，512、256、128。官方代码里观测 913 维。' },
        { at: 7.0, s: '表 II 的奖励：惩罚 4 项、正则 12 项、任务 8 项；比 OmniH2O 多了**根部速度**和**根部旋转**（我们的理解：因为命令空间里有根部）。' },
        { at: 10.4, s: '域随机化照搬 OmniH2O：摩擦、质量、质心、PD 增益、力矩噪声、延迟、推一把、地形。' },
        { at: 13.4, s: '教师是上限：存活 99.3%、全局误差 119 mm；它不部署，只给学生当老师。' }
      ]
    },
    {
      title: '学生的本体感受：25 步历史',
      dur: 16,
      build: buildSceneProprio,
      cues: [
        { at: 0.4, s: '学生只看真机拿得到的：关节位置、关节速度、根角速度、重力方向，加上一步动作。' },
        { at: 3.6, s: '照搬 OmniH2O，叠最近 **25 步**的历史；没有全局线速度。' },
        { at: 7.0, s: '再加上掩码后的 95 维命令；官方代码里还拼上**掩码本身**的 49 位。' },
        { at: 10.4, s: '官方代码里学生一共 **1782 维**：这一步 44 + 命令 95 + 掩码 49 + 上一步动作 19 + 历史 25 × 63。' },
        { at: 13.4, s: '对比 OmniH2O 的学生 1665 维：目标那一块从 27 维换成了 95 + 49 = 144 维。' }
      ]
    },
    {
      title: '模式掩码：上下身各挑一种',
      dur: 16,
      build: buildSceneModeMask,
      cues: [
        { at: 0.4, s: '学生的命令先乘**模式掩码**：上半身、下半身各自独立地选跟哪种目标。' },
        { at: 3.6, s: '论文图 2 的例子：上身跟关键点位置，下身跟关节角和根部。' },
        { at: 7.0, s: '论文：每一位都取自 $\\mathcal{B}(0.5)$，回合开始时抽一次，**整个回合不变**。' },
        { at: 10.4, s: '官方代码不一样：从列出的**四种模式**里均匀挑一个，整组位一起打开。' },
        { at: 13.4, s: '学生在训练里见过各种组合；部署时权重不变，换掩码就换模式。' }
      ]
    },
    {
      title: '稀疏掩码：再关掉一部分',
      dur: 16,
      build: buildSceneSparsity,
      cues: [
        { at: 0.4, s: '再乘**稀疏掩码**：挑中的模式里，每一位以 0.5 的概率保留。' },
        { at: 3.6, s: '论文的例子：上身只跟两只手的位置，下身只跟躯干的关节角。' },
        { at: 7.0, s: '代码把**掩码本身**也拼进观测；代码注释说：不然「目标恰好为 0」和「被关掉」分不清。' },
        { at: 10.4, s: 'LaTeX 源码里注释掉的一行：$(2^{12}+2^{9}) \\times (2^{11}+2^{10}+2^{7}) = 14{,}745{,}600$ 种。' },
        { at: 13.4, s: 'README：这样随机关会带来**动作歧义**，代码默认关掉稀疏；若打开，3 位全关的概率是 1/8。' }
      ]
    },
    {
      title: 'DAgger：学生开车，老师标答案',
      dur: 16,
      build: buildSceneDagger,
      cues: [
        { at: 0.4, s: '每个回合让**学生自己开**：它的动作决定仿真里的下一个状态。' },
        { at: 3.6, s: '同一个状态算出教师的特权观测，问冻结的教师该怎么做，得到 $\\hat a_t$。' },
        { at: 7.0, s: '损失是两个动作之差 $\\lVert \\hat a_t - a_t \\rVert_2^2$，用监督学习更新学生。' },
        { at: 10.4, s: '和行为克隆的区别：数据来自学生自己走出的状态，学生一偏，教师就在那里纠正。' },
        { at: 13.4, s: '官方代码：每次迭代每个环境走 1 步就更新；README：RTX 4090 上教师 10 万次迭代 23.3 小时，学生 1 万次 0.27 小时。' }
      ]
    },
    {
      title: '表 III：和四个专才比',
      dur: 16,
      build: buildSceneTable3,
      cues: [
        { at: 0.4, s: '专才只给它那种模式的观测、用强化学习训；HOVER 用同一套权重，套上对应的固定掩码。' },
        { at: 3.6, s: '全局位置误差：ExBody 模式 275 → 185 mm，HumanPlus 266 → 182，H2O 137 → 121，OmniH2O 149 → 128。' },
        { at: 7.0, s: '12 项里 HOVER 显著更好的：7、7、8、7 项；专才只有 2、3、1、1 项。' },
        { at: 10.4, s: '论文图 3 把表 III 画成雷达图：绿色的网几乎处处包住蓝色，只有根部速度一轴专才更好或持平。' },
        { at: 13.4, s: '论文：即使只看一种模式，从教师**蒸馏**也比用强化学习训专才好。' }
      ]
    },
    {
      title: '表 IV：只跟一只手或头',
      dur: 16,
      build: buildSceneTable4,
      cues: [
        { at: 0.4, s: '再加四种模式：只跟左手、只跟右手、只跟双手、只跟头，各训一个专才。' },
        { at: 3.6, s: '在跟的点的全局误差：左手 189 → 138，右手 220 → 128，双手 137 → 120，头 186 → 133 mm。' },
        { at: 7.0, s: '局部误差也大多更低，只有左手模式专才更好：147 对 151。' },
        { at: 10.4, s: '加速度和速度误差：头模式的加速度专才更好，2.22 对 2.31。' },
        { at: 13.4, s: '16 项里 HOVER 显著更好 14 项；我们的理解：输入越稀疏，专才越吃力。' }
      ]
    },
    {
      title: '图 4：从头强化学习不行',
      dur: 16,
      build: buildSceneFig4,
      cues: [
        { at: 0.4, s: '基线：**多模式强化学习**——命令上用同样的掩码过程，但不蒸馏，从头用强化学习训。' },
        { at: 3.6, s: '8 种模式下全身的全局位置误差：只跟右手时 374 对 191 mm，只跟左手时 350 对 204（表 IV 只算在跟的点，数不一样）。' },
        { at: 7.0, s: '论文：8 种模式 × 4 项误差，HOVER **32/32** 项都更低；图上 ExBody、HumanPlus 的根部 RPY 两位小数相同。' },
        { at: 10.4, s: '雷达图把误差缩放成 $\\frac{E^{\\max}-E}{E^{\\max}-E^{\\min}}$，网越大越好。' },
        { at: 13.4, s: '结论：关键是从**跟踪全身运动学的教师**蒸馏；输入越稀疏，从头强化学习越难。' }
      ]
    },
    {
      title: '真机：表 V 与图 5',
      dur: 16,
      build: buildSceneReal,
      cues: [
        { at: 0.4, s: '真机：19 个自由度的 Unitree H1，跟 $\\hat{Q}$ 里 20 段站立动作，每种设置测 5 次。' },
        { at: 3.6, s: '全局位置误差：ExBody 模式 51.3 → 48.9 mm，HumanPlus 51.0 → 47.4，OmniH2O 51.2 → 47.5。' },
        { at: 7.0, s: '12 项赢 11 项；唯一输的是 HumanPlus 模式的根部 RPY，0.038 对 0.035。' },
        { at: 10.4, s: '论文图 5：上身关节模式、根部俯仰模式，还有全身运动学模式下的跑步。' },
        { at: 13.4, s: '真机误差 47–49 mm，比仿真小得多，和专才的差距也只有 5–7%；我们推测，是因为真机只测了站立动作。' }
      ]
    },
    {
      title: '边走边切模式',
      dur: 16,
      build: buildSceneSwitch,
      cues: [
        { at: 0.4, s: '图 6(a)：向前走的过程中，从 **ExBody 模式**突然切到 **H2O 模式**。' },
        { at: 3.6, s: '图 6(b)：转身、后退的过程中，从 **HumanPlus 模式**切到 **OmniH2O 模式**。' },
        { at: 7.0, s: '切换时只换掩码（关掉关节角和根部、打开关键点位置），权重一点不变；切换前后的误差，论文没有给数字。' },
        { at: 10.4, s: '图 6(c)：Vision Pro 遥操作，随机遮掉头和手：**双手模式**只跟两只手。' },
        { at: 13.4, s: '**左手模式**只跟左手，人的右手怎么挥都不管——参考有遮挡时也能跟。' }
      ]
    },
    {
      title: '局限与代码',
      dur: 16,
      build: buildSceneLimits,
      cues: [
        { at: 0.4, s: '局限：用哪种模式由人指定，论文说以后要做**自动切换模式**的模块。' },
        { at: 3.6, s: '官方代码（Isaac Lab 版）：模式从四种里挑、稀疏默认关、默认训 OmniH2O 专才、奖励少了根部两项。' },
        { at: 7.0, s: '专才不是全输：加速度误差和根部速度更好；「通才更好」的解释是论文的假设。' },
        { at: 10.4, s: '论文没写的细节：**掩码本身**也进观测，学生合计 1782 维。' },
        { at: 13.4, s: 'HOVER：各种接口都是全身模仿的子集，教师全都跟，学生看掩码后的命令，**换掩码就换模式**。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十六幕动画：HOVER 全流程速览',
      sub: '约 256 秒自动播放。空格播放/暂停，← → 换幕；H1 用我们重算的一段走路按真实模型做 3D 渲染，表格与图来自论文，仿真与真机片段剪自项目页的视频。',
      ariaLabel: 'HOVER 十六幕讲解动画',
      notes: [
        '取数依据：表 I–V、图 3–4 的数字照抄 arXiv 2410.21229（v1、v2 一样）；代码里的数（49 位掩码、95 维命令、四种模式各开哪几位、学生 1782 维、奖励权重、DAgger 的设置、训练时长）读自 NVlabs/HOVER（Isaac Lab 版）与它的 README；14,745,600 是 LaTeX 源码里注释掉的一行。',
        'H1 的动作是我们用官方 human2humanoid 的 `grad_fit_h1_shape.py`、`grad_fit_h1.py`，以 SMPL 在 AMASS 的 CMU `07_01` 上**重算的走路**（第 0–2.6 s，15 fps 共 40 帧），不是论文的数据；身上 23 个点用官方仓库的 `h1.xml` 做正运动学算出。第 8、9、16 幕的回合与随机掩码是示意，第 4 幕 HOVER 那一行的随机子集也是。',
        'H1 的 3D 外形：材质与光照照抄 Robot Retarget Online（ImChong/Robot_Retarget_Online）的 three.js 场景，按关节角用正交相机逐帧离线渲染成贴图；第 5 幕的 SMPL 人体按同一台相机渲染；点和箭头用同一套投影叠在上面。仿真与真机片段剪自项目页 hover-versatile-humanoid.github.io 的视频，模式标签按视频里字幕换掉的时刻标。'
      ],
      scenes: HOVER_SCENES
    });
  }

  // ─── the narrated vertical video of the same sixteen scenes ──────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：HOVER 十六幕全流程',
      sub: '13 分 11 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十六幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '16.7 MB',
      fileName: 'HOVER_讲解视频.mp4'
    });
  }

  // ─── 演示 1：掩码浏览器 ─────────────────────────────────────────────────────
  function buildMaskDemo(host) {
    var root = card(host, {
      title: '掩码浏览器：49 位掩码 → 95 维命令 → 1782 维观测',
      sub: '一段 H1 走路（我们用 SMPL 在 AMASS 的 CMU 07_01 上重算的）逐帧看：选一种模式、打开稀疏掩码，蓝点 / 黄菱形 / 紫箭头是还在跟的目标，淡灰圈是被关掉的关键点；下面是 95 维命令里非零的那几维。'
    });
    var state = { k: EX_K, lag: EX_LAG, mode: 'exbody', sparse: false, seed: 1 };
    var row = controlsRow(root);
    slider(row, { label: '参考帧（15 fps）', min: 1, max: WALK.n - 2, step: 1, value: EX_K, format: function (v) { return '第 ' + f2(v / WALK.fps) + ' s'; }, onInput: function (v) { state.k = v; render(); } });
    slider(row, { label: '机器人落后', min: 0, max: 6, step: 1, value: EX_LAG, format: function (v) { return v + ' 帧（' + f2(v / WALK.fps) + ' s）'; }, onInput: function (v) { state.lag = v; render(); } });
    var row2 = controlsRow(root);
    buttonGroup(row2, { label: '模式（官方代码的四种 + 全开）', items: MODES.map(function (m) { return { label: m.zh, value: m.key }; }).concat([{ label: '全开（49 位）', value: 'all' }]), value: state.mode, onPick: function (v) { state.mode = v; render(); } });
    var row3 = controlsRow(root);
    buttonGroup(row3, { label: '稀疏掩码', items: [{ label: '关（代码默认）', value: false }, { label: '开：每位 0.5 保留', value: true }], value: false, onPick: function (v) { state.sparse = v; render(); } });
    buttonGroup(row3, { label: '', items: [{ label: '重新抽一次', value: 'again' }], value: null, onPick: function () { state.seed += 1; render(); } });
    var svg = sceneSvg('一台 H1 走路：还在跟的关键点、关节角、根部亮着，被关掉的关键点只留淡灰圈；下面一条 49 位掩码', '0 0 640 420');
    var wrap = el('div', 'demo-stage');
    wrap.appendChild(svg);
    root.appendChild(wrap);
    var GY = 330, SC = 150;
    var ground = groundTicks(svg, 120, 520, GY);
    var mesh = h1Mesh(svg);
    var ov = modeOverlay(svg, { r: 4, js: 4, hx: 44, ghost: true });
    var strip = maskStrip(svg, 40, 362, 560, 18);
    var stats = statsRow(root);
    var sBits = stats.add('掩码打开'), sNz = stats.add('命令非零'), sObs = stats.add('学生观测');
    var tb = table(root);
    note(root, ['命令照官方 `student_observations.py` 算：关键点是参考的点减去**机器人自己的根部**、转到机器人的朝向坐标系；关节角是参考减当前；根部是参考的线速度（参考的根部坐标系）、横滚、俯仰、偏航之差、高度。「机器人落后几帧」是我们的假设，用来让命令不全是 0；默认的第 1.33 s、落后 3 帧就是笔记「🚶 具体实例」的例 2、例 3。',
      '模式掩码照官方代码（一次开整组位）；稀疏掩码照 `torch.bernoulli(mask * 0.5)`，随机数是确定性的，「重新抽一次」换种子。论文里的模式掩码是逐位随机，见第 8 幕。']);
    function maskNow() {
      var base = state.mode === 'all' ? maskFrom(range(0, NBIT)) : maskFrom(modeOf(state.mode).bits);
      return state.sparse ? sparsify(base, K.mulberry32(state.seed * 104729 + 7)) : base;
    }
    function render() {
      /* H1 是机器人自己（落后的那一帧），点和箭头是参考（同一台相机）：点在机器人前面多远，就是命令里的位置差 */
      var m = maskNow(), rob = frame(state.k - state.lag), ref = frame(state.k);
      var cam = followCam(rob, SC, 300, GY);
      ground.put(rob, cam);
      mesh.put(rob.root, cam, rob.k);
      ov.put(ref, cam, m);
      strip.set(m);
      var cmd = command(state.k, state.lag), mc = maskCommand(cmd, m);
      var nz = mc.filter(function (v) { return Math.abs(v) > 5e-4; }).length;
      sBits.set(maskCount(m) + ' / ' + NBIT + ' 位', 'accent');
      sNz.set(nz + ' / ' + NCMD + ' 维');
      sObs.set(STU_DIM + ' 维', 'good');
      tb.clear();
      tb.row(['类别', '名字', '值（乘掩码之前）', '进不进'], true);
      var rows = [];
      for (var b = 0; b < NB; b++) rows.push(['关键点', BODY_ZH[b], vec(cmd.kin[b]) + ' m', m[b]]);
      for (var j = 0; j < NJ; j++) rows.push(['关节角', JOINT_ZH[j], sgn(f3(cmd.joint[j])) + ' rad', m[jbit(j)]]);
      ROOT_ZH.forEach(function (n, i) { rows.push(['根部', n, sgn(f3(cmd.root[i])) + (i < 3 ? ' m/s' : i < 6 ? ' rad' : ' m'), m[NB + NJ + i]]); });
      rows.filter(function (r) { return r[3]; }).forEach(function (r) { tb.row([r[0], r[1], r[2], '✓']); });
      tb.row(['其余', (rows.length - rows.filter(function (r) { return r[3]; }).length) + ' 项', '乘成 0', '✗']);
    }
    registerRenderer(render);
    render();
  }

  // ─── 演示 2：雷达图（图 3、图 4） ───────────────────────────────────────────
  function buildRadarDemo(host) {
    var root = card(host, {
      title: '雷达图：图 3（对专才）与图 4（对多模式强化学习）',
      sub: '选一张图、一种模式：绿色是 HOVER，另一色是对手；每个轴按论文的缩放 $(E^{\\max}-E)/(E^{\\max}-E^{\\min})$ 画，网越大越好。数字是图上标的。'
    });
    var state = { fig: 'fig3', i: 0 };
    var row = controlsRow(root);
    var modeBtns;
    buttonGroup(row, { label: '哪张图', items: [{ label: '图 3：对四个专才', value: 'fig3' }, { label: '图 4：对多模式 RL', value: 'fig4' }], value: 'fig3', onPick: function (v) { state.fig = v; state.i = 0; buildModeButtons(); render(); } });
    var row2 = controlsRow(root);
    function buildModeButtons() {
      row2.innerHTML = '';
      var rows = state.fig === 'fig3' ? FIG3 : FIG4;
      modeBtns = buttonGroup(row2, { label: '模式', items: rows.map(function (r, i) { return { label: r.zh, value: i }; }), value: state.i, onPick: function (v) { state.i = v; render(); } });
    }
    buildModeButtons();
    var st = stage(root, 360);
    var verdict = verdictBox(root);
    var tb = table(root);
    note(root, ['缩放的最大、最小论文没说在什么范围里取；这里按一张图里同一个轴的全部数（两种方法 × 全部模式）取，是我们的理解。图 3 的「根部旋转」是横滚、俯仰、偏航三项的平均；OmniH2O 专才图上写 0.250，按表 III 平均是 0.167，图表对不上，这里照图上画。',
      '图 4 的数是图上保留的小数：ExBody、HumanPlus 的根部 RPY 两边写的是同一个数（0.15 / 0.15、0.14 / 0.14），读图分不出高低；论文说 32/32 项都是 HOVER 更低。']);
    function render() {
      var g = begin(st), ctx = g.ctx, P = g.P;
      var rows = state.fig === 'fig3' ? FIG3 : FIG4, axes = state.fig === 'fig3' ? FIG3_AXES : FIG4_AXES, r = rows[state.i];
      var other = state.fig === 'fig3' ? '专才' : '多模式 RL', oc = state.fig === 'fig3' ? P.accent : P.purple;
      var cx = g.w / 2, cy = g.h / 2 + 6, Rr = Math.min(g.w, g.h) * 0.36, n = axes.length;
      function pt(j, u) { var a = -Math.PI / 2 + 2 * Math.PI * j / n; return [cx + Rr * u * Math.cos(a), cy + Rr * u * Math.sin(a)]; }
      [0.25, 0.5, 0.75, 1].forEach(function (u) { var ring2 = []; for (var j = 0; j <= n; j++) ring2.push(pt(j % n, u)); line(ctx, ring2, P.grid, 1); });
      for (var j = 0; j < n; j++) { line(ctx, [pt(j, 0), pt(j, 1)], P.grid, 1); var q = pt(j, 1.16); text(ctx, axes[j], q[0], q[1], P.text, 'center'); }
      function poly(vals, color) {
        var ps = vals.map(function (v, j) { var rg = axisRange(rows, j); return pt(j, 0.12 + 0.88 * radarScale(v, rg[0], rg[1])); });
        ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = color; ctx.beginPath();
        ps.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fill(); ctx.restore();
        line(ctx, ps.concat([ps[0]]), color, 2.4);
        ps.forEach(function (p) { dot(ctx, p[0], p[1], 3.2, color); });
      }
      poly(r.other, oc);
      poly(r.hover, P.good);
      text(ctx, '● HOVER', 14, 16, P.good, 'left', 'bold 12px sans-serif');
      text(ctx, '● ' + other, 14, 34, oc, 'left', 'bold 12px sans-serif');
      var wins = r.hover.filter(function (v, j) { return v < r.other[j]; }).length, ties = r.hover.filter(function (v, j) { return v === r.other[j]; }).length;
      verdict.set(r.zh + ' 模式：' + n + ' 个轴里 HOVER 误差更低的 **' + wins + '** 个' + (ties ? '，图上数字相同的 ' + ties + ' 个' : '') + (state.fig === 'fig3' ? '（根部速度那一轴专才多半更好，和表 III 一致）' : '') + '。', wins >= n - ties ? 'good' : 'warn');
      tb.clear();
      tb.row(['轴', 'HOVER', other], true);
      axes.forEach(function (a, j) { tb.row([a, radarNum(state.fig, j, r.hover[j]), radarNum(state.fig, j, r.other[j])]); });
    }
    registerRenderer(render);
    render();
  }

  // ─── 演示 3：表 III、表 IV、表 V ────────────────────────────────────────────
  function buildTablesDemo(host) {
    var root = card(host, {
      title: '表 III、表 IV、表 V：每一项谁显著更好',
      sub: '表 III 在仿真里比四种前人模式（12 项），表 IV 比四种额外模式（只算在跟的点），表 V 在真机上比三种模式。粗体是论文加粗的（5 个种子 / 5 次测试下显著更好）。'
    });
    var state = { view: 't3', i: 0 };
    var row = controlsRow(root);
    var row2 = controlsRow(root);
    function rowsOf() { return state.view === 't3' ? TABLE3 : state.view === 't4' ? TABLE4 : TABLE5; }
    function buildModeButtons() {
      row2.innerHTML = '';
      buttonGroup(row2, { label: '模式', items: rowsOf().map(function (r, i) { return { label: r.zh, value: i }; }), value: state.i, onPick: function (v) { state.i = v; render(); } });
    }
    buttonGroup(row, { label: '哪张表', items: [{ label: '表 III（仿真）', value: 't3' }, { label: '表 IV（单手 / 双手 / 头）', value: 't4' }, { label: '表 V（真机）', value: 't5' }], value: 't3', onPick: function (v) { state.view = v; state.i = 0; buildModeButtons(); render(); } });
    buildModeButtons();
    var verdict = verdictBox(root);
    var tb = table(root);
    note(root, ['表 III 的「涂色」：这种模式真正在跟的指标（ExBody 是上身关节和根部，HumanPlus 是全身关节和根部，H2O、OmniH2O 是位置那五项）。专才不跟的指标上 HOVER 赢得多，是因为专才没见过这些目标。',
      '单位：MPJPE mm，加速度 mm/帧²，速度 mm/帧，关节 rad，根部速度 m/s，根部高度 m，角度 rad；存活率 %。']);
    function render() {
      var r = rowsOf()[state.i], metrics = state.view === 't3' ? T3_METRICS : state.view === 't4' ? T4_METRICS : T5_METRICS;
      tb.clear();
      tb.row(['指标', '专才', 'HOVER'].concat(state.view === 't3' ? ['教师', '这种模式在跟'] : []), true);
      metrics.forEach(function (m, j) {
        var a = paperNum(r.spec[j]) + (state.view === 't3' && j === 0 ? '%' : ''), b = paperNum(r.hover[j]) + (state.view === 't3' && j === 0 ? '%' : '');
        var cells = [m, r.boldS.indexOf(j) >= 0 ? '**' + a + '**' : a, r.boldH.indexOf(j) >= 0 ? '**' + b + '**' : b];
        if (state.view === 't3') cells.push(paperNum(T3_ORACLE[j]) + (j === 0 ? '%' : ''), r.track.indexOf(j) >= 0 ? '✓' : '');
        tb.row(cells);
      });
      var nH = r.boldH.length, nS = r.boldS.length;
      verdict.set(r.zh + ' 模式：' + metrics.length + ' 项里 HOVER 显著更好 **' + nH + '** 项，专才 **' + nS + '** 项' + (metrics.length - nH - nS ? '，' + (metrics.length - nH - nS) + ' 项差别不显著' : '') + '。', nH > nS ? 'good' : 'warn');
    }
    render();
  }

  K.mount({
    'hover-explainer': buildExplainerDemo,
    'hover-video': buildVideoDemo,
    'hover-mask': buildMaskDemo,
    'hover-radar': buildRadarDemo,
    'hover-tables': buildTablesDemo
  });
})();
