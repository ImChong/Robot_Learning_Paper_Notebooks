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
    fig1: ['fig1_arch.webp', 760, 1120],
    mha: ['fig2_mha.webp', 420, 548],
    making: ['fig3_making.webp', 1063, 640],
    its: ['fig4_its.webp', 877, 643]
  };
  function paperPart(parent, key, u0, v0, u1, v1, x, y, w, caption) {
    var F = FIGS[key];
    return figPart(parent, F[0], F[1], F[2], u0, v0, u1, v1, x, y, w, caption);
  }
  /* 论文图 1 里几块的位置（按整张图的比例），讲到哪块就框出哪块 */
  var FIG1_PARTS = {
    enc: [0.108, 0.37, 0.472, 0.727], dec: [0.525, 0.206, 0.882, 0.727],
    encIn: [0.0, 0.737, 0.445, 0.885], decIn: [0.552, 0.737, 1.0, 0.885],
    encAtt: [0.198, 0.59, 0.446, 0.665], encFfn: [0.198, 0.425, 0.446, 0.5],
    maskAtt: [0.552, 0.564, 0.802, 0.665], crossAtt: [0.552, 0.4, 0.802, 0.476],
    out: [0.552, 0.088, 0.802, 0.192]
  };
  /* 在一块论文图上框出 FIG1_PARTS 里的某一块 */
  function figFrame(parent, fig, key, color) {
    var b = FIG1_PARTS[key];
    var r = rectBox(parent, fig.x + b[0] * fig.w, fig.y + b[1] * fig.h, (b[2] - b[0]) * fig.w, (b[3] - b[1]) * fig.h, color || C_BAD, 'none');
    r.style.fill = 'none'; r.setAttribute('stroke-width', 2.6);
    return r;
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
  var ROBOTS = { digit: [183, 400], ur5: [325, 260], ur5e: [197, 300], gr1: [77, 323], g1: [253, 640] };
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

  // ─── 十七幕分镜 ─────────────────────────────────────────────────────────
  /* ── scene 1: 为什么机器人要读一篇翻译论文 ── */
  function buildSceneWhy() {
    var s = sceneSvg('左边是论文图 1 的 Transformer 结构，讲到哪一块就框出哪一块；右边依次出现：英文句子经 Transformer 翻成德文；' +
      '第 014 期真实世界人形行走项目页的视频，Digit 在户外走，旁边是 16 个 token 进因果 Transformer 出下一步动作；π₀ 与 GR00T N1 的卡片；' +
      'Diffusion Policy 与 MaskedMimic 的卡片；最后五篇机器人论文围着中间的「注意力块」，小点从中间流向每一篇');
    s.appendChild(svgText(24, 26, '一篇翻译论文，成了机器人大模型的骨架', 'demo-x-ink2', 13.5));
    var fig = paperPart(s, 'fig1', 0, 0, 1, 1, 24, 44, 176, '论文图 1：Transformer 的结构');
    var fr = {};
    ['enc', 'dec', 'maskAtt', 'encAtt', 'crossAtt'].forEach(function (k) { fr[k] = figFrame(s, fig, k, C_BAD); });
    var R = 224, W = 552;
    /* 第 1 段：英译德 */
    var p1 = group(s);
    label(p1, R, 64, '论文的任务：机器翻译（WMT 2014）', 'demo-x-ink', 14);
    var EN = ['The', 'cat', 'sat', 'on', 'the', 'mat'], DE = ['Die', 'Katze', 'saß', 'auf', 'der', 'Matte'];
    var enC = EN.map(function (w, i) { return chip(p1, R + i * 76, 84, 68, w, C_Q, { size: 12 }); });
    chip(p1, R + 120, 142, 210, 'Transformer', C_ACCENT, { size: 13, h: 32 });
    var deC = DE.map(function (w, i) { return chip(p1, R + i * 76, 206, 68, w, C_V, { size: 12 }); });
    var fl1 = [0, 1].map(function () { return flowSeg(p1, C_MUTED, 2, 3, 30); });
    label(p1, R, 266, '英→德 约 450 万句对，英→法 约 3600 万句（§5.1）', 'demo-x-ink2', 12);
    rich(p1, R, 290, '全文**没有一个机器人**，也没有强化学习', 12.5);
    /* 第 2 段：Digit（第 014 期） */
    var p2 = group(s);
    label(p2, R, 64, '第 014 期：Digit 的控制器就是一个因果 Transformer', 'demo-x-ink', 13.5);
    var clip = projClip(p2, 'rh_walk', R, 80, 272, 153, '项目页视频（未标倍速）：Digit 在伯克利校园里走');
    var TX = R + 292, toks = cellGrid(p2, TX, 96, 16, 16, 12, 3, C_ROBOT);
    label(p2, TX, 88, '最近 16 步（观测，动作）', 'demo-x-mut', 11);
    chip(p2, TX, 134, 236, '因果 Transformer', C_ACCENT, { size: 12.5, h: 30 });
    chip(p2, TX + 70, 196, 96, '下一步动作', C_V, { size: 12, h: 28 });
    var fl2 = [flowSeg(p2, C_ROBOT, 2, 3, 26), flowSeg(p2, C_V, 2, 3, 26)];
    label(p2, R, 268, '4 层、192 维、4 个头，约 140 万参数；每秒 50 次出关节目标', 'demo-x-ink2', 12);
    label(p2, R, 290, '（数字取自本站第 014 期笔记，不是这篇论文的内容）', 'demo-x-mut', 11);
    /* 第 3 段：π₀ 与 GR00T N1 */
    var p3 = group(s);
    label(p3, R, 64, '后面要讲的视觉—语言—动作模型', 'demo-x-ink', 14);
    function robotCard(g, x, y, w, h, key, imgH, name, lines, tokens) {
      rectBox(g, x, y, w, h, C_BORDER, C_SURFACE);
      var im = robotImg(g, key, x + 10, y + h - imgH - 10, imgH);
      label(g, x + 14 + im.w, y + 26, name, 'demo-x-ink', 13.5);
      lines.forEach(function (l, i) { rich(g, x + 14 + im.w, y + 52 + i * 22, l, 11.5, 'demo-x-ink2', 'start', w - im.w - 24); });
      var cells = [];
      (tokens || []).forEach(function (tk, i) {
        cells.push(paint(svgEl('rect', { x: x + 14 + im.w + i * 13, y: y + h - 30, width: 10, height: 14, rx: 2 }), tk));
        g.appendChild(cells[i]);
      });
      return cells;
    }
    var tkA = robotCard(p3, R, 82, 268, 200, 'ur5e', 130, 'π₀', ['图像 + 文字 + 状态 + 50 步动作', '放进**同一个** Transformer', '两套权重，在自注意力里交互'],
      [C_Q, C_Q, C_Q, C_Q, C_ACCENT, C_ACCENT, C_ROBOT, C_V, C_V, C_V]);
    var tkB = robotCard(p3, R + 284, 82, 268, 200, 'gr1', 180, 'GR00T N1', ['Eagle-2 读图像和语言', '动作头是 DiT', '用**交叉注意力**读视觉语言特征'],
      [C_Q, C_Q, C_Q, C_ACCENT, C_ACCENT, C_V, C_V, C_V]);
    label(p3, R, 304, 'π₀ 是第 045 期、GR00T N1 是第 050 期的内容（本站笔记）', 'demo-x-mut', 11);
    /* 第 4 段：Diffusion Policy 与 MaskedMimic */
    var p4 = group(s);
    label(p4, R, 64, '前面讲过的两篇，也用了它', 'demo-x-ink', 14);
    var tkC = robotCard(p4, R, 82, 268, 200, 'ur5', 70, 'Diffusion Policy', ['第 010 期：去噪网络的', 'Transformer 版', '带噪动作当 token', '交叉注意力读观测'],
      [C_V, C_V, C_V, C_V, C_Q, C_Q]);
    rectBox(p4, R + 284, 82, 268, 200, C_BORDER, C_SURFACE);
    label(p4, R + 298, 108, 'MaskedMimic', 'demo-x-ink', 13.5);
    label(p4, R + 298, 134, '第 028 期：策略是 Transformer', 'demo-x-ink2', 11.5);
    label(p4, R + 298, 156, '没给的目标，用注意力掩码排除', 'demo-x-ink2', 11.5);
    var mmCells = [];
    for (var i = 0; i < 10; i++) {
      var r = paint(svgEl('rect', { x: R + 300 + i * 22, y: 200, width: 18, height: 26, rx: 3 }), C_ROBOT);
      p4.appendChild(r); mmCells.push(r);
    }
    var mmX = [];
    for (i = 0; i < 10; i++) mmX.push(cross(p4, R + 302 + i * 22, 206, 14, C_BAD));
    label(p4, R + 298, 254, '叉掉的格子：这一刻没给的部位或时刻', 'demo-x-mut', 11);
    label(p4, R, 304, '（结构细节取自本站第 010、028 期笔记）', 'demo-x-mut', 11);
    /* 第 5 段：一张地图 */
    var p5 = group(s);
    var HX = R + W / 2, HY = 176;
    var spokes = [['Digit 行走', R + 4, 84], ['π₀', R + W - 124, 84], ['GR00T N1', R + W - 124, 240], ['Diffusion Policy', R + 4, 240], ['MaskedMimic', HX - 60, 290]];
    var fl5 = spokes.map(function () { return flowSeg(p5, C_ACCENT, 2, 3, 30); });
    spokes.forEach(function (sp) { chip(p5, sp[1], sp[2], 120, sp[0], C_ROBOT, { size: 12, h: 30 }); });
    chip(p5, HX - 90, HY - 18, 180, '注意力块（这篇论文）', C_ACCENT, { size: 13, h: 36 });
    label(p5, R, 64, '换掉的是 token 和输出头，中间那块来自这篇论文', 'demo-x-ink', 13.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* 第 1 段：词一个个流过 Transformer */
      fl1[0].at(now, [R + 225, 114], [R + 225, 140], true);
      fl1[1].at(now, [R + 225, 176], [R + 225, 204], true);
      var k = Math.floor(now * 1.2) % 6;
      enC.forEach(function (c, i) { c.box.style.stroke = i === k ? C_INK : C_Q; });
      deC.forEach(function (c, i) { setOpacity(c, i <= Math.floor(since(t, clock, 0.4) * 1.2) % 7 ? 1 : 0.25); });
      /* 第 2 段 */
      clip.at(K.clipSince(t, 3.6), winK(t, 1) > 0.05);
      toks.fill(1 + Math.floor(now * 8) % 16);
      fl2[0].at(now, [TX + 118, 112], [TX + 118, 132], true);
      fl2[1].at(now, [TX + 118, 166], [TX + 118, 194], true);
      /* 第 3、4 段：token 一个个亮 */
      [tkA, tkB, tkC].forEach(function (cells, q) {
        var m = Math.floor(now * 5 + q * 2) % (cells.length + 4);
        cells.forEach(function (c, j) { c.style.opacity = j < m ? 1 : 0.25; });
      });
      var mm = Math.floor(now / 1.5);
      mmX.forEach(function (x, j) { setOpacity(x, rnd(j + 10 * mm, 5) < 0.35 ? 1 : 0); });
      mmCells.forEach(function (c, j) { c.style.opacity = rnd(j + 10 * mm, 5) < 0.35 ? 0.3 : 1; });
      /* 第 5 段 */
      spokes.forEach(function (sp, j) { fl5[j].at(now + j * 0.3, [HX, HY], [sp[1] + 60, sp[2] + 15], true); });
      panels(t, [p1, p2, p3, p4, p5]);
      setOpacity(fr.maskAtt, winK(t, 1) + winK(t, 3));
      setOpacity(fr.encAtt, winK(t, 2));
      setOpacity(fr.crossAtt, winK(t, 2) + winK(t, 3));
      setOpacity(fr.enc, winK(t, 4));
      setOpacity(fr.dec, winK(t, 4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 一步等一步：RNN 的串行瓶颈 ── */
  function buildSceneSerial() {
    var s = sceneSvg('左上是一台走路的 G1 的最近 6 步，每一步一个格子；下面一排是 RNN 的 6 个隐状态，亮点一格一格往右走；最下面一排是自注意力，' +
      '6 个位置两两用弧线连起来，一起亮；右边依次出现：RNN 的公式；6、16、50 步要串行走多少次；远距离依赖的路径；卷积要堆的层；Transformer 只靠注意力');
    s.appendChild(svgText(24, 26, '把机器人最近 6 步当成一串 token', 'demo-x-ink2', 13.5));
    var N = 6, CW = 56, GAP = 6;
    var hist = historyStrip(s, 24, 40, N, CW, 84, { gap: GAP });
    label(s, 24, 166, 'RNN：一格一格算', 'demo-x-ink2', 12);
    var arr = K.arrowMarker(s, 'tf-x-arrow-rnn', C_MUTED);
    var hBoxes = [];
    for (var i = 0; i < N; i++) {
      var cx = hist.cx(i);
      hBoxes.push(rectBox(s, cx - 26, 176, 52, 30, C_RNN, C_SURFACE2));
      rich(s, cx, 195, '$h_{' + (i === N - 1 ? 't' : 't-' + (N - 1 - i)) + '}$', 13.5, 'demo-x-ink2', 'middle', 50);
      if (i) {
        var l = hline(s, hist.cx(i - 1) + 27, 191, cx - 29, 191, C_MUTED, 1.3);
        l.setAttribute('marker-end', arr);
      }
    }
    var rnnTag = tone(s, 390, 228, '', C_RNN, 12, 'end');
    label(s, 24, 262, '自注意力：一层之内同时算完', 'demo-x-ink2', 12);
    var arcs = group(s), arcList = [];
    for (var a = 0; a < N; a++) for (var b = a + 1; b < N; b++) {
      var m = (hist.cx(a) + hist.cx(b)) / 2, lift = 10 + (b - a) * 11;
      arcList.push(paint(svgEl('path', { d: 'M ' + hist.cx(a) + ' 336 Q ' + m + ' ' + (336 - 2 * lift) + ' ' + hist.cx(b) + ' 336', fill: 'none', 'stroke-width': 1.2 }), null, C_GOOD));
      arcs.appendChild(arcList[arcList.length - 1]);
    }
    var aBoxes = [];
    for (i = 0; i < N; i++) {
      aBoxes.push(rectBox(s, hist.cx(i) - 26, 336, 52, 30, C_GOOD, C_SURFACE2));
      rich(s, hist.cx(i), 355, '$z_{' + (i === N - 1 ? 't' : 't-' + (N - 1 - i)) + '}$', 13.5, 'demo-x-ink2', 'middle', 50);
    }
    var attTag = tone(s, 390, 388, '', C_GOOD, 12, 'end');
    label(s, 24, 404, '格子里的 G1 借第 032 期 HOMIE 的回放贴图，只作示意', 'demo-x-mut', 10.5);
    var R = 412, W = 364;
    /* 第 1 段：公式 */
    var p1 = group(s);
    label(p1, R, 64, 'RNN：第 t 步要等第 t−1 步', 'demo-x-ink', 14);
    math(p1, R + 10, 108, 'h_t = f(h_{t-1},\\, x_t)', 20);
    label(p1, R, 152, '隐状态一个接一个地往后传', 'demo-x-ink2', 12);
    label(p1, R, 176, '同一条序列内部没法并行（§1）', 'demo-x-ink2', 12);
    rich(p1, R, 212, '机器人这边：策略读的**最近一段观测**，也是一串 token', 12.5);
    /* 第 2 段：越长越久 */
    var p2 = group(s);
    label(p2, R, 64, '序列越长，串行越久', 'demo-x-ink', 14);
    var LEN = [[6, '这里的 6 步'], [16, 'Digit 的窗口 16 步'], [50, 'π₀ 一块动作 50 步']];
    var rows2 = LEN.map(function (L, j) {
      var y = 96 + j * 56;
      label(p2, R, y, L[1], 'demo-x-ink2', 11.5);
      var dots = [];
      for (var q = 0; q < L[0]; q++) dots.push(dotAt(p2, R + 6 + q * 6.6, y + 16, 2.4, C_RNN));
      var bar = hbar(p2, R, y + 26, 6, C_GOOD);
      return { dots: dots, bar: bar, n: L[0] };
    });
    legendRow(p2, R, 278, [['RNN：一步一个点', C_RNN], ['自注意力：一次', C_GOOD]], 11);
    label(p2, R, 304, '显存又限制了跨样本的批量（§1）', 'demo-x-mut', 11.5);
    /* 第 3 段：远距离依赖 */
    var p3 = group(s);
    label(p3, R, 64, '远距离依赖：路径越短，越好学', 'demo-x-ink', 14);
    var CH = 8, cxs = [];
    for (i = 0; i < CH; i++) { cxs.push(R + 20 + i * 44); dotAt(p3, cxs[i], 140, 7, C_SURFACE2); ringAt(p3, cxs[i], 140, 7, C_RNN, 1.6); }
    for (i = 1; i < CH; i++) hline(p3, cxs[i - 1] + 8, 140, cxs[i] - 8, 140, C_RNN, 1.4);
    var hop = dotAt(p3, cxs[0], 140, 4.5, C_INK);
    var hopTxt = tone(p3, R, 176, '', C_RNN, 12);
    p3.appendChild(paint(svgEl('path', { d: 'M ' + cxs[0] + ' 226 Q ' + (cxs[0] + cxs[CH - 1]) / 2 + ' 186 ' + cxs[CH - 1] + ' 226', fill: 'none', 'stroke-width': 2 }), null, C_GOOD));
    for (i = 0; i < CH; i++) { dotAt(p3, cxs[i], 226, 7, C_SURFACE2); ringAt(p3, cxs[i], 226, 7, C_GOOD, 1.6); }
    var jump = dotAt(p3, cxs[0], 226, 4.5, C_INK);
    tone(p3, R, 258, '自注意力：1 步就到', C_GOOD, 12);
    label(p3, R, 290, '第 1 步的信息要经过 n−1 次更新才到最后（§4）', 'demo-x-ink2', 11.5);
    /* 第 4 段：卷积 */
    var p4 = group(s);
    label(p4, R, 64, '卷积能并行，但要堆层才连得通', 'demo-x-ink', 14);
    var LV = 4, base = 8, nodes = [];
    for (var lv = 0; lv < LV; lv++) {
      nodes.push([]);
      for (i = 0; i < base; i++) {
        var x = R + 24 + i * 40, y = 250 - lv * 46;
        nodes[lv].push(dotAt(p4, x, y, 5, C_MUTED));
        if (lv) for (var dd = -1; dd <= 1; dd++) if (i + dd >= 0 && i + dd < base) hline(p4, x, y + 5, R + 24 + (i + dd) * 40, y + 41, C_BORDER, 1);
      }
    }
    label(p4, R, 284, '核宽 3：每往上一层，看到的范围多 2 格', 'demo-x-ink2', 11.5);
    rich(p4, R, 308, 'ConvS2S 要 $O(n/k)$ 层，ByteNet（空洞卷积）要 $O(\\log_k n)$ 层', 11.5);
    /* 第 5 段：只靠注意力 */
    var p5 = group(s);
    label(p5, R, 64, '这篇论文：不用循环，也不用卷积', 'demo-x-ink', 14);
    label(p5, R, 100, '只靠注意力，建模输入和输出之间的全局依赖（§1）', 'demo-x-ink2', 12);
    label(p5, R, 126, '据作者所知，是第一个完全靠自注意力的转导模型（§2）', 'demo-x-ink2', 12);
    var cmp = [['串行步数', '$n$', '$1$'], ['最远两步的路径', '$n$', '$1$']];
    cmp.forEach(function (c, j) {
      var y = 160 + j * 44;
      label(p5, R, y + 20, c[0], 'demo-x-ink2', 12);
      chip(p5, R + 130, y, 100, 'RNN ' + c[1], C_RNN, { size: 12 });
      chip(p5, R + 244, y, 116, '自注意力 ' + c[2], C_GOOD, { size: 12 });
    });
    rich(p5, R, 278, '下一幕看论文**表一**怎么把这三件事摆在一起', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      hist.set(now);
      /* RNN 的亮点一格一格走；每轮 6 步、每步 0.45 s，再停 0.6 s */
      var cyc = (now % (N * 0.45 + 0.6)) / 0.45, k = Math.min(N - 1, Math.floor(cyc));
      hBoxes.forEach(function (b, j) { b.style.fill = j === k ? C_RNN : C_SURFACE2; b.style.fillOpacity = j === k ? 0.35 : 1; });
      rnnTag.textContent = '串行：第 ' + (k + 1) + ' / ' + N + ' 步';
      var pulse = 0.35 + 0.65 * Math.abs(Math.sin(now * 2.2));
      arcList.forEach(function (p) { p.style.opacity = pulse.toFixed(2); });
      aBoxes.forEach(function (b) { b.style.fill = C_GOOD; b.style.fillOpacity = (0.1 + 0.25 * pulse).toFixed(2); });
      attTag.textContent = '并行：1 步';
      /* 第 2 段：每个点 0.12 s；自注意力的条一次画满 */
      var u2 = since(t, clock, 3.6);
      rows2.forEach(function (r) {
        var m = Math.floor((u2 % 7.5) / 0.12);
        r.dots.forEach(function (d, q) { d.style.opacity = q < m ? 1 : 0.18; });
        setW(r.bar, (u2 % 7.5) > 0.12 ? r.n * 6.6 : 0);
      });
      /* 第 3 段：信息一跳一跳 */
      var hp = (since(t, clock, 7.0) % 4.2) / 0.5, hk = Math.min(CH - 1, Math.floor(hp));
      moveDot(hop, [cxs[0] + (cxs[CH - 1] - cxs[0]) * Math.min(1, hp / (CH - 1)), 140]);
      hopTxt.textContent = 'RNN：已经走了 ' + hk + ' / ' + (CH - 1) + ' 步';
      var ju = clamp((since(t, clock, 7.0) % 4.2) / 0.6, 0, 1);
      var jx = cxs[0] + (cxs[CH - 1] - cxs[0]) * ju, jy = 226 - 4 * 20 * ju * (1 - ju) * 2;
      moveDot(jump, [jx, jy]);
      /* 第 4 段：感受野一层层扩大 */
      var lvOn = Math.floor((since(t, clock, 10.4) % 4) / 0.9);
      nodes.forEach(function (row, lv2) {
        row.forEach(function (d, j) {
          /* 从最上面一个点往下看：它的感受野每往下一层宽 2 格 */
          var shown = lv2 >= LV - 1 - lvOn, inCone = Math.abs(j - 3) <= LV - 1 - lv2;
          d.style.fill = shown ? (inCone ? C_WARN : C_MUTED) : C_BORDER;
        });
      });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 表一：三种层比三件事 ── */
  function buildSceneTable1() {
    var s = sceneSvg('左边是论文表 1 重画的四行三列：自注意力、循环、卷积、受限自注意力的每层计算量、串行操作数和最长路径，讲到哪一列就框出哪一列；' +
      '右边依次出现：读法；n 从 4 涨到 2048 时两条量级曲线在 n = d 处交叉；Digit 和 π₀ 两种序列长度下便宜多少倍的条；受限自注意力的带状矩阵；π₀ 的 867 个 token 一格一格数出来');
    s.appendChild(svgText(24, 26, '论文表一：每层计算量、串行操作、最长路径', 'demo-x-ink2', 13.5));
    var COLS = [24, 140, 260, 330], TW = 380;
    var head = ['层的类型', '每层计算量', '串行', '最长路径'];
    head.forEach(function (h, j) { label(s, COLS[j] + (j ? 8 : 6), 60, h, 'demo-x-mut', 11.5); });
    var ROWS = [
      ['自注意力', 'O(n^2\\cdot d)', 'O(1)', 'O(1)', C_GOOD],
      ['循环', 'O(n\\cdot d^2)', 'O(n)', 'O(n)', C_RNN],
      ['卷积', 'O(k\\cdot n\\cdot d^2)', 'O(1)', 'O(\\log_k n)', C_WARN],
      ['受限自注意力', 'O(r\\cdot n\\cdot d)', 'O(1)', 'O(n/r)', C_ACCENT]
    ];
    var rowBoxes = ROWS.map(function (r, i) {
      var y = 74 + i * 46;
      var box = rectBox(s, 24, y, TW, 40, r[4], C_SURFACE);
      label(s, 32, y + 25, r[0], 'demo-x-ink', 12.5);
      math(s, COLS[1] + 8, y + 26, r[1], 13.5);
      math(s, COLS[2] + 8, y + 26, r[2], 13.5);
      math(s, COLS[3] + 8, y + 26, r[3], 13.5);
      return box;
    });
    var colFrames = [1, 2, 3].map(function (j) {
      var x0 = COLS[j], x1 = j < 3 ? COLS[j + 1] : 24 + TW;
      var r = rectBox(s, x0 + 2, 68, x1 - x0 - 4, 4 * 46 + 4, C_INK, 'none');
      r.style.fill = 'none'; r.setAttribute('stroke-width', 2.4);
      return r;
    });
    rich(s, 24, 290, '$n$：序列长度　$d$：表示维度　$k$：卷积核宽　$r$：邻域大小', 11.5, 'demo-x-mut', 'start', 380);
    readHint(s, 24, 314, '三列都是**越小越好**', 11.5, 380);
    var R = 424, W = 352;
    /* 第 1 段：读法 */
    var p1 = group(s);
    label(p1, R, 64, '自注意力赢两列，输一列', 'demo-x-ink', 14);
    var verdicts = [['串行操作', true], ['最长路径', true], ['每层计算量', false]];
    verdicts.forEach(function (v, j) {
      var y = 94 + j * 46;
      label(p1, R + 40, y + 20, v[0], 'demo-x-ink2', 12.5);
      if (v[1]) tick(p1, R + 8, y + 4, 18, C_GOOD); else cross(p1, R + 10, y + 6, 14, C_RNN);
    });
    rich(p1, R, 252, '代价是 $n^2$：每两个位置都要算一次分数', 12);
    var mini = attnGrid(p1, R + 250, 230, 6, 14, C_GOOD);
    /* 第 2 段：交叉 */
    var p2 = group(s);
    label(p2, R, 64, '谁更便宜：看 n 和 d 谁大', 'demo-x-ink', 14);
    var PX = R + 26, PY = 84, PW = 300, PH = 136;
    rectBox(p2, PX, PY, PW, PH, C_BORDER, C_SURFACE);
    var lx = function (n) { return PX + (Math.log2(n) - 2) / 9 * PW; };
    var ly = function (f) { return PY + PH - (Math.log2(f) - 13) / 21 * PH; };
    var ptsA = [], ptsR = [];
    for (var q = 2; q <= 11.001; q += 0.25) { var nn = Math.pow(2, q); ptsA.push([lx(nn), ly(nn * nn * 512)]); ptsR.push([lx(nn), ly(nn * 512 * 512)]); }
    pathLine(p2, ptsA, C_GOOD, 2.2);
    pathLine(p2, ptsR, C_RNN, 2.2);
    hline(p2, lx(512), PY, lx(512), PY + PH, C_MUTED, 1, '4 4');
    label(p2, lx(512), PY + PH + 16, 'n = d = 512', 'demo-x-ink2', 11, 'middle');
    label(p2, PX, PY + PH + 16, '4', 'demo-x-mut', 11, 'middle');
    label(p2, PX + PW, PY + PH + 16, '2048', 'demo-x-mut', 11, 'middle');
    var mk = dotAt(p2, 0, 0, 5, C_GOOD), mkR = dotAt(p2, 0, 0, 5, C_RNN);
    readHint(p2, R, 262, '横轴序列长度 $n$、纵轴每层运算量（都是对数），**越低越省**', 11, 352);
    legendRow(p2, R, 286, [['自注意力 $n^2 d$', C_GOOD, 92], ['循环 $n d^2$', C_RNN, 70]], 11);
    var nTxt = label(p2, R, 310, '', 'demo-x-ink', 12);
    /* 第 3 段：两个机器人 */
    var p3 = group(s);
    label(p3, R, 64, '两者之比是 d / n（我们按表一粗算）', 'demo-x-ink', 13.5);
    var cards3 = COST_CASES.map(function (c, j) {
      var y = 86 + j * 96;
      rectBox(p3, R, y, W, 84, C_BORDER, C_SURFACE);
      robotImg(p3, j ? 'ur5e' : 'digit', R + 8, y + 6, 72);
      label(p3, R + 60, y + 22, c.zh, 'demo-x-ink', 12.5);
      rich(p3, R + 60, y + 44, '$n=' + c.n + '$，$d=' + c.d + '$', 12);
      var bar = hbar(p3, R + 60, y + 56, 12, C_GOOD);
      var v = label(p3, R + W - 10, y + 44, '', 'demo-x-ink', 12.5, 'end');
      return { bar: bar, v: v, r: c.d / c.n };
    });
    label(p3, R, 296, '忽略常数，只看量级；n、d 取本站第 014、045 期笔记', 'demo-x-mut', 11);
    /* 第 4 段：受限自注意力 */
    var p4 = group(s);
    label(p4, R, 64, '序列太长：只看邻域 r', 'demo-x-ink', 14);
    var band = attnGrid(p4, R + 8, 84, 10, 15, C_ACCENT);
    rich(p4, R + 172, 110, '每层 $O(r\\cdot n\\cdot d)$', 12.5);
    rich(p4, R + 172, 140, '最长路径变成 $O(n/r)$', 12.5);
    label(p4, R + 172, 170, '论文留作后续工作（§4）', 'demo-x-ink2', 12);
    label(p4, R, 262, '格子：第 i 行是第 i 个 query 能看的位置（r = 3）', 'demo-x-mut', 11);
    /* 第 5 段：图像 token */
    var p5 = group(s);
    label(p5, R, 64, '机器人里 n 涨得最快的是图像', 'demo-x-ink', 14);
    var gridImg = cellGrid(p5, R, 82, 768, 48, 5, 1, C_Q);
    var gridTxt = cellGrid(p5, R, 182, 48, 48, 5, 1, C_ACCENT);
    var gridSuf = cellGrid(p5, R, 192, 51, 48, 5, 1, C_V);
    var cnt = label(p5, R, 226, '', 'demo-x-ink', 12.5);
    legendRow(p5, R, 250, [['三路图像', C_Q], ['文字', C_ACCENT], ['状态 + 动作', C_V]], 11);
    label(p5, R, 278, 'Digit 只取 16 步：16 × 16 = 256 对', 'demo-x-ink2', 12);
    label(p5, R, 302, 'π₀ 一次推理 867 个 token：约 75 万对', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      rowBoxes.forEach(function (b, i) { b.style.strokeWidth = (i === 0 && winK(t, 0) > 0.5) || (i === 3 && winK(t, 3) > 0.5) ? 2.6 : 1.3; });
      setOpacity(colFrames[0], winK(t, 1) + winK(t, 2));
      setOpacity(colFrames[1], winK(t, 0) * (0.5 + 0.5 * Math.sin(now * 3)));
      setOpacity(colFrames[2], winK(t, 3));
      mini.set(function () { return { a: 0.25 + 0.6 * Math.abs(Math.sin(now * 1.7)) }; });
      /* 第 2 段：n 来回扫 */
      var u = 0.5 - 0.5 * Math.cos(since(t, clock, 3.6) * 0.9), nn = Math.pow(2, 2 + 9 * u);
      moveDot(mk, [lx(nn), ly(nn * nn * 512)]); moveDot(mkR, [lx(nn), ly(nn * 512 * 512)]);
      nTxt.textContent = 'n = ' + Math.round(nn) + '：' + (nn < 512 ? '自注意力便宜 ' + f1(512 / nn) + ' 倍' : '循环便宜 ' + f1(nn / 512) + ' 倍');
      /* 第 3 段：条一点点长出来 */
      var u3 = seg(since(t, clock, 7.0), 0.3, 2.0);
      cards3.forEach(function (c) { setW(c.bar, c.r / 12 * 210 * u3); c.v.textContent = '约 ' + f1(c.r * u3) + ' 倍'; });
      /* 第 4 段：窗口往下滑 */
      var row4 = Math.floor(since(t, clock, 10.4) * 2.2) % 10;
      band.set(function (i, j) { var inBand = Math.abs(i - j) <= 1; return { a: inBand ? (i === row4 ? 1 : 0.45) : 0.07 }; });
      /* 第 5 段：数到 867 */
      var u5 = seg(since(t, clock, 13.4), 0.3, 3.0), m = Math.round(PI0_N * u5);
      gridImg.fill(Math.min(768, m)); gridTxt.fill(Math.max(0, Math.min(48, m - 768))); gridSuf.fill(Math.max(0, m - 816));
      cnt.textContent = 'π₀：' + m + ' 个 token';
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 机器人的 token 是什么 ── */
  function buildSceneToken() {
    var s = sceneSvg('左边是论文的做法：6 个词各自去一张大词表里查一行，变成 512 维向量，乘以根号 512，再加上位置编码，词表里被查到的那一行会亮；' +
      '右边依次出现：嵌入乘根号 d_model、三处共享权重；BPE 词表与 batch 的大小；Digit 每一步的观测—动作变成一个 token；π₀ 一张图切成 16 × 16 块，三路相机加文字、状态、动作数到 867；GR00T N1 每帧 64 个图像 token');
    s.appendChild(svgText(24, 26, '论文：每个词查表，变成一个 512 维向量', 'demo-x-ink2', 13.5));
    var EN = ['The', 'cat', 'sat', 'on', 'the', 'mat'], ROWS = [4, 11, 17, 7, 4, 20];
    var words = EN.map(function (w, i) { return chip(s, 24 + i * 62, 44, 56, w, C_Q, { size: 12 }); });
    var TX = 40, TY = 104, TWd = 74, THt = 220;
    rectBox(s, TX, TY, TWd, THt, C_BORDER, C_SURFACE2);
    for (var i = 1; i < 24; i++) hline(s, TX, TY + i * THt / 24, TX + TWd, TY + i * THt / 24, C_BORDER, 0.6);
    var hiRow = paint(svgEl('rect', { x: TX, y: TY, width: TWd, height: THt / 24, fill: 'none' }), C_Q);
    s.appendChild(hiRow);
    label(s, TX + TWd / 2, TY + THt + 18, '词表 约 37000 行', 'demo-x-ink2', 11.5, 'middle');
    var look = arrow(s, C_Q, 1.6);
    var vec = vecRow(s, 150, 132, 12, 15, C_Q, { h: 22, noText: true });
    label(s, 150, 124, '这一行：512 维（画了 12 格）', 'demo-x-mut', 11);
    rich(s, 150, 196, '× √$d_{model}$ = √512 ≈ 22.6', 14, 'demo-x-ink');
    var vec2 = vecRow(s, 150, 214, 12, 15, C_Q, { h: 22, noText: true });
    rich(s, 150, 268, '$+$ 位置编码（第 9 幕）', 12.5);
    var wave = pathLine(s, [], C_WARN, 2);
    label(s, 24, 368, '§3.4：两个嵌入层和 softmax 前的线性层共享同一个权重矩阵', 'demo-x-ink2', 11.5);
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '词 → 查表 → 向量', 'demo-x-ink', 14);
    label(p1, R, 96, '嵌入是学出来的，维度和模型一样宽：512', 'demo-x-ink2', 12);
    rich(p1, R, 122, '查出来的向量再乘 √512 ≈ 22.6', 12);
    var shared = ['输入嵌入', '输出嵌入', 'softmax 前的线性层'];
    var shX = [0, 102, 204], shW = [94, 94, 148];
    shared.forEach(function (nm, j) { chip(p1, R + shX[j], 150, shW[j], nm, C_ACCENT, { size: 11.5 }); });
    label(p1, R, 210, '三处用同一个矩阵（§3.4，沿用 Press 与 Wolf）', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 64, '词表是 BPE 子词', 'demo-x-ink', 14);
    label(p2, R, 96, '英德共享约 37000 个；英法用 32000 个 word-piece', 'demo-x-ink2', 12);
    label(p2, R, 122, '按长度分桶，每个 batch 约：', 'demo-x-ink2', 12);
    var bt1 = cellGrid(p2, R, 138, 100, 10, 9, 2, C_Q), bt2 = cellGrid(p2, R + 180, 138, 100, 10, 9, 2, C_V);
    label(p2, R, 268, '源句 25000 个 token', 'demo-x-ink2', 11.5);
    label(p2, R + 180, 268, '目标句 25000 个', 'demo-x-ink2', 11.5);
    label(p2, R, 290, '（一格代表 250 个 token）', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, 'Digit（第 014 期）：一步一个 token', 'demo-x-ink', 14);
    robotImg(p3, 'digit', R, 80, 150);
    var dTok = cellGrid(p3, R + 90, 140, 16, 16, 14, 2, C_ROBOT);
    var fl3 = flowSeg(p3, C_ROBOT, 3, 3, 40);
    label(p3, R + 90, 128, '每 0.02 s 一个，窗口留 16 个', 'demo-x-mut', 11);
    rich(p3, R + 90, 186, '（观测 $o_t$，上一步动作 $a_{t-1}$）', 12);
    label(p3, R + 90, 210, '→ MLP [512, 512] → 192 维', 'demo-x-ink2', 12);
    label(p3, R + 90, 234, '→ 加正弦位置编码', 'demo-x-ink2', 12);
    var p4 = group(s);
    label(p4, R, 64, 'π₀：一张图切成 256 块', 'demo-x-ink', 14);
    var GX = R, GY = 82, GS = 150;
    rectBox(p4, GX, GY, GS, GS, C_BORDER, C_SURFACE2);
    robotImg(p4, 'ur5e', GX + 28, GY + 8, GS - 16);
    var patches = cellGrid(p4, GX, GY, 256, 16, GS / 16 - 1, 1, C_Q);
    patches.cells.forEach(function (c) { c.style.fillOpacity = 0.35; });
    var c4 = [label(p4, R + 166, 100, '', 'demo-x-ink', 12.5), label(p4, R + 166, 128, '', 'demo-x-ink2', 12), label(p4, R + 166, 156, '', 'demo-x-ink2', 12), label(p4, R + 166, 184, '', 'demo-x-ink', 13)];
    label(p4, R, 256, '224 × 224 的图，SigLIP 切成 16 × 16 块（本站第 045 期笔记）', 'demo-x-mut', 11);
    label(p4, R, 278, '画面里的机械臂只是示意', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, 'GR00T N1：每帧 64 个图像 token', 'demo-x-ink', 14);
    robotImg(p5, 'gr1', R, 80, 170);
    var gTok = cellGrid(p5, R + 60, 100, 64, 16, 14, 2, C_Q);
    label(p5, R + 60, 186, 'pixel shuffle 之后，再和文字一起进语言模型', 'demo-x-ink2', 11.5);
    rich(p5, R + 60, 216, '词、关节角、图像都行：先变成**一串等宽的向量**', 12);
    label(p5, R + 60, 240, '后面的块不用改（我们的概括）', 'demo-x-mut', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var k = Math.floor(now / 1.1) % 6, ph = (now / 1.1) % 1;
      words.forEach(function (w, j) { w.box.style.strokeWidth = j === k ? 2.6 : 1.3; });
      var ry = TY + ROWS[k] * THt / 24;
      hiRow.setAttribute('y', ry.toFixed(1)); hiRow.setAttribute('height', (THt / 24).toFixed(1));
      hiRow.style.fill = C_Q; hiRow.style.fillOpacity = 0.7;
      look.set(TX + TWd + 2, ry + THt / 48, 146, 143, 7);
      var v = [];
      for (var j = 0; j < 12; j++) v.push(Math.sin(1.7 * j + 2.3 * k) * 0.06);
      vec.set(v.map(function (x) { return x * 10; }), 2);
      var sc = seg(ph, 0.3, 0.7);
      vec2.set(v.map(function (x) { return sc > 0 ? x * 22.6 : 0; }), 1);
      var wp = [];
      for (j = 0; j <= 40; j++) wp.push([300 + j * 2.4, 290 + 10 * Math.sin(j * 0.45 + now * 2)]);
      setPath(wave, wp);
      bt1.fill(Math.floor(seg(since(t, clock, 3.6), 0.3, 2.3) * 100));
      bt2.fill(Math.floor(seg(since(t, clock, 3.6), 0.8, 2.8) * 100));
      dTok.fill(1 + Math.floor(now * 6) % 16);
      fl3.at(now, [R + 66, 152], [R + 88, 147], true);
      var u4 = since(t, clock, 10.4);
      var m4 = Math.round(256 * seg(u4, 0.3, 2.3));
      patches.cells.forEach(function (c, j2) { c.style.opacity = j2 < m4 ? 0.9 : 0.08; });
      var cams = 1 + Math.floor(seg(u4, 2.3, 3.8) * 2.999);
      c4[0].textContent = '一张图：' + m4 + ' 个';
      c4[1].textContent = u4 > 2.3 ? cams + ' 路相机：' + 256 * cams + ' 个' : '';
      c4[2].textContent = u4 > 4.0 ? '+ 文字 48 = 816（前缀）' : '';
      c4[3].textContent = u4 > 5.2 ? '+ 状态 1 + 动作 50 = ' + PI0_N : '';
      gTok.fill(Math.round(64 * seg(since(t, clock, 13.4), 0.3, 2.0)));
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: Q、K、V：一份输入，三种角色 ── */
  function buildSceneQKV() {
    var s = sceneSvg('左边是机器人的三步 t−2、t−1、t，每一步的 token 分别乘 W_Q、W_K、W_V 三个矩阵，变成蓝色的 query、橙色的 key、绿色的 value，小点沿着箭头流下去；' +
      '右边依次出现：注意力的定义；Q、K、V 的类比；三个矩阵的形状；点积和加性注意力；一次矩阵乘法得到整张 n × n 的分数表');
    s.appendChild(svgText(24, 26, '同一个 token，乘三个矩阵，变成 Q、K、V', 'demo-x-ink2', 13.5));
    var XS = [74, 204, 334], cells = [], toks = [], qs = [], ks = [], vs = [];
    XS.forEach(function (cx, i) {
      rectBox(s, cx - 40, 40, 80, 96, C_BORDER, C_SURFACE2);
      cells.push(g1Cell(s));
      label(s, cx, 153.5, STEPS[i], 'demo-x-mono', 12, 'middle');
      toks.push(vecRow(s, cx - 40, 162, 5, 13, C_ROBOT, { h: 16, noText: true }));
      qs.push(vecRow(s, cx - 40, 268, 4, 16, C_Q, { h: 18, size: 10 }));
      ks.push(vecRow(s, cx - 40, 296, 4, 16, C_K, { h: 18, size: 10 }));
      vs.push(vecRow(s, cx - 40, 324, 2, 16, C_V, { h: 18, size: 10 }));
    });
    rectBox(s, 34, 204, 340, 36, C_ACCENT, C_SURFACE2);
    rich(s, 204, 226, '每一步都乘同样的 $W^Q$、$W^K$、$W^V$', 13, 'demo-x-ink', 'middle', 330);
    label(s, 24, 286, 'q', 'demo-x-mono', 12); label(s, 24, 314, 'k', 'demo-x-mono', 12); label(s, 24, 342, 'v', 'demo-x-mono', 12);
    var flows = XS.map(function () { return [flowSeg(s, C_ROBOT, 1, 3, 20), flowSeg(s, C_ACCENT, 1, 3, 20)]; });
    label(s, 24, 380, '向量是第 6 幕的玩具数；格子里的 G1 借第 032 期 HOMIE 的贴图', 'demo-x-mut', 10.5);
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '注意力的定义（§3.2）', 'demo-x-ink', 14);
    label(p1, R, 96, '一个 query，加一组 key–value 对', 'demo-x-ink2', 12);
    label(p1, R, 120, 'query 和每个 key 比「相容度」→ 权重', 'demo-x-ink2', 12);
    label(p1, R, 144, '输出 = 这些 value 的加权和', 'demo-x-ink2', 12);
    chip(p1, R, 170, 80, 'query', C_Q, { size: 12 });
    chip(p1, R + 96, 170, 100, 'key → 权重', C_K, { size: 12 });
    chip(p1, R + 212, 170, 130, 'value 加权求和', C_V, { size: 12 });
    var p2 = group(s);
    label(p2, R, 64, '一个类比（我们的说法）', 'demo-x-ink', 14);
    [['Q', '第 t 步要找什么', C_Q], ['K', '每一步贴的标签', C_K], ['V', '每一步交出来的内容', C_V]].forEach(function (r, j) {
      var y = 86 + j * 46;
      chip(p2, R, y, 44, r[0], r[2], { size: 14, h: 34 });
      label(p2, R + 58, y + 22, r[1], 'demo-x-ink2', 12.5);
    });
    label(p2, R, 248, '标签和内容可以不一样：按标签找，按内容拿', 'demo-x-ink2', 12);
    var p3 = group(s);
    label(p3, R, 64, '自注意力：Q、K、V 来自同一串输入', 'demo-x-ink', 14);
    label(p3, R, 96, '都是上一层的输出，各乘一个可学习矩阵（§3.2.3）', 'demo-x-ink2', 12);
    math(p3, R, 132, 'W_i^Q,\\ W_i^K \\in \\mathbb{R}^{512\\times 64},\\quad W_i^V\\in\\mathbb{R}^{512\\times 64}', 14, 'start', 352);
    var big = rectBox(p3, R, 156, 128, 64, C_BORDER, C_SURFACE2), small = rectBox(p3, R + 150, 156, 16, 64, C_Q, C_Q);
    label(p3, R + 64, 236, '512 维的 token', 'demo-x-ink2', 11.5, 'middle');
    label(p3, R + 158, 236, '64 维', 'demo-x-ink2', 11.5, 'middle');
    label(p3, R, 262, '为什么是 64：第 8 幕讲多头', 'demo-x-mut', 11.5);
    void big; void small;
    var p4 = group(s);
    label(p4, R, 64, '相容度：点积，不是加性注意力', 'demo-x-ink', 14);
    rectBox(p4, R, 84, W, 70, C_BORDER, C_SURFACE);
    label(p4, R + 12, 108, '加性注意力（Bahdanau）', 'demo-x-ink', 12.5);
    label(p4, R + 12, 132, '用一个单隐层网络算 q 和 k 的分数', 'demo-x-ink2', 11.5);
    rectBox(p4, R, 166, W, 70, C_GOOD, C_SURFACE);
    label(p4, R + 12, 190, '点积（这篇论文）', 'demo-x-ink', 12.5);
    label(p4, R + 12, 214, '就是矩阵乘法：更快，也更省显存（§3.2.1）', 'demo-x-ink2', 11.5);
    label(p4, R, 262, '两者理论复杂度差不多，快在有高度优化的矩阵乘法', 'demo-x-mut', 11.5);
    var p5 = group(s);
    label(p5, R, 64, '所有 query 一次算完', 'demo-x-ink', 14);
    math(p5, R, 100, 'QK^\\top \\in \\mathbb{R}^{n\\times n}', 16);
    var gr = attnGrid(p5, R + 10, 120, 6, 22, C_Q);
    label(p5, R + 160, 150, '一行一个 query', 'demo-x-ink2', 12);
    label(p5, R + 160, 174, '一列一个 key', 'demo-x-ink2', 12);
    label(p5, R + 160, 198, '整张表一次矩阵乘法', 'demo-x-ink2', 12);
    label(p5, R, 282, '对比 RNN：这一层里没有「等上一步」', 'demo-x-mut', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var base = Math.floor(now * 7.5) * 2;
      XS.forEach(function (cx, i) {
        cells[i].put(cx - 23, 44, 88, base + 4 * i);
        toks[i].set([0.7, 0.3, 0.9, 0.2, 0.6].map(function (x, j) { return ((x + 0.17 * i + 0.11 * j) % 1); }), 1);
        qs[i].set(QUERIES[i]);
        ks[i].set(ATT.keys[i]);
        vs[i].set(ATT.vals[i]);
        flows[i][0].at(now + i * 0.4, [cx, 180], [cx, 202], true);
        flows[i][1].at(now + i * 0.4, [cx, 242], [cx, 264], true);
      });
      var u5 = seg(since(t, clock, 13.4), 0.4, 0.8);
      gr.set(function (i, j) { return { a: u5 * (0.25 + 0.65 * Math.abs(Math.sin(0.9 * i + 1.3 * j + now))) }; });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 手算一次注意力 ── */
  function buildSceneAttention() {
    var s = sceneSvg('左上是第 t 步的 query 和三步的 key 各 4 格，右边依次出现点积 1、2、1，除以 2 后的 0.5、1、0.5，和 softmax 后的三根权重条；' +
      '左下是一个平面，三条 value 箭头按权重缩短、首尾相接，加出输出点 [0.548, 0.726]；右边逐步写出算式');
    rich(s, 24, 26, '玩具：机器人最近 3 步，$d_k=4$', 13.5);
    label(s, 24, 62, 'query（第 t 步）', 'demo-x-ink2', 12);
    var qRow = vecRow(s, 126, 46, 4, 24, C_Q, { h: 24 });
    var kRows = [], c1 = [], c2 = [], bars = [], wTxt = [];
    rich(s, 250, 92, '$q\\cdot k$', 11.5, 'demo-x-mut', 'middle', 60);
    label(s, 296, 92, '÷ 2', 'demo-x-mut', 11.5, 'middle');
    label(s, 352, 92, '权重', 'demo-x-mut', 11.5, 'middle');
    STEPS.forEach(function (st, i) {
      var y = 100 + i * 34;
      label(s, 24, y + 17, 'key（' + st + '）', 'demo-x-ink2', 12);
      kRows.push(vecRow(s, 126, y, 4, 24, C_K, { h: 24 }));
      c1.push(tone(s, 250, y + 17, '', C_INK, 13, 'middle'));
      c2.push(tone(s, 296, y + 17, '', C_INK, 13, 'middle'));
      bars.push(hbar(s, 322, y + 4, 16, C_V));
      wTxt.push(label(s, 330, y + 17, '', 'demo-x-ink', 11.5));
    });
    /* 平面：value 是 2 维的 */
    var OX = 60, OY = 370, S = 118;
    hline(s, OX - 10, OY, OX + 1.25 * S, OY, C_BORDER, 1.2);
    hline(s, OX, OY + 10, OX, OY - 1.2 * S, C_BORDER, 1.2);
    label(s, OX + 1.25 * S + 4, OY + 4, 'x', 'demo-x-mut', 11);
    label(s, OX - 4, OY - 1.2 * S - 4, 'y', 'demo-x-mut', 11, 'end');
    var vArr = [0, 1, 2].map(function () { return arrow(s, C_V, 1.6, '4 3'); });
    var wArr = [0, 1, 2].map(function () { return arrow(s, C_V, 3); });
    var outDot = dotAt(s, OX, OY, 6, C_Q);
    var outTxt = tone(s, OX + 12, OY - 1.2 * S + 6, '', C_Q, 12.5);
    label(s, 286, 270, 'value', 'demo-x-mut', 11.5);
    STEPS.forEach(function (st, i) { rich(s, 286, 294 + i * 24, 'v（' + st + '）$=[' + ATT.vals[i].join(', ') + ']$', 12); });
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '一行公式（式 1）', 'demo-x-ink', 14);
    math(p1, R, 112, '\\mathrm{Attention}(Q,K,V)=\\mathrm{softmax}\\!\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V', 15, 'start', 352);
    label(p1, R, 160, '向量是笔记构造的玩具数，只演示机制', 'demo-x-mut', 11.5);
    label(p1, R, 184, 'value 取 2 维，好画在左下的平面上', 'demo-x-mut', 11.5);
    var p2 = group(s);
    label(p2, R, 64, '① 点积', 'demo-x-ink', 14);
    ['q·k(t−2) = 1+0+0+0 = 1', 'q·k(t−1) = 1+0+1+0 = 2', 'q·k(t) = 0+0+1+0 = 1'].forEach(function (str, j) { label(p2, R, 100 + j * 28, str, 'demo-x-mono', 12.5); });
    label(p2, R, 200, 't−1 的 key 和 query 最像', 'demo-x-ink2', 12);
    var p3 = group(s);
    label(p3, R, 64, '② 缩放　③ softmax', 'demo-x-ink', 14);
    rich(p3, R, 98, '除以 √4 = 2：0.5 / 1 / 0.5', 12.5);
    rich(p3, R, 128, '$e^{0.5}=1.6487$，$e^{1}=2.7183$', 12.5);
    rich(p3, R, 156, '和 $=1.6487\\times 2+2.7183=6.0157$', 12.5);
    rich(p3, R, 192, '权重 $=$ **' + ATT.w.map(f3).join(' / ') + '**，加起来是 1', 12.5);
    var p4 = group(s);
    label(p4, R, 64, '④ value 按权重相加', 'demo-x-ink', 14);
    math(p4, R, 104, '0.274\\,[1,0]+0.452\\,[0,1]+0.274\\,[1,1]', 14, 'start', 352);
    math(p4, R, 140, '=[' + f3(ATT.out[0]) + ',\\ ' + f3(ATT.out[1]) + ']', 15);
    label(p4, R, 180, '左下：三条绿箭头首尾相接，终点就是输出', 'demo-x-ink2', 12);
    label(p4, R, 204, 't−1 那条最长：它拿得最多', 'demo-x-ink2', 12);
    var p5 = group(s);
    label(p5, R, 64, '一句话：谁和我像，就多拿谁的 value', 'demo-x-ink', 14);
    label(p5, R, 96, '真实模型里 q、k、v 都是 token 乘可学习矩阵得到的', 'demo-x-ink2', 12);
    label(p5, R, 120, '这里直接给出向量，跳过了投影', 'demo-x-ink2', 12);
    rectBox(p5, R, 140, W, 80, C_ROBOT, C_SURFACE);
    label(p5, R + 12, 164, '第 014 期论文的说法', 'demo-x-ink', 12.5);
    label(p5, R + 12, 188, '模型可以拿历史里「想到达」和「实际到达」', 'demo-x-ink2', 11.5);
    label(p5, R + 12, 208, '的状态作比较，决定下一步怎么改', 'demo-x-ink2', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      qRow.set(ATT.q);
      kRows.forEach(function (r, i) { r.set(ATT.keys[i]); });
      var a1 = seg(t, 3.9, 4.5), a2 = seg(t, 7.2, 7.8), a3 = seg(t, 7.9, 9.0);
      c1.forEach(function (c, i) { c.textContent = a1 > 0 ? String(ATT.raw[i]) : ''; setOpacity(c, a1); });
      c2.forEach(function (c, i) { c.textContent = a2 > 0 ? f1(ATT.scaled[i]) : ''; setOpacity(c, a2); });
      bars.forEach(function (b, i) { setW(b, ATT.w[i] * 90 * ease(a3)); wTxt[i].setAttribute('x', (326 + ATT.w[i] * 90 * ease(a3)).toFixed(1)); wTxt[i].textContent = a3 > 0.95 ? f3(ATT.w[i]) : ''; });
      /* 第 2 段起：第 t 步的 query 一闪一闪，表示「拿它去比」 */
      qRow.cells.forEach(function (c) { c.style.strokeWidth = t > 3.6 && t < 7.0 ? (1.2 + Math.abs(Math.sin(now * 4))).toFixed(1) : 1.2; });
      /* 平面：先画三条 value，第 4 段把它们按权重缩短、首尾相接 */
      var u = ease(seg(since(t, clock, 10.4), 0.3, 2.4)), px = OX, py = OY;
      ATT.vals.forEach(function (v, i) {
        vArr[i].set(OX, OY, OX + v[0] * S, OY - v[1] * S, 8);
        var sx = (u > 0 ? px : OX), sy = (u > 0 ? py : OY);
        var w = u > 0 ? ATT.w[i] : 1;
        var ex = sx + v[0] * S * w, ey = sy - v[1] * S * w;
        wArr[i].set(sx, sy, ex, ey, 9);
        setOpacity(wArr[i].g, u > 0 ? 1 : 0);
        setOpacity(vArr[i].g, 1 - 0.6 * u);
        px = ex; py = ey;
      });
      moveDot(outDot, [OX + ATT.out[0] * S * u, OY - ATT.out[1] * S * u]);
      setOpacity(outDot, u);
      outTxt.textContent = u > 0.98 ? '输出 [' + f3(ATT.out[0]) + ', ' + f3(ATT.out[1]) + ']' : '';
      outTxt.setAttribute('x', (OX + ATT.out[0] * S + 10).toFixed(1));
      outTxt.setAttribute('y', (OY - ATT.out[1] * S - 8).toFixed(1));
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 7: 为什么要除以 √d_k ── */
  /* 600 对 64 维标准正态向量的点积（确定性随机），第 7 幕的直方图和演示 tf-scale 用 */
  function dotSamples(dk, n, seed) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var s = 0;
      for (var j = 0; j < dk; j++) s += nrm(i * dk + j, seed) * nrm(i * dk + j, seed + 101);
      out.push(s);
    }
    return out;
  }
  var DOT64 = dotSamples(64, 600, 7);
  function stdOf(xs) {
    var m = 0, v = 0;
    xs.forEach(function (x) { m += x / xs.length; });
    xs.forEach(function (x) { v += (x - m) * (x - m) / xs.length; });
    return Math.sqrt(v);
  }
  function buildSceneScale() {
    var s = sceneSvg('左边上下两个直方图：上面是 64 维随机向量的点积，一个个落进格子，散得很开，标准差约 8；下面是同一批点积除以 8，挤在中间，标准差约 1；' +
      '右边依次出现：脚注 4 的算式；标准差的读数；同一组分数缩放前后的 softmax 柱；最大项梯度的两根条；以及三种模型每头的维数');
    rich(s, 24, 26, '随机向量的点积：$d_k$ 越大，散得越开', 13.5);
    var HX = 40, HW = 352, B = 64, LO = -32;
    function hist(y0, h, color, scale) {
      var g = group(s), bars = [];
      hline(g, HX, y0, HX + HW, y0, C_BORDER, 1.2);
      for (var i = 0; i < B; i++) bars.push(vbar(g, HX + i * HW / B, HW / B - 1, color));
      [-24, -16, -8, 0, 8, 16, 24].forEach(function (v) { label(g, HX + (v - LO) / 64 * HW, y0 + 15, sgn(String(v)), 'demo-x-mut', 10.5, 'middle'); });
      return { g: g, set: function (xs, m) {
        var cnt = [];
        for (var i = 0; i < B; i++) cnt.push(0);
        for (var k = 0; k < m; k++) { var b = Math.floor((xs[k] / scale - LO) / 64 * B); if (b >= 0 && b < B) cnt[b]++; }
        var mx = Math.max.apply(null, cnt) || 1;
        bars.forEach(function (bb, i) { bb.set(y0, cnt[i] / Math.max(mx, 6) * h); });
      } };
    }
    rich(s, 24, 52, '不缩放：$q\\cdot k$（$d_k=64$）', 12);
    var hTop = hist(164, 96, C_RNN, 1);
    var sdTop = tone(s, 392, 52, '', C_RNN, 12, 'end');
    label(s, 24, 212, '除以 √64 = 8', 'demo-x-ink2', 12);
    var hBot = hist(330, 96, C_GOOD, 8);
    var sdBot = tone(s, 392, 212, '', C_GOOD, 12, 'end');
    label(s, 24, 368, '横轴：点积的值；柱高：各自按最高的一格归一化', 'demo-x-mut', 11);
    label(s, 24, 388, '600 对随机向量，分量独立、均值 0、方差 1（玩具）', 'demo-x-mut', 11);
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '论文脚注 4', 'demo-x-ink', 14);
    math(p1, R, 104, 'q\\cdot k=\\sum_{i=1}^{d_k} q_i k_i', 16);
    math(p1, R, 150, '\\mathbb{E}[q\\cdot k]=0,\\qquad \\mathrm{Var}[q\\cdot k]=d_k', 15, 'start', 352);
    label(p1, R, 190, '前提：q、k 的分量独立、均值 0、方差 1', 'demo-x-ink2', 12);
    rich(p1, R, 214, '$d_k$ 个乘积加起来，方差就加到 $d_k$', 12);
    var p2 = group(s);
    rich(p2, R, 64, '$d_k=64$：标准差 8', 14, 'demo-x-ink');
    var r2 = [tone(p2, R, 100, '', C_RNN, 13), tone(p2, R, 128, '', C_GOOD, 13)];
    label(p2, R, 164, '分数动不动就上十，softmax 会被推向一边', 'demo-x-ink2', 12);
    rich(p2, R, 190, '除以 √$d_k$：方差拉回 1', 12.5);
    var p3 = group(s);
    label(p3, R, 64, '同一组分数：12 / 4 / −4 / 6', 'demo-x-ink', 14);
    var BX = [R + 20, R + 196], BY = 210, BH = 110;
    var sm = [SCALE.pRaw, SCALE.pScaled].map(function (p, g2) {
      label(p3, BX[g2] + 66, 92, g2 ? '除以 8' : '不缩放', g2 ? 'demo-x-good' : 'demo-x-bad', 12, 'middle');
      hline(p3, BX[g2] - 4, BY, BX[g2] + 136, BY, C_BORDER, 1.2);
      return p.map(function (v, i) {
        var b = vbar(p3, BX[g2] + i * 34, 26, g2 ? C_GOOD : C_RNN);
        var tx = label(p3, BX[g2] + i * 34 + 13, BY - 6, '', 'demo-x-ink', 11, 'middle');
        return { b: b, tx: tx, v: v };
      });
    });
    label(p3, R, 236, 'softmax 后的权重：柱越高拿得越多', 'demo-x-mut', 11.5);
    var p4 = group(s);
    label(p4, R, 64, '最大项处的梯度 p(1−p)', 'demo-x-ink', 14);
    var gb = [barRowAt(p4, R, 96, 70, '不缩放', C_RNN, 22, 12), barRowAt(p4, R, 136, 70, '除以 8', C_GOOD, 22, 12)];
    var ratio = label(p4, R, 196, '', 'demo-x-ink', 13);
    label(p4, R, 222, '梯度几乎为 0，这一层的注意力就学不动', 'demo-x-ink2', 12);
    var p5 = group(s);
    label(p5, R, 64, '论文自己说：这是一个猜测', 'demo-x-ink', 14);
    rich(p5, R, 94, '原文 “We suspect”：依据是大 $d_k$ 时，', 12);
    label(p5, R, 116, '不缩放的点积注意力不如加性注意力', 'demo-x-ink2', 12);
    var hd = HEAD_DIMS.map(function (h, i) { return barRowAt(p5, R, 140 + i * 30, 150, h[0], i === 1 ? C_ACCENT : C_ROBOT, 18, 11.5); });
    rich(p5, R, 248, '条：不缩放时点积的标准差 √$d_k$', 11.5, 'demo-x-mut');
    label(p5, R, 272, 'LaTeX 源码里还留着一段被注释掉的附录：', 'demo-x-mut', 11);
    label(p5, R, 292, '缩放因子的粗略论证', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var m = Math.min(DOT64.length, 20 + Math.floor(now * 40) % 700);
      hTop.set(DOT64, m); hBot.set(DOT64, m);
      var sd = stdOf(DOT64.slice(0, Math.max(2, m)));
      sdTop.textContent = '标准差 ' + f1(sd); sdBot.textContent = '标准差 ' + f2(sd / 8);
      r2[0].textContent = '不缩放：' + m + ' 个样本，标准差 ' + f1(sd);
      r2[1].textContent = '除以 8：标准差 ' + f2(sd / 8);
      var u3 = seg(since(t, clock, 7.0), 0.3, 1.8);
      sm.forEach(function (gp) { gp.forEach(function (c) { c.b.set(BY, Math.max(1, c.v * BH * u3)); c.tx.setAttribute('y', (BY - Math.max(1, c.v * BH * u3) - 6).toFixed(1)); c.tx.textContent = u3 > 0.95 ? (c.v < 0.01 ? '≈0' : f3(c.v)) : ''; }); });
      var u4 = seg(since(t, clock, 10.4), 0.3, 1.8);
      gb[0].set(SCALE.gRaw / 0.25 * 240 * u4, f4(SCALE.gRaw * u4));
      gb[1].set(SCALE.gScaled / 0.25 * 240 * u4, f3(SCALE.gScaled * u4));
      ratio.textContent = u4 > 0.95 ? '差约 ' + Math.round(SCALE.gScaled / SCALE.gRaw) + ' 倍' : '';
      var u5 = seg(since(t, clock, 13.4), 0.3, 1.6);
      hd.forEach(function (b, i) { b.set(Math.sqrt(HEAD_DIMS[i][1]) * 6 * u5, '每头 ' + HEAD_DIMS[i][1] + ' 维 → ' + f1(Math.sqrt(HEAD_DIMS[i][1]))); });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }
  function f4(x) { return fmt(x, 4); }

  /* ── scene 8: 多头：8 个 64 维的头 ── */
  function buildSceneHeads() {
    var s = sceneSvg('左上一条 512 维的长条切成 8 段，每段落进自己的小注意力矩阵，8 个图案各不相同，再拼回一条、乘 W^O；左下是论文附录图 3，第 5 层里很多头都盯着远处的 more difficult；' +
      '右边依次出现：一个头会把两种关系平均掉；多头的公式、论文图 2 右与「总计算量不变」；表 3 A 组的头数柱；B 组的 d_k 柱；附录图 4 的指代消解与机器人模型的头数');
    s.appendChild(svgText(24, 26, '8 个头，每个 64 维，各看各的', 'demo-x-ink2', 13.5));
    var BX = 24, hw = 46;
    var strips = [], minis = [], cat = [];
    for (var j = 0; j < 8; j++) {
      strips.push(paint(svgEl('rect', { x: BX + j * hw, y: 50, width: hw - 3, height: 18, rx: 2 }), HEAD_COLORS[j]));
      s.appendChild(strips[j]);
      minis.push(attnGrid(s, BX + j * hw + 2, 98, 4, 10, HEAD_COLORS[j]));
      cat.push(paint(svgEl('rect', { x: BX + j * hw, y: 166, width: hw - 3, height: 18, rx: 2 }), HEAD_COLORS[j]));
      s.appendChild(cat[j]);
    }
    label(s, BX + 8 * hw, 44, '一个 token：512 维，切成 8 段', 'demo-x-mut', 11, 'end');
    label(s, BX + 8 * hw, 92, '8 个头各算一次注意力', 'demo-x-mut', 11, 'end');
    rich(s, BX, 204, '拼接（Concat）回 512 维，再乘 $W^O$；小格的图案只是示意', 11, 'demo-x-mut', 'start', 370);
    var drops = [];
    for (j = 0; j < 8; j++) drops.push(flowSeg(s, HEAD_COLORS[j], 1, 2.6, 18, true));
    var viz = paperPart(s, 'making', 0, 0.12, 1, 0.78, BX, 222, 360, '');
    label(s, BX, 222 + viz.h + 18, '论文图 3（附录）：第 5 层，多个头都盯着远处的 “more difficult”', 'demo-x-mut', 10.5);
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '一个头只给一组权重', 'demo-x-ink', 14);
    label(p1, R, 96, '假如两种关系都重要：一个看近处，一个看最开头', 'demo-x-ink2', 12);
    var near = attnGrid(p1, R, 116, 6, 14, C_Q), far = attnGrid(p1, R + 110, 116, 6, 14, C_K), avg = attnGrid(p1, R + 236, 116, 6, 14, C_MUTED);
    label(p1, R + 42, 216, '看近处', 'demo-x-ink2', 11.5, 'middle'); label(p1, R + 152, 216, '看最开头', 'demo-x-ink2', 11.5, 'middle'); label(p1, R + 278, 216, '平均成一个', 'demo-x-ink2', 11.5, 'middle');
    label(p1, R, 250, '§3.2.2：只有一个头时，平均会抑制这种能力', 'demo-x-ink2', 12);
    label(p1, R, 272, '（两种关系的例子是我们编的示意）', 'demo-x-mut', 11);
    var p2 = group(s);
    label(p2, R, 64, '多头：切成 8 份并行算', 'demo-x-ink', 14);
    math(p2, R, 100, '\\mathrm{MultiHead}=\\mathrm{Concat}(\\mathrm{head}_1,\\dots,\\mathrm{head}_8)\\,W^O', 13.5, 'start', 352);
    math(p2, R, 134, '\\mathrm{head}_i=\\mathrm{Attention}(QW_i^Q,KW_i^K,VW_i^V)', 13.5, 'start', 352);
    rectBox(p2, R, 160, 72, 72, C_MUTED, C_SURFACE2);
    for (j = 0; j < 8; j++) { var rr = paint(svgEl('rect', { x: R + 96 + j * 13, y: 160, width: 9, height: 72, rx: 2 }), HEAD_COLORS[j]); p2.appendChild(rr); }
    label(p2, R + 36, 250, '1 个 512 维', 'demo-x-ink2', 11, 'middle');
    label(p2, R + 146, 250, '8 个 64 维', 'demo-x-ink2', 11, 'middle');
    label(p2, R, 274, '每头维度缩成八分之一：总计算量差不多', 'demo-x-ink2', 12);
    var mha = paperPart(p2, 'mha', 0, 0, 1, 0.82, R + 262, 150, 84, '');
    label(p2, R + 304, 150 + mha.h + 16, '论文图 2 右', 'demo-x-mut', 10.5, 'middle');
    var p3 = group(s);
    label(p3, R, 64, '表三 A 组：计算量不变，只改头数', 'demo-x-ink', 14);
    readHint(p3, R, 88, 'dev BLEU，**越高越好**', 11.5);
    var hb = HEADS.map(function (h, i) { return barRowAt(p3, R, 104 + i * 30, 96, h.h + ' 头 · ' + h.dk + ' 维', h.h === 8 ? C_ACCENT : C_MUTED, 18, 11.5); });
    label(p3, R, 270, '条从 24 分画起；1 头比最好低 0.9 分', 'demo-x-mut', 11);
    var p4 = group(s);
    rich(p4, R, 64, '表三 B 组：只缩小 $d_k$', 14, 'demo-x-ink');
    readHint(p4, R, 88, 'dev BLEU，**越高越好**', 11.5);
    var kb = KEYDIM.map(function (k, i) { return barRowAt(p4, R, 104 + i * 32, 96, '$d_k=' + k.dk + '$', k.dk === 64 ? C_ACCENT : C_MUTED, 20, 11.5); });
    label(p4, R, 220, '判断相容性并不容易，', 'demo-x-ink2', 12);
    label(p4, R, 244, '也许需要比点积更复杂的函数（§6.2）', 'demo-x-ink2', 12);
    var p5 = group(s);
    var its = paperPart(p5, 'its', 0, 0.12, 1, 0.92, R, 62, 250, '');
    label(p5, R, 62 + its.h + 18, '论文图 4（附录）：“its” 指向 “Law”，像在做指代消解', 'demo-x-mut', 10.5);
    label(p5, R, 62 + its.h + 42, '定性观察，论文没有量化每个头的功能', 'demo-x-ink2', 11.5);
    rich(p5, R, 62 + its.h + 66, 'Digit：4 头 × 48 维；π₀ 的 Gemma：8 个头共用 1 组 K、V', 11.5);
    var hiF = rectBox(s, BX, 222, 360, viz.h, C_BAD, 'none'); hiF.style.fill = 'none';
    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* 8 个头：第 j 个头看往前 j mod 4 格（只是示意的图案） */
      minis.forEach(function (mg, hj) {
        mg.set(function (i, k) { var off = (hj % 4), want = Math.max(0, i - off); var a = k === want ? 1 : k <= i ? 0.18 : 0.05; return { a: a * (0.6 + 0.4 * Math.abs(Math.sin(now * 1.3 + hj))) }; });
        drops[hj].at(now + hj * 0.2, [BX + hj * hw + 21, 72], [BX + hj * hw + 21, 94], true);
      });
      var pulse = 0.5 + 0.5 * Math.sin(now * 2);
      near.set(function (i, k) { return { a: Math.abs(i - k) <= 1 && k <= i ? 0.9 : 0.06 }; });
      far.set(function (i, k) { return { a: k === 0 ? 0.9 : 0.06 }; });
      avg.set(function (i, k) { var a = ((Math.abs(i - k) <= 1 && k <= i) ? 0.45 : 0) + (k === 0 ? 0.45 : 0); return { a: Math.max(0.06, a * (0.7 + 0.3 * pulse)) }; });
      var u3 = seg(since(t, clock, 7.0), 0.3, 2.0);
      hb.forEach(function (b, i) { b.set((HEADS[i].bleu - 24) / 2.2 * 200 * u3, f1(24 + (HEADS[i].bleu - 24) * u3)); });
      var u4 = seg(since(t, clock, 10.4), 0.3, 2.0);
      kb.forEach(function (b, i) { b.set((KEYDIM[i].bleu - 24) / 2.2 * 200 * u4, f1(24 + (KEYDIM[i].bleu - 24) * u4)); });
      hiF.style.opacity = (winK(t, 4) * (0.4 + 0.4 * Math.sin(now * 2))).toFixed(2);
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: 位置编码：把顺序加回来 ── */
  function buildScenePE() {
    var s = sceneSvg('左上四条正弦，频率一条比一条低，一根竖线沿位置往右扫，四个小点读出这一位置的编码；左下两个表盘，一个每步转 1 弧度，一个每步只转 0.01 弧度；' +
      '右边依次出现：打乱顺序输出只跟着换位；位置编码的公式；d_model = 4 的两个位置的编码值；相对位置是线性函数的假设和表 3 E 组；机器人模型里三种用法');
    s.appendChild(svgText(24, 26, '每一维一条正弦，频率越来越低', 'demo-x-ink2', 13.5));
    var PX = 60, PW = 330, POS = 40, RH = 44, Y0 = 86;
    var FREQ = [0, 1, 2, 3].map(function (i) { return 1 / Math.pow(10000, (2 * i) / 16); });
    var waves = FREQ.map(function (fq, i) {
      var y = Y0 + i * RH, pts = [];
      for (var p = 0; p <= POS * 4; p++) pts.push([PX + p / 4 / POS * PW, y - 16 * Math.sin(p / 4 * fq)]);
      hline(s, PX, y, PX + PW, y, C_BORDER, 0.8);
      pathLine(s, pts, C_WARN, 1.8);
      rich(s, 24, y + 4, '$i=' + i + '$', 11.5, 'demo-x-mut');
      return { y: y, fq: fq, d: dotAt(s, PX, y, 4.5, C_Q) };
    });
    label(s, PX, Y0 + 3 * RH + 34, '位置 pos：0', 'demo-x-mut', 11);
    label(s, PX + PW, Y0 + 3 * RH + 34, '40', 'demo-x-mut', 11, 'end');
    var cur = hline(s, PX, Y0 - 24, PX, Y0 + 3 * RH + 20, C_Q, 1.4, '4 3');
    var posTxt = tone(s, PX + PW, 50, '', C_Q, 12, 'end');
    rich(s, 24, 52, '示意：$d_{model}=16$ 的前四对', 11, 'demo-x-mut');
    /* 两个表盘：玩具 d_model = 4，两对 sin / cos 每步各转 1 和 0.01 弧度 */
    var dials = [1, 0.01].map(function (fq, i) {
      var cx = 100 + i * 150, cy = 330, r = 36;
      ringAt(s, cx, cy, r, C_BORDER, 1.4);
      var hand = arrow(s, i ? C_ACCENT : C_WARN, 2.6);
      label(s, cx, cy + r + 18, i ? '后两维：每步 0.01 弧度' : '前两维：每步 1 弧度', 'demo-x-ink2', 11.5, 'middle');
      return { cx: cx, cy: cy, r: r, fq: fq, hand: hand };
    });
    rich(s, 300, 324, '玩具 $d_{model}=4$', 11, 'demo-x-mut');
    var dialPos = tone(s, 300, 346, '', C_Q, 12);
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '注意力本身不分先后', 'demo-x-ink', 14);
    var tokN = ['A', 'B', 'C', 'D'], tokC = [], outC = [];
    tokN.forEach(function (n, i) {
      tokC.push(chip(p1, R + i * 70, 96, 56, n, C_Q, { size: 13 }));
      outC.push(chip(p1, R + i * 70, 176, 56, 'z(' + n + ')', C_V, { size: 12 }));
    });
    label(p1, R, 156, '自注意力', 'demo-x-mut', 11);
    label(p1, R, 246, '打乱输入，输出只是跟着换位', 'demo-x-ink2', 12);
    rich(p1, R, 270, '所以要把位置信号**加进输入**（§3.5）', 12.5);
    var p2 = group(s);
    label(p2, R, 64, '正弦 / 余弦位置编码', 'demo-x-ink', 14);
    math(p2, R, 104, 'PE_{(pos,2i)}=\\sin\\!\\left(pos/10000^{2i/d_{model}}\\right)', 14, 'start', 352);
    math(p2, R, 140, 'PE_{(pos,2i+1)}=\\cos\\!\\left(pos/10000^{2i/d_{model}}\\right)', 14, 'start', 352);
    rich(p2, R, 180, '波长从 $2\\pi$ 到 $10000\\cdot 2\\pi$，成几何级数', 12.5);
    label(p2, R, 206, '和嵌入一样 512 维，直接相加', 'demo-x-ink2', 12);
    var p3 = group(s);
    rich(p3, R, 64, '玩具：$d_{model}=4$', 14, 'demo-x-ink');
    label(p3, R, 96, 'PE(1)', 'demo-x-mono', 12); var pe1 = vecRow(p3, R + 56, 80, 4, 62, C_WARN, { h: 24 });
    label(p3, R, 136, 'PE(2)', 'demo-x-mono', 12); var pe2 = vecRow(p3, R + 56, 120, 4, 62, C_WARN, { h: 24 });
    rich(p3, R, 178, '$i=0$ 的频率是 1，$i=1$ 的是 $1/10000^{2/4}=1/100$', 12);
    label(p3, R, 204, '前两维每步转 1 弧度，后两维只转 0.01 弧度', 'demo-x-ink2', 12);
    var p4 = group(s);
    label(p4, R, 64, '为什么选正弦：作者的假设', 'demo-x-ink', 14);
    rich(p4, R, 96, '固定偏移 $k$：$PE_{pos+k}$ 是 $PE_{pos}$ 的线性函数', 12);
    label(p4, R, 120, '每对 sin / cos 转过一个固定角度（左下的表盘）', 'demo-x-ink2', 12);
    readHint(p4, R, 150, '表三 E 组，dev BLEU **越高越好**', 11.5);
    var eb = [barRowAt(p4, R, 162, 110, '正弦（base）', C_ACCENT, 18, 11.5), barRowAt(p4, R, 190, 110, '可学习的位置嵌入', C_MUTED, 18, 11.5)];
    label(p4, R, 240, '几乎一样；选正弦是因为可能外推到更长的序列', 'demo-x-ink2', 12);
    label(p4, R, 262, '（论文没给外推的实验）', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, '机器人里，同一个正弦函数', 'demo-x-ink', 14);
    [['Digit（第 014 期）', '16 个 token 加正弦位置编码'], ['Diffusion Policy（第 010 期）', '扩散步 $k$ 的正弦嵌入当第一个 token'], ['π₀（第 045 期）', '流匹配的时间 $\\tau$ 也用它编码']].forEach(function (r, i) {
      var y = 84 + i * 62;
      rectBox(p5, R, y, W, 52, C_ROBOT, C_SURFACE);
      label(p5, R + 12, y + 21, r[0], 'demo-x-ink', 12.5);
      rich(p5, R + 12, y + 42, r[1], 11.5, 'demo-x-ink2', 'start', W - 20);
    });
    label(p5, R, 292, '编码的是「第几步」或「去噪到哪」（本站笔记）', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var pos = (now * 4) % POS, x = PX + pos / POS * PW;
      setLine(cur, x, Y0 - 24, x, Y0 + 3 * RH + 20);
      waves.forEach(function (w) { moveDot(w.d, [x, w.y - 16 * Math.sin(pos * w.fq)]); });
      posTxt.textContent = 'pos = ' + f1(pos);
      var step = Math.floor(now * 1.5) % 7;
      dials.forEach(function (d) { var a = step * d.fq; d.hand.set(d.cx, d.cy, d.cx + d.r * Math.sin(a), d.cy - d.r * Math.cos(a), 9); });
      dialPos.textContent = 'pos = ' + step;
      /* 第 1 段：B 和 C 换位，输出跟着换 */
      var sw = Math.floor(since(t, clock, 0.4) / 1.6) % 2, ph = seg((since(t, clock, 0.4) % 1.6), 0, 0.5);
      var ex = sw ? ease(ph) : 1 - ease(ph), dx = 70 * ex, dy = 22 * Math.min(1, 2 * Math.sin(Math.PI * ex));  // 换位时一上一下绕开，不互相压住
      [tokC, outC].forEach(function (row) {
        row[1].setAttribute('transform', 'translate(' + dx.toFixed(1) + ' ' + (-dy).toFixed(1) + ')');
        row[2].setAttribute('transform', 'translate(' + (-dx).toFixed(1) + ' ' + dy.toFixed(1) + ')');
      });
      pe1.set(PE1, 3); pe2.set(PE2, 3);
      var u4 = seg(since(t, clock, 10.4), 0.3, 1.8);
      eb[0].set((25.8 - 24) / 2.2 * 200 * u4, f1(24 + 1.8 * u4)); eb[1].set((25.7 - 24) / 2.2 * 200 * u4, f1(24 + 1.7 * u4));
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: 一层里还有什么：残差、LayerNorm、FFN ── */
  function buildSceneBlock() {
    var s = sceneSvg('左边是一层编码器：下面进来 6 个 token，先过多头自注意力，加上绕过去的残差，做 LayerNorm，再过前馈网络，再加残差、再 LayerNorm；' +
      '小点沿主路和两条残差路往上走，旁边写着乘 6；右边依次出现：残差与 LayerNorm 的式子；逐位置前馈网络；参数怎么数；残差 dropout；论文和代码的翻牌');
    s.appendChild(svgText(24, 26, '一层编码器 = 两个子层，各包一层残差', 'demo-x-ink2', 13.5));
    var BX = 70, BW = 220, CX = BX + BW / 2;
    var inRow = cellGrid(s, CX - 63, 372, 6, 6, 18, 3, C_ROBOT);
    label(s, CX + 74, 386, '输入 token', 'demo-x-mut', 11);
    var att = chip(s, BX, 304, BW, '多头自注意力', C_ACCENT, { size: 13, h: 34 });
    var add1 = chip(s, BX, 252, BW, '相加 → LayerNorm', C_WARN, { size: 12.5, h: 30 });
    var ffn = chip(s, BX, 182, BW, '前馈网络 512 → 2048 → 512', C_V, { size: 12.5, h: 34 });
    var add2 = chip(s, BX, 130, BW, '相加 → LayerNorm', C_WARN, { size: 12.5, h: 30 });
    var outRow = cellGrid(s, CX - 63, 76, 6, 6, 18, 3, C_ACCENT);
    label(s, CX + 74, 90, '输出 token', 'demo-x-mut', 11);
    label(s, BX + BW + 34, 236, '× 6 层', 'demo-x-ink', 15);
    var skip1 = pathLine(s, [[CX, 360], [BX - 22, 360], [BX - 22, 267], [BX, 267]], C_MUTED, 1.6, '5 4');
    var skip2 = pathLine(s, [[CX, 240], [BX - 22, 240], [BX - 22, 145], [BX, 145]], C_MUTED, 1.6, '5 4');
    label(s, BX - 26, 316, '残差', 'demo-x-mut', 11, 'end');
    label(s, BX - 26, 196, '残差', 'demo-x-mut', 11, 'end');
    var mainF = [[CX, 370, CX, 340], [CX, 304, CX, 284], [CX, 252, CX, 218], [CX, 182, CX, 162], [CX, 130, CX, 98]].map(function () { return flowSeg(s, C_INK, 1, 2.8, 28, true); });
    var skipF = [flowSeg(s, C_MUTED, 2, 2.6, 40, true), flowSeg(s, C_MUTED, 2, 2.6, 40, true)];
    void skip1; void skip2; void att; void add1; void ffn; void add2;
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '残差 + LayerNorm（§3.1）', 'demo-x-ink', 14);
    math(p1, R, 104, '\\mathrm{LayerNorm}(x+\\mathrm{Sublayer}(x))', 16);
    label(p1, R, 144, '子层算出来的东西，加回原来的输入，再归一化', 'demo-x-ink2', 12);
    rich(p1, R, 170, '所有子层和嵌入都输出 $d_{model}=512$ 维，残差才加得上', 12);
    label(p1, R, 196, '残差来自 He 等，LayerNorm 来自 Ba 等', 'demo-x-mut', 11.5);
    var p2 = group(s);
    label(p2, R, 64, '逐位置前馈网络（§3.3）', 'demo-x-ink', 14);
    math(p2, R, 100, '\\mathrm{FFN}(x)=\\max(0,\\,xW_1+b_1)\\,W_2+b_2', 14, 'start', 352);
    var NODES = [3, 8, 3], nx = [R + 60, R + 160, R + 260], nn = [];
    NODES.forEach(function (n, c) {
      nn.push([]);
      for (var i = 0; i < n; i++) nn[c].push([nx[c], 178 - (n - 1) * 9 + i * 18]);
    });
    for (var c = 0; c < 2; c++) nn[c].forEach(function (a) { nn[c + 1].forEach(function (b) { hline(p2, a[0], a[1], b[0], b[1], C_BORDER, 0.7); }); });
    var nDots = nn.map(function (col, c2) { return col.map(function (p) { return dotAt(p2, p[0], p[1], 5, c2 === 1 ? C_V : C_MUTED); }); });
    label(p2, nx[0], 262, '512', 'demo-x-mono', 11.5, 'middle'); label(p2, nx[1], 262, '2048（ReLU）', 'demo-x-mono', 11.5, 'middle'); label(p2, nx[2], 262, '512', 'demo-x-mono', 11.5, 'middle');
    var posTag = tone(p2, R, 290, '', C_ROBOT, 12);
    label(p2, R, 312, '每个位置单独过、参数共用：相当于核宽为 1 的卷积', 'demo-x-ink2', 11.5);
    var p3 = group(s);
    label(p3, R, 64, '按标准结构数一数参数（我们的计算）', 'demo-x-ink', 13.5);
    readHint(p3, R, 88, '条越长参数越多；左边论文表三，右边我们数的', 11);
    var pb = [
      barRowAt(p3, R, 104, 110, 'base · 论文', C_ACCENT, 18, 11.5), barRowAt(p3, R, 128, 110, 'base · 我们数', C_MUTED, 18, 11.5),
      barRowAt(p3, R, 162, 110, 'big · 论文', C_ACCENT, 18, 11.5), barRowAt(p3, R, 186, 110, 'big · 我们数', C_MUTED, 18, 11.5),
      barRowAt(p3, R, 220, 110, 'Digit 行走', C_ROBOT, 18, 11.5)
    ];
    label(p3, R, 266, '共享嵌入 37000 × 512，Q、K、V 不带偏置', 'demo-x-mut', 11);
    label(p3, R, 286, 'base 差 3%，big 差 0.5%，论文没给逐层参数', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 64, '残差 dropout 0.1（§5.4）', 'demo-x-ink', 14);
    label(p4, R, 96, '每个子层的输出，在加回去之前随机丢掉 10%', 'demo-x-ink2', 12);
    label(p4, R, 120, '嵌入 + 位置编码之和也做 dropout', 'demo-x-ink2', 12);
    var dGrid = cellGrid(p4, R, 140, 80, 20, 14, 3, C_V);
    label(p4, R, 240, '亮着的格子留下；暗的格子这一步被丢掉', 'demo-x-mut', 11.5);
    readHint(p4, R, 266, '表三 D 组：去掉 dropout，dev BLEU 25.8 → 24.6', 11.5);
    var p5 = group(s);
    label(p5, R, 64, '论文 ↔ tensor2tensor 现在的默认', 'demo-x-ink', 14);
    var flips = flipList(p5, R, 84, [['归一化放在哪', '子层之后', '子层之前'], ['预热步数', '4000', '8000'], ['Adam 的 $\\beta_2$', '0.98', '0.997']], 110, 140);
    label(p5, R, 222, '默认的 transformer_base 继承 v2 / v3', 'demo-x-ink2', 12);
    label(p5, R, 246, '复现论文要切回 transformer_base_v1', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      inRow.fill(6); outRow.fill(6);
      var segs = [[CX, 370, CX, 340], [CX, 304, CX, 284], [CX, 252, CX, 218], [CX, 182, CX, 162], [CX, 130, CX, 98]];
      mainF.forEach(function (f, i) { f.at(now - i * 0.3, [segs[i][0], segs[i][1]], [segs[i][2], segs[i][3]], true); });
      skipF[0].at(now, [BX - 22, 358], [BX - 22, 270], true);
      skipF[1].at(now + 0.5, [BX - 22, 238], [BX - 22, 148], true);
      /* 第 2 段：一个位置一个位置地过同一个网络 */
      var pk = Math.floor(since(t, clock, 3.6) * 1.4) % 6, act = (since(t, clock, 3.6) * 1.4) % 1;
      nDots.forEach(function (col, c3) { col.forEach(function (d, i) { d.style.opacity = (seg(act, c3 * 0.25, c3 * 0.25 + 0.2) > 0 ? (c3 === 1 && (i % 3 === 0) ? 0.3 : 1) : 0.3).toFixed(2); }); });
      posTag.textContent = '现在过的是第 ' + (pk + 1) + ' 个位置';
      var u3 = seg(since(t, clock, 7.0), 0.3, 2.0), base = PARAMS_BASE.total / 1e6, big = PARAMS_BIG.total / 1e6;
      [[65, '65 M'], [base, f1(base) + ' M'], [213, '213 M'], [big, f1(big) + ' M'], [1.4, '1.4 M']].forEach(function (v, i) { pb[i].set(v[0] / 214 * 160 * u3, u3 > 0.95 ? v[1] : ''); });
      var kk = Math.floor(since(t, clock, 10.4) * 2);
      dGrid.cells.forEach(function (c4, j) { c4.style.opacity = rnd(j + 80 * kk, 3) < 0.1 ? 0.12 : 0.95; });
      flips.set(since(t, clock, 13.4));
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 11: 因果掩码：只看过去 ── */
  function buildSceneMask() {
    var s = sceneSvg('左边是一张 6 × 6 的注意力表，行是机器人的 6 步 query、列是 6 步 key，右上三角一格格被盖上负无穷，剩下的格子按行重新分配权重，计数显示留下 21 / 36 对；' +
      '右边依次出现：softmax 前把未来设成负无穷；输出右移一位；第 014 期项目页视频里 Digit 被台阶绊住、下一步抬得更高；代码里的负十的九次方；π₀ 的分块掩码与 MaskedMimic');
    s.appendChild(svgText(24, 26, '一张注意力表：只留下「看过去」的格子', 'demo-x-ink2', 13.5));
    var N = MASK_N, GX = 92, GY = 72, CS = 40;
    var grid = attnGrid(s, GX, GY, N, CS, C_Q);
    var negs = [];
    for (var i = 0; i < N; i++) {
      var nm = i === N - 1 ? 't' : 't−' + (N - 1 - i);
      label(s, GX - 8, GY + i * CS + CS / 2 + 4, nm, 'demo-x-mono', 11, 'end');
      label(s, GX + i * CS + CS / 2 - 1, GY - 8, nm, 'demo-x-mono', 11, 'middle');
      for (var j = 0; j < N; j++) negs.push({ i: i, j: j, tx: j > i ? label(s, GX + j * CS + CS / 2 - 1, GY + i * CS + CS / 2 + 4, '−∞', 'demo-x-ink', 11, 'middle') : null });
    }
    label(s, GX, GY + N * CS + 22, '行：query（哪一步在看）　列：key（被看的那一步）', 'demo-x-mut', 11);
    var cnt = tone(s, GX, GY + N * CS + 44, '', C_Q, 12.5);
    var rowHi = rectBox(s, GX - 2, GY, N * CS, CS - 2, C_INK, 'none'); rowHi.style.fill = 'none'; rowHi.setAttribute('stroke-width', 2);
    var W0 = [];
    for (i = 0; i < N; i++) { W0.push([]); for (j = 0; j < N; j++) W0[i].push(0.3 + rnd(i * 7 + j, 11)); }
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '解码器的自注意力不能偷看未来', 'demo-x-ink', 14);
    rich(p1, R, 96, 'softmax 之前，把非法连接的分数设成 $-\\infty$（§3.2.3）', 12);
    math(p1, R, 136, 'e^{-\\infty}=0\\ \\Rightarrow\\ \\text{权重}=0', 15);
    label(p1, R, 176, '左表：盖住的格子不参与，每一行剩下的重新加到 1', 'demo-x-ink2', 12);
    rich(p1, R, 202, '$n$ 个位置留下 $n(n+1)/2$ 对：6 步是 21 / 36', 12);
    var p2 = group(s);
    label(p2, R, 64, '输出再右移一位（§3.1）', 'demo-x-ink', 14);
    var IN = ['起始', '$y_1$', '$y_2$', '$y_3$'], OUT = ['$y_1$', '$y_2$', '$y_3$', '$y_4$'];
    var inC = IN.map(function (n, k) { return chip(p2, R + k * 72, 96, 60, n, C_Q, { size: 13.5 }); });
    var outC = OUT.map(function (n, k) { return chip(p2, R + k * 72, 176, 60, n, C_V, { size: 13.5 }); });
    label(p2, R + W, 116, '输入', 'demo-x-mut', 11, 'end'); label(p2, R + W, 196, '要预测的', 'demo-x-mut', 11, 'end');
    var shiftF = [0, 1, 2, 3].map(function () { return flowSeg(p2, C_MUTED, 1, 2.6, 24); });
    label(p2, R, 236, '位置 i 的预测只依赖 i 之前已经知道的输出', 'demo-x-ink2', 12);
    void inC; void outC;
    var p3 = group(s);
    label(p3, R, 64, '机器人部署时，同样看不到未来', 'demo-x-ink', 14);
    var clip = projClip(p3, 'rh_step', R, 80, 272, 153, '第 014 期项目页视频（未标倍速）：脚被台阶绊住');
    label(p3, R, 268, 'Digit 的因果 Transformer：16 个 token 留下 136 / 256 对', 'demo-x-ink2', 11.5);
    label(p3, R, 290, '论文说它只靠观测—动作历史，下一步就抬得更高、更快', 'demo-x-ink2', 11.5);
    var p4 = group(s);
    rich(p4, R, 64, '代码里 $-\\infty$ 写成 $-10^9$', 14, 'demo-x-ink');
    rectBox(p4, R, 84, W, 70, C_BORDER, C_SURFACE);
    label(p4, R + 12, 108, 'attention_bias_lower_triangle', 'demo-x-mono', 12);
    label(p4, R + 12, 134, 'return -1e9 * (1.0 - band)', 'demo-x-mono', 12);
    rich(p4, R, 186, '下三角带内加 0，带外加 $-10^9$：softmax 后同样是 0', 12);
    rich(p4, R, 210, '半精度装不下 $-10^9$，另有 `large_compatible_negative`', 12);
    var p5 = group(s);
    label(p5, R, 64, '掩码还能是别的形状', 'demo-x-ink', 14);
    var blk = attnGrid(p5, R, 86, 8, 18, C_ROBOT);
    var BLOCK = [0, 0, 0, 0, 1, 2, 2, 2];
    label(p5, R, 248, '前 4 格图文、1 格状态、3 格动作（示意）', 'demo-x-mut', 11);
    label(p5, R + 160, 100, 'π₀：三块的分块因果掩码', 'demo-x-ink', 12.5);
    label(p5, R + 160, 124, '块内互相看，块间只看前面的块', 'demo-x-ink2', 11.5);
    label(p5, R + 160, 166, 'MaskedMimic（第 028 期）', 'demo-x-ink', 12.5);
    label(p5, R + 160, 190, '没给的目标用注意力掩码排除，', 'demo-x-ink2', 11.5);
    label(p5, R + 160, 210, 'token 数可以变', 'demo-x-ink2', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* 盖住的格子一格一格出现：0.6 s 起，15 格用 2.4 s */
      var cover = Math.floor(seg(t, 0.6, 3.0) * 15), idx = 0;
      var masked = function (i2, j2) { if (j2 <= i2) return false; var k = 0; for (var a = 0; a < N; a++) for (var b = a + 1; b < N; b++) { if (a === i2 && b === j2) return k < cover; k++; } return false; };
      var row = Math.floor(now / 1.2) % N;
      grid.set(function (i2, j2) {
        if (masked(i2, j2)) return { a: 0.3, color: C_RNN };
        var tot = 0;
        for (var b = 0; b < N; b++) if (!masked(i2, b)) tot += W0[i2][b];
        return { a: clamp(0.15 + 1.6 * W0[i2][j2] / tot, 0.15, 1) * (i2 === row ? 1 : 0.55) };
      });
      negs.forEach(function (n) { if (n.tx) setOpacity(n.tx, masked(n.i, n.j) ? 1 : 0); idx++; });
      rowHi.setAttribute('y', (GY + row * CS - 1).toFixed(1));
      cnt.textContent = '留下 ' + (36 - cover) + ' / 36 对' + (cover === 15 ? '（= 6 × 7 / 2）' : '');
      shiftF.forEach(function (f, k) { f.at(now + k * 0.2, [R + k * 72 + 30, 128], [R + k * 72 + 30, 172], true); });
      clip.at(K.clipSince(t, 7.0), winK(t, 2) > 0.05);
      blk.set(function (i2, j2) { var ok = BLOCK[j2] <= BLOCK[i2]; return { a: ok ? 0.85 : 0.07, color: [C_Q, C_ACCENT, C_V][BLOCK[i2]] }; });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 交叉注意力：去读另一串 token ── */
  function buildSceneCross() {
    var s = sceneSvg('左边两列：左列是编码器输出的英文 6 个 token，右列是解码器正在生成的德文 4 个 token；解码器当前的那个词向左边每个词连线，线越粗权重越大；' +
      '右边依次出现：注意力的三种用法；交叉注意力的 Q、K、V 从哪来；GR00T N1、Diffusion Policy 怎么用交叉注意力；π₀ 把所有 token 拼成一串的另一种接法');
    s.appendChild(svgText(24, 26, '交叉注意力：解码器去读编码器的输出', 'demo-x-ink2', 13.5));
    var EN = ['The', 'cat', 'sat', 'on', 'the', 'mat'], DE = ['Die', 'Katze', 'saß', 'auf'];
    var AL = [[0.7, 0.1, 0.05, 0.05, 0.05, 0.05], [0.15, 0.7, 0.05, 0.04, 0.03, 0.03], [0.05, 0.2, 0.65, 0.04, 0.03, 0.03], [0.03, 0.04, 0.1, 0.7, 0.08, 0.05]];
    var LX = 40, RX = 290, CW = 90;
    var enC = EN.map(function (w, i) { return chip(s, LX, 62 + i * 46, CW, w, C_K, { size: 12.5, h: 32 }); });
    var deC = DE.map(function (w, i) { return chip(s, RX, 62 + i * 46, CW, w, C_Q, { size: 12.5, h: 32 }); });
    label(s, LX, 52, '编码器输出：K、V', 'demo-x-ink2', 11.5);
    label(s, RX, 52, '解码器：Q', 'demo-x-ink2', 11.5);
    var lines = EN.map(function () { return hline(s, 0, 0, 0, 0, C_Q, 1); });
    var wTx = EN.map(function () { return label(s, 0, 0, '', 'demo-x-ink', 11, 'end'); });
    label(s, 24, 350, '权重是我们编的示意：每个德文词主要看对应的英文词', 'demo-x-mut', 11);
    label(s, 24, 372, '例句沿用第 1 幕；论文附录的可视化只画了编码器自注意力', 'demo-x-mut', 11);
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '论文里注意力的三种用法（§3.2.3）', 'demo-x-ink', 14);
    [['编码器自注意力', 'Q、K、V 都来自编码器上一层', C_K], ['解码器自注意力', '带因果掩码，只看之前', C_Q], ['编码器—解码器注意力', 'Q 来自解码器，K、V 来自编码器', C_V]].forEach(function (r, i) {
      var y = 84 + i * 60;
      rectBox(p1, R, y, W, 50, r[2], C_SURFACE);
      label(p1, R + 12, y + 21, r[0], 'demo-x-ink', 12.5);
      label(p1, R + 12, y + 41, r[1], 'demo-x-ink2', 11.5);
    });
    var p2 = group(s);
    label(p2, R, 64, '交叉注意力', 'demo-x-ink', 14);
    label(p2, R, 96, 'query：解码器上一层的输出', 'demo-x-ink2', 12);
    label(p2, R, 120, 'key、value：编码器最后的输出', 'demo-x-ink2', 12);
    label(p2, R, 144, '解码器每个位置都能看全部输入位置', 'demo-x-ink2', 12);
    label(p2, R, 168, '仿照了 seq2seq 里经典的编码器—解码器注意力', 'demo-x-ink2', 12);
    rich(p2, R, 204, '两串 token **长度可以不一样**：6 个读 4 个', 12.5);
    function robotRow(g, key, imgH, y, title, lines2) {
      var im = robotImg(g, key, R, y, imgH);
      label(g, R + im.w + 12, y + 18, title, 'demo-x-ink', 13);
      lines2.forEach(function (l, i) { label(g, R + im.w + 12, y + 44 + i * 22, l, 'demo-x-ink2', 11.5); });
      return im;
    }
    var p3 = group(s);
    label(p3, R, 64, 'GR00T N1（第 050 期）', 'demo-x-ink', 14);
    robotRow(p3, 'gr1', 190, 80, 'DiT 动作头', ['16 个带噪动作 token 当 query', '视觉语言模型第 12 层的特征', '当 key 和 value', '自注意力看动作和状态，', '交叉注意力读视觉语言']);
    var g3q = cellGrid(p3, R + 60, 236, 16, 16, 12, 3, C_Q), g3k = cellGrid(p3, R + 60, 276, 20, 20, 10, 2, C_K);
    var fl3 = [0, 1, 2].map(function () { return flowSeg(p3, C_V, 1, 2.4, 20); });
    var p4 = group(s);
    label(p4, R, 64, 'Diffusion Policy 的 Transformer 版（第 010 期）', 'demo-x-ink', 13.5);
    robotRow(p4, 'ur5', 90, 84, '去噪网络', ['带噪动作当 token，', '扩散步的正弦嵌入当第一个', '动作之间因果注意力', '观测经 MLP 嵌入，交叉注意力读入']);
    label(p4, R, 270, '论文建议新任务先试 CNN 版：Transformer 版对超参敏感', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, 'π₀ 的另一种接法（第 045 期）', 'demo-x-ink', 14);
    var cA = attnGrid(p5, R, 96, 6, 14, C_V);
    label(p5, R + 42, 196, '交叉注意力', 'demo-x-ink2', 11.5, 'middle');
    label(p5, R + 42, 216.5, '动作读视觉语言', 'demo-x-mut', 11, 'middle');
    var cB = attnGrid(p5, R + 130, 96, 6, 14, C_ROBOT);
    label(p5, R + 172, 196, '拼成一串', 'demo-x-ink2', 11.5, 'middle');
    label(p5, R + 172, 216.5, '同一个自注意力', 'demo-x-mut', 11, 'middle');
    robotImg(p5, 'ur5e', R + 262, 86, 120);
    label(p5, R, 248, 'π₀：图文、状态、动作两套权重，只在自注意力里交互', 'demo-x-ink2', 11.5);
    label(p5, R, 270, 'GR00T N1 笔记：它用交叉注意力，不用 π₀ 那种接法', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var k = Math.floor(now / 1.4) % DE.length;
      deC.forEach(function (c, i) { c.box.style.strokeWidth = i === k ? 2.8 : 1.3; });
      EN.forEach(function (w, i) {
        var a = AL[k][i];
        setLine(lines[i], LX + CW, 78 + i * 46, RX, 78 + k * 46);
        lines[i].style.strokeWidth = (0.6 + a * 7).toFixed(1);
        lines[i].style.opacity = (0.25 + 0.75 * a).toFixed(2);
        enC[i].box.style.fill = C_K; enC[i].box.style.fillOpacity = (a * 0.5).toFixed(2);
        wTx[i].setAttribute('x', (LX + CW - 6).toFixed(1)); wTx[i].setAttribute('y', (74 + i * 46 - 14).toFixed(1));
        wTx[i].textContent = '';
      });
      g3q.fill(16); g3k.fill(20);
      fl3.forEach(function (f, j) { f.at(now + j * 0.3, [R + 66 + j * 60, 250], [R + 70 + j * 55, 274], true); });
      cA.set(function (i, j) { return { a: (i >= 3 && j < 3) ? 0.85 : 0.07 }; });
      cB.set(function (i, j) { var bi = i < 3 ? 0 : i < 4 ? 1 : 2, bj = j < 3 ? 0 : j < 4 ? 1 : 2; return { a: bj <= bi ? 0.85 : 0.07 }; });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 13: 训练整句并行，推理一个一个来 ── */
  function buildSceneDecode() {
    var s = sceneSvg('左上是训练：目标整句已知，右移一位后一次送进解码器，5 个输出同时亮；左下是推理：每次只生成一个，接回输入再算下一次，计数一次次往上加；' +
      '右边依次出现：自回归的说法；翻译时的 beam search；50 Hz 控制每步 20 ms 的时间尺；π₀ 一次推理 73 ms 的三段条和 KV 缓存；论文结论里「让生成不那么串行」');
    s.appendChild(svgText(24, 26, '训练整句并行，推理一个一个来', 'demo-x-ink2', 13.5));
    var TOK = ['$a_1$', '$a_2$', '$a_3$', '$a_4$', '$a_5$'], IN = ['起始', '$a_1$', '$a_2$', '$a_3$', '$a_4$'];
    label(s, 24, 52, '训练：目标整句已知（右移一位 + 因果掩码）', 'demo-x-ink2', 12);
    var trIn = IN.map(function (n, i) { return chip(s, 40 + i * 70, 62, 58, n, C_Q, { size: 13.5 }); });
    chip(s, 40, 104, 338, '解码器（一次前向）', C_ACCENT, { size: 12.5, h: 30 });
    var trOut = TOK.map(function (n, i) { return chip(s, 40 + i * 70, 146, 58, n, C_V, { size: 13.5 }); });
    var trF = TOK.map(function () { return flowSeg(s, C_MUTED, 1, 2.4, 20, true); });
    label(s, 24, 208, '推理：只能一个一个生成', 'demo-x-ink2', 12);
    var infIn = IN.map(function (n, i) { return chip(s, 40 + i * 70, 218, 58, n, C_Q, { size: 13.5 }); });
    chip(s, 40, 260, 338, '解码器（又一次前向）', C_ACCENT, { size: 12.5, h: 30 });
    var infOut = TOK.map(function (n, i) { return chip(s, 40 + i * 70, 302, 58, n, C_V, { size: 13.5 }); });
    /* 右边一支弯箭头：刚生成的接回输入（不从框里的字上穿过） */
    var back = pathLine(s, [[381, 318], [391, 318], [391, 234], [381, 234]], C_WARN, 1.8, '4 3');
    var backHead = arrowHead(s, C_WARN);
    backHead.set(388, 234, 379, 234, 7);
    label(s, 395, 280, '接回', 'demo-x-warn', 11.5);
    var nPass = tone(s, 378, 356, '', C_WARN, 12.5, 'end');
    label(s, 24, 382, '每生成一个，就把它接回输入，再前向一次', 'demo-x-mut', 11);
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '解码器是自回归的（§3）', 'demo-x-ink', 14);
    label(p1, R, 96, '生成下一个符号时，把已经生成的当作额外输入', 'demo-x-ink2', 12);
    label(p1, R, 120, '训练时目标句整句已知：配合掩码一次算完所有位置', 'demo-x-ink2', 12);
    label(p1, R, 144, '推理时没有答案：n 个 token 就要前向 n 次', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 64, '翻译时怎么生成（§6.1）', 'demo-x-ink', 14);
    var beams = [];
    for (var b = 0; b < 4; b++) beams.push(pathLine(p2, [], b ? C_MUTED : C_V, b ? 1.4 : 2.4));
    var bDots = [0, 1, 2, 3].map(function (b2) { return dotAt(p2, 0, 0, 4, b2 ? C_MUTED : C_V); });
    label(p2, R + 230, 104, 'beam 宽 4', 'demo-x-ink2', 12);
    rich(p2, R + 230, 128, '长度惩罚 $\\alpha=0.6$', 12);
    label(p2, R + 230, 152, '最长：输入 + 50', 'demo-x-ink2', 12);
    label(p2, R, 222, 'base 取最后 5 个检查点的平均，big 取 20 个', 'demo-x-ink2', 12);
    var p3 = group(s);
    label(p3, R, 64, '机器人：50 Hz 控制，每步只有 20 ms', 'demo-x-ink', 14);
    var TX = R + 10, TWd = 330;
    hline(p3, TX, 140, TX + TWd, 140, C_BORDER, 1.4);
    for (var q = 0; q <= 5; q++) { hline(p3, TX + q * TWd / 5, 134, TX + q * TWd / 5, 146, C_BORDER, 1.2); label(p3, TX + q * TWd / 5, 162, q * 20 + ' ms', 'demo-x-mut', 10.5, 'middle'); }
    var stepDots = [0, 1, 2, 3, 4].map(function (q2) { return dotAt(p3, TX + q2 * TWd / 5 + TWd / 10, 120, 6, C_ROBOT); });
    var cursor = hline(p3, TX, 104, TX, 150, C_ROBOT, 2);
    robotImg(p3, 'digit', R, 182, 110);
    label(p3, R + 66, 210, 'Digit（第 014 期）：每 0.02 s 前向一次', 'demo-x-ink2', 12);
    label(p3, R + 66, 234, '因果 Transformer 只出下一步的动作', 'demo-x-ink2', 12);
    label(p3, R + 66, 258, '上一步的动作再接回下一步的输入', 'demo-x-ink2', 12);
    var p4 = group(s);
    label(p4, R, 64, 'π₀：一次出一整块 50 步动作', 'demo-x-ink', 14);
    var PB = [['图像编码', 14, C_Q], ['前缀前向', 32, C_ACCENT], ['10 次动作前向', 27, C_V]];
    var pbX = R, pbW = 330 / 73, pbars = [];
    PB.forEach(function (p, i) {
      var x0 = pbX + PB.slice(0, i).reduce(function (a, c) { return a + c[1]; }, 0) * pbW;
      pbars.push(hbar(p4, x0, 92, 26, p[2]));
      label(p4, x0 + p[1] * pbW / 2, 136, p[0], 'demo-x-ink2', 11, 'middle');
      label(p4, x0 + p[1] * pbW / 2, 156.5, p[1] + ' ms', 'demo-x-mono', 11, 'middle');
    });
    var tot4 = label(p4, R + W, 84, '', 'demo-x-ink', 12, 'end');
    label(p4, R, 186, 'KV 缓存：图像和文字只前向一次，', 'demo-x-ink2', 12);
    label(p4, R, 208, '10 步积分只重算 51 个后缀 token', 'demo-x-ink2', 12);
    var chunk = cellGrid(p4, R, 226, 50, 50, 5.6, 1, C_V);
    label(p4, R, 262, '50 Hz 下一块 1 s，执行 25 步就重新推理（ALOHA）', 'demo-x-mut', 11);
    label(p4, R, 282, 'RTX 4090、板载；数字取自本站第 045 期笔记', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, '论文结论：下一步，让生成不那么串行', 'demo-x-ink', 14);
    label(p5, R, 96, '原文：Making generation less sequential', 'demo-x-ink2', 12);
    label(p5, R, 118, 'is another research goal of ours.（§7）', 'demo-x-ink2', 12);
    rectBox(p5, R, 140, W, 96, C_ROBOT, C_SURFACE);
    label(p5, R + 12, 164, '机器人后来这样走（我们的联系）', 'demo-x-ink', 12.5);
    label(p5, R + 12, 188, 'π₀：流匹配 10 步，一次出 50 步动作', 'demo-x-ink2', 11.5);
    label(p5, R + 12, 210, 'GR00T N1：一块 16 步，L40 上 63.9 ms', 'demo-x-ink2', 11.5);
    label(p5, R + 12, 230, '不再一个 token 一个 token 地解码动作', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var tr = (now % 2.4) / 2.4;
      trOut.forEach(function (c) { setOpacity(c, tr > 0.4 ? 1 : 0.25); });
      trF.forEach(function (f, i) { f.at(now, [69 + i * 70, 92], [69 + i * 70, 102], tr < 0.4); });
      /* 推理：每 0.9 s 生成一个，5 个之后重来 */
      var k = Math.floor((now % 5.4) / 0.9);
      infOut.forEach(function (c, i) { setOpacity(c, i < k ? 1 : i === k ? 0.6 + 0.4 * Math.sin(now * 8) : 0.12); });
      infIn.forEach(function (c, i) { setOpacity(c, i <= k ? 1 : 0.12); });
      setOpacity(back, k >= 1 && k <= 4 ? 1 : 0.25); setOpacity(backHead.node, k >= 1 && k <= 4 ? 1 : 0.25);
      nPass.textContent = '第 ' + Math.min(5, k + 1) + ' 次前向';
      /* beam：4 条路径往右长 */
      var u2 = (since(t, clock, 3.6) % 3) / 3;
      beams.forEach(function (bl, b2) {
        var pts = [];
        for (var j = 0; j <= 5; j++) pts.push([R + 10 + j * 38 * Math.min(1, u2 * 1.2), 128 + (j ? (b2 - 1.5) * 24 * Math.min(1, j / 2) + Math.sin(j + b2) * 5 : 0)]);
        setPath(bl, pts);
        moveDot(bDots[b2], pts[5]);
      });
      /* 时间尺：游标每 20 ms 走一格，到一格就亮一个点（放慢 40 倍） */
      var tm = (now * 0.5) % 1, cx = TX + tm * TWd;
      setLine(cursor, cx, 104, cx, 150);
      stepDots.forEach(function (d, j) { d.style.opacity = tm * 5 > j + 0.5 ? 1 : 0.2; });
      var u4 = seg(since(t, clock, 10.4), 0.3, 2.3);
      var acc = 0;
      pbars.forEach(function (pb, i) { var w = clamp((u4 * 73 - acc) / PB[i][1], 0, 1) * PB[i][1] * pbW; setW(pb, w); acc += PB[i][1]; });
      tot4.textContent = u4 > 0.98 ? '一次推理 73 ms' : '';
      chunk.fill(Math.round(50 * seg(since(t, clock, 10.4), 2.4, 3.0)));
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 14: 训练配方：预热 4000 步 ── */
  function buildSceneRecipe() {
    var s = sceneSvg('左边是式 3 的学习率曲线：前 4000 步直线升高，之后按步数的负二分之一次方慢慢降，一个小点沿曲线走、读出当前步数和学习率；' +
      '右边依次出现：两个数据集的大小和 batch；base 和 big 两条训练进度条赛跑；Adam 的参数和学习率的峰值；标签平滑把目标分布削平一点；机器人模型的训练配方');
    s.appendChild(svgText(24, 26, '式 3：先预热，再按 1/√step 衰减', 'demo-x-ink2', 13.5));
    var PX = 56, PY = 56, PW = 336, PH = 214, SMAX = 100000, LMAX = 7.5e-4;
    rectBox(s, PX, PY, PW, PH, C_BORDER, C_SURFACE);
    function sx(v) { return PX + v / SMAX * PW; }
    function sy(v) { return PY + PH - v / LMAX * PH; }
    var pts = [];
    for (var st = 1; st <= SMAX; st += st < 6000 ? 100 : 1000) pts.push([sx(st), sy(lrate(st))]);
    var curve = pathLine(s, pts, C_ACCENT, 2.4);
    hline(s, sx(WARMUP), PY, sx(WARMUP), PY + PH, C_MUTED, 1, '4 4');
    label(s, sx(WARMUP) + 6, PY + 16, '第 4000 步', 'demo-x-ink2', 11);
    [0, 25000, 50000, 75000, 100000].forEach(function (v) { label(s, sx(v), PY + PH + 16, v ? (v / 1000) + 'k' : '0', 'demo-x-mut', 10.5, 'middle'); });
    rich(s, PX - 6, PY + 8, '$7\\times10^{-4}$', 10.5, 'demo-x-mut', 'end', 56);
    label(s, PX - 6, PY + PH, '0', 'demo-x-mut', 10.5, 'end');
    label(s, PX + PW, PY + PH + 36.5, '训练步数（base 训 10 万步）', 'demo-x-mut', 11, 'end');
    var mk = dotAt(s, PX, PY + PH, 5.5, C_WARN);
    var rd = rich(s, PX + 70, PY + 62, '', 12, 'demo-x-warn', 'start', 260);
    math(s, 24, 352, 'lrate=d_{model}^{-0.5}\\cdot\\min\\left(step^{-0.5},\\ step\\cdot warmup^{-1.5}\\right)', 13, 'start', 380);
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '训练数据（§5.1）', 'demo-x-ink', 14);
    var db = [barRowAt(p1, R, 86, 96, '英→德', C_Q, 20, 12), barRowAt(p1, R, 116, 96, '英→法', C_V, 20, 12)];
    label(p1, R, 160, '英德 BPE 共享约 37000 个子词；英法 32000 个', 'demo-x-ink2', 12);
    label(p1, R, 184, '按句长分桶；每个 batch 约 25000 个源 token', 'demo-x-ink2', 12);
    label(p1, R, 206, '加 25000 个目标 token', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 64, '一台机器，8 张 P100（§5.2）', 'demo-x-ink', 14);
    var race = [barRowAt(p2, R, 92, 60, 'base', C_ACCENT, 20, 12), barRowAt(p2, R, 130, 60, 'big', C_WARN, 20, 12)];
    label(p2, R, 184, 'base：每步约 0.4 s，10 万步，12 小时', 'demo-x-ink2', 12);
    label(p2, R, 208, 'big：每步 1.0 s，30 万步，3.5 天', 'demo-x-ink2', 12);
    var clk = tone(p2, R + W, 76, '', C_INK, 12, 'end');
    var p3 = group(s);
    label(p3, R, 64, 'Adam + 预热（§5.3）', 'demo-x-ink', 14);
    rich(p3, R, 96, '$\\beta_1=0.9$，$\\beta_2=0.98$，$\\epsilon=10^{-9}$', 12.5);
    rich(p3, R, 126, '前 4000 步线性升高，之后按 1 / √$step$ 降', 12.5);
    rich(p3, R, 158, '峰值（第 4000 步）$\\approx 6.99\\times10^{-4}$', 12.5);
    rich(p3, R, 186, '第 10 万步 $\\approx 1.40\\times10^{-4}$', 12.5);
    label(p3, R, 216, '左边曲线上的小点就是现在的学习率', 'demo-x-mut', 11.5);
    var p4 = group(s);
    label(p4, R, 64, '两种正则（§5.4）', 'demo-x-ink', 14);
    label(p4, R, 92, '标签平滑 0.1：正确答案不再拿满分', 'demo-x-ink2', 12);
    var LS = [];
    for (var c = 0; c < 6; c++) LS.push(vbar(p4, R + 20 + c * 34, 24, c ? C_MUTED : C_V));
    hline(p4, R + 14, 200, R + 222, 200, C_BORDER, 1.2);
    var lsTxt = tone(p4, R + 236, 150, '', C_INK, 12), lsName = label(p4, R + 236, 172, '', 'demo-x-mut', 11.5);
    label(p4, R, 222, '困惑度变差（模型更不确定），BLEU 反而更高', 'demo-x-ink2', 12);
    label(p4, R, 246, '残差 dropout 0.1（上一幕）', 'demo-x-ink2', 12);
    label(p4, R, 268, '柱高是示意：6 个候选词，不是 37000 个', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, '机器人模型的训练配方（本站笔记）', 'demo-x-ink', 14);
    [['Diffusion Policy（第 010 期）', '余弦学习率 + 线性预热', 'CNN 版 500 步，Transformer 版 1000 步'], ['GR00T N1（第 050 期）', 'AdamW，学习率 $10^{-4}$', 'batch 16384，20 万步']].forEach(function (r, i) {
      var y = 84 + i * 86;
      rectBox(p5, R, y, W, 74, C_ROBOT, C_SURFACE);
      label(p5, R + 12, y + 22, r[0], 'demo-x-ink', 12.5);
      rich(p5, R + 12, y + 44, r[1], 11.5);
      label(p5, R + 12, y + 64, r[2], 'demo-x-ink2', 11.5);
    });
    function draw(t, clock) {
      var now = nowOf(t, clock);
      curve.style.strokeDasharray = '1400';
      curve.style.strokeDashoffset = String(1400 * (1 - ease(seg(t, 0.3, 2.4))));
      var u = (now * 0.08) % 1, st2 = Math.max(1, u * u * SMAX);
      moveDot(mk, [sx(st2), sy(lrate(st2))]);
      var ex = lrate(st2).toExponential(2).split('e');
      rd.setText('第 ' + Math.round(st2).toLocaleString('en-US') + ' 步：$' + ex[0] + '\\times10^{' + Number(ex[1]) + '}$');
      var u1 = seg(since(t, clock, 0.4), 0.3, 1.6);
      db[0].set(4.5 / 36 * 220 * u1, f1(4.5 * u1) + ' M 句对'); db[1].set(220 * u1, Math.round(36 * u1) + ' M 句');
      var u2 = since(t, clock, 3.6) * 8;
      race[0].set(Math.min(1, u2 / 12) * 240, Math.min(12, u2) >= 12 ? '12 小时 ✓' : f1(Math.min(12, u2)) + ' 小时');
      race[1].set(Math.min(1, u2 / 84) * 240, f1(Math.min(84, u2) / 24) + ' 天');
      clk.textContent = '过了 ' + f1(Math.min(84, u2) / 24) + ' 天';
      /* 每 2.4 s 在「独热」和「平滑后」之间切一次；ε = 0.1 分给 6 个候选词（示意） */
      var on = Math.floor(since(t, clock, 10.4) / 2.4) % 2, mix = ease(seg((since(t, clock, 10.4) % 2.4), 0, 0.6)), u = on ? mix : 1 - mix;
      LS.forEach(function (b, i) { var v = i ? 0.1 / 6 * u : 1 - 0.1 * u + 0.1 / 6 * u; b.set(200, Math.max(1.5, v * 100)); });
      lsTxt.textContent = u > 0.5 ? '约 0.92 / 0.017' : '1 / 0';
      lsName.textContent = u > 0.5 ? '平滑后' : '独热';
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 15: 表二：翻译结果与训练开销 ── */
  function buildSceneTable2() {
    var s = sceneSvg('左边是表 2 英译德的七根横条，条从 23 分画起，两根 Transformer 的条是蓝色，竖虚线是此前最好的 26.36；右边依次出现：读法；' +
      'big 比此前最好高出 2 分以上；按对数轴画的训练开销；英译法的 41.8 和正文的 41.0；FLOPs 是怎么估出来的');
    s.appendChild(svgText(24, 26, '表二：英译德 BLEU（newstest2014）', 'demo-x-ink2', 13.5));
    var LX = 24, LW = 120, BW = 230, B0 = 23, B1 = 29;
    function bx(v) { return LX + LW + (v - B0) / (B1 - B0) * BW; }
    var bars = TABLE2.map(function (r, i) { return { r: r, b: barRowAt(s, LX, 56 + i * 38, LW, r.zh, r.ours ? C_ACCENT : C_MUTED, 24, 12) }; });
    var best = hline(s, bx(26.36), 48, bx(26.36), 56 + 7 * 38, C_WARN, 1.4, '5 4');
    label(s, bx(26.36), 342, '此前最好 26.36', 'demo-x-ink2', 11, 'middle');
    [23, 25, 27, 29].forEach(function (v) { label(s, bx(v), 362, String(v), 'demo-x-mut', 10.5, 'middle'); });
    void best;
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '先看怎么读', 'demo-x-ink', 14);
    readHint(p1, R, 92, '横条是 BLEU，**越长越好**', 12);
    label(p1, R, 120, '条从 23 分画起，差别看得更清楚', 'demo-x-ink2', 12);
    label(p1, R, 144, '蓝色两根是 Transformer，灰色是之前的模型', 'demo-x-ink2', 12);
    label(p1, R, 168, '橙色虚线：之前最好的集成模型', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 64, '英译德：big 28.4', 'demo-x-ink', 14);
    var gap = tone(p2, R, 100, '', C_ACCENT, 14);
    label(p2, R, 130, '此前最好是 ConvS2S 集成的 26.36', 'demo-x-ink2', 12);
    label(p2, R, 154, 'base 27.3 也超过了之前所有单模型和集成', 'demo-x-ink2', 12);
    label(p2, R, 178, 'big 在 8 张 P100 上训了 3.5 天', 'demo-x-ink2', 12);
    var p3 = group(s);
    label(p3, R, 64, '训练开销（英德，FLOPs）', 'demo-x-ink', 14);
    readHint(p3, R, 88, '对数轴，**越短越省**', 11.5);
    var order = [5, 1, 2, 0, 6, 4, 3];
    var fb = order.map(function (k, i) { return { k: k, b: barRowAt(p3, R, 100 + i * 24, 120, TABLE2[k].zh, TABLE2[k].ours ? C_ACCENT : C_MUTED, 16, 11, true) }; });
    var p4 = group(s);
    label(p4, R, 64, '英译法：41.8，还是 41.0？', 'demo-x-ink', 14);
    var frb = [barRowAt(p4, R, 88, 120, 'ConvS2S 集成', C_MUTED, 20, 12), barRowAt(p4, R, 118, 120, 'Transformer big', C_ACCENT, 20, 12)];
    label(p4, R, 172, '表二和摘要写 41.8，§6.1 正文写 41.0', 'demo-x-ink2', 12);
    label(p4, R, 196, '本站笔记按表取 41.8，并记下这处出入', 'demo-x-ink2', 12);
    label(p4, R, 220, '英法 big 的 dropout 用 0.1，不是 0.3', 'demo-x-ink2', 12);
    label(p4, R, 244, '条从 38 分画起', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, 'FLOPs 是估出来的', 'demo-x-ink', 14);
    label(p5, R, 94, '训练时间 × GPU 数 × 单卡持续算力（脚注 5）', 'demo-x-ink2', 12);
    math(p5, R, 134, '43200\\,\\mathrm{s}\\times 8\\times 9.5\\times10^{12}\\approx 3.3\\times10^{18}', 14, 'start', 352);
    label(p5, R, 166, '12 小时 = 43200 秒，P100 取 9.5 TFLOPS', 'demo-x-ink2', 12);
    math(p5, R, 204, '302400\\,\\mathrm{s}\\times 8\\times 9.5\\times10^{12}\\approx 2.3\\times10^{19}', 14, 'start', 352);
    label(p5, R, 236, 'big：3.5 天，正好对上表里的两格（我们的验算）', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var u = seg(t, 0.4, 2.4);
      bars.forEach(function (b) { b.b.set((b.r.de - B0) / (B1 - B0) * BW * u, u > 0.95 ? String(b.r.de) : ''); });
      bars.forEach(function (b) { b.b.bar.style.opacity = (winK(t, 1) > 0.5 && b.r.ours) || winK(t, 1) < 0.5 ? 0.9 : 0.35; });
      var u2 = seg(since(t, clock, 3.6), 0.3, 1.6);
      gap.textContent = '高出 ' + f2((28.4 - 26.36) * u2) + ' 分';
      var u3 = seg(since(t, clock, 7.0), 0.3, 1.8);
      fb.forEach(function (f) { var L = Math.log10(TABLE2[f.k].flops), ex = TABLE2[f.k].flops.toExponential(1).split('e+'); f.b.set((L - 18) / 2.4 * 150 * u3, u3 > 0.95 ? '$' + ex[0] + '\\times10^{' + ex[1] + '}$' : ''); });
      var u4 = seg(since(t, clock, 10.4), 0.3, 1.6);
      frb[0].set((41.29 - 38) / 4 * 190 * u4, f2(38 + 3.29 * u4)); frb[1].set((41.8 - 38) / 4 * 190 * u4, f1(38 + 3.8 * u4));
      panels(t, [p1, p2, p3, p4, p5]);
      void clock;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 16: 表三、表四：消融与句法分析 ── */
  function buildSceneTable3() {
    var s = sceneSvg('左边是表 3 的十三根横条，条从 23 分画起，竖虚线是 base 的 25.8，讲到哪一组就亮哪一组；右边依次出现：读法；模型越大越好；dropout 和标签平滑；' +
      '可学习的位置嵌入；表 4 句法分析的四根条');
    s.appendChild(svgText(24, 26, '表三：改一处，看 dev BLEU 怎么变', 'demo-x-ink2', 13.5));
    var LX = 24, LW = 120, BW = 220, B0 = 23, B1 = 27;
    function bx(v) { return LX + LW + (v - B0) / (B1 - B0) * BW; }
    var GC = { C: C_ACCENT, D: C_WARN, E: C_V, big: C_ROBOT };
    var rows = TABLE3.map(function (r, i) { return { r: r, b: barRowAt(s, LX, 46 + i * 24, LW, r.zh, GC[r.g], 16, 11.5) }; });
    hline(s, bx(BASE_DEV), 40, bx(BASE_DEV), 46 + 13 * 24, C_INK, 1.4, '5 4');
    label(s, bx(BASE_DEV), 46 + 13 * 24 + 16, 'base 25.8', 'demo-x-ink2', 11, 'middle');
    [23, 25, 27].forEach(function (v) { label(s, bx(v), 46 + 13 * 24 + 34, String(v), 'demo-x-mut', 10.5, 'middle'); });
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '读法', 'demo-x-ink', 14);
    readHint(p1, R, 92, 'dev BLEU（newstest2013），**越长越好**', 12);
    label(p1, R, 120, '虚线是 base 的 25.8：越过虚线就是变好', 'demo-x-ink2', 12);
    label(p1, R, 144, '这里没做检查点平均，所以比表二的数低', 'demo-x-ink2', 12);
    legendRow(p1, R, 176, [['C 组：大小', C_ACCENT], ['D 组：正则', C_WARN], ['E 组：位置', C_V], ['big', C_ROBOT]], 11);
    var p2 = group(s);
    label(p2, R, 64, 'C 组：模型越大越好', 'demo-x-ink', 14);
    label(p2, R, 96, '只有 2 层：23.7；8 层：25.5', 'demo-x-ink2', 12);
    rich(p2, R, 120, '$d_{model}=1024$：26.0；$d_{ff}=4096$：26.2', 12);
    label(p2, R, 144, 'big（1024 维、16 头）：26.4，2.13 亿参数', 'demo-x-ink2', 12);
    label(p2, R, 168, '论文的话：正如预期，模型越大越好', 'demo-x-mut', 11.5);
    var p3 = group(s);
    label(p3, R, 64, 'D 组：dropout 很有用', 'demo-x-ink', 14);
    label(p3, R, 96, '去掉 dropout：24.6，掉了 1.2 分', 'demo-x-ink2', 12);
    label(p3, R, 120, '去掉标签平滑：25.3；加到 0.2：25.7', 'demo-x-ink2', 12);
    label(p3, R, 144, '论文：dropout 对防止过拟合非常有帮助', 'demo-x-mut', 11.5);
    var p4 = group(s);
    label(p4, R, 64, 'E 组：位置编码的形式无所谓', 'demo-x-ink', 14);
    label(p4, R, 96, '可学习的位置嵌入：25.7，几乎和正弦一样', 'demo-x-ink2', 12);
    label(p4, R, 120, '困惑度都是 4.92', 'demo-x-ink2', 12);
    var p5 = group(s);
    label(p5, R, 64, '表四：搬到英语句法分析', 'demo-x-ink', 14);
    readHint(p5, R, 88, 'WSJ 第 23 节 F1，**越长越好**；条从 90 画起', 11);
    var pb = TABLE4.map(function (r, i) { return { r: r, b: barRowAt(p5, R, 100 + i * 28, 170, r.zh, r.ours ? C_ACCENT : C_MUTED, 18, 11.5) }; });
    label(p5, R, 226, '4 层、1024 维，几乎没为这个任务调参', 'demo-x-ink2', 12);
    label(p5, R, 250, '只用 WSJ 的 4 万句，也超过了 BerkeleyParser', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var u = seg(t, 0.4, 2.2);
      var on = [null, 'C', 'D', 'E', null];
      var k = 0;
      [0, 1, 2, 3, 4].forEach(function (j) { if (winK(t, j) > 0.5) k = j; });
      rows.forEach(function (r) {
        r.b.set((r.r.bleu - B0) / (B1 - B0) * BW * u, u > 0.95 ? f1(r.r.bleu) : '');
        var lit = !on[k] || r.r.g === on[k] || (k === 1 && r.r.g === 'big');
        r.b.bar.style.opacity = lit ? 0.9 : 0.25;
      });
      var u5 = seg(since(t, clock, 13.4), 0.3, 1.8);
      pb.forEach(function (p) { p.b.set((p.r.f1 - 90) / 3.5 * 150 * u5, u5 > 0.95 ? String(p.r.f1) : ''); });
      panels(t, [p1, p2, p3, p4, p5]);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 17: 局限，以及机器人怎么接着用 ── */
  function buildSceneLimits() {
    var s = sceneSvg('左边是第 014 期真实世界人形行走图 8A 的读图柱：只换学生网络，Transformer、LSTM、TCN、MLP 的成功率，旁边是 Digit；' +
      '右边依次出现：注意力表随序列变长平方增长；训练并行、生成串行；几处理由是猜测；机器人这边的证据；tensor2tensor 与论文的三处不同');
    s.appendChild(svgText(24, 26, '这篇没有机器人实验；证据在第 014 期', 'demo-x-ink2', 13.5));
    robotImg(s, 'digit', 20, 70, 200);
    var fb = RH_FIG8A.map(function (r, i) { return barRowAt(s, 120, 96 + i * 44, 84, r[0], i ? C_MUTED : C_ROBOT, 26, 12.5); });
    readHint(s, 128, 76, '成功率，**越长越好**', 11.5);
    label(s, 24, 318, '第 014 期论文图 8A（读图）：只换学生网络，', 'demo-x-mut', 11);
    label(s, 24, 338, '3 个场景共 30 次；那篇的结果，不是这篇的', 'demo-x-mut', 11);
    var R = 424, W = 352;
    var p1 = group(s);
    rich(p1, R, 64, '局限一：每层 $n^2$', 14, 'demo-x-ink');
    var grow = attnGrid(p1, R, 84, 16, 9, C_RNN);
    var gTxt = tone(p1, R + 160, 110, '', C_RNN, 13);
    label(p1, R + 160, 140, '序列长一倍，表大四倍', 'demo-x-ink2', 12);
    label(p1, R, 252, '图像、音频、视频这类长输入会很贵', 'demo-x-ink2', 12);
    label(p1, R, 276, '论文打算研究只看局部的受限注意力（§7）', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 64, '局限二：生成仍然串行', 'demo-x-ink', 14);
    label(p2, R, 96, '训练整句并行，不等于生成也并行', 'demo-x-ink2', 12);
    var gen = cellGrid(p2, R, 116, 12, 12, 22, 4, C_V);
    label(p2, R, 168, '每生成一个，还要再前向一次', 'demo-x-ink2', 12);
    label(p2, R, 192, '论文把「让生成不那么串行」列为下一步', 'demo-x-ink2', 12);
    var p3 = group(s);
    label(p3, R, 64, '局限三：几处理由是猜测或假设', 'demo-x-ink', 14);
    var claims = [['除以 √$d_k$', '原文 “We suspect”'], ['正弦位置编码', '假设好学相对位置、可能外推'], ['注意力可视化', '挑出来的例子，不是解释']];
    claims.forEach(function (c, i) {
      var y = 84 + i * 50;
      rectBox(p3, R, y, W, 42, C_BORDER, C_SURFACE);
      rich(p3, R + 12, y + 26, c[0], 12.5, 'demo-x-ink', 'start', 124);
      label(p3, R + 140, y + 26, c[1], 'demo-x-ink2', 11.5);
    });
    label(p3, R, 252, '都没有单独的实验验证', 'demo-x-mut', 11.5);
    var p4 = group(s);
    label(p4, R, 64, '机器人这边的证据：第 014 期', 'demo-x-ink', 14);
    label(p4, R, 96, '同样的行走任务，只换学生网络（读图）：', 'demo-x-ink2', 12);
    label(p4, R, 120, 'Transformer 约 97%，比 MLP 高约 22 个百分点', 'demo-x-ink2', 12);
    label(p4, R, 144, '那篇的理由：更容易随数据和算力扩展，', 'demo-x-ink2', 12);
    label(p4, R, 166, '也更方便接入更多种输入', 'demo-x-ink2', 12);
    rich(p4, R, 200, '这篇论文本身**没有**任何控制或强化学习的结论', 12);
    var p5 = group(s);
    label(p5, R, 64, '官方代码 tensor2tensor（已归档）', 'demo-x-ink', 14);
    var flips = flipList(p5, R, 84, [['位置编码', 'sin / cos 交错', '先全 sin 再全 cos'], ['归一化', '子层之后', '默认子层之前'], ['掩码', '$-\\infty$', '$-10^9$']], 90, 150);
    label(p5, R, 222, '代码注释自己写了：和论文略有不同', 'demo-x-mut', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var u = seg(t, 0.4, 2.2);
      fb.forEach(function (b, i) { b.set(RH_FIG8A[i][1] / 100 * 150 * u, u > 0.95 ? '≈' + RH_FIG8A[i][1] + '%' : ''); });
      var lv = Math.floor(since(t, clock, 0.4) / 1.3) % 3, n = [4, 8, 16][lv];
      grow.set(function (i, j) { return { a: i < n && j < n ? 0.75 : 0.05 }; });
      gTxt.textContent = n + ' 个 token → ' + n * n + ' 对';
      gen.fill(1 + Math.floor(since(t, clock, 3.6) * 2) % 12);
      flips.set(since(t, clock, 13.4));
      panels(t, [p1, p2, p3, p4, p5]);
      void now;
    }
    return { el: s, draw: draw };
  }

  var TF_SCENES = [
    {
      title: '为什么机器人要读一篇翻译论文',
      dur: 16,
      build: buildSceneWhy,
      cues: [
        { at: 0.4, s: '这是一篇 2017 年的**机器翻译**论文：英译德、英译法，全文没有一个机器人。' },
        { at: 3.6, s: '第 014 期的 Digit：读最近 16 步观测—动作的**因果 Transformer**，直接出关节目标。' },
        { at: 7.0, s: 'π₀ 把图像、文字、状态和 50 步动作放进同一个 Transformer；GR00T N1 的动作头是 DiT。' },
        { at: 10.4, s: 'Diffusion Policy 有 Transformer 版去噪网络；MaskedMimic 的策略也是 Transformer。' },
        { at: 13.4, s: '它们换掉的是输入的 token 和输出头，中间那块注意力，来自这篇论文。' }
      ]
    },
    {
      title: '一步等一步：RNN 的串行瓶颈',
      dur: 16,
      build: buildSceneSerial,
      cues: [
        { at: 0.4, s: 'RNN：$h_t = f(h_{t-1}, x_t)$，第 $t$ 步必须等前一步算完才能开始。' },
        { at: 3.6, s: '序列越长串行越久：6 步、16 步、50 步，RNN 就要一步一步走这么多次。' },
        { at: 7.0, s: '第 1 步的信息要经过 $n-1$ 次更新才到最后；路径越长，越难学。' },
        { at: 10.4, s: '卷积能并行，但要堆很多层才连通：ConvS2S $O(n/k)$，ByteNet $O(\\log_k n)$。' },
        { at: 13.4, s: 'Transformer：**不用循环，也不用卷积**，一层之内任意两步直接相连。' }
      ]
    },
    {
      title: '表一：三种层，比三件事',
      dur: 16,
      build: buildSceneTable1,
      cues: [
        { at: 0.4, s: '表一比三件事：每层计算量、串行操作数、任意两个位置之间的最长路径，都是越小越好。' },
        { at: 3.6, s: '序列比宽度短（$n<d$）时，自注意力 $O(n^2 \\cdot d)$ 比循环 $O(n \\cdot d^2)$ 更便宜。' },
        { at: 7.0, s: '按量级粗算：Digit 16 步、宽 192，便宜约 12 倍；π₀ 867 个 token、宽 2048，约 2.4 倍。' },
        { at: 10.4, s: '序列太长时：只看邻域 $r$ 的受限自注意力，$O(r \\cdot n \\cdot d)$，论文留作后续工作。' },
        { at: 13.4, s: '机器人里 $n$ 涨得最快的是图像：π₀ 三路相机就占 768 个 token。' }
      ]
    },
    {
      title: '机器人的 token 是什么',
      dur: 16,
      build: buildSceneToken,
      cues: [
        { at: 0.4, s: '论文先把每个词查表变成 512 维向量，再乘 $\\sqrt{d_{model}} \\approx 22.6$。' },
        { at: 3.6, s: '词表是 BPE 子词：英德共享约 37000 个；每个 batch 约 25000 + 25000 个 token。' },
        { at: 7.0, s: '第 014 期的 Digit：每一步的观测—动作，用 MLP 嵌成一个 192 维的 token。' },
        { at: 10.4, s: 'π₀：一张 224 × 224 的图切成 256 个 token；三路相机加文字、状态、动作，一共 867 个。' },
        { at: 13.4, s: 'GR00T N1 每帧 64 个图像 token。输入是什么都行，只要变成一串等宽的向量。' }
      ]
    },
    {
      title: 'Q、K、V：一份输入，三种角色',
      dur: 16,
      build: buildSceneQKV,
      cues: [
        { at: 0.4, s: '注意力：拿一个 query 去和一组 key 比，按相似度把对应的 value 加权求和。' },
        { at: 3.6, s: '打个比方：Q 是第 $t$ 步要找什么，K 是每一步贴的标签，V 是每一步交出来的内容。' },
        { at: 7.0, s: '自注意力里 Q、K、V 都来自同一串输入，各乘一个可学习矩阵：512 维投到每头 64 维。' },
        { at: 10.4, s: '相似度用点积，不用加性注意力：点积就是矩阵乘法，更快也更省显存。' },
        { at: 13.4, s: '所有 query 一次算完：$QK^\\top$ 一下给出一张 $n \\times n$ 的分数表。' }
      ]
    },
    {
      title: '手算一次注意力',
      dur: 16,
      build: buildSceneAttention,
      cues: [
        { at: 0.4, s: '一行公式：$\\mathrm{softmax}(QK^\\top/\\sqrt{d_k})\\,V$。拿机器人最近 3 步、$d_k=4$ 的玩具走一遍。' },
        { at: 3.6, s: '第 $t$ 步的 $q=[1,0,1,0]$，和三步的 key 点积：**1 / 2 / 1**。' },
        { at: 7.0, s: '除以 $\\sqrt{4}=2$ 得 0.5 / 1 / 0.5；softmax：**0.274 / 0.452 / 0.274**。' },
        { at: 10.4, s: 'value 按权重相加：输出 $=[0.548,\\ 0.726]$，第 $t-1$ 步拿得最多。' },
        { at: 13.4, s: '真实模型里 $q$、$k$、$v$ 都是学出来的投影；一句话：谁和我像，就多拿谁的 value。' }
      ]
    },
    {
      title: '为什么要除以 $\\sqrt{d_k}$',
      dur: 16,
      build: buildSceneScale,
      cues: [
        { at: 0.4, s: '脚注 4：若 $q$、$k$ 的分量独立、均值 0、方差 1，点积的方差就是 $d_k$。' },
        { at: 3.6, s: '论文 $d_k = 64$：点积标准差 **8**；除以 8 以后，标准差回到 1。' },
        { at: 7.0, s: '同一组分数 12 / 4 / −4 / 6：直接进 softmax，最大项拿走 **0.997**；除以 8 只拿 0.506。' },
        { at: 10.4, s: 'softmax 在最大项处的梯度 $p(1-p)$：**0.0028** 对 **0.250**，差约 89 倍。' },
        { at: 13.4, s: '论文说这是猜测；每头 48、256 维的机器人模型，不缩放时标准差是 6.9、16。' }
      ]
    },
    {
      title: '多头：8 个 64 维的头',
      dur: 16,
      build: buildSceneHeads,
      cues: [
        { at: 0.4, s: '一个头只给一组权重：不同的关系会被**平均**到一起（§3.2.2）。' },
        { at: 3.6, s: '多头：512 维切成 8 个 64 维的头，并行算完再拼接、乘 $W^O$；总计算量和单头差不多。' },
        { at: 7.0, s: '表三 A 组，计算量不变、只改头数：1 头 24.9，8 头 25.8，32 头又掉到 25.4。' },
        { at: 10.4, s: '表三 B 组只把 $d_k$ 缩到 16、32：25.1、25.4，判断相容性并不容易。' },
        { at: 13.4, s: '附录图里不同的头盯着不同的词；Digit 用 4 个头，π₀ 的 Gemma 8 个头共用一组 K、V。' }
      ]
    },
    {
      title: '位置编码：把顺序加回来',
      dur: 16,
      build: buildScenePE,
      cues: [
        { at: 0.4, s: '注意力本身不分先后：打乱顺序，输出只是跟着换位。位置得**加进输入**。' },
        { at: 3.6, s: '每一维配一条正弦：维度越高频率越低，波长从 $2\\pi$ 到 $10000\\cdot 2\\pi$。' },
        { at: 7.0, s: '玩具 $d_{model}=4$：前两维每步转 1 弧度，后两维每步只转 0.01 弧度。' },
        { at: 10.4, s: '作者**假设** $PE_{pos+k}$ 是 $PE_{pos}$ 的线性函数；表三 E 组可学习的嵌入 25.7 对 25.8。' },
        { at: 13.4, s: '机器人里：Digit 的 16 步、扩散策略的去噪步、π₀ 的流匹配时间，都用这个正弦函数编码。' }
      ]
    },
    {
      title: '残差、LayerNorm 和前馈网络',
      dur: 16,
      build: buildSceneBlock,
      cues: [
        { at: 0.4, s: '每个子层外面包一层残差，再做 LayerNorm：$\\mathrm{LayerNorm}(x+\\mathrm{Sublayer}(x))$。' },
        { at: 3.6, s: '逐位置前馈网络 512 → 2048 → 512：每个位置单独过，参数共用。' },
        { at: 7.0, s: '按标准结构数参数：base 约 6300 万（论文 6500 万），big 约 2.14 亿（论文 2.13 亿）。' },
        { at: 10.4, s: '残差 dropout 0.1：每个子层的输出，加回去之前先随机丢掉一些。' },
        { at: 13.4, s: 'tensor2tensor 后来默认 pre-norm、预热 8000 步；复现要切回 v1 配置。' }
      ]
    },
    {
      title: '因果掩码：只看过去',
      dur: 16,
      build: buildSceneMask,
      cues: [
        { at: 0.4, s: '解码器的自注意力只能看过去：softmax 之前，把未来位置的分数设成 $-\\infty$。' },
        { at: 3.6, s: '输出再右移一位：位置 $i$ 的预测只依赖 $i$ 之前已经知道的输出。' },
        { at: 7.0, s: '机器人部署时也看不到未来：Digit 的 16 个 token，因果掩码留下 136 / 256 对。' },
        { at: 10.4, s: '代码里 $-\\infty$ 写成 $-10^9$：softmax 之后同样是 0；半精度另换一个能表示的大负数。' },
        { at: 13.4, s: '掩码还有别的形状：π₀ 用三块的分块因果掩码；MaskedMimic 用它挡掉没给的目标。' }
      ]
    },
    {
      title: '交叉注意力：去读另一串 token',
      dur: 16,
      build: buildSceneCross,
      cues: [
        { at: 0.4, s: '三种用法：编码器自注意力、带掩码的解码器自注意力、编码器—解码器注意力。' },
        { at: 3.6, s: '第三种就是交叉注意力：query 来自解码器，key 和 value 来自编码器的输出。' },
        { at: 7.0, s: 'GR00T N1：16 个带噪动作 token 当 query，交叉注意力去读视觉语言模型的特征。' },
        { at: 10.4, s: 'Diffusion Policy 的 Transformer 版：带噪动作之间因果注意力，观测用交叉注意力读进来。' },
        { at: 13.4, s: 'π₀ 换了一种接法：图文、状态、动作拼成一串，只在自注意力里交互。' }
      ]
    },
    {
      title: '训练整句并行，推理一个一个来',
      dur: 16,
      build: buildSceneDecode,
      cues: [
        { at: 0.4, s: '解码器是自回归的：每生成一个 token，就把它接回输入，再生成下一个。' },
        { at: 3.6, s: '翻译时用 beam search：beam 宽 4、长度惩罚 0.6，最长到输入长度加 50。' },
        { at: 7.0, s: '机器人 50 Hz 控制，每步只有 20 ms：Digit 每一步前向一次，只出下一步的动作。' },
        { at: 10.4, s: 'π₀ 一次出 50 步动作：流匹配 10 次前向、前缀用 KV 缓存，板载一次 73 ms。' },
        { at: 13.4, s: '论文结论：下一步要让生成不那么串行；机器人后来用动作块加流匹配走了这一步。' }
      ]
    },
    {
      title: '训练配方：预热 4000 步',
      dur: 16,
      build: buildSceneRecipe,
      cues: [
        { at: 0.4, s: '训练数据：英德 450 万句对、英法 3600 万句；每个 batch 约 25000 + 25000 个 token。' },
        { at: 3.6, s: '一台机器 8 张 P100：base 每步 0.4 秒、10 万步 12 小时；big 每步 1 秒、30 万步 3.5 天。' },
        { at: 7.0, s: '峰值约 $6.99\\times10^{-4}$：先**线性预热 4000 步**，之后按 $1/\\sqrt{step}$ 慢慢下降。' },
        { at: 10.4, s: '标签平滑 0.1：困惑度变差，BLEU 反而更高；另有残差 dropout 0.1。' },
        { at: 13.4, s: '机器人模型也这么配：Diffusion Policy 线性预热 500 / 1000 步，GR00T N1 用 AdamW。' }
      ]
    },
    {
      title: '表二：翻译结果与训练开销',
      dur: 16,
      build: buildSceneTable2,
      cues: [
        { at: 0.4, s: '表二，英译德：横条越长 BLEU 越高；条从 23 分画起，虚线是此前最好的 26.36。' },
        { at: 3.6, s: 'big 模型 **28.4**，比此前最好的集成模型高 2 分以上；base 27.3 也超过了之前所有结果。' },
        { at: 7.0, s: '训练开销按对数画：base 只要 $3.3\\times10^{18}$ 次浮点运算，是表里最省的。' },
        { at: 10.4, s: '英译法 big 41.8，单模型最好；正文第 6.1 节却写成 41.0，两处对不上。' },
        { at: 13.4, s: 'FLOPs 是估算：12 小时 × 8 张卡 × 9.5 TFLOPS ≈ $3.3\\times10^{18}$，正好是 base 那一格。' }
      ]
    },
    {
      title: '表三、表四：消融与句法分析',
      dur: 16,
      build: buildSceneTable3,
      cues: [
        { at: 0.4, s: '表三的消融，读法：dev BLEU 越高越好，虚线是 base 的 25.8。' },
        { at: 3.6, s: '模型越大越好：只有 2 层 23.7；$d_{model}$ 1024 是 26.0，$d_{ff}$ 4096 是 26.2，big 26.4。' },
        { at: 7.0, s: 'dropout 很有用：去掉它掉到 24.6；去掉标签平滑是 25.3。' },
        { at: 10.4, s: 'E 组：正弦换成可学习的位置嵌入，25.7，和 base 几乎一样。' },
        { at: 13.4, s: '表四，英语句法分析：4 层模型几乎不调参，半监督 92.7，这块零件能搬到别的任务。' }
      ]
    },
    {
      title: '局限，以及机器人怎么接着用',
      dur: 16,
      build: buildSceneLimits,
      cues: [
        { at: 0.4, s: '局限一：每层 $n^2$。图像、音频、视频这类长序列很贵，论文打算研究只看局部的注意力。' },
        { at: 3.6, s: '局限二：训练整句并行，生成仍然一个一个来；论文把这列为下一步的目标。' },
        { at: 7.0, s: '局限三：除以 $\\sqrt{d_k}$、选正弦，理由都是猜测或假设，没有单独的实验。' },
        { at: 10.4, s: '证据在第 014 期：同一个行走任务，Transformer 约 97%，MLP 约 75%（读图）。' },
        { at: 13.4, s: '官方代码 tensor2tensor 已归档：位置编码的排布、归一化的位置、掩码的写法都和论文不同。' }
      ]
    }
  ];
  /* 要点里数字和单位之间用不换行空格（公式里不动），免得单位单独落到下一行开头（HOMIE 2026-10-21） */
  function nb(str) {
    return str.split(/(\$[^$]*\$)/).map(function (p, i) { return i % 2 ? p : p.replace(/(\d)(\*\*)? (?=[^\s\d+\-−→×<>=\/·（(])/g, '$1$2 ').replace(/(\d)–(\d)/g, '$1–⁠$2'); }).join('');
  }
  TF_SCENES.forEach(function (sc) { sc.cues.forEach(function (c) { c.s = nb(c.s); }); });

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十七幕动画：从机器人的角度读 Transformer',
      sub: '约 272 秒自动播放。空格播放/暂停，← → 换幕；每一幕先讲论文的做法，再对照本站机器人论文怎么用同一块零件。手算例子与笔记「🚶 具体实例」用的是同一组数字。',
      ariaLabel: 'Transformer 十七幕讲解动画',
      notes: [
        '取数依据：表 1–4、式 1–3 和 §3、§5、§6 的数字照抄 arXiv 1706.03762 v7（读的是 arXiv 上的 LaTeX 源码）；论文首页写明，注明出处后允许在学术作品里复制它的图表，第 1、8 幕的图就是源文件里的原图。',
        '机器人那一侧的数字取自本站笔记，**不是这篇论文的内容**：Digit 的因果 Transformer（第 014 期真实世界人形行走，16 步、192 维、4 头、140 万参数，图 8A 是读图值）、Diffusion Policy（第 010 期）、MaskedMimic（第 028 期）、π₀（867 个 token、73 ms，Gemma 的头数取自 openpi 的 `gemma.py`）、GR00T N1。',
        '第 5、6、11 幕的向量、权重和第 8、12 幕的注意力图案是笔记构造的**玩具**，只演示机制；第 3 幕的「便宜多少倍」和第 10 幕的参数是我们按表一的量级、按标准结构算的。第 1、11 幕的视频剪自第 014 期论文的项目页，第 2、5 幕格子里的 G1 借第 032 期 HOMIE 的回放贴图，都只作示意。'
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
      sub: '17 分 38 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十七幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '19.4 MB',
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
