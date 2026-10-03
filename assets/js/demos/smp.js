/* Interactive SMP demos for
 * papers/01_Foundational_RL/SMP_Reusable_Score-Matching_Motion_Priors.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["smp"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders
 *
 *     <div class="paper-demo" data-demo="smp-sds"></div>
 *
 * because scripts/sanitize_paper_html.py strips <script>/<canvas>/<input>
 * from #paper-body before publish.
 *
 * Demos:
 *   smp-explainer — 八幕讲解动画：对抗先验不能复用 → 预训练扩散先验 → SDS 残差 →
 *                   ESM → AdaNorm → GSI → 一个先验 100 + N 种风格 → 闭环与证据
 *   smp-sds       — SDS 奖励实验台：「左臂 × 右腿」二维玩具流形上的三档修正方向与 r_smp
 *   smp-esm       — 随机噪声档 vs 固定三档：同一个动作评估 1024 次的方差，以及 AdaNorm
 *   smp-style     — 一个先验，多种风格：无条件 / CFG / 上下半身组合的奖励地形
 *   smp-video     — 同一组八幕的配音竖屏视频（scripts/paper_video/ 离线渲染，K.video 播放）
 *
 * 所有数字都来自同一个玩具模型（下面的 sdsExpected / smpBreakdown），
 * 与笔记「🚶 具体实例」那几张表共用：数据是相关系数 0.95 的二维高斯，
 * 去噪器取高斯数据下的闭式最优解，噪声表照抄 diffusers 的 squaredcos_cap_v2（T = 50）。
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

  // ─── shared toy model ────────────────────────────────────────────────────
  /* MimicKit 的默认值：T = 50、ESM 三档 [22, 15, 8]、sds_loss_scale 6、
     task / smp 奖励各 0.5（smp_task_humanoid_agent.yaml + tinymdm_multi_clip.yaml）。 */
  var T_STEPS = 50;
  var K_SET = [22, 15, 8];
  var SDS_SCALE = 6;
  var W_TASK = 0.5,
    W_SMP = 0.5;
  var TASK_R = 0.8;
  /* 按 MimicKit 源码推算的特征维数：每帧 114 维 × 10 帧。只用来估计 ESM 里
     ε 的随机性被多少维平均掉。 */
  var FEAT_DIM = 1140;

  /* 二维「动作流形」：x1 左臂摆角、x2 右腿摆角（都已标准化）。自然走路是对侧协调，
     两者相关系数 0.95；主轴 u1 = (1, 1)/√2 方差 1.95，u2 = (1, −1)/√2 方差 0.05。 */
  var RHO = 0.95;
  var LAMBDA = [1 + RHO, 1 - RHO];
  var SAMPLE_A = [0.8, 0.8]; // 自然摆臂：左臂向前、右腿向前
  var SAMPLE_B = [0.8, -0.8]; // 顺拐：左臂向前、右腿向后

  /* diffusers 的 squaredcos_cap_v2：β_i = min(1 − g((i+1)/T) / g(i/T), 0.999)，ᾱ 是 (1 − β) 的累乘。 */
  function cosG(u) {
    var c = Math.cos(((u + 0.008) / 1.008) * (Math.PI / 2));
    return c * c;
  }

  var ALPHA_BAR = (function () {
    var out = [],
      p = 1;
    for (var i = 0; i < T_STEPS; i++) {
      var beta = Math.min(1 - cosG((i + 1) / T_STEPS) / cosG(i / T_STEPS), 0.999);
      p *= 1 - beta;
      out.push(p);
    }
    return out;
  })();

  function toAxes(x) {
    return [(x[0] + x[1]) / Math.SQRT2, (x[0] - x[1]) / Math.SQRT2];
  }

  function fromAxes(d) {
    return [(d[0] + d[1]) / Math.SQRT2, (d[0] - d[1]) / Math.SQRT2];
  }

  /* 沿主轴 k 的一次残差：(ε̂ − ε)_k = c·d_k − g·ε_k，
     c = √(ᾱ(1−ᾱ)) / (ᾱλ_k + 1 − ᾱ)，g = ᾱλ_k / (ᾱλ_k + 1 − ᾱ)。 */
  function axisTerms(t, k) {
    var a = ALPHA_BAR[t],
      lk = LAMBDA[k],
      den = a * lk + 1 - a;
    return { c: Math.sqrt(a * (1 - a)) / den, g: (a * lk) / den };
  }

  /* 对 ε 取期望后的 SDS 误差（两维取平均，和 MimicKit 的 torch.mean 一样）：
     E[(ε̂ − ε)_k²] = c²d_k² + g² = [ᾱ(1−ᾱ)d_k² + ᾱ²λ_k²] / (ᾱλ_k + 1 − ᾱ)²。 */
  function sdsExpected(t, x) {
    var d = toAxes(x),
      s = 0;
    for (var k = 0; k < 2; k++) {
      var tm = axisTerms(t, k);
      s += tm.c * tm.c * d[k] * d[k] + tm.g * tm.g;
    }
    return s / 2;
  }

  /* 不是一个动作，而是一个分布的平均误差：E[d_k²] = v_k。 */
  function sdsOverSpread(t, v) {
    var s = 0;
    for (var k = 0; k < 2; k++) {
      var tm = axisTerms(t, k);
      s += tm.c * tm.c * v[k] + tm.g * tm.g;
    }
    return s / 2;
  }

  /* AdaNorm 的 μ_t：手算时固定成训练初期「手脚各摆各的」，x ~ N(0, I)。 */
  function sdsInitMean(t) {
    return sdsOverSpread(t, [1, 1]);
  }

  function sdsDataMean(t) {
    return sdsOverSpread(t, LAMBDA);
  }

  var MU_INIT = K_SET.map(sdsInitMean);

  /* 论文式 (8) + AdaNorm，按 MimicKit _calc_smp_rewards 的顺序：
     每档 ÷ μ → 三档平均 → × sds_loss_scale → exp(−·)。 */
  function smpBreakdown(x, scale) {
    var L = K_SET.map(function (t) {
      return sdsExpected(t, x);
    });
    var norm = L.map(function (l, i) {
      return l / MU_INIT[i];
    });
    var mean = (norm[0] + norm[1] + norm[2]) / 3;
    var raw = (L[0] + L[1] + L[2]) / 3;
    return { L: L, norm: norm, mean: mean, raw: raw, r: Math.exp(-(scale || SDS_SCALE) * mean) };
  }

  /* 每档 SDS 误差在 FEAT_DIM 维上取均值后的方差：每维 e = c·d − g·ε，
     Var(e²) = 2g⁴ + 4(c·d)²g²，两条主轴各占一半维数。 */
  function sdsVarDims(t, x, dims) {
    var d = toAxes(x),
      v = 0;
    for (var k = 0; k < 2; k++) {
      var tm = axisTerms(t, k),
        m = tm.c * d[k];
      v += 2 * Math.pow(tm.g, 4) + 4 * m * m * tm.g * tm.g;
    }
    return v / (2 * dims);
  }

  /* 对 ε 取期望后的修正方向 −E[ε̂ − ε]（SDS 的梯度下降方向），画在 (x1, x2) 平面上。 */
  function correction(t, x) {
    var d = toAxes(x);
    return fromAxes([-axisTerms(t, 0).c * d[0], -axisTerms(t, 1).c * d[1]]);
  }

  function residualNorm(t, x) {
    var d = toAxes(x);
    return Math.hypot(axisTerms(t, 0).c * d[0], axisTerms(t, 1).c * d[1]);
  }

  /* 伪目标 x̄0 = E[x0 | x_t]：沿主轴 √ᾱλ/(ᾱλ + 1 − ᾱ) · x_t。epsAxes 省略时取 ε = 0。 */
  function pseudoTarget(t, x, epsAxes) {
    var d = toAxes(x),
      a = ALPHA_BAR[t],
      out = [];
    for (var k = 0; k < 2; k++) {
      var lk = LAMBDA[k];
      var xt = Math.sqrt(a) * d[k] + Math.sqrt(1 - a) * (epsAxes ? epsAxes[k] : 0);
      out.push(((Math.sqrt(a) * lk) / (a * lk + 1 - a)) * xt);
    }
    return fromAxes(out);
  }

  function dataSamples(n, seed) {
    var rng = mulberry32(seed),
      out = [];
    for (var i = 0; i < n; i++) {
      var z1 = gauss(rng),
        z2 = gauss(rng);
      out.push([z1, RHO * z1 + Math.sqrt(1 - RHO * RHO) * z2]);
    }
    return out;
  }

  /* 数据椭圆上 kσ 那一圈。 */
  function ellipsePts(kSigma, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var th = (i / n) * Math.PI * 2;
      pts.push(fromAxes([kSigma * Math.sqrt(LAMBDA[0]) * Math.cos(th), kSigma * Math.sqrt(LAMBDA[1]) * Math.sin(th)]));
    }
    return pts;
  }

  function pct(x) {
    return Math.round(x * 100) + '%';
  }

  function shares(arr) {
    var s = arr.reduce(function (a, b) {
      return a + b;
    }, 0);
    return arr.map(function (v) {
      return v / s;
    });
  }

  // ─── style toy: 一个先验，多种风格 ─────────────────────────────────────────
  /* 二维风格空间：x1 上半身「手臂张开度」、x2 下半身「抬膝高度」。三种风格各是一个
     各向同性高斯（std 0.35），无条件先验是三者等权混合。去噪器同样取闭式最优解，
     SDS 误差用一组固定的 ε（32 个，正负成对）做蒙特卡洛平均。 */
  var STYLE_STD = 0.35;
  var STYLES = [
    { key: 'neutral', name: 'Neutral', mu: [0, 0], tone: 'muted' },
    { key: 'aero', name: 'AeroPlane', mu: [1.6, 0], tone: 'accent' },
    { key: 'knees', name: 'HighKnees', mu: [0, 1.6], tone: 'good' }
  ];
  var COMBO_TARGET = [1.6, 1.6];
  var STYLE_RANGE = [-0.9, 2.5];

  var STYLE_EPS = (function () {
    var rng = mulberry32(20251202),
      out = [];
    for (var i = 0; i < 16; i++) {
      var e = [gauss(rng), gauss(rng)];
      out.push(e, [-e[0], -e[1]]);
    }
    return out;
  })();

  /* 混合高斯数据下的 E[ε | x_t]：后验权重 × 各分量的条件期望。 */
  function mixtureEps(a, xt, mus) {
    var v = a * STYLE_STD * STYLE_STD + 1 - a,
      sa = Math.sqrt(a),
      s1 = Math.sqrt(1 - a);
    var logw = mus.map(function (mu) {
      var dx = xt[0] - sa * mu[0],
        dy = xt[1] - sa * mu[1];
      return -(dx * dx + dy * dy) / (2 * v);
    });
    var m = Math.max.apply(null, logw),
      ws = 0,
      e0 = 0,
      e1 = 0;
    mus.forEach(function (mu, i) {
      var w = Math.exp(logw[i] - m);
      ws += w;
      e0 += (w * s1 * (xt[0] - sa * mu[0])) / v;
      e1 += (w * s1 * (xt[1] - sa * mu[1])) / v;
    });
    return [e0 / ws, e1 / ws];
  }

  function styleMu(key) {
    for (var i = 0; i < STYLES.length; i++) if (STYLES[i].key === key) return STYLES[i].mu;
    return null;
  }

  var ALL_MUS = STYLES.map(function (s) {
    return s.mu;
  });

  /* 论文 8.1 节：f_style = f(∅) + w_cfg (f(c) − f(∅))；组合先验在 ε 空间按维度拼接
     f_comp = M_upper ⊙ f(c_aero) + M_lower ⊙ f(c_knees)（这里每个分量也带同一个 w_cfg）。 */
  function priorEps(prior, a, xt, wcfg) {
    var u = mixtureEps(a, xt, ALL_MUS);
    if (prior === 'uncond') return u;
    function cfg(key) {
      var c = mixtureEps(a, xt, [styleMu(key)]);
      return [u[0] + wcfg * (c[0] - u[0]), u[1] + wcfg * (c[1] - u[1])];
    }
    if (prior === 'combo') {
      var up = cfg('aero'),
        low = cfg('knees');
      return [up[0], low[1]];
    }
    return cfg(prior);
  }

  function styleSds(prior, t, x0, wcfg) {
    var a = ALPHA_BAR[t],
      sa = Math.sqrt(a),
      s1 = Math.sqrt(1 - a),
      s = 0;
    for (var i = 0; i < STYLE_EPS.length; i++) {
      var e = STYLE_EPS[i];
      var xt = [sa * x0[0] + s1 * e[0], sa * x0[1] + s1 * e[1]];
      var eh = priorEps(prior, a, xt, wcfg);
      var d0 = eh[0] - e[0],
        d1 = eh[1] - e[1];
      s += (d0 * d0 + d1 * d1) / 2;
    }
    return s / STYLE_EPS.length;
  }

  /* 整个平面上的奖励地形。μ_t 取画面内均匀撒点的平均误差（相当于一个到处乱动的初始策略）。 */
  var styleFieldCache = {};

  function styleField(prior, wcfg, n) {
    var key = prior + '|' + wcfg.toFixed(2) + '|' + n;
    if (styleFieldCache[key]) return styleFieldCache[key];
    var lo = STYLE_RANGE[0],
      hi = STYLE_RANGE[1],
      step = (hi - lo) / n;
    var L = [],
      mu = [0, 0, 0],
      i,
      j,
      k;
    for (j = 0; j < n; j++) {
      for (i = 0; i < n; i++) {
        var x = [lo + (i + 0.5) * step, lo + (j + 0.5) * step];
        var row = K_SET.map(function (t) {
          return styleSds(prior, t, x, wcfg);
        });
        for (k = 0; k < 3; k++) mu[k] += row[k];
        L.push(row);
      }
    }
    mu = mu.map(function (m) {
      return m / (n * n);
    });
    var r = L.map(function (row) {
      var mean = (row[0] / mu[0] + row[1] / mu[1] + row[2] / mu[2]) / 3;
      return Math.exp(-SDS_SCALE * mean);
    });
    var best = 0;
    for (i = 1; i < r.length; i++) if (r[i] > r[best]) best = i;
    var out = {
      n: n,
      step: step,
      r: r,
      mu: mu,
      rmax: r[best],
      best: [lo + ((best % n) + 0.5) * step, lo + (Math.floor(best / n) + 0.5) * step],
      at: function (x) {
        var row = K_SET.map(function (t) {
          return styleSds(prior, t, x, wcfg);
        });
        return Math.exp(-SDS_SCALE * ((row[0] / mu[0] + row[1] / mu[1] + row[2] / mu[2]) / 3));
      }
    };
    styleFieldCache[key] = out;
    return out;
  }

  // ─── canvas helpers ──────────────────────────────────────────────────────
  /* 正方形的二维平面：返回 x→px、y→px（y 朝上）以及反变换。 */
  function squarePlane(g, range, pad) {
    var p = pad || { l: 40, r: 12, t: 14, b: 30 };
    var size = Math.max(80, Math.min(g.w - p.l - p.r, g.h - p.t - p.b));
    var x0 = p.l + Math.max(0, (g.w - p.l - p.r - size) / 2),
      y0 = p.t + size;
    var lo = range[0],
      hi = range[1];
    return {
      x0: x0,
      x1: x0 + size,
      y0: y0,
      y1: y0 - size,
      size: size,
      sx: function (v) {
        return x0 + ((v - lo) / (hi - lo)) * size;
      },
      sy: function (v) {
        return y0 - ((v - lo) / (hi - lo)) * size;
      },
      ux: function (px) {
        return lo + ((px - x0) / size) * (hi - lo);
      },
      uy: function (py) {
        return lo + ((y0 - py) / size) * (hi - lo);
      }
    };
  }

  function planeFrame(g, sp, ticks, xLabel, yLabel) {
    var ctx = g.ctx;
    ctx.save();
    ctx.strokeStyle = g.P.grid;
    ctx.lineWidth = 1;
    ticks.forEach(function (t) {
      ctx.beginPath();
      ctx.moveTo(sp.sx(t) + 0.5, sp.y0);
      ctx.lineTo(sp.sx(t) + 0.5, sp.y1);
      ctx.moveTo(sp.x0, sp.sy(t) + 0.5);
      ctx.lineTo(sp.x1, sp.sy(t) + 0.5);
      ctx.stroke();
      text(ctx, fmt(t, 0), sp.sx(t), sp.y0 + 12, g.P.muted, 'center', '10px monospace');
      text(ctx, fmt(t, 0), sp.x0 - 6, sp.sy(t), g.P.muted, 'right', '10px monospace');
    });
    ctx.strokeStyle = g.P.border;
    ctx.strokeRect(sp.x0 + 0.5, sp.y1 + 0.5, sp.size, sp.size);
    ctx.restore();
    text(ctx, xLabel, sp.x1, sp.y0 + 25, g.P.muted, 'right', '11px sans-serif');
    text(ctx, yLabel, sp.x0 + 4, sp.y1 + 10, g.P.muted, 'left', '11px sans-serif');
  }

  function arrow(ctx, x0, y0, x1, y1, color, width) {
    var ang = Math.atan2(y1 - y0, x1 - x0),
      len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 2) return;
    line(ctx, [[x0, y0], [x1, y1]], color, width || 2);
    var h = Math.min(9, len * 0.5);
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - h * Math.cos(ang - 0.42), y1 - h * Math.sin(ang - 0.42));
    ctx.lineTo(x1 - h * Math.cos(ang + 0.42), y1 - h * Math.sin(ang + 0.42));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function withAlpha(ctx, a, fn) {
    ctx.save();
    ctx.globalAlpha = a;
    fn();
    ctx.restore();
  }

  function dragOn(st, onPoint) {
    var dragging = false;
    st.canvas.style.touchAction = 'none';
    function at(e) {
      var rect = st.canvas.getBoundingClientRect();
      onPoint(e.clientX - rect.left, e.clientY - rect.top, rect.width);
    }
    st.canvas.addEventListener('pointerdown', function (e) {
      dragging = true;
      st.canvas.setPointerCapture(e.pointerId);
      at(e);
    });
    st.canvas.addEventListener('pointermove', function (e) {
      if (dragging) {
        e.preventDefault();
        at(e);
      }
    });
    st.canvas.addEventListener('pointerup', function () {
      dragging = false;
    });
    st.canvas.addEventListener('pointercancel', function () {
      dragging = false;
    });
  }

  var K_TONES = ['warn', 'accent', 'good']; // t = 22 / 15 / 8

  // ─── demo 1: SDS 奖励实验台 ──────────────────────────────────────────────
  var SDS_PRESETS = [
    { name: '自然摆臂 A (0.8, 0.8)', x: SAMPLE_A },
    { name: '顺拐 B (0.8, −0.8)', x: SAMPLE_B },
    { name: '站着不动 (0, 0)', x: [0, 0] },
    { name: '大步自然 (1.6, 1.6)', x: [1.6, 1.6] },
    { name: '只摆臂不迈腿 (1.2, 0)', x: [1.2, 0] }
  ];
  var SDS_RANGE = [-2.4, 2.4];

  function buildSdsDemo(host) {
    var root = card(host, {
      title: 'SDS 奖励实验台：冻结的扩散模型怎么给「顺拐」打分',
      sub:
        '二维玩具流形：$x_1$ 左臂摆角、$x_2$ 右腿摆角，自然走路挤在一条 $\\rho = 0.95$ 的细椭圆上。' +
        '拖动（或直接在左图上点）动作 $\\tilde{\\mathbf{x}}_0$，看三档噪声各自的修正方向 $-(\\hat{\\boldsymbol\\epsilon} - \\boldsymbol\\epsilon)$ 和最终的 $r^{smp}$。'
    });

    var state = { x: SAMPLE_B.slice(), scale: SDS_SCALE };

    var ctrls = controlsRow(root);
    var sx1 = slider(ctrls, {
      label: '左臂摆角 $x_1$',
      min: -2,
      max: 2,
      step: 0.05,
      value: state.x[0],
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.x[0] = v;
        render();
      }
    });
    var sx2 = slider(ctrls, {
      label: '右腿摆角 $x_2$',
      min: -2,
      max: 2,
      step: 0.05,
      value: state.x[1],
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.x[1] = v;
        render();
      }
    });
    slider(ctrls, {
      label: '`sds_loss_scale` $w_s$',
      min: 1,
      max: 12,
      step: 0.5,
      value: state.scale,
      format: function (v) {
        return fmt(v, 1);
      },
      onInput: function (v) {
        state.scale = v;
        render();
      }
    });
    var presetBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(presetBox);
    SDS_PRESETS.forEach(function (p) {
      button(presetBox, p.name, function () {
        state.x = p.x.slice();
        sx1.set(state.x[0], true);
        sx2.set(state.x[1], true);
        render();
      });
    });

    var setLegend = legend(root, [
      { key: 'good', text: '数据（自然走路）与 1σ / 2σ 椭圆' },
      { key: 'warn', text: '$t = 22$ 的修正方向' },
      { key: 'accent', text: '$t = 15$' },
      { key: 'good', text: '$t = 8$' },
      { key: 'bad', text: '当前动作 $\\tilde{\\mathbf{x}}_0$' },
      { key: 'muted', text: '底色：$r^{smp}$ 地形（越亮越高）' }
    ]);

    var grid = stageGrid(root);
    var planeStage = stage(grid, 320);
    planeStage.canvas.setAttribute('aria-label', '左臂与右腿摆角平面上的数据椭圆、当前动作、三档修正方向与奖励地形');
    var barStage = stage(grid, 320);
    barStage.canvas.setAttribute('aria-label', '三档噪声的原始 SDS 误差、AdaNorm 均值与归一化后的误差');

    var tbl = table(root);
    var stats = statsRow(root);
    var sD = stats.add('沿流形 $d_1$ / 离流形 $d_2$');
    var sMean = stats.add('三档归一化平均');
    var sR = stats.add('$r^{smp}$');
    var sTot = stats.add('$0.5\\,r^{task} + 0.5\\,r^{smp}$（$r^{task} = 0.8$）');
    var verdict = verdictBox(root);

    note(root, [
      '**默认就是笔记「具体实例」里的顺拐 B**：三档原始误差 0.963 / 1.896 / 3.451，除以 $\\mu$ = 0.861 / 1.595 / 2.820 后平均 1.177，$r^{smp} = \\exp(-6 \\times 1.177) = 0.0009$；点「自然摆臂 A」得到 0.192。',
      '**修正方向几乎总是垂直于流形**：离流形的主轴方差只有 0.05，同样的偏离在分母里被放大；沿流形走得再远（试试「大步自然」），奖励也掉得很慢。',
      '**这是简化模型**：真实 SMP 的输入是 10 帧 × 114 维、去噪器是学出来的 3M 参数 DiT；这里用二维高斯和闭式最优去噪器，只复现「残差指回数据、低噪声档更敏感」的机制，数值不能和论文直接比。$\\mu_t$ 也固定成训练初期 $\\mathbf{x} \\sim \\mathcal{N}(0, I)$ 的平均误差，MimicKit 里它是策略自己历史误差的累计均值。'
    ]);

    var samples = dataSamples(140, 11);

    dragOn(planeStage, function (px, py, w) {
      var sp = squarePlane({ w: w, h: planeStage.height }, SDS_RANGE);
      state.x = [clamp(Math.round(sp.ux(px) * 20) / 20, -2, 2), clamp(Math.round(sp.uy(py) * 20) / 20, -2, 2)];
      sx1.set(state.x[0], true);
      sx2.set(state.x[1], true);
      render();
    });

    var render = registerRenderer(function () {
      var bd = smpBreakdown(state.x, state.scale);
      var d = toAxes(state.x);

      // ── left: the plane ──
      var g = begin(planeStage);
      var ctx = g.ctx,
        P = g.P;
      setLegend(P);
      var sp = squarePlane(g, SDS_RANGE);
      var n = 48,
        cell = sp.size / n,
        vals = [],
        vmax = 0,
        i,
        j;
      for (j = 0; j < n; j++) {
        for (i = 0; i < n; i++) {
          var x = [sp.ux(sp.x0 + (i + 0.5) * cell), sp.uy(sp.y0 - (j + 0.5) * cell)];
          var rv = smpBreakdown(x, state.scale).r;
          vals.push(rv);
          if (rv > vmax) vmax = rv;
        }
      }
      ctx.save();
      ctx.fillStyle = P.accent;
      for (j = 0; j < n; j++) {
        for (i = 0; i < n; i++) {
          ctx.globalAlpha = 0.55 * Math.sqrt(vals[j * n + i] / (vmax || 1));
          ctx.fillRect(sp.x0 + i * cell, sp.y0 - (j + 1) * cell, cell + 0.6, cell + 0.6);
        }
      }
      ctx.restore();
      planeFrame(g, sp, [-2, -1, 0, 1, 2], '左臂摆角 x1', '右腿摆角 x2');

      [1, 2].forEach(function (ks) {
        line(
          ctx,
          ellipsePts(ks, 72).map(function (p) {
            return [sp.sx(p[0]), sp.sy(p[1])];
          }),
          P.good,
          ks === 1 ? 1.6 : 1,
          ks === 1 ? null : [4, 4]
        );
      });
      withAlpha(ctx, 0.55, function () {
        samples.forEach(function (p) {
          dot(ctx, sp.sx(p[0]), sp.sy(p[1]), 1.8, P.good);
        });
      });

      var ax = sp.sx(state.x[0]),
        ay = sp.sy(state.x[1]);
      var scalePx = sp.size / (SDS_RANGE[1] - SDS_RANGE[0]);
      K_SET.forEach(function (t, k) {
        var c = correction(t, state.x);
        arrow(ctx, ax, ay, ax + c[0] * scalePx * 0.6, ay - c[1] * scalePx * 0.6, P[K_TONES[k]], 2.2);
      });
      var tgt = pseudoTarget(22, state.x);
      ctx.save();
      ctx.strokeStyle = P.warn;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sp.sx(tgt[0]), sp.sy(tgt[1]), 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      text(ctx, '伪目标 x̄0（t=22, ε=0）', sp.sx(tgt[0]) + 9, sp.sy(tgt[1]) - 9, P.warn, 'left', '10px sans-serif');
      dot(ctx, ax, ay, 6, P.bad, P.surface);

      // ── right: three timesteps ──
      var g2 = begin(barStage);
      var c2 = g2.ctx;
      var pp = plot(g2, { l: 46, r: 14, t: 26, b: 44 }, [0, 3], [0, Math.max(2, Math.ceil(Math.max.apply(null, bd.L.concat(MU_INIT)) * 2) / 2)]);
      axes(g2, pp, {
        yTicks: K.niceTicks(pp.yd[0], pp.yd[1], 4),
        yFmt: function (v) {
          return fmt(v, 1);
        }
      });
      text(c2, '每档的 SDS 误差（柱）与 AdaNorm 均值 μ（横线）', pp.x0, 12, g2.P.muted, 'left', '11px sans-serif');
      K_SET.forEach(function (t, k) {
        var cx = pp.sx(k + 0.5),
          bw = (pp.x1 - pp.x0) / 3 * 0.42;
        var col = g2.P[K_TONES[k]];
        c2.fillStyle = col;
        c2.globalAlpha = 0.8;
        c2.fillRect(cx - bw / 2, pp.sy(bd.L[k]), bw, pp.y0 - pp.sy(bd.L[k]));
        c2.globalAlpha = 1;
        line(c2, [[cx - bw * 0.8, pp.sy(MU_INIT[k])], [cx + bw * 0.8, pp.sy(MU_INIT[k])]], g2.P.text, 2, [5, 3]);
        K.barLabel(g2, pp, cx, pp.sy(bd.L[k]), fmt(bd.L[k], 3), col);
        text(c2, 't = ' + t, cx, pp.y0 + 13, g2.P.text, 'center', '11px monospace');
        text(c2, '÷μ → ' + fmt(bd.norm[k], 3), cx, pp.y0 + 28, col, 'center', '11px monospace');
      });

      tbl.clear();
      tbl.row(['档 $t$', '$\\bar\\alpha_t$', '$\\mathcal{L}_t$', '$\\mu_t$', '$\\mathcal{L}_t / \\mu_t$', '修正量 $\\lVert \\mathbb{E}[\\hat\\epsilon - \\epsilon] \\rVert$'], true);
      K_SET.forEach(function (t, k) {
        tbl.row([String(t), fmt(ALPHA_BAR[t], 3), fmt(bd.L[k], 3), fmt(MU_INIT[k], 3), fmt(bd.norm[k], 3), fmt(residualNorm(t, state.x), 3)]);
      });

      sD.set(fmt(d[0], 3) + ' / ' + fmt(d[1], 3), Math.abs(d[1]) > 0.5 ? 'bad' : 'good');
      sMean.set(fmt(bd.mean, 3));
      sR.set(bd.r < 0.01 ? fmt(bd.r, 4) : fmt(bd.r, 3), bd.r > 0.1 ? 'good' : bd.r < 0.01 ? 'bad' : null);
      sTot.set(fmt(W_TASK * TASK_R + W_SMP * bd.r, 3));

      if (Math.abs(d[1]) < 0.15) {
        verdict.set(
          '**顺着流形**：离流形只有 ' + fmt(Math.abs(d[1]), 2) + '，三条修正箭头都沿着椭圆的长轴、而且很短 —— 扩散模型觉得「这就是在走路」，$r^{smp} = ' + fmt(bd.r, 3) + '$。',
          'good'
        );
      } else if (Math.abs(d[1]) > 0.7) {
        verdict.set(
          '**横穿流形**：离流形 ' + fmt(Math.abs(d[1]), 2) + '（数据在这个方向的标准差只有 0.22），修正箭头几乎垂直指回椭圆；$t = 8$ 那一档的原始误差最大，但 AdaNorm 之后三档平起平坐，$r^{smp}$ 只剩 ' + fmt(bd.r, 4) + '。',
          'bad'
        );
      } else {
        verdict.set('**擦着流形边缘**：离流形 ' + fmt(Math.abs(d[1]), 2) + '，奖励介于两者之间（$r^{smp} = ' + fmt(bd.r, 3) + '$）。PPO 会继续把动作往椭圆里推。');
      }
    });

    render();
  }

  // ─── demo 2: 随机噪声档 vs 固定三档（ESM）+ AdaNorm ──────────────────────
  var ESM_SAMPLES = [
    { value: 'B', label: '顺拐 B', x: SAMPLE_B },
    { value: 'A', label: '自然摆臂 A', x: SAMPLE_A },
    { value: 'Z', label: '站着不动 (0, 0)', x: [0, 0] }
  ];
  var ESM_EVALS = 1024;

  /* 同一个动作评估 n 次。每一档的误差按 FEAT_DIM 维的正态近似抽：
     均值 sdsExpected，方差 sdsVarDims（几百维以上 CLT 已经很准）。 */
  function esmTrial(x, n, seed) {
    var rng = mulberry32(seed),
      rand = [],
      esm = [];
    var m = [],
      sd = [];
    for (var t = 0; t < T_STEPS; t++) {
      m.push(sdsExpected(t, x));
      sd.push(Math.sqrt(sdsVarDims(t, x, FEAT_DIM)));
    }
    for (var i = 0; i < n; i++) {
      var tt = Math.min(T_STEPS - 1, Math.floor(rng() * T_STEPS));
      rand.push(Math.max(0, m[tt] + sd[tt] * gauss(rng)));
      var s = 0;
      K_SET.forEach(function (tk) {
        s += Math.max(0, m[tk] + sd[tk] * gauss(rng));
      });
      esm.push(s / K_SET.length);
    }
    return { rand: rand, esm: esm, m: m };
  }

  /* 不抽样的理论值：随机档的方差 = 档位之间的方差 + 每档 ε 的方差的平均；
     ESM 的方差 = 三档 ε 方差之和 / 9。笔记「具体实例」第 5 步那张表就是这两个数。 */
  function trialTheory(x) {
    var m = [],
      v = [],
      t;
    for (t = 0; t < T_STEPS; t++) {
      m.push(sdsExpected(t, x));
      v.push(sdsVarDims(t, x, FEAT_DIM));
    }
    var mr = m.reduce(function (a, b) {
      return a + b;
    }, 0) / T_STEPS;
    var vr = 0;
    for (t = 0; t < T_STEPS; t++) vr += ((m[t] - mr) * (m[t] - mr) + v[t]) / T_STEPS;
    var me = 0,
      ve = 0;
    K_SET.forEach(function (tk) {
      me += m[tk] / K_SET.length;
      ve += v[tk] / (K_SET.length * K_SET.length);
    });
    return { rand: { m: mr, v: vr }, esm: { m: me, v: ve } };
  }

  function meanVar(arr) {
    var m = arr.reduce(function (a, b) {
      return a + b;
    }, 0) / arr.length;
    var v = arr.reduce(function (a, b) {
      return a + (b - m) * (b - m);
    }, 0) / arr.length;
    return { m: m, v: v };
  }

  function sci(v) {
    if (v >= 0.01) return fmt(v, 3);
    var e = Math.floor(Math.log(v) / Math.LN10);
    return fmt(v / Math.pow(10, e), 2) + '×10^' + e;
  }

  function sciTex(v) {
    if (v >= 0.01) return fmt(v, 3);
    var e = Math.floor(Math.log(v) / Math.LN10);
    return '$' + fmt(v / Math.pow(10, e), 2) + ' \\times 10^{' + e + '}$';
  }

  function buildEsmDemo(host) {
    var root = card(host, {
      title: '随机抽一档 vs 固定三档：同一个动作评估 1024 次',
      sub:
        '左图是玩具里的「论文图 4」：同一个动作在 50 档噪声上的 SDS 误差（对数轴）。右图把它评估 1024 次：' +
        '随机抽一档时奖励跟着档位乱跳，ESM 固定 $\\mathcal{K} = \\{22, 15, 8\\}$ 后几乎是一个点。下方条形看 AdaNorm 把三档的话语权拉平。'
    });

    var state = { which: 'B', seed: 3 };

    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '评估哪个动作',
      items: ESM_SAMPLES,
      value: state.which,
      onPick: function (v) {
        state.which = v;
        render();
      }
    });
    var seedBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(seedBox);
    button(seedBox, '换一组随机数', function () {
      state.seed = (state.seed * 1103515245 + 12345) % 99991;
      render();
    });

    var setLegend = legend(root, [
      { key: 'bad', text: '当前动作的 $\\mathcal{L}_t$' },
      { key: 'good', text: '数据本身的平均 $\\mathcal{L}_t$' },
      { key: 'muted', text: '训练初期的 $\\mu_t$（AdaNorm 的分母）' },
      { key: 'warn', text: '随机抽一档（1024 次）' },
      { key: 'accent', text: 'ESM 固定三档（1024 次）' }
    ]);

    var grid = stageGrid(root);
    var curveStage = stage(grid, 260);
    curveStage.canvas.setAttribute('aria-label', '50 档噪声上的 SDS 误差曲线，标出 ESM 的三档');
    var histStage = stage(grid, 260);
    histStage.canvas.setAttribute('aria-label', '同一个动作评估 1024 次的 SDS 误差分布：随机抽一档对比固定三档');
    var shareStage = stage(root, 110);
    shareStage.canvas.setAttribute('aria-label', '三档在求和里所占的比例：归一化之前与之后');

    var stats = statsRow(root);
    var sRand = stats.add('随机一档：均值 / 方差');
    var sEsm = stats.add('ESM：均值 / 方差');
    var sRatio = stats.add('方差缩小');
    var sR = stats.add('ESM + AdaNorm 的 $r^{smp}$');
    var verdict = verdictBox(root);

    note(root, [
      '**玩具里顺拐 B 的理论值**：随机抽一档均值 1.230、方差 1.567；固定三档均值 2.103、方差 $3.17 \\times 10^{-4}$，相差约 4900 倍。上面的读数是 1024 次实测，换随机数会在理论值附近浮动。' +
        '论文同一段 HighKnees 评估 1024 次：$1.140 \\to 9.964 \\times 10^{-6}$，均值 1.309 vs 1.339。',
      '**均值为什么不一样**：玩具里 $\\mathcal{K}$ 偏向中低噪声档，而随机档有一半落在误差很小的高噪声区；论文那条动作的均值几乎相同。能比的是**方差差了几个数量级**，这正是 RL 在乎的：奖励的方差直接进价值与优势估计。',
      '**这是简化模型**：每档误差按 1140 维的正态近似抽样（均值、方差由闭式最优去噪器算出），不是真的跑扩散网络；数值不能和论文直接比，「换种子」后的结论不变。'
    ]);

    var render = registerRenderer(function () {
      var x = null;
      ESM_SAMPLES.forEach(function (s) {
        if (s.value === state.which) x = s.x;
      });
      var tr = esmTrial(x, ESM_EVALS, state.seed);
      var mr = meanVar(tr.rand),
        me = meanVar(tr.esm);

      // ── left: L_t over all timesteps (log axis) ──
      var g = begin(curveStage);
      var ctx = g.ctx,
        P = g.P;
      setLegend(P);
      var pp = plot(g, { l: 46, r: 12, t: 22, b: 38 }, [0, T_STEPS - 1], [-2, 1]);
      axes(g, pp, {
        xTicks: [0, 10, 20, 30, 40, 49],
        yTicks: [-2, -1, 0, 1],
        yFmt: function (v) {
          return v === -2 ? '0.01' : v === -1 ? '0.1' : v === 0 ? '1' : '10';
        },
        xLabel: '噪声档 t（越大越吵）',
        yLabel: '误差'
      });
      function lg(v) {
        return Math.log(Math.max(v, 0.01)) / Math.LN10;
      }
      var curve = [],
        dataCurve = [],
        muCurve = [];
      for (var t = 0; t < T_STEPS; t++) {
        curve.push([pp.sx(t), pp.sy(lg(tr.m[t]))]);
        dataCurve.push([pp.sx(t), pp.sy(lg(sdsDataMean(t)))]);
        muCurve.push([pp.sx(t), pp.sy(lg(sdsInitMean(t)))]);
      }
      line(ctx, muCurve, P.muted, 1.4, [4, 3]);
      line(ctx, dataCurve, P.good, 1.8);
      line(ctx, curve, P.bad, 2.4);
      K_SET.forEach(function (tk, k) {
        var px = pp.sx(tk);
        line(ctx, [[px, pp.y0], [px, pp.y1]], P[K_TONES[k]], 1, [3, 3]);
        dot(ctx, px, pp.sy(lg(tr.m[tk])), 4.5, P[K_TONES[k]], P.surface);
        text(ctx, 't=' + tk, px, pp.y1 - 8, P[K_TONES[k]], 'center', '10px monospace');
      });

      // ── right: histogram of 1024 evaluations ──
      var g2 = begin(histStage);
      var c2 = g2.ctx;
      var hi = Math.max(0.5, Math.ceil(Math.max(Math.max.apply(null, tr.rand), me.m * 1.2) * 2) / 2);
      var bins = 40,
        counts = [],
        i;
      for (i = 0; i < bins; i++) counts.push(0);
      tr.rand.forEach(function (v) {
        counts[Math.min(bins - 1, Math.floor((v / hi) * bins))] += 1;
      });
      var cmax = Math.max.apply(null, counts);
      var ph = plot(g2, { l: 40, r: 12, t: 22, b: 38 }, [0, hi], [0, Math.max(0.12, (cmax / ESM_EVALS) * 1.15)]);
      axes(g2, ph, {
        xTicks: K.niceTicks(0, hi, 4),
        yTicks: K.niceTicks(0, ph.yd[1], 3),
        xFmt: function (v) {
          return fmt(v, 1);
        },
        yFmt: function (v) {
          return pct(v);
        },
        xLabel: '一次评估的 SDS 误差',
        yLabel: '占比'
      });
      var bw = (ph.x1 - ph.x0) / bins;
      c2.fillStyle = g2.P.warn;
      c2.globalAlpha = 0.75;
      counts.forEach(function (cnt, b) {
        var y = ph.sy(cnt / ESM_EVALS);
        c2.fillRect(ph.x0 + b * bw + 0.5, y, bw - 1, ph.y0 - y);
      });
      c2.globalAlpha = 1;
      var lo = Math.min.apply(null, tr.esm),
        hiE = Math.max.apply(null, tr.esm);
      var ex0 = ph.sx(lo),
        ex1 = Math.max(ph.sx(hiE), ex0 + 2);
      c2.fillStyle = g2.P.accent;
      c2.fillRect(ex0, ph.y1, ex1 - ex0, ph.y0 - ph.y1);
      text(c2, 'ESM：1024 次全落在 ' + fmt(lo, 3) + '–' + fmt(hiE, 3), Math.min(ex1 + 6, ph.x1 - 150), ph.y1 + 10, g2.P.accent, 'left', '11px sans-serif');

      // ── share bars: raw vs AdaNorm ──
      var g3 = begin(shareStage);
      var c3 = g3.ctx;
      var bd = smpBreakdown(x);
      var rows = [
        { label: '直接平均', s: shares(bd.L) },
        { label: '先 ÷ μ 再平均（AdaNorm）', s: shares(bd.norm) }
      ];
      var bx0 = 170,
        bx1 = g3.w - 14;
      rows.forEach(function (row, ri) {
        var y = 22 + ri * 42,
          acc = bx0;
        text(c3, row.label, 10, y + 11, g3.P.text, 'left', '12px sans-serif');
        row.s.forEach(function (f, k) {
          var w = f * (bx1 - bx0);
          c3.fillStyle = g3.P[K_TONES[k]];
          c3.globalAlpha = 0.85;
          c3.fillRect(acc, y, w - 1, 22);
          c3.globalAlpha = 1;
          if (w > 52) text(c3, 't=' + K_SET[k] + ' ' + pct(f), acc + w / 2, y + 11, g3.P.surface2, 'center', '11px monospace');
          acc += w;
        });
      });

      sRand.set(fmt(mr.m, 3) + ' / ' + sci(mr.v), 'bad');
      sEsm.set(fmt(me.m, 3) + ' / ' + sciTex(me.v), 'good');
      sRatio.set('约 ' + Math.round(mr.v / Math.max(me.v, 1e-12)) + ' 倍');
      sR.set(bd.r < 0.01 ? fmt(bd.r, 4) : fmt(bd.r, 3));

      var sh = shares(bd.L);
      verdict.set(
        '随机抽一档时，同一个动作的误差在 ' + fmt(Math.min.apply(null, tr.rand), 2) + ' 到 ' + fmt(Math.max.apply(null, tr.rand), 2) +
          ' 之间跳 —— 这一步的奖励高还是低，取决于抽到了哪一档，而不是动作好不好。固定三档之后方差缩小约 ' +
          Math.round(mr.v / Math.max(me.v, 1e-12)) + ' 倍；但直接平均时 $t = 8$ 一档占了 ' + pct(sh[2]) + '，AdaNorm 之后才是三档平分。',
        'good'
      );
    });

    render();
  }

  // ─── demo 3: 一个先验，多种风格 ──────────────────────────────────────────
  var STYLE_PRIORS = [
    { value: 'uncond', label: '无条件 $f(\\varnothing)$' },
    { value: 'neutral', label: 'CFG → Neutral' },
    { value: 'aero', label: 'CFG → AeroPlane' },
    { value: 'knees', label: 'CFG → HighKnees' },
    { value: 'combo', label: '组合：上半身 AeroPlane + 下半身 HighKnees' }
  ];
  var STYLE_GRID = 40;

  function nearestStyle(x) {
    var best = null,
      bd = Infinity;
    STYLES.forEach(function (s) {
      var d = Math.hypot(x[0] - s.mu[0], x[1] - s.mu[1]);
      if (d < bd) {
        bd = d;
        best = s;
      }
    });
    return { style: best, dist: bd };
  }

  function buildStyleDemo(host) {
    var root = card(host, {
      title: '一个先验，多种风格：CFG 与上下半身组合',
      sub:
        '玩具风格空间：$x_1$ 上半身「手臂张开度」、$x_2$ 下半身「抬膝高度」，数据里只有三种风格。' +
        '同一个风格条件扩散模型，换一种用法就是一个新的奖励地形：$f_{style} = f(\\varnothing) + w_{cfg}(f(c) - f(\\varnothing))$，' +
        '组合 $f_{comp} = M_{upper} \\odot f(c_1) + M_{lower} \\odot f(c_2)$。'
    });

    var state = { prior: 'combo', w: 1 };

    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '先验',
      items: STYLE_PRIORS,
      value: state.prior,
      onPick: function (v) {
        state.prior = v;
        render();
      }
    });
    slider(ctrls, {
      label: 'CFG 引导强度 $w_{cfg}$（论文用 1.0）',
      min: 0,
      max: 3,
      step: 0.25,
      value: state.w,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.w = v;
        render();
      }
    });

    var setLegend = legend(root, [
      { key: 'muted', text: 'Neutral 数据' },
      { key: 'accent', text: 'AeroPlane 数据' },
      { key: 'good', text: 'HighKnees 数据' },
      { key: 'warn', text: '底色：$r^{smp}$（越亮越高）与最高点' },
      { key: 'bad', text: '虚线圈：数据里没有的「张开双臂 + 高抬腿」' }
    ]);

    var st = stage(root, 340);
    st.canvas.setAttribute('aria-label', '风格平面上的奖励地形，标出三种风格的数据与奖励最高点');

    var stats = statsRow(root);
    var sBest = stats.add('奖励最高点 $(x_1, x_2)$');
    var sNear = stats.add('离最近的数据簇');
    var sAt = stats.add('各处的 $r^{smp}$：N / A / H / 组合角');
    var verdict = verdictBox(root);

    note(root, [
      '**$w_{cfg} = 0$ 就是无条件先验**：三种风格都奖励；拉到 1（论文的取值），地形只剩选中那一簇；再往上会把峰推得离别的风格更远、更「夸张」。',
      '**组合先验**：$\\epsilon$ 的第一维取 AeroPlane 的预测、第二维取 HighKnees 的预测。峰值落在 (1.6, 1.6) 附近 —— **数据里一个这样的样本都没有**，论文同样用它给 GSI 生成这种风格的初始状态。',
      '**这是简化模型**：三种风格各是一个二维高斯、去噪器取闭式最优解、SDS 误差用 32 个固定的 $\\epsilon$ 平均，$\\mu_t$ 取画面内均匀撒点的平均误差。真实 SMP 的掩码是按身体部位选特征维，风格冲突大时还要用多步 DDIM（MSM）；数值不能和论文直接比。'
    ]);

    var render = registerRenderer(function () {
      var field = styleField(state.prior, state.w, STYLE_GRID);
      var g = begin(st);
      var ctx = g.ctx,
        P = g.P;
      setLegend(P);
      var sp = squarePlane(g, STYLE_RANGE, { l: 40, r: 12, t: 12, b: 30 });
      var n = field.n,
        cell = sp.size / n,
        i,
        j;
      ctx.save();
      ctx.fillStyle = P.warn;
      for (j = 0; j < n; j++) {
        for (i = 0; i < n; i++) {
          ctx.globalAlpha = 0.65 * Math.sqrt(field.r[j * n + i] / (field.rmax || 1));
          ctx.fillRect(sp.x0 + i * cell, sp.y0 - (j + 1) * cell, cell + 0.6, cell + 0.6);
        }
      }
      ctx.restore();
      planeFrame(g, sp, [0, 1, 2], '上半身：手臂张开度 x1', '下半身：抬膝高度 x2');

      var rng = mulberry32(5);
      STYLES.forEach(function (s) {
        var col = P[s.tone];
        withAlpha(ctx, 0.8, function () {
          for (var q = 0; q < 40; q++) {
            var qx = clamp(s.mu[0] + STYLE_STD * gauss(rng), STYLE_RANGE[0] + 0.03, STYLE_RANGE[1] - 0.03),
              qy = clamp(s.mu[1] + STYLE_STD * gauss(rng), STYLE_RANGE[0] + 0.03, STYLE_RANGE[1] - 0.03);
            dot(ctx, sp.sx(qx), sp.sy(qy), 2, col);
          }
        });
        text(ctx, s.name, sp.sx(s.mu[0]) + 4, sp.sy(s.mu[1]) - 30, col, 'center', '11px sans-serif');
      });
      ctx.save();
      ctx.strokeStyle = P.bad;
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(sp.sx(COMBO_TARGET[0]), sp.sy(COMBO_TARGET[1]), STYLE_STD * 2 * (sp.size / (STYLE_RANGE[1] - STYLE_RANGE[0])), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      text(ctx, '数据里没有', sp.sx(COMBO_TARGET[0]), sp.sy(COMBO_TARGET[1]) - 36, P.bad, 'center', '10px sans-serif');

      var bx = sp.sx(field.best[0]),
        by = sp.sy(field.best[1]);
      line(ctx, [[bx - 8, by], [bx + 8, by]], P.text, 2);
      line(ctx, [[bx, by - 8], [bx, by + 8]], P.text, 2);

      var near = nearestStyle(field.best);
      sBest.set('(' + fmt(field.best[0], 2) + ', ' + fmt(field.best[1], 2) + ')');
      sNear.set(near.style.name + ' · ' + fmt(near.dist, 2), near.dist > 0.8 ? 'bad' : null);
      var probes = STYLES.map(function (s) {
        return field.at(s.mu);
      }).concat([field.at(COMBO_TARGET)]);
      sAt.set(
        probes
          .map(function (v) {
            return fmt(v, 3);
          })
          .join(' / ')
      );

      if (state.prior === 'combo') {
        verdict.set(
          '**组合先验的峰值在 (' + fmt(field.best[0], 2) + ', ' + fmt(field.best[1], 2) + ')**，离最近的数据簇 ' + near.style.name + ' 还有 ' + fmt(near.dist, 2) +
            ' —— 策略会被推向一种数据里没有的风格。冲突越大的组合越容易「稀释」，论文因此改用多步 DDIM 估 $\\hat{\\epsilon}$（MSM）。',
          'good'
        );
      } else if (state.prior === 'uncond' || state.w === 0) {
        verdict.set('**无条件先验**：三个簇的奖励都高（' + probes.slice(0, 3).map(function (v) { return fmt(v, 3); }).join(' / ') + '），策略学成哪种风格全看任务和初始状态 —— 这也是论文说的「模式坍缩」的来源之一。');
      } else {
        verdict.set(
          '**CFG 选出一种风格**：最高点落在 ' + near.style.name + ' 附近（距离 ' + fmt(near.dist, 2) + '）。12 种风格的 Target Location 里，SMP 用这一招的风格准确率平均 0.962，与每种风格单独训判别器的 AMP 相同（论文表 1）。',
          near.dist < 0.6 ? 'good' : null
        );
      }
    });

    render();
  }

  // ─── narrated explainer: eight scenes ────────────────────────────────────
  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    paint = K.paint,
    seg = K.seg,
    ease = K.ease,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
    stickFigure = K.stickFigure,
    poseWalk = K.poseWalk,
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
  var K_COLORS = [C_WARN, C_ACCENT, C_GOOD];

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

  function hbar(parent, x, y, w, h, color, opacity) {
    var r = paint(svgEl('rect', { x: x, y: y, width: Math.max(0, w), height: h, rx: 3, opacity: opacity == null ? 0.85 : opacity }), color);
    parent.appendChild(r);
    return r;
  }

  function setW(node, w) {
    node.setAttribute('width', Math.max(0, w).toFixed(1));
  }

  function chip(parent, x, y, w, str, color, opts) {
    var o = opts || {};
    var g = group(parent);
    rectBox(g, x, y, w, o.h || 30, color, C_SURFACE, o.dash);
    g.appendChild(svgRich(x + w / 2, y + (o.h || 30) / 2 + 4, str, { size: o.size || 11, anchor: 'middle', w: w - 8, cls: o.cls || 'demo-x-ink2' }));
    return g;
  }

  /* 场景里的二维平面：中心 (cx, cy)、半边长 half 像素、坐标范围 [lo, hi]。 */
  function scenePlane(cx, cy, half, lo, hi) {
    return {
      px: function (v) {
        return cx - half + ((v - lo) / (hi - lo)) * 2 * half;
      },
      py: function (v) {
        return cy + half - ((v - lo) / (hi - lo)) * 2 * half;
      },
      unit: (2 * half) / (hi - lo)
    };
  }

  /* ── scene 1: 对抗先验为什么不能复用 ── */
  var S1_BARS = [
    { title: '风格准确率（表 1，12 种风格平均）', rows: [['AMP', 0.962, C_MUTED], ['AMP-Frozen', 0.205, C_BAD], ['SMP', 0.962, C_GOOD]] },
    { title: '走到目标点任务回报（表 2）', rows: [['AMP', 0.737, C_MUTED], ['AMP-Frozen', 0.101, C_BAD], ['SMP', 0.793, C_GOOD]] }
  ];

  function buildSceneReuse() {
    var s = sceneSvg('AMP 的判别器和策略一起对抗训练，数据集全程在场；冻结判别器拿去训新策略会被钻空子，风格准确率从 0.962 掉到 0.205，Target Location 回报从 0.737 掉到 0.101；论文要求先验模块化、可复用');
    s.appendChild(svgText(40, 36, 'AMP 的判别器：只认识陪它练过的那一个策略', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'smp-x-arrow-s1', C_MUTED);
    var mkBad = K.arrowMarker(s, 'smp-x-arrow-s1b', C_BAD);

    rectBox(s, 30, 52, 380, 270, C_BORDER, C_SURFACE2);
    var dataG = group(s);
    rectBox(dataG, 48, 72, 130, 50, C_GOOD);
    dataG.appendChild(svgText(113, 93, '动作数据集', null, 12, 'middle'));
    dataG.appendChild(svgText(113, 110, '训练全程都要在场', 'demo-x-mut', 10, 'middle'));

    var dG = group(s);
    rectBox(dG, 170, 170, 110, 54, C_ACCENT);
    dG.appendChild(svgMath(225, 194, 'D', { size: 15, anchor: 'middle', w: 60 }).setTone(C_ACCENT));
    dG.appendChild(svgText(225, 214, '判别器', 'demo-x-mut', 10, 'middle'));

    var p1G = group(s);
    rectBox(p1G, 290, 72, 105, 50, C_MUTED);
    p1G.appendChild(svgRich(342, 97, '策略 $\\pi_1$', { size: 12, anchor: 'middle', w: 100 }));
    var links1 = group(s);
    arrowPath(links1, [[113, 122], [113, 197], [167, 197]], C_GOOD, mk);
    links1.appendChild(svgText(118, 160, '正样本', 'demo-x-good', 10));
    arrowPath(links1, [[310, 122], [262, 167]], C_MUTED, mk);
    links1.appendChild(svgText(262, 140, '负样本', 'demo-x-mut', 10, 'end'));
    arrowPath(links1, [[281, 197], [352, 197], [352, 126]], C_ACCENT, mk, '4 3');
    links1.appendChild(svgText(358, 168, '风格奖励', 'demo-x-acc', 10));
    links1.appendChild(svgText(225, 160, '↻ 一起对抗训练', 'demo-x-mut', 10, 'middle'));

    var p2G = group(s);
    rectBox(p2G, 290, 255, 105, 50, C_BAD);
    p2G.appendChild(svgRich(342, 280, '新策略 $\\pi_2$', { size: 12, anchor: 'middle', w: 100 }));
    var freeze = group(s);
    rectBox(freeze, 186, 232, 78, 22, C_ACCENT, C_SURFACE, '3 2');
    freeze.appendChild(svgText(225, 247, '❄ 冻结', 'demo-x-acc', 11, 'middle'));
    var exploit = group(s);
    arrowPath(exploit, [[290, 280], [225, 280], [225, 258]], C_BAD, mkBad, '5 3');
    exploit.appendChild(svgText(48, 292, '钻空子：不自然的动作', 'demo-x-bad', 10.5));
    exploit.appendChild(svgText(48, 308, '也能骗到高分', 'demo-x-bad', 10.5));

    var BX0 = 548,
      BW = 200;
    var barGroups = S1_BARS.map(function (blk, bi) {
      var y0 = 70 + bi * 128;
      var g = group(s);
      g.appendChild(svgText(436, y0, blk.title, 'demo-x-ink2', 11.5));
      var rows = blk.rows.map(function (row, ri) {
        var y = y0 + 16 + ri * 30;
        g.appendChild(svgText(436, y + 13, row[0], ri === 2 ? 'demo-x-good' : 'demo-x-mut', 11));
        var bar = hbar(g, BX0, y, 0, 18, row[2]);
        var val = paint(svgText(BX0 + 6, y + 13, '', 'demo-x-mono', 11), row[2]);
        g.appendChild(val);
        return { bar: bar, val: val, v: row[1], at: ri === 2 ? 12.8 : 7.6 + ri * 0.6, ri: ri };
      });
      return { g: g, rows: rows };
    });

    var foot = group(s);
    chip(foot, 30, 344, 360, '**Modular**：训练策略时不需要原始数据集', C_ACCENT, { h: 32, size: 12 });
    chip(foot, 410, 344, 360, '**Reusable**：建好不再训练，换任务、换策略都能用', C_ACCENT, { h: 32, size: 12 });
    var answer = svgText(400, 404, 'SMP 的答案：先验应该是一个只看过数据的生成模型', 'demo-x-acc', 14, 'middle');
    s.appendChild(answer);

    function draw(t) {
      setOpacity(dataG, seg(t, 0.2, 0.8));
      setOpacity(dG, seg(t, 0.6, 1.2));
      setOpacity(p1G, seg(t, 1.0, 1.6) * (1 - 0.65 * seg(t, 4.0, 4.6)));
      setOpacity(links1, seg(t, 1.4, 2.0) * (1 - 0.7 * seg(t, 4.0, 4.6)));
      setOpacity(p2G, seg(t, 4.2, 4.8));
      setOpacity(freeze, seg(t, 4.0, 4.6));
      setOpacity(exploit, seg(t, 5.4, 6.0));
      barGroups.forEach(function (bg, bi) {
        setOpacity(bg.g, seg(t, 7.2 + bi * 0.4, 7.8 + bi * 0.4));
        bg.rows.forEach(function (r) {
          var u = ease(seg(t, r.at + bi * 0.4, r.at + bi * 0.4 + 0.9));
          setW(r.bar, r.v * u * BW);
          r.val.setAttribute('x', (BX0 + r.v * u * BW + 6).toFixed(1));
          r.val.textContent = u > 0 ? fmt(r.v * u, 3) : '';
          setOpacity(r.bar, u > 0 ? 1 : 0);
        });
      });
      setOpacity(foot, seg(t, 10.8, 11.5));
      setOpacity(answer, seg(t, 13.2, 13.9));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 2: 先训一个只看数据的扩散模型 ── */
  function densityPath(x0, x1, yBase, hPx, comps, sigma) {
    var pts = [],
      peak = 0,
      vals = [],
      i;
    for (i = 0; i <= 80; i++) {
      var u = -2.4 + (4.8 * i) / 80,
        p = 0;
      comps.forEach(function (c) {
        p += Math.exp(-((u - c) * (u - c)) / (2 * sigma * sigma)) / sigma;
      });
      vals.push(p);
      if (p > peak) peak = p;
    }
    for (i = 0; i <= 80; i++) pts.push([x0 + ((x1 - x0) * i) / 80, yBase - (vals[i] / peak) * hPx]);
    return polyPath(pts);
  }

  function buildScenePretrain() {
    var s = sceneSvg('第一步只用动作数据训一个扩散模型：10 帧窗口，前向加噪，2 层 Transformer 约 300 万参数预测噪声；加噪让分数估计在数据稀疏处也可靠；训完冻结');
    s.appendChild(svgText(40, 36, '第一步与任务、策略都无关：只拿动作数据训一个扩散模型', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'smp-x-arrow-s2', C_MUTED);

    var stages = [];
    function stageBox(x, w, stroke, build) {
      var g = group(s);
      rectBox(g, x, 60, w, 96, stroke);
      build(g, x + w / 2);
      stages.push(g);
      return g;
    }
    stageBox(26, 128, C_GOOD, function (g, cx) {
      g.appendChild(svgText(cx, 86, '动作数据集', null, 12, 'middle'));
      g.appendChild(svgText(cx, 106, '100STYLE 20+ 小时', 'demo-x-mut', 10, 'middle'));
      g.appendChild(svgText(cx, 122, 'LaFAN1 跑步子集', 'demo-x-mut', 10, 'middle'));
      g.appendChild(svgText(cx, 138, '少到 3 秒也行', 'demo-x-mut', 10, 'middle'));
    });
    stageBox(170, 168, C_GOOD, function (g, cx) {
      g.appendChild(svgText(cx, 80, '10 帧动作窗口', null, 12, 'middle'));
      g.appendChild(svgMath(cx, 100, '\\mathbf{x} = (\\mathbf{s}_{t-8}, \\ldots, \\mathbf{s}_{t+1})', { size: 11, anchor: 'middle', w: 164 }));
      for (var i = 0; i < 10; i++) {
        g.appendChild(paint(svgEl('rect', { x: cx - 70 + i * 14, y: 114, width: 10, height: 30, rx: 2, opacity: 0.35 + 0.06 * i }), C_GOOD));
      }
    });
    stageBox(354, 168, C_WARN, function (g, cx) {
      g.appendChild(svgText(cx, 80, '前向加噪（随机一档）', null, 12, 'middle'));
      g.appendChild(svgMath(cx, 104, '\\mathbf{x}_i = \\sqrt{\\bar\\alpha_i}\\,\\mathbf{x}_0 + \\sqrt{1-\\bar\\alpha_i}\\,\\boldsymbol\\epsilon', { size: 11, anchor: 'middle', w: 164 }));
      g.appendChild(svgText(cx, 132, 'N = 50 档 · 余弦噪声表', 'demo-x-mut', 10, 'middle'));
    });
    stageBox(538, 124, C_ACCENT, function (g, cx) {
      g.appendChild(svgText(cx, 82, 'Transformer', 'demo-x-acc', 13, 'middle'));
      g.appendChild(svgText(cx, 102, '2 层 · 4 头 × 64', 'demo-x-ink2', 10.5, 'middle'));
      g.appendChild(svgText(cx, 120, '约 300 万参数', 'demo-x-ink2', 10.5, 'middle'));
      g.appendChild(svgText(cx, 138, '自适应归一化注入档位', 'demo-x-mut', 10, 'middle'));
    });
    stageBox(678, 96, C_ACCENT, function (g, cx) {
      g.appendChild(svgText(cx, 84, '预测噪声', null, 12, 'middle'));
      g.appendChild(svgMath(cx, 110, '\\hat{\\boldsymbol\\epsilon}', { size: 16, anchor: 'middle', w: 60 }).setTone(C_ACCENT));
      g.appendChild(svgText(cx, 138, '一张 4090 约 5 小时', 'demo-x-mut', 9.5, 'middle'));
    });
    var links = group(s);
    [[154, 172], [338, 356], [522, 540], [662, 680]].forEach(function (p) {
      arrowPath(links, [[p[0], 108], [p[1] - 4, 108]], C_MUTED, mk);
    });
    var lossG = group(s);
    lossG.appendChild(svgMath(438, 184, '\\mathcal{L}_{simple} = \\lVert \\boldsymbol\\epsilon - \\hat{\\boldsymbol\\epsilon} \\rVert_2^2', { size: 13, anchor: 'middle', w: 300 }));

    var why = group(s);
    rectBox(why, 26, 206, 748, 118, C_BORDER, C_SURFACE2);
    why.appendChild(svgText(46, 228, '为什么一定要「先加噪、再估分数」', 'demo-x-ink2', 12));
    why.appendChild(paint(svgEl('path', { d: densityPath(60, 360, 300, 56, [-1.0, 0.9], 0.22), fill: 'none', 'stroke-width': 2 }), null, C_GOOD));
    why.appendChild(paint(svgEl('path', { d: densityPath(440, 740, 300, 56, [-0.85, 0.75], 0.85), fill: 'none', 'stroke-width': 2 }), null, C_ACCENT));
    [[60, 360], [440, 740]].forEach(function (r) {
      why.appendChild(paint(svgEl('line', { x1: r[0], y1: 300, x2: r[1], y2: 300, 'stroke-width': 1 }), null, C_BORDER));
    });
    why.appendChild(svgText(338, 286, '?', 'demo-x-bad', 18, 'middle'));
    why.appendChild(svgText(338, 316, '策略乱动时在这', 'demo-x-bad', 10, 'middle'));
    why.appendChild(svgText(210, 316, '原分布：数据外的分数估不准', 'demo-x-mut', 10.5, 'middle'));
    why.appendChild(svgText(590, 316, '加噪后：分布铺满空间，哪儿都估得准', 'demo-x-mut', 10.5, 'middle'));
    var whyArrow = arrowPath(why, [[372, 270], [428, 270]], C_ACCENT, mk);

    var freeze = group(s);
    rectBox(freeze, 520, 52, 160, 112, C_ACCENT, 'none', '6 4');
    var stamp = rectBox(freeze, 560, 162, 80, 24, C_ACCENT, C_SURFACE);
    stamp.setAttribute('rx', 4);
    freeze.appendChild(svgText(600, 179, '❄ 冻结', 'demo-x-acc', 12, 'middle'));
    var foot = svgText(400, 360, '训完就冻结：之后训多少个策略、什么任务，它一个参数都不再动', 'demo-x-acc', 14.5, 'middle');
    s.appendChild(foot);
    var foot2 = svgText(400, 386, '（MimicKit 里 requires_grad = False，训练时只做前向）', 'demo-x-mut', 11, 'middle');
    s.appendChild(foot2);

    function draw(t) {
      stages.forEach(function (g, i) {
        var at = [0.3, 2.4, 5.6, 8.6, 9.6][i];
        setOpacity(g, seg(t, at, at + 0.6));
      });
      setOpacity(links, seg(t, 2.6, 3.2));
      setOpacity(lossG, seg(t, 6.6, 7.2));
      setOpacity(why, seg(t, 11.6, 12.2));
      setOpacity(whyArrow, seg(t, 12.4, 13.0));
      setOpacity(freeze, seg(t, 13.8, 14.3));
      setOpacity(foot, seg(t, 14.0, 14.6));
      setOpacity(foot2, seg(t, 14.4, 15.0));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 3: SDS：噪声残差就是修正量 ──
     数字全部来自 sdsExpected / pseudoTarget / correction（笔记具体实例第 2 步）。 */
  var S3_T = 22;
  var S3_EPS = [0.7, -0.45]; // 画在图上的那一次 ε（只用于示意加噪后的样本落在哪）

  function buildSceneSds() {
    var LA = sdsExpected(S3_T, SAMPLE_A),
      LB = sdsExpected(S3_T, SAMPLE_B);
    var tgtB = pseudoTarget(S3_T, SAMPLE_B);
    var dB = toAxes(SAMPLE_B),
      dT = toAxes(tgtB);
    var s = sceneSvg('左臂与右腿摆角平面上，自然走路的数据是一条细椭圆；顺拐动作加噪到第 22 档后，冻结的扩散模型反推出的伪目标几乎落回椭圆，残差就是修正量；单档奖励自然摆臂 0.146、顺拐 0.003');
    s.appendChild(svgText(40, 36, '把策略的动作加噪，让冻结的扩散模型猜噪声', 'demo-x-ink2', 13.5));

    var pl = scenePlane(200, 214, 150, -2.2, 2.2);
    rectBox(s, 50, 64, 300, 300, C_BORDER, C_SURFACE2);
    [-2, -1, 0, 1, 2].forEach(function (v) {
      s.appendChild(paint(svgEl('line', { x1: pl.px(v), y1: 64, x2: pl.px(v), y2: 364, 'stroke-width': 0.6 }), null, C_BORDER));
      s.appendChild(paint(svgEl('line', { x1: 50, y1: pl.py(v), x2: 350, y2: pl.py(v), 'stroke-width': 0.6 }), null, C_BORDER));
    });
    s.appendChild(svgText(350, 382, '左臂摆角 →', 'demo-x-mut', 10, 'end'));
    s.appendChild(svgText(56, 78, '↑ 右腿摆角', 'demo-x-mut', 10));

    var dataG = group(s);
    dataG.appendChild(paint(svgEl('path', {
      d: polyPath(ellipsePts(2, 60).map(function (p) { return [pl.px(p[0]).toFixed(1), pl.py(p[1]).toFixed(1)]; })) + ' Z',
      'stroke-width': 1.2, 'fill-opacity': 0.12, 'stroke-dasharray': '4 3'
    }), C_GOOD, C_GOOD));
    dataSamples(70, 11).forEach(function (p) {
      if (Math.abs(p[0]) < 2.15 && Math.abs(p[1]) < 2.15) {
        dataG.appendChild(paint(svgEl('circle', { cx: pl.px(p[0]).toFixed(1), cy: pl.py(p[1]).toFixed(1), r: 1.8, opacity: 0.7 }), C_GOOD));
      }
    });
    dataG.appendChild(svgRich(258, 92, '数据：$\\rho = 0.95$', { size: 10.5, anchor: 'middle', w: 150, cls: 'demo-x-good' }));

    var aG = group(s);
    aG.appendChild(paint(svgEl('circle', { cx: pl.px(SAMPLE_A[0]), cy: pl.py(SAMPLE_A[1]), r: 6 }), C_GOOD, C_SURFACE));
    aG.appendChild(svgText(pl.px(SAMPLE_A[0]) + 10, pl.py(SAMPLE_A[1]) - 6, 'A 自然摆臂', 'demo-x-good', 10.5));
    var bG = group(s);
    bG.appendChild(paint(svgEl('circle', { cx: pl.px(SAMPLE_B[0]), cy: pl.py(SAMPLE_B[1]), r: 6.5 }), C_BAD, C_SURFACE));
    bG.appendChild(svgText(pl.px(SAMPLE_B[0]) - 10, pl.py(SAMPLE_B[1]) + 18, 'B 顺拐', 'demo-x-bad', 10.5, 'end'));

    var a22 = ALPHA_BAR[S3_T];
    var xt = [Math.sqrt(a22) * SAMPLE_B[0] + Math.sqrt(1 - a22) * S3_EPS[0], Math.sqrt(a22) * SAMPLE_B[1] + Math.sqrt(1 - a22) * S3_EPS[1]];
    var noisy = paint(svgEl('circle', { cx: pl.px(SAMPLE_B[0]), cy: pl.py(SAMPLE_B[1]), r: 5, fill: 'none', 'stroke-width': 1.6, 'stroke-dasharray': '2 2' }), null, C_WARN);
    s.appendChild(noisy);
    var noisyLbl = svgRich(pl.px(xt[0]) + 9, pl.py(xt[1]) + 5, '$\\mathbf{x}_{22}$', { size: 11, w: 60, cls: 'demo-x-warn' });
    s.appendChild(noisyLbl);
    var tgtG = group(s);
    tgtG.appendChild(paint(svgEl('circle', { cx: pl.px(tgtB[0]), cy: pl.py(tgtB[1]), r: 7, fill: 'none', 'stroke-width': 1.8 }), null, C_ACCENT));
    tgtG.appendChild(svgRich(pl.px(tgtB[0]) - 12, pl.py(tgtB[1]) - 12, '伪目标 $\\bar{\\mathbf{x}}_0$', { size: 10.5, anchor: 'end', w: 120, cls: 'demo-x-acc' }));
    var mk = K.arrowMarker(s, 'smp-x-arrow-s3', C_ACCENT);
    var corr = correction(S3_T, SAMPLE_B);
    var corrArrow = arrowPath(s, [[pl.px(SAMPLE_B[0]), pl.py(SAMPLE_B[1])], [pl.px(SAMPLE_B[0] + corr[0] * 0.55), pl.py(SAMPLE_B[1] + corr[1] * 0.55)]], C_ACCENT, mk, null, 2.4);

    var steps = [
      svgRich(380, 84, '① 加噪：$\\mathbf{x}_{22} = \\sqrt{\\bar\\alpha}\\,\\tilde{\\mathbf{x}}_0 + \\sqrt{1-\\bar\\alpha}\\,\\boldsymbol\\epsilon$，$\\bar\\alpha_{22} = ' + fmt(a22, 3) + '$', { size: 11.5, w: 400 }),
      svgRich(380, 120, '② 冻结的扩散模型猜噪声：$\\hat{\\boldsymbol\\epsilon} = f(\\mathbf{x}_{22})$', { size: 11.5, w: 400 }),
      svgRich(380, 156, '③ 伪目标几乎落回流形：离流形 ' + fmt(dB[1], 3) + ' → **' + fmt(dT[1], 3) + '**', { size: 11.5, w: 400 }),
      svgRich(380, 192, '④ 残差 $\\hat{\\boldsymbol\\epsilon} - \\boldsymbol\\epsilon$ = 往数据拉回去的修正量', { size: 11.5, w: 400, cls: 'demo-x-acc' })
    ];
    steps.forEach(function (n) {
      s.appendChild(n);
    });
    var formula = svgMath(578, 250, '\\displaystyle r^{smp} = \\exp\\left( -w_s \\lVert \\hat{\\boldsymbol\\epsilon} - \\boldsymbol\\epsilon \\rVert_2^2 \\right)', { size: 15, anchor: 'middle', w: 380, h: 48 });
    s.appendChild(formula);
    var formulaNote = svgRich(578, 282, '论文式 (7)：只用一档、不归一化，$w_s = 6$', { size: 10.5, anchor: 'middle', w: 380, cls: 'demo-x-mut' });
    s.appendChild(formulaNote);
    var rowA = group(s),
      rowB = group(s);
    rectBox(rowA, 380, 298, 396, 30, C_GOOD);
    rowA.appendChild(svgRich(578, 317, 'A 自然摆臂：$\\mathcal{L} = ' + fmt(LA, 3) + '$ → $r = ' + fmt(Math.exp(-SDS_SCALE * LA), 3) + '$', { size: 12, anchor: 'middle', w: 390, cls: 'demo-x-good' }));
    rectBox(rowB, 380, 336, 396, 30, C_BAD);
    rowB.appendChild(svgRich(578, 355, 'B 顺拐：$\\mathcal{L} = ' + fmt(LB, 3) + '$ → $r = ' + fmt(Math.exp(-SDS_SCALE * LB), 3) + '$', { size: 12, anchor: 'middle', w: 390, cls: 'demo-x-bad' }));
    var foot = svgText(578, 398, '扩散模型一次都没为这个任务训练过，却已经分得清', 'demo-x-acc', 13, 'middle');
    s.appendChild(foot);

    function draw(t) {
      setOpacity(dataG, seg(t, 0.3, 1.0));
      setOpacity(aG, seg(t, 1.6, 2.2));
      setOpacity(bG, seg(t, 3.0, 3.6));
      var fly = ease(seg(t, 5.4, 6.6));
      noisy.setAttribute('cx', (pl.px(SAMPLE_B[0]) + (pl.px(xt[0]) - pl.px(SAMPLE_B[0])) * fly).toFixed(1));
      noisy.setAttribute('cy', (pl.py(SAMPLE_B[1]) + (pl.py(xt[1]) - pl.py(SAMPLE_B[1])) * fly).toFixed(1));
      setOpacity(noisy, seg(t, 5.2, 5.6));
      setOpacity(noisyLbl, seg(t, 6.4, 6.9));
      setOpacity(steps[0], seg(t, 5.2, 5.8));
      setOpacity(steps[1], seg(t, 6.8, 7.4));
      setOpacity(tgtG, seg(t, 8.4, 9.0));
      setOpacity(steps[2], seg(t, 8.6, 9.2));
      setOpacity(corrArrow, seg(t, 10.6, 11.2));
      setOpacity(steps[3], seg(t, 10.8, 11.4));
      setOpacity(formula, seg(t, 11.6, 12.2));
      setOpacity(formulaNote, seg(t, 12.0, 12.6));
      setOpacity(rowA, seg(t, 14.0, 14.5));
      setOpacity(rowB, seg(t, 14.4, 14.9));
      setOpacity(foot, seg(t, 15.4, 16.0));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 4: ESM：固定三档噪声压住方差 ──
     曲线与两组散点来自 sdsExpected / esmTrial，和「随机抽一档 vs 固定三档」演示同源。 */
  function buildSceneEsm() {
    var trial = esmTrial(SAMPLE_B, ESM_EVALS, 3);
    var th = trialTheory(SAMPLE_B);
    var mr = th.rand,
      me = th.esm;
    var s = sceneSvg('左边是顺拐动作在 50 档噪声上的 SDS 误差，对数轴上跨了好几个数量级，标出 ESM 的 22、15、8 三档；右边同一个动作评估多次，随机抽一档时散得很开，固定三档时几乎重合');
    s.appendChild(svgText(40, 36, '同一个动作，不同噪声档的 SDS 误差差了几个数量级', 'demo-x-ink2', 13.5));

    var X0 = 70,
      X1 = 380,
      Y0 = 300,
      Y1 = 74;
    function cx(tt) {
      return X0 + (tt / (T_STEPS - 1)) * (X1 - X0);
    }
    function cy(v) {
      var lg = Math.log(Math.max(v, 0.01)) / Math.LN10;
      return Y0 - ((lg + 2) / 3) * (Y0 - Y1);
    }
    var ax = group(s);
    ax.appendChild(paint(svgEl('rect', { x: X0, y: Y1, width: X1 - X0, height: Y0 - Y1, fill: 'none', 'stroke-width': 1 }), null, C_BORDER));
    [[0.01, '0.01'], [0.1, '0.1'], [1, '1'], [10, '10']].forEach(function (p) {
      ax.appendChild(paint(svgEl('line', { x1: X0, y1: cy(p[0]), x2: X1, y2: cy(p[0]), 'stroke-width': 0.6 }), null, C_BORDER));
      ax.appendChild(svgText(X0 - 6, cy(p[0]) + 4, p[1], 'demo-x-mut demo-x-mono', 10, 'end'));
    });
    [0, 10, 20, 30, 40, 49].forEach(function (tt) {
      ax.appendChild(svgText(cx(tt), Y0 + 15, String(tt), 'demo-x-mut demo-x-mono', 10, 'middle'));
    });
    ax.appendChild(svgText(X1, Y0 + 32, '噪声档 t（越大越吵）→', 'demo-x-mut', 10.5, 'end'));
    ax.appendChild(svgText(X0, Y1 - 8, 'SDS 误差（对数轴）', 'demo-x-mut', 10.5));

    var ptsB = [],
      ptsA = [];
    for (var tt = 0; tt < T_STEPS; tt++) {
      ptsB.push([cx(tt).toFixed(1), cy(trial.m[tt]).toFixed(1)]);
      ptsA.push([cx(tt).toFixed(1), cy(sdsExpected(tt, SAMPLE_A)).toFixed(1)]);
    }
    var curveB = paint(svgEl('path', { d: polyPath(ptsB), fill: 'none', 'stroke-width': 2.4 }), null, C_BAD);
    var curveA = paint(svgEl('path', { d: polyPath(ptsA), fill: 'none', 'stroke-width': 1.8 }), null, C_GOOD);
    s.appendChild(curveA);
    s.appendChild(curveB);
    var lblB = svgText(cx(33) + 4, cy(trial.m[33]) - 10, 'B 顺拐', 'demo-x-bad', 10.5);
    var lblA = svgText(cx(30), cy(sdsExpected(30, SAMPLE_A)) + 16, 'A 自然', 'demo-x-good', 10.5);
    s.appendChild(lblB);
    s.appendChild(lblA);
    var kG = group(s);
    K_SET.forEach(function (tk, k) {
      kG.appendChild(paint(svgEl('line', { x1: cx(tk), y1: Y1, x2: cx(tk), y2: Y0, 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, K_COLORS[k]));
      kG.appendChild(paint(svgEl('circle', { cx: cx(tk), cy: cy(trial.m[tk]), r: 4.5 }), K_COLORS[k], C_SURFACE));
      kG.appendChild(paint(svgText(cx(tk), Y1 + 13, 't=' + tk, 'demo-x-mono', 10, 'middle'), K_COLORS[k]));
    });

    var SX0 = 470,
      SX1 = 760,
      SMAX = 4;
    function sx(v) {
      return SX0 + (Math.min(v, SMAX) / SMAX) * (SX1 - SX0);
    }
    function strip(y, label, vals, color, stat) {
      var g = group(s);
      g.appendChild(svgText(SX0, y - 38, label, 'demo-x-ink2', 12));
      g.appendChild(paint(svgEl('line', { x1: SX0, y1: y + 14, x2: SX1, y2: y + 14, 'stroke-width': 1 }), null, C_BORDER));
      [0, 1, 2, 3, 4].forEach(function (v) {
        g.appendChild(svgText(sx(v), y + 28, String(v), 'demo-x-mut demo-x-mono', 9.5, 'middle'));
      });
      var dots = vals.slice(0, 60).map(function (v, i) {
        var d = paint(svgEl('circle', { cx: sx(v).toFixed(1), cy: (y - 8 + (i % 6) * 3.6).toFixed(1), r: 2.6, opacity: 0.8 }), color);
        g.appendChild(d);
        return d;
      });
      var st = svgRich(SX0, y - 20, stat, { size: 11, w: 290, cls: 'demo-x-mono' });
      st.setTone(color);
      g.appendChild(st);
      return { g: g, dots: dots };
    }
    var sRand = strip(118, '随机抽一档', trial.rand, C_WARN, '均值 ' + fmt(mr.m, 3) + ' · 方差 ' + fmt(mr.v, 3));
    var sEsm = strip(212, 'ESM：固定 {22, 15, 8} 再平均', trial.esm, C_ACCENT, '均值 ' + fmt(me.m, 3) + ' · 方差 ' + sciTex(me.v));

    var paper = group(s);
    chip(paper, 450, 262, 326, '论文 HighKnees × 1024：方差 $1.140 \\to 9.964 \\times 10^{-6}$', C_ACCENT, { size: 11 });
    chip(paper, 450, 300, 326, 'Backflip：随机档 0.195 m → ESM **0.069 m**（表 5）', C_GOOD, { size: 11 });

    var foot = group(s);
    chip(foot, 30, 350, 230, '高档：离数据远也可靠，但丢掉细节', C_WARN, { size: 10.5 });
    chip(foot, 285, 350, 230, '低档：修得细，但对抖动敏感', C_GOOD, { size: 10.5 });
    chip(foot, 540, 350, 236, '表 7：[22, 15, 8] 平均 **0.060 m** 最好', C_ACCENT, { size: 10.5 });

    function draw(t) {
      setOpacity(ax, seg(t, 0.2, 0.8));
      var u = ease(seg(t, 0.6, 2.6));
      curveB.setAttribute('stroke-dasharray', '1200');
      curveB.setAttribute('stroke-dashoffset', String(1200 * (1 - u)));
      setOpacity(curveA, seg(t, 2.6, 3.2));
      setOpacity(lblB, seg(t, 2.0, 2.6));
      setOpacity(lblA, seg(t, 2.8, 3.4));
      setOpacity(sRand.g, seg(t, 6.8, 7.3));
      sRand.dots.forEach(function (d, i) {
        setOpacity(d, seg(t, 6.9 + i * 0.02, 7.1 + i * 0.02));
      });
      setOpacity(kG, seg(t, 8.4, 9.0));
      setOpacity(sEsm.g, seg(t, 8.8, 9.3));
      sEsm.dots.forEach(function (d, i) {
        setOpacity(d, seg(t, 9.0 + i * 0.02, 9.2 + i * 0.02));
      });
      setOpacity(paper, seg(t, 11.4, 12.0));
      setOpacity(foot, seg(t, 13.8, 14.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 5: AdaNorm：三档各除各的均值 ──
     六个数和两个奖励都由 smpBreakdown 现算（笔记具体实例第 3–4 步）。 */
  function buildSceneNorm() {
    var bA = smpBreakdown(SAMPLE_A),
      bB = smpBreakdown(SAMPLE_B);
    var shRaw = shares(bB.L),
      shNorm = shares(bB.norm);
    var s = sceneSvg('顺拐动作三档的原始误差 0.963、1.896、3.451 各自除以训练初期的均值 0.861、1.595、2.820，得到 1.119、1.189、1.223；三档占比从 15、30、55 变成 32、34、35；最后自然摆臂奖励 0.192，顺拐 0.0009');
    s.appendChild(svgText(40, 36, '三档量级不同：直接平均，等于让低噪声档说了算', 'demo-x-ink2', 13.5));

    var colA = group(s),
      colB = group(s);
    colA.appendChild(svgRich(48, 70, '顺拐 B 的原始误差 $\\mathcal{L}_t$', { size: 12, w: 330, cls: 'demo-x-bad' }));
    colB.appendChild(svgRich(440, 70, '除以各自的均值 $\\mathcal{L}_t / \\mu_t$', { size: 12, w: 330, cls: 'demo-x-acc' }));
    var RAW_X = 100,
      RAW_U = 62,
      NORM_X = 500,
      NORM_U = 180;
    var rows = K_SET.map(function (tk, k) {
      var y = 92 + k * 40;
      var gA = group(colA),
        gB = group(colB);
      gA.appendChild(paint(svgText(48, y + 15, 't = ' + tk, 'demo-x-mono', 11), K_COLORS[k]));
      var barA = hbar(gA, RAW_X, y, 0, 20, K_COLORS[k]);
      var valA = svgText(RAW_X + 6, y + 15, '', 'demo-x-mono', 11);
      gA.appendChild(valA);
      var muTick = paint(svgEl('line', { x1: RAW_X + MU_INIT[k] * RAW_U, y1: y - 4, x2: RAW_X + MU_INIT[k] * RAW_U, y2: y + 24, 'stroke-width': 2, 'stroke-dasharray': '3 2' }), null, C_MUTED);
      gA.appendChild(muTick);
      var muLbl = svgRich(RAW_X + MU_INIT[k] * RAW_U - 4, y - 7, '$\\mu = ' + fmt(MU_INIT[k], 3) + '$', { size: 9.5, anchor: 'end', w: 90, cls: 'demo-x-mut' });
      gA.appendChild(muLbl);
      gB.appendChild(paint(svgText(440, y + 15, 't = ' + tk, 'demo-x-mono', 11), K_COLORS[k]));
      var barB = hbar(gB, NORM_X, y, 0, 20, K_COLORS[k]);
      var valB = svgText(NORM_X + 6, y + 15, '', 'demo-x-mono', 11);
      gB.appendChild(valB);
      return { barA: barA, valA: valA, mu: [muTick, muLbl], barB: barB, valB: valB, k: k };
    });
    var oneLine = paint(svgEl('line', { x1: NORM_X + NORM_U, y1: 84, x2: NORM_X + NORM_U, y2: 210, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), null, C_MUTED);
    s.appendChild(oneLine);
    var oneLbl = svgText(NORM_X + NORM_U, 222, '= 1：和训练初期一样差', 'demo-x-mut', 9.5, 'middle');
    s.appendChild(oneLbl);

    function shareBar(x, y, w, sh, label) {
      var g = group(s);
      g.appendChild(svgText(x, y - 6, label, 'demo-x-mut', 10.5));
      var acc = x;
      sh.forEach(function (f, k) {
        hbar(g, acc, y, f * w - 1, 22, K_COLORS[k], 0.85);
        if (f * w > 44) g.appendChild(paint(svgText(acc + (f * w) / 2, y + 15, pct(f), 'demo-x-mono', 10.5, 'middle'), C_SURFACE));
        acc += f * w;
      });
      return g;
    }
    var shA = shareBar(48, 248, 330, shRaw, '直接平均：三档的占比');
    var shB = shareBar(440, 248, 330, shNorm, 'AdaNorm 之后：三档平分');

    var resG = group(s);
    rectBox(resG, 30, 288, 360, 52, C_GOOD);
    resG.appendChild(svgRich(210, 308, 'A 自然：$\\exp(-6 \\times ' + fmt(bA.mean, 3) + ') = $ **' + fmt(bA.r, 3) + '**', { size: 12, anchor: 'middle', w: 350, cls: 'demo-x-good' }));
    resG.appendChild(svgRich(210, 328, '$+$ 任务：$0.5 \\times 0.8 + 0.5 \\times r = ' + fmt(W_TASK * TASK_R + W_SMP * bA.r, 3) + '$', { size: 10.5, anchor: 'middle', w: 350, cls: 'demo-x-mut' }));
    rectBox(resG, 410, 288, 360, 52, C_BAD);
    resG.appendChild(svgRich(590, 308, 'B 顺拐：$\\exp(-6 \\times ' + fmt(bB.mean, 3) + ') = $ **' + fmt(bB.r, 4) + '**', { size: 12, anchor: 'middle', w: 350, cls: 'demo-x-bad' }));
    resG.appendChild(svgRich(590, 328, '$+$ 任务：$0.5 \\times 0.8 + 0.5 \\times r = ' + fmt(W_TASK * TASK_R + W_SMP * bB.r, 3) + '$', { size: 10.5, anchor: 'middle', w: 350, cls: 'demo-x-mut' }));

    var paper = group(s);
    chip(paper, 30, 356, 740, '表 6：3 个独立训练的扩散模型，不加 AdaNorm 平均 0.176 m（方差大），加上 **0.057 m** —— 换先验不用重调 $w_s$', C_ACCENT, { size: 11, h: 32 });

    function draw(t) {
      setOpacity(colA, seg(t, 0.2, 0.8));
      rows.forEach(function (r) {
        var u = ease(seg(t, 0.6 + r.k * 0.4, 1.6 + r.k * 0.4));
        var v = bB.L[r.k] * u;
        setW(r.barA, v * RAW_U);
        r.valA.setAttribute('x', (RAW_X + v * RAW_U + 6).toFixed(1));
        r.valA.textContent = u > 0 ? fmt(v, 3) : '';
        r.mu.forEach(function (n) {
          setOpacity(n, seg(t, 4.0 + r.k * 0.3, 4.5 + r.k * 0.3));
        });
        var w = ease(seg(t, 7.4 + r.k * 0.3, 8.3 + r.k * 0.3));
        var nv = bB.norm[r.k] * w;
        setW(r.barB, nv * NORM_U);
        r.valB.setAttribute('x', (NORM_X + nv * NORM_U + 6).toFixed(1));
        r.valB.textContent = w > 0 ? fmt(nv, 3) : '';
      });
      setOpacity(shA, seg(t, 2.6, 3.2));
      setOpacity(colB, seg(t, 7.2, 7.8));
      setOpacity(oneLine, seg(t, 8.6, 9.2));
      setOpacity(oneLbl, seg(t, 8.6, 9.2));
      setOpacity(shB, seg(t, 9.0, 9.6));
      setOpacity(resG, seg(t, 10.0, 10.6));
      setOpacity(paper, seg(t, 14.2, 14.8));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 6: GSI：初始状态也由先验来生 ── */
  var S6_FID = [['HighKnees', '0.0922', '93.3%'], ['Aeroplane', '0.0998', '90.7%'], ['SpinClock', '0.1997', '89.3%']];

  function buildSceneGsi() {
    var s = sceneSvg('上面一条是 RSI：从动作数据集里挑一帧当回合起点，还得带着数据集；下面一条是 GSI：从冻结的 SMP 先验采样 10 帧窗口，末帧当角色状态、10 帧填判别历史；FID 0.092 到 0.200，Coverage 89% 以上');
    s.appendChild(svgText(40, 36, '只换掉奖励还不够：回合起点也得离开数据集', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'smp-x-arrow-s6', C_MUTED);

    var rsi = group(s);
    rsi.appendChild(svgText(30, 74, 'RSI（DeepMimic）', 'demo-x-mut', 11.5));
    rectBox(rsi, 150, 54, 150, 40, C_MUTED);
    rsi.appendChild(svgText(225, 79, '动作数据集', null, 11.5, 'middle'));
    rectBox(rsi, 340, 54, 150, 40, C_MUTED);
    rsi.appendChild(svgText(415, 79, '随机挑一帧', null, 11.5, 'middle'));
    rectBox(rsi, 530, 54, 150, 40, C_MUTED);
    rsi.appendChild(svgText(605, 79, '回合起点', null, 11.5, 'middle'));
    arrowPath(rsi, [[300, 74], [336, 74]], C_MUTED, mk);
    arrowPath(rsi, [[490, 74], [526, 74]], C_MUTED, mk);
    var strike = group(s);
    strike.appendChild(paint(svgEl('line', { x1: 146, y1: 74, x2: 684, y2: 74, 'stroke-width': 2 }), null, C_BAD));
    strike.appendChild(svgText(700, 79, '还得带着数据', 'demo-x-bad', 10.5));

    var gsi = group(s);
    gsi.appendChild(svgText(30, 152, 'GSI（SMP）', 'demo-x-acc', 11.5));
    var gsiBoxes = [
      [150, '冻结的 SMP 先验', '❄ 同一个扩散模型'],
      [340, 'DDPM 采 10 帧窗口', '50 步完整去噪'],
      [530, '末帧 → 角色状态', '10 帧 → 判别历史']
    ].map(function (b) {
      var g = group(gsi);
      rectBox(g, b[0], 124, 150, 54, C_ACCENT);
      g.appendChild(svgText(b[0] + 75, 147, b[1], null, 11.5, 'middle'));
      g.appendChild(svgText(b[0] + 75, 166, b[2], 'demo-x-mut', 10, 'middle'));
      return g;
    });
    var gsiLinks = group(gsi);
    arrowPath(gsiLinks, [[300, 151], [336, 151]], C_ACCENT, mk);
    arrowPath(gsiLinks, [[490, 151], [526, 151]], C_ACCENT, mk);

    /* 三个「生成出来的回合起点」：缩到 0.55 倍，绕各自的髋点缩放。 */
    var FIG_Y = 228;
    var figs = [0.1, 0.42, 0.74].map(function (ph, i) {
      var f = stickFigure(C_ACCENT, 2.6, false, 0.5);
      var x = 560 + i * 46;
      s.appendChild(f.el);
      f.el.setAttribute('transform', 'translate(' + x + ' ' + FIG_Y + ') scale(0.55) translate(' + -x + ' ' + -FIG_Y + ')');
      return { f: f, ph: ph, x: x, at: 7.4 + i * 0.4 };
    });
    var bufNote = svgText(605, 290, 'MimicKit：缓冲 4096 条，每 50 轮再采 1024 条', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(bufNote);
    var velNote = svgText(605, 306, '速度由相邻帧有限差分得到', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(velNote);

    var fid = group(s);
    fid.appendChild(svgText(30, 214, '采得像不像？4096 条生成 vs 4096 条真实（VAE 特征空间）', 'demo-x-ink2', 11.5));
    S6_FID.forEach(function (row, i) {
      var y = 228 + i * 30;
      rectBox(fid, 30, y, 360, 24, C_BORDER, C_SURFACE);
      fid.appendChild(svgText(42, y + 16, row[0], null, 11));
      fid.appendChild(paint(svgText(240, y + 16, 'FID ' + row[1], 'demo-x-mono', 11, 'middle'), C_ACCENT));
      fid.appendChild(paint(svgText(340, y + 16, 'Cov@1 ' + row[2], 'demo-x-mono', 11, 'middle'), C_GOOD));
    });
    var curve = group(s);
    chip(curve, 30, 326, 360, '图 12：GSI 的样本效率 ≈ RSI，明显好于从 T-pose 起步', C_GOOD, { size: 10.5 });

    var foot = group(s);
    foot.appendChild(svgText(600, 352, '同一个 SMP 身兼两职：奖励函数 + 初始状态分布', 'demo-x-acc', 13, 'middle'));
    foot.appendChild(svgText(600, 374, '先验训好之后，原始数据集可以彻底丢掉', 'demo-x-acc', 13, 'middle'));
    var limit = svgText(600, 402, '代价：偶尔会采出自碰撞这类非法状态（第 11 节）', 'demo-x-bad', 11, 'middle');
    s.appendChild(limit);

    function draw(t) {
      setOpacity(strike, seg(t, 2.6, 3.2));
      rsi.style.opacity = String(seg(t, 0.3, 0.9) * (1 - 0.55 * seg(t, 2.6, 3.2)));
      setOpacity(gsi, seg(t, 3.6, 4.0));
      gsiBoxes.forEach(function (g, i) {
        setOpacity(g, seg(t, 3.8 + i * 1.0, 4.4 + i * 1.0));
      });
      setOpacity(gsiLinks, seg(t, 4.8, 5.4));
      figs.forEach(function (it) {
        it.f.pose(it.x, FIG_Y, poseWalk(it.ph + t * 0.05));
        setOpacity(it.f.el, seg(t, it.at, it.at + 0.5));
      });
      setOpacity(bufNote, seg(t, 7.0, 7.6));
      setOpacity(velNote, seg(t, 7.6, 8.2));
      setOpacity(fid, seg(t, 9.4, 10.0));
      setOpacity(curve, seg(t, 11.0, 11.6));
      setOpacity(foot, seg(t, 12.6, 13.2));
      setOpacity(limit, seg(t, 13.6, 14.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 7: 一个先验，100 + N 种风格 ──
     三张奖励地形由 styleField 现算，和「一个先验，多种风格」演示同源（网格更粗）。 */
  var S7_GRID = 22;
  var S7_PRIORS = [
    { key: 'uncond', label: '无条件 $f(\\varnothing)$：三种风格都奖励', at: 3.0 },
    { key: 'aero', label: 'CFG（$w_{cfg} = 1$）→ AeroPlane', at: 5.0 },
    { key: 'combo', label: '组合：上半身 AeroPlane + 下半身 HighKnees', at: 11.6 }
  ];

  function buildSceneStyle() {
    var s = sceneSvg('风格平面上三种风格的数据簇，先后叠上三张奖励地形：无条件先验三簇都亮，CFG 选中 AeroPlane 只剩一簇，组合先验的峰值落在数据里没有的张开双臂加高抬腿处');
    s.appendChild(svgText(40, 36, '同一个风格条件扩散模型，换一种用法就是一个新的先验', 'demo-x-ink2', 13.5));
    var pl = scenePlane(200, 214, 150, STYLE_RANGE[0], STYLE_RANGE[1]);
    rectBox(s, 50, 64, 300, 300, C_BORDER, C_SURFACE2);

    var layers = S7_PRIORS.map(function (pr) {
      var field = styleField(pr.key, 1, S7_GRID);
      var g = group(s);
      var cell = 300 / S7_GRID;
      for (var j = 0; j < S7_GRID; j++) {
        for (var i = 0; i < S7_GRID; i++) {
          var v = Math.sqrt(field.r[j * S7_GRID + i] / (field.rmax || 1));
          if (v < 0.04) continue;
          g.appendChild(paint(svgEl('rect', { x: (50 + i * cell).toFixed(1), y: (364 - (j + 1) * cell).toFixed(1), width: (cell + 0.5).toFixed(1), height: (cell + 0.5).toFixed(1), opacity: (0.7 * v).toFixed(3) }), C_WARN));
        }
      }
      var bx = pl.px(field.best[0]),
        by = pl.py(field.best[1]);
      g.appendChild(paint(svgEl('path', { d: 'M ' + (bx - 7) + ' ' + by + ' L ' + (bx + 7) + ' ' + by + ' M ' + bx + ' ' + (by - 7) + ' L ' + bx + ' ' + (by + 7), 'stroke-width': 2 }), null, 'var(--text)'));
      return { g: g, pr: pr, field: field };
    });

    var clusters = group(s);
    var rng = mulberry32(5);
    var toneColor = { muted: C_MUTED, accent: C_ACCENT, good: C_GOOD };
    var inPlane = function (v) {
      return clamp(v, STYLE_RANGE[0] + 0.04, STYLE_RANGE[1] - 0.04);
    };
    STYLES.forEach(function (st) {
      for (var q = 0; q < 26; q++) {
        var px = inPlane(st.mu[0] + STYLE_STD * gauss(rng)),
          py = inPlane(st.mu[1] + STYLE_STD * gauss(rng));
        clusters.appendChild(paint(svgEl('circle', { cx: pl.px(px).toFixed(1), cy: pl.py(py).toFixed(1), r: 1.9, opacity: 0.85 }), toneColor[st.tone]));
      }
      clusters.appendChild(paint(svgText(pl.px(st.mu[0]), pl.py(st.mu[1]) - 30, st.name, null, 10.5, 'middle'), toneColor[st.tone]));
    });
    clusters.appendChild(svgText(350, 382, '上半身：手臂张开 →', 'demo-x-mut', 10, 'end'));
    clusters.appendChild(svgText(56, 78, '↑ 下半身：抬膝高度', 'demo-x-mut', 10));
    var combo = group(s);
    combo.appendChild(paint(svgEl('circle', { cx: pl.px(COMBO_TARGET[0]), cy: pl.py(COMBO_TARGET[1]), r: STYLE_STD * 2 * pl.unit, fill: 'none', 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }), null, C_BAD));
    combo.appendChild(svgText(pl.px(COMBO_TARGET[0]), pl.py(COMBO_TARGET[1]) - STYLE_STD * 2 * pl.unit - 6, '数据里没有', 'demo-x-bad', 10, 'middle'));

    var priorLbl = svgRich(200, 400, '', { size: 11.5, anchor: 'middle', w: 340, cls: 'demo-x-warn' });
    s.appendChild(priorLbl);

    var f1 = svgMath(578, 86, 'f_{style} = f(\\mathbf{x}_i, \\varnothing) + w_{cfg}\\left( f(\\mathbf{x}_i, c) - f(\\mathbf{x}_i, \\varnothing) \\right)', { size: 12.5, anchor: 'middle', w: 400 });
    s.appendChild(f1);
    var f1n = svgText(578, 112, '100STYLE：一个模型拆成 100 种风格先验；论文用 w = 1 就够', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(f1n);

    var tbl = group(s);
    tbl.appendChild(svgText(390, 146, '表 1：12 种风格的走到目标点任务（平均）', 'demo-x-ink2', 11.5));
    [['', '任务回报', '风格准确率'], ['AMP（每种风格单独训）', '0.874', '0.962'], ['AMP-Frozen', '0.771', '0.205'], ['SMP（一个先验 + CFG）', '0.879', '0.962']].forEach(function (row, i) {
      var y = 170 + i * 24;
      var cls = i === 0 ? 'demo-x-mut' : i === 2 ? 'demo-x-bad' : i === 3 ? 'demo-x-good' : 'demo-x-ink2';
      tbl.appendChild(svgText(390, y, row[0], cls, 11));
      tbl.appendChild(svgText(640, y, row[1], cls + (i ? ' demo-x-mono' : ''), 11, 'middle'));
      tbl.appendChild(svgText(730, y, row[2], cls + (i ? ' demo-x-mono' : ''), 11, 'middle'));
    });

    var f2 = svgMath(578, 290, 'f_{comp} = M_{upper} \\odot f(\\mathbf{x}_i, c_1) + M_{lower} \\odot f(\\mathbf{x}_i, c_2)', { size: 12.5, anchor: 'middle', w: 400 });
    s.appendChild(f2);
    var f2n = group(s);
    f2n.appendChild(svgText(578, 316, '在 ε 空间按身体部位拼接：既当奖励，也给 GSI 生成初始状态', 'demo-x-mut', 10.5, 'middle'));
    f2n.appendChild(svgText(578, 336, '风格冲突大时改用 3 步 DDIM 估计（MSM），4090 上约 16 小时', 'demo-x-mut', 10.5, 'middle'));
    var foot = svgText(578, 372, '奖励的峰值落到了数据里没有的地方', 'demo-x-acc', 14, 'middle');
    s.appendChild(foot);

    function draw(t) {
      setOpacity(clusters, seg(t, 0.3, 0.9));
      var cur = -1;
      layers.forEach(function (ly, i) {
        var on = seg(t, ly.pr.at, ly.pr.at + 0.6);
        var next = layers[i + 1];
        var off = next ? seg(t, next.pr.at, next.pr.at + 0.6) : 0;
        setOpacity(ly.g, on * (1 - off));
        if (t >= ly.pr.at) cur = i;
      });
      priorLbl.setText(cur >= 0 ? layers[cur].pr.label : '');
      setOpacity(priorLbl, cur >= 0 ? 1 : 0);
      setOpacity(f1, seg(t, 5.0, 5.6));
      setOpacity(f1n, seg(t, 5.6, 6.2));
      setOpacity(tbl, seg(t, 8.4, 9.0));
      setOpacity(f2, seg(t, 11.6, 12.2));
      setOpacity(combo, seg(t, 12.0, 12.6));
      setOpacity(f2n, seg(t, 14.0, 14.6));
      setOpacity(foot, seg(t, 14.6, 15.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 8: 训练闭环、证据与边界 ── */
  var S8_STEPS = [
    ['策略 $\\pi$', '4096 env × 32 步'],
    ['`disc_obs`', '10 帧 × 114 维'],
    ['`ESM_SDS_loss`', '[22, 15, 8]'],
    ['`DiffNormalizer`', '÷ 各档均值'],
    ['$\\exp(-6 \\cdot \\bar{\\ell})$', '三档平均'],
    ['$0.5\\,r^{task} + 0.5\\,r^{smp}$', '线性组合'],
    ['PPO 更新', 'clip 0.2']
  ];
  var S8_TASKS = [
    ['边跑边转向', 0.914, 0.634],
    ['走到目标点', 0.793, 0.737],
    ['躲避球', 0.733, 0.233],
    ['变速跑（3 秒数据）', 0.918, 0.904]
  ];

  function buildSceneLoop() {
    var s = sceneSvg('上面是一轮训练：策略采样、10 帧窗口、三档 SDS 误差、按档归一化、取指数、与任务奖励组合、PPO 更新；下面是证据：一个先验训三个任务，单段模仿平均 0.046 米与 AMP 打平，以及模式坍缩等局限');
    s.appendChild(svgText(40, 32, '一轮训练里，扩散模型只做前向，一次都不更新', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'smp-x-arrow-s8', C_MUTED);
    var BW = 98,
      GAP = 12,
      BX0 = 18,
      BY = 48,
      BH = 54;
    var boxes = S8_STEPS.map(function (st, i) {
      var x = BX0 + i * (BW + GAP);
      var g = group(s);
      rectBox(g, x, BY, BW, BH, i === 2 || i === 3 ? C_ACCENT : C_BORDER);
      g.appendChild(svgRich(x + BW / 2, BY + 22, st[0], { size: 10.5, anchor: 'middle', w: BW - 4 }));
      g.appendChild(svgText(x + BW / 2, BY + 42, st[1], 'demo-x-mut', 9.5, 'middle'));
      if (i < S8_STEPS.length - 1) arrowPath(g, [[x + BW, BY + BH / 2], [x + BW + GAP - 2, BY + BH / 2]], C_MUTED, mk);
      return { g: g, x: x };
    });
    var back = [[BX0 + 6 * (BW + GAP) + BW / 2, BY + BH], [BX0 + 6 * (BW + GAP) + BW / 2, BY + BH + 16], [BX0 + BW / 2, BY + BH + 16], [BX0 + BW / 2, BY + BH + 2]];
    var backPath = arrowPath(s, back, C_MUTED, mk, '5 4');
    var frozen = svgText(BX0 + 2.5 * (BW + GAP) + BW / 2, BY + BH + 30, '❄ TinyMDMModel：requires_grad = False', 'demo-x-acc', 10.5, 'middle');
    s.appendChild(frozen);
    /* 蓝点是一批数据沿流水线往前走：只在已经出现的方框之间跑（跑多远随方框淡入连续变长，不会跳），
       按真实时间 `clock` 循环，配音视频里旁白停住画面时它照样跑，不会卡在半路；每趟两头淡入淡出，回到起点不闪。 */
    var BOX_AT = [0.3, 0.8, 2.4, 3.0, 3.6, 5.0, 5.6];
    var TOKEN_PASS = 2.4;
    var token = paint(svgEl('circle', { cx: BX0 + BW / 2, cy: BY + BH / 2, r: 5, opacity: 0 }), C_ACCENT);
    s.appendChild(token);

    var ev = group(s);
    ev.appendChild(svgText(30, 166, '表 2：同一个 LaFAN1 跑步先验，原封不动训三个任务', 'demo-x-ink2', 11.5));
    var EX = 200,
      EU = 170;
    var evRows = S8_TASKS.map(function (row, i) {
      var y = 178 + i * 32;
      var g = group(ev);
      g.appendChild(svgText(30, y + 15, row[0], null, 11));
      var smpBar = hbar(g, EX, y, 0, 11, C_GOOD);
      var ampBar = hbar(g, EX, y + 13, 0, 9, C_MUTED, 0.7);
      var v1 = paint(svgText(EX + 6, y + 10, '', 'demo-x-mono', 10), C_GOOD);
      var v2 = paint(svgText(EX + 6, y + 21, '', 'demo-x-mono', 9.5), C_MUTED);
      g.appendChild(v1);
      g.appendChild(v2);
      return { smp: smpBar, amp: ampBar, v1: v1, v2: v2, row: row, at: 7.0 + i * 0.35 };
    });
    ev.appendChild(svgText(EX, 318, '绿：SMP　灰：AMP', 'demo-x-mut', 10));

    var right = group(s);
    chip(right, 430, 162, 346, '单段模仿 6 个技能：平均 **0.046 m**，与 AMP 打平（表 4）', C_GOOD, { size: 11 });
    chip(right, 430, 200, 346, '躲避球：数据里只有跑步，策略自己长出跳跃闪躲', C_GOOD, { size: 11 });
    chip(right, 430, 238, 346, 'Unitree G1 真机：行走、被推后恢复、spinkick', C_ACCENT, { size: 11 });
    var lim = group(s);
    chip(lim, 430, 282, 346, '边界：只追高峰的目标容易**模式坍缩**', C_BAD, { size: 11, dash: '4 3' });
    chip(lim, 430, 320, 346, 'GSI 偶尔采出非法状态；训练 11.5 h vs AMP 6.2 h', C_BAD, { size: 11, dash: '4 3' });

    var foot = svgRich(400, 384, '**SMP = AMP 的分布匹配 + 一个预训练、冻结、可分发的扩散模型当打分器**', { size: 13.5, anchor: 'middle', w: 760, cls: 'demo-x-acc' });
    s.appendChild(foot);

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      boxes.forEach(function (b, i) {
        setOpacity(b.g, seg(t, BOX_AT[i], BOX_AT[i] + 0.5));
      });
      setOpacity(backPath, seg(t, 5.8, 6.3));
      setOpacity(frozen, seg(t, 5.0, 5.6));
      var reach = 0;
      for (var i = 1; i < BOX_AT.length; i++) reach += seg(t, BOX_AT[i], BOX_AT[i] + 0.5);
      if (t < 7.0 && reach > 0) {
        var u = ((((now - 0.8) / TOKEN_PASS) % 1) + 1) % 1;
        token.setAttribute('cx', (BX0 + BW / 2 + u * reach * (BW + GAP)).toFixed(1));
        setOpacity(token, Math.min(1, u / 0.08, (1 - u) / 0.08) * Math.min(1, reach));
      } else {
        setOpacity(token, 0);
      }
      setOpacity(ev, seg(t, 6.8, 7.4));
      evRows.forEach(function (r) {
        var u = ease(seg(t, r.at, r.at + 0.9));
        setW(r.smp, r.row[1] * EU * u);
        setW(r.amp, r.row[2] * EU * u);
        r.v1.setAttribute('x', (EX + r.row[1] * EU * u + 6).toFixed(1));
        r.v2.setAttribute('x', (EX + r.row[2] * EU * u + 6).toFixed(1));
        r.v1.textContent = u > 0 ? fmt(r.row[1] * u, 3) : '';
        r.v2.textContent = u > 0 ? fmt(r.row[2] * u, 3) : '';
      });
      setOpacity(right, seg(t, 10.0, 10.6));
      setOpacity(lim, seg(t, 12.6, 13.2));
      setOpacity(foot, seg(t, 14.6, 15.2));
    }

    return { el: s, draw: draw };
  }

  var SMP_SCENES = [
    {
      title: '对抗先验为什么不能复用',
      dur: 15,
      build: buildSceneReuse,
      cues: [
        { at: 0.3, s: 'AMP 的风格奖励来自**判别器** $D$：它学的是「数据 vs **正在训练的这个**策略」的分界线，所以必须和策略一起对抗训练，动作数据集全程在场。' },
        { at: 4.0, s: '换一个新策略、把判别器冻结（论文叫 **AMP-Frozen**），新策略很快就找到它判错的地方，用不自然的动作刷高分；论文观察到判别器准确率在训练中一路下降。' },
        { at: 7.4, s: '代价写在表里：**风格准确率**（风格分类器认对的比例）12 种风格平均 **0.205**（AMP 0.962）；走到目标点（Target Location）的任务回报 **0.101**（AMP 0.737）。' },
        { at: 10.8, s: '论文要的运动先验是两条：**模块化**（Modular：训练策略时不碰原始数据）和**可复用**（Reusable：建好之后不再训练，直接用于新任务、新策略）。' },
        { at: 12.8, s: 'SMP 两项都做到了，风格准确率同样 0.962。它的答案：先验不该是和策略博弈的判别器，而应该是一个**只看过数据的生成模型**。' }
      ]
    },
    {
      title: '先训一个只看数据的扩散模型',
      dur: 16,
      build: buildScenePretrain,
      cues: [
        { at: 0.3, s: '第一步和任何任务、任何策略都无关：只拿动作数据训一个扩散模型 —— **100STYLE**（100 种走路风格、20 多小时的动捕数据集）可以，3 秒的三段走跑也可以。' },
        { at: 2.4, s: '输入是连续 **10 帧**的动作窗口 $\\mathbf{x} = (\\mathbf{s}_{t-8}, \\ldots, \\mathbf{s}_{t+1})$：根部线 / 角速度、各关节 6D 旋转、手脚末端位置，都在最后一帧的局部坐标系里。' },
        { at: 5.6, s: '训练是上一期讲过的标准 **DDPM**：从 $N = 50$ 档里随机选一档噪声，$\\mathbf{x}_i = \\sqrt{\\bar{\\alpha}_i}\\,\\mathbf{x}_0 + \\sqrt{1-\\bar{\\alpha}_i}\\,\\boldsymbol{\\epsilon}$，让网络猜出加进去的 $\\boldsymbol{\\epsilon}$。' },
        { at: 8.6, s: '网络小得出奇：**2 层 Transformer、4 头 × 64 维、约 300 万（3M）参数**，就能学会 100STYLE 的 100 种风格；一张 4090 显卡约 5 小时训完。' },
        { at: 11.6, s: '为什么要「先加噪、再估**分数**」（score：对数概率的梯度，指向数据更密的方向）：数据稀疏处的分数估不准，而策略刚开始乱动时恰恰在那里；噪声够大时，被扰动的分布铺满整个空间，估计就稳了。' },
        { at: 13.8, s: '训完就**冻结**。之后不管训多少个策略、什么任务，它一个参数都不再动。' }
      ]
    },
    {
      title: 'SDS：噪声残差就是修正量',
      dur: 17,
      build: buildSceneSds,
      cues: [
        { at: 0.3, s: '**SDS**（score distillation sampling，分数蒸馏采样）：给动作加噪，让冻结的扩散模型猜噪声。二维玩具：$x_1$ 左臂摆角、$x_2$ 右腿摆角（都已标准化），自然走路时数据挤在一条细椭圆上（$\\rho = 0.95$）。' },
        { at: 1.6, s: '绿点 A 是自然摆臂 (0.8, 0.8)；红点 B 是**顺拐** (0.8, −0.8)：左臂向前、右腿向后。离原点一样远，只是 B 横穿了椭圆。' },
        { at: 5.2, s: '把 B 加噪到第 22 档（$\\bar{\\alpha}_{22} = 0.556$），再让冻结的扩散模型猜噪声 $\\hat{\\boldsymbol{\\epsilon}} = f(\\mathbf{x}_{22})$。' },
        { at: 8.4, s: '扩散模型按「数据长什么样」去猜，会把偏离椭圆的那部分也算进噪声：反推出来的伪目标 $\\bar{\\mathbf{x}}_0$ 基本落回椭圆，离椭圆从 **1.131** 变成 **0.067**。' },
        { at: 10.8, s: '所以残差 $\\hat{\\boldsymbol{\\epsilon}} - \\boldsymbol{\\epsilon}$ 就是「往数据拉回去」的修正量。强化学习不要梯度、只要一个奖励数值：$r^{smp} = \\exp(-w_s \\lVert \\hat{\\boldsymbol{\\epsilon}} - \\boldsymbol{\\epsilon} \\rVert^2)$（论文式 7）。' },
        { at: 14.0, s: '只用这一档、$w_s = 6$：自然摆臂 $\\mathcal{L} = 0.321$，奖励 **0.146**；顺拐 $\\mathcal{L} = 0.963$，奖励 **0.003**。这里的去噪器是高斯数据下的闭式最优解，是玩具模型，数值不能和论文直接比。' }
      ]
    },
    {
      title: 'ESM：固定三档噪声压住方差',
      dur: 16,
      build: buildSceneEsm,
      cues: [
        { at: 0.3, s: '图像里的 SDS 每次随机抽一档噪声。看顺拐 B 在 50 档上的 SDS 误差：高噪声档接近 0，低噪声档到 3 以上 —— 对数轴上跨了好几个数量级（论文图 4 也是对数轴）。' },
        { at: 4.0, s: '在强化学习里这就不只是「梯度有噪声」了：误差就是奖励，**同一个动作这一步抽到高噪声奖励就高，下一步抽到低噪声就低**，价值函数学到的全是档位的噪声。' },
        { at: 6.8, s: '玩具里随机抽一档：均值 1.230、方差 **1.567**（散点是 1024 次评估里的前 60 次）。' },
        { at: 8.4, s: '**ESM**（ensemble score matching，集成分数匹配）不抽了：每次都在固定的 $\\mathcal{K} = \\{22, 15, 8\\}$ 上各算一次再平均。方差只剩每档那一次 $\\boldsymbol{\\epsilon}$ 的随机性，又被 1140 维平均掉，约 **$3 \\times 10^{-4}$**。' },
        { at: 11.4, s: '论文同一段 HighKnees（高抬腿）评估 1024 次：方差 $1.140 \\to 9.964 \\times 10^{-6}$，均值基本不变（1.309 vs 1.339）。Backflip（后空翻）用随机档误差 0.195 m，固定三档 **0.069 m**。' },
        { at: 13.8, s: '为什么是中间三档：高噪声档对离数据很远的动作也可靠，但会丢掉细节；低噪声档修得细，但对抖动非常敏感。表 7 里 [22, 15, 8] 平均 **0.060 m** 最好。' }
      ]
    },
    {
      title: 'AdaNorm：三档各除各的均值',
      dur: 16,
      build: buildSceneNorm,
      cues: [
        { at: 0.3, s: '固定三档还不够：三档误差的**量级**差很多。顺拐 B 的原始误差 0.963 / 1.896 / 3.451，直接平均的话，$t = 8$ 一档就占了 **55%**。' },
        { at: 4.0, s: '**AdaNorm**（adaptive normalization，自适应归一化）：每档记一个运行均值 $\\mu_i$，求和前各自除掉。手算时用训练初期「手脚各摆各的」作为 $\\mu$：0.861 / 1.595 / 2.820（MimicKit 里是策略自己历史误差的累计均值）。' },
        { at: 7.4, s: 'B 归一化后是 1.119 / 1.189 / 1.223，三档占比变成 **32% / 34% / 35%**，谁也不压过谁；三个值都略大于 1，比训练初期乱摆还差一点。' },
        { at: 10.0, s: '平均后乘 $w_s = 6$ 取指数：自然摆臂 $\\exp(-6 \\times 0.275) = $ **0.192**，顺拐 $\\exp(-6 \\times 1.177) = $ **0.0009**。' },
        { at: 12.2, s: '接上任务奖励 $r = 0.5\\,r^{task} + 0.5\\,r^{smp}$，两种走法到目标的进度都是 0.8 时：**0.496 vs 0.400**，PPO 自然会把顺拐压下去。' },
        { at: 14.2, s: '另一个好处是换先验不用手动改参数：表 6 用 3 个独立训练的扩散模型，不加 AdaNorm 平均 0.176 m、方差很大，加上之后 **0.057 m**。' }
      ]
    },
    {
      title: 'GSI：初始状态也由先验来生',
      dur: 15,
      build: buildSceneGsi,
      cues: [
        { at: 0.3, s: '只换掉奖励还不够「模块化」：DeepMimic 以来的 **RSI**（reference state initialization，参考状态初始化）要从数据里随机选一帧作为回合起点 —— 还是要带着数据集。' },
        { at: 3.6, s: '可 SMP 本身就是生成模型。**GSI**（generative state initialization，生成式状态初始化）：直接从同一个扩散模型里采 10 帧窗口，末帧作为人形的初始状态，10 帧填满打分要用的历史。' },
        { at: 7.0, s: 'MimicKit 默认维护 4096 条的缓冲，每 50 轮迭代再采 1024 条；速度由相邻两帧相减得到。' },
        { at: 9.4, s: '采得像不像？4096 条对 4096 条：**FID**（两团样本的分布离得多远，越小越像）**0.092 / 0.100 / 0.200**，**Coverage@1**（真实样本附近能找到生成样本的比例）都在 **89%** 以上；训练曲线上 GSI 与 RSI 相当，明显好于从 **T-pose**（双臂平伸）起步。' },
        { at: 12.6, s: '于是同一个 SMP 身兼两职：**奖励函数 + 初始状态分布**，先验训好之后原始数据集可以彻底丢掉。代价是偶尔会采出自碰撞（比如手穿进身体）这类非法状态。' }
      ]
    },
    {
      title: '一个先验，100 + N 种风格',
      dur: 17,
      build: buildSceneStyle,
      cues: [
        { at: 0.3, s: '在整个 100STYLE 上训一个**风格条件**扩散模型（输入里带风格标签）。玩具里只画三种：Neutral（普通走路）、AeroPlane（张开双臂）、HighKnees（高抬腿）。' },
        { at: 3.0, s: '不给风格标签时，它奖励的是「哪种风格都行」：三个簇都亮。' },
        { at: 5.0, s: '用 **CFG**（classifier-free guidance，无分类器引导）把它变成单一风格的先验：$f_{style} = f(\\varnothing) + w_{cfg}\\,(f(c) - f(\\varnothing))$。论文发现 $w_{cfg} = 1$ 就够了 —— 只剩 AeroPlane 那一簇亮。' },
        { at: 8.4, s: '12 种风格的走到目标点任务：SMP 风格准确率平均 **0.962**，和每种风格单独整理数据、单独训判别器的 AMP 一样；冻结判别器的 AMP-Frozen 只有 0.205。' },
        { at: 11.6, s: '再进一步：上半身取 AeroPlane 的预测、下半身取 HighKnees 的预测，$f_{comp} = M_{upper} \\odot f(c_1) + M_{lower} \\odot f(c_2)$。' },
        { at: 14.0, s: '奖励的峰值落到了**数据里没有的地方**：张开双臂 + 高抬腿；它同时给 GSI 生成这种风格的初始状态。风格冲突大时，论文改用 3 步 DDIM 估 $\\hat{\\boldsymbol{\\epsilon}}$（**MSM**，多步分数匹配）。' }
      ]
    },
    {
      title: '训练闭环、证据与边界',
      dur: 16,
      build: buildSceneLoop,
      cues: [
        { at: 0.3, s: '串起来就是一轮训练：MimicKit 默认 4096 个并行环境各跑 32 步，记下每一步的 10 帧窗口 `disc_obs`。' },
        { at: 2.4, s: '`ESM_SDS_loss` 在 22 / 15 / 8 三档各算一次误差，`DiffNormalizer` 除以各档均值，平均后乘 6 取指数。' },
        { at: 5.0, s: '与任务奖励 0.5 / 0.5 组合后交给 PPO；扩散模型 `requires_grad=False`，全程一次都不更新。' },
        { at: 7.0, s: '同一个 LaFAN1（公开动捕数据集）跑步先验，原封不动训三个任务：边跑边转向（Steering）**0.914**、走到目标点 **0.793**、躲避球（Dodgeball）**0.733**（AMP 0.233）；变速跑（Target Speed）的先验只看过 3 秒数据，也有 **0.918**。' },
        { at: 10.0, s: '单段模仿 6 个技能，平均误差 **0.046 m**，和 AMP 打平，奖励全程不读参考数据；同一套方法训出的走路策略直接上了宇树 Unitree G1 人形机器人。' },
        { at: 12.6, s: '边界：只追高峰（mode-seeking）的目标容易**模式坍缩**（只会少数几种动作），数据越大越明显；GSI 偶尔采出非法状态；训练比 AMP 慢约一倍（11.5 h vs 6.2 h）。' },
        { at: 14.6, s: '一句话：**SMP = AMP 的分布匹配 + 一个预训练、冻结、可分发的扩散模型当打分器。**' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '八幕动画：SMP 全流程速览',
      sub: '约 128 秒自动播放。空格播放/暂停，← → 换幕；第 3–7 幕的数字与下面三个演示用的是同一份函数。',
      ariaLabel: 'SMP 八幕讲解动画',
      notes: [
        '取数依据：第 1 幕的 0.962 / 0.205 / 0.737 / 0.101 / 0.793、第 4 幕的 $1.140 \\to 9.964 \\times 10^{-6}$ 与 0.195 / 0.069 / 0.060、第 5 幕的 0.176 / 0.057、第 6 幕的 FID 与 Coverage、第 7 幕的表 1、第 8 幕的表 2 与 0.046 都摘自论文；' +
          '第 2 幕的 10 帧 / 2 层 / 4 头 × 64 / 3M / N = 50 来自论文 6.2 节与附录 A，第 6、8 幕的 4096 / 1024 / 50 轮 / [22, 15, 8] / 6 / 0.5 来自 MimicKit 默认 yaml。',
        '**第 3–5 幕与第 7 幕是玩具模型**：二维高斯「动作流形」（$\\rho = 0.95$）与三簇风格高斯，去噪器取闭式最优解，噪声表照抄 diffusers 的 `squaredcos_cap_v2`；' +
          '0.321 / 0.963、0.146 / 0.003、0.556、1.131 → 0.067、0.861 / 1.595 / 2.820、0.192 / 0.0009、0.496 / 0.400 都由 `sdsExpected` / `smpBreakdown` 现算，和笔记「具体实例」那几张表同源。定性结论成立，**具体数值不能和论文直接比**。'
      ],
      scenes: SMP_SCENES
    });
  }

  // ─── the narrated vertical video of the same eight scenes ─────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：SMP 八幕全流程',
      sub: '8 分 37 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的八幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '9.7 MB',
      fileName: 'SMP_讲解视频.mp4'
    });
  }

  K.mount({
    'smp-explainer': buildExplainerDemo,
    'smp-video': buildVideoDemo,
    'smp-sds': buildSdsDemo,
    'smp-esm': buildEsmDemo,
    'smp-style': buildStyleDemo
  });
})();
