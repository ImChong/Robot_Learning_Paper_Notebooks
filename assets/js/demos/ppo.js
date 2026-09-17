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
 *   ppo-explainer — five-scene narrated animation of the whole algorithm
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

  // ─── demo 4: the five-scene explainer animation ──────────────────────────
  /* A narrated storyboard of the whole algorithm — step size → probability
     ratio → GAE → clipping → the four-step loop. Every number on screen is one
     the note derives elsewhere (the 5-step GAE walk-through, cases A and B),
     so the animation stays a summary of this note rather than a second source.

     The player (scene chips, clock, cue track, autoplay-on-scroll) is the
     shared K.explainer in kit.js; only the storyboard itself lives here. */

  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    paint = K.paint,
    seg = K.seg,
    ease = K.ease,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg;

  function minus(s) {
    return String(s).replace(/-/g, '\u2212');
  }

  function signed(v, d) {
    return (v >= 0 ? '+' : '\u2212') + Math.abs(v).toFixed(d);
  }

  /* Shared r-axis mapping: r ∈ [0.4, 1.8] → x ∈ [120, 720] in scene space. */
  function ratioX(r) {
    return 120 + (r - 0.4) * (600 / 1.4);
  }

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_MUTED = X.muted,
    C_GRID = X.grid,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2;

  /* ── scene 1: how big a step ── */
  function hillY(x) {
    var u = (x - 430) / 170;
    var y = 300 - 150 * Math.exp(-u * u * 0.9);
    if (x > 585) y += (x - 585) * 0.95;
    return Math.min(y, 372);
  }

  function hillPath(x0, x1) {
    var d = '';
    for (var x = x0; x <= x1; x += 5) d += (d ? ' L ' : 'M ') + x.toFixed(1) + ' ' + hillY(x).toFixed(1);
    return d + ' L ' + x1.toFixed(1) + ' ' + hillY(x1).toFixed(1);
  }

  function buildSceneStep() {
    var s = sceneSvg('策略更新步长：一步迈太大冲出可信区并崩溃，迈太小几乎不动，PPO 让护栏跟着旧策略走、小步稳升');
    var band = svgEl('rect', { x: 200, y: 70, width: 120, height: 300, rx: 3, class: 'demo-x-band' });
    var hill = paint(svgEl('path', { d: hillPath(60, 745), fill: 'none', 'stroke-width': 2.5 }), null, C_BORDER);
    var trail = paint(svgEl('path', { fill: 'none', 'stroke-width': 3.5, 'stroke-linecap': 'round' }), null, C_ACCENT);
    var ghosts = svgEl('g', {});
    var ball = paint(svgEl('circle', { cx: 260, cy: 280, r: 9 }), C_ACCENT);
    var bandLab = svgMath(260, 388, '\\text{可信区：只有 } \\theta_{old} \\text{ 附近才估得准}',
      { size: 12, anchor: 'middle', cls: 'demo-x-acc', w: 300 });
    var tag = svgText(740, 44, '', 'demo-x-mono', 15, 'end');
    tag.setAttribute('font-weight', '700');
    var sub = svgText(740, 64, '', 'demo-x-ink2', 12.5, 'end');
    [band, hill, trail, ghosts, ball,
      svgMath(60, 44, 'J(\\theta)', { size: 13, cls: 'demo-x-mut', w: 60 }),
      svgText(106, 44, '策略的真实表现', 'demo-x-mut', 13),
      bandLab, tag, sub].forEach(function (n) { s.appendChild(n); });

    function draw(t) {
      var x = 260, x0 = 260, center = 260, label = '', hint = '', tone = C_ACCENT, cls = 'demo-x-acc', marks = [];
      if (t < 3.9) {
        x = 260 + 430 * ease(seg(t, 0.8, 3.0));
        label = t > 0.9 ? '① 改太多' : '';
        hint = '一步冲出可信区，站立技能直接崩';
        /* Stay neutral until the caption names the failure, so the resting
           first frame doesn't already look like the bad case. */
        tone = label ? C_BAD : C_ACCENT;
        cls = 'demo-x-bad';
      } else if (t < 6.7) {
        x = 260 + 26 * ease(seg(t, 4.2, 5.6));
        label = '② 改太少';
        hint = '安全，但几乎原地踏步';
        tone = C_MUTED;
        cls = 'demo-x-mut';
      } else {
        label = '③ PPO';
        hint = '护栏跟着 θ_old 走，小步但一直在爬';
        if (t < 8.4) {
          x = 260 + 70 * ease(seg(t, 6.9, 8.1));
        } else if (t < 10.0) {
          x0 = center = 330;
          x = 330 + 62 * ease(seg(t, 8.5, 9.7));
          marks = [260];
        } else {
          x0 = center = 392;
          x = 392 + 38 * ease(seg(t, 10.1, 11.3));
          marks = [260, 330];
        }
      }
      ball.setAttribute('cx', x.toFixed(1));
      ball.setAttribute('cy', (hillY(x) - 9).toFixed(1));
      paint(ball, tone);
      trail.setAttribute('d', hillPath(Math.min(x0, x), Math.max(x0 + 1, x)));
      paint(trail, null, tone);
      band.setAttribute('x', center - 60);
      bandLab.setX(center);
      ghosts.textContent = '';
      marks.forEach(function (gx) {
        ghosts.appendChild(paint(svgEl('circle', { cx: gx, cy: (hillY(gx) - 9).toFixed(1), r: 6, fill: 'none', 'stroke-width': 1.5 }), null, C_MUTED));
      });
      tag.textContent = label;
      tag.setAttribute('class', 'demo-x-mono ' + cls);
      sub.textContent = hint;
      setOpacity(tag, label ? 1 : 0);
      setOpacity(sub, label ? 1 : 0);
    }

    return { el: s, draw: draw };
  }

  /* ── scene 2: the probability ratio ── */
  function buildSceneRatio() {
    var s = sceneSvg('概率比 r = 0.048 / 0.032 = 1.5，已经冲出 0.8 到 1.2 的安全带');
    var bar = paint(svgEl('rect', { x: 200, y: 172, width: 192, height: 26, rx: 3 }), C_ACCENT);
    var val = svgText(404, 190, '0.032', 'demo-x-mono demo-x-acc', 13);
    var ratio = svgText(600, 172, '1.00', 'demo-x-mono demo-x-acc', 46, 'middle');
    ratio.setAttribute('font-weight', '700');
    var markLine = paint(svgEl('line', { x1: 377, y1: 296, x2: 377, y2: 340, 'stroke-width': 2 }), null, C_ACCENT);
    var markDot = paint(svgEl('circle', { cx: 377, cy: 340, r: 5.5 }), C_ACCENT);
    var note2 = svgMath(400, 398, 'r = 1.5 \\text{ 已经冲出安全带 —— 下一幕看裁剪怎么拦它}',
      { size: 13.5, anchor: 'middle', cls: 'demo-x-bad', w: 460 });

    [svgMath(60, 48, '\\text{同一个动作 } a_{15} \\text{「抬腿迈步」，在旧策略和新策略下的概率}',
      { size: 13.5, cls: 'demo-x-ink2', w: 540 }),
      svgMath(60, 126, '\\pi_{old}(a \\mid s)', { size: 13, cls: 'demo-x-ink2', w: 130 }),
      paint(svgEl('rect', { x: 200, y: 108, width: 192, height: 26, rx: 3, opacity: 0.55 }), C_MUTED),
      svgText(404, 126, '0.032', 'demo-x-mono demo-x-mut', 13),
      svgMath(60, 190, '\\pi_\\theta(a \\mid s)', { size: 13, cls: 'demo-x-ink2', w: 130 }),
      bar, val,
      svgMath(600, 112, 'r = 0.048 / 0.032', { size: 12.5, anchor: 'middle', cls: 'demo-x-mut', w: 200 }),
      ratio,
      svgMath(60, 248, 'r = 1 \\text{ 新旧一样}', { size: 12.5, cls: 'demo-x-mut', w: 170 }),
      svgMath(240, 248, 'r > 1 \\text{ 更爱选这个动作}', { size: 12.5, cls: 'demo-x-mut', w: 220 }),
      svgMath(470, 248, 'r < 1 \\text{ 更少选}', { size: 12.5, cls: 'demo-x-mut', w: 150 }),
      svgEl('rect', { x: 291, y: 296, width: 172, height: 44, rx: 3, class: 'demo-x-band' }),
      paint(svgEl('line', { x1: 120, y1: 340, x2: 720, y2: 340, 'stroke-width': 1 }), null, 'var(--text-secondary)'),
      svgMath(377, 288, '\\text{安全带 } \\varepsilon = 0.2 \\to [0.8,\\ 1.2]',
        { size: 12, anchor: 'middle', cls: 'demo-x-acc', w: 260 }),
      markLine, markDot, note2].forEach(function (n) { s.appendChild(n); });

    [[120, '0.4'], [291, '0.8'], [377, '1.0'], [463, '1.2'], [591, '1.5'], [720, '1.8']].forEach(function (tick) {
      s.appendChild(svgText(tick[0], 360, tick[1], 'demo-x-mono demo-x-mut', 11.5, 'middle'));
    });
    setOpacity(note2, 0);

    function draw(t) {
      var p = 0.032 + 0.016 * ease(seg(t, 2.0, 5.0));
      var r = p / 0.032;
      var hot = r > 1.2;
      var tone = hot ? C_BAD : C_ACCENT;
      bar.setAttribute('width', (p * 6000).toFixed(1));
      paint(bar, tone);
      val.textContent = p.toFixed(3);
      val.setAttribute('x', (200 + p * 6000 + 12).toFixed(1));
      val.setAttribute('class', 'demo-x-mono ' + (hot ? 'demo-x-bad' : 'demo-x-acc'));
      ratio.textContent = r.toFixed(2);
      ratio.setAttribute('class', 'demo-x-mono ' + (hot ? 'demo-x-bad' : 'demo-x-acc'));
      var x = ratioX(r).toFixed(1);
      markLine.setAttribute('x1', x);
      markLine.setAttribute('x2', x);
      markDot.setAttribute('cx', x);
      paint(markDot, tone);
      paint(markLine, null, tone);
      setOpacity(note2, seg(t, 8.0, 8.8));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 3: GAE, with the note's own five-step rollout ── */
  var GAE_X = [140, 270, 400, 530, 660];
  var GAE_CASE = ['正常走', '正常走', '正常走', '大晃', '摔倒 done'];
  var GAE_R = ['+1', '+1', '+1', '−2', '−10'];
  var GAE_V = [50, 50, 50, 40, 20];
  var GAE_DELTA = [0.5, 0.5, -9.4, -22.2, -30.0];
  var GAE_ADV = [-49.3, -52.9, -56.8, -50.4, -30.0];
  var GAE_CALC = [
    '\\hat{A}_0 = +0.5 + 0.9405 \\times (-52.9) = -49.3',
    '\\hat{A}_1 = +0.5 + 0.9405 \\times (-56.8) = -52.9',
    '\\hat{A}_2 = -9.4 + 0.9405 \\times (-50.4) = -56.8',
    '\\hat{A}_3 = -22.2 + 0.9405 \\times (-30.0) = -50.4',
    '\\hat{A}_4 = \\delta_4 = -30.0 \\text{（done，没有下一步）}'
  ];

  function buildSceneGae() {
    var s = sceneSvg('五步 rollout 的 GAE 计算：先算每步 TD 误差，再逆序按 0.9405 递推优势，末尾摔倒把 t=0 的优势拉到 −49.3');
    var arrow = K.arrowMarker(s, 'ppo-x-arrow', C_ACCENT);

    var heads = [], rows = [], deltas = [], advs = [];
    GAE_X.forEach(function (x, i) {
      var head = svgEl('g', {});
      head.appendChild(svgText(x, 78, 't=' + i, 'demo-x-mono demo-x-ink2', 13, 'middle'));
      head.appendChild(svgText(x, 96, GAE_CASE[i], i === 4 ? 'demo-x-bad' : 'demo-x-mut', 11.5, 'middle'));
      heads.push(head);
      var row = svgEl('g', {});
      row.appendChild(svgText(x, 118, GAE_R[i], 'demo-x-mono demo-x-ink2', 12.5, 'middle'));
      row.appendChild(svgText(x, 140, String(GAE_V[i]), 'demo-x-mono demo-x-ink2', 12.5, 'middle'));
      rows.push(row);

      var d = GAE_DELTA[i], hd = Math.max(Math.abs(d) * 1.35, 2);
      var gd = svgEl('g', {});
      gd.appendChild(paint(svgEl('rect', {
        x: x - 23, y: d >= 0 ? 186 - hd : 186, width: 46, height: hd, rx: 2, opacity: 0.85
      }), d >= 0 ? C_GOOD : C_BAD));
      gd.appendChild(svgText(x, 180, signed(d, 1), 'demo-x-mono ' + (d >= 0 ? 'demo-x-good' : 'demo-x-bad'), 12, 'middle'));
      deltas.push(gd);

      var a = GAE_ADV[i], ha = Math.max(Math.abs(a) * 0.78, 2);
      var ga = svgEl('g', {});
      ga.appendChild(paint(svgEl('rect', {
        x: x - 23, y: a >= 0 ? 282 - ha : 282, width: 46, height: ha, rx: 2, opacity: 0.85
      }), a >= 0 ? C_GOOD : C_BAD));
      ga.appendChild(svgText(x, 274, signed(a, 1), 'demo-x-mono ' + (a >= 0 ? 'demo-x-good' : 'demo-x-bad'), 12.5, 'middle'));
      advs.push(ga);
    });

    var zero1 = paint(svgEl('line', { x1: 90, y1: 186, x2: 730, y2: 186, 'stroke-width': 1 }), null, 'var(--text-secondary)');
    var zero2 = paint(svgEl('line', { x1: 90, y1: 282, x2: 730, y2: 282, 'stroke-width': 1 }), null, 'var(--text-secondary)');
    var dLab = svgMath(62, 162, '\\delta_t = r + \\gamma V(s\') - V(s)', { size: 12, cls: 'demo-x-mut', w: 200 });
    var aLab = svgMath(62, 258, '\\hat{A}_t = \\delta_t + 0.9405\\,\\hat{A}_{t+1}', { size: 12, cls: 'demo-x-mut', w: 200 });
    var arrow = paint(svgEl('path', {
      d: 'M 660 242 L 146 242', fill: 'none', 'stroke-width': 1.6,
      'stroke-dasharray': '5 4', 'marker-end': arrow
    }), null, C_ACCENT);
    var arrowLab = svgMath(400, 234, '\\text{逆序回传，每退一步 } \\times 0.9405',
      { size: 11.5, anchor: 'middle', cls: 'demo-x-acc', w: 260 });
    var calc = svgMath(400, 356, '', { size: 14.5, anchor: 'middle', cls: 'demo-x-acc', w: 420 });
    var punch = svgMath(400, 392, '\\delta_0 \\text{ 只看一步是 } +0.5\\text{；} \\hat{A}_0 \\text{ 却是 } -49.3 \\text{ —— 4 步后那一摔被传回了起点}',
      { size: 13.5, anchor: 'middle', cls: 'demo-x-ink2', w: 640 });

    s.appendChild(svgMath(60, 46, '\\text{一段 rollout：走 3 步 → 大晃 → 摔倒（done）} \\quad \\gamma = 0.99 \\quad \\lambda = 0.95',
      { size: 13.5, cls: 'demo-x-ink2', w: 580 }));
    heads.concat(rows).forEach(function (n) { s.appendChild(n); });
    s.appendChild(svgMath(62, 118, 'r_t', { size: 12, cls: 'demo-x-mut', w: 40 }));
    s.appendChild(svgMath(62, 140, 'V(s_t)', { size: 12, cls: 'demo-x-mut', w: 60 }));
    [dLab, zero1].concat(deltas).forEach(function (n) { s.appendChild(n); });
    [arrow, arrowLab, aLab, zero2].concat(advs).forEach(function (n) { s.appendChild(n); });
    [calc, punch].forEach(function (n) { s.appendChild(n); });

    function draw(t) {
      var i;
      for (i = 0; i < 5; i++) {
        var f = seg(t, 0.3 + i * 0.34, 0.9 + i * 0.34);
        setOpacity(heads[i], f);
        setOpacity(rows[i], f);
        setOpacity(deltas[i], seg(t, 2.8 + i * 0.6, 3.3 + i * 0.6));
      }
      setOpacity(dLab, seg(t, 2.4, 2.9));
      setOpacity(aLab, seg(t, 6.7, 7.2));
      setOpacity(arrow, seg(t, 6.9, 7.6));
      setOpacity(arrowLab, seg(t, 6.9, 7.6));
      var step = -1;
      for (i = 0; i < 5; i++) {
        var start = 7.4 + i * 1.3;
        setOpacity(advs[4 - i], seg(t, start, start + 0.45));
        if (t >= start) step = i;
      }
      if (step >= 0) {
        calc.setTex(GAE_CALC[4 - step]);
        setOpacity(calc, seg(t, 7.4 + step * 1.3, 7.7 + step * 1.3));
      } else {
        setOpacity(calc, 0);
      }
      setOpacity(punch, seg(t, 14.0, 14.7));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 4: the clipped objective, cases A and B ── */
  function buildSceneClip() {
    var s = sceneSvg('PPO 裁剪目标：三条线分别是未裁剪项、裁剪项和取 min 的结果；r 冲出 0.8 到 1.2 后 min 选中裁剪项，曲线变平，梯度为零');
    function vy(v) { return 230 - v * 22; }

    var unclip = paint(svgEl('polyline', { fill: 'none', 'stroke-width': 2, 'stroke-dasharray': '6 4' }), null, C_MUTED);
    var clipLn = paint(svgEl('polyline', { fill: 'none', 'stroke-width': 2 }), null, C_WARN);
    var minLn = paint(svgEl('polyline', { fill: 'none', 'stroke-width': 3.5, 'stroke-linejoin': 'round' }), null, C_ACCENT);
    var guide = paint(svgEl('line', { x1: 377, y1: 230, x2: 377, y2: 230, 'stroke-width': 1 }), null, 'var(--text-secondary)');
    var dotNow = paint(svgEl('circle', { cx: 377, cy: 230, r: 6.5 }), C_ACCENT);
    /* Each readout is a static LaTeX label plus the number next to it: the
       number changes every frame, and re-typesetting a formula 60 times a
       second would be pure waste. */
    var readA = svgMath(60, 68, '\\hat{A} =', { size: 13.5, cls: 'demo-x-good', w: 50 });
    var readAV = svgText(96, 68, '+2.3', 'demo-x-mono demo-x-good', 13.5);
    readAV.setAttribute('font-weight', '700');
    var readR = svgMath(180, 68, 'r =', { size: 13, cls: 'demo-x-ink2', w: 40 });
    var readRV = svgText(206, 68, '1.00', 'demo-x-mono demo-x-ink2', 13);
    var readU = svgMath(272, 68, 'r\\hat{A} =', { size: 13, cls: 'demo-x-mut', w: 60 });
    var readUV = svgText(316, 68, '2.30', 'demo-x-mono demo-x-mut', 13);
    var readC = svgMath(390, 68, '\\mathrm{clip}(r)\\,\\hat{A} =', { size: 13, cls: 'demo-x-warn', w: 120 });
    var readCV = svgText(486, 68, '2.30', 'demo-x-mono demo-x-warn', 13);
    var readM = svgMath(556, 68, '\\min =', { size: 13.5, cls: 'demo-x-acc', w: 60 });
    var readMV = svgText(604, 68, '2.30', 'demo-x-mono demo-x-acc', 13.5);
    readMV.setAttribute('font-weight', '700');
    var freeze = svgEl('g', {});
    freeze.appendChild(svgEl('rect', { x: 684, y: 50, width: 106, height: 24, rx: 4, class: 'demo-x-freeze-box' }));
    var freezeTx = svgText(737, 67, '冻结 梯度=0', 'demo-x-mono demo-x-bad', 12, 'middle');
    freezeTx.setAttribute('font-weight', '700');
    freeze.appendChild(freezeTx);
    setOpacity(freeze, 0);

    s.appendChild(svgText(60, 40, '横轴：概率比 r　纵轴：这条样本贡献的目标值', 'demo-x-ink2', 13));
    s.appendChild(svgMath(740, 40, 'L = \\min\\big(r\\hat{A},\\ \\mathrm{clip}(r, 0.8, 1.2)\\,\\hat{A}\\big)',
      { size: 12.5, anchor: 'end', cls: 'demo-x-mut', w: 340 }));
    s.appendChild(svgEl('rect', { x: 291, y: 76, width: 172, height: 286, class: 'demo-x-band-fill' }));
    [291, 463].forEach(function (x) {
      s.appendChild(paint(svgEl('line', { x1: x, y1: 76, x2: x, y2: 362, 'stroke-width': 1, 'stroke-dasharray': '4 4' }), null, C_ACCENT));
    });
    s.appendChild(paint(svgEl('line', { x1: 120, y1: 230, x2: 730, y2: 230, 'stroke-width': 1 }), null, 'var(--text-secondary)'));
    s.appendChild(svgText(110, 234, '0', 'demo-x-mono demo-x-mut', 11.5, 'end'));
    [[120, '0.4'], [291, '0.8'], [377, '1.0'], [463, '1.2'], [591, '1.5'], [720, '1.8']].forEach(function (tick) {
      s.appendChild(svgText(tick[0], 380, tick[1], 'demo-x-mono demo-x-mut', 11.5, 'middle'));
    });
    s.appendChild(svgMath(738, 234, 'r', { size: 11.5, cls: 'demo-x-mut', w: 30 }));
    [unclip, clipLn, minLn, guide, dotNow,
      readA, readAV, readR, readRV, readU, readUV, readC, readCV, readM, readMV,
      freeze].forEach(function (n) { s.appendChild(n); });

    var legendSpecs = [[470, 500, C_MUTED, '6 4', 2, 506, 'r\\hat{A}', 'demo-x-mut'],
      [552, 582, C_WARN, null, 2, 588, '\\mathrm{clip}(r)\\,\\hat{A}', 'demo-x-warn'],
      [662, 692, C_ACCENT, null, 3.5, 698, '\\min', 'demo-x-acc']];
    legendSpecs.forEach(function (spec) {
      var ln = svgEl('line', { x1: spec[0], y1: 400, x2: spec[1], y2: 400, 'stroke-width': spec[4] });
      if (spec[3]) ln.setAttribute('stroke-dasharray', spec[3]);
      s.appendChild(paint(ln, null, spec[2]));
      s.appendChild(svgMath(spec[5], 404, spec[6], { size: 11.5, cls: spec[7], w: 100 }));
    });

    function draw(t) {
      var adv = t < 10.6 ? 2.3 : (t < 11.8 ? 2.3 - 5.4 * ease(seg(t, 10.6, 11.8)) : -3.1);
      var r;
      if (t < 2.2) r = 1.0;
      else if (t < 5.2) r = 1.0 + 0.5 * ease(seg(t, 2.2, 5.2));
      else if (t < 10.6) r = 1.5;
      else if (t < 11.8) r = 1.5 - 0.5 * ease(seg(t, 10.6, 11.8));
      else if (t < 12.6) r = 1.0;
      else if (t < 15.6) r = 1.0 - 0.4 * ease(seg(t, 12.6, 15.6));
      else r = 0.6;

      var pu = [], pc = [], pm = [], q, x;
      for (q = 0.4; q <= 1.801; q += 0.02) {
        var u = q * adv, c = clamp(q, 0.8, 1.2) * adv;
        x = ratioX(q).toFixed(1);
        pu.push(x + ',' + vy(u).toFixed(1));
        pc.push(x + ',' + vy(c).toFixed(1));
        pm.push(x + ',' + vy(Math.min(u, c)).toFixed(1));
      }
      unclip.setAttribute('points', pu.join(' '));
      clipLn.setAttribute('points', pc.join(' '));
      minLn.setAttribute('points', pm.join(' '));

      var uv = r * adv, cv = clamp(r, 0.8, 1.2) * adv, mv = Math.min(uv, cv);
      var cx = ratioX(r).toFixed(1), cy = vy(mv).toFixed(1);
      guide.setAttribute('x1', cx);
      guide.setAttribute('x2', cx);
      guide.setAttribute('y2', cy);
      dotNow.setAttribute('cx', cx);
      dotNow.setAttribute('cy', cy);

      var good = adv >= 0;
      var frozen = (good && r > 1.2) || (!good && r < 0.8);
      readA.setCls(good ? 'demo-x-good' : 'demo-x-bad');
      readAV.textContent = signed(adv, 1);
      readAV.setAttribute('class', 'demo-x-mono ' + (good ? 'demo-x-good' : 'demo-x-bad'));
      readRV.textContent = r.toFixed(2);
      readUV.textContent = minus(uv.toFixed(2));
      readCV.textContent = minus(cv.toFixed(2));
      readMV.textContent = minus(mv.toFixed(2));
      setOpacity(freeze, frozen ? 1 : 0);
      paint(dotNow, frozen ? C_BAD : C_ACCENT);
    }

    return { el: s, draw: draw };
  }

  /* ── scene 5: the four-step loop ── */
  var LOOP_NODES = [
    { x: 400, y: 70, w: 268, title: '① 收集经验', sub: 'N 个环境 × T 步 → 2048 条样本' },
    { x: 625, y: 210, w: 236, title: '② 计算优势', subTex: '\\text{GAE 给每条样本算 } \\hat{A}_t' },
    { x: 400, y: 350, w: 306, title: '③ 多轮更新', sub: '同一批数据 10 个 epoch，clip 当刹车' },
    { x: 175, y: 210, w: 226, title: '④ 同步旧策略', subTex: '\\pi_{old} \\leftarrow \\pi_\\theta \\text{，回到 ①}' }
  ];
  var LOOP_STEPS = [
    { hold: 0, d: 1.3 }, { move: 0, d: 1.0 }, { hold: 1, d: 1.2 }, { move: 1, d: 1.0 },
    { hold: 2, d: 3.0 }, { move: 2, d: 1.0 }, { hold: 3, d: 1.2 }, { move: 3, d: 1.0 }
  ];

  function buildSceneLoop() {
    var s = sceneSvg('PPO 四步训练循环：收集经验、用 GAE 算优势、同一批数据跑十个 epoch 更新、同步旧策略，然后回到第一步');
    function miniX(r) { return 312 + (r - 0.7) * (176 / 0.7); }

    s.appendChild(paint(svgEl('ellipse', { cx: 400, cy: 210, rx: 225, ry: 140, fill: 'none', 'stroke-width': 2 }), null, C_GRID));
    [-45, 45, 135, 225].forEach(function (deg) {
      var a = deg * Math.PI / 180;
      var px = 400 + 225 * Math.cos(a), py = 210 + 140 * Math.sin(a);
      var rot = Math.atan2(140 * Math.cos(a), -225 * Math.sin(a)) * 180 / Math.PI;
      s.appendChild(paint(svgEl('path', {
        d: 'M -7 -5 L 7 0 L -7 5 Z',
        transform: 'translate(' + px.toFixed(1) + ',' + py.toFixed(1) + ') rotate(' + rot.toFixed(1) + ')'
      }), C_GRID));
    });

    var boxes = LOOP_NODES.map(function (n) {
      var g = svgEl('g', {});
      var rect = paint(svgEl('rect', { x: n.x - n.w / 2, y: n.y - 28, width: n.w, height: 56, rx: 8, 'stroke-width': 1.5 }), C_SURFACE, C_BORDER);
      g.appendChild(rect);
      g.appendChild(svgText(n.x, n.y - 4, n.title, 'demo-x-mono', 13.5, 'middle'));
      g.appendChild(n.subTex
        ? svgMath(n.x, n.y + 16, n.subTex, { size: 11.5, anchor: 'middle', cls: 'demo-x-mut', w: n.w })
        : svgText(n.x, n.y + 16, n.sub, 'demo-x-mut', 11.5, 'middle'));
      s.appendChild(g);
      return rect;
    });

    var mid = svgEl('g', {});
    var epochTx = svgText(400, 180, 'epoch 1 / 10', 'demo-x-mono demo-x-ink2', 13, 'middle');
    var track = paint(svgEl('rect', { x: 312, y: 196, width: 176, height: 14, rx: 3, 'stroke-width': 1 }), C_SURFACE2, C_BORDER);
    var bandRect = svgEl('rect', { x: miniX(0.8), y: 196, width: miniX(1.2) - miniX(0.8), height: 14, class: 'demo-x-band-fill' });
    var mark = paint(svgEl('line', { x1: miniX(1.0), y1: 192, x2: miniX(1.0), y2: 214, 'stroke-width': 2.5 }), null, C_ACCENT);
    var brake = svgText(400, 248, 'clip 刹车 → 本轮冻结', 'demo-x-mono demo-x-bad', 12, 'middle');
    brake.setAttribute('font-weight', '700');
    [epochTx, track, bandRect, mark,
      svgText(miniX(0.8), 230, '0.8', 'demo-x-mono demo-x-mut', 10.5, 'middle'),
      svgText(miniX(1.2), 230, '1.2', 'demo-x-mono demo-x-mut', 10.5, 'middle'),
      brake].forEach(function (n) { mid.appendChild(n); });
    setOpacity(mid, 0);
    s.appendChild(mid);

    var token = paint(svgEl('circle', { cx: 400, cy: 70, r: 7 }), C_ACCENT);
    s.appendChild(token);

    function draw(t) {
      var acc = 0, i, cur = null, local = 1;
      for (i = 0; i < LOOP_STEPS.length; i++) {
        if (t < acc + LOOP_STEPS[i].d) {
          cur = LOOP_STEPS[i];
          local = (t - acc) / LOOP_STEPS[i].d;
          break;
        }
        acc += LOOP_STEPS[i].d;
      }
      if (!cur) cur = LOOP_STEPS[0];
      var angle, active = -1;
      if (cur.hold !== undefined) {
        angle = -90 + cur.hold * 90;
        active = cur.hold;
      } else {
        angle = -90 + cur.move * 90 + 90 * ease(local);
      }
      var rad = angle * Math.PI / 180;
      token.setAttribute('cx', (400 + 225 * Math.cos(rad)).toFixed(1));
      token.setAttribute('cy', (210 + 140 * Math.sin(rad)).toFixed(1));
      boxes.forEach(function (rect, idx) {
        var on = idx === active;
        paint(rect, on ? C_SURFACE2 : C_SURFACE, on ? C_ACCENT : C_BORDER);
        rect.setAttribute('stroke-width', on ? 2.5 : 1.5);
      });
      setOpacity(mid, active === 2 ? 1 : 0);
      if (active === 2) {
        epochTx.textContent = 'epoch ' + Math.min(10, 1 + Math.floor(10 * local)) + ' / 10';
        var r = 1.0 + 0.3 * local, hot = r > 1.2, x = miniX(Math.min(r, 1.2)).toFixed(1);
        mark.setAttribute('x1', x);
        mark.setAttribute('x2', x);
        paint(mark, null, hot ? C_BAD : C_ACCENT);
        setOpacity(brake, hot ? 1 : 0);
      }
    }

    return { el: s, draw: draw };
  }

  /* ── the player shell ── */
  var EXPLAINER_SCENES = [
    {
      title: '步子迈多大', dur: 12, build: buildSceneStep,
      cues: [
        { at: 0, s: '问题不是「往哪改」，而是**一次改多少**。' },
        { at: 3.0, s: '改太多：越出可信区，刚学会的站立一次更新就崩。' },
        { at: 4.6, s: '改太少：安全，但训练几天也走不出去。' },
        { at: 7.2, s: 'PPO 的答案是给每次更新**一条护栏**，护栏跟着旧策略走。' }
      ]
    },
    {
      title: '第一把尺子：概率比 $r$', dur: 11, build: buildSceneRatio,
      cues: [
        { at: 0, s: '数据是旧策略采的，要评价新策略，先要一把尺子。' },
        { at: 2.2, s: '概率比 **$r = \\pi_\\theta(a \\mid s) / \\pi_{old}(a \\mid s)$**：新策略有多偏爱这个动作。' },
        { at: 5.4, s: '这条样本 **$r = 0.048 / 0.032 = 1.5$**，新策略爱过了头。' },
        { at: 8.2, s: '$\\varepsilon = 0.2$ 的安全带是 **$[0.8,\\ 1.2]$**，1.5 已经冲出去了。' }
      ]
    },
    {
      title: '第二把尺子：优势 $\\hat{A}$ 与 GAE', dur: 20, build: buildSceneGae,
      cues: [
        { at: 0, s: '光看回报没用，要问：这个动作比该状态的**平均水平**好多少。' },
        { at: 2.6, s: '先算一步 TD 误差 **$\\delta_t = r + \\gamma V(s\') - V(s)$**，done 那步不 bootstrap。' },
        { at: 7.0, s: '再**逆序**递推 **$\\hat{A}_t = \\delta_t + \\gamma\\lambda\\,\\hat{A}_{t+1}$**，$\\gamma\\lambda = 0.99 \\times 0.95 = 0.9405$。' },
        { at: 14.0, s: '$\\delta_0$ 只看一步是 +0.5；$\\hat{A}_0$ 却是 −49.3 —— 摔倒的账被记回了起点。' }
      ]
    },
    {
      title: '核心机制：裁剪与冻结', dur: 22, build: buildSceneClip,
      cues: [
        { at: 0, s: '有了 $r$ 和 $\\hat{A}$，PPO 的目标函数只做一件事：**取 $\\min$**。' },
        { at: 2.0, s: '好动作 $\\hat{A} = +2.3$，新策略越来越爱它，$r$ 一路冲到 1.5。' },
        { at: 5.4, s: '$\\min$ 选中裁剪分 **$1.2 \\times 2.3 = 2.76$**；1.2 是常数 → 梯度为 0，本轮**冻结**。' },
        { at: 11.6, s: '换成坏动作 $\\hat{A} = -3.1$，新策略把它压到 $r = 0.6$。' },
        { at: 15.4, s: '$\\min$ 选中 **$-2.48$**，$\\mathrm{clip}$ 顶在 0.8 → 同样冻结：已经够讨厌了，别再狂砍。' },
        { at: 18.6, s: '冻结只挡「继续变本加厉」的那一侧；策略跑偏时的纠错梯度反而最大。' }
      ]
    },
    {
      title: '合起来：四步循环', dur: 11.5, build: buildSceneLoop,
      cues: [
        { at: 0, s: '把两把尺子放回训练循环。' },
        { at: 1.4, s: '① 收集：N 个环境各跑 T 步，凑够一批 2048 条样本。' },
        { at: 3.3, s: '② 用 GAE 给每条样本算出 $\\hat{A}_t$。' },
        { at: 5.4, s: '③ 同一批数据跑 10 个 epoch —— $r$ 越偏离 1，裁剪越常生效，自带刹车。' },
        { at: 9.0, s: '④ $\\pi_{old} \\leftarrow \\pi_\\theta$，回到 ①。简单、稳、好调，所以人形机器人训练几乎都用它。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '五幕动画：PPO 全流程速览',
      sub: '约 76 秒自动播放。空格播放/暂停，← → 换幕；画面里的数字与本文各节算例一致。',
      ariaLabel: 'PPO 五幕讲解动画',
      notes: [
        '取数依据：「第 2 步：计算优势（GAE）」的 5 步算例，与「第 3 步：PPO 裁剪更新」的案例 A（$\\hat{A} = +2.3$, $r = 1.5$）、案例 B（$\\hat{A} = -3.1$, $r = 0.6$）。'
      ],
      scenes: EXPLAINER_SCENES
    });
  }

  // ─── bootstrap ───────────────────────────────────────────────────────────
  K.mount({
    'ppo-clip': buildClipDemo,
    'ppo-gae': buildGaeDemo,
    'ppo-epochs': buildEpochsDemo,
    'ppo-explainer': buildExplainerDemo
  });
})();
