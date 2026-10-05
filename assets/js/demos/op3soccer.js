/* Interactive demos for papers/03_High_Impact_Selection/
 * Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL
 * （Haarnoja, Moran, Lever, Huang 等 · Google DeepMind · Science Robotics 2024，Robotis OP3 · 1 对 1 足球）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["op3soccer"]`, after assets/js/demos/kit.js. The note itself may
 * only contain empty placeholders, because scripts/sanitize_paper_html.py
 * strips <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   soccer-explainer — 十二幕讲解动画：为什么是足球 → 一步控制 → 踢球教师 → 起身教师 → 按状态蒸馏与 λ →
 *                      自博弈 → 奖励与安全正则 → 零样本上真机 → 对比脚本控制器 → 定位球与对手意识 →
 *                      行为嵌入与价值函数 → 局限与之后
 *   soccer-video     — 同一套十二幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   soccer-filter    — 指数动作滤波 u_t = 0.8 u_{t-1} + 0.2 a_t：阶跃响应、40 Hz 下的频率响应
 *   soccer-lambda    — 式 3 的 λ 自动开关：预测回报低于阈值就模仿教师，超过就放手（玩具曲线）
 *   soccer-pool      — 自博弈对手池：前 1/4 快照 + 一个未训练对手，对比图 7 的「全部快照」
 */

(function () {
  'use strict';

  var K = window.PaperDemoKit;
  var fmt = K.fmt,
    clamp = K.clamp,
    card = K.card,
    controlsRow = K.controlsRow,
    slider = K.slider,
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
    registerRenderer = K.registerRenderer,
    svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    paint = K.paint,
    seg = K.seg,
    ease = K.ease,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
    polyPath = K.polyPath,
    mulberry32 = K.mulberry32;

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_MUTED = X.muted,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2,
    C_INK = X.ink;

  // ─── 论文里的数字（arXiv 2304.13653 v2 = Science Robotics 2024 的作者版） ───
  /* 正文与补充材料表 S1–S5 照抄；图 4、图 6、图 7 没有数值表，那几处只画走势。
     十二幕动画、三个演示与笔记「🚶 具体实例」共用这一份。 */
  var OP3_CM = 51, OP3_KG = 3.5, JOINTS = 20; // §Robot Hardware：51 cm、3.5 kg、20 个 XM430-350-R
  var HZ = 40, DT = 1 / HZ; // §Environment：策略 40 Hz，一步 25 ms
  var FILTER_A = 0.8; // §Environment：u_t = 0.8 u_{t-1} + 0.2 a_t
  var PITCH_L = 5, PITCH_W = 4, GOAL_W = 0.8; // §Environment：5 m × 4 m，球门宽 0.8 m
  var OBS = [
    // 表 S2：名称 / 堆叠帧数 / 每帧维度 / 本体（p）还是比赛状态（g）
    ['关节位置', 5, 20, 'p'], ['线加速度', 5, 3, 'p'], ['角速度', 5, 3, 'p'], ['重力方向', 5, 3, 'p'], ['上一步动作', 5, 20, 'p'],
    ['球', 1, 2, 'g'], ['对手', 1, 2, 'g'], ['己方球门', 1, 2, 'g'], ['对方球门', 1, 2, 'g'],
    ['自身速度', 5, 2, 'g'], ['球速度', 1, 2, 'g'], ['对手速度', 1, 2, 'g']
  ];
  var ACTOR = [256, 256, 128], CRITIC = [400, 400, 400, 300]; // 表 S4
  var KEY_POSES = 3, GETUP_MEAN = 1.5, EP_SEC = 50; // §Get-Up Skill Training、§Soccer Skill Training
  var REWARDS = [
    // 表 S3：名称 / 类型 / 踢球技能 / 起身技能 / 完整 1v1 智能体的权重（null 是表里的「—」）
    ['进球', 'task', 1000, null, 1000],
    ['失球', 'task', 0, null, 1000],
    ['朝球速度', 'shape', 0.05, null, 0.05],
    ['前进速度', 'shape', 0.1, null, 0.1],
    ['干扰对手', 'shape', 1, null, 1],
    ['终止（倒地 / 出界 / 禁区）', 'shape', null, null, 0.5],
    ['直立', 'safe', 0.015, null, 0.02],
    ['膝关节力矩', 'safe', 0.01, null, 0.01],
    ['目标姿态', 'skill', null, 1, null]
  ];
  var UPRIGHT_LO = 0.2, UPRIGHT_HI = 0.4, KNEE_NM = 5; // 表 S3、§Regularization for Safe Behaviors
  var TRAIN = [
    // 表 S5：环境步数 / 仿真天数 / 墙钟小时
    ['起身技能', 2.4e8, 70, 14], ['踢球技能', 2.0e9, 580, 158], ['完整 1v1', 9.0e8, 262, 68]
  ];
  var SYSID = [['阻尼', '1.084 Nm/(rad/s)'], ['电枢惯量', '0.045 kg·m²'], ['摩擦', '0.03'], ['最大力矩', '4.1 Nm'], ['比例增益', '21.1 N/rad']];
  var DR = [
    // §Domain Randomization and Perturbations：每局开头采一次、整局不变
    ['地面摩擦', 0.5, 1.0, ''], ['关节零位偏置', -2.9, 2.9, '°'], ['IMU 安装朝向', 0, 2, '°'], ['IMU 安装位置', 0, 5, 'mm'],
    ['躯干外加质量', 0, 0.5, 'kg'], ['观测延迟', 10, 50, 'ms']
  ];
  var PUSH = { every: [1, 3], dur: [0.05, 0.15], mag: [5, 15] }; // 原文写「5 to 15 Nm」
  var TABLE1 = [
    // 表 1：脚本基线 / 真机 / 仿真（均值），paper 是正文写的百分比
    { name: '行走', unit: 'm/s', base: 0.2, real: 0.57, sim: 0.51, paper: '+181%' },
    { name: '转身', unit: 'rad/s', base: 0.71, real: 2.85, sim: 3.19, paper: '+302%' },
    { name: '起身用时', unit: 's', base: 2.52, real: 0.93, sim: 0.73, paper: '−63%' },
    { name: '踢球', unit: 'm/s', base: 2.07, real: 2.02, sim: 2.12, runup: 2.77, paper: '+34%（助跑）' }
  ];
  var SIM_REAL = [13, -11, 28, -5]; // 正文：真机相对仿真 走快 13%、转慢 11%、起身多 28%、踢慢 5%
  var SETPIECE = { n: 50, real: 29, sim: 35, touchReal: 4.7, touchSim: 4.6 }; // 表 1、图 5A
  var OPP = { intercept: 10, obsHit: 9, obsN: 10, ctrlHit: 13, ctrlN: 14, gap: 1.5, shortSteps: 30, longSteps: 20, turnKick: 10 }; // 图 5B–E
  var FIG7 = { opponents: 6, matches: 100, seeds: 5 }; // 图 7
  var V1 = { walk: [0.27, 0.69], kick: [2.1, 2.6], pct: [156, 63, 24], penalty: 7, getupShoot: 8, trials: 10 }; // arXiv v1 表 3
  var VISION = { n: 10, sim: 10, real: 6, post: 3 }; // 补充材料 Playing Soccer from Raw Vision
  var BATTERY = [5, 10], CTRL_MS = 25; // §Limitations

  // ─── 玩具数（笔记「具体实例」第 2–5 步用的是同一组） ───
  var TOY_POSE = { jointErr: 0.8, gravAng: 0.3 };
  var TOY_LAMBDA = { qs: 0.6, lr: 0.12, q0: 0.2, q1: 0.9, lam0: 0.5 };
  var TOY_POOL = 40;
  var TOY_TILT = 0.3;

  // ─── 由上面的数现算 ───
  function obsDims(kind) {
    return OBS.reduce(function (a, r) { return a + (kind && r[3] !== kind ? 0 : r[1] * r[2]); }, 0);
  }
  var OBS_P = obsDims('p'), OBS_G = obsDims('g'), OBS_TOTAL = obsDims(); // 245 / 22 / 267

  /* 指数滤波的阶跃响应：u_0 = 0、a_t ≡ 1 时 u_n = 1 − a^n */
  function filterStep(a, n) {
    return 1 - Math.pow(a, n);
  }
  function riseSteps(a, level) {
    var n = 1;
    while (filterStep(a, n) < level && n < 999) n++;
    return n;
  }
  /* 频率响应 |H| = (1 − a) / sqrt(1 + a² − 2a cos ω)，ω = 2π f / 40 Hz */
  function filterGain(a, f) {
    var w = (2 * Math.PI * f) / HZ;
    return (1 - a) / Math.sqrt(1 + a * a - 2 * a * Math.cos(w));
  }
  /* −3 dB 截止频率：|H|² = 1/2 → cos ω = (1 + a² − 2(1 − a)²) / (2a)；奈奎斯特之内没有就返回 null */
  function cutoffHz(a) {
    var c = (1 + a * a - 2 * (1 - a) * (1 - a)) / (2 * a);
    return c < -1 || c > 1 ? null : (Math.acos(c) / (2 * Math.PI)) * HZ;
  }
  var N90 = riseSteps(FILTER_A, 0.9), MS90 = N90 * DT * 1000; // 11 步、275 ms
  var FC = cutoffHz(FILTER_A), G_NYQ = filterGain(FILTER_A, HZ / 2); // 1.43 Hz、0.111

  /* 起身奖励：正文 p̃ = (π − ‖·‖)/π、g̃ = (π − 夹角)/π；表 S3 把重力项的零点写在 π/2 */
  function poseSim(err) {
    return clamp((Math.PI - err) / Math.PI, 0, 1);
  }
  function gravSimTableS3(ang) {
    return clamp(1 - ang / (Math.PI / 2), 0, 1);
  }
  var POSE_P = poseSim(TOY_POSE.jointErr), POSE_G = poseSim(TOY_POSE.gravAng), POSE_R = POSE_P * POSE_G; // 0.745 / 0.905 / 0.674
  var POSE_G_S3 = gravSimTableS3(TOY_POSE.gravAng), POSE_R_S3 = POSE_P * POSE_G_S3; // 0.809 / 0.603
  var P_SWITCH = 1 - Math.exp(-DT / GETUP_MEAN); // 指数间隔：每个 25 ms 控制步换目标的概率 ≈ 1.65%

  /* 表 S3 的直立奖励：倾角 < 0.2 rad 得 1，> 0.4 rad 得 0，中间线性 */
  function upright(tilt) {
    return tilt < UPRIGHT_LO ? 1 : tilt > UPRIGHT_HI ? 0 : (UPRIGHT_HI - tilt) / (UPRIGHT_HI - UPRIGHT_LO);
  }
  var EP_STEPS = EP_SEC * HZ; // 2000 步

  /* 式 3 的一步：∂c/∂λ = E[Q] − Q_s，梯度下降后截断到 [0, 1]（论文用 softplus 参数化，这里省略） */
  function lambdaStep(lam, q, qs, lr) {
    return clamp(lam - lr * (q - qs), 0, 1);
  }

  /* 对手池：前 1/4 快照（或全部）+ 一个未训练的智能体；快照 i 对应训练进度 i / n */
  function poolOf(n, quarter) {
    var m = quarter ? Math.floor(n / 4) : n;
    var size = m + 1;
    var meanProgress = m ? (m * (m + 1)) / 2 / n / size : 0;
    return { m: m, size: size, p: 1 / size, strongest: m / n, mean: meanProgress };
  }

  function simDays(steps) {
    return (steps * DT) / 86400;
  }
  function pct(a, b) {
    return (a / b - 1) * 100;
  }
  function stdErr(k, n) {
    var p = k / n;
    return Math.sqrt((p * (1 - p)) / n);
  }

  // ─── demo 1: 指数动作滤波 ─────────────────────────────────────────────
  function buildFilterDemo(host) {
    var root = card(host, {
      title: '指数动作滤波：40 Hz 下 $u_t = a\\,u_{t-1} + (1-a)\\,a_t$ 挡掉了什么',
      sub:
        '论文取 $a = 0.8$（§Environment）。左图是策略输出 $a_t$ 与滤波后真正交给舵机的 $u_t$，右图是这个滤波器在 0–20 Hz 上的增益。' +
        '拖动系数看「平滑」和「延迟」怎么交换。'
    });
    var state = { a: FILTER_A, input: 'step' };
    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '滤波系数 $a$（论文 0.8）',
      min: 0.3,
      max: 0.95,
      step: 0.05,
      value: state.a,
      format: function (v) { return fmt(v, 2); },
      onInput: function (v) { state.a = v; render(); }
    });
    buttonGroup(ctrls, {
      label: '策略输出 $a_t$',
      items: [
        { label: '阶跃 0 → 1', value: 'step' },
        { label: '阶跃 + 20 Hz 抖动', value: 'jitter' },
        { label: '2 Hz 正弦', value: 'sine' }
      ],
      value: state.input,
      onPick: function (v) { state.input = v; render(); }
    });

    var setLegend = legend(root, [
      { key: 'muted', text: '灰：策略输出 $a_t$' },
      { key: 'accent', text: '蓝：滤波后 $u_t$' },
      { key: 'warn', text: '黄：第一次过 0.9 的那一步' }
    ]);
    var grid = stageGrid(root);
    var stTime = stage(grid, 240);
    var stFreq = stage(grid, 240);
    var stats = statsRow(root);
    var sRise = stats.add('阶跃过 0.9');
    var sTau = stats.add('时间常数（到 63%）');
    var sCut = stats.add('−3 dB 截止');
    var sNyq = stats.add('20 Hz 的增益');
    var verdict = verdictBox(root);
    note(root, [
      '**默认值就是笔记「具体实例」第 2 步**：$u_n = 1 - 0.8^n$，第 11 步才过 0.9，$11 \\times 25 = 275$ ms；截止频率与 20 Hz 增益是按 $|H| = (1-a)/\\sqrt{1 + a^2 - 2a\\cos\\omega}$ 现算的。',
      '**论文没有消融这个滤波器**，也没说 0.8 是怎么选的；改 $a$ 只是看机制，不代表论文结果。滤波器的状态（上一步动作）也进了观测，堆叠 5 步（表 S2）。',
      '**20 Hz 抖动是玩具输入**：40 Hz 采样下最快能表示的就是 20 Hz（奈奎斯特频率），相邻两步正负交替。'
    ]);

    var render = registerRenderer(function () {
      var a = state.a;
      var n90 = riseSteps(a, 0.9);
      var tau = -1 / Math.log(a);
      var fc = cutoffHz(a);
      sRise.set(n90 + ' 步 = ' + fmt(n90 * DT * 1000, 0) + ' ms', n90 * DT * 1000 > 300 ? 'warn' : 'good');
      sTau.set(fmt(tau, 2) + ' 步 = ' + fmt(tau * DT * 1000, 0) + ' ms');
      sCut.set(fc == null ? '高于 20 Hz' : fmt(fc, 2) + ' Hz', 'accent');
      sNyq.set(fmt(filterGain(a, HZ / 2), 3));

      var N = 40;
      var rng = mulberry32(7);
      var aSeq = [], uSeq = [], u = 0;
      for (var k = 0; k <= N; k++) {
        var x;
        if (state.input === 'sine') x = Math.sin((2 * Math.PI * 2 * k) / HZ);
        else x = k === 0 ? 0 : 1;
        if (state.input === 'jitter' && k > 0) x += (k % 2 ? 0.3 : -0.3) + 0.06 * (rng() - 0.5);
        aSeq.push(x);
        if (k > 0) u = a * u + (1 - a) * x;
        uSeq.push(u);
      }
      verdict.set(
        state.input === 'jitter'
          ? '±0.3 的 20 Hz 抖动经过滤波只剩 ±' + fmt(0.3 * filterGain(a, 20), 3) + '，代价是阶跃要 ' + fmt(n90 * DT * 1000, 0) + ' ms 才到 90%。'
          : state.input === 'sine'
            ? '2 Hz 的摆动剩 ' + fmt(filterGain(a, 2), 2) + ' 倍，相位也落后一截：截止频率以上的变化都会被压小。论文没给步频，滤波对步态的影响这里不下结论。'
            : '目标跳到 1 之后要 ' + n90 + ' 步（' + fmt(n90 * DT * 1000, 0) + ' ms）才过 0.9：滤波把一步之间的剧烈跳变摊开了。',
        state.input === 'jitter' ? 'learning' : null
      );

      var g = begin(stTime);
      var P = g.P;
      setLegend(P);
      var yd = state.input === 'sine' ? [-1.2, 1.2] : [-0.1, 1.45];
      var p = plot(g, { l: 38, r: 12, t: 22, b: 34 }, [0, N], yd);
      axes(g, p, {
        xTicks: [0, 10, 20, 30, 40],
        xFmt: function (t) { return t + ''; },
        yTicks: state.input === 'sine' ? [-1, 0, 1] : [0, 0.5, 0.9],
        yFmt: function (t) { return fmt(t, 1); },
        xLabel: '控制步（每步 25 ms）'
      });
      line(g.ctx, aSeq.map(function (v, k) { return [p.sx(k), p.sy(v)]; }), P.muted, 1.4);
      line(g.ctx, uSeq.map(function (v, k) { return [p.sx(k), p.sy(v)]; }), P.accent, 2.6);
      if (state.input !== 'sine' && n90 <= N) dot(g.ctx, p.sx(n90), p.sy(uSeq[n90]), 5, P.warn);
      text(g.ctx, '1 s = 40 步', p.x1, p.y1 - 8, P.muted, 'right', '11px sans-serif');

      var g2 = begin(stFreq);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 40, r: 14, t: 22, b: 34 }, [0, 20], [0, 1.05]);
      axes(g2, p2, {
        xTicks: [0, 5, 10, 15, 20],
        xFmt: function (t) { return t + ''; },
        yTicks: [0, 0.25, 0.5, 0.707, 1],
        yFmt: function (t) { return fmt(t, 2); },
        xLabel: '频率 Hz'
      });
      var pts = [];
      for (var i = 0; i <= 200; i++) pts.push([p2.sx(i / 10), p2.sy(filterGain(a, i / 10))]);
      line(g2.ctx, pts, P2.accent, 2.4);
      if (fc != null) {
        dot(g2.ctx, p2.sx(fc), p2.sy(Math.SQRT1_2), 5, P2.warn);
        text(g2.ctx, fmt(fc, 2) + ' Hz', p2.sx(fc) + 8, p2.sy(Math.SQRT1_2) - 10, P2.warn, 'left', '11px monospace');
      }
      dot(g2.ctx, p2.sx(20), p2.sy(filterGain(a, 20)), 4, P2.bad);
      text(g2.ctx, '增益 |H|', p2.x0 + 4, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      stTime.canvas.setAttribute('aria-label', '策略输出与滤波后关节目标随控制步的变化');
      stFreq.canvas.setAttribute('aria-label', '指数滤波器在 0 到 20 赫兹上的增益曲线');
    });
    render();
  }

  // ─── demo 2: λ 自动开关 ───────────────────────────────────────────────
  function buildLambdaDemo(host) {
    var root = card(host, {
      title: 'λ 自动开关：回报不够就模仿教师，够了就放手（式 3）',
      sub:
        '$\\lambda$ 用梯度下降最小化 $c(\\lambda) = \\lambda\\,(\\mathbb{E}[Q] - Q_s)$：预测回报低于阈值 $Q_s$ 时梯度为负，$\\lambda$ 往 1 走（行为克隆）；' +
        '高于阈值时往 0 走（纯 RL）。回报曲线是玩具，用来看 $\\lambda$ 怎么跟着它开关。'
    });
    var state = { qs: TOY_LAMBDA.qs, lr: TOY_LAMBDA.lr, speed: 1, at: 50 };
    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '阈值 $Q_s$（玩具）',
      min: 0.2, max: 0.95, step: 0.05, value: state.qs,
      format: function (v) { return fmt(v, 2); },
      onInput: function (v) { state.qs = v; render(); }
    });
    slider(ctrls, {
      label: '$\\lambda$ 的学习率',
      min: 0.02, max: 0.3, step: 0.02, value: state.lr,
      format: function (v) { return fmt(v, 2); },
      onInput: function (v) { state.lr = v; render(); }
    });
    slider(ctrls, {
      label: '学生回报涨得多快',
      min: 0.5, max: 2, step: 0.25, value: state.speed,
      format: function (v) { return '×' + fmt(v, 2); },
      onInput: function (v) { state.speed = v; render(); }
    });
    slider(ctrls, {
      label: '看第几轮',
      min: 0, max: 119, step: 1, value: state.at,
      format: function (v) { return '第 ' + v + ' 轮'; },
      onInput: function (v) { state.at = v; render(); }
    });
    var setLegend = legend(root, [
      { key: 'accent', text: '蓝：学生的预测回报 $\\mathbb{E}[Q]$（玩具）' },
      { key: 'warn', text: '虚线：阈值 $Q_s$' },
      { key: 'good', text: '绿：$\\lambda$' }
    ]);
    var st = stage(root, 250);
    var stats = statsRow(root);
    var sLam = stats.add('这一轮的 $\\lambda$');
    var sMix = stats.add('目标里 $Q$ 与 KL 的权重');
    var sBc = stats.add('$\\lambda = 1$（纯模仿）的轮数');
    var sOff = stats.add('$\\lambda$ 第一次回到 0');
    var verdict = verdictBox(root);
    note(root, [
      '**玩具模型**：回报曲线是一条 S 形，不是论文的学习曲线；论文没公布 $Q_s$、学习率和 $\\lambda$ 的轨迹，数值不能和论文比。笔记「具体实例」第 5 步用的是同一组数（$Q_s = 0.6$、学习率 0.12）。',
      '**真实的式 3 用 softplus 参数化再截断到 $[0, 1]$**，这里直接截断，机制一样：只看 $\\mathbb{E}[Q] - Q_s$ 的正负。',
      '**每个状态只对一个教师算 KL**（式 2）：直立时对踢球技能，倒地时对起身技能，各有自己的 $\\lambda_s$、$\\lambda_g$ 与阈值 $Q_s$、$Q_g$。'
    ]);

    function run() {
      var qs = [], lams = [], lam = 1;
      for (var i = 0; i < 120; i++) {
        var q = 0.1 + 0.85 / (1 + Math.exp(-((i - 60 / state.speed) * state.speed) / 10));
        lam = lambdaStep(lam, q, state.qs, state.lr);
        qs.push(q);
        lams.push(lam);
      }
      return { q: qs, lam: lams };
    }

    var render = registerRenderer(function () {
      var r = run();
      var i = state.at, lam = r.lam[i];
      var full = r.lam.filter(function (v) { return v >= 0.999; }).length;
      var crossed = r.q.findIndex(function (v) { return v >= state.qs; });
      var off = r.lam.findIndex(function (v, k) { return k > crossed && crossed >= 0 && v <= 0.001; });
      sLam.set(fmt(lam, 3), lam > 0.5 ? 'warn' : 'good');
      sMix.set(fmt(1 - lam, 2) + ' : ' + fmt(lam, 2));
      sBc.set(full + ' / 120');
      sOff.set(off < 0 ? '没有（回报一直不够）' : '第 ' + off + ' 轮', off < 0 ? 'bad' : 'good');
      verdict.set(
        r.q[i] < state.qs
          ? '第 ' + i + ' 轮：预测回报 ' + fmt(r.q[i], 2) + ' < 阈值 ' + fmt(state.qs, 2) + '，梯度 $' + fmt(r.q[i] - state.qs, 2) + '$ 为负，$\\lambda$ 往 1 推 —— 主要在模仿教师。'
          : '第 ' + i + ' 轮：预测回报 ' + fmt(r.q[i], 2) + ' ≥ 阈值，梯度为正，$\\lambda$ 往 0 收 —— 正则在退场，交给强化学习去超过教师。',
        r.q[i] < state.qs ? 'frozen' : 'learning'
      );
      var g = begin(st);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 40, r: 14, t: 22, b: 34 }, [0, 119], [0, 1.05]);
      axes(g, p, {
        xTicks: [0, 20, 40, 60, 80, 100, 119],
        xFmt: function (t) { return t + ''; },
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) { return fmt(t, 2); },
        xLabel: '训练轮次（玩具）'
      });
      // 行为克隆区（λ = 1）铺底色
      g.ctx.save();
      g.ctx.fillStyle = P.warn;
      g.ctx.globalAlpha = 0.1;
      var runStart = -1;
      r.lam.concat([0]).forEach(function (v, k) {
        if (v >= 0.999 && runStart < 0) runStart = k;
        if (v < 0.999 && runStart >= 0) {
          g.ctx.fillRect(p.sx(runStart), p.y1, p.sx(Math.min(k, 119)) - p.sx(runStart), p.y0 - p.y1);
          runStart = -1;
        }
      });
      g.ctx.restore();
      line(g.ctx, [[p.x0, p.sy(state.qs)], [p.x1, p.sy(state.qs)]], P.warn, 1.4, [6, 4]);
      line(g.ctx, r.q.map(function (v, k) { return [p.sx(k), p.sy(v)]; }), P.accent, 2.4);
      line(g.ctx, r.lam.map(function (v, k) { return [p.sx(k), p.sy(v)]; }), P.good, 2.4);
      line(g.ctx, [[p.sx(i), p.y1], [p.sx(i), p.y0]], P.muted, 1, [3, 3]);
      dot(g.ctx, p.sx(i), p.sy(lam), 5, P.good);
      dot(g.ctx, p.sx(i), p.sy(r.q[i]), 4, P.accent);
      text(g.ctx, '浅黄底：λ = 1，等于对教师做行为克隆', p.x0 + 4, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      st.canvas.setAttribute('aria-label', '玩具的预测回报曲线、阈值与 λ 随训练轮次的变化');
    });
    render();
  }

  // ─── demo 3: 自博弈的对手池 ───────────────────────────────────────────
  function buildPoolDemo(host) {
    var root = card(host, {
      title: '对手池：只取前 1/4 的快照，对手就「慢慢」变强',
      sub:
        '训练中定期存快照。论文的对手池 = 最早的 1/4 快照 + 一个未训练的智能体，每局均匀抽一个（§Self-Play）；图 7 的消融改成从全部快照里抽，学得不稳、收敛更差。' +
        '拖动快照数，看对手池有多大、最强的对手训练到了哪儿。'
    });
    var state = { n: TOY_POOL, quarter: true };
    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '已存的快照数 $N$',
      min: 4, max: 120, step: 1, value: state.n,
      format: function (v) { return v + ' 个'; },
      onInput: function (v) { state.n = v; render(); }
    });
    buttonGroup(ctrls, {
      label: '对手从哪里抽',
      items: [{ label: '前 1/4 + 未训练（论文）', value: true }, { label: '全部快照 + 未训练（图 7 消融）', value: false }],
      value: state.quarter,
      onPick: function (v) { state.quarter = v; render(); }
    });
    var setLegend = legend(root, [
      { key: 'accent', text: '蓝：进了对手池的快照' },
      { key: 'muted', text: '灰：存了但不抽' },
      { key: 'warn', text: '黄：未训练的智能体（开场就摔）' }
    ]);
    var grid = stageGrid(root);
    var stLine = stage(grid, 220);
    var stCurve = stage(grid, 220);
    var stats = statsRow(root);
    var sSize = stats.add('对手池大小');
    var sP = stats.add('每个对手被抽到的概率');
    var sMax = stats.add('最强对手的训练进度');
    var sMean = stats.add('对手的平均训练进度');
    var verdict = verdictBox(root);
    note(root, [
      '**默认值就是笔记「具体实例」第 6 步**：40 个快照 → 前 10 个 + 1 个未训练 = 11 个对手，每个 $1/11 \\approx 0.091$。论文没写存快照的间隔，40 是玩具数。',
      '**「训练进度」假设快照等间隔保存**：第 $i$ 个快照算 $i/N$。只取前 1/4 时，最强对手永远只到当前进度的约 25%，平均约 12.5%；全部快照时平均约 50%。',
      '**critic 额外输入对手的整数编号**：同一个状态对不同对手价值不同，不告诉 critic 对手是谁，价值会混叠（§Self-Play）。'
    ]);

    var render = registerRenderer(function () {
      var n = state.n, pl = poolOf(n, state.quarter);
      sSize.set(pl.m + ' + 1 = ' + pl.size + ' 个');
      sP.set('1/' + pl.size + ' ≈ ' + fmt(pl.p, 3));
      sMax.set(fmt(pl.strongest * 100, 0) + '%', state.quarter ? 'good' : 'warn');
      sMean.set(fmt(pl.mean * 100, 1) + '%', state.quarter ? 'good' : 'warn');
      verdict.set(
        state.quarter
          ? '对手里最强的也只是训练到 ' + fmt(pl.strongest * 100, 0) + '% 时的自己：对手跟着智能体一起变强，但总落后一截，早期还有足够的控球机会。'
          : '最强对手就是刚存的自己（' + fmt(pl.strongest * 100, 0) + '%）：每存一个快照，对手的难度就跳一下 —— 图 7 里这样训不稳、最后更差。',
        state.quarter ? 'learning' : 'frozen'
      );

      var g = begin(stLine);
      var P = g.P;
      setLegend(P);
      var ctx = g.ctx;
      var cols = Math.min(n, 40), rows = Math.ceil(n / cols);
      var cw = Math.min(16, (g.w - 70) / cols), ch = Math.min(18, (g.h - 90) / rows);
      var x0 = 52, y0 = 46;
      text(ctx, '快照按保存顺序排（左上最早）', x0, 20, P.muted, 'left', '11px sans-serif');
      dot(ctx, 24, y0 + ch / 2, 7, P.warn);
      text(ctx, '0', 24, y0 + ch / 2 + 16, P.muted, 'center', '10px monospace');
      for (var i = 1; i <= n; i++) {
        var c = (i - 1) % cols, r = Math.floor((i - 1) / cols);
        ctx.fillStyle = i <= pl.m ? P.accent : P.grid;
        ctx.globalAlpha = i <= pl.m ? 0.9 : 0.7;
        ctx.fillRect(x0 + c * cw + 1, y0 + r * ch + 1, cw - 2, ch - 2);
      }
      ctx.globalAlpha = 1;
      text(ctx, '池子：' + pl.size + ' 个对手（含 1 个未训练）', x0, y0 + rows * ch + 22, P.text, 'left', '12px sans-serif');
      text(ctx, 'critic 的输入里多一个对手编号 0 … ' + pl.m, x0, y0 + rows * ch + 42, P.muted, 'left', '11px sans-serif');

      var g2 = begin(stCurve);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 24, b: 34 }, [4, 120], [0, 1]);
      axes(g2, p2, {
        xTicks: [4, 20, 40, 60, 80, 100, 120],
        xFmt: function (t) { return t + ''; },
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) { return fmt(t * 100, 0) + '%'; },
        xLabel: '已存的快照数'
      });
      text(g2.ctx, '最强对手的训练进度（相对当前）', p2.x0, p2.y1 - 12, P2.muted, 'left', '11px sans-serif');
      [true, false].forEach(function (q) {
        var pts = [];
        for (var k = 4; k <= 120; k++) pts.push([p2.sx(k), p2.sy(poolOf(k, q).strongest)]);
        g2.ctx.globalAlpha = q === state.quarter ? 1 : 0.35;
        line(g2.ctx, pts, q ? P2.accent : P2.bad, q === state.quarter ? 2.6 : 1.6);
        g2.ctx.globalAlpha = 1;
      });
      dot(g2.ctx, p2.sx(n), p2.sy(pl.strongest), 5, null, P2.text);
      text(g2.ctx, '前 1/4', p2.x1 - 4, p2.sy(0.25) - 10, P2.accent, 'right', '11px sans-serif');
      text(g2.ctx, '全部', p2.x1 - 4, p2.sy(1) + 12, P2.bad, 'right', '11px sans-serif');
      stLine.canvas.setAttribute('aria-label', '已保存的快照里哪些进了对手池');
      stCurve.canvas.setAttribute('aria-label', '最强对手的训练进度随快照数的变化：前四分之一约为四分之一，全部快照为百分之百');
    });
    render();
  }

  // ═══ 十二幕讲解动画 ═════════════════════════════════════════════════════

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
    var g = group(parent);
    rectBox(g, x, y, w, o.h || 30, color, o.fill || C_SURFACE, o.dash);
    g.appendChild(svgRich(x + w / 2, y + (o.h || 30) / 2 + 4, str, { size: o.size || 11, anchor: 'middle', w: w - 8, cls: o.cls || 'demo-x-ink2' }));
    return g;
  }

  function arrowPath(parent, pts, color, marker, dash, width) {
    var p = paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': width || 1.6, 'marker-end': marker }), null, color);
    if (dash) p.setAttribute('stroke-dasharray', dash);
    parent.appendChild(p);
    return p;
  }

  function pathLine(parent, pts, color, width, dash) {
    var p = paint(svgEl('path', { d: polyPath(pts.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })), fill: 'none', 'stroke-width': width || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }), null, color);
    if (dash) p.setAttribute('stroke-dasharray', dash);
    parent.appendChild(p);
    return p;
  }

  /* 按比例 u ∈ [0, 1] 把一条折线「画出来」 */
  function drawOn(path, u) {
    if (!path.lenCache) path.lenCache = path.getTotalLength ? path.getTotalLength() || 1 : 1;
    path.setAttribute('stroke-dasharray', path.lenCache + ' ' + path.lenCache);
    path.setAttribute('stroke-dashoffset', (path.lenCache * (1 - u)).toFixed(1));
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

  function setPos(node, x, y) {
    node.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
  }

  /* ── 场地（俯视）：x ∈ [−2.5, 2.5] m 沿长边，己方球门在左；y ∈ [−2, 2] m ── */
  function pitchView(parent, x, y, w) {
    var h = (w * PITCH_W) / PITCH_L;
    var g = group(parent);
    var s = w / PITCH_L;
    function sx(m) { return x + (m + PITCH_L / 2) * s; }
    function sy(m) { return y + (PITCH_W / 2 - m) * s; }
    g.appendChild(paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 5, 'stroke-width': 1.6, 'fill-opacity': 0.1 }), C_GOOD, C_GOOD));
    g.appendChild(paint(svgEl('line', { x1: sx(0), y1: y, x2: sx(0), y2: y + h, 'stroke-width': 1, opacity: 0.7 }), null, C_GOOD));
    g.appendChild(paint(svgEl('circle', { cx: sx(0), cy: sy(0), r: 0.45 * s, fill: 'none', 'stroke-width': 1, opacity: 0.7 }), null, C_GOOD));
    var gh = GOAL_W * s;
    g.appendChild(paint(svgEl('rect', { x: x - 7, y: sy(0) - gh / 2, width: 7, height: gh, rx: 1.5 }), C_ACCENT));
    g.appendChild(paint(svgEl('rect', { x: x + w, y: sy(0) - gh / 2, width: 7, height: gh, rx: 1.5 }), C_BAD));
    // 球门前的禁区（图 1 里的红色区域，尺寸论文没写，这里示意）
    [[x, 1], [x + w - 0.35 * s, -1]].forEach(function (b) {
      var r = paint(svgEl('rect', { x: b[0], y: sy(0) - 0.75 * s, width: 0.35 * s, height: 1.5 * s, fill: 'none', 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_BAD);
      r.style.opacity = 0.55;
      g.appendChild(r);
    });
    return { g: g, sx: sx, sy: sy, s: s, x: x, y: y, w: w, h: h };
  }

  /* 俯视的球员：圆 + 朝向短线 */
  function player(parent, color, r) {
    var g = group(parent);
    var body = paint(svgEl('circle', { cx: 0, cy: 0, r: r || 8, 'stroke-width': 1.6 }), C_SURFACE2, color);
    var nose = paint(svgEl('line', { x1: 0, y1: 0, x2: (r || 8) + 6, y2: 0, 'stroke-width': 2.4, 'stroke-linecap': 'round' }), null, color);
    g.appendChild(body);
    g.appendChild(nose);
    return {
      el: g,
      at: function (x, y, headingDeg) {
        g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (-(headingDeg || 0)).toFixed(1) + ')');
      },
      body: body
    };
  }

  function ballDot(parent, r) {
    var b = paint(svgEl('circle', { r: r || 4.5, 'stroke-width': 1.2 }), '#f5f5f5', '#555');
    parent.appendChild(b);
    return {
      el: b,
      at: function (x, y) {
        b.setAttribute('cx', x.toFixed(1));
        b.setAttribute('cy', y.toFixed(1));
      }
    };
  }

  /* ── 侧视的 OP3 示意：大头、短腿（51 cm 的小人形）。用 kit 的火柴人，外面套一层缩放。 ── */
  function op3(parent, color, sc, dashed) {
    var outer = group(parent);
    var inner = svgEl('g', {});
    outer.appendChild(inner);
    var fig = K.stickFigure(color, 4.2, dashed, 0.4);
    inner.appendChild(fig.el);
    inner.setAttribute('transform', 'scale(' + (sc || 1) + ')');
    return {
      el: outer,
      /* (x, y) 是髋在画面上的位置 */
      pose: function (x, y, P) {
        setPos(outer, x, y);
        fig.pose(0, 0, P);
      },
      sc: sc || 1
    };
  }
  function lerpPose(A, B, u) {
    function l(a, b) { return a + (b - a) * u; }
    function l2(a, b) { return [l(a[0], b[0]), l(a[1], b[1])]; }
    return { lean: l(A.lean, B.lean), armA: l2(A.armA, B.armA), armB: l2(A.armB, B.armB), legA: l2(A.legA, B.legA), legB: l2(A.legB, B.legB) };
  }
  var POSE_STAND = { lean: 4, armA: [-8, 6], armB: [8, 18], legA: [2, 2], legB: [-2, -2] };
  var POSE_PRONE = { lean: 90, armA: [150, 160], armB: [150, 160], legA: [-90, -90], legB: [-92, -92] };
  var POSE_SUPINE = { lean: -90, armA: [-150, -160], armB: [-150, -160], legA: [90, 90], legB: [92, 92] };
  var POSE_PUSH = { lean: 62, armA: [8, 0], armB: [12, 4], legA: [-12, -88], legB: [-16, -90] };
  var POSE_CROUCH = { lean: 34, armA: [30, 50], armB: [36, 56], legA: [70, -24], legB: [66, -28] };
  var POSE_KICK = { lean: -14, armA: [-40, -20], armB: [40, 60], legA: [62, 80], legB: [-8, -8] };
  var POSE_LEAN = { lean: 20, armA: [-30, 0], armB: [30, 50], legA: [24, -6], legB: [-22, -60] };

  /* 小折线图坐标 */
  function miniAxes(parent, x, y, w, h, xd, yd) {
    var g = group(parent);
    function sx(v) { return x + ((v - xd[0]) / (xd[1] - xd[0])) * w; }
    function sy(v) { return y + h - ((v - yd[0]) / (yd[1] - yd[0])) * h; }
    g.appendChild(paint(svgEl('line', { x1: x, y1: y + h, x2: x + w, y2: y + h, 'stroke-width': 1 }), null, C_BORDER));
    g.appendChild(paint(svgEl('line', { x1: x, y1: y, x2: x, y2: y + h, 'stroke-width': 1 }), null, C_BORDER));
    return { g: g, sx: sx, sy: sy };
  }

  // ── scene 1: 为什么是足球，为什么不能端到端 ──
  function buildSceneTask() {
    var s = sceneSvg('人形与双足的学习控制多停在单个技能；1 对 1 足球同时要敏捷动作、技能衔接、长程策略和对廉价硬件的安全；Robotis OP3 高 51 厘米、重 3.5 公斤、20 个舵机；直接端到端训练会学成滚着拨球或站着不动，所以先训踢球与起身两个技能再蒸馏与自博弈');
    s.appendChild(svgText(30, 28, '1 对 1 足球：一台 51 cm 的小人形，从仿真零样本到真机', 'demo-x-ink2', 13.5));

    var pv = pitchView(s, 38, 46, 240);
    s.appendChild(svgText(158, pv.y + pv.h + 16, '5 m × 4 m，球门宽 0.8 m，四周有斜坡（图 1）', 'demo-x-mut', 10, 'middle'));
    var me = player(pv.g, C_ACCENT), opp = player(pv.g, C_BAD), ball = ballDot(pv.g);

    var need = group(s);
    need.appendChild(svgText(306, 62, '同时要 4 样东西（引言）', 'demo-x-ink2', 12));
    var needs = [['敏捷动作', '起身、走、转身、踢'], ['技能衔接', '边跑边调脚步、踢移动的球'], ['长程策略', '预判球和对手、站位防守'], ['硬件安全', 'OP3 便宜，也很容易摔坏']];
    var needG = needs.map(function (r, k) {
      var g = group(need);
      rectBox(g, 306 + (k % 2) * 236, 72 + Math.floor(k / 2) * 52, 228, 44, C_ACCENT, C_SURFACE);
      g.appendChild(svgText(318 + (k % 2) * 236, 91 + Math.floor(k / 2) * 52, (k + 1) + ' · ' + r[0], 'demo-x-acc', 11.5));
      g.appendChild(svgText(318 + (k % 2) * 236, 108 + Math.floor(k / 2) * 52, r[1], 'demo-x-ink2', 10.5));
      return g;
    });

    var robot = group(s);
    rectBox(robot, 306, 180, 464, 72, C_BORDER, C_SURFACE2);
    var fig = op3(robot, C_INK, 0.5);
    robot.appendChild(svgRich(366, 204, '**Robotis OP3**：高 ' + OP3_CM + ' cm · 重 ' + OP3_KG + ' kg · ' + JOINTS + ' 个 Dynamixel XM430 舵机', { size: 11.5, w: 400 }));
    robot.appendChild(svgText(366, 230, '舵机位置控制只用比例项；网络在板载 Intel i3 NUC 的 CPU 上跑', 'demo-x-mut', 10.5));

    var fail = group(s);
    rectBox(fail, 30, 274, 740, 74, C_BAD, C_SURFACE, '4 3');
    fail.appendChild(svgText(44, 294, '直接端到端训 1v1（消融，图 7B）', 'demo-x-bad', 11.5));
    fail.appendChild(svgText(44, 316, '① 只给进球 / 失球的稀疏奖励 → 滚到球边，用腿把球拨进门', 'demo-x-ink2', 11));
    fail.appendChild(svgText(44, 336, '② 加上倒地惩罚等塑形 → 只学会站起来不动，朝球、前进的塑形奖励也救不回来', 'demo-x-ink2', 11));
    var roll = op3(fail, C_BAD, 0.5);

    var fin = group(s);
    chip(fin, 30, 358, 740, '所以分两段：先分别训**踢球**和**起身**两个技能 → 再**蒸馏**成一个智能体 + **自博弈**', C_GOOD, { h: 38, size: 12.5 });

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      setOpacity(pv.g, seg(t, 0.3, 0.9));
      // 一段小比赛：蓝方带球推进、射门；红方回追
      var u = ease(seg(t, 0.6, 3.4));
      var bx = -0.3 + 2.75 * ease(seg(t, 2.6, 3.4)), by = 0.5 - 0.5 * ease(seg(t, 2.6, 3.4));
      me.at(pv.sx(-1.4 + 1.0 * u), pv.sy(0.9 - 0.4 * u), -20 * u);
      opp.at(pv.sx(1.3 - 0.6 * u), pv.sy(-0.8 + 0.6 * u), 160);
      ball.at(pv.sx(t < 2.6 ? -0.3 : bx), pv.sy(t < 2.6 ? 0.5 : by));
      setOpacity(need, seg(t, 3.6, 4.0));
      needG.forEach(function (g, k) { setOpacity(g, seg(t, 3.8 + k * 0.6, 4.3 + k * 0.6)); });
      setOpacity(robot, seg(t, 7.0, 7.6));
      fig.pose(334, 236, K.poseWalk((now * 1.4) % 1));
      setOpacity(fail, seg(t, 10.4, 11.0));
      // 「滚着拨球」：躺着的机器人
      roll.pose(706, 330, lerpPose(POSE_PRONE, POSE_SUPINE, 0.5 + 0.5 * Math.sin(now * 2.2)));
      setOpacity(fin, seg(t, 13.6, 14.2));
    }
    return { el: s, draw: draw };
  }

  // ── scene 2: 一步控制 ──
  function buildSceneControl() {
    var s = sceneSvg('观测分本体和比赛状态：关节位置、IMU、重力方向、上一步动作堆叠 5 步共 245 维，球、对手、球门位置与速度共 22 维，合计 267 维；策略 256、256、128 的网络 40 赫兹输出 20 维关节目标，截断后经指数滤波 u 等于 0.8 u 加 0.2 a，第 11 步、275 毫秒才过 0.9，再交给只用比例项的舵机');
    s.appendChild(svgText(30, 28, '一步控制（每 25 ms）：267 维观测 → 网络 → 20 维关节目标 → 滤波 → 舵机', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'op3-x-arrow-s2', C_MUTED);

    // 观测：本体 5 帧堆叠
    var prop = group(s);
    rectBox(prop, 30, 44, 260, 168, C_ACCENT, C_SURFACE);
    prop.appendChild(svgText(42, 63, '本体（表 S2）· 堆叠最近 5 步', 'demo-x-acc', 11.5));
    var frames = [];
    for (var f = 0; f < 5; f++) {
      var fg = group(prop);
      var fx = 42 + f * 48;
      [['关节', 20], ['IMU', 9], ['动作', 20]].forEach(function (r, k) {
        var hh = r[1] * 1.8;
        var yy = 72 + [0, 40, 60][k];
        fg.appendChild(paint(svgEl('rect', { x: fx, y: yy, width: 40, height: hh, rx: 3, 'stroke-width': 1 }), C_SURFACE2, k === 1 ? C_WARN : C_ACCENT));
        if (f === 0) prop.appendChild(svgText(fx + 20, yy + hh / 2 + 4, r[0], 'demo-x-mut', 9, 'middle'));
      });
      fg.appendChild(svgText(fx + 20, 112 + 72, f === 4 ? 't' : 't−' + (4 - f), 'demo-x-mut demo-x-mono', 9.5, 'middle'));
      frames.push(fg);
    }
    var propN = svgRich(160, 203, '$5 \\times (20 + 3 + 3 + 3 + 20) = $ **245** 维', { size: 11, anchor: 'middle', w: 250 });
    prop.appendChild(propN);

    var game = group(s);
    rectBox(game, 30, 222, 260, 92, C_GOOD, C_SURFACE);
    game.appendChild(svgText(42, 241, '比赛状态（动捕）· 不堆叠', 'demo-x-good', 11.5));
    game.appendChild(svgText(42, 262, '球 / 对手 / 两个球门的平面位置：4 × 2', 'demo-x-ink2', 10.5));
    game.appendChild(svgText(42, 280, '自身速度 5 × 2，球速度 2，对手速度 2', 'demo-x-ink2', 10.5));
    game.appendChild(svgRich(42, 302, '合计 **22** 维 · 观测共 **' + OBS_TOTAL + '** 维（逐项相加）', { size: 10.5, w: 240, cls: 'demo-x-good' }));

    // 网络
    var net = group(s);
    rectBox(net, 318, 120, 136, 112, C_BORDER, C_SURFACE2);
    net.appendChild(svgText(386, 142, '策略网络', 'demo-x-ink2', 12, 'middle'));
    ACTOR.forEach(function (n, k) {
      net.appendChild(paint(svgEl('rect', { x: 336 + k * 34, y: 152 + (256 - n) / 8, width: 26, height: n / 4, rx: 3 }), C_ACCENT)).style.opacity = 0.5;
    });
    net.appendChild(svgText(386, 226, '256-256-128 · ELU · CPU', 'demo-x-mut demo-x-mono', 9.5, 'middle'));
    arrowPath(net, [[292, 176], [316, 176]], C_MUTED, mk);

    // 动作 → 截断 → 滤波
    var act = group(s);
    chip(act, 480, 44, 290, '$a_t$：**20** 个关节的位置目标（40 Hz）', C_BORDER, { h: 30, size: 11 });
    chip(act, 480, 84, 290, '按表 S1 截断（零位是 T 姿态，减少自碰撞）', C_BORDER, { h: 30, size: 10.5 });
    arrowPath(act, [[456, 160], [470, 160], [470, 59], [478, 59]], C_MUTED, mk);

    var filt = group(s);
    rectBox(filt, 480, 124, 290, 168, C_WARN, C_SURFACE);
    filt.appendChild(svgMath(625, 150, 'u_t = 0.8\\,u_{t-1} + 0.2\\,a_t', { size: 13, anchor: 'middle', w: 260 }));
    var ax = miniAxes(filt, 508, 166, 244, 90, [0, 20], [0, 1.1]);
    filt.appendChild(paint(svgEl('line', { x1: 508, y1: ax.sy(0.9), x2: 752, y2: ax.sy(0.9), 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_MUTED));
    filt.appendChild(svgText(504, ax.sy(0.9) + 3.5, '0.9', 'demo-x-mut demo-x-mono', 9, 'end'));
    var stepPts = [[0, 0], [0.001, 1], [20, 1]].map(function (q) { return [ax.sx(q[0]), ax.sy(q[1])]; });
    pathLine(filt, stepPts, C_MUTED, 1.3, '4 3');
    var uPts = [[ax.sx(0), ax.sy(0)]];
    for (var n = 1; n <= 20; n++) uPts.push([ax.sx(n), ax.sy(filterStep(FILTER_A, n))]);
    var uPath = pathLine(filt, uPts, C_ACCENT, 2.2);
    var hit = paint(svgEl('circle', { cx: ax.sx(N90), cy: ax.sy(filterStep(FILTER_A, N90)), r: 4.5 }), C_WARN);
    filt.appendChild(hit);
    var hitTxt = svgRich(ax.sx(N90) + 8, ax.sy(0.6), '第 **' + N90 + '** 步 = **' + fmt(MS90, 0) + ' ms**', { size: 10.5, w: 150, cls: 'demo-x-warn' });
    filt.appendChild(hitTxt);
    filt.appendChild(svgText(752, 274, '控制步（目标在第 1 步从 0 跳到 1）', 'demo-x-mut', 9.5, 'end'));

    var servo = group(s);
    chip(servo, 318, 260, 136, '舵机：位置控制 · 只有 P', C_BORDER, { h: 32, size: 10.5 });
    arrowPath(servo, [[478, 276], [456, 276]], C_MUTED, mk);

    var freq = group(s);
    chip(freq, 30, 352, 740, '频率上看（我们算的）：−3 dB 截止约 **' + fmt(FC, 2) + ' Hz**，2 Hz 的摆动剩 ' + fmt(filterGain(FILTER_A, 2), 2) + ' 倍，20 Hz 的逐步抖动只剩 **' + fmt(G_NYQ, 3) + '** 倍 —— 越快的变化压得越狠', C_WARN, { h: 38, size: 11.5 });

    function draw(t) {
      setOpacity(prop, seg(t, 0.3, 0.8));
      frames.forEach(function (g, k) { setOpacity(g, seg(t, 0.5 + k * 0.35, 0.9 + k * 0.35)); });
      setOpacity(propN, seg(t, 2.4, 3.0));
      setOpacity(game, seg(t, 3.6, 4.2));
      setOpacity(net, seg(t, 7.0, 7.6));
      setOpacity(act, seg(t, 8.2, 8.8));
      setOpacity(filt, seg(t, 10.4, 11.0));
      drawOn(uPath, ease(seg(t, 10.8, 12.6)));
      setOpacity(hit, seg(t, 12.4, 12.8));
      setOpacity(hitTxt, seg(t, 12.4, 12.8));
      setOpacity(servo, seg(t, 13.6, 14.2));
      setOpacity(freq, seg(t, 14.4, 15.0));
    }
    return { el: s, draw: draw };
  }

  // ── scene 3: 阶段 1 ① 踢球教师 ──
  function buildSceneSoccerSkill() {
    var s = sceneSvg('踢球技能：双方和球随机放在场上，对手是未训练的策略、开场就摔倒躺着；智能体倒地、出界、进禁区、被进球或满 50 秒就结束；奖励是进球 1000、朝球速度 0.05、前进速度 0.1、干扰 1、直立 0.015、膝关节力矩 0.01；2 乘 10 的 9 次方步，仿真 580 天，墙钟 158 小时');
    s.appendChild(svgText(30, 28, '阶段 1 ①：踢球教师 —— 对着一个开场就摔倒的对手练进球', 'demo-x-ink2', 13.5));

    var pv = pitchView(s, 30, 46, 330);
    var me = player(pv.g, C_ACCENT), opp = player(pv.g, C_BAD), ball = ballDot(pv.g);
    var down = svgText(0, 0, '躺着不动', 'demo-x-bad', 10, 'middle');
    pv.g.appendChild(down);
    var goalFlash = paint(svgEl('rect', { x: pv.x + pv.w, y: pv.sy(0) - (GOAL_W * pv.s) / 2 - 4, width: 12, height: GOAL_W * pv.s + 8, rx: 3 }), C_WARN);
    pv.g.appendChild(goalFlash);
    s.appendChild(svgText(195, pv.y + pv.h + 18, '每局开头：双方和球随机摆放，双方都是默认站姿', 'demo-x-mut', 10, 'middle'));

    var ends = group(s);
    ends.appendChild(svgText(384, 62, '这一局什么时候结束', 'demo-x-ink2', 12));
    var endItems = ['自己倒地', '出界', '进入球门禁区', '对手进球', '满 50 s'];
    var endG = endItems.map(function (str, k) {
      var g = group(ends);
      rectBox(g, 384 + (k % 3) * 130, 72 + Math.floor(k / 3) * 38, 122, 30, C_BAD, C_SURFACE);
      g.appendChild(svgText(445 + (k % 3) * 130, 92 + Math.floor(k / 3) * 38, str, 'demo-x-ink2', 11, 'middle'));
      return g;
    });

    var rew = group(s);
    rectBox(rew, 384, 156, 386, 150, C_ACCENT, C_SURFACE);
    rew.appendChild(svgText(398, 176, '奖励（表 S3「踢球技能」一列）', 'demo-x-acc', 11.5));
    var rows = REWARDS.filter(function (r) { return r[2] != null; });
    var maxLog = Math.log10(1000), minLog = Math.log10(0.01);
    rows.forEach(function (r, k) {
      var y = 190 + k * 15.5;
      rew.appendChild(svgText(398, y + 9, r[0], 'demo-x-ink2', 10));
      var w = r[2] > 0 ? 18 + ((Math.log10(r[2]) - minLog) / (maxLog - minLog)) * 150 : 0;
      var col = r[1] === 'task' ? C_ACCENT : r[1] === 'safe' ? C_WARN : C_GOOD;
      rew.appendChild(paint(svgEl('rect', { x: 500, y: y, width: Math.max(w, 2), height: 10, rx: 2, opacity: r[2] > 0 ? 0.85 : 0.3 }), col));
      rew.appendChild(svgText(510 + Math.max(w, 2), y + 9, r[2] > 0 ? String(r[2]) : '0（不罚失球）', 'demo-x-mono', 10));
    });
    rew.appendChild(svgText(756, 300, '条长按对数画', 'demo-x-mut', 9.5, 'end'));

    var cost = group(s);
    chip(cost, 30, 352, 740, '表 S5：$2.0 \\times 10^9$ 环境步 = 仿真 **580 天**，分布式并行采样，墙钟 **158 小时**', C_WARN, { h: 38, size: 12 });

    function draw(t, clock) {
      setOpacity(pv.g, seg(t, 0.3, 0.9));
      var u = ease(seg(t, 1.0, 9.6));
      var kick = seg(t, 9.6, 10.6);
      me.at(pv.sx(-1.6 + 2.2 * u), pv.sy(-0.9 + 1.1 * u), 30 - 30 * u);
      ball.at(pv.sx(0.7 + 1.85 * ease(kick)), pv.sy(0.2 - 0.2 * ease(kick)));
      var fallU = seg(t, 3.6, 4.4);
      opp.at(pv.sx(1.4), pv.sy(-1.1), 180 + 80 * fallU);
      opp.body.setAttribute('r', (8 + 3 * fallU).toFixed(1));
      opp.el.style.opacity = 1 - 0.45 * fallU;
      down.setAttribute('x', pv.sx(1.4).toFixed(1));
      down.setAttribute('y', (pv.sy(-1.1) + 24).toFixed(1));
      setOpacity(down, seg(t, 4.4, 4.8));
      setOpacity(goalFlash, t > 10.5 ? 0.35 + 0.35 * Math.sin((clock == null ? t : clock) * 8) : 0);
      setOpacity(ends, seg(t, 7.0, 7.4));
      endG.forEach(function (g, k) { setOpacity(g, seg(t, 7.2 + k * 0.4, 7.6 + k * 0.4)); });
      setOpacity(rew, seg(t, 10.4, 11.0));
      setOpacity(cost, seg(t, 13.6, 14.2));
    }
    return { el: s, draw: draw };
  }

  // ── scene 4: 阶段 1 ② 起身教师 ──
  function buildSceneGetup() {
    var s = sceneSvg('起身技能：从 OP3 脚本起身动作抽出前倒和后倒各 3 个关键姿态，目标在其间插值，平均每 1.5 秒按指数分布换一次；actor 和 critic 以目标关节角和目标重力方向为条件；奖励是关节相似度乘重力相似度，玩具数 0.745 乘 0.905 等于 0.674；训完固定成站立就是起身技能，2.4 乘 10 的 8 次方步，仿真 70 天，墙钟 14 小时');
    s.appendChild(svgText(30, 28, '阶段 1 ②：起身教师 —— 以脚本起身的关键姿态为目标', 'demo-x-ink2', 13.5));

    // 关键姿态（图 S2 的示意）：前倒一套、后倒一套
    var poses = group(s);
    rectBox(poses, 30, 40, 450, 144, C_GOOD, C_SURFACE);
    poses.appendChild(svgText(42, 58, '从脚本起身动作里抽关键姿态（图 S2，示意）', 'demo-x-good', 11.5));
    var keyFigs = [];
    var HIP = { prone: 8, push: 24, crouch: 30, stand: 48 };
    function hipLift(P) { return P === POSE_STAND ? HIP.stand : P === POSE_PUSH ? HIP.push : P === POSE_CROUCH ? HIP.crouch : HIP.prone; }
    [[POSE_PRONE, POSE_PUSH, POSE_STAND, '前倒'], [POSE_SUPINE, POSE_CROUCH, POSE_STAND, '后倒']].forEach(function (set, row) {
      var gy = 116 + row * 60;
      poses.appendChild(svgText(42, gy - 8, set[3], 'demo-x-mut', 10.5));
      for (var k = 0; k < KEY_POSES; k++) {
        var f = op3(poses, C_INK, 0.42);
        f.pose(112 + k * 92, gy - hipLift(set[k]) * 0.42 * 1.0, set[k]);
        keyFigs.push(f.el);
        poses.appendChild(paint(svgEl('line', { x1: 80 + k * 92, y1: gy + 1, x2: 144 + k * 92, y2: gy + 1, 'stroke-width': 1 }), null, C_BORDER));
        if (k < 2) poses.appendChild(svgText(158 + k * 92, gy - 12, '→', 'demo-x-mut', 12, 'middle'));
      }
    });
    poses.appendChild(paint(svgEl('line', { x1: 352, y1: 50, x2: 352, y2: 176, 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_BORDER));
    var live = op3(poses, C_ACCENT, 0.5);
    poses.appendChild(paint(svgEl('line', { x1: 372, y1: 160, x2: 470, y2: 160, 'stroke-width': 1 }), null, C_BORDER));
    poses.appendChild(svgText(420, 178, '插值出的目标', 'demo-x-acc', 10, 'middle'));

    // 目标切换的时间线（指数间隔，平均 1.5 s）
    var tl = group(s);
    rectBox(tl, 30, 194, 450, 60, C_BORDER, C_SURFACE2);
    tl.appendChild(svgRich(42, 212, '换目标：间隔服从**指数分布**，平均 **1.5 s**（无记忆，保持马尔可夫性）', { size: 10.5, w: 430 }));
    var rng = mulberry32(11), tt = 0, ticks = [];
    while (tt < 12) {
      tt += -GETUP_MEAN * Math.log(1 - rng());
      if (tt < 12) ticks.push(tt);
    }
    tl.appendChild(paint(svgEl('line', { x1: 44, y1: 236, x2: 446, y2: 236, 'stroke-width': 1.2 }), null, C_MUTED));
    var tickEls = ticks.map(function (x) {
      var m = paint(svgEl('line', { x1: 44 + x * 33.5, y1: 228, x2: 44 + x * 33.5, y2: 244, 'stroke-width': 2 }), null, C_ACCENT);
      tl.appendChild(m);
      return m;
    });
    tl.appendChild(svgText(470, 240, '12 s', 'demo-x-mut demo-x-mono', 9, 'end'));

    var cond = group(s);
    rectBox(cond, 498, 42, 272, 210, C_ACCENT, C_SURFACE);
    cond.appendChild(svgText(512, 62, 'actor 与 critic 都以目标为条件', 'demo-x-acc', 11.5));
    cond.appendChild(svgRich(512, 88, '目标关节角 $p_{target}$（20 维）', { size: 11, w: 250 }));
    cond.appendChild(svgText(522, 106, '→ 引向稳定、不自碰撞的姿态', 'demo-x-ink2', 10.5));
    cond.appendChild(svgRich(512, 134, '目标重力方向 $g_{target}$', { size: 11, w: 250 }));
    cond.appendChild(svgText(522, 152, '机器人坐标系下表示，和航向无关', 'demo-x-ink2', 10.5));
    cond.appendChild(svgText(522, 170, '→ 逼它真的站起来，', 'demo-x-ink2', 10.5));
    cond.appendChild(svgText(522, 188, '   不能躺着把关节角摆对', 'demo-x-ink2', 10.5));
    cond.appendChild(svgRich(512, 218, '训完把目标固定成**最后一个关键姿态（站立）**', { size: 10.5, w: 250, cls: 'demo-x-good' }));
    cond.appendChild(svgText(512, 238, '= 起身技能', 'demo-x-good', 10.5));

    var rew = group(s);
    rectBox(rew, 30, 264, 740, 76, C_WARN, C_SURFACE);
    rew.appendChild(svgMath(230, 292, '\\tilde p = \\frac{\\pi - \\lVert p_{target} - p \\rVert_2}{\\pi},\\quad \\tilde g = \\frac{\\pi - \\arccos(g^\\top g_{target})}{\\pi}', { size: 12, anchor: 'middle', w: 400, display: true }));
    rew.appendChild(svgRich(44, 330, '玩具：关节误差 0.8 rad → **' + fmt(POSE_P, 3) + '**，重力夹角 0.3 rad → **' + fmt(POSE_G, 3) + '**，乘积 **' + fmt(POSE_R, 3) + '**', { size: 10.5, w: 390 }));
    rew.appendChild(svgText(756, 286, '正文写成负的乘积，表 S3 把重力项的', 'demo-x-ink2', 10.5, 'end'));
    rew.appendChild(svgRich(756, 306, '零点写在 $\\pi/2$；按定义取乘积本身', { size: 10.5, anchor: 'end', w: 320 }));
    rew.appendChild(svgText(756, 326, '（我们的推测）', 'demo-x-warn', 10.5, 'end'));

    var cost = group(s);
    chip(cost, 30, 352, 740, '表 S5：$2.4 \\times 10^8$ 步 = 仿真 **70 天**，墙钟 **14 小时**（踢球技能是 580 天 / 158 小时）', C_GOOD, { h: 38, size: 12 });

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      setOpacity(poses, seg(t, 0.3, 0.8));
      keyFigs.forEach(function (g, k) { setOpacity(g, seg(t, 0.5 + k * 0.4, 0.9 + k * 0.4)); });
      // 插值的目标姿态：沿前倒那一串来回
      var w = (Math.sin(now * 0.9) + 1) / 2 * 2;
      var P = w < 1 ? lerpPose(POSE_PRONE, POSE_PUSH, w) : lerpPose(POSE_PUSH, POSE_STAND, w - 1);
      var lift = w < 1 ? HIP.prone + (HIP.push - HIP.prone) * w : HIP.push + (HIP.stand - HIP.push) * (w - 1);
      live.pose(420, 159 - lift * 0.5, P);
      setOpacity(live.el, seg(t, 2.2, 2.8));
      setOpacity(tl, seg(t, 3.6, 4.2));
      tickEls.forEach(function (m, k) { setOpacity(m, seg(t, 4.0 + k * 0.25, 4.2 + k * 0.25)); });
      setOpacity(cond, seg(t, 7.0, 7.6));
      setOpacity(rew, seg(t, 10.4, 11.0));
      setOpacity(cost, seg(t, 13.6, 14.2));
    }
    return { el: s, draw: draw };
  }

  // ── scene 5: 阶段 2 ① 按状态蒸馏 + λ 自动开关 ──
  function buildSceneDistill() {
    var s = sceneSvg('阶段二把两个技能蒸馏进一个策略：站着时向踢球技能做 KL 正则，倒地时向起身技能；权重 lambda 最小化 lambda 乘以预测回报减阈值，回报低于阈值时 lambda 升到 1 等于行为克隆，超过后变成 0 成为纯强化学习');
    s.appendChild(svgText(30, 28, '阶段 2 ①：蒸馏 —— 每个状态只认一个教师，λ 按预测回报自动开关', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'op3-x-arrow-s5', C_MUTED);

    var eq = group(s);
    eq.appendChild(svgMath(400, 62, '(1-\\lambda)\\,\\mathbb{E}_{a\\sim\\pi}\\big[Q(s,a)\\big] \\;-\\; \\lambda\\,\\mathrm{KL}\\big(\\pi_\\theta(\\cdot\\mid s)\\,\\Vert\\,\\pi_{\\text{教师}}(\\cdot\\mid s)\\big)', { size: 13.5, anchor: 'middle', w: 600 }));
    eq.appendChild(svgText(400, 88, '式 2：在 MPO 的策略改进里，把 critic 的 Q 换成这个加权和', 'demo-x-mut', 10.5, 'middle'));

    var router = group(s);
    rectBox(router, 30, 104, 300, 196, C_BORDER, C_SURFACE);
    router.appendChild(svgText(44, 124, '这一刻机器人是什么状态？', 'demo-x-ink2', 11.5));
    var bot = op3(router, C_INK, 0.46);
    router.appendChild(paint(svgEl('line', { x1: 50, y1: 250, x2: 160, y2: 250, 'stroke-width': 1.2 }), null, C_MUTED));
    var upBox = group(router), downBox = group(router);
    rectBox(upBox, 176, 140, 142, 54, C_ACCENT, C_SURFACE2);
    upBox.appendChild(svgRich(247, 162, '直立 $s \\in U$', { size: 11, anchor: 'middle', w: 130 }));
    upBox.appendChild(svgRich(247, 182, '→ 踢球技能 $\\pi_s$', { size: 11, anchor: 'middle', w: 130, cls: 'demo-x-acc' }));
    rectBox(downBox, 176, 212, 142, 54, C_GOOD, C_SURFACE2);
    downBox.appendChild(svgRich(247, 234, '倒地 $s \\notin U$', { size: 11, anchor: 'middle', w: 130 }));
    downBox.appendChild(svgRich(247, 254, '→ 起身技能 $\\pi_g$', { size: 11, anchor: 'middle', w: 130, cls: 'demo-x-good' }));
    router.appendChild(svgText(44, 288, '两个教师管互斥的状态，不混合', 'demo-x-mut', 10.5));

    var lam = group(s);
    rectBox(lam, 346, 104, 424, 196, C_WARN, C_SURFACE);
    lam.appendChild(svgMath(470, 128, 'c(\\lambda) = \\lambda\\,\\big(\\mathbb{E}[Q] - Q_s\\big)', { size: 12.5, anchor: 'middle', w: 220 }));
    lam.appendChild(svgText(756, 128, '式 3 · 梯度下降 · 截断到 [0, 1]', 'demo-x-mut', 10, 'end'));
    var ax = miniAxes(lam, 380, 146, 370, 120, [0, 119], [0, 1.05]);
    var qs = [], lams = [], l = 1;
    for (var i = 0; i < 120; i++) {
      var q = 0.1 + 0.85 / (1 + Math.exp(-(i - 60) / 10));
      l = lambdaStep(l, q, TOY_LAMBDA.qs, TOY_LAMBDA.lr);
      qs.push([ax.sx(i), ax.sy(q)]);
      lams.push([ax.sx(i), ax.sy(l)]);
    }
    var cross = qs.findIndex(function (p) { return p[1] <= ax.sy(TOY_LAMBDA.qs); });
    var bc = paint(svgEl('rect', { x: ax.sx(0), y: 146, width: qs[cross][0] - ax.sx(0), height: 120 }), C_WARN);
    bc.style.opacity = 0.12;
    lam.appendChild(bc);
    lam.appendChild(paint(svgEl('line', { x1: ax.sx(0), y1: ax.sy(TOY_LAMBDA.qs), x2: ax.sx(119), y2: ax.sy(TOY_LAMBDA.qs), 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }), null, C_WARN));
    lam.appendChild(svgRich(ax.sx(119), ax.sy(TOY_LAMBDA.qs) - 6, '阈值 $Q_s$', { size: 10, anchor: 'end', w: 80, cls: 'demo-x-warn' }));
    var qPath = pathLine(lam, qs, C_ACCENT, 2.2);
    var lPath = pathLine(lam, lams, C_GOOD, 2.4);
    var bcTxt = svgText(ax.sx(4), 178, '回报不够：λ → 1，行为克隆', 'demo-x-warn', 10.5);
    lam.appendChild(bcTxt);
    var rlTxt = group(lam);
    rlTxt.appendChild(svgText(ax.sx(118), 234, 'λ → 0', 'demo-x-good', 10.5, 'end'));
    rlTxt.appendChild(svgText(ax.sx(118), 250, '纯 RL', 'demo-x-good', 10.5, 'end'));
    lam.appendChild(svgRich(380, 290, '蓝：预测回报 $\\mathbb{E}[Q]$ · 绿：$\\lambda$ · 曲线是示意，$Q_s = 0.6$ 是玩具数', { size: 10, w: 380, cls: 'demo-x-mut' }));

    var fin = group(s);
    chip(fin, 30, 314, 740, '好过任何简单的技能调度：学会了两个技能之间的切换，也把技能本身微调了（§Distillation）', C_GOOD, { h: 34, size: 11.5 });
    var src = group(s);
    src.appendChild(svgText(400, 372, '自适应权重来自 Abdolmaleki 等人的 kickstarting，与约束 RL 的拉格朗日乘子法密切相关', 'demo-x-mut', 10.5, 'middle'));

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      setOpacity(router, seg(t, 0.3, 0.9));
      // 机器人：站 → 摔 → 躺 → 起，循环
      var cyc = (now % 6) / 6;
      var P, hipY;
      if (cyc < 0.35) { P = POSE_STAND; hipY = 226; }
      else if (cyc < 0.45) { var u = (cyc - 0.35) / 0.1; P = lerpPose(POSE_STAND, POSE_PRONE, u); hipY = 226 + 20 * u; }
      else if (cyc < 0.7) { P = POSE_PRONE; hipY = 246; }
      else { var v = (cyc - 0.7) / 0.3; P = v < 0.5 ? lerpPose(POSE_PRONE, POSE_PUSH, v * 2) : lerpPose(POSE_PUSH, POSE_STAND, v * 2 - 1); hipY = 246 - 20 * v; }
      bot.pose(104, hipY, P);
      var isUp = cyc < 0.4 || cyc > 0.9;
      var shown = t >= 3.6;
      setOpacity(upBox, shown ? (isUp ? 1 : 0.3) : 0);
      setOpacity(downBox, shown ? (isUp ? 0.3 : 1) : 0);
      setOpacity(eq, seg(t, 3.6, 4.2));
      setOpacity(lam, seg(t, 7.0, 7.6));
      drawOn(qPath, ease(seg(t, 7.4, 12.0)));
      drawOn(lPath, ease(seg(t, 7.4, 12.0)));
      setOpacity(bc, 0.12 * seg(t, 8.0, 8.6));
      setOpacity(bcTxt, seg(t, 8.0, 8.6));
      setOpacity(rlTxt, seg(t, 10.4, 11.0));
      setOpacity(fin, seg(t, 13.6, 14.2));
      setOpacity(src, seg(t, 14.4, 15.0));
    }
    return { el: s, draw: draw };
  }

  // ── scene 6: 阶段 2 ② 自博弈 ──
  function buildSceneSelfPlay() {
    var s = sceneSvg('阶段二的设置：只在进球或满 50 秒时结束，开局趴、仰、站各三分之一，倒地出界进禁区每步固定惩罚并忽略正向奖励；对手池等于前四分之一快照加一个未训练的智能体，40 个快照时 11 个对手各 11 分之 1；critic 额外输入对手编号；图 7 消融：全部快照不稳更差，固定 6 个对手略差');
    s.appendChild(svgText(30, 28, '阶段 2 ②：自博弈 —— 对手从自己的前 1/4 快照里抽', 'demo-x-ink2', 13.5));

    var setup = group(s);
    rectBox(setup, 30, 42, 740, 64, C_BORDER, C_SURFACE);
    setup.appendChild(svgText(44, 62, '和踢球技能的场地相同，三处改动：', 'demo-x-ink2', 11.5));
    setup.appendChild(svgText(44, 82, '① 只在有人进球或满 50 s 时结束 ② 开局趴着 / 仰躺 / 站着各 1/3', 'demo-x-ink2', 10.5));
    setup.appendChild(svgText(44, 99, '③ 倒地、出界、进禁区时每步固定惩罚，并忽略所有正向奖励（倒在地上进球，进球那一项也记 0）', 'demo-x-ink2', 10.5));

    var snaps = group(s);
    rectBox(snaps, 30, 118, 470, 128, C_ACCENT, C_SURFACE);
    snaps.appendChild(svgText(44, 138, '训练中定期存快照（玩具：已存 ' + TOY_POOL + ' 个）', 'demo-x-acc', 11.5));
    var dots = [];
    for (var i = 1; i <= TOY_POOL; i++) {
      var c = (i - 1) % 20, r = Math.floor((i - 1) / 20);
      var d = paint(svgEl('rect', { x: 92 + c * 19.5, y: 152 + r * 24, width: 15, height: 18, rx: 3 }), C_BORDER);
      snaps.appendChild(d);
      dots.push(d);
    }
    var untrained = paint(svgEl('circle', { cx: 62, cy: 173, r: 11 }), C_WARN);
    snaps.appendChild(untrained);
    snaps.appendChild(svgText(62, 200, '未训练', 'demo-x-warn', 9.5, 'middle'));
    var pl = poolOf(TOY_POOL, true);
    var poolTxt = svgRich(44, 228, '对手池 = 前 **' + pl.m + '** 个 + 1 个未训练 = **' + pl.size + '** 个，每局均匀抽，每个 **1/' + pl.size + ' ≈ ' + fmt(pl.p, 3) + '**', { size: 11, w: 450 });
    snaps.appendChild(poolTxt);

    var why = group(s);
    rectBox(why, 514, 118, 256, 128, C_GOOD, C_SURFACE);
    why.appendChild(svgText(528, 138, '为什么只取前 1/4', 'demo-x-good', 11.5));
    why.appendChild(svgText(528, 160, '对手强度慢慢上升，训练更稳', 'demo-x-ink2', 10.5));
    why.appendChild(svgText(528, 180, '早期对手弱 → 有足够的控球经验', 'demo-x-ink2', 10.5));
    why.appendChild(svgText(528, 200, '= 一次连续训练里，对历史对手的', 'demo-x-ink2', 10.5));
    why.appendChild(svgText(528, 218, '   混合做最优响应（虚拟博弈 / league）', 'demo-x-ink2', 10.5));
    why.appendChild(svgText(528, 238, '最强对手只到当前进度的约 25%', 'demo-x-mut', 10));

    var critic = group(s);
    chip(critic, 30, 258, 740, '对手一换，同一状态的价值就不同 → **critic 额外输入对手的整数编号**，避免价值函数混叠', C_ACCENT, { h: 34, size: 11.5 });

    var abl = group(s);
    rectBox(abl, 30, 304, 740, 92, C_WARN, C_SURFACE);
    abl.appendChild(svgText(44, 324, '消融（图 7）：每个策略对 6 个固定对手各踢 100 场，先进球者胜、平局算半场胜，5 个种子', 'demo-x-warn', 11));
    var ranks = [['完整方法：前 1/4 快照自博弈 + 技能正则', C_GOOD], ['直接对着这 6 个评测对手训：反而略差', C_ACCENT], ['从全部快照里抽：不稳定、收敛更差', C_BAD], ['不蒸馏、不塑形：滚着进球（图 7B）', C_MUTED]];
    var rankG = ranks.map(function (r, k) {
      var g = group(abl);
      g.appendChild(paint(svgEl('rect', { x: 44 + (k % 2) * 362, y: 336 + Math.floor(k / 2) * 26, width: 8, height: 16, rx: 2 }), r[1]));
      g.appendChild(svgText(58 + (k % 2) * 362, 349 + Math.floor(k / 2) * 26, (k + 1) + '. ' + r[0], 'demo-x-ink2', 10.5));
      return g;
    });

    function draw(t) {
      setOpacity(setup, seg(t, 0.3, 0.9));
      setOpacity(snaps, seg(t, 3.6, 4.0));
      var fillU = seg(t, 3.8, 5.6);
      dots.forEach(function (d, k) {
        var seen = (k + 1) / TOY_POOL <= fillU;
        var inPool = k < pl.m && t >= 6.0;
        d.style.opacity = seen ? 1 : 0;
        d.style.fill = inPool ? C_ACCENT : C_SURFACE2;
      });
      setOpacity(untrained, seg(t, 6.0, 6.4));
      setOpacity(poolTxt, seg(t, 6.0, 6.6));
      setOpacity(why, seg(t, 7.0, 7.6));
      setOpacity(critic, seg(t, 10.4, 11.0));
      setOpacity(abl, seg(t, 13.6, 14.0));
      rankG.forEach(function (g, k) { setOpacity(g, seg(t, 13.8 + k * 0.4, 14.2 + k * 0.4)); });
    }
    return { el: s, draw: draw };
  }

  // ── scene 7: 奖励与安全正则 ──
  function buildSceneReward() {
    var s = sceneSvg('表 S3 完整 1v1 智能体的八项奖励：进球和失球权重 1000，干扰 1，终止 0.5，前进速度 0.1，朝球速度 0.05，直立 0.02，膝关节力矩 0.01；直立奖励倾角小于 0.2 弧度得 1，大于 0.4 弧度得 0，0.3 弧度得 0.5；膝关节惩罚超过 5 牛米的力矩峰值；一局 2000 步，直立满分加起来 40，远小于一次进球 1000');
    s.appendChild(svgText(30, 28, '奖励：表 S3 的八项，两项是被真机逼出来的', 'demo-x-ink2', 13.5));

    var tab = group(s);
    rectBox(tab, 30, 42, 360, 250, C_BORDER, C_SURFACE);
    tab.appendChild(svgText(44, 62, '完整 1v1 智能体的权重（条长按对数画）', 'demo-x-ink2', 11.5));
    var rows = REWARDS.filter(function (r) { return r[4] != null; }).sort(function (a, b) { return b[4] - a[4]; });
    var maxLog = Math.log10(1000), minLog = Math.log10(0.01);
    var bars = rows.map(function (r, k) {
      var y = 74 + k * 24;
      var col = r[1] === 'task' ? C_ACCENT : r[1] === 'safe' ? C_WARN : C_GOOD;
      var g = group(tab);
      g.appendChild(svgText(44, y + 12, r[0], 'demo-x-ink2', 10.5));
      var b = hbar(g, 200, y + 2, 13, col);
      b.full = 16 + ((Math.log10(r[4]) - minLog) / (maxLog - minLog)) * 110;
      var v = svgText(0, y + 13, String(r[4]), 'demo-x-mono', 10);
      g.appendChild(v);
      b.label = v;
      b.group = g;
      b.kind = r[1];
      return b;
    });
    var key = group(tab);
    [['任务', C_ACCENT], ['塑形（探索）', C_GOOD], ['sim-to-real', C_WARN]].forEach(function (r, k) {
      key.appendChild(paint(svgEl('rect', { x: 46 + k * 110, y: 280, width: 10, height: 8, rx: 2 }), r[1]));
      key.appendChild(svgText(60 + k * 110, 288, r[0], 'demo-x-mut', 10));
    });

    // 直立奖励
    var up = group(s);
    rectBox(up, 404, 42, 366, 130, C_WARN, C_SURFACE);
    up.appendChild(svgText(418, 62, '直立：前倾走得快，上真机却常往前栽', 'demo-x-warn', 11.5));
    var ax = miniAxes(up, 440, 74, 200, 70, [0, 0.6], [0, 1.1]);
    var curve = [];
    for (var i = 0; i <= 60; i++) curve.push([ax.sx(i / 100), ax.sy(upright(i / 100))]);
    pathLine(up, curve, C_WARN, 2.2);
    [0, 0.2, 0.4, 0.6].forEach(function (v) { up.appendChild(svgText(ax.sx(v), 158, fmt(v, 1), 'demo-x-mut demo-x-mono', 9, 'middle')); });
    up.appendChild(svgText(660, 158, 'rad', 'demo-x-mut', 9, 'start'));
    var mark = paint(svgEl('circle', { cx: ax.sx(TOY_TILT), cy: ax.sy(upright(TOY_TILT)), r: 4.5 }), C_BAD);
    up.appendChild(mark);
    var markTxt = svgText(ax.sx(TOY_TILT) + 8, ax.sy(upright(TOY_TILT)) - 4, '0.3 rad → ' + fmt(upright(TOY_TILT), 1), 'demo-x-bad', 10);
    up.appendChild(markTxt);
    up.appendChild(svgText(436, ax.sy(1) + 3, '1', 'demo-x-mut demo-x-mono', 9, 'end'));
    var leanFig = op3(up, C_INK, 0.36);
    up.appendChild(svgText(724, 160, '0.2 rad ≈ 11.5°', 'demo-x-mut', 9.5, 'middle'));

    // 膝关节力矩
    var knee = group(s);
    rectBox(knee, 404, 182, 366, 110, C_WARN, C_SURFACE);
    knee.appendChild(svgText(418, 202, '膝关节力矩：冲击把膝关节齿轮打坏', 'demo-x-warn', 11.5));
    var kx = miniAxes(knee, 430, 212, 320, 60, [0, 4], [0, 9]);
    var thr = kx.sy(KNEE_NM);
    knee.appendChild(paint(svgEl('line', { x1: 430, y1: thr, x2: 750, y2: thr, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), null, C_BAD));
    knee.appendChild(svgText(752, thr - 3, '5 Nm', 'demo-x-bad demo-x-mono', 9, 'end'));
    var tq = [], over = [];
    for (var j = 0; j <= 200; j++) {
      var tt = j / 50;
      var v = 2.2 + 1.2 * Math.sin(tt * 6.3) + 4.5 * Math.exp(-Math.pow((tt % 1 - 0.55) * 9, 2));
      tq.push([kx.sx(tt), kx.sy(v)]);
      over.push([kx.sx(tt), kx.sy(Math.max(v, KNEE_NM))]);
    }
    var fillD = 'M ' + kx.sx(0) + ' ' + thr + ' ' + over.map(function (q) { return 'L ' + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' ') + ' L ' + kx.sx(4) + ' ' + thr + ' Z';
    var area = paint(svgEl('path', { d: fillD }), C_BAD);
    area.style.opacity = 0;
    knee.appendChild(area);
    var tqPath = pathLine(knee, tq, C_INK, 1.4);
    knee.appendChild(svgText(430, 286, '正文：惩罚超过 5 Nm 的峰值的时间积分（红色面积，示意）', 'demo-x-mut', 9.5));

    var budget = group(s);
    chip(budget, 30, 304, 740, '一局最多 $50 \\times 40 = $ **' + EP_STEPS + '** 步：每步都拿满的直立奖励加起来也只有 $0.02 \\times ' + EP_STEPS + ' = $ **' + fmt(0.02 * EP_STEPS, 0) + '**，远小于一次进球的 **1000**（按逐步相加估算）', C_ACCENT, { h: 36, size: 11.5 });
    var abl = group(s);
    chip(abl, 30, 350, 740, '消融（图 S4）：去掉前进速度奖励，踢球技能**完全学不会**；权重靠大规模超参数搜索调出来', C_BAD, { h: 36, size: 11.5, dash: '4 3' });

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      setOpacity(tab, seg(t, 0.3, 0.8));
      bars.forEach(function (b, k) {
        var start = b.kind === 'task' ? 0.5 : b.kind === 'shape' ? 3.6 : 7.0;
        var u = ease(seg(t, start + k * 0.15, start + 0.6 + k * 0.15));
        setW(b, b.full * u);
        b.label.setAttribute('x', (206 + b.full * u).toFixed(1));
        setOpacity(b.group, seg(t, start, start + 0.3));
      });
      setOpacity(up, seg(t, 7.0, 7.6));
      setOpacity(mark, seg(t, 8.6, 9.0));
      setOpacity(markTxt, seg(t, 8.6, 9.0));
      var lean = 0.5 + 0.5 * Math.sin(now * 1.3);
      var P = lerpPose(POSE_STAND, POSE_LEAN, lean);
      leanFig.pose(724, 128, P);
      setOpacity(knee, seg(t, 10.4, 11.0));
      drawOn(tqPath, ease(seg(t, 10.6, 12.0)));
      area.style.opacity = 0.6 * seg(t, 12.0, 12.6);
      setOpacity(budget, seg(t, 13.6, 14.2));
      setOpacity(abl, seg(t, 15.0, 15.6));
    }
    return { el: s, draw: draw };
  }

  // ── scene 8: 零样本上真机 ──
  function buildSceneSim2Real() {
    var s = sceneSvg('系统辨识：给挂负载的电机施加不同频率的正弦信号，只拟合阻尼、电枢惯量、摩擦、最大力矩、比例增益五个参数；域随机化每局采一次：摩擦 0.5 到 1，关节偏置正负 2.9 度，IMU 朝向 2 度、位置 5 毫米，外加质量 0.5 公斤，观测延迟 10 到 50 毫秒；每 1 到 3 秒随机推一下；不做这些真机一两步就摔');
    s.appendChild(svgText(30, 28, '零样本上真机：5 个参数的辨识 + 5 类随机化 + 随机推搡', 'demo-x-ink2', 13.5));

    var sys = group(s);
    rectBox(sys, 30, 42, 370, 170, C_ACCENT, C_SURFACE);
    sys.appendChild(svgText(44, 62, '① 系统辨识：正弦激励挂着已知负载的电机', 'demo-x-acc', 11.5));
    var ax = miniAxes(sys, 50, 72, 330, 58, [0, 6], [-1.3, 1.3]);
    var real = [], sim = [];
    for (var i = 0; i <= 240; i++) {
      var tt = i / 40;
      var f = 0.4 + 0.25 * tt; // 频率逐渐升高
      var ph = 2 * Math.PI * (0.4 * tt + 0.125 * tt * tt);
      var amp = 1 / Math.sqrt(1 + Math.pow(f / 1.6, 2));
      real.push([ax.sx(tt), ax.sy(amp * Math.sin(ph - 0.25 * f) + 0.04 * Math.sin(37 * tt))]);
      sim.push([ax.sx(tt), ax.sy(0.9 * amp * Math.sin(ph - 0.25 * f - 0.18))]);
    }
    var realP = pathLine(sys, real, C_INK, 1.4);
    var simP = pathLine(sys, sim, C_ACCENT, 1.6, '4 3');
    sys.appendChild(svgText(380, 140, '实线：真机关节角 · 虚线：仿真（示意）', 'demo-x-mut', 9.5, 'end'));
    var sysTab = group(sys);
    SYSID.forEach(function (r, k) {
      sysTab.appendChild(svgText(50 + (k % 2) * 170, 162 + Math.floor(k / 2) * 17, r[0] + '  ' + r[1], 'demo-x-ink2 demo-x-mono', 10));
    });
    sys.appendChild(svgText(220, 196, '位置控制 + 力矩反馈的执行器模型', 'demo-x-mut', 10));

    var dr = group(s);
    rectBox(dr, 414, 42, 356, 170, C_GOOD, C_SURFACE);
    dr.appendChild(svgText(428, 62, '② 域随机化：每局开头采一次，整局不变', 'demo-x-good', 11.5));
    var drRows = DR.map(function (r, k) {
      var y = 76 + k * 21;
      var g = group(dr);
      g.appendChild(svgText(428, y + 11, r[0], 'demo-x-ink2', 10.5));
      g.appendChild(paint(svgEl('rect', { x: 540, y: y + 4, width: 130, height: 6, rx: 3 }), C_BORDER));
      var m = paint(svgEl('circle', { cx: 540, cy: y + 7, r: 5 }), C_GOOD);
      g.appendChild(m);
      var lo = r[1], hi = r[2];
      g.appendChild(svgText(756, y + 11, (lo < 0 ? '±' + hi : (lo ? lo + '–' : '≤ ') + hi) + (r[3] ? ' ' + r[3] : ''), 'demo-x-mono', 10, 'end'));
      return { g: g, m: m };
    });

    var push = group(s);
    rectBox(push, 30, 222, 370, 116, C_WARN, C_SURFACE);
    push.appendChild(svgText(44, 242, '③ 随机推搡：每 1–3 s 推一次躯干上的随机点', 'demo-x-warn', 11.5));
    push.appendChild(svgText(44, 262, '持续 0.05–0.15 s 的外部冲量（原文写「5 to 15 Nm」）', 'demo-x-ink2', 10.5));
    var walker = op3(push, C_INK, 0.42);
    push.appendChild(paint(svgEl('line', { x1: 60, y1: 326, x2: 380, y2: 326, 'stroke-width': 1 }), null, C_BORDER));
    var arrow = paint(svgEl('path', { d: 'M 0 0 L 26 0 M 18 -6 L 26 0 L 18 6', fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round' }), null, C_BAD);
    push.appendChild(arrow);

    var why = group(s);
    rectBox(why, 414, 222, 356, 116, C_BORDER, C_SURFACE2);
    why.appendChild(svgText(428, 242, '取舍', 'demo-x-ink2', 11.5));
    why.appendChild(svgText(428, 262, '舵机实际控制线圈电压，模型并不精确；', 'demo-x-ink2', 10.5));
    why.appendChild(svgText(428, 280, '作者认为位置控制的高频反馈把失配藏了起来', 'demo-x-ink2', 10.5));
    why.appendChild(svgText(428, 298, '试过直接电流控制：差距太大，零样本失败', 'demo-x-bad', 10.5));
    why.appendChild(svgText(428, 318, '只挑少数几个轴：随机化太多，策略变保守', 'demo-x-ink2', 10.5));

    var fail = group(s);
    chip(fail, 30, 350, 740, '不加随机化和推搡的智能体：上真机**每走一两步就摔**，一个球也进不了', C_BAD, { h: 38, size: 12.5 });

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      setOpacity(sys, seg(t, 0.3, 0.9));
      drawOn(realP, ease(seg(t, 0.6, 3.2)));
      drawOn(simP, ease(seg(t, 1.2, 3.6)));
      setOpacity(sysTab, seg(t, 3.6, 4.2));
      setOpacity(why, seg(t, 4.6, 5.2));
      setOpacity(dr, seg(t, 7.0, 7.6));
      var ep = Math.floor(Math.max(0, now - 7.0) / 1.6);
      drRows.forEach(function (r, k) {
        var rng = mulberry32(100 + ep * 7 + k);
        r.m.setAttribute('cx', (540 + 130 * rng()).toFixed(1));
        setOpacity(r.g, seg(t, 7.2 + k * 0.3, 7.6 + k * 0.3));
      });
      setOpacity(push, seg(t, 10.4, 11.0));
      var cyc = now % 2.2;
      var hit = cyc < 0.3 ? cyc / 0.3 : 0;
      walker.pose(200 + 12 * Math.sin(now * 0.8), 306, lerpPose(K.poseWalk((now * 1.5) % 1), POSE_LEAN, hit * 0.6));
      arrow.setAttribute('transform', 'translate(' + (150 + 12 * Math.sin(now * 0.8) - 10 * hit) + ' 286)');
      setOpacity(arrow, t >= 10.8 ? (cyc < 0.5 ? 1 : 0.15) : 0);
      setOpacity(fail, seg(t, 13.6, 14.2));
    }
    return { el: s, draw: draw };
  }

  // ── scene 9: 和脚本控制器比 ──
  function buildSceneBaseline() {
    var s = sceneSvg('表 1：真机上学到的策略走 0.57 米每秒对脚本 0.20，转身 2.85 对 0.71 弧度每秒，起身 0.93 对 2.52 秒，原地踢球 2.02 对 2.07，助跑 2.77；步态前倾、脚板边缘蹬地、脚跟着地，转身以脚掌一角为支点，13 次摔 3 次；第 1 版论文用另一种测法写的是 156% 和 24%');
    s.appendChild(svgText(30, 28, '四项基本功：和 OP3 自带的脚本控制器比（表 1，真机）', 'demo-x-ink2', 13.5));

    var tab = group(s);
    rectBox(tab, 30, 42, 450, 240, C_BORDER, C_SURFACE);
    tab.appendChild(svgText(44, 62, '灰：脚本基线 · 蓝：学到的策略（真机）· 虚框：同一策略在仿真', 'demo-x-mut', 10.5));
    var rowsG = TABLE1.map(function (r, k) {
      var y = 76 + k * 50;
      var g = group(tab);
      var max = Math.max(r.base, r.real, r.sim, r.runup || 0) * 1.08;
      var W = 250;
      g.appendChild(svgText(44, y + 14, r.name, 'demo-x-ink2', 11.5));
      g.appendChild(svgText(44, y + 30, r.unit, 'demo-x-mut demo-x-mono', 9.5));
      var b0 = hbar(g, 110, y + 2, 12, C_MUTED, 0.7);
      var b1 = hbar(g, 110, y + 17, 12, C_ACCENT);
      var simBox = paint(svgEl('rect', { x: 110, y: y + 16, width: (W * r.sim) / max, height: 14, rx: 2.5, fill: 'none', 'stroke-width': 1.2, 'stroke-dasharray': '3 2' }), null, C_INK);
      g.appendChild(simBox);
      var extra = null;
      if (r.runup) {
        extra = hbar(g, 110, y + 32, 10, C_GOOD);
        extra.full = (W * r.runup) / max;
      }
      b0.full = (W * r.base) / max;
      b1.full = (W * r.real) / max;
      var vTxt = svgText(470, y + 13, fmt(r.base, 2) + ' → ' + fmt(r.real, 2) + (r.runup ? '（助跑 ' + fmt(r.runup, 2) + '）' : ''), 'demo-x-mono', 10, 'end');
      var pTxt = svgText(470, y + 29, r.paper, r.name === '踢球' ? 'demo-x-good' : 'demo-x-acc', 11, 'end');
      g.appendChild(vTxt);
      g.appendChild(pTxt);
      return { g: g, b0: b0, b1: b1, sim: simBox, extra: extra, k: k };
    });

    var how = group(s);
    rectBox(how, 494, 42, 276, 146, C_BORDER, C_SURFACE2);
    how.appendChild(svgText(508, 62, '怎么测的（补充材料）', 'demo-x-ink2', 11.5));
    ['走：各 10 次，取第 2–7 秒的距离', '起身：T 姿态趴下 → 肩部标记到 36 cm', '（站直时 41 cm）', '踢：触球后 0.2 s 球走了多远', '转身：朝向从 ±45° 转到 ±135° 的用时'].forEach(function (str, k) {
      how.appendChild(svgText(508, 84 + k * 20, str, k === 2 ? 'demo-x-mut' : 'demo-x-ink2', 10.5));
    });

    var gait = group(s);
    rectBox(gait, 494, 196, 276, 86, C_ACCENT, C_SURFACE);
    gait.appendChild(svgText(508, 214, '学到的步态更「敢」', 'demo-x-acc', 11.5));
    var scripted = op3(gait, C_MUTED, 0.34), learned = op3(gait, C_ACCENT, 0.34);
    gait.appendChild(svgText(560, 274, '脚本', 'demo-x-mut', 9.5, 'middle'));
    gait.appendChild(svgText(640, 274, '学到的', 'demo-x-acc', 9.5, 'middle'));
    gait.appendChild(svgText(756, 236, '前倾', 'demo-x-ink2', 9.5, 'end'));
    gait.appendChild(svgText(756, 252, '脚板边缘蹬地', 'demo-x-ink2', 9.5, 'end'));
    gait.appendChild(svgText(756, 268, '脚跟着地', 'demo-x-ink2', 9.5, 'end'));

    var turn = group(s);
    chip(turn, 30, 294, 740, '转身以脚掌一角为支点旋转；代价：转身测试里学到的策略 **13 次摔了 3 次**，脚本控制器连续 10 次没摔', C_WARN, { h: 34, size: 11.5 });
    var v1 = group(s);
    chip(v1, 30, 340, 740, 'arXiv 第 1 版写的是走快 **156%**、踢快 **24%**：那一版取任意 1 s 窗口的最大速度（0.27 对 0.69 m/s），正式版换了测法、补了转身', C_BORDER, { h: 46, size: 11 });

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      setOpacity(tab, seg(t, 0.3, 0.8));
      rowsG.forEach(function (r) {
        var a = 3.6 + r.k * 0.5;
        setOpacity(r.g, seg(t, a, a + 0.3));
        setW(r.b0, r.b0.full * ease(seg(t, a, a + 0.6)));
        setW(r.b1, r.b1.full * ease(seg(t, a + 0.3, a + 1.0)));
        setOpacity(r.sim, seg(t, a + 0.8, a + 1.2));
        if (r.extra) setW(r.extra, r.extra.full * ease(seg(t, a + 1.0, a + 1.6)));
      });
      setOpacity(how, seg(t, 7.0, 7.6));
      setOpacity(gait, seg(t, 10.4, 11.0));
      var ph = (now * 1.2) % 1;
      var sp = K.poseWalk(ph);
      sp.lean = 0;
      scripted.pose(560, 252, sp);
      var lp = K.poseWalk((now * 2.2) % 1);
      lp.lean = 18;
      learned.pose(640, 252, lp);
      setOpacity(turn, seg(t, 11.6, 12.2));
      setOpacity(v1, seg(t, 13.6, 14.2));
    }
    return { el: s, draw: draw };
  }

  // ── scene 10: 定位球、对手意识与步法 ──
  function buildSceneSetPiece() {
    var s = sceneSvg('起身射门定位球真机 50 局进 29 个，仿真 35 个；同一策略真机走快 13%、转慢 11%、起身多 28%、踢慢 5%；对手持球时先站到球和自家球门之间，10 次都这样；对手挡在中间时 10 次都绕开、进 9 个，对照 14 次进 13 个；逼近持球对手平均 30 个小碎步，对手不在球旁 20 个大步；转身绕球射门只用 10 步');
    s.appendChild(svgText(30, 28, '行为分析（图 5）：可靠性、对手意识与步法', 'demo-x-ink2', 13.5));

    // A：起身射门
    var A = group(s);
    rectBox(A, 30, 42, 360, 150, C_ACCENT, C_SURFACE);
    A.appendChild(svgText(44, 62, 'A · 起身射门：T 姿态趴着，10 s 内起身进球', 'demo-x-acc', 11.5));
    var pA = pitchView(A, 50, 74, 110);
    var meA = op3(A, C_ACCENT, 0.16);
    meA.pose(pA.sx(-0.9), pA.sy(0) + 2, POSE_PRONE);
    A.appendChild(paint(svgEl('circle', { cx: pA.sx(0), cy: pA.sy(0), r: 3.2 }), '#f5f5f5', '#555'));
    A.appendChild(paint(svgEl('circle', { cx: pA.sx(2.0), cy: pA.sy(1.5), r: 4 }), C_BAD));
    var barsA = [['真机', SETPIECE.real, C_ACCENT], ['仿真', SETPIECE.sim, C_MUTED]].map(function (r, k) {
      var y = 86 + k * 40;
      A.appendChild(svgText(196, y + 11, r[0], 'demo-x-ink2', 10.5));
      var b = hbar(A, 228, y, 14, r[2]);
      b.full = (120 * r[1]) / SETPIECE.n;
      var se = stdErr(r[1], SETPIECE.n) * 120;
      var err = paint(svgEl('line', { x1: 228 + b.full - se, y1: y + 7, x2: 228 + b.full + se, y2: y + 7, 'stroke-width': 1.4 }), null, C_INK);
      A.appendChild(err);
      A.appendChild(svgText(376, y + 26, r[1] + '/50 = ' + fmt((r[1] / SETPIECE.n) * 100, 0) + '%（±' + fmt(stdErr(r[1], SETPIECE.n), 2) + '）', 'demo-x-mono', 9.5, 'end'));
      return { b: b, err: err };
    });
    A.appendChild(svgText(44, 184, '真机每局都起身并踢到球；首次触球 4.7 s（仿真 4.6 s）', 'demo-x-mut', 10));

    // sim vs real
    var gap = group(s);
    rectBox(gap, 404, 42, 366, 150, C_BORDER, C_SURFACE2);
    gap.appendChild(svgText(418, 62, '同一策略：真机相对仿真（表 1）', 'demo-x-ink2', 11.5));
    var gapBars = ['行走', '转身', '起身用时', '踢球'].map(function (name, k) {
      var y = 76 + k * 26, v = SIM_REAL[k];
      gap.appendChild(svgText(418, y + 12, name, 'demo-x-ink2', 10.5));
      var zero = 590;
      gap.appendChild(paint(svgEl('line', { x1: zero, y1: y, x2: zero, y2: y + 18, 'stroke-width': 1 }), null, C_BORDER));
      var b = paint(svgEl('rect', { x: zero, y: y + 3, width: 0, height: 12, rx: 2 }), v > 0 ? C_WARN : C_ACCENT);
      gap.appendChild(b);
      gap.appendChild(svgText(756, y + 12, (v > 0 ? '+' : '−') + Math.abs(v) + '%', 'demo-x-mono', 10.5, 'end'));
      return { b: b, v: v, zero: zero };
    });
    gap.appendChild(svgText(418, 184, '没有哪项出现极端的 sim-to-real 差距', 'demo-x-good', 10.5));

    // B / C / D
    function mini(x, title, sub) {
      var g = group(s);
      rectBox(g, x, 204, 240, 180, C_BORDER, C_SURFACE);
      g.appendChild(svgText(x + 12, 222, title, 'demo-x-ink2', 11));
      g.appendChild(svgText(x + 12, 376, sub, 'demo-x-mut', 9.5));
      return g;
    }
    var B = mini(30, 'B · 拦截：对手持球不动', '10 次都先堵到球与球门的连线上');
    var pB = pitchView(B, 65, 230, 170);
    var oppB = player(pB.g, C_BAD, 6), meB = player(pB.g, C_ACCENT, 6), ballB = ballDot(pB.g, 3.5);
    oppB.at(pB.sx(0.7), pB.sy(0.4), 180);
    ballB.at(pB.sx(0.45), pB.sy(0.35));
    var lineB = paint(svgEl('line', { x1: pB.sx(0.45), y1: pB.sy(0.35), x2: pB.sx(-2.5), y2: pB.sy(0), 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_WARN);
    pB.g.appendChild(lineB);
    var pathBpts = [[1.0, -1.4], [-0.2, -0.9], [-0.8, 0.0], [-0.4, 0.25], [0.15, 0.32]].map(function (q) { return [pB.sx(q[0]), pB.sy(q[1])]; });
    var pathB = pathLine(pB.g, pathBpts, C_ACCENT, 1.8);

    var C = mini(280, 'C · 绕障：对手挡在中间', '10 次都绕开、进 9 个；对照 14 次进 13 个');
    var pC = pitchView(C, 315, 230, 170);
    var oppC = player(pC.g, C_BAD, 6), meC = player(pC.g, C_ACCENT, 6), ballC = ballDot(pC.g, 3.5);
    oppC.at(pC.sx(-0.5), pC.sy(0), 180);
    var pathCpts = [[-2.0, 0], [-1.2, 0.05], [-0.6, 0.75], [0.2, 0.55], [0.85, 0.1], [1.0, 0]].map(function (q) { return [pC.sx(q[0]), pC.sy(q[1])]; });
    var pathC = pathLine(pC.g, pathCpts, C_ACCENT, 1.8);
    var shotC = pathLine(pC.g, [[pC.sx(1.0), pC.sy(0)], [pC.sx(2.5), pC.sy(0.05)]], C_WARN, 1.4, '4 3');

    var D = mini(530, 'D–E · 步法', '逼近持球对手 30 个碎步，追无人球 20 个大步');
    var stepsShort = group(D), stepsLong = group(D);
    D.appendChild(svgText(542, 246, '持球对手', 'demo-x-bad', 10));
    D.appendChild(svgText(542, 296, '无人球', 'demo-x-good', 10));
    for (var i = 0; i < OPP.shortSteps; i++) stepsShort.appendChild(paint(svgEl('circle', { cx: 548 + i * 6.8, cy: 258 + (i % 2 ? 5 : -5), r: 2.4 }), C_BAD));
    for (var j = 0; j < OPP.longSteps; j++) stepsLong.appendChild(paint(svgEl('circle', { cx: 548 + j * 10.2, cy: 308 + (j % 2 ? 6 : -6), r: 2.4 }), C_GOOD));
    D.appendChild(svgText(542, 340, '转身—绕球—转身—射门：约 2 m 只用 10 步，', 'demo-x-ink2', 9.5));
    D.appendChild(svgText(542, 356, '倒数第二步特意迈短', 'demo-x-ink2', 9.5));

    function draw(t) {
      setOpacity(A, seg(t, 0.3, 0.8));
      barsA.forEach(function (r, k) {
        setW(r.b, r.b.full * ease(seg(t, 0.8 + k * 0.4, 1.8 + k * 0.4)));
        setOpacity(r.err, seg(t, 1.8 + k * 0.4, 2.2 + k * 0.4));
      });
      setOpacity(gap, seg(t, 3.6, 4.2));
      gapBars.forEach(function (r, k) {
        var w = Math.abs(r.v) * 4.5 * ease(seg(t, 4.0 + k * 0.3, 4.8 + k * 0.3));
        r.b.setAttribute('x', (r.v > 0 ? r.zero : r.zero - w).toFixed(1));
        setW(r.b, w);
      });
      setOpacity(B, seg(t, 7.0, 7.6));
      var uB = ease(seg(t, 7.6, 10.0));
      drawOn(pathB, uB);
      var pb = K.pointOn(pathBpts, uB);
      meB.at(pb[0], pb[1], 120 - 100 * uB);
      setOpacity(lineB, seg(t, 8.6, 9.2));
      setOpacity(C, seg(t, 10.4, 11.0));
      var uC = ease(seg(t, 10.8, 12.8));
      drawOn(pathC, uC);
      var pc = K.pointOn(pathCpts, uC);
      meC.at(pc[0], pc[1], 0);
      var shot = seg(t, 12.8, 13.4);
      ballC.at(pC.sx(1.1 + 1.4 * shot), pC.sy(0.0 + 0.05 * shot));
      drawOn(shotC, shot);
      setOpacity(D, seg(t, 13.6, 14.2));
      setOpacity(stepsShort, seg(t, 14.0, 14.6));
      setOpacity(stepsLong, seg(t, 14.6, 15.2));
    }
    return { el: s, draw: draw };
  }

  // ── scene 11: 行为嵌入与价值函数 ──
  function valueMap(parent, x, y, w, fn, marks) {
    var h = (w * PITCH_W) / PITCH_L;
    var g = group(parent);
    var nx = 20, ny = 16;
    var cells = [];
    for (var i = 0; i < nx; i++) {
      for (var j = 0; j < ny; j++) {
        var mx = -PITCH_L / 2 + ((i + 0.5) / nx) * PITCH_L, my = PITCH_W / 2 - ((j + 0.5) / ny) * PITCH_W;
        var v = clamp(fn(mx, my), 0, 1);
        var r = paint(svgEl('rect', { x: x + (i * w) / nx, y: y + (j * h) / ny, width: w / nx + 0.3, height: h / ny + 0.3 }), C_WARN);
        r.style.opacity = (0.06 + 0.8 * v).toFixed(2);
        g.appendChild(r);
        cells.push(r);
      }
    }
    g.appendChild(paint(svgEl('rect', { x: x, y: y, width: w, height: h, fill: 'none', 'stroke-width': 1 }), null, C_BORDER));
    function sx(m) { return x + ((m + PITCH_L / 2) / PITCH_L) * w; }
    function sy(m) { return y + ((PITCH_W / 2 - m) / PITCH_W) * h; }
    g.appendChild(paint(svgEl('rect', { x: x + w, y: sy(0.4), width: 4, height: (GOAL_W / PITCH_W) * h }), C_BAD));
    g.appendChild(paint(svgEl('rect', { x: x - 4, y: sy(0.4), width: 4, height: (GOAL_W / PITCH_W) * h }), C_ACCENT));
    (marks || []).forEach(function (m) {
      var dark = m[2] === '#222';
      g.appendChild(paint(svgEl('circle', { cx: sx(m[0]), cy: sy(m[1]), r: m[3] || 3.4, 'stroke-width': dark ? 1.4 : 1 }), m[2], dark ? '#f0f0f0' : '#333'));
    });
    g.sx = sx;
    g.sy = sy;
    return g;
  }

  function buildSceneAnalysis() {
    var s = sceneSvg('图 4：二十维关节轨迹用 UMAP 嵌到三维，脚本步态是圆环，学到的步态是螺旋并分出快慢两支，完整比赛里步态挤成一团、起身和踢球只有四个环；图 6：球朝对方球门走或留在脚下时价值高，对手站在球和对方球门之间时价值低，对手贴着球时高价值区是一道堵在球与自家球门之间的防线');
    s.appendChild(svgText(30, 28, '往里看：关节轨迹的嵌入（图 4）与 critic 的价值图（图 6）', 'demo-x-ink2', 13.5));

    var emb = group(s);
    rectBox(emb, 30, 42, 300, 344, C_BORDER, C_SURFACE);
    emb.appendChild(svgText(44, 62, '20 维关节角轨迹 → UMAP 3 维（示意）', 'demo-x-ink2', 11.5));
    // A 脚本：圆环
    var ringPts = [];
    for (var i = 0; i <= 80; i++) { var a = (i / 80) * 2 * Math.PI; ringPts.push([110 + 42 * Math.cos(a), 122 + 20 * Math.sin(a)]); }
    var ring = pathLine(emb, ringPts, C_MUTED, 2.2);
    emb.appendChild(svgText(180, 118, 'A · 脚本行走：严格周期', 'demo-x-ink2', 10));
    emb.appendChild(svgText(180, 134, '→ 一个圆环', 'demo-x-mut', 10));
    // B 学到的：螺旋 + 两支
    var helix = [], helix2 = [];
    for (var k = 0; k <= 160; k++) {
      var b = (k / 160) * 5 * 2 * Math.PI;
      helix.push([70 + k * 0.62 + 16 * Math.cos(b), 212 + 12 * Math.sin(b)]);
      helix2.push([70 + k * 0.5 + 12 * Math.cos(b * 1.3), 212 + k * 0.18 + 9 * Math.sin(b * 1.3)]);
    }
    var hx = pathLine(emb, helix, C_ACCENT, 1.8);
    var hx2 = pathLine(emb, helix2, C_ACCENT, 1.4, '3 2');
    var kickArc = pathLine(emb, [[170, 206], [200, 180], [236, 192]], C_WARN, 2);
    emb.appendChild(svgText(180, 250, 'B · 踢球技能：螺旋，快慢两支', 'demo-x-ink2', 10));
    emb.appendChild(svgText(244, 196, '踢', 'demo-x-warn', 10));
    // C 1v1：一团 + 4 个环
    var cloud = group(emb);
    var rng = mulberry32(5);
    for (var c = 0; c < 70; c++) {
      var rr = 18 * Math.sqrt(rng()), aa = rng() * 2 * Math.PI;
      cloud.appendChild(paint(svgEl('circle', { cx: 110 + rr * Math.cos(aa), cy: 318 + rr * Math.sin(aa) * 0.8, r: 1.6 }), C_ACCENT));
    }
    var loops = group(emb);
    [[60, 300], [160, 296], [72, 350], [152, 352]].forEach(function (q, n) {
      loops.appendChild(paint(svgEl('ellipse', { cx: q[0], cy: q[1], rx: 15, ry: 9, fill: 'none', 'stroke-width': 1.8 }), null, n < 2 ? C_GOOD : C_WARN));
    });
    emb.appendChild(svgText(186, 316, 'C · 完整 1v1：步态挤成一团，', 'demo-x-ink2', 10));
    emb.appendChild(svgText(186, 332, '起身和踢球只有 4 个环', 'demo-x-ink2', 10));
    emb.appendChild(svgText(186, 350, '（论文推测：起身受了对', 'demo-x-mut', 9.5));
    emb.appendChild(svgText(186, 365, '脚本关键姿态正则的约束）', 'demo-x-mut', 9.5));

    var val = group(s);
    rectBox(val, 344, 42, 426, 344, C_WARN, C_SURFACE);
    val.appendChild(svgText(358, 62, 'critic 的价值（越亮越好，按图 6 的走势示意）', 'demo-x-warn', 11.5));
    function gauss(dx, dy, sx, sy) { return Math.exp(-(dx * dx) / (2 * sx * sx) - (dy * dy) / (2 * sy * sy)); }
    var W = 160;
    var maps = [
      // A：改球速（把一秒后球的位置画成格子）：朝对方球门、或留在脚下
      [358, 76, 'A 改球速：朝对方球门 / 留在脚下', function (x, y) { return 0.85 * gauss(x - 2.2, y, 1.0, 0.7) + 0.6 * gauss(x - 0.1, y, 0.35, 0.35) + 0.1; }, [[0, 0, '#9aa', 4], [0.1, 0, '#f5f5f5', 3], [0, 1.5, '#222', 4]]],
      // B：改对手位置：挡在球和对方球门之间时低
      [566, 76, 'B 改对手位置：挡在球门前就低', function (x, y) { return 0.85 - 0.75 * gauss(x - 1.4, y, 1.0, 0.45) * (x > 0 ? 1 : 0.3); }, [[0, 0, '#9aa', 4], [0.1, 0, '#f5f5f5', 3]]],
      // C：改自己的位置（对手离球远）：能射门的位置高，对手周围低
      [358, 226, 'C 改自己位置（对手离球远）', function (x, y) { return 0.15 + 0.8 * gauss(x + 0.4, y, 0.7, 0.6) - 0.5 * gauss(x - 1.2, y - 1.2, 0.35, 0.35); }, [[0.2, 0, '#f5f5f5', 3], [1.2, 1.2, '#222', 4]]],
      // D：改自己的位置（对手贴着球）：球与自家球门之间的一道防线
      [566, 226, 'D 改自己位置（对手贴着球）', function (x, y) { var d = Math.abs(y - 0.12 * (x + 2.5)) ; return 0.1 + 0.8 * Math.exp(-d * d / 0.08) * (x < 0.3 ? 1 : 0.2); }, [[0.5, 0.35, '#f5f5f5', 3], [0.8, 0.4, '#222', 4]]]
    ];
    var mapGs = maps.map(function (m) {
      var g = group(val);
      g.appendChild(svgText(m[0], m[1] + 8, m[2], 'demo-x-ink2', 10));
      g.vm = valueMap(g, m[0], m[1] + 16, W, m[3], m[4]);
      return g;
    });
    /* B 图的格子是「对手站在这里时的价值」：画一个对手，从亮处走到球门前的暗处 */
    var oppB = paint(svgEl('circle', { r: 4, 'stroke-width': 1.4 }), '#222', '#f0f0f0');
    mapGs[1].appendChild(oppB);
    var oppBTxt = group(mapGs[1]);
    oppBTxt.appendChild(paint(svgEl('rect', { x: -112, y: -11, width: 112, height: 15, rx: 3, opacity: 0.85 }), '#1b1b1f'));
    oppBTxt.appendChild(paint(svgText(-6, 0, '对手站这里 → 价值最低', null, 9, 'end'), '#f0f0f0'));
    val.appendChild(svgText(358, 380, '白：球 · 黑：对手 · 灰：智能体 · 每张图改一样东西，格子 = 它在那里时的价值', 'demo-x-mut', 9.5));

    function draw(t) {
      setOpacity(emb, seg(t, 0.3, 0.8));
      drawOn(ring, ease(seg(t, 0.6, 2.6)));
      drawOn(hx, ease(seg(t, 3.6, 5.6)));
      drawOn(hx2, ease(seg(t, 4.2, 6.0)));
      drawOn(kickArc, ease(seg(t, 5.2, 5.8)));
      setOpacity(cloud, seg(t, 5.6, 6.2));
      setOpacity(loops, seg(t, 6.2, 6.8));
      setOpacity(val, seg(t, 7.0, 7.4));
      [7.0, 10.4, 11.6, 13.6].forEach(function (a, k) { setOpacity(mapGs[k], seg(t, a, a + 0.6)); });
      var vb = mapGs[1].vm, u = ease(seg(t, 10.8, 12.4));
      var ox = vb.sx(0.9 + 0.5 * u), oy = vb.sy(1.3 - 1.3 * u);
      oppB.setAttribute('cx', ox.toFixed(1));
      oppB.setAttribute('cy', oy.toFixed(1));
      setPos(oppBTxt, ox + 12, oy + 20);
      setOpacity(oppBTxt, seg(t, 12.4, 12.8));
    }
    return { el: s, draw: draw };
  }

  // ── scene 12: 局限与之后 ──
  function buildSceneLimits() {
    var s = sceneSvg('局限：要领域知识，只做 sim-to-real，只做小机器人，动捕追球不可靠，髋关节松动编码器失准，名义 25 毫秒常赶不上，舵机没建模、一块电池只能用 5 到 10 分钟，自博弈有时不稳；之后：2 对 2 学会分工，纯视觉用 NeRF 训练，仿真点球 10 次全进，真机 10 次进 6 次、3 次中柱');
    s.appendChild(svgText(30, 28, '局限与之后：论文自己列的问题，和下一步', 'demo-x-ink2', 13.5));

    var lim = group(s);
    rectBox(lim, 30, 42, 430, 296, C_BAD, C_SURFACE);
    lim.appendChild(svgText(44, 62, '§Limitations', 'demo-x-bad', 11.5));
    var items = [
      ['方法', '奖励设计、起身的关键姿态都要领域知识'],
      ['方法', '蒸馏时手动指定每个状态该看齐哪个技能'],
      ['方法', '只做 sim-to-real，没用真机数据；只做小机器人'],
      ['系统', '动捕追球难：只看得到上半球的标记，墙会遮挡'],
      ['系统', '机器人很快变差：髋关节松动、编码器失准'],
      ['系统', '名义 25 ms 一步，实际常常赶不上'],
      ['系统', '舵机没建模：对电量敏感，一块电池 5–10 分钟'],
      ['训练', '自博弈有时不稳；奖励权重靠大规模搜索']
    ];
    var itemG = items.map(function (r, k) {
      var g = group(lim);
      var y = 76 + k * 32;
      rectBox(g, 44, y, 402, 26, C_BORDER, C_SURFACE2);
      g.appendChild(svgText(56, y + 17, r[0], r[0] === '方法' ? 'demo-x-acc' : r[0] === '系统' ? 'demo-x-warn' : 'demo-x-bad', 10.5));
      g.appendChild(svgText(92, y + 17, r[1], 'demo-x-ink2', 10.5));
      return g;
    });

    var fut = group(s);
    rectBox(fut, 474, 42, 296, 296, C_GOOD, C_SURFACE);
    fut.appendChild(svgText(488, 62, '§Future Work（初步结果）', 'demo-x-good', 11.5));
    fut.appendChild(svgText(488, 88, '2v2：学会了分工 —— 队友离球更近', 'demo-x-ink2', 10.5));
    fut.appendChild(svgText(488, 106, '时自己不去抢，但动作没那么敏捷', 'demo-x-ink2', 10.5));
    fut.appendChild(svgText(488, 138, '纯视觉：NeRF 重建实验室 + MuJoCo', 'demo-x-ink2', 10.5));
    fut.appendChild(svgText(488, 156, '渲染球和对手，只用板载 RGB + 本体', 'demo-x-ink2', 10.5));
    fut.appendChild(svgText(488, 182, '点球（10 次）', 'demo-x-mut', 10));
    var vb = [['仿真', VISION.sim, C_MUTED], ['真机', VISION.real, C_GOOD]].map(function (r, k) {
      var y = 194 + k * 30;
      fut.appendChild(svgText(488, y + 12, r[0], 'demo-x-ink2', 10.5));
      var b = hbar(fut, 524, y, 16, r[2]);
      b.full = (180 * r[1]) / VISION.n;
      fut.appendChild(svgText(756, y + 12, r[1] + '/10', 'demo-x-mono', 10.5, 'end'));
      return b;
    });
    fut.appendChild(svgText(488, 270, '真机另有 3 次打中门柱', 'demo-x-mut', 10));
    fut.appendChild(svgText(488, 300, '把动捕换成板载感知，', 'demo-x-ink2', 10.5));
    fut.appendChild(svgText(488, 318, '论文认为是重要方向', 'demo-x-ink2', 10.5));

    var next = group(s);
    chip(next, 30, 350, 740, '本仓库后面的 Agile Striker、Vision-Driven Reactive Soccer 等笔记把这条线推到带噪感知、视觉和全尺寸人形（我们的补充）', C_ACCENT, { h: 38, size: 11.5 });

    function draw(t) {
      setOpacity(lim, seg(t, 0.3, 0.8));
      itemG.forEach(function (g, k) {
        var a = k < 3 ? 0.5 + k * 0.6 : k < 6 ? 3.6 + (k - 3) * 0.8 : 7.0 + (k - 6) * 1.2;
        setOpacity(g, seg(t, a, a + 0.4));
      });
      setOpacity(fut, seg(t, 10.4, 11.0));
      vb.forEach(function (b, k) { setW(b, b.full * ease(seg(t, 11.4 + k * 0.5, 12.4 + k * 0.5))); });
      setOpacity(next, seg(t, 13.6, 14.2));
    }
    return { el: s, draw: draw };
  }

  var SOCCER_SCENES = [
    {
      title: '为什么是足球，为什么不能端到端',
      dur: 17,
      build: buildSceneTask,
      cues: [
        { at: 0.3, s: '引言：四足的学习控制已经做到鲁棒行走、摔倒恢复、带球射门；人形和双足还停在单个基础技能（走、跑、上台阶、跳），最强的人形控制仍是针对性的模型预测控制。人形更难：要稳、要安全、自由度多、好硬件少。' },
        { at: 3.6, s: '1 对 1 足球（简化版：场地 5 m × 4 m、球门宽 0.8 m，没有 RoboCup 的开球、犯规等规则，位置来自动捕）同时要 4 样东西：**敏捷动作**、**技能之间的平滑衔接**、**长程策略**、**对廉价易损硬件的安全**。' },
        { at: 7.0, s: '机器人是 **Robotis OP3**：高 51 cm、重 3.5 kg、20 个 Dynamixel XM430-350-R 舵机，位置控制只用比例项；没有 GPU，网络全在板载 Intel i3 NUC 的 CPU 上跑。' },
        { at: 10.4, s: '直接端到端训会卡在两个局部最优（§Ablations、图 7B）：只给进球 / 失球的稀疏奖励 → 学会**滚到球边、用腿把球拨进门**；加上倒地惩罚等塑形 → **只会站起来不动**，朝球、前进的塑形奖励也救不回来。' },
        { at: 13.6, s: '所以训练分两段：先分别训**踢球**和**起身**两个技能（论文说这是成功所需的最少技能），再**蒸馏**成一个 1v1 智能体并做**自博弈**。只预训两个，是为了把其余行为留给强化学习自己发现。' }
      ]
    },
    {
      title: '一步控制：267 维观测 → 20 维关节目标',
      dur: 17,
      build: buildSceneControl,
      cues: [
        { at: 0.3, s: '观测分两类（表 S2）。**本体**：关节位置 20、IMU 线加速度 3 与角速度 3、Madgwick 滤波估出的重力方向 3、动作滤波器的状态（上一步动作）20，**都堆叠最近 5 步**，共 $5 \\times 49 = 245$ 维，用来应对延迟和偶发的缺失、噪声。' },
        { at: 3.6, s: '**比赛状态**来自动捕：球、对手、两个球门在机器人坐标系下的平面位置 4 × 2，自身速度（堆叠 5 步）、球速度、对手速度，共 22 维；比赛状态不堆叠，以缩小观测空间。合计 **267 维**（逐项相加）。' },
        { at: 7.0, s: '策略是前馈网络（256、256、128，ELU，首层 LayerNorm + tanh），输出 20 维对角高斯；算法是带分布式 critic 的 MPO（DMPO）。每秒 **40** 次，一步 25 ms。' },
        { at: 10.4, s: '动作 = 20 个关节的位置目标，先按表 S1 截断，再过**指数滤波** $u_t = 0.8\\,u_{t-1} + 0.2\\,a_t$ 去掉高频分量。目标从 0 跳到 1，要到第 **11** 步（**275 ms**）才过 0.9。' },
        { at: 13.6, s: '滤波后的目标交给 PID：仿真里输出力矩，真机舵机的位置控制只用比例项。从频率看，这个滤波器的 −3 dB 截止约 **1.43 Hz**，20 Hz 的逐步抖动只剩 **0.111** 倍（我们按传递函数算的）。' }
      ]
    },
    {
      title: '阶段 1 ①：踢球教师',
      dur: 17,
      build: buildSceneSoccerSkill,
      cues: [
        { at: 0.3, s: '第一段先训**踢球技能**：目标是尽可能多进球。每局开始，双方和球随机放在场上，双方都是默认站姿。' },
        { at: 3.6, s: '对手是一个**未训练**的策略，开场几乎立刻摔倒、一直躺着 —— 所以这个技能对对手几乎没有意识，这一点要等阶段 2 的自博弈来补。' },
        { at: 7.0, s: '一局在这些情况下结束：智能体**倒地**、出界、进入球门禁区（图 1 的红色区域）、对手进球，或满 **50 s**。' },
        { at: 10.4, s: '奖励（表 S3 踢球技能一列）：进球 **1000**；朝球速度 0.05、前进速度 0.1 帮助探索；干扰对手 1（离对手 1 m 内还朝对手走就扣分，防止撞人犯规）；直立 0.015 和膝关节力矩 0.01 为真机安全。失球的权重是 0。' },
        { at: 13.6, s: '开销（表 S5）：$2.0 \\times 10^9$ 环境步 = 仿真 **580 天**，靠分布式并行采样，墙钟 **158 小时**。学习曲线平台以后接着训，预判球、踢移动中的球仍会变好。' }
      ]
    },
    {
      title: '阶段 1 ②：起身教师',
      dur: 17,
      build: buildSceneGetup,
      cues: [
        { at: 0.3, s: '**起身技能**不从零摸索：从 OP3 自带的脚本起身动作里，抽出**前倒、后倒各 3 个关键姿态**（图 S2），训练时的目标姿态在关键姿态之间插值。' },
        { at: 3.6, s: '机器人从地上开始，目标平均每 **1.5 s** 重抽一次。间隔服从**指数分布**：换目标的概率与已经过去多久无关，保持马尔可夫性（折合每个 25 ms 控制步约 **1.65%**，我们算的）。' },
        { at: 7.0, s: 'actor 和 critic 都以目标为条件：目标关节角 $p_{target}$ 引向稳定、不自碰撞的姿态；目标重力方向 $g_{target}$（机器人坐标系下，与航向无关）保证它真的要站起来，而不是躺着把关节角摆对。' },
        { at: 10.4, s: '奖励是两项缩放后的相似度相乘。玩具数：关节误差 0.8 rad → $\\tilde p = 0.745$，重力夹角 0.3 rad → $\\tilde g = 0.905$，乘积 **0.674**。正文把奖励写成 $-\\tilde p\\,\\tilde g$，表 S3 又把重力项的零点写在 $\\pi/2$；按定义取乘积本身是我们的推测。' },
        { at: 13.6, s: '训完把条件固定成最后一个关键姿态（站立），就得到起身技能。开销 $2.4 \\times 10^8$ 步 = 仿真 **70 天**、墙钟 **14 小时**，比踢球技能快得多。' }
      ]
    },
    {
      title: '阶段 2 ①：按状态蒸馏，λ 自动开关',
      dur: 17,
      build: buildSceneDistill,
      cues: [
        { at: 0.3, s: '阶段 2 把两个技能**蒸馏**进一个策略。和多数蒸馏不同，两个教师管的是**互斥的状态**：站着时踢球技能有用，倒在地上时起身技能有用。' },
        { at: 3.6, s: '所以每个状态只向一个教师看齐（式 2）：在 MPO 的策略改进里，把 critic 的 Q 换成 $(1-\\lambda)\\,\\mathbb{E}[Q] - \\lambda\\,\\mathrm{KL}(\\pi_\\theta \\Vert \\pi_{\\text{教师}})$；直立（$s \\in U$）时教师是 $\\pi_s$，否则是 $\\pi_g$。' },
        { at: 7.0, s: '权重 $\\lambda$ 不手调：用随机梯度下降最小化 $c(\\lambda) = \\lambda\\,(\\mathbb{E}[Q] - Q_s)$（式 3），再用 softplus 和截断保持在 $[0, 1]$。预测回报低于阈值 $Q_s$ 时 $\\lambda$ 升到 1 —— 等于对教师做**行为克隆**。' },
        { at: 10.4, s: '预测回报超过 $Q_s$ 后 $\\lambda$ 回到 0 —— 变成**纯强化学习**，智能体可以超过教师。图里的回报曲线是示意，$Q_s = 0.6$ 是玩具数；论文没公布阈值和 $\\lambda$ 的轨迹。' },
        { at: 13.6, s: '论文强调它好过任何简单的技能调度：智能体学会了两个技能之间的有效切换，也把技能本身微调了。这套自适应权重来自 Abdolmaleki 等人，和约束 RL 的拉格朗日乘子法密切相关。' }
      ]
    },
    {
      title: '阶段 2 ②：自博弈只取前 1/4 快照',
      dur: 17,
      build: buildSceneSelfPlay,
      cues: [
        { at: 0.3, s: '阶段 2 的场地和踢球技能相同，三处改动：只在**有人进球**或满 50 s 时结束；开局趴着、仰躺、站着各 1/3；倒地、出界或进禁区时每步给固定惩罚，并**忽略所有正向奖励**（倒在地上时进球，进球那一项也记 0）。' },
        { at: 3.6, s: '对手从智能体自己的历史快照里抽：定期存快照，对手池 = **前 1/4 的快照 + 一个未训练的智能体**，每局均匀抽一个。玩具数：存了 40 个快照时，池里是前 10 个 + 1 个，每个被抽到的概率 **1/11**。' },
        { at: 7.0, s: '只取前 1/4，对手强度就慢慢上升，训练更稳；早期对手弱，智能体也能拿到足够的控球经验 —— 自带课程。相当于在一次连续训练里，对历史对手的混合做最优响应（虚拟博弈、league 一类思路）。' },
        { at: 10.4, s: '对手一换，同一个状态的价值就不同；混着对手训练会让价值函数混叠。所以 **critic 额外输入对手的整数编号**。' },
        { at: 13.6, s: '消融（图 7：对 6 个固定对手各踢 100 场，先进球者胜、平局算半场胜，5 个种子）：从**全部快照**抽，不稳定、收敛更差；直接对着这 6 个评测对手训，反而**略差于**自博弈。完整智能体开销 $9.0 \\times 10^8$ 步 = 仿真 262 天、墙钟 68 小时。' }
      ]
    },
    {
      title: '奖励：八项里两项为真机而加',
      dur: 17,
      build: buildSceneReward,
      cues: [
        { at: 0.3, s: '表 S3 列出完整 1v1 智能体的 8 项奖励。任务项：进球 +1、失球 −1，权重都是 **1000**（踢球技能阶段失球权重是 0）。' },
        { at: 3.6, s: '塑形项帮助探索：前进速度 0.1、朝球速度 0.05；干扰对手 1；倒地、出界、进禁区的终止惩罚 0.5。' },
        { at: 7.0, s: '两项是被真机逼出来的。**直立**：智能体爱前倾着走，更快也更动态，上了真机却常常往前栽。于是倾角 < 0.2 rad（11.5°）得 1、> 0.4 rad 或倒置得 0、中间线性，0.3 rad 得 0.5，权重 0.02。' },
        { at: 10.4, s: '**膝关节力矩**：激烈的步态和踢球让脚与地面、与球的冲击打坏膝关节齿轮。正文写的是惩罚 MuJoCo 约束力矩里超过 **5 Nm** 的峰值的时间积分（表 S3 写成膝关节力矩大小），权重 0.01。加上这两项以后，很少再打坏齿轮。' },
        { at: 13.6, s: '一局最多 $50 \\times 40 = 2000$ 步：每步都拿满的直立奖励加起来也只有 $0.02 \\times 2000 = 40$（按逐步相加估算），远小于一次进球的 1000。消融（图 S4）：去掉前进速度奖励，踢球技能**完全学不会**。' }
      ]
    },
    {
      title: '零样本上真机：辨识、随机化、推搡',
      dur: 17,
      build: buildSceneSim2Real,
      cues: [
        { at: 0.3, s: '全部训练都在 MuJoCo 里，然后**零样本**上真机。第一件事是**系统辨识**：给挂着已知负载的电机施加不同频率的正弦信号，在仿真里优化执行器参数去匹配关节角轨迹。' },
        { at: 3.6, s: '执行器模型是「带力矩反馈的位置控制」，只有 5 个参数：阻尼、电枢惯量、摩擦、最大力矩 4.1 Nm、比例增益（数值见画面）。舵机实际控制线圈电压，作者认为位置控制的高频反馈把失配**藏**了起来；直接电流控制则零样本失败。' },
        { at: 7.0, s: '第二件是**域随机化**，每局开头采一次：地面摩擦 0.5–1.0、关节零位偏置 ±2.9°、IMU 安装朝向 ≤ 2° 与位置 ≤ 5 mm、躯干外加质量 ≤ 0.5 kg、观测延迟 10–50 ms。只挑这几个轴：随机化太多，策略会变保守。' },
        { at: 10.4, s: '第三件是**随机推搡**：每 1–3 s，在躯干上随机一点施加持续 0.05–0.15 s 的外部冲量（原文写「5 to 15 Nm」，单位照录）。' },
        { at: 13.6, s: '不加随机化和推搡的智能体，上真机**每走一两步就摔**，一个球也进不了。摘要的总结：足够高的控制频率、有针对性的随机化、训练时的扰动，合起来让迁移可行。' }
      ]
    },
    {
      title: '和脚本控制器比：走快 181%',
      dur: 17,
      build: buildSceneBaseline,
      cues: [
        { at: 0.3, s: '先比四项基本功（表 1）。基线是 OP3 自带的参数化开环轨迹：行走（可转身）在真机上网格搜索了步长、步角、步时；踢球和起身没有可调参数。' },
        { at: 3.6, s: '真机上：走 **0.57** 对 0.20 m/s（+181%），转身 **2.85** 对 0.71 rad/s（+302%），起身 **0.93** 对 2.52 s（用时少 63%）。原地踢球两者都约 2 m/s（2.02 对 2.07）；助跑 2.5 m 后 **2.77** m/s（+34%），最快 3.4 m/s。' },
        { at: 7.0, s: '测法（补充材料）：走路各 10 次，取第 2 到第 7 秒的距离；起身从 T 姿态趴下开始，肩部动捕标记升到 36 cm 就算站起（站直时 41 cm）；踢球看触球后 0.2 s 球走了多远；转身记朝向从 ±45° 转到 ±135° 的用时。' },
        { at: 10.4, s: '学到的步态更激进：身体前倾、用脚板边缘蹬地、脚跟着地、用手臂平衡；转身时以脚掌一角为支点旋转。代价：转身测试里学到的策略 **13 次摔了 3 次**，脚本控制器连续 10 次都没摔。' },
        { at: 13.6, s: '注意版本：arXiv 第 1 版写的是走快 156%、踢快 24%，那一版取任意 1 s 窗口里的最大速度（0.27 对 0.69 m/s）；正式版换了测法、补了转身，才是 181% / 302% / 63% / 34%。' }
      ]
    },
    {
      title: '定位球、对手意识与步法',
      dur: 17,
      build: buildSceneSetPiece,
      cues: [
        { at: 0.3, s: '可靠性（图 5A）：起身射门定位球 —— T 姿态趴在己方半场、球在中圈，对手静止在对方半场角落，10 s 内要起身并进球。各 50 局：真机 **29/50（58%）**，仿真 **35/50（70%）**；真机每局都起身并踢到球，首次触球 4.7 s 对 4.6 s。' },
        { at: 3.6, s: '同一策略在仿真和真机上跑四项基本功：真机走得快 13%、转身慢 11%、起身多用 28% 时间、踢球慢 5%。论文据此认为没有哪项出现极端的 sim-to-real 差距 —— 比和脚本基线的差距小得多。' },
        { at: 7.0, s: '拦截（图 5B）：对手持球不动，10 次里智能体都**先走到球和自家球门的连线上**堵射门，再转身逼近；对手不在球旁的 10 次对照里，它直接去拿球。有的 RoboCup 队伍要手写这种站位，这里是优化任务奖励自己学出来的。' },
        { at: 10.4, s: '绕障（图 5C）：对手站在智能体和球中间（各 1.5 m），10 次都绕开、进 **9** 球；对手在侧边不挡路的 14 次对照里，直接去拿球、进 13 球。' },
        { at: 13.6, s: '步法（图 5D–E）：逼近持球对手时平均 **30 个小碎步**，对手不在球旁时 **20 个大步**冲向球；转身—绕球—转身—射门的反 S 路线约 2 m，只用 **10 步**，倒数第二步特意迈短。' }
      ]
    },
    {
      title: '行为嵌入与价值函数',
      dur: 17,
      build: buildSceneAnalysis,
      cues: [
        { at: 0.3, s: '行为嵌入（图 4）：把 20 维关节角轨迹用 UMAP 嵌到 3 维。脚本行走是正弦式的末端运动、严格周期，嵌入成一个**圆环**，绕圈的角度就是步态相位。' },
        { at: 3.6, s: '学到的步态不再严格周期，嵌入成**螺旋**；快跑和慢走分成不同的分支，踢球是一段平滑的弧。完整 1v1 的长时间比赛里，各种步态挤成一团，起身和踢球却只有 **4 个清晰的环** —— 论文推测起身受了对脚本关键姿态正则的约束，踢球被「尽快甩腿」主导。' },
        { at: 7.0, s: '价值函数（图 6A）：机器人在场地中央 (0, 0) 面向对方球门，球在它前方 0.1 m，对手在 (0, 1.5)。改变球速：球**朝对方球门**跑、或留在自己控制范围内时，critic 给的价值高。' },
        { at: 10.4, s: '图 6B 改对手位置：对手站在**球和对方球门之间**时价值低得多。图 6C 改自己的位置（对手离球远）：价值最高处是能射门的位置，对手周围因为干扰惩罚价值低。' },
        { at: 13.6, s: '图 6D 对手贴着球时，高价值区变成堵在球与自家球门之间的一道**「防线」**，等值线引着智能体走弯路到这条线上 —— 正是图 5B 拦截时看到的走法。热图是按论文图的走势画的示意。' }
      ]
    },
    {
      title: '局限与之后',
      dur: 17,
      build: buildSceneLimits,
      cues: [
        { at: 0.3, s: '方法上的局限（§Limitations）：奖励设计和起身用的手选关键姿态都要领域知识（更动态的平台上很难选）；蒸馏时要手动决定每个状态看齐哪个技能；只做 sim-to-real，没用真机数据；只做了小尺寸机器人。' },
        { at: 3.6, s: '系统层面：动捕追球不可靠（只有上半球的反光贴纸看得到，场边墙会挡，角落尤甚）；机器人很快变差 —— 髋关节松动、编码器失准，要定期维护；控制栈没优化，名义 25 ms 一步，实际常常赶不上。' },
        { at: 7.0, s: '舵机在仿真里当成理想执行器、没有建模：行为对电池电量非常敏感，一块电池实际只能用 **5–10 分钟**。训练上，自博弈有时不稳，奖励权重靠大规模超参数搜索。' },
        { at: 10.4, s: '之后的方向（初步结果）。2v2：学会了分工 —— 队友离球更近时自己不去抢，但动作没那么敏捷。纯视觉：用 NeRF 重建实验室、叠加 MuJoCo 渲染的球和对手，只用板载 RGB 相机加本体训练；仿真点球 10 次全进，真机 10 次进 **6** 次、另有 3 次打中门柱。' },
        { at: 13.6, s: '本仓库后面的 Learning Agile Striker Skills、Learning Vision-Driven Reactive Soccer Skills 等笔记，把这条线推到带噪感知、视觉和全尺寸人形（这一句是我们的补充）。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十二幕动画：OP3 小人形学踢足球全流程速览',
      sub: '约 204 秒自动播放。空格播放/暂停，← → 换幕；数字与下面的三个演示、笔记「具体实例」用的是同一份论文数据，标「玩具」「示意」的不是论文数。',
      ariaLabel: 'OP3 小人形学踢足球十二幕讲解动画',
      notes: [
        '取数依据：第 1、2 幕的 51 cm / 3.5 kg / 20 舵机、5 m × 4 m / 0.8 m、40 Hz 与滤波系数摘自正文 §Environment、§Robot Hardware，267 维是表 S2 各项之和；第 3、4、6 幕的终止条件、关键姿态、1.5 s、开局与对手池摘自 §Training；' +
          '第 3、7 幕的权重摘自表 S3，训练开销摘自表 S5；第 8 幕的 5 个辨识参数、随机化范围与推搡摘自 §Sim-to-Real Transfer；第 9、10 幕的数字摘自表 1、§Behavior Analysis 与补充材料的测法，156% / 24% 摘自 arXiv v1。' +
          '1.43 Hz、0.111、1.65%、2000 步、±0.07 是在论文数字上现算的。',
        '**玩具与示意**：第 2 幕的阶跃输入、第 4 幕的姿态误差、第 5 幕的回报曲线与阈值、第 6 幕的 40 个快照、第 7 幕的 0.3 rad 是笔记构造的玩具数；第 8 幕的辨识曲线、第 11 幕的嵌入与价值热图是按论文图的走势画的示意；OP3 是火柴人示意，不是论文照片。'
      ],
      scenes: SOCCER_SCENES
    });
  }

  // ─── the narrated vertical video of the same twelve scenes ───────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：OP3 小人形学踢足球十二幕全流程',
      sub: '10 分 16 秒 竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十二幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '11.4 MB',
      fileName: 'OP3足球_讲解视频.mp4'
    });
  }

  K.mount({
    'soccer-explainer': buildExplainerDemo,
    'soccer-video': buildVideoDemo,
    'soccer-filter': buildFilterDemo,
    'soccer-lambda': buildLambdaDemo,
    'soccer-pool': buildPoolDemo
  });
})();
