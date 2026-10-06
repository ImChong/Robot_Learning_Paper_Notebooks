/* Interactive demos for papers/01_Foundational_RL/BeyondMimic
 * （Liao, Truong, Huang, Gao, Tevet, Sreenath, Liu · BeyondMimic: From Motion Tracking to Versatile Humanoid
 *   Control via Guided Diffusion · arXiv 2508.08241 v4，2025-11-13）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["beyondmimic"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   bm-explainer  — 十二幕讲解动画：两个缺口 → 锚定跟踪 → 奖励 → 观测 → 动作与关节阻抗 → 随机化与部署延迟 →
 *                   自适应采样 → 跟踪上真机 → VAE 潜空间 → 状态—潜动作扩散 → 代价引导 → 测试时的任务与边界
 *   bm-video      — 同一套十二幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   bm-anchor     — 锚定变换：水平漂移、偏航、高度偏差各拖一下，看表 S1 的奖励项怎么变（部位位置是示意）
 *   bm-impedance  — 关节阻抗：按表 S3 的电机惯量算 k_p / k_d / α，再代入表 S4 的实际轴惯量看阶跃响应
 *   bm-sampling   — 自适应采样：失败数滑动平均 + 0.1/S 的底 + 非因果核，和均匀采样比（玩具训练模型）
 *   bm-guidance   — 代价引导：式 S5–S8 的摇杆 / 路点 / 避障代价，滚动时域里一步一步去噪（高斯先验的玩具）
 */

(function () {
  'use strict';

  var K = window.PaperDemoKit;
  var el = K.el,
    fmt = K.fmt,
    clamp = K.clamp,
    card = K.card,
    controlsRow = K.controlsRow,
    slider = K.slider,
    checkbox = K.checkbox,
    buttonGroup = K.buttonGroup,
    statsRow = K.statsRow,
    verdictBox = K.verdictBox,
    legend = K.legend,
    note = K.note,
    stage = K.stage,
    stageGrid = K.stageGrid,
    begin = K.begin,
    plot = K.plot,
    line = K.line,
    dot = K.dot,
    text = K.text,
    axes = K.axes,
    barLabel = K.barLabel,
    registerRenderer = K.registerRenderer,
    mulberry32 = K.mulberry32,
    gauss = K.gauss;

  // ─── 论文里的数字（arXiv 2508.08241 v4：正文 + 补充材料 S1–S4、表 S1–S8） ───
  /* v1–v3（2025-08，9 页短版）里有、v4 删掉的数单独放在 V3；官方代码（HybridRobotics/whole_body_tracking，
     2025-10-05 的 main）里的数放在 CODE。图 8A、图 S2 的柱子没有标数，FIG8A / FIG_S2 是读图近似值。
     十二幕动画、四个演示、配音旁白与笔记「🚶 具体实例」共用这一份。 */
  var DATA_H = 2.5, REAL_CLIPS = 30, REAL_MIN = 15; // 正文 Diverse Skills：约 2.5 小时动作，30 段、共 15 分钟上真机
  var SHORT_SEQ = 7, LAFAN_ROWS = 29; // 表 S8：7 段短序列 + 29 行 LAFAN1（dance2 subject4 列了两次）
  var BODIES = ['骨盆', '左髋', '左膝', '左踝', '右髋', '右膝', '右踝', '躯干（锚点）', '左肩', '左肘', '左腕', '右肩', '右肘', '右腕']; // 代码 body_names
  var SIGMA = { p: 0.3, R: 0.4, v: 1.0, w: 3.14 }; // 表 S1：位置 m、朝向 rad、线速度 m/s、角速度 rad/s
  var W_GLOBAL = 0.5; // 表 S1：锚点的全局位置 / 朝向奖励（可选），权重 0.5
  var REG = { limit: -10.0, smooth: -0.1, contact: -0.1, softLimit: 0.9, fTh: 1.0 }; // 表 S1、S1 节
  var TERM = { z: 0.25, rot: 0.8 }; // S1 节：锚点或手脚高度偏 0.25 m，或锚点朝向误差 0.8 rad
  var OBS = [['参考关节角 + 速度（相位）', 58], ['锚点误差（位置 + Rot6D）', 9], ['机身线速度 + 角速度', 6], ['关节角（相对默认）', 29], ['关节速度', 29], ['上一步动作', 29]]; // 代码 PolicyCfg（G1 29 个关节）
  var CRITIC_EXTRA = [['14 个部位相对锚点的位置', 42], ['14 个部位相对锚点的朝向（Rot6D）', 84]]; // 代码 PrivilegedCfg
  var OMEGA_HZ = 10, ZETA = 2, ACT_FRAC = 0.25; // S1 节：ω = 10 Hz、ζ = 2、α = 0.25 τmax / kp
  var ARMATURE = { '5020': 0.003609725, '7520-14': 0.010177520, '7520-22': 0.025101925, '4010': 0.00425 }; // 表 S3 / 代码 g1.py，kg·m²
  var JOINTS = [
    // [名字, 电机, 倍数（踝、腰的双电机连杆按 2 倍）, 力矩上限 N·m（代码）, 表 S4 的轴有效惯量 kg·m²]
    ['髋俯仰', '7520-14', 1, 88, 0.8644], ['髋横滚', '7520-22', 1, 139, 0.6649], ['髋偏航', '7520-14', 1, 88, 0.1398],
    ['膝', '7520-22', 1, 139, 0.1366], ['踝俯仰', '5020', 2, 50, 0.009997], ['踝横滚', '5020', 2, 50, 0.007607],
    ['肩俯仰', '5020', 1, 25, 0.1785], ['肩横滚', '5020', 1, 25, 0.1360], ['肩偏航', '5020', 1, 25, 0.03103],
    ['肘', '5020', 1, 25, 0.03806], ['腕横滚', '5020', 1, 25, 0.003976], ['腕俯仰', '4010', 1, 5, 0.009054], ['腕偏航', '4010', 1, 5, 0.006087]
  ];
  var DR = { muStatic: [0.3, 1.6], muDynamic: [0.3, 1.2], restitution: [0, 0.5], jointOffset: 0.01, com: [0.025, 0.05, 0.05] }; // 表 S2
  var PUSH = { every: [1.0, 3.0], lin: [0.5, 0.5, 0.2], ang: [0.52, 0.52, 0.78] }; // 表 S2
  var RESET = { xy: 0.05, z: 0.01, rollPitch: 0.1, yaw: 0.2 }; // S1 节
  var DELAY_MS = [2, 5, 10], DELAY_FAILS = [0, 1, 2], DELAY_TRIALS = 3; // Validation：2 ms 速度误差上升，5 ms 摔一次，10 ms 三次摔两次
  var AS = { binS: 1, ema: 0.001, floor: 0.1, rho: 0.8, kPaper: 3, kCode: 1 }; // S1 节；代码 2025-10-03 起核长默认 1
  var FIG8B = { motions: 4, failNoAS: 3, maxIter: 30000, m4: [2000, 4000] }; // Validation + 图 8B
  var FIG8A = {
    // 图 8A 读图（相对原设置的误差倍数）：局部 [位置, 朝向, 线速度, 角速度]，全局 [位置, 偏航]
    rot: { name: ['Rot6D（原设置）', '四元数', '轴角'], local: [[1, 1, 1, 1], [1.15, 1.15, 1.07, 1.08], [1.12, 1.12, 1.16, 1.22]], global: [[1, 1], [0.9, 1.8], [2.85, 2.28]] },
    hist: { name: ['不加历史（原设置）', '4 步', '8 步', '25 步'], local: [[1, 1, 1, 1], [1.12, 1.16, 1.2, 1.18], [1.3, 1.42, 1.48, 1.5], [2.43, 2.43, 2.2, 2.21]], global: [[1, 1], [1.0, 1.0], [3.25, 7.5], [5.6, 5.55]] },
    arm: { name: ['armature × 0', '× 0.1', '原设置', '× 10'], local: [[1.16, 1.29, 1.23, 1.21], [1.2, 1.31, 1.22, 1.17], [1, 1, 1, 1], [1.07, 1.08, 1.02, 1.02]], global: [[0.95, 1.68], [1.5, 1.48], [1, 1], [1.33, 1.48]] },
    delay: { name: ['原设置', '2 ms', '5 ms', '10 ms'], local: [[1, 1, 1, 1], [1.06, 1.07, 1.07, 1.12], [1.32, 1.35, 1.33, 1.36], [1.65, 1.68, 1.74, 1.78]], global: [[1, 1], [1.15, 0.88], [2.25, 2.0], [2.68, 2.72]] }
  };
  var FIG_S2 = { name: ['ω = 5 Hz', '10 Hz（原设置）', 'ASAP 的增益', 'ω = 25 Hz'], local: [[1.17, 1.18, 1.27, 1.29], [1, 1, 1, 1], [1.03, 1.09, 1.31, 1.3], [0.88, 0.87, 1.01, 1.0]], global: [[2.75, 1.08], [1, 1], [1.15, 2.22], [2.17, 1.45]] }; // 图 S2 读图
  var CARTWHEEL = { acc: 31, peak: 20, mean: 7.01, human: 7.75 }, RONALDO_REPS = 5; // 正文 Human-level Agility
  var STUDY = { n: 77, pairs: 20, clipS: 5, all: 70.8, walk: 57.0, run: 84.7, h: [0.859, 0.281, 1.532] }; // 正文 Natural Behaviors
  var VEL_ERR = { walk: 12.14, run: 13.65 }, RUN_M = 50, KEYFRAME_S = 0.2, CARTWHEELS_6A = 4; // 正文、图 6A(iii) 图注
  var VAE = { z: 32, enc: [2048, 1024, 512], dec: [2048, 1024, 512], teacher: [512, 256, 128], lr: 5e-4, accum: 15, beta: 0.01 }; // 表 S6
  var DIFF = { H: 16, N: 4, emb: 512, heads: 8, layers: 6, K: 20, batch: 512, epochs: 1000, lr: 1e-4, wd: 0.001, warmup: 10000, paramsM: 19.8, hz: 25, inferMs: 20, emphasis: 6 }; // 表 S7、S3–S4 节
  var OU = { theta: 0.8, mu: 0, dt: 1.0, sigma: 0.1, reps: 100, runS: 2.5, checkS: 5 }; // 式 S4
  var LATENT_ABL = { without: 5, with: 95 }; // Validation：MuJoCo 仿真到仿真的侧手翻成功率 %
  var PPO = { hidden: [512, 256, 128], steps: 24, iters: 30000, lr: 1e-3, clip: 0.2, entropy: 0.005, gamma: 0.99, lam: 0.95, kl: 0.01, epochs: 5, minibatches: 4 }; // 表 S5
  var V3 = { bodyPos: [100, 80], jointRot: [72, 0], runs: 50, paramsM: 19.95, heads: 4, actH: 8 }; // v1–v3 表 III 与第 VI-B 节（v4 删掉了）
  var CODE = { envs: 4096, episodeS: 10, simDt: 0.005, decimation: 4, lowFreqDecimation: 8, resetJoint: 0.1, mjlab: true }; // tracking_env_cfg.py、flat_env_cfg.py

  function sum(a) {
    return a.reduce(function (x, y) { return x + y; }, 0);
  }
  var N_OBS = sum(OBS.map(function (r) { return r[1]; })); // 160
  var N_CRITIC = N_OBS + sum(CRITIC_EXTRA.map(function (r) { return r[1]; })); // 286
  var N_OBS_NO_SE = N_OBS - 3 - 3; // 去掉锚点位置误差与机身线速度：154
  var CTRL_HZ = 1 / (CODE.simDt * CODE.decimation); // 50 Hz
  var OMEGA = 2 * Math.PI * OMEGA_HZ; // 代码 NATURAL_FREQ = 10 * 2π rad/s
  var KD_OVER_KP = (2 * ZETA) / OMEGA; // 0.064 s
  /* 一个关节的阻抗：k_p = I ω²，k_d = 2 I ζ ω，α = 0.25 τmax / k_p；代入表 S4 的轴有效惯量看实际的频率和阻尼比 */
  function jointGains(j, omegaHz, zeta) {
    var w = 2 * Math.PI * (omegaHz == null ? OMEGA_HZ : omegaHz), z = zeta == null ? ZETA : zeta;
    var I = ARMATURE[j[1]] * j[2], kp = I * w * w, kd = 2 * I * z * w;
    var wr = Math.sqrt(kp / j[4]);
    return { name: j[0], I: I, kp: kp, kd: kd, alpha: (ACT_FRAC * j[3]) / kp, tauMax: j[3], Ieff: j[4], share: I / j[4], fReal: wr / (2 * Math.PI), zetaReal: kd / (2 * Math.sqrt(kp * j[4])) };
  }
  var KNEE = jointGains(JOINTS[3]); // kp 99.10、kd 6.309、α 0.3507、实际 4.29 Hz / 0.857
  var ANKLE_ROLL = jointGains(JOINTS[5]); // 实际 9.74 Hz / 1.948
  /* 高斯奖励掉到一半时的均方根误差：ē = σ² ln 2 */
  function halfRms(sigma) {
    return sigma * Math.sqrt(Math.log(2));
  }
  /* 第 2 幕与 bm-anchor 的算例：水平漂 (0.30, −0.40) m、偏航 0.2 rad */
  var DRIFT_EX = { dx: 0.3, dy: -0.4, yaw: 0.2 };
  var DRIFT_D2 = DRIFT_EX.dx * DRIFT_EX.dx + DRIFT_EX.dy * DRIFT_EX.dy; // 0.25 m²
  var R_DRIFT_GLOBAL = Math.exp(-DRIFT_D2 / (SIGMA.p * SIGMA.p)); // 0.062
  var R_YAW_GLOBAL = Math.exp(-(DRIFT_EX.yaw * DRIFT_EX.yaw) / (SIGMA.R * SIGMA.R)); // 0.779
  /* 自适应采样的核 ρ^u（u = 0, 1, 2），代码会把它归一化 */
  function asKernel(k) {
    var w = [];
    for (var u = 0; u < k; u++) w.push(Math.pow(AS.rho, u));
    var s = sum(w);
    return w.map(function (x) { return x / s; });
  }
  /* p_s ∝ Σ_u k(u) (f̄_{s+u} + 0.1/S)，末尾按代码复制最后一箱补齐 */
  function asProbs(fbar, k) {
    var S = fbar.length, kern = asKernel(k), p = [], i, u;
    for (i = 0; i < S; i++) {
      var acc = 0;
      for (u = 0; u < kern.length; u++) acc += kern[u] * (fbar[Math.min(i + u, S - 1)] + AS.floor / S);
      p.push(acc);
    }
    var s = sum(p);
    return p.map(function (x) { return x / s; });
  }
  var EMA_HALF_STEPS = Math.log(0.5) / Math.log(1 - AS.ema); // 693 个控制步
  var HORIZON_S = DIFF.H / DIFF.hz; // 0.64 s
  var HIST_S = DIFF.N / DIFF.hz; // 0.16 s
  var CTRL_MS_25 = 1000 / DIFF.hz; // 40 ms
  var OU_AR = 1 - OU.theta * OU.dt; // 0.2
  var OU_STD = OU.sigma / Math.sqrt(1 - OU_AR * OU_AR); // 0.102
  /* Cohen's h = 2 arcsin √p − 2 arcsin √(1 − p) */
  function cohenH(pct) {
    var p = pct / 100;
    return 2 * Math.asin(Math.sqrt(p)) - 2 * Math.asin(Math.sqrt(1 - p));
  }
  /* 式 S8 的松弛对数障碍 */
  function barrier(x, delta) {
    if (x >= delta) return -Math.log(x);
    var u = (x - 2 * delta) / delta;
    return -Math.log(delta) + 0.5 * (u * u - 1);
  }
  function barrierGrad(x, delta) {
    if (x >= delta) return -1 / x;
    return (x - 2 * delta) / (delta * delta);
  }

  function pct(x, d) {
    return fmt(x, d == null ? 1 : d) + '%';
  }

  // ─── demo: bm-anchor ─────────────────────────────────────────────────────
  /* 锚定变换（补充材料 S1）：锚点（躯干）自己照参考跟；其他部位的目标
       p_b^des = p_Δ + R_Δ (p_b^ref − p_anchor^ref)，p_Δ = [机器人锚点的 x, y，参考锚点的 z]，R_Δ = 绕 z 转偏航差。
     于是水平漂移和偏航被吸收，高度、俯仰、横滚不吸收。奖励按表 S1 现算；14 个部位的站姿坐标是示意。 */
  var BODY_OFFSETS = [
    // 相对躯干（锚点）的站姿位置 [x 前, y 左, z 上]，单位 m，示意
    [0, 0, -0.1], [0, 0.09, -0.18], [0.02, 0.12, -0.48], [0, 0.12, -0.8], [0, -0.09, -0.18], [0.02, -0.12, -0.48], [0, -0.12, -0.8],
    [0, 0, 0], [0, 0.17, 0.22], [0.03, 0.22, 0.02], [0.2, 0.2, -0.05], [0, -0.17, 0.22], [0.03, -0.22, 0.02], [0.2, -0.2, -0.05]
  ];
  var ANCHOR_IDX = 7;
  function rotZ(v, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]];
  }
  /* 参考锚点放在 refAt、朝向 0；机器人完美做出同一个姿势，但整体平移 (dx, dy, dz)、偏航转了 yaw。
     返回各部位的参考 / 机器人 / 锚定后的目标位置，以及表 S1 的各项奖励。 */
  function anchorCase(dx, dy, dz, yaw, anchored) {
    var refA = [0, 0, 0.95], robA = [dx, dy, 0.95 + dz];
    var ref = [], rob = [], des = [], e2 = 0;
    BODY_OFFSETS.forEach(function (o) {
      var r = [refA[0] + o[0], refA[1] + o[1], refA[2] + o[2]];
      var ro = rotZ(o, yaw);
      var b = [robA[0] + ro[0], robA[1] + ro[1], robA[2] + ro[2]];
      var d = anchored ? [robA[0] + ro[0], robA[1] + ro[1], refA[2] + ro[2]] : r; // p_Δ + R_Δ (p_ref − p_ref_anchor)
      ref.push(r);
      rob.push(b);
      des.push(d);
      e2 += Math.pow(b[0] - d[0], 2) + Math.pow(b[1] - d[1], 2) + Math.pow(b[2] - d[2], 2);
    });
    var eP = e2 / BODY_OFFSETS.length;
    var eR = anchored ? 0 : yaw * yaw; // 锚定后各部位的朝向目标也转到了机器人的偏航
    var eAnchorP = dx * dx + dy * dy + dz * dz, eAnchorR = yaw * yaw;
    var terms = [
      ['位置', Math.exp(-eP / (SIGMA.p * SIGMA.p)), 1],
      ['朝向', Math.exp(-eR / (SIGMA.R * SIGMA.R)), 1],
      ['线速度', 1, 1],
      ['角速度', 1, 1],
      ['锚点位置', Math.exp(-eAnchorP / (SIGMA.p * SIGMA.p)), W_GLOBAL],
      ['锚点朝向', Math.exp(-eAnchorR / (SIGMA.R * SIGMA.R)), W_GLOBAL]
    ];
    return { ref: ref, rob: rob, des: des, eP: eP, terms: terms, total: sum(terms.map(function (t) { return t[1] * t[2]; })), terminated: Math.abs(dz) > TERM.z };
  }

  function buildAnchorDemo(host) {
    var root = card(host, {
      title: '锚定变换：水平漂移和偏航被吸收，高度不放',
      sub: '机器人完美地做出参考的姿势，只是整体漂了 —— 看表 S1 的各项奖励在「跟世界系」与「锚定」两种目标下差多少。'
    });
    var state = { d: Math.sqrt(DRIFT_D2), dir: Math.atan2(DRIFT_EX.dy, DRIFT_EX.dx), yaw: DRIFT_EX.yaw, dz: 0, anchored: true };
    var ctrls = controlsRow(root);
    slider(ctrls, { label: '水平漂移（m）', min: 0, max: 1, step: 0.01, value: state.d, format: function (v) { return fmt(v, 2); }, onInput: function (v) { state.d = v; render(); } });
    slider(ctrls, { label: '偏航偏差（rad）', min: -0.6, max: 0.6, step: 0.01, value: state.yaw, format: function (v) { return fmt(v, 2); }, onInput: function (v) { state.yaw = v; render(); } });
    slider(ctrls, { label: '高度偏差（m）', min: -0.35, max: 0.35, step: 0.01, value: state.dz, format: function (v) { return fmt(v, 2); }, onInput: function (v) { state.dz = v; render(); } });
    buttonGroup(ctrls, {
      label: '目标怎么定',
      items: [{ value: 'anchor', label: '锚定（论文）' }, { value: 'world', label: '跟世界系' }],
      value: 'anchor',
      onPick: function (v) { state.anchored = v === 'anchor'; render(); }
    });
    var setLegend = legend(root, [
      { key: 'muted', text: '参考动作的 14 个部位' },
      { key: 'accent', text: '机器人（姿势一样，整体漂了）' },
      { key: 'good', text: '奖励用的目标' },
      { key: 'bad', text: '误差' }
    ]);
    var grid = stageGrid(root);
    var mapStage = stage(grid, 250);
    var barStage = stage(grid, 250);
    var stats = statsRow(root);
    var sP = stats.add('部位位置项 $r_p$');
    var sAll = stats.add('总奖励（满分 5）');
    var sTerm = stats.add('会不会终止');
    var verdict = verdictBox(root);
    note(root, [
      '**公式照抄补充材料 S1**：$p^{des}_b = p_\\Delta + R_\\Delta\\,(p^{ref}_b - p^{ref}_{anchor})$，$p_\\Delta$ 取**机器人**锚点的 $x, y$ 与**参考**锚点的 $z$，$R_\\Delta$ 只绕 $z$ 轴转偏航差；速度目标不变，直接用参考的。',
      '**奖励照抄表 S1**：四项跟踪 $\\exp(-\\bar e / \\sigma^2)$，$\\sigma$ = 0.3 m / 0.4 rad / 1.0 m/s / 3.14 rad/s；锚点的全局位置、朝向两项是可选的，权重 0.5（官方代码默认开着）。这里机器人只漂不动，两项速度恒为 1。',
      '**终止只看高度和倾斜**：锚点或任一手脚的高度偏差超过 0.25 m，或锚点朝向误差超过 0.8 rad 才终止（v4 正文写的是整个朝向误差，官方代码只比重力方向，也就是只看倾斜）。水平漂多远都不终止。',
      '**部位坐标是示意**：14 个部位用的是一个大致的站姿（不是 G1 的 URDF）；纯平移时每个部位的误差都等于漂移量，和坐标无关，偏航带来的误差才和部位离躯干多远有关。'
    ]);

    var render = registerRenderer(function () {
      var dx = state.d * Math.cos(state.dir), dy = state.d * Math.sin(state.dir);
      var res = anchorCase(dx, dy, state.dz, state.yaw, state.anchored);
      var other = anchorCase(dx, dy, state.dz, state.yaw, !state.anchored);
      var rp = res.terms[0][1];
      sP.set(fmt(rp, 3), rp > 0.8 ? 'good' : rp < 0.3 ? 'bad' : 'warn');
      sAll.set(fmt(res.total, 2) + '（另一种 ' + fmt(other.total, 2) + '）', res.total > 4 ? 'good' : 'warn');
      sTerm.set(res.terminated ? '终止（高度偏差 > 0.25 m）' : '不终止', res.terminated ? 'bad' : 'good');
      if (state.anchored) {
        verdict.set(
          '✅ 锚定：' + fmt(state.d, 2) + ' m 的水平漂移和 ' + fmt(state.yaw, 2) + ' rad 的偏航都被吸收，部位位置项 ' + fmt(rp, 3) +
            (Math.abs(state.dz) > 0.005 ? '（剩下的是高度偏差，锚定不放高度）' : '') + '。漂移只留在锚点自己的两项全局奖励里（各 0.5 分）。',
          'learning'
        );
      } else {
        verdict.set(
          '😣 跟世界系：机器人的姿势一点没错，只是漂了 ' + fmt(state.d, 2) + ' m，部位位置项就掉到 ' + fmt(rp, 3) +
            '。为了把这一项拿回来，策略只能拿动作去纠偏 —— 论文说的「风格被吃掉」就是这个。',
          'frozen'
        );
      }

      var g = begin(mapStage), P = g.P;
      setLegend(P);
      var p = plot(g, { l: 38, r: 12, t: 22, b: 32 }, [-0.7, 1.3], [-0.9, 0.9]);
      axes(g, p, { xTicks: [-0.5, 0, 0.5, 1], yTicks: [-0.5, 0, 0.5], xLabel: '俯视 x（m）' });
      text(g.ctx, '俯视：参考、机器人、奖励用的目标', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      function xy(q) { return [p.sx(q[0]), p.sy(q[1])]; }
      res.ref.forEach(function (q) { dot(g.ctx, xy(q)[0], xy(q)[1], 3, P.muted); });
      res.des.forEach(function (q, i) {
        line(g.ctx, [xy(q), xy(res.rob[i])], P.bad, 1.4);
        dot(g.ctx, xy(q)[0], xy(q)[1], 4.5, 'transparent', P.good);
      });
      res.rob.forEach(function (q, i) { dot(g.ctx, xy(q)[0], xy(q)[1], i === ANCHOR_IDX ? 5 : 3.2, P.accent); });
      var ra = res.rob[ANCHOR_IDX], hd = rotZ([0.22, 0, 0], state.yaw);
      line(g.ctx, [xy(ra), [p.sx(ra[0] + hd[0]), p.sy(ra[1] + hd[1])]], P.accent, 2);
      line(g.ctx, [xy(res.ref[ANCHOR_IDX]), [p.sx(0.22), p.sy(0)]], P.muted, 2, [4, 3]);

      var g2 = begin(barStage), P2 = g2.P;
      var p2 = plot(g2, { l: 36, r: 10, t: 22, b: 40 }, [0, 6], [0, 1.08]);
      axes(g2, p2, { yTicks: [0, 0.5, 1], yFmt: function (t) { return fmt(t, 1); } });
      text(g2.ctx, '表 S1 的六项（柱高是指数项，虚框是另一种目标）', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var slot = (p2.x1 - p2.x0) / 6;
      res.terms.forEach(function (tm, i) {
        var cx = p2.x0 + slot * (i + 0.5), bw = slot * 0.5, y0 = p2.sy(0), y1 = p2.sy(tm[1]);
        g2.ctx.fillStyle = tm[1] > 0.8 ? P2.good : tm[1] < 0.3 ? P2.bad : P2.warn;
        g2.ctx.fillRect(cx - bw / 2, y1, bw, y0 - y1);
        g2.ctx.strokeStyle = P2.muted;
        g2.ctx.setLineDash([3, 3]);
        g2.ctx.strokeRect(cx - bw / 2, p2.sy(other.terms[i][1]), bw, y0 - p2.sy(other.terms[i][1]));
        g2.ctx.setLineDash([]);
        barLabel(g2, p2, cx, y1, fmt(tm[1], 2), P2.text);
        text(g2.ctx, tm[0], cx, p2.y0 + 13, P2.muted, 'center', '10px sans-serif');
        text(g2.ctx, '×' + fmt(tm[2], 1), cx, p2.y0 + 26, P2.muted, 'center', '10px sans-serif');
      });
      mapStage.canvas.setAttribute('aria-label', '俯视图：参考动作、漂移后的机器人与奖励用的目标');
      barStage.canvas.setAttribute('aria-label', '表 S1 的六项奖励在当前设置下的取值');
    });
    render();
  }

  // ─── demo: bm-impedance ──────────────────────────────────────────────────
  /* k_p = I ω²、k_d = 2 I ζ ω、α = 0.25 τmax / k_p（补充材料 S1）；I 只取电机的反射惯量（表 S3）。
     把同一组增益代入表 S4 的「轴有效惯量」（加上了连杆子树，按固定基座、名义姿态算），看实际的阶跃响应。 */
  function stepResponse(kp, kd, I, target, tauMax, T, n) {
    var q = 0, v = 0, dt = T / n, out = [[0, 0]], sub = 20;
    for (var i = 1; i <= n; i++) {
      for (var s = 0; s < sub; s++) {
        var tau = clamp(kp * (target - q) - kd * v, -tauMax, tauMax);
        v += (tau / I) * (dt / sub);
        q += v * (dt / sub);
      }
      out.push([i * dt, q]);
    }
    return out;
  }

  function buildImpedanceDemo(host) {
    var root = card(host, {
      title: '关节阻抗：从电机惯量算增益，再看真实惯量下的样子',
      sub: '选一个关节，拖固有频率 $\\omega$ 与阻尼比 $\\zeta$。左图是动作从 0 跳到 1 时关节角的响应：虚线只算电机惯量（设计时的假设），实线代入表 S4 的轴有效惯量。'
    });
    var state = { j: 3, hz: OMEGA_HZ, zeta: ZETA };
    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '关节',
      items: [3, 0, 4, 5, 9, 10, 11].map(function (k) { return { value: String(k), label: JOINTS[k][0] }; }),
      value: '3',
      onPick: function (v) { state.j = +v; render(); }
    });
    slider(ctrls, { label: '固有频率 $\\omega$（Hz）', min: 2, max: 30, step: 0.5, value: state.hz, format: function (v) { return fmt(v, 1); }, onInput: function (v) { state.hz = v; render(); } });
    slider(ctrls, { label: '阻尼比 $\\zeta$', min: 0.5, max: 3, step: 0.05, value: state.zeta, format: function (v) { return fmt(v, 2); }, onInput: function (v) { state.zeta = v; render(); } });
    var setLegend = legend(root, [
      { key: 'muted', text: '只算电机惯量（设计假设）' },
      { key: 'accent', text: '代入表 S4 的轴有效惯量' },
      { key: 'good', text: '动作 = 1 对应的设定点 $\\alpha$' }
    ]);
    var grid = stageGrid(root);
    var stepStage = stage(grid, 250);
    var shareStage = stage(grid, 250);
    var stats = statsRow(root);
    var sKp = stats.add('$k_p$（N·m/rad）');
    var sKd = stats.add('$k_d$（N·m·s/rad）');
    var sA = stats.add('动作缩放 $\\alpha$（rad）');
    var sReal = stats.add('实际频率 / 阻尼比');
    var verdict = verdictBox(root);
    note(root, [
      '**电机惯量照抄表 S3 与官方代码**：armature = 转子惯量 × 齿比²（加两级行星轮的小残差），踝和腰是两个电机经连杆驱动，按 2 倍算；力矩上限取自官方 `g1.py`。',
      '**$\\alpha = 0.25\\,\\tau_{max} / k_p$**：动作取 1、关节停在默认角时，刚好出 25% 的最大力矩。这个设定点只是生成力矩的中间量，论文特意不按关节限位裁剪。',
      '**为什么 $\\zeta$ 取 2**：设计时只算了电机惯量，真实的轴惯量还要加上连杆。代进去之后频率变低、阻尼比变小：膝从 10 Hz / 2 变成约 4.3 Hz / 0.86，所以先「过阻尼」留出余量。越靠末端，电机惯量占比越大（右图），设计假设越准。',
      '**这是简化模型**：单关节、固定基座、名义姿态，忽略重力、接触和其他关节的耦合；表 S4 的子树惯量会随姿态变，论文也说「不需要精确」。消融结论看图 S2：5 Hz 全局位置误差约 2.7 倍，25 Hz 局部误差略低但齿轮箱高频振荡、响声大（读图）。'
    ]);
    var render = registerRenderer(function () {
      var j = JOINTS[state.j], gn = jointGains(j, state.hz, state.zeta);
      sKp.set(fmt(gn.kp, 2));
      sKd.set(fmt(gn.kd, 3));
      sA.set(fmt(gn.alpha, 3) + '（' + fmt((gn.alpha * 180) / Math.PI, 1) + '°）');
      sReal.set(fmt(gn.fReal, 2) + ' Hz / ' + fmt(gn.zetaReal, 2), gn.zetaReal < 0.7 ? 'warn' : 'good');
      var design = stepResponse(gn.kp, gn.kd, gn.I, gn.alpha, gn.tauMax, 0.6, 240);
      var real = stepResponse(gn.kp, gn.kd, gn.Ieff, gn.alpha, gn.tauMax, 0.6, 240);
      var peak = Math.max.apply(null, real.map(function (q) { return q[1]; }));
      var over = (peak / gn.alpha - 1) * 100;
      if (gn.zetaReal < 1) {
        verdict.set('📈 ' + j[0] + '：设计按 ' + fmt(state.hz, 1) + ' Hz、$\\zeta$ = ' + fmt(state.zeta, 2) + ' 算，代入真实轴惯量后只有 ' + fmt(gn.fReal, 2) + ' Hz、阻尼比 ' + fmt(gn.zetaReal, 2) + '，超调约 ' + fmt(Math.max(over, 0), 0) + '%。电机惯量只占轴惯量的 ' + pct(gn.share * 100) + '。', 'frozen');
      } else {
        verdict.set('✅ ' + j[0] + '：电机惯量占轴惯量的 ' + pct(gn.share * 100) + '，代入真实惯量后 ' + fmt(gn.fReal, 2) + ' Hz、阻尼比 ' + fmt(gn.zetaReal, 2) + '，仍然不超调 —— 越靠末端，「只算电机惯量」越接近真实。', 'learning');
      }
      var g = begin(stepStage), P = g.P;
      setLegend(P);
      var yMax = Math.max(gn.alpha * 1.6, peak * 1.1);
      var p = plot(g, { l: 46, r: 12, t: 22, b: 32 }, [0, 0.6], [0, yMax]);
      axes(g, p, { xTicks: [0, 0.2, 0.4, 0.6], yTicks: K.niceTicks(0, yMax, 4), yFmt: function (t) { return fmt(t, 2); }, xLabel: '时间（s）' });
      text(g.ctx, '关节角（rad）：动作从 0 跳到 1', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      line(g.ctx, [[p.sx(0), p.sy(gn.alpha)], [p.sx(0.6), p.sy(gn.alpha)]], P.good, 1.4, [4, 3]);
      line(g.ctx, design.map(function (q) { return [p.sx(q[0]), p.sy(q[1])]; }), P.muted, 2, [5, 4]);
      line(g.ctx, real.map(function (q) { return [p.sx(q[0]), p.sy(q[1])]; }), P.accent, 2.4);

      var g2 = begin(shareStage), P2 = g2.P;
      var p2 = plot(g2, { l: 36, r: 10, t: 22, b: 40 }, [0, JOINTS.length], [0, 100]);
      axes(g2, p2, { yTicks: [0, 50, 100], yFmt: function (t) { return t + '%'; } });
      text(g2.ctx, '电机惯量占轴有效惯量的比例（表 S4）', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var slot = (p2.x1 - p2.x0) / JOINTS.length;
      JOINTS.forEach(function (jj, i) {
        var sh = jointGains(jj).share * 100, cx = p2.x0 + slot * (i + 0.5), bw = slot * 0.62;
        g2.ctx.fillStyle = i === state.j ? P2.accent : P2.muted;
        g2.ctx.fillRect(cx - bw / 2, p2.sy(sh), bw, p2.sy(0) - p2.sy(sh));
        text(g2.ctx, jj[0].slice(0, 2), cx, p2.y0 + 13, i === state.j ? P2.accent : P2.muted, 'center', '9px sans-serif');
        if (i === state.j) barLabel(g2, p2, cx, p2.sy(sh), fmt(sh, 1) + '%', P2.accent);
      });
      stepStage.canvas.setAttribute('aria-label', '关节角阶跃响应：只算电机惯量与代入轴有效惯量两条曲线');
      shareStage.canvas.setAttribute('aria-label', '13 个关节的电机惯量占比柱状图');
    });
    render();
  }

  // ─── demo: bm-sampling ───────────────────────────────────────────────────
  /* 一条 60 s 的玩具参考，第 21–22、40–41 秒是两段侧手翻（仿图 8B 的 Motion 1）。每次迭代起 96 个回合，
     每个回合最多 10 s（官方代码的回合长度）；每到一秒按「难度 ×（1 − 熟练度）」可能摔倒。到过的那一秒会练熟一点，
     没练到的会慢慢忘（模拟别处的梯度把它挤掉）。采样器照抄论文 / 代码：失败数做滑动平均（每步 0.001，折成每次迭代
     1 − 0.999²⁴），加 0.1/S 的底，再过核 ρ^u。玩具只复现机制，迭代数不能和论文的 3 万次比。 */
  var TOY_S = 60, TOY_LEN = 10, TOY_M = 96, TOY_ITERS = 1500;
  var TOY_HARD = [21, 22, 40, 41];
  var TOY = { easy: 0.06, hard: 0.85, etaEasy: 0.004, etaHard: 0.002, forgetEasy: 0.003, forgetHard: 0.006, skill0: 0.3 };
  var TOY_ALPHA = 1 - Math.pow(1 - AS.ema, PPO.steps); // 每次迭代 24 步
  function toyTrain(mode, seed) {
    var rng = mulberry32(seed);
    var diff = [], skill = [], fbar = [], i;
    for (i = 0; i < TOY_S; i++) {
      var h = TOY_HARD.indexOf(i) >= 0;
      diff.push(h ? TOY.hard : TOY.easy);
      skill.push(h ? 0 : TOY.skill0);
      fbar.push(0);
    }
    var worst = [], snaps = [];
    for (var it = 0; it < TOY_ITERS; it++) {
      var p;
      if (mode === 'uniform') {
        p = [];
        for (i = 0; i < TOY_S; i++) p.push(1 / TOY_S);
      } else {
        p = asProbs(fbar, mode === 'k3' ? AS.kPaper : AS.kCode);
      }
      var cnt = [], vis = [];
      for (i = 0; i < TOY_S; i++) { cnt.push(0); vis.push(0); }
      for (var m = 0; m < TOY_M; m++) {
        var u = rng(), c = 0, b = TOY_S - 1;
        for (i = 0; i < TOY_S; i++) { c += p[i]; if (u < c) { b = i; break; } }
        for (var jb = b; jb < Math.min(TOY_S, b + TOY_LEN); jb++) {
          vis[jb]++;
          if (rng() < diff[jb] * (1 - skill[jb])) { cnt[jb]++; break; }
        }
      }
      var wst = 0, fail = [];
      for (i = 0; i < TOY_S; i++) {
        var hard = TOY_HARD.indexOf(i) >= 0;
        skill[i] += (hard ? TOY.etaHard : TOY.etaEasy) * vis[i] * (1 - skill[i]);
        skill[i] -= (hard ? TOY.forgetHard : TOY.forgetEasy) * skill[i];
        skill[i] = clamp(skill[i], 0, 1);
        fbar[i] = (1 - TOY_ALPHA) * fbar[i] + (TOY_ALPHA * cnt[i]) / PPO.steps;
        fail.push(diff[i] * (1 - skill[i]));
        wst = Math.max(wst, fail[i]);
      }
      worst.push(wst);
      if (it % 10 === 9) snaps.push({ it: it + 1, p: p.slice(), fail: fail });
    }
    return { worst: worst, snaps: snaps };
  }
  var TOY_CACHE = {};
  function toyRun(mode, seed) {
    var key = mode + ':' + seed;
    if (!TOY_CACHE[key]) TOY_CACHE[key] = toyTrain(mode, seed);
    return TOY_CACHE[key];
  }

  function buildSamplingDemo(host) {
    var root = card(host, {
      title: '自适应采样：失败多的地方多练，前两秒也多练',
      sub: '一条 60 秒的玩具参考，第 21–22、40–41 秒是两段侧手翻。拖「训练进度」，看起点分布怎么从均匀变成盯着难段，再慢慢摊平。'
    });
    var state = { mode: 'k3', it: 300, seed: 1 };
    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '起点怎么抽',
      items: [{ value: 'uniform', label: '均匀' }, { value: 'k3', label: '自适应 · 核长 3（论文）' }, { value: 'k1', label: '自适应 · 核长 1（当前代码）' }],
      value: 'k3',
      onPick: function (v) { state.mode = v; render(); }
    });
    slider(ctrls, { label: '训练进度（迭代）', min: 10, max: TOY_ITERS, step: 10, value: state.it, format: function (v) { return String(v); }, onInput: function (v) { state.it = v; render(); } });
    buttonGroup(ctrls, {
      label: '随机种子',
      items: [1, 2, 3].map(function (s) { return { value: String(s), label: String(s) }; }),
      value: '1',
      onPick: function (v) { state.seed = +v; render(); }
    });
    var setLegend = legend(root, [
      { key: 'bad', text: '每一秒当前的失败概率' },
      { key: 'accent', text: '起点的采样概率' },
      { key: 'warn', text: '均匀采样（对照）' },
      { key: 'good', text: '自适应 · 核长 3' }
    ]);
    var grid = stageGrid(root);
    var binStage = stage(grid, 250);
    var curveStage = stage(grid, 250);
    var stats = statsRow(root);
    var sWorst = stats.add('最难一秒的失败概率');
    var sHard = stats.add('起点落在难段及前两秒的比例');
    var sUni = stats.add('均匀采样时这个比例');
    var verdict = verdictBox(root);
    note(root, [
      '**采样器照抄补充材料 S1 与官方代码**：每一秒的失败数做指数滑动平均（每步 $0.999 / 0.001$），加一层 $0.1/S$ 的底，再过非因果核 $p_s \\propto \\sum_u \\rho^u \\bar f_{s+u}$（$\\rho = 0.8$）。核长 3（$u = 0, 1, 2$）是论文写的；官方代码 2025-10-03 起默认核长是 1，等于不卷积。',
      '**这是简化模型**：「熟练度」「遗忘」都是编的，只为复现机制；20 个随机种子下顺序都一样 —— 均匀采样最难那一秒停在约 0.15，核长 1 约 0.11，核长 3 约 0.08。论文没有单独消融核长，真实训练里差多少不知道。',
      '**论文的证据看图 8B**：不用自适应采样，4 段长动作里有 3 段在 3 万次迭代后仍有过不去的片段（Motion 1 卡在两段侧手翻）；简单的 Motion 4 用它也把迭代数从 4k 减到 2k。'
    ]);
    function hardShare(p) {
      var s = 0;
      for (var i = 0; i < TOY_S; i++) {
        var near = TOY_HARD.some(function (h) { return i <= h && i >= h - 2; });
        if (near) s += p[i];
      }
      return s;
    }
    var render = registerRenderer(function () {
      var run = toyRun(state.mode, state.seed), uni = toyRun('uniform', state.seed), k3 = toyRun('k3', state.seed);
      var snap = run.snaps[Math.min(run.snaps.length - 1, Math.round(state.it / 10) - 1)];
      var wst = run.worst[state.it - 1];
      sWorst.set(fmt(wst, 3), wst < 0.1 ? 'good' : wst > 0.14 ? 'bad' : 'warn');
      var share = hardShare(snap.p);
      sHard.set(pct(share * 100), share > 0.2 ? 'good' : 'warn');
      sUni.set(pct((TOY_HARD.length + 2 * 2) * (100 / TOY_S)));
      if (state.mode === 'uniform') {
        verdict.set('😐 均匀采样：难段只分到 ' + pct(share * 100) + ' 的起点，其余都花在已经会的地方；最难那一秒的失败概率停在 ' + fmt(wst, 3) + ' 附近，练到 ' + TOY_ITERS + ' 次也下不去。', 'frozen');
      } else {
        verdict.set('✅ ' + (state.mode === 'k3' ? '核长 3' : '核长 1') + '：第 ' + snap.it + ' 次迭代时 ' + pct(share * 100) + ' 的起点落在难段及其前两秒，最难那一秒的失败概率 ' + fmt(wst, 3) + '。难段学会后失败数下降，分布又会摊平。', 'learning');
      }
      var g = begin(binStage), P = g.P;
      setLegend(P);
      var pMax = Math.max(0.12, Math.max.apply(null, snap.p) * 1.15);
      var p = plot(g, { l: 40, r: 12, t: 22, b: 32 }, [0, TOY_S], [0, 1]);
      axes(g, p, { xTicks: [0, 20, 40, 60], yTicks: [0, 0.5, 1], yFmt: function (t) { return fmt(t, 1); }, xLabel: '参考里的第几秒' });
      text(g.ctx, '第 ' + snap.it + ' 次迭代：失败概率（柱）与起点分布（线，0–' + fmt(pMax, 2) + ' 缩放到同一高度）', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var bw = (p.x1 - p.x0) / TOY_S;
      TOY_HARD.forEach(function (h) {
        g.ctx.fillStyle = P.warn;
        g.ctx.globalAlpha = 0.12;
        g.ctx.fillRect(p.sx(h), p.y1, bw, p.y0 - p.y1);
        g.ctx.globalAlpha = 1;
      });
      snap.fail.forEach(function (f, i) {
        g.ctx.fillStyle = P.bad;
        g.ctx.fillRect(p.sx(i) + 1, p.sy(f), bw - 2, p.sy(0) - p.sy(f));
      });
      line(g.ctx, snap.p.map(function (q, i) { return [p.sx(i + 0.5), p.sy(q / pMax)]; }), P.accent, 2.2);
      line(g.ctx, [[p.sx(0), p.sy(1 / TOY_S / pMax)], [p.sx(TOY_S), p.sy(1 / TOY_S / pMax)]], P.warn, 1.2, [4, 3]);

      var g2 = begin(curveStage), P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 12, t: 22, b: 32 }, [0, TOY_ITERS], [0, 0.9]);
      axes(g2, p2, { xTicks: [0, 500, 1000, 1500], yTicks: [0, 0.3, 0.6, 0.9], yFmt: function (t) { return fmt(t, 1); }, xLabel: '迭代' });
      text(g2.ctx, '最难那一秒的失败概率', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      [[uni, P2.warn, 'uniform'], [toyRun('k1', state.seed), P2.muted, 'k1'], [k3, P2.good, 'k3']].forEach(function (c) {
        var pts = [];
        for (var i = 0; i < TOY_ITERS; i += 5) pts.push([p2.sx(i + 1), p2.sy(c[0].worst[i])]);
        line(g2.ctx, pts, c[1], c[2] === state.mode ? 2.6 : 1.4, c[2] === state.mode ? [] : [4, 3]);
      });
      line(g2.ctx, [[p2.sx(state.it), p2.y0], [p2.sx(state.it), p2.y1]], P2.text, 1, [3, 3]);
      text(g2.ctx, '均匀', p2.sx(TOY_ITERS) - 4, p2.sy(uni.worst[TOY_ITERS - 1]) - 6, P2.warn, 'right', '10px sans-serif');
      text(g2.ctx, '核长 3', p2.sx(TOY_ITERS) - 4, p2.sy(k3.worst[TOY_ITERS - 1]) + 14, P2.good, 'right', '10px sans-serif');
      binStage.canvas.setAttribute('aria-label', '玩具参考每一秒的失败概率与起点分布');
      curveStage.canvas.setAttribute('aria-label', '三种采样方式下最难一秒的失败概率随迭代变化');
    });
    render();
  }

  // ─── demo: bm-guidance ───────────────────────────────────────────────────
  /* 滚动时域的代价引导（补充材料 S3–S4）。每个控制步（25 Hz）去噪一段 H = 16 步的未来平面速度，
     只执行第一步，下一步重来。代价照抄式 S5–S8：摇杆 G_js、路点 G_wp（e^{−2d} 在近处换成罚速度）、
     避障 G_sdf（松弛对数障碍 B(x, δ)）。先验是玩具：以当前速度为中心的高斯（论文是学出来的 19.8M Transformer），
     速度用 5 个 RBF 控制点表示，20 步 DDIM，每步在 x̂₀ 上减一次 λ∇G。δ、身体半径、避障权重论文没给，是玩具的取值。 */
  var GD = { H: DIFF.H, nc: 5, dt: 1 / DIFF.hz, K: DIFF.K, gait: 1.0, sd: 0.1, r: 0.25, delta: 0.1, reach: 0.8, wSdf: 2, obsR: 0.45, steps: 200, vMax: 1.5 };
  var GD_NP = GD.H + 1;
  var GD_BASIS = (function () {
    var B = [];
    for (var i = 0; i < GD_NP; i++) {
      var u = i / GD.H, row = [], s = 0;
      for (var k = 0; k < GD.nc; k++) {
        var w = Math.exp(-Math.pow((u - k / (GD.nc - 1)) / 0.28, 2));
        row.push(w);
        s += w;
      }
      B.push(row.map(function (w2) { return w2 / s; }));
    }
    return B;
  })();
  function gdVel(x) {
    var V = [];
    for (var i = 0; i < GD_NP; i++) {
      var a = 0, b = 0;
      for (var k = 0; k < GD.nc; k++) {
        a += GD_BASIS[i][k] * x[k];
        b += GD_BASIS[i][k] * x[GD.nc + k];
      }
      V.push([a, b]);
    }
    return V;
  }
  function gdCost(x, p, o) {
    var V = gdVel(x), P = [], acc = [p[0], p[1]], i;
    for (i = 0; i < GD_NP; i++) {
      acc = [acc[0] + V[i][0] * GD.dt, acc[1] + V[i][1] * GD.dt];
      P.push(acc);
    }
    var gV = V.map(function () { return [0, 0]; }), gP = P.map(function () { return [0, 0]; }), G = { task: 0, sdf: 0 };
    for (i = 0; i < GD_NP; i++) {
      if (o.task === 'js') {
        var e = [V[i][0] - o.gv[0], V[i][1] - o.gv[1]];
        G.task += 0.5 * (e[0] * e[0] + e[1] * e[1]);
        gV[i][0] += e[0];
        gV[i][1] += e[1];
      } else {
        var dx = P[i][0] - o.gp[0], dy = P[i][1] - o.gp[1], d = Math.hypot(dx, dy), w = Math.exp(-2 * d); // d 不求导
        G.task += (1 - w) * (dx * dx + dy * dy) + w * (V[i][0] * V[i][0] + V[i][1] * V[i][1]);
        gP[i][0] += 2 * (1 - w) * dx;
        gP[i][1] += 2 * (1 - w) * dy;
        gV[i][0] += 2 * w * V[i][0];
        gV[i][1] += 2 * w * V[i][1];
      }
      if (o.sdf) {
        var ox = P[i][0] - o.obs[0], oy = P[i][1] - o.obs[1], dist = Math.hypot(ox, oy) || 1e-6, xx = dist - GD.obsR - GD.r;
        if (xx < GD.reach) {
          G.sdf += GD.wSdf * (barrier(xx, GD.delta) - barrier(GD.reach, GD.delta));
          var gb = GD.wSdf * barrierGrad(xx, GD.delta);
          gP[i][0] += (gb * ox) / dist;
          gP[i][1] += (gb * oy) / dist;
        }
      }
    }
    var cum = [0, 0];
    for (i = GD_NP - 1; i >= 0; i--) {
      cum[0] += gP[i][0];
      cum[1] += gP[i][1];
      gV[i][0] += cum[0] * GD.dt;
      gV[i][1] += cum[1] * GD.dt;
    }
    var gx = [];
    for (var k = 0; k < 2 * GD.nc; k++) gx.push(0);
    for (k = 0; k < GD.nc; k++) {
      for (i = 0; i < GD_NP; i++) {
        gx[k] += GD_BASIS[i][k] * gV[i][0];
        gx[GD.nc + k] += GD_BASIS[i][k] * gV[i][1];
      }
    }
    return { G: G, g: gx, V: V, P: P };
  }
  function gdPlan(p, v, o, rng) {
    var sp = Math.hypot(v[0], v[1]), hd = sp > 1e-3 ? [v[0] / sp, v[1] / sp] : [1, 0], m = [], k;
    for (k = 0; k < GD.nc; k++) m.push(0.8 * v[0] + 0.2 * hd[0] * GD.gait);
    for (k = 0; k < GD.nc; k++) m.push(0.8 * v[1] + 0.2 * hd[1] * GD.gait);
    var x = m.map(function () { return gauss(rng); }), dev = 0;
    for (var s = GD.K; s > 0; s--) {
      var ab = Math.pow(Math.cos(((s / GD.K + 0.008) / 1.008) * (Math.PI / 2)), 2);
      var abp = Math.pow(Math.cos((((s - 1) / GD.K + 0.008) / 1.008) * (Math.PI / 2)), 2);
      var sa = Math.sqrt(Math.max(ab, 1e-6)), vv = ab * GD.sd * GD.sd + (1 - ab);
      var x0 = x.map(function (xi, j) { return (sa * GD.sd * GD.sd * xi + (1 - ab) * m[j]) / vv; });
      var cg = gdCost(x0, p, o);
      for (var j = 0; j < x0.length; j++) x0[j] -= o.scale * cg.g[j]; // 引导：∇log p(τ*|τ) = −∇G
      x = x0.map(function (x0j, j2) {
        var eps = (x[j2] - sa * x0j) / Math.sqrt(Math.max(1 - ab, 1e-6));
        return Math.sqrt(Math.max(abp, 1e-6)) * x0j + Math.sqrt(Math.max(1 - abp, 1e-6)) * eps;
      });
    }
    for (k = 0; k < x.length; k++) dev += Math.abs(x[k] - m[k]);
    var out = gdCost(x, p, o);
    out.dev = dev / x.length;
    return out;
  }
  function gdSim(o, seed) {
    var rng = mulberry32(seed), p = [0, 0], v = [0.6, 0], path = [p.slice()], plans = [], clr = [], speed = [], dev = 0, minClr = Infinity;
    for (var s = 0; s < GD.steps; s++) {
      var pl = gdPlan(p, v, o, rng);
      if (s % 25 === 0) plans.push(pl.P);
      v = pl.V[0];
      var sp = Math.hypot(v[0], v[1]);
      if (sp > GD.vMax) v = [(v[0] * GD.vMax) / sp, (v[1] * GD.vMax) / sp]; // 玩具：跟踪器跟得上的速度有上限
      p = [p[0] + v[0] * GD.dt, p[1] + v[1] * GD.dt];
      path.push(p.slice());
      var c = Math.hypot(p[0] - o.obs[0], p[1] - o.obs[1]) - GD.obsR - GD.r;
      clr.push(c);
      minClr = Math.min(minClr, c);
      speed.push(Math.hypot(v[0], v[1]));
      dev += pl.dev;
    }
    return { path: path, plans: plans, clr: clr, speed: speed, minClr: minClr, end: p, dev: dev / GD.steps };
  }

  function buildGuidanceDemo(host) {
    var root = card(host, {
      title: '代价引导：路点、摇杆、避障，直接相加',
      sub: '每 40 ms 去噪一段 0.64 s 的未来、只走第一步，8 秒走下来的轨迹。代价照抄式 S5–S8；勾选避障，就是在任务代价上再加一个 $G_{sdf}$。'
    });
    var state = { task: 'wp', sdf: true, scale: 0.1, obsY: 0.05, heading: 0 };
    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '任务',
      items: [{ value: 'wp', label: '路点 $G_{wp}$' }, { value: 'js', label: '摇杆 $G_{js}$' }],
      value: 'wp',
      onPick: function (v) { state.task = v; render(); }
    });
    var tog = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(tog);
    checkbox(tog, '加上避障 $G_{sdf}$', state.sdf, function (on) { state.sdf = on; render(); });
    slider(ctrls, { label: '引导强度 $\\lambda$', min: 0, max: 0.3, step: 0.01, value: state.scale, format: function (v) { return fmt(v, 2); }, onInput: function (v) { state.scale = v; render(); } });
    slider(ctrls, { label: '障碍的横向位置（m）', min: -0.8, max: 0.8, step: 0.05, value: state.obsY, format: function (v) { return fmt(v, 2); }, onInput: function (v) { state.obsY = v; render(); } });
    slider(ctrls, { label: '摇杆方向（°）', min: -40, max: 40, step: 5, value: state.heading, format: function (v) { return fmt(v, 0); }, onInput: function (v) { state.heading = v; render(); } });
    var setLegend = legend(root, [
      { key: 'accent', text: '机器人走过的路' },
      { key: 'muted', text: '每秒一次的预测（0.64 s）' },
      { key: 'warn', text: '障碍（灰圈是 + 身体半径）' },
      { key: 'good', text: '路点 / 摇杆方向' }
    ]);
    var grid = stageGrid(root);
    var mapStage = stage(grid, 250);
    var tsStage = stage(grid, 250);
    var stats = statsRow(root);
    var sClr = stats.add('离障碍最近的余量');
    var sEnd = stats.add('8 s 后的位置');
    var sSpeed = stats.add('最后的速度');
    var sDev = stats.add('平均偏离先验');
    var verdict = verdictBox(root);
    note(root, [
      '**代价照抄补充材料 S3**：$G_{js} = \\tfrac12 \\sum_i \\lVert V_{xy,i} - g_v \\rVert^2$；$G_{wp} = \\sum_i (1 - e^{-2d_i}) \\lVert P_{xy,i} - g_p \\rVert^2 + e^{-2d_i} \\lVert V_{xy,i} \\rVert^2$，离目标越近越罚速度，好停下；$G_{sdf} = \\sum_i B(\\mathrm{SDF}(P_i) - r, \\delta)$。',
      '**相加就是组合**：路点 + 避障会绕开障碍走到目标（论文图 6B）；换成摇杆 + 避障，摇杆推着直行、障碍把路推开，绕过去以后沿摇杆方向继续走 —— 摇杆只管速度，不管回到原来那条线。',
      '**这是简化模型**：先验是「以当前速度为中心的高斯」，不是学出来的人类动作分布，所以不会有论文说的「引导太强在切换时失稳」；$\\delta$ = 0.1、身体半径 0.25 m、避障权重 2、只在 0.8 m 以内算障碍、执行的速度不超过 1.5 m/s 都是玩具的取值（式 S8 在远处也有很小的 $-1/x$ 推力，论文没说怎么截断）。'
    ]);
    var render = registerRenderer(function () {
      var hdg = (state.heading * Math.PI) / 180;
      var o = { task: state.task, sdf: state.sdf, scale: state.scale, obs: [2.2, state.obsY], gp: [4.5, 0], gv: [Math.cos(hdg), Math.sin(hdg)] };
      var res = gdSim(o, 7);
      sClr.set(state.sdf ? fmt(res.minClr, 2) + ' m' : '（没加避障）' + fmt(res.minClr, 2) + ' m', res.minClr > 0 ? 'good' : 'bad');
      sEnd.set('(' + fmt(res.end[0], 2) + ', ' + fmt(res.end[1], 2) + ')');
      sSpeed.set(fmt(res.speed[res.speed.length - 1], 2) + ' m/s');
      sDev.set(fmt(res.dev, 3), res.dev > 0.25 ? 'warn' : 'good');
      if (state.scale < 0.005) {
        verdict.set('😐 引导强度 0：只剩先验 —— 照着历史接着走，任务和障碍它都不知道。', 'frozen');
      } else if (res.minClr < 0) {
        verdict.set('💥 撞进了障碍（余量 ' + fmt(res.minClr, 2) + ' m）' + (state.sdf ? '：引导还太弱，拉不动。' : '：没加避障代价，任务代价只管走到目标。勾上避障试试 —— 不用重训，加一项就行。'), 'frozen');
      } else if (state.task === 'wp') {
        var dg = Math.hypot(res.end[0] - 4.5, res.end[1]);
        verdict.set('✅ 8 s 后离路点 ' + fmt(dg, 2) + ' m、速度 ' + fmt(res.speed[res.speed.length - 1], 2) + ' m/s' + (state.sdf ? '，离障碍最近还有 ' + fmt(res.minClr, 2) + ' m：两个代价直接相加，训练时从没见过这个组合。' : '。'), 'learning');
      } else {
        verdict.set('✅ 摇杆推着走，' + (state.sdf ? '障碍把路推开 ' + fmt(Math.max.apply(null, res.path.map(function (q) { return Math.abs(q[1]); })), 2) + ' m，绕过去以后照摇杆方向继续走。' : '没有障碍代价，就照直走。'), 'learning');
      }
      var g = begin(mapStage), P = g.P;
      setLegend(P);
      var p = plot(g, { l: 36, r: 12, t: 22, b: 32 }, [-0.3, 7.2], [-2.2, 2.2]);
      axes(g, p, { xTicks: [0, 2, 4, 6], yTicks: [-2, 0, 2], xLabel: '俯视 x（m）' });
      text(g.ctx, '俯视：8 秒走过的路', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var rpx = Math.abs(p.sx(GD.obsR) - p.sx(0));
      g.ctx.save();
      g.ctx.globalAlpha = 0.18;
      g.ctx.fillStyle = P.muted;
      g.ctx.beginPath();
      g.ctx.arc(p.sx(o.obs[0]), p.sy(o.obs[1]), Math.abs(p.sx(GD.obsR + GD.r) - p.sx(0)), 0, Math.PI * 2);
      g.ctx.fill();
      g.ctx.globalAlpha = 0.5;
      g.ctx.fillStyle = P.warn;
      g.ctx.beginPath();
      g.ctx.arc(p.sx(o.obs[0]), p.sy(o.obs[1]), rpx, 0, Math.PI * 2);
      g.ctx.fill();
      g.ctx.restore();
      res.plans.forEach(function (pl) { line(g.ctx, pl.map(function (q) { return [p.sx(q[0]), p.sy(q[1])]; }), P.muted, 1.4, [3, 3]); });
      line(g.ctx, res.path.map(function (q) { return [p.sx(q[0]), p.sy(q[1])]; }), res.minClr < 0 ? P.bad : P.accent, 2.4);
      if (state.task === 'wp') {
        dot(g.ctx, p.sx(4.5), p.sy(0), 6, P.good, P.surface2);
      } else {
        line(g.ctx, [[p.sx(0.2), p.sy(-1.8)], [p.sx(0.2 + 0.8 * o.gv[0]), p.sy(-1.8 + 0.8 * o.gv[1])]], P.good, 2.4);
      }
      var g2 = begin(tsStage), P2 = g2.P;
      var p2 = plot(g2, { l: 40, r: 12, t: 22, b: 32 }, [0, 8], [-0.2, 1.6]);
      axes(g2, p2, { xTicks: [0, 2, 4, 6, 8], yTicks: [0, 0.5, 1, 1.5], yFmt: function (t) { return fmt(t, 1); }, xLabel: '时间（s）' });
      text(g2.ctx, '速度（m/s）与离障碍的余量（m）', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      line(g2.ctx, res.speed.map(function (s, i) { return [p2.sx((i + 1) * GD.dt), p2.sy(s)]; }), P2.accent, 2);
      line(g2.ctx, res.clr.map(function (c, i) { return [p2.sx((i + 1) * GD.dt), p2.sy(clamp(c, -0.2, 1.6))]; }), P2.warn, 2, [5, 3]);
      line(g2.ctx, [[p2.sx(0), p2.sy(0)], [p2.sx(8), p2.sy(0)]], P2.bad, 1, [2, 3]);
      mapStage.canvas.setAttribute('aria-label', '俯视图：引导扩散 8 秒走过的路、障碍与目标');
      tsStage.canvas.setAttribute('aria-label', '速度与离障碍余量随时间变化');
    });
    render();
  }

  // ─── 十二幕讲解动画 ──────────────────────────────────────────────────────
  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    paint = K.paint,
    seg = K.seg,
    ease = K.ease,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
    polyPath = K.polyPath,
    stickFigure = K.stickFigure,
    poseWalk = K.poseWalk;

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_MUTED = X.muted,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2;

  function rectBox(parent, x, y, w, h, stroke, fill, dash) {
    var r = paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 7, 'stroke-width': 1.3 }), fill || C_SURFACE, stroke || C_BORDER);
    if (dash) r.setAttribute('stroke-dasharray', dash);
    parent.appendChild(r);
    return r;
  }
  function group(parent) {
    var g = svgEl('g', {});
    parent.appendChild(g);
    return g;
  }
  function arrowPath(parent, pts, color, marker, dash, width) {
    var p = paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': width || 1.6, 'marker-end': marker }), null, color);
    if (dash) p.setAttribute('stroke-dasharray', dash);
    parent.appendChild(p);
    return p;
  }
  function chip(parent, x, y, w, str, color, opts) {
    var o = opts || {};
    var g = group(parent);
    rectBox(g, x, y, w, o.h || 30, color, o.fill || C_SURFACE, o.dash);
    g.appendChild(svgRich(x + w / 2, y + (o.h || 30) / 2 + 4, str, { size: o.size || 11, anchor: 'middle', w: w - 8, cls: o.cls || 'demo-x-ink2' }));
    return g;
  }
  function pathLine(parent, pts, color, width, dash) {
    var p = paint(svgEl('path', { d: polyPath(pts.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })), fill: 'none', 'stroke-width': width || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }), null, color);
    if (dash) p.setAttribute('stroke-dasharray', dash);
    parent.appendChild(p);
    return p;
  }
  function setPath(p, pts) {
    p.setAttribute('d', polyPath(pts.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })));
  }
  /* 按比例 u ∈ [0, 1] 把一条折线「画出来」 */
  function drawOn(path, u) {
    if (!path.lenCache) path.lenCache = path.getTotalLength ? path.getTotalLength() || 1 : 1;
    path.setAttribute('stroke-dasharray', path.lenCache + ' ' + path.lenCache);
    path.setAttribute('stroke-dashoffset', (path.lenCache * (1 - u)).toFixed(1));
  }
  function vbar(parent, x, yBase, w, color, opacity) {
    var r = paint(svgEl('rect', { x: x, y: yBase, width: w, height: 0, rx: 2.5, opacity: opacity == null ? 0.9 : opacity }), color);
    r.yBase = yBase;
    parent.appendChild(r);
    return r;
  }
  function setH(node, h) {
    var hh = Math.max(0, h);
    node.setAttribute('y', (node.yBase - hh).toFixed(1));
    node.setAttribute('height', hh.toFixed(1));
  }
  function hbar(parent, x, y, h, color, opacity) {
    var r = paint(svgEl('rect', { x: x, y: y, width: 0, height: h, rx: 2.5, opacity: opacity == null ? 0.9 : opacity }), color);
    parent.appendChild(r);
    return r;
  }
  function setW(node, w) {
    node.setAttribute('width', Math.max(0, w).toFixed(1));
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
  function tr(node, x, y, rot, sc) {
    node.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')' + (rot ? ' rotate(' + rot.toFixed(1) + ')' : '') + (sc ? ' scale(' + sc.toFixed(3) + ')' : ''));
  }
  /* 这十二幕在视频里一幕要讲五十秒左右，画面不能停：draw(t, clock) 的 clock 是这一幕的真实时间
     （旁白比分镜长时 t 会停在一段的末尾，clock 照走），走路、侧手翻、去噪这类循环动作都按 clock 画；
     网页播放器只传 t，clock 就退回 t。公式尽量换成会动的图，每幕最多留一条。 */
  function nowOf(t, clock) {
    return clock == null ? t : clock;
  }
  function lerp(a, b, u) {
    return a + (b - a) * u;
  }
  function lerpPose(A, B, u) {
    function pair(p, q) { return [lerp(p[0], q[0], u), lerp(p[1], q[1], u)]; }
    return { lean: lerp(A.lean, B.lean, u), armA: pair(A.armA, B.armA), armB: pair(A.armB, B.armB), legA: pair(A.legA, B.legA), legB: pair(A.legB, B.legB) };
  }

  // ── 火柴人（示意，不是论文的动作数据） ──
  var POSE_STAND = { lean: 2, armA: [-12, 8], armB: [12, 24], legA: [4, 0], legB: [-4, 0] };
  var POSE_CROUCH = { lean: 30, armA: [-52, -30], armB: [-40, -20], legA: [50, -40], legB: [44, -44] };
  var POSE_KICK = { lean: -14, armA: [-40, -20], armB: [40, 60], legA: [-70, -60], legB: [-6, 0] };
  var POSE_STAR = { lean: 0, armA: [150, 162], armB: [-150, -162], legA: [26, 26], legB: [-26, -26] }; // 侧手翻的「大字」
  var POSE_BALANCE = { lean: 10, armA: [80, 90], armB: [-80, -90], legA: [0, 0], legB: [-80, -88] };
  var POSE_LEAN = { lean: 22, armA: [40, 60], armB: [-30, -10], legA: [-10, -4], legB: [16, 8] };
  function limb(p, len, ang) {
    var r = (ang * Math.PI) / 180;
    return [p[0] + len * Math.sin(r), p[1] + len * Math.cos(r)];
  }
  function jointsOf(P) {
    var hip = [0, 0], sh = limb(hip, 42, 180 - P.lean), head = limb(sh, 15, 180 - P.lean);
    var eA = limb(sh, 20, P.armA[0]), eB = limb(sh, 20, P.armB[0]);
    var kA = limb(hip, 24, P.legA[0]), kB = limb(hip, 24, P.legB[0]);
    return [head, sh, limb(eA, 18, P.armA[1]), limb(eB, 18, P.armB[1]), hip, limb(kA, 24, P.legA[1]), limb(kB, 24, P.legB[1])];
  }
  /* 能缩放、能绕髋旋转的火柴人：put 让旋转后最低的那个点刚好落在地面上（侧手翻时手撑地） */
  function robot(parent, color, scale, dashed) {
    var fig = stickFigure(color, 2.6, dashed, 0.5);
    var g = svgEl('g', {});
    g.appendChild(fig.el);
    parent.appendChild(g);
    return {
      g: g,
      put: function (x, groundY, P, h, sc, rot) {
        var k = sc == null ? scale : sc, a = ((rot || 0) * Math.PI) / 180, low = 0;
        fig.pose(0, 0, P);
        jointsOf(P).forEach(function (q) { low = Math.max(low, q[0] * Math.sin(a) + q[1] * Math.cos(a)); });
        tr(g, x, groundY - (low + (h || 0)) * k, rot || 0, k);
      }
    };
  }

  /* ── 第 1 幕：两个缺口 ── */
  function buildSceneGaps() {
    var s = sceneSvg('左上：此前的单动作跟踪，每段动作单独调随机化和奖励（ASAP、KungfuBot、HuB）；右上：多动作统一的跟踪器能扩展，但动态动作质量掉、或放弃全局轨迹；左下：学会之后怎么用，分层有规划与控制的错配，VAE 一类要训练时给显式目标；下方：BeyondMimic 的两段 —— 一份配方训所有跟踪策略，再蒸馏成潜空间扩散模型，测试时用代价引导');
    s.appendChild(svgText(30, 28, '缺口一：怎么把很多动作搬上真机；缺口二：学会以后怎么用', 'demo-x-ink2', 13.5));

    var p1 = group(s);
    rectBox(p1, 30, 44, 360, 150, C_BORDER, C_SURFACE2);
    p1.appendChild(svgText(44, 64, '一段动作一套调参（ASAP、KungfuBot、HuB）', 'demo-x-mut', 11));
    var lanes = [['踢', POSE_KICK], ['跳', POSE_CROUCH], ['单脚站', POSE_BALANCE]].map(function (it, k) {
      var x = 70 + k * 112;
      p1.appendChild(paint(svgEl('line', { x1: x - 34, y1: 176, x2: x + 50, y2: 176, 'stroke-width': 1.2 }), null, C_BORDER));
      var f = robot(p1, C_ACCENT, 0.55);
      var knob = group(p1);
      knob.appendChild(paint(svgEl('circle', { cx: 0, cy: 0, r: 11, 'stroke-width': 1.6, fill: 'none' }), null, C_WARN));
      knob.appendChild(paint(svgEl('line', { x1: 0, y1: 0, x2: 0, y2: -10, 'stroke-width': 2.2 }), null, C_WARN));
      p1.appendChild(svgText(x + 50, 104, '调', 'demo-x-warn', 10));
      p1.appendChild(svgText(x, 190, it[0], 'demo-x-mut', 10, 'middle'));
      return { f: f, P: it[1], x: x, knob: knob, k: k };
    });

    var p2 = group(s);
    rectBox(p2, 410, 44, 360, 150, C_BORDER, C_SURFACE2);
    p2.appendChild(svgText(424, 64, '多动作一个策略（OmniH2O、GMT、TWIST）', 'demo-x-mut', 11));
    rectBox(p2, 430, 76, 320, 92, C_WARN, C_SURFACE, '4 3');
    var shaky = [POSE_STAND, POSE_KICK, POSE_CROUCH, POSE_BALANCE, POSE_LEAN].map(function (P, k) {
      return { f: robot(p2, C_MUTED, 0.45), P: P, x: 466 + k * 60, k: k };
    });
    p2.appendChild(svgText(590, 184, '能扩展；高动态动作质量掉，或者放弃全局轨迹', 'demo-x-warn', 10.5, 'middle'));

    var p3 = group(s);
    rectBox(p3, 30, 206, 740, 112, C_BORDER, C_SURFACE2);
    p3.appendChild(svgText(44, 226, '学会以后怎么用', 'demo-x-mut', 11));
    var mk = K.arrowMarker(s, 'bm-x-arrow-gap', C_MUTED);
    var rowA = group(p3);
    chip(rowA, 44, 238, 120, '规划器', C_BORDER, { h: 30 });
    arrowPath(rowA, [[166, 253], [206, 253]], C_MUTED, mk);
    chip(rowA, 208, 238, 120, '跟踪器', C_BORDER, { h: 30 });
    rowA.appendChild(svgText(340, 258, '分开训：规划出的动作跟踪器跟不上（规划—控制错配）', 'demo-x-bad', 10.5));
    var gapMark = paint(svgEl('line', { x1: 186, y1: 243, x2: 186, y2: 263, 'stroke-width': 3 }), null, C_BAD);
    rowA.appendChild(gapMark);
    var rowB = group(p3);
    chip(rowB, 44, 278, 120, '目标 → VAE', C_BORDER, { h: 30 });
    rowB.appendChild(svgText(176, 298, '训练时就得给显式目标：避障、长程导航这类说不清的目标，泛化差、动作发抖', 'demo-x-bad', 10.5));

    var p4 = group(s);
    rectBox(p4, 30, 330, 740, 78, C_ACCENT, C_SURFACE);
    p4.appendChild(svgText(44, 350, 'BeyondMimic：两个阶段', 'demo-x-acc', 11.5));
    var mk2 = K.arrowMarker(s, 'bm-x-arrow-plan', C_ACCENT);
    var steps = ['人类动作', '一份配方：每段一个跟踪策略', 'VAE + 潜空间扩散', '代价引导 → 新任务'];
    var xs = [44, 168, 412, 590], ws = [110, 230, 164, 166];
    var nodes = steps.map(function (str, k) {
      var g = chip(p4, xs[k], 362, ws[k], str, k === 1 || k === 3 ? C_GOOD : C_BORDER, { h: 32, size: 11.5 });
      if (k < 3) arrowPath(p4, [[xs[k] + ws[k] + 2, 378], [xs[k + 1] - 2, 378]], C_ACCENT, mk2);
      return g;
    });
    var token = dotAt(p4, 100, 400, 5, C_ACCENT);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(p1, seg(t, 0.3, 0.9));
      lanes.forEach(function (L) {
        var w = 0.5 - 0.5 * Math.cos(now * 2.2 + L.k);
        L.f.put(L.x, 176, lerpPose(POSE_STAND, L.P, w), 0);
        tr(L.knob, L.x + 34, 100, (now * 140 + L.k * 70) % 360);
      });
      setOpacity(p2, seg(t, 3.6, 4.2));
      shaky.forEach(function (S) {
        var jit = 0.35 + 0.25 * Math.sin(now * 9 + S.k * 2);
        S.f.put(S.x + 3 * Math.sin(now * 11 + S.k), 160, lerpPose(POSE_STAND, S.P, jit), 0);
      });
      setOpacity(p3, seg(t, 7.0, 7.6));
      setOpacity(rowB, seg(t, 8.6, 9.2));
      setOpacity(gapMark, 0.4 + 0.6 * Math.abs(Math.sin(now * 2.5)));
      setOpacity(p4, seg(t, 10.4, 11.0));
      nodes.forEach(function (g, k) { setOpacity(g, seg(t, 10.6 + k * 0.7, 11.2 + k * 0.7)); });
      var u = ((now - 13.4) / 3) % 1;
      if (t >= 13.4) {
        var x = lerp(100, 670, u < 0 ? 0 : u);
        moveDot(token, [x, 362 + 32 + 6]);
        setOpacity(token, 1);
      } else {
        setOpacity(token, 0);
      }
    }
    return { el: s, draw: draw };
  }

  /* ── 第 2 幕：锚定跟踪 ── */
  function buildSceneAnchor() {
    var s = sceneSvg('俯视：灰色是参考动作的躯干、双手、双脚，蓝色是机器人，姿势一样但整体往旁边漂了。红线是跟世界系时算出的误差，绿圈是锚定后的目标：水平位置和偏航跟着机器人，高度用参考的。右侧是位置这一项奖励，漂 0.5 米时跟世界系只剩 0.062，锚定后还是 1。下方：漂移只留在锚点自己的观测和可选的全局奖励里，终止只看高度和倾斜');
    s.appendChild(svgText(30, 28, '真机一定会漂：先把参考挪到机器人身上，再算误差', 'demo-x-ink2', 13.5));
    var field = group(s);
    rectBox(field, 30, 44, 470, 262, C_BORDER, C_SURFACE2);
    field.appendChild(svgText(44, 64, '俯视（1 格 = 0.25 m）', 'demo-x-mut', 10.5));
    for (var gx = 0; gx <= 11; gx++) field.appendChild(paint(svgEl('line', { x1: 50 + gx * 40, y1: 74, x2: 50 + gx * 40, y2: 270, 'stroke-width': 0.6 }), null, C_BORDER));
    var SCALE = 160; // px / m
    var refLine = paint(svgEl('line', { x1: 50, y1: 120, x2: 490, y2: 120, 'stroke-width': 1.4, 'stroke-dasharray': '6 4' }), null, C_MUTED);
    field.appendChild(refLine);
    field.appendChild(svgText(54, 112, '参考的路线', 'demo-x-mut', 10));
    var PTS = [[0, 0], [0.2, 0.2], [0.2, -0.2], [0, 0.12], [0, -0.12]]; // 躯干、双手、双脚（俯视，示意）
    function cluster(color, r, hollow) {
      var g = group(field);
      if (!hollow) {
        var bones = paint(svgEl('path', { 'stroke-width': 1.6, fill: 'none', opacity: 0.7 }), null, color);
        g.appendChild(bones);
      }
      var cs = PTS.map(function () {
        var c = paint(svgEl('circle', { r: r, 'stroke-width': 2 }), hollow ? 'none' : color, hollow ? color : null);
        g.appendChild(c);
        return c;
      });
      cs.bones = bones;
      return cs;
    }
    /* 躯干连到双手、双脚，俯视下像个小人 */
    function boneTo(cs, pts) {
      if (!cs.bones) return;
      cs.bones.setAttribute('d', pts.slice(1).map(function (q) { return 'M ' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1) + ' L ' + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' '));
    }
    var errLines = PTS.map(function () { var l = paint(svgEl('line', { 'stroke-width': 1.6 }), null, C_BAD); field.appendChild(l); return l; });
    var refC = cluster(C_MUTED, 5);
    var desC = cluster(C_GOOD, 8, true);
    var robC = cluster(C_ACCENT, 5);
    var driftLbl = svgText(60, 288, '', 'demo-x-mono', 11);
    field.appendChild(driftLbl);
    var modeLbl = svgText(300, 288, '', 'demo-x-bad', 11);
    field.appendChild(modeLbl);

    var side = group(s);
    rectBox(side, 516, 44, 254, 262, C_BORDER, C_SURFACE);
    side.appendChild(svgText(530, 64, '锚点之外的部位，目标这样算', 'demo-x-mut', 10.5));
    side.appendChild(svgMath(643, 100, 'p^{des}_b = p_\\Delta + R_\\Delta\\,(p^{ref}_b - p^{ref}_{anchor})', { size: 13, anchor: 'middle', w: 250 }));
    side.appendChild(svgRich(530, 136, '$p_\\Delta$：机器人的 $x, y$ + 参考的 $z$', { size: 11, w: 236, cls: 'demo-x-ink2' }));
    side.appendChild(svgRich(530, 156, '$R_\\Delta$：只绕竖直轴转偏航差', { size: 11, w: 236, cls: 'demo-x-ink2' }));
    side.appendChild(svgText(530, 176, '速度目标不变，直接用参考的', 'demo-x-mut', 10.5));
    var barG = group(side);
    barG.appendChild(svgText(530, 202, '部位位置这一项奖励', 'demo-x-mut', 10.5));
    barG.appendChild(svgText(530, 226, '跟世界系', 'demo-x-bad', 10.5));
    barG.appendChild(svgText(530, 254, '锚定', 'demo-x-good', 10.5));
    rectBox(barG, 590, 214, 150, 16, C_BORDER, 'none');
    rectBox(barG, 590, 242, 150, 16, C_BORDER, 'none');
    var bW = hbar(barG, 590, 214, 16, C_BAD), bA = hbar(barG, 590, 242, 16, C_GOOD);
    var vW = svgText(746, 227, '', 'demo-x-mono', 10.5, 'end'), vA = svgText(746, 255, '', 'demo-x-mono', 10.5, 'end');
    barG.appendChild(vW);
    barG.appendChild(vA);
    barG.appendChild(svgText(530, 288, '水平漂 0.5 m：0.062 对 1', 'demo-x-acc', 11));

    var foot = group(s);
    chip(foot, 30, 318, 240, '锚点自己：误差 9 维进观测', C_BORDER, { h: 34 });
    chip(foot, 280, 318, 240, '可选：锚点全局奖励，权重 0.5', C_BORDER, { h: 34 });
    chip(foot, 530, 318, 240, '终止只看高度（0.25 m）和倾斜', C_GOOD, { h: 34 });
    var foot2 = svgText(400, 378, '放开的是水平位置和偏航；高度、俯仰、横滚照样要跟 —— 蹲下、跳起、倒地都算', 'demo-x-ink2', 11.5, 'middle');
    s.appendChild(foot2);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(field, seg(t, 0.2, 0.8));
      var xRef = 0.15 + ((now * 0.25) % 1.6); // 参考往前走，循环
      var drift = DRIFT_EX.yaw === 0 ? 0 : seg(now, 1.0, 5.0);
      var dy = -Math.sqrt(DRIFT_D2) * drift, yaw = DRIFT_EX.yaw * drift;
      var anchored = t >= 3.6;
      function px(m) { return [50 + m[0] * SCALE, 120 - m[1] * SCALE]; }
      var refPx = [], robPx = [];
      PTS.forEach(function (o, i) {
        var ref = [xRef + o[0], o[1]];
        var c = Math.cos(yaw), sn = Math.sin(yaw);
        var rob = [xRef + c * o[0] - sn * o[1], dy + sn * o[0] + c * o[1]];
        var des = anchored ? rob : ref;
        moveDot(refC[i], px(ref));
        moveDot(robC[i], px(rob));
        refPx.push(px(ref));
        robPx.push(px(rob));
        moveDot(desC[i], px(des));
        var a = px(des), b = px(rob);
        errLines[i].setAttribute('x1', a[0].toFixed(1)); errLines[i].setAttribute('y1', a[1].toFixed(1));
        errLines[i].setAttribute('x2', b[0].toFixed(1)); errLines[i].setAttribute('y2', b[1].toFixed(1));
      });
      boneTo(refC, refPx);
      boneTo(robC, robPx);
      desC.forEach(function (c) { setOpacity(c, anchored ? 1 : 0.35); });
      var d = Math.sqrt(DRIFT_D2) * drift;
      driftLbl.textContent = '漂了 ' + fmt(d, 2) + ' m，偏航 ' + fmt(yaw, 2) + ' rad';
      modeLbl.textContent = anchored ? '锚定：目标跟着机器人' : '跟世界系：每个部位都「错」了';
      paint(modeLbl, anchored ? C_GOOD : C_BAD);
      setOpacity(side, seg(t, 3.6, 4.2));
      var rW = Math.exp(-(d * d) / (SIGMA.p * SIGMA.p));
      setW(bW, 150 * rW);
      setW(bA, 150);
      vW.textContent = fmt(rW, 3);
      vA.textContent = '1.000';
      setOpacity(barG, seg(t, 10.4, 11.0));
      setOpacity(foot, seg(t, 13.4, 14.0));
      setOpacity(foot2, seg(t, 7.0, 7.6));
    }
    return { el: s, draw: draw };
  }

  /* ── 第 3 幕：奖励 ── */
  function buildSceneReward() {
    var s = sceneSvg('左侧四个钟形曲线是四项跟踪奖励：位置、朝向、线速度、角速度，各自的 σ 是 0.3 米、0.4 弧度、1 米每秒、3.14 弧度每秒，小点来回滑动，误差到 0.25 米、19 度、0.83 米每秒、2.6 弧度每秒时这一项剩一半。右侧是三项正则：关节软限位 −10、动作变化率 −0.1、自碰撞 −0.1。下方：前人常加的力矩扰动、接触力、打滑等惩罚都没有');
    s.appendChild(svgText(30, 28, '误差过四个高斯：误差越大，这一项越接近 0', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 470, 262, C_BORDER, C_SURFACE2);
    left.appendChild(svgMath(265, 70, 'r_s = \\exp\\!\\left(-\\bar e_s / \\sigma_s^2\\right)', { size: 14, anchor: 'middle', w: 300 }));
    var specs = [
      ['位置', SIGMA.p, 'm', 0.6], ['朝向', SIGMA.R, 'rad', 0.8], ['线速度', SIGMA.v, 'm/s', 2], ['角速度', SIGMA.w, 'rad/s', 6.3]
    ];
    var bells = specs.map(function (sp, k) {
      var x0 = 50 + (k % 2) * 230, y0 = 96 + Math.floor(k / 2) * 104, w = 200, h = 70;
      var g = group(left);
      g.appendChild(paint(svgEl('line', { x1: x0, y1: y0 + h, x2: x0 + w, y2: y0 + h, 'stroke-width': 1 }), null, C_BORDER));
      var pts = [];
      for (var i = 0; i <= 40; i++) {
        var e = (sp[3] * i) / 40;
        pts.push([x0 + (w * i) / 40, y0 + h - h * Math.exp(-(e * e) / (sp[1] * sp[1]))]);
      }
      pathLine(g, pts, C_ACCENT, 2);
      var half = halfRms(sp[1]), hx = x0 + (w * half) / sp[3];
      g.appendChild(paint(svgEl('line', { x1: hx, y1: y0 + h / 2, x2: hx, y2: y0 + h, 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_WARN));
      g.appendChild(svgRich(x0, y0 - 4, sp[0] + '：$\\sigma$ = ' + fmt(sp[1], sp[1] < 1 ? 1 : 2) + ' ' + sp[2], { size: 10.5, w: 190, cls: 'demo-x-ink2' }));
      var halfTxt = k === 1 ? fmt((half * 180) / Math.PI, 0) + '°' : fmt(half, 2) + ' ' + sp[2];
      g.appendChild(svgText(hx + 4, y0 + h / 2 - 3, '剩一半：' + halfTxt, 'demo-x-warn', 10));
      var d = dotAt(g, x0, y0, 5, C_GOOD);
      var v = svgText(x0 + w, y0 + 12, '', 'demo-x-mono', 10, 'end');
      g.appendChild(v);
      return { g: g, x0: x0, y0: y0, w: w, h: h, sp: sp, d: d, v: v, k: k };
    });
    left.appendChild(svgText(265, 296, '14 个目标部位各算一遍，取均方；四项权重都是 1，不按动作调', 'demo-x-mut', 10.5, 'middle'));

    var right = group(s);
    rectBox(right, 516, 44, 254, 262, C_BORDER, C_SURFACE);
    right.appendChild(svgText(530, 64, '只留三项正则（表 S1）', 'demo-x-mut', 10.5));
    var regs = [['关节软限位', '超出 0.9 倍机械限位', '−10'], ['动作变化率', '相邻两步动作之差的平方', '−0.1'], ['自碰撞', '除手脚外，接触力 > 1 N 的部位数', '−0.1']];
    var regNodes = regs.map(function (r, k) {
      var g = group(right), y = 78 + k * 74;
      rectBox(g, 530, y, 226, 64, C_WARN, C_SURFACE2);
      g.appendChild(svgText(542, y + 20, r[0], 'demo-x-ink2', 11.5));
      g.appendChild(svgText(744, y + 20, r[2], 'demo-x-bad', 12, 'end'));
      g.appendChild(svgText(542, y + 36, r[1], 'demo-x-mut', 10));
      return g;
    });
    var gaugeNeedle = paint(svgEl('line', { 'stroke-width': 2 }), null, C_BAD);
    regNodes[0].appendChild(paint(svgEl('rect', { x: 542, y: 128, width: 150, height: 6, rx: 3 }), C_BORDER));
    regNodes[0].appendChild(paint(svgEl('rect', { x: 677, y: 128, width: 15, height: 6, rx: 3 }), C_BAD));
    regNodes[0].appendChild(svgText(700, 135, '0.9', 'demo-x-mono', 9.5));
    regNodes[0].appendChild(gaugeNeedle);
    var jitter = pathLine(regNodes[1], [[542, 206], [700, 206]], C_ACCENT, 1.6);
    var spark = group(regNodes[2]);
    spark.appendChild(paint(svgEl('line', { x1: 616, y1: 248, x2: 668, y2: 248, 'stroke-width': 4, 'stroke-linecap': 'round' }), null, C_MUTED));
    var armSeg = paint(svgEl('line', { 'stroke-width': 4, 'stroke-linecap': 'round' }), null, C_MUTED);
    spark.appendChild(armSeg);
    var flash = dotAt(spark, 668, 248, 5, C_BAD);

    var foot = group(s);
    ['力矩扰动', '接触力罚', '打滑罚', '跺脚罚', '步态正则'].forEach(function (w, k) {
      var g = chip(foot, 30 + k * 150, 318, 140, w, C_BORDER, { h: 30, dash: '4 3' });
      g.appendChild(paint(svgEl('line', { x1: 40 + k * 150, y1: 333, x2: 160 + k * 150, y2: 333, 'stroke-width': 1.6 }), null, C_BAD));
    });
    var foot2 = svgText(400, 376, '前人常加的这些都没有：堆启发式会稀释目标，换个动作就得重调', 'demo-x-ink2', 11.5, 'middle');
    foot.appendChild(foot2);
    var codeNote = svgText(400, 400, '官方代码默认还开着锚点的两项全局奖励（权重 0.5）', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(codeNote);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.8));
      bells.forEach(function (B) {
        setOpacity(B.g, seg(t, 0.4 + B.k * 0.6, 1.0 + B.k * 0.6) * (t < 3.6 ? 1 : 1));
        var u = 0.5 - 0.5 * Math.cos(now * 1.3 + B.k * 0.8);
        var e = B.sp[3] * 0.85 * u, r = Math.exp(-(e * e) / (B.sp[1] * B.sp[1]));
        moveDot(B.d, [B.x0 + (B.w * e) / B.sp[3], B.y0 + B.h - B.h * r]);
        B.v.textContent = 'r = ' + fmt(r, 2);
      });
      setOpacity(right, seg(t, 7.0, 7.6));
      regNodes.forEach(function (g, k) { setOpacity(g, seg(t, 7.2 + k * 0.6, 7.8 + k * 0.6)); });
      var gx = 560 + 128 * (0.5 + 0.5 * Math.sin(now * 1.6));
      gaugeNeedle.setAttribute('x1', gx.toFixed(1)); gaugeNeedle.setAttribute('x2', gx.toFixed(1));
      gaugeNeedle.setAttribute('y1', 122); gaugeNeedle.setAttribute('y2', 140);
      var jp = [];
      for (var i = 0; i <= 30; i++) jp.push([542 + i * 5.3, 206 + 6 * Math.sin(i * 1.9 + now * 6) * (0.4 + 0.6 * Math.abs(Math.sin(now * 0.7)))]);
      setPath(jitter, jp);
      var ang = 0.6 + 0.5 * Math.sin(now * 2);
      var th = 0.15 + 0.3 * (ang - 0.1);
      armSeg.setAttribute('x1', 708); armSeg.setAttribute('y1', 232);
      armSeg.setAttribute('x2', (708 - 40 * Math.cos(th)).toFixed(1)); armSeg.setAttribute('y2', (232 + 40 * Math.sin(th)).toFixed(1));
      setOpacity(flash, ang > 1.0 ? 1 : 0);
      setOpacity(foot, seg(t, 10.4, 11.0));
      setOpacity(codeNote, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── 第 4 幕：观测 ── */
  function avg(a) {
    return sum(a) / a.length;
  }
  function buildSceneObs() {
    var s = sceneSvg('上方的长条是策略的观测，逐段拼起来：参考的关节角与速度 58 维、锚点误差 9 维、机身速度 6 维、关节角、关节速度、上一步动作各 29 维，一共 160 维；评论家再多看 14 个部位相对锚点的位置和朝向，共 286 维。右下是图 8A 的消融（读图）：四元数、轴角比 Rot6D 差，加历史反而更差，25 步历史误差是 2 倍多');
    s.appendChild(svgText(30, 28, '160 维：参考进度、锚点误差、本体感受，不加历史', 'demo-x-ink2', 13.5));
    var top = group(s);
    rectBox(top, 30, 44, 740, 136, C_BORDER, C_SURFACE2);
    top.appendChild(svgText(44, 64, '策略（演员）', 'demo-x-ink2', 11.5));
    var cols = [C_ACCENT, C_GOOD, C_WARN, C_MUTED, C_MUTED, C_MUTED];
    var x0 = 44, W = 712, segs = [];
    var acc = 0;
    OBS.forEach(function (o, k) {
      var w = (W * o[1]) / N_CRITIC;
      var g = group(top);
      var r = rectBox(g, x0 + acc, 72, Math.max(w - 2, 2), 30, cols[k], cols[k]);
      r.style.opacity = 0.35;
      g.appendChild(svgText(x0 + acc + w / 2, 92, String(o[1]), 'demo-x-mono', 10.5, 'middle'));
      var lx = 44 + (k % 3) * 238, ly = 120 + Math.floor(k / 3) * 16;
      g.appendChild(paint(svgEl('rect', { x: lx, y: ly - 9, width: 10, height: 10, rx: 2, opacity: 0.6 }), cols[k]));
      g.appendChild(svgText(lx + 16, ly, o[0] + ' ' + o[1], 'demo-x-mut', 10));
      segs.push(g);
      acc += w;
    });
    var total = svgText(756, 64, '', 'demo-x-acc', 12, 'end');
    top.appendChild(total);
    var critic = group(top);
    critic.appendChild(svgText(44, 162, '评论家再多看', 'demo-x-ink2', 11));
    var cAcc = acc;
    CRITIC_EXTRA.forEach(function (o, k) {
      var w = (W * o[1]) / N_CRITIC;
      var r = rectBox(critic, x0 + cAcc, 148, w - 2, 22, C_GOOD, C_GOOD, '3 3');
      r.style.opacity = 0.25;
      critic.appendChild(svgText(x0 + cAcc + w / 2, 163, o[1] + ' · ' + (k ? '朝向' : '位置'), 'demo-x-mono', 10, 'middle'));
      cAcc += w;
    });
    critic.appendChild(svgText(x0 + acc - 6, 163, '共 ' + N_CRITIC + ' 维', 'demo-x-good', 10.5, 'end'));

    var abl = group(s);
    rectBox(abl, 30, 192, 470, 216, C_BORDER, C_SURFACE);
    abl.appendChild(svgText(44, 212, '图 8A：真机上的局部跟踪误差（四项平均，原设置 = 1，读图）', 'demo-x-mut', 10.5));
    var groups = [['rot', 60], ['hist', 270]];
    var bars = [];
    groups.forEach(function (gp) {
      var d = FIG8A[gp[0]], gx = gp[1];
      abl.appendChild(paint(svgEl('line', { x1: gx, y1: 376, x2: gx + 200, y2: 376, 'stroke-width': 1 }), null, C_BORDER));
      d.name.forEach(function (nm, i) {
        var v = avg(d.local[i]), n = d.name.length, bw = 160 / n;
        var b = vbar(abl, gx + 8 + i * (200 / n), 376, bw * 0.8, i === 0 ? C_GOOD : v > 1.5 ? C_BAD : C_WARN);
        var lbl = svgText(gx + 8 + i * (200 / n) + bw * 0.4, 376, '×' + fmt(v, 2), 'demo-x-mono', 10, 'middle');
        abl.appendChild(lbl);
        abl.appendChild(svgText(gx + 8 + i * (200 / n) + bw * 0.4, 392, nm.replace('（原设置）', ''), 'demo-x-mut', 9, 'middle'));
        bars.push({ b: b, v: v, lbl: lbl, kind: gp[0], i: i });
      });
    });
    var fallMark = svgText(60 + 8 + 2 * (200 / 3) + 22, 250, '摔了一次', 'demo-x-bad', 10, 'middle');
    abl.appendChild(fallMark);

    var why = group(s);
    rectBox(why, 516, 192, 254, 216, C_BORDER, C_SURFACE2);
    why.appendChild(svgText(530, 214, '为什么不加历史？', 'demo-x-ink2', 11.5));
    why.appendChild(svgText(530, 238, '作者的猜测：随机化很少时，历史', 'demo-x-mut', 10.5));
    why.appendChild(svgText(530, 256, '让策略记住仿真特有的状态—动作规律', 'demo-x-mut', 10.5));
    why.appendChild(svgText(530, 274, '上真机分布一变就差', 'demo-x-mut', 10.5));
    var noSe = group(why);
    rectBox(noSe, 530, 296, 226, 96, C_WARN, C_SURFACE, '4 3');
    noSe.appendChild(svgText(542, 318, '状态估计靠不住时', 'demo-x-warn', 11));
    noSe.appendChild(svgText(542, 340, '去掉锚点位置误差（3）', 'demo-x-mut', 10.5));
    noSe.appendChild(svgText(542, 358, '和机身线速度（3）', 'demo-x-mut', 10.5));
    noSe.appendChild(svgText(542, 380, '→ ' + N_OBS_NO_SE + ' 维；起身这类动作这样部署', 'demo-x-ink2', 10.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(top, seg(t, 0.2, 0.8));
      var shown = 0;
      segs.forEach(function (g, k) {
        var u = seg(t, 0.4 + k * 0.45, 0.9 + k * 0.45);
        setOpacity(g, u);
        if (u > 0.5) shown += OBS[k][1];
      });
      total.textContent = shown + ' 维';
      setOpacity(critic, seg(t, 3.6, 4.2));
      setOpacity(abl, seg(t, 7.0, 7.6));
      bars.forEach(function (B) {
        var start = B.kind === 'rot' ? 7.2 : 10.4;
        var u = ease(seg(t, start + B.i * 0.4, start + 0.6 + B.i * 0.4));
        var h = 70 * Math.min(B.v, 2.5) * u;
        setH(B.b, h);
        B.lbl.setAttribute('y', (376 - h - 4).toFixed(1));
        setOpacity(B.lbl, u);
      });
      setOpacity(fallMark, seg(t, 8.6, 9.0) * (0.6 + 0.4 * Math.abs(Math.sin(now * 3))));
      setOpacity(why, seg(t, 10.4, 11.0));
      setOpacity(noSe, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── 第 5 幕：动作与关节阻抗 ── */
  function buildSceneImpedance() {
    var s = sceneSvg('左侧是一个膝关节：电机转子经齿轮带动连杆，弹簧和阻尼器表示 PD。目标在 0 和 α 之间跳，虚线连杆只算电机惯量，按设计的 10 赫兹、阻尼比 2 平稳到位；实线代入真实轴惯量，频率降到 4.3 赫兹、阻尼比 0.86，略有超调。右侧柱子是各关节里电机惯量的占比，膝 18%，踝横滚 95%。下方是图 8A 与图 S2 的消融');
    s.appendChild(svgText(30, 28, 'PD 增益 = 反射惯量 × 频率²；动作取 1 = 25% 最大力矩', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 400, 262, C_BORDER, C_SURFACE2);
    left.appendChild(svgMath(230, 72, 'k_p = I\\,\\omega^2,\\quad k_d = 2 I \\zeta \\omega', { size: 14, anchor: 'middle', w: 380 }));
    var PIV = [150, 190];
    var rotor = group(left);
    rotor.appendChild(paint(svgEl('circle', { cx: 0, cy: 0, r: 26, 'stroke-width': 2, fill: 'none' }), null, C_WARN));
    for (var sp = 0; sp < 6; sp++) {
      var a = (sp * Math.PI) / 3;
      rotor.appendChild(paint(svgEl('line', { x1: 0, y1: 0, x2: (26 * Math.cos(a)).toFixed(1), y2: (26 * Math.sin(a)).toFixed(1), 'stroke-width': 1.4 }), null, C_WARN));
    }
    left.appendChild(svgText(80, 250, '转子惯量 × 齿比²', 'demo-x-warn', 10.5, 'middle'));
    left.appendChild(svgText(80, 266, '= 反射惯量（armature）', 'demo-x-warn', 10.5, 'middle'));
    left.appendChild(paint(svgEl('circle', { cx: PIV[0], cy: PIV[1], r: 6 }), C_MUTED));
    var targetArm = paint(svgEl('line', { 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }), null, C_GOOD);
    left.appendChild(targetArm);
    var linkDesign = paint(svgEl('line', { 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-dasharray': '7 5' }), null, C_MUTED);
    var linkReal = paint(svgEl('line', { 'stroke-width': 6, 'stroke-linecap': 'round' }), null, C_ACCENT);
    left.appendChild(linkDesign);
    left.appendChild(linkReal);
    var knee = KNEE;
    var respD = stepResponse(knee.kp, knee.kd, knee.I, knee.alpha, knee.tauMax, 0.6, 120);
    var respR = stepResponse(knee.kp, knee.kd, knee.Ieff, knee.alpha, knee.tauMax, 0.6, 120);
    var readout = [
      svgRich(250, 130, '膝：$I$ = ' + fmt(knee.I, 4) + ' kg·m²', { size: 11, w: 170, cls: 'demo-x-ink2' }),
      svgRich(250, 150, '$k_p$ = ' + fmt(knee.kp, 1) + '，$k_d$ = ' + fmt(knee.kd, 2), { size: 11, w: 170, cls: 'demo-x-ink2' }),
      svgRich(250, 170, '$\\omega$ = 10 Hz，$\\zeta$ = 2', { size: 11, w: 170, cls: 'demo-x-ink2' })
    ];
    readout.forEach(function (n) { left.appendChild(n); });
    var alphaG = group(left);
    alphaG.appendChild(svgRich(250, 200, '动作 = 1 → 设定点 +' + fmt(knee.alpha, 3) + ' rad', { size: 11, w: 175, cls: 'demo-x-good' }));
    alphaG.appendChild(svgText(250, 220, '= 静止时 25% 最大力矩（' + fmt(knee.kp * knee.alpha, 1) + ' N·m）', 'demo-x-mut', 10));
    alphaG.appendChild(svgText(250, 238, '设定点只是中间量，不按限位裁剪', 'demo-x-mut', 10));
    var realG = group(left);
    realG.appendChild(svgText(250, 262, '代入真实轴惯量 ' + fmt(knee.Ieff, 3) + '：', 'demo-x-acc', 10.5));
    realG.appendChild(svgRich(250, 280, fmt(knee.fReal, 1) + ' Hz、阻尼比 ' + fmt(knee.zetaReal, 2) + ' → 所以先取 $\\zeta$ = 2', { size: 10.5, w: 180, cls: 'demo-x-acc' }));
    realG.appendChild(svgText(44, 296, '虚线：只算电机惯量；实线：真实惯量', 'demo-x-mut', 10));

    var right = group(s);
    rectBox(right, 446, 44, 324, 262, C_BORDER, C_SURFACE);
    right.appendChild(svgText(460, 64, '电机惯量占轴惯量（表 S4，名义姿态）', 'demo-x-mut', 10.5));
    var shareBars = JOINTS.map(function (j, i) {
      var g = jointGains(j), y = 76 + i * 17;
      right.appendChild(svgText(510, y + 11, j[0], i === 3 || i === 5 ? 'demo-x-acc' : 'demo-x-mut', 10, 'end'));
      var b = hbar(right, 516, y + 2, 11, i === 3 || i === 5 ? C_ACCENT : C_MUTED);
      var v = svgText(522, y + 11, '', 'demo-x-mono', 9.5);
      right.appendChild(v);
      return { b: b, v: v, share: g.share, i: i };
    });

    var foot = group(s);
    var cards = [
      ['armature 设成 0', '局部误差 ×1.2–1.3、过冲自碰', C_BAD],
      ['ω = 5 Hz', '全局位置误差 ×2.75', C_WARN],
      ['ω = 25 Hz', '局部 ×0.88，但齿轮箱振、响', C_WARN],
      ['ASAP 的手调增益', '全局偏航 ×2.22', C_WARN]
    ].map(function (c, k) {
      var g = group(foot);
      rectBox(g, 30 + k * 186, 318, 178, 56, c[2], C_SURFACE2);
      g.appendChild(svgText(42 + k * 186, 340, c[0], 'demo-x-ink2', 11));
      g.appendChild(svgText(42 + k * 186, 360, c[1], 'demo-x-mut', 10));
      return g;
    });
    foot.appendChild(svgText(400, 396, '图 8A、图 S2 的消融（读图，原设置 = 1）：10 Hz 的全局跟踪最好', 'demo-x-mut', 10.5, 'middle'));

    function linkTo(node, ang, len) {
      node.setAttribute('x1', PIV[0]); node.setAttribute('y1', PIV[1]);
      node.setAttribute('x2', (PIV[0] + len * Math.sin(ang)).toFixed(1));
      node.setAttribute('y2', (PIV[1] - len * Math.cos(ang)).toFixed(1));
    }
    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.8));
      tr(rotor, 80, 190, (now * 260) % 360);
      /* 目标每 1.2 s 在 0 与 α 之间来回跳；角度放大 2.2 倍好看清 */
      var cyc = now % 2.4, up = cyc < 1.2, tt = up ? cyc : cyc - 1.2;
      var idx = Math.min(respD.length - 1, Math.round((tt / 0.6) * 120));
      var qd = up ? respD[idx][1] : knee.alpha - respD[idx][1];
      var qr = up ? respR[idx][1] : knee.alpha - respR[idx][1];
      var G = 2.2, base = -0.5;
      linkTo(targetArm, base + G * (up ? knee.alpha : 0), 96);
      linkTo(linkDesign, base + G * qd, 84);
      linkTo(linkReal, base + G * qr, 84);
      readout.forEach(function (n, k) { setOpacity(n, seg(t, 3.6 + k * 0.4, 4.0 + k * 0.4)); });
      setOpacity(alphaG, seg(t, 7.0, 7.6));
      setOpacity(realG, seg(t, 10.4, 11.0));
      setOpacity(linkDesign, t >= 10.4 ? 1 : 0);
      setOpacity(right, seg(t, 10.6, 11.2));
      shareBars.forEach(function (B) {
        var u = ease(seg(t, 10.8 + B.i * 0.08, 11.6 + B.i * 0.08));
        setW(B.b, 220 * B.share * u);
        B.v.setAttribute('x', (522 + 220 * B.share * u).toFixed(1));
        B.v.textContent = u > 0.2 ? fmt(B.share * 100, 1) + '%' : '';
      });
      setOpacity(foot, seg(t, 13.4, 14.0));
      cards.forEach(function (g, k) { setOpacity(g, seg(t, 13.4 + k * 0.4, 13.9 + k * 0.4)); });
    }
    return { el: s, draw: draw };
  }

  /* ── 第 6 幕：随机化与部署延迟 ── */
  var PUSH_TIMES = (function () {
    /* 按表 S2 每隔 U(1, 3) 秒推一次；固定种子，画面每次一样 */
    var r = mulberry32(5), t = 0.6, out = [];
    while (t < 60) {
      out.push({ t: t, dir: r() < 0.5 ? -1 : 1 });
      t += PUSH.every[0] + (PUSH.every[1] - PUSH.every[0]) * r();
    }
    return out;
  })();
  function buildSceneDR() {
    var s = sceneSvg('左侧：机器人原地走，每隔 1 到 3 秒被推一下；三个表盘是每个回合重新抽的摩擦系数、关节零位偏差和躯干质心偏移。右侧：一个控制步 20 毫秒，故意加 2、5、10 毫秒延迟，三次试验里分别摔 0、1、2 次。下方：仿真用厂家给的最准参数，不做系统辨识；部署是 C++ 实时框架');
    s.appendChild(svgText(30, 28, '训练：三类量 + 推一下；部署：多几毫秒延迟就会摔', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 400, 262, C_BORDER, C_SURFACE2);
    left.appendChild(svgText(44, 64, '训练时：每个回合重抽三类量，再隔 1–3 s 推一下', 'demo-x-mut', 10.5));
    left.appendChild(paint(svgEl('line', { x1: 60, y1: 196, x2: 220, y2: 196, 'stroke-width': 1.4 }), null, C_BORDER));
    var walker = robot(left, C_ACCENT, 0.95);
    var pushArrow = paint(svgEl('path', { 'stroke-width': 3, fill: 'none' }), null, C_BAD);
    left.appendChild(pushArrow);
    var pushLbl = svgText(140, 92, '', 'demo-x-bad', 10.5, 'middle');
    left.appendChild(pushLbl);
    var dials = [
      ['摩擦', '静 0.3–1.6，动 0.3–1.2', 0], ['关节零位', '±0.01 rad（动作、观测一起偏）', 1], ['躯干质心', 'x ±2.5 cm，y / z ±5 cm', 2]
    ].map(function (d, k) {
      var g = group(left), y = 86 + k * 70;
      rectBox(g, 240, y, 176, 60, C_WARN, C_SURFACE);
      g.appendChild(svgText(252, y + 18, d[0], 'demo-x-ink2', 11));
      g.appendChild(svgText(252, y + 50, d[1], 'demo-x-mut', 9.5));
      g.appendChild(paint(svgEl('line', { x1: 252, y1: y + 32, x2: 404, y2: y + 32, 'stroke-width': 4, 'stroke-linecap': 'round' }), null, C_BORDER));
      var knobDot = dotAt(g, 328, y + 32, 6, C_WARN);
      return { g: g, dot: knobDot, y: y, k: k };
    });
    left.appendChild(svgText(130, 226, '推：线速度 ±0.5 m/s（竖直 ±0.2）', 'demo-x-mut', 10, 'middle'));
    left.appendChild(svgText(130, 242, '角速度 ±0.52 / ±0.78 rad/s', 'demo-x-mut', 10, 'middle'));
    left.appendChild(svgText(130, 266, '回合开头的位姿、关节角也加小扰动', 'demo-x-mut', 10, 'middle'));
    left.appendChild(svgText(130, 290, '外加观测噪声（官方代码）', 'demo-x-mut', 10, 'middle'));

    var right = group(s);
    rectBox(right, 446, 44, 324, 262, C_BORDER, C_SURFACE);
    right.appendChild(svgText(460, 64, '部署：故意加延迟（图 8A，每档试 3 次）', 'demo-x-mut', 10.5));
    right.appendChild(svgText(460, 88, '一个控制步 20 ms（50 Hz）', 'demo-x-ink2', 11));
    var tl = group(right);
    rectBox(tl, 460, 98, 290, 18, C_BORDER, 'none');
    var delayBar = hbar(tl, 460, 98, 18, C_BAD, 0.7);
    var dLbl = svgText(755, 88, '', 'demo-x-mono', 10.5, 'end');
    tl.appendChild(dLbl);
    var rows = DELAY_MS.map(function (ms, k) {
      var g = group(right), y = 128 + k * 50;
      g.appendChild(svgText(460, y + 22, '+' + ms + ' ms', 'demo-x-ink2', 11.5));
      var marks = [];
      for (var i = 0; i < DELAY_TRIALS; i++) {
        var fail = i >= DELAY_TRIALS - DELAY_FAILS[k];
        var f = robot(g, fail ? C_BAD : C_GOOD, 0.34);
        marks.push({ f: f, fail: fail, x: 540 + i * 50 });
      }
      g.appendChild(svgText(700, y + 22, DELAY_FAILS[k] + ' / ' + DELAY_TRIALS + ' 摔', DELAY_FAILS[k] ? 'demo-x-bad' : 'demo-x-good', 11));
      return { g: g, marks: marks, y: y, k: k };
    });
    right.appendChild(svgText(460, 290, '2 ms：速度误差已经上去（局部 ×1.12）', 'demo-x-mut', 10));

    var footA = chip(s, 30, 318, 360, '仿真参数用厂家给的最准值，不做系统辨识', C_BORDER, { h: 34 });
    var footB = chip(s, 410, 318, 360, 'C++ 实时：状态估计 500 Hz，策略推理 < 1 ms', C_GOOD, { h: 34 });
    var foot2 = svgText(400, 384, '延迟也能随机化进训练，但会更难学；他们选把部署延迟压到最小', 'demo-x-ink2', 11.5, 'middle');
    s.appendChild(foot2);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.8));
      /* 最近一次推：0.5 s 内身体往被推的方向倾 */
      var last = null;
      PUSH_TIMES.forEach(function (pu) { if (pu.t <= now) last = pu; });
      var since = last ? now - last.t : 99, k = since < 0.6 ? Math.sin((Math.PI * since) / 0.6) : 0;
      var P = poseWalk((now * 0.9) % 1);
      if (k > 0) P = lerpPose(P, last.dir > 0 ? POSE_LEAN : { lean: -18, armA: [-50, -40], armB: [30, 10], legA: [10, 4], legB: [-14, -8] }, k * 0.8);
      walker.put(140 + (last ? last.dir * 10 * k : 0), 196, P, 0);
      if (since < 0.6 && t >= 0.3) {
        var dir = last.dir, x1 = 140 - dir * 70, x2 = 140 - dir * 30;
        pushArrow.setAttribute('d', 'M ' + x1 + ' 128 L ' + x2 + ' 128 M ' + (x2 - dir * 8) + ' 122 L ' + x2 + ' 128 L ' + (x2 - dir * 8) + ' 134');
        setOpacity(pushArrow, 1);
        pushLbl.textContent = '推！';
        setOpacity(pushLbl, 1);
      } else {
        setOpacity(pushArrow, 0);
        setOpacity(pushLbl, 0);
      }
      var ep = Math.floor(now / 3.4);
      dials.forEach(function (D) {
        var r = mulberry32(ep * 7 + D.k * 131 + 1)();
        moveDot(D.dot, [252 + 152 * r, D.y + 32]);
        setOpacity(D.g, seg(t, 3.6 + D.k * 0.5, 4.1 + D.k * 0.5));
      });
      setOpacity(right, seg(t, 10.4, 11.0));
      var lvl = Math.floor(((now - 10.4) % 6) / 2);
      if (t < 10.4) lvl = 0;
      setW(delayBar, (290 * DELAY_MS[Math.max(lvl, 0)]) / 20);
      dLbl.textContent = '+' + DELAY_MS[Math.max(lvl, 0)] + ' ms = ' + fmt((DELAY_MS[Math.max(lvl, 0)] / 20) * 100, 0) + '% 个控制步';
      rows.forEach(function (R) {
        setOpacity(R.g, seg(t, 10.8 + R.k * 0.6, 11.3 + R.k * 0.6));
        R.marks.forEach(function (M, i) {
          var wob = M.fail ? clamp((now - 11 - R.k * 0.6 - i * 0.2) % 3, 0, 1) : 0;
          M.f.put(M.x, R.y + 34, M.fail ? lerpPose(POSE_STAND, POSE_LEAN, wob) : poseWalk((now * 0.8 + i * 0.3) % 1), 0, null, M.fail ? 70 * wob : 0);
        });
      });
      setOpacity(footA, seg(t, 0.4, 1.0));
      setOpacity(footB, seg(t, 10.6, 11.2));
      setOpacity(foot2, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── 第 7 幕：自适应采样 ── */
  var S7_BINS = 40, S7_HARD = [14, 15, 27, 28];
  function s7Profile(phase) {
    /* 示意的失败数：phase 0 = 还没统计（全 0），1 = 难段失败多，2 = 难段学会、只剩零星失败 */
    var f = [];
    for (var i = 0; i < S7_BINS; i++) {
      var h = S7_HARD.indexOf(i) >= 0;
      f.push(phase === 0 ? 0 : phase === 1 ? (h ? 0.5 : 0.01) : h ? 0.03 : 0.012 + 0.006 * Math.sin(i * 1.7));
    }
    return f;
  }
  function buildSceneSampling() {
    var s = sceneSvg('上方是一条几分钟长的参考，按 1 秒分箱，第 14–15、27–28 秒是两段侧手翻。柱子是起点的采样概率：一开始均匀；失败统计起来以后集中到难段，核把概率往失败前两秒摊；难段学会后又摊平。小点是一个个回合的起点。左下是核的三个权重，右下是图 8B：不用自适应采样，4 段长动作有 3 段 3 万次迭代后仍过不去；简单的 Motion 4 迭代数减半');
    s.appendChild(svgText(30, 28, '起点按失败统计抽，再往失败前两秒摊', 'demo-x-ink2', 13.5));
    var top = group(s);
    rectBox(top, 30, 44, 740, 200, C_BORDER, C_SURFACE2);
    var phaseLbl = svgText(44, 64, '', 'demo-x-mut', 10.5);
    top.appendChild(phaseLbl);
    var X0 = 50, BW = 700 / S7_BINS, BASE = 214;
    S7_HARD.forEach(function (h) {
      top.appendChild(paint(svgEl('rect', { x: X0 + h * BW, y: 74, width: BW, height: 140, opacity: 0.12 }), C_WARN));
    });
    top.appendChild(svgText(X0 + 14.5 * BW + BW / 2, 232, '侧手翻', 'demo-x-warn', 10, 'middle'));
    top.appendChild(svgText(X0 + 27.5 * BW + BW / 2, 232, '侧手翻', 'demo-x-warn', 10, 'middle'));
    top.appendChild(paint(svgEl('line', { x1: X0, y1: BASE, x2: X0 + 700, y2: BASE, 'stroke-width': 1.2 }), null, C_BORDER));
    var bars = [];
    for (var i = 0; i < S7_BINS; i++) bars.push(vbar(top, X0 + i * BW + 1, BASE, BW - 2, C_ACCENT, 0.75));
    var drops = [];
    for (var d = 0; d < 14; d++) drops.push(dotAt(top, 0, 0, 3.2, C_GOOD));
    var uniLine = paint(svgEl('line', { x1: X0, x2: X0 + 700, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), null, C_MUTED);
    top.appendChild(uniLine);
    var spreadArrow = group(top);
    var mkS = K.arrowMarker(s, 'bm-x-arrow-spread', C_GOOD);
    arrowPath(spreadArrow, [[X0 + 14 * BW + 2, 92], [X0 + 12 * BW + 4, 92]], C_GOOD, mkS);
    arrowPath(spreadArrow, [[X0 + 27 * BW + 2, 92], [X0 + 25 * BW + 4, 92]], C_GOOD, mkS);
    spreadArrow.appendChild(svgText(X0 + 13 * BW, 86, '往前摊 2 秒', 'demo-x-good', 10, 'middle'));

    var kern = group(s);
    rectBox(kern, 30, 256, 360, 152, C_BORDER, C_SURFACE);
    kern.appendChild(svgMath(210, 284, 'p_s \\propto \\sum_{u=0}^{2} \\rho^{u}\\,\\bigl(\\bar f_{s+u} + 0.1/S\\bigr)', { size: 13.5, anchor: 'middle', w: 340 }));
    var kw = asKernel(AS.kPaper);
    var kBars = kw.map(function (w, u) {
      var b = vbar(kern, 50 + u * 56, 378, 36, C_GOOD);
      kern.appendChild(svgText(68 + u * 56, 394, 'u = ' + u, 'demo-x-mut', 10, 'middle'));
      var v = svgText(68 + u * 56, 378, fmt(w, 2), 'demo-x-mono', 10, 'middle');
      kern.appendChild(v);
      return { b: b, v: v, w: w };
    });
    kern.appendChild(svgText(300, 318, '失败数：每步滑动平均', 'demo-x-mut', 10, 'middle'));
    kern.appendChild(svgText(300, 334, '（0.999 / 0.001）', 'demo-x-mut', 10, 'middle'));
    kern.appendChild(svgRich(300, 354, '$\\rho$ = 0.8；都不失败时', { size: 10, anchor: 'middle', w: 160, cls: 'demo-x-mut' }));
    kern.appendChild(svgText(300, 370, '0.1/S 的底让它回到均匀', 'demo-x-mut', 10, 'middle'));

    var fig = group(s);
    rectBox(fig, 406, 256, 364, 152, C_BORDER, C_SURFACE);
    fig.appendChild(svgText(420, 276, '图 8B：4 段长动作（3 万次迭代封顶）', 'demo-x-mut', 10.5));
    var rowsB = ['Motion 1（两段侧手翻）', 'Motion 2', 'Motion 3', 'Motion 4'].map(function (nm, k) {
      var g = group(fig), y = 294 + k * 22;
      g.appendChild(svgText(420, y + 4, nm, 'demo-x-ink2', 10.5));
      g.appendChild(svgText(610, y + 4, k < FIG8B.failNoAS ? '不用：卡住' : '不用：4k 次', k < FIG8B.failNoAS ? 'demo-x-bad' : 'demo-x-warn', 10.5));
      g.appendChild(svgText(700, y + 4, k < FIG8B.failNoAS ? '用：学会' : '用：2k 次', 'demo-x-good', 10.5));
      return g;
    });
    var codeNote = svgText(420, 396, '官方代码 2025-10-03 起默认核长 1（之前是 3）', 'demo-x-warn', 10.5);
    fig.appendChild(codeNote);

    function probsAt(t) {
      if (t < 3.6) return asProbs(s7Profile(0), 1);
      var p1 = asProbs(s7Profile(1), t < 7.0 ? 1 : AS.kPaper);
      if (t < 13.4) return p1;
      var p2 = asProbs(s7Profile(2), AS.kPaper), u = ease(seg(t, 13.4, 15.4));
      return p1.map(function (x, i) { return lerp(x, p2[i], u); });
    }
    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(top, seg(t, 0.2, 0.8));
      var p = probsAt(t), pMax = 0.2;
      bars.forEach(function (b, i) { setH(b, (130 * Math.min(p[i], pMax)) / pMax); });
      var uy = BASE - (130 * (1 / S7_BINS)) / pMax;
      uniLine.setAttribute('y1', uy.toFixed(1));
      uniLine.setAttribute('y2', uy.toFixed(1));
      phaseLbl.textContent = t < 3.6 ? '一开始：均匀抽起点（虚线 = 1/S）' : t < 7.0 ? '按失败统计抽：概率集中到侧手翻' : t < 13.4 ? '过一遍核：概率往失败前 2 秒摊' : '难段学会、失败变少：分布又摊平';
      /* 起点像雨点一样落进各箱 */
      drops.forEach(function (c, k) {
        var ph = (now * 0.9 + k / drops.length) % 1, r = mulberry32(k * 977 + Math.floor(now * 0.9 + k / drops.length) * 31)();
        var acc = 0, bin = S7_BINS - 1;
        for (var j = 0; j < S7_BINS; j++) { acc += p[j]; if (r < acc) { bin = j; break; } }
        moveDot(c, [X0 + bin * BW + BW / 2, 78 + ph * (BASE - 84)]);
        setOpacity(c, (1 - ph) * seg(t, 0.6, 1.2));
      });
      setOpacity(spreadArrow, seg(t, 7.0, 7.6) * (t < 13.4 ? 1 : 1 - seg(t, 13.4, 14.0)));
      setOpacity(kern, seg(t, 3.6, 4.2));
      kBars.forEach(function (K2, u) {
        var h = 90 * K2.w * ease(seg(t, 7.0 + u * 0.3, 7.6 + u * 0.3));
        setH(K2.b, h);
        K2.v.setAttribute('y', (378 - h - 4).toFixed(1));
        setOpacity(K2.v, seg(t, 7.0 + u * 0.3, 7.6 + u * 0.3));
      });
      setOpacity(fig, seg(t, 10.4, 11.0));
      rowsB.forEach(function (g, k) { setOpacity(g, seg(t, 10.6 + k * 0.4, 11.0 + k * 0.4)); });
      setOpacity(codeNote, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── 第 8 幕：跟踪上真机 ── */
  function grfCurve(x0, y0, w, h, kind, sharp) {
    var pts = [];
    for (var i = 0; i <= 50; i++) {
      var u = i / 50, f;
      if (kind === 'walk') {
        var p1 = Math.exp(-Math.pow((u - 0.25) / (sharp ? 0.08 : 0.12), 2)), p2 = Math.exp(-Math.pow((u - 0.75) / (sharp ? 0.08 : 0.12), 2));
        f = 1.1 * Math.max(p1, p2) + 0.75 * Math.sin(Math.PI * u) * (1 - Math.max(p1, p2)) * 0.9;
      } else {
        f = 2.4 * Math.pow(Math.sin(Math.PI * u), sharp ? 1.6 : 1.2);
      }
      pts.push([x0 + w * u, y0 + h - (h * f) / 2.6]);
    }
    return pts;
  }
  function buildSceneReal() {
    var s = sceneSvg('左侧：火柴人在做空中侧手翻，读数是腾空时的骨盆角速度，峰值 20 弧度每秒、平均 7.01，人做空翻平均约 7.75；加速度峰值 31 米每二次方秒；C 罗的庆祝动作连做 5 次。中间：地面反力，人和机器人的走路都是双峰、跑步单峰，机器人走路的峰更尖。右侧：用户研究 77 人，整体 70.8% 选 BeyondMimic，走路 57.0%，跑步 84.7%');
    s.appendChild(svgText(30, 28, '跟踪上真机：约 2.5 小时动作，30 段、15 分钟上 G1', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 270, 262, C_BORDER, C_SURFACE2);
    left.appendChild(svgText(44, 64, '空中侧手翻（户外软土、落叶）', 'demo-x-mut', 10.5));
    left.appendChild(paint(svgEl('line', { x1: 44, y1: 196, x2: 286, y2: 196, 'stroke-width': 1.4 }), null, C_BORDER));
    var flipper = robot(left, C_ACCENT, 0.72);
    var gauge = group(left);
    gauge.appendChild(paint(svgEl('rect', { x: 44, y: 214, width: 242, height: 12, rx: 4 }), C_BORDER));
    var gFill = hbar(gauge, 44, 214, 12, C_ACCENT);
    var gTxt = svgText(44, 244, '', 'demo-x-mono', 10.5);
    gauge.appendChild(gTxt);
    var hm = paint(svgEl('line', { x1: 44 + (242 * CARTWHEEL.human) / 22, y1: 208, x2: 44 + (242 * CARTWHEEL.human) / 22, y2: 232, 'stroke-width': 1.6 }), null, C_GOOD);
    gauge.appendChild(hm);
    gauge.appendChild(svgText(44 + (242 * CARTWHEEL.human) / 22, 262, '人 ≈ 7.75', 'demo-x-good', 10, 'middle'));
    gauge.appendChild(svgText(286, 262, '峰 20 rad/s', 'demo-x-acc', 10, 'end'));
    var accTxt = svgText(44, 284, '腾空加速度峰值 31 m/s²；落地基本不用救', 'demo-x-mut', 10);
    left.appendChild(accTxt);
    var rona = svgText(44, 300, '', 'demo-x-ink2', 10.5);
    left.appendChild(rona);

    var mid = group(s);
    rectBox(mid, 316, 44, 220, 262, C_BORDER, C_SURFACE);
    mid.appendChild(svgText(330, 64, '地面反力（按体重归一，示意）', 'demo-x-mut', 10.5));
    var grf = [['走：人', 'walk', false, C_MUTED, 80], ['走：G1', 'walk', true, C_ACCENT, 80], ['跑：人', 'run', false, C_MUTED, 186], ['跑：G1', 'run', true, C_ACCENT, 186]].map(function (c, k) {
      var pth = pathLine(mid, grfCurve(330, c[4], 190, 80, c[1], c[2]), c[3], 2, c[2] ? null : '5 3');
      return { p: pth, k: k };
    });
    mid.appendChild(svgText(520, 98, '走：双峰', 'demo-x-ink2', 10.5, 'end'));
    mid.appendChild(svgText(520, 204, '跑：单峰', 'demo-x-ink2', 10.5, 'end'));
    mid.appendChild(svgText(330, 284, 'G1 走路的峰更尖：没有脚趾关节', 'demo-x-warn', 10));
    mid.appendChild(svgText(330, 300, '虚线：人（跑台测力）；实线：G1', 'demo-x-mut', 10));

    var right = group(s);
    rectBox(right, 552, 44, 218, 262, C_BORDER, C_SURFACE2);
    right.appendChild(svgText(566, 64, '更像人吗？77 人、20 对 5 秒视频', 'demo-x-mut', 10.5));
    var studies = [['整体', STUDY.all, STUDY.h[0]], ['走路', STUDY.walk, STUDY.h[1]], ['跑步', STUDY.run, STUDY.h[2]]].map(function (st, k) {
      var g = group(right), y = 88 + k * 62;
      g.appendChild(svgText(566, y + 4, st[0] + '（h = ' + fmt(st[2], 2) + '）', 'demo-x-ink2', 11));
      rectBox(g, 566, y + 12, 190, 18, C_BORDER, 'none');
      var b = hbar(g, 566, y + 12, 18, C_GOOD);
      var v = svgText(752, y + 25, '', 'demo-x-mono', 10.5, 'end');
      g.appendChild(v);
      return { g: g, b: b, v: v, p: st[1], k: k };
    });
    right.appendChild(svgText(566, 284, '对照：Unitree 原厂控制器', 'demo-x-mut', 10));
    right.appendChild(svgText(566, 300, '三项都显著（p < .001）', 'demo-x-mut', 10));

    var foot = svgText(400, 336, '不少难段落在 3 分钟以上的长参考里，和别的技能一起训，同一套超参数', 'demo-x-ink2', 11.5, 'middle');
    s.appendChild(foot);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.8));
      /* 一个侧手翻 2.4 s：蹲 → 转一整圈 → 站 */
      var c = (now % 2.6) / 2.6, rot = 0, P = POSE_STAND, x = 90, w = 0;
      if (c < 0.15) P = lerpPose(POSE_STAND, POSE_STAR, c / 0.15);
      else if (c < 0.75) { var u = (c - 0.15) / 0.6; P = POSE_STAR; rot = 360 * ease(u); x = 90 + 150 * u; w = Math.sin(Math.PI * u); }
      else { P = lerpPose(POSE_STAR, POSE_STAND, (c - 0.75) / 0.25); x = 240; }
      flipper.put(x, 196, P, 6 * w, null, rot);
      var omega = CARTWHEEL.peak * w * (0.6 + 0.4 * Math.abs(Math.sin(now * 5)));
      setW(gFill, (242 * Math.min(omega, 22)) / 22);
      gTxt.textContent = '骨盆角速度 ' + fmt(omega, 1) + ' rad/s（平均 ' + fmt(CARTWHEEL.mean, 2) + '）';
      setOpacity(gauge, seg(t, 3.6, 4.2));
      setOpacity(accTxt, seg(t, 3.6, 4.2));
      var reps = Math.min(RONALDO_REPS, Math.max(0, Math.floor((now - 7) / 0.8) + 1));
      rona.textContent = 'C 罗庆祝转身跳：连做 ' + (t < 7 ? 0 : reps) + ' 次（ASAP 只报了 1 次）';
      setOpacity(rona, seg(t, 7.0, 7.6));
      setOpacity(mid, seg(t, 10.4, 11.0));
      grf.forEach(function (G) { drawOn(G.p, ease(seg(t, 10.6 + G.k * 0.5, 11.6 + G.k * 0.5))); });
      setOpacity(right, seg(t, 13.4, 14.0));
      studies.forEach(function (S2) {
        var u = ease(seg(t, 13.6 + S2.k * 0.5, 14.4 + S2.k * 0.5));
        setW(S2.b, (190 * S2.p * u) / 100);
        S2.v.textContent = u > 0.1 ? fmt(S2.p * u, 1) + '%' : '';
      });
      setOpacity(foot, seg(t, 0.6, 1.2));
    }
    return { el: s, draw: draw };
  }

  /* ── 第 9 幕：VAE 潜空间 ── */
  function buildSceneVae() {
    var s = sceneSvg('左边一排是各段动作训好的跟踪策略，当老师。学生是一个条件 VAE：编码器只看参考相位和锚点误差，压成 32 维的潜码 z；解码器拿 z 和本体感受还原动作。学生自己走，老师在学生到过的状态上给动作标签，这是 DAgger。右上：PD 设定点带尖峰，潜码平滑。右下：MuJoCo 里的侧手翻，不用潜空间成功率 5%，用了 95%');
    s.appendChild(svgText(30, 28, '老师：各段跟踪策略；学生：条件 VAE', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 470, 262, C_BORDER, C_SURFACE2);
    var teachers = [];
    for (var i = 0; i < 5; i++) {
      var g = chip(left, 44, 62 + i * 46, 74, '策略 ' + (i + 1), C_BORDER, { h: 34, size: 10.5 });
      teachers.push(g);
    }
    left.appendChild(svgText(81, 296, '老师', 'demo-x-mut', 10, 'middle'));
    var mk = K.arrowMarker(s, 'bm-x-arrow-vae', C_ACCENT);
    var enc = chip(left, 160, 96, 100, '编码器', C_ACCENT, { h: 46 });
    left.appendChild(svgRich(210, 160, '输入：$\\psi$、$e_{anchor}$', { size: 10.5, anchor: 'middle', w: 140, cls: 'demo-x-mut' }));
    arrowPath(left, [[262, 119], [292, 119]], C_ACCENT, mk);
    var zG = group(left);
    rectBox(zG, 294, 74, 64, 92, C_GOOD, C_SURFACE);
    var zBars = [];
    for (var k = 0; k < VAE.z; k++) zBars.push(paint(svgEl('rect', { x: 300, y: 78 + k * 2.6, width: 0, height: 2, rx: 1 }), C_GOOD));
    zBars.forEach(function (b) { zG.appendChild(b); });
    zG.appendChild(svgText(326, 182, 'z：32 维', 'demo-x-good', 11, 'middle'));
    arrowPath(left, [[360, 119], [390, 119]], C_ACCENT, mk);
    var dec = chip(left, 392, 96, 96, '解码器', C_ACCENT, { h: 46 });
    left.appendChild(svgText(440, 158, '+ 本体感受：重力方向、', 'demo-x-mut', 10, 'middle'));
    left.appendChild(svgText(440, 172, '机身速度、关节、上一步动作', 'demo-x-mut', 10, 'middle'));
    var actOut = svgRich(440, 198, '→ 动作 $\\hat a$', { size: 11.5, anchor: 'middle', w: 120, cls: 'demo-x-ink2' });
    left.appendChild(actOut);
    var dag = group(left);
    var labelArrow = arrowPath(dag, [[120, 220], [200, 220], [430, 220], [430, 206]], C_WARN, K.arrowMarker(s, 'bm-x-arrow-dag', C_WARN), '5 3', 1.6);
    dag.appendChild(svgText(260, 238, 'DAgger：学生自己走，老师在它到过的状态上给动作', 'demo-x-warn', 10.5, 'middle'));
    var token = dotAt(dag, 0, 220, 4.5, C_WARN);
    var extras = group(left);
    extras.appendChild(svgRich(160, 268, 'KL 系数 $\\beta$ = 0.01：潜空间压得平滑', { size: 10.5, w: 300, cls: 'demo-x-ink2' }));
    extras.appendChild(svgText(160, 288, '左右镜像的数据一起训：技能库翻倍', 'demo-x-ink2', 10.5));

    var why = group(s);
    rectBox(why, 516, 44, 254, 160, C_BORDER, C_SURFACE);
    why.appendChild(svgText(530, 64, '为什么不直接扩散动作？', 'demo-x-ink2', 11.5));
    why.appendChild(svgText(530, 84, 'PD 设定点：不规则、带力矩尖峰', 'demo-x-bad', 10));
    var spiky = pathLine(why, [[530, 110], [756, 110]], C_BAD, 1.6);
    why.appendChild(svgText(530, 138, '潜码：平滑', 'demo-x-good', 10));
    var smooth = pathLine(why, [[530, 160], [756, 160]], C_GOOD, 1.8);
    why.appendChild(svgText(530, 192, '大网络慢：解码器用最新观测补上', 'demo-x-mut', 10));

    var abl = group(s);
    rectBox(abl, 516, 216, 254, 192, C_BORDER, C_SURFACE2);
    abl.appendChild(svgText(530, 236, '侧手翻：MuJoCo 仿真到仿真成功率', 'demo-x-mut', 10.5));
    var bNo = vbar(abl, 560, 380, 60, C_BAD), bYes = vbar(abl, 670, 380, 60, C_GOOD);
    var tNo = svgText(590, 380, '', 'demo-x-mono', 11, 'middle'), tYes = svgText(700, 380, '', 'demo-x-mono', 11, 'middle');
    abl.appendChild(tNo);
    abl.appendChild(tYes);
    abl.appendChild(svgText(590, 398, '不用潜空间', 'demo-x-mut', 10, 'middle'));
    abl.appendChild(svgText(700, 398, '用潜空间', 'demo-x-mut', 10, 'middle'));

    var why2 = svgText(265, 336, '编码「想做什么动作」，而不是原始 PD 动作：运动状态更有结构、更好编码', 'demo-x-ink2', 11.5, 'middle');
    s.appendChild(why2);
    var foot = svgText(265, 360, '这一结果也搬上了真机（图 6）', 'demo-x-good', 11, 'middle');
    s.appendChild(foot);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.8));
      teachers.forEach(function (g, k) { setOpacity(g, seg(t, 0.3 + k * 0.25, 0.7 + k * 0.25)); });
      setOpacity(enc, seg(t, 3.6, 4.0));
      setOpacity(zG, seg(t, 4.0, 4.4));
      setOpacity(dec, seg(t, 4.4, 4.8));
      setOpacity(actOut, seg(t, 4.8, 5.2));
      zBars.forEach(function (b, k) {
        var v = Math.sin(now * 1.4 + k * 0.7) * Math.cos(now * 0.6 + k * 0.23);
        b.setAttribute('width', (26 + 24 * v).toFixed(1));
      });
      setOpacity(dag, seg(t, 7.0, 7.6));
      var u = (now % 2.2) / 2.2;
      moveDot(token, u < 0.3 ? [120 + (80 * u) / 0.3, 220] : u < 0.85 ? [200 + (230 * (u - 0.3)) / 0.55, 220] : [430, 220 - (14 * (u - 0.85)) / 0.15]);
      setOpacity(extras, seg(t, 8.6, 9.2));
      setOpacity(why, seg(t, 10.4, 11.0));
      var sp = [], sm = [];
      for (var i = 0; i <= 40; i++) {
        var x = 530 + i * 5.65, ph = now * 2 + i * 0.5;
        sp.push([x, 110 - 10 * Math.sin(ph) - (i % 7 === 3 ? 14 * Math.sign(Math.sin(now + i)) : 0)]);
        sm.push([x, 160 - 10 * Math.sin(now * 0.8 + i * 0.18)]);
      }
      setPath(spiky, sp);
      setPath(smooth, sm);
      setOpacity(why2, seg(t, 10.6, 11.2));
      setOpacity(abl, seg(t, 13.4, 14.0));
      var ub = ease(seg(t, 13.6, 14.6));
      setH(bNo, 1.3 * LATENT_ABL.without * ub);
      setH(bYes, 1.3 * LATENT_ABL.with * ub);
      tNo.setAttribute('y', (376 - 1.3 * LATENT_ABL.without * ub).toFixed(1));
      tYes.setAttribute('y', (376 - 1.3 * LATENT_ABL.with * ub).toFixed(1));
      tNo.textContent = ub > 0.1 ? fmt(LATENT_ABL.without * ub, 0) + '%' : '';
      tYes.textContent = ub > 0.1 ? fmt(LATENT_ABL.with * ub, 0) + '%' : '';
      setOpacity(foot, seg(t, 14.6, 15.2));
    }
    return { el: s, draw: draw };
  }

  /* ── 第 10 幕：状态—潜动作扩散 ── */
  function buildSceneDiffusion() {
    var s = sceneSvg('上方一条格子是一段轨迹：过去 4 步、当前、未来 16 步，每步一个状态格和一个潜码格。历史格是干净的，未来格从噪声开始一步步去噪；每格有自己的噪声级，所以也能把未来某一帧钉成关键帧。左下：采数据时给动作加 OU 噪声，轨迹周围形成一条误差带。右下：控制一步 40 毫秒，去噪 20 步约 20 毫秒，在独立线程里跑；16 步就是 0.64 秒');
    s.appendChild(svgText(30, 28, '过去 4 步 + 当前 + 未来 16 步，每格一个噪声级', 'demo-x-ink2', 13.5));
    var top = group(s);
    rectBox(top, 30, 44, 740, 168, C_BORDER, C_SURFACE2);
    top.appendChild(svgMath(400, 70, '\\tau = [\\,s_{t-N}, z_{t-N}, \\dots, s_t, z_t, \\dots, s_{t+H}, z_{t+H}\\,]', { size: 13.5, anchor: 'middle', w: 520 }));
    var NT = DIFF.N + 1 + DIFF.H, CW = 33, X0 = 52;
    var cells = [];
    for (var i = 0; i < NT; i++) {
      ['s', 'z'].forEach(function (kind, r) {
        var rr = paint(svgEl('rect', { x: X0 + i * CW, y: 92 + r * 34, width: CW - 4, height: 28, rx: 4, 'stroke-width': 1.2 }), C_SURFACE, C_BORDER);
        top.appendChild(rr);
        cells.push({ r: rr, i: i, kind: kind, seed: mulberry32(i * 13 + r * 7 + 3) });
      });
    }
    top.appendChild(svgText(X0 - 8, 111, 's', 'demo-x-mono', 11, 'end'));
    top.appendChild(svgText(X0 - 8, 145, 'z', 'demo-x-mono', 11, 'end'));
    top.appendChild(svgText(X0 + 2.5 * CW, 176, '历史 N = 4', 'demo-x-mut', 10.5, 'middle'));
    top.appendChild(svgText(X0 + 4.5 * CW, 190, '当前 t', 'demo-x-acc', 10.5, 'middle'));
    top.appendChild(svgText(X0 + 13 * CW, 176, '未来 H = 16（25 Hz：0.64 s）', 'demo-x-mut', 10.5, 'middle'));
    var kLbl = svgText(756, 190, '', 'demo-x-mono', 10.5, 'end');
    top.appendChild(kLbl);
    var keyMark = svgText(X0 + 15 * CW + CW / 2 - 2, 88, '关键帧', 'demo-x-warn', 10, 'middle');
    top.appendChild(keyMark);

    var ou = group(s);
    rectBox(ou, 30, 224, 360, 184, C_BORDER, C_SURFACE);
    ou.appendChild(svgText(44, 244, '采数据：动作加 OU 噪声，记原状态与潜码', 'demo-x-mut', 10.5));
    var band = paint(svgEl('path', { opacity: 0.22 }), C_WARN);
    ou.appendChild(band);
    var clean = pathLine(ou, [[50, 320], [370, 320]], C_MUTED, 1.6, '5 3');
    var noisy = [0, 1, 2].map(function () { return pathLine(ou, [[50, 320], [370, 320]], C_ACCENT, 1.4); });
    ou.appendChild(svgRich(44, 376, '$\\theta$ = 0.8、$\\sigma$ = 0.1 → 误差带；每段跑 2.5 s 再续 5 s，', { size: 10.5, w: 340, cls: 'demo-x-ink2' }));
    ou.appendChild(svgText(44, 394, '中途摔了整段丢掉；每个样本约出现 100 次', 'demo-x-ink2', 10.5));

    var rep = group(s);
    rectBox(rep, 406, 224, 364, 184, C_BORDER, C_SURFACE2);
    rep.appendChild(svgText(420, 244, '状态怎么写', 'demo-x-ink2', 11));
    rep.appendChild(svgText(420, 264, '根：位姿与速度相对「当前」的角色系', 'demo-x-mut', 10.5));
    rep.appendChild(svgText(420, 282, '部位：位置与速度相对「那一步」的根', 'demo-x-mut', 10.5));
    rep.appendChild(svgText(420, 300, '根特征乘 6 再过随机矩阵，拼在前面：强调时间', 'demo-x-mut', 10.5));
    var timing = group(rep);
    timing.appendChild(svgText(420, 326, '一个控制步 40 ms（跟踪策略降到 25 Hz 重训）', 'demo-x-ink2', 10.5));
    rectBox(timing, 420, 334, 336, 16, C_BORDER, 'none');
    var inf = hbar(timing, 420, 334, 16, C_ACCENT, 0.75);
    timing.appendChild(svgText(420, 368, '去噪 20 步 ≈ 20 ms：独立线程，RTX 4060 笔记本卡 + TensorRT', 'demo-x-acc', 10));
    timing.appendChild(svgText(420, 386, 'Transformer 编码器 6 层 × 8 头 × 512 维，约 19.8M 参数', 'demo-x-mut', 10));
    timing.appendChild(svgText(420, 402, '解码器轻：CPU 上同步跑，用最新观测出动作', 'demo-x-mut', 10));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(top, seg(t, 0.2, 0.8));
      /* 每 2.4 s 去噪一轮：k 从 20 数到 0 */
      var cyc = (now % 2.4) / 2.4, kNow = Math.round(DIFF.K * (1 - Math.min(cyc / 0.8, 1)));
      kLbl.textContent = '去噪：还剩 k = ' + kNow + ' 步';
      var pinKey = t >= 3.6;
      cells.forEach(function (C) {
        var hist = C.i <= DIFF.N, key = pinKey && C.i === 15 && C.kind === 's';
        var noise = hist || key ? 0 : kNow / DIFF.K;
        var col = hist ? C_GOOD : key ? C_WARN : C_ACCENT;
        C.r.style.fill = col;
        C.r.style.opacity = (hist || key ? 0.75 : 0.25 + 0.5 * (1 - noise)) * seg(t, 0.3 + C.i * 0.03, 0.8 + C.i * 0.03);
        var j = noise * 5 * (C.seed() - 0.5);
        C.r.setAttribute('transform', 'translate(0 ' + j.toFixed(1) + ')');
      });
      setOpacity(keyMark, pinKey ? 0.5 + 0.5 * Math.abs(Math.sin(now * 2)) : 0);
      setOpacity(rep, seg(t, 7.0, 7.6));
      setOpacity(ou, seg(t, 10.4, 11.0));
      var bp = [], bm = [], cl = [];
      for (var i2 = 0; i2 <= 40; i2++) {
        var x = 50 + i2 * 8, y = 320 - 26 * Math.sin(i2 * 0.16 + now * 0.4);
        cl.push([x, y]);
        bp.push([x, y - 22]);
        bm.push([x, y + 22]);
      }
      band.setAttribute('d', polyPath(bp.concat(bm.reverse()).map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })) + ' Z');
      setPath(clean, cl);
      noisy.forEach(function (n, k) {
        var pts = [], eta = 0, r = mulberry32(Math.floor(now / 2) * 17 + k * 101 + 1);
        for (var i3 = 0; i3 <= 40; i3++) {
          eta = OU_AR * eta + 0.9 * (r() - 0.5) * 2; // 示意：相邻步只带 0.2 的相关
          var x3 = 50 + i3 * 8, y3 = cl[i3][1] + 9 * eta + 6 * Math.sin(i3 * 0.3 + k * 2);
          pts.push([x3, y3]);
        }
        setPath(n, pts);
      });
      setOpacity(timing, seg(t, 13.4, 14.0));
      setW(inf, 336 * (DIFF.inferMs / CTRL_MS_25) * (0.85 + 0.15 * Math.sin(now * 3)));
    }
    return { el: s, draw: draw };
  }

  /* ── 第 11 幕：代价引导 ── */
  var S11_PATH = (function () {
    /* 用 bm-guidance 的玩具算一条「路点 + 避障」的轨迹，第 11 幕拿它当去噪的终点 */
    var o = { task: 'wp', sdf: true, scale: 0.1, obs: [2.2, 0.05], gp: [4.5, 0], gv: [1, 0] };
    var path = gdSim(o, 7).path, cum = [0], i;
    for (i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    /* 按弧长重采样成 40 个点：机器人在路点附近停下来，原始点会挤成一团 */
    var out = [], j = 0, L = cum[cum.length - 1];
    for (var k = 0; k < 40; k++) {
      var want = (L * k) / 39;
      while (j < cum.length - 2 && cum[j + 1] < want) j++;
      var f = cum[j + 1] > cum[j] ? (want - cum[j]) / (cum[j + 1] - cum[j]) : 0;
      out.push([path[j][0] + f * (path[j + 1][0] - path[j][0]), path[j][1] + f * (path[j + 1][1] - path[j][1])]);
    }
    return out;
  })();
  function buildSceneGuidance() {
    var s = sceneSvg('左侧俯视：起点、障碍、路点。一条预测轨迹从噪声开始，每个去噪步被代价的梯度推一下，最后绕开障碍到达路点。右侧三张卡是三种代价：摇杆罚速度偏差；路点离得远罚位置、近了按 e 的负 2d 次方换成罚速度；避障是松弛对数障碍。下方：代价直接相加');
    s.appendChild(svgText(30, 28, '先验 + 任务：代价的负梯度加进每一步去噪', 'demo-x-ink2', 13.5));
    s.appendChild(svgMath(400, 58, '\\nabla_\\tau \\log p(\\tau \\mid \\tau^\\ast) = \\nabla_\\tau \\log p(\\tau) - \\nabla_\\tau G(\\tau)', { size: 14, anchor: 'middle', w: 560 }));
    var field = group(s);
    rectBox(field, 30, 78, 430, 248, C_BORDER, C_SURFACE2);
    var FX = function (x) { return 54 + x * 82; }, FY = function (y) { return 202 - y * 82; };
    var obs = group(field);
    obs.appendChild(paint(svgEl('circle', { cx: FX(2.2), cy: FY(0.05), r: (GD.obsR + GD.r) * 82, opacity: 0.16 }), C_MUTED));
    obs.appendChild(paint(svgEl('circle', { cx: FX(2.2), cy: FY(0.05), r: GD.obsR * 82, opacity: 0.55 }), C_WARN));
    obs.appendChild(svgText(FX(2.2), FY(0.05) + 4, '障碍', 'demo-x-ink2', 10.5, 'middle'));
    var goal = dotAt(field, FX(4.5), FY(0), 7, C_GOOD);
    field.appendChild(svgText(FX(4.5), FY(0) - 14, '路点', 'demo-x-good', 10.5, 'middle'));
    dotAt(field, FX(0), FY(0), 5, C_ACCENT);
    var traj = pathLine(field, [[0, 0], [1, 1]], C_ACCENT, 2.4);
    var ghost = pathLine(field, [[0, 0], [1, 1]], C_MUTED, 1.4, '4 3');
    var arrows = group(field);
    var kTxt = svgText(44, 316, '', 'demo-x-mono', 10.5);
    field.appendChild(kTxt);
    var sumG = group(field);
    chip(sumG, 254, 88, 196, '$G = G_{wp} + G_{sdf}$', C_ACCENT, { h: 28 });

    var cards = group(s);
    var cA = group(cards);
    rectBox(cA, 476, 78, 294, 76, C_BORDER, C_SURFACE);
    cA.appendChild(svgText(488, 98, '摇杆：罚预测的平面速度偏离摇杆', 'demo-x-ink2', 10.5));
    var vCmd = paint(svgEl('line', { x1: 500, y1: 136, x2: 560, y2: 136, 'stroke-width': 3 }), null, C_GOOD);
    var vPred = paint(svgEl('line', { x1: 500, y1: 136, 'stroke-width': 3 }), null, C_ACCENT);
    cA.appendChild(vCmd);
    cA.appendChild(vPred);
    cA.appendChild(svgText(600, 140, '绿：摇杆；蓝：预测 → 被拉齐', 'demo-x-mut', 10));
    var cB = group(cards);
    rectBox(cB, 476, 162, 294, 84, C_BORDER, C_SURFACE);
    cB.appendChild(svgText(488, 182, '路点：远处罚位置，近处换成罚速度', 'demo-x-ink2', 10.5));
    var wPos = [], wVel = [];
    for (var i = 0; i <= 30; i++) {
      var dd = (2 * i) / 30;
      wPos.push([500 + i * 7.5, 228 - 36 * (1 - Math.exp(-2 * dd))]);
      wVel.push([500 + i * 7.5, 228 - 36 * Math.exp(-2 * dd)]);
    }
    pathLine(cB, wPos, C_ACCENT, 1.8);
    pathLine(cB, wVel, C_WARN, 1.8, '4 3');
    cB.appendChild(svgText(756, 200, '位置', 'demo-x-acc', 10, 'end'));
    cB.appendChild(svgText(540, 206, '速度', 'demo-x-warn', 10));
    cB.appendChild(svgText(500, 241, '离目标 0', 'demo-x-mut', 9.5));
    cB.appendChild(svgText(756, 241, '2 m', 'demo-x-mut', 9.5, 'end'));
    var cC = group(cards);
    rectBox(cC, 476, 254, 294, 72, C_BORDER, C_SURFACE);
    cC.appendChild(svgText(488, 274, '避障：SDF 套松弛对数障碍', 'demo-x-ink2', 10.5));
    var bPts = [];
    for (var j = 0; j <= 40; j++) {
      var xx = -0.1 + (0.9 * j) / 40;
      bPts.push([500 + j * 6, 318 - 5 * clamp(barrier(xx, GD.delta) + 1, 0, 6.5)]);
    }
    pathLine(cC, bPts, C_BAD, 1.8);
    cC.appendChild(paint(svgEl('line', { x1: 500 + (0.2 / 0.9) * 240, y1: 280, x2: 500 + (0.2 / 0.9) * 240, y2: 320, 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_MUTED));
    cC.appendChild(svgText(752, 306, '钻进去也有限值', 'demo-x-mut', 9.5, 'end'));

    var foot = svgText(400, 352, '路点 + 避障 = 绕开到点（图 6B）；摇杆 + 避障，用户推歪了也能躲开 —— 训练时一个都没见过', 'demo-x-ink2', 11.5, 'middle');
    s.appendChild(foot);
    var foot2 = svgText(400, 378, '梯度用 CppAD 在每个去噪步里自动求；引导权重仍要轻调，细粒度目标效果差', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(foot2);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(field, seg(t, 0.2, 0.8));
      var cyc = (now % 3.2) / 3.2, prog = Math.min(cyc / 0.75, 1), kNow = Math.round(DIFF.K * (1 - prog));
      var r = mulberry32(Math.floor(now / 3.2) * 31 + 5), ph = [r() * 6.28, r() * 6.28, r() * 6.28], amp = [r() - 0.5, r() - 0.5, r() - 0.5];
      var guided = t >= 3.6, withSdf = t >= 7.0;
      /* 没有引导：先验只会往前走；只有路点：直线穿过障碍；加上避障：bm-guidance 玩具算出的那条绕行路线 */
      function target(k) {
        var u = k / 39;
        if (withSdf) return S11_PATH[k];
        if (guided) return [4.5 * u, 0];
        return [4.0 * u, 0.5 * Math.sin(2.5 * u)];
      }
      var pts = [];
      for (var k = 0; k < 40; k++) {
        var u = k / 39, A = 1.6 * (1 - prog) * Math.min(1, u * 3), q = target(k);
        var nx = 0.25 * A * Math.sin(2 * Math.PI * u * 1.3 + ph[0]);
        var ny = A * (amp[1] * Math.sin(2 * Math.PI * u * 1.7 + ph[1]) + 0.5 * amp[2] * Math.sin(2 * Math.PI * u * 3.1 + ph[2]));
        pts.push([FX(q[0] + nx), FY(q[1] + ny)]);
      }
      setPath(traj, pts);
      var gp = [];
      for (var k2 = 0; k2 < 40; k2++) gp.push([FX(target(k2)[0]), FY(target(k2)[1])]);
      setPath(ghost, gp);
      setOpacity(ghost, guided ? 0.6 : 0);
      kTxt.textContent = '去噪还剩 k = ' + kNow + ' 步';
      /* 梯度箭头：障碍附近往外推，终点附近往路点拉 */
      while (arrows.firstChild) arrows.removeChild(arrows.firstChild);
      if (guided && prog < 1) {
        /* 红：障碍附近的点被推离障碍中心；绿：快到终点的点被拉向路点 */
        [1.7, 2.7, 3.8].forEach(function (xs, k) {
          if (!withSdf && k < 2) return;
          var best = 0;
          for (var b = 1; b < 40; b++) if (Math.abs(target(b)[0] - xs) < Math.abs(target(best)[0] - xs)) best = b;
          var q = target(best), d = k < 2 ? [q[0] - 2.2, q[1] - 0.05] : [4.5 - q[0], -q[1]], n = Math.hypot(d[0], d[1]) || 1;
          var len = 30 * (0.6 + 0.4 * Math.sin(now * 4)), x1 = FX(q[0]), y1 = FY(q[1]);
          arrows.appendChild(paint(svgEl('line', { x1: x1, y1: y1, x2: x1 + (len * d[0]) / n, y2: y1 - (len * d[1]) / n, 'stroke-width': 2.4, 'stroke-linecap': 'round' }), null, k < 2 ? C_BAD : C_GOOD));
        });
      }
      setOpacity(goal, 0.6 + 0.4 * Math.abs(Math.sin(now * 2)));
      setOpacity(cards, seg(t, 3.6, 4.2));
      setOpacity(cA, seg(t, 3.6, 4.2));
      setOpacity(cB, seg(t, 4.6, 5.2));
      setOpacity(cC, seg(t, 7.0, 7.6));
      var ang = 0.45 * (1 - prog) * Math.sin(now * 2);
      vPred.setAttribute('x2', (500 + 60 * Math.cos(ang) * (0.7 + 0.3 * prog)).toFixed(1));
      vPred.setAttribute('y2', (136 - 60 * Math.sin(ang)).toFixed(1));
      setOpacity(sumG, seg(t, 10.4, 11.0));
      setOpacity(foot, seg(t, 10.4, 11.0));
      setOpacity(foot2, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── 第 12 幕：测试时的任务与边界 ── */
  function buildSceneTasks() {
    var s = sceneSvg('左上：摇杆推着机器人全向走，被踢一脚接着走；仿真里速度跟踪误差走 12.14%、跑 13.65%，跑道上连跑 50 米以上。左下：只给速度命令，从走自然过渡到跑。右上：每隔 0.2 秒给一帧侧手翻关键姿态，扩散把中间补齐；走、侧手翻、跑交替。右下：局限 —— 视野 0.64 秒、历史让步态卡住、起止容易绊、依赖状态估计、路点和避障用了动作捕捉、扩散代码没开源');
    s.appendChild(svgText(30, 28, '摇杆、关键帧、局限与开源范围', 'demo-x-ink2', 13.5));
    var js = group(s);
    rectBox(js, 30, 44, 370, 160, C_BORDER, C_SURFACE2);
    js.appendChild(svgText(44, 64, '摇杆遥控（速度代价）', 'demo-x-mut', 10.5));
    var stickBase = paint(svgEl('circle', { cx: 86, cy: 130, r: 30, 'stroke-width': 1.6, fill: 'none' }), null, C_BORDER);
    js.appendChild(stickBase);
    var stick = dotAt(js, 86, 130, 10, C_GOOD);
    var walker = robot(js, C_ACCENT, 0.75);
    js.appendChild(paint(svgEl('line', { x1: 150, y1: 168, x2: 386, y2: 168, 'stroke-width': 1.2 }), null, C_BORDER));
    var kick = svgText(300, 92, '踢一脚！', 'demo-x-bad', 11, 'middle');
    js.appendChild(kick);
    js.appendChild(svgText(44, 190, '速度误差（仿真）：走 12.14%、跑 13.65%；跑道连跑 50 m+', 'demo-x-ink2', 10.5));

    var run = group(s);
    rectBox(run, 30, 216, 370, 110, C_BORDER, C_SURFACE);
    run.appendChild(svgText(44, 236, '只给速度命令：走 → 跑（图 5，示意）', 'demo-x-mut', 10.5));
    var cmdLine = pathLine(run, [[50, 306], [120, 306], [120, 266], [380, 266]], C_GOOD, 1.6, '5 3');
    var velLine = pathLine(run, [[50, 306], [380, 266]], C_ACCENT, 2);
    run.appendChild(svgText(386, 262, '命令', 'demo-x-good', 10, 'end'));
    run.appendChild(svgText(250, 318, '数据里很少有走到跑的过渡，也没标', 'demo-x-warn', 10, 'middle'));

    var inp = group(s);
    rectBox(inp, 416, 44, 354, 160, C_BORDER, C_SURFACE2);
    inp.appendChild(svgText(430, 64, '关键帧补全：每 0.2 s 一帧侧手翻关键姿态', 'demo-x-mut', 10.5));
    var keyFigs = [0, 1, 2, 3, 4].map(function (k) { return { f: robot(inp, C_WARN, 0.45, true), k: k }; });
    var fillFig = robot(inp, C_ACCENT, 0.45);
    inp.appendChild(paint(svgEl('line', { x1: 436, y1: 140, x2: 756, y2: 140, 'stroke-width': 1.2 }), null, C_BORDER));
    [0, 1, 2, 3, 4].forEach(function (k) { inp.appendChild(svgText(470 + k * 64, 156, '+' + fmt(KEYFRAME_S * k, 1) + ' s', 'demo-x-mono', 9.5, 'middle')); });
    var strip = group(inp);
    var segs = ['走', '侧手翻', '走', '侧手翻', '走', '双侧手翻', '跑'];
    segs.forEach(function (w, k) {
      var hard = w.indexOf('侧手翻') >= 0;
      chip(strip, 430 + k * 48, 168, 46, w, hard ? C_WARN : C_BORDER, { h: 26, size: 9.5 });
    });

    var lim = group(s);
    rectBox(lim, 416, 216, 354, 110, C_BAD, C_SURFACE, '4 3');
    lim.appendChild(svgText(430, 236, '局限（论文 Limitations）', 'demo-x-bad', 11));
    var limits = ['视野只有 0.64 s', '历史让步态卡住', '起止容易绊', '依赖状态估计', '路点 / 避障用了动捕', '细粒度目标效果差'];
    var limNodes = limits.map(function (w, k) {
      return chip(lim, 430 + (k % 2) * 170, 246 + Math.floor(k / 2) * 26, 164, w, C_BORDER, { h: 22, size: 10 });
    });

    var oss = group(s);
    chip(oss, 30, 340, 370, '开源：跟踪训练 + 部署（已被 MJLab、Unitree RL Lab 用作默认）', C_GOOD, { h: 34, size: 10.5 });
    chip(oss, 416, 340, 354, '扩散与引导的代码：截至 2026-10 还没公开', C_BAD, { h: 34, size: 10.5 });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(js, seg(t, 0.2, 0.8));
      var dir = Math.sin(now * 0.7);
      moveDot(stick, [86 + 18 * Math.cos(now * 0.7), 130 - 18 * Math.sin(now * 0.7) * 0.5]);
      var kc = (now % 6) / 6, kicked = kc > 0.55 && kc < 0.68;
      var P = poseWalk((now * 1.1) % 1);
      if (kicked) P = lerpPose(P, POSE_LEAN, Math.sin(((kc - 0.55) / 0.13) * Math.PI));
      walker.put(270 + 70 * dir, 168, P, 0);
      setOpacity(kick, kicked ? 1 : 0);
      setOpacity(run, seg(t, 0.8, 1.4));
      var vp = [];
      for (var i = 0; i <= 40; i++) {
        var x = 50 + i * 8.25, cmdV = x < 120 ? 0 : 1, lagU = clamp((x - 120) / 120, 0, 1);
        vp.push([x, 306 - 40 * (cmdV ? ease(lagU) : 0) - 3 * Math.sin(i * 1.3 + now * 5) * (x > 200 ? 1.4 : 0.8)]);
      }
      setPath(velLine, vp);
      setOpacity(inp, seg(t, 3.6, 4.2));
      var cyc = (now % 2.5) / 2.5;
      keyFigs.forEach(function (KF) {
        var u = KF.k / 4;
        KF.f.put(470 + KF.k * 64, 140, POSE_STAR, 6, null, 360 * u);
      });
      var uu = Math.min(cyc / 0.85, 1);
      fillFig.put(470 + 256 * uu, 140, POSE_STAR, 6, null, 360 * uu);
      setOpacity(strip, seg(t, 5.0, 5.6));
      setOpacity(lim, seg(t, 7.0, 7.6));
      limNodes.forEach(function (g, k) { setOpacity(g, seg(t, k < 3 ? 7.2 + k * 0.6 : 10.4 + (k - 3) * 0.6, k < 3 ? 7.7 + k * 0.6 : 10.9 + (k - 3) * 0.6)); });
      setOpacity(oss, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  var BM_SCENES = [
    {
      title: '两个缺口：一份配方，测试时组合',
      dur: 17,
      build: buildSceneGaps,
      cues: [
        { at: 0.3, s: '从人类动作学，是人形获得敏捷和自然最可扩展的路。可此前的跟踪要么动作不自然，要么**一段动作一套调参**（ASAP、KungfuBot、HuB 各自单独调随机化或奖励）。' },
        { at: 3.6, s: '多动作统一的跟踪器（OmniH2O、GMT、TWIST）能扩展，但高动态动作的质量掉下来，或者干脆放弃全局轨迹。' },
        { at: 7.0, s: '学会之后还得「会用」：分层（规划器 + 跟踪器）分开训，有规划—控制的错配；VAE 一类生成模型训练时就要给显式目标，避障、长程导航这类说不清的目标泛化差。' },
        { at: 10.4, s: '两个判断：① **紧凑、有原则的跟踪配方**，同一套 MDP 与超参数训所有动作；② 扩散模型学的是数据分布的梯度场 $\\nabla \\log p$，测试时能朝任意可微目标优化。' },
        { at: 13.4, s: '于是两个阶段：每段动作一个跟踪策略（一份配方）→ 蒸馏成一个潜空间扩散模型 → 部署时用代价函数引导，**新任务不重训**。' }
      ]
    },
    {
      title: '锚定跟踪：允许漂，不许走样',
      dur: 17,
      build: buildSceneAnchor,
      cues: [
        { at: 0.3, s: '训练时有扰动、上真机有差距，全局位置一定会漂。跟世界系的绝对位姿，漂了半米，**每个部位**都会被算成错了半米。' },
        { at: 3.6, s: '锚点（躯干）自己照参考跟；其他部位的目标先整体挪到机器人身上：**水平位置取机器人的、高度取参考的、偏航转到机器人的朝向**。' },
        { at: 7.0, s: '补充材料 S1：$p^{des}_b = p_\\Delta + R_\\Delta (p^{ref}_b - p^{ref}_{anchor})$。只平移水平面、只转偏航 —— 高度、俯仰、横滚不放，蹲、跳、倒地照样要跟。速度目标不变。' },
        { at: 10.4, s: '算一下：水平漂 0.5 m，跟世界系时位置这一项奖励从 1 掉到 **0.062**；锚定后还是 **1**。' },
        { at: 13.4, s: '漂移也不是完全不管：锚点误差 $e_{anchor}$（位置 3 + Rot6D 6 维）进观测，可选的全局奖励权重 0.5；终止只看高度（0.25 m）和倾斜，水平漂多远都不终止。' }
      ]
    },
    {
      title: '奖励：一项任务加三项正则',
      dur: 17,
      build: buildSceneReward,
      cues: [
        { at: 0.3, s: '14 个目标部位，各算位置、朝向、线速度、角速度四种误差，取均方，再过高斯：$r_s = \\exp(-\\bar e_s / \\sigma_s^2)$。' },
        { at: 3.6, s: '四把尺子：$\\sigma$ = 0.3 m、0.4 rad、1.0 m/s、3.14 rad/s。均方根误差到 0.25 m、19°、0.83 m/s、2.6 rad/s，这一项只剩一半。权重全是 1，不按动作调。' },
        { at: 7.0, s: '正则只留三项（表 S1）：关节软限位（0.9 倍机械限位）−10、动作变化率 −0.1、自碰撞（手脚以外、接触力超 1 N 的部位数）−0.1。' },
        { at: 10.4, s: '前人常加的力矩扰动、接触力罚、打滑罚这里都没有。论文的看法：堆启发式会稀释目标，换个动作就得重调。' },
        { at: 13.4, s: '官方代码默认还开着锚点的两项全局奖励（位置 $\\sigma$ = 0.3、朝向 0.4，权重 0.5）。' }
      ]
    },
    {
      title: '观测：只看当前一步，朝向用 Rot6D',
      dur: 17,
      build: buildSceneObs,
      cues: [
        { at: 0.3, s: '策略只看当前一步：参考的关节角与速度（只当进度提示）、锚点误差 9 维、机身速度 6 维、关节角与速度、上一步动作 —— 官方代码里一共 **160** 维。' },
        { at: 3.6, s: '评论家多看 14 个部位相对锚点的位姿，共 286 维：在笛卡尔空间里直接估跟踪误差，训练更快；上真机只用演员。' },
        { at: 7.0, s: '朝向误差用旋转矩阵的前两列（Rot6D）。换成四元数或轴角，真机上局部误差高 7%–22%，轴角那组还摔了一次（图 8A，读图）。' },
        { at: 10.4, s: '加历史反而更差：4 步历史局部误差高约 17%，25 步是原来的 2.3 倍。作者的猜测：随机化很少时，历史让策略记住仿真特有的状态—动作规律。' },
        { at: 13.4, s: '状态估计靠不住时，去掉锚点位置误差和机身线速度（**154** 维），起身这类动作就这么部署。' }
      ]
    },
    {
      title: '动作与关节阻抗：增益从电机惯量算',
      dur: 17,
      build: buildSceneImpedance,
      cues: [
        { at: 0.3, s: '动作是归一化的关节设定点 $\\theta^{sp} = \\theta_0 + \\alpha \\odot a$，交给电机的 PD。它不是要精确跟踪的位置，只是生成力矩的中间量，所以**故意不按关节限位裁剪**。' },
        { at: 3.6, s: '增益按电机算：反射惯量 = 转子惯量 × 齿比²，$k_p = I\\omega^2$、$k_d = 2I\\zeta\\omega$，$\\omega$ = 10 Hz、$\\zeta$ = 2。膝：$I$ = 0.0251，$k_p$ = 99.1、$k_d$ = 6.31。' },
        { at: 7.0, s: '动作缩放 $\\alpha = 0.25\\,\\tau_{max} / k_p$：动作取 1、关节在默认角时，刚好出 25% 的最大力矩。膝 0.351 rad，手腕俯仰只有 0.075。' },
        { at: 10.4, s: '为什么 $\\zeta$ 取 2？只算了电机惯量。膝的真实轴惯量是 0.137，代进去只有 4.3 Hz、阻尼比 0.86；越靠末端电机惯量占比越大（踝横滚 95%）。' },
        { at: 13.4, s: '消融（图 8A、图 S2，读图）：armature 设成 0 会过冲、自碰；5 Hz 全局位置误差约 2.7 倍；25 Hz 局部略好，但齿轮箱高频振荡、响声大；ASAP 的手调增益全局偏航约 2.2 倍。' }
      ]
    },
    {
      title: '随机化只给不确定的量，延迟压到最小',
      dur: 17,
      build: buildSceneDR,
      cues: [
        { at: 0.3, s: '仿真参数用厂家给的最准的值，不做系统辨识；随机化只给三类真正不确定的量。' },
        { at: 3.6, s: '接触：静摩擦 0.3–1.6、动摩擦 0.3–1.2、恢复系数 0–0.5；关节零位 ±0.01 rad（动作和观测一起偏，模拟标定误差）；躯干质心 x ±2.5 cm、y / z ±5 cm。' },
        { at: 7.0, s: '另外每隔 1–3 s 推一下：线速度 ±0.5 m/s（竖直 ±0.2）、角速度 ±0.52 / ±0.78 rad/s；回合开头的位姿和关节角也加小扰动。' },
        { at: 10.4, s: '另一半功夫在部署：C++ 实时框架，状态估计 500 Hz、策略推理 1 ms 以内。故意加延迟：2 ms 速度误差就上去，5 ms 三次里摔一次，10 ms 摔两次（图 8A）。' },
        { at: 13.4, s: '延迟也能随机化进训练，但会更难学；他们选择把部署延迟压到最小，而不是让策略去扛。' }
      ]
    },
    {
      title: '自适应采样：难的地方多练',
      dur: 17,
      build: buildSceneSampling,
      cues: [
        { at: 0.3, s: '一条参考几分钟长，按 1 秒分箱。均匀抽起点，大部分预算花在已经会的走路上，中间两段侧手翻一直练不到。' },
        { at: 3.6, s: '按失败统计抽：每箱的失败数做指数滑动平均（$0.999 / 0.001$），再加一层 $0.1/S$ 的底 —— 都不失败时自动回到均匀。' },
        { at: 7.0, s: '失败多半是之前几步没做好：用非因果核 $\\rho^u$（$\\rho = 0.8$，$u = 0, 1, 2$）把概率往失败前两秒摊。' },
        { at: 10.4, s: '图 8B：不用它，4 段长动作里 3 段在 3 万次迭代后仍有过不去的片段（Motion 1 卡在两段侧手翻）；简单的 Motion 4 迭代数也减半（2k 对 4k）。' },
        { at: 13.4, s: '分布先集中到难段，难段学会后又摊平。官方代码 2025-10-03 起默认核长是 1（之前是 3），和论文写的不一样。' }
      ]
    },
    {
      title: '跟踪上真机：敏捷与自然',
      dur: 17,
      build: buildSceneReal,
      cues: [
        { at: 0.3, s: '一共约 2.5 小时人类动作，仿真里全部验证；挑 30 段、共 15 分钟上 Unitree G1（表 S8）。不少难段落在 3 分钟以上的长参考里，和别的技能一起训。' },
        { at: 3.6, s: '空中侧手翻：腾空时加速度峰值 31 m/s²，骨盆角速度最高 20 rad/s、平均 7.01 —— 熟练的人做空翻平均约 7.75。户外软土、落叶、不平地面上完成。' },
        { at: 7.0, s: 'C 罗庆祝转身跳连做 5 次（ASAP 只报了一次）；连续两个侧手翻、在地上爬、从地上跳起来。' },
        { at: 10.4, s: '和人的跑台测力数据比地面反力：走路双峰、跑步单峰，时机对得上；走路的峰更尖 —— G1 没有脚趾关节。' },
        { at: 13.4, s: '用户研究 77 人、20 对 5 秒视频：整体 **70.8%** 选它（对照 Unitree 原厂控制器），走路 57.0%，跑步 84.7%；效应量 $h$ = 0.86 / 0.28 / 1.53。' }
      ]
    },
    {
      title: 'VAE：把很多跟踪策略压进 32 维',
      dur: 17,
      build: buildSceneVae,
      cues: [
        { at: 0.3, s: '跟踪策略只会复现训练过的参考。要组合、要做新任务，先把很多跟踪策略**蒸馏**进一个模型。' },
        { at: 3.6, s: '条件 VAE：编码器只看参考相关的输入（相位 $\\psi$、锚点误差），输出 32 维潜码 $z$ —— 「想做什么动作」；解码器拿 $z$ 加本体感受还原动作。' },
        { at: 7.0, s: '用 DAgger 训：学生自己走，老师（跟踪策略）在学生到过的状态上给动作标签；KL 系数 $\\beta$ = 0.01 把潜空间压平滑；左右镜像一起训，技能库翻倍。' },
        { at: 10.4, s: '为什么不直接扩散动作？PD 设定点不规则、带力矩尖峰，扩散学不稳；大网络推理慢，动作会落后于最新状态 —— 轻的解码器能用最新观测把 $z$ 变成动作。' },
        { at: 13.4, s: '消融（MuJoCo 仿真到仿真的侧手翻）：不用潜空间成功率 **5%**，用了 **95%**，这个结果也搬上了真机。' }
      ]
    },
    {
      title: '状态—潜动作扩散：预测一段未来',
      dur: 17,
      build: buildSceneDiffusion,
      cues: [
        { at: 0.3, s: '用 VAE 在动作库上跑出轨迹、记下状态和潜码：$\\tau = [s_{t-N}, z_{t-N}, \\dots, s_{t+H}, z_{t+H}]$，历史 $N$ = 4、未来 $H$ = 16。' },
        { at: 3.6, s: '每个状态、每个潜码有**各自的噪声级**：历史设成干净，其余去噪 —— 同一个接口也能把未来某一帧钉成关键帧。' },
        { at: 7.0, s: '状态用角色系：根的位姿与速度相对**当前**一步的角色系，各部位相对**那一步**的根；根的特征乘 6、再过一个随机高斯矩阵，拼在原状态前面，强调时间信息。' },
        { at: 10.4, s: '只用干净轨迹会一偏就出分布：采数据时给动作加 OU 噪声（$\\theta$ = 0.8、$\\sigma$ = 0.1），记原状态与潜码，形成误差带；每段跑 2.5 s 再续 5 s，摔了就整段丢掉。' },
        { at: 13.4, s: '时间账：跟踪策略降到 25 Hz 重训，一步 40 ms，16 步就是 0.64 s。Transformer 编码器 6 层、8 头、512 维，约 19.8M 参数；20 步去噪约 20 ms，放在独立线程里。' }
      ]
    },
    {
      title: '代价引导：梯度推着去噪走',
      dur: 17,
      build: buildSceneGuidance,
      cues: [
        { at: 0.3, s: '扩散模型学的是得分。贝叶斯拆开：$\\nabla \\log p(\\tau \\mid \\tau^\\ast) = \\nabla \\log p(\\tau) + \\nabla \\log p(\\tau^\\ast \\mid \\tau)$；令 $p(\\tau^\\ast \\mid \\tau) \\propto e^{-G(\\tau)}$，第二项就是 $-\\nabla G$。' },
        { at: 3.6, s: '摇杆：罚预测的平面速度偏离摇杆。路点：离得远罚位置，近了按 $e^{-2d}$ 换成罚速度，好停下。' },
        { at: 7.0, s: '避障：SDF 给每个部位到障碍的距离，套松弛对数障碍 $B(x, \\delta)$，钻进去也有有限的值和梯度。梯度用 CppAD 在每个去噪步里自动求。' },
        { at: 10.4, s: '代价直接相加：路点 + 避障 = 绕开障碍走到目标（图 6B）；摇杆 + 避障，用户稍微推歪也能躲开。训练时一个都没见过。' },
        { at: 13.4, s: '和在线轨迹优化不同：先验里已经有一整套可行的人类动作，简单的代价就够了。不过引导权重仍要轻调，细粒度目标效果差。' }
      ]
    },
    {
      title: '测试时的任务，和它的边界',
      dur: 17,
      build: buildSceneTasks,
      cues: [
        { at: 0.3, s: '摇杆遥控：全向走，被踢一脚接着走；仿真里速度跟踪误差走 12.14%、跑 13.65%，跑道上连跑 50 m 以上。只给速度命令，就能从走过渡到跑 —— 数据里很少、也没标。' },
        { at: 3.6, s: '关键帧补全：走着走着，每隔 0.2 s 给一帧侧手翻关键姿态，扩散把过渡和中间补齐，做完回到摇杆行走；图 6A 里四个侧手翻和走、跑交替。' },
        { at: 7.0, s: '局限一：视野只有 0.64 s，够局部避障，不够提前规划；历史让预测稳，也会让它卡在重复步态里，加大引导又会在切换时不稳 —— 步态起止容易绊。' },
        { at: 10.4, s: '局限二：生成质量取决于状态估计；路点和避障任务用了动作捕捉提供定位和环境；细粒度目标还得靠微调或适配层。' },
        { at: 13.4, s: '开源的是跟踪训练与部署（已被 MJLab、Unitree RL Lab 当默认做法）；扩散与引导的代码，截至 2026-10 项目主页还没给。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十二幕动画：BeyondMimic 全流程速览',
      sub: '约 204 秒自动播放。空格播放/暂停，← → 换幕；数字照抄论文 v4 与官方代码，读图的值标了「读图」，下面四个演示与笔记「具体实例」用的是同一份数。',
      ariaLabel: 'BeyondMimic 十二幕讲解动画',
      notes: [
        '取数依据：arXiv 2508.08241 **v4**（2025-11-13）正文与补充材料 S1–S4、表 S1–S8；第 2 幕的锚定公式照抄 S1，第 3 幕的 $\\sigma$ 与权重照抄表 S1，第 5 幕的电机惯量照抄表 S3 / S4，第 6 幕的随机化照抄表 S2，第 7 幕的采样器照抄 S1，第 9、10 幕的超参数照抄表 S6、S7 与 S3–S4 节。' +
          '160 / 286 / 154 维、14 个目标部位、力矩上限、自适应采样的核长变化取自官方代码（HybridRobotics/whole_body_tracking，2025-10-05 的 main）；$k_p$、$k_d$、$\\alpha$、真实频率与阻尼比、0.062、半衰点、效应量是在这些数上现算的。',
        '**读图与示意**：图 8A、图 S2 的柱子没有标数，第 4、5 幕的倍数是读图近似值；第 8 幕的地面反力曲线、第 10 幕的误差带、第 12 幕的走到跑曲线只画形状；火柴人、俯视点位、第 7 幕的分箱与第 11 幕的去噪轨迹是示意（第 11 幕的终点轨迹来自下面 `bm-guidance` 的玩具）。'
      ],
      scenes: BM_SCENES
    });
  }

  // ─── the narrated vertical video of the same twelve scenes ─────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：BeyondMimic 十二幕全流程',
      sub: '9 分 45 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十二幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '9.4 MB',
      fileName: 'BeyondMimic_讲解视频.mp4'
    });
  }

  K.mount({
    'bm-explainer': buildExplainerDemo,
    'bm-video': buildVideoDemo,
    'bm-anchor': buildAnchorDemo,
    'bm-impedance': buildImpedanceDemo,
    'bm-sampling': buildSamplingDemo,
    'bm-guidance': buildGuidanceDemo
  });
})();
