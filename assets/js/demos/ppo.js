/* Interactive PPO demos for papers/01_Foundational_RL/PPO_Proximal_Policy_Optimization.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["ppo"]`. The note itself may only contain empty placeholders
 *
 *     <div class="paper-demo" data-demo="ppo-clip"></div>
 *
 * because scripts/sanitize_paper_html.py strips <script>/<canvas>/<input>
 * from #paper-body before publish. Everything below is therefore built at
 * runtime. Styling lives in assets/css/paper-demos.css.
 *
 * Demos:
 *   ppo-clip   — L^CLIP(r) curve: when does a sample still learn, when is it frozen
 *   ppo-gae    — GAE playground: how λ interpolates between one-step TD and Monte Carlo
 *   ppo-epochs — why clipping is what makes K-epoch reuse of one batch safe
 */

(function () {
  'use strict';

  // ─── shared toolkit (assets/js/demos/kit.js, loaded first by the layout) ──
  var K = window.PaperDemoKit;
  var el = K.el,
    fmt = K.fmt,
    clamp = K.clamp,
    card = K.card,
    controlsRow = K.controlsRow,
    slider = K.slider,
    button = K.button,
    checkbox = K.checkbox,
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
    niceTicks = K.niceTicks,
    registerRenderer = K.registerRenderer,
    mulberry32 = K.mulberry32,
    gauss = K.gauss,
    softmax = K.softmax;

  // ─── demo 1: the clipped objective ───────────────────────────────────────
  /* Which of the two terms min() picks, and whether that term still has a
     gradient w.r.t. θ. Returns one of 'normal' | 'pullback' | 'frozen'. */
  function clipRegime(r, adv, eps) {
    var lo = 1 - eps,
      hi = 1 + eps;
    if (r >= lo && r <= hi) return 'normal';
    if (adv >= 0) return r > hi ? 'frozen' : 'pullback';
    return r < lo ? 'frozen' : 'pullback';
  }

  function clipObjective(r, adv, eps) {
    var unclipped = r * adv;
    var clipped = clamp(r, 1 - eps, 1 + eps) * adv;
    return Math.min(unclipped, clipped);
  }

  function buildClipDemo(host) {
    var root = card(host, {
      title: '裁剪目标 L^CLIP 长什么样：拖动概率比 r，看这条样本是在学还是被冻结',
      sub: '横轴是概率比 r = π_θ(a|s) / π_old(a|s)，纵轴是这条样本贡献的目标值。三条线分别是未裁剪项 r·Â、裁剪项 clip(r)·Â，以及 PPO 真正优化的 min(两者)。'
    });

    var state = { r: 1.5, adv: 2.3, eps: 0.2 };

    var ctrls = controlsRow(root);
    var rSlider = slider(ctrls, {
      label: '概率比 r（可直接在图上拖动）',
      min: 0.3,
      max: 2,
      step: 0.01,
      value: state.r,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.r = v;
        render();
      }
    });
    var advSlider = slider(ctrls, {
      label: '优势 Â（>0 好动作 / <0 坏动作）',
      min: -4,
      max: 4,
      step: 0.1,
      value: state.adv,
      format: function (v) {
        return fmt(v, 1);
      },
      onInput: function (v) {
        state.adv = v;
        render();
      }
    });
    slider(ctrls, {
      label: '裁剪范围 ε',
      min: 0.05,
      max: 0.5,
      step: 0.01,
      value: state.eps,
      format: function (v) {
        return fmt(v, 2) + '  →  [' + fmt(1 - v, 2) + ', ' + fmt(1 + v, 2) + ']';
      },
      onInput: function (v) {
        state.eps = v;
        render();
      }
    });

    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '案例 A：好动作 r=1.5', function () {
      advSlider.set(2.3, true);
      rSlider.set(1.5, true);
      state.adv = 2.3;
      state.r = 1.5;
      render();
    });
    button(btns, '案例 B：坏动作 r=0.6', function () {
      advSlider.set(-3.1, true);
      rSlider.set(0.6, true);
      state.adv = advSlider.get();
      state.r = 0.6;
      render();
    });
    button(btns, '回拉区：坏动作 r=1.6', function () {
      advSlider.set(-2, true);
      rSlider.set(1.6, true);
      state.adv = -2;
      state.r = 1.6;
      render();
    });

    var setLegend = legend(root, [
      { key: 'muted', text: '未裁剪 r·Â' },
      { key: 'warn', text: '裁剪 clip(r)·Â' },
      { key: 'accent', text: 'PPO 实际优化的 min(·)' },
      { key: 'good', text: '安全带 [1−ε, 1+ε]' },
      { key: 'bad', text: '冻结区（梯度 = 0）' }
    ]);

    var st = stage(root, 250);
    var stats = statsRow(root);
    var sUnclipped = stats.add('未裁剪项 r·Â');
    var sClipped = stats.add('裁剪项 clip(r)·Â');
    var sPicked = stats.add('min 选中');
    var sGrad = stats.add('∂L/∂r（这条样本）');
    var verdict = verdictBox(root);

    note(root, [
      '**怎么读**：只要 min 选中的是「顶在边界上的裁剪项」，它对 θ 就是常数，梯度为 0 —— 这条样本本轮不再推动策略，即笔记里说的**冻结**。',
      '**容易被忽略的一半**：冻结只发生在「往外冲」的那一侧。好动作 Â>0 时只有 r>1+ε 会冻；**坏动作 Â<0 时 r>1+ε 反而梯度最大**（min 选中未裁剪项），把已经跑偏的策略狠狠拉回来。把 Â 拖到负数、r 拖到 1.6 就能看到这个「回拉区」。',
      '**ε 在调什么**：把 ε 从 0.05 拖到 0.5，安全带变宽，允许单轮走更大的步子，冻结来得更晚 —— 更快，也更容易一步走过头。'
    ]);

    var render = registerRenderer(function () {
      var g = begin(st);
      var P = g.P;
      setLegend(P);

      var lo = 1 - state.eps,
        hi = 1 + state.eps;
      var xd = [0.3, 2];
      var span = Math.max(Math.abs(state.adv) * xd[1], 0.6);
      var yd = state.adv >= 0 ? [-0.15 * span, span * 1.05] : [-span * 1.05, 0.15 * span];
      var p = plot(g, { l: 46, r: 14, t: 14, b: 32 }, xd, yd);
      var ctx = g.ctx;

      // frozen half-plane + safety belt
      var frozenFrom = state.adv >= 0 ? hi : xd[0];
      var frozenTo = state.adv >= 0 ? xd[1] : lo;
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = P.bad;
      ctx.fillRect(p.sx(frozenFrom), p.y1, p.sx(frozenTo) - p.sx(frozenFrom), p.y0 - p.y1);
      ctx.fillStyle = P.good;
      ctx.fillRect(p.sx(lo), p.y1, p.sx(hi) - p.sx(lo), p.y0 - p.y1);
      ctx.restore();

      axes(g, p, {
        // 1.00 sits between the two belt edges; on a phone drop it so the labels don't collide
        xTicks: g.w < 430 ? [0.5, lo, hi, 1.5, 2] : [0.5, lo, 1, hi, 1.5, 2],
        yTicks: niceTicks(yd[0], yd[1], 5),
        xFmt: function (t) {
          return fmt(t, 2);
        },
        yFmt: function (t) {
          return fmt(t, 1);
        },
        xLabel: '概率比 r',
        yLabel: '目标值'
      });

      // zero line
      line(ctx, [[p.x0, p.sy(0)], [p.x1, p.sy(0)]], P.border, 1, [4, 4]);

      var uncl = [],
        clp = [],
        mn = [];
      for (var i = 0; i <= 120; i++) {
        var r = xd[0] + ((xd[1] - xd[0]) * i) / 120;
        uncl.push([p.sx(r), p.sy(r * state.adv)]);
        clp.push([p.sx(r), p.sy(clamp(r, lo, hi) * state.adv)]);
        mn.push([p.sx(r), p.sy(clipObjective(r, state.adv, state.eps))]);
      }
      line(ctx, uncl, P.muted, 1.5, [5, 4]);
      line(ctx, clp, P.warn, 1.5, [2, 3]);
      line(ctx, mn, P.accent, 3);

      // current sample
      var val = clipObjective(state.r, state.adv, state.eps);
      var regime = clipRegime(state.r, state.adv, state.eps);
      line(ctx, [[p.sx(state.r), p.y0], [p.sx(state.r), p.sy(val)]], P.text, 1, [3, 3]);
      dot(ctx, p.sx(state.r), p.sy(val), 5, regime === 'frozen' ? P.bad : P.good, P.surface2);
      text(
        ctx,
        regime === 'frozen' ? '冻结' : '在学',
        p.sx(state.r),
        p.sy(val) - 14,
        regime === 'frozen' ? P.bad : P.good,
        'center',
        '12px sans-serif'
      );

      // readouts
      var unclippedVal = state.r * state.adv;
      var clippedVal = clamp(state.r, lo, hi) * state.adv;
      sUnclipped.set(fmt(unclippedVal, 2));
      sClipped.set(fmt(clippedVal, 2));
      var pickedClipped = clippedVal < unclippedVal;
      sPicked.set(pickedClipped ? '裁剪项 ' + fmt(clippedVal, 2) : '未裁剪项 ' + fmt(unclippedVal, 2), 'accent');
      sGrad.set(regime === 'frozen' ? '0（常数项）' : fmt(state.adv, 2), regime === 'frozen' ? 'bad' : 'good');

      var msg;
      if (regime === 'frozen') {
        msg =
          state.adv >= 0
            ? 'r = ' + fmt(state.r, 2) + ' > 1+ε = ' + fmt(hi, 2) + '：好动作已经被抬到安全带之外，min 选中常数 ' + fmt(hi, 2) + '·Â，梯度为 0 —— 本轮不再加码。'
            : 'r = ' + fmt(state.r, 2) + ' < 1−ε = ' + fmt(lo, 2) + '：坏动作已经被压到安全带之外，min 选中常数 ' + fmt(lo, 2) + '·Â，梯度为 0 —— 本轮不再狂砍。';
        verdict.set('🧊 冻结：' + msg, 'frozen');
      } else if (regime === 'pullback') {
        msg =
          state.adv >= 0
            ? '好动作却只有 r = ' + fmt(state.r, 2) + ' < 1−ε：min 选中未裁剪项，梯度 = Â = ' + fmt(state.adv, 2) + ' > 0，把概率往回抬。'
            : '坏动作却有 r = ' + fmt(state.r, 2) + ' > 1+ε：min 选中未裁剪项（更悲观的那个），梯度 = Â = ' + fmt(state.adv, 2) + ' < 0，把跑偏的概率狠狠压回来。';
        verdict.set('↩️ 回拉区（裁剪不挡这一侧）：' + msg, 'learning');
      } else {
        verdict.set(
          '✅ 正常学习：r = ' + fmt(state.r, 2) + ' 在安全带 [' + fmt(lo, 2) + ', ' + fmt(hi, 2) + '] 内，两项相等，梯度 = Â = ' + fmt(state.adv, 2) + '，' + (state.adv >= 0 ? '继续抬高该动作概率。' : '继续压低该动作概率。'),
          'learning'
        );
      }
      st.canvas.setAttribute(
        'aria-label',
        '裁剪目标曲线：当前 r=' + fmt(state.r, 2) + '，Â=' + fmt(state.adv, 1) + '，状态' + (regime === 'frozen' ? '冻结' : '在学')
      );
    });

    // drag on the canvas to move r
    var dragging = false;
    function pointerToR(evt) {
      var rect = st.canvas.getBoundingClientRect();
      var p = plot({ w: rect.width, h: st.height }, { l: 46, r: 14, t: 14, b: 32 }, [0.3, 2], [0, 1]);
      var r = clamp(p.ux(evt.clientX - rect.left), 0.3, 2);
      rSlider.set(Math.round(r * 100) / 100, true);
      state.r = rSlider.get();
      render();
    }
    st.canvas.addEventListener('pointerdown', function (e) {
      dragging = true;
      st.canvas.setPointerCapture(e.pointerId);
      pointerToR(e);
    });
    st.canvas.addEventListener('pointermove', function (e) {
      if (dragging) {
        e.preventDefault();
        pointerToR(e);
      }
    });
    st.canvas.addEventListener('pointerup', function () {
      dragging = false;
    });
    st.canvas.addEventListener('pointercancel', function () {
      dragging = false;
    });

    render();
  }

  // ─── demo 2: GAE playground ──────────────────────────────────────────────
  /* δ_t = r_t + γ·V(s_{t+1}) − V(s_t); the last step is terminal (no bootstrap). */
  function deltas(steps, gamma) {
    var out = [];
    for (var t = 0; t < steps.length; t++) {
      var nextV = t === steps.length - 1 ? 0 : steps[t + 1].v;
      out.push(steps[t].r + gamma * nextV - steps[t].v);
    }
    return out;
  }

  /* Â_t = δ_t + γλ·Â_{t+1}, recursed backwards from the trajectory boundary. */
  function gae(steps, gamma, lam) {
    var d = deltas(steps, gamma);
    var adv = new Array(d.length);
    var acc = 0;
    for (var t = d.length - 1; t >= 0; t--) {
      acc = d[t] + gamma * lam * acc;
      adv[t] = acc;
    }
    return adv;
  }

  var GAE_PRESETS = [
    {
      name: '笔记例子：3 步后摔倒',
      steps: [
        { r: 1, v: 50 },
        { r: 1, v: 50 },
        { r: 1, v: 50 },
        { r: -2, v: 40 },
        { r: -10, v: 20 }
      ]
    },
    {
      name: 'Critic 提前预警',
      steps: [
        { r: 1, v: 30 },
        { r: 1, v: 28 },
        { r: 1, v: 24 },
        { r: -2, v: 18 },
        { r: -10, v: 10 }
      ]
    },
    {
      /* V(s_t) ≈ the discounted future reward actually collected, so every
         δ_t lands near zero — "这条轨迹和 Critic 预期的一样好"。 */
      name: 'Critic 估得准：优势≈0',
      steps: [
        { r: 1, v: 10 },
        { r: 1, v: 9 },
        { r: 1, v: 8 },
        { r: 2, v: 7 },
        { r: 5, v: 5 }
      ]
    }
  ];

  function buildGaeDemo(host) {
    var root = card(host, {
      title: 'GAE 实验台：λ 怎么把「4 步后的那一摔」传回 t=0',
      sub: '改奖励、改 Critic 的 V(s)、拖 γ 和 λ，下面的 δ_t 与 Â_t 立刻重算。λ=0 是一步 TD（短视、低方差），λ=1 是蒙特卡洛（看到底、高方差）。'
    });

    var state = {
      steps: GAE_PRESETS[0].steps.map(function (s) {
        return { r: s.r, v: s.v };
      }),
      gamma: 0.99,
      lam: 0.95
    };

    var ctrls = controlsRow(root);
    var lamSlider = slider(ctrls, {
      label: 'GAE λ',
      min: 0,
      max: 1,
      step: 0.01,
      value: state.lam,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.lam = v;
        render();
      }
    });
    slider(ctrls, {
      label: '折扣 γ',
      min: 0.8,
      max: 1,
      step: 0.01,
      value: state.gamma,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.gamma = v;
        render();
      }
    });

    var presetBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(presetBox);
    GAE_PRESETS.forEach(function (preset) {
      button(presetBox, preset.name, function () {
        state.steps = preset.steps.map(function (s) {
          return { r: s.r, v: s.v };
        });
        renderTable();
        render();
      });
    });

    var tableWrap = el('div', 'demo-table-wrap');
    root.appendChild(tableWrap);
    var table = el('table', 'demo-table');
    tableWrap.appendChild(table);
    var deltaCells = [],
      advCells = [];

    function stepper(cell, getter, setter, step, digits) {
      var box = el('span', 'demo-stepper');
      var minus = el('button', null, '−');
      minus.type = 'button';
      minus.setAttribute('aria-label', '减小');
      var value = el('span', 'demo-stepper-v', fmt(getter(), digits));
      var plus = el('button', null, '+');
      plus.type = 'button';
      plus.setAttribute('aria-label', '增大');
      minus.addEventListener('click', function () {
        setter(getter() - step);
        value.textContent = fmt(getter(), digits);
        render();
      });
      plus.addEventListener('click', function () {
        setter(getter() + step);
        value.textContent = fmt(getter(), digits);
        render();
      });
      box.appendChild(minus);
      box.appendChild(value);
      box.appendChild(plus);
      cell.appendChild(box);
    }

    function renderTable() {
      table.innerHTML = '';
      deltaCells = [];
      advCells = [];
      var head = el('tr');
      head.appendChild(el('th', null, '时刻 t'));
      state.steps.forEach(function (_, i) {
        head.appendChild(el('th', null, i === state.steps.length - 1 ? i + '（done）' : String(i)));
      });
      table.appendChild(head);

      var rowR = el('tr');
      rowR.appendChild(el('th', null, '奖励 r_t'));
      state.steps.forEach(function (s, i) {
        var td = el('td');
        stepper(
          td,
          function () {
            return state.steps[i].r;
          },
          function (v) {
            state.steps[i].r = clamp(Math.round(v), -20, 20);
          },
          1,
          0
        );
        rowR.appendChild(td);
      });
      table.appendChild(rowR);

      var rowV = el('tr');
      rowV.appendChild(el('th', null, 'Critic V(s_t)'));
      state.steps.forEach(function (s, i) {
        var td = el('td');
        stepper(
          td,
          function () {
            return state.steps[i].v;
          },
          function (v) {
            state.steps[i].v = clamp(Math.round(v), 0, 100);
          },
          5,
          0
        );
        rowV.appendChild(td);
      });
      table.appendChild(rowV);

      var rowD = el('tr');
      rowD.appendChild(el('th', null, 'TD 误差 δ_t'));
      state.steps.forEach(function () {
        var td = el('td', null, '—');
        deltaCells.push(td);
        rowD.appendChild(td);
      });
      table.appendChild(rowD);

      var rowA = el('tr');
      rowA.appendChild(el('th', null, 'GAE 优势 Â_t'));
      state.steps.forEach(function () {
        var td = el('td', null, '—');
        advCells.push(td);
        rowA.appendChild(td);
      });
      table.appendChild(rowA);
    }
    renderTable();

    var setLegend = legend(root, [
      { key: 'muted', text: 'λ=0（一步 TD）' },
      { key: 'accent', text: '当前 λ' },
      { key: 'warn', text: 'λ=1（蒙特卡洛）' }
    ]);

    var grid = stageGrid(root);
    var barStage = stage(grid, 210);
    var curveStage = stage(grid, 210);

    var stats = statsRow(root);
    var sA0Zero = stats.add('Â₀（λ=0，一步 TD）');
    var sA0Cur = stats.add('Â₀（当前 λ）');
    var sA0One = stats.add('Â₀（λ=1，蒙特卡洛）');
    var sDecay = stats.add('每往前一步的衰减 γλ');
    var verdict = verdictBox(root);

    note(root, [
      '**先看最左边那根柱子**：默认场景里 t=0 只看一步（λ=0）时 δ₀=+0.5，像是「走得挺好」；把 λ 拖到 0.95，Â₀ 掉到 −49 左右 —— λ 让 t=0 提前看见 4 步后的那一摔，责任被往前传。',
      '**λ 到底在权衡什么**：λ 越大越依赖真实发生的后续奖励（偏差小、方差大），越小越依赖 Critic 的 V 估计（方差小、但 Critic 估错就跟着错）。切到「Critic 提前预警」预设：V 本身已经一路下滑，一步 TD 就能看出 t=0 不妙，符号不再被 λ 翻转 —— λ 要补的，正是 Critic 没看出来的那部分。',
      '**第三个预设「Critic 估得准」**：V(s_t) 正好等于后面真实拿到的折扣回报，于是每个 δ_t 都接近 0、Â_t 也接近 0。**优势≈0 不代表走得差**，只代表「和该状态的平均水平持平」，这批数据对策略几乎没有修正意见 —— 这正是训练后期的常态。',
      '**为什么 done 处要截断**：最后一步是轨迹边界，δ 不再 bootstrap 下一个 V，递推也从这里重新起步 —— 否则会把下一条轨迹（重置后的新 episode）的信息错误地传回来。'
    ]);

    var render = registerRenderer(function () {
      var d = deltas(state.steps, state.gamma);
      var advCur = gae(state.steps, state.gamma, state.lam);
      var advZero = gae(state.steps, state.gamma, 0);
      var advOne = gae(state.steps, state.gamma, 1);

      d.forEach(function (v, i) {
        if (!deltaCells[i]) return;
        deltaCells[i].textContent = fmt(v, 1);
        deltaCells[i].className = v >= 0 ? 'is-good' : 'is-bad';
      });
      advCur.forEach(function (v, i) {
        if (!advCells[i]) return;
        advCells[i].textContent = fmt(v, 1);
        advCells[i].className = v >= 0 ? 'is-good' : 'is-bad';
      });

      sA0Zero.set(fmt(advZero[0], 1), advZero[0] >= 0 ? 'good' : 'bad');
      sA0Cur.set(fmt(advCur[0], 1), advCur[0] >= 0 ? 'good' : 'bad');
      sA0One.set(fmt(advOne[0], 1), advOne[0] >= 0 ? 'good' : 'bad');
      sDecay.set(fmt(state.gamma * state.lam, 3));

      var flips = advZero[0] >= 0 !== advCur[0] >= 0;
      if (flips) {
        verdict.set(
          '⚠️ 符号被 λ 翻转了：一步 TD 认为 t=0 是好动作（Â₀ = ' + fmt(advZero[0], 1) + '），当前 λ = ' + fmt(state.lam, 2) + ' 却认为是坏动作（Â₀ = ' + fmt(advCur[0], 1) + '）。裁剪表格里「好动作 / 坏动作」分在哪一列，取决于这一步。',
          'frozen'
        );
      } else {
        verdict.set(
          'λ = ' + fmt(state.lam, 2) + ' 时 Â₀ = ' + fmt(advCur[0], 1) + '，介于一步 TD 的 ' + fmt(advZero[0], 1) + ' 和蒙特卡洛的 ' + fmt(advOne[0], 1) + ' 之间 —— GAE 就是这两端的加权插值。',
          'learning'
        );
      }

      // ── bar chart: Â_t under three λ ──
      var g = begin(barStage);
      var P = g.P;
      setLegend(P);
      var all = advZero.concat(advCur, advOne);
      var lo = Math.min.apply(null, all.concat([0]));
      var hi = Math.max.apply(null, all.concat([0]));
      var padY = (hi - lo) * 0.12 || 1;
      var p = plot(g, { l: 46, r: 10, t: 16, b: 32 }, [0, state.steps.length], [lo - padY, hi + padY]);
      axes(g, p, {
        yTicks: niceTicks(lo - padY, hi + padY, 4),
        yFmt: function (t) {
          return fmt(t, 0);
        },
        xLabel: '时刻 t'
      });
      line(g.ctx, [[p.x0, p.sy(0)], [p.x1, p.sy(0)]], P.border, 1);
      text(g.ctx, '各时刻的优势 Â_t', p.x0, p.y1 - 6, P.muted, 'left', '11px sans-serif');

      var slot = (p.x1 - p.x0) / state.steps.length;
      var series = [
        { vals: advZero, color: P.muted },
        { vals: advCur, color: P.accent },
        { vals: advOne, color: P.warn }
      ];
      var bw = Math.max(3, (slot - 8) / 3);
      state.steps.forEach(function (_, t) {
        var base = p.x0 + slot * t + (slot - bw * 3) / 2;
        series.forEach(function (s, si) {
          var y = p.sy(s.vals[t]);
          var y0 = p.sy(0);
          g.ctx.fillStyle = s.color;
          g.ctx.fillRect(base + si * bw, Math.min(y, y0), bw - 1, Math.abs(y - y0));
        });
        text(g.ctx, String(t), p.x0 + slot * (t + 0.5), p.y0 + 13, P.muted, 'center', '11px monospace');
      });

      // ── curve: Â₀ as a function of λ ──
      var g2 = begin(curveStage);
      var P2 = g2.P;
      var pts = [];
      var vlo = Infinity,
        vhi = -Infinity;
      for (var i = 0; i <= 100; i++) {
        var l = i / 100;
        var a0 = gae(state.steps, state.gamma, l)[0];
        pts.push([l, a0]);
        if (a0 < vlo) vlo = a0;
        if (a0 > vhi) vhi = a0;
      }
      var pad2 = (vhi - vlo) * 0.15 || 1;
      var p2 = plot(g2, { l: 46, r: 26, t: 16, b: 32 }, [0, 1], [vlo - pad2, vhi + pad2]);
      axes(g2, p2, {
        xTicks: [0, 0.25, 0.5, 0.75, 1],
        yTicks: niceTicks(vlo - pad2, vhi + pad2, 4),
        xFmt: function (t) {
          return fmt(t, 2);
        },
        yFmt: function (t) {
          return fmt(t, 0);
        },
        xLabel: 'λ'
      });
      line(g2.ctx, [[p2.x0, p2.sy(0)], [p2.x1, p2.sy(0)]], P2.border, 1, [4, 4]);
      text(g2.ctx, 'Â₀ 随 λ 的变化', p2.x0, p2.y1 - 6, P2.muted, 'left', '11px sans-serif');
      line(
        g2.ctx,
        pts.map(function (q) {
          return [p2.sx(q[0]), p2.sy(q[1])];
        }),
        P2.accent,
        2.5
      );
      var curA0 = gae(state.steps, state.gamma, state.lam)[0];
      line(g2.ctx, [[p2.sx(state.lam), p2.y0], [p2.sx(state.lam), p2.sy(curA0)]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(state.lam), p2.sy(curA0), 4.5, P2.accent, P2.surface2);
      text(g2.ctx, 'λ=' + fmt(state.lam, 2), p2.sx(state.lam), p2.sy(curA0) - 13, P2.text, 'center', '11px monospace');

      barStage.canvas.setAttribute('aria-label', '不同 λ 下各时刻的 GAE 优势柱状图');
      curveStage.canvas.setAttribute('aria-label', 'Â₀ 随 λ 变化的曲线，当前 λ=' + fmt(state.lam, 2));
    });

    render();
    lamSlider.refresh();
  }

  // ─── demo 3: why clipping is what makes K-epoch reuse safe ───────────────
  /* A deliberately tiny RL problem (one state, four actions) so the whole
     training loop runs in the browser and the *true* objective J(π) is known
     in closed form — something you never get in Humanoid-v4. Everything else
     mirrors the real loop: sample a batch with π_old, normalise advantages,
     then do K epochs of mini-batch updates on that same batch. */
  var ACTIONS = [
    { name: '大步向前', mu: 1.0 },
    { name: '小步挪动', mu: 0.8 },
    { name: '原地站立', mu: 0.5 },
    { name: '乱甩手臂', mu: 0.1 }
  ];
  var SIM = { iters: 30, batch: 32, miniBatch: 8, lr: 1.0, noise: 1.0 };

  function trueReturn(p) {
    return p.reduce(function (s, pk, k) {
      return s + pk * ACTIONS[k].mu;
    }, 0);
  }

  function frozenFraction(acts, adv, pOld, p, eps) {
    var n = 0;
    for (var i = 0; i < acts.length; i++) {
      var r = p[acts[i]] / pOld[acts[i]];
      if ((adv[i] > 0 && r > 1 + eps) || (adv[i] < 0 && r < 1 - eps)) n++;
    }
    return acts.length ? n / acts.length : 0;
  }

  /* How far the batch has drifted off-policy: mean |r − 1| over its samples. */
  function ratioDrift(acts, pOld, p) {
    var s = 0;
    for (var i = 0; i < acts.length; i++) s += Math.abs(p[acts[i]] / pOld[acts[i]] - 1);
    return acts.length ? s / acts.length : 0;
  }

  /* One full training run. `eps = Infinity` disables clipping entirely. */
  function runTraining(seed, eps, epochs) {
    var rng = mulberry32(seed);
    var logits = ACTIONS.map(function () {
      return 0;
    });
    var K = ACTIONS.length;
    var history = [];

    for (var it = 0; it < SIM.iters; it++) {
      var pOld = softmax(logits);
      var acts = [],
        rewards = [];
      for (var i = 0; i < SIM.batch; i++) {
        var u = rng(),
          acc = 0,
          a = K - 1;
        for (var k = 0; k < K; k++) {
          acc += pOld[k];
          if (u < acc) {
            a = k;
            break;
          }
        }
        acts.push(a);
        rewards.push(ACTIONS[a].mu + SIM.noise * gauss(rng));
      }
      var mean = rewards.reduce(function (s, r) {
          return s + r;
        }, 0) / SIM.batch;
      var variance = rewards.reduce(function (s, r) {
          return s + (r - mean) * (r - mean);
        }, 0) / SIM.batch;
      var std = Math.sqrt(variance) + 1e-8;
      var adv = rewards.map(function (r) {
        return (r - mean) / std;
      });

      var epochFrozen = [frozenFraction(acts, adv, pOld, pOld, isFinite(eps) ? eps : 0.2)];
      var epochDrift = [0];
      for (var e = 0; e < epochs; e++) {
        var idx = [];
        for (var q = 0; q < SIM.batch; q++) idx.push(q);
        for (var s2 = SIM.batch - 1; s2 > 0; s2--) {
          var j = Math.floor(rng() * (s2 + 1));
          var tmp = idx[s2];
          idx[s2] = idx[j];
          idx[j] = tmp;
        }
        for (var b = 0; b < SIM.batch; b += SIM.miniBatch) {
          var mb = idx.slice(b, b + SIM.miniBatch);
          var p = softmax(logits);
          var grad = new Array(K);
          for (var g0 = 0; g0 < K; g0++) grad[g0] = 0;
          for (var m = 0; m < mb.length; m++) {
            var ii = mb[m],
              ai = acts[ii],
              Ai = adv[ii];
            var ratio = p[ai] / pOld[ai];
            // min() picks the clipped constant → this sample is frozen this round
            if ((Ai > 0 && ratio > 1 + eps) || (Ai < 0 && ratio < 1 - eps)) continue;
            for (var kk = 0; kk < K; kk++) {
              grad[kk] += Ai * ratio * ((kk === ai ? 1 : 0) - p[kk]);
            }
          }
          for (var kz = 0; kz < K; kz++) logits[kz] += (SIM.lr * grad[kz]) / mb.length;
        }
        var pNow = softmax(logits);
        epochFrozen.push(frozenFraction(acts, adv, pOld, pNow, isFinite(eps) ? eps : 0.2));
        epochDrift.push(ratioDrift(acts, pOld, pNow));
      }

      history.push({ p: pOld, J: trueReturn(pOld), epochFrozen: epochFrozen, epochDrift: epochDrift });
    }
    var pFinal = softmax(logits);
    history.push({
      p: pFinal,
      J: trueReturn(pFinal),
      epochFrozen: history[history.length - 1].epochFrozen,
      epochDrift: history[history.length - 1].epochDrift
    });
    return history;
  }

  function buildEpochsDemo(host) {
    var root = card(host, {
      title: '为什么敢对同一批数据更新 K 轮：把裁剪关掉试试',
      sub:
        '一个能在浏览器里跑完的最小 RL 任务：1 个状态、4 个动作，真实平均回报分别是 ' +
        ACTIONS.map(function (a) {
          return a.name + ' ' + a.mu;
        }).join(' / ') +
        '。每轮用当前策略采 ' +
        SIM.batch +
        ' 个样本、按 batch 均值算优势，再对这同一批数据做 K 个 epoch 的更新 —— 两条曲线唯一的区别就是有没有裁剪。'
    });

    var state = { eps: 0.2, epochs: 10, seed: 3, iter: 0 };
    var runs = { clip: null, free: null, sweep: null };

    var ctrls = controlsRow(root);
    var epsSlider = slider(ctrls, {
      label: '裁剪范围 ε',
      min: 0.05,
      max: 0.6,
      step: 0.05,
      value: state.eps,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.eps = v;
        recompute();
      }
    });
    var epochSlider = slider(ctrls, {
      label: '同一批数据复用轮数 K',
      min: 1,
      max: 20,
      step: 1,
      value: state.epochs,
      format: function (v) {
        return String(v) + ' epoch';
      },
      onInput: function (v) {
        state.epochs = v;
        recompute();
      }
    });
    var iterSlider = slider(ctrls, {
      label: '右图看第几轮迭代',
      min: 0,
      max: SIM.iters,
      step: 1,
      value: state.iter,
      format: function (v) {
        return '第 ' + v + ' / ' + SIM.iters + ' 轮';
      },
      onInput: function (v) {
        state.iter = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '🎲 换一个随机种子', function () {
      state.seed = Math.floor(Math.random() * 100000);
      recompute();
    });
    button(btns, '↺ 回到默认（ε=0.2, K=10）', function () {
      epsSlider.set(0.2, true);
      epochSlider.set(10, true);
      state.eps = 0.2;
      state.epochs = 10;
      recompute();
    });

    var setLegend = legend(root, [
      { key: 'accent', text: 'PPO-Clip' },
      { key: 'bad', text: '无裁剪（其它完全相同）' },
      { key: 'good', text: '最优策略的回报 1.0' },
      { key: 'warn', text: '右图虚线：ε 本身' }
    ]);

    var grid = stageGrid(root);
    var curveStage = stage(grid, 220);
    var frozenStage = stage(grid, 220);

    var stats = statsRow(root);
    var sClipJ = stats.add('PPO-Clip 最终回报');
    var sFreeJ = stats.add('无裁剪最终回报');
    var sFreePolicy = stats.add('无裁剪最后停在');
    var sDrift = stats.add('这一轮末 平均 |r−1|（PPO / 无裁剪）');
    var sFrozen = stats.add('这一轮末 被冻结的样本（PPO）');
    var verdict = verdictBox(root);

    var sweepStats = statsRow(root);
    var sSweepClip = sweepStats.add('20 个种子：PPO-Clip 平均最终回报');
    var sSweepFree = sweepStats.add('20 个种子：无裁剪平均最终回报');
    var sSweepStuck = sweepStats.add('锁死在次优动作的次数（20 次里）');
    var sweepStage = stage(root, 92);

    note(root, [
      '**核心对照**：把 K 拖到 1（每批数据只更新一轮），有没有裁剪几乎没差别；把 K 拖回 10 以上，**无裁剪那条线会时不时一头栽下去并且再也起不来** —— 一次更新走太远，策略塌缩成「只选某个动作」，从此采不到别的动作的样本，也就永远纠不回来。这就是 PPO 敢复用同一批数据的前提。',
      '**右图是「刹车」本身**：横轴是同一批数据的第几个 epoch，纵轴是这批样本平均偏离旧策略多远（平均 |r−1|）。epoch 0 时 r 恒等于 1；之后**无裁剪那条线一路爬到 1 以上**（新策略已经和采样时的旧策略完全是两回事，重要性采样早就不成立了），**PPO-Clip 那条线则被摁在 ε 附近来回蹭** —— 这就是自动踩下的刹车。把「右图看第几轮迭代」往后拖，会看到策略收敛后连刹车都不怎么用得上了。',
      '**这不是运气**：下面一行是同样设置跑 20 个随机种子的汇总。注意它衡量的是**稳定性**，不是「PPO 一定跑得更高」—— 无裁剪偶尔也能冲到 1.0，但它有相当比例的运行会永久锁死在次优动作上。',
      '**和真实训练的差别**：这里只有 1 个状态、没有 Critic、没有 GAE（优势直接用 batch 均值当基线），是为了让整件事在浏览器里跑得完、并且能算出真实回报作对照。Humanoid-v4 上的机制完全一样，只是塌缩表现为「摔倒后再也学不回来」。'
    ]);

    function recompute() {
      runs.clip = runTraining(state.seed, state.eps, state.epochs);
      runs.free = runTraining(state.seed, Infinity, state.epochs);
      var sweep = { clip: [], free: [], stuckClip: 0, stuckFree: 0 };
      for (var s = 0; s < 20; s++) {
        var seed = 1000 + s * 7919;
        var c = runTraining(seed, state.eps, state.epochs);
        var f = runTraining(seed, Infinity, state.epochs);
        var cl = c[c.length - 1],
          fl = f[f.length - 1];
        sweep.clip.push(cl.J);
        sweep.free.push(fl.J);
        if (Math.max.apply(null, cl.p) > 0.95 && cl.J < 0.9) sweep.stuckClip++;
        if (Math.max.apply(null, fl.p) > 0.95 && fl.J < 0.9) sweep.stuckFree++;
      }
      runs.sweep = sweep;
      render();
    }

    function describePolicy(p) {
      var best = 0;
      for (var k = 1; k < p.length; k++) if (p[k] > p[best]) best = k;
      return ACTIONS[best].name + ' ' + Math.round(p[best] * 100) + '%';
    }

    var render = registerRenderer(function () {
      if (!runs.clip) return;
      var it = clamp(state.iter, 0, SIM.iters);
      var clipPoint = runs.clip[it],
        freePoint = runs.free[it];

      var clipFinal = runs.clip[SIM.iters];
      var freeFinal = runs.free[SIM.iters];
      sClipJ.set(fmt(clipFinal.J, 3), clipFinal.J >= 0.9 ? 'good' : 'warn');
      sFreeJ.set(fmt(freeFinal.J, 3), freeFinal.J >= 0.9 ? 'good' : 'bad');
      sFreePolicy.set(describePolicy(freeFinal.p), freeFinal.J >= 0.9 ? 'accent' : 'bad');

      var itData = Math.min(it, SIM.iters - 1);
      var lastDriftClip = runs.clip[itData].epochDrift[runs.clip[itData].epochDrift.length - 1];
      var lastDriftFree = runs.free[itData].epochDrift[runs.free[itData].epochDrift.length - 1];
      var lastFrozen = runs.clip[itData].epochFrozen[runs.clip[itData].epochFrozen.length - 1];
      sDrift.set(fmt(lastDriftClip, 2) + ' / ' + fmt(lastDriftFree, 2), lastDriftFree > lastDriftClip ? 'bad' : 'accent');
      sFrozen.set(Math.round(lastFrozen * 100) + '%', 'accent');
      var stuck = Math.max.apply(null, freeFinal.p) > 0.95 && freeFinal.J < 0.9;
      if (state.epochs <= 2) {
        verdict.set(
          'K = ' + state.epochs + '：每批数据几乎只更新一轮，概率比来不及跑远，裁不裁剪差别很小 —— 裁剪的价值本来就只在「复用同一批数据」时才显现。',
          'learning'
        );
      } else if (stuck) {
        verdict.set(
          '💥 这个种子下，无裁剪的那条线塌缩了：最终锁死在「' + describePolicy(freeFinal.p) + '」，真实回报只有 ' + fmt(freeFinal.J, 2) + '，而 PPO-Clip 拿到 ' + fmt(clipFinal.J, 2) + '。塌缩之后策略几乎不再采别的动作，没有数据也就没有纠错的机会。',
          'frozen'
        );
      } else {
        verdict.set(
          '这个种子下无裁剪没翻车（最终回报 ' + fmt(freeFinal.J, 2) + '）—— 它不是必然失败，而是**不稳定**。点几次「换一个随机种子」，或者看下面 20 个种子的汇总。',
          'learning'
        );
      }

      // ── learning curves ──
      var g = begin(curveStage);
      var P = g.P;
      setLegend(P);
      var p1 = plot(g, { l: 40, r: 12, t: 18, b: 32 }, [0, SIM.iters], [0, 1.12]);
      axes(g, p1, {
        xTicks: [0, 10, 20, 30],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '迭代（每轮 = 采一批数据 + K 个 epoch）'
      });
      text(g.ctx, '真实平均回报 J(π)', p1.x0, p1.y1 - 7, P.muted, 'left', '11px sans-serif');
      line(g.ctx, [[p1.x0, p1.sy(1)], [p1.x1, p1.sy(1)]], P.good, 1, [4, 4]);

      function curve(run, color) {
        var pts = [];
        for (var i = 0; i <= SIM.iters; i++) pts.push([p1.sx(i), p1.sy(run[i].J)]);
        line(g.ctx, pts, color, 2.2);
      }
      curve(runs.free, P.bad);
      curve(runs.clip, P.accent);
      line(g.ctx, [[p1.sx(it), p1.y1], [p1.sx(it), p1.y0]], P.text, 1, [3, 3]);
      dot(g.ctx, p1.sx(it), p1.sy(clipPoint.J), 4, P.accent, P.surface2);
      dot(g.ctx, p1.sx(it), p1.sy(freePoint.J), 4, P.bad, P.surface2);

      // ── how far the batch drifts off-policy across the K epochs ──
      var g2 = begin(frozenStage);
      var P2 = g2.P;
      var dc = runs.clip[itData].epochDrift;
      var df = runs.free[itData].epochDrift;
      var maxDrift = Math.max(state.eps * 2, Math.max.apply(null, dc), Math.max.apply(null, df));
      var p2 = plot(g2, { l: 44, r: 14, t: 18, b: 32 }, [0, Math.max(1, state.epochs)], [0, maxDrift * 1.1]);
      axes(g2, p2, {
        xTicks: niceTicks(0, Math.max(1, state.epochs), 4),
        yTicks: niceTicks(0, maxDrift * 1.1, 4),
        xFmt: function (t) {
          return fmt(t, 0);
        },
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '第几个 epoch（第 ' + itData + ' 轮迭代内）'
      });
      text(g2.ctx, '这批数据偏离旧策略多远：平均 |r − 1|', p2.x0, p2.y1 - 7, P2.muted, 'left', '11px sans-serif');
      line(g2.ctx, [[p2.x0, p2.sy(state.eps)], [p2.x1, p2.sy(state.eps)]], P2.warn, 1, [4, 4]);
      function driftCurve(arr, color) {
        var pts = [];
        for (var i = 0; i < arr.length; i++) pts.push([p2.sx(i), p2.sy(arr[i])]);
        line(g2.ctx, pts, color, 2.2);
        for (var j = 0; j < arr.length; j++) dot(g2.ctx, p2.sx(j), p2.sy(arr[j]), 2.5, color);
      }
      driftCurve(df, P2.bad);
      driftCurve(dc, P2.accent);

      // ── 20-seed sweep ──
      var sweep = runs.sweep;
      var avgClip = sweep.clip.reduce(function (a, b) {
        return a + b;
      }, 0) / sweep.clip.length;
      var avgFree = sweep.free.reduce(function (a, b) {
        return a + b;
      }, 0) / sweep.free.length;
      sSweepClip.set(fmt(avgClip, 3), avgClip >= avgFree ? 'good' : 'warn');
      sSweepFree.set(fmt(avgFree, 3), avgFree >= avgClip ? 'good' : 'bad');
      sSweepStuck.set('PPO ' + sweep.stuckClip + ' · 无裁剪 ' + sweep.stuckFree, sweep.stuckFree > sweep.stuckClip ? 'bad' : 'good');

      var g3 = begin(sweepStage);
      var P3 = g3.P;
      var p3 = plot(g3, { l: 74, r: 14, t: 14, b: 26 }, [0, 1.05], [0, 1]);
      text(g3.ctx, '20 个随机种子的最终回报', p3.x0, 12, P3.muted, 'left', '11px sans-serif');
      [
        { vals: sweep.clip, y: 0.38, color: P3.accent, label: 'PPO-Clip' },
        { vals: sweep.free, y: 0.78, color: P3.bad, label: '无裁剪' }
      ].forEach(function (rowSpec) {
        var y = p3.sy(rowSpec.y);
        line(g3.ctx, [[p3.sx(0), y], [p3.sx(1.05), y]], P3.grid, 1);
        text(g3.ctx, rowSpec.label, p3.x0 - 6, y, P3.muted, 'right', '11px sans-serif');
        rowSpec.vals.forEach(function (v) {
          g3.ctx.globalAlpha = 0.65;
          dot(g3.ctx, p3.sx(v), y, 4, rowSpec.color);
          g3.ctx.globalAlpha = 1;
        });
      });
      [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
        text(g3.ctx, fmt(t, 2), p3.sx(t), p3.y0 + 4, P3.muted, 'center', '10px monospace');
      });

      curveStage.canvas.setAttribute('aria-label', 'PPO-Clip 与无裁剪的学习曲线对比');
      frozenStage.canvas.setAttribute('aria-label', '同一批数据各 epoch 后概率比偏离 1 的平均幅度');
      sweepStage.canvas.setAttribute('aria-label', '20 个随机种子的最终回报分布');
    });

    recompute();
    iterSlider.refresh();
  }

  // ─── bootstrap ───────────────────────────────────────────────────────────
  K.mount({
    'ppo-clip': buildClipDemo,
    'ppo-gae': buildGaeDemo,
    'ppo-epochs': buildEpochsDemo
  });
})();
