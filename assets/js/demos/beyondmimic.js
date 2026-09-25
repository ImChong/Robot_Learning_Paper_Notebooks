/* Interactive BeyondMimic demos for papers/01_Foundational_RL/BeyondMimic.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["beyondmimic"]`, after assets/js/demos/kit.js. The note itself may
 * only contain empty placeholders, because scripts/sanitize_paper_html.py
 * strips <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   bm-explainer — 八幕讲解动画：两个缺口 → 锚定跟踪 → 紧凑 MDP → 自适应采样 →
 *     VAE 潜空间 → 状态-潜动作扩散 → Classifier Guidance → 真机与闭环
 *   bm-anchor   — 锚定跟踪：让机器人在水平面上「随便漂」，只对齐 yaw 和相对协调
 *   bm-sampling — 按失败率加权的起始相位采样，以及那个防遗忘的 λ 混合项
 *   bm-guidance — Classifier Guidance：代价直接相加，不用为组合重新训练
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
    stage = K.stage,
    stageGrid = K.stageGrid,
    begin = K.begin,
    plot = K.plot,
    line = K.line,
    dot = K.dot,
    text = K.text,
    axes = K.axes,
    barLabel = K.barLabel,
    registerRenderer = K.registerRenderer,
    mulberry32 = K.mulberry32,
    gauss = K.gauss;

  // ─── demo 1: 锚定跟踪 ────────────────────────────────────────────────────
  /* 真机一定会在水平面上漂。刚性跟踪世界系绝对位姿时，这个漂移原样进奖励，
     策略只能靠大幅纠偏把自己拽回去 —— 动作就僵了。锚定把 xy 挪到当前位置、
     只对齐 yaw，于是漂移被吸收，剩下的误差才是真正该修的。 */
  function refPath(t) {
    return [1.6 * t, 0.85 * Math.sin(0.9 * t)];
  }

  function buildAnchorDemo(host) {
    var root = card(host, {
      title: '锚定跟踪：允许它在地上漂，但不许它走歪',
      sub:
        '$\\hat{T}_b = T_{\\text{anchor}}\\, T_{b_{\\text{ref}}}^{-1}\\, T_{b,\\text{motion}}$。锚点保留机器人当前的 xy、参考的高度，只对齐 yaw。' +
        '拖动漂移量，看两种跟踪方式下「策略认为自己错了多少」差多少。'
    });

    var state = { drift: 1.4, yaw: 0.25, anchored: true, gain: 1.0 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '真机累积的水平漂移（m）',
      min: 0,
      max: 3,
      step: 0.05,
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
      label: '朝向偏差 yaw（rad）',
      min: -0.8,
      max: 0.8,
      step: 0.02,
      value: state.yaw,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.yaw = v;
        render();
      }
    });
    var togBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(togBox);
    checkbox(togBox, '启用锚定（BeyondMimic 的做法）', state.anchored, function (on) {
      state.anchored = on;
      render();
    });

    var setLegend = legend(root, [
      { key: 'muted', text: '参考动作在世界系里的轨迹' },
      { key: 'accent', text: '机器人实际走出来的轨迹' },
      { key: 'good', text: '锚定之后的参考（跟着机器人挪过来）' },
      { key: 'bad', text: '策略看到的误差' }
    ]);

    var grid = stageGrid(root);
    var mapStage = stage(grid, 245);
    var errStage = stage(grid, 245);

    var stats = statsRow(root);
    var sErr = stats.add('策略看到的位置误差');
    var sYaw = stats.add('朝向误差');
    var sEffort = stats.add('为纠偏付出的动作幅度');
    var sStyle = stats.add('动作风格保真度');
    var verdict = verdictBox(root);

    note(root, [
      '**漂移不是错误，是事实**：真机没有动捕房，状态估计一定会积分漂。' +
        '如果把这份漂移写进奖励，策略就会一直用大幅动作往回拽 —— 结果是动作僵硬、能耗高、接触不柔顺。',
      '**但 yaw 不能放**：锚点只对齐 yaw（`R_z(yaw(...))`），朝向错了仍然算误差。' +
        '把 yaw 滑块拉开，会看到两种模式下这一项都在涨 —— 该修的还是要修。',
      '**高度也不放**：$p_{\\text{anchor}}$ 的 $z$ 取的是**参考的高度**，不是机器人的。' +
        '所以蹲下去、跳起来这些竖直方向的东西照样被跟踪，只有水平面被放开。',
      '**这是简化模型**：真实的锚定是在 SE(3) 上做的，误差还包括各刚体的相对位姿。' +
        '这里只画水平面的位置和 yaw，用来解释「放开什么、保留什么」，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var posErr = state.anchored ? 0.12 : state.drift;
      var yawErr = Math.abs(state.yaw);
      var effort = state.gain * (posErr * 1.6 + yawErr * 0.8);
      var style = clamp(Math.exp(-1.1 * effort * effort), 0, 1);

      sErr.set(fmt(posErr, 2) + ' m', posErr < 0.3 ? 'good' : 'bad');
      sYaw.set(fmt(yawErr, 2) + ' rad', yawErr < 0.15 ? 'good' : 'warn');
      sEffort.set(fmt(effort, 2), effort < 0.5 ? 'good' : effort > 1.5 ? 'bad' : 'warn');
      sStyle.set(fmt(style, 2), style > 0.7 ? 'good' : style < 0.35 ? 'bad' : 'warn');

      if (!state.anchored && state.drift > 0.8) {
        verdict.set(
          '😣 没有锚定：机器人只是往旁边漂了 ' +
            fmt(state.drift, 2) +
            ' m，动作本身没问题，但策略看到的位置误差就是这么大。' +
            '它会用 ' +
            fmt(effort, 2) +
            ' 的纠偏幅度往回拽，风格保真度掉到 ' +
            fmt(style, 2) +
            ' —— 这就是论文说的「过度纠偏、动作僵硬」。',
          'frozen'
        );
      } else if (state.anchored) {
        verdict.set(
          '✅ 锚定之后：参考被整体挪到机器人当前的 xy 上，' +
            fmt(state.drift, 2) +
            ' m 的漂移直接被吸收，位置误差只剩 ' +
            fmt(posErr, 2) +
            ' m。yaw 误差 ' +
            fmt(yawErr, 2) +
            ' rad 仍然在算 —— **放开的是位置，不是朝向**。',
          'learning'
        );
      } else {
        verdict.set(
          '➖ 漂移还小，两种模式差不多。把漂移拖到 1 m 以上再看 —— 真机跑几十秒就能漂这么多。',
          'frozen'
        );
      }

      // ── 左：俯视轨迹 ──
      var g = begin(mapStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 40, r: 14, t: 22, b: 34 }, [-1, 9], [-3.4, 3.4]);
      axes(g, p, { xTicks: [0, 3, 6, 9], yTicks: [-3, 0, 3], xLabel: '世界系 x（m）' });
      text(g.ctx, '俯视：漂移之后参考该放在哪', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var refPts = [],
        robPts = [],
        ancPts = [];
      for (var i = 0; i <= 60; i++) {
        var t = (i * 5) / 60;
        var r = refPath(t);
        refPts.push([p.sx(r[0]), p.sy(r[1])]);
        // 机器人：整体漂了 drift，并且整条轨迹被 yaw 转了一点
        var cx = Math.cos(state.yaw) * r[0] - Math.sin(state.yaw) * r[1];
        var cy = Math.sin(state.yaw) * r[0] + Math.cos(state.yaw) * r[1];
        robPts.push([p.sx(cx), p.sy(clamp(cy - state.drift, -3.4, 3.4))]);
        ancPts.push([p.sx(r[0]), p.sy(clamp(r[1] - state.drift, -3.4, 3.4))]);
      }
      line(g.ctx, refPts, P.muted, 1.8, [5, 4]);
      if (state.anchored) line(g.ctx, ancPts, P.good, 2, [2, 3]);
      line(g.ctx, robPts, P.accent, 2.4);
      var mid = 30;
      var from = state.anchored ? ancPts[mid] : refPts[mid];
      line(g.ctx, [from, robPts[mid]], P.bad, 2.4);
      dot(g.ctx, robPts[mid][0], robPts[mid][1], 5, P.accent, P.surface2);
      text(
        g.ctx,
        state.anchored ? '锚定后的误差（小）' : '未锚定的误差（含整段漂移）',
        (from[0] + robPts[mid][0]) / 2,
        (from[1] + robPts[mid][1]) / 2 - 10,
        P.bad,
        'center',
        '10px sans-serif'
      );

      // ── 右：纠偏幅度与风格保真度随漂移变化 ──
      var g2 = begin(errStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [0, 3], [0, 1.05]);
      axes(g2, p2, {
        xTicks: [0, 1, 2, 3],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '累积漂移（m）'
      });
      text(g2.ctx, '动作风格还剩多少（越高越好）', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      ['anchor', 'rigid'].forEach(function (mode) {
        var pts = [];
        for (var d = 0; d <= 120; d++) {
          var dv = (3 * d) / 120;
          var pe = mode === 'anchor' ? 0.12 : dv;
          var ef = state.gain * (pe * 1.6 + Math.abs(state.yaw) * 0.8);
          pts.push([p2.sx(dv), p2.sy(clamp(Math.exp(-1.1 * ef * ef), 0, 1))]);
        }
        var active = (mode === 'anchor') === state.anchored;
        line(g2.ctx, pts, mode === 'anchor' ? P2.good : P2.bad, active ? 2.6 : 1.4, active ? [] : [4, 4]);
      });
      line(g2.ctx, [[p2.sx(state.drift), p2.y0], [p2.sx(state.drift), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(state.drift), p2.sy(style), 4.5, state.anchored ? P2.good : P2.bad, P2.surface2);
      text(g2.ctx, '锚定跟踪', p2.x0 + 8, p2.sy(0.95), P2.good, 'left', '11px sans-serif');
      text(g2.ctx, '刚性跟踪世界位姿', p2.x0 + 8, p2.sy(0.85), P2.bad, 'left', '11px sans-serif');

      mapStage.canvas.setAttribute('aria-label', '锚定与刚性跟踪下参考轨迹与机器人轨迹的关系');
      errStage.canvas.setAttribute('aria-label', '动作风格保真度随累积漂移的变化');
    });

    render();
  }

  // ─── demo 2: 自适应起始相位采样 ──────────────────────────────────────────
  var BINS = 30; // 一条 30 秒的长参考，按 1 秒分箱

  /* 一条长参考里各段的固有难度：大部分是走路，中间插了两段高动态（侧手翻、跳转）。 */
  function binDifficulty() {
    var d = [];
    for (var i = 0; i < BINS; i++) {
      var hard = 0.9 * Math.exp(-Math.pow(i - 11, 2) / 4) + 0.75 * Math.exp(-Math.pow(i - 22, 2) / 2.5);
      d.push(clamp(0.12 + hard, 0, 1));
    }
    return d;
  }

  /* 训练若干轮：每轮按 p_s' 分配采样预算，被采到越多的箱子失败率掉得越快。 */
  function samplingProbs(fail, lambda, gamma, uniform) {
    // 非因果指数核：把失败的权重往前摊，采样点落在失败**之前**那几秒
    var score = [];
    for (var s = 0; s < BINS; s++) {
      var acc = 0;
      for (var tau = 0; tau < 5; tau++) acc += Math.pow(gamma, tau) * fail[Math.min(BINS - 1, s + tau)];
      score.push(acc);
    }
    var sum = score.reduce(function (a, b) {
      return a + b;
    }, 0);
    return score.map(function (v) {
      var ps = sum > 0 ? v / sum : 1 / BINS;
      return uniform ? 1 / BINS : lambda * (1 / BINS) + (1 - lambda) * ps;
    });
  }

  function trainSampling(diff, lambda, gamma, rounds, uniform) {
    var fail = diff.slice();
    var history = [fail.slice()];
    for (var r = 0; r < rounds; r++) {
      var probs = samplingProbs(fail, lambda, gamma, uniform);
      fail = fail.map(function (f, i) {
        // 采样预算越多，这一箱学得越快；长期采不到的会慢慢被忘掉
        var budget = probs[i] * BINS;
        var learn = 0.55 * budget;
        var forget = 0.035 * Math.max(0, 1 - budget);
        return clamp(f * (1 - clamp(learn, 0, 0.9)) + forget, 0.002, 1);
      });
      history.push(fail.slice());
    }
    return { fail: fail, probs: samplingProbs(fail, lambda, gamma, uniform), history: history };
  }

  function buildSamplingDemo(host) {
    var root = card(host, {
      title: '起始相位不能均匀采：简单片段会把预算吃光',
      sub:
        '一条 3 分钟的多技能参考里，走路占了绝大部分。均匀采样的结果是「大部分预算花在已经会的地方」。' +
        'BeyondMimic 按 1 秒分箱、按失败率加权，再用 $\\lambda$ 掺一点均匀分布防遗忘。'
    });

    var state = { lambda: 0.25, gamma: 0.8, rounds: 10, uniform: false };
    var diff = binDifficulty();

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '$\\lambda$（掺多少均匀分布，防灾难性遗忘）',
      min: 0,
      max: 1,
      step: 0.02,
      value: state.lambda,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.lambda = v;
        render();
      }
    });
    slider(ctrls, {
      label: '非因果核 $\\gamma$（往前看几秒）',
      min: 0,
      max: 0.98,
      step: 0.02,
      value: state.gamma,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.gamma = v;
        render();
      }
    });
    slider(ctrls, {
      label: '训练轮数',
      min: 0,
      max: 30,
      step: 1,
      value: state.rounds,
      format: function (v) {
        return fmt(v, 0);
      },
      onInput: function (v) {
        state.rounds = v;
        render();
      }
    });
    buttonGroup(ctrls, {
      label: '采样方式',
      value: 'adaptive',
      items: [
        { label: '按失败率自适应', value: 'adaptive' },
        { label: '均匀采样（基线）', value: 'uniform' }
      ],
      onPick: function (v) {
        state.uniform = v === 'uniform';
        render();
      }
    });

    var setLegend = legend(root, [
      { key: 'bad', text: '这一秒的失败率' },
      { key: 'accent', text: '下一轮会从这里起步的概率 $p_{s\'}$' },
      { key: 'muted', text: '$\\lambda$ 掺进来的均匀底噪' }
    ]);

    var grid = stageGrid(root);
    var binStage = stage(grid, 245);
    var curveStage = stage(grid, 245);

    var stats = statsRow(root);
    var sAvg = stats.add('平均失败率');
    var sWorst = stats.add('最难那一秒的失败率');
    var sHardBudget = stats.add('两段高动态拿到的预算');
    var sFloor = stats.add('最冷门那一秒的采样概率');
    var verdict = verdictBox(root);

    note(root, [
      '**$\\lambda$ 是保险，不是调味**：把 $\\lambda$ 拖到 0，采样会全压在最难的那两段上，' +
        '走路那部分长时间一次都采不到 —— 于是它慢慢被忘掉（看左图两侧的红柱重新长回来）。' +
        '论文那句「防止灾难性遗忘」就是这个意思。',
      '**$\\gamma$ 决定「提前多久开始练」**：失败往往发生在某个动作的中段，但问题可能出在进入姿势上。' +
        '非因果核 $\\gamma^{\\tau}$ 把失败的权重往前摊，让采样点落在失败**之前**那几秒。把 $\\gamma$ 拖到 0，只会盯着失败那一秒本身。',
      '**这和 PHC 的 PMCP 是两种思路**：PHC 遇到难例是**加一列网络**，BeyondMimic 是**改采样分布**。' +
        '前者不会遗忘但要多跑几份前向，后者是单策略、单 MDP，代价就是这个 $\\lambda$ 要调。',
      '**这是简化模型**：真实的失败率来自并行环境的终止统计，学习速度也不是线性的。' +
        '这里只复现「预算分配 → 失败率下降 → 预算转移」这个闭环，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var res = trainSampling(diff, state.lambda, state.gamma, state.rounds, state.uniform);
      var avg =
        res.fail.reduce(function (a, b) {
          return a + b;
        }, 0) / BINS;
      var worst = Math.max.apply(null, res.fail);
      var hardBudget = (res.probs[11] + res.probs[12] + res.probs[21] + res.probs[22]) * 100;
      var floor = Math.min.apply(null, res.probs) * 100;

      sAvg.set(fmt(avg * 100, 1) + '%', avg < 0.1 ? 'good' : avg > 0.3 ? 'bad' : 'warn');
      sWorst.set(fmt(worst * 100, 1) + '%', worst < 0.2 ? 'good' : 'warn');
      sHardBudget.set(fmt(hardBudget, 1) + '%', hardBudget > 25 ? 'good' : 'warn');
      sFloor.set(fmt(floor, 2) + '%', floor > 0.8 ? 'good' : 'bad');

      if (state.uniform) {
        verdict.set(
          '😴 均匀采样：每一秒都拿 ' +
            fmt(100 / BINS, 2) +
            '% 的预算，两段高动态加起来只有 ' +
            fmt(hardBudget, 1) +
            '%。跑了 ' +
            state.rounds +
            ' 轮，最难那一秒的失败率还有 ' +
            fmt(worst * 100, 1) +
            '% —— 预算全花在已经会走路的地方了。',
          'frozen'
        );
      } else if (state.lambda < 0.06) {
        verdict.set(
          '⚠️ $\\lambda$ = ' +
            fmt(state.lambda, 2) +
            '：采样几乎全压在难段上，最冷门那一秒只剩 ' +
            fmt(floor, 2) +
            '% 的概率。左图两侧的柱子会慢慢重新长起来 —— 这就是把简单片段忘掉的过程。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ $\\lambda$ = ' +
            fmt(state.lambda, 2) +
            '：两段高动态拿到 ' +
            fmt(hardBudget, 1) +
            '% 的起始预算（均匀只有 ' +
            fmt((4 / BINS) * 100, 1) +
            '%），同时每一秒都保留了 ' +
            fmt(floor, 2) +
            '% 的底噪。跑 ' +
            state.rounds +
            ' 轮后平均失败率 ' +
            fmt(avg * 100, 1) +
            '%。',
          'learning'
        );
      }

      // ── 左：分箱失败率 + 采样概率 ──
      var g = begin(binStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 42, r: 14, t: 22, b: 34 }, [0, BINS], [0, 1.05]);
      axes(g, p, {
        xTicks: [0, 10, 20, 30],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '参考轨迹的第几秒'
      });
      text(g.ctx, '每一秒的失败率与采样概率', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var slot = (p.x1 - p.x0) / BINS;
      var maxP = Math.max.apply(null, res.probs);
      res.fail.forEach(function (f, i) {
        var cx = p.x0 + slot * (i + 0.5);
        g.ctx.fillStyle = P.bad;
        g.ctx.fillRect(cx - slot * 0.38, p.sy(f), slot * 0.76, p.y0 - p.sy(f));
      });
      line(
        g.ctx,
        res.probs.map(function (v, i2) {
          return [p.x0 + slot * (i2 + 0.5), p.sy(v / Math.max(maxP, 1e-6))];
        }),
        P.accent,
        2.2
      );
      line(g.ctx, [[p.x0, p.sy(state.lambda / Math.max(maxP * BINS, 1e-6))], [p.x1, p.sy(state.lambda / Math.max(maxP * BINS, 1e-6))]], P.muted, 1.2, [4, 4]);
      text(g.ctx, '侧手翻', p.x0 + slot * 11.5, p.y1 + 10, P.muted, 'center', '10px sans-serif');
      text(g.ctx, '跳转', p.x0 + slot * 22, p.y1 + 10, P.muted, 'center', '10px sans-serif');

      // ── 右：平均失败率随轮次下降 ──
      var g2 = begin(curveStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [0, 30], [0, 0.55]);
      axes(g2, p2, {
        xTicks: [0, 10, 20, 30],
        yTicks: [0, 0.15, 0.3, 0.45],
        yFmt: function (t) {
          return fmt(t * 100, 0) + '%';
        },
        xLabel: '训练轮数'
      });
      text(g2.ctx, '平均失败率', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      [false, true].forEach(function (uni) {
        var h = trainSampling(diff, state.lambda, state.gamma, 30, uni).history;
        var pts = h.map(function (f, i3) {
          var m =
            f.reduce(function (a, b) {
              return a + b;
            }, 0) / BINS;
          return [p2.sx(i3), p2.sy(clamp(m, 0, 0.55))];
        });
        var active = uni === state.uniform;
        line(g2.ctx, pts, uni ? P2.warn : P2.good, active ? 2.6 : 1.4, active ? [] : [4, 4]);
      });
      line(g2.ctx, [[p2.sx(state.rounds), p2.y0], [p2.sx(state.rounds), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(state.rounds), p2.sy(clamp(avg, 0, 0.55)), 4.5, state.uniform ? P2.warn : P2.good, P2.surface2);
      text(g2.ctx, '自适应采样', p2.x0 + 8, p2.sy(0.52), P2.good, 'left', '11px sans-serif');
      text(g2.ctx, '均匀采样', p2.x0 + 8, p2.sy(0.475), P2.warn, 'left', '11px sans-serif');

      binStage.canvas.setAttribute('aria-label', '长参考各秒的失败率与采样概率分布');
      curveStage.canvas.setAttribute('aria-label', '自适应采样与均匀采样下平均失败率的下降曲线');
    });

    render();
  }

  // ─── demo 3: Classifier Guidance ─────────────────────────────────────────
  var HZ = 16; // 预测视野（论文 H = 16）
  var NC = 4; // 轨迹用 4 个 RBF 控制点表示，保证时间上是光滑的
  var GOAL_X = 6.2;

  function xOf(i) {
    return (GOAL_X * i) / (HZ - 1);
  }

  /* 平滑基：y_i = Σ_k B_k(u_i)·c_k。真实的扩散先验天生带时间相关性，
     这里用一组归一化 RBF 起同样的作用 —— 否则逐帧独立加噪会画出锯齿。 */
  var BASIS = (function () {
    var B = [];
    for (var i = 0; i < HZ; i++) {
      var u = i / (HZ - 1),
        row = [],
        s = 0;
      for (var k = 0; k < NC; k++) {
        var uk = k / (NC - 1);
        var w = Math.exp(-Math.pow((u - uk) / 0.32, 2));
        row.push(w);
        s += w;
      }
      B.push(
        row.map(function (w2) {
          return w2 / s;
        })
      );
    }
    return B;
  })();

  function toPath(c) {
    var y = [];
    for (var i = 0; i < HZ; i++) {
      var acc = 0;
      for (var k = 0; k < NC; k++) acc += BASIS[i][k] * c[k];
      y.push(acc);
    }
    return y;
  }

  /* 无引导时扩散模型输出的「自然直行」控制点 */
  function priorCoef() {
    return [0.05, -0.12, 0.1, -0.04];
  }

  /* 松弛 barrier，和论文里那条分段函数一致 */
  function barrier(x, delta) {
    if (x >= delta) return -Math.log(Math.max(x, 1e-6));
    var u = (x - 2 * delta) / delta;
    return -Math.log(delta) + 0.5 * (u * u - 1);
  }

  function barrierGrad(x, delta) {
    if (x >= delta) return -1 / Math.max(x, 1e-6);
    return (x - 2 * delta) / (delta * delta);
  }

  /* G = 避障 barrier + 路点代价；梯度先对 y 求，再按基函数链式回到控制点。 */
  function costAndGrad(c, opts) {
    var y = toPath(c);
    var gy = new Array(HZ);
    for (var i = 0; i < HZ; i++) gy[i] = 0;
    var cost = 0;
    for (var t = 0; t < HZ; t++) {
      if (opts.avoid) {
        var dx = xOf(t) - opts.obs[0],
          dy = y[t] - opts.obs[1];
        var dist = Math.sqrt(dx * dx + dy * dy);
        var sdf = dist - opts.obsR;
        // 正好压在障碍中心时方向退化，挑一个朝路点的逃逸方向
        var dir = dist > 1e-2 ? dy / dist : (opts.goalY >= opts.obs[1] ? 1 : -1);
        // 减掉 barrier(2 m) 的常数，让「离得足够远」正好是 0 代价（常数不改变梯度）
        var b = barrier(sdf, 0.25) - barrier(2, 0.25);
        if (b > 0) {
          cost += opts.wAvoid * b;
          gy[t] += opts.wAvoid * barrierGrad(sdf, 0.25) * dir;
        }
      }
      if (opts.waypoint) {
        var w = t >= HZ - 3 ? 1 : 0.05;
        var e = y[t] - opts.goalY;
        cost += opts.wGoal * w * e * e;
        gy[t] += opts.wGoal * w * 2 * e;
      }
    }
    var gc = new Array(NC);
    for (var k = 0; k < NC; k++) {
      var acc2 = 0;
      for (var j = 0; j < HZ; j++) acc2 += BASIS[j][k] * gy[j];
      gc[k] = acc2;
    }
    return { cost: cost, grad: gc, y: y };
  }

  /* 带引导的去噪：先验是「自然直行」附近的高斯，每一步在 x̂₀ 上施加 −∇G。 */
  function guidedSample(opts) {
    var mu = priorCoef();
    var rng = mulberry32(opts.seed);
    var x = [];
    for (var i = 0; i < NC; i++) x.push(gauss(rng));
    var steps = opts.steps;
    for (var k = steps; k > 0; k--) {
      var ab = Math.pow(Math.cos(((k / steps + 0.008) / 1.008) * (Math.PI / 2)), 2);
      var abPrev = Math.pow(Math.cos((((k - 1) / steps + 0.008) / 1.008) * (Math.PI / 2)), 2);
      var sa = Math.sqrt(Math.max(ab, 1e-6)),
        v = ab * opts.dataStd * opts.dataStd + (1 - ab);
      var x0 = new Array(NC);
      for (var j = 0; j < NC; j++) {
        x0[j] = (sa * opts.dataStd * opts.dataStd * x[j] + (1 - ab) * mu[j]) / v;
      }
      // classifier guidance：∇log p(τ*|τ) = −∇G
      var cg = costAndGrad(x0, opts);
      for (var j2 = 0; j2 < NC; j2++) x0[j2] = clamp(x0[j2] - opts.scale * cg.grad[j2], -4, 4);
      var next = new Array(NC);
      for (var j3 = 0; j3 < NC; j3++) {
        var eps = (x[j3] - sa * x0[j3]) / Math.sqrt(Math.max(1 - ab, 1e-6));
        next[j3] = Math.sqrt(Math.max(abPrev, 1e-6)) * x0[j3] + Math.sqrt(Math.max(1 - abPrev, 1e-6)) * eps;
      }
      x = next;
    }
    return x;
  }

  function buildGuidanceDemo(host) {
    var root = card(host, {
      title: 'Classifier Guidance：任务代价直接加进去，不用重训',
      sub:
        '$\\nabla \\log p(\\tau \\mid \\tau^*) = \\nabla \\log p(\\tau) + \\nabla \\log p(\\tau^* \\mid \\tau)$。前一项是扩散模型学到的「人类会怎么动」，' +
        '后一项就是 $-\\nabla G$。避障和路点是两个独立的 $G$，相加即可 —— 训练时根本不需要枚举组合。'
    });

    var state = { scale: 0.09, avoid: true, waypoint: true, obsY: -0.15, obsR: 0.65, goalY: 1.1, seed: 12, steps: 20 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '引导强度',
      min: 0,
      max: 0.5,
      step: 0.005,
      value: state.scale,
      format: function (v) {
        return fmt(v, 3);
      },
      onInput: function (v) {
        state.scale = v;
        render();
      }
    });
    slider(ctrls, {
      label: '障碍位置（横向）',
      min: -1.5,
      max: 1.5,
      step: 0.05,
      value: state.obsY,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.obsY = v;
        render();
      }
    });
    slider(ctrls, {
      label: '路点的横向目标',
      min: -2,
      max: 2,
      step: 0.05,
      value: state.goalY,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.goalY = v;
        render();
      }
    });
    var togBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(togBox);
    checkbox(togBox, '避障代价 $G_{\\text{avoid}}$', state.avoid, function (on) {
      state.avoid = on;
      render();
    });
    checkbox(togBox, '路点代价 $G_{\\text{waypoint}}$', state.waypoint, function (on) {
      state.waypoint = on;
      render();
    });

    var setLegend = legend(root, [
      { key: 'muted', text: '无引导：扩散模型自己想走的路' },
      { key: 'accent', text: '加了引导之后的轨迹' },
      { key: 'warn', text: '障碍（SDF barrier）' },
      { key: 'good', text: '路点目标' }
    ]);

    var grid = stageGrid(root);
    var pathStage = stage(grid, 250);
    var costStage = stage(grid, 250);

    var stats = statsRow(root);
    var sClear = stats.add('离障碍最近距离');
    var sGoal = stats.add('终点离路点');
    var sDev = stats.add('离先验偏了多远');
    var sOod = stats.add('还在分布内吗');
    var verdict = verdictBox(root);

    note(root, [
      '**相加就能组合，这是 guidance 最大的实用价值**：两个勾选框各自对应一个 G。' +
        '同时勾上，梯度直接叠加 —— 训练时完全不需要见过「一边避障一边走到路点」这种组合。' +
        '换成条件式训练（把任务当成条件输入），每加一种组合都要重新收集数据。',
      '**引导强度是有上限的**：把它拖到最大，轨迹会被拽出一个夸张的大弧 —— 代价是满足了，但这个幅度已经不是扩散模型见过的动作了。' +
        '论文里提到在 Joint-Rot 表示上加 guidance 会「迅速 OOD 失稳」，说的就是这件事。',
      '**这也是 motion inpainting 的同一套机制**：把「某些帧必须等于关键帧」写成一个 G，' +
        '扩散就会把中间那段补出来 —— 论文里每 0.2 s 注入一帧侧手翻关键帧，靠的就是这个。',
      '**这是简化模型**：真实的 $\\tau$ 是 16 步状态-动作序列，梯度用 CppAD 自动求导，先验是一个 19.95M 的 Transformer。' +
        '这里的先验是「自然直行 + 高斯」，反向过程本身是真的带引导 DDIM。'
    ]);

    var render = registerRenderer(function () {
      var opts = {
        scale: state.scale,
        avoid: state.avoid,
        waypoint: state.waypoint,
        obs: [GOAL_X * 0.45, state.obsY],
        obsR: state.obsR,
        goalY: state.goalY,
        wAvoid: 1,
        wGoal: 1,
        seed: state.seed,
        steps: state.steps,
        dataStd: 0.22
      };
      var coef = guidedSample(opts);
      var y = toPath(coef);
      var mu = toPath(priorCoef());

      var minClear = Infinity,
        dev = 0;
      for (var i = 0; i < HZ; i++) {
        var dx = xOf(i) - opts.obs[0],
          dy = y[i] - opts.obs[1];
        minClear = Math.min(minClear, Math.sqrt(dx * dx + dy * dy) - state.obsR);
        dev += Math.abs(y[i] - mu[i]);
      }
      dev /= HZ;
      var goalErr = Math.abs(y[HZ - 1] - state.goalY);

      sClear.set(fmt(minClear, 2) + ' m', minClear > 0.05 ? 'good' : 'bad');
      sGoal.set(fmt(goalErr, 2) + ' m', goalErr < 0.25 ? 'good' : 'warn');
      sDev.set(fmt(dev, 2), dev < 1.6 ? 'good' : 'warn');
      sOod.set(dev < 2.4 ? '在' : '已经飘出去了', dev < 2.4 ? 'good' : 'bad');

      if (state.scale < 0.005) {
        verdict.set(
          '😐 引导强度 0：这就是纯 $p(\\tau)$，扩散模型只会输出它见过的「自然直行」。' +
            '任务信息一点都没进来 —— 障碍和路点它根本不知道。',
          'frozen'
        );
      } else if (minClear < 0 && state.avoid) {
        verdict.set(
          '💥 引导还不够：轨迹已经进了障碍 ' +
            fmt(-minClear, 2) +
            ' m。barrier 在 SDF 趋近 0 时才会爆炸式增长，强度太小拉不动它 —— 把引导强度往上拖。',
          'frozen'
        );
      } else if (dev > 2.4) {
        verdict.set(
          '⚠️ 引导过强：轨迹离先验偏了 ' +
            fmt(dev, 2) +
            '，代价确实满足了，但这条路已经不像扩散模型学过的任何一段动作。' +
            '真机上这时候就会 OOD —— guidance 只能在分布附近「推一把」，不能凭空造动作。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ 障碍留出 ' +
            fmt(minClear, 2) +
            ' m，终点离路点 ' +
            fmt(goalErr, 2) +
            ' m，同时离先验只偏了 ' +
            fmt(dev, 2) +
            '。两个代价是**相加**进去的 —— 训练的时候没人见过这个组合。',
          'learning'
        );
      }

      // ── 左：俯视路径 ──
      var g = begin(pathStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 40, r: 14, t: 22, b: 34 }, [-0.4, GOAL_X + 0.4], [-2.6, 2.6]);
      axes(g, p, { xTicks: [0, 2, 4, 6], yTicks: [-2, 0, 2], xLabel: '前进方向（m）' });
      text(g.ctx, '扩散预测的未来轨迹', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      if (state.avoid) {
        g.ctx.save();
        g.ctx.fillStyle = P.warn;
        g.ctx.globalAlpha = 0.28;
        g.ctx.beginPath();
        g.ctx.arc(p.sx(opts.obs[0]), p.sy(opts.obs[1]), Math.abs(p.sx(state.obsR) - p.sx(0)), 0, Math.PI * 2);
        g.ctx.fill();
        g.ctx.restore();
      }
      line(
        g.ctx,
        mu.map(function (v, i2) {
          return [p.sx(xOf(i2)), p.sy(v)];
        }),
        P.muted,
        1.8,
        [5, 4]
      );
      line(
        g.ctx,
        y.map(function (v, i3) {
          return [p.sx(xOf(i3)), p.sy(clamp(v, -2.6, 2.6))];
        }),
        minClear < 0 && state.avoid ? P.bad : P.accent,
        2.6
      );
      y.forEach(function (v, i4) {
        dot(g.ctx, p.sx(xOf(i4)), p.sy(clamp(v, -2.6, 2.6)), 2.6, minClear < 0 && state.avoid ? P.bad : P.accent);
      });
      if (state.waypoint) {
        dot(g.ctx, p.sx(GOAL_X), p.sy(clamp(state.goalY, -2.6, 2.6)), 6, P.good, P.surface2);
        text(g.ctx, '路点', p.sx(GOAL_X) - 8, p.sy(clamp(state.goalY, -2.6, 2.6)) - 12, P.good, 'right', '10px sans-serif');
      }

      // ── 右：两项代价各贡献多少 ──
      var g2 = begin(costStage);
      var P2 = g2.P;
      var parts = [];
      var avoidCost = costAndGrad(coef, { avoid: state.avoid, waypoint: false, obs: opts.obs, obsR: state.obsR, goalY: state.goalY, wAvoid: 1, wGoal: 1 }).cost;
      var wpCost = costAndGrad(coef, { avoid: false, waypoint: state.waypoint, obs: opts.obs, obsR: state.obsR, goalY: state.goalY, wAvoid: 1, wGoal: 1 }).cost;
      parts.push({ label: 'G_avoid', v: state.avoid ? avoidCost : 0, color: P2.warn });
      parts.push({ label: 'G_waypoint', v: state.waypoint ? wpCost : 0, color: P2.good });
      parts.push({ label: '两项相加', v: (state.avoid ? avoidCost : 0) + (state.waypoint ? wpCost : 0), color: P2.accent });
      var maxV = Math.max(
        1,
        Math.max.apply(
          null,
          parts.map(function (q) {
            return Math.abs(q.v);
          })
        )
      );
      var p2 = plot(g2, { l: 48, r: 14, t: 24, b: 36 }, [0, parts.length], [Math.min(0, -maxV * 0.4), maxV * 1.2]);
      axes(g2, p2, {
        yTicks: K.niceTicks(Math.min(0, -maxV * 0.4), maxV * 1.2, 4),
        yFmt: function (t) {
          return fmt(t, 1);
        }
      });
      text(g2.ctx, '当前轨迹上各项代价（越低越好）', p2.x0, p2.y1 - 9, P2.muted, 'left', '11px sans-serif');
      line(g2.ctx, [[p2.x0, p2.sy(0)], [p2.x1, p2.sy(0)]], P2.grid, 1);
      var slot2 = (p2.x1 - p2.x0) / parts.length;
      parts.forEach(function (q, i5) {
        var cx = p2.x0 + slot2 * (i5 + 0.5);
        var bw = Math.min(58, slot2 * 0.5);
        var y0 = p2.sy(0),
          y1 = p2.sy(clamp(q.v, p2.yd[0], p2.yd[1]));
        g2.ctx.fillStyle = q.color;
        g2.ctx.fillRect(cx - bw / 2, Math.min(y0, y1), bw, Math.abs(y1 - y0));
        barLabel(g2, p2, cx, Math.min(y0, y1), fmt(q.v, 1), q.color);
        text(g2.ctx, q.label, cx, p2.y0 + 14, P2.muted, 'center', '11px sans-serif');
      });

      pathStage.canvas.setAttribute('aria-label', '带引导的扩散轨迹与障碍、路点的关系');
      costStage.canvas.setAttribute('aria-label', '避障与路点两项代价及其相加结果');
    });

    render();
  }

  // ─── demo 4: 八幕讲解动画 ────────────────────────────────────────────
  /* 全流程速览：两个缺口 → 锚定跟踪 → 紧凑 MDP → 自适应采样 → VAE 潜空间 →
     状态-潜动作联合扩散 → Classifier Guidance → 真机与闭环。
     画面上的换算（0.64 s 的视野、PD 的时间常数、参数量、偏好差值）都从下面
     这组常量现算，不许手写结果。播放器是共享的 K.explainer；这里只放分镜。 */

  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    paint = K.paint,
    seg = K.seg,
    ease = K.ease,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
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

  /* 阶段 1 的 MDP：Raibert 启发式的阻抗，加上「4 项跟踪 + 3 项正则」。 */
  var OMEGA_HZ = 10,
    ZETA = 2;
  var PD_RATIO_S = (2 * ZETA) / (2 * Math.PI * OMEGA_HZ); // k_d / k_p ≈ 0.064 s
  var ACT_SCALE = 0.25;
  var N_TRACK = 4,
    N_REG = 3;
  var N_TERMS = N_TRACK + N_REG; // 7
  var N_DR = 3;

  /* 自适应采样：一条分钟级参考按 1 秒分箱。上文的 bm-sampling 演示用的是
     30 秒的玩具参考（BINS = 30），这里换算论文真正面对的 3 分钟长参考。 */
  var REF_MIN = 3,
    BIN_S = 1;
  var REF_BINS = (REF_MIN * 60) / BIN_S; // 180
  var UNIFORM_PCT = 100 / REF_BINS; // 0.56%

  /* 阶段 2：VAE 潜空间 + 状态-潜动作联合扩散（论文 Table S6 / S7）。 */
  var LATENT_DIM = 32;
  var VAE_BETA = 0.01;
  var HIST_N = 4;
  var CTRL_HZ = 25; // 阶段 2 把跟踪策略降到 25 Hz，给扩散推理留时间
  var HORIZON_S = HZ / CTRL_HZ; // 16 / 25 = 0.64 s
  var DENOISE_K = 20;
  var INFER_MS = 20;
  var CTRL_MS = 1000 / CTRL_HZ; // 40 ms
  var INFER_LOAD = INFER_MS / CTRL_MS; // 0.5
  var TF_LAYERS = 6,
    TF_HEADS = 8,
    TF_DIM = 512;
  /* 每层 self-attention 的 4 个投影 + FFN 的两层（4× 扩张）共 12 d²，
     只含隐层之间的权重，论文那个 ≈19.8M 还含嵌入与 LayerNorm。 */
  var TF_PARAM_M = (TF_LAYERS * 12 * TF_DIM * TF_DIM) / 1e6; // 18.87 M

  /* 状态表示消融（论文 Body-Pos vs Joint-Rot）。 */
  var BP_PERTURB = 100,
    BP_JOY = 80,
    JR_PERTURB = 72,
    JR_JOY = 0;
  var JOY_GAP = BP_JOY - JR_JOY; // 80 个百分点

  /* 真机验收。 */
  var DATA_H = 2.5,
    N_SHORT = 7,
    N_LONG = 29,
    N_REAL = 30,
    REAL_MIN = 15;
  var STUDY_N = 77;
  var PREF_ALL = 70.8,
    PREF_WALK = 57.0,
    PREF_RUN = 84.7;
  var GAP_ALL = PREF_ALL - (100 - PREF_ALL); // 41.6
  var GAP_WALK = PREF_WALK - (100 - PREF_WALK); // 14.0
  var GAP_RUN = PREF_RUN - (100 - PREF_RUN); // 69.4
  var PEAK_RAD = 20,
    MEAN_RAD = 7.01,
    HUMAN_RAD = 7.75,
    PEAK_ACC = 31;
  var ERR_WALK = 12.14,
    ERR_RUN = 13.65;
  var RUN_M = 50;
  var KEYFRAME_S = 0.2;

  // ─── 第 1 幕：两个缺口 ──────────────────────────────────────────────
  function buildSceneGaps() {
    var s = sceneSvg(
      '现有工作卡在两个缺口：既没有可扩展的高质量真机跟踪，跟完之后也不知道怎么把技能用到新任务上'
    );
    s.appendChild(svgText(56, 26, '人形从人类演示里学敏捷性，卡在两个地方', 'demo-x-ink2', 13.5));

    var cols = [
      {
        t: '缺口一：可扩展的高质量运动跟踪',
        c: C_WARN,
        x: 36,
        rows: [
          ['单动作专用　ASAP / KungfuBot / HuB', 'sim-to-real 好，但每条动作单独调 DR 与奖励'],
          ['多动作统一　OmniH2O / GMT / TWIST', '可扩展，但动态动作质量差或牺牲全局轨迹'],
          ['动画侧标杆　PHC', '仿真里很强，真机高动态多动作尚未被证明']
        ]
      },
      {
        t: '缺口二：跟踪之后怎么「会用」',
        c: C_BAD,
        x: 408,
        rows: [
          ['分层：跟踪器 + 规划器', '规划-控制鸿沟，敏捷性被牺牲'],
          ['VAE / 条件生成　CALM / PULSE', '训练时要显式目标条件，隐式目标泛化差'],
          ['纯动作扩散　Diffusion Policy / HugWBC', '任务在状态空间、动作在 PD 空间，难做引导']
        ]
      }
    ].map(function (col, k) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: col.x, y: 42, width: 356, height: 28, rx: 6, 'stroke-width': 1.4 }), C_SURFACE2, col.c));
      g.appendChild(paint(svgText(col.x + 178, 61, col.t, null, 12.5, 'middle'), col.c));
      col.rows.forEach(function (row, i) {
        var y = 80 + i * 62;
        g.appendChild(paint(svgEl('rect', { x: col.x, y: y, width: 356, height: 54, rx: 7, 'stroke-width': 1.2 }), C_SURFACE, C_BORDER));
        g.appendChild(paint(svgText(col.x + 14, y + 22, row[0], null, 11), C_MUTED));
        g.appendChild(svgText(col.x + 14, y + 41, row[1], 'demo-x-mut', 9.5));
      });
      s.appendChild(g);
      return { g: g, at: 0.6 + k * 2.6 };
    });

    var claims = svgEl('g', {});
    claims.appendChild(paint(svgEl('rect', { x: 36, y: 276, width: 356, height: 74, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_GOOD));
    claims.appendChild(paint(svgText(54, 300, 'BeyondMimic 对缺口一的主张', null, 11.5), C_GOOD));
    claims.appendChild(svgText(54, 320, '紧凑、有原则的 MDP + 适度 DR，', 'demo-x-mut', 10));
    claims.appendChild(svgText(54, 338, '同一套超参覆盖侧手翻 / 空翻 / 冲刺', 'demo-x-mut', 10));
    claims.appendChild(paint(svgEl('rect', { x: 408, y: 276, width: 356, height: 74, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_ACCENT));
    claims.appendChild(paint(svgText(426, 300, 'BeyondMimic 对缺口二的主张', null, 11.5), C_ACCENT));
    claims.appendChild(svgText(426, 320, '扩散「状态 + 动作」联合轨迹，', 'demo-x-mut', 10));
    claims.appendChild(svgText(426, 338, '推理时把任务代价直接加在未来状态上', 'demo-x-mut', 10));
    s.appendChild(claims);

    var foot = paint(svgText(400, 390, '一条主线：先把跟踪做到可扩展，再把跟踪出来的技能变成可引导的生成模型', null, 13.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      cols.forEach(function (col) {
        setOpacity(col.g, seg(t, col.at, col.at + 0.5));
      });
      setOpacity(claims, seg(t, 7.6, 8.6));
      setOpacity(foot, seg(t, 10.6, 11.6));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 2 幕：锚定跟踪 ──────────────────────────────────────────────
  function buildSceneAnchor() {
    var s = sceneSvg(
      '锚定跟踪把参考整体挪到机器人当前的 xy 上、只对齐 yaw，水平漂移被吸收，高度与朝向仍然算误差'
    );
    s.appendChild(svgText(56, 26, '真机一定会漂。把漂移写进奖励，策略就只会用力往回拽', 'demo-x-ink2', 13.5));

    var anchorMath = svgMath(400, 58, '\\hat{T}_b = T_{\\text{anchor}}\\, T_{b_{\\text{ref}}}^{-1}\\, T_{b,\\text{motion}}', {
      size: 14,
      w: 560,
      anchor: 'middle'
    });
    anchorMath.setTone('var(--demo-accent)');
    s.appendChild(anchorMath);

    /* 左边一张俯视图：参考（虚线）、机器人（实线，整体下移）、锚定后的参考。 */
    var refPts = [],
      robPts = [],
      ancPts = [];
    for (var i = 0; i <= 40; i++) {
      var u = i / 40;
      var x = 48 + 344 * u;
      var y = 150 - 26 * Math.sin(u * 5.6);
      refPts.push([x, y]);
      /* 机器人整体下移（漂移）之外再留一点跟踪残差，锚定后的参考才不会被实线盖住 */
      robPts.push([x + 6 * u, y + 66 + 5 * Math.sin(u * 13)]);
      ancPts.push([x, y + 66]);
    }

    var map = svgEl('g', {});
    map.appendChild(paint(svgEl('rect', { x: 36, y: 84, width: 368, height: 158, rx: 8, 'stroke-width': 1.2 }), C_SURFACE, C_BORDER));
    map.appendChild(svgText(48, 102, '俯视：漂了之后，参考该放在哪', 'demo-x-mut', 10));
    map.appendChild(
      paint(svgEl('path', { d: polyPath(refPts), fill: 'none', 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }), null, C_MUTED)
    );
    map.appendChild(paint(svgText(300, 118, '世界系参考', null, 9.5), C_MUTED));
    s.appendChild(map);

    var anc = svgEl('g', {});
    anc.appendChild(
      paint(svgEl('path', { d: polyPath(ancPts), fill: 'none', 'stroke-width': 1.8, 'stroke-dasharray': '2 3' }), null, C_GOOD)
    );
    anc.appendChild(paint(svgText(300, 232, '锚定后的参考', null, 9.5), C_GOOD));
    s.appendChild(anc);

    var rob = paint(svgEl('path', { d: polyPath(robPts), fill: 'none', 'stroke-width': 2.4 }), null, C_ACCENT);
    s.appendChild(rob);
    var tok = paint(svgEl('circle', { r: 5.5, 'stroke-width': 1.4 }), C_ACCENT, C_SURFACE2);
    s.appendChild(tok);

    /* 未锚定时策略看到的误差：从世界系参考一路连到机器人。 */
    var errLine = paint(
      svgEl('path', { d: polyPath([refPts[20], robPts[20]]), fill: 'none', 'stroke-width': 2.2, 'stroke-dasharray': '4 3' }),
      null,
      C_BAD
    );
    s.appendChild(errLine);
    var errLabel = paint(svgText(226, 190, '刚性跟踪：整段漂移都算误差', null, 9.5, 'middle'), C_BAD);
    s.appendChild(errLabel);

    var cards = [
      { t: '放开：水平 xy', d: '$p_{\\text{anchor}}$ 取机器人当前的 $x, y$', c: C_GOOD },
      { t: '保留：高度 z', d: '$z$ 取参考的高度 —— 蹲、跳照样跟', c: C_WARN },
      { t: '保留：yaw', d: '$R_{\\text{anchor}}$ 只对齐 yaw，走歪仍算误差', c: C_ACCENT }
    ].map(function (p, k) {
      var g = svgEl('g', {});
      var y = 84 + k * 54;
      g.appendChild(paint(svgEl('rect', { x: 420, y: y, width: 344, height: 46, rx: 7, 'stroke-width': 1.3 }), C_SURFACE2, p.c));
      g.appendChild(paint(svgText(436, y + 20, p.t, null, 11.5), p.c));
      g.appendChild(svgRich(436, y + 37, p.d, { size: 9.5, cls: 'demo-x-mut' }));
      s.appendChild(g);
      return { g: g, at: 2.6 + k * 1.3 };
    });

    var pos = svgMath(400, 276, 'p_{\\text{anchor}} = [\\,p_{b_{\\text{ref}},x},\\ p_{b_{\\text{ref}},y},\\ p_{b_{\\text{ref}},z,\\text{motion}}\\,]', {
      size: 13,
      w: 620,
      anchor: 'middle'
    });
    pos.setTone('var(--demo-good)');
    s.appendChild(pos);

    var why = svgEl('g', {});
    why.appendChild(paint(svgEl('rect', { x: 36, y: 300, width: 728, height: 52, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, C_BORDER));
    why.appendChild(
      svgMath(400, 322, '\\text{只跟踪子集 } \\mathcal{B}_{\\text{target}} \\text{ 上的刚体，各体 twist 不变 —— 保留的是相对协调与风格}', {
        size: 11.5,
        anchor: 'middle',
        w: 620
      }).setTone('var(--demo-muted)')
    );
    why.appendChild(svgText(400, 342, '开源实现落点：commands.py 的 _update_command() 每步更新 body_pos_relative_w / body_quat_relative_w', 'demo-x-mono', 9, 'middle'));
    s.appendChild(why);

    var foot = paint(svgText(400, 392, '允许水平漂移，锚体位姿误差仍然提供平衡与漂移修正信号', null, 13.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(anchorMath, seg(t, 0.3, 1.0));
      setOpacity(map, seg(t, 0.4, 1.2));
      var on = seg(t, 1.2, 1.8);
      setOpacity(rob, on);
      setOpacity(tok, on);
      var pt = pointOn(robPts, ease(seg(t, 1.3, 4.4)));
      tok.setAttribute('cx', pt[0].toFixed(1));
      tok.setAttribute('cy', pt[1].toFixed(1));
      var bad = seg(t, 1.9, 2.4) * (1 - seg(t, 6.6, 7.4));
      setOpacity(errLine, bad);
      setOpacity(errLabel, bad);
      setOpacity(anc, seg(t, 6.8, 7.6));
      cards.forEach(function (c) {
        setOpacity(c.g, seg(t, c.at, c.at + 0.45));
      });
      setOpacity(pos, seg(t, 7.8, 8.6));
      setOpacity(why, seg(t, 9.4, 10.2));
      setOpacity(foot, seg(t, 11.2, 12.0));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 3 幕：一套 MDP、一套超参 ───────────────────────────────────
  function buildSceneMdp() {
    var s = sceneSvg(
      '低阻抗 PD + ' +
        N_TRACK +
        ' 项跟踪奖励 + ' +
        N_REG +
        ' 项正则 + ' +
        N_DR +
        ' 类域随机化：同一套超参训练所有动作，不做动作专属调参'
    );
    s.appendChild(svgText(56, 26, '没有力矩扰动、没有滑移惩罚 —— 能砍的启发式都砍了', 'demo-x-ink2', 13.5));

    var pdMath = svgMath(400, 56, 'k_{p,j} = I_j\\omega_n^2,\\qquad k_{d,j} = 2 I_j \\zeta \\omega_n', {
      size: 14,
      w: 520,
      anchor: 'middle'
    });
    pdMath.setTone('var(--demo-accent)');
    s.appendChild(pdMath);

    var pd = svgEl('g', {});
    pd.appendChild(paint(svgEl('rect', { x: 36, y: 80, width: 356, height: 126, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_ACCENT));
    pd.appendChild(paint(svgText(54, 104, '低阻抗 PD：故意不做运动学跟踪', null, 12.5), C_ACCENT));
    pd.appendChild(svgRich(54, 126, '自然频率 $\\omega_n = ' + OMEGA_HZ + '$ Hz（偏低，促柔顺）', { size: 10, cls: 'demo-x-mut' }));
    pd.appendChild(svgRich(54, 145, '阻尼比 $\\zeta = ' + ZETA + '$（过阻尼，补偿惯量低估）', { size: 10, cls: 'demo-x-mut' }));
    pd.appendChild(
      svgRich(54, 168, '$k_d / k_p = 2\\zeta / \\omega_n \\approx ' + fmt(PD_RATIO_S, 3) + '$ s', { size: 12 }).setTone(C_ACCENT)
    );
    pd.appendChild(svgRich(54, 190, '动作是归一化关节位置，$\\alpha_j = ' + ACT_SCALE + '\\, \\tau_{\\max} / k_p$', { size: 10, cls: 'demo-x-mut' }));
    s.appendChild(pd);

    var rw = svgEl('g', {});
    rw.appendChild(paint(svgEl('rect', { x: 408, y: 80, width: 356, height: 126, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_GOOD));
    rw.appendChild(paint(svgText(426, 104, '奖励：' + N_TRACK + ' 项跟踪 + ' + N_REG + ' 项正则 = ' + N_TERMS + ' 项', null, 12.5), C_GOOD));
    rw.appendChild(svgText(426, 126, '各体误差先取均方，再走高斯型指数奖励', 'demo-x-mut', 10));
    rw.appendChild(svgText(426, 145, '只留三个对 sim-to-real 关键的惩罚', 'demo-x-mut', 10));
    rw.appendChild(svgText(426, 168, '对比 DeepMimic / PHC：没有力矩扰动、', 'demo-x-mut', 10));
    rw.appendChild(svgText(426, 187, '没有接触力大惩罚、没有滑移惩罚', 'demo-x-mut', 10));
    s.appendChild(rw);

    var rwMath = svgMath(400, 228, 'r(\\bar{e}_\\chi, \\sigma_\\chi) = \\exp\\!\\left(-\\frac{\\bar{e}_\\chi}{\\sigma_\\chi^2}\\right),\\quad \\chi \\in \\{p, R, v, w\\}', {
      size: 13,
      w: 620,
      anchor: 'middle'
    });
    rwMath.setTone('var(--demo-good)');
    s.appendChild(rwMath);

    var chips = svgEl('g', {});
    [
      { t: 'p 位置', c: C_GOOD },
      { t: 'R 旋转', c: C_GOOD },
      { t: 'v 线速度', c: C_GOOD },
      { t: 'w 角速度', c: C_GOOD },
      { t: '软关节限位', c: C_WARN },
      { t: '动作变化率', c: C_WARN },
      { t: '末端自碰撞', c: C_WARN }
    ].forEach(function (p, k) {
      var x = 36 + k * 105;
      chips.appendChild(paint(svgEl('rect', { x: x, y: 252, width: 96, height: 32, rx: 6, 'stroke-width': 1.2 }), C_SURFACE, p.c));
      chips.appendChild(paint(svgText(x + 48, 272, p.t, null, 10.5, 'middle'), p.c));
    });
    chips.appendChild(svgText(36, 300, '前 ' + N_TRACK + ' 项是任务，后 ' + N_REG + ' 项是正则 —— 一共只有 ' + N_TERMS + ' 项', 'demo-x-mut', 10));
    s.appendChild(chips);

    var dr = svgEl('g', {});
    dr.appendChild(paint(svgEl('rect', { x: 36, y: 314, width: 728, height: 48, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, C_WARN));
    dr.appendChild(paint(svgText(400, 334, '域随机化只有 ' + N_DR + ' 类：地面摩擦、关节零位（标定误差）、躯干质心（模型误差）', null, 12, 'middle'), C_WARN));
    dr.appendChild(svgText(400, 352, '都是「真正不确定的物理量」；ASAP / KungfuBot 那种大范围力矩与延迟随机化没有出现', 'demo-x-mut', 9.5, 'middle'));
    s.appendChild(dr);

    var foot = paint(svgText(400, 396, '论文的判断：原则性建模 + 系统实现（延迟、校准）比堆 DR 更重要', null, 13.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(pdMath, seg(t, 0.3, 1.0));
      setOpacity(pd, seg(t, 0.8, 1.6));
      setOpacity(rw, seg(t, 3.4, 4.2));
      setOpacity(rwMath, seg(t, 5.0, 5.8));
      setOpacity(chips, seg(t, 6.4, 7.2));
      setOpacity(dr, seg(t, 9.0, 9.8));
      setOpacity(foot, seg(t, 11.4, 12.2));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 4 幕：自适应起始相位采样 ───────────────────────────────────
  function buildSceneSampling() {
    var s = sceneSvg(
      '分钟级长参考按 ' +
        BIN_S +
        ' 秒分箱，按失败率加权采起始相位，再掺 λ 份均匀分布防止把简单片段忘掉'
    );
    s.appendChild(svgText(56, 26, '一条 ' + REF_MIN + ' 分钟参考切成 ' + REF_BINS + ' 个箱，均匀采样每箱只有 ' + fmt(UNIFORM_PCT, 2) + '%', 'demo-x-ink2', 13.5));

    var psMath = svgMath(400, 58, 'p_s = \\frac{\\sum_{\\tau=0}^{K-1} \\gamma^\\tau \\bar{r}_{s+\\tau}}{\\sum_j \\sum_\\tau \\gamma^\\tau \\bar{r}_{j+\\tau}}', {
      size: 14,
      w: 420,
      anchor: 'middle'
    });
    psMath.setTone('var(--demo-accent)');
    s.appendChild(psMath);

    /* 一条示意参考：大部分是走路，中间两段高动态。和上文 bm-sampling 演示同一形状。 */
    var chart = svgEl('g', {});
    chart.appendChild(paint(svgEl('rect', { x: 36, y: 106, width: 728, height: 130, rx: 8, 'stroke-width': 1.2 }), C_SURFACE, C_BORDER));
    /* 画的是 30 秒的示意切片，不是上面那 180 个箱 —— 180 根柱子在 800px 上看不清 */
    chart.appendChild(svgText(48, 124, '示意：取 ' + BINS + ' 秒切片，每一秒的失败率（红柱）与采样概率（蓝线）', 'demo-x-mut', 10));
    var base = 222,
      top = 134,
      slot = 700 / BINS;
    var probPts = [];
    for (var i = 0; i < BINS; i++) {
      var hard = 0.9 * Math.exp(-Math.pow(i - 11, 2) / 4) + 0.75 * Math.exp(-Math.pow(i - 22, 2) / 2.5);
      var f = clamp(0.12 + hard, 0, 1);
      var h = (base - top) * f;
      chart.appendChild(paint(svgEl('rect', { x: 50 + slot * i + 1.5, y: base - h, width: slot - 3, height: h, rx: 1.5 }), C_BAD));
      probPts.push([50 + slot * (i + 0.5), base - (base - top) * clamp(0.18 + 0.82 * f, 0, 1)]);
    }
    chart.appendChild(paint(svgEl('path', { d: polyPath(probPts), fill: 'none', 'stroke-width': 2 }), null, C_ACCENT));
    chart.appendChild(paint(svgText(50 + slot * 11.5, 232, '侧手翻', null, 9.5, 'middle'), C_MUTED));
    chart.appendChild(paint(svgText(50 + slot * 22, 232, '跳转身', null, 9.5, 'middle'), C_MUTED));
    s.appendChild(chart);

    var mixMath = svgMath(400, 262, "p_s' = \\lambda \\frac{1}{S} + (1-\\lambda)\\, p_s", {
      size: 14,
      w: 420,
      anchor: 'middle'
    });
    mixMath.setTone('var(--demo-good)');
    s.appendChild(mixMath);

    var cards = [
      { tex: '\\gamma \\text{：非因果指数核}', d: '失败常在动作中段，问题却在进入姿势', d2: '把权重往前摊，练失败之前那几秒', c: C_WARN },
      { tex: '\\lambda \\text{：掺一点均匀}', dTex: '\\lambda = 0 \\text{ 会让走路段长期采不到}', d2: '论文那句「防止灾难性遗忘」就是它', c: C_GOOD },
      { t: '和 PHC 的 PMCP 不同', d: 'PHC 遇到难例是加一列网络', d2: '这里是单策略单 MDP，只改采样分布', c: C_ACCENT }
    ].map(function (p, k) {
      var g = svgEl('g', {});
      var x = 36 + k * 246;
      g.appendChild(paint(svgEl('rect', { x: x, y: 284, width: 234, height: 78, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, p.c));
      if (p.tex) {
        g.appendChild(svgMath(x + 16, 306, p.tex, { size: 11.5, w: 210 }).setTone(p.c));
      } else {
        g.appendChild(paint(svgText(x + 16, 306, p.t, null, 11.5), p.c));
      }
      if (p.dTex) {
        g.appendChild(svgMath(x + 16, 326, p.dTex, { size: 9.5, w: 210, cls: 'demo-x-mut' }));
      } else {
        g.appendChild(svgText(x + 16, 326, p.d, 'demo-x-mut', 9.5));
      }
      g.appendChild(svgText(x + 16, 344, p.d2, 'demo-x-mut', 9.5));
      s.appendChild(g);
      return { g: g, at: 6.2 + k * 1.3 };
    });

    var foot = paint(svgText(400, 394, '重置时还叠了起始位姿 / 速度 / 关节扰动，抵消长 rollout 的累积误差', null, 13, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(psMath, seg(t, 0.3, 1.0));
      setOpacity(chart, seg(t, 1.0, 1.8));
      setOpacity(mixMath, seg(t, 4.4, 5.2));
      cards.forEach(function (c) {
        setOpacity(c.g, seg(t, c.at, c.at + 0.45));
      });
      setOpacity(foot, seg(t, 10.4, 11.2));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 5 幕：VAE 把跟踪专家压进潜空间 ────────────────────────────
  function buildSceneVae() {
    var s = sceneSvg(
      '扩散之前先有一步：用 DAgger 把一堆跟踪专家蒸馏成一个 ' +
        LATENT_DIM +
        ' 维的平滑潜空间，扩散才有结构化的东西可学'
    );
    s.appendChild(svgText(56, 26, '直接扩散原始 PD 动作并不好学 —— 先换一个表示', 'demo-x-ink2', 13.5));

    var arrow = K.arrowMarker(s, 'bm-x-arrow-vae', C_BORDER);
    var pipe = [
      { tex: '\\text{参考动作分量 } \\bm{\\psi}', d: '+ 锚定误差 $e_{\\text{anchor}}$', c: C_MUTED, w: 168 },
      { t: 'Encoder MLP', d: '[2048, 1024, 512]', c: C_ACCENT, w: 158 },
      { tex: '\\bm{z} \\in \\mathbb{R}^{' + LATENT_DIM + '}', d: '动作意图，不是动作本身', c: C_GOOD, w: 168 },
      { t: 'Decoder MLP', d: '+ 本体感知 → 动作 $\\hat{a}$', c: C_ACCENT, w: 168 }
    ];
    var x = 36;
    var nodes = pipe.map(function (p, k) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: x, y: 54, width: p.w, height: 58, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, p.c));
      if (p.tex) {
        g.appendChild(svgMath(x + p.w / 2, 78, p.tex, { size: 11.5, anchor: 'middle', w: p.w - 12 }).setTone(p.c));
      } else {
        g.appendChild(paint(svgText(x + p.w / 2, 78, p.t, null, 11.5, 'middle'), p.c));
      }
      g.appendChild(svgRich(x + p.w / 2, 97, p.d, { size: 9, cls: 'demo-x-mut', anchor: 'middle', w: 200 }));
      s.appendChild(g);
      if (k < pipe.length - 1) {
        s.appendChild(
          paint(
            svgEl('path', { d: polyPath([[x + p.w + 4, 83], [x + p.w + 18, 83]]), fill: 'none', 'stroke-width': 1.5, 'marker-end': arrow }),
            null,
            C_BORDER
          )
        );
      }
      x += p.w + 22;
      return { g: g, at: 0.5 + k * 0.7 };
    });

    var dag = svgEl('g', {});
    dag.appendChild(
      paint(
        svgEl('path', {
          d: polyPath([[760, 118], [760, 140], [120, 140], [120, 118]]),
          fill: 'none',
          'stroke-width': 1.4,
          'stroke-dasharray': '5 4',
          'marker-end': arrow
        }),
        null,
        C_WARN
      )
    );
    dag.appendChild(paint(svgText(440, 156, 'DAgger：让学生自己走，专家在它到过的状态上打标签 —— 不是离线 BC', null, 11, 'middle'), C_WARN));
    s.appendChild(dag);

    var vaeMath = svgMath(400, 192, '\\mathcal{L}_{\\text{VAE}} = \\mathbb{E}\\big[\\|\\hat{a} - a\\|^2\\big] + \\beta\\, D_{\\mathrm{KL}}\\big(q(z \\mid \\psi, e_{\\text{anchor}})\\,\\|\\,\\mathcal{N}(0, I)\\big)', {
      size: 13.5,
      w: 720,
      anchor: 'middle'
    });
    vaeMath.setTone('var(--demo-accent)');
    s.appendChild(vaeMath);

    var cards = [
      { t: '编码参考，不编码动作', d: '运动状态比原始 PD 动作更结构化', d2: 'encoder 只看参考分量，抓的是「意图」', c: C_GOOD },
      { tex: '\\beta = ' + VAE_BETA, d: 'KL 系数把潜空间压向标准正态', d2: '平滑、连续，扩散才好在上面采样', c: C_ACCENT },
      { t: '还做了对称增强', d: '矢状面镜像的一份数据一起训', d2: '技能库直接翻倍，几乎零成本', c: C_WARN }
    ].map(function (p, k) {
      var g = svgEl('g', {});
      var px = 36 + k * 246;
      g.appendChild(paint(svgEl('rect', { x: px, y: 222, width: 234, height: 84, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, p.c));
      if (p.tex) {
        g.appendChild(svgMath(px + 16, 246, p.tex, { size: 11.5, w: 200 }).setTone(p.c));
      } else {
        g.appendChild(paint(svgText(px + 16, 246, p.t, null, 11.5), p.c));
      }
      g.appendChild(svgText(px + 16, 266, p.d, 'demo-x-mut', 9.5));
      g.appendChild(svgText(px + 16, 284, p.d2, 'demo-x-mut', 9.5));
      s.appendChild(g);
      return { g: g, at: 5.0 + k * 1.2 };
    });

    var out = svgEl('g', {});
    out.appendChild(paint(svgEl('rect', { x: 36, y: 318, width: 728, height: 44, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, C_GOOD));
    out.appendChild(
      paint(
        svgText(400, 345, '部署时 decoder 很轻，直接在 CPU 上同步跑；重的扩散在 GPU 上异步跑', null, 12, 'middle'),
        C_GOOD
      )
    );
    s.appendChild(out);

    var foot = paint(svgText(400, 394, '一堆专家 → 一个 ' + LATENT_DIM + ' 维潜空间：下一幕扩散的「动作」就是这个 z', null, 13.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      nodes.forEach(function (n) {
        setOpacity(n.g, seg(t, n.at, n.at + 0.4));
      });
      setOpacity(dag, seg(t, 3.2, 4.0));
      setOpacity(vaeMath, seg(t, 4.2, 5.0));
      cards.forEach(function (c) {
        setOpacity(c.g, seg(t, c.at, c.at + 0.45));
      });
      setOpacity(out, seg(t, 8.8, 9.6));
      setOpacity(foot, seg(t, 10.4, 11.2));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 6 幕：状态-潜动作联合扩散 ──────────────────────────────────
  function buildSceneLdm() {
    var s = sceneSvg(
      '扩散的是一整条 (状态, 潜动作) 轨迹：N=' +
        HIST_N +
        ' 步历史条件 + H=' +
        HZ +
        ' 步未来，' +
        CTRL_HZ +
        ' Hz 下正好 ' +
        fmt(HORIZON_S, 2) +
        ' 秒'
    );
    s.appendChild(svgText(56, 26, '任务代价写在状态上，动作却在 PD 空间 —— 所以两个一起扩散', 'demo-x-ink2', 13.5));

    var tauMath = svgMath(400, 56, '\\tau_t = [\\,s_{t-N},\\, z_{t-N},\\ \\ldots,\\ s_t,\\, z_t,\\ \\ldots,\\ s_{t+H},\\, z_{t+H}\\,]', {
      size: 14,
      w: 660,
      anchor: 'middle'
    });
    tauMath.setTone('var(--demo-accent)');
    s.appendChild(tauMath);

    /* 时间轴：N 步历史（灰）+ 当前（强调）+ H 步未来（蓝）。 */
    var strip = svgEl('g', {});
    var total = HIST_N + 1 + HZ;
    var cw = 700 / total;
    for (var i = 0; i < total; i++) {
      var isHist = i < HIST_N;
      var isNow = i === HIST_N;
      var col = isHist ? C_MUTED : isNow ? C_WARN : C_ACCENT;
      var cx = 50 + cw * i;
      strip.appendChild(paint(svgEl('rect', { x: cx + 1, y: 84, width: cw - 2, height: 26, rx: 4, 'stroke-width': 1.1 }), C_SURFACE2, col));
      strip.appendChild(paint(svgText(cx + cw / 2, 102, 's', 'demo-x-mono', 9.5, 'middle'), col));
      strip.appendChild(paint(svgEl('rect', { x: cx + 1, y: 114, width: cw - 2, height: 26, rx: 4, 'stroke-width': 1.1 }), C_SURFACE, col));
      strip.appendChild(paint(svgText(cx + cw / 2, 132, 'z', 'demo-x-mono', 9.5, 'middle'), col));
    }
    strip.appendChild(paint(svgText(50 + cw * (HIST_N / 2), 158, '历史 N = ' + HIST_N, null, 10, 'middle'), C_MUTED));
    strip.appendChild(paint(svgText(50 + cw * (HIST_N + 0.5), 172, '当前 t', null, 10, 'middle'), C_WARN));
    strip.appendChild(
      paint(svgText(50 + cw * (HIST_N + 1 + HZ / 2), 158, '未来 H = ' + HZ + '（' + fmt(HORIZON_S, 2) + ' s @ ' + CTRL_HZ + ' Hz）', null, 10, 'middle'), C_ACCENT)
    );
    s.appendChild(strip);

    var nums = [
      { v: fmt(HORIZON_S, 2) + ' s', d: 'H = ' + HZ + ' ÷ ' + CTRL_HZ + ' Hz 现除', c: C_ACCENT },
      { v: DENOISE_K + ' 步', d: '训练与推理同为 DDPM ' + DENOISE_K + ' 步', c: C_GOOD },
      { v: INFER_MS + ' ms', d: '一次推理，占 ' + fmt(CTRL_MS, 0) + ' ms 周期的 ' + fmt(INFER_LOAD * 100, 0) + '%', c: C_WARN },
      { v: fmt(TF_PARAM_M, 2) + ' M', d: TF_LAYERS + ' 层 × ' + TF_HEADS + ' 头 × ' + TF_DIM + ' 维', c: C_MUTED }
    ].map(function (p, k) {
      var g = svgEl('g', {});
      var px = 36 + k * 186;
      g.appendChild(paint(svgEl('rect', { x: px, y: 186, width: 174, height: 62, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, p.c));
      g.appendChild(paint(svgText(px + 87, 214, p.v, null, 19, 'middle'), p.c));
      g.appendChild(svgText(px + 87, 236, p.d, 'demo-x-mut', 9, 'middle'));
      s.appendChild(g);
      return { g: g, at: 3.0 + k * 0.8 };
    });

    var abl = svgEl('g', {});
    abl.appendChild(paint(svgEl('rect', { x: 36, y: 260, width: 728, height: 88, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, C_BORDER));
    abl.appendChild(svgText(52, 280, '状态里放什么，是 sim-to-real 的分水岭', 'demo-x-ink2', 11));
    [
      { t: 'Body-Pos（选用）：各连杆笛卡尔位置 + 线速度', a: BP_PERTURB, b: BP_JOY, c: C_GOOD, y: 300 },
      { t: 'Joint-Rot：关节角 + 角速度（理论上更 Markov）', a: JR_PERTURB, b: JR_JOY, c: C_BAD, y: 328 }
    ].forEach(function (row) {
      abl.appendChild(paint(svgText(52, row.y, row.t, null, 10.5), row.c));
      abl.appendChild(paint(svgText(540, row.y, 'Walk+Perturb ' + row.a + '%', 'demo-x-mono', 10.5), row.c));
      abl.appendChild(paint(svgText(748, row.y, 'Joystick ' + row.b + '%', 'demo-x-mono', 10.5, 'end'), row.c));
    });
    s.appendChild(abl);

    var gap = paint(svgText(400, 372, '摇杆任务上差了 ' + JOY_GAP + ' 个百分点：关节估计误差沿运动链累积，多步预测直接崩', null, 12, 'middle'), C_BAD);
    s.appendChild(gap);

    var foot = paint(svgText(400, 400, '状态和动作一起扩散，任务代价才能直接写在未来状态上', null, 13.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(tauMath, seg(t, 0.3, 1.0));
      setOpacity(strip, seg(t, 1.0, 1.8));
      nums.forEach(function (n) {
        setOpacity(n.g, seg(t, n.at, n.at + 0.4));
      });
      setOpacity(abl, seg(t, 7.4, 8.2));
      setOpacity(gap, seg(t, 10.0, 10.8));
      setOpacity(foot, seg(t, 12.2, 13.0));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 7 幕：Classifier Guidance ──────────────────────────────────
  function buildSceneGuidance() {
    var s = sceneSvg(
      '推理时把任务代价的梯度叠到 score 上：多个代价直接相加，训练时不需要枚举组合'
    );
    s.appendChild(svgText(56, 26, '训练完全任务无关、无标签；任务是部署之后才指定的', 'demo-x-ink2', 13.5));

    var bayes = svgMath(400, 58, '\\nabla_\\tau \\log p(\\tau \\mid \\tau^{\\ast}) = \\nabla_\\tau \\log p(\\tau) \\;-\\; \\nabla_\\tau G^c_\\tau(\\tau)', {
      size: 14,
      w: 660,
      anchor: 'middle'
    });
    bayes.setTone('var(--demo-accent)');
    s.appendChild(bayes);

    var costs = [
      { t: '摇杆速度', tex: '\\|\\bm{V}_{xy} - \\bm{g}_v\\|^2', d2: '沿整个视野累加', c: C_ACCENT },
      { t: '路点导航', d: '近目标时改罚速度', tex2: '\\text{用 } e^{-2d} \\text{ 在「走过去」和「停下」之间切}', c: C_GOOD },
      { t: '避障', d: 'SDF + 松弛 barrier', tex2: '\\text{距离} < \\delta \\text{ 时换成二次段，梯度不会爆}', c: C_WARN },
      { t: 'Motion inpainting', d: '每 ' + KEYFRAME_S + ' s 一个关键帧', d2: '把「某些帧必须等于它」写成代价', c: C_BAD }
    ].map(function (p, k) {
      var g = svgEl('g', {});
      var px = 36 + k * 186;
      g.appendChild(paint(svgEl('rect', { x: px, y: 86, width: 174, height: 84, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, p.c));
      g.appendChild(paint(svgText(px + 87, 110, p.t, null, 12, 'middle'), p.c));
      if (p.tex) {
        g.appendChild(svgMath(px + 87, 132, p.tex, { size: 10, anchor: 'middle', w: 166, cls: 'demo-x-mut' }));
      } else {
        g.appendChild(svgText(px + 87, 132, p.d, 'demo-x-mut', 9.5, 'middle'));
      }
      if (p.tex2) {
        g.appendChild(svgMath(px + 87, 152, p.tex2, { size: 8.5, anchor: 'middle', w: 170, cls: 'demo-x-mut' }));
      } else {
        g.appendChild(svgText(px + 87, 152, p.d2, 'demo-x-mut', 8.5, 'middle'));
      }
      s.appendChild(g);
      return { g: g, at: 1.6 + k * 0.8 };
    });

    var sum = svgEl('g', {});
    sum.appendChild(paint(svgEl('rect', { x: 36, y: 186, width: 356, height: 96, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_GOOD));
    sum.appendChild(paint(svgText(54, 210, '零样本组合：直接相加', null, 12.5), C_GOOD));
    sum.appendChild(svgMath(54, 234, 'G = G_{\\text{waypoint}} + G_{\\text{SDF}}', { size: 13, w: 300 }).setTone(C_GOOD));
    sum.appendChild(svgText(54, 254, '绕开障碍再走到路点 —— 训练时从没见过', 'demo-x-mut', 9.5));
    sum.appendChild(svgText(54, 272, '换成条件式训练，每种组合都要重采数据', 'demo-x-mut', 9.5));
    s.appendChild(sum);

    /* 右边示意：先验直行 → 加了两个代价之后绕开障碍到路点。 */
    var scene = svgEl('g', {});
    scene.appendChild(paint(svgEl('rect', { x: 408, y: 186, width: 356, height: 96, rx: 8, 'stroke-width': 1.2 }), C_SURFACE, C_BORDER));
    var start = [432, 234],
      goal = [740, 214],
      obst = [580, 240];
    var prior = [start, [740, 234]];
    var detour = [];
    for (var i = 0; i <= 24; i++) {
      var u = i / 24;
      detour.push([start[0] + (goal[0] - start[0]) * u, 234 - 30 * Math.sin(Math.PI * u) - 20 * u]);
    }
    scene.appendChild(paint(svgEl('circle', { cx: obst[0], cy: obst[1], r: 17, 'stroke-width': 1.5 }), C_SURFACE2, C_WARN));
    scene.appendChild(paint(svgText(obst[0], obst[1] + 4, '障碍', null, 8.5, 'middle'), C_WARN));
    scene.appendChild(
      paint(svgEl('path', { d: polyPath(prior), fill: 'none', 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }), null, C_MUTED)
    );
    scene.appendChild(paint(svgText(470, 272, '无引导：扩散自己想走的路', null, 9, 'left'), C_MUTED));
    s.appendChild(scene);

    var guided = paint(svgEl('path', { d: polyPath(detour), fill: 'none', 'stroke-width': 2.6 }), null, C_ACCENT);
    s.appendChild(guided);
    var goalDot = paint(svgEl('circle', { cx: goal[0], cy: goal[1], r: 5.5, 'stroke-width': 1.3 }), C_GOOD, C_SURFACE2);
    s.appendChild(goalDot);
    var goalTxt = paint(svgText(goal[0], goal[1] - 12, '路点', null, 9, 'middle'), C_GOOD);
    s.appendChild(goalTxt);

    var eng = svgEl('g', {});
    eng.appendChild(paint(svgEl('rect', { x: 36, y: 296, width: 728, height: 62, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, C_BORDER));
    eng.appendChild(paint(svgText(400, 318, '引导梯度用 CppAD 在每个去噪步自动求导；扩散在 RTX 4060 Mobile + TensorRT 上异步跑', null, 11.5, 'middle'), C_MUTED));
    eng.appendChild(svgText(400, 340, '强度有上限：拉太大就会飘出分布 —— 论文说 Joint-Rot 上加 guidance 会「迅速 OOD 失稳」', 'demo-x-mut', 9.5, 'middle'));
    s.appendChild(eng);

    var foot = paint(svgText(400, 396, 'guidance 只能在分布附近推一把，不能凭空造出没学过的动作', null, 13.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(bayes, seg(t, 0.3, 1.0));
      costs.forEach(function (c) {
        setOpacity(c.g, seg(t, c.at, c.at + 0.4));
      });
      setOpacity(sum, seg(t, 5.2, 6.0));
      setOpacity(scene, seg(t, 5.6, 6.4));
      var on = seg(t, 6.8, 7.6);
      setOpacity(guided, on);
      setOpacity(goalDot, on);
      setOpacity(goalTxt, on);
      setOpacity(eng, seg(t, 9.0, 9.8));
      setOpacity(foot, seg(t, 11.4, 12.2));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 8 幕：真机验收与闭环 ───────────────────────────────────────
  function buildSceneReal() {
    var s = sceneSvg(
      '约 ' +
        DATA_H +
        ' 小时动作、' +
        N_REAL +
        ' 条片段上 G1；用户研究 N=' +
        STUDY_N +
        ' 下整体偏好 ' +
        PREF_ALL +
        '%，但引导扩散那一半还没有独立仓库'
    );
    s.appendChild(svgText(56, 26, '数字对得上，管线也接得上 —— 只是开源只开了前一半', 'demo-x-ink2', 13));

    var nums = svgEl('g', {});
    [
      { v: PREF_ALL + '%', d: '整体自然性偏好（N = ' + STUDY_N + '）', c: C_GOOD },
      { v: PEAK_RAD + ' rad/s', d: '空中侧手翻骨盆角速度峰值', c: C_ACCENT },
      { v: ERR_WALK + '%', d: '仿真里的步行速度跟踪误差', c: C_WARN }
    ].forEach(function (p, k) {
      var px = 36 + k * 246;
      nums.appendChild(paint(svgEl('rect', { x: px, y: 44, width: 234, height: 74, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, p.c));
      nums.appendChild(paint(svgText(px + 117, 80, p.v, null, 24, 'middle'), p.c));
      nums.appendChild(svgText(px + 117, 104, p.d, 'demo-x-mut', 9.5, 'middle'));
    });
    s.appendChild(nums);

    /* 三组偏好对比：整体 / 走路 / 跑步。动作越动态，差距越大。 */
    var bars = svgEl('g', {});
    bars.appendChild(paint(svgEl('rect', { x: 36, y: 132, width: 356, height: 128, rx: 8, 'stroke-width': 1.2 }), C_SURFACE, C_BORDER));
    bars.appendChild(svgText(50, 150, '「哪个更像人」——BeyondMimic vs Unitree 原生', 'demo-x-mut', 9.5));
    [
      { t: '整体', v: PREF_ALL, gap: GAP_ALL },
      { t: '走路', v: PREF_WALK, gap: GAP_WALK },
      { t: '跑步', v: PREF_RUN, gap: GAP_RUN }
    ].forEach(function (row, k) {
      var y = 166 + k * 30;
      bars.appendChild(paint(svgText(64, y + 14, row.t, null, 10, 'middle'), C_MUTED));
      bars.appendChild(paint(svgEl('rect', { x: 84, y: y, width: 230, height: 18, rx: 3 }), C_SURFACE2));
      bars.appendChild(paint(svgEl('rect', { x: 84, y: y, width: (230 * row.v) / 100, height: 18, rx: 3 }), C_GOOD));
      bars.appendChild(paint(svgText(322, y + 13, '+' + fmt(row.gap, 1), 'demo-x-mono', 10), C_GOOD));
    });
    bars.appendChild(svgText(50, 252, '动作越动态，优势越大：跑步领先 ' + fmt(GAP_RUN, 1) + ' 个百分点', 'demo-x-mut', 9.5));
    s.appendChild(bars);

    var scale = svgEl('g', {});
    scale.appendChild(paint(svgEl('rect', { x: 408, y: 132, width: 356, height: 128, rx: 8, 'stroke-width': 1.2 }), C_SURFACE, C_BORDER));
    scale.appendChild(svgText(422, 150, '规模与敏捷性', 'demo-x-mut', 9.5));
    [
      '数据：约 ' + DATA_H + ' 小时人类动作（LAFAN1 为主）',
      '仿真：' + N_SHORT + ' 条短序列 + ' + N_LONG + ' 条分钟级长参考全通过',
      '真机：' + N_REAL + ' 条代表性片段，共约 ' + REAL_MIN + ' 分钟',
      '空翻：峰值 ' + PEAK_RAD + ' rad/s、均值 ' + MEAN_RAD + '（人类熟练 ' + HUMAN_RAD + '）、' + PEAK_ACC + ' m/s²',
      '长跑：跑道上连续 ' + RUN_M + ' m+；跑步误差 ' + ERR_RUN + '%'
    ].forEach(function (t, k) {
      scale.appendChild(svgText(422, 172 + k * 19, '· ' + t, 'demo-x-mut', 9.5));
    });
    s.appendChild(scale);

    var files = svgEl('g', {});
    [
      { f: 'tasks/tracking/mdp/commands.py', d: '锚定相对位姿 + 自适应采样' },
      { f: 'tasks/tracking/mdp/rewards.py · events.py', d: '指数跟踪奖励 + ' + N_DR + ' 类 DR' },
      { f: 'motion_tracking_controller', d: 'ONNX 策略上真机' }
    ].forEach(function (f, k) {
      var y = 274 + k * 28;
      files.appendChild(paint(svgEl('rect', { x: 36, y: y, width: 728, height: 24, rx: 5, 'stroke-width': 1.1 }), C_SURFACE2, C_BORDER));
      files.appendChild(paint(svgText(52, y + 16, f.f, 'demo-x-mono', 10), C_ACCENT));
      files.appendChild(svgText(748, y + 16, f.d, 'demo-x-mut', 9.5, 'end'));
    });
    s.appendChild(files);

    var open = svgEl('g', {});
    open.appendChild(paint(svgEl('rect', { x: 36, y: 360, width: 728, height: 26, rx: 5, 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }), C_SURFACE, C_BAD));
    open.appendChild(paint(svgText(400, 377, '扩散蒸馏与 test-time guidance 尚无独立仓库 —— 能复现的是跟踪那一半', null, 11, 'middle'), C_BAD));
    s.appendChild(open);

    var foot = paint(svgText(400, 408, '扩散 + 控制主线的终点：统一跟踪 → 潜空间蒸馏 → 测试时引导', null, 13.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(nums, seg(t, 0.3, 1.1));
      setOpacity(bars, seg(t, 2.4, 3.2));
      setOpacity(scale, seg(t, 5.0, 5.8));
      setOpacity(files, seg(t, 7.8, 8.6));
      setOpacity(open, seg(t, 9.8, 10.6));
      setOpacity(foot, seg(t, 11.4, 12.2));
    }

    return { el: s, draw: draw };
  }

  var BM_SCENES = [
    {
      title: '两个缺口：跟不动，跟完也不会用',
      dur: 13,
      build: buildSceneGaps,
      cues: [
        { at: 0.3, s: '人形和人体形态相近，从人类演示里学是获得敏捷性最可扩展的路 —— 但现有工作卡在两处。' },
        { at: 2.6, s: '**缺口一**：单动作专用的（ASAP / KungfuBot / HuB）每条动作都要单独调 DR 与奖励。' },
        { at: 5.0, s: '多动作统一的（OmniH2O / GMT / TWIST）可扩展，代价是动态质量或全局轨迹；PHC 只在仿真里被证明过。' },
        { at: 7.6, s: '**缺口二**：跟踪完了不知道怎么用。分层有规划-控制鸿沟，条件生成（CALM / PULSE）离不开显式目标条件。' },
        { at: 9.8, s: '纯动作扩散更尴尬：任务代价写在**状态**空间，策略却输出在 PD 目标空间，没法直接做 test-time guidance。' },
        { at: 11.4, s: 'BeyondMimic 两边都答：紧凑 MDP 把跟踪做到可扩展，再把技能蒸馏成可引导的生成模型。' }
      ]
    },
    {
      title: '锚定跟踪：允许它漂，不许它走歪',
      dur: 13,
      build: buildSceneAnchor,
      cues: [
        { at: 0.3, s: '真机没有动捕房，状态估计一定会积分漂。漂移不是错误，是事实。' },
        { at: 1.9, s: '刚性跟踪世界系绝对位姿时，这份漂移原样进奖励，策略只能用大幅纠偏往回拽 —— 动作就僵了。' },
        { at: 4.2, s: 'BeyondMimic 把参考整体重锚定：$\\hat{T}_b = T_{\\text{anchor}} T_{b_{\\text{ref}}}^{-1} T_{b,\\text{motion}}$。' },
        { at: 6.8, s: '锚点取机器人当前的 $x, y$、**参考的高度** $z$，旋转只对齐 yaw —— 放开的是水平位置，不是朝向。' },
        { at: 8.8, s: '所以蹲下、跳起这些竖直方向的东西照样被跟踪；走歪了 yaw 误差仍然在算。' },
        { at: 11.2, s: '代价是全局轨迹可以漂，收益是动作风格与相对协调被完整保留。' }
      ]
    },
    {
      title: '一套 MDP、一套超参',
      dur: 13,
      build: buildSceneMdp,
      cues: [
        { at: 0.3, s: '动画侧常用高 $k_p$ 近似运动学跟踪；真机上那会放大噪声、吃掉碰撞柔顺性。' },
        { at: 2.2, s: '按 Raibert 启发式设阻抗：$k_{p,j} = I_j\\omega_n^2$、$k_{d,j} = 2I_j\\zeta\\omega_n$，$\\omega_n = ' + OMEGA_HZ + '$ Hz、$\\zeta = ' + ZETA + '$。' },
        { at: 4.4, s: '也就是 $k_d/k_p = 2\\zeta/\\omega_n \\approx ' + fmt(PD_RATIO_S, 3) + '$ s —— 偏低偏软，动作是归一化关节位置而不是力矩。' },
        { at: 6.4, s: '奖励只有 ' + N_TERMS + ' 项：' + N_TRACK + ' 项跟踪（$p, R, v, w$）走高斯型指数，外加限位 / 平滑 / 自碰撞 ' + N_REG + ' 项正则。' },
        { at: 9.0, s: '域随机化也只有 ' + N_DR + ' 类：地面摩擦、关节零位、躯干质心 —— 全是真正不确定的物理量。' },
        { at: 11.4, s: '论文的判断：**原则性建模 + 系统实现**比堆 DR 更重要，所以同一套超参能覆盖侧手翻到冲刺。' }
      ]
    },
    {
      title: '长参考不能均匀采',
      dur: 12,
      build: buildSceneSampling,
      cues: [
        { at: 0.3, s: '一条 ' + REF_MIN + ' 分钟的多技能参考按 ' + BIN_S + ' 秒分箱，就是 ' + REF_BINS + ' 个箱，均匀采样每箱只有 ' + fmt(UNIFORM_PCT, 2) + '%。' },
        { at: 2.2, s: '走路占了绝大部分，于是预算全花在**已经会的地方**，中间那两段侧手翻一直练不到。' },
        { at: 4.4, s: '改成按失败率加权：$p_s$ 用非因果核 $\\gamma^\\tau$ 把失败的权重往前摊，练的是失败**之前**那几秒。' },
        { at: 6.2, s: '再掺一点均匀：$p_s\' = \\lambda/S + (1-\\lambda)p_s$。$\\lambda$ 是保险 —— 拖到 0 就会把走路慢慢忘掉。' },
        { at: 8.8, s: '和 PHC 的 PMCP 是两种思路：PHC 遇到难例**加一列网络**，这里只**改采样分布**，仍是单策略单 MDP。' },
        { at: 10.4, s: '重置时还叠了起始位姿、速度与关节扰动，抵消分钟级 rollout 的累积误差。' }
      ]
    },
    {
      title: 'Stage 1：蒸馏出 $' + LATENT_DIM + '$ 维潜空间',
      dur: 12,
      build: buildSceneVae,
      cues: [
        { at: 0.3, s: '跟踪策略只会复现训练过的参考。要泛化，得先把一堆专家合成一个生成模型。' },
        { at: 2.0, s: '第一步不是扩散，是 VAE：encoder 只看参考分量 $\\psi$ 与锚定误差，产出 $' + LATENT_DIM + '$ 维的 $z$。' },
        { at: 3.2, s: '训练用 **DAgger**：让学生自己走，专家在它真实到过的状态上打标签 —— 不是离线 BC。' },
        { at: 5.0, s: '关键选择是**编码参考动作而不是原始 PD 动作**：运动状态更结构化，$z$ 抓的是「动作意图」。' },
        { at: 7.4, s: 'KL 系数 $\\beta = ' + VAE_BETA + '$ 把潜空间压向标准正态，平滑连续，扩散才好在上面采样。' },
        { at: 9.6, s: '部署时 decoder 很轻，直接在 CPU 上同步跑；重的扩散留给 GPU 异步跑。' }
      ]
    },
    {
      title: 'Stage 2：状态-潜动作联合扩散',
      dur: 14,
      build: buildSceneLdm,
      cues: [
        { at: 0.3, s: '扩散的对象是一整条轨迹 $\\tau_t = [s_{t-N}, z_{t-N}, \\ldots, s_{t+H}, z_{t+H}]$，状态与潜动作成对。' },
        { at: 1.8, s: '$N = ' + HIST_N + '$ 步历史做条件，$H = ' + HZ + '$ 步未来做预测；每个 $s$、$z$ 还能有各自的去噪步数，这是 inpainting 的接口。' },
        { at: 3.4, s: '阶段 2 把跟踪策略降到 $' + CTRL_HZ + '$ Hz 给推理留时间，所以 $' + HZ + ' / ' + CTRL_HZ + ' = ' + fmt(HORIZON_S, 2) + '$ 秒就是那个视野。' },
        { at: 5.6, s: '$' + DENOISE_K + '$ 步去噪、一次推理约 $' + INFER_MS + '$ ms，正好是 $' + fmt(CTRL_MS, 0) + '$ ms 控制周期的 ' + fmt(INFER_LOAD * 100, 0) + '%，所以放在独立线程里异步跑。' },
        { at: 7.4, s: '骨干是 Transformer encoder，' + TF_LAYERS + ' 层 × ' + TF_HEADS + ' 头 × ' + TF_DIM + ' 维；光注意力与 FFN 的权重就 ' + fmt(TF_PARAM_M, 2) + ' M。' },
        { at: 10.0, s: '状态里放什么是分水岭：Body-Pos 拿到 ' + BP_PERTURB + '% / ' + BP_JOY + '%，Joint-Rot 只有 ' + JR_PERTURB + '% / ' + JR_JOY + '%，摇杆上差 ' + JOY_GAP + ' 个百分点。' },
        { at: 12.2, s: '原因是关节估计误差沿运动链累积，多步预测直接崩；笛卡尔 body 状态对引导鲁棒得多。' }
      ]
    },
    {
      title: 'Classifier Guidance：代价直接相加',
      dur: 13,
      build: buildSceneGuidance,
      cues: [
        { at: 0.3, s: '扩散学的是 score，所以条件可以用 Bayes 拆开：$\\nabla_\\tau\\log p(\\tau\\mid\\tau^{\\ast}) = \\nabla_\\tau\\log p(\\tau) - \\nabla_\\tau G$。' },
        { at: 1.8, s: '摇杆是罚速度偏差，路点近目标时改罚速度好停下，避障是 SDF 套一个松弛 barrier。' },
        { at: 4.0, s: 'Motion inpainting 也是同一套：把「每 ' + KEYFRAME_S + ' s 的关键帧必须等于它」写成代价，中间那段扩散自己补。' },
        { at: 5.2, s: '**多个代价直接相加**：$G = G_{\\text{waypoint}} + G_{\\text{SDF}}$ 就能绕障到点，训练时从没见过这个组合。' },
        { at: 7.6, s: '换成条件式训练就完全不同 —— 每加一种组合都要重新标注、重新采数据。' },
        { at: 9.0, s: '工程上梯度用 CppAD 在每个去噪步自动求导，扩散在 RTX 4060 Mobile 上靠 TensorRT 异步跑。' },
        { at: 11.4, s: '强度有上限：拉太大轨迹会飘出分布。guidance 只能在先验附近推一把，造不出没学过的动作。' }
      ]
    },
    {
      title: '真机验收与还没开源的那一半',
      dur: 13,
      build: buildSceneReal,
      cues: [
        { at: 0.3, s: '规模：约 ' + DATA_H + ' 小时人类动作，' + N_SHORT + ' 条短序列 + ' + N_LONG + ' 条分钟级长参考仿真全通过。' },
        { at: 2.4, s: '真机挑 ' + N_REAL + ' 条代表性片段（约 ' + REAL_MIN + ' 分钟）上 Unitree G1，含分钟级多技能串联参考。' },
        { at: 4.0, s: '用户研究 $N = ' + STUDY_N + '$：整体偏好 ' + PREF_ALL + '%，领先 ' + fmt(GAP_ALL, 1) + ' 个百分点；跑步 ' + PREF_RUN + '%，领先 ' + fmt(GAP_RUN, 1) + '。' },
        { at: 5.6, s: '动作越动态，优势越大 —— 走路只领先 ' + fmt(GAP_WALK, 1) + '，跑步就拉开到 ' + fmt(GAP_RUN, 1) + '。' },
        { at: 7.8, s: '敏捷性：空中侧手翻骨盆峰值 ' + PEAK_RAD + ' rad/s（均值 ' + MEAN_RAD + '，人类熟练特技约 ' + HUMAN_RAD + '）、加速度 ' + PEAK_ACC + ' m/s²。' },
        { at: 9.8, s: '但开源只开了前一半：跟踪管线可以跑，**扩散蒸馏与 test-time guidance 还没有独立仓库**。' },
        { at: 11.4, s: '所以它是扩散 + 控制主线的终点：统一跟踪 → 潜空间蒸馏 → 测试时引导，全都在真机上走通了一遍。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '八幕动画：BeyondMimic 全流程速览',
      sub: '约 103 秒自动播放。空格播放/暂停，← → 换幕；画面里的换算数字都是现算的，不是手写。',
      ariaLabel: 'BeyondMimic 八幕讲解动画',
      notes: [
        '取数依据：第六幕的视野是 $H / f = ' +
          HZ +
          ' / ' +
          CTRL_HZ +
          ' = ' +
          fmt(HORIZON_S, 2) +
          '$ s 现除（论文把阶段 2 的跟踪策略降到 $' +
          CTRL_HZ +
          '$ Hz 以给扩散推理留时间，不是跟踪阶段的 50 Hz）；推理负载 $' +
          INFER_MS +
          ' / ' +
          fmt(CTRL_MS, 0) +
          ' = ' +
          fmt(INFER_LOAD * 100, 0) +
          '\\%$；参数量 $' +
          TF_LAYERS +
          ' \\times 12 d^2 \\approx ' +
          fmt(TF_PARAM_M, 2) +
          '$ M **只含注意力与 FFN 的权重**，论文那个 ≈19.8M 还含嵌入与 LayerNorm。',
        '第三幕的 $k_d/k_p = 2\\zeta/\\omega_n \\approx ' +
          fmt(PD_RATIO_S, 3) +
          '$ s 由 $\\omega_n = ' +
          OMEGA_HZ +
          '$ Hz、$\\zeta = ' +
          ZETA +
          '$ 现算；第四幕的 ' +
          REF_BINS +
          ' 个箱与 ' +
          fmt(UNIFORM_PCT, 2) +
          '% 由 $' +
          REF_MIN +
          ' \\times 60 / ' +
          BIN_S +
          '$ 现算。第八幕的偏好差值是 $2p - 100$ 现减，其余（' +
          PREF_ALL +
          '% / ' +
          PEAK_RAD +
          ' rad/s / ' +
          ERR_WALK +
          '%）都是论文原值，不是另测。',
        '第四幕那张柱状图与上文「起始相位」演示同一形状（' +
          BINS +
          ' 秒的玩具参考，中间插两段高动态），只为把「预算怎么转移」画清楚，数值不能和论文比。'
      ],
      scenes: BM_SCENES
    });
  }

  K.mount({
    'bm-explainer': buildExplainerDemo,
    'bm-anchor': buildAnchorDemo,
    'bm-sampling': buildSamplingDemo,
    'bm-guidance': buildGuidanceDemo
  });
})();
