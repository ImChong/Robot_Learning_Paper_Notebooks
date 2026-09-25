/* Interactive AWR demos for papers/01_Foundational_RL/AWR_Advantage_Weighted_Regression.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["awr"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders
 *
 *     <div class="paper-demo" data-demo="awr-weights"></div>
 *
 * because scripts/sanitize_paper_html.py strips <script>/<canvas>/<input>
 * from #paper-body before publish.
 *
 * Demos:
 *   awr-explainer  — 六幕讲解动画：PPO 的麻烦 → 优势 → 指数权重 → 加权回归 →
 *                    off-policy 的赚与亏 → 闭环与源码落点
 *   awr-weights    — exp(A/β)/Z：温度、权重上限与「还剩几条样本在说话」(ESS)
 *   awr-regression — 加权回归就是加权平均：一个 1D 动作上的完整 AWR 更新
 *   awr-buffer     — off-policy 的代价与收益：旧数据复用多少轮才划算
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
    checkbox = K.checkbox,
    buttonGroup = K.buttonGroup,
    statsRow = K.statsRow,
    verdictBox = K.verdictBox,
    legend = K.legend,
    note = K.note,
    table = K.table,
    stepper = K.stepper,
    stage = K.stage,
    stageGrid = K.stageGrid,
    begin = K.begin,
    plot = K.plot,
    line = K.line,
    dot = K.dot,
    text = K.text,
    axes = K.axes,
    barLabel = K.barLabel,
    niceTicks = K.niceTicks,
    registerRenderer = K.registerRenderer,
    mulberry32 = K.mulberry32,
    gauss = K.gauss,
    softmax = K.softmax;

  function sum(arr) {
    return arr.reduce(function (a, b) {
      return a + b;
    }, 0);
  }

  /* w = clamp_max(exp(A/β), clip) / Z — the two lines of _build_train_data().
     Returns the intermediate values too, because the whole point of the first
     demo is watching exp() → clip → normalise happen one step at a time. */
  function awrWeights(advs, beta, clipMax) {
    var raw = advs.map(function (a) {
      return Math.exp(a / beta);
    });
    var clipped = raw.map(function (r) {
      return Math.min(r, clipMax);
    });
    var Z = sum(clipped) || 1e-12;
    var w = clipped.map(function (c) {
      return c / Z;
    });
    return { raw: raw, clipped: clipped, Z: Z, w: w };
  }

  /* Effective sample size of a normalised weight vector: N when every sample
     counts equally, 1 when a single sample owns the whole batch. */
  function ess(w) {
    var s2 = sum(
      w.map(function (x) {
        return x * x;
      })
    );
    return s2 > 0 ? 1 / s2 : 0;
  }

  // ─── demo 1: exp(A/β) / Z ────────────────────────────────────────────────
  var WEIGHT_PRESETS = [
    { name: '笔记例子：A = +5 / +1 / 0 / −3', advs: [5, 1, 0, -3] },
    { name: '训练后期：优势都很接近', advs: [0.4, 0.1, -0.1, -0.3] },
    { name: '一条撞大运的样本', advs: [12, 0.5, 0, -1] }
  ];

  function buildWeightsDemo(host) {
    var root = card(host, {
      title: '权重是怎么算出来的：$\\exp(A/\\beta)$ → 截断 → 除以 $Z$',
      sub:
        '默认就是正文那个 4 样本的例子（$A = +5 / +1 / 0 / -3$，$\\beta = 1$）。拖动温度 $\\beta$ 和权重上限 a_weight_clip，' +
        '看这一批数据里「到底还有几条样本在说话」。'
    });

    var state = {
      advs: WEIGHT_PRESETS[0].advs.slice(),
      beta: 1,
      clipMax: 20,
      useClip: false
    };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '温度 $\\beta$（awr_temp）',
      min: 0.1,
      max: 3,
      step: 0.05,
      value: state.beta,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.beta = v;
        render();
      }
    });
    var clipSlider = slider(ctrls, {
      label: '权重上限 a_weight_clip',
      min: 1,
      max: 50,
      step: 1,
      value: state.clipMax,
      format: function (v) {
        return state.useClip ? fmt(v, 0) : '未启用';
      },
      onInput: function (v) {
        state.clipMax = v;
        if (state.useClip) render();
      }
    });
    var toggleBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(toggleBox);
    checkbox(toggleBox, '启用权重上限（源码默认 20）', state.useClip, function (on) {
      state.useClip = on;
      clipSlider.refresh();
      render();
    });

    var presetBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(presetBox);
    WEIGHT_PRESETS.forEach(function (preset) {
      button(presetBox, preset.name, function () {
        state.advs = preset.advs.slice();
        buildTable();
        render();
      });
    });

    var tb = table(root);
    var rawCells = [],
      clipCells = [],
      wCells = [],
      steppers = [];

    function buildTable() {
      tb.clear();
      rawCells = [];
      clipCells = [];
      wCells = [];
      steppers = [];

      var head = ['样本'];
      state.advs.forEach(function (_, i) {
        head.push('a' + (i + 1));
      });
      tb.row(head, true);

      var rowA = el('tr');
      rowA.appendChild(el('th', null, '优势 A'));
      state.advs.forEach(function (_, i) {
        var td = el('td');
        steppers.push(
          stepper(td, {
            label: 'a' + (i + 1) + ' 的优势',
            get: function () {
              return state.advs[i];
            },
            set: function (v) {
              state.advs[i] = clamp(Math.round(v * 2) / 2, -20, 20);
            },
            step: 0.5,
            digits: 1,
            onChange: render
          })
        );
        rowA.appendChild(td);
      });
      tb.node.appendChild(rowA);

      function valueRow(label, store) {
        var tr = el('tr');
        tr.appendChild(el('th', null, label));
        state.advs.forEach(function () {
          var td = el('td', null, '—');
          store.push(td);
          tr.appendChild(td);
        });
        tb.node.appendChild(tr);
      }
      valueRow('$\\exp(A/\\beta)$', rawCells);
      valueRow('截断后', clipCells);
      valueRow('归一化 w', wCells);
    }
    buildTable();

    var setLegend = legend(root, [
      { key: 'accent', text: '归一化权重 w' },
      { key: 'warn', text: '被上限截断的部分' },
      { key: 'muted', text: '均匀权重 1/N（作对照）' }
    ]);

    var grid = stageGrid(root);
    var barStage = stage(grid, 210);
    var curveStage = stage(grid, 210);

    var stats = statsRow(root);
    var sZ = stats.add('配分函数 Z');
    var sTop = stats.add('最大权重 w');
    var sEss = stats.add('有效样本数 ESS');
    var sClipped = stats.add('顶到上限的样本');
    var verdict = verdictBox(root);

    note(root, [
      '**Z 只是个除法**：它不改变样本之间的相对大小，只把一组「未归一化的得分」变成和为 1 的分布。正文里 Z ≈ 152.2，其中 148.4 来自 A=+5 那一条 —— **一条样本占了 97.5%**，剩下三条加起来不到 3%。',
      '**$\\beta$ 才是真正的旋钮**：$\\beta$ 越小，exp 把好坏拉得越开，最后几乎只剩最好的一条样本在说话（ESS → 1，等于「只模仿这一条」）；$\\beta$ 越大，权重越平，AWR 退化成对整批数据做行为克隆（ESS → N，好坏一起学）。正文 Q3 说的「激进 / 保守」就是这条 ESS 曲线。',
      '**上限 20 是在救数值**：`a_weight_clip: 20.0` 不是为了改变谁重要，而是防止 $\\exp(A/\\beta)$ 在优势没归一化、或 $\\beta$ 很小时直接溢出。勾上它再把 $\\beta$ 拖到 0.1，会看到几条样本一起顶到上限、权重被强行拉平 —— 这就是它在训练里干的事。',
      '**所以 AWR 不需要 clip 概率比**：差动作的权重本身就趋近 0，它对 loss 的贡献可以忽略；PPO 要靠 min(·) 把梯度手动掐掉，AWR 是让权重自己消失。'
    ]);

    var render = registerRenderer(function () {
      var clipMax = state.useClip ? state.clipMax : Infinity;
      var r = awrWeights(state.advs, state.beta, clipMax);
      var n = state.advs.length;

      steppers.forEach(function (s) {
        s.refresh();
      });
      state.advs.forEach(function (_, i) {
        if (rawCells[i]) {
          rawCells[i].textContent = r.raw[i] >= 1000 ? r.raw[i].toExponential(1) : fmt(r.raw[i], 2);
        }
        if (clipCells[i]) {
          var hit = state.useClip && r.raw[i] > state.clipMax + 1e-9;
          clipCells[i].textContent = hit ? fmt(r.clipped[i], 2) + ' ⚑' : fmt(r.clipped[i], 2);
          clipCells[i].className = hit ? 'is-bad' : '';
        }
        if (wCells[i]) {
          wCells[i].textContent = r.w[i] >= 0.001 ? fmt(r.w[i], 3) : r.w[i].toExponential(1);
          wCells[i].className = r.w[i] >= 1 / n ? 'is-good' : '';
        }
      });

      var top = Math.max.apply(null, r.w);
      var essVal = ess(r.w);
      var nClipped = state.useClip
        ? r.raw.filter(function (x) {
            return x > state.clipMax + 1e-9;
          }).length
        : 0;
      sZ.set(r.Z >= 1000 ? r.Z.toExponential(2) : fmt(r.Z, 1));
      sTop.set(fmt(top, 3), top > 0.9 ? 'warn' : 'accent');
      sEss.set(fmt(essVal, 2) + ' / ' + n, essVal < 1.5 ? 'bad' : essVal > n - 0.5 ? 'warn' : 'good');
      sClipped.set(state.useClip ? nClipped + ' 条' : '未启用', nClipped ? 'bad' : 'good');

      if (essVal < 1.5) {
        verdict.set(
          '🎯 极端「精英模仿」：ESS ≈ ' +
            fmt(essVal, 2) +
            '，这一批里实际只有一条样本在训练策略。学得最快，也最容易把一次偶然的好运当成真本事（正文 Q5 说的「好样本太少时学习效率下降」就是这个状态的反面）。',
          'frozen'
        );
      } else if (essVal > n - 0.4) {
        verdict.set(
          '😴 几乎在做行为克隆：ESS ≈ ' +
            fmt(essVal, 2) +
            ' / ' +
            n +
            '，好动作和差动作的权重差不多，策略被拉向整批数据的平均行为 —— $\\beta$ 太大就学不动了。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ $\\beta$ = ' +
            fmt(state.beta, 2) +
            ' 时 ESS ≈ ' +
            fmt(essVal, 2) +
            ' / ' +
            n +
            '：最好的样本拿到 ' +
            fmt(top * 100, 1) +
            '% 的权重，差的那几条基本被忽略但没被完全丢掉 —— 这就是「加权监督学习」在做的事。',
          'learning'
        );
      }

      // ── bar chart: the normalised weights ──
      var g = begin(barStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 12, t: 20, b: 30 }, [0, n], [0, 1]);
      axes(g, p, {
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) {
          return fmt(t, 2);
        }
      });
      text(g.ctx, '每条样本分到的权重 w', p.x0, p.y1 - 7, P.muted, 'left', '11px sans-serif');
      line(g.ctx, [[p.x0, p.sy(1 / n)], [p.x1, p.sy(1 / n)]], P.muted, 1, [4, 4]);
      var slot = (p.x1 - p.x0) / n;
      var bw = Math.max(6, slot * 0.5);
      r.w.forEach(function (wi, i) {
        var x = p.x0 + slot * (i + 0.5) - bw / 2;
        var hit = state.useClip && r.raw[i] > state.clipMax + 1e-9;
        g.ctx.fillStyle = hit ? P.warn : P.accent;
        g.ctx.fillRect(x, p.sy(wi), bw, p.y0 - p.sy(wi));
        text(g.ctx, 'a' + (i + 1), p.x0 + slot * (i + 0.5), p.y0 + 13, P.muted, 'center', '11px monospace');
        barLabel(g, p, p.x0 + slot * (i + 0.5), p.sy(wi), wi >= 0.01 ? fmt(wi, 2) : wi.toExponential(0), hit ? P.warn : P.text);
      });

      // ── curve: every sample's weight as a function of β ──
      var g2 = begin(curveStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 20, b: 32 }, [0.1, 3], [0, 1]);
      axes(g2, p2, {
        xTicks: [0.1, 1, 2, 3],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        xFmt: function (t) {
          return fmt(t, 1);
        },
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '温度 β'
      });
      text(g2.ctx, 'w 随 β 的变化（每条样本一条线）', p2.x0, p2.y1 - 7, P2.muted, 'left', '11px sans-serif');
      line(g2.ctx, [[p2.x0, p2.sy(1 / n)], [p2.x1, p2.sy(1 / n)]], P2.muted, 1, [4, 4]);
      var series = [];
      for (var i2 = 0; i2 < n; i2++) series.push([]);
      for (var s = 0; s <= 80; s++) {
        var b = 0.1 + (2.9 * s) / 80;
        var wb = awrWeights(state.advs, b, clipMax).w;
        for (var j = 0; j < n; j++) series[j].push([p2.sx(b), p2.sy(wb[j])]);
      }
      var colors = [P2.accent, P2.good, P2.warn, P2.bad];
      series.forEach(function (pts, idx) {
        line(g2.ctx, pts, colors[idx % colors.length], idx === 0 ? 2.4 : 1.8);
      });
      line(g2.ctx, [[p2.sx(state.beta), p2.y0], [p2.sx(state.beta), p2.y1]], P2.text, 1, [3, 3]);
      r.w.forEach(function (wi, idx) {
        dot(g2.ctx, p2.sx(state.beta), p2.sy(wi), 3.5, colors[idx % colors.length], P2.surface2);
      });

      barStage.canvas.setAttribute('aria-label', '当前温度下各样本的归一化权重柱状图');
      curveStage.canvas.setAttribute('aria-label', '各样本权重随温度 β 变化的曲线');
    });

    render();
  }

  // ─── demo 2: the update itself is a weighted average ─────────────────────
  /* One continuous action a (think「这一步迈多大」). The true reward has a main
     peak at a = 1.0 and a smaller decoy at a = −0.9, so a greedy β can lock the
     policy onto the wrong bump — exactly what「只学最好的一条」买单的地方。 */
  function reward(a) {
    return (
      Math.exp(-((a - 1.0) * (a - 1.0)) / (2 * 0.5 * 0.5)) +
      0.55 * Math.exp(-((a + 0.9) * (a + 0.9)) / (2 * 0.4 * 0.4))
    );
  }

  var REG = { batch: 40, noise: 0.08, aLo: -2.4, aHi: 3 };

  function sampleBatch(mu, sigma, rng) {
    var out = [];
    for (var i = 0; i < REG.batch; i++) {
      var a = mu + sigma * gauss(rng);
      out.push({ a: a, r: reward(a) + REG.noise * gauss(rng) });
    }
    return out;
  }

  /* The closed-form weighted maximum-likelihood fit of a 1D Gaussian — i.e.
     exactly what `-mean(w · log π(a|s))` converges to for this toy policy. */
  function weightedFit(batch, beta, clipMax, learnSigma, sigmaOld) {
    var rs = batch.map(function (s) {
      return s.r;
    });
    var v = sum(rs) / rs.length; // Critic 的 V(s)：这批数据的平均回报
    var adv = rs.map(function (r) {
      return r - v;
    });
    var w = awrWeights(adv, beta, clipMax).w;
    var mu = 0;
    for (var i = 0; i < batch.length; i++) mu += w[i] * batch[i].a;
    var sigma = sigmaOld;
    if (learnSigma) {
      var varSum = 0;
      for (var j = 0; j < batch.length; j++) varSum += w[j] * (batch[j].a - mu) * (batch[j].a - mu);
      sigma = Math.max(0.02, Math.sqrt(varSum));
    }
    return { v: v, adv: adv, w: w, mu: mu, sigma: sigma };
  }

  function runRegression(beta, iters, seed, learnSigma, clipMax, mu0, sigma0) {
    var rng = mulberry32(seed);
    var mu = mu0,
      sigma = sigma0;
    var trace = [{ mu: mu, sigma: sigma, j: reward(mu) }];
    for (var it = 0; it < iters; it++) {
      var batch = sampleBatch(mu, sigma, rng);
      var fit = weightedFit(batch, beta, clipMax, learnSigma, sigma);
      mu = fit.mu;
      sigma = fit.sigma;
      trace.push({ mu: mu, sigma: sigma, j: reward(mu) });
    }
    return trace;
  }

  function gaussPdf(x, mu, sigma) {
    return Math.exp(-((x - mu) * (x - mu)) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
  }

  function buildRegressionDemo(host) {
    var root = card(host, {
      title: '加权回归到底更新了什么：新策略的均值 = 样本的加权平均',
      sub:
        '一个状态、一个连续动作 $a$（「这一步迈多大」）。策略是高斯 $\\mathcal{N}(\\mu, \\sigma)$，用它采 ' +
        REG.batch +
        ' 个动作，按 $A = r - V$ 算权重，再做一次加权最大似然 —— 对高斯策略来说它有闭式解：$\\mu_{\\mathrm{new}} = \\sum_i w_i a_i$。'
    });

    var state = { beta: 0.3, seed: 7, learnSigma: true, mu: -0.3, sigma: 0.8 };
    var clipMax = 20;

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '温度 $\\beta$',
      min: 0.05,
      max: 2,
      step: 0.05,
      value: state.beta,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.beta = v;
        render();
      }
    });
    slider(ctrls, {
      label: '旧策略均值 $\\mu_{\\mathrm{old}}$',
      min: -2,
      max: 2.5,
      step: 0.1,
      value: state.mu,
      format: function (v) {
        return fmt(v, 1);
      },
      onInput: function (v) {
        state.mu = v;
        render();
      }
    });
    slider(ctrls, {
      label: '旧策略标准差 $\\sigma_{\\mathrm{old}}$（探索幅度）',
      min: 0.1,
      max: 1.5,
      step: 0.05,
      value: state.sigma,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.sigma = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '换一批采样', function () {
      state.seed = (state.seed * 7919 + 13) % 100000;
      render();
    });
    checkbox(btns, '$\\sigma$ 也跟着回归更新（关掉＝配置里的 FIXED 方差）', state.learnSigma, function (on) {
      state.learnSigma = on;
      render();
    });

    var setLegend = legend(root, [
      { key: 'muted', text: '真实回报 r(a)' },
      { key: 'warn', text: '旧策略 $\\pi_{\\mathrm{old}}$' },
      { key: 'accent', text: '回归出的新策略' },
      { key: 'good', text: '样本（圆点越大权重越高）' }
    ]);

    var grid = stageGrid(root);
    var scatterStage = stage(grid, 240);
    var traceStage = stage(grid, 240);

    var stats = statsRow(root);
    var sV = stats.add('Critic 的 V = batch 均值');
    var sMu = stats.add('$\\mu_{\\mathrm{old}}$ → $\\mu_{\\mathrm{new}}$');
    var sSigma = stats.add('$\\sigma_{\\mathrm{old}}$ → $\\sigma_{\\mathrm{new}}$');
    var sEss = stats.add('有效样本数 ESS');
    var verdict = verdictBox(root);

    note(root, [
      '**为什么说「加权监督学习」**：高斯策略的 $-\\sum_i w_i \\log \\pi(a_i)$ 最小值有闭式解，就是**用权重做一次加权平均**。没有概率比、没有裁剪、没有 KL —— 一次更新就是「把均值挪到好样本那边」。',
      '**$\\beta$ 小 = 只信最好的一条**：把 $\\beta$ 拖到 0.05，权重几乎全压在单个样本上，$\\mu_{\\mathrm{new}}$ 直接跳到那个样本的位置，$\\sigma_{\\mathrm{new}}$ 塌到 0.05 上下 —— **策略基本不再探索**。默认这批采样已经罩住了最优动作，所以看起来「一步到位」；可探索一停，策略就只能在已有样本里打转：把 $\\mu_{\\mathrm{old}}$ 拖到 −0.9、$\\sigma_{\\mathrm{old}}$ 拖到 0.2（相当于策略已经缩在左边那个小峰附近），右图三条线就再也找不到 a = 1 的真正高峰了 —— 这正是正文 Q5 说的「缓冲区里好样本太少时学习效率下降」。',
      '**$\\beta$ 大 = 行为克隆**：$\\beta$ 拖到 2，权重接近均匀，$\\mu_{\\mathrm{new}}$ ≈ 样本均值 ≈ $\\mu_{\\mathrm{old}}$，策略几乎不动。学得稳，但也几乎学不动。',
      '**$\\sigma$ 为什么要固定**：勾掉「$\\sigma$ 也跟着更新」，就是 `actor_std_type: FIXED` / `action_std: 0.05` 的做法 —— 加权回归天然会把方差往小了收（它在拟合一小撮好样本），固定方差是防止策略提前停止探索的最省事办法。'
    ]);

    var render = registerRenderer(function () {
      var rng = mulberry32(state.seed);
      var batch = sampleBatch(state.mu, state.sigma, rng);
      var fit = weightedFit(batch, state.beta, clipMax, state.learnSigma, state.sigma);
      var essVal = ess(fit.w);

      sV.set(fmt(fit.v, 3));
      sMu.set(fmt(state.mu, 2) + ' → ' + fmt(fit.mu, 2), Math.abs(fit.mu - 1) < 0.35 ? 'good' : 'warn');
      sSigma.set(fmt(state.sigma, 2) + ' → ' + fmt(fit.sigma, 2), fit.sigma < 0.12 ? 'bad' : 'accent');
      sEss.set(fmt(essVal, 1) + ' / ' + REG.batch, essVal < 2 ? 'bad' : 'good');

      // ── left: reward curve + weighted samples + the two policies ──
      var g = begin(scatterStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 40, r: 14, t: 18, b: 32 }, [REG.aLo, REG.aHi], [-0.25, 1.35]);
      axes(g, p, {
        xTicks: [-2, -1, 0, 1, 2, 3],
        yTicks: [0, 0.5, 1],
        xFmt: function (t) {
          return fmt(t, 0);
        },
        yFmt: function (t) {
          return fmt(t, 1);
        },
        xLabel: '动作 a'
      });
      text(g.ctx, '真实回报与这一批样本', p.x0, p.y1 - 6, P.muted, 'left', '11px sans-serif');

      var curve = [];
      for (var i = 0; i <= 120; i++) {
        var a = REG.aLo + ((REG.aHi - REG.aLo) * i) / 120;
        curve.push([p.sx(a), p.sy(reward(a))]);
      }
      line(g.ctx, curve, P.muted, 1.5, [5, 4]);

      function policyCurve(mu, sigma, color, width, dash) {
        var pts = [];
        var peak = gaussPdf(mu, mu, sigma);
        for (var q = 0; q <= 120; q++) {
          var x = REG.aLo + ((REG.aHi - REG.aLo) * q) / 120;
          pts.push([p.sx(x), p.sy((gaussPdf(x, mu, sigma) / peak) * 0.55)]);
        }
        line(g.ctx, pts, color, width, dash);
      }
      policyCurve(state.mu, state.sigma, P.warn, 1.6, [3, 3]);
      policyCurve(fit.mu, fit.sigma, P.accent, 2.4);

      line(g.ctx, [[p.x0, p.sy(fit.v)], [p.x1, p.sy(fit.v)]], P.border, 1, [2, 3]);
      text(g.ctx, 'V', p.x1 - 4, p.sy(fit.v) - 8, P.muted, 'right', '11px monospace');

      var wMax = Math.max.apply(null, fit.w) || 1;
      batch.forEach(function (s, idx) {
        var rad = 2 + 6 * Math.sqrt(fit.w[idx] / wMax);
        dot(g.ctx, p.sx(s.a), p.sy(s.r), rad, fit.adv[idx] >= 0 ? P.good : P.bad);
      });
      line(g.ctx, [[p.sx(fit.mu), p.y0], [p.sx(fit.mu), p.y1]], P.accent, 1, [4, 3]);

      // ── right: where three temperatures end up after 8 rounds ──
      var g2 = begin(traceStage);
      var P2 = g2.P;
      var iters = 8;
      var runs = [
        { beta: 0.05, color: P2.bad, label: 'β=0.05' },
        { beta: state.beta, color: P2.accent, label: 'β=' + fmt(state.beta, 2) },
        { beta: 2, color: P2.warn, label: 'β=2' }
      ];
      var p2 = plot(g2, { l: 40, r: 54, t: 18, b: 32 }, [0, iters], [REG.aLo, REG.aHi]);
      axes(g2, p2, {
        xTicks: niceTicks(0, iters, 4),
        yTicks: [-2, -1, 0, 1, 2, 3],
        xFmt: function (t) {
          return fmt(t, 0);
        },
        yFmt: function (t) {
          return fmt(t, 0);
        },
        xLabel: '第几轮更新'
      });
      text(g2.ctx, '策略均值 μ 的走向（虚线 = 最优动作）', p2.x0, p2.y1 - 6, P2.muted, 'left', '11px sans-serif');
      line(g2.ctx, [[p2.x0, p2.sy(1)], [p2.x1, p2.sy(1)]], P2.good, 1, [4, 4]);
      line(g2.ctx, [[p2.x0, p2.sy(-0.9)], [p2.x1, p2.sy(-0.9)]], P2.border, 1, [2, 4]);
      runs.forEach(function (run) {
        var trace = runRegression(run.beta, iters, state.seed, state.learnSigma, clipMax, state.mu, state.sigma);
        var pts = trace.map(function (t, i) {
          return [p2.sx(i), p2.sy(t.mu)];
        });
        line(g2.ctx, pts, run.color, 2.2);
        dot(g2.ctx, p2.sx(iters), p2.sy(trace[iters].mu), 3.5, run.color, P2.surface2);
        text(g2.ctx, run.label, p2.x1 + 4, p2.sy(trace[iters].mu), run.color, 'left', '10px monospace');
      });

      var landed = Math.abs(fit.mu - 1) < 0.4;
      if (essVal < 2) {
        verdict.set(
          '🎯 $\\beta$ = ' +
            fmt(state.beta, 2) +
            ' 时 ESS ≈ ' +
            fmt(essVal, 1) +
            '：这次更新基本只参考了一条样本，$\\mu$ 直接跳到 ' +
            fmt(fit.mu, 2) +
            '。运气好就是一步到位，运气差就是把一次噪声当成了最优动作。',
          'frozen'
        );
      } else {
        verdict.set(
          (landed ? '✅ ' : '↔️ ') +
            '$\\mu_{\\mathrm{new}}$ = ' +
            fmt(fit.mu, 2) +
            ' = $\\sum_i w_i a_i$：' +
            fmt(essVal, 1) +
            ' 条样本合力把均值从 ' +
            fmt(state.mu, 2) +
            ' 拉到了' +
            (landed ? '最优动作附近。' : '高回报的那一侧 —— 一次更新只走一步，多迭代几轮才会到位。'),
          'learning'
        );
      }

      scatterStage.canvas.setAttribute('aria-label', '动作-回报散点图，点的大小表示 AWR 权重');
      traceStage.canvas.setAttribute('aria-label', '三个温度下策略均值随迭代的走向');
    });

    render();
  }

  // ─── demo 3: what off-policy reuse actually buys ─────────────────────────
  /* The same toy task as the PPO note's third demo (one state, four actions),
     so the two algorithms can be compared on identical ground. AWR keeps a
     replay buffer of the last `keep` iterations instead of throwing the batch
     away — the whole off-policy claim of the paper in one slider. */
  var ACTIONS = [
    { name: '大步向前', mu: 1.0 },
    { name: '小步挪动', mu: 0.8 },
    { name: '原地站立', mu: 0.5 },
    { name: '乱甩手臂', mu: 0.1 }
  ];
  /* Small batches on purpose: with 8 noisy samples per iteration a single
     unlucky rollout visibly derails the on-policy run, which is the variance
     that a replay buffer is supposed to absorb. */
  var SIM = { iters: 30, batch: 8, epochs: 5, lr: 1.2, noise: 1.5, clip: 20 };

  function trueReturn(p) {
    return p.reduce(function (s, pk, k) {
      return s + pk * ACTIONS[k].mu;
    }, 0);
  }

  function sampleAction(p, rng) {
    var u = rng(),
      acc = 0;
    for (var k = 0; k < p.length; k++) {
      acc += p[k];
      if (u < acc) return k;
    }
    return p.length - 1;
  }

  /* One AWR run. `keep` = how many past iterations stay in the buffer
     (keep = 1 is the on-policy special case: last batch only). */
  function runAwr(seed, beta, keep) {
    var rng = mulberry32(seed);
    var nA = ACTIONS.length;
    var logits = ACTIONS.map(function () {
      return 0;
    });
    var buffer = [];
    var history = [];

    for (var it = 0; it < SIM.iters; it++) {
      var p = softmax(logits);
      var batch = [];
      for (var i = 0; i < SIM.batch; i++) {
        var a = sampleAction(p, rng);
        batch.push({ a: a, r: ACTIONS[a].mu + SIM.noise * gauss(rng), age: it });
      }
      buffer.push(batch);
      while (buffer.length > keep) buffer.shift();

      var data = [];
      for (var b = 0; b < buffer.length; b++) data = data.concat(buffer[b]);

      // Critic：整个 buffer 的平均回报就是这个单状态任务的 V(s)
      var v = sum(
        data.map(function (d) {
          return d.r;
        })
      ) / data.length;
      var adv = data.map(function (d) {
        return d.r - v;
      });
      var mean = sum(adv) / adv.length;
      var std =
        Math.sqrt(
          sum(
            adv.map(function (x) {
              return (x - mean) * (x - mean);
            })
          ) / adv.length
        ) + 1e-8;
      var normAdv = adv.map(function (x) {
        return (x - mean) / std;
      });
      var w = normAdv.map(function (x) {
        return Math.min(Math.exp(x / beta), SIM.clip);
      });
      var wSum = sum(w) || 1e-12;

      // 加权最大似然：θ ← θ + lr · Σ wᵢ ∇log π(aᵢ)
      for (var e = 0; e < SIM.epochs; e++) {
        var pNow = softmax(logits);
        var grad = new Array(nA);
        for (var g = 0; g < nA; g++) grad[g] = 0;
        for (var d2 = 0; d2 < data.length; d2++) {
          var ai = data[d2].a;
          for (var k2 = 0; k2 < nA; k2++) {
            grad[k2] += w[d2] * ((k2 === ai ? 1 : 0) - pNow[k2]);
          }
        }
        for (var k3 = 0; k3 < nA; k3++) logits[k3] += (SIM.lr * grad[k3]) / wSum;
      }

      var staleness = sum(
        data.map(function (d) {
          return it - d.age;
        })
      ) / data.length;
      history.push({ p: p, J: trueReturn(p), samples: data.length, staleness: staleness });
    }
    var pFinal = softmax(logits);
    var last = history[history.length - 1];
    history.push({ p: pFinal, J: trueReturn(pFinal), samples: last.samples, staleness: last.staleness });
    return history;
  }

  /* Always 24 seeds, never a single lucky run: a single curve in a task this
     small is mostly luck. Shared by the buffer demo (mean curve + final-return
     spread) and by the explainer animation, so both quote the same numbers. */
  var SWEEP_SEEDS = 24;

  function runSet(baseSeed, beta, keep) {
    var all = [];
    for (var s = 0; s < SWEEP_SEEDS; s++) all.push(runAwr(baseSeed + s * 17, beta, keep));
    var mean = [];
    for (var i = 0; i < all[0].length; i++) {
      mean.push(
        sum(
          all.map(function (h) {
            return h[i].J;
          })
        ) / SWEEP_SEEDS
      );
    }
    var finals = all.map(function (h) {
      return h[h.length - 1].J;
    });
    var fMean = sum(finals) / SWEEP_SEEDS;
    var sd = Math.sqrt(
      sum(
        finals.map(function (x) {
          return (x - fMean) * (x - fMean);
        })
      ) / SWEEP_SEEDS
    );
    // 平均每轮的回报抖动：一次更新把策略推得多猛
    var jitter = sum(
      all.map(function (h) {
        var j = 0;
        for (var i = 1; i < h.length; i++) j += Math.abs(h[i].J - h[i - 1].J);
        return j / (h.length - 1);
      })
    ) / SWEEP_SEEDS;
    return { all: all, mean: mean, finals: finals, fMean: fMean, sd: sd, jitter: jitter, last: all[0][all[0].length - 2] };
  }

  function buildBufferDemo(host) {
    var SEEDS = SWEEP_SEEDS;
    var root = card(host, {
      title: 'off-policy 到底赚在哪：把旧数据留在 buffer 里再刷一遍',
      sub:
        '和 PPO 笔记第 3 个演示完全同一个任务（1 个状态、4 个动作，真实回报 ' +
        ACTIONS.map(function (a) {
          return a.name + ' ' + a.mu;
        }).join(' / ') +
        '），只是把更新换成 AWR 的加权回归。每轮只采 ' +
        SIM.batch +
        ' 条样本（故意采少，好让方差看得见）：蓝线把最近 N 轮的数据留在 buffer 里一起用，灰线每轮用完就丢（相当于 on-policy）。'
    });

    var state = { beta: 0.5, keep: 4, seed: 3 };
    var runs = { reuse: null, fresh: null };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: 'Replay Buffer 保留轮数 N',
      min: 1,
      max: 20,
      step: 1,
      value: state.keep,
      format: function (v) {
        return fmt(v, 0) + ' 轮 ≈ ' + fmt(v * SIM.batch, 0) + ' 条样本';
      },
      onInput: function (v) {
        state.keep = v;
        recompute();
      }
    });
    slider(ctrls, {
      label: '温度 $\\beta$',
      min: 0.1,
      max: 2,
      step: 0.05,
      value: state.beta,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.beta = v;
        recompute();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '换一组随机种子', function () {
      state.seed = (state.seed * 31 + 7) % 9973;
      recompute();
    });

    var setLegend = legend(root, [
      { key: 'accent', text: '保留最近 N 轮（off-policy）' },
      { key: 'muted', text: '只用最新一轮（on-policy）' },
      { key: 'good', text: '最优策略的回报 1.0' }
    ]);

    var grid = stageGrid(root);
    var curveStage = stage(grid, 230);
    var sweepStage = stage(grid, 230);

    var stats = statsRow(root);
    var sReuse = stats.add('复用 N 轮：平均最终回报');
    var sFresh = stats.add('只用最新一轮：平均最终回报');
    var sSpread = stats.add('种子间标准差（越小越稳）');
    var sStale = stats.add('末轮样本平均「年龄」');
    var verdict = verdictBox(root);

    note(root, [
      '**赚在方差，不一定赚在速度**：N = 1 时每次更新只看 8 条带噪样本，细线抖得很凶；把 N 拖到 4~8，每轮抖动和种子间标准差都会明显下降（看上面两个读数），但平均回报未必更高 —— 这个玩具任务本来就不难。论文说的「历史经验可以反复被采样学习」，先兑现的是稳定性。',
      '**代价是数据变旧**：继续往 15、20 拖，buffer 里大半是好几轮前那个更差的策略产生的动作。优势还是按当前 Critic 算的，但**动作分布已经不是当前策略的了**，于是策略被旧行为往回拽，平均回报稳定地掉下去。AWR 不算概率比，也就没有重要性采样来纠正这件事 —— 所以 N 不是越大越好。',
      '**这正是 PPO 做不到的那一半**：PPO 的 $\\min(r\\hat{A},\\ \\mathrm{clip}(r)\\hat{A})$ 依赖 $r = \\pi_{\\mathrm{new}}/\\pi_{\\mathrm{old}}$，数据一旦太旧，r 会大到没法用，所以只能 on-policy。AWR 换成权重之后，旧数据至少还能用 —— 代价就是上面那条「拽回去」的曲线。',
      '**为什么画的是平均曲线**：这么小的任务里单条曲线几乎全是运气，所以左图画的是 24 个种子的平均（细线是单个种子），右图是它们最终回报的分布。「换一组随机种子」换的是整组 —— 结论稳不稳，一按就知道。'
    ]);

    function recompute() {
      runs.reuse = runSet(state.seed, state.beta, state.keep);
      runs.fresh = runSet(state.seed, state.beta, 1);
      render();
    }

    var render = registerRenderer(function () {
      if (!runs.reuse) return;
      var reuse = runs.reuse,
        fresh = runs.fresh;
      var avgR = reuse.fMean,
        avgF = fresh.fMean;

      sReuse.set(fmt(avgR, 3) + '（每轮 ' + reuse.last.samples + ' 条）', avgR >= avgF ? 'good' : 'warn');
      sFresh.set(fmt(avgF, 3) + '（每轮 ' + SIM.batch + ' 条）', avgF > avgR ? 'good' : 'muted');
      sSpread.set(fmt(reuse.sd, 3) + ' vs ' + fmt(fresh.sd, 3), reuse.sd < fresh.sd ? 'good' : 'warn');
      var lastData = reuse.last;
      sStale.set(fmt(lastData.staleness, 1) + ' 轮', lastData.staleness > 5 ? 'bad' : 'good');

      // ── learning curves ──
      var g = begin(curveStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 18, b: 32 }, [0, SIM.iters], [0, 1.05]);
      axes(g, p, {
        xTicks: niceTicks(0, SIM.iters, 5),
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        xFmt: function (t) {
          return fmt(t, 0);
        },
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '训练迭代'
      });
      text(g.ctx, '真实回报 J(π)：' + SEEDS + ' 个种子的平均（细线为单个种子）', p.x0, p.y1 - 6, P.muted, 'left', '11px sans-serif');
      line(g.ctx, [[p.x0, p.sy(1)], [p.x1, p.sy(1)]], P.good, 1, [4, 4]);
      function meanCurve(set, color, width) {
        g.ctx.globalAlpha = 0.18;
        set.all.forEach(function (h) {
          line(
            g.ctx,
            h.map(function (pt, i) {
              return [p.sx(i), p.sy(pt.J)];
            }),
            color,
            1
          );
        });
        g.ctx.globalAlpha = 1;
        line(
          g.ctx,
          set.mean.map(function (j, i) {
            return [p.sx(i), p.sy(j)];
          }),
          color,
          width
        );
      }
      meanCurve(fresh, P.muted, 1.8);
      meanCurve(reuse, P.accent, 2.6);

      // ── seed sweep ──
      var g2 = begin(sweepStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 84, r: 14, t: 16, b: 28 }, [0, 1.05], [0, 1]);
      text(g2.ctx, SEEDS + ' 个随机种子的最终回报', p2.x0, 12, P2.muted, 'left', '11px sans-serif');
      [
        { vals: reuse.finals, y: 0.38, color: P2.accent, label: '复用 ' + state.keep + ' 轮' },
        { vals: fresh.finals, y: 0.78, color: P2.muted, label: '只用最新一轮' }
      ].forEach(function (rowSpec) {
        var y = p2.sy(rowSpec.y);
        line(g2.ctx, [[p2.sx(0), y], [p2.sx(1.05), y]], P2.grid, 1);
        text(g2.ctx, rowSpec.label, p2.x0 - 6, y, P2.muted, 'right', '11px sans-serif');
        rowSpec.vals.forEach(function (v) {
          g2.ctx.globalAlpha = 0.65;
          dot(g2.ctx, p2.sx(v), y, 4, rowSpec.color);
          g2.ctx.globalAlpha = 1;
        });
        var avg = sum(rowSpec.vals) / rowSpec.vals.length;
        line(g2.ctx, [[p2.sx(avg), y - 9], [p2.sx(avg), y + 9]], rowSpec.color, 2);
      });
      [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
        text(g2.ctx, fmt(t, 2), p2.sx(t), p2.y0 + 4, P2.muted, 'center', '10px monospace');
      });

      if (state.keep === 1) {
        verdict.set('两条线现在是同一个设置（N = 1），把 N 拖大才能看出复用旧数据的效果。', 'learning');
      } else if (lastData.staleness > 5) {
        verdict.set(
          '⚠️ 数据太旧了：buffer 里的样本平均已经 ' +
            fmt(lastData.staleness, 1) +
            ' 轮旧，平均最终回报 ' +
            fmt(avgR, 3) +
            '（只用最新一轮是 ' +
            fmt(avgF, 3) +
            '）。优势还是按当前 Critic 算的，可动作分布早就不是当前策略的了 —— AWR 没有概率比来纠正这件事，只能被旧行为往回拽。',
          'frozen'
        );
      } else {
        verdict.set(
          '📉 复用 ' +
            state.keep +
            ' 轮主要买到的是「稳」：曲线每轮的抖动从 ' +
            fmt(fresh.jitter, 3) +
            ' 降到 ' +
            fmt(reuse.jitter, 3) +
            '，种子间标准差 ' +
            fmt(fresh.sd, 3) +
            ' → ' +
            fmt(reuse.sd, 3) +
            '。平均回报（' +
            fmt(avgF, 3) +
            ' → ' +
            fmt(avgR, 3) +
            '）则未必更高 —— 这个玩具任务本来就不难，复用旧数据买的是方差，不是速度。',
          'learning'
        );
      }

      curveStage.canvas.setAttribute('aria-label', '复用旧数据与只用最新数据的学习曲线对比');
      sweepStage.canvas.setAttribute('aria-label', '12 个随机种子下两种设置的最终回报分布');
    });

    recompute();
  }

  // ─── demo 4: the six-scene explainer animation ───────────────────────────
  /* 幕数由笔记本身决定：AWR 的核心概念正好是六个 —— PPO 留下的三个麻烦、
     ① 评估 A = R − V、② 指数权重 exp(A/β)/Z、加权回归就是一次加权平均、
     off-policy 的赚与亏、以及一整轮的闭环与源码落点。画面里的数字全部由上面
     三个演示用的同一批函数（awrWeights / ess / weightedFit / runSet）现算，
     动画不另算一套。 */

  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    paint = K.paint,
    seg = K.seg,
    ease = K.ease,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
    arrowMarker = K.arrowMarker,
    polyPath = K.polyPath,
    pointOn = K.pointOn;

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_MUTED = X.muted,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2;

  /* ── scene 1: PPO 留下的三个麻烦，AWR 换一种问题形式 ── */
  var S1_PAINS = [
    { t: '① 重要性采样方差大', d: '新旧策略一拉开，概率比不是爆炸就是塌成 0' },
    { t: '② 数据用完即丢', d: 'on-policy：这一轮采的样本只够更新这一轮' },
    { t: '③ 裁剪阈值要调', d: '$\\varepsilon$ 换个任务就得重调一遍' }
  ];
  var S1_GAINS = ['不需要概率比：只剩 $\\log\\pi$ 和一个权重', '旧数据能留在 buffer 里反复刷', '没有 $\\varepsilon$：exp 自己把差动作压到 0'];

  function buildScenePain() {
    var s = sceneSvg(
      'PPO 留下三个麻烦：概率比方差大、数据用完即丢、裁剪阈值要调；' +
        'AWR 不再加约束，而是把强化学习改写成一次加权监督学习'
    );
    s.appendChild(svgText(60, 30, '学完 PPO 之后，还剩三个麻烦', 'demo-x-ink2', 13.5));

    var left = svgEl('g', {});
    left.appendChild(paint(svgEl('rect', { x: 40, y: 48, width: 350, height: 262, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    left.appendChild(svgText(215, 72, 'PPO：概率比 + 裁剪 + on-policy', 'demo-x-ink2', 12, 'middle'));
    s.appendChild(left);
    var ratio = svgMath(215, 112, 'r_t(\\theta) = \\frac{\\pi_\\theta(a \\mid s)}{\\pi_{\\theta_{old}}(a \\mid s)}', {
      size: 13, anchor: 'middle', cls: 'demo-x-ink2', w: 320, display: true
    });
    s.appendChild(ratio);

    var pains = S1_PAINS.map(function (p, i) {
      var y = 170 + i * 46;
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: 62, y: y - 18, width: 306, height: 38, rx: 6, 'stroke-width': 1 }), C_SURFACE, C_BAD));
      g.appendChild(paint(svgText(78, y - 1, p.t, null, 11.5), C_BAD));
      g.appendChild(svgRich(78, y + 14, p.d, { size: 10, cls: 'demo-x-mut' }));
      s.appendChild(g);
      return { g: g, at: 1.2 + i * 1.1 };
    });

    var right = svgEl('g', {});
    right.appendChild(paint(svgEl('rect', { x: 410, y: 48, width: 350, height: 262, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, C_ACCENT));
    right.appendChild(svgText(585, 72, 'AWR：把 RL 变成加权监督学习', 'demo-x-acc', 12, 'middle'));
    s.appendChild(right);
    var obj = svgMath(585, 112, '\\max_\\theta \\; \\sum_i w_i \\log \\pi_\\theta(a_i \\mid s_i)', {
      size: 13, anchor: 'middle', cls: 'demo-x-acc', w: 330
    });
    var wDef = svgMath(585, 152, 'w_i = \\frac{1}{Z} \\exp\\left( \\frac{A_i}{\\beta} \\right)', {
      size: 13, anchor: 'middle', cls: 'demo-x-acc', w: 330, display: true
    });
    s.appendChild(obj);
    s.appendChild(wDef);

    var gains = S1_GAINS.map(function (txt, i) {
      var y = 206 + i * 34;
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: 432, y: y - 13, width: 306, height: 26, rx: 6, 'stroke-width': 1 }), C_SURFACE, C_GOOD));
      g.appendChild(svgRich(446, y + 4, '✓ ' + txt, { size: 10.5 }).setTone(C_GOOD));
      s.appendChild(g);
      return { g: g, at: 7.4 + i * 0.8 };
    });

    var chip = svgEl('g', {});
    chip.appendChild(paint(svgEl('rect', { x: 110, y: 324, width: 580, height: 30, rx: 15, 'stroke-width': 1, 'stroke-dasharray': '5 4' }), C_SURFACE, C_MUTED));
    chip.appendChild(svgText(400, 343, '整个算法只有两步交替：① 评估「这个动作有多好」  ② 改进「按权重模仿好动作」', 'demo-x-mut', 11, 'middle'));
    s.appendChild(chip);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 382, '好的动作多学，差的动作少学（甚至不学）', null, 15.5, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 406, '接下来五幕，就是把这一句拆开', 'demo-x-mut', 11.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      setOpacity(left, seg(t, 0.2, 0.8));
      setOpacity(ratio, seg(t, 0.5, 1.1));
      pains.forEach(function (p) { setOpacity(p.g, seg(t, p.at, p.at + 0.5)); });
      setOpacity(right, seg(t, 5.0, 5.6));
      setOpacity(obj, seg(t, 5.8, 6.4));
      setOpacity(wDef, seg(t, 6.6, 7.2));
      gains.forEach(function (g) { setOpacity(g.g, seg(t, g.at, g.at + 0.45)); });
      setOpacity(chip, seg(t, 10.4, 11.2));
      setOpacity(foot, seg(t, 12.2, 13.0));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 2: 第一步 —— 优势 A = R − V ── */
  /* 三条样本就是笔记「第 3 步：计算优势值」里手写的那三条。 */
  var S2_ROWS = [
    { name: '样本 A：偶然一个好动作', R: 600, V: 200, tone: C_GOOD },
    { name: '样本 B：普通动作', R: -50, V: -50, tone: C_MUTED },
    { name: '样本 C：坏动作', R: -100, V: 100, tone: C_BAD }
  ];
  var S2_LO = -200,
    S2_HI = 700,
    S2_X0 = 330,
    S2_X1 = 636;

  /* 排版用的负号（U+2212），和笔记正文里的 −3 / −200 保持一致。 */
  function s2num(v) {
    return (v < 0 ? '\u2212' : '') + Math.abs(v);
  }

  function s2x(v) {
    return S2_X0 + ((v - S2_LO) / (S2_HI - S2_LO)) * (S2_X1 - S2_X0);
  }

  function buildSceneAdvantage() {
    var s = sceneSvg('第一步是评估：优势 A = 实际拿到的回报 R 减去价值网络的预期 V(s)，三条样本分别得到 +400、0、−200');
    s.appendChild(svgText(60, 30, '第一步 · 评估：这个动作比「平均」好多少？', 'demo-x-ink2', 13.5));
    var formula = svgMath(400, 68, 'A(s_t, a_t) = R_t - V_\\phi(s_t), \\qquad R_t = \\sum_{k} \\gamma^k r_{t+k}', {
      size: 13, anchor: 'middle', cls: 'demo-x-ink2', w: 620
    });
    s.appendChild(formula);

    var rows = S2_ROWS.map(function (row, i) {
      var y = 146 + i * 74;
      var g = svgEl('g', {});
      g.appendChild(svgText(56, y + 4, row.name, 'demo-x-ink2', 11.5));
      g.appendChild(paint(svgEl('line', { x1: S2_X0, y1: y, x2: S2_X1, y2: y, 'stroke-width': 1 }), null, C_BORDER));
      var bar = paint(svgEl('rect', { x: s2x(row.V), y: y - 7, width: 0, height: 14, rx: 3 }), row.tone);
      bar.style.opacity = 0.55;
      g.appendChild(bar);
      g.appendChild(paint(svgEl('line', { x1: s2x(row.V), y1: y - 15, x2: s2x(row.V), y2: y + 15, 'stroke-width': 1.8 }), null, C_MUTED));
      g.appendChild(svgText(s2x(row.V), y + 30, 'V = ' + s2num(row.V), 'demo-x-mut', 10, 'middle'));
      var head = paint(svgEl('circle', { cx: s2x(row.V), cy: y, r: 5, 'stroke-width': 1.4 }), row.tone, C_SURFACE2);
      g.appendChild(head);
      g.appendChild(svgText(s2x(row.R), y - 20, 'R = ' + s2num(row.R), 'demo-x-mut', 10, 'middle'));
      var adv = row.R - row.V;
      var label = paint(svgText(664, y + 5, 'A = ' + (adv > 0 ? '+' : '') + s2num(adv), null, 14), row.tone);
      g.appendChild(label);
      s.appendChild(g);
      return { g: g, bar: bar, head: head, label: label, row: row, at: 1.6 + i * 1.8 };
    });

    var band = svgEl('g', {});
    band.appendChild(paint(svgEl('rect', { x: 60, y: 344, width: 680, height: 32, rx: 8, 'stroke-width': 1, 'stroke-dasharray': '5 4' }), C_SURFACE, C_WARN));
    band.appendChild(paint(svgText(400, 364, '注意样本 B：回报是负的，优势却是 0 —— 优势看的不是「赚没赚」，是「有没有超出预期」', null, 11, 'middle'), C_WARN));
    s.appendChild(band);

    var foot = svgEl('g', {});
    foot.appendChild(svgRich(400, 400, '源码只有两行：adv = new_vals − vals，再按 batch 归一化成 $\\hat{A}$', { size: 12.5, cls: 'demo-x-mono', anchor: 'middle' }).setTone(C_ACCENT));
    s.appendChild(foot);

    function draw(t) {
      setOpacity(formula, seg(t, 0.3, 0.9));
      rows.forEach(function (r) {
        setOpacity(r.g, seg(t, r.at, r.at + 0.4));
        var u = ease(seg(t, r.at + 0.4, r.at + 1.2));
        var from = s2x(r.row.V),
          to = s2x(r.row.V) + (s2x(r.row.R) - s2x(r.row.V)) * u;
        r.bar.setAttribute('x', Math.min(from, to).toFixed(1));
        r.bar.setAttribute('width', Math.abs(to - from).toFixed(1));
        r.head.setAttribute('cx', to.toFixed(1));
        setOpacity(r.label, seg(t, r.at + 1.1, r.at + 1.5));
      });
      setOpacity(band, seg(t, 8.2, 9.0));
      setOpacity(foot, seg(t, 11.0, 11.8));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 3: 第二步 —— exp(A/β) → Z → 权重 ── */
  /* 正文那张表的 4 个样本，走的是第一个演示的同一个 awrWeights()。 */
  var S3_ADVS = WEIGHT_PRESETS[0].advs;
  var S3_W = awrWeights(S3_ADVS, 1, Infinity);
  var S3_ESS = ess(S3_W.w);
  var S3_FLAT = awrWeights(S3_ADVS, 3, Infinity);
  var S3_FLAT_ESS = ess(S3_FLAT.w);
  var S3_CX = [206, 328, 450, 572];

  function buildSceneWeights() {
    var s = sceneSvg(
      '第二步把优势变成权重：exp(A/β) 先把好坏拉开，再除以配分函数 Z 归一化；' +
        '正文那 4 个样本里 A = +5 的一条拿走 97.5% 的权重'
    );
    s.appendChild(svgText(60, 30, '第二步 · 改进：把优势变成权重', 'demo-x-ink2', 13.5));
    var formula = svgMath(400, 68, 'w_i = \\frac{\\exp(A_i / \\beta)}{Z}, \\qquad Z = \\sum_j \\exp(A_j / \\beta)', {
      size: 13, anchor: 'middle', cls: 'demo-x-ink2', w: 620
    });
    s.appendChild(formula);

    s.appendChild(svgRich(64, 108, '样本（$\\beta = 1$）', { size: 10.5, cls: 'demo-x-mut' }));
    S3_CX.forEach(function (cx, i) {
      s.appendChild(svgMath(cx, 108, 'a_' + (i + 1), { size: 10.5, cls: 'demo-x-mut', anchor: 'middle', w: 40 }));
    });
    s.appendChild(svgRich(64, 142, '优势 $A$', { size: 11, cls: 'demo-x-ink2' }));
    s.appendChild(svgMath(64, 180, '\\exp(A / \\beta)', { size: 11, cls: 'demo-x-ink2', w: 90 }));
    s.appendChild(svgRich(64, 218, '权重 $w$', { size: 11, cls: 'demo-x-ink2' }));

    var advCells = S3_ADVS.map(function (a, i) {
      var n = paint(svgText(S3_CX[i], 142, (a > 0 ? '+' : '') + fmt(a, 0), 'demo-x-mono', 13, 'middle'),
        a > 0 ? C_GOOD : a < 0 ? C_BAD : C_MUTED);
      s.appendChild(n);
      return { el: n, at: 1.2 + i * 0.3 };
    });
    var expCells = S3_W.raw.map(function (r, i) {
      var n = paint(svgText(S3_CX[i], 180, fmt(r, 2), 'demo-x-mono', 13, 'middle'), C_ACCENT);
      s.appendChild(n);
      return { el: n, at: 2.8 + i * 0.4 };
    });
    var wCells = S3_W.w.map(function (w, i) {
      var n = paint(svgText(S3_CX[i], 218, w >= 0.001 ? fmt(w, 3) : fmt(w, 4), 'demo-x-mono', 13, 'middle'),
        i === 0 ? C_ACCENT : C_MUTED);
      s.appendChild(n);
      return { el: n, at: 6.0 + i * 0.3 };
    });

    var zBox = svgEl('g', {});
    zBox.appendChild(paint(svgEl('rect', { x: 628, y: 160, width: 132, height: 40, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, C_ACCENT));
    zBox.appendChild(svgRich(694, 176, '配分函数 $Z$', { size: 10, cls: 'demo-x-mut', anchor: 'middle', w: 130 }));
    zBox.appendChild(paint(svgText(694, 192, fmt(S3_W.Z, 2), 'demo-x-mono', 12.5, 'middle'), C_ACCENT));
    s.appendChild(zBox);

    var base = 330;
    var bars = S3_W.w.map(function (w, i) {
      var g = svgEl('g', {});
      var h = w * 92;
      var rect = paint(svgEl('rect', { x: S3_CX[i] - 20, y: base, width: 40, height: 0, rx: 3 }), i === 0 ? C_ACCENT : C_MUTED);
      g.appendChild(rect);
      g.appendChild(paint(svgText(S3_CX[i], base + 18, fmt(w * 100, w >= 0.01 ? 1 : 2) + '%', 'demo-x-mono', 10.5, 'middle'),
        i === 0 ? C_ACCENT : C_MUTED));
      s.appendChild(g);
      return { g: g, rect: rect, h: h };
    });
    s.appendChild(paint(svgEl('line', { x1: 150, y1: base, x2: 636, y2: base, 'stroke-width': 1 }), null, C_BORDER));
    s.appendChild(svgText(64, base + 4, '归一化权重', 'demo-x-mut', 10.5));

    var essBox = svgEl('g', {});
    essBox.appendChild(paint(svgEl('rect', { x: 628, y: 252, width: 132, height: 44, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, C_BAD));
    essBox.appendChild(svgText(694, 270, '有效样本数 ESS', 'demo-x-mut', 10, 'middle'));
    essBox.appendChild(paint(svgText(694, 288, fmt(S3_ESS, 2) + ' / 4', 'demo-x-mono', 12.5, 'middle'), C_BAD));
    s.appendChild(essBox);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 374, '这一批里实际只有一条样本在训练策略', null, 15, 'middle'), C_ACCENT));
    foot.appendChild(svgRich(400, 400, '$\\beta$ 越小越像「只模仿最好的一条」（ESS → 1）；$\\beta = 3$ 时 ESS 回到 ' + fmt(S3_FLAT_ESS, 2) + ' / 4，好坏一起学', { size: 11.5, cls: 'demo-x-mut', anchor: 'middle' }));
    s.appendChild(foot);

    function draw(t) {
      setOpacity(formula, seg(t, 0.3, 0.9));
      advCells.forEach(function (c) { setOpacity(c.el, seg(t, c.at, c.at + 0.3)); });
      expCells.forEach(function (c) { setOpacity(c.el, seg(t, c.at, c.at + 0.3)); });
      setOpacity(zBox, seg(t, 5.0, 5.6));
      wCells.forEach(function (c) { setOpacity(c.el, seg(t, c.at, c.at + 0.3)); });
      var u = ease(seg(t, 6.2, 8.2));
      bars.forEach(function (b) {
        setOpacity(b.g, seg(t, 6.2, 6.8));
        b.rect.setAttribute('height', (b.h * u).toFixed(1));
        b.rect.setAttribute('y', (base - b.h * u).toFixed(1));
      });
      setOpacity(essBox, seg(t, 9.0, 9.7));
      setOpacity(foot, seg(t, 12.0, 12.8));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 4: 加权回归 = 一次加权平均 ── */
  /* 和第二个演示同一批采样（mulberry32(7)、μ_old = −0.3、σ_old = 0.8），
     只是把 β 从 0.3 换到 0.05 看策略怎么塌。S4_CLIP 是打开源码里的
     a_weight_clip = 20 之后的同一次更新。 */
  var S4_BATCH = sampleBatch(-0.3, 0.8, mulberry32(7));
  var S4_SOFT = weightedFit(S4_BATCH, 0.3, Infinity, true, 0.8);
  var S4_HARD = weightedFit(S4_BATCH, 0.05, Infinity, true, 0.8);
  var S4_CLIP = weightedFit(S4_BATCH, 0.05, 20, true, 0.8);
  var S4_SOFT_ESS = ess(S4_SOFT.w),
    S4_HARD_ESS = ess(S4_HARD.w),
    S4_CLIP_ESS = ess(S4_CLIP.w);
  var S4_CLIPPED = S4_HARD.adv.filter(function (a) {
    return Math.exp(a / 0.05) > 20;
  }).length;
  var S4_MU0 = -0.3,
    S4_SIG0 = 0.8;
  var S4_X0 = 70,
    S4_X1 = 744,
    S4_BASE = 300,
    S4_TOP = 120;

  function s4x(a) {
    return S4_X0 + ((a - REG.aLo) / (REG.aHi - REG.aLo)) * (S4_X1 - S4_X0);
  }

  /* A curve normalised to its own peak, so a σ = 0.08 spike and a σ = 0.8 hill
     are both visible on the same 190 px of height. */
  function s4curve(mu, sigma) {
    var pts = [],
      peak = gaussPdf(mu, mu, sigma);
    for (var i = 0; i <= 120; i++) {
      var a = REG.aLo + ((REG.aHi - REG.aLo) * i) / 120;
      pts.push([s4x(a), S4_BASE - (gaussPdf(a, mu, sigma) / peak) * (S4_BASE - S4_TOP)]);
    }
    return pts;
  }

  function buildSceneRegression() {
    var s = sceneSvg(
      '加权最大似然对高斯策略有闭式解：新的均值就是样本按权重的加权平均；' +
        'β 拖到 0.05 时标准差塌到 ' + fmt(S4_HARD.sigma, 2) + '，策略不再探索'
    );
    s.appendChild(svgText(60, 30, '一次更新做了什么：新的均值 = 样本的加权平均', 'demo-x-ink2', 13.5));
    var formula = svgMath(400, 62, '\\mu_{new} = \\sum_i w_i a_i, \\qquad w_i \\propto \\exp\\left( \\frac{r_i - V}{\\beta} \\right)', {
      size: 12.5, anchor: 'middle', cls: 'demo-x-ink2', w: 600
    });
    s.appendChild(formula);

    // 真实回报 r(a)：只是背景，告诉读者「最优动作在 a = 1」
    var rPts = [];
    for (var i = 0; i <= 120; i++) {
      var a = REG.aLo + ((REG.aHi - REG.aLo) * i) / 120;
      rPts.push([s4x(a), S4_BASE - reward(a) * 78]);
    }
    var rCurve = paint(svgEl('path', { d: polyPath(rPts), fill: 'none', 'stroke-width': 1.4, 'stroke-dasharray': '4 4' }), null, C_MUTED);
    s.appendChild(rCurve);
    var rLabel = svgRich(s4x(1.5), S4_BASE - reward(1.5) * 78 - 10, '真实回报 $r(a)$，最优在 $a = 1$', { size: 10.5, cls: 'demo-x-mut' });
    s.appendChild(rLabel);

    s.appendChild(paint(svgEl('line', { x1: S4_X0, y1: S4_BASE, x2: S4_X1, y2: S4_BASE, 'stroke-width': 1 }), null, C_BORDER));
    [-2, -1, 0, 1, 2, 3].forEach(function (a) {
      s.appendChild(svgText(s4x(a), S4_BASE + 16, fmt(a, 0), 'demo-x-mono', 10, 'middle'));
    });
    s.appendChild(svgRich(S4_X1, S4_BASE + 34, '动作 $a$（这一步迈多大）', { size: 10.5, cls: 'demo-x-mut', anchor: 'end' }));

    var maxSoft = Math.max.apply(null, S4_SOFT.w),
      maxHard = Math.max.apply(null, S4_HARD.w);
    var dots = S4_BATCH.map(function (d, k) {
      var c = paint(svgEl('circle', { cx: s4x(d.a), cy: S4_BASE, r: 3.2, 'stroke-width': 1 }), C_GOOD, C_SURFACE2);
      c.style.opacity = 0.85;
      s.appendChild(c);
      return { el: c, soft: 2 + 7 * Math.sqrt(S4_SOFT.w[k] / maxSoft), hard: 2 + 7 * Math.sqrt(S4_HARD.w[k] / maxHard) };
    });

    var oldCurve = paint(svgEl('path', { d: polyPath(s4curve(S4_MU0, S4_SIG0)), fill: 'none', 'stroke-width': 1.8, 'stroke-dasharray': '6 4' }), null, C_WARN);
    s.appendChild(oldCurve);
    var oldLine = paint(svgEl('line', { x1: s4x(S4_MU0), y1: S4_TOP, x2: s4x(S4_MU0), y2: S4_BASE, 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }), null, C_WARN);
    s.appendChild(oldLine);
    var oldLabel = svgRich(s4x(S4_MU0), S4_TOP - 8, '旧策略 $\\mu = ' + fmt(S4_MU0, 2) + '$，$\\sigma = ' + fmt(S4_SIG0, 2) + '$', { size: 10.5, anchor: 'middle' }).setTone(C_WARN);
    s.appendChild(oldLabel);

    var newCurve = paint(svgEl('path', { d: polyPath(s4curve(S4_SOFT.mu, S4_SOFT.sigma)), fill: 'none', 'stroke-width': 2.4 }), null, C_ACCENT);
    s.appendChild(newCurve);
    var newLine = paint(svgEl('line', { x1: s4x(S4_SOFT.mu), y1: S4_TOP, x2: s4x(S4_SOFT.mu), y2: S4_BASE, 'stroke-width': 1.4 }), null, C_ACCENT);
    s.appendChild(newLine);
    /* 均值与标准差逐帧在变：公式只画一次，数字交给 svgText */
    var newLabel = svgRich(s4x(S4_SOFT.mu) + 8, S4_TOP - 26, '新策略 $\\mu, \\sigma$ =', { size: 11, anchor: 'end', w: 160 }).setTone(C_ACCENT);
    var newNums = paint(svgText(s4x(S4_SOFT.mu) + 12, S4_TOP - 26, '', null, 11), C_ACCENT);
    s.appendChild(newLabel);
    s.appendChild(newNums);

    var readouts = [
      { cx: 128, label: 'Critic 的 V', get: function () { return fmt(S4_SOFT.v, 3); }, tone: function () { return C_ACCENT; } },
      { cx: 318, label: '$\\mu$：旧 → 新', get: function (hard) { return fmt(S4_MU0, 2) + ' → ' + fmt(hard ? S4_HARD.mu : S4_SOFT.mu, 2); }, tone: function () { return C_ACCENT; } },
      { cx: 508, label: '$\\sigma$：旧 → 新', get: function (hard) { return fmt(S4_SIG0, 2) + ' → ' + fmt(hard ? S4_HARD.sigma : S4_SOFT.sigma, 2); }, tone: function (hard) { return hard ? C_BAD : C_ACCENT; } },
      { cx: 690, label: 'ESS', get: function (hard) { return fmt(hard ? S4_HARD_ESS : S4_SOFT_ESS, 1) + ' / ' + REG.batch; }, tone: function (hard) { return hard ? C_BAD : C_ACCENT; } }
    ].map(function (r) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: r.cx - 86, y: 346, width: 172, height: 34, rx: 6, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
      g.appendChild(svgRich(r.cx - 74, 360, r.label, { size: 10, cls: 'demo-x-mut', w: 140 }));
      var val = paint(svgText(r.cx + 74, 360, r.get(false), 'demo-x-mono', 11, 'end'), C_ACCENT);
      g.appendChild(val);
      s.appendChild(g);
      return { g: g, val: val, get: r.get, tone: r.tone };
    });

    var betaTag = svgMath(70, 108, '\\beta = 0.30', { size: 13, w: 110 }).setTone(C_ACCENT);
    s.appendChild(betaTag);

    var clipChip = svgEl('g', {});
    clipChip.appendChild(paint(svgEl('rect', { x: 84, y: 384, width: 632, height: 26, rx: 13, 'stroke-width': 1, 'stroke-dasharray': '5 4' }), C_SURFACE, C_WARN));
    clipChip.appendChild(svgRich(400, 401,
      '打开源码的 a_weight_clip = 20：' + S4_CLIPPED + ' 条样本一起顶到上限，$\\sigma$ 又被拉回 ' + fmt(S4_CLIP.sigma, 2) + ' —— 上限救的是数值，代价是权重被拉平',
      { size: 10.5, anchor: 'middle' }).setTone(C_WARN));
    s.appendChild(clipChip);

    function draw(t) {
      setOpacity(formula, seg(t, 0.3, 0.9));
      setOpacity(rCurve, seg(t, 0.6, 1.2));
      setOpacity(rLabel, seg(t, 0.6, 1.2));
      var appear = seg(t, 1.2, 2.0);
      var u1 = ease(seg(t, 3.4, 5.0)); // 等权 → β = 0.3 的权重
      var u2 = ease(seg(t, 8.4, 10.0)); // β = 0.3 → β = 0.05
      dots.forEach(function (d) {
        setOpacity(d.el, appear * 0.85);
        var r = 3.2 + (d.soft - 3.2) * u1;
        d.el.setAttribute('r', (r + (d.hard - r) * u2).toFixed(2));
      });
      setOpacity(oldCurve, seg(t, 2.2, 2.8));
      setOpacity(oldLine, seg(t, 2.2, 2.8));
      setOpacity(oldLabel, seg(t, 2.2, 2.8));

      var mu = S4_SOFT.mu + (S4_HARD.mu - S4_SOFT.mu) * u2;
      var sigma = S4_SOFT.sigma + (S4_HARD.sigma - S4_SOFT.sigma) * u2;
      newCurve.setAttribute('d', polyPath(s4curve(mu, sigma)));
      newLine.setAttribute('x1', s4x(mu).toFixed(1));
      newLine.setAttribute('x2', s4x(mu).toFixed(1));
      newLabel.setX(s4x(mu) + 8);
      newNums.setAttribute('x', (s4x(mu) + 12).toFixed(1));
      newNums.textContent = fmt(mu, 2) + ', ' + fmt(sigma, 2);
      var on = seg(t, 5.2, 6.2);
      setOpacity(newCurve, on);
      setOpacity(newLine, on);
      setOpacity(newLabel, on);
      setOpacity(newNums, on);

      var hard = u2 > 0.5;
      readouts.forEach(function (r) {
        setOpacity(r.g, seg(t, 6.6, 7.2));
        r.val.textContent = r.get(hard);
        r.val.style.fill = r.tone(hard);
      });
      betaTag.setTex('\\beta = ' + fmt(hard ? 0.05 : 0.3, 2)).setTone(hard ? C_BAD : C_ACCENT);
      setOpacity(clipChip, seg(t, 11.6, 12.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 5: off-policy 的赚与亏 ── */
  /* 三条平均曲线都来自上面第三个演示的 runSet()：24 个种子、β = 0.5、种子 3 起步。 */
  var S5_FRESH = runSet(3, 0.5, 1);
  var S5_REUSE = runSet(3, 0.5, 4);
  var S5_STALE = runSet(3, 0.5, 20);
  var S5_X0 = 336,
    S5_X1 = 758,
    S5_Y0 = 296,
    S5_Y1 = 96,
    S5_JLO = 0.5,
    S5_JHI = 1.02;

  function s5pts(set) {
    return set.mean.map(function (j, i) {
      return [
        S5_X0 + (i / (set.mean.length - 1)) * (S5_X1 - S5_X0),
        S5_Y0 - ((j - S5_JLO) / (S5_JHI - S5_JLO)) * (S5_Y0 - S5_Y1)
      ];
    });
  }

  /* The first `u` of a polyline, so a curve can draw itself left to right. */
  function s5prefix(pts, u) {
    var n = Math.max(2, Math.round(u * (pts.length - 1)) + 1);
    return polyPath(pts.slice(0, n));
  }

  function buildSceneBuffer() {
    var s = sceneSvg(
      'off-policy 的账：把最近 4 轮留在 buffer 里，种子间标准差从 ' + fmt(S5_FRESH.sd, 3) +
        ' 降到 ' + fmt(S5_REUSE.sd, 3) + '；留 20 轮则样本平均 ' + fmt(S5_STALE.last.staleness, 1) + ' 轮旧，回报反而掉下去'
    );
    s.appendChild(svgText(60, 30, 'off-policy：赚的是方差，亏的是新鲜度', 'demo-x-ink2', 13.5));

    var cards = [
      { keep: 1, set: S5_FRESH, tone: C_MUTED, name: 'N = 1：用完即丢（on-policy）' },
      { keep: 4, set: S5_REUSE, tone: C_ACCENT, name: 'N = 4：留最近 4 轮' },
      { keep: 20, set: S5_STALE, tone: C_WARN, name: 'N = 20：留最近 20 轮' }
    ].map(function (c, i) {
      var y = 76 + i * 78;
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: 46, y: y, width: 262, height: 62, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, c.tone));
      g.appendChild(paint(svgText(62, y + 21, c.name, null, 11.5), c.tone));
      g.appendChild(svgText(62, y + 38, '每次更新 ' + c.set.last.samples + ' 条样本 · 平均年龄 ' + fmt(c.set.last.staleness, 1) + ' 轮', 'demo-x-mut', 10));
      g.appendChild(svgText(62, y + 53, '24 个种子的平均最终回报 ' + fmt(c.set.fMean, 3) + '（标准差 ' + fmt(c.set.sd, 3) + '）', 'demo-x-mut', 10));
      s.appendChild(g);
      return { g: g, at: 1.0 + i * 3.6 };
    });

    s.appendChild(paint(svgEl('rect', { x: S5_X0, y: S5_Y1 - 14, width: S5_X1 - S5_X0, height: S5_Y0 - S5_Y1 + 14, rx: 6, 'stroke-width': 1 }), 'none', C_BORDER));
    s.appendChild(svgRich(S5_X0 + 8, S5_Y1 - 22, '真实回报 $J(\\pi)$：24 个种子的平均', { size: 10.5, cls: 'demo-x-mut' }));
    [0.6, 0.8, 1.0].forEach(function (j) {
      var y = S5_Y0 - ((j - S5_JLO) / (S5_JHI - S5_JLO)) * (S5_Y0 - S5_Y1);
      s.appendChild(paint(svgEl('line', { x1: S5_X0, y1: y, x2: S5_X1, y2: y, 'stroke-width': 1, 'stroke-dasharray': '3 4' }), null, C_BORDER));
      s.appendChild(svgText(S5_X0 - 6, y + 4, fmt(j, 1), 'demo-x-mono', 10, 'end'));
    });
    s.appendChild(svgText(S5_X1, S5_Y0 + 20, '训练迭代 →', 'demo-x-mut', 10.5, 'end'));

    var curves = [
      { pts: s5pts(S5_FRESH), tone: C_MUTED, w: 1.8, from: 1.2, to: 3.2 },
      { pts: s5pts(S5_REUSE), tone: C_ACCENT, w: 2.6, from: 4.8, to: 6.8 },
      { pts: s5pts(S5_STALE), tone: C_WARN, w: 2.0, from: 8.4, to: 10.4 }
    ].map(function (c) {
      var path = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': c.w, 'stroke-linejoin': 'round' }), null, c.tone);
      s.appendChild(path);
      return { path: path, spec: c };
    });

    var win = svgEl('g', {});
    win.appendChild(paint(svgEl('rect', { x: 46, y: 320, width: 340, height: 56, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, C_GOOD));
    win.appendChild(paint(svgText(62, 340, '赚：种子间标准差 ' + fmt(S5_FRESH.sd, 3) + ' → ' + fmt(S5_REUSE.sd, 3), null, 11.5), C_GOOD));
    win.appendChild(svgText(62, 358, '每轮抖动 ' + fmt(S5_FRESH.jitter, 3) + ' → ' + fmt(S5_REUSE.jitter, 3) + '；平均回报 ' + fmt(S5_FRESH.fMean, 3) + ' → ' + fmt(S5_REUSE.fMean, 3), 'demo-x-mut', 10));
    s.appendChild(win);

    var lose = svgEl('g', {});
    lose.appendChild(paint(svgEl('rect', { x: 406, y: 320, width: 348, height: 56, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, C_BAD));
    lose.appendChild(paint(svgText(422, 340, '亏：留 20 轮 → 样本平均 ' + fmt(S5_STALE.last.staleness, 1) + ' 轮旧', null, 11.5), C_BAD));
    lose.appendChild(svgText(422, 358, '平均回报回落到 ' + fmt(S5_STALE.fMean, 3) + ' —— 动作分布已经不是当前策略的了', 'demo-x-mut', 10));
    s.appendChild(lose);

    var foot = paint(svgText(400, 404, '复用旧数据买的是方差，不是速度 —— 前提是别放太久', null, 14.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      cards.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.5)); });
      curves.forEach(function (c) {
        var u = ease(seg(t, c.spec.from, c.spec.to));
        setOpacity(c.path, seg(t, c.spec.from, c.spec.from + 0.3));
        c.path.setAttribute('d', u > 0 ? s5prefix(c.spec.pts, u) : '');
      });
      setOpacity(win, seg(t, 7.0, 7.8));
      setOpacity(lose, seg(t, 10.6, 11.4));
      setOpacity(foot, seg(t, 13.0, 13.8));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 6: 一整轮的闭环，以及它在源码里的落点 ── */
  var S6_STEPS = [
    { t: '① rollout 收集', d: '当前策略跑环境，样本写进 buffer（旧的不删）', src: '_rollout_train()', cx: 160, cy: 84 },
    { t: '② 从 buffer 采样', d: '新旧数据混在一起，batch = 256', src: 'ExperienceBuffer', cx: 400, cy: 84 },
    { t: '③ 更新 Critic', d: 'MSE 拟合 TD-$\\lambda$ 回报，critic_epochs = 2', src: '_compute_critic_loss()', cx: 640, cy: 84 },
    { t: '④ 算优势', d: '$A = R - V(s)$，再按 batch 归一化成 $\\hat{A}$', src: '_build_train_data()', cx: 640, cy: 204 },
    { t: '⑤ 变权重', d: '$w = \\mathrm{clamp}(\\exp(\\hat{A}/\\beta),\\ \\max = 20)$', src: '_build_train_data()', cx: 400, cy: 204 },
    { t: '⑥ 加权回归', d: '$-\\mathrm{mean}(w \\log \\pi(a \\mid s))$，actor_epochs = 5', src: '_compute_actor_loss()', cx: 160, cy: 204 }
  ];
  /* 每条连线是「上一个框的出口 → 下一个框的入口」，token 就在这 30~46 px 上滑。 */
  var S6_LINKS = [
    [[268, 121], [290, 121]],
    [[508, 121], [530, 121]],
    [[640, 158], [640, 202]],
    [[532, 241], [510, 241]],
    [[292, 241], [270, 241]],
    [[160, 204], [160, 160]]
  ];
  var S6_STEP_SEC = 1.0,
    S6_CYCLE_AT = 4.8;

  function buildSceneLoop() {
    var s = sceneSvg(
      'AWR 的一整轮：rollout → buffer → Critic → 优势 → 指数权重 → 加权回归，' +
        '再回到 rollout；源码落点只有 _build_train_data() 和 _compute_actor_loss() 两处'
    );
    var arrow = arrowMarker(s, 'awr-x-arrow', C_MUTED);
    s.appendChild(svgText(60, 30, '一整轮 AWR：两步交替，落到源码就是两个函数', 'demo-x-ink2', 13.5));

    S6_LINKS.forEach(function (pts) {
      s.appendChild(paint(svgEl('path', {
        d: polyPath(pts), fill: 'none', 'stroke-width': 1.6, 'marker-end': arrow
      }), null, C_MUTED));
    });

    var boxes = S6_STEPS.map(function (st, i) {
      var g = svgEl('g', {});
      var rect = paint(svgEl('rect', { x: st.cx - 108, y: st.cy, width: 216, height: 74, rx: 9, 'stroke-width': 1.2 }), C_SURFACE2, C_BORDER);
      g.appendChild(rect);
      var title = paint(svgText(st.cx, st.cy + 22, st.t, null, 12.5, 'middle'), C_ACCENT);
      g.appendChild(title);
      g.appendChild(svgRich(st.cx, st.cy + 41, st.d, { size: 9.5, cls: 'demo-x-mut', anchor: 'middle', w: 220 }));
      g.appendChild(paint(svgText(st.cx, st.cy + 61, st.src, 'demo-x-mono', 10, 'middle'), C_GOOD));
      s.appendChild(g);
      return { g: g, rect: rect, at: 0.6 + i * 0.55 };
    });

    var token = paint(svgEl('circle', { cx: 0, cy: 0, r: 5.5, 'stroke-width': 1.4 }), C_ACCENT, C_SURFACE);
    s.appendChild(token);

    var chip = svgEl('g', {});
    chip.appendChild(paint(svgEl('rect', { x: 64, y: 296, width: 672, height: 30, rx: 15, 'stroke-width': 1, 'stroke-dasharray': '5 4' }), C_SURFACE, C_MUTED));
    chip.appendChild(svgText(400, 315, 'awr_temp: 1.0 · a_weight_clip: 20.0 · critic_epochs: 2 · actor_epochs: 5（同一批权重被 Actor 刷 5 遍）', 'demo-x-mono', 9.5, 'middle'));
    s.appendChild(chip);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 350, '整个循环里没有概率比、没有 clip、没有 KL 约束', null, 15, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 374, 'AWRAgent 也因此不继承 PPOAgent —— Actor 更新是监督式的加权最大似然', 'demo-x-mut', 11.5, 'middle'));
    foot.appendChild(paint(svgText(400, 400, 'AWR = 从经验里挑出好动作，然后像做监督学习一样模仿它们', null, 13, 'middle'), C_GOOD));
    s.appendChild(foot);

    function draw(t) {
      var live = t - S6_CYCLE_AT;
      var active = -1,
        frac = 0;
      if (live >= 0) {
        active = Math.floor(live / S6_STEP_SEC) % S6_STEPS.length;
        frac = (live / S6_STEP_SEC) % 1;
      }
      boxes.forEach(function (b, i) {
        setOpacity(b.g, seg(t, b.at, b.at + 0.45));
        var on = i === active;
        b.rect.style.stroke = on ? C_ACCENT : C_BORDER;
        b.rect.setAttribute('stroke-width', on ? 2.4 : 1.2);
      });
      if (active >= 0 && frac > 0.62) {
        var p = pointOn(S6_LINKS[active], (frac - 0.62) / 0.38);
        token.setAttribute('cx', p[0].toFixed(1));
        token.setAttribute('cy', p[1].toFixed(1));
        setOpacity(token, 1);
      } else {
        setOpacity(token, 0);
      }
      setOpacity(chip, seg(t, 8.6, 9.4));
      setOpacity(foot, seg(t, 10.6, 11.4));
    }

    return { el: s, draw: draw };
  }

  var AWR_SCENES = [
    {
      title: 'PPO 留下的麻烦',
      dur: 14,
      build: buildScenePain,
      cues: [
        { at: 0.3, s: '学完 PPO，你已经知道「试错 → 评估 → 更新」这条主线。但 PPO 留下了三个麻烦。' },
        { at: 1.2, s: '**① 重要性采样方差大**：PPO 靠概率比 $r_t = \\pi_\\theta / \\pi_{\\theta_{old}}$ 控制更新，新旧策略一拉开，这个比值不是爆炸就是塌成 0。' },
        { at: 2.3, s: '**② 数据用完即丢**：on-policy 每轮采的样本只够更新这一轮，历史经验全部作废。' },
        { at: 3.4, s: '**③ 裁剪阈值要调**：$\\epsilon$ 换个任务就得重调，没有一个放之四海的值。' },
        { at: 5.0, s: 'AWR 的回答不是再加一个约束，而是**换一种问题形式**：把强化学习写成加权监督学习。' },
        { at: 5.8, s: '目标函数只剩一行：$\\max_\\theta \\sum_i w_i \\log \\pi_\\theta(a_i \\mid s_i)$ —— 这就是一次加权最大似然。' },
        { at: 6.6, s: '权重是 $w_i = \\exp(A_i / \\beta) / Z$：好动作权重大，差动作趋近 0。' },
        { at: 7.4, s: '于是三个麻烦一起消失：**不需要概率比、旧数据能复用、没有 $\\epsilon$ 要调**。' },
        { at: 10.4, s: '整个算法只有两步交替：**① 评估**「这个动作有多好」，**② 改进**「按权重模仿好动作」。' },
        { at: 12.2, s: '一句话：**好的动作多学，差的动作少学（甚至不学）** —— 后面五幕就是把它拆开。' }
      ]
    },
    {
      title: '① 评估：A = R − V',
      dur: 14,
      build: buildSceneAdvantage,
      cues: [
        { at: 0.3, s: '第一步和 PPO 没有任何区别：先评估，算出每个动作到底有多好。' },
        { at: 0.6, s: '价值网络 $V_\\phi(s)$ 给出「这个状态平均能拿多少分」，优势就是实际回报减掉它：$A(s_t,a_t) = R_t - V_\\phi(s_t)$。' },
        { at: 1.6, s: '**样本 A**：实际回报 600，价值网络只预期 200 → $A = +400$，比平均好得多。' },
        { at: 3.4, s: '**样本 B**：回报 −50，预期也是 −50 → $A = 0$，正好是「平均水平」。' },
        { at: 5.2, s: '**样本 C**：回报 −100，预期却有 100 → $A = -200$，比平均差。' },
        { at: 8.2, s: '注意样本 B：**回报是负的，优势却是 0**。优势看的不是「赚没赚」，而是「有没有超出预期」。' },
        { at: 11.0, s: '源码里就两行：`adv = new_vals - vals`，再按 batch 归一化成 $\\hat{A}$ —— 下一幕全部建立在这个 $\\hat{A}$ 上。' }
      ]
    },
    {
      title: '② 改进：$\\exp(A/\\beta)/Z$',
      dur: 16,
      build: buildSceneWeights,
      cues: [
        { at: 0.3, s: '第二步只做一件事：**把优势变成权重**。' },
        { at: 0.6, s: '$w_i = \\exp(A_i/\\beta)/Z$ —— 指数负责把好坏拉开，配分函数 $Z$ 负责把它归一化成和为 1 的分布。' },
        { at: 1.2, s: '拿正文那 4 个样本：优势分别是 **+5 / +1 / 0 / −3**，温度 $\\beta = 1$。' },
        { at: 2.8, s: '先算指数：**' + S3_W.raw.map(function (r) { return fmt(r, 2); }).join(' / ') + '** —— 优势差 8 个单位，权重差了三千倍。' },
        { at: 5.0, s: '$Z$ 就是它们的和 **' + fmt(S3_W.Z, 2) + '**，其中 **' + fmt(S3_W.raw[0], 2) + ' 全部来自 $A = +5$ 那一条**。' },
        { at: 6.2, s: '归一化之后：**' + S3_W.w.map(function (w) { return w >= 0.001 ? fmt(w, 3) : fmt(w, 4); }).join(' / ') + '**，第一条吃掉 **' + fmt(S3_W.w[0] * 100, 1) + '%** 的权重。' },
        { at: 9.0, s: '换成有效样本数看：**ESS ≈ ' + fmt(S3_ESS, 2) + ' / 4** —— 这一批里真正在训练策略的，只有一条样本。' },
        { at: 12.0, s: '$\\beta$ 是唯一的旋钮：$\\beta = 3$ 时 ESS 回到 **' + fmt(S3_FLAT_ESS, 2) + ' / 4**（好坏一起学），$\\beta \\to 0$ 时只剩最好的那一条。' },
        { at: 14.0, s: '**所以 AWR 不需要 clip**：差动作的权重本身就趋近 0，对 loss 的贡献可以忽略。' }
      ]
    },
    {
      title: '一次更新 = 一次加权平均',
      dur: 15,
      build: buildSceneRegression,
      cues: [
        { at: 0.3, s: '权重算出来了，可它到底把策略挪到了哪里？' },
        { at: 0.6, s: '把问题缩到最小：一个状态、一个连续动作 $a$（「这一步迈多大」），策略是高斯 $\\mathcal{N}(\\mu, \\sigma)$。' },
        { at: 1.2, s: '用旧策略 $\\mathcal{N}(' + fmt(S4_MU0, 1) + ', ' + fmt(S4_SIG0, 1) + ')$ 采 ' + REG.batch + ' 个动作；Critic 在这个单状态任务里就是这批回报的均值 **V = ' + fmt(S4_SOFT.v, 3) + '**。' },
        { at: 3.4, s: '按 $A = r - V$ 算权重 —— **圆点越大权重越高**，好动作那一侧被明显放大。' },
        { at: 5.2, s: '对高斯策略，加权最大似然有闭式解：**新的均值就是样本的加权平均** $\\mu_{new} = \\sum_i w_i a_i$。' },
        { at: 6.6, s: '$\\beta = 0.3$：$\\mu$ 从 **' + fmt(S4_MU0, 2) + '** 挪到 **' + fmt(S4_SOFT.mu, 2) + '**，$\\sigma$ 几乎没动（**' + fmt(S4_SIG0, 2) + ' → ' + fmt(S4_SOFT.sigma, 2) + '**），ESS 还有 **' + fmt(S4_SOFT_ESS, 1) + ' / ' + REG.batch + '** —— 一次温和的更新。' },
        { at: 8.4, s: '把 $\\beta$ 拖到 **0.05** 会怎样：权重几乎全压到最好的那两三条上，ESS 掉到 **' + fmt(S4_HARD_ESS, 1) + ' / ' + REG.batch + '**。' },
        { at: 10.0, s: '$\\mu$ 一步跳到 **' + fmt(S4_HARD.mu, 2) + '**（离最优 $a = 1$ 已经很近），但 $\\sigma$ 塌到 **' + fmt(S4_HARD.sigma, 2) + '** —— **策略不再探索了**。' },
        { at: 11.6, s: '这就是配置里 `actor_std_type: FIXED` / `action_std: 0.05` 固定动作方差的原因；`a_weight_clip: 20` 也在帮忙 —— 打开它，' + S4_CLIPPED + ' 条样本一起顶到上限，$\\sigma$ 又被拉回 **' + fmt(S4_CLIP.sigma, 2) + '**。' },
        { at: 13.4, s: '**一次 AWR 更新 = 一次加权平均**：没有概率比、没有裁剪、没有 KL。' }
      ]
    },
    {
      title: 'off-policy 的赚与亏',
      dur: 15,
      build: buildSceneBuffer,
      cues: [
        { at: 0.3, s: 'AWR 的第三个卖点：**旧数据还能用**。PPO 一轮采的数据更新完就丢，AWR 把它们留在 replay buffer 里。' },
        { at: 1.2, s: '玩具任务和 PPO 笔记第 3 个演示同一个：4 个动作，每轮只采 ' + SIM.batch + ' 条样本 —— 故意采少，好让方差看得见。' },
        { at: 4.8, s: '留最近 **4 轮**，每次更新就有 **' + S5_REUSE.last.samples + ' 条**样本；画的是 ' + SWEEP_SEEDS + ' 个种子的平均曲线，单条曲线在这种小任务里几乎全是运气。' },
        { at: 7.0, s: '赚在哪：种子间最终回报的标准差从 **' + fmt(S5_FRESH.sd, 3) + '** 降到 **' + fmt(S5_REUSE.sd, 3) + '**，每轮抖动 **' + fmt(S5_FRESH.jitter, 3) + ' → ' + fmt(S5_REUSE.jitter, 3) + '** —— 买到的是「稳」。' },
        { at: 8.4, s: '亏在哪：把 N 拖到 **20**，buffer 里的样本平均已经 **' + fmt(S5_STALE.last.staleness, 1) + ' 轮**旧，平均回报反而回落到 **' + fmt(S5_STALE.fMean, 3) + '**。' },
        { at: 11.0, s: '旧样本是旧策略采的，优势却按**当前** Critic 算 —— AWR 没有概率比，也就没有重要性采样来纠正这件事。' },
        { at: 13.0, s: '所以 off-policy 不是白赚：**复用旧数据买的是方差，不是速度**，前提是别放太久。' }
      ]
    },
    {
      title: '闭环与源码落点',
      dur: 16,
      build: buildSceneLoop,
      cues: [
        { at: 0.3, s: '把前面五幕接起来，AWR 的一整轮长这样。' },
        { at: 0.6, s: '**① rollout**：当前策略跑环境，样本写进 replay buffer —— 旧的**不删**。' },
        { at: 1.8, s: '**② 采样**：从 buffer 抽 batch，新旧数据混在一起。' },
        { at: 3.0, s: '**③ 更新 Critic**：MSE 拟合 TD-$\\lambda$ 回报，`critic_epochs: 2`。' },
        { at: 4.8, s: '**④ 算优势**：$A = R - V_\\phi(s)$，再按 batch 归一化成 $\\hat{A}$。' },
        { at: 6.0, s: '**⑤ 变权重**：$w = \\mathrm{clamp}(\\exp(\\hat{A}/\\beta),\\, 20)$ —— 对应 `awr_temp: 1.0` 与 `a_weight_clip: 20.0`。' },
        { at: 7.2, s: '**⑥ 加权回归**：$-\\mathrm{mean}(w \\cdot \\log \\pi(a \\mid s))$，`actor_epochs: 5`，同一批权重被 Actor 刷 5 遍。' },
        { at: 8.6, s: '然后回到 ①。整个循环里**没有概率比、没有 clip、没有 KL 约束**，只有一个权重。' },
        { at: 10.0, s: '源码落点也只有两处：`_build_train_data()` 里算出 $w$，`_compute_actor_loss()` 里做加权最大似然。' },
        { at: 12.0, s: '这也是 `AWRAgent` 不继承 `PPOAgent` 的原因 —— Actor 更新是监督式的，和概率比裁剪完全是两套逻辑。' },
        { at: 14.0, s: '**AWR = 从经验里挑出好动作，然后像做监督学习一样模仿它们。**' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '六幕动画：AWR 全流程速览',
      sub: '约 90 秒自动播放。空格播放/暂停，← → 换幕；画面里的数字与下面三个演示用的是同一批函数。',
      ariaLabel: 'AWR 六幕讲解动画',
      notes: [
        '取数依据：第三幕的 ' + fmt(S3_W.raw[0], 2) + ' / ' + fmt(S3_W.Z, 2) + ' / ' + fmt(S3_W.w[0], 3) +
          ' 与 ESS ' + fmt(S3_ESS, 2) + ' 来自下面第一个演示的同一个 `awrWeights()` + `ess()`（$A = +5 / +1 / 0 / -3$，$\\beta = 1$，未启用权重上限），也就是正文那张表的数字。',
        '第四幕的 $\\mu$ / $\\sigma$ / ESS 由第二个演示的 `weightedFit()` 在同一批采样上现算（`mulberry32(7)`、$\\mu_{old} = ' + fmt(S4_MU0, 1) + '$、$\\sigma_{old} = ' + fmt(S4_SIG0, 1) + '$）。' +
          '$\\beta = 0.05$ 那一段**没有启用** `a_weight_clip`：打开上限 20 之后 ' + S4_CLIPPED + ' 条样本会一起顶到上限，$\\sigma$ 回到 ' + fmt(S4_CLIP.sigma, 2) + '、ESS 回到 ' + fmt(S4_CLIP_ESS, 1) + ' —— 下面第二个演示始终开着这个上限，所以它显示的是后一种情况。',
        '第五幕三条曲线是第三个演示的同一个 `runSet()`：' + SWEEP_SEEDS + ' 个种子平均、$\\beta = 0.5$、种子 3 起步，N 分别取 1 / 4 / 20。',
        '**这几幕里的玩具模型和下面三个演示同源**：第四幕是一维动作上的单次更新，第五幕是 1 个状态 4 个动作的 bandit，只复现机制，**数值不能和论文直接比**。' +
          '定性结论（优势看的是超出预期、指数权重让 ESS 塌到 1、加权回归就是加权平均、$\\beta$ 太小会停止探索、复用旧数据买方差不买速度）在换种子后仍然成立。'
      ],
      scenes: AWR_SCENES
    });
  }

  K.mount({
    'awr-explainer': buildExplainerDemo,
    'awr-weights': buildWeightsDemo,
    'awr-regression': buildRegressionDemo,
    'awr-buffer': buildBufferDemo
  });
})();
