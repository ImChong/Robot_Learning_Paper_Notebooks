/* Interactive CALM demos for
 * papers/01_Foundational_RL/CALM_Conditional_Adversarial_Latent_Models_for_Directable_Virtual_Characters.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["calm"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   calm-encoder — z = E(motion clip)：latent 有名字了，这才有后面的免训练组合
 *   calm-hlc     — 方向奖励 r_dir = cos(z_target, z_t)：把高层策略关进一个锥里
 *   calm-fsm     — 推理期 FSM：换的只是 z 的来源，三段技能零训练拼起来
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
    mulberry32 = K.mulberry32;

  /* 训练完的 LLC 里，每类动捕片段被 encoder 编到 latent 空间的一块区域。
     这里把 latent 画成单位圆（论文里是高维球面），每个技能占一个方向。 */
  var SKILLS = [
    { id: 'walk', name: '走', angle: 0.2, color: 'accent' },
    { id: 'crouch', name: '蹲走', angle: 1.25, color: 'good' },
    { id: 'kick', name: '踢/攻击', angle: 2.7, color: 'bad' },
    { id: 'cheer', name: '庆祝', angle: 4.4, color: 'warn' }
  ];

  function zOf(a) {
    return [Math.cos(a), Math.sin(a)];
  }

  function cosOf(a, b) {
    return Math.cos(a - b);
  }

  function skillByAngle(a) {
    var best = SKILLS[0],
      bestC = -2;
    SKILLS.forEach(function (s) {
      var c = cosOf(a, s.angle);
      if (c > bestC) {
        bestC = c;
        best = s;
      }
    });
    return { skill: best, cos: bestC };
  }

  /* 画 latent 圆：返回圆心与半径，方便各 demo 往上叠东西。 */
  function drawLatentCircle(g, title) {
    var P = g.P;
    var cx = g.w / 2,
      cy = g.h / 2 + 4,
      R = Math.min(g.w, g.h) / 2 - 34;
    g.ctx.save();
    g.ctx.strokeStyle = P.grid;
    g.ctx.lineWidth = 1;
    g.ctx.beginPath();
    g.ctx.arc(cx, cy, R, 0, Math.PI * 2);
    g.ctx.stroke();
    g.ctx.restore();
    text(g.ctx, title, 10, 15, P.muted, 'left', '11px sans-serif');
    return { cx: cx, cy: cy, R: R };
  }

  function place(c, angle, r) {
    return [c.cx + (r == null ? c.R : r) * Math.cos(angle), c.cy - (r == null ? c.R : r) * Math.sin(angle)];
  }

  // ─── demo 1: latent 从哪来 ───────────────────────────────────────────────
  function buildEncoderDemo(host) {
    var root = card(host, {
      title: 'CALM 的 latent 是「编」出来的，不是「采」出来的',
      sub:
        'ASE 的 z 从球面上随机采，采到哪算哪，没人知道哪个方向是踢腿；CALM 多了一个 encoder E，' +
        '把每段动捕编到 latent 空间的一个位置 —— 于是你可以直接写 E(踢腿动作) 拿到「踢」的 latent。'
    });

    var state = { mode: 'calm', from: 'walk', to: 'kick', mix: 0, spread: 0.22, seed: 11 };

    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: 'latent 从哪来',
      value: 'calm',
      items: [
        { label: 'CALM：z = E(动捕片段)', value: 'calm' },
        { label: 'ASE：z ~ 球面均匀采样', value: 'ase' }
      ],
      onPick: function (v) {
        state.mode = v;
        render();
      }
    });
    buttonGroup(ctrls, {
      label: '起点技能',
      value: 'walk',
      items: SKILLS.map(function (s) {
        return { label: s.name, value: s.id };
      }),
      onPick: function (v) {
        state.from = v;
        render();
      }
    });
    buttonGroup(ctrls, {
      label: '终点技能',
      value: 'kick',
      items: SKILLS.map(function (s) {
        return { label: s.name, value: s.id };
      }),
      onPick: function (v) {
        state.to = v;
        render();
      }
    });
    slider(ctrls, {
      label: '在两个技能之间插值',
      min: 0,
      max: 1,
      step: 0.01,
      value: state.mix,
      format: function (v) {
        return fmt(v * 100, 0) + '%';
      },
      onInput: function (v) {
        state.mix = v;
        render();
      }
    });
    slider(ctrls, {
      label: '同类片段的编码散布',
      min: 0.02,
      max: 0.8,
      step: 0.02,
      value: state.spread,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.spread = v;
        render();
      }
    });

    var setLegend = legend(root, [
      { key: 'accent', text: '每段动捕被编码到的位置' },
      { key: 'good', text: '当前 latent（插值结果）' },
      { key: 'muted', text: 'ASE：随机采的 z，没有语义' }
    ]);

    var grid = stageGrid(root);
    var circleStage = stage(grid, 235);
    var barStage = stage(grid, 235);

    var tb = table(root);
    var cosCells = [];
    (function () {
      var head = ['与各技能的 cos'];
      SKILLS.forEach(function (s) {
        head.push(s.name);
      });
      tb.row(head, true);
      var tr = el('tr');
      tr.appendChild(el('th', null, 'cos(z, z_技能)'));
      SKILLS.forEach(function () {
        var td = el('td', null, '—');
        cosCells.push(td);
        tr.appendChild(td);
      });
      tb.node.appendChild(tr);
    })();

    var stats = statsRow(root);
    var sZ = stats.add('当前 z');
    var sName = stats.add('它最像哪个技能');
    var sCos = stats.add('最高 cos');
    var sSem = stats.add('能不能「点名」技能');
    var verdict = verdictBox(root);

    note(root, [
      '**这一步才是 CALM 和 ASE 的分水岭**：ASE 的 encoder 是用来「反推 z」防 collapse 的，' +
        'CALM 的 encoder 是训练流程的入口 —— 先有动捕，再有 latent。所以 CALM 的 latent 天生带标签，' +
        'ASE 的 latent 得事后去找「哪个方向是踢腿」。',
      '**能点名，才能免训练组合**：第三个演示里 FSM 之所以能直接写「切到攻击状态」，靠的就是 `E(攻击动作)` 这一句。' +
        '如果 latent 没有语义，你只能再训练一个高层策略去找那个 z。',
      '**插值有意义，是因为判别器把整个空间压在了动作流形上**：把滑块拖到中间，得到的不是乱码，' +
        '而是一个介于两个技能之间的动作。散布拉大以后，同类片段编得更散，簇之间开始重叠 —— 这时候「点名」就不准了。',
      '**这是简化模型**：真实 latent 是高维的，encoder 是一个 MLP，簇的形状也不是这么规整的扇形。' +
        '这里只复现「一类动作 → latent 空间一块区域」的对应关系，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var fromS = SKILLS[0],
        toS = SKILLS[0];
      SKILLS.forEach(function (s) {
        if (s.id === state.from) fromS = s;
        if (s.id === state.to) toS = s;
      });
      // 在圆上沿最短弧插值
      var d = toS.angle - fromS.angle;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      var cur = fromS.angle + state.mix * d;
      var z = zOf(cur);
      var hit = skillByAngle(cur);

      sZ.set('[' + fmt(z[0], 2) + ', ' + fmt(z[1], 2) + ']', 'accent');
      sName.set(state.mode === 'ase' ? '（无从得知）' : hit.skill.name, state.mode === 'ase' ? 'bad' : 'good');
      sCos.set(fmt(hit.cos, 3), hit.cos > 0.9 ? 'good' : hit.cos > 0.5 ? 'warn' : 'bad');
      sSem.set(state.mode === 'calm' ? '可以：z = E(clip)' : '不行：要先搜一遍', state.mode === 'calm' ? 'good' : 'bad');
      SKILLS.forEach(function (s, i) {
        var c = cosOf(cur, s.angle);
        cosCells[i].textContent = fmt(c, 3);
        cosCells[i].className = c > 0.9 ? 'is-good' : c < 0 ? 'is-bad' : '';
      });

      if (state.mode === 'ase') {
        verdict.set(
          '🎲 ASE 模式：右边这些点是从球面上均匀采出来的 z，每一个都对应某种自然动作，' +
            '但**没有任何一个带着「这是踢腿」的标签**。想要一个特定技能，只能训练一个高层策略去搜。',
          'frozen'
        );
      } else if (state.mix > 0.15 && state.mix < 0.85) {
        verdict.set(
          '🔀 现在的 z 在「' +
            fromS.name +
            '」和「' +
            toS.name +
            '」之间（cos 分别是 ' +
            fmt(cosOf(cur, fromS.angle), 2) +
            ' / ' +
            fmt(cosOf(cur, toS.angle), 2) +
            '）。latent 空间是连续的，所以中间态也是一个能跑的动作 —— ' +
            '这正是 HLC 之后能在这个空间里「微调方向」的前提。',
          'learning'
        );
      } else {
        verdict.set(
          '✅ z ≈ E(' +
            hit.skill.name +
            ')，cos = ' +
            fmt(hit.cos, 2) +
            '。在 CALM 里拿到一个技能的 latent 就是一次 encoder 前向 —— ' +
            '不用训练、不用搜索，这就是后面 FSM 能零训练组合的原因。',
          'learning'
        );
      }

      // ── 左：latent 圆上的技能簇 ──
      var g = begin(circleStage);
      var P = g.P;
      setLegend(P);
      var c = drawLatentCircle(g, state.mode === 'calm' ? 'latent 空间：每类动捕占一块' : 'latent 空间：均匀采样，无语义');
      var rng = mulberry32(state.seed);
      if (state.mode === 'calm') {
        SKILLS.forEach(function (s) {
          for (var i = 0; i < 18; i++) {
            var a = s.angle + state.spread * (rng() * 2 - 1);
            var pt = place(c, a, c.R * (0.82 + 0.18 * rng()));
            dot(g.ctx, pt[0], pt[1], 2.6, P[s.color]);
          }
          var lp = place(c, s.angle, c.R + 18);
          text(g.ctx, s.name, lp[0], lp[1], P[s.color], Math.cos(s.angle) < -0.3 ? 'right' : Math.cos(s.angle) > 0.3 ? 'left' : 'center', '11px sans-serif');
        });
      } else {
        for (var i2 = 0; i2 < 72; i2++) {
          var a2 = 6.283 * rng();
          var pt2 = place(c, a2, c.R * (0.82 + 0.18 * rng()));
          dot(g.ctx, pt2[0], pt2[1], 2.6, P.muted);
        }
      }
      line(g.ctx, [[c.cx, c.cy], place(c, cur)], P.good, 2.4);
      dot(g.ctx, place(c, cur)[0], place(c, cur)[1], 6, P.good, P.surface2);

      // ── 右：与各技能的相似度 ──
      var g2 = begin(barStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [0, SKILLS.length], [-1, 1]);
      axes(g2, p2, {
        yTicks: [-1, -0.5, 0, 0.5, 1],
        yFmt: function (t) {
          return fmt(t, 1);
        }
      });
      text(g2.ctx, 'cos(z, z_技能)：谁最高，就是哪个技能', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      line(g2.ctx, [[p2.x0, p2.sy(0)], [p2.x1, p2.sy(0)]], P2.grid, 1);
      var slot = (p2.x1 - p2.x0) / SKILLS.length;
      var bw = Math.max(10, slot * 0.45);
      SKILLS.forEach(function (s, i) {
        var cx2 = p2.x0 + slot * (i + 0.5);
        var v = cosOf(cur, s.angle);
        var y0 = p2.sy(0),
          y1 = p2.sy(v);
        g2.ctx.fillStyle = state.mode === 'ase' ? P2.muted : P2[s.color];
        g2.ctx.fillRect(cx2 - bw / 2, Math.min(y0, y1), bw, Math.abs(y1 - y0));
        text(g2.ctx, s.name, cx2, p2.y0 + 14, P2.muted, 'center', '11px sans-serif');
        text(g2.ctx, fmt(v, 2), cx2, v >= 0 ? y1 - 9 : y1 + 11, P2.text, 'center', '11px monospace');
      });

      circleStage.canvas.setAttribute('aria-label', 'latent 空间里各技能片段的聚集情况');
      barStage.canvas.setAttribute('aria-label', '当前 latent 与各技能 latent 的余弦相似度');
    });

    render();
  }

  // ─── demo 2: 方向奖励把 HLC 关进一个锥里 ─────────────────────────────────
  function buildHlcDemo(host) {
    var root = card(host, {
      title: '方向奖励 cos(z_target, z)：不让高层策略「为了赢不择手段」',
      sub:
        'HLC 只输出 latent，不输出动作。如果只给任务奖励，它会挑一切能更快到达目标的 latent —— ' +
        '包括那些看起来很怪的。加上 cos 这一项，它就被限制在目标技能附近的一个锥里。'
    });

    var state = { wTask: 1.0, wDir: 1.0, target: 'crouch', seed: 3 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '任务奖励权重（走到目标）',
      min: 0,
      max: 2,
      step: 0.05,
      value: state.wTask,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.wTask = v;
        render();
      }
    });
    slider(ctrls, {
      label: '方向奖励权重 cos(z_target, z)',
      min: 0,
      max: 2,
      step: 0.05,
      value: state.wDir,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.wDir = v;
        render();
      }
    });
    buttonGroup(ctrls, {
      label: '这一段要求的风格 z_target',
      value: 'crouch',
      items: SKILLS.map(function (s) {
        return { label: s.name, value: s.id };
      }),
      onPick: function (v) {
        state.target = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '只要任务奖励（去掉 cos）', function () {
      state.wDir = 0;
      render();
    });
    button(btns, '只要方向奖励', function () {
      state.wTask = 0;
      render();
    });

    var setLegend = legend(root, [
      { key: 'accent', text: 'HLC 实际选中的 z' },
      { key: 'good', text: 'z_target（这一段要求的风格）' },
      { key: 'warn', text: '任务奖励最喜欢的方向' }
    ]);

    var grid = stageGrid(root);
    var circleStage = stage(grid, 235);
    var rewardStage = stage(grid, 235);

    var stats = statsRow(root);
    var sPick = stats.add('HLC 选中的技能');
    var sCos = stats.add('cos(z_target, z)');
    var sTask = stats.add('任务奖励');
    var sTotal = stats.add('总奖励');
    var verdict = verdictBox(root);

    note(root, [
      '**HLC 的动作空间就是 latent 空间**：它一秒钟只需要吐一个几十维的 z，' +
        '底下 28 个关节该怎么动完全交给 LLC。这是分层最实在的好处 —— 高层的搜索空间小了好几个数量级。',
      '**cos 这一项是「风格合同」**：任务奖励只在乎「有没有走到」，它会毫不犹豫地选一个跑得最快的 latent，' +
        '哪怕这一段本来要求蹲着走。cos 把选择限制在 z_target 周围的锥内，风格才守得住。',
      '**两边权重是个取舍**：cos 权重拉满，HLC 就只会照抄 z_target，任务完成得再差也不改 —— ' +
        '那还要高层干什么？拖动两个滑块看这条边界在哪里。',
      '**这是简化模型**：真实的任务奖励是走向目标的速度投影，latent 也是高维的。' +
        '这里把「任务最偏好的方向」写死成一个固定角度，只为把两项奖励的拉锯画出来，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var tgt = SKILLS[0];
      SKILLS.forEach(function (s) {
        if (s.id === state.target) tgt = s;
      });
      // 任务奖励最偏好「走」：跑得最快，但不管风格
      var taskBest = SKILLS[0].angle;
      function taskR(a) {
        return 0.5 + 0.5 * Math.cos(a - taskBest);
      }
      function totalR(a) {
        return state.wTask * taskR(a) + state.wDir * Math.cos(a - tgt.angle);
      }
      var pick = 0,
        bestV = -Infinity;
      for (var i = 0; i < 360; i++) {
        var a = (i * Math.PI) / 180;
        var v = totalR(a);
        if (v > bestV) {
          bestV = v;
          pick = a;
        }
      }
      var hit = skillByAngle(pick);
      var cosV = Math.cos(pick - tgt.angle);

      sPick.set(hit.skill.name, hit.skill.id === tgt.id ? 'good' : 'bad');
      sCos.set(fmt(cosV, 3), cosV > 0.85 ? 'good' : cosV > 0.3 ? 'warn' : 'bad');
      sTask.set(fmt(taskR(pick), 3), taskR(pick) > 0.7 ? 'good' : 'warn');
      sTotal.set(fmt(bestV, 3), 'accent');

      if (state.wDir < 0.05) {
        verdict.set(
          '⚠️ 方向奖励关掉了：HLC 直接挑了任务奖励最高的 latent（「' +
            hit.skill.name +
            '」），cos(z_target, z) 只有 ' +
            fmt(cosV, 2) +
            '。它确实走到了目标，但这一段本来要求的是「' +
            tgt.name +
            '」—— 风格约束没了，分层就退化成「高层随便挑一个能跑的技能」。',
          'frozen'
        );
      } else if (state.wTask < 0.05) {
        verdict.set(
          '🙃 任务奖励关掉了：HLC 每一步都原样输出 z_target，cos = ' +
            fmt(cosV, 2) +
            '。风格是满分，但它不再根据状态调整任何东西 —— 这时候高层策略等于一个常数，可以直接删掉。',
          'frozen'
        );
      } else if (cosV > 0.8) {
        verdict.set(
          '✅ HLC 选的 z 落在 z_target 的锥内（cos = ' +
            fmt(cosV, 2) +
            '），同时拿到 ' +
            fmt(taskR(pick), 2) +
            ' 的任务奖励。这才是想要的行为：**在指定风格里做任务微调**，而不是换一个技能。',
          'learning'
        );
      } else {
        verdict.set(
          '➖ cos = ' +
            fmt(cosV, 2) +
            '：任务奖励把 HLC 从 z_target 拽走了一段。两个权重的比值决定这条锥有多宽 —— ' +
            '拖动滑块能找到它从「守住风格」翻转到「换个技能」的那个点。',
          'frozen'
        );
      }

      // ── 左：latent 圆 + 允许锥 ──
      var g = begin(circleStage);
      var P = g.P;
      setLegend(P);
      var c = drawLatentCircle(g, 'HLC 在 latent 空间里选方向');
      // 锥：cos ≥ 0.8 的那一段
      var half = Math.acos(0.8);
      g.ctx.save();
      g.ctx.fillStyle = P.good;
      g.ctx.globalAlpha = 0.12;
      g.ctx.beginPath();
      g.ctx.moveTo(c.cx, c.cy);
      g.ctx.arc(c.cx, c.cy, c.R, -(tgt.angle + half), -(tgt.angle - half));
      g.ctx.closePath();
      g.ctx.fill();
      g.ctx.restore();
      SKILLS.forEach(function (s) {
        var lp = place(c, s.angle, c.R + 18);
        text(g.ctx, s.name, lp[0], lp[1], P.muted, Math.cos(s.angle) < -0.3 ? 'right' : Math.cos(s.angle) > 0.3 ? 'left' : 'center', '11px sans-serif');
      });
      line(g.ctx, [[c.cx, c.cy], place(c, tgt.angle)], P.good, 2);
      line(g.ctx, [[c.cx, c.cy], place(c, taskBest)], P.warn, 1.6, [5, 4]);
      line(g.ctx, [[c.cx, c.cy], place(c, pick)], P.accent, 2.8);
      dot(g.ctx, place(c, pick)[0], place(c, pick)[1], 6, P.accent, P.surface2);

      // ── 右：两项奖励与总奖励随 z 方向变化 ──
      var g2 = begin(rewardStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [0, 360], [-2.2, 3.2]);
      axes(g2, p2, {
        xTicks: [0, 90, 180, 270, 360],
        yTicks: [-2, -1, 0, 1, 2, 3],
        xLabel: 'latent 方向（°）'
      });
      text(g2.ctx, '总奖励的峰值落在哪里，HLC 就选哪里', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var tPts = [],
        dPts = [],
        sPts = [];
      for (var d2 = 0; d2 <= 360; d2 += 2) {
        var ang = (d2 * Math.PI) / 180;
        tPts.push([p2.sx(d2), p2.sy(state.wTask * taskR(ang))]);
        dPts.push([p2.sx(d2), p2.sy(state.wDir * Math.cos(ang - tgt.angle))]);
        sPts.push([p2.sx(d2), p2.sy(totalR(ang))]);
      }
      line(g2.ctx, [[p2.x0, p2.sy(0)], [p2.x1, p2.sy(0)]], P2.grid, 1);
      line(g2.ctx, tPts, P2.warn, 1.6, [5, 4]);
      line(g2.ctx, dPts, P2.good, 1.6, [5, 4]);
      line(g2.ctx, sPts, P2.accent, 2.4);
      var pickDeg = (pick * 180) / Math.PI;
      line(g2.ctx, [[p2.sx(pickDeg), p2.y0], [p2.sx(pickDeg), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(pickDeg), p2.sy(bestV), 4.5, P2.accent, P2.surface2);

      circleStage.canvas.setAttribute('aria-label', 'latent 空间中方向奖励允许的锥形区域');
      rewardStage.canvas.setAttribute('aria-label', '任务奖励与方向奖励随 latent 方向变化的曲线');
    });

    render();
  }

  // ─── demo 3: 推理期 FSM，零训练组合 ──────────────────────────────────────
  /* 一个 HumanoidStrike 式的状态机：走向目标 → 进入攻击范围就切攻击 → 打倒后庆祝。
     每个状态里动作都由同一个 LLC 生成，换的只是 z 的来源。 */
  function simulateFSM(opts) {
    var x = -4.2,
      y = -1.6;
    var frames = [];
    var mode = 'WALK';
    var strikeLeft = 0,
      cheerLeft = 0,
      down = false;
    for (var t = 0; t < opts.steps; t++) {
      var dx = opts.tx - x,
        dy = opts.ty - y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var zAngle, src;
      if (mode === 'WALK') {
        // HLC 选的 z：在 z_target 的锥里，按任务需要微调
        zAngle = opts.styleAngle + opts.hlcSwing * Math.sin(t * 0.13);
        src = 'HLC';
        if (dist < opts.range) {
          mode = 'STRIKE';
          strikeLeft = opts.strikeFrames;
        }
      } else if (mode === 'STRIKE') {
        zAngle = 2.7; // E(攻击动作)
        src = 'E(攻击)';
        strikeLeft--;
        if (strikeLeft <= 0) {
          down = true;
          mode = 'CHEER';
          cheerLeft = opts.cheerFrames;
        }
      } else {
        zAngle = 4.4; // E(庆祝动作)
        src = 'E(庆祝)';
        cheerLeft--;
      }
      if (mode === 'WALK' && dist > 1e-3) {
        var speed = opts.speed * (0.55 + 0.45 * Math.cos(zAngle - opts.styleAngle));
        x += (dx / dist) * speed;
        y += (dy / dist) * speed;
      }
      frames.push({ t: t, x: x, y: y, dist: dist, mode: mode, zAngle: zAngle, src: src, down: down });
      if (mode === 'CHEER' && cheerLeft <= 0) break;
    }
    return frames;
  }

  function buildFsmDemo(host) {
    var root = card(host, {
      title: '推理期 FSM：三段技能拼起来，一次训练都不用加',
      sub:
        '状态切换条件（距离、目标是否倒下）是手写的，但每个状态里的动作都来自同一个 LLC —— ' +
        '换的只有 z 的来源：WALK 用 HLC 输出的 z，STRIKE / CHEER 直接用 E(对应动捕)。'
    });

    var state = { frame: 0, range: 1.0, speed: 0.055, styleAngle: 1.25, playing: false, tx: 2.2, ty: 1.4 };
    var timer = null;

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '攻击范围阈值（m）',
      min: 0.3,
      max: 3.5,
      step: 0.05,
      value: state.range,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.range = v;
        render();
      }
    });
    var frameSlider = slider(ctrls, {
      label: '时间步',
      min: 0,
      max: 199,
      step: 1,
      value: 0,
      format: function (v) {
        return fmt(v, 0);
      },
      onInput: function (v) {
        state.frame = v;
        render();
      }
    });
    buttonGroup(ctrls, {
      label: 'WALK 这一段要求的风格',
      value: 'crouch',
      items: SKILLS.slice(0, 2).map(function (s) {
        return { label: s.name, value: s.id };
      }),
      onPick: function (v) {
        SKILLS.forEach(function (s) {
          if (s.id === v) state.styleAngle = s.angle;
        });
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    var playBtn = button(btns, '▶ 跑一遍', function () {
      state.playing = !state.playing;
      playBtn.textContent = state.playing ? '⏸ 暂停' : '▶ 跑一遍';
      if (state.playing) {
        if (state.frame >= 199) state.frame = 0;
        tick();
      } else clearTimeout(timer);
    });
    button(btns, '回到起点', function () {
      state.frame = 0;
      frameSlider.set(0, true);
      render();
    });

    function tick() {
      state.frame = Math.min(199, state.frame + 2);
      frameSlider.set(state.frame, true);
      render();
      if (state.playing && state.frame < 199) timer = setTimeout(tick, 60);
      else {
        state.playing = false;
        playBtn.textContent = '▶ 跑一遍';
      }
    }

    var setLegend = legend(root, [
      { key: 'accent', text: 'WALK：z 来自 HLC' },
      { key: 'bad', text: 'STRIKE：z = E(攻击动作)' },
      { key: 'warn', text: 'CHEER：z = E(庆祝动作)' }
    ]);

    var grid = stageGrid(root);
    var sceneStage = stage(grid, 240);
    var zStage = stage(grid, 240);

    var stats = statsRow(root);
    var sMode = stats.add('当前状态');
    var sSrc = stats.add('z 从哪来');
    var sDist = stats.add('离目标');
    var sTrain = stats.add('这一步的训练量');
    var verdict = verdictBox(root);

    note(root, [
      '**FSM 只负责「什么时候换 z」**：它不生成动作、不做插值、也不知道关节长什么样。' +
        '动作质量全部由 LLC 和它背后的判别器保证 —— 所以状态切换那一瞬间不会出现穿模或者抖动。',
      '**把攻击范围拖大**：角色还没走近就切进 STRIKE，会看到它在原地对空气挥剑。' +
        '这暴露了 FSM 的真实代价：**切换逻辑是人写的，写错了没有任何机制会纠正它**。',
      '**这也是 CALM 和后来工作的分界**：FSM 能组合，但组合规则要人来定；' +
        'PULSE 那一代开始把「什么时候用哪个技能」也交给下游 RL 去学。',
      '**这是简化模型**：真实的 HumanoidStrikeFSM 跑在 Isaac Gym 里，切换条件还包括目标是否倒下等。' +
        '这里只复现「状态 → z 的来源 → 同一个 LLC」这条链路，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var frames = simulateFSM({
        steps: 200,
        tx: state.tx,
        ty: state.ty,
        range: state.range,
        speed: state.speed,
        styleAngle: state.styleAngle,
        hlcSwing: 0.35,
        strikeFrames: 26,
        cheerFrames: 30
      });
      var i = clamp(Math.round(state.frame), 0, frames.length - 1);
      var f = frames[i];

      var toneOf = { WALK: 'accent', STRIKE: 'bad', CHEER: 'warn' };
      var nameOf = { WALK: 'WALK（走向目标）', STRIKE: 'STRIKE（攻击）', CHEER: 'CHEER（庆祝）' };
      sMode.set(nameOf[f.mode], toneOf[f.mode]);
      sSrc.set(f.src, f.src === 'HLC' ? 'accent' : 'good');
      sDist.set(fmt(f.dist, 2) + ' m', f.dist < state.range ? 'warn' : 'good');
      sTrain.set('0（全部是预训练模型）', 'good');

      if (f.mode === 'STRIKE' && f.dist > state.range + 0.6) {
        verdict.set(
          '⚠️ 攻击范围设成了 ' +
            fmt(state.range, 2) +
            ' m，角色离目标还有 ' +
            fmt(f.dist, 2) +
            ' m 就切进了 STRIKE —— 它正在对着空气挥剑。' +
            'FSM 的切换条件是人写的，写错了不会有任何机制纠正它。',
          'frozen'
        );
      } else if (f.mode === 'WALK') {
        verdict.set(
          '🚶 WALK：z 由 HLC 输出，在「' +
            skillByAngle(state.styleAngle).skill.name +
            '」的锥里随状态小幅摆动（右图那段抖动的线）。离目标还有 ' +
            fmt(f.dist, 2) +
            ' m，到 ' +
            fmt(state.range, 2) +
            ' m 就切状态。',
          'learning'
        );
      } else if (f.mode === 'STRIKE') {
        verdict.set(
          '⚔️ STRIKE：z 换成常数 E(攻击动作)，HLC 这一段完全不参与。' +
            '注意右图 latent 是**跳**过去的，不是渐变 —— 但动作不会崩，因为 LLC 见过大量 latent 切换的训练数据。',
          'learning'
        );
      } else {
        verdict.set(
          '🎉 CHEER：z = E(庆祝动作)。整条 走 → 攻击 → 庆祝 的序列跑完，**新增训练量是 0**：' +
            'LLC 和 HLC 都是现成的，FSM 只是一段几十行的调度代码。',
          'learning'
        );
      }

      // ── 左：俯视场景 ──
      var g = begin(sceneStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 40, r: 14, t: 22, b: 34 }, [-5, 4], [-3, 3]);
      axes(g, p, { xTicks: [-4, -2, 0, 2, 4], yTicks: [-2, 0, 2], xLabel: '地面 x（m）' });
      text(g.ctx, '俯视：角色走向目标并触发状态切换', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      // 攻击范围圈
      g.ctx.save();
      g.ctx.strokeStyle = P.warn;
      g.ctx.setLineDash([4, 4]);
      g.ctx.beginPath();
      g.ctx.arc(p.sx(state.tx), p.sy(state.ty), Math.abs(p.sx(state.range) - p.sx(0)), 0, Math.PI * 2);
      g.ctx.stroke();
      g.ctx.restore();
      var path = [];
      for (var k = 0; k <= i; k++) path.push([p.sx(frames[k].x), p.sy(frames[k].y)]);
      if (path.length > 1) line(g.ctx, path, P.accent, 2.2);
      dot(g.ctx, p.sx(state.tx), p.sy(state.ty), 7, f.down ? P.muted : P.bad, P.surface2);
      text(g.ctx, f.down ? '目标已倒下' : '目标', p.sx(state.tx) + 10, p.sy(state.ty) - 10, P.muted, 'left', '10px sans-serif');
      dot(g.ctx, p.sx(f.x), p.sy(f.y), 6.5, P[toneOf[f.mode]], P.surface2);

      // ── 右：latent 角度的时间线 ──
      var g2 = begin(zStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [0, frames.length], [0, 6.283]);
      axes(g2, p2, {
        xTicks: K.niceTicks(0, frames.length, 4),
        yTicks: SKILLS.map(function (s) {
          return s.angle;
        }),
        yFmt: function (t) {
          var nm = '';
          SKILLS.forEach(function (s) {
            if (Math.abs(s.angle - t) < 1e-6) nm = s.name;
          });
          return nm;
        },
        xLabel: '时间步'
      });
      text(g2.ctx, 'LLC 收到的 latent：换的只是来源', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var segs = { WALK: [], STRIKE: [], CHEER: [] };
      frames.slice(0, i + 1).forEach(function (fr) {
        segs[fr.mode].push([p2.sx(fr.t), p2.sy(fr.zAngle)]);
      });
      if (segs.WALK.length > 1) line(g2.ctx, segs.WALK, P2.accent, 2.4);
      if (segs.STRIKE.length > 1) line(g2.ctx, segs.STRIKE, P2.bad, 2.4);
      if (segs.CHEER.length > 1) line(g2.ctx, segs.CHEER, P2.warn, 2.4);
      dot(g2.ctx, p2.sx(f.t), p2.sy(f.zAngle), 5, P2[toneOf[f.mode]], P2.surface2);

      sceneStage.canvas.setAttribute('aria-label', 'FSM 驱动下角色走向目标的俯视轨迹');
      zStage.canvas.setAttribute('aria-label', 'LLC 收到的 latent 随时间在三种来源之间切换');
    });

    render();
  }

  K.mount({
    'calm-encoder': buildEncoderDemo,
    'calm-hlc': buildHlcDemo,
    'calm-fsm': buildFsmDemo
  });
})();
