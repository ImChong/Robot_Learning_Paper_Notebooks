/* Interactive CALM demos for
 * papers/01_Foundational_RL/CALM_Conditional_Adversarial_Latent_Models_for_Directable_Virtual_Characters.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["calm"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   calm-explainer — 五幕讲解动画：ASE 缺方向 → LLC 编 latent → HLC 方向奖励 →
 *                    FSM 零训练组合 → 三阶段训练闭环
 *   calm-encoder   — z = E(motion clip)：latent 有名字了，这才有后面的免训练组合
 *   calm-hlc       — 方向奖励 r_dir = cos(z_target, z_t)：把高层策略关进一个锥里
 *   calm-fsm       — 推理期 FSM：换的只是 z 的来源，三段技能零训练拼起来
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

  // ─── demo 4: the five-scene explainer animation ──────────────────────────
  /* CALM 的核心是三层解耦：LLC 编 latent / HLC 选方向 / FSM 拼技能。五幕分别
     对应笔记「要解决什么问题」「三层架构」与「具体实例」——数字与下面三个演示
     共用 SKILLS / cosOf / taskR / simulateFSM 等同一份函数。 */

  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
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

  var S1_TASKS = ['朝左走', '朝右走', '追着蓝球跑', '朝目标点蹲走'];
  var S1_LATENTS = [
    { name: '冲刺', angle: 0.2, color: C_ACCENT },
    { name: '下蹲', angle: 1.25, color: C_GOOD }
  ];

  function hlcTaskR(a) {
    return 0.5 + 0.5 * Math.cos(a - SKILLS[0].angle);
  }

  function hlcTotalR(a, tgtAngle, wTask, wDir) {
    return wTask * hlcTaskR(a) + wDir * Math.cos(a - tgtAngle);
  }

  function hlcBestPick(tgtAngle, wTask, wDir) {
    var pick = 0,
      bestV = -Infinity;
    for (var i = 0; i < 360; i++) {
      var a = (i * Math.PI) / 180;
      var v = hlcTotalR(a, tgtAngle, wTask, wDir);
      if (v > bestV) {
        bestV = v;
        pick = a;
      }
    }
    return { angle: pick, total: bestV, cos: Math.cos(pick - tgtAngle), task: hlcTaskR(pick) };
  }

  /* ── scene 1: ASE 有技能，但没有方向 ── */
  function buildSceneProblem() {
    var s = sceneSvg(
      'ASE 的 latent 能调出「走 / 蹲 / 踢」，但两个方向都没有「往哪走」的信息；' +
        '下游任务却必须知道朝哪个目标点执行'
    );
    s.appendChild(svgText(60, 32, 'ASE 之后：技能有了，方向还没有', 'demo-x-ink2', 13.5));

    s.appendChild(paint(svgEl('rect', { x: 40, y: 54, width: 340, height: 250, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    s.appendChild(svgMath(210, 78, '\\text{ASE：} z \\text{ 编码「做什么技能」}',
      { size: 12, anchor: 'middle', cls: 'demo-x-ink2', w: 300 }));
    var cx = 210,
      cy = 188,
      R = 72;
    s.appendChild(paint(svgEl('circle', { cx: cx, cy: cy, r: R, fill: 'none', 'stroke-width': 1.2 }), null, C_BORDER));
    var zNodes = S1_LATENTS.map(function (z, i) {
      var g = svgEl('g', {});
      var px = cx + R * Math.cos(z.angle),
        py = cy - R * Math.sin(z.angle);
      g.appendChild(paint(svgEl('line', { x1: cx, y1: cy, x2: px, y2: py, 'stroke-width': 2 }), null, z.color));
      g.appendChild(paint(svgEl('circle', { cx: px, cy: py, r: 5.5, 'stroke-width': 1.4 }), z.color, C_SURFACE2));
      g.appendChild(svgText(px + (Math.cos(z.angle) > 0 ? 12 : -12), py + 4, z.name, 'demo-x-ink2', 11,
        Math.cos(z.angle) > 0 ? 'start' : 'end'));
      s.appendChild(g);
      return { g: g, at: 1.0 + i * 0.8 };
    });
    var qMark = svgText(210, 268, '❓ 往左？往右？朝目标？—— latent 里都没有', 'demo-x-bad', 11, 'middle');
    s.appendChild(qMark);

    s.appendChild(paint(svgEl('rect', { x: 410, y: 54, width: 350, height: 250, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    s.appendChild(svgText(585, 78, '任务却需要「往哪做」', 'demo-x-ink2', 12, 'middle'));
    var tasks = S1_TASKS.map(function (name, i) {
      var y = 108 + i * 44;
      var g = svgEl('g', {});
      g.appendChild(svgText(428, y + 4, name, 'demo-x-ink2', 11.5));
      g.appendChild(paint(svgEl('rect', { x: 606, y: y - 12, width: 142, height: 24, rx: 6, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), C_SURFACE, C_BAD));
      g.appendChild(paint(svgText(677, y + 4, '低层不知道', null, 10.5, 'middle'), C_BAD));
      s.appendChild(g);
      return { g: g, at: 3.4 + i * 0.55 };
    });

    var chip = svgEl('g', {});
    chip.appendChild(paint(svgEl('rect', { x: 90, y: 318, width: 620, height: 30, rx: 15, 'stroke-width': 1, 'stroke-dasharray': '5 4' }), C_SURFACE, C_MUTED));
    chip.appendChild(svgText(400, 337, '传统做法：把目标信息塞进低层 → 每个新任务都得重训 LLC', 'demo-x-mut', 10.5, 'middle'));
    s.appendChild(chip);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 378, 'CALM 的洞察：方向不必写进 latent，而是在 latent 空间里「选一个方向」', null, 15, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 402, '低层管质量，高层管方向 —— 各司其职', 'demo-x-mut', 11.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      zNodes.forEach(function (n) { setOpacity(n.g, seg(t, n.at, n.at + 0.45)); });
      setOpacity(qMark, seg(t, 2.6, 3.2));
      tasks.forEach(function (k) { setOpacity(k.g, seg(t, k.at, k.at + 0.45)); });
      setOpacity(chip, seg(t, 6.2, 7.0));
      setOpacity(foot, seg(t, 9.8, 10.8));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 2: LLC —— latent 从动捕编出来 ── */
  function buildSceneLlc() {
    var s = sceneSvg(
      'CALM 的 encoder 把每段动捕编到 latent 空间的一块区域；给定 z 就能点名技能，' +
        '这和 ASE 从球面随机采 z 完全不同'
    );
    s.appendChild(svgMath(60, 32, '\\text{第一层 LLC：} z = E(\\text{动捕片段}) \\text{，动作质量交给对抗模仿}',
      { size: 13, cls: 'demo-x-ink2', w: 520 }));
    var formula = svgMath(400, 62, 'E(m) \\to z, \\qquad a_t \\sim \\pi_{LLC}(a_t \\mid s_t, z)',
      { size: 13, anchor: 'middle', cls: 'demo-x-ink2', w: 620 });
    s.appendChild(formula);

    var CX = 178,
      CY = 228,
      R = 78;
    var ring = svgEl('g', {});
    ring.appendChild(paint(svgEl('circle', { cx: CX, cy: CY, r: R, fill: 'none', 'stroke-width': 1.2 }), null, C_BORDER));
    ring.appendChild(svgText(CX, 132, 'latent 空间（2D 示意）', 'demo-x-mut', 10.5, 'middle'));
    s.appendChild(ring);

    var rng = mulberry32(11);
    var clusters = SKILLS.map(function (sk, i) {
      var g = svgEl('g', {});
      for (var j = 0; j < 14; j++) {
        var a = sk.angle + 0.22 * (rng() * 2 - 1);
        var pt = [CX + R * (0.82 + 0.18 * rng()) * Math.cos(a), CY - R * (0.82 + 0.18 * rng()) * Math.sin(a)];
        g.appendChild(paint(svgEl('circle', { cx: pt[0], cy: pt[1], r: 2.6 }), X[sk.color]));
      }
      g.appendChild(svgText(CX + (R + 16) * Math.cos(sk.angle), CY - (R + 16) * Math.sin(sk.angle) + 3, sk.name,
        'demo-x-' + (sk.color === 'accent' ? 'acc' : sk.color === 'good' ? 'good' : sk.color === 'bad' ? 'bad' : 'warn'), 10,
        Math.cos(sk.angle) < -0.3 ? 'end' : Math.cos(sk.angle) > 0.3 ? 'start' : 'middle'));
      s.appendChild(g);
      return { g: g, at: 1.2 + i * 0.55 };
    });

    var clipBox = svgEl('g', {});
    clipBox.appendChild(paint(svgEl('rect', { x: 430, y: 118, width: 310, height: 52, rx: 8, 'stroke-width': 1.2 }), C_SURFACE2, C_GOOD));
    clipBox.appendChild(svgText(448, 140, '动捕：走 / 蹲 / 踢 / 庆祝', 'demo-x-ink2', 11.5));
    clipBox.appendChild(paint(svgText(710, 140, 'E(m) → z', 'demo-x-mono', 12, 'end'), C_GOOD));
    /* 「动捕经 E 编码，落进 latent 空间」这一箭：走圆右侧 y=190 的空当（在「走」
       标签上方），带箭头停在圆边上。之前这条线拐进圆心竖着穿过整个 latent 圆、
       又在圆外下方收尾，看着像在指「庆祝」那一簇，而不是指 latent 空间。 */
    clipBox.appendChild(paint(svgEl('path', {
      d: 'M 585 170 L 585 190 L ' + (CX + R - 4) + ' 190',
      fill: 'none', 'stroke-width': 1.6, 'stroke-dasharray': '5 4',
      'marker-end': K.arrowMarker(s, 'calm-x-arrow-clip', C_GOOD)
    }), null, C_GOOD));
    s.appendChild(clipBox);

    var aseBox = svgEl('g', {});
    aseBox.appendChild(paint(svgEl('rect', { x: 430, y: 248, width: 310, height: 88, rx: 8, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), C_SURFACE, C_MUTED));
    aseBox.appendChild(svgMath(448, 272, '\\text{对比 ASE：} z \\sim \\text{Uniform}(S^{d})',
      { size: 11.5, cls: 'demo-x-mut', w: 282 }));
    aseBox.appendChild(svgMath(448, 296, '\\text{随机采到的 } z \\text{ 没有「这是踢腿」的标签}',
      { size: 11, cls: 'demo-x-mut', w: 282 }));
    aseBox.appendChild(svgMath(448, 318, '\\text{CALM 可以直接写 } E(\\text{踢腿动作}) \\text{ 拿到踢的 latent}',
      { size: 11, cls: 'demo-x-good', w: 282 }));
    s.appendChild(aseBox);

    var foot = paint(svgText(400, 396, '能「点名」技能，后面 FSM 才能零训练组合', null, 15, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(formula, seg(t, 0.3, 0.9));
      setOpacity(ring, seg(t, 0.8, 1.4));
      clusters.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.5)); });
      setOpacity(clipBox, seg(t, 3.8, 4.6));
      setOpacity(aseBox, seg(t, 7.2, 8.0));
      setOpacity(foot, seg(t, 10.4, 11.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 3: HLC —— 方向奖励 cos(z_target, z) ── */
  var S3_TGT = SKILLS[1].angle;
  var S3_W_TASK = 1.0;
  var S3_W_DIR = 1.0;
  var S3_BEST = hlcBestPick(S3_TGT, S3_W_TASK, S3_W_DIR);
  var S3_CX = 178,
    S3_CY = 238,
    S3_R = 78;

  function s3Place(angle, r) {
    return [S3_CX + (r == null ? S3_R : r) * Math.cos(angle), S3_CY - (r == null ? S3_R : r) * Math.sin(angle)];
  }

  function buildSceneHlc() {
    var s = sceneSvg(
      'HLC 只输出 latent；方向奖励 r_dir = cos(z_target, z_t) 把选择限制在目标风格附近的锥里'
    );
    s.appendChild(svgText(60, 32, '第二层 HLC：在 latent 空间里选方向来完成任务', 'demo-x-ink2', 13.5));
    var formula = svgMath(400, 62, 'z_t = \\text{HLC}(s_t, \\text{goal}), \\qquad r_{dir} = \\cos(z_{target}, z_t)',
      { size: 12.5, anchor: 'middle', cls: 'demo-x-ink2', w: 660 });
    s.appendChild(formula);

    var geom = svgEl('g', {});
    geom.appendChild(paint(svgEl('circle', { cx: S3_CX, cy: S3_CY, r: S3_R, fill: 'none', 'stroke-width': 1.2 }), null, C_BORDER));
    var half = Math.acos(0.8);
    var cone = paint(svgEl('path', {
      d: 'M ' + S3_CX + ' ' + S3_CY +
        ' L ' + s3Place(S3_TGT + half)[0] + ' ' + s3Place(S3_TGT + half)[1] +
        /* sweep-flag = 1：从 z_target+half 顺着屏幕顺时针扫到 z_target-half，
           才是贴着这个圆的那段 74° 扇形；0 会把弧画到另一侧的圆上，变成一个
           把选中的 latent 甩在外面的尖角。 */
        ' A ' + S3_R + ' ' + S3_R + ' 0 0 1 ' + s3Place(S3_TGT - half)[0] + ' ' + s3Place(S3_TGT - half)[1] + ' Z',
      /* fill-opacity，不是 opacity：这个节点的淡入由 setOpacity() 写 style.opacity，
         行内样式会盖掉同名的 opacity 属性，锥形就成了一块盖住 z_target 的实心绿。 */
      'fill-opacity': 0.18
    }), C_GOOD);
    geom.appendChild(cone);
    /* 目标方向本来就躺在同色的锥形填充里，实线会被吃掉；虚线才看得出 z_target。 */
    var tgtArm = paint(svgEl('line', { x1: S3_CX, y1: S3_CY, 'stroke-width': 2, 'stroke-dasharray': '5 4' }), null, C_GOOD);
    var pickArm = paint(svgEl('line', { x1: S3_CX, y1: S3_CY, 'stroke-width': 2.6 }), null, C_ACCENT);
    var pickDot = paint(svgEl('circle', { r: 6, 'stroke-width': 1.6 }), C_ACCENT, C_SURFACE2);
    geom.appendChild(tgtArm);
    geom.appendChild(pickArm);
    geom.appendChild(pickDot);
    geom.appendChild(svgMath(S3_CX, 124, '\\text{允许锥：} \\cos \\ge 0.8',
      { size: 10.5, anchor: 'middle', cls: 'demo-x-mut', w: 200 }));
    /* 圆里只有两条线和一个扇形，谁是谁必须写出来：绿虚线 = 目标风格，蓝实线 =
       HLC 这一步选的 latent。没有这两个标注，读者只能靠下面的读数反推。 */
    geom.appendChild(paint(svgText(194, 148, 'z_target：' + skillByAngle(S3_TGT).skill.name, null, 10, 'end'), C_GOOD));
    geom.appendChild(paint(svgText(238, 172, 'HLC 选的 z_t', null, 10), C_ACCENT));
    s.appendChild(geom);

    /* 四块读数等距排开：168 宽 + 12 间距，正好落在 46…754 之间，
       盒子之间不再互相盖住数字。 */
    var readouts = [
      { cx: 130, label: 'HLC 选中', sub: skillByAngle(S3_BEST.angle).skill.name },
      { cx: 310, label: 'cos(z_target, z)', sub: fmt(S3_BEST.cos, 3) },
      { cx: 490, label: '任务奖励', sub: fmt(S3_BEST.task, 3) },
      { cx: 670, label: '总奖励', sub: fmt(S3_BEST.total, 3) }
    ].map(function (r) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: r.cx - 84, y: 318, width: 168, height: 34, rx: 6, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
      g.appendChild(svgText(r.cx - 72, 332, r.label, 'demo-x-mut', 10));
      g.appendChild(paint(svgText(r.cx + 72, 332, r.sub, 'demo-x-mono', 11.5, 'end'), C_ACCENT));
      s.appendChild(g);
      return g;
    });

    var warn = svgEl('g', {});
    warn.appendChild(paint(svgEl('rect', { x: 430, y: 118, width: 330, height: 72, rx: 8, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), C_SURFACE, C_WARN));
    warn.appendChild(svgText(448, 142, '只有任务奖励时：HLC 会挑跑得最快的 latent', 'demo-x-warn', 11.5));
    warn.appendChild(svgText(448, 164, '哪怕这一段要求的是「蹲走」—— 风格约束没了', 'demo-x-warn', 11));
    warn.appendChild(svgMath(448, 182, 'r_{dir} \\text{ 权重拖到 } 0 \\Rightarrow \\cos = ' + fmt(hlcBestPick(S3_TGT, 1, 0).cos, 2),
      { size: 11, w: 300 }).setTone(C_BAD));
    s.appendChild(warn);

    var foot = paint(svgText(400, 396, 'HLC 的动作空间就是 latent 空间 —— 搜索空间比直接控关节小几个数量级', null, 14.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(formula, seg(t, 0.3, 0.9));
      setOpacity(geom, seg(t, 0.8, 1.4));
      var ang = S3_BEST.angle;
      var tp = s3Place(S3_TGT);
      var pp = s3Place(ang);
      tgtArm.setAttribute('x2', tp[0].toFixed(1));
      tgtArm.setAttribute('y2', tp[1].toFixed(1));
      pickArm.setAttribute('x2', pp[0].toFixed(1));
      pickArm.setAttribute('y2', pp[1].toFixed(1));
      pickDot.setAttribute('cx', pp[0].toFixed(1));
      pickDot.setAttribute('cy', pp[1].toFixed(1));
      setOpacity(cone, seg(t, 2.0, 2.8));
      readouts.forEach(function (g, i) { setOpacity(g, seg(t, 4.0 + i * 0.35, 4.6 + i * 0.35)); });
      setOpacity(warn, seg(t, 7.0, 7.8));
      setOpacity(foot, seg(t, 10.2, 11.0));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 4: FSM —— 换的只是 z 的来源 ── */
  /* 与下面 FSM 实验台的默认参数完全一致（那边也是 steps: 200）：120 步只够走完
     WALK，STRIKE 才刚起头、CHEER 根本没出现，时间线就讲不出「跳变」这件事。 */
  var S4_FRAMES = simulateFSM({
    steps: 200,
    tx: 2.2,
    ty: 1.4,
    range: 1.0,
    speed: 0.055,
    styleAngle: SKILLS[1].angle,
    hlcSwing: 0.35,
    strikeFrames: 26,
    cheerFrames: 30
  });

  function buildSceneFsm() {
    var s = sceneSvg(
      '推理期 FSM：WALK 用 HLC 输出的 z，STRIKE / CHEER 用 E(对应动捕)；' +
        '同一个 LLC，新增训练量为 0'
    );
    s.appendChild(svgText(60, 32, '第三层 FSM：三段技能拼起来，一次训练都不用加', 'demo-x-ink2', 13.5));

    var stateSpecs = [
      { x: 140, label: 'WALK\nHLC → z_t', color: C_ACCENT },
      { x: 400, label: 'STRIKE\nE(攻击)', color: C_BAD },
      { x: 660, label: 'CHEER\nE(庆祝)', color: C_WARN }
    ];
    var states = stateSpecs.map(function (st, i) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: st.x - 88, y: 72, width: 176, height: 56, rx: 10, 'stroke-width': 1.6 }), C_SURFACE2, st.color));
      st.label.split('\n').forEach(function (line, j) {
        g.appendChild(paint(svgText(st.x, 96 + j * 18, line, null, j ? 10.5 : 12.5, 'middle'), j ? C_MUTED : st.color));
      });
      s.appendChild(g);
      return { g: g, at: 0.8 + i * 1.4 };
    });

    /* 这一幕讲的就是「什么时候换」，所以状态之间要看得出方向和触发条件：
       条件取自 simulateFSM()（range = 1.0 m；攻击帧数走完就把目标判为倒下）。
       连线挂在「目的状态」那一组里，跟着它一起淡入 —— 否则箭头会先指着一个
       两秒后才出现的空框。 */
    var fsmArrow = K.arrowMarker(s, 'calm-x-arrow-fsm', C_MUTED);
    var S4_COND = ['距离 < 1 m', '目标倒下'];
    stateSpecs.forEach(function (st, i) {
      if (i === 0) return;
      var x1 = stateSpecs[i - 1].x + 88,
        x2 = st.x - 92;
      states[i].g.appendChild(paint(svgEl('line', {
        x1: x1, y1: 100, x2: x2, y2: 100, 'stroke-width': 1.8, 'marker-end': fsmArrow
      }), null, C_MUTED));
      states[i].g.appendChild(svgText((x1 + x2) / 2, 92, S4_COND[i - 1], 'demo-x-mut', 9.5, 'middle'));
    });

    var zPlot = svgEl('g', {});
    zPlot.appendChild(paint(svgEl('rect', { x: 60, y: 168, width: 680, height: 150, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    zPlot.appendChild(svgText(72, 188, 'LLC 收到的 latent 时间线：纵轴 = z 的方向（与 FSM 实验台同一 simulateFSM）', 'demo-x-mut', 10.5));
    var px0 = 88,
      px1 = 712,
      py0 = 296,
      ph = 108;
    var pathWalk = [],
      pathStrike = [],
      pathCheer = [];
    S4_FRAMES.forEach(function (fr) {
      var x = px0 + (fr.t / (S4_FRAMES.length - 1)) * (px1 - px0);
      var y = py0 - (fr.zAngle / 6.283) * ph;
      if (fr.mode === 'WALK') pathWalk.push([x.toFixed(1), y.toFixed(1)]);
      else if (fr.mode === 'STRIKE') pathStrike.push([x.toFixed(1), y.toFixed(1)]);
      else pathCheer.push([x.toFixed(1), y.toFixed(1)]);
    });
    zPlot.appendChild(paint(svgEl('path', { d: polyPath(pathWalk), fill: 'none', 'stroke-width': 2.4 }), null, C_ACCENT));
    zPlot.appendChild(paint(svgEl('path', { d: polyPath(pathStrike), fill: 'none', 'stroke-width': 2.4 }), null, C_BAD));
    zPlot.appendChild(paint(svgEl('path', { d: polyPath(pathCheer), fill: 'none', 'stroke-width': 2.4 }), null, C_WARN));
    var head = paint(svgEl('line', { x1: px0, y1: 168, x2: px0, y2: 318, 'stroke-width': 1.6, 'stroke-dasharray': '3 3' }), null, C_MUTED);
    zPlot.appendChild(head);
    s.appendChild(zPlot);

    var chip = svgEl('g', {});
    chip.appendChild(paint(svgEl('rect', { x: 120, y: 334, width: 560, height: 30, rx: 15, 'stroke-width': 1 }), C_SURFACE, C_GOOD));
    chip.appendChild(paint(svgText(400, 353, '状态切换条件（距离、目标是否倒下）是人写的；动作质量全部由 LLC 保证', null, 11, 'middle'), C_GOOD));
    s.appendChild(chip);

    var foot = paint(svgText(400, 396, '走 → 攻击 → 庆祝：整条序列跑完，新增训练量 = 0', null, 15, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      states.forEach(function (st) { setOpacity(st.g, seg(t, st.at, st.at + 0.55)); });
      setOpacity(zPlot, seg(t, 4.2, 5.0));
      var prog = ease(seg(t, 5.4, 10.8));
      var idx = clamp(Math.floor(prog * (S4_FRAMES.length - 1)), 0, S4_FRAMES.length - 1);
      var hx = px0 + (S4_FRAMES[idx].t / (S4_FRAMES.length - 1)) * (px1 - px0);
      head.setAttribute('x1', hx.toFixed(1));
      head.setAttribute('x2', hx.toFixed(1));
      setOpacity(chip, seg(t, 10.0, 10.8));
      setOpacity(foot, seg(t, 11.4, 12.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 5: 三阶段训练闭环 ── */
  var S5_PHASES = [
    {
      title: '阶段一：训练 LLC',
      cmd: 'HumanoidAMPGetup',
      detail: 'Encoder E + π_LLC + 条件判别器 D(s,s′‖z)',
      color: C_ACCENT
    },
    {
      title: '阶段二：训练 HLC',
      cmd: 'HumanoidHeadingConditioned',
      detail: '冻结 LLC，PPO 只更新 HLC；奖励含 cos(ẑ, z_target)',
      color: C_GOOD
    },
    {
      title: '阶段三：FSM 推理',
      cmd: 'HumanoidStrikeFSM --test',
      detail: 'FSMScheduler 调度 z 来源，零训练',
      color: C_WARN
    }
  ];

  function buildSceneLoop() {
    var s = sceneSvg('CALM 三阶段串行：先 LLC 再 HLC 再 FSM 推理；阶段三不再更新任何权重');
    s.appendChild(svgText(60, 30, 'CALM 的训练与推理：三阶段串行，推理期零训练', 'demo-x-ink2', 13));

    var phaseArrow = K.arrowMarker(s, 'calm-x-arrow-phase', C_MUTED);
    var cards = S5_PHASES.map(function (ph, i) {
      /* 三张卡 + 冻结说明 + 落款要挤进 420 的画布：卡高 80、间距 96，
         第三张卡到 324 结束，下面的冻结说明（338 起）才不会压在它身上。 */
      var y = 52 + i * 96;
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: 60, y: y, width: 680, height: 80, rx: 10, 'stroke-width': 1.6 }), C_SURFACE2, ph.color));
      g.appendChild(paint(svgText(82, y + 26, ph.title, null, 13.5), ph.color));
      g.appendChild(svgText(82, y + 48, ph.detail, 'demo-x-mut', 11));
      g.appendChild(paint(svgText(718, y + 26, ph.cmd, 'demo-x-mono', 11, 'end'), ph.color));
      if (i > 0) {
        /* 「串行」要看得出先后：箭头从上一张卡指进这一张，并且挂在这一张的组里
           跟它一起淡入，不会先悬在空处指着还没出现的卡。 */
        g.appendChild(paint(svgEl('line', {
          x1: 400, y1: y - 16, x2: 400, y2: y - 2, 'stroke-width': 1.3, 'marker-end': phaseArrow
        }), null, C_MUTED));
      }
      s.appendChild(g);
      return { g: g, at: 0.6 + i * 2.8 };
    });

    var freeze = svgEl('g', {});
    freeze.appendChild(paint(svgEl('rect', { x: 120, y: 338, width: 560, height: 30, rx: 15, 'stroke-width': 1, 'stroke-dasharray': '5 4' }), C_SURFACE, C_GOOD));
    freeze.appendChild(paint(svgText(400, 357, '阶段二起 LLC / Encoder 冻结 —— HLC 学的是「选哪个 z」，不是关节怎么动', null, 11, 'middle'), C_GOOD));
    s.appendChild(freeze);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 384, 'CALM = ASE 的技能 latent + 方向舵 + FSM 组合', null, 15.5, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 408, '「做什么」由 latent 决定，「往哪做」由 HLC 决定，「什么时候换」由 FSM 决定', 'demo-x-mut', 11.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      cards.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.7)); });
      setOpacity(freeze, seg(t, 7.8, 8.6));
      setOpacity(foot, seg(t, 11.0, 11.8));
    }

    return { el: s, draw: draw };
  }

  var CALM_SCENES = [
    {
      title: 'ASE 缺方向',
      dur: 14,
      build: buildSceneProblem,
      cues: [
        { at: 0.3, s: 'ASE 已经能把大量技能压进连续 latent 空间 $z$ —— 高层策略只需要学「选哪个 $z$」。' },
        { at: 0.8, s: '但它有一个关键缺陷：**只知道「选什么技能」，不知道怎么控制技能的「方向」。**' },
        { at: 1.0, s: '给 $z_1$ = 冲刺、$z_2$ = 下蹲 —— 这两个 latent 都没有「朝左走」「朝目标走」的信息。' },
        { at: 2.6, s: '下游任务却必须知道方向：**朝左走、朝右走、追着蓝球跑、朝目标点蹲走**。' },
        { at: 3.4, s: '低层策略知道怎么跑，但不知道往哪跑 —— 传统做法是把目标信息塞进低层。' },
        { at: 5.0, s: '那样每个新任务都得重训 LLC，低层也会变得很复杂。' },
        { at: 6.2, s: 'CALM 的洞察：**方向可以不在 latent 里编码，而是在 latent 空间里选一个方向。**' },
        { at: 9.8, s: '$z$ 编码「做什么」，选哪个 $z$ 决定「朝哪个方向执行」—— 低层管质量，高层管方向。' }
      ]
    },
    {
      title: 'LLC 编 latent',
      dur: 15,
      build: buildSceneLlc,
      cues: [
        { at: 0.3, s: '第一层 LLC 的目标：训练 encoder-decoder，让 latent 能编码动作风格。' },
        { at: 0.8, s: '**Encoder** $E$ 把一段 motion clip 编码成 $z$；**Decoder** $\\pi_{LLC}$ 输入 $s_t + z$，输出 $a_t$。' },
        { at: 1.2, s: '走 / 蹲走 / 踢 / 庆祝 —— 每类动捕在 latent 空间里占一块区域，**可以点名**。' },
        { at: 3.8, s: '这和 ASE 的分水岭在这里：ASE 的 $z$ 从球面随机采；CALM 的 $z = E(\\text{动捕片段})$。' },
        { at: 5.4, s: '对抗模仿（条件判别器 $D(s,s\' \\| z)$）保证给定 $z$ 就复现对应技能。' },
        { at: 7.2, s: 'ASE 随机采的 $z$ 没有标签；CALM 可以直接写 **$E(\\text{踢腿动作})$** 拿到「踢」的 latent。' },
        { at: 10.4, s: '**能点名，才能免训练组合** —— 后面 FSM 写「切到攻击状态」靠的就是这一句。' }
      ]
    },
    {
      title: 'HLC 方向奖励',
      dur: 15,
      build: buildSceneHlc,
      cues: [
        { at: 0.3, s: '第二层 HLC：输入当前状态 $s_t$ 和任务目标，**输出一个 latent $z_t$** —— 不是直接输出动作。' },
        { at: 0.8, s: '方向奖励：**$r_{dir} = \\cos(z_{target}, z_t)$** —— 选出的 latent 和目标风格越接近，奖励越高。' },
        { at: 2.0, s: '允许锥：$\\cos \\ge 0.8$ 的那一段 —— HLC 被限制在 $z_{target}$ 附近微调，而不是随便换技能。' },
        { at: 4.0, s: '默认权重下 HLC 选中「' + skillByAngle(S3_BEST.angle).skill.name + '」，cos = **' + fmt(S3_BEST.cos, 3) + '**，任务奖励 **' + fmt(S3_BEST.task, 3) + '**。' },
        { at: 7.0, s: '如果把 $r_{dir}$ 权重拖到 0：HLC 会挑任务奖励最高的 latent，cos 只有 **' + fmt(hlcBestPick(S3_TGT, 1, 0).cos, 2) + '** —— 风格约束没了。' },
        { at: 10.2, s: 'HLC 的动作空间就是 latent 空间 —— 高层搜索空间比直接控几十个关节小几个数量级。' }
      ]
    },
    {
      title: 'FSM 零训练组合',
      dur: 16,
      build: buildSceneFsm,
      cues: [
        { at: 0.3, s: '推理期不需要再训练：用一个有限状态机组合 LLC 和 HLC。' },
        { at: 0.8, s: '**WALK**：HLC 输出 $z_t$，朝目标走；**STRIKE**：$z = E(\\text{攻击动作})$；**CHEER**：$z = E(\\text{庆祝动作})$。' },
        { at: 4.2, s: '下方 latent 时间线与下面 FSM 实验台用的是同一个 `simulateFSM()` —— 注意 **latent 是跳变的，不是渐变**。' },
        { at: 6.4, s: '换的只是 $z$ 的来源，动作质量全部由同一个 LLC 保证 —— 切换瞬间不会穿模。' },
        { at: 10.0, s: '状态切换条件（距离、目标是否倒下）是**手写的** —— 写错了没有任何机制会纠正它。' },
        { at: 11.4, s: '整条 **走 → 攻击 → 庆祝** 序列跑完，**新增训练量 = 0**。' }
      ]
    },
    {
      title: '三阶段闭环',
      dur: 16,
      build: buildSceneLoop,
      cues: [
        { at: 0.3, s: 'CALM 官方仓库 `calm/run.py` 把三阶段串起来：**先 LLC，再 HLC，最后 FSM 推理**。' },
        { at: 0.6, s: '阶段一 `HumanoidAMPGetup`：Encoder + $\\pi_{LLC}$ + **条件判别器** $D(s,s\' \\| z)$，PPO 更新三者。' },
        { at: 3.4, s: '阶段二 `HumanoidHeadingConditioned`：加载 LLC checkpoint 并**冻结**，PPO **只更新 HLC**。' },
        { at: 5.0, s: '奖励 = 任务奖励 + **$\\cos(\\hat z, z_{target})$** —— HLC 学的是选 latent，不是关节怎么动。' },
        { at: 7.8, s: '阶段三 `HumanoidStrikeFSM --test`：`FSMScheduler.step()` 按状态机选模式，**不再训练**。' },
        { at: 11.0, s: '一句话：**CALM = ASE 的技能 latent + 方向舵 + FSM 组合** —— 「做什么」「往哪做」「什么时候换」三层解耦。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '五幕动画：CALM 全流程速览',
      sub: '约 76 秒自动播放。空格播放/暂停，← → 换幕；画面里的数字与下面三个演示用的是同一份函数。',
      ariaLabel: 'CALM 五幕讲解动画',
      notes: [
        '取数依据：第三幕的 cos / 任务奖励 / 总奖励由下面「方向奖励」演示里的同一套 `hlcTaskR` / `hlcBestPick` 现算（目标风格 = 蹲走，$w_{task}=w_{dir}=1$）；' +
          '第四幕 latent 时间线来自同一个 `simulateFSM()`（range = 1.0 m，styleAngle = 蹲走）。',
        '第五幕的三条命令来自笔记「训练命令（NVIDIA 官方）」：`HumanoidAMPGetup` / `HumanoidHeadingConditioned` + `--llc_checkpoint` / `HumanoidStrikeFSM --test`。',
        '**这几幕里的玩具模型和下面三个演示同源**：latent 空间降到 2 维圆、四类技能占固定方向、任务奖励最偏好「走」、FSM 切换是俯视示意。' +
          '定性结论（ASE 缺方向、CALM latent 可点名、cos 是风格合同、FSM 只换 $z$ 来源、三阶段串行）成立，**具体数值不能和论文直接比**。'
      ],
      scenes: CALM_SCENES
    });
  }

  K.mount({
    'calm-explainer': buildExplainerDemo,
    'calm-encoder': buildEncoderDemo,
    'calm-hlc': buildHlcDemo,
    'calm-fsm': buildFsmDemo
  });
})();
