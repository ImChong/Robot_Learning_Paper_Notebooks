/* Interactive BeyondMimic demos for papers/01_Foundational_RL/BeyondMimic.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["beyondmimic"]`, after assets/js/demos/kit.js. The note itself may
 * only contain empty placeholders, because scripts/sanitize_paper_html.py
 * strips <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
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
        'T̂_b = T_anchor · T_ref⁻¹ · T_motion。锚点保留机器人当前的 xy、参考的高度，只对齐 yaw。' +
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
      '**高度也不放**：p_anchor 的 z 取的是**参考的高度**，不是机器人的。' +
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
        'BeyondMimic 按 1 秒分箱、按失败率加权，再用 λ 掺一点均匀分布防遗忘。'
    });

    var state = { lambda: 0.25, gamma: 0.8, rounds: 10, uniform: false };
    var diff = binDifficulty();

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: 'λ（掺多少均匀分布，防灾难性遗忘）',
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
      label: '非因果核 γ（往前看几秒）',
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
      { key: 'accent', text: '下一轮会从这里起步的概率 p_s′' },
      { key: 'muted', text: 'λ 掺进来的均匀底噪' }
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
      '**λ 是保险，不是调味**：把 λ 拖到 0，采样会全压在最难的那两段上，' +
        '走路那部分长时间一次都采不到 —— 于是它慢慢被忘掉（看左图两侧的红柱重新长回来）。' +
        '论文那句「防止灾难性遗忘」就是这个意思。',
      '**γ 决定「提前多久开始练」**：失败往往发生在某个动作的中段，但问题可能出在进入姿势上。' +
        '非因果核 γ^τ 把失败的权重往前摊，让采样点落在失败**之前**那几秒。把 γ 拖到 0，只会盯着失败那一秒本身。',
      '**这和 PHC 的 PMCP 是两种思路**：PHC 遇到难例是**加一列网络**，BeyondMimic 是**改采样分布**。' +
        '前者不会遗忘但要多跑几份前向，后者是单策略、单 MDP，代价就是这个 λ 要调。',
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
          '⚠️ λ = ' +
            fmt(state.lambda, 2) +
            '：采样几乎全压在难段上，最冷门那一秒只剩 ' +
            fmt(floor, 2) +
            '% 的概率。左图两侧的柱子会慢慢重新长起来 —— 这就是把简单片段忘掉的过程。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ λ = ' +
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
        '∇log p(τ|τ*) = ∇log p(τ) + ∇log p(τ*|τ)。前一项是扩散模型学到的「人类会怎么动」，' +
        '后一项就是 −∇G。避障和路点是两个独立的 G，相加即可 —— 训练时根本不需要枚举组合。'
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
    checkbox(togBox, '避障代价 G_avoid', state.avoid, function (on) {
      state.avoid = on;
      render();
    });
    checkbox(togBox, '路点代价 G_waypoint', state.waypoint, function (on) {
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
      '**这是简化模型**：真实的 τ 是 16 步状态-动作序列，梯度用 CppAD 自动求导，先验是一个 19.95M 的 Transformer。' +
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
          '😐 引导强度 0：这就是纯 p(τ)，扩散模型只会输出它见过的「自然直行」。' +
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

  K.mount({
    'bm-anchor': buildAnchorDemo,
    'bm-sampling': buildSamplingDemo,
    'bm-guidance': buildGuidanceDemo
  });
})();
