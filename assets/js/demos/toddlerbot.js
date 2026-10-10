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
  /* 注意：K.paint 写的是 style.fill / style.stroke，动画里改色要改 style，setAttribute('fill') 会被它盖住、不起作用 */
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

  /* 侧视的人（跑步）：圆头 + 躯干 + 摆臂摆腿，put(x, yFoot, h, clock) 按身高 h 画、1.4 s 一步的原地跑 */
  function humanIcon(parent, color) {
    var g = group(parent);
    var head = paint(svgEl('circle', { r: 4, 'stroke-width': 1.4 }), C_SURFACE, color);
    var parts = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function () { var l = paint(svgEl('line', { 'stroke-width': 2, 'stroke-linecap': 'round' }), null, color); g.appendChild(l); return l; });
    g.appendChild(head);
    function put(x, yFoot, h, clock) {
      var ph = (clock / 0.7) * Math.PI, hip = [x, yFoot - 0.5 * h], neck = [x + 0.04 * h, yFoot - 0.84 * h];
      head.setAttribute('r', (0.07 * h).toFixed(1)); moveDot(head, [neck[0] + 0.02 * h, neck[1] - 0.09 * h]);
      setLine(parts[0], hip[0], hip[1], neck[0], neck[1]);
      [0, 1].forEach(function (k) {
        var a = (k ? 1 : -1) * 0.6 * Math.sin(ph);
        var knee = [hip[0] + 0.25 * h * Math.sin(a), hip[1] + 0.25 * h * Math.cos(a)];
        var b = a - 0.5 - 0.4 * Math.max(0, -Math.cos(ph + (k ? Math.PI : 0)));
        var foot = [knee[0] + 0.25 * h * Math.sin(b), knee[1] + 0.25 * h * Math.cos(b)];
        setLine(parts[1 + k * 2], hip[0], hip[1], knee[0], knee[1]); setLine(parts[2 + k * 2], knee[0], knee[1], foot[0], foot[1]);
        var sa = -a, sh = [neck[0], neck[1] + 0.04 * h];
        var el = [sh[0] + 0.16 * h * Math.sin(sa), sh[1] + 0.16 * h * Math.cos(sa)];
        var hd = [el[0] + 0.14 * h * Math.sin(sa + 1.2), el[1] + 0.14 * h * Math.cos(sa + 1.2)];
        setLine(parts[5 + k * 2], sh[0], sh[1], el[0], el[1]); setLine(parts[6 + k * 2], el[0], el[1], hd[0], hd[1]);
      });
    }
    return { g: g, put: put };
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
    var img = robotImg(mid, 304, 204, 158);
    var midT = group(mid);
    /* 身高画成图旁的标尺，底下只留两个数 */
    hline(midT, 384, 46, 384, 204, C_INK2, 1.2);
    [46, 204].forEach(function (y) { hline(midT, 379, y, 389, y, C_INK2, 1.2); });
    midT.appendChild(svgText(392, 129, '0.56 m', 'demo-x-ink2', 10));
    midT.appendChild(svgText(337, 222, '3.4 kg · 30 个自由度', 'demo-x-ink2', 10.5, 'middle'));
    midT.appendChild(svgText(337, 238, '全 3D 打印 · < 6000 美元', 'demo-x-mut', 10, 'middle'));
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
    /* 「行走靠仿真、操作靠真机」画成两个小图标：跑步机上走的小人、开合的夹爪 */
    var useG = group(right);
    var walker = tbSide(useG, C_SIM, 34);
    hline(useG, 470, 150, 520, 150, C_SIM, 1.4);
    useG.appendChild(paint(svgText(528, 146, '行走', null, 10), C_SIM));
    var jawA = hline(useG, 0, 0, 0, 0, C_REAL, 2.4), jawB = hline(useG, 0, 0, 0, 0, C_REAL, 2.4);
    var cube = paint(svgEl('rect', { x: 489, y: 208, width: 10, height: 10, rx: 1.5 }), C_REAL);
    cube.style.opacity = 0.6; useG.appendChild(cube);
    useG.appendChild(paint(svgText(528, 220, '操作', null, 10), C_REAL));
    /* 底：表 1 的小人形 */
    var bot = group(s);
    rectBox(bot, 30, 250, 740, 164, C_BORDER, C_SURFACE2);
    bot.appendChild(svgText(44, 270, '表 1：小型人形的主动自由度（人体主要动作约 32 个旋转关节）', 'demo-x-ink2', 11.5));
    var small = [['Zeroth', 16, 1.4], ['BRUCE', 16, 6.5], ['Robotis OP3', 20, 11], ['NAO H25', 23, 14], ['Berkeley Lite', 22, 5], ['ToddlerBot', 30, 6]];
    var BY = 384, BS = 2.5;
    var bars = small.map(function (r, k) {
      var x = 70 + k * 112, isT = r[0] === 'ToddlerBot';
      var b = vbar(bot, x, BY, 44, isT ? C_GOOD : C_MUTED, isT ? 0.95 : 0.6);
      var v = paint(svgText(x + 22, 0, String(r[1]), null, 11, 'middle'), C_INK);
      bot.appendChild(v);
      bot.appendChild(svgText(x + 22, BY + 13, r[0], isT ? 'demo-x-good' : 'demo-x-mut', 9.5, 'middle'));
      bot.appendChild(svgText(x + 22, BY + 25, r[2] + 'K 美元', 'demo-x-mut', 9, 'middle'));
      return { b: b, v: v, h: r[1] * BS };
    });
    hline(bot, 60, BY - 32 * BS, 760, BY - 32 * BS, C_BAD, 1, '4 3');
    bot.appendChild(paint(svgText(756, BY - 32 * BS - 4, '人 32', null, 9.5, 'end'), C_BAD));
    /* 三条贡献写成三个短 chip，各自点亮画面里对应的东西：① ToddlerBot 的柱、② 仿真盒、③ 真机盒 */
    var contribs = [['① 30 自由度小人形', C_GOOD], ['② sysID → 数字孪生', C_SIM], ['③ 全身遥操作', C_REAL]].map(function (r, k) {
      return chip(bot, 44 + k * 150, 278, 140, r[0], r[1], { size: 10, h: 22 });
    });
    var tbX = 70 + 5 * 112;
    var tbRing = paint(svgEl('rect', { x: tbX - 4, y: BY - 30 * BS - 4, width: 52, height: 30 * BS + 4, rx: 4, fill: 'none', 'stroke-width': 2 }), null, C_GOOD);
    bot.appendChild(tbRing);

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
      setOpacity(useG, seg(t, 5.6, 6.2));
      /* 跑步机上走：支撑脚随履带匀速后退、摆动脚抬起前移（1 s 一个周期） */
      var wph = now % 1, sp = 14;
      function treadFoot(ph) { return ph < 0.5 ? [495 + sp / 2 - sp * (ph / 0.5), 149] : [495 - sp / 2 + sp * ((ph - 0.5) / 0.5), 149 - 4 * Math.sin(Math.PI * (ph - 0.5) / 0.5)]; }
      walker.put(495, 149 - 0.37 * 34, 0.05, [treadFoot(wph), treadFoot((wph + 0.5) % 1)], [0.3 * Math.sin(2 * Math.PI * wph), 0.3]);
      var jaw = 0.5 + 0.5 * Math.sin(now * 2.2);
      setLine(jawA, 480, 204, 487 - 4 * jaw, 220); setLine(jawB, 508, 204, 501 + 4 * jaw, 220);
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
        b.v.setAttribute('y', (BY - h + 15).toFixed(1));  // 数字写在柱顶里面，不和「人 32」虚线、贡献那一行抢位置
        setOpacity(b.v, seg(t, 11.2 + k * 0.3, 11.5 + k * 0.3));
      });
      contribs.forEach(function (c, k) { setOpacity(c, seg(t, 13.6 + k * 1.0, 14.0 + k * 1.0)); });
      /* 点亮：亮起后呼吸几下再停在描边 */
      function pulse(a) { var u = seg(t, a, a + 0.4); return u * (0.6 + 0.4 * Math.cos(now * 4)); }
      setOpacity(tbRing, pulse(13.6));
      simBox.firstChild.setAttribute('stroke-width', (1.3 + 1.6 * pulse(14.6)).toFixed(2));
      realBox.firstChild.setAttribute('stroke-width', (1.3 + 1.6 * pulse(15.6)).toFixed(2));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 30 个自由度与三种传动 ── */
  function buildSceneDof() {
    var s = sceneSvg('左边是正视的 ToddlerBot 示意，关节一组组亮起来，旁边的小圆牌写着每处几个自由度：肩 3、肘 2、腕 2、髋 3、膝 1、踝 2、颈 2、腰 2，合计 30；右边三个小机构在动：一对等大的直齿轮把转动挪到另一根轴、一对大小齿轮把力矩放大一倍，两个电机经耦合锥齿轮一起驱动腰的偏航和横滚，一条腿上电机放在大腿高处、经平行连杆带动膝，头里的电机带着颈俯仰');
    s.appendChild(svgText(30, 28, '30 个主动自由度：7 + 7 + 6 + 6 + 2 + 2，三种传动把电机塞进小身体', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 250, 360, C_BORDER, C_SURFACE2);
    var S = 300;
    var fig = tbFront(left, C_INK2, S, { joints: true });
    var pts = fig.put(155, 64, { armA: [0.35, 0.3], armB: [0.35, 0.3] });
    Object.keys(fig.joints).forEach(function (k) { fig.joints[k].style.opacity = 0; });
    var groups = [
      { keys: ['shL', 'elL', 'wrL', 'shR', 'elR', 'wrR'], n: 14, color: C_ACCENT, at: 0.6, badges: [['shR', 3], ['elR', 2], ['wrR', 2]] },
      { keys: ['hipL', 'kneeL', 'ankL', 'hipR', 'kneeR', 'ankR'], n: 12, color: C_GOOD, at: 3.9, badges: [['hipR', 3], ['kneeR', 1], ['ankR', 2]] },
      { keys: ['neck'], n: 2, color: C_WARN, at: 5.4, badges: [['neck', 2]] },
      { keys: ['waist'], n: 2, color: C_WARN, at: 6.0, badges: [['waist', 2]] }
    ];
    /* 每处几个自由度直接写在关节圆圈里（只标右半身，左右对称）：挂在旁边的牌会压到头、手臂 */
    var badgeG = groups.map(function (gr) {
      var g = group(left);
      gr.badges.forEach(function (b) {
        var p = b[0] === 'waist' ? [pts.waist[0], pts.waist[1] - 10] : pts[b[0]];  // 腰的牌往上挪进躯干，免得贴着髋的牌
        g.appendChild(paint(svgEl('circle', { cx: p[0], cy: p[1], r: 6.8, 'stroke-width': 1.4 }), C_SURFACE, gr.color));
        g.appendChild(paint(svgText(p[0], p[1] + 3.3, String(b[1]), null, 9.5, 'middle'), gr.color));
      });
      return g;
    });
    var legend = [['手臂 7 × 2', C_ACCENT, 48], ['腿 6 × 2', C_GOOD, 120], ['颈 2', C_WARN, 182], ['腰 2', C_WARN, 224]].map(function (r) {
      var n = paint(svgText(r[2], 300, r[0], null, 10.5), r[1]); left.appendChild(n); return n;
    });
    var counter = paint(svgText(155, 380, '', null, 15, 'middle'), C_GOOD);
    left.appendChild(counter);
    var endT = svgText(155, 340, '末端不算：夹爪 ↔ 柔顺手掌，两分钟换', 'demo-x-mut', 9.5, 'middle');
    left.appendChild(endT);
    /* 右：三种传动 */
    var right = group(s);
    rectBox(right, 296, 44, 474, 360, C_BORDER, C_SURFACE);
    right.appendChild(svgText(310, 64, '三种传动（附录 8.4、图 7）', 'demo-x-ink2', 11.5));
    /* 齿轮：z 个齿，齿根半径 r、齿顶 r + 5；齿占每个齿距的前一半。两轮中心距 r1 + r2 + 5、齿距弧长相同（z ∝ r），
       第二个轮按 -θ z1 / z2 反转；z2 为偶数时相位取 0，正好齿对齿槽（齿对齿会顶住） */
    function gear(parent, cx, cy, r, color, teeth) {
      var g = group(parent), d = '';
      for (var i = 0; i < teeth; i++) {
        var a0 = (i / teeth) * 2 * Math.PI, a1 = ((i + 0.5) / teeth) * 2 * Math.PI, a2 = ((i + 1) / teeth) * 2 * Math.PI, tq = 0.18 * (Math.PI / teeth);
        d += (i ? ' L ' : 'M ') + (cx + r * Math.cos(a0)).toFixed(1) + ' ' + (cy + r * Math.sin(a0)).toFixed(1) +
          ' L ' + (cx + (r + 5) * Math.cos(a0 + tq)).toFixed(1) + ' ' + (cy + (r + 5) * Math.sin(a0 + tq)).toFixed(1) +
          ' L ' + (cx + (r + 5) * Math.cos(a1 - tq)).toFixed(1) + ' ' + (cy + (r + 5) * Math.sin(a1 - tq)).toFixed(1) +
          ' L ' + (cx + r * Math.cos(a1)).toFixed(1) + ' ' + (cy + r * Math.sin(a1)).toFixed(1) +
          ' L ' + (cx + r * Math.cos(a2)).toFixed(1) + ' ' + (cy + r * Math.sin(a2)).toFixed(1);
      }
      g.appendChild(paint(svgEl('path', { d: d + ' Z', 'stroke-width': 1.3 }), C_SURFACE2, color));
      g.appendChild(paint(svgEl('circle', { cx: cx, cy: cy, r: 2.6 }), color));
      return { g: g, cx: cx, cy: cy };
    }
    function spin(gr, deg) { gr.g.setAttribute('transform', 'rotate(' + deg.toFixed(1) + ' ' + gr.cx + ' ' + gr.cy + ')'); }
    function mujocoTag(parent, y, str) { var n = svgText(756, y, 'MuJoCo：' + str, 'demo-x-good', 9.5, 'end'); parent.appendChild(n); return n; }
    var tags = [];
    /* ① 直齿轮：左一对等大（1:1，只把转动挪到另一根轴，副轴装轴承），右一对小带大（2:1，力矩 × 2、转速 ÷ 2） */
    var spurG = group(right);
    spurG.appendChild(paint(svgText(310, 92, '① 直齿轮（手臂、夹爪、髋偏航）', null, 11), C_ACCENT));
    tags.push(mujocoTag(spurG, 92, '关节等式约束'));
    var ga = gear(spurG, 346, 140, 18, C_ACCENT, 10), gb = gear(spurG, 346 + 41, 140, 18, C_ACCENT, 10);
    var linkA = hline(spurG, 0, 0, 0, 0, C_INK2, 3);
    var bearing = group(spurG);
    bearing.appendChild(paint(svgEl('circle', { cx: 387, cy: 140, r: 8.5, fill: 'none', 'stroke-width': 1.2, 'stroke-dasharray': '2 2' }), null, C_WARN));
    spurG.appendChild(svgText(366, 184, '1 : 1 挪轴', 'demo-x-ink2', 10, 'middle'));
    spurG.appendChild(paint(svgText(411, 164, '轴承', null, 9), C_WARN));  // 放在齿轮右下，输出杆只在上半圈摆
    var gc = gear(spurG, 468, 140, 12, C_ACCENT, 6), gd = gear(spurG, 468 + 41, 140, 24, C_ACCENT, 12);
    var linkB = hline(spurG, 0, 0, 0, 0, C_INK2, 3);
    spurG.appendChild(svgText(492, 184, '2 : 1 力矩 × 2', 'demo-x-ink2', 10, 'middle'));
    spurG.appendChild(svgText(560, 136, '副轴的轴承替电机扛横向力：', 'demo-x-mut', 9.5));
    spurG.appendChild(svgText(560, 152, 'XC330 的输出轴只有衬套，会晃', 'demo-x-mut', 9.5));
    /* ② 耦合锥齿轮：腰的两个自由度 = 两个电机转角的和与差；两个电机同时出力，每个轴上都是两份力矩 */
    var bevG = group(right);
    bevG.appendChild(paint(svgText(310, 204, '② 耦合锥齿轮（腰）', null, 11), C_WARN));
    tags.push(mujocoTag(bevG, 204, '固定肌腱'));
    function motorIcon(parent, cx, cy, lab) {
      var g = group(parent);
      g.appendChild(paint(svgEl('rect', { x: cx - 22, y: cy - 11, width: 44, height: 22, rx: 4, 'stroke-width': 1.3 }), C_SURFACE2, C_WARN));
      g.appendChild(svgText(cx - 7, cy + 3.5, lab, 'demo-x-ink2', 9, 'middle'));
      g.appendChild(paint(svgEl('circle', { cx: cx + 14, cy: cy, r: 5.5, fill: 'none', 'stroke-width': 1.2 }), null, C_WARN));
      var mark = hline(g, cx + 14, cy, cx + 14, cy - 5.5, C_WARN, 1.8);
      return { mark: mark, cx: cx + 14, cy: cy };
    }
    var mo1 = motorIcon(bevG, 344, 228, '电机 1'), mo2 = motorIcon(bevG, 344, 258, '电机 2');
    pathLine(bevG, [[366, 228], [404, 228], [420, 240]], C_WARN, 1.4); pathLine(bevG, [[366, 258], [404, 258], [420, 246]], C_WARN, 1.4);
    /* 腰：正视的上半身方块，横滚 = 整块在画面内转，偏航 = 胸前的标记左右滑（绕竖轴转） */
    var waistG = group(bevG);
    var torsoW = paint(svgEl('rect', { x: -16, y: -26, width: 32, height: 26, rx: 3, 'stroke-width': 1.4 }), C_SURFACE2, C_WARN);
    waistG.appendChild(torsoW);
    var yawMark = paint(svgEl('rect', { x: -3, y: -18, width: 6, height: 10, rx: 1.5 }), C_WARN);
    waistG.appendChild(yawMark);
    waistG.appendChild(paint(svgEl('circle', { cx: 0, cy: 0, r: 3.2 }), C_WARN));
    var yawT = paint(svgText(470, 230, '偏航', null, 10), C_WARN), rollT = paint(svgText(470, 254, '横滚', null, 10), C_WARN);
    bevG.appendChild(yawT); bevG.appendChild(rollT);
    var yawBar = hbar(bevG, 500, 222, 9, C_WARN, 0.75), rollBar = hbar(bevG, 500, 246, 9, C_WARN, 0.75);
    /* 论文只说两个同向安装的电机驱动两个互相垂直的自由度，没说哪个轴对应和、哪个对应差，所以标「示意」 */
    bevG.appendChild(svgText(600, 238, '两个电机转角的和 / 差', 'demo-x-mut', 9.5));
    bevG.appendChild(svgText(600, 252, '（哪个轴对应哪个是示意）', 'demo-x-mut', 8.5));
    var twoG = group(bevG);
    twoG.appendChild(paint(svgText(310, 284, '一个 XC330 带不动上半身', null, 9.5), C_BAD));
    twoG.appendChild(paint(svgText(436, 284, '→ 两个合力就够', null, 9.5), C_GOOD));
    /* ③ 平行连杆：电机放在大腿高处，曲柄与膝处的摇杆等长同角，连杆和大腿平行；小腿固连在摇杆上 */
    var linkG = group(right);
    linkG.appendChild(paint(svgText(310, 304, '③ 平行连杆（膝、颈俯仰）', null, 11), C_GOOD));
    tags.push(mujocoTag(linkG, 304, '焊接约束'));
    var HIP = [352, 314], MOT = [352, 322], KNEE = [352, 352];
    hline(linkG, HIP[0], HIP[1] - 4, KNEE[0], KNEE[1], C_INK2, 5).style.opacity = 0.35;  // 大腿
    var crank = hline(linkG, 0, 0, 0, 0, C_GOOD, 2), coupler = hline(linkG, 0, 0, 0, 0, C_GOOD, 1.6), rocker = hline(linkG, 0, 0, 0, 0, C_GOOD, 2);
    var shin = hline(linkG, 0, 0, 0, 0, C_INK2, 4);
    linkG.appendChild(paint(svgEl('rect', { x: MOT[0] - 9, y: MOT[1] - 7, width: 18, height: 14, rx: 3, 'stroke-width': 1.3, opacity: 0.9 }), C_SURFACE2, C_GOOD));
    dotAt(linkG, MOT[0], MOT[1], 2.5, C_GOOD); dotAt(linkG, KNEE[0], KNEE[1], 3, C_GOOD);
    linkG.appendChild(svgText(376, 326, '膝：电机放在大腿高处', 'demo-x-ink2', 9.5));
    linkG.appendChild(svgText(376, 342, '→ 小腿轻，转动惯量小', 'demo-x-mut', 9.5));
    /* 颈：电机在头里，经连杆带着头俯仰 */
    var NECK = [600, 352];
    var headG = group(linkG);
    headG.appendChild(paint(svgEl('rect', { x: -14, y: -34, width: 28, height: 26, rx: 4, 'stroke-width': 1.4 }), C_SURFACE2, C_GOOD));
    headG.appendChild(paint(svgEl('rect', { x: -7, y: -27, width: 14, height: 11, rx: 2, 'stroke-width': 1.1 }), C_SURFACE, C_GOOD));
    headG.appendChild(paint(svgEl('circle', { cx: 9, cy: -24, r: 2 }), C_INK2));
    hline(linkG, NECK[0], NECK[1], NECK[0], NECK[1] + 16, C_INK2, 4).style.opacity = 0.5;
    var neckBar = hline(linkG, 0, 0, 0, 0, C_GOOD, 1.6);
    dotAt(linkG, NECK[0], NECK[1], 3, C_GOOD);
    linkG.appendChild(svgText(628, 326, '颈：电机放进头里', 'demo-x-ink2', 9.5));
    var simNote = svgText(310, 397, '三种约束在仿真里建模，经验上 sim-to-real 差距小（第 5 节）', 'demo-x-mut', 9.5);
    right.appendChild(simNote);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.7));
      var total = 0;
      groups.forEach(function (gr, gi) {
        gr.keys.forEach(function (k, j) {
          var on = seg(t, gr.at + j * 0.12, gr.at + 0.25 + j * 0.12);
          fig.joints[k].style.opacity = on;
          fig.joints[k].style.stroke = on > 0.5 ? gr.color : C_INK2;
        });
        var u = seg(t, gr.at, gr.at + 0.25 + (gr.keys.length - 1) * 0.12);
        total += Math.round(gr.n * u);
        setOpacity(badgeG[gi], seg(t, gr.at + 0.4, gr.at + 0.8));
        setOpacity(legend[gi], seg(t, gr.at + 0.6, gr.at + 1.0));
      });
      counter.textContent = total ? '主动自由度 ' + total : '';
      setOpacity(endT, seg(t, 6.4, 6.9));
      setOpacity(right, seg(t, 7.0, 7.5));
      setOpacity(spurG, seg(t, 7.0, 7.5));
      /* 关节来回摆（不是一直转）：主动轮转 θ，1:1 的从动轮转 -θ，2:1 的大轮转 -θ / 2；输出杆跟着从动轮 */
      var th = 50 * Math.sin(now * 1.5);
      spin(ga, th); spin(gb, -th); spin(gc, 1.4 * th); spin(gd, -0.7 * th);
      var aB = (-th - 90) * Math.PI / 180, aD = (-0.7 * th - 90) * Math.PI / 180;
      setLine(linkA, 387, 140, 387 + 30 * Math.cos(aB), 140 + 30 * Math.sin(aB));
      setLine(linkB, 509, 140, 509 + 38 * Math.cos(aD), 140 + 38 * Math.sin(aD));
      setOpacity(bevG, seg(t, 10.4, 10.9));
      /* 三段轮流：只偏航（两电机同向同速）、只横滚（反向）、两者叠加；腰角 = 和 / 差，电机角 = 偏航 ± 横滚 */
      var ph = (now % 9) / 3, wY = ph < 1 || ph >= 2 ? 1 : 0, wR = ph >= 1 ? 1 : 0;
      var yaw = 0.5 * Math.sin(now * 1.6) * wY, roll = 0.3 * Math.sin(now * 1.1) * wR;
      var q1 = yaw + roll, q2 = yaw - roll;
      [[mo1, q1], [mo2, q2]].forEach(function (m) { var a = 3 * m[1] - Math.PI / 2; setLine(m[0].mark, m[0].cx, m[0].cy, m[0].cx + 5.5 * Math.cos(a), m[0].cy + 5.5 * Math.sin(a)); });  // 电机端转角 = 腰角 × 减速比（画成 3 倍）
      waistG.setAttribute('transform', 'translate(440 254) rotate(' + ((roll * 180) / Math.PI).toFixed(1) + ')');
      yawMark.setAttribute('x', (-3 + 12 * Math.sin(yaw)).toFixed(1));
      setW(yawBar, 90 * Math.abs(yaw) / 0.5); setW(rollBar, 90 * Math.abs(roll) / 0.3);
      setOpacity(twoG, seg(t, 11.8, 12.3));
      setOpacity(linkG, seg(t, 13.4, 13.9));
      var c = 0.55 * Math.sin(now * 1.4);
      var A = [MOT[0] + 9 * Math.cos(c), MOT[1] + 9 * Math.sin(c)], B = [KNEE[0] + 9 * Math.cos(c), KNEE[1] + 9 * Math.sin(c)];
      setLine(crank, MOT[0], MOT[1], A[0], A[1]); setLine(coupler, A[0], A[1], B[0], B[1]); setLine(rocker, KNEE[0], KNEE[1], B[0], B[1]);
      setLine(shin, KNEE[0], KNEE[1], KNEE[0] + 26 * Math.cos(c + Math.PI / 2), KNEE[1] + 26 * Math.sin(c + Math.PI / 2));
      var nod = 0.25 * Math.sin(now * 1.2);
      headG.setAttribute('transform', 'translate(' + NECK[0] + ' ' + NECK[1] + ') rotate(' + ((nod * 180) / Math.PI).toFixed(1) + ')');
      var hp = [NECK[0] + 8 * Math.sin(nod), NECK[1] - 8 * Math.cos(nod)];
      setLine(neckBar, NECK[0], NECK[1], hp[0], hp[1]);
      tags.forEach(function (n, k) { setOpacity(n, seg(t, 14.2 + k * 0.4, 14.6 + k * 0.4)); });
      setOpacity(simNote, seg(t, 15.4, 15.9));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 可复现是硬约束 ── */
  function buildSceneRepro() {
    var s = sceneSvg('左边两根悬臂梁，端部挂着方块当载荷，长梁方块的边长是短梁的三倍、重二十七倍；短梁先是铝的，相对挠度只有长梁的三分之一，换成打印件后回到和长梁差不多，解释为什么小零件可以 3D 打印；右上是 6000 美元的物料清单条，九成是电机和电脑；右下是表 1 里几台小人形的价格柱；底下是「只用现成电机与轴承」「2 兆波特、50 赫兹、背隙 0.25 度」几条');
    s.appendChild(svgText(30, 28, '可复现是硬约束：一个人在家、没有专用设备也能把它造出来', 'demo-x-ink2', 13.5));
    var def = group(s);
    rectBox(def, 30, 44, 740, 40, C_GOOD, C_SURFACE);
    def.appendChild(svgRich(400, 70, '定义：**一个人**在家、不用专用设备就能复刻整套系统 —— 全 3D 打印 + 现成 Dynamixel + 买得到的板子', { size: 11.5, anchor: 'middle', w: 720, cls: 'demo-x-good' }));
    /* 左：梁。载荷画成挂在梁端的方块：边长 ∝ L，重量 ∝ L³（长梁的方块边长是短梁的 3 倍、重 27 倍）；
       梁形用悬臂梁端部受力的挠曲线 y = δ ξ²(3 − ξ) / 2；方块挂上去时有一点阻尼回弹 */
    var beam = group(s);
    rectBox(beam, 30, 98, 360, 190, C_BORDER, C_SURFACE2);
    beam.appendChild(svgText(44, 118, '为什么小零件敢 3D 打印（附录 8.1）', 'demo-x-ink2', 11));
    beam.appendChild(svgMath(336, 124, '\\frac{\\delta}{L}\\propto\\frac{P}{3EL^{2}}', { size: 12, anchor: 'middle', display: true }));
    var BL = { x0: 56, y0: 150, L: 240, cube: 27 }, BS = { x0: 56, y0: 222, L: 80, cube: 9 };
    hline(beam, 56, 134, 56, 190, C_MUTED, 3); hline(beam, 56, 210, 56, 244, C_MUTED, 3);
    var longBeam = pathLine(beam, [], C_SIM, 4), shortBeam = pathLine(beam, [], C_SIM, 4);
    function hangCube(c) {
      var g = group(beam);
      var str = hline(g, 0, 0, 0, 0, C_INK2, 1);
      var box = paint(svgEl('rect', { x: 0, y: 0, width: c.cube, height: c.cube, rx: 2, 'stroke-width': 1.3 }), C_SURFACE, C_BAD);
      g.appendChild(box);
      return { g: g, str: str, box: box };
    }
    var cubeL = hangCube(BL), cubeS = hangCube(BS);
    beam.appendChild(svgText(66, 142, '长 L · 铝（全尺寸）', 'demo-x-mut', 9.5));
    var shortLab = svgText(66, 214, '短 L / 3 · 铝', 'demo-x-mut', 9.5);
    beam.appendChild(shortLab);
    var cubeNote = svgText(62, 260, '方块 = 载荷：边长 ∝ L，重量 ∝ L³（这一步是我们补的）', 'demo-x-mut', 9);
    beam.appendChild(cubeNote);
    /* 右侧量 δ/L：长梁一根、短梁一根；短梁先是铝（δ/L 只有 1/3），换成打印件后 E 变小，δ/L 回到和长梁差不多 */
    var gauge = group(beam);
    gauge.appendChild(svgMath(352, 156, '\\delta/L', { size: 10.5, anchor: 'middle' }));
    var GB = 246, GK = 600;
    hline(gauge, 326, GB, 380, GB, C_BORDER, 1);
    var gL = vbar(gauge, 332, GB, 14, C_SIM, 0.85), gS = vbar(gauge, 358, GB, 14, C_SIM, 0.85);
    gauge.appendChild(svgText(339, GB + 12, '长', 'demo-x-mut', 9, 'middle'));
    gauge.appendChild(svgText(365, GB + 12, '短', 'demo-x-mut', 9, 'middle'));
    var verdictB = paint(svgText(44, 280, '换成打印件：E 小，δ/L 回到和全尺寸铝件差不多（作者的估计）', null, 9.5), C_GOOD);
    beam.appendChild(verdictB);
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
    var PY = 258, PS = 2.4;
    var pbars = pr.map(function (r, k) {
      var x = 426 + k * 48, isT = r[0] === 'Toddler';
      var b = vbar(price, x, PY, 30, isT ? C_GOOD : C_MUTED, isT ? 0.95 : 0.55);
      var v = svgText(x + 15, 0, r[1] + 'K', isT ? 'demo-x-good' : 'demo-x-mut', 9, 'middle');
      price.appendChild(v);
      price.appendChild(svgText(x + 15, PY + 11, r[0], isT ? 'demo-x-good' : 'demo-x-mut', 8.5, 'middle'));
      price.appendChild(svgText(x + 15, PY + 23, r[2] + ' 自由度', 'demo-x-mut', 8, 'middle'));
      return { b: b, v: v, h: r[1] * PS };
    });
    /* 底：电机与通信 */
    var bot = group(s);
    rectBox(bot, 30, 300, 740, 104, C_BORDER, C_SURFACE);
    bot.appendChild(svgText(44, 320, '只选现成件（附录 8.6）：Dynamixel 可靠、好买、文档全；无刷直驱塞不进 30 自由度的身体', 'demo-x-ink2', 10.5));
    var comm = ['5 V TTL · 2 Mbaud', '30 个电机 · 50 Hz 全状态', '背隙约 0.25°', '编码器 4096 → 0.09°'].map(function (str, k) { return chip(bot, 44 + k * 182, 330, 172, str, C_ACCENT, { size: 10, h: 26 }); });
    /* 装配与维护（附录 8.2）写成四个短 chip，代码 2.0 的细节留给笔记 */
    var ease2 = group(bot);
    var asm = ['装配：螺丝种类少', '螺丝刀够得着', '每个零件单独换', '两台样机测了一年多'].map(function (str, k) { return chip(ease2, 44 + k * 182, 366, 172, str, C_GOOD, { size: 10, h: 26 }); });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(def, seg(t, 0.2, 0.7));
      setOpacity(beam, seg(t, 3.6, 4.1));
      /* 4.0 s 挂上方块：δ(t) = δ_s (1 − e^{−ζωt} cos ω_d t)；5.4–6.4 s 短梁从铝换成打印件，静挠度从 δ_L / 9 涨到 δ_L / 3 */
      var DL = 28;
      function bounce(t0) { var x = t - t0; if (x <= 0) return 0; var z = 0.18, w = 2 * Math.PI * 1.3; return 1 - Math.exp(-z * w * x) * Math.cos(w * Math.sqrt(1 - z * z) * x); }
      var sw = ease(seg(t, 5.4, 6.4));
      var dLt = DL * bounce(4.0), dSt = (DL / 9 + (DL / 3 - DL / 9) * sw) * bounce(4.0);
      function beamPts(c, d) { var out = []; for (var i = 0; i <= 24; i++) { var xi = i / 24; out.push([c.x0 + c.L * xi, c.y0 + d * xi * xi * (3 - xi) / 2]); } return out; }
      setPath(longBeam, beamPts(BL, dLt)); setPath(shortBeam, beamPts(BS, dSt));
      var mat = sw > 0.5;
      shortBeam.style.stroke = mat ? C_GOOD : C_SIM; gS.style.fill = mat ? C_GOOD : C_SIM;
      shortLab.textContent = mat ? '短 L / 3 · 打印（小尺寸）' : '短 L / 3 · 铝';
      [[cubeL, BL, dLt], [cubeS, BS, dSt]].forEach(function (r) {
        var c = r[0], b = r[1], tipY = b.y0 + r[2], x = b.x0 + b.L, drop = 4;
        setLine(c.str, x, tipY, x, tipY + drop);
        c.box.setAttribute('x', (x - b.cube / 2).toFixed(1)); c.box.setAttribute('y', (tipY + drop).toFixed(1));
        setOpacity(c.g, seg(t, 3.8, 4.0));
      });
      setOpacity(cubeNote, seg(t, 4.4, 4.9));
      setOpacity(gauge, seg(t, 4.6, 5.0));
      setH(gL, GK * dLt / BL.L); setH(gS, GK * dSt / BS.L);
      setOpacity(verdictB, seg(t, 6.2, 6.7));
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
      setOpacity(ease2, seg(t, 13.4, 13.8));
      asm.forEach(function (c, k) { setOpacity(c, seg(t, 13.5 + k * 0.5, 13.9 + k * 0.5)); });
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
    fair.appendChild(svgText(44, 64, '公平地比：做同一串按身高归一化的动作，用掉同一比例的最大功率（式 3）', 'demo-x-ink2', 10.5));
    /* 跳一跳（第 0–7 s，图 8 的柱子出来前）：1.8 m 和 0.5 m 两台，按 90 px / m 画；先都跳 0.5 m，再各跳身高的 10%。
       起跳速度 v = √(2gh)、腾空 2v / g，真实时间下的抛物线；落地前后各蹲一下 */
    var jump = group(left);
    var JG = 384, JPX = 90, GPX = 9.81 * JPX;
    hline(jump, 50, JG, 460, JG, C_BORDER, 1.4);
    var bar05 = hline(jump, 60, JG - 0.5 * JPX, 400, JG - 0.5 * JPX, C_BAD, 1.2, '5 4');  // 先画，压在小人后面
    var jTall = tbFront(jump, C_INK2, 1.8 * JPX / 0.62), jSmall = tbFront(jump, C_INK2, 0.5 * JPX / 0.62);
    var bar05T = paint(svgText(404, JG - 0.5 * JPX + 4, '0.5 m', null, 9.5), C_BAD);
    jump.appendChild(bar05T);
    var tenT = [hline(jump, 70, 0, 170, 0, C_GOOD, 1.2, '4 3'), hline(jump, 300, 0, 360, 0, C_GOOD, 1.2, '4 3')];
    jump.appendChild(svgText(120, JG + 14, '1.8 m', 'demo-x-mut', 9.5, 'middle'));
    jump.appendChild(svgText(330, JG + 14, '0.5 m', 'demo-x-mut', 9.5, 'middle'));
    var jumpT = paint(svgText(255, 186, '', null, 11, 'middle'), C_BAD);
    jump.appendChild(jumpT);
    function jumpY(h, ph) {
      /* 一个 1.6 s 的周期：0–0.25 s 下蹲，然后腾空，落地后 0.2 s 缓冲；返回 [离地高度 m, 下蹲量 0–1] */
      var T = 2 * Math.sqrt(2 * h / 9.81), tt = ph * 1.6;
      if (tt < 0.25) return [0, Math.sin(Math.PI / 2 * tt / 0.25) * 0.6];
      var tf = tt - 0.25;
      if (tf < T) { var v = Math.sqrt(2 * 9.81 * h); return [v * tf - 4.905 * tf * tf, 0]; }
      var tl = tf - T;
      return [0, tl < 0.25 ? 0.6 * Math.sin(Math.PI * tl / 0.25) : 0];
    }
    function standTop(S, c) { return JG - (0.42 + 0.06 * c + 0.2 * Math.cos(0.9 * c)) * S; }  // 下蹲时让脚底仍贴地
    var formula = group(left);
    /* 公式用独立公式的排版（display），否则分子里的求和号会被压成一团 */
    formula.appendChild(svgMath(132, 124, '\\tilde p=\\frac{\\sum_i|\\tau_i^{\\max}|}{h\\,m\\,g}', { size: 14, anchor: 'middle', display: true }));
    formula.appendChild(svgText(236, 108, '全部电机最大力矩之和', 'demo-x-ink2', 10));
    formula.appendChild(svgText(236, 124, '除以身高 × 体重 × g（式 4）', 'demo-x-ink2', 10));
    formula.appendChild(svgText(236, 140, '不除以自由度数：1 个和 100 个同样的自由度不该得同分', 'demo-x-mut', 9));
    /* 图 8 画成横条：名字放左边、数值跟在条尾，人的 2.22 是一条竖虚线（原来斜着写的名字会掉出面板） */
    var chart = group(left);
    var RY0 = 180, RP = 15, CX = 156, CS = 52;
    var cbars = POWER.map(function (r, k) {
      var y = RY0 + k * RP, isT = r[0] === 'ToddlerBot', isH = r[0] === 'Human';
      chart.appendChild(svgText(CX - 6, y + 10, isH ? '人' : r[0], isT ? 'demo-x-good' : isH ? 'demo-x-bad' : 'demo-x-mut', 9.5, 'end'));
      var b = hbar(chart, CX, y + 2, 10, isT ? C_GOOD : isH ? C_BAD : C_ACCENT, isT ? 0.95 : isH ? 0.55 : 0.7);
      var v = svgText(0, y + 10, fmt(r[1], 2), isT ? 'demo-x-good' : 'demo-x-ink2', 9);
      chart.appendChild(v);
      return { b: b, v: v, w: r[1] * CS };
    });
    var HX = CX + P_HUMAN * CS;
    var human = hline(chart, HX, RY0 - 4, HX, RY0 + POWER.length * RP + 2, C_BAD, 1.2, '5 4');
    var humanT = paint(svgText(HX, 394, '人 2.22：至少要超过它，远超也有害', null, 9.5, 'middle'), C_BAD);
    chart.appendChild(humanT);
    var tbT = paint(svgText(44, 166, 'ToddlerBot 2.74 = 1.40（上半身）+ 1.35（下半身），最接近人', null, 10.5), C_GOOD);
    chart.appendChild(tbT);
    /* 右：式 5 与表 2；需求条与电机条用同一个比例尺（每 N·m 36 px），竖虚线是踝俯仰要的 2.66 */
    var right = group(s);
    rectBox(right, 496, 44, 274, 360, C_BORDER, C_SURFACE);
    right.appendChild(svgText(510, 64, '需要多大力矩（式 5，附录 8.6）', 'demo-x-ink2', 11));
    /* 式 5 画成图：跑步的人（关节力矩）按身高 × 体重的比例缩到 0.5 m、3.1 kg 的机器人 */
    var eq5 = group(right);
    var runner = humanIcon(eq5, C_INK2);
    var tiny = tbFront(eq5, C_GOOD, 16 / 0.62);
    tiny.put(690, 118 - 16, {});
    pathLine(eq5, [[566, 104], [664, 104]], C_GOOD, 1.6); pathLine(eq5, [[657, 99], [664, 104], [657, 109]], C_GOOD, 1.6);
    eq5.appendChild(svgText(615, 96, '关节力矩 × 身高比 × 体重比', 'demo-x-ink2', 9.5, 'middle'));
    eq5.appendChild(svgText(615, 122, '人跑步、爬坡时', 'demo-x-mut', 9, 'middle'));
    eq5.appendChild(svgText(690, 134, '0.5 m · 3.1 kg', 'demo-x-mut', 9, 'middle'));
    var MX = 556, MS = 36;
    var REQ = [['膝', TORQUE_REQ.knee], ['踝俯仰', TORQUE_REQ.ankle], ['髋俯仰', TORQUE_REQ.hip]];
    var RY = 148;
    var reqBars = REQ.map(function (r, k) {
      var y = RY + k * 24;
      right.appendChild(svgText(MX - 6, y + 12, r[0], 'demo-x-ink2', 10, 'end'));
      var b = hbar(right, MX, y + 2, 14, C_BAD, 0.8);
      var v = svgText(0, y + 13, fmt(r[1], 2), 'demo-x-ink2', 9.5);
      right.appendChild(v);
      return { b: b, v: v, w: r[1] * MS, y: y };
    });
    var tbl = group(right);
    tbl.appendChild(svgText(510, 236, '表 2：12 V 堵转力矩与分工', 'demo-x-ink2', 11));
    var mrows = [['XM430', 3.0, '膝、踝俯仰', C_GOOD], ['XC430', 1.9, '肩俯仰、踝横滚', C_ACCENT], ['2XC430', 1.8, '髋横滚 / 俯仰', C_ACCENT], ['2XL430', 1.5, '肩 / 肘 / 腕（双轴）', C_ACCENT], ['XC330', 1.0, '颈、腰、髋偏航、夹爪', C_MUTED]].map(function (r, k) {
      var y = 246 + k * 24, g = group(tbl);
      g.appendChild(paint(svgText(510, y + 12, r[0], null, 10), r[3]));
      var b = hbar(g, MX, y + 2, 14, r[3], 0.8);
      var v = svgText(0, y + 13, '', 'demo-x-mut', 9);
      g.appendChild(v);
      g.appendChild(svgText(756, y + 12, r[2], 'demo-x-mut', 8.5, 'end'));
      return { g: g, b: b, w: r[1] * MS, v: v, val: r[1], y: y };
    });
    var RLX = MX + TORQUE_REQ.ankle * MS;
    var reqLine = hline(tbl, RLX, 242, RLX, 362, C_BAD, 1, '3 3');
    var only = group(tbl);
    only.appendChild(paint(svgText(510, 380, 'XM430 是唯一够膝（2.35）和踝（2.66）的', null, 9.5), C_GOOD));
    only.appendChild(paint(svgText(510, 396, '髋用 2XC430，1.8 对 1.77 只多 1.7%', null, 9.5), C_GOOD));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.7));
      setOpacity(fair, seg(t, 0.3, 0.8));
      setOpacity(jump, seg(t, 0.4, 0.9) * (1 - seg(t, 7.0, 7.3)));
      var fairPhase = (now % 6.4) < 3.2, ph = (now % 1.6) / 1.6;
      [[jTall, 1.8, 120], [jSmall, 0.5, 330]].forEach(function (r) {
        var S = r[1] * JPX / 0.62, h = fairPhase ? 0.5 : 0.1 * r[1], y = jumpY(h, ph);
        r[0].put(r[2], standTop(S, y[1]) - y[0] * JPX, { crouch: y[1], armA: [0.25 + 0.4 * y[1], 0.3], armB: [0.25 + 0.4 * y[1], 0.3] });
      });
      setOpacity(bar05, fairPhase ? 1 : 0); setOpacity(bar05T, fairPhase ? 1 : 0);
      [[tenT[0], 1.8], [tenT[1], 0.5]].forEach(function (r) { var y = JG - 1.1 * r[1] * JPX; setLine(r[0], r[0].x1.baseVal.value, y, r[0].x2.baseVal.value, y); setOpacity(r[0], fairPhase ? 0 : 1); });
      jumpT.textContent = fairPhase ? '都跳 0.5 m：小的得跳出自己的身高，不公平' : '各跳身高的 10%：公平';
      jumpT.style.fill = fairPhase ? C_BAD : C_GOOD;
      setOpacity(formula, seg(t, 3.6, 4.1));
      setOpacity(chart, seg(t, 7.0, 7.4));
      cbars.forEach(function (b, k) {
        var w = b.w * ease(seg(t, 7.2 + k * 0.15, 7.8 + k * 0.15));
        setW(b.b, w);
        b.v.setAttribute('x', (CX + w + 4).toFixed(1));
        setOpacity(b.v, seg(t, 7.6 + k * 0.15, 7.9 + k * 0.15));
      });
      setOpacity(human, seg(t, 9.3, 9.7)); setOpacity(humanT, seg(t, 9.3, 9.7));
      setOpacity(tbT, seg(t, 9.6, 10.0));
      setOpacity(right, seg(t, 10.4, 10.8));
      setOpacity(eq5, seg(t, 10.5, 11.0));
      runner.put(532, 128, 44, now);
      reqBars.forEach(function (b, k) {
        var w = b.w * ease(seg(t, 11.2 + k * 0.4, 11.8 + k * 0.4));
        setW(b.b, w);
        b.v.setAttribute('x', (MX + w + 4).toFixed(1));
        setOpacity(b.v, seg(t, 11.6 + k * 0.4, 11.9 + k * 0.4));
      });
      setOpacity(tbl, seg(t, 13.4, 13.8));
      mrows.forEach(function (r, k) {
        var w = r.w * ease(seg(t, 13.6 + k * 0.25, 14.1 + k * 0.25));
        setW(r.b, w);
        r.v.textContent = fmt(r.val, 1);
        r.v.setAttribute('x', (MX + w + 4).toFixed(1));
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
    /* 右上：为什么要标定，画成图：电机刻度盘的零点在重装后漂了一格，仿真里站直、真机却歪着 */
    var right = group(s);
    rectBox(right, 512, 44, 258, 360, C_BORDER, C_SURFACE);
    var why = group(right);
    why.appendChild(svgText(526, 64, '为什么要标定：Dynamixel 没有绝对零点', 'demo-x-ink2', 10.5));
    why.appendChild(paint(svgEl('circle', { cx: 566, cy: 122, r: 24, 'stroke-width': 1.4 }), C_SURFACE2, C_INK2));
    for (var tk = 0; tk < 12; tk++) { var ta = tk * Math.PI / 6; hline(why, 566 + 20 * Math.cos(ta), 122 + 20 * Math.sin(ta), 566 + 24 * Math.cos(ta), 122 + 24 * Math.sin(ta), C_MUTED, 1); }
    var zeroRef = hline(why, 566, 92, 566, 100, C_GOOD, 2);
    var dialMark = hline(why, 566, 122, 566, 102, C_BAD, 2);
    dotAt(why, 566, 122, 3, C_INK2);
    var reT = svgText(566, 166, '', 'demo-x-mut', 9, 'middle');
    why.appendChild(reT);
    var simR = tbSide(why, C_SIM, 70), realR = tbSide(why, C_REAL, 70);
    hline(why, 620, 168, 760, 168, C_BORDER, 1.2);
    why.appendChild(paint(svgText(652, 182, '仿真', null, 9), C_SIM));
    why.appendChild(paint(svgText(722, 182, '真机', null, 9), C_REAL));
    var whyT = svgText(526, 200, '零点差一点 → 运动学错 → 仿真站直、真机歪', 'demo-x-ink2', 9.5);
    why.appendChild(whyT);
    /* 右中：零点的定义 */
    var defG = group(right);
    defG.appendChild(svgText(526, 224, '零点的定义', 'demo-x-ink2', 10.5));
    var zeroChip = chip(defG, 526, 232, 230, '站直、双臂平行贴着身体', C_GOOD, { size: 10, h: 24 });
    defG.appendChild(svgText(526, 272, '膝：下限位当零点（止挡）· 夹爪：张开 = 零点', 'demo-x-mut', 9));
    /* 右下：代码里的两步 + 前倾的小人被 IMU 反馈扶正 */
    var code = group(right);
    code.appendChild(svgText(526, 296, '代码里的两步', 'demo-x-ink2', 10.5));
    var step1 = chip(code, 526, 304, 180, '① `calibrate_zero.py` 读位置', C_ACCENT, { size: 9.5, h: 24 });
    var step2 = chip(code, 526, 334, 180, '② `calibrate.py` IMU 俯仰微调', C_ACCENT, { size: 9.5, h: 24 });
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
        fig.joints[d.jk].style.stroke = v >= 1 ? C_GOOD : C_INK2;
      });
      clickT.textContent = t >= 6.4 ? '「咔」—— 关节锁在零点' : t >= 3.6 ? '插进去……' : '';
      setOpacity(legendG, seg(t, 3.6, 4.0));
      setOpacity(mid, seg(t, 7.0, 7.4));
      var tu = seg(t, 7.2, 9.6);
      setH(timer, 300 * tu);
      timerT.textContent = Math.round(60 * tu) + ' s';
      setOpacity(right, seg(t, 0.8, 1.3));
      setOpacity(why, seg(t, 0.8, 1.3));
      /* 刻度盘：每 4 s 「重装」一次，零点偏到另一个位置（示意，±0.24 rad 以内、不为 0）；绿色短线是该在的零点。
         真机按偏差绕脚踝倾斜（偏正前倾、偏负后仰），仿真照样站直 */
      var OFFS = [0.24, -0.12, 0.18, -0.24, 0.12];
      var cyc = Math.floor(now / 4), inCyc = (now % 4) / 4, off = OFFS[cyc % 5], prev = OFFS[(cyc + 4) % 5];
      var mOff = inCyc < 0.15 ? prev + (off - prev) * ease(inCyc / 0.15) : off;
      setLine(dialMark, 566, 122, 566 + 20 * Math.sin(mOff), 122 - 20 * Math.cos(mOff));
      reT.textContent = '重装一次，零点就漂';
      var lean = 0.9 * mOff;
      simR.put(658, 168 - 0.39 * 70, 0, [[662, 168 - 1.4], [654, 168 - 1.4]], [0.05, 0.1]);
      /* 真机：整个人绕脚踝前倾 */
      realR.put(728 + 0.39 * 70 * Math.sin(lean), 168 - 0.39 * 70 * Math.cos(lean), lean, [[732, 168 - 1.4], [724, 168 - 1.4]], [0.05, 0.1]);
      setOpacity(whyT, seg(t, 1.6, 2.2));
      setOpacity(defG, seg(t, 7.4, 7.8));
      setOpacity(zeroChip, seg(t, 7.6, 8.0));
      setOpacity(code, seg(t, 10.4, 10.8));
      setOpacity(step1, seg(t, 10.6, 11.0));
      setOpacity(step2, seg(t, 13.4, 13.8));
      /* IMU 微调：PID 把整个人绕脚踝从前倾 0.25 rad 扶正，欠阻尼、稍有回摆（ζ = 0.5，约 2 s 稳住） */
      var pt = Math.max(0, t - 13.9), zz = 0.5, wn = 4.2, wd = wn * Math.sqrt(1 - zz * zz);
      var pitch = 0.25 * Math.exp(-zz * wn * pt) * (Math.cos(wd * pt) + zz / Math.sqrt(1 - zz * zz) * Math.sin(wd * pt));
      var LEGH = 0.37 * 90;
      imuBody.put(734 + LEGH * Math.sin(pitch), 388 - LEGH * Math.cos(pitch), pitch, [[738, 386], [730, 386]], [0.1, 0.1]);
      var cx0 = 734 + 0.75 * 90 * Math.sin(pitch);
      setPath(imuArrow, Math.abs(pitch) > 0.02 ? [[cx0 + 8, 316], [cx0 + 8 - 60 * pitch, 316]] : []);
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
    var railY = 128;  // 台架整体上移，给「驱动电机」和下面三行规格留出位置
    hline(left, 50, railY + 36, 310, railY + 36, C_MUTED, 3);
    var motorBox = chip(left, 60, railY - 20, 64, '待测电机', C_ACCENT, { size: 9.5, h: 40 });
    var shaft = hline(left, 124, railY, 160, railY, C_MUTED, 4);
    var sensor = chip(left, 160, railY - 16, 60, '扭矩传感器', C_GOOD, { size: 9, h: 32 });
    hline(left, 220, railY, 250, railY, C_MUTED, 4);
    var brake = chip(left, 250, railY - 20, 60, '粉末制动器', C_BAD, { size: 9, h: 40 });
    var driver = chip(left, 110, railY + 44, 70, '驱动电机', C_WARN, { size: 9, h: 24 });
    hline(left, 145, railY + 20, 145, railY + 44, C_MUTED, 2, '3 2');
    /* 转子的端视图（画在电机上方）：反驱时按每个测点的恒定转速转，断电后按右下那条衰减曲线慢下来；
       0.45 s 的衰减在画面里画成约 1.9 s，所以全程按同一个慢放倍数（约 4×）转 */
    var rotor = group(left);
    rotor.appendChild(paint(svgEl('circle', { cx: 92, cy: 86, r: 13, 'stroke-width': 1.4 }), C_SURFACE, C_ACCENT));
    var spoke = hline(rotor, 92, 86, 92, 75, C_ACCENT, 2.4);
    dotAt(rotor, 92, 86, 2.4, C_ACCENT);
    hline(rotor, 92, 99, 92, railY - 20, C_MUTED, 1, '2 2');
    var rotorT = svgText(112, 82, '转子', 'demo-x-mut', 9);
    rotor.appendChild(rotorT);
    var slowT = svgText(112, 95, '（慢放约 4×）', 'demo-x-mut', 8.5);
    rotor.appendChild(slowT);
    var spec = group(left);
    spec.appendChild(svgText(44, 214, '刹车 5 N·m · 主动驱动 1 N·m · 扭矩精度 0.0003 N·m', 'demo-x-ink2', 9.5));
    spec.appendChild(svgText(44, 230, '负载：21700 电芯当砝码；MCU 管采样、刹车与 CAN', 'demo-x-mut', 9));
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
    var interceptT = paint(svgText(fx(0) + 6, fy(X330.fl) + 18, '截距 0.036 = 摩擦损耗', null, 9.5), C_BAD);  // 写在线下方，不压散点
    var slopeT = paint(svgText(fx(4.6), fy(tauR(X330, 4.6)) + 20, '斜率 0.0036 = 阻尼', null, 9.5), C_WARN);
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
    var spinPhase = 0, spinClock = 0;
    var curve = [];
    for (var k = 0; k <= 60; k++) {
      var tt = (k / 60) * T_STOP;
      var wv = (5 + X330.fl / X330.d) * Math.exp(-X330.d * tt / X330.I) - X330.fl / X330.d;
      curve.push([SX0 + (tt / 0.6) * (SX1 - SX0), SY0 - (Math.max(0, wv) / 5) * (SY0 - SY1)]);
    }
    var spinPath = pathLine(spin, curve, C_ACCENT, 2.2);
    var stopT = paint(svgText(SX0 + (T_STOP / 0.6) * (SX1 - SX0) + 6, SY0 - 4, '0.45 s 停', null, 9.5), C_BAD);  // 曲线终点右边，不压曲线尾巴
    spin.appendChild(stopT);
    /* 储能条代替两条公式：动能随转速的平方往下掉；把阻力功率积分得到初始储能，再换算成惯量 */
    var eq7 = group(spin);
    var EX = 672, EB = 362, EH = 84;
    eq7.appendChild(paint(svgEl('rect', { x: EX, y: EB - EH, width: 20, height: EH, rx: 3, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    var eBar = vbar(eq7, EX, EB, 20, C_GOOD, 0.8);
    eq7.appendChild(svgText(EX + 10, EB + 13, '储能', 'demo-x-mut', 9, 'middle'));
    eq7.appendChild(svgText(700, 290, '随转速的', 'demo-x-mut', 9));
    eq7.appendChild(svgText(700, 303, '平方下降', 'demo-x-mut', 9));
    eq7.appendChild(svgText(700, 326, '阻力功率积分', 'demo-x-ink2', 9));
    eq7.appendChild(svgText(700, 339, '= 初始储能', 'demo-x-ink2', 9));
    eq7.appendChild(svgText(708, 392, 'XC330：0.0040 kg·m²', 'demo-x-good', 9.5, 'middle'));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.7));
      /* 转子转速（真实 rad/s）：开场空转在 5；反驱段跟着最新一个测点的转速；衰减段按 ω(τ) 慢下来 */
      var SLOW = 1.9 / T_STOP, wReal = 5, phi;
      var nDots = 0; for (var di = 0; di < dots.length; di++) if (t >= 7.3 + di * 0.22) nDots = di + 1;
      if (t >= 7.0 && t < 10.4 && nDots) wReal = pts[nDots - 1][0];  // 10.4 起先回到 5 rad/s，再断电
      if (t < 10.7) {
        phi = spinPhase + (wReal / SLOW) * (now - spinClock);
      } else {
        var tau = Math.min((t - 10.7) / SLOW, T_STOP), A = 5 + X330.fl / X330.d, k = X330.d / X330.I;
        phi = spinPhase + (A / k) * (1 - Math.exp(-k * tau)) - (X330.fl / X330.d) * tau;
      }
      if (t < 10.7) { spinPhase = phi; spinClock = now; }
      setLine(spoke, 92, 86, 92 + 11 * Math.sin(phi), 86 - 11 * Math.cos(phi));
      setOpacity(slowT, seg(t, 10.4, 10.8));
      setOpacity(spec, seg(t, 13.4, 13.9));
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
      setOpacity(eq7, seg(t, 10.8, 11.2));
      var tauE = clamp((t - 10.7) / (1.9 / T_STOP), 0, T_STOP);
      var wE = Math.max(0, (5 + X330.fl / X330.d) * Math.exp(-X330.d * tauE / X330.I) - X330.fl / X330.d);
      setH(eBar, EH * (wE / 5) * (wE / 5));
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
    env.appendChild(svgText(EX1, (EY0 + EYm) / 2 + 22, '关节速度 rad/s', 'demo-x-mut', 9, 'end'));  // 贴着零线右端，底下那行留给反驱的说明
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
    var parT = svgRich(44, 206, '被外力反驱时 $k_p$ 显得大 3 倍：被动 / 主动比 $= 1/\\eta^2$，齿轮箱效率约 58%', { size: 9.5, w: 380, cls: 'demo-x-warn' });
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
    chLeg.appendChild(svgRich(44, 398, '灰：0.1 → 2 Hz 设定点　橙：九个参数全对　蓝：拿掉 $k_d^{\\min}$，差 4.32°', { size: 9, w: 380, cls: 'demo-x-mut' }));
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
    /* 三条 chirp 叠在一起：频率 0.1 → 10 Hz（画成对数扫频），幅值是活动范围的 25 / 50 / 75% */
    [0.25, 0.5, 0.75].forEach(function (a, k) {
      var cp = [];
      for (var i = 0; i <= 160; i++) { var x = i / 160, ph = 2 * Math.PI * 0.1 * (Math.pow(100, x) - 1) / Math.log(100) * 3.2; cp.push([460 + 104 * x, 326 - 16 * a * Math.sin(ph)]); }
      var pl = pathLine(fitG, cp, C_ACCENT, 1.1); pl.style.opacity = 0.45 + 0.2 * k;
    });
    fitG.appendChild(svgText(572, 320, '0.1 → 10 Hz 扫频', 'demo-x-ink2', 9.5));
    fitG.appendChild(svgText(572, 335, '幅值 25 / 50 / 75%', 'demo-x-mut', 9));
    /* 同型号的两台舵机参数几乎一样 → 第二台不用重做 */
    [680, 728].forEach(function (x) { fitG.appendChild(paint(svgEl('rect', { x: x, y: 310, width: 30, height: 22, rx: 3, 'stroke-width': 1.3 }), C_SURFACE2, C_ACCENT)); });
    fitG.appendChild(svgText(719, 325, '≈', 'demo-x-ink2', 12, 'middle'));
    fitG.appendChild(svgText(719, 348, '第二台不用重做', 'demo-x-mut', 9, 'middle'));
    var resT = chip(fitG, 460, 362, 296, '9 个参数联合优化 → 平均跟踪误差 **1.3°**', C_GOOD, { size: 11, h: 30 });

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
    var GY = 250, RS = 170;  // 头顶低于上面那排 chip 和代码注释（230 时头会压到 chip）
    hline(right, 480, GY, 756, GY, C_BORDER, 1.4);
    var side = tbSide(right, C_INK2, RS);
    var support = paint(svgEl('rect', { x: 0, y: GY - 3, width: 0, height: 6, rx: 2 }), C_GOOD);
    support.style.opacity = 0.5; right.appendChild(support);
    var weight = paint(svgEl('rect', { x: -6, y: -2, width: 12, height: 12, rx: 2 }), C_WARN);
    right.appendChild(weight);
    var comDot = dotAt(right, 0, 0, 6, C_BAD), comLine = hline(right, 0, 0, 0, 0, C_BAD, 1.2, '3 2');
    var comT = paint(svgText(0, 0, '质心', null, 9.5), C_BAD);  // 放在腿的右边、用细线连回点：左右两侧都可能有大腿和膝
    right.appendChild(comT);
    var comLead = hline(right, 0, 0, 0, 0, C_BAD, 0.8);
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
      /* 摇杆给的速度：画在跟随机器人脚下（y 196，掌机框顶在 206），跟着摇杆左右摆 */
      var vx0 = fp.waist[0], vdx = 26 * Math.sin(now * 1.7), vdy = 3 * Math.cos(now * 1.1), vl = Math.hypot(vdx, vdy);
      var vpts = [[vx0, 196], [vx0 + vdx, 196 + vdy]];
      if (vl > 6) { var ux = vdx / vl, uy = vdy / vl, hx1 = vx0 + vdx, hy1 = 196 + vdy; vpts.push([hx1 - 5 * ux + 3 * uy, hy1 - 5 * uy - 3 * ux], [hx1, hy1], [hx1 - 5 * ux - 3 * uy, hy1 - 5 * uy + 3 * ux]); }
      setPath(velArrow, vpts);
      setOpacity(velArrow, seg(t, 5.0, 5.4));
      setOpacity(right, seg(t, 7.0, 7.4));
      /* 侧视的简化质心：髋 + 0.3 ×（手 − 髋）+ 0.15 S · sin(俯仰)（+ 手里的重物）。和笔记「🚶 第 8 步」同一个稳态：
         第一层质心 PD（8.2 s 起，k_p = 1）把质心误差直接当髋的偏移，稳态误差 e = o / (1 + k_p) = o / 2，只消一半；
         10.4 s 起手里拿着重物、躯干被压得前倾，质心又出去；第二层俯仰 PD（11.0 s 起）用 IMU 把躯干拉到目标 −0.2 rad（略后仰），
         两层合起来质心回到支撑面里 */
      var ext = 0.5 + 0.5 * Math.sin(now * 1.0);
      var reach = 1.4 * ext, fx = 620;
      var load = seg(t, 10.4, 10.9), g1 = seg(t, 8.2, 9.2), g2 = seg(t, 11.0, 12.0);
      var pitch = (1 - g2) * 0.25 * load * ext + g2 * (-0.2 + 0.03 * load * ext);
      var UA = 0.11 * RS, FA = 0.1 * RS, SH = 0.17 * RS;
      var handRel = SH * Math.sin(pitch) + UA * Math.sin(reach + pitch) + FA * Math.sin(reach + 0.2 + pitch);
      var cOff = 0.3 * handRel + 0.15 * RS * Math.sin(pitch) + 3 * load * ext;
      var hx = fx - 0.5 * g1 * cOff;
      var pose = side.put(hx, GY - 0.37 * RS, pitch, [[fx + 4, GY - 0.02 * RS], [fx - 6, GY - 0.02 * RS]], [reach, 0.2]);
      var comX = hx + cOff;
      weight.setAttribute('transform', 'translate(' + pose.hand[0].toFixed(1) + ' ' + pose.hand[1].toFixed(1) + ')'); setOpacity(weight, load);
      support.setAttribute('x', (fx - 0.045 * RS).toFixed(1)); setW(support, 0.1 * RS);
      moveDot(comDot, [comX, GY - 0.3 * RS]);
      setLine(comLine, comX, GY - 0.3 * RS, comX, GY);
      comT.setAttribute('x', '652'); comT.setAttribute('y', (GY - 0.3 * RS + 3.5).toFixed(1));
      setLine(comLead, comX + 7, GY - 0.3 * RS, 648, GY - 0.3 * RS);
      var inside = Math.abs(comX - fx) < 0.045 * RS;
      comDot.style.fill = inside ? C_GOOD : C_BAD; comT.style.fill = inside ? C_GOOD : C_BAD; comLead.style.stroke = inside ? C_GOOD : C_BAD;
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
      left.appendChild(svgText(x, TLY + 20, ['低位', '撑起', '低位'][k], 'demo-x-mut', 9, 'middle'));
      return d;
    });
    var cursor = hline(left, TLX0, TLY - 12, TLX0, TLY + 8, C_GOOD, 2);
    /* 同一条关键帧轨迹：左边在数字孪生里跑（蓝），右边零样本开环上真机（橙）。
       俯卧撑按刚体平板画：脚尖不动、身体绕脚转，手按在地上不动（手臂用两连杆 IK 求肘），只有肩的高度随关键帧变 */
    var GY = 252, PS = 150;
    hline(left, 44, GY, 346, GY, C_BORDER, 1.4);
    var pushers = [[tbSide(left, C_SIM, PS), 52], [tbSide(left, C_REAL, PS), 202]];
    left.appendChild(paint(svgText(110, GY + 16, '仿真（数字孪生）', null, 9.5, 'middle'), C_SIM));
    left.appendChild(paint(svgText(262, GY + 16, '真机：同一条轨迹，开环', null, 9.5, 'middle'), C_REAL));
    var kfNote = group(left);
    kfNote.appendChild(svgText(44, 300, '只给运动学、不保证动力学可行 → 先在数字孪生里跑一遍', 'demo-x-ink2', 9.5));
    kfNote.appendChild(svgText(44, 318, '俯卧撑、引体向上、拥抱：一条轨迹，零样本上真机', 'demo-x-ink2', 9.5));
    kfNote.appendChild(svgText(44, 340, '文档：MuJoCo 里验证过的关键帧多数直接能部署', 'demo-x-mut', 9));
    var BODY = 0.545 * PS, LEGL = 0.375 * PS, UAp = 0.11 * PS, FAp = 0.1 * PS, HAND_Y = GY - 0.02 * PS;
    var B_UP = Math.asin((0.2 * PS) / BODY), B_DN = Math.asin((0.08 * PS) / BODY);
    /* 两连杆 IK：从肩 S 到手 H，肘往脚那边弯；返回 tbSide 用的 [肩角, 肘角]（相对躯干、从「垂下」量起） */
    function armIK(S, H, pitch) {
      var dx = H[0] - S[0], dy = H[1] - S[1], d = clamp(Math.hypot(dx, dy), Math.abs(UAp - FAp) + 0.5, UAp + FAp - 0.2);
      var base = Math.atan2(dx, dy), bend = Math.acos(clamp((UAp * UAp + d * d - FAp * FAp) / (2 * UAp * d), -1, 1));
      var a1 = base - bend, el = [S[0] + UAp * Math.sin(a1), S[1] + UAp * Math.cos(a1)];
      var a2 = Math.atan2(H[0] - el[0], H[1] - el[1]);
      return [a1 - pitch, a2 - a1];
    }
    /* 右：RL */
    var right = group(s);
    rectBox(right, 376, 44, 394, 360, C_BORDER, C_SURFACE);
    right.appendChild(svgText(390, 64, 'RL 行走（第 4.2 节、附录 8.12）', 'demo-x-ink2', 11));
    var obsG = group(right);
    obsG.appendChild(svgText(390, 86, '观测七项（式 1）', 'demo-x-ink2', 10));
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
    var ppoChips = ['MJX + Brax', '1024 个环境', '$3 \\times 10^8$ 步', 'γ 0.97 · clip 0.2', '回合 1000 步', 'Jetson CPU 50 Hz'].map(function (str, k) {
      return chip(ppoG, 390 + (k % 3) * 122, 334 + Math.floor(k / 3) * 30, 116, str, C_MUTED, { size: 9, h: 25 });
    });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.7));
      /* 俯卧撑：相位 0 平板、0.5 撑起 */
      var ph = (now / 2.2) % 1, u = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI);
      cursor.setAttribute('x1', (TLX0 + ph * (TLX1 - TLX0)).toFixed(1)); cursor.setAttribute('x2', (TLX0 + ph * (TLX1 - TLX0)).toFixed(1));
      /* u = 1 撑起、u = 0 低位：身体与地面夹角在 B_DN 与 B_UP 之间，脚踝固定；手按在「撑起」时肩的正下方 */
      var beta = B_DN + (B_UP - B_DN) * u;
      pushers.forEach(function (pp) {
        var ax = pp[1], hip = [ax + LEGL * Math.cos(beta), HAND_Y - LEGL * Math.sin(beta)];
        var sh = [ax + BODY * Math.cos(beta), HAND_Y - BODY * Math.sin(beta)], hand = [ax + BODY * Math.cos(B_UP), HAND_Y];
        var pitch = Math.PI / 2 - beta;
        pp[0].put(hip[0], hip[1], pitch, [[ax, HAND_Y], [ax - 2, HAND_Y]], armIK(sh, hand, pitch));
      });
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
    /* ResNet 那格放宽到装得下整句（原来 90 px，字溢出到框外、和箭头叠在一起） */
    var resnet = chip(left, 146, 104, 128, 'ResNet · ImageNet 预训练', C_ACCENT, { size: 9, h: 30 });
    var joint = chip(left, 146, 146, 128, '关节角 10 Hz', C_WARN, { size: 9, h: 24 });
    var dpBox = chip(left, 292, 104, 124, '扩散策略 · 3 亿参数', C_GOOD, { size: 10, h: 36 });
    var a1 = pathLine(left, [[134, 119], [146, 119]], C_ACCENT, 1.6), a2 = pathLine(left, [[274, 119], [292, 119]], C_ACCENT, 1.6), a3 = pathLine(left, [[274, 158], [292, 132]], C_WARN, 1.6);
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
    /* 力从哪来，画成图：领导臂（橙）往下压，跟随臂（灰）被物体挡住停在接触角；上半身是低 P 增益，
       跟随电机的力矩 ≈ k_p ·（领导角 − 跟随角），所以压在物体上的力跟着 Δq 长 */
    var forceT = group(left);
    forceT.appendChild(svgText(44, 300, '力从哪来（低 P 增益）', 'demo-x-ink2', 10));
    var PV = [70, 318], ARM = 92, QC = 0.42;
    var objTop = PV[1] + ARM * Math.sin(QC);
    forceT.appendChild(paint(svgEl('rect', { x: PV[0] + ARM * Math.cos(QC) - 6, y: objTop, width: 34, height: 26, rx: 3, 'stroke-width': 1.3 }), C_SURFACE, C_INK2));
    dotAt(forceT, PV[0], PV[1], 4, C_INK2);
    var leadArm = hline(forceT, 0, 0, 0, 0, C_REAL, 3, '6 3'), follArm = hline(forceT, 0, 0, 0, 0, C_INK2, 3);
    var dqArc = pathLine(forceT, [], C_BAD, 1.4), fArrow = pathLine(forceT, [], C_BAD, 2);
    var dqT = svgMath(0, 0, '\\Delta q', { size: 10, cls: 'demo-x-bad' });
    forceT.appendChild(dqT);
    forceT.appendChild(paint(svgText(214, 322, '虚线：领导臂（操作员给的角度）', null, 9.5), C_REAL));
    forceT.appendChild(svgText(214, 338, '实线：跟随臂，被物体挡住', 'demo-x-ink2', 9.5));
    forceT.appendChild(svgRich(214, 358, '力 $\\propto \\Delta q$：策略把这个差学进去', { size: 9.5, w: 200, cls: 'demo-x-bad' }));
    forceT.appendChild(svgText(214, 378, '每个任务 60 条演示', 'demo-x-mut', 9));
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
    /* 三段的意思直接标在块下面；再画一条「推理 < 0.1 s」的短条，和丢掉的 0.3 s 比 */
    var lab1 = paint(svgText(460 + 1.5 * 18.5, 126, '丢 3（0.3 s）', null, 9, 'middle'), C_BAD);
    var lab2 = paint(svgText(460 + 5.5 * 18.5, 126, '执行 5（0.5 s）', null, 9, 'middle'), C_GOOD);
    var lab3 = svgText(460 + 12 * 18.5, 126, '其余 8 步不用', 'demo-x-mut', 9, 'middle');
    right.appendChild(lab1); right.appendChild(lab2); right.appendChild(lab3);
    var latT = group(right);
    latT.appendChild(paint(svgEl('rect', { x: 460, y: 140, width: 16, height: 9, rx: 2 }), C_ACCENT));
    latT.appendChild(paint(svgText(482, 148, '推理 < 0.1 s', null, 9), C_ACCENT));
    hline(latT, 460, 158, 460 + 3 * 18.5 - 2.5, 158, C_BAD, 1.2);
    [460, 460 + 3 * 18.5 - 2.5].forEach(function (x) { hline(latT, x, 154, x, 162, C_BAD, 1.2); });
    latT.appendChild(paint(svgText(522, 162, '0.3 s 的余量 > 0.1 s 的延迟（UMI 的做法）', null, 9), C_BAD));
    latT.appendChild(svgText(460, 192, '执行完 5 步就用新画面重新预测 16 步', 'demo-x-ink2', 9.5));
    latT.appendChild(svgText(460, 208, '板载 3 亿参数模型约 100 ms 延迟（第 5 节）', 'demo-x-mut', 9));
    /* 右下：成功率 */
    var res = group(s);
    rectBox(res, 446, 236, 324, 168, C_BORDER, C_SURFACE2);
    res.appendChild(svgText(460, 256, '20 次测试的成功率（第 5 节）', 'demo-x-ink2', 11));
    var RY = 364, RS = 0.95;  // 柱子与两行标签上移，给最底下一行留位置
    var rbars = [['双臂：桌上的章鱼进小车', DP.bimanualPct], ['全身：跪下从地上捡', DP.fullBodyPct]].map(function (r, k) {
      var x = 500 + k * 140;
      var bar = vbar(res, x, RY, 50, k ? C_WARN : C_GOOD, 0.9);
      var v = svgText(x + 25, 0, r[1] + '%', 'demo-x-ink2', 11, 'middle');
      res.appendChild(v);
      res.appendChild(svgText(x + 25, RY + 14, r[0], 'demo-x-mut', 8.5, 'middle'));
      return { b: bar, v: v, h: r[1] * RS };
    });
    res.appendChild(svgText(460, 396, '转腰、松手、跪下用开环动作，和闭环策略混用', 'demo-x-mut', 9.5, 'start'));

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
      var pts = [];  // 曲线收在 y 232–308，不碰下面「力从哪来」
      for (var i = 0; i <= 40; i++) { var x = i / 40; pts.push([DX0 + x * (DX1 - DX0), DY - 26 * Math.sin(x * 4.5) - 24 * amp * noise[i]]); }
      setPath(traj, pts);
      stepT.textContent = step === 0 ? '噪声' : '去噪第 ' + step + ' 步' + (step === 3 ? '：动作轨迹' : '');
      setOpacity(forceT, seg(t, 7.0, 7.5));
      /* 领导角来回压（0 → 0.75 rad），跟随角被物体卡在 QC；Δq 弧和力箭头跟着差长 */
      var qL = 0.75 * (0.5 - 0.5 * Math.cos(now * 1.3)), qF = Math.min(qL, QC), dq = qL - qF;
      function armEnd(q) { return [PV[0] + ARM * Math.cos(q), PV[1] + ARM * Math.sin(q)]; }
      var eL = armEnd(qL), eF = armEnd(qF);
      setLine(leadArm, PV[0], PV[1], eL[0], eL[1]); setLine(follArm, PV[0], PV[1], eF[0], eF[1]);
      var arc = []; for (var ai = 0; ai <= 12; ai++) { var qa = qF + dq * ai / 12; arc.push([PV[0] + 62 * Math.cos(qa), PV[1] + 62 * Math.sin(qa)]); }
      setPath(dqArc, dq > 0.01 ? arc : []);
      /* Δq 标在弧的下端外侧（领导臂虚线下方），楔形太窄时不标 */
      var qm = qL + 0.22; dqT.setX(PV[0] + 56 * Math.cos(qm)); dqT.setY(PV[1] + 56 * Math.sin(qm) + 10);
      setOpacity(dqT, dq > 0.08 ? 1 : 0);
      var fl = 60 * dq, fx0 = eF[0] - 2;
      setPath(fArrow, dq > 0.01 ? [[fx0, objTop - 2 - fl], [fx0, objTop - 2], [fx0 - 4, objTop - 8], [fx0, objTop - 2], [fx0 + 4, objTop - 8]] : []);
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
    /* 左半：躯干与箱子按同一比例并排比大小（宽 13 对 27 cm、高 12 对 31 cm）；右半：小人把箱子抱在身前 */
    var torsoR = paint(svgEl('rect', { x: 60, y: 144, width: 26, height: 24, rx: 3, 'stroke-width': 1.3 }), C_SURFACE, C_INK2);
    span.appendChild(torsoR);
    /* 名字和尺寸分两行：并排写一行时两段字会连成「13×9×12箱子」 */
    span.appendChild(svgText(73, 182, '躯干', 'demo-x-mut', 9, 'middle'));
    span.appendChild(svgText(73, 195, '13×9×12', 'demo-x-mut', 9, 'middle'));
    var bigBox = paint(svgEl('rect', { x: 110, y: 168, width: 0, height: 0, rx: 4, 'stroke-width': 1.5 }), C_SURFACE, C_GOOD);
    span.appendChild(bigBox);
    span.appendChild(svgText(137, 182, '箱子', 'demo-x-mut', 9, 'middle'));
    span.appendChild(svgText(137, 195, '27×24×31', 'demo-x-mut', 9, 'middle'));
    var bigT = group(span);
    bigT.appendChild(paint(svgText(137, 88, '体积约 14 倍', null, 10, 'middle'), C_GOOD));
    bigT.appendChild(svgText(137, 101, '（单位 cm）', 'demo-x-mut', 9, 'middle'));
    var hugger = tbFront(span, C_INK2, 120);
    /* 抱在身前的箱子按小人的比例画（56 cm 高的身子对 27 × 31 cm 的箱子），盖住躯干和大半条腿，手臂从两侧绕过去 */
    var heldBox = paint(svgEl('rect', { x: 282, y: 108, width: 36, height: 41, rx: 3, 'stroke-width': 1.5 }), C_SURFACE, C_GOOD);
    span.appendChild(heldBox);
    span.appendChild(svgText(300, 190, '柔顺手掌抱住箱子，同时站稳', 'demo-x-ink2', 9.5, 'middle'));
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
    endG.appendChild(svgText(190, 318, '电机变热 → 出训练分布 → 摔得变多', 'demo-x-mut', 8.5));
    /* 温度计跟着耐久条一起涨 */
    endG.appendChild(paint(svgEl('rect', { x: 352, y: 290, width: 8, height: 30, rx: 4, 'stroke-width': 1.2 }), C_SURFACE2, C_BAD));
    endG.appendChild(paint(svgEl('circle', { cx: 356, cy: 324, r: 6, 'stroke-width': 1.2 }), C_BAD, C_BAD));
    var thermo = vbar(endG, 354, 322, 4, C_BAD, 0.9);
    /* 修一次画成两段条：打印 21 分钟 + 装配 14 分钟（含校零），每分钟 5 px */
    var repG = group(load);
    repG.appendChild(svgText(190, 350, '摔 7 次才坏；修一次 35 分钟：', 'demo-x-ink2', 10));
    var rp1 = hbar(repG, 190, 360, 18, C_ACCENT, 0.85), rp2 = hbar(repG, 295, 360, 18, C_GOOD, 0.85);
    var rpT1 = paint(svgText(242, 373, '打印 21', null, 9.5, 'middle'), C_INK), rpT2 = paint(svgText(330, 373, '装配 14', null, 9.5, 'middle'), C_INK);
    repG.appendChild(rpT1); repG.appendChild(rpT2);
    repG.appendChild(svgText(190, 394, '（分钟；装配含校零）', 'demo-x-mut', 8.5));
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
    var BY0 = 350, BX = [460, 580, 700];  // 两行轴标签在 364 / 377，和底下 398 那行结论隔开
    var tbars = ROWS.map(function (r, k) {
      var g = group(bars), x = BX[k];
      var bs = vbar(g, x - 28, BY0, 26, C_SIM, 0.9), br = vbar(g, x + 2, BY0, 26, C_REAL, 0.9);
      var vs = svgText(x - 15, 0, String(r[1][0]), 'demo-x-ink2', 9, 'middle'), vr = svgText(x + 15, 0, String(r[1][1]), 'demo-x-ink2', 9, 'middle');
      g.appendChild(vs); g.appendChild(vr);
      g.appendChild(svgText(x, BY0 + 14, r[0], 'demo-x-mut', 9, 'middle'));
      g.appendChild(svgText(x, BY0 + 27, '± ' + r[1][2], 'demo-x-mut', 8.5, 'middle'));
      return { bs: bs, br: br, vs: vs, vr: vr, hs: r[1][0] * r[2] * 0.9, hr: r[1][1] * r[2] * 0.9 };  // 每组按自己的单位缩放，最高约 122 px
    });
    var gapT = paint(svgText(420, 398, 'sim-to-real 差距（真机多的 0.016 m/s）比跟踪差距小 → 零样本成功', null, 9.5), C_GOOD);
    right.appendChild(gapT);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(span, seg(t, 0.2, 0.7));
      var bu = ease(seg(t, 0.6, 2.4));
      bigBox.setAttribute('width', (54 * bu).toFixed(1)); bigBox.setAttribute('height', (62 * bu).toFixed(1));
      bigBox.setAttribute('y', (168 - 62 * bu).toFixed(1));
      /* 上臂外展到箱子两侧、前臂往里收：肩宽 24 px，箱宽 36 px */
      var arm = [0.15 + 0.5 * bu, 0.2 + 1.23 * bu];
      hugger.put(300, 80, { armA: arm, armB: arm });
      setOpacity(heldBox, seg(t, 1.2, 2.0));
      setOpacity(bigT, seg(t, 2.4, 2.9));
      setOpacity(load, seg(t, 3.6, 4.0));
      var n = Math.round(6 * ease(seg(t, 3.9, 5.4)));
      weights.forEach(function (w, k) { setOpacity(w, k < n ? 1 : 0.12); });
      wT.textContent = n ? Math.round(1484 * n / 6) + ' g' + (n === 6 ? '（体重的 40%）' : '') : '';
      setOpacity(endG, seg(t, 7.0, 7.4));
      var eu = ease(seg(t, 7.2, 9.0));
      setW(endBar, 180 * eu);
      endT.textContent = '最长 ' + Math.round(19 * eu) + ' 分钟不摔';
      setH(thermo, 26 * eu);
      setOpacity(repG, seg(t, 9.0, 9.5));
      setW(rp1, 105 * ease(seg(t, 9.2, 9.7))); setW(rp2, 70 * ease(seg(t, 9.7, 10.1)));
      setOpacity(rpT1, seg(t, 9.5, 9.8)); setOpacity(rpT2, seg(t, 9.9, 10.2));
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
    var s = sceneSvg('左边是图 5 的八步故事：Arya 从小桌上拿起粉色章鱼、抛进小车，走到把手、抓住推车往前走，Toddy 同时走过来，跪下捡起地上的紫色章鱼，两台转身并肩离开；中间是复刻的证据：没做过硬件的学生 3 天、五个团队约一周、策略换机器人仍 90%；右边是局限和代码 2.0 的更新，每条前面一个小图标，最后一行引出下一篇：人类动作数据从哪里来');
    s.appendChild(svgText(30, 28, '可复现的证据、局限，以及之后', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 390, 200, C_BORDER, C_SURFACE2);
    left.appendChild(svgText(44, 64, '两台机器人合作收玩具（图 5）：Arya 与 Toddy', 'demo-x-ink2', 11));
    left.appendChild(svgText(44, 84, '绿 Arya · 蓝 Toddy · 橙 小车 · 粉 / 紫 章鱼', 'demo-x-mut', 9));
    var GY = 196, RS = 136;  // 头顶在 y 95，不碰 y 84 那行图例
    hline(left, 44, GY, 406, GY, C_BORDER, 1.4);
    var story = group(left);
    /* 小桌（粉章鱼一开始在桌上） */
    var TBL = { x0: 58, x1: 90, top: 138 };
    story.appendChild(paint(svgEl('rect', { x: TBL.x0, y: TBL.top, width: TBL.x1 - TBL.x0, height: 4, rx: 1.5 }), C_MUTED));
    hline(story, TBL.x0 + 4, TBL.top + 4, TBL.x0 + 4, GY, C_MUTED, 2); hline(story, TBL.x1 - 4, TBL.top + 4, TBL.x1 - 4, GY, C_MUTED, 2);
    var aryaG = group(story), toddyG = group(story);
    var arya = tbSide(aryaG, C_GOOD, RS), toddy = tbSide(toddyG, C_ACCENT, RS);
    var wagon = group(story);
    wagon.appendChild(paint(svgEl('rect', { x: 0, y: -22, width: 40, height: 20, rx: 3, 'stroke-width': 1.3 }), C_SURFACE, C_WARN));
    wagon.appendChild(paint(svgEl('circle', { cx: 8, cy: 0, r: 4 }), C_WARN)); wagon.appendChild(paint(svgEl('circle', { cx: 32, cy: 0, r: 4 }), C_WARN));
    var handleBar = hline(wagon, 0, -20, -8, -48, C_WARN, 1.8);  // 把手从车身左上角斜伸出来，顶端在 y = 地面 − 54
    void handleBar;
    var pink = paint(svgEl('circle', { r: 5 }), '#e88fb5'), purple = paint(svgEl('circle', { r: 5 }), '#a77bdb');
    story.appendChild(pink); story.appendChild(purple);
    var steps = ['粉章鱼', '放进车', '走到把手', '抓把手', '推车', 'Toddy 到位', '跪下捡', '并肩离开'];  // 每格 46 px，字要短
    var stepDots = steps.map(function (str, k) {
      var g = group(left);
      dotAt(g, 56 + k * 46, 222, 4, C_MUTED);
      g.appendChild(svgText(56 + k * 46, 238, str, 'demo-x-mut', 8.5, 'middle'));
      return g;
    });
    /* 中：复刻 */
    var mid = group(s);
    rectBox(mid, 30, 256, 390, 148, C_GOOD, C_SURFACE);
    mid.appendChild(paint(svgText(44, 276, '可复现（第 5 节、附录 8.16）', null, 11), C_GOOD));
    var repChips = [['没做过硬件的 CS 学生按手册装第二台：3 天（含打印）', C_GOOD], ['社区五组复刻，多数一周内完成（图 15）', C_GOOD], ['一台采的数据训的策略放到另一台：仍 90%（20 次）', C_ACCENT], ['RL 行走策略两台互换；第二台不用再做 sysID', C_ACCENT]].map(function (r, k) {
      return chip(mid, 44, 286 + k * 29, 364, r[0], r[1], { size: 9.5, h: 25 });
    });
    /* 右：局限与之后，每条前面一个小图标 */
    var right = group(s);
    rectBox(right, 436, 44, 334, 360, C_BORDER, C_SURFACE2);
    right.appendChild(paint(svgText(450, 64, '局限（第 7 节）', null, 11), C_BAD));
    function icon(parent, kind, x, y, color) {
      var g = group(parent);
      if (kind === 'ceiling') { g.appendChild(paint(svgEl('rect', { x: x + 2, y: y - 5, width: 9, height: 8, rx: 1.5, 'stroke-width': 1.2 }), C_SURFACE, color)); hline(g, x, y - 8, x + 13, y - 8, color, 1.6); }
      else if (kind === 'thermo') { g.appendChild(paint(svgEl('rect', { x: x + 4, y: y - 10, width: 5, height: 10, rx: 2.5, 'stroke-width': 1.1 }), C_SURFACE, color)); g.appendChild(paint(svgEl('circle', { cx: x + 6.5, cy: y + 1.5, r: 3 }), color)); }
      else if (kind === 'small') { g.appendChild(paint(svgEl('rect', { x: x, y: y - 3, width: 4, height: 4, rx: 0.8 }), color)); g.appendChild(paint(svgEl('rect', { x: x + 6, y: y - 9, width: 9, height: 10, rx: 1.2, fill: 'none', 'stroke-width': 1.1 }), null, color)); }
      else if (kind === 'crack') { g.appendChild(paint(svgEl('rect', { x: x, y: y - 9, width: 12, height: 11, rx: 1.5, 'stroke-width': 1.1 }), C_SURFACE, color)); pathLine(g, [[x + 4, y - 9], [x + 7, y - 5], [x + 4, y - 2], [x + 8, y + 2]], color, 1.2); }
      else if (kind === 'board') { g.appendChild(paint(svgEl('rect', { x: x + 2, y: y - 8, width: 9, height: 9, rx: 1.2, 'stroke-width': 1.1 }), C_SURFACE, color)); [x, x + 13].forEach(function (px) { [y - 6, y - 3, y].forEach(function (py) { hline(g, px - 1, py, px + 1.5, py, color, 1); }); }); }
      else if (kind === 'eye') { pathLine(g, [[x, y - 3], [x + 6.5, y - 8], [x + 13, y - 3], [x + 6.5, y + 2], [x, y - 3]], color, 1.2); g.appendChild(paint(svgEl('circle', { cx: x + 6.5, cy: y - 3, r: 2 }), color)); }
      else if (kind === 'flip') { var ap = []; for (var i = 0; i <= 12; i++) { var a = Math.PI * (1.1 - 1.4 * i / 12); ap.push([x + 6.5 + 6 * Math.cos(a), y - 2 - 6 * Math.sin(a)]); } pathLine(g, ap, color, 1.3); pathLine(g, [[ap[12][0] - 3, ap[12][1] - 1], ap[12], [ap[12][0] + 1, ap[12][1] - 4]], color, 1.3); }
      return g;
    }
    var limRows = [['ceiling', '现成电机：转速、力矩、通信速度是天花板'], ['thermo', '执行器模型不含温度，接近极限不准'], ['small', '小尺寸只能和缩小的物体打交道'], ['crack', '3D 打印件撞击后比金属壳更容易坏']].map(function (r, k) {
      var g = group(right);
      icon(g, r[0], 450, 86 + k * 20, C_BAD);
      g.appendChild(svgText(470, 86 + k * 20, r[1], 'demo-x-ink2', 9.5));
      return g;
    });
    var nextG = group(right);
    nextG.appendChild(paint(svgText(450, 184, '下一步与代码 2.0（2025-08）', null, 11), C_GOOD));
    var nextRows = [['board', '自制通信板：控制频率 50 → 200 Hz'], ['thermo', '执行器模型加上热量；设计提强度'], ['eye', '立体视觉深度、多 IMU、触觉'], ['flip', '2.0：侧手翻、爬行、VR 遥操作']].map(function (r, k) {
      var g = group(nextG);
      icon(g, r[0], 450, 206 + k * 20, C_GOOD);
      g.appendChild(svgText(470, 206 + k * 20, r[1], 'demo-x-ink2', 9.5));
      return g;
    });
    var img = robotImg(right, 712, 400, 112);
    var after = group(right);
    /* svgRich 不会自动折行，分两行写，右边留给机器人图 */
    after.appendChild(svgRich(450, 304, '**三件事**：可复现当硬约束、30 自由度', { size: 9.5, w: 250, cls: 'demo-x-good' }));
    after.appendChild(svgRich(450, 322, '接近人的 $\\tilde p$、两边都能采数据的工具链', { size: 9.5, w: 250, cls: 'demo-x-good' }));
    after.appendChild(svgText(450, 356, '真机数据靠遥操作，仿真数据靠数字孪生——', 'demo-x-ink2', 9.5));
    after.appendChild(svgText(450, 372, '那人类的动作数据从哪里来、怎样搬到机器人身上？', 'demo-x-ink2', 9.5));
    after.appendChild(svgText(450, 392, '下一篇：HumanML3D / GMR', 'demo-x-acc', 10));

    /* ── 故事板的运动学 ──
       一轮 16 s、每步 2 s。人物按 RS = 136 px 对应 0.56 m 画，重力按同一比例 g = 9.81 × 136 / 0.56 px/s²。
       走路不打滑：每只脚在支撑期钉在地上（落在支撑中点时髋的正下方），摆动期抬起移到下一个落脚点。 */
    var GPX = 9.81 * RS / 0.56, UA = 0.11 * RS, FA = 0.1 * RS, SHO = 0.17 * RS, HIP_Y = GY - 0.37 * RS, ANK_Y = GY - 0.02 * RS;
    function lerp(a, b, u) { return a + (b - a) * u; }
    function win(tau, a, b) { return ease(clamp((tau - a) / (b - a), 0, 1)); }
    function aryaX(tau) { return lerp(lerp(104, 118, win(tau, 4.2, 5.8)), 228, win(tau, 8.0, 11.6)) + 30 * win(tau, 14.2, 15.8); }
    function toddyX(tau) { return lerp(398, 352, win(tau, 8.4, 11.6)) + 30 * win(tau, 14.2, 15.8); }
    var WAG0 = 146;  // 小车停着时车身左边，Arya 走到 118 时手正好够到把手
    function wagonX(tau) { return aryaX(tau) >= 118 && tau >= 8.0 ? aryaX(tau) + (WAG0 - 118) : WAG0; }
    function feet(xf, tau, phaseOff) {
      var P = 0.9, p = ((tau / P + phaseOff) % 1 + 1) % 1, ts = tau - p * P;
      var a = xf(clamp(ts + 0.25 * P, 0, 15.99)), b = xf(clamp(ts + 1.25 * P, 0, 15.99));
      if (p < 0.5 || Math.abs(b - a) < 0.5) return [a, ANK_Y];
      var u = (p - 0.5) / 0.5;
      return [lerp(a, b, 0.5 - 0.5 * Math.cos(Math.PI * u)), ANK_Y - 5 * Math.sin(Math.PI * u)];
    }
    /* 两连杆手臂 IK（肩 S 到手 H，肘往下弯），返回 tbSide 的 [肩角, 肘角]；够不着时伸直指向目标 */
    function armIK(S, H, pitch) {
      var dx = H[0] - S[0], dy = H[1] - S[1], d = clamp(Math.hypot(dx, dy), Math.abs(UA - FA) + 0.5, UA + FA - 0.2);
      var base = Math.atan2(dx, dy), bend = Math.acos(clamp((UA * UA + d * d - FA * FA) / (2 * UA * d), -1, 1));
      var a1 = base - bend, el = [S[0] + UA * Math.sin(a1), S[1] + UA * Math.cos(a1)];
      return [a1 - pitch, Math.atan2(H[0] - el[0], H[1] - el[1]) - a1];
    }
    function face(g, hx, left) { g.setAttribute('transform', left ? 'matrix(-1 0 0 1 ' + (2 * hx).toFixed(1) + ' 0)' : ''); }
    function toLocal(x, hx, left) { return left ? 2 * hx - x : x; }
    var PINK0 = [76, TBL.top - 5], BED = [0, GY - 6 - 22 + 2], PURPLE0 = [322, GY - 5];

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.7));
      var tau = now % 16, stepIdx = Math.floor(tau / 2);
      setOpacity(story, Math.min(1, tau / 0.25, (16 - tau) / 0.25));  // 一轮结束淡出、重来淡入
      stepDots.forEach(function (g, k) { g.style.opacity = k <= stepIdx ? 1 : 0.35; g.firstChild.style.fill = k <= stepIdx ? C_GOOD : C_MUTED; });
      /* Arya：0–2.2 s 面朝小桌（左）拿粉章鱼，之后面朝右 */
      var ax = aryaX(tau), aLeft = tau < 2.2, pitchA = 0.04;
      face(aryaG, ax, aLeft);
      var fA = [feet(aryaX, tau, 0), feet(aryaX, tau, 0.5)];
      var shA = [ax + SHO * Math.sin(pitchA), HIP_Y - SHO * Math.cos(pitchA)];  // 局部坐标（朝左时已镜像）
      var wl = wagonX(tau), handleTop = [wl - 8, GY - 54];
      var armA, pinkPos;
      if (tau < 2.2) {
        /* 伸手到桌上（0.2–0.9 s）、抓住、收回胸前（1.1–1.9 s） */
        var reach = win(tau, 0.2, 0.9) * (1 - win(tau, 1.1, 1.9));
        var tgt = [toLocal(PINK0[0], ax, true), PINK0[1]], rest = [shA[0] + 8, shA[1] + 24];
        var H = [lerp(rest[0], tgt[0], reach), lerp(rest[1], tgt[1], reach)];
        armA = armIK(shA, H, pitchA);
      } else if (tau < 3.0) {
        armA = [lerp(0.6, 1.25, win(tau, 2.2, 2.9)), 0.15];  // 往前上方甩
      } else if (tau < 6.0) {
        armA = [lerp(1.25, 0.2, win(tau, 3.0, 3.6)), 0.2];
      } else {
        var g2 = win(tau, 6.0, 7.2);
        var Hh = [lerp(shA[0] + 6, handleTop[0], g2), lerp(shA[1] + 26, handleTop[1], g2)];
        armA = armIK(shA, Hh, pitchA);
      }
      var poseA = arya.put(ax, HIP_Y, pitchA, [[toLocal(fA[0][0], ax, aLeft), fA[0][1]], [toLocal(fA[1][0], ax, aLeft), fA[1][1]]], armA);
      var handA = [aLeft ? 2 * ax - poseA.hand[0] : poseA.hand[0], poseA.hand[1]];
      /* 粉章鱼：桌上 → 0.9 s 抓起跟着手 → 3.0 s 松手，按真实重力抛进车里（飞 0.3 s）→ 跟着车走 */
      BED[0] = wl + 20;
      if (tau < 0.9) pinkPos = PINK0;
      else if (tau < 3.0) pinkPos = handA;
      else {
        /* 松手点 = 3.0 s 时手的位置（Arya 停在 104、手臂 [1.25, 0.15]），直接按正运动学算，不依赖上一帧 */
        var r0 = [104 + SHO * Math.sin(pitchA) + UA * Math.sin(1.25 + pitchA) + FA * Math.sin(1.4 + pitchA), HIP_Y - SHO * Math.cos(pitchA) + UA * Math.cos(1.25 + pitchA) + FA * Math.cos(1.4 + pitchA)];
        var T = 0.3, ft = tau - 3.0;
        if (ft < T) {
          var vx = (BED[0] - r0[0]) / T, vy = (BED[1] - r0[1] - 0.5 * GPX * T * T) / T;
          pinkPos = [r0[0] + vx * ft, r0[1] + vy * ft + 0.5 * GPX * ft * ft];
        } else pinkPos = BED.slice();
      }
      moveDot(pink, pinkPos);
      wagon.setAttribute('transform', 'translate(' + wl.toFixed(1) + ' ' + (GY - 6) + ')');
      /* Toddy：朝左走过来；12.0–12.7 s 跪下（膝着地、小腿贴地、上身前倾到 1.2 rad），12.9 s 抓起紫章鱼，13.2–13.9 s 站起；14.1 s 转身朝右 */
      var tx = toddyX(tau), tLeft = tau < 14.1;
      face(toddyG, tx, tLeft);
      var kn = win(tau, 12.0, 12.7) * (1 - win(tau, 13.2, 13.9));
      var hyT = lerp(HIP_Y, GY - 2 - 0.18 * RS, kn), pitchT = 1.2 * kn;
      var fT = [feet(toddyX, tau, 0.25), feet(toddyX, tau, 0.75)].map(function (f) { return [toLocal(f[0], tx, tLeft), f[1]]; });
      fT = fT.map(function (f, k) { return [lerp(f[0], tx - 0.19 * RS - 2 * k, kn), lerp(f[1], ANK_Y, kn)]; });
      var shT = [tx + SHO * Math.sin(pitchT), hyT - SHO * Math.cos(pitchT)];
      var holding = tau >= 12.9;
      var armT;
      if (tau >= 11.8 && tau < 13.9) {
        var pickL = [toLocal(PURPLE0[0], tx, true), PURPLE0[1] - 4];
        var chest = [shT[0] + 10, shT[1] + 18];
        var gr = tau < 12.9 ? win(tau, 11.8, 12.8) : 1 - win(tau, 12.9, 13.9);
        armT = armIK(shT, [lerp(chest[0], pickL[0], gr), lerp(chest[1], pickL[1], gr)], pitchT);
      } else armT = [holding ? 0.9 : 0.1, holding ? 0.9 : 0.3];
      var poseT = toddy.put(tx, hyT, pitchT, fT, armT);
      var handT = [tLeft ? 2 * tx - poseT.hand[0] : poseT.hand[0], poseT.hand[1]];
      moveDot(purple, holding ? handT : PURPLE0);
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
        { at: 3.6, s: '为什么敢全 3D 打印（附录 8.1）：悬臂梁 $\\delta/L \\propto P/(3EL^2)$；载荷又随体重按 $L^3$ 一起缩小，代进去是 $\\delta/L \\propto L/E$，零件越小越不容易弯（这一步是我们补的）。小尺寸的打印件和全尺寸的铝件强度相当。' },
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
