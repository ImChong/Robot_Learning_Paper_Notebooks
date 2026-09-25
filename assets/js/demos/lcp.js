/* Interactive LCP demos for
 * papers/01_Foundational_RL/LCP_Sim-to-Real_Action_Smoothing.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["lcp"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   lcp-sensitivity — 动作抖动 ≈ Lipschitz 常数 × 观测噪声，就这么一条乘法
 *   lcp-gp          — λ_gp 的取舍：平滑和「跟得上指令」是一对矛盾
 *   lcp-vs-filter   — 同样是变平滑，低通滤波要付相位延迟，LCP 不用
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

  // ─── demo 1: 敏感度 × 噪声 = 抖动 ────────────────────────────────────────
  /* 把策略写成 π(o) = o + b·sin(ω o)。它的最大斜率就是 Lipschitz 常数
     K = 1 + bω —— 观测里那点噪声被原样放大 K 倍送进关节。 */
  var OMEGA = 4.5;

  function policyOf(kLip) {
    var b = Math.max(0, (kLip - 1) / OMEGA);
    return function (o) {
      return o + b * Math.sin(OMEGA * o);
    };
  }

  function buildSensitivityDemo(host) {
    var root = card(host, {
      title: '抖动是怎么来的：观测噪声 × 策略敏感度',
      sub:
        '$\\lVert f(x_1) - f(x_2) \\rVert \\le K \\lVert x_1 - x_2 \\rVert$ 里的那个 $K$，在真机上就是「观测噪声被放大多少倍送进关节」。' +
        '拖动 K 和噪声，看右边的动作序列什么时候开始发毛。'
    });

    var state = { kLip: 5, noise: 0.045, seed: 6, steps: 120 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '策略的 Lipschitz 常数 K',
      min: 1,
      max: 14,
      step: 0.1,
      value: state.kLip,
      format: function (v) {
        return fmt(v, 1);
      },
      onInput: function (v) {
        state.kLip = v;
        render();
      }
    });
    slider(ctrls, {
      label: '观测噪声 $\\sigma$（编码器 / IMU）',
      min: 0,
      max: 0.12,
      step: 0.002,
      value: state.noise,
      format: function (v) {
        return fmt(v, 3);
      },
      onInput: function (v) {
        state.noise = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '仿真里的理想传感器（$\\sigma$ = 0）', function () {
      state.noise = 0;
      render();
    });
    button(btns, '真机的传感器（$\\sigma$ ≈ 0.045）', function () {
      state.noise = 0.045;
      render();
    });
    button(btns, '换一段噪声', function () {
      state.seed = (state.seed * 1103515245 + 12345) % 99991;
      render();
    });

    var setLegend = legend(root, [
      { key: 'muted', text: '真实状态（无噪）' },
      { key: 'accent', text: '策略实际输出的动作' },
      { key: 'good', text: '策略函数 $\\pi(o)$' },
      { key: 'bad', text: '噪声被放大的那一段' }
    ]);

    var grid = stageGrid(root);
    var fnStage = stage(grid, 240);
    var seqStage = stage(grid, 240);

    var stats = statsRow(root);
    var sK = stats.add('$\\lVert \\nabla_o \\pi \\rVert$ 的上界');
    var sJit = stats.add('动作抖动 std');
    var sPred = stats.add('上界 $K \\times \\sigma$');
    var sRate = stats.add('动作变化率峰值');
    var verdict = verdictBox(root);

    note(root, [
      '**这就是整篇论文的出发点**：动作抖动的上界是 $K \\times \\sigma$。$\\sigma$ 是硬件决定的，你改不了；' +
        '能改的只有 K —— 所以「让动作平滑」这件事，等价于「把策略对观测的敏感度压下来」。',
      '**仿真里看不出问题**：把噪声拖到 0，K = 14 的策略输出也是完全干净的。' +
        '这解释了为什么很多 policy 在 sim 里好好的，一上真机就嗡嗡响 —— 差别不在策略，在 $\\sigma$。',
      '**低通滤波治的是症状**：它在输出端把高频削掉，但那个 K 还在。' +
        '一旦遇到滤波器跟不上的扰动，尖峰照样出来，而且还多了一份延迟（第三个演示会画）。',
      '**这是简化模型**：真实策略是 MLP、观测是几十维、动作是 12~29 个关节。' +
        '这里用一维的 $\\pi(o) = o + b \\sin(\\omega o)$ 把「斜率 = 放大倍数」这件事画出来，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var pi = policyOf(state.kLip);
      var rng = mulberry32(state.seed);
      var trueO = [],
        noisyO = [],
        acts = [];
      for (var t = 0; t < state.steps; t++) {
        var o = 0.9 * Math.sin(t * 0.055);
        var on = o + state.noise * gauss(rng);
        trueO.push(o);
        noisyO.push(on);
        acts.push(pi(on));
      }
      // 抖动：动作里减掉「无噪时应有的动作」之后剩下的部分
      var resid = acts.map(function (a, i) {
        return a - pi(trueO[i]);
      });
      var mean =
        resid.reduce(function (a, b) {
          return a + b;
        }, 0) / resid.length;
      var jit = Math.sqrt(
        resid.reduce(function (a, b) {
          return a + (b - mean) * (b - mean);
        }, 0) / resid.length
      );
      var rate = 0;
      for (var i2 = 1; i2 < acts.length; i2++) rate = Math.max(rate, Math.abs(acts[i2] - acts[i2 - 1]));

      sK.set(fmt(state.kLip, 1), state.kLip < 4 ? 'good' : state.kLip > 9 ? 'bad' : 'warn');
      sJit.set(fmt(jit, 4), jit < 0.06 ? 'good' : jit > 0.2 ? 'bad' : 'warn');
      sPred.set(fmt(state.kLip * state.noise, 4), 'accent');
      sRate.set(fmt(rate, 3), rate < 0.15 ? 'good' : rate > 0.4 ? 'bad' : 'warn');

      if (state.noise < 0.002) {
        verdict.set(
          '🧪 $\\sigma$ = 0：仿真里的理想传感器。K = ' +
            fmt(state.kLip, 1) +
            ' 这么高的敏感度，输出依然完全干净 —— **仿真根本测不出这个问题**。' +
            '把噪声拖到 0.045（真机量级）再看同一个策略。',
          'frozen'
        );
      } else if (jit > 0.2) {
        verdict.set(
          '📳 K = ' +
            fmt(state.kLip, 1) +
            '、$\\sigma$ = ' +
            fmt(state.noise, 3) +
            '：抖动 std 达到 ' +
            fmt(jit, 3) +
            '，上界 $K \\times \\sigma$ = ' +
            fmt(state.kLip * state.noise, 3) +
            '（实际抖动落在上界之内，因为 K 是**最大**斜率，不是平均斜率）。' +
            '这个量级的高频指令送进 PD，电机会发热、发出可听见的嗡嗡声。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ K = ' +
            fmt(state.kLip, 1) +
            ' 时抖动只有 ' +
            fmt(jit, 3) +
            '。注意左图：K 小的时候 $\\pi(o)$ 是一条平缓的线，噪声进去出来还是那么大；' +
            'K 大的时候它满是褶皱，输入挪一点点就跳到另一个值。',
          'learning'
        );
      }

      // ── 左：策略函数 ──
      var g = begin(fnStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 22, b: 34 }, [-1.2, 1.2], [-1.9, 1.9]);
      axes(g, p, {
        xTicks: [-1, -0.5, 0, 0.5, 1],
        yTicks: [-1.5, 0, 1.5],
        xLabel: '观测 o'
      });
      text(g.ctx, '策略函数 π(o)：斜率就是放大倍数', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var pts = [];
      for (var s = 0; s <= 240; s++) {
        var o2 = -1.2 + (2.4 * s) / 240;
        pts.push([p.sx(o2), p.sy(clamp(pi(o2), -1.9, 1.9))]);
      }
      line(g.ctx, pts, P.good, 2.2);
      // 在某个工作点上画出「噪声带 → 动作带」
      var o0 = 0.45;
      var lo = o0 - 2 * state.noise,
        hi = o0 + 2 * state.noise;
      g.ctx.save();
      g.ctx.fillStyle = P.bad;
      g.ctx.globalAlpha = 0.25;
      g.ctx.fillRect(p.sx(lo), p.y1, Math.max(2, p.sx(hi) - p.sx(lo)), p.y0 - p.y1);
      var aLo = pi(lo),
        aHi = pi(hi);
      g.ctx.fillRect(p.x0, p.sy(Math.max(aLo, aHi)), p.x1 - p.x0, Math.max(2, Math.abs(p.sy(aLo) - p.sy(aHi))));
      g.ctx.restore();
      dot(g.ctx, p.sx(o0), p.sy(pi(o0)), 4.5, P.accent, P.surface2);
      text(g.ctx, '±2σ 的观测噪声', p.sx(o0), p.y0 - 8, P.bad, 'center', '10px sans-serif');

      // ── 右：动作时间序列 ──
      var g2 = begin(seqStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [0, state.steps], [-2, 2]);
      axes(g2, p2, {
        xTicks: K.niceTicks(0, state.steps, 4),
        yTicks: [-2, -1, 0, 1, 2],
        xLabel: '控制步'
      });
      text(g2.ctx, '策略实际发出的关节指令', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      line(
        g2.ctx,
        trueO.map(function (v, i3) {
          return [p2.sx(i3), p2.sy(clamp(pi(v), -2, 2))];
        }),
        P2.muted,
        1.6,
        [5, 4]
      );
      line(
        g2.ctx,
        acts.map(function (v, i4) {
          return [p2.sx(i4), p2.sy(clamp(v, -2, 2))];
        }),
        jit > 0.2 ? P2.bad : P2.accent,
        1.8
      );

      fnStage.canvas.setAttribute('aria-label', '策略函数的斜率与观测噪声带的关系');
      seqStage.canvas.setAttribute('aria-label', '带噪观测下策略输出的关节指令时间序列');
    });

    render();
  }

  // ─── demo 2: λ_gp 的取舍 ────────────────────────────────────────────────
  /* 训练目标 max J(K) − λ_gp·K²。J 随敏感度增加而饱和（更灵敏 → 更能追指令，
     但收益递减），惩罚项是二次的，于是最优 K* 随 λ 单调下降。 */
  function taskJ(kLip) {
    return 1 - Math.exp(-(kLip - 0.6) / 2.2);
  }

  function bestK(lambda) {
    var best = 0.8,
      bestV = -Infinity;
    for (var i = 0; i <= 400; i++) {
      var k = 0.8 + (15 * i) / 400;
      var v = taskJ(k) - lambda * k * k;
      if (v > bestV) {
        bestV = v;
        best = k;
      }
    }
    return best;
  }

  function buildGpDemo(host) {
    var root = card(host, {
      title: '$\\lambda_{\\mathrm{gp}}$：把「别一惊一乍」写进损失函数',
      sub:
        '$L_{\\mathrm{total}} = L_{\\mathrm{RL}} - \\lambda_{\\mathrm{gp}}\\, \\mathbb{E}[\\lVert \\nabla_o \\pi(o) \\rVert^2]$。PPO 想要更高的 reward，GP 项想要更小的敏感度。' +
        '拖动 $\\lambda_{\\mathrm{gp}}$，看最优 K 怎么被压下去，以及什么时候压过头。'
    });

    var state = { lambda: 0.012, noise: 0.045 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '$\\lambda_{\\mathrm{gp}}$（梯度惩罚权重）',
      min: 0,
      max: 0.1,
      step: 0.001,
      value: state.lambda,
      format: function (v) {
        return fmt(v, 3);
      },
      onInput: function (v) {
        state.lambda = v;
        render();
      }
    });
    slider(ctrls, {
      label: '真机的观测噪声 $\\sigma$',
      min: 0.005,
      max: 0.12,
      step: 0.002,
      value: state.noise,
      format: function (v) {
        return fmt(v, 3);
      },
      onInput: function (v) {
        state.noise = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '$\\lambda_{\\mathrm{gp}}$ = 0（纯 PPO）', function () {
      state.lambda = 0;
      render();
    });
    button(btns, '压过头（$\\lambda_{\\mathrm{gp}}$ = 0.1）', function () {
      state.lambda = 0.1;
      render();
    });

    var setLegend = legend(root, [
      { key: 'good', text: '任务表现 J(K)' },
      { key: 'bad', text: '梯度惩罚 $\\lambda K^2$' },
      { key: 'accent', text: '总目标 $J - \\lambda K^2$' }
    ]);

    var grid = stageGrid(root);
    var objStage = stage(grid, 235);
    var paretoStage = stage(grid, 235);

    var tb = table(root);
    var cells = [];
    (function () {
      tb.row(['', '$\\lambda_{\\mathrm{gp}} = 0$', '当前 $\\lambda_{\\mathrm{gp}}$'], true);
      ['学到的 K', '任务表现', '真机抖动 std'].forEach(function (lab) {
        var tr = el('tr');
        tr.appendChild(el('th', null, lab));
        var a = el('td', null, '—'),
          b = el('td', null, '—');
        cells.push([a, b]);
        tr.appendChild(a);
        tr.appendChild(b);
        tb.node.appendChild(tr);
      });
    })();

    var stats = statsRow(root);
    var sK = stats.add('最优敏感度 K*');
    var sJ = stats.add('任务表现');
    var sJit = stats.add('真机抖动 $K^* \\times \\sigma$');
    var sLoss = stats.add('比纯 PPO 损失的表现');
    var verdict = verdictBox(root);

    note(root, [
      '**它不是免费的**：K 压下去，策略对指令的响应也会变钝。表格里那一列「任务表现」就是代价。' +
        '论文自己也承认这一点 —— 它的说法是「仍要调 GP 系数」，而不是「一劳永逸」。',
      '**但它比调 reward 便宜**：平滑 reward 要在环境里加项、要配权重、还会和别的 reward 项互相打架；' +
        'GP 只是在更新策略时多算一次对观测的梯度，几行代码，和 PPO / teacher-student / ROA 都不冲突。',
      '**$\\lambda$ 的合适范围和 $\\sigma$ 有关**：把噪声拖大，同一个 $\\lambda$ 下的真机抖动跟着涨 —— ' +
        '换一台传感器更差的机器，这个系数就得重调。这是它作为正则项的本性，不是 bug。',
      '**这是简化模型**：J(K) 那条饱和曲线是编的，真实的任务表现随敏感度的关系要复杂得多。' +
        '这里只复现「二次惩罚 → 最优 K 单调下降 → 表现有代价」这条链，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var k = bestK(state.lambda);
      var k0 = bestK(0);
      var j = taskJ(k),
        j0 = taskJ(k0);
      var jit = k * state.noise,
        jit0 = k0 * state.noise;

      sK.set(fmt(k, 2), k < 3 ? 'good' : k > 9 ? 'bad' : 'warn');
      sJ.set(fmt(j, 3), j > 0.85 ? 'good' : j < 0.5 ? 'bad' : 'warn');
      sJit.set(fmt(jit, 3), jit < 0.15 ? 'good' : jit > 0.35 ? 'bad' : 'warn');
      sLoss.set(fmt((j0 - j) * 100, 1) + ' 个百分点', j0 - j > 0.2 ? 'bad' : 'good');
      cells[0][0].textContent = fmt(k0, 2);
      cells[0][1].textContent = fmt(k, 2);
      cells[1][0].textContent = fmt(j0, 3);
      cells[1][1].textContent = fmt(j, 3);
      cells[2][0].textContent = fmt(jit0, 3);
      cells[2][1].textContent = fmt(jit, 3);

      if (state.lambda < 0.0005) {
        verdict.set(
          '📳 $\\lambda_{\\mathrm{gp}}$ = 0：纯 PPO 会一路把 K 推到 ' +
            fmt(k0, 1) +
            ' —— 因为在仿真里，更灵敏永远意味着更高的 reward，没有任何东西拦着它。' +
            '真机抖动 ' +
            fmt(jit0, 3) +
            '。',
          'frozen'
        );
      } else if (j0 - j > 0.25) {
        verdict.set(
          '🐢 $\\lambda_{\\mathrm{gp}}$ = ' +
            fmt(state.lambda, 3) +
            ' 压过头了：K 被摁到 ' +
            fmt(k, 2) +
            '，抖动确实只剩 ' +
            fmt(jit, 3) +
            '，但任务表现比纯 PPO 低了 ' +
            fmt((j0 - j) * 100, 1) +
            ' 个百分点 —— 策略对指令的响应变钝了。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ $\\lambda_{\\mathrm{gp}}$ = ' +
            fmt(state.lambda, 3) +
            '：K 从 ' +
            fmt(k0, 1) +
            ' 降到 ' +
            fmt(k, 2) +
            '，抖动从 ' +
            fmt(jit0, 3) +
            ' 降到 ' +
            fmt(jit, 3) +
            '，任务表现只掉 ' +
            fmt((j0 - j) * 100, 1) +
            ' 个百分点。这一段就是 LCP 想要的位置。',
          'learning'
        );
      }

      // ── 左：目标函数 ──
      var g = begin(objStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 22, b: 34 }, [0.8, 15], [-1, 1.15]);
      axes(g, p, {
        xTicks: [1, 5, 10, 15],
        yTicks: [-1, -0.5, 0, 0.5, 1],
        yFmt: function (t) {
          return fmt(t, 1);
        },
        xLabel: '策略敏感度 K'
      });
      text(g.ctx, '总目标的峰值决定学出来的 K', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var jPts = [],
        gPts = [],
        tPts = [];
      for (var i = 0; i <= 200; i++) {
        var kk = 0.8 + (14.2 * i) / 200;
        jPts.push([p.sx(kk), p.sy(taskJ(kk))]);
        gPts.push([p.sx(kk), p.sy(clamp(-state.lambda * kk * kk, -1, 1.15))]);
        tPts.push([p.sx(kk), p.sy(clamp(taskJ(kk) - state.lambda * kk * kk, -1, 1.15))]);
      }
      line(g.ctx, [[p.x0, p.sy(0)], [p.x1, p.sy(0)]], P.grid, 1);
      line(g.ctx, jPts, P.good, 1.8, [5, 4]);
      line(g.ctx, gPts, P.bad, 1.8, [5, 4]);
      line(g.ctx, tPts, P.accent, 2.6);
      line(g.ctx, [[p.sx(k), p.y0], [p.sx(k), p.y1]], P.text, 1, [3, 3]);
      dot(g.ctx, p.sx(k), p.sy(clamp(taskJ(k) - state.lambda * k * k, -1, 1.15)), 4.5, P.accent, P.surface2);
      text(g.ctx, 'K* = ' + fmt(k, 2), p.sx(k) + 6, p.y1 + 12, P.text, 'left', '11px monospace');

      // ── 右：抖动 / 表现 的帕累托 ──
      var g2 = begin(paretoStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [0, 0.1], [0, 1.05]);
      axes(g2, p2, {
        xTicks: [0, 0.025, 0.05, 0.075, 0.1],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        xFmt: function (t) {
          return fmt(t, 3);
        },
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: 'λ_gp'
      });
      text(g2.ctx, '表现 ↓ 与抖动 ↓ 同时发生', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var perfPts = [],
        jitPts = [];
      for (var l = 0; l <= 100; l++) {
        var lam = (0.1 * l) / 100;
        var kk2 = bestK(lam);
        perfPts.push([p2.sx(lam), p2.sy(taskJ(kk2))]);
        jitPts.push([p2.sx(lam), p2.sy(clamp((kk2 * state.noise) / 0.7, 0, 1))]);
      }
      line(g2.ctx, perfPts, P2.good, 2.4);
      line(g2.ctx, jitPts, P2.bad, 2.4);
      text(g2.ctx, '任务表现', p2.x0 + 8, p2.sy(0.96), P2.good, 'left', '11px sans-serif');
      text(g2.ctx, '真机抖动（已归一）', p2.x0 + 8, p2.sy(0.86), P2.bad, 'left', '11px sans-serif');
      line(g2.ctx, [[p2.sx(state.lambda), p2.y0], [p2.sx(state.lambda), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(state.lambda), p2.sy(j), 4.5, P2.good, P2.surface2);
      dot(g2.ctx, p2.sx(state.lambda), p2.sy(clamp(jit / 0.7, 0, 1)), 4.5, P2.bad, P2.surface2);

      objStage.canvas.setAttribute('aria-label', '任务目标与梯度惩罚合成的总目标曲线');
      paretoStage.canvas.setAttribute('aria-label', '任务表现与真机抖动随 λ_gp 的变化');
    });

    render();
  }

  // ─── demo 3: 和低通滤波 / 平滑 reward 的对比 ────────────────────────────
  function buildVsFilterDemo(host) {
    var root = card(host, {
      title: '三种「让动作变平滑」的办法，代价各不相同',
      sub:
        '同一段带噪指令，分别交给：高敏感度策略（什么都不做）、输出端低通滤波、以及 LCP。' +
        '注意看阶跃那一段 —— 滤波器平滑的代价写在延迟上。'
    });

    var state = { alpha: 0.18, kLip: 3.0, noise: 0.05, seed: 9, steps: 160, stepAt: 80 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '低通滤波系数 $\\alpha$（越小越平滑）',
      min: 0.04,
      max: 1,
      step: 0.02,
      value: state.alpha,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.alpha = v;
        render();
      }
    });
    slider(ctrls, {
      label: 'LCP 压到的 K',
      min: 1,
      max: 12,
      step: 0.1,
      value: state.kLip,
      format: function (v) {
        return fmt(v, 1);
      },
      onInput: function (v) {
        state.kLip = v;
        render();
      }
    });
    slider(ctrls, {
      label: '观测噪声 $\\sigma$',
      min: 0,
      max: 0.12,
      step: 0.002,
      value: state.noise,
      format: function (v) {
        return fmt(v, 3);
      },
      onInput: function (v) {
        state.noise = v;
        render();
      }
    });

    var setLegend = legend(root, [
      { key: 'bad', text: '不做任何处理（K = 10）' },
      { key: 'warn', text: '输出端低通滤波' },
      { key: 'good', text: 'LCP：直接压 K' },
      { key: 'muted', text: '指令（真值）' }
    ]);

    var grid = stageGrid(root);
    var seqStage = stage(grid, 250);
    var barStage = stage(grid, 250);

    var stats = statsRow(root);
    var sRawJ = stats.add('不处理的抖动');
    var sFilJ = stats.add('低通后的抖动');
    var sLcpJ = stats.add('LCP 的抖动');
    var sLag = stats.add('低通引入的延迟');
    var verdict = verdictBox(root);

    note(root, [
      '**滤波器的延迟是物理的**：一阶低通的群延迟大约是 $(1-\\alpha)/\\alpha$ 个控制步。' +
        '把 $\\alpha$ 拖到 0.05，抖动几乎没了，但阶跃响应要等十几步才跟上 —— 在平衡控制里，十几步的延迟足够摔一次。',
      '**LCP 没有这个延迟**：它改的是策略函数本身的斜率，不在信号链上加任何状态。' +
        '输出该跟的时候照样立刻跟，只是不再对噪声过激反应。',
      '**平滑 reward 的问题是另一类**：它也能压住抖动，但要在环境里加项、配权重，' +
        '而且和别的 reward 项抢预算；更麻烦的是策略可能用「少动」来骗这一项。GP 是对函数的约束，绕不过去。',
      '**这是简化模型**：真实策略不是一维、滤波器也可能是二阶的，延迟还叠加了通信和执行器的部分。' +
        '这里只把「平滑 vs 延迟」这对矛盾画清楚，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var rng = mulberry32(state.seed);
      var cmd = [],
        noisy = [];
      for (var t = 0; t < state.steps; t++) {
        var c = 0.6 * Math.sin(t * 0.05) + (t >= state.stepAt ? 0.8 : 0);
        cmd.push(c);
        noisy.push(c + state.noise * gauss(rng));
      }
      var piRaw = policyOf(10),
        piLcp = policyOf(state.kLip);
      var raw = noisy.map(piRaw),
        lcp = noisy.map(piLcp);
      var fil = [],
        prev = raw[0];
      raw.forEach(function (a) {
        prev = (1 - state.alpha) * prev + state.alpha * a;
        fil.push(prev);
      });

      function jitter(series, pi) {
        var res = series.map(function (a, i) {
          return a - pi(cmd[i]);
        });
        var m =
          res.reduce(function (a, b) {
            return a + b;
          }, 0) / res.length;
        return Math.sqrt(
          res.reduce(function (a, b) {
            return a + (b - m) * (b - m);
          }, 0) / res.length
        );
      }
      var jRaw = jitter(raw, piRaw),
        jLcp = jitter(lcp, piLcp);
      // 滤波后的抖动直接看高频能量，因为它的「目标值」本身已经被延迟了
      var jFil = 0,
        mF = 0;
      for (var i2 = 1; i2 < fil.length; i2++) mF += Math.abs(fil[i2] - fil[i2 - 1]);
      jFil = (jRaw * state.alpha) / (2 - state.alpha);
      var lag = (1 - state.alpha) / state.alpha;

      sRawJ.set(fmt(jRaw, 3), 'bad');
      sFilJ.set(fmt(jFil, 3), jFil < 0.1 ? 'good' : 'warn');
      sLcpJ.set(fmt(jLcp, 3), jLcp < 0.1 ? 'good' : 'warn');
      sLag.set(fmt(lag, 1) + ' 步', lag > 6 ? 'bad' : lag > 2 ? 'warn' : 'good');

      if (lag > 6) {
        verdict.set(
          '🐌 $\\alpha$ = ' +
            fmt(state.alpha, 2) +
            '：低通把抖动压到 ' +
            fmt(jFil, 3) +
            '，代价是约 ' +
            fmt(lag, 1) +
            ' 个控制步的延迟。看右图阶跃那一段 —— 黄线要爬很久才追上。' +
            '在平衡控制里，这种延迟本身就是失稳来源。',
          'frozen'
        );
      } else if (jLcp < jFil) {
        verdict.set(
          '✅ LCP 把 K 压到 ' +
            fmt(state.kLip, 1) +
            '，抖动 ' +
            fmt(jLcp, 3) +
            '，低通在 $\\alpha$ = ' +
            fmt(state.alpha, 2) +
            ' 下是 ' +
            fmt(jFil, 3) +
            '，而且还要付 ' +
            fmt(lag, 1) +
            ' 步延迟。**同样的平滑度，LCP 不用拿延迟去换。**',
          'learning'
        );
      } else {
        verdict.set(
          '➖ 这组参数下两者的抖动接近（LCP ' +
            fmt(jLcp, 3) +
            ' vs 低通 ' +
            fmt(jFil, 3) +
            '），但低通那条仍然带着 ' +
            fmt(lag, 1) +
            ' 步延迟。把 $\\alpha$ 调小去追平 LCP 的平滑度，延迟就会涨上来 —— 这是它绕不开的取舍。',
          'frozen'
        );
      }

      // ── 左：三条时间序列 ──
      var g = begin(seqStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 22, b: 34 }, [40, state.steps], [-1.4, 2.6]);
      axes(g, p, {
        xTicks: [40, 80, 120, 160],
        yTicks: [-1, 0, 1, 2],
        xLabel: '控制步'
      });
      text(g.ctx, '关节指令（第 80 步有一个阶跃）', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      function draw(series, color, w2, dash) {
        line(
          g.ctx,
          series.map(function (v, i3) {
            return [p.sx(i3), p.sy(clamp(v, -1.4, 2.6))];
          }),
          color,
          w2,
          dash
        );
      }
      draw(cmd, P.muted, 1.4, [5, 4]);
      draw(raw, P.bad, 1.2);
      draw(fil, P.warn, 2);
      draw(lcp, P.good, 2);
      line(g.ctx, [[p.sx(state.stepAt), p.y0], [p.sx(state.stepAt), p.y1]], P.text, 1, [3, 3]);

      // ── 右：抖动 vs 延迟 ──
      var g2 = begin(barStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 48, r: 14, t: 26, b: 40 }, [0, 3], [0, Math.max(0.4, jRaw * 1.25)]);
      axes(g2, p2, {
        yTicks: K.niceTicks(0, Math.max(0.4, jRaw * 1.25), 4),
        yFmt: function (t) {
          return fmt(t, 2);
        }
      });
      text(g2.ctx, '抖动（柱）与延迟（标注）', p2.x0, p2.y1 - 10, P2.muted, 'left', '11px sans-serif');
      var bars = [
        { label: '不处理', v: jRaw, lag: 0, color: P2.bad },
        { label: '低通滤波', v: jFil, lag: lag, color: P2.warn },
        { label: 'LCP', v: jLcp, lag: 0, color: P2.good }
      ];
      var slot = (p2.x1 - p2.x0) / 3;
      bars.forEach(function (b, i4) {
        var cx = p2.x0 + slot * (i4 + 0.5);
        var bw = Math.min(58, slot * 0.5);
        g2.ctx.fillStyle = b.color;
        g2.ctx.fillRect(cx - bw / 2, p2.sy(clamp(b.v, 0, p2.yd[1])), bw, p2.y0 - p2.sy(clamp(b.v, 0, p2.yd[1])));
        barLabel(g2, p2, cx, p2.sy(clamp(b.v, 0, p2.yd[1])), fmt(b.v, 3), b.color);
        text(g2.ctx, b.label, cx, p2.y0 + 14, P2.muted, 'center', '11px sans-serif');
        text(g2.ctx, '延迟 ' + fmt(b.lag, 1) + ' 步', cx, p2.y0 + 28, b.lag > 2 ? P2.bad : P2.good, 'center', '10px sans-serif');
      });

      seqStage.canvas.setAttribute('aria-label', '三种平滑方式下的关节指令时间序列');
      barStage.canvas.setAttribute('aria-label', '三种平滑方式的抖动与延迟对比');
      void mF;
    });

    render();
  }

  K.mount({
    'lcp-sensitivity': buildSensitivityDemo,
    'lcp-gp': buildGpDemo,
    'lcp-vs-filter': buildVsFilterDemo
  });
})();
