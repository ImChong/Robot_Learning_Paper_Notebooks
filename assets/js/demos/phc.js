/* Interactive PHC demos for
 * papers/01_Foundational_RL/PHC_Perpetual_Humanoid_Control.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["phc"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   phc-pmcp     — 渐进式训练：一轮一个 primitive，旧的冻结，所以不会被洗掉
 *   phc-mcp      — Composer 的连续混合：把温度拉满，它就退化成硬切换
 *   phc-recovery — 摔倒恢复：P^F 把「摔了就结束」变成「摔了再爬起来」
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
    softmax = K.softmax;

  // ─── demo 1: PMCP 渐进式训练 ─────────────────────────────────────────────
  var LIB = 240; // 动作库里的 clip 数（AMASS 是一万多条，这里缩成一张网格）

  /* 每条 clip 一个难度值。前面的容易（走、站），越往后越离谱（体操、空翻）。 */
  function buildLibrary(seed) {
    var rng = mulberry32(seed);
    var clips = [];
    for (var i = 0; i < LIB; i++) {
      // 难度是长尾的：大部分 AMASS 片段是走 / 站 / 伸手，真正难的（体操、空翻）只占一小撮
      var base = Math.pow(i / LIB, 2.2);
      clips.push({ i: i, d: clamp(base + 0.05 * (rng() - 0.5), 0, 1) });
    }
    return clips;
  }

  /* 一轮训练：在 hardSet 上训一个新 primitive。数据越少越能钻进去，
     所以阈值随 hard set 缩小而升高 —— 这就是 PMCP 「只打难例」的收益。 */
  function trainRound(clips, hardIdx, focus) {
    var frac = hardIdx.length / LIB;
    // hard set 越小，新 primitive 的容量越集中，能啃下的难度上限越高
    var g = 1.6 - 1.2 * focus;
    var thr = 1 - (1 - 0.55) * Math.pow(Math.max(frac, 1e-3), g);
    var solved = [],
      still = [];
    hardIdx.forEach(function (i) {
      if (clips[i].d <= thr) solved.push(i);
      else still.push(i);
    });
    return { thr: thr, solved: solved, still: still };
  }

  function buildPmcpDemo(host) {
    var root = card(host, {
      title: 'PMCP：每一轮新增一个 primitive，旧的冻结起来',
      sub:
        '第 1 轮在全部 AMASS 上训 P¹，冻结，把还没学会的导出成 Q_hard²；第 2 轮只打这些难例……' +
        '点「训练下一轮」，看两条路线分岔：PHC 是加容量，单网络微调是覆盖旧记忆。'
    });

    var state = { round: 0, focus: 0.6, forget: 0.35, seed: 17 };
    var clips = buildLibrary(state.seed);

    /* 两条路线的结果都从头重算，保证任何滑块变动后画面自洽。 */
    function simulate() {
      var owner = new Array(LIB); // 每条 clip 被哪一列 primitive 搞定
      var hard = [];
      for (var i = 0; i < LIB; i++) hard.push(i);
      var pmcpCurve = [0],
        thrs = [],
        hardSizes = [LIB];
      for (var r = 0; r < state.round; r++) {
        var res = trainRound(clips, hard, state.focus);
        res.solved.forEach(function (i2) {
          owner[i2] = r;
        });
        thrs.push(res.thr);
        hard = res.still;
        hardSizes.push(hard.length);
        pmcpCurve.push((LIB - hard.length) / LIB);
      }

      // 单网络微调基线：同样只在 hard set 上训，但会遗忘之前学会的
      var ftSolved = {};
      var ftCurve = [0];
      var ftHard = [];
      for (var j = 0; j < LIB; j++) ftHard.push(j);
      for (var r2 = 0; r2 < state.round; r2++) {
        var res2 = trainRound(clips, ftHard, state.focus);
        res2.solved.forEach(function (i3) {
          ftSolved[i3] = true;
        });
        // 遗忘：这一轮没练到的旧样本，按 forget 比例掉回失败
        var rng = mulberry32(state.seed + r2 * 7919);
        Object.keys(ftSolved).forEach(function (kk) {
          var idx = parseInt(kk, 10);
          if (res2.solved.indexOf(idx) === -1 && rng() < state.forget) delete ftSolved[idx];
        });
        ftHard = [];
        for (var m = 0; m < LIB; m++) if (!ftSolved[m]) ftHard.push(m);
        ftCurve.push(Object.keys(ftSolved).length / LIB);
      }
      return { owner: owner, hard: hard, pmcpCurve: pmcpCurve, ftCurve: ftCurve, thrs: thrs, hardSizes: hardSizes };
    }

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '「只打难例」带来的增益',
      min: 0,
      max: 1,
      step: 0.02,
      value: state.focus,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.focus = v;
        render();
      }
    });
    slider(ctrls, {
      label: '单网络微调的遗忘率',
      min: 0,
      max: 0.8,
      step: 0.02,
      value: state.forget,
      format: function (v) {
        return fmt(v * 100, 0) + '%';
      },
      onInput: function (v) {
        state.forget = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '训练下一轮 ▶', function () {
      state.round = Math.min(4, state.round + 1);
      render();
    });
    button(btns, '一次训到底', function () {
      state.round = 4;
      render();
    });
    button(btns, '从头开始', function () {
      state.round = 0;
      render();
    });

    var setLegend = legend(root, [
      { key: 'good', text: 'P¹ 学会的（第 1 轮，全量数据）' },
      { key: 'accent', text: 'P² / P³ 学会的（只打难例）' },
      { key: 'warn', text: 'Pᶠ 那一轮才收住的' },
      { key: 'bad', text: '还是不会' }
    ]);

    var grid = stageGrid(root);
    var gridStage = stage(grid, 240);
    var curveStage = stage(grid, 240);

    var stats = statsRow(root);
    var sRound = stats.add('已训练的 primitive');
    var sCov = stats.add('PHC 覆盖率');
    var sFt = stats.add('单网络微调覆盖率');
    var sHard = stats.add('Q_hard 还剩');
    var verdict = verdictBox(root);

    note(root, [
      '**关键不是课程，是容量**：常见的课程学习是「同一个网络，样本从易到难」；' +
        'PMCP 是「每一轮新开一列网络，旧列 `freeze_pnn` 冻死」。所以第 2 轮怎么练都不可能把第 1 轮学会的走路洗掉 —— ' +
        '把遗忘率滑块拖大，就能看到没有冻结时那条线是怎么塌下去的。',
      '**难例越少，越好啃**：hard set 从全量缩到几十条以后，新 primitive 的整个容量都花在这几条上，' +
        '所以阈值会往上走。这也是为什么第 2、3 轮的边际收益还不错，而不是一路递减到 0。',
      '**代价是推理时要跑多列**：F 个 primitive 就是 F 份前向，外加一个 Composer。' +
        'PHC 敢这么做，是因为每列只是个 MLP，而实时性又是它的硬指标 —— 换成大模型这条路就不成立了。',
      '**这是简化模型**：真实的「学不学得会」由 tracking 失败率决定，不是一个难度阈值；AMASS 是一万多条，这里只有 240 格。' +
        '趋势（冻结 → 不塌 / 微调 → 塌）成立，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var sim = simulate();
      var cov = state.round ? sim.pmcpCurve[state.round] : 0;
      var ft = state.round ? sim.ftCurve[state.round] : 0;

      sRound.set(state.round + ' 列', state.round ? 'accent' : 'muted');
      sCov.set(fmt(cov * 100, 1) + '%', cov > 0.9 ? 'good' : cov > 0.6 ? 'warn' : 'bad');
      sFt.set(fmt(ft * 100, 1) + '%', ft > cov - 0.02 ? 'good' : 'bad');
      sHard.set(sim.hard.length + ' / ' + LIB, sim.hard.length < 20 ? 'good' : 'warn');

      if (state.round === 0) {
        verdict.set(
          '⏱ 还没开始。整个动作库（240 格，代表 AMASS 的一万多条）现在全是红的。' +
            '点「训练下一轮」看第 1 个 primitive 在全量数据上能吃下多少。',
          'frozen'
        );
      } else if (state.round === 1) {
        verdict.set(
          '📗 第 1 轮：P¹ 在全部数据上拿下 ' +
            fmt(cov * 100, 1) +
            '%。剩下的 ' +
            sim.hard.length +
            ' 条就是论文说的 Q_hard² —— 注意**这一步之后 P¹ 就被冻结了**，' +
            '后面无论训什么，这片绿色都不会再变红。',
          'learning'
        );
      } else if (cov - ft > 0.08) {
        verdict.set(
          '✅ 训到第 ' +
            state.round +
            ' 列：PHC 覆盖 ' +
            fmt(cov * 100, 1) +
            '%，单网络微调只有 ' +
            fmt(ft * 100, 1) +
            '%。差的这 ' +
            fmt((cov - ft) * 100, 1) +
            ' 个百分点全是**被新数据洗掉的旧技能** —— 这就是灾难性遗忘，也是 PMCP 想解决的唯一问题。',
          'learning'
        );
      } else {
        verdict.set(
          '➖ 遗忘率设成 ' +
            fmt(state.forget * 100, 0) +
            '% 时两条路线差不多（' +
            fmt(cov * 100, 1) +
            '% vs ' +
            fmt(ft * 100, 1) +
            '%）。把它拖大一点 —— 动作库越杂、分布差得越远，真实训练里的遗忘就越接近右边那条塌下去的线。',
          'frozen'
        );
      }

      // ── 左：动作库网格 ──
      var g = begin(gridStage);
      var P = g.P;
      setLegend(P);
      var cols = 24,
        rows = LIB / cols;
      var padL = 10,
        padT = 26;
      var cw = (g.w - padL * 2) / cols,
        chh = Math.min((g.h - padT - 14) / rows, cw);
      text(g.ctx, '动作库：每格一条 motion clip（按难度排序）', padL, 14, P.muted, 'left', '11px sans-serif');
      var tones = [P.good, P.accent, P.accent, P.warn, P.warn];
      for (var i = 0; i < LIB; i++) {
        var r = Math.floor(i / cols),
          c = i % cols;
        var own = sim.owner[i];
        g.ctx.fillStyle = own == null ? P.bad : tones[Math.min(own, tones.length - 1)];
        g.ctx.globalAlpha = own == null ? 0.85 : 1;
        g.ctx.fillRect(padL + c * cw + 1, padT + r * chh + 1, cw - 2, chh - 2);
      }
      g.ctx.globalAlpha = 1;
      text(g.ctx, '← 容易', padL, padT + rows * chh + 10, P.muted, 'left', '10px sans-serif');
      text(g.ctx, '难 →', g.w - padL, padT + rows * chh + 10, P.muted, 'right', '10px sans-serif');

      // ── 右：覆盖率曲线 ──
      var g2 = begin(curveStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [0, 4], [0, 1.05]);
      axes(g2, p2, {
        xTicks: [0, 1, 2, 3, 4],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) {
          return fmt(t * 100, 0) + '%';
        },
        xLabel: '训练轮次（第几个 primitive）'
      });
      text(g2.ctx, '动作库覆盖率', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var full = simulateFull();
      function simulateFull() {
        var save = state.round;
        state.round = 4;
        var s = simulate();
        state.round = save;
        return s;
      }
      line(
        g2.ctx,
        full.pmcpCurve.map(function (v, i2) {
          return [p2.sx(i2), p2.sy(v)];
        }),
        P2.good,
        1.4,
        [4, 4]
      );
      line(
        g2.ctx,
        full.ftCurve.map(function (v, i3) {
          return [p2.sx(i3), p2.sy(v)];
        }),
        P2.bad,
        1.4,
        [4, 4]
      );
      line(
        g2.ctx,
        sim.pmcpCurve.map(function (v, i4) {
          return [p2.sx(i4), p2.sy(v)];
        }),
        P2.good,
        2.6
      );
      line(
        g2.ctx,
        sim.ftCurve.map(function (v, i5) {
          return [p2.sx(i5), p2.sy(v)];
        }),
        P2.bad,
        2.6
      );
      if (state.round) {
        dot(g2.ctx, p2.sx(state.round), p2.sy(cov), 4.5, P2.good, P2.surface2);
        dot(g2.ctx, p2.sx(state.round), p2.sy(ft), 4.5, P2.bad, P2.surface2);
      }
      text(g2.ctx, 'PHC：冻结 + 加列', p2.x0 + 8, p2.sy(0.96), P2.good, 'left', '11px sans-serif');
      text(g2.ctx, '单网络微调：会被洗掉', p2.x0 + 8, p2.sy(0.86), P2.bad, 'left', '11px sans-serif');

      gridStage.canvas.setAttribute('aria-label', '动作库里每条 clip 被哪一列 primitive 学会的网格图');
      curveStage.canvas.setAttribute('aria-label', 'PHC 与单网络微调的动作库覆盖率曲线');
    });

    render();
  }

  // ─── demo 2: Composer 的连续混合 ─────────────────────────────────────────
  var PRIMS = [
    { name: 'P¹ 通用 locomotion', c: -1.3, act: function (s) { return 0.35 * s + 0.2; } },
    { name: 'P² 敏捷 / 转身', c: 0.0, act: function (s) { return -0.45 * s + 0.75; } },
    { name: 'P³ 极限动作', c: 1.3, act: function (s) { return 0.6 * s - 0.55; } }
  ];

  function expertise(s) {
    return PRIMS.map(function (p) {
      return -((s - p.c) * (s - p.c)) / (2 * 0.62 * 0.62);
    });
  }

  function buildMcpDemo(host) {
    var root = card(host, {
      title: 'Composer：不是「挑一个专家」，是「几个专家一起出主意」',
      sub:
        '源码就两行：`x_all = stack(actions)` 再 `sum(weights * x_all)`。' +
        '把 Composer 的温度拉满，softmax 会退化成 one-hot —— 那就变成硬切换了，看看输出会发生什么。'
    });

    var state = { s: -0.35, temp: 1.0 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '当前状态 s（想象成「动作激烈程度」）',
      min: -2.2,
      max: 2.2,
      step: 0.01,
      value: state.s,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.s = v;
        render();
      }
    });
    slider(ctrls, {
      label: 'Composer 温度（越大越接近硬切换）',
      min: 0.5,
      max: 40,
      step: 0.5,
      value: state.temp,
      format: function (v) {
        return fmt(v, 1);
      },
      onInput: function (v) {
        state.temp = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, 'PHC 的连续混合（温度 1）', function () {
      state.temp = 1;
      render();
    });
    button(btns, '退化成硬切换（温度 40）', function () {
      state.temp = 40;
      render();
    });

    var setLegend = legend(root, [
      { key: 'good', text: 'P¹ 的权重' },
      { key: 'accent', text: 'P² 的权重' },
      { key: 'warn', text: 'P³ 的权重' },
      { key: 'bad', text: '硬切换（argmax）时的输出' }
    ]);

    var grid = stageGrid(root);
    var wStage = stage(grid, 230);
    var aStage = stage(grid, 230);

    var stats = statsRow(root);
    var sTop = stats.add('权重最高的 primitive');
    var sW = stats.add('它拿到的权重');
    var sBlend = stats.add('混合输出的动作');
    var sHard = stats.add('硬切换会输出');
    var verdict = verdictBox(root);

    note(root, [
      '**过渡是免费拿到的**：两个 primitive 交界的地方，权重是连续变化的，所以输出动作也连续。' +
        '硬切换在同一个位置会**跳**一下 —— 在 30Hz 的控制回路上，这一跳就是一次力矩冲击，真机上能听见响。',
      '**它也解释了摔倒恢复为什么顺**：恢复不是「切到 Pᶠ」这么生硬，而是 Pᶠ 的权重逐渐升起来、' +
        '模仿那几列逐渐让位。所以角色是「一边爬起来一边找回轨迹」，不是原地愣一下再重启。',
      '**Composer 本身很小**：`_build_mlp(..., units + [num_primitive])` 加一个 Softmax，' +
        '它要学的只是「此刻该听谁的」，不需要再学怎么动 —— primitive 已经冻结了。',
      '**这是简化模型**：真实的 primitive 输出是 69 维动作、状态是几百维观测，这里各压成一维。' +
        '只复现「连续混合 vs 跳变」这件事，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      function weightsAt(s) {
        var e = expertise(s).map(function (v) {
          return v * state.temp;
        });
        return softmax(e);
      }
      function blendAt(s) {
        var w = weightsAt(s);
        var a = 0;
        PRIMS.forEach(function (p, i) {
          a += w[i] * p.act(s);
        });
        return a;
      }
      function hardAt(s) {
        var e = expertise(s);
        var bi = 0;
        e.forEach(function (v, i) {
          if (v > e[bi]) bi = i;
        });
        return PRIMS[bi].act(s);
      }

      var w = weightsAt(state.s);
      var top = 0;
      w.forEach(function (v, i) {
        if (v > w[top]) top = i;
      });
      var blend = blendAt(state.s),
        hard = hardAt(state.s);

      sTop.set(PRIMS[top].name, 'accent');
      sW.set(fmt(w[top], 3), w[top] > 0.95 ? 'warn' : 'good');
      sBlend.set(fmt(blend, 3), 'good');
      sHard.set(fmt(hard, 3), Math.abs(hard - blend) > 0.2 ? 'bad' : 'good');

      if (state.temp > 20) {
        verdict.set(
          '⚡ 温度 ' +
            fmt(state.temp, 0) +
            '：权重几乎是 one-hot（最高的那个拿了 ' +
            fmt(w[top], 3) +
            '），Composer 已经退化成一个选择器。右图那条线在交界处出现了**台阶** —— ' +
            '这就是「只选一个专家」的代价：切换瞬间动作跳变。',
          'frozen'
        );
      } else if (w[top] < 0.75) {
        verdict.set(
          '🤝 此刻有好几列在同时出主意：权重 [' +
            w
              .map(function (v) {
                return fmt(v, 2);
              })
              .join(', ') +
            ']，混合输出 ' +
            fmt(blend, 2) +
            '，而硬切换会给 ' +
            fmt(hard, 2) +
            '。差的这一截就是过渡处的平滑量。',
          'learning'
        );
      } else {
        verdict.set(
          '✅ 现在主要是「' +
            PRIMS[top].name +
            '」在说话（权重 ' +
            fmt(w[top], 2) +
            '），但其他列没有被完全关掉。拖动状态滑块穿过交界处，看混合曲线是怎么平滑过去的。',
          'learning'
        );
      }

      // ── 左：权重随状态变化 ──
      var g = begin(wStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 22, b: 34 }, [-2.2, 2.2], [0, 1.05]);
      axes(g, p, {
        xTicks: [-2, -1, 0, 1, 2],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '状态 s'
      });
      text(g.ctx, 'Composer 输出的权重 C_i(s)', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var colors = [P.good, P.accent, P.warn];
      for (var k = 0; k < PRIMS.length; k++) {
        var pts = [];
        for (var i = 0; i <= 160; i++) {
          var s = -2.2 + (4.4 * i) / 160;
          pts.push([p.sx(s), p.sy(weightsAt(s)[k])]);
        }
        line(g.ctx, pts, colors[k], 2.2);
      }
      line(g.ctx, [[p.sx(state.s), p.y0], [p.sx(state.s), p.y1]], P.text, 1, [3, 3]);
      PRIMS.forEach(function (pr, i2) {
        dot(g.ctx, p.sx(state.s), p.sy(w[i2]), 4, colors[i2], P.surface2);
      });

      // ── 右：输出动作，连续 vs 跳变 ──
      var g2 = begin(aStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [-2.2, 2.2], [-2, 1.6]);
      axes(g2, p2, {
        xTicks: [-2, -1, 0, 1, 2],
        yTicks: [-2, -1, 0, 1],
        xLabel: '状态 s'
      });
      text(g2.ctx, '最终输出的动作', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      PRIMS.forEach(function (pr, i3) {
        var pts2 = [];
        for (var j = 0; j <= 160; j++) {
          var s2 = -2.2 + (4.4 * j) / 160;
          pts2.push([p2.sx(s2), p2.sy(clamp(pr.act(s2), -2, 1.6))]);
        }
        line(g2.ctx, pts2, colors[i3], 1, [3, 3]);
      });
      var hPts = [],
        bPts = [];
      for (var m = 0; m <= 320; m++) {
        var s3 = -2.2 + (4.4 * m) / 320;
        hPts.push([p2.sx(s3), p2.sy(clamp(hardAt(s3), -2, 1.6))]);
        bPts.push([p2.sx(s3), p2.sy(clamp(blendAt(s3), -2, 1.6))]);
      }
      line(g2.ctx, hPts, P2.bad, 1.6, [5, 4]);
      line(g2.ctx, bPts, P2.accent, 2.6);
      line(g2.ctx, [[p2.sx(state.s), p2.y0], [p2.sx(state.s), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(state.s), p2.sy(clamp(blend, -2, 1.6)), 4.5, P2.accent, P2.surface2);

      wStage.canvas.setAttribute('aria-label', 'Composer 权重随状态变化的曲线');
      aStage.canvas.setAttribute('aria-label', '混合输出与硬切换输出的对比曲线');
    });

    render();
  }

  // ─── demo 3: 摔倒恢复 ────────────────────────────────────────────────────
  /* 一条时间线：正常模仿 → 被扰动摔倒 → Pᶠ 接管把根节点拉回参考附近 →
     距离 < switchDist 就切回模仿。没有 Pᶠ 的那条线，摔倒即 episode 结束。 */
  function runRecovery(opts) {
    var rng = mulberry32(opts.seed);
    var mode = rng() < opts.fallInitProb ? 'RECOVER' : 'IMITATE';
    var dist = mode === 'RECOVER' ? 2 + 3 * rng() : 0.12;
    var frames = [],
      falls = 0,
      recovers = 0,
      deadAt = -1;
    for (var t = 0; t < opts.steps; t++) {
      if (mode === 'IMITATE') {
        dist = clamp(dist + 0.03 * (rng() - 0.5), 0.02, 0.6);
        if (rng() < opts.fallRate) {
          mode = 'RECOVER';
          dist = 2 + 3 * rng();
          falls++;
          if (deadAt < 0) deadAt = t; // 没有 Pᶠ 的话，episode 到这里就结束了
        }
      } else {
        dist = Math.max(0.05, dist - opts.recoverSpeed * (0.7 + 0.6 * rng()));
        if (dist < opts.switchDist) {
          mode = 'IMITATE';
          recovers++;
        }
      }
      frames.push({ t: t, dist: dist, mode: mode });
    }
    return { frames: frames, falls: falls, recovers: recovers, deadAt: deadAt < 0 ? opts.steps : deadAt };
  }

  function buildRecoveryDemo(host) {
    var root = card(host, {
      title: '摔倒恢复：把「摔了就 reset」换成「摔了再爬起来」',
      sub:
        'Pᶠ 只用简单移动数据训练，目标也被放松成「根节点先回到参考附近」。' +
        '根节点距参考 < 0.5 m 就自动切回正常模仿 —— 这个阈值是这个演示里最值得玩的旋钮。'
    });

    var state = { switchDist: 0.5, fallInitProb: 0.3, recoverSpeed: 0.12, fallRate: 0.012, seed: 31, steps: 400 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '切回模仿的阈值（m，论文 0.5）',
      min: 0.1,
      max: 2.5,
      step: 0.05,
      value: state.switchDist,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.switchDist = v;
        render();
      }
    });
    slider(ctrls, {
      label: 'fallInitProb（从摔倒状态开局的概率）',
      min: 0,
      max: 1,
      step: 0.05,
      value: state.fallInitProb,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.fallInitProb = v;
        render();
      }
    });
    slider(ctrls, {
      label: 'Pᶠ 的恢复速度',
      min: 0.02,
      max: 0.4,
      step: 0.01,
      value: state.recoverSpeed,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.recoverSpeed = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '换一条 episode', function () {
      state.seed = (state.seed * 1103515245 + 12345) % 99991;
      render();
    });
    button(btns, '论文设置（0.5 m / 0.3）', function () {
      state.switchDist = 0.5;
      state.fallInitProb = 0.3;
      render();
    });

    var setLegend = legend(root, [
      { key: 'good', text: 'IMITATE：正常跟踪参考' },
      { key: 'warn', text: 'RECOVER：Pᶠ 接管' },
      { key: 'bad', text: '没有 Pᶠ 时，episode 到此为止' }
    ]);

    var grid = stageGrid(root);
    var timeStage = stage(grid, 240);
    var barStage = stage(grid, 240);

    var stats = statsRow(root);
    var sFalls = stats.add('这条 episode 摔了几次');
    var sRec = stats.add('成功爬起来几次');
    var sRatio = stats.add('花在恢复上的时间');
    var sLife = stats.add('没有 Pᶠ 能跑多久');
    var verdict = verdictBox(root);

    note(root, [
      '**fail-state 库是「滚」出来的**：源码先把角色随机旋转、扔进物理引擎滚一段时间，' +
        '停下来的姿态才被存成摔倒状态库。这样得到的姿态是真实可达的，比手工摆姿势靠谱得多。',
      '**阈值太大会来回抖**：把切回阈值拖到 2 m 以上，角色离参考还很远就切回模仿模式，' +
        '结果是跟不上、再摔、再恢复。0.5 m 这个数看着随意，其实是在「早切回去省时间」和「切早了会再摔」之间取的。',
      '**这才是标题里 Perpetual 的意思**：在它之前，摔倒等于 episode 结束、等于要 reset。' +
        '有了 Pᶠ 和 Composer，同一个控制器可以一直跑下去 —— 对真机和实时 avatar 来说，这个区别是决定性的。',
      '**这是简化模型**：真实的恢复由 Pᶠ 在物理仿真里完成，距离曲线也不是这么光滑的。' +
        '这里只复现「模式切换 + 阈值取舍」这条逻辑，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var res = runRecovery({
        seed: state.seed,
        steps: state.steps,
        fallInitProb: state.fallInitProb,
        fallRate: state.fallRate,
        recoverSpeed: state.recoverSpeed,
        switchDist: state.switchDist
      });
      var recSteps = res.frames.filter(function (f) {
        return f.mode === 'RECOVER';
      }).length;

      sFalls.set(res.falls + ' 次', res.falls > 6 ? 'warn' : 'good');
      sRec.set(res.recovers + ' 次', res.recovers >= res.falls ? 'good' : 'warn');
      sRatio.set(fmt((recSteps / state.steps) * 100, 1) + '%', recSteps / state.steps > 0.4 ? 'bad' : 'good');
      sLife.set(res.deadAt + ' / ' + state.steps + ' 步', res.deadAt < state.steps * 0.5 ? 'bad' : 'warn');

      if (state.switchDist > 1.6) {
        verdict.set(
          '🔁 切回阈值 ' +
            fmt(state.switchDist, 2) +
            ' m 太大：角色离参考还很远就被塞回模仿模式，跟不上就再摔一次。' +
            '这条 episode 摔了 ' +
            res.falls +
            ' 次，' +
            fmt((recSteps / state.steps) * 100, 0) +
            '% 的时间都花在恢复上 —— 阈值不是越松越好。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ 这条 episode 摔了 ' +
            res.falls +
            ' 次，每次都爬了回来，全程 ' +
            state.steps +
            ' 步没有一次 reset。作为对照：没有 Pᶠ 的话，第 ' +
            res.deadAt +
            ' 步那次摔倒就已经结束了（右图那根短柱）。',
          'learning'
        );
      }

      // ── 左：距离时间线 + 模式带 ──
      var g = begin(timeStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 22, b: 44 }, [0, state.steps], [0, 5.4]);
      axes(g, p, {
        xTicks: K.niceTicks(0, state.steps, 4),
        yTicks: [0, 1, 2, 3, 4, 5],
        yFmt: function (t) {
          return fmt(t, 0) + 'm';
        },
        xLabel: '时间步'
      });
      text(g.ctx, '根节点到参考的距离', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      // 模式带
      res.frames.forEach(function (f) {
        g.ctx.fillStyle = f.mode === 'RECOVER' ? P.warn : P.good;
        g.ctx.globalAlpha = 0.35;
        g.ctx.fillRect(p.sx(f.t), p.y0 + 6, Math.max(1, (p.x1 - p.x0) / state.steps + 0.5), 8);
      });
      g.ctx.globalAlpha = 1;
      line(
        g.ctx,
        res.frames.map(function (f) {
          return [p.sx(f.t), p.sy(Math.min(5.4, f.dist))];
        }),
        P.accent,
        1.8
      );
      line(g.ctx, [[p.x0, p.sy(state.switchDist)], [p.x1, p.sy(state.switchDist)]], P.good, 1.4, [5, 4]);
      text(g.ctx, '切回阈值 ' + fmt(state.switchDist, 2) + ' m', p.x1 - 4, p.sy(state.switchDist) - 9, P.good, 'right', '10px monospace');
      line(g.ctx, [[p.sx(res.deadAt), p.y0], [p.sx(res.deadAt), p.y1]], P.bad, 1.6, [4, 3]);

      // ── 右：连续运行时长对比 ──
      var g2 = begin(barStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 48, r: 14, t: 24, b: 36 }, [0, 2], [0, state.steps * 1.12]);
      axes(g2, p2, {
        yTicks: K.niceTicks(0, state.steps * 1.12, 4),
        yFmt: function (t) {
          return fmt(t, 0);
        }
      });
      text(g2.ctx, '不 reset 能连续跑多少步', p2.x0, p2.y1 - 9, P2.muted, 'left', '11px sans-serif');
      var bars = [
        { label: '有 Pᶠ（PHC）', v: state.steps, color: P2.good, suffix: '+' },
        { label: '没有 Pᶠ', v: res.deadAt, color: P2.bad, suffix: '' }
      ];
      var slot = (p2.x1 - p2.x0) / 2;
      bars.forEach(function (b, i) {
        var cx = p2.x0 + slot * (i + 0.5);
        var bw = Math.min(70, slot * 0.5);
        g2.ctx.fillStyle = b.color;
        g2.ctx.fillRect(cx - bw / 2, p2.sy(b.v), bw, p2.y0 - p2.sy(b.v));
        barLabel(g2, p2, cx, p2.sy(b.v), fmt(b.v, 0) + b.suffix, b.color);
        text(g2.ctx, b.label, cx, p2.y0 + 14, P2.muted, 'center', '11px sans-serif');
      });

      timeStage.canvas.setAttribute('aria-label', '一条 episode 中根节点距参考的距离与模式切换');
      barStage.canvas.setAttribute('aria-label', '有无摔倒恢复策略时连续运行步数的对比');
    });

    render();
  }

  K.mount({
    'phc-pmcp': buildPmcpDemo,
    'phc-mcp': buildMcpDemo,
    'phc-recovery': buildRecoveryDemo
  });
})();
