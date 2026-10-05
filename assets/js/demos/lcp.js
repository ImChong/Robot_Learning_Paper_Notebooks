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

  /* ── scene 1: 仿真里的理想电机 ── */
  /* 示意的「bang-bang」关节目标：在 ±0.8 之间来回跳，跟一条慢正弦叠在一起；平滑的那条只是慢正弦 */
  var S1_STEPS = 60;
  var S1_TRACE = (function () {
    var rng = mulberry32(3), jag = [], smooth = [];
    for (var t = 0; t < S1_STEPS; t++) {
      var base = 0.45 * Math.sin(t * 0.16);
      smooth.push(base);
      jag.push(base + (rng() < 0.5 ? -1 : 1) * (0.35 + 0.35 * rng()));
    }
    return { jag: jag, smooth: smooth };
  })();

  function buildSceneProblem() {
    var s = sceneSvg('仿真把电机建得近乎理想，强化学习策略容易学成 bang-bang 式的抖动；表 I 里不加平滑的策略任务回报最高 28.87，动作抖动 42.19，是 LCP 的 13 倍；常见补救是平滑奖励和低通滤波，前者权重多、要逐台调，后者常压抑探索，两者都不可微');
    s.appendChild(svgText(30, 28, '仿真里电机想给多大力矩就给多大 → 策略学成 bang-bang 式的抖动', 'demo-x-ink2', 13.5));

    var trace = group(s);
    rectBox(trace, 30, 44, 360, 170, C_BORDER, C_SURFACE2);
    trace.appendChild(svgText(42, 64, '相邻控制步的关节目标（示意）', 'demo-x-mut', 10.5));
    function tx(t) { return 48 + (t / (S1_STEPS - 1)) * 326; }
    function ty(v) { return 132 - v * 62; }
    trace.appendChild(paint(svgEl('line', { x1: 48, y1: 132, x2: 374, y2: 132, 'stroke-width': 1 }), null, C_BORDER));
    var smoothLn = pathLine(trace, S1_TRACE.smooth.map(function (v, t) { return [tx(t), ty(v)]; }), C_GOOD, 2.2, '5 4');
    var jagLn = pathLine(trace, S1_TRACE.jag.map(function (v, t) { return [tx(t), ty(v)]; }), C_BAD, 1.6);
    var traceTags = group(trace);
    traceTags.appendChild(svgText(372, 204, '红：抖动　绿虚线：平滑', 'demo-x-mut', 10, 'end'));

    var mk = K.arrowMarker(s, 'lcp-x-arrow-s1', C_MUTED);
    var simBox = group(s);
    rectBox(simBox, 420, 44, 350, 76, C_GOOD);
    simBox.appendChild(svgText(436, 68, '仿真：理想电机', null, 12.5));
    simBox.appendChild(svgText(436, 90, '指令怎么跳都照单全收，不扣分', 'demo-x-ink2', 11));
    simBox.appendChild(svgRich(436, 110, '表 I：不平滑的策略任务回报**最高 28.87**', { size: 11, w: 320, cls: 'demo-x-good' }));
    arrowPath(simBox, [[392, 100], [416, 84]], C_MUTED, mk);
    var realBox = group(s);
    rectBox(realBox, 420, 134, 350, 80, C_BAD);
    realBox.appendChild(svgText(436, 158, '真机：带宽、延迟、力矩上限', null, 12.5));
    realBox.appendChild(svgText(436, 180, '相邻两步差太多 → 要的力矩打不出来', 'demo-x-ink2', 11));
    realBox.appendChild(svgRich(436, 201, '动作抖动 **42.19**，是 LCP（3.21）的 **13 倍**', { size: 11, w: 320, cls: 'demo-x-bad' }));
    arrowPath(realBox, [[392, 150], [416, 168]], C_MUTED, mk);

    function remedy(x, head, l1, l2, l3) {
      var g = group(s);
      rectBox(g, x, 232, 360, 96, C_WARN, C_SURFACE, '4 3');
      g.appendChild(svgText(x + 14, 254, head, 'demo-x-warn', 12.5));
      g.appendChild(svgRich(x + 14, 276, l1, { size: 11, w: 340, cls: 'demo-x-ink2' }));
      g.appendChild(svgRich(x + 14, 296, l2, { size: 11, w: 340, cls: 'demo-x-ink2' }));
      g.appendChild(svgRich(x + 14, 316, l3, { size: 11, w: 340, cls: 'demo-x-mut' }));
      return g;
    }
    var rew = remedy(30, '补救一：平滑奖励', '罚动作变化、关节速度、关节加速度、能耗', '一堆权重要和任务奖励配平', '换一台机器人，往往就得重调');
    var lpf = remedy(410, '补救二：输出端低通滤波', '上一期 OP3：$u_t = 0.8\\,u_{t-1} + 0.2\\,a_t$', '论文：常会压抑探索，训出次优策略', '滤波器参数同样要按机器人调');
    var nd = group(s);
    chip(nd, 30, 340, 740, '两者都**不可微**：藏在环境或信号链里，只能靠策略梯度采样去估', C_BAD, { h: 28, size: 11.5 });
    var fin = group(s);
    chip(fin, 30, 376, 740, 'LCP：一个**可微**的平滑目标，几行代码加进现有的强化学习框架', C_ACCENT, { h: 34, size: 12.5 });

    function draw(t) {
      setOpacity(trace, seg(t, 0.3, 0.9));
      drawOn(jagLn, ease(seg(t, 0.6, 3.0)));
      drawOn(smoothLn, ease(seg(t, 1.0, 3.2)));
      setOpacity(traceTags, seg(t, 2.6, 3.2));
      setOpacity(simBox, seg(t, 1.2, 1.8));
      setOpacity(realBox, seg(t, 3.6, 4.2));
      setOpacity(rew, seg(t, 7.0, 7.6));
      setOpacity(lpf, seg(t, 10.4, 11.0));
      setOpacity(nd, seg(t, 13.4, 14.0));
      setOpacity(fin, seg(t, 14.6, 15.2));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: Lipschitz 与梯度 ── */
  function buildSceneLipschitz() {
    var s = sceneSvg('Lipschitz 连续：任意两点输出之差不超过 K 乘输入之差；以曲线上任一点为顶点画斜率正负 K 的圆锥，整条曲线都在圆锥里；玩具策略最大斜率 K 等于 5，噪声 0.045 时动作最多抖 0.225，实测 0.142；梯度有界则 Lipschitz 连续，反之不成立；图 3：加了平滑奖励的策略梯度更小');
    s.appendChild(svgText(30, 28, 'Lipschitz 连续：给函数的变化率设一个上限 K', 'demo-x-ink2', 13.5));

    var LX0 = 50, LX1 = 370, LY0 = 290, LY1 = 70;
    function lx(o) { return LX0 + ((o + 1.2) / 2.4) * (LX1 - LX0); }
    function ly(a) { return LY0 - ((clamp(a, -2.4, 2.4) + 2.4) / 4.8) * (LY0 - LY1); }
    var left = group(s);
    rectBox(left, 30, 44, 360, 266, C_BORDER, C_SURFACE2);
    left.appendChild(svgRich(42, 62, '玩具策略 $\\pi(o) = o + b\\sin(\\omega o)$，最大斜率 $K = 5$', { size: 10.5, w: 340, cls: 'demo-x-mut' }));
    left.appendChild(paint(svgEl('line', { x1: LX0, y1: ly(0), x2: LX1, y2: ly(0), 'stroke-width': 1 }), null, C_BORDER));
    var cone = paint(svgEl('path', { d: '', 'fill-opacity': 0.13, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }), C_ACCENT, C_ACCENT);
    left.appendChild(cone);
    var curve = [];
    for (var i = 0; i <= 240; i++) {
      var o = -1.2 + (2.4 * i) / 240;
      curve.push([lx(o), ly(TOY.pi(o))]);
    }
    pathLine(left, curve, C_GOOD, 2.4);
    var vtx = paint(svgEl('circle', { r: 5, 'stroke-width': 1.6 }), C_ACCENT, C_SURFACE2);
    left.appendChild(vtx);
    var coneTag = svgRich(LX1 - 4, LY1 + 6, '斜率 $\\pm K$ 的圆锥（图 2）', { size: 10.5, anchor: 'end', w: 180 }).setTone(C_ACCENT);
    left.appendChild(coneTag);

    var def = group(s);
    rectBox(def, 410, 44, 360, 64, C_ACCENT);
    def.appendChild(svgText(424, 64, '定义（式 1）', 'demo-x-acc', 11));
    def.appendChild(svgMath(590, 90, 'd_Y\\big(f(x_1), f(x_2)\\big) \\le K\\, d_X(x_1, x_2)', { size: 13, anchor: 'middle', w: 340 }));

    var nums = group(s);
    readoutChip(nums, 500, 122, 176, '最大斜率 $K$', fmt(TOY_K, 0), C_GOOD);
    readoutChip(nums, 684, 122, 172, '观测噪声 $\\sigma$', fmt(TOY_SIGMA, 3), C_MUTED);
    readoutChip(nums, 500, 160, 176, '上界 $K\\sigma$', fmt(TOY_K * TOY_SIGMA, 3), C_ACCENT);
    readoutChip(nums, 684, 160, 172, '实测抖动 std', fmt(TOY.jit, 3), C_BAD);

    var cor = group(s);
    rectBox(cor, 410, 202, 360, 62, C_BORDER);
    cor.appendChild(svgRich(424, 224, '推论（式 2）：$\\lVert\\nabla_x f(x)\\rVert \\le K \\;\\Rightarrow\\;$ $K$-Lipschitz', { size: 11.5, w: 340 }));
    cor.appendChild(svgRich(424, 248, '反过来不成立：$|x|$ 在 0 处不可导，却是 1-Lipschitz', { size: 10.5, w: 340, cls: 'demo-x-mut' }));

    var fig3 = group(s);
    rectBox(fig3, 410, 276, 360, 100, C_BORDER, C_SURFACE2);
    fig3.appendChild(svgText(422, 294, '图 3（示意）：策略梯度范数 vs 训练迭代', 'demo-x-mut', 10.5));
    var f3rng = mulberry32(17), hiPts = [], loPts = [];
    for (var k = 0; k <= 60; k++) {
      var fx = 424 + k * 5.5;
      var spike = k > 14 && f3rng() < 0.12 ? 14 * f3rng() : 0;
      hiPts.push([fx, 330 - 10 * (1 - Math.exp(-k / 8)) - 6 * f3rng() - spike]);
      loPts.push([fx, 352 - 4 * (1 - Math.exp(-k / 8)) - 2 * f3rng()]);
    }
    var hiLn = pathLine(fig3, hiPts, C_WARN, 1.6);
    var loLn = pathLine(fig3, loPts, C_BAD, 1.8);
    fig3.appendChild(svgText(426, 312, '不加平滑奖励', 'demo-x-warn', 10));
    fig3.appendChild(svgText(762, 370, '加平滑奖励：梯度小得多', 'demo-x-bad', 10, 'end'));

    var fin = group(s);
    chip(fin, 30, 384, 740, '平滑 ≈ 斜率小 ⇒ 直接去约束策略的梯度', C_ACCENT, { h: 30, size: 12 });

    function coneAt(o0) {
      var a0 = TOY.pi(o0);
      var pts = [[lx(-1.2), ly(a0 - TOY_K * (o0 + 1.2))], [lx(o0), ly(a0)], [lx(1.2), ly(a0 + TOY_K * (1.2 - o0))],
        [lx(1.2), ly(a0 - TOY_K * (1.2 - o0))], [lx(o0), ly(a0)], [lx(-1.2), ly(a0 + TOY_K * (o0 + 1.2))]];
      cone.setAttribute('d', polyPath(pts.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })) + ' Z');
      vtx.setAttribute('cx', lx(o0).toFixed(1));
      vtx.setAttribute('cy', ly(a0).toFixed(1));
    }

    function draw(t) {
      setOpacity(left, seg(t, 0.3, 0.9));
      setOpacity(def, seg(t, 0.8, 1.4));
      var u = seg(t, 3.6, 7.0);
      coneAt(-0.9 + 1.8 * ease(u));
      setOpacity(cone, seg(t, 3.6, 4.0));
      setOpacity(vtx, seg(t, 3.6, 4.0));
      setOpacity(coneTag, seg(t, 3.8, 4.4));
      setOpacity(nums, seg(t, 7.0, 7.6));
      setOpacity(cor, seg(t, 10.4, 11.0));
      setOpacity(fig3, seg(t, 13.4, 13.9));
      drawOn(hiLn, ease(seg(t, 13.6, 15.0)));
      drawOn(loLn, ease(seg(t, 13.8, 15.2)));
      setOpacity(fin, seg(t, 15.4, 16.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 式 4 → 式 7 ── */
  function buildSceneDerive() {
    var s = sceneSvg('式 4 要求所有状态动作上的梯度都不超过 K 平方；式 5 换成 rollout 数据上的期望；式 6 引入拉格朗日乘子；式 7 固定系数 lambda gp 并丢掉常数 K 平方，得到梯度惩罚；玩具策略最大斜率 5，访问到的状态上的均方根斜率 2.75');
    s.appendChild(svgText(30, 28, '从约束到梯度惩罚：四步推到式 7', 'demo-x-ink2', 13.5));

    var rows = [
      { y: 44, no: '式 4', tex: '\\max_\\pi J(\\pi)\\;\\; \\text{s.t.}\\;\\max_{s,a}\\lVert\\nabla_s\\log\\pi(a\\mid s)\\rVert^2 \\le K^2', note: '所有状态上的最大值：算不出来', tone: C_BAD },
      { y: 112, no: '式 5', tex: '\\max_\\pi J(\\pi)\\;\\; \\text{s.t.}\\;\\mathbb{E}_{s,a\\sim\\mathcal{D}}\\lVert\\nabla_s\\log\\pi(a\\mid s)\\rVert^2 \\le K^2', note: '换成 rollout 数据上的期望（TRPO 的近似）', tone: C_WARN },
      { y: 180, no: '式 6', tex: '\\min_{\\lambda\\ge 0}\\max_\\pi J(\\pi) - \\lambda\\big(\\mathbb{E}\\lVert\\nabla_s\\log\\pi\\rVert^2 - K^2\\big)', note: '拉格朗日乘子：约束搬进目标', tone: C_ACCENT },
      { y: 248, no: '式 7', tex: '\\max_\\pi J(\\pi) - \\lambda_{gp}\\,\\mathbb{E}_{s,a\\sim\\mathcal{D}}\\lVert\\nabla_s\\log\\pi(a\\mid s)\\rVert^2', note: '$\\lambda$ 固定成手调的 $\\lambda_{gp}$，丢掉常数 $K^2$', tone: C_GOOD }
    ];
    var mk = K.arrowMarker(s, 'lcp-x-arrow-s3', C_MUTED);
    var rowEls = rows.map(function (r, i) {
      var g = group(s);
      rectBox(g, 30, r.y, 520, 56, r.tone, C_SURFACE, i === 3 ? null : '4 3');
      g.appendChild(paint(svgText(44, r.y + 20, r.no, 'demo-x-mono', 11), r.tone));
      g.appendChild(svgMath(300, r.y + 26, r.tex, { size: 12, anchor: 'middle', w: 480 }));
      g.appendChild(svgRich(290, r.y + 48, r.note, { size: 10.5, anchor: 'middle', w: 480, cls: 'demo-x-mut' }));
      if (i > 0) arrowPath(g, [[290, r.y - 11], [290, r.y - 1]], C_MUTED, mk);
      return g;
    });

    /* 右：玩具策略上「最大斜率」与「访问到的状态上的均方根斜率」 */
    var side = group(s);
    rectBox(side, 570, 44, 200, 262, C_BORDER, C_SURFACE2);
    side.appendChild(svgText(670, 66, '玩具策略上（同第 2 幕）', 'demo-x-mut', 10.5, 'middle'));
    var BASE = 270, HSC = 36;
    var barMax = vbar(side, 600, BASE, 52, C_BAD);
    var barRms = vbar(side, 688, BASE, 52, C_WARN);
    side.appendChild(paint(svgEl('line', { x1: 588, y1: BASE, x2: 752, y2: BASE, 'stroke-width': 1 }), null, C_BORDER));
    side.appendChild(svgText(626, 288, '最大斜率', 'demo-x-ink2', 10.5, 'middle'));
    side.appendChild(svgText(714, 288, '均方根斜率', 'demo-x-ink2', 10.5, 'middle'));
    var vMax = paint(svgText(626, BASE - TOY_K * HSC - 8, fmt(TOY_K, 2), 'demo-x-mono', 11.5, 'middle'), C_BAD);
    var vRms = paint(svgText(714, BASE - TOY.rmsSlope * HSC - 8, fmt(TOY.rmsSlope, 2), 'demo-x-mono', 11.5, 'middle'), C_WARN);
    side.appendChild(vMax);
    side.appendChild(vRms);
    side.appendChild(svgText(670, 300, '期望只管走得到的状态', 'demo-x-mut', 10, 'middle'));

    var fin = group(s);
    chip(fin, 30, 322, 740, '可微：和 PPO 的损失一起反向传播 · 论文所有实验 $\\lambda_{gp} = 0.002$', C_GOOD, { h: 32, size: 12 });
    var vs = group(s);
    chip(vs, 30, 366, 740, '平滑奖励藏在环境里，只能靠策略梯度采样去估；GP 直接对策略参数求导', C_BORDER, { h: 30, size: 11.5 });

    function draw(t) {
      setOpacity(rowEls[0], seg(t, 0.3, 0.9));
      setOpacity(rowEls[1], seg(t, 3.6, 4.2));
      setOpacity(side, seg(t, 4.2, 4.8));
      setH(barMax, TOY_K * HSC * ease(seg(t, 4.6, 5.6)));
      setH(barRms, TOY.rmsSlope * HSC * ease(seg(t, 5.4, 6.4)));
      setOpacity(vMax, seg(t, 5.4, 5.8));
      setOpacity(vRms, seg(t, 6.2, 6.6));
      setOpacity(rowEls[2], seg(t, 7.0, 7.6));
      setOpacity(rowEls[3], seg(t, 10.4, 11.0));
      setOpacity(fin, seg(t, 13.4, 14.0));
      setOpacity(vs, seg(t, 14.6, 15.2));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 罚的是 log π 的梯度 ── */
  function buildSceneLogPi() {
    var s = sceneSvg('高斯策略的 log 概率对状态求导等于雅可比转置乘动作偏差除以方差；对动作取期望等于雅可比的 Frobenius 范数平方除以方差；J 取 0.8、0.2、负 0.4、0.6，sigma 0.4 时期望 7.5；第一个样本 a 减 mu 等于 0.4、负 0.2，梯度 2.5、负 0.25，平方和 6.31；sigma 减半期望变成 30');
    s.appendChild(svgText(30, 28, '式 7 罚的是 log π 对状态的梯度：在高斯策略上它等于什么', 'demo-x-ink2', 13.5));

    var form = group(s);
    rectBox(form, 30, 44, 470, 106, C_ACCENT);
    form.appendChild(svgRich(44, 64, 'PPO 的高斯策略 $a \\sim \\mathcal{N}(\\mu_\\theta(s), \\sigma^2 I)$，$J = \\partial\\mu/\\partial s$', { size: 11, w: 450, cls: 'demo-x-ink2' }));
    form.appendChild(svgMath(140, 104, '\\nabla_s\\log\\pi = \\dfrac{J^\\top (a-\\mu)}{\\sigma^2}', { size: 13, anchor: 'middle', w: 220, h: 50 }));
    var expF = group(form);
    expF.appendChild(svgText(262, 100, '对 a 取期望 →', 'demo-x-mut', 10.5, 'middle'));
    expF.appendChild(svgMath(395, 104, '\\mathbb{E}_a\\lVert\\nabla_s\\log\\pi\\rVert^2 = \\dfrac{\\lVert J\\rVert_F^2}{\\sigma^2}', { size: 13, anchor: 'middle', w: 200, h: 50 }).setTone(C_GOOD));
    var ours = group(s);
    ours.appendChild(svgText(490, 142, '这一步是我们推的，论文没写', 'demo-x-mut', 10, 'end'));

    var ex = group(s);
    rectBox(ex, 30, 160, 470, 92, C_BORDER, C_SURFACE2);
    ex.appendChild(svgMath(130, 206, 'J = \\begin{bmatrix} 0.8 & 0.2 \\\\ -0.4 & 0.6 \\end{bmatrix}', { size: 12, anchor: 'middle', w: 190, h: 60 }));
    ex.appendChild(svgRich(240, 186, '$\\lVert J\\rVert_F^2 = 0.64 + 0.04 + 0.16 + 0.36 = $ **1.20**', { size: 11, w: 255 }));
    ex.appendChild(svgRich(240, 210, '$\\sigma = 0.4$：期望 $= 1.20 / 0.16 = $ **7.5**', { size: 11, w: 255 }));
    ex.appendChild(svgRich(240, 234, '$\\sigma = 0.2$：期望 $= 1.20 / 0.04 = $ **30**', { size: 11, w: 255, cls: 'demo-x-mut' }));
    var halfTag = group(ex);
    halfTag.appendChild(svgText(494, 247, '探索噪声越小，同样的斜率罚得越重', 'demo-x-warn', 10, 'end'));

    var one = group(s);
    rectBox(one, 30, 264, 470, 62, C_WARN);
    one.appendChild(svgRich(44, 286, '一个样本 $a - \\mu = (0.4, -0.2)$：梯度 $= (2.5,\\, -0.25)$', { size: 11, w: 450 }));
    one.appendChild(svgRich(44, 310, '平方和 $= 6.25 + 0.0625 =$ **6.31**，不等于 7.5', { size: 11, w: 450, cls: 'demo-x-warn' }));

    /* 右：动作平面 + 样本平均 */
    var PX = 640, PY = 110, PU = 60;
    var plane = group(s);
    rectBox(plane, 520, 44, 250, 132, C_BORDER, C_SURFACE2);
    plane.appendChild(svgRich(532, 62, '动作平面：$a - \\mu$', { size: 10.5, w: 200, cls: 'demo-x-mut' }));
    [1, 2].forEach(function (k) {
      plane.appendChild(paint(svgEl('circle', { cx: PX, cy: PY + 4, r: PU * GAUSS_SIGMA * k * 0.75, fill: 'none', 'stroke-width': 1.1, 'stroke-dasharray': '4 3', opacity: k === 1 ? 0.9 : 0.45 }), null, C_ACCENT));
    });
    var dots = GAUSS.s.devs.slice(1, 80).map(function (d) {
      var c = paint(svgEl('circle', { cx: (PX + d[0] * PU * 0.75).toFixed(1), cy: (PY + 4 - d[1] * PU * 0.75).toFixed(1), r: 1.8 }), C_GOOD);
      c.style.opacity = 0;
      plane.appendChild(c);
      return c;
    });
    var d0 = GAUSS.s.devs[0];
    var firstArrow = group(plane);
    pathLine(firstArrow, [[PX, PY + 4], [PX + d0[0] * PU * 0.75, PY + 4 - d0[1] * PU * 0.75]], C_WARN, 2);
    firstArrow.appendChild(paint(svgEl('circle', { cx: PX + d0[0] * PU * 0.75, cy: PY + 4 - d0[1] * PU * 0.75, r: 4.2, 'stroke-width': 1.4 }), C_WARN, C_SURFACE2));
    plane.appendChild(paint(svgEl('circle', { cx: PX, cy: PY + 4, r: 3.5 }), C_ACCENT));

    var run = group(s);
    rectBox(run, 520, 188, 250, 138, C_BORDER, C_SURFACE2);
    run.appendChild(svgText(532, 206, '前 n 个样本的平均', 'demo-x-mut', 10.5));
    var RX0 = 540, RX1 = 756, RY0 = 306, RY1 = 218, RMAX = 15;
    function rx(n) { return RX0 + ((n - 1) / (GAUSS_N - 1)) * (RX1 - RX0); }
    function ry(v) { return RY0 - (clamp(v, 0, RMAX) / RMAX) * (RY0 - RY1); }
    run.appendChild(paint(svgEl('line', { x1: RX0, y1: RY0, x2: RX1, y2: RY0, 'stroke-width': 1 }), null, C_BORDER));
    run.appendChild(paint(svgEl('line', { x1: RX0, y1: ry(GAUSS.expect), x2: RX1, y2: ry(GAUSS.expect), 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }), null, C_BAD));
    run.appendChild(paint(svgText(RX1, ry(GAUSS.expect) - 5, '期望 ' + fmt(GAUSS.expect, 1), 'demo-x-mono', 10, 'end'), C_BAD));
    var runLn = pathLine(run, GAUSS.s.run.map(function (v, k) { return [rx(k + 1), ry(v)]; }), C_GOOD, 2);
    var runTag = paint(svgText(RX1, RY0 + 14, GAUSS_N + ' 个样本平均 ' + fmt(GAUSS.mean, 2), 'demo-x-mono', 10, 'end'), C_GOOD);
    run.appendChild(runTag);

    var fin = group(s);
    chip(fin, 30, 342, 740, 'GP 罚的是**均值对状态的斜率**，按 $1/\\sigma^2$ 加权；训练时每个状态只有一个动作，靠一个 minibatch 的平均来估', C_ACCENT, { h: 36, size: 11.5 });
    var tail = group(s);
    tail.appendChild(svgText(400, 404, '两维玩具算例；真实策略是 MLP，J 随状态变化', 'demo-x-mut', 10.5, 'middle'));

    function draw(t) {
      setOpacity(form, seg(t, 0.3, 0.9));
      setOpacity(expF, seg(t, 3.6, 4.2));
      setOpacity(ours, seg(t, 4.0, 4.6));
      setOpacity(ex, seg(t, 7.0, 7.6));
      setOpacity(halfTag, seg(t, 13.4, 14.0));
      setOpacity(plane, seg(t, 7.4, 8.0));
      setOpacity(firstArrow, seg(t, 10.4, 10.9));
      setOpacity(one, seg(t, 10.4, 11.0));
      var nDots = Math.floor(dots.length * ease(seg(t, 11.4, 13.0)));
      dots.forEach(function (c, k) { c.style.opacity = k < nDots ? 0.8 : 0; });
      setOpacity(run, seg(t, 11.0, 11.6));
      drawOn(runLn, ease(seg(t, 11.4, 13.2)));
      setOpacity(runTag, seg(t, 13.0, 13.4));
      setOpacity(fin, seg(t, 14.6, 15.2));
      setOpacity(tail, seg(t, 15.2, 15.8));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: 几行代码接进 PPO ── */
  function buildSceneCode() {
    var s = sceneSvg('官方代码在 rsl_rl 的 PPO update 里把观测设成需要梯度，autograd 求 log_prob 对观测的梯度，create_graph 为真，逐样本平方求和取平均；总损失是裁剪替代损失加价值损失减 0.01 倍熵加特权正则加 0.002 倍梯度惩罚，Adam 学习率 2e-4；MimicKit 的 LCPAgent 继承 PPOAgent，配置是 DeepMimic 的 G1 PPO 配置加一行 lcp_weight 0.002，SGD 是 MimicKit 全部智能体的默认');
    s.appendChild(svgText(30, 28, '几行代码接进 PPO：官方代码（rsl_rl 的 ppo_rma.py）', 'demo-x-ink2', 13.5));

    var code = group(s);
    rectBox(code, 30, 44, 470, 234, C_BORDER, C_SURFACE2);
    var lines = [
      { y: 66, s: 'obs_est_batch.requires_grad_()', tone: null, at: 0.3 },
      { y: 86, s: 'self.actor_critic.act(obs_est_batch, ...)', tone: null, at: 0.3 },
      { y: 106, s: 'log_prob = get_actions_log_prob(actions_batch)', tone: null, at: 0.3 },
      { y: 136, s: 'grad = torch.autograd.grad(log_prob.sum(),', tone: C_GOOD, at: 3.6 },
      { y: 154, s: '         obs_est_batch, create_graph=True)[0]', tone: C_GOOD, at: 3.6 },
      { y: 172, s: 'gp_loss = torch.sum(torch.square(grad),', tone: C_GOOD, at: 3.6 },
      { y: 190, s: '                    dim=-1).mean()', tone: C_GOOD, at: 3.6 },
      { y: 220, s: 'loss = surrogate + 1.0 * value_loss', tone: C_ACCENT, at: 7.0 },
      { y: 238, s: '     - 0.01 * entropy + priv_coef * priv_reg', tone: C_ACCENT, at: 7.0 },
      { y: 256, s: '     + gp_coef * gp_loss          # 0.002', tone: C_ACCENT, at: 7.0 }
    ].map(function (ln) {
      var tnode = paint(svgText(44, ln.y, ln.s, 'demo-x-mono', 10.5), ln.tone);
      tnode.setAttribute('xml:space', 'preserve');
      tnode.style.whiteSpace = 'pre';
      code.appendChild(tnode);
      return { node: tnode, at: ln.at };
    });

    var cfg = group(s);
    rectBox(cfg, 516, 44, 254, 234, C_ACCENT);
    cfg.appendChild(svgText(530, 64, '官方配置（GR1）', 'demo-x-acc', 11.5));
    [
      ['GP 系数表 [0.002, 0.002, 700, 1000]', 'demo-x-ink2'],
      ['首尾相同 → 全程恒为 0.002', 'demo-x-good'],
      ['Adam · 学习率 2e-4 · 按 KL 自适应', 'demo-x-ink2'],
      ['KL 目标 0.008 · 熵系数 0.01', 'demo-x-ink2'],
      ['5 个 epoch × 4 个 minibatch', 'demo-x-ink2'],
      ['4096 环境 × 24 步 = 98,304 样本/轮', 'demo-x-ink2'],
      ['一次反向传播、一次更新', 'demo-x-mut']
    ].forEach(function (r, k) {
      cfg.appendChild(svgText(530, 90 + k * 26, r[0], r[1], 10.8));
    });

    var mimic = group(s);
    rectBox(mimic, 30, 292, 740, 60, C_GOOD, C_SURFACE, '4 3');
    mimic.appendChild(svgRich(44, 314, 'MimicKit：`LCPAgent` 继承 `PPOAgent`，只重写 actor 损失（`lcp_agent.py` 不到 50 行）', { size: 11, w: 720 }));
    mimic.appendChild(svgRich(44, 338, '配置 = DeepMimic 的 G1 PPO 配置 + 一行 `lcp_weight: 0.002`；任务是动作跟踪，不是论文的速度行走', { size: 11, w: 720, cls: 'demo-x-ink2' }));
    var sgd = group(s);
    chip(sgd, 30, 366, 740, 'MimicKit 的 SGD、学习率 1e-4 是它**所有**智能体的默认，不是 LCP 的要求；论文官方代码用 Adam', C_WARN, { h: 34, size: 11.5 });

    function draw(t) {
      setOpacity(code, seg(t, 0.2, 0.7));
      lines.forEach(function (ln) { setOpacity(ln.node, seg(t, ln.at, ln.at + 0.5)); });
      setOpacity(cfg, seg(t, 7.6, 8.2));
      setOpacity(mimic, seg(t, 10.4, 11.0));
      setOpacity(sgd, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 观测、ROA 与「罚整段输入」 ── */
  function buildSceneObs() {
    var s = sceneSvg('GR1 公开代码的观测：当前本体 71 维，特权信息 50 维，最近 10 步历史 710 维，共 831 维；ROA 用编码器把特权信息压成潜向量，适应模块只看历史去估它，式 8 两项距离各对另一边停梯度，lambda 0.1；表 I(c)：只罚当前观测动作抖动 7.16，罚整段输入 3.21');
    s.appendChild(svgText(30, 28, '观测、ROA 与「GP 要罚整段输入」', 'demo-x-ink2', 13.5));

    var blocks = group(s);
    function block(x, w, head, val, lines, color, at) {
      var g = group(blocks);
      rectBox(g, x, 44, w, 108, color);
      g.appendChild(svgText(x + 12, 64, head, null, 12));
      g.appendChild(paint(svgText(x + w - 12, 64, val, 'demo-x-mono', 12, 'end'), color));
      lines.forEach(function (str, k) {
        g.appendChild(svgText(x + 12, 86 + k * 18, str, 'demo-x-ink2', 10.5));
      });
      g.at = at;
      return g;
    }
    var bProp = block(30, 260, '当前本体', String(N_PROPRIO), ['相位 2 · 命令 3 · 角速度 3 · 横滚俯仰 2', '关节位置 21 · 关节速度 21', '上一步动作 19'], C_ACCENT, 0.3);
    var bPriv = block(300, 210, '特权信息', String(N_PRIV), ['质量与质心 4 · 摩擦 1', '电机强度 42 · 机身线速度 3', '（只在仿真里拿得到）'], C_WARN, 3.6);
    var bHist = block(520, 250, '历史 10 步', String(OBS_GR1.hist * N_PROPRIO), ['最近 10 步的本体观测', '10 × 71', '给适应模块估特权信息用'], C_MUTED, 3.6);
    var total = group(s);
    total.appendChild(svgRich(400, 172, '按 GR1 的公开代码：$71 + 50 + 710 =$ **831 维**，进网络前按滑动均值、标准差归一化', { size: 11.5, anchor: 'middle', w: 740 }));

    var roa = group(s);
    rectBox(roa, 30, 188, 470, 130, C_BORDER, C_SURFACE2);
    roa.appendChild(svgText(44, 208, 'ROA（附录式 8）', 'demo-x-acc', 11.5));
    var mk = K.arrowMarker(s, 'lcp-x-arrow-s6', C_MUTED);
    roa.appendChild(svgRich(44, 234, '特权 $e$ → 编码器 $\\mu$ → $z_\\mu$', { size: 11, w: 200 }));
    roa.appendChild(svgRich(270, 234, '历史 → 适应模块 $\\phi$ → $z_\\phi$', { size: 11, w: 220 }));
    arrowPath(roa, [[150, 240], [150, 252]], C_MUTED, mk);
    arrowPath(roa, [[380, 240], [380, 252]], C_MUTED, mk);
    roa.appendChild(svgMath(265, 272, '-\\mathcal{L}_{PPO} + \\lambda\\lVert z_\\mu - \\mathrm{sg}[z_\\phi]\\rVert + \\lVert\\mathrm{sg}[z_\\mu] - z_\\phi\\rVert + \\lambda_{gp}\\mathcal{L}_{gp}', { size: 12, anchor: 'middle', w: 460 }));
    roa.appendChild(svgRich(265, 302, '$\\lambda = 0.1$，$\\lambda_{gp} = 0.002$；sg 是停梯度：两项各拉一边', { size: 10.5, anchor: 'middle', w: 460, cls: 'demo-x-mut' }));

    var abl = group(s);
    rectBox(abl, 516, 188, 254, 130, C_BORDER, C_SURFACE2);
    abl.appendChild(svgText(528, 208, '表 I(c)：GP 罚哪些输入', 'demo-x-ink2', 11));
    var BASE = 290, SC = 9;
    var bWhole = vbar(abl, 548, BASE, 48, C_GOOD);
    var bCur = vbar(abl, 660, BASE, 48, C_BAD);
    abl.appendChild(paint(svgEl('line', { x1: 530, y1: BASE, x2: 758, y2: BASE, 'stroke-width': 1 }), null, C_BORDER));
    abl.appendChild(svgText(572, 306, '整段输入', 'demo-x-ink2', 10.5, 'middle'));
    abl.appendChild(svgText(684, 306, '只罚当前观测', 'demo-x-ink2', 10.5, 'middle'));
    var vW = paint(svgText(572, BASE - 3.21 * SC - 6, '3.21', 'demo-x-mono', 11, 'middle'), C_GOOD);
    var vC = paint(svgText(684, BASE - 7.16 * SC - 6, '7.16', 'demo-x-mono', 11, 'middle'), C_BAD);
    abl.appendChild(vW);
    abl.appendChild(vC);
    abl.appendChild(svgText(758, 222, '动作抖动', 'demo-x-mut', 10, 'end'));

    var fin = group(s);
    chip(fin, 30, 332, 740, '只罚当前观测：历史一变，动作照样会跳 —— 动作抖动 7.16 对 3.21，关节位置抖动 0.35 对 0.17', C_BAD, { h: 32, size: 11.5 });
    var tail = group(s);
    chip(tail, 30, 374, 740, '部署时特权信息拿不到，换成历史估出的 $z_\\phi$，这条通路也得平滑（这一句是我们的理解）', C_BORDER, { h: 32, size: 11 });

    function draw(t) {
      [bProp, bPriv, bHist].forEach(function (g) { setOpacity(g, seg(t, g.at, g.at + 0.6)); });
      setOpacity(total, seg(t, 5.4, 6.0));
      setOpacity(roa, seg(t, 7.0, 7.6));
      setOpacity(abl, seg(t, 10.4, 11.0));
      setH(bWhole, 3.21 * SC * ease(seg(t, 10.8, 11.8)));
      setH(bCur, 7.16 * SC * ease(seg(t, 11.2, 12.2)));
      setOpacity(vW, seg(t, 11.8, 12.2));
      setOpacity(vC, seg(t, 12.2, 12.6));
      setOpacity(fin, seg(t, 13.4, 14.0));
      setOpacity(tail, seg(t, 14.8, 15.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 7: 命令、奖励与课程 ── */
  var S7_STEPS = curriculumSteps(CURRIC.s0, CURRIC.cap, CURRIC.up); // 9164
  function buildSceneReward() {
    var s = sceneSvg('命令：前进 0 到 0.8 米每秒、横移正负 0.4、转向正负 0.6 弧度每秒，每 150 步重抽，50 赫兹下是 3 秒，一回合 500 步 10 秒；奖励是步态风格、速度跟踪和表 IV 的八项正则，没有罚动作变化率与关节加速度的平滑项；附录 B 的课程：负奖励乘系数 s，从 0.8 起，回合长度低于 50 步乘 0.9999、高于 400 步乘 1.0001，上限 2.0，涨满要乘 9164 次');
    s.appendChild(svgText(30, 28, '命令、奖励与课程：平滑交给 GP，正则奖励留着', 'demo-x-ink2', 13.5));

    var cmd = group(s);
    rectBox(cmd, 30, 44, 330, 108, C_BORDER, C_SURFACE2);
    cmd.appendChild(svgText(44, 64, '速度命令（第 V 节，机器人坐标系）', 'demo-x-ink2', 11));
    [['前进 $v_x$', '0 … 0.8 m/s'], ['横移 $v_y$', '−0.4 … 0.4 m/s'], ['转向 $v_{yaw}$', '−0.6 … 0.6 rad/s']].forEach(function (r, k) {
      cmd.appendChild(svgRich(52, 88 + k * 21, r[0], { size: 11, w: 120 }));
      cmd.appendChild(paint(svgText(346, 92 + k * 21, r[1], 'demo-x-mono', 11, 'end'), C_ACCENT));
    });
    var tl = group(s);
    rectBox(tl, 376, 44, 394, 108, C_BORDER, C_SURFACE2);
    tl.appendChild(svgText(390, 64, '一回合 500 步 = 10 s（50 Hz）', 'demo-x-ink2', 11));
    var TX0 = 396, TX1 = 752;
    function tx(k) { return TX0 + (k / EP_STEPS) * (TX1 - TX0); }
    tl.appendChild(paint(svgEl('rect', { x: TX0, y: 84, width: TX1 - TX0, height: 18, rx: 4 }), C_SURFACE));
    var segCols = [C_ACCENT, C_GOOD, C_WARN, C_ACCENT];
    [0, 150, 300, 450].forEach(function (k, i) {
      var e = Math.min(EP_STEPS, k + CMD_EVERY);
      tl.appendChild(paint(svgEl('rect', { x: tx(k) + 1, y: 85, width: tx(e) - tx(k) - 2, height: 16, rx: 3, opacity: 0.55 }), segCols[i]));
      tl.appendChild(svgText(tx(k), 118, String(k), 'demo-x-mono demo-x-mut', 9.5, 'middle'));
    });
    tl.appendChild(svgText(tx(500), 118, '500', 'demo-x-mono demo-x-mut', 9.5, 'middle'));
    tl.appendChild(svgText(390, 140, '每 150 步（3 s）重抽一次命令，或者回合重置时', 'demo-x-mut', 10.5));

    var rw = group(s);
    rectBox(rw, 30, 166, 740, 104, C_BORDER);
    rw.appendChild(svgText(44, 186, '奖励 = 步态风格 + 速度跟踪 + 正则（附录表 IV 的八项）', 'demo-x-ink2', 11.5));
    TABLE4.forEach(function (r, k) {
      var cx = 44 + (k % 4) * 182, cy = 210 + Math.floor(k / 4) * 22;
      rw.appendChild(svgText(cx, cy, r[0], 'demo-x-ink2', 10.5));
      rw.appendChild(paint(svgText(cx + 170, cy, r[1], 'demo-x-mono', 10.5, 'end'), C_WARN));
    });
    var gone = group(rw);
    gone.appendChild(svgRich(44, 260, '没有「罚动作变化率、关节加速度」的平滑项（表 IV 里没有，GR1 配置里也没有）—— 这部分交给 GP', { size: 10.8, w: 720, cls: 'demo-x-good' }));

    var cur = group(s);
    rectBox(cur, 30, 282, 740, 128, C_BORDER, C_SURFACE2);
    cur.appendChild(svgText(44, 302, '附录 B 的课程：负的奖励项乘系数 s，正的不乘', 'demo-x-ink2', 11.5));
    var rules = group(cur);
    [['s 从 0.8 开始', 'demo-x-ink2'], ['平均回合 < 50 步：s × 0.9999', 'demo-x-bad'], ['平均回合 > 400 步：s × 1.0001', 'demo-x-good'], ['上限 2.0', 'demo-x-ink2']].forEach(function (r, k) {
      rules.appendChild(svgText(44, 326 + k * 20, r[0], r[1], 10.8));
    });
    var CX0 = 300, CX1 = 752, CY0 = 396, CY1 = 312;
    function cxs(n) { return CX0 + (n / (S7_STEPS * 1.1)) * (CX1 - CX0); }
    function cys(v) { return CY0 - ((v - 0.6) / (2.1 - 0.6)) * (CY0 - CY1); }
    cur.appendChild(paint(svgEl('line', { x1: CX0, y1: CY0, x2: CX1, y2: CY0, 'stroke-width': 1 }), null, C_BORDER));
    cur.appendChild(paint(svgEl('line', { x1: CX0, y1: cys(2.0), x2: CX1, y2: cys(2.0), 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_MUTED));
    cur.appendChild(svgText(CX0 + 4, cys(2.0) - 4, '上限 2.0', 'demo-x-mut', 9.5));
    var cPts = [];
    for (var n = 0; n <= S7_STEPS * 1.1; n += 200) cPts.push([cxs(n), cys(Math.min(CURRIC.cap, CURRIC.s0 * Math.pow(CURRIC.up, n)))]);
    var cLn = pathLine(cur, cPts, C_GOOD, 2.2);
    var cTag = group(cur);
    cTag.appendChild(svgRich(cxs(S7_STEPS) - 8, cys(2.0) - 8, '乘满 **' + S7_STEPS + '** 次 1.0001', { size: 10.5, anchor: 'end', w: 200, cls: 'demo-x-good' }));
    cTag.appendChild(svgText(CX0 + 4, CY0 + 11, 's = 0.8', 'demo-x-mono demo-x-mut', 9.5));
    cTag.appendChild(svgText(CX1, CY0 + 11, '假设每一步都满足「回合够长」（示意）', 'demo-x-mut', 9.5, 'end'));

    function draw(t) {
      setOpacity(cmd, seg(t, 0.3, 0.9));
      setOpacity(tl, seg(t, 1.6, 2.2));
      setOpacity(rw, seg(t, 3.6, 4.2));
      setOpacity(gone, seg(t, 5.2, 5.8));
      setOpacity(cur, seg(t, 7.0, 7.6));
      drawOn(cLn, ease(seg(t, 10.4, 12.4)));
      setOpacity(cTag, seg(t, 12.0, 12.6));
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

    /* 右：读数与图 6 示意 */
    var drop = group(s);
    rectBox(drop, 536, 70, 234, 120, C_BORDER);
    drop.appendChild(svgText(548, 90, '0 → 0.001', 'demo-x-acc', 11.5));
    drop.appendChild(svgRich(548, 114, '抖动 42.19 → 3.69：**−91%**', { size: 11, w: 220 }));
    drop.appendChild(svgRich(548, 136, '回报 28.87 → 26.32：−8.8%', { size: 11, w: 220, cls: 'demo-x-ink2' }));
    drop.appendChild(svgText(548, 160, '论文：仍可能出现危险的抖动', 'demo-x-warn', 10.5));
    drop.appendChild(svgText(548, 180, '0.002 是论文选的', 'demo-x-good', 10.5));
    var over = group(s);
    rectBox(over, 536, 200, 234, 150, C_WARN, C_SURFACE, '4 3');
    over.appendChild(svgText(548, 220, '0.01：压过头', 'demo-x-warn', 11.5));
    over.appendChild(svgRich(548, 242, '关节速度 10.65 → **2.75**', { size: 11, w: 220 }));
    over.appendChild(svgRich(548, 264, '回报 16.11，比 0 低 **44%**', { size: 11, w: 220 }));
    over.appendChild(svgText(548, 286, '图 6（读图）：学得也更慢', 'demo-x-mut', 10.5));
    var f6 = pathLine(over, (function () {
      var pts = [];
      for (var k = 0; k <= 40; k++) pts.push([552 + k * 5, 338 - 26 * (1 - Math.exp(-k / 5))]);
      return pts;
    })(), C_GOOD, 1.6);
    var f6b = pathLine(over, (function () {
      var pts = [];
      for (var k = 0; k <= 40; k++) pts.push([552 + k * 5, 338 - 15 * (1 - Math.exp(-k / 6))]);
      return pts;
    })(), C_WARN, 1.6);
    over.appendChild(svgText(756, 304, '0.002', 'demo-x-good demo-x-mono', 9.5, 'end'));
    over.appendChild(svgText(756, 330, '0.01', 'demo-x-warn demo-x-mono', 9.5, 'end'));

    var fin = group(s);
    chip(fin, 30, 368, 740, '和别的平滑办法一样，$\\lambda_{gp}$ 也要调；论文实验里 0.002 平衡得最好，四台真机都用它', C_ACCENT, { h: 36, size: 12 });

    function draw(t) {
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
      setOpacity(drop, seg(t, 4.4, 5.0));
      setOpacity(over, seg(t, 11.0, 11.6));
      drawOn(f6, ease(seg(t, 11.6, 13.0)));
      drawOn(f6b, ease(seg(t, 11.8, 13.2)));
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
        { at: 0.3, s: '仿真的动力学和执行器模型都是简化的，电机近乎理想：在任何状态下都能给出想要的力矩。于是仿真里训出来的强化学习策略，容易学成类似 **bang-bang** 控制的抖动，相邻两步动作差得很多。' },
        { at: 3.6, s: '论文表 I：不加任何平滑的策略，仿真里任务回报**最高**（28.87），但动作抖动 **42.19**，是 LCP（3.21）的 13 倍。真机电机打不出这么大的力矩，这类行为往往迁移失败。' },
        { at: 7.0, s: '常见补救一：**平滑奖励**，罚动作变化、关节速度、关节加速度、能耗。权重要和任务奖励仔细配平，换一台机器人往往就得重调。' },
        { at: 10.4, s: '补救二：在策略输出后面加**低通滤波**（上一期 OP3 用的就是 $u_t = 0.8\\,u_{t-1} + 0.2\\,a_t$）。论文说它常会压抑探索，训出次优策略。' },
        { at: 13.4, s: '两者还有共同的问题：都**不可微**，藏在环境或信号链里，只能靠策略梯度采样去估。LCP 想要一个简单、可微、几行代码就能接进现有框架的平滑目标。' }
      ]
    },
    {
      title: 'Lipschitz：给斜率设上限',
      dur: 17,
      build: buildSceneLipschitz,
      cues: [
        { at: 0.3, s: '**Lipschitz 连续**限制函数能变多快：任意两点，输出之差不超过 $K$ 乘输入之差（式 1）；满足它的 $K$ 叫 Lipschitz 常数。' },
        { at: 3.6, s: '图 2 的画法：以曲线上任一点为顶点，画斜率 $\\pm K$ 的圆锥，整条曲线都落在圆锥里。左图是玩具策略 $\\pi(o) = o + b\\sin(\\omega o)$，最大斜率 $K = 5$。' },
        { at: 7.0, s: '对策略来说，观测抖 $\\Delta o$，动作最多抖 $K\\Delta o$：噪声标准差 $\\sigma = 0.045$，上界 $K\\sigma = 0.225$，这段轨迹上实测 **' + fmt(TOY.jit, 3) + '**（玩具，不能和论文比）。' },
        { at: 10.4, s: '推论（式 2）：梯度处处有界 $\\lVert\\nabla_x f(x)\\rVert \\le K$，函数就是 $K$-Lipschitz 的；反过来不成立，比如 $|x|$ 在 0 处不可导，却是 1-Lipschitz。' },
        { at: 13.4, s: '动机实验（图 3）：只加平滑奖励、没有专门约束梯度，训出的策略**梯度范数就明显更小**。那就直接去约束策略的梯度。' }
      ]
    },
    {
      title: '从约束到梯度惩罚：式 4 → 7',
      dur: 17,
      build: buildSceneDerive,
      cues: [
        { at: 0.3, s: '式 4：最大化回报 $J(\\pi)$，约束是 $\\lVert\\nabla_s\\log\\pi(a \\mid s)\\rVert^2$ 在**所有**状态、动作上都不超过 $K^2$。注意它约束的是 $\\log\\pi$ 对状态的梯度。' },
        { at: 3.6, s: '所有状态上的最大值没法算，按 TRPO 的启发式换成 rollout 数据上的**期望**（式 5）。玩具策略上：最大斜率 5，访问到的状态上的均方根斜率只有 **' + fmt(TOY.rmsSlope, 2) + '** —— 期望只管走得到的地方。' },
        { at: 7.0, s: '为了用梯度法优化，引入拉格朗日乘子 $\\lambda \\ge 0$，把约束搬进目标（式 6）：外层对 $\\lambda$ 取最小，内层对策略取最大。' },
        { at: 10.4, s: '再简化：$\\lambda$ 不去学，固定成手调的系数 $\\lambda_{gp}$；$K^2$ 是常数，丢掉，得到式 7 的**梯度惩罚**（GP）。' },
        { at: 13.4, s: 'GP 可微，能和 PPO 的损失一起反向传播，论文所有实验 $\\lambda_{gp} = 0.002$。平滑奖励藏在环境里，只能靠策略梯度采样去估；GP 直接对策略参数求导。' }
      ]
    },
    {
      title: '罚的是 $\\log\\pi$ 的梯度',
      dur: 17,
      build: buildSceneLogPi,
      cues: [
        { at: 0.3, s: '式 7 罚的不是动作本身，是 $\\log\\pi(a \\mid s)$ 对状态的梯度。PPO 的策略是对角高斯：均值 $\\mu_\\theta(s)$ 由网络给，标准差 $\\sigma$ 与状态无关。' },
        { at: 3.6, s: '代进去：$\\nabla_s\\log\\pi = J^\\top(a - \\mu)/\\sigma^2$，$J$ 是均值对状态的雅可比；对动作取期望得 $\\lVert J\\rVert_F^2/\\sigma^2$ —— **罚的其实是均值的斜率，按 $1/\\sigma^2$ 加权**。这一步是我们推的，论文没写。' },
        { at: 7.0, s: '两维算例：$J = [[0.8, 0.2], [-0.4, 0.6]]$，$\\lVert J\\rVert_F^2 = 1.20$；$\\sigma = 0.4$ 时期望 $= 1.20 / 0.16 =$ **7.5**。' },
        { at: 10.4, s: '可训练时每个状态只有 rollout 里那**一个**动作：$a - \\mu = (0.4, -0.2)$ 时梯度 $(2.5, -0.25)$，平方和 **6.31**；样本多了，平均才收敛到 7.5（' + GAUSS_N + ' 个样本平均 ' + fmt(GAUSS.mean, 2) + '）。' },
        { at: 13.4, s: '$\\sigma$ 减半到 0.2，同一个 $J$ 的期望变成 **30**，是 4 倍：探索噪声越小，同样的斜率罚得越重。' }
      ]
    },
    {
      title: '几行代码接进 PPO',
      dur: 17,
      build: buildSceneCode,
      cues: [
        { at: 0.3, s: '官方代码基于 legged_gym + rsl_rl。全部改动在 PPO 的 `update()` 里：把这一批观测设成需要梯度，前向一遍，算出这批动作的 `log_prob`。' },
        { at: 3.6, s: '一次 `torch.autograd.grad` 求 `log_prob` 对观测的梯度，`create_graph=True` 让这个梯度还能再反向传播；逐样本平方求和、再取平均，就是 GP。' },
        { at: 7.0, s: '总损失 = 裁剪的替代损失 + 价值损失 − 0.01 × 熵 + 特权正则 + **0.002 × GP**，一次反向传播、一次 Adam 更新。系数表 `[0.002, 0.002, 700, 1000]` 首尾相同，全程恒为 0.002。' },
        { at: 10.4, s: 'MimicKit 也有 `LCPAgent`：继承 `PPOAgent`，只重写 actor 损失；配置就是 DeepMimic 的 G1 PPO 配置加一行 `lcp_weight: 0.002`，任务是动作跟踪，不是论文的速度行走。' },
        { at: 13.4, s: '别搞反：MimicKit 里**所有**智能体默认都用 SGD、学习率 $10^{-4}$，这不是 LCP 的要求；论文官方代码用的是 Adam，学习率 $2\\times10^{-4}$，按 KL 自适应。' }
      ]
    },
    {
      title: '观测、ROA 与「罚整段输入」',
      dur: 17,
      build: buildSceneObs,
      cues: [
        { at: 0.3, s: '观测（第 V 节）：2 维步态相位（正弦、余弦）、3 维速度命令、关节位置和速度、上一步动作；按 GR1 的公开代码再加角速度、横滚俯仰，一共 **71** 维。' },
        { at: 3.6, s: '特权信息：机身质量、质心、电机强度、机身线速度（代码里还多了摩擦），**50** 维；外加最近 10 步的历史，**710** 维。合起来 **831** 维，进网络前用滑动均值和标准差归一化。' },
        { at: 7.0, s: 'sim-to-real 用 **ROA**（附录式 8）：编码器把特权信息压成 $z_\\mu$，适应模块只看历史去估 $z_\\phi$；两项距离各对另一边停梯度，$\\lambda = 0.1$，GP 照常加上。' },
        { at: 10.4, s: 'GP 罚哪些输入？表 I(c)：只罚当前观测，动作抖动 **7.16**、关节位置抖动 0.35；罚整段输入，**3.21**、0.17。' },
        { at: 13.4, s: '论文的解释：只管当前观测，历史一变，动作照样会跳。部署时特权信息拿不到、换成历史估出的 $z_\\phi$，这条通路也得平滑（后半句是我们的理解）。' }
      ]
    },
    {
      title: '命令、奖励与课程',
      dur: 17,
      build: buildSceneReward,
      cues: [
        { at: 0.3, s: '任务是跟着速度命令走：前进 $v_x \\in [0, 0.8]$ m/s、横移 $v_y \\in [-0.4, 0.4]$ m/s、转向 $v_{yaw} \\in [-0.6, 0.6]$ rad/s，每 **150** 步重抽一次；控制 50 Hz，就是每 3 s 换一次，一回合 500 步 = 10 s。' },
        { at: 3.6, s: '奖励三类：步态风格、速度跟踪、正则（附录表 IV 八项：机身角速度、关节力矩、碰撞、竖直速度、触地力、绊脚、关节限位、机身姿态）。**没有**罚动作变化率、关节加速度的平滑项 —— 那部分交给 GP。' },
        { at: 7.0, s: '附录 B 的课程：负的奖励项乘系数 $s$，正的不乘。$s$ 从 0.8 起：平均回合长度低于 50 步就乘 0.9999，高于 400 步就乘 1.0001，上限 2.0。' },
        { at: 10.4, s: '意思是先轻罚、让它敢探索，站稳了再加重正则。从 0.8 涨到 2.0 要乘 **' + S7_STEPS + '** 次 1.0001（$\\ln 2.5 / \\ln 1.0001$）；公开代码每个控制步判断一次，那就是约 382 次迭代。' },
        { at: 13.4, s: '公开代码和论文有出入：GR1 的命令区间是 0–0.6 m/s、±0.3、±0.3，课程从 1.0 起、阈值 420 步，各机器人还不一样。下面的数字以论文为准，代码供对照。' }
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
        { at: 0.3, s: '表 I(b) 只改 $\\lambda_{gp}$。$\\lambda_{gp} = 0$ 就是不平滑：动作抖动 42.19、任务回报 28.87。' },
        { at: 3.6, s: '只加到 **0.001**，抖动就掉到 3.69，降了 **91%**；回报 26.32，只少 8.8%。可论文说这一档仍可能出现上真机危险的抖动。' },
        { at: 7.0, s: '**0.002** 是论文选的：抖动 3.21、回报 26.03。再到 0.005：抖动 2.10、回报 23.92。' },
        { at: 10.4, s: '**0.01** 压过头：抖动只剩 0.17，关节速度从 10.65 掉到 **2.75**，动作又平又慢，回报 16.11，比 0 低 44%；图 6 里它也学得更慢。' },
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
        '**玩具与示意**：第 2、3 幕的一维策略 $\\pi(o) = o + b\\sin(\\omega o)$ 与第 4 幕的两维高斯算例是玩具，第 4 幕的推导 $\\mathbb{E}\\lVert\\nabla_s\\log\\pi\\rVert^2 = \\lVert J\\rVert_F^2/\\sigma^2$ 是我们推的；第 1 幕的抖动曲线、第 2 幕的图 3、第 8 幕的图 4、第 9 幕的图 6 都是按论文图的走势画的示意（论文图 3 没有纵轴数值）；第 10 幕的小人是示意。'
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
      sub: '10 分 34 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '11.0 MB',
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
