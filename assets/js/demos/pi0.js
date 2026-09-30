/* π0 demos for
 * papers/03_High_Impact_Selection/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["pi0"]`, after assets/js/demos/kit.js. The note itself only holds
 * empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   pi0-explainer — 七幕讲解动画：通才策略的三道坎 → 一个 Transformer 两套权重 → 分块因果掩码与 KV 缓存
 *                   → 流匹配从噪声走到动作块 → 动作块与推理预算 → 数据与配方 → 实验读数与边界
 *   pi0-video     — 同样七幕的配音竖屏视频（可下载）
 */

(function () {
  'use strict';

  var K = window.PaperDemoKit;
  var fmt = K.fmt,
    clamp = K.clamp,
    svgEl = K.svgEl,
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

  // ─── shared numbers (the note's worked example uses the same ones) ──────
  /* 附录 B：PaliGemma（Gemma 2B）与动作专家的配置 */
  var VLM = { width: 2048, mlp: 16384, depth: 18, params: '≈3B' };
  var EXPERT = { width: 1024, mlp: 4096, depth: 18, params: '≈300M' };
  var H = 50;

  /* 第四幕：一维玩具流匹配 —— 噪声 ε = −1.2，目标 A = 0.8，10 步欧拉（δ = 0.1） */
  var FLOW = (function () {
    var eps = -1.2, a = 0.8, steps = 10;
    var v = a - eps;
    var path = [eps];
    for (var k = 1; k <= steps; k++) path.push(path[k - 1] + v / steps);
    /* p(τ) = Beta((s − τ)/s; 1.5, 1)，s = 0.999：x = (s−τ)/s 的 CDF 是 x^1.5 */
    var s = 0.999;
    var xHalf = (s - 0.5) / s;
    var fracNoisy = 1 - Math.pow(xHalf, 1.5);
    var meanTau = s * (1 - 1.5 / 2.5);
    return { eps: eps, a: a, v: v, steps: steps, path: path, s: s, fracNoisy: fracNoisy, meanTau: meanTau };
  })();

  /* 第五幕：附录 D Table I（RTX 4090，3 路相机）与执行节拍 */
  var TIMING = { img: 14, prefix: 32, flow: 27, net: 13 };
  TIMING.onboard = TIMING.img + TIMING.prefix + TIMING.flow;
  TIMING.offboard = TIMING.onboard + TIMING.net;
  var EXEC = [
    { hz: 50, run: 25 },
    { hz: 20, run: 16 }
  ];
  EXEC.forEach(function (e) { e.every = e.run / e.hz; e.chunkSec = H / e.hz; });

  /* 第六幕：§V-A 的采样权重 n^0.43 —— 两个组合，样本数 100M 对 1M */
  var WEIGHT = (function () {
    var nBig = 100, nSmall = 1, p = 0.43;
    return { nBig: nBig, nSmall: nSmall, p: p, ratio: Math.pow(nBig / nSmall, p) };
  })();
  var DATA = { own: 903, single: 106, dual: 797, openPct: 9.1, tasks: 68, configs: 7, hours: 10000, preSteps: 700, paritySteps: 160 };

  // ─── small drawing helpers ─────────────────────────────────────────────
  function box(x, y, w, h, tone, width) {
    return paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 8, 'stroke-width': width || 1.4 }), C_SURFACE2, tone || C_BORDER);
  }
  function line(x1, y1, x2, y2, tone, width, dash, marker) {
    var attrs = { x1: x1, y1: y1, x2: x2, y2: y2, 'stroke-width': width || 1.3 };
    if (dash) attrs['stroke-dasharray'] = dash;
    if (marker) attrs['marker-end'] = marker;
    return paint(svgEl('line', attrs), null, tone || C_MUTED);
  }
  function readoutChip(s, cx, y, w, label, value, color) {
    var g = svgEl('g', {});
    g.appendChild(paint(svgEl('rect', { x: cx - w / 2, y: y, width: w, height: 34, rx: 6, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    g.appendChild(svgRich(cx - w / 2 + 12, y + 18, label, { size: 10.5, cls: 'demo-x-mut', w: w * 0.64 }));
    g.appendChild(paint(svgText(cx + w / 2 - 12, y + 22, value, 'demo-x-mono', 11.5, 'end'), color || C_ACCENT));
    s.appendChild(g);
    return g;
  }
  function card(s, x, y, w, h, tone, title, lines) {
    var g = svgEl('g', {});
    g.appendChild(paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 10, 'stroke-width': 1.8 }), C_SURFACE2, tone));
    g.appendChild(svgRich(x + 14, y + 24, title, { size: 12.5, w: w - 24 }).setTone(tone));
    lines.forEach(function (ln, i) {
      g.appendChild(svgRich(x + 14, y + 52 + i * 22, ln, { size: 10.5, cls: 'demo-x-ink2', w: w - 24 }));
    });
    s.appendChild(g);
    return g;
  }

  // ── scene 1: 通才策略的三道坎 ──
  function buildSceneGaps() {
    var s = sceneSvg('π0 要同时解决规模、架构和训练配方三件事；自回归离散动作的 VLA 难以输出 50 Hz 的连续动作块');
    s.appendChild(svgText(40, 30, '论文列出的三道坎：规模、架构、配方（§I）', 'demo-x-ink2', 13.5));
    var c1 = card(s, 30, 50, 240, 150, C_ACCENT, '① 规模', ['约 **10,000 小时**自有灵巧操作数据', '7 种机器人构型、68 个任务', '再加 OXE 等开源数据']);
    var c2 = card(s, 280, 50, 240, 150, C_GOOD, '② 架构', ['VLM 继承互联网语义', '**流匹配**动作专家输出连续动作', '一次一整块，最高 50 Hz']);
    var c3 = card(s, 530, 50, 240, 150, C_WARN, '③ 配方', ['预训练：广而杂，学会纠错', '后训练：少而精，学会流畅', '和大语言模型的两阶段同构']);

    var cmp = svgEl('g', {});
    cmp.appendChild(svgText(40, 236, '对照：自回归离散动作的 VLA（OpenVLA 一类）', 'demo-x-mut', 11));
    var toks = [];
    for (var i = 0; i < 12; i++) {
      var r = paint(svgEl('rect', { x: 40 + i * 30, y: 246, width: 24, height: 22, rx: 3, 'stroke-width': 1 }), C_SURFACE2, C_BAD);
      cmp.appendChild(r);
      toks.push(r);
    }
    cmp.appendChild(svgText(410, 262, '一个 token 一次前向，不支持动作块', 'demo-x-mono', 10.5)).style.fill = C_BAD;
    cmp.appendChild(svgText(40, 300, 'π0：一次生成 H = 50 步的连续动作块', 'demo-x-mut', 11));
    var chunk = paint(svgEl('rect', { x: 40, y: 310, width: 0, height: 22, rx: 4 }), C_GOOD);
    cmp.appendChild(chunk);
    cmp.appendChild(paint(svgText(410, 326, '10 步积分出一整块，50 Hz 下覆盖 1 秒', 'demo-x-mono', 10.5), C_GOOD));
    s.appendChild(cmp);

    var foot = svgRich(400, 392, '贡献是**集成**的：架构 + 预训练 / 后训练配方 + 大规模真机实验', { size: 13.5, anchor: 'middle', w: 760 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(c1, seg(t, 0.8, 1.4));
      setOpacity(c2, seg(t, 2.4, 3.0));
      setOpacity(c3, seg(t, 4.2, 4.8));
      setOpacity(cmp, seg(t, 6.2, 6.8));
      var k = Math.floor(12 * seg(t, 6.6, 8.6));
      toks.forEach(function (r, i) { r.style.fill = i < k ? 'var(--demo-bad)' : ''; r.style.fillOpacity = i < k ? 0.45 : 1; });
      chunk.setAttribute('width', (360 * ease(seg(t, 8.8, 9.4))).toFixed(1));
      setOpacity(foot, seg(t, 10.4, 11.2));
    }
    return { el: s, draw: draw };
  }

  // ── scene 2: 一个 Transformer，两套权重 ──
  function buildSceneExperts() {
    var s = sceneSvg('图像和文字走 PaliGemma 的大权重，状态和动作走 3 亿参数的动作专家；两套权重只在自注意力层交互');
    s.appendChild(svgText(40, 30, '一个 Transformer、两套权重（两专家的 MoE）：token 按类型路由', 'demo-x-ink2', 13.5));

    var seq = svgEl('g', {});
    var parts = [
      { n: '图像 × 2–3 路', w: 190, tone: C_ACCENT },
      { n: '语言指令', w: 120, tone: C_ACCENT },
      { n: '状态 q', w: 70, tone: C_GOOD },
      { n: '带噪动作 × 50', w: 280, tone: C_GOOD }
    ];
    var x = 40;
    parts.forEach(function (p) {
      seq.appendChild(paint(svgEl('rect', { x: x, y: 50, width: p.w - 6, height: 30, rx: 5, 'stroke-width': 1.4, 'fill-opacity': 0.9 }), C_SURFACE2, p.tone));
      seq.appendChild(svgRich(x + (p.w - 6) / 2, 70, p.n, { size: 10.5, anchor: 'middle', w: p.w - 10 }).setTone(p.tone));
      p.x = x;
      x += p.w;
    });
    s.appendChild(seq);

    var vlm = svgEl('g', {});
    vlm.appendChild(box(40, 110, 304, 150, C_ACCENT, 2));
    vlm.appendChild(paint(svgText(192, 134, 'VLM 主干：PaliGemma（Gemma 2B）', null, 12, 'middle'), C_ACCENT));
    vlm.appendChild(svgRich(56, 162, '宽度 ' + VLM.width + '，MLP ' + VLM.mlp + '，' + VLM.depth + ' 层', { size: 10.5, cls: 'demo-x-ink2', w: 280 }));
    vlm.appendChild(svgRich(56, 186, '从 PaliGemma 初始化（约 3B，含 SigLIP）', { size: 10.5, cls: 'demo-x-ink2', w: 280 }));
    vlm.appendChild(svgRich(56, 210, '只处理图像与文字 token', { size: 10.5, cls: 'demo-x-ink2', w: 280 }));
    s.appendChild(vlm);

    var exp = svgEl('g', {});
    exp.appendChild(box(456, 110, 304, 150, C_GOOD, 2));
    exp.appendChild(paint(svgText(608, 134, '动作专家（从零初始化）', null, 12, 'middle'), C_GOOD));
    exp.appendChild(svgRich(472, 162, '宽度 ' + EXPERT.width + '，MLP ' + EXPERT.mlp + '，' + EXPERT.depth + ' 层', { size: 10.5, cls: 'demo-x-ink2', w: 280 }));
    exp.appendChild(svgRich(472, 186, '约 300M 参数，只处理 $q_t$ 与 $A_t^\\tau$', { size: 10.5, cls: 'demo-x-ink2', w: 280 }));
    exp.appendChild(svgRich(472, 210, '输出经线性层解码成速度场 $v_\\theta$', { size: 10.5, cls: 'demo-x-ink2', w: 280 }));
    s.appendChild(exp);

    var attn = svgEl('g', {});
    attn.appendChild(paint(svgEl('rect', { x: 350, y: 150, width: 100, height: 70, rx: 10, 'stroke-width': 2, 'stroke-dasharray': '5 3' }), C_SURFACE, C_WARN));
    attn.appendChild(paint(svgText(400, 180, '共享', null, 12, 'middle'), C_WARN));
    attn.appendChild(paint(svgText(400, 200, '自注意力', null, 12, 'middle'), C_WARN));
    attn.appendChild(line(344, 185, 350, 185, C_WARN, 2));
    attn.appendChild(line(450, 185, 456, 185, C_WARN, 2));
    s.appendChild(attn);

    var chipA = readoutChip(s, 200, 282, 320, '合计参数（§IV）', '3.3B', C_ACCENT);
    var chipB = readoutChip(s, 600, 282, 320, '对照 π0-small：无 VLM 初始化', '470M', C_MUTED);
    var foot = svgRich(400, 360, '宽度与 MLP 维可以不同，因为两套权重**只在注意力里**相遇 —— 所以动作专家能缩小，积分 10 次也不慢', { size: 12.5, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(seq, seg(t, 0.4, 1.0));
      setOpacity(vlm, seg(t, 2.0, 2.6));
      setOpacity(exp, seg(t, 4.4, 5.0));
      setOpacity(attn, seg(t, 6.8, 7.4));
      setOpacity(chipA, seg(t, 8.8, 9.4));
      setOpacity(chipB, seg(t, 9.2, 9.8));
      setOpacity(foot, seg(t, 10.8, 11.6));
    }
    return { el: s, draw: draw };
  }

  // ── scene 3: 分块因果掩码与 KV 缓存 ──
  function buildSceneMask() {
    var s = sceneSvg('三块的分块因果掩码：图文块看不到后面的新输入，状态自成一块可以缓存，动作块能看到全部；推理时只重算 50 个动作 token');
    s.appendChild(svgText(40, 30, '附录 B：三块的分块因果掩码（块内双向，块间只能看前面）', 'demo-x-ink2', 13.5));
    var names = ['图像 + 文字', '状态 q', '动作 × 50'];
    var tones = [C_ACCENT, C_GOOD, C_GOOD];
    var M0x = 150, M0y = 80, CW = 90, CH = 66;
    var grid = svgEl('g', {});
    grid.appendChild(svgText(M0x, M0y - 12, '列 = 被看的 key，行 = 发问的 query', 'demo-x-mut', 10));
    var cells = [];
    for (var r = 0; r < 3; r++) {
      grid.appendChild(paint(svgText(M0x - 10, M0y + r * CH + 38, names[r], null, 11, 'end'), tones[r]));
      for (var c = 0; c < 3; c++) {
        var ok = c <= r;
        var cell = paint(svgEl('rect', { x: M0x + c * CW, y: M0y + r * CH, width: CW - 4, height: CH - 4, rx: 5, 'fill-opacity': ok ? 0.35 : 0.15 }), ok ? C_GOOD : C_BAD);
        grid.appendChild(cell);
        grid.appendChild(paint(svgText(M0x + c * CW + (CW - 4) / 2, M0y + r * CH + 36, ok ? '可见' : '屏蔽', null, 11, 'middle'), ok ? C_GOOD : C_BAD));
        cells.push({ el: cell, r: r });
      }
    }
    for (var cc = 0; cc < 3; cc++) grid.appendChild(svgText(M0x + cc * CW + (CW - 4) / 2, M0y + 3 * CH + 14, names[cc], 'demo-x-mut', 10, 'middle'));
    s.appendChild(grid);

    var why = svgEl('g', {});
    [
      ['图文块不看后面：', '减少与 PaliGemma 预训练的分布偏移', C_ACCENT],
      ['状态单独一块：', '积分过程中不变，K、V 可以缓存', C_GOOD],
      ['动作块看全部：', '块内双向，50 个动作互相协调', C_GOOD]
    ].forEach(function (row, k) {
      var y = 96 + k * 64;
      why.appendChild(box(450, y - 22, 320, 50, row[2], 1.4));
      why.appendChild(paint(svgText(464, y, row[0], null, 11.5), row[2]));
      why.appendChild(svgText(464, y + 18, row[1], 'demo-x-ink2', 10.5));
    });
    s.appendChild(why);

    var cache = svgEl('g', {});
    cache.appendChild(box(450, 290, 320, 56, C_WARN, 2));
    cache.appendChild(paint(svgText(464, 312, 'KV 缓存：前缀只前向一次', null, 11.5), C_WARN));
    cache.appendChild(svgText(464, 332, '之后 10 次积分只重算 50 个动作 token', 'demo-x-ink2', 10.5));
    s.appendChild(cache);

    var foot = svgRich(400, 396, 'openpi 用 `ar_mask` 的累加和实现：同一块共享一个编号，只能看编号 ≤ 自己的 token', { size: 12.5, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(grid, seg(t, 0.4, 1.0));
      cells.forEach(function (c) { setOpacity(c.el, seg(t, 1.0 + c.r * 1.6, 1.6 + c.r * 1.6)); });
      setOpacity(why, seg(t, 5.8, 6.4));
      setOpacity(cache, seg(t, 8.2, 8.8));
      setOpacity(foot, seg(t, 10.2, 11.0));
    }
    return { el: s, draw: draw };
  }

  // ── scene 4: 流匹配 —— 直线路径、10 步欧拉、偏向高噪声的时间采样 ──
  function buildSceneFlow() {
    var s = sceneSvg('流匹配把噪声和动作连成直线，网络学速度 A 减 ε；推理从纯噪声出发做 10 步欧拉；训练时的 τ 偏向噪声大的一端');
    var f1 = svgMath(210, 34, 'A_t^\\tau = \\tau A_t + (1-\\tau)\\,\\epsilon,\\qquad u = A_t - \\epsilon', { size: 12.5, anchor: 'middle', w: 400 });
    var f2 = svgMath(610, 34, 'A_t^{\\tau+\\delta} = A_t^\\tau + \\delta\\, v_\\theta(A_t^\\tau, o_t),\\ \\ \\delta = 0.1', { size: 12, anchor: 'middle', w: 380 });
    s.appendChild(f1);
    s.appendChild(f2);

    var PX0 = 60, PX1 = 390, PY0 = 290, PY1 = 80;
    function px(tau) { return PX0 + tau * (PX1 - PX0); }
    function py(v) { return PY0 - ((v + 1.5) / 2.6) * (PY0 - PY1); }
    var pl = svgEl('g', {});
    pl.appendChild(paint(svgEl('rect', { x: PX0 - 20, y: PY1 - 16, width: PX1 - PX0 + 40, height: PY0 - PY1 + 50, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    pl.appendChild(line(PX0, py(FLOW.a), PX1, py(FLOW.a), C_GOOD, 1, '4 3'));
    pl.appendChild(line(PX0, py(FLOW.eps), PX1, py(FLOW.eps), C_BAD, 1, '4 3'));
    pl.appendChild(svgRich(PX1 - 4, py(FLOW.a) - 8, '动作 $A = ' + fmt(FLOW.a, 1) + '$', { size: 10, anchor: 'end', w: 120 }).setTone(C_GOOD));
    pl.appendChild(svgRich(PX1 - 4, py(FLOW.eps) + 16, '噪声 $\\epsilon = ' + fmt(FLOW.eps, 1) + '$', { size: 10, anchor: 'end', w: 130 }).setTone(C_BAD));
    pl.appendChild(svgRich(PX0, PY0 + 24, '$\\tau$：0（纯噪声）→ 1（动作）', { size: 10, cls: 'demo-x-mut', w: 250 }));
    s.appendChild(pl);
    var dots = FLOW.path.map(function (v, k) {
      var d = paint(svgEl('circle', { cx: px(k / FLOW.steps), cy: py(v), r: 4.2 }), C_ACCENT);
      s.appendChild(d);
      return d;
    });
    var trail = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 2 }), null, C_ACCENT);
    s.appendChild(trail);

    var QX0 = 450, QX1 = 760, QY0 = 290, QY1 = 110;
    var dens = svgEl('g', {});
    dens.appendChild(paint(svgEl('rect', { x: QX0 - 20, y: QY1 - 46, width: QX1 - QX0 + 40, height: QY0 - QY1 + 80, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    dens.appendChild(svgRich(QX0 - 6, QY1 - 26, '训练时采样 $p(\\tau) = \\mathrm{Beta}\\big(\\tfrac{s-\\tau}{s};\\,1.5,\\,1\\big)$，$s = 0.999$', { size: 10.5, w: 330 }));
    var pts = [];
    for (var i = 0; i <= 100; i++) {
      var tau = (i / 100) * FLOW.s;
      var xx = (FLOW.s - tau) / FLOW.s;
      pts.push([(QX0 + (tau) * (QX1 - QX0)).toFixed(1), (QY0 - 1.5 * Math.sqrt(xx) / 1.6 * (QY0 - QY1)).toFixed(1)]);
    }
    var area = pts.concat([[(QX0 + FLOW.s * (QX1 - QX0)).toFixed(1), QY0], [QX0, QY0]]);
    dens.appendChild(paint(svgEl('path', { d: polyPath(area) + ' Z', 'fill-opacity': 0.25 }), C_WARN));
    dens.appendChild(paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': 2 }), null, C_WARN));
    dens.appendChild(line(QX0 + 0.5 * (QX1 - QX0), QY1, QX0 + 0.5 * (QX1 - QX0), QY0, C_MUTED, 1, '3 3'));
    dens.appendChild(svgRich(QX0, QY0 + 20, '$\\tau = 0$ 噪声大', { size: 10, cls: 'demo-x-mut', w: 120 }));
    dens.appendChild(svgRich(QX1, QY0 + 20, '$\\tau = 1$', { size: 10, anchor: 'end', cls: 'demo-x-mut', w: 80 }));
    s.appendChild(dens);

    var chipA = readoutChip(s, 200, 336, 300, '每步前进 $\\delta \\cdot v$', '0.1 × ' + fmt(FLOW.v, 1) + ' = ' + fmt(FLOW.v / FLOW.steps, 2), C_ACCENT);
    var chipB = readoutChip(s, 600, 336, 320, '落在噪声更大那一半（$\\tau < 0.5$）', fmt(FLOW.fracNoisy * 100, 1) + '%', C_WARN);
    var foot = svgRich(400, 402, '论文 $\\tau$：0 是噪声、1 是动作；**openpi 代码反过来**（time = 1 是噪声，dt = −0.1）', { size: 12.5, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(f1, seg(t, 0.3, 0.9));
      setOpacity(pl, seg(t, 1.2, 1.8));
      setOpacity(f2, seg(t, 3.0, 3.6));
      var n = Math.floor((FLOW.steps + 1) * seg(t, 3.4, 6.4));
      dots.forEach(function (d, k) { setOpacity(d, k < n ? 1 : 0); });
      trail.setAttribute('d', n > 1 ? polyPath(FLOW.path.slice(0, n).map(function (v, k) { return [px(k / FLOW.steps).toFixed(1), py(v).toFixed(1)]; })) : '');
      setOpacity(chipA, seg(t, 5.2, 5.8));
      setOpacity(dens, seg(t, 7.0, 7.6));
      setOpacity(chipB, seg(t, 9.0, 9.6));
      setOpacity(foot, seg(t, 11.0, 11.8));
    }
    return { el: s, draw: draw };
  }

  // ── scene 5: 动作块与推理预算（附录 D） ──
  function buildSceneTiming() {
    var s = sceneSvg('一块 50 步；50 Hz 的机器人执行 25 步后重推理，每 0.5 秒一次；一次推理板载 73 毫秒');
    s.appendChild(svgText(40, 30, '附录 D：一块 H = 50 步，执行一部分就重新推理（开环执行，不做时间集成）', 'demo-x-ink2', 13.5));

    var TX0 = 60, TX1 = 740;
    function tx(sec) { return TX0 + (sec / 2.0) * (TX1 - TX0); }
    var rows = EXEC.map(function (e, k) {
      var y = 70 + k * 88;
      var g = svgEl('g', {});
      g.appendChild(paint(svgText(TX0, y, e.hz + ' Hz 机器人：一块覆盖 ' + fmt(e.chunkSec, 1) + ' 秒，执行 ' + e.run + ' 步（' + fmt(e.every, 1) + ' 秒）后重推理', null, 11), k ? C_WARN : C_GOOD));
      var bars = [];
      for (var c = 0; c * e.every < 2.0 - 1e-6; c++) {
        var x0 = tx(c * e.every);
        var full = paint(svgEl('rect', { x: x0, y: y + 12 + (c % 2) * 18, width: tx(Math.min(2.0, c * e.every + e.chunkSec)) - x0, height: 14, rx: 3, 'fill-opacity': 0.18, 'stroke-width': 1 }), k ? C_WARN : C_GOOD, k ? C_WARN : C_GOOD);
        var used = paint(svgEl('rect', { x: x0, y: y + 12 + (c % 2) * 18, width: tx(Math.min(2.0, c * e.every + e.every)) - x0, height: 14, rx: 3, 'fill-opacity': 0.8 }), k ? C_WARN : C_GOOD);
        g.appendChild(full);
        g.appendChild(used);
        bars.push(g.lastChild);
      }
      s.appendChild(g);
      return g;
    });
    var axis = svgEl('g', {});
    [0, 0.5, 1.0, 1.5, 2.0].forEach(function (sec) {
      axis.appendChild(line(tx(sec), 240, tx(sec), 246, C_MUTED, 1));
      axis.appendChild(svgText(tx(sec), 258, fmt(sec, 1) + ' s', 'demo-x-mono demo-x-mut', 9.5, 'middle'));
    });
    s.appendChild(axis);

    var BX0 = 60, BW = 500;
    function bw(ms) { return (ms / 100) * BW; }
    var budget = svgEl('g', {});
    budget.appendChild(svgText(BX0, 290, '一次推理（RTX 4090，3 路相机）', 'demo-x-mut', 10.5));
    var segs = [['图像编码', TIMING.img, C_ACCENT], ['前缀前向', TIMING.prefix, C_ACCENT], ['10 次动作前向', TIMING.flow, C_GOOD], ['Wi-Fi（仅离机）', TIMING.net, C_MUTED]];
    var xx = BX0;
    segs.forEach(function (sg) {
      budget.appendChild(paint(svgEl('rect', { x: xx, y: 300, width: bw(sg[1]) - 2, height: 24, rx: 3, 'fill-opacity': 0.8 }), sg[2]));
      budget.appendChild(svgText(xx + bw(sg[1]) / 2, 316, sg[1] + ' ms', 'demo-x-mono', 10, 'middle'));
      budget.appendChild(svgText(xx + bw(sg[1]) / 2, 340, sg[0], 'demo-x-mut', 9.5, 'middle'));
      xx += bw(sg[1]);
    });
    s.appendChild(budget);
    var chipA = readoutChip(s, 670, 292, 200, '板载合计', TIMING.onboard + ' ms', C_GOOD);
    var chipB = readoutChip(s, 670, 330, 200, '离机合计', TIMING.offboard + ' ms', C_MUTED);

    var foot = svgRich(400, 396, '73 ms 远小于 0.5 s 的重推理间隔；早期试过时间集成（temporal ensembling），**反而掉性能**', { size: 12.5, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(rows[0], seg(t, 0.6, 1.2));
      setOpacity(rows[1], seg(t, 3.2, 3.8));
      setOpacity(axis, seg(t, 0.6, 1.2));
      setOpacity(budget, seg(t, 5.6, 6.2));
      setOpacity(chipA, seg(t, 7.6, 8.2));
      setOpacity(chipB, seg(t, 8.2, 8.8));
      setOpacity(foot, seg(t, 10.0, 10.8));
    }
    return { el: s, draw: draw };
  }

  // ── scene 6: 数据与配方 ──
  function buildSceneData() {
    var s = sceneSvg('自有数据 9.03 亿个时间步，开源数据占 9.1%；按 n 的 0.43 次方给任务—机器人组合加权；预训练 70 万步，后训练 5 到 100 多小时');
    s.appendChild(svgText(40, 30, '预训练混合（§V-A、图 4）：每个样本是一个 $(o_t, A_t)$ 时间步', 'demo-x-ink2', 13.5)).textContent = '预训练混合（§V-A、图 4）：按时间步计数';

    var mix = svgEl('g', {});
    var MX0 = 40, MW = 720;
    var ownFrac = 1 - DATA.openPct / 100;
    mix.appendChild(paint(svgEl('rect', { x: MX0, y: 52, width: MW * ownFrac, height: 30, rx: 4, 'fill-opacity': 0.75 }), C_GOOD));
    mix.appendChild(paint(svgEl('rect', { x: MX0 + MW * ownFrac, y: 52, width: MW * (1 - ownFrac), height: 30, rx: 4, 'fill-opacity': 0.75 }), C_ACCENT));
    mix.appendChild(svgText(MX0 + 12, 72, 'π 数据集 ' + DATA.own + 'M 步（单臂 ' + DATA.single + 'M + 双臂 ' + DATA.dual + 'M）', null, 11));
    mix.appendChild(svgText(MX0 + MW - 6, 100, '开源 ' + fmt(DATA.openPct, 1) + '%：OXE Magic Soup、Bridge v2、DROID（2–10 Hz）', 'demo-x-mut', 10, 'end'));
    s.appendChild(mix);

    var wt = svgEl('g', {});
    wt.appendChild(box(40, 118, 350, 150, C_WARN, 1.8));
    wt.appendChild(svgRich(56, 142, '采样权重 $\\propto n^{0.43}$（$n$ = 该组合样本数）', { size: 11.5, w: 320 }).setTone(C_WARN));
    wt.appendChild(svgText(56, 172, '组合 A：100M 步　组合 B：1M 步', 'demo-x-ink2', 10.5));
    var natural = paint(svgEl('rect', { x: 56, y: 184, width: 0, height: 14, rx: 3 }), C_BAD);
    var weighted = paint(svgEl('rect', { x: 56, y: 224, width: 0, height: 14, rx: 3 }), C_GOOD);
    wt.appendChild(natural);
    wt.appendChild(weighted);
    wt.appendChild(paint(svgText(376, 196, '按原比例 100 : 1', 'demo-x-mono', 10.5, 'end'), C_BAD));
    wt.appendChild(paint(svgText(376, 236, '加权后 ' + fmt(WEIGHT.ratio, 2) + ' : 1', 'demo-x-mono', 10.5, 'end'), C_GOOD));
    wt.appendChild(svgText(56, 258, '难任务（叠衣服）数据多，被压低但不被丢掉', 'demo-x-mut', 10));
    s.appendChild(wt);

    var pad = svgEl('g', {});
    pad.appendChild(box(410, 118, 350, 150, C_ACCENT, 1.8));
    pad.appendChild(paint(svgText(426, 142, '不同机器人怎么进同一个模型', null, 11.5), C_ACCENT));
    ['状态、动作补零到最大的 18 维', '（双 6 自由度臂 + 2 夹爪 + 底盘 + 升降躯干）', '少于 3 路相机：空位图像打掩码', '语言：任务名 + 约 2 秒一段的分段标注'].forEach(function (tx2, k) {
      pad.appendChild(svgText(426, 170 + k * 22, tx2, 'demo-x-ink2', 10.5));
    });
    s.appendChild(pad);

    var chips = svgEl('g', {});
    s.appendChild(chips);
    var chipA = readoutChip(s, 215, 286, 350, '预训练（主模型）', DATA.preSteps + 'k 步', C_ACCENT);
    var chipB = readoutChip(s, 585, 286, 350, '后训练数据量', '5 h ~ 100+ h', C_GOOD);
    var foot = svgRich(400, 360, '只用高质量数据：不会纠错；只用预训练数据：不够流畅 —— **两段都要**', { size: 13.5, anchor: 'middle', w: 760 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(mix, seg(t, 0.4, 1.0));
      setOpacity(wt, seg(t, 3.0, 3.6));
      natural.setAttribute('width', (200 * ease(seg(t, 3.8, 4.8))).toFixed(1));
      weighted.setAttribute('width', (200 * (WEIGHT.ratio / 100) * ease(seg(t, 5.2, 6.2))).toFixed(1));
      setOpacity(pad, seg(t, 7.0, 7.6));
      setOpacity(chipA, seg(t, 9.0, 9.6));
      setOpacity(chipB, seg(t, 9.4, 10.0));
      setOpacity(foot, seg(t, 11.0, 11.8));
    }
    return { el: s, draw: draw };
  }

  // ── scene 7: 实验读数与边界 ──
  function buildSceneResults() {
    var s = sceneSvg('开箱评测、语言跟随、新任务微调、复杂多阶段任务四组实验，以及论文自己列出的局限');
    s.appendChild(svgText(40, 30, '四组真机实验（§VI，每个条件 10 次试验，按评分细则给部分分）', 'demo-x-ink2', 13.5));
    var cards = [
      card(s, 30, 48, 360, 128, C_GOOD, '① 开箱（只预训练）', ['5 个任务全部最好：叠衬衫、收餐桌、装袋、取吐司', '只训 160k 步的「对齐算力」版也赢过', 'OpenVLA（160k）与 Octo（320k）']),
      card(s, 410, 48, 360, 128, C_ACCENT, '② 语言跟随', ['对照 π0-small（470M，无 VLM 初始化）', 'π0 的指令跟随准确率明显更高', '人给中间指令 / 高层 VLM 给指令都更受益']),
      card(s, 30, 190, 360, 128, C_WARN, '③ 新任务微调（1–10 小时数据）', ['整体好于 OpenVLA、Octo、ACT、DP', '预训练相对从零训练，有时高到 2 倍', '和预训练越像的任务，提升越大']),
      card(s, 410, 190, 360, 128, C_BAD, '④ 复杂多阶段（5–20 分钟）', ['叠衣服、烘干机取衣、收桌子、折纸箱、装蛋', '完整配方在所有任务都拿到 50% 以上分数', '其他方法做不了，只和自身消融比'])
    ];
    var foot = svgRich(400, 360, '作者列的局限：数据该怎么配还不清楚；跨很不同的领域（驾驶、导航、**足式运动**）是否正迁移，留待后续', { size: 12, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);
    var note = svgText(400, 394, '柱状图的具体数值只在论文图 7、9、11、13 里；这里只转述正文结论', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(note);

    function draw(t) {
      cards.forEach(function (c, k) { setOpacity(c, seg(t, 0.8 + k * 2.4, 1.4 + k * 2.4)); });
      setOpacity(foot, seg(t, 10.4, 11.2));
      setOpacity(note, seg(t, 11.4, 12.0));
    }
    return { el: s, draw: draw };
  }

  var PI0_SCENES = [
    {
      title: '通才策略的三道坎',
      dur: 12,
      build: buildSceneGaps,
      cues: [
        { at: 0.3, s: 'π₀ 想做一个能跨机器人、跨任务的**通才策略**。论文说要同时跨过三道坎。' },
        { at: 0.8, s: '① 规模：约 **10,000 小时**自有灵巧操作数据，7 种构型、68 个任务，再加 OXE 等开源数据。' },
        { at: 2.4, s: '② 架构：在预训练 VLM 上接一个**流匹配动作专家**，直接输出连续动作。' },
        { at: 4.2, s: '③ 配方：先在广而杂的数据上预训练，再用少而精的数据后训练 —— 和大语言模型同构。' },
        { at: 6.2, s: '对照自回归离散动作的 VLA：一个 token 一次前向，不支持动作块，很难做 50 Hz 灵巧控制。' },
        { at: 8.8, s: 'π₀ 一次积分出 $H = 50$ 步的连续动作块，50 Hz 下覆盖 1 秒。' },
        { at: 10.4, s: '所以这篇的贡献是**集成**的：架构、训练配方和大规模真机实验放在一起。' }
      ]
    },
    {
      title: '一个 Transformer，两套权重',
      dur: 13,
      build: buildSceneExperts,
      cues: [
        { at: 0.3, s: '输入序列：2–3 路图像、语言指令、本体状态 $q_t$、再加 50 个带噪动作 token。' },
        { at: 2.0, s: '图像和文字走 **PaliGemma**（Gemma 2B，宽度 2048、18 层），权重从 VLM 预训练继承。' },
        { at: 4.4, s: '状态和动作走**动作专家**：宽度 1024、MLP 4096、同样 18 层，约 3 亿参数，从零初始化。' },
        { at: 6.8, s: '两套权重**只在自注意力层交互** —— 就像只有两个专家的混合专家模型，token 按类型路由。' },
        { at: 8.8, s: '合计 **3.3B**。对照组 π₀-small 470M，不用 VLM 初始化。' },
        { at: 10.8, s: '因为只在注意力里相遇，两边宽度可以不同：动作专家缩小，积分 10 次也不慢。' }
      ]
    },
    {
      title: '分块因果掩码与 KV 缓存',
      dur: 12,
      build: buildSceneMask,
      cues: [
        { at: 0.3, s: '附录 B：序列分成三块 —— 图像 + 文字、状态、动作。**块内双向，块间只能看前面**。' },
        { at: 1.0, s: '图文块看不到后面两块：减少和 PaliGemma 预训练之间的分布偏移。' },
        { at: 2.6, s: '状态自成一块、也不看动作：它在积分过程中不变，K 和 V 可以缓存下来。' },
        { at: 4.2, s: '动作块能看到全部输入，块内 50 个动作互相可见，一起被去噪。' },
        { at: 8.2, s: '于是前缀只前向一次，之后 10 次积分**只重算 50 个动作 token**。' },
        { at: 10.2, s: 'openpi 源码用 `ar_mask` 的累加和实现：同一块共享编号，只能看编号不大于自己的 token。' }
      ]
    },
    {
      title: '流匹配：从噪声走到动作块',
      dur: 13,
      build: buildSceneFlow,
      cues: [
        { at: 0.3, s: '训练时把真动作块 $A_t$ 和高斯噪声 $\\epsilon$ 连成直线：$A_t^\\tau = \\tau A_t + (1-\\tau)\\epsilon$。' },
        { at: 1.2, s: '网络学这条直线上的速度 $u = A_t - \\epsilon$，损失是两者的均方误差。' },
        { at: 3.0, s: '推理从纯噪声出发，按 $\\delta = 0.1$ 做 **10 步欧拉**积分。一维玩具例子：$\\epsilon = -1.2$，$A = 0.8$。' },
        { at: 5.2, s: '速度恒为 2.0，每步前进 0.2，十步正好落到 0.8 —— 这只演示积分方向，不是真实关节角。' },
        { at: 7.0, s: '训练时 $\\tau$ 不是均匀采样：用偏向**高噪声**一端的 Beta 分布，超过 $s = 0.999$ 的不采。' },
        { at: 9.0, s: '按这个分布，约 **' + fmt(FLOW.fracNoisy * 100, 1) + '%** 的样本落在 $\\tau < 0.5$；作者的理由是给定观测后「预测动作均值」本身就难。' },
        { at: 11.0, s: '注意：openpi 代码把时间方向反过来，time = 1 是噪声、dt = −0.1，速度目标写成 noise − actions。' }
      ]
    },
    {
      title: '动作块与推理预算',
      dur: 12,
      build: buildSceneTiming,
      cues: [
        { at: 0.3, s: '一块 $H = 50$ 步。不必播完整块再推理，也不必每步都推理。' },
        { at: 0.6, s: '50 Hz 的机器人：一块覆盖 1 秒，执行 **25 步**（0.5 秒）就重新推理。' },
        { at: 3.2, s: '20 Hz 的 UR5e 和 Franka：执行 **16 步**（0.8 秒）重推理。' },
        { at: 5.6, s: '一次推理（RTX 4090、3 路相机）：图像编码 14 ms，前缀前向 32 ms，10 次动作前向 27 ms。' },
        { at: 7.6, s: '板载合计 **73 ms**；移动机器人走 Wi-Fi 离机推理，多 13 ms，共 86 ms。' },
        { at: 10.0, s: '动作块开环执行。作者早期试过时间集成（temporal ensembling），**反而掉性能**，所以没用。' }
      ]
    },
    {
      title: '数据与配方',
      dur: 13,
      build: buildSceneData,
      cues: [
        { at: 0.3, s: '预训练混合按时间步计数：自有 π 数据集 **9.03 亿**步，其中单臂 1.06 亿、双臂 7.97 亿。' },
        { at: 1.4, s: '开源数据只占 **9.1%**（OXE Magic Soup、Bridge v2、DROID），多是 2–10 Hz 的低频控制。' },
        { at: 3.0, s: '数据不均衡，每个任务—机器人组合按 $n^{0.43}$ 加权：100M 对 1M 的组合，原本 100 : 1，加权后只有 **' + fmt(WEIGHT.ratio, 2) + ' : 1**。' },
        { at: 7.0, s: '不同机器人：状态和动作**补零到 18 维**；相机不足 3 路就给空位打掩码。' },
        { at: 9.0, s: '主模型预训练 **70 万步**；后训练数据从最简单任务的 5 小时，到最难任务的 100 多小时。' },
        { at: 11.0, s: '直觉：只用高质量数据学不会纠错，只用预训练数据又不够流畅 —— 两段都要。' }
      ]
    },
    {
      title: '实验读数与边界',
      dur: 13,
      build: buildSceneResults,
      cues: [
        { at: 0.3, s: '§VI 四组真机实验，每个条件 10 次试验，按评分细则给部分分。' },
        { at: 0.8, s: '① 开箱：5 个任务 π₀ 全部最好；只训 16 万步的「对齐算力」版也赢过 OpenVLA 和 Octo。' },
        { at: 3.2, s: '② 语言跟随：比无 VLM 初始化的 π₀-small 准确率明显更高，也更能吃到中间指令的好处。' },
        { at: 5.6, s: '③ 新任务微调：整体好于 OpenVLA、Octo、ACT、Diffusion Policy；预训练相对从零训练，有时高到 **2 倍**。' },
        { at: 8.0, s: '④ 叠衣服、收桌子、折纸箱、装鸡蛋这些 5–20 分钟的任务：完整配方都拿到 **50% 以上**分数。' },
        { at: 10.4, s: '局限：数据怎么配还不清楚；到驾驶、导航、**足式运动**这些领域是否正迁移，留待后续。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '七幕动画：π₀ 全流程速览',
      sub: '约 88 秒自动播放。空格播放/暂停，← → 换幕；手算例子与笔记「🚶 具体实例」用的是同一组数字。',
      ariaLabel: 'π₀ 七幕讲解动画',
      notes: [
        '取数依据：参数与层宽来自 §IV 与附录 B；掩码来自附录 B；时间采样 $p(\\tau)$ 来自附录 B 图 14；推理耗时与执行节拍来自附录 D Table I；数据量与 $n^{0.43}$ 来自 §V-A；实验结论来自 §VI。',
        '第四幕的 $\\epsilon = -1.2$、$A = 0.8$ 与第六幕 100M 对 1M 的两个组合是笔记构造的**玩具数**；「' + fmt(FLOW.fracNoisy * 100, 1) + '% 落在 $\\tau < 0.5$」是按论文的 Beta 分布现算的，不是论文里写的数。',
        '第七幕只转述正文结论：各柱的具体数值需看论文图 7、9、11、13，这里不读图估数。'
      ],
      scenes: PI0_SCENES
    });
  }

  // ─── the narrated vertical video of the same seven scenes ─────────────
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：π₀ 七幕全流程',
      sub: '6 分 14 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的七幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '8.2 MB',
      fileName: 'pi0_讲解视频.mp4'
    });
  }

  K.mount({
    'pi0-explainer': buildExplainerDemo,
    'pi0-video': buildVideoDemo
  });
})();
