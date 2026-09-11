/* Interactive PULSE demos for
 * papers/01_Foundational_RL/PULSE_Physics-based_Universal_Latent_Space.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["pulse"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   pulse-vib        — 变分信息瓶颈：β 在「记住每个片段」和「什么都没学到」之间的取舍
 *   pulse-prior      — 本体感受先验 p(z|s)：为什么固定的 N(0, I) 会让长序列发散
 *   pulse-downstream — 32 维潜空间 vs 69 维关节空间：下游 RL 到底省在哪
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

  // ─── demo 1: 变分信息瓶颈 ────────────────────────────────────────────────
  /* 高斯信道版的 VIB：后验 q(z|片段) = N(a·μ, s²)，先验 N(0, 1)。
     β 越大，瓶颈越窄：a → 0（latent 记不住片段的身份），s → 1（后验被压成先验）。
     这是 rate–distortion 最经典的那条取舍曲线，PULSE 把它用在了动作蒸馏上。 */
  function vib(beta) {
    var a = 1 / (1 + beta); // 保留多少片段信息
    var s = Math.sqrt(beta / (1 + beta) + 1e-6); // 后验的宽度
    var distort = (1 - a) * (1 - a) + s * s; // 重建（蒸馏）误差
    var kl = 0.5 * (a * a + s * s - 1 - Math.log(s * s)); // 平均 KL(q ‖ p)
    var fill = clamp(s / 0.6, 0, 1); // 后验之间连不连得成一片
    var match = Math.exp(-Math.abs(a * a + s * s - 1) * 2); // 聚合后验像不像先验
    return { a: a, s: s, distort: distort, kl: kl, sample: fill * match };
  }

  var CLIPS = [
    { name: '走', mu: -1.6 },
    { name: '跑', mu: -0.8 },
    { name: '转圈', mu: 0.1 },
    { name: '挥手', mu: 0.9 },
    { name: '跌倒爬起', mu: 1.7 }
  ];

  function buildVibDemo(host) {
    var root = card(host, {
      title: 'VIB：β 决定潜空间是「一本查找表」还是「一片连续的技能」',
      sub:
        '蒸馏损失里那一项 KL(q(z|s,ref) ‖ p(z|s)) 前面的系数就是瓶颈宽度。β = 0 时 latent 只是把 AMASS 背下来；' +
        'β 太大又会 posterior collapse。拖动它，看三条曲线怎么打架。'
    });

    var state = { beta: 0.35, seed: 9 };

    var ctrls = controlsRow(root);
    var bSlider = slider(ctrls, {
      label: 'KL 权重 β（信息瓶颈的窄度）',
      min: 0,
      max: 4,
      step: 0.01,
      value: state.beta,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.beta = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, 'β = 0：纯蒸馏，不压缩', function () {
      state.beta = 0;
      bSlider.set(0, true);
      render();
    });
    button(btns, 'β ≈ 0.35：平衡', function () {
      state.beta = 0.35;
      bSlider.set(0.35, true);
      render();
    });
    button(btns, 'β = 4：posterior collapse', function () {
      state.beta = 4;
      bSlider.set(4, true);
      render();
    });

    var setLegend = legend(root, [
      { key: 'accent', text: '每段动作的后验 q(z|s, ref)' },
      { key: 'muted', text: '先验 p(z)' },
      { key: 'bad', text: '蒸馏误差' },
      { key: 'good', text: '从先验采样能采出好动作的程度' }
    ]);

    var grid = stageGrid(root);
    var distStage = stage(grid, 230);
    var curveStage = stage(grid, 230);

    var stats = statsRow(root);
    var sA = stats.add('latent 保留的片段信息');
    var sKL = stats.add('平均 KL');
    var sD = stats.add('蒸馏误差');
    var sS = stats.add('先验采样的可用度');
    var verdict = verdictBox(root);

    note(root, [
      '**β = 0 时 latent 是一本查找表**：每段动作被编到一个尖峰上，互相之间全是空隙。' +
        '蒸馏误差确实最低（学生完美复刻教师），但从先验里采一个 z 多半落在空隙里 —— 解码出来不是任何一个动作。' +
        'PULSE 要的恰恰是「随便采一个 z 都能跑」，所以这条路走不通。',
      '**β 太大就 posterior collapse**：后验被压得和先验一模一样，latent 里不再含有「这是哪段动作」的信息，' +
        '解码器只能输出一个平均动作。KL 是 0 了，但整个潜空间也废了。',
      '**中间那一段才是 PULSE 的落点**：后验之间刚好连成一片、聚合起来又接近先验 —— ' +
        '这时候「采样 → 连贯动作」和「编码 → 复刻动作」两件事才能同时成立。',
      '**这是简化模型**：真实的 latent 是 32 维、后验由一个 MLP 编码器输出，蒸馏误差是学生和 PHC 教师动作的差。' +
        '这里用一维高斯信道复现 rate–distortion 的取舍形状，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var v = vib(state.beta);

      sA.set(fmt(v.a, 3), v.a > 0.6 ? 'good' : v.a < 0.2 ? 'bad' : 'warn');
      sKL.set(fmt(v.kl, 3), v.kl > 2 ? 'bad' : 'good');
      sD.set(fmt(v.distort, 3), v.distort < 0.5 ? 'good' : v.distort > 1.2 ? 'bad' : 'warn');
      sS.set(fmt(v.sample, 3), v.sample > 0.6 ? 'good' : v.sample < 0.25 ? 'bad' : 'warn');

      if (state.beta < 0.05) {
        verdict.set(
          '📚 β = 0：后验缩成五个尖峰，中间全是空隙。蒸馏误差最低（' +
            fmt(v.distort, 2) +
            '），但先验采样的可用度只有 ' +
            fmt(v.sample, 2) +
            ' —— 采到空隙里的 z 解码出来什么都不是。这就是「把 AMASS 背下来」而不是「学会动」。',
          'frozen'
        );
      } else if (v.a < 0.25) {
        verdict.set(
          '💀 posterior collapse：latent 只保留了 ' +
            fmt(v.a, 2) +
            ' 的片段信息，五个后验几乎重叠在一起。KL 降到 ' +
            fmt(v.kl, 2) +
            '，代价是解码器分不清你给的是「走」还是「跌倒爬起」。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ β = ' +
            fmt(state.beta, 2) +
            '：五个后验刚好连成一片又没糊在一起。先验采样可用度 ' +
            fmt(v.sample, 2) +
            '，蒸馏误差 ' +
            fmt(v.distort, 2) +
            ' —— 这就是 PULSE 说的「既覆盖全量数据、又能随便采」。',
          'learning'
        );
      }

      // ── 左：一维 latent 轴上的后验与先验 ──
      var g = begin(distStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 40, r: 14, t: 22, b: 34 }, [-3, 3], [0, 1.6]);
      axes(g, p, {
        xTicks: [-3, -1.5, 0, 1.5, 3],
        yTicks: [0, 0.5, 1, 1.5],
        yFmt: function (t) {
          return fmt(t, 1);
        },
        xLabel: 'latent z（这里画成 1 维）'
      });
      text(g.ctx, '每段动作的后验 vs 先验', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var priorPts = [];
      for (var i = 0; i <= 120; i++) {
        var x = -3 + (6 * i) / 120;
        priorPts.push([p.sx(x), p.sy(Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI))]);
      }
      line(g.ctx, priorPts, P.muted, 1.8, [5, 4]);
      CLIPS.forEach(function (c, idx) {
        var mu = v.a * c.mu,
          sd = Math.max(0.04, v.s);
        var pts = [];
        for (var j = 0; j <= 120; j++) {
          var x2 = -3 + (6 * j) / 120;
          var y = Math.exp(-((x2 - mu) * (x2 - mu)) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));
          pts.push([p.sx(x2), p.sy(Math.min(y, 1.55))]);
        }
        line(g.ctx, pts, idx % 2 ? P.accent : P.good, 1.8);
        text(g.ctx, c.name, p.sx(mu), p.y1 + 8 + (idx % 2) * 12, P.muted, 'center', '10px sans-serif');
      });

      // ── 右：三条曲线随 β 变化 ──
      var g2 = begin(curveStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 42, r: 14, t: 22, b: 34 }, [0, 4], [0, 1.6]);
      axes(g2, p2, {
        xTicks: [0, 1, 2, 3, 4],
        yTicks: [0, 0.5, 1, 1.5],
        yFmt: function (t) {
          return fmt(t, 1);
        },
        xLabel: 'KL 权重 β'
      });
      text(g2.ctx, '蒸馏误差 ↑ vs 采样可用度 ↑↓', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var dPts = [],
        sPts = [],
        kPts = [];
      for (var b = 0; b <= 160; b++) {
        var bb = (4 * b) / 160;
        var vv = vib(bb);
        dPts.push([p2.sx(bb), p2.sy(Math.min(1.55, vv.distort))]);
        sPts.push([p2.sx(bb), p2.sy(vv.sample)]);
        kPts.push([p2.sx(bb), p2.sy(Math.min(1.55, vv.kl))]);
      }
      line(g2.ctx, kPts, P2.muted, 1.6, [4, 4]);
      line(g2.ctx, dPts, P2.bad, 2.2);
      line(g2.ctx, sPts, P2.good, 2.4);
      line(g2.ctx, [[p2.sx(state.beta), p2.y0], [p2.sx(state.beta), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(state.beta), p2.sy(v.sample), 4.5, P2.good, P2.surface2);
      dot(g2.ctx, p2.sx(state.beta), p2.sy(Math.min(1.55, v.distort)), 4.5, P2.bad, P2.surface2);

      distStage.canvas.setAttribute('aria-label', 'VIB 后验与先验在一维 latent 上的分布');
      curveStage.canvas.setAttribute('aria-label', '蒸馏误差、KL 与采样可用度随 β 变化的曲线');
    });

    render();
  }

  // ─── demo 2: 本体感受先验 p(z|s) ─────────────────────────────────────────
  /* 每个身体状态只有一小片 latent 是「此刻做得出来」的动作。固定先验 N(0, I)
     不知道你现在是站着还是在空中，采到的 z 常常在这一步根本执行不了；
     p(z|s) 把采样中心搬到当前状态的可行区上。 */
  var BODY_STATES = [
    { id: 'stand', name: '双脚站立', c: [0.1, 0.15], r: 1.05 },
    { id: 'single', name: '单脚支撑', c: [-0.95, 0.8], r: 0.72 },
    { id: 'air', name: '腾空中', c: [1.35, -0.9], r: 0.6 },
    { id: 'down', name: '倒地', c: [-1.5, -1.25], r: 0.62 }
  ];

  function feasibleRate(st, priorC, priorS, seed) {
    var rng = mulberry32(seed);
    var hits = 0,
      pts = [];
    for (var i = 0; i < 40; i++) {
      var x = priorC[0] + priorS * gauss(rng),
        y = priorC[1] + priorS * gauss(rng);
      var dx = x - st.c[0],
        dy = y - st.c[1];
      var ok = dx * dx + dy * dy <= st.r * st.r;
      if (ok) hits++;
      pts.push({ x: x, y: y, ok: ok });
    }
    return { rate: hits / 40, pts: pts };
  }

  function buildPriorDemo(host) {
    var root = card(host, {
      title: '本体感受先验：p(z|s) 知道你现在站着还是在空中',
      sub:
        '`ar_prior.py` 学的就是这个条件分布。换个身体状态看两种先验的差别 —— ' +
        '固定的 N(0, I) 永远从同一个地方采样，而当前状态下真正做得出来的动作只占一小片。'
    });

    var state = { st: BODY_STATES[2], mode: 'prop', horizon: 40, seed: 4 };

    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '当前身体状态 s',
      value: 'air',
      items: BODY_STATES.map(function (s) {
        return { label: s.name, value: s.id };
      }),
      onPick: function (v) {
        BODY_STATES.forEach(function (s) {
          if (s.id === v) state.st = s;
        });
        render();
      }
    });
    buttonGroup(ctrls, {
      label: '先验用哪一种',
      value: 'prop',
      items: [
        { label: '本体感受先验 p(z|s)', value: 'prop' },
        { label: '固定先验 N(0, I)', value: 'fixed' }
      ],
      onPick: function (v) {
        state.mode = v;
        render();
      }
    });
    slider(ctrls, {
      label: '要连续滚多少步',
      min: 5,
      max: 120,
      step: 1,
      value: state.horizon,
      format: function (v) {
        return fmt(v, 0) + ' 步';
      },
      onInput: function (v) {
        state.horizon = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '换一批采样', function () {
      state.seed = (state.seed * 1103515245 + 12345) % 99991;
      render();
    });

    var setLegend = legend(root, [
      { key: 'good', text: '这一步做得出来的 z' },
      { key: 'bad', text: '采到了但执行不了的 z' },
      { key: 'accent', text: '先验的采样中心' }
    ]);

    var grid = stageGrid(root);
    var mapStage = stage(grid, 240);
    var rollStage = stage(grid, 240);

    var stats = statsRow(root);
    var sRate = stats.add('单步可行率');
    var sSteps = stats.add('期望能连续跑几步');
    var sSurv = stats.add('滚完不发散的概率');
    var sMode = stats.add('先验类型');
    var verdict = verdictBox(root);

    note(root, [
      '**这就是 PULSE 相对 ASE 的关键补丁**：ASE 的 latent 是从固定球面均匀采的，' +
        '它默认「任何技能在任何状态下都能启动」。人形不是这样 —— 你在空中的时候没法起跳。',
      '**发散是指数级的**：单步可行率 0.9 看起来不错，连滚 40 步只剩 0.9⁴⁰ ≈ 1.5%。' +
        '长序列稳定性对先验的要求比单步苛刻得多，这也是为什么论文特别强调「长时间序列下依然物理可行」。',
      '**它同时也让下游更好训**：高层策略不需要从零学「现在能不能起跳」，' +
        '它在 p(z|s) 的基础上输出一个残差就够了 —— 相当于先验已经替它排除了大部分废动作。',
      '**这是简化模型**：真实的可行区不是一个圆，先验是一个以本体感受为条件的自回归网络。' +
        '这里只复现「可行区随状态移动 / 固定先验会踩空」这件事，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var st = state.st;
      var priorC = state.mode === 'prop' ? st.c : [0, 0];
      var priorS = state.mode === 'prop' ? st.r * 0.32 : 1.0;
      var res = feasibleRate(st, priorC, priorS, state.seed);
      var surv = Math.pow(res.rate, state.horizon);
      var expSteps = res.rate >= 1 ? Infinity : 1 / (1 - res.rate);

      sRate.set(fmt(res.rate * 100, 1) + '%', res.rate > 0.85 ? 'good' : res.rate < 0.5 ? 'bad' : 'warn');
      sSteps.set(isFinite(expSteps) ? fmt(expSteps, 1) + ' 步' : '∞', expSteps > 20 ? 'good' : 'bad');
      sSurv.set(surv < 0.001 ? surv.toExponential(1) : fmt(surv * 100, 2) + '%', surv > 0.5 ? 'good' : surv < 0.05 ? 'bad' : 'warn');
      sMode.set(state.mode === 'prop' ? 'p(z|s)' : 'N(0, I)', state.mode === 'prop' ? 'good' : 'bad');

      if (state.mode === 'fixed' && res.rate < 0.6) {
        verdict.set(
          '💥 固定先验在「' +
            st.name +
            '」这个状态下只有 ' +
            fmt(res.rate * 100, 0) +
            '% 的采样是做得出来的。连滚 ' +
            state.horizon +
            ' 步还不发散的概率是 ' +
            (surv < 0.001 ? surv.toExponential(1) : fmt(surv * 100, 2) + '%') +
            ' —— 几乎必然摔。N(0, I) 根本不知道你现在在空中。',
          'frozen'
        );
      } else if (state.mode === 'prop') {
        verdict.set(
          '✅ p(z|s) 把采样中心搬到了「' +
            st.name +
            '」的可行区上，单步可行率 ' +
            fmt(res.rate * 100, 0) +
            '%，滚 ' +
            state.horizon +
            ' 步的存活率 ' +
            fmt(surv * 100, 1) +
            '%。**随便采一个 z 都能跑**这句话，靠的就是这个条件先验。',
          'learning'
        );
      } else {
        verdict.set(
          '🙂 这个状态离原点比较近，固定先验碰巧还能用（可行率 ' +
            fmt(res.rate * 100, 0) +
            '%）。切到「腾空中」或者「倒地」再看一眼 —— 那才是固定先验真正翻车的地方。',
          'frozen'
        );
      }

      // ── 左：latent 平面上的可行区与采样 ──
      var g = begin(mapStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 40, r: 14, t: 22, b: 34 }, [-3, 3], [-3, 3]);
      axes(g, p, { xTicks: [-3, -1.5, 0, 1.5, 3], yTicks: [-3, 0, 3], xLabel: 'latent 维度 1' });
      text(g.ctx, '当前状态下「做得出来」的 latent 区域', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      // 其他状态的可行区（淡）
      BODY_STATES.forEach(function (s) {
        if (s.id === st.id) return;
        g.ctx.save();
        g.ctx.strokeStyle = P.grid;
        g.ctx.setLineDash([3, 3]);
        g.ctx.beginPath();
        g.ctx.arc(p.sx(s.c[0]), p.sy(s.c[1]), Math.abs(p.sx(s.r) - p.sx(0)), 0, Math.PI * 2);
        g.ctx.stroke();
        g.ctx.restore();
      });
      g.ctx.save();
      g.ctx.fillStyle = P.good;
      g.ctx.globalAlpha = 0.13;
      g.ctx.beginPath();
      g.ctx.arc(p.sx(st.c[0]), p.sy(st.c[1]), Math.abs(p.sx(st.r) - p.sx(0)), 0, Math.PI * 2);
      g.ctx.fill();
      g.ctx.restore();
      res.pts.forEach(function (q) {
        dot(g.ctx, p.sx(clamp(q.x, -3, 3)), p.sy(clamp(q.y, -3, 3)), 2.8, q.ok ? P.good : P.bad);
      });
      dot(g.ctx, p.sx(priorC[0]), p.sy(priorC[1]), 6, P.accent, P.surface2);
      text(g.ctx, st.name + ' 的可行区', p.sx(st.c[0]), p.sy(st.c[1] + st.r) - 8, P.good, 'center', '10px sans-serif');

      // ── 右：存活率随步数衰减 ──
      var g2 = begin(rollStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [0, 120], [0, 1.02]);
      axes(g2, p2, {
        xTicks: [0, 30, 60, 90, 120],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '连续滚了多少步'
      });
      text(g2.ctx, '还没发散的概率（可行率的幂）', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      ['prop', 'fixed'].forEach(function (mode) {
        var c2 = mode === 'prop' ? st.c : [0, 0];
        var s2 = mode === 'prop' ? st.r * 0.32 : 1.0;
        var r2 = feasibleRate(st, c2, s2, state.seed).rate;
        var pts = [];
        for (var t = 0; t <= 120; t++) pts.push([p2.sx(t), p2.sy(Math.pow(r2, t))]);
        line(g2.ctx, pts, mode === 'prop' ? P2.good : P2.bad, mode === state.mode ? 2.6 : 1.4, mode === state.mode ? [] : [4, 4]);
      });
      line(g2.ctx, [[p2.sx(state.horizon), p2.y0], [p2.sx(state.horizon), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(state.horizon), p2.sy(surv), 4.5, state.mode === 'prop' ? P2.good : P2.bad, P2.surface2);

      mapStage.canvas.setAttribute('aria-label', '当前身体状态下可行 latent 区域与两种先验的采样');
      rollStage.canvas.setAttribute('aria-label', '连续滚动步数与不发散概率的关系');
    });

    render();
  }

  // ─── demo 3: 下游 RL 在 32 维潜空间里搜 ──────────────────────────────────
  function buildDownstreamDemo(host) {
    var root = card(host, {
      title: '下游任务为什么快：搜索空间从 69 维关节降到 32 维技能',
      sub:
        '冻结 Decoder 和先验，高层策略只在 latent 上输出一个残差。省的不只是维度 —— ' +
        '更关键的是**这个空间里每一个点都已经是自然动作**，不用再学「怎么站着不倒」。'
    });

    var state = { iters: 400, taskHard: 1.0, residual: 0.6, seed: 13 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '训练迭代数',
      min: 50,
      max: 1200,
      step: 10,
      value: state.iters,
      format: function (v) {
        return fmt(v, 0);
      },
      onInput: function (v) {
        state.iters = v;
        render();
      }
    });
    slider(ctrls, {
      label: '任务难度',
      min: 0.3,
      max: 3,
      step: 0.05,
      value: state.taskHard,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.taskHard = v;
        render();
      }
    });
    slider(ctrls, {
      label: '高层残差幅度（在 p(z|s) 上偏多远）',
      min: 0,
      max: 2,
      step: 0.05,
      value: state.residual,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.residual = v;
        render();
      }
    });

    var setLegend = legend(root, [
      { key: 'good', text: 'PULSE：32 维潜空间 + 冻结 Decoder' },
      { key: 'bad', text: '从零开始：69 维关节力矩' },
      { key: 'warn', text: '残差太大：飘出先验，动作开始崩' }
    ]);

    var grid = stageGrid(root);
    var curveStage = stage(grid, 230);
    var dimStage = stage(grid, 230);

    var tb = table(root);
    var cells = [];
    (function () {
      tb.row(['', '32 维潜空间', '69 维关节空间'], true);
      [['动作空间维度', '32', '69'], ['随机一个动作自然吗', '—', '—'], ['达到 80% 分数需要', '—', '—']].forEach(function (r) {
        var tr = el('tr');
        tr.appendChild(el('th', null, r[0]));
        var a = el('td', null, r[1]),
          b = el('td', null, r[2]);
        cells.push([a, b]);
        tr.appendChild(a);
        tr.appendChild(b);
        tb.node.appendChild(tr);
      });
    })();

    var stats = statsRow(root);
    var sLat = stats.add('潜空间最终分数');
    var sRaw = stats.add('从零学最终分数');
    var sSpeed = stats.add('快了多少倍');
    var sNat = stats.add('动作自然度');
    var verdict = verdictBox(root);

    note(root, [
      '**维度只是一半原因**：69 → 32 大约只省一倍。真正的差别是先验把「废动作」整个排除了 —— ' +
        '在关节空间里随便采一组力矩，角色几乎必然当场倒地，这些 rollout 全是浪费。' +
        '注意右图那条虚线是「没有先验时」的估计：就算把维度砍到 32，随机采一个点自然的概率也只有约 10%；' +
        'PULSE 的 90% 来自冻结的 Decoder 和 p(z|s)，不是来自降维。',
      '**残差幅度是个新旋钮**：高层在 p(z|s) 上偏得越远，能做的任务越多，但也越容易飘出潜空间里「自然」的那一片。' +
        '把它拖到 2 看看，分数上去了，动作自然度掉下来了。',
      '**这也是这一代方法的通用配方**：冻结一个大规模预训练的低层控制器，' +
        '下游只训一个小高层。后来 OmniH2O 这类全身遥操作工作沿用的就是这个结构。',
      '**这是简化模型**：学习曲线用的是一条指数收敛的解析式，不是真跑 PPO；' +
        '「随机动作自然吗」用的是逐维独立的粗糙估计。趋势成立，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      // 收敛速度 ∝ 1/维度，再乘上「有多大比例的 rollout 不是废的」
      function curve(dim, usable, t, hard) {
        var rate = (usable * 12.0) / (dim * hard);
        return 1 - Math.exp(-rate * t * 0.01);
      }
      var latUsable = 0.9;
      var rawUsable = 0.06;
      var latFinal = curve(32, latUsable, state.iters, state.taskHard);
      var rawFinal = curve(69, rawUsable, state.iters, state.taskHard);
      // 残差太大 → 分数上限更高但自然度下降
      var reach = clamp(0.65 + 0.45 * state.residual, 0, 1);
      var natural = clamp(Math.exp(-0.9 * Math.max(0, state.residual - 0.8) * Math.max(0, state.residual - 0.8) * 2), 0, 1);
      var latScore = clamp(latFinal * reach, 0, 1);

      function itersTo(target, dim, usable) {
        if (target >= 1) return Infinity;
        var rate = (usable * 12.0) / (dim * state.taskHard);
        return -Math.log(1 - target) / (rate * 0.01);
      }
      // 残差限制了分数上限，所以潜空间要到 0.8 分，内部得先跑到 0.8 / reach
      var tLat = itersTo(0.8 / reach, 32, latUsable),
        tRaw = itersTo(0.8, 69, rawUsable);
      function itersText(v) {
        return isFinite(v) ? fmt(v, 0) + ' 轮' : '达不到（残差太小）';
      }

      sLat.set(fmt(latScore, 3), latScore > 0.7 ? 'good' : 'warn');
      sRaw.set(fmt(rawFinal, 3), rawFinal > 0.7 ? 'good' : 'bad');
      sSpeed.set(isFinite(tLat) ? fmt(tRaw / tLat, 1) + ' ×' : '—', 'accent');
      sNat.set(fmt(natural, 2), natural > 0.85 ? 'good' : natural < 0.5 ? 'bad' : 'warn');
      cells[1][0].textContent = fmt(latUsable * 100, 0) + '%（先验兜底）';
      cells[1][1].textContent = Math.pow(0.93, 69) < 0.0001 ? (Math.pow(0.93, 69) * 100).toExponential(1) + '%' : fmt(Math.pow(0.93, 69) * 100, 4) + '%';
      cells[2][0].textContent = itersText(tLat);
      cells[2][1].textContent = itersText(tRaw);

      if (state.residual > 1.3) {
        verdict.set(
          '⚠️ 残差拉到 ' +
            fmt(state.residual, 2) +
            '：高层已经把 z 推出先验覆盖的那片区域了。分数（' +
            fmt(latScore, 2) +
            '）确实更高，但动作自然度掉到 ' +
            fmt(natural, 2) +
            ' —— 冻结的 Decoder 只在先验附近才保证物理可行。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ 同样跑 ' +
            fmt(state.iters, 0) +
            ' 轮，潜空间拿到 ' +
            fmt(latScore, 2) +
            '，从零学只有 ' +
            fmt(rawFinal, 2) +
            '。要到 80% 分数，前者约 ' +
            fmt(tLat, 0) +
            ' 轮、后者约 ' +
            fmt(tRaw, 0) +
            ' 轮 —— 差的这一大截，绝大部分来自「不用再学怎么站稳」。',
          'learning'
        );
      }

      // ── 左：学习曲线 ──
      var g = begin(curveStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 22, b: 34 }, [0, 1200], [0, 1.05]);
      axes(g, p, {
        xTicks: [0, 300, 600, 900, 1200],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '训练迭代'
      });
      text(g.ctx, '任务分数', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var lPts = [],
        rPts = [];
      for (var t = 0; t <= 1200; t += 10) {
        lPts.push([p.sx(t), p.sy(clamp(curve(32, latUsable, t, state.taskHard) * reach, 0, 1))]);
        rPts.push([p.sx(t), p.sy(curve(69, rawUsable, t, state.taskHard))]);
      }
      line(g.ctx, rPts, P.bad, 2.2);
      line(g.ctx, lPts, natural < 0.6 ? P.warn : P.good, 2.4);
      line(g.ctx, [[p.x0, p.sy(0.8)], [p.x1, p.sy(0.8)]], P.muted, 1, [4, 4]);
      line(g.ctx, [[p.sx(state.iters), p.y0], [p.sx(state.iters), p.y1]], P.text, 1, [3, 3]);

      // ── 右：维度 vs 「随机一个动作是自然动作」的概率 ──
      var g2 = begin(dimStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 46, r: 14, t: 22, b: 34 }, [0, 80], [-8, 0.4]);
      axes(g2, p2, {
        xTicks: [0, 20, 40, 60, 80],
        yTicks: [0, -2, -4, -6, -8],
        yFmt: function (t) {
          return '1e' + fmt(t, 0);
        },
        xLabel: '动作空间维度'
      });
      text(g2.ctx, '随机采一个动作恰好自然的概率（对数轴）', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var cPts = [];
      for (var d = 1; d <= 80; d++) {
        cPts.push([p2.sx(d), p2.sy(clamp((d * Math.log(0.93)) / Math.LN10, -8, 0.4))]);
      }
      line(g2.ctx, cPts, P2.muted, 1.8, [4, 4]);
      [
        { d: 32, label: '32 维潜空间', sub: '先验兜底 → ≈90%', y: Math.log10(0.9), color: P2.good },
        { d: 69, label: '69 维关节', sub: '≈0.07%', y: clamp((69 * Math.log(0.93)) / Math.LN10, -8, 0.4), color: P2.bad }
      ].forEach(function (m) {
        var x = p2.sx(m.d);
        line(g2.ctx, [[x, p2.y0], [x, p2.sy(m.y)]], m.color, 2);
        dot(g2.ctx, x, p2.sy(m.y), 5, m.color, P2.surface2);
        text(g2.ctx, m.label, x, p2.sy(m.y) + 14, m.color, 'center', '11px sans-serif');
        text(g2.ctx, m.sub, x, p2.sy(m.y) + 27, P2.muted, 'center', '10px sans-serif');
      });

      curveStage.canvas.setAttribute('aria-label', '潜空间与关节空间下的任务学习曲线对比');
      dimStage.canvas.setAttribute('aria-label', '随机动作自然概率随维度指数衰减');
    });

    render();
  }

  K.mount({
    'pulse-vib': buildVibDemo,
    'pulse-prior': buildPriorDemo,
    'pulse-downstream': buildDownstreamDemo
  });
})();
