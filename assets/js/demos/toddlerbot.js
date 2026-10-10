/* Interactive demos for papers/12_Hardware_Design/ToddlerBot_Open-Source_ML-Compatible_Humanoid_Platform_for_Loco-Manipulation
 * （Shi, Wang, Song, Liu · ToddlerBot: Open-Source ML-Compatible Humanoid Platform for Loco-Manipulation ·
 *   arXiv 2502.00893 v4，2025-10；CoRL 2025）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["toddlerbot"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   tb-explainer — 十二幕讲解动画：为什么要 ML 兼容的平台（表 1）→ 30 个自由度与三种传动 → 可复现是硬约束 →
 *                  功率因子与电机选型（表 2、图 8）→ 零点校准（图 10）→ 电机台架辨识（式 6–7）→
 *                  9 参数执行器模型（式 8–10、表 3、图 12）→ 遥操作装置与两层 PD → 关键帧动画与 RL 行走（式 1–2、表 5–6）→
 *                  扩散策略 → 实验（图 3、表 7）→ 复刻验证与局限
 *   tb-video     — 同一套十二幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   tb-actuator  — 一台 Dynamixel 在仿真里长什么样：表 3 五款电机的力矩上限台阶、刹车力矩、k_d^min 与阻力 τ_r
 *   tb-sysid     — 拿掉一个参数，chirp 跟踪差多少：单电机台架玩具，按表 3 的 XC330 当「真机」
 *   tb-power     — 功率因子：按身高体重选电机（式 4–5、表 2、图 8）
 */

(function () {
  'use strict';

  var K = window.PaperDemoKit;
  /* 第 1、3、12 幕的真机图放在 assets/img/robots/，按本脚本自己的地址找（网页与离线视频都适用） */
  var ROBOT_IMG_BASE = (function () {
    var cs = document.currentScript;
    try {
      return cs && cs.src ? new URL('../../img/robots/', cs.src).href : '';
    } catch (e) {
      return '';
    }
  })();
  var el = K.el,
    fmt = K.fmt,
    clamp = K.clamp,
    card = K.card,
    controlsRow = K.controlsRow,
    slider = K.slider,
    buttonGroup = K.buttonGroup,
    checkbox = K.checkbox,
    statsRow = K.statsRow,
    verdictBox = K.verdictBox,
    legend = K.legend,
    note = K.note,
    stage = K.stage,
    begin = K.begin,
    plot = K.plot,
    line = K.line,
    dot = K.dot,
    text = K.text,
    axes = K.axes,
    registerRenderer = K.registerRenderer,
    mulberry32 = K.mulberry32;

  // ─── 论文里的数字（arXiv 2502.00893 v4；正文与附录 8.1–8.16 照抄，图 8 的 p̃ 按图上标的数） ───
  /* 官方代码（hshi74/toddlerbot 2.0）的数单独标出。十二幕动画、三个演示、配音旁白与笔记「🚶 具体实例」共用这一份。 */
  var ROBOT = { heightM: 0.56, kg: 3.4, gramsMeasured: 3484, dof: 30, armDof: 7, legDof: 6, neckDof: 2, waistDof: 2, usd: 6000, motorPcPct: 90, tflops: 2.5, torsoCm: [13, 9, 12] }; // 摘要、第 3.2 节、表 1、第 5 节
  var WEIGHT_EST = { motors: 30, perMotorG: 50, electronicsG: 600, structureG: 1000, totalG: 3100 }; // 附录 8.6
  /* 表 2（12 V 堵转力矩）与表 3（辨识出的 9 个参数）：d 阻尼 N·m·s/rad、I armature kg·m²、fl 摩擦损耗 N·m、
     tmax / qdt / qdm / tqd 力矩上限的台阶、kdmin 上电阻尼、tbrake 刹车力矩；joints 是表 2 的分工，count 是主动自由度数（不含夹爪） */
  var MOTORS = [
    { name: 'XC330', full: 'XC330-T288', stall: 1.0, d: 0.0036, I: 0.0040, fl: 0.036, tmax: 0.76, qdt: 1.80, qdm: 6.50, tqd: 0.48, kdmin: 0.384, tbrake: 1.75, joints: '颈俯仰 / 偏航、腰横滚 / 偏航、髋偏航、夹爪', count: 6, kpDyn: 1500 },
    { name: 'XC430', full: 'XC430-T240BB', stall: 1.9, d: 0.0066, I: 0.0042, fl: 0.024, tmax: 1.32, qdt: 1.60, qdm: 7.00, tqd: 0.21, kdmin: 0.170, tbrake: 3.00, joints: '肩俯仰、踝横滚', count: 4, kpDyn: 1500 },
    { name: 'XM430', full: 'XM430-W210', stall: 3.0, d: 0.0056, I: 0.0022, fl: 0.025, tmax: 1.61, qdt: 0.10, qdm: 7.63, tqd: 0.47, kdmin: 0.203, tbrake: 3.70, joints: '膝俯仰、踝俯仰', count: 4, kpDyn: 2100 },
    { name: '2XL430', full: '2XL430-W250', stall: 1.5, d: 0.0010, I: 0.0083, fl: 0.078, tmax: 0.94, qdt: 2.00, qdm: 5.97, tqd: 0.10, kdmin: 0.161, tbrake: 1.40, joints: '肩横滚 / 偏航、肘横滚 / 偏航、腕俯仰 / 横滚', count: 12, kpDyn: 600 },
    { name: '2XC430', full: '2XC430-W250', stall: 1.8, d: 0.0028, I: 0.0044, fl: 0.060, tmax: 1.09, qdt: 2.00, qdm: 6.78, tqd: 0.23, kdmin: 0.185, tbrake: 2.20, joints: '髋横滚 / 俯仰', count: 4, kpDyn: 2100 }
  ];
  var CODE = { kpRatio: 150, kdRatio: 16, passiveActive: 3, ctrlHz: 50, ctrlHz2: 200, comKp: 1.0, pitchKp: 0.2, pitchKd: 0.01, pitchTarget: -0.2, pitchPayload: -0.7, chirpHz: [0.1, 10], chirpAmp: [0.25, 0.5, 0.75] }; // default.yml、balance_pd.py、sysID.py、CHANGELOG
  var TORQUE_REQ = { hM: 0.5, kg: 3.1, humanH: 1.73, humanKg: 70.9, knee: 2.35, ankle: 2.66, hip: 1.77 }; // 附录 8.6 式 5
  /* 图 8：功率因子 p̃ = Σ|τ_max| / (h m g)，按图上标的「总 = 上 + 下」 */
  var POWER = [
    ['NAO H25', 5.02, 0.83, 4.19], ['Robotis OP3', 4.68, 1.87, 2.81], ['Berkeley', 4.34, 0, 4.34], ['MIT', 4.12, 1.25, 2.88], ['Unitree G1', 3.46, 1.01, 2.44],
    ['Booster T1', 3.21, 0.90, 2.30], ['Berkeley Lite', 3.03, 1.27, 1.75], ['Unitree H1', 2.85, 0.53, 2.32], ['ToddlerBot', 2.74, 1.40, 1.35], ['Duke', 2.28, 0, 2.28],
    ['Human', 2.22, 0.95, 1.27], ['BRUCE', 1.50, 0.36, 1.14], ['Fourier GR1', 1.18, 0.52, 0.65]
  ];
  /* 表 1（节选）：名字 / 身高 m / 重量 kg / 主动自由度 / 价格（千美元，未公开为 null）/ 能采真机数据 */
  var TABLE1 = [
    ['Atlas', 1.50, 89, 28, null, false], ['Digit', 1.75, 65, 16, 250, false], ['Unitree H1', 1.76, 47, 19, 70, true], ['Unitree G1', 1.32, 35, 29, 57, true],
    ['Booster T1', 1.18, 30, 23, 34, false], ['iCub', 1.04, 24, 32, 300, false], ['Berkeley', 0.85, 16, 12, 10, false], ['Berkeley Lite', 0.80, 16, 22, 5, true],
    ['BRUCE', 0.70, 4.8, 16, 6.5, false], ['NAO H25', 0.57, 5.2, 23, 14, false], ['Robotis OP3', 0.51, 3.5, 20, 11, false], ['Zeroth', 0.48, 3.6, 16, 1.4, false],
    ['ToddlerBot', 0.56, 3.4, 30, 6, true], ['成年人', 1.73, 70.9, 32, null, false]
  ];
  var COMMS = { baud: 2e6, motors: 30, hz: 50, backlashDeg: 0.25, encoder: 4096 }; // 附录 8.6
  var BATTERY = { computeW: 15, motorsW: 50, dutyPct: 70, whPerHour: 75, lipoMah: 2000, lipoG: 215, cellMah: 5000, cellG: 330, volt: 14.8, amp: 25, hoursLab: [3, 5], hoursTypical: 2, supplyV: 15, supplyW: 300 }; // 附录 8.7
  var TESTBED = { brakeNm: 5, driveNm: 1, precision: 3e-4, trackingErrDeg: 1.3, params: 9 }; // 附录 8.9–8.10
  var TELEOP = { trajectories: 60, minutes: 20, fsr: 2, pads: ['Steam Deck', 'ROG Ally X'] }; // 第 3.3、4.3 节
  var RL = { net: [512, 256, 128], steps: 3e8, envs: 1024, episode: 1000, unroll: 20, batch: 256, minibatches: 4, updates: 4, gamma: 0.97, lr: 1e-4, entropy: 5e-4, clip: 0.2, hz: 50 }; // 附录表 5
  var DP = { px: 96, hz: 10, trainSteps: 100, inferSteps: 3, params: 3e8, latencyS: 0.1, predict: 16, discard: 3, execute: 5, demos: 60, trials: 20, bimanualPct: 90, fullBodyPct: 75 }; // 附录 8.13、第 5 节
  var EXP = { armSpanCm: [27, 24, 31], payloadG: 1484, enduranceMin: 19, fallsBeforeBreak: 7, repairPrintMin: 21, repairAssembleMin: 14, rollouts: 10, studentDays: 3, replications: 5, replicationWeeks: 1 }; // 第 5 节
  var TABLE7 = { pos: [0.082, 0.133, 0.018], linVel: [0.016, 0.032, 0.002], angVel: [0.056, 0.113, 0.010] }; // 附录 8.14：[仿真, 真机均值, 真机标准差]
  var G = 9.81;

  function motor(name) {
    for (var i = 0; i < MOTORS.length; i++) if (MOTORS[i].name === name) return MOTORS[i];
    return null;
  }
  /* 式 9（按表 3 / 图 12 / 代码）：低速 τ_max，超过 q̇_τmax 后线性降到 q̇_max 处的 τ_q̇max，再快为 0 */
  function tauLimit(m, qd) {
    var a = Math.abs(qd);
    if (a <= m.qdt) return m.tmax;
    if (a <= m.qdm) return m.tmax + (m.tqd - m.tmax) * (a - m.qdt) / (m.qdm - m.qdt);
    return 0;
  }
  /* 式 6：MuJoCo 的被动阻力 τ_r = τ_f + d·q̇ */
  function tauR(m, qd) {
    return m.fl + m.d * Math.abs(qd);
  }
  /* 式 8 + 式 10（按图 12 / 代码的区间）：PD 加 k_d^min，被反驱时 k_p 乘被动 / 主动比，加速方向夹到 τ_limit、减速方向夹到 τ_brake，再加被动阻力 */
  function motorTorque(m, kp, kd, qRef, q, qd, qdd, par, limitOn) {
    var e = qRef - q;
    var kpe = qdd * e < 0 ? kp * par : kp;
    var tm = kpe * e - (m.kdmin + kd) * qd;
    var lim = limitOn === false ? 1e9 : tauLimit(m, qd);
    var tr = tauR(m, qd);
    if (qd >= 0) return Math.max(-m.tbrake, Math.min(lim, tm)) - tr;
    return Math.max(-lim, Math.min(m.tbrake, tm)) + tr;
  }
  /* 式 4：p̃ = Σ|τ_max| / (h m g)；表 2 的堵转力矩之和是 50.8 N·m */
  function stallSum() {
    return MOTORS.reduce(function (s, m) { return s + m.stall * m.count; }, 0);
  }
  function powerFactor(sumTau, h, kg) {
    return sumTau / (h * kg * G);
  }
  /* 式 5：按身高 × 体重把人的关节力矩换算给机器人；论文用 0.5 m、3.1 kg 得 2.35 / 2.66 / 1.77 */
  function scaledTorque(h, kg, tauAt) {
    return tauAt * (h * kg) / (TORQUE_REQ.hM * TORQUE_REQ.kg);
  }
  /* 自由旋转衰减：ω̇ = −(τ_f + dω)/I，从 ω0 到停转的时间 */
  function spinDownTime(m, w0) {
    return (m.I / m.d) * Math.log(1 + (w0 * m.d) / m.fl);
  }
  var STALL_SUM = stallSum(); // 50.8
  var P_TODDLER = powerFactor(STALL_SUM, ROBOT.heightM, ROBOT.kg); // 2.72（图 8 写 2.74）
  var P_HUMAN = 2.22;

  // ─── 单电机玩具：表 3 的 XC330 带着台架上的负载臂（21700 电芯 70 g、臂长 0.08 m），跟一段 chirp ───
  /* PD 增益取代码里 XC330 关节的 Dynamixel k_p = 1500，除以 150 得物理 k_p = 10 N·m/rad，k_d = 0；设定点 50 Hz 零阶保持，
     物理 1 kHz 半隐式欧拉；角度从水平位算，重力矩 −m g r cos θ。这是简化模型，不是论文的台架或仿真，只用来看哪个参数最要紧。 */
  var LOAD = { m: 0.070, r: 0.08 };
  var CHIRP = { A: 0.5, f0: 0.1, f1: 2.0, T: 8.0 };
  var TOY = { kp: 10, kd: 0, dt: 0.001, ctrlEvery: 20 };
  function chirpRef(t) {
    return CHIRP.A * Math.sin(2 * Math.PI * (CHIRP.f0 * t + (CHIRP.f1 - CHIRP.f0) * t * t / (2 * CHIRP.T)));
  }
  /* p：各参数相对表 3 的倍数（fl / d / I / kdmin），par = false 关掉被动 / 主动比，limit = false 不限力矩；返回 50 Hz 的角度序列 */
  function toyRun(p) {
    var o = p || {}, X = motor('XC330');
    var fl = X.fl * (o.fl == null ? 1 : o.fl), d = X.d * (o.d == null ? 1 : o.d);
    var I = X.I * (o.I == null ? 1 : o.I), kdmin = X.kdmin * (o.kdmin == null ? 1 : o.kdmin);
    var par = o.par === false ? 1 : CODE.passiveActive, limitOn = o.limit !== false;
    var J = I + LOAD.m * LOAD.r * LOAD.r;
    var th = 0, w = 0, acc = 0, out = [], qRef = 0;
    var n = Math.round(CHIRP.T / TOY.dt);
    for (var i = 0; i <= n; i++) {
      var t = i * TOY.dt;
      if (i % TOY.ctrlEvery === 0) { qRef = chirpRef(t); out.push(th); }
      if (i === n) break;
      var e = qRef - th;
      var kp = acc * e < 0 ? TOY.kp * par : TOY.kp;
      var tm = kp * e - kdmin * w;
      var a = Math.abs(w), lim;
      if (!limitOn) lim = 1e9;
      else if (a <= X.qdt) lim = X.tmax;
      else if (a <= X.qdm) lim = X.tmax + (X.tqd - X.tmax) * (a - X.qdt) / (X.qdm - X.qdt);
      else lim = 0;
      var tr = fl + d * a;
      var tau = w >= 0 ? Math.max(-X.tbrake, Math.min(lim, tm)) - tr : Math.max(-lim, Math.min(X.tbrake, tm)) + tr;
      acc = (tau - LOAD.m * G * LOAD.r * Math.cos(th)) / J;
      w += acc * TOY.dt;
      th += w * TOY.dt;
    }
    return out;
  }
  function rmseDeg(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]);
    return (Math.sqrt(s / a.length) * 180) / Math.PI;
  }
  var TOY_REAL = toyRun();
  var TOY_REF = TOY_REAL.map(function (_, i) { return chirpRef(i * TOY.ctrlEvery * TOY.dt); });
  var TOY_TRACK = rmseDeg(TOY_REAL, TOY_REF); // 5.8°：真机对设定点
  /* 第 7 幕与演示 2 的「拿掉一项」表：和「真机」比 RMSE */
  var KNOCKOUTS = [
    { key: 'kdmin', label: '$k_d^{\\min} = 0$', p: { kdmin: 0 } },
    { key: 'par', label: '被动 / 主动比 = 1', p: { par: false } },
    { key: 'limit', label: '不限力矩', p: { limit: false } },
    { key: 'I', label: 'armature = 0', p: { I: 0 } },
    { key: 'fl', label: '摩擦损耗 = 0', p: { fl: 0 } },
    { key: 'd', label: '阻尼 = 0', p: { d: 0 } }
  ].map(function (k) { k.rmse = rmseDeg(toyRun(k.p), TOY_REAL); return k; }); // 4.32 / 1.90 / 1.53 / 0.90 / 0.24 / 0.09
  function sci(x, d) {
    var e = Math.floor(Math.log10(Math.abs(x)));
    var m = x / Math.pow(10, e);
    if (Math.abs(m - 10) < 1e-9) { m = 1; e += 1; }
    return fmt(m, d == null ? 2 : d) + '\\times10^{' + e + '}';
  }

  // ─── 演示 1：一台 Dynamixel 在仿真里长什么样 ───────────────────────────────────────
  function buildActuatorDemo(host) {
    var root = card(host, {
      title: '一台 Dynamixel 在仿真里长什么样：力矩上限的台阶、刹车力矩、$k_d^{\\min}$ 与阻力',
      sub: '选表 3 里的一款电机，拖关节速度和位置误差：看式 9 的力矩上限沿台阶往下掉、式 8 里 $k_d^{\\min}\\dot q$ 吃掉多少、式 10 把 PD 力矩夹在哪两条线之间，以及阻力 $\\tau_r = \\tau_f + d\\dot q$ 有多大。'
    });
    var state = { m: 0, qd: 3, e: 0.1, backdriven: false };
    var row = controlsRow(root);
    var pick = buttonGroup(row, {
      label: '电机（表 2 / 表 3）',
      items: MOTORS.map(function (m, i) { return { label: m.name, value: i }; }),
      value: 0,
      onPick: function (v) { state.m = v; render(); }
    });
    var row2 = controlsRow(root);
    slider(row2, { label: '关节速度 $\\dot q$', min: 0, max: 8, step: 0.1, value: 3, format: function (v) { return fmt(v, 1) + ' rad/s'; }, onInput: function (v) { state.qd = v; render(); } });
    slider(row2, { label: '位置误差 $\\hat q - q$', min: -0.3, max: 0.3, step: 0.01, value: 0.1, format: function (v) { return fmt(v, 2) + ' rad'; }, onInput: function (v) { state.e = v; render(); } });
    checkbox(row2, '被外力反驱（$k_p$ 乘被动 / 主动比 3）', false, function (v) { state.backdriven = v; render(); });
    var st = stage(root, 270);
    var setLegend = legend(root, [{ key: 'accent', text: '━ 加速方向上限 $\\tau_{\\text{limit}}$' }, { key: 'bad', text: '━ 减速方向上限 $\\tau_{\\text{brake}}$' }, { key: 'warn', text: '┅ $k_d^{\\min}\\dot q$' }, { key: 'good', text: '━ 阻力 $\\tau_r$（×10 画）' }, { key: 'muted', text: '┄ 表 2 堵转力矩' }]);
    var stats = statsRow(root);
    var sLim = stats.add('此速度的 $\\tau_{\\text{limit}}$'), sKd = stats.add('$k_d^{\\min}\\dot q$'), sTm = stats.add('PD 力矩 $\\tau_m$'), sNet = stats.add('关节净力矩 $\\tau$'), sTr = stats.add('阻力 $\\tau_r$'), sKp = stats.add('物理 $k_p$');
    var verdict = verdictBox(root);
    note(root, [
      '力矩上限按表 3 / 图 12 / 代码画：$(\\dot q_{\\tau_{\\max}}, \\tau_{\\max})$ 到 $(\\dot q_{\\max}, \\tau_{\\dot q_{\\max}})$ 线性下降，过了 $\\dot q_{\\max}$ 才归零（正文式 9 写的是降到 0，见笔记附录 C）。$k_p$ 取代码里该关节的 Dynamixel 增益除以 150（`kp_ratio`），$k_d = 0$。',
      '表 3 的 $\\tau_{\\max}$ 比表 2 的堵转力矩低：堵转是官网 12 V 标称值，$\\tau_{\\max}$ 是按真机 chirp 跟踪数据拟合出的可用上限。阻力 $\\tau_r$ 由 MuJoCo 的 `damping` / `frictionloss` 自己算，代码的 `MotorController` 只管式 8 与式 10 的夹紧。'
    ]);
    var render = registerRenderer(function () {
      var m = MOTORS[state.m], kp = m.kpDyn / CODE.kpRatio;
      var g = begin(st), P = g.P;
      setLegend(P);
      var xMax = 8, yMax = Math.ceil(Math.max(m.tbrake, m.stall) * 1.15 * 2) / 2;
      var p = plot(g, { l: 46, r: 16, t: 24, b: 32 }, [0, xMax], [-yMax, yMax]);
      axes(g, p, { xTicks: K.niceTicks(0, xMax, 5), yTicks: K.niceTicks(-yMax, yMax, 6), xLabel: '关节速度 rad/s', yLabel: '力矩 N·m' });
      line(g.ctx, [[p.x0, p.sy(0)], [p.x1, p.sy(0)]], P.grid, 1);
      line(g.ctx, [[p.x0, p.sy(m.stall)], [p.x1, p.sy(m.stall)]], P.muted, 1, [3, 4]);
      text(g.ctx, '堵转 ' + m.stall, p.x1 - 4, p.sy(m.stall) - 6, P.muted, 'right', '11px sans-serif');
      var env = [], kdl = [], trl = [];
      for (var i = 0; i <= 200; i++) {
        var q = (xMax * i) / 200;
        env.push([p.sx(q), p.sy(tauLimit(m, q))]);
        kdl.push([p.sx(q), p.sy(clamp(m.kdmin * q, -yMax, yMax))]);
        trl.push([p.sx(q), p.sy(Math.min(yMax, 10 * tauR(m, q)))]);
      }
      line(g.ctx, env, P.accent, 2.4);
      line(g.ctx, [[p.x0, p.sy(-m.tbrake)], [p.x1, p.sy(-m.tbrake)]], P.bad, 2.2);
      text(g.ctx, '刹车 −' + m.tbrake, p.x1 - 4, p.sy(-m.tbrake) + 13, P.bad, 'right', '11px sans-serif');
      line(g.ctx, kdl, P.warn, 1.6, [5, 4]);
      line(g.ctx, trl, P.good, 1.8);
      var lim = tauLimit(m, state.qd), tr = tauR(m, state.qd), kde = m.kdmin * state.qd;
      var par = state.backdriven ? CODE.passiveActive : 1;
      var tm = kp * par * state.e - kde;
      var net = Math.max(-m.tbrake, Math.min(lim, tm)) - tr;
      line(g.ctx, [[p.sx(state.qd), p.y0], [p.sx(state.qd), p.y1]], P.muted, 1, [3, 3]);
      dot(g.ctx, p.sx(state.qd), p.sy(lim), 4.5, P.accent);
      dot(g.ctx, p.sx(state.qd), p.sy(clamp(tm, -yMax, yMax)), 5, P.text, P.surface);
      dot(g.ctx, p.sx(state.qd), p.sy(clamp(net, -yMax, yMax)), 4, P.warn);
      text(g.ctx, 'τm', p.sx(state.qd) + 8, p.sy(clamp(tm, -yMax, yMax)) + 4, P.text, 'left', '11px sans-serif');
      st.canvas.setAttribute('aria-label', m.full + ' 的力矩上限、刹车力矩、k_d^min 与阻力曲线');
      sLim.set(fmt(lim, 3) + ' N·m', lim < m.tmax - 1e-9 ? 'bad' : null);
      sKd.set(fmt(kde, 3) + ' N·m');
      sTm.set(fmt(tm, 3) + ' N·m');
      sNet.set(fmt(net, 3) + ' N·m', net < 0 ? 'bad' : 'good');
      sTr.set(fmt(tr, 4) + ' N·m');
      sKp.set(fmt(kp, 1) + ' N·m/rad（Dynamixel ' + m.kpDyn + ' ÷ 150）');
      if (state.qd > m.qdm) verdict.set('超过 $\\dot q_{\\max} = ' + m.qdm + '$ rad/s：加速方向没有力矩了；代码里若还往同方向推，直接按 $-\\tau_{\\text{brake}}$ 刹车（Dynamixel 自保护）。', 'bad');
      else if (tm < 0 && state.e > 0) verdict.set('位置误差是正的，PD 却在**刹车**：$k_d^{\\min}\\dot q = ' + fmt(kde, 2) + '$ 已经大于 $k_p e = ' + fmt(kp * par * state.e, 2) + '$。这就是论文为什么把上电阻尼单独建成 $k_d^{\\min}$。', 'frozen');
      else if (tm > lim) verdict.set('PD 想出 ' + fmt(tm, 2) + ' N·m，被 $\\tau_{\\text{limit}} = ' + fmt(lim, 2) + '$ 夹住' + (lim < m.tmax - 1e-9 ? '——转得越快，台阶越低。' : '（低速段是常数 $\\tau_{\\max}$）。'), 'learning');
      else verdict.set('PD 力矩在上限之内，净力矩再减去阻力 $\\tau_r = ' + fmt(tr, 3) + '$ N·m；' + (state.backdriven ? '被反驱时 $k_p$ 乘 3，相当于齿轮箱效率约 58%。' : '勾上「被反驱」看 $k_p$ 乘 3 的效果。'), 'learning');
    });
    pick.pick(0, true);
    render();
  }

  // ─── 演示 2：拿掉一个参数，chirp 跟踪差多少 ──────────────────────────────────────────
  function buildSysIdDemo(host) {
    var root = card(host, {
      title: '拿掉一个参数，chirp 跟踪差多少：单电机台架玩具',
      sub: '橙线是按表 3 的 XC330 跑出来的「真机」，蓝线是你改过参数的「仿真」，灰虚线是 0.1 → 2 Hz 的 chirp 设定点。一项项把 $k_d^{\\min}$、被动 / 主动比、力矩上限、armature、摩擦损耗、阻尼关掉或改倍数，看蓝线离橙线多远。'
    });
    var state = { kdmin: 1, par: true, limit: true, I: 1, fl: 1, d: 1 };
    var row = controlsRow(root);
    var presets = buttonGroup(row, {
      label: '一键',
      items: [{ label: '全对', value: 'ok' }].concat(KNOCKOUTS.map(function (k) { return { label: k.label, value: k.key }; })),
      value: 'ok',
      onPick: function (v) {
        state = { kdmin: 1, par: true, limit: true, I: 1, fl: 1, d: 1 };
        if (v === 'kdmin') state.kdmin = 0; else if (v === 'par') state.par = false; else if (v === 'limit') state.limit = false;
        else if (v === 'I') state.I = 0; else if (v === 'fl') state.fl = 0; else if (v === 'd') state.d = 0;
        sKdmin.set(state.kdmin, true); sI.set(state.I, true); sFl.set(state.fl, true); sD.set(state.d, true);
        render();
      }
    });
    var row2 = controlsRow(root);
    var sKdmin = slider(row2, { label: '$k_d^{\\min}$ 倍数', min: 0, max: 1.5, step: 0.05, value: 1, format: function (v) { return '×' + fmt(v, 2); }, onInput: function (v) { state.kdmin = v; render(); } });
    var sI = slider(row2, { label: 'armature 倍数', min: 0, max: 2, step: 0.05, value: 1, format: function (v) { return '×' + fmt(v, 2); }, onInput: function (v) { state.I = v; render(); } });
    var sFl = slider(row2, { label: '摩擦损耗倍数', min: 0, max: 2, step: 0.05, value: 1, format: function (v) { return '×' + fmt(v, 2); }, onInput: function (v) { state.fl = v; render(); } });
    var sD = slider(row2, { label: '阻尼倍数', min: 0, max: 2, step: 0.05, value: 1, format: function (v) { return '×' + fmt(v, 2); }, onInput: function (v) { state.d = v; render(); } });
    var row3 = controlsRow(root);
    checkbox(row3, '被动 / 主动比 3（关掉 = 1）', true, function (v) { state.par = v; render(); });
    checkbox(row3, '力矩上限（式 9）', true, function (v) { state.limit = v; render(); });
    var st = stage(root, 280);
    var setLegend = legend(root, [{ key: 'muted', text: '┄ chirp 设定点' }, { key: 'warn', text: '━ 「真机」：表 3 的 XC330' }, { key: 'accent', text: '━ 「仿真」：你改过的参数' }]);
    var stats = statsRow(root);
    var sRm = stats.add('仿真对真机 RMSE'), sTrack = stats.add('真机对设定点 RMSE'), sJ = stats.add('总惯量 $J$'), sMax = stats.add('仿真最大速度');
    var verdict = verdictBox(root);
    note(root, [
      '**这是简化模型，数值不能和论文直接比**：一台 XC330 带着台架上的 21700 电芯（0.070 kg、臂长 0.08 m，总惯量 0.004448 kg·m²，转子惯量占九成），$k_p = 10$ N·m/rad（代码 1500 ÷ 150）、$k_d = 0$，设定点 50 Hz 零阶保持、物理 1 kHz，chirp 0.1 → 2 Hz 幅值 0.5 rad（代码里真机 chirp 是 0.1 → 10 Hz，这里取低频段好看）。论文的 **1.3°** 是真机对拟合后仿真的平均误差，不是这里的数。',
      '表 3 的九个参数里，$k_d^{\\min}$ 最要紧（拿掉差 4.32°），被动 / 主动比（1.90°）和力矩上限（1.53°）其次，armature 0.90°，摩擦损耗和阻尼在这个玩具里几乎看不出（0.24° / 0.09°）——它们更影响慢速和换向。这和论文「上电就有明显的额外阻尼，所以单独建成 $k_d^{\\min}$」的观察一致。'
    ]);
    var render = registerRenderer(function () {
      var sim = toyRun(state);
      var g = begin(st), P = g.P;
      setLegend(P);
      var p = plot(g, { l: 46, r: 14, t: 22, b: 32 }, [0, CHIRP.T], [-0.7, 0.7]);
      axes(g, p, { xTicks: [0, 2, 4, 6, 8], yTicks: [-0.6, -0.3, 0, 0.3, 0.6], xLabel: '时间 s', yLabel: '角度 rad' });
      function pts(arr) { return arr.map(function (v, i) { return [p.sx(i * TOY.ctrlEvery * TOY.dt), p.sy(clamp(v, -0.7, 0.7))]; }); }
      line(g.ctx, pts(TOY_REF), P.muted, 1.2, [4, 3]);
      line(g.ctx, pts(TOY_REAL), P.warn, 2.4);
      line(g.ctx, pts(sim), P.accent, 1.8);
      st.canvas.setAttribute('aria-label', 'chirp 设定点、表 3 参数的真机与改过参数的仿真三条角度曲线');
      var r = rmseDeg(sim, TOY_REAL), vmax = 0;
      for (var i = 1; i < sim.length; i++) vmax = Math.max(vmax, Math.abs(sim[i] - sim[i - 1]) / (TOY.ctrlEvery * TOY.dt));
      var J = motor('XC330').I * state.I + LOAD.m * LOAD.r * LOAD.r;
      sRm.set(fmt(r, 2) + '°', r > 1 ? 'bad' : r > 0.3 ? 'warn' : 'good');
      sTrack.set(fmt(TOY_TRACK, 1) + '°');
      sJ.set('$' + sci(J, 2) + '$ kg·m²');
      sMax.set(fmt(vmax, 1) + ' rad/s' + (vmax > 6.5 ? '（> $\\dot q_{\\max}$ 6.5）' : ''));
      if (r < 0.05) verdict.set('参数全对，仿真和真机重合。真机自己对设定点仍差 ' + fmt(TOY_TRACK, 1) + '°：到 2 Hz 时要 6.3 rad/s，已经碰到 $\\dot q_{\\max}$。', 'learning');
      else if (state.kdmin < 0.5) verdict.set('$k_d^{\\min}$ 给少了：仿真里的电机比真机「冲」得多，这一项在玩具里影响最大（全拿掉 4.32°）。', 'bad');
      else if (!state.par) verdict.set('没建被动 / 主动比：被反驱时真机的 $k_p$ 其实是 3 倍，仿真里松了（1.90°）。', 'bad');
      else if (!state.limit) verdict.set('不限力矩：仿真里电机在高速段还能出力，真机早就沿台阶掉下去了（1.53°）。', 'bad');
      else if (state.I < 0.5) verdict.set('armature 给少了：这台电机的转子惯量折算过来比负载还大，少了它起步快得多（全拿掉 0.90°）。', 'bad');
      else verdict.set('差 ' + fmt(r, 2) + '°。摩擦损耗和阻尼在这个玩具里只影响零点几度——它们更影响慢速和换向，chirp 的高频段看不出来。', 'frozen');
    });
    presets.pick('ok', true);
    render();
  }

  // ─── 演示 3：功率因子：按身高体重选电机 ──────────────────────────────────────────────
  function buildPowerDemo(host) {
    var root = card(host, {
      title: '功率因子：按身高体重选电机（式 4–5、表 2、图 8）',
      sub: '拖机器人的身高和体重：式 5 把人跑步、爬坡时的关节力矩按 $h\\,m$ 的比例换算过来，看膝 / 踝 / 髋各要多大、表 2 的哪款 Dynamixel 够用；同一套电机的功率因子 $\\tilde p = \\sum|\\tau^{\\max}| / (h m g)$ 落在图 8 的哪里。'
    });
    var state = { h: TORQUE_REQ.hM, kg: TORQUE_REQ.kg };
    var row = controlsRow(root);
    var sH = slider(row, { label: '身高 $h$', min: 0.3, max: 1.8, step: 0.01, value: TORQUE_REQ.hM, format: function (v) { return fmt(v, 2) + ' m'; }, onInput: function (v) { state.h = v; render(); } });
    var sM = slider(row, { label: '体重 $m$', min: 1, max: 80, step: 0.1, value: TORQUE_REQ.kg, format: function (v) { return fmt(v, 1) + ' kg'; }, onInput: function (v) { state.kg = v; render(); } });
    var row2 = controlsRow(root);
    buttonGroup(row2, {
      label: '预设',
      items: [{ label: '论文估计 0.5 m / 3.1 kg', value: 'est' }, { label: '实测 0.56 m / 3.4 kg', value: 'real' }, { label: '抱着 1484 g', value: 'payload' }, { label: 'Berkeley Humanoid 0.85 m / 16 kg', value: 'bh' }],
      value: 'est',
      onPick: function (v) {
        if (v === 'est') { state.h = TORQUE_REQ.hM; state.kg = TORQUE_REQ.kg; }
        else if (v === 'real') { state.h = ROBOT.heightM; state.kg = ROBOT.kg; }
        else if (v === 'payload') { state.h = ROBOT.heightM; state.kg = (ROBOT.gramsMeasured + EXP.payloadG) / 1000; }
        else { state.h = 0.85; state.kg = 16; }
        sH.set(state.h, true); sM.set(state.kg, true); render();
      }
    });
    var st = stage(root, 280);
    var setLegend = legend(root, [{ key: 'accent', text: '━ 图 8 的功率因子' }, { key: 'warn', text: '━ 这套电机在你给的身高体重下' }, { key: 'bad', text: '┄ 人：2.22' }]);
    var stats = statsRow(root);
    var sKnee = stats.add('膝要'), sAnkle = stats.add('踝俯仰要'), sHip = stats.add('髋俯仰要'), sP = stats.add('$\\tilde p$（表 2 的 50.8 N·m）');
    var tbl = K.table(root);
    var verdict = verdictBox(root);
    note(root, [
      '式 5：$\\tau_{\\text{robot}} = \\dfrac{h_{\\text{robot}} m_{\\text{robot}}}{h_{\\text{human}} m_{\\text{human}}}\\tau_{\\text{human}}$，人取 1.73 m、70.9 kg；论文按 0.5 m、3.1 kg 得膝 2.35、踝 2.66、髋 1.77 N·m，反推人的参考力矩约 186 / 210 / 140 N·m（我们算的）。电机「够不够」只看表 2 的堵转力矩，和论文的选型逻辑一致。',
      '$\\tilde p$ 的分子固定是表 2 的 $6\\times1.0 + 4\\times1.9 + 4\\times3.0 + 12\\times1.5 + 4\\times1.8 = 50.8$ N·m：按 0.56 m、3.4 kg 算是 2.72，图 8 写 2.74（1.40 + 1.35），差 1%。用 Berkeley Humanoid 的表 2 验算，$578.6 / (0.85\\times16\\times9.81) = 4.34$ 和图 8 一样。抱着 1484 g 时 $\\tilde p$ 掉到 1.86，已经低于人。'
    ]);
    var render = registerRenderer(function () {
      var g = begin(st), P = g.P;
      setLegend(P);
      var items = POWER.slice();
      var mine = powerFactor(STALL_SUM, state.h, state.kg);
      var yMax = Math.max(5.5, Math.ceil(mine) + 0.5);
      var p = plot(g, { l: 40, r: 10, t: 22, b: 70 }, [0, items.length + 1], [0, yMax]);
      axes(g, p, { xTicks: [], yTicks: K.niceTicks(0, yMax, 6), yLabel: 'p̃' });
      line(g.ctx, [[p.x0, p.sy(P_HUMAN)], [p.x1, p.sy(P_HUMAN)]], P.bad, 1.2, [5, 4]);
      var bw = (p.x1 - p.x0) / (items.length + 1) * 0.68;
      items.forEach(function (it, k) {
        var x = p.sx(k + 0.5) - bw / 2;
        var isT = it[0] === 'ToddlerBot';
        g.ctx.fillStyle = isT ? P.warn : P.accent;
        g.ctx.globalAlpha = it[0] === 'Human' ? 0.45 : 0.85;
        g.ctx.fillRect(x, p.sy(it[1]), bw, p.sy(0) - p.sy(it[1]));
        g.ctx.globalAlpha = 1;
        text(g.ctx, fmt(it[1], 2), x + bw / 2, p.sy(it[1]) - 4, P.text, 'center', '10px sans-serif');
        g.ctx.save(); g.ctx.translate(x + bw / 2, p.y0 + 8); g.ctx.rotate(-Math.PI / 4);
        text(g.ctx, it[0], 0, 0, isT ? P.warn : P.muted, 'right', '10px sans-serif');
        g.ctx.restore();
      });
      var xm = p.sx(items.length + 0.5) - bw / 2;
      g.ctx.fillStyle = P.warn; g.ctx.globalAlpha = 0.6;
      g.ctx.fillRect(xm, p.sy(Math.min(mine, yMax)), bw, p.sy(0) - p.sy(Math.min(mine, yMax)));
      g.ctx.globalAlpha = 1;
      text(g.ctx, fmt(mine, 2), xm + bw / 2, p.sy(Math.min(mine, yMax)) - 4, P.warn, 'center', 'bold 10px sans-serif');
      g.ctx.save(); g.ctx.translate(xm + bw / 2, p.y0 + 8); g.ctx.rotate(-Math.PI / 4);
      text(g.ctx, '你给的', 0, 0, P.warn, 'right', '10px sans-serif');
      g.ctx.restore();
      st.canvas.setAttribute('aria-label', '图 8 各平台的功率因子柱状图，加一根按当前身高体重算的柱');
      var knee = scaledTorque(state.h, state.kg, TORQUE_REQ.knee), ankle = scaledTorque(state.h, state.kg, TORQUE_REQ.ankle), hip = scaledTorque(state.h, state.kg, TORQUE_REQ.hip);
      sKnee.set(fmt(knee, 2) + ' N·m'); sAnkle.set(fmt(ankle, 2) + ' N·m'); sHip.set(fmt(hip, 2) + ' N·m');
      sP.set(fmt(mine, 2), mine < P_HUMAN ? 'bad' : null);
      tbl.clear();
      tbl.row(['电机', '堵转力矩', '膝余量', '踝俯仰余量', '髋俯仰余量'], true);
      MOTORS.forEach(function (m) {
        function cell(req) { return { text: (m.stall >= req ? '+' : '') + fmt((m.stall / req - 1) * 100, 0) + '%', cls: m.stall >= req ? 'is-good' : 'is-bad' }; }
        tbl.row([m.name, m.stall + ' N·m', cell(knee), cell(ankle), cell(hip)]);
      });
      var ok = MOTORS.filter(function (m) { return m.stall >= knee && m.stall >= ankle; }).map(function (m) { return m.name; });
      if (mine < P_HUMAN) verdict.set('这套电机在 ' + fmt(state.h, 2) + ' m、' + fmt(state.kg, 1) + ' kg 下 $\\tilde p = ' + fmt(mine, 2) + '$，低于人的 2.22：按论文的主张，做不出人那样的动态动作（抱着 1484 g 就是这种情况）。', 'bad');
      else if (!ok.length) verdict.set('表 2 里没有一款电机的堵转力矩够膝（' + fmt(knee, 2) + '）和踝（' + fmt(ankle, 2) + '）——要换更强的电机，功率因子也要重新算。', 'bad');
      else verdict.set('够膝和踝的只有 ' + ok.join('、') + '；论文在 0.5 m / 3.1 kg 下的结论是「XM430 是唯一够的」，2XC430 的 1.8 对髋的 1.77 只多 1.7%。$\\tilde p = ' + fmt(mine, 2) + '$，图 8 写 ToddlerBot 2.74。', ok.length === 1 ? 'learning' : 'frozen');
    });
    render();
  }

  // ─── 讲解动画：十二幕 ───────────────────────────────────────────────────────
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
    C_MUTED = X.muted,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2,
    C_INK = X.ink,
    C_INK2 = X.ink2;
  /* 全片统一：仿真蓝、真机橙、这篇的做法绿、问题红、示意灰 */
  var C_SIM = C_ACCENT, C_REAL = C_WARN;

  /* 视频里一幕要讲五十秒左右，画面不能停：draw(t, clock) 的 clock 是这一幕的真实时间
     （旁白比分镜长时 t 停在一段的末尾，clock 照走），齿轮、走路、chirp 这类循环动作按 clock 画；网页播放器只传 t。
     出场 / 描线这类一次性动画的 seg(t, a, b) 不跨过 cue 时刻（3.6 / 7.0 / 10.4 / 13.4），免得视频里卡在半截。 */
  function nowOf(t, clock) {
    return clock == null ? t : clock;
  }
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
  function chip(parent, x, y, w, str, color, opts) {
    var o = opts || {};
    var g = group(parent);
    rectBox(g, x, y, w, o.h || 28, color, o.fill || C_SURFACE, o.dash);
    g.appendChild(svgRich(x + w / 2, y + (o.h || 28) / 2 + 4, str, { size: o.size || 11, anchor: 'middle', w: w - 8, cls: o.cls || 'demo-x-ink2' }));
    return g;
  }
  function pathLine(parent, pts, color, width, dash) {
    var p = paint(svgEl('path', { d: pts.length ? polyPath(pts.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })) : 'M 0 0', fill: 'none', 'stroke-width': width || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }), null, color);
    if (dash) p.setAttribute('stroke-dasharray', dash);
    parent.appendChild(p);
    return p;
  }
  function setPath(p, pts) {
    p.setAttribute('d', pts.length ? polyPath(pts.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })) : 'M 0 0');
  }
  /* 按比例 u ∈ [0, 1] 把一条折线「画出来」 */
  function drawOn(path, u) {
    if (!path.lenCache) path.lenCache = path.getTotalLength ? path.getTotalLength() || 1 : 1;
    path.setAttribute('stroke-dasharray', path.lenCache + ' ' + path.lenCache);
    path.setAttribute('stroke-dashoffset', (path.lenCache * (1 - u)).toFixed(1));
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
  /* 横条：左端固定，宽度随动画长 */
  function hbar(parent, x, y, h, color, opacity) {
    var r = paint(svgEl('rect', { x: x, y: y, width: 0, height: h, rx: 2.5, opacity: opacity == null ? 0.9 : opacity }), color);
    parent.appendChild(r);
    return r;
  }
  function setW(node, w) {
    node.setAttribute('width', Math.max(0, w).toFixed(1));
  }
  /* 竖柱：底边固定在 yBase，高度随动画长 */
  function vbar(parent, x, yBase, w, color, opacity) {
    var r = paint(svgEl('rect', { x: x, y: yBase, width: w, height: 0, rx: 2.5, opacity: opacity == null ? 0.9 : opacity }), color);
    r.yBase = yBase;
    parent.appendChild(r);
    return r;
  }
  function setH(node, h) {
    node.setAttribute('y', (node.yBase - h).toFixed(1));
    node.setAttribute('height', Math.max(0, h).toFixed(1));
  }
  function strike(parent, x, y, w, h) {
    return hline(parent, x + 6, y + h - 6, x + w - 6, y + 6, C_BAD, 2.2);
  }
  function rot(v, th) {
    return [v[0] * Math.cos(th) - v[1] * Math.sin(th), v[0] * Math.sin(th) + v[1] * Math.cos(th)];
  }
  /* ToddlerBot 的渲染图（Robot_Description_Gallery 按官方 URDF toddlerbot_2xc 渲染，透明底），高 h 时宽 0.413h；
     机身浅蓝灰，背后垫一层光晕（同 Berkeley Humanoid 第 2 幕），深色主题下也看得清 */
  var TB_IMG = { file: 'toddlerbot.webp', aspect: 124 / 300 };
  var haloSeq = 0;
  function robotImg(parent, x, yBottom, h) {
    var w = h * TB_IMG.aspect, g = group(parent);
    var root = parent.ownerSVGElement || parent, defs = root.querySelector('defs');
    if (!defs) { defs = svgEl('defs', {}); root.insertBefore(defs, root.firstChild); }
    var id = 'tb-x-halo-' + (++haloSeq), halo = svgEl('radialGradient', { id: id });
    halo.appendChild(svgEl('stop', { offset: '0', 'stop-color': '#9fb4d6', 'stop-opacity': '0.45' }));
    halo.appendChild(svgEl('stop', { offset: '1', 'stop-color': '#9fb4d6', 'stop-opacity': '0' }));
    defs.appendChild(halo);
    g.appendChild(svgEl('ellipse', { cx: (x + w / 2).toFixed(1), cy: (yBottom - h * 0.5).toFixed(1), rx: (w * 0.85).toFixed(1), ry: (h * 0.58).toFixed(1), fill: 'url(#' + id + ')' }));
    g.appendChild(svgEl('image', { href: ROBOT_IMG_BASE + TB_IMG.file, x: x.toFixed(1), y: (yBottom - h).toFixed(1), width: w.toFixed(1), height: h.toFixed(1), preserveAspectRatio: 'xMidYMax meet' }));
    return { g: g, w: w, h: h };
  }

  /* 正视的 ToddlerBot 示意（火柴人式方块身体）：头、躯干、两条 3 段的手臂（肩—肘—腕）、两条 3 段的腿（髋—膝—踝）。
     S 是身高对应的像素数（0.56 m）。put(cx, cyTop, pose)：pose.armA / armB = [肩外展角 rad, 肘弯角 rad]，
     pose.crouch 0–1 让膝弯曲、身体下沉，pose.lean 躯干侧倾。返回各关节的像素坐标，第 2、5 幕用来标自由度和卡具。 */
  function tbFront(parent, color, S, opts) {
    var o = opts || {};
    var g = group(parent);
    var w = clamp(S / 55, 2, 5);
    function bone(k) {
      var ln = paint(svgEl('line', { 'stroke-width': (w * k).toFixed(2), 'stroke-linecap': 'round' }), null, color);
      g.appendChild(ln);
      return ln;
    }
    var legs = [[bone(1.5), bone(1.3)], [bone(1.5), bone(1.3)]];
    var torso = paint(svgEl('rect', { rx: (0.012 * S).toFixed(1), 'stroke-width': 1.6 }), o.fill || C_SURFACE, color);
    g.appendChild(torso);
    var head = paint(svgEl('rect', { rx: (0.02 * S).toFixed(1), 'stroke-width': 1.6 }), o.fill || C_SURFACE, color);
    g.appendChild(head);
    var eyes = [paint(svgEl('circle', { r: (0.012 * S).toFixed(1) }), color), paint(svgEl('circle', { r: (0.012 * S).toFixed(1) }), color)];
    eyes.forEach(function (e) { g.appendChild(e); });
    var arms = [[bone(1.3), bone(1.1)], [bone(1.3), bone(1.1)]];
    var joints = {};
    ['neck', 'waist', 'shL', 'shR', 'elL', 'elR', 'wrL', 'wrR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankL', 'ankR'].forEach(function (k) {
      var c = paint(svgEl('circle', { r: (w * 1.1).toFixed(1), 'stroke-width': 1.2 }), C_SURFACE, color);
      c.style.opacity = o.joints ? 1 : 0;
      g.appendChild(c);
      joints[k] = c;
    });
    var feet = [paint(svgEl('rect', { rx: 2 }), color), paint(svgEl('rect', { rx: 2 }), color)];
    feet.forEach(function (f) { g.appendChild(f); });
    var H = { head: 0.16 * S, headW: 0.14 * S, torso: 0.2 * S, torsoW: 0.2 * S, upperArm: 0.11 * S, foreArm: 0.1 * S, thigh: 0.1 * S, shin: 0.1 * S, footW: 0.07 * S, footH: 0.025 * S, hipHalf: 0.045 * S };
    function put(cx, cyTop, pose) {
      var p = pose || {};
      var crouch = p.crouch || 0, lean = p.lean || 0;
      var sink = crouch * 0.06 * S;
      var headY = cyTop + sink;
      head.setAttribute('x', (cx - H.headW / 2).toFixed(1)); head.setAttribute('y', headY.toFixed(1));
      head.setAttribute('width', H.headW.toFixed(1)); head.setAttribute('height', H.head.toFixed(1));
      eyes[0].setAttribute('cx', (cx - 0.03 * S).toFixed(1)); eyes[0].setAttribute('cy', (headY + 0.06 * S).toFixed(1));
      eyes[1].setAttribute('cx', (cx + 0.03 * S).toFixed(1)); eyes[1].setAttribute('cy', (headY + 0.06 * S).toFixed(1));
      var neckY = headY + H.head + 0.015 * S;
      var tx = cx + lean * 0.1 * S;
      torso.setAttribute('x', (tx - H.torsoW / 2).toFixed(1)); torso.setAttribute('y', neckY.toFixed(1));
      torso.setAttribute('width', H.torsoW.toFixed(1)); torso.setAttribute('height', H.torso.toFixed(1));
      moveDot(joints.neck, [cx, neckY]);
      var waistY = neckY + H.torso;
      moveDot(joints.waist, [tx, waistY]);
      var out = { neck: [cx, neckY], waist: [tx, waistY] };
      [0, 1].forEach(function (k) {
        var side = k ? 1 : -1, ap = k ? (p.armB || [0.15, 0.2]) : (p.armA || [0.15, 0.2]);
        var sh = [tx + side * H.torsoW / 2, neckY + 0.03 * S];
        var el1 = [sh[0] + side * H.upperArm * Math.sin(ap[0]), sh[1] + H.upperArm * Math.cos(ap[0])];
        var wr = [el1[0] + side * H.foreArm * Math.sin(ap[0] - ap[1]), el1[1] + H.foreArm * Math.cos(ap[0] - ap[1])];
        setLine(arms[k][0], sh[0], sh[1], el1[0], el1[1]);
        setLine(arms[k][1], el1[0], el1[1], wr[0], wr[1]);
        moveDot(joints[k ? 'shR' : 'shL'], sh); moveDot(joints[k ? 'elR' : 'elL'], el1); moveDot(joints[k ? 'wrR' : 'wrL'], wr);
        out[k ? 'shR' : 'shL'] = sh; out[k ? 'elR' : 'elL'] = el1; out[k ? 'wrR' : 'wrL'] = wr;
        var hip = [tx + side * H.hipHalf, waistY + 0.02 * S];
        var bend = crouch * 0.9, spread = p.spread == null ? 0.05 : p.spread;
        var knee = [hip[0] + side * H.thigh * Math.sin(bend + spread) - side * 0.5 * H.thigh * Math.sin(bend) * 0, hip[1] + H.thigh * Math.cos(bend)];
        var ank = [knee[0] + side * H.shin * Math.sin(spread - bend * 0.4), knee[1] + H.shin * Math.cos(bend)];
        setLine(legs[k][0], hip[0], hip[1], knee[0], knee[1]);
        setLine(legs[k][1], knee[0], knee[1], ank[0], ank[1]);
        moveDot(joints[k ? 'hipR' : 'hipL'], hip); moveDot(joints[k ? 'kneeR' : 'kneeL'], knee); moveDot(joints[k ? 'ankR' : 'ankL'], ank);
        feet[k].setAttribute('x', (ank[0] - H.footW / 2).toFixed(1)); feet[k].setAttribute('y', ank[1].toFixed(1));
        feet[k].setAttribute('width', H.footW.toFixed(1)); feet[k].setAttribute('height', H.footH.toFixed(1));
        out[k ? 'hipR' : 'hipL'] = hip; out[k ? 'kneeR' : 'kneeL'] = knee; out[k ? 'ankR' : 'ankL'] = ank;
      });
      return out;
    }
    return { g: g, put: put, joints: joints, torso: torso };
  }

  /* 侧视的 ToddlerBot 示意（面朝 +x）：方盒躯干 + 头，一条手臂（肩—肘—手），两条腿（髋—膝—踝—脚）。
     第 8 幕看质心、第 9 幕做俯卧撑、第 11 幕抱箱子用。S 是身高对应的像素数。 */
  function tbSide(parent, color, S) {
    var g = group(parent);
    var w = clamp(S / 55, 2, 5);
    function bone(k, dim) {
      var ln = paint(svgEl('line', { 'stroke-width': (w * k).toFixed(2), 'stroke-linecap': 'round' }), null, color);
      if (dim) ln.style.opacity = 0.45;
      g.appendChild(ln);
      return ln;
    }
    var farLeg = [bone(1.5, true), bone(1.3, true)], farFoot = paint(svgEl('path', { 'stroke-width': 1.2, 'stroke-linejoin': 'round' }), color, color);
    farFoot.style.opacity = 0.45; g.appendChild(farFoot);
    var body = svgEl('g', {}); g.appendChild(body);
    var TW = 0.14 * S, TH = 0.2 * S;
    var box = paint(svgEl('rect', { x: (-TW / 2).toFixed(1), y: (-TH).toFixed(1), width: TW.toFixed(1), height: TH.toFixed(1), rx: (0.012 * S).toFixed(1), 'stroke-width': 1.6 }), C_SURFACE, color);
    body.appendChild(box);
    var head = paint(svgEl('rect', { x: (-0.07 * S).toFixed(1), y: (-TH - 0.17 * S).toFixed(1), width: (0.15 * S).toFixed(1), height: (0.15 * S).toFixed(1), rx: (0.02 * S).toFixed(1), 'stroke-width': 1.6 }), C_SURFACE, color);
    body.appendChild(head);
    var eye = paint(svgEl('circle', { cx: (0.05 * S).toFixed(1), cy: (-TH - 0.11 * S).toFixed(1), r: (0.012 * S).toFixed(1) }), color);
    body.appendChild(eye);
    var imu = paint(svgEl('rect', { x: (-0.02 * S).toFixed(1), y: (-TH + 0.05 * S).toFixed(1), width: (0.04 * S).toFixed(1), height: (0.03 * S).toFixed(1), rx: 1.5 }), color);
    imu.style.opacity = 0.7; body.appendChild(imu);
    var arm = [bone(1.3), bone(1.1)], hand = paint(svgEl('circle', { r: (w * 1.3).toFixed(1) }), color);
    g.appendChild(hand);
    var nearLeg = [bone(1.5), bone(1.3)], nearFoot = paint(svgEl('path', { 'stroke-width': 1.2, 'stroke-linejoin': 'round' }), color, color);
    g.appendChild(nearFoot);
    var hipDot = paint(svgEl('circle', { r: (w * 1.4).toFixed(1), 'stroke-width': 1.3 }), C_SURFACE, color);
    g.appendChild(hipDot);
    var L1 = 0.18 * S, L2 = 0.2 * S, UA = 0.11 * S, FA = 0.1 * S, FOOT = [0.03 * S, 0.06 * S];
    function leg(parts, foot, H, A) {
      var dx = A[0] - H[0], dy = A[1] - H[1];
      var d = clamp(Math.hypot(dx, dy), 0.05 * S, L1 + L2 - 0.5);
      var base = Math.atan2(dy, dx);
      var bend = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      var a = base - bend;
      var Kn = [H[0] + L1 * Math.cos(a), H[1] + L1 * Math.sin(a)];
      setLine(parts[0], H[0], H[1], Kn[0], Kn[1]);
      setLine(parts[1], Kn[0], Kn[1], A[0], A[1]);
      foot.setAttribute('d', 'M ' + A[0].toFixed(1) + ' ' + A[1].toFixed(1) + ' L ' + (A[0] - FOOT[0]).toFixed(1) + ' ' + (A[1] + 0.02 * S).toFixed(1) + ' L ' + (A[0] + FOOT[1]).toFixed(1) + ' ' + (A[1] + 0.02 * S).toFixed(1) + ' Z');
      return Kn;
    }
    /* put(hx, hy, pitch, feet, armAng)：髋在 (hx, hy)，躯干俯仰 pitch（前倾为正），feet = [[x, y], [x, y]] 是两只踝的位置，
       armAng = [肩前举角, 肘弯角]（0 = 垂下）。返回肩、手、膝的坐标。 */
    function put(hx, hy, pitch, feet, armAng) {
      body.setAttribute('transform', 'translate(' + hx.toFixed(1) + ' ' + hy.toFixed(1) + ') rotate(' + ((pitch * 180) / Math.PI).toFixed(2) + ')');
      moveDot(hipDot, [hx, hy]);
      var kf = leg(farLeg, farFoot, [hx - 0.01 * S, hy], feet[1]);
      var kn = leg(nearLeg, nearFoot, [hx, hy], feet[0]);
      var sh = [hx + (TH - 0.03 * S) * Math.sin(pitch), hy - (TH - 0.03 * S) * Math.cos(pitch)];
      var aa = armAng || [0, 0];
      var elb = [sh[0] + UA * Math.sin(aa[0] + pitch), sh[1] + UA * Math.cos(aa[0] + pitch)];
      var hd = [elb[0] + FA * Math.sin(aa[0] + aa[1] + pitch), elb[1] + FA * Math.cos(aa[0] + aa[1] + pitch)];
      setLine(arm[0], sh[0], sh[1], elb[0], elb[1]);
      setLine(arm[1], elb[0], elb[1], hd[0], hd[1]);
      moveDot(hand, hd);
      return { shoulder: sh, hand: hd, elbow: elb, knee: kn, kneeFar: kf };
    }
    return { g: g, put: put, box: box, imu: imu, head: head };
  }

  /* ── scene 1: 为什么要 ML 兼容的平台 ── */
  function buildSceneWhy() {
    var s = sceneSvg('左边把传统机器人设计的三条优先级划掉，换成研究要的三条；中间是 ToddlerBot 的渲染图；右边两个数据盒子（仿真、真机）不断把数据送进策略；底下是表 1 里几台小型人形的主动自由度，ToddlerBot 的 30 最高');
    s.appendChild(svgText(30, 28, '研究要的平台和工业要的不一样：还得能在两个世界采数据', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 232, 190, C_BORDER, C_SURFACE2);
    left.appendChild(svgText(44, 64, '传统设计优先（第 1 节）', 'demo-x-ink2', 11.5));
    var oldChips = ['执行器强度', '传感器精度', '机械精度'].map(function (str, k) { return chip(left, 44, 74 + k * 30, 204, str, C_MUTED, { size: 10.5, h: 24 }); });
    var strikes = oldChips.map(function (c, k) { return strike(left, 44, 74 + k * 30, 204, 24); });
    var needT = paint(svgText(44, 176, '研究要的', null, 11.5), C_GOOD);
    left.appendChild(needT);
    var needChips = ['便宜', '快速可修', '全栈透明'].map(function (str, k) { return chip(left, 44 + k * 69, 186, 64, str, C_GOOD, { size: 10.5, h: 26 }); });
    var mid = group(s);
    var img = robotImg(mid, 300, 226, 180);
    var midT = group(mid);
    midT.appendChild(svgText(337, 240, '0.56 m · 3.4 kg · 30 个主动自由度', 'demo-x-ink2', 10.5, 'middle'));
    midT.appendChild(svgText(337, 256, '全 3D 打印 + Dynamixel，不到 6000 美元', 'demo-x-mut', 10, 'middle'));
    /* 右：两边采数据 */
    var right = group(s);
    rectBox(right, 452, 44, 318, 190, C_GOOD, C_SURFACE);
    right.appendChild(paint(svgText(466, 64, 'ML 兼容 = 仿真和真机两边都能采数据', null, 11.5), C_GOOD));
    var simBox = chip(right, 466, 80, 130, '仿真数据：数字孪生', C_SIM, { size: 10.5, h: 30 });
    var realBox = chip(right, 466, 160, 130, '真机数据：遥操作', C_REAL, { size: 10.5, h: 30 });
    var polBox = chip(right, 650, 118, 106, '策略', C_GOOD, { size: 12, h: 36 });
    var simPath = pathLine(right, [[596, 95], [640, 95], [650, 136]], C_SIM, 1.4, '3 3');
    var realPath = pathLine(right, [[596, 175], [640, 175], [650, 136]], C_REAL, 1.4, '3 3');
    var tokens = [0, 1, 2].map(function () { return [dotAt(right, 0, 0, 3.2, C_SIM), dotAt(right, 0, 0, 3.2, C_REAL)]; });
    var simPts = [[596, 95], [640, 95], [650, 136]], realPts = [[596, 175], [640, 175], [650, 136]];
    right.appendChild(svgText(466, 222, '补充：行走靠大规模仿真，操作靠真机示范（第 2 节）', 'demo-x-mut', 9.5));
    /* 底：表 1 的小人形 */
    var bot = group(s);
    rectBox(bot, 30, 250, 740, 154, C_BORDER, C_SURFACE2);
    bot.appendChild(svgText(44, 270, '表 1：小型人形的主动自由度（人体主要动作约 32 个旋转关节）', 'demo-x-ink2', 11.5));
    var small = [['Zeroth', 16, 1.4], ['BRUCE', 16, 6.5], ['Robotis OP3', 20, 11], ['NAO H25', 23, 14], ['Berkeley Lite', 22, 5], ['ToddlerBot', 30, 6]];
    var BY = 372, BS = 3.1;
    var bars = small.map(function (r, k) {
      var x = 70 + k * 112, isT = r[0] === 'ToddlerBot';
      var b = vbar(bot, x, BY, 44, isT ? C_GOOD : C_MUTED, isT ? 0.95 : 0.6);
      var v = svgText(x + 22, 0, String(r[1]), isT ? 'demo-x-good' : 'demo-x-ink2', 11, 'middle');
      bot.appendChild(v);
      bot.appendChild(svgText(x + 22, BY + 14, r[0], 'demo-x-mut', 9.5, 'middle'));
      bot.appendChild(svgText(x + 22, BY + 27, r[2] + 'K 美元', 'demo-x-mut', 9, 'middle'));
      return { b: b, v: v, h: r[1] * BS };
    });
    hline(bot, 60, BY - 32 * BS, 760, BY - 32 * BS, C_BAD, 1, '4 3');
    bot.appendChild(paint(svgText(756, BY - 32 * BS - 4, '人 32', null, 9.5, 'end'), C_BAD));
    var contrib = group(bot);
    contrib.appendChild(svgRich(44, 294, '三条贡献：① 第一台 30 自由度的小型人形　② 完整的 sysID 流水线　③ 全身遥操作采数据', { size: 10.5, w: 700, cls: 'demo-x-good' }));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.7));
      oldChips.forEach(function (c, k) { setOpacity(c, seg(t, 0.5 + k * 0.4, 0.9 + k * 0.4)); });
      strikes.forEach(function (c, k) { setOpacity(c, seg(t, 1.9 + k * 0.3, 2.2 + k * 0.3)); });
      setOpacity(needT, seg(t, 2.6, 3.0));
      needChips.forEach(function (c, k) { setOpacity(c, seg(t, 2.8 + k * 0.25, 3.2 + k * 0.25)); });
      setOpacity(mid, seg(t, 0.4, 1.0));
      setOpacity(midT, seg(t, 7.0, 7.6));
      setOpacity(right, seg(t, 3.6, 4.1));
      setOpacity(simBox, seg(t, 3.9, 4.4)); setOpacity(realBox, seg(t, 4.4, 4.9)); setOpacity(polBox, seg(t, 4.9, 5.4));
      tokens.forEach(function (pair, k) {
        var u = ((now * 0.45 + k / 3) % 1 + 1) % 1;
        var ps = K.pointOn(simPts, u), pr = K.pointOn(realPts, u);
        moveDot(pair[0], ps); moveDot(pair[1], pr);
        setOpacity(pair[0], t >= 4.9 ? 1 : 0); setOpacity(pair[1], t >= 4.9 ? 1 : 0);
      });
      setOpacity(bot, seg(t, 10.4, 10.9));
      bars.forEach(function (b, k) {
        var h = b.h * ease(seg(t, 10.7 + k * 0.3, 11.3 + k * 0.3));
        setH(b.b, h);
        b.v.setAttribute('y', (BY - h - 5).toFixed(1));
        setOpacity(b.v, seg(t, 11.2 + k * 0.3, 11.5 + k * 0.3));
      });
      setOpacity(contrib, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 30 个自由度与三种传动 ── */
  function buildSceneDof() {
    var s = sceneSvg('左边是正视的 ToddlerBot 示意，关节一个个亮起来并计数：每臂 7、每腿 6、颈 2、腰 2，合计 30；右边三个小机构在动：一对直齿轮反向旋转、两个同向电机经锥齿轮驱动腰的偏航与横滚、一个平行四连杆带着膝摆动；底下写 MuJoCo 里各用什么约束建模');
    s.appendChild(svgText(30, 28, '30 个主动自由度：7 + 7 + 6 + 6 + 2 + 2，三种传动把电机塞进小身体', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 250, 360, C_BORDER, C_SURFACE2);
    var S = 300;
    var fig = tbFront(left, C_INK2, S, { joints: true });
    var pts = fig.put(155, 64, { armA: [0.35, 0.3], armB: [0.35, 0.3] });
    Object.keys(fig.joints).forEach(function (k) { fig.joints[k].style.opacity = 0; });
    var groups = [
      { keys: ['shL', 'elL', 'wrL', 'shR', 'elR', 'wrR'], n: 14, label: '手臂 7 × 2', color: C_ACCENT, at: 0.6 },
      { keys: ['hipL', 'kneeL', 'ankL', 'hipR', 'kneeR', 'ankR'], n: 12, label: '腿 6 × 2', color: C_GOOD, at: 3.9 },
      { keys: ['neck'], n: 2, label: '颈 2', color: C_WARN, at: 5.4 },
      { keys: ['waist'], n: 2, label: '腰 2', color: C_WARN, at: 6.0 }
    ];
    var counter = paint(svgText(155, 392, '', null, 14, 'middle'), C_GOOD);
    left.appendChild(counter);
    var tags = [
      [pts.shL[0] - 60, pts.elL[1], '肩 3 · 肘 2 · 腕 2', C_ACCENT], [pts.hipL[0] - 60, pts.kneeL[1] + 4, '髋 3 · 膝 1 · 踝 2', C_GOOD],
      [pts.neck[0] + 30, pts.neck[1] - 8, '颈：俯仰 + 偏航', C_WARN], [pts.waist[0] + 36, pts.waist[1] + 4, '腰：偏航 + 横滚', C_WARN]
    ].map(function (r) { var n = paint(svgText(r[0], r[1], r[2], null, 9.5, r[0] < 155 ? 'end' : 'start'), r[3]); left.appendChild(n); return n; });
    /* 右：三种传动 */
    var right = group(s);
    rectBox(right, 296, 44, 474, 360, C_BORDER, C_SURFACE);
    right.appendChild(svgText(310, 64, '三种传动（附录 8.4、图 7）', 'demo-x-ink2', 11.5));
    function gear(parent, cx, cy, r, color, teeth) {
      var g = group(parent), d = '';
      for (var i = 0; i < teeth; i++) {
        var a0 = (i / teeth) * 2 * Math.PI, a1 = ((i + 0.5) / teeth) * 2 * Math.PI, a2 = ((i + 1) / teeth) * 2 * Math.PI;
        d += (i ? ' L ' : 'M ') + (cx + r * Math.cos(a0)).toFixed(1) + ' ' + (cy + r * Math.sin(a0)).toFixed(1) +
          ' L ' + (cx + (r + 5) * Math.cos(a0 + 0.1)).toFixed(1) + ' ' + (cy + (r + 5) * Math.sin(a0 + 0.1)).toFixed(1) +
          ' L ' + (cx + (r + 5) * Math.cos(a1 - 0.1)).toFixed(1) + ' ' + (cy + (r + 5) * Math.sin(a1 - 0.1)).toFixed(1) +
          ' L ' + (cx + r * Math.cos(a1)).toFixed(1) + ' ' + (cy + r * Math.sin(a1)).toFixed(1) +
          ' L ' + (cx + r * Math.cos(a2)).toFixed(1) + ' ' + (cy + r * Math.sin(a2)).toFixed(1);
      }
      g.appendChild(paint(svgEl('path', { d: d + ' Z', 'stroke-width': 1.3 }), C_SURFACE2, color));
      g.appendChild(paint(svgEl('circle', { cx: cx, cy: cy, r: 3 }), color));
      return { g: g, cx: cx, cy: cy };
    }
    var spurG = group(right);
    spurG.appendChild(paint(svgText(310, 92, '① 直齿轮（手臂、夹爪、髋偏航）', null, 11), C_ACCENT));
    var g1 = gear(spurG, 350, 140, 22, C_ACCENT, 10), g2 = gear(spurG, 404, 140, 22, C_ACCENT, 10);
    spurG.appendChild(svgText(440, 126, '1:1 挪关节轴；变比放大力矩；', 'demo-x-ink2', 10));
    spurG.appendChild(svgText(440, 142, '副轴配轴承分担载荷，电机不受横向力', 'demo-x-ink2', 10));
    spurG.appendChild(svgText(440, 158, '（XC330 的输出轴只有特氟龙衬套）', 'demo-x-mut', 9.5));
    var bevG = group(right);
    bevG.appendChild(paint(svgText(310, 200, '② 耦合锥齿轮（腰）', null, 11), C_WARN));
    var m1 = chip(bevG, 320, 212, 54, '电机 1', C_WARN, { size: 9.5, h: 22 }), m2 = chip(bevG, 320, 240, 54, '电机 2', C_WARN, { size: 9.5, h: 22 });
    var bevArrow1 = pathLine(bevG, [[374, 223], [410, 223], [430, 237]], C_WARN, 1.6), bevArrow2 = pathLine(bevG, [[374, 251], [410, 251], [430, 237]], C_WARN, 1.6);
    var waistRot = group(bevG);
    var waistBox = paint(svgEl('rect', { x: -14, y: -14, width: 28, height: 28, rx: 4, 'stroke-width': 1.4 }), C_SURFACE2, C_WARN);
    waistRot.appendChild(waistBox);
    bevG.appendChild(svgText(470, 222, '两个同向电机 → 偏航 + 横滚', 'demo-x-ink2', 10));
    bevG.appendChild(svgText(470, 238, '每个轴上两个电机合力：一个 XC330 带不动', 'demo-x-ink2', 10));
    bevG.appendChild(svgText(470, 254, '上半身，两个合起来够', 'demo-x-ink2', 10));
    var linkG = group(right);
    linkG.appendChild(paint(svgText(310, 290, '③ 平行连杆（膝、颈俯仰）', null, 11), C_GOOD));
    var l1 = hline(linkG, 0, 0, 0, 0, C_GOOD, 2.2), l2 = hline(linkG, 0, 0, 0, 0, C_GOOD, 2.2), l3 = hline(linkG, 0, 0, 0, 0, C_GOOD, 2.2), l4 = hline(linkG, 0, 0, 0, 0, C_MUTED, 1.4, '3 3');
    var motorDot = dotAt(linkG, 340, 310, 5, C_GOOD);
    linkG.appendChild(svgText(470, 310, '电机离开关节轴：膝电机放高，减小转动惯量', 'demo-x-ink2', 10));
    linkG.appendChild(svgText(470, 326, '颈的电机放进头里；活动范围略小（< 160°）', 'demo-x-ink2', 10));
    var muj = group(right);
    muj.appendChild(svgRich(310, 372, 'MuJoCo 里：直齿轮 → 关节等式约束　锥齿轮 → 固定肌腱　平行连杆 → 焊接约束', { size: 10.5, w: 450, cls: 'demo-x-good' }));
    muj.appendChild(svgText(310, 392, '经验上 sim-to-real 差距小（第 5 节的实验）；代码 2.0 的膝去掉了平行连杆', 'demo-x-mut', 9.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.7));
      var total = 0;
      groups.forEach(function (gr, gi) {
        gr.keys.forEach(function (k, j) {
          var on = seg(t, gr.at + j * 0.12, gr.at + 0.25 + j * 0.12);
          fig.joints[k].style.opacity = on;
          fig.joints[k].setAttribute('stroke', on > 0.5 ? gr.color : C_INK2);
        });
        var u = seg(t, gr.at, gr.at + 0.25 + (gr.keys.length - 1) * 0.12);
        total += Math.round(gr.n * u);
        setOpacity(tags[gi], seg(t, gr.at + 0.6, gr.at + 1.0));
      });
      counter.textContent = total ? '主动自由度 ' + total + (total >= 30 ? ' = 30' : '') : '';
      setOpacity(right, seg(t, 7.0, 7.5));
      setOpacity(spurG, seg(t, 7.0, 7.5));
      var ang = now * 60;
      g1.g.setAttribute('transform', 'rotate(' + ang.toFixed(1) + ' ' + g1.cx + ' ' + g1.cy + ')');
      g2.g.setAttribute('transform', 'rotate(' + (-ang + 18).toFixed(1) + ' ' + g2.cx + ' ' + g2.cy + ')');
      setOpacity(bevG, seg(t, 10.4, 10.9));
      var wy = 0.35 * Math.sin(now * 1.6), wr = 0.25 * Math.sin(now * 1.1);
      waistRot.setAttribute('transform', 'translate(446 237) rotate(' + ((wy * 180) / Math.PI).toFixed(1) + ') skewX(' + ((wr * 90) / Math.PI).toFixed(1) + ')');
      bevArrow1.setAttribute('stroke-width', (1.6 + 0.8 * Math.max(0, Math.sin(now * 1.6))).toFixed(2));
      bevArrow2.setAttribute('stroke-width', (1.6 + 0.8 * Math.max(0, Math.sin(now * 1.1))).toFixed(2));
      setOpacity(linkG, seg(t, 13.4, 13.9));
      /* 四连杆：电机曲柄在 (340, 310)，输出摇杆在 (400, 310)，连杆平行 */
      var th = 0.6 * Math.sin(now * 1.4) + 0.3;
      var A = [340 + 22 * Math.cos(th), 310 + 22 * Math.sin(th)], B = [400 + 22 * Math.cos(th), 310 + 22 * Math.sin(th)];
      setLine(l1, 340, 310, A[0], A[1]); setLine(l2, A[0], A[1], B[0], B[1]); setLine(l3, 400, 310, B[0], B[1]); setLine(l4, 340, 310, 400, 310);
      var shin = [B[0] + 48 * Math.cos(th + 1.2), B[1] + 48 * Math.sin(th + 1.2)];
      setLine(l3, 400, 310, shin[0], shin[1]);
      setLine(l2, A[0], A[1], B[0], B[1]);
      setOpacity(muj, seg(t, 14.4, 15.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 可复现是硬约束 ── */
  function buildSceneRepro() {
    var s = sceneSvg('左边两根悬臂梁，长的和短的受同样的载荷，短的相对挠度小得多，解释为什么小零件可以 3D 打印；右上是 6000 美元的物料清单条，九成是电机和电脑；右下是表 1 里几台小人形的价格柱；底下是「只用现成电机与轴承」「2 兆波特、50 赫兹、背隙 0.25 度」几条');
    s.appendChild(svgText(30, 28, '可复现是硬约束：一个人在家、没有专用设备也能把它造出来', 'demo-x-ink2', 13.5));
    var def = group(s);
    rectBox(def, 30, 44, 740, 40, C_GOOD, C_SURFACE);
    def.appendChild(svgRich(400, 70, '定义：**一个人**在家、不用专用设备就能复刻整套系统 —— 全 3D 打印 + 现成 Dynamixel + 买得到的板子', { size: 11.5, anchor: 'middle', w: 720, cls: 'demo-x-good' }));
    /* 左：梁 */
    var beam = group(s);
    rectBox(beam, 30, 98, 360, 190, C_BORDER, C_SURFACE2);
    beam.appendChild(svgText(44, 118, '为什么小零件敢 3D 打印（附录 8.1）', 'demo-x-ink2', 11));
    var wallL = hline(beam, 60, 130, 60, 200, C_MUTED, 3), wallS = hline(beam, 60, 214, 60, 262, C_MUTED, 3);
    var longBeam = pathLine(beam, [], C_SIM, 4), shortBeam = pathLine(beam, [], C_GOOD, 4);
    var loadL = pathLine(beam, [], C_BAD, 1.6), loadS = pathLine(beam, [], C_BAD, 1.6);
    beam.appendChild(svgText(62, 146, '长 L（铝）', 'demo-x-mut', 9.5));
    beam.appendChild(svgText(62, 228, '短 L / 3（打印）', 'demo-x-mut', 9.5));
    var beamF = group(beam);
    beamF.appendChild(svgMath(300, 250, '\\frac{\\delta}{L}\\propto\\frac{P}{3EL^{2}}', { size: 13, anchor: 'middle' }));
    beamF.appendChild(svgText(300, 274, '同样的载荷 P，L 小三倍，相对挠度小九倍', 'demo-x-ink2', 9.5, 'middle'));
    beamF.appendChild(svgText(300, 230, '小尺寸的打印件（E 小）和全尺寸的铝件强度相当', 'demo-x-good', 9.5, 'middle'));
    /* 右上：BOM */
    var bom = group(s);
    rectBox(bom, 406, 98, 364, 86, C_BORDER, C_SURFACE2);
    bom.appendChild(svgText(420, 118, 'BOM 不到 6000 美元（第 3.1 节）', 'demo-x-ink2', 11));
    var bomBar = hbar(bom, 420, 130, 22, C_MUTED, 0.5), bomCore = hbar(bom, 420, 130, 22, C_WARN, 0.9);
    var bomT = svgText(420, 170, '九成是电机（Dynamixel）和电脑（Jetson Orin NX）', 'demo-x-ink2', 10);
    bom.appendChild(bomT);
    /* 右下：价格 */
    var price = group(s);
    rectBox(price, 406, 196, 364, 92, C_BORDER, C_SURFACE2);
    price.appendChild(svgText(420, 216, '表 1 的价格（千美元）与自由度', 'demo-x-ink2', 11));
    var pr = [['Zeroth', 1.4, 16], ['Lite', 5, 22], ['Toddler', 6, 30], ['BRUCE', 6.5, 16], ['Berkeley', 10, 12], ['OP3', 11, 20], ['NAO', 14, 23]];
    var PY = 270, PS = 2.6;
    var pbars = pr.map(function (r, k) {
      var x = 426 + k * 48, isT = r[0] === 'Toddler';
      var b = vbar(price, x, PY, 30, isT ? C_GOOD : C_MUTED, isT ? 0.95 : 0.55);
      var v = svgText(x + 15, 0, r[1] + 'K', isT ? 'demo-x-good' : 'demo-x-mut', 9, 'middle');
      price.appendChild(v);
      price.appendChild(svgText(x + 15, PY + 12, r[0] + ' · ' + r[2], 'demo-x-mut', 8.5, 'middle'));
      return { b: b, v: v, h: r[1] * PS };
    });
    /* 底：电机与通信 */
    var bot = group(s);
    rectBox(bot, 30, 300, 740, 104, C_BORDER, C_SURFACE);
    bot.appendChild(svgText(44, 320, '只选现成件（附录 8.6）：Dynamixel 可靠、好买、文档全；无刷直驱塞不进 30 自由度的身体', 'demo-x-ink2', 10.5));
    var comm = ['5 V TTL · 2 Mbaud', '30 个电机 · 50 Hz 全状态', '背隙约 0.25°', '编码器 4096 → 0.09°'].map(function (str, k) { return chip(bot, 44 + k * 182, 332, 172, str, C_ACCENT, { size: 10, h: 26 }); });
    var ease2 = group(bot);
    ease2.appendChild(svgText(44, 382, '装配与维护（附录 8.2）：螺丝种类少、螺丝刀入口畅通、模块化好换；两台样机测了一年多', 'demo-x-ink2', 10.5));
    ease2.appendChild(svgText(44, 398, '代码 2.0：预涂螺纹胶的紧固件、MakerWorld 的打印参数、8 口通信板；一周内可复刻', 'demo-x-mut', 9.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(def, seg(t, 0.2, 0.7));
      setOpacity(beam, seg(t, 3.6, 4.1));
      var P = 0.5 + 0.5 * Math.sin(now * 1.3);
      var u = seg(t, 3.9, 5.0);
      var dL = 36 * P * u, dS = 4 * P * u;
      var lp = [], sp = [];
      for (var i = 0; i <= 20; i++) { var x = i / 20; lp.push([60 + 300 * x, 165 + dL * x * x]); sp.push([60 + 100 * x, 238 + dS * x * x]); }
      setPath(longBeam, lp); setPath(shortBeam, sp);
      setPath(loadL, [[360, 165 + dL - 26], [360, 165 + dL - 6]]); setPath(loadS, [[160, 238 + dS - 26], [160, 238 + dS - 6]]);
      setOpacity(beamF, seg(t, 5.2, 5.8));
      setOpacity(bot, seg(t, 7.0, 7.5));
      comm.forEach(function (c, k) { setOpacity(c, seg(t, 7.4 + k * 0.5, 7.8 + k * 0.5)); });
      setOpacity(bom, seg(t, 10.4, 10.9));
      setW(bomBar, 336 * ease(seg(t, 10.6, 11.4)));
      setW(bomCore, 336 * 0.9 * ease(seg(t, 11.2, 12.0)));
      setOpacity(bomT, seg(t, 11.8, 12.2));
      setOpacity(price, seg(t, 12.2, 12.6));
      pbars.forEach(function (b, k) {
        var h = b.h * ease(seg(t, 12.4 + k * 0.12, 12.9 + k * 0.12));
        setH(b.b, h);
        b.v.setAttribute('y', (PY - h - 4).toFixed(1));
        setOpacity(b.v, seg(t, 12.8 + k * 0.12, 13.1 + k * 0.12));
      });
      setOpacity(ease2, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 功率因子与电机选型 ── */
  function buildScenePower() {
    var s = sceneSvg('左边是功率因子的公式和图 8 的柱状图：十三台人形的 p̃ 一根根升起，红色虚线是人的 2.22，ToddlerBot 的 2.74 最接近人；右边是式 5 把人的关节力矩按身高体重换算给机器人：膝 2.35、踝 2.66、髋 1.77，和表 2 五款电机的堵转力矩比，只有 XM430 够膝和踝');
    s.appendChild(svgText(30, 28, '怎样公平地比大小不同的人形：功率因子 p̃，和按身高体重选电机', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 450, 360, C_BORDER, C_SURFACE2);
    var fair = group(left);
    fair.appendChild(svgText(44, 64, '1.8 m 和 0.5 m 的人形都跳 0.5 m 不公平 → 跳身高的 10%、跑每秒两个身长', 'demo-x-ink2', 10.5));
    fair.appendChild(svgText(44, 80, '同一串归一化动作，用掉各自电机最大功率的同一比例 = 性能相同（式 3）', 'demo-x-mut', 9.5));
    var formula = group(left);
    formula.appendChild(svgMath(140, 118, '\\tilde p=\\frac{\\sum_i|\\tau_i^{\\max}|}{h\\,m\\,g}', { size: 15, anchor: 'middle' }));
    formula.appendChild(svgText(236, 108, '全部电机最大力矩之和', 'demo-x-ink2', 10));
    formula.appendChild(svgText(236, 124, '除以身高 × 体重 × g（式 4）', 'demo-x-ink2', 10));
    formula.appendChild(svgText(236, 140, '不除以自由度数：1 个和 100 个同样的自由度不该得同分', 'demo-x-mut', 9));
    var chart = group(left);
    var CY = 370, CS = 42, CX0 = 56, CW = 30;
    hline(chart, 44, CY, 470, CY, C_BORDER, 1.2);
    var cbars = POWER.map(function (r, k) {
      var x = CX0 + k * 32, isT = r[0] === 'ToddlerBot', isH = r[0] === 'Human';
      var b = vbar(chart, x, CY, CW - 6, isT ? C_GOOD : isH ? C_BAD : C_ACCENT, isT ? 0.95 : isH ? 0.5 : 0.7);
      var v = svgText(x + (CW - 6) / 2, 0, fmt(r[1], 2), isT ? 'demo-x-good' : 'demo-x-ink2', 8.5, 'middle');
      chart.appendChild(v);
      var lab = svgText(0, 0, r[0], isT ? 'demo-x-good' : 'demo-x-mut', 8.5, 'end');
      lab.setAttribute('transform', 'translate(' + (x + 14) + ' ' + (CY + 6) + ') rotate(-55)');
      chart.appendChild(lab);
      return { b: b, v: v, h: r[1] * CS };
    });
    var human = hline(chart, 44, CY - P_HUMAN * CS, 470, CY - P_HUMAN * CS, C_BAD, 1.2, '5 4');
    var humanT = paint(svgText(466, CY - P_HUMAN * CS - 4, '人 2.22：至少要超过它，远超也有害', null, 9.5, 'end'), C_BAD);
    chart.appendChild(humanT);
    var tbT = paint(svgText(44, 170, 'ToddlerBot 2.74 = 1.40（上半身）+ 1.35（下半身），最接近人', null, 10.5), C_GOOD);
    chart.appendChild(tbT);
    /* 右：式 5 与表 2 */
    var right = group(s);
    rectBox(right, 496, 44, 274, 360, C_BORDER, C_SURFACE);
    right.appendChild(svgText(510, 64, '需要多大力矩（式 5，附录 8.6）', 'demo-x-ink2', 11));
    var eq5 = group(right);
    eq5.appendChild(svgMath(633, 100, '\\tau_{\\text{robot}}=\\frac{h_{r}\\,m_{r}}{h_{h}\\,m_{h}}\\,\\tau_{\\text{human}}', { size: 12, anchor: 'middle' }));
    eq5.appendChild(svgText(510, 124, '0.5 m、3.1 kg（30 × 50 g + 600 + 1000 g）', 'demo-x-mut', 9.5));
    var REQ = [['膝', TORQUE_REQ.knee], ['踝俯仰', TORQUE_REQ.ankle], ['髋俯仰', TORQUE_REQ.hip]];
    var RY = 150, RS = 46;
    var reqBars = REQ.map(function (r, k) {
      var y = RY + k * 26;
      right.appendChild(svgText(560, y + 12, r[0], 'demo-x-ink2', 10, 'end'));
      var b = hbar(right, 568, y + 2, 16, C_BAD, 0.8);
      var v = svgText(0, y + 13, fmt(r[1], 2), 'demo-x-ink2', 9.5);
      right.appendChild(v);
      return { b: b, v: v, w: r[1] * RS, y: y };
    });
    var tbl = group(right);
    tbl.appendChild(svgText(510, 248, '表 2：12 V 堵转力矩与分工', 'demo-x-ink2', 11));
    var mrows = [['XM430', 3.0, '膝、踝俯仰', C_GOOD], ['XC430', 1.9, '肩俯仰、踝横滚', C_ACCENT], ['2XC430', 1.8, '髋横滚 / 俯仰', C_ACCENT], ['2XL430', 1.5, '肩 / 肘 / 腕（双轴）', C_ACCENT], ['XC330', 1.0, '颈、腰、髋偏航、夹爪', C_MUTED]].map(function (r, k) {
      var y = 262 + k * 27, g = group(tbl);
      g.appendChild(paint(svgText(510, y + 12, r[0], null, 10), r[3]));
      var b = hbar(g, 560, y + 2, 15, r[3], 0.8);
      g.appendChild(svgText(0, y + 13, '', 'demo-x-mut', 9));
      g.appendChild(svgText(700, y + 12, r[2], 'demo-x-mut', 8.5, 'middle'));
      return { g: g, b: b, w: r[1] * RS, v: g.childNodes[2], val: r[1], y: y };
    });
    var reqLine = hline(tbl, 568 + TORQUE_REQ.ankle * RS, 258, 568 + TORQUE_REQ.ankle * RS, 398, C_BAD, 1, '3 3');
    var only = paint(svgText(510, 400, 'XM430 是唯一够膝（2.35）和踝（2.66）的；髋用 2XC430 只多 1.7%', null, 9.5), C_GOOD);
    tbl.appendChild(only);

    function draw(t, clock) {
      setOpacity(left, seg(t, 0.2, 0.7));
      setOpacity(fair, seg(t, 0.3, 0.8));
      setOpacity(formula, seg(t, 3.6, 4.1));
      setOpacity(chart, seg(t, 7.0, 7.4));
      cbars.forEach(function (b, k) {
        var h = b.h * ease(seg(t, 7.2 + k * 0.15, 7.8 + k * 0.15));
        setH(b.b, h);
        b.v.setAttribute('y', (CY - h - 3).toFixed(1));
        setOpacity(b.v, seg(t, 7.6 + k * 0.15, 7.9 + k * 0.15));
      });
      setOpacity(human, seg(t, 9.3, 9.7)); setOpacity(humanT, seg(t, 9.3, 9.7));
      setOpacity(tbT, seg(t, 9.6, 10.0));
      setOpacity(right, seg(t, 10.4, 10.8));
      setOpacity(eq5, seg(t, 10.5, 11.0));
      reqBars.forEach(function (b, k) {
        var w = b.w * ease(seg(t, 11.2 + k * 0.4, 11.8 + k * 0.4));
        setW(b.b, w);
        b.v.setAttribute('x', (574 + w).toFixed(1));
        setOpacity(b.v, seg(t, 11.6 + k * 0.4, 11.9 + k * 0.4));
      });
      setOpacity(tbl, seg(t, 13.4, 13.8));
      mrows.forEach(function (r, k) {
        var w = r.w * ease(seg(t, 13.6 + k * 0.25, 14.1 + k * 0.25));
        setW(r.b, w);
        r.v.textContent = fmt(r.val, 1);
        r.v.setAttribute('x', (566 + w).toFixed(1));
        setOpacity(r.v, seg(t, 13.9 + k * 0.25, 14.2 + k * 0.25));
      });
      setOpacity(reqLine, seg(t, 15.0, 15.4));
      setOpacity(only, seg(t, 15.2, 15.7));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: 零点校准 ── */
  function buildSceneCalib() {
    var s = sceneSvg('左边是正视的 ToddlerBot 示意，四种颜色的 3D 打印卡具从两侧滑进手臂、颈、髋、踝并卡住，关节锁在零点；中间一个计时条在一分钟内走完；右边是「站直、双臂贴身 = 零点」和代码里的两步：读电机位置、再用 IMU 的俯仰反馈微调');
    s.appendChild(svgText(30, 28, '数字孪生之一：零点校准 —— Dynamixel 没有绝对零点，卡具一分钟校好', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 300, 360, C_BORDER, C_SURFACE2);
    var S = 290;
    var fig = tbFront(left, C_INK2, S, { joints: true });
    var pose0 = { armA: [0.45, 0.25], armB: [0.3, 0.6], crouch: 0.15, lean: 0.08 };
    var devices = [
      { key: 'arm', color: '#e8893a', label: '手臂（橙）', side: -1, jk: 'elL' }, { key: 'arm2', color: '#e8893a', label: '', side: 1, jk: 'elR' },
      { key: 'neck', color: '#e6c84a', label: '颈（黄）', side: -1, jk: 'neck' },
      { key: 'hip', color: '#d9534f', label: '髋（红）', side: 1, jk: 'hipR' },
      { key: 'ankle', color: '#d8c7a6', label: '踝（米色）', side: -1, jk: 'ankL' }, { key: 'ankle2', color: '#d8c7a6', label: '', side: 1, jk: 'ankR' }
    ].map(function (d) {
      d.node = paint(svgEl('rect', { width: 22, height: 14, rx: 3, 'stroke-width': 1 }), d.color, C_BORDER);
      left.appendChild(d.node);
      return d;
    });
    var legendG = group(left);
    ['手臂（橙）', '颈（黄）', '髋（红）', '踝（米色）'].forEach(function (str, k) {
      var c = ['#e8893a', '#e6c84a', '#d9534f', '#d8c7a6'][k];
      legendG.appendChild(paint(svgEl('rect', { x: 44 + k * 70, y: 372, width: 12, height: 12, rx: 2 }), c));
      legendG.appendChild(svgText(60 + k * 70, 382, str, 'demo-x-mut', 9));
    });
    var clickT = paint(svgText(180, 64, '', null, 12, 'middle'), C_GOOD);
    left.appendChild(clickT);
    /* 中：计时 */
    var mid = group(s);
    rectBox(mid, 346, 44, 150, 360, C_BORDER, C_SURFACE);
    mid.appendChild(svgText(421, 66, '一分钟内', 'demo-x-ink2', 11, 'middle'));
    var timerBg = paint(svgEl('rect', { x: 406, y: 80, width: 30, height: 300, rx: 6 }), C_SURFACE2, C_BORDER);
    mid.appendChild(timerBg);
    var timer = vbar(mid, 406, 380, 30, C_GOOD, 0.85);
    var timerT = svgText(421, 396, '0 s', 'demo-x-mut', 10, 'middle');
    mid.appendChild(timerT);
    mid.appendChild(svgText(460, 90, '插', 'demo-x-mut', 10)); mid.appendChild(svgText(460, 230, '卡', 'demo-x-mut', 10)); mid.appendChild(svgText(460, 370, '读', 'demo-x-mut', 10));
    /* 右 */
    var right = group(s);
    rectBox(right, 512, 44, 258, 360, C_BORDER, C_SURFACE);
    right.appendChild(svgText(526, 64, '零点的定义', 'demo-x-ink2', 11));
    var zeroChip = chip(right, 526, 74, 230, '站直、双臂平行贴着身体', C_GOOD, { size: 10.5, h: 30 });
    right.appendChild(svgText(526, 124, '膝：下限位 = 零点，用止挡当参考', 'demo-x-ink2', 10));
    right.appendChild(svgText(526, 140, '夹爪：张开位置 = 零点', 'demo-x-ink2', 10));
    var why = group(right);
    why.appendChild(svgText(526, 170, '为什么要这样做', 'demo-x-ink2', 11));
    why.appendChild(svgText(526, 188, '· Dynamixel 没有绝对零点', 'demo-x-ink2', 10));
    why.appendChild(svgText(526, 204, '· 每次重装都得重校', 'demo-x-ink2', 10));
    why.appendChild(svgText(526, 220, '· 零点错了，运动学就错，仿真里站着真机歪', 'demo-x-ink2', 10));
    var code = group(right);
    code.appendChild(svgText(526, 250, '代码里的两步', 'demo-x-ink2', 11));
    var step1 = chip(code, 526, 260, 230, '`calibrate_zero.py`：读电机位置写进配置', C_ACCENT, { size: 9.5, h: 26 });
    var step2 = chip(code, 526, 294, 230, '`calibrate.py`：IMU 俯仰反馈的 PID 微调', C_ACCENT, { size: 9.5, h: 26 });
    var imuG = group(code);
    var imuBody = tbSide(imuG, C_ACCENT, 90);
    var imuArrow = pathLine(imuG, [], C_BAD, 1.6);
    code.appendChild(svgText(526, 396, '前倾（齿轮间隙）→ 站直再存零点', 'demo-x-mut', 9));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.7));
      /* 插卡具的过程：姿态从歪到正 */
      var u = ease(seg(t, 3.6, 6.4));
      var pts = fig.put(180, 86, { armA: [pose0.armA[0] * (1 - u), pose0.armA[1] * (1 - u)], armB: [pose0.armB[0] * (1 - u), pose0.armB[1] * (1 - u)], crouch: pose0.crouch * (1 - u), lean: pose0.lean * (1 - u) });
      devices.forEach(function (d, k) {
        var J = pts[d.jk];
        var v = seg(t, 3.8 + k * 0.45, 4.6 + k * 0.45);
        var x0 = d.side < 0 ? 40 : 300, x1 = J[0] + (d.side < 0 ? -26 : 4);
        d.node.setAttribute('x', (x0 + (x1 - x0) * ease(v)).toFixed(1));
        d.node.setAttribute('y', (J[1] - 7).toFixed(1));
        setOpacity(d.node, seg(t, 3.6 + k * 0.45, 3.9 + k * 0.45));
        fig.joints[d.jk].setAttribute('stroke', v >= 1 ? C_GOOD : C_INK2);
      });
      clickT.textContent = t >= 6.4 ? '「咔」—— 关节锁在零点' : t >= 3.6 ? '插进去……' : '';
      setOpacity(legendG, seg(t, 3.6, 4.0));
      setOpacity(mid, seg(t, 7.0, 7.4));
      var tu = seg(t, 7.2, 9.6);
      setH(timer, 300 * tu);
      timerT.textContent = Math.round(60 * tu) + ' s';
      setOpacity(right, seg(t, 0.8, 1.3));
      setOpacity(zeroChip, seg(t, 1.0, 1.5));
      setOpacity(why, seg(t, 1.8, 2.4));
      setOpacity(code, seg(t, 10.4, 10.8));
      setOpacity(step1, seg(t, 10.6, 11.0));
      setOpacity(step2, seg(t, 13.4, 13.8));
      /* IMU 微调：小人从前倾回到直立 */
      var pu = ease(seg(t, 13.8, 15.6));
      var pitch = 0.25 * (1 - pu) + 0.02 * Math.sin(now * 5) * (1 - pu);
      imuBody.put(735, 354, pitch, [[739, 388], [729, 388]], [0.1, 0.1]);
      setPath(imuArrow, pu < 0.98 ? [[745, 332], [745 - 30 * pitch * 4, 332]] : []);
      setOpacity(imuG, seg(t, 13.8, 14.2));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 电机台架辨识 ── */
  function buildSceneTestbed() {
    var s = sceneSvg('左边是电机台架的示意：待测电机经快接轴连着扭矩传感器，尾部是粉末制动器，侧面一个驱动电机；右上是力矩对转速的散点一个个落下，再拟合出一条直线，截距是摩擦损耗、斜率是阻尼；右下是断电后转速衰减的曲线，XC330 从每秒 5 弧度到停只要半秒，用它算 armature');
    s.appendChild(svgText(30, 28, '数字孪生之二：台架上把 MuJoCo 的三个被动参数直接测出来', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 300, 220, C_BORDER, C_SURFACE2);
    left.appendChild(svgText(44, 64, '电机台架（附录 8.9、图 11）', 'demo-x-ink2', 11));
    var railY = 150;
    hline(left, 50, railY + 36, 310, railY + 36, C_MUTED, 3);
    var motorBox = chip(left, 60, railY - 20, 64, '待测电机', C_ACCENT, { size: 9.5, h: 40 });
    var shaft = hline(left, 124, railY, 160, railY, C_MUTED, 4);
    var sensor = chip(left, 160, railY - 16, 60, '扭矩传感器', C_GOOD, { size: 9, h: 32 });
    hline(left, 220, railY, 250, railY, C_MUTED, 4);
    var brake = chip(left, 250, railY - 20, 60, '粉末制动器', C_BAD, { size: 9, h: 40 });
    var driver = chip(left, 110, railY + 44, 70, '驱动电机', C_WARN, { size: 9, h: 24 });
    hline(left, 145, railY + 20, 145, railY + 44, C_MUTED, 2, '3 2');
    var arm = group(left);
    var armLine = hline(arm, 92, railY - 40, 92, railY - 40, C_ACCENT, 2.4);
    var armMass = dotAt(arm, 92, railY - 40, 6, C_ACCENT);
    var spec = group(left);
    spec.appendChild(svgText(44, 212, '刹车 5 N·m · 主动驱动 1 N·m · 扭矩精度 0.0003 N·m', 'demo-x-ink2', 9.5));
    spec.appendChild(svgText(44, 228, '负载：21700 电芯当砝码；MCU 管采样、刹车与 CAN', 'demo-x-mut', 9));
    spec.appendChild(svgText(44, 250, '「将随发布开源」（CHANGELOG：有人感兴趣就开源）', 'demo-x-mut', 9));
    var params = group(s);
    rectBox(params, 30, 276, 300, 128, C_BORDER, C_SURFACE);
    params.appendChild(svgText(44, 296, 'MuJoCo 的被动阻力（式 6）', 'demo-x-ink2', 11));
    params.appendChild(svgMath(180, 326, '\\tau_r=\\tau_f+d\\cdot\\dot q', { size: 14, anchor: 'middle' }));
    var pChips = [['frictionloss $\\tau_f$：起步要克服的最小力矩', C_BAD], ['damping $d$：反驱阻力随速度的斜率', C_WARN], ['armature $I$：含齿轮箱的等效转子惯量', C_GOOD]].map(function (r, k) {
      return chip(params, 44, 338 + k * 22, 272, r[0], r[1], { size: 9, h: 19 });
    });
    /* 右上：线性拟合 */
    var fit = group(s);
    rectBox(fit, 346, 44, 424, 180, C_BORDER, C_SURFACE2);
    fit.appendChild(svgText(360, 64, '反驱：恒定转速 → 记阻力矩，线性拟合（XC330，表 3）', 'demo-x-ink2', 11));
    var FX0 = 400, FX1 = 740, FY0 = 200, FY1 = 84;
    hline(fit, FX0, FY0, FX1, FY0, C_BORDER, 1.2); hline(fit, FX0, FY0, FX0, FY1, C_BORDER, 1.2);
    fit.appendChild(svgText(FX1, FY0 + 14, '转速 rad/s（0–6.5）', 'demo-x-mut', 9, 'end'));
    fit.appendChild(svgText(FX0 - 4, FY1 + 4, '阻力矩', 'demo-x-mut', 9, 'end'));
    var X330 = motor('XC330');
    function fx(w) { return FX0 + (w / 6.5) * (FX1 - FX0); }
    function fy(tau) { return FY0 - (tau / 0.07) * (FY0 - FY1); }
    var rng = mulberry32(31);
    var pts = [];
    for (var i = 0; i < 9; i++) { var w = 0.5 + i * 0.75; pts.push([w, tauR(X330, w) + 0.004 * (rng() - 0.5)]); }
    var dots = pts.map(function (p) { return dotAt(fit, fx(p[0]), fy(p[1]), 3.2, C_ACCENT); });
    var fitLine = pathLine(fit, [[fx(0), fy(X330.fl)], [fx(6.5), fy(tauR(X330, 6.5))]], C_GOOD, 2);
    var interceptT = paint(svgText(fx(0) + 6, fy(X330.fl) - 6, '截距 0.036 = 摩擦损耗', null, 9.5), C_BAD);
    var slopeT = paint(svgText(fx(4.2), fy(tauR(X330, 4.2)) - 10, '斜率 0.0036 = 阻尼', null, 9.5), C_WARN);
    fit.appendChild(interceptT); fit.appendChild(slopeT);
    var ex = paint(svgText(FX1, FY1 + 4, '1 rad/s 时 0.0396 N·m，6.5 rad/s 时 0.0594', null, 9.5, 'end'), C_GOOD);
    fit.appendChild(ex);
    /* 右下：spin-down */
    var spin = group(s);
    rectBox(spin, 346, 236, 424, 168, C_BORDER, C_SURFACE);
    spin.appendChild(svgText(360, 256, '自由旋转衰减：转起来再断电，看它怎么慢下来', 'demo-x-ink2', 11));
    var SX0 = 400, SX1 = 640, SY0 = 384, SY1 = 276;
    hline(spin, SX0, SY0, SX1, SY0, C_BORDER, 1.2); hline(spin, SX0, SY0, SX0, SY1, C_BORDER, 1.2);
    spin.appendChild(svgText(SX1, SY0 + 14, '时间 s（0–0.6）', 'demo-x-mut', 9, 'end'));
    spin.appendChild(svgText(SX0 - 4, SY1 + 4, '转速', 'demo-x-mut', 9, 'end'));
    var T_STOP = spinDownTime(X330, 5); // 0.451 s
    var curve = [];
    for (var k = 0; k <= 60; k++) {
      var tt = (k / 60) * T_STOP;
      var wv = (5 + X330.fl / X330.d) * Math.exp(-X330.d * tt / X330.I) - X330.fl / X330.d;
      curve.push([SX0 + (tt / 0.6) * (SX1 - SX0), SY0 - (Math.max(0, wv) / 5) * (SY0 - SY1)]);
    }
    var spinPath = pathLine(spin, curve, C_ACCENT, 2.2);
    var stopT = paint(svgText(SX0 + (T_STOP / 0.6) * (SX1 - SX0), SY0 - 8, '0.45 s 停', null, 9.5, 'middle'), C_BAD);
    spin.appendChild(stopT);
    var eq7 = group(spin);
    eq7.appendChild(svgMath(708, 300, 'E=\\tfrac12 I\\omega^{2}', { size: 12, anchor: 'middle' }));
    eq7.appendChild(svgMath(708, 334, 'I=\\frac{2E}{\\omega^{2}}', { size: 13, anchor: 'middle' }));
    eq7.appendChild(svgText(708, 360, 'E：用刚测的阻尼', 'demo-x-mut', 9, 'middle'));
    eq7.appendChild(svgText(708, 374, '把阻力功率积分', 'demo-x-mut', 9, 'middle'));
    eq7.appendChild(svgText(708, 392, 'XC330：0.0040 kg·m²', 'demo-x-good', 9.5, 'middle'));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.7));
      var ang = now * 2.4;
      var ax = 92 + 34 * Math.cos(ang), ay = railY - 34 * Math.sin(ang);
      setLine(armLine, 92, railY, ax, ay); moveDot(armMass, [ax, ay]);
      setOpacity(spec, seg(t, 1.6, 2.2));
      setOpacity(params, seg(t, 3.6, 4.1));
      pChips.forEach(function (c, k) { setOpacity(c, seg(t, 4.2 + k * 0.6, 4.7 + k * 0.6)); });
      setOpacity(fit, seg(t, 7.0, 7.4));
      dots.forEach(function (d, k) { setOpacity(d, seg(t, 7.3 + k * 0.22, 7.6 + k * 0.22)); });
      drawOn(fitLine, seg(t, 9.4, 10.0));
      setOpacity(interceptT, seg(t, 9.8, 10.2)); setOpacity(slopeT, seg(t, 10.0, 10.4));
      setOpacity(ex, seg(t, 10.0, 10.4));
      setOpacity(spin, seg(t, 10.4, 10.8));
      drawOn(spinPath, seg(t, 10.7, 12.6));
      setOpacity(stopT, seg(t, 12.5, 12.9));
      setOpacity(eq7, seg(t, 13.4, 13.9));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 7: 9 参数执行器模型 ── */
  function buildSceneActuator() {
    var s = sceneSvg('左上是图 12 的样子：XC330 的力矩上限随关节速度先平后降的台阶，下方一条固定的刹车力矩线；左下是 chirp 跟踪：灰虚线设定点、橙线按表 3 跑出的真机、蓝线拿掉 k_d^min 的仿真；右边是一张「拿掉一项差多少」的柱状表，k_d^min 最高 4.32 度，底下写平均跟踪误差 1.3 度');
    s.appendChild(svgText(30, 28, '数字孪生之三：舵机特有的东西显式建进模型，再用 chirp 联合拟合 9 个参数', 'demo-x-ink2', 13.5));
    var X330 = motor('XC330');
    var env = group(s);
    rectBox(env, 30, 44, 400, 170, C_BORDER, C_SURFACE2);
    env.appendChild(svgText(44, 64, '力矩上限随速度变（式 9、图 12，XC330）', 'demo-x-ink2', 11));
    var EX0 = 70, EX1 = 400, EY0 = 190, EYm = 90;
    hline(env, EX0, (EY0 + EYm) / 2 + 8, EX1, (EY0 + EYm) / 2 + 8, C_BORDER, 1);
    env.appendChild(svgText(EX1, EY0 + 14, '关节速度 rad/s', 'demo-x-mut', 9, 'end'));
    function ex(q) { return EX0 + (q / 7.5) * (EX1 - EX0); }
    function ey(tau) { return (EY0 + EYm) / 2 + 8 - (tau / 2.0) * ((EY0 - EYm) / 2); }
    var up = [], dn = [];
    for (var i = 0; i <= 150; i++) { var q = (7.5 * i) / 150; up.push([ex(q), ey(tauLimit(X330, q))]); dn.push([ex(q), ey(-X330.tbrake)]); }
    var upPath = pathLine(env, up, C_ACCENT, 2.4), dnPath = pathLine(env, dn, C_BAD, 2.2);
    var marks = group(env);
    marks.appendChild(paint(svgText(ex(X330.qdt) - 4, ey(X330.tmax) - 8, '(1.8, 0.76)', null, 9), C_ACCENT));
    marks.appendChild(paint(svgText(ex(X330.qdm) + 4, ey(X330.tqd) - 6, '(6.5, 0.48) → 0', null, 9), C_ACCENT));
    marks.appendChild(paint(svgText(ex(0.2), ey(-X330.tbrake) - 6, '刹车 −1.75：减速方向另一个上限', null, 9), C_BAD));
    var kdG = group(env);
    kdG.appendChild(svgRich(44, 84, '式 8：$\\tau_m = k_p(\\hat q - q) - (k_d^{\\min} + k_d)\\dot q$，$k_d^{\\min}$ 是上电就有的阻尼', { size: 9.5, w: 380, cls: 'demo-x-ink2' }));
    var parT = paint(svgText(44, 206, '被反驱时 k 乘 3（被动 / 主动比 = 1/η²，齿轮箱效率约 58%）', null, 9.5), C_WARN);
    env.appendChild(parT);
    /* 左下：chirp */
    var ch = group(s);
    rectBox(ch, 30, 226, 400, 178, C_BORDER, C_SURFACE);
    ch.appendChild(svgText(44, 246, 'chirp 跟踪（单电机玩具：表 3 的 XC330 当「真机」）', 'demo-x-ink2', 11));
    var CX0 = 50, CX1 = 416, CYm = 328, CA = 56;
    hline(ch, CX0, CYm, CX1, CYm, C_BORDER, 1);
    function cx(i) { return CX0 + (i / (TOY_REF.length - 1)) * (CX1 - CX0); }
    function cy(v) { return CYm - (v / 0.6) * CA; }
    var refP = pathLine(ch, TOY_REF.map(function (v, i) { return [cx(i), cy(v)]; }), C_MUTED, 1.2, '4 3');
    var realP = pathLine(ch, TOY_REAL.map(function (v, i) { return [cx(i), cy(v)]; }), C_REAL, 2.2);
    var noKd = toyRun({ kdmin: 0 });
    var simP = pathLine(ch, noKd.map(function (v, i) { return [cx(i), cy(clamp(v, -0.65, 0.65))]; }), C_SIM, 1.6);
    var head = dotAt(ch, 0, 0, 4, C_REAL);
    var chLeg = group(ch);
    chLeg.appendChild(svgText(44, 398, '灰：0.1 → 2 Hz 设定点　橙：九个参数全对　蓝：拿掉 k_d^min，差 4.32°', 'demo-x-mut', 9));
    /* 右：knockouts */
    var right = group(s);
    rectBox(right, 446, 44, 324, 360, C_BORDER, C_SURFACE2);
    right.appendChild(svgText(460, 64, '拿掉一项，仿真离真机多远（玩具 RMSE）', 'demo-x-ink2', 11));
    var KX = 580, KS = 36;
    var krows = KNOCKOUTS.map(function (k, i) {
      var y = 84 + i * 34, g = group(right);
      g.appendChild(svgRich(KX - 6, y + 13, k.label, { size: 9.5, anchor: 'end', w: 120, cls: 'demo-x-ink2' }));
      var b = hbar(g, KX, y + 3, 18, i === 0 ? C_BAD : i < 4 ? C_WARN : C_MUTED, 0.85);
      var v = svgText(0, y + 14, fmt(k.rmse, 2) + '°', 'demo-x-ink2', 9.5);
      g.appendChild(v);
      return { g: g, b: b, v: v, w: k.rmse * KS, y: y };
    });
    var fitG = group(right);
    fitG.appendChild(svgText(460, 300, '怎么拟合（附录 8.10）', 'demo-x-ink2', 11));
    fitG.appendChild(svgText(460, 318, '· chirp 0.1 → 10 Hz，幅值取活动范围的 25 / 50 / 75%', 'demo-x-ink2', 9.5));
    fitG.appendChild(svgText(460, 334, '· 9 个参数联合优化（代码：Optuna），约束范围才收敛', 'demo-x-ink2', 9.5));
    fitG.appendChild(svgText(460, 350, '· 同型号 Dynamixel 参数几乎一样 → 第二台不用重做', 'demo-x-ink2', 9.5));
    var resT = chip(fitG, 460, 364, 296, '最终仿真的平均跟踪误差 **1.3°**', C_GOOD, { size: 11, h: 30 });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(env, seg(t, 0.2, 0.7));
      setOpacity(kdG, seg(t, 0.4, 0.9));
      drawOn(upPath, seg(t, 3.6, 5.2)); drawOn(dnPath, seg(t, 5.2, 5.8));
      setOpacity(marks, seg(t, 5.6, 6.1));
      setOpacity(parT, seg(t, 6.2, 6.7));
      setOpacity(ch, seg(t, 7.0, 7.4));
      var u = seg(t, 7.2, 10.0);
      drawOn(refP, u); drawOn(realP, u); drawOn(simP, u);
      var hi = Math.min(TOY_REAL.length - 1, Math.floor(u * (TOY_REAL.length - 1)));
      moveDot(head, [cx(hi), cy(TOY_REAL[hi])]);
      setOpacity(head, u > 0 && u < 1 ? 1 : 0);
      setOpacity(chLeg, seg(t, 9.6, 10.0));
      setOpacity(right, seg(t, 10.4, 10.8));
      krows.forEach(function (r, k) {
        var w = r.w * ease(seg(t, 10.6 + k * 0.35, 11.2 + k * 0.35));
        setW(r.b, w);
        r.v.setAttribute('x', (KX + w + 5).toFixed(1));
        setOpacity(r.v, seg(t, 11.0 + k * 0.35, 11.3 + k * 0.35));
      });
      setOpacity(fitG, seg(t, 13.4, 13.9));
      setOpacity(resT, seg(t, 15.0, 15.5));
      head.setAttribute('r', (4 + Math.sin(now * 6)).toFixed(1));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 遥操作装置与两层 PD ── */
  function buildSceneTeleop() {
    var s = sceneSvg('左边：操作员推着一副只有上半身的领导臂，右侧跟随机器人的手臂同步抬起，夹爪随力敏电阻的握力开合，下方一台掌机的摇杆给出速度箭头；右边是侧视的下半身：手臂前伸时质心点往前漂出支撑面中心，第一层质心 PD 把髋往后挪、第二层躯干俯仰 PD 把上身往后带，质心回到中间；底下写 20 分钟 60 条');
    s.appendChild(svgText(30, 28, '采真机数据：领导臂 + 掌机做全身遥操作，下半身用两层 PD 自己站稳', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 420, 232, C_BORDER, C_SURFACE2);
    left.appendChild(svgText(44, 64, '遥操作装置（第 3.3 节）', 'demo-x-ink2', 11));
    var S = 150;
    var leader = tbFront(left, C_WARN, S);
    var follower = tbFront(left, C_INK2, S);
    var handL = dotAt(left, 0, 0, 7, C_WARN);
    left.appendChild(svgText(110, 84, '领导臂（第二副上半身）', 'demo-x-warn', 9.5, 'middle'));
    left.appendChild(svgText(300, 84, '跟随机器人', 'demo-x-ink2', 9.5, 'middle'));
    var linkArrow = pathLine(left, [[170, 150], [240, 150]], C_WARN, 1.6, '4 3');
    var fsrG = group(left);
    var fsrChip = chip(fsrG, 44, 218, 180, '2 片 FSR 感知握力 → 夹爪开合', C_WARN, { size: 9.5, h: 24 });
    var gripA = hline(fsrG, 0, 0, 0, 0, C_INK2, 2.2), gripB = hline(fsrG, 0, 0, 0, 0, C_INK2, 2.2);
    var padG = group(left);
    rectBox(padG, 236, 206, 200, 60, C_ACCENT, C_SURFACE);
    padG.appendChild(svgText(336, 222, '掌机：Steam Deck / ROG Ally X', 'demo-x-acc', 9.5, 'middle'));
    var stickBase = dotAt(padG, 262, 246, 9, C_SURFACE2), stick = dotAt(padG, 262, 246, 5, C_ACCENT);
    stickBase.setAttribute('stroke', C_ACCENT);
    padG.appendChild(svgText(280, 242, '摇杆：走、转、蹲', 'demo-x-ink2', 9));
    padG.appendChild(svgText(280, 256, '按钮：腰、颈、触发策略（表 4）', 'demo-x-ink2', 9));
    var velArrow = pathLine(padG, [], C_ACCENT, 1.8);
    /* 右：两层 PD */
    var right = group(s);
    rectBox(right, 466, 44, 304, 232, C_BORDER, C_SURFACE);
    right.appendChild(svgText(480, 64, '下半身怎么站稳（第 4.3 节）', 'demo-x-ink2', 11));
    var GY = 250, RS = 230;
    hline(right, 480, GY, 756, GY, C_BORDER, 1.4);
    var side = tbSide(right, C_INK2, RS);
    var support = paint(svgEl('rect', { x: 0, y: GY - 3, width: 0, height: 6, rx: 2 }), C_GOOD);
    support.style.opacity = 0.5; right.appendChild(support);
    var comDot = dotAt(right, 0, 0, 6, C_BAD), comLine = hline(right, 0, 0, 0, 0, C_BAD, 1.2, '3 2');
    var comT = paint(svgText(0, 0, '质心', null, 9.5, 'middle'), C_BAD);
    right.appendChild(comT);
    var layer1 = chip(right, 480, 74, 134, '① 质心 PD：拉回支撑面中心', C_GOOD, { size: 9, h: 24 });
    var layer2 = chip(right, 622, 74, 134, '② 躯干俯仰 PD：IMU 保持直立', C_ACCENT, { size: 9, h: 24 });
    var pdNote = group(right);
    pdNote.appendChild(svgRich(480, 118, '代码：质心 $k_p = 1$，俯仰 $k_p = 0.2$、$k_d = 0.01$', { size: 9, w: 280, cls: 'demo-x-mut' }));
    /* 底 */
    var bot = group(s);
    rectBox(bot, 30, 290, 740, 114, C_BORDER, C_SURFACE2);
    bot.appendChild(svgText(44, 310, '记什么（第 4.3 节）', 'demo-x-ink2', 11));
    var recChips = [['动作：领导臂的电机位置', C_WARN], ['观测：跟随机器人的电机位置 + 相机 RGB', C_INK2], ['上半身用低 P 增益 → 力藏在领导—跟随的差里', C_ACCENT]].map(function (r, k) {
      return chip(bot, 44 + k * 242, 320, 232, r[0], r[1], { size: 9.5, h: 26 });
    });
    var rate = group(bot);
    rate.appendChild(svgRich(44, 376, '双臂操作和全身操作各 **20 分钟采 60 条**（每条约 20 s）；代码 2.0 又加了 Meta Quest 的 VR 遥操作', { size: 10.5, w: 710, cls: 'demo-x-good' }));
    rate.appendChild(svgText(44, 396, '操作员既发速度命令，也决定什么时候切技能（L1 / R1 按住跑扩散策略，松开结束）', 'demo-x-mut', 9.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.7));
      var raise = 0.5 + 0.5 * Math.sin(now * 1.3);
      var armPose = { armA: [1.3 * raise + 0.1, 0.5 * raise], armB: [0.4 * raise + 0.1, 0.9 * raise] };
      var lp = leader.put(110, 96, armPose);
      var fp = follower.put(300, 96, { armA: [armPose.armA[0] * 0.95, armPose.armA[1]], armB: [armPose.armB[0] * 0.95, armPose.armB[1]] });
      moveDot(handL, [lp.wrL[0] - 8, lp.wrL[1] + 2]);
      setOpacity(linkArrow, seg(t, 0.8, 1.3));
      setOpacity(fsrG, seg(t, 3.6, 4.0));
      var grip = 0.5 + 0.5 * Math.sin(now * 2.1);
      setLine(gripA, fp.wrR[0] - 3, fp.wrR[1], fp.wrR[0] - 3 - 6 * (1 - grip), fp.wrR[1] + 12);
      setLine(gripB, fp.wrR[0] + 3, fp.wrR[1], fp.wrR[0] + 3 + 6 * (1 - grip), fp.wrR[1] + 12);
      setOpacity(padG, seg(t, 4.6, 5.1));
      var sx = 262 + 5 * Math.sin(now * 1.7), sy = 246 + 4 * Math.cos(now * 1.1);
      moveDot(stick, [sx, sy]);
      setPath(velArrow, [[fp.waist[0], fp.waist[1] + 50], [fp.waist[0] + 30 * Math.sin(now * 1.7), fp.waist[1] + 50 + 10 * Math.cos(now * 1.1)]]);
      setOpacity(velArrow, seg(t, 5.0, 5.4));
      setOpacity(right, seg(t, 7.0, 7.4));
      /* 侧视：手臂前伸把质心推出去；第 2 段起质心 PD 把髋后挪，第 3 段起俯仰 PD 后仰 */
      var ext = 0.5 + 0.5 * Math.sin(now * 1.0);
      var reach = 1.4 * ext;
      var hx0 = 620, hipShift = -22 * ext * seg(t, 8.2, 9.2), pitch = -0.28 * ext * seg(t, 10.4, 11.4);
      var hx = hx0 + hipShift;
      var fx = 620;
      var pose = side.put(hx, GY - 0.37 * RS, pitch, [[fx + 4, GY - 0.02 * RS], [fx - 6, GY - 0.02 * RS]], [reach, 0.2]);
      var comX = hx + 0.45 * (pose.hand[0] - hx) * 0.5 + 0.15 * RS * Math.sin(pitch);
      support.setAttribute('x', (fx - 0.045 * RS).toFixed(1)); setW(support, 0.1 * RS);
      moveDot(comDot, [comX, GY - 0.3 * RS]);
      setLine(comLine, comX, GY - 0.3 * RS, comX, GY);
      comT.setAttribute('x', comX.toFixed(1)); comT.setAttribute('y', (GY - 0.3 * RS - 10).toFixed(1));
      var inside = Math.abs(comX - fx) < 0.045 * RS;
      comDot.setAttribute('fill', inside ? C_GOOD : C_BAD); comT.setAttribute('fill', inside ? C_GOOD : C_BAD);
      setOpacity(layer1, seg(t, 8.0, 8.5));
      setOpacity(layer2, seg(t, 10.4, 10.9));
      setOpacity(pdNote, seg(t, 11.6, 12.0));
      setOpacity(bot, seg(t, 13.4, 13.8));
      recChips.forEach(function (c, k) { setOpacity(c, seg(t, 13.6 + k * 0.4, 14.0 + k * 0.4)); });
      setOpacity(rate, seg(t, 15.0, 15.5));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: 关键帧动画与 RL 行走 ── */
  function buildSceneSimData() {
    var s = sceneSvg('左边是关键帧工具：时间轴上三个关键帧，一个侧视的小机器人在两帧之间插值做俯卧撑，旁边写「MuJoCo 里验证过就能零样本上真机」；右边是 RL 行走：七项观测的卡片进入三层 MLP，输出关节设定点给 PD，奖励分模仿、正则、生存三类，底下是 PPO 的规模');
    s.appendChild(svgText(30, 28, '采仿真数据：关键帧动画直接上真机，行走策略用 PPO 在 MJX 里训', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 330, 360, C_BORDER, C_SURFACE2);
    left.appendChild(svgText(44, 64, '关键帧动画（第 4.1 节）：MuJoCo + GUI 实时调', 'demo-x-ink2', 11));
    var TLX0 = 56, TLX1 = 334, TLY = 90;
    hline(left, TLX0, TLY, TLX1, TLY, C_BORDER, 2);
    var keys = [0, 0.5, 1].map(function (u, k) {
      var x = TLX0 + u * (TLX1 - TLX0);
      var d = paint(svgEl('rect', { x: x - 6, y: TLY - 6, width: 12, height: 12, rx: 2, transform: 'rotate(45 ' + x + ' ' + TLY + ')' }), C_WARN);
      left.appendChild(d);
      left.appendChild(svgText(x, TLY + 20, ['平板撑', '撑起', '平板撑'][k], 'demo-x-mut', 9, 'middle'));
      return d;
    });
    var cursor = hline(left, TLX0, TLY - 12, TLX0, TLY + 8, C_GOOD, 2);
    var GY = 300, PS = 220;
    hline(left, 44, GY, 346, GY, C_BORDER, 1.4);
    var pusher = tbSide(left, C_INK2, PS);
    var kfNote = group(left);
    kfNote.appendChild(svgText(44, 330, '只给运动学、不保证动力学可行 → 在数字孪生里先跑一遍', 'demo-x-ink2', 9.5));
    kfNote.appendChild(svgText(44, 346, '俯卧撑、引体向上、拥抱：一条仿真里设计的轨迹，零样本开环执行', 'demo-x-ink2', 9.5));
    kfNote.appendChild(svgText(44, 362, '文档：MuJoCo 里验证过的关键帧多数直接能部署，几乎不用调', 'demo-x-mut', 9));
    kfNote.appendChild(svgText(44, 390, '代码 2.0 的关键帧 App 加了碰撞几何、接触点、质心显示、拖拽排序', 'demo-x-mut', 9));
    /* 右：RL */
    var right = group(s);
    rectBox(right, 376, 44, 394, 360, C_BORDER, C_SURFACE);
    right.appendChild(svgText(390, 64, 'RL 行走（第 4.2 节、附录 8.12）', 'demo-x-ink2', 11));
    var obsG = group(right);
    obsG.appendChild(svgRich(390, 86, '观测 $s_t = (\\phi_t, c_t, \\Delta q_t, \\dot q_t, a_{t-1}, \\theta_t, \\omega_t)$（式 1）', { size: 10, w: 370, cls: 'demo-x-ink2' }));
    var obsChips = ['相位', '速度命令', '关节偏移', '关节速度', '上一步动作', '躯干朝向', '角速度'].map(function (str, k) {
      return chip(obsG, 390 + (k % 4) * 92, 96 + Math.floor(k / 4) * 26, 86, str, C_ACCENT, { size: 9, h: 22 });
    });
    var netG = group(right);
    var mlp = chip(netG, 390, 158, 170, 'MLP 512 · 256 · 128', C_INK2, { size: 10, h: 28 });
    var pd = chip(netG, 582, 158, 172, '关节设定点 → PD → 力矩', C_INK2, { size: 10, h: 28 });
    var netArrow = pathLine(netG, [[560, 172], [582, 172]], C_INK2, 1.6);
    var token = dotAt(netG, 0, 0, 3.5, C_ACCENT);
    var rewG = group(right);
    rewG.appendChild(svgRich(390, 212, '奖励（式 2）：$r_t = r^{\\text{imitation}} + r^{\\text{regularization}} + r^{\\text{survival}}$', { size: 10, w: 370, cls: 'demo-x-ink2' }));
    var rewChips = [['模仿：跟上闭式 ZMP 解生成的参考步态', C_GOOD], ['正则：腾空时间、抬脚、不打滑、力矩、能量、动作变化……', C_WARN], ['生存：别早早摔倒', C_BAD]].map(function (r, k) {
      return chip(rewG, 390, 222 + k * 28, 364, r[0], r[1], { size: 9, h: 24 });
    });
    var ppoG = group(right);
    ppoG.appendChild(svgText(390, 326, 'PPO（表 5）', 'demo-x-ink2', 11));
    var ppoChips = ['MJX + Brax', '1024 个环境', '3 × 10⁸ 步', 'γ 0.97 · clip 0.2', '回合 1000 步', 'Jetson CPU 50 Hz'].map(function (str, k) {
      return chip(ppoG, 390 + (k % 3) * 122, 334 + Math.floor(k / 3) * 30, 116, str, C_MUTED, { size: 9, h: 25 });
    });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.7));
      /* 俯卧撑：相位 0 平板、0.5 撑起 */
      var ph = (now / 2.2) % 1, u = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI);
      cursor.setAttribute('x1', (TLX0 + ph * (TLX1 - TLX0)).toFixed(1)); cursor.setAttribute('x2', (TLX0 + ph * (TLX1 - TLX0)).toFixed(1));
      /* 躯干水平朝 +x（pitch = +90°）：脚在后面撑地，手在肩正下方撑地；u = 1 撑起、u = 0 趴下 */
      var hipY = GY - 0.02 * PS - (0.09 + 0.11 * u) * PS;
      pusher.put(230, hipY, Math.PI / 2, [[230 - 0.36 * PS, GY - 0.02 * PS], [230 - 0.38 * PS, GY - 0.02 * PS]], [-Math.PI / 2 - 0.9 * (1 - u), 1.7 * (1 - u)]);
      setOpacity(kfNote, seg(t, 3.6, 4.1));
      setOpacity(right, seg(t, 7.0, 7.4));
      setOpacity(obsG, seg(t, 7.2, 7.6));
      obsChips.forEach(function (c, k) { setOpacity(c, seg(t, 7.5 + k * 0.25, 7.8 + k * 0.25)); });
      setOpacity(netG, seg(t, 9.4, 9.9));
      var tu = (now * 0.8) % 1;
      moveDot(token, [560 + 22 * tu, 172]);
      setOpacity(rewG, seg(t, 10.4, 10.8));
      rewChips.forEach(function (c, k) { setOpacity(c, seg(t, 10.7 + k * 0.6, 11.1 + k * 0.6)); });
      setOpacity(ppoG, seg(t, 13.4, 13.8));
      ppoChips.forEach(function (c, k) { setOpacity(c, seg(t, 13.6 + k * 0.3, 13.9 + k * 0.3)); });
      void mlp; void pd; void netArrow; void keys;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: 扩散策略 ── */
  function buildSceneDP() {
    var s = sceneSvg('左边：鱼眼相机的画面裁成 96 乘 96 的小格子，送进 ResNet，再进扩散策略，三步去噪把一条乱的动作曲线整理成平滑的轨迹；右上是 16 步的动作块时间轴：前 3 步红色丢掉、接着 5 步绿色执行、其余灰色；右下是 90% 和 75% 两根成功率柱');
    s.appendChild(svgText(30, 28, '真机数据训扩散策略：96×96 的图、3 步去噪、16 步预测丢 3 执行 5', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 400, 360, C_BORDER, C_SURFACE2);
    left.appendChild(svgText(44, 64, '输入与网络（附录 8.13）', 'demo-x-ink2', 11));
    var imgG = group(left);
    var cells = [];
    for (var r = 0; r < 6; r++) for (var c = 0; c < 6; c++) {
      var q = paint(svgEl('rect', { x: 50 + c * 14, y: 80 + r * 14, width: 13, height: 13, rx: 1.5 }), C_ACCENT);
      q.style.opacity = 0.25 + 0.6 * (((r * 7 + c * 3) % 5) / 5);
      imgG.appendChild(q); cells.push(q);
    }
    imgG.appendChild(svgText(92, 178, '裁剪 + 下采样 96×96', 'demo-x-mut', 9, 'middle'));
    var resnet = chip(left, 150, 104, 90, 'ResNet（ImageNet 预训练）', C_ACCENT, { size: 8.5, h: 36 });
    var joint = chip(left, 150, 150, 90, '关节角 10 Hz', C_WARN, { size: 9, h: 24 });
    var dpBox = chip(left, 262, 104, 150, '扩散策略 · 3 亿参数', C_GOOD, { size: 10, h: 36 });
    var a1 = pathLine(left, [[134, 122], [150, 122]], C_ACCENT, 1.6), a2 = pathLine(left, [[240, 122], [262, 122]], C_ACCENT, 1.6), a3 = pathLine(left, [[240, 162], [262, 130]], C_WARN, 1.6);
    /* 去噪 */
    var denG = group(left);
    denG.appendChild(svgText(44, 206, '训练 100 步 DDPM，推理只用 3 步（Jetson 上 < 0.1 s）', 'demo-x-ink2', 10));
    var DX0 = 60, DX1 = 400, DY = 270;
    hline(denG, DX0, DY, DX1, DY, C_BORDER, 1);
    var rng = mulberry32(17);
    var noise = [];
    for (var i = 0; i <= 40; i++) noise.push(rng() - 0.5);
    var traj = pathLine(denG, [], C_GOOD, 2.2);
    var stepT = svgText(DX1, 226, '', 'demo-x-good', 10, 'end');
    denG.appendChild(stepT);
    var forceT = group(left);
    forceT.appendChild(svgText(44, 316, '力从哪来：采数据时上半身用低 P 增益，操作力就', 'demo-x-ink2', 9.5));
    forceT.appendChild(svgText(44, 332, '体现在领导与跟随关节角的差里，策略把这个差学进去', 'demo-x-ink2', 9.5));
    forceT.appendChild(svgText(44, 356, '每个任务 60 条演示；双臂任务转腰、松手开环，全身任务跪下开环', 'demo-x-mut', 9));
    forceT.appendChild(svgText(44, 372, '用开环动作和闭环策略混着提高采集效率', 'demo-x-mut', 9));
    /* 右上：动作块 */
    var right = group(s);
    rectBox(right, 446, 44, 324, 180, C_BORDER, C_SURFACE);
    right.appendChild(svgText(460, 64, '动作块：每次预测 16 步（10 Hz = 1.6 s）', 'demo-x-ink2', 11));
    var blocks = [];
    for (var b = 0; b < 16; b++) {
      var col = b < 3 ? C_BAD : b < 8 ? C_GOOD : C_MUTED;
      var rect = paint(svgEl('rect', { x: 460 + b * 18.5, y: 84, width: 16, height: 26, rx: 3 }), col);
      rect.style.opacity = b < 8 ? 0.9 : 0.4;
      right.appendChild(rect); blocks.push(rect);
    }
    var lab1 = paint(svgText(478, 128, '丢 3 步 = 0.3 s，补偿延迟（UMI 的做法）', null, 9.5), C_BAD);
    var lab2 = paint(svgText(478, 146, '执行 5 步 = 0.5 s，再重新预测', null, 9.5), C_GOOD);
    var lab3 = svgText(478, 164, '其余 8 步不用', 'demo-x-mut', 9.5);
    right.appendChild(lab1); right.appendChild(lab2); right.appendChild(lab3);
    var latT = group(right);
    latT.appendChild(svgText(460, 192, '推理 < 0.1 s 比一步（0.1 s）短，丢 3 步留了两步余量', 'demo-x-ink2', 9.5));
    latT.appendChild(svgText(460, 208, '板载 3 亿参数模型约 100 ms 延迟（第 5 节）', 'demo-x-mut', 9));
    /* 右下：成功率 */
    var res = group(s);
    rectBox(res, 446, 236, 324, 168, C_BORDER, C_SURFACE2);
    res.appendChild(svgText(460, 256, '20 次测试的成功率（第 5 节）', 'demo-x-ink2', 11));
    var RY = 380, RS = 1.1;
    var rbars = [['双臂：桌上的章鱼进小车', DP.bimanualPct], ['全身：跪下从地上捡', DP.fullBodyPct]].map(function (r, k) {
      var x = 500 + k * 140;
      var bar = vbar(res, x, RY, 50, k ? C_WARN : C_GOOD, 0.9);
      var v = svgText(x + 25, 0, r[1] + '%', 'demo-x-ink2', 11, 'middle');
      res.appendChild(v);
      res.appendChild(svgText(x + 25, RY + 14, r[0], 'demo-x-mut', 8.5, 'middle'));
      return { b: bar, v: v, h: r[1] * RS };
    });
    res.appendChild(svgText(460, 396, '数据来自一台，策略放到另一台仍 90%', 'demo-x-good', 9, 'start'));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.7));
      cells.forEach(function (q, k) { q.style.opacity = (0.25 + 0.6 * (((k * 7 + Math.floor(now * 3)) % 5) / 5)).toFixed(2); });
      setOpacity(resnet, seg(t, 0.6, 1.0)); setOpacity(joint, seg(t, 1.0, 1.4)); setOpacity(dpBox, seg(t, 1.4, 1.8));
      setOpacity(a1, seg(t, 0.6, 1.0)); setOpacity(a2, seg(t, 1.4, 1.8)); setOpacity(a3, seg(t, 1.4, 1.8));
      setOpacity(denG, seg(t, 3.6, 4.0));
      /* 3 步去噪：噪声幅度从 1 → 0，循环 */
      var ph = (now / 3) % 1, step = Math.min(3, Math.floor(ph * 4));
      var amp = [1, 0.45, 0.15, 0][step];
      var pts = [];
      for (var i = 0; i <= 40; i++) { var x = i / 40; pts.push([DX0 + x * (DX1 - DX0), DY - 34 * Math.sin(x * 4.5) - 36 * amp * noise[i]]); }
      setPath(traj, pts);
      stepT.textContent = step === 0 ? '噪声' : '去噪第 ' + step + ' 步' + (step === 3 ? '：动作轨迹' : '');
      setOpacity(forceT, seg(t, 7.0, 7.5));
      setOpacity(right, seg(t, 10.4, 10.8));
      blocks.forEach(function (bk, k) { setOpacity(bk, seg(t, 10.6 + k * 0.08, 10.8 + k * 0.08) * (k < 8 ? 0.9 : 0.4)); });
      setOpacity(lab1, seg(t, 11.8, 12.2)); setOpacity(lab2, seg(t, 12.2, 12.6)); setOpacity(lab3, seg(t, 12.6, 13.0));
      setOpacity(latT, seg(t, 12.8, 13.2));
      setOpacity(res, seg(t, 13.4, 13.8));
      rbars.forEach(function (b, k) {
        var h = b.h * ease(seg(t, 13.6 + k * 0.5, 14.3 + k * 0.5));
        setH(b.b, h);
        b.v.setAttribute('y', (RY - h - 5).toFixed(1));
        setOpacity(b.v, seg(t, 14.1 + k * 0.5, 14.4 + k * 0.5));
      });
    }
    return { el: s, draw: draw };
  }

  /* ── scene 11: 实验 ── */
  function buildSceneExperiments() {
    var s = sceneSvg('左上是臂展：躯干 13×9×12 厘米的小方块旁边画出 27×24×31 厘米的大箱子，约 14 倍体积；左下是负重：秤上的砝码加到 1484 克，是 3484 克体重的 40%，旁边是 19 分钟的耐久计时和修一次 35 分钟；右边是表 7 的三组柱子，仿真对真机的位置、线速度、角速度跟踪误差，真机大约是仿真的两倍');
    s.appendChild(svgText(30, 28, '实验：臂展、负重、耐久，再看仿真和真机的跟踪误差（表 7）', 'demo-x-ink2', 13.5));
    var span = group(s);
    rectBox(span, 30, 44, 360, 160, C_BORDER, C_SURFACE2);
    span.appendChild(svgText(44, 64, '臂展：用柔顺手掌抱大物体（图 3 左）', 'demo-x-ink2', 11));
    var torsoR = paint(svgEl('rect', { x: 70, y: 150, width: 26, height: 24, rx: 3, 'stroke-width': 1.3 }), C_SURFACE, C_INK2);
    span.appendChild(torsoR);
    span.appendChild(svgText(83, 190, '躯干 13×9×12', 'demo-x-mut', 9, 'middle'));
    var bigBox = paint(svgEl('rect', { x: 150, y: 90, width: 0, height: 0, rx: 4, 'stroke-width': 1.5 }), C_SURFACE, C_GOOD);
    span.appendChild(bigBox);
    var bigT = paint(svgText(300, 190, '抱 27×24×31 cm³ 的箱子 ≈ 14 倍躯干体积', null, 9.5, 'middle'), C_GOOD);
    span.appendChild(bigT);
    var hugger = tbFront(span, C_INK2, 120);
    hugger.g.setAttribute('transform', 'translate(0 0)');
    /* 左下：负重 + 耐久 */
    var load = group(s);
    rectBox(load, 30, 216, 360, 188, C_BORDER, C_SURFACE);
    load.appendChild(svgText(44, 236, '负重、耐久与维修', 'demo-x-ink2', 11));
    var scaleBase = hline(load, 60, 330, 160, 330, C_MUTED, 3);
    var weights = [];
    for (var i = 0; i < 6; i++) { var wr = paint(svgEl('rect', { x: 90, y: 318 - i * 12, width: 40, height: 10, rx: 2 }), C_WARN); load.appendChild(wr); weights.push(wr); }
    var wT = svgText(110, 346, '', 'demo-x-ink2', 10, 'middle');
    load.appendChild(wT);
    load.appendChild(svgText(110, 360, '3D 打印的杯子让夹爪锁死，逐个加螺丝', 'demo-x-mut', 8.5, 'middle'));
    var endG = group(load);
    endG.appendChild(svgText(190, 262, '耐久：满电原地踏步', 'demo-x-ink2', 10));
    var endBar = hbar(endG, 190, 270, 14, C_GOOD, 0.85);
    var endT = svgText(190, 300, '', 'demo-x-good', 10);
    endG.appendChild(endT);
    endG.appendChild(svgText(190, 318, '电机发热 → 出了策略的训练分布 → 摔得变多', 'demo-x-mut', 8.5));
    var repG = group(load);
    repG.appendChild(svgText(190, 346, '摔 7 次才坏；修一次：', 'demo-x-ink2', 10));
    repG.appendChild(svgText(190, 362, '21 分钟打印 + 14 分钟装配（含校零）= 35 分钟', 'demo-x-good', 9.5));
    repG.appendChild(svgText(190, 390, '俯卧撑、引体向上零样本开环执行（图 4）', 'demo-x-mut', 8.5));
    /* 右：表 7 */
    var right = group(s);
    rectBox(right, 406, 44, 364, 360, C_BORDER, C_SURFACE2);
    right.appendChild(svgText(420, 64, '全向行走：方形轨迹，动捕记 10 次真机（表 7）', 'demo-x-ink2', 11));
    var sq = group(right);
    var cmd = pathLine(sq, [[440, 90], [540, 90], [540, 170], [440, 170], [440, 90]], C_MUTED, 1.4, '4 3');
    var simPts = [], realPts = [], rng = mulberry32(9);
    for (var k = 0; k <= 80; k++) {
      var u = k / 80, base;
      if (u < 0.25) base = [440 + 400 * u, 90]; else if (u < 0.5) base = [540, 90 + 320 * (u - 0.25)]; else if (u < 0.75) base = [540 - 400 * (u - 0.5), 170]; else base = [440, 170 - 320 * (u - 0.75)];
      var drift = 6 * Math.sin(u * 4 * Math.PI);
      simPts.push([base[0] + drift * 0.6, base[1] + 3 * Math.sin(u * 7)]);
      realPts.push([base[0] + drift + 4 * (rng() - 0.5), base[1] + 5 * Math.sin(u * 7) + 4 * (rng() - 0.5)]);
    }
    var simP = pathLine(sq, simPts, C_SIM, 1.8), realP = pathLine(sq, realPts, C_REAL, 1.6);
    sq.appendChild(svgText(560, 100, '灰：命令', 'demo-x-mut', 9)); sq.appendChild(svgText(560, 116, '蓝：仿真', 'demo-x-acc', 9)); sq.appendChild(svgText(560, 132, '橙：真机（10 次平均）', 'demo-x-warn', 9));
    sq.appendChild(svgText(560, 156, '原地转身弱 → 平移偏移', 'demo-x-mut', 8.5));
    sq.appendChild(svgText(560, 170, '（仿真和真机都偏离命令）', 'demo-x-mut', 8.5));
    var bars = group(right);
    bars.appendChild(svgText(420, 200, '跟踪误差（真机 ± 标准差）', 'demo-x-ink2', 10.5));
    var ROWS = [['位置 m', TABLE7.pos, 1000], ['线速度 m/s', TABLE7.linVel, 4000], ['角速度 rad/s', TABLE7.angVel, 1200]];
    var BY0 = 360, BX = [460, 580, 700];
    var tbars = ROWS.map(function (r, k) {
      var g = group(bars), x = BX[k];
      var bs = vbar(g, x - 28, BY0, 26, C_SIM, 0.9), br = vbar(g, x + 2, BY0, 26, C_REAL, 0.9);
      var vs = svgText(x - 15, 0, String(r[1][0]), 'demo-x-ink2', 9, 'middle'), vr = svgText(x + 15, 0, String(r[1][1]), 'demo-x-ink2', 9, 'middle');
      g.appendChild(vs); g.appendChild(vr);
      g.appendChild(svgText(x, BY0 + 14, r[0], 'demo-x-mut', 9, 'middle'));
      g.appendChild(svgText(x, BY0 + 27, '± ' + r[1][2], 'demo-x-mut', 8.5, 'middle'));
      return { bs: bs, br: br, vs: vs, vr: vr, hs: r[1][0] * r[2] / 10, hr: r[1][1] * r[2] / 10 };
    });
    var gapT = paint(svgText(420, 398, 'sim-to-real 差距（真机多的 0.016 m/s）比跟踪差距小 → 零样本成功', null, 9.5), C_GOOD);
    right.appendChild(gapT);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(span, seg(t, 0.2, 0.7));
      var bu = ease(seg(t, 0.6, 2.4));
      bigBox.setAttribute('width', (52 * bu).toFixed(1)); bigBox.setAttribute('height', (60 * bu).toFixed(1));
      bigBox.setAttribute('x', (300 - 26 * bu).toFixed(1)); bigBox.setAttribute('y', (110 + 20 * (1 - bu)).toFixed(1));
      hugger.put(300, 80, { armA: [1.35 * bu + 0.1, 2.3 * bu], armB: [1.35 * bu + 0.1, 2.3 * bu] });
      setOpacity(bigT, seg(t, 2.4, 2.9));
      setOpacity(load, seg(t, 3.6, 4.0));
      var n = Math.round(6 * ease(seg(t, 3.9, 5.4)));
      weights.forEach(function (w, k) { setOpacity(w, k < n ? 1 : 0.12); });
      wT.textContent = n ? Math.round(1484 * n / 6) + ' g' + (n === 6 ? '（体重的 40%）' : '') : '';
      setOpacity(endG, seg(t, 7.0, 7.4));
      var eu = ease(seg(t, 7.2, 9.0));
      setW(endBar, 180 * eu);
      endT.textContent = '最长 ' + Math.round(19 * eu) + ' 分钟不摔';
      setOpacity(repG, seg(t, 9.0, 9.5));
      setOpacity(right, seg(t, 10.4, 10.8));
      var su = seg(t, 10.6, 12.6);
      drawOn(cmd, su); drawOn(simP, su); drawOn(realP, su);
      setOpacity(bars, seg(t, 13.4, 13.8));
      tbars.forEach(function (b, k) {
        var hs = b.hs * ease(seg(t, 13.6 + k * 0.4, 14.2 + k * 0.4)), hr = b.hr * ease(seg(t, 13.9 + k * 0.4, 14.5 + k * 0.4));
        setH(b.bs, hs); setH(b.br, hr);
        b.vs.setAttribute('y', (BY0 - hs - 4).toFixed(1)); b.vr.setAttribute('y', (BY0 - hr - 4).toFixed(1));
        setOpacity(b.vs, seg(t, 14.1 + k * 0.4, 14.4 + k * 0.4)); setOpacity(b.vr, seg(t, 14.4 + k * 0.4, 14.7 + k * 0.4));
      });
      setOpacity(gapT, seg(t, 15.8, 16.3));
      void now;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 复刻验证、局限与之后 ── */
  function buildSceneRepro2() {
    var s = sceneSvg('左边是两台 ToddlerBot（Arya 和 Toddy）合作收玩具的八步故事板，小圆点一步步点亮，一台推着小车走；中间是复刻的证据：没做过硬件的学生 3 天、五个团队约一周、策略换机器人仍 90%；右边是局限和代码 2.0 的更新，最后一行引出下一篇：人类动作数据从哪里来');
    s.appendChild(svgText(30, 28, '可复现的证据、局限，以及之后', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 390, 200, C_BORDER, C_SURFACE2);
    left.appendChild(svgText(44, 64, '两台机器人合作收玩具（图 5）：Arya 与 Toddy', 'demo-x-ink2', 11));
    var GY = 196, RS = 150;
    hline(left, 44, GY, 406, GY, C_BORDER, 1.4);
    var arya = tbSide(left, C_GOOD, RS), toddy = tbSide(left, C_ACCENT, RS);
    var wagon = group(left);
    wagon.appendChild(paint(svgEl('rect', { x: 0, y: -22, width: 40, height: 20, rx: 3, 'stroke-width': 1.3 }), C_SURFACE, C_WARN));
    wagon.appendChild(paint(svgEl('circle', { cx: 8, cy: 0, r: 4 }), C_WARN)); wagon.appendChild(paint(svgEl('circle', { cx: 32, cy: 0, r: 4 }), C_WARN));
    var octo = dotAt(wagon, 20, -28, 5, '#c678dd');
    var steps = ['桌上粉章鱼', 'Arya 放进车', '走到把手', '抓把手', '推车过去', 'Toddy 到位', '跪下捡紫章鱼', '并肩离开'];
    var stepDots = steps.map(function (str, k) {
      var g = group(left);
      dotAt(g, 56 + k * 46, 222, 4, C_MUTED);
      g.appendChild(svgText(56 + k * 46, 238, str, 'demo-x-mut', 7.5, 'middle'));
      return g;
    });
    left.appendChild(svgText(44, 84, '绿：Arya　蓝：Toddy　橙：小车', 'demo-x-mut', 9));
    /* 中：复刻 */
    var mid = group(s);
    rectBox(mid, 30, 256, 390, 148, C_GOOD, C_SURFACE);
    mid.appendChild(paint(svgText(44, 276, '可复现（第 5 节、附录 8.16）', null, 11), C_GOOD));
    var repChips = [['没做过硬件的 CS 学生按手册装第二台：3 天（含打印）', C_GOOD], ['社区五组复刻，多数一周内完成（图 15）', C_GOOD], ['一台采的数据训的策略放到另一台：仍 90%（20 次）', C_ACCENT], ['RL 行走策略两台互换；第二台不用再做 sysID', C_ACCENT]].map(function (r, k) {
      return chip(mid, 44, 286 + k * 29, 364, r[0], r[1], { size: 9.5, h: 25 });
    });
    /* 右：局限与之后 */
    var right = group(s);
    rectBox(right, 436, 44, 334, 360, C_BORDER, C_SURFACE2);
    right.appendChild(paint(svgText(450, 64, '局限（第 7 节）', null, 11), C_BAD));
    var limRows = ['现成电机的转速、力矩和通信速度是天花板', '执行器模型不考虑温度，接近极限不准', '小尺寸只能和按比例缩小的物体打交道', '3D 打印件撞击后比金属壳更容易坏'].map(function (str, k) {
      var g = group(right);
      g.appendChild(svgText(450, 84 + k * 20, '· ' + str, 'demo-x-ink2', 9.5));
      return g;
    });
    var nextG = group(right);
    nextG.appendChild(paint(svgText(450, 184, '下一步与代码 2.0（2025-08）', null, 11), C_GOOD));
    var nextRows = ['自制通信板：控制频率 50 → 200 Hz', '执行器模型加热量；设计提强度', '立体视觉深度、多 IMU、触觉', '2.0：侧手翻、爬行、VR 遥操作'].map(function (str, k) {
      var g = group(nextG);
      g.appendChild(svgText(450, 204 + k * 20, '· ' + str, 'demo-x-ink2', 9.5));
      return g;
    });
    var img = robotImg(right, 712, 400, 112);
    var after = group(right);
    after.appendChild(svgRich(450, 312, '**三件事**：可复现当硬约束、30 自由度与接近人的 $\\tilde p$、两边都能采数据的工具链', { size: 9.5, w: 236, cls: 'demo-x-good' }));
    after.appendChild(svgText(450, 356, '真机数据靠遥操作，仿真数据靠数字孪生——', 'demo-x-ink2', 9.5));
    after.appendChild(svgText(450, 372, '那人类的动作数据从哪里来、怎样搬到机器人身上？', 'demo-x-ink2', 9.5));
    after.appendChild(svgText(450, 392, '下一篇：HumanML3D / GMR', 'demo-x-acc', 10));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.7));
      /* 故事板：每 2 s 一步，循环；Arya 推车从左往右走 */
      var ph = (now / 16) % 1, stepIdx = Math.floor(ph * 8);
      stepDots.forEach(function (g, k) { g.style.opacity = k <= stepIdx ? 1 : 0.35; g.firstChild.setAttribute('fill', k <= stepIdx ? C_GOOD : C_MUTED); });
      var walk = (now / 1.0) % 1;
      var ax = 120 + 200 * ph;
      var swing = 10 * Math.sin(walk * 2 * Math.PI);
      arya.put(ax, GY - 0.37 * RS, 0.04, [[ax + swing, GY - 0.02 * RS - 4 * Math.max(0, Math.sin(walk * 2 * Math.PI))], [ax - swing, GY - 0.02 * RS - 4 * Math.max(0, -Math.sin(walk * 2 * Math.PI))]], [1.0, 0.4]);
      wagon.setAttribute('transform', 'translate(' + (ax + 36).toFixed(1) + ' ' + (GY - 6).toFixed(1) + ')');
      setOpacity(octo, stepIdx >= 1 ? 1 : 0);
      var tx = 360;
      var kneel = stepIdx >= 6 ? 1 : 0;
      toddy.put(tx, GY - (0.37 - 0.12 * kneel) * RS, 0.3 * kneel, [[tx + 6, GY - 0.02 * RS], [tx - 6, GY - 0.02 * RS]], [0.9 * kneel + 0.1, 0.3]);
      setOpacity(mid, seg(t, 3.6, 4.0));
      repChips.forEach(function (c, k) { setOpacity(c, seg(t, 3.8 + k * 0.6, 4.3 + k * 0.6)); });
      setOpacity(right, seg(t, 7.0, 7.4));
      limRows.forEach(function (g, k) { setOpacity(g, seg(t, 7.2 + k * 0.5, 7.6 + k * 0.5)); });
      setOpacity(nextG, seg(t, 10.4, 10.8));
      nextRows.forEach(function (g, k) { setOpacity(g, seg(t, 10.6 + k * 0.5, 11.0 + k * 0.5)); });
      setOpacity(img.g, seg(t, 10.4, 11.0));
      setOpacity(after, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  var TB_SCENES = [
    {
      title: '研究要的平台和工业要的不一样',
      dur: 17,
      build: buildSceneWhy,
      cues: [
        { at: 0.3, s: '传统机器人设计优先**执行器强度、传感器精度、机械精度**；做研究要的却是便宜、快速可修、全栈透明没有黑盒（第 1 节）。' },
        { at: 3.6, s: '还有一条：数据驱动的学习方法要求平台**天生能在仿真和真机两边采观测—动作数据**——行走靠大规模仿真，操作靠真机示范，两种数据互补。' },
        { at: 7.0, s: 'ToddlerBot：0.56 m、3.4 kg、30 个主动自由度，全 3D 打印加现成 Dynamixel，不到 6000 美元。小人形便宜、好修、安全，一个人带台笔记本就能做实验。' },
        { at: 10.4, s: '小人形被看低主要因为**自由度少**（表 1：NAO 23、OP3 20、BRUCE 16、Zeroth 16）；ToddlerBot 的 30 个比它们都多，离人体的 32 最近。' },
        { at: 13.4, s: '三条贡献：第一台 30 自由度的小型人形；一套完整的 sysID 流水线保证数字孪生；一套全身遥操作方案在真机上采移动操作数据。' }
      ]
    },
    {
      title: '30 个自由度与三种传动',
      dur: 17,
      build: buildSceneDof,
      cues: [
        { at: 0.3, s: '每条手臂 **7 个**自由度（肩 3、肘 2、腕 2），用直齿轮做轴对齐的传动，保证灵活性和可达范围（第 3.2 节、图 2）。' },
        { at: 3.6, s: '每条腿 **6 个**（髋 3、膝 1、踝 2），颈 2 个（俯仰走平行连杆）、腰 2 个（耦合锥齿轮）；合计 30，不含可两分钟互换的夹爪 / 柔顺手掌。' },
        { at: 7.0, s: '空间有限，电机常放不进关节轴。**直齿轮**：1:1 挪轴、变比放大力矩、副轴配轴承分担载荷——XC330 的输出轴只有特氟龙衬套，髋偏航就靠它卸力。' },
        { at: 10.4, s: '**耦合锥齿轮**：腰里两个同向电机驱动偏航与横滚，每个轴上两个电机合力——一个 XC330 带不动上半身，两个合起来够（附录 8.4）。' },
        { at: 13.4, s: '**平行连杆**：膝电机放高减小惯量，颈的电机放进头里。MuJoCo 里分别用关节等式约束、固定肌腱、焊接约束建模，经验上 sim-to-real 差距小。' }
      ]
    },
    {
      title: '可复现是硬约束',
      dur: 17,
      build: buildSceneRepro,
      cues: [
        { at: 0.3, s: '可复现的定义：**一个人在家、不用专用设备就能复刻整套系统**。平台造出来别人复刻不了，就没有价值，所以当硬约束（第 3.1 节）。' },
        { at: 3.6, s: '为什么敢全 3D 打印（附录 8.1）：悬臂梁 $\\delta/L \\propto P/(3EL^2)$，结构越小相对挠度越小——小尺寸的打印件和全尺寸的铝件强度相当，换金属反而降低可复现性。' },
        { at: 7.0, s: '性能关键的电机、轴承只用现成件：Dynamixel 可靠好买，5 V TTL、2 Mbaud，30 个电机 50 Hz 读全状态；背隙约 0.25°、编码器 4096 → 0.09°（附录 8.6）。' },
        { at: 10.4, s: 'BOM 不到 **6000 美元**，九成是电机和 Jetson；表 1 里比它便宜的只有 Berkeley Lite（5K、22 自由度）和 Zeroth（1.4K、16 自由度）。' },
        { at: 13.4, s: '装配与维护（附录 8.2）：螺丝种类少、螺丝刀入口畅通、模块化好换；两台样机测了一年多，可靠性「和商用平台相当」。' }
      ]
    },
    {
      title: '功率因子与电机选型',
      dur: 17,
      build: buildScenePower,
      cues: [
        { at: 0.3, s: '让 1.8 m 和 0.5 m 的人形都跳 0.5 m 不公平，应该跳身高的 10%；两台人形做同一串归一化动作、用掉各自电机最大功率的同一比例，才算性能相同（附录 8.5）。' },
        { at: 3.6, s: '功率因子 $\\tilde p = \\sum_i|\\tau_i^{\\max}| / (h\\,m\\,g)$：全部电机最大力矩之和除以身高、体重和 $g$。不除以自由度数——1 个和 100 个同样的自由度不该得同分。' },
        { at: 7.0, s: '图 8：ToddlerBot **2.74 = 1.40 + 1.35**，最接近人的 2.22；NAO 5.02、OP3 4.68、Berkeley Humanoid 4.34、G1 3.46。至少要超过人，远超则动作不自然、电机占体积、续航短。' },
        { at: 10.4, s: '式 5 按 $h\\,m$ 的比例把人跑步、爬坡的关节力矩换算过来：0.5 m、3.1 kg 时膝要 **2.35**、踝俯仰 **2.66**、髋俯仰 **1.77** N·m。' },
        { at: 13.4, s: '表 2：XM430（3.0 N·m）是唯一够膝和踝的；髋用一体双轴的 2XC430（1.8）；颈、腰、髋偏航、夹爪用最小的 XC330（1.0）；手臂用低价的 2XL430（1.5）。' }
      ]
    },
    {
      title: '数字孪生之一：零点校准',
      dur: 17,
      build: buildSceneCalib,
      cues: [
        { at: 0.3, s: '数字孪生分两件事：**零点校准管运动学对不对，电机 sysID 管动力学准不准**（第 3.3 节）。Dynamixel 没有绝对零点，每次重装都得重校。' },
        { at: 3.6, s: '一套 3D 打印的校准卡具（图 10：橙色手臂、黄色颈、红色髋、米色踝）按箭头插进去，「咔」一声卡住，关节就锁在零点。' },
        { at: 7.0, s: '一分钟内完成。零点定义为站直、双臂平行贴着身体；膝的零点就是下限位，用止挡当参考；夹爪的零点是张开位置。' },
        { at: 10.4, s: '代码里第一步 `calibrate_zero.py` 读当前电机位置写进配置；代码 2.0 的卡具除膝以外每个关节都加强了锁定。' },
        { at: 13.4, s: '若校完站着仍前倾（关节有背隙），第二步 `calibrate.py` 用 IMU 的躯干俯仰做反馈的 PID 让它站直，按下 Ctrl+C 时把这一刻存成零点。' }
      ]
    },
    {
      title: '数字孪生之二：电机台架辨识',
      dur: 17,
      build: buildSceneTestbed,
      cues: [
        { at: 0.3, s: '每个电机家族的齿轮箱、减速比、内核都不同，静摩擦、反驱阻力、阻尼、惯量都不一样；论文做了一台台架（图 11）：待测电机—快接轴—扭矩传感器—粉末制动器。' },
        { at: 3.6, s: 'MuJoCo 的执行器被动特性主要是三个值（附录 8.9）：**frictionloss** $\\tau_f$、**damping** $d$、**armature** $I$；不建静摩擦峰，阻力就是 $\\tau_r = \\tau_f + d\\dot q$（式 6）。' },
        { at: 7.0, s: '反驱：以恒定转速带着电机转、记阻力矩，对力矩—转速做线性拟合——截距是摩擦损耗，斜率是阻尼。XC330：0.036 N·m 与 0.0036 N·m·s/rad，1 rad/s 时阻力 0.0396。' },
        { at: 10.4, s: 'armature 用自由旋转衰减：转起来再断电，用刚测的阻尼把阻力功率积分得储能 $E$，再 $I = 2E/\\omega^2$（式 7）。按表 3 算，XC330 从 5 rad/s 到停只要 0.45 s。' },
        { at: 13.4, s: '台架规格：5 N·m 可控刹车、1 N·m 主动驱动、扭矩精度 $3\\times10^{-4}$ N·m；测试流程与分析代码自动在 MuJoCo 里辨识，「将随发布开源」。' }
      ]
    },
    {
      title: '数字孪生之三：9 参数执行器模型',
      dur: 17,
      build: buildSceneActuator,
      cues: [
        { at: 0.3, s: '台架上发现电机**一上电就有明显的额外阻尼**，哪怕 $k_d = 0$——建成 $k_d^{\\min}$：$\\tau_m = k_p(\\hat q - q) - (k_d^{\\min} + k_d)\\dot q$（式 8）；Dynamixel 的无量纲 $k_p$ 除以约 150 才是物理增益。' },
        { at: 3.6, s: '力矩上限随速度变（式 9、图 12）：低速是常数 $\\tau_{\\max}$，超过 $\\dot q_{\\tau_{\\max}}$ 后线性下降，过了 $\\dot q_{\\max}$ 没有力矩；减速方向另设一个更大的刹车力矩 $\\tau_{\\text{brake}}$。' },
        { at: 7.0, s: '被反驱时外力矩被齿轮箱的低效率吃掉，$k_p$ 显得大 3 倍——「被动 / 主动比」$= 1/\\eta^2$，对应效率约 58%。单电机玩具里，九个参数全对时仿真和「真机」重合。' },
        { at: 10.4, s: '一项项拿掉再比：$k_d^{\\min}$ 影响最大（差 **4.32°**），被动 / 主动比 1.90°、力矩上限 1.53°、armature 0.90°；摩擦损耗和阻尼在 chirp 里几乎看不出（0.24° / 0.09°）。' },
        { at: 13.4, s: '真机上让电机跟 chirp（0.1 → 10 Hz），用跟踪数据**联合优化 9 个参数**，约束范围才收敛；最终平均跟踪误差 **1.3°**。同型号参数几乎一样，第二台不用重做。' }
      ]
    },
    {
      title: '遥操作装置与两层 PD',
      dur: 17,
      build: buildSceneTeleop,
      cues: [
        { at: 0.3, s: '采真机数据（第 3.3 节）：再做一副 ToddlerBot 的上半身当**领导臂**，操作员推它，跟随机器人的手臂跟着走（受 ALOHA、GELLO 启发）。' },
        { at: 3.6, s: '夹爪的握持区嵌两片**力敏电阻**，捏多重夹爪合多紧；其他部位用掌机（Steam Deck / ROG Ally X）：摇杆走、转、蹲，按钮控腰和颈、按住触发策略（表 4）。' },
        { at: 7.0, s: '下半身怎么站稳（第 4.3 节）：上半身跟领导臂的位置命令，下半身跑**两层 PD**。第一层**质心 PD**把质心拉回支撑多边形中心，对付手臂动作带来的偏移。' },
        { at: 10.4, s: '第二层**躯干俯仰 PD**用 IMU 让躯干保持直立，对付举重物时的前倾。代码：质心 $k_p = 1$，俯仰 $k_p = 0.2$、$k_d = 0.01$，负重测试时目标后仰 0.7 rad。' },
        { at: 13.4, s: '记什么：领导臂的电机位置是动作，跟随机器人的电机位置和相机 RGB 是观测；上半身用低 P 增益，力就藏在领导—跟随的差里。**20 分钟采 60 条**。' }
      ]
    },
    {
      title: '采仿真数据：关键帧动画与 RL 行走',
      dur: 17,
      build: buildSceneSimData,
      cues: [
        { at: 0.3, s: '关键帧动画只给运动学、不保证动力学可行（第 4.1 节）；论文做了 MuJoCo + GUI 的工具，实时调关键帧、在数字孪生里验证。' },
        { at: 3.6, s: '拥抱、俯卧撑、引体向上这些开环轨迹就这样来的：一条仿真里设计的轨迹，**零样本**在真机上执行；文档说多数关键帧几乎不用调。' },
        { at: 7.0, s: 'RL 行走（第 4.2 节）：观测是相位、速度命令、相对中立姿态的关节偏移、关节速度、上一步动作、躯干朝向和角速度（式 1），输出 PD 的关节设定点。' },
        { at: 10.4, s: '奖励三类（式 2）：模仿项跟上**闭式 ZMP 解**生成的参考步态；正则项放步态启发（腾空时间 500、抬脚、不打滑、力矩、能量……）；生存项 10 防早摔（表 6）。' },
        { at: 13.4, s: 'PPO 在 MJX + Brax 里训（表 5）：1024 个环境、$3\\times10^8$ 步、回合 1000 步、(512, 256, 128)、$\\gamma = 0.97$；推理在 Jetson 的 CPU 上 50 Hz。' }
      ]
    },
    {
      title: '采真机数据训扩散策略',
      dur: 17,
      build: buildSceneDP,
      cues: [
        { at: 0.3, s: '扩散策略（附录 8.13）：RGB 裁剪并下采样到 **96×96**，ImageNet 预训练的 ResNet 提特征；领导臂和跟随机器人的关节角都降到 10 Hz，前者是动作、后者是观测。' },
        { at: 3.6, s: '训练 100 步 DDPM，推理在 Jetson Orin NX 上只用 **3 步**就够；模型 3 亿参数，GPU 上延迟 < 0.1 s，10 Hz 不卡顿。' },
        { at: 7.0, s: '力从哪来：采数据时上半身电机用低比例增益防过载，操作力就体现在领导与跟随关节角的**差**里，策略把这个差学进去。每个任务 60 条演示。' },
        { at: 10.4, s: '动作块：每次预测 **16 步**，丢掉前 3 步补偿延迟（UMI 的做法），执行接下来 5 步——0.3 s 的余量比 0.1 s 的推理长，每 0.5 s 重新预测。' },
        { at: 13.4, s: '20 次测试：双臂把章鱼玩具从桌上搬进小车 **90%**，全身跪下从地上捡 **75%**；转腰、松手、跪下这些用开环动作，提高采集效率。' }
      ]
    },
    {
      title: '实验：臂展、负重、耐久与表 7',
      dur: 17,
      build: buildSceneExperiments,
      cues: [
        { at: 0.3, s: '臂展：遥操作用柔顺手掌抱大物体、同时保持平衡，最大 **27×24×31 cm³**，约 14 倍躯干（13×9×12）体积（图 3 左）。' },
        { at: 3.6, s: '负重：3D 打印一个杯子让夹爪锁死，逐个加螺丝直到摔倒——**1484 g**，体重 3484 g 的 40%；既测上半身的举力，也测下半身的平衡。' },
        { at: 7.0, s: '耐久：满电跑 RL 行走原地踏步，最长 **19 分钟**不摔；电机温度升高后逐渐出了训练分布，摔得变多。摔 7 次才坏，修一次 21 分钟打印 + 14 分钟装配。' },
        { at: 10.4, s: '全向行走：RL 策略跟踪带速度曲线的方形轨迹，动捕记 10 次真机（图 3 右）。仿真和真机都偏离命令——策略原地转身弱，造成平移偏移。' },
        { at: 13.4, s: '表 7：位置误差仿真 0.082、真机 $0.133 \\pm 0.018$ m；线速度 0.016 对 0.032 m/s；角速度 0.056 对 0.113 rad/s。sim-to-real 差距明显小于跟踪差距，零样本成功。' }
      ]
    },
    {
      title: '可复现的证据、局限与之后',
      dur: 17,
      build: buildSceneRepro2,
      cues: [
        { at: 0.3, s: '两台 ToddlerBot（Arya、Toddy）合作收玩具（图 5）：粉章鱼进车、走到把手、推车到紫章鱼旁、Toddy 跪下捡起、并肩离开——八步长时程串联。' },
        { at: 3.6, s: '可复现的证据：没做过硬件的 CS 学生按开源手册 **3 天**装出第二台；社区五组复刻多数一周内完成；一台采的数据训的策略放到另一台仍 90%，RL 行走策略互换。' },
        { at: 7.0, s: '局限（第 7 节）：现成电机的转速、力矩和通信速度是天花板；执行器模型不考虑温度，接近极限不准；小尺寸只能和缩小的物体打交道；打印件撞击后更容易坏。' },
        { at: 10.4, s: '下一步：自制通信板提高控制频率（代码 2.0 已到 200 Hz）、执行器模型加热量、改设计提强度、立体视觉深度、多 IMU、触觉；2.0 还加了侧手翻、爬行、VR 遥操作。' },
        { at: 13.4, s: '三件事记住它：可复现当硬约束、30 自由度与接近人的 $\\tilde p$、两边都能采数据的工具链。真机数据靠遥操作、仿真数据靠数字孪生——那**人类的动作数据**从哪里来、怎样搬到机器人身上？' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十二幕动画：ToddlerBot 全流程速览',
      sub: '约 204 秒自动播放。空格播放/暂停，← → 换幕；论文数字照抄 arXiv v4 的正文与附录表，官方代码 2.0 的数单独标出；第 6、7 幕的单电机玩具与下面三个演示、笔记「具体实例」用的是同一份数。',
      ariaLabel: 'ToddlerBot 十二幕讲解动画',
      notes: [
        '取数依据：第 1、3、11、12 幕照抄摘要、第 1、3、5、7 节与表 1、表 7（arXiv 2502.00893 v4，CoRL 2025）；第 2 幕照抄第 3.2 节与附录 8.4；第 4 幕照抄附录 8.5–8.6（式 4–5、表 2、图 8 按图上标的数）；第 5 幕照抄第 3.3 节与附录 8.8；第 6 幕照抄附录 8.9（式 6–7）；第 7 幕照抄附录 8.10（式 8–10、表 3）；第 8 幕照抄第 3.3、4.3 节与附录 8.11；第 9 幕照抄第 4.1–4.2 节与附录表 5–6；第 10 幕照抄附录 8.13。' +
          '第 5 幕的两步脚本、第 7 幕的 $k_p$ 换算 150、第 8 幕的质心与俯仰增益、第 7 幕 chirp 的频率与幅值取自官方代码 `hshi74/toddlerbot`。',
        '**示意与玩具**：机器人示意按正视 / 侧视的方块小人画，齿轮、连杆、卡具、故事板都是示意；第 3 幕的梁、第 6 幕的散点与 0.45 s、第 7 幕的 chirp 曲线与「拿掉一项差多少」是我们算的单电机玩具（表 3 的 XC330 + 21700 电芯负载），不是论文的台架或仿真；第 11 幕的方形轨迹与第 12 幕的收玩具按图的形状画，不是逐点读数。真机图取自 Robot_Description_Gallery（按官方 URDF `toddlerbot_2xc` 渲染）。'
      ],
      scenes: TB_SCENES
    });
  }

  // ─── the narrated vertical video of the same twelve scenes ─────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：ToddlerBot 十二幕全流程',
      sub: '13 分 21 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十二幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '14.0 MB',
      fileName: 'ToddlerBot_讲解视频.mp4'
    });
  }

  K.mount({
    'tb-explainer': buildExplainerDemo,
    'tb-video': buildVideoDemo,
    'tb-actuator': buildActuatorDemo,
    'tb-sysid': buildSysIdDemo,
    'tb-power': buildPowerDemo
  });
})();
