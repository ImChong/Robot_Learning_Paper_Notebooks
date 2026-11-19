/* Interactive OpenVLA demos for
 * papers/03_High_Impact_Selection/OpenVLA_An_Open-Source_Vision-Language-Action_Model
 * （Kim, Pertsch, Karamcheti et al. · OpenVLA: An Open-Source Vision-Language-Action Model · arXiv 2406.09246 v3，CoRL 2024；
 *   项目页 openvla.github.io；代码 github.com/openvla/openvla @ c8f03f4；权重 huggingface.co/openvla/openvla-7b）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["openvla"]`, after assets/js/demos/kit.js.
 *
 * Demos:
 *   openvla-explainer — 十七幕讲解动画
 *   openvla-video     — 同一套十七幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   openvla-bins      — 动作分词与分位数实验台（官方 bridge_orig 统计量 + action_tokenizer.py 精确复现）
 *   openvla-lora      — 微调显存与量化推理计算器（表 1、表 2、表 11、图 6）
 *   openvla-results   — 四套基准与消融数据台（图 3、图 4、图 5 + 表 7、表 12、表 9 + 表 10）
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

  var IMG_BASE = assetBase('../../img/papers/');
  var PAPER_IMG_BASE = IMG_BASE ? IMG_BASE + 'openvla/' : '';
  var CLIP_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'clips/' : '';

  var el = K.el,
    fmt = K.fmt,
    clamp = K.clamp,
    card = K.card,
    controlsRow = K.controlsRow,
    slider = K.slider,
    buttonGroup = K.buttonGroup,
    statsRow = K.statsRow,
    verdictBox = K.verdictBox,
    note = K.note,
    table = K.table,
    stage = K.stage,
    begin = K.begin,
    text = K.text,
    registerRenderer = K.registerRenderer;

  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    svgAxes = K.svgAxes,
    paint = K.paint,
    seg = K.seg,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
    polyPath = K.polyPath;

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

  // ─── 一手核对数据（arXiv 2406.09246 v3 + openvla @ c8f03f4 + openvla/openvla-7b） ───
  /* 论文图裁剪：[文件名, 宽, 高] */
  var FIGS = {
    fig1: ['fig1_teaser.webp', 1600, 832],
    fig2: ['fig2_arch.webp', 1500, 561],
    fig7: ['fig7_bridge_tasks.webp', 1200, 2624],
    fig8: ['fig8_orig_bridge.webp', 1400, 594],
    fig9: ['fig9_google_tasks.webp', 1400, 1181],
    fig10: ['fig10_franka_tasks.webp', 1200, 1724],
    fig11: ['fig11_droid_wipe.webp', 760, 353]
  };

  /* openvla/openvla-7b model.safetensors.index.json 精确参数量（bf16 共 15,082,474,368 字节） */
  var PARAMS_7B = {
    total: 7541237184,
    vision: 730911680,    // DINOv2 ViT-L/14 + SigLIP ViT-SO400M/14
    projector: 71385600,  // 3-layer GELU MLP: 2176 -> 8704 -> 4096 -> 4096
    llm: 6738939904,      // Llama 2 7B (vocab_size = 32064, 32 layers, dim 4096)
    vocabBase: 32000,
    vocabPadded: 32064,
    binsEndpoints: 256,
    binsIntervals: 255
  };

  /* openvla/openvla-7b config.json -> norm_stats.bridge_orig（真实分位数与极值，保留 4 位小数） */
  var BRIDGE_STATS = [
    { key: 'dx', zh: '前后平移 Δx', sym: '\\Delta x', unit: 'm', q01: -0.028727, q99: 0.028310, min: -0.400849, max: 0.416908, mask: true, ex: 0.010 },
    { key: 'dy', zh: '左右平移 Δy', sym: '\\Delta y', unit: 'm', q01: -0.041703, q99: 0.040855, min: -0.138700, max: 0.258559, mask: true, ex: -0.015 },
    { key: 'dz', zh: '上下平移 Δz', sym: '\\Delta z', unit: 'm', q01: -0.026094, q99: 0.040162, min: -0.225464, max: 0.212169, mask: true, ex: -0.020 },
    { key: 'droll', zh: '横滚 Δroll', sym: '\\Delta\\text{roll}', unit: 'rad', q01: -0.080921, q99: 0.081920, min: -3.201105, max: 3.122178, mask: true, ex: 0.020 },
    { key: 'dpitch', zh: '俯仰 Δpitch', sym: '\\Delta\\text{pitch}', unit: 'rad', q01: -0.092887, q99: 0.077929, min: -1.861784, max: 1.861820, mask: true, ex: -0.030 },
    { key: 'dyaw', zh: '偏航 Δyaw', sym: '\\Delta\\text{yaw}', unit: 'rad', q01: -0.207183, q99: 0.203826, min: -6.279121, max: 6.280501, mask: true, ex: 0.050 },
    { key: 'grip', zh: '夹爪 Gripper', sym: '\\text{Grip}', unit: '开度', q01: 0.0, q99: 1.0, min: 0.0, max: 1.0, mask: false, ex: 1.0 }
  ];

  /* action_tokenizer.py 精确复现：bins = linspace(-1, 1, 256) 共 256 个端点、255 个区间 */
  function encodeDecodeAction(val, st, useMinMax) {
    var lo = useMinMax ? st.min : st.q01;
    var hi = useMinMax ? st.max : st.q99;
    var aNorm = st.mask ? clamp(2 * (val - lo) / (hi - lo) - 1, -1, 1) : clamp(val, -1, 1);
    var disc;
    if (aNorm >= 1.0) {
      disc = 256;
    } else if (aNorm < -1.0) {
      disc = 0;
    } else {
      disc = Math.floor((aNorm + 1) * 255 / 2) + 1;
      disc = clamp(disc, 1, 255);
    }
    var tokId = 32000 - disc;
    var idx = clamp(disc - 1, 0, 254);
    var center = -1 + (2 * idx + 1) / 255;
    var recon = st.mask ? 0.5 * (center + 1) * (hi - lo) + lo : center;
    var binPhys = st.mask ? (hi - lo) / 255 : 2 / 255;
    var qSpanBins = st.mask ? Math.max(1, Math.round((st.q99 - st.q01) / (hi - lo) * 255)) : 128;
    return {
      lo: lo, hi: hi, aNorm: aNorm, disc: disc, tokId: tokId,
      idx: idx, center: center, recon: recon, err: Math.abs(recon - val),
      binPhys: binPhys, qSpanBins: qSpanBins
    };
  }

  /* 图 3：BridgeData V2 WidowX 17 任务（每个 10 次 = 170 次），[RT-1-X, Octo, RT-2-X, OpenVLA] */
  var FIG3_BRIDGE = {
    methods: ['RT-1-X (35M)', 'Octo (93M)', 'RT-2-X (55B)', 'OpenVLA (7B)'],
    short: ['RT-1-X', 'Octo', 'RT-2-X', 'OpenVLA'],
    cols: [C_MUTED, C_ACCENT, C_PURPLE, C_GOOD],
    cats: [
      { name: '总平均（170 次）', v: [18.5, 20.0, 50.6, 70.6], se: [2.7, 2.6, 3.5, 3.2] },
      { name: '视觉泛化', v: [8.0, 29.0, 52.0, 87.0] },
      { name: '运动泛化', v: [25.0, 7.5, 55.0, 60.0] },
      { name: '物理泛化', v: [10.0, 20.0, 26.7, 76.7] },
      { name: '语义泛化', v: [26.3, 0.0, 38.8, 36.3] },
      { name: '语言接地', v: [30.0, 40.0, 85.0, 90.0] }
    ]
  };

  /* 图 4：Google Robot 12 任务（每个 5 次 = 60 次），[RT-1-X, Octo, RT-2-X, OpenVLA] */
  var FIG4_GOOGLE = {
    cats: [
      { name: '分布内（25 次）', v: [32.0, 44.0, 72.0, 88.0] },
      { name: '分布外（35 次）', v: [34.3, 14.3, 82.9, 82.9] },
      { name: '总平均（60 次）', v: [33.3, 26.7, 78.3, 85.0], se: [6.1, 5.8, 5.4, 4.6] }
    ]
  };

  /* 图 5 + 附录表 7：Franka 微调 7 个任务，[DP, DP-matched, Octo, OpenVLA-scratch, OpenVLA] */
  var FIG5_FRANKA = {
    methods: ['Diffusion Policy', 'DP (matched)', 'Octo', 'OpenVLA (scratch)', 'OpenVLA'],
    short: ['DP', 'DP对齐', 'Octo', '从底座训', 'OpenVLA'],
    cols: [C_WARN, C_MUTED, C_ACCENT, C_PURPLE, C_GOOD],
    tasks: [
      { name: '总平均（图 5）', n: '159 分', v: [43.4, 37.1, 41.5, 35.2, 63.8] },
      { name: '放胡萝卜入盘', n: '15 次', v: [40.0, 53.3, 26.7, 46.7, 60.0], note: '图 5 印 53.5' },
      { name: '倒玉米入锅（窄任务）', n: '9 次', v: [77.8, 55.6, 0.0, 22.2, 44.4] },
      { name: '翻正锅（窄任务）', n: '12 次', v: [66.7, 66.7, 50.0, 25.0, 75.0] },
      { name: '盖锅盖（窄任务）', n: '15 次', v: [66.7, 46.7, 53.3, 66.7, 53.3] },
      { name: '桌面多任务（按指令）', n: '24 次', v: [25.0, 16.7, 45.8, 37.5, 66.7] },
      { name: '锅内多任务（按指令）', n: '24 次', v: [45.8, 41.7, 62.5, 54.2, 83.3] },
      { name: 'DROID 擦桌子（15 Hz）', n: '12 次', v: [35.0, 26.7, 38.3, 21.7, 58.3] }
    ]
  };

  /* 表 12：LIBERO 仿真 4 个套件（每套 1500 次），[DP, Octo, OpenVLA] */
  var TABLE12_LIBERO = {
    methods: ['Diffusion Policy', 'Octo', 'OpenVLA (LoRA r=32)'],
    cols: [C_WARN, C_ACCENT, C_GOOD],
    suites: [
      { name: 'Spatial（空间位置）', v: [78.3, 78.9, 84.7] },
      { name: 'Object（目标物体）', v: [92.5, 85.7, 88.4] },
      { name: 'Goal（任务目标）', v: [68.3, 84.6, 79.2] },
      { name: 'Long（长程串联）', v: [50.5, 51.1, 53.7] },
      { name: '四套件平均', v: [72.4, 75.1, 76.5] }
    ]
  };

  /* 表 9 + 表 10：Bridge 8 任务消融（80 次）与视觉编码器微调（6 对） */
  var TABLE9_ABL = [
    { name: '仅 Bridge · 单 SigLIP', v: 40.6, se: 5.5, col: C_MUTED },
    { name: '仅 Bridge · DINOv2 + SigLIP', v: 45.6, se: 5.6, col: C_ACCENT },
    { name: 'OXE 97 万条完整版', v: 76.3, se: 4.8, col: C_GOOD }
  ];
  var TABLE10_VIS = [
    { name: '冻结视觉编码器', v: 46.7, col: C_BAD },
    { name: '端到端微调视觉编码器', v: 80.0, col: C_GOOD }
  ];

  /* 表 1：Franka 3 任务（33 次）6 种微调方案（openvla-v01-7b，批大小 16） */
  var TABLE1_PEFT = [
    { key: 'full', name: '全参数微调（Full FT）', succ: 69.7, se: 7.2, params: 7188.1, vram: 163.3, multi: true, col: C_ACCENT },
    { key: 'last', name: '只训最后一层', succ: 30.3, se: 6.1, params: 465.1, vram: 51.4, multi: false, col: C_BAD },
    { key: 'frozen', name: '冻结视觉编码器', succ: 47.0, se: 6.9, params: 6760.4, vram: 156.2, multi: true, col: C_WARN },
    { key: 'sandwich', name: '三明治微调（首尾+投影）', succ: 62.1, se: 7.9, params: 914.2, vram: 64.0, multi: false, col: C_PURPLE },
    { key: 'lora32', name: 'LoRA（秩 r = 32，推荐）', succ: 68.2, se: 7.5, params: 97.6, vram: 59.7, multi: false, col: C_GOOD },
    { key: 'lora64', name: 'LoRA（秩 r = 64）', succ: 68.2, se: 7.8, params: 195.2, vram: 60.5, multi: false, col: C_MUTED }
  ];

  /* 图 6（读图近似）+ 表 2（非阻塞 80 次）+ 表 11（阻塞 80 次）：6 张 GPU 吞吐率（动作/秒） */
  var GPU_QUANT = [
    { gpu: 'RTX 4090', hz: [6.24, 2.13, 6.01], note: '消费级旗舰（24 GB）' },
    { gpu: 'RTX A5000', hz: [3.44, 1.20, 2.92], note: '表二/表十一测试卡（24 GB）' },
    { gpu: 'A100', hz: [2.91, 0.75, 2.12], note: '数据中心训练卡（80 GB）' },
    { gpu: 'H100', hz: [6.61, null, 4.36], note: 'bitsandbytes 当时未支持 8-bit' },
    { gpu: 'RTX 2080 Ti', hz: [1.21, 2.19, 1.28], note: 'bf16 用 float16 替代（11 GB）' },
    { gpu: 'GTX 1080 Ti', hz: [0.83, 0.76, 0.79], note: 'bf16 用 float32 替代（11 GB）' }
  ];
  var TABLE2_QUANT = [
    { prec: 'bfloat16（16 位）', vram: 16.8, nonblock: 71.3, block: 70.0, col: C_ACCENT },
    { prec: 'int8（8 位量化）', vram: 10.2, nonblock: 58.1, block: 74.4, col: C_WARN },
    { prec: 'int4（4 位量化）', vram: 7.0, nonblock: 71.9, block: 68.8, col: C_GOOD }
  ];

  // ─── 分镜公共绘图小部件（800 × 420 画布，无重叠无越界） ─────────────────────
  function nowOf(t, clock) { return clock == null ? t : clock; }
  function win(t, a, b) {
    return seg(t, a + 0.3, a + 0.7) * (b == null ? 1 : 1 - seg(t, b, b + 0.3));
  }
  function since(t, clock, cue) {
    return clock == null ? t - cue : Math.max(0, K.clipSince(t, cue));
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
    rectBox(g, x, y, w, h, color, o.fill || C_SURFACE, o.dash);
    g.appendChild(svgRich(x + (o.left ? 10 : w / 2), y + h / 2 + 4, str, { size: o.size || 11.5, anchor: o.left ? 'start' : 'middle', w: w - 14, cls: o.cls || 'demo-x-ink2' }));
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
  function dotAt(parent, cx, cy, r, color) {
    var c = paint(svgEl('circle', { cx: cx, cy: cy, r: r }), color);
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
  function setW(node, w) { node.setAttribute('width', Math.max(0, w).toFixed(1)); }
  function label(parent, x, y, str, cls, size, anchor) {
    var n = svgText(x, y, str, cls || 'demo-x-ink2', size || 11.5, anchor);
    parent.appendChild(n);
    return n;
  }
  function tone(parent, x, y, str, color, size, anchor) {
    var n = paint(svgText(x, y, str, null, size || 11.5, anchor), color);
    parent.appendChild(n);
    return n;
  }
  function rich(parent, x, y, str, size, cls, anchor, w) {
    var n = svgRich(x, y, str, { size: size || 12, cls: cls || 'demo-x-ink2', anchor: anchor || 'start', w: w });
    parent.appendChild(n);
    return n;
  }
  function math(parent, x, y, tex, size, anchor) {
    var n = svgMath(x, y, tex, { size: size || 14, anchor: anchor || 'start' });
    parent.appendChild(n);
    return n;
  }
  function readHint(parent, x, y, str, size, w) {
    return rich(parent, x, y, '**读法**　' + str, size || 11, 'demo-x-ink2', 'start', w);
  }
  function textW(str, size) {
    var w = 0;
    for (var i = 0; i < str.length; i++) w += str.charCodeAt(i) > 255 ? size : size * 0.56;
    return w;
  }
  function legendRow(parent, x, y, items, size) {
    var g = group(parent), cx = x, fs = minFont(size || 11);
    items.forEach(function (it) {
      g.appendChild(paint(svgEl('rect', { x: cx, y: y - 9, width: 11, height: 10, rx: 2 }), it[1]));
      label(g, cx + 15, y, it[0], 'demo-x-ink2', fs);
      cx += 15 + (it[2] || textW(it[0], fs)) + 14;
    });
    return g;
  }
  function arrowHead(parent, color) {
    var p = paint(svgEl('path', { d: 'M 0 0', 'stroke-width': 0 }), color);
    parent.appendChild(p);
    return {
      node: p,
      set: function (x1, y1, x2, y2, size) {
        var a = Math.atan2(y2 - y1, x2 - x1), s = size || 7.5;
        var p1 = [x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45)], p2 = [x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)];
        p.setAttribute('d', 'M ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' L ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' L ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + ' Z');
      }
    };
  }
  function arrow(parent, color, width, dash) {
    var g = group(parent), l = hline(g, 0, 0, 0, 0, color, width || 2.0, dash), h = arrowHead(g, color);
    return {
      g: g,
      set: function (x1, y1, x2, y2, size) { setLine(l, x1, y1, x2, y2); h.set(x1, y1, x2, y2, size || 7.5); }
    };
  }
  function flowSeg(parent, color, n, r, speed, noLine) {
    var g = group(parent), ln = noLine ? null : hline(g, 0, 0, 0, 0, color, 1.2, '3 4'), dots = [];
    for (var j = 0; j < (n || 3); j++) dots.push(dotAt(g, 0, 0, r || 3.2, color));
    return {
      g: g,
      at: function (sec, a, b, vis) {
        if (ln) setLine(ln, a[0], a[1], b[0], b[1]);
        var tot = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]));
        dots.forEach(function (c, j) {
          var d = (((sec * (speed || 56) + j * tot / dots.length) % tot) + tot) % tot, u = d / tot;
          moveDot(c, [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
          c.style.opacity = vis === false ? 0 : Math.min(1, Math.min(d, tot - d) / 8);
        });
      }
    };
  }
  function tick(parent, x, y, s, color) {
    var p = paint(svgEl('path', { d: 'M' + x + ' ' + (y + s * 0.5) + ' l' + s * 0.35 + ' ' + s * 0.38 + ' l' + s * 0.65 + ' ' + (-s * 0.8), fill: 'none', 'stroke-width': 2.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }), null, color || C_GOOD);
    parent.appendChild(p);
    return p;
  }
  function cross(parent, x, y, s, color) {
    var p = paint(svgEl('path', { d: 'M' + x + ' ' + y + ' l' + s + ' ' + s + ' M' + (x + s) + ' ' + y + ' l' + (-s) + ' ' + s, fill: 'none', 'stroke-width': 2.8, 'stroke-linecap': 'round' }), null, color || C_BAD);
    parent.appendChild(p);
    return p;
  }
  function figPart(parent, file, imgW, imgH, u0, v0, u1, v1, x, y, w, caption) {
    var g = group(parent), cw = (u1 - u0) * imgW, chh = (v1 - v0) * imgH, h = w * chh / cw;
    g.appendChild(svgEl('rect', { x: (x - 3).toFixed(1), y: (y - 3).toFixed(1), width: (w + 6).toFixed(1), height: (h + 6).toFixed(1), rx: 5, fill: '#ffffff', stroke: 'none' }));
    var box = svgEl('svg', {
      x: x.toFixed(1), y: y.toFixed(1), width: w.toFixed(1), height: h.toFixed(1), overflow: 'hidden', preserveAspectRatio: 'none',
      viewBox: [(u0 * imgW).toFixed(1), (v0 * imgH).toFixed(1), cw.toFixed(1), chh.toFixed(1)].join(' ')
    });
    box.appendChild(svgEl('image', { href: PAPER_IMG_BASE + file, x: 0, y: 0, width: imgW, height: imgH, preserveAspectRatio: 'none' }));
    g.appendChild(box);
    if (caption) g.appendChild(svgText(x + w / 2, y + h + 18, caption, 'demo-x-mut', 11, 'middle'));
    return { g: g, h: h, x: x, y: y, w: w };
  }
  function paperPart(parent, key, u0, v0, u1, v1, x, y, w, caption) {
    var F = FIGS[key];
    return figPart(parent, F[0], F[1], F[2], u0, v0, u1, v1, x, y, w, caption);
  }
  function projClip(parent, id, x, y, w, h, caption, opts) {
    var o = opts || {}, g = group(parent);
    g.appendChild(svgEl('rect', { x: (x - 2).toFixed(1), y: (y - 2).toFixed(1), width: (w + 4).toFixed(1), height: (h + 4).toFixed(1), rx: 5, fill: '#111111', stroke: 'none' }));
    var c = K.svgClip(x, y, w, h, CLIP_BASE + id + '.mp4', { poster: CLIP_BASE + id + '.webp' });
    g.appendChild(c);
    if (caption) label(g, o.capX == null ? x + w / 2 : o.capX, y + h + (o.capDy || 18), caption, o.capCls || 'demo-x-mut', o.capSize || 11, o.capAnchor || 'middle');
    return { g: g, x: x, y: y, w: w, h: h, at: function (sec, vis) { c.at(sec, vis); } };
  }
  function seqClip(parent, id, x, y, w, h, caption, parts) {
    var g = group(parent), total = 0, last = -1;
    parts.forEach(function (p) { total += p[0]; });
    var c = projClip(g, id, x, y, w, h, caption, { capDy: 50 });
    var acc = 0, starts = [], bars = parts.map(function (p) {
      starts.push(acc);
      var r = paint(svgEl('rect', { x: (x + acc / total * w).toFixed(1), y: (y + h + 7).toFixed(1), width: Math.max(2, p[0] / total * w - 4).toFixed(1), height: 5, rx: 2.5 }), C_ACCENT);
      acc += p[0];
      g.appendChild(r);
      return r;
    });
    var name = label(g, x, y + h + 27, '', 'demo-x-ink', 12);
    return {
      g: g, starts: starts, parts: parts, total: total,
      at: function (sec, vis) {
        sec = Math.max(0, sec);
        c.at(sec, vis);
        var m = ((sec % total) + total) % total, idx = 0, a = 0;
        parts.forEach(function (p, i) { if (m >= a) idx = i; a += p[0]; });
        if (idx === last) return;
        last = idx;
        bars.forEach(function (r, i) { r.style.opacity = i === idx ? 1 : 0.25; });
        name.textContent = (idx + 1) + ' / ' + parts.length + '　' + parts[idx][1];
      }
    };
  }
  function barRowAt(parent, x, y, labelW, str, color, h, size) {
    var g = group(parent), bh = h || 15;
    label(g, x + labelW - 8, y + bh / 2 + 4, str, 'demo-x-ink2', size || 11.5, 'end');
    var b = hbar(g, x + labelW, y, bh, color);
    var v = label(g, x + labelW + 7, y + bh / 2 + 4, '', 'demo-x-ink', size || 11.5);
    return {
      g: g, bar: b,
      set: function (w, txt) { setW(b, w); v.setAttribute('x', (x + labelW + Math.max(0, w) + 7).toFixed(1)); v.textContent = txt; }
    };
  }
  function flipList(parent, x, y0, items, nameW, boxW, who) {
    var names = who || ['论文正文', '官方代码'];
    var rows = items.map(function (f, i) {
      var y = y0 + i * 48;
      label(parent, x, y + 20, f[0], 'demo-x-ink2', 11.5);
      var box = rectBox(parent, x + nameW, y, boxW, 30, C_BORDER, C_SURFACE);
      var v = label(parent, x + nameW + boxW / 2, y + 20, '', 'demo-x-ink', 11.5, 'middle');
      var wtag = label(parent, x + nameW + boxW + 8, y + 20, '', 'demo-x-mut', 11);
      return { box: box, v: v, who: wtag, f: f };
    });
    return {
      set: function (sec) {
        var side = Math.floor(Math.max(0, sec) / 1.6) % 2, ph = (Math.max(0, sec) % 1.6) / 1.6;
        var sq = ph < 0.12 ? Math.abs(1 - ph / 0.06) : 1;
        rows.forEach(function (r) {
          r.v.textContent = side ? r.f[2] : r.f[1];
          r.who.textContent = side ? names[1] : names[0];
          r.box.style.stroke = side ? C_GOOD : C_WARN;
          r.v.style.opacity = sq;
        });
      }
    };
  }
  function f1(x) { return fmt(x, 1); }
  function f2(x) { return fmt(x, 2); }
  function f3(x) { return fmt(x, 3); }

  // ─── 十七幕分镜（buildScene01 .. buildScene17） ─────────────────────────────

  /* 第 1 幕：闭源巨无霸与从零小策略 */
  function buildScene01() {
    var s = sceneSvg('左边依次播放项目页三台真实机器人的回放：WidowX 水槽、Google 机器人、Franka 擦桌子；下面是核心名片。右边依次对比闭源 55B 模型与从零小策略、论文图 1 右半参数对比、三道待解问题、29 个开箱任务总成功率条形图与开源清单');
    label(s, 24, 26, '为什么要做 OpenVLA：开源通用机器人底座', 'demo-x-ink2', 13.5);
    var hero = seqClip(s, 'hero', 24, 46, 368, 207, '项目页视频：三台真机评测回放', [
      [3.8, 'WidowX 水槽操作（1.5×）'],
      [4.4, 'Google 移动操作臂（未标倍速）'],
      [4.4, 'Franka-DROID 擦桌子（4×）']
    ]);
    chip(s, 24, 318, 116, '**7.54B** 参数', C_GOOD, { h: 32 });
    chip(s, 150, 318, 116, '**97 万**真机轨迹', C_ACCENT, { h: 32 });
    chip(s, 276, 318, 116, '**MIT** 开源权重', C_WARN, { h: 32 });
    label(s, 24, 376, '斯坦福 · 伯克利 · Google DeepMind · TRI · MIT（CoRL 2024）', 'demo-x-mut', 11.5);

    var R = 420;
    /* p1：两条路线的短板 */
    var p1 = group(s);
    label(p1, R, 60, '当时的两难：小模型泛化窄，大模型不开源', 'demo-x-ink', 13.5);
    rectBox(p1, R, 78, 356, 86, C_WARN, C_SURFACE2);
    label(p1, R + 14, 102, '从零训练的小策略（Diffusion Policy / ACT）', 'demo-x-ink', 12);
    label(p1, R + 14, 126, '单任务动作精细，但换背景、加杂物或改指令容易失效', 'demo-x-ink2', 11.5);
    label(p1, R + 14, 148, 'Octo（93M）虽跨机器人，但没有继承互联网图文大模型', 'demo-x-mut', 11);
    rectBox(p1, R, 180, 356, 86, C_PURPLE, C_SURFACE2);
    label(p1, R + 14, 204, '闭源视觉-语言-动作模型（RT-2-X，550 亿参数）', 'demo-x-ink', 12);
    label(p1, R + 14, 228, '借互联网图文知识认新物体，但不公开权重、代码与配方', 'demo-x-ink2', 11.5);
    label(p1, R + 14, 250, '高校和普通实验室拿不到权重，也没法在自己的机器人上改', 'demo-x-mut', 11);

    /* p2：论文图 1 右 */
    var p2 = group(s);
    label(p2, R, 60, '论文图 1 右：70 亿级开源模型挑战 550 亿闭源模型', 'demo-x-ink', 13);
    paperPart(p2, 'fig1', 0.565, 0.02, 0.995, 0.98, R + 58, 74, 240, '论文图 1 右半：7B 开源对比 55B 闭源');

    /* p3：三道待解问题 */
    var p3 = group(s);
    label(p3, R, 60, 'OpenVLA 要打通的三道关卡', 'demo-x-ink', 13.5);
    var qCards = [
      ['① 架构与分词', '双视觉编码器 + Llama 2，连续动作怎么变成词？', C_ACCENT],
      ['② 数据与配方', '97 万条跨机器人真机示范怎么筛、训多少轮？', C_GOOD],
      ['③ 平民化部署', '单张消费级显卡能不能微调、能不能 4 位量化推理？', C_WARN]
    ].map(function (it, k) {
      var g = group(p3), yy = 82 + k * 74;
      rectBox(g, R, yy, 356, 60, it[2], C_SURFACE2);
      tone(g, R + 14, yy + 24, it[0], it[2], 12.5);
      label(g, R + 14, yy + 46, it[1], 'demo-x-ink2', 11.5);
      return g;
    });

    /* p4：29 个开箱任务总账 */
    var p4 = group(s);
    label(p4, R, 60, '29 个真机开箱任务总成绩（共 230 次测试）', 'demo-x-ink', 13.5);
    readHint(p4, R, 84, '横条越长成功率越高；汇总 WidowX 170 次 + Google 60 次', 11, 356);
    legendRow(p4, R, 112, [['其他通才基线', C_MUTED], ['RT-2-X（55B 闭源）', C_PURPLE], ['OpenVLA（7B 开源）', C_GOOD]], 11);
    var b4 = [
      barRowAt(p4, R, 134, 110, 'RT-1-X (35M)', C_MUTED, 18, 11.5),
      barRowAt(p4, R, 166, 110, 'Octo (93M)', C_ACCENT, 18, 11.5),
      barRowAt(p4, R, 198, 110, 'RT-2-X (55B)', C_PURPLE, 18, 11.5),
      barRowAt(p4, R, 230, 110, 'OpenVLA (7B)', C_GOOD, 18, 11.5)
    ];
    label(p4, R, 278, 'OpenVLA 成功 171 / 230 次（74.3%），比 RT-2-X 高 16.5 个百分点', 'demo-x-ink2', 11.5);
    label(p4, R, 302, '迁到新真机 Franka：平均 63.8%，比扩散策略高 20.4 个百分点', 'demo-x-mut', 11);

    /* p5：开源清单 */
    var p5 = group(s);
    label(p5, R, 60, '全部开源交付（MIT / Apache 2.0 协议）', 'demo-x-ink', 13.5);
    var relItems = [
      '预训练权重 openvla-7b（HuggingFace 直接加载）',
      '27 个 OXE 子集的动作分位数统计量（config.json）',
      '完整分布式预训练代码与数据混合加载器',
      '单卡 LoRA 微调脚本与 4-bit 量化推理接口'
    ];
    var ticks5 = relItems.map(function (str, k) {
      var yy = 88 + k * 50;
      rectBox(p5, R, yy, 356, 38, C_BORDER, C_SURFACE2);
      var tk = tick(p5, R + 12, yy + 11, 15, C_GOOD);
      label(p5, R + 38, yy + 24, str, 'demo-x-ink2', 11.5);
      return tk;
    });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      hero.at(now, true);
      var u3 = since(t, clock, 7.0);
      qCards.forEach(function (g, k) { g.style.opacity = clamp((u3 - k * 0.35) / 0.4, 0.25, 1); });
      var u4 = seg(since(t, clock, 10.4), 0.1, 1.4);
      var vals4 = [22.4, 21.7, 57.8, 74.3];
      b4.forEach(function (row, k) { row.set(vals4[k] * 1.9 * u4, f1(vals4[k] * u4) + '%'); });
      var u5 = since(t, clock, 13.4);
      ticks5.forEach(function (tk, k) { tk.style.opacity = clamp((u5 - k * 0.25) / 0.3, 0, 1); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 第 2 幕：整体结构：一张图、一句话、7 个动作词 */
  function buildScene02() {
    var s = sceneSvg('左上放论文图 2 架构图；左下是 WidowX 250 机械臂三维模型渲染，夹爪处标着 x 红、y 绿、z 蓝空间坐标系，旁边一排 7 个动作词格子轮流点亮。右边依次拆解输入、75.4 亿参数账本、卡片流水线、7 个动作自由度与闭环控制');
    label(s, 24, 26, '整体结构：看一张图、读一句话、吐 7 个动作词', 'demo-x-ink2', 13.5);
    paperPart(s, 'fig2', 0.0, 0.0, 1.0, 1.0, 24, 44, 368, '论文图 2：双视觉编码器 + 投影器 + Llama 2 7B');

    /* 左下：WidowX 3D 渲染 + 末端右手系 (x 红, y 绿, z 蓝) + 7 个输出动作格 */
    rectBox(s, 24, 212, 368, 178, C_BORDER, C_SURFACE2);
    s.appendChild(svgEl('image', { href: PAPER_IMG_BASE + 'widowx250.webp', x: 28, y: 226, width: 132, height: 113 }));
    var eeAx = svgAxes({ len: 18, width: 2.1, size: 11, origin: [188, 290], x: [0.88, 0.24], y: [-0.68, 0.34], z: [0, -1] });
    s.appendChild(eeAx.g);
    label(s, 108, 376, 'WidowX 250 与末端轴', 'demo-x-mut', 11, 'middle');
    var dimShort = ['Δx', 'Δy', 'Δz', 'Δr', 'Δp', 'Δyw', '爪'];
    var actSlots = dimShort.map(function (nm, k) {
      var gx = 222 + (k % 4) * 41, gy = 230 + Math.floor(k / 4) * 58;
      var r = rectBox(s, gx, gy, 34, 34, C_BORDER, C_SURFACE);
      label(s, gx + 17, gy + 21, nm, 'demo-x-ink', 11.5, 'middle');
      return r;
    });
    label(s, 300, 368, '每步依次吐出 7 个动作词', 'demo-x-ink2', 11, 'middle');

    var R = 420;
    /* p1：极简输入 */
    var p1 = group(s);
    label(p1, R, 60, '输入包含两样东西', 'demo-x-ink', 13.5);
    chip(p1, R, 82, 168, '第三视角图 $224\\times 224$', C_ACCENT, { h: 40 });
    chip(p1, R + 184, 82, 172, '英文指令提示词', C_PURPLE, { h: 40 });
    rectBox(p1, R, 138, 356, 62, C_BORDER, C_SURFACE2);
    label(p1, R + 12, 162, 'In: What action should the robot take to {任务}?', 'demo-x-ink', 11.5);
    label(p1, R + 12, 186, 'Out: （模型从这里开始往下接 7 个动作词）', 'demo-x-mut', 11);
    rectBox(p1, R, 218, 356, 74, C_WARN, C_SURFACE2, '5 3');
    label(p1, R + 14, 244, '未接入的输入（对比 ACT / Diffusion Policy）：', 'demo-x-ink', 11.5);
    label(p1, R + 14, 268, '不接手腕相机 · 不接机器人关节角 · 不叠历史帧', 'demo-x-ink2', 11.5);

    /* p2：7.54B 参数账本 */
    var p2 = group(s);
    label(p2, R, 60, '底座 Prismatic-7B 的三块参数账本', 'demo-x-ink', 13.5);
    readHint(p2, R, 84, '横条按官方权重索引统计真实参数量（合计 75.4 亿）', 11, 356);
    legendRow(p2, R, 112, [['双视觉骨干', C_ACCENT], ['MLP 投影器', C_WARN], ['Llama 2 主干', C_GOOD]], 11);
    var b2 = [
      barRowAt(p2, R, 136, 108, '双视觉编码器', C_ACCENT, 18, 11.5),
      barRowAt(p2, R, 170, 108, '3 层投影器', C_WARN, 18, 11.5),
      barRowAt(p2, R, 204, 108, 'Llama 2 7B', C_GOOD, 18, 11.5)
    ];
    label(p2, R, 256, '论文正文统称 7B；开源权重精确加总是 7.54B（bf16 占 15.1 GB）', 'demo-x-ink2', 11.5);
    label(p2, R, 280, '先在互联网图文数据上练好视觉语言对齐，再拿来学机器人动作', 'demo-x-mut', 11);

    /* p3：卡片流向（与左下 x 红 y 绿 z 蓝坐标轴同屏，流向线避开红绿蓝，改用紫/橙） */
    var p3 = group(s);
    label(p3, R, 60, '卡片流向：视觉卡和文字卡进同一个大模型', 'demo-x-ink', 13.5);
    chip(p3, R, 86, 152, '256 张视觉卡片', C_WARN, { h: 36 });
    chip(p3, R + 188, 86, 168, '约 19 张文字卡片', C_PURPLE, { h: 36 });
    rectBox(p3, R, 158, 356, 54, C_BORDER, C_SURFACE2);
    label(p3, R + 178, 182, 'Llama 2（32 层因果 Transformer，宽 4096）', 'demo-x-ink', 12, 'middle');
    label(p3, R + 178, 202, '每张卡片 4096 个数字，按顺序开 32 轮会', 'demo-x-mut', 11, 'middle');
    chip(p3, R + 68, 250, 220, '自回归连吐 7 个动作词', C_WARN, { h: 36 });
    var fl3a = flowSeg(p3, C_WARN, 2, 3, 48), fl3b = flowSeg(p3, C_PURPLE, 2, 3, 48), fl3c = flowSeg(p3, C_WARN, 2, 3, 48);

    /* p4：7 维含义 */
    var p4 = group(s);
    label(p4, R, 60, '7 个动作词各自管什么', 'demo-x-ink', 13.5);
    rich(p4, R, 92, '①–③ 末端位置增量 $(\\Delta x, \\Delta y, \\Delta z)$：往前后、左右、上下挪几厘米', 11.5, 'demo-x-ink2', 'start', 356);
    rich(p4, R, 144, '④–⑥ 末端姿态增量 $(\\Delta\\text{roll}, \\Delta\\text{pitch}, \\Delta\\text{yaw})$：手腕绕三轴转多少弧度', 11.5, 'demo-x-ink2', 'start', 356);
    rich(p4, R, 196, '⑦ 夹爪开合 $\\text{Gripper} \\in [0, 1]$：张开还是合拢夹紧', 11.5, 'demo-x-ink2', 'start', 356);
    rectBox(p4, R, 236, 356, 52, C_BORDER, C_SURFACE2);
    label(p4, R + 14, 266, '全部 OXE 训练子集都统一对齐成这 7 维末端控制接口', 'demo-x-ink', 11.5);

    /* p5：单步闭环 */
    var p5 = group(s);
    label(p5, R, 60, '部署时的单步闭环（不缓存动作块）', 'demo-x-ink', 13.5);
    var loopNodes = [
      [R + 10, 102, 146, '相机拍当前 1 帧', C_WARN],
      [R + 198, 102, 148, '模型吐 7 个动作词', C_PURPLE],
      [R + 198, 194, 148, '反量化成 7 个控制量', C_WARN],
      [R + 10, 194, 146, '机械臂走完这一步', C_PURPLE]
    ];
    loopNodes.forEach(function (nd) { chip(p5, nd[0], nd[1], nd[2], nd[3], nd[4], { h: 38 }); });
    var lf1 = flowSeg(p5, C_WARN, 2, 3, 44), lf2 = flowSeg(p5, C_PURPLE, 2, 3, 44),
      lf3 = flowSeg(p5, C_WARN, 2, 3, 44), lf4 = flowSeg(p5, C_PURPLE, 2, 3, 44);
    label(p5, R, 268, '每走一步都重新看最新画面，所以遇到碰歪能当场纠正', 'demo-x-ink2', 11.5);
    label(p5, R, 292, '但每一步都要连跑 7 次语言模型，控制频率受显卡速度限制', 'demo-x-mut', 11);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      var activeSlot = Math.floor(now * 2.5) % 7;
      actSlots.forEach(function (r, k) {
        r.style.stroke = k === activeSlot ? C_GOOD : k < activeSlot ? C_ACCENT : C_BORDER;
        r.style.strokeWidth = k === activeSlot ? '2.4' : '1.3';
      });
      var u2 = seg(since(t, clock, 3.6), 0.1, 1.3);
      b2[0].set(26 * u2, '0.73B (9.7%)');
      b2[1].set(8 * u2, '0.07B (0.9%)');
      b2[2].set(155 * u2, '6.74B (89.4%)');
      var vis3 = t >= 7.0 && t < 10.7;
      fl3a.at(now, [R + 76, 126], [R + 120, 154], vis3);
      fl3b.at(now, [R + 272, 126], [R + 236, 154], vis3);
      fl3c.at(now, [R + 178, 216], [R + 178, 246], vis3);
      var vis5 = t >= 13.4;
      lf1.at(now, [R + 160, 121], [R + 194, 121], vis5);
      lf2.at(now, [R + 272, 144], [R + 272, 190], vis5);
      lf3.at(now, [R + 194, 213], [R + 160, 213], vis5);
      lf4.at(now, [R + 83, 190], [R + 83, 144], vis5);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 第 3 幕：两双眼睛：DINOv2 与 SigLIP */
  function buildScene03() {
    var s = sceneSvg('左边是一张 224×224 相机图划成 16×16 共 256 个小格，黄格逐格扫过，分两路送进 DINOv2（1024 维）和 SigLIP（1152 维），按格拼成 2176 维再投成 4096 维。右边讲两双眼睛的分工与表 9 消融');
    label(s, 24, 26, '两双眼睛并排看：DINOv2 管几何，SigLIP 管语义', 'demo-x-ink2', 13.5);

    var IM = { x: 24, y: 48, w: 160, h: 160 };
    s.appendChild(svgEl('image', { href: CLIP_BASE + 'bridge_clutter.webp', x: IM.x, y: IM.y, width: IM.w, height: IM.h, preserveAspectRatio: 'xMidYMid slice' }));
    var gridG = group(s);
    for (var gi = 0; gi <= 16; gi++) {
      hline(gridG, IM.x, IM.y + gi * 10, IM.x + 160, IM.y + gi * 10, '#ffffff', 0.5).style.opacity = 0.4;
      hline(gridG, IM.x + gi * 10, IM.y, IM.x + gi * 10, IM.y + 160, '#ffffff', 0.5).style.opacity = 0.4;
    }
    var hlPatch = paint(svgEl('rect', { x: IM.x, y: IM.y, width: 10, height: 10, fill: C_WARN, opacity: 0.8 }), C_WARN);
    s.appendChild(hlPatch);
    label(s, 104, 226, '16 × 16 = 256 格（每格 14×14 像素）', 'demo-x-mut', 11, 'middle');

    chip(s, 224, 58, 168, 'DINOv2 ViT-L/14（1024 维）', C_ACCENT, { h: 36 });
    chip(s, 224, 152, 168, 'SigLIP SO400M/14（1152 维）', C_PURPLE, { h: 36 });
    var fa = flowSeg(s, C_ACCENT, 2, 2.8, 46), fb = flowSeg(s, C_PURPLE, 2, 2.8, 46);

    /* 下半部：同一格的两个向量拼成 2176 -> 投影到 4096 */
    rectBox(s, 24, 252, 368, 134, C_BORDER, C_SURFACE2);
    label(s, 38, 276, '同一个空间格的特征按通道首尾拼接：', 'demo-x-ink', 11.5);
    paint(s.appendChild(svgEl('rect', { x: 38, y: 288, width: 148, height: 18, rx: 3 })), C_ACCENT);
    paint(s.appendChild(svgEl('rect', { x: 190, y: 288, width: 168, height: 18, rx: 3 })), C_PURPLE);
    label(s, 112, 322, '1024 维（几何）', 'demo-x-ink2', 11, 'middle');
    label(s, 274, 322, '+ 1152 维（语义）= 2176 维', 'demo-x-ink2', 11, 'middle');
    chip(s, 64, 340, 288, '3 层 GELU 投影器 → 4096 维视觉卡片', C_WARN, { h: 32 });

    var R = 420;
    var p1 = group(s);
    label(p1, R, 60, '先把 224×224 图像切成 256 个小块', 'demo-x-ink', 13.5);
    rich(p1, R, 92, '两个 ViT 的块大小都是 $14\\times 14$ 像素：横竖各 $224 \\div 14 = 16$ 块', 11.5, 'demo-x-ink2', 'start', 356);
    rich(p1, R, 136, '代码取两个 ViT **倒数第二层**的块特征（扔掉开头的全局汇总卡）', 11.5, 'demo-x-ink2', 'start', 356);
    label(p1, R, 180, '左图黄格扫到哪一块，两路编码器就同时描述那一块', 'demo-x-mut', 11);

    var p2 = group(s);
    label(p2, R, 60, '第一双眼睛：DINOv2（自监督空间几何）', 'demo-x-ink', 13.5);
    rectBox(p2, R, 80, 356, 108, C_ACCENT, C_SURFACE2);
    label(p2, R + 14, 108, '训练方式：自己跟自己做图像特征蒸馏，没读过文字标签', 'demo-x-ink2', 11.5);
    label(p2, R + 14, 136, '强项：看清三维边缘、表面朝向、碗沿高低与夹爪距离', 'demo-x-ink', 11.5);
    label(p2, R + 14, 164, '输出：256 个位置 × 每个位置 1024 个数字', 'demo-x-mut', 11);

    var p3 = group(s);
    label(p3, R, 60, '第二双眼睛：SigLIP（图文成对语义）', 'demo-x-ink', 13.5);
    rectBox(p3, R, 80, 356, 108, C_PURPLE, C_SURFACE2);
    label(p3, R + 14, 108, '训练方式：海量互联网图片配文字说明做对比学习', 'demo-x-ink2', 11.5);
    label(p3, R + 14, 136, '强项：听懂「紫茄子」「红辣椒」、颜色、品牌与日常概念', 'demo-x-ink', 11.5);
    label(p3, R + 14, 164, '输出：同样 256 个位置 × 每个位置 1152 个数字', 'demo-x-mut', 11);

    var p4 = group(s);
    label(p4, R, 60, '逐格拼接，不增加卡片张数', 'demo-x-ink', 13.5);
    math(p4, R, 98, '256 \\times (1024 + 1152) = 256 \\times 2176 \\xrightarrow{\\text{MLP}} 256 \\times 4096', 13);
    label(p4, R, 138, '如果把两路卡片前后排成 512 张，大模型自注意力开销会翻倍', 'demo-x-ink2', 11.5);
    label(p4, R, 166, '按通道横着拼，进 Llama 2 的视觉卡片仍然是 256 张', 'demo-x-ink', 11.5);
    label(p4, R, 196, '注：论文写 2 层投影器，开源主权重实为 3 层 GELU（71.4M 参数）', 'demo-x-mut', 11);

    var p5 = group(s);
    label(p5, R, 60, '附录表九验证：两双眼睛比单眼准', 'demo-x-ink', 13.5);
    readHint(p5, R, 84, '同样只在 BridgeData V2 上训、80 次真机测试，越高越好', 11, 356);
    legendRow(p5, R, 112, [['单用 SigLIP', C_MUTED], ['DINOv2 + SigLIP', C_ACCENT]], 11);
    var b5a = barRowAt(p5, R, 138, 136, '单用 SigLIP', C_MUTED, 20, 11.5);
    var b5b = barRowAt(p5, R, 174, 136, 'DINOv2 + SigLIP', C_ACCENT, 20, 11.5);
    label(p5, R, 224, '加上 DINOv2 后从 40.6% 升到 45.6%（提升 5.0 个百分点）', 'demo-x-ink2', 11.5);
    label(p5, R, 248, '底座论文 Prismatic VLM 在视觉问答上也验证了同一互补效应', 'demo-x-mut', 11);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      var idx = Math.floor(now * 6) % 256;
      hlPatch.setAttribute('x', (IM.x + (idx % 16) * 10).toFixed(1));
      hlPatch.setAttribute('y', (IM.y + Math.floor(idx / 16) * 10).toFixed(1));
      fa.at(now, [188, 96], [220, 76], true);
      fb.at(now, [188, 152], [220, 170], true);
      var u5 = seg(since(t, clock, 13.4), 0.1, 1.2);
      b5a.set(40.6 * 2.8 * u5, f1(40.6 * u5) + '%');
      b5b.set(45.6 * 2.8 * u5, f1(45.6 * u5) + '%');
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 第 4 幕：连续动作怎么变成词 */
  function buildScene04() {
    var s = sceneSvg('左边上方是 [-1, +1] 区间尺，把 +0.010 m 一步步映射成第 174 格和词表编号 31826；下方是 Llama 2 的 32000 词表色带，最后 256 个冷门词涂成绿色动作词。右边分五步讲编码、解码、255 个区间细节与完整 7 维手算');
    label(s, 24, 26, '动作分词：把连续的毫米和弧度装进 Llama 2 词表', 'demo-x-ink2', 13.5);

    /* 左上：[-1, +1] 离散化尺 */
    rectBox(s, 24, 48, 368, 176, C_BORDER, C_SURFACE2);
    label(s, 38, 72, '手算例子：WidowX 前后平移 Δx = +10.0 mm', 'demo-x-ink', 12);
    var rx0 = 48, rx1 = 368, ry = 122;
    hline(s, rx0, ry, rx1, ry, C_BORDER, 2);
    for (var bi = 0; bi <= 16; bi++) {
      var bx = rx0 + bi * (rx1 - rx0) / 16;
      hline(s, bx, ry - 6, bx, ry + 6, C_MUTED, 1);
    }
    label(s, rx0, ry + 22, '−1.0（格 1 → 31999）', 'demo-x-mut', 11, 'start');
    label(s, (rx0 + rx1) / 2, ry + 22, '0', 'demo-x-mut', 11, 'middle');
    label(s, rx1, ry + 22, '+1.0（31744）', 'demo-x-mut', 11, 'end');
    var exX = rx0 + (0.35789 + 1) / 2 * (rx1 - rx0);
    var ptr = dotAt(s, exX, ry, 5.5, C_GOOD);
    var ptrTxt = tone(s, exX, ry - 14, 'ã = +0.358 → 格 174 → 词 31826', C_GOOD, 11.5, 'middle');
    label(s, 38, 182, '反量化还原：+10.08 mm，单步舍入误差 0.08 mm', 'demo-x-ink2', 11.5);
    label(s, 38, 204, '每格物理步长：57.0 mm ÷ 255 = 0.224 mm', 'demo-x-mut', 11);

    /* 左下：Llama 2 32,000 词表条 */
    rectBox(s, 24, 240, 368, 146, C_BORDER, C_SURFACE2);
    label(s, 38, 266, 'Llama 2 基础词表（0 .. 31,999 共 32,000 个词）：', 'demo-x-ink', 11.5);
    paint(s.appendChild(svgEl('rect', { x: 38, y: 282, width: 296, height: 26, rx: 4 })), C_MUTED).style.opacity = 0.35;
    var tailBox = paint(s.appendChild(svgEl('rect', { x: 338, y: 282, width: 38, height: 26, rx: 4 })), C_GOOD);
    label(s, 186, 300, '0 .. 31,743 常英文词与符号', 'demo-x-ink2', 11, 'middle');
    tone(s, 376, 326, '最后 256 个词', C_GOOD, 11, 'end');
    label(s, 38, 354, '直接覆盖最生僻的 256 个词（ID 31744 .. 31999）当动作桶', 'demo-x-ink2', 11);
    label(s, 38, 374, '不用扩词表，也不用给大模型换新输出头', 'demo-x-mut', 11);

    var R = 420;
    var p1 = group(s);
    label(p1, R, 60, '为什么借用词表最后 256 个冷门词？', 'demo-x-ink', 13.5);
    label(p1, R, 90, 'RT-2 把动作写成普通数字文本（如 "1 2 8"），会拆成多个字符', 'demo-x-ink2', 11.5);
    label(p1, R, 118, 'Llama 2 的 BPE 词表末尾本来就有一批极少用到的生僻符号', 'demo-x-ink2', 11.5);
    label(p1, R, 146, '把最后 256 个词直接征用为 256 档动作，一维动作正好占 1 个词', 'demo-x-ink', 11.5);

    var p2 = group(s);
    label(p2, R, 60, '编码公式：连续动作 → 词表编号', 'demo-x-ink', 13.5);
    math(p2, R, 98, '\\tilde{a}_0 = \\frac{2(0.010 - (-0.0287))}{0.0283 - (-0.0287)} - 1 = +0.3579', 13);
    rich(p2, R, 142, '落进第 $\\text{disc} = 174$ 档，词号 $= 32000 - 174 = 31826$', 11.5, 'demo-x-ink', 'start', 356);
    label(p2, R, 174, '注：嵌入矩阵虽补齐 64 行到 32064，代码仍从 32000 倒着扣', 'demo-x-mut', 11);

    var p3 = group(s);
    label(p3, R, 60, '解码公式：词表编号 → 物理控制量', 'demo-x-ink', 13.5);
    math(p3, R, 98, 'c_{173} = -1 + \\frac{2\\times 173 + 1}{255} = +0.3608 \\implies \\hat{a}_0 = +0.01008\\;\\text{m}', 12.5);
    label(p3, R, 142, '查出那一格的中心点，再按同一组分位数拉回米或弧度', 'demo-x-ink2', 11.5);
    label(p3, R, 170, '输入 +10.00 mm，还原 +10.08 mm，相差不到十分之一毫米', 'demo-x-ink', 11.5);

    var p4 = group(s);
    label(p4, R, 60, '代码核对：256 个端点其实是 255 个区间', 'demo-x-ink', 13.5);
    rectBox(p4, R, 80, 356, 112, C_WARN, C_SURFACE2);
    label(p4, R + 14, 108, '论文正文写「256 个等宽区间」，代码写 np.linspace(-1, 1, 256)', 'demo-x-ink2', 11.5);
    label(p4, R + 14, 136, '256 个端点两两夹出 255 个区间，步长是 2 / 255 ≈ 0.00784', 'demo-x-ink', 11.5);
    label(p4, R + 14, 164, '恰好等于 +1.0 时落第 256 档，解码与第 255 档合并到 +0.9961', 'demo-x-mut', 11);

    var p5 = group(s);
    label(p5, R, 60, '一步 7 维动作编出的 7 个词（具体实例 1）', 'demo-x-ink', 13.5);
    var exToks = [
      ['Δx +10mm', '31826'], ['Δy −15mm', '31917'], ['Δz −20mm', '31976'], ['Δr +0.02', '31841'],
      ['Δp −0.03', '31906'], ['Δyw +0.05', '31840'], ['爪 1.0', '31744']
    ];
    exToks.forEach(function (it, k) {
      var gx = R + (k % 4) * 90, gy = 84 + Math.floor(k / 4) * 74;
      rectBox(p5, gx, gy, 82, 56, C_GOOD, C_SURFACE2);
      label(p5, gx + 41, gy + 22, it[0], 'demo-x-ink2', 11, 'middle');
      tone(p5, gx + 41, gy + 44, it[1], C_GOOD, 12, 'middle');
    });
    label(p5, R, 248, '7 个连续控制量就这样变成一句 7 个词的「机器人暗语」', 'demo-x-ink2', 11.5);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      var sweep = 0.5 + 0.5 * Math.sin(now * 1.4);
      var animVal = t < 3.6 ? -0.8 + 1.6 * sweep : 0.35789;
      var px = rx0 + (animVal + 1) / 2 * (rx1 - rx0);
      moveDot(ptr, [px, ry]);
      if (t < 3.6) {
        var d0 = clamp(Math.floor((animVal + 1) * 255 / 2) + 1, 1, 255);
        ptrTxt.textContent = 'ã = ' + (animVal >= 0 ? '+' : '−') + f2(Math.abs(animVal)) + ' → 词 ' + (32000 - d0);
      } else {
        ptrTxt.textContent = 'ã = +0.358 → 格 174 → 词 31826';
      }
      ptrTxt.setAttribute('x', clamp(px, rx0 + 82, rx1 - 82).toFixed(1));
      tailBox.style.opacity = 0.65 + 0.35 * Math.sin(now * 3);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 第 5 幕：为什么用第 1%–99% 分位数 */
  function buildScene05() {
    var s = sceneSvg('左边上下对比官方 bridge_orig 的 Δx 和 Δroll：按最大最小值铺开时，98% 的常规动作只占中间极窄一条（18 格和 7 格）；改按第 1%–99% 分位数铺开后填满全部 255 格。右边讲离群峰值、分辨率损失与夹爪例外');
    label(s, 24, 26, '抗离群值：为什么按第 1%–99% 分位数归一化', 'demo-x-ink2', 13.5);
    readHint(s, 24, 48, '灰线是极值 [min, max] 全宽，绿带是 98% 正常动作所在的 [q01, q99]', 11, 372);

    /* 左上：Δx 对比 */
    rectBox(s, 24, 68, 368, 144, C_BORDER, C_SURFACE2);
    label(s, 38, 92, '前后平移 Δx（官方 bridge_orig 真实统计）', 'demo-x-ink', 12);
    label(s, 38, 116, '按极值 [−0.401, +0.417] m：98% 动作挤在中间 18 格', 'demo-x-ink2', 11);
    hline(s, 44, 132, 372, 132, C_MUTED, 3);
    paint(s.appendChild(svgEl('rect', { x: 196, y: 124, width: 23, height: 16, rx: 3 })), C_BAD);
    label(s, 38, 164, '按分位数 [−0.0287, +0.0283] m：铺满全部 255 格', 'demo-x-ink2', 11);
    var dxGoodBar = paint(s.appendChild(svgEl('rect', { x: 44, y: 174, width: 328, height: 16, rx: 3 })), C_GOOD);
    label(s, 208, 204, '极值跨度是分位数跨度的 14.3 倍', 'demo-x-mut', 11, 'middle');

    /* 左下：Δroll 对比 */
    rectBox(s, 24, 228, 368, 156, C_BORDER, C_SURFACE2);
    label(s, 38, 252, '手腕横滚 Δroll（离群跳变较大的一维）', 'demo-x-ink', 12);
    label(s, 38, 276, '按极值 [−3.20, +3.12] rad：98% 动作落在中间 7 格', 'demo-x-ink2', 11);
    hline(s, 44, 294, 372, 294, C_MUTED, 3);
    paint(s.appendChild(svgEl('rect', { x: 204, y: 286, width: 9, height: 16, rx: 2 })), C_BAD);
    label(s, 38, 326, '按分位数 [−0.0809, +0.0819] rad：铺满全部 255 格', 'demo-x-ink2', 11);
    var drGoodBar = paint(s.appendChild(svgEl('rect', { x: 44, y: 336, width: 328, height: 16, rx: 3 })), C_GOOD);
    label(s, 208, 370, '极值跨度是分位数的 38.8 倍（±π 角度环绕跳变）', 'demo-x-mut', 11, 'middle');

    var R = 420;
    var p1 = group(s);
    label(p1, R, 60, '开源机器人数据里存在离群值', 'demo-x-ink', 13.5);
    label(p1, R, 92, '人遥操作偶发手抖、碰撞急停，或者欧拉角在 ±π 边界跳变', 'demo-x-ink2', 11.5);
    label(p1, R, 120, '几万步里出现一次大尖峰，就会把 [min, max] 撑宽十几倍', 'demo-x-ink2', 11.5);
    label(p1, R, 148, '附录 B 指出：直接照极值缩放会降低精细控制分辨率', 'demo-x-mut', 11);

    var p2 = group(s);
    label(p2, R, 60, '算一笔账：Δx 每格差多少毫米？', 'demo-x-ink', 13.5);
    readHint(p2, R, 84, '每格代表的毫米数越小，动作控制越精细', 11, 356);
    var b2a = barRowAt(p2, R, 114, 122, '按极值缩放', C_BAD, 20, 11.5);
    var b2b = barRowAt(p2, R, 152, 122, '按 1%–99% 分位', C_GOOD, 20, 11.5);
    label(p2, R, 204, '极值下每格 3.21 mm，手算实例 +10 mm 的单步误差放大 16 倍', 'demo-x-ink2', 11.5);

    var p3 = group(s);
    label(p3, R, 60, '手腕横滚 Δroll：极值跨度是分位数的 38.8 倍', 'demo-x-ink', 13.5);
    label(p3, R, 92, '极值下每格 0.0248 rad（约 1.42°），98% 动作落在中间 7 格', 'demo-x-ink2', 11.5);
    label(p3, R, 122, '分位数下每格 0.00064 rad（约 0.037°），255 格留给常规动作', 'demo-x-ink', 11.5);

    var p4 = group(s);
    label(p4, R, 60, '分位数截断公式（式 1）', 'demo-x-ink', 13.5);
    math(p4, R, 100, '\\tilde{a}_d = \\operatorname{clip}\\!\\left(\\frac{2(a_d - q_{01})}{q_{99} - q_{01}} - 1,\\;-1,\\;1\\right)', 13);
    label(p4, R, 146, '把头尾各 1% 的极端尖峰截断到 ±1，保住中间 98% 的精度', 'demo-x-ink2', 11.5);
    label(p4, R, 174, '每个数据集单独存一套 q01、q99，微调新机器人时重算一套', 'demo-x-mut', 11);

    var p5 = group(s);
    label(p5, R, 60, '代码细节：第 7 维夹爪不拉伸', 'demo-x-ink', 13.5);
    rectBox(p5, R, 82, 356, 104, C_ACCENT, C_SURFACE2);
    label(p5, R + 14, 110, 'config.json 里前 6 维 mask = True，第 7 维夹爪 mask = False', 'demo-x-ink', 11.5);
    label(p5, R + 14, 138, '夹爪原本就在 [0, 1]，不拉到 −1：0 落第 128 格，1 落末格', 'demo-x-ink2', 11.5);
    label(p5, R + 14, 164, '开源权重的 config.json 内置了全部 27 个训练子集的分位数', 'demo-x-mut', 11);

    function draw(t, clock) {
      var u1 = seg(since(t, clock, 0.4), 0.2, 1.4);
      setW(dxGoodBar, 328 * u1);
      setW(drGoodBar, 328 * u1);
      var u2 = seg(since(t, clock, 3.6), 0.1, 1.2);
      b2a.set(150 * u2, f2(3.21 * u2) + ' mm / 格');
      b2b.set(12 * u2, f3(0.224 * u2) + ' mm / 格');
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 第 6 幕：语言模型怎么学动作 */
  function buildScene06() {
    var s = sceneSvg('左边是一排送进 Llama 2 的序列卡片：BOS、256 张图像卡、文字提示卡（标着 -100 不算损失），后面紧跟 7 个绿色动作词和 EOS（标着算交叉熵损失），下面画第 4 个动作词在 256 个桶上的概率柱。右边讲交叉熵、掩码、并行训练与串行推理');
    label(s, 24, 26, '训练与推理：只对最后 7 个动作词和结束符算交叉熵', 'demo-x-ink2', 13.5);

    rectBox(s, 24, 48, 368, 172, C_BORDER, C_SURFACE2);
    label(s, 38, 72, '一条训练序列的标签设置（datasets.py）：', 'demo-x-ink', 11.5);
    chip(s, 38, 86, 136, '256 张视觉卡', C_MUTED, { h: 32 });
    chip(s, 180, 86, 104, '文字提示卡', C_MUTED, { h: 32 });
    chip(s, 290, 86, 88, '7 动作 + EOS', C_GOOD, { h: 32 });
    label(s, 160, 138, '标签 = −100（只读不扣分）', 'demo-x-mut', 11, 'middle');
    tone(s, 334, 138, '算交叉熵（8 词）', C_GOOD, 11, 'middle');
    hline(s, 38, 148, 282, 148, C_MUTED, 1.5, '4 3');
    hline(s, 290, 148, 378, 148, C_GOOD, 2.2);
    label(s, 38, 178, '不用教它默写用户的英文问题，全部梯度用来学选哪一格动作', 'demo-x-ink2', 11);
    label(s, 38, 200, '推理时解码够 7 个动作词就停（不靠 EOS 截断）', 'demo-x-mut', 11);

    /* 左下：256 桶分类概率示意 */
    rectBox(s, 24, 234, 368, 152, C_BORDER, C_SURFACE2);
    label(s, 38, 258, '每个动作维本质是一道「256 选 1」选择题：', 'demo-x-ink', 11.5);
    var probs = [0.03, 0.06, 0.14, 0.52, 0.16, 0.06, 0.03];
    var pBars = probs.map(function (pv, k) {
      var bx = 56 + k * 42;
      var vb = vbar(s, bx, 26, k === 3 ? C_GOOD : C_ACCENT);
      label(s, bx + 13, 358, String(171 + k), 'demo-x-mut', 11, 'middle');
      return { vb: vb, pv: pv };
    });
    label(s, 208, 380, '格号（标准答案：第 174 格）', 'demo-x-mut', 11, 'middle');

    var R = 420;
    var p1 = group(s);
    label(p1, R, 60, '目标函数：和大语言模型完全一样的下一个词预测', 'demo-x-ink', 13.5);
    math(p1, R, 100, '\\mathcal{L} = -\\sum_{j=1}^{7+1} \\log p_\\theta\\!\\left(y_j \\mid I,\\, \\text{prompt},\\, y_{<j}\\right)', 13);
    label(p1, R, 146, '不改损失函数、不加连续回归头，直接复用现成大模型分布式训练栈', 'demo-x-ink2', 11.5);

    var p2 = group(s);
    label(p2, R, 60, '为什么要把图像和提示词的标签设成 −100？', 'demo-x-ink', 13.5);
    label(p2, R, 92, '前缀有约 275 张卡片，真正要预测的动作在末尾 8 个位置', 'demo-x-ink2', 11.5);
    label(p2, R, 120, '如果对文字也算损失，大半梯度都花在背诵固定句式上', 'demo-x-ink2', 11.5);
    label(p2, R, 148, 'PyTorch 交叉熵遇到 −100 自动跳过，梯度全集中在动作词', 'demo-x-ink', 11.5);

    var p3 = group(s);
    label(p3, R, 60, '训练快：因果掩码一次前向并行批改 8 个词', 'demo-x-ink', 13.5);
    rectBox(p3, R, 82, 356, 94, C_ACCENT, C_SURFACE2);
    label(p3, R + 14, 110, '训练时已知整条标准答案（Teacher Forcing）', 'demo-x-ink', 11.5);
    label(p3, R + 14, 136, '靠因果下三角掩码（不偷看后面的词），1 次前向全算完', 'demo-x-ink2', 11.5);
    label(p3, R + 14, 160, '不像扩散策略训练时还要随机抽噪声步', 'demo-x-mut', 11);

    var p4 = group(s);
    label(p4, R, 60, '推理时：KV 缓存 + 7 步贪心解码（do_sample=False）', 'demo-x-ink', 13.5);
    var stepChips = [0, 1, 2, 3, 4, 5, 6].map(function (k) {
      return chip(p4, R + k * 51, 88, 45, '词 ' + (k + 1), C_GOOD, { h: 34 });
    });
    label(p4, R, 150, '第 1 步算完 275 张前缀卡并缓存 K、V；第 2–7 步每次只喂刚吐出的 1 个词', 'demo-x-ink2', 11.5);
    label(p4, R, 178, '官方推理默认温度为 0（直接挑概率最高的那一格）', 'demo-x-mut', 11);

    var p5 = group(s);
    label(p5, R, 60, '自回归解码的速度瓶颈', 'demo-x-ink', 13.5);
    label(p5, R, 92, '7 个动作词必须一个等一个串行吐：Δy 得等 Δx 出来才能算', 'demo-x-ink2', 11.5);
    label(p5, R, 122, '32 层 70 亿参数连跑 7 趟，RTX 4090 上每秒约 6.2 个动作', 'demo-x-ink', 11.5);
    label(p5, R, 150, '这是自回归离散 VLA 在高频精细任务上受限的根源', 'demo-x-mut', 11);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      var pulse = 0.85 + 0.15 * Math.sin(now * 3);
      pBars.forEach(function (it, k) {
        var h = (k === 3 ? it.pv * pulse : it.pv) * 146;
        it.vb.set(340, h);
      });
      var curStep = Math.floor(now * 2.5) % 7;
      stepChips.forEach(function (c, k) { c.style.opacity = k <= curStep ? 1 : 0.28; });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 第 7 幕：97 万条真机示范怎么配 */
  function buildScene07() {
    var s = sceneSvg('左上放论文图 1 左半跨机器人示意图；左下是 OXE 混合配比横条图（Fractal、Kuka、BridgeData V2、Taco/Jaco、DROID 10% 与其余子集）。右边讲三条筛选与配平规矩');
    label(s, 24, 26, '数据配方：从 OXE 大池子筛出 97 万条真机轨迹', 'demo-x-ink2', 13.5);
    paperPart(s, 'fig1', 0.0, 0.02, 0.555, 0.98, 112, 42, 192, '论文图 1 左：跨机器人真机操作示范');

    rectBox(s, 24, 248, 368, 140, C_BORDER, C_SURFACE2);
    readHint(s, 36, 270, '色块宽度表示训练混合采样占比（附录 A，合计 100%）', 11, 344);
    var mix = [
      ['Google RT-1', 25, C_ACCENT], ['Kuka', 15, C_WARN], ['Bridge V2', 15, C_GOOD],
      ['DROID', 10, C_PURPLE], ['其余 20+ 集合', 35, C_MUTED]
    ];
    var mx = 36, mixBars = [];
    mix.forEach(function (m) {
      var mw = m[1] * 3.36;
      var rb = paint(s.appendChild(svgEl('rect', { x: mx.toFixed(1), y: 286, width: Math.max(4, mw - 3).toFixed(1), height: 22, rx: 3 })), m[2]);
      mixBars.push(rb);
      mx += mw;
    });
    var mixPtr = dotAt(s, 50, 281, 3.8, C_INK);
    legendRow(s, 36, 330, [['RT-1', C_ACCENT, 34], ['Kuka', C_WARN, 34], ['Bridge', C_GOOD, 44], ['DROID 10%', C_PURPLE, 68]], 11);
    label(s, 36, 356, '灰色块：Taco Play、Jaco、Cable 等 20 余个子集', 'demo-x-mut', 11);
    label(s, 36, 376, '全部来自真实机器人硬件，不掺纯仿真轨迹', 'demo-x-ink2', 11);

    var R = 420;
    var p1 = group(s);
    label(p1, R, 60, '数据源头：Open X-Embodiment（OXE）', 'demo-x-ink', 13.5);
    label(p1, R, 92, '全球 21 家机构拼起来的开源机器人数据集，原池超 100 万条轨迹', 'demo-x-ink2', 11.5);
    label(p1, R, 122, 'OpenVLA 筛出其中格式兼容、质量过关的 97 万条真机轨迹', 'demo-x-ink', 11.5);
    label(p1, R, 150, '对比闭源 RT-2-X：当时用的是 35 万条子集，OpenVLA 多了近两倍', 'demo-x-mut', 11);

    var p2 = group(s);
    label(p2, R, 60, '规矩一：统一相机与 7 维单臂动作接口', 'demo-x-ink', 13.5);
    rectBox(p2, R, 82, 356, 98, C_ACCENT, C_SURFACE2);
    label(p2, R + 14, 110, '只留至少有 1 路第三视角 RGB 相机的集合', 'demo-x-ink2', 11.5);
    label(p2, R + 14, 138, '只留单臂末端增量控制（剔除纯底盘导航或双臂关节角集合）', 'demo-x-ink2', 11.5);
    label(p2, R + 14, 164, '统一控制频率与坐标方向，全部压成 7 个动作桶', 'demo-x-mut', 11);

    var p3 = group(s);
    label(p3, R, 60, '规矩二：照 Octo 的启发式权重重平衡', 'demo-x-ink', 13.5);
    label(p3, R, 92, '有些工业分拣集合条数极多，但翻来覆去只抓同一种零件', 'demo-x-ink2', 11.5);
    label(p3, R, 122, '按场景和任务多样性调高 BridgeData V2 等集合的抽样比例', 'demo-x-ink', 11.5);
    label(p3, R, 150, '同时给小数据集的放大倍数设上限，免得翻来覆去背熟过拟合', 'demo-x-mut', 11);

    var p4 = group(s);
    label(p4, R, 60, '规矩三：补入新发布的 DROID 数据集（占 10%）', 'demo-x-ink', 13.5);
    label(p4, R, 92, '训练准备期恰逢大规模家庭/办公桌面数据集 DROID 放出', 'demo-x-ink2', 11.5);
    label(p4, R, 122, '团队保守给它配了 10% 的混合权重，补强 Franka 构型与新场景', 'demo-x-ink', 11.5);

    var p5 = group(s);
    label(p5, R, 60, '收尾技巧：最后三分之一训练撤掉粗糙大集合', 'demo-x-ink', 13.5);
    rectBox(p5, R, 82, 356, 96, C_GOOD, C_SURFACE2);
    label(p5, R + 14, 110, '附录 A 披露：训练最后 1/3 阶段移除了 Kuka 和 DROID', 'demo-x-ink', 11.5);
    label(p5, R + 14, 138, 'Kuka 抓取颗粒度较粗，DROID 腕部与第三视角差异大', 'demo-x-ink2', 11.5);
    label(p5, R + 14, 164, '收尾阶段集中火力精修 Bridge、RT-1 等精细操作子集', 'demo-x-mut', 11);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      var sweepX = 40 + ((now * 58) % 326);
      moveDot(mixPtr, [sweepX, 281]);
      var dropKukaDroid = t >= 13.4;
      mixBars[1].style.opacity = dropKukaDroid ? 0.22 : 1;
      mixBars[3].style.opacity = dropKukaDroid ? 0.22 : 1;
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 第 8 幕：五个关键训练发现 */
  function buildScene08() {
    var s = sceneSvg('左上柱状图对比附录表 10 冻结视觉（46.7%）与微调视觉（80.0%）；左下曲线画训练 27 轮中动作词准确率跨过 95% 虚线。右边依次讲第 3.4 节的五条关键经验');
    label(s, 24, 26, '五个训练发现：把图文大模型炼成机器人策略的窍门', 'demo-x-ink2', 13.5);

    /* 左上：表 10 视觉微调对比 */
    rectBox(s, 24, 48, 368, 152, C_BORDER, C_SURFACE2);
    readHint(s, 36, 70, '附录表十（6 组任务对比）：横条越长真机成功率越高', 11, 344);
    var bv0 = barRowAt(s, 36, 98, 112, '冻结视觉骨干', C_BAD, 20, 11.5);
    var bv1 = barRowAt(s, 36, 134, 112, '微调视觉骨干', C_GOOD, 20, 11.5);
    label(s, 36, 182, '和图文 VLM 冻结视觉的惯例相反，机器人控制差出 33.3 个百分点', 'demo-x-mut', 11);

    /* 左下：27 轮训练与 95% 动作词准确率线 */
    rectBox(s, 24, 214, 368, 174, C_BORDER, C_SURFACE2);
    readHint(s, 36, 232, '横轴训练轮数，纵轴动作词准确率（示意）', 11, 330);
    hline(s, 36, 250, 56, 250, C_ACCENT, 2.4);
    label(s, 61, 254, '动作词准确率', 'demo-x-ink2', 11);
    hline(s, 146, 250, 166, 250, C_GOOD, 1.5, '4 3');
    label(s, 171, 254, '95% 门槛', 'demo-x-ink2', 11);
    dotAt(s, 238, 250, 4, C_WARN);
    label(s, 247, 254, '当前轮次', 'demo-x-ink2', 11);
    var gx0 = 68, gx1 = 364, gy0 = 358, gy1 = 268;
    hline(s, gx0, gy0, gx1, gy0, C_BORDER, 1.3);
    hline(s, gx0, gy1, gx0, gy0, C_BORDER, 1.3);
    var y95 = gy0 - 0.90 * (gy0 - gy1);
    hline(s, gx0, y95, gx1, y95, C_GOOD, 1.3, '4 3');
    label(s, gx0, gy0 + 18, '0', 'demo-x-mut', 11, 'middle');
    label(s, gx0 + 2 / 27 * (gx1 - gx0), gy0 + 18, '2 轮', 'demo-x-mut', 11, 'start');
    label(s, gx1, gy0 + 18, '27 轮', 'demo-x-mut', 11, 'end');
    var accPts = [];
    for (var ep = 0; ep <= 27; ep++) {
      var u = ep / 27, acc = 0.35 + 0.62 * (1 - Math.exp(-3.6 * u));
      accPts.push([gx0 + u * (gx1 - gx0), gy0 - (acc - 0.30) / 0.72 * (gy0 - gy1)]);
    }
    pathLine(s, accPts, C_ACCENT, 2.4);
    var epDot = dotAt(s, gx0, accPts[0][1], 4.5, C_WARN);

    var R = 420;
    var p1 = group(s);
    label(p1, R, 60, '发现一：视觉编码器绝对不能冻住', 'demo-x-ink', 13.5);
    label(p1, R, 92, '底座 Prismatic 训图文问答时，冻住视觉反而更好', 'demo-x-ink2', 11.5);
    label(p1, R, 122, '但机器人伸夹爪差几毫米就抓空，冻结特征缺少精细空间对齐', 'demo-x-ink', 11.5);
    label(p1, R, 150, '放开两双眼睛跟语言模型一起微调，成功率从 46.7% 升到 80.0%', 'demo-x-ink2', 11.5);

    var p2 = group(s);
    label(p2, R, 60, '发现二：双编码器融合显著强于单编码器', 'demo-x-ink', 13.5);
    label(p2, R, 92, '试过 SigLIP、DINOv2、CLIP 单打独斗，都不如 DINOv2 + SigLIP 拼接', 'demo-x-ink2', 11.5);
    label(p2, R, 122, 'DINOv2 补齐三维空间几何，SigLIP 守住语言指令里的物体名字', 'demo-x-ink', 11.5);

    var p3 = group(s);
    label(p3, R, 60, '发现三：分辨率 224×224 就够，384×384 白费算力', 'demo-x-ink', 13.5);
    rectBox(p3, R, 82, 356, 94, C_WARN, C_SURFACE2);
    label(p3, R + 14, 110, '文字阅读任务把图放大到 384×384 很有用', 'demo-x-ink2', 11.5);
    label(p3, R + 14, 138, '但在机器人控制上，卡片从 256 张涨到 729 张，训练慢约 3 倍', 'demo-x-ink', 11.5);
    label(p3, R + 14, 162, '真机成功率却没有提升，所以定在 224×224', 'demo-x-mut', 11);

    var p4 = group(s);
    label(p4, R, 60, '发现四：不能像图文模型跑一两轮，完整跑满 27 轮', 'demo-x-ink', 13.5);
    label(p4, R, 92, '普通 VLM 微调跑 1–2 轮就停；但动作桶需要极高的定位确定性', 'demo-x-ink2', 11.5);
    label(p4, R, 122, '团队一直训到训练集动作词准确率跨过 95%，真机表现才见顶', 'demo-x-ink', 11.5);

    var p5 = group(s);
    label(p5, R, 60, '发现五：固定学习率与完整算力账单', 'demo-x-ink', 13.5);
    chip(p5, R, 86, 170, '64 张 A100 × 14 天', C_ACCENT, { h: 36 });
    chip(p5, R + 184, 86, 172, '21,500 A100 小时', C_GOOD, { h: 36 });
    rich(p5, R, 152, '全局批大小 $2048$，视觉与语言共用固定学习率 $2\\times 10^{-5}$（不加预热）', 11.5, 'demo-x-ink2', 'start', 356);
    label(p5, R, 184, '这笔一次性预训练由作者承担，下游用户只需单卡微调', 'demo-x-mut', 11);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      var u1 = seg(since(t, clock, 0.4), 0.1, 1.2);
      bv0.set(46.7 * 2.1 * u1, f1(46.7 * u1) + '%');
      bv1.set(80.0 * 2.1 * u1, f1(80.0 * u1) + '%');
      var idx = Math.floor((now * 4) % 28);
      moveDot(epDot, accPts[idx]);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 第 9 幕：开箱即用一：WidowX 水槽 17 个任务（图 3） */
  function buildScene09() {
    var s = sceneSvg('左边随讲解切换项目页四段 WidowX 真机视频：杂物里放茄子、按指令区分红辣椒和奶酪、转腕对齐电池、碰倒蓝杯后退回重抓。右边重画论文图 3 的总体与五类泛化柱状图');
    label(s, 24, 26, '开箱即用一：WidowX 水槽 17 个任务（共 170 次真机测试）', 'demo-x-ink2', 13.5);

    var cClutter = projClip(s, 'bridge_clutter', 24, 50, 356, 267, '项目页视频（1.5×）：干扰杂物中把紫茄子放进锅里');
    var cLang = seqClip(s, 'bridge_lang', 24, 46, 356, 267, '项目页视频（1.5×）：同一初始桌面听指令抓不同目标', [
      [2.3, '指令 A：拿起红辣椒'],
      [1.8, '指令 B：拿起奶酪']
    ]);
    var cOrient = projClip(s, 'bridge_orient', 24, 50, 356, 267, '项目页视频（1.5×）：旋转手腕对齐细电池朝向');
    var cRecover = projClip(s, 'bridge_recover', 24, 50, 356, 267, '项目页视频（1.5×）：初次碰倒蓝杯 → 退回调整 → 重抓成功');

    var R = 412;
    label(s, R, 52, '论文图 3：WidowX 五维泛化与总平均（%）', 'demo-x-ink', 13);
    readHint(s, R, 74, '每组 4 根柱，越高越好；每个任务测 10 次，共 170 次', 11, 364);
    legendRow(s, R, 98, [['RT-1-X', C_MUTED, 44], ['Octo', C_ACCENT, 34], ['RT-2-X', C_PURPLE, 46], ['OpenVLA', C_GOOD, 58]], 11);

    var gx0 = R + 28, gyBase = 286, gh = 158;
    hline(s, gx0, gyBase, R + 364, gyBase, C_BORDER, 1.3);
    [0, 50, 100].forEach(function (yv) {
      var yy = gyBase - yv / 100 * gh;
      hline(s, gx0, yy, R + 364, yy, C_BORDER, 0.8, yv ? '3 3' : null);
      label(s, gx0 - 6, yy + 4, String(yv), 'demo-x-mut', 11, 'end');
    });
    var shortCats = ['总体', '视觉', '运动', '物理', '语义', '语言'];
    var grpBoxes = [], barGroups = [];
    FIG3_BRIDGE.cats.forEach(function (cat, gi) {
      var cx = gx0 + 10 + gi * 55;
      var hl = paint(svgEl('rect', { x: cx - 3, y: gyBase - gh - 8, width: 48, height: gh + 28, rx: 4, fill: C_SURFACE2, opacity: 0 }), C_SURFACE2);
      s.appendChild(hl);
      grpBoxes.push(hl);
      var cols4 = cat.v.map(function (val, mi) {
        var vb = vbar(s, cx + mi * 10.5, 9, FIG3_BRIDGE.cols[mi]);
        return { vb: vb, val: val };
      });
      barGroups.push(cols4);
      label(s, cx + 21, gyBase + 16, shortCats[gi], 'demo-x-ink2', 11, 'middle');
    });

    var callout = rectBox(s, R, 314, 364, 72, C_GOOD, C_SURFACE2);
    void callout;
    var callT1 = label(s, R + 12, 340, '', 'demo-x-ink', 11.5);
    var callT2 = label(s, R + 12, 366, '', 'demo-x-ink2', 11);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      var u = seg(since(t, clock, 0.2), 0.0, 1.0);
      barGroups.forEach(function (cols4) {
        cols4.forEach(function (b) { b.vb.set(gyBase, b.val / 100 * gh * u); });
      });
      var stageIdx = t < 3.6 ? 0 : t < 7.0 ? 1 : t < 10.4 ? 2 : t < 13.4 ? 3 : 4;
      setOpacity(cClutter.g, stageIdx <= 1 ? 1 : 0);
      setOpacity(cLang.g, stageIdx === 2 ? 1 : 0);
      setOpacity(cOrient.g, stageIdx === 3 ? 1 : 0);
      setOpacity(cRecover.g, stageIdx === 4 ? 1 : 0);
      cClutter.at(now, stageIdx <= 1);
      cLang.at(since(t, clock, 7.0), stageIdx === 2);
      cOrient.at(now, stageIdx === 3);
      cRecover.at(since(t, clock, 13.4), stageIdx === 4);

      var hlMap = [[0], [1, 3], [5], [2, 4], [0]][stageIdx];
      grpBoxes.forEach(function (box, gi) { box.style.opacity = hlMap.indexOf(gi) >= 0 ? 0.9 : 0; });
      var msgs = [
        ['总平均：OpenVLA 70.6%（120/170）对比 RT-2-X 50.6%', 'Octo 20.0%、RT-1-X 18.5%，参数少 7 倍反而高 20 个百分点'],
        ['视觉泛化 87.0%（对 52%），物理泛化 76.7%（对 26.7%）', '换台面背景、加满锅边杂物、换物体大小都能稳抓'],
        ['语言接地 90.0%（对 RT-2-X 85.0%、Octo 40.0%）', '左图同一桌面摆红辣椒与奶酪，改一句指令就精准换目标'],
        ['运动泛化 60.0%（对 55.0%）；语义泛化 36.3%（RT-2-X 38.8%）', '未见过的互联网新概念略低 2.5 个百分点，其余四项全胜'],
        ['闭环纠错行为：左图蓝杯第一次碰倒后自主退回重抓', '单步实时看图像反馈，失败姿态也能自己救回来']
      ][stageIdx];
      callT1.textContent = msgs[0];
      callT2.textContent = msgs[1];
    }
    return { el: s, draw: draw };
  }

  /* 第 10 幕：开箱即用二：Google 机器人 12 个任务（图 4） */
  function buildScene10() {
    var s = sceneSvg('左边依次展示论文图 9 Google 机器人任务设置、未见过任务放香蕉回放，以及移可乐罐到 Taylor Swift 照片旁 RT-2-X 成功而 OpenVLA 走错的对比回放。右边重画论文图 4 柱状图与 29 任务汇总');
    label(s, 24, 26, '开箱即用二：Google 移动操作臂 12 个任务（共 60 次）', 'demo-x-ink2', 13.5);

    var gFig9 = paperPart(s, 'fig9', 0.0, 0.0, 1.0, 0.52, 24, 52, 356, '论文附录图 9：Google 机器人分布内与分布外评测场景');
    var cBan = projClip(s, 'google_banana', 34, 48, 336, 268, '项目页视频（2×）：分布外新物体「把香蕉放进盘子」');
    var cTay = seqClip(s, 'google_taylor', 34, 46, 336, 268, '项目页视频（2×）：把可乐罐移到 Taylor Swift 照片旁', [
      [5.4, 'RT-2-X（图文协同微调）：认出照片 ✅'],
      [7.0, 'OpenVLA（仅机器人微调）：走去错照片 ❌']
    ]);

    var R = 412;
    label(s, R, 52, '论文图 4：Google 机器人成功率（%，每任务 5 次）', 'demo-x-ink', 13);
    readHint(s, R, 74, '分分布内 5 任务、分布外 7 任务与总平均，柱越高越好', 11, 364);
    legendRow(s, R, 98, [['RT-1-X', C_MUTED, 44], ['Octo', C_ACCENT, 34], ['RT-2-X', C_PURPLE, 46], ['OpenVLA', C_GOOD, 58]], 11);

    var gx0 = R + 30, gyBase = 264, gh = 138;
    hline(s, gx0, gyBase, R + 356, gyBase, C_BORDER, 1.3);
    hline(s, gx0, gyBase - gh, gx0, gyBase, C_BORDER, 1.3);
    [0, 50, 100].forEach(function (yv) {
      var yy = gyBase - yv / 100 * gh;
      hline(s, gx0 - 4, yy, gx0, yy, C_BORDER, 1.2);
      label(s, gx0 - 6, yy + 4, String(yv), 'demo-x-mut', 11, 'end');
    });
    var gBars = [];
    FIG4_GOOGLE.cats.forEach(function (cat, gi) {
      var cx = gx0 + 18 + gi * 106;
      var cols4 = cat.v.map(function (val, mi) {
        var vb = vbar(s, cx + mi * 18, 15, FIG3_BRIDGE.cols[mi]);
        var vt = label(s, cx + mi * 18 + 7.5, gyBase - 4, '', 'demo-x-ink', 11, 'middle');
        return { vb: vb, vt: vt, val: val };
      });
      gBars.push(cols4);
      label(s, cx + 34, gyBase + 18, cat.name, 'demo-x-ink2', 11, 'middle');
    });

    rectBox(s, R, 298, 364, 88, C_BORDER, C_SURFACE2);
    var boxT1 = label(s, R + 12, 324, '', 'demo-x-ink', 11.5);
    var boxT2 = label(s, R + 12, 350, '', 'demo-x-ink2', 11);
    var boxT3 = label(s, R + 12, 374, '', 'demo-x-mut', 11);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      var u = seg(since(t, clock, 0.2), 0.0, 1.0);
      gBars.forEach(function (cols4) {
        cols4.forEach(function (b) {
          var h = b.val / 100 * gh * u;
          b.vb.set(gyBase, h);
          b.vt.setAttribute('y', (gyBase - h - 5).toFixed(1));
          b.vt.textContent = Math.round(b.val * u) + '';
        });
      });
      var mode = t < 3.6 ? 0 : t < 10.4 ? 1 : 2;
      setOpacity(gFig9.g, mode === 0 ? 1 : 0);
      setOpacity(cBan.g, mode === 1 ? 1 : 0);
      setOpacity(cTay.g, mode === 2 ? 1 : 0);
      cBan.at(now, mode === 1);
      cTay.at(since(t, clock, 10.4), mode === 2);

      if (t < 7.0) {
        boxT1.textContent = 'Google 60 次总平均：OpenVLA 85.0% 对比 RT-2-X 78.3%';
        boxT2.textContent = '分布内 88.0% 赢过 72.0%；分布外 82.9% 与 RT-2-X 打平';
        boxT3.textContent = '小模型 RT-1-X（33.3%）与 Octo（26.7%）遇到干扰明显掉分';
      } else if (t < 10.4) {
        boxT1.textContent = '摘要「高 16.5%」怎么算出来的？';
        boxT2.textContent = 'WidowX 170 次 + Google 60 次 = 共 230 次真机测试';
        boxT3.textContent = 'OpenVLA 171/230 = 74.3%，RT-2-X 133/230 = 57.8%，相差 +16.5%';
      } else {
        boxT1.textContent = 'OpenVLA 输在哪一题？名人照片等纯互联网概念';
        boxT2.textContent = 'RT-2-X 边训机器人动作边温习图文问答（协同微调）';
        boxT3.textContent = 'OpenVLA 只在机器人数据上微调，忘掉了部分互联网名人长相';
      }
    }
    return { el: s, draw: draw };
  }

  /* 第 11 幕：消融：跨机器人数据与双编码器（表 9 + 图 8） */
  function buildScene11() {
    var s = sceneSvg('左上放论文图 8 原始 Bridge 8 个消融任务照片；左下画 20 多种外援机器人汇入 WidowX 带来 +30.7 个百分点的飞跃。右边画附录表 9 三行消融条形图与胜过 RT-2-X 的三条原因');
    label(s, 24, 26, '剥洋葱消融：为什么 7B OpenVLA 能赢 55B RT-2-X？', 'demo-x-ink2', 13.5);
    paperPart(s, 'fig8', 0.0, 0.0, 1.0, 1.0, 24, 46, 368, '论文附录图 8：原始 BridgeData V2 的 8 个受控消融任务');

    rectBox(s, 24, 238, 368, 148, C_BORDER, C_SURFACE2);
    label(s, 38, 264, '跨机器人数据正迁移（附录表九，80 次测试）：', 'demo-x-ink', 11.5);
    chip(s, 38, 282, 136, '20+ 种别的机器人', C_ACCENT, { h: 36 });
    chip(s, 236, 282, 138, 'WidowX 水槽涨 30.7%', C_GOOD, { h: 36 });
    var flBridge = flowSeg(s, C_GOOD, 3, 3.2, 50);
    label(s, 38, 344, '即使别的机器人长相、相机角度不同，操作规律也能互通', 'demo-x-ink2', 11);
    label(s, 38, 368, '从 45.6% 升到 76.3%（提高 30.7 个百分点）', 'demo-x-mut', 11);

    var R = 420;
    label(s, R, 56, '附录表九：8 个 Bridge 任务（共 80 次）消融', 'demo-x-ink', 13.5);
    readHint(s, R, 80, '横条越长成功率越高；逐项加上 DINOv2 与跨机器人混合数据', 11, 356);
    var b9 = TABLE9_ABL.map(function (it, k) {
      return barRowAt(s, R, 108 + k * 38, 152, it.name, it.col, 20, 11);
    });

    var rBox = group(s);
    label(rBox, R, 240, '论文总结赢过 55B RT-2-X 的三条原因（§5.1）：', 'demo-x-ink', 12.5);
    var reasons = [
      ['① 数据大近 3 倍', '97 万条真机轨迹对比 RT-2-X 的 35 万条', C_GOOD],
      ['② 清洗静止废帧', '删掉 Bridge 数据里手停着不动的全零动作帧', C_ACCENT],
      ['③ DINOv2 空间眼', '补足纯图文编码器欠缺的三维几何定位能力', C_PURPLE]
    ];
    reasons.forEach(function (it, k) {
      var yy = 258 + k * 42;
      rectBox(rBox, R, yy, 356, 34, it[2], C_SURFACE2);
      tone(rBox, R + 12, yy + 22, it[0], it[2], 11.5);
      label(rBox, R + 124, yy + 22, it[1], 'demo-x-ink2', 11);
    });

    function draw(t, clock) {
      var now = nowOf(t, clock);
      flBridge.at(now, [178, 300], [232, 300], true);
      var u = seg(since(t, clock, 0.3), 0.0, 1.3);
      TABLE9_ABL.forEach(function (it, k) {
        b9[k].set(it.v * 1.85 * u, f1(it.v * u) + '%');
      });
      rBox.style.opacity = clamp(since(t, clock, 7.0) / 0.6, 0.25, 1);
    }
    return { el: s, draw: draw };
  }

  /* 第 12 幕：迁到新真机：Franka 窄任务与多任务（图 5 + 表 7） */
  function buildScene12() {
    var s = sceneSvg('左边切换三段项目页 Franka 对比视频：窄任务倒玉米（扩散策略赢）、多物体按指令拿黄玉米（OpenVLA 赢）、移白盐瓶（机器人预训练赢底座直训）。右边重画图 5 五种方法对比与胜负边界');
    label(s, 24, 26, '迁到没见过的新真机：Franka 微调（10–150 条示范）', 'demo-x-ink2', 13.5);

    var cPour = seqClip(s, 'franka_pour', 24, 46, 356, 267, '项目页视频（5×）：单一窄任务「把玉米倒进锅里」', [
      [5.5, 'Diffusion Policy（连续动作块）：一气呵成 ✅'],
      [7.5, 'OpenVLA（单步离散）：碗沿对不准洒出 ❌']
    ]);
    var cMulti = seqClip(s, 'franka_multi', 24, 46, 356, 267, '项目页视频（5×）：多物体指令「把黄玉米移到盘子上」', [
      [3.76, 'Diffusion Policy：抓错旁边的蓝纸盒 ❌'],
      [3.44, 'OpenVLA：听懂指令抓对黄玉米 ✅']
    ]);
    var cScratch = seqClip(s, 'franka_scratch', 24, 46, 356, 267, '项目页视频（5×）：「把白色盐瓶移到盘子上」', [
      [3.24, '从底座 VLM 直接训（无 OXE 预训练）：抓空 ❌'],
      [2.56, '完整 OpenVLA：稳稳放到盘中 ✅']
    ]);

    var R = 412;
    label(s, R, 52, '论文图 5 + 表七：Franka 7 个任务成功率（%）', 'demo-x-ink', 13);
    readHint(s, R, 74, '对比总平均、窄单任务（倒玉米）与语言多任务，越高越好', 11, 364);
    legendRow(s, R, 98, [['DP', C_WARN, 24], ['DP对齐', C_MUTED, 46], ['Octo', C_ACCENT, 34], ['底座直训', C_PURPLE, 56], ['OpenVLA', C_GOOD, 56]], 11);

    var gx0 = R + 28, gyBase = 266, gh = 138;
    hline(s, gx0, gyBase, R + 362, gyBase, C_BORDER, 1.3);
    [0, 50, 100].forEach(function (yv) {
      var yy = gyBase - yv / 100 * gh;
      hline(s, gx0, yy, R + 362, yy, C_BORDER, 0.8, yv ? '3 3' : null);
      label(s, gx0 - 6, yy + 4, String(yv), 'demo-x-mut', 11, 'end');
    });
    var subRows = [
      { name: '7 任务总均', v: [43.4, 37.1, 41.5, 35.2, 63.8] },
      { name: '倒玉米(窄)', v: [77.8, 55.6, 0.0, 22.2, 44.4] },
      { name: '锅内多任务', v: [45.8, 41.7, 62.5, 54.2, 83.3] }
    ];
    var fBars = [];
    subRows.forEach(function (row, gi) {
      var cx = gx0 + 14 + gi * 110;
      var cols5 = row.v.map(function (val, mi) {
        return { vb: vbar(s, cx + mi * 15, 12.5, FIG5_FRANKA.cols[mi]), val: val };
      });
      fBars.push(cols5);
      label(s, cx + 36, gyBase + 18, row.name, 'demo-x-ink2', 11, 'middle');
    });

    rectBox(s, R, 298, 364, 88, C_BORDER, C_SURFACE2);
    var ft1 = label(s, R + 12, 324, '', 'demo-x-ink', 11.5);
    var ft2 = label(s, R + 12, 350, '', 'demo-x-ink2', 11);
    var ft3 = label(s, R + 12, 374, '', 'demo-x-mut', 11);

    function draw(t, clock) {
      var u = seg(since(t, clock, 0.2), 0.0, 1.0);
      fBars.forEach(function (cols5) {
        cols5.forEach(function (b) { b.vb.set(gyBase, b.val / 100 * gh * u); });
      });
      var mode = t < 7.0 ? 0 : t < 10.4 ? 1 : 2;
      setOpacity(cPour.g, mode === 0 ? 1 : 0);
      setOpacity(cMulti.g, mode === 1 ? 1 : 0);
      setOpacity(cScratch.g, mode === 2 ? 1 : 0);
      cPour.at(since(t, clock, 0.4), mode === 0);
      cMulti.at(since(t, clock, 7.0), mode === 1);
      cScratch.at(since(t, clock, 10.4), mode === 2);

      if (t < 3.6) {
        ft1.textContent = '两套未见设置：Franka 桌面 5 Hz + DROID 15 Hz';
        ft2.textContent = '7 个任务总平均：OpenVLA 63.8%，比 Diffusion Policy 高 20.4%';
        ft3.textContent = '每个任务给 10 到 150 条人类遥操作示范';
      } else if (t < 7.0) {
        ft1.textContent = '什么时候选扩散策略？单一窄任务、重连续轨迹（如倒玉米）';
        ft2.textContent = '倒玉米：Diffusion Policy 77.8% 赢过 OpenVLA 44.4%';
        ft3.textContent = '动作分块 + 扩散去噪在纯轨迹精细度上仍占优';
      } else if (t < 10.4) {
        ft1.textContent = '什么时候选 OpenVLA？多物体同台、要听语言指令选目标';
        ft2.textContent = '桌面多任务 66.7%（DP 25%）、锅内多任务 83.3%（DP 45.8%）';
        ft3.textContent = 'DROID 擦桌子同样拿到 58.3%（DP 35.0%、Octo 38.3%）';
      } else {
        ft1.textContent = '单靠图文底座够吗？不够，看紫色柱 OpenVLA (scratch)';
        ft2.textContent = '跳过 97 万条机器人预训练直接微调 VLM，平均为 35.2%';
        ft3.textContent = '互联网图文先验 + OXE 机器人预训练两步缺一不可';
      }
    }
    return { el: s, draw: draw };
  }

  /* 第 13 幕：迁到仿真：LIBERO 四个基准（表 12） */
  function buildScene13() {
    var s = sceneSvg('左边重画附录表 12 LIBERO 四个套件与总平均分组柱状图（DP、Octo、OpenVLA）；右边讲解四个套件各考什么、图像增强的重要性与长程瓶颈');
    label(s, 24, 26, '标准仿真基准：LIBERO 四个套件（每套 1,500 次评估）', 'demo-x-ink2', 13.5);

    rectBox(s, 24, 48, 372, 338, C_BORDER, C_SURFACE2);
    readHint(s, 36, 72, '附录表十二：3 个随机种子 × 500 次 = 每套 1500 次，越高越好', 11, 348);
    legendRow(s, 36, 98, [['Diffusion Policy', C_WARN, 102], ['Octo', C_ACCENT, 38], ['OpenVLA', C_GOOD, 58]], 11);

    var gx0 = 64, gyBase = 332, gh = 196;
    hline(s, gx0, gyBase, 382, gyBase, C_BORDER, 1.3);
    [0, 50, 100].forEach(function (yv) {
      var yy = gyBase - yv / 100 * gh;
      hline(s, gx0, yy, 382, yy, C_BORDER, 0.8, yv ? '3 3' : null);
      label(s, gx0 - 6, yy + 4, String(yv), 'demo-x-mut', 11, 'end');
    });
    var libShort = ['Spatial', 'Object', 'Goal', 'Long', '平均'];
    var lBars = [];
    TABLE12_LIBERO.suites.forEach(function (st, gi) {
      var cx = gx0 + 10 + gi * 62;
      var cols3 = st.v.map(function (val, mi) {
        return { vb: vbar(s, cx + mi * 15, 13, TABLE12_LIBERO.cols[mi]), val: val };
      });
      lBars.push(cols3);
      label(s, cx + 21, gyBase + 18, libShort[gi], 'demo-x-ink2', 11, 'middle');
    });
    label(s, 210, 374, '四套件平均：OpenVLA 76.5% · Octo 75.1% · DP 72.4%', 'demo-x-ink', 11.5, 'middle');

    var R = 420;
    var p1 = group(s);
    label(p1, R, 60, '为什么补做 LIBERO 仿真实验？（附录 F）', 'demo-x-ink', 13.5);
    label(p1, R, 92, '真机水池和餐具每家实验室摆法不同，别人很难一模一样复现', 'demo-x-ink2', 11.5);
    label(p1, R, 122, 'LIBERO 有 4 个套件 × 各 10 个任务，每个任务给 50 条人类示范', 'demo-x-ink', 11.5);
    label(p1, R, 150, '同样只喂第三视角图像和语言指令，用 LoRA r=32 微调', 'demo-x-mut', 11);

    var p2 = group(s);
    label(p2, R, 60, 'Spatial 与 Object：空间位置 vs 物体种类', 'demo-x-ink', 13.5);
    label(p2, R, 92, 'LIBERO-Spatial（换碗碟相对位置）：OpenVLA 84.7% 拿第一', 'demo-x-ink', 11.5);
    label(p2, R, 122, 'LIBERO-Object（换不同物体抓放）：Diffusion Policy 92.5% 最高', 'demo-x-ink2', 11.5);

    var p3 = group(s);
    label(p3, R, 60, 'Goal 与 Long：换目标与长程多步串联', 'demo-x-ink', 13.5);
    label(p3, R, 92, 'LIBERO-Goal（同一桌面做不同子目标）：Octo 84.6%，OpenVLA 79.2%', 'demo-x-ink2', 11.5);
    label(p3, R, 122, 'LIBERO-Long（多步长程任务）：三家都掉到五成出头，OpenVLA 53.7%', 'demo-x-ink', 11.5);
    label(p3, R, 150, '长程串联操作仍是所有单步或短块模仿策略的共同硬骨头', 'demo-x-mut', 11);

    var p4 = group(s);
    label(p4, R, 60, '微调小贴士：仿真小数据必须开图像增强', 'demo-x-ink', 13.5);
    rectBox(p4, R, 82, 356, 94, C_WARN, C_SURFACE2);
    label(p4, R + 14, 110, '70 亿参数容量大，直接在几百条干净仿真轨迹上微调极易死记背景', 'demo-x-ink2', 11.5);
    label(p4, R + 14, 138, '官方微调脚本默认开启随机裁剪（Random Crop）与颜色抖动', 'demo-x-ink', 11.5);
    label(p4, R + 14, 162, '关掉增强后验证成功率明显下滑（见 finetune.py 参数说明）', 'demo-x-mut', 11);

    var p5 = group(s);
    label(p5, R, 60, '小结：四套件总平均 76.5 ± 0.6% 排名第一', 'demo-x-ink', 13.5);
    label(p5, R, 92, '在纯真机数据上预训练的 OpenVLA，迁去仿真环境同样好使', 'demo-x-ink', 11.5);
    label(p5, R, 122, '官方把 LIBERO 全套数据处理和评测脚本一并开源，成了后续 VLA 标配基准', 'demo-x-ink2', 11.5);

    function draw(t, clock) {
      var u = seg(since(t, clock, 0.2), 0.0, 1.1);
      lBars.forEach(function (cols3) {
        cols3.forEach(function (b) { b.vb.set(gyBase, b.val / 100 * gh * u); });
      });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 第 14 幕：一张卡怎么微调：LoRA 低秩适配（表 1） */
  function buildScene14() {
    var s = sceneSvg('左上画冻结原矩阵 W0（4096×4096）并在旁路挂两个瘦矩阵 A（32×4096）和 B（4096×32）；左下画表 1 六种微调方案的显存与成功率散点对照。右边逐条拆解表 1');
    label(s, 24, 26, '低秩微调：LoRA 改 1.4% 参数，追平全参数微调', 'demo-x-ink2', 13.5);

    /* 左上：LoRA 矩阵旁路示意 */
    rectBox(s, 24, 48, 368, 152, C_BORDER, C_SURFACE2);
    rectBox(s, 42, 68, 108, 108, C_ACCENT, C_SURFACE);
    rich(s, 96, 118, '冻结 $W_0$', 12, 'demo-x-ink', 'middle');
    label(s, 96, 142, '4096 × 4096', 'demo-x-mut', 11, 'middle');
    label(s, 96, 162, '1,678 万参数', 'demo-x-mut', 11, 'middle');

    label(s, 168, 118, '+', 'demo-x-ink', 16, 'middle');
    var boxB = rectBox(s, 190, 72, 28, 84, C_GOOD, C_SURFACE);
    label(s, 204, 118, 'B', 'demo-x-ink', 12, 'middle');
    label(s, 228, 118, '×', 'demo-x-ink', 14, 'middle');
    var boxA = rectBox(s, 242, 100, 100, 28, C_GOOD, C_SURFACE);
    label(s, 292, 118, 'A（秩 32）', 'demo-x-ink', 11.5, 'middle');
    tone(s, 292, 174, '可训 26.2 万（1.56%）', C_GOOD, 11.5, 'middle');

    /* 左下：表 1 显存 vs 成功率平面图 */
    rectBox(s, 24, 214, 368, 174, C_BORDER, C_SURFACE2);
    readHint(s, 36, 236, '表一：横轴显存越左越省，纵轴成功率越高越好（左上角最优）', 11, 344);
    var px0 = 66, px1 = 368, py0 = 358, py1 = 258;
    hline(s, px0, py0, px1, py0, C_BORDER, 1.3);
    hline(s, px0, py1, px0, py0, C_BORDER, 1.3);
    label(s, px0, py0 + 18, '40 GB', 'demo-x-mut', 11, 'start');
    label(s, px1, py0 + 18, '175 GB（双卡）', 'demo-x-mut', 11, 'end');
    var pts1 = [
      { x: 163.3, y: 69.7, nm: '全参 69.7%', col: C_ACCENT, dx: -8, dy: -8, anc: 'end' },
      { x: 51.4, y: 30.3, nm: '末层 30.3%', col: C_BAD, dx: 8, dy: 4, anc: 'start' },
      { x: 156.2, y: 47.0, nm: '冻视觉 47%', col: C_WARN, dx: -8, dy: 4, anc: 'end' },
      { x: 64.0, y: 62.1, nm: '三明治 62.1%', col: C_PURPLE, dx: 8, dy: 12, anc: 'start' },
      { x: 59.7, y: 68.2, nm: 'LoRA 68.2%', col: C_GOOD, dx: 8, dy: -8, anc: 'start' }
    ];
    var ptDots = pts1.map(function (pt) {
      var sx = px0 + (pt.x - 40) / 135 * (px1 - px0), sy = py0 - (pt.y - 20) / 60 * (py0 - py1);
      var d = dotAt(s, sx, sy, pt.col === C_GOOD ? 6 : 4.5, pt.col);
      tone(s, sx + pt.dx, sy + pt.dy, pt.nm, pt.col, 11, pt.anc);
      return d;
    });

    var R = 420;
    var p1 = group(s);
    label(p1, R, 60, '全参数微调显存高：批大小 16 要 163.3 GB 显存', 'demo-x-ink', 13.5);
    label(p1, R, 92, '表一在 Franka 三个代表任务（33 次真机测试）上比了 6 种微调方案', 'demo-x-ink2', 11.5);
    label(p1, R, 122, '全改 71.9 亿参数拿到 69.7%，需要两张 80G A100 并联才装得下', 'demo-x-ink', 11.5);

    var p2 = group(s);
    label(p2, R, 60, '只改局部行不行？三种裁剪方案都掉分', 'demo-x-ink', 13.5);
    label(p2, R, 92, '只训最后一层 + 投影器（51.4 GB）：成功率降到 30.3%', 'demo-x-ink2', 11.5);
    label(p2, R, 122, '冻住视觉只训语言模型（156.2 GB）：费显存且降到 47.0%', 'demo-x-ink2', 11.5);
    label(p2, R, 152, '首尾一起训的「三明治微调」（64.0 GB）：升到 62.1%，仍差 7.6 个点', 'demo-x-ink', 11.5);

    var p3 = group(s);
    label(p3, R, 60, 'LoRA 低秩适配：冻住大矩阵，旁路挂瘦矩阵', 'demo-x-ink', 13.5);
    math(p3, R, 98, 'W = W_0 + \\Delta W = W_0 + B A,\\quad r = 32 \\ll 4096', 13.5);
    label(p3, R, 142, '把视觉编码器、投影器和语言模型的所有线性层都挂上 r = 32 旁路', 'demo-x-ink2', 11.5);
    label(p3, R, 170, '可训练参数为 9,760 万（占全模型 1.4%），省掉大量优化器动量显存', 'demo-x-ink', 11.5);

    var p4 = group(s);
    label(p4, R, 60, '表一推荐配方：LoRA r = 32（68.2% 对比全参 69.7%）', 'demo-x-ink', 13.5);
    chip(p4, R, 86, 170, '显存 59.7 GB（批 16）', C_GOOD, { h: 36 });
    chip(p4, R + 184, 86, 172, '单卡 10–15 小时训完', C_ACCENT, { h: 36 });
    label(p4, R, 150, '调小批大小或配合梯度累积，单张 24 GB 消费卡也能跑通微调', 'demo-x-ink2', 11.5);
    label(p4, R, 178, '用 8 张 A100 并行的话，1.5 小时就能训好一个新任务', 'demo-x-mut', 11);

    var p5 = group(s);
    label(p5, R, 60, '秩翻倍到 r = 64 更好吗？不用，同样是 68.2%', 'demo-x-ink', 13.5);
    label(p5, R, 92, 'r = 64 可训练参数翻倍到 1.95 亿，显存 60.5 GB，成功率仍是 68.2%', 'demo-x-ink2', 11.5);
    label(p5, R, 122, '所以官方开源脚本把 r = 32 定为默认微调配置', 'demo-x-ink', 11.5);
    label(p5, R, 150, '注：表一脚注写明跑在早期单编码器版 v01 上，全参合计 7,188.1M', 'demo-x-mut', 11);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      var pulse = 0.55 + 0.45 * Math.sin(now * 3.2);
      boxA.style.strokeWidth = (1.3 + 1.4 * pulse).toFixed(2);
      boxB.style.strokeWidth = (1.3 + 1.4 * pulse).toFixed(2);
      var focusIdx = t < 3.6 ? 0 : t < 7.0 ? 3 : 4;
      ptDots.forEach(function (d, k) {
        d.setAttribute('r', k === focusIdx ? (5.5 + 1.8 * pulse).toFixed(1) : '4.5');
      });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 第 15 幕：小显存怎么推理：4-bit 量化与频率陷阱（图 6 + 表 2 + 表 11） */
  function buildScene15() {
    var s = sceneSvg('左上重画论文图 6 四张代表显卡在 bf16、int8、int4 下的每秒动作数；左下对比表 2（非阻塞控制 int8 掉到 58.1%）与附录表 11（阻塞控制 int8 回到 74.4%）。右边解开 8-bit 掉分之谜');
    label(s, 24, 26, '量化推理与频率陷阱：为什么 4-bit 稳、8-bit 反而掉分？', 'demo-x-ink2', 13.5);

    /* 左上：图 6 显卡速度 */
    rectBox(s, 24, 48, 368, 166, C_BORDER, C_SURFACE2);
    readHint(s, 36, 70, '论文图 6：每秒推理动作数（Hz），越高越快', 11, 344);
    legendRow(s, 36, 94, [['bf16', C_ACCENT, 34], ['int8', C_WARN, 32], ['int4', C_GOOD, 32]], 11);
    var gpus4 = [GPU_QUANT[1], GPU_QUANT[2], GPU_QUANT[0], GPU_QUANT[3]]; // A5000, A100, 4090, H100
    var sx0 = 62, syBase = 188, sh = 74, sBars = [];
    hline(s, sx0, syBase, 376, syBase, C_BORDER, 1.2);
    gpus4.forEach(function (g, gi) {
      var cx = sx0 + 12 + gi * 78;
      var tri = g.hz.map(function (v, mi) {
        return { vb: vbar(s, cx + mi * 17, 14, [C_ACCENT, C_WARN, C_GOOD][mi]), v: v || 0 };
      });
      sBars.push(tri);
      label(s, cx + 24, syBase + 16, g.gpu.replace('RTX ', ''), 'demo-x-ink2', 11, 'middle');
    });

    /* 左下：表 2 非阻塞 vs 表 11 阻塞 */
    rectBox(s, 24, 226, 368, 162, C_BORDER, C_SURFACE2);
    readHint(s, 36, 248, 'A5000 跑 80 次 WidowX：对比非阻塞（表二）与阻塞（表十一）', 11, 344);
    var qRows = TABLE2_QUANT.map(function (it, k) {
      var yy = 274 + k * 34;
      label(s, 118, yy + 14, it.prec.split('（')[0], 'demo-x-ink2', 11, 'end');
      var bNb = hbar(s, 126, yy, 9, it.col, 0.95);
      var bBl = hbar(s, 126, yy + 11, 9, C_MUTED, 0.75);
      var txt = label(s, 300, yy + 14, '', 'demo-x-ink', 11);
      return { bNb: bNb, bBl: bBl, txt: txt, it: it };
    });
    label(s, 36, 380, '上条彩色 = 非阻塞异步（表二）　下条灰色 = 阻塞同步（表十一）', 'demo-x-mut', 11);

    var R = 420;
    var p1 = group(s);
    label(p1, R, 60, '推理显存减半再减半：7.0 GB 装下 7B 大模型', 'demo-x-ink', 13.5);
    chip(p1, R, 86, 112, 'bf16: 16.8 GB', C_ACCENT, { h: 36 });
    chip(p1, R + 122, 86, 112, 'int8: 10.2 GB', C_WARN, { h: 36 });
    chip(p1, R + 244, 86, 112, 'int4: 7.0 GB', C_GOOD, { h: 36 });
    label(p1, R, 150, '4 位量化把权重压到 7.0 GB，普通笔记本或桌面卡都能加载', 'demo-x-ink2', 11.5);

    var p2 = group(s);
    label(p2, R, 60, '表二对比：4-bit 为 71.9%，8-bit 降到 58.1%', 'demo-x-ink', 13.5);
    label(p2, R, 92, '在 A5000 默认非阻塞控制下：bf16 71.3%，int4 拿到 71.9%', 'demo-x-ink', 11.5);
    label(p2, R, 122, '按理说位数更多的 int8 应该更准，结果却降到 58.1%', 'demo-x-ink2', 11.5);

    var p3 = group(s);
    label(p3, R, 60, '查图六找原因：int8 算子反而把显卡拖慢了', 'demo-x-ink', 13.5);
    label(p3, R, 92, 'bitsandbytes 的 8-bit 实现有大量量化搬运开销：A5000 上为 1.20 Hz', 'demo-x-ink2', 11.5);
    label(p3, R, 122, '而 4-bit 算子优化更好，跑出 2.92 Hz；RTX 4090 上可达 6.01 Hz', 'demo-x-ink', 11.5);

    var p4 = group(s);
    label(p4, R, 60, '慢推理 + 非阻塞异步控制 = 动作节拍失配', 'demo-x-ink', 13.5);
    rectBox(p4, R, 82, 356, 96, C_WARN, C_SURFACE2);
    label(p4, R + 14, 110, 'Bridge 训练数据是按 5 Hz（每 0.20 秒一步）录的', 'demo-x-ink2', 11.5);
    label(p4, R + 14, 138, '非阻塞模式下机器人不等显卡算完，1.2 Hz 让反馈滞后 0.83 秒', 'demo-x-ink', 11.5);
    label(p4, R + 14, 164, '夹爪走过头才看到上一秒的画面，动力学和训练时对不上', 'demo-x-mut', 11);

    var p5 = group(s);
    label(p5, R, 60, '附录表十一验证：改成「走一步停下等」随即恢复', 'demo-x-ink', 13.5);
    label(p5, R, 92, '换成阻塞控制（每走完一步停稳等新动作）：int8 升回 74.4%', 'demo-x-ink', 11.5);
    label(p5, R, 122, '证明 8-bit 数值本身没坏，坏在控制频率掉太多', 'demo-x-ink2', 11.5);
    label(p5, R, 150, '实战结论：推理直接开 4-bit 量化，省显存且速度接近 bf16', 'demo-x-ink', 11.5);

    function draw(t, clock) {
      var u = seg(since(t, clock, 0.2), 0.0, 1.1);
      sBars.forEach(function (tri) {
        tri.forEach(function (b) { b.vb.set(syBase, b.v / 7.0 * sh * u); });
      });
      qRows.forEach(function (r) {
        setW(r.bNb, r.it.nonblock * 2.0 * u);
        setW(r.bBl, r.it.block * 2.0 * u);
        r.txt.setAttribute('x', (126 + Math.max(r.it.nonblock, r.it.block) * 2.0 * u + 8).toFixed(1));
        r.txt.textContent = r.it.nonblock + '% / ' + r.it.block + '%';
      });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 第 16 幕：论文与官方代码的几处出入 */
  function buildScene16() {
    var s = sceneSvg('左边是一排五张来回翻转的核对卡，在橙色「论文说法」和绿色「代码/权重实测」之间切换；右边逐条展示参数量、255 个区间、EOS 损失、v01 版本与图表两处笔误');
    label(s, 24, 26, '一手核对：论文正文、图表与开源代码的几处出入', 'demo-x-ink2', 13.5);

    var flips = flipList(s, 24, 58, [
      ['参数与投影器', '统称 7B · 2 层 MLP', '7.54B · 3 层 GELU'],
      ['动作离散化', '256 个等宽区间', '255 个区间 (256 端点)'],
      ['交叉熵词数', '7 个动作词', '7 个动作词 + EOS = 8'],
      ['表一表二模型', '主模型双编码器', '早期单眼版 v01 (7.19B)'],
      ['图 5 / 图 10', '柱标 53.5 · 配图标题', '8/15=53.3% · 两图贴反']
    ], 92, 186, ['论文', '代码/实核']);
    label(s, 24, 326, '橙框 = 论文正文或图表写法　绿框 = 官方代码 c8f03f4 与权重实测', 'demo-x-mut', 11);
    label(s, 24, 350, '核心结论完全成立，自己复现分词器与算参数时留意对齐代码', 'demo-x-ink2', 11.5);

    var R = 420;
    var p1 = group(s);
    label(p1, R, 60, '出入一：7.54B 总参数与 3 层融合投影器', 'demo-x-ink', 13.5);
    label(p1, R, 92, '论文 §3.1 写 2 层 MLP 投影器，对应单编码器配置', 'demo-x-ink2', 11.5);
    label(p1, R, 122, '开源 openvla-7b 用 FusedMLPProjector：3 层线性 + 2 个 GELU（71.4M）', 'demo-x-ink', 11.5);
    label(p1, R, 150, '加上双编码器 730.9M 与 Llama 2 6.74B，精确总数为 7,541,237,184', 'demo-x-mut', 11);

    var p2 = group(s);
    label(p2, R, 60, '出入二：np.linspace(-1, 1, 256) 切成 255 个区间', 'demo-x-ink', 13.5);
    label(p2, R, 92, '256 个端点夹出 255 个区间，bin_centers 数组长度是 255', 'demo-x-ink', 11.5);
    label(p2, R, 122, '解码 clip(disc − 1, 0, 254) 把第 255、256 档合并到 +0.9961', 'demo-x-ink2', 11.5);
    label(p2, R, 150, '词表虽补齐到 32,064，动作词号仍从 32,000 倒扣（31744..31999）', 'demo-x-mut', 11);

    var p3 = group(s);
    label(p3, R, 60, '出入三：训练标签留了末尾结束符 EOS', 'demo-x-ink', 13.5);
    label(p3, R, 92, 'datasets.py 写的是 labels[:-(action_dim + 1)] = -100', 'demo-x-ink', 11.5);
    label(p3, R, 122, '即 7 个动作词加上紧跟的 EOS 共 8 个位置参与交叉熵反传', 'demo-x-ink2', 11.5);

    var p4 = group(s);
    label(p4, R, 60, '出入四：表一、表二跑在早期预览版 v01 上', 'demo-x-ink', 13.5);
    label(p4, R, 92, '§5.3 脚注 3 注明：微调与量化消融用的是单 SigLIP + Vicuna-7B 版', 'demo-x-ink2', 11.5);
    label(p4, R, 122, '所以表一全参写 7,188.1M；另外正文写 bf16 占 15 GB，表二实测 16.8 GB', 'demo-x-ink', 11.5);

    var p5 = group(s);
    label(p5, R, 60, '出入五：图 5 与附录图 10 的两处排版小笔误', 'demo-x-ink', 13.5);
    label(p5, R, 92, '图 5 胡萝卜（15 次）：DP 柱顶印 53.5，8/15 实为 53.3%', 'demo-x-ink2', 11.5);
    label(p5, R, 122, '附录图 10 左下与中下两张分布外照片（胡萝卜与玉米）贴反', 'demo-x-ink2', 11.5);

    function draw(t, clock) {
      flips.set(nowOf(t, clock));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 第 17 幕：局限与开源清单（不预告下一篇） */
  function buildScene17() {
    var s = sceneSvg('左上列出论文第 6 节自述的四条局限，左下展示开源交付的四块积木；右边逐条拆解单图输入、6 Hz 串行瓶颈、窄任务差距、未做图文协同微调与历史定位');
    label(s, 24, 26, '论文自述的四条局限与开源生态定位', 'demo-x-ink2', 13.5);

    rectBox(s, 24, 48, 368, 178, C_BORDER, C_SURFACE2);
    label(s, 38, 72, '论文第 6 节明确列出的四条边界：', 'demo-x-ink', 12);
    var lims = [
      ['① 输入单一', '单张第三视角图，无手腕与关节', C_WARN],
      ['② 串行偏慢', '7 词逐个吐，约 6 Hz，无动作块', C_BAD],
      ['③ 窄活仍有差距', '倒玉米等不及从零训的扩散策略', C_PURPLE],
      ['④ 未协同训图文', '纯机器人微调冲淡部分图文记忆', C_ACCENT]
    ];
    var limBoxes = lims.map(function (it, k) {
      var gx = 36 + (k % 2) * 174, gy = 86 + Math.floor(k / 2) * 64;
      var rb = rectBox(s, gx, gy, 166, 52, it[2], C_SURFACE);
      tone(s, gx + 10, gy + 20, it[0], it[2], 11.5);
      label(s, gx + 10, gy + 40, it[1].slice(0, 13), 'demo-x-mut', 11);
      return rb;
    });

    rectBox(s, 24, 240, 368, 146, C_GOOD, C_SURFACE2);
    label(s, 38, 266, 'OpenVLA 交出的开源地基（MIT 协议）：', 'demo-x-ink', 12);
    var ossChips = [
      chip(s, 38, 282, 162, 'openvla-7b 权重', C_GOOD, { h: 36 }),
      chip(s, 214, 282, 162, 'OXE 训练全栈代码', C_ACCENT, { h: 36 }),
      chip(s, 38, 330, 162, '单卡 LoRA 脚本', C_WARN, { h: 36 }),
      chip(s, 214, 330, 162, '4-bit 部署接口', C_PURPLE, { h: 36 })
    ];

    var R = 420;
    var p1 = group(s);
    label(p1, R, 60, '局限一：单张第三视角 RGB 图输入', 'demo-x-ink', 13.5);
    label(p1, R, 92, '没有接入腕部近景相机、机器人本体关节角，也没有叠多帧历史', 'demo-x-ink2', 11.5);
    label(p1, R, 122, '遮挡严重或需要力控暗示的场景会受限；作者建议后续扩多图输入', 'demo-x-mut', 11);

    var p2 = group(s);
    label(p2, R, 60, '局限二：串行自回归吐词，做不了 50 Hz 高频操作', 'demo-x-ink', 13.5);
    label(p2, R, 92, 'RTX 4090 上每秒约 6.2 步，A5000 上约 3.4 步', 'demo-x-ink', 11.5);
    label(p2, R, 122, '像 ALOHA 双臂穿魔术贴扎带那种 50 Hz 高频精细活还跑不动', 'demo-x-ink2', 11.5);
    label(p2, R, 150, '论文 §6 提出两条改进方向：引入动作分块，或用推测解码加速', 'demo-x-mut', 11);

    var p3 = group(s);
    label(p3, R, 60, '局限三：高难度窄任务可靠性未过九成', 'demo-x-ink', 13.5);
    label(p3, R, 92, '在单一场景精细轨迹任务上，从零训的连续动作块策略依然更稳', 'demo-x-ink2', 11.5);
    label(p3, R, 122, '跨构型数据配比与视觉语言特征怎样帮到动作，还缺理论解释', 'demo-x-mut', 11);

    var p4 = group(s);
    label(p4, R, 60, '局限四：未在互联网图文与机器人数据上协同微调', 'demo-x-ink', 13.5);
    label(p4, R, 92, '全程在 97 万条机器人轨迹上更新参数，冲淡了部分名人与图标知识', 'demo-x-ink2', 11.5);
    label(p4, R, 122, '作者建议后续混入互联网图文问答一起训，保住开放世界语义', 'demo-x-ink', 11.5);

    var p5 = group(s);
    label(p5, R, 60, '开源定位：把 VLA 从闭源黑盒变成人人可用的基线', 'demo-x-ink', 13.5);
    label(p5, R, 92, '7B 开源模型靠双编码器、分位数词表与 97 万条数据超过 55B 模型', 'demo-x-ink', 11.5);
    label(p5, R, 122, '单卡 LoRA + 4-bit 量化让普通机器人实验室第一次跑起 7B 级通用策略', 'demo-x-ink2', 11.5);

    function draw(t, clock) {
      var now = nowOf(t, clock);
      var activeLim = t < 3.6 ? 0 : t < 7.0 ? 1 : t < 10.4 ? 2 : t < 13.4 ? 3 : -1;
      var pulse = 0.5 + 0.5 * Math.sin(now * 3.5);
      limBoxes.forEach(function (rb, k) {
        rb.style.strokeWidth = k === activeLim ? (2.0 + 1.0 * pulse).toFixed(2) : '1.3';
        rb.style.opacity = activeLim < 0 || k === activeLim ? 1 : 0.55;
      });
      var activeOss = Math.floor(now * 2.2) % 4;
      ossChips.forEach(function (ch, k) {
        ch.style.opacity = t >= 13.4 ? (k === activeOss ? 1 : 0.68) : 0.88;
      });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  var OPENVLA_SCENES = [
    {
      title: '闭源巨无霸与从零小策略',
      dur: 16,
      build: buildScene01,
      cues: [
        { at: 0.4, s: '传统小策略单任务精细但泛化窄；闭源 RT-2-X 有 550 亿参数却不公开权重与代码。' },
        { at: 3.6, s: '论文图 1 右：OpenVLA 用 7B 级开源底座挑战 55B 闭源模型。' },
        { at: 7.0, s: '三道关卡：连续动作怎么进词表、97 万条数据怎么训、单张消费卡怎么微调部署。' },
        { at: 10.4, s: '29 个真机开箱任务（230 次测试）：OpenVLA 74.3% 对比 RT-2-X 57.8%，高 16.5 个百分点。' },
        { at: 13.4, s: '权重、训练代码、27 套统计量、LoRA 与 4-bit 量化脚本全部开源。' }
      ]
    },
    {
      title: '整体结构：一张图、一句话、7 个动作词',
      dur: 16,
      build: buildScene02,
      cues: [
        { at: 0.4, s: '输入单张 $224\\times 224$ 第三视角图像和一句英文指令；不接手腕相机与关节角。' },
        { at: 3.6, s: '底座 Prismatic-7B 实核 7.54B 参数：双视觉编码器 0.73B + 投影器 0.07B + Llama 2 6.74B。' },
        { at: 7.0, s: '256 张视觉卡与文字卡送进 32 层 Llama 2，自回归连吐 7 个动作词。' },
        { at: 10.4, s: '7 个词依次对应末端平移 $(\\Delta x, \\Delta y, \\Delta z)$、旋转 $(\\Delta\\text{roll}, \\Delta\\text{pitch}, \\Delta\\text{yaw})$ 与夹爪。' },
        { at: 13.4, s: '部署时每走一步重看最新画面，单步闭环能纠错，但受串行解码速度限制。' }
      ]
    },
    {
      title: '两双眼睛：DINOv2 与 SigLIP',
      dur: 16,
      build: buildScene03,
      cues: [
        { at: 0.4, s: '图像按 $14\\times 14$ 像素切成 $16\\times 16 = 256$ 个小格，取 ViT 倒数第二层特征。' },
        { at: 3.6, s: 'DINOv2 自监督训练，擅长三维几何、物体边缘与空间距离，每格 1024 维。' },
        { at: 7.0, s: 'SigLIP 图文对比训练，擅长识别颜色、名字与日常语义概念，每格 1152 维。' },
        { at: 10.4, s: '同一格横着拼成 2176 维再投到 4096 维，进 Llama 2 的视觉卡片仍是 256 张。' },
        { at: 13.4, s: '附录表九（80 次 Bridge 测试）：双编码器 45.6%，比单用 SigLIP 的 40.6% 高 5 个百分点。' }
      ]
    },
    {
      title: '连续动作怎么变成词',
      dur: 16,
      build: buildScene04,
      cues: [
        { at: 0.4, s: '借用 Llama 2 基础词表（32,000 词）最生僻的最后 256 个词当动作桶，不用改模型头。' },
        { at: 3.6, s: '手算例子：$\\Delta x = +10$ mm 归一化成 $+0.358$，落第 174 格，编成词号 $32000 - 174 = 31826$。' },
        { at: 7.0, s: '解码取第 174 格中心 $+0.3608$ 拉回物理量，得 $+10.08$ mm，误差 $\\approx 0.08$ mm。' },
        { at: 10.4, s: '代码核对：`linspace(-1, 1, 256)` 实为 256 个端点、255 个区间，末两档解码合并。' },
        { at: 13.4, s: '一步 7 维连续控制量就这样编成 7 个词号（31744 到 31999 之间）。' }
      ]
    },
    {
      title: '为什么用第 1%–99% 分位数',
      dur: 16,
      build: buildScene05,
      cues: [
        { at: 0.4, s: '开源遥操作数据含手抖与碰撞离群值，会把最大最小值跨度撑大十几到几十倍。' },
        { at: 3.6, s: '在 `bridge_orig` 的 $\\Delta x$ 上，按极值缩放会让 98% 的正常动作挤进中间 18 个格，每格 3.21 mm。' },
        { at: 7.0, s: '$\\Delta\\text{roll}$ 的极值跨度是分位数的 38.8 倍，98% 的旋转挤在 7 个格里。' },
        { at: 10.4, s: '改按第 1% 与第 99% 分位数 $q_{01}, q_{99}$ 对齐 $[-1, 1]$，每格细到 0.224 mm，误差缩小 16 倍。' },
        { at: 13.4, s: '代码里前 6 维做分位数拉伸，第 7 维夹爪 `mask = False` 保留在 $[0, 1]$。' }
      ]
    },
    {
      title: '语言模型怎么学动作',
      dur: 16,
      build: buildScene06,
      cues: [
        { at: 0.4, s: '训练目标与聊天大模型一致：标准下一个词交叉熵，不加扩散头也不跑强化学习。' },
        { at: 3.6, s: '图像卡和文字提示卡的标签全设为 $-100$ 跳过，只对 7 个动作词加 `<EOS>` 共 8 个位置算损失。' },
        { at: 7.0, s: '训练时靠因果下三角掩码，一次前向并行算出全部 8 个位置的交叉熵。' },
        { at: 10.4, s: '推理时前缀缓存 KV，温度设 0，串行贪心吐出 7 个概率最高的动作词。' },
        { at: 13.4, s: '串行吐 7 次限制了控制频率：RTX 4090 上每秒约 6.2 步。' }
      ]
    },
    {
      title: '97 万条真机示范怎么配',
      dur: 16,
      build: buildScene07,
      cues: [
        { at: 0.4, s: '从 Open X-Embodiment 超百万轨迹中筛出 97 万条真实机器人操作轨迹。' },
        { at: 3.6, s: '接口对齐：只留带第三视角 RGB 相机、单臂 7 维末端执行器控制的数据集。' },
        { at: 7.0, s: '沿用 Octo 的启发式配比：压低单一重复大集合，调高任务与场景丰富的集合。' },
        { at: 10.4, s: '补入新发布的 DROID 桌面数据集，保守分配 10% 混合采样权重。' },
        { at: 13.4, s: '训练最后三分之一阶段移掉 Kuka 与 DROID，集中精修精细多任务子集（附录 A）。' }
      ]
    },
    {
      title: '五个关键训练发现',
      dur: 16,
      build: buildScene08,
      cues: [
        { at: 0.4, s: '发现一：视觉编码器不能冻住——附录表十里端到端微调视觉从 46.7% 升到 80.0%。' },
        { at: 3.6, s: '发现二：DINOv2 + SigLIP 双编码器始终优于单一视觉骨干。' },
        { at: 7.0, s: '发现三：图像从 $224\\times 224$ 升到 $384\\times 384$ 算力涨约 3 倍，控制成功率却不涨。' },
        { at: 10.4, s: '发现四：不能只训 1–2 轮，跑满 27 轮直到动作词准确率超过 95%。' },
        { at: 13.4, s: '发现五：64 张 A100 连训 14 天（21,500 A100 小时），固定学习率 $2\\times 10^{-5}$。' }
      ]
    },
    {
      title: '开箱即用一：WidowX 水槽 17 个任务',
      dur: 16,
      build: buildScene09,
      cues: [
        { at: 0.4, s: '论文图 3（WidowX 17 任务共 170 次）：OpenVLA 总成功率 70.6%，高于 55B RT-2-X 的 50.6%。' },
        { at: 3.6, s: '视觉泛化 87.0%（对 52.0%）、物理泛化 76.7%（对 26.7%），在杂物堆里抓起紫茄子。' },
        { at: 7.0, s: '语言接地 90.0%：同一桌面摆红辣椒与奶酪，换一句指令就抓向对应目标。' },
        { at: 10.4, s: '运动泛化 60.0%（转腕对齐细电池）；未见语义概念为 36.3%，RT-2-X 为 38.8%。' },
        { at: 13.4, s: '闭环纠错：初次碰倒蓝杯后，退回调整姿态重新抓起放进盘子。' }
      ]
    },
    {
      title: '开箱即用二：Google 机器人 12 个任务',
      dur: 16,
      build: buildScene10,
      cues: [
        { at: 0.4, s: '论文图 4（Google 机器人 12 任务共 60 次）：OpenVLA 总平均 85.0%，高于 RT-2-X 的 78.3%。' },
        { at: 3.6, s: '分布内 88.0%（对 72.0%），分布外 82.9% 与 RT-2-X 持平，高于 RT-1-X（55.0%）与 Octo（26.7%）。' },
        { at: 7.0, s: '两台真机共 230 次合算：OpenVLA 74.3% 对比 RT-2-X 57.8%，高 16.5 个百分点。' },
        { at: 10.4, s: '名人照片题（移可乐罐到 Taylor Swift 旁）：RT-2-X 成功，OpenVLA 走向另一张照片。' },
        { at: 13.4, s: '原因：RT-2-X 边训机器人边保留互联网图文协同微调，OpenVLA 只训了机器人数据。' }
      ]
    },
    {
      title: '消融：跨机器人数据与双编码器',
      dur: 16,
      build: buildScene11,
      cues: [
        { at: 0.4, s: '附录表九在原始 Bridge 8 个任务（80 次）上拆解各部分贡献。' },
        { at: 3.6, s: '只在 Bridge 上训：单 SigLIP 40.6%，换成 DINOv2 + SigLIP 升到 45.6%（+5.0）。' },
        { at: 7.0, s: '换上 97 万条 OXE 跨机器人预训练：从 45.6% 升到 76.3%（+30.7 个百分点）。' },
        { at: 10.4, s: '20 多种其他机器人的操作数据，把 WidowX 的成功率提高了 30.7 个百分点。' },
        { at: 13.4, s: '高于 RT-2-X 的三条原因：97 万对 35 万条数据、过滤 Bridge 静止帧、DINOv2 空间特征。' }
      ]
    },
    {
      title: '迁到新真机：Franka 窄任务与多任务',
      dur: 16,
      build: buildScene12,
      cues: [
        { at: 0.4, s: '迁到 Franka 桌面（5 Hz）与 DROID（15 Hz），每任务 10–150 条示范：总平均 63.8%，比 DP 高 20.4%。' },
        { at: 3.6, s: '单一窄任务「倒玉米入锅」：连续动作块的 Diffusion Policy 为 77.8%，OpenVLA 为 44.4%。' },
        { at: 7.0, s: '多物体语言任务（按指令拿黄玉米、翻锅、擦桌子）：OpenVLA 为 58.3%–83.3%，DP 为 25.0%–45.8%。' },
        { at: 10.4, s: '紫色柱 OpenVLA (scratch) 跳过机器人预训练直接训 VLM，平均降到 35.2%。' },
        { at: 13.4, s: '适用边界：纯单任务精细轨迹适合扩散策略；多物体语言指令任务适合预训练 VLA。' }
      ]
    },
    {
      title: '迁到仿真：LIBERO 四个基准',
      dur: 16,
      build: buildScene13,
      cues: [
        { at: 0.4, s: '附录表十二测标准仿真基准 LIBERO：4 个套件各 10 个任务，每套评估 1,500 次。' },
        { at: 3.6, s: 'Spatial 84.7% 最高；Object 上从零训的 Diffusion Policy 为 92.5%，OpenVLA 为 88.4%。' },
        { at: 7.0, s: 'Goal 上 Octo 为 84.6%（OpenVLA 79.2%）；Long 长程串联任务上 OpenVLA 为 53.7%，Octo 为 51.1%。' },
        { at: 10.4, s: '仿真小数据微调需开启随机裁剪与颜色抖动增强，避免 7B 模型过拟合固定背景。' },
        { at: 13.4, s: '四套件总平均：OpenVLA 76.5%，Octo 75.1%，Diffusion Policy 72.4%。' }
      ]
    },
    {
      title: '一张卡怎么微调：LoRA 低秩适配',
      dur: 16,
      build: buildScene14,
      cues: [
        { at: 0.4, s: '表一（Franka 33 次测试，批大小 16）：全参数微调 69.7%，双卡显存合计 163.3 GB。' },
        { at: 3.6, s: '只训末层为 30.3%，冻视觉为 47.0%，首尾三明治微调为 62.1%。' },
        { at: 7.0, s: 'LoRA 冻结原矩阵 $W_0$，在所有线性层旁挂秩 $r = 32$ 的低秩矩阵 $BA$，可训参数占 1.4%（97.6M）。' },
        { at: 10.4, s: 'LoRA $r = 32$ 达到 68.2%（全参 69.7%），显存降到 59.7 GB，单张 A100 跑 10–15 小时。' },
        { at: 13.4, s: '秩加倍到 $r = 64$（195.2M）仍是 68.2%，论文默认选 $r = 32$。' }
      ]
    },
    {
      title: '小显存怎么推理：4-bit 量化与频率陷阱',
      dur: 16,
      build: buildScene15,
      cues: [
        { at: 0.4, s: '表二显存：bf16 占 16.8 GB，int8 降到 10.2 GB，int4 降到 7.0 GB。' },
        { at: 3.6, s: '非阻塞控制下 int4 为 71.9%（bf16 为 71.3%），int8 降到 58.1%。' },
        { at: 7.0, s: '论文图 6 原因：`bitsandbytes` 的 int8 算子搬运较慢，A5000 上为 1.20 Hz（int4 为 2.92 Hz）。' },
        { at: 10.4, s: '5 Hz 训练数据配 1.2 Hz 非阻塞控制，每步间隔约 0.83 秒，和训练步长不一致。' },
        { at: 13.4, s: '附录表十一改用每步停稳等的阻塞控制，int8 回升到 74.4%；实际部署选用 4-bit 量化。' }
      ]
    },
    {
      title: '论文与官方代码的几处出入',
      dur: 16,
      build: buildScene16,
      cues: [
        { at: 0.4, s: '出入一：开源 `openvla-7b` 精确参数为 7.54B，投影器是 3 层 GELU（论文 2 层对应单眼版）。' },
        { at: 3.6, s: '出入二：`np.linspace(-1, 1, 256)` 实为 255 个区间，词号落在 `31744..31999`。' },
        { at: 7.0, s: '出入三：训练标签包含 7 个动作词加末尾 `<EOS>` 共 8 个词。' },
        { at: 10.4, s: '出入四：表一、表二跑在早期单编码器 `v01`（7.19B）；正文写 15 GB 而表二实测 16.8 GB。' },
        { at: 13.4, s: '出入五：图 5 胡萝卜柱印 `53.5`（$8/15 = 53.3\\%$），附录图 10 两张分布外照片位置对调。' }
      ]
    },
    {
      title: '局限与开源清单',
      dur: 16,
      build: buildScene17,
      cues: [
        { at: 0.4, s: '局限一：只读单张第三视角图，未接手腕相机、本体关节角与多帧历史。' },
        { at: 3.6, s: '局限二：7 个词串行自回归解码在 4090 上约 6 Hz，尚不支持 50 Hz 高频动作块。' },
        { at: 7.0, s: '局限三：单一窄任务精细度不及扩散策略，跨构型混合仍偏经验配方。' },
        { at: 10.4, s: '局限四：未与互联网图文数据协同微调，损失了部分纯视觉名人与图标记忆。' },
        { at: 13.4, s: '总结：OpenVLA 把 7B 多机器人通用策略从闭源黑盒变成了单卡可改的开源标准基线。' }
      ]
    }
  ];

  function nb(str) {
    return str.split(/(\$[^$]*\$)/).map(function (p, i) {
      return i % 2 ? p : p.replace(/(\d)(\*\*)? (?=[^\s\d+\-−→×<>=\/·（(])/g, '$1$2\u00a0').replace(/(\d)–(\d)/g, '$1–⁠$2');
    }).join('');
  }
  OPENVLA_SCENES.forEach(function (sc) { sc.cues.forEach(function (c) { c.s = nb(c.s); }); });

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十七幕动画：OpenVLA 全流程',
      sub: '约 272 秒自动播放。空格播放/暂停，← → 换幕；真机画面剪自项目页 openvla.github.io，统计量与参数账本取自官方代码与权重。',
      ariaLabel: 'OpenVLA 十七幕讲解动画',
      notes: [
        '取数依据：正文与附录图表取自 arXiv 2406.09246 v3 的 LaTeX 源码；图 6 的每秒动作数按 PDF 矢量图网格线像素读出近似值。',
        '代码与权重核对：动作分词与 255 个区间行为对照 openvla/openvla @ c8f03f4 的 action_tokenizer.py；7.54B 参数账本与 bridge_orig 分位数取自 HuggingFace openvla/openvla-7b。',
        '第 2 幕 WidowX 250 机械臂渲染取自 MuJoCo Menagerie 的 trossen_wx250s（BSD-3）；真机片段剪自项目页视频，仅作讲解引用。'
      ],
      scenes: OPENVLA_SCENES
    });
  }

  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：OpenVLA 十七幕全流程',
      sub: '竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十七幕动画，旁白逐幕展开细节；适合手机观看或下载。',
      size: '23.1 MB',
      fileName: 'OpenVLA_讲解视频.mp4'
    });
  }

  // ─── 交互演示 1：动作分词与分位数实验台 ─────────────────────────────────────
  function buildBinsDemo(host) {
    var root = card(host, {
      title: '动作分词与分位数实验台：连续控制量怎么变成 Llama 2 词号',
      sub: '使用官方 openvla-7b 内置的 bridge_orig 真实统计量与 action_tokenizer.py 公式。切换动作维度、拖动物理数值或切换归一化方式，观察 255 个区间的分辨率变化。'
    });
    var state = { dim: 0, val: BRIDGE_STATS[0].ex, minmax: 0 };
    buttonGroup(root, {
      label: '动作维度',
      value: 0,
      items: BRIDGE_STATS.map(function (d, i) { return { label: d.zh, value: i }; }),
      onPick: function (i) {
        state.dim = i;
        state.val = BRIDGE_STATS[i].ex;
        rebuildSlider();
        render();
      }
    });
    buttonGroup(root, {
      label: '归一化区间',
      value: 0,
      items: [
        { label: '第 1%–99% 分位数（OpenVLA）', value: 0 },
        { label: '极值 [min, max]（传统对照）', value: 1 }
      ],
      onPick: function (v) { state.minmax = v; render(); }
    });
    var slWrap = el('div', '');
    root.appendChild(slWrap);
    function rebuildSlider() {
      slWrap.innerHTML = '';
      var d = BRIDGE_STATS[state.dim];
      var lo = d.mask ? d.q01 * 1.25 : 0.0, hi = d.mask ? d.q99 * 1.25 : 1.0;
      var step = d.unit === 'm' ? 0.001 : d.unit === 'rad' ? 0.002 : 0.01;
      var row = controlsRow(slWrap);
      slider(row, {
        label: '输入动作值（' + d.unit + '）',
        min: Number(lo.toFixed(3)),
        max: Number(hi.toFixed(3)),
        step: step,
        value: state.val,
        format: function (v) { return (v >= 0 ? '+' : '−') + fmt(Math.abs(v), 3) + ' ' + d.unit; },
        onInput: function (v) { state.val = v; render(); }
      });
    }
    rebuildSlider();

    var st = stage(root, 260);
    var stats = statsRow(root),
      sNorm = stats.add('归一化值 ã'),
      sTok = stats.add('离散档 / Llama 词号'),
      sRecon = stats.add('反量化还原 â'),
      sErr = stats.add('单步量化误差'),
      sBins = stats.add('98% 动作可用格数');
    var verdict = verdictBox(root);
    note(root, [
      '上图（物理全宽）：灰色底条是该维度在 bridge_orig 中的极值范围 $[\\min, \\max]$，绿色带是中间 98% 数据所在的 $[q_{01}, q_{99}]$。',
      '下图（局部放大）：展示归一化值 $\\tilde{a}$ 附近的相邻区间端点与区间中心（绿点）；官方代码 `np.linspace(-1, 1, 256)` 共有 255 个等宽区间，词表编号为 `32000 - disc`（落在 `31744..31999`）。'
    ]);

    function render() {
      var d = BRIDGE_STATS[state.dim];
      var r = encodeDecodeAction(state.val, d, !!state.minmax);
      var rRef = encodeDecodeAction(state.val, d, !state.minmax);
      var g = begin(st), P = g.P, ctx = g.ctx, W = g.w;

      /* 上半：物理轴 [min, max] vs [q01, q99] */
      var x0 = 24, x1 = W - 24, yTop = 64;
      text(ctx, d.zh + ' 物理分布跨度（' + d.unit + '）', x0, 26, P.text, 'left', 'bold 12px sans-serif');
      ctx.fillStyle = P.border;
      ctx.fillRect(x0, yTop - 6, x1 - x0, 12);
      var spanAll = Math.max(1e-6, d.max - d.min);
      var qx0 = x0 + (d.q01 - d.min) / spanAll * (x1 - x0);
      var qx1 = x0 + (d.q99 - d.min) / spanAll * (x1 - x0);
      ctx.fillStyle = P.good;
      ctx.fillRect(qx0, yTop - 9, Math.max(3, qx1 - qx0), 18);
      var vx = x0 + clamp((state.val - d.min) / spanAll, 0, 1) * (x1 - x0);
      K.dot(ctx, vx, yTop, 5.5, P.warn);
      text(ctx, 'min ' + fmt(d.min, 3), x0, yTop + 24, P.muted, 'left', '11px sans-serif');
      text(ctx, '[q01, q99] = [' + fmt(d.q01, 3) + ', ' + fmt(d.q99, 3) + ']', clamp((qx0 + qx1) / 2, x0 + 82, x1 - 82), yTop - 15, P.good, 'center', '11px sans-serif');
      text(ctx, 'max ' + fmt(d.max, 3), x1, yTop + 24, P.muted, 'right', '11px sans-serif');

      /* 下半：[-1, 1] 局部区间放大 */
      var yBot = 186;
      text(ctx, '当前动作附近的相邻区间放大（共 255 格）', x0, 132, P.text, 'left', 'bold 12px sans-serif');
      var halfWin = 4.5 * (2 / 255);
      var wCenter = clamp(r.center, -1 + halfWin, 1 - halfWin);
      var wLo = wCenter - halfWin, wHi = wCenter + halfWin;
      function sx(u) { return x0 + (u - wLo) / (wHi - wLo) * (x1 - x0); }
      K.line(ctx, [[x0, yBot], [x1, yBot]], P.border, 2);
      var kStart = Math.max(0, r.idx - 4), kEnd = Math.min(254, r.idx + 4);
      for (var k = kStart; k <= kEnd + 1; k++) {
        var ep = -1 + 2 * k / 255;
        if (ep >= wLo && ep <= wHi) {
          K.line(ctx, [[sx(ep), yBot - 12], [sx(ep), yBot + 12]], P.muted, 1.2);
        }
        if (k <= kEnd) {
          var cc = -1 + (2 * k + 1) / 255;
          if (cc >= wLo && cc <= wHi) {
            var active = k === r.idx;
            K.dot(ctx, sx(cc), yBot, active ? 6 : 3, active ? P.good : P.accent);
            if (active || k === r.idx - 2 || k === r.idx + 2) {
              text(ctx, '词 ' + (32000 - (k + 1)), sx(cc), yBot + 28, active ? P.good : P.muted, 'center', '11px sans-serif');
            }
          }
        }
      }
      var ax = sx(clamp(r.aNorm, wLo, wHi));
      K.dot(ctx, ax, yBot - 18, 5, P.warn);
      K.line(ctx, [[ax, yBot - 13], [sx(r.center), yBot - 4]], P.warn, 1.5, [3, 3]);
      text(ctx, '输入 ã = ' + fmt(r.aNorm, 4), clamp(ax, x0 + 60, x1 - 60), yBot - 28, P.warn, 'center', '11px sans-serif');

      var errUnit = d.unit === 'm' ? fmt(r.err * 1000, 2) + ' mm' : fmt(r.err, 4) + ' ' + d.unit;
      var stepUnit = d.unit === 'm' ? fmt(r.binPhys * 1000, 3) + ' mm/格' : fmt(r.binPhys, 4) + ' ' + d.unit + '/格';
      sNorm.set((r.aNorm >= 0 ? '+' : '−') + fmt(Math.abs(r.aNorm), 4));
      sTok.set('第 ' + r.disc + ' 档 → ' + r.tokId);
      sRecon.set((r.recon >= 0 ? '+' : '−') + fmt(Math.abs(r.recon), 4) + ' ' + d.unit);
      sErr.set(errUnit + '（' + stepUnit + '）');
      sBins.set(d.mask ? r.qSpanBins + ' / 255 格' : '不拉伸（mask=False）');

      if (!d.mask) {
        verdict.set('夹爪维在官方配置中 `mask = False`：输入不按分位数拉伸到 $[-1, 1]$，而是直接保留 $[0, 1]$ 量化（0 落第 128 档中心 0.0，1.0 落末档中心 +0.9961）。', 'good');
      } else if (state.minmax) {
        var ratio = (d.max - d.min) / (d.q99 - d.q01);
        verdict.set('极值归一化下，离群值把跨度撑宽了 ' + fmt(ratio, 1) + ' 倍，98% 的正常动作挤在中间 ' + r.qSpanBins + ' 个格子里；换成 OpenVLA 的第 1%–99% 分位数可把当前值的量化误差改为 ' + (d.unit === 'm' ? fmt(rRef.err * 1000, 2) + ' mm' : fmt(rRef.err, 4) + ' rad') + '。', 'warn');
      } else {
        verdict.set('第 1%–99% 分位数归一化把 255 个区间全部留给中间 98% 的常规动作（每格 ' + stepUnit + '），头尾各 1% 的极端尖峰自动截断到 ±1。', 'good');
      }
    }
    registerRenderer(render);
    render();
  }

  // ─── 交互演示 2：微调显存与量化推理计算器 ───────────────────────────────────
  function buildLoraDemo(host) {
    var root = card(host, {
      title: '微调显存与量化推理计算器：单张消费级显卡怎么跑 7B OpenVLA',
      sub: '汇总论文表 1（6 种微调方案，批大小 16）与图 6 / 表 2 / 表 11（6 张显卡 × 3 种精度的推理速度与阻塞/非阻塞成功率）。'
    });
    var state = { tab: 'peft', peftIdx: 4, gpuIdx: 1, block: 0 };
    buttonGroup(root, {
      label: '实验场景',
      value: 'peft',
      items: [
        { label: '表一：6 种微调方案（Franka）', value: 'peft' },
        { label: '图六 + 表二/十一：量化推理与控制模式', value: 'quant' }
      ],
      onPick: function (v) { state.tab = v; syncControls(); render(); }
    });
    var subCtrl = el('div', '');
    root.appendChild(subCtrl);
    function syncControls() {
      subCtrl.innerHTML = '';
      if (state.tab === 'peft') {
        var peftLabels = ['全参数微调', '只训最后一层', '冻结视觉编码器', '三明治微调', 'LoRA (r=32)', 'LoRA (r=64)'];
        buttonGroup(subCtrl, {
          label: '微调方案',
          value: state.peftIdx,
          items: TABLE1_PEFT.map(function (_it, i) { return { label: peftLabels[i], value: i }; }),
          onPick: function (i) { state.peftIdx = i; render(); }
        });
      } else {
        buttonGroup(subCtrl, {
          label: '显卡型号（图 6）',
          value: state.gpuIdx,
          items: GPU_QUANT.map(function (g, i) { return { label: g.gpu, value: i }; }),
          onPick: function (i) { state.gpuIdx = i; render(); }
        });
        buttonGroup(subCtrl, {
          label: '控制回路模式（WidowX 80 次）',
          value: state.block,
          items: [
            { label: '非阻塞异步（表二默认）', value: 0 },
            { label: '阻塞同步（附录表十一）', value: 1 }
          ],
          onPick: function (v) { state.block = v; render(); }
        });
      }
    }
    syncControls();

    var st = stage(root, 240);
    var stats = statsRow(root),
      sA = stats.add('核心指标 1'),
      sB = stats.add('核心指标 2'),
      sC = stats.add('核心指标 3'),
      sD = stats.add('核心指标 4');
    var tb = table(root);
    var verdict = verdictBox(root);

    function render() {
      var g = begin(st), P = g.P, ctx = g.ctx;
      tb.clear();
      if (state.tab === 'peft') {
        var cur = TABLE1_PEFT[state.peftIdx];
        var p = K.plot(g, { l: 48, r: 20, t: 22, b: 34 }, [0, 6], [0, 100]);
        K.axes(g, p, { yTicks: [0, 25, 50, 75, 100], yLabel: '成功率 %' });
        TABLE1_PEFT.forEach(function (it, i) {
          var bw = p.sx(0.56) - p.sx(0);
          ctx.globalAlpha = i === state.peftIdx ? 1 : 0.45;
          ctx.fillStyle = it.key === 'lora32' ? P.good : i === state.peftIdx ? P.accent : P.muted;
          ctx.fillRect(p.sx(i + 0.22), p.sy(it.succ), bw, p.sy(0) - p.sy(it.succ));
          ctx.globalAlpha = 1;
          text(ctx, it.succ + '%', p.sx(i + 0.5), p.sy(it.succ) - 6, P.text, 'center', '11px sans-serif');
          text(ctx, ['全参', '末层', '冻视觉', '三明治', 'LoRA32', 'LoRA64'][i], p.sx(i + 0.5), p.y0 + 15, P.muted, 'center', '11px sans-serif');
        });
        tb.row(['微调方案', 'Franka 成功率（33 次）', '可训练参数（M）', '参数占比', '显存（GB，批 16）'], true);
        TABLE1_PEFT.forEach(function (it) {
          tb.row([it.name, it.succ + ' ± ' + it.se + '%', fmt(it.params, 1) + 'M', fmt(it.params / 7188.1 * 100, 1) + '%', it.vram + (it.multi ? ' GB*' : ' GB')]);
        });
        sA.set(cur.succ + ' ± ' + cur.se + '%');
        sB.set(fmt(cur.params, 1) + 'M（' + fmt(cur.params / 7188.1 * 100, 1) + '%）');
        sC.set(cur.vram + (cur.multi ? ' GB（双卡总和）' : ' GB（单卡）'));
        sD.set(cur.key.indexOf('lora') === 0 ? '单张 A100 10–15 小时' : cur.multi ? '需多卡 FSDP' : '单卡可跑但掉点');
        verdict.set(cur.key === 'lora32'
          ? 'LoRA (r = 32) 在视觉和语言全部线性层挂低秩旁路，只训 1.4% 参数就拿到 68.2%（与全参数 69.7% 在标准误内持平），显存从 163.3 GB 降到 59.7 GB。'
          : '当前选中「' + cur.name + '」：对比 LoRA (r = 32) 的 68.2% 与 59.7 GB，可见冻结视觉（47.0%）或只训局部层都会损失跨构型空间适配能力。',
          cur.succ >= 68 ? 'good' : 'warn');
      } else {
        var gpu = GPU_QUANT[state.gpuIdx];
        var p2 = K.plot(g, { l: 48, r: 20, t: 22, b: 34 }, [0, 3], [0, 7.5]);
        K.axes(g, p2, { yTicks: [0, 2.5, 5.0, 7.5], yLabel: '动作/秒 (Hz)' });
        K.line(ctx, [[p2.x0, p2.sy(5.0)], [p2.x1, p2.sy(5.0)]], P.muted, 1.2, [4, 3]);
        text(ctx, 'WidowX 示范采集频率 5.0 Hz', p2.x1 - 4, p2.sy(5.0) - 6, P.muted, 'right', '11px sans-serif');
        ['bfloat16', 'int8', 'int4'].forEach(function (nm, mi) {
          var v = gpu.hz[mi], bw = p2.sx(0.48) - p2.sx(0);
          ctx.fillStyle = [P.accent, P.warn, P.good][mi];
          if (v != null) {
            ctx.fillRect(p2.sx(mi + 0.26), p2.sy(v), bw, p2.sy(0) - p2.sy(v));
            text(ctx, fmt(v, 2) + ' Hz', p2.sx(mi + 0.5), p2.sy(v) - 6, P.text, 'center', '11px sans-serif');
          } else {
            text(ctx, '不支持', p2.sx(mi + 0.5), p2.sy(1.0), P.muted, 'center', '11px sans-serif');
          }
          text(ctx, nm + '（' + TABLE2_QUANT[mi].vram + ' GB）', p2.sx(mi + 0.5), p2.y0 + 15, P.muted, 'center', '11px sans-serif');
        });
        tb.row(['精度', '推理显存', gpu.gpu + ' 速度', 'A5000 非阻塞成功率（表二）', 'A5000 阻塞成功率（表十一）'], true);
        TABLE2_QUANT.forEach(function (q, mi) {
          var hz = gpu.hz[mi];
          tb.row([q.prec, q.vram + ' GB', hz == null ? '—' : fmt(hz, 2) + ' Hz（' + fmt(1 / hz, 2) + ' s/步）', q.nonblock + '%', q.block + '%']);
        });
        sA.set(gpu.gpu);
        sB.set('bf16: ' + fmt(gpu.hz[0], 2) + ' Hz');
        sC.set('int4: ' + fmt(gpu.hz[2], 2) + ' Hz（7.0 GB）');
        sD.set(state.block ? '阻塞控制 int8: 74.4%' : '非阻塞 int8: 58.1%');
        verdict.set(state.block
          ? '阻塞控制（表十一）：机器人每走完一步停住等显卡算完下一步，因此哪怕 int8 慢到 1.20 Hz（0.83 秒一步），成功率仍有 74.4%——证实量化本身不掉精度。'
          : '非阻塞控制（表二）：int4（7.0 GB，A5000 上 2.92 Hz）拿到 71.9% 追平 bf16；而 int8 因算子搬运拖慢到 1.20 Hz，反馈严重滞后导致掉到 58.1%。',
          state.block ? 'good' : 'warn');
      }
    }
    registerRenderer(render);
    render();
  }

  // ─── 交互演示 3：四套基准与消融数据台 ───────────────────────────────────────
  function buildResultsDemo(host) {
    var root = card(host, {
      title: '四套基准与消融数据台：WidowX · Google · Franka · LIBERO',
      sub: '数据全部核对自 arXiv 2406.09246 v3 的正文图 3–5 与附录表 7、9、10、12。切换标签查看各平台具体任务与基线对比。'
    });
    var state = { view: 'bridge' };
    buttonGroup(root, {
      value: 'bridge',
      items: [
        { label: '图 3：WidowX 17 任务', value: 'bridge' },
        { label: '图 4：Google 12 任务', value: 'google' },
        { label: '图 5 + 表 7：Franka 微调', value: 'franka' },
        { label: '表 12：LIBERO 仿真', value: 'libero' },
        { label: '表 9 + 表 10：关键消融', value: 'ablate' }
      ],
      onPick: function (v) { state.view = v; render(); }
    });
    var st = stage(root, 240);
    var tb = table(root);
    var verdict = verdictBox(root);

    function render() {
      var g = begin(st), P = g.P, ctx = g.ctx, v = state.view;
      tb.clear();
      if (v === 'bridge' || v === 'google') {
        var cats = v === 'bridge' ? FIG3_BRIDGE.cats : FIG4_GOOGLE.cats;
        var mCols = [P.muted, P.accent, P.purple, P.good];
        tb.row(['评估维度'].concat(FIG3_BRIDGE.methods), true);
        cats.forEach(function (c) {
          tb.row([c.name].concat(c.v.map(function (x, i) { return c.se ? x + ' ± ' + c.se[i] + '%' : x + '%'; })));
        });
        var p = K.plot(g, { l: 44, r: 16, t: 18, b: 32 }, [0, cats.length], [0, 100]);
        K.axes(g, p, { yTicks: [0, 25, 50, 75, 100] });
        cats.forEach(function (c, gi) {
          var bw = p.sx(0.18) - p.sx(0);
          c.v.forEach(function (val, mi) {
            ctx.fillStyle = mCols[mi];
            ctx.fillRect(p.sx(gi + 0.10 + mi * 0.20), p.sy(val), bw, p.sy(0) - p.sy(val));
          });
          text(ctx, c.name.replace(/（.*）/, ''), p.sx(gi + 0.5), p.y0 + 15, P.muted, 'center', '11px sans-serif');
        });
        verdict.set(v === 'bridge'
          ? '灰 RT-1-X、蓝 Octo、紫 RT-2-X（55B）、绿 OpenVLA（7B）。WidowX 170 次总平均 OpenVLA 70.6% 比 RT-2-X 高 20.0 个百分点，仅语义泛化略低 2.5 个百分点。'
          : 'Google 机器人 60 次评估：OpenVLA 总平均 85.0% 对比 RT-2-X 78.3%。两台真机共 230 次加总：OpenVLA 74.3% vs RT-2-X 57.8%（+16.5%）。', 'good');
      } else if (v === 'franka') {
        var mCols5 = [P.warn, P.muted, P.accent, P.purple, P.good];
        tb.row(['任务（次数）'].concat(FIG5_FRANKA.short), true);
        FIG5_FRANKA.tasks.forEach(function (t) {
          tb.row([t.name + '（' + t.n + '）'].concat(t.v.map(function (x) { return x + '%'; })));
        });
        var p2 = K.plot(g, { l: 44, r: 16, t: 18, b: 32 }, [0, 4], [0, 100]);
        K.axes(g, p2, { yTicks: [0, 25, 50, 75, 100] });
        var pick4 = [FIG5_FRANKA.tasks[0], FIG5_FRANKA.tasks[2], FIG5_FRANKA.tasks[5], FIG5_FRANKA.tasks[7]];
        pick4.forEach(function (t, gi) {
          var bw = p2.sx(0.15) - p2.sx(0);
          t.v.forEach(function (val, mi) {
            ctx.fillStyle = mCols5[mi];
            ctx.fillRect(p2.sx(gi + 0.10 + mi * 0.16), p2.sy(val), bw, p2.sy(0) - p2.sy(val));
          });
          text(ctx, ['总平均', '倒玉米(窄)', '桌面多任务', 'DROID擦桌'][gi], p2.sx(gi + 0.5), p2.y0 + 15, P.muted, 'center', '11px sans-serif');
        });
        verdict.set('黄 Diffusion Policy、灰 DP(对齐)、蓝 Octo、紫 从底座直训、绿 OpenVLA。单一窄任务「倒玉米」DP 77.8% 占优；多物体语言任务与总平均（63.8% vs 43.4%）OpenVLA 领先。注：放胡萝卜 DP 对齐表 7 为 8/15 = 53.3%，图 5 柱顶误印为 53.5。', 'good');
      } else if (v === 'libero') {
        var mCols3 = [P.warn, P.accent, P.good];
        tb.row(['LIBERO 套件（1500 次/套）'].concat(TABLE12_LIBERO.methods), true);
        TABLE12_LIBERO.suites.forEach(function (s) {
          tb.row([s.name].concat(s.v.map(function (x) { return x + '%'; })));
        });
        var p3 = K.plot(g, { l: 44, r: 16, t: 18, b: 32 }, [0, 5], [0, 100]);
        K.axes(g, p3, { yTicks: [0, 25, 50, 75, 100] });
        TABLE12_LIBERO.suites.forEach(function (s, gi) {
          var bw = p3.sx(0.24) - p3.sx(0);
          s.v.forEach(function (val, mi) {
            ctx.fillStyle = mCols3[mi];
            ctx.fillRect(p3.sx(gi + 0.12 + mi * 0.26), p3.sy(val), bw, p3.sy(0) - p3.sy(val));
          });
          text(ctx, s.name.split('（')[0], p3.sx(gi + 0.5), p3.y0 + 15, P.muted, 'center', '11px sans-serif');
        });
        verdict.set('黄 Diffusion Policy、蓝 Octo、绿 OpenVLA (LoRA r=32)。四套件总平均 OpenVLA 76.5 ± 0.6% 排名第一；Long 长程串联任务三者均在 50%–54%，揭示长程规划仍是后续工作重点。', 'good');
      } else {
        tb.row(['消融实验（出处）', '模型设置', '真机成功率'], true);
        TABLE9_ABL.forEach(function (r) { tb.row(['表 9：Bridge 8 任务（80 次）', r.name, r.v + ' ± ' + r.se + '%']); });
        TABLE10_VIS.forEach(function (r) { tb.row(['表 10：视觉微调（6 组任务）', r.name, r.v + '%']); });
        var all5 = [
          ['单SigLIP(Bridge)', 40.6, P.muted], ['双编码器(Bridge)', 45.6, P.accent], ['完整版(OXE 970k)', 76.3, P.good],
          ['冻结视觉', 46.7, P.bad], ['微调视觉', 80.0, P.good]
        ];
        var p4 = K.plot(g, { l: 44, r: 16, t: 18, b: 32 }, [0, 5], [0, 100]);
        K.axes(g, p4, { yTicks: [0, 25, 50, 75, 100] });
        all5.forEach(function (it, i) {
          var bw = p4.sx(0.54) - p4.sx(0);
          ctx.fillStyle = it[2];
          ctx.fillRect(p4.sx(i + 0.23), p4.sy(it[1]), bw, p4.sy(0) - p4.sy(it[1]));
          text(ctx, it[1] + '%', p4.sx(i + 0.5), p4.sy(it[1]) - 6, P.text, 'center', '11px sans-serif');
          text(ctx, it[0], p4.sx(i + 0.5), p4.y0 + 15, P.muted, 'center', '11px sans-serif');
        });
        verdict.set('两项决定成败的设计：端到端微调视觉编码器（+33.3 个百分点）与引入 OXE 跨机器人混合预训练（+30.7 个百分点）。', 'good');
      }
    }
    registerRenderer(render);
    render();
  }

  K.mount({
    'openvla-explainer': buildExplainerDemo,
    'openvla-video': buildVideoDemo,
    'openvla-bins': buildBinsDemo,
    'openvla-lora': buildLoraDemo,
    'openvla-results': buildResultsDemo
  });
})();
