/* Interactive demos for papers/01_Foundational_RL/LCP_Sim-to-Real_Action_Smoothing
 * （Chen, He, Wang 等 · Learning Smooth Humanoid Locomotion through Lipschitz-Constrained Policies ·
 *   arXiv 2410.11825 v3，官方仓库标注 IROS 2025）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["lcp"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   lcp-explainer   — 十幕讲解动画：仿真里的理想电机 → Lipschitz 与梯度 → 式 4–7 → 罚的是 log π 的梯度 →
 *                     几行代码接进 PPO → 观测、ROA 与「罚整段输入」 → 命令、奖励与课程 →
 *                     三种平滑办法（表 I(a)）→ λ_gp 扫一遍（表 I(b)）→ 四台真机与局限
 *   lcp-video       — 同一套十幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   lcp-sensitivity — Lipschitz 圆锥（图 2）：观测抖 σ，动作最多抖 Kσ；式 4 的最大斜率 vs 式 5 的期望
 *   lcp-gp          — 高斯策略上 E‖∇ₛ log π‖² = ‖J‖²_F / σ²：单个样本与样本平均（玩具算例）
 *   lcp-table       — 论文表 I(a)(b)(c)、表 II、表 III 的六项指标浏览器
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
    barLabel = K.barLabel,
    registerRenderer = K.registerRenderer,
    mulberry32 = K.mulberry32,
    gauss = K.gauss;

  // ─── 论文里的数字（arXiv 2410.11825 v3；正文与 v1 / v2 相同，附录 A–C 是 v3 新加的） ───
  /* 表 I–IV、式 4–9、附录 B 照抄；官方代码（zixuan417/smooth-humanoid-locomotion）的数单独标出。
     十幕动画、三个演示与笔记「🚶 具体实例」共用这一份。 */
  var LAMBDA_GP = 0.002, LAMBDA_ROA = 0.1; // 式 7、附录 A：λ_gp = 0.002，ROA 的 λ = 0.1
  var HZ = 50, EP_STEPS = 500, CMD_EVERY = 150; // 表 I 标题：500 步 = 10 s；第 V 节：每 150 步重抽命令
  var CMD_RANGE = [[0, 0.8], [-0.4, 0.4], [-0.6, 0.6]]; // 第 V 节：v_x、v_y（m/s）、v_yaw（rad/s）
  var SEEDS = 3, EVAL_ENVS = 1000; // 表 I 标题：3 个随机种子、1000 个环境
  var METRICS = [
    // 表 I 的六列：名称 / 单位（第 VI-B 节）/ 越小越好？
    ['动作抖动', 'rad/s³', true],
    ['关节位置抖动', 'rad/s³', true],
    ['关节速度', 'rad/s', true],
    ['能耗', 'N·rad/s', true],
    ['机身加速度', 'm/s²', true],
    ['任务回报', '', false]
  ];
  var TABLE1A = [
    // 表 I(a)：平滑办法（均值、标准差）
    ['LCP（本文）', [3.21, 0.17, 10.65, 24.57, 0.06, 26.03], [0.11, 0.01, 0.37, 1.17, 0.002, 1.51]],
    ['平滑奖励', [5.74, 0.19, 11.35, 25.92, 0.06, 26.56], [0.08, 0.002, 0.51, 0.84, 0.002, 0.26]],
    ['低通滤波', [7.86, 0.23, 11.72, 32.83, 0.06, 24.98], [3.0, 0.04, 0.14, 5.5, 0.002, 1.29]],
    ['不平滑', [42.19, 0.41, 12.92, 42.68, 0.09, 28.87], [4.72, 0.08, 0.99, 10.27, 0.01, 0.85]]
  ];
  var TABLE1B = [
    // 表 I(b)：λ_gp（0 那一行就是不平滑，0.002 那一行就是 LCP）
    [0, [42.19, 0.41, 12.92, 42.68, 0.09, 28.87], [4.72, 0.08, 0.99, 10.27, 0.01, 0.85]],
    [0.001, [3.69, 0.21, 11.44, 27.09, 0.06, 26.32], [0.31, 0.05, 1.18, 4.44, 0.01, 1.2]],
    [0.002, [3.21, 0.17, 10.65, 24.57, 0.06, 26.03], [0.11, 0.01, 0.37, 1.17, 0.002, 1.51]],
    [0.005, [2.1, 0.15, 10.44, 26.24, 0.05, 23.92], [0.05, 0.01, 0.7, 3.5, 0.002, 2.05]],
    [0.01, [0.17, 0.07, 2.75, 5.89, 0.007, 16.11], [0.01, 0.0, 0.12, 0.28, 0.0, 2.76]]
  ];
  var TABLE1C = [
    // 表 I(c)：GP 加在哪些输入上
    ['整段输入（本文）', [3.21, 0.17, 10.65, 24.57, 0.06, 26.03], [0.11, 0.01, 0.37, 1.17, 0.002, 1.51]],
    ['只罚当前观测', [7.16, 0.35, 13.7, 35.18, 0.09, 25.44], [0.6, 0.03, 1.5, 4.84, 0.005, 3.73]]
  ];
  var TABLE2 = [
    // 表 II：Isaac Gym 训练、MuJoCo 测试（3 次 × 500 步）
    ['Fourier GR1', [1.47, 0.34, 9.54, 36.38, 0.08, 24.33], [0.43, 0.07, 1.53, 2.97, 0.004, 1.25]],
    ['Unitree H1', [0.44, 0.1, 9.12, 76.22, 0.04, 21.74], [0.03, 0.007, 0.38, 5.81, 0.005, 1.4]],
    ['Berkeley Humanoid', [1.77, 0.12, 7.92, 19.99, 0.06, 26.5], [0.32, 0.01, 0.21, 0.36, 0.0, 0.57]]
  ];
  var TERRAINS = ['平地', '软地', '粗糙地面'];
  var TABLE3 = [
    // 表 III：真机，三个模型各跑 10 s；只报了前三项指标。[机器人, [平地], [软地], [粗糙]]，每格 [均值三项, 标准差三项]
    ['Fourier GR1', [[1.12, 0.28, 10.82], [0.16, 0.13, 1.58]], [[1.18, 0.24, 10.45], [0.17, 0.09, 1.42]], [[1.18, 0.26, 11.61], [0.22, 0.11, 1.64]]],
    ['Unitree H1', [[1.11, 0.14, 10.95], [0.07, 0.01, 0.53]], [[1.18, 0.15, 11.8], [0.09, 0.01, 0.57]], [[1.2, 0.14, 11.68], [0.09, 0.01, 0.84]]],
    ['Berkeley Humanoid', [[1.56, 0.1, 4.99], [0.1, 0.01, 0.6]], [[1.66, 0.12, 6.78], [0.03, 0.01, 1.57]], [[1.63, 0.11, 5.02], [0.11, 0.01, 0.48]]]
  ];
  var TABLE4 = [
    // 附录表 IV：正则奖励（照抄，前三项论文没写负号）
    ['机身角速度（横滚、俯仰）', '0.2'], ['关节力矩', '6e−7'], ['碰撞', '10'], ['竖直线速度', '−1.5'],
    ['触地力', '−0.002'], ['绊脚', '−1.25'], ['关节限位', '−10'], ['机身姿态', '−1.0']
  ];
  var CURRIC = { s0: 0.8, up: 1.0001, down: 0.9999, hi: 400, lo: 50, cap: 2.0 }; // 附录 B
  var ROBOTS = [
    // 第 VI-A 节
    ['Fourier GR1T1 / T2', '21 个关节，脚踝横滚力矩太小当被动关节，控制 19 个'],
    ['Unitree H1', '19 个关节，全部主动控制'],
    ['Berkeley Humanoid', '高 0.85 m，12 个自由度'],
  ];
  /* 官方代码（GR1 配置 gr1_walk_phase_config.py 与 rsl_rl 的 ppo_rma.py）里的数 */
  var OBS_GR1 = {
    proprio: [['步态相位', 2], ['速度命令', 3], ['机身角速度', 3], ['横滚、俯仰', 2], ['关节位置', 21], ['关节速度', 21], ['上一步动作', 19]],
    priv: [['质量与质心', 4], ['摩擦', 1], ['电机强度', 42], ['机身线速度', 3]],
    hist: 10
  };
  var CODE = { envs: 4096, steps: 24, lr: 2e-4, kl: 0.008, entropy: 0.01, epochs: 5, minibatches: 4, gpSched: [0.002, 0.002, 700, 1000], privSched: [0, 0.1, 2000, 3000] };

  function sum(a) {
    return a.reduce(function (x, y) { return x + y; }, 0);
  }
  var N_PROPRIO = sum(OBS_GR1.proprio.map(function (r) { return r[1]; })); // 71
  var N_PRIV = sum(OBS_GR1.priv.map(function (r) { return r[1]; })); // 50
  var N_OBS = N_PROPRIO + N_PRIV + OBS_GR1.hist * N_PROPRIO; // 831

  /* 附录 B：s 从 s0 涨到上限要乘多少次 1.0001 */
  function curriculumSteps(s0, cap, up) {
    return Math.ceil(Math.log(cap / s0) / Math.log(up));
  }

  /* rsl_rl 的系数表 [起点, 终点, 开始迭代, 过渡迭代数]：线性插值 */
  function schedule(sch, it) {
    var u = Math.min(Math.max(it - sch[2], 0) / sch[3], 1);
    return sch[0] + u * (sch[1] - sch[0]);
  }

  // ─── 玩具策略（第 2、3 幕与 lcp-sensitivity 共用） ───────────────────────────
  /* π(o) = o + b·sin(ω o)。它的导数 1 + bω cos(ω o) 在 o = 0 处最大，所以最大斜率（Lipschitz 常数）
     K = 1 + bω。它只用来把「斜率 = 放大倍数」画出来，不是论文的策略。 */
  var OMEGA = 4.5;
  var TOY_K = 5, TOY_SIGMA = 0.045, TOY_SEED = 6, TOY_STEPS = 120;

  function policyOf(kLip) {
    var b = Math.max(0, (kLip - 1) / OMEGA);
    return function (o) {
      return o + b * Math.sin(OMEGA * o);
    };
  }
  function slopeOf(kLip) {
    var b = Math.max(0, (kLip - 1) / OMEGA);
    return function (o) {
      return 1 + b * OMEGA * Math.cos(OMEGA * o);
    };
  }
  function toyTrajectory(t) {
    return 0.9 * Math.sin(t * 0.055);
  }

  /* 一段带噪观测上的动作：抖动 = 动作减去无噪时应有的动作，取标准差 */
  function toyRun(kLip, sigma, seed) {
    var pi = policyOf(kLip),
      dpi = slopeOf(kLip),
      rng = mulberry32(seed);
    var trueA = [], noisyA = [], resid = [], sq = 0;
    for (var t = 0; t < TOY_STEPS; t++) {
      var o = toyTrajectory(t);
      var on = o + sigma * gauss(rng);
      trueA.push(pi(o));
      noisyA.push(pi(on));
      resid.push(pi(on) - pi(o));
      sq += dpi(o) * dpi(o);
    }
    var m = sum(resid) / resid.length;
    var jit = Math.sqrt(sum(resid.map(function (r) { return (r - m) * (r - m); })) / resid.length);
    return { pi: pi, trueA: trueA, noisyA: noisyA, jit: jit, rmsSlope: Math.sqrt(sq / TOY_STEPS) };
  }
  var TOY = toyRun(TOY_K, TOY_SIGMA, TOY_SEED);

  // ─── 高斯策略算例（第 4 幕、lcp-gp 与笔记第 4 步共用） ─────────────────────────
  /* a ~ N(μ(s), σ²I)，μ(s) = J s：∇ₛ log π = Jᵀ(a − μ)/σ²，对 a 取期望得 ‖J‖²_F / σ²（推导见笔记） */
  var GAUSS_J = [[0.8, 0.2], [-0.4, 0.6]];
  var GAUSS_SIGMA = 0.4;
  var GAUSS_Z = [1, -0.5]; // 第一个样本：a − μ = σ·(1, −0.5) = (0.4, −0.2)
  var GAUSS_N = 200, GAUSS_SEED = 36;

  function frob2(J) {
    return J[0][0] * J[0][0] + J[0][1] * J[0][1] + J[1][0] * J[1][0] + J[1][1] * J[1][1];
  }
  /* 单个样本：dev = a − μ */
  function gradLogPi(J, sigma, dev) {
    var s2 = sigma * sigma;
    return [(J[0][0] * dev[0] + J[1][0] * dev[1]) / s2, (J[0][1] * dev[0] + J[1][1] * dev[1]) / s2];
  }
  function gaussSamples(J, sigma, n, seed) {
    var rng = mulberry32(seed);
    var devs = [], vals = [], run = [], acc = 0;
    for (var i = 0; i < n; i++) {
      var z = i === 0 ? GAUSS_Z : [gauss(rng), gauss(rng)];
      var dev = [sigma * z[0], sigma * z[1]];
      var g = gradLogPi(J, sigma, dev);
      var v = g[0] * g[0] + g[1] * g[1];
      acc += v;
      devs.push(dev);
      vals.push(v);
      run.push(acc / (i + 1));
    }
    return { devs: devs, vals: vals, run: run };
  }
  var GAUSS = (function () {
    var s = gaussSamples(GAUSS_J, GAUSS_SIGMA, GAUSS_N, GAUSS_SEED);
    return {
      fro: frob2(GAUSS_J),
      expect: frob2(GAUSS_J) / (GAUSS_SIGMA * GAUSS_SIGMA),
      first: s.vals[0],
      grad0: gradLogPi(GAUSS_J, GAUSS_SIGMA, s.devs[0]),
      mean: s.run[GAUSS_N - 1],
      half: frob2(GAUSS_J) / (0.25 * GAUSS_SIGMA * GAUSS_SIGMA),
      s: s
    };
  })();

  // ─── demo 1: Lipschitz 圆锥 ────────────────────────────────────────────────
  function buildSensitivityDemo(host) {
    var root = card(host, {
      title: 'Lipschitz 常数：观测抖一点，动作最多抖几倍',
      sub:
        '式 1：$\\lVert f(x_1) - f(x_2) \\rVert \\le K \\lVert x_1 - x_2 \\rVert$。图 2 的画法是在曲线上任一点画斜率 $\\pm K$ 的圆锥，整条曲线都落在里面。' +
        '拖动 $K$ 和观测噪声，看动作序列什么时候开始发毛，再对比「最大斜率」（式 4）和「访问到的状态上的均方根斜率」（式 5）。'
    });

    var state = { kLip: TOY_K, noise: TOY_SIGMA, seed: TOY_SEED, o0: 0 };

    var ctrls = controlsRow(root);
    var kSlider = slider(ctrls, {
      label: '策略的 Lipschitz 常数 $K$',
      min: 1, max: 14, step: 0.1, value: state.kLip,
      format: function (v) { return fmt(v, 1); },
      onInput: function (v) { state.kLip = v; render(); }
    });
    var sigSlider = slider(ctrls, {
      label: '观测噪声 $\\sigma$（编码器 / IMU）',
      min: 0, max: 0.12, step: 0.001, value: state.noise,
      format: function (v) { return fmt(v, 3); },
      onInput: function (v) { state.noise = v; render(); }
    });
    slider(ctrls, {
      label: '圆锥顶点 $o_0$',
      min: -1, max: 1, step: 0.01, value: state.o0,
      format: function (v) { return fmt(v, 2); },
      onInput: function (v) { state.o0 = v; render(); }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '回到默认（$K$ = 5，$\\sigma$ = 0.045）', function () {
      state.kLip = TOY_K; state.noise = TOY_SIGMA; state.seed = TOY_SEED;
      kSlider.set(TOY_K, true);
      sigSlider.set(TOY_SIGMA, true);
      render();
    });
    button(btns, '换一段噪声', function () {
      state.seed = (state.seed * 1103515245 + 12345) % 99991;
      render();
    });

    var setLegend = legend(root, [
      { key: 'good', text: '策略 $\\pi(o)$' },
      { key: 'accent', text: '斜率 $\\pm K$ 的圆锥（图 2）' },
      { key: 'bad', text: '$\\pm 2\\sigma$ 的观测噪声被放大成的动作带' },
      { key: 'muted', text: '无噪时应有的动作' }
    ]);

    var grid = stageGrid(root);
    var fnStage = stage(grid, 250);
    var seqStage = stage(grid, 250);

    var stats = statsRow(root);
    var sK = stats.add('最大斜率 $K$（式 4 管的）');
    var sRms = stats.add('访问到的状态上的均方根斜率（式 5）');
    var sJit = stats.add('动作抖动 std');
    var sBound = stats.add('上界 $K \\sigma$');
    var verdict = verdictBox(root);

    note(root, [
      '**上界是乘法**：$|\\pi(o + \\varepsilon) - \\pi(o)| \\le K|\\varepsilon|$，所以噪声标准差 $\\sigma$ 进来，动作最多抖 $K\\sigma$。默认 $K = 5$、$\\sigma = 0.045$ 时上界 0.225、实测 0.142 —— 实测比上界小，因为 $K$ 是**最大**斜率，轨迹不总在最陡的地方。',
      '**式 4 → 式 5**：论文先要求所有状态上的梯度都不超过 $K$（式 4），算不出来，就按 TRPO 的做法换成 rollout 数据上的期望（式 5）。这条轨迹上最大斜率 5，均方根斜率只有 ' + fmt(TOY.rmsSlope, 2) + ' —— 期望只管策略真正走得到的状态。',
      '**仿真里也抖**：论文表 I 的「不平滑」策略在 Isaac Gym 里动作抖动 42.19（LCP 3.21），任务回报反而最高 28.87。问题不是仿真看不出抖，而是仿真里的电机近乎理想，抖也照单全收、不扣分；真机电机打不出这种力矩。',
      '**这是玩具模型**：一维的 $\\pi(o) = o + b\\sin(\\omega o)$，最大斜率 $K = 1 + b\\omega$；论文的策略是 MLP、观测几百维、动作 12–19 维，抖动指标是三阶导（见「论文表格浏览器」）。这里的数只说明「斜率 = 放大倍数」，不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var run = toyRun(state.kLip, state.noise, state.seed);
      var pi = run.pi,
        dpi = slopeOf(state.kLip);
      sK.set(fmt(state.kLip, 2), state.kLip < 4 ? 'good' : state.kLip > 9 ? 'bad' : 'warn');
      sRms.set(fmt(run.rmsSlope, 2), 'accent');
      sJit.set(fmt(run.jit, 3), run.jit < 0.06 ? 'good' : run.jit > 0.2 ? 'bad' : 'warn');
      sBound.set(fmt(state.kLip * state.noise, 3), 'accent');

      if (state.noise < 0.001) {
        verdict.set(
          '🧪 $\\sigma$ = 0：观测没有噪声，动作就跟着真实状态走、不发毛。但 $K$ = ' + fmt(state.kLip, 1) +
            ' 还在：状态本身一变（换步、被推），动作照样按最多 ' + fmt(state.kLip, 1) + ' 倍去变。论文表 I 的「不平滑」策略在仿真里就抖得很凶（42.19），只是理想电机照单全收。',
          'frozen'
        );
      } else if (run.jit > 0.2) {
        verdict.set(
          '📳 $K$ = ' + fmt(state.kLip, 1) + '、$\\sigma$ = ' + fmt(state.noise, 3) + '：抖动 std ' + fmt(run.jit, 3) +
            '，上界 $K\\sigma$ = ' + fmt(state.kLip * state.noise, 3) + '。高频指令送进 PD，真机电机跟不上、发热、嗡嗡响。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ $K$ = ' + fmt(state.kLip, 1) + ' 时抖动只有 ' + fmt(run.jit, 3) + '（上界 ' + fmt(state.kLip * state.noise, 3) +
            '）。左图：$K$ 小时曲线平缓，圆锥张得窄也装得下；$K$ 大时满是褶皱，输入挪一点就跳到另一个值。',
          'learning'
        );
      }

      // ── 左：策略函数 + 圆锥 ──
      var g = begin(fnStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 22, b: 34 }, [-1.2, 1.2], [-2.2, 2.2]);
      axes(g, p, { xTicks: [-1, -0.5, 0, 0.5, 1], yTicks: [-2, -1, 0, 1, 2], xLabel: '观测 o' });
      text(g.ctx, '策略函数：斜率就是放大倍数', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var o0 = state.o0,
        a0 = pi(o0);
      g.ctx.save();
      g.ctx.beginPath();
      g.ctx.moveTo(p.sx(-1.2), p.sy(clamp(a0 + state.kLip * (-1.2 - o0), -2.2, 2.2)));
      g.ctx.lineTo(p.sx(o0), p.sy(a0));
      g.ctx.lineTo(p.sx(1.2), p.sy(clamp(a0 + state.kLip * (1.2 - o0), -2.2, 2.2)));
      g.ctx.lineTo(p.sx(1.2), p.sy(clamp(a0 - state.kLip * (1.2 - o0), -2.2, 2.2)));
      g.ctx.lineTo(p.sx(o0), p.sy(a0));
      g.ctx.lineTo(p.sx(-1.2), p.sy(clamp(a0 - state.kLip * (-1.2 - o0), -2.2, 2.2)));
      g.ctx.closePath();
      g.ctx.fillStyle = P.accent;
      g.ctx.globalAlpha = 0.12;
      g.ctx.fill();
      g.ctx.restore();
      [1, -1].forEach(function (sgn) {
        line(g.ctx, [[p.sx(-1.2), p.sy(clamp(a0 - sgn * state.kLip * (o0 + 1.2), -2.2, 2.2))], [p.sx(1.2), p.sy(clamp(a0 + sgn * state.kLip * (1.2 - o0), -2.2, 2.2))]], P.accent, 1.2, [4, 3]);
      });
      var pts = [];
      for (var s = 0; s <= 240; s++) {
        var o2 = -1.2 + (2.4 * s) / 240;
        pts.push([p.sx(o2), p.sy(clamp(pi(o2), -2.2, 2.2))]);
      }
      line(g.ctx, pts, P.good, 2.2);
      var lo = o0 - 2 * state.noise,
        hi = o0 + 2 * state.noise;
      g.ctx.save();
      g.ctx.fillStyle = P.bad;
      g.ctx.globalAlpha = 0.25;
      g.ctx.fillRect(p.sx(lo), p.y1, Math.max(2, p.sx(hi) - p.sx(lo)), p.y0 - p.y1);
      var aLo = pi(lo), aHi = pi(hi);
      g.ctx.fillRect(p.x0, p.sy(Math.max(aLo, aHi)), p.x1 - p.x0, Math.max(2, Math.abs(p.sy(aLo) - p.sy(aHi))));
      g.ctx.restore();
      dot(g.ctx, p.sx(o0), p.sy(a0), 4.5, P.accent, P.surface2);
      text(g.ctx, '这一点的斜率 ' + fmt(dpi(o0), 2), p.sx(o0) + 8, p.y0 - 8, P.text, 'left', '10px sans-serif');

      // ── 右：动作时间序列 ──
      var g2 = begin(seqStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [0, TOY_STEPS], [-2.2, 2.2]);
      axes(g2, p2, { xTicks: K.niceTicks(0, TOY_STEPS, 4), yTicks: [-2, -1, 0, 1, 2], xLabel: '控制步' });
      text(g2.ctx, '策略发出的关节指令', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      line(g2.ctx, run.trueA.map(function (v, i3) { return [p2.sx(i3), p2.sy(clamp(v, -2.2, 2.2))]; }), P2.muted, 1.6, [5, 4]);
      line(g2.ctx, run.noisyA.map(function (v, i4) { return [p2.sx(i4), p2.sy(clamp(v, -2.2, 2.2))]; }), run.jit > 0.2 ? P2.bad : P2.accent, 1.8);

      fnStage.canvas.setAttribute('aria-label', '玩具策略函数、斜率 ±K 的圆锥与观测噪声带');
      seqStage.canvas.setAttribute('aria-label', '带噪观测下策略输出的关节指令时间序列');
    });

    render();
  }

  // ─── demo 2: 罚的是 log π 的梯度 ───────────────────────────────────────────
  function buildGpDemo(host) {
    var root = card(host, {
      title: '式 7 罚的是 $\\nabla_s \\log \\pi(a \\mid s)$：高斯策略上它等于什么',
      sub:
        '对角高斯策略 $a \\sim \\mathcal{N}(\\mu(s), \\sigma^2 I)$、均值线性 $\\mu(s) = Js$ 时，$\\nabla_s \\log\\pi = J^\\top(a - \\mu)/\\sigma^2$，' +
        '对动作取期望得 $\\mathbb{E}\\lVert\\nabla_s\\log\\pi\\rVert^2 = \\lVert J\\rVert_F^2/\\sigma^2$。训练时每个状态只有 rollout 里那一个动作 —— 拖动样本数，看单个样本的值怎么收敛到期望。'
    });

    var state = { sigma: GAUSS_SIGMA, scale: 1, n: 1 };

    var ctrls = controlsRow(root);
    var sSlider = slider(ctrls, {
      label: '探索噪声 $\\sigma$',
      min: 0.1, max: 1, step: 0.05, value: state.sigma,
      format: function (v) { return fmt(v, 2); },
      onInput: function (v) { state.sigma = v; render(); }
    });
    var jSlider = slider(ctrls, {
      label: '均值的斜率：$J$ 整体乘以',
      min: 0, max: 2, step: 0.05, value: state.scale,
      format: function (v) { return '×' + fmt(v, 2); },
      onInput: function (v) { state.scale = v; render(); }
    });
    var nSlider = slider(ctrls, {
      label: '样本数 $n$',
      min: 1, max: GAUSS_N, step: 1, value: state.n,
      format: function (v) { return String(v); },
      onInput: function (v) { state.n = v; render(); }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '回到笔记的例子', function () {
      state.sigma = GAUSS_SIGMA; state.scale = 1; state.n = 1;
      sSlider.set(GAUSS_SIGMA, true);
      jSlider.set(1, true);
      nSlider.set(1, true);
      render();
    });
    button(btns, '抽满 ' + GAUSS_N + ' 个', function () {
      state.n = GAUSS_N;
      nSlider.set(GAUSS_N, true);
      render();
    });

    var setLegend = legend(root, [
      { key: 'accent', text: '均值 $\\mu$ 与 $\\sigma$、$2\\sigma$ 圈' },
      { key: 'warn', text: '第一个样本 $a - \\mu = \\sigma(1, -0.5)$' },
      { key: 'good', text: '前 $n$ 个样本的平均' },
      { key: 'bad', text: '期望 $\\lVert J\\rVert_F^2/\\sigma^2$' }
    ]);

    var grid = stageGrid(root);
    var planeStage = stage(grid, 250);
    var runStage = stage(grid, 250);

    var stats = statsRow(root);
    var sFro = stats.add('$\\lVert J\\rVert_F^2$');
    var sExp = stats.add('期望 $\\lVert J\\rVert_F^2/\\sigma^2$');
    var sFirst = stats.add('第一个样本的 $\\lVert\\nabla_s\\log\\pi\\rVert^2$');
    var sMean = stats.add('前 $n$ 个样本的平均');
    var verdict = verdictBox(root);

    note(root, [
      '**推导**（论文没写，是我们按式 7 推的）：$\\log\\pi(a \\mid s) = -\\lVert a - \\mu(s)\\rVert^2/(2\\sigma^2) + C$，对 $s$ 求导得 $J^\\top(a - \\mu)/\\sigma^2$；$a - \\mu$ 的协方差是 $\\sigma^2 I$，所以平方范数的期望是 $\\mathrm{tr}(JJ^\\top)/\\sigma^2 = \\lVert J\\rVert_F^2/\\sigma^2$。也就是说，GP 罚的是**均值对状态的斜率**，按 $1/\\sigma^2$ 加权。',
      '**默认例子**：$J = [[0.8, 0.2], [-0.4, 0.6]]$、$\\sigma = 0.4$：$\\lVert J\\rVert_F^2 = 1.20$，期望 7.5；第一个样本 $a - \\mu = (0.4, -0.2)$，梯度 $(2.5, -0.25)$，平方和 6.31；' +
        GAUSS_N + ' 个样本平均 ' + fmt(GAUSS.mean, 2) + '。$\\sigma$ 减半到 0.2，同一个 $J$ 的期望变成 30。',
      '**和代码对得上**：官方 rsl_rl 与 MimicKit 都是 `torch.autograd.grad(log_prob, obs, create_graph=True)` 再逐样本平方求和取平均，正是这里的「样本平均」。官方代码的标准差是可学习参数（GR1 初值 0.1–0.4）；MimicKit 固定为 0.05（若按归一化后的动作算，$1/\\sigma^2 = 400$，推测）。',
      '**一个推论（推测，论文没讨论）**：按这个式子，罚的值随 $\\sigma$ 增大而变小，所以 GP 对可学习的 $\\sigma$ 也有一点往大推的力。**这是两维玩具**：真实策略是非线性 MLP，$J$ 随状态变化；这里只验证「样本平均 → $\\lVert J\\rVert_F^2/\\sigma^2$」这件事。'
    ]);

    var render = registerRenderer(function () {
      var J = [[GAUSS_J[0][0] * state.scale, GAUSS_J[0][1] * state.scale], [GAUSS_J[1][0] * state.scale, GAUSS_J[1][1] * state.scale]];
      var smp = gaussSamples(J, state.sigma, GAUSS_N, GAUSS_SEED);
      var fro = frob2(J),
        ex = fro / (state.sigma * state.sigma),
        mean = smp.run[state.n - 1];
      sFro.set(fmt(fro, 2), 'accent');
      sExp.set(fmt(ex, 2), 'bad');
      sFirst.set(fmt(smp.vals[0], 2), 'warn');
      sMean.set(fmt(mean, 2), Math.abs(mean - ex) < 0.1 * ex + 1e-9 ? 'good' : 'warn');

      if (state.n === 1) {
        verdict.set('🎯 只有 1 个样本：$\\lVert\\nabla_s\\log\\pi\\rVert^2$ = ' + fmt(smp.vals[0], 2) + '，期望是 ' + fmt(ex, 2) +
          '。单个样本的估计很吵；代码里一个 minibatch 有成千上万个状态—动作对，平均以后才接近 $\\lVert J\\rVert_F^2/\\sigma^2$。', 'frozen');
      } else if (fro < 1e-9) {
        verdict.set('➖ $J = 0$：均值不随状态变化，梯度恒为 0，GP 不罚任何东西 —— 当然这个策略也什么都追不上。', 'frozen');
      } else {
        verdict.set('✅ 前 ' + state.n + ' 个样本平均 ' + fmt(mean, 2) + '，期望 ' + fmt(ex, 2) + '（差 ' + fmt((Math.abs(mean - ex) / ex) * 100, 1) +
          '%）。把 $\\sigma$ 拖小：同一个 $J$ 的期望按 $1/\\sigma^2$ 涨上去 —— 探索噪声越小，同样的斜率罚得越重。', 'learning');
      }

      // ── 左：动作平面 ──
      var g = begin(planeStage);
      var P = g.P;
      setLegend(P);
      var R = 1.2;
      var p = plot(g, { l: 40, r: 14, t: 22, b: 30 }, [-R, R], [-R * 0.85, R * 0.85]);
      axes(g, p, { xTicks: [-1, 0, 1], yTicks: [-1, 0, 1], xLabel: '动作第 1 维' });
      text(g.ctx, '动作平面：a − μ', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var cx = p.sx(0), cy = p.sy(0), ux = (p.sx(1) - p.sx(0));
      [1, 2].forEach(function (k) {
        g.ctx.save();
        g.ctx.strokeStyle = P.accent;
        g.ctx.globalAlpha = k === 1 ? 0.9 : 0.45;
        g.ctx.setLineDash([4, 3]);
        g.ctx.beginPath();
        g.ctx.ellipse(cx, cy, Math.abs(ux) * state.sigma * k, Math.abs(p.sy(state.sigma * k) - cy), 0, 0, Math.PI * 2);
        g.ctx.stroke();
        g.ctx.restore();
      });
      for (var i = 1; i < state.n; i++) {
        var d = smp.devs[i];
        dot(g.ctx, p.sx(clamp(d[0], -R, R)), p.sy(clamp(d[1], -R * 0.85, R * 0.85)), 2.4, P.good);
      }
      var d0 = smp.devs[0];
      line(g.ctx, [[cx, cy], [p.sx(d0[0]), p.sy(d0[1])]], P.warn, 2);
      dot(g.ctx, p.sx(d0[0]), p.sy(d0[1]), 4.5, P.warn, P.surface2);
      dot(g.ctx, cx, cy, 4, P.accent, P.surface2);

      // ── 右：样本平均的收敛 ──
      var g2 = begin(runStage);
      var P2 = g2.P;
      var yMax = Math.max(ex * 2.2, 1);
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [1, GAUSS_N], [0, yMax]);
      axes(g2, p2, { xTicks: [1, 50, 100, 150, 200], yTicks: K.niceTicks(0, yMax, 4), yFmt: function (t) { return fmt(t, t < 10 ? 1 : 0); }, xLabel: '样本数 n' });
      text(g2.ctx, '前 n 个样本的平均 → 期望', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      line(g2.ctx, [[p2.x0, p2.sy(ex)], [p2.x1, p2.sy(ex)]], P2.bad, 1.6, [5, 4]);
      line(g2.ctx, smp.run.slice(0, state.n).map(function (v, k) { return [p2.sx(k + 1), p2.sy(clamp(v, 0, yMax))]; }), P2.good, 2.2);
      line(g2.ctx, smp.run.slice(state.n - 1).map(function (v, k) { return [p2.sx(k + state.n), p2.sy(clamp(v, 0, yMax))]; }), P2.muted, 1, [2, 3]);
      dot(g2.ctx, p2.sx(state.n), p2.sy(clamp(mean, 0, yMax)), 4.5, P2.good, P2.surface2);

      planeStage.canvas.setAttribute('aria-label', '高斯策略的动作平面：均值、σ 圈与抽到的样本');
      runStage.canvas.setAttribute('aria-label', '梯度平方范数的样本平均随样本数收敛到期望');
    });

    render();
  }

  // ─── demo 3: 论文表格浏览器 ────────────────────────────────────────────────
  var TABLE_GROUPS = {
    a: { name: '表 I(a) 平滑办法', rows: TABLE1A, cols: [0, 1, 2, 3, 4, 5], ref: 0 },
    b: { name: '表 I(b) $\\lambda_{gp}$', rows: TABLE1B.map(function (r) { return ['$\\lambda_{gp}$ = ' + r[0], r[1], r[2]]; }), cols: [0, 1, 2, 3, 4, 5], ref: 2 },
    c: { name: '表 I(c) GP 加在哪', rows: TABLE1C, cols: [0, 1, 2, 3, 4, 5], ref: 0 },
    s2s: { name: '表 II MuJoCo', rows: TABLE2, cols: [0, 1, 2, 3, 4, 5], ref: null },
    real: {
      name: '表 III 真机',
      rows: (function () {
        var out = [];
        TABLE3.forEach(function (r) {
          [1, 2, 3].forEach(function (k) {
            out.push([r[0].replace('Humanoid', 'H.').replace('Fourier ', '').replace('Unitree ', '') + ' · ' + TERRAINS[k - 1], r[k][0], r[k][1]]);
          });
        });
        return out;
      })(),
      cols: [0, 1, 2],
      ref: null
    }
  };
  var TABLE_VERDICT = {
    a: '论文（第 VI-B 节）：LCP 没有被这些平滑指标直接奖励过，平滑程度却和平滑奖励相当（动作抖动 3.21 对 5.74），任务回报相近（26.03 对 26.56）；低通回报偏低（24.98），论文推测是滤波的阻尼压抑了探索；不平滑回报最高（28.87）但抖得不能上真机（42.19）。',
    b: '论文：小系数（如 0.001）仍可能出现上真机危险的抖动；大系数（如 0.01）动作过于平滑迟缓，任务回报大幅下降（16.11），图 6 里也学得更慢；0.002 在平滑与任务之间平衡得最好。和别的平滑办法一样，系数需要调。',
    c: '论文：策略输入既有当前观测、也有历史（ROA），GP 罚整段输入最好；只罚当前观测，历史一变动作照样会跳 —— 动作抖动 7.16 对 3.21。',
    s2s: '论文：上真机前先在 MuJoCo 里测。全尺寸的 GR1、H1 回报比 Isaac Gym 里略降，说明大机器人的域差距更大；整体表现给了上真机的信心。（论文没给每台机器人在 Isaac Gym 里的回报）',
    real: '论文：同样的奖励、$\\lambda_{gp}$ = 0.002，每台 3 个模型各跑 10 s。平地、软地、粗糙地面上三项指标基本不变，动作抖动最多涨 8%（H1：1.11 → 1.20）。真机只报了三项。'
  };

  function buildTableDemo(host) {
    var root = card(host, {
      title: '论文表格浏览器：六项指标、四种比较',
      sub: '选一张表、一项指标。柱高是均值，细线是 ±1 个标准差；右图把表 I、表 II 的每一行放到「动作抖动（对数轴）× 任务回报」平面上。数字全部照抄论文。'
    });

    var state = { group: 'a', metric: 0 };
    var ctrls = controlsRow(root);
    var groupPick = buttonGroup(ctrls, {
      label: '哪张表',
      items: [
        { label: 'I(a) 平滑办法', value: 'a' },
        { label: 'I(b) $\\lambda_{gp}$', value: 'b' },
        { label: 'I(c) GP 加在哪', value: 'c' },
        { label: 'II MuJoCo', value: 's2s' },
        { label: 'III 真机', value: 'real' }
      ],
      value: state.group,
      onPick: function (v) {
        state.group = v;
        if (TABLE_GROUPS[v].cols.indexOf(state.metric) < 0) {
          state.metric = 0;
          metricPick.pick(0, true);
        }
        render();
      }
    });
    var metricPick = buttonGroup(ctrls, {
      label: '哪项指标',
      items: METRICS.map(function (m, k) { return { label: m[0], value: k }; }),
      value: state.metric,
      onPick: function (v) {
        if (TABLE_GROUPS[state.group].cols.indexOf(v) < 0) {
          metricPick.pick(state.metric, true);
          return;
        }
        state.metric = v;
        render();
      }
    });
    void groupPick;

    var setLegend = legend(root, [
      { key: 'accent', text: '当前这张表的行' },
      { key: 'muted', text: '表 I、表 II 的其他行' },
      { key: 'good', text: 'LCP（$\\lambda_{gp}$ = 0.002，整段输入）' }
    ]);

    var grid = stageGrid(root);
    var barStage = stage(grid, 260);
    var scatStage = stage(grid, 260);
    var tb = table(root);
    var verdict = verdictBox(root);

    note(root, [
      '**测法**：表 I 每种设置 3 个随机种子、在 1000 个环境里各跑 500 步（10 s）；表 II 每个 3 次 × 500 步；表 III 每台 3 个模型、各跑 10 s。动作变化率是动作对时间的一阶导，「抖动」是三阶导（论文引 Flash & Hogan 1985 的最小加加速度模型）；任务回报只算线速度和角速度两项跟踪奖励。',
      '**表 I 没写是哪台机器人**，表 II、表 III 才分机器人；所以表 I 的回报不能和表 II 直接相减。表 III 的真机抖动（1.1–1.7）比表 I（3.21）低，可能是机器人、命令、测法不同（推测），也不能直接比。',
      '**λ = 0 那一行和「不平滑」、λ = 0.002 那一行和「LCP」、整段输入那一行和「LCP」**在论文里是同一组数，所以右图只画了不重复的行。'
    ]);

    function rowsOf(gk) {
      return TABLE_GROUPS[gk].rows;
    }

    var render = registerRenderer(function () {
      var G = TABLE_GROUPS[state.group];
      var mi = state.metric;
      var m = METRICS[mi];

      // 表格
      tb.clear();
      tb.row(['设置'].concat(G.cols.map(function (c) { return METRICS[c][0] + (METRICS[c][1] ? '（' + METRICS[c][1] + '）' : '') + (METRICS[c][2] ? ' ↓' : ' ↑'); })), true);
      G.rows.forEach(function (r) {
        tb.row([r[0]].concat(G.cols.map(function (c, k) { return fmt(r[1][k], r[1][k] < 0.1 ? 3 : 2) + ' ± ' + fmt(r[2][k], r[2][k] < 0.01 ? 3 : 2); })));
      });
      verdict.set(TABLE_VERDICT[state.group], state.group === 'b' || state.group === 'c' ? 'frozen' : 'learning');

      // ── 左：柱状图 ──
      var g = begin(barStage);
      var P = g.P;
      setLegend(P);
      var k = G.cols.indexOf(mi);
      var vals = G.rows.map(function (r) { return r[1][k]; }),
        errs = G.rows.map(function (r) { return r[2][k]; });
      var top = Math.max.apply(null, vals.map(function (v, i) { return v + errs[i]; })) * 1.15;
      var p = plot(g, { l: 48, r: 12, t: 24, b: 46 }, [0, G.rows.length], [0, top]);
      axes(g, p, { yTicks: K.niceTicks(0, top, 4), yFmt: function (t) { return fmt(t, t < 1 ? 2 : t < 10 ? 1 : 0); } });
      text(g.ctx, m[0] + (m[1] ? '（' + m[1] + '）' : '') + (m[2] ? '，越小越平滑' : '，越大越好'), p.x0, p.y1 - 10, P.muted, 'left', '11px sans-serif');
      var slot = (p.x1 - p.x0) / G.rows.length;
      G.rows.forEach(function (r, i) {
        var x = p.x0 + slot * (i + 0.5),
          bw = Math.min(46, slot * 0.55);
        var isLcp = G.ref != null && i === G.ref;
        g.ctx.fillStyle = isLcp ? P.good : P.accent;
        g.ctx.globalAlpha = 0.85;
        g.ctx.fillRect(x - bw / 2, p.sy(vals[i]), bw, p.y0 - p.sy(vals[i]));
        g.ctx.globalAlpha = 1;
        line(g.ctx, [[x, p.sy(Math.max(0, vals[i] - errs[i]))], [x, p.sy(vals[i] + errs[i])]], P.text, 1.2);
        barLabel(g, p, x, p.sy(vals[i] + errs[i]), fmt(vals[i], vals[i] < 0.1 ? 3 : 2), isLcp ? P.good : P.text);
        var lab = state.group === 'b' ? 'λ = ' + TABLE1B[i][0] : K.richToPlain(r[0]);
        var parts = lab.split(' · ');
        text(g.ctx, parts[0], x, p.y0 + 14, P.muted, 'center', '10px sans-serif');
        if (parts[1]) text(g.ctx, parts[1], x, p.y0 + 27, P.muted, 'center', '10px sans-serif');
      });

      // ── 右：抖动（对数）× 回报 ──
      var g2 = begin(scatStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 24, b: 34 }, [Math.log10(0.1), Math.log10(80)], [14, 31]);
      axes(g2, p2, {
        xTicks: [-1, 0, 1].map(function (e) { return e; }),
        xFmt: function (t) { return String(Math.round(Math.pow(10, t) * 10) / 10); },
        yTicks: [15, 20, 25, 30],
        xLabel: '动作抖动（对数轴）'
      });
      text(g2.ctx, '任务回报 ↑ vs 动作抖动 ↓', p2.x0, p2.y1 - 10, P2.muted, 'left', '11px sans-serif');
      var pts = [];
      TABLE1A.forEach(function (r) { pts.push({ name: r[0], v: r[1], g: 'a' }); });
      TABLE1B.forEach(function (r) { if (r[0] !== 0 && r[0] !== 0.002) pts.push({ name: 'λ ' + r[0], v: r[1], g: 'b' }); });
      pts.push({ name: '只罚当前', v: TABLE1C[1][1], g: 'c' });
      TABLE2.forEach(function (r) { pts.push({ name: r[0].replace('Fourier ', '').replace('Unitree ', '').replace('Berkeley Humanoid', 'Berkeley'), v: r[1], g: 's2s' }); });
      var inGroup = function (pt) {
        if (state.group === 'a') return pt.g === 'a';
        if (state.group === 'b') return pt.g === 'b' || pt.name === '不平滑' || pt.name === 'LCP（本文）';
        if (state.group === 'c') return pt.g === 'c' || pt.name === 'LCP（本文）';
        return pt.g === state.group;
      };
      /* 标签依次试四个位置（右上、右下、左上、左下），和已放好的标签不重叠就用 */
      var placed = pts.map(function (pt) {
        return { x: p2.sx(Math.log10(pt.v[0])) - 5, y: p2.sy(pt.v[5]) - 5, w: 10, h: 10 };
      });
      g2.ctx.font = '10px sans-serif';
      pts.forEach(function (pt) {
        var x = p2.sx(Math.log10(pt.v[0])), y = p2.sy(pt.v[5]);
        var hot = inGroup(pt);
        var isLcp = pt.name === 'LCP（本文）';
        dot(g2.ctx, x, y, hot ? 5 : 3.5, isLcp ? P2.good : hot ? P2.accent : P2.muted, hot ? P2.surface2 : null);
        if (!hot) return;
        var w = g2.ctx.measureText(pt.name).width, h = 11;
        var tries = [];
        [-6, 14, -20, 28].forEach(function (dy) {
          /* LCP 先试左边：它和 λ = 0.001 那一点几乎重合，标签各放一边才不会认错 */
          if (isLcp) tries.push([x - 7 - w, y + dy], [x + 7, y + dy]);
          else tries.push([x + 7, y + dy], [x - 7 - w, y + dy]);
        });
        var pick = tries[0], best = Infinity;
        for (var q = 0; q < tries.length; q++) {
          var r = { x: tries[q][0], y: tries[q][1] - h + 2, w: w, h: h };
          if (r.x < p2.x0 || r.x + r.w > g2.w - 4 || r.y < p2.y1) continue;
          var hits = placed.filter(function (o) {
            return r.x < o.x + o.w && o.x < r.x + r.w && r.y < o.y + o.h && o.y < r.y + r.h;
          }).length;
          if (hits < best) { best = hits; pick = tries[q]; }
          if (!hits) break;
        }
        placed.push({ x: pick[0], y: pick[1] - h + 2, w: w, h: h });
        text(g2.ctx, pt.name, pick[0], pick[1], isLcp ? P2.good : P2.text, 'left', '10px sans-serif');
      });
      if (state.group === 'real') text(g2.ctx, '表 III 没报任务回报，这张图不画真机', p2.x0 + 8, p2.y0 - 10, P2.warn, 'left', '11px sans-serif');

      barStage.canvas.setAttribute('aria-label', '论文表格里所选指标的柱状图与标准差');
      scatStage.canvas.setAttribute('aria-label', '表 I 与表 II 各行的动作抖动与任务回报散点图');
      void rowsOf;
    });

    render();
  }

  // ─── 讲解动画：十幕 ─────────────────────────────────────────────────────────
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
    C_INK2 = X.ink2;

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
    rectBox(g, x, y, w, o.h || 30, color, C_SURFACE, o.dash);
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

  /* 一格读数：左边标签（可含公式），右边等宽数字 */
  function readoutChip(parent, cx, y, w, label, value, color) {
    var g = group(parent);
    rectBox(g, cx - w / 2, y, w, 32, C_BORDER, C_SURFACE2);
    g.appendChild(svgRich(cx - w / 2 + 10, y + 17, label, { size: 10.5, cls: 'demo-x-mut', w: w * 0.66 }));
    g.appendChild(paint(svgText(cx + w / 2 - 10, y + 21, value, 'demo-x-mono', 11.5, 'end'), color || C_ACCENT));
    return g;
  }

  /* 这十幕在视频里一幕要讲一分钟左右，画面不能停：draw(t, clock) 的 clock 是这一幕的真实时间
     （旁白比分镜长时 t 会停在一段的末尾，clock 照走），所以抖动、走路、滑动这类循环动作都按 clock 画；
     网页播放器只传 t，clock 就退回 t。公式尽量换成会动的图，每幕最多留一条。 */
  function nowOf(t, clock) {
    return clock == null ? t : clock;
  }

  /* ── scene 1: 仿真里的理想电机 ── */
  /* 示意信号：一条慢正弦叠上每 0.1 s 跳一次的 ±0.35–0.65（bang-bang 式的指令）。
     仿真电机原样照做；「真机电机」每步最多转 0.035（力矩有上限），跟不上就有误差、发热（示意，不是论文的模型）；
     低通滤波那一格另用一串每步都来回跳的动作（见 S1_LP）。 */
  var S1_DT = 0.02, S1_N = 3000;
  var S1_SIG = (function () {
    var rng = mulberry32(3), jumps = [];
    for (var k = 0; k < S1_N; k++) jumps.push((rng() < 0.5 ? -1 : 1) * (0.35 + 0.3 * rng()));
    var cmd = [], real = [], err = [], r = 0, e = 0;
    for (var i = 0; i < S1_N; i++) {
      var tt = i * S1_DT;
      var c = 0.25 * Math.sin(2 * Math.PI * 0.35 * tt) + jumps[Math.floor(tt / 0.1)];
      r += clamp(0.3 * (c - r), -0.035, 0.035);
      e = 0.9 * e + 0.1 * Math.abs(c - r);
      cmd.push(c);
      real.push(r);
      err.push(e);
    }
    return { cmd: cmd, real: real, err: err };
  })();
  function s1At(arr, now) {
    return arr[Math.floor(now / S1_DT) % S1_N];
  }
  /* 最近 span 秒的一段，画成 [x0, x1] × (yc ± amp) 的折线 */
  function s1Trace(arr, now, span, x0, x1, yc, amp) {
    var n = Math.round(span / S1_DT), i1 = Math.floor(now / S1_DT), pts = [];
    for (var k = 0; k <= n; k++) {
      var idx = (((i1 - n + k) % S1_N) + S1_N) % S1_N;
      pts.push([x0 + (k / n) * (x1 - x0), yc - arr[idx] * amp]);
    }
    return polyPath(pts.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; }));
  }

  /* 低通滤波那一格：一个慢变化的走势，每个控制步再叠一次方向相反的跳变（bang-bang），
     按上一期 OP3 的 u = 0.8u + 0.2a 逐步滤波（跑两圈取稳态，首尾接得上）。
     画成传送带：动作从左边流进滤波器、从右边流出来，所以两段都往右走；
     左段画的是「马上要进去」的几步，右段是「刚出来」的几步。步速是示意（每秒 10 步），不是真机的 50 Hz。 */
  var S1_LP = (function () {
    var N = 400, rng = mulberry32(5), slow = [], a = [], u = [], v = 0;
    for (var j = 0; j < N; j++) {
      slow.push(0.9 * Math.sin((2 * Math.PI * j) / 40));
      a.push(slow[j] + (j % 2 ? 1 : -1) * (0.25 + 0.2 * rng()));
    }
    for (var pass = 0; pass < 2; pass++) {
      for (j = 0; j < N; j++) {
        v = 0.8 * v + 0.2 * a[j];
        if (pass) u.push(v);
      }
    }
    return { N: N, slow: slow, a: a, u: u, rate: 10, px: 5 };
  })();
  function s1Lp(arr, j) {
    return arr[((j % S1_LP.N) + S1_LP.N) % S1_LP.N];
  }

  function setLink(link, foot, px, py, len, val) {
    var a = (val * 50 * Math.PI) / 180;
    var x2 = px + len * Math.sin(a), y2 = py + len * Math.cos(a);
    link.setAttribute('x2', x2.toFixed(1));
    link.setAttribute('y2', y2.toFixed(1));
    if (foot) {
      foot.setAttribute('cx', x2.toFixed(1));
      foot.setAttribute('cy', y2.toFixed(1));
    }
  }

  function buildSceneProblem() {
    var s = sceneSvg('左边两个关节收到同一串来回跳的指令：仿真里的理想电机原样照做，真机电机力矩有上限，跟不上、发热；表 I 里不平滑的策略回报最高 28.87、动作抖动 42.19，是 LCP 的 13 倍；平滑奖励要拧一堆旋钮，低通滤波让动作慢半拍，两者都不可微');
    s.appendChild(svgText(30, 28, '同一串来回跳的指令：仿真电机照做，真机电机跟不上', 'demo-x-ink2', 13.5));

    var left = group(s);
    rectBox(left, 30, 44, 370, 284, C_BORDER, C_SURFACE2);
    function joint(px, label, sub, color) {
      var g = group(left);
      g.appendChild(svgText(px, 66, label, null, 12, 'middle'));
      g.appendChild(svgText(px, 83, sub, 'demo-x-mut', 10.5, 'middle'));
      var heat = paint(svgEl('circle', { cx: px, cy: 108, r: 20 }), C_BAD);
      heat.style.opacity = 0;
      g.appendChild(heat);
      var ghost = paint(svgEl('line', { x1: px, y1: 108, x2: px, y2: 186, 'stroke-width': 3, 'stroke-dasharray': '4 4', 'stroke-linecap': 'round' }), null, C_MUTED);
      var link = paint(svgEl('line', { x1: px, y1: 108, x2: px, y2: 186, 'stroke-width': 10, 'stroke-linecap': 'round' }), null, color);
      var foot = paint(svgEl('circle', { cx: px, cy: 186, r: 7 }), color);
      g.appendChild(ghost);
      g.appendChild(link);
      g.appendChild(foot);
      g.appendChild(paint(svgEl('circle', { cx: px, cy: 108, r: 8, 'stroke-width': 2 }), C_SURFACE2, C_INK2));
      return { g: g, ghost: ghost, link: link, foot: foot, heat: heat, px: px };
    }
    var jSim = joint(122, '仿真：理想电机', '指令怎么跳都照做', C_GOOD);
    var jReal = joint(310, '真机：力矩有上限', '跟不上，发热、发抖', C_ACCENT);
    var lag = paint(svgText(310, 214, '跟不上！', 'demo-x-bad', 12, 'middle'), C_BAD);
    left.appendChild(lag);
    left.appendChild(svgText(214, 140, '虚线 = 指令', 'demo-x-mut', 10, 'middle'));

    var trBox = group(left);
    trBox.appendChild(paint(svgEl('line', { x1: 46, y1: 276, x2: 384, y2: 276, 'stroke-width': 1 }), null, C_BORDER));
    var trCmd = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 1.4 }), null, C_BAD);
    var trReal = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 2.4 }), null, C_ACCENT);
    trBox.appendChild(trCmd);
    trBox.appendChild(trReal);
    trBox.appendChild(svgText(46, 236, '最近 3 秒：红 = 指令，蓝 = 真机关节', 'demo-x-mut', 10));

    var score = group(s);
    rectBox(score, 420, 44, 350, 64, C_GOOD);
    score.appendChild(svgRich(434, 68, '表 I：不平滑的策略，仿真里回报**最高 28.87**', { size: 11.5, w: 330 }));
    var score2 = svgRich(434, 94, '可动作抖动 **42.19**，是 LCP（3.21）的 **13 倍**', { size: 11.5, w: 330, cls: 'demo-x-bad' });
    score.appendChild(score2);

    var rew = group(s);
    rectBox(rew, 420, 118, 350, 96, C_WARN, C_SURFACE, '4 3');
    rew.appendChild(svgText(434, 138, '补救一：平滑奖励 —— 一堆旋钮要拧', 'demo-x-warn', 12));
    var knobs = ['动作变化', '关节速度', '关节加速度', '能耗'].map(function (name, k) {
      var cx = 470 + k * 82, cy = 170;
      rew.appendChild(paint(svgEl('circle', { cx: cx, cy: cy, r: 15, 'stroke-width': 2 }), C_SURFACE2, C_WARN));
      var hand = paint(svgEl('line', { x1: cx, y1: cy, x2: cx, y2: cy - 12, 'stroke-width': 3, 'stroke-linecap': 'round' }), null, C_WARN);
      rew.appendChild(hand);
      rew.appendChild(svgText(cx, 204, name, 'demo-x-ink2', 10, 'middle'));
      return { hand: hand, cx: cx, cy: cy, k: k };
    });

    var lpf = group(s);
    rectBox(lpf, 420, 224, 350, 104, C_WARN, C_SURFACE, '4 3');
    lpf.appendChild(svgText(434, 244, '补救二：输出端低通滤波 —— 慢半拍', 'demo-x-warn', 12));
    /* 传送带：左段进、右段出，两段都往右流 */
    var LP_IX0 = 436, LP_IX1 = 556, LP_OX0 = 636, LP_OX1 = 758, LP_Y = 284, LP_AMP = 11;
    lpf.appendChild(svgText(LP_IX0, 262, '进：每一步都来回跳', 'demo-x-bad', 9.5));
    var lpMk = K.arrowMarker(s, 'lcp-x-arrow-s1lp', C_WARN);
    arrowPath(lpf, [[LP_IX1 + 1, LP_Y], [564, LP_Y]], C_WARN, lpMk, null, 1.6);
    arrowPath(lpf, [[624, LP_Y], [LP_OX0 - 2, LP_Y]], C_WARN, lpMk, null, 1.6);
    var lpBox = rectBox(lpf, 566, 266, 58, 36, C_WARN, C_SURFACE2);
    lpf.appendChild(svgText(595, 288, '滤波', 'demo-x-warn', 11.5, 'middle'));
    var lpSlow = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 1.3, 'stroke-dasharray': '4 3' }), null, C_MUTED);
    var lpIn = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }), null, C_BAD);
    var lpOut = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }), null, C_GOOD);
    lpf.appendChild(lpSlow);
    lpf.appendChild(lpIn);
    lpf.appendChild(lpOut);
    lpf.appendChild(svgText(LP_OX1, 314, '出：平了，但比虚线（原来的走势）慢几步', 'demo-x-good', 9.5, 'end'));
    lpf.appendChild(svgText(434, 314, '上一期 OP3 就这么做', 'demo-x-mut', 9.5));
    function lpPaths(now) {
      var f = now * S1_LP.rate, j0 = Math.floor(f), P = S1_LP.px, n = Math.ceil((LP_IX1 - LP_IX0) / P) + 1;
      function y(v) { return (LP_Y - v * LP_AMP).toFixed(1); }
      function cx(x, a, b) { return clamp(x, a, b).toFixed(1); }
      /* 进：第 j 步离滤波器还有 (j − f) 格，每一步画成一小段平台（零阶保持） */
      var pin = [];
      for (var j = j0; j <= j0 + n; j++) {
        var xa = LP_IX1 - (j - f) * P, v = s1Lp(S1_LP.a, j);
        pin.push([cx(xa, LP_IX0, LP_IX1), y(v)], [cx(xa - P, LP_IX0, LP_IX1), y(v)]);
      }
      /* 出：第 j 步已经出来 (f − j) 格 */
      var pout = [], pslow = [];
      for (j = j0; j >= j0 - n; j--) {
        var xo = LP_OX0 + (f - j) * P;
        if (xo > LP_OX1) break;
        pout.push([xo.toFixed(1), y(s1Lp(S1_LP.u, j))]);
        pslow.push([xo.toFixed(1), y(s1Lp(S1_LP.slow, j))]);
      }
      lpIn.setAttribute('d', polyPath(pin));
      lpOut.setAttribute('d', polyPath(pout));
      lpSlow.setAttribute('d', polyPath(pslow));
      return f - j0;
    }

    function stamp(x, y) {
      var g = group(s);
      var r = paint(svgEl('rect', { x: x - 36, y: y - 12, width: 72, height: 23, rx: 4, 'stroke-width': 2.2 }), C_SURFACE, C_BAD);
      g.appendChild(r);
      g.appendChild(paint(svgText(x, y + 4.5, '不可微', 'demo-x-bad', 12.5, 'middle'), C_BAD));
      g.setAttribute('transform', 'rotate(-8 ' + x + ' ' + y + ')');
      return g;
    }
    var st1 = stamp(722, 138), st2 = stamp(722, 244);
    var fin = group(s);
    chip(fin, 30, 340, 740, '两种补救都藏在环境或信号链里，只能靠采样去估；LCP 想要一个**可微**、几行代码就能接进去的平滑目标', C_ACCENT, { h: 36, size: 11.8 });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.8));
      var c = s1At(S1_SIG.cmd, now), r = s1At(S1_SIG.real, now), e = s1At(S1_SIG.err, now);
      [jSim, jReal].forEach(function (j) { setLink(j.ghost, null, j.px, 108, 78, c); });
      setLink(jSim.link, jSim.foot, jSim.px, 108, 78, c);
      setLink(jReal.link, jReal.foot, jReal.px, 108, 78, r);
      jReal.heat.style.opacity = clamp((e - 0.15) * 1.6, 0, 0.7).toFixed(2);
      setOpacity(lag, e > 0.3 && Math.floor(now * 4) % 2 === 0 ? 1 : 0.15);
      trCmd.setAttribute('d', s1Trace(S1_SIG.cmd, now, 3, 46, 384, 276, 26));
      trReal.setAttribute('d', s1Trace(S1_SIG.real, now, 3, 46, 384, 276, 26));
      setOpacity(score, seg(t, 1.2, 1.8));
      setOpacity(score2, seg(t, 3.6, 4.2));
      setOpacity(rew, seg(t, 7.0, 7.6));
      knobs.forEach(function (kn) {
        var a = Math.sin(now * (1.3 + 0.37 * kn.k) + kn.k * 1.7) * 1.2;
        kn.hand.setAttribute('x2', (kn.cx + 12 * Math.sin(a)).toFixed(1));
        kn.hand.setAttribute('y2', (kn.cy - 12 * Math.cos(a)).toFixed(1));
      });
      setOpacity(lpf, seg(t, 10.4, 11.0));
      var lpFrac = lpPaths(now);
      lpBox.style.strokeWidth = lpFrac < 0.3 ? 2.6 : 1.3;
      setOpacity(st1, seg(t, 13.4, 13.8));
      setOpacity(st2, seg(t, 13.7, 14.1));
      setOpacity(fin, seg(t, 14.4, 15.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: Lipschitz：给斜率设上限 ── */
  /* 两条玩具策略（同 lcp-sensitivity）：平缓的 K = 1.5、满是褶皱的 K = 5。输入在 0 附近晃 ±0.13（画大了，看得清），
     输出跟着晃，晃多少由那一段的斜率决定。 */
  var S2_KA = 1.5, S2_IN = 0.13;
  var S2_PI_A = policyOf(S2_KA);
  function s2Jitter(now) {
    return S2_IN * (0.6 * Math.sin(17 * now) + 0.4 * Math.sin(29 * now + 1));
  }

  function buildSceneLipschitz() {
    var s = sceneSvg('两条玩具策略：平缓的最大斜率 1.5，满是褶皱的最大斜率 5；同样晃动的输入，平缓的输出只晃一点，褶皱的晃得很凶；以曲线上任一点为顶点画斜率正负 K 的圆锥，曲线都装在圆锥里；斜率处处不超过 K，函数就是 Lipschitz 连续的；图 3：加了平滑奖励的策略梯度明显更小');
    s.appendChild(svgText(30, 28, 'Lipschitz 常数 K：输入晃一点，输出最多晃 K 倍', 'demo-x-ink2', 13.5));
    var clip = svgEl('clipPath', { id: 'lcp-x-clip-s2' });
    clip.appendChild(svgEl('rect', { x: 440, y: 76, width: 310, height: 156 }));
    var defs = svgEl('defs', {});
    defs.appendChild(clip);
    s.appendChild(defs);

    function panel(x0, title, pi, color) {
      var g = group(s);
      rectBox(g, x0, 44, 360, 210, C_BORDER, C_SURFACE2);
      g.appendChild(svgText(x0 + 12, 64, title, null, 12));
      var X0 = x0 + 30, X1 = x0 + 340, Y0 = 232, Y1 = 76;
      function px(o) { return X0 + ((o + 1.2) / 2.4) * (X1 - X0); }
      function py(a) { return Y0 - ((clamp(a, -2.2, 2.2) + 2.2) / 4.4) * (Y0 - Y1); }
      g.appendChild(paint(svgEl('line', { x1: X0, y1: Y0, x2: X1, y2: Y0, 'stroke-width': 1 }), null, C_BORDER));
      g.appendChild(paint(svgEl('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, 'stroke-width': 1 }), null, C_BORDER));
      var lo = S2_IN, aLo = pi(-lo), aHi = pi(lo);
      g.appendChild(paint(svgEl('rect', { x: px(-lo), y: Y0 - 4, width: px(lo) - px(-lo), height: 8, 'fill-opacity': 0.35 }), C_MUTED));
      g.appendChild(paint(svgEl('rect', { x: X0 - 4, y: py(Math.max(aLo, aHi)), width: 8, height: Math.abs(py(aLo) - py(aHi)), 'fill-opacity': 0.45 }), color));
      var pts = [];
      for (var i = 0; i <= 200; i++) {
        var o = -1.2 + (2.4 * i) / 200;
        pts.push([px(o), py(pi(o))]);
      }
      pathLine(g, pts, color, 2.4);
      var vLine = paint(svgEl('line', { 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }), null, C_MUTED);
      var hLine = paint(svgEl('line', { 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }), null, C_MUTED);
      var inDot = paint(svgEl('circle', { r: 5 }), C_INK2);
      var outDot = paint(svgEl('circle', { r: 6 }), color);
      [vLine, hLine, inDot, outDot].forEach(function (n) { g.appendChild(n); });
      var ratio = (Math.abs(aHi - aLo) / 2) / S2_IN;
      g.appendChild(svgText(x0 + 348, 64, '输出晃动 ≈ 输入的 ' + fmt(ratio, 1) + ' 倍', 'demo-x-mono', 11, 'end'));
      return { g: g, px: px, py: py, pi: pi, vLine: vLine, hLine: hLine, inDot: inDot, outDot: outDot, X0: X0, Y0: Y0 };
    }
    var pA = panel(30, '平缓的策略：最大斜率 1.5', S2_PI_A, C_GOOD);
    var pB = panel(410, '满是褶皱的策略：最大斜率 5', TOY.pi, C_BAD);

    var cone = paint(svgEl('path', { d: '', 'fill-opacity': 0.14, 'stroke-width': 1.3, 'stroke-dasharray': '4 3', 'clip-path': 'url(#lcp-x-clip-s2)' }), C_ACCENT, C_ACCENT);
    var vtx = paint(svgEl('circle', { r: 5, 'stroke-width': 1.6 }), C_ACCENT, C_SURFACE2);
    s.appendChild(cone);
    s.appendChild(vtx);
    var coneTag = svgText(752, 92, '斜率 ±5 的圆锥：曲线永远在里面', 'demo-x-acc', 10.5, 'end');
    s.appendChild(coneTag);

    var badge = group(s);
    chip(badge, 30, 262, 740, '真机量级的噪声 0.045：K = 5 的策略动作最多晃 **0.225**，这条轨迹上实测 **0.142**（玩具，不能和论文比）', C_BORDER, { h: 28, size: 11.2 });

    var ticks = group(s);
    var dB = slopeOf(TOY_K);
    var tickEls = [];
    for (var k = 0; k < 25; k++) {
      var o = -1.1 + (2.2 * k) / 24, sl = dB(o);
      var x = pB.px(o), y = pB.py(TOY.pi(o));
      var ang = Math.atan2(-(pB.py(TOY.pi(o) + sl * 0.05) - y), pB.px(o + 0.05) - x);
      var dx = 13 * Math.cos(ang), dy = -13 * Math.sin(ang);
      var col = Math.abs(sl) > 4 ? C_BAD : Math.abs(sl) > 2.5 ? C_WARN : C_GOOD;
      var tk = paint(svgEl('line', { x1: x - dx, y1: y - dy, x2: x + dx, y2: y + dy, 'stroke-width': 3, 'stroke-linecap': 'round' }), null, col);
      ticks.appendChild(tk);
      tickEls.push(tk);
    }
    var tickTag = svgText(752, 248, '每一处的斜率都 ≤ 5 ⇒ Lipschitz 连续', 'demo-x-ink2', 10.5, 'end');
    ticks.appendChild(tickTag);

    var fig3 = group(s);
    rectBox(fig3, 30, 298, 740, 80, C_BORDER, C_SURFACE2);
    fig3.appendChild(svgText(42, 316, '图 3（示意）：策略的梯度大小，随训练', 'demo-x-mut', 10.5));
    var f3rng = mulberry32(17), hiPts = [], loPts = [];
    for (var j = 0; j <= 80; j++) {
      var fx = 300 + j * 5.5;
      var spike = j > 14 && f3rng() < 0.12 ? 12 * f3rng() : 0;
      hiPts.push([fx, 352 - 9 * (1 - Math.exp(-j / 8)) - 5 * f3rng() - spike]);
      loPts.push([fx, 368 - 3 * (1 - Math.exp(-j / 8)) - 2 * f3rng()]);
    }
    var hiLn = pathLine(fig3, hiPts, C_WARN, 1.6);
    var loLn = pathLine(fig3, loPts, C_BAD, 1.8);
    fig3.appendChild(svgText(42, 344, '黄：不加平滑奖励', 'demo-x-warn', 10.5));
    fig3.appendChild(svgText(42, 366, '红：加了平滑奖励，梯度小得多', 'demo-x-bad', 10.5));
    var fin = group(s);
    chip(fin, 30, 384, 740, '平滑 ≈ 斜率小 ⇒ 那就直接去约束策略的梯度', C_ACCENT, { h: 30, size: 12 });

    function drawPanel(p, now) {
      var o = s2Jitter(now), a = p.pi(o);
      p.inDot.setAttribute('cx', p.px(o).toFixed(1));
      p.inDot.setAttribute('cy', p.Y0);
      p.outDot.setAttribute('cx', p.X0);
      p.outDot.setAttribute('cy', p.py(a).toFixed(1));
      [[p.vLine, p.px(o), p.Y0, p.px(o), p.py(a)], [p.hLine, p.px(o), p.py(a), p.X0, p.py(a)]].forEach(function (L) {
        L[0].setAttribute('x1', L[1].toFixed(1));
        L[0].setAttribute('y1', L[2].toFixed(1));
        L[0].setAttribute('x2', L[3].toFixed(1));
        L[0].setAttribute('y2', L[4].toFixed(1));
      });
    }

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(pA.g, seg(t, 0.2, 0.8));
      setOpacity(pB.g, seg(t, 0.8, 1.4));
      drawPanel(pA, now);
      drawPanel(pB, now);
      var coneOn = seg(t, 3.6, 4.2);
      var ov = 0.85 * Math.sin(0.55 * now), a0 = TOY.pi(ov);
      var cpts = [[-1.2, a0 - 5 * (ov + 1.2)], [ov, a0], [1.2, a0 + 5 * (1.2 - ov)], [1.2, a0 - 5 * (1.2 - ov)], [ov, a0], [-1.2, a0 + 5 * (ov + 1.2)]];
      cone.setAttribute('d', polyPath(cpts.map(function (q) {
        return [pB.px(q[0]).toFixed(1), (232 - ((q[1] + 2.2) / 4.4) * 156).toFixed(1)];
      })) + ' Z');
      vtx.setAttribute('cx', pB.px(ov).toFixed(1));
      vtx.setAttribute('cy', pB.py(a0).toFixed(1));
      setOpacity(cone, coneOn);
      setOpacity(vtx, coneOn);
      setOpacity(coneTag, coneOn);
      setOpacity(badge, seg(t, 7.0, 7.6));
      var tu = seg(t, 10.4, 12.0);
      tickEls.forEach(function (tk, k) { tk.style.opacity = tu > 0 && k / 24 <= tu ? 0.95 : 0; });
      setOpacity(tickTag, seg(t, 11.6, 12.2));
      setOpacity(fig3, seg(t, 13.4, 13.9));
      drawOn(hiLn, ease(seg(t, 13.6, 15.0)));
      drawOn(loLn, ease(seg(t, 13.8, 15.2)));
      setOpacity(fin, seg(t, 15.4, 16.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 从「别太陡」到「陡了就罚」（式 4 → 7） ── */
  function buildSceneDerive() {
    var s = sceneSvg('左边是玩具策略在每个状态上的斜率：先要求每一处都不超过 K，检查不完；改成只看 rollout 走到过的状态、取平均，最大 5、平均 2.75；再把约束换成罚款，罚款随斜率平方增长；单价固定成 0.002；最后回报和惩罚像拔河，停在中间的地方就是训出来的平滑程度');
    s.appendChild(svgText(30, 28, '从「每一处都不许太陡」到「陡了就罚」：四步推到式 7', 'demo-x-ink2', 13.5));
    var dpi = slopeOf(TOY_K);

    var L = group(s);
    rectBox(L, 30, 44, 450, 214, C_BORDER, C_SURFACE2);
    var X0 = 52, X1 = 466, Y0 = 232, Y1 = 92;
    function lx(o) { return X0 + ((o + 1.2) / 2.4) * (X1 - X0); }
    function ly(v) { return Y0 - (v / 6) * (Y0 - Y1); }
    L.appendChild(paint(svgEl('line', { x1: X0, y1: Y0, x2: X1, y2: Y0, 'stroke-width': 1 }), null, C_BORDER));
    L.appendChild(svgText(X0, Y0 + 16, '状态 →（玩具策略，同第 2 幕）', 'demo-x-mut', 10));
    var head1 = svgText(42, 64, '① 规定：每一处的斜率都 ≤ K', null, 12);
    L.appendChild(head1);
    var bars = [];
    for (var i = 0; i < 48; i++) {
      var o = -1.2 + (2.4 * (i + 0.5)) / 48, v = Math.abs(dpi(o));
      var b = vbar(L, lx(o) - 3.5, Y0, 7, v > 4 ? C_BAD : v > 2.5 ? C_WARN : C_GOOD, 0.85);
      setH(b, Y0 - ly(v));
      bars.push({ b: b, o: o });
    }
    L.appendChild(paint(svgEl('line', { x1: X0, y1: ly(5), x2: X1, y2: ly(5), 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }), null, C_BAD));
    L.appendChild(svgText(X1, ly(5) - 5, '上限 K', 'demo-x-bad', 10.5, 'end'));
    var scan = paint(svgEl('rect', { x: X0, y: Y1 - 4, width: 10, height: Y0 - Y1 + 4, 'fill-opacity': 0.25 }), C_ACCENT);
    L.appendChild(scan);
    var scanTag = svgText(256, 84, '状态有无穷多个：检查不完', 'demo-x-acc', 10.5, 'middle');
    L.appendChild(scanTag);

    var step2 = group(L);
    step2.appendChild(svgText(42, 64, '② 只看 rollout 走到过的状态，取平均', 'demo-x-good', 12));
    var dots = [];
    for (var q = 0; q < 60; q++) {
      var od = toyTrajectory(q * 2);
      var d = paint(svgEl('circle', { cx: lx(od).toFixed(1), cy: Y0 + 5, r: 2.4 }), C_GOOD);
      step2.appendChild(d);
      dots.push(d);
    }
    step2.appendChild(paint(svgEl('line', { x1: lx(-0.9), y1: ly(TOY.rmsSlope), x2: lx(0.9), y2: ly(TOY.rmsSlope), 'stroke-width': 2, 'stroke-dasharray': '6 3' }), null, C_WARN));
    step2.appendChild(svgText(lx(0.9) + 4, ly(TOY.rmsSlope) + 4, '平均 ' + fmt(TOY.rmsSlope, 2), 'demo-x-warn', 11));
    step2.appendChild(svgText(lx(0), ly(5) - 6, '最大 5（碰到上限）', 'demo-x-bad', 11, 'middle'));

    var R1 = group(s);
    rectBox(R1, 494, 44, 276, 120, C_BORDER, C_SURFACE2);
    R1.appendChild(svgText(506, 64, '③ 约束换成罚款：越陡罚越多', null, 12));
    var PX0 = 512, PX1 = 640, PY0 = 152, PY1 = 76;
    function ppx(k) { return PX0 + (k / 6) * (PX1 - PX0); }
    function ppy(v) { return PY0 - (v / 36) * (PY0 - PY1); }
    var par = [];
    for (var k = 0; k <= 60; k++) par.push([ppx(k / 10), ppy((k / 10) * (k / 10))]);
    pathLine(R1, par, C_BAD, 2);
    R1.appendChild(svgText(PX1, PY0 + 2, '斜率', 'demo-x-mut', 9.5, 'end'));
    var pDot = paint(svgEl('circle', { r: 5 }), C_BAD);
    R1.appendChild(pDot);
    var bill = vbar(R1, 690, 152, 40, C_BAD);
    R1.appendChild(svgText(710, 76, '罚款', 'demo-x-bad', 10.5, 'middle'));
    R1.appendChild(svgText(660, 128, '∝ 斜率²', 'demo-x-ink2', 10.5, 'end'));

    var R2 = group(s);
    rectBox(R2, 494, 172, 276, 86, C_BORDER, C_SURFACE2);
    R2.appendChild(svgText(506, 192, '④ 罚款单价固定，不再去学', null, 12));
    var tag = group(R2);
    tag.appendChild(paint(svgEl('rect', { x: 560, y: 204, width: 150, height: 40, rx: 8, 'stroke-width': 2 }), C_SURFACE, C_ACCENT));
    tag.appendChild(paint(svgEl('circle', { cx: 574, cy: 224, r: 4 }), C_ACCENT));
    tag.appendChild(svgText(642, 230, '单价 0.002', 'demo-x-acc', 15, 'middle'));

    var tug = group(s);
    rectBox(tug, 30, 268, 740, 144, C_BORDER);
    tug.appendChild(svgMath(400, 290, 'J(\\pi) - \\lambda_{gp}\\,\\mathbb{E}\\lVert\\nabla_s\\log\\pi(a\\mid s)\\rVert^2', { size: 13, anchor: 'middle', w: 520 }));
    tug.appendChild(paint(svgEl('line', { x1: 150, y1: 352, x2: 650, y2: 352, 'stroke-width': 4 }), null, C_INK2));
    var knot = paint(svgEl('rect', { y: 340, width: 12, height: 24, rx: 3 }), C_ACCENT);
    tug.appendChild(knot);
    tug.appendChild(paint(svgEl('line', { x1: 400, y1: 330, x2: 400, y2: 374, 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_MUTED));
    function team(x, dir, color) {
      var g = group(tug);
      for (var m = 0; m < 2; m++) {
        var fx = x + dir * m * 34;
        g.appendChild(paint(svgEl('circle', { cx: fx + dir * 10, cy: 322, r: 7, fill: 'none', 'stroke-width': 2.2 }), null, color));
        g.appendChild(paint(svgEl('line', { x1: fx + dir * 8, y1: 330, x2: fx - dir * 4, y2: 362, 'stroke-width': 2.6 }), null, color));
        g.appendChild(paint(svgEl('line', { x1: fx - dir * 4, y1: 362, x2: fx + dir * 8, y2: 386, 'stroke-width': 2.4 }), null, color));
        g.appendChild(paint(svgEl('line', { x1: fx - dir * 4, y1: 362, x2: fx - dir * 14, y2: 386, 'stroke-width': 2.4 }), null, color));
        g.appendChild(paint(svgEl('line', { x1: fx + dir * 4, y1: 340, x2: fx - dir * 16, y2: 352, 'stroke-width': 2.2 }), null, color));
      }
      return g;
    }
    var tL = team(132, 1, C_GOOD), tR = team(668, -1, C_BAD);
    tug.appendChild(svgText(44, 402, '回报：想反应更灵敏（更陡）', 'demo-x-good', 11));
    tug.appendChild(svgText(756, 402, '梯度惩罚：想更平滑', 'demo-x-bad', 11, 'end'));
    tug.appendChild(svgText(400, 402, '停在哪里，就是训出来的平滑程度', 'demo-x-acc', 11, 'middle'));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(L, seg(t, 0.2, 0.8));
      var s2on = seg(t, 3.6, 4.2);
      setOpacity(head1, 1 - s2on);
      setOpacity(step2, s2on);
      var sx = X0 + ((now * 0.45) % 1) * (X1 - X0 - 10);
      scan.setAttribute('x', sx.toFixed(1));
      setOpacity(scan, 1 - s2on);
      setOpacity(scanTag, seg(t, 1.2, 1.8) * (1 - s2on));
      var nDots = Math.floor(dots.length * ease(seg(t, 3.8, 5.4)));
      dots.forEach(function (d, k) { d.style.opacity = k < nDots ? 0.9 : 0; });
      bars.forEach(function (b) {
        b.b.style.opacity = s2on > 0 && Math.abs(b.o) > 0.9 ? 0.85 - 0.6 * s2on : 0.85;
      });
      setOpacity(R1, seg(t, 7.0, 7.6));
      var k = 3 + 2.2 * Math.sin(1.2 * now);
      pDot.setAttribute('cx', ppx(k).toFixed(1));
      pDot.setAttribute('cy', ppy(k * k).toFixed(1));
      setH(bill, (k * k / 36) * 70);
      setOpacity(R2, seg(t, 10.4, 11.0));
      tag.setAttribute('transform', 'rotate(' + (6 * Math.sin(2.1 * now)).toFixed(2) + ' 574 224)');
      setOpacity(tug, seg(t, 13.4, 14.0));
      var off = 40 * Math.sin(1.4 * now) * (0.55 + 0.45 * Math.cos(0.37 * now));
      knot.setAttribute('x', (394 + off).toFixed(1));
      tL.setAttribute('transform', 'translate(' + off.toFixed(1) + ' 0)');
      tR.setAttribute('transform', 'translate(' + off.toFixed(1) + ' 0)');
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 罚的到底是什么：均值的斜率 ── */
  /* 一维示意：横轴状态 s、纵轴动作 a。策略在每个状态给一个钟形分布（均值线 ± σ 带）；rollout 采到的动作 a* 固定不动。
     状态一晃，钟形沿均值线滑动，a* 在钟形里的高低（它的概率）就跟着变 —— 均值线越陡、钟形越窄，变得越凶。
     推导见笔记第 3 节：对高斯策略，E‖∇ₛ log π‖² = ‖J‖²_F / σ²（整理者的推导，论文没写）。 */
  var S4_SIG = 0.35, S4_ASTAR = 0.3;
  function s4State(now) {
    return 0.32 * Math.sin(1.6 * now) + 0.08 * Math.sin(4.3 * now + 0.5);
  }

  function buildSceneLogPi() {
    var s = sceneSvg('左右两个策略：每个状态给出一个钟形分布，采到的动作固定不动；状态晃动时钟形沿均值线滑动，这个动作的概率跟着变；均值线平缓时几乎不变，陡的时候忽高忽低；钟形变窄一半，变化更凶，罚 4 倍；训练时每个状态只有一个动作，要靠一批平均');
    s.appendChild(svgText(30, 28, '梯度惩罚罚的是：状态一晃，采到的那个动作的概率变得多快', 'demo-x-ink2', 13.5));

    function panel(x0, title, slope, color) {
      var g = group(s);
      rectBox(g, x0, 44, 360, 222, C_BORDER, C_SURFACE2);
      g.appendChild(svgText(x0 + 12, 64, title, null, 12));
      var X0 = x0 + 34, X1 = x0 + 286, Y0 = 250, Y1 = 78;
      function px(v) { return X0 + ((v + 1) / 2) * (X1 - X0); }
      function py(a) { return Y0 - ((clamp(a, -1.5, 1.5) + 1.5) / 3) * (Y0 - Y1); }
      g.appendChild(svgText(X1, Y0 + 13, '状态 →', 'demo-x-mut', 9.5, 'end'));
      g.appendChild(svgText(X0 - 4, Y1 + 4, '动作', 'demo-x-mut', 9.5, 'end'));
      var band = paint(svgEl('path', { d: '', 'fill-opacity': 0.16 }), color);
      g.appendChild(band);
      g.appendChild(paint(svgEl('line', { x1: px(-1), y1: py(-slope), x2: px(1), y2: py(slope), 'stroke-width': 2.2 }), null, color));
      g.appendChild(paint(svgEl('line', { x1: X0, y1: py(S4_ASTAR), x2: X1, y2: py(S4_ASTAR), 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }), null, C_WARN));
      g.appendChild(svgText(X0 + 4, py(S4_ASTAR) - 5, '采到的动作（固定）', 'demo-x-warn', 9.5));
      var bell = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 2 }), null, C_ACCENT);
      var stem = paint(svgEl('line', { 'stroke-width': 1, 'stroke-dasharray': '2 3' }), null, C_MUTED);
      var hit = paint(svgEl('circle', { r: 5.5 }), C_WARN);
      g.appendChild(stem);
      g.appendChild(bell);
      g.appendChild(hit);
      var MX = x0 + 318, MB = 240, MH = 150;
      g.appendChild(paint(svgEl('rect', { x: MX, y: MB - MH, width: 18, height: MH, rx: 3 }), C_SURFACE));
      var meter = vbar(g, MX, MB, 18, C_WARN);
      g.appendChild(svgText(MX + 9, MB + 14, '概率', 'demo-x-mut', 9.5, 'middle'));
      return { g: g, px: px, py: py, slope: slope, band: band, bell: bell, stem: stem, hit: hit, meter: meter, MH: MH, sig: S4_SIG, color: color };
    }
    var pA = panel(30, '均值线平缓：概率几乎不动', 0.3, C_GOOD);
    var pB = panel(410, '均值线陡：概率忽高忽低', 1.3, C_BAD);
    var narrow = svgText(694, 64, 'σ 减半 → 罚 4 倍', 'demo-x-bad', 11, 'end');
    pB.g.appendChild(narrow);

    var strip = group(s);
    rectBox(strip, 30, 274, 740, 62, C_BORDER);
    strip.appendChild(svgText(44, 296, '训练时每个状态只有 rollout 里那一个动作：一个样本的估计很吵', 'demo-x-ink2', 11.5));
    strip.appendChild(svgText(44, 320, '两维算例：单个样本 6.31，一批 200 个平均 7.53（期望 7.5）', 'demo-x-mut', 11));
    var RX0 = 560, RX1 = 756, RY0 = 330, RY1 = 282, RMAX = 15;
    function rx(n) { return RX0 + ((n - 1) / (GAUSS_N - 1)) * (RX1 - RX0); }
    function ry(v) { return RY0 - (clamp(v, 0, RMAX) / RMAX) * (RY0 - RY1); }
    strip.appendChild(paint(svgEl('line', { x1: RX0, y1: ry(GAUSS.expect), x2: RX1, y2: ry(GAUSS.expect), 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }), null, C_BAD));
    var runLn = pathLine(strip, GAUSS.s.run.map(function (v, k) { return [rx(k + 1), ry(v)]; }), C_GOOD, 1.8);

    var fin = group(s);
    chip(fin, 30, 346, 740, '罚的其实是**均值随状态变得多快**（斜率）；探索噪声越小，同样的斜率罚得越重', C_ACCENT, { h: 36, size: 12 });
    var tail = group(s);
    tail.appendChild(svgText(400, 404, '示意图；这一幕的结论是我们按式 7 推的，论文没写', 'demo-x-mut', 10.5, 'middle'));

    function drawPanel(p, now) {
      var sv = s4State(now), mu = p.slope * sv, sig = p.sig;
      var bp = [], top = [], bot = [];
      for (var k = 0; k <= 40; k++) {
        var v = -1 + k / 20;
        top.push([p.px(v), p.py(p.slope * v + sig)]);
        bot.unshift([p.px(v), p.py(p.slope * v - sig)]);
      }
      p.band.setAttribute('d', polyPath(top.concat(bot).map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })) + ' Z');
      for (var j = 0; j <= 50; j++) {
        var a = mu - 3 * sig + (6 * sig * j) / 50;
        var w = Math.exp(-((a - mu) * (a - mu)) / (2 * sig * sig));
        bp.push([p.px(sv) + 52 * w, p.py(a)]);
      }
      p.bell.setAttribute('d', polyPath(bp.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })));
      var like = Math.exp(-((S4_ASTAR - mu) * (S4_ASTAR - mu)) / (2 * sig * sig));
      p.stem.setAttribute('x1', p.px(sv).toFixed(1));
      p.stem.setAttribute('x2', p.px(sv).toFixed(1));
      p.stem.setAttribute('y1', p.py(mu - 3 * sig).toFixed(1));
      p.stem.setAttribute('y2', p.py(mu + 3 * sig).toFixed(1));
      p.hit.setAttribute('cx', (p.px(sv) + 52 * like).toFixed(1));
      p.hit.setAttribute('cy', p.py(S4_ASTAR).toFixed(1));
      setH(p.meter, like * p.MH);
    }

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(pA.g, seg(t, 0.2, 0.8));
      setOpacity(pB.g, seg(t, 0.8, 1.4));
      pB.sig = S4_SIG * (1 - 0.5 * ease(seg(t, 7.0, 8.0)));
      setOpacity(narrow, seg(t, 7.4, 8.0));
      drawPanel(pA, now);
      drawPanel(pB, now);
      setOpacity(strip, seg(t, 10.4, 11.0));
      drawOn(runLn, ease(seg(t, 10.8, 12.6)));
      setOpacity(fin, seg(t, 13.4, 14.0));
      setOpacity(tail, seg(t, 14.4, 15.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: 几行代码接进 PPO ── */
  function buildSceneCode() {
    var s = sceneSvg('一批观测进策略网络得到 log π；再对观测求一次导，信号流回观测，每个格子的梯度有大有小；平方、求和、取平均成一项梯度惩罚，乘 0.002 叠到 PPO 的损失上，一次反向传播、一次 Adam 更新；MimicKit 的 LCPAgent 只多一行 lcp_weight，它默认的 SGD 不是 LCP 的要求');
    s.appendChild(svgText(30, 28, '几行代码：前向算 log π，再对观测求一次导，叠到损失上', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'lcp-x-arrow-s5', C_MUTED);

    var gridG = group(s);
    gridG.appendChild(svgText(85, 62, '一批观测', 'demo-x-ink2', 11, 'middle'));
    var cells = [], grng = mulberry32(21);
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 5; c++) {
        var cell = paint(svgEl('rect', { x: 44 + c * 17, y: 72 + r * 15, width: 14, height: 12, rx: 2 }), C_MUTED);
        cell.style.opacity = 0.5;
        gridG.appendChild(cell);
        cells.push({ el: cell, g: Math.pow(grng(), 1.6) });
      }
    }
    var net = group(s);
    rectBox(net, 168, 76, 124, 104, C_BORDER, C_SURFACE2);
    net.appendChild(svgText(230, 196, '策略网络', 'demo-x-ink2', 11, 'middle'));
    var neurons = [];
    [[190, 4], [230, 5], [270, 3]].forEach(function (col) {
      for (var n = 0; n < col[1]; n++) {
        var cy = 128 + (n - (col[1] - 1) / 2) * 18;
        var nd = paint(svgEl('circle', { cx: col[0], cy: cy, r: 5 }), C_ACCENT);
        net.appendChild(nd);
        neurons.push(nd);
      }
    });
    arrowPath(net, [[136, 128], [164, 128]], C_MUTED, mk);
    arrowPath(net, [[294, 128], [326, 128]], C_MUTED, mk);
    var lp = group(s);
    rectBox(lp, 328, 110, 78, 36, C_ACCENT);
    lp.appendChild(svgRich(367, 132, '$\\log\\pi$', { size: 13, anchor: 'middle', w: 70 }));
    var fwdPath = [[80, 128], [166, 128], [230, 128], [326, 128], [367, 128]];
    var fwdDot = paint(svgEl('circle', { r: 5 }), C_ACCENT);
    s.appendChild(fwdDot);

    var back = group(s);
    var bPts = [[367, 148], [367, 238], [85, 238], [85, 196]];
    arrowPath(back, bPts, C_WARN, null, '5 4', 1.8);
    back.appendChild(svgRich(226, 256, '对观测再求一次导（`create_graph=True`）', { size: 11, anchor: 'middle', w: 320, cls: 'demo-x-warn' }));
    var backDot = paint(svgEl('circle', { r: 6 }), C_WARN);
    back.appendChild(backDot);

    var sq = group(s);
    /* 从网络下面绕过去，不压在网络上（会和虚线的竖段交叉一次） */
    arrowPath(sq, [[136, 212], [444, 212]], C_WARN, mk, null, 1.6);
    sq.appendChild(svgText(250, 229, '平方 · 求和 · 取平均', 'demo-x-warn', 11, 'middle'));
    var gpBar = vbar(sq, 450, 226, 30, C_WARN);
    sq.appendChild(svgText(465, 242, 'GP', 'demo-x-warn', 12, 'middle'));

    var stack = group(s);
    stack.appendChild(svgText(660, 50, '这一步的总损失', 'demo-x-ink2', 11, 'middle'));
    var blocks = [['PPO 裁剪损失', 70, C_ACCENT], ['价值损失', 40, C_ACCENT], ['− 0.01 × 熵', 22, C_MUTED], ['特权正则', 22, C_MUTED]];
    var yb = 250;
    blocks.forEach(function (b) {
      yb -= b[1] + 3;
      rectBox(stack, 560, yb, 200, b[1], b[2], C_SURFACE2);
      stack.appendChild(svgText(660, yb + b[1] / 2 + 4, b[0], 'demo-x-ink2', 10.5, 'middle'));
    });
    var gpBlock = group(s);
    rectBox(gpBlock, 560, 0, 200, 16, C_WARN, C_SURFACE);
    gpBlock.appendChild(svgText(660, 12, '+ 0.002 × GP（全程常数）', 'demo-x-warn', 10, 'middle'));
    var GP_Y = yb - 19;
    var upd = group(s);
    arrowPath(upd, [[764, 240], [784, 240], [784, 70], [764, 70]], C_GOOD, mk, null, 1.6);
    upd.appendChild(svgText(780, 262, '一次 Adam 更新', 'demo-x-good', 10.5, 'end'));
    arrowPath(stack, [[484, 206], [552, 206]], C_WARN, mk);
    stack.appendChild(svgText(518, 198, '× 0.002', 'demo-x-warn', 10.5, 'middle'));

    var mimic = group(s);
    chip(mimic, 30, 286, 740, 'MimicKit：`LCPAgent` 继承 `PPOAgent`，配置只比 DeepMimic 的 G1 PPO 多一行 `lcp_weight: 0.002`', C_GOOD, { h: 34, size: 11.5, dash: '4 3' });
    var sgd = group(s);
    chip(sgd, 30, 332, 740, 'MimicKit 的 SGD、学习率 1e-4 是它**所有**智能体的默认，不是 LCP 的要求；论文官方代码用 Adam', C_WARN, { h: 34, size: 11.5 });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(gridG, seg(t, 0.2, 0.7));
      setOpacity(net, seg(t, 0.4, 0.9));
      setOpacity(lp, seg(t, 1.0, 1.5));
      var fu = (now * 0.6) % 1, fp = K.pointOn(fwdPath, fu);
      fwdDot.setAttribute('cx', fp[0].toFixed(1));
      fwdDot.setAttribute('cy', fp[1].toFixed(1));
      setOpacity(fwdDot, seg(t, 0.6, 1.0) * (t < 3.6 ? 1 : 0.35));
      neurons.forEach(function (nd, k) { nd.style.opacity = (0.45 + 0.55 * Math.max(0, Math.sin(now * 3 - k * 0.6))).toFixed(2); });
      var bon = seg(t, 3.6, 4.2);
      setOpacity(back, bon);
      var bu = (now * 0.5) % 1, bp = K.pointOn(bPts, bu);
      backDot.setAttribute('cx', bp[0].toFixed(1));
      backDot.setAttribute('cy', bp[1].toFixed(1));
      var lit = seg(t, 4.4, 5.4);
      cells.forEach(function (c) {
        paint(c.el, lit > 0 ? C_WARN : C_MUTED);
        c.el.style.opacity = (lit > 0 ? 0.2 + 0.8 * c.g * lit : 0.5).toFixed(2);
      });
      setOpacity(sq, seg(t, 5.6, 6.2));
      setH(gpBar, 34 + 6 * Math.sin(now * 2));
      setOpacity(stack, seg(t, 7.0, 7.6));
      var drop = ease(seg(t, 7.8, 8.8));
      gpBlock.setAttribute('transform', 'translate(0 ' + (20 + (GP_Y - 20) * drop).toFixed(1) + ')');
      setOpacity(gpBlock, seg(t, 7.6, 8.0));
      setOpacity(upd, seg(t, 9.0, 9.6));
      setOpacity(mimic, seg(t, 10.4, 11.0));
      setOpacity(sgd, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 观测、ROA 与「罚整段输入」 ── */
  var S6_TR = (function () {
    var rng = mulberry32(31), a = [];
    for (var i = 0; i < 600; i++) a.push(gauss(rng));
    return a;
  })();
  function buildSceneObs() {
    var s = sceneSvg('观测由当前本体 71 维、只在仿真里有的特权信息 50 维和最近 10 步的历史 710 维组成，共 831 维；ROA 训练时把特权编码和历史估计互相拉近，部署时只用历史估计；表 I(c)：只罚当前观测动作抖动 7.16，罚整段输入 3.21');
    s.appendChild(svgText(30, 28, '策略看的是一整段：当前 + 特权 + 历史；GP 要罚整段', 'demo-x-ink2', 13.5));

    var cur = group(s);
    rectBox(cur, 30, 44, 240, 96, C_ACCENT);
    cur.appendChild(svgText(42, 64, '当前本体', null, 12));
    cur.appendChild(paint(svgText(258, 64, '71', 'demo-x-mono', 13, 'end'), C_ACCENT));
    var segW = [2, 3, 3, 2, 21, 21, 19], sx = 42, segEls = [];
    segW.forEach(function (w, k) {
      var ww = (w / 71) * 216;
      var r = paint(svgEl('rect', { x: sx, y: 76, width: Math.max(2, ww - 1.5), height: 18, rx: 2 }), k % 2 ? C_ACCENT : C_GOOD);
      cur.appendChild(r);
      segEls.push(r);
      sx += ww;
    });
    cur.appendChild(svgText(42, 112, '相位 · 命令 · 角速度 · 姿态', 'demo-x-mut', 10));
    cur.appendChild(svgText(42, 128, '关节位置 · 关节速度 · 上一步动作', 'demo-x-mut', 10));

    var priv = group(s);
    rectBox(priv, 280, 44, 170, 96, C_WARN);
    priv.appendChild(svgText(292, 64, '特权信息', null, 12));
    priv.appendChild(paint(svgText(438, 64, '50', 'demo-x-mono', 13, 'end'), C_WARN));
    priv.appendChild(paint(svgEl('rect', { x: 300, y: 84, width: 22, height: 18, rx: 3 }), C_WARN));
    priv.appendChild(paint(svgEl('path', { d: 'M 304 84 L 304 78 A 7 7 0 0 1 318 78 L 318 84', fill: 'none', 'stroke-width': 2.4 }), null, C_WARN));
    priv.appendChild(svgText(332, 98, '只在仿真里有', 'demo-x-warn', 10.5));
    priv.appendChild(svgText(292, 128, '质量 · 质心 · 电机强度 · 线速度', 'demo-x-mut', 9.5));

    var hist = group(s);
    rectBox(hist, 460, 44, 310, 96, C_MUTED);
    hist.appendChild(svgText(472, 64, '最近 10 步的历史', null, 12));
    hist.appendChild(paint(svgText(758, 64, '710', 'demo-x-mono', 13, 'end'), C_MUTED));
    var clipH = svgEl('clipPath', { id: 'lcp-x-clip-s6' });
    clipH.appendChild(svgEl('rect', { x: 470, y: 74, width: 290, height: 40 }));
    var defs = svgEl('defs', {});
    defs.appendChild(clipH);
    s.appendChild(defs);
    var conv = svgEl('g', { 'clip-path': 'url(#lcp-x-clip-s6)' });
    hist.appendChild(conv);
    var frames = [];
    for (var f = 0; f < 11; f++) {
      var fr = paint(svgEl('rect', { y: 78, width: 22, height: 32, rx: 3, 'stroke-width': 1.2 }), C_SURFACE2, C_MUTED);
      conv.appendChild(fr);
      frames.push(fr);
    }
    hist.appendChild(svgText(472, 130, '每一步新的一帧推进来，最老的一帧挤出去', 'demo-x-mut', 10));
    var total = group(s);
    total.appendChild(svgRich(400, 156, '按 GR1 的公开代码：71 + 50 + 710 = **831 维**', { size: 11.5, anchor: 'middle', w: 600 }));

    var roa = group(s);
    rectBox(roa, 30, 168, 380, 148, C_BORDER, C_SURFACE2);
    roa.appendChild(svgText(42, 188, 'ROA：两条路互相拉近', 'demo-x-acc', 12));
    var zMu = [300, 252];
    var spring = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 1.6 }), null, C_MUTED);
    roa.appendChild(spring);
    var dMu = paint(svgEl('circle', { cx: zMu[0], cy: zMu[1], r: 9 }), C_WARN);
    var dPhi = paint(svgEl('circle', { r: 9 }), C_ACCENT);
    roa.appendChild(dMu);
    roa.appendChild(dPhi);
    roa.appendChild(svgText(zMu[0] + 14, zMu[1] - 12, '特权编码', 'demo-x-warn', 10.5));
    var phiTag = svgText(0, 0, '历史估计', 'demo-x-acc', 10.5, 'middle');
    roa.appendChild(phiTag);
    roa.appendChild(svgText(42, 300, '训练时互相拉近（系数 0.1）；部署时只剩历史估计', 'demo-x-mut', 10.5));

    var abl = group(s);
    rectBox(abl, 420, 168, 350, 148, C_BORDER, C_SURFACE2);
    abl.appendChild(svgText(432, 188, '表 I(c)：GP 罚哪些输入', 'demo-x-ink2', 12));
    var trCur = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 1.8 }), null, C_BAD);
    var trAll = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 1.8 }), null, C_GOOD);
    abl.appendChild(trCur);
    abl.appendChild(trAll);
    abl.appendChild(svgText(432, 208, '只罚当前观测：动作抖动 7.16', 'demo-x-bad', 10.5));
    abl.appendChild(svgText(432, 276, '罚整段输入：动作抖动 3.21', 'demo-x-good', 10.5));

    var fin = group(s);
    chip(fin, 30, 326, 740, '只罚当前观测，历史一变动作照样会跳：抖动 7.16 对 3.21（关节位置抖动 0.35 对 0.17）', C_BAD, { h: 34, size: 11.5 });
    var tail = group(s);
    chip(tail, 30, 370, 740, '部署时特权信息拿不到，换成历史估计 —— 这条通路也得平滑（这一句是我们的理解）', C_BORDER, { h: 34, size: 11 });

    function trace(amp, yc, now, phase) {
      var pts = [], i0 = Math.floor(now * 20);
      for (var k = 0; k <= 60; k++) {
        var idx = (i0 + k + phase) % S6_TR.length;
        pts.push([440 + k * 5, yc - 5 * Math.sin((i0 + k) * 0.12) - amp * clamp(S6_TR[idx], -2, 2)]);
      }
      return polyPath(pts.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; }));
    }

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(cur, seg(t, 0.2, 0.8));
      segEls.forEach(function (r, k) { r.style.opacity = (0.55 + 0.45 * Math.max(0, Math.sin(now * 2.2 - k * 0.7))).toFixed(2); });
      setOpacity(priv, seg(t, 3.6, 4.2));
      setOpacity(hist, seg(t, 4.0, 4.6));
      var shift = ((now * 1.2) % 1) * 27;
      frames.forEach(function (fr, k) { fr.setAttribute('x', (474 + k * 27 - shift).toFixed(1)); });
      setOpacity(total, seg(t, 5.4, 6.0));
      setOpacity(roa, seg(t, 7.0, 7.6));
      var tau = now % 5, pull = Math.exp(-tau / 1.1);
      var px = zMu[0] - 210 * pull, py = zMu[1] - 30 * pull + 4 * Math.sin(now * 3);
      dPhi.setAttribute('cx', px.toFixed(1));
      dPhi.setAttribute('cy', py.toFixed(1));
      phiTag.setAttribute('x', px.toFixed(1));
      phiTag.setAttribute('y', (py + 24).toFixed(1));
      var n = 9, sp = [];
      for (var k = 0; k <= n; k++) {
        var u = k / n;
        sp.push([px + (zMu[0] - px) * u, py + (zMu[1] - py) * u + (k % 2 ? 6 : -6) * (k > 0 && k < n ? 1 : 0)]);
      }
      spring.setAttribute('d', polyPath(sp.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })));
      setOpacity(abl, seg(t, 10.4, 11.0));
      /* 抖动幅度按 7.16 : 3.21 的比例画（示意） */
      trCur.setAttribute('d', trace(7.16 * 1.2, 236, now, 0));
      trAll.setAttribute('d', trace(3.21 * 1.2, 296, now, 200));
      setOpacity(fin, seg(t, 13.4, 14.0));
      setOpacity(tail, seg(t, 14.8, 15.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 7: 命令、奖励与课程 ── */
  var S7_STEPS = curriculumSteps(CURRIC.s0, CURRIC.cap, CURRIC.up); // 9164
  var S7_CMDS = [[0.8, 0, 0, '前进 0.8 m/s'], [0.4, 0.4, 0, '前进 0.4 + 左移 0.4'], [0.2, 0, 0.6, '慢走 + 左转 0.6 rad/s'], [0.6, -0.3, 0, '前进 0.6 + 右移 0.3']];
  function buildSceneReward() {
    var s = sceneSvg('机器人跟着速度命令走，命令每 150 步、也就是 3 秒换一次，一回合 500 步 10 秒；奖励三类：步态风格、速度跟踪和八项正则，没有罚动作变化率和关节加速度的平滑项，那部分交给梯度惩罚；课程：机器人站得越久，负奖励的系数从 0.8 慢慢涨到 2.0');
    s.appendChild(svgText(30, 28, '任务：跟着速度命令走；平滑项拿掉，正则项留着', 'demo-x-ink2', 13.5));

    var walk = group(s);
    rectBox(walk, 30, 44, 370, 150, C_BORDER, C_SURFACE2);
    var ground = group(walk);
    var dashes = [];
    for (var d = 0; d < 12; d++) {
      var dl = paint(svgEl('line', { y1: 176, y2: 176, 'stroke-width': 2.4 }), null, C_MUTED);
      ground.appendChild(dl);
      dashes.push(dl);
    }
    var fig = K.stickFigure(C_ACCENT, 2.6, false, 0.4);
    fig.el.setAttribute('transform', 'translate(130 141) scale(0.74)');
    walk.appendChild(fig.el);
    var mk = K.arrowMarker(s, 'lcp-x-arrow-s7', C_GOOD);
    var cmdArrow = paint(svgEl('line', { x1: 250, y1: 120, x2: 330, y2: 120, 'stroke-width': 4, 'marker-end': mk }), null, C_GOOD);
    walk.appendChild(cmdArrow);
    var cmdTxt = svgText(280, 160, '', 'demo-x-good', 11.5, 'middle');
    walk.appendChild(cmdTxt);
    walk.appendChild(svgText(42, 64, '速度命令（每 3 s 换一次）', null, 12));
    walk.appendChild(svgText(388, 64, '前进 0–0.8 · 横移 ±0.4 · 转向 ±0.6', 'demo-x-mut', 9.5, 'end'));

    var ep = group(s);
    rectBox(ep, 410, 44, 360, 150, C_BORDER, C_SURFACE2);
    ep.appendChild(svgText(422, 64, '一回合 500 步 = 10 s（50 Hz）', null, 12));
    var EX0 = 430, EX1 = 750;
    function ex(k) { return EX0 + (k / EP_STEPS) * (EX1 - EX0); }
    ep.appendChild(paint(svgEl('rect', { x: EX0, y: 96, width: EX1 - EX0, height: 22, rx: 5 }), C_SURFACE));
    var epFill = paint(svgEl('rect', { x: EX0, y: 96, width: 0, height: 22, rx: 5 }), C_ACCENT);
    ep.appendChild(epFill);
    var tickEls = [150, 300, 450].map(function (k) {
      var tk = paint(svgEl('line', { x1: ex(k), y1: 88, x2: ex(k), y2: 126, 'stroke-width': 2.4 }), null, C_GOOD);
      ep.appendChild(tk);
      ep.appendChild(svgText(ex(k), 142, String(k), 'demo-x-mono demo-x-mut', 9.5, 'middle'));
      return tk;
    });
    ep.appendChild(svgText(422, 178, '绿线 = 换命令（每 150 步）', 'demo-x-good', 10.5));

    var rw = group(s);
    function bag(x, w, head, sub, color) {
      rectBox(rw, x, 204, w, 84, color);
      rw.appendChild(svgText(x + w / 2, 230, head, null, 12.5, 'middle'));
      rw.appendChild(svgText(x + w / 2, 252, sub, 'demo-x-mut', 10.5, 'middle'));
    }
    bag(30, 200, '步态风格', '像人一样迈步', C_ACCENT);
    bag(240, 200, '速度跟踪', '跟上命令（算任务回报）', C_GOOD);
    bag(450, 320, '正则（附录表 IV 八项）', '力矩 · 碰撞 · 绊脚 · 关节限位 · 姿态 …', C_WARN);
    var gone = group(s);
    gone.appendChild(svgText(610, 278, '动作变化率 · 关节加速度', 'demo-x-bad', 11, 'middle'));
    var strike = pathLine(gone, [[540, 274], [680, 274]], C_BAD, 2);
    var toGp = svgText(690, 278, '→ 交给 GP', 'demo-x-good', 11);
    gone.appendChild(toGp);

    var cur = group(s);
    rectBox(cur, 30, 298, 740, 114, C_BORDER, C_SURFACE2);
    cur.appendChild(svgText(42, 318, '附录 B 的课程：站得越久，罚得越重', null, 12));
    var CX0 = 42, CX1 = 420;
    function cx(k) { return CX0 + (k / EP_STEPS) * (CX1 - CX0); }
    cur.appendChild(svgText(42, 340, '平均回合长度', 'demo-x-mut', 10.5));
    cur.appendChild(paint(svgEl('rect', { x: CX0, y: 350, width: CX1 - CX0, height: 18, rx: 4 }), C_SURFACE));
    var lenFill = paint(svgEl('rect', { x: CX0, y: 350, width: 0, height: 18, rx: 4 }), C_ACCENT);
    cur.appendChild(lenFill);
    [[50, '< 50：减轻', C_BAD], [400, '> 400：加重', C_GOOD]].forEach(function (m) {
      cur.appendChild(paint(svgEl('line', { x1: cx(m[0]), y1: 344, x2: cx(m[0]), y2: 374, 'stroke-width': 2 }), null, m[2]));
      cur.appendChild(svgText(cx(m[0]), 390, m[1], m[2] === C_BAD ? 'demo-x-bad' : 'demo-x-good', 10, 'middle'));
    });
    var GX = 590, GY = 384, GR = 58;
    var arc = [];
    for (var a = 0; a <= 30; a++) {
      var ang = Math.PI - (Math.PI * a) / 30;
      arc.push([GX + GR * Math.cos(ang), GY - GR * Math.sin(ang)]);
    }
    pathLine(cur, arc, C_BORDER, 6);
    var needle = paint(svgEl('line', { x1: GX, y1: GY, x2: GX - GR, y2: GY, 'stroke-width': 3.2, 'stroke-linecap': 'round' }), null, C_WARN);
    cur.appendChild(needle);
    cur.appendChild(svgText(GX - GR, GY + 14, '0.8', 'demo-x-mono demo-x-mut', 9.5, 'middle'));
    cur.appendChild(svgText(GX + GR, GY + 14, '2.0', 'demo-x-mono demo-x-mut', 9.5, 'middle'));
    var gaugeTxt = svgText(GX, GY - 18, '', 'demo-x-warn', 12, 'middle');
    cur.appendChild(gaugeTxt);
    cur.appendChild(svgText(GX, 318, '负奖励的系数', 'demo-x-ink2', 10.5, 'middle'));
    cur.appendChild(svgText(758, 352, '从 0.8 涨到 2.0', 'demo-x-ink2', 10.5, 'end'));
    cur.appendChild(svgText(758, 370, '要连乘 ' + S7_STEPS + ' 次 1.0001', 'demo-x-warn', 10.5, 'end'));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(walk, seg(t, 0.2, 0.8));
      var ci = Math.floor(now / 3) % S7_CMDS.length, cmd = S7_CMDS[ci];
      fig.pose(0, 0, K.poseWalk((now * (0.8 + cmd[0])) % 1));
      var spd = 60 * cmd[0];
      dashes.forEach(function (dl, k) {
        var x = 40 + ((k * 32 - now * spd) % 384 + 384) % 384;
        dl.setAttribute('x1', Math.min(388, x).toFixed(1));
        dl.setAttribute('x2', Math.min(388, x + 16).toFixed(1));
      });
      var ang = Math.atan2(cmd[1], cmd[0]) + cmd[2] * 0.8, len = 30 + 55 * Math.hypot(cmd[0], cmd[1]);
      cmdArrow.setAttribute('x2', (250 + len * Math.cos(ang)).toFixed(1));
      cmdArrow.setAttribute('y2', (120 - len * Math.sin(ang)).toFixed(1));
      cmdTxt.textContent = cmd[3];
      setOpacity(ep, seg(t, 1.6, 2.2));
      var k = ((now % 10) / 10) * EP_STEPS;
      epFill.setAttribute('width', (ex(k) - EX0).toFixed(1));
      tickEls.forEach(function (tk, j) {
        var dk = k - (j + 1) * 150;
        tk.style.opacity = dk >= 0 && dk < 25 ? 1 : 0.35;
      });
      setOpacity(rw, seg(t, 3.6, 4.2));
      setOpacity(gone, seg(t, 5.0, 5.6));
      drawOn(strike, ease(seg(t, 5.6, 6.4)));
      setOpacity(toGp, seg(t, 6.2, 6.8));
      setOpacity(cur, seg(t, 7.0, 7.6));
      var tau = now % 8, len2 = Math.min(EP_STEPS, (tau / 5) * EP_STEPS);
      lenFill.setAttribute('width', (cx(len2) - CX0).toFixed(1));
      var sval = 0.8 + 1.2 * clamp((tau - 4) / 3.5, 0, 1);
      var ga = Math.PI - (Math.PI * (sval - 0.8)) / 1.2;
      needle.setAttribute('x2', (GX + (GR - 6) * Math.cos(ga)).toFixed(1));
      needle.setAttribute('y2', (GY - (GR - 6) * Math.sin(ga)).toFixed(1));
      gaugeTxt.textContent = fmt(sval, 2);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 三种平滑办法（表 I(a)） ── */
  function buildSceneCompare() {
    var s = sceneSvg('动作变化率是一阶导，抖动是三阶导；每种方法三个种子、一千个环境、五百步；图 4 的训练曲线里 LCP 的动作变化率等指标与平滑奖励相当；表 I(a) 动作抖动 LCP 3.21、平滑奖励 5.74、低通 7.86、不平滑 42.19；任务回报 26.03、26.56、24.98、28.87');
    s.appendChild(svgText(30, 28, '三种平滑办法：没被平滑指标奖励过，却和平滑奖励一样平', 'demo-x-ink2', 13.5));

    var mets = group(s);
    chip(mets, 30, 42, 236, '动作变化率 = 一阶导', C_BORDER, { h: 28, size: 11 });
    chip(mets, 276, 42, 250, '抖动 = 三阶导（jerk）', C_BORDER, { h: 28, size: 11 });
    chip(mets, 536, 42, 234, '3 种子 × 1000 环境 × 500 步', C_BORDER, { h: 28, size: 11 });

    /* 左：图 4 示意（动作变化率；读图近似值，0.5 B 样本处的跳变照画） */
    var f4 = group(s);
    rectBox(f4, 30, 84, 232, 230, C_BORDER, C_SURFACE2);
    f4.appendChild(svgText(42, 102, '图 4（读图示意）：动作变化率', 'demo-x-mut', 10.5));
    var FX0 = 48, FX1 = 250, FY0 = 286, FY1 = 116;
    function fx(m) { return FX0 + (m / 680) * (FX1 - FX0); }
    function fy(v) { return FY0 - ((v - 6) / (24 - 6)) * (FY0 - FY1); }
    f4.appendChild(paint(svgEl('line', { x1: FX0, y1: FY0, x2: FX1, y2: FY0, 'stroke-width': 1 }), null, C_BORDER));
    [8, 16].forEach(function (v) {
      f4.appendChild(svgText(FX0 - 3, fy(v) + 3, String(v), 'demo-x-mono demo-x-mut', 9, 'end'));
    });
    [250, 500].forEach(function (m) {
      f4.appendChild(svgText(fx(m), FY0 + 13, m + 'M', 'demo-x-mono demo-x-mut', 9, 'middle'));
    });
    function curveF(fn) {
      var pts = [];
      for (var m = 30; m <= 680; m += 10) pts.push([fx(m), fy(fn(m))]);
      return pts;
    }
    var f4none = pathLine(f4, curveF(function (m) { return m < 495 ? 12 + 9 * (1 - Math.exp(-(m - 30) / 70)) : 14 + 1.2 * ((m - 495) / 185); }), C_MUTED, 1.8);
    var f4rew = pathLine(f4, curveF(function (m) { return m < 495 ? 9 + 0.8 * (1 - Math.exp(-(m - 30) / 60)) : 9.1; }), C_WARN, 1.8);
    var f4lcp = pathLine(f4, curveF(function (m) { return m < 495 ? 8 + 1.0 * (1 - Math.exp(-(m - 30) / 40)) : 7.9; }), C_BAD, 1.8);
    f4.appendChild(svgText(250, 120, '灰：不平滑　黄：平滑奖励　红：LCP', 'demo-x-mut', 9.5, 'end'));

    function bars(x0, title, idx, top, fmtD, at) {
      var g = group(s);
      rectBox(g, x0, 84, 246, 230, C_BORDER, C_SURFACE2);
      g.appendChild(svgText(x0 + 12, 102, title, 'demo-x-ink2', 11));
      var BASE = 274, H = 140;
      g.appendChild(paint(svgEl('line', { x1: x0 + 10, y1: BASE, x2: x0 + 236, y2: BASE, 'stroke-width': 1 }), null, C_BORDER));
      var cols = [C_GOOD, C_WARN, C_ACCENT, C_MUTED];
      var names = ['LCP', '平滑奖励', '低通', '不平滑'];
      var items = TABLE1A.map(function (r, k) {
        var bx = x0 + 20 + k * 56;
        var b = vbar(g, bx, BASE, 40, cols[k]);
        var v = r[1][idx];
        var lab = paint(svgText(bx + 20, BASE - (v / top) * H - 6, fmt(v, fmtD), 'demo-x-mono', 10.5, 'middle'), cols[k]);
        g.appendChild(lab);
        g.appendChild(svgText(bx + 20, BASE + 14, names[k], 'demo-x-ink2', 10, 'middle'));
        return { b: b, h: (v / top) * H, lab: lab };
      });
      g.at = at;
      g.items = items;
      return g;
    }
    var bJit = bars(272, '表 I(a)：动作抖动 ↓', 0, 46, 2, 7.0);
    var bRet = bars(524, '表 I(a)：任务回报 ↑', 5, 32, 2, 10.4);
    var eTag = group(bJit);
    eTag.appendChild(svgText(506, 306, '能耗 24.57 对 42.68：少 42%', 'demo-x-good', 10, 'end'));
    var rTag = group(bRet);
    rTag.appendChild(svgText(758, 306, 'LCP 只比不平滑低 9.8%', 'demo-x-good', 10, 'end'));

    var fin = group(s);
    chip(fin, 30, 330, 740, '论文：LCP 能替代平滑奖励，任务表现相近；低通回报偏低，可能是它的阻尼压抑了探索', C_ACCENT, { h: 34, size: 12 });
    var tail = group(s);
    chip(tail, 30, 374, 740, '不平滑回报最高，但动作抖动是 LCP 的 13 倍，不适合上真机', C_BORDER, { h: 30, size: 11 });

    function draw(t) {
      setOpacity(mets, seg(t, 0.3, 0.9));
      setOpacity(f4, seg(t, 3.6, 4.2));
      drawOn(f4none, ease(seg(t, 3.8, 5.4)));
      drawOn(f4rew, ease(seg(t, 4.2, 5.8)));
      drawOn(f4lcp, ease(seg(t, 4.6, 6.2)));
      [bJit, bRet].forEach(function (g) {
        setOpacity(g, seg(t, g.at, g.at + 0.5));
        g.items.forEach(function (it, k) {
          setH(it.b, it.h * ease(seg(t, g.at + 0.3 + k * 0.35, g.at + 1.1 + k * 0.35)));
          setOpacity(it.lab, seg(t, g.at + 1.0 + k * 0.35, g.at + 1.3 + k * 0.35));
        });
      });
      setOpacity(eTag, seg(t, 9.0, 9.6));
      setOpacity(rTag, seg(t, 12.4, 13.0));
      setOpacity(fin, seg(t, 13.4, 14.0));
      setOpacity(tail, seg(t, 14.8, 15.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: λ_gp 扫一遍（表 I(b)） ── */
  function buildSceneLambda() {
    var s = sceneSvg('表 I(b)：lambda gp 等于 0、0.001、0.002、0.005、0.01 时动作抖动 42.19、3.69、3.21、2.10、0.17，任务回报 28.87、26.32、26.03、23.92、16.11；0.01 时关节速度 2.75，回报比 0 低 44%，图 6 里也学得更慢');
    s.appendChild(svgRich(30, 28, '$\\lambda_{gp}$ 扫一遍：0.001 就砍掉九成抖动，0.01 压过头', { size: 13.5, w: 700, cls: 'demo-x-ink2' }));

    var X0 = 60, DX = 92;
    var cols = TABLE1B.map(function (r, k) { return { lam: r[0], v: r[1], x: X0 + k * DX }; });
    var head = group(s);
    cols.forEach(function (c, k) {
      head.appendChild(svgMath(c.x + 32, 56, '\\lambda_{gp} = ' + (c.lam === 0 ? '0' : String(c.lam)), { size: 11, anchor: 'middle', w: 100 }).setTone(k === 2 ? C_GOOD : null));
    });

    /* 上：动作抖动，对数轴 0.1 … 100 */
    var top = group(s);
    rectBox(top, 30, 70, 490, 150, C_BORDER, C_SURFACE2);
    top.appendChild(svgText(42, 88, '动作抖动 ↓（对数轴）', 'demo-x-ink2', 10.5));
    var LB = 206, LH = 100;
    function ly(v) { return LB - ((Math.log10(v) + 1) / 3) * LH; }
    [0.1, 1, 10, 100].forEach(function (v) {
      top.appendChild(paint(svgEl('line', { x1: 50, y1: ly(v), x2: 510, y2: ly(v), 'stroke-width': 0.6, 'stroke-dasharray': '2 4' }), null, C_BORDER));
      top.appendChild(svgText(48, ly(v) + 3, String(v), 'demo-x-mono demo-x-mut', 9, 'end'));
    });
    var jBars = cols.map(function (c, k) {
      var b = vbar(top, c.x + 14, LB, 36, k === 2 ? C_GOOD : k === 4 ? C_WARN : k === 0 ? C_MUTED : C_ACCENT);
      var lab = paint(svgText(c.x + 32, ly(c.v[0]) - 5, fmt(c.v[0], 2), 'demo-x-mono', 10.5, 'middle'), k === 2 ? C_GOOD : null);
      top.appendChild(lab);
      return { b: b, h: LB - ly(c.v[0]), lab: lab };
    });

    /* 下：任务回报 */
    var bot = group(s);
    rectBox(bot, 30, 230, 490, 120, C_BORDER, C_SURFACE2);
    bot.appendChild(svgText(42, 248, '任务回报 ↑', 'demo-x-ink2', 10.5));
    var RB = 336, RH = 70;
    var rBars = cols.map(function (c, k) {
      var b = vbar(bot, c.x + 14, RB, 36, k === 2 ? C_GOOD : k === 4 ? C_WARN : k === 0 ? C_MUTED : C_ACCENT);
      var lab = paint(svgText(c.x + 32, RB - (c.v[5] / 30) * RH - 5, fmt(c.v[5], 2), 'demo-x-mono', 10.5, 'middle'), k === 2 ? C_GOOD : null);
      bot.appendChild(lab);
      return { b: b, h: (c.v[5] / 30) * RH, lab: lab };
    });

    /* 两条结论直接贴在柱子上 */
    var dropTag = group(top);
    dropTag.appendChild(svgText(510, 88, '0 → 0.001：抖动 −91%', 'demo-x-acc', 10.5, 'end'));
    var overTag = group(bot);
    overTag.appendChild(svgText(510, 248, '0.01：回报比 0 低 44%', 'demo-x-warn', 10.5, 'end'));

    /* 右上：一个旋钮，指针按旁白走过五档 */
    var dial = group(s);
    rectBox(dial, 536, 70, 234, 150, C_BORDER, C_SURFACE2);
    dial.appendChild(svgRich(548, 88, '把 $\\lambda_{gp}$ 当成一个旋钮', { size: 11, w: 210, cls: 'demo-x-ink2' }));
    var DCX = 653, DCY = 190, DR = 62;
    var DIAL_COL = [C_MUTED, C_ACCENT, C_GOOD, C_ACCENT, C_WARN];
    function dialAng(u) { return Math.PI - (u / 4) * Math.PI; }
    for (var q = 0; q < 4; q++) {
      var a0 = dialAng(q), a1 = dialAng(q + 1);
      dial.appendChild(paint(svgEl('path', {
        d: 'M' + (DCX + DR * Math.cos(a0)).toFixed(1) + ',' + (DCY - DR * Math.sin(a0)).toFixed(1) +
          ' A' + DR + ',' + DR + ' 0 0 1 ' + (DCX + DR * Math.cos(a1)).toFixed(1) + ',' + (DCY - DR * Math.sin(a1)).toFixed(1),
        fill: 'none', 'stroke-width': 7, opacity: 0.55
      }), null, [C_MUTED, C_GOOD, C_GOOD, C_WARN][q]));
    }
    var dialLabs = cols.map(function (c, k) {
      var ag = dialAng(k);
      var lab = svgText(DCX + 80 * Math.cos(ag), DCY - 80 * Math.sin(ag) + 4, c.lam === 0 ? '0' : String(c.lam), 'demo-x-mono demo-x-mut', 10, 'middle');
      dial.appendChild(lab);
      return lab;
    });
    var needle = paint(svgEl('line', { x1: DCX, y1: DCY, x2: DCX - DR + 8, y2: DCY, 'stroke-width': 3.2, 'stroke-linecap': 'round' }), null, C_INK2);
    dial.appendChild(needle);
    dial.appendChild(paint(svgEl('circle', { cx: DCX, cy: DCY, r: 6 }), C_INK2));
    var dialRead = svgText(DCX, DCY + 24, '', 'demo-x-mono', 10.5, 'middle');
    dial.appendChild(dialRead);

    /* 右下：同一段目标动作，五档策略各自怎么走（示意：抖动幅度按表 I(b) 的大小排序，0.01 档跟得慢、幅度小） */
    var tr = group(s);
    rectBox(tr, 536, 230, 234, 120, C_BORDER, C_SURFACE);
    tr.appendChild(svgText(548, 248, '一段动作（示意）', 'demo-x-ink2', 10.5));
    tr.appendChild(svgText(758, 248, '虚线：该走的', 'demo-x-mut', 9.5, 'end'));
    var trTarget = pathLine(tr, [[548, 296], [758, 296]], C_MUTED, 1.4, '4 3');
    var trOut = pathLine(tr, [[548, 296], [758, 296]], C_BAD, 2);
    var trState = svgText(758, 344, '', 'demo-x-mut', 10, 'end');
    tr.appendChild(trState);
    /* 每档：噪声幅度、滞后（秒）、幅度比例 */
    var TR_P = [[0.42, 0, 1], [0.07, 0.03, 0.98], [0.055, 0.04, 0.96], [0.035, 0.1, 0.88], [0, 0.32, 0.55]];
    var TR_TXT = ['来回跳，像 bang-bang', '几乎平了', '平滑、跟得上', '更平，开始变慢', '又平又慢，跟不上'];
    var TR_NOISE = (function () {
      var rng = mulberry32(9), arr = [];
      for (var i = 0; i < 2000; i++) arr.push(rng() * 2 - 1);
      return arr;
    })();
    function trAt(tau, p) {
      var base = 0.75 * Math.sin(2 * Math.PI * 0.45 * (tau - p[1])) * p[2];
      var i = ((Math.floor(tau / 0.05) % 2000) + 2000) % 2000;
      return base + p[0] * TR_NOISE[i];
    }
    function lambdaIdx(t) {
      return t < 3.6 ? 0 : t < 7.0 ? 1 : t < 8.4 ? 2 : t < 10.4 ? 3 : 4;
    }
    var LAM_AT = [0, 3.6, 7.0, 8.4, 10.4];

    var fin = group(s);
    chip(fin, 30, 368, 740, '和别的平滑办法一样，$\\lambda_{gp}$ 也要调；论文实验里 0.002 平衡得最好，四台真机都用它', C_ACCENT, { h: 36, size: 12 });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(head, seg(t, 0.3, 0.9));
      setOpacity(top, seg(t, 0.3, 0.9));
      setOpacity(bot, seg(t, 0.6, 1.2));
      var at = [0.6, 3.6, 7.0, 8.4, 10.4];
      cols.forEach(function (c, k) {
        setH(jBars[k].b, jBars[k].h * ease(seg(t, at[k], at[k] + 0.8)));
        setOpacity(jBars[k].lab, seg(t, at[k] + 0.6, at[k] + 1.0));
        setH(rBars[k].b, rBars[k].h * ease(seg(t, at[k] + 0.3, at[k] + 1.1)));
        setOpacity(rBars[k].lab, seg(t, at[k] + 0.9, at[k] + 1.3));
      });
      setOpacity(dropTag, seg(t, 4.4, 5.0));
      setOpacity(overTag, seg(t, 11.0, 11.6));
      setOpacity(dial, seg(t, 0.3, 0.9));
      setOpacity(tr, seg(t, 0.6, 1.2));
      var k = lambdaIdx(t), u = k ? ease(seg(t, LAM_AT[k], LAM_AT[k] + 0.8)) : 1;
      var kp = Math.max(0, k - 1);
      var ag = dialAng(kp + (k - kp) * u);
      needle.setAttribute('x2', (DCX + (DR - 8) * Math.cos(ag)).toFixed(1));
      needle.setAttribute('y2', (DCY - (DR - 8) * Math.sin(ag)).toFixed(1));
      needle.style.stroke = DIAL_COL[k];
      dialLabs.forEach(function (lab, j) {
        lab.style.opacity = j === k ? 1 : 0.45;
        lab.style.fontWeight = j === k ? 700 : 400;
      });
      dialRead.textContent = '抖动 ' + fmt(cols[k].v[0], 2) + ' · 回报 ' + fmt(cols[k].v[5], 2);
      dialRead.style.fill = DIAL_COL[k];
      var p = TR_P[kp].map(function (v, j) { return v + (TR_P[k][j] - v) * u; });
      var tgt = [], out = [];
      for (var j = 0; j <= 84; j++) {
        var tau = now - 4 + (j / 84) * 4, x = 548 + (j / 84) * 210;
        tgt.push([x, 292 - 34 * 0.75 * Math.sin(2 * Math.PI * 0.45 * tau)]);
        out.push([x, 292 - 34 * clamp(trAt(tau, p), -1.1, 1.1)]);
      }
      trTarget.setAttribute('d', polyPath(tgt.map(function (q2) { return [q2[0].toFixed(1), q2[1].toFixed(1)]; })));
      trOut.setAttribute('d', polyPath(out.map(function (q2) { return [q2[0].toFixed(1), q2[1].toFixed(1)]; })));
      trOut.style.stroke = k === 0 ? C_BAD : DIAL_COL[k];
      trState.textContent = TR_TXT[k];
      trState.style.fill = k === 0 ? C_BAD : DIAL_COL[k];
      setOpacity(fin, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: 四台真机、sim-to-sim 与局限 ── */
  function buildSceneReal() {
    var s = sceneSvg('四台人形：傅利叶 GR1T1 与 GR1T2 二十一个关节控制十九个，宇树 H1 十九个关节，伯克利人形高 0.85 米十二个自由度；表 II MuJoCo 任务回报 24.33、21.74、26.50；表 III 真机三种地面动作抖动基本不变，最多涨 8%；局限：只验证了基础行走');
    s.appendChild(svgText(30, 28, '四台人形：先 MuJoCo，再上真机，一个系数 0.002', 'demo-x-ink2', 13.5));

    var robots = group(s);
    var figs = [];
    ROBOTS.forEach(function (r, k) {
      var x = 30 + k * 250;
      var g = group(robots);
      rectBox(g, x, 42, 240, 116, C_BORDER, C_SURFACE2);
      g.appendChild(svgText(x + 12, 62, r[0], null, 12));
      var parts = r[1].split('，');
      parts.forEach(function (p, q) {
        g.appendChild(svgText(x + 12, 84 + q * 18, p, 'demo-x-ink2', 10.5));
      });
      var full = k < 2;
      var fig = K.stickFigure(k === 2 ? C_GOOD : C_ACCENT, 2.4, false, 0.4);
      fig.el.setAttribute('transform', 'translate(' + (x + 200) + ',' + (full ? 98 : 124) + ') scale(' + (full ? 0.62 : 0.33) + ')');
      g.appendChild(fig.el);
      figs.push(fig);
      g.at = 0.3 + k * 1.1;
      return g;
    });
    var robotTag = group(s);
    robotTag.appendChild(svgText(770, 172, '小人是示意；只有伯克利人形的身高写在论文里', 'demo-x-mut', 9.5, 'end'));

    var s2s = group(s);
    rectBox(s2s, 30, 182, 230, 150, C_BORDER, C_SURFACE2);
    s2s.appendChild(svgText(42, 200, '表 II：MuJoCo 任务回报', 'demo-x-ink2', 11));
    var SB = 304, SH = 80;
    var sNames = ['GR1', 'H1', 'Berkeley'];
    var sBars = TABLE2.map(function (r, k) {
      var bx = 52 + k * 70;
      var b = vbar(s2s, bx, SB, 38, k === 2 ? C_GOOD : C_ACCENT);
      var lab = paint(svgText(bx + 19, SB - (r[1][5] / 30) * SH - 5, fmt(r[1][5], 2), 'demo-x-mono', 10.5, 'middle'), null);
      s2s.appendChild(lab);
      s2s.appendChild(svgText(bx + 19, SB + 14, sNames[k], 'demo-x-ink2', 10, 'middle'));
      return { b: b, h: (r[1][5] / 30) * SH, lab: lab };
    });
    s2s.appendChild(paint(svgEl('line', { x1: 44, y1: SB, x2: 252, y2: SB, 'stroke-width': 1 }), null, C_BORDER));

    var real = group(s);
    rectBox(real, 274, 182, 496, 150, C_BORDER, C_SURFACE2);
    real.appendChild(svgText(286, 200, '表 III：真机动作抖动（3 个模型 × 10 s）', 'demo-x-ink2', 11));
    var RB = 304, RH = 75;
    var tCols = [C_ACCENT, C_WARN, C_BAD];
    var rBars = [];
    TABLE3.forEach(function (r, k) {
      var gx = 300 + k * 156;
      [1, 2, 3].forEach(function (q) {
        var v = r[q][0][0];
        var b = vbar(real, gx + (q - 1) * 40, RB, 32, tCols[q - 1]);
        var lab = paint(svgText(gx + (q - 1) * 40 + 16, RB - (v / 2) * RH - 5, fmt(v, 2), 'demo-x-mono', 9.5, 'middle'), null);
        real.appendChild(lab);
        rBars.push({ b: b, h: (v / 2) * RH, lab: lab });
      });
      real.appendChild(svgText(gx + 56, RB + 14, sNames[k], 'demo-x-ink2', 10, 'middle'));
    });
    real.appendChild(paint(svgEl('line', { x1: 286, y1: RB, x2: 760, y2: RB, 'stroke-width': 1 }), null, C_BORDER));
    var tLeg = group(real);
    TERRAINS.forEach(function (n, q) {
      tLeg.appendChild(paint(svgEl('rect', { x: 560 + q * 70, y: 192, width: 10, height: 10, rx: 2 }), tCols[q]));
      tLeg.appendChild(svgText(574 + q * 70, 201, n, 'demo-x-mut', 9.5));
    });

    var lim = group(s);
    chip(lim, 30, 344, 740, '外力推搡也能恢复（补充视频）。局限：只验证了**基础行走**，跑、跳还没试；$\\lambda_{gp}$ 仍要调', C_WARN, { h: 30, size: 11.5 });
    var fin = group(s);
    chip(fin, 30, 382, 740, '把「平滑」从调奖励、加滤波，换成对策略本身的一个**可微约束** · 代码与检查点开源', C_ACCENT, { h: 32, size: 12 });

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      robots.childNodes.forEach(function (g, k) { setOpacity(g, seg(t, 0.3 + k * 1.1, 0.9 + k * 1.1)); });
      figs.forEach(function (f, k) { f.pose(0, 0, K.poseWalk((now * 0.9 + k * 0.33) % 1)); });
      setOpacity(robotTag, seg(t, 3.0, 3.6));
      setOpacity(s2s, seg(t, 3.6, 4.2));
      sBars.forEach(function (it, k) {
        setH(it.b, it.h * ease(seg(t, 4.0 + k * 0.4, 4.8 + k * 0.4)));
        setOpacity(it.lab, seg(t, 4.6 + k * 0.4, 5.0 + k * 0.4));
      });
      setOpacity(real, seg(t, 7.0, 7.6));
      rBars.forEach(function (it, k) {
        setH(it.b, it.h * ease(seg(t, 7.4 + k * 0.2, 8.2 + k * 0.2)));
        setOpacity(it.lab, seg(t, 8.0 + k * 0.2, 8.4 + k * 0.2));
      });
      setOpacity(lim, seg(t, 10.4, 11.0));
      setOpacity(fin, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  var LCP_SCENES = [
    {
      title: '仿真里的理想电机',
      dur: 17,
      build: buildSceneProblem,
      cues: [
        { at: 0.3, s: '左边两个关节收到同一串来回跳的指令。仿真里的电机近乎**理想**，指令多猛都照做；真机电机力矩有上限，跟不上，还会发热。' },
        { at: 3.6, s: '所以仿真里训出的策略，容易学成 **bang-bang** 式的抖动。论文表 I：不加平滑的策略回报**最高**（28.87），动作抖动却有 **42.19**，是 LCP（3.21）的 13 倍。' },
        { at: 7.0, s: '常见补救一：**平滑奖励**，罚动作变化、关节速度、关节加速度、能耗。旋钮一多，权重就要和任务奖励仔细配平，换一台机器人往往得重新调。' },
        { at: 10.4, s: '补救二：在策略输出后面接**低通滤波**（上一期 OP3 就是这么做的）。每一步都来回跳的动作从左边流进去，出来就平了，可比原来的走势落后几步，也就是慢半拍；论文说它常会压抑探索，训出次优策略。' },
        { at: 13.4, s: '两种补救都藏在环境或信号链里，**不可微**，只能靠策略梯度采样去估。LCP 想要一个可微、几行代码就能接进现有框架的平滑目标。' }
      ]
    },
    {
      title: 'Lipschitz：给斜率设上限',
      dur: 17,
      build: buildSceneLipschitz,
      cues: [
        { at: 0.3, s: '两条玩具策略看同一个微微晃动的输入：左边平缓，右边满是褶皱。平缓的那条输出几乎不动，褶皱的那条晃得很凶。' },
        { at: 3.6, s: '**Lipschitz 常数** $K$ 就是这个放大倍数的上限：输入晃一点，输出最多晃 $K$ 倍。图 2 的画法：在曲线上任一点放一个斜率 $\\pm K$ 的圆锥，整条曲线都装得下。' },
        { at: 7.0, s: '真机量级的观测噪声 0.045：$K = 5$ 的策略动作最多晃 0.225，这段轨迹上实测 **' + fmt(TOY.jit, 3) + '**（玩具，不能和论文比）。' },
        { at: 10.4, s: '斜率处处不超过 $K$，函数就是 $K$-Lipschitz 的（式 2）。所以「平滑」可以换个说法：**斜率小**。' },
        { at: 13.4, s: '动机实验（图 3）：只加平滑奖励、没专门去管梯度，训出的策略**梯度范数就明显更小**。那就直接去约束策略的梯度。' }
      ]
    },
    {
      title: '从「别太陡」到「陡了就罚」',
      dur: 17,
      build: buildSceneDerive,
      cues: [
        { at: 0.3, s: '最直接的写法（式 4）：在**每一个**状态上，斜率都不许超过 $K$。可状态有无穷多个，检查不完。' },
        { at: 3.6, s: '退一步（式 5，借 TRPO 的办法）：只看 rollout 真走到过的状态，取**平均**。玩具策略上最大斜率 5，平均只有 **' + fmt(TOY.rmsSlope, 2) + '** —— 只管走得到的地方。' },
        { at: 7.0, s: '再把「不许超过」换成「超过就罚」（式 6，拉格朗日乘子）：越陡罚得越多，罚款随斜率的平方涨。' },
        { at: 10.4, s: '最后一步（式 7）：罚款的单价不去学，固定成手调的系数，论文所有实验都是 **0.002**。这一项就叫**梯度惩罚**（GP）。' },
        { at: 13.4, s: '训练成了一场拔河：回报想让策略更灵敏，GP 想让它更平滑，$J(\\pi) - \\lambda_{gp}\\,\\mathbb{E}\\lVert\\nabla_s\\log\\pi(a \\mid s)\\rVert^2$ 停在哪儿，就是训出来的平滑程度。GP 可微，能和 PPO 的损失一起反向传播。' }
      ]
    },
    {
      title: '罚的到底是什么：均值的斜率',
      dur: 17,
      build: buildSceneLogPi,
      cues: [
        { at: 0.3, s: 'GP 罚的不是动作本身，是**采到的那个动作的概率**随状态变得多快。PPO 的策略给每个状态一个钟形分布，中心是网络输出的均值。' },
        { at: 3.6, s: '状态一晃，钟形就沿着均值线滑动，那个动作的概率跟着变。均值线平缓（左），概率几乎不动；均值线陡（右），概率忽高忽低，罚得就重。' },
        { at: 7.0, s: '钟形变窄（探索噪声减半）时，同样的滑动让概率变得更剧烈：同一条均值线，罚 **4 倍**。' },
        { at: 10.4, s: '训练时每个状态只有 rollout 里那**一个**动作，单个样本的估计很吵：两维算例里一个样本 6.31，样本多了平均才收敛到 **7.5**（' + GAUSS_N + ' 个样本平均 ' + fmt(GAUSS.mean, 2) + '）。' },
        { at: 13.4, s: '结论：罚的其实是**均值的斜率**，探索噪声越小罚得越重。这一步是我们按式 7 推的，论文没写。' }
      ]
    },
    {
      title: '几行代码接进 PPO',
      dur: 17,
      build: buildSceneCode,
      cues: [
        { at: 0.3, s: '官方代码基于 legged_gym + rsl_rl，改动全在 PPO 的 `update()` 里：一批观测前向一遍，得到这批动作的 `log_prob`。' },
        { at: 3.6, s: '再用 `torch.autograd.grad` 对观测求一次导，信号流回每一格观测；`create_graph=True` 让这个梯度还能再反向传播。平方、求和、取平均，就是 GP。' },
        { at: 7.0, s: '乘 0.002 叠到 PPO 的损失上：一次反向传播、一次 Adam 更新，别的都不用动。' },
        { at: 10.4, s: 'MimicKit 也有 `LCPAgent`：继承 `PPOAgent`，配置只比 DeepMimic 的 G1 PPO 配置多一行 `lcp_weight: 0.002`，任务是动作跟踪，不是论文的速度行走。' },
        { at: 13.4, s: '别搞反：MimicKit 里**所有**智能体默认都用 SGD，这不是 LCP 的要求；论文官方代码用的是 Adam。' }
      ]
    },
    {
      title: '观测、ROA 与「罚整段输入」',
      dur: 17,
      build: buildSceneObs,
      cues: [
        { at: 0.3, s: '策略看的不只是这一刻。当前的本体感受 **71** 维：步态相位、速度命令、关节位置和速度、上一步动作等（按 GR1 的公开代码数）。' },
        { at: 3.6, s: '再加只在仿真里有的特权信息 **50** 维，和最近 10 步的历史 **710** 维，一共 **831** 维。' },
        { at: 7.0, s: '上真机靠 **ROA**（附录 A）：训练时把特权编码和历史估计互相拉近，部署时只用历史估计。' },
        { at: 10.4, s: 'GP 罚哪些输入？表 I(c)：只罚当前观测，历史一变动作照样会跳，抖动 **7.16**；罚整段输入，**3.21**。' },
        { at: 13.4, s: '部署时特权信息拿不到、换成历史估计，这条通路也得平滑 —— 这句是我们的理解。' }
      ]
    },
    {
      title: '命令、奖励与课程',
      dur: 17,
      build: buildSceneReward,
      cues: [
        { at: 0.3, s: '任务是跟着速度命令走：前进、横移、转向，每 **150** 步（3 秒）换一次命令；控制 50 Hz，一回合 500 步、10 秒。' },
        { at: 3.6, s: '奖励三类：步态风格、速度跟踪、正则（附录表 IV 八项）。罚动作变化率、关节加速度的平滑项**拿掉了** —— 那部分交给 GP。' },
        { at: 7.0, s: '附录 B 的课程：负的奖励项乘一个系数，从 0.8 起；回合太短（不到 50 步）就减轻，站得住（超过 400 步）就加重，上限 2.0。' },
        { at: 10.4, s: '先轻罚，让它敢探索；站稳了再加重正则。从 0.8 涨到 2.0，要连乘 **' + S7_STEPS + '** 次 1.0001。' },
        { at: 13.4, s: '公开代码和论文有出入：GR1 的命令区间是 0–0.6 m/s，课程从 1.0 起、阈值 420 步，各机器人还不一样。下面的数字以论文为准。' }
      ]
    },
    {
      title: '三种平滑办法：表 I(a)',
      dur: 17,
      build: buildSceneCompare,
      cues: [
        { at: 0.3, s: '怎么量「抖」：动作变化率是动作对时间的**一阶导**；动作抖动、关节位置抖动是**三阶导**（jerk）；再加关节速度、能耗、机身加速度。每种设置 3 个种子、1000 个环境、各跑 500 步。' },
        { at: 3.6, s: '图 4：训练全程，LCP 的动作变化率、关节加速度、关节速度、能耗都和平滑奖励的策略差不多，远低于不平滑的 —— 而它从没被这些指标直接奖励过。' },
        { at: 7.0, s: '表 I(a) 的动作抖动：LCP **3.21**，平滑奖励 5.74，低通 7.86，不平滑 42.19；能耗 24.57 对 42.68，少了 42%。' },
        { at: 10.4, s: '任务回报：不平滑最高 **28.87**，平滑奖励 26.56，LCP 26.03，低通最低 24.98。LCP 只比不平滑低 9.8%。' },
        { at: 13.4, s: '论文的读法：LCP 能替代平滑奖励，任务表现相近；低通回报偏低，可能是滤波带来的阻尼压抑了探索；不平滑回报虽高，抖得不能上真机。' }
      ]
    },
    {
      title: '$\\lambda_{gp}$ 扫一遍：表 I(b)',
      dur: 17,
      build: buildSceneLambda,
      cues: [
        { at: 0.3, s: '表 I(b) 只拧一个旋钮 $\\lambda_{gp}$。拧到 0 就是不平滑：右下的动作来回跳，抖动 42.19、回报 28.87。' },
        { at: 3.6, s: '只拧到 **0.001**，抖动就掉到 3.69，降了 **91%**；回报 26.32，只少 8.8%。可论文说这一档仍可能出现上真机危险的抖动。' },
        { at: 7.0, s: '**0.002** 是论文选的：抖动 3.21、回报 26.03。再到 0.005：抖动 2.10、回报 23.92，动作开始变慢。' },
        { at: 10.4, s: '**0.01** 压过头：抖动只剩 0.17，关节速度从 10.65 掉到 2.75，动作又平又慢、跟不上，回报 16.11，比 0 低 **44%**；图 6 里它也学得更慢。' },
        { at: 13.4, s: '结论：和别的平滑办法一样，$\\lambda_{gp}$ 也要调；论文的实验里 **0.002** 在平滑和任务之间平衡得最好，四台真机都用它。' }
      ]
    },
    {
      title: '四台真机与局限',
      dur: 17,
      build: buildSceneReal,
      cues: [
        { at: 0.3, s: '四台人形：Fourier GR1T1 和 GR1T2 结构相同，21 个关节，脚踝横滚力矩太小、当被动关节，实际控制 19 个；Unitree H1 19 个关节全主动；Berkeley Humanoid 高 0.85 m、12 个自由度。' },
        { at: 3.6, s: '上真机前先在 MuJoCo 里做 sim-to-sim（表 II）：任务回报 GR1 24.33、H1 21.74、Berkeley 26.50。论文说全尺寸的两台比 Isaac Gym 里略降，大机器人的域差距更大。' },
        { at: 7.0, s: '真机（表 III）：同样的奖励、$\\lambda_{gp} = 0.002$，每台 3 个模型、各跑 10 s。平地、软地、粗糙地面上动作抖动基本不变：GR1 1.12–1.18，H1 1.11–1.20，最多涨 **8%**。' },
        { at: 10.4, s: '外力推搡也能恢复（补充视频）。局限：论文只验证了**基础行走**，跑、跳这类更动态的技能还没试；$\\lambda_{gp}$ 仍要调。' },
        { at: 13.4, s: '一句话：把「平滑」从调奖励、加滤波，换成对策略本身的一个**可微约束** —— 几行代码，四台机器人共用一个系数。仿真、部署代码和检查点都开源了。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十幕动画：LCP 全流程速览',
      sub: '约 170 秒自动播放。空格播放/暂停，← → 换幕；表格数字照抄论文，玩具算例与下面三个演示、笔记「具体实例」用的是同一份数。',
      ariaLabel: 'LCP 十幕讲解动画',
      notes: [
        '取数依据：第 1、8、9、10 幕的数字照抄论文表 I–III（arXiv 2410.11825 v3）；第 3 幕的式 4–7、第 6 幕的式 8 与 $\\lambda = 0.1$、第 7 幕的课程与表 IV 照抄正文和附录 A–C；' +
          '第 5 幕的代码与超参数摘自官方仓库 `rsl_rl/algorithms/ppo_rma.py`、`humanoid_config.py`、`gr1_walk_phase_config.py`，MimicKit 一行摘自 `lcp_agent.py` 与 `lcp_g1_agent.yaml`；第 6 幕的 71 / 50 / 710 / 831 维按 GR1 配置逐项相加；第 7 幕的 9164 次是现算的。',
        '**玩具与示意**：第 2、3 幕的一维策略 $\\pi(o) = o + b\\sin(\\omega o)$（平缓的那条最大斜率 1.5）与第 4 幕的两维高斯算例是玩具，第 4 幕的推导 $\\mathbb{E}\\lVert\\nabla_s\\log\\pi\\rVert^2 = \\lVert J\\rVert_F^2/\\sigma^2$ 是我们推的；第 1 幕的两个关节与电机曲线、低通滤波那一格的输入（滤波系数照上一期 OP3 的 0.8 / 0.2 逐步算）、第 4 幕的钟形与概率表、第 9 幕右下的动作曲线是示意（只表达谁抖、谁慢，幅度不对应论文数值）；第 2 幕的图 3、第 8 幕的图 4 是按论文图的走势画的示意（论文图 3 没有纵轴数值）；第 7、10 幕的小人是示意。'
      ],
      scenes: LCP_SCENES
    });
  }

  // ─── the narrated vertical video of the same ten scenes ─────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：LCP 十幕全流程',
      sub: '9 分 56 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '11.3 MB',
      fileName: 'LCP_讲解视频.mp4'
    });
  }

  K.mount({
    'lcp-explainer': buildExplainerDemo,
    'lcp-video': buildVideoDemo,
    'lcp-sensitivity': buildSensitivityDemo,
    'lcp-gp': buildGpDemo,
    'lcp-table': buildTableDemo
  });
})();
