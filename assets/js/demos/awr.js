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
      title: '权重是怎么算出来的：exp(A/β) → 截断 → 除以 Z',
      sub:
        '默认就是正文那个 4 样本的例子（A = +5 / +1 / 0 / −3，β = 1）。拖动温度 β 和权重上限 a_weight_clip，' +
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
      label: '温度 β（awr_temp）',
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
      valueRow('exp(A/β)', rawCells);
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
      '**β 才是真正的旋钮**：β 越小，exp 把好坏拉得越开，最后几乎只剩最好的一条样本在说话（ESS → 1，等于「只模仿这一条」）；β 越大，权重越平，AWR 退化成对整批数据做行为克隆（ESS → N，好坏一起学）。正文 Q3 说的「激进 / 保守」就是这条 ESS 曲线。',
      '**上限 20 是在救数值**：`a_weight_clip: 20.0` 不是为了改变谁重要，而是防止 exp(A/β) 在优势没归一化、或 β 很小时直接溢出。勾上它再把 β 拖到 0.1，会看到几条样本一起顶到上限、权重被强行拉平 —— 这就是它在训练里干的事。',
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
            '，好动作和差动作的权重差不多，策略被拉向整批数据的平均行为 —— β 太大就学不动了。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ β = ' +
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
        '一个状态、一个连续动作 a（「这一步迈多大」）。策略是高斯 N(μ, σ)，用它采 ' +
        REG.batch +
        ' 个动作，按 A = r − V 算权重，再做一次加权最大似然 —— 对高斯策略来说它有闭式解：μ_new = Σ wᵢaᵢ。'
    });

    var state = { beta: 0.3, seed: 7, learnSigma: true, mu: -0.3, sigma: 0.8 };
    var clipMax = 20;

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '温度 β',
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
      label: '旧策略均值 μ_old',
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
      label: '旧策略标准差 σ_old（探索幅度）',
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
    checkbox(btns, 'σ 也跟着回归更新（关掉＝配置里的 FIXED 方差）', state.learnSigma, function (on) {
      state.learnSigma = on;
      render();
    });

    var setLegend = legend(root, [
      { key: 'muted', text: '真实回报 r(a)' },
      { key: 'warn', text: '旧策略 π_old' },
      { key: 'accent', text: '回归出的新策略' },
      { key: 'good', text: '样本（圆点越大权重越高）' }
    ]);

    var grid = stageGrid(root);
    var scatterStage = stage(grid, 240);
    var traceStage = stage(grid, 240);

    var stats = statsRow(root);
    var sV = stats.add('Critic 的 V = batch 均值');
    var sMu = stats.add('μ_old → μ_new');
    var sSigma = stats.add('σ_old → σ_new');
    var sEss = stats.add('有效样本数 ESS');
    var verdict = verdictBox(root);

    note(root, [
      '**为什么说「加权监督学习」**：高斯策略的 −Σ wᵢ·log π(aᵢ) 最小值有闭式解，就是**用权重做一次加权平均**。没有概率比、没有裁剪、没有 KL —— 一次更新就是「把均值挪到好样本那边」。',
      '**β 小 = 只信最好的一条**：把 β 拖到 0.05，权重几乎全压在单个样本上，μ_new 直接跳到那个样本的位置，σ_new 塌到 0.05 上下 —— **策略基本不再探索**。默认这批采样已经罩住了最优动作，所以看起来「一步到位」；可探索一停，策略就只能在已有样本里打转：把 μ_old 拖到 −0.9、σ_old 拖到 0.2（相当于策略已经缩在左边那个小峰附近），右图三条线就再也找不到 a = 1 的真正高峰了 —— 这正是正文 Q5 说的「缓冲区里好样本太少时学习效率下降」。',
      '**β 大 = 行为克隆**：β 拖到 2，权重接近均匀，μ_new ≈ 样本均值 ≈ μ_old，策略几乎不动。学得稳，但也几乎学不动。',
      '**σ 为什么要固定**：勾掉「σ 也跟着更新」，就是 `actor_std_type: FIXED` / `action_std: 0.05` 的做法 —— 加权回归天然会把方差往小了收（它在拟合一小撮好样本），固定方差是防止策略提前停止探索的最省事办法。'
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
          '🎯 β = ' +
            fmt(state.beta, 2) +
            ' 时 ESS ≈ ' +
            fmt(essVal, 1) +
            '：这次更新基本只参考了一条样本，μ 直接跳到 ' +
            fmt(fit.mu, 2) +
            '。运气好就是一步到位，运气差就是把一次噪声当成了最优动作。',
          'frozen'
        );
      } else {
        verdict.set(
          (landed ? '✅ ' : '↔️ ') +
            'μ_new = ' +
            fmt(fit.mu, 2) +
            ' = Σ wᵢaᵢ：' +
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

  function buildBufferDemo(host) {
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
      label: '温度 β',
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
      '**这正是 PPO 做不到的那一半**：PPO 的 min(r·Â, clip(r)·Â) 依赖 r = π_new/π_old，数据一旦太旧，r 会大到没法用，所以只能 on-policy。AWR 换成权重之后，旧数据至少还能用 —— 代价就是上面那条「拽回去」的曲线。',
      '**为什么画的是平均曲线**：这么小的任务里单条曲线几乎全是运气，所以左图画的是 24 个种子的平均（细线是单个种子），右图是它们最终回报的分布。「换一组随机种子」换的是整组 —— 结论稳不稳，一按就知道。'
    ]);

    /* Always 12 seeds, never a single lucky run: the left chart draws the mean
       learning curve (individual seeds faint behind it), the right one the
       spread of final returns. */
    var SEEDS = 24;

    function runSet(keep) {
      var all = [];
      for (var s = 0; s < SEEDS; s++) all.push(runAwr(state.seed + s * 17, state.beta, keep));
      var mean = [];
      for (var i = 0; i < all[0].length; i++) {
        mean.push(
          sum(
            all.map(function (h) {
              return h[i].J;
            })
          ) / SEEDS
        );
      }
      var finals = all.map(function (h) {
        return h[h.length - 1].J;
      });
      var fMean = sum(finals) / SEEDS;
      var sd = Math.sqrt(
        sum(
          finals.map(function (x) {
            return (x - fMean) * (x - fMean);
          })
        ) / SEEDS
      );
      // 平均每轮的回报抖动：一次更新把策略推得多猛
      var jitter = sum(
        all.map(function (h) {
          var j = 0;
          for (var i = 1; i < h.length; i++) j += Math.abs(h[i].J - h[i - 1].J);
          return j / (h.length - 1);
        })
      ) / SEEDS;
      return { all: all, mean: mean, finals: finals, fMean: fMean, sd: sd, jitter: jitter, last: all[0][all[0].length - 2] };
    }

    function recompute() {
      runs.reuse = runSet(state.keep);
      runs.fresh = runSet(1);
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

  K.mount({
    'awr-weights': buildWeightsDemo,
    'awr-regression': buildRegressionDemo,
    'awr-buffer': buildBufferDemo
  });
})();
