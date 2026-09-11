/* Interactive ASE demos for
 * papers/01_Foundational_RL/ASE_Adversarial_Skill_Embeddings_for_Large-Scale_Motion_Control.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["ase"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
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

    /* 训练时的 latent 时间线：每段长度 U(0, 5) 秒，段内 z 不变。 */
    var history = [];
    function latentAt(t, seed) {
      var rng = mulberry32(seed);
      var acc = 0,
        ang = 0.6,
        segs = [];
      while (acc < t + 5) {
        var dur = 0.4 + 4.6 * rng(); // latent_time_min 0 / max 5（下限留一点避免抖太快）
        segs.push({ t0: acc, t1: acc + dur, angle: ang });
        acc += dur;
        ang = 6.283 * rng();
      }
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
      var best = 0,
        bestV = -Infinity;
      for (var i = 0; i <= 300; i++) {
        var s = (3 * i) / 300;
        var v = total(s);
        if (v > bestV) {
          bestV = v;
          best = s;
        }
      }

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
      var cos = z1[0] * z2[0] + z1[1] * z2[1];
      var zDiff = 0.5 - 0.5 * cos;
      var a1 = [state.sens * z1[0], state.sens * z1[1]];
      var a2 = [state.sens * z2[0], state.sens * z2[1]];
      var aDiff = ((a1[0] - a2[0]) * (a1[0] - a2[0]) + (a1[1] - a2[1]) * (a1[1] - a2[1])) / 2;
      var ratio = aDiff / (zDiff + 1e-5);
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
        var a = (i * Math.PI) / 180;
        var zd = 0.5 - 0.5 * Math.cos(a);
        var ad = (state.sens * state.sens * (2 - 2 * Math.cos(a))) / 2;
        var rr = ad / (zd + 1e-5);
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

  K.mount({
    'ase-latent': buildLatentDemo,
    'ase-encoder': buildEncoderDemo,
    'ase-diversity': buildDiversityDemo
  });
})();
