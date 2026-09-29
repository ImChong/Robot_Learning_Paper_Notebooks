/* Interactive LCP demos for
 * papers/01_Foundational_RL/LCP_Sim-to-Real_Action_Smoothing.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["lcp"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   lcp-explainer   — 五幕讲解动画：抖动 = K × σ → 梯度惩罚 → λ_gp 的取舍
 *                     → 对比低通滤波 → 接进 PPO 只多一项 loss
 *   lcp-video       — 同样五幕的配音竖屏视频（可下载）
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

  // ─── demo 4: the five-scene explainer animation ──────────────────────────
  /* LCP 的故事就五件事：抖动 = K × σ / 梯度惩罚约束敏感度 / λ_gp 的取舍 /
     对比低通滤波 / 接进 PPO 只多一项 loss。五幕对应笔记「是怎么做的」的各小节，
     数字与上面三个演示共用 policyOf / taskJ / bestK 与同一组默认参数。 */

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
    C_SURFACE2 = X.surface2;

  /* 一格读数：左边标签（可含公式），右边等宽数字。 */
  function readoutChip(s, cx, y, w, label, value, color) {
    var g = svgEl('g', {});
    g.appendChild(paint(svgEl('rect', { x: cx - w / 2, y: y, width: w, height: 34, rx: 6, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    g.appendChild(svgRich(cx - w / 2 + 12, y + 18, label, { size: 10.5, cls: 'demo-x-mut', w: w * 0.62 }));
    g.appendChild(paint(svgText(cx + w / 2 - 12, y + 22, value, 'demo-x-mono', 11.5, 'end'), color || C_ACCENT));
    s.appendChild(g);
    return g;
  }

  /* ── scene 1: 抖动 = K × σ（与 lcp-sensitivity 的默认参数同源） ── */
  var S1_K = 5;
  var S1_SIGMA = 0.045;
  var S1_STEPS = 120;
  var S1 = (function () {
    var pi = policyOf(S1_K);
    var rng = mulberry32(6);
    var trueA = [],
      noisyA = [],
      resid = [];
    for (var t = 0; t < S1_STEPS; t++) {
      var o = 0.9 * Math.sin(t * 0.055);
      var on = o + S1_SIGMA * gauss(rng);
      trueA.push(pi(o));
      noisyA.push(pi(on));
      resid.push(pi(on) - pi(o));
    }
    var mean =
      resid.reduce(function (a, b) {
        return a + b;
      }, 0) / resid.length;
    var jit = Math.sqrt(
      resid.reduce(function (a, b) {
        return a + (b - mean) * (b - mean);
      }, 0) / resid.length
    );
    return { pi: pi, trueA: trueA, noisyA: noisyA, jit: jit };
  })();

  function buildSceneJitter() {
    var s = sceneSvg('动作抖动的上界是策略敏感度 K 乘观测噪声 σ；σ = 0 的仿真里完全看不出来');
    s.appendChild(svgRich(60, 32, '真机上的抖动 = **观测噪声** $\\sigma$ × **策略敏感度** $K$', { size: 13.5, cls: 'demo-x-ink2', w: 640 }));

    /* 左：π(o) = o + b sin(ω o)，最大斜率 K */
    var LX0 = 60, LX1 = 370, LY0 = 300, LY1 = 84;
    function lx(o) { return LX0 + ((o + 1.2) / 2.4) * (LX1 - LX0); }
    function ly(a) { return LY0 - ((clamp(a, -1.9, 1.9) + 1.9) / 3.8) * (LY0 - LY1); }
    var left = svgEl('g', {});
    left.appendChild(paint(svgEl('rect', { x: LX0 - 12, y: LY1 - 22, width: LX1 - LX0 + 24, height: LY0 - LY1 + 44, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    left.appendChild(paint(svgEl('line', { x1: LX0, y1: ly(0), x2: LX1, y2: ly(0), 'stroke-width': 1 }), null, C_BORDER));
    left.appendChild(paint(svgEl('line', { x1: lx(0), y1: LY1, x2: lx(0), y2: LY0, 'stroke-width': 1 }), null, C_BORDER));
    var curve = [];
    for (var i = 0; i <= 240; i++) {
      var o = -1.2 + (2.4 * i) / 240;
      curve.push([lx(o).toFixed(1), ly(S1.pi(o)).toFixed(1)]);
    }
    left.appendChild(paint(svgEl('path', { d: polyPath(curve), fill: 'none', 'stroke-width': 2.4 }), null, C_GOOD));
    /* 在斜率最大的工作点 o = 0 上，把 ±2σ 的观测噪声带映射成动作带 */
    var lo = -2 * S1_SIGMA, hi = 2 * S1_SIGMA;
    var vBand = paint(svgEl('rect', { x: lx(lo), y: LY1, width: lx(hi) - lx(lo), height: LY0 - LY1, 'fill-opacity': 0.28 }), C_BAD);
    var hBand = paint(svgEl('rect', { x: LX0, y: ly(S1.pi(hi)), width: LX1 - LX0, height: ly(S1.pi(lo)) - ly(S1.pi(hi)), 'fill-opacity': 0.28 }), C_BAD);
    left.appendChild(vBand);
    left.appendChild(hBand);
    left.appendChild(paint(svgEl('circle', { cx: lx(0), cy: ly(0), r: 5, 'stroke-width': 1.6 }), C_ACCENT, C_SURFACE2));
    left.appendChild(svgText(LX0 + 4, LY1 - 8, '策略函数：斜率就是放大倍数', 'demo-x-mut', 10.5));
    left.appendChild(svgRich(lx(0) + 12, LY1 + 12, '$\\pm 2\\sigma$ 的观测噪声', { size: 10, w: 150 }).setTone(C_BAD));
    left.appendChild(svgRich(LX0 + 6, ly(S1.pi(hi)) - 10, '被放大成这么宽的动作带', { size: 10, w: 170 }).setTone(C_BAD));
    s.appendChild(left);

    /* 右：同一个策略的动作序列，先 σ = 0 再 σ = 0.045 */
    var RX0 = 440, RX1 = 750;
    function rx(k) { return RX0 + (k / (S1_STEPS - 1)) * (RX1 - RX0); }
    function ry(a) { return LY0 - ((clamp(a, -2, 2) + 2) / 4) * (LY0 - LY1); }
    var right = svgEl('g', {});
    right.appendChild(paint(svgEl('rect', { x: RX0 - 12, y: LY1 - 22, width: RX1 - RX0 + 24, height: LY0 - LY1 + 44, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    right.appendChild(svgText(RX0 + 4, LY1 - 8, '策略实际发出的关节指令', 'demo-x-mut', 10.5));
    var truth = paint(svgEl('path', {
      d: polyPath(S1.trueA.map(function (v, k) { return [rx(k).toFixed(1), ry(v).toFixed(1)]; })),
      fill: 'none', 'stroke-width': 1.6, 'stroke-dasharray': '5 4'
    }), null, C_MUTED);
    var actual = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 2 }), null, C_ACCENT);
    right.appendChild(truth);
    right.appendChild(actual);
    var tagQuiet = svgRich(RX1 - 4, LY0 - 10, '$\\sigma = 0$（仿真）：干净', { size: 11, anchor: 'end', w: 200 }).setTone(C_ACCENT);
    var tagNoisy = svgRich(RX1 - 4, LY0 - 10, '$\\sigma = ' + fmt(S1_SIGMA, 3) + '$（真机）：发毛', { size: 11, anchor: 'end', w: 200 }).setTone(C_BAD);
    right.appendChild(tagQuiet);
    right.appendChild(tagNoisy);
    s.appendChild(right);

    var chipK = readoutChip(s, 130, 326, 168, '策略敏感度 $K$', fmt(S1_K, 1), C_GOOD);
    var chipSigma = readoutChip(s, 310, 326, 168, '观测噪声 $\\sigma$', fmt(S1_SIGMA, 3), C_BAD);
    var chipBound = readoutChip(s, 490, 326, 168, '上界 $K \\times \\sigma$', fmt(S1_K * S1_SIGMA, 3), C_ACCENT);
    var chipJit = readoutChip(s, 670, 326, 168, '动作抖动 std', fmt(S1.jit, 3), C_BAD);

    var foot = svgRich(400, 396, '$\\sigma$ 是硬件决定的，能改的只有 $K$ —— 让动作平滑，就是把策略对观测的敏感度压下来', { size: 14, anchor: 'middle', w: 760 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(left, seg(t, 0.8, 1.4));
      setOpacity(right, seg(t, 1.6, 2.2));
      setOpacity(chipK, seg(t, 1.0, 1.6));
      setOpacity(vBand, seg(t, 1.6, 2.2));
      setOpacity(hBand, seg(t, 1.9, 2.5));
      var quiet = t < 4.4;
      var n = quiet ? Math.floor(S1_STEPS * ease(seg(t, 2.6, 4.2))) : Math.floor(S1_STEPS * ease(seg(t, 4.6, 7.8)));
      var series = quiet ? S1.trueA : S1.noisyA;
      actual.setAttribute('d', n > 1 ? polyPath(series.slice(0, n).map(function (v, k) { return [rx(k).toFixed(1), ry(v).toFixed(1)]; })) : '');
      paint(actual, null, quiet ? C_ACCENT : C_BAD);
      setOpacity(tagQuiet, quiet ? seg(t, 2.6, 3.2) : 0);
      setOpacity(tagNoisy, quiet ? 0 : seg(t, 4.6, 5.2));
      setOpacity(chipSigma, seg(t, 4.4, 5.0));
      setOpacity(chipBound, seg(t, 8.0, 8.6));
      setOpacity(chipJit, seg(t, 8.35, 8.95));
      setOpacity(foot, seg(t, 10.6, 11.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 2: 梯度惩罚 —— 总目标 J(K) − λ K²（与 lcp-gp 同一组函数） ── */
  var S2_LAMBDA = 0.012;
  var S2_SIGMA = 0.045;
  var S2_K0 = bestK(0);
  var S2_K = bestK(S2_LAMBDA);

  function buildSceneGradPenalty() {
    var s = sceneSvg('梯度有界就是 Lipschitz 连续：在目标里减去 λ 倍的梯度范数平方，总目标的峰值就是学出来的敏感度');
    s.appendChild(svgText(60, 30, '把「别一惊一乍」写进损失函数：梯度有界 ⇒ Lipschitz 连续', 'demo-x-ink2', 13.5));
    var formula = svgMath(400, 60,
      '\\max_\\theta\; J(\\theta) - \\lambda_{gp}\\,\\mathbb{E}_{o \\sim \\mathcal{D}}\\!\\left[\\lVert \\nabla_o \\pi_\\theta(o) \\rVert^2\\right]',
      { size: 12.5, anchor: 'middle', cls: 'demo-x-ink2', w: 700 });
    s.appendChild(formula);

    var PX0 = 70, PX1 = 740, PY0 = 306, PY1 = 92;
    function px(k) { return PX0 + ((k - 0.8) / (15 - 0.8)) * (PX1 - PX0); }
    function py(v) { return PY0 - ((clamp(v, -1, 1.15) + 1) / 2.15) * (PY0 - PY1); }
    var plot = svgEl('g', {});
    plot.appendChild(paint(svgEl('rect', { x: PX0 - 20, y: PY1 - 14, width: PX1 - PX0 + 40, height: PY0 - PY1 + 44, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    plot.appendChild(paint(svgEl('line', { x1: PX0, y1: py(0), x2: PX1, y2: py(0), 'stroke-width': 1 }), null, C_BORDER));
    [1, 5, 10, 15].forEach(function (k) {
      plot.appendChild(svgText(px(k), PY0 + 22, String(k), 'demo-x-mono demo-x-mut', 10, 'middle'));
    });
    plot.appendChild(svgRich(px(12.5), PY0 + 22, '策略敏感度 $K$', { size: 10, anchor: 'middle', cls: 'demo-x-mut', w: 150 }));
    s.appendChild(plot);

    function curveOf(fn) {
      var pts = [];
      for (var i = 0; i <= 200; i++) {
        var k = 0.8 + (14.2 * i) / 200;
        pts.push([px(k).toFixed(1), py(fn(k)).toFixed(1)]);
      }
      return polyPath(pts);
    }
    var jCurve = paint(svgEl('path', { d: curveOf(taskJ), fill: 'none', 'stroke-width': 1.9, 'stroke-dasharray': '5 4' }), null, C_GOOD);
    var gCurve = paint(svgEl('path', { d: curveOf(function (k) { return -S2_LAMBDA * k * k; }), fill: 'none', 'stroke-width': 1.9, 'stroke-dasharray': '5 4' }), null, C_BAD);
    var tCurve = paint(svgEl('path', { d: curveOf(function (k) { return taskJ(k) - S2_LAMBDA * k * k; }), fill: 'none', 'stroke-width': 2.8 }), null, C_ACCENT);
    s.appendChild(jCurve);
    s.appendChild(gCurve);
    s.appendChild(tCurve);

    var jTag = svgRich(PX1 - 4, py(taskJ(14)) - 12, '任务表现 $J(K)$', { size: 10.5, anchor: 'end', w: 140 }).setTone(C_GOOD);
    var gTag = svgRich(px(6.6), py(-S2_LAMBDA * 6.6 * 6.6) - 12, '惩罚 $-\\lambda_{gp} K^2$', { size: 10.5, w: 150 }).setTone(C_BAD);
    var tTag = svgRich(px(2.2), py(taskJ(S2_K) - S2_LAMBDA * S2_K * S2_K) - 22, '总目标', { size: 10.5, anchor: 'end', w: 90 }).setTone(C_ACCENT);
    s.appendChild(jTag);
    s.appendChild(gTag);
    s.appendChild(tTag);

    var peak = svgEl('g', {});
    var peakY = py(taskJ(S2_K) - S2_LAMBDA * S2_K * S2_K);
    peak.appendChild(paint(svgEl('line', { x1: px(S2_K), y1: PY0, x2: px(S2_K), y2: peakY, 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }), null, C_MUTED));
    peak.appendChild(paint(svgEl('circle', { cx: px(S2_K), cy: peakY, r: 5, 'stroke-width': 1.6 }), C_ACCENT, C_SURFACE2));
    peak.appendChild(svgRich(px(S2_K) + 10, PY1 + 2, '$K^* = ' + fmt(S2_K, 2) + '$', { size: 11.5, w: 120 }).setTone(C_ACCENT));
    s.appendChild(peak);

    var chipA = readoutChip(s, 150, 342, 250, '纯 PPO：$K^*$', fmt(S2_K0, 1) + '（推到上限）', C_BAD);
    var chipB = readoutChip(s, 420, 342, 250, '$\\lambda_{gp} = ' + fmt(S2_LAMBDA, 3) + '$：$K^*$', fmt(S2_K, 2), C_GOOD);
    var chipC = readoutChip(s, 660, 342, 210, '真机抖动 $K^* \\sigma$', fmt(S2_K0 * S2_SIGMA, 3) + ' → ' + fmt(S2_K * S2_SIGMA, 3), C_ACCENT);

    var foot = paint(svgText(400, 402, 'PPO 学「做什么动作更赚」，GP 项学「别一惊一乍地做」', null, 14.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(formula, seg(t, 0.8, 1.4));
      setOpacity(plot, seg(t, 1.6, 2.2));
      setOpacity(jCurve, seg(t, 2.2, 3.0));
      setOpacity(jTag, seg(t, 2.6, 3.2));
      setOpacity(gCurve, seg(t, 4.4, 5.2));
      setOpacity(gTag, seg(t, 4.8, 5.4));
      setOpacity(tCurve, seg(t, 6.4, 7.2));
      setOpacity(tTag, seg(t, 6.8, 7.4));
      setOpacity(peak, seg(t, 7.6, 8.4));
      setOpacity(chipA, seg(t, 8.6, 9.2));
      setOpacity(chipB, seg(t, 9.0, 9.6));
      setOpacity(chipC, seg(t, 9.4, 10.0));
      setOpacity(foot, seg(t, 11.0, 11.8));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 3: λ_gp 的三档取舍（同一个 bestK / taskJ） ── */
  var S3_NOISE = 0.045;
  var S3_LAMBDAS = [
    { lam: 0, name: '纯 PPO', color: C_BAD },
    { lam: 0.012, name: 'LCP 的位置', color: C_GOOD },
    { lam: 0.1, name: '压过头', color: C_WARN }
  ];
  S3_LAMBDAS.forEach(function (d) {
    d.k = bestK(d.lam);
    d.j = taskJ(d.k);
    d.jit = d.k * S3_NOISE;
  });
  var S3_DROP = (S3_LAMBDAS[0].j - S3_LAMBDAS[2].j) * 100;
  var S3_DROP_MID = (S3_LAMBDAS[0].j - S3_LAMBDAS[1].j) * 100;

  function buildSceneTradeoff() {
    var s = sceneSvg('λ_gp = 0 时 K 被推到上限；λ_gp 适中时抖动大降、表现几乎不掉；压过头时动作发钝、任务表现明显下降');
    s.appendChild(svgRich(60, 32, '同一个真机噪声 $\\sigma = ' + fmt(S3_NOISE, 3) + '$，三档 $\\lambda_{gp}$', { size: 13.5, cls: 'demo-x-ink2', w: 640 }));

    var cards = S3_LAMBDAS.map(function (d, i) {
      var x = 40 + i * 248;
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: x, y: 58, width: 232, height: 246, rx: 10, 'stroke-width': 1.8 }), C_SURFACE2, d.color));
      g.appendChild(paint(svgText(x + 116, 84, d.name, null, 13.5, 'middle'), d.color));
      g.appendChild(svgMath(x + 116, 108, '\\lambda_{gp} = ' + fmt(d.lam, 3), { size: 12.5, anchor: 'middle', w: 200 }).setTone(d.color));
      g.appendChild(svgRich(x + 16, 142, '学到的 $K^*$', { size: 11, cls: 'demo-x-mut', w: 120 }));
      g.appendChild(paint(svgText(x + 216, 146, fmt(d.k, 2), 'demo-x-mono', 13, 'end'), d.color));
      g.appendChild(svgText(x + 16, 184, '任务表现', 'demo-x-mut', 11));
      g.appendChild(paint(svgEl('rect', { x: x + 16, y: 192, width: 200, height: 12, rx: 3 }), C_SURFACE, null));
      g.appendChild(paint(svgEl('rect', { x: x + 16, y: 192, width: 200 * d.j, height: 12, rx: 3 }), C_GOOD));
      g.appendChild(paint(svgText(x + 216, 184, fmt(d.j, 3), 'demo-x-mono', 11, 'end'), C_GOOD));
      g.appendChild(svgText(x + 16, 234, '真机抖动', 'demo-x-mut', 11));
      g.appendChild(paint(svgEl('rect', { x: x + 16, y: 242, width: 200, height: 12, rx: 3 }), C_SURFACE, null));
      g.appendChild(paint(svgEl('rect', { x: x + 16, y: 242, width: 200 * clamp(d.jit / 0.7, 0, 1), height: 12, rx: 3 }), C_BAD));
      g.appendChild(paint(svgText(x + 216, 234, fmt(d.jit, 3), 'demo-x-mono', 11, 'end'), C_BAD));
      s.appendChild(g);
      return { g: g, at: [1.0, 4.2, 7.2][i] };
    });

    var chip = svgEl('g', {});
    chip.appendChild(paint(svgEl('rect', { x: 70, y: 322, width: 660, height: 34, rx: 17, 'stroke-width': 1, 'stroke-dasharray': '5 4' }), C_SURFACE, C_WARN));
    chip.appendChild(paint(svgText(400, 344, '压过头：抖动确实没了，但任务表现比纯 PPO 低 ' + fmt(S3_DROP, 1) + ' 个百分点 —— 策略变钝了', null, 11.5, 'middle'), C_WARN));
    s.appendChild(chip);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 384, '不是越平滑越好：λ 太小没效果，太大动作发钝', null, 14.5, 'middle'), C_ACCENT));
    foot.appendChild(svgRich(400, 406, '合适的范围还和 $\\sigma$ 有关 —— 换一台传感器更差的机器，系数就得重调', { size: 11.5, anchor: 'middle', cls: 'demo-x-mut', w: 700 }));
    s.appendChild(foot);

    function draw(t) {
      cards.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.6)); });
      setOpacity(chip, seg(t, 9.6, 10.4));
      setOpacity(foot, seg(t, 11.4, 12.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 4: 对比低通滤波（与 lcp-vs-filter 的默认参数、同一组公式） ── */
  var S4 = (function () {
    var alpha = 0.18, kLip = 3.0, noise = 0.05, steps = 160, stepAt = 80;
    var rng = mulberry32(9);
    var cmd = [],
      noisy = [];
    for (var t = 0; t < steps; t++) {
      cmd.push(0.6 * Math.sin(t * 0.05) + (t >= stepAt ? 0.8 : 0));
      noisy.push(cmd[t] + noise * gauss(rng));
    }
    var piRaw = policyOf(10),
      piLcp = policyOf(kLip);
    var raw = noisy.map(piRaw),
      lcp = noisy.map(piLcp);
    var fil = [],
      prev = raw[0];
    raw.forEach(function (a) {
      prev = (1 - alpha) * prev + alpha * a;
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
    var jRaw = jitter(raw, piRaw);
    return {
      alpha: alpha,
      kLip: kLip,
      steps: steps,
      stepAt: stepAt,
      cmd: cmd,
      raw: raw,
      fil: fil,
      lcp: lcp,
      jRaw: jRaw,
      jFil: (jRaw * alpha) / (2 - alpha),
      jLcp: jitter(lcp, piLcp),
      lag: (1 - alpha) / alpha
    };
  })();

  function buildSceneVsFilter() {
    var s = sceneSvg('低通滤波把抖动压下去，代价是阶跃响应要滞后好几个控制步；LCP 直接压策略斜率，没有这个延迟');
    s.appendChild(svgRich(60, 32, '同一段带噪指令，第 80 步有个阶跃：**滤波** vs **LCP**', { size: 13.5, cls: 'demo-x-ink2', w: 640 }));

    var PX0 = 60, PX1 = 750, PY0 = 296, PY1 = 92;
    function px(k) { return PX0 + ((k - 40) / (S4.steps - 1 - 40)) * (PX1 - PX0); }
    function py(v) { return PY0 - ((clamp(v, -1.4, 2.6) + 1.4) / 4) * (PY0 - PY1); }
    var frame = svgEl('g', {});
    frame.appendChild(paint(svgEl('rect', { x: PX0 - 16, y: PY1 - 18, width: PX1 - PX0 + 32, height: PY0 - PY1 + 36, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    frame.appendChild(paint(svgEl('line', { x1: px(S4.stepAt), y1: PY1, x2: px(S4.stepAt), y2: PY0, 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }), null, C_MUTED));
    frame.appendChild(svgText(px(S4.stepAt) + 6, PY1 + 10, '阶跃', 'demo-x-mut', 10.5));
    s.appendChild(frame);

    function pathOf(series, n) {
      var pts = [];
      for (var k = 40; k < n; k++) pts.push([px(k).toFixed(1), py(series[k]).toFixed(1)]);
      return pts.length > 1 ? polyPath(pts) : '';
    }
    var cmdLine = paint(svgEl('path', { d: pathOf(S4.cmd, S4.steps), fill: 'none', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }), null, C_MUTED);
    var rawLine = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 1.2 }), null, C_BAD);
    var filLine = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 2.4 }), null, C_WARN);
    var lcpLine = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 2.4 }), null, C_GOOD);
    s.appendChild(cmdLine);
    s.appendChild(rawLine);
    s.appendChild(filLine);
    s.appendChild(lcpLine);

    var lg = svgEl('g', {});
    [['指令（真值）', C_MUTED, 74], ['不处理 $K = 10$', C_BAD, 220], ['低通滤波 $\\alpha = ' + fmt(S4.alpha, 2) + '$', C_WARN, 380], ['LCP：$K$ 压到 ' + fmt(S4.kLip, 1), C_GOOD, 570]].forEach(function (it) {
      lg.appendChild(paint(svgEl('line', { x1: it[2] - 22, y1: 52, x2: it[2] - 6, y2: 52, 'stroke-width': 3 }), null, it[1]));
      lg.appendChild(svgRich(it[2], 56, it[0], { size: 10.5, cls: 'demo-x-ink2', w: 170 }));
    });
    s.appendChild(lg);

    var chipRaw = readoutChip(s, 130, 322, 168, '不处理的抖动', fmt(S4.jRaw, 3), C_BAD);
    var chipFil = readoutChip(s, 310, 322, 168, '低通后的抖动', fmt(S4.jFil, 3), C_WARN);
    var chipLag = readoutChip(s, 490, 322, 168, '低通引入的延迟', fmt(S4.lag, 1) + ' 步', C_BAD);
    var chipLcp = readoutChip(s, 670, 322, 168, 'LCP 的抖动', fmt(S4.jLcp, 3), C_GOOD);

    var foot = svgRich(400, 396, '低通拿延迟换平滑；LCP 直接压斜率，信号链上没有这份延迟', { size: 14.5, anchor: 'middle', w: 720 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(frame, seg(t, 0.3, 0.9));
      setOpacity(lg, seg(t, 0.5, 1.1));
      setOpacity(cmdLine, seg(t, 1.2, 1.8));
      rawLine.setAttribute('d', pathOf(S4.raw, 40 + Math.floor((S4.steps - 40) * ease(seg(t, 1.4, 3.6)))));
      setOpacity(rawLine, t > 8.2 ? 0.35 : 1);
      filLine.setAttribute('d', pathOf(S4.fil, 40 + Math.floor((S4.steps - 40) * ease(seg(t, 3.8, 6.0)))));
      lcpLine.setAttribute('d', pathOf(S4.lcp, 40 + Math.floor((S4.steps - 40) * ease(seg(t, 8.4, 10.4)))));
      setOpacity(chipRaw, seg(t, 3.0, 3.6));
      setOpacity(chipFil, seg(t, 5.6, 6.2));
      setOpacity(chipLag, seg(t, 6.0, 6.6));
      setOpacity(chipLcp, seg(t, 10.2, 10.8));
      setOpacity(foot, seg(t, 10.6, 11.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 5: 接进 PPO —— 只多一项 loss（MimicKit lcp_agent.py） ── */
  function buildSceneLoop() {
    var s = sceneSvg('LCPAgent 继承 PPOAgent：rollout、优势、critic 都与 PPO 相同，只在 actor 更新里多加一项梯度惩罚');
    s.appendChild(svgText(60, 30, 'LCP 接进 PPO：不改 rollout、不改奖励、不改网络，只改 actor 那一步', 'demo-x-ink2', 13.5));

    var arrow = K.arrowMarker(s, 'lcp-x-arrow-loop', C_MUTED);
    var steps = [
      { y: 52, text: 'rollout：4096 个并行环境采样（同 PPO）', tone: C_MUTED },
      { y: 100, text: '优势：TD(λ) 回报 + GAE（同 PPO）', tone: C_MUTED },
      { y: 148, text: 'critic 更新：MSE（同 PPO）', tone: C_MUTED },
      { y: 196, text: 'actor：标准 PPO-Clip loss', tone: C_ACCENT },
      { y: 244, tex: '+\\ \\lambda_{gp}\\, \\lVert \\nabla_o \\log \\pi(a \\mid o) \\rVert^2', tone: C_GOOD },
      { y: 292, text: 'SGD 一步更新（二阶梯度回传）', tone: C_MUTED }
    ];
    var nodes = steps.map(function (st, i) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: 40, y: st.y, width: 330, height: 38, rx: 8, 'stroke-width': i === 4 ? 2.2 : 1.4 }), C_SURFACE2, st.tone));
      if (st.tex) g.appendChild(svgMath(205, st.y + 24, st.tex, { size: 11.5, anchor: 'middle', w: 320 }).setTone(st.tone));
      else g.appendChild(paint(svgText(205, st.y + 24, st.text, null, 11.5, 'middle'), st.tone === C_MUTED ? null : st.tone));
      if (i > 0) g.appendChild(paint(svgEl('line', { x1: 205, y1: st.y - 9, x2: 205, y2: st.y - 1, 'stroke-width': 1.3, 'marker-end': arrow }), null, C_MUTED));
      s.appendChild(g);
      return g;
    });

    var code = svgEl('g', {});
    code.appendChild(paint(svgEl('rect', { x: 400, y: 52, width: 370, height: 278, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    code.appendChild(svgText(414, 74, 'lcp_agent.py', 'demo-x-mut', 10.5));
    var lines = [
      { y: 100, s: 'info = super()._compute_actor_loss(batch)', tone: null, at: 3.6 },
      { y: 122, s: 'lcp_loss = self._compute_lcp_loss(norm_obs, norm_a)', tone: C_GOOD, at: 3.6 },
      { y: 160, s: 'torch.autograd.grad(a_logp, norm_obs,', tone: C_GOOD, at: 5.6 },
      { y: 178, s: '                    create_graph=True)', tone: C_GOOD, at: 5.6 },
      { y: 216, s: 'info["actor_loss"] += self._lcp_weight * lcp_loss', tone: C_ACCENT, at: 8.2 },
      { y: 254, s: 'lcp_weight: 0.002', tone: C_ACCENT, at: 8.2 },
      { y: 290, s: 'optimizer: SGD, learning_rate: 1e-4', tone: null, at: 10.6 }
    ].map(function (ln) {
      var t = paint(svgText(414, ln.y, ln.s, 'demo-x-mono', 10.5), ln.tone);
      t.setAttribute('xml:space', 'preserve');
      t.style.whiteSpace = 'pre';
      code.appendChild(t);
      return { node: t, at: ln.at };
    });
    s.appendChild(code);

    var foot = paint(svgText(400, 392, 'PPO 是主菜，LCP 是调味和收汁 —— 继承 PPOAgent，只多一项 loss', null, 14.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      var at = [0.6, 1.0, 1.4, 3.4, 5.4, 8.0];
      nodes.forEach(function (g, i) { setOpacity(g, seg(t, at[i], at[i] + 0.5)); });
      setOpacity(code, seg(t, 3.0, 3.6));
      lines.forEach(function (ln) { setOpacity(ln.node, seg(t, ln.at, ln.at + 0.5)); });
      setOpacity(foot, seg(t, 12.4, 13.2));
    }

    return { el: s, draw: draw };
  }

  var LCP_SCENES = [
    {
      title: '抖动 = $K \\times \\sigma$',
      dur: 13,
      build: buildSceneJitter,
      cues: [
        { at: 0.3, s: '抖动从哪来？观测里有噪声 $\\sigma$，策略会把它放大 $K$ 倍再送进关节。' },
        { at: 1.0, s: '左图：$\\pi(o) = o + b\\sin(\\omega o)$，它的最大斜率就是 Lipschitz 常数 $K$；这里 $K$ = **' + fmt(S1_K, 1) + '**。' },
        { at: 2.6, s: '仿真里的理想传感器 $\\sigma = 0$：这个 $K = ' + fmt(S1_K, 1) + '$ 的策略输出**完全干净** —— 仿真根本测不出这个问题。' },
        { at: 4.4, s: '换成真机量级 $\\sigma$ = **' + fmt(S1_SIGMA, 3) + '**：同一个策略，动作序列开始发毛，抖动 std = **' + fmt(S1.jit, 3) + '**。' },
        { at: 8.0, s: '抖动的上界是 $K \\times \\sigma$ = **' + fmt(S1_K * S1_SIGMA, 3) + '**。$\\sigma$ 是硬件决定的，你改不了；能改的只有 $K$。' },
        { at: 10.6, s: '所以「让动作平滑」，等价于「把策略对观测的敏感度压下来」。' }
      ]
    },
    {
      title: '梯度惩罚约束敏感度',
      dur: 14,
      build: buildSceneGradPenalty,
      cues: [
        { at: 0.3, s: '怎么压 $K$？全局 Lipschitz 常数很难算，但**梯度有界，函数就是 Lipschitz 连续的**。' },
        { at: 0.8, s: '所以直接在目标里减去一项梯度惩罚：$\\max_\\theta J(\\theta) - \\lambda_{gp}\\,\\mathbb{E}[\\lVert\\nabla_o\\pi\\rVert^2]$。' },
        { at: 2.2, s: '任务表现 $J(K)$：策略越灵敏越能追指令，但**收益递减**。' },
        { at: 4.4, s: '梯度惩罚 $-\\lambda_{gp} K^2$（$\\lambda_{gp}$ = ' + fmt(S2_LAMBDA, 3) + '）：是二次的，$K$ 越大罚得越狠。' },
        { at: 6.4, s: '两条相加得到总目标，**峰值落在哪里，就是训出来的敏感度** $K^*$ = ' + fmt(S2_K, 2) + '。' },
        { at: 8.6, s: '$\\lambda_{gp}$ = 0 时没有任何东西拦着：$K^*$ 被一路推到搜索上限 ' + fmt(S2_K0, 1) + '，真机抖动 ' + fmt(S2_K0 * S2_SIGMA, 3) + '。' },
        { at: 11.0, s: 'PPO 学「做什么动作更赚」，LCP 学「别一惊一乍地做」。' }
      ]
    },
    {
      title: '$\\lambda_{gp}$ 的取舍',
      dur: 14,
      build: buildSceneTradeoff,
      cues: [
        { at: 0.3, s: '$\\lambda_{gp}$ **不是越大越好**。同一个真机噪声 $\\sigma$ = ' + fmt(S3_NOISE, 3) + '，看三档。' },
        { at: 1.0, s: '$\\lambda_{gp}$ = 0，纯 PPO：$K^*$ = **' + fmt(S3_LAMBDAS[0].k, 1) + '**，任务表现 ' + fmt(S3_LAMBDAS[0].j, 3) + '，但真机抖动 **' + fmt(S3_LAMBDAS[0].jit, 3) + '**。' },
        { at: 4.2, s: '$\\lambda_{gp}$ = ' + fmt(S3_LAMBDAS[1].lam, 3) + '：$K^*$ = **' + fmt(S3_LAMBDAS[1].k, 2) + '**，抖动降到 ' + fmt(S3_LAMBDAS[1].jit, 3) + '，任务表现掉 ' + fmt(S3_DROP_MID, 1) + ' 个百分点 —— 演示里把这一段当作 LCP 想要的位置。' },
        { at: 7.2, s: '$\\lambda_{gp}$ = ' + fmt(S3_LAMBDAS[2].lam, 1) + '，压过头：$K^*$ 只剩 **' + fmt(S3_LAMBDAS[2].k, 2) + '**，抖动几乎没了，可任务表现低了 **' + fmt(S3_DROP, 1) + '** 个百分点。' },
        { at: 9.6, s: '太小没效果，太大动作发钝 —— 论文自己也承认 **$\\lambda_{gp}$ 仍要调**，而不是一劳永逸。' },
        { at: 11.4, s: '合适的范围还和 $\\sigma$ 有关：换一台传感器更差的机器，这个系数就得重调。' }
      ]
    },
    {
      title: '对比低通滤波',
      dur: 14,
      build: buildSceneVsFilter,
      cues: [
        { at: 0.3, s: '另一条路：不动策略，在输出端加一个**低通滤波器**。' },
        { at: 1.4, s: '同一段带噪指令，第 80 步有个阶跃。红线是 $K = 10$ 什么都不做，抖得最凶，抖动 **' + fmt(S4.jRaw, 3) + '**。' },
        { at: 3.8, s: '黄线是低通（$\\alpha$ = ' + fmt(S4.alpha, 2) + '）：抖动压到 **' + fmt(S4.jFil, 3) + '**，比 LCP 还低，可阶跃要爬很久才追上。' },
        { at: 6.2, s: '一阶低通的群延迟约 $(1-\\alpha)/\\alpha$ = **' + fmt(S4.lag, 1) + '** 个控制步 —— 平衡控制里，这份延迟本身就是失稳来源。' },
        { at: 8.4, s: '绿线是 LCP（$K$ 压到 ' + fmt(S4.kLip, 1) + '）：抖动 **' + fmt(S4.jLcp, 3) + '**，比不处理低 ' + fmt(S4.jRaw / S4.jLcp, 1) + ' 倍，阶跃**立刻跟上**。' },
        { at: 10.6, s: '低通治的是症状，$K$ 还在，还多了延迟；LCP 改的是策略函数本身，**不在信号链上加任何状态**。' }
      ]
    },
    {
      title: '接进 PPO：只多一项 loss',
      dur: 14,
      build: buildSceneLoop,
      cues: [
        { at: 0.3, s: 'LCP 不是新算法，是 PPO 上面的一个正则项：`LCPAgent` 继承 `PPOAgent`，全文不到 50 行。' },
        { at: 1.0, s: 'rollout、优势估计、critic 更新都和 PPO 一样，网络结构也一样。' },
        { at: 3.6, s: '唯一的差别在 actor 更新：先算标准 PPO-Clip loss，再算一项 `_compute_lcp_loss()`。' },
        { at: 5.6, s: '对 `log_prob` 关于观测求梯度、取范数平方 $\\lVert\\nabla_o\\log\\pi(a \\mid o)\\rVert^2$，`create_graph=True` 让二阶梯度能回传。' },
        { at: 8.2, s: '按权重合入：`actor_loss += lcp_weight * lcp_loss`，$\\lambda_{gp}$ = **0.002**。' },
        { at: 10.6, s: '论文用 SGD（学习率 $10^{-4}$）而不是 Adam；笔记里的解释是，这样 GP 项和策略项的优化节奏更匹配。' },
        { at: 12.4, s: '一句话：**PPO 是主菜，LCP 是调味和收汁** —— 只多一个方法、一项 loss。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '五幕动画：LCP 全流程速览',
      sub: '约 69 秒自动播放。空格播放/暂停，← → 换幕；画面里的数字与下面三个演示用的是同一份函数。',
      ariaLabel: 'LCP 五幕讲解动画',
      notes: [
        '取数依据：第一幕的 $K$、$\\sigma$ 与抖动 std 来自下面「抖动是怎么来的」演示的默认参数（$K$ = 5、$\\sigma$ = 0.045、同一个随机种子）；' +
          '第二、三幕的 $K^*$、任务表现、真机抖动由「$\\lambda_{gp}$」演示里的同一套 `taskJ` / `bestK` 现算；' +
          '第四幕的三条曲线与延迟公式 $(1-\\alpha)/\\alpha$ 来自「三种办法」演示的默认参数。',
        '第五幕的代码摘自笔记「MimicKit 源码对照」：`lcp_agent.py` 的 `_compute_actor_loss` / `_compute_lcp_loss`，`lcp_weight: 0.002`，SGD 学习率 $10^{-4}$。',
        '**这几幕里的玩具模型和下面三个演示同源**：策略取成一维的 $\\pi(o) = o + b\\sin(\\omega o)$，$J(K)$ 是一条编出来的饱和曲线，滤波器是一阶的。' +
          '定性结论（抖动上界 = $K \\times \\sigma$、二次惩罚让最优 $K$ 单调下降、低通要付延迟而 LCP 不用）成立，**具体数值不能和论文直接比**。'
      ],
      scenes: LCP_SCENES
    });
  }

  // ─── the narrated vertical video of the same five scenes ─────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：LCP 五幕全流程',
      sub: '4 分 35 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的五幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '6.3 MB',
      fileName: 'LCP_讲解视频.mp4'
    });
  }

  K.mount({
    'lcp-explainer': buildExplainerDemo,
    'lcp-video': buildVideoDemo,
    'lcp-sensitivity': buildSensitivityDemo,
    'lcp-gp': buildGpDemo,
    'lcp-vs-filter': buildVsFilterDemo
  });
})();
