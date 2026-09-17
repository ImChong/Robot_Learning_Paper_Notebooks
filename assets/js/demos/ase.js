/* Interactive ASE demos for
 * papers/01_Foundational_RL/ASE_Adversarial_Skill_Embeddings_for_Large-Scale_Motion_Control.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["ase"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   ase-explainer — 五幕讲解动画：技能被绑死 → z 是球面上的方向 → latent collapse →
 *                   encoder + diversity 两道锁 → 训练闭环与下游只选 z
 *   ase-latent    — z ~ Uniform(S^63)：技能是球面上的一个方向，每 0~5s 重采样
 *   ase-encoder   — 没有 encoder reward，策略就把 z 当噪声忽略掉（latent collapse）
 *   ase-diversity — diversity_ratio = a_diff / z_diff，为什么目标值是 1.0
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
    registerRenderer = K.registerRenderer,
    mulberry32 = K.mulberry32;

  /* 论文的 latent 是 64 维单位球面上的点（源码里就是 normalize 一个高斯样本）。
     演示里把它降到 2 维单位圆 —— 「方向就是技能」这件事一维不够、二维刚好画得出来。 */
  function zOf(angle) {
    return [Math.cos(angle), Math.sin(angle)];
  }

  /* 玩具技能解码器：把方向 z 映射成四个行为通道。矩阵是写死的，代表「训练完
     以后策略已经把 latent 空间安排好了」，不同方向对应不同技能。 */
  var CHANNELS = [
    { key: 'speed', label: '前进速度', w: [0.9, 0.15], b: 0.55 },
    { key: 'turn', label: '转向', w: [-0.1, 0.95], b: 0.0 },
    { key: 'swing', label: '挥剑幅度', w: [-0.85, 0.3], b: 0.45 },
    { key: 'crouch', label: '重心高度', w: [0.2, -0.9], b: 0.5 }
  ];

  function decode(z, sens) {
    return CHANNELS.map(function (c) {
      return clamp(c.b + sens * (c.w[0] * z[0] + c.w[1] * z[1]), -1, 1.4);
    });
  }

  /* 训练时的 latent 时间线：每段长度 U(0, 5) 秒，段内 z 不变。演示 1 用它驱动
     「播放」，讲解动画第二幕用同一颗种子画出同一串分段。 */
  function latentSegments(seed, until) {
    var rng = mulberry32(seed);
    var acc = 0,
      ang = 0.6,
      segs = [];
    while (acc < until) {
      var dur = 0.4 + 4.6 * rng(); // latent_time_min 0 / max 5（下限留一点避免抖太快）
      segs.push({ t0: acc, t1: acc + dur, angle: ang });
      acc += dur;
      ang = 6.283 * rng();
    }
    return segs;
  }

  // ─── demo 1: latent 是球面上的一个方向 ───────────────────────────────────
  function buildLatentDemo(host) {
    var root = card(host, {
      title: '技能不是一个 ID，是单位球面上的一个方向',
      sub:
        '源码里 z 就是 normalize(高斯样本)，所以它永远落在球面上（`latent_dim: 64`，这里画成 2 维的圆）。' +
        '拖动角度看同一个策略怎么变成不同技能；按播放，latent 会像训练时那样每 0~5 秒重采样一次。'
    });

    var state = { angle: 0.6, t: 0, playing: false, seed: 21, sens: 1.0 };
    var timer = null;

    var ctrls = controlsRow(root);
    var angleSlider = slider(ctrls, {
      label: 'latent 方向 z（弧度）',
      min: 0,
      max: 6.28,
      step: 0.01,
      value: state.angle,
      format: function (v) {
        return fmt(v, 2) + ' rad';
      },
      onInput: function (v) {
        state.angle = v;
        render();
      }
    });
    slider(ctrls, {
      label: '策略对 z 的敏感度',
      min: 0,
      max: 1.2,
      step: 0.02,
      value: state.sens,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.sens = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    var playBtn = button(btns, '▶ 播放（每 0~5s 重采样）', function () {
      state.playing = !state.playing;
      playBtn.textContent = state.playing ? '⏸ 暂停' : '▶ 播放（每 0~5s 重采样）';
      if (state.playing) tick();
      else clearTimeout(timer);
    });
    button(btns, '重置', function () {
      state.t = 0;
      state.seed = 21;
      history.length = 0;
      render();
    });

    var history = [];
    function latentAt(t, seed) {
      var segs = latentSegments(seed, t + 5);
      for (var i = 0; i < segs.length; i++) {
        if (t >= segs[i].t0 && t < segs[i].t1) return { angle: segs[i].angle, segs: segs, idx: i };
      }
      return { angle: segs[0].angle, segs: segs, idx: 0 };
    }

    function tick() {
      state.t += 0.12;
      var cur = latentAt(state.t, state.seed);
      state.angle = cur.angle;
      angleSlider.set(state.angle, true);
      render();
      if (state.playing) timer = setTimeout(tick, 90);
    }

    var setLegend = legend(root, [
      { key: 'accent', text: '当前 latent z' },
      { key: 'good', text: '角色在地面上走出的轨迹' },
      { key: 'muted', text: '之前采过的 latent' }
    ]);

    var grid = stageGrid(root);
    var ballStage = stage(grid, 230);
    var traceStage = stage(grid, 230);

    var stats = statsRow(root);
    var sZ = stats.add('z（2 维示意）');
    var sNorm = stats.add('‖z‖');
    var sTime = stats.add('episode 时间');
    var sSkill = stats.add('当前最像的技能');
    var verdict = verdictBox(root);

    note(root, [
      '**为什么一定要归一化到球面**：`_sample_latents` 里 `normalize(torch.normal(...))` 保证 ‖z‖ ≡ 1。' +
        '如果让 z 自由取值，策略可以靠「把 z 缩小」来削弱它的影响；钉在球面上以后，z 之间只剩方向差别，' +
        'encoder 要恢复的也只是方向 —— 这也是为什么 encoder loss 写成余弦相似度 `−sum(z · ẑ)`。',
      '**重采样是在造「切换」训练数据**：`latent_time_min: 0.0` / `latent_time_max: 5.0`，每个 episode 内部就会换好几次技能。' +
        '策略因此见过大量「从挥剑切到闪避」这种过渡，下游 HRL 高层随便扔一个新 z 过来才不会摔倒。',
      '**敏感度滑块是下一个演示的伏笔**：把它拖到 0，四个通道立刻全部锁死在默认值 —— 这就是 latent collapse，' +
        '策略学会了无视 z。ASE 用 encoder reward 来防止它。',
      '**这是简化模型**：真实的 z 是 64 维，行为由 fc_3x1024 的 actor 解码；这里是 2 维 z 经一个写死的线性映射变成四个通道。' +
        '它只复现「方向 ↔ 技能」的对应关系，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var z = zOf(state.angle);
      var ch = decode(z, state.sens);

      if (!history.length || Math.abs(history[history.length - 1] - state.angle) > 1e-6) {
        history.push(state.angle);
        if (history.length > 24) history.shift();
      }

      sZ.set('[' + fmt(z[0], 2) + ', ' + fmt(z[1], 2) + ']', 'accent');
      sNorm.set(fmt(Math.sqrt(z[0] * z[0] + z[1] * z[1]), 3), 'good');
      sTime.set(fmt(state.t, 1) + ' s');
      var best = 0;
      ch.forEach(function (v, i) {
        if (Math.abs(v - CHANNELS[i].b) > Math.abs(ch[best] - CHANNELS[best].b)) best = i;
      });
      sSkill.set(state.sens < 0.05 ? '（分不出来）' : CHANNELS[best].label, state.sens < 0.05 ? 'bad' : 'accent');

      if (state.sens < 0.05) {
        verdict.set(
          '💀 latent collapse：敏感度 = 0，不管 z 转到哪里，四个通道都一动不动。' +
            'latent 空间还在，但策略根本没在用它 —— 这时候下游 HLC 输出什么 z 都没意义。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ z = [' +
            fmt(z[0], 2) +
            ', ' +
            fmt(z[1], 2) +
            ']：这个方向解码出来最突出的是「' +
            CHANNELS[best].label +
            '」。把角度连续转一圈，行为也连续地变 —— 这就是「技能是连续向量而不是离散 ID」的意思：' +
            '你可以在两个技能之间插值，得到一个中间技能。',
          'learning'
        );
      }

      // ── 左：单位圆上的 latent ──
      var g = begin(ballStage);
      var P = g.P;
      setLegend(P);
      var cx = g.w / 2,
        cy = g.h / 2,
        R = Math.min(g.w, g.h) / 2 - 32;
      g.ctx.save();
      g.ctx.strokeStyle = P.grid;
      g.ctx.lineWidth = 1;
      g.ctx.beginPath();
      g.ctx.arc(cx, cy, R, 0, Math.PI * 2);
      g.ctx.stroke();
      g.ctx.beginPath();
      g.ctx.moveTo(cx - R - 8, cy);
      g.ctx.lineTo(cx + R + 8, cy);
      g.ctx.moveTo(cx, cy - R - 8);
      g.ctx.lineTo(cx, cy + R + 8);
      g.ctx.stroke();
      g.ctx.restore();
      text(g.ctx, 'latent 空间 S¹（论文里是 S⁶³）', 10, 16, P.muted, 'left', '11px sans-serif');
      history.forEach(function (a, i) {
        var alpha = (i + 1) / history.length;
        dot(g.ctx, cx + R * Math.cos(a), cy - R * Math.sin(a), 2 + 2 * alpha, P.muted);
      });
      // 四个通道的「主方向」标在圆周上，让人看出哪块区域是哪种技能
      CHANNELS.forEach(function (c) {
        var a = Math.atan2(c.w[1], c.w[0]);
        var lx = cx + (R + 18) * Math.cos(a),
          ly = cy - (R + 18) * Math.sin(a);
        text(g.ctx, c.label, lx, ly, P.muted, Math.cos(a) < -0.3 ? 'right' : Math.cos(a) > 0.3 ? 'left' : 'center', '10px sans-serif');
      });
      line(g.ctx, [[cx, cy], [cx + R * z[0], cy - R * z[1]]], P.accent, 2.4);
      dot(g.ctx, cx + R * z[0], cy - R * z[1], 6, P.accent, P.surface2);

      // ── 右：这个 z 让角色走出什么轨迹 ──
      var g2 = begin(traceStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 40, r: 14, t: 22, b: 34 }, [-3, 3], [-3, 3]);
      axes(g2, p2, { xTicks: [-3, 0, 3], yTicks: [-3, 0, 3], xLabel: '地面 x（m）' });
      text(g2.ctx, '这个技能走出来的轨迹（俯视）', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var speed = ch[0],
        turn = ch[1],
        crouch = ch[3];
      var px = 0,
        py = 0,
        heading = Math.PI / 2,
        pts = [];
      for (var s = 0; s < 120; s++) {
        heading += turn * 0.05;
        px += speed * 0.06 * Math.cos(heading);
        py += speed * 0.06 * Math.sin(heading);
        pts.push([p2.sx(clamp(px, -3, 3)), p2.sy(clamp(py, -3, 3))]);
      }
      line(g2.ctx, pts, P2.good, 2.2);
      dot(g2.ctx, pts[0][0], pts[0][1], 4, P2.muted);
      dot(g2.ctx, pts[pts.length - 1][0], pts[pts.length - 1][1], 5, P2.good, P2.surface2);
      // 四个通道的读数条
      CHANNELS.forEach(function (c, i) {
        var y = p2.y1 + 14 + i * 15;
        var x0 = p2.x1 - 96;
        g2.ctx.fillStyle = P2.grid;
        g2.ctx.fillRect(x0, y - 4, 90, 8);
        var v = clamp((ch[i] + 1) / 2.4, 0, 1);
        g2.ctx.fillStyle = i === best && state.sens > 0.05 ? P2.accent : P2.muted;
        g2.ctx.fillRect(x0, y - 4, 90 * v, 8);
        text(g2.ctx, c.label, x0 - 6, y, P2.muted, 'right', '10px sans-serif');
      });
      void crouch;

      ballStage.canvas.setAttribute('aria-label', '单位圆上的 latent 方向与历史采样点');
      traceStage.canvas.setAttribute('aria-label', '当前 latent 解码出的地面轨迹与行为通道读数');
    });

    render();
  }

  // ─── demo 2: 没有 encoder reward 就会 latent collapse ────────────────────
  /* 玩具模型：策略写成 a(z) = a₀ + s·R z，s 就是「策略到底用不用 z」。
     - disc reward 只看动作自不自然：最自然的是数据集中心 a₀，所以它偏好 s = 0。
     - enc reward 是最优 encoder 能从 a 里恢复 z 的余弦相似度：s 越大越好（会饱和）。
     真实训练里这两股力量同时作用在网络权重上，这里把它压缩成一个标量 s。 */
  function discR(s) {
    // 动作离数据流形越远越不自然；s 越大，一个 batch 内动作铺得越开
    return Math.exp(-0.45 * s * s);
  }

  function encR(s, noise) {
    // 最优线性 encoder 的期望余弦相似度：信噪比 s²/(s²+σ²) 的单调函数
    var snr = (s * s) / (s * s + noise * noise);
    return Math.sqrt(snr);
  }

  /* 加权奖励在 s ∈ [0, 3] 上的最大值点。演示 2 与讲解动画第三、四幕共用这一个
     函数，两边的 s* 才不会各算一套。 */
  function bestSens(wDisc, wEnc, noise) {
    var best = 0,
      bestV = -Infinity;
    for (var i = 0; i <= 300; i++) {
      var s = (3 * i) / 300;
      var v = wDisc * discR(s) + wEnc * encR(s, noise);
      if (v > bestV) {
        bestV = v;
        best = s;
      }
    }
    return best;
  }

  function buildEncoderDemo(host) {
    var root = card(host, {
      title: '为什么非要加一个 encoder：不然策略会把 z 当噪声',
      sub:
        '默认配置是 `disc_reward_weight: 0.5` + `enc_reward_weight: 0.5`。把 enc 的权重拖到 0，' +
        '看策略的最优解怎么一路滑到「完全不理 z」；把 disc 拖到 0，又会得到一堆好区分但不像人的动作。'
    });

    var state = { wDisc: 0.5, wEnc: 0.5, noise: 0.35, seed: 5 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: 'disc_reward_weight（动作要自然）',
      min: 0,
      max: 1,
      step: 0.05,
      value: state.wDisc,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.wDisc = v;
        render();
      }
    });
    slider(ctrls, {
      label: 'enc_reward_weight（技能要可辨识）',
      min: 0,
      max: 1,
      step: 0.05,
      value: state.wEnc,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.wEnc = v;
        render();
      }
    });
    slider(ctrls, {
      label: '动作噪声 σ（策略的探索方差）',
      min: 0.05,
      max: 1,
      step: 0.05,
      value: state.noise,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.noise = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, 'MimicKit 默认 0.5 / 0.5', function () {
      state.wDisc = 0.5;
      state.wEnc = 0.5;
      render();
    });
    button(btns, '只有判别器（= AMP）', function () {
      state.wDisc = 1;
      state.wEnc = 0;
      render();
    });
    button(btns, '只有 encoder', function () {
      state.wDisc = 0;
      state.wEnc = 1;
      render();
    });

    var setLegend = legend(root, [
      { key: 'good', text: 'disc reward（越靠近数据流形越高）' },
      { key: 'warn', text: 'enc reward（越能反推出 z 越高）' },
      { key: 'accent', text: '加权总奖励' }
    ]);

    var grid = stageGrid(root);
    var curveStage = stage(grid, 225);
    var scatterStage = stage(grid, 225);

    var stats = statsRow(root);
    var sBest = stats.add('最优敏感度 s*');
    var sDisc = stats.add('此时 disc reward');
    var sEnc = stats.add('此时 enc reward');
    var sCos = stats.add('encoder 恢复 z 的余弦');
    var verdict = verdictBox(root);

    note(root, [
      '**collapse 不是 bug，是最优解**：只要奖励里没有任何一项要求「动作里必须看得出 z」，' +
        '把 z 忽略掉反而能让每一步都停在最自然的那个动作上 —— disc reward 更高。所以 AMP 加个 z 是学不出技能空间的。',
      '**encoder reward 就是在给互信息一个下界**：`_calc_enc_error` 里 `−sum(z · ẑ)` 最大化的是预测方向和目标方向的余弦；' +
        '策略只有把 z 的信息真的编进动作里，encoder 才可能猜对，于是这一项逼着 s 离开 0。',
      '**两边都不能单独用**：把 disc 拖到 0，最优 s 会一路冲高 —— 动作是好区分了，但已经飞出人类动作流形，' +
        '变成「怪异但可辨识」。0.5 / 0.5 是在这两种失效之间取平衡。',
      '**这是简化模型**：真实策略是 fc_3x1024，这里把「用不用 z」压成一个标量 s，encoder 用最优线性解的闭式表达。' +
        '趋势（enc 权重 → 0 时 s* → 0）成立，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      function total(s) {
        return state.wDisc * discR(s) + state.wEnc * encR(s, state.noise);
      }
      var best = bestSens(state.wDisc, state.wEnc, state.noise);

      sBest.set(fmt(best, 2), best < 0.15 ? 'bad' : best > 2 ? 'warn' : 'good');
      sDisc.set(fmt(discR(best), 3), discR(best) > 0.7 ? 'good' : 'warn');
      sEnc.set(fmt(encR(best, state.noise), 3), encR(best, state.noise) > 0.7 ? 'good' : 'warn');
      sCos.set(fmt(encR(best, state.noise), 3), encR(best, state.noise) > 0.7 ? 'good' : 'bad');

      if (best < 0.15) {
        verdict.set(
          '💀 latent collapse：enc 权重 = ' +
            fmt(state.wEnc, 2) +
            ' 时最优敏感度 s* ≈ ' +
            fmt(best, 2) +
            '，策略把 z 完全忽略了。右图里所有颜色的点堆在一起 —— 换任何 latent 都是同一个动作，' +
            '这正是「只把 z 拼进输入」会发生的事。',
          'frozen'
        );
      } else if (state.wDisc < 0.12) {
        verdict.set(
          '⚠️ 没有判别器兜底：s* ≈ ' +
            fmt(best, 2) +
            '，每个 z 都对应一个非常好认的动作，但它们已经离数据流形很远了 —— ' +
            '技能是分开了，代价是动作不像人。这就是论文说「只有 enc reward 会学出怪异但容易区分的动作」。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ s* ≈ ' +
            fmt(best, 2) +
            '：动作既留在自然流形上（disc ' +
            fmt(discR(best), 2) +
            '），又带着足够的技能信息让 encoder 认出来（cos ' +
            fmt(encR(best, state.noise), 2) +
            '）。右图里不同颜色的簇明显分开，但都还挤在同一片区域里 —— 这就是 ASE 想要的 latent 空间。',
          'learning'
        );
      }

      // ── 左：三条奖励曲线随 s 变化 ──
      var g = begin(curveStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 42, r: 14, t: 22, b: 34 }, [0, 3], [0, 1.05]);
      axes(g, p, {
        xTicks: [0, 1, 2, 3],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '策略对 z 的敏感度 s'
      });
      text(g.ctx, '两股力量的拉锯', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var dPts = [],
        ePts = [],
        tPts = [];
      for (var s2 = 0; s2 <= 120; s2++) {
        var x = (3 * s2) / 120;
        dPts.push([p.sx(x), p.sy(state.wDisc * discR(x))]);
        ePts.push([p.sx(x), p.sy(state.wEnc * encR(x, state.noise))]);
        tPts.push([p.sx(x), p.sy(total(x) / Math.max(1e-6, state.wDisc + state.wEnc))]);
      }
      line(g.ctx, dPts, P.good, 1.8, [5, 4]);
      line(g.ctx, ePts, P.warn, 1.8, [5, 4]);
      line(g.ctx, tPts, P.accent, 2.4);
      line(g.ctx, [[p.sx(best), p.y0], [p.sx(best), p.y1]], P.text, 1, [3, 3]);
      text(g.ctx, 's* = ' + fmt(best, 2), p.sx(best) + 5, p.y1 + 10, P.text, 'left', '11px monospace');

      // ── 右：动作空间里的技能簇 ──
      var g2 = begin(scatterStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 40, r: 14, t: 22, b: 34 }, [-3, 3], [-3, 3]);
      axes(g2, p2, { xTicks: [-3, 0, 3], yTicks: [-3, 0, 3], xLabel: '动作维度 1' });
      text(g2.ctx, '同一批 z 解码出的动作（颜色 = latent 方向）', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var rng = mulberry32(state.seed);
      var colors = [P2.accent, P2.good, P2.warn, P2.bad];
      for (var c = 0; c < 4; c++) {
        var ang = (c * Math.PI) / 2 + 0.4;
        var zc = zOf(ang);
        for (var n = 0; n < 26; n++) {
          var ax = best * zc[0] + state.noise * (rng() * 2 - 1);
          var ay = best * zc[1] + state.noise * (rng() * 2 - 1);
          dot(g2.ctx, p2.sx(clamp(ax, -3, 3)), p2.sy(clamp(ay, -3, 3)), 2.6, colors[c]);
        }
      }
      g2.ctx.save();
      g2.ctx.strokeStyle = P2.muted;
      g2.ctx.setLineDash([4, 4]);
      g2.ctx.beginPath();
      g2.ctx.arc(p2.sx(0), p2.sy(0), Math.abs(p2.sx(1.4) - p2.sx(0)), 0, Math.PI * 2);
      g2.ctx.stroke();
      g2.ctx.restore();
      text(g2.ctx, '虚线外 = 离数据流形太远', p2.x0 + 4, p2.y0 - 10, P2.muted, 'left', '10px sans-serif');

      curveStage.canvas.setAttribute('aria-label', 'disc 与 enc 奖励随策略敏感度变化的曲线');
      scatterStage.canvas.setAttribute('aria-label', '不同 latent 解码出的动作在动作空间的分布');
    });

    render();
  }

  // ─── demo 3: diversity_ratio ─────────────────────────────────────────────
  /* 源码那三行：`z_diff = 0.5 − 0.5·(z₁·z₂)`、`a_diff = mean((a₁ − a₂)²)`、
     `diversity_ratio = a_diff / (z_diff + 1e-5)`。两个 latent 只差一个夹角，
     所以 a_diff 和 z_diff 都正比于 (1 − cos)，比值只由敏感度决定 —— 演示 3 与
     讲解动画第四幕共用这一份计算。 */
  function divParts(angle, sens) {
    var cos = Math.cos(angle);
    var zDiff = 0.5 - 0.5 * cos;
    var aDiff = (sens * sens * (2 - 2 * cos)) / 2;
    return { cos: cos, zDiff: zDiff, aDiff: aDiff, ratio: aDiff / (zDiff + 1e-5) };
  }

  function buildDiversityDemo(host) {
    var root = card(host, {
      title: 'diversity loss：latent 差多远，动作就该差多远',
      sub:
        '源码算的是 `z_diff = 0.5 − 0.5·(z₁·z₂)`、`a_diff = mean((a₁ − a₂)²)`，然后逼 `a_diff / z_diff` 靠近 ' +
        '`diversity_tar: 1.0`。拖动两个 latent 的夹角，看这个比值怎么变。'
    });

    var state = { angle: 1.6, sens: 0.7, tar: 1.0, weight: 0.01 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '两个 latent 的夹角',
      min: 0,
      max: 3.14,
      step: 0.01,
      value: state.angle,
      format: function (v) {
        return fmt((v * 180) / Math.PI, 0) + '°';
      },
      onInput: function (v) {
        state.angle = v;
        render();
      }
    });
    slider(ctrls, {
      label: '策略对 z 的敏感度',
      min: 0,
      max: 1.6,
      step: 0.02,
      value: state.sens,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.sens = v;
        render();
      }
    });
    slider(ctrls, {
      label: 'diversity_tar（默认 1.0）',
      min: 0.2,
      max: 3,
      step: 0.05,
      value: state.tar,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.tar = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, 'latent 完全相同（0°）', function () {
      state.angle = 0.001;
      render();
    });
    button(btns, 'latent 正交（90°）', function () {
      state.angle = Math.PI / 2;
      render();
    });
    button(btns, 'latent 相反（180°）', function () {
      state.angle = 3.14;
      render();
    });
    button(btns, '模拟 collapse（敏感度 0）', function () {
      state.sens = 0;
      render();
    });

    var setLegend = legend(root, [
      { key: 'accent', text: 'diversity_ratio = a_diff / z_diff' },
      { key: 'warn', text: '目标值 diversity_tar' },
      { key: 'bad', text: 'diversity_loss = (tar − ratio)²' }
    ]);

    var grid = stageGrid(root);
    var geomStage = stage(grid, 225);
    var ratioStage = stage(grid, 225);

    var stats = statsRow(root);
    var sZd = stats.add('z_diff');
    var sAd = stats.add('a_diff');
    var sRatio = stats.add('diversity_ratio');
    var sLoss = stats.add('加权后的 loss（×0.01）');
    var verdict = verdictBox(root);

    note(root, [
      '**z_diff 是被设计成 [0, 1] 的**：`0.5 − 0.5·cos` 把「完全相同」映射成 0、「完全相反」映射成 1。' +
        '所以 ratio 的分母有个天然量纲，`diversity_tar: 1.0` 才有意义 —— 它在说「动作的差异应该和 latent 的差异成正比」。',
      '**它罚的是两头**：ratio 太小 = latent 变了动作没变（collapse）；ratio 太大 = 稍微动一下 latent 动作就面目全非，' +
        'latent 空间变得不连续、没法插值。平方误差把两种情况一起罚掉。',
      '**权重只有 0.01 是有道理的**：它是个正则项，不是主目标。拉大它会挤占 disc / enc reward 的位置，' +
        '策略为了凑比值可能牺牲动作质量。',
      '**这是简化模型**：真实的 a_diff 是整条动作向量的均方差，这里用 2 维示意；' +
        '而且真实训练里 a_diff 和 z 的关系不是严格线性的。定性关系成立，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var z1 = zOf(0.4);
      var z2 = zOf(0.4 + state.angle);
      var a1 = [state.sens * z1[0], state.sens * z1[1]];
      var a2 = [state.sens * z2[0], state.sens * z2[1]];
      var parts = divParts(state.angle, state.sens);
      var zDiff = parts.zDiff,
        aDiff = parts.aDiff,
        ratio = parts.ratio;
      var loss = (state.tar - ratio) * (state.tar - ratio);

      sZd.set(fmt(zDiff, 3), 'accent');
      sAd.set(fmt(aDiff, 3), 'accent');
      sRatio.set(fmt(ratio, 3), Math.abs(ratio - state.tar) < 0.25 ? 'good' : ratio < state.tar ? 'bad' : 'warn');
      sLoss.set(fmt(loss * state.weight, 4), loss * state.weight > 0.005 ? 'bad' : 'good');

      if (state.sens < 0.05) {
        verdict.set(
          '💀 ratio ≈ 0：两个 latent 差了 ' +
            fmt((state.angle * 180) / Math.PI, 0) +
            '°，动作却一模一样。diversity loss 立刻变成 (1 − 0)² = 1，把策略往「必须用 z」的方向推。' +
            '这就是这一项存在的全部理由。',
          'frozen'
        );
      } else if (Math.abs(ratio - state.tar) < 0.25) {
        verdict.set(
          '✅ ratio ≈ ' +
            fmt(ratio, 2) +
            '，正好落在 diversity_tar = ' +
            fmt(state.tar, 2) +
            ' 附近，loss 几乎为 0。latent 空间是「等速」的：走多远的 latent 距离，就换多大的动作差异，' +
            '下游策略在这个空间里做插值才靠谱。',
          'learning'
        );
      } else if (ratio > state.tar) {
        verdict.set(
          '⚠️ ratio ≈ ' +
            fmt(ratio, 2) +
            ' 偏大：latent 只挪了一点，动作就变化剧烈。技能是分得很开，但空间不连续 —— ' +
            '高层策略输出的 z 稍有抖动，底层动作就会突变。loss 同样会罚它。',
          'frozen'
        );
      } else {
        verdict.set(
          '⚠️ ratio ≈ ' +
            fmt(ratio, 2) +
            ' 偏小：动作的差异跟不上 latent 的差异，latent 空间正在往 collapse 的方向滑。',
          'frozen'
        );
      }

      // ── 左：两个 latent 与两个动作 ──
      var g = begin(geomStage);
      var P = g.P;
      setLegend(P);
      var cx = g.w / 2,
        cy = g.h / 2 + 6,
        R = Math.min(g.w, g.h) / 2 - 34;
      g.ctx.save();
      g.ctx.strokeStyle = P.grid;
      g.ctx.beginPath();
      g.ctx.arc(cx, cy, R, 0, Math.PI * 2);
      g.ctx.stroke();
      g.ctx.restore();
      text(g.ctx, '实线 = latent，箭头 = 解码出的动作', 10, 16, P.muted, 'left', '11px sans-serif');
      line(g.ctx, [[cx, cy], [cx + R * z1[0], cy - R * z1[1]]], P.accent, 2.2);
      line(g.ctx, [[cx, cy], [cx + R * z2[0], cy - R * z2[1]]], P.good, 2.2);
      dot(g.ctx, cx + R * z1[0], cy - R * z1[1], 5, P.accent, P.surface2);
      dot(g.ctx, cx + R * z2[0], cy - R * z2[1], 5, P.good, P.surface2);
      var k = R * 0.55;
      line(g.ctx, [[cx, cy], [cx + k * a1[0], cy - k * a1[1]]], P.accent, 1.4, [4, 3]);
      line(g.ctx, [[cx, cy], [cx + k * a2[0], cy - k * a2[1]]], P.good, 1.4, [4, 3]);
      line(g.ctx, [[cx + k * a1[0], cy - k * a1[1]], [cx + k * a2[0], cy - k * a2[1]]], P.bad, 2);
      text(
        g.ctx,
        'a_diff',
        cx + (k * (a1[0] + a2[0])) / 2,
        cy - (k * (a1[1] + a2[1])) / 2 - 10,
        P.bad,
        'center',
        '11px monospace'
      );

      // ── 右：ratio 随夹角变化 ──
      var g2 = begin(ratioStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [0, 180], [0, Math.max(3, state.tar * 1.6)]);
      axes(g2, p2, {
        xTicks: [0, 45, 90, 135, 180],
        yTicks: K.niceTicks(0, Math.max(3, state.tar * 1.6), 4),
        yFmt: function (t) {
          return fmt(t, 1);
        },
        xLabel: '两个 latent 的夹角（°）'
      });
      text(g2.ctx, 'ratio 应该是一条水平线', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var rPts = [],
        lPts = [];
      for (var i = 1; i <= 180; i++) {
        var rr = divParts((i * Math.PI) / 180, state.sens).ratio;
        rPts.push([p2.sx(i), p2.sy(clamp(rr, 0, p2.yd[1]))]);
        lPts.push([p2.sx(i), p2.sy(clamp((state.tar - rr) * (state.tar - rr), 0, p2.yd[1]))]);
      }
      line(g2.ctx, [[p2.x0, p2.sy(state.tar)], [p2.x1, p2.sy(state.tar)]], P2.warn, 1.6, [5, 4]);
      line(g2.ctx, lPts, P2.bad, 1.6, [4, 4]);
      line(g2.ctx, rPts, P2.accent, 2.4);
      dot(g2.ctx, p2.sx((state.angle * 180) / Math.PI), p2.sy(clamp(ratio, 0, p2.yd[1])), 4.5, P2.accent, P2.surface2);

      geomStage.canvas.setAttribute('aria-label', '两个 latent 与其解码动作的几何关系');
      ratioStage.canvas.setAttribute('aria-label', 'diversity ratio 随 latent 夹角变化的曲线');
    });

    render();
  }

  // ─── demo 4: the six-scene explainer animation ───────────────────────────
  /* A narrated storyboard of the whole method. ASE stacks six ideas on top of
     AMP (latent code / 为什么必须约束 / encoder / 两半奖励 / diversity /
     定期重采样), so the storyboard gets six scenes rather than the five the
     other notes use — squeezing encoder, the reward split and diversity into
     one 800×420 frame made all three unreadable.

     Every number on screen comes out of the same functions the three
     interactive demos above use (CHANNELS / decode / latentSegments / discR /
     encR / bestSens / divParts), so the animation can never drift away from
     them.

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

  /* ── scene 1: 技能被绑死在策略权重里 ──
     左边是正文「问题一」那张清单，右边是开头列的四个下游任务。 */
  var SKILLS = ['走', '跑', '跳', '躲闪', '挥砍', '格挡', '翻滚', '起身'];
  var TASKS = ['朝某个方向导航', '追着球跑', '拿着剑盾战斗', '跳过障碍'];

  function buildSceneBound() {
    var s = sceneSvg(
      '左边是「一段动捕对应一个策略」的清单，八个技能各自一个按钮；右边四个下游任务每个都要重训一遍低层控制器；' +
        '下方提醒动捕库本身是无标签、无分段的'
    );
    s.appendChild(svgText(60, 34, 'DeepMimic / AMP 之后：技能是「绑死」的', 'demo-x-ink2', 13.5));

    s.appendChild(paint(svgEl('rect', { x: 40, y: 54, width: 340, height: 252, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    s.appendChild(svgText(210, 78, '一段动捕 = 一个策略', 'demo-x-ink2', 12, 'middle'));
    var btns = SKILLS.map(function (name, i) {
      var x = i % 2 ? 214 : 62,
        y = 92 + Math.floor(i / 2) * 38;
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: x, y: y, width: 132, height: 30, rx: 6, 'stroke-width': 1.2 }), C_SURFACE, C_BORDER));
      g.appendChild(svgText(x + 66, y + 20, name, 'demo-x-ink2', 12, 'middle'));
      s.appendChild(g);
      return { g: g, at: 0.6 + i * 0.24 };
    });
    var pis = svgMath(210, 264, '\\pi_{\\text{walk}},\\ \\pi_{\\text{run}},\\ \\pi_{\\text{jump}},\\ \\cdots,\\ \\pi_{\\text{getup}}',
      { size: 11.5, anchor: 'middle', w: 320 }).setTone(C_MUTED);
    s.appendChild(pis);
    var leftNote = svgText(210, 290, '上千条动捕 → 上千个策略，运行时怎么切？', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(leftNote);

    s.appendChild(paint(svgEl('rect', { x: 410, y: 54, width: 350, height: 252, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    s.appendChild(svgText(585, 78, '而每来一个下游任务', 'demo-x-ink2', 12, 'middle'));
    var tasks = TASKS.map(function (name, i) {
      var y = 108 + i * 44;
      var g = svgEl('g', {});
      g.appendChild(svgText(428, y + 4, name, 'demo-x-ink2', 11.5));
      g.appendChild(paint(svgEl('rect', { x: 606, y: y - 12, width: 142, height: 24, rx: 6, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), C_SURFACE, C_BAD));
      g.appendChild(paint(svgText(677, y + 4, '重训一遍低层', null, 10.5, 'middle'), C_BAD));
      s.appendChild(g);
      return { g: g, at: 3.2 + i * 0.6 };
    });

    var chip = svgEl('g', {});
    chip.appendChild(paint(svgEl('rect', { x: 90, y: 318, width: 620, height: 30, rx: 15, 'stroke-width': 1, 'stroke-dasharray': '5 4' }), C_SURFACE, C_MUTED));
    chip.appendChild(svgText(400, 337, '而且动捕库是无标签的：没人告诉你哪段是 dodge、哪段是 kick，也没人先切好技能边界', 'demo-x-mut', 10.5, 'middle'));
    s.appendChild(chip);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 378, '别再存 1000 个按钮，改存一个「动作控制杆」空间', null, 15.5, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 402, '从大规模、无结构的动作数据里，学出一个可复用、可调用的技能表示', 'demo-x-mut', 11.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      btns.forEach(function (b) { setOpacity(b.g, seg(t, b.at, b.at + 0.3)); });
      setOpacity(pis, seg(t, 2.4, 3.0));
      setOpacity(leftNote, seg(t, 2.8, 3.4));
      tasks.forEach(function (k) { setOpacity(k.g, seg(t, k.at, k.at + 0.45)); });
      setOpacity(chip, seg(t, 6.4, 7.2));
      setOpacity(foot, seg(t, 9.6, 10.6));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 2: 技能 = 单位球面上的一个方向，而且每 0~5 s 换一个 ──
     四个停靠点的读数由 decode() 现算，下方的分段来自 latentSegments(21) ——
     和「技能不是一个 ID」那个演示按播放时走的是同一串分段。 */
  var S2_STOPS = [
    { a: 0.65, say: '快步前冲，稍微带一点转向' },
    { a: 1.60, say: '走到两者中间：边走边挥剑，插值出来的中间技能' },
    { a: 2.55, say: '几乎不再前进，改成原地大幅挥剑' },
    { a: 4.93, say: '压低重心，往另一边绕' }
  ];
  var S2_SEGS = latentSegments(21, 11);
  var S2_SPAN = S2_SEGS[S2_SEGS.length - 1].t1;
  var S2_TL0 = 60, S2_TL1 = 740;
  var S2_UNIT = 110, S2_ZERO = 470 + S2_UNIT;

  function buildSceneLatent() {
    var s = sceneSvg(
      '左边把 latent 空间画成单位圆，箭头是当前的 z；右边是同一个策略解码出的四个行为通道读数；' +
        '下方是训练时每 0 到 5 秒重采样一次 latent 的时间线'
    );
    s.appendChild(svgText(60, 32, 'ASE 的策略多了一个输入 z，它是单位球面上的一个方向', 'demo-x-ink2', 13));
    var formula = svgMath(400, 62,
      'a_t \\sim \\pi(a_t \\mid s_t, z), \\qquad z \\sim \\text{Uniform}(S^{63}), \\qquad \\lVert z \\rVert = 1',
      { size: 13, anchor: 'middle', cls: 'demo-x-ink2', w: 660 });
    s.appendChild(formula);

    var CX = 178, CY = 204, R = 90;
    var ring = svgEl('g', {});
    ring.appendChild(paint(svgEl('circle', { cx: CX, cy: CY, r: R, fill: 'none', 'stroke-width': 1.2 }), null, C_BORDER));
    ring.appendChild(paint(svgEl('line', { x1: CX - R - 8, y1: CY, x2: CX + R + 8, y2: CY, 'stroke-width': 1 }), null, C_BORDER));
    ring.appendChild(paint(svgEl('line', { x1: CX, y1: CY - R - 8, x2: CX, y2: CY + R + 8, 'stroke-width': 1 }), null, C_BORDER));
    ring.appendChild(svgText(CX, 104, '‖z‖ ≡ 1（这里画成 S¹，论文是 S⁶³）', 'demo-x-mut', 10.5, 'middle'));
    CHANNELS.forEach(function (c) {
      var a = Math.atan2(c.w[1], c.w[0]);
      ring.appendChild(svgText(CX + (R + 20) * Math.cos(a), CY - (R + 20) * Math.sin(a) + 3, c.label, 'demo-x-mut', 10,
        Math.cos(a) < -0.3 ? 'end' : Math.cos(a) > 0.3 ? 'start' : 'middle'));
    });
    s.appendChild(ring);

    /* 一小截尾迹：让「连续转动 z，行为连续地变」这件事在静止的一帧里也看得见。 */
    var trail = [];
    for (var k = 0; k < 18; k++) {
      var d = paint(svgEl('circle', { cx: -20, cy: -20, r: 2.4 }), C_MUTED);
      s.appendChild(d);
      trail.push(d);
    }
    var arm = paint(svgEl('line', { x1: CX, y1: CY, x2: CX, y2: CY, 'stroke-width': 2.4 }), null, C_ACCENT);
    var tip = paint(svgEl('circle', { cx: CX, cy: CY, r: 6, 'stroke-width': 1.6 }), C_ACCENT, C_SURFACE2);
    s.appendChild(arm);
    s.appendChild(tip);
    var zTx = paint(svgText(CX, 322, '', 'demo-x-mono', 11.5, 'middle'), C_ACCENT);
    s.appendChild(zTx);

    var barHead = svgText(340, 108, '同一个策略解码出的四个行为通道', 'demo-x-mut', 10.5);
    s.appendChild(barHead);
    var zeroLine = paint(svgEl('line', { x1: S2_ZERO, y1: 122, x2: S2_ZERO, y2: 272, 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_BORDER);
    s.appendChild(zeroLine);
    var bars = CHANNELS.map(function (c, i) {
      var y = 140 + i * 38;
      s.appendChild(svgText(462, y + 4, c.label, 'demo-x-ink2', 11, 'end'));
      var rect = paint(svgEl('rect', { x: S2_ZERO, y: y - 8, width: 0, height: 16, rx: 2, opacity: 0.9 }), C_ACCENT);
      s.appendChild(rect);
      var tx = paint(svgText(766, y + 4, '', 'demo-x-mono', 11, 'end'), C_ACCENT);
      s.appendChild(tx);
      return { rect: rect, tx: tx };
    });
    var sayTx = paint(svgText(600, 300, '', null, 12.5, 'middle'), C_GOOD);
    s.appendChild(sayTx);

    var tl = svgEl('g', {});
    tl.appendChild(svgText(60, 328, '训练时不是一个 episode 用一个技能到底：latent_time_min 0.0 / latent_time_max 5.0', 'demo-x-mut', 10.5));
    tl.appendChild(paint(svgEl('rect', { x: S2_TL0, y: 338, width: S2_TL1 - S2_TL0, height: 18, rx: 3, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    var segNodes = S2_SEGS.map(function (sg, i) {
      var x0 = S2_TL0 + (sg.t0 / S2_SPAN) * (S2_TL1 - S2_TL0);
      var x1 = S2_TL0 + (sg.t1 / S2_SPAN) * (S2_TL1 - S2_TL0);
      var rect = paint(svgEl('rect', { x: x0, y: 338, width: x1 - x0, height: 18, rx: 3, opacity: 0.28 }), i % 2 ? C_GOOD : C_ACCENT);
      tl.appendChild(rect);
      tl.appendChild(paint(svgText((x0 + x1) / 2, 374, fmt(sg.t1 - sg.t0, 2) + ' s', 'demo-x-mono', 10, 'middle'), C_MUTED));
      return rect;
    });
    var head = paint(svgEl('line', { x1: S2_TL0, y1: 332, x2: S2_TL0, y2: 362, 'stroke-width': 1.8 }), null, C_BAD);
    tl.appendChild(head);
    s.appendChild(tl);

    var foot = paint(svgText(400, 404, '技能不再是离散 ID，而是连续向量 —— 两个技能之间可以插值', null, 14.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    /* 前 10.8 秒在四个停靠点之间平滑扫过（每个点停 1.1 s、扫 0.85 s），之后
       交给下方的时间线，z 像训练时那样到期就跳一次。 */
    var HOLD = 1.1, SWEEP = 0.85, STEP = HOLD + SWEEP, TL_AT = 10.8;

    function angleAt(t) {
      if (t >= TL_AT) {
        var et = clamp(((t - 11.0) / 6.0) * S2_SPAN, 0, S2_SPAN);
        for (var i = 0; i < S2_SEGS.length; i++) {
          if (et < S2_SEGS[i].t1) return { a: S2_SEGS[i].angle, et: et, idx: i };
        }
      }
      var u = Math.max(t - 1.0, 0) / STEP;
      var j = clamp(Math.floor(u), 0, S2_STOPS.length - 1);
      var frac = clamp((u - j) * STEP - HOLD, 0, SWEEP) / SWEEP;
      var from = S2_STOPS[j].a;
      var to = S2_STOPS[Math.min(j + 1, S2_STOPS.length - 1)].a;
      return { a: from + (to - from) * ease(frac), et: -1, idx: j };
    }

    function draw(t) {
      setOpacity(formula, seg(t, 0.2, 0.9));
      setOpacity(ring, seg(t, 0.6, 1.2));
      setOpacity(barHead, seg(t, 0.9, 1.5));
      setOpacity(zeroLine, seg(t, 1.2, 1.8));

      var cur = angleAt(t);
      var z = zOf(cur.a);
      var ch = decode(z, 1.0);

      arm.setAttribute('x2', (CX + R * z[0]).toFixed(1));
      arm.setAttribute('y2', (CY - R * z[1]).toFixed(1));
      tip.setAttribute('cx', (CX + R * z[0]).toFixed(1));
      tip.setAttribute('cy', (CY - R * z[1]).toFixed(1));
      zTx.textContent = 'z = [' + fmt(z[0], 2) + ', ' + fmt(z[1], 2) + ']';
      setOpacity(zTx, seg(t, 1.2, 1.8));
      trail.forEach(function (d, i) {
        var q = zOf(angleAt(Math.max(t - 0.09 * (i + 1), 0)).a);
        d.setAttribute('cx', (CX + R * q[0]).toFixed(1));
        d.setAttribute('cy', (CY - R * q[1]).toFixed(1));
        setOpacity(d, (1 - i / trail.length) * 0.45 * seg(t, 1.2, 1.8));
      });

      bars.forEach(function (b, i) {
        var w = ch[i] * S2_UNIT;
        b.rect.setAttribute('x', (w < 0 ? S2_ZERO + w : S2_ZERO).toFixed(1));
        b.rect.setAttribute('width', Math.abs(w).toFixed(1));
        paint(b.rect, ch[i] < 0 ? C_WARN : C_ACCENT);
        b.tx.textContent = fmt(ch[i], 2);
        paint(b.tx, ch[i] < 0 ? C_WARN : C_ACCENT);
        setOpacity(b.rect, seg(t, 1.2, 1.8));
        setOpacity(b.tx, seg(t, 1.2, 1.8));
      });

      if (t < TL_AT) {
        sayTx.textContent = S2_STOPS[cur.idx].say;
        setOpacity(sayTx, seg(t, 1.6, 2.1));
      } else {
        sayTx.textContent = '第 ' + (cur.idx + 1) + ' 段：持续 ' + fmt(S2_SEGS[cur.idx].t1 - S2_SEGS[cur.idx].t0, 2) + ' s';
        setOpacity(sayTx, 1);
      }

      setOpacity(tl, seg(t, 10.4, 11.0));
      if (t >= 11.0) {
        var hx = S2_TL0 + (cur.et / S2_SPAN) * (S2_TL1 - S2_TL0);
        head.setAttribute('x1', hx.toFixed(1));
        head.setAttribute('x2', hx.toFixed(1));
        segNodes.forEach(function (n, i) { n.setAttribute('opacity', i === cur.idx ? 0.72 : 0.28); });
      }
      setOpacity(foot, seg(t, 15.6, 16.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 3: 只把 z 拼进输入 → latent collapse ──
     曲线、s* 与散点都走 discR / encR / bestSens，与下面「为什么非要加一个
     encoder」那个演示同源；散点用的也是它那颗种子。 */
  var S3_LAZY = ['\\text{只看当前状态 } s_t', '\\text{把所有技能混成一个平均策略}', '\\text{把 } z \\text{ 当噪声忽略掉}'];
  var S3_NOISE = 0.35;
  var S3_PX0 = 100, S3_PX1 = 390, S3_PY0 = 300, S3_PH = 138;
  var S3_SX = 630, S3_SY = 218, S3_SU = 34;
  var S3_SLIDE0 = 4.6, S3_SLIDE1 = 8.2, S3_S_FROM = 1.2;

  function s3x(v) {
    return S3_PX0 + (v / 3) * (S3_PX1 - S3_PX0);
  }

  function s3y(r) {
    return S3_PY0 - r * S3_PH;
  }

  function buildSceneCollapse() {
    var s = sceneSvg(
      '上方三个方框是网络忽略 latent 的三种偷懒方式；左下是只有判别器奖励时的奖励曲线，最优敏感度一路滑到 0；' +
        '右下四种颜色的动作样本随之堆成一坨'
    );
    s.appendChild(svgText(60, 32, '如果只是把 z 拼到输入里，会发生什么？', 'demo-x-ink2', 13.5));

    var lazy = S3_LAZY.map(function (str, i) {
      var cx = 178 + i * 222;
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: cx - 107, y: 52, width: 214, height: 30, rx: 6, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), C_SURFACE, C_MUTED));
      g.appendChild(svgMath(cx, 71, str, { size: 11, anchor: 'middle', w: 208 }).setTone(C_MUTED));
      s.appendChild(g);
      return { g: g, at: 0.5 + i * 0.7 };
    });

    var plotG = svgEl('g', {});
    plotG.appendChild(svgText(S3_PX0, 120, '只有 disc reward 时的奖励曲线（= AMP 里加个 z）', 'demo-x-mut', 10.5));
    plotG.appendChild(paint(svgEl('line', { x1: S3_PX0, y1: S3_PY0, x2: S3_PX1, y2: S3_PY0, 'stroke-width': 1.2 }), null, C_BORDER));
    plotG.appendChild(paint(svgEl('line', { x1: S3_PX0, y1: S3_PY0, x2: S3_PX0, y2: s3y(1.06), 'stroke-width': 1.2 }), null, C_BORDER));
    [0, 1, 2, 3].forEach(function (v) {
      plotG.appendChild(svgText(s3x(v), 316, String(v), 'demo-x-mut', 10, 'middle'));
    });
    [0, 0.5, 1].forEach(function (r) {
      plotG.appendChild(svgText(S3_PX0 - 6, s3y(r) + 4, fmt(r, 1), 'demo-x-mut', 10, 'end'));
    });
    plotG.appendChild(svgText(245, 334, '策略对 z 的敏感度 s', 'demo-x-mut', 10, 'middle'));
    var dPts = [];
    for (var i = 0; i <= 120; i++) {
      var x = (3 * i) / 120;
      dPts.push([s3x(x).toFixed(1), s3y(discR(x)).toFixed(1)]);
    }
    plotG.appendChild(paint(svgEl('path', { d: polyPath(dPts), fill: 'none', 'stroke-width': 2.4 }), null, C_GOOD));
    var slide = paint(svgEl('line', { x1: 0, y1: S3_PY0, x2: 0, y2: s3y(1.06), 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_BAD);
    var slideDot = paint(svgEl('circle', { r: 5.5, 'stroke-width': 1.6 }), C_BAD, C_SURFACE);
    plotG.appendChild(slide);
    plotG.appendChild(slideDot);
    s.appendChild(plotG);

    var scatG = svgEl('g', {});
    scatG.appendChild(svgText(S3_SX, 120, '四个不同 z 解码出的动作（颜色 = latent 方向）', 'demo-x-mut', 10.5, 'middle'));
    scatG.appendChild(paint(svgEl('rect', { x: S3_SX - 110, y: S3_SY - 82, width: 220, height: 164, rx: 6, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    var rng = mulberry32(5);
    var TONES = [C_ACCENT, C_GOOD, C_WARN, C_BAD];
    var cloud = [];
    for (var c = 0; c < 4; c++) {
      var zc = zOf((c * Math.PI) / 2 + 0.4);
      for (var n = 0; n < 24; n++) {
        var node = paint(svgEl('circle', { r: 2.6 }), TONES[c]);
        scatG.appendChild(node);
        cloud.push({ node: node, zc: zc, jx: rng() * 2 - 1, jy: rng() * 2 - 1 });
      }
    }
    s.appendChild(scatG);

    var readouts = [
      { cx: 175, label: '最优敏感度 s*' },
      { cx: 400, label: 'disc reward' },
      { cx: 625, label: 'encoder 恢复 z 的余弦' }
    ].map(function (r) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: r.cx - 100, y: 348, width: 200, height: 30, rx: 6, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
      g.appendChild(svgText(r.cx - 90, 367, r.label, 'demo-x-mut', 10));
      var tx = paint(svgText(r.cx + 90, 367, '', 'demo-x-mono', 11.5, 'end'), C_BAD);
      g.appendChild(tx);
      s.appendChild(g);
      return { g: g, tx: tx };
    });

    var foot = paint(svgText(400, 404, 'latent collapse 不是训练出 bug，而是这个奖励下的最优解', null, 15, 'middle'), C_BAD);
    s.appendChild(foot);

    /* 只有 disc reward 时 bestSens 返回 0：让一个点从 s = 1.2 顺着曲线爬到那里，
       散点的簇心同步收拢。 */
    var S3_TARGET = bestSens(1, 0, S3_NOISE);

    function draw(t) {
      lazy.forEach(function (l) { setOpacity(l.g, seg(t, l.at, l.at + 0.4)); });
      setOpacity(plotG, seg(t, 2.6, 3.2));
      setOpacity(scatG, seg(t, 3.2, 3.8));

      var sNow = S3_S_FROM + (S3_TARGET - S3_S_FROM) * ease(seg(t, S3_SLIDE0, S3_SLIDE1));
      slide.setAttribute('x1', s3x(sNow).toFixed(1));
      slide.setAttribute('x2', s3x(sNow).toFixed(1));
      slideDot.setAttribute('cx', s3x(sNow).toFixed(1));
      slideDot.setAttribute('cy', s3y(discR(sNow)).toFixed(1));

      cloud.forEach(function (p) {
        p.node.setAttribute('cx', (S3_SX + S3_SU * (sNow * p.zc[0] + S3_NOISE * p.jx)).toFixed(1));
        p.node.setAttribute('cy', (S3_SY - S3_SU * (sNow * p.zc[1] + S3_NOISE * p.jy)).toFixed(1));
      });

      readouts[0].tx.textContent = fmt(sNow, 2);
      readouts[1].tx.textContent = fmt(discR(sNow), 3);
      readouts[2].tx.textContent = fmt(encR(sNow, S3_NOISE), 3);
      paint(readouts[1].tx, discR(sNow) > 0.7 ? C_GOOD : C_WARN);
      paint(readouts[2].tx, encR(sNow, S3_NOISE) > 0.5 ? C_GOOD : C_BAD);
      readouts.forEach(function (r) { setOpacity(r.g, seg(t, 4.2, 4.8)); });

      setOpacity(foot, seg(t, 9.4, 10.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 4: 第一道锁 —— encoder 把 z 逼回动作里 ──
     三张结果卡的数字全部由 bestSens / discR / encR 在同一个噪声 σ = 0.35 下现算。 */
  var S4_NODES = [
    { x: 105, w: 150, tex: '\\pi(a \\mid s, z)', sub: '把 z 编进动作' },
    { x: 300, w: 180, t: '行为片段 o_disc', sub: '相邻两帧 (s, s′)' },
    { x: 500, w: 150, tex: 'E(o_{disc}) \\to \\hat z', sub: 'enc_net fc_2x1024' },
    { x: 692, w: 150, tex: 'r_{enc} = z \\cdot \\hat z', sub: '余弦对齐，越大越好' }
  ];
  var S4_EDGES = [
    [[180, 98], [210, 98]],
    [[390, 98], [425, 98]],
    [[575, 98], [617, 98]]
  ];
  var S4_BACK = [[692, 122], [692, 140], [105, 140], [105, 124]];
  var S4_PX0 = 92, S4_PX1 = 392, S4_PY0 = 340, S4_PH = 118;

  function s4x(v) {
    return S4_PX0 + (v / 3) * (S4_PX1 - S4_PX0);
  }

  function s4y(r) {
    return S4_PY0 - r * S4_PH;
  }

  function buildSceneEncoder() {
    var s = sceneSvg(
      '上方是 encoder 的信息闭环：策略把 z 编进动作，编码器再从动作片段里把它反推回来；' +
        '左下是三条奖励曲线与最优敏感度从 0 挪到 0.55 的过程，右下三张卡是三种权重配比的结局'
    );
    var arrow = K.arrowMarker(s, 'ase-x-arrow-enc', C_MUTED);
    var backArrow = K.arrowMarker(s, 'ase-x-arrow-back', C_WARN);
    s.appendChild(svgText(60, 32, '第一道锁：encoder 必须能从动作里把 z 反推出来', 'demo-x-ink2', 13.5));

    var edges = S4_EDGES.map(function (pts) {
      var p = paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': 1.8, 'marker-end': arrow }), null, C_MUTED);
      s.appendChild(p);
      return p;
    });
    var boxes = S4_NODES.map(function (n) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: n.x - n.w / 2, y: 74, width: n.w, height: 48, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_BORDER));
      g.appendChild(n.tex
        ? svgMath(n.x, 94, n.tex, { size: 11.5, anchor: 'middle', w: n.w })
        : svgText(n.x, 94, n.t, 'demo-x-mono', 11.5, 'middle'));
      g.appendChild(svgText(n.x, 112, n.sub, 'demo-x-mut', 10, 'middle'));
      s.appendChild(g);
      return g;
    });

    var back = svgEl('g', {});
    back.appendChild(paint(svgEl('path', {
      d: polyPath(S4_BACK), fill: 'none', 'stroke-width': 1.6,
      'stroke-dasharray': '5 4', 'marker-end': backArrow
    }), null, C_WARN));
    back.appendChild(paint(svgText(400, 158, 'encoder 猜不对 → r_enc 低 → 策略被罚：z 的信息必须真的进到动作里', null, 11, 'middle'), C_WARN));
    s.appendChild(back);

    var formula = svgMath(400, 188,
      'r = w_{disc}\\, r_{disc} + w_{enc}\\, r_{enc} + w_{task}\\, r_{task} \\;\\Longrightarrow\\; r = 0.5\\, r_{disc} + 0.5\\, r_{enc}',
      { size: 12, anchor: 'middle', cls: 'demo-x-ink2', w: 700 });
    s.appendChild(formula);

    var plotG = svgEl('g', {});
    plotG.appendChild(svgText(S4_PX0, 218, '两股力量的拉锯（横轴 = 敏感度 s）', 'demo-x-mut', 10.5));
    plotG.appendChild(paint(svgEl('line', { x1: S4_PX0, y1: S4_PY0, x2: S4_PX1, y2: S4_PY0, 'stroke-width': 1.2 }), null, C_BORDER));
    plotG.appendChild(paint(svgEl('line', { x1: S4_PX0, y1: S4_PY0, x2: S4_PX0, y2: s4y(1.06), 'stroke-width': 1.2 }), null, C_BORDER));
    [0, 1, 2, 3].forEach(function (v) {
      plotG.appendChild(svgText(s4x(v), 354, String(v), 'demo-x-mut', 10, 'middle'));
    });
    var dPts = [], ePts = [], tPts = [];
    for (var i = 0; i <= 120; i++) {
      var x = (3 * i) / 120;
      dPts.push([s4x(x).toFixed(1), s4y(0.5 * discR(x)).toFixed(1)]);
      ePts.push([s4x(x).toFixed(1), s4y(0.5 * encR(x, S3_NOISE)).toFixed(1)]);
      tPts.push([s4x(x).toFixed(1), s4y(0.5 * discR(x) + 0.5 * encR(x, S3_NOISE)).toFixed(1)]);
    }
    plotG.appendChild(paint(svgEl('path', { d: polyPath(dPts), fill: 'none', 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }), null, C_GOOD));
    plotG.appendChild(paint(svgEl('path', { d: polyPath(ePts), fill: 'none', 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }), null, C_WARN));
    plotG.appendChild(paint(svgEl('path', { d: polyPath(tPts), fill: 'none', 'stroke-width': 2.4 }), null, C_ACCENT));
    plotG.appendChild(paint(svgText(S4_PX1, 232, 'disc', 'demo-x-mono', 10, 'end'), C_GOOD));
    plotG.appendChild(paint(svgText(S4_PX1, 246, 'enc', 'demo-x-mono', 10, 'end'), C_WARN));
    plotG.appendChild(paint(svgText(S4_PX1, 260, '加权和', 'demo-x-mono', 10, 'end'), C_ACCENT));
    var mark = paint(svgEl('line', { x1: 0, y1: S4_PY0, x2: 0, y2: s4y(1.06), 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_ACCENT);
    var markDot = paint(svgEl('circle', { r: 5.5, 'stroke-width': 1.6 }), C_ACCENT, C_SURFACE);
    var markTx = paint(svgText(0, 0, '', 'demo-x-mono', 11, 'start'), C_ACCENT);
    plotG.appendChild(mark);
    plotG.appendChild(markDot);
    plotG.appendChild(markTx);
    s.appendChild(plotG);

    var S4_BEST_DISC = bestSens(1, 0, S3_NOISE);
    var S4_BEST_BOTH = bestSens(0.5, 0.5, S3_NOISE);
    var S4_BEST_ENC = bestSens(0, 1, S3_NOISE);
    var cards = [
      {
        y: 200, c: C_BAD, t: '只有 disc（AMP 加个 z）',
        v: 's* = ' + fmt(S4_BEST_DISC, 2) + '　cos = ' + fmt(encR(S4_BEST_DISC, S3_NOISE), 3),
        s: 'latent collapse：动作里看不出 z'
      },
      {
        y: 250, c: C_GOOD, t: 'disc 0.5 + enc 0.5（MimicKit 默认）',
        v: 's* = ' + fmt(S4_BEST_BOTH, 2) + '　disc = ' + fmt(discR(S4_BEST_BOTH), 3) + '　cos = ' + fmt(encR(S4_BEST_BOTH, S3_NOISE), 3),
        s: '既留在自然流形上，又认得出是哪个技能'
      },
      {
        y: 300, c: C_WARN, t: '只有 enc',
        v: 's* = ' + fmt(S4_BEST_ENC, 2) + '　disc = ' + fmt(discR(S4_BEST_ENC), 3),
        s: '怪异但好区分：已经飞出人类动作流形'
      }
    ].map(function (c, i) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: 430, y: c.y, width: 340, height: 44, rx: 8, 'stroke-width': 1.4, 'stroke-dasharray': i === 1 ? '' : '4 3' }), C_SURFACE, c.c));
      g.appendChild(paint(svgText(442, c.y + 17, c.t, null, 11, 'start'), c.c));
      g.appendChild(paint(svgText(758, c.y + 17, c.v, 'demo-x-mono', 10.5, 'end'), c.c));
      g.appendChild(svgText(442, c.y + 34, c.s, 'demo-x-mut', 10));
      s.appendChild(g);
      return { g: g, at: 9.6 + i * 1.3 };
    });

    var foot = paint(svgText(400, 396, 'encoder reward 就是在给「动作里含多少 z 的信息」定一个下界', null, 15, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      boxes.forEach(function (b, i) { setOpacity(b, seg(t, 0.5 + i * 0.85, 1.0 + i * 0.85)); });
      edges.forEach(function (e, i) { setOpacity(e, seg(t, 1.2 + i * 0.85, 1.6 + i * 0.85)); });
      setOpacity(back, seg(t, 4.4, 5.2));
      setOpacity(formula, seg(t, 5.8, 6.6));
      setOpacity(plotG, seg(t, 6.8, 7.4));

      /* 7.8 → 9.4 秒：奖励里加进 enc 那一半，最优点从 0 挪到 0.55。 */
      var sNow = S4_BEST_DISC + (S4_BEST_BOTH - S4_BEST_DISC) * ease(seg(t, 7.8, 9.4));
      var rNow = 0.5 * discR(sNow) + 0.5 * encR(sNow, S3_NOISE);
      mark.setAttribute('x1', s4x(sNow).toFixed(1));
      mark.setAttribute('x2', s4x(sNow).toFixed(1));
      markDot.setAttribute('cx', s4x(sNow).toFixed(1));
      markDot.setAttribute('cy', s4y(rNow).toFixed(1));
      markTx.setAttribute('x', (s4x(sNow) + 8).toFixed(1));
      markTx.setAttribute('y', (s4y(rNow) - 10).toFixed(1));
      markTx.textContent = 's* = ' + fmt(sNow, 2);

      cards.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.6)); });
      setOpacity(foot, seg(t, 13.8, 14.6));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 5: 第二道锁 —— diversity loss ──
     所有读数走 divParts()，和「diversity loss：latent 差多远」那个演示同一份计算。 */
  var S5_CX = 178, S5_CY = 238, S5_R = 78, S5_Z1 = 0.4;
  var S5_PX0 = 430, S5_PX1 = 760, S5_PY0 = 322, S5_PH = 172, S5_RMAX = 3.2;
  var S5_TAR = 1.0, S5_WEIGHT = 0.01;
  /* ratio = 2s²，所以让 ratio 正好落在 diversity_tar 上的敏感度是 √(tar/2)。 */
  var S5_SENS_OK = Math.sqrt(S5_TAR / 2);

  function s5x(deg) {
    return S5_PX0 + (deg / 180) * (S5_PX1 - S5_PX0);
  }

  function s5y(r) {
    return S5_PY0 - (clamp(r, 0, S5_RMAX) / S5_RMAX) * S5_PH;
  }

  function buildSceneDiversity() {
    var s = sceneSvg(
      '左边两条实线是两个 latent，虚线是它们各自解码出的动作，红线是 a_diff；' +
        '右边把 z_diff、a_diff 与它们的比值一起画成随夹角变化的曲线，比值是一条水平线'
    );
    s.appendChild(svgText(60, 32, '第二道锁：latent 差多远，动作就该差多远', 'demo-x-ink2', 13.5));
    var f1 = svgMath(400, 62, 'z_{diff} = 0.5 - 0.5\\, z_1 \\!\\cdot\\! z_2, \\qquad a_{diff} = \\overline{(a_1 - a_2)^2}',
      { size: 12, anchor: 'middle', cls: 'demo-x-ink2', w: 560 });
    var f2 = svgMath(400, 88, '\\text{diversity\\_ratio} = a_{diff} \\,/\\, z_{diff} \\;\\longrightarrow\\; \\text{diversity\\_tar} = 1.0',
      { size: 12, anchor: 'middle', cls: 'demo-x-ink2', w: 560 });
    s.appendChild(f1);
    s.appendChild(f2);

    var geom = svgEl('g', {});
    geom.appendChild(svgText(S5_CX, 132, '实线 = latent，虚线 = 解码出的动作', 'demo-x-mut', 10.5, 'middle'));
    geom.appendChild(paint(svgEl('circle', { cx: S5_CX, cy: S5_CY, r: S5_R, fill: 'none', 'stroke-width': 1.2 }), null, C_BORDER));
    s.appendChild(geom);
    var arm1 = paint(svgEl('line', { 'stroke-width': 2.2 }), null, C_ACCENT);
    var arm2 = paint(svgEl('line', { 'stroke-width': 2.2 }), null, C_GOOD);
    var act1 = paint(svgEl('line', { 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }), null, C_ACCENT);
    var act2 = paint(svgEl('line', { 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }), null, C_GOOD);
    var span = paint(svgEl('line', { 'stroke-width': 2 }), null, C_BAD);
    [arm1, arm2, act1, act2, span].forEach(function (n) {
      n.setAttribute('x1', S5_CX);
      n.setAttribute('y1', S5_CY);
      s.appendChild(n);
    });
    var spanTx = paint(svgText(0, 0, 'a_diff', 'demo-x-mono', 11, 'middle'), C_BAD);
    s.appendChild(spanTx);

    var plotG = svgEl('g', {});
    plotG.appendChild(svgText(S5_PX0, 132, 'ratio 应该是一条水平线', 'demo-x-mut', 10.5));
    plotG.appendChild(paint(svgEl('line', { x1: S5_PX0, y1: S5_PY0, x2: S5_PX1, y2: S5_PY0, 'stroke-width': 1.2 }), null, C_BORDER));
    plotG.appendChild(paint(svgEl('line', { x1: S5_PX0, y1: S5_PY0, x2: S5_PX0, y2: s5y(S5_RMAX), 'stroke-width': 1.2 }), null, C_BORDER));
    [0, 45, 90, 135, 180].forEach(function (d) {
      plotG.appendChild(svgText(s5x(d), 336, String(d) + '°', 'demo-x-mut', 10, 'middle'));
    });
    [0, 1, 2, 3].forEach(function (r) {
      plotG.appendChild(svgText(S5_PX0 - 6, s5y(r) + 4, fmt(r, 1), 'demo-x-mut', 10, 'end'));
    });
    plotG.appendChild(paint(svgEl('line', { x1: S5_PX0, y1: s5y(S5_TAR), x2: S5_PX1, y2: s5y(S5_TAR), 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }), null, C_WARN));
    plotG.appendChild(paint(svgText(S5_PX1, s5y(S5_TAR) - 8, 'diversity_tar = 1.0', 'demo-x-mono', 10, 'end'), C_WARN));
    var zLine = paint(svgEl('path', { fill: 'none', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }), null, C_MUTED);
    var aLine = paint(svgEl('path', { fill: 'none', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }), null, C_GOOD);
    var rLine = paint(svgEl('path', { fill: 'none', 'stroke-width': 2.4 }), null, C_ACCENT);
    [zLine, aLine, rLine].forEach(function (n) { plotG.appendChild(n); });
    plotG.appendChild(paint(svgText(S5_PX0 + 6, 150, 'z_diff', 'demo-x-mono', 10), C_MUTED));
    plotG.appendChild(paint(svgText(S5_PX0 + 62, 150, 'a_diff', 'demo-x-mono', 10), C_GOOD));
    plotG.appendChild(paint(svgText(S5_PX0 + 118, 150, 'ratio', 'demo-x-mono', 10), C_ACCENT));
    var here = paint(svgEl('circle', { r: 4.8, 'stroke-width': 1.5 }), C_ACCENT, C_SURFACE);
    plotG.appendChild(here);
    s.appendChild(plotG);

    var cells = ['z_diff', 'a_diff', 'diversity_ratio', 'loss × 0.01'].map(function (label, i) {
      var cx = 100 + i * 180;
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: cx - 80, y: 350, width: 160, height: 28, rx: 6, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
      g.appendChild(svgText(cx - 72, 368, label, 'demo-x-mut', 10));
      var tx = paint(svgText(cx + 72, 368, '', 'demo-x-mono', 11, 'end'), C_ACCENT);
      g.appendChild(tx);
      s.appendChild(g);
      return tx;
    });

    var foot = paint(svgText(400, 402, 'latent 空间因此是「等速」的：走多远的 latent 距离，就换多大的动作差异', null, 14.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    /* 夹角先从 15° 开一路到 150°（比值一动不动），停在 120° 之后改动敏感度：
       0.71 → 0（collapse）→ 1.2（跳变太剧烈）→ 回到 0.71。 */
    function angleAt(t) {
      var open = 15 + 135 * ease(seg(t, 1.6, 3.8));
      return t < 4.0 ? open : 150 - 30 * ease(seg(t, 4.0, 4.6));
    }

    function sensAt(t) {
      if (t < 5.6) return S5_SENS_OK;
      if (t < 7.6) return S5_SENS_OK * (1 - ease(seg(t, 5.6, 6.8)));
      if (t < 9.6) return 1.2 * ease(seg(t, 7.6, 8.8));
      return 1.2 + (S5_SENS_OK - 1.2) * ease(seg(t, 9.6, 10.8));
    }

    function draw(t) {
      setOpacity(f1, seg(t, 0.2, 0.8));
      setOpacity(f2, seg(t, 0.6, 1.2));
      setOpacity(geom, seg(t, 1.0, 1.6));

      var deg = angleAt(t);
      var rad = (deg * Math.PI) / 180;
      var sens = sensAt(t);
      var parts = divParts(rad, sens);
      var loss = (S5_TAR - parts.ratio) * (S5_TAR - parts.ratio);

      var z1 = zOf(S5_Z1),
        z2 = zOf(S5_Z1 + rad);
      var k = S5_R * 0.55;
      var on = seg(t, 1.2, 1.8);
      [[arm1, z1[0] * S5_R, z1[1] * S5_R, on], [arm2, z2[0] * S5_R, z2[1] * S5_R, on],
        [act1, z1[0] * k * sens, z1[1] * k * sens, on], [act2, z2[0] * k * sens, z2[1] * k * sens, on]]
        .forEach(function (a) {
          a[0].setAttribute('x2', (S5_CX + a[1]).toFixed(1));
          a[0].setAttribute('y2', (S5_CY - a[2]).toFixed(1));
          setOpacity(a[0], a[3]);
        });
      span.setAttribute('x1', (S5_CX + z1[0] * k * sens).toFixed(1));
      span.setAttribute('y1', (S5_CY - z1[1] * k * sens).toFixed(1));
      span.setAttribute('x2', (S5_CX + z2[0] * k * sens).toFixed(1));
      span.setAttribute('y2', (S5_CY - z2[1] * k * sens).toFixed(1));
      setOpacity(span, on);
      spanTx.setAttribute('x', (S5_CX + ((z1[0] + z2[0]) * k * sens) / 2).toFixed(1));
      spanTx.setAttribute('y', (S5_CY - ((z1[1] + z2[1]) * k * sens) / 2 - 10).toFixed(1));
      setOpacity(spanTx, on * (sens > 0.05 ? 1 : 0));

      var zPts = [], aPts = [], rPts = [];
      for (var i = 1; i <= 180; i++) {
        var p = divParts((i * Math.PI) / 180, sens);
        zPts.push([s5x(i).toFixed(1), s5y(p.zDiff).toFixed(1)]);
        aPts.push([s5x(i).toFixed(1), s5y(p.aDiff).toFixed(1)]);
        rPts.push([s5x(i).toFixed(1), s5y(p.ratio).toFixed(1)]);
      }
      zLine.setAttribute('d', polyPath(zPts));
      aLine.setAttribute('d', polyPath(aPts));
      rLine.setAttribute('d', polyPath(rPts));
      here.setAttribute('cx', s5x(deg).toFixed(1));
      here.setAttribute('cy', s5y(parts.ratio).toFixed(1));
      setOpacity(plotG, seg(t, 4.6, 5.2));

      cells[0].textContent = fmt(parts.zDiff, 3);
      cells[1].textContent = fmt(parts.aDiff, 3);
      cells[2].textContent = fmt(parts.ratio, 3);
      cells[3].textContent = fmt(loss * S5_WEIGHT, 4);
      paint(cells[2], Math.abs(parts.ratio - S5_TAR) < 0.25 ? C_GOOD : parts.ratio < S5_TAR ? C_BAD : C_WARN);
      paint(cells[3], loss * S5_WEIGHT > 0.005 ? C_BAD : C_GOOD);

      setOpacity(foot, seg(t, 11.8, 12.6));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 6: 训练闭环，以及下游只剩「选 z」 ──
     超参全部来自正文那张 MimicKit 默认 yaml 表。 */
  var S6_NODES = [
    { x: 140, y: 108, w: 200, tex: '\\text{① 采样 } z \\sim \\text{Uniform}(S^{63})', sub: 'latent_time 0.0 ~ 5.0 s 到期重采样' },
    { x: 400, y: 108, w: 210, tex: '\\text{② Actor } \\pi(a \\mid s, z)', sub: 'fc_3x1024，4096 并行 env' },
    { x: 660, y: 108, w: 190, t: '③ state-pairs (s, s′)', sub: '判别 / 编码共用的观测' },
    { x: 660, y: 226, w: 190, t: '④ Disc 判自然 · Enc 反推 ẑ', sub: 'disc 3x1024 / enc 2x1024' },
    { x: 400, y: 226, w: 210, tex: '\\text{⑤ } r = 0.5\\, r_{disc} + 0.5\\, r_{enc}', sub: '+ 0.01 · diversity，task 权重 0.0' },
    { x: 140, y: 226, w: 200, t: '⑥ PPO：4 个独立 Adam', sub: 'actor 2e-5 / critic·disc·enc 5e-5' }
  ];
  var S6_EDGES = [
    { pts: [[240, 108], [295, 108]] },
    { pts: [[505, 108], [565, 108]] },
    { pts: [[660, 132], [660, 202]] },
    { pts: [[565, 226], [505, 226]] },
    { pts: [[295, 226], [240, 226]] },
    { pts: [[140, 202], [140, 132]] }
  ];
  var S6_STEPS = [
    { kind: 'node', i: 0, a: 0.6, b: 1.9 },
    { kind: 'edge', i: 0, a: 1.9, b: 2.3 },
    { kind: 'node', i: 1, a: 2.3, b: 3.4 },
    { kind: 'edge', i: 1, a: 3.4, b: 3.8 },
    { kind: 'node', i: 2, a: 3.8, b: 4.7 },
    { kind: 'edge', i: 2, a: 4.7, b: 5.1 },
    { kind: 'node', i: 3, a: 5.1, b: 6.9 },
    { kind: 'edge', i: 3, a: 6.9, b: 7.3 },
    { kind: 'node', i: 4, a: 7.3, b: 8.7 },
    { kind: 'edge', i: 4, a: 8.7, b: 9.1 },
    { kind: 'node', i: 5, a: 9.1, b: 10.3 },
    { kind: 'edge', i: 5, a: 10.3, b: 10.8 }
  ];
  var S6_HLC = ['敌人远 → 前进型 z', '敌人挥刀 → 闪避型 z', '露出破绽 → 攻击型 z'];

  function buildSceneLoop() {
    var s = sceneSvg(
      'ASE 的一次训练循环：采样 latent、Actor 出动作、取 state-pairs、判别器与编码器各打一份分、' +
        '合成奖励、四个 Adam 各自更新；下方是预训练完成后下游只需要选 z'
    );
    var arrow = K.arrowMarker(s, 'ase-x-arrow-loop', C_ACCENT);
    s.appendChild(svgText(60, 30, 'ASE 的一次训练循环（ASEAgent 继承 AMPAgent，多了 latent 管理和 Encoder）', 'demo-x-ink2', 13));

    var edges = S6_EDGES.map(function (e) {
      var p = paint(svgEl('path', { d: polyPath(e.pts), fill: 'none', 'stroke-width': 1.8, 'marker-end': arrow }), null, C_MUTED);
      s.appendChild(p);
      return p;
    });
    var boxes = S6_NODES.map(function (n) {
      var g = svgEl('g', {});
      var rect = paint(svgEl('rect', { x: n.x - n.w / 2, y: n.y - 25, width: n.w, height: 50, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_BORDER);
      g.appendChild(rect);
      g.appendChild(n.tex
        ? svgMath(n.x, n.y - 4, n.tex, { size: 11, anchor: 'middle', w: n.w })
        : svgText(n.x, n.y - 4, n.t, 'demo-x-mono', 11.5, 'middle'));
      g.appendChild(svgText(n.x, n.y + 14, n.sub, 'demo-x-mut', 9.5, 'middle'));
      s.appendChild(g);
      return { g: g, rect: rect };
    });
    var token = paint(svgEl('circle', { cx: -20, cy: -20, r: 6 }), C_ACCENT);
    s.appendChild(token);

    var down = svgEl('g', {});
    down.appendChild(paint(svgEl('line', { x1: 60, y1: 272, x2: 760, y2: 272, 'stroke-width': 1, 'stroke-dasharray': '5 4' }), null, C_BORDER));
    down.appendChild(paint(svgText(60, 296, '预训练完成 → 冻结 π(a｜s, z)，下游任务只学「选 z」', null, 12.5), C_GOOD));
    s.appendChild(down);
    var hlc = S6_HLC.map(function (str, i) {
      var cx = 170 + i * 215;
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: cx - 100, y: 312, width: 200, height: 30, rx: 15, 'stroke-width': 1.2 }), C_SURFACE, C_GOOD));
      g.appendChild(paint(svgText(cx, 331, str, null, 11, 'middle'), C_GOOD));
      s.appendChild(g);
      return { g: g, at: 12.0 + i * 0.5 };
    });

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 374, 'ASE 把「动作控制」压成了「选 latent」', null, 15.5, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 400, '决策空间从「直接控制几十个关节」变成「在 64 维球面上选一个方向」', 'demo-x-mut', 11.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      var lit = -1, reached = -1, actEdge = -1, u = 0;
      S6_STEPS.forEach(function (st) {
        if (t >= st.a) reached = Math.max(reached, st.i);
        if (t >= st.a && t < st.b) {
          if (st.kind === 'node') lit = st.i;
          else { actEdge = st.i; u = seg(t, st.a, st.b); }
        }
      });

      boxes.forEach(function (b, i) {
        var seen = i <= reached || (i === 0 && t >= 10.3);
        setOpacity(b.g, seen ? 1 : 0.32);
        paint(b.rect, i === lit ? C_SURFACE : C_SURFACE2, i === lit ? C_ACCENT : C_BORDER);
        b.rect.setAttribute('stroke-width', i === lit ? 2.5 : 1.5);
      });
      edges.forEach(function (e, i) {
        paint(e, null, i === actEdge ? C_ACCENT : C_MUTED);
        setOpacity(e, i <= reached ? 1 : 0.3);
      });

      if (actEdge >= 0) {
        var p = pointOn(S6_EDGES[actEdge].pts, u);
        token.setAttribute('cx', p[0].toFixed(1));
        token.setAttribute('cy', p[1].toFixed(1));
        setOpacity(token, 1);
      } else {
        setOpacity(token, 0);
      }

      setOpacity(down, seg(t, 11.2, 11.9));
      hlc.forEach(function (h) { setOpacity(h.g, seg(t, h.at, h.at + 0.5)); });
      setOpacity(foot, seg(t, 14.0, 14.8));
    }

    return { el: s, draw: draw };
  }

  var ASE_SCENES = [
    {
      title: '技能被绑死',
      dur: 13,
      build: buildSceneBound,
      cues: [
        { at: 0.3, s: 'DeepMimic 解决了「学一段动作」，AMP 解决了「学一个自然的运动风格先验」。但技能是**绑死**的。' },
        { at: 0.6, s: '你训一个 walk policy，它就只会走；训一个 backflip policy，它就只会翻。上千条动捕，就是上千个策略。' },
        { at: 2.4, s: '这些策略之间没有任何共享结构：**$\\pi_{\\text{walk}}$、$\\pi_{\\text{run}}$、$\\pi_{\\text{jump}}$ …** 运行时怎么切都是问题。' },
        { at: 3.2, s: '更麻烦的是下游：**导航、追球、剑盾战斗、跳障碍** —— 传统做法是每个任务重训一遍低层控制器。' },
        { at: 5.4, s: '可「带球跑」本来就该复用走 / 跑 / 转向 / 变速 / 平衡这些基础能力，没道理每次从零学。' },
        { at: 6.4, s: '而且动捕库通常是**无结构、无标签、无分段**的：没人告诉你哪段是 dodge、哪段是 kick。' },
        { at: 9.6, s: 'ASE 要的东西一句话：**别再存 1000 个按钮，改存一个「动作控制杆」空间。**' }
      ]
    },
    {
      title: '技能 = 球面上的方向',
      dur: 17,
      build: buildSceneLatent,
      cues: [
        { at: 0.3, s: '第一步很朴素：策略多一个输入。从 $a_t \\sim \\pi(a_t \\mid s_t)$ 变成 **$a_t \\sim \\pi(a_t \\mid s_t, z)$**。' },
        { at: 0.9, s: '$z$ 不是离散 ID，而是**单位球面上的一个方向**：源码里就是 `normalize(torch.normal(...))`，所以 $\\lVert z \\rVert \\equiv 1$（`latent_dim: 64`）。' },
        { at: 1.6, s: '这个方向解出来的是「快步前冲」：四个行为通道读数 **1.36 / 0.50 / −0.05 / 0.11**。' },
        { at: 3.5, s: '往前转一点，到两个方向中间：**0.67 / 0.95 / 0.77 / −0.41** —— 边走边挥剑，一个**插值出来的**中间技能。' },
        { at: 5.4, s: '再转过去：**−0.11 / 0.61 / 1.32 / −0.17** —— 前进速度掉到几乎没有，挥剑幅度升到最高，变成原地大幅挥剑。' },
        { at: 7.4, s: '转到另一侧：**0.60 / −0.95 / −0.03 / 1.40** —— 转向翻了号、重心压到最低，压着身体往另一边绕。整圈转下来，行为是**连续**变化的。' },
        { at: 10.4, s: '还有一件事：训练时 latent **不是一个 episode 用到底**。`latent_time_min: 0.0` / `latent_time_max: 5.0`。' },
        { at: 11.2, s: '这颗种子下的四段就是 **2.39 s / 1.70 s / 2.59 s / 4.40 s** —— 一个 episode 内就换了四次技能。' },
        { at: 13.4, s: '于是策略见过大量「从挥剑切到闪避」这种过渡，下游高层随便扔一个新 $z$ 过来才不会摔倒。' },
        { at: 15.6, s: '**技能不再是离散 ID，而是连续向量** —— 这是 ASE 全部后续能力的地基。' }
      ]
    },
    {
      title: 'latent collapse',
      dur: 14,
      build: buildSceneCollapse,
      cues: [
        { at: 0.3, s: '但只把 $z$ 拼到输入里是**不够**的：策略很可能压根不理它。' },
        { at: 0.5, s: '网络的偷懒方式很多：只看当前状态、把所有技能混成一个平均策略、干脆把 $z$ 当噪声。' },
        { at: 2.6, s: '为什么会这样？看只有 disc reward 时的奖励曲线：它只问「动作像不像动捕数据」。' },
        { at: 4.6, s: '最自然的动作就是数据流形中心那一个。策略越听 $z$ 的话，动作铺得越开，**disc reward 反而越低**。' },
        { at: 6.4, s: '所以梯度会一路把「对 $z$ 的敏感度」推到 **$s^* = 0.00$**：disc reward 拿满 **1.000**，encoder 能恢复的余弦是 **0.000**。' },
        { at: 7.8, s: '右边四种颜色是四个不同的 $z$ 解码出的动作 —— 它们**堆成了一坨**。换任何 latent 都是同一个动作。' },
        { at: 9.4, s: '所以关键一句：**latent collapse 不是训练出 bug，而是这个奖励下的最优解。**' },
        { at: 11.4, s: '换句话说，AMP 直接加一个 $z$ 输入，是学不出技能空间的 —— 得给「必须用 $z$」这件事本身发奖励。' }
      ]
    },
    {
      title: 'encoder：把 z 逼回动作',
      dur: 16,
      build: buildSceneEncoder,
      cues: [
        { at: 0.3, s: 'ASE 的第一道锁很巧：**再训一个 encoder，要求它能从动作片段里把 $z$ 反推出来。**' },
        { at: 0.5, s: '策略用 $z$ 产生动作，取相邻两帧作为行为片段 $o_{disc}$。' },
        { at: 2.2, s: 'encoder 吃这个片段，输出 $\\hat z$（`eval_enc` 最后也做了归一化，所以 $\\hat z$ 同样在球面上）。' },
        { at: 3.9, s: '奖励就是两者的余弦：**$r_{enc} = z \\cdot \\hat z$**，源码 `_calc_enc_error` 里写成 `−sum(z · ẑ)`。' },
        { at: 4.4, s: 'encoder 猜不对，$r_{enc}$ 就低 —— 于是**策略只有把 $z$ 的信息真的编进动作里**才拿得到分。这条闭环就是关键。' },
        { at: 5.8, s: 'ASE 的总奖励因此是两半：**$r = 0.5\\, r_{disc} + 0.5\\, r_{enc}$**（`task_reward_weight: 0.0`，预训练不看任务）。' },
        { at: 7.8, s: '加上 enc 那一半之后，最优点从 **0.00 挪到 0.55**：disc 仍有 **0.873**，encoder 恢复 $z$ 的余弦到了 **0.844**。' },
        { at: 9.6, s: '对照三种配比：只有 disc（等于 AMP 加个 $z$）→ **$s^* = 0.00$、cos 0.000**，collapse。' },
        { at: 10.9, s: '默认的 0.5 / 0.5 → **$s^* = 0.55$**：既留在自然流形上，又认得出是哪个技能。' },
        { at: 12.2, s: '只有 enc → **$s^* = 3.00$、disc 只剩 0.017**：技能是分开了，但动作已经飞出人类流形 —— 怪异但好区分。' },
        { at: 13.8, s: '所以这两项谁都不能单独用。encoder reward 本质上是在给**「动作里含多少 $z$ 的信息」定一个下界**。' }
      ]
    },
    {
      title: 'diversity：空间要等速',
      dur: 14,
      build: buildSceneDiversity,
      cues: [
        { at: 0.3, s: '光有 encoder 还不够。可能出现：$z_1, z_2, z_3$ 明明不同，但动作**几乎一样**（encoder 靠一点点差别也能猜对）。' },
        { at: 0.6, s: '所以再加一道锁。源码量的是两件事：$z_{diff} = 0.5 - 0.5\\, z_1 \\!\\cdot\\! z_2$，以及 $a_{diff} = \\overline{(a_1 - a_2)^2}$。' },
        { at: 1.6, s: '把夹角从 **15° 开到 150°**：$z_{diff}$ 从 0.017 涨到 0.933，$a_{diff}$ 也从 0.017 涨到 0.933。' },
        { at: 4.6, s: '两者同步在涨，所以**比值是一条水平线** —— 这正是 `diversity_tar: 1.0` 想要的：动作差异和 latent 差异成正比。' },
        { at: 5.6, s: '现在把「用不用 $z$」拖到 0，模拟 collapse：$a_{diff} \\to 0$，**ratio 掉到 0.000**，loss 立刻变成 $(1-0)^2 = 1$。' },
        { at: 7.6, s: '反过来推太高也要罚：ratio **2.880** 时 loss 是 **3.534** —— latent 只挪一点，动作就面目全非，空间不连续、没法插值。' },
        { at: 9.6, s: '回到中间，ratio 落回 **1.000**，加权 loss 几乎为 0。平方误差把**两头**一起罚掉了。' },
        { at: 11.8, s: '`diversity_weight: 0.01` 只是个正则项，不是主目标 —— 拉大它会挤占 disc / enc reward，策略为了凑比值会牺牲动作质量。' }
      ]
    },
    {
      title: '训练闭环与下游',
      dur: 16,
      build: buildSceneLoop,
      cues: [
        { at: 0.3, s: '把前五幕串起来，就是 ASE 的一次训练循环。`ASEAgent` 继承自 `AMPAgent`，多出来的正好是 latent 管理和 Encoder。' },
        { at: 0.6, s: '① `_update_latents` 检查哪些环境的 latent 到期了，`_sample_latents` 给它们重新采一个球面方向。' },
        { at: 2.3, s: '② Actor 拿 $(s, z)$ 出动作 —— `eval_actor(obs, z)`，latent 是策略输入的**一等公民**，网络是 fc_3x1024、4096 个并行 env。' },
        { at: 3.8, s: '③ 记下相邻两帧 $(s, s\')$：判别器和编码器吃的是同一份观测。' },
        { at: 5.1, s: '④ 判别器判「像不像多段 locomotion 数据」，编码器反推 $\\hat z$。注意 **disc 是 3×1024、enc 是 2×1024**，encoder 单独一个 MLP。' },
        { at: 7.3, s: '⑤ 合成奖励：**$r = 0.5\\, r_{disc} + 0.5\\, r_{enc}$**，再加 `diversity_weight: 0.01` 那一项；`task_reward_weight` 默认 **0.0**。' },
        { at: 9.1, s: '⑥ 一轮要更新 **4 套参数**，各自一个 Adam：actor 2e-5，critic / disc / enc 都是 5e-5。然后回到 ①。' },
        { at: 11.2, s: '预训练结束后才是重点：**底层 $\\pi(a \\mid s, z)$ 冻结**，下游任务一行 motor 都不用重训。' },
        { at: 12.0, s: '高层策略只学「什么时候切哪个 $z$」：敌人远就选前进型，挥刀就选闪避型，露破绽就选攻击型。' },
        { at: 14.0, s: '**决策空间从「直接控制几十个关节」变成「在 64 维球面上选一个方向」** —— 这就是 ASE 说的技能接口化。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '六幕动画：ASE 全流程速览',
      sub:
        '约 90 秒自动播放。空格播放 / 暂停，← → 换幕；画面里的数字与下面三个演示用的是同一份函数。' +
        'ASE 在 AMP 上叠了六件事（latent / 为什么要约束 / encoder / 两半奖励 / diversity / 定期重采样），所以这里是六幕而不是五幕。',
      ariaLabel: 'ASE 六幕讲解动画',
      notes: [
        '取数依据：第二幕四个停靠点的通道读数（1.36 / 0.50 / −0.05 / 0.11 等）由下面「技能不是一个 ID」演示里的同一个 `decode()` 与 `CHANNELS` 现算；' +
          '时间线那四段 2.39 / 1.70 / 2.59 / 4.40 s 来自同一个 `latentSegments(21)`，也就是那个演示按「播放」时走的分段。',
        '第三、四幕的曲线与 $s^*$（0.00 / 0.55 / 3.00）来自「为什么非要加一个 encoder」演示里的同一对 `discR` / `encR` 与共用的 `bestSens()`，噪声都取 $\\sigma = 0.35$；' +
          '第五幕的 $z_{diff}$ / $a_{diff}$ / ratio 走「diversity loss」演示里的同一个 `divParts()`。',
        '第六幕的 4096 env、`latent_dim: 64`、`latent_time` 0.0~5.0 s、actor·critic·disc fc_3x1024 / enc fc_2x1024、' +
          '`disc_reward_weight` 0.5、`enc_reward_weight` 0.5、`task_reward_weight` 0.0、`diversity_weight` 0.01、四个 Adam（2e-5 / 5e-5）来自正文那张 MimicKit 默认 yaml 表。',
        '**这几幕里的玩具模型和下面三个演示同源**：latent 空间降到 2 维圆、行为由一个写死的线性矩阵解码、' +
          '「策略用不用 $z$」被压成一个标量 $s$、encoder 用最优线性解的闭式表达。定性结论（技能是连续方向、没有 encoder 就 collapse、' +
          '两项都不能单独用、ratio 应该是一条水平线）成立，**具体数值不能和论文直接比**。'
      ],
      scenes: ASE_SCENES
    });
  }

  K.mount({
    'ase-explainer': buildExplainerDemo,
    'ase-latent': buildLatentDemo,
    'ase-encoder': buildEncoderDemo,
    'ase-diversity': buildDiversityDemo
  });
})();
