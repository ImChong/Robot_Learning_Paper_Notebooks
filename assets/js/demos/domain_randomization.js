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
 *   dr-explainer — 八幕讲解动画：现实鸿沟 → 七项随机化 → 不标定的相机 → 检测网络 →
 *                  真机 1.5 cm → 要多少图和纹理 → 表 2 消融 → 真机抓取与之后
 *   dr-video     — 同一套八幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   dr-scene     — 随机化到底长什么样，以及论文图 5：纹理种数 vs 真机误差
 *   dr-coverage  — 真实世界只是参数空间里的一个点，它落在训练分布里了吗（玩具模型）
 *   dr-ablation  — 论文表 2（拿掉哪一项）与图 4（少用多少张图）
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

  // ─── 论文里的数字（arXiv 1703.06907 v1） ───────────────────────────────
  /* 表 1 / 表 2 照抄；图 4 / 图 5 没有给数值表，下面是读图得到的近似值（读到 0.1 cm）。
     三个演示、八幕动画与笔记「🚶 具体实例」共用这一份。 */
  var TABLE1 = [
    // 物体，单独放 / 有干扰物 / 被部分遮挡（cm，各 20 张真实照片的均值）
    ['圆锥', 1.3, 1.5, 1.4],
    ['立方体', 1.3, 1.8, 1.4],
    ['圆柱', 1.1, 1.9, 1.9],
    ['六棱柱', 0.7, 0.6, 1.0],
    ['棱锥', 0.9, 1.0, 1.1],
    ['长方体', 1.3, 1.2, 0.9],
    ['四面体', 0.8, 1.0, 3.2],
    ['三棱柱', 0.9, 0.9, 1.9]
  ];
  var TABLE2 = [
    // 每行各训 2 万张图（表 2 脚注），三类真实照片上的平均误差 ± 标准差（cm）
    { name: '完整方法', v: [1.3, 1.8, 2.4], sd: [0.6, 1.7, 3.0] },
    { name: '去掉噪声', v: [1.4, 1.9, 2.4], sd: [0.7, 2.0, 2.8] },
    { name: '去掉相机随机化', v: [2.0, 2.4, 2.9], sd: [2.1, 2.3, 3.5] },
    { name: '训练时去掉干扰物', v: [1.5, 7.2, 7.4], sd: [0.6, 4.5, 5.3] }
  ];
  var CONDS = ['单独放', '有干扰物', '被遮挡'];
  var FIG4_N = [1, 2, 5, 10, 20, 50, 100]; // 千张
  var FIG4_PRE = [3.8, 3.2, 2.1, 1.9, 1.8, 1.6, 1.6];
  var FIG4_SCRATCH = [13.9, 11.2, 2.6, 2.0, 1.7, 1.5, 1.4];
  var FIG5_TEX = [10, 100, 1000, 10000];
  var FIG5_ERR = [14.7, 12.5, 5.5, 1.9];
  var CAM_ANGLE = 0.1, CAM_FOV = 0.05, DIST_NEAR = 0.7, DIST_MID = 0.875, DIST_FAR = 1.05, IMG = 224, TARGET_CM = 1.5;
  var GRASP_OK = 38, GRASP_N = 40, SPAM_OK = 9, SPAM_N = 10;

  /* 表 1 按三种情况取 8 个物体的平均，以及 24 格的总平均 */
  function tableMeans() {
    var sums = [0, 0, 0];
    TABLE1.forEach(function (r) {
      for (var k = 0; k < 3; k++) sums[k] += r[k + 1];
    });
    return {
      cols: sums.map(function (s) {
        return s / TABLE1.length;
      }),
      all: (sums[0] + sums[1] + sums[2]) / (3 * TABLE1.length)
    };
  }

  /* 视线偏 CAM_ANGLE 弧度，在距离 d（米）处横向挪多少厘米（小角度近似） */
  function camShiftCm(d) {
    return d * CAM_ANGLE * 100;
  }

  /* 视场角缩放 5%：离图像中心半幅宽（112 像素）的物体在图上挪多少像素 */
  function fovShiftPx() {
    return (IMG / 2) * CAM_FOV;
  }

  /* 对数横轴上的分段线性插值（图 4 / 图 5 的点之间） */
  function logInterp(xs, ys, x) {
    if (x <= xs[0]) return ys[0];
    for (var i = 1; i < xs.length; i++) {
      if (x <= xs[i]) {
        var u = (Math.log(x) - Math.log(xs[i - 1])) / (Math.log(xs[i]) - Math.log(xs[i - 1]));
        return ys[i - 1] + u * (ys[i] - ys[i - 1]);
      }
    }
    return ys[ys.length - 1];
  }

  function thousands(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* 滑块在对数轴上走，读数只留两位有效数字（2^2.32 千张显示成 5,000 而不是 4,993） */
  function roughCount(n) {
    var unit = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return thousands(Math.round(n / unit) * unit);
  }

  // ─── demo 1: 随机化长什么样 + 图 5 ──────────────────────────────────────
  /* 一格 = 一张训练图的示意。物体（红块）在桌面上的位置是要预测的量，
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

    // 目标物体：位置就是要回归的量；纹理随机时连它的颜色也随机（论文 III-A 节）
    var ox = x + w * opts.objX,
      oy = tableY - h * 0.1;
    ctx.fillStyle = opts.texture ? 'hsl(' + fmt(rnd(0, 360), 0) + ',65%,50%)' : '#d94f3d';
    ctx.fillRect(ox - w * 0.055, oy - h * 0.1, w * 0.11, h * 0.12);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(ox - w * 0.055, oy - h * 0.1, w * 0.11, h * 0.12);

    // 随机噪点
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
        '左边九张是训练图的示意：纹理、光照、相机、干扰物、噪点每张都重新随机，全关掉就只剩一套固定外观。' +
        '右边是论文图 5：固定 1 万张训练图，只改见过多少种纹理（读图近似值）。'
    });

    var state = { texture: true, light: true, distract: true, noise: true, camera: true, logTex: 3, seed: 3 };

    var ctrls = controlsRow(root);
    var togBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(togBox);
    var boxes = {};
    [
      ['texture', '纹理'],
      ['light', '光照'],
      ['distract', '干扰物'],
      ['camera', '相机位姿'],
      ['noise', '噪点']
    ].forEach(function (it) {
      boxes[it[0]] = checkbox(togBox, it[1], state[it[0]], function (on) {
        state[it[0]] = on;
        render();
      });
    });
    var texSlider = slider(ctrls, {
      label: '见过多少种纹理（图 5 横轴）',
      min: 1,
      max: 4,
      step: 0.01,
      value: state.logTex,
      format: function (v) {
        return thousands(Math.pow(10, v)) + ' 种';
      },
      onInput: function (v) {
        state.logTex = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '换一批场景', function () {
      state.seed = (state.seed * 1103515245 + 12345) % 99991;
      render();
    });
    button(btns, '全部关掉（一套固定外观）', function () {
      ['texture', 'light', 'distract', 'noise', 'camera'].forEach(function (k) {
        state[k] = false;
        boxes[k].checked = false;
      });
      render();
    });
    button(btns, '只见过 100 种纹理', function () {
      state.texture = boxes.texture.checked = true;
      texSlider.set(2);
    });

    var setLegend = legend(root, [
      { key: 'good', text: '图 5：真机误差随纹理种数（读图近似值）' },
      { key: 'accent', text: '滑块位置（对数横轴插值）' },
      { key: 'bad', text: '少于 1000 种：论文说明显变差' }
    ]);

    var grid = stageGrid(root);
    var sceneStage = stage(grid, 250);
    var curveStage = stage(grid, 250);

    var stats = statsRow(root);
    var sTex = stats.add('纹理种数');
    var sErr = stats.add('图 5 读数（约）');
    var sX = stats.add('是 1 万种时的几倍');
    var sCue = stats.add('还能靠颜色找目标吗');
    var verdict = verdictBox(root);

    note(root, [
      '**这套图看着像 bug，其实是重点**：论文的主张是「不需要照片级真实，只需要足够多样」—— 真实世界对网络来说只是**又一个变体**。',
      '**多样性要靠数量**：图 5 固定 1 万张图，纹理 10 种约 14.7 cm、100 种约 12.5、1000 种约 5.5、1 万种约 1.9 cm；' +
        '论文的原话是少于 1000 种时性能明显变差。渲染一张随机纹理的图几乎不花钱，所以这条路便宜。',
      '**颜色是最省事的捷径**：如果目标永远是红色，网络只要找红色就行。论文把所有物体的纹理都随机，检测器只知道目标的形状和大小（III-A 节），' +
        '真机上和同色物体挨在一起也分得开（IV-D 节）。',
      '**示意图不是论文的渲染**：九宫格是 Canvas 画的示意（论文用 MuJoCo 自带渲染器）；右边四个点是从论文图 5 读出来的近似值，中间按对数横轴线性插值。'
    ]);

    var render = registerRenderer(function () {
      var anyRandom = state.texture || state.light || state.distract || state.noise || state.camera;
      var n = Math.pow(10, state.logTex);
      var err = logInterp(FIG5_TEX, FIG5_ERR, n);
      var times = err / FIG5_ERR[FIG5_ERR.length - 1];

      if (state.texture) {
        sTex.set(thousands(n) + ' 种', n >= 1000 ? 'good' : 'bad');
        sErr.set('≈ ' + fmt(err, 1) + ' cm', err < 3 ? 'good' : err > 8 ? 'bad' : 'warn');
        sX.set(fmt(times, 1) + ' 倍', times < 1.5 ? 'good' : 'bad');
        sCue.set('不能：目标颜色也随机', 'good');
      } else {
        sTex.set('1 种（纹理关掉）', 'bad');
        sErr.set('论文没测（最少 10 种）', 'warn');
        sX.set('—');
        sCue.set('能：目标永远是同一种红', 'bad');
      }

      if (!anyRandom) {
        verdict.set(
          '🎨 全部关掉：九张图长得几乎一样，目标永远是同一种红色、桌子永远在同一个位置。网络完全可以靠「红色在第几个像素」这种低级线索把仿真集做对，' +
            '一换到真实桌面就失效。论文没有测「只有 1 种纹理」，它测到的最少是 10 种：误差约 14.7 cm。',
          'frozen'
        );
      } else if (!state.texture) {
        verdict.set(
          '🎨 纹理关掉了：光照、相机、干扰物还在变，但所有表面永远是同一套颜色，目标也永远是红的。论文图 5 最少测到 10 种纹理，误差已经约 14.7 cm。',
          'frozen'
        );
      } else if (n < 1000) {
        verdict.set(
          '📉 只见过 ' + thousands(n) + ' 种纹理：图 5 读数约 ' + fmt(err, 1) + ' cm，是 1 万种时的 ' + fmt(times, 1) +
            ' 倍。论文：少于 1000 种时性能明显变差 —— 这时位置、干扰物再随机也补不回来。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ ' + thousands(n) + ' 种纹理：图 5 读数约 ' + fmt(err, 1) + ' cm。论文最好的检测器在 480 张真实照片上平均 1.5 cm 以内（表 1），' +
            '**一张真实照片都没训练过**。',
          'learning'
        );
      }

      // ── 左：九宫格场景 ──
      var g = begin(sceneStage);
      var P = g.P;
      setLegend(P);
      text(g.ctx, '训练集里随便抽的九张图（示意）', 10, 14, P.muted, 'left', '11px sans-serif');
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
              texture: state.texture,
              light: state.light,
              distract: state.distract,
              noise: state.noise,
              camera: state.camera,
              objX: state.camera ? 0.2 + 0.6 * ((idx * 0.37) % 1) : 0.5
            },
            rng,
            P
          );
        }
      }

      // ── 右：图 5 ──
      var g2 = begin(curveStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 46, r: 14, t: 22, b: 34 }, [1, 4], [0, 18]);
      g2.ctx.save();
      g2.ctx.fillStyle = P2.bad;
      g2.ctx.globalAlpha = 0.08;
      g2.ctx.fillRect(p2.x0, p2.y1, p2.sx(3) - p2.x0, p2.y0 - p2.y1);
      g2.ctx.restore();
      axes(g2, p2, {
        xTicks: [1, 2, 3, 4],
        yTicks: [0, 5, 10, 15],
        xFmt: function (t) {
          return ['10', '100', '1000', '1万'][Math.round(t) - 1];
        },
        yFmt: function (t) {
          return fmt(t, 0) + 'cm';
        },
        xLabel: '见过的纹理种数（对数轴）'
      });
      text(g2.ctx, '真机定位误差（1 万张训练图）', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      text(g2.ctx, '< 1000 种', p2.sx(2), p2.y1 + 12, P2.bad, 'center', '10px sans-serif');
      var pts = FIG5_TEX.map(function (n0, i) {
        return [p2.sx(Math.log10(n0)), p2.sy(FIG5_ERR[i])];
      });
      line(g2.ctx, pts, P2.good, 2.4);
      pts.forEach(function (q, i) {
        dot(g2.ctx, q[0], q[1], 3.4, P2.good);
        text(g2.ctx, fmt(FIG5_ERR[i], 1), q[0] + (i === 3 ? -4 : 6), q[1] - 9, P2.good, i === 3 ? 'right' : 'left', '10px monospace');
      });
      if (state.texture) {
        line(g2.ctx, [[p2.sx(state.logTex), p2.y0], [p2.sx(state.logTex), p2.y1]], P2.text, 1, [3, 3]);
        dot(g2.ctx, p2.sx(state.logTex), p2.sy(err), 5, P2.accent, P2.surface2);
      }

      sceneStage.canvas.setAttribute('aria-label', '九张随机化训练图像的示意');
      curveStage.canvas.setAttribute('aria-label', '论文图 5：真机定位误差随训练纹理种数的变化');
    });

    render();
  }

  // ─── demo 2: 覆盖（玩具模型） ────────────────────────────────────────────
  function buildCoverageDemo(host) {
    var root = card(host, {
      title: '真实世界只是参数空间里的一个点',
      sub:
        '只要真实世界的 $\\xi$ 落在训练时覆盖的范围内，网络就认得它。拖动真实世界的位置和随机化范围：' +
        '覆盖不到时误差会爆；范围越宽，网络要学的不变性也越多（右半边是玩具模型的假设，论文没测）。'
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
    var sCap = stats.add('容量代价（假设随范围变贵）');
    var sTot = stats.add('总定位误差');
    var verdict = verdictBox(root);

    note(root, [
      '**覆盖不到是灾难性的**：纹理种类太少就是覆盖不到的情形 —— 论文图 5 里只见过 10 种纹理时误差约 14.7 cm，1 万种时约 1.9 cm。',
      '**它解释了为什么能「零真实样本」**：真实世界不需要被专门建模，只要是训练分布里的一个平凡样本就行。这和「把仿真做得更真」是两种思路。',
      '**U 形的右半边是假设，不是这篇论文的实验**：论文只测了「多样性不够」那一侧（图 5、表 2），没有测「范围太宽」会怎样。' +
        '这里用「容量代价随范围线性增长」画出右半边，只是一种常见的直觉。',
      '**这是简化模型**：真实的 $\\xi$ 是几十维，曲线是编的。它只解释「覆盖 vs 容量」这个取舍的形状，数值不能和论文比。'
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
            ' cm。网络从没见过这种外观，它的输出没有任何保证 —— 纹理种类太少就是这种情形（图 5：10 种纹理约 14.7 cm）。',
          'frozen'
        );
      } else if (state.w > 0.85) {
        verdict.set(
          '🥱 范围拉到 ' +
            fmt(state.w, 2) +
            '：真实世界当然覆盖得到，但在这个玩具模型里网络要为「什么都可能」买单，容量代价涨到 ' +
            fmt(eCap * 100, 1) +
            ' cm，总误差 ' +
            fmt(tot * 100, 1) +
            ' cm。这一侧是假设，论文没测。',
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
      text(g2.ctx, '总误差：一条 U 形曲线（玩具模型）', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
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
      text(g2.ctx, '容量代价（假设）', p2.x0 + 8, p2.sy(0.185), P2.warn, 'left', '10px sans-serif');

      spaceStage.canvas.setAttribute('aria-label', '视觉参数空间中训练分布与真实世界的位置关系');
      curveStage.canvas.setAttribute('aria-label', '玩具模型里总误差随随机化范围变化的 U 形曲线');
    });

    render();
  }

  // ─── demo 3: 论文的消融（表 2 + 图 4） ───────────────────────────────────
  var ROW_VERDICT = [
    '',
    '🔇 **去掉噪声**：1.4 / 1.9 / 2.4 cm，和完整方法（1.3 / 1.8 / 2.4）最多差 0.1。论文说噪声对最终精度的影响可以忽略，' +
      '但训练时加一点噪声能让收敛更好、更不容易陷进局部最优。',
    '📷 **去掉相机随机化**：2.0 / 2.4 / 2.9 cm，三类都变差 0.5–0.7 cm。论文的评价是「稳定地提升一点精度，但没有它也能达到相当高的精度」。',
    '🧱 **训练时去掉干扰物**：单独放 1.5 cm 几乎不受影响，可真实桌上一有别的物体就跳到 **7.2 cm**（完整方法的 4.0 倍），' +
      '被遮挡时 **7.4 cm**（3.1 倍）。论文：训练时加入干扰物，对真实世界里抗干扰是关键。'
  ];

  function buildAblationDemo(host) {
    var root = card(host, {
      title: '论文的消融：拿掉哪一项、少用多少张图',
      sub:
        '左边是表 2（每行各训 2 万张图）：选一行和完整方法比，看三类真实照片上的平均误差；' +
        '右边是图 4：训练图张数对误差的影响，ImageNet 预训练 vs 从零训练（读图近似值）。'
    });

    var state = { row: 3, logN: Math.log(5) / Math.LN2 };

    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '和完整方法比的那一行（表 2）',
      items: [1, 2, 3].map(function (i) {
        return { label: TABLE2[i].name, value: i };
      }),
      value: state.row,
      onPick: function (v) {
        state.row = v;
        render();
      }
    });
    slider(ctrls, {
      label: '训练图张数（图 4 横轴）',
      min: 0,
      max: Math.log(100) / Math.LN2,
      step: 0.01,
      value: state.logN,
      format: function (v) {
        return roughCount(Math.pow(2, v) * 1000) + ' 张';
      },
      onInput: function (v) {
        state.logN = v;
        render();
      }
    });

    var setLegend = legend(root, [
      { key: 'accent', text: '完整方法 / ImageNet 预训练' },
      { key: 'bad', text: '选中的那一行 / 从零训练' },
      { key: 'muted', text: '细线：±1 标准差' }
    ]);

    var grid = stageGrid(root);
    var barStage = stage(grid, 245);
    var curveStage = stage(grid, 245);

    var stats = statsRow(root);
    var sRow = stats.add('选中行：单独 / 干扰物 / 遮挡');
    var sRatio = stats.add('有干扰物时是完整方法的');
    var sPre = stats.add('图 4 · 预训练（约）');
    var sScr = stats.add('图 4 · 从零训练（约）');
    var verdict = verdictBox(root);

    note(root, [
      '**干扰物那一行最值得记**：训练时桌上只有一个物体，网络就不必学「哪一个才是目标」；真实桌上一有别的东西，误差就从 1.8 跳到 7.2 cm。' +
        '（「捷径」是我们的解读，论文只说加入干扰物对抗干扰是关键。）',
      '**噪声几乎不影响最终精度**，但论文说训练时加一点噪声能让收敛更好、更不容易陷进局部最优 —— 它管的是训练过程，不是迁移本身。',
      '**预训练不是必需**：图 4 里数据够多时（约 1 万张以上）两条线贴在一起，各物体最好的检测器常常是从零训的；' +
        '数据少时预训练明显更好（1000 张：约 3.8 cm vs 13.9 cm）。',
      '**数字出处**：表 2 照抄论文；图 4 的点是读图近似值，中间按对数横轴线性插值。'
    ]);

    var render = registerRenderer(function () {
      var full = TABLE2[0],
        row = TABLE2[state.row];
      var nk = Math.pow(2, state.logN);
      var pre = logInterp(FIG4_N, FIG4_PRE, nk),
        scr = logInterp(FIG4_N, FIG4_SCRATCH, nk);
      var ratio = row.v[1] / full.v[1];

      sRow.set(
        row.v
          .map(function (v) {
            return fmt(v, 1);
          })
          .join(' / ') + ' cm',
        ratio > 2 ? 'bad' : 'warn'
      );
      sRatio.set(fmt(ratio, 1) + ' 倍', ratio > 2 ? 'bad' : 'good');
      sPre.set('≈ ' + fmt(pre, 1) + ' cm', pre < 2.5 ? 'good' : 'warn');
      sScr.set('≈ ' + fmt(scr, 1) + ' cm', scr < 2.5 ? 'good' : 'bad');
      verdict.set(
        ROW_VERDICT[state.row] +
          ' 右边：' + roughCount(nk * 1000) + ' 张图时，预训练约 ' + fmt(pre, 1) + ' cm、从零训练约 ' + fmt(scr, 1) + ' cm。',
        ratio > 2 ? 'frozen' : 'learning'
      );

      // ── 左：表 2 分组柱 ──
      var g = begin(barStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 40, r: 12, t: 24, b: 38 }, [0, 3], [0, 13]);
      axes(g, p, {
        yTicks: [0, 4, 8, 12],
        yFmt: function (t) {
          return fmt(t, 0) + 'cm';
        }
      });
      text(g.ctx, '表 2：三类真实照片上的平均误差', p.x0, p.y1 - 10, P.muted, 'left', '11px sans-serif');
      var slot = (p.x1 - p.x0) / 3;
      var bw = Math.max(10, slot * 0.28);
      CONDS.forEach(function (name, k) {
        var cx = p.x0 + slot * (k + 0.5);
        [
          [full, cx - bw - 2, P.accent],
          [row, cx + 2, P.bad]
        ].forEach(function (b) {
          var v = b[0].v[k],
            sd = b[0].sd[k];
          g.ctx.fillStyle = b[2];
          g.ctx.fillRect(b[1], p.sy(v), bw, p.y0 - p.sy(v));
          // ±1 标准差贴着柱子右缘画，读数留在柱子正上方，两者不压在一起
          line(g.ctx, [[b[1] + bw - 2, p.sy(Math.max(0, v - sd))], [b[1] + bw - 2, p.sy(Math.min(13, v + sd))]], P.muted, 1);
          barLabel(g, p, b[1] + bw / 2, p.sy(v), fmt(v, 1), b[2]);
        });
        text(g.ctx, name, cx, p.y0 + 14, P.text, 'center', '11px sans-serif');
      });

      // ── 右：图 4 ──
      var g2 = begin(curveStage);
      var P2 = g2.P;
      var xmax = Math.log(100) / Math.LN2;
      var p2 = plot(g2, { l: 46, r: 14, t: 22, b: 34 }, [0, xmax], [0, 16]);
      axes(g2, p2, {
        xTicks: FIG4_N.map(function (n0) {
          return Math.log(n0) / Math.LN2;
        }),
        yTicks: [0, 4, 8, 12, 16],
        xFmt: function (t) {
          return Math.round(Math.pow(2, t)) + 'k';
        },
        yFmt: function (t) {
          return fmt(t, 0) + 'cm';
        },
        xLabel: '训练图张数（对数轴）'
      });
      text(g2.ctx, '图 4：真机误差随训练图张数', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      [
        [FIG4_PRE, P2.accent],
        [FIG4_SCRATCH, P2.bad]
      ].forEach(function (c) {
        var pts = FIG4_N.map(function (n0, i) {
          return [p2.sx(Math.log(n0) / Math.LN2), p2.sy(c[0][i])];
        });
        line(g2.ctx, pts, c[1], 2.2);
        pts.forEach(function (q) {
          dot(g2.ctx, q[0], q[1], 2.8, c[1]);
        });
      });
      line(g2.ctx, [[p2.sx(state.logN), p2.y0], [p2.sx(state.logN), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(state.logN), p2.sy(pre), 5, P2.accent, P2.surface2);
      dot(g2.ctx, p2.sx(state.logN), p2.sy(scr), 5, P2.bad, P2.surface2);

      barStage.canvas.setAttribute('aria-label', '论文表 2：完整方法与选中消融行在三类真实照片上的平均误差');
      curveStage.canvas.setAttribute('aria-label', '论文图 4：预训练与从零训练的真机误差随训练图张数的变化');
    });

    render();
  }

  // ─── narrated explainer: eight scenes ────────────────────────────────────
  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    paint = K.paint,
    seg = K.seg,
    ease = K.ease,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
    polyPath = K.polyPath;

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_MUTED = X.muted,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2;
  var COND_COLORS = [C_ACCENT, C_WARN, C_MUTED];

  function rectBox(parent, x, y, w, h, stroke, fill, dash) {
    var r = paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 7, 'stroke-width': 1.3 }), fill || C_SURFACE, stroke || C_BORDER);
    if (dash) r.setAttribute('stroke-dasharray', dash);
    parent.appendChild(r);
    return r;
  }

  function group(parent) {
    var g = svgEl('g', {});
    parent.appendChild(g);
    return g;
  }

  function arrowPath(parent, pts, color, marker, dash, width) {
    var p = paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': width || 1.6, 'marker-end': marker }), null, color);
    if (dash) p.setAttribute('stroke-dasharray', dash);
    parent.appendChild(p);
    return p;
  }

  function hbar(parent, x, y, w, h, color, opacity) {
    var r = paint(svgEl('rect', { x: x, y: y, width: Math.max(0, w), height: h, rx: 3, opacity: opacity == null ? 0.85 : opacity }), color);
    parent.appendChild(r);
    return r;
  }

  function setW(node, w) {
    node.setAttribute('width', Math.max(0, w).toFixed(1));
  }

  function chip(parent, x, y, w, str, color, opts) {
    var o = opts || {};
    var g = group(parent);
    rectBox(g, x, y, w, o.h || 30, color, C_SURFACE, o.dash);
    g.appendChild(svgRich(x + w / 2, y + (o.h || 30) / 2 + 4, str, { size: o.size || 11, anchor: 'middle', w: w - 8, cls: o.cls || 'demo-x-ink2' }));
    return g;
  }

  /* ── 示意「渲染图」：背景（天空盒）、地板、桌子、机器人底座、几何体、光照与噪点 ──
     mode：'random' 每一样都按论文 III-A 节的三种纹理随机；'plain' 一套固定外观的普通仿真；
     'real' 真实网络摄像头照片的示意（论文图 3 / 图 6 的配色：木桌、原色几何体、地上的电线）。
     这些颜色是「图片」本身，不跟随站点主题。 */
  var TILE_ID = 0;
  var SHAPES = ['cone', 'cube', 'cylinder', 'hex', 'pyramid', 'rect', 'tetra', 'tri'];
  var REAL_OBJS = [
    { k: 'cube', u: 0.2, v: 0.32, c: '#2f5fd0' },
    { k: 'rect', u: 0.42, v: 0.28, c: '#c8312b' },
    { k: 'cylinder', u: 0.62, v: 0.32, c: '#2f5fd0' },
    { k: 'cone', u: 0.82, v: 0.28, c: '#2f8a5a' },
    { k: 'tri', u: 0.24, v: 0.82, c: '#e3b62b' },
    { k: 'hex', u: 0.45, v: 0.8, c: '#e3b62b' },
    { k: 'tetra', u: 0.64, v: 0.82, c: '#b22222' },
    { k: 'pyramid', u: 0.83, v: 0.8, c: '#3c9a72' }
  ];

  function hsl(h, s, l) {
    return 'hsl(' + Math.round(h) + ',' + Math.round(s) + '%,' + Math.round(l) + '%)';
  }

  function shapeD(kind, cx, by, s) {
    var w = s,
      h = s,
      pts;
    switch (kind) {
      case 'cone':
        pts = [[cx - w * 0.5, by], [cx, by - h * 1.1], [cx + w * 0.5, by]];
        break;
      case 'cube':
        pts = [[cx - w * 0.5, by], [cx - w * 0.5, by - h], [cx + w * 0.5, by - h], [cx + w * 0.5, by]];
        break;
      case 'cylinder':
        pts = [[cx - w * 0.45, by]];
        for (var i = 0; i <= 8; i++) {
          var a = Math.PI * (1 - i / 8);
          pts.push([cx + w * 0.45 * Math.cos(a), by - h - h * 0.15 * Math.sin(a)]);
        }
        pts.push([cx + w * 0.45, by]);
        break;
      case 'hex':
        pts = [[cx - w * 0.5, by - h * 0.45], [cx - w * 0.25, by - h * 0.9], [cx + w * 0.25, by - h * 0.9], [cx + w * 0.5, by - h * 0.45], [cx + w * 0.25, by], [cx - w * 0.25, by]];
        break;
      case 'pyramid':
        pts = [[cx - w * 0.62, by], [cx - w * 0.1, by - h * 0.95], [cx + w * 0.62, by], [cx, by + h * 0.08]];
        break;
      case 'rect':
        pts = [[cx - w * 0.7, by], [cx - w * 0.7, by - h * 0.55], [cx + w * 0.7, by - h * 0.55], [cx + w * 0.7, by]];
        break;
      case 'tetra':
        pts = [[cx - w * 0.5, by], [cx - w * 0.1, by - h * 0.95], [cx + w * 0.5, by - h * 0.15]];
        break;
      default:
        pts = [[cx - w * 0.6, by], [cx - w * 0.6, by - h * 0.25], [cx, by - h * 0.85], [cx + w * 0.6, by - h * 0.25], [cx + w * 0.6, by]];
    }
    return polyPath(
      pts.map(function (p) {
        return [p[0].toFixed(1), p[1].toFixed(1)];
      })
    ) + ' Z';
  }

  function sceneTile(parent, x, y, w, h, seed, mode, opts) {
    var o = opts || {};
    var rng = mulberry32(seed);
    var R = mode === 'random',
      REAL = mode === 'real';
    var g = group(parent);
    var defs = svgEl('defs', {});
    g.appendChild(defs);
    var clipId = 'dr-x-clip' + TILE_ID++;
    var cp = svgEl('clipPath', { id: clipId });
    cp.appendChild(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 4 }));
    defs.appendChild(cp);
    var body = svgEl('g', { 'clip-path': 'url(#' + clipId + ')' });
    g.appendChild(body);

    /* 论文 III-A 节的三种随机纹理：随机 RGB 纯色、两色渐变、两色棋盘格 */
    function texFill(fixed, kind) {
      if (!R) return fixed;
      var c1 = hsl(rng() * 360, 25 + rng() * 60, 22 + rng() * 52);
      var c2 = hsl(rng() * 360, 25 + rng() * 60, 22 + rng() * 52);
      var kd = kind == null ? Math.floor(rng() * 3) : kind;
      if (kd === 0) return c1;
      var id = 'dr-x-tex' + TILE_ID++;
      if (kd === 1) {
        var lg = svgEl('linearGradient', { id: id, x1: 0, y1: 0, x2: rng() > 0.5 ? 1 : 0, y2: 1 });
        lg.appendChild(svgEl('stop', { offset: 0, 'stop-color': c1 }));
        lg.appendChild(svgEl('stop', { offset: 1, 'stop-color': c2 }));
        defs.appendChild(lg);
      } else {
        var sz = 3 + Math.floor(rng() * 5);
        var pt = svgEl('pattern', { id: id, width: 2 * sz, height: 2 * sz, patternUnits: 'userSpaceOnUse' });
        pt.appendChild(svgEl('rect', { width: 2 * sz, height: 2 * sz, fill: c1 }));
        pt.appendChild(svgEl('rect', { width: sz, height: sz, fill: c2 }));
        pt.appendChild(svgEl('rect', { x: sz, y: sz, width: sz, height: sz, fill: c2 }));
        defs.appendChild(pt);
      }
      return 'url(#' + id + ')';
    }

    body.appendChild(svgEl('rect', { x: x, y: y, width: w, height: h, fill: texFill(REAL ? '#dcd6cc' : '#9fb8cf') }));
    var fy = y + h * 0.64;
    body.appendChild(svgEl('rect', { x: x, y: fy, width: w, height: y + h - fy, fill: texFill(REAL ? '#8e8b87' : '#7d7d7d') }));
    if (REAL) {
      // 地上的胶带与电线（论文 IV-B：真实照片里都有）
      body.appendChild(svgEl('path', { d: 'M ' + x + ' ' + (y + h * 0.93) + ' q ' + w * 0.3 + ' ' + -h * 0.08 + ' ' + w * 0.55 + ' ' + -h * 0.02 + ' t ' + w * 0.5 + ' ' + h * 0.03, fill: 'none', stroke: '#2a2a2a', 'stroke-width': 1.2 }));
      body.appendChild(svgEl('rect', { x: x + w * 0.06, y: y + h * 0.86, width: w * 0.14, height: h * 0.025, fill: '#d8c24a' }));
    }
    // 机器人底座：每张图里都有一部分机器人
    var rbx = x + w * (R ? 0.3 + rng() * 0.3 : 0.42);
    body.appendChild(svgEl('rect', { x: rbx, y: y - 4, width: w * 0.16, height: h * 0.27, rx: 3, fill: texFill(REAL ? '#3b3f45' : '#55606b') }));
    // 相机随机化：桌子在画面里的位置跟着变
    var dx = R ? (rng() - 0.5) * w * 0.12 : 0,
      dy = R ? (rng() - 0.5) * h * 0.1 : 0;
    var tx0 = x + w * 0.14 + dx,
      tx1 = x + w * 0.86 + dx,
      ty0 = y + h * 0.4 + dy,
      ty1 = y + h * 0.72 + dy,
      inset = w * 0.08;
    var legC = REAL ? '#8a6c47' : '#5a3b20';
    [tx0 + w * 0.03, tx1 - w * 0.06].forEach(function (lx) {
      body.appendChild(svgEl('rect', { x: lx, y: ty1, width: w * 0.03, height: h * 0.24, fill: R ? '#333' : legC }));
    });
    body.appendChild(svgEl('rect', { x: tx0, y: ty1, width: tx1 - tx0, height: h * 0.07, fill: texFill(REAL ? '#a8865c' : '#7a5230') }));
    body.appendChild(svgEl('path', {
      d: 'M ' + (tx0 + inset) + ' ' + ty0 + ' L ' + (tx1 - inset) + ' ' + ty0 + ' L ' + tx1 + ' ' + ty1 + ' L ' + tx0 + ' ' + ty1 + ' Z',
      fill: texFill(REAL ? '#c9a77c' : '#9a6b3f')
    }));

    var objs = o.objects;
    if (!objs) {
      if (R) {
        objs = [{ k: SHAPES[seed % SHAPES.length], u: 0.2 + rng() * 0.6, v: 0.25 + rng() * 0.6 }];
        var nd = Math.floor(rng() * 5);
        for (var d = 0; d < nd; d++) objs.push({ k: SHAPES[Math.floor(rng() * SHAPES.length)], u: 0.1 + rng() * 0.8, v: 0.15 + rng() * 0.75 });
      } else if (REAL) {
        objs = REAL_OBJS;
      } else {
        objs = [{ k: 'cube', u: 0.5, v: 0.55, c: '#d94f3d' }];
      }
    }
    objs
      .slice()
      .sort(function (a, b) {
        return a.v - b.v;
      })
      .forEach(function (ob) {
        var py = ty0 + ob.v * (ty1 - ty0);
        var xl = tx0 + inset * (1 - ob.v),
          xr = tx1 - inset * (1 - ob.v);
        var px = xl + ob.u * (xr - xl);
        var s = h * (0.1 + 0.05 * ob.v) * (ob.s || 1);
        var fill = ob.c || (R ? texFill(null, rng() < 0.6 ? 0 : 1) : '#d94f3d');
        body.appendChild(svgEl('path', { d: shapeD(ob.k, px, py, s), fill: fill, stroke: 'rgba(0,0,0,0.45)', 'stroke-width': 0.7 }));
      });

    if (R) {
      // 灯的数量 / 位置 / 方向：一层随机方向的明暗渐变
      var lid = 'dr-x-light' + TILE_ID++;
      var ang = rng() * Math.PI * 2;
      var lg2 = svgEl('linearGradient', { id: lid, x1: (0.5 + 0.5 * Math.cos(ang)).toFixed(2), y1: (0.5 + 0.5 * Math.sin(ang)).toFixed(2), x2: (0.5 - 0.5 * Math.cos(ang)).toFixed(2), y2: (0.5 - 0.5 * Math.sin(ang)).toFixed(2) });
      lg2.appendChild(svgEl('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': (0.05 + rng() * 0.3).toFixed(2) }));
      lg2.appendChild(svgEl('stop', { offset: 1, 'stop-color': '#000', 'stop-opacity': (0.05 + rng() * 0.4).toFixed(2) }));
      defs.appendChild(lg2);
      body.appendChild(svgEl('rect', { x: x, y: y, width: w, height: h, fill: 'url(#' + lid + ')' }));
      // 随机噪声
      if (rng() < 0.7) {
        var nz = '';
        for (var k = 0; k < 40; k++) nz += 'M ' + (x + rng() * w).toFixed(1) + ' ' + (y + rng() * h).toFixed(1) + ' h 1.2 ';
        body.appendChild(svgEl('path', { d: nz, stroke: rng() < 0.5 ? '#fff' : '#000', 'stroke-opacity': 0.45, 'stroke-width': 1.2 }));
      }
    } else if (REAL) {
      var vid = 'dr-x-vig' + TILE_ID++;
      var rg = svgEl('radialGradient', { id: vid, cx: 0.5, cy: 0.45, r: 0.75 });
      rg.appendChild(svgEl('stop', { offset: 0.55, 'stop-color': '#000', 'stop-opacity': 0 }));
      rg.appendChild(svgEl('stop', { offset: 1, 'stop-color': '#000', 'stop-opacity': 0.35 }));
      defs.appendChild(rg);
      body.appendChild(svgEl('rect', { x: x, y: y, width: w, height: h, fill: 'url(#' + vid + ')' }));
    }
    g.appendChild(paint(svgEl('rect', { x: x + 0.5, y: y + 0.5, width: w - 1, height: h - 1, rx: 4, fill: 'none', 'stroke-width': 1 }), null, C_BORDER));
    return g;
  }

  /* ── scene 1: 现实鸿沟与第三条路 ── */
  var ROUTES = [
    ['① 系统辨识 + 照片级渲染', '改仿真参数去对齐真机：费时、易出错，建不出的效应照样漏', C_BAD],
    ['② 域适应（domain adaptation）', '拿真实数据把模型适配过去：要采真实数据、标签或奖励', C_WARN],
    ['③ 域随机化（domain randomization）', '每张训练图都随机渲染：零真实训练数据', C_GOOD]
  ];

  function buildSceneGap() {
    var s = sceneSvg('仿真数据不花钱但画面和真实相机对不上；系统辨识加照片级渲染与域适应两条老路各有代价；域随机化让真实世界只是又一个变体；这篇只做画面：单目 RGB 图定位桌上物体');
    s.appendChild(svgText(40, 34, '仿真里数据不花钱、标签白给，可画面和真实相机对不上', 'demo-x-ink2', 13.5));

    var simPlain = group(s);
    sceneTile(simPlain, 40, 52, 170, 116, 11, 'plain');
    var simRand = [1, 2, 3, 4, 5, 6].map(function (k) {
      var g = group(s);
      sceneTile(g, 40, 52, 170, 116, 100 + k * 7, 'random');
      setOpacity(g, 0);
      return g;
    });
    var simLab = svgText(125, 186, '仿真渲染：一套固定的外观', 'demo-x-mut', 10.5, 'middle');
    var simLab2 = svgText(125, 186, '仿真渲染：每张都随机', 'demo-x-good', 10.5, 'middle');
    s.appendChild(simLab);
    s.appendChild(simLab2);
    var realG = group(s);
    sceneTile(realG, 250, 52, 170, 116, 5, 'real');
    realG.appendChild(svgText(335, 186, '真实网络摄像头（示意）', 'demo-x-mut', 10.5, 'middle'));
    var gap = group(s);
    gap.appendChild(svgText(230, 118, '≠', 'demo-x-bad', 26, 'middle'));

    var causes = group(s);
    causes.appendChild(svgText(40, 216, '现实鸿沟（reality gap）从哪来', 'demo-x-ink2', 11.5));
    chip(causes, 40, 226, 380, '物理：非刚性、齿轮间隙、磨损、流体，仿真里都没有', C_BAD, { size: 11 });
    chip(causes, 40, 264, 380, '图像：渲染器画不出真实相机的丰富纹理与噪声', C_BAD, { size: 11 });

    var routes = ROUTES.map(function (r, i) {
      var y = 52 + i * 80;
      var g = group(s);
      rectBox(g, 450, y, 320, 66, r[2], C_SURFACE, i < 2 ? '4 3' : null);
      g.appendChild(svgText(464, y + 25, r[0], i === 2 ? 'demo-x-good' : null, 12.5));
      g.appendChild(svgText(464, y + 48, r[1], 'demo-x-mut', 10.5));
      return g;
    });

    var hyp = group(s);
    chip(hyp, 40, 306, 730, '**假设**：仿真里的变化足够大，真实世界对模型来说就只是**又一个变体**，不用额外训练', C_ACCENT, { h: 34, size: 12.5 });
    var scope = group(s);
    chip(scope, 40, 356, 730, '这篇只做画面这一半：一张单目 RGB 图 → 桌上物体的位置（抓取等操作技能的垫脚石）', C_MUTED, { h: 32, size: 11.5 });

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      var rnd = seg(t, 10.6, 11.2);
      setOpacity(simPlain, seg(t, 0.3, 0.9) * (1 - rnd));
      var k = Math.floor(now / 0.8) % simRand.length;
      simRand.forEach(function (g, i) {
        setOpacity(g, i === k ? rnd : 0);
      });
      setOpacity(simLab, seg(t, 0.3, 0.9) * (1 - rnd));
      setOpacity(simLab2, rnd);
      setOpacity(realG, seg(t, 1.0, 1.6));
      setOpacity(gap, seg(t, 2.0, 2.6) * (1 - 0.6 * rnd));
      setOpacity(causes, seg(t, 3.6, 4.2));
      routes.forEach(function (g, i) {
        setOpacity(g, seg(t, [7.4, 8.6, 10.6][i], [8.0, 9.2, 11.2][i]));
      });
      setOpacity(hyp, seg(t, 12.2, 12.8));
      setOpacity(scope, seg(t, 13.6, 14.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 2: 每张训练图都随机的七样东西 ── */
  var RAND_LIST = [
    '桌上干扰物的数量与形状（0–10 个）',
    '桌上所有物体的位置与纹理',
    '桌子、地板、天空盒、机器人的纹理',
    '相机的位置、朝向、视场角',
    '灯的数量',
    '灯的位置、朝向、高光',
    '加到图上的噪声：类型与大小'
  ];

  function buildSceneList() {
    var s = sceneSvg('每张训练图都重新随机七样东西；纹理只有随机纯色、两色渐变、两色棋盘格三种；目标颜色也随机所以检测器只认形状和大小；用 MuJoCo 自带渲染器；测试时直接看真实照片');
    s.appendChild(svgText(24, 34, '每生成一张训练图，七样东西都重新随机', 'demo-x-ink2', 13.5));

    var CW = 122,
      CH = 84,
      GAP = 5;
    var cells = [];
    for (var c = 0; c < 9; c++) {
      var cx = 24 + (c % 3) * (CW + GAP),
        cy = 48 + Math.floor(c / 3) * (CH + GAP);
      var vars = [0, 1, 2].map(function (v) {
        var g = group(s);
        sceneTile(g, cx, cy, CW, CH, 7 + c * 31 + v * 977, 'random');
        return g;
      });
      cells.push({ vars: vars, off: c * 0.37 });
    }

    var sw = group(s);
    sw.appendChild(svgText(24, 334, '纹理只有三种生成方式（III-A 节）', 'demo-x-ink2', 11.5));
    var swDefs = svgEl('defs', {});
    sw.appendChild(swDefs);
    var lgS = svgEl('linearGradient', { id: 'dr-x-sw-grad', x1: 0, y1: 0, x2: 1, y2: 1 });
    lgS.appendChild(svgEl('stop', { offset: 0, 'stop-color': '#e0a43a' }));
    lgS.appendChild(svgEl('stop', { offset: 1, 'stop-color': '#3a6fd8' }));
    swDefs.appendChild(lgS);
    var ptS = svgEl('pattern', { id: 'dr-x-sw-check', width: 12, height: 12, patternUnits: 'userSpaceOnUse' });
    ptS.appendChild(svgEl('rect', { width: 12, height: 12, fill: '#7a3fc0' }));
    ptS.appendChild(svgEl('rect', { width: 6, height: 6, fill: '#9fe0a0' }));
    ptS.appendChild(svgEl('rect', { x: 6, y: 6, width: 6, height: 6, fill: '#9fe0a0' }));
    swDefs.appendChild(ptS);
    [
      ['#c0504d', '随机纯色'],
      ['url(#dr-x-sw-grad)', '两色渐变'],
      ['url(#dr-x-sw-check)', '两色棋盘格']
    ].forEach(function (it, i) {
      var x = 24 + i * 127;
      sw.appendChild(svgEl('rect', { x: x, y: 344, width: 44, height: 32, rx: 4, fill: it[0] }));
      sw.appendChild(svgText(x + 52, 365, it[1], null, 11));
    });

    s.appendChild(svgText(418, 62, '七样都重新随机（论文 III-A 节）', 'demo-x-ink2', 12));
    var rows = RAND_LIST.map(function (str, i) {
      var g = group(s);
      var y = 88 + i * 26;
      g.appendChild(svgText(426, y, String(i + 1), 'demo-x-acc demo-x-mono', 12, 'middle'));
      g.appendChild(svgText(442, y, str, null, 11.5));
      return g;
    });
    var c1 = group(s);
    chip(c1, 418, 268, 360, '目标的颜色也随机 → 检测器只认**形状和大小**', C_ACCENT);
    var c2 = group(s);
    chip(c2, 418, 306, 360, '干扰物取自同一套 8 个几何体，地上和背景不放', C_MUTED);
    var c3 = group(s);
    chip(c3, 418, 344, 360, '渲染：MuJoCo 自带渲染器，不追求照片级真实', C_MUTED);
    var test = group(s);
    chip(test, 418, 382, 360, '测试：同一个检测器直接看真实照片，**不再训练**', C_GOOD);

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      var show = seg(t, 0.2, 0.8);
      cells.forEach(function (cl) {
        var k = Math.floor((now + cl.off) / 1.3) % 3;
        cl.vars.forEach(function (g, i) {
          setOpacity(g, i === k ? show : 0);
        });
      });
      rows.forEach(function (g, i) {
        setOpacity(g, seg(t, 0.6 + i * 0.5, 1.0 + i * 0.5));
      });
      setOpacity(sw, seg(t, 4.6, 5.2));
      setOpacity(c1, seg(t, 7.8, 8.4));
      setOpacity(c2, seg(t, 8.8, 9.4));
      setOpacity(c3, seg(t, 11.0, 11.6));
      setOpacity(test, seg(t, 13.4, 14.0));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 3: 相机不标定（俯视） ── */
  function buildSceneCamera() {
    var s = sceneSvg('真机相机不标定；训练时相机在 10×5×10 厘米的盒子里随机、朝向偏最多 0.1 弧度、视场角缩放最多 5%；粗算 0.1 弧度在 0.7 到 1.05 米处横向挪 7 到 10.5 厘米；桌高固定变成二维定位；去掉相机随机化误差从 1.3 变 2.0 厘米');
    s.appendChild(svgText(40, 34, '相机不标定：位置、朝向、视场角都在小范围里随机（俯视示意）', 'demo-x-ink2', 13.5));
    var PX = 250; // 像素 / 米
    var C0 = [210, 372],
      P0 = [210, C0[1] - DIST_MID * PX];

    var base = group(s);
    var yNear = C0[1] - DIST_NEAR * PX,
      yFar = C0[1] - DIST_FAR * PX;
    rectBox(base, 120, yFar, 180, yNear - yFar, C_BORDER, C_SURFACE2);
    base.appendChild(svgText(126, yFar + 14, '桌面（俯视）', 'demo-x-mut', 10));
    base.appendChild(paint(svgEl('circle', { cx: P0[0], cy: P0[1], r: 3.5 }), C_ACCENT));
    base.appendChild(svgText(P0[0] + 30, P0[1] + 4, '← 对准的固定点', 'demo-x-acc', 10));
    base.appendChild(svgText(306, yNear + 4, '0.70 m', 'demo-x-mut demo-x-mono', 10));
    base.appendChild(svgText(306, yFar + 4, '1.05 m', 'demo-x-mut demo-x-mono', 10));
    base.appendChild(svgText(C0[0], C0[1] + 26, '仿真里手放的相机', 'demo-x-mut', 10, 'middle'));

    var boxG = group(s);
    var bs = 0.1 * PX;
    rectBox(boxG, C0[0] - bs / 2, C0[1] - bs / 2, bs, bs, C_ACCENT, 'none', '3 2');
    boxG.appendChild(svgText(C0[0] + bs / 2 + 8, C0[1] + 4, '10 × 5 × 10 cm 的盒子', 'demo-x-acc', 10));

    /* ±0.1 rad 两条引导线，与两处的横向偏移 */
    var guide = group(s);
    [-CAM_ANGLE, CAM_ANGLE].forEach(function (da) {
      var L = (C0[1] - yFar) / Math.cos(da);
      arrowPath(guide, [[C0[0], C0[1]], [C0[0] + L * Math.sin(da), yFar]], C_BAD, null, '4 3', 1.2);
    });
    [[yNear, DIST_NEAR], [yFar, DIST_FAR]].forEach(function (r) {
      var half = camShiftCm(r[1]) / 100 * PX;
      guide.appendChild(paint(svgEl('path', { d: 'M ' + (C0[0] - half) + ' ' + (r[0] + 6) + ' v -6 H ' + (C0[0] + half) + ' v 6', fill: 'none', 'stroke-width': 1.4 }), null, C_BAD));
      guide.appendChild(svgText(C0[0] + half + 6, r[0] - 4, '±' + fmt(camShiftCm(r[1]), 1) + ' cm', 'demo-x-bad demo-x-mono', 10));
    });

    var fovG = group(s);
    var FOV_HALF = 0.42;
    [1, 1 + CAM_FOV, 1 - CAM_FOV].forEach(function (k, i) {
      [-1, 1].forEach(function (sg) {
        var a = sg * FOV_HALF * k,
          L = 150;
        var ln = paint(svgEl('line', { x1: C0[0], y1: C0[1], x2: (C0[0] + L * Math.sin(a)).toFixed(1), y2: (C0[1] - L * Math.cos(a)).toFixed(1), 'stroke-width': i ? 0.9 : 1.2 }), null, C_MUTED);
        if (i) ln.setAttribute('stroke-dasharray', '2 3');
        fovG.appendChild(ln);
      });
    });
    fovG.appendChild(svgText(C0[0] - 150 * Math.sin(FOV_HALF) - 4, C0[1] - 150 * Math.cos(FOV_HALF) + 18, '视场角 ×(1 ± 5%)', 'demo-x-mut', 10, 'end'));

    /* 每张训练图一台「随机」相机：在盒子里挪，对准固定点后再偏一点 */
    var cam = group(s);
    var ray = paint(svgEl('line', { 'stroke-width': 1.8 }), null, C_ACCENT);
    cam.appendChild(ray);
    var hit = paint(svgEl('circle', { r: 3.2 }), C_ACCENT);
    cam.appendChild(hit);
    var body = svgEl('g', {});
    body.appendChild(paint(svgEl('rect', { x: -9, y: -6, width: 18, height: 12, rx: 2 }), C_ACCENT));
    body.appendChild(paint(svgEl('path', { d: 'M -5 -6 L 0 -12 L 5 -6 Z' }), C_ACCENT));
    cam.appendChild(body);

    var panel = group(s);
    panel.appendChild(svgText(440, 62, '粗算：视线偏 0.1 rad，在物体处横向挪多少', 'demo-x-ink2', 11.5));
    var BX = 520,
      U = 12;
    var rowsC = [[DIST_NEAR, '0.70 m'], [DIST_MID, '0.875 m'], [DIST_FAR, '1.05 m']].map(function (r, i) {
      var y = 76 + i * 24;
      var g = group(panel);
      g.appendChild(svgText(440, y + 12, r[1], 'demo-x-mono', 11));
      var b = hbar(g, BX, y, 0, 15, C_BAD);
      var v = svgText(BX + 6, y + 12, '', 'demo-x-bad demo-x-mono', 11);
      g.appendChild(v);
      return { g: g, bar: b, val: v, cm: camShiftCm(r[0]), at: 7.8 + i * 0.4 };
    });
    var ref = group(panel);
    ref.appendChild(svgText(440, 160, '目标精度', 'demo-x-good', 11));
    hbar(ref, BX, 148, TARGET_CM * U, 15, C_GOOD);
    ref.appendChild(svgText(BX + TARGET_CM * U + 6, 160, '1.5 cm', 'demo-x-good demo-x-mono', 11));
    var formula = svgMath(440, 196, '\\Delta \\approx d\\,\\theta = 1.05\\,\\mathrm{m} \\times 0.1 = 10.5\\,\\mathrm{cm}', { size: 13, w: 340 });
    panel.appendChild(formula);
    var fovLine = svgRich(440, 224, '视场角缩放 5%：图像边缘的物体挪 $112 \\times 5\\% \\approx 5.6$ 像素', { size: 11, w: 340 });
    panel.appendChild(fovLine);
    var guess = svgText(440, 250, '推测：网络没法死记「第几个像素」，得参照桌子等场景结构', 'demo-x-warn', 10.5);
    panel.appendChild(guess);
    var zG = group(s);
    chip(zG, 440, 272, 340, '桌高固定 → 物体中心高度已知 → 实为桌面上的二维定位', C_ACCENT, { size: 11 });
    var abl = group(s);
    chip(abl, 440, 318, 340, '表 2：去掉相机随机化，单独放 **1.3 → 2.0 cm**', C_MUTED, { size: 11 });
    abl.appendChild(svgText(610, 368, '有帮助，但不是决定性的（第 7 幕）', 'demo-x-mut', 10.5, 'middle'));

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      setOpacity(base, seg(t, 0.3, 0.9));
      setOpacity(boxG, seg(t, 3.4, 4.0));
      setOpacity(guide, seg(t, 4.4, 5.0));
      setOpacity(fovG, seg(t, 0.6, 1.2) * (0.5 + 0.5 * seg(t, 5.4, 6.0)));
      var jit = seg(t, 3.4, 4.0);
      var cx = C0[0] + jit * (bs / 2 - 2) * Math.sin(now * 1.3),
        cy = C0[1] + jit * (bs / 2 - 2) * Math.sin(now * 0.9 + 1);
      var aim = Math.atan2(P0[0] - cx, cy - P0[1]) + jit * CAM_ANGLE * Math.sin(now * 1.7 + 0.5);
      var L = (cy - P0[1]) / Math.cos(aim);
      var hx = cx + L * Math.sin(aim);
      ray.setAttribute('x1', cx.toFixed(1));
      ray.setAttribute('y1', cy.toFixed(1));
      ray.setAttribute('x2', hx.toFixed(1));
      ray.setAttribute('y2', P0[1].toFixed(1));
      hit.setAttribute('cx', hx.toFixed(1));
      hit.setAttribute('cy', P0[1].toFixed(1));
      body.setAttribute('transform', 'translate(' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ') rotate(' + ((aim * 180) / Math.PI).toFixed(1) + ')');
      setOpacity(cam, seg(t, 0.3, 0.9));
      setOpacity(panel, seg(t, 7.6, 8.0));
      rowsC.forEach(function (r) {
        var u = ease(seg(t, r.at, r.at + 0.8));
        setW(r.bar, r.cm * U * u);
        r.val.setAttribute('x', (BX + r.cm * U * u + 6).toFixed(1));
        r.val.textContent = u > 0 ? fmt(r.cm * u, 2).replace(/0$/, '') + ' cm' : '';
      });
      setOpacity(ref, seg(t, 9.0, 9.4));
      setOpacity(formula, seg(t, 9.4, 9.9));
      setOpacity(fovLine, seg(t, 9.9, 10.4));
      setOpacity(guess, seg(t, 10.4, 10.9));
      setOpacity(zG, seg(t, 11.4, 12.0));
      setOpacity(abl, seg(t, 13.8, 14.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 4: 检测网络与训练 ── */
  var CONV_GROUPS = [
    { n: 2, h: 100, lab: '224×224×64' },
    { n: 2, h: 84, lab: '112×112×128' },
    { n: 3, h: 68, lab: '56×56×256' },
    { n: 3, h: 54, lab: '28×28×512' },
    { n: 3, h: 42, lab: '14×14×512' }
  ];
  var OBJ_NAMES = ['圆锥', '立方体', '圆柱', '六棱柱', '棱锥', '长方体', '四面体', '三棱柱'];
  var LR_TRUE = [[0.2, 0.25], [0.75, 0.2], [0.5, 0.5], [0.15, 0.75], [0.85, 0.7], [0.6, 0.85]];

  function buildSceneNet() {
    var s = sceneSvg('检测器是改过的 VGG-16：224×224 输入，标准卷积层，256 与 64 两层全连接，输出物体质心的 x y z；L2 损失；8 个物体各训一个；学习率 1e-3 会把所有物体预测到桌子中央，1e-4 才收敛；数据够多时随机初始化和 ImageNet 预训练一样好');
    s.appendChild(svgRich(30, 32, '检测器：改过的 VGG-16，从一张图直接回归 $(x, y, z)$', { size: 13.5, w: 600, cls: 'demo-x-ink2' }));
    var mk = K.arrowMarker(s, 'dr-x-arrow-s4', C_MUTED);
    var CY = 112;

    var inG = group(s);
    inG.appendChild(svgText(78, 64, '224 × 224 输入', 'demo-x-mut', 10, 'middle'));
    sceneTile(inG, 30, 78, 96, 68, 21, 'random');
    arrowPath(inG, [[128, CY], [140, CY]], C_MUTED, mk);

    var bars = [];
    var x = 146;
    CONV_GROUPS.forEach(function (cg, gi) {
      for (var b = 0; b < cg.n; b++) {
        var r = paint(svgEl('rect', { x: x, y: CY - cg.h / 2, width: 7, height: cg.h, rx: 1.5 }), C_ACCENT);
        r.style.opacity = 0;
        s.appendChild(r);
        bars.push(r);
        x += 10;
      }
      if (gi < CONV_GROUPS.length - 1) x += 13;
    });
    var convLab = group(s);
    convLab.appendChild(paint(svgEl('path', { d: 'M 146 172 v 5 H ' + (x - 3) + ' v -5', fill: 'none', 'stroke-width': 1 }), null, C_MUTED));
    convLab.appendChild(svgText((146 + x - 3) / 2, 192, 'VGG-16 标准卷积层（组间最大池化）', 'demo-x-mut', 10, 'middle'));
    convLab.appendChild(svgText(146, 52, CONV_GROUPS[0].lab, 'demo-x-mut demo-x-mono', 9));
    convLab.appendChild(svgText(x - 3, CY + CONV_GROUPS[4].h / 2 + 14, CONV_GROUPS[4].lab, 'demo-x-mut demo-x-mono', 9, 'end'));

    var fcG = group(s);
    var fx = x + 12;
    arrowPath(fcG, [[x - 1, CY], [fx - 2, CY]], C_MUTED, mk);
    fcG.appendChild(paint(svgEl('rect', { x: fx, y: CY - 15, width: 9, height: 30, rx: 1.5 }), C_WARN));
    fcG.appendChild(paint(svgEl('rect', { x: fx + 20, y: CY - 9, width: 9, height: 18, rx: 1.5 }), C_WARN));
    fcG.appendChild(svgText(fx + 10, CY - 40, '全连接 256 → 64', 'demo-x-warn', 10, 'middle'));
    fcG.appendChild(svgText(fx + 10, CY - 26, '不用 dropout', 'demo-x-mut', 9.5, 'middle'));
    var outG = group(s);
    var ox = fx + 46;
    arrowPath(outG, [[fx + 30, CY], [ox - 2, CY]], C_MUTED, mk);
    rectBox(outG, ox, CY - 24, 104, 48, C_ACCENT);
    outG.appendChild(svgMath(ox + 52, CY + 4, '(x,\\ y,\\ z)', { size: 15, anchor: 'middle', w: 100 }));
    outG.appendChild(svgText(ox + 52, CY + 40, '物体质心 · 世界坐标', 'demo-x-mut', 10, 'middle'));

    var objG = group(s);
    objG.appendChild(svgText(594, 54, '8 个几何体，各训一个检测器', 'demo-x-ink2', 11));
    SHAPES.forEach(function (k, i) {
      var cx = 612 + (i % 4) * 46,
        by = 96 + Math.floor(i / 4) * 52;
      objG.appendChild(paint(svgEl('path', { d: shapeD(k, cx, by, 22), 'stroke-width': 1 }), C_SURFACE2, C_ACCENT));
      objG.appendChild(svgText(cx, by + 15, OBJ_NAMES[i], 'demo-x-mut', 9, 'middle'));
    });

    var lossG = group(s);
    lossG.appendChild(svgMath(30, 226, '\\mathcal{L} = \\lVert \\hat{\\mathbf{p}} - \\mathbf{p} \\rVert^2', { size: 15, w: 170 }));
    lossG.appendChild(svgRich(196, 226, '标签 $\\mathbf{p}$：物体质心的世界坐标，仿真里白给', { size: 11.5, w: 380 }));

    var lrG = group(s);
    rectBox(lrG, 30, 248, 370, 156, C_BORDER, C_SURFACE2);
    lrG.appendChild(svgRich(44, 268, 'Adam 的学习率：$10^{-3}$ vs $10^{-4}$（桌面俯视，○ 是真值）', { size: 11, w: 350 }));
    var panes = [
      { x: 46, lab: '$10^{-3}$：全挤到桌子中央', cls: 'demo-x-bad', col: C_BAD, collapse: true },
      { x: 224, lab: '$10^{-4}$：各回各位', cls: 'demo-x-good', col: C_GOOD, collapse: false }
    ].map(function (pn) {
      var g = group(lrG);
      g.appendChild(svgRich(pn.x + 80, 290, pn.lab, { size: 10.5, anchor: 'middle', w: 170, cls: pn.cls }));
      rectBox(g, pn.x, 300, 160, 94, C_BORDER, C_SURFACE);
      var dots = LR_TRUE.map(function (q) {
        var tx = pn.x + 12 + q[0] * 136,
          ty = 308 + q[1] * 78;
        g.appendChild(paint(svgEl('circle', { cx: tx, cy: ty, r: 5, fill: 'none', 'stroke-width': 1.2 }), null, C_MUTED));
        var d = paint(svgEl('circle', { cx: tx, cy: ty, r: 3.4 }), pn.col);
        g.appendChild(d);
        return { d: d, tx: tx, ty: ty };
      });
      return { pn: pn, dots: dots, cx: pn.x + 80, cy: 347 };
    });

    var pre = group(s);
    chip(pre, 420, 248, 360, '作者原以为：必须 ImageNet 预训练才能迁移', C_MUTED, { dash: '4 3' });
    var pre2 = group(s);
    chip(pre2, 420, 290, 360, '结果：数据够多时，随机初始化一样好', C_GOOD);
    chip(pre2, 420, 332, 360, '各物体最好的检测器，常常是从零训的', C_GOOD);
    var pre3 = group(s);
    chip(pre3, 420, 374, 360, '数据少时，预训练明显更好（第 6 幕）', C_ACCENT);

    function draw(t) {
      setOpacity(inG, seg(t, 0.3, 0.8));
      bars.forEach(function (b, i) {
        setOpacity(b, seg(t, 0.7 + i * 0.14, 1.0 + i * 0.14));
      });
      setOpacity(convLab, seg(t, 2.4, 2.9));
      setOpacity(fcG, seg(t, 2.8, 3.3));
      setOpacity(outG, seg(t, 3.2, 3.7));
      setOpacity(lossG, seg(t, 4.4, 5.0));
      setOpacity(objG, seg(t, 5.6, 6.2));
      setOpacity(lrG, seg(t, 7.6, 8.2));
      panes.forEach(function (p) {
        var u = ease(seg(t, 8.4, 10.2));
        p.dots.forEach(function (d, i) {
          var sx = p.pn.collapse ? d.tx : p.cx + ((i % 3) - 1) * 4,
            sy = p.pn.collapse ? d.ty : p.cy + (i < 3 ? -3 : 3);
          var ex = p.pn.collapse ? p.cx + ((i % 3) - 1) * 4 : d.tx,
            ey = p.pn.collapse ? p.cy + (i < 3 ? -3 : 3) : d.ty;
          d.d.setAttribute('cx', (sx + (ex - sx) * u).toFixed(1));
          d.d.setAttribute('cy', (sy + (ey - sy) * u).toFixed(1));
        });
      });
      setOpacity(pre, seg(t, 10.8, 11.4));
      setOpacity(pre2, seg(t, 11.8, 12.4));
      setOpacity(pre3, seg(t, 13.4, 14.0));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 5: 真机定位精度（表 1） ── */
  var TILE_ALONE = [{ k: 'hex', u: 0.5, v: 0.55, c: '#e3b62b' }];
  var TILE_DISTRACT = [
    { k: 'hex', u: 0.5, v: 0.55, c: '#e3b62b' },
    { k: 'cube', u: 0.18, v: 0.3, c: '#2f5fd0' },
    { k: 'cone', u: 0.82, v: 0.35, c: '#2f8a5a' },
    { k: 'rect', u: 0.3, v: 0.85, c: '#c8312b' },
    { k: 'tri', u: 0.78, v: 0.85, c: '#e3b62b' }
  ];
  var TILE_OCCL = [
    { k: 'hex', u: 0.5, v: 0.45, c: '#e3b62b' },
    { k: 'cube', u: 0.46, v: 0.75, c: '#2f5fd0', s: 1.2 }
  ];

  function buildSceneReal() {
    var m = tableMeans();
    var s = sceneSvg('真机测试集 480 张网络摄像头照片，8 个物体各 60 张：单独放、有干扰物、被遮挡各 20 张；表 1 三种情况平均 1.04、1.24、1.60 厘米，总平均 1.29 厘米；最差是被遮挡的四面体 3.2 厘米；仿真里误差只有 0.3 到 0.5 厘米，仍在过拟合仿真');
    s.appendChild(svgText(30, 34, '真机测试：480 张网络摄像头照片，平均 1.5 cm 以内', 'demo-x-ink2', 13.5));

    var tiles = [
      [TILE_ALONE, '单独放 × 20'],
      [TILE_DISTRACT, '有干扰物 × 20'],
      [TILE_OCCL, '被部分遮挡 × 20']
    ].map(function (it, i) {
      var g = group(s);
      sceneTile(g, 30 + i * 102, 50, 96, 68, 40 + i, 'real', { objects: it[0] });
      g.appendChild(svgText(78 + i * 102, 134, it[1], 'demo-x-mut', 10, 'middle'));
      return g;
    });
    var info = group(s);
    info.appendChild(svgText(30, 162, '8 个几何体 × 60 张 = 480 张', null, 12.5));
    info.appendChild(svgText(30, 184, '物体离相机 70–105 cm，相机位置固定', 'demo-x-mut', 10.5));
    info.appendChild(svgText(30, 202, '真值：把物体对准桌面网格摆放', 'demo-x-mut', 10.5));
    var env = group(s);
    env.appendChild(svgText(30, 230, '不控制光照与周围环境：', 'demo-x-ink2', 10.5));
    env.appendChild(svgText(30, 248, '图里都有一部分机器人，地上有胶带和电线', 'demo-x-mut', 10.5));

    var ov = group(s);
    ov.appendChild(svgText(30, 290, '还在过拟合仿真', 'demo-x-ink2', 11.5));
    var OX = 80,
      OU = 120;
    ov.appendChild(svgText(30, 314, '仿真', 'demo-x-mut', 11));
    var simBar = hbar(ov, OX, 302, 0, 15, C_GOOD);
    var simVal = svgText(OX, 314, '', 'demo-x-good demo-x-mono', 10.5);
    ov.appendChild(simVal);
    ov.appendChild(svgText(30, 340, '真实', 'demo-x-mut', 11));
    var realBar = hbar(ov, OX, 328, 0, 15, C_WARN);
    var realVal = svgText(OX, 340, '', 'demo-x-warn demo-x-mono', 10.5);
    ov.appendChild(realVal);
    var ovNote = group(s);
    chip(ovNote, 30, 358, 300, '精度已与当时更高分辨率的传统单目方法相当', C_GOOD, { size: 10.5, h: 32 });

    // 右：表 1 的点图
    var AX0 = 440,
      AX1 = 770,
      AU = (AX1 - AX0) / 3.5;
    function ax(v) {
      return AX0 + v * AU;
    }
    var axisG = group(s);
    axisG.appendChild(svgText(350, 62, '表 1：8 个物体各自的平均误差（cm）', 'demo-x-ink2', 11.5));
    [0, 1, 2, 3].forEach(function (v) {
      axisG.appendChild(paint(svgEl('line', { x1: ax(v), y1: 84, x2: ax(v), y2: 248, 'stroke-width': 0.8 }), null, C_BORDER));
      axisG.appendChild(svgText(ax(v), 264, String(v), 'demo-x-mut demo-x-mono', 10, 'middle'));
    });
    var lim = group(s);
    var limLine = paint(svgEl('line', { x1: ax(1.5), y1: 80, x2: ax(1.5), y2: 248, 'stroke-width': 1.3, 'stroke-dasharray': '5 3' }), null, C_GOOD);
    lim.appendChild(limLine);
    lim.appendChild(svgText(ax(1.5) + 5, 92, '论文：平均 1.5 cm 以内', 'demo-x-good', 10));
    var rowsR = CONDS.map(function (name, k) {
      var y = 118 + k * 52;
      var g = group(s);
      g.appendChild(svgText(350, y + 4, name, null, 11.5));
      var pts = TABLE1.map(function (r, i) {
        var v = r[k + 1];
        var dd = paint(svgEl('circle', { cx: ax(v), cy: y + ((i % 4) - 1.5) * 5, r: 4, opacity: 0.75 }), r[0] === '四面体' && k === 2 ? C_BAD : C_MUTED);
        g.appendChild(dd);
        return dd;
      });
      var meanG = group(g);
      meanG.appendChild(paint(svgEl('line', { x1: ax(m.cols[k]), y1: y - 16, x2: ax(m.cols[k]), y2: y + 16, 'stroke-width': 3 }), null, C_ACCENT));
      meanG.appendChild(svgText(350, y + 22, '均值 ' + fmt(m.cols[k], 2), 'demo-x-acc demo-x-mono', 11));
      return { g: g, pts: pts, mean: meanG, at: 6.6 + k * 0.8 };
    });
    var tot = svgText(605, 290, '24 格总平均 ' + fmt(m.all, 2) + ' cm', 'demo-x-acc', 14, 'middle');
    s.appendChild(tot);
    var tetra = group(s);
    tetra.appendChild(svgRich(ax(3.2), 246, '四面体 · 遮挡：$3.2 \\pm 5.8$', { size: 10.5, anchor: 'end', w: 200, cls: 'demo-x-bad' }));
    var right2 = group(s);
    chip(right2, 350, 318, 430, '标准差比均值还大：偶尔会错得很远', C_BAD, { size: 11, dash: '4 3' });

    function draw(t) {
      tiles.forEach(function (g, i) {
        setOpacity(g, seg(t, 0.3 + i * 0.5, 0.8 + i * 0.5));
      });
      setOpacity(info, seg(t, 1.8, 2.4));
      setOpacity(env, seg(t, 4.4, 5.0));
      setOpacity(axisG, seg(t, 6.2, 6.7));
      rowsR.forEach(function (r) {
        setOpacity(r.g, seg(t, r.at, r.at + 0.4));
        setOpacity(r.mean, seg(t, r.at + 0.5, r.at + 0.9));
      });
      setOpacity(lim, seg(t, 9.0, 9.5));
      setOpacity(tot, seg(t, 9.4, 9.9));
      setOpacity(tetra, seg(t, 10.4, 10.9));
      setOpacity(right2, seg(t, 11.0, 11.5));
      setOpacity(ov, seg(t, 12.4, 12.9));
      var u1 = ease(seg(t, 12.8, 13.6)),
        u2 = ease(seg(t, 13.2, 14.0));
      setW(simBar, 0.5 * OU * u1);
      simVal.setAttribute('x', (OX + 0.5 * OU * u1 + 6).toFixed(1));
      simVal.textContent = u1 > 0.98 ? '0.3–0.5 cm' : '';
      setW(realBar, m.all * OU * u2);
      realVal.setAttribute('x', (OX + m.all * OU * u2 + 6).toFixed(1));
      realVal.textContent = u2 > 0.98 ? '≈ ' + fmt(m.all, 2) + ' cm' : '';
      setOpacity(ovNote, seg(t, 14.2, 14.8));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 6: 要多少张图、多少种纹理（图 4 / 图 5） ── */
  function curve(parent, pts, color, width) {
    var p = paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': width || 2.4, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }), null, color);
    parent.appendChild(p);
    return p;
  }

  function buildSceneCount() {
    var s = sceneSvg('图 4 训练图张数：预训练 1000 张约 3.8 厘米、5000 张约 2.1 厘米；从零训练 1000 张约 13.9 厘米、5000 张约 2.6 厘米后与预训练重合；图 5 一万张图只改纹理种数：10 种约 14.7、100 种约 12.5、1000 种约 5.5、1 万种约 1.9 厘米');
    s.appendChild(svgText(30, 30, '多样性要够多：训练图的张数，和见过的纹理种数', 'demo-x-ink2', 13.5));

    // 左：图 4
    var L = { x0: 70, x1: 370, y0: 300, y1: 76 };
    var lx = function (n) {
      return L.x0 + (Math.log(n) / Math.log(100)) * (L.x1 - L.x0);
    };
    var ly = function (v) {
      return L.y0 - (v / 16) * (L.y0 - L.y1);
    };
    var axL = group(s);
    axL.appendChild(svgText(30, 56, '图 4：训练图张数 → 真机误差 cm（读图近似值）', null, 11.5));
    [0, 4, 8, 12, 16].forEach(function (v) {
      axL.appendChild(paint(svgEl('line', { x1: L.x0, y1: ly(v), x2: L.x1, y2: ly(v), 'stroke-width': 0.7 }), null, C_BORDER));
      axL.appendChild(svgText(L.x0 - 6, ly(v) + 4, String(v), 'demo-x-mut demo-x-mono', 10, 'end'));
    });
    FIG4_N.forEach(function (n0) {
      axL.appendChild(svgText(lx(n0), L.y0 + 16, n0 + 'k', 'demo-x-mut demo-x-mono', 9.5, 'middle'));
    });
    axL.appendChild(svgText(L.x1, L.y0 + 32, '张数（对数轴）', 'demo-x-mut', 10, 'end'));
    var lgL = group(s);
    lgL.appendChild(svgText(250, 100, '— 从零训练', 'demo-x-bad', 11));
    lgL.appendChild(svgText(250, 118, '— ImageNet 预训练', 'demo-x-acc', 11));
    function ptsOf(ys) {
      return FIG4_N.map(function (n0, i) {
        return [lx(n0).toFixed(1), ly(ys[i]).toFixed(1)];
      });
    }
    var preC = curve(s, ptsOf(FIG4_PRE), C_ACCENT);
    var scrC = curve(s, ptsOf(FIG4_SCRATCH), C_BAD);
    function label(x, y, str, cls, anchor) {
      var tt = svgText(x, y, str, cls + ' demo-x-mono', 10.5, anchor || 'middle');
      s.appendChild(tt);
      return tt;
    }
    var preLabs = [label(lx(1), ly(3.8) + 18, '3.8', 'demo-x-acc'), label(lx(5), ly(2.1) + 18, '2.1', 'demo-x-acc')];
    var scrLabs = [label(lx(1) + 6, ly(13.9) - 2, '13.9', 'demo-x-bad', 'start'), label(lx(2) + 6, ly(11.2) - 2, '11.2', 'demo-x-bad', 'start'), label(lx(5) + 4, ly(2.6) - 8, '2.6', 'demo-x-bad', 'start')];

    // 右：图 5
    var Rr = { x0: 470, x1: 770, y0: 300, y1: 76 };
    var rx = function (n) {
      return Rr.x0 + ((Math.log10(n) - 1) / 3) * (Rr.x1 - Rr.x0);
    };
    var ry = function (v) {
      return Rr.y0 - (v / 20) * (Rr.y0 - Rr.y1);
    };
    var axR = group(s);
    axR.appendChild(svgText(430, 56, '图 5：1 万张图只改纹理种数 → 误差 cm（读图）', null, 11.5));
    var shade = paint(svgEl('rect', { x: Rr.x0, y: Rr.y1, width: rx(1000) - Rr.x0, height: Rr.y0 - Rr.y1, opacity: 0.08 }), C_BAD);
    axR.appendChild(shade);
    [0, 5, 10, 15, 20].forEach(function (v) {
      axR.appendChild(paint(svgEl('line', { x1: Rr.x0, y1: ry(v), x2: Rr.x1, y2: ry(v), 'stroke-width': 0.7 }), null, C_BORDER));
      axR.appendChild(svgText(Rr.x0 - 6, ry(v) + 4, String(v), 'demo-x-mut demo-x-mono', 10, 'end'));
    });
    [[10, '10'], [100, '100'], [1000, '1000'], [10000, '1万']].forEach(function (p) {
      axR.appendChild(svgText(rx(p[0]), Rr.y0 + 16, p[1], 'demo-x-mut demo-x-mono', 10, 'middle'));
    });
    axR.appendChild(svgText(Rr.x1, Rr.y0 + 32, '纹理种数（对数轴）', 'demo-x-mut', 10, 'end'));
    var shadeLab = svgText((Rr.x0 + rx(1000)) / 2, Rr.y1 + 16, '< 1000 种：明显变差', 'demo-x-bad', 10.5, 'middle');
    s.appendChild(shadeLab);
    var texC = curve(
      s,
      FIG5_TEX.map(function (n0, i) {
        return [rx(n0).toFixed(1), ry(FIG5_ERR[i]).toFixed(1)];
      }),
      C_GOOD
    );
    var texLabs = FIG5_TEX.map(function (n0, i) {
      return label(rx(n0) + (i === 3 ? -4 : 0), ry(FIG5_ERR[i]) - 10, fmt(FIG5_ERR[i], 1), 'demo-x-good', i === 3 ? 'end' : 'middle');
    });

    var foot1 = group(s);
    chip(foot1, 30, 338, 740, '用 1000 种纹理时，1 万张图 ≈ 只用 1000 张图 → 数据少时，**纹理随机化比位置随机化更重要**', C_ACCENT, { size: 11.5 });
    var foot2 = group(s);
    chip(foot2, 30, 376, 740, '多样性靠数量堆：渲染一张随机纹理的图几乎不花钱', C_MUTED, { size: 11.5 });

    function draw(t) {
      setOpacity(axL, seg(t, 0.2, 0.7));
      setOpacity(lgL, seg(t, 0.4, 0.9));
      preC.setAttribute('stroke-dashoffset', (1 - ease(seg(t, 0.6, 2.8))).toFixed(3));
      setOpacity(preLabs[0], seg(t, 1.2, 1.6));
      setOpacity(preLabs[1], seg(t, 2.0, 2.4));
      scrC.setAttribute('stroke-dashoffset', (1 - ease(seg(t, 4.2, 6.4))).toFixed(3));
      scrLabs.forEach(function (lb, i) {
        setOpacity(lb, seg(t, 4.6 + i * 0.6, 5.0 + i * 0.6));
      });
      setOpacity(axR, seg(t, 7.8, 8.3));
      texC.setAttribute('stroke-dashoffset', (1 - ease(seg(t, 8.2, 10.4))).toFixed(3));
      texLabs.forEach(function (lb, i) {
        setOpacity(lb, seg(t, 8.5 + i * 0.6, 8.9 + i * 0.6));
      });
      setOpacity(shade, 0.08 * seg(t, 10.6, 11.1));
      setOpacity(shadeLab, seg(t, 10.6, 11.1));
      setOpacity(foot1, seg(t, 12.0, 12.6));
      setOpacity(foot2, seg(t, 14.6, 15.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 7: 表 2，逐项拿掉 ── */
  function buildSceneAblation() {
    var s = sceneSvg('表 2 每次去掉一项各训 2 万张图：完整方法 1.3、1.8、2.4 厘米；去掉噪声 1.4、1.9、2.4；去掉相机随机化 2.0、2.4、2.9；训练时去掉干扰物 1.5、7.2、7.4，有干扰物时是完整方法的 4.0 倍');
    s.appendChild(svgText(30, 30, '表 2：每次拿掉一项，在三类真实照片上比平均误差（各训 2 万张图）', 'demo-x-ink2', 13.5));
    var leg = group(s);
    CONDS.forEach(function (name, k) {
      leg.appendChild(paint(svgEl('rect', { x: 200 + k * 100, y: 46, width: 12, height: 12, rx: 2 }), COND_COLORS[k]));
      leg.appendChild(svgText(218 + k * 100, 57, name, 'demo-x-mut', 11));
    });
    var BX = 190,
      BU = 50;
    var rowsA = TABLE2.map(function (row, i) {
      var y0 = 74 + i * 64;
      var g = group(s);
      g.appendChild(svgText(30, y0 + 28, row.name, i === 3 ? 'demo-x-bad' : null, 12));
      var bars = row.v.map(function (v, k) {
        var y = y0 + k * 17;
        var b = hbar(g, BX, y, 0, 13, COND_COLORS[k], 0.9);
        var val = svgText(BX + 6, y + 11, '', 'demo-x-mono', 10.5);
        g.appendChild(val);
        return { b: b, val: val, v: v };
      });
      return { g: g, bars: bars, at: [0.3, 3.8, 6.8, 9.6][i] };
    });
    var hi = group(s);
    rectBox(hi, BX - 6, 74 + 3 * 64 + 15, 7.4 * BU + 50, 34, C_BAD, 'none', '4 3');

    var ratio = group(s);
    rectBox(ratio, 610, 74, 170, 190, C_BORDER, C_SURFACE2);
    ratio.appendChild(svgText(624, 96, '和完整方法比', 'demo-x-ink2', 11.5));
    var rLines = [
      ['噪声：最多差 $0.1$ cm', 'demo-x-mut', 3.8],
      ['相机：$2.0 / 1.3 \\approx 1.5\\times$', 'demo-x-ink2', 6.8],
      ['干扰物：$7.2 / 1.8 = 4.0\\times$', 'demo-x-bad', 9.8],
      ['遮挡：$7.4 / 2.4 \\approx 3.1\\times$', 'demo-x-bad', 10.4]
    ].map(function (r, i) {
      var tt = svgRich(624, 124 + i * 34, r[0], { size: 11.5, w: 150, cls: r[1] });
      ratio.appendChild(tt);
      return { el: tt, at: r[2] };
    });

    var why = group(s);
    chip(why, 30, 344, 750, '可以这样理解：训练时桌上只有一个物体，网络就不必学「哪个才是目标」—— 随机化把这类**捷径**提前堵死', C_WARN, { h: 34, size: 11.5 });

    function draw(t) {
      setOpacity(leg, seg(t, 0.2, 0.6));
      rowsA.forEach(function (r) {
        setOpacity(r.g, seg(t, r.at, r.at + 0.3));
        r.bars.forEach(function (b, k) {
          var u = ease(seg(t, r.at + 0.1 + k * 0.2, r.at + 0.9 + k * 0.2));
          setW(b.b, b.v * BU * u);
          b.val.setAttribute('x', (BX + b.v * BU * u + 6).toFixed(1));
          b.val.textContent = u > 0 ? fmt(b.v * u, 1) : '';
        });
      });
      setOpacity(hi, seg(t, 10.6, 11.0));
      setOpacity(ratio, seg(t, 3.8, 4.2));
      rLines.forEach(function (r) {
        setOpacity(r.el, seg(t, r.at, r.at + 0.5));
      });
      setOpacity(why, seg(t, 13.0, 13.6));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 8: 真机抓取、局限与之后 ── */
  var PIPE = [
    ['相机照片', '单目 RGB'],
    ['检测器', '只在仿真里训练'],
    ['$(x, y, z)$', '目标位置'],
    ['现成运动规划', '规划一串简单动作'],
    ['预设抓取', 'Fetch 机器人']
  ];
  var PHYS = ['摩擦 0.1–2', '连杆质量 ×0.9–1.1', '质心偏移 ±0.1 m', '推搡 ±0.5 m/s'];

  function buildSceneGrasp() {
    var s = sceneSvg('Fetch 机器人：检测器估出目标位置交给现成运动规划执行预设抓取；两个检测器各 20 个越来越乱的场景，40 次成功 38 次；Spam 罐头配没见过的食品干扰物 10 次成功 9 次；只认形状不认颜色；局限是只做定位加简单抓取；之后同一思路扩展到物理参数，比如 SMP 的 G1 随机了摩擦、连杆质量、质心与推搡');
    s.appendChild(svgText(34, 30, '真机抓取：40 次成功 38 次，只认形状、不认颜色', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'dr-x-arrow-s8', C_MUTED);
    var BW = 132,
      GAP = 18,
      BX0 = 34,
      BY = 44,
      BH = 50;
    var boxes = PIPE.map(function (p, i) {
      var x = BX0 + i * (BW + GAP);
      var g = group(s);
      rectBox(g, x, BY, BW, BH, i === 1 ? C_ACCENT : C_BORDER);
      g.appendChild(svgRich(x + BW / 2, BY + 21, p[0], { size: 12, anchor: 'middle', w: BW - 6 }));
      g.appendChild(svgText(x + BW / 2, BY + 40, p[1], 'demo-x-mut', 9.5, 'middle'));
      if (i < PIPE.length - 1) arrowPath(g, [[x + BW, BY + BH / 2], [x + BW + GAP - 2, BY + BH / 2]], C_MUTED, mk);
      return g;
    });
    var BOX_AT = [0.3, 0.65, 1.0, 1.35, 1.7];
    var token = paint(svgEl('circle', { cx: BX0 + BW / 2, cy: BY + BH / 2, r: 5, opacity: 0 }), C_ACCENT);
    s.appendChild(token);

    var gr = group(s);
    gr.appendChild(svgText(34, 122, '两个最稳的检测器 × 20 个越来越乱的场景', 'demo-x-ink2', 11.5));
    var sq = [];
    for (var i = 0; i < GRASP_OK; i++) {
      var r = paint(svgEl('rect', { x: 34 + (i % 19) * 17, y: 132 + Math.floor(i / 19) * 17, width: 14, height: 14, rx: 2.5 }), C_GOOD);
      r.style.opacity = 0;
      gr.appendChild(r);
      sq.push(r);
    }
    var fail = group(gr);
    for (var j = 0; j < GRASP_N - GRASP_OK; j++) fail.appendChild(paint(svgEl('rect', { x: 34 + (19 + 0.6 + j) * 17, y: 132 + 8, width: 14, height: 14, rx: 2.5 }), C_BAD));
    var count = svgText(34, 192, GRASP_OK + ' / ' + GRASP_N + ' = ' + fmt((GRASP_OK / GRASP_N) * 100, 0) + '%', 'demo-x-good', 16);
    gr.appendChild(count);
    gr.appendChild(svgText(170, 192, '含目标被严重遮挡、干扰物侧躺的场景', 'demo-x-mut', 10.5));

    var spam = group(s);
    spam.appendChild(svgText(34, 226, '换成 YCB 物体集里的 Spam 罐头，桌上放没见过的食品', 'demo-x-ink2', 11.5));
    for (var q = 0; q < SPAM_N; q++) spam.appendChild(paint(svgEl('rect', { x: 34 + q * 17 + (q >= SPAM_OK ? 8 : 0), y: 236, width: 14, height: 14, rx: 2.5 }), q < SPAM_OK ? C_GOOD : C_BAD));
    spam.appendChild(svgText(220, 248, SPAM_OK + ' / ' + SPAM_N, 'demo-x-good demo-x-mono', 13));

    var right = group(s);
    chip(right, 420, 112, 356, '检测器不知道目标颜色，只认**形状和大小**', C_ACCENT);
    chip(right, 420, 150, 356, '和同色物体挨在一起也分得开', C_ACCENT);
    var first = group(s);
    chip(first, 420, 192, 356, '论文自述：第一个只用仿真 RGB 图训练的深度网络', C_GOOD, { size: 10.5 });
    first.appendChild(svgText(598, 240, '（不在真实图上预训练）迁移到真机控制', 'demo-x-mut', 10.5, 'middle'));
    var lim = group(s);
    chip(lim, 420, 252, 356, '局限：只做定位 + 预设抓取；接触更多、更精细的留给以后', C_BAD, { dash: '4 3', size: 10.5 });

    var after = group(s);
    after.appendChild(svgText(34, 300, '之后：同一思路扩展到物理参数 —— SMP 的 G1 真机（SMP 论文表 9）', 'demo-x-ink2', 11.5));
    var phys = PHYS.map(function (str, k) {
      var g = group(after);
      chip(g, 34 + k * 186, 310, 176, str, C_ACCENT, { size: 11 });
      return g;
    });
    var foot = svgRich(400, 380, '**一句话：不追求仿真更真，而是让它更多样**', { size: 14, anchor: 'middle', w: 760, cls: 'demo-x-acc' });
    s.appendChild(foot);

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      boxes.forEach(function (b, k) {
        setOpacity(b, seg(t, BOX_AT[k], BOX_AT[k] + 0.4));
      });
      var reach = 0;
      for (var k = 1; k < BOX_AT.length; k++) reach += seg(t, BOX_AT[k], BOX_AT[k] + 0.4);
      if (t < 3.8 && reach > 0) {
        var u = ((((now - 0.6) / 2.2) % 1) + 1) % 1;
        token.setAttribute('cx', (BX0 + BW / 2 + u * reach * (BW + GAP)).toFixed(1));
        setOpacity(token, Math.min(1, u / 0.08, (1 - u) / 0.08) * Math.min(1, reach));
      } else {
        setOpacity(token, 0);
      }
      setOpacity(gr, seg(t, 3.8, 4.1));
      sq.forEach(function (r, k) {
        setOpacity(r, seg(t, 4.0 + k * 0.06, 4.2 + k * 0.06));
      });
      setOpacity(fail, seg(t, 6.4, 6.8));
      setOpacity(count, seg(t, 6.6, 7.0));
      setOpacity(right, seg(t, 7.6, 8.2));
      setOpacity(spam, seg(t, 9.0, 9.6));
      setOpacity(first, seg(t, 11.0, 11.6));
      setOpacity(lim, seg(t, 12.4, 13.0));
      setOpacity(after, seg(t, 13.8, 14.2));
      phys.forEach(function (g, k) {
        setOpacity(g, seg(t, 14.0 + k * 0.3, 14.4 + k * 0.3));
      });
      setOpacity(foot, seg(t, 15.6, 16.2));
    }

    return { el: s, draw: draw };
  }

  var DR_SCENES = [
    {
      title: '现实鸿沟与第三条路',
      dur: 16,
      build: buildSceneGap,
      cues: [
        { at: 0.3, s: '在仿真里训练，数据不花钱、标签白给；深度强化学习动辄要几十万到上百万个样本，真机上采集要几千小时，还有探索时的危险（论文引言）。' },
        { at: 3.6, s: '可仿真和真实之间有**现实鸿沟**（reality gap）：物理上有非刚性、齿轮间隙、磨损、流体；图像上，渲染器画不出真实相机的丰富纹理与噪声。' },
        { at: 7.4, s: '两条老路：**系统辨识**（改仿真参数去对齐真机）加照片级渲染，费时、易出错；**域适应**（domain adaptation）拿真实数据把模型适配过去，要采真实数据、标签或奖励。' },
        { at: 10.6, s: '第三条路是**域随机化**（domain randomization）：不追求像，而是在每张训练图里随机化渲染。论文要检验的假设：仿真里的变化足够大，真实世界对模型来说就只是**又一个变体**。' },
        { at: 13.6, s: '这篇只做画面这一半：用一张单目 RGB 图定位桌上的物体 —— 论文称之为通往通用操作技能的垫脚石。' }
      ]
    },
    {
      title: '每张训练图都随机：七样东西',
      dur: 17,
      build: buildSceneList,
      cues: [
        { at: 0.3, s: '每生成一张训练图，下面七样都重新随机：干扰物的数量与形状、所有物体的位置与纹理、桌子 / 地板 / 天空盒 / 机器人的纹理、相机的位置朝向与视场角、灯的数量、灯的位置朝向与高光、噪声的类型与大小。' },
        { at: 4.6, s: '纹理只有三种生成方式：**一个随机 RGB 颜色**、两个随机颜色之间的**渐变**、两个随机颜色的**棋盘格**。画面一点也不真实，也不需要合乎物理。' },
        { at: 7.8, s: '目标物体的颜色同样随机，检测器在训练时只知道它的**形状和大小**；桌上放 0–10 个干扰物，也取自同一套几何体。地上和背景不放干扰物，尽管真实照片的地上有电线。' },
        { at: 11.0, s: '渲染用 **MuJoCo**（一款物理仿真引擎）自带的渲染器，它本来就不追求照片级真实。论文说，正是因为纹理随机生成，才能训练几十万张各不相同的场景。' },
        { at: 13.4, s: '测试时，同一个检测器直接看真实网络摄像头的照片，**不再做任何训练**。' }
      ]
    },
    {
      title: '相机不标定，在小盒子里随机',
      dur: 16,
      build: buildSceneCamera,
      cues: [
        { at: 0.3, s: '真机上的相机**不标定**，也不精确摆放。仿真里先手动放一台相机，大致对上真实相机的视角和视场角。' },
        { at: 3.4, s: '每张训练图，相机位置在这一点周围 **10 × 5 × 10 cm** 的盒子里随机；朝向先解析地对准桌上一个固定点，再在每个方向偏最多 **0.1 弧度**；视场角缩放最多 **5%**。' },
        { at: 7.6, s: '粗算：物体离相机 0.7–1.05 m，视线偏 0.1 rad，在物体处就横向挪 $\\Delta \\approx d\\,\\theta$ = **7–10.5 cm**，是目标精度 1.5 cm 的好几倍；视场角缩放 5%，图像边缘的物体挪约 5.6 像素。推测：网络因此没法死记「物体在第几个像素」。' },
        { at: 11.4, s: '只有一台未标定的单目相机，深度说不准，所以仿真里**桌子高度固定**：物体中心的高度已知，问题实际变成桌面上的二维定位。' },
        { at: 13.8, s: '消融（表 2）：去掉相机随机化，单独放时误差 **1.3 → 2.0 cm**，有干扰物、有遮挡时也都稍大 —— 稳定地有帮助，但不是决定性的。' }
      ]
    },
    {
      title: '检测器：VGG-16 回归三维坐标',
      dur: 16,
      build: buildSceneNet,
      cues: [
        { at: 0.3, s: '检测器是改过的 **VGG-16**（一个 16 层的经典卷积网络）：图像缩到 224 × 224，过标准的 VGG 卷积层，接 256、64 两层小全连接，不用 dropout，直接输出物体中心的 $(x, y, z)$。' },
        { at: 4.4, s: '标签是物体质心在世界坐标里的位置，仿真里白给；损失就是预测与真值之差的平方 $\\mathcal{L} = \\lVert \\hat{\\mathbf{p}} - \\mathbf{p} \\rVert^2$（L2 损失）。8 个几何体，每个单独训一个检测器。' },
        { at: 7.6, s: '优化用 **Adam**，学习率约 $10^{-4}$，而不是 Adam 常用的 $10^{-3}$：论文发现后者容易掉进一个局部最优 —— 把所有物体都预测到**桌子中央**。超参只小搜一下：学习率 1e-4 / 2e-4 × batch 25 / 50 / 100。' },
        { at: 10.8, s: '作者原以为必须用 **ImageNet**（一个大型真实图片数据集）预训练的卷积层才能迁移，结果不是：数据够多时随机初始化一样好，各物体最好的检测器还常常是从零训的；数据少时预训练明显更好。' }
      ]
    },
    {
      title: '真机：平均 1.5 cm 以内',
      dur: 16,
      build: buildSceneReal,
      cues: [
        { at: 0.3, s: '测试集：**480** 张网络摄像头照片，物体离相机 70–105 cm；8 个几何体各 60 张 —— 20 张单独放、20 张有干扰物、20 张被部分遮挡。真值靠把物体对准桌面上的网格摆放得到。' },
        { at: 4.4, s: '光照和周围环境都不控制：每张图里都有一部分机器人，地上还有胶带和电线；拍摄时相机位置保持不变。' },
        { at: 6.6, s: '表 1 的 8 个物体按三种情况平均：单独放 **1.04 cm**、有干扰物 **1.24 cm**、被遮挡 **1.60 cm**，24 格总平均 **1.29 cm** —— 论文写的是平均 1.5 cm 以内。' },
        { at: 10.4, s: '最差的一格是被遮挡的四面体：$3.2 \\pm 5.8$ cm，标准差比均值还大，说明偶尔会错得很远。' },
        { at: 12.4, s: '它仍在**过拟合**仿真：仿真里的误差只有 0.3–0.5 cm。即便如此，精度已与当时用更高分辨率图像、单张单目图做位姿估计的传统方法相当。' }
      ]
    },
    {
      title: '多少才够：张数与纹理种数',
      dur: 17,
      build: buildSceneCount,
      cues: [
        { at: 0.3, s: '图 4：训练图张数（读图近似值）。ImageNet 预训练的检测器，1000 张图误差约 **3.8 cm**，5000 张约 **2.1 cm**，一直到 5 万张左右还在变好。' },
        { at: 4.2, s: '从零训练的：1000 张约 **13.9 cm**、2000 张约 11.2 cm，到 5000 张猛跌到约 2.6 cm，之后和预训练的贴在一起 —— 数据够多时预训练不是必需的。' },
        { at: 8.0, s: '图 5：固定 1 万张图，只改见过多少种纹理与光照组合：10 种约 **14.7 cm**、100 种约 12.5、1000 种约 5.5、1 万种约 **1.9 cm**；少于 1000 种时明显变差。' },
        { at: 12.0, s: '还有一个对照：用 1000 种纹理时，1 万张图的效果和只用 1000 张图相当 —— 数据少时，**纹理随机化比物体位置随机化更重要**。' },
        { at: 14.6, s: '多样性靠数量堆，而渲染一张随机纹理的图几乎不花钱：这正是这条路便宜的地方。' }
      ]
    },
    {
      title: '逐项拿掉：干扰物最关键',
      dur: 16,
      build: buildSceneAblation,
      cues: [
        { at: 0.3, s: '表 2：每次去掉一项，各用 2 万张图训练，在三类真实照片上比平均误差。完整方法：单独放 **1.3**、有干扰物 **1.8**、被遮挡 **2.4** cm。' },
        { at: 3.8, s: '去掉噪声：1.4 / 1.9 / 2.4，最多差 0.1。不过作者说，训练时加一点噪声能让收敛更好、更不容易陷进局部最优。' },
        { at: 6.8, s: '去掉相机随机化：2.0 / 2.4 / 2.9，三类都稍大，单独放时是完整方法的约 1.5 倍 —— 稳定地有帮助，但没有它也能达到相当高的精度。' },
        { at: 9.6, s: '去掉训练时的干扰物：单独放 1.5，几乎不受影响；可一旦真实桌上有别的物体，误差跳到 **7.2 cm**，遮挡时 **7.4 cm** —— 是完整方法的 **4.0 倍**和 **3.1 倍**。' },
        { at: 13.0, s: '可以这样理解（我们的解读）：训练时桌上只有一个物体，网络就不必学「哪一个才是目标」；随机化的意义之一，就是把这类捷径提前堵死。' }
      ]
    },
    {
      title: '真机抓取、局限与之后',
      dur: 17,
      build: buildSceneGrasp,
      cues: [
        { at: 0.3, s: '最后上真机：**Fetch** 移动操作机器人。检测器从相机照片里估出目标位置，交给现成的运动规划软件，执行一套预先规定的抓取动作。' },
        { at: 3.8, s: '选两个最稳定的检测器，各在 **20 个越来越乱**的场景里抓：40 次成功 **38** 次，包括目标被严重遮挡的场景；有些干扰物的摆法训练时没见过，比如侧躺的六棱柱。' },
        { at: 7.6, s: '检测器不知道目标的颜色，只认形状和大小，所以和同色物体挨在一起也分得开。换成 **YCB**（一个常用的物体数据集）里的一罐 Spam 午餐肉，桌上放没见过的其他食品：**10 次抓到 9 次**。' },
        { at: 11.0, s: '论文自述：这是第一次只用仿真 RGB 图训练、不在真实图像上预训练的深度网络，迁移到真实世界做机器人控制。局限也写明了：只做到定位加简单抓取，接触更多、精度更高的任务留给以后。' },
        { at: 13.8, s: '后来同一思路从画面扩展到物理参数：SMP 的 G1 真机实验就随机了摩擦（0.1–2）、连杆质量（×0.9–1.1）、质心偏移与推搡（SMP 论文表 9）。一句话：**不追求仿真更真，而是让它更多样**。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '八幕动画：域随机化全流程速览',
      sub: '约 131 秒自动播放。空格播放/暂停，← → 换幕；第 3、5–7 幕的数字与下面的演示、笔记「具体实例」用的是同一份表。',
      ariaLabel: '域随机化八幕讲解动画',
      notes: [
        '取数依据：第 2–4 幕的七项清单、三种纹理、0–10 个干扰物、10 × 5 × 10 cm / 0.1 rad / 5%、VGG-16 + 256 / 64、学习率 1e-4、8 个物体摘自论文第 III 节与 IV-A 节；' +
          '第 5 幕的 480 张 / 70–105 cm / 0.3–0.5 cm 摘自 IV-B 节，1.04 / 1.24 / 1.60 / 1.29 是表 1 的 24 格现算的平均；第 7 幕照抄表 2；第 8 幕的 38 / 40、9 / 10 摘自 IV-D 节，SMP 的物理随机化范围摘自 SMP 论文表 9。',
        '**第 6 幕是读图近似值**：论文图 4、图 5 没有给数值表，13.9 / 11.2 / 3.8 / 2.1 与 14.7 / 12.5 / 5.5 / 1.9 是从图上读出来的（读到 0.1 cm）。' +
          '第 3 幕的 7–10.5 cm 与 5.6 像素是小角度粗算，「网络没法死记像素位置」是推测；第 7 幕「捷径」是我们的解读，论文只说加入干扰物对抗干扰是关键。画面里的渲染图都是示意，不是论文的 MuJoCo 渲染。'
      ],
      scenes: DR_SCENES
    });
  }

  // ─── the narrated vertical video of the same eight scenes ─────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：域随机化八幕全流程',
      sub: '8 分 18 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的八幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '9.9 MB',
      fileName: '域随机化_讲解视频.mp4'
    });
  }

  K.mount({
    'dr-explainer': buildExplainerDemo,
    'dr-video': buildVideoDemo,
    'dr-scene': buildSceneDemo,
    'dr-coverage': buildCoverageDemo,
    'dr-ablation': buildAblationDemo
  });
})();
