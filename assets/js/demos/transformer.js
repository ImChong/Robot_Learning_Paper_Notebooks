/* Transformer (Attention Is All You Need) demos for
 * papers/01_Foundational_RL/Transformer_Attention_Is_All_You_Need.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["transformer"]`, after assets/js/demos/kit.js. The note itself only
 * holds empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   tf-explainer — 七幕讲解动画：RNN 的串行瓶颈 → 缩放点积注意力手算 → 为什么除以 √d_k
 *                  → 多头 → 位置编码 → 编码器 / 解码器与因果掩码 → 训练配方与结果
 *   tf-video     — 同样七幕的配音竖屏视频（可下载）
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

  // ─── shared numbers (the note's worked examples use the same ones) ──────
  function softmax(xs) {
    var m = Math.max.apply(null, xs);
    var e = xs.map(function (x) { return Math.exp(x - m); });
    var s = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (x) { return x / s; });
  }
  function dot(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  /* 第二幕：query「sat」对三个 key 做缩放点积注意力，d_k = 4 */
  var ATT = (function () {
    var q = [1, 0, 1, 0];
    var keys = [[1, 0, 0, 0], [1, 1, 1, 0], [0, 0, 1, 1]];
    var vals = [[1, 0], [0, 1], [1, 1]];
    var words = ['The', 'cat', 'sat'];
    var dk = q.length;
    var raw = keys.map(function (k) { return dot(q, k); });
    var scaled = raw.map(function (s) { return s / Math.sqrt(dk); });
    var w = softmax(scaled);
    var out = [0, 1].map(function (j) {
      return w.reduce(function (acc, wi, i) { return acc + wi * vals[i][j]; }, 0);
    });
    return { q: q, keys: keys, vals: vals, words: words, dk: dk, raw: raw, scaled: scaled, w: w, out: out };
  })();

  /* 第三幕：d_k = 64 时点积的标准差是 8；同一组分数缩放前后的 softmax */
  var SCALE = (function () {
    var dk = 64;
    var raw = [12, 4, -4, 6];
    var scaled = raw.map(function (s) { return s / Math.sqrt(dk); });
    var pRaw = softmax(raw);
    var pScaled = softmax(scaled);
    return {
      dk: dk,
      std: Math.sqrt(dk),
      raw: raw,
      scaled: scaled,
      pRaw: pRaw,
      pScaled: pScaled,
      gRaw: pRaw[0] * (1 - pRaw[0]),
      gScaled: pScaled[0] * (1 - pScaled[0])
    };
  })();

  /* 第四幕：Table 3 (A) —— 头数与每头维度一起变、总计算量不变，newstest2013 dev BLEU */
  var HEADS = [
    { h: 1, dk: 512, bleu: 24.9 },
    { h: 4, dk: 128, bleu: 25.5 },
    { h: 8, dk: 64, bleu: 25.8 },
    { h: 16, dk: 32, bleu: 25.8 },
    { h: 32, dk: 16, bleu: 25.4 }
  ];

  /* 第五幕：正弦位置编码，d_model = 4 的玩具算例 + d_model = 512 的四个维度 */
  function pe(pos, dModel) {
    var v = [];
    for (var i = 0; i < dModel / 2; i++) {
      var ang = pos / Math.pow(10000, (2 * i) / dModel);
      v.push(Math.sin(ang), Math.cos(ang));
    }
    return v;
  }
  var PE1 = pe(1, 4),
    PE2 = pe(2, 4);

  /* 第七幕：式 (3) 的学习率 —— 预热 4000 步后按 1/√step 衰减 */
  var D_MODEL = 512,
    WARMUP = 4000;
  function lrate(step) {
    return Math.pow(D_MODEL, -0.5) * Math.min(Math.pow(step, -0.5), step * Math.pow(WARMUP, -1.5));
  }
  var LR_PEAK = lrate(WARMUP);
  var LR_100K = lrate(100000);

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
  /* 一格读数：左边标签（可含公式），右边等宽数字。 */
  function readoutChip(s, cx, y, w, label, value, color) {
    var g = svgEl('g', {});
    g.appendChild(paint(svgEl('rect', { x: cx - w / 2, y: y, width: w, height: 34, rx: 6, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    g.appendChild(svgRich(cx - w / 2 + 12, y + 18, label, { size: 10.5, cls: 'demo-x-mut', w: w * 0.62 }));
    g.appendChild(paint(svgText(cx + w / 2 - 12, y + 22, value, 'demo-x-mono', 11.5, 'end'), color || C_ACCENT));
    s.appendChild(g);
    return g;
  }

  // ── scene 1: RNN 的串行瓶颈 vs 自注意力一步连通（Table 1） ──
  function buildSceneSerial() {
    var s = sceneSvg('RNN 必须按时间一格一格算，第一个词的信息要走 n 步才到最后；自注意力一层里任意两个位置直接相连');
    s.appendChild(svgRich(40, 30, 'RNN：$h_t = f(h_{t-1}, x_t)$ —— 第 $t$ 步必须等第 $t-1$ 步算完', { size: 13.5, cls: 'demo-x-ink2', w: 720 }));
    var arrow = K.arrowMarker(s, 'tf-x-arrow-rnn', C_MUTED);
    var N = 6;
    var words = ['The', 'cat', 'sat', 'on', 'the', 'mat'];
    function cx(i) { return 110 + i * 116; }

    var rnn = svgEl('g', {});
    rnn.appendChild(svgText(24, 96, 'RNN', 'demo-x-mut', 11));
    var cells = [];
    for (var i = 0; i < N; i++) {
      var c = box(cx(i) - 34, 70, 68, 40, C_BORDER);
      rnn.appendChild(c);
      cells.push(c);
      rnn.appendChild(svgText(cx(i), 95, words[i], 'demo-x-mono', 11, 'middle'));
      if (i) rnn.appendChild(line(cx(i - 1) + 34, 90, cx(i) - 36, 90, C_MUTED, 1.3, null, arrow));
    }
    var stepTag = paint(svgText(760, 132, '', 'demo-x-mono', 11, 'end'), C_BAD);
    rnn.appendChild(stepTag);
    s.appendChild(rnn);

    var att = svgEl('g', {});
    att.appendChild(svgText(24, 262, '自注意力', 'demo-x-mut', 11));
    var edges = svgEl('g', {});
    for (var a = 0; a < N; a++) {
      for (var b = a + 1; b < N; b++) {
        var mid = (cx(a) + cx(b)) / 2;
        var lift = 18 + (b - a) * 14;
        edges.appendChild(paint(svgEl('path', {
          d: 'M ' + cx(a) + ' 236 Q ' + mid + ' ' + (236 - lift) + ' ' + cx(b) + ' 236',
          fill: 'none', 'stroke-width': 1.1, 'stroke-opacity': 0.75
        }), null, C_GOOD));
      }
    }
    att.appendChild(edges);
    for (var j = 0; j < N; j++) {
      att.appendChild(box(cx(j) - 34, 236, 68, 40, C_GOOD));
      att.appendChild(svgText(cx(j), 261, words[j], 'demo-x-mono', 11, 'middle'));
    }
    att.appendChild(paint(svgText(760, 298, '一层之内全部同时算完', 'demo-x-mono', 11, 'end'), C_GOOD));
    s.appendChild(att);

    var chips = svgEl('g', {});
    [
      ['串行操作数', '$O(n)$', '$O(1)$'],
      ['任意两词的最长路径', '$O(n)$', '$O(1)$'],
      ['每层计算量', '$O(n \\cdot d^2)$', '$O(n^2 \\cdot d)$']
    ].forEach(function (row, k) {
      var x0 = 40 + k * 250;
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: x0, y: 318, width: 236, height: 50, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
      g.appendChild(svgText(x0 + 12, 336, row[0], 'demo-x-mut', 10.5));
      g.appendChild(svgRich(x0 + 12, 357, 'RNN ' + row[1], { size: 11, w: 110 }).setTone(C_BAD));
      g.appendChild(svgRich(x0 + 124, 357, '自注意力 ' + row[2], { size: 11, w: 110 }).setTone(C_GOOD));
      chips.appendChild(g);
    });
    s.appendChild(chips);

    var foot = svgRich(400, 398, '句长 $n$ 小于表示维度 $d = 512$ 时，自注意力每层还更便宜 —— 这是论文 Table 1 的三列', { size: 13, anchor: 'middle', w: 760 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(rnn, seg(t, 0.3, 0.9));
      var k = Math.floor(N * seg(t, 1.0, 4.2));
      cells.forEach(function (c, i) { paint(c, null, i < k ? C_BAD : C_BORDER); c.style.strokeWidth = i === k - 1 ? 2.6 : 1.4; });
      stepTag.textContent = k ? '串行第 ' + Math.min(k, N) + ' / ' + N + ' 步' : '';
      setOpacity(att, seg(t, 4.4, 5.0));
      setOpacity(edges, seg(t, 5.0, 6.2));
      setOpacity(chips, seg(t, 7.0, 7.8));
      setOpacity(foot, seg(t, 10.0, 10.8));
    }
    return { el: s, draw: draw };
  }

  // ── scene 2: 缩放点积注意力手算（d_k = 4，三个词） ──
  function buildSceneAttention() {
    var s = sceneSvg('用一个 query 和三个 key 手算缩放点积注意力：点积、除以根号 d_k、softmax、按权重加权 value');
    var formula = svgMath(400, 34, '\\mathrm{Attention}(Q,K,V) = \\mathrm{softmax}\\!\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right) V', { size: 14, anchor: 'middle', w: 620 });
    s.appendChild(formula);

    var qBox = svgEl('g', {});
    qBox.appendChild(box(24, 96, 150, 44, C_ACCENT, 2));
    qBox.appendChild(svgRich(36, 116, 'query「sat」 $q$', { size: 10.5, cls: 'demo-x-mut', w: 130 }));
    qBox.appendChild(paint(svgText(99, 133, '[' + ATT.q.join(', ') + ']', 'demo-x-mono', 11, 'middle'), C_ACCENT));
    s.appendChild(qBox);

    var heads = [['key $k_i$', 296], ['$q \\cdot k_i$', 392], ['$\\div \\sqrt{4}$', 462], ['softmax', 560], ['value $v_i$', 706]];
    var headG = svgEl('g', {});
    heads.forEach(function (hd) { headG.appendChild(svgRich(hd[1], 80, hd[0], { size: 10.5, anchor: 'middle', cls: 'demo-x-mut', w: 110 })); });
    s.appendChild(headG);

    var rows = ATT.words.map(function (wd, i) {
      var y = 118 + i * 58;
      var g = { key: svgEl('g', {}), raw: svgEl('g', {}), scaled: svgEl('g', {}), w: svgEl('g', {}), val: svgEl('g', {}) };
      g.key.appendChild(svgText(244, y + 4, wd, 'demo-x-ink2', 11, 'end'));
      g.key.appendChild(paint(svgText(296, y + 4, '[' + ATT.keys[i].join(', ') + ']', 'demo-x-mono', 11, 'middle'), null));
      g.raw.appendChild(paint(svgText(392, y + 4, fmt(ATT.raw[i], 0), 'demo-x-mono', 12, 'middle'), C_ACCENT));
      g.scaled.appendChild(paint(svgText(462, y + 4, fmt(ATT.scaled[i], 1), 'demo-x-mono', 12, 'middle'), C_ACCENT));
      g.w.appendChild(paint(svgEl('rect', { x: 516, y: y - 10, width: 0, height: 16, rx: 3 }), C_GOOD));
      g.w.appendChild(paint(svgText(612, y + 4, fmt(ATT.w[i], 3), 'demo-x-mono', 11, 'start'), C_GOOD));
      g.val.appendChild(paint(svgText(706, y + 4, '[' + ATT.vals[i].join(', ') + ']', 'demo-x-mono', 11, 'middle'), null));
      Object.keys(g).forEach(function (k) { s.appendChild(g[k]); });
      return g;
    });

    var outG = svgEl('g', {});
    outG.appendChild(box(470, 300, 300, 46, C_GOOD, 2));
    outG.appendChild(svgRich(484, 322, '输出 $= \\sum_i w_i v_i$', { size: 11, cls: 'demo-x-mut', w: 150 }));
    outG.appendChild(paint(svgText(756, 330, '[' + fmt(ATT.out[0], 3) + ', ' + fmt(ATT.out[1], 3) + ']', 'demo-x-mono', 12.5, 'end'), C_GOOD));
    s.appendChild(outG);

    var foot = svgRich(400, 392, '「sat」最关注「cat」（权重 **' + fmt(ATT.w[1], 3) + '**）：**谁和我像，就多拿谁的 value**', { size: 13.5, anchor: 'middle', w: 760 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(formula, seg(t, 0.2, 0.8));
      setOpacity(qBox, seg(t, 1.0, 1.5));
      setOpacity(headG, seg(t, 1.0, 1.5));
      rows.forEach(function (g, i) {
        setOpacity(g.key, seg(t, 1.2 + i * 0.2, 1.7 + i * 0.2));
        setOpacity(g.raw, seg(t, 2.4 + i * 0.3, 2.9 + i * 0.3));
        setOpacity(g.scaled, seg(t, 4.4 + i * 0.2, 4.9 + i * 0.2));
        setOpacity(g.w, seg(t, 6.0, 6.6));
        g.w.firstChild.setAttribute('width', (90 * ATT.w[i] * ease(seg(t, 6.2, 7.4))).toFixed(1));
        setOpacity(g.val, seg(t, 8.0, 8.6));
      });
      setOpacity(outG, seg(t, 9.0, 9.6));
      setOpacity(foot, seg(t, 11.2, 12.0));
    }
    return { el: s, draw: draw };
  }

  // ── scene 3: 为什么要除以 √d_k ──
  function buildSceneScale() {
    var s = sceneSvg('d_k = 64 时点积的标准差是 8，不缩放 softmax 几乎变成 one-hot，梯度接近 0；除以 8 后分布还有学习余地');
    s.appendChild(svgRich(40, 30, '若 $q, k$ 的分量独立、均值 0、方差 1，则 $q \\cdot k$ 的方差是 $d_k$（论文脚注 4）', { size: 13, cls: 'demo-x-ink2', w: 740 }));
    var chipStd = readoutChip(s, 200, 50, 300, '$d_k = 64$ 时点积的标准差', fmt(SCALE.std, 0), C_WARN);

    function panel(x0, title, scores, probs, tone) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: x0, y: 100, width: 350, height: 212, rx: 10, 'stroke-width': 1.6 }), C_SURFACE2, tone));
      g.appendChild(svgRich(x0 + 175, 124, title, { size: 12, anchor: 'middle', w: 320 }).setTone(tone));
      var bars = [];
      scores.forEach(function (sc, i) {
        var y = 152 + i * 38;
        g.appendChild(svgText(x0 + 16, y + 4, '分数', 'demo-x-mut', 10));
        g.appendChild(paint(svgText(x0 + 90, y + 4, fmt(sc, sc % 1 ? 3 : 0), 'demo-x-mono', 11.5, 'end'), null));
        g.appendChild(paint(svgEl('rect', { x: x0 + 104, y: y - 9, width: 170, height: 14, rx: 3 }), C_SURFACE, null));
        var bar = paint(svgEl('rect', { x: x0 + 104, y: y - 9, width: 0, height: 14, rx: 3 }), tone);
        g.appendChild(bar);
        g.appendChild(paint(svgText(x0 + 338, y + 4, probs[i] < 0.001 ? probs[i].toExponential(1) : fmt(probs[i], 3), 'demo-x-mono', 11, 'end'), tone));
        bars.push({ el: bar, p: probs[i] });
      });
      s.appendChild(g);
      return { g: g, bars: bars };
    }
    var left = panel(30, '不缩放：原始分数直接进 softmax', SCALE.raw, SCALE.pRaw, C_BAD);
    var right = panel(420, '除以 $\\sqrt{d_k} = 8$ 之后', SCALE.scaled, SCALE.pScaled, C_GOOD);

    var chipG1 = readoutChip(s, 205, 322, 330, '最大权重处的梯度 $p(1-p)$', fmt(SCALE.gRaw, 4), C_BAD);
    var chipG2 = readoutChip(s, 595, 322, 330, '最大权重处的梯度 $p(1-p)$', fmt(SCALE.gScaled, 3), C_GOOD);
    var foot = svgRich(400, 394, '不缩放 → softmax 饱和成 one-hot、梯度约是缩放后的 **' + fmt(SCALE.gScaled / SCALE.gRaw, 0) + '** 分之一', { size: 13.5, anchor: 'middle', w: 760 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(chipStd, seg(t, 1.2, 1.8));
      setOpacity(left.g, seg(t, 3.0, 3.6));
      left.bars.forEach(function (b) { b.el.setAttribute('width', (170 * b.p * ease(seg(t, 3.6, 5.0))).toFixed(1)); });
      setOpacity(right.g, seg(t, 5.8, 6.4));
      right.bars.forEach(function (b) { b.el.setAttribute('width', (170 * b.p * ease(seg(t, 6.4, 7.8))).toFixed(1)); });
      setOpacity(chipG1, seg(t, 8.6, 9.2));
      setOpacity(chipG2, seg(t, 9.0, 9.6));
      setOpacity(foot, seg(t, 10.6, 11.4));
    }
    return { el: s, draw: draw };
  }

  // ── scene 4: 多头 —— 8 个 64 维的头，Table 3 (A) ──
  function buildSceneHeads() {
    var s = sceneSvg('多头注意力把 512 维切成 8 个 64 维的头并行算注意力，拼接后再线性投影；Table 3 A 行显示单头比 8 头低 0.9 BLEU');
    s.appendChild(svgRich(40, 30, '$\\mathrm{MultiHead}(Q,K,V) = \\mathrm{Concat}(\\mathrm{head}_1, \\dots, \\mathrm{head}_h)\\,W^O$', { size: 13.5, cls: 'demo-x-ink2', w: 720 }));

    var diag = svgEl('g', {});
    diag.appendChild(box(30, 70, 120, 40, C_ACCENT, 2));
    diag.appendChild(svgRich(90, 94, '输入 $d_{model} = 512$', { size: 10.5, anchor: 'middle', w: 118 }));
    var headBoxes = [];
    for (var i = 0; i < 8; i++) {
      var y = 60 + i * 30;
      var hb = box(200, y, 96, 24, C_GOOD, 1.2);
      diag.appendChild(line(150, 90, 200, y + 12, C_BORDER, 1));
      diag.appendChild(hb);
      diag.appendChild(svgText(248, y + 16, 'head ' + (i + 1) + ' · 64', 'demo-x-mono', 9.5, 'middle'));
      diag.appendChild(line(296, y + 12, 340, 170, C_BORDER, 1));
      headBoxes.push(hb);
    }
    diag.appendChild(box(340, 150, 110, 40, C_ACCENT, 2));
    diag.appendChild(svgRich(395, 174, 'Concat → $W^O$', { size: 10.5, anchor: 'middle', w: 108 }));
    diag.appendChild(svgRich(200, 316, '每头 $d_k = d_v = 512 / 8 = 64$，总计算量与单头满维度相近', { size: 11, cls: 'demo-x-mut', w: 300 }));
    s.appendChild(diag);

    var PX0 = 500, PX1 = 770, PY0 = 300, PY1 = 90;
    var chart = svgEl('g', {});
    chart.appendChild(paint(svgEl('rect', { x: PX0 - 16, y: PY1 - 30, width: PX1 - PX0 + 30, height: PY0 - PY1 + 74, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    chart.appendChild(svgText(PX0, PY1 - 12, 'Table 3 (A)：dev BLEU（newstest2013）', 'demo-x-mut', 10.5));
    function py(b) { return PY0 - ((b - 24.5) / 1.5) * (PY0 - PY1); }
    var bars = HEADS.map(function (d, k) {
      var x = PX0 + 8 + k * 52;
      var g = svgEl('g', {});
      var best = d.bleu === 25.8;
      var rect = paint(svgEl('rect', { x: x, y: PY0, width: 36, height: 0, rx: 3 }), best ? C_GOOD : d.h === 1 ? C_BAD : C_ACCENT);
      g.appendChild(rect);
      g.appendChild(paint(svgText(x + 18, py(d.bleu) - 6, fmt(d.bleu, 1), 'demo-x-mono', 10.5, 'middle'), null));
      g.appendChild(svgText(x + 18, PY0 + 16, 'h=' + d.h, 'demo-x-mono', 10, 'middle'));
      g.appendChild(svgText(x + 18, PY0 + 30, String(d.dk), 'demo-x-mono demo-x-mut', 9.5, 'middle'));
      chart.appendChild(g);
      return { g: g, rect: rect, top: py(d.bleu) };
    });
    chart.appendChild(svgRich(PX1 + 6, PY0 + 30, '$d_k$', { size: 9.5, anchor: 'end', cls: 'demo-x-mut', w: 30 }));
    s.appendChild(chart);

    var foot = svgRich(400, 396, '单头比 8 头低 **0.9** BLEU，32 个头又掉回 25.4 —— 头太少看不全，头太多每头维度太窄', { size: 13, anchor: 'middle', w: 760 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(diag, seg(t, 0.8, 1.4));
      headBoxes.forEach(function (hb, i) { hb.style.strokeWidth = seg(t, 2.0 + i * 0.25, 2.3 + i * 0.25) > 0.5 ? 2.2 : 1.2; });
      setOpacity(chart, seg(t, 5.2, 5.8));
      bars.forEach(function (b, k) {
        var p = ease(seg(t, 5.8 + k * 0.5, 6.6 + k * 0.5));
        b.rect.setAttribute('y', (PY0 - (PY0 - b.top) * p).toFixed(1));
        b.rect.setAttribute('height', ((PY0 - b.top) * p).toFixed(1));
        setOpacity(b.g, seg(t, 5.8 + k * 0.5, 6.2 + k * 0.5));
      });
      setOpacity(foot, seg(t, 10.2, 11.0));
    }
    return { el: s, draw: draw };
  }

  // ── scene 5: 正弦位置编码 ──
  var PE_DIMS = [0, 64, 128, 256];
  function buildScenePosition() {
    var s = sceneSvg('没有循环也没有卷积，位置只能加进去：每个维度一条不同频率的正弦，波长从 2π 到 10000·2π');
    var formula = svgMath(400, 36, 'PE_{(pos,2i)} = \\sin\\!\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right),\\quad PE_{(pos,2i+1)} = \\cos\\!\\left(\\frac{pos}{10000^{2i/d_{model}}}\\right)', { size: 12.5, anchor: 'middle', w: 760 });
    s.appendChild(formula);

    var PX0 = 50, PX1 = 450, PY0 = 290, PY1 = 90;
    var plotG = svgEl('g', {});
    plotG.appendChild(paint(svgEl('rect', { x: PX0 - 16, y: PY1 - 22, width: PX1 - PX0 + 32, height: PY0 - PY1 + 60, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    plotG.appendChild(svgRich(PX0, PY1 - 6, '$d_{model} = 512$，四个维度随位置 $pos$ 的取值', { size: 10.5, cls: 'demo-x-mut', w: 380 }));
    s.appendChild(plotG);
    var tones = [C_BAD, C_WARN, C_GOOD, C_ACCENT];
    var curves = PE_DIMS.map(function (d2i, k) {
      var band = PY1 + 16 + k * 50;
      var pts = [];
      for (var p = 0; p <= 60; p += 0.5) {
        var v = Math.sin(p / Math.pow(10000, d2i / 512));
        pts.push([(PX0 + (p / 60) * (PX1 - PX0)).toFixed(1), (band + 18 - 16 * v).toFixed(1)]);
      }
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': 1.8 }), null, tones[k]));
      g.appendChild(svgRich(PX1 + 2, band - 1, '$2i=' + d2i + '$', { size: 9.5, anchor: 'end', w: 60 }).setTone(tones[k]));
      plotG.appendChild(g);
      return g;
    });
    plotG.appendChild(svgRich(PX0, PY0 + 28, '$pos$ = 0 … 60：低维转得快，高维几乎不动', { size: 10, cls: 'demo-x-mut', w: 380 }));

    var toy = svgEl('g', {});
    toy.appendChild(box(490, 70, 280, 142, C_BORDER));
    toy.appendChild(svgRich(504, 92, '玩具算例：$d_{model} = 4$', { size: 11, cls: 'demo-x-mut', w: 250 }));
    [['$PE(1)$', PE1], ['$PE(2)$', PE2]].forEach(function (row, k) {
      toy.appendChild(svgRich(504, 126 + k * 36, row[0], { size: 11, w: 60 }));
      toy.appendChild(paint(svgText(760, 130 + k * 36, '[' + row[1].map(function (v) { return fmt(v, 3); }).join(', ') + ']', 'demo-x-mono', 10.5, 'end'), C_ACCENT));
    });
    toy.appendChild(svgRich(504, 198, '第 3、4 维的频率只有第 1、2 维的 $1/100$', { size: 10, cls: 'demo-x-mut', w: 260 }));
    s.appendChild(toy);

    var rel = svgEl('g', {});
    rel.appendChild(box(490, 226, 280, 58, C_GOOD));
    rel.appendChild(svgRich(504, 248, '任意偏移 $k$：$PE_{pos+k}$ 是 $PE_{pos}$ 的线性函数', { size: 10.5, w: 260 }).setTone(C_GOOD));
    rel.appendChild(svgRich(504, 270, '（每对 sin / cos 转一个固定角度）', { size: 10, cls: 'demo-x-mut', w: 260 }));
    s.appendChild(rel);

    var chip = readoutChip(s, 630, 300, 280, 'Table 3 (E) 可学习位置嵌入', '25.7 vs 25.8', C_ACCENT);
    var foot = svgRich(400, 394, '学出来的位置嵌入几乎一样好；选正弦，是**猜**它能外推到比训练更长的句子', { size: 13, anchor: 'middle', w: 760 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(formula, seg(t, 0.3, 0.9));
      setOpacity(plotG, seg(t, 1.4, 2.0));
      curves.forEach(function (g, k) { setOpacity(g, seg(t, 1.8 + k * 0.6, 2.3 + k * 0.6)); });
      setOpacity(toy, seg(t, 5.0, 5.6));
      setOpacity(rel, seg(t, 7.8, 8.4));
      setOpacity(chip, seg(t, 9.6, 10.2));
      setOpacity(foot, seg(t, 10.6, 11.4));
    }
    return { el: s, draw: draw };
  }

  // ── scene 6: 编码器 × 6、解码器 × 6 与因果掩码 ──
  function buildSceneStack() {
    var s = sceneSvg('编码器与解码器各 6 层，每个子层外面是残差加 LayerNorm；解码器自注意力用下三角掩码，只能看已经生成的词');
    s.appendChild(svgRich(40, 28, '每个子层：$\\mathrm{LayerNorm}(x + \\mathrm{Sublayer}(x))$，全部输出 $d_{model} = 512$', { size: 13, cls: 'demo-x-ink2', w: 740 }));
    var arrow = K.arrowMarker(s, 'tf-x-arrow-stack', C_MUTED);

    function stack(x0, title, layers, tone, n) {
      var g = svgEl('g', {});
      var h = layers.length * 34 + 40;
      g.appendChild(paint(svgEl('rect', { x: x0, y: 48, width: 200, height: h, rx: 10, 'stroke-width': 1.8, 'stroke-dasharray': '6 4' }), C_SURFACE, tone));
      g.appendChild(paint(svgText(x0 + 100, 68, title, null, 12, 'middle'), tone));
      layers.forEach(function (ly, i) {
        var y = 80 + i * 34;
        g.appendChild(box(x0 + 14, y, 172, 26, ly[1] || C_BORDER, 1.2));
        g.appendChild(svgRich(x0 + 100, y + 17, ly[0], { size: 10, anchor: 'middle', w: 168 }));
      });
      g.appendChild(paint(svgText(x0 + 190, 48 + h - 8, '× ' + n, 'demo-x-mono', 12, 'end'), tone));
      s.appendChild(g);
      return g;
    }
    var enc = stack(30, '编码器', [
      ['多头自注意力', C_GOOD], ['Add & Norm'], ['FFN $512 \\to 2048 \\to 512$', C_ACCENT], ['Add & Norm']
    ], C_GOOD, 'N = 6');
    var dec = stack(270, '解码器', [
      ['**带掩码**的多头自注意力', C_BAD], ['Add & Norm'], ['交叉注意力（K、V 来自编码器）', C_WARN], ['Add & Norm'], ['FFN', C_ACCENT], ['Add & Norm']
    ], C_WARN, 'N = 6');
    var bridge = line(230, 170, 282, 185, C_WARN, 1.6, '4 3', arrow);
    s.appendChild(bridge);

    var M0x = 520, M0y = 88, CELL = 40, N = 5;
    var words = ['<s>', 'Die', 'Katze', 'saß', '.'];
    var mask = svgEl('g', {});
    mask.appendChild(svgText(M0x, M0y - 16, '解码器自注意力的掩码（行 = query）', 'demo-x-mut', 10.5));
    for (var r = 0; r < N; r++) {
      mask.appendChild(svgText(M0x - 6, M0y + r * CELL + 25, words[r], 'demo-x-mono demo-x-mut', 9.5, 'end'));
      for (var c = 0; c < N; c++) {
        var ok = c <= r;
        mask.appendChild(paint(svgEl('rect', { x: M0x + c * CELL, y: M0y + r * CELL, width: CELL - 3, height: CELL - 3, rx: 4, 'fill-opacity': ok ? 0.35 : 0.18 }), ok ? C_GOOD : C_BAD));
        if (!ok) mask.appendChild(svgRich(M0x + c * CELL + 18, M0y + r * CELL + 23, '$-\\infty$', { size: 9.5, anchor: 'middle', w: 38 }).setTone(C_BAD));
      }
    }
    s.appendChild(mask);

    var chip1 = readoutChip(s, 640, 300, 250, 'base 参数量（Table 3）', '65M', C_ACCENT);
    var chip2 = readoutChip(s, 640, 340, 250, 'big：$d_{model}$=1024，16 头', '213M', C_ACCENT);
    var foot = svgRich(400, 402, '输出右移一位 + 掩码：位置 $i$ 只看得到 $< i$ 的已知输出，训练时整句并行、推理时逐词生成', { size: 12.5, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(enc, seg(t, 0.8, 1.4));
      setOpacity(dec, seg(t, 3.4, 4.0));
      setOpacity(bridge, seg(t, 5.6, 6.2));
      setOpacity(mask, seg(t, 7.2, 7.8));
      setOpacity(chip1, seg(t, 10.2, 10.8));
      setOpacity(chip2, seg(t, 10.6, 11.2));
      setOpacity(foot, seg(t, 11.8, 12.6));
    }
    return { el: s, draw: draw };
  }

  // ── scene 7: 训练配方与结果（式 3、Table 2） ──
  var BLEU = [
    { name: 'ConvS2S 集成', v: 26.36, tone: C_MUTED },
    { name: 'GNMT+RL 集成', v: 26.30, tone: C_MUTED },
    { name: 'Transformer base', v: 27.3, tone: C_ACCENT },
    { name: 'Transformer big', v: 28.4, tone: C_GOOD }
  ];
  function buildSceneResults() {
    var s = sceneSvg('学习率先线性预热 4000 步再按 1/根号步数衰减；big 模型 EN-DE 28.4 BLEU，比此前最好的集成模型高 2 分以上');
    var formula = svgMath(210, 34, 'lrate = d_{model}^{-0.5} \\cdot \\min(step^{-0.5},\\; step \\cdot warmup^{-1.5})', { size: 11.5, anchor: 'middle', w: 400 });
    s.appendChild(formula);

    var PX0 = 50, PX1 = 370, PY0 = 280, PY1 = 80, SMAX = 40000;
    var lrG = svgEl('g', {});
    lrG.appendChild(paint(svgEl('rect', { x: PX0 - 16, y: PY1 - 20, width: PX1 - PX0 + 32, height: PY0 - PY1 + 56, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    function lx(st) { return PX0 + (st / SMAX) * (PX1 - PX0); }
    function ly(v) { return PY0 - (v / (LR_PEAK * 1.12)) * (PY0 - PY1); }
    var pts = [];
    for (var st = 50; st <= SMAX; st += 200) pts.push([lx(st).toFixed(1), ly(lrate(st)).toFixed(1)]);
    var lrPath = paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': 2.4 }), null, C_ACCENT);
    lrG.appendChild(lrPath);
    lrG.appendChild(line(lx(WARMUP), PY0, lx(WARMUP), ly(LR_PEAK), C_MUTED, 1, '3 3'));
    lrG.appendChild(paint(svgEl('circle', { cx: lx(WARMUP), cy: ly(LR_PEAK), r: 4.5 }), C_WARN));
    lrG.appendChild(paint(svgText(lx(WARMUP) + 8, ly(LR_PEAK) - 6, '第 4000 步：峰值 ' + LR_PEAK.toExponential(2), 'demo-x-mono', 10), C_WARN));
    lrG.appendChild(svgText(PX0, PY0 + 18, '0', 'demo-x-mono demo-x-mut', 9.5, 'middle'));
    lrG.appendChild(svgText(PX1, PY0 + 18, '40k 步', 'demo-x-mono demo-x-mut', 9.5, 'middle'));
    s.appendChild(lrG);

    var recipe = svgEl('g', {});
    [['Adam', '$\\beta_1=0.9,\\ \\beta_2=0.98$'], ['dropout', '$P_{drop} = 0.1$'], ['标签平滑', '$\\epsilon_{ls} = 0.1$']].forEach(function (r, k) {
      recipe.appendChild(svgText(46 + k * 112, 334, r[0], 'demo-x-mut', 10));
      recipe.appendChild(svgRich(46 + k * 112, 352, r[1], { size: 10, w: 110 }));
    });
    s.appendChild(recipe);

    var BX0 = 420, BX1 = 770;
    var chart = svgEl('g', {});
    chart.appendChild(paint(svgEl('rect', { x: BX0 - 10, y: 50, width: BX1 - BX0 + 20, height: 190, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    chart.appendChild(svgText(BX0 + 4, 70, 'Table 2：WMT14 英→德 BLEU（newstest2014）', 'demo-x-mut', 10.5));
    function bw(v) { return ((v - 24) / 5) * 200; }
    var bars = BLEU.map(function (b, k) {
      var y = 88 + k * 36;
      var g = svgEl('g', {});
      g.appendChild(svgText(BX0 + 118, y + 14, b.name, 'demo-x-ink2', 10.5, 'end'));
      var r = paint(svgEl('rect', { x: BX0 + 126, y: y + 2, width: 0, height: 16, rx: 3 }), b.tone);
      g.appendChild(r);
      g.appendChild(paint(svgText(BX1, y + 15, fmt(b.v, 2), 'demo-x-mono', 11, 'end'), b.tone === C_MUTED ? null : b.tone));
      chart.appendChild(g);
      return { g: g, r: r, w: bw(b.v) };
    });
    s.appendChild(chart);

    var chipA = readoutChip(s, 595, 256, 350, 'big：8 × P100，30 万步', '3.5 天', C_GOOD);
    var chipB = readoutChip(s, 595, 296, 350, '英→法 BLEU（Table 2）', '41.8', C_GOOD);
    var chipC = readoutChip(s, 595, 336, 350, '训练 FLOPs：big 英→德', '2.3e19', C_ACCENT);

    var foot = svgRich(400, 400, '后来的 BERT / GPT / ViT / DiT，以及 π₀、GR00T 这些 VLA，骨架都是这一套块', { size: 13, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(formula, seg(t, 0.3, 0.9));
      setOpacity(lrG, seg(t, 1.0, 1.6));
      lrPath.style.strokeDasharray = '1200';
      lrPath.style.strokeDashoffset = String(1200 * (1 - ease(seg(t, 1.2, 3.6))));
      setOpacity(recipe, seg(t, 4.2, 4.8));
      setOpacity(chart, seg(t, 6.0, 6.6));
      bars.forEach(function (b, k) {
        setOpacity(b.g, seg(t, 6.4 + k * 0.4, 6.8 + k * 0.4));
        b.r.setAttribute('width', (b.w * ease(seg(t, 6.6 + k * 0.4, 7.6 + k * 0.4))).toFixed(1));
      });
      setOpacity(chipA, seg(t, 9.0, 9.6));
      setOpacity(chipB, seg(t, 9.4, 10.0));
      setOpacity(chipC, seg(t, 9.8, 10.4));
      setOpacity(foot, seg(t, 11.6, 12.4));
    }
    return { el: s, draw: draw };
  }

  var TF_SCENES = [
    {
      title: 'RNN 的串行瓶颈',
      dur: 12,
      build: buildSceneSerial,
      cues: [
        { at: 0.3, s: '2017 年的机器翻译主力是 RNN / LSTM：$h_t = f(h_{t-1}, x_t)$，第 $t$ 步必须等第 $t-1$ 步。' },
        { at: 1.0, s: '一句 6 个词就要**串行 6 步**；句子越长越慢，而且显存限制了跨样本的批量。' },
        { at: 4.4, s: '自注意力把这条链拆掉：**一层之内任意两个词直接相连**，全部位置同时计算。' },
        { at: 7.0, s: 'Table 1：串行操作 $O(n) \\to O(1)$，最长路径 $O(n) \\to O(1)$；代价是每层 $O(n^2 \\cdot d)$。' },
        { at: 10.0, s: '句长 $n$ 小于维度 $d = 512$ 时，这个平方项反而更便宜 —— 翻译句子通常就是这种情况。' }
      ]
    },
    {
      title: '缩放点积注意力：一行手算',
      dur: 13,
      build: buildSceneAttention,
      cues: [
        { at: 0.3, s: '公式只有一行：$\\mathrm{softmax}(QK^\\top / \\sqrt{d_k})\\,V$。拿一个 $d_k = 4$ 的玩具例子走一遍。' },
        { at: 1.0, s: 'query 是「sat」的 $q = [1, 0, 1, 0]$，三个 key 分别来自 The、cat、sat。' },
        { at: 2.4, s: '先算点积：$q \\cdot k$ = **' + ATT.raw.join(' / ') + '**，「cat」和「sat」的 query 最像。' },
        { at: 4.4, s: '除以 $\\sqrt{4} = 2$，得到 ' + ATT.scaled.map(function (v) { return fmt(v, 1); }).join(' / ') + '。' },
        { at: 6.0, s: 'softmax 变成权重：**' + ATT.w.map(function (v) { return fmt(v, 3); }).join(' / ') + '**，加起来正好是 1。' },
        { at: 8.0, s: '按权重把 value 加起来：输出 = [' + fmt(ATT.out[0], 3) + ', ' + fmt(ATT.out[1], 3) + ']。' },
        { at: 11.2, s: '一句话：**谁和我像，就多拿谁的 value** —— 整个序列一次矩阵乘法算完。' }
      ]
    },
    {
      title: '为什么要除以 $\\sqrt{d_k}$',
      dur: 12,
      build: buildSceneScale,
      cues: [
        { at: 0.3, s: '论文脚注 4：若 $q$、$k$ 的分量独立、均值 0、方差 1，点积的方差就是 $d_k$。' },
        { at: 1.2, s: '论文用 $d_k = 64$，点积的标准差是 **8** —— 分数动不动就上十。' },
        { at: 3.0, s: '同一组分数 12 / 4 / −4 / 6 直接进 softmax：最大那项拿走 **' + fmt(SCALE.pRaw[0], 3) + '**，几乎 one-hot。' },
        { at: 5.8, s: '除以 8 之后是 1.5 / 0.5 / −0.5 / 0.75，权重变成 ' + SCALE.pScaled.map(function (v) { return fmt(v, 2); }).join(' / ') + '。' },
        { at: 8.6, s: 'softmax 在最大项处的梯度是 $p(1-p)$：**' + fmt(SCALE.gRaw, 4) + '** 对 **' + fmt(SCALE.gScaled, 3) + '**。' },
        { at: 10.6, s: '不缩放时梯度几乎为 0，注意力学不动 —— 这就是那个 $1/\\sqrt{d_k}$ 的全部理由。' }
      ]
    },
    {
      title: '多头：8 个 64 维的头',
      dur: 12,
      build: buildSceneHeads,
      cues: [
        { at: 0.3, s: '一个头只能给出一组权重，平均下来会把不同关系糊在一起。' },
        { at: 0.8, s: '论文把 512 维的 $Q, K, V$ 各投影 8 次，每头 $d_k = d_v = 64$，并行算完再拼接、乘 $W^O$。' },
        { at: 2.0, s: '每头维度缩成 1/8，**总计算量与单头满维度相近** —— 多头不是白送的算力，而是切分方式。' },
        { at: 5.2, s: 'Table 3 (A) 保持计算量不变只改头数：1 头 24.9，4 头 25.5，8 头 25.8，16 头 25.8，32 头 25.4。' },
        { at: 10.2, s: '单头低 **0.9** BLEU；头太多、每头只剩 16 维时又掉下来。' }
      ]
    },
    {
      title: '位置编码：给每个位置一组正弦',
      dur: 12,
      build: buildScenePosition,
      cues: [
        { at: 0.3, s: '注意力本身不分先后：打乱词序，输出只是跟着换位。位置信息只能**加进输入**。' },
        { at: 1.4, s: '每个维度一条正弦：维度越高频率越低，波长从 $2\\pi$ 一直到 $10000 \\cdot 2\\pi$。' },
        { at: 5.0, s: '玩具算例 $d_{model} = 4$：$PE(1)$ = [' + PE1.map(function (v) { return fmt(v, 3); }).join(', ') + ']，$PE(2)$ = [' + PE2.map(function (v) { return fmt(v, 3); }).join(', ') + ']。' },
        { at: 7.8, s: '对固定偏移 $k$，$PE_{pos+k}$ 是 $PE_{pos}$ 的线性函数 —— 作者**假设**这样模型容易学到相对位置。' },
        { at: 9.6, s: 'Table 3 (E)：换成可学习的位置嵌入，dev BLEU 25.7 对 25.8，几乎一样。' },
        { at: 10.6, s: '选正弦的理由写得很克制：**可能**能外推到比训练时更长的序列。' }
      ]
    },
    {
      title: '编码器 × 6、解码器 × 6 与因果掩码',
      dur: 13,
      build: buildSceneStack,
      cues: [
        { at: 0.3, s: '每个子层外面都包一层残差再做 LayerNorm：$\\mathrm{LayerNorm}(x + \\mathrm{Sublayer}(x))$。' },
        { at: 0.8, s: '编码器 6 层：多头自注意力 + 逐位置 FFN（$512 \\to 2048 \\to 512$，中间 ReLU）。' },
        { at: 3.4, s: '解码器 6 层，多一个子层：**交叉注意力**，query 来自解码器，key 和 value 来自编码器输出。' },
        { at: 7.2, s: '解码器的自注意力要加掩码：把「未来」位置的 logit 设成 $-\\infty$，softmax 后权重为 0。' },
        { at: 10.2, s: 'base 模型 65M 参数；big 把 $d_{model}$ 翻到 1024、16 个头，213M。' },
        { at: 11.8, s: '训练时整句**并行**算完（teacher forcing），推理时仍是**逐词**自回归生成。' }
      ]
    },
    {
      title: '训练配方与结果',
      dur: 13,
      build: buildSceneResults,
      cues: [
        { at: 0.3, s: '学习率不是常数：式 (3) 先**线性预热 4000 步**，再按 $1/\\sqrt{step}$ 衰减。' },
        { at: 1.2, s: '$d_{model} = 512$ 时峰值落在第 4000 步，约 ' + LR_PEAK.toExponential(2) + '；到第 10 万步降到 ' + LR_100K.toExponential(2) + '。' },
        { at: 4.2, s: '其余配方：Adam（$\\beta_2 = 0.98$）、残差 dropout 0.1、标签平滑 0.1 —— 困惑度变差，BLEU 反而更高。' },
        { at: 6.0, s: 'Table 2 英→德：big 模型 **28.4**，比之前最好的集成模型（26.36）高 2 分以上；base 也有 27.3。' },
        { at: 9.0, s: '8 张 P100：base 12 小时，big 3.5 天；英→法 41.8。英→德 big 的训练 FLOPs 是 2.3e19，低于此前的集成模型。' },
        { at: 11.6, s: '后来的 BERT、GPT、ViT、DiT，到 π₀、GR00T 这些机器人 VLA，骨架都是这一套块。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '七幕动画：Transformer 全流程速览',
      sub: '约 87 秒自动播放。空格播放/暂停，← → 换幕；手算例子与笔记「🚶 具体实例」用的是同一组数字。',
      ariaLabel: 'Transformer 七幕讲解动画',
      notes: [
        '取数依据：第一幕的复杂度来自论文 Table 1；第四幕的 BLEU 来自 Table 3 (A)，第五幕的 25.7 / 25.8 来自 Table 3 (E)，第七幕来自式 (3)、§5 与 Table 2。',
        '第二、三幕的向量和分数是笔记自己构造的**玩具算例**（$d_k = 4$ 的三个词、$d_k = 64$ 的一组分数），只演示机制，不是论文里的数。',
        '第七幕最后一句是本站的关联梳理（π₀ 的 Gemma 主干、GR00T N1 的 DiT 动作头），不是论文的结论。'
      ],
      scenes: TF_SCENES
    });
  }

  // ─── the narrated vertical video of the same seven scenes ─────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：Transformer 七幕全流程',
      sub: '5 分 51 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的七幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '7.7 MB',
      fileName: 'Transformer_讲解视频.mp4'
    });
  }

  K.mount({
    'tf-explainer': buildExplainerDemo,
    'tf-video': buildVideoDemo
  });
})();
