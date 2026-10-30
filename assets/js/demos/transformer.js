/* Transformer (Attention Is All You Need) demos for
 * papers/01_Foundational_RL/Transformer_Attention_Is_All_You_Need
 * （Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin · arXiv 1706.03762 v7，NIPS 2017；
 *   官方实现 tensorflow/tensor2tensor）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["transformer"]`, after assets/js/demos/kit.js. The note itself only
 * holds empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * 论文本身只做翻译；这一版从机器人的角度讲：每一幕先讲论文的做法，再对照本站机器人论文怎么用同一块零件
 * （第 014 期真实世界人形行走的因果 Transformer、Diffusion Policy、π₀、GR00T N1、MaskedMimic）。
 * 机器人那一侧的数字都取自本站对应笔记，不是这篇论文的内容，分镜和旁白都标明。
 *
 * Demos:
 *   tf-explainer — 十七幕讲解动画：为什么机器人要读一篇翻译论文 → 一步等一步：RNN 的串行瓶颈 → 表一：三种层比三件事 →
 *                  机器人的 token 是什么 → Q、K、V：一份输入，三种角色 → 手算一次注意力 → 为什么要除以 √d_k →
 *                  多头：8 个 64 维的头 → 位置编码：把顺序加回来 → 残差、LayerNorm 和前馈网络 →
 *                  因果掩码：只看过去 → 交叉注意力：去读另一串 token → 训练整句并行，推理一个一个来 →
 *                  训练配方：预热 4000 步 → 表二：翻译结果与训练开销 → 表三、表四：消融与句法分析 → 局限，以及机器人怎么接着用
 *   tf-video     — 同一套十七幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   tf-attention — 注意力计算器：机器人最近 3 步的玩具向量，选哪一步当 query、缩不缩放、加不加因果掩码
 *   tf-scale     — √d_k 实验：随机向量的点积有多分散、softmax 有多尖、梯度还剩多少（d_k 可拖到 48 / 64 / 256）
 *   tf-cost      — 表一计算器：序列多长、宽度多少，自注意力和循环层谁更便宜，因果掩码留下多少对
 */

(function () {
  'use strict';

  var K = window.PaperDemoKit;
  function assetBase(rel) {
    var cs = document.currentScript;
    try {
      return cs && cs.src ? new URL(rel, cs.src).href : '';
    } catch (e) {
      return '';
    }
  }
  /* 论文的图（arXiv 源文件里的 Figure 1、2 与附录的注意力可视化；论文首页写明允许在学术作品里注明出处后复制图表）
     放在 assets/img/papers/transformer/；第 014 期真实世界人形行走项目页视频的两段剪辑放在 clips/；
     G1 走路的贴图借第 032 期 HOMIE 的复现（assets/img/papers/homie/g1_3d/g1_walk.webp）；
     Digit、UR5、UR5e、GR-1 的真机图取自 Robot_Description_Gallery（assets/img/robots/） */
  var IMG_BASE = assetBase('../../img/papers/');
  var PAPER_IMG_BASE = IMG_BASE ? IMG_BASE + 'transformer/' : '';
  var CLIP_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'clips/' : '';
  var HOMIE_3D_BASE = IMG_BASE ? IMG_BASE + 'homie/g1_3d/' : '';
  var ROBOT_BASE = assetBase('../../img/robots/');

  var el = K.el,
    fmt = K.fmt,
    clamp = K.clamp,
    card = K.card,
    controlsRow = K.controlsRow,
    slider = K.slider,
    buttonGroup = K.buttonGroup,
    checkbox = K.checkbox,
    statsRow = K.statsRow,
    verdictBox = K.verdictBox,
    note = K.note,
    table = K.table,
    stage = K.stage,
    begin = K.begin,
    plot = K.plot,
    line = K.line,
    dot = K.dot,
    text = K.text,
    axes = K.axes,
    registerRenderer = K.registerRenderer,
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
  /* 视频里分镜按 1080 宽、约 1.2 倍放大，9–10.5 号字只有 11–12 px，手机上看不清（FALCON 2026-10-25 看片反馈）：
     9–9.5 号放到 11，10–10.5 号放到 11.5 */
  function minFont(size) {
    return size == null ? size : size < 9.75 ? Math.max(size, 11) : size < 11 ? Math.max(size, 11.5) : size;
  }
  var kitText = svgText, kitRich = svgRich;
  svgText = function (x, y, str, cls, size, anchor) { return kitText(x, y, str, cls, minFont(size), anchor); };
  svgRich = function (x, y, str, opts) {
    var o = {}, k;
    for (k in opts || {}) o[k] = opts[k];
    o.size = minFont(o.size);
    return kitRich(x, y, str, o);
  };

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_PURPLE = X.purple,
    C_MUTED = X.muted,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2,
    C_INK = X.ink;
  /* 全片配色：query 蓝、key 橙、value 绿；掩码 / 不缩放 / 循环层红；机器人这一侧紫；论文的数字黄 */
  var C_Q = C_ACCENT, C_K = C_WARN, C_V = C_GOOD, C_ROBOT = C_PURPLE, C_RNN = C_BAD;
  /* 八个头的颜色（第 8 幕）：照论文附录可视化的顺序，蓝、橙、绿、红、紫、棕、粉、灰 */
  var HEAD_COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'];

  // ─── 论文里的数字（arXiv 1706.03762 v7：表 1–4、式 1–3、§3.1–3.5、§5、§6） ─────────────────────
  function softmax(xs) {
    var m = Math.max.apply(null, xs);
    var e = xs.map(function (x) { return Math.exp(x - m); });
    var s = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (x) { return x / s; });
  }
  function dotv(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }
  var D_MODEL = 512, D_FF = 2048, N_HEADS = 8, D_K = 64, N_LAYERS = 6, WARMUP = 4000, VOCAB = 37000;

  /* 第 6 幕与「🚶 具体实例」例 1：机器人最近 3 步，第 t 步的 query 对三步的 key 做缩放点积注意力，d_k = 4。
     向量是笔记构造的玩具数（只演示机制），value 取 2 维方便画在平面上 */
  var STEPS = ['t−2', 't−1', 't'];
  var ATT = (function () {
    var q = [1, 0, 1, 0];
    var keys = [[1, 0, 0, 0], [1, 1, 1, 0], [0, 0, 1, 1]];
    var vals = [[1, 0], [0, 1], [1, 1]];
    var dk = q.length;
    var raw = keys.map(function (k) { return dotv(q, k); });
    var scaled = raw.map(function (s) { return s / Math.sqrt(dk); });
    var w = softmax(scaled);
    var out = [0, 1].map(function (j) {
      return w.reduce(function (acc, wi, i) { return acc + wi * vals[i][j]; }, 0);
    });
    return { q: q, keys: keys, vals: vals, dk: dk, raw: raw, scaled: scaled, w: w, out: out };
  })();
  /* 演示 tf-attention：三步各自的 query（第 t 步就是上面那个 q；另外两个也是玩具数） */
  var QUERIES = [[0, 0, 0, 1], [1, 1, 0, 0], [1, 0, 1, 0]];

  /* 第 7 幕与例 2：d_k = 64 时点积的标准差是 8；同一组分数缩放前后的 softmax 与最大项的梯度 */
  var SCALE = (function () {
    var dk = 64;
    var raw = [12, 4, -4, 6];
    var scaled = raw.map(function (s) { return s / Math.sqrt(dk); });
    var pRaw = softmax(raw), pScaled = softmax(scaled);
    return {
      dk: dk, std: Math.sqrt(dk), raw: raw, scaled: scaled, pRaw: pRaw, pScaled: pScaled,
      gRaw: pRaw[0] * (1 - pRaw[0]), gScaled: pScaled[0] * (1 - pScaled[0])
    };
  })();
  /* 不缩放时点积的标准差 √d_k：第 014 期 Digit 的因果 Transformer 每头 192 / 4 = 48 维，论文 64 维，π₀ 的 Gemma 每头 256 维 */
  var HEAD_DIMS = [['Digit 行走（第 014 期）', 48], ['论文 base', 64], ['π₀ 的 Gemma 2B', 256]];

  /* 第 8 幕：表 3 (A) —— 头数与每头维度一起变、总计算量不变；(B) 只缩小 d_k。newstest2013 dev BLEU */
  var HEADS = [
    { h: 1, dk: 512, ppl: 5.29, bleu: 24.9 },
    { h: 4, dk: 128, ppl: 5.0, bleu: 25.5 },
    { h: 8, dk: 64, ppl: 4.92, bleu: 25.8 },
    { h: 16, dk: 32, ppl: 4.91, bleu: 25.8 },
    { h: 32, dk: 16, ppl: 5.01, bleu: 25.4 }
  ];
  var KEYDIM = [{ dk: 16, bleu: 25.1, params: 58 }, { dk: 32, bleu: 25.4, params: 60 }, { dk: 64, bleu: 25.8, params: 65 }];

  /* 第 9 幕与例 4：正弦位置编码；d_model = 4 的玩具算例 */
  function pe(pos, dModel) {
    var v = [];
    for (var i = 0; i < dModel / 2; i++) {
      var ang = pos / Math.pow(10000, (2 * i) / dModel);
      v.push(Math.sin(ang), Math.cos(ang));
    }
    return v;
  }
  var PE1 = pe(1, 4), PE2 = pe(2, 4);

  /* 第 10 幕与例 5：按标准结构数参数（tensor2tensor 的 Q、K、V 与输出投影不带偏置，FFN 带偏置，LayerNorm 每处 2d）；
     词表取论文写的「约 37000」。表 3 写 base 65 M、big 213 M */
  function countParams(d, dff, vocab) {
    var attn = 4 * d * d, ffn = 2 * d * dff + dff + d, ln = 2 * d;
    var enc = attn + ffn + 2 * ln, dec = 2 * attn + ffn + 3 * ln;
    return { emb: vocab * d, enc: enc, dec: dec, total: vocab * d + N_LAYERS * (enc + dec) };
  }
  var PARAMS_BASE = countParams(512, 2048, VOCAB), PARAMS_BIG = countParams(1024, 4096, VOCAB);

  /* 第 11 幕与例 3：因果掩码下 n 个 token 留下 n(n+1)/2 对；第 014 期 Digit 的上下文窗口是 16 步 */
  function causalPairs(n) { return n * (n + 1) / 2; }
  var MASK_N = 6, RH_CTX = 16;

  /* 第 3 幕与例 6：按表 1 的量级粗算，自注意力每层 n²·d、循环层 n·d²，两者之比是 d / n（忽略常数，我们的估算）。
     n、d 取本站笔记：第 014 期 Digit 16 步、宽 192；π₀ 一次推理 816 个前缀 token + 51 个后缀 token、Gemma 2B 宽 2048 */
  var PI0_TOK = { img: 256, cams: 3, text: 48, state: 1, act: 50 };
  var PI0_N = PI0_TOK.img * PI0_TOK.cams + PI0_TOK.text + PI0_TOK.state + PI0_TOK.act;
  var COST_CASES = [
    { key: 'rh', zh: 'Digit 行走（第 014 期）', n: RH_CTX, d: 192 },
    { key: 'pi0', zh: 'π₀ 一次推理', n: PI0_N, d: 2048 }
  ];

  /* 第 14 幕与例 7：式 (3) 的学习率 —— 预热 4000 步后按 1/√step 衰减 */
  function lrate(step, dModel, warm) {
    var d = dModel || D_MODEL, w = warm || WARMUP;
    return Math.pow(d, -0.5) * Math.min(Math.pow(step, -0.5), step * Math.pow(w, -1.5));
  }
  var LR_PEAK = lrate(WARMUP), LR_100K = lrate(100000);

  /* 第 15 幕：表 2（newstest2014）。FLOPs 是作者按「训练时间 × GPU 数 × 单卡持续算力」估的 */
  var TABLE2 = [
    { zh: 'GNMT + RL', de: 24.6, fr: 39.92, flops: 2.3e19 },
    { zh: 'ConvS2S', de: 25.16, fr: 40.46, flops: 9.6e18 },
    { zh: 'MoE', de: 26.03, fr: 40.56, flops: 2.0e19 },
    { zh: 'GNMT + RL 集成', de: 26.30, fr: 41.16, flops: 1.8e20 },
    { zh: 'ConvS2S 集成', de: 26.36, fr: 41.29, flops: 7.7e19 },
    { zh: 'Transformer base', de: 27.3, fr: 38.1, flops: 3.3e18, ours: true },
    { zh: 'Transformer big', de: 28.4, fr: 41.8, flops: 2.3e19, ours: true }
  ];
  /* 第 16 幕：表 3 (C)(D)(E) 与 big，dev BLEU；base 25.8 */
  var TABLE3 = [
    { g: 'C', zh: '$N=2$', bleu: 23.7 }, { g: 'C', zh: '$N=4$', bleu: 25.3 }, { g: 'C', zh: '$N=8$', bleu: 25.5 },
    { g: 'C', zh: '$d_{model}=256$', bleu: 24.5 }, { g: 'C', zh: '$d_{model}=1024$', bleu: 26.0 },
    { g: 'C', zh: '$d_{ff}=1024$', bleu: 25.4 }, { g: 'C', zh: '$d_{ff}=4096$', bleu: 26.2 },
    { g: 'D', zh: '$P_{drop}=0$', bleu: 24.6 }, { g: 'D', zh: '$P_{drop}=0.2$', bleu: 25.5 },
    { g: 'D', zh: '$\\epsilon_{ls}=0$', bleu: 25.3 }, { g: 'D', zh: '$\\epsilon_{ls}=0.2$', bleu: 25.7 },
    { g: 'E', zh: '可学习位置嵌入', bleu: 25.7 },
    { g: 'big', zh: 'big', bleu: 26.4 }
  ];
  var BASE_DEV = 25.8;
  /* 表 4：WSJ 第 23 节 F1 */
  var TABLE4 = [
    { zh: 'Transformer（只用 WSJ）', f1: 91.3, ours: true }, { zh: 'Dyer 等 RNNG（只用 WSJ）', f1: 91.7 },
    { zh: 'Transformer（半监督）', f1: 92.7, ours: true }, { zh: 'Dyer 等 RNNG（生成式）', f1: 93.3 }
  ];
  /* 第 17 幕：第 014 期真实世界人形行走图 8A 的读图近似值（只换学生网络，3 个场景共 30 次）——那篇论文的结果，不是这篇的 */
  var RH_FIG8A = [['Transformer', 97], ['LSTM', 89], ['TCN', 86], ['MLP', 75]];

  // ─── small drawing helpers ─────────────────────────────────────────────
  /* 视频里一幕要讲一分钟左右，画面不能停：draw(t, clock) 的 clock 是这一幕的真实时间
     （旁白比分镜长时 t 停在一段的末尾，clock 照走），循环的动作按 clock 播；网页播放器只传 t。
     各幕的 cue 时刻都落在 0.4 / 3.6 / 7.0 / 10.4 / 13.4，一次性的出场动画不跨过这些时刻。 */
  var CUES = [0.4, 3.6, 7.0, 10.4, 13.4];
  function nowOf(t, clock) {
    return clock == null ? t : clock;
  }
  /* 一段窗口：a 之后 0.3 s 起淡入 0.4 s，到 b 才开始淡出 0.3 s（AGENTS.md「面板到 cue 之后才淡出」） */
  function win(t, a, b) {
    return seg(t, a + 0.3, a + 0.7) * (b == null ? 1 : 1 - seg(t, b, b + 0.3));
  }
  /* 第 k 段（0–4）的窗口 */
  function winK(t, k) {
    return win(t, k ? CUES[k] : 0.3, k < 4 ? CUES[k + 1] : null);
  }
  /* 五块面板按 cue 轮流出现 */
  function panels(t, ps) {
    ps.forEach(function (p, k) { if (p) setOpacity(p, winK(t, k)); });
  }
  /* 一幕里从 cue 起算的秒数：网页上就是 t − cue；视频里按时间线算 cue 那一刻起过了多久（K.clipSince）。
     不能用 clock − cue：clock 从这一幕开头算，前面几段旁白比分镜长时，到 cue 那一刻 clock 早已大于 cue（HOMIE 2026-10-22） */
  function since(t, clock, cue) {
    /* stage.html 的 fitStory 量外框时用 draw(t, t) 扫一遍；那时时间线的 CUR 还停在别的幕，clipSince 给不出这一幕的值，
       所以 clock === t 时按网页的算法走，外框才量得到动画末尾的样子 */
    if (clock == null || clock === t) return t - cue;
    return Math.max(0, K.clipSince(t, cue));
  }
  function group(parent) {
    var g = svgEl('g', {});
    parent.appendChild(g);
    return g;
  }
  function rectBox(parent, x, y, w, h, stroke, fill, dash) {
    var r = paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 7, 'stroke-width': 1.3 }), fill || C_SURFACE, stroke || C_BORDER);
    if (dash) r.setAttribute('stroke-dasharray', dash);
    parent.appendChild(r);
    return r;
  }
  function chip(parent, x, y, w, str, color, opts) {
    var o = opts || {};
    var g = group(parent), h = o.h || 28;
    var r = rectBox(g, x, y, w, h, color, o.fill || C_SURFACE, o.dash);
    var t = svgRich(x + (o.left ? 10 : w / 2), y + h / 2 + 4, str, { size: o.size || 11.5, anchor: o.left ? 'start' : 'middle', w: w - 12, cls: o.cls || 'demo-x-ink2' });
    g.appendChild(t);
    g.box = r; g.txt = t;
    return g;
  }
  function fmtPath(pts2) {
    return pts2.length ? polyPath(pts2.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })) : 'M 0 0';
  }
  function pathLine(parent, pts2, color, width, dash) {
    var p = paint(svgEl('path', { d: fmtPath(pts2), fill: 'none', 'stroke-width': width || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }), null, color);
    if (dash) p.setAttribute('stroke-dasharray', dash);
    parent.appendChild(p);
    return p;
  }
  function setPath(p, pts2) {
    p.setAttribute('d', fmtPath(pts2));
  }
  function dotAt(parent, cx, cy, r, color) {
    var c = paint(svgEl('circle', { cx: cx, cy: cy, r: r }), color);
    parent.appendChild(c);
    return c;
  }
  function ringAt(parent, cx, cy, r, color, w) {
    var c = paint(svgEl('circle', { cx: cx, cy: cy, r: r, fill: 'none', 'stroke-width': w || 2 }), null, color);
    parent.appendChild(c);
    return c;
  }
  function moveDot(c, p) {
    c.setAttribute('cx', p[0].toFixed(1));
    c.setAttribute('cy', p[1].toFixed(1));
  }
  function hline(parent, x1, y1, x2, y2, color, w, dash) {
    var l = paint(svgEl('line', { x1: x1, y1: y1, x2: x2, y2: y2, 'stroke-width': w || 1.2 }), null, color);
    if (dash) l.setAttribute('stroke-dasharray', dash);
    parent.appendChild(l);
    return l;
  }
  function setLine(l, x1, y1, x2, y2) {
    l.setAttribute('x1', x1.toFixed(1)); l.setAttribute('y1', y1.toFixed(1));
    l.setAttribute('x2', x2.toFixed(1)); l.setAttribute('y2', y2.toFixed(1));
  }
  function hbar(parent, x, y, h, color, opacity) {
    var r = paint(svgEl('rect', { x: x, y: y, width: 0, height: h, rx: 2.5, opacity: opacity == null ? 0.9 : opacity }), color);
    parent.appendChild(r);
    return r;
  }
  function vbar(parent, x, w, color) {
    var r = paint(svgEl('rect', { x: x, y: 0, width: w, height: 0, rx: 2 }), color);
    parent.appendChild(r);
    return {
      node: r,
      set: function (yBase, h) { r.setAttribute('y', (yBase - Math.max(0, h)).toFixed(1)); r.setAttribute('height', Math.max(0, h).toFixed(1)); }
    };
  }
  function setW(node, w) {
    node.setAttribute('width', Math.max(0, w).toFixed(1));
  }
  function label(parent, x, y, str, cls, size, anchor) {
    var n = svgText(x, y, str, cls || 'demo-x-ink2', size || 11, anchor);
    parent.appendChild(n);
    return n;
  }
  function tone(parent, x, y, str, color, size, anchor) {
    var n = paint(svgText(x, y, str, null, size || 11, anchor), color);
    parent.appendChild(n);
    return n;
  }
  function rich(parent, x, y, str, size, cls, anchor, w) {
    var n = svgRich(x, y, str, { size: size || 12, cls: cls || 'demo-x-ink2', anchor: anchor || 'start', w: w });
    parent.appendChild(n);
    return n;
  }
  function math(parent, x, y, tex, size, anchor, w) {
    var n = svgMath(x, y, tex, { size: size || 14, anchor: anchor || 'start', w: w });
    parent.appendChild(n);
    return n;
  }
  function arrowHead(parent, color) {
    var p = paint(svgEl('path', { d: 'M 0 0', 'stroke-width': 0 }), color);
    parent.appendChild(p);
    return {
      node: p,
      set: function (x1, y1, x2, y2, size) {
        var a = Math.atan2(y2 - y1, x2 - x1), s = size || 8;
        var p1 = [x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45)], p2 = [x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)];
        p.setAttribute('d', 'M ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' L ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' L ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + ' Z');
      }
    };
  }
  /* 一支箭：线 + 箭头 */
  function arrow(parent, color, width, dash) {
    var g = group(parent), l = hline(g, 0, 0, 0, 0, color, width || 2.4, dash), h = arrowHead(g, color);
    return {
      g: g, line: l,
      set: function (x1, y1, x2, y2, size) { setLine(l, x1, y1, x2, y2); h.set(x1, y1, x2, y2, size || 9); }
    };
  }
  /* 论文图的一块：图片 imgW × imgH 像素，按比例裁出 (u0, v0)–(u1, v1)，宽度为 w（高按比例）摆到 (x, y)，白底；返回实际高 */
  function figPart(parent, file, imgW, imgH, u0, v0, u1, v1, x, y, w, caption) {
    var g = group(parent), cw = (u1 - u0) * imgW, chh = (v1 - v0) * imgH, h = w * chh / cw;
    g.appendChild(svgEl('rect', { x: (x - 3).toFixed(1), y: (y - 3).toFixed(1), width: (w + 6).toFixed(1), height: (h + 6).toFixed(1), rx: 5, fill: '#ffffff', stroke: 'none' }));
    var box = svgEl('svg', { x: x.toFixed(1), y: y.toFixed(1), width: w.toFixed(1), height: h.toFixed(1), overflow: 'hidden', preserveAspectRatio: 'none',
      viewBox: [(u0 * imgW).toFixed(1), (v0 * imgH).toFixed(1), cw.toFixed(1), chh.toFixed(1)].join(' ') });
    box.appendChild(svgEl('image', { href: PAPER_IMG_BASE + file, x: 0, y: 0, width: imgW, height: imgH, preserveAspectRatio: 'none' }));
    g.appendChild(box);
    if (caption) g.appendChild(svgText(x + w / 2, y + h + 17, caption, 'demo-x-mut', 9.5, 'middle'));
    return { g: g, h: h, x: x, y: y, w: w };
  }
  var FIGS = {
    its: ['fig4_its.webp', 877, 643]
  };
  function paperPart(parent, key, u0, v0, u1, v1, x, y, w, caption) {
    var F = FIGS[key];
    return figPart(parent, F[0], F[1], F[2], u0, v0, u1, v1, x, y, w, caption);
  }
  /* 项目页的一段视频：深色底框，下面一行小字写出处；draw 里调 .at(秒, 是否可见) */
  function projClip(parent, id, x, y, w, h, caption, opts) {
    var o = opts || {}, g = group(parent);
    g.appendChild(svgEl('rect', { x: (x - 2).toFixed(1), y: (y - 2).toFixed(1), width: (w + 4).toFixed(1), height: (h + 4).toFixed(1), rx: 5, fill: '#111111', stroke: 'none' }));
    var c = K.svgClip(x, y, w, h, CLIP_BASE + id + '.mp4', { poster: CLIP_BASE + id + '.webp' });
    g.appendChild(c);
    if (caption) label(g, o.capX == null ? x + w / 2 : o.capX, y + h + (o.capDy || 15), caption, o.capCls || 'demo-x-mut', o.capSize || 9.5, o.capAnchor || 'middle');
    return { g: g, x: x, y: y, w: w, h: h, at: function (sec, vis) { c.at(sec, vis); } };
  }
  function f1(x) { return fmt(x, 1); }
  function f2(x) { return fmt(x, 2); }
  function f3(x) { return fmt(x, 3); }
  /* 排版用的负号 */
  function sgn(s) { return String(s).replace(/-/g, '−'); }
  /* 横向条形图的一行：标签、条、数字 */
  function barRowAt(parent, x, y, labelW, str, color, h, size, richVal) {
    var g = group(parent);
    var lb = str.indexOf('$') >= 0 ? rich(g, x + labelW - 8, y + (h || 14) / 2 + 4, str, size || 10.5, 'demo-x-ink2', 'end', labelW)
      : label(g, x + labelW - 8, y + (h || 14) / 2 + 4, str, 'demo-x-ink2', size || 10.5, 'end');
    var b = hbar(g, x + labelW, y, h || 14, color);
    /* richVal：读数里有公式（$3.3\times10^{18}$），走 svgRich */
    var v = richVal ? rich(g, x + labelW + 6, y + (h || 14) / 2 + 4, '', size || 10.5, 'demo-x-ink', 'start', 160)
      : halo(label(g, x + labelW + 6, y + (h || 14) / 2 + 4, '', 'demo-x-ink', size || 10.5));
    return {
      g: g, bar: b, lab: lb,
      set: function (w, txt) {
        setW(b, w);
        if (richVal) { v.setX(x + labelW + Math.max(0, w) + 6); v.setText(txt); }
        else { v.setAttribute('x', (x + labelW + Math.max(0, w) + 6).toFixed(1)); v.textContent = txt; }
      }
    };
  }
  function legendRow(parent, x, y, items, size) {
    var g = group(parent), cx = x;
    items.forEach(function (it) {
      g.appendChild(paint(svgEl('rect', { x: cx, y: y - 8, width: 12, height: 10, rx: 2 }), it[1]));
      if (it[0].indexOf('$') >= 0) rich(g, cx + 16, y, it[0], size || 10.5, 'demo-x-ink2', 'start', it[2] || 120);
      else label(g, cx + 16, y, it[0], 'demo-x-ink2', size || 10.5);
      cx += 16 + (it[2] || textW(it[0], minFont(size || 10.5))) + 16;
    });
    return g;
  }
  /* 压在网格线、折线上的字描一圈底色 */
  function halo(n) {
    n.style.paintOrder = 'stroke'; n.style.stroke = C_SURFACE; n.style.strokeWidth = '3px'; n.style.strokeLinejoin = 'round';
    return n;
  }
  /* 一行读法：横轴、纵轴、颜色、越大还是越小越好 */
  function readHint(parent, x, y, str, size, w) {
    return rich(parent, x, y, '**读法**　' + str, size || 10.5, 'demo-x-ink2', 'start', w);
  }
  /* 一段流向：一条虚线，几颗小点沿着走；at(秒, 起点, 终点, 是否可见)。起点终点都放在框外，小点不从字上划过 */
  function flowSeg(parent, color, n, r, speed, noLine) {
    var g = group(parent), ln = noLine ? null : hline(g, 0, 0, 0, 0, color, 1.2, '3 4'), dots = [];
    for (var j = 0; j < (n || 3); j++) dots.push(dotAt(g, 0, 0, r || 3.4, color));
    return {
      g: g,
      at: function (sec, a, b, vis) {
        if (ln) setLine(ln, a[0], a[1], b[0], b[1]);
        var tot = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]));
        dots.forEach(function (c, j) {
          var d = (((sec * (speed || 60) + j * tot / dots.length) % tot) + tot) % tot, u = d / tot;
          moveDot(c, [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
          c.style.opacity = vis === false ? 0 : Math.min(1, Math.min(d, tot - d) / 8);
        });
      }
    };
  }
  /* 勾与叉 */
  function tick(parent, x, y, s, color) {
    var p = paint(svgEl('path', { d: 'M' + x + ' ' + (y + s * 0.5) + ' l' + s * 0.35 + ' ' + s * 0.38 + ' l' + s * 0.65 + ' ' + (-s * 0.8), fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }), null, color || C_GOOD);
    parent.appendChild(p);
    return p;
  }
  function cross(parent, x, y, s, color) {
    var p = paint(svgEl('path', { d: 'M' + x + ' ' + y + ' l' + s + ' ' + s + ' M' + (x + s) + ' ' + y + ' l' + (-s) + ' ' + s, fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round' }), null, color || C_BAD);
    parent.appendChild(p);
    return p;
  }
  /* 数字从 0 数到 v（u ∈ [0, 1]），千分位 */
  function countTo(v, u, digits) {
    var x = v * clamp(u, 0, 1);
    return digits ? x.toFixed(digits) : Math.round(x).toLocaleString('en-US');
  }
  /* 论文 ↔ 代码 翻牌：每行一个名字和一张卡片，卡片在论文值（橙）和代码值（绿）之间来回翻；set(秒) 按 1.6 s 一翻 */
  function flipList(parent, x, y0, items, nameW, boxW, rowH) {
    var rh = rowH || 40;
    var rows = items.map(function (f, i) {
      var y = y0 + i * rh;
      if (f[0].indexOf('$') >= 0) rich(parent, x, y + 20, f[0], 12); else label(parent, x, y + 20, f[0], 'demo-x-ink2', 12);
      var box = rectBox(parent, x + nameW, y, boxW, 30, C_BORDER, C_SURFACE);
      var v = rich(parent, x + nameW + boxW / 2, y + 20, '', 12, 'demo-x-ink', 'middle', boxW - 8);
      var who = label(parent, x + nameW + boxW + 10, y + 20, '', 'demo-x-mut', 11.5);
      return { box: box, v: v, who: who, f: f };
    });
    return {
      set: function (sec) {
        var side = Math.floor(Math.max(0, sec) / 1.6) % 2, ph = (Math.max(0, sec) % 1.6) / 1.6;
        var sq = ph < 0.12 ? Math.abs(1 - ph / 0.06) : 1;
        rows.forEach(function (r) {
          r.v.setText(side ? r.f[2] : r.f[1]);
          r.who.textContent = side ? '代码' : '论文';
          r.box.style.stroke = side ? C_GOOD : C_WARN;
          r.v.style.opacity = sq;
        });
      }
    };
  }
  /* 确定性随机：第 i 个、种子 s 的 [0, 1) 随机数 */
  function rnd(i, s) {
    var a = (i * 2654435761 + (s || 1) * 40503) >>> 0;
    a = (a + 0x6d2b79f5) >>> 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /* 标准正态（Box–Muller），同样是确定性的 */
  function nrm(i, s) {
    var u = 1 - rnd(2 * i, s), v = rnd(2 * i + 1, s);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  /* 一行字的宽度估计（中文按 1 个字号、其余按 0.55 个字号），排版用 */
  function textW(str, size) {
    var w = 0;
    for (var i = 0; i < str.length; i++) w += str.charCodeAt(i) > 255 ? size : size * 0.55;
    return w;
  }
  /* 一组小方格，n 个，每行 cols 个；fill(m) 点亮前 m 个 */
  function cellGrid(parent, x, y, n, cols, size, gap, color) {
    var g = group(parent), cells = [];
    for (var i = 0; i < n; i++) {
      var r = paint(svgEl('rect', { x: x + (i % cols) * (size + gap), y: y + Math.floor(i / cols) * (size + gap), width: size, height: size, rx: Math.min(2, size / 4) }), color);
      g.appendChild(r);
      cells.push(r);
    }
    return { g: g, cells: cells, fill: function (m) { cells.forEach(function (c, i) { c.style.opacity = i < m ? 1 : 0.15; }); } };
  }
  /* 一个向量画成一排小格：值 0–1 映射成颜色深浅，格里写数字；set(vals) 改值 */
  function vecRow(parent, x, y, n, cw, color, opts) {
    var o = opts || {}, g = group(parent), cells = [], txts = [];
    for (var i = 0; i < n; i++) {
      var r = paint(svgEl('rect', { x: x + i * (cw + 3), y: y, width: cw, height: o.h || 22, rx: 3, 'stroke-width': 1.2 }), color, color);
      g.appendChild(r);
      cells.push(r);
      if (!o.noText) txts.push(label(g, x + i * (cw + 3) + cw / 2, y + (o.h || 22) / 2 + 4.5, '', 'demo-x-ink', o.size || 11.5, 'middle'));
    }
    return {
      g: g, cells: cells,
      set: function (vals, digits) {
        vals.forEach(function (v, i) {
          cells[i].style.fillOpacity = (0.12 + 0.75 * clamp(Math.abs(v), 0, 1)).toFixed(2);
          if (txts[i]) txts[i].textContent = digits == null ? String(v) : sgn(fmt(v, digits));
        });
      }
    };
  }
  /* 真机图（Robot_Description_Gallery 按开源 URDF / MJCF 渲染，透明底）：按高度 h 摆到 (x, y) 左上角 */
  var ROBOTS = { digit: [183, 400], ur5: [325, 260], g1: [253, 640] };
  function robotImg(parent, key, x, y, h) {
    var R = ROBOTS[key], w = h * R[0] / R[1];
    var im = svgEl('image', { href: ROBOT_BASE + key + '.webp', x: x.toFixed(1), y: y.toFixed(1), width: w.toFixed(1), height: h.toFixed(1), preserveAspectRatio: 'none' });
    im.setAttribute('class', 'demo-x-g1mesh');
    parent.appendChild(im);
    return { node: im, w: w, h: h };
  }
  /* G1 走路的一帧（第 032 期 HOMIE 在 MuJoCo 里跑官方 deploy.onnx 的回放贴图，15 帧/秒、45 帧一个循环，相机跟着根部）：
     put(x, y, h, f) 把这一格的左上角放在 (x, y)、高 h，取第 f 帧。贴图第一次用到才设 href */
  var WALK = { file: 'g1_walk.webp', cw: 155, ch: 302, cols: 12, n: 45 };
  function g1Cell(parent) {
    var M = WALK, g = group(parent), rows = Math.ceil(M.n / M.cols);
    g.setAttribute('class', 'demo-x-g1mesh');
    var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: 0, height: 0 });
    var img = svgEl('image', { x: 0, y: 0, width: M.cw * M.cols, height: M.ch * rows, preserveAspectRatio: 'none' });
    box.appendChild(img);
    g.appendChild(box);
    var woke = false, lastF = -1;
    return {
      g: g,
      put: function (x, y, h, fr) {
        if (!woke && HOMIE_3D_BASE) { woke = true; img.setAttribute('href', HOMIE_3D_BASE + M.file); }
        var f = ((Math.round(fr) % M.n) + M.n) % M.n, w = h * M.cw / M.ch;
        box.setAttribute('x', x.toFixed(1)); box.setAttribute('y', y.toFixed(1));
        box.setAttribute('width', w.toFixed(1)); box.setAttribute('height', h.toFixed(1));
        if (f !== lastF) {
          box.setAttribute('viewBox', [(f % M.cols) * M.cw, Math.floor(f / M.cols) * M.ch, M.cw, M.ch].join(' '));
          lastF = f;
        }
      }
    };
  }
  /* 机器人的一段观测历史：n 个格子，每格一帧 G1，下面标 t−(n−1) … t；set(now) 让窗口随时间往前滑（每格隔 2 帧，即 2/15 s）。
     只是示意「每一步一个 token」，不是哪篇论文的数据 */
  function historyStrip(parent, x, y, n, cellW, cellH, opts) {
    var o = opts || {}, g = group(parent), cells = [], boxes = [], labs = [];
    for (var i = 0; i < n; i++) {
      var cx = x + i * (cellW + (o.gap == null ? 6 : o.gap));
      boxes.push(rectBox(g, cx, y, cellW, cellH, o.stroke || C_BORDER, C_SURFACE2));
      cells.push(g1Cell(g));
      var nm = i === n - 1 ? 't' : 't−' + (n - 1 - i);
      labs.push(label(g, cx + cellW / 2, y + cellH + 17, o.labels ? o.labels[i] : nm, 'demo-x-mono', 11, 'middle'));
    }
    var ih = cellH - 8, iw = ih * WALK.cw / WALK.ch;
    return {
      g: g, boxes: boxes, labs: labs,
      cx: function (i) { return x + i * (cellW + (o.gap == null ? 6 : o.gap)) + cellW / 2; },
      set: function (now) {
        var base = Math.floor(now * 7.5) * 2;
        cells.forEach(function (c, i) { c.put(x + i * (cellW + (o.gap == null ? 6 : o.gap)) + (cellW - iw) / 2, y + 4, ih, base + 2 * i); });
      }
    };
  }
  /* 一张 n × n 的注意力矩阵：cell(i, j) 的不透明度 = 权重；mask(i, j) 为 true 的格子画成暗色并写 −∞ */
  function attnGrid(parent, x, y, n, size, color) {
    var g = group(parent), cells = [], marks = [];
    for (var i = 0; i < n; i++) {
      cells.push([]); marks.push([]);
      for (var j = 0; j < n; j++) {
        var r = paint(svgEl('rect', { x: x + j * size, y: y + i * size, width: size - 2, height: size - 2, rx: 2 }), color);
        g.appendChild(r);
        cells[i].push(r);
        marks[i].push(null);
      }
    }
    return {
      g: g, cells: cells,
      set: function (fn) {
        for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
          var v = fn(i, j);
          cells[i][j].style.fill = v.color || color;
          cells[i][j].style.opacity = v.a.toFixed(3);
        }
      }
    };
  }
  // ─── 比喻用的小图标（2026-10-29 看片反馈：专业名词太多，多用比喻、简单例子和动效） ────────────
  /* 一个人：圆头 + 半圆肩，cx / cy 是头的中心，r 是头的半径；返回 { g, head, body, set(color, opacity) } */
  function person(parent, cx, cy, r, color) {
    var g = group(parent);
    var body = paint(svgEl('path', {
      d: 'M ' + (cx - 1.7 * r) + ' ' + (cy + 3.1 * r) + ' Q ' + (cx - 1.7 * r) + ' ' + (cy + 1.2 * r) + ' ' + cx + ' ' + (cy + 1.2 * r) +
        ' Q ' + (cx + 1.7 * r) + ' ' + (cy + 1.2 * r) + ' ' + (cx + 1.7 * r) + ' ' + (cy + 3.1 * r) + ' Z'
    }), color);
    var head = paint(svgEl('circle', { cx: cx, cy: cy, r: r }), color);
    g.appendChild(body); g.appendChild(head);
    return {
      g: g, head: head, body: body, cx: cx, cy: cy, r: r,
      set: function (c, a) { head.style.fill = c; body.style.fill = c; if (a != null) { head.style.opacity = a; body.style.opacity = a; } }
    };
  }
  /* 一张饼图：set(比例数组, 颜色数组)；比例按顺时针从 12 点钟方向排 */
  function pie(parent, cx, cy, r) {
    var g = group(parent), paths = [];
    ringAt(g, cx, cy, r, C_BORDER, 1.2);
    return {
      g: g,
      set: function (fr, colors) {
        while (paths.length < fr.length) { var p = svgEl('path', { 'stroke-width': 1.5 }); p.style.stroke = C_SURFACE; g.appendChild(p); paths.push(p); }
        var a0 = -Math.PI / 2;
        fr.forEach(function (f, i) {
          var a1 = a0 + 2 * Math.PI * Math.max(0, Math.min(0.99999, f));
          var big = a1 - a0 > Math.PI ? 1 : 0;
          var d = f <= 0.0005 ? 'M 0 0' : 'M ' + cx + ' ' + cy + ' L ' + (cx + r * Math.cos(a0)).toFixed(2) + ' ' + (cy + r * Math.sin(a0)).toFixed(2) +
            ' A ' + r + ' ' + r + ' 0 ' + big + ' 1 ' + (cx + r * Math.cos(a1)).toFixed(2) + ' ' + (cy + r * Math.sin(a1)).toFixed(2) + ' Z';
          paths[i].setAttribute('d', d);
          paths[i].style.fill = colors[i];
          a0 = a1;
        });
      }
    };
  }
  /* 一只钟：表盘 + 12 个刻度；hands 是 [长度比例, 粗细, 颜色]；set([角度…]) 角度按圈数（1 = 一整圈） */
  function clockFace(parent, cx, cy, r, hands) {
    var g = group(parent);
    g.appendChild(paint(svgEl('circle', { cx: cx, cy: cy, r: r, 'stroke-width': 2 }), C_SURFACE2, C_BORDER));
    for (var i = 0; i < 12; i++) {
      var a = i / 12 * 2 * Math.PI;
      hline(g, cx + 0.84 * r * Math.sin(a), cy - 0.84 * r * Math.cos(a), cx + 0.95 * r * Math.sin(a), cy - 0.95 * r * Math.cos(a), C_MUTED, i % 3 ? 1.2 : 2.2);
    }
    var hs = hands.map(function (h) { return arrow(g, h[2], h[1]); });
    dotAt(g, cx, cy, 4, C_INK);
    return {
      g: g,
      set: function (turns) {
        turns.forEach(function (tu, j) {
          var a = tu * 2 * Math.PI, L = hands[j][0] * r;
          hs[j].set(cx, cy, cx + L * Math.sin(a), cy - L * Math.cos(a), 7 + hands[j][1]);
        });
      }
    };
  }
  /* 一个对话气泡：圆角框 + 朝下的小尾巴，尾巴尖在 (tx, ty) */
  function bubble(parent, x, y, w, h, tx, ty, color) {
    var g = group(parent);
    var b = paint(svgEl('path', {
      d: 'M ' + (x + 8) + ' ' + y + ' H ' + (x + w - 8) + ' Q ' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + 8) + ' V ' + (y + h - 8) + ' Q ' + (x + w) + ' ' + (y + h) + ' ' + (x + w - 8) + ' ' + (y + h) +
        ' H ' + (tx + 7) + ' L ' + tx + ' ' + ty + ' L ' + (tx - 3) + ' ' + (y + h) + ' H ' + (x + 8) + ' Q ' + x + ' ' + (y + h) + ' ' + x + ' ' + (y + h - 8) + ' V ' + (y + 8) + ' Q ' + x + ' ' + y + ' ' + (x + 8) + ' ' + y + ' Z',
      'stroke-width': 1.4
    }), C_SURFACE, color || C_BORDER);
    g.appendChild(b);
    return g;
  }
  /* 一个齿轮：set(角度) 让它转；返回 { g, set } */
  function gear(parent, cx, cy, r, color) {
    var g = group(parent), inner = group(g), d = '';
    for (var i = 0; i < 8; i++) {
      var a0 = i / 8 * 2 * Math.PI - 0.18, a1 = i / 8 * 2 * Math.PI + 0.18;
      d += 'M ' + (cx + 0.75 * r * Math.cos(a0)).toFixed(1) + ' ' + (cy + 0.75 * r * Math.sin(a0)).toFixed(1) +
        ' L ' + (cx + r * Math.cos(a0 + 0.05)).toFixed(1) + ' ' + (cy + r * Math.sin(a0 + 0.05)).toFixed(1) +
        ' L ' + (cx + r * Math.cos(a1 - 0.05)).toFixed(1) + ' ' + (cy + r * Math.sin(a1 - 0.05)).toFixed(1) +
        ' L ' + (cx + 0.75 * r * Math.cos(a1)).toFixed(1) + ' ' + (cy + 0.75 * r * Math.sin(a1)).toFixed(1) + ' Z ';
    }
    inner.appendChild(paint(svgEl('path', { d: d }), color));
    inner.appendChild(paint(svgEl('circle', { cx: cx, cy: cy, r: 0.78 * r }), color));
    inner.appendChild(paint(svgEl('circle', { cx: cx, cy: cy, r: 0.3 * r }), C_SURFACE2));
    return { g: g, set: function (deg) { inner.setAttribute('transform', 'rotate(' + deg.toFixed(1) + ' ' + cx + ' ' + cy + ')'); } };
  }
  /* 一张「档案卡」：n 个小格，颜色深浅由 seed 决定（示意，不是真的嵌入） */
  function profileStrip(parent, x, y, n, cw, ch, color, seed) {
    var g = group(parent), cells = [];
    for (var i = 0; i < n; i++) {
      var r = paint(svgEl('rect', { x: x + i * (cw + 2), y: y, width: cw, height: ch, rx: 1.5 }), color);
      r.style.opacity = (0.2 + 0.8 * rnd(i, seed)).toFixed(2);
      g.appendChild(r); cells.push(r);
    }
    return { g: g, cells: cells };
  }
  /* 平移一个 group */
  function moveG(g, dx, dy) {
    g.setAttribute('transform', 'translate(' + dx.toFixed(1) + ' ' + dy.toFixed(1) + ')');
  }
  // ─── 十七幕分镜（2026-10-29 第二版：观众只看过前面的视频，第一次接触这篇，少用专业名词，多用比喻、小例子和动效） ──
  var R = 424, W = 352;
  /* ── scene 1: 一篇研究「翻译」的论文 ── */
  function buildSceneWhy() {
    var s = sceneSvg('左边是一台「翻译机」：英文单词卡片一张张飞进中间写着 Transformer 的方框，齿轮转动，下面一张张冒出德文；右边依次出现：' +
      '「这篇论文研究机器翻译」打勾；同一个零件在「翻译机」和「机器人的大脑」两个槽之间来回搬；第 014 期 Digit 在户外走的视频和 16 张卡片；' +
      '前面讲过的扩散策略、MaskedMimic 两张卡片；这一期的三站路线，一个小点沿路线走');
    s.appendChild(svgText(24, 26, '机器翻译：让电脑把英文自动翻成德文', 'demo-x-ink2', 13.5));
    var EN = ['The', 'cat', 'sat', 'on', 'the', 'mat'], DE = ['Die', 'Katze', 'saß', 'auf', 'der', 'Matte'];
    var X0 = 30, GX = 60, CW = 54;
    var enC = EN.map(function (w, i) { return chip(s, X0 + i * GX, 46, CW, w, C_Q, { size: 12 }); });
    label(s, 24, 96, '英文：猫坐在垫子上', 'demo-x-mut', 11.5);
    rectBox(s, 60, 124, 290, 96, C_ACCENT, C_SURFACE2);
    var gA = gear(s, 102, 172, 24, C_ACCENT), gB = gear(s, 308, 172, 24, C_ACCENT);
    setOpacity(gA.g, 0.45); setOpacity(gB.g, 0.45);
    label(s, 205, 168, 'Transformer', 'demo-x-ink', 17, 'middle');
    label(s, 205, 194, '这篇论文造的「翻译机」', 'demo-x-mut', 11.5, 'middle');
    var deC = DE.map(function (w, i) { return chip(s, X0 + i * GX, 250, CW, w, C_V, { size: 12 }); });
    label(s, 24, 300, '德文：猫坐在垫子上', 'demo-x-mut', 11.5);
    var dIn = dotAt(s, 0, 0, 6, C_Q), dOut = dotAt(s, 0, 0, 6, C_V);
    rich(s, 24, 340, '论文题目：《注意力就是你所需要的一切》', 12.5);
    label(s, 24, 364, '2017 年，8 位作者，工作在谷歌完成', 'demo-x-ink2', 12);
    /* 第 1 段：这篇论文研究什么 */
    var p1 = group(s);
    label(p1, R, 64, '这篇论文研究什么？', 'demo-x-ink', 14);
    var okBox = rectBox(p1, R, 84, W, 66, C_GOOD, C_SURFACE);
    var okMark = tick(p1, R + 12, 102, 24, C_GOOD);
    rich(p1, R + 50, 110, '**机器翻译**', 13);
    label(p1, R + 50, 134, '教电脑把一种语言自动翻成另一种', 'demo-x-ink2', 12);
    label(p1, R, 182, '全文只做翻译：没有机器人，也没有强化学习', 'demo-x-ink2', 12);
    /* 第 2 段：零件被搬进了机器人 */
    var p2 = group(s);
    label(p2, R, 64, '它造的零件，后来被搬进了机器人', 'demo-x-ink', 14);
    rectBox(p2, R, 86, 150, 112, C_Q, C_SURFACE);
    rectBox(p2, R + 202, 86, 150, 112, C_ROBOT, C_SURFACE);
    label(p2, R + 75, 108, '翻译机', 'demo-x-ink', 13, 'middle');
    label(p2, R + 277, 108, '机器人的大脑', 'demo-x-ink', 13, 'middle');
    rectBox(p2, R + 15, 132, 120, 40, C_BORDER, 'none', '4 3').style.fill = 'none';
    rectBox(p2, R + 217, 132, 120, 40, C_BORDER, 'none', '4 3').style.fill = 'none';
    var partA = chip(p2, R + 19, 136, 112, 'Transformer', C_ACCENT, { size: 12.5, h: 32 });
    var partB = chip(p2, R + 221, 136, 112, 'Transformer', C_ACCENT, { size: 12.5, h: 32 });
    var hop = dotAt(p2, 0, 0, 7, C_ACCENT);
    label(p2, R, 222, '进：英文词', 'demo-x-ink2', 11.5);
    label(p2, R, 242, '出：德文词', 'demo-x-ink2', 11.5);
    label(p2, R + 202, 222, '进：机器人看到的', 'demo-x-ink2', 11.5);
    label(p2, R + 202, 242, '出：下一步动作', 'demo-x-ink2', 11.5);
    rich(p2, R, 280, '零件本身不变，换的是**进去的**和**出来的**', 12.5);
    /* 第 3 段：Digit（第 014 期） */
    var p3 = group(s);
    label(p3, R, 64, '第 14 期的 Digit：大脑就是一个 Transformer', 'demo-x-ink', 13.5);
    var clip = projClip(p3, 'rh_walk', R, 80, 224, 126, '第 14 期论文项目页的视频（未标倍速）');
    label(p3, R + 240, 92, '最近 16 步', 'demo-x-mut', 11);
    var toks = cellGrid(p3, R + 240, 100, 16, 4, 16, 4, C_ROBOT);
    var nextC = chip(p3, R + 232, 184, 112, '下一步动作', C_V, { size: 12 });
    label(p3, R, 250, '每秒 50 次：看最近 16 步，决定下一步怎么动', 'demo-x-ink2', 12);
    label(p3, R, 274, '（Radosavovic 等，arXiv 2303.03381 v2）', 'demo-x-mut', 11);
    /* 第 4 段：前面讲过的两篇 */
    var p4 = group(s);
    label(p4, R, 64, '前面讲过的两篇，也用了它', 'demo-x-ink', 14);
    rectBox(p4, R, 84, 170, 170, C_BORDER, C_SURFACE);
    robotImg(p4, 'ur5', R + 12, 96, 66);
    label(p4, R + 12, 186, '第 10 期 扩散策略', 'demo-x-ink', 12.5);
    label(p4, R + 12, 210, '去噪网络有一个', 'demo-x-ink2', 11.5);
    label(p4, R + 12, 230, 'Transformer 版本', 'demo-x-ink2', 11.5);
    rectBox(p4, R + 182, 84, 170, 170, C_BORDER, C_SURFACE);
    label(p4, R + 194, 110, '第 28 期 MaskedMimic', 'demo-x-ink', 12.5);
    var mmCells = [], mmX = [];
    for (var i = 0; i < 6; i++) {
      var r = paint(svgEl('rect', { x: R + 196 + i * 24, y: 128, width: 20, height: 28, rx: 3 }), C_ROBOT);
      p4.appendChild(r); mmCells.push(r);
      mmX.push(cross(p4, R + 199 + i * 24, 135, 14, C_BAD));
    }
    label(p4, R + 194, 186, '用「遮挡」盖住', 'demo-x-ink2', 11.5);
    label(p4, R + 194, 206, '没提供的输入', 'demo-x-ink2', 11.5);
    label(p4, R + 194, 230, '（叉掉的格子）', 'demo-x-mut', 11);
    /* 第 5 段：三站路线 */
    var p5 = group(s);
    label(p5, R, 64, '这一期分三站', 'demo-x-ink', 14);
    var STOPS = [['① 老办法为什么慢', '第 2–3 幕'], ['② 核心：注意力怎么算', '第 4–13 幕'], ['③ 成绩，和机器人怎么用', '第 14–17 幕']];
    pathLine(p5, [[R + 24, 106], [R + 24, 246]], C_BORDER, 3);
    var stopDots = STOPS.map(function (st, j) {
      var y = 106 + j * 70;
      label(p5, R + 50, y + 4, st[0], 'demo-x-ink', 13);
      label(p5, R + 50, y + 26, st[1], 'demo-x-mut', 11);
      return dotAt(p5, R + 24, y, 9, C_SURFACE2);
    });
    var walker = dotAt(p5, R + 24, 106, 6, C_ACCENT);
    label(p5, R, 296, '每一块都配一个比喻和一个小例子', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      gA.set(now * 60); gB.set(-now * 60);
      /* 左边：词一个个飞进翻译机，德文一个个出来；每词 1.1 s，6 个词后停 1.4 s */
      var per = 1.1, cyc = 6 * per + 1.4, ph = now % cyc, k = Math.floor(ph / per), u = (ph % per) / per;
      if (k > 5) { k = 6; u = 1; }
      enC.forEach(function (c, j) { c.box.style.strokeWidth = j === k ? 2.6 : 1.3; });
      deC.forEach(function (c, j) { setOpacity(c, j < k || (j === k && u > 0.62) ? 1 : 0.12); });
      /* 一颗蓝点把这个词送进翻译机，一颗绿点从机器下面送到对应的德文卡片 */
      if (k < 6) {
        var cxk = X0 + k * GX + CW / 2, a = ease(clamp(u / 0.45, 0, 1)), b2 = ease(clamp((u - 0.5) / 0.4, 0, 1));
        moveDot(dIn, [cxk + (205 - cxk) * a, 78 + 44 * a]);
        moveDot(dOut, [205 + (cxk - 205) * b2, 222 + 26 * b2]);
        setOpacity(dIn, u < 0.47 ? 1 : 0); setOpacity(dOut, u > 0.5 && u < 0.92 ? 1 : 0);
      } else { setOpacity(dIn, 0); setOpacity(dOut, 0); }
      /* 第 1 段：打勾 */
      var s1 = since(t, clock, 0.4);
      setOpacity(okMark, seg(s1, 0.6, 1.0));
      okBox.style.strokeWidth = (1.3 + 1.4 * seg(s1, 0.6, 1.0)).toFixed(2);
      /* 第 2 段：零件在两个槽之间来回搬（4 s 一趟） */
      /* 零件在左槽淡出、一颗点从上面绕过去、在右槽淡入；8 s 一来回 */
      var pp = (now % 8) / 8, hx = pp < 0.3 ? 0 : pp < 0.5 ? (pp - 0.3) / 0.2 : pp < 0.8 ? 1 : 1 - (pp - 0.8) / 0.2;
      setOpacity(partA, 1 - ease(clamp(hx * 2, 0, 1)));
      setOpacity(partB, ease(clamp(hx * 2 - 1, 0, 1)));
      var moving = (pp > 0.3 && pp < 0.5) || pp > 0.8, he = ease(hx);
      moveDot(hop, [R + 75 + 202 * he, 152 - 60 * Math.sin(Math.PI * he)]);
      setOpacity(hop, moving ? 1 : 0);
      /* 第 3 段 */
      clip.at(K.clipSince(t, 3.6), winK(t, 2) > 0.05);
      toks.fill(1 + Math.floor(now * 8) % 16);
      nextC.box.style.strokeWidth = (1.3 + 1.2 * Math.abs(Math.sin(now * 3))).toFixed(2);
      /* 第 4 段：每 1.5 s 换一批叉掉的格子 */
      var mm = Math.floor(now / 1.5);
      mmX.forEach(function (x, j) { setOpacity(x, rnd(j + 10 * mm, 5) < 0.4 ? 1 : 0); });
      mmCells.forEach(function (c, j) { c.style.opacity = rnd(j + 10 * mm, 5) < 0.4 ? 0.3 : 1; });
      /* 第 5 段：小点沿路线走 */
      var wp = (since(t, clock, 13.4) % 6) / 6, wy = 106 + 140 * clamp(wp * 1.25, 0, 1);
      moveDot(walker, [R + 24, wy]);
      stopDots.forEach(function (d, j) { d.style.fill = wy >= 106 + j * 70 - 2 ? C_ACCENT : C_SURFACE2; });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 传话游戏：老办法为什么慢 ── */
  function buildSceneSerial() {
    var s = sceneSvg('左上是一台走路的 G1 的最近 6 步，每一步一个格子；中间一排 6 个小人玩传话游戏，一个亮点一个人一个人往后传，越传越淡；' +
      '下面一排 6 个小人开圆桌会议，两两之间都连着弧线，一起亮；右边依次出现：两个人耳语；6、16、50 个人要传多少次；话越传越走样；' +
      '另一种老办法卷积，只能和邻座说话，要叠好几层；最后对比传话和开会');
    s.appendChild(svgText(24, 26, '把机器人最近 6 步，排成一排', 'demo-x-ink2', 13.5));
    var N = 6, CW = 56, GAP = 6;
    var hist = historyStrip(s, 24, 40, N, CW, 84, { gap: GAP });
    label(s, 24, 168, '老办法（循环网络）：像传话游戏，一个传一个', 'demo-x-ink2', 12);
    var row1 = [], row2 = [];
    for (var i = 0; i < N; i++) row1.push(person(s, hist.cx(i), 190, 7, C_MUTED));
    var msg = dotAt(s, hist.cx(0), 176, 5, C_RNN);
    var rnnTag = tone(s, 390, 236, '', C_RNN, 12, 'end');
    label(s, 24, 262, 'Transformer：像圆桌会议，人人直接对话', 'demo-x-ink2', 12);
    var arcList = [];
    for (var a = 0; a < N; a++) for (var b = a + 1; b < N; b++) {
      var m = (hist.cx(a) + hist.cx(b)) / 2, lift = 8 + (b - a) * 10;
      var arc = paint(svgEl('path', { d: 'M ' + hist.cx(a) + ' 330 Q ' + m + ' ' + (330 - 2 * lift) + ' ' + hist.cx(b) + ' 330', fill: 'none', 'stroke-width': 1.2 }), null, C_GOOD);
      s.appendChild(arc); arcList.push(arc);
    }
    for (i = 0; i < N; i++) row2.push(person(s, hist.cx(i), 338, 7, C_GOOD));
    var attTag = tone(s, 390, 388, '一轮就完', C_GOOD, 12, 'end');
    label(s, 24, 404, '格子里的 G1 借第 032 期 HOMIE 的回放贴图，只作示意', 'demo-x-mut', 10.5);
    /* 第 1 段：两个人耳语 */
    var p1 = group(s);
    label(p1, R, 64, '传话游戏：一个等一个', 'demo-x-ink', 14);
    var pa = person(p1, R + 50, 118, 15, C_MUTED), pb = person(p1, R + 190, 118, 15, C_MUTED), pc = person(p1, R + 330, 118, 15, C_MUTED);
    bubble(p1, R + 76, 76, 84, 30, R + 82, 112, C_RNN);
    label(p1, R + 118, 96, '悄悄话…', 'demo-x-ink2', 12, 'middle');
    var wait = tone(p1, R + 330, 190, '', C_RNN, 11.5, 'middle');
    label(p1, R, 218, '第 t 步，要等第 t−1 步传完才能开始', 'demo-x-ink2', 12);
    label(p1, R, 242, '第 14 期比过的 LSTM，就是这种循环网络', 'demo-x-ink2', 12);
    rich(p1, R, 268, '同一串里，没法几个人**同时**传', 12.5);
    /* 第 2 段：人越多越慢 */
    var p2 = group(s);
    label(p2, R, 64, '人越多，越慢', 'demo-x-ink', 14);
    var LEN = [[6, '6 个人：传 6 次'], [16, '16 个人（Digit 看的 16 步）：传 16 次'], [50, '50 个人：传 50 次']];
    var rows2 = LEN.map(function (L, j) {
      var y = 96 + j * 56;
      label(p2, R, y, L[1], 'demo-x-ink2', 11.5);
      var dots = [];
      for (var q = 0; q < L[0]; q++) dots.push(dotAt(p2, R + 6 + q * 6.6, y + 16, 2.4, C_RNN));
      var bar = hbar(p2, R, y + 26, 6, C_GOOD);
      return { dots: dots, bar: bar, n: L[0] };
    });
    legendRow(p2, R, 278, [['传话：一次一个点', C_RNN], ['开会：一次全到', C_GOOD]], 11);
    /* 第 3 段：越传越走样 */
    var p3 = group(s);
    label(p3, R, 64, '传得越远，越走样', 'demo-x-ink', 14);
    var CH = 8, cxs = [];
    for (i = 0; i < CH; i++) { cxs.push(R + 20 + i * 44); dotAt(p3, cxs[i], 140, 7, C_SURFACE2); ringAt(p3, cxs[i], 140, 7, C_RNN, 1.6); }
    for (i = 1; i < CH; i++) hline(p3, cxs[i - 1] + 8, 140, cxs[i] - 8, 140, C_RNN, 1.4);
    var hop = dotAt(p3, cxs[0], 140, 5, C_RNN);
    var hopTxt = tone(p3, R, 176, '', C_RNN, 12);
    p3.appendChild(paint(svgEl('path', { d: 'M ' + cxs[0] + ' 226 Q ' + (cxs[0] + cxs[CH - 1]) / 2 + ' 186 ' + cxs[CH - 1] + ' 226', fill: 'none', 'stroke-width': 2 }), null, C_GOOD));
    for (i = 0; i < CH; i++) { dotAt(p3, cxs[i], 226, 7, C_SURFACE2); ringAt(p3, cxs[i], 226, 7, C_GOOD, 1.6); }
    var jump = dotAt(p3, cxs[0], 226, 5, C_GOOD);
    tone(p3, R, 258, '开会：一步就到，原话不走样', C_GOOD, 12);
    label(p3, R, 290, '论文说：路越长，越难学到前后的联系', 'demo-x-ink2', 11.5);
    /* 第 4 段：卷积 */
    var p4 = group(s);
    label(p4, R, 64, '另一种老办法：卷积，只和邻座说话', 'demo-x-ink', 14);
    var LV = 4, base = 8, nodes = [];
    for (var lv = 0; lv < LV; lv++) {
      nodes.push([]);
      for (i = 0; i < base; i++) {
        var x = R + 24 + i * 40, y = 250 - lv * 46;
        nodes[lv].push(dotAt(p4, x, y, 5, C_MUTED));
        if (lv) for (var dd = -1; dd <= 1; dd++) if (i + dd >= 0 && i + dd < base) hline(p4, x, y + 5, R + 24 + (i + dd) * 40, y + 41, C_BORDER, 1);
      }
    }
    label(p4, R, 284, '卷积核宽 3 时，每叠一层只多 2 个（示意）', 'demo-x-ink2', 11.5);
    label(p4, R, 306, '论文 §4：要叠很多层，两头才连得上', 'demo-x-ink2', 11.5);
    /* 第 5 段：不传话，直接开会 */
    var p5 = group(s);
    label(p5, R, 64, 'Transformer：不传话，直接开会', 'demo-x-ink', 14);
    label(p5, R, 100, '不用循环，也不用卷积，只靠「注意力」', 'demo-x-ink2', 12);
    label(p5, R, 124, '论文说：第一个完全只靠注意力的翻译模型', 'demo-x-ink2', 12);
    var cmp = [['要等几轮', '传话：n 轮', '开会：1 轮'], ['话转几手', '传话：n 手', '开会：1 手']];
    cmp.forEach(function (c, j) {
      var y = 156 + j * 46;
      label(p5, R, y + 20, c[0], 'demo-x-ink2', 12);
      chip(p5, R + 90, y, 118, c[1], C_RNN, { size: 12 });
      chip(p5, R + 222, y, 118, c[2], C_GOOD, { size: 12 });
    });
    label(p5, R, 278, 'n 是人数，也就是有几步', 'demo-x-mut', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      hist.set(now);
      /* 传话：每 0.5 s 传给下一个人，越传越淡 */
      var cyc = (now % (N * 0.5 + 0.8)) / 0.5, k = Math.min(N - 1, Math.floor(cyc)), fr = clamp(cyc - k, 0, 1);
      row1.forEach(function (p, j) { p.set(j === k ? C_RNN : j < k ? C_INK : C_MUTED, j <= k ? 1 : 0.45); });
      var mx = hist.cx(k) + (k < N - 1 && cyc < N ? (hist.cx(k + 1) - hist.cx(k)) * ease(clamp((fr - 0.5) / 0.5, 0, 1)) : 0);
      moveDot(msg, [mx, 176]);
      msg.style.opacity = (1 - 0.13 * (k + fr)).toFixed(2);
      rnnTag.textContent = '传到第 ' + (k + 1) + ' / ' + N + ' 个人，越传越淡';
      var pulse = 0.35 + 0.65 * Math.abs(Math.sin(now * 2.2));
      arcList.forEach(function (p) { p.style.opacity = pulse.toFixed(2); });
      row2.forEach(function (p) { p.set(C_GOOD, 0.55 + 0.45 * pulse); });
      /* 第 1 段：两人耳语，第三个人在等 */
      var s1 = since(t, clock, 0.4) % 3;
      pa.set(s1 < 1.5 ? C_RNN : C_MUTED); pb.set(s1 >= 1.5 ? C_RNN : C_MUTED); pc.set(C_MUTED, 0.5 + 0.2 * Math.sin(now * 5));
      wait.textContent = '我在等…' + (s1 < 1.5 ? '' : '快了');
      /* 第 2 段：每个点 0.12 s；开会的条一次画满 */
      var u2 = since(t, clock, 3.6);
      rows2.forEach(function (r) {
        var m2 = Math.floor((u2 % 7.5) / 0.12);
        r.dots.forEach(function (d, q) { d.style.opacity = q < m2 ? 1 : 0.18; });
        setW(r.bar, (u2 % 7.5) > 0.12 ? r.n * 6.6 : 0);
      });
      /* 第 3 段：话一手一手传，越传越淡 */
      var hp = (since(t, clock, 7.0) % 4.2) / 0.5, hk = Math.min(CH - 1, Math.floor(hp));
      moveDot(hop, [cxs[0] + (cxs[CH - 1] - cxs[0]) * Math.min(1, hp / (CH - 1)), 140]);
      hop.style.opacity = (1 - 0.11 * Math.min(hp, CH - 1)).toFixed(2);
      hopTxt.textContent = '传话：已经转述 ' + hk + ' / ' + (CH - 1) + ' 次，越来越模糊';
      var ju = clamp((since(t, clock, 7.0) % 4.2) / 0.6, 0, 1);
      moveDot(jump, [cxs[0] + (cxs[CH - 1] - cxs[0]) * ju, 226 - 160 * ju * (1 - ju)]);
      /* 第 4 段：能听到的范围一层层扩大 */
      var lvOn = Math.floor((since(t, clock, 10.4) % 4) / 0.9);
      nodes.forEach(function (row, lv2) {
        row.forEach(function (d, j) {
          var shown = lv2 >= LV - 1 - lvOn, inCone = Math.abs(j - 3) <= LV - 1 - lv2;
          d.style.fill = shown ? (inCone ? C_WARN : C_MUTED) : C_BORDER;
        });
      });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 开会的代价：人越多，要聊的对数越多（表一） ── */
  function buildSceneTable1() {
    var s = sceneSvg('左边一圈小人，人数在 2、4、8、16 之间变，每两个人之间连一条线，旁边一张 n × n 的记分表跟着变大，读出 n × n 对；' +
      '右边依次出现：论文表一比的三件事（要等几轮、话转几手、一共聊多少）；人不多时开会更省（Digit 16 步）；人数翻倍对数翻四倍的三个方块；' +
      '只和左右邻座聊的带状表；总结');
    s.appendChild(svgText(24, 26, '开会也有代价：每两个人都要聊一次', 'demo-x-ink2', 13.5));
    var CX = 146, CY = 206, RR = 118, NS = [2, 4, 8, 16], MAXN = 16;
    var lines = [];
    for (var q = 0; q < MAXN * (MAXN - 1) / 2; q++) lines.push(hline(s, CX, CY, CX, CY, C_GOOD, 1));
    var folks = [];
    for (q = 0; q < MAXN; q++) folks.push(dotAt(s, CX, CY, 7, C_GOOD));
    var GX = 296, GY = 92, GS = 92;
    rectBox(s, GX - 4, GY - 4, GS + 8, GS + 8, C_BORDER, C_SURFACE);
    var cells = [];
    for (q = 0; q < MAXN * MAXN; q++) { var c = paint(svgEl('rect', { x: GX, y: GY, width: 1, height: 1, rx: 1 }), C_GOOD); s.appendChild(c); cells.push(c); }
    label(s, GX + GS / 2, GY - 12, '记分表', 'demo-x-mut', 11, 'middle');
    var nTxt = tone(s, GX + GS / 2, 230, '', C_INK, 16, 'middle');
    var pTxt = tone(s, GX + GS / 2, 256, '', C_GOOD, 13, 'middle');
    label(s, GX + GS / 2, 280, '（每人和每人，', 'demo-x-mut', 11, 'middle');
    label(s, GX + GS / 2, 300, '包括自己）', 'demo-x-mut', 11, 'middle');
    /* 第 1 段：表一比三件事 */
    var p1 = group(s);
    label(p1, R, 64, '论文表一：比了三件事', 'demo-x-ink', 14);
    var T1 = [['要等几轮', '传话：n 轮', '开会：1 轮', true], ['话最远转几手', '传话：n 手', '开会：1 手', true], ['每层要算多少', '传话：$n\\times d^2$', '开会：$n^2\\times d$', null]];
    var t1rows = T1.map(function (r, j) {
      var y = 90 + j * 50;
      label(p1, R, y + 20, r[0], 'demo-x-ink2', 12);
      /* 第三件没有谁一定赢：n 比 d 小时开会省，反过来传话省（论文 §4），两边都画成黄色 */
      chip(p1, R + 108, y, 112, r[1], r[3] === null ? C_WARN : C_RNN, { size: 11.5 });
      return chip(p1, R + 232, y, 120, r[2], r[3] === null ? C_WARN : C_GOOD, { size: 11.5 });
    });
    label(p1, R, 256, '绿色是赢的一方：前两件开会赢', 'demo-x-ink2', 12);
    rich(p1, R, 280, '第三件看人数 $n$ 和每张卡片的数字个数 $d$（论文 §4）', 12);
    /* 第 2 段：人不多时开会更省 */
    var p2 = group(s);
    label(p2, R, 64, '人不多时，开会反而更省', 'demo-x-ink', 14);
    robotImg(p2, 'digit', R, 84, 120);
    label(p2, R + 70, 100, 'Digit：最近 16 步，16 个人', 'demo-x-ink2', 12);
    label(p2, R + 70, 124, '记分表才 16 × 16 = 256 格', 'demo-x-ink2', 12);
    var cmpBars = [barRowAt(p2, R + 70, 140, 50, '传话', C_RNN, 18, 11.5), barRowAt(p2, R + 70, 166, 50, '开会', C_GOOD, 18, 11.5)];
    label(p2, R + 70, 210, '按论文的算法粗算，开会省约 12 倍', 'demo-x-ink2', 11.5);
    label(p2, R + 70, 230, '（我们的估算，只看大概的量级）', 'demo-x-mut', 11);
    label(p2, R, 262, '人数比每张卡片上的数字少，开会就更省（论文第 4 节）', 'demo-x-ink2', 11.5);
    /* 第 3 段：人数翻倍，对数翻四倍 */
    var p3 = group(s);
    label(p3, R, 64, '人一多就贵：翻一倍，变四倍', 'demo-x-ink', 14);
    var SQ = [[16, '16 人', '256 对'], [32, '32 人', '1024 对'], [64, '64 人', '4096 对']];
    var sqs = SQ.map(function (sq, j) {
      var side = 18 + j * 34, x = R + 10 + j * 112, y = 230 - side;
      var r2 = paint(svgEl('rect', { x: x, y: y, width: side, height: side, rx: 3 }), C_RNN);
      p3.appendChild(r2);
      label(p3, x, 252, sq[1], 'demo-x-ink2', 11.5);
      label(p3, x, 272, sq[2], 'demo-x-ink', 12);
      return r2;
    });
    label(p3, R, 304, 'ViT 把一张图切成 196 块：就要聊 38416 对', 'demo-x-ink2', 12);
    /* 第 4 段：只和邻座聊 */
    var p4 = group(s);
    label(p4, R, 64, '论文的办法：人太多时，只和邻座聊', 'demo-x-ink', 14);
    var band = attnGrid(p4, R, 86, 9, 15, C_ACCENT);
    label(p4, R + 150, 106, '每个人只和左右', 'demo-x-ink2', 12);
    label(p4, R + 150, 128, '几个邻座聊', 'demo-x-ink2', 12);
    label(p4, R + 150, 160, '要聊的对数大大减少', 'demo-x-ink2', 12);
    label(p4, R + 150, 182, '代价：话要多转几手', 'demo-x-ink2', 12);
    label(p4, R, 248, '论文把它留到了以后再研究', 'demo-x-mut', 11.5);
    /* 第 5 段：总结 */
    var p5 = group(s);
    label(p5, R, 64, '一句话总结表一', 'demo-x-ink', 14);
    tick(p5, R, 92, 18, C_GOOD); label(p5, R + 28, 106, '开会：一轮就完，话一手就到', 'demo-x-ink2', 12.5);
    tick(p5, R, 128, 18, C_GOOD); label(p5, R + 28, 142, '人不多时，算起来还更省', 'demo-x-ink2', 12.5);
    cross(p5, R + 2, 168, 14, C_BAD); label(p5, R + 28, 180, '代价：人数一多，对数按平方涨', 'demo-x-ink2', 12.5);
    label(p5, R, 222, 'Digit 只有 16 张卡片，所以很划算', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* 人数每 2.5 s 换一档 */
      var n = NS[Math.floor(now / 2.5) % NS.length], q2 = 0;
      for (var i = 0; i < MAXN; i++) {
        var a = -Math.PI / 2 + 2 * Math.PI * i / n;
        moveDot(folks[i], [CX + RR * Math.cos(a), CY + RR * Math.sin(a)]);
        setOpacity(folks[i], i < n ? 1 : 0);
        folks[i].setAttribute('r', n > 8 ? 5 : 7);
      }
      for (i = 0; i < MAXN; i++) for (var j = i + 1; j < MAXN; j++) {
        var ln = lines[q2++];
        if (i < n && j < n) {
          var a1 = -Math.PI / 2 + 2 * Math.PI * i / n, a2 = -Math.PI / 2 + 2 * Math.PI * j / n;
          setLine(ln, CX + RR * Math.cos(a1), CY + RR * Math.sin(a1), CX + RR * Math.cos(a2), CY + RR * Math.sin(a2));
          ln.style.opacity = (0.25 + 0.5 * Math.abs(Math.sin(now * 2 + i * 0.7 + j))).toFixed(2);
        } else ln.style.opacity = 0;
      }
      var cs = GS / n;
      cells.forEach(function (c, k) {
        var r = Math.floor(k / MAXN), col = k % MAXN;
        if (r < n && col < n) {
          c.setAttribute('x', (GX + col * cs + 0.6).toFixed(1)); c.setAttribute('y', (GY + r * cs + 0.6).toFixed(1));
          c.setAttribute('width', Math.max(0.5, cs - 1.2).toFixed(1)); c.setAttribute('height', Math.max(0.5, cs - 1.2).toFixed(1));
          c.style.opacity = (0.3 + 0.5 * rnd(k + n, 3)).toFixed(2);
        } else c.style.opacity = 0;
      });
      nTxt.textContent = n + ' 个人';
      pTxt.textContent = n + ' × ' + n + ' = ' + n * n + ' 对';
      /* 第 1 段：三行依次亮 */
      var s1 = since(t, clock, 0.4);
      t1rows.forEach(function (c, j) { c.box.style.strokeWidth = (1.3 + 1.4 * seg(s1, 0.5 + j * 0.9, 0.9 + j * 0.9)).toFixed(2); });
      /* 第 2 段：两根条按 12 : 1 长出来 */
      var u2 = ease(seg(since(t, clock, 3.6), 0.4, 1.6));
      cmpBars[0].set(160 * u2, u2 > 0.95 ? '12 份' : '');
      cmpBars[1].set(160 / 12 * u2, u2 > 0.95 ? '1 份' : '');
      /* 第 3 段：三个方块依次长出 */
      var s3 = since(t, clock, 7.0);
      sqs.forEach(function (r2, j) { setOpacity(r2, seg(s3, 0.4 + j * 0.8, 0.8 + j * 0.8)); });
      /* 第 4 段：带状记分表 */
      band.set(function (i2, j2) { var inBand = Math.abs(i2 - j2) <= 1; return { a: inBand ? 0.4 + 0.5 * Math.abs(Math.sin(now * 2 + i2)) : 0.08 }; });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 先把输入切成一张张卡片（token） ── */
  function buildSceneToken() {
    var s = sceneSvg('左边三排：一句英文先是一整条，再切成 6 张卡片，每张下面长出一串深浅不一的小格（档案）；机器人最近 6 步，每一步一张卡片；' +
      '一张相机画面切成 4 × 3 块，块与块慢慢分开；右边依次出现：卡片的说法和「半个词」的例子；三个词的档案，意思相近的档案也相近；' +
      'Digit 每 0.02 秒一张卡片、16 格依次亮；一张图切成小方块逐个亮；三种卡片流进同一个零件');
    s.appendChild(svgText(24, 26, '第一步：把输入切成一张张卡片', 'demo-x-ink2', 13.5));
    label(s, 24, 52, '翻译：通常一个词一张卡片', 'demo-x-ink2', 12);
    var WORDS = ['The', 'cat', 'sat', 'on', 'the', 'mat'];
    var whole = rectBox(s, 30, 62, 6 * 52, 28, C_Q, C_SURFACE);
    var wc = WORDS.map(function (w) { return chip(s, 0, 62, 52, w, C_Q, { size: 12 }); });
    var strips = WORDS.map(function (w, i) { return profileStrip(s, 0, 98, 8, 4, 10, C_Q, 11 + i); });
    label(s, 24, 150, '机器人：每一步一张卡片', 'demo-x-ink2', 12);
    var hist = historyStrip(s, 24, 160, 6, 50, 70, { gap: 8 });
    label(s, 24, 276, '图片：切成小方块，一块一张卡片', 'demo-x-ink2', 12);
    var TC = 4, TR = 3, TW = 50, TH = 30, tiles = [];
    for (var r = 0; r < TR; r++) for (var c = 0; c < TC; c++) {
      var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: TW, height: TH, viewBox: [c * 120, r * 90, 120, 90].join(' ') });
      box.appendChild(svgEl('image', { href: CLIP_BASE + 'rh_walk.webp', x: 0, y: 0, width: 480, height: 270, preserveAspectRatio: 'none' }));
      s.appendChild(box); tiles.push({ el: box, r: r, c: c });
    }
    label(s, 260, 312, '第 14 期项目页', 'demo-x-mut', 11);
    label(s, 260, 332, '视频的一帧', 'demo-x-mut', 11);
    /* 第 1 段：卡片 */
    var p1 = group(s);
    label(p1, R, 64, 'Transformer 只吃一种东西：一串卡片', 'demo-x-ink', 14);
    label(p1, R, 96, '论文叫它 token，这一期就叫「卡片」', 'demo-x-ink2', 12);
    label(p1, R, 120, '翻译里，通常一个词一张；不常见的词切成几块', 'demo-x-ink2', 12);
    chip(p1, R, 140, 140, 'unhappiness', C_Q, { size: 12 });
    var halves = ['un', 'happi', 'ness'].map(function (w, i) { return chip(p1, R + 170 + [0, 44, 108][i], 140, [40, 60, 52][i], w, C_Q, { size: 12 }); });
    label(p1, R, 196, '（英文的「不开心」切成三块，示意）', 'demo-x-mut', 11);
    /* 第 2 段：档案 */
    var p2 = group(s);
    label(p2, R, 64, '每张卡片换成一串数字，像一张档案', 'demo-x-ink', 14);
    var PROF = [['cat（猫）', 21], ['dog（狗）', 21], ['mat（垫子）', 47]];
    PROF.forEach(function (pf, j) {
      var y = 92 + j * 38;
      label(p2, R, y + 15, pf[0], 'demo-x-ink2', 12);
      var st = profileStrip(p2, R + 100, y + 2, 16, 12, 18, C_Q, pf[1]);
      if (j === 1) st.cells.forEach(function (cel, i) { cel.style.opacity = clamp(0.2 + 0.8 * rnd(i, 21) + 0.18 * (rnd(i, 77) - 0.5), 0.15, 1).toFixed(2); });
    });
    label(p2, R, 222, '这串数字是训练时学出来的（论文 §3.4）', 'demo-x-ink2', 12);
    label(p2, R, 246, '论文里，每张档案有 512 个数字', 'demo-x-ink2', 12);
    /* 第 3 段：机器人 */
    var p3 = group(s);
    label(p3, R, 64, '机器人：每 0.02 秒一张卡片', 'demo-x-ink', 14);
    robotImg(p3, 'digit', R, 82, 150);
    label(p3, R + 84, 100, '这一步看到的：关节角度、', 'demo-x-ink2', 12);
    label(p3, R + 84, 120, '关节速度……', 'demo-x-ink2', 12);
    label(p3, R + 84, 144, '再加上上一步做的动作', 'demo-x-ink2', 12);
    label(p3, R + 84, 168, '压成一张卡片', 'demo-x-ink2', 12);
    var toks = cellGrid(p3, R + 84, 186, 16, 8, 16, 4, C_ROBOT);
    label(p3, R + 84, 254, 'Digit 留着最近 16 张', 'demo-x-ink2', 12);
    /* 第 4 段：图片 */
    var p4 = group(s);
    label(p4, R, 64, '图片也能切：一块一张卡片', 'demo-x-ink', 14);
    var pix = cellGrid(p4, R, 86, 16, 4, 30, 4, C_ACCENT);
    label(p4, R + 150, 106, '后来的 ViT：224 × 224 的图', 'demo-x-ink2', 12);
    label(p4, R + 150, 128, '按 16 × 16 像素切成小块', 'demo-x-ink2', 12);
    label(p4, R + 150, 160, '一共 196 块，', 'demo-x-ink2', 12);
    label(p4, R + 150, 182, '每块一张卡片（ViT 原论文）', 'demo-x-ink2', 12);
    /* 第 5 段：零件不用改 */
    var p5 = group(s);
    label(p5, R, 64, '卡片一样长，就能送进同一个零件', 'demo-x-ink', 14);
    var SRC = [['词', C_Q], ['机器人的一步', C_ROBOT], ['图片的一块', C_ACCENT]];
    SRC.forEach(function (sr, j) { chip(p5, R, 92 + j * 54, 112, sr[0], sr[1], { size: 12 }); });
    chip(p5, R + 222, 140, 130, 'Transformer', C_ACCENT, { size: 13, h: 36 });
    var fl5 = SRC.map(function (sr) { return flowSeg(p5, sr[1], 3, 3, 40); });
    label(p5, R, 270, '只要能变成一串一样长的档案，后面都一样', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* 一整条 → 切成 6 张：6 s 一轮 */
      var cyc = now % 6, gap = 8 * ease(seg(cyc, 0.6, 1.4)) * (1 - ease(seg(cyc, 5.4, 5.9)));
      setOpacity(whole, 1 - seg(cyc, 0.6, 0.9) + seg(cyc, 5.6, 5.9));
      wc.forEach(function (c, i) {
        moveG(c, 30 + i * (52 + gap) - 0, 0);
        c.box.style.opacity = (seg(cyc, 0.6, 0.9) * (1 - seg(cyc, 5.6, 5.9))).toFixed(2);
      });
      strips.forEach(function (st, i) { moveG(st.g, 30 + i * (52 + gap) + 7, 0); setOpacity(st.g, seg(cyc, 1.6 + i * 0.25, 1.9 + i * 0.25) * (1 - seg(cyc, 5.4, 5.8))); });
      hist.set(now);
      var tg = 6 * (0.5 - 0.5 * Math.cos(now * 1.2));
      tiles.forEach(function (tl) {
        tl.el.setAttribute('x', (30 + tl.c * (TW + tg)).toFixed(1));
        tl.el.setAttribute('y', (286 + tl.r * (TH + tg)).toFixed(1));
      });
      /* 第 1 段：长词切成三块 */
      var s1 = since(t, clock, 0.4) % 4;
      halves.forEach(function (h, i) { setOpacity(h, seg(s1, 0.8 + i * 0.5, 1.2 + i * 0.5)); });
      toks.fill(1 + Math.floor(now * 8) % 16);
      pix.fill(1 + Math.floor(now * 6) % 16);
      SRC.forEach(function (sr, j) { fl5[j].at(now + j * 0.4, [R + 116, 106 + j * 54], [R + 218, 158], true); });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: Q、K、V：像去图书馆查资料 ── */
  function buildSceneQKV() {
    var s = sceneSvg('左边是一间小图书馆：一个人举着蓝色的问题卡（Q），手电筒的光照向三本书，每本书上方贴着橙色的标签（K），里面是绿色的内容（V）；' +
      '光越亮的书，飞回笔记本的绿色纸片越大；右边依次出现：Q、K、V 三张卡片的意思；换到机器人；同一张卡片抄成三张；越像越多抄；三个人同时查');
    s.appendChild(svgText(24, 26, '注意力：像去图书馆查资料', 'demo-x-ink2', 13.5));
    var reader = person(s, 66, 138, 14, C_Q);
    chip(s, 20, 196, 96, 'Q：我要找什么', C_Q, { size: 11.5, h: 30 });
    var BX = [196, 268, 340], BW = 50, BY = 74, BH = 150, WT = ATT.w;
    var beams = BX.map(function (bx) {
      var p = paint(svgEl('path', { d: 'M 86 138 L ' + bx + ' ' + (BY + 22) + ' L ' + (bx + BW) + ' ' + (BY + 22) + ' Z' }), C_Q);
      s.appendChild(p); return p;
    });
    var books = BX.map(function (bx, i) {
      rectBox(s, bx, BY, BW, BH, C_MUTED, C_SURFACE2);
      chip(s, bx + 5, BY + 8, BW - 10, 'K', C_K, { size: 12, h: 26 });
      chip(s, bx + 5, BY + 100, BW - 10, 'V', C_V, { size: 12, h: 26 });
      label(s, bx + BW / 2, BY + 74, STEPS[i], 'demo-x-mono', 11.5, 'middle');
      return tone(s, bx + BW / 2, BY - 10, '', C_INK, 12.5, 'middle');
    });
    /* 笔记本放在书的正下方：纸片竖着往下落，不从百分比和说明文字上划过 */
    label(s, 186, 300, '抄进笔记本', 'demo-x-ink2', 11.5, 'end');
    rectBox(s, 196, 262, 194, 72, C_V, C_SURFACE);
    label(s, 196, 358, '书上方是标签（K），书里是内容（V）', 'demo-x-ink2', 11.5);
    var pages = BX.map(function () { var r = paint(svgEl('rect', { x: 0, y: 0, width: 10, height: 10, rx: 2 }), C_V); s.appendChild(r); return r; });
    var piles = [0, 1, 2].map(function (i) { return hbar(s, 206, 272 + i * 18, 13, C_V); });
    /* 第 1 段：三样东西 */
    var p1 = group(s);
    label(p1, R, 64, '查资料要三样东西', 'demo-x-ink', 14);
    [['Q', C_Q, '问题：我要找什么'], ['K', C_K, '标签：每本书上写着讲什么'], ['V', C_V, '内容：书里真正的东西']].forEach(function (r, j) {
      chip(p1, R, 88 + j * 46, 44, r[0], r[1], { size: 14, h: 32 });
      label(p1, R + 58, 109 + j * 46, r[2], 'demo-x-ink2', 12.5);
    });
    rich(p1, R, 252, '按**标签**找，按**内容**拿', 13);
    /* 第 2 段：换到机器人 */
    var p2 = group(s);
    label(p2, R, 64, '换到机器人身上', 'demo-x-ink', 14);
    [['Q', C_Q, '现在这一步想知道什么', '打个比方：刚才脚落地了吗？'], ['K', C_K, '过去每一步的标签', '那一步大概发生了什么'], ['V', C_V, '过去每一步的内容', '那一步的具体数据']].forEach(function (r, j) {
      chip(p2, R, 88 + j * 62, 44, r[0], r[1], { size: 14, h: 32 });
      label(p2, R + 58, 102 + j * 62, r[2], 'demo-x-ink2', 12.5);
      label(p2, R + 58, 122 + j * 62, r[3], 'demo-x-mut', 11.5);
    });
    /* 第 3 段：同一张卡片抄成三张 */
    var p3 = group(s);
    label(p3, R, 64, '三样都从同一张卡片抄出来', 'demo-x-ink', 14);
    chip(p3, R, 132, 92, '一步的卡片', C_ROBOT, { size: 12, h: 32 });
    var outs = [['Q', C_Q], ['K', C_K], ['V', C_V]].map(function (q, j) { return chip(p3, R + 250, 88 + j * 46, 60, q[0], q[1], { size: 14, h: 32 }); });
    /* 每一路先进对应的规则、再出来：线不从「规则」两个字上穿过 */
    var fl3 = [0, 1, 2].map(function (j) { return [flowSeg(p3, [C_Q, C_K, C_V][j], 2, 3, 40), flowSeg(p3, [C_Q, C_K, C_V][j], 1, 3, 30)]; });
    [0, 1, 2].forEach(function (j) { chip(p3, R + 140, 92 + j * 46, 70, '规则 ' + (j + 1), C_MUTED, { size: 11, h: 24 }); });
    label(p3, R, 250, '三套不同的「抄写规则」，是训练时学出来的', 'demo-x-ink2', 12);
    label(p3, R, 274, '（论文里叫三个矩阵）', 'demo-x-mut', 11);
    /* 第 4 段：越像越多抄 */
    var p4 = group(s);
    label(p4, R, 64, '标签越像问题，抄得越多', 'demo-x-ink', 14);
    var sim = [['很像', 0.9], ['有点像', 0.45], ['不像', 0.06]].map(function (r, j) {
      var y = 96 + j * 50;
      label(p4, R, y + 14, r[0], 'demo-x-ink2', 12);
      var b = hbar(p4, R + 70, y, 18, C_V);
      return { b: b, v: r[1] };
    });
    label(p4, R, 262, '完全不像的，几乎一个字都不抄', 'demo-x-ink2', 12);
    /* 第 5 段：大家同时查 */
    var p5 = group(s);
    label(p5, R, 64, '每一步都可以同时去查', 'demo-x-ink', 14);
    var readers = [0, 1, 2].map(function (j) { return person(p5, R + 40, 110 + j * 52, 10, C_Q); });
    var shelf5 = [0, 1, 2].map(function (j) { rectBox(p5, R + 250, 90 + j * 52, 40, 40, C_K, C_SURFACE2); return j; });
    var rays = [];
    for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) rays.push(hline(p5, R + 56, 112 + a * 52, R + 248, 110 + b * 52, C_Q, 1.4));
    void shelf5;
    label(p5, R, 268, '每个人拿着自己的问题，一起查、一次算完', 'demo-x-ink2', 12);
    label(p5, R, 292, '不用排队：这就是它比传话快的原因', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var pulse = 0.75 + 0.25 * Math.sin(now * 3);
      beams.forEach(function (b, i) { b.style.opacity = (WT[i] * 0.55 * pulse).toFixed(3); });
      books.forEach(function (bt, i) { bt.textContent = Math.round(WT[i] * 100) + '%'; });
      reader.set(C_Q, 1);
      /* 纸片从书里飞回笔记本：2.4 s 一趟 */
      pages.forEach(function (pg, i) {
        var u = ((now + i * 0.3) % 2.4) / 2.4, e2 = ease(clamp(u / 0.7, 0, 1));
        var sz = 6 + 22 * WT[i];
        var x0 = BX[i] + BW / 2, y0 = BY + 132, x1 = 222, y1 = 278 + i * 18;  /* 从 V 框下沿出发，不压住「V」 */
        pg.setAttribute('x', (x0 + (x1 - x0) * e2 - sz / 2).toFixed(1)); pg.setAttribute('y', (y0 + (y1 - y0) * e2 - sz / 2).toFixed(1));
        pg.setAttribute('width', sz.toFixed(1)); pg.setAttribute('height', sz.toFixed(1));
        pg.style.opacity = u < 0.75 ? 0.85 : 0;
      });
      var fillU = clamp((now % 9.6) / 9.6 * 1.2, 0, 1);
      piles.forEach(function (pl, i) { setW(pl, 170 * WT[i] / 0.452 * 0.9 * fillU); });
      [0, 1, 2].forEach(function (j) {
        fl3[j][0].at(now + j * 0.3, [R + 94, 148], [R + 138, 104 + j * 46], true);
        fl3[j][1].at(now + j * 0.3, [R + 212, 104 + j * 46], [R + 248, 104 + j * 46], true);
      });
      outs.forEach(function (o, j) { o.box.style.strokeWidth = (1.3 + 1.2 * Math.abs(Math.sin(now * 2 + j))).toFixed(2); });
      var u4 = ease(seg(since(t, clock, 10.4), 0.3, 1.5));
      sim.forEach(function (sm) { setW(sm.b, 250 * sm.v * u4); });
      rays.forEach(function (ry, q) { ry.style.opacity = (0.15 + 0.6 * Math.abs(Math.sin(now * 2.4 + q * 0.9))).toFixed(2); });
      readers.forEach(function (rd, j) { rd.set(C_Q, 0.6 + 0.4 * Math.abs(Math.sin(now * 2 + j))); });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 手算一次：打分 → 分比例 → 按比例混合 ── */
  function buildSceneAttention() {
    var s = sceneSvg('左上是第 t 步的问题卡（4 格）和三步的标签卡各 4 格，右边依次出现打分 1、2、1，缩小一半后的 0.5、1、0.5，和换成比例后的三根条；' +
      '左下是一个平面，三条内容箭头按比例缩短、首尾相接，加出结果点 [0.548, 0.726]；右边依次是三步走、打分、像分披萨一样的饼图、混合、一句话');
    s.appendChild(svgText(24, 26, '小例子：机器人最近 3 步，每张卡片 4 个数字', 'demo-x-ink2', 13.5));
    label(s, 24, 62, '问题 Q（第 t 步）', 'demo-x-ink2', 12);
    var qRow = vecRow(s, 136, 46, 4, 24, C_Q, { h: 24 });
    var kRows = [], c1 = [], c2 = [], bars = [], wTxt = [];
    label(s, 258, 92, '打分', 'demo-x-mut', 11.5, 'middle');
    label(s, 300, 92, '÷ 2', 'demo-x-mut', 11.5, 'middle');
    label(s, 352, 92, '比例', 'demo-x-mut', 11.5, 'middle');
    STEPS.forEach(function (st, i) {
      var y = 100 + i * 34;
      label(s, 24, y + 17, '标签 K（' + st + '）', 'demo-x-ink2', 12);
      kRows.push(vecRow(s, 136, y, 4, 24, C_K, { h: 24 }));
      c1.push(tone(s, 258, y + 17, '', C_INK, 13, 'middle'));
      c2.push(tone(s, 300, y + 17, '', C_INK, 13, 'middle'));
      bars.push(hbar(s, 322, y + 4, 16, C_V));
      wTxt.push(label(s, 330, y + 17, '', 'demo-x-ink', 11.5));
    });
    var OX = 60, OY = 370, S = 118;
    hline(s, OX - 10, OY, OX + 1.25 * S, OY, C_BORDER, 1.2);
    hline(s, OX, OY + 10, OX, OY - 1.2 * S, C_BORDER, 1.2);
    var vArr = [0, 1, 2].map(function () { return arrow(s, C_V, 1.6, '4 3'); });
    var wArr = [0, 1, 2].map(function () { return arrow(s, C_V, 3); });
    var outDot = dotAt(s, OX, OY, 6, C_Q);
    var outTxt = tone(s, OX + 12, OY - 1.2 * S + 6, '', C_Q, 12.5);
    label(s, 270, 270, '内容 V', 'demo-x-mut', 11.5);
    STEPS.forEach(function (st, i) { label(s, 270, 294 + i * 24, st + '：[' + ATT.vals[i].join(', ') + ']', 'demo-x-ink2', 12); });
    /* 第 1 段 */
    var p1 = group(s);
    label(p1, R, 64, '手算一次，只有三步', 'demo-x-ink', 14);
    var steps1 = ['① 打分', '② 分比例', '③ 按比例混合'].map(function (n, j) { return chip(p1, R + j * 118, 90, 108, n, C_ACCENT, { size: 13, h: 34 }); });
    label(p1, R, 160, '数字是我们编的，只为看清每一步', 'demo-x-mut', 11.5);
    label(p1, R, 184, '内容只给 2 个数字，好画在左下的平面上', 'demo-x-mut', 11.5);
    /* 第 2 段：打分 */
    var p2 = group(s);
    label(p2, R, 64, '① 打分：对应位置相乘，再相加', 'demo-x-ink', 14);
    ['t−2：1×1 + 0 + 1×0 + 0 = 1', 't−1：1×1 + 0 + 1×1 + 0 = 2', 't：1×0 + 0 + 1×1 + 0 = 1'].forEach(function (str, j) { label(p2, R, 100 + j * 28, str, 'demo-x-mono', 12.5); });
    label(p2, R, 200, '第 t−1 步的标签和问题最像：2 分', 'demo-x-ink2', 12);
    /* 第 3 段：分比例，像分披萨 */
    var p3 = group(s);
    label(p3, R, 64, '② 分比例：像按票数分披萨', 'demo-x-ink', 14);
    var pz = pie(p3, R + 64, 160, 58);
    /* 每一块写上是哪一步，跟左边的表对得上 */
    var pzTxt = STEPS.map(function (st) { var tx = label(p3, R + 64, 160, st, 'demo-x-ink', 12, 'middle'); tx.style.fill = '#15171c'; tx.style.fontWeight = '700'; return tx; });
    label(p3, R + 150, 108, '先把分数缩小一半：', 'demo-x-ink2', 12);
    label(p3, R + 150, 130, '0.5 / 1 / 0.5', 'demo-x-ink', 12.5);
    label(p3, R + 150, 156, '再换成加起来 100% 的比例：', 'demo-x-ink2', 12);
    var pctTxt = tone(p3, R + 150, 178, '', C_INK, 12.5);
    label(p3, R + 150, 206, '分数高的，分得多，', 'demo-x-ink2', 12);
    label(p3, R + 150, 226, '但别人也有一份', 'demo-x-ink2', 12);
    label(p3, R, 258, '论文把这一步叫 softmax', 'demo-x-mut', 11.5);
    /* 第 4 段：混合 */
    var p4 = group(s);
    label(p4, R, 64, '③ 按比例，把三份内容加起来', 'demo-x-ink', 14);
    math(p4, R, 104, '0.274\\,[1,0]+0.452\\,[0,1]+0.274\\,[1,1]', 14, 'start', 352);
    math(p4, R, 140, '=[' + f3(ATT.out[0]) + ',\\ ' + f3(ATT.out[1]) + ']', 15);
    label(p4, R, 180, '左下：三条绿箭头接起来，终点就是结果', 'demo-x-ink2', 12);
    label(p4, R, 204, 't−1 那条最长：它分得最多', 'demo-x-ink2', 12);
    /* 第 5 段 */
    var p5 = group(s);
    label(p5, R, 64, '一句话：谁和我像，就多听谁的', 'demo-x-ink', 14);
    label(p5, R, 96, '真实模型里，问题、标签、内容都是学出来的', 'demo-x-ink2', 12);
    rectBox(p5, R, 120, W, 80, C_ROBOT, C_SURFACE);
    label(p5, R + 12, 144, '第 14 期论文里的说法', 'demo-x-ink', 12.5);
    label(p5, R + 12, 168, '模型可以拿历史里「想要的状态」和「实际的状态」', 'demo-x-ink2', 11.5);
    label(p5, R + 12, 188, '作比较，想办法调整动作（论文引言）', 'demo-x-ink2', 11.5);
    var PC = [C_Q, C_V, C_K];
    function draw(t, clock) {
      var now = nowOf(t, clock);
      qRow.set(ATT.q);
      kRows.forEach(function (r, i) { r.set(ATT.keys[i]); });
      var a1 = seg(t, 3.9, 4.5), a2 = seg(t, 7.2, 7.8), a3 = seg(t, 7.9, 9.0);
      c1.forEach(function (c, i) { c.textContent = a1 > 0 ? String(ATT.raw[i]) : ''; setOpacity(c, a1); });
      c2.forEach(function (c, i) { c.textContent = a2 > 0 ? f1(ATT.scaled[i]) : ''; setOpacity(c, a2); });
      bars.forEach(function (b, i) { setW(b, ATT.w[i] * 90 * ease(a3)); wTxt[i].setAttribute('x', (326 + ATT.w[i] * 90 * ease(a3)).toFixed(1)); wTxt[i].textContent = a3 > 0.95 ? Math.round(ATT.w[i] * 100) + '%' : ''; });
      qRow.cells.forEach(function (c) { c.style.strokeWidth = t > 3.6 && t < 7.0 ? (1.2 + Math.abs(Math.sin(now * 4))).toFixed(1) : 1.2; });
      steps1.forEach(function (c, j) { c.box.style.strokeWidth = Math.floor(now / 1.2) % 3 === j ? 2.8 : 1.3; });
      /* 第 3 段：饼图从三等份长成 27 / 45 / 27 */
      var u3 = ease(seg(since(t, clock, 7.0), 0.4, 1.8));
      var fr3 = ATT.w.map(function (w) { return 1 / 3 + (w - 1 / 3) * u3; }), ang = -Math.PI / 2;
      pz.set(fr3, PC);
      fr3.forEach(function (f, i) {
        var mid = ang + Math.PI * f; ang += 2 * Math.PI * f;
        pzTxt[i].setAttribute('x', (R + 64 + 34 * Math.cos(mid)).toFixed(1));
        pzTxt[i].setAttribute('y', (160 + 34 * Math.sin(mid) + 4).toFixed(1));
      });
      pctTxt.textContent = u3 > 0.98 ? ATT.w.map(function (w) { return Math.round(w * 100) + '%'; }).join(' / ') : '';
      var u = ease(seg(since(t, clock, 10.4), 0.3, 2.4)), px = OX, py = OY;
      ATT.vals.forEach(function (v, i) {
        vArr[i].set(OX, OY, OX + v[0] * S, OY - v[1] * S, 8);
        var sx = (u > 0 ? px : OX), sy = (u > 0 ? py : OY), w = u > 0 ? ATT.w[i] : 1;
        var ex = sx + v[0] * S * w, ey = sy - v[1] * S * w;
        wArr[i].set(sx, sy, ex, ey, 9);
        setOpacity(wArr[i].g, u > 0 ? 1 : 0);
        setOpacity(vArr[i].g, 1 - 0.6 * u);
        px = ex; py = ey;
      });
      moveDot(outDot, [OX + ATT.out[0] * S * u, OY - ATT.out[1] * S * u]);
      setOpacity(outDot, u);
      outTxt.textContent = u > 0.98 ? '结果 [' + f3(ATT.out[0]) + ', ' + f3(ATT.out[1]) + ']' : '';
      outTxt.setAttribute('x', (OX + ATT.out[0] * S + 10).toFixed(1));
      outTxt.setAttribute('y', (OY - ATT.out[1] * S - 8).toFixed(1));
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }
  /* 随机向量的点积（确定性随机）：第 7 幕的数轴和演示 tf-scale 用 */
  function dotSamples(dk, n, seed) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var s = 0;
      for (var j = 0; j < dk; j++) s += nrm(i * dk + j, seed) * nrm(i * dk + j, seed + 101);
      out.push(s);
    }
    return out;
  }
  function stdOf(xs) {
    var m = 0, v = 0;
    xs.forEach(function (x) { m += x / xs.length; });
    xs.forEach(function (x) { v += (x - m) * (x - m) / xs.length; });
    return Math.sqrt(v);
  }
  function f4(x) { return fmt(x, 4); }
  var DOT4 = dotSamples(4, 40, 7), DOT64 = dotSamples(64, 40, 7);

  /* ── scene 7: 为什么要缩小：别让一个人的嗓门盖过全场 ── */
  function buildSceneScale() {
    var s = sceneSvg('左上两条数轴：每张卡片 4 个数字时，40 个随机打分挤在中间；64 个数字时散得很开；左下两张饼图：同一组分数 12、4、−4、6，' +
      '不缩小时一块几乎占满整个饼，除以 8 以后四块都看得见；右边依次出现：数字越多分数越大；一个人的嗓门盖过全场；学不动的两根条；音量旋钮拧小；Digit 也要除');
    s.appendChild(svgText(24, 26, '每次比的数字越多，打出来的分差得越大', 'demo-x-ink2', 13.5));
    var LX = 40, LW = 340, LO = -24;
    function numLine(y, xs, color, cap) {
      hline(s, LX, y, LX + LW, y, C_BORDER, 1.2);
      [-20, -10, 0, 10, 20].forEach(function (v) { hline(s, LX + (v - LO) / 48 * LW, y - 4, LX + (v - LO) / 48 * LW, y + 4, C_BORDER, 1); label(s, LX + (v - LO) / 48 * LW, y + 18, sgn(String(v)), 'demo-x-mut', 10.5, 'middle'); });
      label(s, 24, y - 26, cap, 'demo-x-ink2', 12);
      return xs.map(function (v, i) { return { d: dotAt(s, LX + clamp((v - LO) / 48, 0, 1) * LW, y - 8 - (i % 3) * 5, 3.4, color), i: i }; });
    }
    var dA = numLine(96, DOT4, C_GOOD, '每次比 4 个数字：分数挤在一起');
    var dB = numLine(168, DOT64, C_RNN, '每次比 64 个数字：分数散得很开');
    label(s, 24, 206, '（40 对随机卡片的打分，示意）', 'demo-x-mut', 11);
    var PIE_C = [C_RNN, C_K, C_MUTED, C_Q];
    label(s, 112, 238, '不缩小（编的分数）：12 / 4 / −4 / 6', 'demo-x-ink2', 12, 'middle');
    label(s, 296, 238, '除以 8 以后', 'demo-x-ink2', 12, 'middle');
    var pieA = pie(s, 112, 308, 54), pieB = pie(s, 296, 308, 54);
    /* 饼上写出每一块是哪个分数（−4 那块太窄，不写） */
    function pieMarks(cx, fr, show) {
      var ang = -Math.PI / 2;
      fr.forEach(function (f, i) {
        var mid = ang + Math.PI * f; ang += 2 * Math.PI * f;
        if (!show[i]) return;
        var rr = f > 0.9 ? 22 : 34;
        var tx = label(s, cx + rr * Math.cos(mid), 308 + rr * Math.sin(mid) + 4, show[i], 'demo-x-ink', 12, 'middle');
        tx.style.fill = '#15171c'; tx.style.fontWeight = '700';
      });
    }
    pieMarks(112, SCALE.pRaw, ['12', '', '', '']);
    pieMarks(296, SCALE.pScaled, ['12', '4', '', '6']);
    var knobArrow = arrow(s, C_ACCENT, 2.4);
    label(s, 204, 296, '÷ 8', 'demo-x-ink', 14, 'middle');
    tone(s, 112, 384, '最大的一块 99.7%', C_RNN, 12, 'middle');
    tone(s, 296, 384, '最大的一块 51%', C_GOOD, 12, 'middle');
    /* 第 1 段 */
    var p1 = group(s);
    label(p1, R, 64, '数字越多，分数越大', 'demo-x-ink', 14);
    label(p1, R, 96, '打分是把对应位置相乘、再加起来', 'demo-x-ink2', 12);
    label(p1, R, 120, '加的东西越多，总分就越容易很大或很小', 'demo-x-ink2', 12);
    var sp = [barRowAt(p1, R, 140, 110, '4 个数字', C_GOOD, 20, 12), barRowAt(p1, R, 172, 110, '64 个数字', C_RNN, 20, 12)];
    label(p1, R, 222, '条：分数一般差多少（按论文脚注 4 的假设）', 'demo-x-mut', 11);
    label(p1, R, 246, '论文每次比 64 个数字：一般差到 8 左右', 'demo-x-ink2', 12);
    /* 第 2 段：一个人的嗓门盖过全场 */
    var p2 = group(s);
    label(p2, R, 64, '分差太大：一个人的嗓门盖过全场', 'demo-x-ink', 14);
    var VOL = SCALE.pRaw, loud = [];
    for (var i = 0; i < 4; i++) {
      person(p2, R + 30 + i * 84, 104, 12, i === 0 ? C_RNN : C_MUTED);
      loud.push(vbar(p2, R + 18 + i * 84, 24, i === 0 ? C_RNN : C_MUTED));
      label(p2, R + 30 + i * 84, 256, ['12 分', '4 分', '−4 分', '6 分'][i], 'demo-x-ink2', 11.5, 'middle');
    }
    label(p2, R, 284, '最高分的那一个拿走 99.7%', 'demo-x-ink2', 12);
    label(p2, R, 308, '其他人说什么，几乎都听不见了', 'demo-x-ink2', 12);
    /* 第 3 段：学不动 */
    var p3 = group(s);
    label(p3, R, 64, '更麻烦的是：学不动', 'demo-x-ink', 14);
    label(p3, R, 96, '训练时，网络靠「往哪改」的信号（梯度）', 'demo-x-ink2', 12);
    var gb = [barRowAt(p3, R, 114, 80, '不缩小', C_RNN, 22, 12), barRowAt(p3, R, 148, 80, '缩小后', C_GOOD, 22, 12)];
    var ratio = label(p3, R, 206, '', 'demo-x-ink', 13);
    label(p3, R, 232, '信号几乎是 0，网络就几乎不改', 'demo-x-ink2', 12);
    label(p3, R, 256, '条：按上面这组分数算的信号（越长越好学）', 'demo-x-mut', 11);
    /* 第 4 段：音量旋钮 */
    var p4 = group(s);
    label(p4, R, 64, '办法：打分先除以 8，把音量调小', 'demo-x-ink', 14);
    var knob = clockFace(p4, R + 60, 150, 50, [[0.8, 3.4, C_ACCENT]]);
    label(p4, R + 60, 222, '音量旋钮', 'demo-x-mut', 11, 'middle');
    label(p4, R + 130, 112, '8 是 64 开平方', 'demo-x-ink2', 12);
    rich(p4, R + 130, 136, '（论文写作 $\\sqrt{d_k}$）', 12);
    label(p4, R + 130, 168, '比例回到 51% / 19% / 7% / 24%', 'demo-x-ink2', 12);
    label(p4, R + 130, 192, '每个人都有声音', 'demo-x-ink2', 12);
    label(p4, R, 258, '信号也回到 0.25，比原来大约 89 倍', 'demo-x-ink2', 12);
    /* 第 5 段 */
    var p5 = group(s);
    label(p5, R, 64, '论文自己说：这是一个猜测', 'demo-x-ink', 14);
    label(p5, R, 96, '原文是「我们猜测」；这篇没做实验，只引用了别人的结果', 'demo-x-ink2', 12);
    var hd = [['论文：每次比 64 个数字', 64, C_ACCENT], ['Digit：每次比 48 个数字', 48, C_ROBOT]].map(function (h, j) {
      return barRowAt(p5, R, 120 + j * 32, 170, h[0], h[2], 20, 11.5);
    });
    label(p5, R, 214, '条：要除以多少（数字个数开平方；Digit 的 48 = 192 ÷ 4，我们算的）', 'demo-x-mut', 11);
    label(p5, R, 240, 'Digit 的论文写的也是同一条公式', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* 点一个个落到数轴上：4 s 一轮 */
      var m = Math.floor((now % 5) / 4 * 44);
      [dA, dB].forEach(function (arr) { arr.forEach(function (o) { setOpacity(o.d, o.i < m ? 1 : 0.08); }); });
      pieA.set(SCALE.pRaw, PIE_C); pieB.set(SCALE.pScaled, PIE_C);
      var wob = 4 * Math.sin(now * 3);
      knobArrow.set(176 + wob, 308, 232 + wob, 308, 9);
      var u1 = ease(seg(since(t, clock, 0.4), 0.4, 1.6));
      sp[0].set(2 * 12 * u1, u1 > 0.95 ? '差 2 左右' : ''); sp[1].set(8 * 12 * u1, u1 > 0.95 ? '差 8 左右' : '');
      var u2 = ease(seg(since(t, clock, 3.6), 0.3, 1.4)), sh = 1 + 0.04 * Math.sin(now * 9);
      loud.forEach(function (b, j) { b.set(236, Math.max(2, VOL[j] * 86 * u2 * (j ? 1 : sh))); });
      var u3 = ease(seg(since(t, clock, 7.0), 0.3, 1.8));
      gb[0].set(SCALE.gRaw / 0.25 * 230 * u3, u3 > 0.9 ? f4(SCALE.gRaw) : '');
      gb[1].set(SCALE.gScaled / 0.25 * 230 * u3, u3 > 0.9 ? f2(SCALE.gScaled) : '');
      ratio.textContent = u3 > 0.95 ? '差约 ' + Math.round(SCALE.gScaled / SCALE.gRaw) + ' 倍' : '';
      /* 旋钮从 10 点钟拧到 1 点钟，再慢慢回去 */
      var kp = (since(t, clock, 10.4) % 5) / 5, ka = kp < 0.6 ? -0.3 + 0.36 * ease(kp / 0.6) : 0.06 - 0.36 * ease((kp - 0.6) / 0.4);
      knob.set([ka]);
      var u5 = ease(seg(since(t, clock, 13.4), 0.3, 1.4));
      hd[0].set(8 * 15 * u5, u5 > 0.9 ? '除以 8' : ''); hd[1].set(Math.sqrt(48) * 15 * u5, u5 > 0.9 ? '除以约 6.9' : '');
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 多头：请 8 个评委，各看各的 ── */
  function buildSceneHeads() {
    var s = sceneSvg('左上是 G1 最近 6 步；从最后一步 t 往回拉出四条彩色弧线，各连到不同的一步（四个评委各看各的）；下面一条 512 格的长条切成 8 段，' +
      '每段落到一个同色的小人头上，再拼回一条；右边依次出现：一个评委只能平均成一团；8 个评委各管一件事；工作量不变；表三的评委人数和得分；论文附录里找「它」指谁的评委');
    s.appendChild(svgText(24, 26, '请 8 个评委，各看各的', 'demo-x-ink2', 13.5));
    var hist = historyStrip(s, 24, 40, 6, 56, 84, { gap: 6 });
    var JUDGE = [[4, '看上一步'], [0, '看最开头'], [2, '看脚落地那步'], [5, '看自己']];
    var arcs = JUDGE.map(function (jd, j) {
      var p = paint(svgEl('path', { d: 'M 0 0', fill: 'none', 'stroke-width': 2.4 }), null, HEAD_COLORS[j]);
      s.appendChild(p); return p;
    });
    var BX = 24, hw = 46;
    label(s, BX, 214, '一份 512 个数字的档案，拆成 8 份', 'demo-x-mut', 11);
    var strips = [], judges = [], cat = [];
    for (var j = 0; j < 8; j++) {
      strips.push(paint(svgEl('rect', { x: BX + j * hw, y: 222, width: hw - 3, height: 16, rx: 2 }), HEAD_COLORS[j]));
      s.appendChild(strips[j]);
      judges.push(person(s, BX + j * hw + hw / 2 - 1.5, 274, 8, HEAD_COLORS[j]));
      cat.push(paint(svgEl('rect', { x: BX + j * hw, y: 334, width: hw - 3, height: 16, rx: 2 }), HEAD_COLORS[j]));
      s.appendChild(cat[j]);
    }
    label(s, BX, 370, '8 个评委各打各的分，再把意见拼回来', 'demo-x-mut', 11);
    var drops = [];
    for (j = 0; j < 8; j++) drops.push(flowSeg(s, HEAD_COLORS[j], 1, 2.6, 18, true));
    /* 第 1 段：一个评委 */
    var p1 = group(s);
    label(p1, R, 64, '只请一个评委：只能平均成一团', 'demo-x-ink', 14);
    var solo = person(p1, R + 30, 110, 12, C_MUTED);
    var soloBars = [0, 1, 2, 3, 4, 5].map(function (q) { return vbar(p1, R + 100 + q * 34, 24, C_MUTED); });
    label(p1, R + 112, 182, 't−5', 'demo-x-mono', 11, 'middle');
    label(p1, R + 282, 182, 't', 'demo-x-mono', 11, 'middle');
    label(p1, R, 214, '既要看近处，又要看最开头', 'demo-x-ink2', 12);
    label(p1, R, 238, '只好每一步都看一点，两件事都看不清', 'demo-x-ink2', 12);
    label(p1, R, 262, '论文说：平均会盖住这种能力', 'demo-x-ink2', 12);
    void solo;
    /* 第 2 段：8 个评委 */
    var p2 = group(s);
    label(p2, R, 64, '请 8 个评委：每人只管一件事', 'demo-x-ink', 14);
    var j2 = JUDGE.map(function (jd, q) {
      var y = 92 + q * 44;
      var pp = person(p2, R + 14, y + 6, 8, HEAD_COLORS[q]);
      label(p2, R + 36, y + 16, '评委 ' + (q + 1) + '：' + jd[1], 'demo-x-ink2', 12.5);
      return pp;
    });
    label(p2, R, 280, '（各看哪一步是示意，评委自己学出来）', 'demo-x-mut', 11);
    /* 第 3 段：工作量不变 */
    var p3 = group(s);
    label(p3, R, 64, '工作量没有变多', 'demo-x-ink', 14);
    var one = paint(svgEl('rect', { x: R, y: 96, width: 320, height: 22, rx: 3 }), C_MUTED); p3.appendChild(one);
    label(p3, R + 330, 112, '512', 'demo-x-mono', 11.5);
    var eight = [];
    for (j = 0; j < 8; j++) { eight.push(paint(svgEl('rect', { x: R + j * 40, y: 150, width: 37, height: 22, rx: 3 }), HEAD_COLORS[j])); p3.appendChild(eight[j]); }
    label(p3, R + 330, 166, '8 × 64', 'demo-x-mono', 11.5);
    label(p3, R, 214, '一个评委看全部 512 个数字，', 'demo-x-ink2', 12);
    label(p3, R, 238, '和 8 个评委每人看 64 个，加起来一样多', 'demo-x-ink2', 12);
    /* 第 4 段：表三，评委多少才合适 */
    var p4 = group(s);
    label(p4, R, 64, '论文表三：请几个评委最好？', 'demo-x-ink', 14);
    readHint(p4, R, 88, '翻译得分，**越高越好**（第 15 幕再讲这个分数）', 11.5);
    var hb = HEADS.map(function (h, q) { return barRowAt(p4, R, 100 + q * 26, 80, h.h + ' 个评委', q === 2 ? C_ACCENT : C_MUTED, 18, 11.5); });
    label(p4, R, 248, '1 个太少；32 个太多，每人只看 16 个数字', 'demo-x-ink2', 12);
    /* 第 5 段：附录图 */
    var p5 = group(s);
    var its = paperPart(p5, 'its', 0, 0.12, 1, 0.92, R, 62, 220, '');
    label(p5, R + 232, 84, '论文附录：', 'demo-x-ink2', 12);
    label(p5, R + 232, 106, '有个评委把', 'demo-x-ink2', 12);
    label(p5, R + 232, 128, '「its（它的）」', 'demo-x-ink2', 12);
    label(p5, R + 232, 150, '连到「Law（法律）」', 'demo-x-ink2', 12);
    label(p5, R + 232, 182, '看起来像在找「它」', 'demo-x-ink2', 12);
    label(p5, R + 232, 204, '指的是谁', 'demo-x-ink2', 12);
    label(p5, R, its.y + its.h + 26, '论文附录图 4（裁剪）；Digit 用了 4 个评委', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      hist.set(now);
      var x0 = hist.cx(5);
      JUDGE.forEach(function (jd, q) {
        var x1 = hist.cx(jd[0]), dep = 12 + 9 * q;
        if (jd[0] === 5) arcs[q].setAttribute('d', 'M ' + (x0 - 10) + ' 150 C ' + (x0 - 30) + ' ' + (150 + dep) + ' ' + (x0 + 30) + ' ' + (150 + dep) + ' ' + (x0 + 10) + ' 150');
        else arcs[q].setAttribute('d', 'M ' + x0 + ' 150 Q ' + ((x0 + x1) / 2) + ' ' + (150 + dep * 1.6) + ' ' + x1 + ' 150');
        arcs[q].style.opacity = (0.45 + 0.55 * Math.abs(Math.sin(now * 1.6 + q))).toFixed(2);
      });
      for (var q = 0; q < 8; q++) {
        var cx = BX + q * hw + hw / 2 - 1.5;
        drops[q].at(now + q * 0.2, [cx, 240], [cx, 262], true);
        judges[q].set(HEAD_COLORS[q], 0.6 + 0.4 * Math.abs(Math.sin(now * 2 + q)));
      }
      /* 第 1 段：一个评委，每一步都只分到一点 */
      var u1 = ease(seg(since(t, clock, 0.4), 0.3, 1.2));
      soloBars.forEach(function (b, q2) { b.set(166, (24 + 4 * Math.sin(now * 2 + q2)) * u1); });
      j2.forEach(function (pp, q2) { pp.set(HEAD_COLORS[q2], Math.floor(now / 1.2) % 4 === q2 ? 1 : 0.45); });
      /* 第 3 段：一整条 → 8 段 */
      var u3 = ease(seg((since(t, clock, 7.0) % 4), 0.4, 1.4));
      eight.forEach(function (r) { r.setAttribute('width', (40 - 4 * u3).toFixed(1)); });
      var u4 = ease(seg(since(t, clock, 10.4), 0.3, 1.6));
      hb.forEach(function (b, q2) { var v = HEADS[q2].bleu; b.set((v - 24) / 2 * 200 * u4, u4 > 0.9 ? f1(v) + ' 分' : ''); });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: 位置编码：给每张卡片装一只钟 ── */
  function buildScenePE() {
    var s = sceneSvg('左上是一只钟，三根指针转得一快一中一慢，旁边读出现在是第几步；左下三条快慢不同的波，一根竖线往右扫，三个小点读出这一步的「时间」；' +
      '右边依次出现：打乱座位，结果只是跟着换位；三张卡片各带一只钟；只看快针分不清、几根针一起看就分得清；论文的正弦波和表三 E 组；机器人里的两种用法');
    s.appendChild(svgText(24, 26, '给每张卡片装一只钟', 'demo-x-ink2', 13.5));
    var HANDS = [[0.88, 2, C_WARN], [0.68, 3.2, C_ACCENT], [0.48, 4.4, C_ROBOT]], SPD = [1 / 8, 1 / 64, 1 / 512];
    var clk = clockFace(s, 130, 150, 92, HANDS);
    var stepTxt = tone(s, 250, 100, '', C_INK, 18);
    [['快针', C_WARN], ['中针', C_ACCENT], ['慢针', C_ROBOT]].forEach(function (h, j) {
      s.appendChild(paint(svgEl('rect', { x: 250, y: 128 + j * 26, width: 14, height: 6, rx: 2 }), h[1]));
      label(s, 270, 136 + j * 26, h[0], 'demo-x-ink2', 12);
    });
    var PX = 60, PW = 320, Y0 = 282, RH = 40;
    var waves = SPD.map(function (fq, i) {
      var y = Y0 + i * RH, pts = [];
      for (var p = 0; p <= 160; p++) pts.push([PX + p / 160 * PW, y - 13 * Math.sin(2 * Math.PI * (p / 4) * fq * 8 / 8)]);
      hline(s, PX, y, PX + PW, y, C_BORDER, 0.8);
      pathLine(s, pts, HANDS[i][2], 1.8);
      label(s, 24, y + 4, ['快', '中', '慢'][i], 'demo-x-mut', 11.5);
      return { y: y, fq: fq, d: dotAt(s, PX, y, 4.5, C_Q) };
    });
    var cur = hline(s, PX, Y0 - 22, PX, Y0 + 2 * RH + 18, C_Q, 1.4, '4 3');
    label(s, PX, Y0 - 30, '同样的快慢，画成三条波（示意）', 'demo-x-mut', 11);
    /* 第 1 段：开会不分先后 */
    var p1 = group(s);
    label(p1, R, 64, '开会不分先后', 'demo-x-ink', 14);
    var tokN = ['A', 'B', 'C', 'D'], tokC = [], outC = [];
    tokN.forEach(function (n, i) {
      tokC.push(chip(p1, R + i * 70, 96, 56, n, C_Q, { size: 13 }));
      outC.push(chip(p1, R + i * 70, 176, 56, n + ' 的结果', C_V, { size: 11.5 }));
    });
    label(p1, R, 156, '开会', 'demo-x-mut', 11);
    label(p1, R, 246, '打乱座位，结果只是跟着换位', 'demo-x-ink2', 12);
    rich(p1, R, 270, '谁先谁后，它**自己分不出来**', 12.5);
    /* 第 2 段：每张卡片带一只钟 */
    var p2 = group(s);
    label(p2, R, 64, '所以给每张卡片写上「第几步」', 'demo-x-ink', 14);
    var mini = [1, 2, 3].map(function (q, j) {
      chip(p2, R + j * 116, 92, 104, '第 ' + q + ' 步的卡片', C_ROBOT, { size: 11.5 });
      return clockFace(p2, R + 52 + j * 116, 170, 34, HANDS);
    });
    label(p2, R, 236, '论文的说法：把位置信息加进卡片里', 'demo-x-ink2', 12);
    /* 第 3 段：像钟表 */
    var p3 = group(s);
    label(p3, R, 64, '为什么要好几根针？', 'demo-x-ink', 14);
    label(p3, R, 96, '只看快针：它转一圈就回到原处，', 'demo-x-ink2', 12);
    label(p3, R, 118, '分不清第 1 步和第 9 步', 'demo-x-ink2', 12);
    label(p3, R, 150, '加上慢针：远的两步也分得清', 'demo-x-ink2', 12);
    rich(p3, R, 182, '几根针一起看，**每一步都不一样**', 12.5);
    var pair = [1, 9].map(function (q, j) { return clockFace(p3, R + 60 + j * 150, 248, 34, HANDS); });
    label(p3, R + 60, 300, '第 1 步', 'demo-x-mut', 11, 'middle');
    label(p3, R + 210, 300, '第 9 步', 'demo-x-mut', 11, 'middle');
    /* 第 4 段：论文的正弦波，表三 E 组 */
    var p4 = group(s);
    label(p4, R, 64, '论文用一组快慢不同的正弦波当指针', 'demo-x-ink', 14);
    label(p4, R, 96, '换成让模型自己学一套「钟」，结果呢？', 'demo-x-ink2', 12);
    readHint(p4, R, 124, '表三 E 组，翻译得分**越高越好**', 11.5);
    var eb = [barRowAt(p4, R, 136, 110, '正弦波', C_ACCENT, 18, 11.5), barRowAt(p4, R, 164, 110, '自己学的', C_MUTED, 18, 11.5)];
    label(p4, R, 218, '25.8 对 25.7，几乎一样', 'demo-x-ink2', 12);
    label(p4, R, 242, '选正弦，是作者猜它更能用在更长的句子上', 'demo-x-ink2', 12);
    /* 第 5 段：机器人里 */
    var p5 = group(s);
    label(p5, R, 64, '机器人里，也用这只钟', 'demo-x-ink', 14);
    [['Digit（第 14 期）', '给 16 张卡片标上第几步'], ['扩散策略（第 10 期）', '标上「去噪到第几步」']].forEach(function (r2, i) {
      var y = 86 + i * 66;
      rectBox(p5, R, y, W, 54, C_ROBOT, C_SURFACE);
      label(p5, R + 12, y + 22, r2[0], 'demo-x-ink', 12.5);
      label(p5, R + 12, y + 43, r2[1], 'demo-x-ink2', 12);
    });
    label(p5, R, 240, '标的东西不一样，用的是同一类正弦钟（各自原论文）', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var pos = now * 2;
      clk.set(SPD.map(function (sp) { return pos * sp; }));
      stepTxt.textContent = '第 ' + Math.floor(pos) + ' 步';
      var px = (pos % 40) / 40, x = PX + px * PW;
      setLine(cur, x, Y0 - 22, x, Y0 + 2 * RH + 18);
      waves.forEach(function (w) { moveDot(w.d, [x, w.y - 13 * Math.sin(2 * Math.PI * (px * 40) * w.fq)]); });
      mini.forEach(function (c, j) { c.set(SPD.map(function (sp) { return (j + 1) * sp; })); });
      pair.forEach(function (c, j) { c.set(SPD.map(function (sp) { return [1, 9][j] * sp; })); });
      var sw = Math.floor(since(t, clock, 0.4) / 1.6) % 2, ph = seg((since(t, clock, 0.4) % 1.6), 0, 0.5);
      var ex = sw ? ease(ph) : 1 - ease(ph), dx = 70 * ex, dy = 22 * Math.min(1, 2 * Math.sin(Math.PI * ex));
      [tokC, outC].forEach(function (row) {
        row[1].setAttribute('transform', 'translate(' + dx.toFixed(1) + ' ' + (-dy).toFixed(1) + ')');
        row[2].setAttribute('transform', 'translate(' + (-dx).toFixed(1) + ' ' + dy.toFixed(1) + ')');
      });
      var u4 = seg(since(t, clock, 10.4), 0.3, 1.8);
      eb[0].set((25.8 - 24) / 2.2 * 200 * u4, u4 > 0.9 ? '25.8' : ''); eb[1].set((25.7 - 24) / 2.2 * 200 * u4, u4 > 0.9 ? '25.7' : '');
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: 一层里有什么：讨论、各自想、保留原稿、调音量 ── */
  function buildSceneBlock() {
    var s = sceneSvg('左边是一层：下面进来 6 张卡片，先「大家讨论」，绕过去的虚线是保留的原稿，汇合后「调音量」，再「各自想一想」，再保留原稿、再调音量；' +
      '小点沿主路和两条虚线往上走，旁边写着叠 6 层；右边依次出现：四张卡片互相要信息；一张卡片单独过一个先变宽再变窄的小网络；一张作文纸上逐行添红色批注；' +
      '高低不一的条被拉到差不多的高度；6 层一层层叠起来和参数的对比');
    s.appendChild(svgText(24, 26, '一层里有什么：四个动作，叠 6 次', 'demo-x-ink2', 13.5));
    var BX = 70, BW = 220, CX = BX + BW / 2;
    var inRow = cellGrid(s, CX - 63, 372, 6, 6, 18, 3, C_ROBOT);
    label(s, CX + 74, 386, '进来的卡片', 'demo-x-mut', 11);
    chip(s, BX, 304, BW, '① 大家讨论（注意力）', C_ACCENT, { size: 13, h: 34 });
    chip(s, BX, 252, BW, '③ 加回原稿 → ④ 调音量', C_WARN, { size: 12.5, h: 30 });
    chip(s, BX, 182, BW, '② 各自想一想（小网络）', C_V, { size: 13, h: 34 });
    chip(s, BX, 130, BW, '③ 加回原稿 → ④ 调音量', C_WARN, { size: 12.5, h: 30 });
    var outRow = cellGrid(s, CX - 63, 76, 6, 6, 18, 3, C_ACCENT);
    label(s, CX + 74, 90, '出去的卡片', 'demo-x-mut', 11);
    label(s, BX + BW + 30, 236, '叠 6 层', 'demo-x-ink', 15);
    pathLine(s, [[CX, 360], [BX - 22, 360], [BX - 22, 267], [BX, 267]], C_MUTED, 1.6, '5 4');
    pathLine(s, [[CX, 240], [BX - 22, 240], [BX - 22, 145], [BX, 145]], C_MUTED, 1.6, '5 4');
    label(s, BX - 26, 316, '原稿', 'demo-x-mut', 11, 'end');
    label(s, BX - 26, 196, '原稿', 'demo-x-mut', 11, 'end');
    var mainF = [[CX, 370, CX, 340], [CX, 304, CX, 284], [CX, 252, CX, 218], [CX, 182, CX, 162], [CX, 130, CX, 98]].map(function () { return flowSeg(s, C_INK, 1, 2.8, 28, true); });
    var skipF = [flowSeg(s, C_MUTED, 2, 2.6, 40, true), flowSeg(s, C_MUTED, 2, 2.6, 40, true)];
    /* 第 1 段：讨论 */
    var p1 = group(s);
    label(p1, R, 64, '① 大家讨论：每张卡片向别人要信息', 'demo-x-ink', 14);
    var disc = [0, 1, 2, 3].map(function (q) { return chip(p1, R + 10 + q * 86, 120, 66, '卡片 ' + (q + 1), C_ROBOT, { size: 12 }); });
    var dArcs = [];
    for (var a = 0; a < 4; a++) for (var b = a + 1; b < 4; b++) {
      var xa = R + 43 + a * 86, xb = R + 43 + b * 86;
      var arc = paint(svgEl('path', { d: 'M ' + xa + ' 118 Q ' + (xa + xb) / 2 + ' ' + (118 - 22 * (b - a)) + ' ' + xb + ' 118', fill: 'none', 'stroke-width': 1.4 }), null, C_ACCENT);
      p1.appendChild(arc); dArcs.push(arc);
    }
    label(p1, R, 190, '就是前面讲的注意力：谁和我像，就多听谁的', 'demo-x-ink2', 12);
    /* 第 2 段：各自想 */
    var p2 = group(s);
    label(p2, R, 64, '② 各自想一想：每张卡片单独加工', 'demo-x-ink', 14);
    var NODES = [3, 8, 3], nx = [R + 60, R + 160, R + 260], nn = [];
    NODES.forEach(function (n, c) { nn.push([]); for (var i = 0; i < n; i++) nn[c].push([nx[c], 170 - (n - 1) * 9 + i * 18]); });
    for (var c = 0; c < 2; c++) nn[c].forEach(function (p) { nn[c + 1].forEach(function (q) { hline(p2, p[0], p[1], q[0], q[1], C_BORDER, 0.7); }); });
    var nDots = nn.map(function (col, c2) { return col.map(function (p) { return dotAt(p2, p[0], p[1], 5, c2 === 1 ? C_V : C_MUTED); }); });
    label(p2, nx[0], 254, '收到的', 'demo-x-mut', 11, 'middle'); label(p2, nx[1], 254, '先展开成 4 倍', 'demo-x-mut', 11, 'middle'); label(p2, nx[2], 254, '再收回来', 'demo-x-mut', 11, 'middle');
    label(p2, R, 286, '每张卡片过的是同一个小网络，互不打扰', 'demo-x-ink2', 12);
    /* 第 3 段：保留原稿 */
    var p3 = group(s);
    label(p3, R, 64, '③ 保留原稿：只批注，不重写', 'demo-x-ink', 14);
    rectBox(p3, R, 86, 170, 180, C_BORDER, C_SURFACE2);
    var draft = [], notes = [];
    for (var q = 0; q < 6; q++) {
      draft.push(hline(p3, R + 14, 110 + q * 24, R + 14 + 100 + 40 * rnd(q, 3), 110 + q * 24, C_MUTED, 3));
      notes.push(hline(p3, R + 40 + 20 * rnd(q, 5), 102 + q * 24, R + 90 + 40 * rnd(q, 6), 102 + q * 24, C_RNN, 2.2));
    }
    label(p3, R + 186, 108, '灰线：原来的卡片', 'demo-x-ink2', 12);
    label(p3, R + 186, 132, '红线：这一层的新想法', 'demo-x-ink2', 12);
    label(p3, R + 186, 164, '新想法只是加上去，', 'demo-x-ink2', 12);
    label(p3, R + 186, 186, '原稿一直都在', 'demo-x-ink2', 12);
    label(p3, R + 186, 218, '这招来自更早的 ResNet', 'demo-x-ink2', 12);
    label(p3, R, 290, '论文里叫「残差」', 'demo-x-mut', 11.5);
    /* 第 4 段：调音量 */
    var p4 = group(s);
    label(p4, R, 64, '④ 调音量：把数字拉回差不多的范围', 'demo-x-ink', 14);
    var RAW = [0.95, 0.2, 0.7, 0.35, 0.85, 0.15, 0.6, 0.4], volB = RAW.map(function (v, q2) { return vbar(p4, R + 10 + q2 * 40, 26, C_WARN); });
    hline(p4, R, 220, R + 330, 220, C_BORDER, 1.2);
    label(p4, R, 250, '每张卡片的数字有大有小，调到同一个范围', 'demo-x-ink2', 12);
    label(p4, R, 274, '论文里叫「层归一化」', 'demo-x-mut', 11.5);
    /* 第 5 段：叠 6 层 */
    var p5 = group(s);
    label(p5, R, 64, '这样的一层，叠 6 次', 'demo-x-ink', 14);
    var layers = [];
    for (q = 0; q < 6; q++) { layers.push(rectBox(p5, R, 230 - q * 24, 120, 20, C_ACCENT, C_SURFACE2)); }
    var pb = [barRowAt(p5, R + 140, 120, 60, '论文', C_ACCENT, 20, 12), barRowAt(p5, R + 140, 156, 60, 'Digit', C_ROBOT, 20, 12)];
    label(p5, R + 140, 108, '要学的数有多少', 'demo-x-mut', 11);
    label(p5, R + 140, 210, '论文约 6500 万个', 'demo-x-ink2', 12);
    label(p5, R + 140, 234, 'Digit 只有约 140 万个', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      inRow.fill(6); outRow.fill(6);
      var pts = [[CX, 370, CX, 340], [CX, 304, CX, 284], [CX, 252, CX, 218], [CX, 182, CX, 162], [CX, 130, CX, 98]];
      mainF.forEach(function (f, j) { f.at(now + j * 0.25, [pts[j][0], pts[j][1]], [pts[j][2], pts[j][3]], true); });
      skipF[0].at(now, [BX - 22, 356], [BX - 22, 270], true);
      skipF[1].at(now + 0.5, [BX - 22, 236], [BX - 22, 148], true);
      dArcs.forEach(function (ar, q) { ar.style.opacity = (0.25 + 0.75 * Math.abs(Math.sin(now * 2 + q * 0.8))).toFixed(2); });
      disc.forEach(function (d, q) { d.box.style.strokeWidth = Math.floor(now / 0.9) % 4 === q ? 2.6 : 1.3; });
      var col = Math.floor(now * 2) % 3;
      nDots.forEach(function (cl, c2) { cl.forEach(function (d) { d.style.opacity = c2 === col ? 1 : 0.35; }); });
      var u3 = since(t, clock, 7.0) % 6;
      notes.forEach(function (n, q2) { setOpacity(n, seg(u3, 0.4 + q2 * 0.5, 0.7 + q2 * 0.5)); });
      var u4 = ease(seg(since(t, clock, 10.4) % 5, 1.0, 2.2)) * (1 - ease(seg(since(t, clock, 10.4) % 5, 4.2, 4.9)));
      volB.forEach(function (b, q2) { b.set(220, 110 * (RAW[q2] * (1 - u4) + (0.55 + 0.06 * Math.sin(q2)) * u4)); });
      var u5 = since(t, clock, 13.4);
      layers.forEach(function (l, q2) { setOpacity(l, seg(u5, 0.3 + q2 * 0.25, 0.5 + q2 * 0.25)); });
      var ub = ease(seg(u5, 0.8, 2.0));
      pb[0].set(100 * ub, ub > 0.9 ? '6500 万' : ''); pb[1].set(100 * 1.4 / 65 * ub, ub > 0.9 ? '140 万' : '');
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 11: 不能偷看未来 ── */
  function buildSceneMask() {
    var s = sceneSvg('左边是一张 6 × 6 的记分表，行是机器人的 6 步（谁在看）、列是被看的那一步；右上三角一格格被盖住，剩下的格子按行重新分比例，读出留下 21 / 36 对；' +
      '右边依次出现：连续剧不剧透，未来几集盖着帘子；盖住的格子分不到比例；第 014 期项目页视频里 Digit 被台阶绊住；Digit 16 张卡片的下三角；MaskedMimic 的遮挡');
    s.appendChild(svgText(24, 26, '记分表：盖住「未来」的格子', 'demo-x-ink2', 13.5));
    var N = MASK_N, GX = 92, GY = 72, CS = 40;
    var grid = attnGrid(s, GX, GY, N, CS, C_Q);
    var shades = [];
    for (var i = 0; i < N; i++) {
      var nm = i === N - 1 ? 't' : 't−' + (N - 1 - i);
      label(s, GX - 8, GY + i * CS + CS / 2 + 4, nm, 'demo-x-mono', 11, 'end');
      label(s, GX + i * CS + CS / 2 - 1, GY - 8, nm, 'demo-x-mono', 11, 'middle');
      for (var j = 0; j < N; j++) if (j > i) {
        var sh = paint(svgEl('rect', { x: GX + j * CS, y: GY + i * CS, width: CS - 2, height: CS - 2, rx: 2 }), C_MUTED);
        s.appendChild(sh); shades.push({ el: sh, i: i, j: j });
      }
    }
    label(s, GX, GY + N * CS + 22, '行：哪一步在看　列：被看的那一步', 'demo-x-mut', 11);
    var cnt = tone(s, GX, GY + N * CS + 44, '', C_Q, 12.5);
    var rowHi = rectBox(s, GX - 2, GY, N * CS, CS - 2, C_INK, 'none'); rowHi.style.fill = 'none'; rowHi.setAttribute('stroke-width', 2);
    var W0 = [];
    for (i = 0; i < N; i++) { W0.push([]); for (j = 0; j < N; j++) W0[i].push(0.3 + rnd(i * 7 + j, 11)); }
    /* 第 1 段：连续剧 */
    var p1 = group(s);
    label(p1, R, 64, '像追连续剧：不许剧透', 'demo-x-ink', 14);
    var eps = [], curt = [];
    for (i = 0; i < 6; i++) {
      eps.push(chip(p1, R + i * 58, 100, 50, '第 ' + (i + 1) + ' 集', C_Q, { size: 11.5, h: 44 }));
      var cr = paint(svgEl('rect', { x: R + i * 58, y: 100, width: 50, height: 44, rx: 7 }), C_MUTED); p1.appendChild(cr); curt.push(cr);
    }
    var nowTag = tone(p1, R, 172, '', C_Q, 12);
    label(p1, R, 204, '讲第 3 集时，只能用前 3 集的内容', 'demo-x-ink2', 12);
    label(p1, R, 228, '后面的几集，还盖着帘子', 'demo-x-ink2', 12);
    /* 第 2 段 */
    var p2 = group(s);
    label(p2, R, 64, '做法：把未来的格子盖住', 'demo-x-ink', 14);
    label(p2, R, 96, '盖住的格子分不到比例，等于 0', 'demo-x-ink2', 12);
    label(p2, R, 120, '每一行剩下的格子，重新分成 100%', 'demo-x-ink2', 12);
    rich(p2, R, 152, '6 步的记分表，只剩 **21 / 36** 对能看', 12.5);
    label(p2, R, 184, '（论文的写法是把分数设成负无穷大，§3.2.3）', 'demo-x-mut', 11);
    /* 第 3 段：机器人 */
    var p3 = group(s);
    label(p3, R, 64, '机器人上场时，本来就看不到未来', 'demo-x-ink', 14);
    var clip = projClip(p3, 'rh_step', R, 80, 272, 153, '第 14 期项目页视频（未标倍速）：脚被台阶绊住');
    label(p3, R, 270, '只能根据刚才发生的，决定下一步', 'demo-x-ink2', 12);
    label(p3, R, 294, '绊住以后，再迈步时腿抬得更高、更快', 'demo-x-ink2', 12);
    /* 第 4 段：Digit 16 张卡片 */
    var p4 = group(s);
    label(p4, R, 64, 'Digit 的 16 张卡片：只看过去', 'demo-x-ink', 14);
    var g16 = attnGrid(p4, R, 84, 16, 10, C_ROBOT);
    label(p4, R + 180, 110, '下三角亮着：过去', 'demo-x-ink2', 12);
    label(p4, R + 180, 134, '右上暗着：未来', 'demo-x-ink2', 12);
    rich(p4, R + 180, 170, '留下 **136 / 256** 对', 12.5);
    /* 第 5 段：MaskedMimic */
    var p5 = group(s);
    label(p5, R, 64, '第 28 期 MaskedMimic：同样的遮挡', 'demo-x-ink', 14);
    var mm = [], mmX = [];
    /* 论文 §6.5：每种输入各成一种卡片（目标姿态按关键帧、物体、地形、文字、历史），不是按身体部位 */
    var MMN = ['关键帧 1', '关键帧 2', '物体', '地形', '文字', '历史'];
    for (i = 0; i < 6; i++) {
      mm.push(chip(p5, R + i * 59, 96, 54, MMN[i], C_ROBOT, { size: 11, h: 40 }));
      mmX.push(cross(p5, R + i * 59 + 18, 106, 18, C_BAD));
    }
    label(p5, R, 176, '没提供的输入，就把那张卡片盖住', 'demo-x-ink2', 12);
    label(p5, R, 200, '只给头、或只给双手的目标，也能跟（§7.2）', 'demo-x-ink2', 12);
    label(p5, R, 232, '（每种输入一种卡片：Tessler 等，arXiv 2409.14393 §6.5）', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var u = ease(seg(t, 0.5, 2.6)), nShown = Math.round(u * 15), k = 0;
      shades.forEach(function (sh) { setOpacity(sh.el, k++ < nShown ? 0.85 : 0); });
      var hiRow = Math.floor(now / 1.2) % N;
      rowHi.setAttribute('y', (GY + hiRow * CS).toFixed(1));
      grid.set(function (i2, j2) {
        if (j2 > i2 && u > 0.99) return { a: 0.06 };
        var row = W0[i2], denom = 0;
        for (var q = 0; q < N; q++) if (!(q > i2 && u > 0.99)) denom += row[q];
        return { a: clamp(row[j2] / denom * 2.2, 0.08, 0.95) };
      });
      cnt.textContent = u > 0.99 ? '留下 ' + causalPairs(N) + ' / ' + N * N + ' 对（= 6 × 7 ÷ 2）' : '盖住中…';
      /* 第 1 段：每 1.5 s 播到下一集 */
      var ep = Math.floor(since(t, clock, 0.4) / 1.5) % 6;
      curt.forEach(function (cr, q) { setOpacity(cr, q > ep ? 0.85 : 0); });
      eps.forEach(function (e2, q) { e2.box.style.strokeWidth = q === ep ? 2.8 : 1.3; });
      nowTag.textContent = '正在讲第 ' + (ep + 1) + ' 集';
      clip.at(K.clipSince(t, 7.0), winK(t, 2) > 0.05);
      var m16 = 1 + Math.floor(since(t, clock, 10.4) * 6) % 17;
      g16.set(function (i2, j2) { return { a: j2 > i2 ? 0.07 : i2 < m16 ? 0.85 : 0.2 }; });
      var mmk = Math.floor(now / 1.5);
      mmX.forEach(function (x, q) { setOpacity(x, rnd(q + 10 * mmk, 5) < 0.5 ? 1 : 0); });
      /* 盖住的卡片只剩空框和叉，字不从叉底下透出来 */
      mm.forEach(function (c2, q) { var hid = rnd(q + 10 * mmk, 5) < 0.5; setOpacity(c2.box, hid ? 0.45 : 1); setOpacity(c2.txt, hid ? 0 : 1); });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 一边写，一边回头看原文（交叉注意力） ── */
  function buildSceneCross() {
    var s = sceneSvg('左边两列：左列是英文原句 6 张卡片，右列是正在写的德文 4 张卡片；德文当前那个词向英文每个词连线，线越粗看得越多；' +
      '右边依次出现：一个人一边写一边回头看原文；提问的在德文这边、资料在英文那边；两串卡片不一样长；扩散策略的动作一边去噪一边回头看观测；自己开会和回头看别人的对比');
    s.appendChild(svgText(24, 26, '一边写德文，一边回头看英文', 'demo-x-ink2', 13.5));
    var EN = ['The', 'cat', 'sat', 'on', 'the', 'mat'], DE = ['Die', 'Katze', 'saß', 'auf'];
    var AL = [[0.7, 0.1, 0.05, 0.05, 0.05, 0.05], [0.15, 0.7, 0.05, 0.04, 0.03, 0.03], [0.05, 0.2, 0.65, 0.04, 0.03, 0.03], [0.03, 0.04, 0.1, 0.7, 0.08, 0.05]];
    var LX = 40, RX = 290, CW = 90;
    var enC = EN.map(function (w, i) { return chip(s, LX, 62 + i * 46, CW, w, C_K, { size: 12.5, h: 32 }); });
    var deC = DE.map(function (w, i) { return chip(s, RX, 62 + i * 46, CW, w, C_Q, { size: 12.5, h: 32 }); });
    label(s, LX, 52, '英文原句（被查的资料）', 'demo-x-ink2', 11.5);
    label(s, RX, 52, '正在写的德文（提问）', 'demo-x-ink2', 11.5);
    var lines = EN.map(function () { return hline(s, 0, 0, 0, 0, C_Q, 1); });
    label(s, 24, 350, '线越粗，看得越多（示意）：', 'demo-x-mut', 11);
    label(s, 24, 372, '每个德文词主要看对应的那个英文词', 'demo-x-mut', 11);
    /* 第 1 段：一边写一边回头看 */
    var p1 = group(s);
    label(p1, R, 64, '就像人翻译时', 'demo-x-ink', 14);
    var writer = person(p1, R + 170, 120, 14, C_Q);
    rectBox(p1, R, 96, 110, 120, C_K, C_SURFACE2);
    label(p1, R + 55, 118, '英文原句', 'demo-x-ink2', 11.5, 'middle');
    rectBox(p1, R + 236, 96, 110, 120, C_Q, C_SURFACE2);
    label(p1, R + 291, 118, '德文译文', 'demo-x-ink2', 11.5, 'middle');
    var orig = [0, 1, 2, 3].map(function (q) { return hline(p1, R + 14, 140 + q * 18, R + 96, 140 + q * 18, C_K, 3); });
    var tr = [0, 1, 2, 3].map(function (q) { return hline(p1, R + 250, 140 + q * 18, R + 332, 140 + q * 18, C_Q, 3); });
    var look = arrow(p1, C_K, 2, '4 3');
    label(p1, R, 246, '写一个德文词，就回头看一眼英文原句', 'demo-x-ink2', 12);
    void writer;
    /* 第 2 段 */
    var p2 = group(s);
    label(p2, R, 64, '提问的在这边，资料在那边', 'demo-x-ink', 14);
    chip(p2, R, 96, 160, '问题 Q：来自德文', C_Q, { size: 12 });
    chip(p2, R, 140, 160, '标签 K：来自英文', C_K, { size: 12 });
    chip(p2, R, 184, 160, '内容 V：来自英文', C_V, { size: 12 });
    label(p2, R + 176, 116, '前面讲的都是', 'demo-x-ink2', 12);
    label(p2, R + 176, 138, '「自己和自己开会」', 'demo-x-ink2', 12);
    label(p2, R + 176, 170, '这次是去问', 'demo-x-ink2', 12);
    label(p2, R + 176, 192, '「另一组人」', 'demo-x-ink2', 12);
    label(p2, R, 246, '论文叫它交叉注意力', 'demo-x-mut', 11.5);
    /* 第 3 段：两串不一样长 */
    var p3 = group(s);
    label(p3, R, 64, '两串卡片可以不一样长', 'demo-x-ink', 14);
    var c6 = cellGrid(p3, R, 100, 6, 6, 30, 6, C_K), c4 = cellGrid(p3, R, 170, 4, 4, 30, 6, C_Q);
    label(p3, R + 230, 120, '英文 6 张', 'demo-x-ink2', 12);
    label(p3, R + 230, 190, '德文 4 张', 'demo-x-ink2', 12);
    label(p3, R, 246, '每张德文卡片，都能去看全部英文卡片', 'demo-x-ink2', 12);
    /* 第 4 段：扩散策略 */
    var p4 = group(s);
    label(p4, R, 64, '第 10 期扩散策略的 Transformer 版', 'demo-x-ink', 14);
    robotImg(p4, 'ur5', R, 86, 70);
    chip(p4, R, 172, 88, '观测', C_K, { size: 12 });
    var noisy = [];
    for (var q = 0; q < 8; q++) noisy.push(paint(svgEl('rect', { x: R + 130 + q * 26, y: 150, width: 20, height: 20, rx: 3 }), C_V));
    noisy.forEach(function (n) { p4.appendChild(n); });
    label(p4, R + 130, 104, '一串带噪声的动作，慢慢变干净', 'demo-x-mut', 11);
    var obsF = [0, 1, 2].map(function () { return flowSeg(p4, C_K, 2, 3, 36); });
    label(p4, R, 240, '动作一边去噪，一边回头看观测', 'demo-x-ink2', 12);
    label(p4, R, 264, '（Chi 等，arXiv 2303.04137 §3.1）', 'demo-x-mut', 11);
    /* 第 5 段：两种开会 */
    var p5 = group(s);
    label(p5, R, 64, '两种「开会」', 'demo-x-ink', 14);
    var selfRow = [0, 1, 2, 3].map(function (q2) { return dotAt(p5, R + 20 + q2 * 36, 150, 8, C_Q); });
    for (var a = 0; a < 4; a++) for (var b2 = a + 1; b2 < 4; b2++) p5.appendChild(paint(svgEl('path', { d: 'M ' + (R + 20 + a * 36) + ' 142 Q ' + (R + 20 + (a + b2) * 18) + ' ' + (142 - 14 * (b2 - a)) + ' ' + (R + 20 + b2 * 36) + ' 142', fill: 'none', 'stroke-width': 1.2 }), null, C_Q));
    label(p5, R, 196, '自己和自己开会', 'demo-x-ink2', 12);
    var topRow = [0, 1, 2, 3].map(function (q2) { return dotAt(p5, R + 200 + q2 * 36, 110, 8, C_K); });
    var botRow = [0, 1, 2].map(function (q2) { return dotAt(p5, R + 218 + q2 * 36, 170, 8, C_Q); });
    var crossL = [];
    botRow.forEach(function (bd, q2) { topRow.forEach(function (td, q3) { crossL.push(hline(p5, R + 218 + q2 * 36, 162, R + 200 + q3 * 36, 118, C_V, 1.2)); }); });
    label(p5, R + 190, 196, '回头去问另一组人', 'demo-x-ink2', 12);
    label(p5, R, 240, '一个 Transformer 里，两种都会用到', 'demo-x-ink2', 12);
    void selfRow;
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var k = Math.floor(now / 1.4) % DE.length;
      deC.forEach(function (c, i) { c.box.style.strokeWidth = i === k ? 2.8 : 1.3; });
      EN.forEach(function (w, i) {
        var a2 = AL[k][i];
        setLine(lines[i], LX + CW, 78 + i * 46, RX, 78 + k * 46);
        lines[i].style.strokeWidth = (0.6 + a2 * 7).toFixed(1);
        lines[i].style.opacity = (0.25 + 0.75 * a2).toFixed(2);
        enC[i].box.style.fill = C_K; enC[i].box.style.fillOpacity = (a2 * 0.5).toFixed(2);
      });
      /* 第 1 段：写一行，回头看一行 */
      var s1 = since(t, clock, 0.4) % 6, line = Math.min(3, Math.floor(s1 / 1.3));
      tr.forEach(function (l, q2) { setOpacity(l, q2 < line || (q2 === line && (s1 % 1.3) > 0.7) ? 1 : 0.1); });
      orig.forEach(function (l, q2) { l.style.strokeWidth = q2 === line ? 5 : 3; });
      look.set(R + 232, 146 + line * 18, R + 100, 140 + line * 18, 9);
      setOpacity(look.g, (s1 % 1.3) < 0.8 ? 1 : 0.2);
      c6.fill(6); c4.fill(1 + Math.floor(now * 1.5) % 4);
      /* 第 4 段：噪声动作慢慢变干净 */
      var dn = (since(t, clock, 10.4) % 5) / 4;
      noisy.forEach(function (n, q2) {
        var clean = 0.5 + 0.35 * Math.sin(q2 * 0.8), noise = rnd(q2 + 13 * Math.floor(now * 4), 9) - 0.5;
        var y = 150 - 26 * (clean - 0.5 + noise * (1 - clamp(dn, 0, 1)));
        n.setAttribute('y', y.toFixed(1));
      });
      obsF.forEach(function (f, q2) { f.at(now + q2 * 0.3, [R + 92, 192], [R + 150 + q2 * 70, 212], true); });
      crossL.forEach(function (l, q2) { l.style.opacity = (0.2 + 0.7 * Math.abs(Math.sin(now * 2 + q2))).toFixed(2); });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }
  /* ── scene 13: 批改作业能一起改，写作文只能一个字一个字写 ── */
  function buildSceneDecode() {
    var s = sceneSvg('左上是训练：德文答案整句都在，一次送进去，5 个格子同时打勾；左下是用的时候：一次只写出一个词，再接回输入写下一个，计数一次次往上加；' +
      '右边依次出现：老师一次批完整页作业；一支笔一个字一个字写；机器人每 20 毫秒写一个动作的时间尺；写 50 个要算 50 次；论文结论');
    s.appendChild(svgText(24, 26, '训练和使用，不一样快', 'demo-x-ink2', 13.5));
    var IN = ['开头', 'Die', 'Katze', 'saß', 'auf'], OUT = ['Die', 'Katze', 'saß', 'auf', 'der'];
    label(s, 24, 52, '训练：答案都在，整句一起改', 'demo-x-ink2', 12);
    var trIn = IN.map(function (n, i) { return chip(s, 40 + i * 70, 62, 58, n, C_Q, { size: 12.5 }); });
    chip(s, 40, 104, 338, 'Transformer（一次算完）', C_ACCENT, { size: 12.5, h: 30 });
    var trOut = OUT.map(function (n, i) { return chip(s, 40 + i * 70, 146, 58, n, C_V, { size: 12.5 }); });
    var trF = OUT.map(function () { return flowSeg(s, C_MUTED, 1, 2.4, 20, true); });
    label(s, 24, 208, '使用：只能一个一个写', 'demo-x-ink2', 12);
    var infIn = IN.map(function (n, i) { return chip(s, 40 + i * 70, 218, 58, n, C_Q, { size: 12.5 }); });
    chip(s, 40, 260, 338, 'Transformer（又算一次）', C_ACCENT, { size: 12.5, h: 30 });
    var infOut = OUT.map(function (n, i) { return chip(s, 40 + i * 70, 302, 58, n, C_V, { size: 12.5 }); });
    var back = pathLine(s, [[381, 318], [391, 318], [391, 234], [381, 234]], C_WARN, 1.8, '4 3');
    var backHead = arrowHead(s, C_WARN);
    backHead.set(388, 234, 379, 234, 7);
    label(s, 395, 280, '接回', 'demo-x-warn', 11.5);
    var nPass = tone(s, 378, 356, '', C_WARN, 12.5, 'end');
    label(s, 24, 382, '每写出一个，就接回输入，再算一次', 'demo-x-mut', 11);
    /* 第 1 段：批改作业 */
    var p1 = group(s);
    label(p1, R, 64, '训练：像老师批改作业', 'demo-x-ink', 14);
    rectBox(p1, R, 84, 200, 170, C_BORDER, C_SURFACE2);
    var hwTicks = [];
    for (var q = 0; q < 5; q++) {
      hline(p1, R + 16, 108 + q * 30, R + 140, 108 + q * 30, C_MUTED, 3);
      hwTicks.push(tick(p1, R + 154, 96 + q * 30, 16, C_GOOD));
    }
    label(p1, R + 216, 116, '标准答案都在', 'demo-x-ink2', 12);
    label(p1, R + 216, 140, '整页一起改', 'demo-x-ink2', 12);
    label(p1, R + 216, 172, '再配上「不许', 'demo-x-ink2', 12);
    label(p1, R + 216, 194, '偷看后面」', 'demo-x-ink2', 12);
    label(p1, R + 216, 226, '一次就算完', 'demo-x-ink2', 12);
    /* 第 2 段：写作文 */
    var p2 = group(s);
    label(p2, R, 64, '用的时候：像自己写作文', 'demo-x-ink', 14);
    var WRD = ['今', '天', '天', '气', '很', '好'], wTx = WRD.map(function (w, j) { return label(p2, R + 20 + j * 40, 140, w, 'demo-x-ink', 24, 'middle'); });
    var pen = paint(svgEl('path', { d: 'M 0 0 L 6 -22 L 12 -22 L 6 0 Z' }), C_WARN); p2.appendChild(pen);
    label(p2, R, 196, '写一个字，读一遍前面写的，再写下一个', 'demo-x-ink2', 12);
    label(p2, R, 220, '后面的字还不存在，没法一起写', 'demo-x-ink2', 12);
    /* 第 3 段：机器人每 20 ms */
    var p3 = group(s);
    label(p3, R, 64, '机器人：每 0.02 秒写一个动作', 'demo-x-ink', 14);
    var TX = R + 10, TWd = 330;
    hline(p3, TX, 140, TX + TWd, 140, C_BORDER, 1.4);
    for (q = 0; q <= 5; q++) { hline(p3, TX + q * TWd / 5, 134, TX + q * TWd / 5, 146, C_BORDER, 1.2); label(p3, TX + q * TWd / 5, 162, q * 20 + ' 毫秒', 'demo-x-mut', 10.5, 'middle'); }
    var stepDots = [0, 1, 2, 3, 4].map(function (q2) { return dotAt(p3, TX + q2 * TWd / 5 + TWd / 10, 120, 6, C_ROBOT); });
    var cursor = hline(p3, TX, 104, TX, 150, C_ROBOT, 2);
    robotImg(p3, 'digit', R, 182, 110);
    label(p3, R + 66, 210, 'Digit（第 14 期）：', 'demo-x-ink2', 12);
    label(p3, R + 66, 234, '每 0.02 秒算一次，只写下一步', 'demo-x-ink2', 12);
    label(p3, R + 66, 258, '写好的动作，接回去当输入', 'demo-x-ink2', 12);
    /* 第 4 段：越长越慢 */
    var p4 = group(s);
    label(p4, R, 64, '一个一个写，越长越慢', 'demo-x-ink', 14);
    var many = cellGrid(p4, R, 92, 50, 10, 24, 6, C_V);
    var manyTxt = tone(p4, R, 270, '', C_V, 13);
    label(p4, R, 294, '写 50 个，就要算 50 次', 'demo-x-ink2', 12);
    /* 第 5 段：论文结论 */
    var p5 = group(s);
    label(p5, R, 64, '论文最后写：下一步，', 'demo-x-ink', 14);
    label(p5, R, 88, '要让生成不那么「一个一个来」', 'demo-x-ink', 14);
    rectBox(p5, R, 112, W, 86, C_ROBOT, C_SURFACE);
    label(p5, R + 12, 138, '这是论文自己留下的问题', 'demo-x-ink', 12.5);
    label(p5, R + 12, 162, '我们的看法：对机器人尤其要紧，', 'demo-x-ink2', 12);
    label(p5, R + 12, 184, 'Digit 每一步只有 20 毫秒', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var tr = (now % 2.4) / 2.4;
      trOut.forEach(function (c) { setOpacity(c, tr > 0.4 ? 1 : 0.25); });
      trF.forEach(function (f, i) { f.at(now, [69 + i * 70, 92], [69 + i * 70, 102], tr < 0.4); });
      var k = Math.floor((now % 5.4) / 0.9);
      infOut.forEach(function (c, i) { setOpacity(c, i < k ? 1 : i === k ? 0.6 + 0.4 * Math.sin(now * 8) : 0.12); });
      infIn.forEach(function (c, i) { setOpacity(c, i <= k ? 1 : 0.12); });
      setOpacity(back, k >= 1 && k <= 4 ? 1 : 0.25); setOpacity(backHead.node, k >= 1 && k <= 4 ? 1 : 0.25);
      nPass.textContent = '第 ' + Math.min(5, k + 1) + ' 次';
      /* 第 1 段：5 个勾同时出现 */
      var h1 = (since(t, clock, 0.4) % 3) / 3;
      hwTicks.forEach(function (tk) { setOpacity(tk, h1 > 0.35 ? 1 : 0); });
      /* 第 2 段：一个字一个字写 */
      var w2 = since(t, clock, 3.6) % 7, nW = Math.min(6, Math.floor(w2 / 0.9));
      wTx.forEach(function (tx, j) { setOpacity(tx, j < nW ? 1 : 0.1); });
      var px = R + 20 + Math.min(5, nW) * 40 + 10 + 4 * Math.sin(now * 14);
      pen.setAttribute('transform', 'translate(' + px.toFixed(1) + ' 150)');
      var tm = (now * 0.5) % 1, cx = TX + tm * TWd;
      setLine(cursor, cx, 104, cx, 150);
      stepDots.forEach(function (d, j) { d.style.opacity = tm * 5 > j + 0.5 ? 1 : 0.2; });
      var m4 = Math.min(50, Math.floor((since(t, clock, 10.4) % 8) * 9));
      many.fill(m4);
      manyTxt.textContent = '已经算了 ' + m4 + ' 次';
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* 一辆小车：车身 + 两个轮子；put(x, y) 把车底中点放在 (x, y) */
  function carIcon(parent, color) {
    var g = group(parent);
    var body = paint(svgEl('path', { d: 'M -22 -6 L -22 -16 L -10 -16 L -4 -26 L 12 -26 L 18 -16 L 24 -16 L 24 -6 Z' }), color);
    g.appendChild(body);
    var w1 = dotAt(g, -12, -5, 5, C_INK), w2 = dotAt(g, 14, -5, 5, C_INK);
    void w1; void w2;
    return { g: g, put: function (x, y) { g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')'); } };
  }

  /* ── scene 14: 怎么训练：先热身，再慢慢收 ── */
  function buildSceneRecipe() {
    var s = sceneSvg('左边是一条曲线：横轴是练了多少步，纵轴是每一步改动的大小，前 4000 步直线升高，之后慢慢降，一个小点沿曲线走；' +
      '下面一辆小车在路上开，车速跟着曲线变，起步慢慢加速、后来慢慢松油门；右边依次出现：两套练习题的多少；8 张显卡练两个模型的进度条；热身 4000 步；' +
      '随机让一部分数字请假的格子；扩散策略也先热身');
    s.appendChild(svgText(24, 26, '学习的步子：先慢慢加大，再慢慢变小', 'demo-x-ink2', 13.5));
    var PX = 56, PY = 56, PW = 336, PH = 190, SMAX = 100000, LMAX = 7.5e-4;
    rectBox(s, PX, PY, PW, PH, C_BORDER, C_SURFACE);
    function sx(v) { return PX + v / SMAX * PW; }
    function sy(v) { return PY + PH - v / LMAX * PH; }
    var pts = [];
    for (var st = 1; st <= SMAX; st += st < 6000 ? 100 : 1000) pts.push([sx(st), sy(lrate(st))]);
    var curve = pathLine(s, pts, C_ACCENT, 2.4);
    hline(s, sx(WARMUP), PY, sx(WARMUP), PY + PH, C_MUTED, 1, '4 4');
    label(s, sx(WARMUP) + 6, PY + 16, '第 4000 步：最大', 'demo-x-ink2', 11);
    [0, 25000, 50000, 75000, 100000].forEach(function (v) { label(s, sx(v), PY + PH + 16, v ? (v / 10000) + ' 万' : '0', 'demo-x-mut', 10.5, 'middle'); });
    label(s, PX + PW, PY + PH + 36, '练了多少步（小模型练 10 万步）', 'demo-x-mut', 11, 'end');
    label(s, PX - 6, PY + 14, '大', 'demo-x-mut', 11, 'end');
    label(s, PX - 6, PY + PH - 6, '小', 'demo-x-mut', 11, 'end');
    label(s, 24, PY + PH / 2, '步子', 'demo-x-mut', 11);
    var mk = dotAt(s, PX, PY + PH, 5.5, C_WARN);
    label(s, 24, 316, '像开车：起步慢慢踩油门，上路后慢慢松开', 'demo-x-ink2', 12);
    hline(s, 30, 372, 390, 372, C_BORDER, 2);
    var dash = [];
    for (var q = 0; q < 9; q++) dash.push(hline(s, 0, 372, 0, 372, C_MUTED, 2, '10 8'));
    var car = carIcon(s, C_WARN);
    var spd = tone(s, 390, 340, '', C_WARN, 12, 'end');
    /* 第 1 段：练习题 */
    var p1 = group(s);
    label(p1, R, 64, '练习题有多少', 'demo-x-ink', 14);
    var db = [barRowAt(p1, R, 86, 96, '英→德', C_Q, 20, 12), barRowAt(p1, R, 116, 96, '英→法', C_V, 20, 12)];
    label(p1, R, 168, '每一题是一对句子：英文和它的译文', 'demo-x-ink2', 12);
    label(p1, R, 192, '每一批约 2.5 万个英文 token、2.5 万个德文 token', 'demo-x-ink2', 12);
    /* 第 2 段：8 张显卡 */
    var p2 = group(s);
    label(p2, R, 64, '一台电脑、8 张显卡，练多久', 'demo-x-ink', 14);
    var race = [barRowAt(p2, R, 92, 60, '小模型', C_ACCENT, 20, 12), barRowAt(p2, R, 130, 60, '大模型', C_WARN, 20, 12)];
    var clk = tone(p2, R + W, 76, '', C_INK, 12, 'end');
    label(p2, R, 184, '小模型：12 小时', 'demo-x-ink2', 12);
    label(p2, R, 208, '大模型：3 天半', 'demo-x-ink2', 12);
    /* 第 3 段：热身 */
    var p3 = group(s);
    label(p3, R, 64, '先热身 4000 步', 'demo-x-ink', 14);
    label(p3, R, 96, '论文没写为什么要热身', 'demo-x-ink2', 12);
    label(p3, R, 120, '做法：前 4000 步，步子越走越大', 'demo-x-ink2', 12);
    label(p3, R, 144, '第 4000 步最大，之后越走越小', 'demo-x-ink2', 12);
    var stepsRow = [];
    for (q = 0; q < 10; q++) stepsRow.push(paint(svgEl('rect', { x: R + q * 34, y: 178, width: 4, height: 30, rx: 2 }), C_ACCENT));
    stepsRow.forEach(function (r) { p3.appendChild(r); });
    label(p3, R, 256, '每根竖条：一步改动有多大（示意）', 'demo-x-mut', 11);
    label(p3, R, 280, '论文里叫「学习率预热」', 'demo-x-mut', 11);
    /* 第 4 段：随机请假 */
    var p4 = group(s);
    label(p4, R, 64, '随机请假：每次让 10% 的数字休息', 'demo-x-ink', 14);
    var leave = cellGrid(p4, R, 88, 40, 10, 26, 6, C_V);
    label(p4, R, 238, 'dropout 原论文说：防止单元之间互相依赖', 'demo-x-ink2', 12);
    label(p4, R, 262, '论文里叫 dropout，只在训练时用', 'demo-x-mut', 11);
    /* 第 5 段：扩散策略 */
    var p5 = group(s);
    label(p5, R, 64, '机器人模型也这么练', 'demo-x-ink', 14);
    rectBox(p5, R, 84, W, 80, C_ROBOT, C_SURFACE);
    label(p5, R + 12, 110, '第 10 期 扩散策略', 'demo-x-ink', 12.5);
    label(p5, R + 12, 134, '也先热身：500 步（Transformer 版 1000 步）', 'demo-x-ink2', 12);
    label(p5, R + 12, 154, '再慢慢把步子变小', 'demo-x-ink2', 12);
    label(p5, R, 196, '（Chi 等，arXiv 2303.04137 附录 A.4）', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      curve.style.strokeDasharray = '1400';
      curve.style.strokeDashoffset = String(1400 * (1 - ease(seg(t, 0.3, 2.4))));
      var u = (now * 0.08) % 1, st2 = Math.max(1, u * u * SMAX), lr = lrate(st2);
      moveDot(mk, [sx(st2), sy(lr)]);
      /* 小车：车速 ∝ 步子大小；路面虚线往后退 */
      var v = lr / LR_PEAK, off = (now * 140 * v) % 36;
      dash.forEach(function (d, q2) { var x = 30 + q2 * 40 - off; setLine(d, Math.max(30, x), 372, Math.max(30, Math.min(390, x + 18)), 372); });
      car.put(80 + 220 * v, 366);
      spd.textContent = '步子：' + Math.round(v * 100) + '%';
      var u1 = seg(since(t, clock, 0.4), 0.3, 1.6);
      db[0].set(4.5 / 36 * 220 * u1, Math.round(450 * u1) + ' 万对'); db[1].set(220 * u1, Math.round(3600 * u1) + ' 万对');
      var u2 = since(t, clock, 3.6) * 8;
      race[0].set(Math.min(1, u2 / 12) * 220, Math.min(12, u2) >= 12 ? '12 小时 ✓' : f1(Math.min(12, u2)) + ' 小时');
      race[1].set(Math.min(1, u2 / 84) * 220, f1(Math.min(84, u2) / 24) + ' 天');
      clk.textContent = '过了 ' + f1(Math.min(84, u2) / 24) + ' 天';
      var u3 = since(t, clock, 7.0) % 5;
      stepsRow.forEach(function (r, q2) {
        /* 第 q2 + 1 千步：前 4000 步线性升高，之后按 1/√step 降 */
        var h = 62 * (q2 < 4 ? (q2 + 1) / 4 : Math.sqrt(4 / (q2 + 1)));
        r.setAttribute('y', (234 - h).toFixed(1)); r.setAttribute('height', h.toFixed(1));
        setOpacity(r, u3 > q2 * 0.35 ? 1 : 0.1);
      });
      var lk = Math.floor(now / 0.8);
      leave.cells.forEach(function (c, q2) { c.style.opacity = rnd(q2 + 40 * lk, 3) < 0.1 ? 0.12 : 0.9; });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 15: 成绩：翻得更好，花得更少（表二） ── */
  var COST_SHARE = [
    ['小模型（这篇）', 3.3e18, true], ['ConvS2S', 9.6e18], ['MoE', 2.0e19], ['GNMT + RL', 2.3e19], ['大模型（这篇）', 2.3e19, true], ['ConvS2S 集成', 7.7e19], ['GNMT + RL 集成', 1.8e20]
  ];
  function buildSceneTable2() {
    var s = sceneSvg('左边是表 2 英译德的七根横条，条从 23 分画起，两根 Transformer 的条是蓝色，竖虚线是以前最好的 26.36；右边依次出现：分数怎么来；' +
      '大模型比以前最好高出 2 分以上；训练花的力气按「几份」画的条；英译法的两根条；计算量是怎么估出来的');
    s.appendChild(svgText(24, 26, '论文表二：英译德的翻译成绩', 'demo-x-ink2', 13.5));
    var LX = 24, LW = 120, BW = 230, B0 = 23, B1 = 29;
    function bx(v) { return LX + LW + (v - B0) / (B1 - B0) * BW; }
    var ZH = ['GNMT + RL', 'ConvS2S', 'MoE', 'GNMT + RL 集成', 'ConvS2S 集成', '小模型（这篇）', '大模型（这篇）'];
    /* 虚线只画在两行之间的空隙里：不从条和 26.03 这些读数上穿过 */
    for (var g2 = 0; g2 <= 7; g2++) hline(s, bx(26.36), g2 ? 56 + g2 * 38 - 13 : 48, bx(26.36), 56 + g2 * 38 - 1, C_WARN, 1.4, '4 3');
    var bars = TABLE2.map(function (r, i) { return { r: r, b: barRowAt(s, LX, 56 + i * 38, LW, ZH[i], r.ours ? C_ACCENT : C_MUTED, 24, 12) }; });
    label(s, bx(26.36), 342, '以前最好 26.36', 'demo-x-ink2', 11, 'middle');
    [23, 25, 27, 29].forEach(function (v) { label(s, bx(v), 362, String(v), 'demo-x-mut', 10.5, 'middle'); });
    label(s, 24, 388, '「集成」是把好几个模型的答案合起来', 'demo-x-mut', 11);
    /* 第 1 段 */
    var p1 = group(s);
    label(p1, R, 64, '这个分数怎么来', 'demo-x-ink', 14);
    label(p1, R, 96, '数机器译文和人工参考译文里，', 'demo-x-ink2', 12);
    label(p1, R, 118, '相同的词和词组越多，分越高（BLEU）', 'demo-x-ink2', 12);
    var mt = ['Die', 'Katze', 'sitzt', 'auf', 'der', 'Matte'], hu = ['Die', 'Katze', 'saß', 'auf', 'der', 'Matte'];
    var mtC = mt.map(function (w, j) { return chip(p1, R + j * 58, 140, 52, w, C_Q, { size: 11.5 }); });
    hu.forEach(function (w, j) { chip(p1, R + j * 58, 180, 52, w, C_V, { size: 11.5 }); });
    readHint(p1, R, 240, '横条**越长越好**；条从 23 分画起', 12);
    label(p1, R, 264, '蓝色两根是 Transformer，灰色是以前的模型', 'demo-x-ink2', 12);
    /* 第 2 段 */
    var p2 = group(s);
    label(p2, R, 64, '大模型 28.4 分', 'demo-x-ink', 14);
    var gap = tone(p2, R, 100, '', C_ACCENT, 14);
    label(p2, R, 130, '以前最好的是好几个模型合起来的 26.36', 'demo-x-ink2', 12);
    label(p2, R, 154, '小模型 27.3，也超过了以前所有的', 'demo-x-ink2', 12);
    /* 第 3 段：花的力气 */
    var p3 = group(s);
    label(p3, R, 64, '训练花了多少力气', 'demo-x-ink', 14);
    readHint(p3, R, 88, '以小模型为 1 份，**越短越省**', 11.5);
    var cb = COST_SHARE.map(function (c, i) { return { c: c, b: barRowAt(p3, R, 100 + i * 24, 120, c[0], c[2] ? C_ACCENT : C_MUTED, 16, 11) }; });
    label(p3, R, 282, '每往右一大格，就多 10 倍（按倍数画）', 'demo-x-mut', 11);
    /* 第 4 段：英译法 */
    var p4 = group(s);
    label(p4, R, 64, '英译法也一样：41.8 分', 'demo-x-ink', 14);
    var frb = [barRowAt(p4, R, 88, 120, 'ConvS2S 集成', C_MUTED, 20, 12), barRowAt(p4, R, 118, 120, '大模型（这篇）', C_ACCENT, 20, 12)];
    label(p4, R, 172, '一个模型，就超过了以前合起来的', 'demo-x-ink2', 12);
    label(p4, R, 196, '（正文有一处写成 41.0，本站按表取 41.8）', 'demo-x-mut', 11);
    label(p4, R, 220, '条从 38 分画起', 'demo-x-mut', 11);
    /* 第 5 段：怎么估的 */
    var p5 = group(s);
    label(p5, R, 64, '「力气」是估出来的', 'demo-x-ink', 14);
    var mul = [['练的时间', '12 小时'], ['显卡数量', '8 张'], ['每张卡的速度', '每秒 9.5 万亿次']].map(function (m, j) {
      chip(p5, R, 92 + j * 46, 130, m[0], C_ACCENT, { size: 12 });
      return label(p5, R + 146, 111 + j * 46, m[1], 'demo-x-ink', 12.5);
    });
    label(p5, R, 252, '三样乘起来，就是小模型那 1 份', 'demo-x-ink2', 12);
    label(p5, R, 276, '不是实际测的（我们验算过，对得上）', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var u = seg(t, 0.4, 2.4);
      bars.forEach(function (b) { b.b.set((b.r.de - B0) / (B1 - B0) * BW * u, u > 0.95 ? String(b.r.de) : ''); });
      bars.forEach(function (b) { b.b.bar.style.opacity = (winK(t, 1) > 0.5 && b.r.ours) || winK(t, 1) < 0.5 ? 0.9 : 0.35; });
      mtC.forEach(function (c, j) { c.box.style.stroke = j === 2 ? C_RNN : C_GOOD; c.box.style.strokeWidth = (1.3 + 1.2 * Math.abs(Math.sin(now * 2 + j))).toFixed(2); });
      var u2 = seg(since(t, clock, 3.6), 0.3, 1.6);
      gap.textContent = '比以前最好高出 ' + f2((28.4 - 26.36) * u2) + ' 分';
      var u3 = seg(since(t, clock, 7.0), 0.3, 1.8);
      cb.forEach(function (c) { var share = c.c[1] / 3.3e18, L = Math.log10(share); c.b.set((0.15 + L / 1.8) * 120 * u3, u3 > 0.95 ? (share < 1.5 ? '1 份' : '约 ' + Math.round(share) + ' 份') : ''); });
      var u4 = seg(since(t, clock, 10.4), 0.3, 1.6);
      frb[0].set((41.29 - 38) / 4 * 190 * u4, f2(38 + 3.29 * u4)); frb[1].set((41.8 - 38) / 4 * 190 * u4, f1(38 + 3.8 * u4));
      var u5 = since(t, clock, 13.4);
      mul.forEach(function (m, j) { setOpacity(m, seg(u5, 0.4 + j * 0.7, 0.8 + j * 0.7)); });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 16: 拆零件试试（表三、表四） ── */
  var TABLE3_PLAIN = [
    { g: 'C', zh: '只有 2 层', bleu: 23.7 }, { g: 'C', zh: '4 层', bleu: 25.3 }, { g: 'C', zh: '8 层', bleu: 25.5 },
    { g: 'C', zh: '档案更短（256）', bleu: 24.5 }, { g: 'C', zh: '档案更长（1024）', bleu: 26.0 },
    { g: 'C', zh: '小网络更窄', bleu: 25.4 }, { g: 'C', zh: '小网络更宽', bleu: 26.2 },
    { g: 'D', zh: '不请假', bleu: 24.6 }, { g: 'D', zh: '请假 20%', bleu: 25.5 },
    { g: 'E', zh: '自己学的钟', bleu: 25.7 },
    { g: 'big', zh: '大模型', bleu: 26.4 }
  ];
  function buildSceneTable3() {
    var s = sceneSvg('左边是表 3 的十一根横条，条从 23 分画起，竖虚线是原版的 25.8，讲到哪一组就亮哪一组；右边依次出现：读法和图例；模型越大越好；随机请假很有用；' +
      '钟换成自己学的；表 4 换一个任务的四根条');
    s.appendChild(svgText(24, 26, '论文表三：每次只改一样，看分数怎么变', 'demo-x-ink2', 13.5));
    var LX = 24, LW = 130, BW = 210, B0 = 23, B1 = 27;
    function bx(v) { return LX + LW + (v - B0) / (B1 - B0) * BW; }
    var GC = { C: C_ACCENT, D: C_WARN, E: C_V, big: C_ROBOT };
    /* 虚线只画在两行之间的空隙里：不从 25.5 这些读数上穿过 */
    for (var g3 = 0; g3 <= 11; g3++) hline(s, bx(BASE_DEV), g3 ? 46 + g3 * 27 - 8 : 40, bx(BASE_DEV), 46 + g3 * 27 - 1, C_INK, 1.4, '3 2');
    var rows = TABLE3_PLAIN.map(function (r, i) { return { r: r, b: barRowAt(s, LX, 46 + i * 27, LW, r.zh, GC[r.g], 18, 11.5) }; });
    label(s, bx(BASE_DEV), 46 + 11 * 27 + 16, '原版 25.8', 'demo-x-ink2', 11, 'middle');
    [23, 25, 27].forEach(function (v) { label(s, bx(v), 46 + 11 * 27 + 34, String(v), 'demo-x-mut', 10.5, 'middle'); });
    /* 第 1 段 */
    var p1 = group(s);
    label(p1, R, 64, '拆零件试试：每次只改一样', 'demo-x-ink', 14);
    readHint(p1, R, 92, '翻译得分，**越长越好**', 12);
    label(p1, R, 120, '竖虚线是原版的 25.8：越过它就是变好', 'demo-x-ink2', 12);
    label(p1, R, 144, '这里换了一套考题，分数不能和表二直接比', 'demo-x-ink2', 12);
    legendRow(p1, R, 178, [['大小', C_ACCENT], ['请假', C_WARN], ['钟', C_V], ['大模型', C_ROBOT]], 11.5);
    /* 第 2 段 */
    var p2 = group(s);
    label(p2, R, 64, '模型越大，越好', 'demo-x-ink', 14);
    label(p2, R, 96, '只有 2 层：23.7 分', 'demo-x-ink2', 12);
    label(p2, R, 120, '档案更长、小网络更宽：26.0、26.2', 'demo-x-ink2', 12);
    label(p2, R, 144, '大模型：26.4 分', 'demo-x-ink2', 12);
    label(p2, R, 176, '论文的话：和预期一样', 'demo-x-mut', 11.5);
    /* 第 3 段 */
    var p3 = group(s);
    label(p3, R, 64, '随机请假很有用', 'demo-x-ink', 14);
    label(p3, R, 96, '不请假：掉到 24.6，少了 1.2 分', 'demo-x-ink2', 12);
    label(p3, R, 120, '论文：它很能防止过拟合（死记硬背）', 'demo-x-ink2', 12);
    var lv = cellGrid(p3, R, 140, 20, 10, 22, 6, C_WARN);
    /* 第 4 段 */
    var p4 = group(s);
    label(p4, R, 64, '钟换成自己学的：差不多', 'demo-x-ink', 14);
    label(p4, R, 96, '自己学的钟 25.7，原版的正弦钟 25.8', 'demo-x-ink2', 12);
    label(p4, R, 120, '用哪一种钟，影响不大', 'demo-x-ink2', 12);
    /* 第 5 段：表四 */
    var p5 = group(s);
    label(p5, R, 64, '论文表四：换个任务也能用', 'demo-x-ink', 14);
    label(p5, R, 92, '任务：分析英文句子的结构', 'demo-x-ink2', 12);
    readHint(p5, R, 116, '得分**越长越好**；条从 90 分画起', 11);
    var T4 = [['这篇：练 4 万句', 91.3, true], ['以前的方法：4 万句', 91.7], ['这篇：再加 1700 万句', 92.7, true], ['以前最好的一种', 93.3]];
    var pb = T4.map(function (r, i) { return { r: r, b: barRowAt(p5, R, 128 + i * 28, 150, r[0], r[2] ? C_ACCENT : C_MUTED, 18, 11.5) }; });
    label(p5, R, 254, '几乎没有专门调，也接近最好的方法', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var u = seg(t, 0.4, 2.2);
      var on = [null, 'C', 'D', 'E', null], k = 0;
      [0, 1, 2, 3, 4].forEach(function (j) { if (winK(t, j) > 0.5) k = j; });
      rows.forEach(function (r) {
        r.b.set((r.r.bleu - B0) / (B1 - B0) * BW * u, u > 0.95 ? f1(r.r.bleu) : '');
        var lit = !on[k] || r.r.g === on[k] || (k === 1 && r.r.g === 'big');
        r.b.bar.style.opacity = lit ? 0.9 : 0.25;
      });
      var lk = Math.floor(now / 0.8);
      lv.cells.forEach(function (c, q) { c.style.opacity = rnd(q + 20 * lk, 3) < 0.2 ? 0.12 : 0.9; });
      var u5 = seg(since(t, clock, 13.4), 0.3, 1.8);
      pb.forEach(function (p) { p.b.set((p.r[1] - 90) / 3.5 * 140 * u5, u5 > 0.95 ? String(p.r[1]) : ''); });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 17: 局限，以及机器人怎么接着用 ── */
  function buildSceneLimits() {
    var s = sceneSvg('左边是第 014 期真实世界人形行走图 8A 的读图柱：同一个行走任务只换大脑，Transformer、LSTM、TCN、MLP 的成功率，旁边是 Digit；' +
      '右边依次出现：人数翻倍对数翻四倍的格子；一个一个写的格子；三处作者的猜测；机器人这边的证据；同一个零件装进三台机器人');
    s.appendChild(svgText(24, 26, '这篇没有机器人实验；证据在第 14 期', 'demo-x-ink2', 13.5));
    robotImg(s, 'digit', 20, 70, 200);
    var fb = RH_FIG8A.map(function (r, i) { return barRowAt(s, 120, 96 + i * 44, 84, r[0], i ? C_MUTED : C_ROBOT, 26, 12.5); });
    readHint(s, 128, 76, '走成功的比例，**越长越好**', 11.5);
    label(s, 24, 318, '第 14 期论文图 8A（我们读的图）：同一任务只换大脑，', 'demo-x-mut', 11);
    label(s, 24, 338, '3 个场景共 30 次；那篇的结果，不是这篇的', 'demo-x-mut', 11);
    /* 第 1 段 */
    var p1 = group(s);
    label(p1, R, 64, '局限一：人一多，要聊的对数暴涨', 'demo-x-ink', 14);
    var grow = attnGrid(p1, R, 84, 16, 9, C_RNN);
    var gTxt = tone(p1, R + 160, 110, '', C_RNN, 13);
    label(p1, R + 160, 140, '人数翻一倍，对数变四倍', 'demo-x-ink2', 12);
    label(p1, R, 252, '图片、声音、视频切出来的卡片很多，会很贵', 'demo-x-ink2', 12);
    label(p1, R, 276, '论文想过：只和邻座聊', 'demo-x-ink2', 12);
    /* 第 2 段 */
    var p2 = group(s);
    label(p2, R, 64, '局限二：写的时候，还是一个一个来', 'demo-x-ink', 14);
    var gen = cellGrid(p2, R, 96, 12, 12, 22, 4, C_V);
    label(p2, R, 156, '训练能一起改，用起来还得一个一个写', 'demo-x-ink2', 12);
    label(p2, R, 180, '论文把这一条列为下一步的目标', 'demo-x-ink2', 12);
    /* 第 3 段 */
    var p3 = group(s);
    label(p3, R, 64, '局限三：几处理由，是作者的猜测', 'demo-x-ink', 14);
    [['分数除以 8', '猜：不缩小，梯度会极小'], ['正弦当钟', '猜：更能用在长句子上'], ['评委在找「它」', '论文只给了几个例子']].forEach(function (c, i) {
      var y = 84 + i * 50;
      rectBox(p3, R, y, W, 42, C_BORDER, C_SURFACE);
      label(p3, R + 12, y + 26, c[0], 'demo-x-ink', 12.5);
      label(p3, R + 150, y + 26, c[1], 'demo-x-ink2', 11.5);
    });
    label(p3, R, 252, '这篇论文里都没有专门的实验来证明', 'demo-x-mut', 11.5);
    /* 第 4 段 */
    var p4 = group(s);
    label(p4, R, 64, '机器人这边的证据：第 14 期', 'demo-x-ink', 14);
    label(p4, R, 96, '同一个行走任务，只换大脑（读图）：', 'demo-x-ink2', 12);
    label(p4, R, 120, 'Transformer 约 97%，MLP 约 75%', 'demo-x-ink2', 12);
    label(p4, R, 152, '那篇的理由：数据和算力越多越好用，', 'demo-x-ink2', 12);
    label(p4, R, 174, '也方便接进更多种输入', 'demo-x-ink2', 12);
    /* 第 5 段：同一个零件，装进不同的机器人 */
    var p5 = group(s);
    label(p5, R, 64, '同一个零件，装进不同的机器人', 'demo-x-ink', 14);
    var rb = [['digit', 130, '行走'], ['ur5', 64, '机械臂'], ['g1', 130, '人形（示意）']].map(function (r, j) {
      var im = robotImg(p5, r[0], R + 10 + j * 118, 250 - r[1], r[1]);
      label(p5, R + 10 + j * 118 + im.w / 2, 272, r[2], 'demo-x-ink2', 12, 'middle');
      return chip(p5, R + j * 118, 86, 104, 'Transformer', C_ACCENT, { size: 11.5, h: 24 });
    });
    label(p5, R, 300, '换的是卡片和输出；中间的零件，来自这篇论文', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var u = seg(t, 0.4, 2.2);
      fb.forEach(function (b, i) { b.set(RH_FIG8A[i][1] / 100 * 150 * u, u > 0.95 ? '约 ' + RH_FIG8A[i][1] + '%' : ''); });
      var lv = Math.floor(since(t, clock, 0.4) / 1.3) % 3, n = [4, 8, 16][lv];
      grow.set(function (i, j) { return { a: i < n && j < n ? 0.75 : 0.05 }; });
      gTxt.textContent = n + ' 个人 → ' + n * n + ' 对';
      gen.fill(1 + Math.floor(since(t, clock, 3.6) * 2) % 12);
      var u5 = since(t, clock, 13.4);
      rb.forEach(function (c, j) { var dv = clamp(1 - (u5 - 0.4 - j * 0.6) / 0.6, 0, 1); moveG(c, 0, -10 * dv); setOpacity(c, 1 - dv); });
      void now;
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }
  var TF_SCENES = [
    { title: '一篇研究「翻译」的论文', dur: 16, build: buildSceneWhy, cues: [
      { at: 0.4, s: '这是一篇**研究翻译**的论文：教电脑把英文自动翻成德文。' },
      { at: 3.6, s: '它造的零件叫 Transformer：进去的换成观测、出来的换成动作，就能用在机器人上。' },
      { at: 7.0, s: '第 14 期的 Digit：大脑就是一个 Transformer，看最近 16 步，决定下一步。' },
      { at: 10.4, s: '前面见过它：第 10 期扩散策略有 Transformer 版，第 28 期 MaskedMimic 用它的「遮挡」。' },
      { at: 13.4, s: '三站：老办法为什么慢 → 注意力怎么算 → 成绩和机器人怎么用。' }
    ] },
    { title: '传话游戏：老办法为什么慢', dur: 16, build: buildSceneSerial, cues: [
      { at: 0.4, s: '老办法（循环网络）像传话游戏：第 $t$ 步要等前一步传完才能开始。' },
      { at: 3.6, s: '人越多越慢：6 个人传 6 次，16 个人传 16 次。' },
      { at: 7.0, s: '传得越远越走样：论文说，路越长，前后的联系越难学。' },
      { at: 10.4, s: '卷积只能和邻座说话：论文说要叠很多层，两头才连得上。' },
      { at: 13.4, s: 'Transformer 不传话，直接开会：一轮就完，话一手就到。' }
    ] },
    { title: '开会的代价：论文表一', dur: 16, build: buildSceneTable1, cues: [
      { at: 0.4, s: '论文表一比三件事：要等几轮、话转几手、一共聊多少；前两件开会赢。' },
      { at: 3.6, s: '人不多时开会反而省：Digit 16 步，粗算省约 12 倍（我们的估算）。' },
      { at: 7.0, s: '代价是平方：人数翻一倍，要聊的对数翻四倍。' },
      { at: 10.4, s: '人太多时，可以只和邻座聊；论文把它留给以后研究。' },
      { at: 13.4, s: '开会快、话不走样；代价是人一多就很贵。' }
    ] },
    { title: '先把输入切成一张张卡片', dur: 16, build: buildSceneToken, cues: [
      { at: 0.4, s: 'Transformer 只吃一种东西：一串卡片（token）；不常见的词切成几块。' },
      { at: 3.6, s: '每张卡片换成一串数字，像档案；这串数字是训练时学出来的。' },
      { at: 7.0, s: '机器人：每 0.02 秒看到的，加上一步动作，压成一张卡片；Digit 留 16 张。' },
      { at: 10.4, s: '图片也能切：ViT 把一张图切成 196 块，一块一张卡片。' },
      { at: 13.4, s: '只要卡片一样长，就能送进同样的零件（我们的看法）。' }
    ] },
    { title: 'Q、K、V：像去图书馆查资料', dur: 16, build: buildSceneQKV, cues: [
      { at: 0.4, s: '注意力像查资料：拿着问题 Q，对着标签 K 找，再抄下内容 V。' },
      { at: 3.6, s: '打个比方：Q 是这一步想知道什么，K 和 V 是过去每一步的标签和内容。' },
      { at: 7.0, s: '三样都从同一张卡片抄出来，「抄写规则」是训练学出来的。' },
      { at: 10.4, s: '标签越像问题，抄得越多；不像的几乎不抄。' },
      { at: 13.4, s: '每一步拿着自己的问题，同时去查：一次算完，不用排队。' }
    ] },
    { title: '手算一次：打分、分比例、混合', dur: 16, build: buildSceneAttention, cues: [
      { at: 0.4, s: '只有三步：打分、分比例、按比例混合；数字是编的小例子。' },
      { at: 3.6, s: '打分：对应位置相乘再相加，三步得 **1 / 2 / 1** 分。' },
      { at: 7.0, s: '先缩小一半，再换成比例：**27% / 45% / 27%**，像按票数分披萨。' },
      { at: 10.4, s: '按比例混合三份内容：结果 $[0.548,\\ 0.726]$，第 $t-1$ 步分得最多。' },
      { at: 13.4, s: '一句话：谁和我像，就多听谁的。' }
    ] },
    { title: '为什么要先把分数缩小', dur: 16, build: buildSceneScale, cues: [
      { at: 0.4, s: '比的数字越多，分数差得越大：论文每次比 64 个数字。' },
      { at: 3.6, s: '分差太大：最高分拿走 **99.7%**，盖过全场。' },
      { at: 7.0, s: '还学不动：按这组分数算，信号只剩 0.0028，差了约 89 倍。' },
      { at: 10.4, s: '办法：分数先除以 $\\sqrt{64} = 8$，像把音量关小，比例回到 51%。' },
      { at: 13.4, s: '论文说这是作者的猜测；Digit 的论文写的也是这条公式。' }
    ] },
    { title: '多头：请 8 个评委', dur: 16, build: buildSceneHeads, cues: [
      { at: 0.4, s: '只请一个评委：既要看近处又要看开头，只好平均成一团。' },
      { at: 3.6, s: '请 8 个评委：每人只管一件事，各打各的分，最后合起来。' },
      { at: 7.0, s: '工作量不变：512 个数字，拆成 8 份 × 64 个。' },
      { at: 10.4, s: '论文表三：1 个评委 24.9 分，8 个 25.8，32 个反而掉到 25.4。' },
      { at: 13.4, s: '论文附录里，有个评委看起来在找「它」指谁；Digit 用了 4 个评委。' }
    ] },
    { title: '位置编码：给卡片装一只钟', dur: 16, build: buildScenePE, cues: [
      { at: 0.4, s: '论文：没有循环和卷积，要另外告诉它位置。' },
      { at: 3.6, s: '所以要给每张卡片写上「第几步」：装一只钟。' },
      { at: 7.0, s: '快针分清相邻两步，慢针分清远近；几根一起看，每一步都不一样。' },
      { at: 10.4, s: '论文用快慢不同的正弦波当指针；换成自己学的，25.7 对 25.8。' },
      { at: 13.4, s: '机器人里：Digit 给 16 步标上第几步，扩散策略标上去噪到第几步。' }
    ] },
    { title: '一层里有什么', dur: 16, build: buildSceneBlock, cues: [
      { at: 0.4, s: '一层有四个动作，第一个是**讨论**：每张卡片向别人要信息。' },
      { at: 3.6, s: '第二个是**各自想**：每张卡片单独过小网络。' },
      { at: 7.0, s: '第三个是**保留原稿**：新想法只是加上去，原稿一直都在。' },
      { at: 10.4, s: '第四个是**调音量**：把每张卡片的数字拉回差不多的范围。' },
      { at: 13.4, s: '这样的一层叠 6 次；论文约 6500 万个要学的数，Digit 只有约 140 万。' }
    ] },
    { title: '因果掩码：不许剧透', dur: 16, build: buildSceneMask, cues: [
      { at: 0.4, s: '像追连续剧：讲第 3 集时，只能用前 3 集的内容，不许剧透。' },
      { at: 3.6, s: '把未来的格子盖住，分到的比例变成 0：6 步只剩 21 / 36 对。' },
      { at: 7.0, s: '机器人上场时本来就看不到未来：只能根据刚才发生的，决定下一步。' },
      { at: 10.4, s: 'Digit 的 16 张卡片只看过去：留下 136 / 256 对。' },
      { at: 13.4, s: '第 28 期 MaskedMimic 用同样的遮挡：盖住没提供的目标。' }
    ] },
    { title: '交叉注意力：回头看原文', dur: 16, build: buildSceneCross, cues: [
      { at: 0.4, s: '就像人翻译时，写一个德文词，回头看一眼英文原句。' },
      { at: 3.6, s: '提问的在德文这边，标签和内容在英文那边：这叫交叉注意力。' },
      { at: 7.0, s: '两串卡片可以不一样长：每张德文卡片都能看全部英文卡片。' },
      { at: 10.4, s: '第 10 期扩散策略的 Transformer 版：动作一边去噪，一边回头看观测。' },
      { at: 13.4, s: '自己和自己开会、回头问另一组人：一个 Transformer 里两种都有。' }
    ] },
    { title: '训练一起改，使用一个个写', dur: 16, build: buildSceneDecode, cues: [
      { at: 0.4, s: '训练像批改作业：答案都在，配上「不许偷看」，整句一次改完。' },
      { at: 3.6, s: '用的时候像写作文：写一个字，读一遍前面写的，再写下一个。' },
      { at: 7.0, s: '机器人每 0.02 秒写一个动作，写好的再接回去当输入。' },
      { at: 10.4, s: '一个一个写：写 50 个，就要算 50 次。' },
      { at: 13.4, s: '论文的下一步：生成不再「一个一个来」。' }
    ] },
    { title: '怎么训练：先热身', dur: 16, build: buildSceneRecipe, cues: [
      { at: 0.4, s: '练习题：英译德 450 万对，英译法 3600 万对。' },
      { at: 3.6, s: '一台电脑 8 张显卡：小模型练 12 小时，大模型练 3 天半。' },
      { at: 7.0, s: '步子先热身：前 4000 步慢慢加大，之后慢慢变小（论文没写原因）。' },
      { at: 10.4, s: '随机请假：训练时每次让 10% 的数字休息（dropout）。' },
      { at: 13.4, s: '第 10 期扩散策略也先热身：500 步，Transformer 版 1000 步。' }
    ] },
    { title: '表二：翻得更好，花得更少', dur: 16, build: buildSceneTable2, cues: [
      { at: 0.4, s: '翻译得分（BLEU）：和人工译文相同的词、词组越多，分越高。' },
      { at: 3.6, s: '大模型 **28.4** 分，比以前最好的高 2 分以上；小模型 27.3 也超过了。' },
      { at: 7.0, s: '花的力气：以小模型为 1 份，以前的模型约 3 到 55 份（我们按表算）。' },
      { at: 10.4, s: '英译法也一样：大模型 41.8 分，一个模型超过了以前合起来的。' },
      { at: 13.4, s: '力气是估出来的：练的时间 × 显卡数量 × 每张卡的速度。' }
    ] },
    { title: '表三：拆零件试试', dur: 16, build: buildSceneTable3, cues: [
      { at: 0.4, s: '表三：每次只改一样；越过虚线（原版 25.8）就是变好。' },
      { at: 3.6, s: '越大越好：2 层 23.7 分，大模型 26.4 分。' },
      { at: 7.0, s: '随机请假很有用：不请假，分数掉到 24.6。' },
      { at: 10.4, s: '钟换成自己学的：25.7 对 25.8，差不多。' },
      { at: 13.4, s: '表四换个任务（分析句子结构）：几乎不调，92.7 分，表里最高 93.3。' }
    ] },
    { title: '局限，和机器人怎么接着用', dur: 16, build: buildSceneLimits, cues: [
      { at: 0.4, s: '局限一：人一多，要聊的对数暴涨；图片、视频切出的卡片很多。' },
      { at: 3.6, s: '局限二：训练一起改，用的时候一个一个写。' },
      { at: 7.0, s: '局限三：除以 8、用正弦，理由都是作者猜的。' },
      { at: 10.4, s: '证据在第 14 期：同一个行走任务，Transformer 约 97%，MLP 约 75%。' },
      { at: 13.4, s: '这篇没有机器人实验；它造的零件，后来装进了机器人的大脑。' }
    ] }
  ];
  /* 要点里数字和单位之间用不换行空格（公式里不动），免得单位单独落到下一行开头（HOMIE 2026-10-21） */
  function nb(str) {
    return str.split(/(\$[^$]*\$)/).map(function (p, i) { return i % 2 ? p : p.replace(/(\d)(\*\*)? (?=[^\s\d+\-−→×<>=\/·（(])/g, '$1$2 ').replace(/(\d)–(\d)/g, '$1–⁠$2'); }).join('');
  }
  TF_SCENES.forEach(function (sc) { sc.cues.forEach(function (c) { c.s = nb(c.s); }); });

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十七幕动画：从机器人的角度读 Transformer',
      sub: '约 272 秒自动播放。空格播放/暂停，← → 换幕；写给第一次接触的人：用传话、开会、查资料、评委、钟这些比喻讲，再对照机器人怎么用同一块零件。手算例子与笔记「🚶 具体实例」用的是同一组数字。',
      ariaLabel: 'Transformer 十七幕讲解动画',
      notes: [
        '取数依据：表 1–4、式 1–3 和 §3、§5、§6 的数字照抄 arXiv 1706.03762 v7（读的是 arXiv 上的 LaTeX 源码）；论文首页写明，注明出处后允许在学术作品里复制它的图表，第 8 幕的附录图就是源文件里的原图。',
        '这一版按看片反馈改写：观众只看过前面几期，所以少用专业名词，多用比喻（传话游戏、开会、查资料、评委、钟、连续剧、批改作业）和小例子；比喻只帮助理解，**不是论文的说法**。',
        '机器人那一侧的数字都对照了各自的原论文，**不是这篇论文的内容**：Digit（Radosavovic 等，arXiv 2303.03381 v2：16 步、4 个头、1.4M 参数、50 Hz；图 8A 的条高是我们量的）、扩散策略（Chi 等，arXiv 2303.04137 v5 §3.1、附录 A.4）、MaskedMimic（Tessler 等，arXiv 2409.14393 §6.5、§7.2）、ViT（arXiv 2010.11929）、ResNet（arXiv 1512.03385）、dropout（Srivastava 等 2014）、BLEU（Papineni 等 2002）。Digit 每头 48 个数字、每步 20 毫秒、第 3 幕的「省约 12 倍」是我们按论文的数算的；第 6 幕的向量、第 7 幕的分数、第 8 幕各评委看哪一步都是**玩具**。第 1、11 幕的视频剪自第 014 期论文的项目页，第 2、4、8 幕格子里的 G1 借第 032 期 HOMIE 的回放贴图，都只作示意。'
      ],
      scenes: TF_SCENES
    });
  }

  // ─── the narrated vertical video of the same seventeen scenes ──────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：从机器人的角度读 Transformer',
      sub: '15 分 43 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十七幕动画，旁白用同样的比喻把每一幕讲细；适合手机上看或转发。',
      size: '17.6 MB',
      fileName: 'Transformer_讲解视频.mp4'
    });
  }

  // ─── 演示 1：注意力计算器 ───────────────────────────────────────────────
  function buildAttentionDemo(host) {
    var root = card(host, {
      title: '注意力计算器：机器人最近 3 步',
      sub: '选哪一步当 query，开关 $\\sqrt{d_k}$ 缩放和因果掩码，再把 query 放大几倍，看三步各拿走多少权重、输出落在哪。默认设置就是「🚶 具体实例」例 1。'
    });
    var state = { qi: 2, scale: true, mask: false, c: 1 };
    var row = controlsRow(root);
    buttonGroup(row, { label: '哪一步当 query', items: STEPS.map(function (s, i) { return { label: s, value: i }; }), value: 2, onPick: function (v) { state.qi = v; render(); } });
    var row2 = controlsRow(root);
    checkbox(row2, '除以 $\\sqrt{d_k}=2$', true, function (v) { state.scale = v; render(); });
    checkbox(row2, '因果掩码（只看自己和之前）', false, function (v) { state.mask = v; render(); });
    slider(row2, { label: 'query 放大 $c$ 倍', min: 1, max: 6, step: 0.5, value: 1, format: function (v) { return f1(v) + ' 倍'; }, onInput: function (v) { state.c = v; render(); } });
    var stats = statsRow(root);
    var sOut = stats.add('输出'), sMax = stats.add('拿得最多的一步'), sKeys = stats.add('能看的 key');
    var tb = table(root);
    var st = stage(root, 240);
    var verdict = verdictBox(root);
    note(root, [
      '向量是笔记构造的玩具数：key、value、三个 query 都是编的，只演示机制，不对应哪台机器人的真实观测。真实模型里 $q$、$k$、$v$ 都是 token 乘可学习矩阵得到的。',
      'query 放大 $c$ 倍，相当于点积放大 $c$ 倍：分数差距变大，softmax 越来越像只挑一个——这就是第 7 幕「不缩放会饱和」的同一件事。'
    ]);
    function compute() {
      var q = QUERIES[state.qi].map(function (x) { return x * state.c; });
      var allowed = ATT.keys.map(function (k, j) { return !state.mask || j <= state.qi; });
      var raw = ATT.keys.map(function (k) { return dotv(q, k); });
      var sc = raw.map(function (r) { return state.scale ? r / Math.sqrt(ATT.dk) : r; });
      var logits = sc.map(function (v, j) { return allowed[j] ? v : -Infinity; });
      var m = Math.max.apply(null, logits.filter(function (x) { return isFinite(x); }));
      var e = logits.map(function (v) { return isFinite(v) ? Math.exp(v - m) : 0; });
      var sum = e.reduce(function (a, b) { return a + b; }, 0);
      var w = e.map(function (v) { return v / sum; });
      var out = [0, 1].map(function (d) { return w.reduce(function (a, wi, j) { return a + wi * ATT.vals[j][d]; }, 0); });
      return { q: q, allowed: allowed, raw: raw, sc: sc, w: w, out: out };
    }
    function render() {
      var r = compute();
      tb.clear();
      tb.row(['这一步', 'key', 'value', '$q\\cdot k$', state.scale ? '÷ 2' : '不缩放', '权重'], true);
      STEPS.forEach(function (s, j) {
        tb.row([s, '[' + ATT.keys[j].join(', ') + ']', '[' + ATT.vals[j].join(', ') + ']', r.allowed[j] ? f1(r.raw[j]) : '被掩码', r.allowed[j] ? f2(r.sc[j]) : '$-\\infty$', f3(r.w[j])]);
      });
      sOut.set('[' + f3(r.out[0]) + ', ' + f3(r.out[1]) + ']');
      var best = r.w.indexOf(Math.max.apply(null, r.w));
      sMax.set(STEPS[best] + '（' + f3(r.w[best]) + '）', r.w[best] > 0.9 ? 'bad' : null);
      sKeys.set(r.allowed.filter(Boolean).length + ' / 3');
      var isDefault = state.qi === 2 && state.scale && !state.mask && state.c === 1;
      if (isDefault) verdict.set('这就是例 1：点积 1 / 2 / 1，除以 2 后 softmax 得 **0.274 / 0.452 / 0.274**，输出 $[0.548,\\ 0.726]$。', 'good');
      else if (r.w[best] > 0.9) verdict.set('最大的一项拿走了 ' + f3(r.w[best]) + '：softmax 快变成「只挑一个」，其余几步的梯度会很小（第 7 幕）。', 'bad');
      else if (state.mask && state.qi < 2) verdict.set('因果掩码挡住了 ' + STEPS[state.qi] + ' 之后的步：被挡住的那几步权重为 0，剩下的重新加到 1。');
      else verdict.set('权重 ' + r.w.map(f3).join(' / ') + '：谁的 key 和 query 更像，谁拿得多。');
      draw(r);
    }
    function draw(r) {
      var g = begin(st), ctx = g.ctx, P = g.P;
      var col = [P.warn, P.warn, P.warn];
      var half = g.w < 520 ? g.w : g.w / 2;
      var p = plot({ w: half, h: g.h }, { l: 40, r: 16, t: 28, b: 36 }, [-0.5, 2.5], [0, 1]);
      axes(g, p, { yTicks: [0, 0.5, 1], yFmt: function (v) { return f1(v); } });
      text(ctx, '每一步拿到的权重', p.x0, 14, P.muted, 'left');
      STEPS.forEach(function (s, j) {
        var x = p.sx(j), y = p.sy(r.w[j]);
        ctx.fillStyle = r.allowed[j] ? P.good : P.border;
        ctx.fillRect(x - 22, y, 44, p.y0 - y);
        text(ctx, s, x, p.y0 + 14, P.text, 'center');
        if (r.allowed[j]) text(ctx, f3(r.w[j]), x, y - 9, P.text, 'center', '11px monospace');
        else text(ctx, '掩码', x, p.y0 - 12, P.muted, 'center');
      });
      void col;
      if (g.w >= 520) {
        var ox = half + 50, oy = g.h - 40, S = Math.min(g.h - 80, half - 100);
        line(ctx, [[ox - 10, oy], [ox + 1.3 * S, oy]], P.grid, 1);
        line(ctx, [[ox, oy + 10], [ox, oy - 1.3 * S]], P.grid, 1);
        text(ctx, 'value 平面：灰点是三步的 value，蓝点是输出', ox - 10, 14, P.muted, 'left');
        ATT.vals.forEach(function (v, j) { dot(ctx, ox + v[0] * S, oy - v[1] * S, 5, P.muted); text(ctx, STEPS[j], ox + v[0] * S + 8, oy - v[1] * S - 8, P.muted, 'left'); });
        dot(ctx, ox + r.out[0] * S, oy - r.out[1] * S, 7, P.accent);
      }
    }
    registerRenderer(render);
    render();
  }

  // ─── 演示 2：√d_k 实验 ──────────────────────────────────────────────────
  var DK_LIST = [4, 8, 16, 32, 48, 64, 128, 256, 512];
  function buildScaleDemo(host) {
    var root = card(host, {
      title: '$\\sqrt{d_k}$ 实验：维度越大，点积散得越开',
      sub: '每个维度抽 300 对分量独立、均值 0、方差 1 的随机向量（玩具），看点积的标准差、8 个 key 时 softmax 的最大权重和它的梯度 $p(1-p)$；开关缩放对比。'
    });
    var state = { k: 5, scale: false };
    var row = controlsRow(root);
    var sl = slider(row, { label: '每头维度 $d_k$', min: 0, max: DK_LIST.length - 1, step: 1, value: 5, format: function (v) { return String(DK_LIST[v]); }, onInput: function (v) { state.k = v; render(); } });
    checkbox(row, '除以 $\\sqrt{d_k}$', false, function (v) { state.scale = v; render(); });
    buttonGroup(row, { label: '对照', items: [{ label: 'Digit 每头 48', value: 4 }, { label: '论文 64', value: 5 }, { label: 'π₀ 每头 256', value: 7 }], value: 5, onPick: function (v) { state.k = v; sl.set(v, true); render(); } });
    var stats = statsRow(root);
    var sStd = stats.add('点积标准差'), sMax = stats.add('最大权重（平均）'), sGrad = stats.add('最大项梯度（平均）');
    var st = stage(root, 220);
    var verdict = verdictBox(root);
    note(root, ['随机向量是确定性的玩具样本，不是哪个模型训练中的真实 $q$、$k$；论文脚注 4 的结论是 $\\mathrm{Var}[q\\cdot k]=d_k$，标准差 $\\sqrt{d_k}$，这里的读数会在它附近抖动。', 'Digit 每头 192 / 4 = 48 维（第 014 期笔记），π₀ 的 Gemma 每头 256 维（openpi `gemma.py`）。']);
    var cache = {};
    function samples(dk) {
      if (!cache[dk]) cache[dk] = dotSamples(dk, 300, 13);
      return cache[dk];
    }
    function render() {
      var dk = DK_LIST[state.k], xs = samples(dk).map(function (x) { return state.scale ? x / Math.sqrt(dk) : x; });
      var sd = stdOf(xs);
      /* 8 个 key 一组：取 37 组的平均最大权重和梯度 */
      var mx = 0, gr = 0, n = 0;
      for (var i = 0; i + 8 <= xs.length; i += 8) {
        var p = softmax(xs.slice(i, i + 8)), b = Math.max.apply(null, p);
        mx += b; gr += b * (1 - b); n++;
      }
      mx /= n; gr /= n;
      sStd.set(f2(sd) + '（理论 ' + f2(state.scale ? 1 : Math.sqrt(dk)) + '）');
      sMax.set(f3(mx), mx > 0.9 ? 'bad' : null);
      sGrad.set(f4(gr), gr < 0.05 ? 'bad' : 'good');
      if (!state.scale && dk >= 48) verdict.set('不缩放、$d_k=' + dk + '$：标准差约 ' + f1(sd) + '，最大权重平均 ' + f3(mx) + '，softmax 几乎只挑一个，梯度只剩 ' + f4(gr) + '。', 'bad');
      else if (state.scale) verdict.set('除以 $\\sqrt{d_k}$ 后，不管 $d_k$ 多大，标准差都回到 1 左右，最大权重 ' + f3(mx) + '，梯度 ' + f4(gr) + ' 保住了。', 'good');
      else verdict.set('$d_k=' + dk + '$ 还小：不缩放时标准差 ' + f1(sd) + '，影响不大——论文说小 $d_k$ 时点积和加性注意力表现差不多。');
      var g = begin(st), ctx = g.ctx, P = g.P, lo = -48, hi = 48, B = 48;
      var cnt = [];
      for (i = 0; i < B; i++) cnt.push(0);
      xs.forEach(function (x) { var b2 = Math.floor((x - lo) / (hi - lo) * B); if (b2 >= 0 && b2 < B) cnt[b2]++; });
      var top = Math.max.apply(null, cnt) || 1;
      var pp = plot(g, { l: 30, r: 16, t: 26, b: 30 }, [lo, hi], [0, top]);
      axes(g, pp, { xTicks: [-40, -20, 0, 20, 40] });
      text(ctx, '点积的分布（' + (state.scale ? '缩放后' : '不缩放') + '，横轴 −48 到 48）', pp.x0, 13, P.muted, 'left');
      cnt.forEach(function (c, j) {
        var x0 = pp.sx(lo + j * (hi - lo) / B), x1 = pp.sx(lo + (j + 1) * (hi - lo) / B), y = pp.sy(c);
        ctx.fillStyle = state.scale ? P.good : P.bad;
        ctx.fillRect(x0 + 0.5, y, Math.max(1, x1 - x0 - 1), pp.y0 - y);
      });
    }
    registerRenderer(render);
    render();
  }

  // ─── 演示 3：表一计算器 ─────────────────────────────────────────────────
  function buildCostDemo(host) {
    var root = card(host, {
      title: '表一计算器：序列多长，自注意力才划算',
      sub: '按论文表 1 的量级粗算（忽略常数）：自注意力每层 $n^2 d$、循环层 $n d^2$，两者之比 $d/n$；另外数一数注意力表有多少格、因果掩码留下多少格、要串行几步。'
    });
    var state = { n: 16, d: 192 };
    var row = controlsRow(root);
    var NS = [4, 8, 16, 32, 64, 128, 256, 512, 867, 1024, 2048];
    var DS = [64, 128, 192, 256, 512, 1024, 2048, 4096];
    var sn = slider(row, { label: '序列长度 $n$', min: 0, max: NS.length - 1, step: 1, value: 2, format: function (v) { return String(NS[v]); }, onInput: function (v) { state.n = NS[v]; render(); } });
    var sd = slider(row, { label: '表示维度 $d$', min: 0, max: DS.length - 1, step: 1, value: 2, format: function (v) { return String(DS[v]); }, onInput: function (v) { state.d = DS[v]; render(); } });
    buttonGroup(row, { label: '预设', items: [{ label: 'Digit 行走（16, 192）', value: 'rh' }, { label: 'π₀ 一次推理（867, 2048）', value: 'pi0' }, { label: '论文 base（d = 512）', value: 'base' }], value: 'rh', onPick: function (v) {
      var c = v === 'rh' ? [2, 2] : v === 'pi0' ? [8, 6] : [5, 4];
      sn.set(c[0], true); sd.set(c[1], true);
      state.n = NS[c[0]]; state.d = DS[c[1]]; render();
    } });
    var stats = statsRow(root);
    var sRatio = stats.add('自注意力 / 循环层'), sPairs = stats.add('注意力表的格数 $n^2$'), sCausal = stats.add('因果掩码留下'), sSeq = stats.add('串行步数');
    var st = stage(root, 220);
    var verdict = verdictBox(root);
    note(root, ['只看量级：表 1 是大 O 记号，真实耗时还取决于常数、头数、硬件和实现。Digit 的 16 步、192 维取自第 014 期笔记；π₀ 的 867 个 token（816 前缀 + 51 后缀）、Gemma 2B 宽 2048 取自第 045 期笔记和 openpi。']);
    function render() {
      var n = state.n, d = state.d, r = d / n;
      sRatio.set(r >= 1 ? '自注意力便宜 ' + f1(r) + ' 倍' : '循环层便宜 ' + f1(1 / r) + ' 倍', r >= 1 ? 'good' : 'bad');
      sPairs.set((n * n).toLocaleString('en-US'));
      sCausal.set(causalPairs(n).toLocaleString('en-US') + '（' + Math.round(100 * causalPairs(n) / (n * n)) + '%）');
      sSeq.set('自注意力 1 / 循环 ' + n);
      verdict.set(r >= 1 ? '$n=' + n + ' < d=' + d + '$：按表一的量级，自注意力每层更便宜，而且串行步数是 1。' : '$n=' + n + ' > d=' + d + '$：平方项占上风，长序列可以考虑只看邻域的受限自注意力（论文 §4 留作后续工作）。', r >= 1 ? 'good' : 'bad');
      var g = begin(st), ctx = g.ctx, P = g.P;
      var p = plot(g, { l: 44, r: 16, t: 26, b: 32 }, [2, 11], [10, 36]);
      axes(g, p, { xTicks: [2, 4, 6, 8, 10], xFmt: function (v) { return String(Math.pow(2, v)); }, yTicks: [15, 20, 25, 30, 35], yFmt: function (v) { return '2' + String(v).split('').map(function (c) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]; }).join(''); }, xLabel: '序列长度 n（对数轴）' });
      var A = [], Rr = [];
      for (var q = 2; q <= 11.001; q += 0.1) { var nn = Math.pow(2, q); A.push([p.sx(q), p.sy(Math.log2(nn * nn * d))]); Rr.push([p.sx(q), p.sy(Math.log2(nn * d * d))]); }
      line(ctx, A, P.good, 2.2); line(ctx, Rr, P.bad, 2.2);
      var lq = Math.log2(n);
      dot(ctx, p.sx(lq), p.sy(Math.log2(n * n * d)), 5, P.good);
      dot(ctx, p.sx(lq), p.sy(Math.log2(n * d * d)), 5, P.bad);
      text(ctx, '绿：自注意力 n²·d　红：循环 n·d²（每层运算量，对数轴）', p.x0, 13, P.muted, 'left');
    }
    registerRenderer(render);
    render();
  }

  K.mount({
    'tf-explainer': buildExplainerDemo,
    'tf-video': buildVideoDemo,
    'tf-attention': buildAttentionDemo,
    'tf-scale': buildScaleDemo,
    'tf-cost': buildCostDemo
  });
})();
