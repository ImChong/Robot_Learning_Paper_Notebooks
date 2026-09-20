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
 *   amp-curves — 训练曲线怎么读：风格/任务奖励、D 的 logit、准确率、梯度惩罚
 *   amp-explainer — 五幕讲解动画：逐帧 vs 分布 → 判别器 loss → LSGAN 风格奖励
 *                   → 换数据集就换风格 → 训练闭环
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
        '论文正文先用 log 形式 $r = -\\log(1 - D)$ 讲直觉，实际实现用的是 LSGAN 形式 ' +
        '$r^S = \\max[0,\\ 1 - 0.25(D - 1)^2]$。把两条曲线画在一起，差别一眼就能看出来。'
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
      '**为什么换成 LSGAN**：右图是 log 形式 —— $D$ 一旦接近 1，$-\\log(1-D)$ 直接冲向无穷。对抗训练里判别器时强时弱，这种无界奖励会让某几步的回报炸掉，PPO 就算裁剪也压不住（这也是 AMP 把 clip $\\varepsilon$ 从 DeepMimic 的 0.2 降到 **0.02** 的原因之一）。LSGAN 形式把奖励锁死在 $[0, 1]$。',
      '**两头都是平的**：$D \\le -1$ 时 $r^S$ 恒为 0 —— 判别器认定「这不是人的动作」，奖励和**梯度**一起消失。训练最初期策略就在这个区域，所以 AMP 也要靠 early termination、任务奖励和判别器本身的持续更新把策略拽出来。',
      '**收敛长什么样**：对抗训练的理想终点不是 $D = 1$，而是判别器**分不出来**（$D \\approx 0$，$r^S = 0.75$）。正文「后期」那一段说的「D(策略运动) 接近 0」就是这个位置 —— 看这条曲线：从 −1 爬到 0 这一段，斜率最大，正是策略学得最快的区间。',
      '**scale 只是放大器**：`disc_reward_scale: 2` 不改变形状，只把风格奖励整体放大，相当于调它和任务奖励的相对分量 —— 和 $w^S / w^G$ 是一回事。'
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
            ' $\\le -1$：判别器一口咬定这是假的，$\\max(0, \\cdot)$ 把奖励压成 0 —— 再差一点也不会更差，**这一步转移对策略没有任何梯度信号**。训练最初期整批数据都堆在这里。',
          'frozen'
        );
      } else if (state.d < 0.4) {
        verdict.set(
          '📈 D = ' +
            fmt(state.d, 2) +
            ' → $r^S$ = ' +
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
            '：判别器已经把策略的动作当成真数据了，$r^S$ = ' +
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
      '**「判别器认输」按钮**：全部打 0.5 时 $\\text{loss} = 2 \\times 0.693 = 1.386$，是 log 形式下判别器完全分不出真假的值。对抗训练的理想终点就在这附近 —— 不是判别器赢，而是它没得赢。',
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
        '把「运动」简化成一个标量 $x$（这一步迈多快）。任务奖励用论文 Target Heading 的原式 $r^G = \\exp(-0.25(v^* - v)^2)$，' +
        '风格奖励来自一个真在训练的 LSGAN 判别器。总奖励 $r = w^S r^S + w^G r^G$。'
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
      '**判别器就是风格编码器**：三个数据集给的任务奖励完全一样，只有「什么算像」变了。切到「走路数据集」再把 $v^*$ 拖到 4 —— 策略被任务往快里推、被风格往 1.2 m/s 拽，最后停在中间的某个尴尬位置，风格奖励和任务奖励都不满意。正文说的「$w^S$ 大就更像参考但可能完不成任务」就是这条拉锯。',
      '**混合数据集才有步态切换**：右图把 v* 从 0.6 扫到 5，画出每个目标速度下最终学到的速度。走路数据集在高速段拉不动，跑步数据集在低速段下不来，**走+跑混合**才能大致跟上整条对角线 —— 这正是正文 Figure 4 右图的结论。',
      '**梯度惩罚在压什么**：$w_{gp}$ 罚的是判别器在**真数据处的输入梯度**。把它拖大，左图绿色的风格奖励曲线会整体变平缓（判别器没那么「自信」），策略更容易被任务奖励拉动；拖到 0 则风格的那座「高地」更陡，策略更容易被钉死在数据模式上。正文附录 A 的原话是「防止鉴别器在参考数据附近变化太剧烈」—— 在这个一维玩具里效果是温和的，真正的过拟合风险要到高维动捕特征上才严重。',
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
          '🎭 纯风格（$w^S$ = ' +
            fmt(state.wStyle, 2) +
            '）：没有任务奖励拉着，策略直接滑进参考数据的某个峰（' +
            fmt(nearest, 1) +
            ' m/s 附近），完全不管 $v^*$ = ' +
            fmt(state.vStar, 1) +
            '。MimicKit 默认的 spinkick 配置就是这个模式（task_reward_weight = 0）。',
          'frozen'
        );
      } else if (state.wStyle <= 0.05) {
        verdict.set(
          '🏃 纯任务（$w^S$ = ' +
            fmt(state.wStyle, 2) +
            '）：策略精准停在 $v^*$ = ' +
            fmt(state.vStar, 1) +
            '，但风格奖励只有 ' +
            fmt(rS, 2) +
            ' —— 速度对了，动作「不像人」。这就是纯 RL 训出来的那种怪步态。',
          'frozen'
        );
      } else {
        verdict.set(
          '⚖️ $w^S$ = ' +
            fmt(state.wStyle, 2) +
            ' / $w^G$ = ' +
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

  // ─── demo 4: reading the training curves ────────────────────────────────
  /* Schematic TensorBoard traces for AMP Target Heading, anchored to the
     note's 「第 4 步：训练进展」table. r^S is computed from D(假) with the
     same styleReward() as the reward demo. These are toy shapes that teach
     the *reading*, not dumps from a real run. */
  var CURVE_ITERS = 200;
  var CURVE_XS = [0, 10, 50, 200];
  var CURVE_D_AGENT = [-1.0, -0.55, -0.15, 0.0];
  var CURVE_D_DEMO = [1.0, 0.92, 0.68, 0.35];
  var CURVE_TASK = [0.12, 0.32, 0.62, 0.88];
  var CURVE_AGENT_ACC = [0.99, 0.9, 0.72, 0.55];
  var CURVE_DEMO_ACC = [0.99, 0.94, 0.82, 0.7];
  var CURVE_COVER = [0.18, 0.35, 0.72, 0.94];
  var CURVE_GP_LO = 0.6;
  var CURVE_GP_HI = 1.6;
  var CURVE_WS = 0.5;
  var CURVE_WG = 0.5;
  var CURVE_SCENES = [
    { id: 'healthy', label: '健康' },
    { id: 'discstrong', label: '判别器过强' },
    { id: 'discweak', label: '判别器过弱' },
    { id: 'collapse', label: '模式崩塌' },
    { id: 'taskwin', label: '任务压垮风格' },
    { id: 'styleonly', label: '只有风格' }
  ];

  function curveLerp(a, b, t) {
    return a + (b - a) * t;
  }
  function curveSmooth(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }
  function curvePiece(xs, ys, x) {
    if (x <= xs[0]) return ys[0];
    for (var ci = 1; ci < xs.length; ci++) {
      if (x <= xs[ci]) {
        var u = curveSmooth((x - xs[ci - 1]) / (xs[ci] - xs[ci - 1]));
        return curveLerp(ys[ci - 1], ys[ci], u);
      }
    }
    return ys[ys.length - 1];
  }
  function curveWave(iter, period, phase) {
    return Math.sin((iter / period) * Math.PI * 2 + phase);
  }
  function curveGate(iter, start, width) {
    return curveSmooth((iter - start) / width);
  }

  function curveAt(scene, iter) {
    var t = iter / CURVE_ITERS;
    var dAgent = curvePiece(CURVE_XS, CURVE_D_AGENT, iter);
    var dDemo = curvePiece(CURVE_XS, CURVE_D_DEMO, iter);
    var rG = curvePiece(CURVE_XS, CURVE_TASK, iter);
    var agentAcc = curvePiece(CURVE_XS, CURVE_AGENT_ACC, iter);
    var demoAcc = curvePiece(CURVE_XS, CURVE_DEMO_ACC, iter);
    var gp = 1.05 + 0.12 * curveWave(iter, 28, 0.4);
    var cover = curvePiece(CURVE_XS, CURVE_COVER, iter);

    if (scene === 'discstrong') {
      dAgent = -1.02 + 0.04 * curveWave(iter, 18, 0.2);
      dDemo = 0.98 + 0.02 * curveWave(iter, 22, 1.1);
      agentAcc = 0.985 + 0.008 * curveWave(iter, 20, 0.5);
      demoAcc = 0.99 + 0.006 * curveWave(iter, 24, 0.8);
      rG = curvePiece([0, 10, 50, 200], [0.12, 0.2, 0.3, 0.36], iter);
      gp = 5.4 + 0.7 * Math.abs(curveWave(iter, 16, 0.3));
      cover = curvePiece([0, 10, 50, 200], [0.18, 0.22, 0.26, 0.3], iter);
    } else if (scene === 'discweak') {
      var melt = curveGate(iter, 4, 18);
      dAgent = curveLerp(dAgent, 0.02 * curveWave(iter, 14, 0.4), melt);
      dDemo = curveLerp(dDemo, -0.02 * curveWave(iter, 16, 1.2), melt);
      agentAcc = curveLerp(agentAcc, 0.5 + 0.03 * curveWave(iter, 12, 0.2), melt);
      demoAcc = curveLerp(demoAcc, 0.5 + 0.03 * curveWave(iter, 13, 0.9), melt);
      rG = curvePiece(CURVE_XS, [0.12, 0.34, 0.66, 0.86], iter);
      gp = 0.08 + 0.04 * Math.abs(curveWave(iter, 20, 0.6));
      cover = curvePiece(CURVE_XS, [0.18, 0.4, 0.7, 0.88], iter);
    } else if (scene === 'collapse') {
      rG = curvePiece([0, 10, 50, 200], [0.12, 0.3, 0.46, 0.5], iter);
      cover = curvePiece([0, 10, 50, 200], [0.18, 0.32, 0.38, 0.4], iter);
    } else if (scene === 'taskwin') {
      dAgent = curvePiece([0, 10, 50, 200], [-1.0, -0.82, -0.72, -0.68], iter);
      dDemo = curvePiece([0, 10, 50, 200], [1.0, 0.96, 0.94, 0.93], iter);
      agentAcc = curvePiece([0, 10, 50, 200], [0.99, 0.94, 0.9, 0.88], iter);
      demoAcc = curvePiece([0, 10, 50, 200], [0.99, 0.97, 0.96, 0.95], iter);
      rG = curvePiece([0, 10, 50, 200], [0.14, 0.48, 0.78, 0.92], iter);
      gp = 1.15 + 0.1 * curveWave(iter, 26, 0.2);
      cover = curvePiece([0, 10, 50, 200], [0.2, 0.55, 0.85, 0.95], iter);
    } else if (scene === 'styleonly') {
      rG = curvePiece([0, 10, 50, 200], [0.12, 0.16, 0.19, 0.2], iter);
      cover = curvePiece([0, 10, 50, 200], [0.2, 0.45, 0.54, 0.58], iter);
    }

    var rS = styleReward(dAgent);
    return {
      dAgent: clamp(dAgent, -1.4, 1.4),
      dDemo: clamp(dDemo, -1.4, 1.4),
      rS: clamp(rS, 0, 1),
      rG: clamp(rG, 0, 1),
      total: clamp(CURVE_WS * rS + CURVE_WG * rG, 0, 1),
      agentAcc: clamp(agentAcc, 0, 1),
      demoAcc: clamp(demoAcc, 0, 1),
      gp: Math.max(0, gp),
      cover: clamp(cover, 0, 1)
    };
  }

  function curveSeries(scene) {
    var n = 80,
      xs = [],
      rows = [];
    for (var i = 0; i <= n; i++) {
      var it = (i / n) * CURVE_ITERS;
      xs.push(it);
      rows.push(curveAt(scene, it));
    }
    return { xs: xs, rows: rows };
  }

  function toneOf(kind) {
    if (kind === 'ok') return 'good';
    if (kind === 'warn') return 'warn';
    return 'bad';
  }

  function judgeCurves(m, scene, iter) {
    var j = {};
    if (scene === 'discweak') {
      j.rS = { kind: 'warn', text: '假饱和：D ≈ 0 就会给 0.75' };
    } else if (scene === 'taskwin') {
      j.rS = { kind: 'bad', text: '风格分贴地' };
    } else if (m.rS >= 0.7) {
      j.rS = { kind: scene === 'collapse' || scene === 'styleonly' ? 'warn' : 'ok', text: '接近均衡 0.75' };
    } else if (m.rS >= 0.3) {
      j.rS = { kind: 'ok', text: '在爬' };
    } else if (iter > 40) {
      j.rS = { kind: 'bad', text: '奖励消失（D ≤ −1）' };
    } else {
      j.rS = { kind: 'warn', text: '前期贴地正常' };
    }

    if (scene === 'styleonly') {
      j.rG = { kind: 'bad', text: '任务分几乎没动' };
    } else if (scene === 'taskwin') {
      j.rG = { kind: 'warn', text: '任务成了，先别信风格' };
    } else if (scene === 'collapse' && m.rG >= 0.45) {
      j.rG = { kind: 'warn', text: '只会走路速度' };
    } else if (m.rG >= 0.7) {
      j.rG = { kind: 'ok', text: '跟得上 v*' };
    } else if (m.rG >= 0.3) {
      j.rG = { kind: 'ok', text: '在爬' };
    } else if (iter > 50) {
      j.rG = { kind: 'bad', text: '长期停在随机水平' };
    } else {
      j.rG = { kind: 'warn', text: '还早，先看斜率' };
    }

    if (scene === 'discstrong' || m.dAgent < -0.85) {
      j.dAgent = { kind: iter > 20 ? 'bad' : 'ok', text: iter > 20 ? '钉在 −1' : '前期 ≈ −1 正常' };
    } else if (scene === 'discweak') {
      j.dAgent = { kind: 'bad', text: '真假都塌到 0' };
    } else if (m.dAgent > -0.25) {
      j.dAgent = { kind: 'ok', text: '在往 0 靠' };
    } else {
      j.dAgent = { kind: 'ok', text: '策略在追判别器' };
    }

    if (scene === 'discstrong') {
      j.acc = { kind: iter > 20 ? 'bad' : 'ok', text: '准确率钉在 99%' };
    } else if (scene === 'discweak') {
      j.acc = { kind: 'bad', text: '两边都 ≈ 50%' };
    } else if (scene === 'taskwin') {
      j.acc = { kind: 'warn', text: '判别器一直轻易分清' };
    } else if (m.agentAcc <= 0.65 && m.demoAcc <= 0.8) {
      j.acc = { kind: 'ok', text: '对抗均衡附近' };
    } else if (iter > 80) {
      j.acc = { kind: 'warn', text: '策略还没追上' };
    } else {
      j.acc = { kind: 'ok', text: '前期高正常' };
    }

    if (m.gp > 3) j.gp = { kind: 'bad', text: '判别器太尖，GP 系数太小' };
    else if (m.gp < 0.25) j.gp = { kind: 'bad', text: '判别器被抹平' };
    else j.gp = { kind: 'ok', text: '落在 ~1 附近' };

    if (scene === 'collapse') j.cover = { kind: 'bad', text: '速度覆盖卡住' };
    else if (scene === 'styleonly') j.cover = { kind: 'warn', text: '只停在数据集的峰' };
    else if (m.cover >= 0.7) j.cover = { kind: 'ok', text: '1–5 m/s 铺得开' };
    else if (iter > 80) j.cover = { kind: 'warn', text: '高速段还没跟上' };
    else j.cover = { kind: 'ok', text: '前期窄正常' };

    return j;
  }

  function curveVerdict(scene) {
    if (scene === 'healthy') {
      return {
        tone: 'learning',
        text:
          '**健康**：D(假) 从 −1 爬到 **0**，风格奖励 $r^S = \\max[0,\\ 1-0.25(D-1)^2]$ 从 0 升到 **0.75**；D(真) 从 1 降到 ~0.35，准确率从 99% 降到对抗均衡附近。任务奖励同步爬到 ~0.88，$w^S=w^G=0.5$。对照的是第 4 步 Target Heading 的三阶段。'
      };
    }
    if (scene === 'discstrong') {
      return {
        tone: 'frozen',
        text:
          '**判别器过强**：D(假) 钉在 −1，$r^S$ 被 $\\max(0,\\cdot)$ 压成 0，准确率 99% —— 策略拿不到风格梯度。`disc_grad_penalty` 太小（IsaacGymEnvs 说这是新动作最该调的旋钮），或判别器 lr 比策略快太多。把 GP 系数从 0.1 往 5–10 试，确认回放池还在。'
      };
    }
    if (scene === 'discweak') {
      return {
        tone: 'frozen',
        text:
          '**判别器过弱**：真假 logit 很快都塌到 0，准确率两边 ≈ 50%。$r^S$ 一上来就 **0.75**（$D=0$ 时代入 LSGAN 式），看起来像学会了，其实判别器已经不会打分。GP 系数太大把判别器抹平了。减小 `disc_grad_penalty`，先让它能分开真假。'
      };
    }
    if (scene === 'collapse') {
      return {
        tone: 'frozen',
        text:
          '**模式崩塌**：$r^S$、D、准确率都走健康曲线，任务分却停在 ~0.5，速度覆盖卡在 ~0.40 —— 策略只会数据集里最好学的那种走。TensorBoard 上看不出来，要打开回放或盯 $v^*$ 扫描。混入更多片段、定期重采样，或把多样性惩罚（ASE 会做）加上。'
      };
    }
    if (scene === 'taskwin') {
      return {
        tone: 'frozen',
        text:
          '**任务压垮风格**：$r^G$ 可以到 0.92，速度覆盖也铺开，但 $r^S$ 贴地、D(假) 停在 −0.7，判别器一直轻易分清。$w^G$ 太大或 `task_reward_weight` 把风格项挤没了。策略用怪动作跟住了 $v^*$。把 $w^S$ 拉回 0.5，从第一天起同时记两条奖励。'
      };
    }
    return {
      tone: 'frozen',
      text:
        '**只有风格**：$r^S$ 和 D 都健康，但 $r^G$ 停在 ~0.20，速度覆盖停在数据集的几个峰上 —— 跟不住随机 $v^*$。MimicKit 默认 `task_reward_weight: 0.0` 就是这个模式；Target Heading 要把 $w^G$ 拨到 0.5。和 DeepMimic 的「只有模仿」是同一类事故。'
    };
  }

  function buildCurvesDemo(host) {
    var root = card(host, {
      title: '训练曲线怎么读：点一种病历，对照 TensorBoard 上那几条线',
      sub:
        '示意曲线锚定「第 4 步：训练进展」的 Target Heading 阶段表（D(假) −1 → 0，$r^S$ 0 → 0.75，$r^G$ 0.12 → 0.88）。' +
        '风格奖励用和上面那个演示同一个 `styleReward()`。这是为了讲机制画的示意图，数值不能和某一次真实训练直接比。'
    });

    var state = { scene: 'healthy', iter: 50 };
    var cache = {};

    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '病历',
      value: 'healthy',
      items: CURVE_SCENES.map(function (s) {
        return { label: s.label, value: s.id };
      }),
      onPick: function (v) {
        state.scene = v;
        render();
      }
    });
    var ctrls2 = controlsRow(root);
    var iterSlider = slider(ctrls2, {
      label: '看第几百万样本',
      min: 0,
      max: CURVE_ITERS,
      step: 2,
      value: state.iter,
      format: function (v) {
        return String(Math.round(v));
      },
      onInput: function (v) {
        state.iter = v;
        render();
      }
    });

    var setLegend = legend(root, [
      { key: 'accent', text: '当前病历' },
      { key: 'good', text: '健康对照 / D(真) / 任务奖励（虚线）' },
      { key: 'warn', text: '速度覆盖' },
      { key: 'muted', text: 'GP 健康带 [0.6, 1.6] · D = 0 均衡' }
    ]);

    var grid = stageGrid(root);
    var rewardStage = stage(grid, 200);
    var logitStage = stage(grid, 200);
    var accStage = stage(grid, 200);
    var gpStage = stage(grid, 200);

    var stats = statsRow(root);
    var sRs = stats.add('风格奖励 r^S');
    var sRg = stats.add('任务奖励 r^G');
    var sDa = stats.add('D(假)');
    var sDd = stats.add('D(真)');
    var sAa = stats.add('agent 准确率');
    var sDaAcc = stats.add('demo 准确率');
    var sGp = stats.add('梯度惩罚');
    var sCv = stats.add('速度覆盖');
    var verdict = verdictBox(root);
    var tb = table(root);

    note(root, [
      '**怎么用**：先点「健康」看四张图的标准形态，再换病历 —— $r^S$ 贴地时，D(假) 一定先钉在 −1；$r^S$ 一上来就是 0.75 时，准确率一定先变成 50%。**模式崩塌**是特例：上面三张图都好看，只有速度覆盖揭穿它。',
      '**健康带**：logit 图画了 $D=0$ 的均衡线（LSGAN 真假目标是 +1 / −1，Nash 均衡在中点）；GP 图画了 $[0.6,\\ 1.6]$。线跑出色带，比盯某一个 loss 数字更有用。',
      '**这是简化模型**：曲线形状按笔记里的三阶段表手绘，用来练「几条线一起看」；真实 TensorBoard 噪声更大。PPO 的 KL / clip 读法见 PPO 笔记，AMP 的 clip 是 **0.02**。'
    ]);

    function ptsOf(series, key) {
      return series.xs.map(function (x, i) {
        return [x, series.rows[i][key]];
      });
    }

    function drawLinePlot(st, title, yDomain, series, specs, cursorY, yFmtDigits, band, zeroLine) {
      var g = begin(st);
      var P = g.P;
      var p = plot(g, { l: 44, r: 12, t: 18, b: 30 }, [0, CURVE_ITERS], yDomain);
      if (band) {
        g.ctx.save();
        g.ctx.globalAlpha = 0.12;
        g.ctx.fillStyle = P.good;
        var yTop = p.sy(band[1]);
        g.ctx.fillRect(p.x0, yTop, p.x1 - p.x0, p.sy(band[0]) - yTop);
        g.ctx.restore();
      }
      axes(g, p, {
        xTicks: [0, 50, 100, 150, 200],
        yTicks: niceTicks(yDomain[0], yDomain[1], 4),
        xFmt: function (v) {
          return String(v);
        },
        yFmt: function (v) {
          return fmt(v, yFmtDigits);
        },
        xLabel: '样本（百万）'
      });
      text(g.ctx, title, p.x0, p.y1 - 6, P.muted, 'left', '11px sans-serif');
      if (zeroLine && yDomain[0] < 0 && yDomain[1] > 0) {
        line(g.ctx, [[p.x0, p.sy(0)], [p.x1, p.sy(0)]], P.border, 1, [4, 4]);
      }
      specs.forEach(function (sp) {
        var src = sp.series || series;
        var raw = ptsOf(src, sp.key);
        line(
          g.ctx,
          raw.map(function (q) {
            return [p.sx(q[0]), p.sy(q[1])];
          }),
          P[sp.color] || sp.color,
          sp.width || 2.2,
          sp.dash
        );
      });
      var x = state.iter;
      line(g.ctx, [[p.sx(x), p.y0], [p.sx(x), p.y1]], P.text, 1, [3, 3]);
      if (cursorY != null) {
        dot(g.ctx, p.sx(x), p.sy(cursorY), 4.5, P.accent, P.surface2);
      }
      return P;
    }

    var render = registerRenderer(function () {
      if (!cache[state.scene]) cache[state.scene] = curveSeries(state.scene);
      if (!cache.healthy) cache.healthy = curveSeries('healthy');
      var series = cache[state.scene];
      var healthy = cache.healthy;
      var m = curveAt(state.scene, state.iter);
      var judge = judgeCurves(m, state.scene, state.iter);
      var P0 = null;
      var dashH =
        state.scene === 'healthy'
          ? []
          : [{ key: 'rS', color: 'good', width: 1.5, dash: [5, 4], series: healthy }];

      P0 = drawLinePlot(
        rewardStage,
        '风格奖励（蓝）与任务奖励（绿）',
        [0, 1.05],
        series,
        [{ key: 'rS', color: 'accent', width: 2.4 }]
          .concat(dashH)
          .concat([{ key: 'rG', color: 'good', width: 2, dash: [4, 3] }]),
        m.rS,
        2
      );

      drawLinePlot(
        logitStage,
        'D(假)（蓝）与 D(真)（绿）；虚线 = 均衡 0',
        [-1.35, 1.25],
        series,
        [
          { key: 'dAgent', color: 'accent', width: 2.4 },
          { key: 'dDemo', color: 'good', width: 2 }
        ].concat(
          state.scene === 'healthy'
            ? []
            : [{ key: 'dAgent', color: 'muted', width: 1.3, dash: [5, 4], series: healthy }]
        ),
        m.dAgent,
        2,
        null,
        true
      );

      drawLinePlot(
        accStage,
        'agent 准确率（蓝）与 demo 准确率（绿）',
        [0.4, 1.05],
        series,
        [
          { key: 'agentAcc', color: 'accent', width: 2.3 },
          { key: 'demoAcc', color: 'good', width: 2 }
        ],
        m.agentAcc,
        2
      );

      var gpHi = state.scene === 'discstrong' ? 8 : 2.4;
      drawLinePlot(
        gpStage,
        '梯度惩罚（蓝）与速度覆盖（橙）',
        [0, gpHi],
        series,
        [
          { key: 'gp', color: 'accent', width: 2.3 },
          { key: 'cover', color: 'warn', width: 2, dash: [4, 3] }
        ],
        m.gp,
        2,
        state.scene === 'discstrong' ? null : [CURVE_GP_LO, CURVE_GP_HI]
      );

      sRs.set(fmt(m.rS, 2), toneOf(judge.rS.kind));
      sRg.set(fmt(m.rG, 2), toneOf(judge.rG.kind));
      sDa.set(fmt(m.dAgent, 2), toneOf(judge.dAgent.kind));
      sDd.set(fmt(m.dDemo, 2), 'good');
      sAa.set(Math.round(m.agentAcc * 100) + '%', toneOf(judge.acc.kind));
      sDaAcc.set(Math.round(m.demoAcc * 100) + '%', toneOf(judge.acc.kind));
      sGp.set(fmt(m.gp, 2), toneOf(judge.gp.kind));
      sCv.set(Math.round(m.cover * 100) + '%', toneOf(judge.cover.kind));

      var v = curveVerdict(state.scene);
      verdict.set(v.text, v.tone);

      tb.clear();
      tb.row([{ text: '指标' }, { text: '当前值' }, { text: '好方向' }, { text: '这一刻' }], true);
      var rows = [
        ['风格奖励 r^S', fmt(m.rS, 2), '0 → 0.75（D→0）', judge.rS],
        ['任务奖励 r^G', fmt(m.rG, 2), '越高越好* → ~0.88', judge.rG],
        ['D(假)', fmt(m.dAgent, 2), '−1 → 0', judge.dAgent],
        ['agent 准确率', Math.round(m.agentAcc * 100) + '%', '99% → ~55%', judge.acc],
        ['梯度惩罚', fmt(m.gp, 2), '看区间 ~1', judge.gp],
        ['速度覆盖', Math.round(m.cover * 100) + '%', '1–5 m/s 铺开', judge.cover]
      ];
      rows.forEach(function (r) {
        tb.row([
          { text: r[0] },
          { text: r[1], cls: 'is-' + toneOf(r[3].kind) },
          { text: r[2] },
          { text: r[3].text, cls: 'is-' + toneOf(r[3].kind) }
        ]);
      });

      if (P0) setLegend(P0);
      rewardStage.canvas.setAttribute(
        'aria-label',
        '风格与任务奖励曲线，当前 ' + Math.round(state.iter) + ' 百万样本，rS ' + fmt(m.rS, 2)
      );
      logitStage.canvas.setAttribute('aria-label', '判别器 logit，D假 ' + fmt(m.dAgent, 2) + '，D真 ' + fmt(m.dDemo, 2));
      accStage.canvas.setAttribute(
        'aria-label',
        '判别器准确率，agent ' + Math.round(m.agentAcc * 100) + '%，demo ' + Math.round(m.demoAcc * 100) + '%'
      );
      gpStage.canvas.setAttribute(
        'aria-label',
        '梯度惩罚 ' + fmt(m.gp, 2) + '，速度覆盖 ' + Math.round(m.cover * 100) + '%'
      );
    });

    render();
    iterSlider.refresh();
  }

  // ─── demo 5: the five-scene explainer animation ──────────────────────────
  /* A narrated storyboard of the whole method — 逐帧 vs 分布 → 判别器 loss →
     LSGAN 风格奖励 → 换数据集就换风格 → 训练闭环. Every number on screen comes
     from somewhere else in this note: the loss row reuses DISC_SAMPLES above
     (正文「数值例子」那 4 个样本), the reward curve is the same styleReward()
     the interactive demo plots, and the hyper-parameters are 论文 Table 4 /
     MimicKit 的 yaml 那两张表.

     The player (scene chips, clock, cue track, autoplay-on-scroll) is the
     shared K.explainer in kit.js; only the storyboard itself lives here. */

  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    paint = K.paint,
    seg = K.seg,
    ease = K.ease,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
    stickFigure = K.stickFigure,
    poseWalk = K.poseWalk,
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

  var TAU = Math.PI * 2;

  /* ── scene 1: tracking a trajectory vs matching a distribution ── */
  var FRAME_X = [72, 134, 196, 258, 320];

  function buildSceneWhy() {
    var s = sceneSvg('左边 DeepMimic 把仿真的第 t 帧钉在参考的第 t 帧上；右边 AMP 只要求策略产生的状态转移落进参考数据的分布里');

    [[40, C_SURFACE2], [415, C_SURFACE2]].forEach(function (p) {
      s.appendChild(paint(svgEl('rect', { x: p[0], y: 56, width: 345, height: 300, rx: 8, 'stroke-width': 1 }), p[1], C_BORDER));
    });

    s.appendChild(svgText(212, 80, 'DeepMimic：逐帧对齐一条轨迹', 'demo-x-bad', 13.5, 'middle'));
    s.appendChild(svgMath(212, 100, '\\text{得知道「现在该是第几帧」→ 需要相位 } \\varphi',
      { size: 11, anchor: 'middle', cls: 'demo-x-mut', w: 300 }));

    /* left: two rows of frames, wired index to index */
    var pairs = FRAME_X.map(function (x, i) {
      var g = svgEl('g', {});
      [[140, '\\hat{q}', C_MUTED], [236, 'q', C_BAD]].forEach(function (row, r) {
        g.appendChild(paint(svgEl('rect', { x: x - 22, y: row[0], width: 44, height: 30, rx: 4, 'stroke-width': 1.4 }), C_SURFACE, r ? C_BAD : C_BORDER));
        g.appendChild(svgMath(x, row[0] + 20, row[1] + '_{' + i + '}', { size: 12, anchor: 'middle', w: 44 })
          .setTone(r ? C_BAD : C_MUTED));
      });
      var link = paint(svgEl('line', { x1: x, y1: 170, x2: x, y2: 236, 'stroke-width': 1.6, 'stroke-dasharray': '4 3' }), null, C_BAD);
      g.appendChild(link);
      s.appendChild(g);
      return { g: g, at: 1.2 + i * 0.5 };
    });
    s.appendChild(svgText(50, 128, '参考动捕', 'demo-x-mut', 10.5));
    s.appendChild(svgText(50, 224, '仿真角色', 'demo-x-mut', 10.5));
    var leftTag = svgText(212, 306, '帧 t 必须对上帧 t —— 参考有噪声也照抄', 'demo-x-bad', 11.5, 'middle');
    var leftTag2 = svgText(212, 328, '多段不同风格的片段没法混在一起用', 'demo-x-bad', 11.5, 'middle');
    s.appendChild(leftTag);
    s.appendChild(leftTag2);

    s.appendChild(svgText(587, 80, 'AMP：匹配一整个分布', 'demo-x-acc', 13.5, 'middle'));
    s.appendChild(svgMath(587, 100, '\\text{判别器只看一步转移 } (s_t, s_{t+1})',
      { size: 11, anchor: 'middle', cls: 'demo-x-mut', w: 280 }));

    /* right: the reference transitions as a cloud, policy transitions walking in */
    var BOX = { x: 440, y: 122, w: 300, h: 168 };
    s.appendChild(paint(svgEl('rect', { x: BOX.x, y: BOX.y, width: BOX.w, height: BOX.h, rx: 6, 'stroke-width': 1 }), C_SURFACE, C_BORDER));
    s.appendChild(svgMath(BOX.x + 8, BOX.y + 16, '\\text{运动特征空间 } \\Phi(s), \\Phi(s\')',
      { size: 10.5, cls: 'demo-x-mut', w: 200 }));

    var rng = mulberry32(7);
    var blobs = [[0.32, 0.62], [0.62, 0.36], [0.5, 0.75]];
    blobs.forEach(function (b) {
      s.appendChild(paint(svgEl('ellipse', {
        cx: BOX.x + b[0] * BOX.w, cy: BOX.y + b[1] * BOX.h, rx: 46, ry: 32,
        'stroke-width': 1.2, 'stroke-dasharray': '5 4', opacity: 0.55
      }), 'none', C_MUTED));
    });
    for (var i = 0; i < 54; i++) {
      var b = blobs[i % blobs.length];
      var a = rng() * TAU, rad = Math.sqrt(rng());
      s.appendChild(paint(svgEl('circle', {
        cx: (BOX.x + b[0] * BOX.w + Math.cos(a) * rad * 40).toFixed(1),
        cy: (BOX.y + b[1] * BOX.h + Math.sin(a) * rad * 27).toFixed(1),
        r: 2.6, opacity: 0.5
      }), C_MUTED));
    }
    s.appendChild(svgMath(BOX.x + BOX.w - 8, BOX.y + BOX.h - 10, '\\text{灰点 = 参考数据的转移分布 } d^M',
      { size: 10.5, anchor: 'end', cls: 'demo-x-mut', w: 240 }));

    var movers = [];
    for (i = 0; i < 9; i++) {
      var tb = blobs[i % blobs.length];
      var ta = rng() * TAU, tr = Math.sqrt(rng());
      movers.push({
        node: paint(svgEl('circle', { cx: 0, cy: 0, r: 4 }), C_ACCENT),
        from: [BOX.x + (0.06 + 0.18 * rng()) * BOX.w, BOX.y + (0.05 + 0.22 * rng()) * BOX.h],
        to: [BOX.x + tb[0] * BOX.w + Math.cos(ta) * tr * 36, BOX.y + tb[1] * BOX.h + Math.sin(ta) * tr * 24],
        lag: i * 0.16
      });
      s.appendChild(movers[i].node);
    }

    var rightTag = svgText(587, 306, '不问「第几帧」，只问「这一步像不像数据里的某一步」', 'demo-x-acc', 11.5, 'middle');
    var rightTag2 = svgText(587, 328, '所以能混多段片段，也能走出参考里没有的新组合', 'demo-x-acc', 11.5, 'middle');
    s.appendChild(rightTag);
    s.appendChild(rightTag2);

    var foot = svgEl('g', {});
    foot.appendChild(svgText(400, 384, 'DeepMimic 匹配「轨迹」，AMP 匹配「分布」', 'demo-x-acc', 18, 'middle'));
    foot.appendChild(svgText(400, 406, '临摹字帖 vs 学会一种字体 —— 后者能写出原帖里没有的字', 'demo-x-mut', 11.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      pairs.forEach(function (p) { setOpacity(p.g, seg(t, p.at, p.at + 0.5)); });
      setOpacity(leftTag, seg(t, 4.2, 4.9));
      setOpacity(leftTag2, seg(t, 5.2, 5.9));

      var on = seg(t, 6.6, 7.4);
      movers.forEach(function (m) {
        var u = ease(seg(t, 7.6 + m.lag, 10.6 + m.lag));
        m.node.setAttribute('cx', (m.from[0] + (m.to[0] - m.from[0]) * u).toFixed(1));
        m.node.setAttribute('cy', (m.from[1] + (m.to[1] - m.from[1]) * u).toFixed(1));
        setOpacity(m.node, on);
      });
      setOpacity(rightTag, seg(t, 10.8, 11.5));
      setOpacity(rightTag2, seg(t, 11.6, 12.3));
      setOpacity(foot, seg(t, 12.4, 13.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 2: the discriminator loss on the note's 4-sample example ── */
  var L_BAR_X = 452, L_BAR_W = 190, L_ROW_Y = [132, 176, 220, 264];

  function buildSceneLoss() {
    var s = sceneSvg('正文那 4 个样本的判别器 loss：真样本贡献 −log D，假样本贡献 −log(1−D)，两项平均后总 loss ≈ 1.147');
    s.appendChild(svgText(60, 48, '判别器当前对一批 4 个样本的打分（正文「数值例子」）', 'demo-x-ink2', 13.5));

    [{ x: 60, s: '样本', at: 'start' }, { x: 150, s: '来源', at: 'start' },
      { x: 340, s: 'D_\\psi', at: 'middle', tex: true }, { x: 398, s: '期望', at: 'middle' },
      { x: L_BAR_X, s: '这条样本的 loss 贡献', at: 'start' }
    ].forEach(function (c) {
      s.appendChild(c.tex
        ? svgMath(c.x, 96, c.s, { size: 11.5, anchor: c.at, cls: 'demo-x-mut', w: 80 })
        : svgText(c.x, 96, c.s, 'demo-x-mut', 11.5, c.at));
    });
    s.appendChild(paint(svgEl('line', { x1: 60, y1: 104, x2: 740, y2: 104, 'stroke-width': 1 }), null, C_BORDER));

    var LOSS_SCALE = L_BAR_W / 1.3;
    var rows = DISC_SAMPLES.map(function (sample, i) {
      var y = L_ROW_Y[i];
      var g = svgEl('g', {});
      var loss = sample.real ? -Math.log(sample.d) : -Math.log(1 - sample.d);
      var color = sample.real ? C_GOOD : C_WARN;
      g.appendChild(paint(svgText(60, y, sample.name, 'demo-x-mono', 12.5), color));
      g.appendChild(svgText(150, y, sample.label, 'demo-x-mut', 11));
      var dTx = svgText(340, y, sample.d.toFixed(1), 'demo-x-mono demo-x-ink2', 13, 'middle');
      dTx.setAttribute('font-weight', '700');
      g.appendChild(dTx);
      g.appendChild(svgMath(398, y, sample.real ? '\\to 1' : '\\to 0',
        { size: 11.5, anchor: 'middle', cls: 'demo-x-mut', w: 50 }));
      g.appendChild(paint(svgEl('rect', { x: L_BAR_X, y: y - 13, width: L_BAR_W, height: 17, rx: 2, opacity: 0.18 }), C_MUTED));
      var bar = paint(svgEl('rect', { x: L_BAR_X, y: y - 13, width: 0, height: 17, rx: 2 }), color);
      g.appendChild(bar);
      var tx = svgMath(L_BAR_X + 8, y, '', { size: 11.5, w: 200 }).setTone(color);
      g.appendChild(tx);
      s.appendChild(g);
      return {
        g: g, bar: bar, tx: tx, loss: loss, real: sample.real,
        expr: (sample.real ? '-\\log(' + sample.d.toFixed(1) + ')' : '-\\log(1 - ' + sample.d.toFixed(1) + ')') +
          ' = ' + loss.toFixed(3),
        at: 1.6 + i * 2.1
      };
    });

    function mean(real) {
      var hit = rows.filter(function (r) { return r.real === real; });
      return hit.reduce(function (a, r) { return a + r.loss; }, 0) / hit.length;
    }
    var term1 = mean(true), term2 = mean(false);

    s.appendChild(paint(svgEl('line', { x1: 60, y1: 288, x2: 740, y2: 288, 'stroke-width': 1 }), null, C_BORDER));

    var sums = [
      { y: 316, label: '第一项（真样本平均）', sub: '-\\mathbb{E}_{d^M}[\\log D]', v: term1, color: C_GOOD },
      { y: 348, label: '第二项（假样本平均）', sub: '-\\mathbb{E}_{d^\\pi}[\\log(1 - D)]', v: term2, color: C_WARN }
    ].map(function (row) {
      var g = svgEl('g', {});
      g.appendChild(svgText(60, row.y, row.label, 'demo-x-ink2', 12));
      g.appendChild(svgMath(230, row.y, row.sub, { size: 11.5, w: 180 }).setTone(C_MUTED));
      g.appendChild(paint(svgEl('rect', { x: L_BAR_X, y: row.y - 13, width: row.v * LOSS_SCALE, height: 17, rx: 2, opacity: 0.85 }), row.color));
      g.appendChild(paint(svgText(L_BAR_X + row.v * LOSS_SCALE + 8, row.y, row.v.toFixed(3), 'demo-x-mono', 12.5), row.color));
      s.appendChild(g);
      return g;
    });

    var totalG = svgEl('g', {});
    totalG.appendChild(svgMath(60, 388,
      '\\text{总 loss} = ' + term1.toFixed(3) + ' + ' + term2.toFixed(3) + ' =',
      { size: 13, cls: 'demo-x-ink2', w: 240 }));
    var totalTx = svgText(300, 390, (term1 + term2).toFixed(3), 'demo-x-mono demo-x-acc', 21);
    totalTx.setAttribute('font-weight', '700');
    totalG.appendChild(totalTx);
    totalG.appendChild(svgText(400, 388, '梯度下降会把「真」推高、把「假」压低', 'demo-x-mut', 11.5));
    s.appendChild(totalG);

    var worst = rows.reduce(function (a, r) { return r.loss > a.loss ? r : a; });
    var spot = paint(svgEl('rect', { x: 52, y: L_ROW_Y[3] - 18, width: 696, height: 27, rx: 4, 'stroke-width': 1.5 }), 'none', C_BAD);
    s.appendChild(spot);

    function draw(t) {
      rows.forEach(function (row) {
        var u = ease(seg(t, row.at, row.at + 1.2));
        setOpacity(row.g, seg(t, row.at - 0.4, row.at + 0.1));
        var w = row.loss * LOSS_SCALE * u;
        row.bar.setAttribute('width', w.toFixed(1));
        row.tx.setX(L_BAR_X + w + 8);
        row.tx.setTex(u > 0.9 ? row.expr : '');
      });
      setOpacity(sums[0], seg(t, 10.4, 11.2));
      setOpacity(sums[1], seg(t, 11.6, 12.4));
      setOpacity(totalG, seg(t, 12.8, 13.6));
      setOpacity(spot, worst.real ? 0 : seg(t, 8.4, 9.0) * (0.55 + 0.45 * Math.sin(t * 3)));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 3: discriminator score → style reward ──
     Same styleReward() the interactive amp-reward demo plots, so the two can
     never disagree. */
  var P = { x0: 92, x1: 556, y0: 96, y1: 312, dLo: -2, dHi: 3, rLo: 0, rHi: 3 };

  function px(d) {
    return P.x0 + ((d - P.dLo) / (P.dHi - P.dLo)) * (P.x1 - P.x0);
  }

  function py(r) {
    return P.y1 - ((r - P.rLo) / (P.rHi - P.rLo)) * (P.y1 - P.y0);
  }

  function curvePath(f, dLo, dHi) {
    var pts = [];
    for (var i = 0; i <= 160; i++) {
      var d = dLo + ((dHi - dLo) * i) / 160;
      var r = f(d);
      if (!isFinite(r)) continue;
      pts.push([px(d), py(Math.min(r, P.rHi))]);
    }
    return polyPath(pts);
  }

  function buildSceneReward() {
    var s = sceneSvg('判别器打分 D 到风格奖励的两条曲线：论文实现的 LSGAN 形式在 D=1 处封顶 1、D≤−1 处归零，log 形式则在 D→1 时冲向无穷');
    s.appendChild(svgMath(60, 46, '\\text{判别器的一个标量打分，怎么变成策略拿到的风格奖励 } r^S',
      { size: 13.5, cls: 'demo-x-ink2', w: 480 }));

    var zero = paint(svgEl('rect', { x: px(-2), y: P.y0, width: px(-1) - px(-2), height: P.y1 - P.y0 }), C_BAD);
    zero.style.fillOpacity = '0.16';
    s.appendChild(zero);

    /* axes */
    s.appendChild(paint(svgEl('line', { x1: P.x0, y1: P.y1, x2: P.x1, y2: P.y1, 'stroke-width': 1.2 }), null, C_BORDER));
    s.appendChild(paint(svgEl('line', { x1: px(0), y1: P.y0, x2: px(0), y2: P.y1, 'stroke-width': 1, 'stroke-dasharray': '3 4' }), null, C_BORDER));
    [-2, -1, 0, 1, 2, 3].forEach(function (d) {
      s.appendChild(svgText(px(d), P.y1 + 18, String(d), 'demo-x-mono demo-x-mut', 11, 'middle'));
    });
    [0, 1, 2, 3].forEach(function (r) {
      s.appendChild(svgText(P.x0 - 10, py(r) + 4, String(r), 'demo-x-mono demo-x-mut', 11, 'end'));
      if (r) s.appendChild(paint(svgEl('line', { x1: P.x0, y1: py(r), x2: P.x1, y2: py(r), 'stroke-width': 1, opacity: 0.35 }), null, C_BORDER));
    });
    s.appendChild(svgMath(P.x1, P.y1 + 34, '\\text{判别器输出 } D \\to', { size: 11, anchor: 'end', cls: 'demo-x-mut', w: 140 }));
    s.appendChild(svgMath(P.x0 - 10, P.y0 - 10, 'r^S', { size: 11, anchor: 'end', cls: 'demo-x-mut', w: 40 }));

    var lsPath = paint(svgEl('path', { d: curvePath(styleReward, -2, 3), fill: 'none', 'stroke-width': 3 }), null, C_ACCENT);
    var logPath = paint(svgEl('path', {
      d: curvePath(function (d) { return d > 0 && d < 1 ? -Math.log(1 - d) : NaN; }, 0.001, 0.97),
      fill: 'none', 'stroke-width': 2.4, 'stroke-dasharray': '6 4'
    }), null, C_WARN);
    s.appendChild(logPath);
    s.appendChild(lsPath);

    var lsLab = paint(svgText(px(1.62), py(0.46), 'LSGAN（论文实现）', 'demo-x-mono', 12, 'middle'), C_ACCENT);
    var lsLab2 = svgMath(px(1.62), py(0.29), 'r^S = \\max[0,\\ 1 - 0.25(D - 1)^2]',
      { size: 11.5, anchor: 'middle', w: 240 }).setTone(C_ACCENT);
    var logLab = paint(svgText(px(1.1), py(2.74), 'log 形式（讲直觉用）', 'demo-x-mono', 12), C_WARN);
    var logLab2 = svgMath(px(1.1), py(2.52), 'r = -\\log(1 - D) \\text{ → } D \\to 1 \\text{ 时冲向 } \\infty',
      { size: 11.5, w: 280 }).setTone(C_WARN);
    [lsLab, lsLab2].forEach(function (n) { s.appendChild(n); });
    [logLab, logLab2].forEach(function (n) { s.appendChild(n); });

    var marks = [
      { d: -1, r: 0, tx: 'D = -1 \\to r^S = 0', c: C_BAD, dy: -14 },
      { d: 1, r: 1, tx: 'D = 1 \\text{：被当成真数据} \\to r^S = 1 \\text{（满分）}', c: C_GOOD, dy: -16 }
    ].map(function (m) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('circle', { cx: px(m.d), cy: py(m.r), r: 5 }), m.c));
      g.appendChild(svgMath(px(m.d) + 10, py(m.r) + m.dy, m.tx, { size: 11.5, w: 280 }).setTone(m.c));
      s.appendChild(g);
      return g;
    });

    var zeroLab = paint(svgText(px(-1.5), P.y0 + 22, '零奖励区', null, 11.5, 'middle'), C_BAD);
    var zeroLab2 = paint(svgText(px(-1.5), P.y0 + 40, '奖励和梯度', null, 10.5, 'middle'), C_BAD);
    var zeroLab3 = paint(svgText(px(-1.5), P.y0 + 54, '一起消失', null, 10.5, 'middle'), C_BAD);
    [zeroLab, zeroLab2, zeroLab3].forEach(function (n) { s.appendChild(n); });

    /* side panel: how the two rewards are mixed */
    var side = svgEl('g', {});
    side.appendChild(paint(svgEl('rect', { x: 588, y: 96, width: 172, height: 216, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    side.appendChild(svgText(674, 122, '策略拿到的总奖励', 'demo-x-ink2', 12, 'middle'));
    [['r^S \\; \\text{风格}', '\\text{判别器给的}', C_ACCENT, 150],
      ['r^G \\; \\text{任务}', '\\exp(-0.25(v^* - v)^2)', C_GOOD, 206]
    ].forEach(function (row) {
      side.appendChild(svgMath(674, row[3], row[0], { size: 13, anchor: 'middle', w: 160 }).setTone(row[2]));
      side.appendChild(svgMath(674, row[3] + 17, row[1], { size: 10.5, anchor: 'middle', cls: 'demo-x-mut', w: 160 }));
      side.appendChild(paint(svgText(674, row[3] + 34, '× 0.5', 'demo-x-mono', 12, 'middle'), C_MUTED));
    });
    side.appendChild(paint(svgEl('line', { x1: 608, y1: 258, x2: 740, y2: 258, 'stroke-width': 1 }), null, C_BORDER));
    side.appendChild(svgMath(674, 286, 'r = 0.5\\,r^S + 0.5\\,r^G', { size: 12, anchor: 'middle', w: 170 }).setTone(C_ACCENT));
    side.appendChild(svgMath(674, 302, '\\text{论文 Table 4 的 } w^S / w^G',
      { size: 10, anchor: 'middle', cls: 'demo-x-mut', w: 170 }));
    s.appendChild(side);

    var foot = svgText(60, 372, '换成 LSGAN 之后，奖励有上下界、梯度不会在 D→0 或 D→1 时爆炸 —— 对抗训练里这一点比「理论更漂亮」重要得多。', 'demo-x-mut', 12);
    var foot2 = svgText(60, 396, '代价是训练最初期整批数据都躺在 D ≤ −1 的零奖励区，得靠提前终止和「判别器被策略追上」把信号重新拉出来。', 'demo-x-warn', 12);
    s.appendChild(foot);
    s.appendChild(foot2);

    function draw(t) {
      var u = ease(seg(t, 0.8, 3.4));
      lsPath.setAttribute('d', curvePath(function (d) { return styleReward(d); }, -2, -2 + 5 * u));
      setOpacity(lsLab, seg(t, 3.4, 4.0));
      setOpacity(lsLab2, seg(t, 3.4, 4.0));
      setOpacity(marks[1], seg(t, 4.2, 4.8));
      setOpacity(marks[0], seg(t, 5.6, 6.2));
      setOpacity(zero, seg(t, 5.6, 6.2) * 0.9);
      [zeroLab, zeroLab2, zeroLab3].forEach(function (n) { setOpacity(n, seg(t, 6.0, 6.6)); });
      setOpacity(logPath, seg(t, 7.6, 8.4));
      setOpacity(logLab, seg(t, 7.8, 8.6));
      setOpacity(logLab2, seg(t, 7.8, 8.6));
      setOpacity(side, seg(t, 10.2, 11.0));
      setOpacity(foot, seg(t, 12.0, 12.7));
      setOpacity(foot2, seg(t, 13.2, 13.9));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 4: same task reward, different dataset, different style ──
     The three behaviours are the note's 第 0 步 table (Locomotion / Zombie /
     Stealthy); the gait bands are the 1–2 / 2–3 / 3–5 m/s split quoted from
     论文 Figure 4. The figures themselves are schematic, not simulated. */
  function poseRun(ph) {
    var s = Math.sin(ph * TAU), c = Math.cos(ph * TAU);
    return {
      lean: 17,
      armA: [-44 * s - 10, -44 * s - 52],
      armB: [44 * s + 10, 44 * s + 66],
      legA: [40 * s, 40 * s - 66 * Math.max(0, c)],
      legB: [-40 * s, -40 * s - 66 * Math.max(0, -c)]
    };
  }

  function poseJog(ph) {
    var s = Math.sin(ph * TAU), c = Math.cos(ph * TAU);
    return {
      lean: 11,
      armA: [-32 * s - 9, -32 * s - 18],
      armB: [32 * s + 9, 32 * s + 48],
      legA: [30 * s, 30 * s - 46 * Math.max(0, c)],
      legB: [-30 * s, -30 * s - 46 * Math.max(0, -c)]
    };
  }

  /* 僵尸：手臂僵直前伸、膝盖几乎不弯、拖着脚走。 */
  function poseZombie(ph) {
    var s = Math.sin(ph * TAU);
    return {
      lean: -4,
      armA: [88, 92],
      armB: [92, 96],
      legA: [11 * s, 11 * s - 4],
      legB: [-11 * s, -11 * s - 4]
    };
  }

  /* 潜行：弯腰压低重心、膝盖一直半蹲、步子小。 */
  function poseStealth(ph) {
    var s = Math.sin(ph * TAU);
    return {
      lean: 38,
      armA: [56, 96],
      armB: [40, 88],
      legA: [30 + 14 * s, -18 + 14 * s],
      legB: [-6 + 14 * s, -52 + 14 * s]
    };
  }

  var STYLE_LANES = [
    { cx: 158, name: 'Locomotion（走 + 跑混合）', goal: 'v^* \\in [1, 5]\\ \\mathrm{m/s}', color: C_ACCENT,
      tag: '低速走、中速慢跑、高速跑，自动切换步态' },
    { cx: 400, name: 'Zombie（僵尸）', goal: 'v^* = 1\\ \\mathrm{m/s}', color: C_WARN,
      tag: '拖着脚走、手臂僵直前伸，典型丧尸步态' },
    { cx: 642, name: 'Stealthy（潜行）', goal: 'v^* = 1\\ \\mathrm{m/s}', color: C_GOOD,
      tag: '弯腰低姿态前进，脚步轻柔' }
  ];

  var SWEEP_X0 = 120, SWEEP_X1 = 700, SWEEP_Y = 368, SWEEP_LO = 0.6, SWEEP_HI = 5;

  function sweepX(v) {
    return SWEEP_X0 + ((v - SWEEP_LO) / (SWEEP_HI - SWEEP_LO)) * (SWEEP_X1 - SWEEP_X0);
  }

  function buildSceneStyle() {
    var s = sceneSvg('同一个 Target Heading 任务奖励配三个不同的参考数据集，学出走跑混合、僵尸、潜行三种风格；混合数据集还会随目标速度自动切换步态');

    var head = svgEl('g', {});
    head.appendChild(paint(svgEl('rect', { x: 196, y: 26, width: 408, height: 36, rx: 18, 'stroke-width': 1.4 }), C_SURFACE2, C_GOOD));
    head.appendChild(svgMath(400, 44, '\\text{任务奖励三组完全相同：} r^G = \\exp(-0.25\\,(v^* - v_{xcom})^2)',
      { size: 12.5, anchor: 'middle', w: 400 }).setTone(C_GOOD));
    head.appendChild(svgText(400, 76, '奖励函数里没有一个字提到姿态、步频、手臂怎么摆 —— 风格全由判别器给', 'demo-x-mut', 11, 'middle'));
    s.appendChild(head);

    var GROUND = 286;
    var lanes = STYLE_LANES.map(function (lane, i) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: lane.cx - 118, y: 92, width: 236, height: 224, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
      g.appendChild(paint(svgText(lane.cx, 114, lane.name, null, 12.5, 'middle'), lane.color));
      g.appendChild(svgMath(lane.cx, 133, lane.goal, { size: 11, anchor: 'middle', w: 200 }).setTone(C_MUTED));
      g.appendChild(paint(svgEl('line', { x1: lane.cx - 96, y1: GROUND, x2: lane.cx + 96, y2: GROUND, 'stroke-width': 1.4 }), null, C_BORDER));
      g.appendChild(paint(svgText(lane.cx, 302, lane.tag, null, 10.5, 'middle'), lane.color));
      s.appendChild(g);
      var fig = stickFigure(lane.color, 2.4);
      var zoomed = svgEl('g', {
        transform: 'translate(' + lane.cx + ' ' + GROUND + ') scale(1.25) translate(' + -lane.cx + ' ' + -GROUND + ')'
      });
      zoomed.appendChild(fig.el);
      s.appendChild(zoomed);
      return { g: g, wrap: zoomed, fig: fig, cx: lane.cx, at: 1.0 + i * 1.5 };
    });

    var gaitLab = svgMath(60, 340, '\\text{混合数据集下，目标速度 } v^* \\text{ 一扫，步态自己换（论文 Figure 4 右图）}',
      { size: 12, cls: 'demo-x-ink2', w: 560 });
    s.appendChild(gaitLab);

    var bandG = svgEl('g', {});
    var BANDS = [
      { lo: 1, hi: 2, name: '走路', c: C_ACCENT },
      { lo: 2, hi: 3, name: '慢跑', c: C_WARN },
      { lo: 3, hi: 5, name: '跑步', c: C_GOOD }
    ];
    bandG.appendChild(paint(svgEl('rect', { x: SWEEP_X0, y: SWEEP_Y - 13, width: SWEEP_X1 - SWEEP_X0, height: 24, rx: 4, opacity: 0.18 }), C_MUTED));
    BANDS.forEach(function (b) {
      bandG.appendChild(paint(svgEl('rect', { x: sweepX(b.lo), y: SWEEP_Y - 13, width: sweepX(b.hi) - sweepX(b.lo), height: 24, rx: 3, opacity: 0.3 }), b.c));
      bandG.appendChild(paint(svgText((sweepX(b.lo) + sweepX(b.hi)) / 2, SWEEP_Y + 4, b.name, null, 11.5, 'middle'), b.c));
    });
    [1, 2, 3, 4, 5].forEach(function (v) {
      bandG.appendChild(svgText(sweepX(v), SWEEP_Y + 26, v + ' m/s', 'demo-x-mono demo-x-mut', 10, 'middle'));
    });
    s.appendChild(bandG);

    var marker = paint(svgEl('rect', { x: SWEEP_X0 - 2, y: SWEEP_Y - 19, width: 4, height: 36, rx: 2 }), C_ACCENT);
    /* The swept speed changes every frame, so only the `v* =` part is a
       formula; the number stays a text node next to it. */
    var markerLab = svgMath(684, 340, 'v^* =', { size: 12, anchor: 'end', w: 60 }).setTone(C_ACCENT);
    var markerTx = paint(svgText(740, 340, '', 'demo-x-mono', 12, 'end'), C_ACCENT);
    s.appendChild(marker);
    s.appendChild(markerLab);
    s.appendChild(markerTx);

    var foot = paint(svgText(60, 412, '换数据集 = 换风格；判别器就是「风格编码器」，不用往奖励里写一句「膝盖该弯多少」。', null, 12), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      var sweepOn = t >= 8.0;
      var v = SWEEP_LO + (SWEEP_HI - SWEEP_LO) * (sweepOn ? ease(seg(t, 8.0, 13.4)) : 0);
      var ph;

      lanes.forEach(function (lane) {
        setOpacity(lane.g, seg(t, lane.at - 0.4, lane.at + 0.3));
        setOpacity(lane.wrap, seg(t, lane.at, lane.at + 0.6));
      });

      /* lane 0 runs at the swept speed, so 步态切换 is visible; the other two
         are fixed-speed styles (v* = 1 m/s in the paper). */
      ph = (t * (sweepOn ? 0.55 + v * 0.3 : 1.0)) % 1;
      lanes[0].fig.pose(lanes[0].cx, GROUND - (v > 3 ? 48 : v > 2 ? 46 : 44),
        v > 3 ? poseRun(ph) : v > 2 ? poseJog(ph) : poseWalk(ph));
      lanes[1].fig.pose(lanes[1].cx, GROUND - 42, poseZombie((t * 0.55) % 1));
      lanes[2].fig.pose(lanes[2].cx, GROUND - 34, poseStealth((t * 0.6) % 1));

      setOpacity(gaitLab, seg(t, 7.2, 7.9));
      setOpacity(bandG, seg(t, 7.4, 8.1));
      var on = seg(t, 7.8, 8.3);
      setOpacity(marker, on);
      setOpacity(markerLab, on);
      setOpacity(markerTx, on);
      marker.setAttribute('x', (sweepX(v) - 2).toFixed(1));
      markerTx.textContent = v.toFixed(1) + ' m/s';
      setOpacity(foot, seg(t, 13.6, 14.3));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 5: the training loop ── */
  var AMP_NODES = [
    { x: 160, y: 66, w: 216, tTex: '\\text{① 策略 } \\pi_\\theta \\text{ 在仿真里跑}',
      sTex: '\\text{收 4096 步 } (s, a, r, s\')' },
    { x: 486, y: 66, w: 250, tTex: '\\text{② 更新判别器 } D_\\psi', s: '真：动捕 256｜假：策略 + 回放池 256' },
    { x: 680, y: 206, w: 200, tTex: '\\text{③ 风格奖励 } r^S', sTex: '\\max[0,\\ 1 - 0.25(D - 1)^2]' },
    { x: 470, y: 340, w: 244, t: '④ 合成奖励', sTex: 'r = 0.5\\,r^S + 0.5\\,r^G' },
    { x: 168, y: 206, w: 216, tTex: '\\text{⑤ PPO 更新 } \\pi_\\theta', s: 'clip = 0.02（DeepMimic 是 0.2）' }
  ];

  var AMP_EDGES = [
    { pts: [[268, 70], [360, 70]] },
    { pts: [[604, 82], [652, 180]] },
    { pts: [[672, 236], [586, 314]] },
    { pts: [[348, 340], [258, 232]] },
    { pts: [[178, 180], [222, 100]] }
  ];

  var AMP_ET = { pts: [[160, 92], [160, 128], [22, 128], [22, 32], [140, 32], [148, 44]] };

  var AMP_STEPS = [
    { kind: 'node', i: 0, a: 1.0, b: 2.2 },
    { kind: 'edge', i: 0, a: 2.2, b: 2.8 },
    { kind: 'node', i: 1, a: 2.8, b: 5.0 },
    { kind: 'edge', i: 1, a: 5.0, b: 5.6 },
    { kind: 'node', i: 2, a: 5.6, b: 7.0 },
    { kind: 'edge', i: 2, a: 7.0, b: 7.6 },
    { kind: 'node', i: 3, a: 7.6, b: 9.0 },
    { kind: 'edge', i: 3, a: 9.0, b: 9.6 },
    { kind: 'node', i: 4, a: 9.6, b: 11.2 },
    { kind: 'edge', i: 4, a: 11.2, b: 11.8 },
    { kind: 'node', i: 0, a: 11.8, b: 12.6 }
  ];

  function buildSceneLoop() {
    var s = sceneSvg('AMP 训练闭环：策略采样、判别器更新、风格奖励、与任务奖励合成、PPO 更新，摔倒走提前终止那条虚线');
    var arrow = K.arrowMarker(s, 'amp-x-arrow', C_ACCENT);
    var etArrow = K.arrowMarker(s, 'amp-x-arrow-et', C_BAD);

    var etPath = paint(svgEl('path', {
      d: polyPath(AMP_ET.pts), fill: 'none', 'stroke-width': 1.8,
      'stroke-dasharray': '6 5', 'marker-end': etArrow
    }), null, C_BAD);
    s.appendChild(etPath);
    var etLab = paint(svgText(300, 26, 'ET：脚以外任何部位触地 → 终止（翻滚 / 起身这类接触密集任务会关掉）', null, 11, 'start'), C_BAD);
    s.appendChild(etLab);

    var edges = AMP_EDGES.map(function (e) {
      var p = paint(svgEl('path', { d: polyPath(e.pts), fill: 'none', 'stroke-width': 1.8, 'marker-end': arrow }), null, C_MUTED);
      s.appendChild(p);
      return p;
    });

    var boxes = AMP_NODES.map(function (n) {
      var g = svgEl('g', {});
      var rect = paint(svgEl('rect', { x: n.x - n.w / 2, y: n.y - 25, width: n.w, height: 50, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_BORDER);
      g.appendChild(rect);
      g.appendChild(n.tTex
        ? svgMath(n.x, n.y - 4, n.tTex, { size: 12.5, anchor: 'middle', w: n.w })
        : svgText(n.x, n.y - 4, n.t, 'demo-x-mono', 12.5, 'middle'));
      g.appendChild(n.sTex
        ? svgMath(n.x, n.y + 14, n.sTex, { size: 10.5, anchor: 'middle', cls: 'demo-x-mut', w: n.w })
        : svgText(n.x, n.y + 14, n.s, 'demo-x-mut', 10.5, 'middle'));
      s.appendChild(g);
      return { g: g, rect: rect };
    });

    var chips = [
      { x: 455, y: 126, w: 240, tx: '\\text{回放池 } 10^5 \\text{：假样本不只来自当前策略}', c: C_WARN },
      { x: 455, y: 154, w: 240, tx: '\\text{梯度惩罚 } w_{GP} = 10 \\text{，只作用在真数据上}', c: C_WARN },
      { x: 455, y: 182, w: 240, tx: '\\text{判别器看不到任务目标 / 地形高度图}', c: C_MUTED }
    ].map(function (c, i) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: c.x - c.w / 2, y: c.y - 12, width: c.w, height: 24, rx: 12, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), C_SURFACE, c.c));
      g.appendChild(svgMath(c.x, c.y + 4, c.tx, { size: 10.5, anchor: 'middle', w: c.w }).setTone(c.c));
      s.appendChild(g);
      return { g: g, at: 3.2 + i * 0.6 };
    });

    var taskChip = svgEl('g', {});
    taskChip.appendChild(paint(svgEl('rect', { x: 620, y: 300, width: 160, height: 44, rx: 8, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), C_SURFACE, C_GOOD));
    taskChip.appendChild(svgMath(700, 318, '\\text{任务奖励 } r^G', { size: 11.5, anchor: 'middle', w: 150 }).setTone(C_GOOD));
    taskChip.appendChild(svgMath(700, 334, '\\exp(-0.25(v^* - v)^2)', { size: 10.5, anchor: 'middle', w: 150 }).setTone(C_GOOD));
    s.appendChild(taskChip);
    var taskEdge = paint(svgEl('path', { d: polyPath([[620, 322], [594, 322]]), fill: 'none', 'stroke-width': 1.6, 'marker-end': K.arrowMarker(s, 'amp-x-arrow-task', C_GOOD) }), null, C_GOOD);
    s.appendChild(taskEdge);

    var token = paint(svgEl('circle', { cx: -20, cy: -20, r: 6 }), C_ACCENT);
    s.appendChild(token);

    var tail = svgEl('g', {});
    tail.appendChild(paint(svgText(400, 392, 'AMP = PPO + 一个判别器分支', null, 15, 'middle'), C_ACCENT));
    tail.appendChild(svgMath(400, 412,
      '\\text{DeepMimic 的四项 tracking 奖励被换成一个学出来的 } r^S \\text{；1~3 亿样本、30~140 小时}',
      { size: 11, anchor: 'middle', cls: 'demo-x-mut', w: 620 }));
    s.appendChild(tail);

    function draw(t) {
      var lit = -1, reached = -1, actEdge = -1, u = 0;
      AMP_STEPS.forEach(function (st) {
        if (t >= st.a) reached = Math.max(reached, st.i);
        if (t >= st.a && t < st.b) {
          if (st.kind === 'node') lit = st.i;
          else { actEdge = st.i; u = seg(t, st.a, st.b); }
        }
      });

      boxes.forEach(function (b, i) {
        var seen = i <= reached || (i === 0 && t >= 11.8);
        setOpacity(b.g, seen ? 1 : 0.32);
        paint(b.rect, i === lit ? C_SURFACE : C_SURFACE2, i === lit ? C_ACCENT : C_BORDER);
        b.rect.setAttribute('stroke-width', i === lit ? 2.5 : 1.5);
      });
      edges.forEach(function (e, i) {
        paint(e, null, i === actEdge ? C_ACCENT : C_MUTED);
        setOpacity(e, i <= reached ? 1 : 0.3);
      });
      chips.forEach(function (c) { setOpacity(c.g, Math.max(0.2, seg(t, c.at, c.at + 0.6))); });

      var taskOn = Math.max(0.25, seg(t, 7.6, 8.2));
      setOpacity(taskChip, taskOn);
      setOpacity(taskEdge, taskOn);

      if (actEdge >= 0) {
        var p = pointOn(AMP_EDGES[actEdge].pts, u);
        token.setAttribute('cx', p[0].toFixed(1));
        token.setAttribute('cy', p[1].toFixed(1));
        setOpacity(token, 1);
      } else if (t >= 12.8 && t < 13.8) {
        var q = pointOn(AMP_ET.pts, seg(t, 12.8, 13.8));
        token.setAttribute('cx', q[0].toFixed(1));
        token.setAttribute('cy', q[1].toFixed(1));
        paint(token, C_BAD);
        setOpacity(token, 1);
      } else {
        setOpacity(token, 0);
        paint(token, C_ACCENT);
      }

      var etOn = t >= 12.6;
      setOpacity(etPath, etOn ? 1 : 0.22);
      setOpacity(etLab, etOn ? 1 : 0.22);
      setOpacity(tail, seg(t, 14.0, 14.8));
    }

    return { el: s, draw: draw };
  }

  var AMP_SCENES = [
    {
      title: '逐帧 vs 分布',
      dur: 14,
      build: buildSceneWhy,
      cues: [
        { at: 0.4, s: 'DeepMimic 的模仿奖励要求仿真的**第 $t$ 帧对上参考的第 $t$ 帧** —— 状态里得带一个相位变量 $\\varphi$。' },
        { at: 3.0, s: '代价是角色被钉在那条轨迹上：动捕有噪声就照抄噪声，**多段不同风格的片段也没法混着用**。' },
        { at: 6.6, s: 'AMP 换了个问法：判别器只看**一步状态转移 $(s_t, s_{t+1})$**，问「这一步像不像数据里的某一步」。' },
        { at: 9.2, s: '策略要做的是把自己产生的转移**推进参考数据的分布 $d^M$ 里**，至于是第几帧、什么节奏，不管。' },
        { at: 12.4, s: 'DeepMimic 匹配**轨迹**，AMP 匹配**分布** —— 临摹字帖 vs 学会一种字体。' }
      ]
    },
    {
      title: '判别器 loss',
      dur: 16,
      build: buildSceneLoss,
      cues: [
        { at: 0.4, s: '判别器的训练目标就是经典 GAN 那一式，只是把「图片」换成了「状态转移」。' },
        { at: 1.6, s: '真 #1 动捕走路被打了 **0.8**，期望是 1：这条的 loss 贡献 $-\\log(0.8)$ = **0.223**，已经很小了。' },
        { at: 3.8, s: '真 #2 动捕跑步只打了 0.6，$-\\log(0.6)$ = **0.511** —— 判别器还得再把它往 1 推。' },
        { at: 5.9, s: '假 #1 是策略在仿真里走路，打了 0.3；期望是 0，所以看的是 $-\\log(1 - 0.3)$ = **0.357**。' },
        { at: 8.2, s: '假 #2 才是重点：**策略摔倒了，却被打了 0.7**，$-\\log(1 - 0.7)$ = **1.204**，全场最大的一笔。' },
        { at: 10.4, s: '第一项（真样本平均）**0.367**，第二项（假样本平均）**0.780**，总 loss = **1.147**。' },
        { at: 13.0, s: '梯度下降会照着这两项把「真数据推高、策略动作压低」，判别器于是学会了「摔倒不像真实运动」。' }
      ]
    },
    {
      title: 'LSGAN 风格奖励',
      dur: 15,
      build: buildSceneReward,
      cues: [
        { at: 0.4, s: '判别器学完了，它的打分**直接当奖励发给策略** —— 这就是风格奖励 $r^S$。' },
        { at: 2.0, s: '论文实现用的是 LSGAN 形式：**$r^S = \\max[0,\\ 1 - 0.25(D - 1)^2]$**，真样本目标 +1、假样本目标 −1。' },
        { at: 4.2, s: '$D = 1$（判别器认了）→ $r^S$ = **1，满分**；曲线在这里封顶，再像也不会多给。' },
        { at: 5.6, s: '$D \\le -1$ → 被 $\\max(0, \\cdot)$ 压成 **0：奖励和梯度一起消失**，训练最初期整批数据都堆在这儿。' },
        { at: 7.6, s: '对照一下前面讲直觉用的 log 形式 $-\\log(1 - D)$：**$D \\to 1$ 时直接冲向无穷**，实践中很难稳。' },
        { at: 10.2, s: '风格奖励再和任务奖励合成：论文 Table 4 的 **$w^S = w^G = 0.5$**。' },
        { at: 12.0, s: '有上下界、梯度不爆炸 —— 对抗训练里这比「理论上更漂亮」重要得多。' }
      ]
    },
    {
      title: '换数据集就换风格',
      dur: 15,
      build: buildSceneStyle,
      cues: [
        { at: 0.4, s: '论文 Target Heading 实验最有说服力的一组对照：**任务奖励三组一模一样**，只换参考数据集。' },
        { at: 1.6, s: '$r^G = \\exp(-0.25(v^* - v_{xcom})^2)$ —— 只有「速度接近目标」一个标量，**没有一个字提到姿态**。' },
        { at: 3.4, s: 'Locomotion（走跑混合）：低速走路、中速慢跑、高速跑步。' },
        { at: 5.0, s: 'Zombie：拖着脚、手臂僵直前伸；Stealthy：弯腰压低重心、脚步轻柔。都是 $v^* = 1\\ \\mathrm{m/s}$。' },
        { at: 7.4, s: '混合数据集还有个额外好处：把 $v^*$ 从低扫到高，**步态自己换** —— 1~2 走路、2~3 慢跑、3~5 跑步。' },
        { at: 11.0, s: '只用走路数据训的策略在高速段拉不上去，只用跑步数据的在低速段下不来（论文 Figure 4 右图）。' },
        { at: 13.6, s: '**判别器就是「风格编码器」**：换一份数据就换一种风格，奖励函数一行不用改。' }
      ]
    },
    {
      title: '训练闭环',
      dur: 16,
      build: buildSceneLoop,
      cues: [
        { at: 0.4, s: '把前四幕串起来，就是 AMP 的一次训练循环。' },
        { at: 1.0, s: '① 策略 $\\pi_\\theta$ 在仿真里跑一轮，收 **4096 步**样本。' },
        { at: 2.8, s: '② 更新判别器：真样本从动捕采 256 个，假样本从**当前策略 + $10^5$ 的回放池**采 256 个。' },
        { at: 4.4, s: '回放池防的是判别器对当前策略过拟合；梯度惩罚 **$w_{GP} = 10$ 只作用在真数据上**。' },
        { at: 5.6, s: '③ 判别器给每一步转移打分，换成风格奖励 $r^S$。判别器**看不到任务目标**，所以同一个它能复用到别的任务。' },
        { at: 7.6, s: '④ 和任务奖励合成：**$r = 0.5\\,r^S + 0.5\\,r^G$**。' },
        { at: 9.6, s: '⑤ PPO 更新策略，**$\\mathrm{clip} = 0.02$** —— 比 DeepMimic 的 0.2 小 10 倍，因为奖励本身在动。' },
        { at: 12.6, s: '中途摔倒就走 **ET** 那条虚线；接触密集的翻滚 / 起身任务会把它关掉。' },
        { at: 14.0, s: '一句话：**AMP = PPO + 一个判别器分支**，DeepMimic 的四项手工 tracking 奖励全被一个学出来的 $r^S$ 顶掉了。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '五幕动画：AMP 全流程速览',
      sub: '约 76 秒自动播放。空格播放/暂停，← → 换幕；画面里的数字与本文各节算例一致。',
      ariaLabel: 'AMP 五幕讲解动画',
      notes: [
        '取数依据：第二幕的四个打分就是上面「判别器 loss 实验台」的默认值（正文「数值例子」，总 loss ≈ 1.147）；' +
          '第三幕的曲线和「判别器打分 → 风格奖励」演示用的是同一个 styleReward()；' +
          '$w^S = w^G = 0.5$、$w_{GP} = 10$、$\\mathrm{clip} = 0.02$、回放池 $10^5$、4096 / 256 这些来自论文 Table 4 与正文第 2、3 步。',
        '第四幕的三个小人只是示意姿态，不是论文的仿真结果；1~2 / 2~3 / 3~5 m/s 的步态分段引自正文「多数据集的自动步态切换」。'
      ],
      scenes: AMP_SCENES
    });
  }

  K.mount({
    'amp-explainer': buildExplainerDemo,
    'amp-reward': buildRewardDemo,
    'amp-disc': buildDiscDemo,
    'amp-style': buildStyleDemo,
    'amp-curves': buildCurvesDemo
  });
})();
