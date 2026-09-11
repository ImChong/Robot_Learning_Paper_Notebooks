/* Interactive AMP demos for
 * papers/01_Foundational_RL/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["amp"]`, after assets/js/demos/kit.js. The note may only ship empty
 * `<div class="paper-demo" data-demo="...">` placeholders, because
 * scripts/sanitize_paper_html.py strips <script>/<canvas>/<input> from
 * #paper-body before publish.
 *
 * Demos:
 *   amp-reward — 判别器打分怎么变成风格奖励：LSGAN 形式 vs log 形式
 *   amp-disc   — 判别器 loss 实验台（正文那 4 个样本的数值例子）
 *   amp-style  — 风格 × 任务：同一个任务奖励，换数据集就换风格
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
    gauss = K.gauss;

  /* 论文实际用的 LSGAN 风格奖励：真样本目标 +1、假样本目标 −1。
     D ≤ −1 或 D ≥ 3 时被 max(0, ·) 压成 0。 */
  function styleReward(d) {
    return Math.max(0, 1 - 0.25 * (d - 1) * (d - 1));
  }

  // ─── demo 1: discriminator score → style reward ──────────────────────────
  function buildRewardDemo(host) {
    var root = card(host, {
      title: '判别器的打分是怎么变成奖励的：LSGAN 形式 vs log 形式',
      sub:
        '论文正文先用 log 形式 r = −log(1 − D) 讲直觉，实际实现用的是 LSGAN 形式 ' +
        'r^S = max[0, 1 − 0.25(D − 1)²]。把两条曲线画在一起，差别一眼就能看出来。'
    });

    var state = { d: -0.6, scale: 2 };

    var ctrls = controlsRow(root);
    var dSlider = slider(ctrls, {
      label: '判别器输出 D（可直接在图上拖动）',
      min: -2,
      max: 3,
      step: 0.02,
      value: state.d,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.d = v;
        render();
      }
    });
    slider(ctrls, {
      label: 'disc_reward_scale（MimicKit 默认 2）',
      min: 0.5,
      max: 5,
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
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '训练初期：D ≈ −1', function () {
      dSlider.set(-1, true);
      state.d = -1;
      render();
    });
    button(btns, '快收敛：D ≈ 0', function () {
      dSlider.set(0, true);
      state.d = 0;
      render();
    });
    button(btns, '被判成真数据：D = 1', function () {
      dSlider.set(1, true);
      state.d = 1;
      render();
    });

    var setLegend = legend(root, [
      { key: 'accent', text: 'LSGAN：max[0, 1 − 0.25(D−1)²]' },
      { key: 'warn', text: 'log 形式：−log(1 − D)（D∈(0,1)）' },
      { key: 'bad', text: '零奖励区（梯度也没了）' },
      { key: 'good', text: '判别器分不出来的位置' }
    ]);

    var grid = stageGrid(root);
    var lsStage = stage(grid, 230);
    var logStage = stage(grid, 230);

    var stats = statsRow(root);
    var sR = stats.add('风格奖励 r^S');
    var sScaled = stats.add('× disc_reward_scale');
    var sSlope = stats.add('∂r^S/∂D（推策略的力度）');
    var sState = stats.add('相当于训练的哪个阶段');
    var verdict = verdictBox(root);

    note(root, [
      '**为什么换成 LSGAN**：右图是 log 形式 —— D 一旦接近 1，−log(1−D) 直接冲向无穷。对抗训练里判别器时强时弱，这种无界奖励会让某几步的回报炸掉，PPO 就算裁剪也压不住（这也是 AMP 把 clip ε 从 DeepMimic 的 0.2 降到 **0.02** 的原因之一）。LSGAN 形式把奖励锁死在 [0, 1]。',
      '**两头都是平的**：D ≤ −1 时 r^S 恒为 0 —— 判别器认定「这不是人的动作」，奖励和**梯度**一起消失。训练最初期策略就在这个区域，所以 AMP 也要靠 early termination、任务奖励和判别器本身的持续更新把策略拽出来。',
      '**收敛长什么样**：对抗训练的理想终点不是 D = 1，而是判别器**分不出来**（D ≈ 0，r^S = 0.75）。正文「后期」那一段说的「D(策略运动) 接近 0」就是这个位置 —— 看这条曲线：从 −1 爬到 0 这一段，斜率最大，正是策略学得最快的区间。',
      '**scale 只是放大器**：`disc_reward_scale: 2` 不改变形状，只把风格奖励整体放大，相当于调它和任务奖励的相对分量 —— 和 w^S / w^G 是一回事。'
    ]);

    var render = registerRenderer(function () {
      var r = styleReward(state.d);
      var slope = state.d > -1 && state.d < 3 ? -0.5 * (state.d - 1) : 0;
      sR.set(fmt(r, 3), r > 0.7 ? 'good' : r <= 0 ? 'bad' : 'warn');
      sScaled.set(fmt(r * state.scale, 3), 'accent');
      sSlope.set(fmt(slope, 3), Math.abs(slope) < 1e-6 ? 'bad' : 'good');
      sState.set(
        state.d <= -0.9 ? '训练最初期' : state.d < -0.2 ? '正在学' : state.d < 0.4 ? '快收敛了' : '判别器被骗过了',
        state.d <= -0.9 ? 'bad' : state.d < 0.4 ? 'good' : 'warn'
      );

      // ── left: the LSGAN style reward ──
      var g = begin(lsStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 42, r: 14, t: 18, b: 32 }, [-2, 3], [-0.1, 1.15]);
      // 零奖励区
      g.ctx.save();
      g.ctx.globalAlpha = 0.1;
      g.ctx.fillStyle = P.bad;
      g.ctx.fillRect(p.sx(-2), p.y1, p.sx(-1) - p.sx(-2), p.y0 - p.y1);
      g.ctx.restore();
      axes(g, p, {
        xTicks: [-2, -1, 0, 1, 2, 3],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        xFmt: function (t) {
          return fmt(t, 0);
        },
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '判别器输出 D'
      });
      text(g.ctx, '论文实现：LSGAN 风格奖励', p.x0, p.y1 - 6, P.muted, 'left', '11px sans-serif');
      var pts = [];
      for (var i = 0; i <= 160; i++) {
        var d = -2 + (5 * i) / 160;
        pts.push([p.sx(d), p.sy(styleReward(d))]);
      }
      line(g.ctx, pts, P.accent, 2.6);
      line(g.ctx, [[p.sx(-1), p.y0], [p.sx(-1), p.y1]], P.bad, 1, [3, 3]);
      line(g.ctx, [[p.sx(0), p.y0], [p.sx(0), p.sy(0.75)]], P.good, 1, [3, 3]);
      dot(g.ctx, p.sx(0), p.sy(0.75), 3.5, P.good, P.surface2);
      text(g.ctx, 'D=0 → 0.75', p.sx(0) + 6, p.sy(0.75) - 10, P.good, 'left', '10px monospace');
      line(g.ctx, [[p.sx(state.d), p.y0], [p.sx(state.d), p.sy(r)]], P.text, 1, [3, 3]);
      dot(g.ctx, p.sx(state.d), p.sy(r), 5, r > 0 ? P.accent : P.bad, P.surface2);

      // ── right: the log form, for comparison ──
      var g2 = begin(logStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 42, r: 14, t: 18, b: 32 }, [0, 1], [-0.2, 4.2]);
      axes(g2, p2, {
        xTicks: [0, 0.25, 0.5, 0.75, 1],
        yTicks: [0, 1, 2, 3, 4],
        xFmt: function (t) {
          return fmt(t, 2);
        },
        yFmt: function (t) {
          return fmt(t, 0);
        },
        xLabel: '判别器输出 D（sigmoid，0~1）'
      });
      text(g2.ctx, '直觉版：log 形式会炸', p2.x0, p2.y1 - 6, P2.muted, 'left', '11px sans-serif');
      var logPts = [];
      for (var j = 0; j <= 160; j++) {
        var u = (0.995 * j) / 160;
        logPts.push([p2.sx(u), p2.sy(Math.min(4.2, -Math.log(1 - u)))]);
      }
      line(g2.ctx, logPts, P2.warn, 2.6);
      // 把 LSGAN 曲线映射到同一根「有多像真」的轴上作对照：D = 2u − 1
      var lsPts = [];
      for (var q = 0; q <= 160; q++) {
        var u2 = q / 160;
        lsPts.push([p2.sx(u2), p2.sy(styleReward(2 * u2 - 1))]);
      }
      line(g2.ctx, lsPts, P2.accent, 2, [5, 4]);
      text(g2.ctx, '（虚线：同一根轴上的 LSGAN）', p2.x0 + 4, p2.y1 + 12, P2.muted, 'left', '10px sans-serif');

      if (r <= 0) {
        verdict.set(
          '🧊 D = ' +
            fmt(state.d, 2) +
            ' ≤ −1：判别器一口咬定这是假的，max(0, ·) 把奖励压成 0 —— 再差一点也不会更差，**这一步转移对策略没有任何梯度信号**。训练最初期整批数据都堆在这里。',
          'frozen'
        );
      } else if (state.d < 0.4) {
        verdict.set(
          '📈 D = ' +
            fmt(state.d, 2) +
            ' → r^S = ' +
            fmt(r, 3) +
            '（×scale = ' +
            fmt(r * state.scale, 2) +
            '）。斜率 ' +
            fmt(slope, 2) +
            '，正处在奖励变化最快的那一段：策略每往参考数据靠一点，回报立刻涨一点 —— 对抗训练主要就发生在这个区间。',
          'learning'
        );
      } else {
        verdict.set(
          '🎭 D = ' +
            fmt(state.d, 2) +
            '：判别器已经把策略的动作当成真数据了，r^S = ' +
            fmt(r, 3) +
            ' 接近满分、斜率接近 0。这时该轮到判别器再学一轮把它们重新分开 —— 两边就是这样交替往上爬的。',
          'learning'
        );
      }

      lsStage.canvas.setAttribute('aria-label', 'LSGAN 风格奖励随判别器输出变化的曲线');
      logStage.canvas.setAttribute('aria-label', 'log 形式奖励与 LSGAN 形式的对比曲线');
    });

    // drag on the left canvas to move D
    var dragging = false;
    function pointerToD(evt) {
      var rect = lsStage.canvas.getBoundingClientRect();
      var pp = plot({ w: rect.width, h: lsStage.height }, { l: 42, r: 14, t: 18, b: 32 }, [-2, 3], [0, 1]);
      var d = clamp(pp.ux(evt.clientX - rect.left), -2, 3);
      dSlider.set(Math.round(d * 50) / 50, true);
      state.d = dSlider.get();
      render();
    }
    lsStage.canvas.addEventListener('pointerdown', function (e) {
      dragging = true;
      lsStage.canvas.setPointerCapture(e.pointerId);
      pointerToD(e);
    });
    lsStage.canvas.addEventListener('pointermove', function (e) {
      if (dragging) {
        e.preventDefault();
        pointerToD(e);
      }
    });
    lsStage.canvas.addEventListener('pointerup', function () {
      dragging = false;
    });
    lsStage.canvas.addEventListener('pointercancel', function () {
      dragging = false;
    });

    render();
  }

  // ─── demo 2: the discriminator loss, sample by sample ────────────────────
  /* Defaults are 正文「数值例子」那 4 个样本：真 0.8 / 0.6，假 0.3 / 0.7，
     log 形式总 loss = 0.367 + 0.780 = 1.147。 */
  var DISC_SAMPLES = [
    { name: '真 #1', label: '动捕走路片段', real: true, d: 0.8 },
    { name: '真 #2', label: '动捕跑步片段', real: true, d: 0.6 },
    { name: '假 #1', label: '策略在仿真中走路', real: false, d: 0.3 },
    { name: '假 #2', label: '策略摔倒', real: false, d: 0.7 }
  ];

  function buildDiscDemo(host) {
    var root = card(host, {
      title: '判别器 loss 实验台：哪个样本在挨骂',
      sub:
        '默认就是正文那 4 个样本（真 0.8 / 0.6，假 0.3 / 0.7）。改任意一个打分，看两项 loss 怎么变 —— ' +
        '判别器被推着「给真数据高分、给策略动作低分」。'
    });

    var state = {
      d: DISC_SAMPLES.map(function (s) {
        return s.d;
      }),
      form: 'log'
    };

    var ctrls = controlsRow(root);
    var formBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(formBox);
    var formBtns = [];
    [
      { key: 'log', label: 'log 形式（正文直觉版）' },
      { key: 'ls', label: 'LSGAN 形式（论文实现）' }
    ].forEach(function (f) {
      var b = button(formBox, f.label, function () {
        state.form = f.key;
        formBtns.forEach(function (x) {
          x.node.className = 'demo-btn' + (x.key === f.key ? ' is-active' : '');
        });
        render();
      });
      formBtns.push({ node: b, key: f.key });
    });
    formBtns.forEach(function (x) {
      x.node.className = 'demo-btn' + (x.key === state.form ? ' is-active' : '');
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '回到正文例子', function () {
      state.d = DISC_SAMPLES.map(function (s) {
        return s.d;
      });
      rebuild();
    });
    button(btns, '判别器很强（真 0.95 / 假 0.05）', function () {
      state.d = [0.95, 0.92, 0.05, 0.08];
      rebuild();
    });
    button(btns, '判别器认输（全 0.5）', function () {
      state.d = [0.5, 0.5, 0.5, 0.5];
      rebuild();
    });

    var tb = table(root);
    var lossCells = [],
      steppers = [];

    function buildTable() {
      tb.clear();
      steppers = [];
      lossCells = [];
      tb.row(
        ['样本'].concat(
          DISC_SAMPLES.map(function (s) {
            return s.name;
          })
        ),
        true
      );
      var rowSrc = el('tr');
      rowSrc.appendChild(el('th', null, '来源'));
      DISC_SAMPLES.forEach(function (s) {
        rowSrc.appendChild(el('td', null, s.label));
      });
      tb.node.appendChild(rowSrc);

      var rowD = el('tr');
      rowD.appendChild(el('th', null, '判别器输出 D'));
      DISC_SAMPLES.forEach(function (s, i) {
        var td = el('td');
        steppers.push(
          stepper(td, {
            label: s.name,
            get: function () {
              return state.d[i];
            },
            set: function (v) {
              state.d[i] = clamp(Math.round(v * 100) / 100, 0.01, 0.99);
            },
            step: 0.05,
            digits: 2,
            onChange: render
          })
        );
        rowD.appendChild(td);
      });
      tb.node.appendChild(rowD);

      var rowW = el('tr');
      rowW.appendChild(el('th', null, '期望输出'));
      DISC_SAMPLES.forEach(function (s) {
        rowW.appendChild(el('td', null, s.real ? '→ 1' : '→ 0'));
      });
      tb.node.appendChild(rowW);

      var rowL = el('tr');
      rowL.appendChild(el('th', null, '这条样本的 loss'));
      DISC_SAMPLES.forEach(function () {
        var td = el('td', null, '—');
        lossCells.push(td);
        rowL.appendChild(td);
      });
      tb.node.appendChild(rowL);
    }
    buildTable();

    function rebuild() {
      steppers.forEach(function (s) {
        s.refresh();
      });
      render();
    }

    var setLegend = legend(root, [
      { key: 'good', text: '真样本项 −log D' },
      { key: 'bad', text: '假样本项 −log(1−D)' },
      { key: 'accent', text: '当前样本' }
    ]);

    var grid = stageGrid(root);
    var curveStage = stage(grid, 230);
    var barStage = stage(grid, 230);

    var stats = statsRow(root);
    var sReal = stats.add('第一项（真样本）');
    var sFake = stats.add('第二项（假样本）');
    var sTotal = stats.add('总 loss');
    var sWorst = stats.add('罚得最狠的样本');
    var verdict = verdictBox(root);

    note(root, [
      '**两项在干两件相反的事**：真样本项只看 −log D，把真数据的分数往 1 推；假样本项只看 −log(1−D)，把策略动作的分数往 0 推。**判别器从头到尾只是个二分类器** —— 正文那句「AMP 的核心不是再加一个奖励函数，而是再加一个二分类问题」就是这个意思。',
      '**摔倒那条为什么最贵**：默认参数下「假 #2（策略摔倒）」被判成 0.7，−log(1−0.7) = 1.204，一条样本就贡献了全部 loss 的一半以上。梯度会重点修正它 —— 判别器于是学会「摔倒不像真实运动」，下一轮策略摔倒时拿到的风格奖励就更低了。',
      '**「判别器认输」按钮**：全部打 0.5 时 loss = 2×0.693 = 1.386，是 log 形式下判别器完全分不出真假的值。对抗训练的理想终点就在这附近 —— 不是判别器赢，而是它没得赢。',
      '**切到 LSGAN**：换成论文实现的最小二乘形式（真→+1、假→−1），loss 不再在 D→0 或 1 时发散，这也是 AMP 选它的原因。注意这里为了能和 log 形式并排比较，D 仍按 0~1 显示，LSGAN 内部换算成 2D−1。'
    ]);

    var render = registerRenderer(function () {
      var isLog = state.form === 'log';
      function lossOf(i) {
        var d = state.d[i];
        if (isLog) return DISC_SAMPLES[i].real ? -Math.log(d) : -Math.log(1 - d);
        var ls = 2 * d - 1; // 0~1 显示值换算成 LSGAN 的 ±1 值域
        return DISC_SAMPLES[i].real ? (ls - 1) * (ls - 1) : (ls + 1) * (ls + 1);
      }
      var losses = DISC_SAMPLES.map(function (_, i) {
        return lossOf(i);
      });
      var realLoss = (losses[0] + losses[1]) / 2;
      var fakeLoss = (losses[2] + losses[3]) / 2;
      var total = isLog ? realLoss + fakeLoss : 0.5 * (realLoss + fakeLoss);

      var worst = 0;
      losses.forEach(function (l, i) {
        if (l > losses[worst]) worst = i;
      });
      losses.forEach(function (l, i) {
        if (!lossCells[i]) return;
        lossCells[i].textContent = fmt(l, 3);
        lossCells[i].className = i === worst ? 'is-bad' : l < 0.3 ? 'is-good' : '';
      });
      sReal.set(fmt(realLoss, 3), realLoss < 0.4 ? 'good' : 'warn');
      sFake.set(fmt(fakeLoss, 3), fakeLoss < 0.4 ? 'good' : 'warn');
      sTotal.set(fmt(total, 3), 'accent');
      sWorst.set(DISC_SAMPLES[worst].name + ' · ' + fmt(losses[worst], 3), 'bad');

      // ── left: the two loss curves ──
      var g = begin(curveStage);
      var P = g.P;
      setLegend(P);
      var yMax = isLog ? 3.2 : 4.2;
      var p = plot(g, { l: 42, r: 14, t: 18, b: 32 }, [0, 1], [0, yMax]);
      axes(g, p, {
        xTicks: [0, 0.25, 0.5, 0.75, 1],
        yTicks: niceTicks(0, yMax, 4),
        xFmt: function (t) {
          return fmt(t, 2);
        },
        yFmt: function (t) {
          return fmt(t, 1);
        },
        xLabel: '判别器输出 D'
      });
      text(g.ctx, isLog ? '−log D 与 −log(1−D)' : '(2D−1∓1)²：LSGAN 的两项', p.x0, p.y1 - 6, P.muted, 'left', '11px sans-serif');
      var realPts = [],
        fakePts = [];
      for (var i = 1; i <= 159; i++) {
        var d = i / 160;
        var lr = isLog ? -Math.log(d) : (2 * d - 1 - 1) * (2 * d - 1 - 1);
        var lf = isLog ? -Math.log(1 - d) : (2 * d - 1 + 1) * (2 * d - 1 + 1);
        realPts.push([p.sx(d), p.sy(Math.min(lr, yMax))]);
        fakePts.push([p.sx(d), p.sy(Math.min(lf, yMax))]);
      }
      line(g.ctx, realPts, P.good, 2.2);
      line(g.ctx, fakePts, P.bad, 2.2);
      DISC_SAMPLES.forEach(function (s, idx) {
        dot(g.ctx, p.sx(state.d[idx]), p.sy(Math.min(losses[idx], yMax)), 4.5, s.real ? P.good : P.bad, P.surface2);
      });

      // ── right: per-sample contribution ──
      var g2 = begin(barStage);
      var P2 = g2.P;
      var maxL = Math.max(1, Math.max.apply(null, losses)) * 1.15;
      var p2 = plot(g2, { l: 42, r: 14, t: 18, b: 34 }, [0, 4], [0, maxL]);
      axes(g2, p2, {
        yTicks: niceTicks(0, maxL, 4),
        yFmt: function (t) {
          return fmt(t, 1);
        }
      });
      text(g2.ctx, '每条样本贡献多少 loss', p2.x0, p2.y1 - 6, P2.muted, 'left', '11px sans-serif');
      var slot = (p2.x1 - p2.x0) / 4;
      DISC_SAMPLES.forEach(function (s, idx) {
        var x = p2.x0 + slot * idx + slot * 0.22;
        var bw = slot * 0.56;
        g2.ctx.fillStyle = idx === worst ? P2.warn : s.real ? P2.good : P2.bad;
        g2.ctx.fillRect(x, p2.sy(losses[idx]), bw, p2.y0 - p2.sy(losses[idx]));
        text(g2.ctx, s.name, p2.x0 + slot * (idx + 0.5), p2.y0 + 13, P2.muted, 'center', '10px monospace');
        barLabel(g2, p2, p2.x0 + slot * (idx + 0.5), p2.sy(losses[idx]), fmt(losses[idx], 2));
      });

      verdict.set(
        (isLog ? 'log 形式' : 'LSGAN 形式') +
          '：第一项 ' +
          fmt(realLoss, 3) +
          ' + 第二项 ' +
          fmt(fakeLoss, 3) +
          ' = ' +
          fmt(total, 3) +
          '。当前罚得最狠的是 **' +
          DISC_SAMPLES[worst].name +
          '（' +
          DISC_SAMPLES[worst].label +
          '）**，判别器的梯度会优先修正它。',
        total < 1.4 ? 'learning' : 'frozen'
      );

      curveStage.canvas.setAttribute('aria-label', '判别器两项 loss 随输出变化的曲线');
      barStage.canvas.setAttribute('aria-label', '四个样本各自贡献的 loss 柱状图');
    });

    render();
  }

  // ─── demo 3: style × task ────────────────────────────────────────────────
  /* One scalar "motion feature" x = 这一步的移动速度。参考数据是它的一个分布，
     策略是 N(μ, σ)。判别器是一组 RBF 特征上的线性模型，按论文的 LSGAN 目标
     （真→+1、假→−1，外加只作用在真数据上的梯度惩罚）训练；风格奖励喂回策略。
     不是人形仿真，但对抗训练的那一环是真的在跑。 */
  var DATASETS = {
    walk: { name: '走路数据集', modes: [{ mu: 1.2, sd: 0.25, w: 1 }] },
    run: { name: '跑步数据集', modes: [{ mu: 3.6, sd: 0.4, w: 1 }] },
    mix: { name: '走 + 跑混合', modes: [{ mu: 1.2, sd: 0.25, w: 0.5 }, { mu: 3.6, sd: 0.4, w: 0.5 }] }
  };

  var X_LO = 0,
    X_HI = 5.4,
    NF = 18,
    FW = 0.32;

  function features(x) {
    var f = new Array(NF + 1);
    for (var i = 0; i < NF; i++) {
      var c = X_LO + ((X_HI - X_LO) * i) / (NF - 1);
      var z = (x - c) / FW;
      f[i] = Math.exp(-0.5 * z * z);
    }
    f[NF] = 1; // bias
    return f;
  }

  /* d/dx of the RBF features — the gradient penalty needs ∇_x D. */
  function dFeatures(x) {
    var f = new Array(NF + 1);
    for (var i = 0; i < NF; i++) {
      var c = X_LO + ((X_HI - X_LO) * i) / (NF - 1);
      var z = (x - c) / FW;
      f[i] = (-z / FW) * Math.exp(-0.5 * z * z);
    }
    f[NF] = 0;
    return f;
  }

  function dotp(w, f) {
    var s = 0;
    for (var i = 0; i < w.length; i++) s += w[i] * f[i];
    return s;
  }

  function dataDensity(ds, x) {
    var p = 0;
    ds.modes.forEach(function (m) {
      p += (m.w * Math.exp(-((x - m.mu) * (x - m.mu)) / (2 * m.sd * m.sd))) / (m.sd * Math.sqrt(2 * Math.PI));
    });
    return p;
  }

  function sampleData(ds, rng) {
    var u = rng(),
      acc = 0,
      mode = ds.modes[ds.modes.length - 1];
    for (var i = 0; i < ds.modes.length; i++) {
      acc += ds.modes[i].w;
      if (u < acc) {
        mode = ds.modes[i];
        break;
      }
    }
    return mode.mu + mode.sd * gauss(rng);
  }

  function taskReward(x, vStar) {
    return Math.exp(-0.25 * (vStar - x) * (vStar - x)); // 论文 Target Heading 的任务奖励
  }

  /* One AMP-ish training run. Returns the final policy, the discriminator and
     the trace of the policy mean. */
  function trainAmp(ds, vStar, wStyle, gp, seed, iters) {
    var rng = mulberry32(seed);
    var w = new Array(NF + 1);
    for (var i = 0; i <= NF; i++) w[i] = 0;
    var mu = 2.4,
      sigma = 0.45;
    var batch = 48;
    var discLr = 0.03,
      polLr = 0.35;
    var trace = [mu];

    for (var it = 0; it < iters; it++) {
      var fake = [],
        real = [];
      for (var b = 0; b < batch; b++) {
        fake.push(mu + sigma * gauss(rng));
        real.push(sampleData(ds, rng));
      }

      // 特征在这一轮里是固定的，先算好，判别器的 8 个梯度步就只剩点积
      var featReal = [],
        featFake = [],
        featDeriv = [];
      for (var c0 = 0; c0 < batch; c0++) {
        featReal.push(features(real[c0]));
        featFake.push(features(fake[c0]));
        if (gp > 0) featDeriv.push(dFeatures(real[c0]));
      }

      // ── 判别器：LSGAN，真→+1、假→−1，梯度惩罚只作用在真数据上 ──
      for (var step = 0; step < 8; step++) {
        var grad = new Array(NF + 1);
        for (var g0 = 0; g0 <= NF; g0++) grad[g0] = 0;
        for (var r0 = 0; r0 < batch; r0++) {
          var fr = featReal[r0];
          var er = dotp(w, fr) - 1;
          var ff = featFake[r0];
          var ef = dotp(w, ff) + 1;
          for (var k = 0; k <= NF; k++) grad[k] += (2 * er * fr[k] + 2 * ef * ff[k]) / batch;
          if (gp > 0) {
            var dfd = featDeriv[r0];
            var dD = dotp(w, dfd);
            for (var k2 = 0; k2 <= NF; k2++) grad[k2] += (gp * dD * dfd[k2]) / batch;
          }
        }
        for (var k3 = 0; k3 <= NF; k3++) w[k3] -= discLr * grad[k3];
      }

      // ── 策略：REINFORCE，奖励 = w^S·风格 + (1−w^S)·任务 ──
      var rewards = [];
      var mean = 0;
      for (var s0 = 0; s0 < batch; s0++) {
        var rS = styleReward(dotp(w, features(fake[s0])));
        var rG = taskReward(fake[s0], vStar);
        var rr = wStyle * rS + (1 - wStyle) * rG;
        rewards.push(rr);
        mean += rr / batch;
      }
      var gmu = 0;
      for (var s1 = 0; s1 < batch; s1++) {
        gmu += ((rewards[s1] - mean) * (fake[s1] - mu)) / (sigma * sigma) / batch;
      }
      mu = clamp(mu + polLr * gmu, X_LO, X_HI);
      trace.push(mu);
    }
    return { w: w, mu: mu, sigma: sigma, trace: trace };
  }

  function buildStyleDemo(host) {
    var root = card(host, {
      title: '风格 × 任务：同一个任务奖励，换数据集就换风格',
      sub:
        '把「运动」简化成一个标量 x（这一步迈多快）。任务奖励用论文 Target Heading 的原式 r^G = exp(−0.25(v* − v)²)，' +
        '风格奖励来自一个真在训练的 LSGAN 判别器。总奖励 r = w^S·r^S + w^G·r^G。'
    });

    var state = { ds: 'mix', vStar: 3.0, wStyle: 0.5, gp: 5, seed: 5 };
    var ITERS = 60;
    var current = null;
    var sweep = null;
    var sweepKey = '';

    var ctrls = controlsRow(root);
    var dsBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(dsBox);
    var dsBtns = [];
    Object.keys(DATASETS).forEach(function (key) {
      var b = button(dsBox, DATASETS[key].name, function () {
        state.ds = key;
        dsBtns.forEach(function (x) {
          x.node.className = 'demo-btn' + (x.key === key ? ' is-active' : '');
        });
        recompute();
      });
      dsBtns.push({ node: b, key: key });
    });
    dsBtns.forEach(function (x) {
      x.node.className = 'demo-btn' + (x.key === state.ds ? ' is-active' : '');
    });

    slider(ctrls, {
      label: '目标速度 v*（m/s）',
      min: 0.6,
      max: 5,
      step: 0.1,
      value: state.vStar,
      format: function (v) {
        return fmt(v, 1);
      },
      onInput: function (v) {
        state.vStar = v;
        recompute();
      }
    });
    slider(ctrls, {
      label: '风格权重 w^S（任务权重 = 1 − w^S）',
      min: 0,
      max: 1,
      step: 0.05,
      value: state.wStyle,
      format: function (v) {
        return fmt(v, 2) + ' / ' + fmt(1 - v, 2);
      },
      onInput: function (v) {
        state.wStyle = v;
        recompute();
      }
    });
    slider(ctrls, {
      label: '梯度惩罚 w_gp（MimicKit 默认 5，论文 10）',
      min: 0,
      max: 12,
      step: 0.5,
      value: state.gp,
      format: function (v) {
        return fmt(v, 1);
      },
      onInput: function (v) {
        state.gp = v;
        recompute();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '换一组随机种子', function () {
      state.seed = (state.seed * 41 + 3) % 9941;
      recompute();
    });

    var setLegend = legend(root, [
      { key: 'muted', text: '参考数据分布' },
      { key: 'accent', text: '学到的策略' },
      { key: 'good', text: '风格奖励 r^S(x)' },
      { key: 'warn', text: '任务奖励 r^G(x)' }
    ]);

    var grid = stageGrid(root);
    var distStage = stage(grid, 240);
    var sweepStage = stage(grid, 240);

    var stats = statsRow(root);
    var sMu = stats.add('学到的速度 μ');
    var sStyle = stats.add('风格奖励 r^S(μ)');
    var sTask = stats.add('任务奖励 r^G(μ)');
    var sGap = stats.add('离目标速度差');
    var verdict = verdictBox(root);

    note(root, [
      '**判别器就是风格编码器**：三个数据集给的任务奖励完全一样，只有「什么算像」变了。切到「走路数据集」再把 v* 拖到 4 —— 策略被任务往快里推、被风格往 1.2 m/s 拽，最后停在中间的某个尴尬位置，风格奖励和任务奖励都不满意。正文说的「w^S 大就更像参考但可能完不成任务」就是这条拉锯。',
      '**混合数据集才有步态切换**：右图把 v* 从 0.6 扫到 5，画出每个目标速度下最终学到的速度。走路数据集在高速段拉不动，跑步数据集在低速段下不来，**走+跑混合**才能大致跟上整条对角线 —— 这正是正文 Figure 4 右图的结论。',
      '**梯度惩罚在压什么**：w_gp 罚的是判别器在**真数据处的输入梯度**。把它拖大，左图绿色的风格奖励曲线会整体变平缓（判别器没那么「自信」），策略更容易被任务奖励拉动；拖到 0 则风格的那座「高地」更陡，策略更容易被钉死在数据模式上。正文附录 A 的原话是「防止鉴别器在参考数据附近变化太剧烈」—— 在这个一维玩具里效果是温和的，真正的过拟合风险要到高维动捕特征上才严重。',
      '**这不是人形仿真**：这里只有一个标量特征和一个 REINFORCE 更新，规模跟论文的 1~3 亿样本没有可比性。它想说明的只有一件事：**风格奖励是从数据里长出来的，不是手写的**。'
    ]);

    /* The v* sweep is 30 training runs (~0.2 s), so it is debounced: dragging a
       slider repaints the left chart immediately and the sweep catches up once
       the drag settles. */
    var sweepTimer = null;

    function runSweep() {
      sweepKey = [state.wStyle, state.gp, state.seed].join('|');
      sweep = {};
      Object.keys(DATASETS).forEach(function (dsKey) {
        var pts = [];
        for (var i = 0; i < 10; i++) {
          var v = 0.6 + (4.4 * i) / 9;
          pts.push([v, trainAmp(DATASETS[dsKey], v, state.wStyle, state.gp, state.seed + i, ITERS).mu]);
        }
        sweep[dsKey] = pts;
      });
      render();
    }

    function recompute() {
      current = trainAmp(DATASETS[state.ds], state.vStar, state.wStyle, state.gp, state.seed, ITERS);
      render();
      if ([state.wStyle, state.gp, state.seed].join('|') !== sweepKey) {
        clearTimeout(sweepTimer);
        sweepTimer = setTimeout(runSweep, 140);
      }
    }

    var render = registerRenderer(function () {
      if (!current) return;
      var ds = DATASETS[state.ds];
      var d = dotp(current.w, features(current.mu));
      var rS = styleReward(d);
      var rG = taskReward(current.mu, state.vStar);
      sMu.set(fmt(current.mu, 2) + ' m/s', 'accent');
      sStyle.set(fmt(rS, 3), rS > 0.6 ? 'good' : 'bad');
      sTask.set(fmt(rG, 3), rG > 0.6 ? 'good' : 'bad');
      sGap.set(fmt(Math.abs(current.mu - state.vStar), 2) + ' m/s', Math.abs(current.mu - state.vStar) < 0.4 ? 'good' : 'warn');

      // ── left: data, policy, rewards ──
      var g = begin(distStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 40, r: 14, t: 18, b: 32 }, [X_LO, X_HI], [-0.05, 1.15]);
      axes(g, p, {
        xTicks: [0, 1, 2, 3, 4, 5],
        yTicks: [0, 0.5, 1],
        xFmt: function (t) {
          return fmt(t, 0);
        },
        yFmt: function (t) {
          return fmt(t, 1);
        },
        xLabel: '速度 x（m/s）'
      });
      text(g.ctx, '参考数据、学到的策略，以及两种奖励', p.x0, p.y1 - 6, P.muted, 'left', '11px sans-serif');

      var dataMax = 0,
        i;
      for (i = 0; i <= 140; i++) {
        dataMax = Math.max(dataMax, dataDensity(ds, X_LO + ((X_HI - X_LO) * i) / 140));
      }
      var dataPts = [];
      for (i = 0; i <= 140; i++) {
        var x = X_LO + ((X_HI - X_LO) * i) / 140;
        dataPts.push([p.sx(x), p.sy((dataDensity(ds, x) / dataMax) * 0.9)]);
      }
      g.ctx.save();
      g.ctx.globalAlpha = 0.18;
      g.ctx.fillStyle = P.muted;
      g.ctx.beginPath();
      g.ctx.moveTo(p.x0, p.y0);
      dataPts.forEach(function (q) {
        g.ctx.lineTo(q[0], q[1]);
      });
      g.ctx.lineTo(p.x1, p.y0);
      g.ctx.fill();
      g.ctx.restore();
      line(g.ctx, dataPts, P.muted, 1.5, [5, 4]);

      var stylePts = [],
        taskPts = [];
      for (i = 0; i <= 140; i++) {
        var x2 = X_LO + ((X_HI - X_LO) * i) / 140;
        stylePts.push([p.sx(x2), p.sy(styleReward(dotp(current.w, features(x2))))]);
        taskPts.push([p.sx(x2), p.sy(taskReward(x2, state.vStar))]);
      }
      line(g.ctx, stylePts, P.good, 2.2);
      line(g.ctx, taskPts, P.warn, 1.8, [3, 3]);

      var polPts = [];
      for (i = 0; i <= 140; i++) {
        var x3 = X_LO + ((X_HI - X_LO) * i) / 140;
        polPts.push([
          p.sx(x3),
          p.sy(0.9 * Math.exp(-((x3 - current.mu) * (x3 - current.mu)) / (2 * current.sigma * current.sigma)))
        ]);
      }
      line(g.ctx, polPts, P.accent, 2.6);
      line(g.ctx, [[p.sx(state.vStar), p.y0], [p.sx(state.vStar), p.y1]], P.warn, 1, [2, 4]);
      text(g.ctx, 'v*', p.sx(state.vStar) + 4, p.y1 + 8, P.warn, 'left', '10px monospace');

      // ── right: v* sweep, one line per dataset ──
      var g2 = begin(sweepStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 40, r: 14, t: 18, b: 34 }, [0.6, 5], [0, 5.4]);
      axes(g2, p2, {
        xTicks: [1, 2, 3, 4, 5],
        yTicks: [0, 1, 2, 3, 4, 5],
        xFmt: function (t) {
          return fmt(t, 0);
        },
        yFmt: function (t) {
          return fmt(t, 0);
        },
        xLabel: '目标速度 v*'
      });
      text(g2.ctx, '每个目标速度下最终学到的速度', p2.x0, p2.y1 - 6, P2.muted, 'left', '11px sans-serif');
      line(g2.ctx, [[p2.sx(0.6), p2.sy(0.6)], [p2.sx(5), p2.sy(5)]], P2.border, 1, [4, 4]);
      var dsColors = { walk: P2.good, run: P2.warn, mix: P2.accent };
      Object.keys(DATASETS).forEach(function (key) {
        if (!sweep || !sweep[key]) return;
        var pts = sweep[key].map(function (q) {
          return [p2.sx(q[0]), p2.sy(q[1])];
        });
        line(g2.ctx, pts, dsColors[key], key === state.ds ? 2.8 : 1.4);
        if (key === state.ds) {
          sweep[key].forEach(function (q) {
            dot(g2.ctx, p2.sx(q[0]), p2.sy(q[1]), 3, dsColors[key]);
          });
        }
      });
      text(g2.ctx, '走路', p2.sx(0.75), p2.sy(1.2) - 12, P2.good, 'left', '10px sans-serif');
      text(g2.ctx, '跑步', p2.sx(0.75), p2.sy(3.6) - 12, P2.warn, 'left', '10px sans-serif');
      text(g2.ctx, '混合', p2.sx(4.1), p2.sy(4.7), P2.accent, 'left', '10px sans-serif');

      var nearest = null;
      ds.modes.forEach(function (m) {
        if (!nearest || Math.abs(m.mu - current.mu) < Math.abs(nearest - current.mu)) nearest = m.mu;
      });
      if (state.wStyle >= 0.95) {
        verdict.set(
          '🎭 纯风格（w^S = ' +
            fmt(state.wStyle, 2) +
            '）：没有任务奖励拉着，策略直接滑进参考数据的某个峰（' +
            fmt(nearest, 1) +
            ' m/s 附近），完全不管 v* = ' +
            fmt(state.vStar, 1) +
            '。MimicKit 默认的 spinkick 配置就是这个模式（task_reward_weight = 0）。',
          'frozen'
        );
      } else if (state.wStyle <= 0.05) {
        verdict.set(
          '🏃 纯任务（w^S = ' +
            fmt(state.wStyle, 2) +
            '）：策略精准停在 v* = ' +
            fmt(state.vStar, 1) +
            '，但风格奖励只有 ' +
            fmt(rS, 2) +
            ' —— 速度对了，动作「不像人」。这就是纯 RL 训出来的那种怪步态。',
          'frozen'
        );
      } else {
        verdict.set(
          '⚖️ w^S = ' +
            fmt(state.wStyle, 2) +
            ' / w^G = ' +
            fmt(1 - state.wStyle, 2) +
            '：最终学到 ' +
            fmt(current.mu, 2) +
            ' m/s（目标 ' +
            fmt(state.vStar, 1) +
            '，数据集最近的峰在 ' +
            fmt(nearest, 1) +
            '）。风格 ' +
            fmt(rS, 2) +
            '、任务 ' +
            fmt(rG, 2) +
            ' —— 两个奖励各让一步的位置就在这里。',
          'learning'
        );
      }

      distStage.canvas.setAttribute('aria-label', '参考数据分布、策略分布与两种奖励曲线');
      sweepStage.canvas.setAttribute('aria-label', '不同数据集下目标速度与学到速度的关系');
    });

    recompute();
  }

  K.mount({
    'amp-reward': buildRewardDemo,
    'amp-disc': buildDiscDemo,
    'amp-style': buildStyleDemo
  });
})();
