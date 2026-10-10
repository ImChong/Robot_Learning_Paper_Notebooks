/* Interactive demos for papers/12_Hardware_Design/Berkeley_Humanoid_A_Research_Platform_for_Learning-based_Control
 * （Liao, Zhang, Huang, Huang, Li, Sreenath · Berkeley Humanoid: A Research Platform for Learning-based Control ·
 *   arXiv 2407.21781 v1，2024-07；ICRA 2025 版是课题组主页上的 8 页 PDF）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["berkeley_humanoid"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   bh-explainer — 十二幕讲解动画：仿真里学会、真机上走不好 → 孩子大小的人形（表 1）→ 执行器直接当关节 →
 *                  四种自研执行器（表 2）→ EtherCAT 与时序 → 可靠又便宜（表 3、4）→ 拟人的腿（表 5）→
 *                  最简的强化学习控制器 → 辨识：转子惯量与摩擦 → 随机化：硬件窄、环境宽（表 6）→
 *                  走出实验室（图 4–7）→ 仿真和真机差多少：图 8、单腿跳与局限
 *   bh-video     — 同一套十二幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   bh-armature  — 减速比与转子惯量：膝关节的反射惯量 N²·I_rotor 和小腿比，仿真里漏掉它差多少（单关节玩具）
 *   bh-actuator  — 一个关节在仿真里长什么样：开源代码的力矩—速度包络、辨识出的摩擦、表 2 的参考线
 *   bh-dr        — 窄随机化与宽随机化：同一个膝关节阶跃，按表 6 抽和再加「电机强度、PD 增益、±50% 质量」抽（单关节玩具）
 */

(function () {
  'use strict';

  var K = window.PaperDemoKit;
  /* 第 2 幕的真机图放在 assets/img/robots/，按本脚本自己的地址找（网页与离线视频都适用）；第 1、6、11、12 幕是按图 2b 尺寸画的侧视示意（bhBody） */
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

  // ─── 论文里的数字（arXiv 2407.21781 v1；ICRA 2025 版与它相同的不再单列） ───
  /* 第 3–5 节与附录表 4–6 照抄；图 7、8 没有标数，读图的值单独标「读图」。开源训练代码（HybridRobotics/isaac_berkeley_humanoid）
     与 URDF（HybridRobotics/berkeley_humanoid_description）的数单独标出。十二幕动画、三个演示、配音旁白与笔记「🚶 具体实例」共用这一份。 */
  var ROBOT = { kg: 16, heightM: 0.85, thigh: 0.22, calf: 0.18, foot: 0.16, ankleH: 0.06, legDof: 6, withArmsKg: 22, usd: 9955, withArmsUsd: 15000 }; // 第 3.1 节、图 2、表 1 脚注
  var TORSO_KG = 5.378; // URDF 的躯干（torso）；代码的 add_base_mass 把 ±1 kg 加在它上面
  var ACTUATORS = [
    // 表 2；「关节」一行取自 ICRA 版表 II，与开源代码一致
    { name: '5013', g: 251, ratio: 9, hollow: false, dia: 54.6, thick: 53, peak: 9.7, cont: 4.59, vmax: 83.7, watt: 220, rotor: 6.1e-6, joints: ['FAA'], qty: 2, usd: 422 },
    { name: '8513', g: 756, ratio: 9, hollow: true, dia: 104, thick: 50, peak: 45.3, cont: 18.9, vmax: 40.7, watt: 570, rotor: 6.9e-5, joints: ['HR', 'HAA', 'FFE'], qty: 6, usd: 570 },
    { name: '8518', g: 856, ratio: 9, hollow: true, dia: 104, thick: 55, peak: 62.6, cont: 26.1, vmax: 29, watt: 730, rotor: 9.4e-5, joints: ['HFE'], qty: 2, usd: 639 },
    { name: '10413', g: 1011, ratio: 9, hollow: true, dia: 123, thick: 50, peak: 81.1, cont: 34.2, vmax: 27.9, watt: 890, rotor: 1.5e-4, joints: ['KFE'], qty: 2, usd: 676 }
  ];
  var COST = { imu: 50, torso: 410, leg: 974, legQty: 2, pc: 347, battery: 153, batteryQty: 2, total: 9955, imuChip: 1, imuTypical: 1000 }; // 表 3、第 3.3 节
  var TABLE1 = [
    // 表 1：名字 / 尺寸（F 全尺寸、M 中等、S 小型）/ 重量 kg / 价格（千美元，未公开为 null）/ 每腿自由度 / 膝最大力矩 N·m
    ['WALK-MAN', 'F', 132, null, 6, 400], ['TORO', 'F', 76.4, null, 6, 130], ['Digit', 'F', 50, 250, 6, 230], ['Unitree H1', 'F', 47, 90, 5, 360],
    ['Cassie', 'F', 35, 250, 5, 195], ['Unitree G1', 'M', 35, 16, 6, 139], ['MIT', 'M', 24, null, 5, 144], ['HECTOR', 'M', 16, null, 5, 51.9],
    ['Berkeley Humanoid', 'M', 16, 10, 6, 81.1], ['NAO', 'S', 4.5, 14, 6, 1.61], ['BRUCE', 'S', 3.3, 6.5, 5, 10.5]
  ];
  var RATES = { policy: 50, estimator: 1000, pd: 25000, torqueBw: 1000, busLo: 1000, busHi: 4000, latAtLo: 2, latAtHi: 0.5, simSteps: 90000 }; // 第 3.1、3.2、4.1 节与脚注 1
  var NET = [512, 256, 128]; // 第 4.1 节：actor、critic 都是这个 MLP，ELU
  var DR = { friction: [0.2, 1.25], restitution: [0, 0.1], baseMassKg: [-1, 1], linkMass: [0.9, 1.1], jointFriction: [0.9, 1.1], armature: [1, 1.05], defaultPos: [-0.05, 0.05] }; // 附录表 6
  var NOISE = [['机身线速度', 0.1], ['机身角速度', 0.2], ['IMU（重力投影）', 0.05], ['髋关节角', 0.03], ['膝 KFE 角', 0.05], ['踝 FFE 角', 0.08], ['踝 FAA 角', 0.03], ['关节角速度', 1.5]]; // 附录表 6（±）
  var JOINT_RANGE = [
    // 附录表 5（右腿，度）：关节 / 中文 / 人 / 机器人 / 论文写的覆盖率 %
    ['HR', '髋旋转', [-50, 40], [-35, 35], 77.8], ['HAA', '髋外展', [-40, 20], [-35, 35], 91.6], ['HFE', '髋屈伸', [-110, 30], [-100, 30], 92.9],
    ['KFE', '膝屈伸', [0, 150], [0, 120], 80.0], ['FFE', '踝屈伸', [-20, 50], [-30, 70], 100.0], ['FAA', '踝内外翻', [-30, 18], [-30, 30], 100.0]
  ];
  var FALLS = [['石砖路', 6], ['草地', 14], ['跑道', 3], ['土路', 15]]; // 附录表 4
  var RELIAB = { falls: 38, failures: 2, resetS: [3, 5] }; // 第 5.3 节
  var FIELD = { terrains: 8, trailDeg: 20, stairCm: 4, stairLegPct: 10, campusM: 364, campusMin: 10, trailM: 96, trailRiseM: 10.5, trailMin: 5 }; // 第 5.1 节
  var SIM2REAL = { secs: 60, vx: [0.051, 0.058], vy: [0.086, 0.1156] }; // 第 5.2 节：[仿真, 真机]，m/s
  /* 开源代码 assets/berkeley_humanoid.py：力矩上限（README：出于安全压低）、速度上限、DCMotor 的饱和力矩、PD 增益、摩擦模型的参数 */
  var CODE_JOINTS = [
    { key: 'hxx', label: 'HR / HAA（髋旋转、髋外展）', act: '8513', effort: 20, vlim: 23, sat: 402, kp: 10, kd: 1.5, fs: 0.3, va: 0.1, fd: 0.02 },
    { key: 'hfe', label: 'HFE（髋屈伸）', act: '8518', effort: 30, vlim: 20, sat: 443, kp: 15, kd: 1.5, fs: 0.3, va: 0.1, fd: 0.02 },
    { key: 'kfe', label: 'KFE（膝）', act: '10413', effort: 30, vlim: 14, sat: 560, kp: 15, kd: 1.5, fs: 0.8, va: 0.1, fd: 0.02 },
    { key: 'ffe', label: 'FFE（踝屈伸）', act: '8513', effort: 20, vlim: 23, sat: 402, kp: 1, kd: 0.1, fs: 1.0, va: 0.1, fd: 0.02 },
    { key: 'faa', label: 'FAA（踝内外翻）', act: '5013', effort: 5, vlim: 42, sat: 112, kp: 1, kd: 0.1, fs: 0.1, va: 0.1, fd: 0.005 }
  ];
  var CODE = { simDt: 0.005, decimation: 4, envs: 4096, stepsPerEnv: 24, iters: 30000, episodeS: 20, actionScale: 0.5, obsDim: 48, pushMax: 3.0 }; // velocity_env_cfg.py、rsl_rl_cfg.py
  /* URDF：小腿（ll_kfe 0.350 kg）加踝两段（0.099 + 0.507 kg）绕膝轴，按关节原点与惯性张量算出 */
  var SHANK = { m: 0.956, lc: 0.155, I: 0.0288 };
  var G = 9.81;

  function act(name) {
    for (var i = 0; i < ACTUATORS.length; i++) if (ACTUATORS[i].name === name) return ACTUATORS[i];
    return null;
  }
  /* 转子惯量折算到关节：减速比 N 时乘 N²（代码里写成 armature = rotor × 81） */
  function armature(a, N) {
    var n = N == null ? a.ratio : N;
    return a.rotor * n * n;
  }
  var KNEE_ARM = armature(act('10413')); // 0.01215 kg·m²
  var ARM_SHARE = KNEE_ARM / SHANK.I; // 0.42
  function actuatorKg() {
    return ACTUATORS.reduce(function (s, a) { return s + a.g * a.qty; }, 0) / 1000; // 8.772 kg
  }
  function actuatorUsd() {
    return ACTUATORS.reduce(function (s, a) { return s + a.usd * a.qty; }, 0); // 6894
  }
  function costTotal() {
    return actuatorUsd() + COST.imu + COST.torso + COST.leg * COST.legQty + COST.pc + COST.battery * COST.batteryQty; // 9955
  }
  /* 覆盖率 = 机器人范围与人的范围重叠的角度 / 人的范围 */
  function coverage(h, r) {
    var lo = Math.max(h[0], r[0]), hi = Math.min(h[1], r[1]);
    return Math.max(0, hi - lo) / (h[1] - h[0]);
  }
  /* 开源代码的摩擦模型（actuator_pd.py）：τ_f = F_s·tanh(q̇ / v_a) + F_d·q̇ */
  function frictionTorque(j, qd) {
    return j.fs * Math.tanh(qd / j.va) + j.fd * qd;
  }
  /* Isaac Lab 的 DCMotor：力矩上限沿 saturation·(1 − q̇/v_lim) 往下走，再夹在 ±effort_limit 之间 */
  function torqueEnvelope(j, qd) {
    return clamp(j.sat * (1 - qd / j.vlim), 0, j.effort);
  }

  // ─── 单关节玩具：膝关节带着小腿和脚（URDF），PD 增益与摩擦取开源代码的 KFE ───
  /* 大腿竖直不动，θ 是膝的屈曲角（0 = 小腿竖直垂下），重力把小腿往回拉；驱动器上的 PD 直接闭环（论文 25 kHz，这里 5 kHz 积分）。
     这是简化模型，数值不能和论文直接比：只用来看「转子惯量漏没漏」「随机化给多宽」这两件事的机制。 */
  var TOY = { I: SHANK.I, arm: KNEE_ARM, mgl: SHANK.m * G * SHANK.lc, kp: 15, kd: 1.5, fs: 0.8, va: 0.1, fd: 0.02, tau: 30, dt: 0.0002, step: 0.5, T: 0.4, every: 0.005 };
  function toyRun(p, T, every) {
    var o = p || {};
    var sm = o.mass == null ? 1 : o.mass, sf = o.fric == null ? 1 : o.fric, sa = o.arm == null ? 1 : o.arm;
    var st = o.strength == null ? 1 : o.strength, skp = o.kp == null ? 1 : o.kp, skd = o.kd == null ? 1 : o.kd;
    var armBase = o.armBase == null ? TOY.arm : o.armBase;
    var J = TOY.I * sm + armBase * sa;
    var th = 0, w = 0, out = [];
    var n = Math.round((T || TOY.T) / TOY.dt), se = Math.round((every || TOY.every) / TOY.dt);
    for (var i = 0; i <= n; i++) {
      if (i % se === 0) out.push(th);
      if (i === n) break;
      var tau = st * (TOY.kp * skp * (TOY.step - th) - TOY.kd * skd * w);
      tau = clamp(tau, -TOY.tau, TOY.tau);
      var fr = sf * (TOY.fs * Math.tanh(w / TOY.va) + TOY.fd * w);
      var acc = (tau - fr - sm * TOY.mgl * Math.sin(th)) / J;
      w += acc * TOY.dt;
      th += w * TOY.dt;
    }
    return out;
  }
  /* 起步那一下的角加速度：误差 0.5 rad 乘 K_p，除以总惯量 */
  function startAccel(withArm, armBase) {
    var a = armBase == null ? TOY.arm : armBase;
    return (TOY.kp * TOY.step) / (TOY.I + (withArm ? a : 0));
  }
  var TOY_NOM = toyRun();
  var TOY_NOARM = toyRun({ arm: 0 });
  var TOY_AT = Math.round(0.04 / TOY.every); // 第 3 幕和演示 1 都读 0.04 s 时的角度
  /* 两种随机化：表 6 能套到单个关节上的几项（连杆质量、关节摩擦、转子惯量）；
     对照组再加《真实世界人形行走》v1 表 I 里的电机强度 ×0.85–1.15、K_p / K_d ×0.9–1.1，质量放到 ×0.5–1.5。
     关节零位两边都随机化（这里 ±0.05 rad、那边 0–0.035 rad），它只平移终点，玩具里两组都不加。 */
  var DR_SETS = {
    narrow: { label: '表 6：只随机化辨识得到的量', mass: DR.linkMass, fric: DR.jointFriction, arm: DR.armature },
    wide: { label: '再加电机强度、PD 增益、±50% 质量', mass: [0.5, 1.5], fric: DR.jointFriction, arm: DR.armature, strength: [0.85, 1.15], kp: [0.9, 1.1], kd: [0.9, 1.1] }
  };
  function drBatch(kind, n, seed) {
    var rng = mulberry32(seed), set = DR_SETS[kind], runs = [];
    function U(r) { return r[0] + (r[1] - r[0]) * rng(); }
    for (var k = 0; k < n; k++) {
      var p = { mass: U(DR.linkMass), fric: U(set.fric), arm: U(set.arm) };
      if (kind === 'wide') {
        p.mass = U(set.mass); p.strength = U(set.strength); p.kp = U(set.kp); p.kd = U(set.kd);
      }
      runs.push(toyRun(p));
    }
    var lo = [], hi = [];
    for (var i = 0; i < runs[0].length; i++) {
      var a = Infinity, b = -Infinity;
      runs.forEach(function (r) { a = Math.min(a, r[i]); b = Math.max(b, r[i]); });
      lo.push(a); hi.push(b);
    }
    var width = 0;
    for (var j = 0; j < lo.length; j++) width = Math.max(width, hi[j] - lo[j]);
    return { runs: runs, lo: lo, hi: hi, width: width };
  }
  function insideShare(band, real) {
    var c = 0;
    for (var i = 1; i < real.length; i++) if (real[i] >= band.lo[i] - 1e-9 && real[i] <= band.hi[i] + 1e-9) c++;
    return c / (real.length - 1);
  }
  var DR_N = 40, DR_SEED = 7;
  var DR_NARROW = drBatch('narrow', DR_N, DR_SEED);
  var DR_WIDE = drBatch('wide', DR_N, DR_SEED);
  var DR_RATIO = DR_WIDE.width / DR_NARROW.width; // 种子 7：约 7.1 倍；换种子 1、2、3、11 是 4.9–9.0 倍
  var DR_REAL_FRIC = 1.2; // 第 10 幕：真机摩擦若比辨识值大 20%
  var DR_REAL_OFF = toyRun({ fric: DR_REAL_FRIC });

  // ─── 演示 1：减速比与转子惯量 ───────────────────────────────────────────────
  function buildArmatureDemo(host) {
    var root = card(host, {
      title: '减速比与转子惯量：仿真里漏掉 $N^2 I_{\\text{rotor}}$ 会差多少',
      sub: '膝关节带着小腿和脚（URDF：0.956 kg，绕膝 0.0288 kg·m²），PD 增益与摩擦取开源代码的 KFE，目标从 0 跳到 0.5 rad。拖减速比 $N$，看折算到关节的转子惯量和「仿真忘了加」时的差别。'
    });
    var state = { N: 9 };
    var row = controlsRow(root);
    slider(row, { label: '减速比 $N$（表 2 都是 9:1）', min: 1, max: 50, step: 1, value: 9, format: function (v) { return v + ' : 1'; }, onInput: function (v) { state.N = v; render(); } });
    var st = stage(root, 260);
    var setLegend = legend(root, [{ key: 'good', text: '━ 加了转子惯量（当真机）' }, { key: 'bad', text: '┅ 仿真里忘了加' }, { key: 'muted', text: '┄ 目标 0.5 rad' }]);
    var stats = statsRow(root);
    var sArm = stats.add('折算的转子惯量 $N^2 I_{\\text{rotor}}$'), sShare = stats.add('占小腿绕膝惯量'), sAcc = stats.add('起步角加速度：有 / 没有'), sAt = stats.add('0.04 s 时的角度：有 / 没有');
    var verdict = verdictBox(root);
    note(root, [
      '**这是简化模型，数值不能和论文直接比**：大腿竖直不动，只算膝关节；转子惯量取表 2 的 10413（$1.5\\times10^{-4}$ kg·m²），$N$ 只改折算的惯量，力矩和速度上限、摩擦都不跟着变——真换减速比，电机也得换。',
      '论文第 3.2 节：执行器直接当关节，转子惯量加到关节质量矩阵的对角线上（Isaac Lab 里叫 armature；开源代码写成 `rotor × 81`）。ICRA 版补了一句理由：小减速比的行星减速器能少放大齿槽力矩、摩擦和反射惯量的误差。'
    ]);
    var render = registerRenderer(function () {
      var arm = ACTUATORS[3].rotor * state.N * state.N;
      var withArm = toyRun({ armBase: arm }, 0.3);
      var without = toyRun({ arm: 0 }, 0.3);
      var g = begin(st), P = g.P;
      setLegend(P);
      var p = plot(g, { l: 46, r: 14, t: 22, b: 32 }, [0, 0.3], [0, 0.55]);
      axes(g, p, { xTicks: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3], yTicks: [0, 0.1, 0.2, 0.3, 0.4, 0.5], xLabel: '时间 s', yLabel: '膝角 rad' });
      line(g.ctx, [[p.x0, p.sy(0.5)], [p.x1, p.sy(0.5)]], P.muted, 1, [3, 3]);
      function pts(arr) { return arr.map(function (v, i) { return [p.sx(i * TOY.every), p.sy(v)]; }); }
      line(g.ctx, pts(without), P.bad, 2, [6, 4]);
      line(g.ctx, pts(withArm), P.good, 2.4);
      var k = TOY_AT;
      line(g.ctx, [[p.sx(0.04), p.y0], [p.sx(0.04), p.y1]], P.muted, 1, [2, 4]);
      dot(g.ctx, p.sx(0.04), p.sy(withArm[k]), 4, P.good);
      dot(g.ctx, p.sx(0.04), p.sy(without[k]), 4, P.bad);
      st.canvas.setAttribute('aria-label', '膝关节阶跃响应：加了转子惯量与忘了加的对比');
      var share = arm / SHANK.I;
      sArm.set('$' + sci(arm, 2) + '$ kg·m²');
      sShare.set(fmt(share * 100, share < 0.1 ? 1 : 0) + '%', share > 1 ? 'bad' : null);
      sAcc.set(fmt(startAccel(true, arm), 0) + ' / ' + fmt(startAccel(false), 0) + ' rad/s²');
      sAt.set(fmt(withArm[k], 3) + ' / ' + fmt(without[k], 3) + ' rad');
      if (state.N <= 3) verdict.set('减速比很小时，转子惯量折算过来只有小腿的百分之几，漏了也差不多。', 'learning');
      else if (state.N <= 12) verdict.set('9:1 时转子折算过来是小腿绕膝惯量的 **42%**：仿真里不加，起步角加速度会多算 42%，0.04 s 时小腿多转约两成。所以要加，但它是常数，CAD 里一读就有。', 'frozen');
      else verdict.set('减速比越大，转子惯量按 $N^2$ 涨，很快比腿本身还重；它算错一点、摩擦和齿槽力矩放大一点，仿真就偏得多——这是论文选小减速比行星减速的一个理由（ICRA 版）。', 'bad');
    });
    render();
  }

  // ─── 演示 2：一个关节在仿真里长什么样 ───────────────────────────────────────────
  function buildActuatorDemo(host) {
    var root = card(host, {
      title: '一个关节在仿真里长什么样：力矩—速度包络、摩擦与表 2',
      sub: '选一个关节，拖关节角速度：看开源代码里电机还能出多大力矩（Isaac Lab 的 DCMotor 包络）、辨识出的摩擦吃掉多少，以及表 2 的峰值 / 持续力矩在哪。'
    });
    var state = { j: 2, qd: 4 };
    var row = controlsRow(root);
    var pick = buttonGroup(row, {
      label: '关节',
      items: CODE_JOINTS.map(function (j, i) { return { label: j.label, value: i }; }),
      value: 2,
      onPick: function (v) { state.j = v; state.qd = Math.min(state.qd, CODE_JOINTS[v].vlim); sl.set(state.qd, true); render(); }
    });
    var row2 = controlsRow(root);
    var sl = slider(row2, { label: '关节角速度 $\\dot q$', min: 0, max: 42, step: 0.5, value: 4, format: function (v) { return fmt(v, 1) + ' rad/s'; }, onInput: function (v) { state.qd = Math.min(v, CODE_JOINTS[state.j].vlim); render(); } });
    var st = stage(root, 270);
    var setLegend = legend(root, [{ key: 'accent', text: '━ 代码里的力矩上限' }, { key: 'bad', text: '━ 摩擦 $\\tau_f$（×10 画）' }, { key: 'warn', text: '┄ 表 2 峰值 / 持续力矩' }, { key: 'muted', text: '┆ 表 2 的 48 V 最高转速' }]);
    var stats = statsRow(root);
    var sAct = stats.add('执行器'), sEnv = stats.add('此速度下的力矩上限'), sFr = stats.add('摩擦'), sArm = stats.add('折算转子惯量'), sPd = stats.add('PD 增益 $K_p$ / $K_d$');
    var verdict = verdictBox(root);
    note(root, [
      '力矩上限是 Isaac Lab `DCMotor` 的写法：$\\min\\big(\\tau_{\\text{sat}}(1-\\dot q/\\dot q_{\\max}),\\ \\tau_{\\max}\\big)$，三个数取自开源代码 `berkeley_humanoid.py`。代码的 $\\tau_{\\max}$（20 / 30 / 30 / 20 / 5 N·m）比表 2 的峰值低得多，README 说是出于安全；$\\dot q_{\\max}$ 也只有表 2「48 V 最高转速」的一半到七成，代码没写原因。',
      '摩擦是代码 `actuator_pd.py` 的模型 $\\tau_f = F_s\\tanh(\\dot q/v_a) + F_d\\dot q$，每个关节一组 $F_s$、$F_d$（README：电机齿槽力矩大，一并算进摩擦）。论文只说「用简单实验单独测每个执行器的摩擦」，没给测法。'
    ]);
    var render = registerRenderer(function () {
      var j = CODE_JOINTS[state.j], a = act(j.act);
      if (state.qd > j.vlim) state.qd = j.vlim;
      var g = begin(st), P = g.P;
      setLegend(P);
      var xMax = Math.ceil(a.vmax / 10) * 10, yMax = Math.ceil(a.peak / 10) * 10;
      var p = plot(g, { l: 46, r: 16, t: 24, b: 32 }, [0, xMax], [0, yMax]);
      axes(g, p, { xTicks: K.niceTicks(0, xMax, 6), yTicks: K.niceTicks(0, yMax, 5), xLabel: '关节角速度 rad/s', yLabel: '力矩 N·m' });
      line(g.ctx, [[p.x0, p.sy(a.peak)], [p.x1, p.sy(a.peak)]], P.warn, 1.2, [6, 4]);
      line(g.ctx, [[p.x0, p.sy(a.cont)], [p.x1, p.sy(a.cont)]], P.warn, 1, [2, 4]);
      text(g.ctx, '峰值 ' + a.peak, p.x1 - 4, p.sy(a.peak) - 8, P.warn, 'right', '11px sans-serif');
      text(g.ctx, '持续 ' + a.cont, p.x1 - 4, p.sy(a.cont) - 8, P.warn, 'right', '11px sans-serif');
      line(g.ctx, [[p.sx(a.vmax), p.y0], [p.sx(a.vmax), p.y1]], P.muted, 1, [2, 3]);
      var env = [], fr = [];
      for (var i = 0; i <= 200; i++) {
        var q = (j.vlim * i) / 200;
        env.push([p.sx(q), p.sy(torqueEnvelope(j, q))]);
      }
      env.push([p.sx(j.vlim), p.y0]);
      for (var k = 0; k <= 200; k++) {
        var q2 = (xMax * k) / 200;
        fr.push([p.sx(q2), p.sy(Math.min(yMax, 10 * frictionTorque(j, q2)))]);
      }
      line(g.ctx, env, P.accent, 2.4);
      line(g.ctx, fr, P.bad, 2);
      var e = torqueEnvelope(j, state.qd), f = frictionTorque(j, state.qd);
      line(g.ctx, [[p.sx(state.qd), p.y0], [p.sx(state.qd), p.y1]], P.muted, 1, [3, 3]);
      dot(g.ctx, p.sx(state.qd), p.sy(e), 4.5, P.accent);
      dot(g.ctx, p.sx(state.qd), p.sy(Math.min(yMax, 10 * f)), 4.5, P.bad);
      st.canvas.setAttribute('aria-label', j.label + ' 的力矩—速度包络与摩擦曲线');
      sAct.set(a.name + '（' + a.g + ' g，9:1）');
      sEnv.set(fmt(e, 1) + ' N·m', e < j.effort - 1e-9 ? 'bad' : null);
      sFr.set(fmt(f, 3) + ' N·m（上限的 ' + fmt((100 * f) / j.effort, 1) + '%）');
      sArm.set('$' + sci(armature(a), 2) + '$ kg·m²');
      sPd.set(j.kp + ' / ' + j.kd);
      if (state.qd >= j.vlim - 1e-9) verdict.set('到了代码的速度上限 ' + j.vlim + ' rad/s：电机不再出力。表 2 写的 48 V 最高转速是 ' + a.vmax + ' rad/s。', 'bad');
      else if (e < j.effort - 1e-9) verdict.set('快到速度上限时，力矩上限沿着直线往下掉：转得越快，电机能出的力矩越小。', 'learning');
      else verdict.set('代码里的包络几乎是个方框：直到 ' + fmt(j.vlim * (1 - j.effort / j.sat), 1) + ' rad/s 都能出满 ' + j.effort + ' N·m（表 2 的峰值是 ' + a.peak + '）。摩擦是另一回事：慢速时就有 $F_s$ 那么大，要单独辨识。', 'frozen');
    });
    pick.pick(2, true);
    sl.refresh();
    render();
  }

  // ─── 演示 3：窄随机化与宽随机化 ───────────────────────────────────────────────
  function buildDrDemo(host) {
    var root = card(host, {
      title: '窄随机化还是宽随机化：同一个膝关节阶跃抽 40 组参数',
      sub: '绿带：按表 6 只随机化辨识得到的量（连杆质量、关节摩擦、转子惯量）；黄带：再加「电机强度」与 PD 增益、质量放宽到 ±50%。粗线是「真机」：拖它的摩擦，看辨识不准时哪条带还套得住。'
    });
    var state = { fric: 1.0, seed: DR_SEED };
    var row = controlsRow(root);
    slider(row, { label: '真机摩擦 / 辨识值', min: 0.5, max: 2, step: 0.05, value: 1, format: function (v) { return '×' + fmt(v, 2); }, onInput: function (v) { state.fric = v; render(); } });
    var row2 = controlsRow(root);
    K.button(row2, '换一批随机参数', function () { state.seed += 1; recompute(); });
    var st = stage(root, 270);
    var setLegend = legend(root, [{ key: 'good', text: '▮ 表 6 的窄随机化' }, { key: 'warn', text: '▮ 再加电机强度、PD 增益、±50% 质量' }, { key: 'accent', text: '━ 真机（玩具）' }]);
    var stats = statsRow(root);
    var sW1 = stats.add('窄带最宽处'), sW2 = stats.add('宽带最宽处'), sR = stats.add('宽 / 窄'), sIn = stats.add('真机落在窄带 / 宽带里');
    var verdict = verdictBox(root);
    note(root, [
      '**这是简化模型，数值不能和论文直接比**：只有一个膝关节（URDF 的小腿，代码的 PD 与摩擦），不是整机、也没有训练策略。宽的那组取自本仓库《真实世界人形行走》v1 表 I 里能套到单个关节上的几项（电机强度 ×0.85–1.15、$K_p$ / $K_d$ ×0.9–1.1、质量 ×0.5–1.5），只用来比宽窄，不是那篇论文的结论。关节零位两篇都随机化，它只平移终点，这里两组都不加。',
      '默认种子下宽带是窄带的约 7 倍；换 4 个种子是 4.9–9.0 倍，结论不变。真机摩擦偏到 ×1.2 时窄带只套住约四分之一的时刻，宽带仍全套住——窄随机化的前提是**辨识得准**，这正是论文说「自研才拿得到这么细的参数」的意思。'
    ]);
    var data = { narrow: DR_NARROW, wide: DR_WIDE };
    function recompute() {
      data = { narrow: drBatch('narrow', DR_N, state.seed), wide: drBatch('wide', DR_N, state.seed) };
      render();
    }
    var render = registerRenderer(function () {
      var real = toyRun({ fric: state.fric });
      var g = begin(st), P = g.P;
      setLegend(P);
      var p = plot(g, { l: 46, r: 14, t: 22, b: 32 }, [0, TOY.T], [0, 0.55]);
      axes(g, p, { xTicks: [0, 0.1, 0.2, 0.3, 0.4], yTicks: [0, 0.1, 0.2, 0.3, 0.4, 0.5], xLabel: '时间 s', yLabel: '膝角 rad' });
      function band(b, color, alpha) {
        var ctx = g.ctx;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        b.hi.forEach(function (v, i) { var x = p.sx(i * TOY.every), y = p.sy(v); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        for (var i = b.lo.length - 1; i >= 0; i--) ctx.lineTo(p.sx(i * TOY.every), p.sy(b.lo[i]));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      band(data.wide, P.warn, 0.32);
      band(data.narrow, P.good, 0.55);
      line(g.ctx, real.map(function (v, i) { return [p.sx(i * TOY.every), p.sy(v)]; }), P.accent, 2.4);
      st.canvas.setAttribute('aria-label', '窄随机化与宽随机化的膝关节阶跃响应包络，以及真机曲线');
      var r = data.wide.width / data.narrow.width;
      var inN = insideShare(data.narrow, real), inW = insideShare(data.wide, real);
      sW1.set(fmt(data.narrow.width, 4) + ' rad', 'good');
      sW2.set(fmt(data.wide.width, 4) + ' rad', 'warn');
      sR.set(fmt(r, 1) + ' 倍');
      sIn.set(fmt(inN * 100, 0) + '% / ' + fmt(inW * 100, 0) + '%', inN < 0.9 ? 'bad' : 'good');
      if (Math.abs(state.fric - 1) < 1e-9) verdict.set('辨识准时，真机就在窄带中间：训练只需要覆盖这么窄的一条，策略不必为根本不会发生的「电机忽强忽弱」付出保守的代价。', 'frozen');
      else if (inN < 0.9) verdict.set('摩擦辨识偏了 ' + fmt(Math.abs(state.fric - 1) * 100, 0) + '%，真机就跑出了窄带：窄随机化省下的训练难度，是拿准确辨识换来的。', 'bad');
      else verdict.set('偏得不多，窄带还套得住。', 'learning');
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
  /* 全片统一：仿真蓝、真机橙（同图 8 的黄色）、这篇的做法绿、问题红、命令 / 示意灰 */
  var C_SIM = C_ACCENT, C_REAL = C_WARN;

  /* 视频里一幕要讲五十秒左右，画面不能停：draw(t, clock) 的 clock 是这一幕的真实时间
     （旁白比分镜长时 t 停在一段的末尾，clock 照走），走路、转子、摆锤这类循环动作按 clock 画；网页播放器只传 t。
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
  /* 一条红色删除线，盖在 chip 上 */
  function strike(parent, x, y, w, h) {
    return hline(parent, x + 6, y + h - 6, x + w - 6, y + 6, C_BAD, 2.2);
  }
  /* 科学计数法写成 LaTeX：6.1e-6 → 6.1\times10^{-6} */
  function sci(x, d) {
    var dd = d == null ? 2 : d, p = Math.pow(10, dd);
    var e = Math.floor(Math.log10(Math.abs(x)));
    var m = Math.round((x / Math.pow(10, e)) * p * (1 + 1e-12)) / p; // 浮点误差：0.01215 存成 1.2149999…×10⁻²
    if (m >= 10) { m /= 10; e += 1; }
    return fmt(m, dd) + '\\times10^{' + e + '}';
  }
  /* 从分镜时刻 at 起按真实时间算过了几秒（还没到 at 时为负）。网页播放器（clock 为空）和 stage.html 的 fitStory（draw(t, t)）里
     就是 t − at；视频里分镜时间会在段尾停住、真实时间照走，所以在这一段还在走（t < at + run）的帧里锁住起点，之前的帧不清空——
     render.mjs 先按各段 t0 + 0.5 预热，之后 stills、片段或分段并行从哪一帧开始渲都对得上。box 是每个用处自己的 { v: null } */
  function sinceCue(box, t, clock, now, at, run) {
    if (clock == null || clock === t) return t - at;
    if (t >= at && (t < at + run - 0.01 || box.v == null)) box.v = now - (t - at);
    return t < at || box.v == null ? -1 : now - box.v;
  }
  function rot(v, th) {
    return [v[0] * Math.cos(th) - v[1] * Math.sin(th), v[0] * Math.sin(th) + v[1] * Math.cos(th)];
  }
  /* Berkeley Humanoid 的渲染图（Robot_Description_Gallery 按 HybridRobotics 的开源 URDF 渲染，透明底），高 h 时宽 0.377h；
     机身是浅灰，背后垫一层浅灰光晕（同 LCP 第 10 幕），深色主题下也看得清 */
  var BH_IMG = { file: 'berkeley_humanoid.webp', aspect: 113 / 300 };
  var haloSeq = 0;
  function robotImg(parent, x, yBottom, h) {
    var w = h * BH_IMG.aspect, g = group(parent);
    var root = parent.ownerSVGElement || parent, defs = root.querySelector('defs');
    if (!defs) { defs = svgEl('defs', {}); root.insertBefore(defs, root.firstChild); }
    var id = 'bh-x-halo-' + (++haloSeq), halo = svgEl('radialGradient', { id: id });
    halo.appendChild(svgEl('stop', { offset: '0', 'stop-color': '#a3acb9', 'stop-opacity': '0.45' }));
    halo.appendChild(svgEl('stop', { offset: '1', 'stop-color': '#a3acb9', 'stop-opacity': '0' }));
    defs.appendChild(halo);
    g.appendChild(svgEl('ellipse', { cx: (x + w / 2).toFixed(1), cy: (yBottom - h * 0.5).toFixed(1), rx: (w * 0.8).toFixed(1), ry: (h * 0.58).toFixed(1), fill: 'url(#' + id + ')' }));
    g.appendChild(svgEl('image', { href: ROBOT_IMG_BASE + BH_IMG.file, x: x.toFixed(1), y: (yBottom - h).toFixed(1), width: w.toFixed(1), height: h.toFixed(1), preserveAspectRatio: 'xMidYMax meet' }));
    return { g: g, w: w, h: h };
  }

  /* 侧视的 Berkeley Humanoid 示意（面朝 +x）：方盒躯干（顶上有提手），两条腿按真实尺寸画——大腿 0.22 m、小腿 0.18 m、
     踝高 0.06 m、脚长 0.16 m（图 2b），膝盖朝前；远侧那条腿淡一些。M 是 1 m 对应的像素数。
     put(hx, hy, lean, feet)：髋在 (hx, hy)，躯干前倾 lean（rad，往前为正），feet = [[x, y], [x, y]]（先近侧后远侧）是脚底在踝正下方的点。
     opts.footPitch：脚掌的俯仰（rad，脚尖朝下为正），坡上让脚掌贴着坡面；默认 0（平地）。
     返回近侧腿的髋、膝、踝坐标，第 7 幕用来标关节。 */
  var LEG = { thigh: ROBOT.thigh, calf: ROBOT.calf, ankleH: ROBOT.ankleH, heel: 0.05, toe: 0.11, hipH: 0.43, torsoH: 0.32, torsoW: 0.2 };
  function bhBody(parent, color, M, opts) {
    var o = opts || {};
    var g = group(parent);
    var L1 = LEG.thigh * M, L2 = LEG.calf * M, AH = LEG.ankleH * M;
    var w = clamp(M / 40, 2.2, 6);
    function bone(lg, k) {
      var ln = paint(svgEl('line', { 'stroke-width': (w * k).toFixed(2), 'stroke-linecap': 'round' }), null, color);
      if (o.dashed) ln.setAttribute('stroke-dasharray', '4 3');
      lg.appendChild(ln);
      return ln;
    }
    function leg(far) {
      var lg = group(g);
      if (far) lg.style.opacity = 0.42;
      var L = { thigh: bone(lg, 1.6), calf: bone(lg, 1.3) };
      L.foot = paint(svgEl('path', { 'stroke-width': 1.2, 'stroke-linejoin': 'round' }), o.dashed ? 'none' : color, color);
      lg.appendChild(L.foot);
      L.kneeDot = paint(svgEl('circle', { r: (w * 1.25).toFixed(1), 'stroke-width': 1.3 }), C_SURFACE, color);
      lg.appendChild(L.kneeDot);
      return L;
    }
    var farLeg = leg(true);
    var torso = svgEl('g', {});
    g.appendChild(torso);
    var TW = LEG.torsoW * M, TH = LEG.torsoH * M;
    var box = paint(svgEl('rect', { x: (-TW / 2).toFixed(1), y: (-TH).toFixed(1), width: TW.toFixed(1), height: (TH + 0.02 * M).toFixed(1), rx: (0.025 * M).toFixed(1), 'stroke-width': 1.8 }), C_SURFACE, color);
    if (o.dashed) box.setAttribute('stroke-dasharray', '4 3');
    torso.appendChild(box);
    var handle = paint(svgEl('path', { d: 'M ' + (-0.05 * M).toFixed(1) + ' ' + (-TH).toFixed(1) + ' L ' + (-0.04 * M).toFixed(1) + ' ' + (-TH - 0.045 * M).toFixed(1) + ' L ' + (0.04 * M).toFixed(1) + ' ' + (-TH - 0.045 * M).toFixed(1) + ' L ' + (0.05 * M).toFixed(1) + ' ' + (-TH).toFixed(1), fill: 'none', 'stroke-width': 1.6 }), null, color);
    torso.appendChild(handle);
    /* 躯干里的 IMU（小方块），第 5、6 幕会点亮它 */
    var imu = paint(svgEl('rect', { x: (-0.02 * M).toFixed(1), y: (-0.13 * M).toFixed(1), width: (0.04 * M).toFixed(1), height: (0.03 * M).toFixed(1), rx: 1.5 }), color);
    imu.style.opacity = 0.7;
    torso.appendChild(imu);
    var nearLeg = leg(false);
    var hipDot = paint(svgEl('circle', { r: (w * 1.6).toFixed(1), 'stroke-width': 1.4 }), C_SURFACE, color);
    g.appendChild(hipDot);
    function pose(L, H, f) {
      var A = [f[0], f[1] - AH];
      var dx = A[0] - H[0], dy = A[1] - H[1];
      var d = clamp(Math.hypot(dx, dy), 0.12 * M, L1 + L2 - 0.002 * M);
      var base = Math.atan2(dy, dx);
      var bend = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      var a = base - bend; // 膝盖朝前（+x）
      var Kn = [H[0] + L1 * Math.cos(a), H[1] + L1 * Math.sin(a)];
      var Ar = [H[0] + d * Math.cos(base), H[1] + d * Math.sin(base)];
      setLine(L.thigh, H[0], H[1], Kn[0], Kn[1]);
      setLine(L.calf, Kn[0], Kn[1], Ar[0], Ar[1]);
      var sole = [Ar[0], Ar[1] + AH], fp = o.footPitch || 0, fc = Math.cos(fp), fs = Math.sin(fp);
      L.foot.setAttribute('d', 'M ' + Ar[0].toFixed(1) + ' ' + Ar[1].toFixed(1) +
        ' L ' + (sole[0] - LEG.heel * M * fc).toFixed(1) + ' ' + (sole[1] - LEG.heel * M * fs).toFixed(1) +
        ' L ' + (sole[0] + LEG.toe * M * fc).toFixed(1) + ' ' + (sole[1] + LEG.toe * M * fs).toFixed(1) + ' Z');
      moveDot(L.kneeDot, Kn);
      return { hip: H, knee: Kn, ankle: Ar };
    }
    return {
      g: g, box: box, imu: imu, M: M,
      put: function (hx, hy, lean, feet) {
        torso.setAttribute('transform', 'translate(' + hx.toFixed(1) + ' ' + hy.toFixed(1) + ') rotate(' + (((lean || 0) * 180) / Math.PI).toFixed(2) + ')');
        moveDot(hipDot, [hx, hy]);
        pose(farLeg, [hx - 0.01 * M, hy], feet[1]);
        return pose(nearLeg, [hx, hy], feet[0]);
      }
    };
  }
  /* 原地踏步（跑步机式）：髋不动，支撑脚往后滑、摆动脚抬起往前；S 是半步长（像素），lift 是抬脚高 */
  function treadmill(now, hx, gy, S, period, lift) {
    var feet = [];
    for (var k = 0; k < 2; k++) {
      var u = (((now / period + 0.5 * k) % 1) + 1) % 1;
      if (u < 0.5) feet.push([hx + S * (1 - 4 * u), gy]);
      else {
        var v = (u - 0.5) / 0.5;
        feet.push([hx - S + 2 * S * ease(v), gy - lift * Math.sin(Math.PI * v)]);
      }
    }
    return feet;
  }
  /* 往前（dir = 1）或往后（dir = −1）真的走：支撑脚在世界里不动；groundY(x) 给地面高度（斜坡也行） */
  function worldGait(now, x0, dir, L, period, lift, groundY) {
    var ph = now / period, k = Math.floor(ph), u = ph - k;
    var bodyX = x0 + (dir * ph * L) / 2;
    var stanceX = x0 + (dir * k * L) / 2 + (dir * L) / 4;
    var from = stanceX - (dir * L) / 2, to = stanceX + (dir * L) / 2;
    var sx = from + (to - from) * ease(u);
    var sw = [sx, groundY(sx) - lift * Math.sin(Math.PI * u)];
    var stc = [stanceX, groundY(stanceX)];
    return { x: bodyX, feet: k % 2 ? [sw, stc] : [stc, sw] };
  }
  function flat(y) { return function () { return y; }; }

  /* ── scene 1: 仿真里学会，真机上走不好 ── */
  function buildSceneGap() {
    var s = sceneSvg('左边是仿真里稳稳原地踏步的机器人，右边是同一个策略在真机上左摇右晃；中间的箭头是差距，来自建模误差、指令执行、传感器噪声三处。下面左边是常见补法：大范围域随机化、观测历史、教师—学生；右边是这篇的做法：从硬件上把差距做小');
    s.appendChild(svgText(30, 28, '同一个策略：仿真里走得稳，到了真机上就晃', 'demo-x-ink2', 13.5));
    var GY = 218, M = 170;
    var simP = group(s);
    rectBox(simP, 30, 44, 250, 190, C_SIM, C_SURFACE);
    simP.appendChild(paint(svgText(44, 64, '仿真：GPU 上几千个并行环境', null, 11.5), C_SIM));
    hline(simP, 44, GY, 266, GY, C_BORDER, 1.4);
    var simBot = bhBody(simP, C_SIM, M);
    var simTicks = group(simP);
    var realP = group(s);
    rectBox(realP, 520, 44, 250, 190, C_REAL, C_SURFACE);
    realP.appendChild(paint(svgText(534, 64, '真机：零样本搬过去', null, 11.5), C_REAL));
    hline(realP, 534, GY, 756, GY, C_BORDER, 1.4);
    var realBot = bhBody(realP, C_REAL, M);
    var realTicks = group(realP);
    function ticks(gp, x0, x1, now) {
      gp.textContent = '';
      var off = (now * ((4 * 16) / 1.1)) % 24; // 和下面 treadmill 支撑脚的速度 4S/period 一样，脚不在地上打滑
      for (var x = x0 + 24 - off; x < x1; x += 24) hline(gp, x, GY + 2, x - 6, GY + 8, C_BORDER, 1.2);
    }
    /* 中间：差距从哪来 */
    var gapG = group(s);
    var gapArrow = pathLine(gapG, [], C_BAD, 3);
    var gapL = paint(svgText(400, 86, '差距', null, 13, 'middle'), C_BAD);
    gapG.appendChild(gapL);
    var srcs = ['① 建模误差：弹簧、闭链、传动', '② 指令执行：频率、精度、延迟', '③ 传感器噪声'].map(function (str, k) {
      return chip(s, 296, 112 + k * 38, 208, str, C_BAD, { size: 10.5 });
    });
    /* 下左：常见补法 */
    var fix = group(s);
    rectBox(fix, 30, 250, 360, 154, C_BORDER, C_SURFACE2);
    fix.appendChild(svgText(44, 272, '常见补法：在算法这边补', 'demo-x-ink2', 12));
    var fixChips = ['大范围域随机化：「电机强度」、PD 增益', '观测历史：边走边在线辨识', '教师—学生：先用特权信息再蒸馏'].map(function (str, k) {
      return chip(fix, 44, 284 + k * 34, 332, str, C_MUTED, { size: 10.5 });
    });
    var fixWarn = paint(svgText(44, 396, '随机化太宽：训练变慢、策略变保守（Chebotar 等 2019）', null, 10.5), C_BAD);
    fix.appendChild(fixWarn);
    /* 下右：这篇 */
    var ours = group(s);
    rectBox(ours, 410, 250, 360, 154, C_GOOD, C_SURFACE);
    ours.appendChild(paint(svgText(424, 272, '这篇：从硬件上把差距做小', null, 12), C_GOOD));
    var oursChips = ['仿真友好', '可靠、便宜', '好做实验', '拟人'].map(function (str, k) {
      return chip(ours, 424 + (k % 2) * 170, 284 + Math.floor(k / 2) * 34, 162, str, C_GOOD, { size: 11 });
    });
    var proof = group(ours);
    proof.appendChild(svgRich(424, 368, '验证：只用最简的 **MLP + PPO**', { size: 11, w: 340, cls: 'demo-x-ink2' }));
    proof.appendChild(svgText(424, 390, '没有观测历史、没有相位、没有参考动作', 'demo-x-mut', 10.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(simP, seg(t, 0.2, 0.8));
      setOpacity(realP, seg(t, 0.4, 1.0));
      ticks(simTicks, 46, 264, now);
      ticks(realTicks, 536, 754, now);
      simBot.put(155, GY - LEG.hipH * M, 0.03, treadmill(now, 155, GY, 16, 1.1, 9));
      /* 真机：同样的步态，躯干和脚一起晃；第 4 段起差距缩小，晃动跟着变小 */
      var amp = 0.16 - 0.13 * seg(t, 10.4, 11.4);
      var sway = amp * Math.sin(now * 3.1) + 0.4 * amp * Math.sin(now * 7.3);
      var slip = 14 * amp * Math.sin(now * 2.3);
      var rf = treadmill(now + 0.13, 645 + slip, GY, 16, 1.1, 9 + 30 * amp);
      realBot.put(645 + slip, GY - LEG.hipH * M + 6 * amp * Math.abs(Math.sin(now * 3.1)), sway, rf);
      setOpacity(gapG, seg(t, 0.8, 1.4));
      var half = 112 - 70 * seg(t, 10.4, 11.4);
      setPath(gapArrow, [[400 - half, 96], [400 + half, 96]]);
      gapArrow.setAttribute('stroke-width', (3 + Math.sin(now * 4)).toFixed(2));
      srcs.forEach(function (c, k) { setOpacity(c, seg(t, 3.7 + k * 0.9, 4.2 + k * 0.9)); });
      setOpacity(fix, seg(t, 7.0, 7.5));
      fixChips.forEach(function (c, k) { setOpacity(c, seg(t, 7.3 + k * 0.7, 7.8 + k * 0.7)); });
      setOpacity(fixWarn, seg(t, 9.4, 10.0));
      setOpacity(ours, seg(t, 10.4, 10.9));
      oursChips.forEach(function (c, k) { setOpacity(c, seg(t, 10.8 + k * 0.5, 11.2 + k * 0.5)); });
      setOpacity(proof, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 孩子大小的人形：16 kg、0.85 m ── */
  function buildSceneSize() {
    var s = sceneSvg('左边是 Berkeley Humanoid 的渲染图，标着站立高约 0.85 m、16 kg、每条腿 6 个自由度。右上是表 1 里几台机器人的重量条和价格；右下是两个单摆：腿长 1 米和 0.4 米，短的摆得更快');
    s.appendChild(svgText(30, 28, '一台 5 岁孩子大小的人形：16 kg、站立约 0.85 m', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 250, 360, C_BORDER, C_SURFACE2);
    var img = robotImg(left, 112, 344, 280);
    var dim = group(left);
    hline(dim, 80, 64, 80, 344, C_ACCENT, 1.4);
    hline(dim, 72, 64, 88, 64, C_ACCENT, 1.4);
    hline(dim, 72, 344, 88, 344, C_ACCENT, 1.4);
    var dimT = paint(svgText(0, 0, '站立约 0.85 m', null, 11, 'middle'), C_ACCENT);
    dimT.setAttribute('transform', 'translate(66 204) rotate(-90)');
    dim.appendChild(dimT);
    var spec = group(left);
    spec.appendChild(svgText(44, 368, '16 kg 全电驱 · 每条腿 6 个自由度', 'demo-x-ink2', 11));
    spec.appendChild(svgText(44, 388, '大腿 0.22 m · 小腿 0.18 m（第 3.1 节）', 'demo-x-mut', 10.5));
    /* 右上：表 1 的重量与价格 */
    var tab = group(s);
    rectBox(tab, 296, 44, 474, 222, C_BORDER, C_SURFACE2);
    tab.appendChild(svgText(310, 62, '表 1 节选：重量（kg）与价格（美元）', 'demo-x-ink2', 11.5));
    var X0 = 420, SCALE = 210 / 132;
    var rows = TABLE1.map(function (r, i) {
      var y = 74 + i * 15.5, g = group(tab);
      var ours = r[0] === 'Berkeley Humanoid';
      var color = ours ? C_ACCENT : r[1] === 'F' ? C_MUTED : r[1] === 'M' ? C_GOOD : C_WARN;
      var name = svgText(X0 - 8, y + 9, ours ? '这台' : r[0], ours ? 'demo-x-acc' : 'demo-x-ink2', 10, 'end');
      g.appendChild(name);
      var b = hbar(g, X0, y + 1, 10, color, ours ? 1 : 0.75);
      var val = svgText(X0 + r[2] * SCALE + 5, y + 9, String(r[2]), 'demo-x-mut', 9.5);
      g.appendChild(val);
      var price = svgText(758, y + 9, r[3] == null ? '—' : '$' + r[3] + 'K', ours ? 'demo-x-acc' : 'demo-x-mut', 10, 'end');
      g.appendChild(price);
      return { g: g, b: b, val: val, price: price, w: r[2] * SCALE, F: r[1] === 'F', ours: ours };
    });
    var key = group(tab);
    key.appendChild(svgText(310, 254, '灰：全尺寸　绿：中等　橙：小型（表 1 的 F / M / S）', 'demo-x-mut', 9.5));
    var one = group(tab);
    one.appendChild(paint(svgText(758, 254, '1 个人就能搬，摔了不伤环境', null, 10.5, 'end'), C_GOOD));
    /* 右下：短腿摆得快 */
    var pen = group(s);
    rectBox(pen, 296, 278, 474, 126, C_BORDER, C_SURFACE2);
    pen.appendChild(svgText(310, 296, '小个子更难控：腿短，步子小，脚要换得更快', 'demo-x-ink2', 11));
    pen.appendChild(svgRich(310, 330, '单摆示意：$T \\propto \\sqrt{L/g}$', { size: 11, w: 240, cls: 'demo-x-ink2' }));
    pen.appendChild(svgText(310, 354, '0.4 m 的比 1.0 m 的快 1.58 倍', 'demo-x-ink2', 10.5));
    pen.appendChild(svgText(310, 374, '（我们算的，不是论文的数）', 'demo-x-mut', 10));
    var PIV = [[600, 304], [704, 304]], LEN = [80, 32];
    var rods = LEN.map(function (L, k) { return hline(pen, PIV[k][0], PIV[k][1], PIV[k][0], PIV[k][1] + L, k ? C_ACCENT : C_MUTED, 2); });
    var bobs = LEN.map(function (L, k) { return dotAt(pen, PIV[k][0], PIV[k][1] + L, 6, k ? C_ACCENT : C_MUTED); });
    PIV.forEach(function (p) { hline(pen, p[0] - 12, p[1], p[0] + 12, p[1], C_INK2, 2); });
    var penLab = [paint(svgText(578, 312, '腿约 1.0 m', null, 10, 'end'), C_MUTED), paint(svgText(722, 312, '约 0.4 m', null, 10), C_ACCENT)];
    penLab.forEach(function (n) { pen.appendChild(n); });
    var cnt = paint(svgText(310, 394, '', null, 10), C_ACCENT);
    pen.appendChild(cnt);
    var PER = [2 * Math.PI * Math.sqrt(1.0 / G), 2 * Math.PI * Math.sqrt(0.4 / G)];
    /* 两个摆在第 4 段开头一起从 0.42 rad 松手，按真实时间摆（松手时刻见 sinceCue） */
    var pen0 = { v: null };

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.8));
      setOpacity(dim, seg(t, 0.8, 1.4));
      setOpacity(spec, seg(t, 1.4, 2.0));
      img.g.setAttribute('transform', 'translate(0 ' + (1.5 * Math.sin(now * 2)).toFixed(1) + ')');
      setOpacity(tab, seg(t, 3.6, 4.0));
      rows.forEach(function (r, i) {
        var u = r.F ? seg(t, 3.8 + i * 0.25, 4.6 + i * 0.25) : seg(t, 7.0 + (i - 5) * 0.2, 7.6 + (i - 5) * 0.2);
        setW(r.b, r.w * ease(u));
        setOpacity(r.val, u);
        setOpacity(r.g, r.F ? 1 : seg(t, 7.0, 7.2));
        setOpacity(r.price, seg(t, 13.4 + i * 0.12, 13.8 + i * 0.12));
        if (r.ours) r.b.setAttribute('opacity', (0.75 + 0.25 * Math.abs(Math.sin(now * 3))).toFixed(2));
      });
      setOpacity(key, seg(t, 4.4, 5.0));
      setOpacity(one, seg(t, 8.6, 9.2));
      setOpacity(pen, seg(t, 10.4, 11.0));
      var tt = Math.max(0, sinceCue(pen0, t, clock, now, 10.4, 3.0)), swings = [];
      LEN.forEach(function (L, k) {
        var a = 0.42 * Math.cos((2 * Math.PI * tt) / PER[k]);
        var b = [PIV[k][0] + L * Math.sin(a), PIV[k][1] + L * Math.cos(a)];
        setLine(rods[k], PIV[k][0], PIV[k][1], b[0], b[1]);
        moveDot(bobs[k], b);
        swings.push(Math.floor((2 * tt) / PER[k]));
      });
      cnt.textContent = t >= 10.4 ? '一起松手：长的摆了 ' + swings[0] + ' 下，短的 ' + swings[1] + ' 下' : '';
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 执行器直接当关节 ── */
  function buildSceneSimFriendly() {
    var s = sceneSvg('左边是难仿真的传动：带弹簧的腿和连杆闭链。中间是这台的做法：执行器带交叉滚子轴承直接装在关节上，转子转 9 圈关节转 1 圈。右边是转子惯量折算到关节乘减速比的平方，膝关节折算后是小腿绕膝惯量的 42%。下面是单关节玩具：仿真里漏掉转子惯量，小腿起步更快');
    s.appendChild(svgText(30, 28, '仿真友好：去掉弹簧和闭链，执行器直接当关节', 'demo-x-ink2', 13.5));
    /* 左：难仿真的传动 */
    var hard = group(s);
    rectBox(hard, 30, 44, 270, 206, C_BAD, C_SURFACE2, '4 3');
    hard.appendChild(paint(svgText(44, 64, '难仿真：弹簧、连杆闭链、复杂传动', null, 11.5), C_BAD));
    /* 一条示意腿：大腿不动，小腿绕膝弯曲（「落地」时弯）。弹簧跨在膝后，上端用支架固定在大腿上、下端固定在小腿上，
       膝一弯两端就靠近、弹簧被压短；虚线是膝前的连杆闭链（大腿—两根杆—小腿），中间铰点按两根杆长不变来解 */
    var HP = [92, 92], KN = [100, 160], SH = [-16, 66];
    var thigh = hline(hard, HP[0], HP[1], KN[0], KN[1], C_INK2, 5);
    var shank = hline(hard, KN[0], KN[1], KN[0] + SH[0], KN[1] + SH[1], C_INK2, 4);
    dotAt(hard, HP[0], HP[1], 6, C_INK2);
    var SA = [84, 143], LP1 = [108, 100];
    hline(hard, 98, 143, SA[0], SA[1], C_INK2, 2);
    hline(hard, 93, 100, LP1[0], LP1[1], C_INK2, 2);
    var shBr = hline(hard, 0, 0, 0, 0, C_INK2, 2), lkBr = hline(hard, 0, 0, 0, 0, C_INK2, 2);
    var spring = pathLine(hard, [], C_WARN, 2);
    var link = pathLine(hard, [], C_BAD, 2, '5 3');
    var LKA = 38.5, LKB = 47.2;
    dotAt(hard, KN[0], KN[1], 5, C_INK2);
    void thigh;
    var hardLabs = ['弹簧：多一组动力学方程', '闭链：每一步都要解约束', '传动：难映射到关节空间', '延迟、电机：要更小的步长'].map(function (str, k) {
      var g = group(hard);
      g.appendChild(svgText(136, 100 + k * 36, str, 'demo-x-ink2', 10.5));
      return g;
    });
    /* 中：执行器就是关节 */
    var mid = group(s);
    rectBox(mid, 316, 44, 226, 206, C_GOOD, C_SURFACE);
    mid.appendChild(paint(svgText(330, 64, '这台：执行器装上就是关节', null, 11.5), C_GOOD));
    var CX = 429, CY = 146;
    var bearing = paint(svgEl('circle', { cx: CX, cy: CY, r: 56, fill: 'none', 'stroke-width': 3, 'stroke-dasharray': '3 4' }), null, C_GOOD);
    mid.appendChild(bearing);
    var stator = paint(svgEl('circle', { cx: CX, cy: CY, r: 46, 'stroke-width': 2 }), C_SURFACE2, C_INK2);
    mid.appendChild(stator);
    var rotorG = group(mid);
    for (var sp = 0; sp < 6; sp++) {
      var a = (sp * Math.PI) / 3;
      hline(rotorG, CX, CY, CX + 34 * Math.cos(a), CY + 34 * Math.sin(a), C_ACCENT, 2.4);
    }
    dotAt(rotorG, CX + 34, CY, 4.5, C_WARN);
    dotAt(mid, CX, CY, 9, C_SURFACE);
    var out = hline(mid, CX, CY, CX, CY + 66, C_GOOD, 7);
    out.setAttribute('stroke-linecap', 'round');
    mid.appendChild(svgText(CX, 236, '转子转 9 圈，关节转 1 圈', 'demo-x-ink2', 10.5, 'middle'));
    /* 右：转子惯量折算 */
    var arm = group(s);
    rectBox(arm, 558, 44, 212, 206, C_ACCENT, C_SURFACE);
    arm.appendChild(svgMath(664, 76, 'I_{\\text{arm}} = N^2 I_{\\text{rotor}}', { size: 15, anchor: 'middle', w: 200 }));
    arm.appendChild(svgText(664, 100, '9:1 → × 81，加进质量矩阵对角线', 'demo-x-mut', 9.5, 'middle'));
    var BY = 222, BS = 3000;
    var b1 = vbar(arm, 596, BY, 40, C_INK2, 0.7), b2 = vbar(arm, 690, BY, 40, C_ACCENT);
    var armLab = group(arm);
    armLab.appendChild(svgText(616, BY + 14, '小腿 + 脚', 'demo-x-mut', 9.5, 'middle'));
    armLab.appendChild(svgText(710, BY + 14, '膝转子折算', 'demo-x-mut', 9.5, 'middle'));
    armLab.appendChild(svgText(616, BY - SHANK.I * BS - 6, fmt(SHANK.I, 4), 'demo-x-ink2', 10, 'middle'));
    armLab.appendChild(paint(svgText(710, BY - KNEE_ARM * BS - 6, fmt(KNEE_ARM, 5) + '（' + fmt(ARM_SHARE * 100, 0) + '%）', null, 10, 'middle'), C_ACCENT));
    /* 下：漏了转子惯量会怎样（单关节玩具） */
    var toy = group(s);
    rectBox(toy, 30, 262, 360, 142, C_BORDER, C_SURFACE2);
    toy.appendChild(svgText(44, 280, '玩具：膝关节目标从 0 跳到 0.5 rad（URDF 小腿，代码的 PD）', 'demo-x-ink2', 10.5));
    toy.appendChild(svgText(44, 302, '起步角加速度（rad/s²）', 'demo-x-mut', 10));
    var AX0 = 120, AS = 0.85;
    var accRows = [['加了', startAccel(true), C_GOOD], ['忘了加', startAccel(false), C_BAD]].map(function (r, k) {
      var y = 312 + k * 26, g = group(toy);
      g.appendChild(svgText(AX0 - 8, y + 12, r[0], 'demo-x-ink2', 10.5, 'end'));
      var b = hbar(g, AX0, y, 16, r[2]);
      var v = svgText(AX0 + r[1] * AS + 6, y + 12, fmt(r[1], 0), 'demo-x-ink2', 10.5);
      g.appendChild(v);
      return { g: g, b: b, w: r[1] * AS };
    });
    var accNote = group(toy);
    accNote.appendChild(paint(svgText(44, 384, '漏了它，起步快 ' + fmt((startAccel(false) / startAccel(true) - 1) * 100, 0) + '%；0.04 s 时转到 ' + fmt(TOY_NOARM[TOY_AT], 3) + ' rad，', null, 10.5), C_BAD));
    accNote.appendChild(svgText(44, 399, '真机（加了）只到 ' + fmt(TOY_NOM[TOY_AT], 3) + ' rad——仿真里的小腿比真机轻快', 'demo-x-mut', 10));
    var tail = group(s);
    rectBox(tail, 406, 262, 364, 142, C_GOOD, C_SURFACE);
    ['唯一例外：踝 FFE 走连杆，但和 KFE 的', '映射是线性的，仍当关节处理', '行星减速 9:1 准直驱：摩擦小，好建模', '英伟达 A4500 上每秒超过 9 万步仿真'].forEach(function (str, k) {
      tail.appendChild(svgText(420, 286 + k * 30 - (k > 0 ? 8 : 0), str, k === 3 ? 'demo-x-acc' : 'demo-x-ink2', 11));
    });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(hard, seg(t, 0.3, 0.9));
      /* 膝随着「落地」弯曲（按真实时间循环）：小腿、弹簧下端、连杆下端都跟着小腿转 */
      var d = 0.25 * (0.5 + 0.5 * Math.sin(now * 3));
      var sv = rot(SH, d);
      setLine(shank, KN[0], KN[1], KN[0] + sv[0], KN[1] + sv[1]);
      var s0 = rot([0.6 * SH[0], 0.6 * SH[1]], d), s1 = rot([0.6 * SH[0] - 14, 0.6 * SH[1]], d);
      var B = [KN[0] + s1[0], KN[1] + s1[1]];
      setLine(shBr, KN[0] + s0[0], KN[1] + s0[1], B[0], B[1]);
      var pts = [], sl = Math.hypot(B[0] - SA[0], B[1] - SA[1]), nx = -(B[1] - SA[1]) / sl, ny = (B[0] - SA[0]) / sl;
      for (var i = 0; i <= 12; i++) {
        var u = i / 12, z = (i % 2 ? 7 : -7) * (i > 0 && i < 12 ? 1 : 0);
        pts.push([SA[0] + (B[0] - SA[0]) * u + z * nx, SA[1] + (B[1] - SA[1]) * u + z * ny]);
      }
      setPath(spring, pts);
      var l0 = rot([0.3 * SH[0], 0.3 * SH[1]], d), l1 = rot([0.3 * SH[0] + 14, 0.3 * SH[1]], d);
      var P3 = [KN[0] + l1[0], KN[1] + l1[1]];
      setLine(lkBr, KN[0] + l0[0], KN[1] + l0[1], P3[0], P3[1]);
      var dx = P3[0] - LP1[0], dy = P3[1] - LP1[1], dd = Math.hypot(dx, dy);
      var along = (LKA * LKA - LKB * LKB + dd * dd) / (2 * dd), hgt = Math.sqrt(Math.max(0, LKA * LKA - along * along));
      var P2 = [LP1[0] + (along * dx) / dd + (hgt * dy) / dd, LP1[1] + (along * dy) / dd - (hgt * dx) / dd];
      setPath(link, [LP1, P2, P3]);
      hardLabs.forEach(function (g, k) { setOpacity(g, seg(t, 3.7 + k * 0.7, 4.2 + k * 0.7)); });
      setOpacity(mid, seg(t, 7.0, 7.6));
      var outA = 0.5 * Math.sin(now * 0.9);
      /* 行星减速常见的接法（齿圈固定、太阳轮进、行星架出）里转子和输出同向；论文没写接法，这是我们按常见做法画的 */
      rotorG.setAttribute('transform', 'rotate(' + ((-9 * outA * 180) / Math.PI).toFixed(1) + ' ' + CX + ' ' + CY + ')');
      setLine(out, CX, CY, CX + 66 * Math.sin(outA), CY + 66 * Math.cos(outA));
      setOpacity(arm, seg(t, 10.4, 10.9));
      var ub = ease(seg(t, 10.8, 11.8));
      setH(b1, SHANK.I * BS * ub); setH(b2, KNEE_ARM * BS * ub);
      setOpacity(armLab, seg(t, 11.6, 12.0));
      setOpacity(toy, seg(t, 11.8, 12.3));
      accRows.forEach(function (r, k) { setW(r.b, r.w * ease(seg(t, 12.0 + k * 0.4, 12.6 + k * 0.4))); setOpacity(r.g, seg(t, 11.9 + k * 0.4, 12.2 + k * 0.4)); });
      setOpacity(accNote, seg(t, 12.8, 13.2));
      setOpacity(tail, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 四种自研执行器（表 2） ── */
  function buildSceneActuators() {
    var s = sceneSvg('四个圆盘是四种自研执行器，按直径比例画：5013、8513、8518、10413，转子一直在转。下面的柱子是峰值力矩和持续力矩。每个执行器标着它驱动的关节；有空心轴的三种，线缆从轴心穿过');
    s.appendChild(svgText(30, 28, '四种自研执行器：同一个 9:1 行星减速，按电机尺寸命名（表 2）', 'demo-x-ink2', 13.5));
    var XS = [96, 246, 404, 572], CY = 104, PXMM = 0.8;
    var units = ACTUATORS.map(function (a, i) {
      var g = group(s), x = XS[i], r = (a.dia / 2) * PXMM;
      /* 空心轴走线：线缆从左前方穿进轴心、从背后穿出到右边。右半段（背后）先画，被执行器挡住，只露出盘外那一截；
         左半段（前面）最后画，挡在电机前面 */
      var cable = null;
      if (a.hollow) {
        cable = [pathLine(g, [], C_WARN, 4), null];
        cable[0].setAttribute('d', 'M ' + x + ' ' + CY + ' Q ' + (x + 0.5 * r).toFixed(1) + ' ' + (CY - 10) + ' ' + (x + r + 26).toFixed(1) + ' ' + (CY - 16));
      }
      var ring = paint(svgEl('circle', { cx: x, cy: CY, r: r, 'stroke-width': 2.4 }), C_SURFACE2, C_INK2);
      g.appendChild(ring);
      var rotor = group(g);
      for (var k = 0; k < 8; k++) {
        var an = (k * Math.PI) / 4;
        hline(rotor, x + 0.35 * r * Math.cos(an), CY + 0.35 * r * Math.sin(an), x + 0.82 * r * Math.cos(an), CY + 0.82 * r * Math.sin(an), C_ACCENT, 2);
      }
      var hole = paint(svgEl('circle', { cx: x, cy: CY, r: a.hollow ? 0.28 * r : 0.12 * r, 'stroke-width': 1.2 }), a.hollow ? C_SURFACE : C_INK2, C_INK2);
      g.appendChild(hole);
      if (cable) {
        cable[1] = pathLine(g, [], C_WARN, 4);
        cable[1].setAttribute('d', 'M ' + (x - r - 26).toFixed(1) + ' ' + (CY + 16) + ' Q ' + (x - 0.5 * r).toFixed(1) + ' ' + (CY + 10) + ' ' + x + ' ' + CY);
        cable.forEach(function (c) { c.setAttribute('stroke-linecap', 'round'); c.style.opacity = 0; });
      }
      g.appendChild(svgText(x, CY + 70, a.name, 'demo-x-ink2', 12.5, 'middle'));
      g.appendChild(svgText(x, CY + 86, a.g + ' g · ×' + a.qty, 'demo-x-mut', 10, 'middle'));
      var jc = chip(s, x - 54, CY + 94, 108, a.joints.join(' · '), C_GOOD, { size: 10.5, h: 24 });
      var BY = 362, SC = 1.32;
      var bp = vbar(s, x - 24, BY, 22, C_SURFACE, 1), bc = vbar(s, x + 2, BY, 22, C_ACCENT, 1);
      bp.style.stroke = C_ACCENT; bp.setAttribute('stroke-width', 1.6);
      var vp = svgText(x - 13, 0, String(a.peak), 'demo-x-ink2', 10, 'middle'), vc = svgText(x + 13, 0, String(a.cont), 'demo-x-mut', 9.5, 'middle');
      s.appendChild(vp); s.appendChild(vc);
      return { g: g, rotor: rotor, cable: cable, jc: jc, bp: bp, bc: bc, vp: vp, vc: vc, x: x, a: a, BY: BY, SC: SC };
    });
    hline(s, 40, 362, 650, 362, C_BORDER, 1);
    var barKey = group(s);
    barKey.appendChild(svgText(40, 380, '空心框：峰值力矩　实心：持续力矩（N·m）', 'demo-x-mut', 10));
    /* 右：一条腿上的分工 */
    var legG = group(s);
    rectBox(legG, 664, 44, 106, 262, C_BORDER, C_SURFACE2);
    legG.appendChild(svgText(717, 62, '左腿', 'demo-x-ink2', 11, 'middle'));
    var J = { hip: [717, 96], knee: [722, 190], ankle: [712, 266] };
    hline(legG, J.hip[0], J.hip[1], J.knee[0], J.knee[1], C_INK2, 5);
    hline(legG, J.knee[0], J.knee[1], J.ankle[0], J.ankle[1], C_INK2, 4);
    hline(legG, J.ankle[0] - 14, J.ankle[1] + 12, J.ankle[0] + 32, J.ankle[1] + 12, C_INK2, 4);
    hline(legG, J.knee[0] - 10, J.knee[1] + 6, J.ankle[0] - 10, J.ankle[1] - 4, C_ACCENT, 1.4, '3 3');
    [[J.hip, '8513 ×2', -1], [[J.hip[0], J.hip[1] + 22], '8518', -1], [J.knee, '10413', 1], [[J.knee[0] - 12, J.knee[1] + 12], '8513', -1], [J.ankle, '5013', 1]].forEach(function (q) {
      dotAt(legG, q[0][0], q[0][1], 6, C_GOOD);
      legG.appendChild(svgText(q[0][0] + q[2] * 10, q[0][1] + 4, q[1], 'demo-x-mut', 9, q[2] > 0 ? 'start' : 'end'));
    });
    legG.appendChild(svgText(717, 296, '踝 FFE 经连杆', 'demo-x-mut', 9, 'middle'));
    var hollowLab = group(s);
    hollowLab.appendChild(paint(svgText(664, 330, '空心轴：线从轴心穿过', null, 10.5), C_WARN));
    hollowLab.appendChild(svgText(664, 346, '关节转动不磨、不扯线', 'demo-x-mut', 10));
    hollowLab.appendChild(paint(svgText(664, 362, '橙线：从轴心穿到背后', null, 9.5), C_WARN));
    var codeLab = group(s);
    codeLab.appendChild(svgText(40, 398, '开源代码把力矩上限压到 20 / 30 / 30 / 20 / 5 N·m（README：安全）', 'demo-x-ink2', 10.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      units.forEach(function (u, i) {
        setOpacity(u.g, seg(t, 0.3 + i * 0.5, 0.8 + i * 0.5));
        u.rotor.setAttribute('transform', 'rotate(' + ((now * 4 * u.a.vmax) % 360).toFixed(1) + ' ' + u.x + ' ' + CY + ')'); // 按表 2 最高转速的比例，只示意快慢
        var ub = ease(seg(t, 3.7 + i * 0.4, 4.6 + i * 0.4));
        setH(u.bp, u.a.peak * u.SC * ub); setH(u.bc, u.a.cont * u.SC * ub);
        u.vp.setAttribute('y', (u.BY - u.a.peak * u.SC * ub - 5).toFixed(1));
        u.vc.setAttribute('y', (u.BY - u.a.cont * u.SC * ub - 5).toFixed(1));
        setOpacity(u.vp, seg(t, 4.4 + i * 0.4, 4.8 + i * 0.4));
        setOpacity(u.vc, seg(t, 4.4 + i * 0.4, 4.8 + i * 0.4));
        setOpacity(u.jc, seg(t, 7.1 + i * 0.4, 7.5 + i * 0.4));
        if (u.cable) u.cable.forEach(function (c) { setOpacity(c, seg(t, 10.5, 11.1)); });
      });
      setOpacity(barKey, seg(t, 3.7, 4.2));
      setOpacity(legG, seg(t, 7.6, 8.4));
      setOpacity(hollowLab, seg(t, 10.8, 11.4));
      setOpacity(codeLab, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: EtherCAT 与时序 ── */
  function buildSceneTiming() {
    var s = sceneSvg('左上是 EtherCAT 链路：机载电脑当主站，12 个驱动器和 IMU 是自研的从站，数据包沿链路一圈圈跑。右上把延迟和策略的一拍比：20 毫秒一拍，延迟 2 毫秒或 0.5 毫秒。下面是 40 毫秒里的几条时间线：策略 50 Hz、状态估计 1 kHz、通信 1 到 4 kHz、驱动器上的 PD 25 kHz');
    s.appendChild(svgText(30, 28, '指令执行：EtherCAT 把延迟压到 0.5–2 ms，仿真里就不用模拟它', 'demo-x-ink2', 13.5));
    /* 左上：EtherCAT 链路 */
    var bus = group(s);
    rectBox(bus, 30, 44, 360, 158, C_BORDER, C_SURFACE2);
    bus.appendChild(svgText(44, 64, 'EtherCAT：电脑当主站，驱动器和 IMU 都是自研从站', 'demo-x-ink2', 10.5));
    rectBox(bus, 44, 82, 84, 46, C_ACCENT, C_SURFACE);
    bus.appendChild(svgText(86, 101, '机载电脑', 'demo-x-ink2', 10.5, 'middle'));
    bus.appendChild(svgText(86, 118, '主站', 'demo-x-mut', 9.5, 'middle'));
    var nodes = [[160, 105, 'IMU']];
    for (var i = 0; i < 12; i++) nodes.push([196 + (i % 6) * 30, i < 6 ? 92 : 150, '']);
    var loop = [[128, 105], [160, 105], [196, 92], [346, 92], [370, 121], [346, 150], [196, 150], [160, 170], [86, 170], [86, 128]];
    pathLine(bus, loop, C_BORDER, 2);
    nodes.forEach(function (n, k) {
      if (!k) { rectBox(bus, n[0] - 14, n[1] - 10, 28, 20, C_WARN, C_SURFACE); bus.appendChild(svgText(n[0], n[1] + 4, 'IMU', 'demo-x-ink2', 8.5, 'middle')); }
      else dotAt(bus, n[0], n[1], 8, C_GOOD);
    });
    bus.appendChild(svgText(271, 125, '12 个驱动器', 'demo-x-mut', 9.5, 'middle'));
    var pkt = dotAt(bus, 0, 0, 4.5, C_ACCENT);
    bus.appendChild(svgText(376, 192, '1–4 kHz', 'demo-x-acc', 10.5, 'end'));
    /* 右上：延迟和一拍比 */
    var lat = group(s);
    rectBox(lat, 406, 44, 364, 158, C_BORDER, C_SURFACE2);
    lat.appendChild(svgText(420, 64, '最大延迟（脚注 1）和策略的一拍比', 'demo-x-ink2', 10.5));
    var LX = 470, LS = 230 / 20;
    var latRows = [['策略一拍', 20, C_ACCENT, '20 ms'], ['1 kHz', RATES.latAtLo, C_WARN, '2 ms：一拍的 10%'], ['4 kHz', RATES.latAtHi, C_GOOD, '0.5 ms：2.5%']].map(function (r, k) {
      var y = 82 + k * 30, g = group(lat);
      g.appendChild(svgText(LX - 8, y + 11, r[0], 'demo-x-mut', 10, 'end'));
      var b = hbar(g, LX, y, 16, r[2]);
      g.appendChild(svgText(LX + r[1] * LS + 6, y + 12, r[3], 'demo-x-ink2', 10));
      return { g: g, b: b, w: r[1] * LS };
    });
    lat.appendChild(svgRich(420, 186, '两组数都正好是 2 个通信周期：$2/f$（我们的归纳）', { size: 10, w: 340, cls: 'demo-x-mut' }));
    /* 下：40 ms 里的几条时间线 */
    var tl = group(s);
    rectBox(tl, 30, 214, 740, 190, C_BORDER, C_SURFACE);
    var TX0 = 170, TX1 = 750, MS = (TX1 - TX0) / 40;
    tl.appendChild(svgText(TX1, 230, '40 ms', 'demo-x-mut', 9.5, 'end'));
    tl.appendChild(svgText(TX0, 230, '0', 'demo-x-mut', 9.5, 'middle'));
    var TRACKS = [['策略 50 Hz', 20, C_ACCENT, 3], ['状态估计 1 kHz', 1, C_GOOD, 1.4], ['EtherCAT 4 kHz', 0.25, C_WARN, 1], ['PD（驱动器上）25 kHz', 0.04, C_INK2, 0.6]];
    var tracks = TRACKS.map(function (tr, k) {
      var y = 252 + k * 34, g = group(tl);
      g.appendChild(svgText(TX0 - 10, y + 4, tr[0], 'demo-x-ink2', 10, 'end'));
      hline(g, TX0, y + 10, TX1, y + 10, C_BORDER, 1);
      if (tr[1] < 0.1) {
        var r = paint(svgEl('rect', { x: TX0, y: y - 6, width: TX1 - TX0, height: 16, opacity: 0.35 }), tr[2]);
        g.appendChild(r); // 25 kHz 每 0.04 ms 一次，这个比例下画不出单条线，画成实心带
      } else {
        for (var ms = 0; ms <= 40 + 1e-9; ms += tr[1]) hline(g, TX0 + ms * MS, y + (tr[1] >= 20 ? -10 : -4), TX0 + ms * MS, y + 10, tr[2], tr[3]);
      }
      return g;
    });
    var head = hline(tl, TX0, 238, TX0, 380, C_BAD, 1.6);
    var qd = group(tl);
    var qdArrows = [0, 20, 40].map(function (ms) { return pathLine(qd, [[TX0 + ms * MS, 256], [TX0 + ms * MS, 356]], C_ACCENT, 1.4, '3 3'); });
    qd.appendChild(svgRich(TX0 + 20 * MS + 6, 376, '每 20 ms 发一次目标 $q_d$，PD 在驱动器上本地闭环', { size: 10, w: 320, cls: 'demo-x-acc' }));
    void qdArrows;
    var simNote = group(tl);
    simNote.appendChild(svgText(44, 396, '仿真里：执行器 = 没有延迟的力矩源', 'demo-x-ink2', 10.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(tl, seg(t, 0.3, 0.9));
      tracks.forEach(function (g, k) { setOpacity(g, k === 0 ? 1 : seg(t, 10.5 + (k - 1) * 0.6, 11.0 + (k - 1) * 0.6)); });
      setOpacity(qd, seg(t, 11.8, 12.4));
      var ph = ((now * 0.25) % 1 + 1) % 1;
      setLine(head, TX0 + ph * (TX1 - TX0), 238, TX0 + ph * (TX1 - TX0), 380);
      setOpacity(bus, seg(t, 3.6, 4.2));
      var pts = loop, lens = [], tot = 0;
      for (var i = 1; i < pts.length; i++) { var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); lens.push(d); tot += d; }
      var u = (((now * 0.6) % 1) + 1) % 1 * tot, j = 0;
      while (j < lens.length - 1 && u > lens[j]) { u -= lens[j]; j++; }
      var f = clamp(u / lens[j], 0, 1);
      moveDot(pkt, [pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f]);
      setOpacity(lat, seg(t, 7.0, 7.5));
      latRows.forEach(function (r, k) { setW(r.b, r.w * ease(seg(t, 7.2 + k * 0.6, 7.9 + k * 0.6))); setOpacity(r.g, seg(t, 7.1 + k * 0.6, 7.4 + k * 0.6)); });
      setOpacity(simNote, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 可靠又便宜 ── */
  function buildSceneReliable() {
    var s = sceneSvg('左下列出可靠性的做法：铝合金和钢、空心轴走线、用电流估力矩、用动量观测器估接触力。左上是表 3 的成本条：整机不含手臂 9955 美元，执行器约占七成；IMU 用 50 美元的手机级模块。右边机器人反复摔倒又被扶起，附录表 4 记了 38 次');
    s.appendChild(svgText(30, 28, '可靠又便宜：整机约 1 万美元，摔了 38 次只坏过 2 次', 'demo-x-ink2', 13.5));
    /* 左上：成本条 */
    var cost = group(s);
    rectBox(cost, 30, 44, 470, 160, C_BORDER, C_SURFACE2);
    cost.appendChild(svgText(44, 64, '表 3：小批量生产的成本（美元，不含手臂）', 'demo-x-ink2', 10.5));
    var CX0 = 44, CW = 440, total = costTotal();
    var parts = [['执行器 ×12', actuatorUsd(), C_ACCENT], ['腿结构 ×2', COST.leg * COST.legQty, C_GOOD], ['躯干', COST.torso, C_MUTED], ['电脑', COST.pc, C_WARN], ['电池 ×2', COST.battery * COST.batteryQty, C_BAD], ['IMU', COST.imu, C_INK2]];
    var acc = 0;
    var segs = parts.map(function (p) {
      var x = CX0 + (acc / total) * CW, w = (p[1] / total) * CW;
      acc += p[1];
      var r = hbar(cost, x, 76, 26, p[2], 0.85);
      return { r: r, w: w, x: x, p: p };
    });
    var costLab = group(cost);
    costLab.appendChild(paint(svgText(CX0, 120, '执行器 ' + actuatorUsd() + '（' + fmt((actuatorUsd() / total) * 100, 0) + '%）', null, 10.5), C_ACCENT));
    costLab.appendChild(paint(svgText(CX0 + 0.72 * CW, 120, '腿结构 ' + COST.leg * COST.legQty, null, 10), C_GOOD));
    costLab.appendChild(svgText(CX0 + CW, 120, '合计 ' + total, 'demo-x-ink2', 11, 'end'));
    var imu = group(cost);
    imu.appendChild(svgText(44, 146, 'IMU', 'demo-x-ink2', 10.5));
    var bImu = hbar(imu, 120, 136, 14, C_GOOD), bOld = hbar(imu, 120, 160, 14, C_MUTED);
    imu.appendChild(svgText(110, 147, '这台', 'demo-x-mut', 9.5, 'end'));
    imu.appendChild(svgText(110, 171, '以往', 'demo-x-mut', 9.5, 'end'));
    var imuL1 = paint(svgText(0, 147, '手机级 ICM42688：芯片 < $1，模块 $50', null, 10), C_GOOD);
    var imuL2 = svgText(0, 171, '常见约 $1,000', 'demo-x-mut', 10);
    imu.appendChild(imuL1); imu.appendChild(imuL2);
    var IS = 250 / COST.imuTypical;
    /* 左下：怎么做到可靠 */
    var how = group(s);
    rectBox(how, 30, 216, 470, 188, C_BORDER, C_SURFACE);
    var howRows = [
      ['材料', '主体 7075、6061 铝合金；齿轮箱和连杆用 SKD11 钢'],
      ['走线', '空心轴：电源线、通信线从关节轴心穿过'],
      ['力矩', '准直驱：用电流估关节力矩，不加应变片'],
      ['接触', '广义动量观测器估脚底接触力，不用力传感器'],
      ['外购', '只有电脑（i7-1255U）和电池（DJI TB50）']
    ].map(function (r, k) {
      var g = group(how), y = 240 + k * 34;
      g.appendChild(paint(svgText(44, y, r[0], null, 11), k < 2 ? C_GOOD : k < 4 ? C_ACCENT : C_WARN));
      g.appendChild(svgText(84, y, r[1], 'demo-x-ink2', 10.5));
      return g;
    });
    /* 右：摔了扶起来 */
    var fall = group(s);
    rectBox(fall, 516, 44, 254, 236, C_BORDER, C_SURFACE2);
    var GY = 268, M = 150, PIV = [690, GY];
    hline(fall, 530, GY, 756, GY, C_BORDER, 1.4);
    var BX = 690;
    var botG = group(fall);
    var bot = bhBody(botG, C_REAL, M);
    var cnt = paint(svgText(756, 70, '', null, 13, 'end'), C_BAD);
    fall.appendChild(cnt);
    var resetT = paint(svgText(530, 70, '3–5 秒扶起来接着跑', null, 10.5), C_GOOD);
    fall.appendChild(resetT);
    var tbl = group(s);
    rectBox(tbl, 516, 292, 254, 112, C_BORDER, C_SURFACE);
    tbl.appendChild(svgText(530, 310, '附录表 4：摔倒次数', 'demo-x-ink2', 10.5));
    var FX = 580;
    var fbars = FALLS.map(function (f, k) {
      var y = 316 + k * 16;
      tbl.appendChild(svgText(FX - 6, y + 10, f[0], 'demo-x-mut', 9.5, 'end'));
      var b = hbar(tbl, FX, y, 12, C_BAD, 0.8);
      var v = svgText(0, y + 10, String(f[1]), 'demo-x-ink2', 9.5);
      tbl.appendChild(v);
      return { b: b, v: v, w: f[1] * 8 };
    });
    var fineT = paint(svgText(756, 398, '只坏过 2 次：螺丝松、胶开', null, 10, 'end'), C_GOOD);
    tbl.appendChild(fineT);
    /* 摔倒循环从第 5 段开头按真实时间算起（见 sinceCue）：先收脚站定，1 s 后才倒；只摔两次，第二次扶起来后接着踏步 */
    var fall0 = { v: null };

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(how, seg(t, 0.3, 0.8));
      howRows.forEach(function (g, k) { setOpacity(g, k < 2 ? seg(t, 0.6 + k * 0.8, 1.1 + k * 0.8) : k < 4 ? seg(t, 3.7 + (k - 2) * 1.2, 4.2 + (k - 2) * 1.2) : seg(t, 10.5, 11.0)); });
      setOpacity(cost, seg(t, 7.0, 7.4));
      segs.forEach(function (sg, k) { setW(sg.r, sg.w * ease(seg(t, 7.2 + k * 0.3, 7.6 + k * 0.3))); });
      setOpacity(costLab, seg(t, 8.8, 9.2));
      setOpacity(imu, seg(t, 9.3, 9.7));
      var ui = ease(seg(t, 9.4, 10.2));
      setW(bImu, COST.imu * IS * ui); setW(bOld, COST.imuTypical * IS * ui);
      imuL1.setAttribute('x', (120 + COST.imu * IS * ui + 8).toFixed(1));
      imuL2.setAttribute('x', (120 + COST.imuTypical * IS * ui + 8).toFixed(1));
      /* 摔倒循环：踏步 → 往后倒 → 躺一会 → 扶起；第 5 段之前只踏步 */
      setOpacity(fall, seg(t, 0.4, 1.0));
      var cyc = 4.2, raw = sinceCue(fall0, t, clock, now, 13.4, 3.6), since = raw < 0 ? -1 : Math.min(raw, 2 * cyc - 1e-3);
      var phase = since < 0 ? -1 : since % cyc;
      /* 绕后脚跟往后倒：重力矩随倾角变大，越倒越快，到躯干背面着地才停（-89° 时背面贴地）；扶起来可以慢慢来 */
      var LIE = -89, ang = 0;
      if (phase >= 1.0 && phase < 1.6) ang = LIE * Math.pow((phase - 1.0) / 0.6, 2);
      else if (phase >= 1.6 && phase < 3.0) ang = LIE;
      else if (phase >= 3.0 && phase < 3.6) ang = LIE * (1 - ease((phase - 3.0) / 0.6));
      var stand = [[BX + 4, GY], [BX - 6, GY]], walk = treadmill(now, BX, GY, 13, 1.1, 8);
      var bl = raw < 0 ? 0 : raw < cyc + 3.6 ? Math.min(1, raw / 0.4) : Math.max(0, 1 - (raw - cyc - 3.6) / 0.4);
      var feet = [0, 1].map(function (k) { return [walk[k][0] + (stand[k][0] - walk[k][0]) * bl, walk[k][1] + (stand[k][1] - walk[k][1]) * bl]; });
      bot.put(BX, GY - LEG.hipH * M, 0, feet);
      botG.setAttribute('transform', 'rotate(' + ang.toFixed(1) + ' ' + (BX - 6 - LEG.heel * M).toFixed(1) + ' ' + GY + ')');
      setOpacity(resetT, phase >= 3.0 ? 1 : 0);
      setOpacity(tbl, seg(t, 13.6, 14.0));
      var sum = 0;
      fbars.forEach(function (fb, k) {
        var u = ease(seg(t, 13.8 + k * 0.3, 14.4 + k * 0.3)), w = fb.w * u;
        setW(fb.b, w);
        fb.v.setAttribute('x', (FX + w + 5).toFixed(1));
        sum += FALLS[k][1] * u;
      });
      cnt.textContent = t >= 13.6 ? '摔倒 ' + Math.round(sum) + ' 次' : '';
      setOpacity(fineT, seg(t, 15.0, 15.5));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 7: 拟人的腿：每条 6 个自由度 ── */
  function buildSceneAnthro() {
    var s = sceneSvg('左边是一条腿的 6 个关节：髋三个（旋转、外展、屈伸）、膝一个、踝两个（屈伸、内外翻），高亮依次转过。右边是附录表 5：每个关节人的活动范围（灰）和机器人的范围（彩色），重叠部分占人的范围的比例就是覆盖率');
    s.appendChild(svgText(30, 28, '拟人：每条腿 6 个自由度，关节限位贴着人体（附录表 5）', 'demo-x-ink2', 13.5));
    var chain = group(s);
    rectBox(chain, 30, 44, 232, 360, C_BORDER, C_SURFACE2);
    var AX = { yaw: ['偏航', C_WARN], roll: ['横滚', C_GOOD], pitch: ['俯仰', C_ACCENT] };
    var JR = [['HR', '髋 · 旋转', 'yaw'], ['HAA', '髋 · 外展', 'roll'], ['HFE', '髋 · 屈伸', 'pitch'], ['KFE', '膝 · 屈伸', 'pitch'], ['FFE', '踝 · 屈伸', 'pitch'], ['FAA', '踝 · 内外翻', 'roll']];
    hline(chain, 64, 76, 64, 360, C_BORDER, 3);
    var joints = JR.map(function (j, k) {
      var y = 76 + k * 56, g = group(chain), col = AX[j[2]][1];
      var ring = paint(svgEl('circle', { cx: 64, cy: y, r: 15, 'stroke-width': 2 }), C_SURFACE, col);
      g.appendChild(ring);
      var tick = hline(g, 64, y, 64, y - 12, col, 2.4);
      g.appendChild(paint(svgText(90, y - 2, j[0], null, 12.5), col));
      /* URDF 里髋的 HR、HAA 两根轴在矢状面里各斜 45°，两个一起转才是纯偏航或纯横滚 */
      g.appendChild(svgText(90, y + 14, j[1] + '（' + (k < 2 ? '斜 45° 轴：偏航 + 横滚' : AX[j[2]][0]) + '）', 'demo-x-mut', 10));
      return { g: g, ring: ring, tick: tick, y: y };
    });
    var fiveDof = group(chain);
    fiveDof.appendChild(paint(svgText(146, 392, '比每腿 5 个的多出踝横滚', null, 10, 'middle'), C_GOOD));
    /* 右：表 5 的范围 */
    var tab = group(s);
    rectBox(tab, 278, 44, 492, 252, C_BORDER, C_SURFACE);
    var AX0 = 340, AX1 = 700, A0 = -110, A1 = 150;
    function ax(d) { return AX0 + ((d - A0) / (A1 - A0)) * (AX1 - AX0); }
    tab.appendChild(svgText(AX0, 62, '人（灰） vs 机器人（彩色），单位 °', 'demo-x-ink2', 10.5));
    tab.appendChild(svgText(758, 62, '覆盖率（表 5）', 'demo-x-ink2', 10.5, 'end'));
    hline(tab, ax(0), 70, ax(0), 284, C_BORDER, 1, '3 3');
    [-90, 0, 90].forEach(function (d) { tab.appendChild(svgText(ax(d), 292, d + '°', 'demo-x-mut', 9, 'middle')); });
    var rows = JOINT_RANGE.map(function (r, k) {
      var y = 80 + k * 34, g = group(tab), col = AX[JR[k][2]][1];
      g.appendChild(paint(svgText(AX0 - 8, y + 13, r[0], null, 11, 'end'), col));
      var hb = paint(svgEl('rect', { x: ax(r[2][0]), y: y, width: 0, height: 9, rx: 2 }), C_MUTED);
      hb.style.opacity = 0.55;
      g.appendChild(hb);
      var rb = paint(svgEl('rect', { x: ax(r[3][0]), y: y + 12, width: 0, height: 9, rx: 2 }), col);
      g.appendChild(rb);
      var cov = svgText(758, y + 14, fmt(r[4], 1) + '%', 'demo-x-ink2', 11, 'end');
      g.appendChild(cov);
      return { g: g, hb: hb, rb: rb, cov: cov, r: r, hw: ax(r[2][1]) - ax(r[2][0]), rw: ax(r[3][1]) - ax(r[3][0]) };
    });
    /* 下右：覆盖率怎么算 */
    var calc = group(s);
    rectBox(calc, 278, 306, 492, 98, C_ACCENT, C_SURFACE);
    calc.appendChild(svgMath(300, 334, 'c = \\dfrac{|R \\cap H|}{|H|}', { size: 13, w: 150, display: true }));
    calc.appendChild(svgText(450, 330, 'R：机器人的范围　H：人的范围', 'demo-x-mut', 10));
    calc.appendChild(svgText(450, 352, '髋外展：|[−35°, 35°] ∩ [−40°, 20°]| = 55°', 'demo-x-ink2', 10.5));
    calc.appendChild(svgText(450, 372, '55 / 60 = 91.67%，表 5 写的是 91.6%', 'demo-x-ink2', 10.5));
    var calc2 = group(calc);
    calc2.appendChild(paint(svgText(292, 394, '踝两个方向都是 100%；髋旋转最少，77.8%', null, 10.5), C_GOOD));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(chain, seg(t, 0.2, 0.6));
      var hiK = Math.floor(now / 1.2) % 6;
      joints.forEach(function (j, k) {
        setOpacity(j.g, seg(t, 0.4 + k * 0.4, 0.8 + k * 0.4));
        var on = k === hiK || (t >= 3.6 && t < 7.0 && k === 5);
        var a = on ? 0.9 * Math.sin(now * 4) : 0;
        setLine(j.tick, 64, j.y, 64 + 12 * Math.sin(a), j.y - 12 * Math.cos(a));
        j.ring.setAttribute('r', on ? '17' : '15');
      });
      setOpacity(fiveDof, seg(t, 3.7, 4.3));
      setOpacity(tab, seg(t, 7.0, 7.4));
      rows.forEach(function (r, k) {
        var u = ease(seg(t, 7.2 + k * 0.4, 7.9 + k * 0.4));
        setW(r.hb, r.hw * u); setW(r.rb, r.rw * u);
        setOpacity(r.cov, seg(t, 10.6 + k * 0.3, 11.0 + k * 0.3));
        var hl = t >= 13.4 && (k === 0 || k >= 4);
        r.cov.setAttribute('class', hl ? (k === 0 ? 'demo-x-warn' : 'demo-x-good') : 'demo-x-ink2');
      });
      setOpacity(calc, seg(t, 10.4, 10.9));
      setOpacity(calc2, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 最简的强化学习控制器 ── */
  function buildScenePolicy() {
    var s = sceneSvg('左边是观测：只有当下这一拍的机身角速度、重力投影、关节角和角速度、状态估计给的线速度、速度命令、上一步动作，一共 48 维。中间是 512、256、128 三层的 MLP，输出 12 个目标关节角，右边由驱动器上的 PD 变成力矩。下面划掉了观测历史、教师—学生、相位信号、参考动作，最后是四组奖励');
    s.appendChild(svgText(30, 28, '控制器故意做到最简：只看当下这一拍', 'demo-x-ink2', 13.5));
    var obs = group(s);
    rectBox(obs, 30, 44, 232, 262, C_BORDER, C_SURFACE2);
    obs.appendChild(svgText(44, 62, '观测（第 4.1 节；维数按开源代码数）', 'demo-x-ink2', 10));
    var OBS = [['机身角速度', 3], ['重力投影', 3], ['关节角', 12], ['关节角速度', 12], ['机身线速度（状态估计）', 3], ['速度命令', 3], ['上一步动作', 12]];
    var obsRows = OBS.map(function (o, k) {
      var g = group(obs), y = 72 + k * 28;
      rectBox(g, 44, y, 204, 24, k === 4 ? C_WARN : C_ACCENT, C_SURFACE);
      g.appendChild(svgText(54, y + 16, o[0], 'demo-x-ink2', 10.5));
      g.appendChild(svgText(240, y + 16, String(o[1]), 'demo-x-mut', 10.5, 'end'));
      return g;
    });
    var total = paint(svgText(248, 296, '合计 ' + CODE.obsDim + ' 维', null, 11, 'end'), C_ACCENT);
    obs.appendChild(total);
    /* 中：MLP */
    var net = group(s);
    rectBox(net, 278, 44, 232, 262, C_BORDER, C_SURFACE2);
    net.appendChild(svgText(292, 62, 'Actor：MLP，ELU 激活', 'demo-x-ink2', 10.5));
    var NX = [316, 376, 436], NB = 230, layers = NET.map(function (n, k) {
      var h = (n / 512) * 150;
      var r = vbar(net, NX[k], NB, 30, C_ACCENT, 0.85);
      net.appendChild(svgText(NX[k] + 15, NB + 14, String(n), 'demo-x-mut', 10, 'middle'));
      return { r: r, h: h };
    });
    var outB = vbar(net, 484, NB, 14, C_GOOD);
    net.appendChild(svgText(491, NB + 14, '12', 'demo-x-good', 10, 'middle'));
    net.appendChild(svgText(394, 268, 'PPO，在 Isaac Lab 里训练', 'demo-x-ink2', 10.5, 'middle'));
    net.appendChild(svgText(394, 288, 'Critic 也是 512-256-128', 'demo-x-mut', 10, 'middle'));
    /* 右：驱动器上的 PD */
    var pd = group(s);
    rectBox(pd, 526, 44, 244, 262, C_GOOD, C_SURFACE);
    pd.appendChild(svgText(540, 62, '输出 12 个目标关节角 → 驱动器', 'demo-x-ink2', 10.5));
    pd.appendChild(svgMath(648, 96, '\\tau = K_p(q_d - q) - K_d\\,\\dot q', { size: 14, anchor: 'middle', w: 230 }));
    pd.appendChild(svgText(648, 124, '策略 50 Hz 出一次，PD 在驱动器上跑 25 kHz', 'demo-x-mut', 9.5, 'middle'));
    var JC = [648, 210];
    var jRing = paint(svgEl('circle', { cx: JC[0], cy: JC[1], r: 30, 'stroke-width': 2.4 }), C_SURFACE2, C_GOOD);
    pd.appendChild(jRing);
    var jArm = hline(pd, JC[0], JC[1], JC[0], JC[1] + 56, C_GOOD, 6);
    jArm.setAttribute('stroke-linecap', 'round');
    var tgt = hline(pd, JC[0], JC[1], JC[0], JC[1] + 56, C_ACCENT, 1.6, '4 3');
    pd.appendChild(svgRich(JC[0] + 40, JC[1] - 18, '目标 $q_d$', { size: 10, w: 80, cls: 'demo-x-acc' }));
    /* 流动的点：观测 → 网络 → 驱动器 */
    var flow = group(s);
    var fl = [dotAt(flow, 0, 0, 4, C_ACCENT), dotAt(flow, 0, 0, 4, C_ACCENT), dotAt(flow, 0, 0, 4, C_GOOD)];
    /* 下：不要的东西与奖励 */
    var no = group(s);
    rectBox(no, 30, 318, 740, 86, C_BORDER, C_SURFACE2);
    var noChips = ['观测历史', '教师—学生', '相位信号', '参考动作'].map(function (str, k) {
      var x = 44 + k * 120, g = group(no);
      chip(g, x, 328, 108, str, C_BAD, { size: 11 });
      strike(g, x, 328, 108, 28);
      return g;
    });
    /* 论文第 4.1 节给了两种理由：历史与教师—学生是在线辨识环境参数的手段，相位与参考动作是为了减少人为偏置 */
    var noT = group(no);
    noT.appendChild(svgText(532, 338, '历史、教师—学生：在线辨识的手段', 'demo-x-mut', 10));
    noT.appendChild(svgText(532, 353, '相位、参考动作：为了减少人为偏置', 'demo-x-mut', 10));
    noT.appendChild(paint(svgText(532, 369, '都去掉：只能靠仿真本身够准', null, 10.5), C_BAD));
    var rew = group(no);
    rew.appendChild(svgText(44, 384, '奖励四组（附录 A）：', 'demo-x-ink2', 10.5));
    [['跟踪：前后左右速度、偏航角速度', 146, 384], ['平滑：罚竖直速度、横滚俯仰角速度、力矩、动作变化', 380, 384],
      ['正则：髋膝偏离名义角、机身竖直、关节软限位', 146, 399], ['步态：腾空时间、不打滑、接触力不过阈值', 380, 399]].forEach(function (r) {
      rew.appendChild(svgText(r[1], r[2], r[0], 'demo-x-mut', 9.5));
    });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(obs, seg(t, 0.3, 0.7));
      obsRows.forEach(function (g, k) { setOpacity(g, seg(t, 0.5 + k * 0.35, 0.9 + k * 0.35)); });
      setOpacity(total, seg(t, 3.7, 4.2));
      setOpacity(no, seg(t, 7.0, 7.4));
      noChips.forEach(function (g, k) { setOpacity(g, seg(t, 7.2 + k * 0.5, 7.6 + k * 0.5)); });
      setOpacity(noT, seg(t, 9.3, 9.8));
      setOpacity(net, seg(t, 10.4, 10.8));
      layers.forEach(function (l, k) { setH(l.r, l.h * ease(seg(t, 10.6 + k * 0.3, 11.1 + k * 0.3))); });
      setH(outB, Math.max(4, (12 / 512) * 150) * ease(seg(t, 11.5, 11.9))); // 和 512 / 256 / 128 同一比例（3.5 px），最少画 4 px
      setOpacity(pd, seg(t, 11.6, 12.1));
      var target = 0.55 * Math.sin(now * 1.6), act = 0.55 * Math.sin(now * 1.6 - 0.35);
      setLine(tgt, JC[0], JC[1], JC[0] + 56 * Math.sin(target), JC[1] + 56 * Math.cos(target));
      setLine(jArm, JC[0], JC[1], JC[0] + 56 * Math.sin(act), JC[1] + 56 * Math.cos(act));
      setOpacity(flow, seg(t, 12.0, 12.4));
      var u = ((now * 0.5) % 1 + 1) % 1;
      moveDot(fl[0], [262 + u * 54, 175]);
      moveDot(fl[1], [446 + u * 38, 200 + u * 24]);
      moveDot(fl[2], [498 + u * 44, 228 - u * 18]);
      setOpacity(rew, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: 辨识：转子惯量从 CAD，摩擦单独测 ── */
  function buildSceneIdentify() {
    var s = sceneSvg('左下把不确定性分两类：机器人本身的物理参数，和与环境的接触。左上是从 CAD 读出的转子惯量，乘 81 折算到关节。右边是一个执行器的摩擦：示意测点慢慢出现，再画出开源代码里的 tanh 摩擦模型；几种关节的摩擦大小不同');
    s.appendChild(svgText(30, 28, '第一类不确定性：机器人自己的参数，辨识出来', 'demo-x-ink2', 13.5));
    var two = group(s);
    rectBox(two, 30, 262, 300, 142, C_BORDER, C_SURFACE2);
    two.appendChild(svgText(44, 282, '第 4.2 节：不确定性分两类', 'demo-x-ink2', 11));
    var tw1 = chip(two, 44, 292, 272, '① 机器人自己的参数（质量、惯量、摩擦）', C_GOOD, { size: 10.5 });
    var tw2 = chip(two, 44, 326, 272, '② 执行任务时和环境的接触', C_WARN, { size: 10.5 });
    var twNote = group(two);
    twNote.appendChild(svgText(44, 376, '①：辨识得准 → 范围给窄', 'demo-x-good', 10.5));
    twNote.appendChild(svgText(44, 394, '②：没法辨识 → 范围给宽（下一幕）', 'demo-x-warn', 10.5));
    /* 左上：CAD 读转子惯量 */
    var cad = group(s);
    rectBox(cad, 30, 44, 300, 206, C_ACCENT, C_SURFACE);
    cad.appendChild(svgText(44, 64, '转子惯量：直接从 CAD 读（kg·m²）', 'demo-x-ink2', 11));
    cad.appendChild(svgText(160, 86, '转子', 'demo-x-mut', 10, 'middle'));
    cad.appendChild(svgText(262, 86, '× 81 折到关节', 'demo-x-mut', 10, 'middle'));
    var cadRows = ACTUATORS.map(function (a, k) {
      var g = group(cad), y = 112 + k * 34;
      g.appendChild(svgText(50, y, a.name, 'demo-x-ink2', 11));
      g.appendChild(svgRich(160, y - 4, '$' + sci(a.rotor, 1) + '$', { size: 11, anchor: 'middle', w: 100 }));
      g.appendChild(svgRich(262, y - 4, '$' + sci(armature(a), 3) + '$', { size: 11, anchor: 'middle', w: 100, cls: 'demo-x-acc' }));
      return g;
    });
    /* 右：摩擦的测点与拟合（摩擦关于 0 对称，只画正转那一半） */
    var fr = group(s);
    rectBox(fr, 346, 44, 424, 360, C_BORDER, C_SURFACE);
    fr.appendChild(svgText(360, 64, '摩擦：每个执行器单独测（论文没写测法）', 'demo-x-ink2', 11));
    var FX0 = 396, FX1 = 700, FY0 = 318, FY1 = 120, QM = 2, TM = 1.2;
    function fx(q) { return FX0 + (q / QM) * (FX1 - FX0); }
    function fy(tq) { return FY0 - (tq / TM) * (FY0 - FY1); }
    hline(fr, FX0, FY0, FX1, FY0, C_BORDER, 1);
    hline(fr, FX0, FY0, FX0, FY1, C_BORDER, 1);
    fr.appendChild(svgText(FX1, FY0 + 28, '关节角速度 rad/s', 'demo-x-mut', 9.5, 'end'));
    fr.appendChild(svgText(FX0 - 4, FY1 - 8, '摩擦力矩 N·m', 'demo-x-mut', 9.5));
    [0.5, 1, 1.5, 2].forEach(function (q) { fr.appendChild(svgText(fx(q), FY0 + 13, String(q), 'demo-x-mut', 9, 'middle')); });
    [0.5, 1].forEach(function (v) { fr.appendChild(svgText(FX0 - 6, fy(v) + 3, String(v), 'demo-x-mut', 9, 'end')); hline(fr, FX0, fy(v), FX1, fy(v), C_BORDER, 0.6, '2 4'); });
    var KNEE = CODE_JOINTS[2];
    /* 示意测点：按代码的模型加 ±0.05 N·m 噪声，只画在 tanh 已经饱和的 0.25 rad/s 以上（0 附近的斜坡是仿真里平滑过零用的，不是测出来的） */
    var rng = mulberry32(42), pts = [];
    for (var i = 0; i < 24; i++) {
      var q = 0.25 + (1.75 * i) / 23;
      pts.push([q, frictionTorque(KNEE, q) + 0.05 * (rng() - 0.5) * 2]);
    }
    var meas = pts.map(function (p) { return dotAt(fr, fx(p[0]), fy(p[1]), 3, C_INK2); });
    function curvePts(j) {
      var a = [];
      for (var k = 0; k <= 120; k++) { var q2 = (QM * k) / 120; a.push([fx(q2), fy(frictionTorque(j, q2))]); }
      return a;
    }
    var fit = pathLine(fr, curvePts(KNEE), C_BAD, 2.6);
    var fitLabG = group(fr);
    fitLabG.appendChild(svgRich(FX1 + 6, fy(frictionTorque(KNEE, QM)) + 4, '膝 KFE $0.8$', { size: 10.5, w: 64, cls: 'demo-x-bad' }));
    fitLabG.appendChild(svgText(fx(0.12) + 10, 244, '← 0 附近的斜坡：tanh 平滑过零（仿真用）', 'demo-x-mut', 9));
    fr.appendChild(svgText(360, 346, '测点为示意：代码模型 + 噪声', 'demo-x-mut', 9.5));
    var formula = group(fr);
    formula.appendChild(svgMath(558, 94, '\\tau_f = F_s \\tanh(\\dot q / v_a) + F_d\\,\\dot q', { size: 13, anchor: 'middle', w: 380 }));
    var others = [[CODE_JOINTS[3], C_WARN, '踝 FFE 1.0'], [CODE_JOINTS[0], C_ACCENT, '髋 0.3'], [CODE_JOINTS[4], C_GOOD, '踝 FAA 0.1']].map(function (o) {
      var g = group(fr);
      pathLine(g, curvePts(o[0]), o[1], 1.8);
      g.appendChild(paint(svgText(FX1 + 6, fy(frictionTorque(o[0], QM)) + 4, o[2], null, 10), o[1]));
      return g;
    });
    var probe = dotAt(fr, 0, 0, 5, C_BAD);
    var probeT = paint(svgText(0, 0, '', null, 10.5), C_BAD);
    fr.appendChild(probeT);
    var ex = group(fr);
    ex.appendChild(svgText(360, 362, '膝以 1 rad/s 转：0.8 + 0.02 ≈ 0.82 N·m', 'demo-x-ink2', 10.5));
    ex.appendChild(svgText(360, 378, '模型在 0.05 rad/s 只给 0.37 N·m：平滑过零的过渡段', 'demo-x-ink2', 10));
    ex.appendChild(svgText(360, 394, '代码 README：电机齿槽力矩大，一并算进摩擦', 'demo-x-mut', 10));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(two, seg(t, 0.3, 0.7));
      setOpacity(tw1, seg(t, 0.6, 1.0)); setOpacity(tw2, seg(t, 1.4, 1.8));
      setOpacity(twNote, seg(t, 2.2, 2.8));
      setOpacity(cad, seg(t, 3.6, 4.0));
      cadRows.forEach(function (g, k) { setOpacity(g, seg(t, 3.9 + k * 0.4, 4.3 + k * 0.4)); });
      setOpacity(fr, seg(t, 4.0, 4.4));
      meas.forEach(function (d, k) { setOpacity(d, seg(t, 4.6 + k * 0.08, 4.8 + k * 0.08)); });
      setOpacity(formula, seg(t, 7.0, 7.5));
      drawOn(fit, seg(t, 7.2, 8.6));
      setOpacity(fitLabG, seg(t, 8.4, 8.8));
      others.forEach(function (g, k) { setOpacity(g, seg(t, 10.5 + k * 0.6, 11.0 + k * 0.6)); });
      var on = t >= 13.4;
      setOpacity(probe, on ? 1 : 0); setOpacity(probeT, on ? 1 : 0);
      var q = 1.1 + 0.8 * Math.sin(now * 0.7), tq = frictionTorque(KNEE, q);
      moveDot(probe, [fx(q), fy(tq)]);
      probeT.setAttribute('x', fx(q).toFixed(1));
      probeT.setAttribute('y', (fy(tq) + 26).toFixed(1));
      probeT.setAttribute('text-anchor', 'middle');
      probeT.textContent = fmt(q, 2) + ' rad/s → ' + fmt(tq, 2) + ' N·m';
      setOpacity(ex, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: 随机化：硬件窄、环境宽 ── */
  function buildSceneDR() {
    var s = sceneSvg('左边是附录表 6 的随机化范围：硬件参数给得窄，地面摩擦、恢复系数这类环境参数给得宽；电机强度和 PD 增益划掉了，不随机化。右边是单关节玩具：按表 6 抽 40 组参数，阶跃响应挤成一条窄带；再加电机强度、PD 增益和 ±50% 质量，带子宽了约 7 倍');
    s.appendChild(svgText(30, 28, '第二步：硬件参数窄随机化，环境接触宽随机化（附录表 6）', 'demo-x-ink2', 13.5));
    var tab = group(s);
    rectBox(tab, 30, 44, 370, 268, C_BORDER, C_SURFACE2);
    var BX0 = 170, BX1 = 386;
    function bx(v) { return BX0 + ((v - 0.5) / 1.0) * (BX1 - BX0); }
    var hw = group(tab);
    hw.appendChild(paint(svgText(44, 64, '硬件：辨识得准 → 窄（相对名义值的倍数）', null, 10.5), C_GOOD));
    hline(hw, bx(1), 72, bx(1), 196, C_BORDER, 1, '3 3');
    [0.5, 1, 1.5].forEach(function (v) { hw.appendChild(svgText(bx(v), 206, '×' + v, 'demo-x-mut', 9, 'middle')); });
    var HW = [['连杆质量', DR.linkMass], ['关节摩擦', DR.jointFriction], ['转子惯量', DR.armature], ['机身质量 ±1 kg', [1 - 1 / TORSO_KG, 1 + 1 / TORSO_KG]]];
    var hwRows = HW.map(function (r, k) {
      var y = 80 + k * 26, g = group(hw);
      g.appendChild(svgText(BX0 - 8, y + 11, r[0], 'demo-x-ink2', 10.5, 'end'));
      var b = paint(svgEl('rect', { x: bx(r[1][0]), y: y + 2, width: 0, height: 12, rx: 2 }), C_GOOD);
      g.appendChild(b);
      return { g: g, b: b, w: bx(r[1][1]) - bx(r[1][0]) };
    });
    var zp = svgText(44, 196, '关节零位 ±0.05 rad', 'demo-x-ink2', 10.5);
    hw.appendChild(zp);
    var env = group(tab);
    env.appendChild(paint(svgText(44, 230, '环境：没法辨识 → 宽（绝对值）', null, 10.5), C_WARN));
    var EX0 = 170, EX1 = 386;
    function ex(v) { return EX0 + (v / 1.3) * (EX1 - EX0); }
    var envRows = [['地面摩擦', DR.friction], ['恢复系数', DR.restitution]].map(function (r, k) {
      var y = 240 + k * 24, g = group(env);
      g.appendChild(svgText(EX0 - 8, y + 11, r[0] + ' ' + r[1][0] + '–' + r[1][1], 'demo-x-ink2', 10.5, 'end'));
      var b = paint(svgEl('rect', { x: ex(r[1][0]), y: y + 2, width: 0, height: 12, rx: 2 }), C_WARN);
      g.appendChild(b);
      return { g: g, b: b, w: ex(r[1][1]) - ex(r[1][0]) };
    });
    [0, 0.5, 1].forEach(function (v) { env.appendChild(svgText(ex(v), 290, String(v), 'demo-x-mut', 9, 'middle')); });
    env.appendChild(svgText(44, 302, '再加外力推（代码：推速度随课程涨到 3 m/s）', 'demo-x-mut', 10));
    /* 下左：不随机化的 */
    var no = group(s);
    rectBox(no, 30, 324, 370, 80, C_BORDER, C_SURFACE);
    var nc = [chip(no, 44, 334, 110, '电机强度', C_BAD, { size: 11 }), chip(no, 164, 334, 110, 'PD 增益', C_BAD, { size: 11 })];
    var sk = [strike(no, 44, 334, 110, 28), strike(no, 164, 334, 110, 28)];
    no.appendChild(svgText(286, 352, '不属于这两类的', 'demo-x-ink2', 10));
    no.appendChild(svgText(286, 366, '笼统参数：不随机化', 'demo-x-ink2', 10));
    var noT = svgText(44, 392, '论文：这是近似执行器不确定性的「偷懒做法」，范围只能凭经验', 'demo-x-mut', 9.5);
    no.appendChild(noT);
    void nc;
    /* 右：玩具的两条带 */
    var toy = group(s);
    rectBox(toy, 416, 44, 354, 300, C_BORDER, C_SURFACE);
    toy.appendChild(svgText(430, 64, '玩具：膝关节阶跃，各抽 40 组参数', 'demo-x-ink2', 11));
    var PX0 = 450, PX1 = 756, PY0 = 312, PY1 = 120;
    function px(i) { return PX0 + ((i * TOY.every) / TOY.T) * (PX1 - PX0); }
    function py(v) { return PY0 - (v / 0.5) * (PY0 - PY1); }
    hline(toy, PX0, PY0, PX1, PY0, C_BORDER, 1);
    hline(toy, PX0, PY0, PX0, PY1, C_BORDER, 1);
    toy.appendChild(svgText(PX1, PY0 + 14, '0.4 s', 'demo-x-mut', 9.5, 'end'));
    toy.appendChild(svgText(PX0 - 4, PY1 + 4, '0.5', 'demo-x-mut', 9.5, 'end'));
    toy.appendChild(svgText(PX0 - 4, PY0, '0', 'demo-x-mut', 9.5, 'end'));
    function bandPath(bd, fx, fy) {
      var d = '';
      bd.hi.forEach(function (v, i) { d += (i ? ' L ' : 'M ') + fx(i).toFixed(1) + ' ' + fy(v).toFixed(1); });
      for (var i = bd.lo.length - 1; i >= 0; i--) d += ' L ' + fx(i).toFixed(1) + ' ' + fy(bd.lo[i]).toFixed(1);
      return d + ' Z';
    }
    var wideB = paint(svgEl('path', { d: bandPath(DR_WIDE, px, py), opacity: 0.38 }), C_WARN);
    var narrowB = paint(svgEl('path', { d: bandPath(DR_NARROW, px, py), opacity: 0.85 }), C_GOOD);
    toy.appendChild(wideB); toy.appendChild(narrowB);
    function linePts(arr, fx, fy, from) { var o = []; arr.forEach(function (v, i) { if (i >= (from || 0)) o.push([fx(i), fy(v)]); }); return o; }
    var real = pathLine(toy, linePts(TOY_NOM, px, py), C_ACCENT, 1.4);
    var bandLab = group(toy);
    bandLab.appendChild(paint(svgText(430, 84, '绿：按表 6 抽，最宽处 ' + fmt(DR_NARROW.width, 3) + ' rad', null, 10), C_GOOD));
    bandLab.appendChild(paint(svgText(430, 100, '橙：再加电机强度、PD 增益、±50% 质量：' + fmt(DR_WIDE.width, 3), null, 10), C_WARN));
    /* 放大镜：0.25–0.4 s，两条带和「真机」都在 0.36–0.45 rad 之间 */
    var zoom = group(toy);
    var ZX0 = 610, ZX1 = 756, ZY0 = 296, ZY1 = 196, ZA = 0.36, ZB = 0.45, I0 = Math.round(0.25 / TOY.every);
    rectBox(zoom, ZX0 - 6, ZY1 - 18, ZX1 - ZX0 + 12, ZY0 - ZY1 + 26, C_BORDER, C_SURFACE2);
    zoom.appendChild(svgText(ZX0, ZY1 - 5, '放大 0.25–0.4 s', 'demo-x-mut', 9.5));
    function zx(i) { return ZX0 + ((i - I0) / (DR_NARROW.lo.length - 1 - I0)) * (ZX1 - ZX0); }
    function zy(v) { return ZY0 - ((clamp(v, ZA, ZB) - ZA) / (ZB - ZA)) * (ZY0 - ZY1); }
    function bandPathZ(bd) {
      var d = '';
      for (var i = I0; i < bd.hi.length; i++) d += (i > I0 ? ' L ' : 'M ') + zx(i).toFixed(1) + ' ' + zy(bd.hi[i]).toFixed(1);
      for (var j = bd.lo.length - 1; j >= I0; j--) d += ' L ' + zx(j).toFixed(1) + ' ' + zy(bd.lo[j]).toFixed(1);
      return d + ' Z';
    }
    var zWide = paint(svgEl('path', { d: bandPathZ(DR_WIDE), opacity: 0.38 }), C_WARN);
    var zNarrow = paint(svgEl('path', { d: bandPathZ(DR_NARROW), opacity: 0.85 }), C_GOOD);
    zoom.appendChild(zWide); zoom.appendChild(zNarrow);
    pathLine(zoom, linePts(TOY_NOM, zx, zy, I0), C_ACCENT, 1.6);
    var off = pathLine(zoom, linePts(DR_REAL_OFF, zx, zy, I0), C_BAD, 2, '5 3');
    var offLab = paint(svgText(ZX1, ZY0 + 4, '摩擦大 20%：跑出绿带', null, 9.5, 'end'), C_BAD);
    zoom.appendChild(offLab);
    var ratio = paint(svgText(430, 330, '宽了约 ' + fmt(DR_RATIO, 1) + ' 倍（换 4 个种子：4.9–9.0 倍）', null, 10.5), C_WARN);
    toy.appendChild(ratio);
    var noise = group(s);
    rectBox(noise, 416, 356, 354, 48, C_BORDER, C_SURFACE2);
    noise.appendChild(svgText(430, 376, '另有 8 项观测噪声（±）：线速度 0.1、角速度 0.2、', 'demo-x-mut', 10));
    noise.appendChild(svgText(430, 394, '重力投影 0.05、关节角 0.03–0.08、关节角速度 1.5', 'demo-x-mut', 10));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(tab, seg(t, 0.3, 0.7));
      setOpacity(hw, seg(t, 0.3, 0.7));
      hwRows.forEach(function (r, k) { setOpacity(r.g, seg(t, 0.6 + k * 0.5, 1.0 + k * 0.5)); setW(r.b, r.w * ease(seg(t, 0.8 + k * 0.5, 1.4 + k * 0.5))); });
      setOpacity(zp, seg(t, 2.8, 3.2));
      setOpacity(env, seg(t, 3.6, 4.0));
      envRows.forEach(function (r, k) { setW(r.b, r.w * ease(seg(t, 3.9 + k * 0.6, 4.6 + k * 0.6))); });
      setOpacity(no, seg(t, 7.0, 7.4));
      sk.forEach(function (l, k) { setOpacity(l, seg(t, 7.8 + k * 0.4, 8.1 + k * 0.4)); });
      setOpacity(noT, seg(t, 8.8, 9.3));
      setOpacity(toy, seg(t, 10.4, 10.8));
      setOpacity(narrowB, seg(t, 10.8, 11.4));
      setOpacity(real, seg(t, 10.8, 11.4));
      setOpacity(wideB, seg(t, 11.6, 12.2));
      setOpacity(bandLab, seg(t, 12.0, 12.5));
      setOpacity(zoom, seg(t, 12.2, 12.6));
      setOpacity(zWide, seg(t, 12.2, 12.6));
      setOpacity(ratio, seg(t, 12.6, 13.1));
      var on = t >= 13.4;
      setOpacity(off, on ? 0.6 + 0.4 * Math.abs(Math.sin(now * 2)) : 0);
      setOpacity(offLab, seg(t, 13.6, 14.0));
      setOpacity(noise, seg(t, 14.6, 15.2));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 11: 走出实验室 ── */
  function buildSceneField() {
    var s = sceneSvg('左上：八种户外地面依次出现。中上：平均 20 度的陡土路，机器人倒着走上去。右上：机器人原地踏步，被踢一脚后晃一下又站稳。下面是长距离：校园里走 364 米，土路上连续爬了 96 米、爬升 10.5 米');
    s.appendChild(svgText(30, 28, '走出实验室：全向行走、8 种地面、陡土路、被踢、走几百米', 'demo-x-ink2', 13.5));
    var tiles = group(s);
    rectBox(tiles, 30, 44, 250, 226, C_BORDER, C_SURFACE2);
    tiles.appendChild(svgText(44, 64, '8 种户外地面（图 5a）', 'demo-x-ink2', 11));
    var TERR = [['草地', '#4f7a43'], ['砖人行道', '#9a5a46'], ['土路', '#8a6d4b'], ['沥青', '#4b4d52'], ['桥', '#7c6a58'], ['水泥路', '#8d8f91'], ['跑道', '#a8473f'], ['瓷砖', '#9fa6ad']];
    var tileG = TERR.map(function (tr, k) {
      var g = group(tiles), x = 44 + (k % 4) * 58, y = 76 + Math.floor(k / 4) * 70;
      var r = svgEl('rect', { x: x, y: y, width: 52, height: 44, rx: 5 });
      r.style.fill = tr[1];
      g.appendChild(r);
      g.appendChild(svgText(x + 26, y + 58, tr[0], 'demo-x-ink2', 9.5, 'middle'));
      return g;
    });
    var tileNote = svgText(44, 258, '还有台阶和坡；自搭 4 cm 碎石台阶 = 腿长 10%', 'demo-x-mut', 9.5);
    tiles.appendChild(tileNote);
    /* 中上：20° 土路，倒着走上去 */
    var slope = group(s);
    rectBox(slope, 296, 44, 230, 226, C_WARN, C_SURFACE);
    slope.appendChild(paint(svgText(310, 64, '平均 20° 的陡土路（图 5b）', null, 11), C_WARN));
    var TAN = Math.tan((FIELD.trailDeg * Math.PI) / 180), SX0 = 306, SX1 = 516, SY0 = 250;
    function gy(x) { return SY0 - (SX1 - x) * TAN; }
    pathLine(slope, [[SX0, gy(SX0)], [SX1, gy(SX1)], [SX1, SY0 + 6], [SX0, SY0 + 6]], C_BORDER, 1.4);
    var slopeBot = bhBody(slope, C_REAL, 150, { footPitch: Math.atan(TAN) }); // 面朝下坡，脚尖朝下贴着坡面
    slope.appendChild(svgText(310, 240 - 2, '比踝的上翘范围还陡：', 'demo-x-mut', 9.5));
    slope.appendChild(svgText(310, 254, '倒着走，脚才踩得实', 'demo-x-mut', 9.5));
    /* 右上：全向 + 被踢 */
    var kick = group(s);
    rectBox(kick, 542, 44, 228, 226, C_BORDER, C_SURFACE2);
    var kickTitle = svgText(556, 64, '全向行走（图 4）', 'demo-x-ink2', 11);
    kick.appendChild(kickTitle);
    var KG = 240, KM = 170;
    hline(kick, 556, KG, 756, KG, C_BORDER, 1.4);
    var kickBot = bhBody(kick, C_REAL, KM);
    var dirLab = paint(svgText(756, 84, '', null, 10.5, 'end'), C_ACCENT);
    kick.appendChild(dirLab);
    var foot = paint(svgEl('path', { d: '', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }), null, C_BAD);
    kick.appendChild(foot);
    /* 下：长距离 */
    var far = group(s);
    rectBox(far, 30, 282, 740, 122, C_BORDER, C_SURFACE);
    far.appendChild(svgText(44, 302, '长距离（图 7）', 'demo-x-ink2', 11));
    var route = [];
    for (var i = 0; i <= 80; i++) { var u = i / 80; route.push([60 + u * 420, 350 + 26 * Math.sin(u * 7.2) * Math.exp(-u * 0.6) - 10 * u]); }
    var routeP = pathLine(far, route, C_ACCENT, 2.4);
    var walker = dotAt(far, 60, 350, 5, C_REAL);
    var cnt1 = paint(svgText(500, 330, '', null, 12), C_ACCENT);
    far.appendChild(cnt1);
    far.appendChild(svgText(500, 350, '校园里自由走 10 分钟，有上坡下坡', 'demo-x-mut', 10));
    var trail = group(far);
    trail.appendChild(paint(svgText(500, 376, '土路连续爬 5 分钟以上：96 m，爬升 10.5 m', null, 11), C_WARN));
    trail.appendChild(svgText(44, 394, '路线是示意', 'demo-x-mut', 9));
    /* 踢：从第 4 段开头按真实时间算（见 sinceCue），第一脚在 0.8 s 后；脚先伸过来、碰到躯干背面才开始推 */
    var kick0 = { v: null }, KC = 0.12, KP = 0.25;

    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* 第 1 段：全向行走（前进 / 后退 / 横走 / 原地转，按真实时间轮换） */
      setOpacity(kick, seg(t, 0.3, 0.8));
      /* 侧视里只看得出前后：前进时支撑脚往后滑、后退时往前滑；横走和原地转在侧视里就是原地踏步。
         半步长 S 在换命令后 0.5 s 内过渡（treadmill 的脚位置对 S 是线性的，脚不会跳） */
      var DIRS = ['前进', '后退', '横走（侧视里原地踏步）', '原地转（侧视里原地踏步）'], SS = [13, -13, 0, 0];
      var kickOn = t >= 10.4;
      kickTitle.textContent = kickOn ? '踢一脚，几步就恢复（图 6）' : '全向行走（图 4）';
      var cc = now / 2.5, ci = Math.floor(cc) % 4, cp = (ci + 3) % 4;
      dirLab.textContent = kickOn ? '' : '命令：' + DIRS[ci];
      var S = (SS[cp] + (SS[ci] - SS[cp]) * ease(Math.min(1, ((cc - Math.floor(cc)) * 2.5) / 0.5))) * (1 - seg(t, 10.4, 10.9));
      var lean = 0, tip = null;
      var kt = sinceCue(kick0, t, clock, now, 10.4, 3.0);
      if (kt >= 0) {
        var ph = (((kt - 0.8) % 3.2) + 3.2) % 3.2, tl = ph - KC;
        lean = tl < 0 ? 0 : tl < KP ? (0.5 * tl) / KP : 0.5 * Math.exp(-(tl - KP) * 2.2) * Math.cos((tl - KP) * 5);
        /* 踢的脚尖：先伸到躯干背面（y = 156，髋上方 10.9 px，躯干半宽 17 px），推的时候贴着背面走，推完 0.1 s 收回 */
        var back = 650 + 30 * lean - 17 / Math.cos(lean) + 10.9 * Math.tan(lean);
        if (ph < KC) tip = 596 + (37 * ph) / KC;
        else if (tl < KP) tip = back;
        else if (tl < KP + 0.1) tip = 651.6 - (50 * (tl - KP)) / 0.1;
      }
      /* 被踢时原地踏步：脚的中心不动，躯干被推开再回来 */
      kickBot.put(650 + 30 * lean, KG - LEG.hipH * KM, lean, treadmill(now, 650, KG, S, 1.0, 8));
      foot.setAttribute('d', tip != null ? 'M ' + (tip - 36).toFixed(1) + ' 150 L ' + tip.toFixed(1) + ' 156' : '');
      setOpacity(tiles, seg(t, 3.6, 4.0));
      tileG.forEach(function (g, k) { setOpacity(g, seg(t, 3.8 + k * 0.35, 4.2 + k * 0.35)); });
      setOpacity(tileNote, seg(t, 7.6, 8.2));
      setOpacity(slope, seg(t, 7.0, 7.5));
      /* 6 个整步一循环（步态相位接得上），循环头尾 0.3 s 淡出淡入，免得机器人一帧从坡上跳回坡底 */
      var period = 1.3, cyc = 6 * period, lc = (((now - 7.0) % cyc) + cyc) % cyc; // 网页里第 3 段开头从坡底起步
      var w = worldGait(lc, 470, -1, 30, period, 7, gy);
      slopeBot.put(w.x, gy(w.x) - LEG.hipH * 150, 0.05, w.feet);
      setOpacity(slopeBot.g, Math.min(1, lc / 0.3, (cyc - lc) / 0.3));
      setOpacity(far, seg(t, 13.4, 13.9));
      var u2 = ease(seg(t, 13.4, 16.8)); // 一次走完 364 m 并停在那里
      drawOn(routeP, u2);
      var pt = route[Math.min(80, Math.round(u2 * 80))];
      moveDot(walker, pt);
      cnt1.textContent = Math.round(u2 * FIELD.campusM) + ' m / ' + FIELD.campusM + ' m';
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 仿真和真机差多少 ── */
  /* 图 8 的命令按图的形状画（示意，不是逐点读出来的）：先往前、再往后、再往前；左右方向晚一点 */
  var FIG8_CMD = { vx: [[0, 0], [5, 0.5], [10.5, 0], [12, -0.5], [16.5, 0], [21, 0.5], [27, 0], [50, 0]], vy: [[0, 0], [15, 0.4], [18, 0], [33, -0.5], [36.5, 0], [41, 0.5], [44, 0], [50, 0]] };
  function cmdAt(seq, tt) {
    var v = 0;
    seq.forEach(function (p) { if (tt >= p[0]) v = p[1]; });
    return v;
  }
  function buildSceneSim2Real() {
    var s = sceneSvg('左上是图 8 的示意：操作员给的速度命令是阶梯，仿真和真机的速度都跟着走，真机抖得多一点。右上的柱子是 60 秒的平均跟踪误差：前后方向 0.051 对 0.058，左右方向 0.086 对 0.1156。左下是双腿跳和单腿跳，右下是局限');
    s.appendChild(svgText(30, 28, '仿真和真机差多少：同一个策略，跟踪误差只差一点', 'demo-x-ink2', 13.5));
    var fig = group(s);
    rectBox(fig, 30, 44, 470, 196, C_BORDER, C_SURFACE);
    fig.appendChild(svgText(44, 64, '图 8（示意）：随手给的速度命令', 'demo-x-ink2', 11));
    var X0 = 80, X1 = 488, ROWS = [['vx', 108, '前后'], ['vy', 182, '左右']];
    function xx(tt) { return X0 + (tt / 50) * (X1 - X0); }
    var lines = ROWS.map(function (r, k) {
      var yc = r[1], A = 28;
      hline(fig, X0, yc, X1, yc, C_BORDER, 1);
      fig.appendChild(svgText(X0 - 8, yc + 4, r[2], 'demo-x-mut', 10, 'end'));
      /* 示意：两条线共用迈步带来的摆动 w，真机再加噪声；参数取成平均误差和右边的柱子一致（前后 0.051 / 0.059、左右 0.087 / 0.116） */
      var PAR = { vx: [0.04, 0.04], vy: [0.11, 0.32] }[r[0]];
      var cmd = [], sim = [], real = [], vs = 0, vr = 0, rng = mulberry32(5 + k);
      for (var i = 0; i <= 500; i++) {
        var tt = i * 0.1, c = cmdAt(FIG8_CMD[r[0]], tt);
        cmd.push([xx(tt), yc - (c / 0.5) * A]);
        vs += (c - vs) * 0.16; vr += (c - vr) * 0.13;
        var w = PAR[0] * Math.sin(i * 1.7);
        sim.push([xx(tt), yc - ((vs + w) / 0.5) * A]);
        real.push([xx(tt), yc - ((vr + w + PAR[1] * (rng() - 0.5)) / 0.5) * A]);
      }
      return { c: pathLine(fig, cmd, C_MUTED, 1.6, '4 3'), s: pathLine(fig, sim, C_SIM, 1.8), r: pathLine(fig, real, C_REAL, 1.4) };
    });
    fig.appendChild(svgText(X1, 232, '0–50 s；蓝：Isaac Lab　橙：真机　灰：命令', 'demo-x-mut', 9.5, 'end'));
    /* 右上：误差柱 */
    var err = group(s);
    rectBox(err, 516, 44, 254, 196, C_BORDER, C_SURFACE2);
    err.appendChild(svgText(530, 64, '60 秒平均跟踪误差（m/s）', 'demo-x-ink2', 11));
    var EB = 196, ES = 950, bars = [];
    [['前后', SIM2REAL.vx], ['左右', SIM2REAL.vy]].forEach(function (g, k) {
      var x = 560 + k * 110;
      [0, 1].forEach(function (j) {
        var b = vbar(err, x + j * 34, EB, 28, j ? C_REAL : C_SIM);
        var v = svgText(x + j * 34 + 14, 0, String(g[1][j]), 'demo-x-ink2', 10, 'middle');
        err.appendChild(v);
        bars.push({ b: b, v: v, h: g[1][j] * ES });
      });
      err.appendChild(svgText(x + 31, EB + 16, g[0], 'demo-x-mut', 10, 'middle'));
    });
    var diff = group(err);
    diff.appendChild(svgText(643, 230, '真机只多 0.007 和 0.030', 'demo-x-acc', 10.5, 'middle'));
    /* 左下：跳 */
    var hop = group(s);
    rectBox(hop, 30, 252, 370, 152, C_BORDER, C_SURFACE2);
    hop.appendChild(svgText(44, 270, '只改奖励：双腿跳、单腿跳（图 9）', 'demo-x-ink2', 11));
    var HG = 394, HM = 100;
    hline(hop, 44, HG, 386, HG, C_BORDER, 1.4);
    var hop2 = bhBody(hop, C_REAL, HM), hop1 = bhBody(hop, C_REAL, HM);
    var rope = pathLine(hop, [], C_MUTED, 1.2, '3 3'), ROPE = 44; // 安全绳长度不变，松的时候弯下来
    var fly = [paint(svgText(200, 330, '腾空', null, 10.5), C_GOOD), paint(svgText(350, 330, '腾空', null, 10.5), C_GOOD)];
    fly.forEach(function (n) { hop.appendChild(n); });
    hop.appendChild(svgText(386, 270, '单腿跳挂安全绳，绳大多是松的', 'demo-x-mut', 9.5, 'end'));
    /* 右下：局限 */
    var lim = group(s);
    rectBox(lim, 416, 252, 354, 152, C_BAD, C_SURFACE);
    lim.appendChild(paint(svgText(430, 272, '局限（第 6 节）', null, 11), C_BAD));
    var limRows = ['没装手臂；运动范围、背隙、重量与强度还要迭代', '接近饱和时电流—力矩的非线性没辨识', '电机工作区、过热保护还没进仿真'].map(function (str, k) {
      var g = group(lim);
      g.appendChild(svgText(430, 296 + k * 22, '· ' + str, 'demo-x-ink2', 10));
      return g;
    });
    var after = group(lim);
    after.appendChild(paint(svgText(430, 376, '之后：LCP 等研究拿它当平台（ICRA 版）', null, 10.5), C_GOOD));
    after.appendChild(svgText(430, 394, '同组 2025 年又做了 3D 打印的 Berkeley Humanoid Lite', 'demo-x-mut', 9.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(fig, seg(t, 0.3, 0.7));
      lines.forEach(function (l, k) { var u = seg(t, 0.6 + k * 0.4, 3.2); drawOn(l.c, u); drawOn(l.s, u); drawOn(l.r, u); });
      setOpacity(err, seg(t, 3.6, 4.0));
      bars.forEach(function (b, k) {
        var h = b.h * ease(seg(t, 3.9 + k * 0.4, 4.6 + k * 0.4));
        setH(b.b, h);
        b.v.setAttribute('y', (EB - h - 5).toFixed(1));
        setOpacity(b.v, seg(t, 4.4 + k * 0.4, 4.8 + k * 0.4));
      });
      setOpacity(diff, seg(t, 6.0, 6.6));
      setOpacity(hop, seg(t, 7.0, 7.5));
      /* 跳：落地缓冲和下一次蹬地是同一次下蹲（半个正弦，深 0.07 m）；腾空 0.26 s 走抛物线（只受重力）。
         起跳、落地的速度都是 g·Tf/2 ≈ 1.28 m/s，两边接得上；最高约 8 cm，下蹲时向上的最大加速度 VJ²/CA ≈ 2.4 g（我们算的） */
      var TF = 0.26, CA = 0.07, VJ = (G * TF) / 2, TS = (CA * Math.PI) / VJ, PJ = TS + TF, HJ = (G * TF * TF) / 8;
      function jump(ph) {
        var tt = ((ph % PJ) + PJ) % PJ;
        if (tt < TS) return { y: 0, crouch: CA * Math.sin((Math.PI * tt) / TS), air: false };
        var s = (tt - TS) / TF;
        return { y: 4 * HJ * HM * s * (1 - s), crouch: 0, air: true, s: s };
      }
      var j2 = jump(now), j1 = jump(now + 0.2);
      var hy2 = HG - (LEG.hipH - j2.crouch) * HM - j2.y;
      hop2.put(150, hy2, 0.06, [[150 + 6, HG - j2.y], [150 - 4, HG - j2.y]]);
      var hy1 = HG - (LEG.hipH - j1.crouch) * HM - j1.y;
      hop1.put(300, hy1, 0.06, [[300 + 4, HG - j1.y], [300 - 24, HG - j1.y - 22]]); // 收起的腿膝弯 94–106°，在 KFE 的 120° 以内
      var rTop = hy1 - LEG.torsoH * HM - 6, span = rTop - 278, sag = Math.sqrt(Math.max(0, ROPE * ROPE - span * span)) / 2;
      rope.setAttribute('d', 'M 300 278 Q ' + (300 + sag).toFixed(1) + ' ' + ((278 + rTop) / 2).toFixed(1) + ' 300 ' + rTop.toFixed(1));
      function flyA(j) { return 0.4 + 0.6 * (j.air ? Math.sin(Math.PI * j.s) : 0); }
      setOpacity(fly[0], flyA(j2));
      setOpacity(fly[1], flyA(j1));
      setOpacity(lim, seg(t, 10.4, 10.8));
      limRows.forEach(function (g, k) { setOpacity(g, seg(t, 10.6 + k * 0.7, 11.0 + k * 0.7)); });
      setOpacity(after, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  var BH_SCENES = [
    {
      title: '仿真里学会，真机上走不好',
      dur: 17,
      build: buildSceneGap,
      cues: [
        { at: 0.3, s: '主流做法：在 GPU 仿真里用强化学习训练，再零样本搬到真机。同一个策略，仿真里走得稳，真机上就晃。' },
        { at: 3.6, s: '差距主要来自三处（第 4.2 节）：**建模误差**（弹簧、闭链、复杂传动）、**指令执行**的频率、精度和延迟，再加上传感器噪声。' },
        { at: 7.0, s: '常见补法在算法这边：大范围域随机化（「电机强度」、PD 增益）、观测历史在线辨识、教师—学生。随机化太宽会让训练变慢、策略变保守。' },
        { at: 10.4, s: '这篇反过来，从**硬件**上把差距做小：仿真友好、可靠便宜、好做实验、拟人——第 3 节的四条设计考量。' },
        { at: 13.4, s: '为了证明差距真是硬件做小的，控制器只用最简的 MLP + PPO（MLP 即多层感知机：几层全连接的神经网络，输入当下的观测直接出动作）：没有观测历史、没有相位信号、没有参考动作。' }
      ]
    },
    {
      title: '一台 5 岁孩子大小的人形',
      dur: 17,
      build: buildSceneSize,
      cues: [
        { at: 0.3, s: '**16 kg**、全电驱；两条 6 自由度的腿，大腿 0.22 m、小腿 0.18 m，站立高约 **0.85 m**，身材像 5 岁孩子（第 3.1 节）。' },
        { at: 3.6, s: '表 1 里的全尺寸人形 35–132 kg：要吊架、两三个人才搬得动；关节力矩约 300 N·m，旁边的人有受重伤的风险（第 3.4 节）。' },
        { at: 7.0, s: '16 kg 一个人就能搬，摔了也不伤环境；论文全部实验都只用 1 个操作员，户外再加 1 个摄影。' },
        { at: 10.4, s: '可小个子更难控：质心低、又轻，一点力就推得动；腿短、步子小，要更快地换脚，执行器就得又快又准。' },
        { at: 13.4, s: '价格：不含手臂约 **1 万美元**（两条 4 自由度手臂加 6 kg、5 千美元）；表 1 里 H1 9 万、Digit 和 Cassie 25 万、G1 1.6 万。' }
      ]
    },
    {
      title: '仿真友好：执行器直接当关节',
      dur: 17,
      build: buildSceneSimFriendly,
      cues: [
        { at: 0.3, s: '主流的学习方法靠大规模并行仿真，所以**仿真代价**是硬件设计时就要考虑的事（第 3.2 节）。' },
        { at: 3.6, s: '带单向弹簧的连杆能减负、吸冲击，但要多解动力学方程；闭链在仿真里要额外算约束；转子惯量、摩擦这些传动因素很难映射到关节空间、也难随机化。' },
        { at: 7.0, s: '这台去掉弹簧、阻尼和闭链：执行器自带交叉滚子轴承，**装上就是关节**。唯一例外是踝屈伸 FFE 走连杆，但它和膝 KFE 的映射是线性的，仍当关节处理。' },
        { at: 10.4, s: '转子惯量折算到关节乘减速比的平方：$I_{\\text{arm}} = N^2 I_{\\text{rotor}}$，9:1 就是 ×81。膝的 10413 折算后 0.01215 kg·m²，是小腿加脚绕膝惯量的 **42%**（按 URDF 算）。' },
        { at: 13.4, s: '再配上 9:1 行星减速的准直驱（摩擦小，好在关节空间建模），英伟达 A4500 上每秒能跑 9 万多步仿真。' }
      ]
    },
    {
      title: '四种自研执行器（表 2）',
      dur: 17,
      build: buildSceneActuators,
      cues: [
        { at: 0.3, s: '12 个执行器分 4 种，按电机尺寸命名：5013、8513、8518、10413；减速比都是 9:1，行星减速，驱动器集成在执行器上。' },
        { at: 3.6, s: '峰值力矩 9.7、45.3、62.6、**81.1** N·m；持续力矩约是峰值的四成多（4.59、18.9、26.1、34.2）。最重的 10413 也只有 1011 g。' },
        { at: 7.0, s: '分工（ICRA 版表 II、开源代码）：膝 KFE 用最大的 10413，髋屈伸 HFE 用 8518，髋旋转、髋外展和踝屈伸用 8513，踝内外翻用最小的 5013。' },
        { at: 10.4, s: '除 5013 外都是**空心轴**：电源线和通信线从关节轴心穿过去，关节怎么转都不磨、不扯线（第 3.3 节）。' },
        { at: 13.4, s: '开源训练代码把力矩上限压到 20 / 30 / 30 / 20 / 5 N·m，比表 2 的峰值低得多；README 说是出于安全。' }
      ]
    },
    {
      title: 'EtherCAT：延迟小到不用仿真',
      dur: 17,
      build: buildSceneTiming,
      cues: [
        { at: 0.3, s: '第二类差距是**指令执行**：频率准不准、力矩准不准、延迟多大。仿真要模拟通信延迟、电机动力学，就得更小的步长、更多算力。' },
        { at: 3.6, s: '这台全用 EtherCAT：自研的驱动器和 IMU 都是从站，机载电脑跑主站，通信频率 1–4 kHz。' },
        { at: 7.0, s: '最大延迟 0.5–2 ms：1 kHz 时 2 ms、4 kHz 时 0.5 ms（脚注 1）。对 50 Hz 的策略，一拍 20 ms，延迟只占 10% 和 2.5%。' },
        { at: 10.4, s: '电机力矩环带宽 1 kHz；PD 在驱动器上以 **25 kHz** 本地闭环，状态估计 1 kHz，策略每 20 ms 只发一次目标关节角。' },
        { at: 13.4, s: '于是仿真里把执行器当成**没有延迟的力矩源**：开源代码的物理步长 5 ms，每 4 步出一次动作，正好 50 Hz。' }
      ]
    },
    {
      title: '可靠又便宜：1 万美元、摔了 38 次',
      dur: 17,
      build: buildSceneReliable,
      cues: [
        { at: 0.3, s: '可靠：主体用 7075、6061 铝合金，齿轮箱和连杆用 SKD11 钢；线缆走空心轴，关节反复转也不磨（第 3.3 节）。' },
        { at: 3.6, s: '准直驱执行器可以用电流估关节力矩，不加应变片；再用广义动量观测器估脚底接触力，接触传感器和六维力传感器都省了。' },
        { at: 7.0, s: '便宜（表 3）：不含手臂 **9955 美元**，执行器 6894 美元、约占七成。IMU 用手机级的 ICM42688：芯片不到 1 美元，模块 50 美元；以往常用约 1000 美元的。' },
        { at: 10.4, s: '敢用便宜传感器，是因为学习算法对传感器误差更鲁棒；只有电脑（i7-1255U）和电池（DJI TB50）是买来的。' },
        { at: 13.4, s: '整个项目摔了 **38 次**（附录表 4：石砖路 6、草地 14、跑道 3、土路 15），硬件只坏过 2 次——螺丝松、胶开；多数 3–5 秒就扶起来接着跑。' }
      ]
    },
    {
      title: '拟人的腿：每条 6 个自由度',
      dur: 17,
      build: buildSceneAnthro,
      cues: [
        { at: 0.3, s: '人腿的主要自由度，加上脚底面接触的 6 维力旋量 → 每条腿 6 个自由度：髋 3 个（旋转 HR、外展 HAA、屈伸 HFE）、膝 1 个、踝 2 个（屈伸 FFE、内外翻 FAA）。' },
        { at: 3.6, s: '比起表 1 里每腿 5 个自由度的 H1、Cassie、MIT、HECTOR，多出的是**踝的横滚**：难的静止姿态更稳，也有可能单脚站。' },
        { at: 7.0, s: '每个关节的限位尽量贴人体（附录表 5）：既保护硬件，又给模仿人的动作留够范围。' },
        { at: 10.4, s: '覆盖率 = 重叠角度 / 人的范围：$c = |R \\cap H| / |H|$。髋外展 [−35°, 35°] 对人的 [−40°, 20°] 重叠 55°，55/60 = 91.7%（论文写 91.6%）。' },
        { at: 13.4, s: '踝的两个方向都是 100%，髋旋转最少，77.8%。ICRA 版补了一句：拟人，才能直接从人类动作里学。' }
      ]
    },
    {
      title: '最简的强化学习控制器',
      dur: 17,
      build: buildScenePolicy,
      cues: [
        { at: 0.3, s: '观测只有**当下这一拍**（第 4.1 节）：机身角速度、重力投影、关节角和角速度、状态估计给的机身线速度、速度命令、上一步动作。' },
        { at: 3.6, s: '按开源代码数一共 **48 维**；机身线速度来自 1 kHz 的状态估计器，仿真里用真值加 ±0.1 m/s 噪声。' },
        { at: 7.0, s: '不要观测历史和教师—学生（在线辨识环境参数的手段），也不要相位信号和参考动作（减少人为偏置）——策略既没法在线辨识，也没有参考动作引导，只能靠仿真本身够准。' },
        { at: 10.4, s: 'Actor 和 critic 都是 512-256-128 的 MLP、ELU 激活，PPO 在 Isaac Lab 里训；输出 12 个目标关节角，由驱动器上的 PD 变成力矩：$\\tau = K_p(q_d - q) - K_d\\dot q$。' },
        { at: 13.4, s: '奖励四组（附录 A）：跟踪速度；惩罚竖直速度、横滚俯仰角速度、力矩和动作变化；髋膝偏离、机身竖直与关节软限位；腾空时间、不打滑、接触力不过阈值。' }
      ]
    },
    {
      title: '辨识：转子惯量与摩擦',
      dur: 17,
      build: buildSceneIdentify,
      cues: [
        { at: 0.3, s: '第 4.2 节把不确定性分两类：**机器人自己的物理参数**（比如每节连杆多重），和**执行任务时与环境的接触**。' },
        { at: 3.6, s: '自研的好处：转子惯量直接从 CAD 读，乘 81 折算到关节；每个执行器的摩擦用简单实验单独测。商用机器人很难拿到这么细的参数。' },
        { at: 7.0, s: '开源代码里的摩擦模型：库仑（滑动）摩擦 $F_s$ 用 tanh 平滑过零点，再加与速度成正比的黏性摩擦 $F_d\\dot q$（代码变量名 `friction_static` / `friction_dynamic`）：$\\tau_f = F_s\\tanh(\\dot q/v_a) + F_d\\dot q$，$v_a = 0.1$ rad/s。' },
        { at: 10.4, s: '各关节的库仑摩擦 $F_s$：膝 KFE 0.8 N·m、踝屈伸 FFE 1.0、髋 0.3、踝内外翻 0.1。代码 README 说电机齿槽力矩大，一并算进了摩擦。' },
        { at: 13.4, s: '例：膝以 1 rad/s 转，摩擦约 0.8 + 0.02 = **0.82 N·m**；模型在 0.05 rad/s 只给 0.37——这是 tanh 平滑过零的过渡段，不是测出来的。论文没写测法，这些数只在代码里。' }
      ]
    },
    {
      title: '随机化：硬件窄、环境宽',
      dur: 17,
      build: buildSceneDR,
      cues: [
        { at: 0.3, s: '硬件参数辨识得准，范围就给窄（附录表 6）：连杆质量 ×0.9–1.1、关节摩擦 ×0.9–1.1、转子惯量 ×1–1.05、机身质量 ±1 kg、关节零位 ±0.05 rad。' },
        { at: 3.6, s: '环境接触没法辨识，就给宽：地面摩擦系数 0.2–1.25、恢复系数 0–0.1，再加外力推（开源代码里推的速度随课程涨到 3 m/s）。' },
        { at: 7.0, s: '不属于这两类、对不上具体物理量的笼统参数不随机化：「电机强度」比例、PD 增益。论文说这是近似执行器不确定性的「偷懒做法」，范围只能凭经验，常常给得过大。' },
        { at: 10.4, s: '单关节玩具：按表 6 抽 40 组参数，阶跃响应挤成一条窄带；再加电机强度、PD 增益、±50% 质量，带子宽了约 **7 倍**（换种子 4.9–9.0 倍）。' },
        { at: 13.4, s: '窄的前提是**辨识得准**：真机摩擦若比辨识值大 20%，窄带就套不住了。另有 8 项观测噪声，比如关节角速度 ±1.5 rad/s。' }
      ]
    },
    {
      title: '走出实验室：地形、扰动、长距离',
      dur: 17,
      build: buildSceneField,
      cues: [
        { at: 0.3, s: '全向行走：跟踪前后、左右的线速度和偏航角速度命令；实验室里前进、原地转、后退，户外前进、横走（图 4）。' },
        { at: 3.6, s: '8 种户外地面：草地、砖人行道、土路、沥青、桥、水泥路、跑道、瓷砖，还有台阶和坡（图 5a）。' },
        { at: 7.0, s: '最难的是平均 **20°** 的陡窄土路：比踝的上翘范围还陡，只好倒着走、把脚踩实。高低错落的石板路、自搭的 4 cm 碎石台阶（腿长的 10%）也能走、能转弯。' },
        { at: 10.4, s: '原地踏步时踢它身上不同部位，几步之内就恢复；户外草地上从侧面踢也一样（图 6）。' },
        { at: 13.4, s: '长距离：校园里自由走 10 分钟、**364 m**，有上坡下坡（图 7）；在图 5b 那片土路地形上连续爬 5 分钟以上、96 m、爬升 10.5 m。' }
      ]
    },
    {
      title: '仿真和真机差多少：图 8、单腿跳与局限',
      dur: 17,
      build: buildSceneSim2Real,
      cues: [
        { at: 0.3, s: '定量：操作员随手给速度命令，同一个策略在 Isaac Lab 和真机上各跑 60 秒，比平均跟踪误差（图 8）。' },
        { at: 3.6, s: '前后方向：仿真 **0.051**、真机 **0.058** m/s；左右方向：0.086 对 0.1156。策略看不到历史、没法在线辨识，差这么一点，说明两边的 MDP 本来就接近。' },
        { at: 7.0, s: '只改奖励（向上的速度给奖励、放开髋膝的限制），同样的设置训出**双腿跳和单腿跳**，有明显腾空；单腿跳挂了安全绳，绳大多是松的（图 9、附录 A.2）。' },
        { at: 10.4, s: '局限（第 6 节）：没装手臂；运动范围、背隙、重量和强度还要迭代；接近饱和时电流—力矩的非线性没辨识，电机工作区和过热保护还没进仿真。' },
        { at: 13.4, s: '之后：ICRA 版说已有 LCP 等研究拿它当平台；同组 2025 年又做了开源、3D 打印的 Berkeley Humanoid Lite。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十二幕动画：Berkeley Humanoid 全流程速览',
      sub: '约 204 秒自动播放。空格播放/暂停，← → 换幕；论文数字照抄 arXiv v1 与附录表，开源代码与 URDF 的数单独标出；第 3、10 幕的单关节玩具与下面三个演示、笔记「具体实例」用的是同一份数。',
      ariaLabel: 'Berkeley Humanoid 十二幕讲解动画',
      notes: [
        '取数依据：第 1、2、5、6、11、12 幕照抄论文第 3–6 节与表 1、3、4（arXiv 2407.21781 v1；ICRA 2025 版数字相同）；第 4 幕照抄表 2，「关节」分工取自 ICRA 版表 II；第 7 幕照抄附录表 5；第 10 幕照抄附录表 6。' +
          '第 4 幕的力矩上限、第 5 幕的 5 ms 物理步长、第 8 幕的 48 维观测、第 9 幕的摩擦参数、第 10 幕的推力课程取自开源代码 `isaac_berkeley_humanoid`；第 3 幕的 0.0288 kg·m² 按开源 URDF 算（小腿加踝两段绕膝）。',
        '**示意与玩具**：机器人侧视图按图 2b 的尺寸画（大腿 0.22、小腿 0.18、踝高 0.06、脚长 0.16 m），走路、摔倒、跳是示意；第 2 幕的单摆、第 5 幕「延迟 = 2 个通信周期」、第 7 幕的 91.67% 是我们算的；第 3、10 幕是单关节玩具（URDF 的小腿 + 代码的 PD 与摩擦），不是论文的仿真；第 11 幕的路线、第 12 幕图 8 的曲线按图的形状画，不是逐点读数。真机图取自 Robot_Description_Gallery（按 HybridRobotics 的开源 URDF 渲染）。'
      ],
      scenes: BH_SCENES
    });
  }

  // ─── the narrated vertical video of the same twelve scenes ─────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：Berkeley Humanoid 十二幕全流程',
      sub: '11 分 16 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十二幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '12.1 MB',
      fileName: 'Berkeley_Humanoid_讲解视频.mp4'
    });
  }

  K.mount({
    'bh-explainer': buildExplainerDemo,
    'bh-video': buildVideoDemo,
    'bh-armature': buildArmatureDemo,
    'bh-actuator': buildActuatorDemo,
    'bh-dr': buildDrDemo
  });
})();
