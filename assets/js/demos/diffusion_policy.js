/* Interactive Diffusion Policy demos for
 * papers/01_Foundational_RL/Diffusion_Policy.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["diffusion_policy"]`, after assets/js/demos/kit.js. The note itself
 * may only contain empty placeholders, because scripts/sanitize_paper_html.py
 * strips <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
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
        '给定同一个观测，`argmin E[(a − f(o))²]` 的解永远是 E[a|o]。演示越是「多解」，这个均值越危险。',
      '**把上绕的比例拖到 100%**：分布变成单峰，MSE 立刻就不撞了。所以问题从来不是「BC 不行」，' +
        '而是「BC 在多模态数据上不行」—— 这也是为什么很多简单任务上 MLP + MSE 依然够用。',
      '**这里的扩散是真在跑**：左边每条轨迹都由一次 10 步 DDIM 采出来（数据分布是双高斯，' +
        'x̂₀ = E[x₀|x_k] 有闭式解）。换一批噪声，落到哪一侧就会变 —— 采的是分布，不是均值。',
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
      { key: 'accent', text: '当前的动作 chunk x_k' },
      { key: 'good', text: '模型此刻预测的干净动作 x̂₀' },
      { key: 'muted', text: '两条演示模式' }
    ]);

    var grid = stageGrid(root);
    var chunkStage = stage(grid, 245);
    var schedStage = stage(grid, 245);

    var stats = statsRow(root);
    var sNoise = stats.add('当前噪声水平 √(1−ᾱ)');
    var sR = stats.add('模式归属（上 / 下）');
    var sErr = stats.add('离最终结果还差');
    var sSmooth = stats.add('曲线的粗糙度');
    var verdict = verdictBox(root);

    note(root, [
      '**整条 chunk 一起去噪，才不会串味**：责任权重是拿**整条 16 步序列**算出来的。' +
        '如果逐帧独立采样，前 8 帧可能选了「上绕」、后 8 帧选了「下绕」，拼出来是一条穿过障碍的轨迹。' +
        'action chunking 不只是为了预测得远，也是为了让多模态的选择保持一致。',
      '**看右边那条噪声表**：前几步 √(1−ᾱ) 还很大，x̂₀ 的预测非常模糊（左图绿线在两条演示中间摇摆）；' +
        '一旦噪声降到某个位置，归属就锁死了，剩下的步骤只是在把细节磨出来。',
      '**K 从 100 压到 10 靠的是 DDIM**：把总步数滑块拖到 2，会看到轨迹还没收干净；' +
        '拖到 40 也不会更好多少。10~20 步是实现里常用的落点，因为机器人控制回路等不起。',
      '**这是简化模型**：真实的 x̂₀ 由一个 1D 卷积 UNet 预测，条件是视觉特征；这里数据分布取成两条演示 + 高斯抖动，' +
        '所以 x̂₀ 有闭式解，浏览器里才跑得动。反向过程本身是真的 DDIM。'
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
            '注意此刻模型预测的 x̂₀（绿线）几乎是两条演示的平均 —— 它还看不出该走哪边。',
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
        '每次推理吐一整条 chunk，但只执行前 T_a 步就丢掉重来。' +
        'T_a 太大，对突发扰动反应慢；T_a 太小，推理频率上去了、块与块的接缝也多了。'
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
      label: '实际执行 T_a',
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
    button(btns, '每步都重规划（T_a = 1）', function () {
      state.exec = 1;
      render();
    });
    button(btns, '开环跑完整条（T_a = H）', function () {
      state.exec = state.horizon;
      render();
    });

    var setLegend = legend(root, [
      { key: 'muted', text: '预测出来但被丢掉的部分' },
      { key: 'accent', text: '真正执行的那 T_a 步' },
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
      '**两头都不能取极端**：T_a = H 是纯开环，扰动来了要等一整条 chunk 跑完才可能修正；' +
        'T_a = 1 每步都重规划，反应最快，但推理要跑满每个控制周期，而且相邻两次采样可能落到不同模态上 —— ' +
        '接缝处的动作会不连续。',
      '**这也是 action chunking 的隐藏收益**：一次预测 16 步，等于给策略一个「短期计划」，' +
        '比逐步预测更不容易在同一个位置反复抖。代价就是这里画的反应延迟。',
      '**延迟不是白等**：反应延迟的上界是 T_a 步 —— 扰动最坏发生在一个 chunk 刚开始执行的时候。' +
        '拖动扰动时刻能看到这个延迟在 0 到 T_a 之间来回跳。',
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
          '🚫 T_a = H：纯开环。扰动在第 ' +
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
          '⚡ T_a = 1：每一步都重新推理，反应延迟 ' +
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
            ' / T_a = ' +
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

  K.mount({
    'dp-multimodal': buildMultimodalDemo,
    'dp-denoise': buildDenoiseDemo,
    'dp-rhc': buildRhcDemo
  });
})();
