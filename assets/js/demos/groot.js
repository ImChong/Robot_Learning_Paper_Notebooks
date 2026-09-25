/* Interactive GR00T N1 demos for
 * papers/03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["groot"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   groot-timing / groot-flow / groot-results — 可操作的时间、流匹配与加权实验图
 *   groot-explainer — 七幕讲解动画：没有人形数据的互联网 → 10 Hz 的视觉语言与
 *                     63.9 ms 的动作块 → 流匹配路径与 K=4 欧拉 → 数据金字塔 →
 *                     潜动作 / IDM 补标签 → 一套权重、按本体的 MLP → 表上的数字与边界
 *
 * 流匹配的速度目标与开源实现对齐，不跟 ar5iv 上 Eq.(1) 印出来的相反符号：
 *   noisy = (1 - t) * noise + t * actions
 *   velocity = actions - noise
 */

(function () {
  'use strict';

  var K = window.PaperDemoKit;
  var fmt = K.fmt,
    svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    paint = K.paint,
    seg = K.seg,
    ease = K.ease,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg;

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_MUTED = X.muted,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2;

  // ─── 画面上的数字从这里现算，不手写 ───────────────────────────────────
  /* 论文 §2：System 2 在 L40 上 10 Hz；System 1 的动作率写成 120 Hz；
     一块 16 步动作的采样耗时 63.9 ms（L40，bf16）。120 Hz 是播动作的节拍，
     不是 DiT 每 8.3 ms 做一次完整前向。 */
  var SYS2_HZ = 10,
    SYS1_HZ = 120,
    CHUNK = 16,
    INFER_MS = 63.9;
  var SYS2_MS = 1000 / SYS2_HZ; // 100 ms，10 Hz 的周期
  var ACTION_MS = 1000 / SYS1_HZ; // 8.33 ms，120 Hz 的动作间隔
  var CHUNK_MS = CHUNK * ACTION_MS; // 133.33 ms，16 步按 120 Hz 要播多久
  var INFER_FITS = INFER_MS < CHUNK_MS;

  var TOTAL_B = 2.2,
    VLM_B = 1.34;
  var HEAD_B = TOTAL_B - VLM_B; // 0.86，VLM 以外的 DiT 与投影
  var IMG = 224,
    IMG_TOKENS = 64,
    LLM_LAYER = 12,
    K_STEPS = 4;

  /* 数据金字塔上的原文数字。神经轨迹「约 10×」是 827/88 的口语，画面写比值。 */
  var TELEOP_H = 88,
    NEURAL_H = 827;
  var NEURAL_X = NEURAL_H / TELEOP_H; // 9.40
  var SIM_TRAJ = 780000,
    SIM_H = 6500,
    SIM_WALL_H = 11;
  var SIM_X = SIM_H / SIM_WALL_H; // 590.9，11 小时墙钟生成 6500 小时数据
  var PAIRS = 54,
    DEMOS_PER = 10000;
  var PRETRAIN_SIM = PAIRS * DEMOS_PER; // 540000，预训练仿真这一截
  var AGIBOT = 140000,
    GPU_H = 50000;

  /* 玩具标量，用来把欧拉积分走完。ε=-1、A=1 时 v=A-ε=2，四步正好落回 1。 */
  var TOY_EPS = -1,
    TOY_A = 1;
  var TOY_V = TOY_A - TOY_EPS; // 2，对应开源代码的 actions - noise
  var EULER = [TOY_EPS];
  for (var step = 0; step < K_STEPS; step++) EULER.push(EULER[step] + TOY_V / K_STEPS);

  /* Table 2（100 条演示）三列不是简单平均。Average 按任务数加权：
     RoboCasa 24 + DexMG 9 + GR-1 24 = 57。 */
  var SIM_N = [24, 9, 24];
  var DP_SIM = [25.6, 56.1, 32.7];
  var GR_SIM = [32.1, 66.5, 50.0];
  var PAPER_SIM_AVG = { dp: 33.4, gr: 45.0 };

  function wavg(rates, counts) {
    var s = 0, n = 0, i;
    for (i = 0; i < rates.length; i++) {
      s += rates[i] * counts[i];
      n += counts[i];
    }
    return s / n;
  }
  var SIM_TASKS = SIM_N[0] + SIM_N[1] + SIM_N[2]; // 57
  var GR_SIM_W = wavg(GR_SIM, SIM_N); // 45.07，表上印 45.0
  var DP_SIM_W = wavg(DP_SIM, SIM_N); // 33.41，表上印 33.4
  var GR1_GAP = GR_SIM[2] - DP_SIM[2]; // 17.3，论文说 GR-1 超过 17 个点

  /* Table 3 的总平均同样按任务数加权：取放 5 + 关节物体 3 + 工业 3 + 协作 2 = 13。
     下面的差值用论文印出来的平均，和正文那句 32.4 / 30.4 / 3.8 对齐。 */
  var REAL_N = [5, 3, 3, 2];
  var GR_FULL = [82.0, 70.9, 70.0, 82.5];
  var PAPER_REAL = { dp10: 10.2, dpFull: 46.4, gr10: 42.6, grFull: 76.8 };
  var REAL_TASKS = REAL_N[0] + REAL_N[1] + REAL_N[2] + REAL_N[3]; // 13
  var GR_FULL_W = wavg(GR_FULL, REAL_N); // 76.75，表上印 76.8
  var GAP_LOW = PAPER_REAL.gr10 - PAPER_REAL.dp10; // 32.4
  var GAP_FULL = PAPER_REAL.grFull - PAPER_REAL.dpFull; // 30.4
  var GAP_DATA = PAPER_REAL.dpFull - PAPER_REAL.gr10; // 3.8

  var PRE_HAND_OK = 11.5,
    PRE_TRIALS = 15,
    PRE_NOVEL_OK = 11;
  var PRE_HAND = 76.6,
    PRE_NOVEL = 73.3; // 论文印的成功率；11.5/15 与 11/15 是同一次评估的分子

  function panel(svg, x, y, w, h, fill, stroke, dash) {
    var node = paint(svgEl('rect', {
      x: x, y: y, width: w, height: h, rx: 8, 'stroke-width': 1.25
    }), fill, stroke);
    if (dash) node.setAttribute('stroke-dasharray', '5 4');
    svg.appendChild(node);
    return node;
  }

  function group() {
    return svgEl('g', {});
  }

  // ─── 第 1 幕：没有人形数据的互联网 ────────────────────────────────────
  var S1 = [
    { t: '① 单台人形的真机数据差几个数量级', d: '不存在一份「人形互联网」，单机数据撑不起通用模型' },
    { t: '② 把各家机器人拼在一起仍是孤岛', d: '本体、传感器、自由度、控制模式对不齐，Open X 也没拼成一张网' },
    { t: '③ 把 VLM 当黑盒规划器', d: '得先假定低层技能和接口都有了，推理和执行没有一起训练' }
  ];

  function buildSceneIslands() {
    var s = sceneSvg(
      'GR00T N1 面对的三个缺口：没有人形互联网、跨本体数据仍是孤岛、' +
        '把视觉语言模型当黑盒规划器就接不上执行'
    );
    s.appendChild(svgText(40, 32, '通用人形缺的不是一句口号，是数据和一条训得通的接口', 'demo-x-ink2', 13.5));

    var walls = S1.map(function (w, i) {
      var g = group();
      var y = 52 + i * 78;
      g.appendChild(panel(g, 36, y, 400, 68, C_SURFACE, C_BAD, true));
      g.appendChild(paint(svgText(52, y + 26, w.t, null, 13), C_BAD));
      g.appendChild(svgText(52, y + 48, w.d, 'demo-x-mut', 11));
      s.appendChild(g);
      return { g: g, at: [0.4, 2.2, 3.8][i] };
    });

    var claim = group();
    claim.appendChild(panel(claim, 456, 52, 308, 148, C_SURFACE2, C_ACCENT));
    claim.appendChild(paint(svgText(610, 82, '论文实际要做的', null, 13, 'middle'), C_ACCENT));
    claim.appendChild(svgText(476, 112, '一个 VLA，视觉语言和动作头', 'demo-x-ink2', 12));
    claim.appendChild(svgText(476, 134, '端到端一起训，而不是', 'demo-x-ink2', 12));
    claim.appendChild(svgText(476, 156, '「规划器 + 现成的低层控制器」。', 'demo-x-ink2', 12));
    claim.appendChild(svgText(476, 180, '评测落在短程桌面操作。', 'demo-x-mut', 12));
    s.appendChild(claim);

    var foot = group();
    foot.appendChild(panel(foot, 456, 214, 308, 72, C_SURFACE, C_WARN, true));
    foot.appendChild(paint(svgText(610, 244, '不是移动导航', null, 13, 'middle'), C_WARN));
    foot.appendChild(svgText(610, 266, '局限写明了：还做不了长程 loco-manipulation', 'demo-x-mut', 11, 'middle'));
    s.appendChild(foot);

    var band = group();
    band.appendChild(paint(svgText(400, 330, '所以后面每一幕都在补这两件事', null, 15, 'middle'), C_ACCENT));
    band.appendChild(svgText(400, 356, '异构数据怎么变成同一条监督，推理和关节动作怎么接到一个模型里', 'demo-x-mut', 12, 'middle'));
    s.appendChild(band);

    function draw(t) {
      walls.forEach(function (w) { setOpacity(w.g, seg(t, w.at, w.at + 0.45)); });
      setOpacity(claim, seg(t, 5.4, 6.1));
      setOpacity(foot, seg(t, 7.6, 8.3));
      setOpacity(band, seg(t, 9.8, 10.6));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 2 幕：10 Hz 与 63.9 ms ─────────────────────────────────────────
  function buildSceneClocks() {
    var s = sceneSvg(
      'System 2 是 Eagle-2 的第 12 层，L40 上 10 Hz；System 1 用 63.9 ms 采样 16 步动作，' +
        '120 Hz 是这 16 步的播放节拍'
    );
    s.appendChild(svgText(40, 30, '两个频率说的不是同一件事', 'demo-x-ink2', 13.5));

    var left = group();
    left.appendChild(panel(left, 36, 48, 352, 168, C_SURFACE2, C_ACCENT));
    left.appendChild(paint(svgText(52, 74, 'System 2 · Eagle-2', null, 14), C_ACCENT));
    left.appendChild(svgText(52, 100, IMG + '×' + IMG + '，pixel shuffle 后 ' + IMG_TOKENS + ' 个图像 token', 'demo-x-ink2', 12));
    left.appendChild(svgText(52, 122, '取 LLM 第 ' + LLM_LAYER + ' 层，不用最后一层', 'demo-x-ink2', 12));
    left.appendChild(svgText(52, 144, 'VLM ' + fmt(VLM_B, 2) + ' B / 全模型 ' + fmt(TOTAL_B, 1) + ' B', 'demo-x-ink2', 12));
    left.appendChild(svgText(52, 170, '论文给的运行频率：' + SYS2_HZ + ' Hz @ L40', 'demo-x-mut', 12));
    left.appendChild(svgText(52, 192, '周期 ' + fmt(SYS2_MS, 0) + ' ms', 'demo-x-mut', 12));
    s.appendChild(left);

    var right = group();
    right.appendChild(panel(right, 412, 48, 352, 168, C_SURFACE2, C_GOOD));
    right.appendChild(paint(svgText(428, 74, 'System 1 · DiT 动作头', null, 14), C_GOOD));
    right.appendChild(svgRich(428, 100, '交叉注意力读 VLM token，不是 $\\pi_0$ 那种 MoE', { size: 12, cls: 'demo-x-ink2' }));
    right.appendChild(svgText(428, 122, '一次采样 ' + CHUNK + ' 步，耗时 ' + INFER_MS + ' ms', 'demo-x-ink2', 12));
    right.appendChild(svgText(428, 144, '去噪 ' + K_STEPS + ' 步；DiT 侧约 ' + fmt(HEAD_B, 2) + ' B', 'demo-x-ink2', 12));
    right.appendChild(svgText(428, 170, '动作率 ' + SYS1_HZ + ' Hz → 一步 ' + fmt(ACTION_MS, 1) + ' ms', 'demo-x-mut', 12));
    right.appendChild(svgText(428, 192, CHUNK + ' 步要播 ' + fmt(CHUNK_MS, 0) + ' ms', 'demo-x-mut', 12));
    s.appendChild(right);

    /* 刻度、条形和播放头共用 xMs 这一个比例尺，条上的毫秒数才读得出来。 */
    var AX0 = 168, AX1 = 728, AX_MAX = 150;
    function xMs(ms) { return AX0 + (ms / AX_MAX) * (AX1 - AX0); }
    var timeline = group();
    var axisY = 248;
    timeline.appendChild(paint(svgEl('line', {
      x1: AX0, y1: axisY, x2: AX1, y2: axisY, 'stroke-width': 1.2
    }), null, C_BORDER));
    [0, 50, 100, 150].forEach(function (ms) {
      var x = xMs(ms);
      timeline.appendChild(paint(svgEl('line', {
        x1: x, y1: axisY - 4, x2: x, y2: axisY + 4, 'stroke-width': 1
      }), null, C_MUTED));
      timeline.appendChild(svgText(x, axisY + 16, String(ms), 'demo-x-mut', 10, 'middle'));
    });
    timeline.appendChild(svgText(40, axisY + 4, '时间 / ms', 'demo-x-mut', 10));

    var rowsSpec = [
      { y: 278, ms: INFER_MS, c: C_GOOD, t: '采样一块' },
      { y: 302, ms: CHUNK_MS, c: C_ACCENT, t: '16 步播放' },
      { y: 326, ms: SYS2_MS, c: C_WARN, t: 'VLM 周期' }
    ];
    var bars = rowsSpec.map(function (r) {
      var node = paint(svgEl('rect', { x: AX0, y: r.y, width: 1, height: 14, rx: 3 }), r.c, r.c);
      timeline.appendChild(node);
      timeline.appendChild(paint(svgText(40, r.y + 12, r.t, null, 11), r.c));
      var val = svgText(xMs(r.ms) + 6, r.y + 11, fmt(r.ms, r.ms % 1 ? 1 : 0) + ' ms', 'demo-x-ink2', 10);
      timeline.appendChild(val);
      return { node: node, ms: r.ms, val: val };
    });
    s.appendChild(timeline);

    var play = paint(svgEl('line', {
      x1: AX0, y1: 270, x2: AX0, y2: 348, 'stroke-width': 1.4
    }), null, C_BAD);
    s.appendChild(play);

    var verdict = group();
    verdict.appendChild(paint(svgText(400, 396, INFER_FITS
      ? '63.9 ms 算完的 16 步，按 120 Hz 要播 ' + fmt(CHUNK_MS, 0) + ' ms，算得比播得快'
      : '采样比播放慢', null, 14, 'middle'), C_ACCENT));
    s.appendChild(verdict);

    function draw(t) {
      setOpacity(left, seg(t, 0.4, 1.0));
      setOpacity(right, seg(t, 5.6, 6.2));
      setOpacity(timeline, seg(t, 7.2, 7.6));
      /* 播放头匀速扫过 0→150 ms，每根条只长到播放头为止。 */
      var now = seg(t, 7.6, 10.4) * AX_MAX;
      bars.forEach(function (b) {
        b.node.setAttribute('width', Math.max(1, xMs(Math.min(now, b.ms)) - AX0));
        setOpacity(b.val, now >= b.ms ? 1 : 0);
      });
      play.setAttribute('x1', xMs(now));
      play.setAttribute('x2', xMs(now));
      setOpacity(play, seg(t, 7.2, 7.6) * (1 - seg(t, 10.4, 10.8)));
      setOpacity(verdict, seg(t, 10.6, 11.4));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 3 幕：流匹配 ───────────────────────────────────────────────────
  function buildSceneFlow() {
    var s = sceneSvg(
      '动作块沿直线从噪声走到数据，网络预测的速度是动作减去噪声；' +
        '推理用 4 步欧拉，玩具标量从 -1 落到 1'
    );
    s.appendChild(svgText(40, 28, '流匹配：直线路径，网络学的是速度', 'demo-x-ink2', 13.5));
    s.appendChild(svgMath(40, 58, 'A^{\\tau}=(1-\\tau)\\epsilon+\\tau A', { size: 15, w: 280, h: 36 }));
    s.appendChild(svgMath(340, 58, 'v=A-\\epsilon', { size: 15, w: 140, h: 36 }));
    s.appendChild(svgMath(500, 58, 'A\\leftarrow A+\\tfrac{1}{K}v', { size: 15, w: 230, h: 36 }));

    var y = 168;
    s.appendChild(paint(svgEl('line', {
      x1: 70, y1: y, x2: 730, y2: y, 'stroke-width': 1.4
    }), null, C_BORDER));
    s.appendChild(svgRich(70, y + 28, '$\\tau = 0$　纯噪声', { size: 11 }).setTone(C_MUTED));
    s.appendChild(svgRich(730, y + 28, '$\\tau = 1$　数据', { size: 11, anchor: 'end' }).setTone(C_GOOD));

    var dot = paint(svgEl('circle', { r: 7 }), C_ACCENT, C_ACCENT);
    s.appendChild(dot);
    /* 数字逐帧在变：公式只画一次，数字交给 svgText */
    var tauLbl = svgMath(350, y - 18, '\\tau =', { size: 13, w: 40, anchor: 'end', cls: 'demo-x-ink2' });
    var tauTxt = svgText(354, y - 18, '', 'demo-x-ink2', 13);
    s.appendChild(tauLbl);
    s.appendChild(tauTxt);

    var steps = EULER.map(function (val, i) {
      var g = group();
      var x = 70 + (i / K_STEPS) * 660;
      g.appendChild(paint(svgEl('circle', { cx: x, cy: 250, r: 6 }), i === K_STEPS ? C_GOOD : C_ACCENT));
      g.appendChild(svgText(x, 274, fmt(val, 1), 'demo-x-ink2', 12, 'middle'));
      g.appendChild(svgRich(x, 292, i === 0 ? '$A_0$' : '第 ' + i + ' 步', { size: 10, cls: 'demo-x-mut', anchor: 'middle', w: 80 }));
      s.appendChild(g);
      return g;
    });

    var note = group();
    note.appendChild(panel(note, 36, 318, 728, 78, C_SURFACE, C_WARN, true));
    note.appendChild(paint(svgText(52, 344, '符号以开源代码为准：velocity = actions − noise', null, 13), C_WARN));
    note.appendChild(svgRich(52, 368, '玩具：$\\epsilon = ' + TOY_EPS + '$，$A = ' + TOY_A + '$，$v = ' + fmt(TOY_V, 0) +
      '$，$K = ' + K_STEPS + '$，四步落在 ' + fmt(EULER[K_STEPS], 0), { size: 12, cls: 'demo-x-ink2' }));
    note.appendChild(svgRich(52, 388, 'ar5iv 上 Eq.(1) 印成 $\\epsilon - A$，和插值、欧拉更新、仓库实现都相反', { size: 11, cls: 'demo-x-mut' }));
    s.appendChild(note);

    function draw(t) {
      var u = ease(seg(t, 1.2, 6.4));
      var x = 70 + u * 660;
      dot.setAttribute('cx', x.toFixed(1));
      dot.setAttribute('cy', y);
      var tau = u;
      var aval = (1 - tau) * TOY_EPS + tau * TOY_A;
      tauTxt.textContent = fmt(tau, 2) + '，当前值 ' + fmt(aval, 2);
      setOpacity(tauLbl, seg(t, 1.0, 1.5));
      setOpacity(tauTxt, seg(t, 1.0, 1.5));
      steps.forEach(function (g, i) {
        setOpacity(g, seg(t, 7.0 + i * 0.7, 7.4 + i * 0.7));
      });
      setOpacity(note, seg(t, 10.4, 11.2));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 4 幕：数据金字塔 ───────────────────────────────────────────────
  function buildScenePyramid() {
    var s = sceneSvg(
      '训练数据按数量和具身特异性分成三层：人类视频在底座，仿真和神经轨迹在中层，真机轨迹在顶层'
    );
    s.appendChild(svgText(40, 30, '越往上越少，也越像目标机器人', 'demo-x-ink2', 13.5));

    var layers = [
      {
        y: 48, w: 280, h: 70, c: C_GOOD,
        t: '顶层 · 真机',
        d: 'GR-1 · Open X · AgiBot ' + (AGIBOT / 1000) + 'k'
      },
      {
        y: 128, w: 460, h: 70, c: C_ACCENT,
        t: '中层 · 仿真 + 神经轨迹',
        d: (SIM_TRAJ / 10000) + ' 万条仿真，墙钟 ' + SIM_WALL_H + ' h'
      },
      {
        y: 208, w: 680, h: 70, c: C_WARN,
        t: '底座 · 人类视频 + 网络数据',
        d: 'Ego4D、EPIC-KITCHENS、Ego-Exo4D …'
      }
    ];
    var nodes = layers.map(function (L) {
      var g = group();
      var x = 400 - L.w / 2;
      g.appendChild(panel(g, x, L.y, L.w, L.h, C_SURFACE2, L.c));
      g.appendChild(paint(svgText(400, L.y + 28, L.t, null, 14, 'middle'), L.c));
      g.appendChild(svgText(400, L.y + 52, L.d, 'demo-x-ink2', 12, 'middle'));
      s.appendChild(g);
      return g;
    });

    var simLines = group();
    simLines.appendChild(svgText(400, 312, '仿真数据量 / 墙钟 = ' + SIM_H + ' / ' + SIM_WALL_H + ' ≈ ' +
      fmt(SIM_X, 0) + ' 倍', 'demo-x-ink2', 13, 'middle'));
    simLines.appendChild(svgText(400, 338, '预训练仿真 ' + PAIRS + ' 组容器 × ' + (DEMOS_PER / 1000) +
      'k = ' + (PRETRAIN_SIM / 1000) + 'k 条，含在 ' + (SIM_TRAJ / 10000) + ' 万条里面', 'demo-x-mut', 12, 'middle'));
    s.appendChild(simLines);
    var neural = svgText(400, 364, '神经轨迹：' + TELEOP_H + ' h → ' + NEURAL_H + ' h，比值 ' +
      fmt(NEURAL_X, 1) + '×（论文写作约 10×）', 'demo-x-mut', 12, 'middle');
    s.appendChild(neural);
    var gpu = paint(svgText(400, 396, '预训练大约 ' + (GPU_H / 1000) + ',000 H100·h', null, 14, 'middle'), C_ACCENT);
    s.appendChild(gpu);

    /* layers 按从上到下排，字幕按底座 → 中层 → 顶层讲。 */
    var LAYER_AT = [8.6, 4.0, 2.2];
    function draw(t) {
      nodes.forEach(function (g, i) {
        setOpacity(g, seg(t, LAYER_AT[i], LAYER_AT[i] + 0.6));
      });
      setOpacity(simLines, seg(t, 4.4, 5.0));
      setOpacity(neural, seg(t, 6.4, 7.0));
      setOpacity(gpu, seg(t, 10.2, 10.8));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 5 幕：没有动作标签 ─────────────────────────────────────────────
  function buildSceneLatent() {
    var s = sceneSvg(
      '人类视频和神经轨迹没有关节动作，用 VQ-VAE 潜动作或逆动力学模型补标签，再走同一条流匹配损失'
    );
    s.appendChild(svgText(40, 30, '没有关节动作的视频，先补一个动作标签再进同一条 loss', 'demo-x-ink2', 13.5));

    var frames = [
      { x: 40, t: '当前帧', tex: 'x_t' },
      { x: 210, t: '未来帧', tex: 'x_{t+H}' }
    ];
    var boxes = frames.map(function (f) {
      var g = group();
      g.appendChild(panel(g, f.x, 58, 150, 72, C_SURFACE, C_BORDER));
      g.appendChild(svgText(f.x + 75, 90, f.t, 'demo-x-ink2', 14, 'middle'));
      g.appendChild(svgMath(f.x + 75, 114, f.tex, { size: 13, anchor: 'middle', w: 120, cls: 'demo-x-mut' }));
      s.appendChild(g);
      return g;
    });

    var code = group();
    code.appendChild(panel(code, 400, 58, 360, 72, C_SURFACE2, C_ACCENT));
    code.appendChild(paint(svgText(580, 88, 'VQ-VAE 编码 → 潜动作', null, 14, 'middle'), C_ACCENT));
    code.appendChild(svgText(580, 112, '取量化前的连续向量，当作 LAPA 本体', 'demo-x-mut', 12, 'middle'));
    /* 两帧之间只放「+」，箭头从第二帧右边才出发，不再穿过「未来帧」的字。 */
    code.appendChild(svgText(200, 100, '+', 'demo-x-mut', 16, 'middle'));
    code.appendChild(paint(svgEl('path', {
      d: 'M 364 94 H 396', fill: 'none', 'stroke-width': 1.3
    }), null, C_MUTED));
    code.appendChild(paint(svgEl('path', {
      d: 'M 389 89 L 396 94 L 389 99', fill: 'none', 'stroke-width': 1.3
    }), null, C_MUTED));
    s.appendChild(code);

    var rows = [
      { t: '真机轨迹', d: '真值动作 + 潜动作，两条都做流匹配目标', c: C_GOOD },
      { t: '神经轨迹', d: '潜动作或 IDM 伪动作；后训练与真轨迹 1:1 混采', c: C_ACCENT },
      { t: '人类视频', d: '只有潜动作', c: C_WARN }
    ];
    var lines = rows.map(function (r, i) {
      var g = group();
      var y = 160 + i * 58;
      g.appendChild(panel(g, 40, y, 720, 50, C_SURFACE, r.c));
      g.appendChild(paint(svgText(56, y + 30, r.t, null, 13), r.c));
      g.appendChild(svgText(168, y + 30, r.d, 'demo-x-ink2', 13));
      s.appendChild(g);
      return g;
    });

    var foot = svgText(400, 360, '数据少的时候 LAPA 略好；演示变多以后 IDM 的伪动作更接近真值，差距拉开', 'demo-x-ink2', 12, 'middle');
    s.appendChild(foot);
    var punch = paint(svgText(400, 388, '同一条 flow-matching loss，换的是标签从哪来', null, 14, 'middle'), C_ACCENT);
    s.appendChild(punch);

    var ROW_AT = [4.4, 6.6, 7.4];
    function draw(t) {
      boxes.forEach(function (g, i) { setOpacity(g, seg(t, 0.4 + i * 0.6, 0.9 + i * 0.6)); });
      setOpacity(code, seg(t, 2.2, 2.8));
      lines.forEach(function (g, i) { setOpacity(g, seg(t, ROW_AT[i], ROW_AT[i] + 0.5)); });
      setOpacity(foot, seg(t, 8.8, 9.4));
      setOpacity(punch, seg(t, 10.4, 11.0));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 6 幕：一套权重 ─────────────────────────────────────────────────
  function buildSceneEmbodiment() {
    var s = sceneSvg(
      '视觉语言骨干和 DiT 共享，每个本体各有一套状态/动作 MLP；' +
        '仿真覆盖单臂、双臂和 GR-1，真机表只报了 Fourier GR-1'
    );
    s.appendChild(svgText(40, 30, '共享的是骨干，不是把同一组关节角写进两台机器人', 'demo-x-ink2', 13.5));

    var trunk = group();
    trunk.appendChild(panel(trunk, 250, 52, 300, 64, C_SURFACE2, C_ACCENT));
    trunk.appendChild(paint(svgText(400, 78, 'Eagle-2 + DiT', null, 15, 'middle'), C_ACCENT));
    trunk.appendChild(svgText(400, 100, '预训练是一套权重', 'demo-x-mut', 12, 'middle'));
    s.appendChild(trunk);

    var bodies = [
      { t: 'Franka 单臂', d: 'RoboCasa 24 个厨房原子技能', c: C_WARN },
      { t: '双臂 Panda', d: '夹爪或灵巧手，DexMG 里的 6 个任务', c: C_ACCENT },
      { t: 'GR-1 人形', d: '臂手腰颈 · 桌面 24 + DexMG 3 个任务', c: C_GOOD }
    ];
    var cards = bodies.map(function (b, i) {
      var g = group();
      var x = 36 + i * 252;
      g.appendChild(paint(svgEl('line', {
        x1: 400, y1: 116, x2: x + 118, y2: 168, 'stroke-width': 1.2
      }), null, C_BORDER));
      g.appendChild(panel(g, x, 168, 236, 88, C_SURFACE, b.c));
      g.appendChild(paint(svgText(x + 118, 202, b.t, null, 14, 'middle'), b.c));
      g.appendChild(svgText(x + 118, 228, b.d, 'demo-x-mut', 11, 'middle'));
      s.appendChild(g);
      return g;
    });

    var foot = group();
    foot.appendChild(panel(foot, 36, 278, 728, 112, C_SURFACE, C_WARN, true));
    foot.appendChild(paint(svgText(52, 306, '表 2 的数字是按本体后训练之后的', null, 14), C_WARN));
    s.appendChild(foot);
    var footLines = [
      svgText(52, 330, '后训练冻结语言模型，其余（含视觉编码器、DiT、各本体 MLP）继续训。', 'demo-x-ink2', 12),
      svgText(52, 352, '真机成功率只报了 Fourier GR-1。致谢里的 1X 没有出现在实验表里。', 'demo-x-ink2', 12),
      svgText(52, 374, '预训练权重本身的真机数字，是下一幕那两个不微调的桌面任务。', 'demo-x-mut', 12)
    ];
    footLines.forEach(function (n) { s.appendChild(n); });

    var LINE_AT = [6.4, 8.4, 9.4];
    function draw(t) {
      setOpacity(trunk, seg(t, 0.4, 1.0));
      cards.forEach(function (g, i) { setOpacity(g, seg(t, 2.2 + i * 0.6, 2.7 + i * 0.6)); });
      setOpacity(foot, seg(t, 4.4, 5.0));
      footLines.forEach(function (n, i) { setOpacity(n, seg(t, LINE_AT[i], LINE_AT[i] + 0.5)); });
    }
    return { el: s, draw: draw };
  }

  // ─── 第 7 幕：数字与边界 ───────────────────────────────────────────────
  function buildSceneNumbers() {
    var s = sceneSvg(
      '真机 GR-1 上，10% 数据的 GR00T 平均 42.6%，只比全量 Diffusion Policy 的 46.4% 低 3.8 个点；' +
        '全量则到 76.8%。模型仍限于短程桌面操作'
    );
    s.appendChild(svgText(40, 28, '真机 GR-1，Table 3 的四档平均', 'demo-x-ink2', 13.5));

    var rows = [
      { n: 'DP · 10% 数据', v: PAPER_REAL.dp10, c: C_BAD },
      { n: 'GR00T · 10% 数据', v: PAPER_REAL.gr10, c: C_WARN },
      { n: 'DP · 全量数据', v: PAPER_REAL.dpFull, c: C_MUTED },
      { n: 'GR00T · 全量数据', v: PAPER_REAL.grFull, c: C_GOOD }
    ];
    var BAR_AT = [0.4, 2.4, 4.6, 6.6];
    var bars = rows.map(function (r, i) {
      var y = 46 + i * 36;
      s.appendChild(svgText(36, y + 14, r.n, 'demo-x-mut', 12));
      s.appendChild(paint(svgEl('rect', {
        x: 220, y: y, width: 460, height: 16, rx: 4
      }), C_SURFACE, C_BORDER));
      var bar = paint(svgEl('rect', {
        x: 220, y: y, width: 1, height: 16, rx: 4
      }), r.c, r.c);
      s.appendChild(bar);
      var val = svgText(690, y + 13, fmt(r.v, 1) + '%', 'demo-x-ink2', 12);
      s.appendChild(val);
      return { bar: bar, v: r.v, val: val, at: BAR_AT[i] };
    });

    var calls = [
      { at: 2.4, n: svgText(40, 212, '10% 数据：比同量 DP 高 ' + fmt(GAP_LOW, 1) + ' 个点', 'demo-x-ink2', 13) },
      { at: 4.6, n: paint(svgText(40, 236, '只用 10% 数据，比 DP 的全量低 ' + fmt(GAP_DATA, 1) + ' 个点', null, 14), C_ACCENT) },
      { at: 6.6, n: svgText(400, 212, '全量数据：比全量 DP 高 ' + fmt(GAP_FULL, 1) + ' 个点', 'demo-x-ink2', 13) },
      { at: 8.6, n: svgText(40, 262, '仿真 100 条/任务：GR-1 列 ' + fmt(GR_SIM[2], 1) + '% − DP ' +
        fmt(DP_SIM[2], 1) + '% = ' + fmt(GR1_GAP, 1) + ' 个点', 'demo-x-mut', 12) },
      { at: 8.6, n: svgText(40, 282, SIM_TASKS + ' 个仿真任务加权后 GR00T ' + fmt(GR_SIM_W, 2) +
        '%（表上 ' + fmt(PAPER_SIM_AVG.gr, 1) + '%），DP ' + fmt(DP_SIM_W, 2) + '%', 'demo-x-mut', 12) }
    ];
    calls.forEach(function (c) { s.appendChild(c.n); });

    var pre = group();
    pre.appendChild(panel(pre, 36, 300, 350, 58, C_SURFACE2, C_GOOD));
    pre.appendChild(svgText(52, 324, '预训练、不微调', 'demo-x-mut', 11));
    pre.appendChild(svgText(52, 344, '换手 ' + fmt(PRE_HAND_OK, 1) + '/' + PRE_TRIALS +
      '（论文 ' + fmt(PRE_HAND, 1) + '%）', 'demo-x-ink2', 13));
    s.appendChild(pre);
    var pre2 = group();
    pre2.appendChild(panel(pre2, 414, 300, 350, 58, C_SURFACE2, C_GOOD));
    pre2.appendChild(svgText(430, 324, '新物体放进没见过的容器', 'demo-x-mut', 11));
    pre2.appendChild(svgText(430, 344, PRE_NOVEL_OK + '/' + PRE_TRIALS +
      '（论文 ' + fmt(PRE_NOVEL, 1) + '%）', 'demo-x-ink2', 13));
    s.appendChild(pre2);

    var end = group();
    end.appendChild(paint(svgText(400, 386, '苹果那个例子是桌面上的换手，不是走到厨房', null, 14, 'middle'), C_WARN));
    end.appendChild(svgText(400, 408, '后训练数据若只有右手，换手会忘掉 · 真机平均按 ' +
      REAL_TASKS + ' 个任务加权，复核 ' + fmt(GR_FULL_W, 2) + '%', 'demo-x-mut', 11, 'middle'));
    s.appendChild(end);

    function draw(t) {
      bars.forEach(function (b) {
        var u = ease(seg(t, b.at, b.at + 1.2));
        b.bar.setAttribute('width', Math.max(1, 460 * (b.v / 100) * u));
        setOpacity(b.val, seg(t, b.at + 0.8, b.at + 1.2));
      });
      calls.forEach(function (c) { setOpacity(c.n, seg(t, c.at + 0.6, c.at + 1.1)); });
      setOpacity(pre, seg(t, 10.4, 10.9));
      setOpacity(pre2, seg(t, 10.8, 11.3));
      setOpacity(end, seg(t, 12.2, 12.8));
    }
    return { el: s, draw: draw };
  }

  var GROOT_SCENES = [
    {
      title: '没有人形数据的互联网',
      dur: 12,
      build: buildSceneIslands,
      cues: [
        { at: 0.4, s: '论文开头就说：没有一份人形机器人的互联网。单机数据小几个数量级。' },
        { at: 2.2, s: 'Open X-Embodiment 把很多机器人拼在一起，本体和传感器仍然对不齐，还是孤岛。' },
        { at: 3.8, s: '另一条老路是把现成 VLM 当黑盒规划器。那得先有低层技能，而且规划和执行不一起训。' },
        { at: 5.4, s: 'GR00T N1 要的是一个端到端的 VLA。评测是短程桌面操作。' },
        { at: 7.6, s: '**局限写在第 4.6 节：长程 loco-manipulation 还做不了。**' },
        { at: 9.8, s: '后面六幕都在回答两件事：异构数据怎么变成同一条监督，推理和动作怎么接进一个模型。' }
      ]
    },
    {
      title: '10 Hz 与 63.9 ms',
      dur: 13,
      build: buildSceneClocks,
      cues: [
        { at: 0.4, s: 'System 2 是 Eagle-2。图像 $' + IMG + '\\times' + IMG + '$，打乱像素后剩 $' + IMG_TOKENS + '$ 个 token。' },
        { at: 2.2, s: '用的是 LLM **第 ' + LLM_LAYER + ' 层**，不是最后一层：论文说又快、下游成功率又高。' },
        { at: 3.8, s: 'VLM $' + fmt(VLM_B, 2) + '$ B，全模型 $' + fmt(TOTAL_B, 1) + '$ B。L40 上这篇的运行频率写成 **' + SYS2_HZ + ' Hz**。' },
        { at: 5.6, s: 'System 1 一次吐 $H=' + CHUNK + '$ 步，L40、bf16 下 **' + INFER_MS + ' ms**，去噪 $K=' + K_STEPS + '$ 步。' },
        { at: 7.6, s: '**' + SYS1_HZ + ' Hz 是动作率**：一步 $' + fmt(ACTION_MS, 1) + '$ ms，16 步要播 $' + fmt(CHUNK_MS, 0) + '$ ms。' },
        { at: 10.6, s: '采样比播放短，所以这块动作算得完。不是整网每 8 ms 前向一次。' }
      ]
    },
    {
      title: '流匹配的直线',
      dur: 13,
      build: buildSceneFlow,
      cues: [
        { at: 0.4, s: '动作块走直线：$A^{\\tau}=(1-\\tau)\\epsilon+\\tau A$。$\\tau=0$ 是噪声，$\\tau=1$ 是数据。' },
        { at: 2.4, s: '网络预测的速度是 **$v=A-\\epsilon$**，也就是仓库里的 `velocity = actions - noise`。' },
        { at: 4.6, s: '推理从噪声出发，欧拉更新 $A\\leftarrow A+\\frac{1}{K}v$，这里 $K=' + K_STEPS + '$。' },
        { at: 7.2, s: '玩具标量 $\\epsilon=' + TOY_EPS + '$、$A=' + TOY_A + '$、$v=' + fmt(TOY_V, 0) + '$，四步是 ' +
            EULER.map(function (v) { return fmt(v, 1); }).join(' → ') + '。' },
        { at: 10.4, s: 'ar5iv 的 Eq.(1) 印成 $\\epsilon-A$，和这条路径、和开源代码都相反。动画跟代码。' }
      ]
    },
    {
      title: '数据金字塔',
      dur: 12,
      build: buildScenePyramid,
      cues: [
        { at: 0.4, s: '数据不倒进一个池子。数量向下增加，具身特异性向上增加。' },
        { at: 2.2, s: '底座是人类第一视角视频，加上 VLM 预训练用过的网络数据。' },
        { at: 4.0, s: '中层：DexMimicGen 在 **' + SIM_WALL_H + ' 小时**里生成 ' + SIM_H + ' 小时仿真，约 **' + fmt(SIM_X, 0) + ' 倍**。' },
        { at: 6.4, s: '同一层还有神经轨迹：' + TELEOP_H + ' h 遥操扩成 ' + NEURAL_H + ' h，比值 **' + fmt(NEURAL_X, 1) + '×**。' },
        { at: 8.6, s: '顶层才是真机：GR-1 遥操、Open X 的若干子集、AgiBot 当时可用的 ' + (AGIBOT / 1000) + 'k 条。' },
        { at: 10.2, s: 'GR00T-N1-2B 的预训练大约 **' + (GPU_H / 1000) + ',000 H100·h**。' }
      ]
    },
    {
      title: '潜动作与 IDM',
      dur: 12,
      build: buildSceneLatent,
      cues: [
        { at: 0.4, s: '人类视频和生成的视频没有关节动作，不能直接当模仿学习的标签。' },
        { at: 2.2, s: 'VQ-VAE 吃 $x_t$ 和 $x_{t+H}$，抽出潜动作 $z_t$；预训练取量化前的连续向量，当成一种叫 LAPA 的本体。' },
        { at: 4.4, s: '真机数据两条标签都用：真值动作，以及同一个潜动作。损失仍是流匹配。' },
        { at: 6.6, s: '神经轨迹再用一个逆动力学模型补伪动作。后训练时它和真轨迹 **1:1** 混着采。人类视频只有潜动作。' },
        { at: 8.8, s: '演示很少时 LAPA 略好；数据多了，IDM 更贴近真值，优势反过来变大。' },
        { at: 10.4, s: '**金字塔回答数据放哪一层，这一幕回答标签从哪来。** 两件事合成一幕会叠在一起。' }
      ]
    },
    {
      title: '一套权重，多套 MLP',
      dur: 11,
      build: buildSceneEmbodiment,
      cues: [
        { at: 0.4, s: '状态和动作的维度随本体变。每个本体一套 MLP，投到 DiT 的同一宽度。' },
        { at: 2.2, s: '仿真三条身体：Franka 单臂、双臂 Panda、Fourier GR-1。DexMG 的 9 个任务分给了后两种。' },
        { at: 4.4, s: '「一套权重」指的是预训练骨干。表 2 是**按本体后训练**之后的成功率。' },
        { at: 6.4, s: '后训练冻结语言模型。真机表只报了 **Fourier GR-1**。' },
        { at: 8.4, s: '致谢里的 1X 提供过硬件支持，实验数字里没有它。' }
      ]
    },
    {
      title: '表上的数字',
      dur: 14,
      build: buildSceneNumbers,
      cues: [
        { at: 0.4, s: '真机四类任务，Diffusion Policy 用 10% 数据平均只有 **' + fmt(PAPER_REAL.dp10, 1) + '%**。' },
        { at: 2.4, s: '同样 10% 数据，GR00T 到 **' + fmt(PAPER_REAL.gr10, 1) + '%**，高出 ' + fmt(GAP_LOW, 1) + ' 个点。' },
        { at: 4.6, s: '这档只比 DP 的**全量**（' + fmt(PAPER_REAL.dpFull, 1) + '%）低 ' + fmt(GAP_DATA, 1) + ' 个点。' },
        { at: 6.6, s: '全量数据 GR00T **' + fmt(PAPER_REAL.grFull, 1) + '%**，比全量 DP 高 ' + fmt(GAP_FULL, 1) + ' 个点。' },
        { at: 8.6, s: '仿真里最显眼的是 GR-1 列：' + fmt(GR_SIM[2], 1) + '% 对 ' + fmt(DP_SIM[2], 1) + '%，差 ' + fmt(GR1_GAP, 1) + ' 个点。' },
        { at: 10.4, s: '不微调的预训练权重：换手 ' + fmt(PRE_HAND_OK, 1) + '/' + PRE_TRIALS + '，新物体 ' + PRE_NOVEL_OK + '/' + PRE_TRIALS + '。' },
        { at: 12.2, s: '**苹果是桌面上的换手。** 后训练若只见过右手，这个换手会消失。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '七幕动画：GR00T N1 全流程速览',
      sub: '约 87 秒自动播放。空格播放/暂停，← → 换幕；成功率、时长和流匹配的玩具步都由上面的常数现算。',
      ariaLabel: 'GR00T N1 七幕讲解动画',
      notes: [
        '频率：System 2 的 $' + SYS2_HZ + '\\ \\text{Hz}$、System 1 的动作率 $' + SYS1_HZ +
          '\\ \\text{Hz}$、一块 $' + CHUNK + '$ 步 $' + INFER_MS + '\\ \\text{ms}$（L40，bf16）都是论文 §2 的原话。' +
          '播放时长 $' + fmt(CHUNK_MS, 0) + '\\ \\text{ms}=' + CHUNK + '\\times 1000/' + SYS1_HZ + '$ 是按动作率换算的，论文没有单独报这个毫秒数。',
        '流匹配跟 [Isaac-GR00T](https://github.com/NVIDIA/Isaac-GR00T) 的实现：' +
          '`noisy = (1-t)·noise + t·actions`，`velocity = actions - noise`，推理 `A ← A + dt·v`，$K=' +
          K_STEPS + '$ 取论文和评测脚本的 `--denoising_steps` 默认值（checkpoint 的 `config.json` 写的是 16）。玩具 $\\epsilon=' + TOY_EPS + '$、$A=' + TOY_A + '$ 只用来把四步走完，不是论文里的关节角。' +
          'ar5iv 排版的 Eq.(1) 写成 $\\epsilon-A$，与这条更新矛盾。',
        'Table 2 的 Average 按任务数加权（$' + SIM_N.join('+') + '=' + SIM_TASKS +
          '$）。GR00T 复核 $' + fmt(GR_SIM_W, 2) + '\\%$，论文印 $' + fmt(PAPER_SIM_AVG.gr, 1) +
          '\\%$；DP 复核 $' + fmt(DP_SIM_W, 2) + '\\%$，印 $' + fmt(PAPER_SIM_AVG.dp, 1) +
          '\\%$。Table 3 同样按 $' + REAL_N.join('+') + '=' + REAL_TASKS +
          '$ 个任务加权，全量 GR00T 复核 $' + fmt(GR_FULL_W, 2) + '\\%$，印 $' +
          fmt(PAPER_REAL.grFull, 1) + '\\%$。差值 ' + fmt(GAP_LOW, 1) + ' / ' + fmt(GAP_FULL, 1) +
          ' / ' + fmt(GAP_DATA, 1) + ' 用的是论文印出来的平均。DexMG 一列正文与附录 Table 4 的任务平均不一致，画面采用正文 Table 2。'
      ],
      scenes: GROOT_SCENES
    });
  }

  // These three small experiments complement the fixed seven-scene explainer.
  // Their inputs are explicitly illustrative; published constants stay fixed.
  function buildTiming(host) {
    var root = K.card(host, { title: '16 步动作块的时间预算', sub: '拖动 **假设的采样耗时**，比较它与论文 $H=16$、$f=120\\,\\mathrm{Hz}$ 的播放窗口。' });
    var controls = K.controlsRow(root);
    var sample = K.slider(controls, { label: '假设的采样耗时', min: 20, max: 180, step: 1, value: INFER_MS,
      format: function (v) { return fmt(v, 1) + ' ms'; }, onInput: draw });
    var stats = K.statsRow(root);
    var budget = stats.add('16 步播放时长'), remaining = stats.add('预算余量');
    var st = K.stage(root, 168);
    var verdict = K.verdictBox(root);
    K.note(root, ['**63.9 ms** 是论文报告的 L40 / bf16 采样值；滑块其余位置是反事实预算练习。没有包括通信、控制或重规划开销。']);
    function draw() {
      var g = K.begin(st), ctx = g.ctx, p = g.P;
      var left = 92, right = 20, width = Math.max(90, g.w - left - right), max = 200;
      var rows = [{ label: '动作块播放', ms: CHUNK_MS, color: p.accent },
        { label: '采样耗时', ms: sample.get(), color: p.good }];
      rows.forEach(function (row, i) {
        var y = 39 + i * 55;
        ctx.fillStyle = p.text;
        ctx.fillText(row.label, 8, y + 12);
        ctx.fillStyle = p.grid;
        ctx.fillRect(left, y, width, 23);
        ctx.fillStyle = row.color;
        ctx.fillRect(left, y, width * row.ms / max, 23);
        ctx.fillStyle = p.text;
        ctx.fillText(fmt(row.ms, 1) + ' ms', left + 5, y + 12);
      });
      ctx.fillStyle = p.muted;
      ctx.fillText('同一尺度：0–200 ms；动作间隔约 ' + fmt(ACTION_MS, 2) + ' ms', 8, 148);
      var spare = CHUNK_MS - sample.get();
      budget.set(fmt(CHUNK_MS, 1) + ' ms');
      remaining.set((spare >= 0 ? '+' : '') + fmt(spare, 1) + ' ms', spare >= 0 ? 'good' : 'bad');
      verdict.set(spare >= 0 ? '只比较两段时长：采样能装进理想的播放窗口；实际系统仍需测量其他开销。' :
        '假设耗时超过播放窗口；若整块播放、没有流水线或重规划优化，就无法按此预算连续供给动作。', spare >= 0 ? 'good' : 'bad');
    }
    K.registerRenderer(draw);
    draw();
  }

  function buildFlow(host) {
    var root = K.card(host, { title: '从噪声到动作：四步积分', sub: '选第几步，观察玩具标量 $\\epsilon=-1$、$A=1$ 的 $A^\\tau$。' });
    var controls = K.controlsRow(root);
    var position = K.slider(controls, { label: '欧拉步数', min: 0, max: K_STEPS, step: 1, value: 0,
      format: function (v) { return v + ' / ' + K_STEPS; }, onInput: draw });
    var st = K.stage(root, 156);
    var verdict = K.verdictBox(root);
    K.note(root, ['**一维教学例子**：假定速度始终是 $v=A-\\epsilon=2$，每步加 $v/4=0.5$。真实 DiT 每步都会根据当前状态重新预测速度。']);
    function draw() {
      var g = K.begin(st), ctx = g.ctx, p = g.P;
      var left = 28, right = g.w - 28, y = 80, selected = position.get();
      ctx.strokeStyle = p.border;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
      for (var i = 0; i <= K_STEPS; i++) {
        var x = left + (right - left) * i / K_STEPS;
        ctx.fillStyle = i <= selected ? p.accent : p.muted;
        ctx.beginPath(); ctx.arc(x, y, i === selected ? 9 : 5, 0, Math.PI * 2); ctx.fill();
        ctx.textAlign = i === 0 ? 'left' : i === K_STEPS ? 'right' : 'center';
        ctx.fillStyle = p.text;
        ctx.fillText(fmt(EULER[i], 1), x, 111);
        ctx.fillStyle = p.muted;
        ctx.fillText('τ=' + fmt(i / K_STEPS, 2), x, 45);
      }
      ctx.textAlign = 'left';
      verdict.set('第 ' + selected + ' 步：$A^\\tau=' + fmt(EULER[selected], 1) + '$；更新 = 上一步 $+\\,2/4$。');
    }
    K.registerRenderer(draw);
    draw();
  }

  function buildResults(host) {
    var root = K.card(host, { title: 'Table 2：为什么三列不是直接平均？', sub: '切换模型，查看每组任务对 **57 个任务加权平均** 的贡献。' });
    var controls = K.controlsRow(root);
    var model = K.slider(controls, { label: '模型', min: 0, max: 2, step: 1, value: 2,
      format: function (v) { return ['BC Transformer', 'Diffusion Policy', 'GR00T N1'][v]; }, onInput: draw });
    var st = K.stage(root, 236);
    var stats = K.statsRow(root);
    var result = stats.add('用分项重算'), reported = stats.add('论文主表 Average');
    var verdict = K.verdictBox(root);
    K.note(root, ['论文 Table 2：每任务 100 条演示，后训练仿真成功率。分项只印到一位小数，重算与原表可能有舍入差；**不能**当作零样本真机性能。']);
    function draw() {
      var g = K.begin(st), ctx = g.ctx, p = g.P;
      var rates = [[26.3, 53.9, 16.1], DP_SIM, GR_SIM][model.get()];
      var published = [26.4, PAPER_SIM_AVG.dp, PAPER_SIM_AVG.gr][model.get()];
      var names = ['RoboCasa', 'DexMG', 'GR-1'];
      var left = 98, width = Math.max(90, g.w - 172);
      rates.forEach(function (rate, i) {
        var y = 30 + i * 62;
        ctx.fillStyle = p.text;
        ctx.fillText(names[i], 8, y + 10);
        ctx.fillStyle = p.grid;
        ctx.fillRect(left, y, width, 20);
        ctx.fillStyle = [p.accent, p.warn, p.good][i];
        ctx.fillRect(left, y, width * rate / 100, 20);
        ctx.fillStyle = p.text;
        ctx.fillText(fmt(rate, 1) + '%', left + width + 5, y + 10);
        ctx.fillStyle = p.muted;
        ctx.fillText(SIM_N[i] + '/57 个任务 → ' + fmt(rate * SIM_N[i] / SIM_TASKS, 2) + ' 个百分点', left, y + 40);
      });
      var average = wavg(rates, SIM_N);
      result.set(fmt(average, 2) + '%');
      reported.set(fmt(published, 1) + '%');
      verdict.set('按任务数算：(' + rates.map(function (rate, i) { return fmt(rate, 1) + '×' + SIM_N[i]; }).join(' + ') + ') / 57 = ' + fmt(average, 2) + '%。');
    }
    K.registerRenderer(draw);
    draw();
  }

  K.mount({
    'groot-explainer': buildExplainerDemo,
    'groot-timing': buildTiming,
    'groot-flow': buildFlow,
    'groot-results': buildResults
  });
})();
