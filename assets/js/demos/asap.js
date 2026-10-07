/* Interactive demos for papers/03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills
 * （He, Gao, Xiao, Zhang 等 · ASAP: Aligning Simulation and Real-World Physics for Learning Agile Humanoid
 *   Whole-Body Skills · arXiv 2502.01143 v3，RSS 2025）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["asap"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   asap-explainer — 十二幕讲解动画：仿真里跳得起来、真机跳不动 → 从人类视频到 G1 参考动作 → 相位跟踪策略 →
 *                    上真机录一遍 → 残差动作模型 → 冻结 Δ 微调、部署时拿掉 → 开环回放（表 III）→
 *                    闭环微调（表 IV）→ 真机只学脚踝（表 V）→ 怎么训 Δ（图 10）→ 怎么用 Δ（图 11）→
 *                    Δ 学到了什么与局限（图 12、13）
 *   asap-video     — 同一套十二幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   asap-delta     — 一个关节的玩具：真机电机更弱 / 有延迟时，仿真回放差多少，拟合出的 Δa 补回多少
 *   asap-tables    — 论文表 III、IV、V 的浏览器：开环、闭环、真机
 *   asap-ablation  — 图 10、12、13：数据量、训练时长、动作范数权重、随机噪声、各关节的 Δ 幅度
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
    button = K.button,
    buttonGroup = K.buttonGroup,
    statsRow = K.statsRow,
    verdictBox = K.verdictBox,
    legend = K.legend,
    note = K.note,
    table = K.table,
    stage = K.stage,
    stageGrid = K.stageGrid,
    begin = K.begin,
    plot = K.plot,
    line = K.line,
    dot = K.dot,
    text = K.text,
    axes = K.axes,
    registerRenderer = K.registerRenderer;

  // ─── 论文里的数字（arXiv 2502.01143 v3；和 v1 逐词比对过，正文与图表相同，v3 只多了一句 RGAT 的相关工作） ───
  /* 表 I–VII、第 II–V 节照抄；图 10、12、13 的柱上标了数，照抄；图 5、图 11 没有标数，是读图近似值。
     官方代码（LeCAR-Lab/ASAP）的数单独标出。十二幕动画、三个演示、配音旁白与笔记「🚶 具体实例」共用这一份。 */
  var DOF = 23, HIST = 5; // 第 II-B 节：23 个关节，本体感受取最近 5 步
  var OBS_STEP = [['关节位置', 23], ['关节速度', 23], ['根角速度', 3], ['重力投影', 3], ['上一步动作', 23]]; // 第 II-B 节
  var TERM = { start: 1.5, end: 0.3 }; // 第 II-B 节 b)：终止阈值从 1.5 m 收紧到 0.3 m
  var STATE_REAL = [['基座位置', 3], ['基座线速度', 3], ['基座朝向（四元数）', 4], ['基座角速度', 3], ['关节位置', 23], ['关节速度', 23]]; // 第 III-A 节
  var REWARD_PRE = [
    // 表 I：预训练的奖励（惩罚 / 正则 / 跟踪）
    ['惩罚', [['关节位置限位', -10.0], ['关节速度限位', -5.0], ['力矩限位', -5.0], ['终止', -200.0]]],
    ['正则', [['力矩', -1e-6], ['动作变化率', -0.5], ['脚的姿态', -2.0], ['脚的朝向', -0.1], ['打滑', -1.0]]],
    ['跟踪', [['身体位置', 1.0], ['VR 三点（头、双手）', 1.6], ['脚的位置', 2.1], ['身体旋转', 0.5], ['身体角速度', 0.5], ['身体速度', 0.5], ['关节位置', 0.75], ['关节速度', 0.5]]]
  ];
  var REWARD_DELTA = [
    // 表 II：训练 Δ 模型的奖励
    ['惩罚', [['关节位置限位', -10.0], ['关节速度限位', -5.0], ['力矩限位', -0.1], ['终止', -200.0]]],
    ['正则', [['动作变化率', -0.01], ['动作范数', -0.2]]],
    ['跟踪', [['身体位置', 1.0], ['VR 三点（头、双手）', 1.0], ['脚的位置', 1.0], ['身体旋转', 0.5], ['身体角速度', 0.5], ['身体速度', 0.5], ['关节位置', 0.5], ['关节速度', 0.5]]]
  ];
  var DR_PRE = { friction: [0.2, 1.1], kp: [0.925, 1.05], delayMs: [20, 40], pushEvery: 10, pushVel: 0.5 }; // 表 VI
  var SYSID = { com: [-0.02, 0, 0.02], mass: [0.95, 1.0, 1.05], pd: [0.95, 1.0, 1.05] }; // 表 VII
  var N_MOTIONS = 43; // 第 IV 节：仿真实验选了 43 段，分简单 / 中等 / 困难三档
  var FAIL_DIST = 0.5; // 第 IV 节：任一时刻身体平均偏离超过 0.5 m 记为失败
  var METHODS = ['开环', 'SysID', 'Delta Dynamics', 'ASAP'];
  var METRIC_NAMES = ['全局位置误差', '根相对 MPJPE', '加速度误差', '根速度误差'];
  var METRIC_UNITS = ['mm', 'mm', 'mm/帧²', 'mm/帧'];
  var HORIZONS = [0.25, 0.5, 1.0];
  var TABLE3 = {
    // 表 III：开环回放。[方法][时长] = [E_g-mpjpe, E_mpjpe, E_acc, E_vel]
    IsaacSim: [
      [[19.5, 15.1, 6.44, 5.8], [33.3, 23.2, 6.8, 6.84], [80.8, 43.5, 10.6, 11.1]],
      [[19.4, 15.0, 6.43, 5.74], [32.1, 22.2, 6.57, 6.56], [77.6, 41.5, 10.2, 10.7]],
      [[24.4, 13.6, 9.43, 7.85], [36.5, 16.4, 8.89, 7.98], [68.1, 21.5, 9.61, 9.14]],
      [[19.9, 15.6, 6.48, 5.86], [26.8, 19.2, 5.09, 5.36], [37.9, 22.9, 4.38, 5.26]]
    ],
    Genesis: [
      [[19.8, 15.3, 6.53, 5.88], [33.1, 23.0, 6.78, 6.82], [82.5, 44.5, 10.8, 11.4]],
      [[19.3, 15.0, 6.42, 5.73], [32.2, 22.3, 6.57, 6.57], [76.5, 41.6, 10.0, 10.5]],
      [[20.0, 12.4, 8.42, 6.89], [27.8, 14.0, 7.63, 6.74], [50.2, 17.2, 8.19, 7.62]],
      [[19.0, 14.9, 6.19, 5.59], [25.9, 18.4, 4.93, 5.19], [36.9, 22.6, 4.23, 5.1]]
    ]
  };
  var LEVELS = ['简单', '中等', '困难'];
  var METHODS4 = ['Oracle', 'Vanilla', 'SysID', 'Delta Dynamics', 'ASAP'];
  var TABLE4 = {
    // 表 IV：闭环（只报均值；± 见笔记）。[难度][方法] = [成功率 %, E_g-mpjpe, E_mpjpe, E_acc, E_vel]；Oracle 是 IsaacGym → IsaacGym，两列相同
    IsaacSim: [
      [[100, 97.5, 43.2, 2.56, 4.48], [100, 107, 45.4, 2.83, 4.59], [100, 105, 47.8, 3.09, 4.98], [100, 127, 56.7, 3.5, 5.56], [100, 106, 44.3, 2.74, 4.46]],
      [[100, 111, 48.8, 2.63, 4.82], [100, 114, 49.2, 2.92, 5.07], [100, 115, 49.1, 3.43, 5.01], [83.3, 151, 68.0, 2.9, 5.9], [100, 112, 49.3, 2.53, 4.45]],
      [[100, 116, 52.5, 3.4, 6.16], [100, 148, 51.6, 4.41, 6.88], [100, 165, 58.4, 4.87, 7.13], [66.7, 137, 60.2, 4.2, 7.1], [100, 129, 56.5, 3.72, 6.52]]
    ],
    Genesis: [
      [[100, 97.5, 43.2, 2.56, 4.48], [100, 140, 70.1, 2.68, 4.65], [100, 127, 79.9, 2.99, 4.95], [83.3, 168, 87.0, 3.08, 5.39], [100, 125, 73.5, 2.1, 4.11]],
      [[100, 111, 48.8, 2.63, 4.82], [94.3, 169, 72.0, 3.26, 5.86], [100, 138, 75.4, 3.14, 5.5], [83.3, 190, 89.4, 3.44, 7.49], [100, 126, 71.2, 2.81, 5.13]],
      [[100, 116, 52.5, 3.4, 6.16], [82.9, 175, 80.7, 3.87, 7.19], [100, 186, 93.0, 4.98, 8.98], [60.0, 190, 89.6, 4.29, 8.7], [100, 129, 77.0, 2.69, 5.65]]
    ]
  };
  var TABLE5 = [
    // 表 V：真机闭环。[动作, Vanilla, ASAP]，各四项
    ['踢球（训练 Δ 时见过）', [61.2, 43.5, 2.96, 2.91], [50.2, 40.1, 2.46, 2.7]],
    ['詹姆斯「消音」（没见过）', [159, 55.3, 3.43, 6.43], [112, 47.5, 2.84, 5.94]]
  ];
  var REAL = { tasks: ['踢球', '前跳', '前后迈步', '单脚平衡', '单脚跳'], runs: 30, clips: 100, need: 400, ankle: 4, broke: 2, locoMin: 10, height: 1.35 }; // 第 IV-C 节、图 9
  var FIG10 = {
    // 图 10（柱上标了数）：开环 MPJPE（绿 / 蓝）与闭环 MPJPE（红），单位 mm
    data: { x: [43, 430, 4300, 43000], inDist: [31.65, 28.35, 28.37, 26.97], outDist: [49.43, 41.33, 39.44, 28.1], closed: [534.02, 104.95, 97.51, 98.15], woIn: 32.2, woOut: 35.8 },
    horizon: {
      x: [0.25, 0.5, 1.0, 1.5],
      heat: [[22.52, 20.86, 19.86, 19.52], [32.81, 31.05, 25.3, 29.98], [86.96, 37.59, 30.82, 27.84], [185.66, 43.04, 40.74, 32.78]], // [评测时长][训练时长]
      closed: [123.43, 118.46, 97.51, 113.28]
    },
    norm: { x: [0, 0.001, 0.01, 0.1, 1.0], open: [45.69, 32.95, 26.74, 25.26, 95.66], closed: [180.97, 169.19, 125.9, 97.51, 176.52] },
    wo: 145.0 // 图 10(b) 的红色虚线：不用 Δ 微调
  };
  var FIG12 = { beta: [0.025, 0.05, 0.1, 0.2, 0.4], label: ['1/40', '1/20', '1/10', '1/5', '2/5'], mpjpe: [182.0, 175.2, 173.5, 201.5, 1208.3], wo: 336.1, asap: 126.9 }; // 图 12
  var FIG13 = [
    // 图 13：IsaacGym → IsaacSim 的 π^Δ 在 4300 段数据上的平均绝对输出。图里两侧各标一列，论文没说哪侧是左腿
    ['肩横滚', 0.014, 0.013], ['肩俯仰', 0.015, 0.017], ['肩偏航', 0.014, 0.011], ['肘', 0.015, 0.015],
    ['髋俯仰', 0.037, 0.038], ['髋横滚', 0.038, 0.039], ['髋偏航', 0.033, 0.033], ['膝', 0.049, 0.049],
    ['踝俯仰', 0.056, 0.054], ['踝横滚', 0.0228, 0.017]
  ];
  var FIG13_WAIST = 0.029; // 腰的横滚 / 俯仰 / 偏航合标一个数
  /* 官方代码（LeCAR-Lab/ASAP，humanoidverse）里的数 */
  var CODE = { simHz: 200, decimation: 4, actionScale: 0.25, ankleKp: 20, ankleKd: 0.2, ankleIdx: [4, 5, 10, 11], deltaEpisode: 1.0, normWeightReadme: -0.1, termDegree: 2.5e-5, fixedIters: 10, gradIters: 2000, gradLr: 0.0002, mlp: [512, 256, 128] };
  var HZ = CODE.simHz / CODE.decimation; // 50 Hz

  function sum(a) {
    return a.reduce(function (x, y) { return x + y; }, 0);
  }
  var N_OBS_STEP = sum(OBS_STEP.map(function (r) { return r[1]; })); // 75
  var N_OBS = N_OBS_STEP * HIST + 1; // 376（加相位 φ）
  var N_STATE_REAL = sum(STATE_REAL.map(function (r) { return r[1]; })); // 59
  /* 终止课程：每次更新乘 (1 − 2.5e-5)，从 1.5 m 收到 0.3 m 要多少次（按官方 README 的参数） */
  var TERM_UPDATES = Math.ceil(Math.log(TERM.start / TERM.end) / -Math.log(1 - CODE.termDegree)); // 64377
  function drop(a, b) {
    return ((a - b) / a) * 100;
  }
  /* 按论文表格的写法显示：整数照写（140、100%），小于 10 的保留两位（5.80），其余照原样（97.5） */
  function pnum(v) {
    return Number.isInteger(v) ? String(v) : v < 10 ? fmt(v, 2) : String(v);
  }

  // ─── 一个关节的玩具（第 5 幕与 asap-delta、笔记第 4–5 步共用） ───────────────────
  /* 一个脚踝俯仰关节：PD 刚度 20、阻尼 0.2 取自官方 G1 配置；转动惯量 0.05、黏滞摩擦 0.6、目标曲线是我们编的。
     仿真 200 Hz、每 4 个子步出一次动作（50 Hz），同官方代码。「真机」只改两样：PD 刚度乘 k（电机更弱），
     动作晚 d 个控制步生效（延迟）。官方代码 delta_a_open_loop.py 里有一行调试注释：真机刚度只有 0.65 倍时，
     完美的 Δa = −0.35 ×（目标 − 当前角度）。这个玩具不是论文的仿真，只演示「把差距写成动作修正」这件事。 */
  var TOY = { kp: CODE.ankleKp, kd: CODE.ankleKd, fric: 0.6, inertia: 0.05, dt: 1 / HZ, sub: CODE.decimation, steps: 100, k: 0.65, delay: 0 };
  var TOY_EX = { target: 0.3, q: 0.1 }; // 第 5 幕与笔记第 4 步的手算：目标 0.30 rad、当前 0.10 rad

  function toyTargets(kind) {
    var out = [];
    for (var i = 0; i < TOY.steps; i++) {
      var t = i * TOY.dt, v;
      if (kind === 'train') {
        v = 0.35 * Math.exp(-Math.pow((t - 0.45) / 0.12, 2)) - 0.25 * Math.exp(-Math.pow((t - 0.8) / 0.1, 2)) +
          0.2 * Math.exp(-Math.pow((t - 1.35) / 0.18, 2)) + 0.08 * Math.sin(2 * Math.PI * 1.6 * t);
      } else {
        v = 0.3 * Math.sin(2 * Math.PI * 0.9 * t) * Math.exp(-0.4 * t) + 0.15 * Math.exp(-Math.pow((t - 1.1) / 0.15, 2));
      }
      out.push(v);
    }
    return out;
  }
  function toyStep(s, target, kp) {
    var q = s[0], v = s[1], h = TOY.dt / TOY.sub;
    for (var j = 0; j < TOY.sub; j++) {
      var tau = kp * (target - q) - TOY.kd * v - TOY.fric * v;
      v += (tau / TOY.inertia) * h;
      q += v * h;
    }
    return [q, v];
  }
  function toyReal(tg, k, delay) {
    var s = [0, 0], tr = [s];
    for (var i = 0; i < tg.length; i++) {
      s = toyStep(s, tg[Math.max(0, i - delay)], k * TOY.kp);
      tr.push(s);
    }
    return tr;
  }
  function toySim(tg, w) {
    var s = [0, 0], tr = [s], ds = [];
    for (var i = 0; i < tg.length; i++) {
      var d = w ? w[0] * (tg[i] - s[0]) + w[1] * s[1] : 0;
      ds.push(d);
      s = toyStep(s, tg[i] + d, TOY.kp);
      tr.push(s);
    }
    return { tr: tr, ds: ds };
  }
  /* 每一步从「真机」状态出发，求让仿真下一步最贴近真机下一步的 Δa（仿真对 Δa 是线性的，一次解出） */
  function toyBestDelta(sr, a, srNext) {
    var s0 = toyStep(sr, a, TOY.kp), s1 = toyStep(sr, a + 1, TOY.kp);
    var g = [s1[0] - s0[0], s1[1] - s0[1]], e = [s0[0] - srNext[0], s0[1] - srNext[1]], W = [1, 0.01];
    return -(W[0] * g[0] * e[0] + W[1] * g[1] * e[1]) / (W[0] * g[0] * g[0] + W[1] * g[1] * g[1]);
  }
  /* Δa ≈ w₁(a − q) + w₂ q̇：用最小二乘代替论文里的 PPO（玩具） */
  function toyFit(tg, real) {
    var a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0, best = [];
    for (var i = 0; i < tg.length; i++) {
      var x = [tg[i] - real[i][0], real[i][1]], y = toyBestDelta(real[i], tg[i], real[i + 1]);
      best.push(y);
      a11 += x[0] * x[0]; a12 += x[0] * x[1]; a22 += x[1] * x[1]; b1 += x[0] * y; b2 += x[1] * y;
    }
    var det = a11 * a22 - a12 * a12;
    return { w: [(b1 * a22 - b2 * a12) / det, (a11 * b2 - a12 * b1) / det], best: best };
  }
  /* 前 H 秒的平均关节角误差（度） */
  function toyErr(trA, trB, H) {
    var n = Math.round(H / TOY.dt), s = 0;
    for (var i = 1; i <= n; i++) s += Math.abs(trA[i][0] - trB[i][0]);
    return ((s / n) * 180) / Math.PI;
  }
  function toyCase(k, delay) {
    var tr = toyTargets('train'), te = toyTargets('test');
    var rTr = toyReal(tr, k, delay), rTe = toyReal(te, k, delay);
    var f = toyFit(tr, rTr);
    return { tr: tr, te: te, rTr: rTr, rTe: rTe, fit: f, simTe: toySim(te), simDTe: toySim(te, f.w), simTr: toySim(tr), simDTr: toySim(tr, f.w) };
  }
  var TOY_BASE = toyCase(TOY.k, TOY.delay);

  // ─── demo 1: 一个关节的 Δa ──────────────────────────────────────────────────
  function buildDeltaDemo(host) {
    var root = card(host, {
      title: '一个关节的残差动作：真机电机更弱、还有延迟时，Δa 能补多少',
      sub:
        '一个脚踝俯仰关节（PD 刚度 20、阻尼 0.2 取自官方 G1 配置，其余是玩具）。「真机」的 PD 刚度只有仿真的 $k$ 倍，动作还可能晚到。' +
        '先在**训练片段**上，每一步从真机状态出发求出最好的 $\\Delta a$，再拟合成 $\\Delta a \\approx w_1(a - q) + w_2\\dot q$；然后在**没见过的测试片段**上开环回放：仿真照搬真机的动作，看加不加 $\\Delta a$ 差多少。'
    });

    var state = { k: TOY.k, delay: TOY.delay, clip: 'test' };
    var ctrls = controlsRow(root);
    var kSlider = slider(ctrls, {
      label: '真机刚度 / 仿真刚度 $k$',
      min: 0.4, max: 1.2, step: 0.05, value: state.k,
      format: function (v) { return fmt(v, 2); },
      onInput: function (v) { state.k = v; render(); }
    });
    var dPick = buttonGroup(ctrls, {
      label: '真机的控制延迟',
      items: [{ label: '0 ms', value: 0 }, { label: '20 ms', value: 1 }, { label: '40 ms', value: 2 }],
      value: state.delay,
      onPick: function (v) { state.delay = v; render(); }
    });
    var cPick = buttonGroup(ctrls, {
      label: '看哪一段',
      items: [{ label: '测试片段（没见过）', value: 'test' }, { label: '训练片段', value: 'train' }],
      value: state.clip,
      onPick: function (v) { state.clip = v; render(); }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '回到笔记的例子', function () {
      state.k = TOY.k; state.delay = TOY.delay; state.clip = 'test';
      kSlider.set(TOY.k, true);
      dPick.pick(TOY.delay, true);
      cPick.pick('test', true);
      render();
    });

    var setLegend = legend(root, [
      { key: 'muted', text: '动作（目标角度）' },
      { key: 'accent', text: '真机' },
      { key: 'bad', text: '仿真开环回放' },
      { key: 'good', text: '仿真 + 拟合的 $\\Delta a$' },
      { key: 'warn', text: '每一步最好的 $\\Delta a$' }
    ]);

    var grid = stageGrid(root);
    var qStage = stage(grid, 250);
    var dStage = stage(grid, 250);

    var stats = statsRow(root);
    var sW = stats.add('拟合的 $w_1$（理想 $k - 1$）');
    var sE1 = stats.add('回放 1 s 的平均误差：不加 $\\Delta a$');
    var sE2 = stats.add('回放 1 s 的平均误差：加 $\\Delta a$');
    var sCut = stats.add('误差少了');
    var verdict = verdictBox(root);

    note(root, [
      '**为什么是 $k - 1$**：PD 力矩 $K_p(a - q)$。真机刚度是 $kK_p$ 时，要让仿真出同样的力矩，得 $K_p(a + \\Delta a - q) = kK_p(a - q)$，即 $\\Delta a = (k - 1)(a - q)$。$k = 0.65$ 时就是官方代码调试注释里那行 $-0.35 \\times$（目标 − 当前角度）。子步里 $q$ 在变、$\\Delta a$ 每个控制步只取一次，所以拟合出来是 ' + fmt(TOY_BASE.fit.w[0], 3) + '，不是正好 −0.35。',
      '**延迟补不全**：$\\Delta a$ 只看当前状态和当前动作（和官方代码一样，Δ 模型的输入里没有历史动作），可延迟让真机执行的是 20 / 40 ms 以前的动作。拟合只能找一个平均意义上的折中，误差降了，但降不到 0。',
      '**这是玩具**：一个关节、线性 PD、用最小二乘代替 PPO、误差单位是度。论文的 Δ 模型是 23 维（真机只学脚踝 4 维）、用 PPO 训练、在整机上算 MPJPE；这里的数不能和论文比。人形机器人回放时误差会因为摔倒而越滚越大（图 5），单关节玩具没有这一层。'
    ]);

    var render = registerRenderer(function () {
      var c = toyCase(state.k, state.delay);
      var tg = state.clip === 'test' ? c.te : c.tr,
        real = state.clip === 'test' ? c.rTe : c.rTr,
        sim = state.clip === 'test' ? c.simTe : c.simTr,
        simD = state.clip === 'test' ? c.simDTe : c.simDTr;
      var e1 = toyErr(sim.tr, real, 1.0), e2 = toyErr(simD.tr, real, 1.0);
      sW.set(fmt(c.fit.w[0], 3) + '（' + fmt(state.k - 1, 2) + '）', 'accent');
      sE1.set(fmt(e1, 2) + '°', 'bad');
      sE2.set(fmt(e2, 2) + '°', 'good');
      sCut.set(e1 > 1e-6 ? fmt(drop(e1, e2), 0) + '%' : '—', e1 > 1e-6 && drop(e1, e2) > 80 ? 'good' : 'warn');

      if (Math.abs(state.k - 1) < 1e-9 && state.delay === 0) {
        verdict.set('➖ $k = 1$、没有延迟：「真机」和仿真一模一样，回放没有误差，$\\Delta a$ 学到 0 —— 这正是动作范数惩罚想要的：没差距就别乱补。', 'frozen');
      } else if (state.delay === 0) {
        verdict.set('✅ 只有刚度差：$\\Delta a$ 几乎正好是 $(k - 1)(a - q)$，回放 1 s 的误差从 ' + fmt(e1, 2) + '° 降到 ' + fmt(e2, 2) +
          '°。这一段' + (state.clip === 'test' ? '拟合时没见过，照样补得上 —— 补的是「电机弱」这条规律，不是某一段动作。' : '是拟合用的训练片段。'), 'learning');
      } else {
        verdict.set('⚠️ 有 ' + state.delay * 20 + ' ms 延迟：$\\Delta a$ 看不到真机正在执行的旧动作，只能补一部分，误差 ' + fmt(e1, 2) + '° → ' + fmt(e2, 2) +
          '°。论文的 Δ 模型同样只看当前状态和动作；预训练时把 20–40 ms 的控制延迟放进了域随机化（表 VI）。', 'frozen');
      }

      var T = TOY.steps * TOY.dt;
      // ── 左：关节角 ──
      var g = begin(qStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 46, r: 12, t: 24, b: 32 }, [0, T], [-0.45, 0.5]);
      axes(g, p, { xTicks: [0, 0.5, 1, 1.5, 2], yTicks: [-0.4, -0.2, 0, 0.2, 0.4], yFmt: function (t) { return fmt(t, 1); }, xLabel: '时间（s）' });
      text(g.ctx, '关节角（rad）：' + (state.clip === 'test' ? '测试片段' : '训练片段'), p.x0, p.y1 - 9, P.muted, 'left', '11px sans-serif');
      [0.25, 0.5, 1.0].forEach(function (H) {
        line(g.ctx, [[p.sx(H), p.y0], [p.sx(H), p.y1]], P.grid, 1, [3, 3]);
      });
      line(g.ctx, tg.map(function (v, i) { return [p.sx(i * TOY.dt), p.sy(v)]; }), P.muted, 1.2, [4, 3]);
      function path(tr) { return tr.map(function (s, i) { return [p.sx(i * TOY.dt), p.sy(clamp(s[0], -0.45, 0.5))]; }); }
      line(g.ctx, path(sim.tr), P.bad, 1.8);
      line(g.ctx, path(simD.tr), P.good, 2.4);
      line(g.ctx, path(real), P.accent, 1.6, [6, 3]);

      // ── 右：Δa ──
      var g2 = begin(dStage);
      var P2 = g2.P;
      var best = state.clip === 'train' ? c.fit.best : (function () {
        var out = [];
        for (var i = 0; i < tg.length; i++) out.push(toyBestDelta(real[i], tg[i], real[i + 1]));
        return out;
      })();
      var lim = Math.max(0.05, Math.max.apply(null, best.concat(simD.ds).map(Math.abs)) * 1.15);
      var p2 = plot(g2, { l: 52, r: 12, t: 24, b: 32 }, [0, T], [-lim, lim]);
      axes(g2, p2, { xTicks: [0, 0.5, 1, 1.5, 2], yTicks: K.niceTicks(-lim, lim, 4), yFmt: function (t) { return fmt(t, 2); }, xLabel: '时间（s）' });
      text(g2.ctx, 'Δa（rad）：每步最好的 vs 拟合的', p2.x0, p2.y1 - 9, P2.muted, 'left', '11px sans-serif');
      line(g2.ctx, [[p2.x0, p2.sy(0)], [p2.x1, p2.sy(0)]], P2.grid, 1);
      line(g2.ctx, best.map(function (v, i) { return [p2.sx(i * TOY.dt), p2.sy(clamp(v, -lim, lim))]; }), P2.warn, 1.6);
      line(g2.ctx, simD.ds.map(function (v, i) { return [p2.sx(i * TOY.dt), p2.sy(clamp(v, -lim, lim))]; }), P2.good, 2.2);

      qStage.canvas.setAttribute('aria-label', '关节角随时间：动作、真机、仿真开环回放、仿真加 Δa');
      dStage.canvas.setAttribute('aria-label', '每一步最好的 Δa 与拟合出的 Δa 随时间变化');
    });

    render();
  }

  // ─── demo 2: 表 III / IV / V 浏览器 ─────────────────────────────────────────
  var TABLE_NOTES = {
    t3: '表 III（开环）：把测试环境里录下的动作拿到 IsaacGym 里回放，看能不能复现那条轨迹。0.25 s 时四种办法都在 20 mm 上下；回放越长，开环与 SysID 的误差越滚越大，ASAP 的全局误差在 1 s 时约是开环的一半。注意：根相对 MPJPE 这一列三个时长都是 Delta Dynamics 最低，ASAP 赢的是全局位置、加速度和速度。',
    t4: '表 IV（闭环）：用各自改造过的训练环境微调策略，再拿到测试环境里跑。ASAP 两个仿真器、三档难度成功率都是 100%；Delta Dynamics 在困难档只有 66.7% / 60%。困难档 Genesis 上 ASAP 的全局误差 129，离只在 IsaacGym 里跑的上限 Oracle（116）不远。但也不是每一格都赢：IsaacSim 简单档 SysID 的全局误差 105 比 ASAP 的 106 低，根相对 MPJPE 有几格是 Vanilla 或 SysID 更低。',
    t5: '表 V（真机）：Δ 模型只学了脚踝 4 个自由度，用 100 段真机数据。踢球是训练 Δ 时见过的动作，詹姆斯「消音」没见过（OOD）。四项指标全部下降：全局误差 61.2 → 50.2（少 18%）、159 → 112（少 30%）。论文只报了均值，没有标准差和试验次数。'
  };

  function buildTablesDemo(host) {
    var root = card(host, {
      title: '论文表格浏览器：开环、闭环、真机',
      sub: '选一张表、一个仿真器、一项指标。数字全部照抄论文表 III–V，越低越好（成功率除外）。'
    });
    var state = { tab: 't3', sim: 'IsaacSim', metric: 0, level: 2 };
    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '哪张表',
      items: [{ label: 'III 开环回放', value: 't3' }, { label: 'IV 闭环微调', value: 't4' }, { label: 'V 真机', value: 't5' }],
      value: state.tab,
      onPick: function (v) { state.tab = v; render(); }
    });
    buttonGroup(ctrls, {
      label: '测试环境（表 III、IV）',
      items: [{ label: 'IsaacSim', value: 'IsaacSim' }, { label: 'Genesis', value: 'Genesis' }],
      value: state.sim,
      onPick: function (v) { state.sim = v; render(); }
    });
    buttonGroup(ctrls, {
      label: '难度（表 IV）',
      items: LEVELS.map(function (n, k) { return { label: n, value: k }; }),
      value: state.level,
      onPick: function (v) { state.level = v; render(); }
    });
    buttonGroup(ctrls, {
      label: '哪项指标',
      items: METRIC_NAMES.map(function (n, k) { return { label: n, value: k }; }),
      value: state.metric,
      onPick: function (v) { state.metric = v; render(); }
    });

    var setLegend = legend(root, [
      { key: 'muted', text: '开环 / Vanilla' },
      { key: 'warn', text: 'SysID' },
      { key: 'accent', text: 'Delta Dynamics' },
      { key: 'good', text: 'ASAP' }
    ]);
    var barStage = stage(root, 270);
    var stats = statsRow(root);
    var sA = stats.add('ASAP');
    var sB = stats.add('对照');
    var sC = stats.add('ASAP 少了');
    var tb = table(root);
    var verdict = verdictBox(root);

    note(root, [
      '**四项指标**（第 IV 节）：全局身体位置误差 $E_{\\text{g-mpjpe}}$（mm）、根相对的 MPJPE $E_{\\text{mpjpe}}$（mm）、加速度误差 $E_{\\text{acc}}$（mm/帧²）、根速度误差 $E_{\\text{vel}}$（mm/帧），对所有动作取平均。成功的定义：跟踪过程中任一时刻身体平均偏离超过 ' + FAIL_DIST + ' m 就算失败。',
      '**表 III 和表 IV 的数不能互相比**：开环是「复现一条已录好的轨迹」，闭环是「微调后的策略在测试环境里自己跑」。仿真实验用 ' + N_MOTIONS + ' 段动作，表 IV 里的 ± 是论文给的标准差（见笔记），这里只画均值。',
      '**论文结论说「真机上最多降 52.7%」，表 V 里找不到这个数**（四项最大降幅 29.6%）。按表格现算，最接近的是表 III（仿真到仿真的开环回放）IsaacSim 1 s 的全局误差 53.1%、根速度 52.6% —— 这是我们的核对，不是论文的说明。'
    ]);

    var COLS = ['muted', 'warn', 'accent', 'good'];
    var render = registerRenderer(function () {
      var g = begin(barStage);
      var P = g.P;
      setLegend(P);
      var mi = state.metric;
      var groups, title, ref, asap;
      if (state.tab === 't3') {
        title = '表 III · ' + state.sim + ' · ' + METRIC_NAMES[mi] + '（' + METRIC_UNITS[mi] + '）';
        groups = HORIZONS.map(function (h, j) {
          return { name: '回放 ' + h + ' s', bars: TABLE3[state.sim].map(function (m, k) { return { v: m[j][mi], c: COLS[k], n: METHODS[k] }; }) };
        });
        asap = TABLE3[state.sim][3][2][mi];
        ref = TABLE3[state.sim][0][2][mi];
        sB.set('开环 1 s：' + pnum(ref), 'bad');
        sA.set('1 s：' + pnum(asap), 'good');
      } else if (state.tab === 't4') {
        title = '表 IV · ' + state.sim + ' · ' + METRIC_NAMES[mi] + '（' + METRIC_UNITS[mi] + '）· 虚线 = Oracle';
        groups = LEVELS.map(function (n, j) {
          var rows = TABLE4[state.sim][j];
          return {
            name: n, oracle: rows[0][mi + 1],
            bars: rows.slice(1).map(function (r, k) { return { v: r[mi + 1], c: COLS[k], n: METHODS4[k + 1], succ: r[0] }; })
          };
        });
        asap = TABLE4[state.sim][state.level][4][mi + 1];
        ref = TABLE4[state.sim][state.level][1][mi + 1];
        sB.set(LEVELS[state.level] + ' · Vanilla：' + pnum(ref), 'bad');
        sA.set(LEVELS[state.level] + '：' + pnum(asap), 'good');
      } else {
        title = '表 V · 真机 G1 · ' + METRIC_NAMES[mi] + '（' + METRIC_UNITS[mi] + '）';
        groups = TABLE5.map(function (r) {
          return { name: r[0], bars: [{ v: r[1][mi], c: 'muted', n: 'Vanilla' }, { v: r[2][mi], c: 'good', n: 'ASAP' }] };
        });
        asap = TABLE5[1][2][mi];
        ref = TABLE5[1][1][mi];
        sB.set('「消音」Vanilla：' + pnum(ref), 'bad');
        sA.set('「消音」：' + pnum(asap), 'good');
      }
      sC.set(fmt(drop(ref, asap), 1) + '%', drop(ref, asap) > 0 ? 'good' : 'bad');

      var top = 0;
      groups.forEach(function (gr) { gr.bars.forEach(function (b) { top = Math.max(top, b.v); }); if (gr.oracle) top = Math.max(top, gr.oracle); });
      top *= 1.18;
      var p = plot(g, { l: 46, r: 12, t: 26, b: 40 }, [0, groups.length], [0, top]);
      axes(g, p, { yTicks: K.niceTicks(0, top, 4), yFmt: function (t) { return fmt(t, t < 10 ? 1 : 0); } });
      text(g.ctx, title, p.x0, p.y1 - 10, P.muted, 'left', '11px sans-serif');
      var slot = (p.x1 - p.x0) / groups.length;
      groups.forEach(function (gr, i) {
        var n = gr.bars.length, bw = Math.min(30, (slot * 0.8) / n), x0 = p.x0 + slot * i + (slot - bw * n) / 2;
        gr.bars.forEach(function (b, k) {
          var x = x0 + k * bw, y = p.sy(b.v);
          g.ctx.fillStyle = P[b.c];
          g.ctx.globalAlpha = 0.88;
          g.ctx.fillRect(x + 2, y, bw - 4, p.y0 - y);
          g.ctx.globalAlpha = 1;
          text(g.ctx, fmt(b.v, b.v < 10 ? 2 : b.v < 100 ? 1 : 0), x + bw / 2, y - 4, P.text, 'center', '9.5px sans-serif');
          if (b.succ != null && b.succ < 100) text(g.ctx, pnum(b.succ) + '%', x + bw / 2, p.y0 - 6, P.surface, 'center', 'bold 9px sans-serif');
        });
        if (gr.oracle) line(g.ctx, [[p.x0 + slot * i + 4, p.sy(gr.oracle)], [p.x0 + slot * (i + 1) - 4, p.sy(gr.oracle)]], P.text, 1.4, [5, 3]);
        text(g.ctx, gr.name, p.x0 + slot * (i + 0.5), p.y0 + 16, P.text, 'center', '11px sans-serif');
      });
      barStage.canvas.setAttribute('aria-label', title + ' 的分组柱状图');

      tb.clear();
      if (state.tab === 't3') {
        tb.row(['时长', '方法'].concat(METRIC_NAMES), true);
        HORIZONS.forEach(function (h, j) {
          METHODS.forEach(function (m, k) { tb.row([h + ' s', m].concat(TABLE3[state.sim][k][j].map(pnum))); });
        });
      } else if (state.tab === 't4') {
        tb.row(['难度', '方法', '成功率'].concat(METRIC_NAMES), true);
        LEVELS.forEach(function (n, j) {
          METHODS4.forEach(function (m, k) {
            var r = TABLE4[state.sim][j][k];
            tb.row([n, m, pnum(r[0]) + '%'].concat(r.slice(1).map(pnum)));
          });
        });
      } else {
        tb.row(['动作', '方法'].concat(METRIC_NAMES), true);
        TABLE5.forEach(function (r) {
          tb.row([r[0], 'Vanilla'].concat(r[1].map(pnum)));
          tb.row([r[0], 'ASAP'].concat(r[2].map(pnum)));
        });
      }
      verdict.set(TABLE_NOTES[state.tab], 'learning');
    });
    render();
  }

  // ─── demo 3: 图 10 / 12 / 13 ────────────────────────────────────────────────
  var ABL_NOTES = {
    data: '图 10(a)：只有 43 段数据时，Δ 模型训歪了，拿它微调出来的策略闭环误差 534 —— 比完全不微调（145）还糟 3.7 倍。430 段以后就够用；4300 → 43000 段闭环误差 97.51 → 98.15，正文说「只降了 0.65%」，图上其实是涨了 0.66%（我们按图读）。数据越多，没见过的动作（蓝）开环误差越低。',
    horizon: '图 10(b)：Δ 训练时每段 rollout 跑多长。开环（热图）总体是训得越长越准，但不是每一格：评测 0.5 s 时训 1.0 s 最低（25.30）。闭环在 1.0 s 最好（97.51），1.5 s 回到 113.28。训 0.25 s 的模型回放 1.5 s 误差 185.66 —— 只学过短程，长程就崩。',
    norm: '图 10(c)：动作范数惩罚的权重。0 时 Δ 不受约束，闭环 180.97，比不微调还差；0.1 最好（开环 25.26、闭环 97.51）；1.0 时 Δ 被压得太小，开环 95.66、闭环 176.52。论文表 II 写的是 −0.2，官方 README 示例命令是 −0.1，和图里的最优 0.1 不一致。',
    noise: '图 12：微调时不用 Δ，改成给动作加均匀噪声 $\\beta\\,\\delta_a$，$\\delta_a \\sim U[0, 1]$，在 Genesis 里测。$\\beta$ 在 0.025–0.2 之间比不微调（336.1）好，最好 173.5；ASAP 是 126.9。$\\beta$ = 0.4 时 1208.3。正文写「噪声最好 150」，和图里的 173.5 对不上（图注写 173），我们按图读。',
    joints: '图 13：IsaacGym → IsaacSim 的 Δ 模型在 4300 段数据上各关节的平均绝对输出。下肢普遍比上肢大，踝俯仰最大（0.056 / 0.054），肩部只有 0.011–0.017；两侧并不对称（踝横滚 0.0228 对 0.017）。这种有结构的差距，均匀噪声补不了。'
  };

  function buildAblationDemo(host) {
    var root = card(host, {
      title: '怎么训、怎么用 Δ：图 10、12、13',
      sub: '五组分析，柱上的数照抄论文图里的标注（单位 mm，越低越好）。红色虚线是不用 Δ 微调的策略。'
    });
    var state = { panel: 'data' };
    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '看哪一组',
      items: [
        { label: '图 10(a) 数据量', value: 'data' },
        { label: '图 10(b) 训练时长', value: 'horizon' },
        { label: '图 10(c) 动作范数权重', value: 'norm' },
        { label: '图 12 随机噪声', value: 'noise' },
        { label: '图 13 各关节', value: 'joints' }
      ],
      value: state.panel,
      onPick: function (v) { state.panel = v; render(); }
    });
    var setLegend = legend(root, [
      { key: 'good', text: '开环 MPJPE（见过的动作）' },
      { key: 'accent', text: '开环 MPJPE（没见过的动作）' },
      { key: 'bad', text: '闭环 MPJPE / 不用 Δ 的基线' },
      { key: 'warn', text: '随机噪声微调' }
    ]);
    var grid = stageGrid(root);
    var leftStage = stage(grid, 260);
    var rightStage = stage(grid, 260);
    var verdict = verdictBox(root);
    note(root, [
      '**设置**：图 10 是 IsaacGym 训练、IsaacSim 采数据和测试；默认配置是 4300 段数据、训练时长 1.0 s、动作范数权重 0.1，所以三幅图里都有一根 97.51。图 12 在 Genesis 里测，所以「不微调」的基线是 336.1，和图 10 的 145 不是一回事。',
      '**图 11 没有标数**（MPJPE 随时间的曲线），见笔记和动画第 11 幕的读图示意。'
    ]);

    function bars(g, p, xs, vals, color, labels, fmtD) {
      var slot = (p.x1 - p.x0) / xs.length;
      xs.forEach(function (x, i) {
        var v = vals[i], bx = p.x0 + slot * i + slot * 0.2, bw = slot * 0.6, y = p.sy(Math.min(v, p.yMax));
        g.ctx.fillStyle = color;
        g.ctx.globalAlpha = 0.85;
        g.ctx.fillRect(bx, y, bw, p.y0 - y);
        g.ctx.globalAlpha = 1;
        text(g.ctx, fmt(v, fmtD == null ? 2 : fmtD), bx + bw / 2, y - 4, g.P.text, 'center', '9.5px sans-serif');
        text(g.ctx, labels[i], bx + bw / 2, p.y0 + 15, g.P.text, 'center', '10.5px sans-serif');
      });
    }
    function pairBars(g, p, labels, a, b, ca, cb) {
      var slot = (p.x1 - p.x0) / labels.length;
      labels.forEach(function (lab, i) {
        [[a[i], ca, 0], [b[i], cb, 1]].forEach(function (it) {
          var bw = slot * 0.32, bx = p.x0 + slot * i + slot * 0.16 + it[2] * bw, y = p.sy(it[0]);
          g.ctx.fillStyle = it[1];
          g.ctx.globalAlpha = 0.85;
          g.ctx.fillRect(bx, y, bw - 2, p.y0 - y);
          g.ctx.globalAlpha = 1;
          text(g.ctx, fmt(it[0], 2), bx + bw / 2, y - 4, g.P.text, 'center', '9px sans-serif');
        });
        text(g.ctx, lab, p.x0 + slot * (i + 0.5), p.y0 + 15, g.P.text, 'center', '10.5px sans-serif');
      });
    }

    var render = registerRenderer(function () {
      var g = begin(leftStage), g2 = begin(rightStage);
      var P = g.P;
      setLegend(P);
      var pan = state.panel, p, p2;
      if (pan === 'data') {
        p = plot(g, { l: 42, r: 10, t: 26, b: 34 }, [0, 4], [0, 60]);
        p.yMax = 60;
        axes(g, p, { yTicks: [0, 20, 40, 60] });
        text(g.ctx, '开环 MPJPE：数据段数', p.x0, p.y1 - 10, P.muted, 'left', '11px sans-serif');
        pairBars(g, p, ['43', '430', '4300', '43000'], FIG10.data.inDist, FIG10.data.outDist, P.good, P.accent);
        line(g.ctx, [[p.x0, p.sy(FIG10.data.woOut)], [p.x1, p.sy(FIG10.data.woOut)]], P.accent, 1.2, [4, 3]);
        line(g.ctx, [[p.x0, p.sy(FIG10.data.woIn)], [p.x1, p.sy(FIG10.data.woIn)]], P.good, 1.2, [4, 3]);
        p2 = plot(g2, { l: 46, r: 10, t: 26, b: 34 }, [0, 4], [0, 600]);
        p2.yMax = 600;
        axes(g2, p2, { yTicks: [0, 200, 400, 600] });
        text(g2.ctx, '闭环 MPJPE（红虚线：不用 Δ 微调 145）', p2.x0, p2.y1 - 10, P.muted, 'left', '11px sans-serif');
        bars(g2, p2, FIG10.data.x, FIG10.data.closed, P.bad, ['43', '430', '4300', '43000']);
        line(g2.ctx, [[p2.x0, p2.sy(FIG10.wo)], [p2.x1, p2.sy(FIG10.wo)]], P.bad, 1.4, [5, 4]);
      } else if (pan === 'horizon') {
        /* 左：热图（评测时长 × 训练时长） */
        p = plot(g, { l: 56, r: 10, t: 26, b: 34 }, [0, 4], [0, 4]);
        text(g.ctx, '开环 MPJPE 热图：行 = 评测时长，列 = 训练时长', p.x0 - 46, p.y1 - 10, P.muted, 'left', '11px sans-serif');
        var cw = (p.x1 - p.x0) / 4, ch = (p.y0 - p.y1) / 4;
        FIG10.horizon.heat.forEach(function (row, r) {
          row.forEach(function (v, c) {
            var x = p.x0 + c * cw, y = p.y0 - (r + 1) * ch;
            g.ctx.fillStyle = P.accent;
            g.ctx.globalAlpha = clamp(0.12 + (Math.log(v) - Math.log(19)) / (Math.log(190) - Math.log(19)) * 0.85, 0.12, 0.97);
            g.ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
            g.ctx.globalAlpha = 1;
            text(g.ctx, fmt(v, 2), x + cw / 2, y + ch / 2 + 4, P.text, 'center', '10px sans-serif');
          });
          text(g.ctx, FIG10.horizon.x[r] + ' s', p.x0 - 6, p.y0 - (r + 0.5) * ch + 4, P.muted, 'right', '10px sans-serif');
        });
        FIG10.horizon.x.forEach(function (h, c) { text(g.ctx, h + ' s', p.x0 + (c + 0.5) * cw, p.y0 + 15, P.text, 'center', '10.5px sans-serif'); });
        p2 = plot(g2, { l: 46, r: 10, t: 26, b: 34 }, [0, 4], [0, 160]);
        p2.yMax = 160;
        axes(g2, p2, { yTicks: [0, 40, 80, 120, 160] });
        text(g2.ctx, '闭环 MPJPE：训练时长（红虚线 145）', p2.x0, p2.y1 - 10, P.muted, 'left', '11px sans-serif');
        bars(g2, p2, FIG10.horizon.x, FIG10.horizon.closed, P.bad, FIG10.horizon.x.map(function (h) { return h + ' s'; }));
        line(g2.ctx, [[p2.x0, p2.sy(FIG10.wo)], [p2.x1, p2.sy(FIG10.wo)]], P.bad, 1.4, [5, 4]);
      } else if (pan === 'norm') {
        var labs = FIG10.norm.x.map(function (x) { return String(x); });
        p = plot(g, { l: 42, r: 10, t: 26, b: 34 }, [0, 5], [0, 110]);
        p.yMax = 110;
        axes(g, p, { yTicks: [0, 50, 100] });
        text(g.ctx, '开环 MPJPE：动作范数权重', p.x0, p.y1 - 10, P.muted, 'left', '11px sans-serif');
        bars(g, p, FIG10.norm.x, FIG10.norm.open, P.good, labs);
        p2 = plot(g2, { l: 46, r: 10, t: 26, b: 34 }, [0, 5], [0, 200]);
        p2.yMax = 200;
        axes(g2, p2, { yTicks: [0, 50, 100, 150, 200] });
        text(g2.ctx, '闭环 MPJPE：动作范数权重（红虚线 145）', p2.x0, p2.y1 - 10, P.muted, 'left', '11px sans-serif');
        bars(g2, p2, FIG10.norm.x, FIG10.norm.closed, P.bad, labs);
        line(g2.ctx, [[p2.x0, p2.sy(FIG10.wo)], [p2.x1, p2.sy(FIG10.wo)]], P.bad, 1.4, [5, 4]);
      } else if (pan === 'noise') {
        p = plot(g, { l: 46, r: 10, t: 26, b: 34 }, [0, 5], [0, 400]);
        p.yMax = 400;
        axes(g, p, { yTicks: [0, 100, 200, 300, 400] });
        text(g.ctx, '闭环 MPJPE：噪声幅度 β（Genesis）', p.x0, p.y1 - 10, P.muted, 'left', '11px sans-serif');
        bars(g, p, FIG12.beta, FIG12.mpjpe, P.warn, FIG12.label, 1);
        line(g.ctx, [[p.x0, p.sy(FIG12.wo)], [p.x1, p.sy(FIG12.wo)]], P.bad, 1.4, [5, 4]);
        line(g.ctx, [[p.x0, p.sy(FIG12.asap)], [p.x1, p.sy(FIG12.asap)]], P.good, 1.6, [5, 4]);
        text(g.ctx, '不微调 336.1', p.x1 - 4, p.sy(FIG12.wo) - 5, P.bad, 'right', '10px sans-serif');
        text(g.ctx, 'ASAP 126.9', p.x1 - 4, p.sy(FIG12.asap) + 13, P.good, 'right', '10px sans-serif');
        text(g.ctx, '↑ 1208.3（顶出画面）', p.x0 + ((p.x1 - p.x0) * 4.5) / 5, p.y1 + 14, P.warn, 'center', '10px sans-serif');
        p2 = plot(g2, { l: 46, r: 10, t: 26, b: 34 }, [0, 3], [0, 360]);
        p2.yMax = 360;
        axes(g2, p2, { yTicks: [0, 100, 200, 300] });
        text(g2.ctx, '三者并排', p2.x0, p2.y1 - 10, P.muted, 'left', '11px sans-serif');
        bars(g2, p2, [0, 1, 2], [FIG12.wo, Math.min.apply(null, FIG12.mpjpe), FIG12.asap], P.accent, ['不微调', '最好的噪声', 'ASAP'], 1);
      } else {
        /* 图 13：两侧各一列 */
        var names = FIG13.map(function (r) { return r[0]; });
        p = plot(g, { l: 56, r: 12, t: 26, b: 24 }, [0, 0.06], [0, names.length]);
        text(g.ctx, '各关节 Δ 的平均幅度（图中一侧）', p.x0 - 46, p.y1 - 10, P.muted, 'left', '11px sans-serif');
        p2 = plot(g2, { l: 56, r: 12, t: 26, b: 24 }, [0, 0.06], [0, names.length]);
        text(g2.ctx, '另一侧（腰 R/P/Y 合计 ' + FIG13_WAIST + '）', p2.x0 - 46, p2.y1 - 10, P.muted, 'left', '11px sans-serif');
        [[g, p, 1], [g2, p2, 2]].forEach(function (it) {
          var gg = it[0], pp = it[1], col = it[2], rh = (pp.y0 - pp.y1) / names.length;
          FIG13.forEach(function (r, i) {
            var y = pp.y1 + i * rh, v = r[col], isLeg = i >= 4;
            gg.ctx.fillStyle = isLeg ? gg.P.bad : gg.P.accent;
            gg.ctx.globalAlpha = 0.85;
            gg.ctx.fillRect(pp.x0, y + 3, pp.sx(v) - pp.x0, rh - 6);
            gg.ctx.globalAlpha = 1;
            text(gg.ctx, r[0], pp.x0 - 6, y + rh / 2 + 4, gg.P.text, 'right', '10.5px sans-serif');
            text(gg.ctx, String(v), pp.sx(v) + 4, y + rh / 2 + 4, gg.P.text, 'left', '10px sans-serif');
          });
        });
      }
      verdict.set(ABL_NOTES[pan], pan === 'joints' || pan === 'noise' ? 'learning' : 'frozen');
      leftStage.canvas.setAttribute('aria-label', '消融分析左图');
      rightStage.canvas.setAttribute('aria-label', '消融分析右图');
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
    polyPath = K.polyPath,
    pointOn = K.pointOn,
    stickFigure = K.stickFigure;

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_MUTED = X.muted,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2,
    C_INK2 = X.ink2;
  var C_METHOD = [C_MUTED, C_WARN, C_ACCENT, C_GOOD]; // 开环 / Vanilla、SysID、Delta Dynamics、ASAP

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

  /* 按比例 u ∈ [0, 1] 把一条折线「画出来」 */
  function drawOn(path, u) {
    if (!path.lenCache) path.lenCache = path.getTotalLength ? path.getTotalLength() || 1 : 1;
    path.setAttribute('stroke-dasharray', path.lenCache + ' ' + path.lenCache);
    path.setAttribute('stroke-dashoffset', (path.lenCache * (1 - u)).toFixed(1));
  }

  /* 竖柱：底边固定在 yBase，高度随动画长 */
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

  function dotAt(parent, cx, cy, r, color) {
    var c = paint(svgEl('circle', { cx: cx, cy: cy, r: r }), color);
    parent.appendChild(c);
    return c;
  }

  function moveDot(c, p) {
    c.setAttribute('cx', p[0].toFixed(1));
    c.setAttribute('cy', p[1].toFixed(1));
  }

  /* 这十二幕在视频里一幕要讲五十秒到一分钟，画面不能停：draw(t, clock) 的 clock 是这一幕的真实时间
     （旁白比分镜长时 t 会停在一段的末尾，clock 照走），所以跳跃、回放、流动这类循环动作都按 clock 画；
     网页播放器只传 t，clock 就退回 t。公式尽量换成会动的图，每幕最多留一条。 */
  function nowOf(t, clock) {
    return clock == null ? t : clock;
  }

  // ── G1 火柴人：站、蹲、起跳、腾空、落地（示意，不是论文的动作数据） ──
  var POSE_STAND = { lean: 2, armA: [-12, 8], armB: [12, 24], legA: [4, 0], legB: [-4, 0] };
  var POSE_CROUCH = { lean: 30, armA: [-52, -30], armB: [-40, -20], legA: [50, -40], legB: [44, -44] };
  var POSE_TAKEOFF = { lean: 12, armA: [160, 150], armB: [150, 140], legA: [-8, -12], legB: [-14, -18] };
  var POSE_TUCK = { lean: 14, armA: [118, 100], armB: [108, 90], legA: [72, -6], legB: [64, -16] };
  var POSE_LAND = { lean: 26, armA: [62, 84], armB: [52, 74], legA: [46, -36], legB: [40, -40] };
  var POSE_STUMBLE = { lean: 52, armA: [96, 118], armB: [72, 96], legA: [64, -54], legB: [16, -26] };
  /* 前踢（表 V 的真机动作之一是 Kick）：面朝 +x，先提膝、再伸腿、再收回；躯干后仰、两臂一前一后配重，支撑腿微屈。
     角度都从竖直向下量、朝 +x 为正：膝的弯曲 = 大腿角 − 小腿角 ≥ 0，肘的弯曲 = 小臂角 − 大臂角 ≥ 0，不会反关节 */
  var POSE_CHAMBER = { lean: -6, armA: [-30, -8], armB: [30, 72], legA: [85, 10], legB: [4, -4] };
  var POSE_KICK = { lean: -14, armA: [-40, -15], armB: [35, 80], legA: [72, 66], legB: [4, -4] };

  function lerp(a, b, u) {
    return a + (b - a) * u;
  }
  function lerpPose(A, B, u) {
    function pair(p, q) { return [lerp(p[0], q[0], u), lerp(p[1], q[1], u)]; }
    return { lean: lerp(A.lean, B.lean, u), armA: pair(A.armA, B.armA), armB: pair(A.armB, B.armB), legA: pair(A.legA, B.legA), legB: pair(A.legB, B.legB) };
  }
  /* 髋离地多高：两条腿竖直方向更长的那条 */
  function hipHeight(P) {
    function ext(l) { return 24 * Math.cos((l[0] * Math.PI) / 180) + 24 * Math.cos((l[1] * Math.PI) / 180); }
    return Math.max(ext(P.legA), ext(P.legB));
  }
  /* 一次前跳，u ∈ [0, 1)：返回姿态、前进比例 x（0…1）、腾空高度 h（px，未缩放）。weak = 真机电机弱：跳得近、落地踉跄 */
  function jumpAt(u, weak) {
    var H = weak ? 16 : 46, land = weak ? POSE_STUMBLE : POSE_LAND;
    if (u < 0.18) return { P: lerpPose(POSE_STAND, POSE_CROUCH, ease(u / 0.18)), x: 0, h: 0 };
    if (u < 0.28) return { P: lerpPose(POSE_CROUCH, POSE_TAKEOFF, ease((u - 0.18) / 0.1)), x: 0, h: 0 };
    if (u < 0.62) {
      var f = (u - 0.28) / 0.34;
      var P = f < 0.5 ? lerpPose(POSE_TAKEOFF, POSE_TUCK, ease(f / 0.5)) : lerpPose(POSE_TUCK, land, ease((f - 0.5) / 0.5));
      return { P: P, x: f, h: H * Math.sin(Math.PI * f) };
    }
    if (u < 0.78) return { P: lerpPose(land, POSE_CROUCH, ease((u - 0.62) / 0.16)), x: 1, h: 0 };
    if (u < 0.92) return { P: lerpPose(POSE_CROUCH, POSE_STAND, ease((u - 0.78) / 0.14)), x: 1, h: 0 };
    return { P: POSE_STAND, x: 1, h: 0 };
  }
  /* 一次前踢，u ∈ [0, 1)：站 → 提膝 → 伸腿 → 停一下 → 收回提膝 → 落脚站好 */
  function kickAt(u) {
    if (u < 0.12) return POSE_STAND;
    if (u < 0.32) return lerpPose(POSE_STAND, POSE_CHAMBER, ease((u - 0.12) / 0.2));
    if (u < 0.44) return lerpPose(POSE_CHAMBER, POSE_KICK, ease((u - 0.32) / 0.12));
    if (u < 0.54) return POSE_KICK;
    if (u < 0.66) return lerpPose(POSE_KICK, POSE_CHAMBER, ease((u - 0.54) / 0.12));
    if (u < 0.86) return lerpPose(POSE_CHAMBER, POSE_STAND, ease((u - 0.66) / 0.2));
    return POSE_STAND;
  }
  /* 火柴人的 12 个点（局部坐标，髋在原点）：头、颈、两肘、两手、髋、两膝、两脚、胸 —— 第 2 幕重定向的示意 */
  function limb(p, len, ang) {
    var r = (ang * Math.PI) / 180;
    return [p[0] + len * Math.sin(r), p[1] + len * Math.cos(r)];
  }
  function jointsOf(P) {
    var hip = [0, 0], sh = limb(hip, 42, 180 - P.lean), head = limb(sh, 15, 180 - P.lean), chest = limb(hip, 24, 180 - P.lean);
    var eA = limb(sh, 20, P.armA[0]), eB = limb(sh, 20, P.armB[0]);
    var kA = limb(hip, 24, P.legA[0]), kB = limb(hip, 24, P.legB[0]);
    return [head, sh, eA, eB, limb(eA, 18, P.armA[1]), limb(eB, 18, P.armB[1]), hip, kA, kB, limb(kA, 24, P.legA[1]), limb(kB, 24, P.legB[1]), chest];
  }
  /* 一个能缩放的火柴人：put(x, groundY, P, h, sc) 把脚放在地面上；joints() 给出上一次摆好的 12 个点 */
  function robot(parent, color, scale, dashed) {
    var fig = stickFigure(color, 2.6, dashed, 0.5);
    var g = svgEl('g', {});
    g.appendChild(fig.el);
    parent.appendChild(g);
    var last = { x: 0, y: 0, sc: scale, P: POSE_STAND };
    return {
      g: g,
      put: function (x, groundY, P, h, sc) {
        var k = sc == null ? scale : sc;
        fig.pose(0, 0, P);
        var y = groundY - (hipHeight(P) + (h || 0)) * k;
        last = { x: x, y: y, sc: k, P: P };
        g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + k.toFixed(3) + ')');
      },
      joints: function () {
        return jointsOf(last.P).map(function (q) { return [last.x + q[0] * last.sc, last.y + q[1] * last.sc]; });
      }
    };
  }

  /* ── scene 1: 仿真里跳得起来，真机上跳不动 ── */
  function buildSceneProblem() {
    var s = sceneSvg('上面是仿真里的 G1，一跳 1.5 米；下面是真机，电机弱、跳不远还踉跄。三条老路：系统辨识要先定参数空间，域随机化让策略变保守，学动力学模型只在无人机和小车上验证过。ASAP 学残差动作模型，分四步：仿真预训练、真机录轨迹、训练 Δa、冻结 Δ 微调后部署时拿掉');
    s.appendChild(svgText(30, 28, '同一个跳跃策略：仿真里跳得起来，真机上跳不动', 'demo-x-ink2', 13.5));

    var left = group(s);
    var lanes = [
      { y0: 44, ground: 122, name: '仿真（IsaacGym）：电机按模型出力', color: C_GOOD, weak: false, dist: 230, mark: '1.5 m' },
      { y0: 148, ground: 226, name: '真机（Unitree G1）：电机没那么强', color: C_ACCENT, weak: true, dist: 112, mark: '差一大截' }
    ];
    lanes.forEach(function (L) {
      rectBox(left, 30, L.y0, 372, 98, C_BORDER, C_SURFACE2);
      left.appendChild(svgText(42, L.y0 + 18, L.name, 'demo-x-mut', 10.5));
      left.appendChild(paint(svgEl('line', { x1: 42, y1: L.ground, x2: 390, y2: L.ground, 'stroke-width': 1.4 }), null, C_BORDER));
      left.appendChild(paint(svgEl('line', { x1: 76, y1: L.ground - 6, x2: 76, y2: L.ground + 6, 'stroke-width': 2 }), null, C_MUTED));
      L.landTick = paint(svgEl('line', { x1: 76 + L.dist, y1: L.ground - 8, x2: 76 + L.dist, y2: L.ground + 6, 'stroke-width': 2.4 }), null, L.color);
      left.appendChild(L.landTick);
      L.label = paint(svgText(76 + L.dist, L.ground + 16, L.mark, L.weak ? 'demo-x-bad' : 'demo-x-good', 11, 'middle'), L.weak ? C_BAD : C_GOOD);
      left.appendChild(L.label);
      L.fig = robot(left, L.color, 0.62, false);
    });
    var gapArrow = group(left);
    var gapMk = K.arrowMarker(s, 'asap-x-arrow-gap', C_BAD);
    arrowPath(gapArrow, [[76 + lanes[1].dist + 34, 238], [76 + lanes[0].dist - 2, 238]], C_BAD, gapMk, '4 3', 1.6);
    gapArrow.appendChild(paint(svgEl('line', { x1: 76 + lanes[0].dist, y1: 128, x2: 76 + lanes[0].dist, y2: 232, 'stroke-width': 1, 'stroke-dasharray': '2 3' }), null, C_BAD));
    gapArrow.appendChild(svgText(76 + (lanes[0].dist + lanes[1].dist) / 2 + 26, 258, '动力学差距', 'demo-x-bad', 10.5, 'middle'));

    function card3(y, title, sub, color) {
      var g = group(s);
      rectBox(g, 420, y, 350, 62, color, C_SURFACE, '4 3');
      g.appendChild(paint(svgText(434, y + 22, title, null, 12), color));
      g.appendChild(svgText(434, y + 44, sub, 'demo-x-mut', 10.5));
      return g;
    }
    var cSys = card3(44, '老路一：系统辨识（SysID）', '先定好辨识哪些参数；真实差距常在参数空间之外', C_WARN);
    var sysDot = dotAt(cSys, 720, 75, 5, C_BAD);
    rectBox(cSys, 690, 58, 40, 32, C_WARN, 'none', '3 3');
    var cDr = card3(116, '老路二：域随机化（DR）', '参数撒一大片，策略学得处处保守，丢了敏捷', C_WARN);
    var drFigs = [0, 1, 2].map(function (k) {
      var f = robot(cDr, C_MUTED, 0.4, false);
      f.k = k;
      return f;
    });
    var cDyn = card3(188, '老路三：用真机数据学动力学模型', '只在无人机、小车这类低维系统上成功过', C_WARN);
    var drone = group(cDyn);
    drone.appendChild(paint(svgEl('rect', { x: -14, y: -3, width: 28, height: 6, rx: 3 }), C_MUTED));
    [-14, 14].forEach(function (dx) {
      drone.appendChild(paint(svgEl('line', { x1: dx - 8, y1: -7, x2: dx + 8, y2: -7, 'stroke-width': 2 }), null, C_MUTED));
    });

    var plan = group(s);
    rectBox(plan, 30, 272, 740, 120, C_ACCENT, C_SURFACE);
    plan.appendChild(svgRich(46, 294, 'ASAP 的第四条路：不改仿真参数，学一个**残差动作模型** $\\Delta a$ —— 把差距写成「动作该补多少」', { size: 12, w: 720, cls: 'demo-x-ink2' }));
    var steps = ['① 仿真里预训练跟踪策略', '② 上真机录轨迹', '③ 训练残差动作模型', '④ 冻结 Δ 微调，部署时拿掉'];
    var stepMk = K.arrowMarker(s, 'asap-x-arrow-plan', C_ACCENT);
    var stepNodes = steps.map(function (str, k) {
      var x = 46 + k * 182;
      var g = chip(plan, x, 318, k === 3 ? 172 : 160, str, k === 2 ? C_GOOD : C_BORDER, { h: 34, size: 11 });
      if (k < 3) arrowPath(plan, [[x + 162, 335], [x + 180, 335]], C_ACCENT, stepMk);
      return g;
    });
    plan.appendChild(svgText(46, 380, '图 2：第一阶段 ①，第二阶段 ②–④', 'demo-x-mut', 10));
    var planBar = paint(svgEl('rect', { x: 46, y: 356, width: 160, height: 4, rx: 2 }), C_ACCENT);
    plan.appendChild(planBar);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.8));
      lanes.forEach(function (L) {
        var u = (now / 3.2) % 1, J = jumpAt(u, L.weak);
        L.fig.put(76 + J.x * L.dist, L.ground, J.P, J.h);
        var shown = J.x >= 1 ? 1 : 0.15;
        setOpacity(L.landTick, shown);
        setOpacity(L.label, shown);
      });
      setOpacity(gapArrow, seg(t, 1.6, 2.2));
      setOpacity(cSys, seg(t, 3.6, 4.2));
      var a = now * 1.3;
      moveDot(sysDot, [710 + 22 * Math.cos(a), 74 + 12 * Math.sin(a * 1.7)]);
      setOpacity(cDr, seg(t, 7.0, 7.6));
      drFigs.forEach(function (f) {
        var wob = 0.5 + 0.5 * Math.sin(now * (1.4 + 0.3 * f.k) + f.k);
        f.put(690 + f.k * 30, 172, lerpPose(POSE_STAND, POSE_CROUCH, 0.25 + 0.25 * wob), 0);
      });
      setOpacity(cDyn, seg(t, 8.6, 9.2));
      drone.setAttribute('transform', 'translate(' + (700 + 30 * Math.sin(now * 0.9)).toFixed(1) + ' ' + (220 + 6 * Math.sin(now * 2.3)).toFixed(1) + ')');
      setOpacity(plan, seg(t, 10.4, 11.0));
      stepNodes.forEach(function (g, k) { setOpacity(g, seg(t, 13.4 + k * 0.5, 13.9 + k * 0.5)); });
      /* 四步依次亮一下：一条短横线在当前那一步下面 */
      var kNow = Math.floor(Math.max(now - 13.4, 0) / 1.2) % 4;
      planBar.setAttribute('x', (46 + kNow * 182).toFixed(1));
      planBar.setAttribute('width', kNow === 3 ? 172 : 160);
      setOpacity(planBar, t >= 15.4 ? 1 : 0);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 从人类视频到 G1 参考动作 ── */
  var S2_STATIONS = [
    ['自己拍的视频', 'C 罗、科比、詹姆斯…'],
    ['TRAM 重建', '视频 → 三维动作与轨迹'],
    ['MaskedMimic 清洗', '物理跟踪器，跟不上就扔'],
    ['两步重定向', '体型 → 姿态'],
    ['G1 动作库', '43 段做仿真实验']
  ];
  function buildSceneData() {
    var s = sceneSvg('自己拍人做招牌动作的视频，用 TRAM 从日常视频估计三维动作和人在世界里的轨迹（SMPL 参数），在 IsaacGym 里用基于物理的动作跟踪器 MaskedMimic 照着做一遍，跟不上的（示意：估计出的身体悬空）扔掉，再分两步重定向到 G1：先优化体型 β′ 让 12 个对应部位在静止姿态下贴近，再逐帧优化姿态；仿真实验选了 43 段，分简单、中等、困难三档');
    s.appendChild(svgText(30, 28, '参考动作从哪来：拍视频 → 重建 → 物理清洗 → 重定向', 'demo-x-ink2', 13.5));

    var line1 = group(s);
    var STX = [30, 182, 334, 486, 638];
    var stationNodes = S2_STATIONS.map(function (st, k) {
      var g = group(line1);
      rectBox(g, STX[k], 46, 132, 62, k === 2 ? C_WARN : k === 4 ? C_GOOD : C_BORDER, C_SURFACE2);
      g.appendChild(svgText(STX[k] + 66, 70, st[0], 'demo-x-ink2', 12, 'middle'));
      g.appendChild(svgText(STX[k] + 66, 92, st[1], 'demo-x-mut', 10.5, 'middle'));
      return g;
    });
    var belt = group(line1);
    belt.appendChild(paint(svgEl('line', { x1: 40, y1: 140, x2: 760, y2: 140, 'stroke-width': 3, 'stroke-dasharray': '10 6' }), null, C_BORDER));
    /* 片段一个个往右流；每 4 段里有 1 段在物理清洗这一站掉下去。每段画一个不同的定格：前踢、提膝单脚站、下蹲 */
    var CLIPS = 9, SPEED = 60, CLIP_POSES = [POSE_KICK, POSE_CHAMBER, POSE_CROUCH];
    var tokens = [];
    for (var i = 0; i < CLIPS; i++) {
      var g = group(belt);
      var r = rectBox(g, -15, -11, 30, 22, C_ACCENT, C_SURFACE);
      var f = robot(g, C_ACCENT, 0.17, false);
      f.put(0, 8, CLIP_POSES[i % 3], 0);
      tokens.push({ g: g, r: r, bad: i % 4 === 2, k: i });
    }

    /* 3.6–10.4：下半屏先用两块小图讲清 TRAM 与 MaskedMimic 各干什么，10.4 之后让位给重定向和动作库 */
    var tram = group(s);
    rectBox(tram, 30, 172, 360, 220, C_BORDER, C_SURFACE2);
    tram.appendChild(svgText(44, 194, 'TRAM：日常视频 → 三维动作 + 世界里的轨迹', 'demo-x-ink2', 11.5));
    rectBox(tram, 44, 210, 116, 120, C_MUTED, C_SURFACE);
    tram.appendChild(paint(svgEl('path', { d: 'M 52 218 l 8 4.5 l -8 4.5 Z' }), C_MUTED));
    tram.appendChild(paint(svgEl('line', { x1: 50, y1: 312, x2: 154, y2: 312, 'stroke-width': 1 }), null, C_BORDER));
    var vidFig = robot(tram, C_MUTED, 0.5, false);
    tram.appendChild(svgText(102, 348, '视频：只有 2D 画面', 'demo-x-mut', 10, 'middle'));
    arrowPath(tram, [[166, 272], [192, 272]], C_ACCENT, K.arrowMarker(s, 'asap-x-arrow-tram', C_ACCENT));
    tram.appendChild(paint(svgEl('path', { d: 'M 198 360 L 380 360 L 352 292 L 226 292 Z', 'stroke-width': 1 }), C_SURFACE, C_BORDER));
    tram.appendChild(paint(svgText(289, 222, '三维姿态 + 世界坐标下的轨迹', null, 10.5, 'middle'), C_ACCENT));
    tram.appendChild(svgText(289, 378, 'SMPL：根的位置和朝向、身体姿态、体型', 'demo-x-mut', 10, 'middle'));
    function trajAt(u) { return [218 + 136 * u, 348 - 40 * u - 8 * Math.sin(2 * Math.PI * u)]; }
    var trail = [];
    for (var q = 0; q < 24; q++) {
      var tp = trajAt(q / 24);
      trail.push(dotAt(tram, tp[0], tp[1], 1.8, C_ACCENT));
    }
    var worldFig = robot(tram, C_ACCENT, 0.5, false);

    var mm = group(s);
    rectBox(mm, 410, 172, 360, 220, C_WARN, C_SURFACE2);
    mm.appendChild(svgText(424, 194, 'MaskedMimic：在物理仿真里照着做一遍', 'demo-x-ink2', 11.5));
    mm.appendChild(svgText(756, 194, '虚线：估计　实线：仿真', 'demo-x-mut', 10, 'end'));
    mm.appendChild(svgText(424, 216, '物理上做得到：跟得上', 'demo-x-good', 10.5));
    mm.appendChild(svgText(424, 308, '估计出错（示意：悬空）：跟不上', 'demo-x-bad', 10.5));
    [284, 378].forEach(function (gy) { mm.appendChild(paint(svgEl('line', { x1: 424, y1: gy, x2: 668, y2: gy, 'stroke-width': 1.2 }), null, C_BORDER)); });
    var MMX = 612;  // 人放在两行说明文字的右边，悬空的那个才不会压到字
    var okRef = robot(mm, C_MUTED, 0.55, true), okSim = robot(mm, C_GOOD, 0.55, false);
    var badRef = robot(mm, C_MUTED, 0.55, true), badSim = robot(mm, C_BAD, 0.55, false);
    var errLine = paint(svgEl('line', { 'stroke-width': 1.4, 'stroke-dasharray': '3 3' }), null, C_BAD);
    mm.appendChild(errLine);
    chip(mm, 684, 240, 72, '留下', C_GOOD, { h: 30, size: 11.5 });
    chip(mm, 684, 334, 72, '扔掉', C_BAD, { h: 30, size: 11.5 });

    var fit = group(s);
    rectBox(fit, 30, 172, 470, 220, C_BORDER, C_SURFACE2);
    fit.appendChild(svgRich(44, 194, '两步重定向（沿用 H2O）：人和 G1 的 12 个对应部位', { size: 11.5, w: 450, cls: 'demo-x-ink2' }));
    fit.appendChild(paint(svgEl('line', { x1: 60, y1: 380, x2: 270, y2: 380, 'stroke-width': 1.2 }), null, C_BORDER));
    var human = robot(fit, C_MUTED, 1.12, true);
    var g1 = robot(fit, C_GOOD, 0.86, false);
    var pairs = [];
    for (var j = 0; j < 12; j++) {
      var ln = paint(svgEl('line', { 'stroke-width': 1.3, 'stroke-dasharray': '3 3' }), null, C_WARN);
      fit.appendChild(ln);
      pairs.push(ln);
    }
    fit.appendChild(svgText(44, 216, '灰虚：人（SMPL），在做前踢', 'demo-x-mut', 10));
    fit.appendChild(svgText(44, 232, '绿：G1', 'demo-x-good', 10));
    var stepA = svgRich(290, 236, '① 先优化体型 $\\beta\'$：静止姿态下贴近', { size: 11, w: 200, cls: 'demo-x-warn' });
    var stepB = svgRich(290, 294, '② 体型固定，逐帧优化姿态：位置对上', { size: 11, w: 200, cls: 'demo-x-good' });
    fit.appendChild(stepA);
    fit.appendChild(stepB);
    var resid = svgText(290, 356, '', 'demo-x-mono', 11);
    fit.appendChild(resid);
    fit.appendChild(svgText(290, 376, '（12 个点的位置是示意）', 'demo-x-mut', 10));

    var lib = group(s);
    rectBox(lib, 520, 172, 250, 220, C_GOOD, C_SURFACE);
    lib.appendChild(svgText(536, 196, '清洗后的 G1 动作库', 'demo-x-good', 12));
    lib.appendChild(svgText(536, 218, '仿真实验选 43 段，按复杂度与敏捷度分三档', 'demo-x-mut', 10.5));
    var levels = [['简单', 0.45], ['中等', 0.7], ['困难', 1.0]];
    var lvNodes = levels.map(function (lv, k) {
      var g = group(lib);
      g.appendChild(svgText(536, 246 + k * 30, lv[0], 'demo-x-ink2', 11.5));
      g.appendChild(paint(svgEl('rect', { x: 580, y: 236 + k * 30, width: 170 * lv[1], height: 13, rx: 3, opacity: 0.85 }), [C_GOOD, C_WARN, C_BAD][k]));
      return g;
    });
    lib.appendChild(svgText(536, 344, '图 6 的例子：前跳、侧跳、单脚平衡、', 'demo-x-mut', 10.5));
    lib.appendChild(svgText(536, 360, '蹲、前后迈步、走（条长只是示意）', 'demo-x-mut', 10.5));
    lib.appendChild(svgText(536, 382, 'SMPL 与 G1 动作都在官方仓库公开', 'demo-x-good', 10.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      stationNodes.forEach(function (g, k) { setOpacity(g, seg(t, [0.3, 3.6, 7.0, 10.4, 13.4][k], [0.9, 4.2, 7.6, 11.0, 14.0][k])); });
      setOpacity(belt, seg(t, 0.6, 1.2));
      var span = 720;
      tokens.forEach(function (tk) {
        var x = ((now * SPEED + tk.k * (span / CLIPS)) % span) + 46, y = 140, op = clamp(Math.min(x - 46, 766 - x) / 30, 0, 1);
        if (tk.bad && x > 400) {
          var fall = (x - 400) / 60;
          y = 140 + fall * fall * 30;
          op = Math.min(op, clamp(1 - fall / 1.1, 0, 1));
          tk.r.style.stroke = C_BAD;
        } else {
          tk.r.style.stroke = x > 552 ? C_GOOD : C_ACCENT;
        }
        tk.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
        tk.g.style.opacity = (t < 7.0 && tk.bad && x > 400 ? 0 : op).toFixed(2);
      });
      /* TRAM：同一段前跳，左边是视频里的 2D 画面，右边是估出来的三维人和他在地面上走过的轨迹（三跳一轮） */
      var out = 1 - seg(t, 10.4, 10.8);
      setOpacity(tram, seg(t, 3.6, 4.2) * out);
      var hop = now / 2.4, J = jumpAt(hop % 1, false), pos = ((Math.floor(hop) % 3) + J.x) / 3, wp = trajAt(pos);
      vidFig.put(72 + pos * 60, 312, J.P, J.h);
      worldFig.put(wp[0], wp[1], J.P, J.h, 0.5 - 0.12 * pos);
      trail.forEach(function (d, q) { setOpacity(d, q / 24 <= pos ? 0.85 : 0.12); });
      /* MaskedMimic：上面照着做得到（踢腿稍慢半拍跟上）；下面估计的人悬空，仿真里受重力的人跟不上、摔倒 */
      setOpacity(mm, seg(t, 7.0, 7.6) * out);
      okRef.put(MMX, 284, kickAt((now / 2.6) % 1), 0);
      okSim.put(MMX, 284, kickAt(((now - 0.15) / 2.6 + 1) % 1), 0);
      var bu = (now / 4) % 1, lift = 30 * ease(seg(bu, 0.1, 0.45)) * (1 - ease(seg(bu, 0.85, 1)));
      badRef.put(MMX, 378, POSE_STAND, lift);
      var fall = ease(seg(bu, 0.45, 0.7)) * (1 - seg(bu, 0.9, 1));
      badSim.put(MMX, 378, lerpPose(POSE_STAND, POSE_STUMBLE, fall), 8 * Math.sin(Math.PI * seg(bu, 0.1, 0.3)));
      badSim.g.setAttribute('transform', badSim.g.getAttribute('transform') + ' rotate(' + (60 * fall).toFixed(1) + ')');
      var hr = badRef.joints()[0], hs = jointsOf(lerpPose(POSE_STAND, POSE_STUMBLE, fall))[0];
      var ang = (60 * fall * Math.PI) / 180, sc = 0.55, hy = 378 - (hipHeight(lerpPose(POSE_STAND, POSE_STUMBLE, fall)) + 8 * Math.sin(Math.PI * seg(bu, 0.1, 0.3))) * sc;
      var hx = MMX + sc * (hs[0] * Math.cos(ang) - hs[1] * Math.sin(ang)), hyy = hy + sc * (hs[0] * Math.sin(ang) + hs[1] * Math.cos(ang));
      errLine.setAttribute('x1', hr[0].toFixed(1)); errLine.setAttribute('y1', hr[1].toFixed(1));
      errLine.setAttribute('x2', hx.toFixed(1)); errLine.setAttribute('y2', hyy.toFixed(1));
      setOpacity(errLine, seg(bu, 0.3, 0.45) * (1 - seg(bu, 0.85, 0.95)));

      setOpacity(fit, seg(t, 10.8, 11.2));
      /* ① β′：人缩到 G1 的身材（两人都站着）；② 人在做动作（输入，不动），G1 的姿态一帧帧追上去，虚线缩短 */
      var uB = ease(seg(t, 11.2, 12.8)), uP = ease(seg(t, 13.0, 15.0));
      var Ph = lerpPose(POSE_STAND, kickAt((now / 2.6) % 1), seg(t, 12.8, 13.0));
      human.put(165, 380, Ph, 0, 1.12 - 0.26 * uB);
      g1.put(165, 380, lerpPose(POSE_STAND, Ph, uP), 0);
      var hj = human.joints(), gj = g1.joints(), err = 0;
      pairs.forEach(function (ln, k) {
        ln.setAttribute('x1', hj[k][0].toFixed(1)); ln.setAttribute('y1', hj[k][1].toFixed(1));
        ln.setAttribute('x2', gj[k][0].toFixed(1)); ln.setAttribute('y2', gj[k][1].toFixed(1));
        err += Math.hypot(hj[k][0] - gj[k][0], hj[k][1] - gj[k][1]);
      });
      setOpacity(stepA, seg(t, 11.2, 11.6));
      setOpacity(stepB, seg(t, 12.8, 13.4));
      resid.textContent = '12 对距离之和：' + fmt(err, 0) + ' px（示意）';
      setOpacity(resid, seg(t, 11.2, 11.6));
      setOpacity(lib, seg(t, 13.4, 14.0));
      lvNodes.forEach(function (g, k) { setOpacity(g, seg(t, 14.2 + k * 0.4, 14.6 + k * 0.4)); });
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 相位跟踪策略 ── */
  function buildScenePretrain() {
    var s = sceneSvg('目标只给一个相位 φ，从 0 到 1；演员网络看最近 5 步的本体感受和 φ，共 376 维，评论家额外看参考的全局位置和根线速度，上真机不需要里程计；动作是 23 个目标关节角，PPO 训练，奖励里脚的位置权重最高 2.1、终止 −200；终止阈值从 1.5 米收紧到 0.3 米；回合从随机相位开始（RSI）；另有基础域随机化');
    s.appendChild(svgText(30, 28, '第一阶段：每段动作一个跟踪策略，目标只有一个数 —— 相位', 'demo-x-ink2', 13.5));

    var ph = group(s);
    rectBox(ph, 30, 44, 370, 150, C_BORDER, C_SURFACE2);
    ph.appendChild(svgRich(44, 64, '相位 $\\phi$：0 是动作开头，1 是结尾', { size: 11.5, w: 340, cls: 'demo-x-ink2' }));
    ph.appendChild(paint(svgEl('line', { x1: 60, y1: 176, x2: 370, y2: 176, 'stroke-width': 3, 'stroke-linecap': 'round' }), null, C_BORDER));
    ph.appendChild(svgText(60, 190, '0', 'demo-x-mono demo-x-mut', 10, 'middle'));
    ph.appendChild(svgText(370, 190, '1', 'demo-x-mono demo-x-mut', 10, 'middle'));
    var phFill = paint(svgEl('line', { x1: 60, y1: 176, x2: 60, y2: 176, 'stroke-width': 3, 'stroke-linecap': 'round' }), null, C_ACCENT);
    ph.appendChild(phFill);
    var phKnob = dotAt(ph, 60, 176, 6, C_ACCENT);
    var phVal = svgText(370, 64, '', 'demo-x-mono', 11, 'end');
    ph.appendChild(phVal);
    ph.appendChild(paint(svgEl('line', { x1: 44, y1: 160, x2: 386, y2: 160, 'stroke-width': 1 }), null, C_BORDER));
    var ghost = robot(ph, C_MUTED, 0.5, true);
    var actor = robot(ph, C_ACCENT, 0.5, false);

    var ac = group(s);
    rectBox(ac, 420, 44, 350, 150, C_BORDER, C_SURFACE2);
    chip(ac, 434, 56, 322, '演员：最近 5 步的本体感受 + $\\phi$ = **376 维**', C_ACCENT, { h: 32, size: 11.5 });
    ac.appendChild(svgText(442, 106, '每步 75 维：关节位置 23 + 速度 23 + 根角速度 3', 'demo-x-mut', 10));
    ac.appendChild(svgText(442, 120, '　　　　 + 重力投影 3 + 上一步动作 23', 'demo-x-mut', 10));
    chip(ac, 434, 130, 322, '评论家：再加参考的全局位置、根线速度', C_WARN, { h: 30, size: 11 });
    var odo = group(ac);
    chip(odo, 434, 166, 200, '上真机不需要里程计', C_GOOD, { h: 24, size: 10.5 });

    var rew = group(s);
    chip(rew, 30, 204, 740, '动作 = 23 个目标关节角 → PD；PPO 训练。奖励（表 I）三类：惩罚（终止 **−200**）、正则、跟踪（脚的位置 **2.1** 最高，VR 三点 1.6）', C_BORDER, { h: 30, size: 11 });

    var cur = group(s);
    rectBox(cur, 30, 244, 370, 148, C_WARN, C_SURFACE2);
    cur.appendChild(svgText(44, 264, '终止课程：偏离参考多远才结束这一回合', 'demo-x-warn', 11.5));
    var refPath = [];
    for (var i = 0; i <= 40; i++) refPath.push([56 + i * 8, 330 - 26 * Math.sin(i * 0.22)]);
    var band = paint(svgEl('path', { d: '', 'stroke-width': 0, opacity: 0.22 }), C_WARN);
    cur.appendChild(band);
    pathLine(cur, refPath, C_MUTED, 1.4, '4 3');
    var bot = dotAt(cur, 56, 330, 5, C_ACCENT);
    var thr = svgText(386, 264, '', 'demo-x-mono', 11.5, 'end');
    cur.appendChild(thr);
    var termFlash = paint(svgText(386, 384, '超出 → 终止', 'demo-x-bad', 11, 'end'), C_BAD);
    cur.appendChild(termFlash);

    var rsi = group(s);
    rectBox(rsi, 420, 244, 350, 148, C_GOOD, C_SURFACE2);
    rsi.appendChild(svgText(434, 264, '参考状态初始化（RSI）：回合从随机相位开始', 'demo-x-good', 11.5));
    rsi.appendChild(paint(svgEl('line', { x1: 440, y1: 340, x2: 754, y2: 340, 'stroke-width': 1.2 }), null, C_BORDER));
    var RSI_START = [0.08, 0.55, 0.31, 0.78, 0.18, 0.66];
    var rsiFigs = RSI_START.map(function (u0, k) {
      var f = robot(rsi, k % 2 ? C_GOOD : C_ACCENT, 0.36, false);
      f.u0 = u0;
      return f;
    });
    rsi.appendChild(svgText(434, 360, '先学会落地，才学得会起跳：各阶段并行学', 'demo-x-mut', 10.5));
    rsi.appendChild(svgText(434, 378, '域随机化（表 VI）：摩擦、P 增益、20–40 ms 延迟、推搡', 'demo-x-mut', 10.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(ph, seg(t, 0.2, 0.8));
      var phi = (now / 4) % 1;
      var x = 60 + phi * 310;
      phFill.setAttribute('x2', x.toFixed(1));
      moveDot(phKnob, [x, 176]);
      phVal.textContent = 'φ = ' + fmt(phi, 2);
      var J = jumpAt(phi, false), Jg = jumpAt((phi + 0.03) % 1, false);
      ghost.put(150 + Jg.x * 130, 160, Jg.P, Jg.h);
      actor.put(150 + J.x * 130, 160, J.P, J.h);
      setOpacity(ac, seg(t, 3.6, 4.2));
      setOpacity(odo, seg(t, 5.6, 6.2));
      setOpacity(rew, seg(t, 7.0, 7.6));
      setOpacity(cur, seg(t, 10.4, 11.0));
      /* 阈值从 1.5 m 收到 0.3 m（这里压缩成几秒演示；实际按 README 每次 ×(1 − 2.5e−5)，要收紧约 6.4 万次） */
      var thrM = TERM.start - (TERM.start - TERM.end) * ease(seg(t, 11.2, 15.2));
      thr.textContent = '阈值 ' + fmt(thrM, 2) + ' m';
      var w = 6 + (thrM / TERM.start) * 34;
      var top = refPath.map(function (q) { return [q[0], q[1] - w]; }), btm = refPath.slice().reverse().map(function (q) { return [q[0], q[1] + w]; });
      band.setAttribute('d', polyPath(top.concat(btm).map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })) + ' Z');
      var bu = (now / 3) % 1, bp = pointOn(refPath, bu), wob = 16 * Math.sin(now * 3.1) * (0.6 + 0.4 * Math.sin(now * 0.7));
      moveDot(bot, [bp[0], bp[1] + wob]);
      setOpacity(termFlash, Math.abs(wob) > w ? 1 : 0.12);
      setOpacity(rsi, seg(t, 13.4, 14.0));
      rsiFigs.forEach(function (f, k) {
        var u = (f.u0 + now / 3.6) % 1, Jr = jumpAt(u, false);
        f.put(446 + f.u0 * 250 + Jr.x * 40, 340, Jr.P, Jr.h);
        f.g.style.opacity = (0.45 + 0.55 * (k % 2)).toFixed(2);
      });
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 上真机录一遍，再放回仿真 ── */
  /* 图 5 没有标数：下面四条是按图读的近似值（单位 mm，横轴是回放步数 0–150） */
  function fig5(kind, step) {
    var x = step / 150;
    if (kind === 0) return 2450 / (1 + Math.exp(-(step - 82) / 11)); // 开环
    if (kind === 1) return 2300 / (1 + Math.exp(-(step - 92) / 12)); // SysID
    if (kind === 2) return 720 * Math.pow(x, 1.6); // Delta Dynamics
    return 20 + 90 * x * x; // ASAP
  }
  function buildSceneCollect() {
    var s = sceneSvg('把预训练策略部署到 G1，用动作捕捉和机载传感器记下每一步的状态：基座位置 3、线速度 3、朝向四元数 4、角速度 3、关节位置 23、关节速度 23，共 59 维；把真机动作原样放回仿真重放，仿真里的机器人越走越偏；图 5 里开环回放 150 步后误差两米多');
    s.appendChild(svgText(30, 28, '第二阶段先采数据：真机上跑一遍，录下状态和动作', 'demo-x-ink2', 13.5));

    var mo = group(s);
    rectBox(mo, 30, 44, 300, 206, C_BORDER, C_SURFACE2);
    mo.appendChild(svgText(44, 64, '动作捕捉 + 机载传感器', 'demo-x-ink2', 11.5));
    var floor = paint(svgEl('path', { d: 'M 70 212 L 290 212 L 262 182 L 98 182 Z', 'stroke-width': 1.2, 'stroke-dasharray': '4 3', opacity: 0.7 }), C_SURFACE, C_BORDER);
    mo.appendChild(floor);
    var cams = [[52, 92], [308, 92], [52, 224], [308, 224]].map(function (p) {
      var g = group(mo);
      g.appendChild(paint(svgEl('rect', { x: p[0] - 9, y: p[1] - 6, width: 18, height: 12, rx: 2 }), C_MUTED));
      var led = dotAt(g, p[0], p[1], 2.5, C_BAD);
      return led;
    });
    var g1 = robot(mo, C_ACCENT, 0.72, false);
    mo.appendChild(svgText(180, 240, '预训练策略：能跟，动作质量不高', 'demo-x-mut', 10.5, 'middle'));

    var vec = group(s);
    rectBox(vec, 346, 44, 424, 206, C_BORDER, C_SURFACE2);
    vec.appendChild(svgRich(360, 66, '每一步的状态 $s_t$：', { size: 11.5, w: 200, cls: 'demo-x-ink2' }));
    var total = svgText(756, 66, '', 'demo-x-mono', 12, 'end');
    vec.appendChild(total);
    var CW = 6.4, cells = [], gx = 362, cols = [C_WARN, C_WARN, C_WARN, C_WARN, C_ACCENT, C_GOOD];
    STATE_REAL.forEach(function (r, k) {
      var gy = 82 + k * 24;
      vec.appendChild(svgText(gx, gy + 12, r[0], 'demo-x-mut', 10.5));
      vec.appendChild(svgText(756, gy + 12, String(r[1]), 'demo-x-mono', 11, 'end'));
      for (var c = 0; c < r[1]; c++) {
        var cell = paint(svgEl('rect', { x: gx + 112 + c * CW, y: gy + 2, width: CW - 1.4, height: 14, rx: 1.5 }), cols[k]);
        vec.appendChild(cell);
        cells.push(cell);
      }
    });
    vec.appendChild(svgText(362, 242, '基座的量靠动作捕捉，关节两项靠机载传感器', 'demo-x-mut', 10));

    var rp = group(s);
    rectBox(rp, 30, 262, 740, 130, C_BAD, C_SURFACE);
    rp.appendChild(svgText(44, 282, '把真机录下的动作，原样放回仿真重放', 'demo-x-bad', 11.5));
    rp.appendChild(paint(svgEl('line', { x1: 44, y1: 370, x2: 380, y2: 370, 'stroke-width': 1.2 }), null, C_BORDER));
    var realFig = robot(rp, C_ACCENT, 0.6, true);
    var simFig = robot(rp, C_BAD, 0.6, false);
    rp.appendChild(svgText(110, 386, '虚线：真机录下的', 'demo-x-mut', 10, 'middle'));
    rp.appendChild(svgText(270, 386, '实线：仿真回放', 'demo-x-bad', 10, 'middle'));
    var FX0 = 420, FX1 = 754, FY0 = 372, FY1 = 292;
    function fx(st) { return FX0 + (st / 150) * (FX1 - FX0); }
    function fy(v) { return FY0 - (v / 2600) * (FY0 - FY1); }
    rp.appendChild(paint(svgEl('line', { x1: FX0, y1: FY0, x2: FX1, y2: FY0, 'stroke-width': 1 }), null, C_BORDER));
    rp.appendChild(svgText(FX0, 286, '图 5（读图示意）：开环回放的 MPJPE（mm）', 'demo-x-mut', 10));
    var mpjpeNote = svgText(FX0 + 4, 302, 'MPJPE：每个关节离参考位置多远，取平均', 'demo-x-warn', 9.5);
    rp.appendChild(mpjpeNote);
    [0, 1000, 2000].forEach(function (v) { rp.appendChild(svgText(FX0 - 4, fy(v) + 3, String(v), 'demo-x-mono demo-x-mut', 9, 'end')); });
    rp.appendChild(svgText(FX1, FY0 + 13, '150 步', 'demo-x-mono demo-x-mut', 9, 'end'));
    var curve = [];
    for (var st = 0; st <= 150; st += 3) curve.push([fx(st), fy(fig5(0, st))]);
    var vanilla = pathLine(rp, curve, C_MUTED, 2);
    var vLab = svgText(FX1 - 4, fy(1100), '开环回放：两米多，摔倒', 'demo-x-bad', 10, 'end');
    rp.appendChild(vLab);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(mo, seg(t, 0.2, 0.8));
      g1.put(180, 206, kickAt((now / 2.4) % 1), 0);
      cams.forEach(function (led, k) { setOpacity(led, Math.floor(now * 3 + k) % 2 ? 1 : 0.3); });
      setOpacity(vec, seg(t, 3.6, 4.2));
      var nOn = Math.round(N_STATE_REAL * ease(seg(t, 4.0, 6.8)));
      cells.forEach(function (c, k) { setOpacity(c, k < nOn ? 0.9 : 0.12); });
      total.textContent = nOn + ' 维';
      setOpacity(rp, seg(t, 7.0, 7.6));
      /* 回放：每 5 秒一轮，仿真那个越走越歪，最后摔倒 */
      var ru = ((now - 7) / 5) % 1;
      if (ru < 0) ru += 1;
      var tilt = ru < 0.55 ? 0 : ease(seg(ru, 0.55, 0.9));
      var Pr = kickAt((ru * 2) % 1);
      realFig.put(100 + ru * 24, 370, Pr, 0);
      var Ps = lerpPose(Pr, POSE_STUMBLE, tilt);
      simFig.put(250 + ru * 24 + 24 * ru * ru, 370, Ps, 0);
      simFig.g.setAttribute('transform', simFig.g.getAttribute('transform') + ' rotate(' + (70 * tilt).toFixed(1) + ')');
      setOpacity(vanilla, seg(t, 10.4, 10.8));
      drawOn(vanilla, ease(seg(t, 10.6, 13.0)));
      setOpacity(vLab, seg(t, 12.6, 13.2));
      setOpacity(mpjpeNote, seg(t, 10.6, 11.2));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: 残差动作模型 Δa ── */
  function buildSceneDelta() {
    var s = sceneSvg('残差动作模型看当前状态和真机录下的动作，输出修正量 Δa，加到动作上再送进仿真；训练时每一步把仿真摆到真机状态，奖励是下一步和真机有多接近，另罚 Δa 的大小；仿真电机强能跳、真机弱跳不起来时，Δ 学着把下肢动作调小；玩具：G1 脚踝刚度 20，真机只有 65%，完美修正是 −0.35 乘以目标与当前角度之差');
    s.appendChild(svgText(30, 28, '核心一步：学一个残差动作模型，让仿真「演」出真机', 'demo-x-ink2', 13.5));
    var fm = svgMath(400, 58, 's_{t+1} = f^{\\text{sim}}\\big(s_t,\\; a^r_t + \\pi^{\\Delta}(s_t, a^r_t)\\big)', { size: 16, anchor: 'middle', w: 520 });
    s.appendChild(fm);

    var loop = group(s);
    rectBox(loop, 30, 78, 370, 186, C_BORDER, C_SURFACE2);
    var mk = K.arrowMarker(s, 'asap-x-arrow-s5', C_ACCENT);
    chip(loop, 44, 92, 118, '真机状态 $s^r_t$', C_ACCENT, { h: 30, size: 11 });
    chip(loop, 44, 150, 118, '真机动作 $a^r_t$', C_ACCENT, { h: 30, size: 11 });
    chip(loop, 200, 120, 80, '$\\pi^{\\Delta}$', C_GOOD, { h: 34, size: 14 });
    chip(loop, 300, 150, 86, '仿真一步', C_BORDER, { h: 30, size: 11 });
    arrowPath(loop, [[162, 107], [200, 130]], C_ACCENT, mk);
    arrowPath(loop, [[162, 165], [200, 145]], C_ACCENT, mk);
    arrowPath(loop, [[280, 140], [300, 158]], C_GOOD, mk);
    arrowPath(loop, [[162, 175], [298, 172]], C_ACCENT, mk, '3 3');
    loop.appendChild(svgRich(206, 196, '$a^r + \\Delta a$', { size: 11, w: 90, cls: 'demo-x-good' }));
    var reset = group(loop);
    arrowPath(reset, [[103, 92], [103, 84], [343, 84], [343, 148]], C_WARN, mk, '4 3');
    reset.appendChild(svgText(220, 80, '每一步先把仿真摆到真机状态', 'demo-x-warn', 10, 'middle'));
    var cmp = group(loop);
    cmp.appendChild(svgText(46, 222, '奖励：仿真下一步 vs 真机下一步', 'demo-x-ink2', 10.5));
    var dSim = dotAt(cmp, 300, 244, 6, C_BAD), dReal = dotAt(cmp, 340, 244, 6, C_ACCENT);
    cmp.appendChild(paint(svgEl('line', { x1: 60, y1: 244, x2: 380, y2: 244, 'stroke-width': 1 }), null, C_BORDER));
    var pen = group(loop);
    pen.appendChild(svgText(46, 258, '另罚 Δa 的大小：只补必要的部分', 'demo-x-warn', 10.5));

    var toy = group(s);
    rectBox(toy, 420, 78, 350, 186, C_BORDER, C_SURFACE2);
    toy.appendChild(svgText(434, 96, '玩具：一个脚踝关节，真机刚度只有 65%', 'demo-x-ink2', 11));
    /* 上：关节角；下：和真机差多少（放大画）。曲线取自 TOY_BASE 的测试片段（拟合时没见过） */
    var TX0 = 440, TX1 = 756, TY = 148, TA = 105, EY = 236, EA = 700;
    function tx(i) { return TX0 + (i / TOY.steps) * (TX1 - TX0); }
    toy.appendChild(paint(svgEl('line', { x1: TX0, y1: TY, x2: TX1, y2: TY, 'stroke-width': 1 }), null, C_BORDER));
    toy.appendChild(paint(svgEl('line', { x1: TX0, y1: EY, x2: TX1, y2: EY, 'stroke-width': 1 }), null, C_BORDER));
    toy.appendChild(svgText(TX1, 196, '和真机差多少（放大画）', 'demo-x-mut', 9.5, 'end'));
    var tgPath = pathLine(toy, TOY_BASE.te.map(function (v, i) { return [tx(i), TY - v * TA]; }), C_MUTED, 1.2, '4 3');
    var realP = pathLine(toy, TOY_BASE.rTe.map(function (q, i) { return [tx(i), TY - q[0] * TA]; }), C_ACCENT, 2.2);
    var simP = pathLine(toy, TOY_BASE.simTe.tr.map(function (q, i) { return [tx(i), TY - q[0] * TA]; }), C_BAD, 1.8);
    var simDP = pathLine(toy, TOY_BASE.simDTe.tr.map(function (q, i) { return [tx(i), TY - q[0] * TA]; }), C_GOOD, 2.4, '6 4');
    var errS = pathLine(toy, TOY_BASE.simTe.tr.map(function (q, i) { return [tx(i), EY - Math.abs(q[0] - TOY_BASE.rTe[i][0]) * EA]; }), C_BAD, 1.8);
    var errD = pathLine(toy, TOY_BASE.simDTe.tr.map(function (q, i) { return [tx(i), EY - Math.abs(q[0] - TOY_BASE.rTe[i][0]) * EA]; }), C_GOOD, 2.2);
    var cursor = paint(svgEl('line', { x1: TX0, y1: 100, x2: TX0, y2: EY, 'stroke-width': 1 }), null, C_MUTED);
    toy.appendChild(cursor);
    toy.appendChild(svgText(434, 254, '灰虚：动作　蓝：真机　红：仿真回放　绿虚：仿真 + Δa', 'demo-x-mut', 9.5));
    void tgPath;

    var weak = group(s);
    rectBox(weak, 30, 276, 370, 116, C_WARN, C_SURFACE);
    var wHead = svgText(44, 296, '论文的例子：仿真电机强，跳得起来；真机弱，跳不起来', 'demo-x-warn', 11);
    weak.appendChild(wHead);
    var wTag = svgText(44, 296, '加上 Δ（下肢动作调小）：仿真也跳不远 —— 复现真机的失败', 'demo-x-good', 11);
    weak.appendChild(wTag);
    var wSim = robot(weak, C_BAD, 0.42, false), wReal = robot(weak, C_ACCENT, 0.42, false);
    weak.appendChild(paint(svgEl('line', { x1: 44, y1: 368, x2: 386, y2: 368, 'stroke-width': 1.2 }), null, C_BORDER));
    weak.appendChild(svgText(64, 384, '仿真', 'demo-x-bad', 10.5, 'middle'));
    weak.appendChild(svgText(264, 384, '真机', 'demo-x-ink2', 10.5, 'middle'));
    weak.appendChild(wTag);

    var calc = group(s);
    rectBox(calc, 420, 276, 350, 116, C_GOOD, C_SURFACE);
    calc.appendChild(svgText(434, 296, '手算一步：目标 0.30 rad，当前 0.10 rad', 'demo-x-ink2', 11));
    var rows = [
      ['仿真力矩', '20 × 0.20 = 4.0 N·m', C_BAD],
      ['真机力矩', '0.65 × 20 × 0.20 = 2.6 N·m', C_ACCENT],
      ['完美修正', '−0.35 × 0.20 = −0.07 rad', C_GOOD],
      ['补完再算', '20 × (0.30 − 0.07 − 0.10) = 2.6', C_GOOD]
    ];
    var calcRows = rows.map(function (r, k) {
      var g = group(calc);
      g.appendChild(svgText(436, 318 + k * 19, r[0], 'demo-x-mut', 10.5));
      g.appendChild(paint(svgText(756, 318 + k * 19, r[1], 'demo-x-mono', 11, 'end'), r[2]));
      return g;
    });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(fm, seg(t, 0.2, 0.8));
      setOpacity(loop, seg(t, 0.3, 0.9));
      setOpacity(reset, seg(t, 3.6, 4.2));
      setOpacity(cmp, seg(t, 4.6, 5.2));
      /* 训练前仿真的下一步离真机很远，训练后贴上去 */
      var gap = lerp(150, 10, ease(seg(t, 5.0, 7.0))) * (0.7 + 0.3 * Math.sin(now * 1.6));
      moveDot(dSim, [340 - gap, 244]);
      setOpacity(pen, seg(t, 7.0, 7.6));
      setOpacity(toy, seg(t, 1.2, 1.8));
      var cu = (now / 4) % 1;
      cursor.setAttribute('x1', (TX0 + cu * (TX1 - TX0)).toFixed(1));
      cursor.setAttribute('x2', (TX0 + cu * (TX1 - TX0)).toFixed(1));
      drawOn(realP, ease(seg(t, 1.4, 3.0)));
      drawOn(simP, ease(seg(t, 2.4, 4.0)));
      drawOn(simDP, ease(seg(t, 4.6, 6.4)));
      drawOn(errS, ease(seg(t, 2.6, 4.2)));
      drawOn(errD, ease(seg(t, 4.8, 6.6)));
      setOpacity(weak, seg(t, 10.4, 11.0));
      /* 左：仿真；右：真机。12 s 起仿真也加上 Δ —— 跟真机一样跳不远 */
      var u = (now / 3.2) % 1, Jw = jumpAt(u, true), withDelta = t >= 12.0;
      var Js = withDelta ? Jw : jumpAt(u, false);
      wSim.put(64 + Js.x * (withDelta ? 54 : 120), 368, Js.P, Js.h);
      wReal.put(264 + Jw.x * 54, 368, Jw.P, Jw.h);
      setOpacity(wTag, seg(t, 12.0, 12.6));
      setOpacity(wHead, 1 - seg(t, 11.8, 12.2));
      setOpacity(calc, seg(t, 13.4, 14.0));
      calcRows.forEach(function (g, k) { setOpacity(g, seg(t, 13.8 + k * 0.6, 14.2 + k * 0.6)); });
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 冻结 Δ，微调策略；部署时拿掉 ── */
  function buildSceneFinetune() {
    var s = sceneSvg('训好的 Δ 模型冻结后接进仿真器，策略的动作先加上 Δ 的修正再交给物理引擎，这就是对齐后的仿真；在里面用和预训练一样的奖励微调策略；部署时把 Δ 拿掉，只上微调后的策略');
    s.appendChild(svgText(30, 28, '把 Δ 冻结进仿真，在「像真机」的仿真里继续训练策略', 'demo-x-ink2', 13.5));

    var ft = group(s);
    rectBox(ft, 30, 44, 740, 196, C_ACCENT, C_SURFACE2);
    ft.appendChild(svgText(44, 64, '对齐后的仿真（图 2c）', 'demo-x-ink2', 11.5));
    var mk = K.arrowMarker(s, 'asap-x-arrow-s6', C_ACCENT);
    var LOOP = [[150, 128], [260, 128], [430, 128], [600, 128], [690, 128], [690, 200], [150, 200], [150, 128]];
    chip(ft, 70, 110, 160, '跟踪策略 $\\pi$（在训练）', C_ACCENT, { h: 36, size: 11.5 });
    var lockBox = group(ft);
    chip(lockBox, 360, 68, 140, '$\\pi^{\\Delta}$　🔒 冻结', C_GOOD, { h: 32, size: 12 });
    var plus = group(ft);
    plus.appendChild(paint(svgEl('circle', { cx: 430, cy: 128, r: 12, 'stroke-width': 1.6 }), C_SURFACE, C_GOOD));
    plus.appendChild(svgText(430, 133, '+', 'demo-x-good', 15, 'middle'));
    chip(ft, 540, 110, 130, '物理引擎', C_BORDER, { h: 36, size: 12 });
    arrowPath(ft, [[230, 128], [416, 128]], C_ACCENT, mk);
    arrowPath(ft, [[430, 100], [430, 114]], C_GOOD, mk);
    arrowPath(ft, [[444, 128], [538, 128]], C_GOOD, mk);
    arrowPath(ft, [[670, 128], [700, 128], [700, 200], [150, 200], [150, 148]], C_ACCENT, mk, '5 4');
    ft.appendChild(svgText(320, 120, '动作 a', 'demo-x-mut', 10.5, 'middle'));
    ft.appendChild(svgText(486, 120, 'a + Δa', 'demo-x-good', 10.5, 'middle'));
    ft.appendChild(svgText(420, 216, '下一步状态 → 奖励和预训练一样（表 I）→ PPO 更新策略', 'demo-x-mut', 10.5, 'middle'));
    var fm = svgMath(400, 166, 'f^{\\text{ASAP}}(s, a) = f^{\\text{sim}}\\big(s,\\; a + \\pi^{\\Delta}(s, a)\\big)', { size: 15, anchor: 'middle', w: 440 });
    ft.appendChild(fm);
    var tokens = [0, 1, 2].map(function () { return dotAt(ft, 150, 128, 5, C_ACCENT); });

    var learn = group(s);
    chip(learn, 30, 250, 740, '策略学会：在「像真机」的动力学下，动作该怎么调才跟得上参考', C_BORDER, { h: 30, size: 11.5 });

    var dep = group(s);
    rectBox(dep, 30, 290, 470, 102, C_GOOD, C_SURFACE);
    dep.appendChild(svgText(44, 310, '部署（图 2d）：只上微调后的策略，Δ 拿掉', 'demo-x-good', 11.5));
    chip(dep, 44, 326, 140, '微调后的策略', C_ACCENT, { h: 34, size: 11.5 });
    var gone = group(dep);
    chip(gone, 210, 326, 96, '$\\pi^{\\Delta}$', C_MUTED, { h: 34, size: 12, dash: '4 3' });
    gone.appendChild(paint(svgEl('line', { x1: 214, y1: 330, x2: 302, y2: 356, 'stroke-width': 2 }), null, C_BAD));
    arrowPath(dep, [[184, 343], [330, 343]], C_ACCENT, mk);
    var g1 = robot(dep, C_ACCENT, 0.55, false);
    dep.appendChild(paint(svgEl('line', { x1: 336, y1: 384, x2: 488, y2: 384, 'stroke-width': 1.2 }), null, C_BORDER));

    var why = group(s);
    rectBox(why, 520, 290, 250, 102, C_WARN, C_SURFACE, '4 3');
    why.appendChild(svgText(534, 312, '为什么不在部署时用 Δ 反推动作？', 'demo-x-warn', 11));
    why.appendChild(svgText(534, 334, '那是一步匹配，短视；', 'demo-x-ink2', 10.5));
    why.appendChild(svgText(534, 352, 'RL 微调相当于多步匹配', 'demo-x-ink2', 10.5));
    why.appendChild(svgText(534, 378, '→ 第 11 幕（图 11）', 'demo-x-mut', 10.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(ft, seg(t, 0.2, 0.8));
      setOpacity(lockBox, seg(t, 0.8, 1.4));
      setOpacity(fm, seg(t, 1.8, 2.4));
      tokens.forEach(function (d, k) {
        var u = ((now / 3 + k / 3) % 1);
        var p = pointOn(LOOP, u);
        moveDot(d, p);
        d.style.fill = p[0] > 430 && p[1] < 140 ? C_GOOD : C_ACCENT;
      });
      setOpacity(learn, seg(t, 7.0, 7.6));
      setOpacity(dep, seg(t, 10.4, 11.0));
      setOpacity(gone, seg(t, 11.2, 11.8));
      var J = jumpAt((now / 3.2) % 1, false);
      g1.put(360 + J.x * 90, 384, J.P, J.h);
      setOpacity(why, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* 分组柱状图：groups = [[值…], …]，每组 n 根，颜色按 cols；返回能「长出来、换数」的句柄 */
  function groupedBars(parent, x0, x1, base, hMax, vMax, groups, cols, names, opts) {
    var o = opts || {};
    var slot = (x1 - x0) / groups.length, n = groups[0].length, bw = Math.min(o.bw || 34, (slot * 0.84) / n);
    parent.appendChild(paint(svgEl('line', { x1: x0, y1: base, x2: x1, y2: base, 'stroke-width': 1 }), null, C_BORDER));
    var items = [];
    groups.forEach(function (vals, i) {
      var gx = x0 + slot * i + (slot - bw * n) / 2;
      parent.appendChild(svgText(x0 + slot * (i + 0.5), base + 15, names[i], 'demo-x-ink2', 10.5, 'middle'));
      vals.forEach(function (v, k) {
        var b = vbar(parent, gx + k * bw + 2, base, bw - 4, cols[k]);
        var lab = svgText(gx + k * bw + bw / 2, base, '', 'demo-x-mono', o.labSize || 9.5, 'middle');
        parent.appendChild(lab);
        items.push({ b: b, lab: lab, i: i, k: k, v: v, x: gx + k * bw + bw / 2 });
      });
    });
    return {
      items: items,
      set: function (u, values, labU) {
        items.forEach(function (it) {
          var v = values ? values[it.i][it.k] : it.v;
          var h = (Math.min(v, vMax) / vMax) * hMax;
          var uu = typeof u === 'function' ? u(it) : u;
          setH(it.b, h * uu);
          it.lab.setAttribute('y', (base - h * uu - 5).toFixed(1));
          it.lab.textContent = (v > vMax ? '↑' : '') + fmt(v, o.dec != null ? o.dec : v < 10 ? 2 : v < 100 ? 1 : 0);
          setOpacity(it.lab, typeof labU === 'function' ? labU(it) : labU == null ? uu : labU);
        });
      }
    };
  }

  /* ── scene 7: 开环回放（表 III） ── */
  function buildSceneOpenLoop() {
    var s = sceneSvg('仿真到仿真：IsaacGym 训练，IsaacSim 和 Genesis 当真机；四种办法：开环回放、SysID 改仿真参数、Delta Dynamics 在仿真之后加状态残差、ASAP 在仿真之前加动作残差；表 III 回放 0.25 秒都在 20 毫米上下，1 秒时开环 80.8、SysID 77.6、Delta Dynamics 68.1、ASAP 37.9；Genesis 上 1 秒 ASAP 36.9、开环 82.5');
    s.appendChild(svgText(30, 28, '开环：把测试环境的动作拿回来重放，谁复现得准？', 'demo-x-ink2', 13.5));

    var MINI = [
      ['开环回放', '什么都不改', null],
      ['SysID', '改仿真参数（表 VII）', 'param'],
      ['Delta Dynamics', '仿真之后加 Δs', 'after'],
      ['ASAP', '仿真之前加 Δa', 'before']
    ];
    var mk = K.arrowMarker(s, 'asap-x-arrow-s7', C_MUTED);
    var minis = MINI.map(function (m, k) {
      var g = group(s), x = 30 + k * 188;
      rectBox(g, x, 42, 176, 104, C_METHOD[k], C_SURFACE2);
      g.appendChild(paint(svgText(x + 10, 60, m[0], null, 11.5), C_METHOD[k]));
      g.appendChild(svgText(x + 10, 78, m[1], 'demo-x-mut', 9.5));
      chip(g, x + 8, 100, 30, '$\\pi$', C_BORDER, { h: 26, size: 11 });
      chip(g, x + (m[2] === 'before' ? 84 : 62), 100, 44, '仿真', C_BORDER, { h: 26, size: 10.5 });
      chip(g, x + 138, 100, 30, "s'", C_BORDER, { h: 26, size: 10.5 });
      if (m[2] === 'before') {
        chip(g, x + 46, 100, 30, 'Δa', C_GOOD, { h: 26, size: 11 });
        arrowPath(g, [[x + 38, 113], [x + 46, 113]], C_MUTED, mk);
        arrowPath(g, [[x + 76, 113], [x + 84, 113]], C_MUTED, mk);
        arrowPath(g, [[x + 128, 113], [x + 138, 113]], C_MUTED, mk);
      } else if (m[2] === 'after') {
        chip(g, x + 116, 66, 32, 'Δs', C_ACCENT, { h: 22, size: 10 });
        arrowPath(g, [[x + 38, 113], [x + 62, 113]], C_MUTED, mk);
        arrowPath(g, [[x + 106, 113], [x + 138, 113]], C_MUTED, mk);
        arrowPath(g, [[x + 122, 88], [x + 122, 107]], C_ACCENT, mk);
      } else {
        arrowPath(g, [[x + 38, 113], [x + 62, 113]], C_MUTED, mk);
        arrowPath(g, [[x + 106, 113], [x + 138, 113]], C_MUTED, mk);
      }
      if (m[2] === 'param') {
        var dial = group(g);
        dial.appendChild(paint(svgEl('circle', { cx: x + 84, cy: 136, r: 7, 'stroke-width': 1.6 }), C_SURFACE, C_WARN));
        g.hand = paint(svgEl('line', { x1: x + 84, y1: 136, x2: x + 84, y2: 130, 'stroke-width': 2 }), null, C_WARN);
        g.appendChild(g.hand);
        g.cx = x + 84;
      }
      g.pulse = dotAt(g, x + 60, 131, 3, C_METHOD[k]);
      g.x = x;
      return g;
    });

    var chart = group(s);
    rectBox(chart, 30, 158, 560, 234, C_BORDER, C_SURFACE2);
    var simName = svgText(44, 178, '', 'demo-x-ink2', 11.5);
    chart.appendChild(simName);
    chart.appendChild(svgText(576, 178, '全局位置误差（mm），越低越好', 'demo-x-mut', 10, 'end'));
    var gb = groupedBars(chart, 60, 576, 362, 160, 90, HORIZONS.map(function (h, j) { return TABLE3.IsaacSim.map(function (m) { return m[j][0]; }); }), C_METHOD, HORIZONS.map(function (h) { return '回放 ' + h + ' s'; }));
    var gen = HORIZONS.map(function (h, j) { return TABLE3.Genesis.map(function (m) { return m[j][0]; }); });
    var isaac = HORIZONS.map(function (h, j) { return TABLE3.IsaacSim.map(function (m) { return m[j][0]; }); });

    var side = group(s);
    rectBox(side, 604, 158, 166, 234, C_GOOD, C_SURFACE);
    var sideRows = [
      ['回放 1 s', 'ASAP 少 53%', 'demo-x-good'],
      ['SysID', '误差随时间累积', 'demo-x-warn'],
      ['Delta Dynamics', '过拟合，误差级联', 'demo-x-ink2'],
      ['根相对 MPJPE', 'DD 三档都最低', 'demo-x-mut']
    ].map(function (r, k) {
      var g = group(side);
      g.appendChild(svgText(616, 186 + k * 52, r[0], 'demo-x-mut', 10.5));
      g.appendChild(svgText(616, 206 + k * 52, r[1], r[2], 12));
      return g;
    });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      minis.forEach(function (g, k) {
        setOpacity(g, seg(t, 0.3 + k * 0.5, 0.8 + k * 0.5));
        var u = (now / 1.8 + k * 0.2) % 1;
        moveDot(g.pulse, [g.x + 24 + u * 128, 131]);
        if (g.hand) {
          var a = Math.sin(now * 2.2) * 1.1;
          g.hand.setAttribute('x2', (g.cx + 6 * Math.sin(a)).toFixed(1));
          g.hand.setAttribute('y2', (136 - 6 * Math.cos(a)).toFixed(1));
        }
      });
      setOpacity(chart, seg(t, 7.0, 7.6));
      var toGen = ease(seg(t, 13.4, 14.4));
      simName.textContent = '表 III · ' + (toGen > 0.5 ? 'Genesis' : 'IsaacSim') + ' · 开环回放';
      var vals = isaac.map(function (row, j) { return row.map(function (v, k) { return lerp(v, gen[j][k], toGen); }); });
      gb.set(function (it) { return ease(seg(t, it.i === 0 ? 7.4 + it.k * 0.25 : 10.4 + (it.i - 1) * 0.8 + it.k * 0.2, (it.i === 0 ? 8.0 + it.k * 0.25 : 11.0 + (it.i - 1) * 0.8 + it.k * 0.2))); }, vals);
      setOpacity(side, seg(t, 10.4, 11.0));
      sideRows.forEach(function (g, k) { setOpacity(g, seg(t, [10.8, 11.8, 12.4, 13.8][k], [11.3, 12.3, 12.9, 14.3][k])); });
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 闭环微调（表 IV） ── */
  function buildSceneClosedLoop() {
    var s = sceneSvg('表 IV 闭环：IsaacSim 简单档 ASAP 106、开环 107、SysID 105；困难档 ASAP 129、开环 148、SysID 165；Genesis 困难档开环 175、SysID 186、Delta Dynamics 190、ASAP 129，Oracle 116；ASAP 成功率全是 100%，Delta Dynamics 困难档 66.7% 和 60%；图 7 微调前误差越积越大，微调后稳住');
    s.appendChild(svgText(30, 28, '闭环：在改造过的仿真里微调，再拿到测试环境里跑', 'demo-x-ink2', 13.5));

    var chart = group(s);
    rectBox(chart, 30, 42, 500, 290, C_BORDER, C_SURFACE2);
    var simName = svgText(44, 62, '', 'demo-x-ink2', 11.5);
    chart.appendChild(simName);
    chart.appendChild(svgText(516, 62, '柱：全局位置误差（mm）· 虚线 = Oracle', 'demo-x-mut', 10, 'end'));
    var BASE = 274, HM = 176, VM = 200, X0 = 104;
    function levelVals(sim) { return TABLE4[sim].map(function (rows) { return rows.slice(1).map(function (r) { return r[1]; }); }); }
    var isaac = levelVals('IsaacSim'), gen = levelVals('Genesis');
    var gb = groupedBars(chart, X0, 516, BASE, HM, VM, isaac, C_METHOD, LEVELS.map(function (n) { return n + '档'; }), { bw: 34 });
    var slot = (516 - X0) / 3;
    var oracle = LEVELS.map(function (n, j) {
      var ln = paint(svgEl('line', { x1: X0 + slot * j + 10, x2: X0 + slot * (j + 1) - 10, y1: 0, y2: 0, 'stroke-width': 1.6, 'stroke-dasharray': '5 3' }), null, C_INK2);
      chart.appendChild(ln);
      ln.v = TABLE4.IsaacSim[j][0][1];
      return ln;
    });
    /* 成功率单独排两行放在横轴下面（IsaacSim、Genesis 各一行，每根柱子正下方一格）：
       放进柱子里会被柱宽截掉，而且一次只能显示一个仿真器，66.7% 和 60% 看不全 */
    var succ = group(chart);
    succ.appendChild(svgText(X0 - 6, BASE + 15, '成功率 %', 'demo-x-ink2', 10, 'end'));
    ['IsaacSim', 'Genesis'].forEach(function (sim, r) {
      var y = BASE + 30 + r * 16;
      succ.appendChild(svgText(X0 - 6, y, sim, 'demo-x-mut', 10, 'end'));
      gb.items.forEach(function (it) {
        var v = TABLE4[sim][it.i][it.k + 1][0];
        succ.appendChild(svgText(it.x, y, fmt(v, v < 100 ? 1 : 0), v < 100 ? 'demo-x-mono demo-x-bad' : it.k === 3 ? 'demo-x-mono demo-x-good' : 'demo-x-mono demo-x-mut', 10, 'middle'));
      });
    });
    var leg = group(chart);
    ['Vanilla', 'SysID', 'Delta Dynamics', 'ASAP'].forEach(function (n, k) {
      leg.appendChild(paint(svgEl('rect', { x: 50 + k * 112, y: 76, width: 10, height: 10, rx: 2 }), C_METHOD[k]));
      leg.appendChild(svgText(64 + k * 112, 85, n, 'demo-x-mut', 10));
    });

    var f7 = group(s);
    rectBox(f7, 544, 42, 226, 290, C_BORDER, C_SURFACE2);
    f7.appendChild(svgText(556, 62, '图 7（示意，没有数值）', 'demo-x-ink2', 11));
    f7.appendChild(svgText(556, 78, '逐帧跟踪误差', 'demo-x-mut', 10));
    var FX0 = 560, FX1 = 756, FY0 = 280, FY1 = 100;
    f7.appendChild(paint(svgEl('line', { x1: FX0, y1: FY0, x2: FX1, y2: FY0, 'stroke-width': 1 }), null, C_BORDER));
    f7.appendChild(svgText(FX1, FY0 + 14, '时间 →', 'demo-x-mut', 9.5, 'end'));
    var before = [], after = [];
    for (var i = 0; i <= 40; i++) {
      var u = i / 40;
      before.push([FX0 + u * (FX1 - FX0), FY0 - 12 - 150 * Math.pow(u, 1.8) - 6 * Math.sin(i * 1.3)]);
      after.push([FX0 + u * (FX1 - FX0), FY0 - 14 - 8 * Math.sin(i * 0.9) - 4 * u]);
    }
    var pB = pathLine(f7, before, C_BAD, 2);
    var pA = pathLine(f7, after, C_GOOD, 2.4);
    f7.appendChild(svgText(FX1 - 4, 112, '微调前：越积越大', 'demo-x-bad', 10, 'end'));
    f7.appendChild(svgText(FX1 - 4, 248, '微调后：稳住', 'demo-x-good', 10, 'end'));
    f7.appendChild(svgText(556, 316, '论文两例：IsaacSim「消音」、Genesis 单脚平衡', 'demo-x-mut', 9.5));

    var fin = group(s);
    chip(fin, 30, 344, 740, '论文：ASAP 适应了新动力学，各档成功率都是 100%；没有过拟合，也没有钻模型的空子', C_GOOD, { h: 40, size: 12 });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(chart, seg(t, 0.3, 0.9));
      var toGen = ease(seg(t, 7.0, 8.0));
      var sim = toGen > 0.5 ? 'Genesis' : 'IsaacSim';
      simName.textContent = '表 IV · ' + sim;
      var vals = isaac.map(function (row, j) { return row.map(function (v, k) { return lerp(v, gen[j][k], toGen); }); });
      gb.set(function (it) { return ease(seg(t, 3.6 + it.i * 0.6 + it.k * 0.15, 4.2 + it.i * 0.6 + it.k * 0.15)); }, vals);
      oracle.forEach(function (ln) {
        var y = (BASE - (ln.v / VM) * HM).toFixed(1);
        ln.setAttribute('y1', y);
        ln.setAttribute('y2', y);
        setOpacity(ln, seg(t, 8.4, 9.0));
      });
      setOpacity(succ, seg(t, 10.4, 11.0));
      setOpacity(f7, seg(t, 13.4, 14.0));
      var wig = 0.5 + 0.5 * Math.sin(now * 2);
      drawOn(pB, ease(seg(t, 13.6, 15.4)));
      drawOn(pA, ease(seg(t, 13.8, 15.6)));
      void wig;
      setOpacity(fin, seg(t, 15.4, 16.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: 真机：只学脚踝 4 个自由度（表 V） ── */
  function buildSceneReal() {
    var s = sceneSvg('真机 5 个任务各跑 30 次，另录 10 分钟行走；完整 23 自由度的 Δ 要 400 段以上，采数据时坏了两台 G1，于是只学左右脚踝俯仰和横滚 4 个自由度，100 段就够；任务之间用行走策略衔接；表 V 踢球 61.2 降到 50.2，没见过的詹姆斯消音 159 降到 112');
    s.appendChild(svgText(30, 28, '真机：数据太贵，Δ 只学脚踝 4 个自由度', 'demo-x-ink2', 13.5));

    var body = group(s);
    rectBox(body, 30, 42, 220, 222, C_BORDER, C_SURFACE2);
    body.appendChild(svgText(44, 62, '23 个关节 → 只修 4 个', 'demo-x-ink2', 11.5));
    body.appendChild(paint(svgEl('line', { x1: 50, y1: 240, x2: 230, y2: 240, 'stroke-width': 1.2 }), null, C_BORDER));
    var fig = robot(body, C_MUTED, 1.15, false);
    fig.put(140, 240, { lean: 2, armA: [-24, 6], armB: [24, 36], legA: [12, 2], legB: [-12, -2] }, 0);
    var jts = fig.joints();
    [1, 2, 3, 6, 7, 8, 11].forEach(function (k) { dotAt(body, jts[k][0], jts[k][1], 3.2, C_MUTED); });
    var ankles = [9, 10].map(function (k) { return dotAt(body, jts[k][0], jts[k][1], 8, C_GOOD); });
    body.appendChild(svgText(140, 256, '左右踝：俯仰 + 横滚（连杆传动）', 'demo-x-good', 10, 'middle'));

    var data = group(s);
    rectBox(data, 262, 42, 278, 222, C_BORDER, C_SURFACE2);
    data.appendChild(svgText(276, 62, '真机数据有多贵', 'demo-x-ink2', 11.5));
    data.appendChild(svgText(276, 86, '5 个任务 × 30 次；另录 10 分钟行走', 'demo-x-mut', 10.5));
    data.appendChild(svgText(276, 112, '完整 23 自由度：要 400 段以上', 'demo-x-warn', 10.5));
    rectBox(data, 276, 120, 250, 16, C_WARN, 'none', '4 3');
    var needBar = paint(svgEl('rect', { x: 276, y: 120, width: 0, height: 16, rx: 3, opacity: 0.35 }), C_WARN);
    data.appendChild(needBar);
    data.appendChild(svgText(276, 158, '实际采到：100 段（4 自由度够用）', 'demo-x-good', 10.5));
    var gotBar = paint(svgEl('rect', { x: 276, y: 166, width: 0, height: 16, rx: 3 }), C_GOOD);
    data.appendChild(gotBar);
    var broke = group(data);
    broke.appendChild(svgText(276, 210, '电机很快过热：坏了 2 台 G1', 'demo-x-bad', 10.5));
    [0, 1].forEach(function (k) {
      var f = robot(broke, C_MUTED, 0.3, false);
      f.put(470 + k * 30, 250, POSE_STUMBLE, 0);
      broke.appendChild(paint(svgEl('line', { x1: 460 + k * 30, y1: 218, x2: 482 + k * 30, y2: 248, 'stroke-width': 2.4 }), null, C_BAD));
    });

    var tr = group(s);
    rectBox(tr, 552, 42, 218, 222, C_BORDER, C_SURFACE2);
    tr.appendChild(svgText(564, 62, '没法一键复位：行走策略衔接', 'demo-x-ink2', 11));
    var trMk = K.arrowMarker(s, 'asap-x-arrow-s9', C_ACCENT);
    var trChips = [
      chip(tr, 566, 76, 190, '跟踪任务（如踢球）', C_ACCENT, { h: 30, size: 11 }),
      chip(tr, 566, 130, 190, '行走策略接管，保持平衡', C_GOOD, { h: 30, size: 11 }),
      chip(tr, 566, 198, 190, '下一个跟踪任务', C_ACCENT, { h: 30, size: 11 })
    ];
    tr.appendChild(svgText(661, 176, '命令：线速度、角速度、走 / 站', 'demo-x-mut', 10, 'middle'));
    arrowPath(tr, [[661, 106], [661, 128]], C_ACCENT, trMk);
    arrowPath(tr, [[661, 182], [661, 196]], C_ACCENT, trMk);

    var tbl = group(s);
    rectBox(tbl, 30, 276, 740, 116, C_GOOD, C_SURFACE);
    tbl.appendChild(svgText(44, 296, '表 V：真机全局位置误差（mm）', 'demo-x-ink2', 11.5));
    var BX0 = 214, BX1 = 636, VMAX = 170;
    function bx(v) { return BX0 + (v / VMAX) * (BX1 - BX0); }
    var rows5 = TABLE5.map(function (r, i) {
      var y = 316 + i * 38;
      tbl.appendChild(svgText(44, y + 14, r[0], 'demo-x-ink2', 10.5));
      var bv = paint(svgEl('rect', { x: BX0, y: y, width: 0, height: 13, rx: 2.5 }), C_MUTED);
      var ba = paint(svgEl('rect', { x: BX0, y: y + 16, width: 0, height: 13, rx: 2.5 }), C_GOOD);
      tbl.appendChild(bv);
      tbl.appendChild(ba);
      var lv = svgText(0, y + 11, 'Vanilla ' + fmt(r[1][0], r[1][0] < 100 ? 1 : 0), 'demo-x-mono demo-x-mut', 10);
      var la = svgText(0, y + 27, 'ASAP ' + fmt(r[2][0], r[2][0] < 100 ? 1 : 0), 'demo-x-mono demo-x-good', 10);
      var cut = paint(svgText(758, y + 22, '−' + fmt(drop(r[1][0], r[2][0]), 0) + '%', 'demo-x-good', 13, 'end'), C_GOOD);
      tbl.appendChild(lv);
      tbl.appendChild(la);
      tbl.appendChild(cut);
      return { bv: bv, ba: ba, lv: lv, la: la, cut: cut, v: r[1][0], a: r[2][0] };
    });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(data, seg(t, 0.3, 0.9));
      setOpacity(needBar, 1);
      needBar.setAttribute('width', (250 * ease(seg(t, 3.6, 4.6))).toFixed(1));
      setOpacity(broke, seg(t, 5.0, 5.6));
      setOpacity(body, seg(t, 7.0, 7.6));
      ankles.forEach(function (d) { d.setAttribute('r', (8 + 3 * Math.sin(now * 4)).toFixed(1)); });
      gotBar.setAttribute('width', ((250 * 100) / 400 * ease(seg(t, 8.4, 9.4))).toFixed(1));
      setOpacity(tr, seg(t, 10.4, 11.0));
      var kNow = Math.floor(now / 1.5) % 3;
      trChips.forEach(function (c, k) { setOpacity(c, k === kNow ? 1 : 0.45); });
      setOpacity(tbl, seg(t, 13.4, 14.0));
      rows5.forEach(function (r, i) {
        var u = ease(seg(t, 13.8 + i * 0.9, 14.6 + i * 0.9));
        r.bv.setAttribute('width', ((bx(r.v) - BX0) * u).toFixed(1));
        r.ba.setAttribute('width', ((bx(r.a) - BX0) * u).toFixed(1));
        r.lv.setAttribute('x', (bx(r.v) * 1 + 6).toFixed(1));
        r.la.setAttribute('x', (bx(r.a) + 6).toFixed(1));
        setOpacity(r.lv, u);
        setOpacity(r.la, u);
        setOpacity(r.cut, seg(t, 14.6 + i * 0.9, 15.0 + i * 0.9));
      });
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: 怎么训 Δ（图 10） ── */
  function buildSceneTrainDelta() {
    var s = sceneSvg('图 10 闭环误差：数据量 43、430、4300、43000 段对应 534、105、97.5、98.2；训练时长 0.25、0.5、1、1.5 秒对应 123、118、97.5、113；动作范数权重 0、0.001、0.01、0.1、1 对应 181、169、126、97.5、177；不用 Δ 微调是 145');
    s.appendChild(svgText(30, 28, '怎么训 Δ：数据量、训练时长、动作范数权重（图 10）', 'demo-x-ink2', 13.5));
    var top = group(s);
    chip(top, 30, 40, 740, '红柱：用 Δ 微调后的**闭环 MPJPE**（mm），越低越好；虚线：不用 Δ 微调的 **145**；三幅图的默认配置都是那根 97.5', C_BORDER, { h: 28, size: 10.5 });

    var VM = 200, BASE = 316, HM = 196;
    function panel(x0, title, xs, vals, at) {
      var g = group(s);
      rectBox(g, x0, 76, 240, 262, C_BORDER, C_SURFACE2);
      g.appendChild(svgText(x0 + 12, 96, title, 'demo-x-ink2', 11.5));
      var gb = groupedBars(g, x0 + 10, x0 + 230, BASE, HM, VM, vals.map(function (v) { return [v]; }), [C_BAD], xs, { bw: 40 });
      var wy = BASE - (FIG10.wo / VM) * HM;
      g.appendChild(paint(svgEl('line', { x1: x0 + 10, y1: wy, x2: x0 + 230, y2: wy, 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }), null, C_INK2));
      g.at = at;
      g.gb = gb;
      return g;
    }
    var pData = panel(30, '(a) 数据量（段）', ['43', '430', '4300', '43000'], FIG10.data.closed, 3.6);
    var pHor = panel(280, '(b) 训练时长', FIG10.horizon.x.map(function (h) { return h + ' s'; }), FIG10.horizon.closed, 7.0);
    var pNorm = panel(530, '(c) 动作范数权重', FIG10.norm.x.map(String), FIG10.norm.closed, 10.4);
    var brk = svgText(98, 132, '534：比不微调还糟 3.7 倍', 'demo-x-bad', 10);
    pData.appendChild(brk);
    var best = [pHor, pNorm].map(function (p, k) {
      var it = p.gb.items[k === 0 ? 2 : 3];
      var r = paint(svgEl('rect', { x: it.x - 24, y: BASE - (97.51 / VM) * HM - 22, width: 48, height: (97.51 / VM) * HM + 22, rx: 5, fill: 'none', 'stroke-width': 2 }), null, C_GOOD);
      p.appendChild(r);
      return r;
    });
    var fin = group(s);
    rectBox(fin, 30, 348, 740, 46, C_WARN, C_SURFACE, '4 3');
    fin.appendChild(svgText(44, 366, '论文内部的小出入：表 II 写动作范数权重 −0.2，官方 README 示例是 −0.1，图 10 是 0.1 最好；', 'demo-x-warn', 10.5));
    fin.appendChild(svgText(44, 384, '正文说 4300 → 43000 段「降了 0.65%」，图上是 97.51 → 98.15（涨了 0.66%）。以图为准', 'demo-x-warn', 10.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(top, seg(t, 0.3, 0.9));
      [pData, pHor, pNorm].forEach(function (p) {
        setOpacity(p, seg(t, p.at, p.at + 0.5));
        p.gb.set(function (it) { return ease(seg(t, p.at + 0.3 + it.i * 0.35, p.at + 0.9 + it.i * 0.35)); });
      });
      setOpacity(brk, seg(t, 4.8, 5.3));
      best.forEach(function (r, k) {
        var at = k ? 12.4 : 9.0;
        setOpacity(r, seg(t, at, at + 0.4) * (0.55 + 0.45 * Math.sin(now * 3)));
      });
      setOpacity(fin, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 11: 怎么用 Δ：为什么要 RL 微调（图 11） ── */
  /* 一步匹配的玩具：沿用第 5 幕的弱电机（k = 0.65、当前角度 0.10），π^Δ(y) = −0.35 (y − 0.10)，原策略要 0.30。
     不动点 y ← 0.30 − π^Δ(y) 收敛到 (0.30 − 0.035) / 0.65 ≈ 0.408：真机电机弱，就把目标加大。 */
  var FP = { pi: 0.3, q: 0.1, k: 0.65 };
  function fixedPointIters(n) {
    var y = FP.pi, out = [y];
    for (var i = 0; i < n; i++) {
      y = FP.pi + (1 - FP.k) * (y - FP.q);
      out.push(y);
    }
    return out;
  }
  var FP_ITERS = fixedPointIters(CODE.fixedIters);
  var FP_STAR = (FP.pi - (1 - FP.k) * FP.q) / FP.k;
  /* 图 11 没有标数：按图读的近似值（mm，横轴 0–10 s） */
  function fig11(kind, x) {
    if (kind === 0) return 100 + 60 * Math.min(x / 4, 1) + (x > 4 ? 18 * Math.sin(x * 1.7) : 0); // ASAP（RL 微调）
    if (kind === 1) return x < 4.2 ? 100 + 15 * x : 160 + 190 * Math.pow((x - 4.2) / 1.9, 1.57); // 不微调
    if (kind === 2) return x < 0.8 ? 100 + 40 * x : Math.min(1050, 130 + 920 * Math.min((x - 0.8) / 0.6, 1)) - 60 * Math.max(0, Math.min((x - 3) / 4, 1)) + 120 * Math.max(0, (x - 8.6) / 1.4); // 梯度搜索
    return x < 0.15 ? 100 + 400 * x : Math.min(860, 160 + 1400 * (x - 0.15)) + 140 * Math.min(Math.max((x - 2) / 2, 0), 1) - 60 * Math.max(0, Math.min((x - 6) / 1.5, 1)) - 180 * Math.max(0, Math.min((x - 8) / 1.5, 1)); // 不动点
  }
  function buildSceneUseDelta() {
    var s = sceneSvg('一步匹配：新动作加修正等于原动作；不动点迭代 10 次、梯度搜索 2000 步；玩具里目标从 0.30 迭代到 0.41；图 11 这两种办法开局就冲到 800 到 1000 毫米，不微调的策略 4 秒后发散到 1200 以上，只有 RL 微调稳在 200 以内');
    s.appendChild(svgText(30, 28, '怎么用 Δ：一步反推不行，要在仿真里多步地学', 'demo-x-ink2', 13.5));

    var fp = group(s);
    rectBox(fp, 30, 42, 440, 196, C_BORDER, C_SURFACE2);
    var fm = svgMath(250, 70, '\\pi(s) = \\hat\\pi(s) - \\pi^{\\Delta}\\big(s, \\pi(s)\\big)', { size: 15, anchor: 'middle', w: 400 });
    fp.appendChild(fm);
    fp.appendChild(svgText(44, 104, '玩具（沿用第 5 幕的弱电机，当前角度 0.10）：', 'demo-x-mut', 10.5));
    fp.appendChild(svgText(44, 120, '修正 = −0.35 ×（目标 − 0.10），原策略要 0.30', 'demo-x-mut', 10.5));
    var NX0 = 60, NX1 = 450, NY = 176;
    function nx(v) { return NX0 + ((v - 0.28) / (0.43 - 0.28)) * (NX1 - NX0); }
    fp.appendChild(paint(svgEl('line', { x1: NX0, y1: NY, x2: NX1, y2: NY, 'stroke-width': 1.6 }), null, C_BORDER));
    [0.3, 0.35, 0.4].forEach(function (v) { fp.appendChild(svgText(nx(v), NY + 16, fmt(v, 2), 'demo-x-mono demo-x-mut', 9.5, 'middle')); });
    fp.appendChild(paint(svgEl('line', { x1: nx(FP_STAR), y1: NY - 18, x2: nx(FP_STAR), y2: NY + 6, 'stroke-width': 1.6, 'stroke-dasharray': '3 3' }), null, C_GOOD));
    fp.appendChild(svgText(nx(FP_STAR), NY - 44, '收敛到 ' + fmt(FP_STAR, 3), 'demo-x-good', 10, 'middle'));
    var hop = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 1.6 }), null, C_WARN);
    fp.appendChild(hop);
    var iterDot = dotAt(fp, nx(FP.pi), NY, 6, C_WARN);
    var iterTxt = svgText(44, 222, '', 'demo-x-mono', 11);
    fp.appendChild(iterTxt);
    var weakTxt = svgText(456, 222, '电机弱 → 目标加大；0.65 × 20 × 0.31 = 4.0 N·m', 'demo-x-good', 10, 'end');
    fp.appendChild(weakTxt);

    var code = group(s);
    rectBox(code, 482, 42, 288, 196, C_WARN, C_SURFACE, '4 3');
    code.appendChild(svgText(496, 64, '两种不用 RL 的办法（官方代码）', 'demo-x-warn', 11.5));
    code.appendChild(svgText(496, 88, '不动点迭代：反复代入 10 次', 'demo-x-ink2', 10.5));
    code.appendChild(svgText(496, 108, '梯度搜索：2000 步，步长 0.0002', 'demo-x-ink2', 10.5));
    var why = group(code);
    why.appendChild(svgText(496, 140, '问题一：只对上下一步，短视', 'demo-x-bad', 10.5));
    why.appendChild(svgText(496, 160, '问题二：Δ 只见过有限数据，', 'demo-x-bad', 10.5));
    why.appendChild(svgText(496, 178, '　　　　换到没见过的状态就失灵', 'demo-x-bad', 10.5));
    why.appendChild(svgText(496, 210, 'RL 微调 = 不用求导的多步匹配', 'demo-x-good', 11));

    var f11 = group(s);
    rectBox(f11, 30, 250, 740, 142, C_BORDER, C_SURFACE2);
    f11.appendChild(svgText(44, 270, '图 11（读图示意）：MPJPE（mm）随时间', 'demo-x-ink2', 11));
    var FX0 = 90, FX1 = 640, FY0 = 376, FY1 = 280;
    function fx(x) { return FX0 + (x / 10) * (FX1 - FX0); }
    function fy(v) { return FY0 - (Math.min(v, 1300) / 1300) * (FY0 - FY1); }
    f11.appendChild(paint(svgEl('line', { x1: FX0, y1: FY0, x2: FX1, y2: FY0, 'stroke-width': 1 }), null, C_BORDER));
    [0, 4, 8].forEach(function (x) { f11.appendChild(svgText(fx(x), FY0 + 12, x + ' s', 'demo-x-mono demo-x-mut', 9, 'middle')); });
    [500, 1000].forEach(function (v) { f11.appendChild(svgText(FX0 - 4, fy(v) + 3, String(v), 'demo-x-mono demo-x-mut', 9, 'end')); });
    var CURVES = [['RL 微调（ASAP）', C_GOOD], ['不微调', C_ACCENT], ['梯度搜索', C_WARN], ['不动点迭代', C_BAD]];
    var paths = CURVES.map(function (c, k) {
      var pts = [];
      for (var x = 0; x <= 10.001; x += 0.1) pts.push([fx(x), fy(fig11(k, x))]);
      return pathLine(f11, pts, c[1], k ? 1.8 : 2.6);
    });
    var labs = CURVES.map(function (c, k) {
      var tx = svgText(656, 296 + k * 22, c[0], null, 10.5);
      paint(tx, c[1]);
      f11.appendChild(tx);
      return tx;
    });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(fp, seg(t, 0.2, 0.8));
      /* 迭代一步一跳，循环播放 */
      var shown = t < 3.6 ? 0 : Math.min(6, Math.floor(((now - 3.6) / 0.7) % 9));
      /* 每一步画一段弧：跳得越来越短，停在 0.408 */
      var d = '';
      for (var i = 0; i < shown; i++) {
        var xa = nx(FP_ITERS[i]), xb = nx(FP_ITERS[i + 1]), hh = 6 + 28 * (FP_ITERS[i + 1] - FP_ITERS[i]) / (FP_ITERS[1] - FP_ITERS[0]);
        d += 'M ' + xa.toFixed(1) + ' ' + NY + ' Q ' + ((xa + xb) / 2).toFixed(1) + ' ' + (NY - 2 * hh).toFixed(1) + ' ' + xb.toFixed(1) + ' ' + NY + ' ';
      }
      hop.setAttribute('d', d);
      moveDot(iterDot, [nx(FP_ITERS[shown]), NY]);
      iterTxt.textContent = '第 ' + shown + ' 次：' + fmt(FP_ITERS[shown], 4);
      setOpacity(iterTxt, seg(t, 3.6, 4.0));
      setOpacity(weakTxt, seg(t, 5.6, 6.2));
      setOpacity(code, seg(t, 3.6, 4.2));
      setOpacity(why, seg(t, 10.4, 11.0));
      setOpacity(f11, seg(t, 7.0, 7.6));
      paths.forEach(function (p, k) { drawOn(p, ease(seg(t, k === 0 ? 10.4 : 7.2 + k * 0.6, k === 0 ? 12.4 : 9.2 + k * 0.6))); });
      labs.forEach(function (l, k) { setOpacity(l, seg(t, k === 0 ? 10.6 : 7.4 + k * 0.6, k === 0 ? 11.0 : 7.8 + k * 0.6)); });
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: Δ 学到了什么，局限与之后（图 12、13） ── */
  function buildSceneWhy() {
    var s = sceneSvg('图 12：微调时加均匀随机噪声，幅度 1/40、1/20、1/10、1/5、2/5 对应 182、175.2、173.5、201.5、1208.3，不微调 336.1，ASAP 126.9；图 13：Δ 在下肢比上肢大，踝俯仰最大 0.056，肩部 0.011 到 0.017；局限：坏了两台 G1、依赖动作捕捉、23 自由度要 400 段以上');
    s.appendChild(svgText(30, 28, 'Δ 学到的是有结构的差距，不是随机噪声', 'demo-x-ink2', 13.5));

    var f12 = group(s);
    rectBox(f12, 30, 42, 390, 218, C_BORDER, C_SURFACE2);
    f12.appendChild(svgRich(44, 62, '图 12：微调时加均匀噪声 $\\beta\\,\\delta_a$（Genesis）', { size: 11, w: 370, cls: 'demo-x-ink2' }));
    var VM = 400, BASE = 236, HM = 140;
    var gb = groupedBars(f12, 60, 400, BASE, HM, VM, FIG12.mpjpe.map(function (v) { return [v]; }), [C_WARN], FIG12.label, { bw: 40, dec: 1 });
    function hline(v, color, label, lx) {
      var y = BASE - (v / VM) * HM;
      var g = group(f12);
      g.appendChild(paint(svgEl('line', { x1: 60, y1: y, x2: 400, y2: y, 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }), null, color));
      g.appendChild(paint(svgEl('line', { x1: lx, y1: 80, x2: lx + 22, y2: 80, 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }), null, color));
      g.appendChild(paint(svgText(lx + 28, 84, label, null, 10.5), color));
      return g;
    }
    var lWo = hline(FIG12.wo, C_BAD, '不微调 336.1', 60);
    var lAsap = hline(FIG12.asap, C_GOOD, 'ASAP 126.9', 200);

    var f13 = group(s);
    rectBox(f13, 432, 42, 338, 218, C_BORDER, C_SURFACE2);
    f13.appendChild(svgText(446, 62, '图 13：Δ 在各关节上的平均幅度（点越大越大）', 'demo-x-ink2', 11));
    f13.appendChild(paint(svgEl('line', { x1: 470, y1: 236, x2: 620, y2: 236, 'stroke-width': 1.2 }), null, C_BORDER));
    var fig = robot(f13, C_MUTED, 1.4, false);
    fig.put(540, 236, { lean: 0, armA: [-52, -24], armB: [52, 24], legA: [24, 10], legB: [-24, -10] }, 0);
    var J = fig.joints();
    /* 点的面积跟幅度走：肩、两肘（上肢）、腰、髋、两膝、两踝；标签排在右边一列，用细线连过去 */
    var DOTS = [[1, 0.014], [2, 0.015], [3, 0.015], [11, FIG13_WAIST], [6, 0.038], [7, 0.049], [8, 0.049], [9, 0.056], [10, 0.054]];
    var dots = DOTS.map(function (d) {
      var c = paint(svgEl('circle', { cx: J[d[0]][0], cy: J[d[0]][1], r: 2, opacity: 0.85 }), d[1] > 0.03 ? C_BAD : C_ACCENT);
      f13.appendChild(c);
      c.v = d[1];
      return c;
    });
    var TAGS = [
      [J[1], '肩 0.011–0.017 · 肘 0.015', 'demo-x-ink2', 92],
      [J[11], '腰（三轴合计）0.029', 'demo-x-ink2', 120],
      [J[6], '髋 0.033–0.039', 'demo-x-bad', 148],
      [J[8], '膝 0.049', 'demo-x-bad', 180],
      [J[10], '踝俯仰 0.056 / 0.054（最大）', 'demo-x-bad', 216]
    ];
    var tags = TAGS.map(function (tg) {
      var g = group(f13);
      g.appendChild(paint(svgEl('line', { x1: tg[0][0] + 6, y1: tg[0][1], x2: 616, y2: tg[3] - 4, 'stroke-width': 0.8 }), null, C_MUTED));
      g.appendChild(svgText(620, tg[3], tg[1], tg[2], 10));
      return g;
    });
    var asym = svgText(758, 252, '两侧不对称：踝横滚 0.0228 / 0.017', 'demo-x-mut', 9.5, 'end');
    f13.appendChild(asym);

    var lim = group(s);
    rectBox(lim, 30, 272, 740, 72, C_WARN, C_SURFACE, '4 3');
    lim.appendChild(svgText(44, 292, '局限（第 VIII 节）', 'demo-x-warn', 11.5));
    var LIMS = ['硬件：敏捷动作伤机器，坏了 2 台 G1', '依赖动作捕捉：野外用不了', '数据：23 自由度的 Δ 要 400 段以上'];
    var limChips = LIMS.map(function (str, k) { return chip(lim, 44 + k * 242, 302, 232, str, C_BORDER, { h: 32, size: 10.5 }); });

    var fin = group(s);
    chip(fin, 30, 352, 740, '一句话：**到真机上采数据，学一个残差动作模型，把仿真对齐到真机**，再在对齐后的仿真里接着训练', C_GOOD, { h: 40, size: 12.5 });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(f12, seg(t, 0.3, 0.9));
      gb.set(function (it) { return ease(seg(t, 3.6 + it.i * 0.3, 4.2 + it.i * 0.3)); });
      setOpacity(lWo, seg(t, 4.0, 4.5));
      setOpacity(lAsap, seg(t, 5.2, 5.7));
      setOpacity(f13, seg(t, 7.0, 7.6));
      dots.forEach(function (c, k) {
        var r = 2 + Math.sqrt(c.v) * 46 * (0.9 + 0.1 * Math.sin(now * 3 + k)) * ease(seg(t, 7.4, 8.6));
        c.setAttribute('r', r.toFixed(1));
      });
      tags.forEach(function (g, k) { setOpacity(g, seg(t, 8.0 + k * 0.4, 8.4 + k * 0.4)); });
      setOpacity(asym, seg(t, 10.0, 10.4));
      setOpacity(lim, seg(t, 10.4, 11.0));
      limChips.forEach(function (g, k) { setOpacity(g, seg(t, 10.6 + k * 0.6, 11.0 + k * 0.6)); });
      setOpacity(fin, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  var ASAP_SCENES = [
    {
      title: '仿真里跳得起来，真机上跳不动',
      dur: 17,
      build: buildSceneProblem,
      cues: [
        { at: 0.3, s: '人形要做 C 罗庆祝、1.3 m 侧跳、1.5 m 前跳这种敏捷全身动作，拦路虎是**仿真和真机的动力学对不上**：同一个策略，仿真里跳得起来，真机上跳不动。' },
        { at: 3.6, s: '老路一，**系统辨识**：先定好辨识哪些参数（质心、质量、电机特性……），再用真机数据去估；真实差距常落在参数空间外面，很多平台也测不到真实力矩。' },
        { at: 7.0, s: '老路二，**域随机化**：参数撒一大片，策略学得处处保守，丢的正是敏捷。老路三，用真机数据**学动力学模型**：只在无人机、小车这类低维系统上成功过。' },
        { at: 10.4, s: 'ASAP 走第四条路：不改仿真参数，学一个**残差动作模型** $\\Delta a$，把差距写成「动作该补多少」。' },
        { at: 13.4, s: '两阶段四步（图 2）：① 仿真里预训练跟踪策略 → ② 上真机录轨迹 → ③ 训练残差动作模型 → ④ 把它冻结进仿真里微调策略，上真机时拿掉。' }
      ]
    },
    {
      title: '从人类视频到 G1 参考动作',
      dur: 17,
      build: buildSceneData,
      cues: [
        { at: 0.3, s: '参考动作从哪来？作者自己拍视频：C 罗、科比、詹姆斯的招牌动作，还有跳、踢、单脚平衡、蹲。' },
        { at: 3.6, s: '**TRAM**：从日常视频里估计人的三维动作，连人在世界里走过的轨迹一起估出来；输出 SMPL 人体模型参数：根的位置和朝向、身体姿态、体型。' },
        { at: 7.0, s: '**MaskedMimic**：基于物理的动作跟踪器，在 IsaacGym 里驱动受重力的人体模型去模仿。TRAM 的结果带噪声，跟不上的扔掉 —— 论文叫「sim-to-data」清洗。' },
        { at: 10.4, s: '再分两步重定向（沿用 H2O）：① 优化体型 $\\beta\'$，让 12 个对应部位在静止姿态下贴近 G1；② 体型固定，逐帧优化姿态，让这 12 个部位的位置对上。' },
        { at: 13.4, s: '得到清洗后的 G1 动作库。仿真实验选了 **43 段**，按难度分简单、中等、困难三档；SMPL 和 G1 动作都在官方仓库公开。' }
      ]
    },
    {
      title: '相位跟踪策略：四个训练设计',
      dur: 17,
      build: buildScenePretrain,
      cues: [
        { at: 0.3, s: '第一阶段：每段动作单独训练一个跟踪策略。目标只给一个**时间相位** $\\phi$：0 是动作开头，1 是结尾 —— 对单段动作，这一个数就够了。' },
        { at: 3.6, s: '**非对称演员—评论家**：演员只看最近 5 步的本体感受和 $\\phi$，共 376 维；评论家再看参考的全局位置和根线速度。演员不需要位置目标，上真机就**不需要里程计**。' },
        { at: 7.0, s: '动作是 23 个目标关节角，交给 PD 控制器；PPO 训练。奖励（表 I）分惩罚、正则、跟踪三类：终止罚 **−200**，跟踪里脚的位置权重最高 **2.1**。' },
        { at: 10.4, s: '跳跃一开始老摔，策略干脆学会待在地上。**终止课程**：偏离参考超过 **1.5 m** 才结束回合，随训练收紧到 **0.3 m**。' },
        { at: 13.4, s: '**参考状态初始化（RSI）**：回合从随机相位开始 —— C 罗那一跳要先会落地才学得会起跳。另有基础域随机化（表 VI）：摩擦 0.2–1.1、P 增益 ×0.925–1.05、20–40 ms 控制延迟、每 10 s 推一下。' }
      ]
    },
    {
      title: '上真机录一遍，再放回仿真',
      dur: 17,
      build: buildSceneCollect,
      cues: [
        { at: 0.3, s: '第二阶段先采数据：把预训练策略直接部署到 G1 上做全身跟踪。它能跟，但动作质量不高。' },
        { at: 3.6, s: '每一步用**动作捕捉 + 机载传感器**记下状态 $s_t$：基座位置 3、线速度 3、四元数朝向 4、角速度 3，加上 23 个关节的位置和速度，共 **59 维**。' },
        { at: 7.0, s: '再把真机录下的动作，**原样放回仿真重放**：同样的动作，仿真里的机器人越走越偏 —— 动力学差距变成了看得见的跟踪误差。' },
        { at: 10.4, s: '图 5：IsaacSim 的动作放回 IsaacGym 开环回放，150 步后误差两米多（读图），机器人摔倒。纵轴 **MPJPE** 是平均每个关节的位置误差（mm）。' },
        { at: 13.4, s: '这条偏差就是学习信号：仿真到底差在哪，真机数据会告诉你。' }
      ]
    },
    {
      title: '残差动作模型 Δa',
      dur: 17,
      build: buildSceneDelta,
      cues: [
        { at: 0.3, s: '核心一步：**残差动作模型** $\\pi^{\\Delta}$。它看当前状态 $s_t$ 和真机录下的动作 $a^r_t$，输出修正量 $\\Delta a_t$，加到动作上再送进仿真。' },
        { at: 3.6, s: '训练用 **PPO**：每一步先把仿真摆到真机的状态，执行 $a^r_t + \\Delta a_t$；奖励看仿真的下一步和真机的下一步有多接近（表 II，项目和跟踪奖励同一套）。' },
        { at: 7.0, s: '再罚 $\\Delta a$ 的大小（动作范数）：没差距就别乱补，逼它只补必要的部分。' },
        { at: 10.4, s: '论文的例子：仿真高估了电机力气，跳得起来；真机电机弱，跳不起来。Δ 模型会学着**把下肢动作调小**，让仿真也跳不起来 —— 仿真复现了真机的失败。' },
        { at: 13.4, s: '玩具：G1 脚踝的 PD 刚度 20，假设真机只有 65%。目标 0.30、当前 0.10 rad：仿真力矩 4.0、真机 2.6；修正 **−0.35 × 0.20 = −0.07** 后仿真也是 2.6 —— 官方代码的调试注释里正好有这一行。' }
      ]
    },
    {
      title: '冻结 Δ 微调，部署时拿掉',
      dur: 17,
      build: buildSceneFinetune,
      cues: [
        { at: 0.3, s: '训好的 Δ 模型**冻结**，接进仿真器：策略每输出一个动作，先加上 $\\pi^{\\Delta}$ 的修正，再交给物理引擎。这就是「对齐后的仿真」。' },
        { at: 3.6, s: '在这个仿真里，接着**微调**预训练好的跟踪策略，奖励和预训练完全一样（表 I）。' },
        { at: 7.0, s: '策略于是学会：在「像真机」的动力学下，动作该怎么调才跟得上参考。' },
        { at: 10.4, s: '**部署时把 Δ 拿掉**，只上微调后的策略：Δ 只在训练时帮忙，真机上本来就是真实物理。' },
        { at: 13.4, s: '为什么不在部署时直接用 Δ 把动作反推回来？第 11 幕会看到：那种一步匹配的办法短视，不如在仿真里用强化学习多步地学。' }
      ]
    },
    {
      title: '开环回放：谁复现得准（表 III）',
      dur: 17,
      build: buildSceneOpenLoop,
      cues: [
        { at: 0.3, s: '先在**仿真到仿真**里比：IsaacGym 当训练环境，IsaacSim 和 Genesis 当「真机」。对照：开环回放（什么都不改）、SysID、学状态残差的 Delta Dynamics（图 4）。' },
        { at: 3.6, s: 'SysID 在离散网格里搜基座质心偏移（±2 cm）、基座质量和 23 个关节的 PD 增益比例（×0.95 / 1 / 1.05）；Delta Dynamics 直接预测下一步状态差多少。' },
        { at: 7.0, s: '**开环评测**：把测试环境的动作拿回训练环境里回放，看能不能复现那条轨迹。表 III：回放 0.25 s，四种办法都在 20 mm 上下。' },
        { at: 10.4, s: '回放 1 s：开环 80.8、SysID 77.6、Delta Dynamics 68.1，**ASAP 37.9**，比开环少 **53%**。SysID 的误差随时间累积；Delta Dynamics 过拟合，误差一级级放大。' },
        { at: 13.4, s: 'Genesis 上一样：1 s 时 ASAP 36.9、开环 82.5。注意根相对 MPJPE 一列是 Delta Dynamics 最低；ASAP 赢的是全局位置、加速度和速度。' }
      ]
    },
    {
      title: '闭环微调：仿真到仿真（表 IV）',
      dur: 17,
      build: buildSceneClosedLoop,
      cues: [
        { at: 0.3, s: '再比**闭环**：用三种办法分别改造训练环境，在里面微调策略，再拿到测试环境里跑。全部用同一套奖励。' },
        { at: 3.6, s: '表 IV，IsaacSim：简单档 ASAP 106、开环 107、SysID 105，几乎一样；困难档 **ASAP 129**，开环 148、SysID 165。' },
        { at: 7.0, s: 'Genesis 差距更大：困难档开环 175、SysID 186、Delta Dynamics 190，**ASAP 129**，离只在 IsaacGym 里跑的上限 Oracle（116）不远。' },
        { at: 10.4, s: '成功率：ASAP 两个仿真器、三档难度都是 **100%**；Delta Dynamics 困难档只有 66.7% 和 60%。' },
        { at: 13.4, s: '图 7 逐帧对比：微调前误差越积越大，微调后一直稳着。论文说它适应了新动力学，没有过拟合、也没有钻模型的空子。' }
      ]
    },
    {
      title: '真机：只学脚踝 4 个自由度（表 V）',
      dur: 17,
      build: buildSceneReal,
      cues: [
        { at: 0.3, s: '上**真机**：选了 5 个任务 —— 踢球、前跳、前后迈步、单脚平衡、单脚跳，每个跑 30 次；另录了 10 分钟行走数据。' },
        { at: 3.6, s: '训练完整的 23 自由度 Δ 模型，至少要 **400 多段**动作；这些动作让电机很快过热，采数据时**坏了两台 G1**。' },
        { at: 7.0, s: '于是只学**脚踝 4 个自由度**（左右踝的俯仰和横滚）：G1 的脚踝是连杆传动，仿真最难建模。**100 段**数据就够训练。' },
        { at: 10.4, s: '真机上没法一键复位：训了一个**行走策略**做衔接，命令是线速度、角速度和走 / 站；一个跟踪任务做完就接管，保持平衡等下一个。' },
        { at: 13.4, s: '表 V：踢球的全局误差 61.2 → **50.2**（少 18%）；没参与训练 Δ 的詹姆斯「消音」159 → **112**（少 30%）。四项指标全部下降。' }
      ]
    },
    {
      title: '怎么训 Δ：数据量、时长、范数（图 10）',
      dur: 17,
      build: buildSceneTrainDelta,
      cues: [
        { at: 0.3, s: '怎么训 Δ 才好？图 10 在 IsaacGym → IsaacSim 上扫了三个因素。红柱是用 Δ 微调后的**闭环误差**，虚线是不微调的 145。' },
        { at: 3.6, s: '**数据量**：43 段时闭环误差 **534**，比不微调还糟得多；430 段 105，4300 段 97.5，加到 43000 段几乎不变。' },
        { at: 7.0, s: '**训练时长**（每段 rollout 多长）：0.25 s 123、0.5 s 118、**1 s 最好 97.5**、1.5 s 又回到 113 —— 开环越长越准，闭环不是。' },
        { at: 10.4, s: '**动作范数权重**：0 时 181，比不微调还差；**0.1 最好 97.5**；拧到 1，Δ 被压得太小，回到 177。' },
        { at: 13.4, s: '数字的小出入：表 II 写动作范数权重 −0.2，官方 README 示例是 −0.1，图 10 是 0.1 最好；正文说 4300 → 43000「降了 0.65%」，图上是 97.51 → 98.15。我们按图读。' }
      ]
    },
    {
      title: '怎么用 Δ：为什么要 RL 微调（图 11）',
      dur: 17,
      build: buildSceneUseDelta,
      cues: [
        { at: 0.3, s: '有了 Δ，还有不用强化学习的用法：假设一步就能对上，要求「新动作 + 修正 = 原动作」，解出新动作：$\\pi(s) = \\hat\\pi(s) - \\pi^{\\Delta}(s, \\pi(s))$。' },
        { at: 3.6, s: '**不动点迭代**：从原动作出发反复代入（官方代码 10 次）；**梯度搜索**：最小化两边之差（2000 步）。玩具：沿用第 5 幕的弱电机，目标从 0.30 迭代到 0.41 —— 电机弱，就把目标加大。' },
        { at: 7.0, s: '图 11（读图）：这两种办法开局 1–2 s 误差就冲到 800–1000 mm；不微调的策略 4 s 后开始发散，10 s 涨到 1200 以上。' },
        { at: 10.4, s: '只有 **RL 微调**一直稳在 200 mm 以内。原因：一步匹配是**短视**的；Δ 只在有限数据上训练，换到没见过的状态就失灵。' },
        { at: 13.4, s: '多步匹配本该对仿真器求导，一般做不到；**RL 微调相当于一个不用求导的多步匹配**。' }
      ]
    },
    {
      title: 'Δ 学到了什么，局限与之后（图 12、13）',
      dur: 17,
      build: buildSceneWhy,
      cues: [
        { at: 0.3, s: 'Δ 是不是只相当于加随机噪声？对照：微调时给动作加均匀噪声 $\\beta\\,\\delta_a$，幅度 $\\beta$ 从 0.025 扫到 0.4，在 Genesis 里测（图 12）。' },
        { at: 3.6, s: '噪声在 0.025–0.2 之间确实有用：最好 **173.5**，不微调 336.1；可 **ASAP 是 126.9**。噪声加到 0.4，误差飙到 1208。' },
        { at: 7.0, s: '图 13 把 Δ 在各关节上的平均幅度画出来：下肢比上肢大，**踝俯仰最大 0.056**，肩部只有 0.011–0.017，两侧还不对称 —— 有结构的差距，均匀噪声补不了。' },
        { at: 10.4, s: '局限：敏捷动作伤机器（坏了两台 G1）；依赖**动作捕捉**，野外用不了；完整 23 自由度的 Δ 要 400 段以上数据。作者提的方向：防损伤策略、免动捕对齐、少样本适配。' },
        { at: 13.4, s: '一句话：别只在仿真里猜参数、撒随机数 —— **到真机上采数据，学一个残差动作模型，把仿真对齐到真机**，再在对齐后的仿真里接着训练。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十二幕动画：ASAP 全流程速览',
      sub: '约 204 秒自动播放。空格播放/暂停，← → 换幕；表格数字照抄论文，玩具算例与下面三个演示、笔记「具体实例」用的是同一份数。',
      ariaLabel: 'ASAP 十二幕讲解动画',
      notes: [
        '取数依据：第 3、5、7、8、9 幕的数字照抄论文第 II–IV 节与表 I、II、III、IV、V、VI、VII（arXiv 2502.01143 v3，和 v1 的数字相同）；第 10、12 幕照抄图 10、图 12、图 13 柱上的标注；' +
          '第 3 幕的 376 维按第 II-B 节逐项相加（75 × 5 + 1），第 4 幕的 59 维按第 III-A 节相加；第 5 幕的刚度 20、0.65 倍与 −0.35 取自官方代码（G1 配置与 `delta_a_open_loop.py` 的调试注释），第 11 幕的 10 次 / 2000 步取自 `delta_a_closed_loop.py`；53%、18%、30%、3.7 倍是在论文数字上现算的。',
        '**读图与示意**：图 5（第 4 幕）、图 11（第 11 幕）没有标数，曲线是按图读的近似值；图 7（第 8 幕）只画走势；第 1、3、5、6 幕的火柴人与跳跃、第 2 幕的 12 个点、第 3 幕的终止带与 RSI 小人是示意。' +
          '**玩具**：第 5 幕的单关节（转动惯量、摩擦、目标曲线是编的）与第 11 幕的一步匹配（沿用第 5 幕的弱电机）只演示机制，数值不能和论文比。'
      ],
      scenes: ASAP_SCENES
    });
  }

  // ─── the narrated vertical video of the same twelve scenes ─────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：ASAP 十二幕全流程',
      sub: '10 分 38 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十二幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '11.6 MB',
      fileName: 'ASAP_讲解视频.mp4'
    });
  }

  K.mount({
    'asap-explainer': buildExplainerDemo,
    'asap-video': buildVideoDemo,
    'asap-delta': buildDeltaDemo,
    'asap-tables': buildTablesDemo,
    'asap-ablation': buildAblationDemo
  });
})();
