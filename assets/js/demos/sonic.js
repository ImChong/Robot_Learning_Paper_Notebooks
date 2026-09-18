/* Interactive SONIC demos for
 * papers/03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["sonic"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   sonic-explainer — 七幕讲解动画：任务选错了 → 三轴一起放大 → universal token 空间 →
 *                     五项 aux loss 把三路 latent 焊在一起 → 实时 kinematic planner →
 *                     System-1 + System-2 → 数据到实机的闭环与源码落点
 */

(function () {
  'use strict';

  var K = window.PaperDemoKit;
  var fmt = K.fmt,
    svgEl = K.svgEl,
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

  // ─── 画面上的数字从这里现算，不手写 ───────────────────────────────────
  /* `sonic_release` 的 FSQ 配置：每维 32 levels、latent 32 维、每帧 2 个 token。
     笔记里那句「64-d / 帧, ~320 bit/帧」就是这两行算出来的。 */
  var FSQ_LEVELS = 32,
    FSQ_DIM = 32,
    FSQ_TOKENS = 2;
  var FSQ_FLAT = FSQ_DIM * FSQ_TOKENS; // 64 维实数向量
  var FSQ_BITS = FSQ_FLAT * (Math.log(FSQ_LEVELS) / Math.LN2); // 320 bit/帧

  /* 隐层之间的权重数（不含输入层 / 输出头，那两块要知道 obs 维度才算得出来）。
     笔记 §模型架构 里「g1_dyn ≈ 8.5 M」「critic ≈ 8.5 M」的主体就是这一项。 */
  function mlpParams(dims) {
    var n = 0;
    for (var i = 1; i < dims.length; i++) n += dims[i - 1] * dims[i];
    return n;
  }

  var ENC_DIMS = [2048, 1024, 512, 512];
  var DYN_DIMS = [2048, 2048, 1024, 1024, 512, 512];
  var P_ENC = mlpParams(ENC_DIMS); // 单路 encoder
  var P_ENC3 = 3 * P_ENC;
  var P_DYN = mlpParams(DYN_DIMS); // g1_dyn decoder，与 critic 同构
  var P_KIN = mlpParams(ENC_DIMS); // g1_kin decoder 与 encoder 同构
  var P_HIDDEN = P_ENC3 + P_DYN + P_KIN + P_DYN; // 三路 encoder + 两个 decoder + critic

  function mega(n) {
    return fmt(n / 1e6, 2) + ' M';
  }

  /* 50 Hz 控制（Isaac Lab dt = 0.02 s）下，时间单位都能换算成「几个控制步」。 */
  var DT = 0.02;
  var HZ = Math.round(1 / DT); // 50
  var REPLAN_MS = 100;
  var REPLAN_STEPS = Math.round(REPLAN_MS / (DT * 1000)); // 5 步
  var SEG_MIN = 0.8,
    SEG_MAX = 2.4;
  var SEG_MIN_STEPS = Math.round(SEG_MIN / DT); // 40 步
  var SEG_MAX_STEPS = Math.round(SEG_MAX / DT); // 120 步

  /* 三个放大轴的刻度按对数排布，因为它们跨的都是数量级。 */
  function logPos(v, lo, hi) {
    return (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
  }

  var VLA_TRIALS = 20,
    VLA_RATE = 0.95;
  var VLA_OK = Math.round(VLA_TRIALS * VLA_RATE); // 19 次

  // ─── 第 1 幕：不是规模不管用，是任务选错了 ──────────────────────────────
  var S1_WALLS = [
    { t: '① 逐任务奖励工程', d: '走路 / 跳舞 / 起身 / 遥操各写一套 reward，多训反而过拟合' },
    { t: '② 输入接口五花八门', d: 'teleop / 视频 / 语言 / VLA 各搭一条 pipeline，控制器没法共用' },
    { t: '③ tracker 出了自家分布就崩', d: '换一个 motion 域，现有跟踪策略立刻失效' }
  ];

  function buildSceneTask() {
    var s = sceneSvg(
      '人形控制没吃到规模红利的三个症结：逐任务奖励工程、输入接口各搭一套、' +
        '现有 motion tracker 换域就崩；SONIC 的论点是把 motion tracking 当作可扩展的基础任务'
    );
    s.appendChild(svgText(56, 30, '人形控制为什么没像 LLM 那样「越大越强」？', 'demo-x-ink2', 13.5));

    var walls = S1_WALLS.map(function (w, k) {
      var g = svgEl('g', {});
      var y = 62 + k * 74;
      g.appendChild(paint(svgEl('rect', { x: 40, y: y, width: 336, height: 62, rx: 8, 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }), C_SURFACE, C_BAD));
      g.appendChild(paint(svgText(56, y + 25, w.t, null, 12, 'start'), C_BAD));
      g.appendChild(svgText(56, y + 45, w.d, 'demo-x-mut', 9.5));
      s.appendChild(g);
      return { g: g, at: 0.6 + k * 1.3 };
    });

    var claim = svgEl('g', {});
    claim.appendChild(paint(svgEl('rect', { x: 416, y: 62, width: 344, height: 74, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_ACCENT));
    claim.appendChild(paint(svgText(588, 88, 'SONIC 的论点：任务选错了', null, 13, 'middle'), C_ACCENT));
    claim.appendChild(svgText(588, 112, '把 motion tracking 立成「可扩展的基础任务」', 'demo-x-ink2', 11, 'middle'));
    s.appendChild(claim);

    var gains = [
      { t: '密集监督', d: '逐帧跟随参考动作，监督来自 MoCap，不用手写 reward', c: C_GOOD },
      { t: '统一接口', d: '所有输入都编码成同一套 token，新增模态不重训控制器', c: C_GOOD }
    ].map(function (g0, k) {
      var g = svgEl('g', {});
      var y = 152 + k * 76;
      g.appendChild(paint(svgEl('rect', { x: 416, y: y, width: 344, height: 64, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, g0.c));
      g.appendChild(paint(svgText(434, y + 25, g0.t, null, 12), g0.c));
      g.appendChild(svgText(434, y + 45, g0.d, 'demo-x-mut', 9.5));
      s.appendChild(g);
      return { g: g, at: 6.0 + k * 1.2 };
    });

    var band = svgEl('g', {});
    band.appendChild(paint(svgEl('rect', { x: 40, y: 292, width: 720, height: 46, rx: 8, 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }), C_SURFACE, C_WARN));
    band.appendChild(paint(svgText(400, 312, '赌注：只要监督足够密、来源足够杂，数据 / 参数 / 算力三个轴就都能换来 MPJPE 下降', null, 11.5, 'middle'), C_WARN));
    band.appendChild(svgText(400, 330, '整篇论文剩下的部分，都是在验证这一句', 'demo-x-mut', 10, 'middle'));
    s.appendChild(band);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 372, '不是规模不管用，是过去那些任务不配被放大', null, 15.5, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 396, '换成 motion tracking，一个控制器同时拿到密集监督和通用接口', 'demo-x-mut', 11, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      walls.forEach(function (w) { setOpacity(w.g, seg(t, w.at, w.at + 0.5)); });
      setOpacity(claim, seg(t, 4.6, 5.4));
      gains.forEach(function (g) { setOpacity(g.g, seg(t, g.at, g.at + 0.5)); });
      setOpacity(band, seg(t, 9.0, 9.8));
      setOpacity(foot, seg(t, 11.0, 11.8));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 2 幕：三个轴一起放大 ───────────────────────────────────────────
  var S2_AXES = [
    {
      name: '数据',
      sub: 'MoCap 帧数',
      unit: '帧',
      ticks: [
        { v: 0.4, t: '0.4 M', d: 'LaFAN 量级' },
        { v: 7.4, t: '7.4 M', d: '中间档' },
        { v: 100, t: '100 M+', d: '≈ 700 h' }
      ],
      gain: '250 ×',
      best: true
    },
    {
      name: '参数',
      sub: 'actor + critic',
      unit: '',
      ticks: [
        { v: 1.2, t: '1.2 M', d: 'Tiny' },
        { v: 5, t: '5 M', d: 'Small' },
        { v: 15, t: '15 M', d: 'Base' },
        { v: 42, t: '42 M', d: 'sonic_release' }
      ],
      gain: '35 ×',
      best: false
    },
    {
      name: '算力',
      sub: '单次训练',
      unit: 'GPU·h',
      ticks: [
        { v: 9, t: '9 k', d: '起步' },
        { v: 32, t: '32 k', d: '128 GPU × 3 天' }
      ],
      gain: '3.6 ×',
      best: false
    }
  ];

  function buildSceneScale() {
    var s = sceneSvg(
      'SONIC 沿数据（0.4 M → 100 M+ 帧）、参数（1.2 M → 42 M）、算力（9 k → 32 k GPU·h）' +
        '三个轴同时放大，MPJPE 在三个维度上都单调下降，其中数据轴收益最大'
    );
    s.appendChild(svgText(56, 28, '三个轴一起放大：论文 Fig.2 的三条曲线都单调下降', 'demo-x-ink2', 13.5));

    var X0 = 196,
      X1 = 690;
    var rows = S2_AXES.map(function (ax, k) {
      var g = svgEl('g', {});
      var y = 84 + k * 72;
      var lo = ax.ticks[0].v,
        hi = ax.ticks[ax.ticks.length - 1].v;
      g.appendChild(paint(svgText(40, y + 4, ax.name, null, 13), ax.best ? C_GOOD : C_ACCENT));
      g.appendChild(svgText(40, y + 22, ax.sub, 'demo-x-mut', 9.5));
      g.appendChild(paint(svgEl('line', { x1: X0, y1: y, x2: X1, y2: y, 'stroke-width': 1.4 }), null, C_BORDER));
      ax.ticks.forEach(function (tk, i) {
        var x = X0 + logPos(tk.v, lo, hi) * (X1 - X0);
        /* 最后一格顶着右边的倍数徽章，标签改成向左排，否则会压在徽章上。 */
        var last = i === ax.ticks.length - 1;
        var lx = last ? x + 10 : x;
        var anchor = last ? 'end' : 'middle';
        g.appendChild(paint(svgEl('circle', { cx: x.toFixed(1), cy: y, r: 5, 'stroke-width': 1.5 }), C_SURFACE2, ax.best ? C_GOOD : C_ACCENT));
        g.appendChild(svgText(lx, y - 14, tk.t + (ax.unit ? ' ' + ax.unit : ''), 'demo-x-mono', 10.5, anchor));
        g.appendChild(svgText(lx, y + 24, tk.d, 'demo-x-mut', 9, anchor));
      });
      g.appendChild(paint(svgEl('rect', { x: 706, y: y - 17, width: 56, height: 34, rx: 7, 'stroke-width': 1.3 }), C_SURFACE2, ax.best ? C_GOOD : C_BORDER));
      g.appendChild(paint(svgText(734, y + 5, ax.gain, null, 12, 'middle'), ax.best ? C_GOOD : C_MUTED));
      if (ax.best) g.appendChild(paint(svgText(734, y + 31, '收益最大', null, 9.5, 'middle'), C_GOOD));
      s.appendChild(g);
      return { g: g, at: 0.6 + k * 1.6 };
    });

    var best = svgEl('g', {});
    best.appendChild(paint(svgEl('rect', { x: 32, y: 54, width: 736, height: 64, rx: 8, fill: 'none', 'stroke-width': 1.6, 'stroke-dasharray': '6 4' }), null, C_GOOD));
    s.appendChild(best);

    var bar = svgEl('g', {});
    bar.appendChild(paint(svgEl('rect', { x: 40, y: 292, width: 720, height: 58, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_ACCENT));
    bar.appendChild(paint(svgText(400, 314, '官方文档给的复现达标线：100 k 迭代后 success_rate > 0.98、mpjpe_l < 29 mm', null, 12, 'middle'), C_ACCENT));
    bar.appendChild(svgText(400, 336, '「放大就涨」在 motion tracking 上成立，靠的不是换算子，全程都是 SiLU 的密集 MLP', 'demo-x-mut', 10, 'middle'));
    s.appendChild(bar);

    var foot = paint(svgText(400, 386, '数据轴最值钱：监督越密、动作来源越杂，跟踪误差掉得越快', null, 15, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      rows.forEach(function (r) { setOpacity(r.g, seg(t, r.at, r.at + 0.6)); });
      setOpacity(best, seg(t, 6.4, 7.2));
      setOpacity(bar, seg(t, 8.2, 9.0));
      setOpacity(foot, seg(t, 10.2, 11.0));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 3 幕：universal token space ────────────────────────────────────
  var S3_INPUTS = [
    { t: 'G1 obs', d: '未来 10 帧命令', d2: '+ anchor 朝向' },
    { t: 'Teleop obs', d: '头 / 双手 SE(3)', d2: '+ 腰高 + nav 命令' },
    { t: 'SMPL obs', d: '未来 10 帧 SMPL 关节', d2: '+ root 朝向' }
  ];

  function buildSceneToken() {
    var s = sceneSvg(
      '三路异构输入各走一条 [2048, 1024, 512, 512] 的 MLP encoder，编码到同一个潜空间，' +
        '经 FSQ 量化成每帧 2 个 token、共 64 维，再交给同一个 G1 decoder 解出 29 DOF 关节动作'
    );
    s.appendChild(svgText(56, 26, 'Universal token space：三路 encoder → 一个 FSQ → 一个共享 decoder', 'demo-x-ink2', 13));

    var arrow = K.arrowMarker(s, 'sonic-x-arrow-tok', C_BORDER);
    var arrowAcc = K.arrowMarker(s, 'sonic-x-arrow-tok-acc', C_ACCENT);

    var lanes = S3_INPUTS.map(function (inp, k) {
      var g = svgEl('g', {});
      var y = 58 + k * 84;
      g.appendChild(paint(svgEl('rect', { x: 26, y: y, width: 120, height: 66, rx: 8, 'stroke-width': 1.2 }), C_SURFACE2, C_BORDER));
      g.appendChild(svgText(86, y + 22, inp.t, 'demo-x-ink2', 11.5, 'middle'));
      g.appendChild(svgText(86, y + 40, inp.d, 'demo-x-mut', 9, 'middle'));
      g.appendChild(svgText(86, y + 55, inp.d2, 'demo-x-mut', 9, 'middle'));
      g.appendChild(paint(svgEl('path', { d: polyPath([[150, y + 33], [172, y + 33]]), fill: 'none', 'stroke-width': 1.4, 'marker-end': arrow }), null, C_BORDER));
      g.appendChild(paint(svgEl('rect', { x: 176, y: y, width: 118, height: 66, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, C_ACCENT));
      g.appendChild(paint(svgText(235, y + 24, 'MLP encoder', null, 10.5, 'middle'), C_ACCENT));
      g.appendChild(svgText(235, y + 41, '2048 → 1024', 'demo-x-mono', 9, 'middle'));
      g.appendChild(svgText(235, y + 55, '→ 512 → 512 · SiLU', 'demo-x-mono', 9, 'middle'));
      s.appendChild(g);
      return { g: g, at: 0.5 + k * 0.9, y: y + 33 };
    });

    var funnel = svgEl('g', {});
    lanes.forEach(function (ln) {
      funnel.appendChild(paint(svgEl('path', {
        d: polyPath([[298, ln.y], [316, ln.y], [316, 170], [332, 170]]),
        fill: 'none', 'stroke-width': 1.4, 'marker-end': arrowAcc
      }), null, C_ACCENT));
    });
    s.appendChild(funnel);

    var fsq = svgEl('g', {});
    fsq.appendChild(paint(svgEl('rect', { x: 336, y: 118, width: 132, height: 104, rx: 8, 'stroke-width': 1.6 }), C_SURFACE2, C_WARN));
    fsq.appendChild(paint(svgText(402, 142, 'FSQ 量化器', null, 12, 'middle'), C_WARN));
    fsq.appendChild(svgText(402, 162, 'latent 32 维', 'demo-x-mut', 9.5, 'middle'));
    fsq.appendChild(svgText(402, 178, '每维 ' + FSQ_LEVELS + ' levels', 'demo-x-mut', 9.5, 'middle'));
    fsq.appendChild(svgText(402, 194, FSQ_TOKENS + ' token / 帧', 'demo-x-mut', 9.5, 'middle'));
    fsq.appendChild(paint(svgText(402, 212, '连续 → 离散', null, 9.5, 'middle'), C_WARN));
    s.appendChild(fsq);

    var toDec = paint(svgEl('path', { d: polyPath([[472, 170], [500, 170]]), fill: 'none', 'stroke-width': 1.6, 'marker-end': arrowAcc }), null, C_ACCENT);
    s.appendChild(toDec);

    var dyn = svgEl('g', {});
    dyn.appendChild(paint(svgEl('rect', { x: 504, y: 60, width: 154, height: 88, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_GOOD));
    dyn.appendChild(paint(svgText(581, 82, 'G1 Dynamic Decoder', null, 10.5, 'middle'), C_GOOD));
    dyn.appendChild(svgText(581, 100, '2048 → 2048 → 1024', 'demo-x-mono', 8.5, 'middle'));
    dyn.appendChild(svgText(581, 114, '→ 1024 → 512 → 512', 'demo-x-mono', 8.5, 'middle'));
    dyn.appendChild(paint(svgText(581, 136, '训练 + 部署', null, 9.5, 'middle'), C_GOOD));
    dyn.appendChild(paint(svgEl('path', { d: polyPath([[662, 104], [686, 104]]), fill: 'none', 'stroke-width': 1.4, 'marker-end': arrow }), null, C_BORDER));
    dyn.appendChild(paint(svgEl('rect', { x: 690, y: 78, width: 78, height: 52, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, C_GOOD));
    dyn.appendChild(paint(svgText(729, 100, '29 DOF', null, 11, 'middle'), C_GOOD));
    dyn.appendChild(svgText(729, 116, '关节目标', 'demo-x-mut', 9, 'middle'));
    s.appendChild(dyn);

    var kin = svgEl('g', {});
    kin.appendChild(paint(svgEl('rect', { x: 504, y: 190, width: 154, height: 74, rx: 8, 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }), C_SURFACE, C_MUTED));
    kin.appendChild(paint(svgText(581, 212, 'G1 Kinematic Decoder', null, 10.5, 'middle'), C_MUTED));
    kin.appendChild(svgText(581, 230, '2048 → 1024 → 512 → 512', 'demo-x-mono', 8.5, 'middle'));
    kin.appendChild(svgText(581, 250, '仅训练：还原 10 帧参考动作', 'demo-x-mut', 9, 'middle'));
    kin.appendChild(paint(svgEl('path', { d: polyPath([[402, 226], [402, 227], [484, 227], [484, 212], [500, 212]]), fill: 'none', 'stroke-width': 1.2, 'stroke-dasharray': '4 4', 'marker-end': arrow }), null, C_MUTED));
    s.appendChild(kin);

    var prop = svgEl('g', {});
    prop.appendChild(paint(svgEl('rect', { x: 336, y: 246, width: 132, height: 56, rx: 8, 'stroke-width': 1.2 }), C_SURFACE2, C_BORDER));
    prop.appendChild(svgText(402, 266, '本体感觉', 'demo-x-ink2', 10.5, 'middle'));
    prop.appendChild(svgText(402, 282, '关节 / 角速度 / 重力 / last_action', 'demo-x-mut', 8, 'middle'));
    prop.appendChild(paint(svgEl('path', { d: polyPath([[472, 274], [488, 274], [488, 140], [500, 140]]), fill: 'none', 'stroke-width': 1.3, 'marker-end': arrow }), null, C_BORDER));
    s.appendChild(prop);

    var band = svgEl('g', {});
    band.appendChild(paint(svgEl('rect', { x: 40, y: 318, width: 720, height: 56, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_WARN));
    band.appendChild(svgMath(300, 340,
      FSQ_TOKENS + ' \\times ' + FSQ_DIM + ' = ' + FSQ_FLAT + '\\ \\text{维}, \\quad ' +
      FSQ_FLAT + ' \\times \\log_2 ' + FSQ_LEVELS + ' = ' + FSQ_BITS + '\\ \\text{bit/帧}',
      { size: 12, anchor: 'middle', w: 420 }).setTone(C_WARN));
    band.appendChild(svgText(400, 364, '瓶颈窄到「长上下文压缩」的活由量化器干完，decoder 只做单帧控制，所以不需要 Transformer', 'demo-x-mut', 10, 'middle'));
    s.appendChild(band);

    var rail = [[240, 170], [402, 170], [581, 104], [674, 104]];
    var tok = paint(svgEl('circle', { r: 6, 'stroke-width': 1.6 }), C_ACCENT, C_SURFACE2);
    s.appendChild(tok);

    var foot = paint(svgText(400, 404, '新增一个输入模态 = 新增一条 encoder，控制器那一侧一行不改', null, 14.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      lanes.forEach(function (ln) { setOpacity(ln.g, seg(t, ln.at, ln.at + 0.5)); });
      setOpacity(funnel, seg(t, 3.4, 4.0));
      setOpacity(fsq, seg(t, 4.0, 4.7));
      setOpacity(toDec, seg(t, 5.2, 5.7));
      setOpacity(dyn, seg(t, 5.4, 6.1));
      setOpacity(prop, seg(t, 6.6, 7.2));
      setOpacity(kin, seg(t, 7.6, 8.3));
      setOpacity(band, seg(t, 9.0, 9.8));
      var on = seg(t, 10.0, 10.4);
      setOpacity(tok, on);
      var pt = pointOn(rail, ease(seg(t, 10.0, 12.4)));
      tok.setAttribute('cx', pt[0].toFixed(1));
      tok.setAttribute('cy', pt[1].toFixed(1));
      setOpacity(foot, seg(t, 12.4, 13.2));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 4 幕：把三路 latent 焊在同一个空间 ─────────────────────────────
  var S4_LOSSES = [
    { k: 'g1_recon', c: 0.01, d: 'token 还原参考动作' },
    { k: 'g1_smpl_latent', c: 1.0, d: 'G1 ↔ SMPL' },
    { k: 'g1_teleop_latent', c: 1.0, d: 'G1 ↔ Teleop' },
    { k: 'teleop_smpl_latent', c: 1.0, d: 'Teleop ↔ SMPL' },
    { k: 'reencoded_smpl_g1_latent', c: 1.0, d: 'SMPL→G1→重编码' }
  ];
  var S4_ALIGN = S4_LOSSES.filter(function (l) { return l.c === 1.0; }).length; // 4 项对齐

  function buildSceneAlign() {
    var s = sceneSvg(
      '五项辅助损失把三路 encoder 的 latent 拉到同一个空间：一项 g1_recon 重建（系数 0.01）' +
        '加四项系数 1.0 的跨模态对齐与 cycle consistency'
    );
    s.appendChild(svgText(56, 28, '三路 encoder 凭什么落在「同一个」空间？靠五项 aux loss 焊住', 'demo-x-ink2', 13.5));

    var NODES = [
      { id: 'g1', x: 400, y: 122, t: 'G1', d: '本体跟踪', c: C_ACCENT },
      { id: 'teleop', x: 262, y: 246, t: 'Teleop', d: 'VR 三点', c: C_GOOD },
      { id: 'smpl', x: 538, y: 246, t: 'SMPL', d: '人体姿态', c: C_GOOD }
    ];

    var edges = [
      { a: 0, b: 2, lbl: 'g1_smpl_latent', at: 3.0 },
      { a: 0, b: 1, lbl: 'g1_teleop_latent', at: 3.9 },
      { a: 1, b: 2, lbl: 'teleop_smpl_latent', at: 4.8 }
    ].map(function (e) {
      var g = svgEl('g', {});
      var A = NODES[e.a],
        B = NODES[e.b];
      g.appendChild(paint(svgEl('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y, 'stroke-width': 2 }), null, C_GOOD));
      var mx = (A.x + B.x) / 2,
        my = (A.y + B.y) / 2;
      g.appendChild(paint(svgEl('rect', { x: mx - 62, y: my - 11, width: 124, height: 22, rx: 6, 'stroke-width': 1 }), C_SURFACE, C_GOOD));
      g.appendChild(svgText(mx, my + 5, e.lbl + ' · 1.0', 'demo-x-mono', 8.5, 'middle'));
      s.appendChild(g);
      return { g: g, at: e.at };
    });

    var nodes = NODES.map(function (n, k) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('circle', { cx: n.x, cy: n.y, r: 40, 'stroke-width': 1.8 }), C_SURFACE2, n.c));
      g.appendChild(paint(svgText(n.x, n.y - 2, n.t, null, 13, 'middle'), n.c));
      g.appendChild(svgText(n.x, n.y + 16, n.d, 'demo-x-mut', 9, 'middle'));
      s.appendChild(g);
      return { g: g, at: 0.5 + k * 0.7 };
    });

    var cyc = svgEl('g', {});
    cyc.appendChild(paint(svgEl('path', {
      d: 'M 566 208 Q 660 100 444 96',
      fill: 'none', 'stroke-width': 1.8, 'stroke-dasharray': '6 4',
      'marker-end': K.arrowMarker(s, 'sonic-x-arrow-cyc', C_WARN)
    }), null, C_WARN));
    cyc.appendChild(paint(svgText(636, 150, 'cycle', null, 10.5, 'middle'), C_WARN));
    cyc.appendChild(svgText(636, 166, '重编码回来还得一样', 'demo-x-mut', 8.5, 'middle'));
    s.appendChild(cyc);

    var recon = svgEl('g', {});
    recon.appendChild(paint(svgEl('rect', { x: 40, y: 96, width: 158, height: 66, rx: 8, 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }), C_SURFACE, C_MUTED));
    recon.appendChild(paint(svgText(119, 120, 'g1_kin decoder', null, 10.5, 'middle'), C_MUTED));
    recon.appendChild(svgText(119, 138, 'g1_recon · 0.01', 'demo-x-mono', 9, 'middle'));
    recon.appendChild(svgText(119, 154, '保证 token 没丢运动学信息', 'demo-x-mut', 8.5, 'middle'));
    recon.appendChild(paint(svgEl('path', {
      d: polyPath([[356, 122], [206, 122]]), fill: 'none', 'stroke-width': 1.3, 'stroke-dasharray': '4 4',
      'marker-end': K.arrowMarker(s, 'sonic-x-arrow-recon', C_MUTED)
    }), null, C_MUTED));
    s.appendChild(recon);

    var why = svgEl('g', {});
    why.appendChild(paint(svgEl('rect', { x: 616, y: 236, width: 148, height: 64, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_ACCENT));
    why.appendChild(paint(svgText(690, 258, '对齐了才叫 universal', null, 10.5, 'middle'), C_ACCENT));
    why.appendChild(svgText(690, 276, '否则三路各占一块潜空间', 'demo-x-mut', 8.5, 'middle'));
    why.appendChild(svgText(690, 291, '共享 decoder 就白设了', 'demo-x-mut', 8.5, 'middle'));
    s.appendChild(why);

    var chips = S4_LOSSES.map(function (l, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 148;
      var c = l.c === 1.0 ? C_GOOD : C_MUTED;
      g.appendChild(paint(svgEl('rect', { x: x, y: 314, width: 136, height: 46, rx: 7, 'stroke-width': 1.2 }), C_SURFACE2, c));
      g.appendChild(svgText(x + 68, 332, l.k, 'demo-x-mono', 8, 'middle'));
      g.appendChild(paint(svgText(x + 68, 350, fmt(l.c, 2) + ' · ' + l.d, null, 8.5, 'middle'), c));
      s.appendChild(g);
      return { g: g, at: 6.2 + k * 0.6 };
    });

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 390, S4_ALIGN + ' 项对齐（系数 1.0）+ 1 项重建（系数 0.01）= 一个真正共享的潜空间', null, 14.5, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 412, '这是 VLA / VR / 视频「零控制器改动」接进来的工程保证', 'demo-x-mut', 11, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      nodes.forEach(function (n) { setOpacity(n.g, seg(t, n.at, n.at + 0.5)); });
      edges.forEach(function (e) { setOpacity(e.g, seg(t, e.at, e.at + 0.6)); });
      setOpacity(cyc, seg(t, 5.4, 6.0));
      setOpacity(recon, seg(t, 2.0, 2.7));
      chips.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.5)); });
      setOpacity(why, seg(t, 9.4, 10.1));
      setOpacity(foot, seg(t, 10.4, 11.2));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 5 幕：实时 Universal Kinematic Planner ─────────────────────────
  /* 时间轴上摆的三段参考动作，长度都落在论文给的 0.8 – 2.4 s 区间内。 */
  var S5_SEGS = [
    { a: 0.0, b: 1.2, t: '直行' },
    { a: 1.2, b: 2.2, t: '加速' },
    { a: 2.2, b: 3.0, t: '换风格' }
  ];
  var S5_CUT = 2.2 - REPLAN_MS / 1000; // 改命令的时刻：replan 结束正好是下一段的起点

  function buildScenePlanner() {
    var s = sceneSvg(
      '实时 Universal Kinematic Planner 自回归地生成 0.8 – 2.4 s 的参考片段，' +
        '用户改命令后 100 ms（5 个控制步）内重新规划；笔记本推理 < 5 ms，Jetson Orin 12 ms'
    );
    s.appendChild(svgText(56, 26, '规划器负责「想做什么」，跟踪策略只负责「跟住」', 'demo-x-ink2', 13.5));

    var TX0 = 70,
      TX1 = 744,
      TY = 120;
    function tx(sec) { return TX0 + (sec / 3.0) * (TX1 - TX0); }

    s.appendChild(svgText(TX0, 60, '规划器输出的参考片段（自回归，一段接一段）', 'demo-x-mut', 10));
    s.appendChild(paint(svgEl('line', { x1: TX0, y1: TY + 30, x2: TX1, y2: TY + 30, 'stroke-width': 1.3 }), null, C_BORDER));
    [0, 1, 2, 3].forEach(function (sec) {
      s.appendChild(paint(svgEl('line', { x1: tx(sec), y1: TY + 30, x2: tx(sec), y2: TY + 36, 'stroke-width': 1.2 }), null, C_BORDER));
      s.appendChild(svgText(tx(sec), TY + 50, sec + ' s', 'demo-x-mut', 9.5, 'middle'));
    });

    var segs = S5_SEGS.map(function (sg, k) {
      var g = svgEl('g', {});
      var x = tx(sg.a),
        w = tx(sg.b) - tx(sg.a);
      g.appendChild(paint(svgEl('rect', { x: x + 2, y: TY - 26, width: w - 4, height: 52, rx: 7, 'stroke-width': 1.4 }), C_SURFACE2, k === 2 ? C_WARN : C_ACCENT));
      g.appendChild(paint(svgText(x + w / 2, TY - 6, sg.t, null, 11.5, 'middle'), k === 2 ? C_WARN : C_ACCENT));
      g.appendChild(svgText(x + w / 2, TY + 12, fmt(sg.b - sg.a, 1) + ' s = ' + Math.round((sg.b - sg.a) / DT) + ' 步', 'demo-x-mono', 8.5, 'middle'));
      s.appendChild(g);
      return { g: g, at: 0.6 + k * 1.5 };
    });

    var cut = svgEl('g', {});
    cut.appendChild(paint(svgEl('line', { x1: tx(S5_CUT), y1: TY - 44, x2: tx(S5_CUT), y2: TY + 36, 'stroke-width': 1.6, 'stroke-dasharray': '4 3' }), null, C_BAD));
    cut.appendChild(paint(svgText(tx(S5_CUT), TY - 52, '用户改命令', null, 10.5, 'middle'), C_BAD));
    cut.appendChild(paint(svgEl('rect', { x: tx(S5_CUT), y: TY + 62, width: tx(S5_CUT + REPLAN_MS / 1000) - tx(S5_CUT), height: 14, rx: 4 }), C_BAD));
    cut.appendChild(paint(svgText(tx(S5_CUT) - 12, TY + 74, '≤ ' + REPLAN_MS + ' ms 内重新规划 = ' + REPLAN_STEPS + ' 个控制步 →', null, 10, 'end'), C_BAD));
    s.appendChild(cut);

    var lat = [
      { t: '笔记本推理', v: '< 5 ms', c: C_GOOD },
      { t: 'Jetson Orin GPU', v: '12 ms', c: C_GOOD },
      { t: '控制频率', v: HZ + ' Hz（dt = ' + fmt(DT, 2) + ' s）', c: C_ACCENT }
    ].map(function (c0, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 240;
      g.appendChild(paint(svgEl('rect', { x: x, y: 216, width: 228, height: 48, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, c0.c));
      g.appendChild(svgText(x + 16, 236, c0.t, 'demo-x-mut', 10));
      g.appendChild(paint(svgText(x + 212, 254, c0.v, 'demo-x-mono', 11.5, 'end'), c0.c));
      s.appendChild(g);
      return { g: g, at: 5.6 + k * 0.7 };
    });

    var band = svgEl('g', {});
    band.appendChild(paint(svgEl('rect', { x: 40, y: 278, width: 720, height: 64, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_BORDER));
    band.appendChild(svgText(400, 298, '同一个控制器，同一套 token：速度 / 方向 / 风格都只是规划器出的参考动作，没有一条新 reward', 'demo-x-ink2', 10.5, 'middle'));
    var BX0 = 120,
      BX1 = 458;
    band.appendChild(paint(svgEl('line', { x1: BX0, y1: 324, x2: BX1, y2: 324, 'stroke-width': 2 }), null, C_BORDER));
    band.appendChild(svgText(BX0 - 8, 328, '0 m/s', 'demo-x-mut', 9.5, 'end'));
    band.appendChild(svgText(BX1 + 14, 328, '6 m/s 任意方向', 'demo-x-mut', 9.5));
    var knob = paint(svgEl('circle', { cy: 324, r: 6, 'stroke-width': 1.5 }), C_ACCENT, C_SURFACE2);
    band.appendChild(knob);
    band.appendChild(svgText(700, 328, '蹲 / 跪 / 爬 0–0.5 m/s', 'demo-x-mut', 9.5, 'middle'));
    s.appendChild(band);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 376, '短到能立刻 replan，长到能保持自然过渡', null, 15, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 400, '人给的是「右转 / 加速 / 换风格」这种稀疏命令，逐帧 motion 由规划器补齐：' + SEG_MIN_STEPS + ' – ' + SEG_MAX_STEPS + ' 个控制步一段', 'demo-x-mut', 10.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      segs.forEach(function (sg) { setOpacity(sg.g, seg(t, sg.at, sg.at + 0.5)); });
      setOpacity(cut, seg(t, 4.2, 4.9));
      lat.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.5)); });
      setOpacity(band, seg(t, 8.0, 8.8));
      knob.setAttribute('cx', (BX0 + (BX1 - BX0) * ease(seg(t, 8.6, 11.0))).toFixed(1));
      setOpacity(foot, seg(t, 10.4, 11.2));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 6 幕：System-1 + System-2 ──────────────────────────────────────
  function buildSceneSystems() {
    var s = sceneSvg(
      '300 条 VR 三点遥操数据微调 GR00T N1.5，让 VLA 输出与 teleop 完全相同格式的命令，' +
        '复用已有的 teleop encoder；苹果取放 20 次成功 ' + VLA_OK + ' 次'
    );
    s.appendChild(svgText(56, 26, 'System-2 想，System-1 做：VLA 走的是已经存在的 teleop 接口', 'demo-x-ink2', 13.5));

    var arrow = K.arrowMarker(s, 'sonic-x-arrow-sys', C_ACCENT);
    var cols = [
      {
        t: 'System 2 · GR00T N1.5', c: C_WARN,
        rows: ['视觉 + 语言 → 动作意图', '300 条 VR 三点遥操数据微调', '慢、但会「想」']
      },
      {
        t: '接口：teleop 格式命令', c: C_ACCENT,
        rows: ['头 / 双手 SE(3) + 腰高 + nav', '复用第 3 幕那一路 teleop encoder', '控制器一行没改']
      },
      {
        t: 'System 1 · SONIC', c: C_GOOD,
        rows: [HZ + ' Hz 全身反应控制', '29 DOF 关节目标 → Unitree G1', '快、稳、不问为什么']
      }
    ].map(function (c0, k) {
      var g = svgEl('g', {});
      var x = 36 + k * 248;
      g.appendChild(paint(svgEl('rect', { x: x, y: 56, width: 228, height: 128, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, c0.c));
      g.appendChild(paint(svgText(x + 114, 80, c0.t, null, 11.5, 'middle'), c0.c));
      c0.rows.forEach(function (r, i) {
        g.appendChild(svgText(x + 114, 106 + i * 22, r, 'demo-x-mut', 9.5, 'middle'));
      });
      s.appendChild(g);
      if (k < 2) {
        s.appendChild(paint(svgEl('path', { d: polyPath([[x + 232, 120], [x + 244, 120]]), fill: 'none', 'stroke-width': 1.8, 'marker-end': arrow }), null, C_ACCENT));
      }
      return { g: g, at: 0.6 + k * 1.4 };
    });

    var cards = [
      { t: 'VLA 苹果取放（20 trial）', a: VLA_OK + ' / ' + VLA_TRIALS + ' 成功', b: fmt(VLA_RATE * 100, 0) + '%', c: C_GOOD },
      { t: 'VR 遥操端到端延迟', a: '121.9 ms', b: '95 分位 13.3 cm / 0.27 rad', c: C_ACCENT },
      { t: '真机零样本跟踪', a: '50 / 50 条序列', b: '舞蹈 / 跳跃 / loco-manip', c: C_GOOD }
    ].map(function (c0, k) {
      var g = svgEl('g', {});
      var y = 200 + k * 58;
      g.appendChild(paint(svgEl('rect', { x: 40, y: y, width: 720, height: 50, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, c0.c));
      g.appendChild(svgText(58, y + 30, c0.t, 'demo-x-ink2', 11));
      g.appendChild(paint(svgText(452, y + 30, c0.a, 'demo-x-mono', 12.5, 'middle'), c0.c));
      g.appendChild(svgText(744, y + 30, c0.b, 'demo-x-mut', 10, 'end'));
      s.appendChild(g);
      return { g: g, at: 5.0 + k * 1.3 };
    });

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 400, 'VLA 不需要知道 29 个关节怎么动，它只要会说 teleop 那门语言', null, 15, 'middle'), C_ACCENT));
    s.appendChild(foot);

    function draw(t) {
      cols.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.6)); });
      cards.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.6)); });
      setOpacity(foot, seg(t, 10.2, 11.0));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 7 幕：从数据到实机的闭环与源码落点 ─────────────────────────────
  var S7_STAGES = [
    { t: '① 数据准备', cmd: 'convert_soma_csv_to_motion_lib.py', d: 'Bones-SEED CSV → PKL', d2: '~142K → ~130K（−8.7%）', c: C_MUTED },
    { t: '② 训练', cmd: '+exp=.../sonic_release', d: 'PPO + 5 项 aux loss', d2: '4096 envs · ≥64 GPU', c: C_ACCENT },
    { t: '③ 评估', cmd: 'eval_agent_trl.py', d: '++eval_callbacks=im_eval', d2: 'success_rate > 0.98', c: C_ACCENT },
    { t: '④ 导出 ONNX', cmd: '+export_onnx_only=true', d: '三路 encoder + 共享 decoder', d2: '5 个 .onnx 文件', c: C_GOOD },
    { t: '⑤ 实机', cmd: 'gear_sonic_deploy/policy/', d: 'C++ · Jetson Orin', d2: HZ + ' Hz 上机', c: C_GOOD }
  ];

  function buildSceneLoop() {
    var s = sceneSvg(
      'SONIC 官方仓库 NVlabs/GR00T-WholeBodyControl 的 gear_sonic/ 子树，' +
        '从数据准备、训练、评估、ONNX 导出一路到 C++ 实机部署的五步闭环'
    );
    s.appendChild(svgText(56, 26, '闭环与源码落点：gear_sonic/ 一条路走到 Jetson Orin', 'demo-x-ink2', 13));

    var arrow = K.arrowMarker(s, 'sonic-x-arrow-loop', C_BORDER);
    var cards = S7_STAGES.map(function (c0, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 148;
      g.appendChild(paint(svgEl('rect', { x: x, y: 56, width: 128, height: 160, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, c0.c));
      g.appendChild(paint(svgText(x + 64, 80, c0.t, null, 11.5, 'middle'), c0.c));
      g.appendChild(paint(svgEl('rect', { x: x + 8, y: 92, width: 112, height: 40, rx: 6, 'stroke-width': 1 }), C_SURFACE, C_BORDER));
      g.appendChild(svgText(x + 64, 108, c0.cmd.slice(0, 22), 'demo-x-mono', 7.5, 'middle'));
      if (c0.cmd.length > 22) g.appendChild(svgText(x + 64, 122, c0.cmd.slice(22), 'demo-x-mono', 7.5, 'middle'));
      g.appendChild(svgText(x + 64, 156, c0.d, 'demo-x-mut', 9, 'middle'));
      g.appendChild(svgText(x + 64, 176, c0.d2, 'demo-x-mut', 9, 'middle'));
      s.appendChild(g);
      if (k < 4) {
        s.appendChild(paint(svgEl('path', { d: polyPath([[x + 132, 136], [x + 145, 136]]), fill: 'none', 'stroke-width': 1.5, 'marker-end': arrow }), null, C_BORDER));
      }
      return { g: g, at: 0.6 + k * 1.2 };
    });

    var sizes = svgEl('g', {});
    sizes.appendChild(paint(svgEl('rect', { x: 40, y: 234, width: 720, height: 62, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_WARN));
    sizes.appendChild(svgText(58, 254, '整套网络只有隐层之间的权重就有：', 'demo-x-ink2', 10.5));
    sizes.appendChild(paint(svgText(58, 276,
      '3 × encoder ' + mega(P_ENC3) + ' · g1_dyn ' + mega(P_DYN) + ' · g1_kin ' + mega(P_KIN) + ' · critic ' + mega(P_DYN) + ' → ' + mega(P_HIDDEN),
      'demo-x-mono', 11), C_WARN));
    sizes.appendChild(svgText(744, 288, '再加输入层 / 输出头，就是论文报告的 ≈ 42 M', 'demo-x-mut', 9.5, 'end'));
    s.appendChild(sizes);

    var rail = [[108, 316], [400, 316], [700, 316]];
    var railPath = paint(svgEl('path', { d: polyPath(rail), fill: 'none', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }), null, C_BORDER);
    s.appendChild(railPath);
    var tok = paint(svgEl('circle', { r: 6, 'stroke-width': 1.6 }), C_ACCENT, C_SURFACE2);
    s.appendChild(tok);
    var railLbl = svgText(400, 338, '700 h MoCap 的动作能力，一路压成每帧 ' + FSQ_BITS + ' bit 的 token', 'demo-x-mut', 10, 'middle');
    s.appendChild(railLbl);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 374, 'SONIC = 把 motion tracking 当基础任务放大 + 一个通用 token 接口', null, 15.5, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 398, '密集监督换来规模红利，统一 token 换来「新接口零控制器改动」——GR00T 体系的底层那块拼图', 'demo-x-mut', 10.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      cards.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.6)); });
      setOpacity(sizes, seg(t, 6.2, 7.0));
      var on = seg(t, 8.0, 8.6);
      setOpacity(railPath, on);
      setOpacity(tok, on);
      setOpacity(railLbl, on);
      var pt = pointOn(rail, ease(seg(t, 8.2, 11.0)));
      tok.setAttribute('cx', pt[0].toFixed(1));
      tok.setAttribute('cy', pt[1].toFixed(1));
      setOpacity(foot, seg(t, 11.2, 12.0));
    }

    return { el: s, draw: draw };
  }

  var SONIC_SCENES = [
    {
      title: '任务选错了',
      dur: 13,
      build: buildSceneTask,
      cues: [
        { at: 0.4, s: '人形控制迟迟没吃到规模红利，SONIC 说症结不在规模，在**任务**。' },
        { at: 1.9, s: '① 走路、跳舞、起身、遥操各写一套 reward，越训越容易过拟合到某种 reward 形态。' },
        { at: 3.2, s: '② teleop / 视频 / 语言 / VLA 各搭一条 pipeline，控制器没法共用。' },
        { at: 4.6, s: '③ 现有 motion tracker 只在自家训练分布上能跑，换个 motion 域立刻崩。' },
        { at: 6.0, s: '换成 **motion tracking**：监督是逐帧的，来源是 MoCap，不用手写一条 reward。' },
        { at: 7.4, s: '而且所有输入都能编成同一套 token —— 新增模态不需要重训控制器。' },
        { at: 11.0, s: '**不是规模不管用，是过去那些任务不配被放大。**' }
      ]
    },
    {
      title: '三轴一起放大',
      dur: 12,
      build: buildSceneScale,
      cues: [
        { at: 0.4, s: '把任务选对之后，SONIC 沿三个轴同时放大。' },
        { at: 1.0, s: '**数据**：从 LaFAN 量级的 0.4 M 帧一路到 100 M+ 帧，约 700 小时 MoCap，250 倍。' },
        { at: 2.6, s: '**参数**：1.2 M → 5 M → 15 M → 42 M，做法只是同比放宽每个 MLP 的隐层。' },
        { at: 4.2, s: '**算力**：9 k 到 32 k GPU·h，最大一次 128 张卡跑 3 天。' },
        { at: 6.4, s: '三条曲线都单调下降，**数据轴收益最大** —— 这是论文最核心的一句结论。' },
        { at: 8.2, s: '官方给的复现达标线：100 k 迭代后 `success_rate` > 0.98、`mpjpe_l` < 29 mm。' },
        { at: 10.2, s: '全程没有换算子，backbone 一直是 SiLU 的密集 MLP。' }
      ]
    },
    {
      title: 'Universal token space',
      dur: 14,
      build: buildSceneToken,
      cues: [
        { at: 0.4, s: '三路异构输入：机器人本体的未来 10 帧、VR 三点的 SE(3)、SMPL 的全身姿态。' },
        { at: 2.0, s: '各走一条 `[2048, 1024, 512, 512]` 的 MLP encoder，激活都是 SiLU。' },
        { at: 4.0, s: '汇进同一个 **FSQ 量化器**：latent 32 维、每帧 2 个 token、每维 32 个 level。' },
        { at: 5.4, s: '出来的是 $' + FSQ_TOKENS + ' \\times ' + FSQ_DIM + ' = ' + FSQ_FLAT + '$ 维离散 token，约 $' + FSQ_BITS + '$ bit 一帧。' },
        { at: 6.6, s: 'Token 拼上本体感觉，交给**唯一那个** `g1_dyn` decoder，解出 29 个关节目标。' },
        { at: 7.6, s: '`g1_kin` decoder 只在训练时挂着：把 token 还原回参考动作，防止量化把运动学信息丢了。' },
        { at: 9.0, s: '瓶颈这么窄，「压缩长上下文」的活已经被量化器干完，decoder 只做单帧控制 —— 所以不需要 Transformer。' },
        { at: 12.4, s: '**新增一个输入模态 = 新增一条 encoder**，控制器那一侧一行不改。' }
      ]
    },
    {
      title: '五项 aux loss 焊住潜空间',
      dur: 12,
      build: buildSceneAlign,
      cues: [
        { at: 0.4, s: '三路 encoder 凭什么保证落在「同一个」空间？靠五项辅助损失把它们焊住。' },
        { at: 2.0, s: '`g1_recon`（系数 0.01）：把 G1 的 token 用 kin decoder 还原回参考动作。' },
        { at: 3.0, s: '三项两两对齐，系数都是 **1.0**：G1 ↔ SMPL、G1 ↔ Teleop、Teleop ↔ SMPL。' },
        { at: 5.4, s: '再加一项 cycle consistency：SMPL 编码成 token、解成 G1 动作、重新编码，还得回到原地。' },
        { at: 6.2, s: '配置就在 `aux_losses/universal_token/g1_recon_and_all_latent.yaml`，五行系数一目了然。' },
        { at: 9.4, s: '没有这几项，三路各占潜空间一角，**共享 decoder 就白设了**。' },
        { at: 10.4, s: '这是 VLA / VR / 视频能「零控制器改动」接进来的工程保证。' }
      ]
    },
    {
      title: '实时 Kinematic Planner',
      dur: 13,
      build: buildScenePlanner,
      cues: [
        { at: 0.4, s: '人给的命令是稀疏的：「右转」「加速」「换风格」，不是逐帧 motion。' },
        { at: 1.4, s: '规划器自回归地把它展开成 $' + SEG_MIN + '$ – $' + SEG_MAX + '$ 秒的参考片段。' },
        { at: 3.0, s: '按 50 Hz 换算，一段就是 ' + SEG_MIN_STEPS + ' 到 ' + SEG_MAX_STEPS + ' 个控制步 —— 短到能立刻改，长到过渡还自然。' },
        { at: 4.2, s: '用户中途改命令：$\\le 100\\ \\text{ms}$ 内重新规划，也就是 **' + REPLAN_STEPS + ' 个控制步**。' },
        { at: 5.6, s: '推理开销撑得住：笔记本 < 5 ms，Jetson Orin GPU 12 ms。' },
        { at: 8.0, s: '于是速度、方向、风格全都只是「规划器出了什么参考动作」，没有一条新 reward。' },
        { at: 10.4, s: '0 – 6 m/s 任意方向、醉步 / 伤步 / 潜行、拳击、蹲跪爬 0 – 0.5 m/s —— 同一个控制器。' }
      ]
    },
    {
      title: 'System-1 + System-2',
      dur: 13,
      build: buildSceneSystems,
      cues: [
        { at: 0.4, s: 'System 2 是 **GR00T N1.5** 这样的 VLA：看得懂画面和语言，但慢。' },
        { at: 1.6, s: '只用 300 条 VR 三点遥操数据微调，就让它输出 **和 teleop 完全相同格式**的命令。' },
        { at: 3.0, s: 'System 1 就是 SONIC：$' + HZ + '\\ \\text{Hz}$ 全身反应控制，直接驱动 Unitree G1。' },
        { at: 5.0, s: '苹果取放 20 次试验成功 ' + VLA_OK + ' 次，95%。' },
        { at: 6.3, s: 'VR 遥操端到端延迟 121.9 ms，95 分位 13.3 cm 位置误差、0.27 rad 朝向误差。' },
        { at: 7.6, s: '真机零样本：50 条舞蹈 / 跳跃 / loco-manipulation 序列全部跟完。' },
        { at: 10.2, s: '**VLA 不需要知道 29 个关节怎么动，它只要会说 teleop 那门语言。**' }
      ]
    },
    {
      title: '闭环与源码落点',
      dur: 13,
      build: buildSceneLoop,
      cues: [
        { at: 0.4, s: '官方实现在 `NVlabs/GR00T-WholeBodyControl` 的 `gear_sonic/` 子树，五步走完。' },
        { at: 1.2, s: '① `convert_soma_csv_to_motion_lib.py` 把 Bones-SEED CSV 转成 motion_lib，再过滤掉 G1 做不了的约 8.7%。' },
        { at: 2.6, s: '② `+exp=manager/universal_token/all_modes/sonic_release`：PPO 加五项 aux loss，4096 个并行环境。' },
        { at: 4.0, s: '③ `eval_agent_trl.py ++eval_callbacks=im_eval` 出 MPJPE 与成功率，也能渲视频。' },
        { at: 5.2, s: '④ `+export_onnx_only=true` 导出 5 个 onnx：三路 encoder 各一份、合体一份、共享 decoder 一份。' },
        { at: 6.2, s: '把各层隐层权重加起来：三路 encoder ' + mega(P_ENC3) + '、`g1_dyn` ' + mega(P_DYN) + '、`g1_kin` ' + mega(P_KIN) + '、critic ' + mega(P_DYN) + '。' },
        { at: 8.2, s: '⑤ `gear_sonic_deploy/policy/` 里的 C++ 在 Jetson Orin 上按 ' + HZ + ' Hz 跑同一对 encoder + decoder。' },
        { at: 11.2, s: '**SONIC = 把 motion tracking 当基础任务放大 + 一个通用 token 接口。**' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '七幕动画：SONIC 全流程速览',
      sub: '约 90 秒自动播放。空格播放/暂停，← → 换幕；画面里的换算数字都由配置现算，不是手写。',
      ariaLabel: 'SONIC 七幕讲解动画',
      notes: [
        '取数依据：第三幕的 token 宽度与码率由 `sonic_release` 的 FSQ 配置现算 —— ' +
          '`num_fsq_levels: 32`、latent 32 维、`max_num_tokens: 2`，所以每帧 $2 \\times 32 = 64$ 维、' +
          '$64 \\times \\log_2 32 = ' + FSQ_BITS + '$ bit；第五幕的「' + REPLAN_STEPS + ' 个控制步」「' +
          SEG_MIN_STEPS + ' – ' + SEG_MAX_STEPS + ' 步」由 Isaac Lab 的 $dt = 0.02\\ \\text{s}$（' + HZ + ' Hz）换算。',
        '第七幕的参数量是 `mlpParams()` 把各配置里 `hidden_dims` 相邻两层相乘再求和的结果，' +
          '**只含隐层之间的权重**（encoder / `g1_kin` 是 `[2048, 1024, 512, 512]`，`g1_dyn` / critic 是 ' +
          '`[2048, 2048, 1024, 1024, 512, 512]`）；输入层与输出头要知道 obs 维度才算得出来，' +
          '所以这里的 ' + mega(P_HIDDEN) + ' 比笔记 §模型架构 那个「≈ 42 M」小一截，两者不矛盾。',
        '其余数字（0.4 M → 100 M+ 帧、1.2 M → 42 M、9 k – 32 k GPU·h、121.9 ms、20 trial 95%、' +
          '50 条真机序列、success_rate > 0.98 / mpjpe_l < 29 mm）都是论文与官方文档报告的原值，' +
          '直接引自本笔记对应小节，**不是浏览器里跑出来的**，画面上的图形只是示意。'
      ],
      scenes: SONIC_SCENES
    });
  }

  K.mount({
    'sonic-explainer': buildExplainerDemo
  });
})();
