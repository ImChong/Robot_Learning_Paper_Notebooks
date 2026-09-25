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
        '第 1 轮在全部 AMASS 上训 $P^1$，冻结，把还没学会的导出成 $Q_{hard}^2$；第 2 轮只打这些难例……' +
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
      { key: 'good', text: '$P^1$ 学会的（第 1 轮，全量数据）' },
      { key: 'accent', text: '$P^2$ / $P^3$ 学会的（只打难例）' },
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
    var sHard = stats.add('$Q_{hard}$ 还剩');
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
          '📗 第 1 轮：$P^1$ 在全部数据上拿下 ' +
            fmt(cov * 100, 1) +
            '%。剩下的 ' +
            sim.hard.length +
            ' 条就是论文说的 $Q_{hard}^2$ —— 注意**这一步之后 $P^1$ 就被冻结了**，' +
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
      { key: 'good', text: '$P^1$ 的权重' },
      { key: 'accent', text: '$P^2$ 的权重' },
      { key: 'warn', text: '$P^3$ 的权重' },
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
      '**它也解释了摔倒恢复为什么顺**：恢复不是「切到 $P^F$」这么生硬，而是 $P^F$ 的权重逐渐升起来、' +
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
        '$P^F$ 只用简单移动数据训练，目标也被放松成「根节点先回到参考附近」。' +
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
        '有了 $P^F$ 和 Composer，同一个控制器可以一直跑下去 —— 对真机和实时 avatar 来说，这个区别是决定性的。',
      '**这是简化模型**：真实的恢复由 $P^F$ 在物理仿真里完成，距离曲线也不是这么光滑的。' +
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
            ' 步没有一次 reset。作为对照：没有 $P^F$ 的话，第 ' +
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

  // ─── demo 4: the six-scene explainer animation ───────────────────────────
  /* A narrated storyboard of the whole method — 三堵墙 → PMCP 渐进扩容 →
     Composer 连续混合 → 摔倒恢复 → 噪声输入换成关键点 → 两阶段训练闭环.
     Six scenes rather than the five the other notes use: PHC opens on three
     walls, and the third one (noisy reference) needs its own scene or the
     opening promise goes unpaid. Every number on screen is
     either recomputed from the interactive demos above (the PMCP grid reuses
     buildLibrary/trainRound, the composer curves reuse PRIMS/expertise, the
     recovery episode reuses runRecovery with that demo's default sliders) or
     quoted from the note's own tables (reward weights, getup 概率、评估结果).

     The player (scene chips, clock, cue track, autoplay-on-scroll) is the
     shared K.explainer in kit.js; only the storyboard itself lives here. */

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

  /* ── scene 1: the three walls DeepMimic leaves standing ── */
  var WALL_X = [40, 285, 530],
    WALL_W = 230;

  function wallPanel(s, i, title, sub) {
    var x = WALL_X[i];
    s.appendChild(paint(svgEl('rect', { x: x, y: 60, width: WALL_W, height: 262, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    s.appendChild(paint(svgText(x + WALL_W / 2, 84, title, null, 13, 'middle'), C_BAD));
    s.appendChild(svgText(x + WALL_W / 2, 103, sub, 'demo-x-mut', 10.5, 'middle'));
    return x;
  }

  function lerpPose(a, b, u) {
    function mix(p, q) { return p + (q - p) * u; }
    return {
      lean: mix(a.lean, b.lean),
      armA: [mix(a.armA[0], b.armA[0]), mix(a.armA[1], b.armA[1])],
      armB: [mix(a.armB[0], b.armB[0]), mix(a.armB[1], b.armB[1])],
      legA: [mix(a.legA[0], b.legA[0]), mix(a.legA[1], b.legA[1])],
      legB: [mix(a.legB[0], b.legB[0]), mix(a.legB[1], b.legB[1])]
    };
  }

  var POSE_STAND = { lean: 4, armA: [-20, -14], armB: [20, 26], legA: [10, 6], legB: [-10, -6] };
  /* 摔倒不去逐关节摆姿势，而是把整个小人绕脚底转过去 —— 这样一眼就认得出是「倒了」，
     逐关节摆出来的躺姿在这个尺寸下只会糊成一团线。 */
  var POSE_SPRAWL = { lean: 4, armA: [-56, -44], armB: [62, 84], legA: [24, 16], legB: [-18, -34] };

  /* 面板三那具「参考骨架」：手画的关节点，方便让噪声单独抖起来。 */
  var KP = [
    [645, 168], [627, 174], [663, 174], [618, 198], [672, 198],
    [614, 222], [676, 222], [645, 212], [633, 242], [657, 242],
    [630, 268], [660, 268]
  ];
  var KP_BONES = [[0, 7], [0, 1], [0, 2], [1, 3], [3, 5], [2, 4], [4, 6], [7, 8], [8, 10], [7, 9], [9, 11]];

  function buildSceneWalls() {
    var s = sceneSvg('DeepMimic 之后剩下的三个问题：大规模学习会灾难性遗忘、摔倒只能 reset、参考动作带噪声');
    s.appendChild(svgText(400, 40, 'DeepMimic 解决了「学会一个动作」，但离「一直用」还隔着三堵墙', 'demo-x-ink2', 13.5, 'middle'));

    // ── 墙 1：灾难性遗忘 ──
    var x1 = wallPanel(s, 0, '① 大规模学习互相覆盖', '10000 段 AMASS，一个网络吃不下');
    var CW = 28, GAP = 6;
    var cx0 = x1 + (WALL_W - (6 * CW + 5 * GAP)) / 2;
    s.appendChild(svgText(x1 + 16, 142, '旧技能：走 / 站 / 伸手', 'demo-x-mut', 10));
    s.appendChild(svgText(x1 + 16, 207, '新技能：后空翻 / 体操', 'demo-x-mut', 10));
    var oldCells = [], newCells = [], i;
    for (i = 0; i < 6; i++) {
      oldCells.push(paint(svgEl('rect', { x: cx0 + i * (CW + GAP), y: 150, width: CW, height: 26, rx: 3 }), C_MUTED));
      newCells.push(paint(svgEl('rect', { x: cx0 + i * (CW + GAP), y: 215, width: CW, height: 26, rx: 3 }), C_MUTED));
      s.appendChild(oldCells[i]);
      s.appendChild(newCells[i]);
    }
    var cap1a = paint(svgText(x1 + WALL_W / 2, 292, '学会后空翻 → 走路又忘了', null, 11.5, 'middle'), C_BAD);
    var cap1b = svgText(x1 + WALL_W / 2, 310, '一个动作一个网络？10000 个怎么切', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(cap1a);
    s.appendChild(cap1b);

    // ── 墙 2：摔倒只能 reset ──
    wallPanel(s, 1, '② 摔倒只能 reset 重来', '偏离参考太多 → episode 直接结束');
    s.appendChild(paint(svgEl('line', { x1: 300, y1: 272, x2: 500, y2: 272, 'stroke-width': 1.5 }), null, C_BORDER));
    var man = stickFigure(C_ACCENT, 3);
    s.appendChild(man.el);
    var stamp = svgEl('g', {});
    stamp.appendChild(paint(svgEl('rect', { x: 352, y: 168, width: 96, height: 34, rx: 5, 'stroke-width': 2.4 }), 'none', C_BAD));
    stamp.appendChild(paint(svgText(400, 191, 'RESET', 'demo-x-mono', 18, 'middle'), C_BAD));
    stamp.setAttribute('transform', 'rotate(-9 400 185)');
    s.appendChild(stamp);
    var cap2a = paint(svgText(400, 292, 'VR avatar 不能「消失重置」', null, 11.5, 'middle'), C_BAD);
    var cap2b = svgText(400, 310, '靠 invisible hand 扶一把？那不真实', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(cap2a);
    s.appendChild(cap2b);

    // ── 墙 3：噪声输入 ──
    wallPanel(s, 2, '③ 参考动作本身有噪声', '来自视频姿态估计 / 文本生成');
    KP_BONES.forEach(function (b) {
      s.appendChild(paint(svgEl('line', {
        x1: KP[b[0]][0], y1: KP[b[0]][1], x2: KP[b[1]][0], y2: KP[b[1]][1],
        'stroke-width': 1.6, 'stroke-dasharray': '4 3'
      }), null, C_MUTED));
    });
    s.appendChild(paint(svgEl('circle', { cx: 645, cy: 150, r: 9, fill: 'none', 'stroke-width': 1.6, 'stroke-dasharray': '4 3' }), null, C_MUTED));
    var noisy = KP.map(function (p, k) {
      var node = paint(svgEl('circle', { cx: p[0], cy: p[1], r: 3.6 }), C_WARN);
      s.appendChild(node);
      return { node: node, p: p, ph: k * 1.7 };
    });
    var cap3a = paint(svgText(645, 292, 'rotation 输入对噪声很敏感', null, 11.5, 'middle'), C_BAD);
    var cap3b = svgRich(645, 310, 'PHC 额外提供 keypoint 版本 $s_{kp}$', { size: 10.5, cls: 'demo-x-mut', anchor: 'middle' });
    s.appendChild(cap3a);
    s.appendChild(cap3b);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 356, 'PHC 的答卷：PMCP 加容量 ＋ Pᶠ 自恢复 ＋ keypoint 输入', null, 17, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 380, '接下来四幕：第一堵墙要两幕（先长出列，再混合列），后两堵墙各一幕', 'demo-x-mut', 11.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      oldCells.forEach(function (c, k) {
        var learn = seg(t, 1.0 + k * 0.16, 1.4 + k * 0.16);
        var forget = seg(t, 3.6 + k * 0.16, 4.0 + k * 0.16);
        paint(c, forget > 0.5 ? C_BAD : learn > 0.5 ? C_GOOD : C_MUTED);
        c.style.opacity = forget > 0.5 ? 0.9 : learn > 0.5 ? 1 : 0.35;
      });
      newCells.forEach(function (c, k) {
        var learn = seg(t, 3.0 + k * 0.16, 3.4 + k * 0.16);
        paint(c, learn > 0.5 ? C_GOOD : C_MUTED);
        c.style.opacity = learn > 0.5 ? 1 : 0.35;
      });
      setOpacity(cap1a, seg(t, 4.8, 5.4));
      setOpacity(cap1b, seg(t, 5.2, 5.8));

      var fall = ease(seg(t, 6.0, 7.0));
      man.pose(400, 222, lerpPose(POSE_STAND, POSE_SPRAWL, fall));
      man.el.setAttribute('transform',
        'translate(' + (-62 * fall).toFixed(1) + ' ' + (-32 * fall).toFixed(1) + ') rotate(' + (78 * fall).toFixed(1) + ' 400 270)');
      setOpacity(stamp, seg(t, 7.2, 7.8));
      setOpacity(cap2a, seg(t, 7.9, 8.4));
      setOpacity(cap2b, seg(t, 8.3, 8.8));

      var on3 = seg(t, 9.0, 9.6);
      noisy.forEach(function (n) {
        var j = on3 * 4.5;
        n.node.setAttribute('cx', (n.p[0] + Math.sin(t * 5.1 + n.ph) * j).toFixed(1));
        n.node.setAttribute('cy', (n.p[1] + Math.cos(t * 6.3 + n.ph * 1.3) * j).toFixed(1));
        setOpacity(n.node, on3);
      });
      setOpacity(cap3a, seg(t, 10.2, 10.7));
      setOpacity(cap3b, seg(t, 10.6, 11.1));
      setOpacity(foot, seg(t, 11.8, 12.6));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 2: PMCP — 每轮新增一列，旧列冻死 ──
     网格与曲线都由上面 phc-pmcp 那套 buildLibrary / trainRound 现算，
     默认 focus = 0.6，所以画面上的数和那个实验台一模一样。 */
  var PM_COLS = 24, PM_CELL = 14, PM_GX = 44, PM_GY = 96;
  var PM_CX0 = 470, PM_CX1 = 765, PM_CY0 = 96, PM_CY1 = 236;
  var PM_FT = [0, 0.771, 0.642, 0.729]; // 单网络微调：训一轮忘一轮（seed 17, forget 0.35）

  function pmcpStory() {
    var clips = buildLibrary(17);
    var owner = new Array(LIB),
      hard = [],
      i;
    for (i = 0; i < LIB; i++) hard.push(i);
    var cov = [0],
      left = [LIB];
    for (var r = 0; r < 3; r++) {
      var res = trainRound(clips, hard, 0.6);
      /* eslint-disable-next-line no-loop-func */
      res.solved.forEach(function (k) { owner[k] = r; });
      hard = res.still;
      left.push(hard.length);
      cov.push((LIB - hard.length) / LIB);
    }
    return { owner: owner, cov: cov, left: left };
  }

  function pmX(round) {
    return PM_CX0 + (round / 3) * (PM_CX1 - PM_CX0);
  }

  function pmY(v) {
    return PM_CY1 - v * (PM_CY1 - PM_CY0);
  }

  function buildScenePmcp() {
    var story = pmcpStory();
    var s = sceneSvg('PMCP 渐进式训练：每轮在剩下的难例上新增一列 primitive 并冻结旧列，覆盖率一路涨到 98.3%，而单网络微调会被新数据洗回 72.9%');
    s.appendChild(svgText(400, 40, '每一轮不是「再训一遍」，是「新开一列，旧列冻死」', 'demo-x-ink2', 13.5, 'middle'));

    // ── 左：动作库网格 ──
    s.appendChild(svgText(PM_GX, 84, '动作库 240 格（代表 AMASS 的一万多条，按难度排序）', 'demo-x-mut', 10.5));
    var cells = [];
    for (var i = 0; i < LIB; i++) {
      var r = Math.floor(i / PM_COLS),
        c = i % PM_COLS;
      var rect = paint(svgEl('rect', {
        x: PM_GX + c * PM_CELL + 1, y: PM_GY + r * PM_CELL + 1,
        width: PM_CELL - 2, height: PM_CELL - 2, rx: 2
      }), C_BAD);
      s.appendChild(rect);
      cells.push({ node: rect, own: story.owner[i] });
    }
    s.appendChild(svgText(PM_GX, 252, '← 容易', 'demo-x-mut', 10));
    s.appendChild(svgText(PM_GX + PM_COLS * PM_CELL, 252, '难 →', 'demo-x-mut', 10, 'end'));

    // ── 右：覆盖率曲线 ──
    [0, 0.5, 1].forEach(function (v) {
      var ln = paint(svgEl('line', { x1: PM_CX0, y1: pmY(v), x2: PM_CX1, y2: pmY(v), 'stroke-width': 1 }), null, C_BORDER);
      if (v) ln.setAttribute('stroke-dasharray', '3 4');
      s.appendChild(ln);
      s.appendChild(svgText(PM_CX0 - 8, pmY(v) + 4, (v * 100).toFixed(0) + '%', 'demo-x-mono demo-x-mut', 10, 'end'));
    });
    s.appendChild(svgText(PM_CX0, 84, '动作库覆盖率', 'demo-x-mut', 10.5));
    [0, 1, 2, 3].forEach(function (k) {
      s.appendChild(k
        ? svgMath(pmX(k), 252, 'P^' + k, { size: 10, anchor: 'middle', cls: 'demo-x-mut', w: 60 })
        : svgText(pmX(k), 252, '起点', 'demo-x-mono demo-x-mut', 10, 'middle'));
    });

    var pmcpPts = story.cov.map(function (v, k) { return [pmX(k), pmY(v)]; });
    var ftPts = PM_FT.map(function (v, k) { return [pmX(k), pmY(v)]; });
    var pmcpLine = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 2.6 }), null, C_GOOD);
    var ftLine = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 2.6, 'stroke-dasharray': '6 4' }), null, C_BAD);
    s.appendChild(pmcpLine);
    s.appendChild(ftLine);
    var pmcpTag = paint(svgText(PM_CX1 - 6, pmY(0.30), 'PHC：冻结 + 加列', null, 10.5, 'end'), C_GOOD);
    var ftTag = paint(svgText(PM_CX1 - 6, pmY(0.16), '单网络微调：被洗掉', null, 10.5, 'end'), C_BAD);
    s.appendChild(pmcpTag);
    s.appendChild(ftTag);

    // ── 下：四张轮次卡 ──
    var CARDS = [
      { tTex: '\\text{第 1 轮 } \\cdot\\ P^1', a: '训练集：全部 240 条', b: '覆盖 77.1% → 冻结', c: C_GOOD, at: 2.0 },
      { tTex: '\\text{第 2 轮 } \\cdot\\ P^2', aTex: '\\text{只训 } Q_{hard}^2 = 55 \\text{ 条}', b: '覆盖 95.0% → 冻结', c: C_ACCENT, at: 5.0 },
      { tTex: '\\text{第 3 轮 } \\cdot\\ P^3', aTex: '\\text{只训 } Q_{hard}^3 = 12 \\text{ 条}', b: '覆盖 98.3% → 冻结', c: C_ACCENT, at: 7.8 },
      { tTex: '\\text{第 F 轮 } \\cdot\\ P^F', aTex: '\\text{不打难例：用 } Q_{loco} \\text{ 训恢复}', b: '不在这条曲线上（见第 4 幕）', c: C_WARN, at: 13.0 }
    ];
    var cards = CARDS.map(function (cd, k) {
      var x = 26 + k * 190;
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: x, y: 268, width: 176, height: 62, rx: 7, 'stroke-width': 1.5 }), C_SURFACE, cd.c));
      g.appendChild(cd.tTex
        ? svgMath(x + 10, 288, cd.tTex, { size: 12, w: 156 }).setTone(cd.c)
        : paint(svgText(x + 10, 288, cd.t, 'demo-x-mono', 12), cd.c));
      g.appendChild(cd.aTex
        ? svgMath(x + 10, 305, cd.aTex, { size: 10, cls: 'demo-x-mut', w: 156 })
        : svgText(x + 10, 305, cd.a, 'demo-x-mut', 10));
      g.appendChild(svgText(x + 10, 321, cd.b, 'demo-x-mut', 10));
      s.appendChild(g);
      return { g: g, at: cd.at };
    });

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 360, '第 3 轮：PHC 98.3%，单网络微调 72.9% —— 差的 25.4 个百分点全是被洗掉的旧技能', null, 14, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 382, '课程学习换的是「样本顺序」，PMCP 换的是「容量」：旧列 freeze_pnn 冻死，怎么练都洗不掉', 'demo-x-mut', 11.5, 'middle'));
    s.appendChild(foot);

    var TONES = [C_GOOD, C_ACCENT, C_ACCENT];
    var REVEAL = [[1.6, 3.4], [4.6, 6.0], [7.4, 8.6]];

    function draw(t) {
      cells.forEach(function (c, i) {
        if (c.own == null) {
          paint(c.node, C_BAD);
          setOpacity(c.node, 0.8);
          return;
        }
        var w = REVEAL[c.own];
        var u = seg(t, w[0] + (i / LIB) * (w[1] - w[0]) * 0.9, w[0] + (i / LIB) * (w[1] - w[0]) * 0.9 + 0.35);
        paint(c.node, u > 0.5 ? TONES[c.own] : C_BAD);
        setOpacity(c.node, u > 0.5 ? 1 : 0.8);
      });

      var shown = 1;
      [3.4, 6.2, 8.8].forEach(function (a) { if (t >= a) shown++; });
      pmcpLine.setAttribute('d', polyPath(pmcpPts.slice(0, shown)));
      setOpacity(pmcpTag, seg(t, 3.6, 4.2));

      var ftShown = t < 10.0 ? 0 : Math.min(4, 1 + Math.floor(seg(t, 10.0, 12.4) * 3.999));
      ftLine.setAttribute('d', ftShown > 1 ? polyPath(ftPts.slice(0, ftShown)) : '');
      setOpacity(ftTag, seg(t, 12.2, 12.8));

      cards.forEach(function (cd) { setOpacity(cd.g, Math.max(0.25, seg(t, cd.at, cd.at + 0.5))); });
      setOpacity(foot, seg(t, 14.6, 15.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 3: Composer — 连续混合 vs 硬切换 ──
     曲线用的就是 phc-mcp 那套 PRIMS / expertise / softmax，温度 1。 */
  var MC = { x0: 72, x1: 540, wy0: 78, wy1: 188, ay0: 228, ay1: 338, sLo: -2.2, sHi: 2.2, aLo: -1.4, aHi: 1.35 };

  function mcX(sv) {
    return MC.x0 + ((sv - MC.sLo) / (MC.sHi - MC.sLo)) * (MC.x1 - MC.x0);
  }

  function mcWy(w) {
    return MC.wy1 - w * (MC.wy1 - MC.wy0);
  }

  function mcAy(a) {
    return MC.ay1 - ((a - MC.aLo) / (MC.aHi - MC.aLo)) * (MC.ay1 - MC.ay0);
  }

  function mcWeights(sv) {
    return softmax(expertise(sv));
  }

  function mcBlend(sv) {
    var w = mcWeights(sv),
      a = 0;
    PRIMS.forEach(function (p, i) { a += w[i] * p.act(sv); });
    return a;
  }

  function mcHard(sv) {
    var e = expertise(sv),
      bi = 0;
    e.forEach(function (v, i) { if (v > e[bi]) bi = i; });
    return PRIMS[bi].act(sv);
  }

  function buildSceneMcp() {
    var s = sceneSvg('Composer 的连续混合：三个 primitive 的 softmax 权重平滑交接，混合输出是连续的；换成 argmax 硬切换，输出会在交界处一步跳 1.07');
    s.appendChild(svgText(400, 40, 'Composer：不是「此刻听谁的」，是「几个专家一起出主意」', 'demo-x-ink2', 13.5, 'middle'));

    // 坐标轴
    [MC.wy1, MC.ay1].forEach(function (y) {
      s.appendChild(paint(svgEl('line', { x1: MC.x0, y1: y, x2: MC.x1, y2: y, 'stroke-width': 1 }), null, C_BORDER));
    });
    s.appendChild(svgMath(MC.x0, 62, '\\text{Composer 权重 } C_i(s) \\text{（softmax，温度 1）}', { size: 10.5, cls: 'demo-x-mut', w: 300 }));
    s.appendChild(svgText(MC.x0, 220, '最终动作 a（这里压成一维）', 'demo-x-mut', 10.5));
    s.appendChild(svgText(MC.x1, 204, '状态 s：动作激烈程度 →', 'demo-x-mut', 10, 'end'));

    var WC = [C_GOOD, C_ACCENT, C_WARN];
    var grid = [];
    for (var sv = MC.sLo; sv <= MC.sHi + 1e-9; sv += 0.04) grid.push(sv);

    var LEG_X = [76, 196, 300];
    WC.forEach(function (col, i) {
      var pts = grid.map(function (v) { return [mcX(v), mcWy(mcWeights(v)[i])]; });
      s.appendChild(paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': 2 }), null, col));
      /* 名字放在坐标轴下方的图例行里：曲线本身在图上到处跑，压在上面会互相盖 */
      s.appendChild(paint(svgEl('rect', { x: LEG_X[i], y: 198, width: 9, height: 9, rx: 2 }), col));
      s.appendChild(paint(svgText(LEG_X[i] + 14, 206, PRIMS[i].name, null, 10), col));
    });

    var blendPts = grid.map(function (v) { return [mcX(v), mcAy(mcBlend(v))]; });
    var blendLine = paint(svgEl('path', { d: polyPath(blendPts), fill: 'none', 'stroke-width': 2.6 }), null, C_ACCENT);
    s.appendChild(blendLine);
    s.appendChild(svgMath(MC.x0 + 8, MC.ay1 + 15, '\\text{连续混合 } \\sum_i w_i a_i', { size: 10.5, w: 160 }).setTone(C_ACCENT));

    var hardPts = grid.map(function (v) { return [mcX(v), mcAy(mcHard(v))]; });
    var hardLine = paint(svgEl('path', { d: polyPath(hardPts), fill: 'none', 'stroke-width': 2.2, 'stroke-dasharray': '6 4' }), null, C_BAD);
    s.appendChild(hardLine);
    var hardTag = paint(svgText(MC.x1, mcAy(mcHard(2.1)) - 10, '硬切换 argmax', null, 10.5, 'end'), C_BAD);
    s.appendChild(hardTag);

    // 扫描线 + 读数
    var scan = paint(svgEl('line', { x1: 0, y1: MC.wy0 - 4, x2: 0, y2: MC.ay1 + 4, 'stroke-width': 1.4, 'stroke-dasharray': '4 4' }), null, C_MUTED);
    s.appendChild(scan);
    var wDots = WC.map(function (col) {
      var d = paint(svgEl('circle', { cx: 0, cy: 0, r: 4 }), col);
      s.appendChild(d);
      return d;
    });
    var blendDot = paint(svgEl('circle', { cx: 0, cy: 0, r: 4.5 }), C_ACCENT);
    var hardDot = paint(svgEl('circle', { cx: 0, cy: 0, r: 4.5 }), C_BAD);
    s.appendChild(blendDot);
    s.appendChild(hardDot);

    var box = svgEl('g', {});
    box.appendChild(paint(svgEl('rect', { x: 556, y: 74, width: 222, height: 132, rx: 7, 'stroke-width': 1.5 }), C_SURFACE, C_BORDER));
    var rd = [
      svgText(570, 98, '', 'demo-x-mono', 12),
      svgText(570, 122, '', 'demo-x-mono', 11.5),
      svgText(570, 146, '', 'demo-x-mono', 11.5),
      svgText(570, 170, '', 'demo-x-mono', 11.5),
      svgText(570, 194, '', 'demo-x-mono', 11.5)
    ];
    rd.forEach(function (n) { box.appendChild(n); });
    s.appendChild(box);

    var code = svgEl('g', {});
    code.appendChild(paint(svgEl('rect', { x: 556, y: 228, width: 222, height: 92, rx: 7, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), C_SURFACE2, C_ACCENT));
    code.appendChild(svgText(568, 250, 'humanoid_im_mcp.py 就两行：', 'demo-x-mut', 10));
    code.appendChild(paint(svgText(568, 272, 'x_all = stack(actions, 1)', 'demo-x-mono', 10.5), C_ACCENT));
    code.appendChild(paint(svgText(568, 290, 'a = sum(w[:,:,None]*x_all, 1)', 'demo-x-mono', 10.5), C_ACCENT));
    code.appendChild(svgText(568, 310, 'primitive 已冻结，C 只学「听谁的」', 'demo-x-mut', 10));
    s.appendChild(code);

    // 交界处的跳变标注
    var jumpG = svgEl('g', {});
    var jx = mcX(-0.65);
    jumpG.appendChild(paint(svgEl('line', { x1: jx, y1: mcAy(-0.027), x2: jx, y2: mcAy(1.038), 'stroke-width': 3 }), null, C_BAD));
    jumpG.appendChild(paint(svgEl('circle', { cx: jx, cy: mcAy(-0.027), r: 4 }), C_BAD));
    jumpG.appendChild(paint(svgEl('circle', { cx: jx, cy: mcAy(1.038), r: 4 }), C_BAD));
    jumpG.appendChild(paint(svgText(jx + 10, mcAy(1.038) - 8, '−0.03 → 1.04：一步跳 1.07', 'demo-x-mono', 11), C_BAD));
    s.appendChild(jumpG);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 366, '连续混合让「过渡」变成免费的副产品', null, 16, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 390, '同一个位置，硬切换那一跳在 30 Hz 的控制回路上就是一次力矩冲击；恢复也一样是 Pᶠ 权重慢慢升起来', 'demo-x-mut', 11, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      var u = seg(t, 1.6, 9.0);
      var sv = MC.sLo + (MC.sHi - MC.sLo) * u;
      var on = seg(t, 1.2, 1.8);
      var w = mcWeights(sv);
      scan.setAttribute('x1', mcX(sv).toFixed(1));
      scan.setAttribute('x2', mcX(sv).toFixed(1));
      setOpacity(scan, on);
      wDots.forEach(function (d, i) {
        d.setAttribute('cx', mcX(sv).toFixed(1));
        d.setAttribute('cy', mcWy(w[i]).toFixed(1));
        setOpacity(d, on);
      });
      blendDot.setAttribute('cx', mcX(sv).toFixed(1));
      blendDot.setAttribute('cy', mcAy(mcBlend(sv)).toFixed(1));
      setOpacity(blendDot, on);
      var hardOn = seg(t, 9.6, 10.2);
      hardDot.setAttribute('cx', mcX(sv).toFixed(1));
      hardDot.setAttribute('cy', mcAy(mcHard(sv)).toFixed(1));
      setOpacity(hardDot, on * hardOn);

      setOpacity(box, on);
      rd[0].textContent = 's = ' + sv.toFixed(2);
      rd[1].textContent = 'w(P¹) = ' + w[0].toFixed(3);
      rd[2].textContent = 'w(P²) = ' + w[1].toFixed(3);
      rd[3].textContent = 'w(P³) = ' + w[2].toFixed(3);
      rd[4].textContent = '混合 a = ' + mcBlend(sv).toFixed(3);

      setOpacity(hardLine, Math.max(0.15, hardOn));
      setOpacity(hardTag, hardOn);
      setOpacity(jumpG, seg(t, 10.6, 11.4));
      setOpacity(code, Math.max(0.2, seg(t, 6.4, 7.0)));
      setOpacity(foot, seg(t, 12.6, 13.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 4: 摔倒恢复 —— FAIL 从终态变中间态 ──
     这条 episode 就是 phc-recovery 的默认设置（seed 31、阈值 0.5 m、
     fallInitProb 0.3、恢复速度 0.12），所以两处画的是同一条轨迹。 */
  var RC = { x0: 70, x1: 700, y0: 78, y1: 250, dHi: 5, steps: 400 };
  var RC_OPTS = { switchDist: 0.5, fallInitProb: 0.3, recoverSpeed: 0.12, fallRate: 0.012, seed: 31, steps: 400 };

  function rcX(step) {
    return RC.x0 + (step / RC.steps) * (RC.x1 - RC.x0);
  }

  function rcY(d) {
    return RC.y1 - (Math.min(d, RC.dHi) / RC.dHi) * (RC.y1 - RC.y0);
  }

  function buildSceneRecovery() {
    var ep = runRecovery(RC_OPTS);
    var s = sceneSvg('一条 400 步的 episode：摔倒 6 次、Pᶠ 每次都把根节点拉回 0.5 m 以内并切回模仿；没有 Pᶠ 的话，这条 episode 在第 21 步就结束了');
    s.appendChild(svgText(400, 40, '同一条 episode：有 Pᶠ 能跑满 400 步，没有 Pᶠ 活到第 21 步', 'demo-x-ink2', 13.5, 'middle'));

    // 坐标轴与阈值线
    s.appendChild(paint(svgEl('line', { x1: RC.x0, y1: RC.y1, x2: RC.x1, y2: RC.y1, 'stroke-width': 1 }), null, C_BORDER));
    s.appendChild(paint(svgEl('line', { x1: RC.x0, y1: rcY(0.5), x2: RC.x1, y2: rcY(0.5), 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }), null, C_GOOD));
    s.appendChild(paint(svgText(RC.x0 + 6, rcY(0.5) - 6, '切回模仿的阈值 0.5 m（也是 RET 的终止阈值）', null, 10.5), C_GOOD));
    s.appendChild(svgText(RC.x0 - 8, RC.y0 + 6, '5 m', 'demo-x-mono demo-x-mut', 10, 'end'));
    s.appendChild(svgText(RC.x0 - 8, RC.y1 + 4, '0', 'demo-x-mono demo-x-mut', 10, 'end'));
    s.appendChild(svgText(RC.x0, 70, '根节点距参考的距离', 'demo-x-mut', 10.5));
    s.appendChild(svgText(RC.x1, 70, '400 步 ≈ 13 秒（控制频率 30 Hz）', 'demo-x-mut', 10.5, 'end'));

    var pts = ep.frames.map(function (f) { return [rcX(f.t), rcY(f.dist)]; });
    var curve = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 2 }), null, C_ACCENT);
    s.appendChild(curve);
    var head = paint(svgEl('circle', { cx: rcX(0), cy: rcY(ep.frames[0].dist), r: 4.5 }), C_ACCENT);
    s.appendChild(head);

    // 模式带
    var segs = [], cur = ep.frames[0].mode, st = 0;
    ep.frames.forEach(function (f, i) {
      if (f.mode !== cur) { segs.push({ m: cur, a: st, b: i - 1 }); cur = f.mode; st = i; }
    });
    segs.push({ m: cur, a: st, b: RC.steps - 1 });
    s.appendChild(paint(svgEl('rect', { x: RC.x0, y: 262, width: RC.x1 - RC.x0, height: 18, rx: 3, opacity: 0.18 }), C_MUTED));
    var bands = segs.map(function (sg) {
      var rect = paint(svgEl('rect', {
        x: rcX(sg.a), y: 262, width: Math.max(1, rcX(sg.b + 1) - rcX(sg.a)), height: 18, rx: 2
      }), sg.m === 'IMITATE' ? C_GOOD : C_WARN);
      s.appendChild(rect);
      return { node: rect, at: sg.a };
    });
    s.appendChild(svgText(RC.x0 - 8, 275, '模式', 'demo-x-mut', 10, 'end'));
    s.appendChild(paint(svgText(RC.x0 + 6, 294, '绿 = IMITATE（追全身参考）', null, 10), C_GOOD));
    s.appendChild(svgMath(RC.x0 + 200, 294, '\\text{橙 = RECOVER（} P^F \\text{ 接管，只追根节点 } r_{point} \\text{）}', { size: 10, w: 300 }).setTone(C_WARN));

    // 没有 Pᶠ 的话活多久
    var dead = svgEl('g', {});
    dead.appendChild(paint(svgEl('line', { x1: rcX(ep.deadAt), y1: RC.y0 - 4, x2: rcX(ep.deadAt), y2: 280, 'stroke-width': 1.6, 'stroke-dasharray': '4 3' }), null, C_BAD));
    dead.appendChild(paint(svgText(rcX(ep.deadAt) + 8, RC.y0 + 6, '第 ' + ep.deadAt + ' 步第一次摔倒 —— 没有 Pᶠ，episode 到此为止', null, 11), C_BAD));
    s.appendChild(dead);

    var barG = svgEl('g', {});
    [{ x: 716, h: 172, c: C_GOOD, t: '400 步', l: '有 Pᶠ' },
      { x: 752, h: 172 * ep.deadAt / RC.steps, c: C_BAD, t: ep.deadAt + ' 步', l: '没有' }
    ].forEach(function (b) {
      barG.appendChild(paint(svgEl('rect', { x: b.x, y: RC.y1 - b.h, width: 24, height: b.h, rx: 2 }), b.c));
      barG.appendChild(paint(svgText(b.x + 12, RC.y1 - b.h - 6, b.t, 'demo-x-mono', 10, 'middle'), b.c));
      barG.appendChild(svgText(b.x + 12, RC.y1 + 14, b.l, 'demo-x-mut', 10, 'middle'));
    });
    s.appendChild(barG);

    // 状态机
    var smArrow = K.arrowMarker(s, 'phc-x-sm', C_MUTED);
    var SM = [
      { x: 130, t: 'IMITATE', sub: '追全身参考姿态', c: C_GOOD, w: 200 },
      { x: 400, t: 'RECOVER', sub: 'Pᶠ 主导，只追根节点', c: C_WARN, w: 210 },
      { x: 662, t: 'recovery 窗口 90 步', sub: 'reset_buf = 0，不许 reset', c: C_BAD, w: 216 }
    ].map(function (n, i) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: n.x - n.w / 2, y: 312, width: n.w, height: 44, rx: 8, 'stroke-width': 1.5 }), C_SURFACE, n.c));
      g.appendChild(paint(svgText(n.x, 331, n.t, 'demo-x-mono', 12, 'middle'), n.c));
      g.appendChild(svgText(n.x, 348, n.sub, 'demo-x-mut', 10, 'middle'));
      s.appendChild(g);
      return { g: g, at: 12.0 + i * 0.5 };
    });
    var smEdges = [[[230, 334], [294, 334]], [[506, 334], [553, 334]]].map(function (e) {
      var p = paint(svgEl('path', { d: polyPath(e), fill: 'none', 'stroke-width': 1.8, 'marker-end': smArrow }), null, C_MUTED);
      s.appendChild(p);
      return p;
    });
    var backArrow = K.arrowMarker(s, 'phc-x-back', C_GOOD);
    var back = svgEl('g', {});
    back.appendChild(paint(svgEl('path', {
      d: polyPath([[662, 356], [662, 374], [130, 374], [130, 356]]),
      fill: 'none', 'stroke-width': 1.8, 'marker-end': backArrow
    }), null, C_GOOD));
    back.appendChild(paint(svgText(396, 370, '根节点距参考 < 0.5 m → 切回模仿', null, 11, 'middle'), C_GOOD));
    s.appendChild(back);

    var foot = paint(svgText(400, 400, 'DeepMimic 的 FAIL 是终态，PHC 把它变成中间态 —— 这才是标题里 Perpetual 的机制来源', null, 13, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      var u = ease(seg(t, 1.2, 10.5));
      var n = Math.max(2, Math.round(u * RC.steps));
      curve.setAttribute('d', polyPath(pts.slice(0, n)));
      head.setAttribute('cx', pts[n - 1][0].toFixed(1));
      head.setAttribute('cy', pts[n - 1][1].toFixed(1));
      paint(head, ep.frames[n - 1].mode === 'IMITATE' ? C_GOOD : C_WARN);
      setOpacity(head, seg(t, 1.2, 1.6) * (1 - seg(t, 10.5, 11.0)));
      bands.forEach(function (b) { setOpacity(b.node, b.at < n ? 1 : 0); });
      setOpacity(dead, seg(t, 3.2, 3.8));
      setOpacity(barG, seg(t, 10.6, 11.2));
      SM.forEach(function (m) { setOpacity(m.g, Math.max(0.2, seg(t, m.at, m.at + 0.5))); });
      smEdges.forEach(function (e, i) { setOpacity(e, Math.max(0.2, seg(t, 12.4 + i * 0.5, 12.8 + i * 0.5))); });
      setOpacity(back, seg(t, 13.4, 14.0));
      setOpacity(foot, seg(t, 14.4, 15.0));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 5: 第三堵墙 —— 噪声输入与 keypoint 版目标 ──
     这一幕的小人腿是几何示意：腿长按 0.85 m 折算成 116 px，所以髋 5° + 膝 5°
     算出来的脚尖偏移（≈ 11 cm）与画面上的像素偏移是同一件事，不是论文数据。 */
  var NZ_HIP = [360, 124], NZ_SEG = 58, NZ_DEG = 5;

  function nzChain(deg1, deg2) {
    var r1 = (deg1 * Math.PI) / 180, r2 = (deg2 * Math.PI) / 180;
    var knee = [NZ_HIP[0] + NZ_SEG * Math.sin(r1), NZ_HIP[1] + NZ_SEG * Math.cos(r1)];
    return [NZ_HIP, knee, [knee[0] + NZ_SEG * Math.sin(r2), knee[1] + NZ_SEG * Math.cos(r2)]];
  }

  var NZ_KP = [[640, 124], [640, 182], [640, 240]];

  function buildSceneNoise() {
    var s = sceneSvg('第三堵墙：参考姿态来自视频估计或 VR，每帧都在抖；旋转版目标会把髋、膝各 5 度的误差累积成脚尖 11 厘米的偏移，关键点版目标则让噪声留在原地，代价只是成功率 98.9% 掉到 98.7%');
    s.appendChild(svgText(400, 40, '第三堵墙不用新模块：换一种「目标差异」的写法就够了', 'demo-x-ink2', 13.5, 'middle'));

    // ── 左：参考从哪来 ──
    s.appendChild(paint(svgEl('rect', { x: 40, y: 62, width: 210, height: 234, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    s.appendChild(paint(svgText(145, 86, '参考从哪来', null, 13, 'middle'), C_BAD));
    s.appendChild(svgText(145, 104, '不是干净的 MoCap', 'demo-x-mut', 10.5, 'middle'));
    var srcArrow = K.arrowMarker(s, 'phc-x-src', C_MUTED);
    var src = svgEl('g', {});
    [[114, '摄像头视频 / VR 手柄'], [158, 'HybrIK / MeTRAbs 估计']].forEach(function (b) {
      src.appendChild(paint(svgEl('rect', { x: 62, y: b[0], width: 166, height: 28, rx: 6, 'stroke-width': 1.2 }), C_SURFACE, C_BORDER));
      src.appendChild(svgText(145, b[0] + 18, b[1], 'demo-x-ink2', 10.5, 'middle'));
    });
    [[142, 158], [186, 202]].forEach(function (a) {
      src.appendChild(paint(svgEl('path', { d: polyPath([[145, a[0]], [145, a[1]]]), fill: 'none', 'stroke-width': 1.6, 'marker-end': srcArrow }), null, C_MUTED));
    });
    s.appendChild(src);

    /* 第一幕那具骨架原样缩到这儿，抖的还是同一组关节点。 */
    var skel = svgEl('g', { transform: 'translate(-222.7 123.6) scale(0.57)' });
    KP_BONES.forEach(function (b) {
      skel.appendChild(paint(svgEl('line', {
        x1: KP[b[0]][0], y1: KP[b[0]][1], x2: KP[b[1]][0], y2: KP[b[1]][1],
        'stroke-width': 2.4, 'stroke-dasharray': '6 5'
      }), null, C_MUTED));
    });
    skel.appendChild(paint(svgEl('circle', { cx: 645, cy: 150, r: 9, fill: 'none', 'stroke-width': 2.4, 'stroke-dasharray': '6 5' }), null, C_MUTED));
    var dots = KP.map(function (p, k) {
      var node = paint(svgEl('circle', { cx: p[0], cy: p[1], r: 5 }), C_WARN);
      skel.appendChild(node);
      return { node: node, p: p, ph: k * 1.7 };
    });
    s.appendChild(skel);
    var srcCap = paint(svgText(145, 288, '每一帧都在抖', null, 11, 'middle'), C_BAD);
    s.appendChild(srcCap);

    // ── 中：旋转版目标 ──
    var rotG = svgEl('g', {});
    rotG.appendChild(paint(svgEl('rect', { x: 266, y: 62, width: 246, height: 234, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    rotG.appendChild(svgMath(389, 86, '\\text{旋转版目标 } s_{rot}', { size: 13, anchor: 'middle', cls: 'demo-x-bad', w: 230 }));
    rotG.appendChild(svgText(389, 104, '关节旋转差 ＋ 位置 / 速度差', 'demo-x-mut', 10.5, 'middle'));
    var trueChain = nzChain(0, 0);
    [[trueChain[0], trueChain[1]], [trueChain[1], trueChain[2]]].forEach(function (b) {
      rotG.appendChild(paint(svgEl('line', {
        x1: b[0][0], y1: b[0][1], x2: b[1][0], y2: b[1][1], 'stroke-width': 3, 'stroke-linecap': 'round'
      }), null, C_MUTED));
    });
    trueChain.forEach(function (p) {
      rotG.appendChild(paint(svgEl('circle', { cx: p[0], cy: p[1], r: 4 }), C_MUTED));
    });
    s.appendChild(rotG);

    var noisyChain = nzChain(NZ_DEG, 2 * NZ_DEG);
    var noisyG = svgEl('g', {});
    var bones = [[0, 1], [1, 2]].map(function (b) {
      var ln = paint(svgEl('line', { 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': '5 4' }), null, C_BAD);
      noisyG.appendChild(ln);
      return { ln: ln, b: b };
    });
    var joints = [0, 1, 2].map(function (i) {
      var c = paint(svgEl('circle', { r: 4 }), C_BAD);
      noisyG.appendChild(c);
      return c;
    });
    noisyG.appendChild(paint(svgText(376, 146, '髋 5°', 'demo-x-mono', 10.5), C_BAD));
    noisyG.appendChild(paint(svgText(382, 200, '膝 +5°', 'demo-x-mono', 10.5), C_BAD));
    s.appendChild(noisyG);

    var drift = svgEl('g', {});
    drift.appendChild(paint(svgEl('line', {
      x1: trueChain[2][0], y1: trueChain[2][1] + 12, x2: noisyChain[2][0], y2: trueChain[2][1] + 12, 'stroke-width': 1.6
    }), null, C_BAD));
    [trueChain[2][0], noisyChain[2][0]].forEach(function (x) {
      drift.appendChild(paint(svgEl('line', {
        x1: x, y1: trueChain[2][1] + 6, x2: x, y2: trueChain[2][1] + 18, 'stroke-width': 1.6
      }), null, C_BAD));
    });
    drift.appendChild(paint(svgText(389, 272, '脚尖偏 ≈ 11 cm', 'demo-x-mono', 11.5, 'middle'), C_BAD));
    s.appendChild(drift);
    var rotCap = paint(svgText(389, 290, '误差 × 肢体长度，一路累积到末端', null, 10.5, 'middle'), C_BAD);
    s.appendChild(rotCap);

    // ── 右：关键点版目标 ──
    var kpG = svgEl('g', {});
    kpG.appendChild(paint(svgEl('rect', { x: 528, y: 62, width: 232, height: 234, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    kpG.appendChild(svgMath(644, 86, '\\text{关键点版目标 } s_{kp}', { size: 13, anchor: 'middle', cls: 'demo-x-good', w: 230 }));
    kpG.appendChild(svgText(644, 104, '只要 3D 关键点位置差 ＋ 速度差', 'demo-x-mut', 10.5, 'middle'));
    [[0, 1], [1, 2]].forEach(function (b) {
      kpG.appendChild(paint(svgEl('line', {
        x1: NZ_KP[b[0]][0], y1: NZ_KP[b[0]][1], x2: NZ_KP[b[1]][0], y2: NZ_KP[b[1]][1],
        'stroke-width': 1.4, 'stroke-dasharray': '4 4'
      }), null, C_MUTED));
    });
    var kpDots = NZ_KP.map(function (p, i) {
      var halo = paint(svgEl('circle', { cx: p[0], cy: p[1], r: 8, fill: 'none', 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_GOOD);
      var node = paint(svgEl('circle', { cx: p[0], cy: p[1], r: 4.5 }), C_GOOD);
      kpG.appendChild(halo);
      kpG.appendChild(node);
      return { node: node, p: p, ph: i * 2.3 };
    });
    s.appendChild(kpG);
    var kpLab = paint(svgText(644, 272, '脚尖也只差 ±3 cm', 'demo-x-mono', 11.5, 'middle'), C_GOOD);
    var kpCap = paint(svgText(644, 290, '噪声留在原地，不沿运动链累积', null, 10.5, 'middle'), C_GOOD);
    s.appendChild(kpLab);
    s.appendChild(kpCap);

    // ── 下：两种输入的公开结果 ──
    var score = svgEl('g', {});
    score.appendChild(svgText(44, 324, 'cleaned AMASS 11313 条：', 'demo-x-mut', 11));
    [{ x: 186, w: 216, tx: 'PHC 旋转版　Succ 98.9%｜G-MPJPE 37.5', c: C_ACCENT },
      { x: 412, w: 216, tx: 'PHC-KP 关键点版　98.7%｜40.7', c: C_GOOD }
    ].forEach(function (c) {
      score.appendChild(paint(svgEl('rect', { x: c.x, y: 308, width: c.w, height: 26, rx: 13, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), C_SURFACE, c.c));
      score.appendChild(paint(svgText(c.x + c.w / 2, 325, c.tx, null, 10, 'middle'), c.c));
    });
    score.appendChild(paint(svgText(640, 324, '成功率只差 0.2 个点', 'demo-x-mono', 10.5), C_GOOD));
    s.appendChild(score);

    var pre = svgText(400, 358, '前提是 PHC 直接输出绝对 PD 目标：参考在抖、人已经摔在地上时，根本没有可加残差的基准', 'demo-x-mut', 11, 'middle');
    var foot = paint(svgText(400, 390, '同一套 PMCP ＋ Pᶠ，只换目标表示，就能接上视频和 VR', null, 15.5, 'middle'), C_ACCENT);
    s.appendChild(pre);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(src, seg(t, 0.3, 1.0));
      var jit = seg(t, 1.2, 1.8) * 4.5;
      dots.forEach(function (n) {
        n.node.setAttribute('cx', (n.p[0] + Math.sin(t * 5.1 + n.ph) * jit).toFixed(1));
        n.node.setAttribute('cy', (n.p[1] + Math.cos(t * 6.3 + n.ph * 1.3) * jit).toFixed(1));
      });
      setOpacity(skel, seg(t, 1.0, 1.6));
      setOpacity(srcCap, seg(t, 2.0, 2.6));

      setOpacity(rotG, seg(t, 3.4, 4.0));
      /* 从对齐状态转到 5°／10°，让「误差沿链条越走越大」是看见的，不是读到的。 */
      var bend = ease(seg(t, 5.0, 6.4));
      var now = nzChain(NZ_DEG * bend, 2 * NZ_DEG * bend);
      bones.forEach(function (b) {
        b.ln.setAttribute('x1', now[b.b[0]][0].toFixed(1));
        b.ln.setAttribute('y1', now[b.b[0]][1].toFixed(1));
        b.ln.setAttribute('x2', now[b.b[1]][0].toFixed(1));
        b.ln.setAttribute('y2', now[b.b[1]][1].toFixed(1));
      });
      joints.forEach(function (c, i) {
        c.setAttribute('cx', now[i][0].toFixed(1));
        c.setAttribute('cy', now[i][1].toFixed(1));
      });
      setOpacity(noisyG, seg(t, 4.6, 5.2));
      setOpacity(drift, seg(t, 6.4, 7.0));
      setOpacity(rotCap, seg(t, 6.8, 7.4));

      setOpacity(kpG, seg(t, 7.8, 8.4));
      var kjit = seg(t, 8.4, 9.0) * 4.1;
      kpDots.forEach(function (d) {
        d.node.setAttribute('cx', (d.p[0] + Math.sin(t * 5.7 + d.ph) * kjit).toFixed(1));
        d.node.setAttribute('cy', (d.p[1] + Math.cos(t * 6.9 + d.ph * 1.3) * kjit).toFixed(1));
      });
      setOpacity(kpLab, seg(t, 9.0, 9.6));
      setOpacity(kpCap, seg(t, 9.4, 10.0));

      setOpacity(score, seg(t, 10.6, 11.2));
      setOpacity(pre, seg(t, 12.8, 13.4));
      setOpacity(foot, seg(t, 14.8, 15.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 6: 两阶段训练闭环 ── */
  var S1_NODES = [
    { x: 112, y: 128, w: 168, tTex: '\\text{① 训当前列 } P^k', s: 'PPO；旧列 freeze_pnn' },
    { x: 302, y: 128, w: 168, t: '② 全库评估', sTex: '\\text{跟不上的} \\to Q_{hard}^{k+1}' },
    { x: 208, y: 232, w: 240, tTex: '\\text{③ 新增一列 } P^{k+1}', s: '权重从上一列拷贝初始化' }
  ];
  var S1_EDGES = [
    { pts: [[196, 128], [214, 128]] },
    { pts: [[302, 152], [246, 208]] },
    { pts: [[170, 208], [126, 152]] }
  ];
  var S2_NODES = [
    { x: 496, y: 118, w: 160, t: '④ 冻结全部 primitive', sTex: 'P^1 \\; P^2 \\; P^3 \\; P^F' },
    { x: 686, y: 118, w: 160, t: '⑤ getup 环境', s: 'fallInit 0.3｜recovery 90 步' },
    { x: 592, y: 196, w: 250, tTex: '\\text{⑥ 每列各出一份动作 } a_i', s: 'pnn(curr_obs)' },
    { x: 592, y: 272, w: 280, tTex: '\\text{⑦ } a = \\sum_i w_i a_i \\text{，PPO 只更新 C}', s: 'composer 的 softmax 权重 w' }
  ];
  var S2_EDGES = [
    { pts: [[576, 118], [602, 118]] },
    { pts: [[686, 141], [636, 173]] },
    { pts: [[592, 219], [592, 249]] },
    { pts: [[452, 272], [430, 272], [430, 196], [463, 196]] }
  ];
  var LOOP_STEPS = [
    { stage: 0, kind: 'node', i: 0, a: 1.2, b: 2.4 },
    { stage: 0, kind: 'edge', i: 0, a: 2.4, b: 2.9 },
    { stage: 0, kind: 'node', i: 1, a: 2.9, b: 4.1 },
    { stage: 0, kind: 'edge', i: 1, a: 4.1, b: 4.6 },
    { stage: 0, kind: 'node', i: 2, a: 4.6, b: 5.8 },
    { stage: 0, kind: 'edge', i: 2, a: 5.8, b: 6.3 },
    { stage: 0, kind: 'node', i: 0, a: 6.3, b: 7.0 },
    { stage: 1, kind: 'node', i: 0, a: 7.4, b: 8.4 },
    { stage: 1, kind: 'edge', i: 0, a: 8.4, b: 8.8 },
    { stage: 1, kind: 'node', i: 1, a: 8.8, b: 10.0 },
    { stage: 1, kind: 'edge', i: 1, a: 10.0, b: 10.4 },
    { stage: 1, kind: 'node', i: 2, a: 10.4, b: 11.4 },
    { stage: 1, kind: 'edge', i: 2, a: 11.4, b: 11.8 },
    { stage: 1, kind: 'node', i: 3, a: 11.8, b: 13.0 },
    { stage: 1, kind: 'edge', i: 3, a: 13.0, b: 13.6 },
    { stage: 1, kind: 'node', i: 2, a: 13.6, b: 14.2 }
  ];

  function flowNodes(s, defs) {
    return defs.map(function (n) {
      var g = svgEl('g', {});
      var rect = paint(svgEl('rect', { x: n.x - n.w / 2, y: n.y - 23, width: n.w, height: 46, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_BORDER);
      g.appendChild(rect);
      g.appendChild(n.tTex
        ? svgMath(n.x, n.y - 3, n.tTex, { size: 11.5, anchor: 'middle', w: n.w })
        : svgText(n.x, n.y - 3, n.t, 'demo-x-mono', 11.5, 'middle'));
      g.appendChild(n.sTex
        ? svgMath(n.x, n.y + 14, n.sTex, { size: 10, anchor: 'middle', cls: 'demo-x-mut', w: n.w })
        : svgText(n.x, n.y + 14, n.s, 'demo-x-mut', 10, 'middle'));
      s.appendChild(g);
      return { g: g, rect: rect };
    });
  }

  function buildSceneLoop() {
    var s = sceneSvg('PHC 的两阶段训练：阶段一逐列训 primitive 并挖硬负例，阶段二冻结全部 primitive、在 getup 环境里只训 composer');
    var arrow = K.arrowMarker(s, 'phc-x-flow', C_ACCENT);

    [[24, '阶段一：渐进训练 primitive', 'learning=im_pnn_big  env=env_im_pnn'],
      [408, '阶段二：训练 composer', 'learning=im_mcp_big  env=env_im_getup_mcp']
    ].forEach(function (b) {
      s.appendChild(paint(svgEl('rect', { x: b[0], y: 56, width: 368, height: 244, rx: 10, 'stroke-width': 1, 'stroke-dasharray': '6 5' }), C_SURFACE, C_BORDER));
      s.appendChild(paint(svgText(b[0] + 184, 76, b[1], null, 12.5, 'middle'), C_ACCENT));
      s.appendChild(svgText(b[0] + 184, 93, b[2], 'demo-x-mono demo-x-mut', 9.5, 'middle'));
    });
    s.appendChild(svgText(400, 40, '统一入口 phc/run_hydra.py：先逐列长出 primitive，再冻结它们训 composer', 'demo-x-ink2', 13.5, 'middle'));

    var e1 = S1_EDGES.map(function (e) {
      var p = paint(svgEl('path', { d: polyPath(e.pts), fill: 'none', 'stroke-width': 1.8, 'marker-end': arrow }), null, C_MUTED);
      s.appendChild(p);
      return p;
    });
    var e2 = S2_EDGES.map(function (e) {
      var p = paint(svgEl('path', { d: polyPath(e.pts), fill: 'none', 'stroke-width': 1.8, 'marker-end': arrow }), null, C_MUTED);
      s.appendChild(p);
      return p;
    });
    var n1 = flowNodes(s, S1_NODES);
    var n2 = flowNodes(s, S2_NODES);

    var token = paint(svgEl('circle', { cx: -20, cy: -20, r: 6 }), C_ACCENT);
    s.appendChild(token);

    var rewardG = svgEl('g', {});
    rewardG.appendChild(svgMath(400, 320,
      'r \\approx 0.5\\, r_{task} + 0.5\\, r_{amp} + r_{energy} \\quad\\vert\\quad r_{task} \\text{ 的四项权重 } w_{pos/rot/vel/ang} = 0.5 / 0.3 / 0.1 / 0.1',
      { size: 11, anchor: 'middle', w: 720 }).setTone(C_GOOD));
    s.appendChild(rewardG);

    var chips = [
      { x: 50, tx: 'PHC：Succ 98.9%｜G-MPJPE 37.5｜ACC 3.3', c: C_ACCENT },
      { x: 290, tx: 'PHC+ / PULSE：Succ 100%｜26.6', c: C_GOOD },
      { x: 530, tx: '~1 周 A100｜全部权重 28.8 MB', c: C_MUTED }
    ].map(function (c, i) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: c.x, y: 336, width: 220, height: 26, rx: 13, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), C_SURFACE, c.c));
      g.appendChild(paint(svgText(c.x + 110, 353, c.tx, null, 10, 'middle'), c.c));
      s.appendChild(g);
      return { g: g, at: 14.4 + i * 0.4 };
    });

    var foot = paint(svgText(400, 392, 'DeepMimic 学会一个动作；PHC 在一万条动作里一直活着、跟着、摔了还能自己起来', null, 14, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      var lit = [-1, -1], reach = [-1, -1], actE = [-1, -1], u = 0;
      LOOP_STEPS.forEach(function (st) {
        if (t >= st.a) reach[st.stage] = Math.max(reach[st.stage], st.i);
        if (t >= st.a && t < st.b) {
          if (st.kind === 'node') lit[st.stage] = st.i;
          else { actE[st.stage] = st.i; u = seg(t, st.a, st.b); }
        }
      });

      [[n1, 0], [n2, 1]].forEach(function (pair) {
        pair[0].forEach(function (b, i) {
          var seen = i <= reach[pair[1]];
          setOpacity(b.g, seen ? 1 : 0.3);
          paint(b.rect, i === lit[pair[1]] ? C_SURFACE : C_SURFACE2, i === lit[pair[1]] ? C_ACCENT : C_BORDER);
          b.rect.setAttribute('stroke-width', i === lit[pair[1]] ? 2.5 : 1.5);
        });
      });
      [[e1, 0], [e2, 1]].forEach(function (pair) {
        pair[0].forEach(function (e, i) {
          paint(e, null, i === actE[pair[1]] ? C_ACCENT : C_MUTED);
          setOpacity(e, i <= reach[pair[1]] ? 1 : 0.28);
        });
      });

      if (actE[0] >= 0 || actE[1] >= 0) {
        var st1 = actE[0] >= 0 ? 0 : 1;
        var p = pointOn((st1 ? S2_EDGES : S1_EDGES)[actE[st1]].pts, u);
        token.setAttribute('cx', p[0].toFixed(1));
        token.setAttribute('cy', p[1].toFixed(1));
        setOpacity(token, 1);
      } else {
        setOpacity(token, 0);
      }

      setOpacity(rewardG, seg(t, 11.8, 12.4));
      chips.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.4)); });
      setOpacity(foot, seg(t, 15.6, 16.3));
    }

    return { el: s, draw: draw };
  }

  var PHC_SCENES = [
    {
      title: 'DeepMimic 之后的三堵墙',
      dur: 14,
      build: buildSceneWalls,
      cues: [
        { at: 0.4, s: 'DeepMimic 解决了「给一段动捕，学会它」。真要拿去驱动一个实时 avatar，还差三件事。' },
        { at: 1.0, s: '第一堵墙：**一万段 AMASS 塞进一个网络**。先学走路再学后空翻，学完回头，走路反而生疏了。' },
        { at: 4.8, s: '这就是**灾难性遗忘**。那给每个动作配一个网络？一万个网络，运行时怎么切。' },
        { at: 6.0, s: '第二堵墙：**偏离参考太多就 reset**。可 VR 里的虚拟角色不能摔一下就「消失重置」。' },
        { at: 7.9, s: '之前的做法是加一只 invisible hand 把角色扶住 —— 能站稳，但不真实。PHC 的目标是**一点外力都不用**。' },
        { at: 9.0, s: '第三堵墙：**参考动作本身带噪声**。视频姿态估计、文本生成出来的骨架都在抖。' },
        { at: 11.8, s: 'PHC 的答卷正好三条：**PMCP 加容量、$P^F$ 自恢复、keypoint 输入** —— 第一堵墙要两幕（长出列、再混合列），后两堵各一幕。' }
      ]
    },
    {
      title: 'PMCP：加容量，不是加轮次',
      dur: 18,
      build: buildScenePmcp,
      cues: [
        { at: 0.4, s: '左边 240 格是整个动作库（代表 AMASS 的一万多条），按难度从左上排到右下，红色表示还学不会。' },
        { at: 1.6, s: '第 1 轮：$P^1$ 在**全量数据**上训，拿下 **77.1%**。剩下的 **55 条**就是论文说的 $Q_{hard}^2$。' },
        { at: 3.6, s: '关键一步在这里：**$P^1$ 训完立刻 freeze_pnn 冻死**，后面无论训什么，这片绿都不会再变红。' },
        { at: 4.6, s: '第 2 轮新开一列 $P^2$，权重从 $P^1$ 拷贝初始化，**只打那 55 条难例** → 覆盖率 **95.0%**，还剩 12 条。' },
        { at: 7.4, s: '第 3 轮同理，只打 12 条 → **98.3%**。难例越少，新列的容量越集中，所以边际收益没有一路掉到 0。' },
        { at: 10.0, s: '对照组是**同一个网络反复微调**：它每轮也在难例上训，但没有冻结 —— 77.1% 之后先掉到 64.2%，再爬也只有 **72.9%**。' },
        { at: 13.0, s: '第 4 列是 $P^F$，它不打难例，用简单移动数据 $Q_{loco}$ 专训摔倒恢复 —— 下一幕单独讲。' },
        { at: 14.6, s: '一句话：课程学习换的是**样本顺序**，PMCP 换的是**容量**。代价是推理时要跑 F 份前向，好在每列只是个 MLP。' }
      ]
    },
    {
      title: 'Composer：连续混合',
      dur: 15,
      build: buildSceneMcp,
      cues: [
        { at: 0.4, s: 'primitive 全部冻结之后，还差一个人决定「此刻该听谁的」—— 这就是 Composer C(s)。' },
        { at: 1.6, s: '上图是三个 primitive 的 softmax 权重。扫描线往右走，权重**交接是连续的**，没有任何一处在跳。' },
        { at: 4.2, s: '所以下图那条混合输出 $a = \\sum_i w_i a_i$ 也是连续的：两个专家意见的加权平均，而不是二选一。' },
        { at: 6.4, s: '源码就两行：`x_all = stack(actions)`、`a = sum(w * x_all)`。Composer 本身只是个小 MLP + Softmax。' },
        { at: 9.6, s: '现在把它换成**硬切换**（argmax，等价于温度拉满）：红色虚线就是「此刻只听权重最高的那个」。' },
        { at: 10.6, s: '看交界处：$s \\approx -0.65$ 时，输出从 **−0.03 直接跳到 1.04**，一步 1.07。30 Hz 的控制回路上，这一跳就是一次力矩冲击。' },
        { at: 12.6, s: '这也解释了**恢复为什么顺**：不是「切到 $P^F$」，是 $P^F$ 的权重慢慢升起来、模仿那几列慢慢让位。' }
      ]
    },
    {
      title: '摔倒恢复：FAIL 变中间态',
      dur: 16,
      build: buildSceneRecovery,
      cues: [
        { at: 0.4, s: '这是一条 400 步的 episode，纵轴是根节点离参考有多远，绿色虚线是 0.5 m 那条阈值。' },
        { at: 1.2, s: '曲线一开始贴着底走，这是 IMITATE 模式：正常追全身参考姿态。' },
        { at: 3.2, s: '第 **21 步**摔了 —— 距离一下窜到 4 m 以上。**换成 DeepMimic，episode 到这里就结束了**。' },
        { at: 4.4, s: 'PHC 这里切进 RECOVER：目标被放松成 $r_{point}$，**只要求根节点先回到参考附近**，不管全身姿态。' },
        { at: 6.6, s: '距离降到 0.5 m 以内就自动切回模仿。底下那条模式带上，橙绿交替了 6 个来回 —— 摔 6 次，爬起来 6 次。' },
        { at: 10.6, s: '右边两根柱子是同一条 episode 的两种活法：**有 $P^F$ 跑满 400 步，没有 $P^F$ 活到第 21 步**。' },
        { at: 12.0, s: '训练上靠三个开关：一半 episode 从摔倒状态开局（fallInitProb 0.3），进入恢复窗口后 **90 步内 reset_buf 强制为 0**。' },
        { at: 14.4, s: '也就是说：**哪怕看起来该终止了，环境也不让你 reset** —— DeepMimic 的 FAIL 是终态，PHC 把它变成了中间态。' }
      ]
    },
    {
      title: '噪声输入：换成关键点',
      dur: 16,
      build: buildSceneNoise,
      cues: [
        { at: 0.3, s: '前两堵墙讲完了：PMCP 管「学得下」，$P^F$ 管「摔得起」。第三堵墙在**输入端**。' },
        { at: 1.6, s: '真实用法里参考姿态来自视频姿态估计（HybrIK / MeTRAbs）或 VR 控制器，**每一帧都在抖**。' },
        { at: 3.6, s: 'PHC 的状态里，「目标差异」有两种写法。旋转版 $s_{rot}$ 比的是关节旋转差。' },
        { at: 5.2, s: '旋转误差要**乘上肢体长度**：髋 $5^\\circ$、膝再 $5^\\circ$，传到脚尖就是 $11\\ \\mathrm{cm}$ —— 越往末端越大。' },
        { at: 8.0, s: '关键点版 $s_{kp}$ 只问「每个 3D 点差多远」：噪声**留在原地，不沿运动链累积**。' },
        { at: 10.8, s: '代价很小：cleaned AMASS 上 **98.9% → 98.7%**，G-MPJPE 37.5 → 40.7，换来能直接吃视频和 VR 输入。' },
        { at: 13.0, s: '这也是 PHC **不用残差动作**的原因之一：参考本身在抖、人已经摔在地上时，根本没有可加残差的基准。' },
        { at: 15.0, s: '三堵墙到这儿补齐 —— 最后一幕把它们拼回训练流程。' }
      ]
    },
    {
      title: '两阶段训练闭环',
      dur: 17,
      build: buildSceneLoop,
      cues: [
        { at: 0.4, s: '把前面四幕串起来，就是 phc/run_hydra.py 里的两个训练阶段。' },
        { at: 1.2, s: '阶段一：① 训当前列 $P^k$（PPO，旧列 freeze_pnn 冻结，梯度不回传）。' },
        { at: 2.9, s: '② 拿它跑一遍全库，**跟不上的序列导出成 $Q_{hard}^{k+1}$**；③ 新增一列，权重从上一列拷过来初始化。' },
        { at: 6.3, s: '这个圈转几遍，primitive 就一列列长出来了 —— 这正是第二幕那张网格背后的过程。' },
        { at: 7.4, s: '阶段二：④ **冻结全部 primitive**，只训 composer；⑤ 换到 getup 环境，混入从摔倒状态开局的 episode。' },
        { at: 10.4, s: '⑥ 每列各出一份动作 $a_i$；⑦ composer 给权重，**$a = \\sum_i w_i a_i$**，PPO 这一阶段只更新 $C$。' },
        { at: 11.8, s: '奖励从头到尾是同一套：**$r \\approx 0.5\\, r_{task} + 0.5\\, r_{amp} + r_{energy}$**，$r_{task}$ 是全身刚体四项误差的指数加权。' },
        { at: 14.4, s: 'cleaned AMASS 上的公开结果：**PHC 98.9% / G-MPJPE 37.5**，PHC+ 做到 100% / 26.6。' },
        { at: 15.6, s: '一句话：**DeepMimic 学会一个动作，PHC 在一万条动作里一直活着** —— 这就是 Perpetual 的全部含义。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '六幕动画：PHC 全流程速览',
      sub: '约 96 秒自动播放。空格播放/暂停，← → 换幕；画面里的数字与本文各节、各实验台一致。开篇的三堵墙各有对应的一幕（第一堵占两幕），所以这篇比其余几篇多一幕。',
      ariaLabel: 'PHC 六幕讲解动画',
      notes: [
        '取数依据：第二幕的网格和覆盖率（77.1% → 95.0% → 98.3%，$Q_{hard}$ 240 → 55 → 12）就是上面「PMCP 实验台」' +
          '默认设置下现算出来的，单网络微调那条线（77.1 → 64.2 → 72.9）同样来自它的遗忘率默认值 35%；' +
          '第三幕的权重与动作曲线用的是「Composer 演示」的同一组 primitive；第四幕那条 episode 就是「摔倒恢复实验台」' +
          '的默认参数（阈值 0.5 m、fallInitProb 0.3、seed 31）跑出来的同一条。',
        '第五幕的 98.9% / 37.5 与 98.7% / 40.7 是官方仓库 README 在 cleaned AMASS（11313 条）上给出的 PHC 与 PHC-KP；' +
          '两种目标表示（$s_{rot}$ / $s_{kp}$）、不加残差的绝对 PD 目标出自正文「第一步：状态和动作设计」与 Q5、Q7。',
        '第六幕里 $0.5\\, r_{task} + 0.5\\, r_{amp} + r_{energy}$、$w_{pos/rot/vel/ang} = 0.5/0.3/0.1/0.1$、recoverySteps 90、' +
          'fallInitProb 0.3、98.9% / 37.5 / 100% / 26.6、28.8 MB 这些来自正文的奖励表、源码对照与附录。',
        '**第二、三、四幕是玩具模型**：覆盖率、权重、距离曲线都由浏览器里的简化模型算出，只复现机制' +
          '（冻结不塌 / 连续不跳 / 摔了能起），**数值不能和论文直接比** —— 第二幕那个 98.3% 和论文的 98.9% 只是巧合。',
        '第五幕的 5° / 11 cm / ±3 cm 同样是示意：腿长按 0.85 m 折算，髋、膝各差 5° 时脚尖的几何偏移就是 11 cm 上下，' +
          '用来说明「旋转误差会沿运动链放大、关键点误差不会」，不是论文测出来的噪声水平。'
      ],
      scenes: PHC_SCENES
    });
  }


  K.mount({
    'phc-explainer': buildExplainerDemo,
    'phc-pmcp': buildPmcpDemo,
    'phc-mcp': buildMcpDemo,
    'phc-recovery': buildRecoveryDemo
  });
})();
