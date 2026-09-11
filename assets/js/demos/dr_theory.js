/* Interactive demos for papers/01_Foundational_RL/
 * Domain_Randomization_Understanding_Sim-to-Real_Transfer（DR 的理论分析）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["dr_theory"]`, after assets/js/demos/kit.js. The note itself may
 * only contain empty placeholders, because scripts/sanitize_paper_html.py
 * strips <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   drt-gap    — gap ≤ ε_approx + ε_stat：随机化区间宽一点还是窄一点
 *   drt-memory — 为什么 DR 必须配历史依赖策略：历史是在做在线系统辨识
 *   drt-sysid  — DR vs System Identification：峰值高的那个，窄
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
    registerRenderer = K.registerRenderer,
    mulberry32 = K.mulberry32,
    gauss = K.gauss;

  // 笔记里的例子：脚底摩擦 μ ∈ [0.3, 1.2]，真实值 μ* ≈ 0.6（未知）
  var MU_LO = 0.0,
    MU_HI = 1.8,
    MU_STAR_DEFAULT = 0.6;

  // ─── demo 1: gap ≤ ε_approx + ε_stat ─────────────────────────────────────
  function buildGapDemo(host) {
    var root = card(host, {
      title: '随机化区间：太窄覆盖不到，太宽学不动',
      sub:
        '论文的界是 gap ≤ ε_approx（覆盖误差）+ ε_stat（样本复杂度）。' +
        '笔记里的默认例子是 μ ~ U(0.3, 1.2)、真实 μ* ≈ 0.6。拖动区间和真实值，看这两项怎么反向变化。'
    });

    var state = { lo: 0.3, hi: 1.2, muStar: MU_STAR_DEFAULT, n: 3000 };

    var ctrls = controlsRow(root);
    var loSlider = slider(ctrls, {
      label: '随机化下界',
      min: MU_LO,
      max: MU_HI,
      step: 0.02,
      value: state.lo,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.lo = Math.min(v, state.hi - 0.04);
        render();
      }
    });
    var hiSlider = slider(ctrls, {
      label: '随机化上界',
      min: MU_LO,
      max: MU_HI,
      step: 0.02,
      value: state.hi,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.hi = Math.max(v, state.lo + 0.04);
        render();
      }
    });
    slider(ctrls, {
      label: '真实世界的摩擦 μ*（未知）',
      min: MU_LO,
      max: MU_HI,
      step: 0.01,
      value: state.muStar,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.muStar = v;
        render();
      }
    });
    slider(ctrls, {
      label: '训练样本量 N',
      min: 200,
      max: 20000,
      step: 100,
      value: state.n,
      format: function (v) {
        return fmt(v / 1000, 1) + 'k';
      },
      onInput: function (v) {
        state.n = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '笔记的例子（0.3~1.2，μ*=0.6）', function () {
      state.lo = 0.3;
      state.hi = 1.2;
      state.muStar = 0.6;
      loSlider.set(0.3, true);
      hiSlider.set(1.2, true);
      render();
    });
    button(btns, '真实值比训练分布还滑（μ*=0.1）', function () {
      state.muStar = 0.1;
      render();
    });

    var setLegend = legend(root, [
      { key: 'accent', text: '随机化分布 p(θ)' },
      { key: 'good', text: '真实 μ*（落在分布内）' },
      { key: 'bad', text: '真实 μ*（落在分布外）' }
    ]);

    var grid = stageGrid(root);
    var distStage = stage(grid, 240);
    var gapStage = stage(grid, 240);

    var stats = statsRow(root);
    var sIn = stats.add('μ* 在分布内吗');
    var sApprox = stats.add('ε_approx');
    var sStat = stats.add('ε_stat');
    var sGap = stats.add('gap 上界');
    var verdict = verdictBox(root);

    note(root, [
      '**两项是反向的，所以有最优宽度**：区间越宽，覆盖误差越小（ε_approx ↓），' +
        '但要在整个 MDP 集合上都学好需要更多样本（ε_stat ↑）。论文的贡献就是把这件事写成了一个可以讨论的界，' +
        '而不是「试试这个范围、不行再调」。',
      '**但两种失败不对称**：覆盖不到是断崖式的（策略从没见过这么滑的地面），' +
        '样本不够只是慢一点、保守一点。所以笔记里那条实战推论「宁可偏大」是对的 —— 它说的是**风险不对称**，' +
        '不是说 ε_stat 不存在。',
      '**样本量能买回一部分宽度**：把 N 拖大，ε_stat 按 √N 下降，宽区间的代价就变小了。' +
        '这也是为什么并行仿真（几千个 env）出来以后，大家敢把随机化范围开得更大。',
      '**这是简化模型**：论文的界是关于无限时域 MDP 学习复杂度的，形式比这复杂得多。' +
        '这里用 ε_approx ∝ 越界距离²、ε_stat ∝ 区间宽度/√N 复现它的形状，数值不能和论文比。'
    ]);

    function terms(lo, hi, muStar, n) {
      var out = muStar < lo ? lo - muStar : muStar > hi ? muStar - hi : 0;
      var eApprox = out > 0 ? 1.4 * out * out + 0.25 * out : 0.01;
      var eStat = (4 * (hi - lo)) / Math.sqrt(n);
      return { out: out, eApprox: eApprox, eStat: eStat, gap: eApprox + eStat };
    }

    var render = registerRenderer(function () {
      var t = terms(state.lo, state.hi, state.muStar, state.n);
      var inside = t.out === 0;

      sIn.set(inside ? '在 ✔' : '不在 ✘（差 ' + fmt(t.out, 2) + '）', inside ? 'good' : 'bad');
      sApprox.set(fmt(t.eApprox, 3), inside ? 'good' : 'bad');
      sStat.set(fmt(t.eStat, 3), t.eStat < 0.05 ? 'good' : 'warn');
      sGap.set(fmt(t.gap, 3), t.gap < 0.08 ? 'good' : t.gap > 0.25 ? 'bad' : 'warn');

      if (!inside) {
        verdict.set(
          '💥 μ* = ' +
            fmt(state.muStar, 2) +
            ' 落在 [' +
            fmt(state.lo, 2) +
            ', ' +
            fmt(state.hi, 2) +
            '] 之外 ' +
            fmt(t.out, 2) +
            '：ε_approx 冲到 ' +
            fmt(t.eApprox, 3) +
            '，整个界直接失效。策略在仿真里从没踩过这么滑的地，它在真机上会做什么没人知道。',
          'frozen'
        );
      } else if (t.eStat > 0.09) {
        verdict.set(
          '🐌 覆盖没问题，但区间宽 ' +
            fmt(state.hi - state.lo, 2) +
            ' 而样本只有 ' +
            fmt(state.n / 1000, 1) +
            'k：ε_stat = ' +
            fmt(t.eStat, 3) +
            ' 成了主要项。要在整个 MDP 集合上都学好，样本量得跟上 —— 把 N 拖大看它怎么降。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ μ* 落在区间内，gap ≤ ' +
            fmt(t.gap, 3) +
            '（覆盖 ' +
            fmt(t.eApprox, 3) +
            ' + 统计 ' +
            fmt(t.eStat, 3) +
            '）。**一条真实世界的样本都没用过** —— 这就是论文说的「mild conditions 下 DR 可以无需现实样本」。',
          'learning'
        );
      }

      // ── 左：θ 轴上的分布 ──
      var g = begin(distStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 22, b: 34 }, [MU_LO, MU_HI], [0, 1.6]);
      axes(g, p, {
        xTicks: [0, 0.45, 0.9, 1.35, 1.8],
        yTicks: [0, 0.5, 1, 1.5],
        xFmt: function (x) {
          return fmt(x, 2);
        },
        yFmt: function (y) {
          return fmt(y, 1);
        },
        xLabel: '摩擦系数 μ（物理参数 θ）'
      });
      text(g.ctx, '仿真器 = 一族 MDP，M_θ 按 p(θ) 采样', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var dens = 1 / (state.hi - state.lo);
      g.ctx.save();
      g.ctx.fillStyle = P.accent;
      g.ctx.globalAlpha = 0.22;
      g.ctx.fillRect(p.sx(state.lo), p.sy(Math.min(dens, 1.55)), p.sx(state.hi) - p.sx(state.lo), p.y0 - p.sy(Math.min(dens, 1.55)));
      g.ctx.restore();
      line(
        g.ctx,
        [
          [p.sx(state.lo), p.y0],
          [p.sx(state.lo), p.sy(Math.min(dens, 1.55))],
          [p.sx(state.hi), p.sy(Math.min(dens, 1.55))],
          [p.sx(state.hi), p.y0]
        ],
        P.accent,
        2.2
      );
      line(g.ctx, [[p.sx(state.muStar), p.y0], [p.sx(state.muStar), p.y1]], inside ? P.good : P.bad, 2.4, [4, 3]);
      dot(g.ctx, p.sx(state.muStar), p.y1 + 10, 5, inside ? P.good : P.bad, P.surface2);
      text(g.ctx, 'μ* = ' + fmt(state.muStar, 2), p.sx(state.muStar), p.y1 + 24, inside ? P.good : P.bad, 'center', '10px monospace');

      // ── 右：两项随区间宽度 ──
      var g2 = begin(gapStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [0.05, 1.8], [0, 0.3]);
      axes(g2, p2, {
        xTicks: [0.05, 0.5, 1, 1.5],
        yTicks: [0, 0.075, 0.15, 0.225, 0.3],
        xFmt: function (x) {
          return fmt(x, 1);
        },
        yFmt: function (y) {
          return fmt(y, 2);
        },
        xLabel: '区间宽度（中心不动，只变宽窄）'
      });
      text(g2.ctx, 'gap 的两项：一个降一个升', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var aPts = [],
        sPts = [],
        tPts = [];
      for (var i = 0; i <= 140; i++) {
        var w = 0.05 + (1.75 * i) / 140;
        // 以当前区间中心为准，只变宽度
        var c = (state.lo + state.hi) / 2;
        var tt = terms(c - w / 2, c + w / 2, state.muStar, state.n);
        aPts.push([p2.sx(w), p2.sy(clamp(tt.eApprox, 0, 0.3))]);
        sPts.push([p2.sx(w), p2.sy(clamp(tt.eStat, 0, 0.3))]);
        tPts.push([p2.sx(w), p2.sy(clamp(tt.gap, 0, 0.3))]);
      }
      line(g2.ctx, aPts, P2.bad, 1.8, [5, 4]);
      line(g2.ctx, sPts, P2.warn, 1.8, [5, 4]);
      line(g2.ctx, tPts, P2.accent, 2.6);
      text(g2.ctx, 'ε_approx（覆盖）', p2.x0 + 8, p2.sy(0.283), P2.bad, 'left', '10px sans-serif');
      text(g2.ctx, 'ε_stat（样本）', p2.x0 + 8, p2.sy(0.262), P2.warn, 'left', '10px sans-serif');
      line(g2.ctx, [[p2.sx(state.hi - state.lo), p2.y0], [p2.sx(state.hi - state.lo), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(state.hi - state.lo), p2.sy(clamp(t.gap, 0, 0.3)), 4.5, P2.accent, P2.surface2);

      distStage.canvas.setAttribute('aria-label', '随机化分布与真实参数在 μ 轴上的位置');
      gapStage.canvas.setAttribute('aria-label', '覆盖误差与样本复杂度随区间宽度的变化');
    });

    render();
  }

  // ─── demo 2: 为什么必须带历史 ────────────────────────────────────────────
  /* 每一步机器人能观测到一个「打滑信号」，它是 μ 的带噪读数。
     Markov 策略看不到历史，只能对整个区间取一个保守的平均动作；
     带 H 步历史的策略可以先估 μ̂，再用对应的最优动作。 */
  function optimalAction(mu) {
    return 0.35 + 0.75 * mu; // 地面越涩，可以蹬得越用力
  }

  function valueOf(action, mu) {
    var a = optimalAction(mu);
    return clamp(1 - 2.2 * (action - a) * (action - a), 0, 1);
  }

  function buildMemoryDemo(host) {
    var root = card(host, {
      title: '历史不是锦上添花：它是在做在线系统辨识',
      sub:
        '同一个姿态、同一个观测，在 μ = 0.3 和 μ = 1.2 下需要的力矩完全不同。' +
        'Markov 策略只能给一个折中值；带历史的策略可以先从打滑信号把 μ 认出来。'
    });

    var state = { hist: 8, noise: 0.42, lo: 0.3, hi: 1.2, muStar: 0.45, seed: 15 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '策略能看到几步历史',
      min: 0,
      max: 40,
      step: 1,
      value: state.hist,
      format: function (v) {
        return v === 0 ? 'Markov（0 步）' : fmt(v, 0) + ' 步';
      },
      onInput: function (v) {
        state.hist = v;
        render();
      }
    });
    slider(ctrls, {
      label: '打滑信号的噪声',
      min: 0.05,
      max: 1.2,
      step: 0.01,
      value: state.noise,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.noise = v;
        render();
      }
    });
    slider(ctrls, {
      label: '这一集抽到的真实 μ',
      min: 0.3,
      max: 1.2,
      step: 0.01,
      value: state.muStar,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.muStar = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, 'Markov 策略（0 步历史）', function () {
      state.hist = 0;
      render();
    });
    button(btns, '换一集', function () {
      state.seed = (state.seed * 1103515245 + 12345) % 99991;
      render();
    });

    var setLegend = legend(root, [
      { key: 'accent', text: 'H 步历史之后对 μ 的后验' },
      { key: 'muted', text: '先验 U(0.3, 1.2)' },
      { key: 'good', text: '带历史的策略' },
      { key: 'bad', text: 'Markov 策略' }
    ]);

    var grid = stageGrid(root);
    var postStage = stage(grid, 240);
    var valStage = stage(grid, 240);

    var tb = table(root);
    var cells = [];
    (function () {
      tb.row(['', 'Markov 策略', '带 H 步历史'], true);
      ['它认为的 μ', '它发出的动作', '在真实 μ 下的回报'].forEach(function (lab) {
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
    var sPost = stats.add('后验标准差');
    var sMk = stats.add('Markov 回报');
    var sMem = stats.add('带历史回报');
    var sGain = stats.add('历史值多少');
    var verdict = verdictBox(root);

    note(root, [
      '**这就是论文那条结论的机制**：DR 把环境变成了部分可观测问题 —— ' +
        '真实的 θ 藏在动力学里，当前状态一个人说不清。历史把它显式地暴露出来，策略才可能「对症下药」。',
      '**Markov 策略不是学得不好，是信息不够**：它的最优解就是对整个 θ 分布取平均。' +
        '区间越宽，这个平均越保守 —— 把随机化区间拉宽而不给历史，只会让策略越来越畏手畏脚。',
      '**噪声大的时候历史更值钱**：把噪声拖大，后验收敛得慢，需要更多步才认得出 μ。' +
        '这也解释了为什么工程上常见的做法是 LSTM/GRU 或者堆一段观测窗口，而不是只给一帧。',
      '**这是简化模型**：真实策略不会显式算后验，它是把辨识隐式地学进网络权重里的（ROA、teacher-student 都是这条路）。' +
        '这里用一个高斯后验把「历史 → 辨识 → 对症动作」这条链画出来，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var prior = (state.hi - state.lo) / Math.sqrt(12);
      var postSd = state.hist > 0 ? 1 / Math.sqrt(1 / (prior * prior) + state.hist / (state.noise * state.noise)) : prior;
      var rng = mulberry32(state.seed);
      // 观测均值：μ* 的带噪读数
      var obsMean = state.muStar + (state.hist > 0 ? (state.noise / Math.sqrt(state.hist)) * gauss(rng) : 0);
      var priorMean = (state.lo + state.hi) / 2;
      var postMean =
        state.hist > 0
          ? (priorMean / (prior * prior) + (state.hist * obsMean) / (state.noise * state.noise)) /
            (1 / (prior * prior) + state.hist / (state.noise * state.noise))
          : priorMean;

      var aMk = optimalAction(priorMean);
      var aMem = optimalAction(clamp(postMean, MU_LO, MU_HI));
      var vMk = valueOf(aMk, state.muStar);
      var vMem = valueOf(aMem, state.muStar);

      sPost.set(fmt(postSd, 3), postSd < 0.08 ? 'good' : postSd > 0.2 ? 'bad' : 'warn');
      sMk.set(fmt(vMk, 3), vMk > 0.85 ? 'good' : 'bad');
      sMem.set(fmt(vMem, 3), vMem > 0.85 ? 'good' : 'warn');
      sGain.set((vMem >= vMk ? '+' : '') + fmt((vMem - vMk) * 100, 1) + ' 个点', vMem > vMk ? 'good' : 'warn');
      cells[0][0].textContent = fmt(priorMean, 2) + '（只能用先验均值）';
      cells[0][1].textContent = fmt(clamp(postMean, MU_LO, MU_HI), 2) + ' ± ' + fmt(postSd, 2);
      cells[1][0].textContent = fmt(aMk, 3);
      cells[1][1].textContent = fmt(aMem, 3);
      cells[2][0].textContent = fmt(vMk, 3);
      cells[2][1].textContent = fmt(vMem, 3);

      if (state.hist === 0) {
        verdict.set(
          '🙈 Markov 策略：它只能假设 μ 等于先验均值 ' +
            fmt(priorMean, 2) +
            '，发出动作 ' +
            fmt(aMk, 3) +
            '。这一集真实的 μ 是 ' +
            fmt(state.muStar, 2) +
            '，回报只有 ' +
            fmt(vMk, 3) +
            '。**它不是学得不好，是根本没有能区分这两种地面的信息。**',
          'frozen'
        );
      } else if (vMem - vMk > 0.05) {
        verdict.set(
          '✅ ' +
            state.hist +
            ' 步历史把 μ 的后验收窄到 ±' +
            fmt(postSd, 2) +
            '，策略据此把动作从 ' +
            fmt(aMk, 3) +
            ' 调到 ' +
            fmt(aMem, 3) +
            '，回报从 ' +
            fmt(vMk, 3) +
            ' 提到 ' +
            fmt(vMem, 3) +
            '。历史在这里的作用**就是在线系统辨识**。',
          'learning'
        );
      } else {
        verdict.set(
          '➖ 这一集抽到的 μ 离先验均值很近（' +
            fmt(state.muStar, 2) +
            ' vs ' +
            fmt(priorMean, 2) +
            '），Markov 策略碰巧也够用。把真实 μ 拖到区间两端再看 —— 那才是历史真正救命的地方。',
          'frozen'
        );
      }

      // ── 左：后验 ──
      var g = begin(postStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 22, b: 34 }, [MU_LO, MU_HI], [0, 4.2]);
      axes(g, p, {
        xTicks: [0, 0.45, 0.9, 1.35, 1.8],
        yTicks: [0, 1, 2, 3, 4],
        xFmt: function (x) {
          return fmt(x, 2);
        },
        xLabel: '摩擦系数 μ'
      });
      text(g.ctx, '历史越长，对 μ 的后验越窄', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      line(
        g.ctx,
        [
          [p.sx(state.lo), p.y0],
          [p.sx(state.lo), p.sy(1 / (state.hi - state.lo))],
          [p.sx(state.hi), p.sy(1 / (state.hi - state.lo))],
          [p.sx(state.hi), p.y0]
        ],
        P.muted,
        1.6,
        [4, 4]
      );
      if (state.hist > 0) {
        var pts = [];
        for (var i = 0; i <= 200; i++) {
          var x = MU_LO + ((MU_HI - MU_LO) * i) / 200;
          var y = Math.exp(-((x - postMean) * (x - postMean)) / (2 * postSd * postSd)) / (postSd * Math.sqrt(2 * Math.PI));
          pts.push([p.sx(x), p.sy(Math.min(y, 4.15))]);
        }
        line(g.ctx, pts, P.accent, 2.4);
      }
      line(g.ctx, [[p.sx(state.muStar), p.y0], [p.sx(state.muStar), p.y1]], P.good, 2, [4, 3]);
      text(g.ctx, '真实 μ', p.sx(state.muStar), p.y1 + 12, P.good, 'center', '10px sans-serif');

      // ── 右：回报随历史长度 ──
      var g2 = begin(valStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [0, 40], [0, 1.05]);
      axes(g2, p2, {
        xTicks: [0, 10, 20, 30, 40],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (y) {
          return fmt(y, 2);
        },
        xLabel: '历史长度 H'
      });
      text(g2.ctx, '在真实 μ 下的回报', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      line(g2.ctx, [[p2.x0, p2.sy(vMk)], [p2.x1, p2.sy(vMk)]], P2.bad, 2.2);
      var mPts = [];
      for (var h = 0; h <= 40; h++) {
        if (h === 0) {
          // 0 步历史就是 Markov 策略本身
          mPts.push([p2.sx(0), p2.sy(clamp(vMk, 0, 1))]);
          continue;
        }
        var sd = 1 / Math.sqrt(1 / (prior * prior) + h / (state.noise * state.noise));
        // 期望回报：后验均值本身还带着 sd 的不确定性
        var expected = 1 - 2.2 * 0.75 * 0.75 * sd * sd;
        mPts.push([p2.sx(h), p2.sy(clamp(Math.max(expected, vMk), 0, 1))]);
      }
      line(g2.ctx, mPts, P2.good, 2.4);
      line(g2.ctx, [[p2.sx(state.hist), p2.y0], [p2.sx(state.hist), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(state.hist), p2.sy(clamp(vMem, 0, 1)), 4.5, P2.good, P2.surface2);
      text(g2.ctx, 'Markov 的天花板', p2.x1 - 4, p2.sy(vMk) - 9, P2.bad, 'right', '10px sans-serif');

      postStage.canvas.setAttribute('aria-label', '不同历史长度下对摩擦系数的后验分布');
      valStage.canvas.setAttribute('aria-label', '回报随历史长度的变化与 Markov 策略的上限');
    });

    render();
  }

  // ─── demo 3: DR vs System Identification ────────────────────────────────
  function buildSysidDemo(host) {
    var root = card(host, {
      title: 'DR 还是 System Identification：峰值高的那个，窄',
      sub:
        'SysID 先把 μ 估准再针对它训一个策略：估对了很强，估偏了掉得也快。' +
        'DR 训的是对整个区间都过得去的策略：峰值低一点，但平。真机参数还会随时间漂 —— 这才是胜负手。'
    });

    var state = { sysidErr: 0.18, drift: 0.25, lo: 0.3, hi: 1.2, muStar: 0.6 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: 'SysID 的参数估计误差',
      min: 0,
      max: 0.6,
      step: 0.01,
      value: state.sysidErr,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.sysidErr = v;
        render();
      }
    });
    slider(ctrls, {
      label: '真机参数随时间漂移的幅度',
      min: 0,
      max: 0.6,
      step: 0.01,
      value: state.drift,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.drift = v;
        render();
      }
    });
    slider(ctrls, {
      label: 'DR 的随机化区间宽度',
      min: 0.1,
      max: 1.6,
      step: 0.02,
      value: state.hi - state.lo,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        var c = 0.75;
        state.lo = c - v / 2;
        state.hi = c + v / 2;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '标定得很准（误差 0）', function () {
      state.sysidErr = 0;
      render();
    });
    button(btns, '跑一天之后（漂移 0.5）', function () {
      state.drift = 0.5;
      render();
    });

    var setLegend = legend(root, [
      { key: 'warn', text: 'SysID：针对估出来的 μ̂ 训一个策略' },
      { key: 'accent', text: 'DR：对整个区间鲁棒' },
      { key: 'good', text: '真机当前的 μ' }
    ]);

    var grid = stageGrid(root);
    var curveStage = stage(grid, 240);
    var timeStage = stage(grid, 240);

    var stats = statsRow(root);
    var sSys = stats.add('SysID 此刻的表现');
    var sDr = stats.add('DR 此刻的表现');
    var sSysDrift = stats.add('漂移带内最差 SysID');
    var sDrDrift = stats.add('漂移带内最差 DR');
    var verdict = verdictBox(root);

    note(root, [
      '**这是笔记 Q3 的那个对比**：SysID 是「把世界估准」，DR 是「不管世界是哪样都能用」。' +
        '前者上限更高 —— 只要你估得准，而且它不会变。',
      '**参数会变，而且不告诉你**：电池电量、关节磨损、地面换一块、负载变了。' +
        '把漂移滑块拖大，SysID 那条曲线掉得很快，DR 那条几乎不动。真机上这件事几乎总会发生。',
      '**实践里两者常常合用**：先 SysID 把区间的中心估个大概，再在它周围做 DR；' +
        '或者像 ROA / teacher-student 那样，让策略在线辨识（上一个演示里的「历史」就是干这个的）。' +
        '纯粹的二选一在工程上反而少见。',
      '**这是简化模型**：两条价值曲线的形状是编的（SysID 用窄高斯、DR 用宽平台）。' +
        '它复现「峰值 vs 宽度」的取舍，数值不能和论文比。'
    ]);

    function sysidValue(mu, muHat) {
      return clamp(Math.exp(-Math.pow((mu - muHat) / 0.22, 2)), 0, 1);
    }

    function drValue(mu, lo, hi) {
      var w = hi - lo;
      var peak = clamp(0.92 - 0.12 * w, 0, 1); // 区间越宽，峰值越低（要照顾更多情况）
      var out = mu < lo ? lo - mu : mu > hi ? mu - hi : 0;
      return clamp(peak * Math.exp(-Math.pow(out / 0.18, 2)), 0, 1);
    }

    var render = registerRenderer(function () {
      var muHat = state.muStar + state.sysidErr;
      var muNow = state.muStar;
      // 漂移是个区间：参数往哪边漂你说了不算，所以看这个带里最坏的情况
      function worst(fn, drift) {
        var w = 1;
        for (var i = -12; i <= 12; i++) w = Math.min(w, fn(state.muStar + (drift * i) / 12));
        return w;
      }
      var s0 = sysidValue(muNow, muHat),
        d0 = drValue(muNow, state.lo, state.hi);
      var s1 = worst(function (m) {
          return sysidValue(m, muHat);
        }, state.drift),
        d1 = worst(function (m) {
          return drValue(m, state.lo, state.hi);
        }, state.drift);
      var muLater = state.muStar + state.drift;

      sSys.set(fmt(s0, 3), s0 > 0.8 ? 'good' : 'warn');
      sDr.set(fmt(d0, 3), d0 > 0.8 ? 'good' : 'warn');
      sSysDrift.set(fmt(s1, 3), s1 > 0.6 ? 'good' : 'bad');
      sDrDrift.set(fmt(d1, 3), d1 > 0.6 ? 'good' : 'bad');

      if (state.sysidErr < 0.03 && state.drift < 0.05) {
        verdict.set(
          '🎯 标定很准、参数也不漂：SysID 拿到 ' +
            fmt(s0, 3) +
            '，比 DR 的 ' +
            fmt(d0, 3) +
            ' 更高。**在这个理想条件下，SysID 确实更优** —— ' +
            'DR 的那点差距就是「为了照顾整个区间」交的保险费。',
          'learning'
        );
      } else if (d1 - s1 > 0.15) {
        verdict.set(
          '🛡 参数在 ±' +
            fmt(state.drift, 2) +
            ' 内漂的话，最差情况下 SysID 掉到 ' +
            fmt(s1, 3) +
            '，DR 还有 ' +
            fmt(d1, 3) +
            '。保险费这时候开始回本了 —— 真机上电池、磨损、地面材质每天都在变，而 SysID 的估计是一次性的。',
          'learning'
        );
      } else {
        verdict.set(
          '➖ 当前设置下两者接近（SysID ' +
            fmt(s1, 3) +
            ' vs DR ' +
            fmt(d1, 3) +
            '）。把估计误差或漂移拖大，或者把 DR 区间收窄，就能看到两条曲线的形状差别在哪儿起作用。',
          'frozen'
        );
      }

      // ── 左：价值 vs 真实 μ ──
      var g = begin(curveStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 22, b: 34 }, [MU_LO, MU_HI], [0, 1.05]);
      axes(g, p, {
        xTicks: [0, 0.45, 0.9, 1.35, 1.8],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        xFmt: function (x) {
          return fmt(x, 2);
        },
        yFmt: function (y) {
          return fmt(y, 2);
        },
        xLabel: '真机实际的 μ'
      });
      text(g.ctx, '同一个策略在不同真实 μ 下的表现', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var sPts = [],
        dPts = [];
      for (var i = 0; i <= 200; i++) {
        var m = MU_LO + ((MU_HI - MU_LO) * i) / 200;
        sPts.push([p.sx(m), p.sy(sysidValue(m, muHat))]);
        dPts.push([p.sx(m), p.sy(drValue(m, state.lo, state.hi))]);
      }
      line(g.ctx, sPts, P.warn, 2.4);
      line(g.ctx, dPts, P.accent, 2.4);
      line(g.ctx, [[p.sx(muNow), p.y0], [p.sx(muNow), p.y1]], P.good, 1.8, [4, 3]);
      line(g.ctx, [[p.sx(muLater), p.y0], [p.sx(muLater), p.y1]], P.good, 1.2, [2, 4]);
      dot(g.ctx, p.sx(muNow), p.sy(s0), 4, P.warn, P.surface2);
      dot(g.ctx, p.sx(muNow), p.sy(d0), 4, P.accent, P.surface2);
      text(g.ctx, '今天', p.sx(muNow), p.y1 + 12, P.good, 'center', '10px sans-serif');
      text(g.ctx, '漂移后', p.sx(muLater), p.y1 + 24, P.good, 'center', '10px sans-serif');

      // ── 右：随漂移的表现 ──
      var g2 = begin(timeStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [0, 0.6], [0, 1.05]);
      axes(g2, p2, {
        xTicks: [0, 0.15, 0.3, 0.45, 0.6],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        xFmt: function (x) {
          return fmt(x, 2);
        },
        yFmt: function (y) {
          return fmt(y, 2);
        },
        xLabel: '参数漂移的幅度'
      });
      text(g2.ctx, '漂移带内的最差表现', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var s2 = [],
        d2 = [];
      for (var k2 = 0; k2 <= 120; k2++) {
        var dr = (0.6 * k2) / 120;
        s2.push([
          p2.sx(dr),
          p2.sy(
            worst(function (m) {
              return sysidValue(m, muHat);
            }, dr)
          )
        ]);
        d2.push([
          p2.sx(dr),
          p2.sy(
            worst(function (m) {
              return drValue(m, state.lo, state.hi);
            }, dr)
          )
        ]);
      }
      line(g2.ctx, s2, P2.warn, 2.4);
      line(g2.ctx, d2, P2.accent, 2.4);
      line(g2.ctx, [[p2.sx(state.drift), p2.y0], [p2.sx(state.drift), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(state.drift), p2.sy(s1), 4.5, P2.warn, P2.surface2);
      dot(g2.ctx, p2.sx(state.drift), p2.sy(d1), 4.5, P2.accent, P2.surface2);

      curveStage.canvas.setAttribute('aria-label', 'SysID 与 DR 策略在不同真实参数下的表现曲线');
      timeStage.canvas.setAttribute('aria-label', '参数漂移幅度与两种方法表现的关系');
    });

    render();
  }

  K.mount({
    'drt-gap': buildGapDemo,
    'drt-memory': buildMemoryDemo,
    'drt-sysid': buildSysidDemo
  });
})();
