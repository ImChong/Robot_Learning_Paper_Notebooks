/* Interactive demos for papers/01_Foundational_RL/
 * Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World
 * （Tobin et al. 2017，视觉域随机化）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["domain_randomization"]`, after assets/js/demos/kit.js. The note
 * itself may only contain empty placeholders, because
 * scripts/sanitize_paper_html.py strips <script>/<canvas>/<input> from
 * #paper-body before publish.
 *
 * Demos:
 *   dr-scene    — 随机化到底长什么样：同一个物体在一堆乱七八糟的场景里
 *   dr-coverage — 真实世界只是参数空间里的一个点，它落在训练分布里了吗
 *   dr-ablation — 五类随机化里，哪一类是真的在救迁移
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
    mulberry32 = K.mulberry32;

  // ─── demo 1: 随机化长什么样 ──────────────────────────────────────────────
  /* 一格 = 一张训练图。物体（红块）在桌面上的位置是要预测的量，
     其他一切（桌面色、地板色、灯光方向、干扰物、噪点）都是干扰。 */
  function drawScene(ctx, x, y, w, h, opts, rng, P) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    function rnd(a, b) {
      return a + (b - a) * rng();
    }
    var hue = opts.texture ? rnd(0, 360) : 210;
    var sat = opts.texture ? rnd(10, 70) : 18;
    var lit = opts.texture ? rnd(20, 55) : 32;
    ctx.fillStyle = 'hsl(' + fmt(hue, 0) + ',' + fmt(sat, 0) + '%,' + fmt(lit, 0) + '%)';
    ctx.fillRect(x, y, w, h);

    // 桌面
    var tableY = y + h * (opts.camera ? rnd(0.45, 0.68) : 0.58);
    ctx.fillStyle = 'hsl(' + fmt(opts.texture ? rnd(0, 360) : 35, 0) + ',' + fmt(opts.texture ? rnd(10, 60) : 30, 0) + '%,' + fmt(opts.texture ? rnd(25, 65) : 45, 0) + '%)';
    ctx.fillRect(x, tableY, w, y + h - tableY);

    // 光照：一层斜向渐变
    if (opts.light) {
      var gx = rnd(0, 1);
      var grad = ctx.createLinearGradient(x + w * gx, y, x + w * (1 - gx), y + h);
      grad.addColorStop(0, 'rgba(255,255,255,' + fmt(rnd(0.02, 0.32), 2) + ')');
      grad.addColorStop(1, 'rgba(0,0,0,' + fmt(rnd(0.05, 0.4), 2) + ')');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
    }

    // 干扰物
    if (opts.distract) {
      var n = Math.floor(rnd(1, 5));
      for (var i = 0; i < n; i++) {
        ctx.fillStyle = 'hsl(' + fmt(rnd(0, 360), 0) + ',60%,' + fmt(rnd(30, 70), 0) + '%)';
        var dw = rnd(w * 0.06, w * 0.18);
        ctx.fillRect(x + rnd(0, w - dw), tableY - dw * rnd(0.4, 1.2), dw, dw);
      }
    }

    // 目标物体：位置就是要回归的量
    var ox = x + w * opts.objX,
      oy = tableY - h * 0.1;
    ctx.fillStyle = '#d94f3d';
    ctx.fillRect(ox - w * 0.055, oy - h * 0.1, w * 0.11, h * 0.12);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox - w * 0.055, oy - h * 0.1, w * 0.11, h * 0.12);

    // 高斯噪点
    if (opts.noise) {
      for (var k = 0; k < w * h * 0.06; k++) {
        ctx.fillStyle = 'rgba(255,255,255,' + fmt(rnd(0.02, 0.16), 2) + ')';
        ctx.fillRect(x + rnd(0, w), y + rnd(0, h), 1.4, 1.4);
      }
    }
    ctx.restore();
    ctx.strokeStyle = P.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function buildSceneDemo(host) {
    var root = card(host, {
      title: '同一个物体，一堆完全不一样的场景',
      sub:
        '网络要回归的只有红块的位置，其余全是干扰。关掉随机化，九张图长得几乎一模一样 —— ' +
        '网络就会拿「桌面是棕色的」当线索；打开它，这种线索全部失效。'
    });

    var state = { texture: true, light: true, distract: true, noise: true, camera: true, nTex: 24, seed: 3 };

    var ctrls = controlsRow(root);
    var togBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(togBox);
    checkbox(togBox, '纹理', state.texture, function (on) {
      state.texture = on;
      render();
    });
    checkbox(togBox, '光照', state.light, function (on) {
      state.light = on;
      render();
    });
    checkbox(togBox, '干扰物', state.distract, function (on) {
      state.distract = on;
      render();
    });
    checkbox(togBox, '相机位姿', state.camera, function (on) {
      state.camera = on;
      render();
    });
    checkbox(togBox, '噪点', state.noise, function (on) {
      state.noise = on;
      render();
    });
    slider(ctrls, {
      label: '训练时见过多少种纹理',
      min: 1,
      max: 200,
      step: 1,
      value: state.nTex,
      format: function (v) {
        return fmt(v, 0) + ' 种';
      },
      onInput: function (v) {
        state.nTex = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '换一批场景', function () {
      state.seed = (state.seed * 1103515245 + 12345) % 99991;
      render();
    });
    button(btns, '全部关掉（单一仿真纹理）', function () {
      state.texture = state.light = state.distract = state.noise = state.camera = false;
      state.nTex = 1;
      render();
    });

    var setLegend = legend(root, [
      { key: 'bad', text: '单一纹理训练：迁移失败' },
      { key: 'good', text: '域随机化训练' },
      { key: 'muted', text: '真机定位误差（越低越好）' }
    ]);

    var grid = stageGrid(root);
    var sceneStage = stage(grid, 250);
    var curveStage = stage(grid, 250);

    var stats = statsRow(root);
    var sVar = stats.add('外观变化程度');
    var sCue = stats.add('网络还能靠颜色作弊吗');
    var sErr = stats.add('真机定位误差');
    var sGrasp = stats.add('抓取成功率');
    var verdict = verdictBox(root);

    note(root, [
      '**这套图看着像 bug，其实是重点**：论文的主张是「不需要照片级真实，只需要足够多样」。' +
        '只要真实世界的外观对网络来说只是**又一个变体**，它就不会被当成 OOD。',
      '**多样性靠的是数量**：拖动「见过多少种纹理」滑块 —— 误差在几十种上就基本饱和了。' +
        '这也是 DR 便宜的地方：多渲染一批随机纹理比建一个真实感场景便宜太多。',
      '**代价是网络必须学不变性**：干扰越多，同样的容量要花更多在「忽略什么」上。' +
        '论文里 DR-only 的抓取成功率是 78%，用真实数据微调后是 87% —— 这 9 个点大致就是这份代价。',
      '**这是简化模型**：真实实验用的是 MuJoCo 渲染 + CNN 回归 3D 位置，这里只是用 Canvas 画的示意图，' +
        '误差曲线是编的。它解释「为什么要随机化」，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var anyRandom = state.texture || state.light || state.distract || state.noise || state.camera;
      var variety = (state.texture ? 0.35 : 0) + (state.light ? 0.2 : 0) + (state.distract ? 0.2 : 0) + (state.camera ? 0.15 : 0) + (state.noise ? 0.1 : 0);
      // 误差：随纹理数下降并饱和，随随机化种类减少而抬高
      var err = 0.012 + 0.09 * Math.exp(-state.nTex / 28) + 0.11 * (1 - variety);
      // 全开且纹理足够多时对齐论文的 DR-only 78%
      var grasp = clamp(0.78 - 2.6 * (err - 0.012), 0, 0.78);

      sVar.set(fmt(variety * 100, 0) + '%', variety > 0.7 ? 'good' : variety < 0.3 ? 'bad' : 'warn');
      sCue.set(anyRandom && state.texture ? '不能了' : '能，而且它一定会', anyRandom && state.texture ? 'good' : 'bad');
      sErr.set(fmt(err * 100, 1) + ' cm', err < 0.04 ? 'good' : err > 0.09 ? 'bad' : 'warn');
      sGrasp.set(fmt(grasp * 100, 0) + '%', grasp > 0.7 ? 'good' : 'bad');

      if (!anyRandom) {
        verdict.set(
          '🎨 全部关掉：九张图长得一模一样。网络完全可以靠「红块在棕色桌面的哪个位置」这种低级线索拿到满分，' +
            '一换到真实的桌面就全错 —— 这就是论文里那行「仅用单一仿真纹理训练 → 迁移失败」。',
          'frozen'
        );
      } else if (state.nTex < 8) {
        verdict.set(
          '📉 随机化开了，但只见过 ' +
            state.nTex +
            ' 种纹理：多样性还不够，网络会把这几种纹理也背下来。定位误差 ' +
            fmt(err * 100, 1) +
            ' cm。把滑块拖到几十种试试。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ ' +
            state.nTex +
            ' 种纹理 + ' +
            fmt(variety * 100, 0) +
            '% 的外观变化：定位误差 ' +
            fmt(err * 100, 1) +
            ' cm，抓取成功率 ' +
            fmt(grasp * 100, 0) +
            '%。**零真实训练样本**。这就是 2017 年这篇论文让人意外的地方。',
          'learning'
        );
      }

      // ── 左：九宫格场景 ──
      var g = begin(sceneStage);
      var P = g.P;
      setLegend(P);
      text(g.ctx, '训练集里随便抽的九张图', 10, 14, P.muted, 'left', '11px sans-serif');
      var rng = mulberry32(state.seed);
      var cols = 3,
        rows = 3;
      var pad = 10,
        top = 24;
      var cw = (g.w - pad * 2) / cols,
        chh = (g.h - top - 10) / rows;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var idx = r * cols + c;
          drawScene(
            g.ctx,
            pad + c * cw,
            top + r * chh,
            cw - 4,
            chh - 4,
            {
              texture: state.texture && state.nTex > 1,
              light: state.light,
              distract: state.distract,
              noise: state.noise,
              camera: state.camera,
              objX: 0.2 + 0.6 * ((idx * 0.37) % 1)
            },
            rng,
            P
          );
        }
      }

      // ── 右：误差随纹理数 ──
      var g2 = begin(curveStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 46, r: 14, t: 22, b: 34 }, [1, 200], [0, 0.16]);
      axes(g2, p2, {
        xTicks: [1, 50, 100, 150, 200],
        yTicks: [0, 0.04, 0.08, 0.12, 0.16],
        yFmt: function (t) {
          return fmt(t * 100, 0) + 'cm';
        },
        xLabel: '训练时见过的纹理种类'
      });
      text(g2.ctx, '真机定位误差', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var pts = [];
      for (var n = 1; n <= 200; n++) {
        pts.push([p2.sx(n), p2.sy(clamp(0.012 + 0.09 * Math.exp(-n / 28) + 0.11 * (1 - variety), 0, 0.16))]);
      }
      line(g2.ctx, pts, P2.good, 2.4);
      line(g2.ctx, [[p2.x0, p2.sy(0.123)], [p2.x1, p2.sy(0.123)]], P2.bad, 1.6, [5, 4]);
      text(g2.ctx, '单一纹理基线', p2.x1 - 4, p2.sy(0.123) - 9, P2.bad, 'right', '10px sans-serif');
      line(g2.ctx, [[p2.sx(state.nTex), p2.y0], [p2.sx(state.nTex), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(state.nTex), p2.sy(clamp(err, 0, 0.16)), 4.5, P2.good, P2.surface2);

      sceneStage.canvas.setAttribute('aria-label', '九张随机化训练图像的示意');
      curveStage.canvas.setAttribute('aria-label', '定位误差随训练纹理种类的变化');
    });

    render();
  }

  // ─── demo 2: 覆盖 ────────────────────────────────────────────────────────
  function buildCoverageDemo(host) {
    var root = card(host, {
      title: '真实世界只是参数空间里的一个点',
      sub:
        '只要真实世界的 $\\xi$ 落在训练时覆盖的范围内，网络就认得它。' +
        '拖动真实世界的位置和随机化范围，会看到一条 U 形曲线 —— 范围不是越大越好。'
    });

    var state = { w: 0.55, realX: 0.72, realY: 0.35, n: 120, seed: 8 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '随机化范围（半宽）',
      min: 0.05,
      max: 1,
      step: 0.01,
      value: state.w,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.w = v;
        render();
      }
    });
    slider(ctrls, {
      label: '真实世界的纹理参数',
      min: 0,
      max: 1,
      step: 0.01,
      value: state.realX,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.realX = v;
        render();
      }
    });
    slider(ctrls, {
      label: '真实世界的光照参数',
      min: 0,
      max: 1,
      step: 0.01,
      value: state.realY,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.realY = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '范围太窄（0.08）', function () {
      state.w = 0.08;
      render();
    });
    button(btns, '范围太宽（1.0）', function () {
      state.w = 1;
      render();
    });

    var setLegend = legend(root, [
      { key: 'accent', text: '训练时采样到的场景' },
      { key: 'good', text: '真实世界（落在范围内）' },
      { key: 'bad', text: '真实世界（落在范围外）' }
    ]);

    var grid = stageGrid(root);
    var spaceStage = stage(grid, 245);
    var curveStage = stage(grid, 245);

    var stats = statsRow(root);
    var sIn = stats.add('真实世界在范围内吗');
    var sApprox = stats.add('覆盖误差 $\\varepsilon_{\\mathrm{approx}}$');
    var sCap = stats.add('容量代价（范围越宽越贵）');
    var sTot = stats.add('总定位误差');
    var verdict = verdictBox(root);

    note(root, [
      '**「宁可偏大」是有前提的**：覆盖不到是灾难性的（误差爆炸），' +
        '范围偏大只是让网络多花点容量学不变性 —— 两种代价不对称，所以实践上确实偏向大一点。' +
        '但从曲线看，一味拉大同样会让误差抬起来。',
      '**它也解释了为什么 DR 能「零真实样本」**：真实世界不需要被专门建模，' +
        '它只要是训练分布里的一个平凡样本就行。这和「把仿真做得更真」是完全不同的思路。',
      '**范围要覆盖的是不确定性，不是全部**：论文随机化的是纹理、光照、相机、干扰物、噪声 —— ' +
        '这些都是「真机上确实说不准」的量。把已知量也一起随机化，只会白白消耗容量。',
      '**这是简化模型**：真实的 $\\xi$ 是几十维，误差曲线是编的。' +
        '它解释「覆盖 vs 容量」这个取舍的形状，数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var cx = 0.5,
        cy = 0.5;
      var outX = Math.max(0, Math.abs(state.realX - cx) - state.w);
      var outY = Math.max(0, Math.abs(state.realY - cy) - state.w);
      var out = Math.sqrt(outX * outX + outY * outY);
      var inside = out <= 1e-9;
      var eApprox = inside ? 0.012 : 0.012 + 1.6 * out * out;
      var eCap = 0.055 * state.w;
      var tot = eApprox + eCap;

      sIn.set(inside ? '在 ✔' : '不在 ✘', inside ? 'good' : 'bad');
      sApprox.set(fmt(eApprox * 100, 1) + ' cm', inside ? 'good' : 'bad');
      sCap.set(fmt(eCap * 100, 1) + ' cm', eCap < 0.035 ? 'good' : 'warn');
      sTot.set(fmt(tot * 100, 1) + ' cm', tot < 0.05 ? 'good' : tot > 0.09 ? 'bad' : 'warn');

      if (!inside) {
        verdict.set(
          '💥 真实世界落在训练范围外 ' +
            fmt(out, 2) +
            '：误差冲到 ' +
            fmt(tot * 100, 1) +
            ' cm。网络从没见过这种外观，它的输出没有任何保证 —— ' +
            '这正是「仅用单一仿真纹理」为什么会彻底失败：那是范围半宽 ≈ 0 的极端情况。',
          'frozen'
        );
      } else if (state.w > 0.85) {
        verdict.set(
          '🥱 范围拉到 ' +
            fmt(state.w, 2) +
            '：真实世界当然覆盖得到，但网络要为「什么都可能」买单，容量代价涨到 ' +
            fmt(eCap * 100, 1) +
            ' cm。总误差 ' +
            fmt(tot * 100, 1) +
            ' cm，比适中的范围还差。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ 真实世界稳稳落在范围内，总误差 ' +
            fmt(tot * 100, 1) +
            ' cm（覆盖 ' +
            fmt(eApprox * 100, 1) +
            ' + 容量 ' +
            fmt(eCap * 100, 1) +
            '）。注意这里**一张真实图片都没用过**。',
          'learning'
        );
      }

      // ── 左：参数空间 ──
      var g = begin(spaceStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 40, r: 14, t: 22, b: 34 }, [-0.2, 1.2], [-0.2, 1.2]);
      axes(g, p, {
        xTicks: [0, 0.5, 1],
        yTicks: [0, 0.5, 1],
        xFmt: function (t) {
          return fmt(t, 1);
        },
        yFmt: function (t) {
          return fmt(t, 1);
        },
        xLabel: '纹理参数'
      });
      text(g.ctx, '视觉参数空间 ξ', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      g.ctx.save();
      g.ctx.strokeStyle = P.accent;
      g.ctx.setLineDash([4, 3]);
      g.ctx.strokeRect(p.sx(cx - state.w), p.sy(cy + state.w), p.sx(cx + state.w) - p.sx(cx - state.w), p.sy(cy - state.w) - p.sy(cy + state.w));
      g.ctx.restore();
      var rng = mulberry32(state.seed);
      for (var i = 0; i < state.n; i++) {
        var sx = cx + state.w * (2 * rng() - 1),
          sy = cy + state.w * (2 * rng() - 1);
        dot(g.ctx, p.sx(clamp(sx, -0.2, 1.2)), p.sy(clamp(sy, -0.2, 1.2)), 2.4, P.accent);
      }
      dot(g.ctx, p.sx(state.realX), p.sy(state.realY), 7, inside ? P.good : P.bad, P.surface2);
      text(g.ctx, '真实世界', p.sx(state.realX), p.sy(state.realY) - 13, inside ? P.good : P.bad, 'center', '10px sans-serif');

      // ── 右：误差 vs 范围 ──
      var g2 = begin(curveStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 46, r: 14, t: 22, b: 34 }, [0.05, 1], [0, 0.22]);
      axes(g2, p2, {
        xTicks: [0.05, 0.35, 0.65, 1],
        yTicks: [0, 0.05, 0.1, 0.15, 0.2],
        xFmt: function (t) {
          return fmt(t, 2);
        },
        yFmt: function (t) {
          return fmt(t * 100, 0) + 'cm';
        },
        xLabel: '随机化范围（半宽）'
      });
      text(g2.ctx, '总误差：一条 U 形曲线', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var tPts = [],
        aPts = [],
        cPts = [];
      for (var s = 0; s <= 120; s++) {
        var w2 = 0.05 + (0.95 * s) / 120;
        var ox = Math.max(0, Math.abs(state.realX - cx) - w2),
          oy = Math.max(0, Math.abs(state.realY - cy) - w2);
        var o2 = Math.sqrt(ox * ox + oy * oy);
        var ea = o2 <= 1e-9 ? 0.012 : 0.012 + 1.6 * o2 * o2;
        var ec = 0.055 * w2;
        aPts.push([p2.sx(w2), p2.sy(clamp(ea, 0, 0.22))]);
        cPts.push([p2.sx(w2), p2.sy(clamp(ec, 0, 0.22))]);
        tPts.push([p2.sx(w2), p2.sy(clamp(ea + ec, 0, 0.22))]);
      }
      line(g2.ctx, aPts, P2.bad, 1.6, [5, 4]);
      line(g2.ctx, cPts, P2.warn, 1.6, [5, 4]);
      line(g2.ctx, tPts, P2.accent, 2.6);
      line(g2.ctx, [[p2.sx(state.w), p2.y0], [p2.sx(state.w), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(state.w), p2.sy(clamp(tot, 0, 0.22)), 4.5, P2.accent, P2.surface2);
      text(g2.ctx, '覆盖误差', p2.x0 + 8, p2.sy(0.2), P2.bad, 'left', '10px sans-serif');
      text(g2.ctx, '容量代价', p2.x0 + 8, p2.sy(0.185), P2.warn, 'left', '10px sans-serif');

      spaceStage.canvas.setAttribute('aria-label', '视觉参数空间中训练分布与真实世界的位置关系');
      curveStage.canvas.setAttribute('aria-label', '总误差随随机化范围变化的 U 形曲线');
    });

    render();
  }

  // ─── demo 3: 消融 ────────────────────────────────────────────────────────
  var FACTORS = [
    { id: 'texture', name: '纹理', gain: 0.34, why: '不随机化纹理，网络会直接拿颜色当位置线索' },
    { id: 'camera', name: '相机位姿', gain: 0.22, why: '真机相机装得和仿真里不可能完全一样' },
    { id: 'light', name: '光照', gain: 0.18, why: '实验室的灯和窗户的光差别很大' },
    { id: 'distract', name: '干扰物', gain: 0.15, why: '真实桌面上不会只有目标物体' },
    { id: 'noise', name: '图像噪声', gain: 0.06, why: '真实相机的噪点和压缩伪影' }
  ];

  function buildAblationDemo(host) {
    var root = card(host, {
      title: '五类随机化，哪一类是真的在救迁移',
      sub:
        '论文的随机化清单有五类。逐个关掉，看真机抓取成功率掉多少 —— ' +
        '它们的贡献并不平均，纹理那一项几乎是决定性的。'
    });

    var state = {};
    FACTORS.forEach(function (f) {
      state[f.id] = true;
    });

    var ctrls = controlsRow(root);
    var togBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(togBox);
    FACTORS.forEach(function (f) {
      checkbox(togBox, f.name, true, function (on) {
        state[f.id] = on;
        render();
      });
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '全开（论文配置）', function () {
      FACTORS.forEach(function (f) {
        state[f.id] = true;
      });
      syncBoxes();
      render();
    });
    button(btns, '全关（普通仿真训练）', function () {
      FACTORS.forEach(function (f) {
        state[f.id] = false;
      });
      syncBoxes();
      render();
    });
    function syncBoxes() {
      var inputs = togBox.querySelectorAll('input[type=checkbox]');
      for (var i = 0; i < inputs.length; i++) inputs[i].checked = !!state[FACTORS[i].id];
    }

    var setLegend = legend(root, [
      { key: 'good', text: '当前开着的随机化项' },
      { key: 'muted', text: '关掉的项（它本可以贡献这么多）' },
      { key: 'accent', text: '累计成功率' }
    ]);

    var grid = stageGrid(root);
    var barStage = stage(grid, 245);
    var cumStage = stage(grid, 245);

    var stats = statsRow(root);
    var sOn = stats.add('开着几项');
    var sRate = stats.add('真机抓取成功率');
    var sGapv = stats.add('离论文的 78% 差');
    var sTop = stats.add('当前最该补的一项');
    var verdict = verdictBox(root);

    note(root, [
      '**纹理是第一位的，因为它最容易被当成捷径**：CNN 只要发现「红块总在棕桌上」，就会去学颜色对比而不是形状。' +
        '随机化纹理等于把这条捷径堵死，逼它去看真正稳定的几何线索。',
      '**噪声那一项很便宜也很小**：这也是常见的误区 —— 加高斯噪声看起来很像「数据增广」，' +
        '但它并不能覆盖「桌子是另一种颜色」这类分布外变化。DR 和普通数据增广的区别就在这里。',
      '**加法是这里编的**：真实的消融不会这么可加，各项之间有交互（比如光照随机化在纹理固定时几乎没用）。' +
        '这个演示只用来排出「哪几项更关键」的直觉顺序。',
      '**这是简化模型**：各项的贡献值是按论文定性结论编的，不是实测的消融数字。' +
        '论文报告的是 DR-only 78%、微调后 87%，这里把全开对齐到 78%。'
    ]);

    var render = registerRenderer(function () {
      var base = 0.06;
      var sum = base;
      FACTORS.forEach(function (f) {
        if (state[f.id]) sum += f.gain;
      });
      var rate = clamp(sum, 0, 0.78);
      var on = FACTORS.filter(function (f) {
        return state[f.id];
      }).length;
      var missing = FACTORS.filter(function (f) {
        return !state[f.id];
      });
      missing.sort(function (a, b) {
        return b.gain - a.gain;
      });

      sOn.set(on + ' / ' + FACTORS.length, on === FACTORS.length ? 'good' : 'warn');
      sRate.set(fmt(rate * 100, 0) + '%', rate > 0.6 ? 'good' : rate < 0.3 ? 'bad' : 'warn');
      sGapv.set(fmt((0.78 - rate) * 100, 0) + ' 个点', 0.78 - rate < 0.05 ? 'good' : 'bad');
      sTop.set(missing.length ? missing[0].name : '没有了 ✔', missing.length ? 'bad' : 'good');

      if (!on) {
        verdict.set(
          '💀 全关掉就是普通的仿真训练：成功率 ' +
            fmt(rate * 100, 0) +
            '%。这正是 2017 年之前的默认做法 —— 大家以为要解决的问题是「渲染不够真」，' +
            '这篇论文说：不是，是**不够多样**。',
          'frozen'
        );
      } else if (missing.length) {
        verdict.set(
          '📉 少了「' +
            missing
              .map(function (f) {
                return f.name;
              })
              .join('、') +
            '」：成功率 ' +
            fmt(rate * 100, 0) +
            '%，离论文的 78% 还差 ' +
            fmt((0.78 - rate) * 100, 0) +
            ' 个点。最该先补的是「' +
            missing[0].name +
            '」—— ' +
            missing[0].why +
            '。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ 五项全开：' +
            fmt(rate * 100, 0) +
            '%，对应论文里 DR-only 的结果。再往上那 9 个点（到 87%）需要真实数据微调 —— ' +
            '但论文的重点是：**没有那 9 个点，机器人也已经能用了**。',
          'learning'
        );
      }

      // ── 左：各项贡献 ──
      var g = begin(barStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 24, b: 38 }, [0, FACTORS.length], [0, 0.4]);
      axes(g, p, {
        yTicks: [0, 0.1, 0.2, 0.3, 0.4],
        yFmt: function (t) {
          return fmt(t * 100, 0) + '%';
        }
      });
      text(g.ctx, '每一项贡献的成功率', p.x0, p.y1 - 10, P.muted, 'left', '11px sans-serif');
      var slot = (p.x1 - p.x0) / FACTORS.length;
      FACTORS.forEach(function (f, i) {
        var cx = p.x0 + slot * (i + 0.5);
        var bw = Math.max(10, slot * 0.5);
        g.ctx.fillStyle = state[f.id] ? P.good : P.muted;
        g.ctx.globalAlpha = state[f.id] ? 1 : 0.35;
        g.ctx.fillRect(cx - bw / 2, p.sy(f.gain), bw, p.y0 - p.sy(f.gain));
        g.ctx.globalAlpha = 1;
        barLabel(g, p, cx, p.sy(f.gain), '+' + fmt(f.gain * 100, 0), state[f.id] ? P.good : P.muted);
        text(g.ctx, f.name, cx, p.y0 + 14, state[f.id] ? P.text : P.muted, 'center', '11px sans-serif');
      });

      // ── 右：累计成功率 ──
      var g2 = begin(cumStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 24, b: 38 }, [0, FACTORS.length + 1], [0, 0.95]);
      axes(g2, p2, {
        yTicks: [0, 0.25, 0.5, 0.75],
        yFmt: function (t) {
          return fmt(t * 100, 0) + '%';
        }
      });
      text(g2.ctx, '按贡献从大到小累加', p2.x0, p2.y1 - 10, P2.muted, 'left', '11px sans-serif');
      line(g2.ctx, [[p2.x0, p2.sy(0.78)], [p2.x1, p2.sy(0.78)]], P2.good, 1.4, [5, 4]);
      text(g2.ctx, '论文 DR-only 78%', p2.x1 - 4, p2.sy(0.78) - 9, P2.good, 'right', '10px sans-serif');
      line(g2.ctx, [[p2.x0, p2.sy(0.87)], [p2.x1, p2.sy(0.87)]], P2.muted, 1.4, [3, 3]);
      text(g2.ctx, '微调后 87%', p2.x1 - 4, p2.sy(0.87) - 9, P2.muted, 'right', '10px sans-serif');
      var acc = 0.06,
        cum = [[p2.sx(0), p2.sy(acc)]];
      FACTORS.forEach(function (f, i) {
        if (state[f.id]) acc += f.gain;
        cum.push([p2.sx(i + 1), p2.sy(clamp(acc, 0, 0.95))]);
      });
      line(g2.ctx, cum, P2.accent, 2.6);
      cum.forEach(function (q) {
        dot(g2.ctx, q[0], q[1], 3.4, P2.accent);
      });
      FACTORS.forEach(function (f, i) {
        text(g2.ctx, f.name, p2.sx(i + 1), p2.y0 + 14, state[f.id] ? P2.text : P2.muted, 'center', '10px sans-serif');
      });

      barStage.canvas.setAttribute('aria-label', '五类随机化各自对成功率的贡献');
      cumStage.canvas.setAttribute('aria-label', '逐项累加后的抓取成功率');
    });

    render();
  }

  K.mount({
    'dr-scene': buildSceneDemo,
    'dr-coverage': buildCoverageDemo,
    'dr-ablation': buildAblationDemo
  });
})();
