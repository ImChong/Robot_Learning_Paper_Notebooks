/* Interactive PULSE demos for
 * papers/01_Foundational_RL/PULSE_Physics-based_Universal_Latent_Space.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["pulse"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   pulse-explainer  — 六幕讲解动画：缺一个通用表示 → 阶段1 大规模模仿 → 阶段2 VIB 瓶颈 →
 *                      本体感受先验 → 阶段3 下游只搜 32 维 → 闭环与源码落点
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
  /* 学习曲线那套解析式提到模块作用域：下面的演示和第五幕动画共用同一份，
     免得两边各算一套「到 80% 分数要跑多少轮」。收敛速度 ∝ 1/维度，再乘上
     「有多大比例的 rollout 不是废的」。 */
  var LAT_DIM = 32,
    RAW_DIM = 69,
    LAT_USABLE = 0.9, // 先验 + 冻结 Decoder 兜底：采到的 z 基本都是自然动作
    RAW_USABLE = 0.06; // 关节空间里随便采一组力矩，几乎必然当场倒地

  function dsCurve(dim, usable, iters, hard) {
    var rate = (usable * 12.0) / (dim * hard);
    return 1 - Math.exp(-rate * iters * 0.01);
  }

  function dsIters(target, dim, usable, hard) {
    if (target >= 1) return Infinity;
    var rate = (usable * 12.0) / (dim * hard);
    return -Math.log(1 - target) / (rate * 0.01);
  }

  /* 高层残差越大，够得到的任务越多（分数上限更高），但越容易飘出先验覆盖的那片。 */
  function dsReach(residual) {
    return clamp(0.65 + 0.45 * residual, 0, 1);
  }

  function dsNatural(residual) {
    var over = Math.max(0, residual - 0.8);
    return clamp(Math.exp(-0.9 * over * over * 2), 0, 1);
  }

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
      var latUsable = LAT_USABLE;
      var rawUsable = RAW_USABLE;
      var latFinal = dsCurve(LAT_DIM, latUsable, state.iters, state.taskHard);
      var rawFinal = dsCurve(RAW_DIM, rawUsable, state.iters, state.taskHard);
      // 残差太大 → 分数上限更高但自然度下降
      var reach = dsReach(state.residual);
      var natural = dsNatural(state.residual);
      var latScore = clamp(latFinal * reach, 0, 1);

      // 残差限制了分数上限，所以潜空间要到 0.8 分，内部得先跑到 0.8 / reach
      var tLat = dsIters(0.8 / reach, LAT_DIM, latUsable, state.taskHard),
        tRaw = dsIters(0.8, RAW_DIM, rawUsable, state.taskHard);
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
        lPts.push([p.sx(t), p.sy(clamp(dsCurve(LAT_DIM, latUsable, t, state.taskHard) * reach, 0, 1))]);
        rPts.push([p.sx(t), p.sy(dsCurve(RAW_DIM, rawUsable, t, state.taskHard))]);
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

  // ─── demo 4: 六幕讲解动画 ────────────────────────────────────────────────
  /* PULSE 的主线是三个阶段加一条命门：先训出跟得住 AMASS 的教师，再用 VIB 把它
     蒸馏成 32 维潜空间（β 决定潜空间是查找表还是连续技能），本体感受先验负责让
     长序列不发散，下游只在潜空间里搜。六幕对应笔记里的六件事，画面数字全部由上面
     三个演示的同一批函数现算：`vib()` / `feasibleRate()` / `dsCurve()` / `dsIters()`。 */

  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    paint = K.paint,
    seg = K.seg,
    ease = K.ease,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
    polyPath = K.polyPath,
    pointOn = K.pointOn,
    stickFigure = K.stickFigure,
    poseWalk = K.poseWalk;

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_MUTED = X.muted,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2;

  /* ── scene 1: ASE / CALM 之后还缺什么 ── */
  var S1_WALLS = [
    { t: '① 覆盖率不足', d: 'ASE / CALM 的 latent 各自只覆盖一小撮动作' },
    { t: '② 规模怎么压', d: '数万片段要进同一个可控的潜空间' },
    { t: '③ 下游要免重训', d: '换任务不能重训底层控制器' }
  ];

  function buildSceneGap() {
    var s = sceneSvg(
      'ASE 与 CALM 的技能潜空间只覆盖自己训练用的那一小撮动作，而 AMASS 有数万片段；' +
        'PULSE 要同时回答覆盖率、规模压缩、下游免重训三个问题'
    );
    s.appendChild(svgText(60, 32, 'ASE → CALM → PULSE：技能 latent 早就有了，通用表示还没有', 'demo-x-ink2', 13.5));

    // 左：ASE / CALM 的潜空间只覆盖一角
    s.appendChild(paint(svgEl('rect', { x: 40, y: 54, width: 340, height: 246, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    s.appendChild(svgText(210, 78, 'ASE / CALM 的技能潜空间', 'demo-x-ink2', 12, 'middle'));
    var CX = 210,
      CY = 186,
      R = 70;
    s.appendChild(paint(svgEl('circle', { cx: CX, cy: CY, r: R, fill: 'none', 'stroke-width': 1.2 }), null, C_BORDER));
    var wedge = svgEl('g', {});
    var a0 = 0.35,
      a1 = 1.35;
    wedge.appendChild(paint(svgEl('path', {
      d: 'M ' + CX + ' ' + CY +
        ' L ' + (CX + R * Math.cos(a1)).toFixed(1) + ' ' + (CY - R * Math.sin(a1)).toFixed(1) +
        ' A ' + R + ' ' + R + ' 0 0 1 ' + (CX + R * Math.cos(a0)).toFixed(1) + ' ' + (CY - R * Math.sin(a0)).toFixed(1) + ' Z',
      /* fill-opacity 而不是 opacity：setOpacity() 写的是行内 style.opacity，
         会盖掉同名属性，扇形就成了一块盖住整圈的实心色。 */
      'fill-opacity': 0.2
    }), C_ACCENT));
    var rngW = mulberry32(5);
    for (var i = 0; i < 16; i++) {
      var aa = a0 + (a1 - a0) * rngW(),
        rr = R * (0.25 + 0.7 * rngW());
      wedge.appendChild(paint(svgEl('circle', { cx: (CX + rr * Math.cos(aa)).toFixed(1), cy: (CY - rr * Math.sin(aa)).toFixed(1), r: 2.6 }), C_ACCENT));
    }
    wedge.appendChild(svgText(CX + 96, CY - 52, '训练用的那一小撮', 'demo-x-acc', 10, 'end'));
    s.appendChild(wedge);
    s.appendChild(svgText(210, 286, '换一批动作就得重训一套 latent', 'demo-x-mut', 10.5, 'middle'));

    // 右：AMASS 的规模
    s.appendChild(paint(svgEl('rect', { x: 410, y: 54, width: 350, height: 246, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    s.appendChild(svgText(585, 78, 'AMASS：数万个动作片段', 'demo-x-ink2', 12, 'middle'));
    var cloud = [];
    for (var r0 = 0; r0 < 9; r0++) {
      for (var c0 = 0; c0 < 18; c0++) {
        var d = paint(svgEl('circle', { cx: 436 + c0 * 17, cy: 106 + r0 * 17, r: 2.4 }), C_MUTED);
        s.appendChild(d);
        cloud.push({ n: d, at: 1.2 + (r0 * 18 + c0) * 0.022 });
      }
    }
    s.appendChild(svgText(585, 286, '覆盖人类 99.8% 的日常动作', 'demo-x-mut', 10.5, 'middle'));

    var walls = S1_WALLS.map(function (w, k) {
      var g = svgEl('g', {});
      var x = 44 + k * 252;
      g.appendChild(paint(svgEl('rect', { x: x, y: 316, width: 236, height: 46, rx: 8, 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }), C_SURFACE, C_BAD));
      g.appendChild(paint(svgText(x + 118, 336, w.t, null, 11.5, 'middle'), C_BAD));
      g.appendChild(svgText(x + 118, 352, w.d, 'demo-x-mut', 9.5, 'middle'));
      s.appendChild(g);
      return { g: g, at: 5.6 + k * 0.9 };
    });

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 390, 'PULSE 要的是人形控制的「基础模型」：一个随便采一个 z 都能跑的 32 维通用潜空间', null, 14.5, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 411, '下游只学「何时用什么技能」，不再学「怎么动」', 'demo-x-mut', 11, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      setOpacity(wedge, seg(t, 0.4, 1.0));
      cloud.forEach(function (c) { setOpacity(c.n, seg(t, c.at, c.at + 0.3)); });
      walls.forEach(function (w) { setOpacity(w.g, seg(t, w.at, w.at + 0.5)); });
      setOpacity(foot, seg(t, 10.4, 11.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 2: 阶段 1 —— 先训一个什么都跟得住的教师 ── */
  function buildSceneTeacher() {
    var s = sceneSvg(
      '阶段一用 AMASS 训练一个高保真模仿器：给它参考帧，它就能跟住；但拿掉参考帧，它不知道该做什么'
    );
    s.appendChild(svgText(60, 32, '阶段 1：先训一个「什么都跟得住」的模仿器', 'demo-x-ink2', 13.5));

    s.appendChild(paint(svgEl('rect', { x: 40, y: 62, width: 196, height: 228, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    s.appendChild(svgText(138, 86, 'AMASS 片段', 'demo-x-mut', 11, 'middle'));
    var rows = CLIPS.map(function (c, k) {
      var g = svgEl('g', {});
      var y = 104 + k * 36;
      g.appendChild(paint(svgEl('rect', { x: 58, y: y, width: 160, height: 26, rx: 6, 'stroke-width': 1 }), C_SURFACE, C_BORDER));
      g.appendChild(svgText(138, y + 17, c.name, 'demo-x-ink2', 11, 'middle'));
      s.appendChild(g);
      return { g: g, at: 0.6 + k * 0.4 };
    });

    var feedArrow = paint(svgEl('path', {
      d: polyPath([[244, 176], [286, 176]]),
      fill: 'none', 'stroke-width': 1.8,
      'marker-end': K.arrowMarker(s, 'pulse-x-arrow-feed', C_ACCENT)
    }), null, C_ACCENT);
    s.appendChild(feedArrow);

    var box = svgEl('g', {});
    box.appendChild(paint(svgEl('rect', { x: 292, y: 118, width: 186, height: 116, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, C_ACCENT));
    box.appendChild(svgText(385, 144, '模仿器（PHC 栈）', 'demo-x-acc', 12, 'middle'));
    box.appendChild(svgMath(385, 170, '\\pi_{teacher}(a_t \\mid s_t, ref_t)', { size: 11.5, anchor: 'middle', cls: 'demo-x-ink2', w: 180 }));
    box.appendChild(svgText(385, 196, 'phc/env/tasks/humanoid_im.py', 'demo-x-mono', 9.5, 'middle'));
    box.appendChild(svgText(385, 218, '奖励 = 跟得有多准', 'demo-x-mut', 10, 'middle'));
    s.appendChild(box);

    var figs = svgEl('g', {});
    var ref = stickFigure(C_MUTED, 2.2, true);
    var sim = stickFigure(C_GOOD, 2.4, false);
    figs.appendChild(ref.el);
    figs.appendChild(sim.el);
    figs.appendChild(svgText(568, 288, '参考帧', 'demo-x-mut', 10.5, 'middle'));
    figs.appendChild(paint(svgText(676, 288, '教师跟住了', null, 10.5, 'middle'), C_GOOD));
    s.appendChild(figs);

    var chip = svgEl('g', {});
    chip.appendChild(paint(svgEl('rect', { x: 44, y: 310, width: 712, height: 48, rx: 8, 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }), C_SURFACE, C_WARN));
    chip.appendChild(paint(svgText(400, 330, '但「跟得住」不等于「用得上」：拿掉参考帧，教师不知道该做什么', null, 11.5, 'middle'), C_WARN));
    chip.appendChild(svgText(400, 348, '它没有一个可以采样、可以给高层策略当动作空间的表示', 'demo-x-mut', 10, 'middle'));
    s.appendChild(chip);

    var foot = paint(svgText(400, 392, '阶段 1 交出的是能力，不是表示 —— 把能力变成表示，是阶段 2 的事', null, 15, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      var ph = 0.1 + t * 0.3;
      ref.pose(568, 226, poseWalk(ph));
      sim.pose(676, 226, poseWalk(ph - 0.04));
      rows.forEach(function (r) { setOpacity(r.g, seg(t, r.at, r.at + 0.4)); });
      var boxOn = seg(t, 2.8, 3.4);
      setOpacity(box, boxOn);
      setOpacity(feedArrow, boxOn);
      setOpacity(figs, seg(t, 4.4, 5.2));
      setOpacity(chip, seg(t, 7.4, 8.2));
      setOpacity(foot, seg(t, 10.0, 10.8));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 3: 阶段 2 —— VIB，β 决定潜空间长什么样 ──
     三列的数字就是上面 VIB 实验台的三个预设按钮，同一个 vib() 现算。 */
  var S3_BETAS = [
    { beta: 0, label: '\\beta = 0', tag: '纯蒸馏，不压缩', verdict: '把 AMASS 背下来', color: C_BAD },
    { beta: 0.35, label: '\\beta \\approx 0.35', tag: 'PULSE 的落点', verdict: '采样能跑，编码认得出', color: C_GOOD },
    { beta: 4, label: '\\beta = 4', tag: 'posterior collapse', verdict: '什么也没记住', color: C_BAD }
  ];
  var S3_V = S3_BETAS.map(function (b) { return vib(b.beta); });

  function buildSceneVib() {
    var s = sceneSvg(
      'VIB 蒸馏：KL 项前面的 β 太小，潜空间只是把 AMASS 背下来；太大，后验塌成先验。' +
        '三列分别是 β = 0、0.35、4 下五段动作的后验形状与读数'
    );
    s.appendChild(svgText(60, 30, '阶段 2：把教师蒸馏进潜空间，β 决定潜空间长什么样', 'demo-x-ink2', 13.5));
    var formula = svgMath(400, 60,
      '\\mathcal{L} = \\|a_{student} - a_{teacher}\\|^2 + \\beta \\cdot \\mathrm{KL}\\big(q(z \\mid s, ref) \\,\\|\\, p(z \\mid s)\\big)',
      { size: 12.5, anchor: 'middle', cls: 'demo-x-ink2', w: 700 });
    s.appendChild(formula);

    var cols = S3_BETAS.map(function (b, k) {
      var v = S3_V[k];
      var cx = 178 + k * 222;
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: cx - 104, y: 88, width: 208, height: 218, rx: 8, 'stroke-width': 1.2 }), C_SURFACE2, b.color));
      g.appendChild(svgMath(cx, 110, b.label, { size: 12.5, anchor: 'middle', w: 180 }).setTone(b.color));
      g.appendChild(svgText(cx, 130, b.tag, 'demo-x-mut', 10, 'middle'));

      // 五段动作的后验：宽度就是 vib() 给的 s
      var base = 236,
        halfW = 88,
        sd = Math.max(0.05, v.s);
      CLIPS.forEach(function (c) {
        var mu = v.a * c.mu;
        var lo = Math.max(-3, mu - 4 * sd),
          hi = Math.min(3, mu + 4 * sd);
        var pts = [[cx + (lo / 3) * halfW, base]];
        for (var j = 0; j <= 40; j++) {
          var z = lo + ((hi - lo) * j) / 40;
          var pdf = Math.exp(-((z - mu) * (z - mu)) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));
          pts.push([cx + (z / 3) * halfW, base - clamp(pdf / 1.6, 0, 1) * 70]);
        }
        pts.push([cx + (hi / 3) * halfW, base]);
        g.appendChild(paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': 1.6 }), null, b.color));
      });
      // 先验 N(0, 1) 作背景参照
      var pr = [];
      for (var q = 0; q <= 60; q++) {
        var zz = -3 + (6 * q) / 60;
        pr.push([cx + (zz / 3) * halfW, base - clamp(Math.exp(-(zz * zz) / 2) / Math.sqrt(2 * Math.PI) / 1.6, 0, 1) * 70]);
      }
      g.appendChild(paint(svgEl('path', { d: polyPath(pr), fill: 'none', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }), null, C_MUTED));
      g.appendChild(paint(svgEl('line', { x1: cx - halfW, y1: base, x2: cx + halfW, y2: base, 'stroke-width': 1 }), null, C_BORDER));
      g.appendChild(svgText(cx, base + 14, 'latent z（画成 1 维）', 'demo-x-mut', 9, 'middle'));

      [
        ['蒸馏误差', fmt(v.distort, 3)],
        ['先验采样可用度', fmt(v.sample, 3)],
        ['latent 记住的片段信息', fmt(v.a, 3)]
      ].forEach(function (row, j) {
        var y = 268 + j * 14;
        g.appendChild(svgText(cx - 94, y, row[0], 'demo-x-mut', 9.5));
        g.appendChild(paint(svgText(cx + 94, y, row[1], 'demo-x-mono', 10, 'end'), b.color));
      });
      s.appendChild(g);
      return { g: g, at: 1.4 + k * 2.6 };
    });

    var verdicts = S3_BETAS.map(function (b, k) {
      var n = paint(svgText(178 + k * 222, 330, b.verdict, null, 11, 'middle'), b.color);
      s.appendChild(n);
      return { n: n, at: 2.4 + k * 2.6 };
    });

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 374, '中间那一段才是 PULSE：后验刚好连成一片，聚合起来又接近先验', null, 15, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 398, '「采样 → 连贯动作」和「编码 → 复刻动作」这时候才能同时成立', 'demo-x-mut', 11, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      setOpacity(formula, seg(t, 0.3, 1.0));
      cols.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.6)); });
      verdicts.forEach(function (v) { setOpacity(v.n, seg(t, v.at, v.at + 0.5)); });
      setOpacity(foot, seg(t, 12.4, 13.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 4: 本体感受先验 p(z|s) ──
     可行率与存活率都由上面「先验」演示的同一个 feasibleRate() 现算（状态 = 腾空中，seed = 4）。 */
  var S4_ST = BODY_STATES[2];
  var S4_SEED = 4;
  var S4_PROP = feasibleRate(S4_ST, S4_ST.c, S4_ST.r * 0.32, S4_SEED);
  var S4_FIXED = feasibleRate(S4_ST, [0, 0], 1.0, S4_SEED);
  var S4_H = 40;
  var S4_SURV_FIXED = Math.pow(S4_FIXED.rate, S4_H);

  function buildScenePrior() {
    var s = sceneSvg(
      '腾空中这个状态下，固定先验 N(0, I) 采到的 z 只有 ' + fmt(S4_FIXED.rate * 100, 1) +
        '% 是这一步做得出来的；本体感受先验把采样中心搬到当前状态的可行区上'
    );
    s.appendChild(svgText(60, 30, '命门二：固定的 N(0, I) 不知道你此刻站着还是在空中', 'demo-x-ink2', 13.5));

    // 左：latent 平面
    s.appendChild(paint(svgEl('rect', { x: 40, y: 52, width: 360, height: 276, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    var PX = 220,
      PY = 196,
      SC = 40;
    function px(v) { return PX + v * SC; }
    function py(v) { return PY - v * SC; }
    s.appendChild(svgText(220, 74, '当前状态下「做得出来」的 latent 区域', 'demo-x-mut', 10.5, 'middle'));
    BODY_STATES.forEach(function (st) {
      if (st.id === S4_ST.id) return;
      s.appendChild(paint(svgEl('circle', { cx: px(st.c[0]), cy: py(st.c[1]), r: st.r * SC, fill: 'none', 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_BORDER));
      s.appendChild(svgText(px(st.c[0]), py(st.c[1] + st.r) - 5, st.name, 'demo-x-mut', 9, 'middle'));
    });
    var zone = svgEl('g', {});
    zone.appendChild(paint(svgEl('circle', { cx: px(S4_ST.c[0]), cy: py(S4_ST.c[1]), r: S4_ST.r * SC, 'fill-opacity': 0.16, 'stroke-width': 1.4 }), C_GOOD, C_GOOD));
    zone.appendChild(paint(svgText(px(S4_ST.c[0] + S4_ST.r) + 8, py(S4_ST.c[1]) - 10, S4_ST.name + ' 的可行区', null, 10), C_GOOD));
    s.appendChild(zone);

    var fixedDots = S4_FIXED.pts.map(function (q, k) {
      var n = paint(svgEl('circle', { cx: px(clamp(q.x, -3.6, 3.6)).toFixed(1), cy: py(clamp(q.y, -2.6, 2.6)).toFixed(1), r: 2.8 }), q.ok ? C_GOOD : C_BAD);
      s.appendChild(n);
      return { n: n, at: 2.6 + k * 0.045 };
    });
    var propDots = S4_PROP.pts.map(function (q, k) {
      var n = paint(svgEl('circle', { cx: px(clamp(q.x, -3.6, 3.6)).toFixed(1), cy: py(clamp(q.y, -2.6, 2.6)).toFixed(1), r: 2.8 }), q.ok ? C_GOOD : C_BAD);
      s.appendChild(n);
      return { n: n, at: 8.0 + k * 0.045 };
    });
    var fixedC = svgEl('g', {});
    fixedC.appendChild(paint(svgEl('circle', { cx: px(0), cy: py(0), r: 6, 'stroke-width': 1.6 }), C_BAD, C_SURFACE2));
    fixedC.appendChild(svgMath(px(0) + 12, py(0) + 4, '\\mathcal{N}(0, I)', { size: 10.5, w: 110 }).setTone(C_BAD));
    s.appendChild(fixedC);
    var propC = svgEl('g', {});
    propC.appendChild(paint(svgEl('circle', { cx: px(S4_ST.c[0]), cy: py(S4_ST.c[1]), r: 6, 'stroke-width': 1.6 }), C_ACCENT, C_SURFACE2));
    propC.appendChild(svgMath(px(S4_ST.c[0]), py(S4_ST.c[1] - S4_ST.r) + 18, 'p(z \\mid s)', { size: 10.5, anchor: 'middle', w: 110 }).setTone(C_ACCENT));
    s.appendChild(propC);

    // 右：存活率随步数衰减
    s.appendChild(paint(svgEl('rect', { x: 420, y: 52, width: 340, height: 276, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    s.appendChild(svgText(590, 74, '连滚 N 步还没发散的概率（可行率的 N 次方）', 'demo-x-mut', 10.5, 'middle'));
    var AX0 = 456,
      AX1 = 736,
      AY0 = 246,
      AY1 = 96;
    function ax(n) { return AX0 + (n / 60) * (AX1 - AX0); }
    function ay(v) { return AY0 - v * (AY0 - AY1); }
    s.appendChild(paint(svgEl('line', { x1: AX0, y1: AY0, x2: AX1, y2: AY0, 'stroke-width': 1.2 }), null, C_BORDER));
    s.appendChild(paint(svgEl('line', { x1: AX0, y1: AY0, x2: AX0, y2: AY1, 'stroke-width': 1.2 }), null, C_BORDER));
    [0, 20, 40, 60].forEach(function (n) {
      s.appendChild(svgText(ax(n), AY0 + 15, String(n), 'demo-x-mut', 9.5, 'middle'));
    });
    s.appendChild(svgText(596, AY0 + 30, '连续滚了多少步', 'demo-x-mut', 9.5, 'middle'));
    function survPath(rate) {
      var pts = [];
      for (var n = 0; n <= 60; n++) pts.push([ax(n), ay(Math.pow(rate, n))]);
      return pts;
    }
    var curveFixed = paint(svgEl('path', { d: polyPath(survPath(S4_FIXED.rate)), fill: 'none', 'stroke-width': 2.4 }), null, C_BAD);
    var curveProp = paint(svgEl('path', { d: polyPath(survPath(S4_PROP.rate)), fill: 'none', 'stroke-width': 2.4 }), null, C_GOOD);
    s.appendChild(curveFixed);
    s.appendChild(curveProp);
    var readout = svgEl('g', {});
    [
      ['单步可行率', fmt(S4_PROP.rate * 100, 1) + '%', fmt(S4_FIXED.rate * 100, 1) + '%'],
      ['滚 ' + S4_H + ' 步不发散', fmt(Math.pow(S4_PROP.rate, S4_H) * 100, 1) + '%', S4_SURV_FIXED.toExponential(1)]
    ].forEach(function (row, j) {
      var y = 296 + j * 19;
      readout.appendChild(svgText(440, y, row[0], 'demo-x-mut', 10));
      readout.appendChild(paint(svgText(640, y, 'p(z|s) ' + row[1], 'demo-x-mono', 10, 'end'), C_GOOD));
      readout.appendChild(paint(svgText(748, y, row[2], 'demo-x-mono', 10, 'end'), C_BAD));
    });
    s.appendChild(readout);

    var chip = svgEl('g', {});
    chip.appendChild(svgText(400, 356, '单步 0.9 看着不错，连滚 40 步只剩 0.9⁴⁰ ≈ 1.5% —— 长序列对先验的要求苛刻得多', 'demo-x-mut', 11, 'middle'));
    s.appendChild(chip);

    var foot = paint(svgText(400, 392, '「随便采一个 z 都能跑」靠的不是维度低，是先验知道你此刻在空中', null, 15, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(zone, seg(t, 0.4, 1.0));
      setOpacity(fixedC, seg(t, 2.0, 2.6));
      fixedDots.forEach(function (d) { setOpacity(d.n, seg(t, d.at, d.at + 0.25)); });
      setOpacity(curveFixed, seg(t, 5.4, 6.2));
      setOpacity(propC, seg(t, 7.4, 8.0));
      propDots.forEach(function (d) { setOpacity(d.n, seg(t, d.at, d.at + 0.25)); });
      setOpacity(curveProp, seg(t, 9.8, 10.4));
      setOpacity(readout, seg(t, 10.4, 11.0));
      setOpacity(chip, seg(t, 11.6, 12.2));
      setOpacity(foot, seg(t, 13.0, 13.8));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 5: 阶段 3 —— 下游只在 32 维里搜 ──
     曲线与两个「到 80% 分数要多少轮」用的是下面演示的 dsCurve / dsIters（默认残差 0.6、难度 1）。 */
  var S5_REACH = dsReach(0.6);
  var S5_ITERS = 400;
  var S5_LAT = clamp(dsCurve(LAT_DIM, LAT_USABLE, S5_ITERS, 1) * S5_REACH, 0, 1);
  var S5_RAW = dsCurve(RAW_DIM, RAW_USABLE, S5_ITERS, 1);
  var S5_TLAT = dsIters(0.8 / S5_REACH, LAT_DIM, LAT_USABLE, 1);
  var S5_TRAW = dsIters(0.8, RAW_DIM, RAW_USABLE, 1);

  function buildSceneDownstream() {
    var s = sceneSvg(
      '下游任务冻结 Decoder 与先验，高层只在 32 维潜空间上输出一个残差；' +
        '同样跑 400 轮，潜空间拿到 ' + fmt(S5_LAT, 2) + ' 分，从零学只有 ' + fmt(S5_RAW, 2) + ' 分'
    );
    s.appendChild(svgText(60, 28, '阶段 3：冻结 Decoder 与先验，高层只输出一个残差', 'demo-x-ink2', 13.5));

    var chain = svgEl('g', {});
    [
      { x: 40, w: 118, t: '任务观测', sub: '目标速度 / 目标点', c: C_MUTED },
      { x: 178, w: 148, t: '高层策略', sub: 'PPO 只更新这里', c: C_ACCENT },
      { x: 346, w: 148, t: 'p(z|s) + Δz', sub: '32 维 latent', c: C_GOOD },
      { x: 514, w: 128, t: '冻结 Decoder', sub: '物理可行性保底', c: C_GOOD },
      { x: 662, w: 98, t: '关节动作', sub: '69 维', c: C_MUTED }
    ].forEach(function (b, k) {
      chain.appendChild(paint(svgEl('rect', { x: b.x, y: 54, width: b.w, height: 52, rx: 8, 'stroke-width': 1.3, 'stroke-dasharray': k === 3 ? '5 4' : '' }), C_SURFACE2, b.c));
      chain.appendChild(paint(svgText(b.x + b.w / 2, 76, b.t, null, 11.5, 'middle'), b.c));
      chain.appendChild(svgText(b.x + b.w / 2, 93, b.sub, 'demo-x-mut', 9.5, 'middle'));
      if (k < 4) {
        chain.appendChild(paint(svgEl('line', { x1: b.x + b.w + 3, y1: 80, x2: b.x + b.w + 17, y2: 80, 'stroke-width': 1.4 }), null, C_BORDER));
      }
    });
    s.appendChild(chain);

    // 学习曲线
    s.appendChild(paint(svgEl('rect', { x: 40, y: 124, width: 436, height: 200, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    var BX0 = 86,
      BX1 = 452,
      BY0 = 288,
      BY1 = 150;
    function bx(it) { return BX0 + (it / 1200) * (BX1 - BX0); }
    function by(v) { return BY0 - v * (BY0 - BY1); }
    s.appendChild(paint(svgEl('line', { x1: BX0, y1: BY0, x2: BX1, y2: BY0, 'stroke-width': 1.2 }), null, C_BORDER));
    s.appendChild(paint(svgEl('line', { x1: BX0, y1: BY0, x2: BX0, y2: BY1, 'stroke-width': 1.2 }), null, C_BORDER));
    [0, 400, 800, 1200].forEach(function (it) {
      s.appendChild(svgText(bx(it), BY0 + 15, String(it), 'demo-x-mut', 9.5, 'middle'));
    });
    s.appendChild(svgText(269, BY0 + 30, '训练迭代', 'demo-x-mut', 9.5, 'middle'));
    s.appendChild(svgText(78, BY1 - 6, '任务分数', 'demo-x-mut', 9.5, 'end'));
    s.appendChild(paint(svgEl('line', { x1: BX0, y1: by(0.8), x2: BX1, y2: by(0.8), 'stroke-width': 1, 'stroke-dasharray': '4 4' }), null, C_MUTED));
    s.appendChild(svgText(BX0 + 6, by(0.8) - 6, '80% 分数线', 'demo-x-mut', 9));

    function learnPts(dim, usable, scale) {
      var pts = [];
      for (var it = 0; it <= 1200; it += 20) pts.push([bx(it), by(clamp(dsCurve(dim, usable, it, 1) * scale, 0, 1))]);
      return pts;
    }
    var latPath = paint(svgEl('path', { d: polyPath(learnPts(LAT_DIM, LAT_USABLE, S5_REACH)), fill: 'none', 'stroke-width': 2.6 }), null, C_GOOD);
    var rawPath = paint(svgEl('path', { d: polyPath(learnPts(RAW_DIM, RAW_USABLE, 1)), fill: 'none', 'stroke-width': 2.4 }), null, C_BAD);
    s.appendChild(rawPath);
    s.appendChild(latPath);
    var latLbl = paint(svgText(bx(940), by(0.9) - 8, '32 维潜空间', null, 10.5, 'middle'), C_GOOD);
    var rawLbl = paint(svgText(bx(940), by(dsCurve(RAW_DIM, RAW_USABLE, 940, 1)) + 16, '69 维关节空间', null, 10.5, 'middle'), C_BAD);
    s.appendChild(latLbl);
    s.appendChild(rawLbl);
    var mark = svgEl('g', {});
    mark.appendChild(paint(svgEl('line', { x1: bx(S5_ITERS), y1: BY0, x2: bx(S5_ITERS), y2: BY1, 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_BORDER));
    mark.appendChild(paint(svgEl('circle', { cx: bx(S5_ITERS), cy: by(S5_LAT), r: 4.5, 'stroke-width': 1.4 }), C_GOOD, C_SURFACE2));
    mark.appendChild(paint(svgEl('circle', { cx: bx(S5_ITERS), cy: by(S5_RAW), r: 4.5, 'stroke-width': 1.4 }), C_BAD, C_SURFACE2));
    s.appendChild(mark);

    // 右：读数
    var cards = [
      { t: '跑满 ' + S5_ITERS + ' 轮', a: '32 维 ' + fmt(S5_LAT, 2) + ' 分', b: '69 维 ' + fmt(S5_RAW, 2) + ' 分', c: C_ACCENT },
      { t: '到 80% 分数要多少轮', a: '约 ' + fmt(S5_TLAT, 0) + ' 轮', b: '约 ' + fmt(S5_TRAW, 0) + ' 轮', c: C_GOOD },
      { t: '快了多少', a: fmt(S5_TRAW / S5_TLAT, 1) + ' ×', b: '维度只省一倍（69 → 32）', c: C_WARN }
    ].map(function (c, k) {
      var g = svgEl('g', {});
      var y = 124 + k * 68;
      g.appendChild(paint(svgEl('rect', { x: 494, y: y, width: 266, height: 58, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, c.c));
      g.appendChild(svgText(508, y + 20, c.t, 'demo-x-mut', 10));
      g.appendChild(paint(svgText(508, y + 42, c.a, 'demo-x-mono', 12), c.c));
      g.appendChild(svgText(746, y + 42, c.b, 'demo-x-mut', 10, 'end'));
      s.appendChild(g);
      return { g: g, at: 4.0 + k * 1.6 };
    });

    var chip = svgText(400, 348, '剩下那一大截来自「不用再学怎么站稳」：关节空间里随便采一组力矩，角色几乎必然当场倒地', 'demo-x-mut', 11, 'middle');
    s.appendChild(chip);

    var foot = paint(svgText(400, 388, '高层学的是「何时用什么技能」，不是「怎么动」', null, 15, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(chain, seg(t, 0.3, 1.0));
      var u = ease(seg(t, 1.4, 4.2));
      latPath.setAttribute('d', polyPath(learnPts(LAT_DIM, LAT_USABLE, S5_REACH).slice(0, Math.max(2, Math.round(u * 61)))));
      rawPath.setAttribute('d', polyPath(learnPts(RAW_DIM, RAW_USABLE, 1).slice(0, Math.max(2, Math.round(u * 61)))));
      setOpacity(latLbl, seg(t, 3.0, 3.6));
      setOpacity(rawLbl, seg(t, 3.0, 3.6));
      setOpacity(mark, seg(t, 4.2, 4.8));
      cards.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.6)); });
      setOpacity(chip, seg(t, 10.2, 10.9));
      setOpacity(foot, seg(t, 12.4, 13.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 6: 三阶段闭环与源码落点 ── */
  var S6_CARDS = [
    {
      t: '阶段 1 · 大规模模仿',
      cmd: 'env.models=[phc_3, phc_comp_3]',
      file: 'phc/env/tasks/humanoid_im.py',
      d: '训练好的 PHC 教师，跟得住 AMASS',
      c: C_MUTED
    },
    {
      t: '阶段 2 · VIB 蒸馏',
      cmd: 'env.task=HumanoidImDistillGetup',
      file: 'humanoid_im_distill.py + ar_prior.py',
      d: '学生带瓶颈地模仿教师 → 32 维 z',
      c: C_ACCENT
    },
    {
      t: '阶段 3 · 下游任务',
      cmd: 'env.task=HumanoidSpeedZ',
      file: 'amp_network_z_builder.py',
      d: 'PPO 只更新高层，Decoder 冻结',
      c: C_GOOD
    }
  ];

  function buildSceneLoop() {
    var s = sceneSvg(
      'PULSE 官方仓库的三阶段：PHC 教师 → HumanoidImDistillGetup 蒸馏出 32 维潜空间 → ' +
        'HumanoidSpeedZ 等下游任务只训高层，统一入口都是 phc/run_hydra.py'
    );
    s.appendChild(svgText(60, 30, '三阶段闭环与源码落点（官方仓库 ZhengyiLuo/PULSE，入口 phc/run_hydra.py）', 'demo-x-ink2', 13));

    var arrow = K.arrowMarker(s, 'pulse-x-arrow-stage', C_BORDER);
    var cards = S6_CARDS.map(function (c, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 252;
      g.appendChild(paint(svgEl('rect', { x: x, y: 66, width: 216, height: 208, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, c.c));
      g.appendChild(paint(svgText(x + 108, 92, c.t, null, 12, 'middle'), c.c));
      g.appendChild(paint(svgEl('rect', { x: x + 14, y: 106, width: 188, height: 30, rx: 6, 'stroke-width': 1 }), C_SURFACE, C_BORDER));
      g.appendChild(svgText(x + 108, 125, c.cmd, 'demo-x-mono', 8.5, 'middle'));
      g.appendChild(svgText(x + 108, 158, c.file, 'demo-x-mono', 8.5, 'middle'));
      g.appendChild(svgText(x + 108, 186, c.d, 'demo-x-mut', 10, 'middle'));
      s.appendChild(g);
      if (k < 2) {
        s.appendChild(paint(svgEl('path', {
          d: polyPath([[x + 220, 170], [x + 248, 170]]), fill: 'none', 'stroke-width': 1.6, 'marker-end': arrow
        }), null, C_BORDER));
      }
      return { g: g, at: 0.8 + k * 2.4 };
    });

    var bottle = svgEl('g', {});
    bottle.appendChild(svgMath(400, 218, '+\\, \\beta \\cdot \\mathrm{KL}\\big(q(z \\mid s, ref) \\,\\|\\, p(z \\mid s)\\big)',
      { size: 11, anchor: 'middle', w: 260 }).setTone(C_ACCENT));
    bottle.appendChild(svgText(400, 244, '瓶颈 + 先验一起学', 'demo-x-mut', 9.5, 'middle'));
    s.appendChild(bottle);

    var freeze = svgEl('g', {});
    freeze.appendChild(paint(svgEl('rect', { x: 558, y: 208, width: 180, height: 50, rx: 8, 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }), C_SURFACE, C_GOOD));
    freeze.appendChild(paint(svgText(648, 228, '🔒 Decoder + 先验冻结', null, 10.5, 'middle'), C_GOOD));
    freeze.appendChild(svgText(648, 246, '高层只输出 32 维残差', 'demo-x-mut', 9.5, 'middle'));
    s.appendChild(freeze);

    var track = [[148, 292], [400, 292], [652, 292]];
    var rail = paint(svgEl('path', { d: polyPath(track), fill: 'none', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }), null, C_BORDER);
    s.appendChild(rail);
    var token = paint(svgEl('circle', { r: 6, 'stroke-width': 1.6 }), C_ACCENT, C_SURFACE2);
    s.appendChild(token);
    var tokenLbl = svgText(400, 314, 'AMASS 的动作能力，一路压进 32 维 latent', 'demo-x-mut', 10, 'middle');
    s.appendChild(tokenLbl);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 366, 'PULSE = 大规模模仿 + VIB 瓶颈 + 本体感受先验', null, 15.5, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 390, '把「会动」压成一个可采样的表示，下游就只剩「何时用什么技能」这一件事', 'demo-x-mut', 11.5, 'middle'));
    foot.appendChild(svgText(400, 410, 'MimicKit 没有实现 VIB 蒸馏与 proprioceptive prior，读 PULSE 要用官方仓库', 'demo-x-mut', 10, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      cards.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.7)); });
      setOpacity(bottle, seg(t, 3.6, 4.4));
      setOpacity(freeze, seg(t, 6.4, 7.2));
      var on = seg(t, 8.0, 8.6);
      setOpacity(rail, on);
      setOpacity(token, on);
      setOpacity(tokenLbl, on);
      var pt = pointOn(track, ease(seg(t, 8.2, 11.0)));
      token.setAttribute('cx', pt[0].toFixed(1));
      token.setAttribute('cy', pt[1].toFixed(1));
      setOpacity(foot, seg(t, 11.2, 12.0));
    }

    return { el: s, draw: draw };
  }

  var PULSE_SCENES = [
    {
      title: '缺一个通用表示',
      dur: 13,
      build: buildSceneGap,
      cues: [
        { at: 0.3, s: 'ASE 和 CALM 已经证明「技能可以压进 latent」—— 但它们的潜空间通常只针对特定任务或较小数据集。' },
        { at: 1.2, s: '**AMASS 是数万个动作片段**，覆盖人类 99.8% 的日常动作 —— 这才是「通用」该有的量级。' },
        { at: 5.6, s: '① **覆盖率不足**：之前的 latent skill 难以覆盖人类全谱系动作。' },
        { at: 6.5, s: '② **规模怎么压**：如何把这么多片段压进一个统一且**可控**的潜空间？' },
        { at: 7.4, s: '③ **下游要免重训**：高层策略得在不重训底层控制器的前提下直接用这个潜空间。' },
        { at: 10.4, s: 'PULSE 要的是人形控制的**「基础模型」**：一个 32 维、随便采一个 $z$ 都能跑的通用潜空间。' }
      ]
    },
    {
      title: '阶段1：大规模模仿',
      dur: 12,
      build: buildSceneTeacher,
      cues: [
        { at: 0.3, s: '第一阶段只做一件事：训练一个**高保真运动模仿器**，跟踪 AMASS 里极其多样且无结构的动作。' },
        { at: 2.8, s: '它是有参考帧的：$\\pi_{teacher}(a_t \\mid s_t, ref_t)$，奖励就是「跟得有多准」（PULSE 直接用训练好的 PHC）。' },
        { at: 4.4, s: '给它一段动捕，它能跟住 —— 走、跑、转圈、挥手、跌倒爬起都行。' },
        { at: 7.4, s: '但**「跟得住」不等于「用得上」**：拿掉参考帧，教师不知道该做什么。' },
        { at: 8.6, s: '它没有一个可以采样、可以给高层策略当动作空间的**表示**。' },
        { at: 10.0, s: '所以阶段 1 交出的是**能力**，不是表示 —— 把能力变成表示，是阶段 2 的事。' }
      ]
    },
    {
      title: '阶段2：VIB 瓶颈',
      dur: 16,
      build: buildSceneVib,
      cues: [
        { at: 0.3, s: '第二阶段用**变分信息瓶颈**把教师的技能蒸馏进一个概率潜空间。' },
        { at: 0.8, s: '损失有两项：蒸馏项 $\\|a_{student} - a_{teacher}\\|^2$，加上 $\\beta$ 倍的 $\\mathrm{KL}(q(z \\mid s, ref) \\,\\|\\, p(z \\mid s))$。' },
        { at: 1.4, s: '$\\beta = 0$：后验缩成五个尖峰，蒸馏误差 **' + fmt(S3_V[0].distort, 3) + '** —— 完美复刻，但那只是**把 AMASS 背下来**。' },
        { at: 2.4, s: '代价是先验采样可用度只有 **' + fmt(S3_V[0].sample, 3) + '**：采到尖峰之间的空隙，解码出来什么都不是。' },
        { at: 4.0, s: '$\\beta \\approx 0.35$：五段后验刚好连成一片又没糊在一起，采样可用度 **' + fmt(S3_V[1].sample, 3) + '**，蒸馏误差 **' + fmt(S3_V[1].distort, 3) + '**。' },
        { at: 6.6, s: '$\\beta = 4$：**posterior collapse** —— latent 只记住了 **' + fmt(S3_V[2].a, 3) + '** 的片段信息，后验被压得和先验一模一样。' },
        { at: 8.0, s: 'KL 降到 **' + fmt(S3_V[2].kl, 3) + '** 了，代价是解码器分不清你给的是「走」还是「跌倒爬起」。' },
        { at: 12.4, s: '中间那一段才是 PULSE：**「采样 → 连贯动作」和「编码 → 复刻动作」这时候才能同时成立**。' }
      ]
    },
    {
      title: '本体感受先验',
      dur: 15,
      build: buildScenePrior,
      cues: [
        { at: 0.3, s: '光有瓶颈还不够。**固定的 $\\mathcal{N}(0, I)$ 不知道你此刻是站着还是在空中** —— 每个身体状态只有一小片 latent 是做得出来的。' },
        { at: 2.0, s: '拿「腾空中」这个状态试：从固定先验采 40 个 $z$……' },
        { at: 4.4, s: '只有 **' + fmt(S4_FIXED.rate * 100, 1) + '%** 是这一步真做得出来的，其余全是**在空中起跳**这种废动作。' },
        { at: 5.4, s: '而发散是**指数级**的：连滚 ' + S4_H + ' 步还不发散的概率只剩 **' + S4_SURV_FIXED.toExponential(1) + '** —— 几乎必然摔。' },
        { at: 7.4, s: 'PULSE 学的是 $p(z \\mid s)$：以当前姿态、速度为条件的**本体感受先验**（`ar_prior.py`）。' },
        { at: 9.8, s: '采样中心搬到当前状态的可行区上，单步可行率 **' + fmt(S4_PROP.rate * 100, 1) + '%** —— 长序列这才稳得住。' },
        { at: 11.6, s: '这也是论文特别强调「长时间序列下依然物理可行」的原因：单步 0.9 看着不错，40 步只剩 1.5%。' },
        { at: 13.0, s: '**这是 PULSE 相对 ASE 的关键补丁**：ASE 从固定球面均匀采 $z$，默认「任何技能在任何状态都能启动」。' }
      ]
    },
    {
      title: '阶段3：下游只搜 32 维',
      dur: 15,
      build: buildSceneDownstream,
      cues: [
        { at: 0.3, s: '下游任务把 **Decoder 和先验整个冻结**，高层策略只在 $p(z \\mid s)$ 上输出一个 32 维残差 $\\Delta z$。' },
        { at: 1.4, s: '同样跑 ' + S5_ITERS + ' 轮：潜空间拿到 **' + fmt(S5_LAT, 2) + '** 分，从零学 69 维关节只有 **' + fmt(S5_RAW, 2) + '** 分。' },
        { at: 4.0, s: '要到 80% 分数，前者约 **' + fmt(S5_TLAT, 0) + ' 轮**，后者约 **' + fmt(S5_TRAW, 0) + ' 轮**。' },
        { at: 5.6, s: '差了 **' + fmt(S5_TRAW / S5_TLAT, 1) + ' 倍** —— 但维度只从 69 降到 32，**降维本身只省一倍**。' },
        { at: 7.2, s: '剩下那一大截来自先验：关节空间里随便采一组力矩，角色几乎必然当场倒地，那些 rollout 全是浪费。' },
        { at: 10.2, s: '残差也不能随便拉大：偏出先验覆盖的那片，分数上去了，动作自然度会掉下来。' },
        { at: 12.4, s: '一句话：**高层学的是「何时用什么技能」，不是「怎么动」**。' }
      ]
    },
    {
      title: '闭环与源码',
      dur: 14,
      build: buildSceneLoop,
      cues: [
        { at: 0.3, s: '官方仓库 `ZhengyiLuo/PULSE` 基于 PHC / IsaacGym 栈，三个阶段统一入口都是 `phc/run_hydra.py`。' },
        { at: 0.8, s: '阶段 1 直接复用训练好的 PHC 教师：`env.models=[phc_3, phc_comp_3]`，对应 `humanoid_im.py`。' },
        { at: 3.2, s: '阶段 2 `env.task=HumanoidImDistillGetup`：`humanoid_im_distill.py` 出蒸馏损失，`ar_prior.py` 同步学先验。' },
        { at: 3.6, s: '蒸馏是 DAgger 式的在线过程：学生滚出新状态，同一状态再问教师要动作。' },
        { at: 5.6, s: '阶段 3 `env.task=HumanoidSpeedZ`：`amp_network_z_builder.py` 搭 32 维 $z$ 的 actor-critic，配置在 `pulse_z_task.yaml`。' },
        { at: 6.4, s: 'PPO **只更新高层**，物理可行性由冻结的 Decoder 保底。' },
        { at: 11.2, s: '**PULSE = 大规模模仿 + VIB 瓶颈 + 本体感受先验** —— 把「会动」压成一个可采样的表示。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '六幕动画：PULSE 全流程速览',
      sub: '约 85 秒自动播放。空格播放/暂停，← → 换幕；画面里的数字与下面三个演示用的是同一份函数。',
      ariaLabel: 'PULSE 六幕讲解动画',
      notes: [
        '取数依据：第三幕三列的蒸馏误差 / 采样可用度 / 保留的片段信息，由下面 VIB 实验台的同一个 `vib()` 在 $\\beta = 0 / 0.35 / 4$ 上现算（就是那三个预设按钮）；' +
          '第四幕的可行率与存活率来自同一个 `feasibleRate()`（状态 = 腾空中，seed = 4，40 次采样）；' +
          '第五幕的学习曲线与「到 80% 分数要多少轮」来自同一组 `dsCurve()` / `dsIters()`（残差 0.6、任务难度 1）。',
        '第六幕的命令与文件路径来自笔记「PULSE 官方源码对照」与仓库 README：`humanoid_im.py` / `humanoid_im_distill.py` / `ar_prior.py` / `amp_network_z_builder.py` / `pulse_z_task.yaml`。',
        '**这几幕里的玩具模型和下面三个演示同源**：latent 画成 1 维（第三幕）或 2 维平面（第四幕），可行区是一个圆，学习曲线是一条指数收敛的解析式。' +
          '定性结论（$\\beta$ 太小是查找表、太大是 collapse、固定先验在长序列上指数发散、下游省的主要不是维度）成立，**具体数值不能和论文直接比**。'
      ],
      scenes: PULSE_SCENES
    });
  }

  K.mount({
    'pulse-explainer': buildExplainerDemo,
    'pulse-vib': buildVibDemo,
    'pulse-prior': buildPriorDemo,
    'pulse-downstream': buildDownstreamDemo
  });
})();
