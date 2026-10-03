/* Interactive Diffusion Policy demos for
 * papers/01_Foundational_RL/Diffusion_Policy.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["diffusion_policy"]`, after assets/js/demos/kit.js. The note itself
 * may only contain empty placeholders, because scripts/sanitize_paper_html.py
 * strips <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   dp-explainer  — 七幕讲解动画：平均动作撞障 → 条件扩散 → action chunking →
 *     视觉条件 + FiLM → DDIM 加速 → receding horizon → 为什么成了 IL 标准
 *   dp-video      — 同样七幕的配音竖屏视频（可下载）
 *   dp-multimodal — 演示里左绕右绕各一半，MSE 回归的「平均动作」正好撞上障碍
 *   dp-denoise    — 从高斯噪声一步步去噪出一整条 action chunk（真的在跑 DDIM）
 *   dp-rhc        — 预测 16 步、只执行 8 步：receding horizon 的那个取舍
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
    mulberry32 = K.mulberry32,
    gauss = K.gauss;

  // ─── 一个真的在跑的 DDIM 采样器 ──────────────────────────────────────────
  /* 数据分布取成「若干条演示轨迹 + 高斯抖动」的混合，这样每一步的
     x̂₀ = E[x₀ | x_k] 有闭式解，浏览器里就能把完整的反向过程跑出来。
     注意责任权重 r_i 是拿**整条 chunk** 算的 —— 这正是 action chunking 的关键：
     左绕和右绕不会在中间某一帧串味。 */
  function alphaBar(k, K_) {
    // cosine schedule（Nichol & Dhariwal），和实现里常用的那条一致
    var t = k / K_;
    var f = Math.cos(((t + 0.008) / 1.008) * (Math.PI / 2));
    return clamp(f * f, 1e-5, 1);
  }

  function ddimSample(modes, weights, dataStd, steps, xT) {
    var H = xT.length;
    var x = xT.slice();
    var trace = [{ k: steps, x: x.slice() }];
    for (var k = steps; k > 0; k--) {
      var ab = alphaBar(k, steps),
        abPrev = alphaBar(k - 1, steps);
      var sa = Math.sqrt(ab),
        v = ab * dataStd * dataStd + (1 - ab);
      // 责任权重：整条 chunk 一起算
      var logs = modes.map(function (mu, i) {
        var d2 = 0;
        for (var j = 0; j < H; j++) {
          var e = x[j] - sa * mu[j];
          d2 += e * e;
        }
        return Math.log(weights[i] + 1e-12) - d2 / (2 * v);
      });
      var r = K.softmax(logs);
      // x̂₀ = Σ rᵢ · E[x₀ | x_k, 第 i 个模式]
      var x0 = new Array(H);
      for (var j2 = 0; j2 < H; j2++) {
        var acc = 0;
        for (var i2 = 0; i2 < modes.length; i2++) {
          acc += r[i2] * ((sa * dataStd * dataStd * x[j2] + (1 - ab) * modes[i2][j2]) / v);
        }
        x0[j2] = acc;
      }
      // DDIM 更新
      var next = new Array(H);
      for (var j3 = 0; j3 < H; j3++) {
        var eps = (x[j3] - sa * x0[j3]) / Math.sqrt(1 - ab);
        next[j3] = Math.sqrt(abPrev) * x0[j3] + Math.sqrt(1 - abPrev) * eps;
      }
      x = next;
      trace.push({ k: k - 1, x: x.slice(), r: r, x0: x0 });
    }
    return trace;
  }

  // ─── demo 1: 多模态 ──────────────────────────────────────────────────────
  /* 场景：起点在左，目标在右，正中间一个障碍。人类演示一半从上边绕、一半从下边绕。
     把「绕行侧向偏移量」当成要预测的动作，它的分布就是双峰的。 */
  var OBST = { x: 0, y: 0, r: 0.52 };
  var LEFT_MU = 1.05,
    RIGHT_MU = -1.05;

  function traj(offset) {
    var pts = [];
    for (var i = 0; i <= 40; i++) {
      var t = i / 40;
      var x = -2 + 4 * t;
      var y = offset * Math.exp(-((x * x) / 0.9));
      pts.push([x, y]);
    }
    return pts;
  }

  function hitsObstacle(offset) {
    var pts = traj(offset);
    for (var i = 0; i < pts.length; i++) {
      var dx = pts[i][0] - OBST.x,
        dy = pts[i][1] - OBST.y;
      if (dx * dx + dy * dy < OBST.r * OBST.r) return true;
    }
    return false;
  }

  function buildMultimodalDemo(host) {
    var root = card(host, {
      title: '「平均动作」为什么会撞上障碍',
      sub:
        '人类演示里一半从上绕、一半从下绕。MSE 回归只能给出一个数，它给的是两峰的平均值 —— ' +
        '正中间，也就是障碍所在的位置。扩散策略采的是分布，每次落在某一侧。'
    });

    var state = { mix: 0.5, nSamples: 12, seed: 7, method: 'diffusion', steps: 10, dataStd: 0.18 };

    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '策略怎么出动作',
      value: 'diffusion',
      items: [
        { label: '扩散：采 10 步 DDIM', value: 'diffusion' },
        { label: 'MSE 回归：输出均值', value: 'mse' }
      ],
      onPick: function (v) {
        state.method = v;
        render();
      }
    });
    slider(ctrls, {
      label: '演示里「从上绕」的比例',
      min: 0,
      max: 1,
      step: 0.02,
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
      label: '采几条轨迹',
      min: 1,
      max: 30,
      step: 1,
      value: state.nSamples,
      format: function (v) {
        return fmt(v, 0);
      },
      onInput: function (v) {
        state.nSamples = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '换一批噪声', function () {
      state.seed = (state.seed * 1103515245 + 12345) % 99991;
      render();
    });
    button(btns, '演示全部从上绕', function () {
      state.mix = 1;
      render();
    });

    var setLegend = legend(root, [
      { key: 'muted', text: '人类演示' },
      { key: 'good', text: '扩散采出来的轨迹' },
      { key: 'bad', text: 'MSE 回归的平均动作' },
      { key: 'warn', text: '障碍' }
    ]);

    var grid = stageGrid(root);
    var sceneStage = stage(grid, 250);
    var distStage = stage(grid, 250);

    var stats = statsRow(root);
    var sMean = stats.add('MSE 会输出的侧向偏移');
    var sHitMse = stats.add('这个动作撞不撞');
    var sHitDiff = stats.add('扩散采样的撞击率');
    var sMode = stats.add('采到上 / 下的比例');
    var verdict = verdictBox(root);

    note(root, [
      '**MSE 的最优解就是条件均值**：这不是网络没训好，是损失函数决定的 —— ' +
        '给定同一个观测，`argmin E[(a − f(o))²]` 的解永远是 $\\mathbb{E}[a \\mid o]$。演示越是「多解」，这个均值越危险。',
      '**把上绕的比例拖到 100%**：分布变成单峰，MSE 立刻就不撞了。所以问题从来不是「BC 不行」，' +
        '而是「BC 在多模态数据上不行」—— 这也是为什么很多简单任务上 MLP + MSE 依然够用。',
      '**这里的扩散是真在跑**：左边每条轨迹都由一次 10 步 DDIM 采出来（数据分布是双高斯，' +
        '$\\hat{x}_0 = \\mathbb{E}[x_0 \\mid x_k]$ 有闭式解）。换一批噪声，落到哪一侧就会变 —— 采的是分布，不是均值。',
      '**这是简化模型**：真实的动作是 16 × 7 维的序列、条件是 ResNet 编码的图像，数据分布也不是两个高斯。' +
        '这里把「绕哪边」压成一个标量，只为把多模态这件事画清楚。'
    ]);

    var render = registerRenderer(function () {
      var w = [state.mix, 1 - state.mix];
      var modes = [[LEFT_MU], [RIGHT_MU]];
      var mseMean = state.mix * LEFT_MU + (1 - state.mix) * RIGHT_MU;

      var rng = mulberry32(state.seed);
      var samples = [];
      for (var i = 0; i < state.nSamples; i++) {
        var tr = ddimSample(modes, w, state.dataStd, state.steps, [gauss(rng)]);
        samples.push(tr[tr.length - 1].x[0]);
      }
      var hits = samples.filter(hitsObstacle).length;
      var up = samples.filter(function (s) {
        return s > 0;
      }).length;

      sMean.set(fmt(mseMean, 3), Math.abs(mseMean) < 0.4 ? 'bad' : 'good');
      sHitMse.set(hitsObstacle(mseMean) ? '撞上了 💥' : '没撞', hitsObstacle(mseMean) ? 'bad' : 'good');
      sHitDiff.set(fmt((hits / samples.length) * 100, 0) + '%', hits === 0 ? 'good' : 'warn');
      sMode.set(up + ' / ' + (samples.length - up), 'accent');

      if (hitsObstacle(mseMean)) {
        verdict.set(
          '💥 演示里 ' +
            fmt(state.mix * 100, 0) +
            '% 从上绕、' +
            fmt((1 - state.mix) * 100, 0) +
            '% 从下绕，MSE 给出的平均偏移是 ' +
            fmt(mseMean, 2) +
            ' —— **正好在障碍里**。同样的数据，扩散采了 ' +
            samples.length +
            ' 条，撞击率 ' +
            fmt((hits / samples.length) * 100, 0) +
            '%。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ 这个比例下分布已经偏向一侧（均值 ' +
            fmt(mseMean, 2) +
            '），MSE 也能绕开。把比例拖回 50% 附近 —— 那才是「平均动作」最致命的地方。',
          'learning'
        );
      }

      // ── 左：场景 ──
      var g = begin(sceneStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 40, r: 14, t: 22, b: 34 }, [-2.2, 2.2], [-1.7, 1.7]);
      axes(g, p, { xTicks: [-2, -1, 0, 1, 2], yTicks: [-1, 0, 1], xLabel: '前进方向' });
      text(g.ctx, '起点 → 障碍 → 目标', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      // 演示
      var rng2 = mulberry32(state.seed + 1);
      for (var d = 0; d < 14; d++) {
        var side = rng2() < state.mix ? LEFT_MU : RIGHT_MU;
        var off = side + state.dataStd * gauss(rng2);
        line(
          g.ctx,
          traj(off).map(function (q) {
            return [p.sx(q[0]), p.sy(q[1])];
          }),
          P.muted,
          1
        );
      }
      // 障碍
      g.ctx.save();
      g.ctx.fillStyle = P.warn;
      g.ctx.globalAlpha = 0.3;
      g.ctx.beginPath();
      g.ctx.arc(p.sx(OBST.x), p.sy(OBST.y), Math.abs(p.sx(OBST.r) - p.sx(0)), 0, Math.PI * 2);
      g.ctx.fill();
      g.ctx.restore();
      if (state.method === 'diffusion') {
        samples.forEach(function (s) {
          line(
            g.ctx,
            traj(s).map(function (q) {
              return [p.sx(q[0]), p.sy(q[1])];
            }),
            hitsObstacle(s) ? P.bad : P.good,
            1.8
          );
        });
      } else {
        line(
          g.ctx,
          traj(mseMean).map(function (q) {
            return [p.sx(q[0]), p.sy(q[1])];
          }),
          P.bad,
          2.8
        );
      }
      dot(g.ctx, p.sx(-2), p.sy(0), 5, P.accent, P.surface2);
      dot(g.ctx, p.sx(2), p.sy(0), 5, P.accent, P.surface2);

      // ── 右：动作分布 ──
      var g2 = begin(distStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 42, r: 14, t: 22, b: 34 }, [-2, 2], [0, 1.35]);
      axes(g2, p2, {
        xTicks: [-2, -1, 0, 1, 2],
        yTicks: [0, 0.5, 1],
        yFmt: function (t) {
          return fmt(t, 1);
        },
        xLabel: '侧向偏移（要预测的动作）'
      });
      text(g2.ctx, '演示数据里这个动作的分布', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var pts = [];
      for (var q2 = 0; q2 <= 200; q2++) {
        var x2 = -2 + (4 * q2) / 200;
        var pdf = 0;
        [[LEFT_MU, state.mix], [RIGHT_MU, 1 - state.mix]].forEach(function (m) {
          pdf += m[1] * Math.exp(-((x2 - m[0]) * (x2 - m[0])) / (2 * state.dataStd * state.dataStd));
        });
        pts.push([p2.sx(x2), p2.sy(clamp(pdf, 0, 1.3))]);
      }
      // 障碍区间
      g2.ctx.save();
      g2.ctx.fillStyle = P2.warn;
      g2.ctx.globalAlpha = 0.18;
      var lo = p2.sx(-OBST.r),
        hi = p2.sx(OBST.r);
      g2.ctx.fillRect(lo, p2.y1, hi - lo, p2.y0 - p2.y1);
      g2.ctx.restore();
      text(g2.ctx, '撞上障碍的区间', p2.sx(0), p2.y1 + 12, P2.warn, 'center', '10px sans-serif');
      line(g2.ctx, pts, P2.muted, 2.2);
      samples.forEach(function (s, i2) {
        dot(g2.ctx, p2.sx(clamp(s, -2, 2)), p2.sy(0.06 + 0.02 * (i2 % 5)), 3, hitsObstacle(s) ? P2.bad : P2.good);
      });
      line(g2.ctx, [[p2.sx(mseMean), p2.y0], [p2.sx(mseMean), p2.y1]], P2.bad, 2, [5, 4]);
      text(g2.ctx, 'MSE 的解 = 条件均值', p2.sx(mseMean) + 6, p2.y1 + 26, P2.bad, 'left', '10px sans-serif');

      sceneStage.canvas.setAttribute('aria-label', '绕障碍场景中演示轨迹与策略输出的对比');
      distStage.canvas.setAttribute('aria-label', '动作分布的双峰形状与 MSE 均值的位置');
    });

    render();
  }

  // ─── demo 2: 去噪过程 ────────────────────────────────────────────────────
  var H = 16;

  function chunkModes() {
    var up = [],
      down = [];
    for (var i = 0; i < H; i++) {
      var t = i / (H - 1);
      up.push(0.9 * Math.sin(Math.PI * t) + 0.25 * t);
      down.push(-0.9 * Math.sin(Math.PI * t) + 0.25 * t);
    }
    return [up, down];
  }

  function buildDenoiseDemo(host) {
    var root = card(host, {
      title: '去噪：从一团噪声里「捞」出一整条动作序列',
      sub:
        '推理时先把长度 16 的动作 chunk 初始化成高斯噪声，再跑 K 步 DDIM。' +
        '拖动步数滑块，看这条曲线是怎么从毛刺变成平滑轨迹的 —— 而且整条一起变，不会前半段左绕后半段右绕。'
    });

    var state = { steps: 10, at: 0, seed: 4, dataStd: 0.1, mix: 0.5 };
    var modes = chunkModes();

    var ctrls = controlsRow(root);
    var stepSlider = slider(ctrls, {
      label: '总去噪步数 K（DDIM，训练时上百步）',
      min: 2,
      max: 40,
      step: 1,
      value: state.steps,
      format: function (v) {
        return fmt(v, 0) + ' 步';
      },
      onInput: function (v) {
        state.steps = v;
        state.at = Math.min(state.at, v);
        atSlider.input.max = String(v);
        atSlider.set(state.at, true);
        render();
      }
    });
    var atSlider = slider(ctrls, {
      label: '已经去噪到第几步',
      min: 0,
      max: 40,
      step: 1,
      value: 0,
      format: function (v) {
        return fmt(v, 0) + ' / ' + state.steps;
      },
      onInput: function (v) {
        state.at = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '换一团初始噪声', function () {
      state.seed = (state.seed * 1103515245 + 12345) % 99991;
      state.at = 0;
      atSlider.set(0, true);
      render();
    });
    button(btns, '一步到底', function () {
      state.at = state.steps;
      atSlider.set(state.steps, true);
      render();
    });
    void stepSlider;

    var setLegend = legend(root, [
      { key: 'accent', text: '当前的动作 chunk $x_k$' },
      { key: 'good', text: '模型此刻预测的干净动作 $\\hat{x}_0$' },
      { key: 'muted', text: '两条演示模式' }
    ]);

    var grid = stageGrid(root);
    var chunkStage = stage(grid, 245);
    var schedStage = stage(grid, 245);

    var stats = statsRow(root);
    var sNoise = stats.add('当前噪声水平 $\\sqrt{1-\\bar{\\alpha}}$');
    var sR = stats.add('模式归属（上 / 下）');
    var sErr = stats.add('离最终结果还差');
    var sSmooth = stats.add('曲线的粗糙度');
    var verdict = verdictBox(root);

    note(root, [
      '**整条 chunk 一起去噪，才不会串味**：责任权重是拿**整条 16 步序列**算出来的。' +
        '如果逐帧独立采样，前 8 帧可能选了「上绕」、后 8 帧选了「下绕」，拼出来是一条穿过障碍的轨迹。' +
        'action chunking 不只是为了预测得远，也是为了让多模态的选择保持一致。',
      '**看右边那条噪声表**：前几步 $\\sqrt{1-\\bar{\\alpha}}$ 还很大，$\\hat{x}_0$ 的预测非常模糊（左图绿线在两条演示中间摇摆）；' +
        '一旦噪声降到某个位置，归属就锁死了，剩下的步骤只是在把细节磨出来。',
      '**K 从 100 压到 10 靠的是 DDIM**：论文 3.4 节训练 100 步、推理 10 步，RTX 3080 上 0.1 s（表 7 的真机配置是 16 步）。' +
        '在这个玩具模型里，把总步数拖到 2 会看到轨迹还没收干净，拖到 40 也不会好多少 —— 这是玩具模型的现象，不是论文的消融。',
      '**这是简化模型**：真实的 $\\hat{x}_0$ 由一个 1D 卷积 UNet 预测，条件是视觉特征；这里数据分布取成两条演示 + 高斯抖动，' +
        '所以 $\\hat{x}_0$ 有闭式解，浏览器里才跑得动。反向过程本身是真的 DDIM。'
    ]);

    var render = registerRenderer(function () {
      var rng = mulberry32(state.seed);
      var xT = [];
      for (var i = 0; i < H; i++) xT.push(gauss(rng));
      var trace = ddimSample(modes, [state.mix, 1 - state.mix], state.dataStd, state.steps, xT);
      var idx = clamp(Math.round(state.at), 0, trace.length - 1);
      var cur = trace[idx];
      var fin = trace[trace.length - 1];
      var ab = alphaBar(cur.k, state.steps);
      var noise = Math.sqrt(1 - ab);

      var err = 0,
        rough = 0;
      for (var j = 0; j < H; j++) {
        err += Math.abs(cur.x[j] - fin.x[j]);
        if (j) rough += Math.abs(cur.x[j] - cur.x[j - 1]);
      }
      err /= H;
      rough /= H - 1;
      var r = cur.r || [state.mix, 1 - state.mix];

      sNoise.set(fmt(noise, 3), noise > 0.6 ? 'bad' : noise > 0.2 ? 'warn' : 'good');
      sR.set(fmt(r[0], 2) + ' / ' + fmt(r[1], 2), Math.max(r[0], r[1]) > 0.9 ? 'good' : 'warn');
      sErr.set(fmt(err, 3), err < 0.05 ? 'good' : err > 0.4 ? 'bad' : 'warn');
      sSmooth.set(fmt(rough, 3), rough < 0.2 ? 'good' : rough > 0.7 ? 'bad' : 'warn');

      if (idx === 0) {
        verdict.set(
          '🌫 第 0 步：这就是一团纯高斯噪声，和动作没有任何关系。' +
            '注意此刻模型预测的 $\\hat{x}_0$（绿线）几乎是两条演示的平均 —— 它还看不出该走哪边。',
          'frozen'
        );
      } else if (Math.max(r[0], r[1]) > 0.9) {
        verdict.set(
          '✅ 第 ' +
            idx +
            ' 步：噪声降到 ' +
            fmt(noise, 2) +
            '，模式归属已经锁死在「' +
            (r[0] > r[1] ? '从上绕' : '从下绕') +
            '」（' +
            fmt(Math.max(r[0], r[1]), 2) +
            '）。**整条 16 步一起锁**，不会有一半走错边的情况。剩下的步骤在磨细节。',
          'learning'
        );
      } else {
        verdict.set(
          '🤔 第 ' +
            idx +
            ' 步：还在摇摆（上 ' +
            fmt(r[0], 2) +
            ' / 下 ' +
            fmt(r[1], 2) +
            '）。绿线正卡在两条演示中间 —— 如果就在这里停下，得到的正好是那条「平均动作」。' +
            '扩散的价值就在于它会继续往某一侧坍缩，而不是停在均值上。',
          'frozen'
        );
      }

      // ── 左：chunk 曲线 ──
      var g = begin(chunkStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 42, r: 14, t: 22, b: 34 }, [0, H - 1], [-2.6, 2.6]);
      axes(g, p, {
        xTicks: [0, 4, 8, 12, 15],
        yTicks: [-2, -1, 0, 1, 2],
        xLabel: 'chunk 内的第几步动作'
      });
      text(g.ctx, '长度 16 的动作序列', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      modes.forEach(function (m) {
        line(
          g.ctx,
          m.map(function (v, i2) {
            return [p.sx(i2), p.sy(v)];
          }),
          P.muted,
          1.2,
          [4, 4]
        );
      });
      if (cur.x0) {
        line(
          g.ctx,
          cur.x0.map(function (v, i3) {
            return [p.sx(i3), p.sy(clamp(v, -2.6, 2.6))];
          }),
          P.good,
          1.8
        );
      }
      line(
        g.ctx,
        cur.x.map(function (v, i4) {
          return [p.sx(i4), p.sy(clamp(v, -2.6, 2.6))];
        }),
        P.accent,
        2.4
      );
      cur.x.forEach(function (v, i5) {
        dot(g.ctx, p.sx(i5), p.sy(clamp(v, -2.6, 2.6)), 2.6, P.accent);
      });

      // ── 右：噪声表 ──
      var g2 = begin(schedStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 42, r: 14, t: 22, b: 34 }, [0, state.steps], [0, 1.05]);
      axes(g2, p2, {
        xTicks: K.niceTicks(0, state.steps, 4),
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '已经去噪了几步'
      });
      text(g2.ctx, '噪声水平 √(1−ᾱ) 与模式归属', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var nPts = [],
        rPts = [];
      trace.forEach(function (tr, i6) {
        nPts.push([p2.sx(i6), p2.sy(Math.sqrt(1 - alphaBar(tr.k, state.steps)))]);
        var rr = tr.r ? Math.max(tr.r[0], tr.r[1]) : 0.5;
        rPts.push([p2.sx(i6), p2.sy(rr)]);
      });
      line(g2.ctx, nPts, P2.bad, 2.2);
      line(g2.ctx, rPts, P2.good, 2.2);
      line(g2.ctx, [[p2.x0, p2.sy(0.9)], [p2.x1, p2.sy(0.9)]], P2.muted, 1, [4, 4]);
      text(g2.ctx, '归属 > 0.9 就锁死了', p2.x1 - 4, p2.sy(0.9) - 9, P2.muted, 'right', '10px sans-serif');
      line(g2.ctx, [[p2.sx(idx), p2.y0], [p2.sx(idx), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(idx), p2.sy(noise), 4.5, P2.bad, P2.surface2);

      chunkStage.canvas.setAttribute('aria-label', '动作 chunk 在去噪过程中的形状变化');
      schedStage.canvas.setAttribute('aria-label', '噪声水平与模式归属随去噪步数的变化');
    });

    render();
  }

  // ─── demo 3: receding horizon ────────────────────────────────────────────
  function buildRhcDemo(host) {
    var root = card(host, {
      title: 'Receding Horizon：预测 16 步，只执行 8 步',
      sub:
        '每次推理吐一整条 chunk，但只执行前 $T_a$ 步就丢掉重来。' +
        '$T_a$ 太大，对突发扰动反应慢；$T_a$ 太小，推理频率上去了、块与块的接缝也多了。'
    });

    var state = { horizon: 16, exec: 8, disturbAt: 34, latency: 1, seed: 5 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '预测长度 H',
      min: 4,
      max: 32,
      step: 1,
      value: state.horizon,
      format: function (v) {
        return fmt(v, 0) + ' 步';
      },
      onInput: function (v) {
        state.horizon = v;
        if (state.exec > v) state.exec = v;
        render();
      }
    });
    slider(ctrls, {
      label: '实际执行 $T_a$',
      min: 1,
      max: 32,
      step: 1,
      value: state.exec,
      format: function (v) {
        return fmt(v, 0) + ' 步';
      },
      onInput: function (v) {
        state.exec = v;
        render();
      }
    });
    slider(ctrls, {
      label: '扰动出现在第几步',
      min: 5,
      max: 70,
      step: 1,
      value: state.disturbAt,
      format: function (v) {
        return fmt(v, 0);
      },
      onInput: function (v) {
        state.disturbAt = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '论文设置（16 / 8）', function () {
      state.horizon = 16;
      state.exec = 8;
      render();
    });
    button(btns, '每步都重规划（$T_a = 1$）', function () {
      state.exec = 1;
      render();
    });
    button(btns, '开环跑完整条（$T_a = H$）', function () {
      state.exec = state.horizon;
      render();
    });

    var setLegend = legend(root, [
      { key: 'muted', text: '预测出来但被丢掉的部分' },
      { key: 'accent', text: '真正执行的那 $T_a$ 步' },
      { key: 'bad', text: '扰动发生的时刻' },
      { key: 'good', text: '目标轨迹' }
    ]);

    var grid = stageGrid(root);
    var timeStage = stage(grid, 250);
    var costStage = stage(grid, 250);

    var stats = statsRow(root);
    var sFreq = stats.add('推理频率');
    var sReact = stats.add('对扰动的反应延迟');
    var sSeam = stats.add('一条轨迹上的接缝数');
    var sErr = stats.add('扰动后的累计偏差');
    var verdict = verdictBox(root);

    note(root, [
      '**两头都不能取极端**：$T_a = H$ 是纯开环，扰动来了要等一整条 chunk 跑完才可能修正；' +
        '$T_a = 1$ 每步都重规划，反应最快，但推理要跑满每个控制周期，而且相邻两次采样可能落到不同模态上 —— ' +
        '接缝处的动作会不连续。',
      '**这也是 action chunking 的隐藏收益**：一次预测 16 步，等于给策略一个「短期计划」，' +
        '比逐步预测更不容易在同一个位置反复抖。代价就是这里画的反应延迟。',
      '**延迟不是白等**：反应延迟的上界是 $T_a$ 步 —— 扰动最坏发生在一个 chunk 刚开始执行的时候。' +
        '拖动扰动时刻能看到这个延迟在 0 到 $T_a$ 之间来回跳。',
      '**这是简化模型**：真实系统里还有相机延迟、推理耗时、控制周期，这里只画了 chunk 的调度关系，' +
        '偏差是按「没修正的步数」线性累加的。数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var T = 80;
      var chunks = [];
      for (var s = 0; s < T; s += state.exec) {
        chunks.push({ start: s, end: Math.min(T, s + state.horizon), execEnd: Math.min(T, s + state.exec) });
      }
      // 扰动发生后，要等到下一次重规划才会被看见
      var nextPlan = T;
      for (var i = 0; i < chunks.length; i++) {
        if (chunks[i].start >= state.disturbAt) {
          nextPlan = chunks[i].start;
          break;
        }
      }
      var react = nextPlan - state.disturbAt;
      var drift = react * 0.06;

      sFreq.set('每 ' + state.exec + ' 步一次', state.exec <= 2 ? 'warn' : 'good');
      sReact.set(react + ' 步', react > 12 ? 'bad' : react > 6 ? 'warn' : 'good');
      sSeam.set(chunks.length + ' 个', chunks.length > 40 ? 'bad' : 'good');
      sErr.set(fmt(drift, 2), drift > 0.6 ? 'bad' : drift > 0.25 ? 'warn' : 'good');

      if (state.exec >= state.horizon) {
        verdict.set(
          '🚫 $T_a = H$：纯开环。扰动在第 ' +
            state.disturbAt +
            ' 步发生，要等 ' +
            react +
            ' 步才被看见，累计偏差 ' +
            fmt(drift, 2) +
            '。整条 chunk 执行完之前，策略对世界发生了什么一无所知。',
          'frozen'
        );
      } else if (state.exec === 1) {
        verdict.set(
          '⚡ $T_a = 1$：每一步都重新推理，反应延迟 ' +
            react +
            ' 步（最快），但一条 80 步的轨迹上有 ' +
            chunks.length +
            ' 个接缝，而且每次采样都可能落到不同模态 —— ' +
            '算力和动作连贯性是这里真正的代价。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ H = ' +
            state.horizon +
            ' / $T_a$ = ' +
            state.exec +
            '：推理频率降到每 ' +
            state.exec +
            ' 步一次，反应延迟最多 ' +
            state.exec +
            ' 步（此刻 ' +
            react +
            ' 步）。论文的 16 / 8 就是这个取舍的经验落点。',
          'learning'
        );
      }

      // ── 左：chunk 调度时间线 ──
      var g = begin(timeStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 22, b: 34 }, [0, T], [0, chunks.length + 1]);
      axes(g, p, {
        xTicks: [0, 20, 40, 60, 80],
        yTicks: [],
        xLabel: '控制步'
      });
      text(g.ctx, '每一行 = 一次推理吐出的 chunk', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var rowH = Math.max(4, (p.y0 - p.y1 - 14) / Math.max(1, chunks.length));
      chunks.forEach(function (c, i2) {
        var y = p.y1 + 16 + i2 * rowH;
        if (y > p.y0 - 2) return;
        g.ctx.fillStyle = P.muted;
        g.ctx.globalAlpha = 0.35;
        g.ctx.fillRect(p.sx(c.start), y, p.sx(c.end) - p.sx(c.start), Math.max(2, rowH - 2));
        g.ctx.globalAlpha = 1;
        g.ctx.fillStyle = P.accent;
        g.ctx.fillRect(p.sx(c.start), y, p.sx(c.execEnd) - p.sx(c.start), Math.max(2, rowH - 2));
      });
      line(g.ctx, [[p.sx(state.disturbAt), p.y1], [p.sx(state.disturbAt), p.y0]], P.bad, 2, [4, 3]);
      text(g.ctx, '扰动', p.sx(state.disturbAt) + 5, p.y1 + 10, P.bad, 'left', '10px sans-serif');
      if (nextPlan < T) {
        line(g.ctx, [[p.sx(nextPlan), p.y1], [p.sx(nextPlan), p.y0]], P.good, 2, [4, 3]);
        text(g.ctx, '才被看见', p.sx(nextPlan) + 5, p.y1 + 24, P.good, 'left', '10px sans-serif');
      }

      // ── 右：T_a 的取舍曲线 ──
      var g2 = begin(costStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [1, 32], [0, 1.05]);
      axes(g2, p2, {
        xTicks: [1, 8, 16, 24, 32],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '执行步数 T_a'
      });
      text(g2.ctx, '两条代价曲线的交点就是好落点', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var lagPts = [],
        costPts = [];
      for (var ta = 1; ta <= 32; ta++) {
        lagPts.push([p2.sx(ta), p2.sy(clamp(ta / 32, 0, 1))]);
        costPts.push([p2.sx(ta), p2.sy(clamp(1 / ta, 0, 1))]);
      }
      line(g2.ctx, lagPts, P2.bad, 2.2);
      line(g2.ctx, costPts, P2.warn, 2.2);
      text(g2.ctx, '反应延迟（越大越糟）', p2.x0 + 8, p2.sy(0.94), P2.bad, 'left', '11px sans-serif');
      text(g2.ctx, '推理开销 / 接缝数', p2.x0 + 8, p2.sy(0.84), P2.warn, 'left', '11px sans-serif');
      line(g2.ctx, [[p2.sx(state.exec), p2.y0], [p2.sx(state.exec), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(state.exec), p2.sy(clamp(state.exec / 32, 0, 1)), 4.5, P2.bad, P2.surface2);
      dot(g2.ctx, p2.sx(state.exec), p2.sy(clamp(1 / state.exec, 0, 1)), 4.5, P2.warn, P2.surface2);

      timeStage.canvas.setAttribute('aria-label', 'receding horizon 下每次推理的 chunk 调度时间线');
      costStage.canvas.setAttribute('aria-label', '执行步数与反应延迟、推理开销的取舍曲线');
    });

    render();
  }

  // ─── demo 4: 七幕讲解动画 ────────────────────────────────────────────
  /* 全流程速览：多模态撞障 → 条件扩散 → chunking → 视觉条件 → DDIM → RHC → 定量证据与局限。
     画面上的换算（切掉几步、加速几倍、百分比）都从下面这组配置现算；配置取自论文 arXiv v5
     （2024 期刊扩展版）的正文与附录表 7，以及官方仓库 real-stanford/diffusion_policy。
     播放器是共享的 K.explainer；这里只放分镜。 */

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

  /* 与上文 denoise / RHC 演示同一组默认：预测 H = T_p = 16、执行 T_a = 8、看 T_o = 2 帧（表 7 仿真任务）。
     源码 predict_action 从上一帧观测的时刻切起（start = To − 1），
     所以这 16 步 = 已经过去的 1 步 + 执行 8 步 + 丢掉 7 步。 */
  var TA = 8;
  var N_OBS = 2;
  var SKIP = N_OBS - 1; // 1
  var DISCARD = H - SKIP - TA; // 7
  var REAL_TA = 6; // 表 7：真机 Push-T 的 T_a
  /* 3.4 节：训练 100 步、DDIM 推理 10 步，RTX 3080 上 0.1 s；表 7 真机配置与 eval_real_robot.py 是 16 步；
     仿真基准用 iDDPM，推理也是 100 步（附录 A.4）。 */
  var TRAIN_K = 100;
  var INFER_K = 10;
  var REAL_K = 16;
  var SPEEDUP = TRAIN_K / INFER_K; // 10
  var LATENCY_S = 0.1;
  var CTRL_HZ = 10;
  var ROBOT_HZ = 125;
  var LAT_OK = 4; // 图 5 右：模拟延迟 ≤ 4 步性能不掉
  var N_TASKS = 15;
  var N_BENCH = 4;
  var LIFT_PCT = 46.9; // 仿真基准（表 1、2、4）平均提升
  var GAIN_BLOCK = 32; // Block Push p2
  var GAIN_KITCHEN = 213; // Kitchen p4
  var REAL_PUSHT = [
    { name: 'Diffusion Policy', v: 95, c: C_GOOD },
    { name: 'LSTM-GMM', v: 20, c: C_WARN },
    { name: 'IBC', v: 0, c: C_BAD }
  ]; // 表 6：真机 Push-T 成功率（%）
  var MUG_OK = 18,
    MUG_N = 20; // 翻杯子 90%，20 次
  var VIT_SCRATCH = 22,
    CLIP_FT = 98; // 表 5：Square（PH）编码器消融

  function quadPath(a, c, b) {
    return 'M ' + a[0] + ' ' + a[1] + ' Q ' + c[0] + ' ' + c[1] + ' ' + b[0] + ' ' + b[1];
  }

  function sampleQuad(a, c, b, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n,
        u = 1 - t;
      pts.push([
        u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
        u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]
      ]);
    }
    return pts;
  }

  /* 一条折线画到第 u（0…1）比例为止：用 dasharray 露出前一段。 */
  function revealPath(path, u) {
    var len = path.getTotalLength ? path.getTotalLength() : 0;
    if (!len) return;
    path.setAttribute('stroke-dasharray', len.toFixed(1) + ' ' + len.toFixed(1));
    path.setAttribute('stroke-dashoffset', (len * (1 - clamp(u, 0, 1))).toFixed(1));
  }

  function box(parent, x, y, w, h, stroke, fill, dashed) {
    var r = paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 8, 'stroke-width': 1.4 }), fill || C_SURFACE, stroke);
    if (dashed) r.setAttribute('stroke-dasharray', '5 4');
    parent.appendChild(r);
    return r;
  }

  // ─── 第 1 幕：平均动作撞上障碍 ──────────────────────────────────────
  /* 观众多半刚看完仿真里靠奖励学动作的几篇（PPO … PULSE），这里第一次碰到「照着演示回归」：
     先把行为克隆和平方损失（MSE）用大白话讲清，再用论文图 3 的 Push-T 说明四种方法各是什么。 */
  function buildSceneProblem() {
    var s = sceneSvg(
      '行为克隆：把演示里看到的观测和做出的动作配成对来回归。演示一半从上绕、一半从下绕，平方损失（MSE）回归的条件均值正好穿过障碍；扩散采的是分布，每次落在某一侧'
    );
    s.appendChild(svgText(48, 22, '同一观测、两种做法：用平方损失（MSE）回归，最优解就是撞上障碍的「平均动作」', 'demo-x-ink2', 12.5));

    var start = [70, 150],
      end = [370, 150],
      obst = [220, 150];
    var up = sampleQuad(start, [220, 60], end, 24);
    var down = sampleQuad(start, [220, 240], end, 24);
    var mid = [start, end];

    var scene = svgEl('g', {});
    scene.appendChild(paint(svgEl('circle', { cx: obst[0], cy: obst[1], r: 34, 'stroke-width': 1.6 }), C_SURFACE, C_WARN));
    scene.appendChild(paint(svgText(obst[0], obst[1] + 4, '障碍', null, 10, 'middle'), C_WARN));
    scene.appendChild(paint(svgEl('path', { d: polyPath(up), fill: 'none', 'stroke-width': 2 }), null, C_GOOD));
    scene.appendChild(paint(svgEl('path', { d: polyPath(down), fill: 'none', 'stroke-width': 2 }), null, C_GOOD));
    scene.appendChild(paint(svgText(220, 92, '演示 ①：从上绕', null, 10, 'middle'), C_GOOD));
    scene.appendChild(paint(svgText(220, 218, '演示 ②：从下绕', null, 10, 'middle'), C_GOOD));
    scene.appendChild(paint(svgEl('circle', { cx: start[0], cy: start[1], r: 5, 'stroke-width': 1.2 }), C_ACCENT, C_SURFACE2));
    scene.appendChild(paint(svgEl('circle', { cx: end[0], cy: end[1], r: 5, 'stroke-width': 1.2 }), C_ACCENT, C_SURFACE2));
    scene.appendChild(svgText(start[0], start[1] + 22, '起点', 'demo-x-mut', 9, 'middle'));
    scene.appendChild(svgText(end[0], end[1] + 22, '目标', 'demo-x-mut', 9, 'middle'));
    s.appendChild(scene);

    var meanG = svgEl('g', {});
    meanG.appendChild(
      paint(svgEl('path', { d: polyPath(mid), fill: 'none', 'stroke-width': 2.4, 'stroke-dasharray': '6 4' }), null, C_BAD)
    );
    meanG.appendChild(paint(svgText(262, 170, '回归：均值', null, 10), C_BAD));
    s.appendChild(meanG);
    var tok = paint(svgEl('circle', { r: 6, 'stroke-width': 1.6 }), C_BAD, C_SURFACE2);
    s.appendChild(tok);

    /* 扩散采样：每条都落在上绕或下绕的某一侧（示意，侧别是固定的一组）。 */
    var picks = [1, -1, 1, 1, -1, -1];
    var samples = picks.map(function (side, k) {
      var cy = 150 + side * (90 + ((k * 7) % 5) * 3);
      var p = paint(svgEl('path', { d: quadPath(start, [220, cy], end), fill: 'none', 'stroke-width': 1.5 }), null, C_ACCENT);
      p.style.strokeOpacity = 0.85;
      s.appendChild(p);
      return { p: p, at: 7.2 + k * 0.32 };
    });
    var sampleTag = paint(svgText(220, 244, '扩散采 6 次：上 3 次、下 3 次，没有一次走中间', null, 10, 'middle'), C_ACCENT);
    s.appendChild(sampleTag);

    var mseMath = svgMath(580, 40, '\\arg\\min_f\\ \\mathbb{E}[(a-f(o))^2] = \\mathbb{E}[a\\mid o]', {
      size: 12.5,
      w: 380,
      anchor: 'middle'
    });
    mseMath.setTone('var(--demo-bad)');
    s.appendChild(mseMath);

    var cards = [
      { y: 56, h: 60, t: '① 行为克隆：照着演示回归', d: ['把「看到的观测 → 做出的动作」配成对', '同一观测下：一半上绕、一半下绕'], c: C_WARN, at: 0.6 },
      { y: 124, h: 78, t: '② 平方损失（MSE）只能给均值', d: ['MSE：预测与演示之差的平方，再取平均', '最优解是两峰的平均，正中障碍', '换更大的网络、训更久也一样'], c: C_BAD, at: 2.6 },
      { y: 210, h: 44, t: '③ 扩散采分布：每次落到某一侧', d: [], c: C_GOOD, at: 7.0 }
    ].map(function (p) {
      var g = svgEl('g', {});
      box(g, 400, p.y, 360, p.h, p.c);
      g.appendChild(paint(svgText(416, p.y + 20, p.t, null, 11.5), p.c));
      var lines = p.d.map(function (d, q) {
        var tx = svgText(416, p.y + 38 + q * 16, d, 'demo-x-mut', 9.5);
        g.appendChild(tx);
        return tx;
      });
      s.appendChild(g);
      return { g: g, at: p.at, lines: lines };
    });

    /* 论文图 3：Push-T —— 用圆头把 T 形积木推进目标框；左边一张示意图，右边四种方法各一句话。 */
    var fig = svgEl('g', {});
    box(fig, 40, 264, 720, 152, C_ACCENT, C_SURFACE2);
    fig.appendChild(paint(svgText(56, 284, '论文图 3 · Push-T：用圆头把 T 形积木推进目标框，从左绕、从右绕都对', null, 11.5), C_ACCENT));
    var tgt = svgEl('g', {});
    tgt.appendChild(paint(svgEl('path', { d: 'M 82 306 h 72 v 16 h -28 v 46 h -16 v -46 h -28 z', fill: 'none', 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }), null, C_GOOD));
    tgt.appendChild(paint(svgEl('path', { d: 'M 92 318 h 60 v 14 h -23 v 38 h -14 v -38 h -23 z', 'stroke-width': 1.2 }), C_MUTED, C_BORDER));
    tgt.appendChild(paint(svgEl('circle', { cx: 122, cy: 396, r: 7, 'stroke-width': 1.4 }), C_ACCENT, C_SURFACE2));
    tgt.appendChild(paint(svgEl('path', { d: 'M 115 393 Q 84 388 90 352', fill: 'none', 'stroke-width': 1.4, 'stroke-dasharray': '3 3' }), null, C_ACCENT));
    tgt.appendChild(paint(svgEl('path', { d: 'M 129 393 Q 160 388 154 352', fill: 'none', 'stroke-width': 1.4, 'stroke-dasharray': '3 3' }), null, C_ACCENT));
    tgt.appendChild(svgText(64, 410, '灰：T 形积木', 'demo-x-mut', 8.5));
    tgt.appendChild(svgText(132, 410, '虚线：目标框', 'demo-x-mut', 8.5));
    fig.appendChild(tgt);
    var rows = [
      { t: 'Diffusion Policy', d: '本篇：扩散生成动作', v: '两边都学到，每次只走一边', c: C_GOOD },
      { t: 'LSTM-GMM', d: '循环网络输出几个高斯叠加', v: '偏向其中一边', c: C_WARN },
      { t: 'IBC', d: '能量模型：给每个动作打分', v: '偏向其中一边', c: C_WARN },
      { t: 'BET', d: '先把动作聚类，再补一个偏移', v: '两边来回切，定不下来', c: C_BAD }
    ].map(function (p, k) {
      var g = svgEl('g', {});
      var y = 308 + k * 26;
      g.appendChild(paint(svgText(206, y, p.t, null, 11), p.c));
      g.appendChild(svgText(326, y, p.d, 'demo-x-mut', 9.5));
      g.appendChild(paint(svgText(744, y, p.v, null, 10, 'end'), p.c));
      fig.appendChild(g);
      return { g: g, at: k === 0 ? 10.6 : 11.0 + (k - 1) * 0.35 };
    });
    s.appendChild(fig);

    function draw(t) {
      var u = ease(seg(t, 2.4, 4.4));
      var pt = pointOn(mid, u);
      tok.setAttribute('cx', pt[0].toFixed(1));
      tok.setAttribute('cy', pt[1].toFixed(1));
      setOpacity(tok, seg(t, 2.2, 2.6));
      setOpacity(meanG, seg(t, 2.2, 2.8));
      setOpacity(mseMath, seg(t, 2.4, 3.2));
      cards.forEach(function (p) {
        setOpacity(p.g, seg(t, p.at, p.at + 0.45));
      });
      setOpacity(cards[1].lines[2], seg(t, 4.6, 5.1));
      samples.forEach(function (p) {
        var v = seg(t, p.at, p.at + 0.5);
        setOpacity(p.p, v ? 1 : 0);
        revealPath(p.p, ease(v));
      });
      setOpacity(sampleTag, seg(t, 9.0, 9.4));
      setOpacity(fig, seg(t, 9.4, 10.0));
      rows.forEach(function (r) {
        setOpacity(r.g, seg(t, r.at, r.at + 0.4));
      });
    }

    return { el: s, draw: draw };
  }

  // ─── 第 2 幕：动作是条件扩散过程 ────────────────────────────────────
  function buildSceneDiffusion() {
    var s = sceneSvg(
      '策略学条件分布 p(A|O)：训练时随机加噪、让网络预测噪声；推理时从高斯噪声出发，减去预测的噪声再加扰动，重复 K 次'
    );
    s.appendChild(svgText(56, 26, '扩散模型：先学会去噪，用的时候从纯噪声一步步还原出一段动作', 'demo-x-ink2', 13.5));

    var arrow = K.arrowMarker(s, 'dp-x-arrow-diff', C_BORDER);
    var stages = [
      { t: '干净动作 $A^0_t$', d: '一段演示', c: C_GOOD },
      { t: '加噪 $A^k_t$', d: '随机选一步 $k$', c: C_WARN },
      { t: '纯噪声 $A^K_t$', d: '标准高斯', c: C_BAD },
      { t: '去噪 $\\varepsilon_\\theta$', d: '条件于观测 $O_t$', c: C_ACCENT },
      { t: '还原 $A^0_t$', d: '重复 $K$ 次', c: C_GOOD }
    ].map(function (p, k) {
      var g = svgEl('g', {});
      var x = 36 + k * 154;
      g.appendChild(paint(svgEl('rect', { x: x, y: 42, width: 140, height: 54, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, p.c));
      g.appendChild(svgRich(x + 70, 64, p.t, { size: 11.5, anchor: 'middle', w: 140 }).setTone(p.c));
      g.appendChild(svgRich(x + 70, 84, p.d, { size: 9, cls: 'demo-x-mut', anchor: 'middle', w: 140 }));
      s.appendChild(g);
      if (k < 4) {
        s.appendChild(
          paint(
            svgEl('path', { d: polyPath([[x + 144, 69], [x + 150, 69]]), fill: 'none', 'stroke-width': 1.5, 'marker-end': arrow }),
            null,
            C_BORDER
          )
        );
      }
      return { g: g, at: 0.4 + k * 0.4 };
    });

    var trainG = svgEl('g', {});
    trainG.appendChild(paint(svgText(40, 124, '训练（式 5）', null, 11), C_WARN));
    trainG.appendChild(
      svgMath(130, 124, '\\mathcal{L} = \\mathrm{MSE}\\big(\\varepsilon^k,\\ \\varepsilon_\\theta(O_t,\\ A^0_t + \\varepsilon^k,\\ k)\\big)', {
        size: 13,
        w: 560
      }).setTone('var(--demo-warn)')
    );
    s.appendChild(trainG);

    var inferG = svgEl('g', {});
    inferG.appendChild(paint(svgText(40, 158, '推理（式 4）', null, 11), C_ACCENT));
    inferG.appendChild(
      svgMath(130, 158, 'A^{k-1}_t = \\alpha\\big(A^k_t - \\gamma\\,\\varepsilon_\\theta(O_t, A^k_t, k) + \\mathcal{N}(0, \\sigma^2 I)\\big)', {
        size: 13,
        w: 620
      }).setTone('var(--demo-accent)')
    );
    s.appendChild(inferG);

    var ebm = svgEl('g', {});
    box(ebm, 40, 182, 350, 108, C_BAD, C_SURFACE, true);
    ebm.appendChild(paint(svgText(56, 204, '能量模型 IBC：给每个动作打分', null, 12), C_BAD));
    ebm.appendChild(svgMath(215, 238, 'p_\\theta(a\\mid o) = \\dfrac{e^{-E_\\theta(o,a)}}{Z(o,\\theta)}', { size: 12, w: 330, h: 50, anchor: 'middle' }));
    ebm.appendChild(svgRich(56, 274, '$Z$ 要对所有动作求和，只能靠负样本估 → 训练不稳（图 6）', { size: 10, cls: 'demo-x-mut', w: 330 }));
    s.appendChild(ebm);

    var dp = svgEl('g', {});
    box(dp, 410, 182, 350, 108, C_GOOD, C_SURFACE2);
    dp.appendChild(paint(svgText(426, 204, 'Diffusion Policy：学「分数」（score）', null, 12), C_GOOD));
    dp.appendChild(svgMath(585, 238, '\\varepsilon_\\theta(a, o) \\approx -\\nabla_a \\log p(a\\mid o)', { size: 12, w: 330, anchor: 'middle' }));
    dp.appendChild(svgRich(426, 274, '分数 = 对数概率对动作的梯度；$\\nabla_a \\log Z = 0$，$Z$ 求导就消掉（式 8）', { size: 10, cls: 'demo-x-mut', w: 330 }));
    s.appendChild(dp);

    /* 多峰从哪来：粒子从不同的噪声位置出发，沿梯度滑进不同的峰（示意）。 */
    var X0 = 120,
      X1 = 700,
      BASE = 392,
      PEAKS = [300, 540];
    function dens(x) {
      return Math.exp(-Math.pow((x - PEAKS[0]) / 46, 2)) + Math.exp(-Math.pow((x - PEAKS[1]) / 46, 2));
    }
    var curvePts = [];
    for (var i = 0; i <= 64; i++) {
      var xx = X0 + ((X1 - X0) * i) / 64;
      curvePts.push([xx, BASE - 44 * dens(xx)]);
    }
    var modeG = svgEl('g', {});
    modeG.appendChild(svgRich(40, 314, '多峰从哪来：每次从不同的高斯噪声出发，每步再加随机扰动（4.1 节）', { size: 11, w: 720 }).setTone(C_ACCENT));
    modeG.appendChild(paint(svgEl('path', { d: polyPath([[X0, BASE], [X1, BASE]]), fill: 'none', 'stroke-width': 1.2 }), null, C_BORDER));
    modeG.appendChild(paint(svgEl('path', { d: polyPath(curvePts), fill: 'none', 'stroke-width': 1.8 }), null, C_GOOD));
    modeG.appendChild(svgText(X1 + 6, BASE + 4, '动作', 'demo-x-mut', 9));
    s.appendChild(modeG);
    var starts = [150, 255, 400, 445, 600, 680];
    var particles = starts.map(function (x0) {
      var target = x0 < 420 ? PEAKS[0] : PEAKS[1];
      var c = paint(svgEl('circle', { r: 4.5, 'stroke-width': 1.2 }), C_ACCENT, C_SURFACE2);
      s.appendChild(c);
      return { c: c, x0: x0, x1: target + (x0 % 3) * 4 - 4 };
    });

    function draw(t) {
      stages.forEach(function (p) {
        setOpacity(p.g, seg(t, p.at, p.at + 0.4));
      });
      setOpacity(trainG, seg(t, 2.2, 2.9));
      setOpacity(inferG, seg(t, 4.6, 5.3));
      setOpacity(ebm, seg(t, 7.0, 7.6));
      setOpacity(dp, seg(t, 8.0, 8.6));
      setOpacity(modeG, seg(t, 9.4, 9.9));
      var u = ease(seg(t, 9.9, 11.6));
      particles.forEach(function (p) {
        var x = p.x0 + (p.x1 - p.x0) * u;
        p.c.setAttribute('cx', x.toFixed(1));
        p.c.setAttribute('cy', (BASE - 44 * dens(x) - 6).toFixed(1));
        setOpacity(p.c, seg(t, 9.6, 10.0));
      });
    }

    return { el: s, draw: draw };
  }

  // ─── 第 3 幕：Action chunking ───────────────────────────────────────
  function buildSceneChunk() {
    var s = sceneSvg(
      '一次预测长度 ' +
        H +
        ' 的动作序列，整段一起去噪：选定的峰整段一致；还不怕演示里的停顿，扩散也撑得住这么高维的输出'
    );
    s.appendChild(svgText(56, 26, '动作分块（action chunking）：一次预测一整段，选定的峰整段一致', 'demo-x-ink2', 13.5));

    var chunkMath = svgMath(400, 54, 'A_t = [a_t,\\ a_{t+1},\\ \\ldots,\\ a_{t+' + (H - 1) + '}]\\qquad T_p = ' + H, {
      size: 14,
      w: 620,
      anchor: 'middle'
    });
    chunkMath.setTone('var(--demo-accent)');
    s.appendChild(chunkMath);

    /* 开场：一次去噪吐出的整段 16 步（卡片出来时淡出）。 */
    var strip = svgEl('g', {});
    for (var c = 0; c < H; c++) {
      var cx0 = 48 + c * 44;
      strip.appendChild(paint(svgEl('rect', { x: cx0, y: 128, width: 40, height: 44, rx: 6, 'stroke-width': 1.3 }), C_SURFACE2, C_GOOD));
      strip.appendChild(paint(svgText(cx0 + 20, 156, String(c + 1), 'demo-x-mono', 11, 'middle'), C_GOOD));
    }
    strip.appendChild(paint(svgText(400, 108, '一次去噪，整段 ' + H + ' 步一起出来', null, 13, 'middle'), C_GOOD));
    strip.appendChild(svgText(400, 200, '不是「出一步、看一眼、再出一步」', 'demo-x-mut', 11, 'middle'));
    s.appendChild(strip);

    /* 每张卡里一个迷你绕障场景：H 个点，逐步各采各的会上下乱跳，整段去噪则整段走同一侧。 */
    var pattern = [1, 1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1, 1, 1];
    function mini(x0, mode) {
      var g = svgEl('g', {});
      var a = [x0 + 34, 150],
        b = [x0 + 316, 150],
        cx = x0 + 175;
      g.appendChild(paint(svgEl('circle', { cx: cx, cy: 150, r: 20, 'stroke-width': 1.4 }), C_SURFACE, C_WARN));
      g.appendChild(paint(svgText(cx, 154, '障碍', null, 9, 'middle'), C_WARN));
      var upP = sampleQuad(a, [cx, 92], b, H - 1),
        dnP = sampleQuad(a, [cx, 208], b, H - 1);
      [upP, dnP].forEach(function (pp) {
        var ghost = paint(svgEl('path', { d: polyPath(pp), fill: 'none', 'stroke-width': 1.1, 'stroke-dasharray': '3 4' }), null, C_MUTED);
        g.appendChild(ghost);
      });
      var pts = [];
      for (var i = 0; i < H; i++) {
        var side = mode === 'jitter' ? pattern[i] : 1;
        pts.push(side > 0 ? upP[i] : dnP[i]);
      }
      var path = paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': 2 }), null, mode === 'jitter' ? C_BAD : C_GOOD);
      g.appendChild(path);
      var dots = pts.map(function (p) {
        var d = paint(svgEl('circle', { cx: p[0], cy: p[1], r: 2.8 }), mode === 'jitter' ? C_BAD : C_GOOD);
        g.appendChild(d);
        return d;
      });
      return { g: g, path: path, dots: dots };
    }

    var left = svgEl('g', {});
    box(left, 40, 72, 350, 194, C_BAD, C_SURFACE, true);
    left.appendChild(paint(svgText(56, 94, '逐步各采各的（LSTM-GMM、BET）', null, 12), C_BAD));
    var mL = mini(40, 'jitter');
    left.appendChild(mL.g);
    left.appendChild(svgText(56, 234, '相邻两步可能来自不同的峰', 'demo-x-mut', 10.5));
    left.appendChild(svgText(56, 254, '在两条可行轨迹之间来回抖（4.3 节）', 'demo-x-mut', 10.5));
    s.appendChild(left);

    var right = svgEl('g', {});
    box(right, 410, 72, 350, 194, C_GOOD, C_SURFACE2);
    right.appendChild(paint(svgText(426, 94, '整段一起去噪（Diffusion Policy）', null, 12), C_GOOD));
    var mR = mini(410, 'chunk');
    right.appendChild(mR.g);
    right.appendChild(svgText(426, 234, '峰一旦选定，' + H + ' 步都走同一侧', 'demo-x-mut', 10.5));
    right.appendChild(svgText(426, 254, '笔记里的演示按整段算峰的归属（玩具模型）', 'demo-x-mut', 10.5));
    s.appendChild(right);

    var idle = svgEl('g', {});
    box(idle, 40, 280, 350, 76, C_WARN);
    idle.appendChild(paint(svgText(56, 302, '好处二：不怕停顿', null, 12), C_WARN));
    idle.appendChild(svgText(56, 322, '比如真机上用勺子从碗里舀番茄酱，得停住等酱装满', 'demo-x-mut', 10));
    idle.appendChild(svgText(56, 342, '单步策略易学成原地不动；真机上 LSTM-GMM、IBC 常停住', 'demo-x-mut', 10));
    s.appendChild(idle);

    var hd = svgEl('g', {});
    box(hd, 410, 280, 350, 76, C_ACCENT);
    hd.appendChild(paint(svgText(426, 302, '为什么以前少有人这样做：维度高', null, 12), C_ACCENT));
    hd.appendChild(svgText(426, 322, 'LSTM-GMM 要先定几个峰，IBC 在高维里采不动', 'demo-x-mut', 10));
    hd.appendChild(svgText(426, 342, '扩散在图像生成里早已撑住高维输出', 'demo-x-mut', 10));
    s.appendChild(hd);

    var foot = paint(svgText(400, 388, 'chunking 不只是「预测得远」：选定的峰在时间上一致', null, 13.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(chunkMath, seg(t, 0.3, 1.0));
      setOpacity(strip, Math.min(seg(t, 0.5, 1.0), 1 - seg(t, 2.2, 2.5)));
      setOpacity(left, seg(t, 2.2, 2.7));
      var uL = seg(t, 2.6, 4.6);
      revealPath(mL.path, uL);
      mL.dots.forEach(function (d, i) {
        setOpacity(d, uL >= i / (H - 1) - 1e-6 ? 1 : 0);
      });
      setOpacity(right, seg(t, 4.8, 5.3));
      var uR = seg(t, 5.2, 7.0);
      revealPath(mR.path, uR);
      mR.dots.forEach(function (d, i) {
        setOpacity(d, uR >= i / (H - 1) - 1e-6 ? 1 : 0);
      });
      setOpacity(idle, seg(t, 7.4, 7.9));
      setOpacity(hd, seg(t, 9.6, 10.1));
      setOpacity(foot, seg(t, 11.2, 11.7));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 4 幕：视觉条件 + FiLM ───────────────────────────────────────
  function buildSceneCondition() {
    var s = sceneSvg(
      '观测只做条件：最近 ' +
        N_OBS +
        ' 帧图像经 ResNet-18 编成特征，每次推理只算一遍，K 步去噪都复用；去噪网络有卷积版（FiLM）与 Transformer 版（交叉注意力）'
    );
    s.appendChild(svgText(56, 24, '观测只做条件：图像特征每次推理算一遍，K 步去噪都复用', 'demo-x-ink2', 13.5));

    var cond = svgRich(400, 50, '只学 $p(A_t \\mid O_t)$：观测只做条件、不被生成（前作 Diffuser 做规划时，观测和动作一起生成）', {
      size: 11,
      w: 740,
      anchor: 'middle'
    }).setTone(C_ACCENT);
    s.appendChild(cond);

    var arrow = K.arrowMarker(s, 'dp-x-arrow-cond', C_BORDER);
    var pipe = [
      { t: '观测', d: '最近 $T_o = ' + N_OBS + '$ 帧图像 + 本体', c: C_MUTED, w: 168 },
      { t: 'ResNet-18', d: '常用图像卷积网络，从头训', c: C_ACCENT, w: 160 },
      { t: '观测特征 $O_t$', d: '每次推理只算一遍', c: C_WARN, w: 160 },
      { t: '去噪 $\\varepsilon_\\theta(O_t, A^k_t, k)$', d: '复用 $O_t$，重复 $K$ 次', c: C_GOOD, w: 184 }
    ];
    var x = 40;
    var nodes = pipe.map(function (p, k) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: x, y: 66, width: p.w, height: 54, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, p.c));
      g.appendChild(svgRich(x + p.w / 2, 88, p.t, { size: 11.5, anchor: 'middle', w: 220 }).setTone(p.c));
      g.appendChild(svgRich(x + p.w / 2, 108, p.d, { size: 9, cls: 'demo-x-mut', anchor: 'middle', w: 220 }));
      if (k < pipe.length - 1) {
        g.appendChild(
          paint(
            svgEl('path', { d: polyPath([[x + p.w + 3, 93], [x + p.w + 17, 93]]), fill: 'none', 'stroke-width': 1.5, 'marker-end': arrow }),
            null,
            C_BORDER
          )
        );
      }
      s.appendChild(g);
      var node = { g: g, at: 0.5 + k * 0.45, x: x, w: p.w };
      x += p.w + 20;
      return node;
    });
    var last = nodes[nodes.length - 1];
    var loop = svgEl('g', {});
    loop.appendChild(
      paint(
        svgEl('path', {
          d: 'M ' + (last.x + 40) + ' 120 C ' + (last.x + 40) + ' 140, ' + (last.x + last.w - 40) + ' 140, ' + (last.x + last.w - 40) + ' 122',
          fill: 'none',
          'stroke-width': 1.6,
          'marker-end': arrow
        }),
        null,
        C_GOOD
      )
    );
    loop.appendChild(svgRich(last.x + last.w / 2, 148, '$\\times K$', { size: 11, anchor: 'middle', w: 80 }).setTone(C_GOOD));
    s.appendChild(loop);

    var enc = svgEl('g', {});
    box(enc, 40, 158, 720, 50, C_ACCENT, C_SURFACE2);
    enc.appendChild(paint(svgText(56, 178, 'ResNet-18 两处改动（3.2 节）', null, 11.5), C_ACCENT));
    enc.appendChild(svgText(250, 178, '① 池化改成空间 softmax：保留「东西在图里哪儿」', 'demo-x-mut', 10));
    enc.appendChild(svgText(250, 198, '② 归一化换成 GroupNorm：才能配合 EMA（额外存一份平滑过的权重）', 'demo-x-mut', 10));
    s.appendChild(enc);
    var obsNote = svgRich(56, 198, '$T_o = ' + N_OBS + '$：一帧不够、太多下降（图 14）', { size: 9.5, cls: 'demo-x-mut', w: 190 });
    s.appendChild(obsNote);

    var arch = [
      {
        t: '卷积版（1D UNet）+ FiLM',
        d: 'FiLM：每层按通道乘缩放、加偏置 $\\gamma(O_t, k) \\odot h + \\beta(O_t, k)$',
        d2: '开箱即用、少调参；动作变化快时被卷积平滑掉',
        c: C_ACCENT,
        at: 7.0
      },
      {
        t: 'Transformer 版：用注意力读观测',
        d: '带噪动作排成一串 token，交叉注意力去读 $O_t$',
        d2: '复杂、变化快的任务更好，但对超参数更敏感',
        c: C_GOOD,
        at: 9.6
      }
    ].map(function (p, k) {
      var g = svgEl('g', {});
      var px = 40 + k * 370;
      box(g, px, 222, 350, 84, p.c);
      g.appendChild(paint(svgText(px + 16, 244, p.t, null, 12.5), p.c));
      g.appendChild(svgRich(px + 16, 268, p.d, { size: 10, cls: 'demo-x-mut', w: 330 }));
      g.appendChild(svgText(px + 16, 292, p.d2, 'demo-x-mut', 10));
      s.appendChild(g);
      return { g: g, at: p.at };
    });
    var rec = paint(svgText(400, 326, '论文建议：新任务先试卷积版，表现不够再换 Transformer（3.1 节）', null, 12, 'middle'), C_WARN);
    s.appendChild(rec);

    var abl = svgEl('g', {});
    box(abl, 40, 340, 720, 52, C_BORDER, C_SURFACE2);
    abl.appendChild(svgText(56, 360, '编码器对比（表 5 · Square：抓起方形螺母套到柱子上）', 'demo-x-ink2', 10.5));
    [
      { t: '从头训 ViT：' + VIT_SCRATCH + '%', c: C_BAD },
      { t: '冻住预训练网络：效果不好', c: C_WARN },
      { t: '微调图文预训练的 CLIP：' + CLIP_FT + '%', c: C_GOOD }
    ].forEach(function (p, k) {
      abl.appendChild(paint(svgText(56 + k * 236, 380, p.t, null, 11), p.c));
    });
    s.appendChild(abl);

    function draw(t) {
      setOpacity(cond, seg(t, 0.3, 0.9));
      nodes.forEach(function (n) {
        setOpacity(n.g, seg(t, n.at, n.at + 0.4));
      });
      setOpacity(loop, seg(t, 2.6, 3.2));
      setOpacity(enc, seg(t, 4.6, 5.2));
      setOpacity(obsNote, seg(t, 5.8, 6.3));
      arch.forEach(function (a) {
        setOpacity(a.g, seg(t, a.at, a.at + 0.45));
      });
      setOpacity(rec, seg(t, 11.2, 11.7));
      setOpacity(abl, seg(t, 12.2, 12.8));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 5 幕：DDIM —— 100 步训练，10 步推理 ──────────────────────────
  function buildSceneDdim() {
    var s = sceneSvg(
      '训练用 ' +
        TRAIN_K +
        ' 步扩散；DDIM 把训练和推理的步数解耦，论文 3.4 节推理 ' +
        INFER_K +
        ' 步、RTX 3080 上 ' +
        LATENCY_S +
        ' 秒，加速 ' +
        fmt(SPEEDUP, 0) +
        ' 倍；真机配置写的是 ' +
        REAL_K +
        ' 步'
    );
    s.appendChild(svgText(56, 26, '训练可以慢，推理必须赶上控制周期', 'demo-x-ink2', 13.5));

    var train = svgEl('g', {});
    box(train, 40, 42, 350, 100, C_WARN);
    train.appendChild(paint(svgText(56, 66, '训练：DDPM（逐步去噪）' + TRAIN_K + ' 步', null, 13), C_WARN));
    train.appendChild(svgRich(56, 92, '每个样本随机选一步 $k$，加噪后预测 $\\varepsilon$', { size: 10.5, cls: 'demo-x-mut', w: 330 }));
    train.appendChild(svgText(56, 116, '噪声表：平方余弦（iDDPM，3.3 节）', 'demo-x-mut', 10.5));
    s.appendChild(train);

    var infer = svgEl('g', {});
    box(infer, 410, 42, 350, 100, C_GOOD, C_SURFACE2);
    infer.appendChild(paint(svgText(426, 66, '推理：DDIM 跳步采样', null, 13), C_GOOD));
    infer.appendChild(svgText(426, 92, '训练、推理的步数解耦，反向过程可以跳步', 'demo-x-mut', 10.5));
    infer.appendChild(svgText(426, 116, '同一个网络，不用重新训练', 'demo-x-mut', 10.5));
    s.appendChild(infer);

    /* 两条步数轨：DDPM 一格一格走完 100 格，DDIM 只跳 10 次。 */
    var BX0 = 130,
      BX1 = 750;
    var barA = svgEl('g', {}),
      barB = svgEl('g', {});
    barA.appendChild(paint(svgText(40, 172, 'DDPM ' + TRAIN_K + ' 步', 'demo-x-mono', 10.5), C_WARN));
    barB.appendChild(paint(svgText(40, 206, 'DDIM ' + INFER_K + ' 步', 'demo-x-mono', 10.5), C_GOOD));
    barA.appendChild(paint(svgEl('path', { d: polyPath([[BX0, 168], [BX1, 168]]), fill: 'none', 'stroke-width': 1.2 }), null, C_BORDER));
    barB.appendChild(paint(svgEl('path', { d: polyPath([[BX0, 202], [BX1, 202]]), fill: 'none', 'stroke-width': 1.2 }), null, C_BORDER));
    for (var i = 0; i <= TRAIN_K; i++) {
      var tx = BX0 + ((BX1 - BX0) * i) / TRAIN_K;
      barA.appendChild(paint(svgEl('path', { d: polyPath([[tx, 163], [tx, 173]]), fill: 'none', 'stroke-width': 0.8 }), null, C_WARN));
    }
    for (var j = 0; j <= INFER_K; j++) {
      var jx = BX0 + ((BX1 - BX0) * j) / INFER_K;
      barB.appendChild(paint(svgEl('path', { d: polyPath([[jx, 194], [jx, 210]]), fill: 'none', 'stroke-width': 1.6 }), null, C_GOOD));
    }
    s.appendChild(barA);
    s.appendChild(barB);
    var dotA = paint(svgEl('circle', { r: 5.5, 'stroke-width': 1.4 }), C_WARN, C_SURFACE2);
    var dotB = paint(svgEl('circle', { r: 5.5, 'stroke-width': 1.4 }), C_GOOD, C_SURFACE2);
    s.appendChild(dotA);
    s.appendChild(dotB);

    var nums = [
      { t: '仿真基准：不用 DDIM', d: 'iDDPM（改进版 DDPM）推理 ' + TRAIN_K + ' 步', c: C_MUTED },
      { t: '3.4 节：' + TRAIN_K + ' ÷ ' + INFER_K + ' = ' + fmt(SPEEDUP, 0) + '×', d: 'DDIM ' + INFER_K + ' 步，RTX 3080 上 ' + LATENCY_S + ' s', c: C_GOOD },
      { t: '真机配置：DDIM ' + REAL_K + ' 步', d: '表 7 与 eval_real_robot.py', c: C_ACCENT }
    ].map(function (p, k) {
      var g = svgEl('g', {});
      var px = 40 + k * 246;
      box(g, px, 226, 234, 58, p.c, C_SURFACE2);
      g.appendChild(paint(svgText(px + 117, 248, p.t, null, 11.5, 'middle'), p.c));
      g.appendChild(svgText(px + 117, 270, p.d, 'demo-x-mut', 9.5, 'middle'));
      s.appendChild(g);
      return { g: g, at: [5.8, 4.6, 6.6][k] };
    });

    /* 1 秒里：策略出 10 次指令，插值成 125 个点交给机械臂。 */
    var hz = svgEl('g', {});
    var HX0 = 250,
      HX1 = 750;
    hz.appendChild(svgText(40, 306, '真机 Push-T：1 秒内', 'demo-x-ink2', 10.5));
    hz.appendChild(paint(svgText(40, 326, '策略出 ' + CTRL_HZ + ' 次指令', null, 10.5), C_ACCENT));
    hz.appendChild(paint(svgText(40, 346, '插值成 ' + ROBOT_HZ + ' Hz 给机械臂', null, 10.5), C_MUTED));
    hz.appendChild(paint(svgEl('path', { d: polyPath([[HX0, 336], [HX1, 336]]), fill: 'none', 'stroke-width': 1 }), null, C_BORDER));
    for (var r = 0; r <= ROBOT_HZ; r++) {
      var rx = HX0 + ((HX1 - HX0) * r) / ROBOT_HZ;
      hz.appendChild(paint(svgEl('path', { d: polyPath([[rx, 332], [rx, 340]]), fill: 'none', 'stroke-width': 0.6 }), null, C_MUTED));
    }
    for (var q = 0; q <= CTRL_HZ; q++) {
      var qx = HX0 + ((HX1 - HX0) * q) / CTRL_HZ;
      hz.appendChild(paint(svgEl('path', { d: polyPath([[qx, 316], [qx, 340]]), fill: 'none', 'stroke-width': 2 }), null, C_ACCENT));
    }
    s.appendChild(hz);

    var lim = paint(svgText(400, 382, '局限：比 LSTM-GMM 算得慢；一次出一段能缓解，但不够做高频控制', null, 12.5, 'middle'), C_BAD);
    s.appendChild(lim);

    function draw(t) {
      setOpacity(train, seg(t, 0.3, 0.9));
      setOpacity(infer, seg(t, 2.2, 2.8));
      setOpacity(barA, seg(t, 0.8, 1.3));
      setOpacity(barB, seg(t, 2.4, 2.9));
      /* 同一段时间里：DDPM 走 100 格只走到一半多，DDIM 已经跳完 10 格。 */
      var u = seg(t, 2.8, 7.2);
      var ddpmK = Math.min(TRAIN_K, Math.floor(u * TRAIN_K * 1.0));
      var ddimK = Math.min(INFER_K, Math.floor(seg(t, 2.8, 4.4) * INFER_K + 1e-9));
      dotA.setAttribute('cx', (BX0 + ((BX1 - BX0) * ddpmK) / TRAIN_K).toFixed(1));
      dotA.setAttribute('cy', 168);
      dotB.setAttribute('cx', (BX0 + ((BX1 - BX0) * ddimK) / INFER_K).toFixed(1));
      dotB.setAttribute('cy', 202);
      setOpacity(dotA, seg(t, 1.0, 1.3));
      setOpacity(dotB, seg(t, 2.6, 2.9));
      nums.forEach(function (p) {
        setOpacity(p.g, seg(t, p.at, p.at + 0.45));
      });
      setOpacity(hz, seg(t, 7.4, 8.0));
      setOpacity(lim, seg(t, 9.6, 10.2));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 6 幕：Receding horizon ──────────────────────────────────────
  function buildSceneRhc() {
    var s = sceneSvg(
      '每次预测 ' +
        H +
        ' 步：源码从上一帧观测的时刻切起，跳过已经过去的 ' +
        SKIP +
        ' 步，执行 ' +
        TA +
        ' 步，丢掉 ' +
        DISCARD +
        ' 步，再带着新观测规划；执行的是位置目标'
    );
    s.appendChild(svgText(56, 24, '滚动时域（receding horizon）：预测 ' + H + ' 步，只执行 ' + TA + ' 步，再带着新观测规划', 'demo-x-ink2', 13));

    var obsG = svgEl('g', {});
    var cells = [];
    for (var i = 0; i < H; i++) {
      var x = 48 + i * 46;
      var g = svgEl('g', {});
      var r = paint(svgEl('rect', { x: x, y: 64, width: 40, height: 44, rx: 6, 'stroke-width': 1.3 }), C_SURFACE2, C_BORDER);
      g.appendChild(r);
      var off = i - SKIP;
      var lab = off === 0 ? 't' : off < 0 ? 't−' + -off : 't+' + off;
      var num = svgText(x + 20, 84, lab, 'demo-x-mono', 9.5, 'middle');
      g.appendChild(num);
      var kind = i < SKIP ? 'past' : i < SKIP + TA ? 'exec' : 'drop';
      var tag = svgText(x + 20, 100, kind === 'past' ? '过去' : kind === 'exec' ? '执行' : '丢掉', 'demo-x-mut', 8, 'middle');
      g.appendChild(tag);
      s.appendChild(g);
      cells.push({ g: g, r: r, num: num, tag: tag, kind: kind });
      if (i < N_OBS) {
        obsG.appendChild(svgMath(x + 20, 50, i === N_OBS - 1 ? 'o_t' : 'o_{t-' + (N_OBS - 1 - i) + '}', { size: 11, anchor: 'middle', w: 60 }).setTone(C_WARN));
      }
    }
    obsG.appendChild(svgRich(48 + N_OBS * 46 + 4, 50, '← 观测窗口 $T_o = ' + N_OBS + '$，预测窗口从这里排起', { size: 9.5, cls: 'demo-x-mut', w: 400 }));
    s.appendChild(obsG);

    var rhcMath = svgRich(400, 132, '$' + H + ' = ' + SKIP + ' + ' + TA + ' + ' + DISCARD + '$：过去 ' + SKIP + ' 步 + 执行 ' + TA + ' 步 + 丢掉 ' + DISCARD + ' 步', {
      size: 13,
      w: 560,
      anchor: 'middle'
    }).setTone(C_ACCENT);
    s.appendChild(rhcMath);
    var codeNote = svgText(400, 152, '源码 predict_action：start = To − 1，end = start + n_action_steps', 'demo-x-mono', 9.5, 'middle');
    s.appendChild(codeNote);

    var trade = [
      { t: '$T_a = 1$：每步再规划', d: '相邻两次可能选到不同的峰', d2: '还容易被演示里的停顿带偏', c: C_WARN, at: 4.8 },
      { t: '论文 $T_a = ' + TA + '$', d: '图 5：多数任务的最佳点', d2: '真机 Push-T 用 ' + REAL_TA + ' 步（表 7）', c: C_GOOD, at: 8.2 },
      { t: '$T_a$ 太大：接近开环', d: '世界变了，要等很久才看得见', d2: '反应慢，成功率下降', c: C_BAD, at: 7.0 }
    ].map(function (p, k) {
      var g = svgEl('g', {});
      var px = 40 + k * 246;
      box(g, px, 166, 234, 76, p.c);
      g.appendChild(svgRich(px + 117, 188, p.t, { size: 11.5, anchor: 'middle', w: 230 }).setTone(p.c));
      g.appendChild(svgText(px + 117, 210, p.d, 'demo-x-mut', 9.5, 'middle'));
      g.appendChild(svgText(px + 117, 228, p.d2, 'demo-x-mut', 9.5, 'middle'));
      s.appendChild(g);
      return { g: g, at: p.at };
    });

    var pos = svgEl('g', {});
    box(pos, 40, 256, 350, 70, C_ACCENT, C_SURFACE2);
    pos.appendChild(paint(svgText(56, 278, '执行的是位置目标，不是速度（图 4）', null, 11.5), C_ACCENT));
    pos.appendChild(svgText(56, 298, '换成位置控制：Diffusion Policy 成功率上升', 'demo-x-mut', 10));
    pos.appendChild(svgText(56, 316, 'LSTM-GMM、BET 反而下降', 'demo-x-mut', 10));
    s.appendChild(pos);

    var lat = svgEl('g', {});
    box(lat, 410, 256, 350, 70, C_GOOD, C_SURFACE2);
    lat.appendChild(paint(svgText(426, 278, '模拟延迟 ≤ ' + LAT_OK + ' 步，性能基本不掉（图 5 右）', null, 11.5), C_GOOD));
    lat.appendChild(svgText(426, 298, '位置控制的误差不会一步步累积', 'demo-x-mut', 10));
    lat.appendChild(svgText(426, 316, '速度控制受延迟影响更大', 'demo-x-mut', 10));
    s.appendChild(lat);

    var loop = [
      [80, 350],
      [280, 350],
      [520, 350],
      [720, 350]
    ];
    var labels = ['观测 ' + N_OBS + ' 帧', '去噪出 ' + H + ' 步', '执行其中 ' + TA + ' 步', '新观测，再规划'];
    var loopG = svgEl('g', {});
    loopG.appendChild(paint(svgEl('path', { d: polyPath(loop), fill: 'none', 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }), null, C_BORDER));
    loop.forEach(function (p, k) {
      loopG.appendChild(paint(svgEl('circle', { cx: p[0], cy: p[1], r: 5, 'stroke-width': 1.2 }), C_SURFACE2, C_ACCENT));
      loopG.appendChild(svgText(p[0], p[1] + 22, labels[k], 'demo-x-mut', 9.5, 'middle'));
    });
    s.appendChild(loopG);
    var tok = paint(svgEl('circle', { r: 7, 'stroke-width': 1.6 }), C_ACCENT, C_SURFACE2);
    s.appendChild(tok);

    var foot = paint(svgText(400, 400, '滚动时域：每次只兑现计划的前一段，这才是闭环', null, 13.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    var COLORS = { past: C_MUTED, exec: C_ACCENT, drop: C_MUTED };
    function draw(t) {
      var lit = seg(t, 2.4, 3.0) > 0;
      cells.forEach(function (c, i) {
        setOpacity(c.g, seg(t, 0.2 + i * 0.08, 0.5 + i * 0.08));
        c.r.style.stroke = lit ? COLORS[c.kind] : C_BORDER;
        c.r.style.strokeDasharray = lit && c.kind === 'drop' ? '4 3' : '';
        c.num.style.fill = lit && c.kind === 'exec' ? C_ACCENT : lit ? C_MUTED : '';
        setOpacity(c.tag, lit ? 1 : 0);
        if (lit && c.kind === 'past') setOpacity(c.g, 0.55);
      });
      setOpacity(obsG, seg(t, 2.4, 3.0));
      setOpacity(rhcMath, seg(t, 2.6, 3.2));
      setOpacity(codeNote, seg(t, 3.2, 3.7));
      trade.forEach(function (p) {
        setOpacity(p.g, seg(t, p.at, p.at + 0.45));
      });
      setOpacity(pos, seg(t, 9.4, 10.0));
      setOpacity(lat, seg(t, 11.2, 11.7));
      /* 开场先把闭环走一遍，讲到延迟时再走一遍 */
      setOpacity(loopG, seg(t, 0.8, 1.3));
      setOpacity(tok, seg(t, 0.8, 1.3));
      var pt = pointOn(loop, t < 11.4 ? ease(seg(t, 1.0, 2.3)) : ease(seg(t, 11.6, 12.9)));
      tok.setAttribute('cx', pt[0].toFixed(1));
      tok.setAttribute('cy', pt[1].toFixed(1));
      setOpacity(foot, seg(t, 12.2, 12.7));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 7 幕：定量证据与局限 ─────────────────────────────────────────
  function buildSceneEvidence() {
    var s = sceneSvg(
      N_BENCH +
        ' 个基准、' +
        N_TASKS +
        ' 个任务；仿真基准平均提升 ' +
        fmt(LIFT_PCT, 1) +
        '%，真机推 T 成功率 ' +
        REAL_PUSHT[0].v +
        '%；局限是继承行为克隆、推理比 LSTM-GMM 慢'
    );
    s.appendChild(svgText(56, 24, '证据看数字，局限也写在论文里', 'demo-x-ink2', 13.5));

    var nums = svgEl('g', {});
    box(nums, 40, 38, 350, 72, C_GOOD, C_SURFACE2);
    nums.appendChild(paint(svgText(215, 70, '+' + fmt(LIFT_PCT, 1) + '%', null, 26, 'middle'), C_GOOD));
    nums.appendChild(svgText(215, 96, '仿真基准平均提升（表 1、2、4）', 'demo-x-mut', 10.5, 'middle'));
    box(nums, 410, 38, 350, 72, C_ACCENT, C_SURFACE2);
    nums.appendChild(paint(svgText(585, 64, N_TASKS + ' 个任务', null, 22, 'middle'), C_ACCENT));
    nums.appendChild(svgText(585, 86, N_BENCH + ' 个基准 + 真机（2024 扩展版）', 'demo-x-mut', 10, 'middle'));
    nums.appendChild(svgText(585, 102, 'robomimic（机械臂操作集）· Push-T · Block Push · Kitchen', 'demo-x-mut', 9, 'middle'));
    s.appendChild(nums);

    var longG = svgEl('g', {});
    longG.appendChild(svgText(40, 126, '两个「子目标先做哪个都行」的仿真任务，差距更大：', 'demo-x-ink2', 11));
    longG.appendChild(svgRich(40, 144, 'Block Push $p_2$：**+' + GAIN_BLOCK + '%**', { size: 11.5, w: 340 }).setTone(C_GOOD));
    longG.appendChild(svgText(40, 160, '两块积木推进两个区，两块都推进去的比例', 'demo-x-mut', 9.5));
    longG.appendChild(svgRich(410, 144, 'Kitchen $p_4$：**+' + GAIN_KITCHEN + '%**', { size: 11.5, w: 340 }).setTone(C_GOOD));
    longG.appendChild(svgText(410, 160, '仿真厨房里 7 件事随意做，做满 4 件及以上的比例', 'demo-x-mut', 9.5));
    s.appendChild(longG);

    var real = svgEl('g', {});
    box(real, 40, 170, 720, 92, C_BORDER);
    real.appendChild(svgText(56, 186, '真机 Push-T（推 T 形积木）成功率（表 6，各 20 次）', 'demo-x-ink2', 11));
    var BAR0 = 200,
      BARW = 420;
    var barRects = REAL_PUSHT.map(function (p, k) {
      var y = 192 + k * 22;
      real.appendChild(paint(svgText(56, y + 13, p.name, null, 10.5), p.c));
      real.appendChild(paint(svgEl('rect', { x: BAR0, y: y + 2, width: BARW, height: 14, rx: 3 }), C_SURFACE2));
      var r = paint(svgEl('rect', { x: BAR0, y: y + 2, width: 0, height: 14, rx: 3 }), p.c);
      real.appendChild(r);
      real.appendChild(paint(svgText(BAR0 + BARW + 10, y + 13, p.v + '%', 'demo-x-mono', 10.5), p.c));
      return { r: r, v: p.v };
    });
    real.appendChild(svgText(700, 206, '翻杯子', 'demo-x-mut', 10, 'middle'));
    real.appendChild(paint(svgText(700, 230, MUG_OK + ' / ' + MUG_N, null, 16, 'middle'), C_GOOD));
    real.appendChild(svgText(700, 250, fmt((100 * MUG_OK) / MUG_N, 0) + '%', 'demo-x-mut', 10, 'middle'));
    s.appendChild(real);

    var lim = svgEl('g', {});
    box(lim, 40, 270, 720, 44, C_BAD, C_SURFACE, true);
    lim.appendChild(paint(svgText(56, 288, '局限（论文自述）', null, 11.5), C_BAD));
    lim.appendChild(svgText(180, 288, '继承行为克隆：演示不够就学不好', 'demo-x-mut', 10.5));
    lim.appendChild(svgText(180, 306, '算力与延迟高于 LSTM-GMM：动作序列能缓解，但不够做高频控制', 'demo-x-mut', 10.5));
    s.appendChild(lim);

    var files = [
      { f: 'conditional_unet1d.py', d: 'FiLM：cond_predict_scale 按通道出 scale / bias' },
      { f: 'diffusion_unet_hybrid_image_policy.py', d: 'predict_action：切出执行的 ' + TA + ' 步' },
      { f: 'eval_real_robot.py', d: '加载 EMA 权重；DDIM ' + REAL_K + ' 步' }
    ];
    var fileG = svgEl('g', {});
    fileG.appendChild(svgText(40, 332, '官方源码 real-stanford/diffusion_policy（原 columbia-ai-robotics）', 'demo-x-ink2', 10.5));
    files.forEach(function (f, k) {
      var y = 340 + k * 24;
      fileG.appendChild(paint(svgEl('rect', { x: 40, y: y, width: 720, height: 20, rx: 5, 'stroke-width': 1.1 }), C_SURFACE2, C_BORDER));
      fileG.appendChild(paint(svgText(52, y + 14, f.f, 'demo-x-mono', 10), C_ACCENT));
      fileG.appendChild(svgText(748, y + 14, f.d, 'demo-x-mut', 9.5, 'end'));
    });
    s.appendChild(fileG);

    function draw(t) {
      setOpacity(nums, seg(t, 0.3, 1.0));
      setOpacity(longG, seg(t, 2.4, 3.0));
      setOpacity(real, seg(t, 4.8, 5.3));
      var u = ease(seg(t, 5.1, 6.4));
      barRects.forEach(function (b) {
        b.r.setAttribute('width', ((BARW * b.v) / 100) * u);
      });
      setOpacity(lim, seg(t, 7.0, 7.6));
      setOpacity(fileG, seg(t, 9.4, 10.0));
    }

    return { el: s, draw: draw };
  }

  /* 要点里的英文缩写第一次出现都带一句中文解释：系列前几篇（PPO … PULSE）讲的都是仿真里靠奖励学动作，
     行为克隆、扩散模型、视觉网络这一套名词，观众多半是第一次见。 */
  var DP_SCENES = [
    {
      title: '平均动作会撞上障碍',
      dur: 12,
      build: buildSceneProblem,
      cues: [
        { at: 0.3, s: '**行为克隆**（behavior cloning）：把演示里「看到的观测 → 做出的动作」配成对来学。同一观测下演示一半上绕、一半下绕 —— 动作分布是**双峰**的。' },
        { at: 2.2, s: '用**平方损失**（MSE，均方误差：预测与演示之差的平方再平均）回归，最优解是条件均值 $\\mathbb{E}[a \\mid o]$：两峰一平均，正中障碍。' },
        { at: 4.6, s: '不是网络没训好：只要损失是平方损失，最优解就是均值，换更大的网络也一样。' },
        { at: 7.0, s: '扩散学的是整个分布：这次走上面，下次可能走下面，就是不走中间。' },
        { at: 9.4, s: '论文**图 3** 的 **Push-T**：用圆头把 T 形积木推进目标框，左绕右绕都对。' },
        { at: 10.6, s: 'Diffusion Policy 两边都学到、每次只走一边；**LSTM-GMM**（循环网络输出几个高斯）和 **IBC**（能量模型打分）偏一边，**BET**（动作聚类 + 偏移）来回切。' }
      ]
    },
    {
      title: '动作是条件扩散过程',
      dur: 12,
      build: buildSceneDiffusion,
      cues: [
        { at: 0.3, s: '**扩散模型**：先学会把加了噪声的东西还原，用时从纯噪声一步步还原出样本。这里学的是给定观测的动作分布 $p(A_t \\mid O_t)$。' },
        { at: 2.2, s: '训练（式 5）：随机选噪声步 $k$、加噪，让网络 $\\varepsilon_\\theta$ 预测加进去的噪声，损失仍是平方损失。' },
        { at: 4.4, s: '推理（式 4）：从纯高斯噪声 $A^K_t$ 出发，减去预测的噪声再加一点扰动，走 $K$ 步。' },
        { at: 7.0, s: '**能量模型**（IBC）要把分数除以对所有动作求和的 $Z(o,\\theta)$，只能靠负样本估，训练不稳（图 6）。' },
        { at: 8.0, s: '扩散学的是**分数**（score）$\\nabla_a \\log p$：对数概率对动作的梯度，$Z$ 求导就消掉（式 8）。' },
        { at: 9.4, s: '多峰从哪来：不同的初始噪声 + 每步的随机扰动，样本停在不同的峰上。' }
      ]
    },
    {
      title: '动作分块：一次预测 $T_p$ 步',
      dur: 12,
      build: buildSceneChunk,
      cues: [
        { at: 0.3, s: '**动作分块**（action chunking）：一次预测一整段 $A_t = [a_t,\\ldots,a_{t+' + (H - 1) + '}]$，段长 **$T_p = ' + H + '$**（$p$ = prediction）。' },
        { at: 2.2, s: '逐步各采各的（LSTM-GMM、BET）：相邻两步可能来自不同的峰，来回抖。' },
        { at: 4.8, s: '整段一起去噪：峰一旦选定，' + H + ' 步都走同一侧。' },
        { at: 7.4, s: '不怕停顿：比如真机上用勺子从碗里舀番茄酱，得停住等酱装满；单步策略容易学成原地不动，LSTM-GMM / IBC 在真机上常停住。' },
        { at: 9.6, s: '一整段动作维度很高：LSTM-GMM 要先定几个峰、IBC 采不动，扩散撑得住。' }
      ]
    },
    {
      title: '视觉条件 + FiLM',
      dur: 14,
      build: buildSceneCondition,
      cues: [
        { at: 0.3, s: '观测只做条件、不被生成：学 $p(A_t \\mid O_t)$，不像前作 Diffuser 那样把观测和动作一起生成。' },
        { at: 2.0, s: '图像特征每次推理只算一遍，$K$ 步去噪都复用，图像编码器还能和策略一起训。' },
        { at: 4.6, s: '**ResNet-18**（常用的图像卷积网络）从头训，两处小改：保留位置；GroupNorm 配合 **EMA**（额外存一份平滑过的权重）。' },
        { at: 5.8, s: '看最近 **$T_o = ' + N_OBS + '$** 帧（$o$ = observation）：一帧不够，太多反而下降（图 14）。' },
        { at: 7.0, s: '卷积版是沿时间卷积的 **UNet**；观测经 **FiLM** 送入：每层按通道乘缩放、加偏置。开箱即用，但快变的动作会被平滑掉。' },
        { at: 9.6, s: '**Transformer**（用注意力处理序列的网络，后面专门讲）版：复杂任务上往往最好，但更难调；论文建议先试卷积版。' },
        { at: 12.2, s: '编码器对比（表 5）：冻住预训练网络效果不好；微调图文预训练的 **CLIP** 视觉网络最好，套螺母的 Square 任务上 ' + CLIP_FT + '%。' }
      ]
    },
    {
      title: 'DDIM 跳步：' + TRAIN_K + ' 步训练，' + INFER_K + ' 步推理',
      dur: 12,
      build: buildSceneDdim,
      cues: [
        { at: 0.3, s: '训练用 ' + TRAIN_K + ' 步扩散，这种逐步去噪的标准做法叫 **DDPM**；噪声表是平方余弦。' },
        { at: 2.2, s: '**DDIM**：一种能跳步的采样法，训练和推理的步数分开，网络不用重新训练。' },
        { at: 4.6, s: '3.4 节：推理 ' + INFER_K + ' 步，RTX 3080 显卡上 ' + LATENCY_S + ' 秒，$' + TRAIN_K + ' / ' + INFER_K + ' = ' + fmt(SPEEDUP, 0) + '\\times$。' },
        { at: 5.8, s: '仿真基准没用 DDIM，推理仍是 ' + TRAIN_K + ' 步；附录表 7 的真机配置是 ' + REAL_K + ' 步。' },
        { at: 7.4, s: '真机：策略每秒出 ' + CTRL_HZ + ' 次指令，插值到每秒 ' + ROBOT_HZ + ' 个点交给 UR5 机械臂。' },
        { at: 9.6, s: '局限：比 LSTM-GMM 算得慢，一次出一段能缓解，但不够做高频控制。' }
      ]
    },
    {
      title: '滚动时域：预测 $T_p$，执行 $T_a$',
      dur: 13,
      build: buildSceneRhc,
      cues: [
        { at: 0.3, s: '**滚动时域**（receding horizon）：预测 $T_p = ' + H + '$ 步，只执行 $T_a = ' + TA + '$ 步（$a$ = action），带着新观测再规划，像开车边看路边改路线。' },
        { at: 2.4, s: '源码从上一帧观测的时刻切起：$' + H + ' = ' + SKIP + ' + ' + TA + ' + ' + DISCARD + '$，过去 1 步、执行 ' + TA + ' 步、丢掉 ' + DISCARD + ' 步。' },
        { at: 4.8, s: '$T_a = 1$：相邻两次可能选到不同的峰，还容易被演示里的停顿带偏。' },
        { at: 7.0, s: '$T_a$ 太大：一口气执行太多步，世界变了也要等很久才看见。' },
        { at: 8.2, s: '**图 5** 的消融：多数任务最佳是 ' + TA + ' 步；真机 Push-T 用 ' + REAL_TA + ' 步。' },
        { at: 9.4, s: '动作输出**目标位置**、不是速度（图 4）：Diffusion Policy 上升，LSTM-GMM / BET 下降。' },
        { at: 11.2, s: '位置控制的偏移不会一步步叠加：模拟延迟 ≤ ' + LAT_OK + ' 步性能基本不掉。观测 → 去噪 → 执行 → 再观测。' }
      ]
    },
    {
      title: '定量证据与局限',
      dur: 13,
      build: buildSceneEvidence,
      cues: [
        { at: 0.3, s: N_BENCH + ' 个基准、' + N_TASKS + ' 个任务；仿真基准上比之前最好的方法，成功率平均提升 **' + fmt(LIFT_PCT, 1) + '%**（表 1、2、4）。' },
        { at: 2.4, s: '子目标先做哪个都行的任务差距更大：Block Push（推两块积木）$p_2$ +' + GAIN_BLOCK + '%，Kitchen（仿真厨房）$p_4$ +' + GAIN_KITCHEN + '%。' },
        { at: 4.8, s: '真机 Push-T：**' + REAL_PUSHT[0].v + '%** vs LSTM-GMM ' + REAL_PUSHT[1].v + '%、IBC ' + REAL_PUSHT[2].v + '%；翻杯子 ' + MUG_OK + ' / ' + MUG_N + '。' },
        { at: 7.0, s: '局限：照样受演示数据的限制，演示不够就学不好；推理比 LSTM-GMM 慢。' },
        { at: 9.4, s: '源码：FiLM 在 `conditional_unet1d.py`，执行哪几步在 `predict_action`，评估用 EMA 那份平滑权重。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '七幕动画：Diffusion Policy 全流程速览',
      sub: '约 88 秒自动播放。空格播放/暂停，← → 换幕；画面里的换算数字都是现算的，不是手写。',
      ariaLabel: 'Diffusion Policy 七幕讲解动画',
      notes: [
        '取数依据：$T_o = ' +
          N_OBS +
          '$、$T_p = ' +
          H +
          '$、$T_a = ' +
          TA +
          '$ 是论文附录表 7 的仿真配置（真机 Push-T 的 $T_a = ' +
          REAL_TA +
          '$），与上文 DDIM / RHC 演示同一组默认；源码 `predict_action` 从 `To − 1` 切起，所以 $' +
          H +
          ' = ' +
          SKIP +
          ' + ' +
          TA +
          ' + ' +
          DISCARD +
          '$ 现减。扩散步数取 3.4 节：训练 $' +
          TRAIN_K +
          '$、DDIM 推理 $' +
          INFER_K +
          '$，加速 $' +
          TRAIN_K +
          ' / ' +
          INFER_K +
          ' = ' +
          fmt(SPEEDUP, 0) +
          '\\times$ 现除；表 7 的真机推理是 ' +
          REAL_K +
          ' 步，仿真基准不用 DDIM、推理也是 ' +
          TRAIN_K +
          ' 步。',
        '第七幕的 **' +
          fmt(LIFT_PCT, 1) +
          '%**（仿真基准，表 1、2、4）、**' +
          N_TASKS +
          ' 个任务**、真机 Push-T ' +
          REAL_PUSHT[0].v +
          '% 与翻杯子 ' +
          MUG_OK +
          ' / ' +
          MUG_N +
          ' 取自 arXiv v5（2024 期刊扩展版）；RSS 2023 版只统计了 12 个任务。第一幕的绕障与第二幕的粒子是示意，数值不能和论文仿真比。'
      ],
      scenes: DP_SCENES
    });
  }

  // ─── the narrated vertical video of the same seven scenes ─────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：Diffusion Policy 七幕全流程',
      sub: '7 分 59 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的七幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '9.9 MB',
      fileName: 'Diffusion_Policy_讲解视频.mp4'
    });
  }

  K.mount({
    'dp-explainer': buildExplainerDemo,
    'dp-video': buildVideoDemo,
    'dp-multimodal': buildMultimodalDemo,
    'dp-denoise': buildDenoiseDemo,
    'dp-rhc': buildRhcDemo
  });
})();
