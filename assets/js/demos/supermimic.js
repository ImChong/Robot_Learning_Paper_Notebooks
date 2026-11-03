/* Interactive SuperMimic demos for
 * papers/04_Loco-Manipulation_and_WBC/SuperMimic__Scaling_Humanoid_Whole-Body_Control_with_One_Differentiable_World_Model
 * （Liao, Shao, Long, Zakka, Horowitz, Abbeel, Sreenath · SuperMimic: Scaling Humanoid Whole-Body Control with One
 *   Differentiable World Model · arXiv 2610.28480 v1 · CoRL 2026 Oral；项目页 supermimic.github.io；官方代码没有放出，
 *   复现用的是社区的 Motphys/Uni-SuperMimic（Apache-2.0，ac19b73）放出的 LAFAN1 模型）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["supermimic"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   sm-explainer — 十八幕讲解动画：跟踪的动作越多，算力越贵 → 两条老路（表 1）→ 所有动作共用一个身体 → 一个循环，两个学习器（图 2）→
 *                  策略看什么、做什么（表 A.1）→ 世界模型：学一步的增量 → 世界模型像不像仿真器（我们的复现）→ 在想象里反向传播（式 2）→
 *                  评论家：看到第 32 步之后（图 4b、c）→ 奖励、终止与随机化（表 A.2、A.3）→ 动作库与重置采样（附录 D、E）→
 *                  一张卡 3 小时（图 3a）→ 179、25、0（表 A.6）→ 同样的设置和 PPO 比（图 4a）→ 为什么省：三个性质（图 3b、c，图 5）→
 *                  上真机（图 6）→ 下游：速度命令（图 7）→ 局限与复现
 *   sm-video     — 同一套十八幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   sm-wm        — 世界模型 vs 仿真器：我们用 Uni-SuperMimic 放出的模型在 MuJoCo 里跑的三组对照（策略开着 / 策略关掉 / 地面变滑）
 *   sm-grad      — 两种梯度估计：一维玩具里的 BPTT（沿模型求导）与似然比（PPO 的做法），加我们在复现模型上量的余弦相似度
 *   sm-compute   — 论文的数字：算力账本、图 3a / 4a / 5 的曲线、表 A.6 的失败动作
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
  /* 论文图（arXiv 2610.28480 的图 1、图 6 裁剪）、项目页视频的片段（clips/）、G1 的复现贴图（g1_3d/）放在 assets/img/papers/supermimic/ */
  var IMG_BASE = assetBase('../../img/papers/');
  var PAPER_IMG_BASE = IMG_BASE ? IMG_BASE + 'supermimic/' : '';
  var CLIP_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'clips/' : '';
  var G1_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'g1_3d/' : '';
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
    line = K.line,
    text = K.text,
    registerRenderer = K.registerRenderer;


  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    paint = K.paint,
    seg = K.seg,
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
  /* 视频里一幕要讲一分钟左右，画面不能停：draw(t, clock) 的 clock 是这一幕的真实时间
     （旁白比分镜长时 t 停在一段的末尾，clock 照走），循环的动作按 clock 播；网页播放器只传 t。
     各幕的 cue 时刻多数落在 0.4 / 3.6 / 7.0 / 10.4 / 13.4（个别幕另加 17.0），一次性的出场动画不跨过这些时刻。 */
  function nowOf(t, clock) {
    return clock == null ? t : clock;
  }
  /* 一段窗口：a 之后 0.3 s 起淡入 0.4 s，到 b 才开始淡出 0.3 s（AGENTS.md「面板到 cue 之后才淡出」） */
  function win(t, a, b) {
    return seg(t, a + 0.3, a + 0.7) * (b == null ? 1 : 1 - seg(t, b, b + 0.3));
  }
  /* 一幕里从 cue 起算的秒数：网页上就是 t − cue；视频里按时间线算 cue 那一刻起过了多久（K.clipSince）。
     不能用 clock − cue：clock 从这一幕开头算，前面几段旁白比分镜长时，到 cue 那一刻 clock 早已大于 cue（HOMIE 2026-10-22） */
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
    g.appendChild(svgRich(x + (o.left ? 10 : w / 2), y + h / 2 + 4, str, { size: o.size || 11.5, anchor: o.left ? 'start' : 'middle', w: w - 12, cls: o.cls || 'demo-x-ink2' }));
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
  /* 见到 $…$ 就改用 svgRich（公式交给 KaTeX），否则是原生 svgText；有公式的标注是静态的，不再改字 */
  function label(parent, x, y, str, cls, size, anchor) {
    var n = String(str).indexOf('$') >= 0
      ? svgRich(x, y, str, { size: size || 11, cls: cls || 'demo-x-ink2', anchor: anchor || 'start', w: 420 })
      : svgText(x, y, str, cls || 'demo-x-ink2', size || 11, anchor);
    parent.appendChild(n);
    return n;
  }
  function tone(parent, x, y, str, color, size, anchor) {
    var n = String(str).indexOf('$') >= 0
      ? svgRich(x, y, str, { size: size || 11, anchor: anchor || 'start', w: 420 }).setTone(color)
      : paint(svgText(x, y, str, null, size || 11, anchor), color);
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
      g: g,
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
  function barRowAt(parent, x, y, labelW, str, color, h, size) {
    var g = group(parent);
    label(g, x + labelW - 8, y + (h || 14) / 2 + 4, str, 'demo-x-ink2', size || 10.5, 'end');
    var b = hbar(g, x + labelW, y, h || 14, color);
    var v = label(g, x + labelW + 6, y + (h || 14) / 2 + 4, '', 'demo-x-ink', size || 10.5);
    return {
      g: g, bar: b,
      set: function (w, txt) { setW(b, w); v.setAttribute('x', (x + labelW + Math.max(0, w) + 6).toFixed(1)); v.textContent = txt; }
    };
  }
  /* 图例：items 每项 [文字, 颜色, 文字宽, 样式]。样式省略 = 色块（柱、条、面积）；'line' = 实线；'6 4' 这类 = 同样的虚线；
     'x' = 叉号；'ring' = 圆环；'dot' = 圆点。曲线的图例画成和曲线一样的线段，读者才对得上 */
  function legendRow(parent, x, y, items, size) {
    var g = group(parent), cx = x;
    items.forEach(function (it) {
      var st = it[3], sw = 12, my = y - 3.5;
      if (st == null) g.appendChild(paint(svgEl('rect', { x: cx, y: y - 8, width: 12, height: 10, rx: 2 }), it[1]));
      else if (st === 'x') cross(g, cx + 1, my - 5, 10, it[1]);
      else if (st === 'ring') ringAt(g, cx + 6, my, 4.5, it[1], 2);
      else if (st === 'dot') dotAt(g, cx + 6, my, 4.5, it[1]);
      else if (st === 'box') { var bx = rectBox(g, cx, y - 9, 14, 11, it[1], 'none'); bx.style.fill = 'none'; }
      else { sw = 26; var l = hline(g, cx, my, cx + sw, my, it[1], 2.6, st === 'line' ? null : st); l.setAttribute('stroke-linecap', 'butt'); }
      label(g, cx + sw + 5, y, it[0], 'demo-x-ink2', size || 10.5);
      cx += sw + 5 + (it[2] || it[0].length * (size || 10.5) * 0.95) + 16;
    });
    return g;
  }
  /* 折线图：在 (x, y, w, h) 的框里画 xs→ys，返回 { put(arr, color) } */
  function plotBox(parent, x, y, w, h, x0, x1, y0, y1) {
    var g = group(parent);
    rectBox(g, x, y, w, h, C_BORDER, C_SURFACE);
    function px(v) { return x + (v - x0) / (x1 - x0) * w; }
    function py(v) { return y + h - (v - y0) / (y1 - y0) * h; }
    return { g: g, px: px, py: py, line: function (arr, dt, color, width, dash, upto) {
      var pts = [];
      for (var i = 0; i < arr.length; i++) { var tt = i * dt; if (upto != null && tt > upto) break; pts.push([px(tt), py(arr[i])]); }
      return pathLine(g, pts, color, width || 1.8, dash);
    } };
  }
  /* 片段按顺序放几段：parts = [[秒, 名称]]，seqAt(片段内秒) 标出放到第几段 */
  function seqClip(parent, id, x, y, w, h, caption, parts) {
    var g = group(parent), total = 0, last = -1;
    parts.forEach(function (p) { total += p[0]; });
    var c = projClip(g, id, x, y, w, h, caption, { capDy: 48 });
    var acc = 0, starts = [], bars = parts.map(function (p) {
      starts.push(acc);
      var r = paint(svgEl('rect', { x: (x + acc / total * w).toFixed(1), y: (y + h + 7).toFixed(1), width: (p[0] / total * w - 4).toFixed(1), height: 5, rx: 2.5 }), C_ACCENT);
      acc += p[0];
      g.appendChild(r);
      return r;
    });
    var name = label(g, x, y + h + 27, '', 'demo-x-ink', 12.5);
    return {
      g: g, starts: starts, parts: parts,
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

  /* ── 动效小部件：少写字，多让东西动起来 ── */
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
  /* 两种说法的翻牌：每行一个名字和一张卡片，卡片在 who[0]（橙）和 who[1]（绿）之间来回翻；set(秒) 按 1.6 s 一翻 */
  function flipList(parent, x, y0, items, nameW, boxW, who) {
    var names = who || ['论文', '项目页'];
    var rows = items.map(function (f, i) {
      var y = y0 + i * 40;
      label(parent, x, y + 20, f[0], 'demo-x-ink2', 12);
      var box = rectBox(parent, x + nameW, y, boxW, 30, C_BORDER, C_SURFACE);
      var v = label(parent, x + nameW + boxW / 2, y + 20, '', 'demo-x-ink', 12.5, 'middle');
      var who = label(parent, x + nameW + boxW + 10, y + 20, '', 'demo-x-mut', 11.5);
      return { box: box, v: v, who: who, f: f };
    });
    return {
      set: function (sec) {
        var side = Math.floor(Math.max(0, sec) / 1.6) % 2, ph = (Math.max(0, sec) % 1.6) / 1.6;
        /* 翻牌：每次换面时卡片横向压扁再展开 */
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
  /* 确定性随机：第 i 个、种子 s 的 [0, 1) 随机数（mulberry32） */
  function rnd(i, s) {
    var a = (i * 2654435761 + (s || 1) * 40503) >>> 0;
    a = (a + 0x6d2b79f5) >>> 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /* 随机化的一个参数：数轴上一段区间，小点每 period 秒跳到区间里一个新的随机值（域随机化） */
  function rangeRow(parent, x, y, w, name, lo, hi, axLo, axHi, fmtV, color) {
    var g = group(parent), px = function (v) { return x + 92 + (v - axLo) / (axHi - axLo) * (w - 176); };
    label(g, x, y + 4, name, 'demo-x-ink2', 11);
    hline(g, px(axLo), y, px(axHi), y, C_BORDER, 1.4);
    var band = paint(svgEl('rect', { x: px(lo).toFixed(1), y: y - 4, width: (px(hi) - px(lo)).toFixed(1), height: 8, rx: 4 }), color || C_ACCENT);
    band.style.opacity = 0.35; g.appendChild(band);
    var d = dotAt(g, px(lo), y, 5, color || C_ACCENT), v = label(g, x + w, y + 4, '', 'demo-x-ink', 11, 'end');
    return {
      g: g,
      at: function (sec, seed, period) {
        var k = Math.floor(Math.max(0, sec) / (period || 0.8)), val = lo + (hi - lo) * rnd(k, seed);
        moveDot(d, [px(val), y]);
        v.textContent = fmtV(val);
      }
    };
  }

  /* 一行字的宽度估计（中文按 1 个字号、其余按 0.55 个字号），排版用 */
  function textW(str, size) {
    var w = 0;
    for (var i = 0; i < str.length; i++) w += str.charCodeAt(i) > 255 ? size : size * 0.55;
    return w;
  }
  /* 一组小方格（GPU、维数），n 个，每行 cols 个；fill(m) 点亮前 m 个 */
  function cellGrid(parent, x, y, n, cols, size, gap, color) {
    var g = group(parent), cells = [];
    for (var i = 0; i < n; i++) {
      var r = paint(svgEl('rect', { x: x + (i % cols) * (size + gap), y: y + Math.floor(i / cols) * (size + gap), width: size, height: size, rx: 2 }), color);
      g.appendChild(r);
      cells.push(r);
    }
    return { g: g, fill: function (m) { cells.forEach(function (c, i) { c.style.opacity = i < m ? 1 : 0.15; }); } };
  }

  function partClip(parent, id, x, y, w, h, parts, caption) {
    var g = group(parent), total = 0, starts = [];
    parts.forEach(function (p) { starts.push(total); total += p[0]; });
    var c = projClip(g, id, x, y, w, h, caption, { capDy: 48 });
    var bars = parts.map(function (p, i) {
      var r = paint(svgEl('rect', { x: (x + starts[i] / total * w).toFixed(1), y: (y + h + 7).toFixed(1), width: Math.max(2, p[0] / total * w - 4).toFixed(1), height: 5, rx: 2.5 }), C_ACCENT);
      g.appendChild(r);
      return r;
    });
    var name = label(g, x, y + h + 27, '', 'demo-x-ink', 12.5);
    var last = -1;
    return {
      g: g, total: total, starts: starts,
      at: function (k, sec, vis) {
        k = clamp(k, 0, parts.length - 1);
        var L = parts[k][0], u = ((Math.max(0, sec) % L) + L) % L;
        c.at(starts[k] + Math.min(u, L - 0.05), vis);
        if (k === last) return;
        last = k;
        bars.forEach(function (r, i) { r.style.opacity = i === k ? 1 : 0.25; });
        name.textContent = (k + 1) + ' / ' + parts.length + '　' + parts[k][1];
      }
    };
  }

  function spring(parent, color, n, amp) {
    var p = paint(svgEl('path', { d: 'M 0 0', fill: 'none', 'stroke-width': 2, 'stroke-linejoin': 'round' }), null, color);
    parent.appendChild(p);
    return {
      node: p,
      set: function (x1, y1, x2, y2) {
        var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, m = (n || 6) * 2, a = amp || 6;
        var pts = [[x1, y1], [x1 + ux * 6, y1 + uy * 6]];
        for (var i = 1; i < m; i++) {
          var s = 6 + (L - 12) * i / m, side = i % 2 ? 1 : -1;
          pts.push([x1 + ux * s - uy * a * side, y1 + uy * s + ux * a * side]);
        }
        pts.push([x2 - ux * 6, y2 - uy * 6], [x2, y2]);
        p.setAttribute('d', fmtPath(pts));
      }
    };
  }
  /* 一根「1/k 旋钮」：从硬（0）到软（max）的横条和滑块；set(v) */

  function colBar(parent, x, w, yBase, color) {
    var b = vbar(parent, x, w, color), v = label(parent, x + w / 2, yBase, '', 'demo-x-ink', 11, 'middle');
    return {
      b: b, v: v,
      set: function (h, txt) { b.set(yBase, h); v.setAttribute('y', (yBase - Math.max(0, h) - 5).toFixed(1)); v.textContent = txt; }
    };
  }
  /* 力的箭头：从 p 指向 p + dir × len，旁边写 txt */
  function forceArrow(parent, color) {
    var a = arrow(parent, color || C_F, 2.6), t = tone(parent, 0, 0, '', color || C_F, 12, 'middle');
    return {
      g: a.g, t: t,
      set: function (p, dir, len, txt, off) {
        var L = Math.max(0.001, len);
        a.set(p[0], p[1], p[0] + dir[0] * L, p[1] + dir[1] * L, Math.min(10, 4 + L / 4));
        setOpacity(a.g, len > 1.5 ? 1 : 0);
        var o = off || [0, -10];
        t.setAttribute('x', (p[0] + dir[0] * L + o[0]).toFixed(1));
        t.setAttribute('y', (p[1] + dir[1] * L + o[1]).toFixed(1));
        t.textContent = len > 1.5 ? (txt || '') : '';
      }
    };
  }

  /* G1 贴图表：Robot_Retarget_Online 的 g1_mocap_29dof 模型 + 它的 three.js 材质与灯光离线渲染；cw × ch 一格、cols 列、n 帧（50 Hz 的复现每 2 步取一帧，25 帧/秒）；正交相机 yaw / pitch、k 像素/米，世界点 T[f]（z = 0）落在格子里的 (cx, cy)；T 是跟拍的相机目标（仿真那台的根部、前后各 40 / 15 步的滑动平均），三张同一组实验的贴图共用一条相机轨迹 */
  var SHEETS = {"fall_sim":{"file":"fall_sim.webp","cw":280,"ch":290,"cols":15,"n":201,"k":160.0,"cx":140.0,"cy":268.0,"yaw":-0.59,"pitch":0.12,"fps":25.0,"T":[[0.058,0.1],[0.058,0.098],[0.057,0.096],[0.056,0.092],[0.055,0.089],[0.053,0.085],[0.051,0.08],[0.05,0.075],[0.048,0.069],[0.046,0.062],[0.045,0.055],[0.043,0.046],[0.042,0.036],[0.04,0.025],[0.038,0.014],[0.036,0.002],[0.034,-0.011],[0.031,-0.024],[0.029,-0.038],[0.027,-0.053],[0.025,-0.069],[0.024,-0.088],[0.021,-0.108],[0.018,-0.131],[0.015,-0.154],[0.011,-0.18],[0.006,-0.206],[0.002,-0.233],[-0.004,-0.261],[-0.009,-0.29],[-0.015,-0.32],[-0.022,-0.35],[-0.029,-0.381],[-0.036,-0.413],[-0.043,-0.445],[-0.05,-0.477],[-0.057,-0.509],[-0.065,-0.541],[-0.072,-0.573],[-0.079,-0.605],[-0.086,-0.636],[-0.094,-0.667],[-0.1,-0.697],[-0.107,-0.727],[-0.114,-0.756],[-0.12,-0.784],[-0.126,-0.813],[-0.132,-0.841],[-0.138,-0.868],[-0.143,-0.894],[-0.149,-0.919],[-0.155,-0.943],[-0.16,-0.966],[-0.166,-0.987],[-0.17,-1.007],[-0.175,-1.027],[-0.179,-1.045],[-0.183,-1.062],[-0.187,-1.077],[-0.191,-1.091],[-0.195,-1.104],[-0.198,-1.115],[-0.2,-1.124],[-0.202,-1.133],[-0.203,-1.139],[-0.204,-1.145],[-0.204,-1.15],[-0.203,-1.154],[-0.202,-1.158],[-0.2,-1.162],[-0.197,-1.165],[-0.193,-1.168],[-0.188,-1.171],[-0.182,-1.173],[-0.176,-1.175],[-0.169,-1.177],[-0.162,-1.179],[-0.155,-1.18],[-0.147,-1.182],[-0.14,-1.183],[-0.132,-1.184],[-0.123,-1.184],[-0.115,-1.185],[-0.107,-1.184],[-0.098,-1.183],[-0.088,-1.182],[-0.078,-1.181],[-0.067,-1.179],[-0.055,-1.178],[-0.043,-1.177],[-0.031,-1.175],[-0.018,-1.174],[-0.005,-1.173],[0.007,-1.171],[0.02,-1.17],[0.034,-1.169],[0.047,-1.168],[0.06,-1.167],[0.073,-1.167],[0.086,-1.166],[0.098,-1.166],[0.111,-1.166],[0.123,-1.166],[0.135,-1.166],[0.147,-1.166],[0.158,-1.166],[0.169,-1.166],[0.178,-1.167],[0.188,-1.167],[0.196,-1.168],[0.203,-1.169],[0.208,-1.171],[0.212,-1.173],[0.214,-1.175],[0.215,-1.178],[0.215,-1.182],[0.214,-1.187],[0.21,-1.193],[0.206,-1.2],[0.201,-1.209],[0.194,-1.219],[0.186,-1.231],[0.177,-1.245],[0.167,-1.261],[0.155,-1.279],[0.141,-1.298],[0.126,-1.32],[0.108,-1.343],[0.088,-1.368],[0.066,-1.394],[0.042,-1.423],[0.016,-1.453],[-0.012,-1.484],[-0.043,-1.517],[-0.074,-1.552],[-0.108,-1.589],[-0.144,-1.627],[-0.182,-1.667],[-0.221,-1.709],[-0.261,-1.753],[-0.304,-1.798],[-0.347,-1.846],[-0.392,-1.895],[-0.438,-1.945],[-0.485,-1.996],[-0.533,-2.048],[-0.582,-2.101],[-0.632,-2.155],[-0.683,-2.21],[-0.734,-2.265],[-0.786,-2.322],[-0.838,-2.379],[-0.891,-2.437],[-0.944,-2.495],[-0.997,-2.552],[-1.049,-2.61],[-1.102,-2.667],[-1.154,-2.723],[-1.205,-2.779],[-1.256,-2.834],[-1.306,-2.888],[-1.356,-2.941],[-1.405,-2.993],[-1.454,-3.044],[-1.502,-3.094],[-1.549,-3.143],[-1.595,-3.19],[-1.639,-3.236],[-1.683,-3.28],[-1.725,-3.322],[-1.765,-3.363],[-1.804,-3.401],[-1.842,-3.438],[-1.879,-3.472],[-1.913,-3.505],[-1.946,-3.536],[-1.978,-3.564],[-2.008,-3.59],[-2.036,-3.613],[-2.063,-3.634],[-2.089,-3.652],[-2.105,-3.668],[-2.122,-3.682],[-2.137,-3.696],[-2.153,-3.709],[-2.168,-3.721],[-2.182,-3.733],[-2.196,-3.745],[-2.21,-3.755],[-2.223,-3.765],[-2.235,-3.774],[-2.246,-3.781],[-2.257,-3.788],[-2.267,-3.794],[-2.276,-3.8],[-2.285,-3.805],[-2.293,-3.809],[-2.301,-3.813],[-2.309,-3.817],[-2.316,-3.819],[-2.323,-3.821]]},"fall_wm":{"file":"fall_wm.webp","cw":280,"ch":290,"cols":15,"n":201,"k":160.0,"cx":140.0,"cy":268.0,"yaw":-0.59,"pitch":0.12,"fps":25.0,"T":[[0.058,0.1],[0.058,0.098],[0.057,0.096],[0.056,0.092],[0.055,0.089],[0.053,0.085],[0.051,0.08],[0.05,0.075],[0.048,0.069],[0.046,0.062],[0.045,0.055],[0.043,0.046],[0.042,0.036],[0.04,0.025],[0.038,0.014],[0.036,0.002],[0.034,-0.011],[0.031,-0.024],[0.029,-0.038],[0.027,-0.053],[0.025,-0.069],[0.024,-0.088],[0.021,-0.108],[0.018,-0.131],[0.015,-0.154],[0.011,-0.18],[0.006,-0.206],[0.002,-0.233],[-0.004,-0.261],[-0.009,-0.29],[-0.015,-0.32],[-0.022,-0.35],[-0.029,-0.381],[-0.036,-0.413],[-0.043,-0.445],[-0.05,-0.477],[-0.057,-0.509],[-0.065,-0.541],[-0.072,-0.573],[-0.079,-0.605],[-0.086,-0.636],[-0.094,-0.667],[-0.1,-0.697],[-0.107,-0.727],[-0.114,-0.756],[-0.12,-0.784],[-0.126,-0.813],[-0.132,-0.841],[-0.138,-0.868],[-0.143,-0.894],[-0.149,-0.919],[-0.155,-0.943],[-0.16,-0.966],[-0.166,-0.987],[-0.17,-1.007],[-0.175,-1.027],[-0.179,-1.045],[-0.183,-1.062],[-0.187,-1.077],[-0.191,-1.091],[-0.195,-1.104],[-0.198,-1.115],[-0.2,-1.124],[-0.202,-1.133],[-0.203,-1.139],[-0.204,-1.145],[-0.204,-1.15],[-0.203,-1.154],[-0.202,-1.158],[-0.2,-1.162],[-0.197,-1.165],[-0.193,-1.168],[-0.188,-1.171],[-0.182,-1.173],[-0.176,-1.175],[-0.169,-1.177],[-0.162,-1.179],[-0.155,-1.18],[-0.147,-1.182],[-0.14,-1.183],[-0.132,-1.184],[-0.123,-1.184],[-0.115,-1.185],[-0.107,-1.184],[-0.098,-1.183],[-0.088,-1.182],[-0.078,-1.181],[-0.067,-1.179],[-0.055,-1.178],[-0.043,-1.177],[-0.031,-1.175],[-0.018,-1.174],[-0.005,-1.173],[0.007,-1.171],[0.02,-1.17],[0.034,-1.169],[0.047,-1.168],[0.06,-1.167],[0.073,-1.167],[0.086,-1.166],[0.098,-1.166],[0.111,-1.166],[0.123,-1.166],[0.135,-1.166],[0.147,-1.166],[0.158,-1.166],[0.169,-1.166],[0.178,-1.167],[0.188,-1.167],[0.196,-1.168],[0.203,-1.169],[0.208,-1.171],[0.212,-1.173],[0.214,-1.175],[0.215,-1.178],[0.215,-1.182],[0.214,-1.187],[0.21,-1.193],[0.206,-1.2],[0.201,-1.209],[0.194,-1.219],[0.186,-1.231],[0.177,-1.245],[0.167,-1.261],[0.155,-1.279],[0.141,-1.298],[0.126,-1.32],[0.108,-1.343],[0.088,-1.368],[0.066,-1.394],[0.042,-1.423],[0.016,-1.453],[-0.012,-1.484],[-0.043,-1.517],[-0.074,-1.552],[-0.108,-1.589],[-0.144,-1.627],[-0.182,-1.667],[-0.221,-1.709],[-0.261,-1.753],[-0.304,-1.798],[-0.347,-1.846],[-0.392,-1.895],[-0.438,-1.945],[-0.485,-1.996],[-0.533,-2.048],[-0.582,-2.101],[-0.632,-2.155],[-0.683,-2.21],[-0.734,-2.265],[-0.786,-2.322],[-0.838,-2.379],[-0.891,-2.437],[-0.944,-2.495],[-0.997,-2.552],[-1.049,-2.61],[-1.102,-2.667],[-1.154,-2.723],[-1.205,-2.779],[-1.256,-2.834],[-1.306,-2.888],[-1.356,-2.941],[-1.405,-2.993],[-1.454,-3.044],[-1.502,-3.094],[-1.549,-3.143],[-1.595,-3.19],[-1.639,-3.236],[-1.683,-3.28],[-1.725,-3.322],[-1.765,-3.363],[-1.804,-3.401],[-1.842,-3.438],[-1.879,-3.472],[-1.913,-3.505],[-1.946,-3.536],[-1.978,-3.564],[-2.008,-3.59],[-2.036,-3.613],[-2.063,-3.634],[-2.089,-3.652],[-2.105,-3.668],[-2.122,-3.682],[-2.137,-3.696],[-2.153,-3.709],[-2.168,-3.721],[-2.182,-3.733],[-2.196,-3.745],[-2.21,-3.755],[-2.223,-3.765],[-2.235,-3.774],[-2.246,-3.781],[-2.257,-3.788],[-2.267,-3.794],[-2.276,-3.8],[-2.285,-3.805],[-2.293,-3.809],[-2.301,-3.813],[-2.309,-3.817],[-2.316,-3.819],[-2.323,-3.821]]},"fall_ref":{"file":"fall_ref.webp","cw":280,"ch":290,"cols":15,"n":201,"k":160.0,"cx":140.0,"cy":268.0,"yaw":-0.59,"pitch":0.12,"fps":25.0,"T":[[0.058,0.1],[0.058,0.098],[0.057,0.096],[0.056,0.092],[0.055,0.089],[0.053,0.085],[0.051,0.08],[0.05,0.075],[0.048,0.069],[0.046,0.062],[0.045,0.055],[0.043,0.046],[0.042,0.036],[0.04,0.025],[0.038,0.014],[0.036,0.002],[0.034,-0.011],[0.031,-0.024],[0.029,-0.038],[0.027,-0.053],[0.025,-0.069],[0.024,-0.088],[0.021,-0.108],[0.018,-0.131],[0.015,-0.154],[0.011,-0.18],[0.006,-0.206],[0.002,-0.233],[-0.004,-0.261],[-0.009,-0.29],[-0.015,-0.32],[-0.022,-0.35],[-0.029,-0.381],[-0.036,-0.413],[-0.043,-0.445],[-0.05,-0.477],[-0.057,-0.509],[-0.065,-0.541],[-0.072,-0.573],[-0.079,-0.605],[-0.086,-0.636],[-0.094,-0.667],[-0.1,-0.697],[-0.107,-0.727],[-0.114,-0.756],[-0.12,-0.784],[-0.126,-0.813],[-0.132,-0.841],[-0.138,-0.868],[-0.143,-0.894],[-0.149,-0.919],[-0.155,-0.943],[-0.16,-0.966],[-0.166,-0.987],[-0.17,-1.007],[-0.175,-1.027],[-0.179,-1.045],[-0.183,-1.062],[-0.187,-1.077],[-0.191,-1.091],[-0.195,-1.104],[-0.198,-1.115],[-0.2,-1.124],[-0.202,-1.133],[-0.203,-1.139],[-0.204,-1.145],[-0.204,-1.15],[-0.203,-1.154],[-0.202,-1.158],[-0.2,-1.162],[-0.197,-1.165],[-0.193,-1.168],[-0.188,-1.171],[-0.182,-1.173],[-0.176,-1.175],[-0.169,-1.177],[-0.162,-1.179],[-0.155,-1.18],[-0.147,-1.182],[-0.14,-1.183],[-0.132,-1.184],[-0.123,-1.184],[-0.115,-1.185],[-0.107,-1.184],[-0.098,-1.183],[-0.088,-1.182],[-0.078,-1.181],[-0.067,-1.179],[-0.055,-1.178],[-0.043,-1.177],[-0.031,-1.175],[-0.018,-1.174],[-0.005,-1.173],[0.007,-1.171],[0.02,-1.17],[0.034,-1.169],[0.047,-1.168],[0.06,-1.167],[0.073,-1.167],[0.086,-1.166],[0.098,-1.166],[0.111,-1.166],[0.123,-1.166],[0.135,-1.166],[0.147,-1.166],[0.158,-1.166],[0.169,-1.166],[0.178,-1.167],[0.188,-1.167],[0.196,-1.168],[0.203,-1.169],[0.208,-1.171],[0.212,-1.173],[0.214,-1.175],[0.215,-1.178],[0.215,-1.182],[0.214,-1.187],[0.21,-1.193],[0.206,-1.2],[0.201,-1.209],[0.194,-1.219],[0.186,-1.231],[0.177,-1.245],[0.167,-1.261],[0.155,-1.279],[0.141,-1.298],[0.126,-1.32],[0.108,-1.343],[0.088,-1.368],[0.066,-1.394],[0.042,-1.423],[0.016,-1.453],[-0.012,-1.484],[-0.043,-1.517],[-0.074,-1.552],[-0.108,-1.589],[-0.144,-1.627],[-0.182,-1.667],[-0.221,-1.709],[-0.261,-1.753],[-0.304,-1.798],[-0.347,-1.846],[-0.392,-1.895],[-0.438,-1.945],[-0.485,-1.996],[-0.533,-2.048],[-0.582,-2.101],[-0.632,-2.155],[-0.683,-2.21],[-0.734,-2.265],[-0.786,-2.322],[-0.838,-2.379],[-0.891,-2.437],[-0.944,-2.495],[-0.997,-2.552],[-1.049,-2.61],[-1.102,-2.667],[-1.154,-2.723],[-1.205,-2.779],[-1.256,-2.834],[-1.306,-2.888],[-1.356,-2.941],[-1.405,-2.993],[-1.454,-3.044],[-1.502,-3.094],[-1.549,-3.143],[-1.595,-3.19],[-1.639,-3.236],[-1.683,-3.28],[-1.725,-3.322],[-1.765,-3.363],[-1.804,-3.401],[-1.842,-3.438],[-1.879,-3.472],[-1.913,-3.505],[-1.946,-3.536],[-1.978,-3.564],[-2.008,-3.59],[-2.036,-3.613],[-2.063,-3.634],[-2.089,-3.652],[-2.105,-3.668],[-2.122,-3.682],[-2.137,-3.696],[-2.153,-3.709],[-2.168,-3.721],[-2.182,-3.733],[-2.196,-3.745],[-2.21,-3.755],[-2.223,-3.765],[-2.235,-3.774],[-2.246,-3.781],[-2.257,-3.788],[-2.267,-3.794],[-2.276,-3.8],[-2.285,-3.805],[-2.293,-3.809],[-2.301,-3.813],[-2.309,-3.817],[-2.316,-3.819],[-2.323,-3.821]]},"off_sim":{"file":"off_sim.webp","cw":300,"ch":290,"cols":8,"n":51,"k":160.0,"cx":150.0,"cy":268.0,"yaw":-2.2,"pitch":0.12,"fps":25.0,"T":[[-4.589,-1.701],[-4.646,-1.699],[-4.703,-1.698],[-4.759,-1.698],[-4.815,-1.697],[-4.868,-1.697],[-4.916,-1.698],[-4.958,-1.699],[-5.022,-1.701],[-5.106,-1.703],[-5.182,-1.705],[-5.251,-1.707],[-5.313,-1.71],[-5.367,-1.713],[-5.413,-1.715],[-5.453,-1.718],[-5.484,-1.72],[-5.508,-1.722],[-5.526,-1.724],[-5.536,-1.726],[-5.541,-1.728],[-5.541,-1.73],[-5.541,-1.731],[-5.541,-1.731],[-5.54,-1.731],[-5.54,-1.73],[-5.54,-1.729],[-5.539,-1.728],[-5.539,-1.727],[-5.539,-1.727],[-5.539,-1.726],[-5.54,-1.726],[-5.54,-1.726],[-5.54,-1.726],[-5.54,-1.727],[-5.541,-1.726],[-5.541,-1.726],[-5.541,-1.726],[-5.541,-1.725],[-5.541,-1.725],[-5.541,-1.725],[-5.541,-1.724],[-5.542,-1.724],[-5.542,-1.724],[-5.542,-1.724],[-5.542,-1.724],[-5.542,-1.724],[-5.542,-1.724],[-5.542,-1.724],[-5.542,-1.723],[-5.542,-1.723]]},"off_wm":{"file":"off_wm.webp","cw":300,"ch":290,"cols":8,"n":51,"k":160.0,"cx":150.0,"cy":268.0,"yaw":-2.2,"pitch":0.12,"fps":25.0,"T":[[-4.589,-1.701],[-4.646,-1.699],[-4.703,-1.698],[-4.759,-1.698],[-4.815,-1.697],[-4.868,-1.697],[-4.916,-1.698],[-4.958,-1.699],[-5.022,-1.701],[-5.106,-1.703],[-5.182,-1.705],[-5.251,-1.707],[-5.313,-1.71],[-5.367,-1.713],[-5.413,-1.715],[-5.453,-1.718],[-5.484,-1.72],[-5.508,-1.722],[-5.526,-1.724],[-5.536,-1.726],[-5.541,-1.728],[-5.541,-1.73],[-5.541,-1.731],[-5.541,-1.731],[-5.54,-1.731],[-5.54,-1.73],[-5.54,-1.729],[-5.539,-1.728],[-5.539,-1.727],[-5.539,-1.727],[-5.539,-1.726],[-5.54,-1.726],[-5.54,-1.726],[-5.54,-1.726],[-5.54,-1.727],[-5.541,-1.726],[-5.541,-1.726],[-5.541,-1.726],[-5.541,-1.725],[-5.541,-1.725],[-5.541,-1.725],[-5.541,-1.724],[-5.542,-1.724],[-5.542,-1.724],[-5.542,-1.724],[-5.542,-1.724],[-5.542,-1.724],[-5.542,-1.724],[-5.542,-1.724],[-5.542,-1.723],[-5.542,-1.723]]},"slip_sim":{"file":"slip_sim.webp","cw":280,"ch":290,"cols":9,"n":76,"k":160.0,"cx":140.0,"cy":268.0,"yaw":0.62,"pitch":0.12,"fps":25.0,"T":[[-7.428,1.343],[-7.427,1.399],[-7.426,1.456],[-7.425,1.511],[-7.423,1.566],[-7.42,1.619],[-7.417,1.67],[-7.414,1.72],[-7.411,1.797],[-7.408,1.901],[-7.404,2.0],[-7.398,2.097],[-7.392,2.19],[-7.383,2.281],[-7.374,2.37],[-7.364,2.456],[-7.355,2.538],[-7.345,2.618],[-7.335,2.696],[-7.325,2.769],[-7.314,2.841],[-7.302,2.91],[-7.289,2.977],[-7.275,3.041],[-7.261,3.103],[-7.247,3.161],[-7.231,3.219],[-7.215,3.273],[-7.198,3.327],[-7.18,3.378],[-7.162,3.429],[-7.144,3.478],[-7.125,3.525],[-7.107,3.569],[-7.088,3.611],[-7.068,3.652],[-7.05,3.691],[-7.032,3.728],[-7.015,3.763],[-6.998,3.796],[-6.981,3.827],[-6.965,3.856],[-6.95,3.883],[-6.936,3.908],[-6.923,3.931],[-6.91,3.951],[-6.899,3.97],[-6.887,3.987],[-6.876,4.002],[-6.864,4.015],[-6.852,4.027],[-6.84,4.038],[-6.829,4.048],[-6.817,4.057],[-6.805,4.066],[-6.793,4.074],[-6.781,4.082],[-6.769,4.089],[-6.756,4.097],[-6.744,4.104],[-6.731,4.11],[-6.719,4.116],[-6.707,4.121],[-6.697,4.125],[-6.687,4.129],[-6.678,4.132],[-6.67,4.134],[-6.663,4.137],[-6.658,4.138],[-6.653,4.14],[-6.649,4.141],[-6.646,4.142],[-6.643,4.143],[-6.64,4.143],[-6.638,4.143],[-6.637,4.143]]},"slip_wm":{"file":"slip_wm.webp","cw":280,"ch":290,"cols":9,"n":76,"k":160.0,"cx":140.0,"cy":268.0,"yaw":0.62,"pitch":0.12,"fps":25.0,"T":[[-7.428,1.343],[-7.427,1.399],[-7.426,1.456],[-7.425,1.511],[-7.423,1.566],[-7.42,1.619],[-7.417,1.67],[-7.414,1.72],[-7.411,1.797],[-7.408,1.901],[-7.404,2.0],[-7.398,2.097],[-7.392,2.19],[-7.383,2.281],[-7.374,2.37],[-7.364,2.456],[-7.355,2.538],[-7.345,2.618],[-7.335,2.696],[-7.325,2.769],[-7.314,2.841],[-7.302,2.91],[-7.289,2.977],[-7.275,3.041],[-7.261,3.103],[-7.247,3.161],[-7.231,3.219],[-7.215,3.273],[-7.198,3.327],[-7.18,3.378],[-7.162,3.429],[-7.144,3.478],[-7.125,3.525],[-7.107,3.569],[-7.088,3.611],[-7.068,3.652],[-7.05,3.691],[-7.032,3.728],[-7.015,3.763],[-6.998,3.796],[-6.981,3.827],[-6.965,3.856],[-6.95,3.883],[-6.936,3.908],[-6.923,3.931],[-6.91,3.951],[-6.899,3.97],[-6.887,3.987],[-6.876,4.002],[-6.864,4.015],[-6.852,4.027],[-6.84,4.038],[-6.829,4.048],[-6.817,4.057],[-6.805,4.066],[-6.793,4.074],[-6.781,4.082],[-6.769,4.089],[-6.756,4.097],[-6.744,4.104],[-6.731,4.11],[-6.719,4.116],[-6.707,4.121],[-6.697,4.125],[-6.687,4.129],[-6.678,4.132],[-6.67,4.134],[-6.663,4.137],[-6.658,4.138],[-6.653,4.14],[-6.649,4.141],[-6.646,4.142],[-6.643,4.143],[-6.64,4.143],[-6.638,4.143],[-6.637,4.143]]}};
  /* 我们的复现（不是论文的实验）：Uni-SuperMimic 放出的 lafan1_ckpt_012000.pt（世界模型 + 策略），我们照它的代码重写的 MuJoCo 回放；h* 是根部高度（m，每 2 步一个），rootErr 是世界模型和仿真器的根部距离（m），jointRmse 是 29 个关节角的均方根差（rad） */
  var REPRO = {"fall":{"clip":"fallAndGetUp1_subject1","f0":200,"steps":400,"hSim":[0.778,0.778,0.776,0.773,0.768,0.768,0.769,0.768,0.767,0.766,0.766,0.765,0.764,0.765,0.766,0.767,0.77,0.772,0.773,0.771,0.766,0.754,0.738,0.721,0.706,0.691,0.673,0.661,0.656,0.652,0.645,0.631,0.606,0.581,0.559,0.534,0.503,0.466,0.421,0.37,0.333,0.31,0.282,0.255,0.223,0.2,0.209,0.214,0.213,0.208,0.2,0.19,0.18,0.171,0.161,0.153,0.149,0.147,0.144,0.142,0.139,0.137,0.134,0.131,0.128,0.126,0.124,0.124,0.124,0.125,0.125,0.127,0.129,0.131,0.133,0.135,0.137,0.14,0.143,0.147,0.152,0.158,0.163,0.168,0.173,0.179,0.185,0.19,0.198,0.208,0.217,0.224,0.237,0.247,0.254,0.26,0.266,0.274,0.283,0.296,0.309,0.324,0.34,0.355,0.368,0.372,0.368,0.358,0.356,0.368,0.383,0.396,0.404,0.397,0.38,0.384,0.405,0.416,0.408,0.397,0.396,0.407,0.428,0.451,0.472,0.495,0.523,0.554,0.584,0.61,0.629,0.641,0.645,0.648,0.655,0.664,0.673,0.681,0.687,0.69,0.686,0.668,0.641,0.628,0.629,0.639,0.653,0.665,0.676,0.679,0.672,0.671,0.681,0.697,0.713,0.73,0.744,0.747,0.734,0.706,0.67,0.652,0.643,0.644,0.652,0.667,0.687,0.711,0.732,0.744,0.742,0.735,0.728,0.723,0.722,0.726,0.735,0.747,0.76,0.771,0.776,0.773,0.76,0.754,0.753,0.753,0.756,0.761,0.766,0.771,0.774,0.773,0.771,0.767,0.765,0.766,0.766,0.765,0.763,0.762,0.764],"hWm":[0.778,0.778,0.777,0.774,0.768,0.768,0.769,0.768,0.767,0.767,0.767,0.766,0.765,0.765,0.766,0.768,0.771,0.773,0.774,0.773,0.767,0.756,0.74,0.722,0.708,0.693,0.676,0.664,0.658,0.655,0.649,0.636,0.613,0.587,0.564,0.539,0.509,0.475,0.436,0.393,0.343,0.309,0.292,0.277,0.254,0.222,0.205,0.21,0.211,0.207,0.2,0.19,0.178,0.168,0.161,0.156,0.153,0.149,0.145,0.141,0.137,0.132,0.128,0.123,0.119,0.116,0.114,0.114,0.114,0.115,0.117,0.119,0.122,0.125,0.128,0.131,0.134,0.138,0.141,0.145,0.149,0.154,0.159,0.164,0.17,0.176,0.181,0.188,0.196,0.208,0.222,0.235,0.246,0.255,0.261,0.266,0.272,0.281,0.291,0.304,0.317,0.332,0.348,0.363,0.374,0.375,0.365,0.354,0.356,0.368,0.382,0.39,0.394,0.396,0.397,0.397,0.397,0.396,0.395,0.394,0.398,0.408,0.426,0.448,0.471,0.497,0.527,0.558,0.587,0.61,0.627,0.634,0.633,0.636,0.643,0.652,0.663,0.673,0.681,0.686,0.683,0.669,0.641,0.626,0.627,0.641,0.656,0.668,0.677,0.677,0.668,0.667,0.675,0.691,0.708,0.725,0.741,0.746,0.735,0.708,0.673,0.654,0.645,0.645,0.652,0.666,0.686,0.709,0.731,0.744,0.743,0.735,0.726,0.72,0.718,0.723,0.732,0.744,0.758,0.769,0.776,0.775,0.763,0.754,0.752,0.752,0.755,0.76,0.766,0.771,0.774,0.775,0.773,0.769,0.767,0.767,0.768,0.766,0.763,0.763,0.764],"hRef":[0.784,0.784,0.783,0.782,0.779,0.776,0.776,0.775,0.774,0.775,0.776,0.777,0.779,0.781,0.783,0.786,0.787,0.787,0.785,0.781,0.776,0.766,0.751,0.734,0.716,0.698,0.681,0.666,0.655,0.648,0.637,0.621,0.601,0.575,0.551,0.529,0.507,0.485,0.462,0.437,0.414,0.385,0.354,0.322,0.29,0.258,0.228,0.205,0.196,0.192,0.188,0.179,0.172,0.168,0.165,0.163,0.161,0.157,0.153,0.15,0.148,0.146,0.146,0.146,0.147,0.148,0.148,0.149,0.149,0.149,0.15,0.15,0.151,0.152,0.154,0.158,0.162,0.165,0.167,0.168,0.169,0.17,0.172,0.175,0.18,0.187,0.196,0.208,0.221,0.235,0.249,0.261,0.271,0.28,0.289,0.297,0.306,0.316,0.326,0.335,0.344,0.352,0.36,0.368,0.375,0.38,0.386,0.392,0.398,0.404,0.411,0.417,0.422,0.427,0.431,0.432,0.432,0.431,0.429,0.429,0.432,0.439,0.448,0.457,0.462,0.478,0.503,0.53,0.558,0.581,0.599,0.599,0.604,0.613,0.621,0.628,0.637,0.646,0.651,0.651,0.641,0.625,0.62,0.621,0.626,0.638,0.656,0.676,0.689,0.693,0.689,0.691,0.696,0.707,0.727,0.745,0.752,0.749,0.741,0.727,0.711,0.692,0.679,0.672,0.674,0.686,0.709,0.73,0.745,0.754,0.755,0.745,0.732,0.724,0.718,0.719,0.726,0.738,0.754,0.769,0.775,0.772,0.764,0.76,0.759,0.76,0.765,0.772,0.778,0.782,0.784,0.783,0.781,0.778,0.775,0.778,0.777,0.771,0.768,0.768,0.771],"rootErr":[0.0,0.0,0.001,0.001,0.001,0.002,0.002,0.003,0.004,0.004,0.005,0.005,0.006,0.007,0.008,0.008,0.009,0.01,0.011,0.011,0.011,0.012,0.012,0.011,0.011,0.012,0.013,0.013,0.011,0.01,0.009,0.01,0.012,0.012,0.012,0.013,0.015,0.018,0.022,0.029,0.031,0.04,0.039,0.041,0.048,0.052,0.067,0.074,0.079,0.085,0.091,0.095,0.098,0.099,0.099,0.095,0.093,0.095,0.097,0.098,0.1,0.102,0.104,0.105,0.106,0.106,0.106,0.107,0.107,0.107,0.107,0.107,0.108,0.109,0.11,0.112,0.113,0.115,0.116,0.117,0.117,0.117,0.115,0.114,0.113,0.114,0.114,0.115,0.114,0.113,0.112,0.11,0.108,0.106,0.102,0.098,0.096,0.096,0.097,0.1,0.103,0.107,0.111,0.113,0.113,0.11,0.103,0.099,0.1,0.102,0.106,0.113,0.12,0.126,0.136,0.15,0.165,0.172,0.176,0.184,0.192,0.197,0.201,0.204,0.208,0.212,0.215,0.218,0.221,0.225,0.228,0.233,0.237,0.239,0.241,0.244,0.247,0.25,0.254,0.258,0.262,0.266,0.271,0.274,0.277,0.278,0.281,0.283,0.286,0.288,0.288,0.286,0.284,0.281,0.279,0.275,0.271,0.269,0.267,0.264,0.26,0.256,0.254,0.252,0.249,0.247,0.245,0.243,0.24,0.237,0.235,0.234,0.233,0.233,0.233,0.233,0.234,0.234,0.235,0.235,0.235,0.236,0.237,0.239,0.239,0.239,0.239,0.238,0.237,0.236,0.236,0.235,0.235,0.235,0.235,0.235,0.235,0.235,0.235,0.234,0.233],"jointRmse":[0.0,0.0014,0.0025,0.0036,0.0046,0.0053,0.0059,0.0062,0.0062,0.0065,0.0069,0.0068,0.0065,0.0077,0.0084,0.0091,0.0083,0.0099,0.0113,0.0114,0.0111,0.0111,0.0099,0.0095,0.0114,0.0138,0.0131,0.0132,0.0148,0.0149,0.0151,0.015,0.0146,0.0163,0.0202,0.0249,0.0262,0.0288,0.035,0.0481,0.0657,0.0509,0.0439,0.0379,0.0399,0.0371,0.026,0.025,0.0224,0.0218,0.0245,0.0252,0.034,0.0402,0.0465,0.0493,0.0402,0.0356,0.0356,0.0375,0.0394,0.0418,0.0435,0.044,0.0447,0.0453,0.0451,0.0442,0.0432,0.0417,0.0393,0.0368,0.0346,0.0333,0.0326,0.0323,0.0328,0.0343,0.0362,0.0379,0.0399,0.0426,0.0456,0.0479,0.05,0.0538,0.0576,0.061,0.0641,0.0648,0.0661,0.0637,0.0643,0.0597,0.0541,0.0485,0.0446,0.0422,0.0431,0.0467,0.0489,0.05,0.051,0.0532,0.0565,0.0614,0.0624,0.0621,0.0482,0.0471,0.0489,0.0513,0.0499,0.0474,0.054,0.0625,0.0855,0.0963,0.0914,0.0814,0.0762,0.0701,0.0691,0.066,0.06,0.0546,0.0507,0.0477,0.0462,0.0474,0.0526,0.0589,0.0607,0.0624,0.0601,0.057,0.0578,0.0524,0.0475,0.0402,0.0336,0.0308,0.0229,0.0192,0.0187,0.017,0.0216,0.0238,0.0185,0.0168,0.0165,0.0169,0.019,0.0188,0.0182,0.0237,0.0275,0.0171,0.0135,0.0117,0.0117,0.0105,0.0072,0.0086,0.0089,0.0097,0.0139,0.0166,0.0191,0.0187,0.0216,0.0212,0.0202,0.0172,0.0136,0.0125,0.012,0.0113,0.011,0.0112,0.0124,0.0144,0.0161,0.0184,0.0159,0.015,0.014,0.0134,0.0123,0.0114,0.0111,0.0118,0.0115,0.0118,0.0117,0.0125,0.0105,0.0096,0.0086,0.0079,0.0078],"rootSim":[[-0.008,0.009],[-0.001,0.017],[0.008,0.027],[0.019,0.042],[0.031,0.058],[0.039,0.07],[0.046,0.082],[0.054,0.094],[0.061,0.108],[0.068,0.122],[0.075,0.136],[0.08,0.145],[0.083,0.148],[0.084,0.149],[0.085,0.147],[0.086,0.143],[0.087,0.137],[0.085,0.128],[0.081,0.117],[0.074,0.103],[0.064,0.084],[0.053,0.06],[0.043,0.037],[0.031,0.015],[0.02,-0.004],[0.01,-0.021],[0.003,-0.04],[0.001,-0.066],[0.001,-0.099],[0.001,-0.14],[0.0,-0.187],[-0.004,-0.238],[-0.012,-0.29],[-0.024,-0.336],[-0.033,-0.377],[-0.04,-0.422],[-0.045,-0.47],[-0.049,-0.524],[-0.051,-0.583],[-0.047,-0.649],[-0.057,-0.708],[-0.08,-0.767],[-0.096,-0.827],[-0.111,-0.882],[-0.125,-0.936],[-0.134,-0.976],[-0.14,-0.996],[-0.149,-1.016],[-0.158,-1.038],[-0.167,-1.061],[-0.179,-1.082],[-0.189,-1.102],[-0.194,-1.12],[-0.199,-1.135],[-0.203,-1.147],[-0.205,-1.158],[-0.209,-1.164],[-0.214,-1.165],[-0.217,-1.166],[-0.219,-1.167],[-0.222,-1.167],[-0.224,-1.168],[-0.227,-1.168],[-0.231,-1.169],[-0.234,-1.169],[-0.236,-1.17],[-0.237,-1.171],[-0.237,-1.171],[-0.236,-1.171],[-0.235,-1.171],[-0.233,-1.171],[-0.231,-1.171],[-0.227,-1.17],[-0.224,-1.17],[-0.221,-1.169],[-0.218,-1.169],[-0.214,-1.168],[-0.21,-1.168],[-0.206,-1.168],[-0.202,-1.168],[-0.196,-1.168],[-0.189,-1.169],[-0.18,-1.171],[-0.169,-1.173],[-0.158,-1.174],[-0.146,-1.175],[-0.132,-1.177],[-0.115,-1.179],[-0.095,-1.184],[-0.07,-1.191],[-0.039,-1.201],[-0.008,-1.21],[0.016,-1.216],[0.037,-1.22],[0.056,-1.225],[0.07,-1.228],[0.08,-1.229],[0.088,-1.227],[0.094,-1.221],[0.099,-1.213],[0.103,-1.201],[0.107,-1.187],[0.112,-1.169],[0.121,-1.149],[0.137,-1.129],[0.161,-1.114],[0.189,-1.11],[0.215,-1.114],[0.238,-1.118],[0.255,-1.12],[0.27,-1.119],[0.281,-1.117],[0.288,-1.115],[0.295,-1.116],[0.302,-1.121],[0.313,-1.127],[0.322,-1.133],[0.319,-1.14],[0.315,-1.147],[0.314,-1.153],[0.314,-1.159],[0.311,-1.164],[0.309,-1.167],[0.307,-1.17],[0.302,-1.175],[0.296,-1.181],[0.285,-1.189],[0.271,-1.199],[0.254,-1.212],[0.233,-1.227],[0.209,-1.245],[0.181,-1.265],[0.15,-1.291],[0.114,-1.319],[0.077,-1.352],[0.038,-1.391],[-0.006,-1.435],[-0.052,-1.483],[-0.097,-1.532],[-0.142,-1.586],[-0.187,-1.642],[-0.228,-1.702],[-0.268,-1.766],[-0.311,-1.824],[-0.36,-1.878],[-0.415,-1.934],[-0.476,-1.998],[-0.539,-2.066],[-0.605,-2.138],[-0.67,-2.212],[-0.737,-2.283],[-0.806,-2.348],[-0.874,-2.409],[-0.944,-2.473],[-1.014,-2.543],[-1.082,-2.618],[-1.152,-2.697],[-1.219,-2.777],[-1.283,-2.861],[-1.349,-2.948],[-1.415,-3.032],[-1.471,-3.097],[-1.52,-3.156],[-1.566,-3.206],[-1.611,-3.251],[-1.656,-3.296],[-1.701,-3.341],[-1.745,-3.387],[-1.79,-3.436],[-1.838,-3.487],[-1.886,-3.537],[-1.931,-3.58],[-1.973,-3.614],[-2.011,-3.642],[-2.045,-3.666],[-2.075,-3.688],[-2.102,-3.711],[-2.126,-3.733],[-2.149,-3.756],[-2.172,-3.779],[-2.194,-3.8],[-2.216,-3.82],[-2.238,-3.84],[-2.256,-3.851],[-2.269,-3.858],[-2.28,-3.864],[-2.29,-3.868],[-2.3,-3.869],[-2.311,-3.869],[-2.323,-3.866],[-2.335,-3.86],[-2.347,-3.852],[-2.357,-3.841],[-2.365,-3.828],[-2.371,-3.813],[-2.375,-3.795],[-2.378,-3.775],[-2.381,-3.757],[-2.386,-3.742],[-2.391,-3.727],[-2.396,-3.709]],"rootWm":[[-0.008,0.009],[-0.001,0.017],[0.009,0.028],[0.02,0.042],[0.032,0.058],[0.04,0.071],[0.048,0.083],[0.057,0.095],[0.064,0.108],[0.072,0.122],[0.079,0.135],[0.085,0.144],[0.089,0.147],[0.091,0.147],[0.092,0.144],[0.094,0.14],[0.095,0.133],[0.094,0.124],[0.09,0.112],[0.084,0.098],[0.074,0.078],[0.063,0.055],[0.052,0.03],[0.04,0.008],[0.028,-0.011],[0.018,-0.029],[0.011,-0.05],[0.008,-0.076],[0.007,-0.108],[0.006,-0.148],[0.003,-0.195],[-0.001,-0.246],[-0.01,-0.299],[-0.023,-0.345],[-0.035,-0.387],[-0.045,-0.432],[-0.051,-0.482],[-0.056,-0.537],[-0.058,-0.598],[-0.056,-0.664],[-0.052,-0.737],[-0.061,-0.802],[-0.078,-0.86],[-0.091,-0.912],[-0.102,-0.965],[-0.113,-1.019],[-0.125,-1.061],[-0.131,-1.087],[-0.136,-1.114],[-0.142,-1.142],[-0.148,-1.167],[-0.152,-1.19],[-0.156,-1.21],[-0.161,-1.226],[-0.165,-1.238],[-0.169,-1.246],[-0.175,-1.251],[-0.18,-1.254],[-0.183,-1.257],[-0.186,-1.259],[-0.188,-1.262],[-0.19,-1.264],[-0.193,-1.266],[-0.196,-1.268],[-0.199,-1.269],[-0.2,-1.27],[-0.2,-1.27],[-0.199,-1.27],[-0.196,-1.27],[-0.193,-1.269],[-0.189,-1.268],[-0.185,-1.267],[-0.179,-1.266],[-0.173,-1.266],[-0.167,-1.265],[-0.162,-1.265],[-0.157,-1.266],[-0.151,-1.266],[-0.146,-1.266],[-0.139,-1.266],[-0.132,-1.266],[-0.123,-1.266],[-0.113,-1.265],[-0.102,-1.265],[-0.091,-1.265],[-0.078,-1.266],[-0.063,-1.268],[-0.047,-1.271],[-0.027,-1.276],[-0.003,-1.282],[0.027,-1.291],[0.054,-1.3],[0.073,-1.307],[0.088,-1.313],[0.099,-1.317],[0.107,-1.319],[0.112,-1.32],[0.114,-1.319],[0.114,-1.316],[0.112,-1.311],[0.11,-1.304],[0.107,-1.294],[0.107,-1.28],[0.111,-1.262],[0.124,-1.242],[0.144,-1.223],[0.163,-1.21],[0.174,-1.204],[0.182,-1.201],[0.187,-1.195],[0.19,-1.189],[0.19,-1.185],[0.189,-1.182],[0.187,-1.182],[0.183,-1.185],[0.177,-1.189],[0.169,-1.195],[0.16,-1.201],[0.15,-1.207],[0.141,-1.213],[0.131,-1.218],[0.123,-1.223],[0.117,-1.226],[0.111,-1.23],[0.104,-1.237],[0.094,-1.245],[0.081,-1.254],[0.064,-1.265],[0.043,-1.278],[0.018,-1.294],[-0.01,-1.311],[-0.041,-1.334],[-0.076,-1.362],[-0.114,-1.392],[-0.153,-1.424],[-0.195,-1.462],[-0.242,-1.507],[-0.292,-1.555],[-0.34,-1.605],[-0.389,-1.66],[-0.438,-1.717],[-0.484,-1.777],[-0.528,-1.841],[-0.574,-1.9],[-0.626,-1.954],[-0.683,-2.01],[-0.746,-2.073],[-0.812,-2.141],[-0.881,-2.214],[-0.948,-2.288],[-1.015,-2.36],[-1.081,-2.425],[-1.148,-2.485],[-1.215,-2.549],[-1.282,-2.619],[-1.347,-2.693],[-1.412,-2.771],[-1.477,-2.851],[-1.539,-2.935],[-1.602,-3.022],[-1.664,-3.106],[-1.716,-3.171],[-1.763,-3.23],[-1.806,-3.282],[-1.848,-3.329],[-1.89,-3.374],[-1.932,-3.421],[-1.973,-3.468],[-2.016,-3.517],[-2.06,-3.568],[-2.106,-3.619],[-2.149,-3.663],[-2.19,-3.699],[-2.227,-3.728],[-2.261,-3.754],[-2.29,-3.778],[-2.317,-3.801],[-2.342,-3.824],[-2.366,-3.846],[-2.389,-3.868],[-2.412,-3.888],[-2.435,-3.908],[-2.459,-3.928],[-2.478,-3.939],[-2.492,-3.946],[-2.503,-3.951],[-2.513,-3.955],[-2.522,-3.955],[-2.533,-3.954],[-2.543,-3.951],[-2.555,-3.945],[-2.567,-3.936],[-2.577,-3.925],[-2.585,-3.911],[-2.59,-3.896],[-2.594,-3.878],[-2.597,-3.859],[-2.6,-3.842],[-2.604,-3.827],[-2.609,-3.812],[-2.614,-3.794]],"endRootErr":0.233,"maxHeightGap":0.036,"meanJoint":0.0318},"off":{"clip":"sprint1_subject2","f0":450,"steps":100,"hSim":[0.729,0.712,0.704,0.694,0.68,0.657,0.623,0.577,0.516,0.439,0.346,0.238,0.126,0.07,0.089,0.1,0.106,0.109,0.109,0.107,0.104,0.107,0.107,0.107,0.108,0.107,0.105,0.103,0.1,0.098,0.096,0.095,0.094,0.094,0.094,0.094,0.094,0.094,0.094,0.093,0.093,0.093,0.093,0.093,0.093,0.093,0.093,0.093,0.093,0.093,0.093],"hWm":[0.729,0.712,0.699,0.69,0.677,0.658,0.627,0.583,0.522,0.439,0.337,0.236,0.163,0.119,0.107,0.104,0.104,0.106,0.108,0.111,0.113,0.114,0.116,0.116,0.117,0.117,0.118,0.118,0.119,0.119,0.119,0.12,0.12,0.12,0.12,0.12,0.12,0.12,0.12,0.12,0.12,0.12,0.12,0.119,0.119,0.119,0.119,0.119,0.119,0.119,0.119],"hRef":[0.737,0.73,0.724,0.719,0.72,0.726,0.728,0.725,0.716,0.701,0.687,0.678,0.689,0.706,0.716,0.719,0.715,0.714,0.711,0.704,0.692,0.67,0.645,0.635,0.634,0.646,0.669,0.684,0.69,0.692,0.694,0.695,0.693,0.691,0.685,0.672,0.656,0.656,0.658,0.664,0.671,0.68,0.689,0.694,0.695,0.694,0.697,0.705,0.713,0.717,0.714],"rootErr":[0.0,0.006,0.007,0.009,0.014,0.018,0.022,0.024,0.022,0.011,0.012,0.024,0.06,0.076,0.07,0.071,0.071,0.07,0.067,0.065,0.065,0.066,0.07,0.078,0.08,0.078,0.073,0.069,0.065,0.062,0.059,0.058,0.056,0.054,0.053,0.051,0.049,0.047,0.045,0.042,0.04,0.038,0.036,0.034,0.032,0.031,0.03,0.03,0.029,0.03,0.03],"jointRmse":[0.0,0.0181,0.0221,0.0184,0.0205,0.0233,0.0213,0.0283,0.0385,0.0473,0.0663,0.09,0.1221,0.1441,0.162,0.1432,0.1175,0.1038,0.0986,0.0944,0.0884,0.0822,0.0774,0.0703,0.066,0.0641,0.064,0.0648,0.0655,0.0656,0.0649,0.0635,0.0612,0.0587,0.0564,0.0544,0.0529,0.0518,0.0513,0.0511,0.0511,0.0511,0.0511,0.0512,0.0512,0.0513,0.0513,0.0514,0.0514,0.0513,0.0512],"rootSim":[[-4.154,-1.709],[-4.278,-1.706],[-4.391,-1.706],[-4.503,-1.705],[-4.618,-1.701],[-4.732,-1.697],[-4.847,-1.694],[-4.961,-1.691],[-5.075,-1.689],[-5.186,-1.689],[-5.294,-1.69],[-5.401,-1.691],[-5.493,-1.691],[-5.54,-1.708],[-5.543,-1.72],[-5.544,-1.729],[-5.545,-1.734],[-5.546,-1.738],[-5.546,-1.741],[-5.546,-1.741],[-5.545,-1.741],[-5.541,-1.738],[-5.538,-1.732],[-5.536,-1.723],[-5.536,-1.719],[-5.537,-1.72],[-5.537,-1.723],[-5.538,-1.726],[-5.539,-1.728],[-5.539,-1.73],[-5.54,-1.73],[-5.54,-1.73],[-5.541,-1.729],[-5.541,-1.728],[-5.541,-1.727],[-5.541,-1.726],[-5.541,-1.725],[-5.541,-1.725],[-5.541,-1.724],[-5.541,-1.724],[-5.541,-1.724],[-5.541,-1.724],[-5.542,-1.724],[-5.542,-1.724],[-5.542,-1.724],[-5.542,-1.723],[-5.542,-1.723],[-5.542,-1.723],[-5.542,-1.723],[-5.542,-1.723],[-5.542,-1.723]],"rootWm":[[-4.154,-1.709],[-4.273,-1.71],[-4.386,-1.71],[-4.496,-1.71],[-4.607,-1.708],[-4.717,-1.705],[-4.827,-1.702],[-4.939,-1.699],[-5.054,-1.695],[-5.175,-1.691],[-5.298,-1.696],[-5.403,-1.715],[-5.473,-1.734],[-5.519,-1.762],[-5.538,-1.787],[-5.541,-1.8],[-5.542,-1.806],[-5.542,-1.807],[-5.542,-1.807],[-5.543,-1.806],[-5.544,-1.805],[-5.545,-1.803],[-5.545,-1.801],[-5.545,-1.8],[-5.545,-1.798],[-5.544,-1.797],[-5.543,-1.795],[-5.542,-1.793],[-5.541,-1.79],[-5.54,-1.788],[-5.539,-1.785],[-5.538,-1.782],[-5.537,-1.779],[-5.536,-1.776],[-5.535,-1.772],[-5.534,-1.769],[-5.534,-1.766],[-5.533,-1.763],[-5.532,-1.759],[-5.532,-1.756],[-5.531,-1.752],[-5.531,-1.749],[-5.53,-1.746],[-5.53,-1.742],[-5.529,-1.739],[-5.529,-1.735],[-5.528,-1.732],[-5.528,-1.728],[-5.527,-1.725],[-5.527,-1.721],[-5.526,-1.718]],"endRootErr":0.03,"maxHeightGap":0.055,"meanJoint":0.0634},"slip":{"clip":"sprint1_subject2","f0":545,"steps":150,"hSim":[0.716,0.724,0.721,0.706,0.681,0.675,0.679,0.692,0.695,0.71,0.725,0.725,0.719,0.711,0.701,0.683,0.655,0.629,0.617,0.614,0.619,0.629,0.632,0.627,0.629,0.657,0.681,0.688,0.69,0.692,0.699,0.715,0.725,0.723,0.717,0.718,0.718,0.722,0.726,0.724,0.716,0.716,0.726,0.739,0.753,0.766,0.773,0.775,0.773,0.767,0.766,0.768,0.769,0.768,0.766,0.76,0.758,0.761,0.764,0.766,0.767,0.767,0.767,0.767,0.768,0.767,0.766,0.765,0.764,0.763,0.763,0.765,0.766,0.768,0.77,0.772],"hWm":[0.716,0.723,0.721,0.706,0.679,0.672,0.674,0.683,0.69,0.711,0.732,0.737,0.725,0.708,0.704,0.698,0.688,0.669,0.642,0.634,0.629,0.629,0.619,0.606,0.62,0.649,0.672,0.687,0.697,0.705,0.704,0.717,0.736,0.748,0.746,0.73,0.724,0.725,0.727,0.725,0.719,0.723,0.734,0.748,0.762,0.773,0.779,0.781,0.778,0.769,0.768,0.769,0.77,0.768,0.765,0.757,0.758,0.76,0.763,0.764,0.765,0.765,0.766,0.766,0.767,0.766,0.765,0.764,0.764,0.763,0.763,0.764,0.764,0.766,0.768,0.77],"hRef":[0.71,0.715,0.716,0.71,0.697,0.69,0.685,0.691,0.702,0.719,0.732,0.738,0.739,0.734,0.726,0.714,0.703,0.694,0.679,0.653,0.64,0.638,0.646,0.663,0.681,0.699,0.722,0.732,0.734,0.738,0.748,0.758,0.767,0.772,0.773,0.769,0.762,0.754,0.75,0.75,0.754,0.758,0.763,0.768,0.77,0.77,0.77,0.768,0.769,0.771,0.774,0.775,0.776,0.777,0.777,0.778,0.777,0.777,0.775,0.774,0.773,0.774,0.775,0.775,0.777,0.777,0.777,0.779,0.778,0.778,0.777,0.776,0.775,0.775,0.776,0.776],"rootErr":[0.0,0.001,0.001,0.001,0.003,0.004,0.006,0.011,0.008,0.008,0.013,0.017,0.014,0.014,0.017,0.025,0.039,0.052,0.056,0.059,0.068,0.083,0.098,0.108,0.114,0.118,0.127,0.13,0.132,0.135,0.139,0.145,0.15,0.161,0.174,0.19,0.198,0.204,0.209,0.216,0.224,0.229,0.233,0.236,0.241,0.245,0.25,0.256,0.26,0.262,0.265,0.267,0.269,0.271,0.274,0.276,0.273,0.271,0.269,0.268,0.267,0.266,0.265,0.262,0.26,0.258,0.257,0.256,0.255,0.253,0.252,0.251,0.25,0.25,0.249,0.249],"jointRmse":[0.0,0.0041,0.0036,0.0053,0.0108,0.0119,0.0149,0.0269,0.0247,0.0413,0.0587,0.0575,0.0638,0.0746,0.0877,0.0974,0.1022,0.1153,0.1188,0.0965,0.0846,0.0706,0.0704,0.0628,0.0707,0.0662,0.0711,0.074,0.0622,0.0602,0.0888,0.0957,0.0956,0.0976,0.0894,0.0558,0.0326,0.0299,0.03,0.0344,0.0376,0.0366,0.0361,0.033,0.0256,0.0244,0.0216,0.0184,0.02,0.0172,0.0166,0.0167,0.0175,0.0181,0.0193,0.0196,0.0258,0.0331,0.0312,0.0295,0.0269,0.0224,0.0199,0.0192,0.018,0.0184,0.0181,0.0174,0.0187,0.0195,0.0235,0.0198,0.0193,0.0181,0.0162,0.0151],"rootSim":[[-7.413,0.899],[-7.413,1.024],[-7.416,1.15],[-7.425,1.272],[-7.439,1.392],[-7.445,1.489],[-7.442,1.588],[-7.432,1.7],[-7.419,1.821],[-7.417,1.935],[-7.412,2.042],[-7.402,2.14],[-7.392,2.231],[-7.382,2.318],[-7.376,2.403],[-7.37,2.485],[-7.363,2.571],[-7.352,2.647],[-7.342,2.719],[-7.333,2.793],[-7.321,2.861],[-7.305,2.922],[-7.287,2.982],[-7.277,3.055],[-7.266,3.129],[-7.258,3.196],[-7.252,3.251],[-7.235,3.304],[-7.203,3.355],[-7.175,3.404],[-7.166,3.448],[-7.154,3.492],[-7.133,3.533],[-7.109,3.574],[-7.086,3.617],[-7.064,3.659],[-7.045,3.697],[-7.024,3.74],[-7.0,3.784],[-6.982,3.825],[-6.971,3.86],[-6.959,3.889],[-6.944,3.916],[-6.929,3.941],[-6.916,3.96],[-6.902,3.975],[-6.89,3.989],[-6.882,4.001],[-6.874,4.011],[-6.864,4.022],[-6.855,4.033],[-6.846,4.041],[-6.837,4.049],[-6.826,4.059],[-6.814,4.07],[-6.797,4.082],[-6.782,4.09],[-6.769,4.095],[-6.755,4.099],[-6.742,4.105],[-6.728,4.112],[-6.714,4.119],[-6.701,4.125],[-6.689,4.131],[-6.677,4.136],[-6.666,4.141],[-6.656,4.145],[-6.647,4.147],[-6.64,4.148],[-6.637,4.147],[-6.636,4.147],[-6.635,4.145],[-6.635,4.141],[-6.636,4.138],[-6.635,4.137],[-6.635,4.137]],"rootWm":[[-7.413,0.899],[-7.414,1.026],[-7.417,1.15],[-7.425,1.271],[-7.438,1.392],[-7.442,1.49],[-7.439,1.59],[-7.428,1.705],[-7.417,1.826],[-7.41,1.939],[-7.402,2.044],[-7.389,2.142],[-7.38,2.236],[-7.373,2.328],[-7.365,2.416],[-7.356,2.5],[-7.344,2.581],[-7.327,2.669],[-7.306,2.754],[-7.284,2.818],[-7.26,2.89],[-7.234,2.965],[-7.211,3.041],[-7.195,3.122],[-7.18,3.202],[-7.165,3.269],[-7.149,3.325],[-7.127,3.377],[-7.094,3.428],[-7.065,3.481],[-7.049,3.524],[-7.031,3.567],[-7.007,3.615],[-6.981,3.668],[-6.95,3.722],[-6.917,3.778],[-6.892,3.823],[-6.866,3.869],[-6.838,3.916],[-6.813,3.959],[-6.796,3.999],[-6.78,4.031],[-6.762,4.06],[-6.744,4.087],[-6.727,4.11],[-6.71,4.128],[-6.695,4.144],[-6.68,4.159],[-6.669,4.172],[-6.659,4.185],[-6.648,4.199],[-6.638,4.209],[-6.628,4.219],[-6.617,4.232],[-6.604,4.246],[-6.588,4.262],[-6.576,4.27],[-6.564,4.272],[-6.552,4.276],[-6.54,4.282],[-6.529,4.29],[-6.518,4.298],[-6.507,4.305],[-6.497,4.31],[-6.488,4.314],[-6.479,4.318],[-6.47,4.322],[-6.462,4.324],[-6.456,4.324],[-6.454,4.322],[-6.454,4.32],[-6.454,4.318],[-6.455,4.313],[-6.455,4.31],[-6.455,4.308],[-6.454,4.308]],"endRootErr":0.249,"maxHeightGap":0.042,"meanJoint":0.042,"slideSim":2.82,"slideWm":2.86,"slideCtrl":0.99,"travelSim":3.33,"travelWm":3.54,"travelCtrl":2.83,"rootCtrl":[[-7.413,0.899],[-7.414,1.024],[-7.416,1.149],[-7.423,1.273],[-7.433,1.394],[-7.436,1.494],[-7.433,1.594],[-7.425,1.704],[-7.408,1.815],[-7.386,1.925],[-7.359,2.032],[-7.326,2.133],[-7.301,2.222],[-7.277,2.307],[-7.255,2.391],[-7.234,2.477],[-7.213,2.564],[-7.189,2.655],[-7.161,2.745],[-7.135,2.819],[-7.109,2.876],[-7.08,2.929],[-7.044,2.975],[-7.002,3.016],[-6.956,3.052],[-6.905,3.085],[-6.847,3.114],[-6.792,3.14],[-6.746,3.16],[-6.704,3.178],[-6.667,3.193],[-6.634,3.207],[-6.604,3.221],[-6.573,3.237],[-6.541,3.254],[-6.508,3.272],[-6.473,3.29],[-6.439,3.303],[-6.414,3.311],[-6.393,3.318],[-6.373,3.323],[-6.356,3.327],[-6.34,3.328],[-6.325,3.327],[-6.311,3.323],[-6.298,3.317],[-6.284,3.309],[-6.274,3.303],[-6.267,3.298],[-6.261,3.295],[-6.253,3.293],[-6.245,3.292],[-6.236,3.292],[-6.226,3.293],[-6.215,3.295],[-6.203,3.298],[-6.188,3.303],[-6.171,3.309],[-6.155,3.315],[-6.14,3.323],[-6.127,3.333],[-6.115,3.341],[-6.103,3.349],[-6.092,3.357],[-6.081,3.365],[-6.071,3.372],[-6.062,3.378],[-6.054,3.383],[-6.049,3.386],[-6.047,3.386],[-6.049,3.385],[-6.05,3.384],[-6.053,3.382],[-6.056,3.379],[-6.058,3.378],[-6.059,3.379]]},"eval":{"n":40,"mean":0.8277,"framew":0.8304,"failed":0,"clips":[["dance1_subject1",0.827,6574],["dance1_subject2",0.7921,6574],["dance1_subject3",0.8734,6574],["dance2_subject1",0.8097,11284],["dance2_subject2",0.7993,11284],["dance2_subject3",0.8653,11284],["dance2_subject4",0.8144,11284],["dance2_subject5",0.8392,11284],["fallAndGetUp1_subject1",0.7755,8411],["fallAndGetUp1_subject4",0.7691,8411],["fallAndGetUp1_subject5",0.7388,8411],["fallAndGetUp2_subject2",0.7696,8196],["fallAndGetUp2_subject3",0.7591,8196],["fallAndGetUp3_subject1",0.8081,5109],["fight1_subject2",0.8142,12244],["fight1_subject3",0.8201,12244],["fight1_subject5",0.837,12244],["fightAndSports1_subject1",0.8045,12257],["fightAndSports1_subject4",0.8359,12257],["jumps1_subject1",0.8256,12222],["jumps1_subject2",0.8063,12222],["jumps1_subject5",0.805,12222],["run1_subject2",0.8443,11891],["run1_subject5",0.7932,11891],["run2_subject1",0.8147,12241],["run2_subject4",0.8003,12241],["sprint1_subject2",0.8347,13656],["sprint1_subject4",0.8141,13656],["walk1_subject1",0.8817,13066],["walk1_subject2",0.8685,13066],["walk1_subject5",0.873,13066],["walk2_subject1",0.8579,11909],["walk2_subject3",0.8854,11909],["walk2_subject4",0.8655,11909],["walk3_subject1",0.8653,12331],["walk3_subject2",0.9047,12331],["walk3_subject3",0.7865,12331],["walk3_subject4",0.8673,12331],["walk3_subject5",0.8628,12331],["walk4_subject1",0.9006,8196]]},"err8":{"dance2_subject1":{"perK":[0.0153,0.0229,0.0291,0.0369,0.0412,0.0475,0.0552,0.0645],"rootMm":2.94,"jointMrad":5.82},"jumps1_subject1":{"perK":[0.0288,0.0318,0.035,0.0401,0.0488,0.0494,0.0541,0.0623],"rootMm":2.36,"jointMrad":5.31},"fallAndGetUp1_subject1":{"perK":[0.0626,0.1075,0.1488,0.1802,0.2297,0.2852,0.3371,0.369],"rootMm":5.7,"jointMrad":10.9},"sprint1_subject2":{"perK":[0.0222,0.027,0.03,0.0305,0.039,0.045,0.05,0.0519],"rootMm":2.43,"jointMrad":4.74},"walk1_subject1":{"perK":[0.0034,0.0053,0.0072,0.0087,0.0106,0.0127,0.0146,0.0171],"rootMm":1.6,"jointMrad":3.25}},"grad":{"clip":"sprint1_subject2","f0":500,"H":32,"sigma":0.1,"rows":[[1,0.981,0.969,0.016,-0.344,0.217],[4,0.995,0.993,0.257,-0.038,0.477],[16,0.999,0.998,0.267,-0.037,0.43],[64,1.0,0.999,0.536,0.325,0.647],[256,1.0,1.0,0.754,0.55,0.872],[1024,1.0,1.0,0.922,0.889,0.948]]}};
  /* 论文的曲线（arXiv 2610.28480 的 LaTeX 里 pgfplots 的坐标，图 5b 来自源文件里的 CSV、按对数横轴每 0.04 个数量级取一点） */
  var PAPER = {"fig3a_1":[[0.061,0.7034],[0.091,0.7573],[0.12,0.8042],[0.149,0.8269],[0.208,0.8495],[0.237,0.8572],[0.326,0.8665],[0.384,0.8821],[0.502,0.897],[0.619,0.9074],[0.795,0.9152],[1.001,0.9246],[1.264,0.9308],[1.586,0.9319],[1.995,0.9344],[2.521,0.9426],[3.164,0.9363],[3.982,0.9502],[5.006,0.9499],[6.322,0.9598],[7.932,0.9616],[9.368,0.96]],"fig3a_2":[[0.066,0.6344],[0.128,0.7401],[0.189,0.8191],[0.25,0.8443],[0.372,0.8616],[0.495,0.8821],[0.617,0.8933],[0.74,0.9063],[0.985,0.9123],[1.23,0.9223],[1.598,0.9287],[1.965,0.9349],[2.454,0.9359],[3.188,0.9436],[3.921,0.9457],[5.022,0.9447],[6.367,0.9492],[7.956,0.9564],[10.036,0.9602],[12.606,0.9612],[15.788,0.9636],[19.584,0.9641]],"fig3b":[[1.0,0.539],[7.0,1.35],[40.0,1.908],[264.0,1.892]],"fig3c":[[1,0.00679],[7,0.00738],[40,0.01096],[264,0.00993]],"fig4a_ppo1":[[0.00236111,0.001764],[0.24,0.025203],[0.479583,0.21044],[0.720972,0.2256],[0.960417,0.2352],[1.19861,0.2651],[1.43987,0.3023],[1.67875,0.3301],[1.91973,0.3662],[2.16125,0.3731],[2.40778,0.4068],[2.65042,0.4044],[2.88959,0.3948],[3.1318,0.43],[3.37181,0.4195],[3.61264,0.449],[3.85361,0.4474],[4.09305,0.4878],[4.32972,0.4612],[4.57042,0.4728],[4.81069,0.4795],[5.0457,0.4707],[5.28334,0.534],[5.52069,0.5233],[5.75889,0.4984],[5.99695,0.5348],[7.18611,0.5412],[8.38444,0.5449],[9.62625,0.5499],[11.9934,0.5881],[14.0222,0.6166],[18.6919,0.602]],"fig4a_ppo4":[[0.00180555,0.00181],[0.184722,0.3262],[0.365278,0.3488],[0.542777,0.3788],[0.721389,0.4025],[0.900417,0.4404],[1.08069,0.4702],[1.25958,0.4685],[1.43903,0.4776],[1.61959,0.5071],[1.7975,0.5015],[1.97611,0.5406],[2.15487,0.5471],[2.33319,0.5577],[2.51125,0.5544],[2.68931,0.5685],[2.86806,0.5803],[3.04625,0.5556],[3.22445,0.6101],[3.40278,0.5919],[3.58125,0.5994],[3.75931,0.619],[3.93736,0.599],[4.11569,0.6122],[4.29402,0.6056],[4.47208,0.6221],[5.35902,0.6353],[6.24459,0.64],[7.12736,0.64],[8.89098,0.6677],[10.646,0.6828],[14.1303,0.6865],[17.7414,0.7028]],"fig4a_ppo8":[[0.00138889,0.001772],[0.19125,0.3744],[0.377223,0.3994],[0.563195,0.388],[0.748611,0.4448],[0.934584,0.4885],[1.12069,0.5124],[1.30653,0.5082],[1.49194,0.5438],[1.67639,0.554],[1.86055,0.5414],[2.04486,0.5543],[2.22903,0.5772],[2.41305,0.5883],[2.59667,0.5909],[2.78097,0.603],[2.96445,0.6032],[3.14792,0.605],[3.33125,0.6189],[3.51472,0.6225],[3.69819,0.6107],[3.88138,0.6108],[4.06458,0.621],[4.24833,0.6094],[4.43153,0.6318],[4.61486,0.6354],[5.53014,0.6449],[6.445,0.6744],[7.36055,0.6688],[9.19111,0.6944],[11.0203,0.7018],[14.4397,0.7188],[18.0328,0.7218]],"fig4a_sm":[[0.0021125,0.001519],[0.077808,0.524],[0.151899,0.6166],[0.225991,0.6672],[0.299996,0.67],[0.373919,0.696],[0.44801,0.7656],[0.522101,0.7565],[0.596276,0.777],[0.670791,0.779],[0.745049,0.7909],[0.894413,0.7894],[1.04353,0.8102],[1.19272,0.8331],[1.342,0.8309],[1.49103,0.8483],[1.79009,0.8282],[2.08984,0.8519],[2.38983,0.8509],[2.69008,0.8616],[2.98771,0.8661]],"fig4b_nocritic":[[8,0.087],[16,0.25],[32,0.84],[64,0.862],[128,0.835]],"fig4b_critic":[[8,0.392],[16,0.843],[32,0.866],[64,0.863],[128,0.823]],"fig4c_nocritic":[[32,1.37],[64,1.34],[128,3.8]],"fig4c_critic":[[16,1.19],[32,0.88],[64,1.7],[128,4.62]],"fig5a_wm":[[512,216000.0],[1024,422000.0],[2048,843000.0],[4096,1680000.0],[8192,3350000.0],[16384,6710000.0],[32768,13400000.0],[65536,20000000.0]],"fig5a_mjw":[[512,23300.0],[1024,44000.0],[2048,78400.0],[4096,132000.0],[8192,197000.0],[16384,261000.0],[32768,305000.0],[65536,322000.0]],"fig5b_sm":[[6.021,0.0136],[6.197,0.0245],[6.322,0.0239],[6.419,0.0237],[6.498,0.022],[6.565,0.0192],[6.623,0.0246],[6.674,0.0199],[6.72,0.019],[6.761,0.0193],[6.834,0.0202],[6.896,0.0218],[6.95,0.0236],[6.998,0.0231],[7.042,0.0239],[7.1,0.0253],[7.151,0.0249],[7.197,0.0252],[7.238,0.0256],[7.288,0.0273],[7.332,0.0256],[7.373,0.0235],[7.419,0.0299],[7.468,0.04],[7.519,0.0377],[7.565,0.047],[7.606,0.153],[7.654,0.3077],[7.706,0.3684],[7.753,0.3336],[7.802,0.3207],[7.853,0.4459],[7.904,0.5225],[7.953,0.5138],[8.003,0.5821],[8.054,0.6026],[8.103,0.6223],[8.154,0.6699],[8.204,0.6711],[8.254,0.6734],[8.304,0.7012],[8.353,0.7237],[8.404,0.7421],[8.454,0.766],[8.503,0.7692],[8.553,0.785],[8.603,0.8034],[8.654,0.8053],[8.704,0.8104],[8.753,0.8198],[8.804,0.8276],[8.854,0.8299],[8.904,0.8353],[8.954,0.8401],[9.004,0.8425],[9.054,0.8445],[9.104,0.8482],[9.154,0.8526],[9.204,0.8536],[9.254,0.8552],[9.304,0.858],[9.354,0.8605],[9.404,0.8635],[9.454,0.8672],[9.504,0.8704],[9.554,0.8727],[9.604,0.8754],[9.655,0.8779],[9.705,0.8795],[9.742,0.8803]],"fig5b_p4k32":[[6.021,-0.0431],[6.072,-0.0428],[6.118,-0.0426],[6.159,-0.0415],[6.231,-0.0386],[6.294,-0.0338],[6.348,-0.0299],[6.396,-0.0281],[6.44,-0.0255],[6.498,-0.0228],[6.549,-0.0205],[6.595,-0.0181],[6.636,-0.0153],[6.686,-0.0125],[6.73,-0.0097],[6.78,-0.0075],[6.834,-0.0047],[6.888,-0.0021],[6.93,-0.0006],[6.975,0.0013],[7.015,0.003],[7.057,0.0046],[7.1,0.0063],[7.143,0.0079],[7.186,0.0094],[7.228,0.011],[7.273,0.0128],[7.313,0.0147],[7.358,0.0167],[7.401,0.0184],[7.444,0.0203],[7.485,0.0219],[7.529,0.0235],[7.571,0.0256],[7.614,0.0281],[7.657,0.0304],[7.7,0.0326],[7.742,0.0352],[7.785,0.0384],[7.828,0.0423],[7.87,0.0473],[7.913,0.0532],[7.956,0.0633],[7.999,0.0884],[8.042,0.1292],[8.085,0.1775],[8.127,0.2196],[8.17,0.2522],[8.213,0.2528],[8.256,0.2477],[8.298,0.2518],[8.341,0.2775],[8.384,0.3429],[8.427,0.4151],[8.47,0.4582],[8.513,0.4568],[8.555,0.4634],[8.598,0.4866],[8.641,0.5047],[8.684,0.5156],[8.727,0.5265],[8.77,0.5336],[8.812,0.5404],[8.855,0.5522],[8.898,0.5627],[8.941,0.5722],[8.984,0.5872],[9.027,0.5959],[9.069,0.6012],[9.112,0.6087],[9.155,0.6166],[9.198,0.6281],[9.241,0.6385],[9.283,0.6484],[9.326,0.6544],[9.369,0.6608],[9.412,0.6635],[9.455,0.6665],[9.498,0.6824],[9.54,0.6908],[9.583,0.6953],[9.626,0.6963],[9.669,0.6977],[9.712,0.6957],[9.755,0.7057],[9.797,0.7173],[9.84,0.7157],[9.883,0.7135],[9.926,0.7175],[9.969,0.7288],[10.012,0.7341],[10.054,0.7398],[10.097,0.7451],[10.14,0.7523],[10.183,0.7545],[10.226,0.7582],[10.268,0.7615]],"fig5b_p8k24":[[6.072,-0.0455],[6.139,-0.0431],[6.197,-0.0445],[6.248,-0.0402],[6.294,-0.0386],[6.335,-0.0362],[6.408,-0.0331],[6.47,-0.0308],[6.524,-0.0277],[6.572,-0.025],[6.616,-0.0226],[6.674,-0.0194],[6.725,-0.0153],[6.771,-0.0129],[6.812,-0.0099],[6.862,-0.0074],[6.917,-0.004],[6.966,-0.0014],[7.01,0.0009],[7.064,0.0033],[7.12,0.0063],[7.169,0.0086],[7.213,0.0106],[7.267,0.0128],[7.323,0.0154],[7.376,0.0178],[7.417,0.0195],[7.458,0.0211],[7.5,0.0226],[7.542,0.0241],[7.595,0.0265],[7.636,0.0282],[7.677,0.03],[7.718,0.0317],[7.76,0.0345],[7.801,0.0373],[7.843,0.0412],[7.884,0.0474],[7.925,0.0575],[7.967,0.0723],[8.007,0.0999],[8.049,0.1376],[8.09,0.1713],[8.131,0.2009],[8.172,0.2292],[8.214,0.2449],[8.255,0.2604],[8.296,0.2693],[8.337,0.2741],[8.378,0.2817],[8.42,0.3355],[8.461,0.4226],[8.502,0.4781],[8.543,0.4826],[8.585,0.4795],[8.626,0.4943],[8.667,0.5124],[8.708,0.5177],[8.749,0.5275],[8.791,0.5438],[8.832,0.5588],[8.873,0.5726],[8.914,0.5811],[8.956,0.5947],[8.997,0.6035],[9.038,0.6128],[9.079,0.6214],[9.121,0.6272],[9.162,0.6302],[9.203,0.6368],[9.244,0.6509],[9.285,0.6636],[9.327,0.6746],[9.368,0.6837],[9.409,0.6852],[9.45,0.6849],[9.492,0.6926],[9.533,0.7044],[9.574,0.7107],[9.615,0.7145],[9.657,0.7174],[9.698,0.7248],[9.739,0.7282],[9.78,0.7308],[9.822,0.7387],[9.863,0.7455],[9.904,0.745],[9.945,0.7427],[9.987,0.749],[10.028,0.7565],[10.069,0.7615],[10.11,0.7635]],"fig5b_p8k32":[[6.021,-0.0455],[6.118,-0.0451],[6.197,-0.0464],[6.264,-0.0462],[6.322,-0.0433],[6.373,-0.0407],[6.419,-0.0398],[6.46,-0.0388],[6.532,-0.0346],[6.595,-0.0317],[6.649,-0.0283],[6.697,-0.0258],[6.741,-0.0224],[6.799,-0.0185],[6.85,-0.0143],[6.896,-0.0121],[6.937,-0.0095],[6.987,-0.0069],[7.031,-0.0043],[7.072,-0.0022],[7.118,0.0],[7.159,0.0019],[7.211,0.004],[7.251,0.006],[7.294,0.008],[7.338,0.01],[7.392,0.0122],[7.436,0.0137],[7.49,0.016],[7.532,0.018],[7.574,0.02],[7.614,0.0215],[7.657,0.023],[7.7,0.0247],[7.741,0.0266],[7.784,0.0286],[7.825,0.0302],[7.867,0.0329],[7.91,0.0352],[7.951,0.0394],[7.994,0.0439],[8.036,0.0502],[8.078,0.0574],[8.12,0.0712],[8.162,0.0958],[8.205,0.1356],[8.247,0.1786],[8.288,0.2237],[8.331,0.2587],[8.373,0.2706],[8.415,0.2746],[8.457,0.2676],[8.499,0.2659],[8.541,0.2916],[8.583,0.3701],[8.625,0.4587],[8.667,0.5063],[8.709,0.5069],[8.751,0.5003],[8.794,0.512],[8.836,0.5314],[8.878,0.5452],[8.92,0.5668],[8.962,0.5804],[9.004,0.584],[9.046,0.5914],[9.088,0.6021],[9.13,0.6134],[9.173,0.6241],[9.215,0.641],[9.257,0.648],[9.299,0.6553],[9.341,0.662],[9.383,0.6692],[9.425,0.673],[9.467,0.6769],[9.509,0.6816],[9.552,0.6916],[9.594,0.6954],[9.636,0.7012],[9.678,0.7089],[9.72,0.7124],[9.762,0.718],[9.804,0.7277],[9.846,0.7374],[9.888,0.7433],[9.931,0.7426],[9.973,0.7436],[10.015,0.7532],[10.057,0.759],[10.099,0.7607],[10.141,0.7645],[10.183,0.7679],[10.197,0.7691]],"fig5b_p16k32":[[6.021,-0.0471],[6.197,-0.0511],[6.322,-0.0457],[6.419,-0.0442],[6.498,-0.045],[6.565,-0.0457],[6.623,-0.0422],[6.674,-0.0428],[6.72,-0.042],[6.761,-0.0405],[6.834,-0.0371],[6.896,-0.0317],[6.95,-0.0279],[6.998,-0.0254],[7.042,-0.0218],[7.1,-0.0175],[7.151,-0.0132],[7.197,-0.0108],[7.238,-0.0076],[7.288,-0.0047],[7.332,-0.0016],[7.382,0.0009],[7.427,0.0035],[7.475,0.0057],[7.526,0.0082],[7.571,0.0101],[7.623,0.0126],[7.669,0.0151],[7.715,0.0173],[7.765,0.0193],[7.813,0.0213],[7.859,0.0232],[7.907,0.0249],[7.955,0.0266],[8.003,0.0297],[8.052,0.0319],[8.1,0.0335],[8.148,0.037],[8.195,0.0422],[8.243,0.0476],[8.291,0.0576],[8.339,0.0689],[8.387,0.091],[8.435,0.1304],[8.483,0.177],[8.531,0.2205],[8.579,0.2629],[8.627,0.2916],[8.675,0.3083],[8.723,0.3198],[8.771,0.3346],[8.819,0.4077],[8.867,0.5068],[8.915,0.5472],[8.963,0.554],[9.011,0.557],[9.059,0.5598],[9.107,0.5718],[9.155,0.5922],[9.203,0.6051],[9.251,0.6145],[9.299,0.6231],[9.348,0.6284],[9.396,0.6349],[9.444,0.6563],[9.492,0.6648],[9.54,0.6634],[9.588,0.6761],[9.636,0.6883],[9.684,0.6984],[9.732,0.704],[9.78,0.7099],[9.828,0.7194],[9.876,0.7293],[9.924,0.7395],[9.972,0.7482],[10.02,0.7599],[10.068,0.7634],[10.116,0.7696],[10.164,0.7782],[10.212,0.7803],[10.26,0.7873],[10.309,0.7909],[10.357,0.7949],[10.405,0.8025],[10.453,0.8078],[10.501,0.8135],[10.549,0.8199],[10.597,0.8249],[10.645,0.8255],[10.693,0.8303],[10.741,0.8372],[10.789,0.8388]],"figA1_1":[[0.12,1554.0],[0.24,646.0],[0.36,455.0],[0.47,393.0],[0.59,216.0],[0.71,172.0],[0.82,159.0],[0.94,148.0],[1.06,105.0],[1.18,88.0],[1.29,103.0],[1.41,83.0],[1.53,61.0],[1.64,89.0],[1.76,75.0],[1.88,49.0],[2.0,49.0],[2.11,48.0],[2.23,47.0],[2.35,68.0],[2.46,30.0],[2.58,37.0],[2.7,28.0],[2.81,28.0],[2.93,27.0],[3.05,31.0],[3.16,30.0],[3.28,24.0],[3.4,24.0],[3.51,16.0],[3.63,18.0],[3.75,28.0],[3.87,21.0],[3.98,23.0],[4.1,18.0],[4.22,14.0],[4.33,14.0],[4.45,12.0],[4.57,15.0],[4.68,22.0],[4.8,14.0],[4.92,9.0],[5.04,13.0],[5.15,10.0],[5.27,7.0],[5.39,8.0],[5.5,6.0],[5.62,13.0],[5.74,7.0],[5.85,9.0],[5.97,8.0],[6.09,5.0],[6.21,9.0],[6.32,9.0],[6.44,9.0],[6.56,9.0],[6.67,9.0],[6.79,11.0],[6.91,6.0],[7.02,9.0],[7.14,7.0],[7.26,8.0],[7.38,7.0],[7.49,2.0],[7.61,5.0],[7.73,8.0],[7.84,7.0],[7.96,8.0],[8.08,4.0],[8.2,4.0],[8.31,8.0],[8.43,4.0],[8.55,4.0],[8.66,5.0],[8.78,5.0],[8.9,5.0],[9.02,3.0],[9.13,7.0],[9.25,3.0],[9.37,6.0]],"figA1_2":[[0.13,899.0],[0.25,273.0],[0.37,143.0],[0.49,162.0],[0.61,93.0],[0.74,84.0],[0.86,55.0],[0.98,74.0],[1.1,46.0],[1.23,55.0],[1.35,45.0],[1.47,48.0],[1.59,59.0],[1.72,51.0],[1.84,42.0],[1.96,42.0],[2.08,25.0],[2.21,28.0],[2.33,25.0],[2.45,26.0],[2.57,33.0],[2.69,29.0],[2.82,28.0],[2.94,21.0],[3.06,18.0],[3.18,16.0],[3.31,14.0],[3.43,11.0],[3.55,14.0],[3.67,14.0],[3.79,8.0],[3.92,8.0],[4.04,8.0],[4.16,5.0],[4.28,6.0],[4.41,8.0],[4.53,5.0],[4.65,2.0],[4.77,4.0],[4.9,3.0],[5.02,6.0],[5.14,2.0],[5.26,4.0],[5.39,1.0],[5.51,2.0],[5.63,2.0],[5.75,1.0],[5.87,4.0],[6.0,1.0],[6.12,0.0],[6.24,0.0],[6.36,1.0],[6.49,0.0],[6.61,0.0],[6.73,0.0],[6.85,0.0],[6.98,0.0],[7.1,0.0],[7.22,0.0],[7.34,0.0],[7.47,0.0],[7.59,1.0],[7.71,0.0],[7.83,0.0],[7.96,0.0],[8.08,1.0],[8.2,0.0],[8.32,0.0],[8.45,0.0],[8.57,0.0],[8.69,0.0],[8.81,0.0],[8.93,0.0],[9.06,0.0],[9.18,0.0],[9.3,0.0],[9.42,0.0],[9.55,0.0],[9.67,0.0],[9.79,0.0]]};
  /* 图 7 的 672 个阶跃响应（源文件 stepgrid_rings_*.csv）：[命令 1, 命令 2, 两者里较大的相对稳态误差, 较小的, RL 更好 = 1, 蒸馏摔倒 = 1] */
  var FIG7 = {"vx_vy":[[-1.5,1.32,0.841,0.363,1,0],[-1.25,1.32,0.724,0.364,1,0],[-1.0,1.32,0.777,0.36,1,0],[-0.75,1.32,0.666,0.24,1,0],[-0.5,1.32,0.466,0.2,1,0],[-0.25,1.32,0.547,0.268,1,0],[0.0,1.32,0.403,0.191,1,0],[0.25,1.32,0.472,0.172,1,0],[0.5,1.32,0.654,0.096,1,0],[0.75,1.32,0.664,0.301,1,0],[1.0,1.32,0.663,0.296,1,0],[1.25,1.32,0.351,0.126,1,0],[1.5,1.32,0.34,0.149,1,0],[1.75,1.32,0.443,0.274,1,0],[2.0,1.32,0.491,0.306,0,0],[-1.5,1.1314,0.796,0.296,1,0],[-1.25,1.1314,0.95,0.353,1,0],[-1.0,1.1314,0.956,0.339,1,0],[-0.75,1.1314,0.702,0.402,1,0],[-0.5,1.1314,0.604,0.348,1,0],[-0.25,1.1314,0.324,0.12,1,0],[0.0,1.1314,0.381,0.208,1,0],[0.25,1.1314,0.517,0.187,1,0],[0.5,1.1314,0.544,0.129,1,0],[0.75,1.1314,0.871,0.079,1,0],[1.0,1.1314,0.458,0.101,1,0],[1.25,1.1314,0.457,0.42,0,0],[1.5,1.1314,0.243,0.141,1,0],[1.75,1.1314,0.259,0.147,1,0],[2.0,1.1314,0.446,0.337,1,0],[-1.5,0.9429,0.764,0.356,1,0],[-1.25,0.9429,0.609,0.189,1,0],[-1.0,0.9429,0.899,0.276,1,0],[-0.75,0.9429,0.803,0.469,1,0],[-0.5,0.9429,0.627,0.31,1,0],[-0.25,0.9429,0.563,0.296,1,0],[0.0,0.9429,0.402,0.15,1,0],[0.25,0.9429,0.612,0.216,1,0],[0.5,0.9429,0.857,0.198,1,0],[0.75,0.9429,0.521,0.15,1,0],[1.0,0.9429,0.419,0.067,1,0],[1.25,0.9429,0.577,0.312,1,0],[1.5,0.9429,0.453,0.24,1,0],[1.75,0.9429,0.59,0.344,1,0],[2.0,0.9429,0.429,0.327,1,0],[-1.5,0.7543,0.72,0.278,1,0],[-1.25,0.7543,0.702,0.163,1,0],[-1.0,0.7543,0.693,0.126,1,0],[-0.75,0.7543,0.801,0.261,1,0],[-0.5,0.7543,0.597,0.09,1,0],[-0.25,0.7543,0.463,0.123,1,0],[0.0,0.7543,0.51,0.198,1,0],[0.25,0.7543,0.601,0.213,1,0],[0.5,0.7543,0.737,0.133,1,0],[0.75,0.7543,0.742,0.209,1,0],[1.0,0.7543,0.441,0.156,1,0],[1.25,0.7543,0.546,0.211,1,0],[1.5,0.7543,0.44,0.301,1,0],[1.75,0.7543,0.419,0.134,1,0],[2.0,0.7543,0.424,0.101,1,0],[-1.5,0.5657,0.558,0.389,1,0],[-1.25,0.5657,0.424,0.211,1,0],[-1.0,0.5657,0.691,0.126,1,0],[-0.75,0.5657,0.672,0.192,1,0],[-0.5,0.5657,0.461,0.101,1,0],[-0.25,0.5657,0.661,0.412,1,0],[0.0,0.5657,0.561,0.386,1,0],[0.25,0.5657,0.758,0.347,1,0],[0.5,0.5657,0.614,0.126,1,0],[0.75,0.5657,0.394,0.206,1,0],[1.0,0.5657,0.51,0.078,1,0],[1.25,0.5657,0.482,0.05,1,0],[1.5,0.5657,0.938,0.051,1,0],[1.75,0.5657,0.659,0.209,1,0],[2.0,0.5657,0.79,0.033,1,0],[-1.5,0.3771,0.323,0.18,1,0],[-1.25,0.3771,0.351,0.192,1,0],[-1.0,0.3771,0.542,0.254,1,0],[-0.75,0.3771,0.629,0.164,1,0],[-0.5,0.3771,0.559,0.091,1,0],[-0.25,0.3771,0.637,0.176,1,0],[0.0,0.3771,0.654,0.388,1,0],[0.25,0.3771,0.256,0.131,1,0],[0.5,0.3771,0.48,0.358,1,0],[0.75,0.3771,0.692,0.078,1,0],[1.0,0.3771,0.483,0.257,1,0],[1.25,0.3771,0.512,0.024,1,0],[1.5,0.3771,0.448,0.118,1,0],[1.75,0.3771,0.688,0.231,1,0],[2.0,0.3771,0.828,0.086,1,0],[-1.5,0.1886,0.246,0.224,1,0],[-1.25,0.1886,0.234,0.16,1,0],[-1.0,0.1886,0.331,0.196,1,0],[-0.75,0.1886,0.501,0.063,1,0],[-0.5,0.1886,0.531,0.32,1,0],[-0.25,0.1886,0.664,0.207,1,0],[0.0,0.1886,0.723,0.411,1,0],[0.25,0.1886,0.353,0.217,1,0],[0.5,0.1886,0.418,0.294,1,0],[0.75,0.1886,0.586,0.059,1,0],[1.0,0.1886,0.55,0.096,1,0],[1.25,0.1886,0.466,0.057,1,0],[1.5,0.1886,0.539,0.268,1,0],[1.75,0.1886,0.254,0.041,1,0],[2.0,0.1886,0.292,0.06,1,0],[-1.5,0.0,0.237,0.19,1,0],[-1.25,0.0,0.252,0.223,0,0],[-1.0,0.0,0.562,0.549,1,0],[-0.75,0.0,0.334,0.154,1,0],[-0.5,0.0,0.266,0.122,1,0],[-0.25,0.0,0.536,0.271,1,0],[0.25,0.0,0.629,0.464,0,0],[0.5,0.0,0.419,0.114,1,0],[0.75,0.0,0.592,0.059,1,0],[1.0,0.0,0.279,0.091,1,0],[1.25,0.0,0.198,0.1,1,0],[1.5,0.0,0.126,0.043,1,0],[1.75,0.0,0.261,0.224,1,0],[2.0,0.0,0.229,0.146,1,0],[-1.5,-0.1886,0.364,0.311,0,0],[-1.25,-0.1886,0.169,0.144,1,0],[-1.0,-0.1886,0.288,0.286,0,0],[-0.75,-0.1886,0.304,0.158,1,0],[-0.5,-0.1886,0.369,0.302,1,0],[-0.25,-0.1886,0.486,0.372,1,0],[0.0,-0.1886,0.741,0.694,0,0],[0.25,-0.1886,0.677,0.574,1,0],[0.5,-0.1886,0.622,0.151,1,0],[0.75,-0.1886,0.604,0.186,1,0],[1.0,-0.1886,0.544,0.346,1,0],[1.25,-0.1886,0.399,0.113,1,0],[1.5,-0.1886,0.631,0.323,1,0],[1.75,-0.1886,0.521,0.274,1,0],[2.0,-0.1886,0.593,0.072,1,0],[-1.5,-0.3771,0.222,0.191,1,0],[-1.25,-0.3771,0.409,0.15,1,0],[-1.0,-0.3771,0.357,0.296,1,0],[-0.75,-0.3771,0.292,0.201,1,0],[-0.5,-0.3771,0.283,0.201,1,0],[-0.25,-0.3771,0.381,0.258,1,0],[0.0,-0.3771,0.599,0.258,1,0],[0.25,-0.3771,0.656,0.399,1,0],[0.5,-0.3771,0.536,0.207,1,0],[0.75,-0.3771,0.657,0.233,1,0],[1.0,-0.3771,0.491,0.151,1,0],[1.25,-0.3771,0.906,0.097,1,0],[1.5,-0.3771,0.572,0.097,1,0],[1.75,-0.3771,0.538,0.201,1,0],[2.0,-0.3771,0.573,0.261,1,0],[-1.5,-0.5657,0.304,0.129,1,0],[-1.25,-0.5657,0.317,0.177,1,0],[-1.0,-0.5657,0.343,0.221,1,0],[-0.75,-0.5657,0.263,0.178,1,0],[-0.5,-0.5657,0.532,0.444,1,0],[-0.25,-0.5657,0.318,0.181,1,0],[0.0,-0.5657,0.377,0.351,1,0],[0.25,-0.5657,0.418,0.273,1,0],[0.5,-0.5657,0.532,0.272,1,0],[0.75,-0.5657,0.632,0.202,1,0],[1.0,-0.5657,0.6,0.139,1,0],[1.25,-0.5657,0.96,0.093,1,0],[1.5,-0.5657,0.956,0.122,1,0],[1.75,-0.5657,0.842,0.328,1,0],[2.0,-0.5657,0.601,0.149,1,0],[-1.5,-0.7543,0.392,0.209,1,0],[-1.25,-0.7543,0.399,0.29,1,0],[-1.0,-0.7543,0.294,0.196,1,0],[-0.75,-0.7543,0.5,0.439,0,0],[-0.5,-0.7543,0.387,0.158,1,0],[-0.25,-0.7543,0.27,0.202,1,0],[0.0,-0.7543,0.414,0.226,1,0],[0.25,-0.7543,0.54,0.253,1,0],[0.5,-0.7543,0.416,0.193,1,0],[0.75,-0.7543,0.701,0.112,1,0],[1.0,-0.7543,0.546,0.251,1,0],[1.25,-0.7543,0.667,0.16,1,0],[1.5,-0.7543,0.589,0.121,1,0],[1.75,-0.7543,0.598,0.237,1,0],[2.0,-0.7543,1.0,0.139,1,0],[-1.5,-0.9429,0.314,0.168,1,0],[-1.25,-0.9429,0.247,0.14,1,0],[-1.0,-0.9429,0.27,0.129,1,0],[-0.75,-0.9429,0.271,0.203,1,0],[-0.5,-0.9429,0.284,0.116,1,0],[-0.25,-0.9429,0.304,0.15,1,0],[0.0,-0.9429,0.599,0.314,1,0],[0.25,-0.9429,0.527,0.241,1,0],[0.5,-0.9429,0.354,0.209,1,0],[0.75,-0.9429,0.692,0.308,1,0],[1.0,-0.9429,0.567,0.263,1,0],[1.25,-0.9429,0.511,0.329,1,0],[1.5,-0.9429,0.43,0.129,1,0],[1.75,-0.9429,0.552,0.202,1,0],[2.0,-0.9429,0.402,0.38,0,0],[-1.5,-1.1314,0.622,0.413,1,0],[-1.25,-1.1314,0.556,0.493,1,0],[-1.0,-1.1314,0.5,0.372,1,0],[-0.75,-1.1314,0.386,0.376,0,0],[-0.5,-1.1314,0.403,0.307,1,0],[-0.25,-1.1314,0.292,0.192,1,0],[0.0,-1.1314,0.414,0.237,1,0],[0.25,-1.1314,0.486,0.083,1,0],[0.5,-1.1314,0.696,0.311,1,0],[0.75,-1.1314,0.564,0.186,1,0],[1.0,-1.1314,0.534,0.192,1,0],[1.25,-1.1314,0.686,0.288,1,0],[1.5,-1.1314,0.546,0.181,1,0],[1.75,-1.1314,0.473,0.214,1,0],[2.0,-1.1314,0.606,0.174,1,0],[-1.5,-1.32,0.506,0.307,1,0],[-1.25,-1.32,0.724,0.152,1,0],[-1.0,-1.32,0.488,0.128,1,0],[-0.75,-1.32,0.301,0.162,1,0],[-0.5,-1.32,0.396,0.332,1,0],[-0.25,-1.32,0.386,0.146,1,0],[0.0,-1.32,0.418,0.268,1,0],[0.25,-1.32,0.581,0.22,1,0],[0.5,-1.32,0.621,0.139,1,0],[0.75,-1.32,0.642,0.084,1,0],[1.0,-1.32,0.531,0.093,1,0],[1.25,-1.32,0.578,0.152,1,0],[1.5,-1.32,0.48,0.237,1,0],[1.75,-1.32,0.572,0.194,1,0],[2.0,-1.32,0.529,0.282,1,0]],"vx_wz":[[-1.5,3.35,0.684,0.321,1,0],[-1.25,3.35,0.676,0.228,1,0],[-1.0,3.35,0.749,0.193,1,0],[-0.75,3.35,0.509,0.132,1,0],[-0.5,3.35,0.323,0.103,1,0],[-0.25,3.35,0.258,0.077,1,0],[0.0,3.35,0.166,0.063,1,0],[0.25,3.35,0.167,0.08,1,0],[0.5,3.35,0.42,0.108,1,0],[0.75,3.35,0.342,0.126,1,0],[1.0,3.35,0.583,0.183,1,0],[1.25,3.35,0.629,0.236,1,0],[1.5,3.35,0.796,0.301,1,0],[1.75,3.35,0.657,0.373,1,0],[2.0,3.35,0.793,0.454,1,0],[-1.5,2.8714,0.663,0.388,1,0],[-1.25,2.8714,0.624,0.236,1,0],[-1.0,2.8714,1.0,0.179,1,1],[-0.75,2.8714,0.492,0.104,1,0],[-0.5,2.8714,0.424,0.061,1,0],[-0.25,2.8714,0.362,0.064,1,0],[0.0,2.8714,0.156,0.067,1,0],[0.25,2.8714,0.173,0.083,1,0],[0.5,2.8714,0.297,0.074,1,0],[0.75,2.8714,0.468,0.1,1,0],[1.0,2.8714,0.664,0.242,1,0],[1.25,2.8714,0.687,0.202,1,0],[1.5,2.8714,0.611,0.351,1,0],[1.75,2.8714,0.804,0.353,1,0],[2.0,2.8714,0.849,0.477,1,0],[-1.5,2.3929,0.674,0.358,1,0],[-1.25,2.3929,0.628,0.346,1,0],[-1.0,2.3929,0.661,0.139,1,0],[-0.75,2.3929,0.632,0.108,1,0],[-0.5,2.3929,0.384,0.108,1,0],[-0.25,2.3929,0.208,0.054,1,0],[0.0,2.3929,0.121,0.05,1,0],[0.25,2.3929,0.157,0.068,1,0],[0.5,2.3929,0.264,0.088,1,0],[0.75,2.3929,0.504,0.114,1,0],[1.0,2.3929,0.663,0.123,1,0],[1.25,2.3929,0.671,0.173,1,0],[1.5,2.3929,0.661,0.214,1,0],[1.75,2.3929,0.787,0.293,1,0],[2.0,2.3929,0.762,0.358,1,0],[-1.5,1.9143,0.664,0.289,1,0],[-1.25,1.9143,0.646,0.173,1,0],[-1.0,1.9143,0.593,0.213,1,0],[-0.75,1.9143,0.513,0.078,1,0],[-0.5,1.9143,0.407,0.113,1,0],[-0.25,1.9143,0.243,0.072,1,0],[0.0,1.9143,0.148,0.046,1,0],[0.25,1.9143,0.188,0.089,1,0],[0.5,1.9143,0.229,0.041,1,0],[0.75,1.9143,0.597,0.088,1,0],[1.0,1.9143,0.71,0.118,1,0],[1.25,1.9143,0.93,0.159,1,0],[1.5,1.9143,0.89,0.201,1,0],[1.75,1.9143,0.933,0.24,1,0],[2.0,1.9143,0.952,0.318,1,0],[-1.5,1.4357,0.816,0.258,1,0],[-1.25,1.4357,0.682,0.338,1,0],[-1.0,1.4357,0.658,0.133,1,0],[-0.75,1.4357,0.548,0.053,1,0],[-0.5,1.4357,0.447,0.046,1,0],[-0.25,1.4357,0.26,0.074,1,0],[0.0,1.4357,0.21,0.072,1,0],[0.25,1.4357,0.18,0.054,1,0],[0.5,1.4357,0.323,0.063,1,0],[0.75,1.4357,0.858,0.077,1,0],[1.0,1.4357,1.0,0.092,1,0],[1.25,1.4357,1.0,0.169,1,0],[1.5,1.4357,1.0,0.244,1,0],[1.75,1.4357,0.879,0.258,1,0],[2.0,1.4357,0.966,0.391,1,0],[-1.5,0.9571,0.55,0.232,1,0],[-1.25,0.9571,0.627,0.322,1,0],[-1.0,0.9571,0.618,0.163,1,0],[-0.75,0.9571,0.552,0.189,1,0],[-0.5,0.9571,0.521,0.053,1,0],[-0.25,0.9571,0.34,0.092,1,0],[0.0,0.9571,0.371,0.06,1,0],[0.25,0.9571,0.379,0.062,1,0],[0.5,0.9571,0.56,0.092,1,0],[0.75,0.9571,0.843,0.08,1,0],[1.0,0.9571,0.828,0.079,1,0],[1.25,0.9571,0.947,0.066,1,0],[1.5,0.9571,1.0,0.078,1,0],[1.75,0.9571,1.0,0.103,1,0],[2.0,0.9571,1.0,0.193,1,0],[-1.5,0.4786,0.474,0.253,1,0],[-1.25,0.4786,0.421,0.171,1,0],[-1.0,0.4786,0.513,0.156,1,0],[-0.75,0.4786,0.474,0.116,1,0],[-0.5,0.4786,0.433,0.241,1,0],[-0.25,0.4786,0.574,0.196,1,0],[0.0,0.4786,0.802,0.104,1,0],[0.25,0.4786,0.329,0.119,1,0],[0.5,0.4786,0.49,0.076,1,0],[0.75,0.4786,0.533,0.051,1,0],[1.0,0.4786,0.633,0.248,1,0],[1.25,0.4786,0.713,0.041,1,0],[1.5,0.4786,0.749,0.142,1,0],[1.75,0.4786,0.846,0.269,1,0],[2.0,0.4786,0.62,0.257,1,0],[-1.5,0.0,0.178,0.126,0,0],[-1.25,0.0,0.493,0.328,1,0],[-1.0,0.0,0.316,0.308,1,0],[-0.75,0.0,0.39,0.156,1,0],[-0.5,0.0,0.43,0.313,1,0],[-0.25,0.0,0.509,0.27,1,0],[0.25,0.0,0.851,0.253,0,0],[0.5,0.0,0.37,0.211,1,0],[0.75,0.0,0.411,0.13,1,0],[1.0,0.0,0.347,0.131,1,0],[1.25,0.0,0.247,0.199,1,0],[1.5,0.0,0.391,0.099,1,0],[1.75,0.0,0.317,0.187,1,0],[2.0,0.0,0.21,0.191,1,0],[-1.5,-0.4786,0.552,0.488,1,0],[-1.25,-0.4786,0.477,0.148,1,0],[-1.0,-0.4786,0.479,0.088,1,0],[-0.75,-0.4786,0.536,0.09,1,0],[-0.5,-0.4786,0.531,0.082,1,0],[-0.25,-0.4786,0.46,0.294,1,0],[0.0,-0.4786,0.393,0.261,1,0],[0.25,-0.4786,0.33,0.326,0,0],[0.5,-0.4786,0.36,0.254,1,0],[0.75,-0.4786,0.468,0.114,1,0],[1.0,-0.4786,0.651,0.338,1,0],[1.25,-0.4786,0.297,0.178,1,0],[1.5,-0.4786,0.708,0.183,1,0],[1.75,-0.4786,0.958,0.144,1,0],[2.0,-0.4786,0.698,0.09,1,0],[-1.5,-0.9571,0.76,0.352,1,0],[-1.25,-0.9571,0.678,0.181,1,0],[-1.0,-0.9571,0.708,0.159,1,0],[-0.75,-0.9571,0.627,0.207,1,0],[-0.5,-0.9571,0.569,0.126,1,0],[-0.25,-0.9571,0.366,0.081,1,0],[0.0,-0.9571,0.26,0.037,1,0],[0.25,-0.9571,0.243,0.066,1,0],[0.5,-0.9571,0.432,0.103,1,0],[0.75,-0.9571,0.483,0.146,1,0],[1.0,-0.9571,0.704,0.146,1,0],[1.25,-0.9571,1.0,0.161,1,0],[1.5,-0.9571,1.0,0.2,1,0],[1.75,-0.9571,0.891,0.234,1,0],[2.0,-0.9571,1.0,0.182,1,0],[-1.5,-1.4357,0.779,0.338,1,0],[-1.25,-1.4357,0.721,0.317,1,0],[-1.0,-1.4357,0.763,0.113,1,0],[-0.75,-1.4357,0.608,0.111,1,0],[-0.5,-1.4357,0.338,0.076,1,0],[-0.25,-1.4357,0.178,0.062,1,0],[0.0,-1.4357,0.202,0.03,1,0],[0.25,-1.4357,0.22,0.064,1,0],[0.5,-1.4357,0.366,0.13,1,0],[0.75,-1.4357,0.726,0.074,1,0],[1.0,-1.4357,0.579,0.137,1,0],[1.25,-1.4357,0.996,0.194,1,0],[1.5,-1.4357,1.0,0.218,1,0],[1.75,-1.4357,1.0,0.216,1,0],[2.0,-1.4357,0.741,0.291,1,0],[-1.5,-1.9143,0.831,0.372,1,0],[-1.25,-1.9143,0.817,0.184,1,0],[-1.0,-1.9143,0.743,0.154,1,0],[-0.75,-1.9143,0.592,0.084,1,0],[-0.5,-1.9143,0.309,0.042,1,0],[-0.25,-1.9143,0.154,0.1,1,0],[0.0,-1.9143,0.142,0.039,1,0],[0.25,-1.9143,0.21,0.08,1,0],[0.5,-1.9143,0.272,0.134,1,0],[0.75,-1.9143,0.402,0.118,1,0],[1.0,-1.9143,0.777,0.126,1,0],[1.25,-1.9143,0.907,0.192,1,0],[1.5,-1.9143,1.0,0.207,1,0],[1.75,-1.9143,1.0,0.356,1,0],[2.0,-1.9143,1.0,0.299,1,0],[-1.5,-2.3929,0.747,0.441,1,0],[-1.25,-2.3929,0.823,0.228,1,0],[-1.0,-2.3929,0.598,0.196,1,0],[-0.75,-2.3929,0.426,0.114,1,0],[-0.5,-2.3929,0.317,0.11,1,0],[-0.25,-2.3929,0.228,0.096,1,0],[0.0,-2.3929,0.193,0.076,1,0],[0.25,-2.3929,0.407,0.154,1,0],[0.5,-2.3929,0.364,0.106,1,0],[0.75,-2.3929,0.448,0.091,1,0],[1.0,-2.3929,0.759,0.158,1,0],[1.25,-2.3929,0.877,0.23,1,0],[1.5,-2.3929,0.742,0.274,1,0],[1.75,-2.3929,1.0,0.36,1,0],[2.0,-2.3929,1.0,0.394,1,0],[-1.5,-2.8714,0.832,0.31,1,0],[-1.25,-2.8714,0.771,0.288,1,0],[-1.0,-2.8714,0.687,0.199,1,0],[-0.75,-2.8714,0.389,0.159,1,0],[-0.5,-2.8714,0.339,0.05,1,0],[-0.25,-2.8714,0.212,0.097,1,0],[0.0,-2.8714,0.362,0.046,1,0],[0.25,-2.8714,0.322,0.143,1,0],[0.5,-2.8714,0.518,0.114,1,0],[0.75,-2.8714,0.598,0.142,1,0],[1.0,-2.8714,0.734,0.188,1,0],[1.25,-2.8714,0.873,0.189,1,0],[1.5,-2.8714,1.0,0.257,1,1],[1.75,-2.8714,0.824,0.439,1,0],[2.0,-2.8714,1.0,0.494,1,1],[-1.5,-3.35,0.867,0.34,1,0],[-1.25,-3.35,0.69,0.289,1,0],[-1.0,-3.35,0.443,0.171,1,0],[-0.75,-3.35,0.622,0.147,1,0],[-0.5,-3.35,0.378,0.092,1,0],[-0.25,-3.35,0.263,0.056,1,0],[0.0,-3.35,0.17,0.038,1,0],[0.25,-3.35,0.3,0.07,1,0],[0.5,-3.35,0.488,0.15,1,0],[0.75,-3.35,0.662,0.123,1,0],[1.0,-3.35,0.861,0.189,1,0],[1.25,-3.35,0.972,0.211,1,0],[1.5,-3.35,0.968,0.394,1,0],[1.75,-3.35,0.911,0.449,1,0],[2.0,-3.35,1.0,0.489,1,0]],"vy_wz":[[-1.32,3.35,1.0,0.241,1,0],[-1.1314,3.35,0.872,0.142,1,0],[-0.9429,3.35,0.824,0.119,1,0],[-0.7543,3.35,0.738,0.148,1,0],[-0.5657,3.35,0.659,0.088,1,0],[-0.3771,3.35,0.409,0.048,1,0],[-0.1886,3.35,0.261,0.104,1,0],[0.0,3.35,0.126,0.056,1,0],[0.1886,3.35,0.181,0.079,1,0],[0.3771,3.35,0.271,0.09,1,0],[0.5657,3.35,0.363,0.148,1,0],[0.7543,3.35,0.382,0.14,1,0],[0.9429,3.35,0.51,0.193,1,0],[1.1314,3.35,0.597,0.244,1,0],[1.32,3.35,0.667,0.274,1,0],[-1.32,2.8714,1.0,0.167,1,0],[-1.1314,2.8714,0.931,0.109,1,0],[-0.9429,2.8714,0.841,0.088,1,0],[-0.7543,2.8714,0.756,0.099,1,0],[-0.5657,2.8714,0.61,0.089,1,0],[-0.3771,2.8714,0.473,0.047,1,0],[-0.1886,2.8714,0.223,0.051,1,0],[0.0,2.8714,0.159,0.119,1,0],[0.1886,2.8714,0.192,0.071,1,0],[0.3771,2.8714,0.229,0.067,1,0],[0.5657,2.8714,0.357,0.087,1,0],[0.7543,2.8714,0.386,0.133,1,0],[0.9429,2.8714,0.524,0.196,1,0],[1.1314,2.8714,0.621,0.177,1,0],[1.32,2.8714,0.66,0.297,1,0],[-1.32,2.3929,1.0,0.172,1,0],[-1.1314,2.3929,1.0,0.184,1,0],[-0.9429,2.3929,1.0,0.1,1,0],[-0.7543,2.3929,0.803,0.081,1,0],[-0.5657,2.3929,0.686,0.099,1,0],[-0.3771,2.3929,0.391,0.09,1,0],[-0.1886,2.3929,0.268,0.168,1,0],[0.0,2.3929,0.222,0.072,1,0],[0.1886,2.3929,0.206,0.072,1,0],[0.3771,2.3929,0.289,0.054,1,0],[0.5657,2.3929,0.317,0.076,1,0],[0.7543,2.3929,0.517,0.112,1,0],[0.9429,2.3929,0.649,0.102,1,0],[1.1314,2.3929,0.639,0.197,1,0],[1.32,2.3929,0.72,0.183,1,0],[-1.32,1.9143,1.0,0.24,1,0],[-1.1314,1.9143,0.999,0.171,1,0],[-0.9429,1.9143,0.91,0.149,1,0],[-0.7543,1.9143,0.968,0.131,1,0],[-0.5657,1.9143,0.656,0.07,1,0],[-0.3771,1.9143,0.457,0.058,1,0],[-0.1886,1.9143,0.328,0.036,1,0],[0.0,1.9143,0.209,0.076,1,0],[0.1886,1.9143,0.209,0.037,1,0],[0.3771,1.9143,0.347,0.107,1,0],[0.5657,1.9143,0.382,0.133,1,0],[0.7543,1.9143,0.546,0.18,1,0],[0.9429,1.9143,0.698,0.188,1,0],[1.1314,1.9143,0.692,0.197,1,0],[1.32,1.9143,0.817,0.344,1,0],[-1.32,1.4357,0.886,0.333,1,0],[-1.1314,1.4357,0.95,0.204,1,0],[-0.9429,1.4357,0.898,0.288,1,0],[-0.7543,1.4357,0.783,0.172,1,0],[-0.5657,1.4357,0.76,0.156,1,0],[-0.3771,1.4357,0.63,0.117,1,0],[-0.1886,1.4357,0.41,0.068,1,0],[0.0,1.4357,0.237,0.081,1,0],[0.1886,1.4357,0.22,0.02,1,0],[0.3771,1.4357,0.356,0.082,1,0],[0.5657,1.4357,0.506,0.104,1,0],[0.7543,1.4357,0.589,0.13,1,0],[0.9429,1.4357,0.724,0.157,1,0],[1.1314,1.4357,0.69,0.319,1,0],[1.32,1.4357,0.76,0.179,1,0],[-1.32,0.9571,0.693,0.317,1,0],[-1.1314,0.9571,0.702,0.179,1,0],[-0.9429,0.9571,0.752,0.332,1,0],[-0.7543,0.9571,0.88,0.268,1,0],[-0.5657,0.9571,0.831,0.208,1,0],[-0.3771,0.9571,0.709,0.147,1,0],[-0.1886,0.9571,0.459,0.114,1,0],[0.0,0.9571,0.542,0.049,1,0],[0.1886,0.9571,0.407,0.088,1,0],[0.3771,0.9571,0.407,0.087,1,0],[0.5657,0.9571,0.624,0.067,1,0],[0.7543,0.9571,0.787,0.24,1,0],[0.9429,0.9571,0.799,0.111,1,0],[1.1314,0.9571,0.719,0.338,1,0],[1.32,0.9571,0.741,0.309,1,0],[-1.32,0.4786,0.502,0.261,1,0],[-1.1314,0.4786,0.531,0.178,1,0],[-0.9429,0.4786,0.43,0.194,1,0],[-0.7543,0.4786,0.46,0.231,1,0],[-0.5657,0.4786,0.422,0.21,1,0],[-0.3771,0.4786,0.432,0.27,1,0],[-0.1886,0.4786,0.472,0.263,1,0],[0.0,0.4786,0.48,0.227,1,0],[0.1886,0.4786,0.483,0.079,1,0],[0.3771,0.4786,0.528,0.093,1,0],[0.5657,0.4786,0.683,0.091,1,0],[0.7543,0.4786,0.618,0.163,1,0],[0.9429,0.4786,0.679,0.172,1,0],[1.1314,0.4786,0.706,0.441,1,0],[1.32,0.4786,0.568,0.332,1,0],[-1.32,0.0,0.329,0.117,1,0],[-1.1314,0.0,0.318,0.169,1,0],[-0.9429,0.0,0.396,0.168,1,0],[-0.7543,0.0,0.348,0.174,1,0],[-0.5657,0.0,0.491,0.147,1,0],[-0.3771,0.0,0.439,0.429,0,0],[-0.1886,0.0,1.0,0.661,1,0],[0.1886,0.0,1.0,0.576,1,0],[0.3771,0.0,0.787,0.25,1,0],[0.5657,0.0,0.506,0.237,1,0],[0.7543,0.0,0.536,0.353,1,0],[0.9429,0.0,0.463,0.164,1,0],[1.1314,0.0,0.327,0.181,1,0],[1.32,0.0,0.426,0.196,1,0],[-1.32,-0.4786,0.54,0.129,1,0],[-1.1314,-0.4786,0.579,0.367,1,0],[-0.9429,-0.4786,0.518,0.202,1,0],[-0.7543,-0.4786,0.579,0.208,1,0],[-0.5657,-0.4786,0.449,0.21,1,0],[-0.3771,-0.4786,0.561,0.36,1,0],[-0.1886,-0.4786,0.683,0.317,1,0],[0.0,-0.4786,0.279,0.133,1,0],[0.1886,-0.4786,0.739,0.537,1,0],[0.3771,-0.4786,0.517,0.314,1,0],[0.5657,-0.4786,0.541,0.226,1,0],[0.7543,-0.4786,0.516,0.298,1,0],[0.9429,-0.4786,0.333,0.223,1,0],[1.1314,-0.4786,0.469,0.286,1,0],[1.32,-0.4786,0.46,0.263,1,0],[-1.32,-0.9571,0.626,0.143,1,0],[-1.1314,-0.9571,0.48,0.403,1,0],[-0.9429,-0.9571,0.523,0.124,1,0],[-0.7543,-0.9571,0.521,0.109,1,0],[-0.5657,-0.9571,0.536,0.2,1,0],[-0.3771,-0.9571,0.414,0.103,1,0],[-0.1886,-0.9571,0.221,0.091,1,0],[0.0,-0.9571,0.238,0.056,1,0],[0.1886,-0.9571,0.39,0.087,1,0],[0.3771,-0.9571,0.668,0.172,1,0],[0.5657,-0.9571,0.651,0.179,1,0],[0.7543,-0.9571,0.72,0.228,1,0],[0.9429,-0.9571,0.779,0.299,1,0],[1.1314,-0.9571,0.799,0.487,1,0],[1.32,-0.9571,0.7,0.362,1,0],[-1.32,-1.4357,0.69,0.403,1,0],[-1.1314,-1.4357,0.668,0.183,1,0],[-0.9429,-1.4357,0.734,0.113,1,0],[-0.7543,-1.4357,0.679,0.271,1,0],[-0.5657,-1.4357,0.697,0.144,1,0],[-0.3771,-1.4357,0.503,0.081,1,0],[-0.1886,-1.4357,0.456,0.112,1,0],[0.0,-1.4357,0.182,0.167,0,0],[0.1886,-1.4357,0.399,0.066,1,0],[0.3771,-1.4357,0.757,0.08,1,0],[0.5657,-1.4357,0.889,0.171,1,0],[0.7543,-1.4357,0.859,0.244,1,0],[0.9429,-1.4357,0.846,0.25,1,0],[1.1314,-1.4357,0.866,0.284,1,0],[1.32,-1.4357,0.606,0.24,1,0],[-1.32,-1.9143,0.629,0.234,1,0],[-1.1314,-1.9143,0.794,0.263,1,0],[-0.9429,-1.9143,0.841,0.123,1,0],[-0.7543,-1.9143,0.788,0.103,1,0],[-0.5657,-1.9143,0.507,0.051,1,0],[-0.3771,-1.9143,0.357,0.053,1,0],[-0.1886,-1.9143,0.364,0.072,1,0],[0.0,-1.9143,0.289,0.028,1,0],[0.1886,-1.9143,0.501,0.056,1,0],[0.3771,-1.9143,0.888,0.09,1,0],[0.5657,-1.9143,0.789,0.101,1,0],[0.7543,-1.9143,0.851,0.124,1,0],[0.9429,-1.9143,1.0,0.203,1,0],[1.1314,-1.9143,0.836,0.23,1,0],[1.32,-1.9143,0.773,0.274,1,0],[-1.32,-2.3929,1.0,0.308,1,0],[-1.1314,-2.3929,0.861,0.19,1,0],[-0.9429,-2.3929,0.732,0.103,1,0],[-0.7543,-2.3929,0.836,0.119,1,0],[-0.5657,-2.3929,0.76,0.066,1,0],[-0.3771,-2.3929,0.299,0.056,1,0],[-0.1886,-2.3929,0.306,0.046,1,0],[0.0,-2.3929,0.311,0.051,1,0],[0.1886,-2.3929,0.38,0.061,1,0],[0.3771,-2.3929,0.694,0.059,1,0],[0.5657,-2.3929,0.823,0.1,1,0],[0.7543,-2.3929,1.0,0.122,1,0],[0.9429,-2.3929,1.0,0.196,1,0],[1.1314,-2.3929,1.0,0.232,1,0],[1.32,-2.3929,1.0,0.217,1,0],[-1.32,-2.8714,0.963,0.247,1,0],[-1.1314,-2.8714,0.833,0.231,1,0],[-0.9429,-2.8714,0.822,0.304,1,0],[-0.7543,-2.8714,0.566,0.101,1,0],[-0.5657,-2.8714,0.546,0.038,1,0],[-0.3771,-2.8714,0.331,0.087,1,0],[-0.1886,-2.8714,0.456,0.048,1,0],[0.0,-2.8714,0.214,0.048,1,0],[0.1886,-2.8714,0.373,0.042,1,0],[0.3771,-2.8714,0.409,0.072,1,0],[0.5657,-2.8714,0.769,0.071,1,0],[0.7543,-2.8714,1.0,0.12,1,0],[0.9429,-2.8714,1.0,0.136,1,1],[1.1314,-2.8714,1.0,0.228,1,0],[1.32,-2.8714,1.0,0.246,1,0],[-1.32,-3.35,1.0,0.252,1,0],[-1.1314,-3.35,0.778,0.284,1,0],[-0.9429,-3.35,0.638,0.159,1,0],[-0.7543,-3.35,0.566,0.167,1,0],[-0.5657,-3.35,0.442,0.077,1,0],[-0.3771,-3.35,0.344,0.116,1,0],[-0.1886,-3.35,0.247,0.064,1,0],[0.0,-3.35,0.338,0.067,1,0],[0.1886,-3.35,0.324,0.048,1,0],[0.3771,-3.35,0.629,0.067,1,0],[0.5657,-3.35,0.816,0.098,1,0],[0.7543,-3.35,1.0,0.128,1,1],[0.9429,-3.35,1.0,0.136,1,1],[1.1314,-3.35,1.0,0.193,1,1],[1.32,-3.35,0.694,0.216,1,0]]};
  /* 图 7 的背景：每个命令格子里参考动作有多少秒（源文件 stepgrid_field_*.csv，先按第一个分量、再按第二个分量排，15 × 15） */
  var FIG7F = {"vx_vy":[0.0,0.0,0.0,0.2,1.2,1.3,1.7,0.3,0.0,0.0,0.0,0.4,0.4,0.0,0.0,0.0,0.0,0.1,0.6,1.0,5.4,9.4,2.1,0.4,0.1,0.3,0.9,1.1,0.4,0.0,0.0,0.0,0.2,1.1,8.0,40.2,40.4,10.5,7.4,3.7,1.0,0.9,1.7,0.9,0.0,0.0,0.0,0.2,9.8,44.6,104.0,97.1,42.4,29.1,25.3,7.5,0.7,1.0,0.4,0.1,0.0,0.0,2.1,28.9,119.6,150.4,113.2,45.6,115.8,85.1,18.5,1.6,0.5,0.4,0.0,0.0,0.1,6.0,55.9,146.5,135.5,100.5,45.3,125.9,124.6,39.5,14.5,4.8,4.7,0.9,1.2,3.7,18.7,91.8,111.1,120.3,321.0,91.2,127.6,191.6,157.8,69.3,32.7,35.3,13.4,2.1,18.2,23.3,99.4,55.9,85.9,1176.3,160.2,96.3,189.3,133.7,75.6,53.8,84.9,26.7,1.2,3.8,18.8,93.6,111.7,121.3,320.1,92.1,128.6,189.1,157.3,67.3,31.1,30.2,11.1,0.0,0.1,6.5,57.3,145.7,137.4,100.2,45.6,124.8,123.3,39.3,13.1,4.7,3.1,0.8,0.0,0.0,2.4,32.8,120.1,150.1,112.9,47.7,116.9,84.5,18.2,1.6,0.4,0.3,0.0,0.0,0.0,0.1,9.7,45.8,104.1,98.1,44.2,28.9,24.9,7.3,0.5,0.9,0.1,0.1,0.0,0.0,0.3,1.1,8.6,40.0,40.1,11.1,5.4,3.1,0.8,0.7,1.6,0.7,0.0,0.0,0.0,0.1,0.7,0.8,5.5,9.4,2.0,0.2,0.1,0.1,0.8,0.8,0.4,0.0,0.0,0.0,0.0,0.3,1.5,1.5,1.7,0.3,0.0,0.0,0.0,0.3,0.4,0.0,0.0],"vx_wz":[0.0,0.0,0.0,0.1,0.2,0.8,0.7,0.6,0.3,0.3,0.2,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.1,0.3,1.1,1.9,0.9,0.4,0.2,0.1,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.1,0.4,2.1,8.9,4.8,1.1,0.9,0.2,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.2,0.6,9.6,35.8,10.2,2.6,1.3,0.4,0.2,0.1,0.0,0.0,0.0,0.0,0.0,0.6,12.7,33.0,80.7,16.4,9.2,4.9,1.8,2.5,1.5,0.0,0.0,0.0,0.0,1.2,13.7,83.8,114.8,162.0,35.1,76.2,70.9,39.1,16.7,2.3,0.9,0.2,0.8,3.1,15.9,107.5,212.7,269.3,316.6,127.7,232.3,286.6,156.9,63.8,27.4,23.5,6.7,2.7,19.6,44.3,237.2,301.9,342.6,1327.4,246.4,265.7,312.7,178.6,75.8,72.1,114.3,39.6,0.9,3.1,16.3,108.6,211.4,267.8,317.9,127.1,231.3,288.2,160.5,66.3,27.0,22.0,6.5,0.0,0.0,1.1,13.6,84.1,115.4,162.4,35.9,74.3,71.2,40.1,18.4,3.5,1.0,0.2,0.0,0.0,0.0,0.8,12.1,33.1,82.3,17.4,9.0,4.6,2.0,4.3,1.8,0.0,0.0,0.0,0.0,0.0,0.2,0.9,9.4,36.2,10.8,2.2,1.1,0.5,0.2,0.1,0.0,0.0,0.0,0.0,0.0,0.1,0.6,2.4,8.7,4.8,1.0,0.7,0.3,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.1,0.2,1.2,2.2,1.2,0.4,0.4,0.1,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.1,0.2,0.8,0.7,0.6,0.6,0.2,0.2,0.0,0.0,0.0,0.0],"vy_wz":[0.0,0.0,0.0,0.2,0.5,0.5,0.2,0.3,0.3,0.5,0.3,0.2,0.2,0.0,0.0,0.0,0.0,0.0,0.4,0.4,0.3,0.5,1.1,1.7,0.4,0.3,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.1,0.3,1.3,2.8,6.5,6.3,1.2,0.1,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.1,0.4,1.9,10.5,21.8,19.4,5.3,1.1,0.7,0.0,0.0,0.0,0.0,0.0,0.0,1.1,5.2,9.2,28.6,51.3,40.7,13.8,9.1,3.9,0.3,0.0,0.0,0.1,0.5,1.0,19.6,59.4,72.9,86.6,101.6,105.1,64.2,61.2,34.7,8.4,0.8,0.8,1.2,2.8,22.2,78.6,171.2,215.5,255.6,278.0,319.0,193.7,167.9,100.7,34.7,9.9,1.9,1.9,7.4,47.8,121.2,204.9,222.9,508.2,1370.6,500.5,223.6,210.3,123.3,47.3,7.0,1.9,1.8,10.0,35.7,100.0,166.5,192.3,322.0,277.8,259.1,214.5,172.9,79.0,21.4,2.7,1.3,0.6,0.9,8.6,35.0,61.3,65.8,107.2,102.1,87.4,71.9,58.6,20.3,1.1,0.5,0.1,0.0,0.0,0.3,4.7,9.7,14.9,41.4,52.8,29.6,9.0,4.1,1.0,0.0,0.0,0.0,0.0,0.0,0.0,0.7,1.1,5.5,20.1,21.5,10.4,2.0,0.4,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.1,1.2,6.3,6.8,2.4,1.3,0.4,0.2,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.3,0.4,1.7,1.5,0.8,0.4,0.5,0.4,0.0,0.0,0.0,0.0,0.0,0.2,0.2,0.3,0.4,0.4,0.4,0.3,0.5,0.5,0.2,0.0,0.0,0.0]};

  /* 全片配色（照论文的图：SuperMimic 蓝、基线橙）：SuperMimic / 世界模型是蓝（accent），SONIC 与 PPO 是黄橙（warn），
     仿真器是白（ink），梯度是绿（good），评论家是粉紫（purple），惩罚与失败是红（bad） */
  var C_SM = C_ACCENT, C_BASE = C_WARN, C_SIM = C_INK, C_WM = C_ACCENT, C_GRAD = C_GOOD, C_CRIT = C_PURPLE, C_F = C_ACCENT;

  /* 论文图（arXiv 2610.28480）：[文件, 宽, 高]；图 1 是透明底的渲染，图 6 是四条真机快照 */
  var FIGS = {
    fig1: ['fig1_teaser.webp', 1000, 526],
    skip: ['fig6_skip.webp', 1650, 240],
    roll: ['fig6_roll.webp', 1650, 240],
    flip90: ['fig6_flip90.webp', 1650, 240],
    flip360: ['fig6_flip360.webp', 1650, 240]
  };

  /* 一张 G1 贴图表：put(x, y, s, f) 把第 f 帧的格子左上角放在 (x, y)、缩放 s；pt(P) 把世界点 P（m）投到画面上（用最近一次 put 的位置）。
     贴图第一次用到才设 href（网页上播到这一幕才下载） */
  function g1Sprite(parent, key, opts) {
    var o = opts || {}, M = SHEETS[key], g = group(parent), rows = Math.ceil(M.n / M.cols);
    g.setAttribute('class', 'demo-x-g1mesh');
    if (o.opacity != null) g.style.opacity = o.opacity;
    var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: 0, height: 0 });
    var img = svgEl('image', { x: 0, y: 0, width: M.cw * M.cols, height: M.ch * rows, preserveAspectRatio: 'none' });
    box.appendChild(img);
    g.appendChild(box);
    var woke = false, lastF = -1, at = { x: 0, y: 0, s: 1, f: 0 };
    var cy = Math.cos(M.yaw), sy = Math.sin(M.yaw), cp = Math.cos(M.pitch), sp = Math.sin(M.pitch);
    function proj(f, P) {
      var T = M.T[f], dx = P[0] - T[0], dy = P[1] - T[1], dz = P[2] || 0;
      var u = -sy * dx + cy * dy, v = -cy * sp * dx - sy * sp * dy + cp * dz;
      return [M.cx + M.k * u, M.cy - M.k * v];
    }
    return {
      g: g, M: M,
      put: function (x, y, s, f) {
        if (!woke && G1_BASE) { woke = true; img.setAttribute('href', G1_BASE + M.file); }
        f = clamp(Math.round(f || 0), 0, M.n - 1);
        at = { x: x, y: y, s: s, f: f };
        box.setAttribute('x', x.toFixed(1)); box.setAttribute('y', y.toFixed(1));
        box.setAttribute('width', (M.cw * s).toFixed(1)); box.setAttribute('height', (M.ch * s).toFixed(1));
        if (f !== lastF) {
          box.setAttribute('viewBox', [(f % M.cols) * M.cw, Math.floor(f / M.cols) * M.ch, M.cw, M.ch].join(' '));
          lastF = f;
        }
        return at;
      },
      pt: function (P, f) {
        var q = proj(f == null ? at.f : f, P);
        return [at.x + q[0] * at.s, at.y + q[1] * at.s];
      },
      T: function (f) { return M.T[clamp(Math.round(f), 0, M.n - 1)]; }
    };
  }
  /* 帧号：按真实时间从头播到尾，末尾停 hold 秒再从头来（复现的动作有开头有结尾，来回放会把摔倒倒着放） */
  function seqFrame(sec, n, fps, hold) {
    var L = n / fps + (hold == null ? 0.8 : hold), u = ((Math.max(0, sec) % L) + L) % L;
    return Math.min(n - 1, Math.floor(u * fps));
  }
  /* 地面网格：和贴图同一台相机，每 0.5 m 一条线；跟拍的相机往前走，格子就往后退，看得出在动 */
  var gridSeq = 0;
  function groundGrid(parent, sprite, x, y, w, h, opts) {
    var o = opts || {}, step = o.step || 0.5, R = o.R || 3, id = 'sm-ground-' + (++gridSeq);
    var clip = svgEl('clipPath', { id: id });
    clip.appendChild(svgEl('rect', { x: x, y: y, width: w, height: h }));
    parent.appendChild(clip);
    var g = group(parent);
    g.setAttribute('clip-path', 'url(#' + id + ')');
    var bands = [0.42, 0.26, 0.12].map(function (op) {
      var p = paint(svgEl('path', { fill: 'none', 'stroke-width': 1.1 }), null, C_MUTED);
      p.style.strokeOpacity = op;
      g.appendChild(p);
      return p;
    });
    return {
      g: g,
      draw: function (f) {
        var T = sprite.T(f), cx = T[0], cyy = T[1], d = ['', '', ''];
        function seg2(off, a, b) {
          var rr = Math.abs(off) / R, k = rr < 0.34 ? 0 : rr < 0.67 ? 1 : 2, pa = sprite.pt(a, f), pb = sprite.pt(b, f);
          /* 线段裁到框里（Liang–Barsky）：被 clip-path 裁掉的几何也会撑大分镜的外框（fitStages 量的是 getBBox） */
          var dx = pb[0] - pa[0], dy = pb[1] - pa[1], t0 = 0, t1 = 1, P = [-dx, dx, -dy, dy], Q = [pa[0] - x, x + w - pa[0], pa[1] - y, y + h - pa[1]];
          for (var q = 0; q < 4; q++) {
            if (P[q] === 0) { if (Q[q] < 0) return; continue; }
            var r0 = Q[q] / P[q];
            if (P[q] < 0) { if (r0 > t1) return; if (r0 > t0) t0 = r0; } else { if (r0 < t0) return; if (r0 < t1) t1 = r0; }
          }
          d[k] += 'M' + (pa[0] + dx * t0).toFixed(1) + ' ' + (pa[1] + dy * t0).toFixed(1) + 'L' + (pa[0] + dx * t1).toFixed(1) + ' ' + (pa[1] + dy * t1).toFixed(1);
        }
        for (var i = Math.floor((cx - R) / step); i <= Math.ceil((cx + R) / step); i++) seg2(i * step - cx, [i * step, cyy - R, 0], [i * step, cyy + R, 0]);
        for (var j = Math.floor((cyy - R) / step); j <= Math.ceil((cyy + R) / step); j++) seg2(j * step - cyy, [cx - R, j * step, 0], [cx + R, j * step, 0]);
        bands.forEach(function (p, b) { p.setAttribute('d', d[b] || 'M0 0'); });
      }
    };
  }
  /* 坐标图：(x, y, w, h) 的框，横轴 [x0, x1]（logx 时取 log10）、纵轴 [y0, y1]；ticks 写在框外 */
  function chart(parent, x, y, w, h, o) {
    var g = group(parent);
    rectBox(g, x, y, w, h, C_BORDER, C_SURFACE);
    function tx(v) { return o.logx ? Math.log10(v) : v; }
    function ty(v) { return o.logy ? Math.log10(v) : v; }
    var X0 = tx(o.x0), X1 = tx(o.x1), Y0 = ty(o.y0), Y1 = ty(o.y1);
    function px(v) { return x + (tx(v) - X0) / (X1 - X0) * w; }
    function py(v) { return y + h - (ty(v) - Y0) / (Y1 - Y0) * h; }
    (o.xt || []).forEach(function (v) {
      var X = px(v[0]);
      hline(g, X, y + h, X, y + h + 4, C_BORDER, 1);
      label(g, X, y + h + 18, v[1], 'demo-x-mut', 11, 'middle');
    });
    (o.yt || []).forEach(function (v) {
      var Y = py(v[0]);
      hline(g, x, Y, x + w, Y, C_BORDER, 0.6, '2 4');
      label(g, x - 8, Y + 4, v[1], 'demo-x-mut', 11, 'end');
    });
    if (o.xl) label(g, x + w / 2, y + h + 38, o.xl, 'demo-x-mut', 11, 'middle');
    if (o.yl) label(g, x, y - 8, o.yl, 'demo-x-mut', 11, 'start');
    return {
      g: g, px: px, py: py,
      /* 折线；upto（横轴单位）之后不画，用来让曲线一点点长出来 */
      line: function (pts, color, width, dash, upto) {
        var p = pathLine(g, [], color, width || 2, dash);
        function set(u) {
          var q = [];
          for (var i = 0; i < pts.length; i++) {
            if (u != null && pts[i][0] > u) {
              if (i > 0) {
                var a = pts[i - 1], b = pts[i], k = o.logx ? (Math.log10(u) - Math.log10(a[0])) / (Math.log10(b[0]) - Math.log10(a[0])) : (u - a[0]) / (b[0] - a[0]);
                q.push([px(u), py(a[1] + (b[1] - a[1]) * k)]);
              }
              break;
            }
            q.push([px(pts[i][0]), py(pts[i][1])]);
          }
          setPath(p, q);
        }
        set(upto);
        return { node: p, set: set };
      }
    };
  }
  /* 一个方框 + 居中的字（流程图用） */
  function boxText(parent, x, y, w, h, str, color, opts) {
    var o = opts || {}, g = group(parent);
    var r = rectBox(g, x, y, w, h, color || C_BORDER, o.fill || C_SURFACE, o.dash);
    var lines = String(str).split('\n'), size = o.size || 12, lh = size * (o.lh || 1.6), y0 = y + h / 2 - (lines.length - 1) * lh / 2 + size * 0.36;
    var ts = lines.map(function (ln, i) { return rich(g, x + w / 2, y0 + i * lh, ln, size, o.cls || 'demo-x-ink2', 'middle', w - 8); });
    return { g: g, r: r, t: ts };
  }
  function f0(x) { return fmt(x, 0); }
  function f4(x) { return fmt(x, 4); }
  /* 千分位 */
  function kfmt(v) { return Math.round(v).toLocaleString('en-US'); }


  /* 一排模型的小方框（GPU）：n 个、每行 cols 个；highlight(i) 只亮第 i 个 */
  function gpuWall(parent, x, y, n, cols, size, gap, color) {
    return cellGrid(parent, x, y, n, cols, size, gap, color);
  }
  /* 一串想象的状态：k 个圆点从左到右，前向箭头蓝、反向梯度绿虚线；set(前向进度 0–1, 反向进度 0–1) */
  function chainBPTT(parent, x, y, w, k, opts) {
    var o = opts || {}, g = group(parent), dx = w / (k - 1), dots = [], fw = [], bw = [], rs = [];
    for (var i = 0; i < k; i++) {
      var cx = x + i * dx;
      if (i > 0) {
        var a = arrow(g, C_WM, 1.8);
        a.set(cx - dx + 11, y, cx - 11, y, 7);
        fw.push(a);
        var b = arrow(g, C_GRAD, 1.8, '4 3');
        b.set(cx - 11, y + 22, cx - dx + 11, y + 22, 7);
        bw.push(b);
      }
      dots.push(dotAt(g, cx, y, 8, C_WM));
      label(g, cx, y - 14, o.names ? o.names[i] : 's' + i, 'demo-x-ink2', 11.5, 'middle');
      if (o.rewards && i > 0) rs.push(hbar(g, cx - 4, y + 34, 8, C_GOOD, 0.85));
    }
    return {
      g: g,
      set: function (uf, ub) {
        fw.forEach(function (a, i) { setOpacity(a.g, clamp(uf * fw.length - i, 0, 1)); });
        dots.forEach(function (d, i) { d.style.opacity = i === 0 ? 1 : clamp(uf * fw.length - i + 1, 0.15, 1); });
        bw.forEach(function (b, i) { setOpacity(b.g, clamp(ub * bw.length - (bw.length - 1 - i), 0, 1)); });
        rs.forEach(function (r, i) { r.setAttribute('width', 8); r.setAttribute('y', y + 34); r.setAttribute('height', (14 * clamp(uf * fw.length - i, 0, 1)).toFixed(1)); });
      }
    };
  }

  /* ── scene 1: 跟踪的动作越多，算力越贵 ── */
  function buildSceneIntro() {
    var s = sceneSvg('左边是项目页的仿真视频：同一个跟踪策略做各种动作；右边依次出现：动作库的格子一格格填满（129,514 段）；' +
      'SONIC 的 128 张显卡和 7 天的进度条，数到约 21,000 显卡小时；同一个身体、PPO 的梯度估计到处乱晃；世界模型里的一串想象状态和往回传的梯度；最后是 1 张卡对 128 张卡');
    s.appendChild(svgText(24, 26, '一个策略跟踪整个动作库：越多越贵', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'hero', 24, 44, 380, 214, '项目页视频（仿真）：同一个跟踪策略做各种动作');
    label(s, 24, 296, '宇树 G1 · 29 个关节 · 一个通用的动作跟踪策略', 'demo-x-ink2', 11.5);
    label(s, 24, 316, 'UC Berkeley · CoRL 2026 Oral · arXiv 2610.28480', 'demo-x-mut', 11);
    var R = 424;
    /* 第 1 段：动作库 */
    var p1 = group(s);
    label(p1, R, 62, '动作库：BONES-SEED，G1 重定向版', 'demo-x-ink', 14);
    var lib = cellGrid(p1, R, 78, 240, 24, 11, 3.6, C_SM);
    var libN = label(p1, R, 252, '', 'demo-x-ink', 20);
    label(p1, R, 278, '段动作，共 264 小时；一格约 540 段', 'demo-x-ink2', 12);
    /* 第 2 段：SONIC 的算力 */
    var p2 = group(s);
    label(p2, R, 62, '之前的做法：SONIC（NVIDIA，模型无关的 PPO）', 'demo-x-ink', 14);
    var wall = gpuWall(p2, R, 78, 128, 16, 16, 4, C_BASE);
    label(p2, R, 252, '128 张 L40', 'demo-x-ink2', 12);
    rectBox(p2, R + 90, 243, 270, 10, C_BORDER, C_SURFACE2);
    var dayBar = hbar(p2, R + 90, 243, 10, C_BASE);
    var dayT = label(p2, R + 360, 270, '', 'demo-x-mut', 11, 'end');
    var gpuh = label(p2, R, 296, '', 'demo-x-ink', 18);
    /* 第 3 段：同一个身体，梯度却靠采样估计 */
    var p3 = group(s);
    label(p3, R, 62, '动作不同，身体相同', 'demo-x-ink', 14);
    ['走路', '空翻', '侧滚', '跳舞'].forEach(function (w, i) {
      chip(p3, R, 78 + i * 36, 70, w, C_BORDER, { size: 12, h: 28 });
      var a = arrow(p3, C_MUTED, 1.5);
      a.set(R + 74, 92 + i * 36, R + 112, 146, 6);
    });
    boxText(p3, R + 116, 120, 92, 52, '同一台 G1\n同样的接触', C_SIM, { size: 12 });
    label(p3, R + 222, 92, 'PPO：从带噪样本估梯度', 'demo-x-ink2', 11.5);
    var cx3 = R + 280, cy3 = 166, noisy = [];
    for (var j = 0; j < 9; j++) noisy.push(arrow(p3, C_BASE, 1.4));
    var trueA = arrow(p3, C_GRAD, 2.6);
    trueA.set(cx3, cy3, cx3 + 58, cy3 - 34, 9);
    tone(p3, cx3 - 6, cy3 + 20, '绿：真方向', C_GRAD, 11, 'end');
    label(p3, R, 238, '每段动作都在重新试错：动作越多，要的样本越多', 'demo-x-ink2', 12);
    label(p3, R, 260, '可是共用的身体动力学，没有被单独学下来', 'demo-x-mut', 11.5);
    /* 第 4 段：世界模型 + BPTT */
    var p4 = group(s);
    label(p4, R, 62, 'SuperMimic：学一个可微的世界模型', 'demo-x-ink', 14);
    boxText(p4, R, 78, 160, 44, '仿真器的日志\n（状态、动作）', C_SIM, { size: 12 });
    var fA = arrow(p4, C_MUTED, 1.8);
    fA.set(R + 166, 100, R + 200, 100, 7);
    boxText(p4, R + 204, 78, 156, 44, '世界模型 $f_\\omega$\n可求导', C_WM, { size: 12 });
    var ch4 = chainBPTT(p4, R + 24, 176, 316, 5, { names: ['s0', 's1', 's2', 's3', 's4'], rewards: true });
    tone(p4, R, 248, '→ 在模型里往前想象', C_WM, 11.5);
    tone(p4, R + 180, 248, '⇠ 回报沿时间反传（BPTT）', C_GRAD, 11.5);
    label(p4, R, 274, '策略拿到的是解析梯度，不是采样估计', 'demo-x-ink2', 12);
    /* 第 5 段：1 张卡 vs 128 张卡 */
    var p5 = group(s);
    label(p5, R, 62, '结果：1 张 H100、3 小时', 'demo-x-ink', 14);
    var wall5 = gpuWall(p5, R, 78, 128, 16, 10, 2.5, C_BASE);
    var one = paint(svgEl('rect', { x: R + 270, y: 78, width: 22, height: 22, rx: 3 }), C_SM);
    p5.appendChild(one);
    label(p5, R + 300, 94, '1 张', 'demo-x-ink', 13);
    label(p5, R, 200, 'SONIC：128 张 L40 × 168 小时', 'demo-x-ink2', 12);
    tone(p5, R, 222, 'SuperMimic：1 张 H100 × 3 小时，回报更高', C_SM, 12.5);
    var big = tone(p5, R, 264, '', C_GOOD, 26);
    label(p5, R, 290, '显卡小时少 1000 倍以上（按报告的数约 7200 倍）', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      clip.at(K.clipSince(t, 0), true);
      /* 动作库：格子一格格填满，数到 129,514 */
      var u1 = clamp(since(t, clock, 0.4) / 2.6, 0, 1);
      lib.fill(Math.round(240 * u1));
      libN.textContent = countTo(129514, u1);
      /* SONIC：显卡一张张亮，7 天的进度条走完，数到约 21,000 显卡小时 */
      var u2 = clamp(since(t, clock, 3.6) / 2.8, 0, 1);
      wall.fill(Math.round(128 * Math.min(1, u2 * 2)));
      setW(dayBar, 270 * u2);
      dayT.textContent = '训练 ' + Math.round(168 * u2) + ' 小时 / 7 天';
      gpuh.textContent = '≈ ' + countTo(21000, u2) + ' 显卡小时';
      /* PPO 的梯度估计：每 0.5 s 换一批，方向乱晃 */
      var k3 = Math.floor(now * 2);
      noisy.forEach(function (a, i) {
        var ang = -0.53 + (rnd(k3 * 9 + i, 3) - 0.5) * 2.4, L = 30 + 34 * rnd(k3 * 9 + i, 7);
        a.set(cx3, cy3, cx3 + Math.cos(ang) * L, cy3 + Math.sin(ang) * L, 6);
      });
      /* BPTT：先往前想象，再把梯度往回传，循环 */
      var c4 = (since(t, clock, 10.4) % 3.2) / 3.2;
      ch4.set(clamp(c4 / 0.5, 0, 1), clamp((c4 - 0.5) / 0.4, 0, 1));
      /* 1 张对 128 张：128 张那一墙慢慢变淡 */
      var u5 = clamp(since(t, clock, 13.4) / 1.6, 0, 1);
      wall5.fill(128);
      setOpacity(wall5.g, 1 - 0.6 * u5);
      one.style.opacity = 0.4 + 0.6 * Math.abs(Math.sin(now * 2.4));
      big.textContent = '> 1000 ×';
      setOpacity(big, u5);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 两条老路（表 1） ── */
  var TABLE1 = [
    ['NPMP', ['SVG(0)', 'BC', 'SVG(0)'], 'RL', false, null],
    ['ControlVAE', ['MBRL', 'MBRL', 'MBRL'], 'RL', false, [0, 1]],
    ['PhysicsVAE', ['PPO', 'BC', 'PPO'], 'RL', false, null],
    ['PULSE', ['PPO', 'DAgger', 'PPO'], 'RL', false, null],
    ['MaskedMimic', ['A2C', 'DAgger', 'DAgger'], '蒸馏', false, [1, 2]],
    ['BeyondMimic', ['PPO', 'DAgger', 'CGD'], '蒸馏', true, null],
    ['SONIC', ['PPO', 'PPO', 'PPO'], '蒸馏', true, [0, 2]],
    ['LATENT', ['PPO', 'DAgger', 'PPO'], 'RL', true, null],
    ['SuperMimic', ['MBRL', 'MBRL', 'MBRL'], '蒸馏 / RL', true, [0, 2]]
  ];
  function buildScenePaths() {
    var s = sceneSvg('左边两条路：上面一排小方框是每段动作一个专才，箭头汇进一个通才，路上有小点掉下去，表示蒸馏会丢东西；' +
      '下面是一个大策略后面一整墙显卡。右边是论文表 1 的重画：每行一个方法，三列是跟踪、潜空间、下游三步用什么训，连在一起的格子表示这几步一起训');
    s.appendChild(svgText(24, 26, '现在的两条路：都是模型无关的强化学习', 'demo-x-ink2', 13.5));
    /* 路 A：专才 + 蒸馏 */
    var pa = group(s);
    rectBox(pa, 24, 44, 380, 128, C_BORDER, C_SURFACE2);
    label(pa, 36, 64, '① 每段动作一个专才，再蒸馏成通才', 'demo-x-ink', 12.5);
    var exps = [];
    for (var i = 0; i < 6; i++) exps.push(boxText(pa, 36 + i * 44, 76, 38, 26, 'PPO', C_BASE, { size: 11 }));
    boxText(pa, 316, 104, 78, 40, '通才', C_INK, { size: 12.5 });
    var fl = [];
    for (var j = 0; j < 6; j++) fl.push(flowSeg(pa, C_BASE, 2, 3, 40));
    var drops = [];
    for (var q = 0; q < 4; q++) drops.push(dotAt(pa, 0, 0, 3, C_BAD));
    tone(pa, 36, 160, '例：之前讲过的 BeyondMimic（先专才，再蒸馏 + 扩散）', C_MUTED, 11);
    /* 路 B：一个策略 + 集群 */
    var pb = group(s);
    rectBox(pb, 24, 184, 380, 130, C_BORDER, C_SURFACE2);
    label(pb, 36, 204, '② 一个策略吃下整个动作库，靠集群硬堆', 'demo-x-ink', 12.5);
    boxText(pb, 36, 220, 90, 58, '一个大策略\nPPO', C_BASE, { size: 12 });
    var wallB = cellGrid(pb, 146, 220, 64, 16, 12, 3, C_BASE);
    tone(pb, 146, 300, '例：SONIC，128 张 L40 × 7 天', C_MUTED, 11);
    /* 右：表 1 */
    var R = 420, rows = group(s), cw = [96, 54, 54, 66, 66, 30], hdr = ['方法', '跟踪', '潜空间', '下游', '下游的信号', '真机'];
    var tbl = group(s);
    var xs = [R];
    cw.forEach(function (w) { xs.push(xs[xs.length - 1] + w); });
    hdr.forEach(function (h, c) { label(tbl, xs[c] + (c ? cw[c] / 2 : 4), 62, h, 'demo-x-mut', 11, c ? 'middle' : 'start'); });
    var rowG = TABLE1.map(function (row, r) {
      var y = 72 + r * 26, g = group(rows);
      var bg = rectBox(g, R - 2, y, 368, 24, C_BORDER, C_SURFACE);
      bg.style.strokeOpacity = 0.4;
      label(g, R + 4, y + 16, row[0], row[0] === 'SuperMimic' ? 'demo-x-ink' : 'demo-x-ink2', 11.5);
      var merged = row[4];
      if (merged) {
        var m0 = xs[1 + merged[0]], m1 = xs[2 + merged[1]];
        var mr = paint(svgEl('rect', { x: m0 + 2, y: y + 3, width: m1 - m0 - 4, height: 18, rx: 4 }), row[0] === 'SuperMimic' ? C_SM : C_GOOD);
        mr.style.opacity = 0.22; g.appendChild(mr);
        label(g, (m0 + m1) / 2, y + 16, row[1][merged[0]], 'demo-x-ink', 11.5, 'middle');
        for (var c = 0; c < 3; c++) if (c < merged[0] || c > merged[1]) label(g, xs[1 + c] + cw[1 + c] / 2, y + 16, row[1][c], 'demo-x-ink2', 11, 'middle');
      } else {
        row[1].forEach(function (v, c2) { label(g, xs[1 + c2] + cw[1 + c2] / 2, y + 16, v, 'demo-x-ink2', 11, 'middle'); });
      }
      label(g, xs[4] + cw[4] / 2, y + 16, row[2], 'demo-x-ink2', 11, 'middle');
      if (row[3]) tick(g, xs[5] + 8, y + 5, 12); else cross(g, xs[5] + 9, y + 7, 10);
      return { g: g, bg: bg };
    });
    var cap = label(s, R, 316, '读法：连在一起的格子 = 这几步一起训；没连的 = 冻住上一步再训下一步', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* 路 A：专才的小点流向通才，有几颗半路掉下去 */
      fl.forEach(function (f, i) { f.at(now + i * 0.3, [55 + i * 44, 104], [314, 124], win(t, 3.3, 7.0) > 0.05); });
      drops.forEach(function (d, i) {
        var u = ((now * 0.6 + i * 0.25) % 1);
        moveDot(d, [200 + i * 26, 116 + u * 28]);
        d.style.opacity = (1 - u) * win(t, 3.3, 7.0);
      });
      exps.forEach(function (e, i) { setOpacity(e.g, 0.4 + 0.6 * clamp(since(t, clock, 3.6) * 3 - i * 0.4, 0, 1)); });
      wallB.fill(Math.round(64 * clamp(since(t, clock, 7.0) / 1.8, 0, 1)));
      setOpacity(pa, 0.35 + 0.65 * Math.max(win(t, 0.3, 7.0), 0));
      setOpacity(pb, 0.35 + 0.65 * Math.max(win(t, 0.3, 3.6), win(t, 6.7, 10.4)));
      /* 表 1：10.4 起出现；SONIC 那行先亮，13.4 起 SuperMimic 那行亮 */
      setOpacity(tbl, win(t, 10.1));
      setOpacity(rows, win(t, 10.1));
      setOpacity(cap, win(t, 10.1));
      rowG.forEach(function (r, i) {
        var hi = (i === 6 && t < 13.4) || (i === 8 && t >= 13.4) || (i === 5 && t < 13.4);
        r.bg.style.stroke = hi ? (i === 8 ? C_SM : C_BASE) : C_BORDER;
        r.bg.style.strokeOpacity = hi ? 1 : 0.4;
        r.bg.style.strokeWidth = hi ? 2 : 1.3;
      });
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 所有动作共用一个身体 ── */
  function buildSceneShared() {
    var s = sceneSvg('左边是我们复现里同一台 G1 的三个瞬间：站着、躺在地上、正在爬起来，三支箭头都指向同一个世界模型；右边依次出现：数据从 1 小时涨到 264 小时、世界模型那个框不变大；' +
      '一串想象的状态，蓝箭头往前、绿虚线把梯度往回传；仿真器不可导、世界模型可导；两个学习器绕成一个圈');
    s.appendChild(svgText(24, 26, '动作千差万别，身体只有一个', 'demo-x-ink2', 13.5));
    var g1s = [0, 36, 74].map(function () { return g1Sprite(s, 'fall_sim'); });
    var wmBox = boxText(s, 92, 262, 240, 42, '一个世界模型 $f_\\omega$：共享的身体与接触', C_WM, { size: 12.5 });
    var arrs = [0, 1, 2].map(function () { return arrow(s, C_MUTED, 1.6); });
    label(s, 24, 324, '我们的复现：Uni-SuperMimic 放出的模型，在 MuJoCo 里跟 LAFAN1 的摔倒再起身', 'demo-x-mut', 11);
    var R = 424;
    var p1 = group(s);
    label(p1, R, 62, '一个模型，摊薄到所有动作', 'demo-x-ink', 14);
    label(p1, R, 86, '数据（小时）', 'demo-x-ink2', 12);
    rectBox(p1, R, 96, 340, 14, C_BORDER, C_SURFACE2);
    var dataBar = hbar(p1, R, 96, 14, C_BASE);
    var dataT = label(p1, R + 340, 132, '', 'demo-x-ink', 13, 'end');
    label(p1, R, 160, '世界模型的大小', 'demo-x-ink2', 12);
    boxText(p1, R, 170, 120, 40, 'MLP 3 × 2048', C_WM, { size: 12 });
    label(p1, R + 132, 196, '不变', 'demo-x-mut', 12);
    label(p1, R, 244, '新动作带来的是同一个身体的更多证据，', 'demo-x-ink2', 12);
    label(p1, R, 264, '不是要学的新东西', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 62, '在想象里求导：BPTT', 'demo-x-ink', 14);
    var ch2 = chainBPTT(p2, R + 20, 128, 320, 5, { names: ['s0', 's1', 's2', 's3', 's4'], rewards: true });
    tone(p2, R, 206, '→ 世界模型往前推一步一步', C_WM, 12);
    tone(p2, R, 228, '⇠ 每一步的回报对动作求导，沿时间往回传', C_GRAD, 12);
    label(p2, R, 258, 'BPTT：Backpropagation Through Time，时间反向传播', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 62, '梯度不经过仿真器', 'demo-x-ink', 14);
    boxText(p3, R, 84, 150, 58, 'MuJoCo Warp\n不可导、接触不光滑', C_SIM, { size: 12 });
    cross(p3, R + 132, 90, 12, C_BAD);
    boxText(p3, R + 200, 84, 150, 58, '世界模型\n可导', C_WM, { size: 12 });
    tick(p3, R + 330, 90, 13, C_GRAD);
    var d3 = flowSeg(p3, C_SIM, 3, 3.4, 50);
    label(p3, R + 158, 104, '日志', 'demo-x-mut', 11);
    var g3 = arrow(p3, C_GRAD, 2, '4 3');
    g3.set(R + 274, 150, R + 274, 196, 8);
    boxText(p3, R + 214, 200, 120, 34, '策略 $\\pi_\\theta$', C_INK, { size: 12 });
    label(p3, R, 268, '所以仿真器照用标准的，不需要可微仿真', 'demo-x-ink2', 12);
    var p4 = group(s);
    label(p4, R, 62, '两个学习器，一个循环', 'demo-x-ink', 14);
    var cA = [R + 90, 168], cB = [R + 270, 168];
    boxText(p4, cA[0] - 64, cA[1] - 26, 128, 52, '世界模型\n越学越准', C_WM, { size: 12 });
    boxText(p4, cB[0] - 64, cB[1] - 26, 128, 52, '策略\n越学越好', C_INK, { size: 12 });
    var fl4a = flowSeg(p4, C_WM, 3, 3.4, 50), fl4b = flowSeg(p4, C_INK, 3, 3.4, 50);
    tone(p4, R + 180, 124, '想象、梯度', C_WM, 11, 'middle');
    tone(p4, R + 180, 222, '新的数据', C_SIM, 11, 'middle');
    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* 三个瞬间：站着、躺下、爬起，各自有一点动 */
      var fr = [0, 40, 80].map(function (b, i) { return b + Math.floor((now * 4 + i * 2) % 8); });
      g1s.forEach(function (sp, i) {
        var x = 14 + i * 122, y = 52;
        sp.put(x, y, 0.56, fr[i]);
        arrs[i].set(x + 78, y + 158, 212 + (i - 1) * 50, 258, 7);
      });
      var u1 = clamp(since(t, clock, 3.6) / 2.6, 0, 1), hours = Math.pow(264, u1);
      setW(dataBar, 340 * Math.log(hours + 1) / Math.log(265));
      dataT.textContent = (hours < 10 ? f1(hours) : Math.round(hours)) + ' 小时';
      var c2 = (since(t, clock, 7.0) % 3.2) / 3.2;
      ch2.set(clamp(c2 / 0.5, 0, 1), clamp((c2 - 0.5) / 0.4, 0, 1));
      d3.at(now, [R + 152, 113], [R + 198, 113], win(t, 10.1, 13.4) > 0.05);
      fl4a.at(now, [R + 156, 150], [R + 204, 150], true);
      fl4b.at(now, [R + 204, 186], [R + 156, 186], true);
      setOpacity(wmBox.g, 0.6 + 0.4 * Math.abs(Math.sin(now * 1.5)));
      setOpacity(p1, win(t, 0.3, 7.0));
      setOpacity(p2, win(t, 7.0, 10.4));
      setOpacity(p3, win(t, 10.4, 13.4));
      setOpacity(p4, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 一个循环，两个学习器（图 2） ── */
  function tagChip(parent, x, y, str, color) {
    var g = group(parent), w = textW(str, 11) + 14;
    var r = rectBox(g, x, y, w, 18, color, C_SURFACE);
    r.setAttribute('rx', 9);
    tone(g, x + w / 2, y + 13, str, color, 11, 'middle');
    return g;
  }
  function buildSceneLoop() {
    var s = sceneSvg('论文图 2 的重画：三块面板从左到右是采数据、拟合世界模型、改进策略，下面一条是回放缓冲区，上面一支箭头从第三块绕回第一块表示下一轮；' +
      '讲到哪一步就框亮哪一块，小点沿数据的方向走，绿色虚线是梯度；冻结的网络标灰色「冻结」，正在训的标黄色「训练」');
    s.appendChild(svgText(24, 26, '论文图二：每一轮三步', 'demo-x-ink2', 13.5));
    var P = [24, 284, 544], W = 232, Y = 56, H = 170;
    var panels = ['① 采数据', '② 拟合世界模型', '③ 改进策略'].map(function (t0, i) {
      var g = group(s), r = rectBox(g, P[i], Y, W, H, C_BORDER, C_SURFACE2);
      label(g, P[i] + 10, Y + 20, t0, 'demo-x-ink', 13);
      return { g: g, r: r };
    });
    /* 面板 1 */
    var a1 = P[0];
    label(s, a1 + 14, Y + 58, '目标 $g_t$', 'demo-x-ink2', 11.5);
    var pi1 = boxText(s, a1 + 82, Y + 40, 64, 30, '策略 $\\pi_\\theta$', C_INK, { size: 11.5 });
    tagChip(s, a1 + 150, Y + 46, '冻结', C_MUTED);
    var sim1 = boxText(s, a1 + 82, Y + 100, 64, 30, '仿真器', C_SIM, { size: 11.5 });
    tone(s, a1 + 106, Y + 90, '$a_t+\\epsilon_t$', C_BASE, 11.5, 'end');
    label(s, a1 + 156, Y + 96, '$o_{t+1}$', 'demo-x-mut', 11);
    var f1a = flowSeg(s, C_INK, 2, 3, 30), f1b = flowSeg(s, C_SIM, 2, 3, 30), f1c = flowSeg(s, C_SIM, 3, 3.2, 40);
    label(s, a1 + 124, Y + 147, '存进缓冲区：', 'demo-x-mut', 11);
    label(s, a1 + 124, Y + 165, '$(s_t,\\ a_t+\\epsilon_t,\\ \\xi)$', 'demo-x-mut', 11);
    /* 面板 2 */
    var a2 = P[1];
    var wm2 = boxText(s, a2 + 70, Y + 92, 90, 32, '世界模型 $f_\\omega$', C_WM, { size: 11.5 });
    tagChip(s, a2 + 166, Y + 99, '训练', C_BASE);
    var win8 = [];
    for (var k = 0; k <= 8; k++) win8.push(dotAt(s, a2 + 22 + k * 23, Y + 60, 4.5, C_SIM));
    var pred8 = [];
    for (var k2 = 1; k2 <= 8; k2++) pred8.push(ringAt(s, a2 + 22 + k2 * 23, Y + 60, 5.5, C_WM, 1.8));
    label(s, a2 + 12, Y + 40, '抽 $k=8$ 步的片段，自回归地往前推', 'demo-x-mut', 11);
    tone(s, a2 + 124, Y + 144, '和日志比：误差', C_WM, 11);
    tone(s, a2 + 124, Y + 164, '加起来就是 $\\mathcal{L}_{\\mathrm{WM}}$', C_WM, 11);
    var g2 = arrow(s, C_GRAD, 2, '4 3');
    /* 面板 3 */
    var a3 = P[2];
    var pi3 = boxText(s, a3 + 20, Y + 40, 70, 30, '策略 $\\pi_\\theta$', C_INK, { size: 11.5 });
    tagChip(s, a3 + 96, Y + 46, '训练', C_BASE);
    var wm3 = boxText(s, a3 + 20, Y + 100, 70, 30, '$f_\\omega$', C_WM, { size: 11.5 });
    tagChip(s, a3 + 96, Y + 106, '冻结', C_MUTED);
    boxText(s, a3 + 150, Y + 74, 72, 30, '评论家 $V_\\psi$', C_CRIT, { size: 11 });
    var dots3 = [];
    for (var q = 0; q < 6; q++) dots3.push(dotAt(s, a3 + 30 + q * 32, Y + 145, 4, C_WM));
    tone(s, a3 + 66, Y + 166, '想象 $H=32$ 步，回报反传', C_GRAD, 11);
    var g3 = arrow(s, C_GRAD, 2, '4 3');
    var f3a = flowSeg(s, C_INK, 2, 3, 30), f3b = flowSeg(s, C_WM, 2, 3, 30);
    /* 缓冲区 */
    var bufG = group(s);
    var buf = rectBox(bufG, 24, 244, 752, 26, C_BORDER, C_SURFACE);
    var cells = [];
    for (var c = 0; c < 40; c++) cells.push(paint(svgEl('rect', { x: 28 + c * 18.6, y: 248, width: 15, height: 18, rx: 2 }), C_SIM));
    cells.forEach(function (r) { bufG.appendChild(r); });
    label(s, 400, 290, '回放缓冲区 $\\mathcal{B}$：每个环境存 1000 步，新的挤掉最旧的', 'demo-x-ink2', 12, 'middle');
    var up2 = flowSeg(s, C_SIM, 2, 3, 30), up3 = flowSeg(s, C_SIM, 2, 3, 30);
    /* 下一轮 */
    var nextA = pathLine(s, [[a3 + W / 2, Y], [a3 + W / 2, 42], [a1 + W / 2, 42], [a1 + W / 2, Y - 2]], C_MUTED, 1.5, '5 4');
    void nextA;
    label(s, 400, 38, '下一轮', 'demo-x-mut', 11, 'middle');
    var foot = label(s, 24, 318, '', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var focus = t < 3.6 ? 0 : t < 7.0 ? 3 : t < 10.4 ? 1 : t < 13.4 ? 2 : 4;
      panels.forEach(function (p, i) {
        var on = focus === i || focus === 4;
        p.r.style.stroke = on ? (i === 2 ? C_GRAD : i === 1 ? C_WM : C_SIM) : C_BORDER;
        p.r.style.strokeWidth = on ? 2.4 : 1.3;
        setOpacity(p.g, on || focus === 3 ? 1 : 0.55);
      });
      buf.style.stroke = focus === 3 || focus === 4 ? C_SIM : C_BORDER;
      buf.style.strokeWidth = focus === 3 ? 2.4 : 1.3;
      /* 面板 1：策略 → 仿真器 → 观测回到策略；仿真器 → 缓冲区 */
      f1a.at(now, [a1 + 114, Y + 72], [a1 + 114, Y + 98], true);
      f1b.at(now, [a1 + 148, Y + 112], [a1 + 148, Y + 60], true);
      f1c.at(now, [a1 + 114, Y + 132], [a1 + 114, 242], true);
      /* 缓冲区：写指针一格格往前走，新写的格子亮，最旧的被盖掉 */
      var ptr = Math.floor(now * 6) % 40;
      cells.forEach(function (r, i) { var age = (ptr - i + 40) % 40; r.style.opacity = 0.25 + 0.75 * (1 - age / 40); });
      /* 面板 2：8 步窗口里，预测（蓝圈）一点点偏离日志（白点） */
      var u2 = (since(t, clock, 7.0) % 2.6) / 2.6;
      pred8.forEach(function (r, i) {
        var on = u2 * 9 > i + 1;
        r.style.opacity = on ? 1 : 0;
        moveDot(r, [a2 + 22 + (i + 1) * 23, Y + 60 + Math.sin(i * 1.3) * (i + 1) * 0.9]);
      });
      g2.set(a2 + 115, Y + 88, a2 + 115, Y + 70, 7);
      setOpacity(g2.g, u2 > 0.85 ? 1 : 0.3);
      up2.at(now, [a2 + 115, 242], [a2 + 115, Y + 126], true);
      up3.at(now, [a3 + 55, 242], [a3 + 55, Y + 151], true);
      /* 面板 3：策略 ⇄ 世界模型往前想象，梯度沿反方向回到策略 */
      var u3 = (since(t, clock, 10.4) % 3.0) / 3.0;
      dots3.forEach(function (d, i) { d.style.opacity = u3 * 6 > i ? 1 : 0.15; });
      f3a.at(now, [a3 + 50, Y + 72], [a3 + 50, Y + 98], true);
      f3b.at(now, [a3 + 64, Y + 98], [a3 + 64, Y + 72], true);
      g3.set(a3 + 98, Y + 96, a3 + 98, Y + 76, 7);
      setOpacity(g3.g, u3 > 0.6 ? 1 : 0.25);
      foot.textContent = t < 7.0 ? '第一步：当前的策略在仿真器里跑，动作加噪声' : t < 10.4 ? '第二步：只训世界模型' : t < 13.4 ? '第三步：世界模型冻住，只训策略和评论家' : '两个都每轮更新：世界模型只在第三步里被冻住';
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: 策略看什么、做什么（表 A.1） ── */
  function buildSceneIO() {
    var s = sceneSvg('左边是我们复现里的 G1 正在往下倒，身前叠着蓝色半透明的参考动作：未来 10 帧（0.2 秒）的参考，越远越淡；' +
      '右边依次出现：93 维的观测分成五段、十帧历史像纸带一样往左走；未来 10 帧的目标；动作乘缩放加默认姿态得到关节设定点，弹簧把关节拉向设定点；' +
      '噪声在世界模型外面加；采数据时动作的噪声直方图');
    s.appendChild(svgText(24, 26, '策略：看本体感受和未来 10 帧，出 29 个关节设定点', 'demo-x-ink2', 13.5));
    var ghosts = [5, 4, 3, 2, 1].map(function (d) { return g1Sprite(s, 'fall_ref', { opacity: 0.12 + 0.07 * (5 - d) }); });
    var bot = g1Sprite(s, 'fall_sim');
    var grid5 = groundGrid(s, bot, 24, 44, 380, 260);
    s.insertBefore(grid5.g, ghosts[0].g);
    label(s, 24, 330, '白色 = 机器人（仿真）；蓝色半透明 = 未来 0.04–0.20 秒的参考', 'demo-x-mut', 11);
    var R = 424;
    var p1 = group(s);
    label(p1, R, 62, '观测：本体感受，每帧 93 维', 'demo-x-ink', 14);
    var segs = [['关节角', 29, C_ACCENT], ['关节速度', 29, C_GOOD], ['角速度', 3, C_WARN], ['重力', 3, C_PURPLE], ['上一步动作', 29, C_MUTED]];
    var x0 = R, sc = 340 / 93;
    segs.forEach(function (g0) {
      var w = g0[1] * sc;
      var r = paint(svgEl('rect', { x: x0, y: 76, width: w - 2, height: 18, rx: 3 }), g0[2]);
      p1.appendChild(r);
      if (g0[1] > 10) label(p1, x0 + w / 2, 112, g0[0] + ' ' + g0[1], 'demo-x-ink2', 11, 'middle');
      else if (g0[0] === '角速度') label(p1, x0 + w - 3, 136, g0[0] + ' ' + g0[1], 'demo-x-mut', 11, 'end');
      else label(p1, x0 + 3, 136, g0[0] + ' ' + g0[1], 'demo-x-mut', 11, 'start');
      x0 += w;
    });
    label(p1, R, 168, '看最近 10 帧（0.2 秒）', 'demo-x-ink2', 12);
    var tape = [];
    for (var i = 0; i < 12; i++) tape.push(paint(svgEl('rect', { x: 0, y: 180, width: 24, height: 30, rx: 3 }), C_ACCENT));
    tape.forEach(function (r) { p1.appendChild(r); });
    var tapeBox = rectBox(p1, R + 64, 176, 284, 38, C_INK, 'none');
    tapeBox.style.fill = 'none';
    label(p1, R, 240, '复现代码另加 6 维：和参考根部的相对朝向（99 维）', 'demo-x-mut', 11);
    var p2 = group(s);
    label(p2, R, 62, '目标：未来 10 帧的参考动作', 'demo-x-ink', 14);
    var fut = [];
    for (var j = 1; j <= 10; j++) {
      var bx = R + (j - 1) * 34;
      var rr = paint(svgEl('rect', { x: bx, y: 80, width: 30, height: 30, rx: 4 }), C_WM);
      p2.appendChild(rr);
      label(p2, bx + 15, 100, String(j), 'demo-x-ink', 11.5, 'middle');
      fut.push(rr);
    }
    label(p2, R, 132, '每帧 73 维：根部的相对位移、朝向、速度，29 个关节角和速度', 'demo-x-ink2', 11.5);
    label(p2, R, 156, '50 Hz：10 帧 = 往后看 0.2 秒', 'demo-x-ink2', 12);
    tone(p2, R, 190, '之前讲过的 BeyondMimic：只看 1 帧', C_BASE, 12);
    var one2 = paint(svgEl('rect', { x: R + 220, y: 176, width: 30, height: 20, rx: 4 }), C_BASE);
    p2.appendChild(one2);
    var p3 = group(s);
    label(p3, R, 62, '动作：29 个关节设定点', 'demo-x-ink', 14);
    math(p3, R, 98, 'q^{\\mathrm{sp}} = \\alpha\\, a_t + q^{0}', 16);
    label(p3, R + 186, 94, '默认姿态 + 缩放 × 动作', 'demo-x-mut', 11);
    var jc = [R + 90, 196], jr = 64;
    ringAt(p3, jc[0], jc[1], 6, C_INK, 2);
    var spLine = hline(p3, 0, 0, 0, 0, C_INK, 5), spSet = hline(p3, 0, 0, 0, 0, C_BASE, 2, '5 4');
    var spr = spring(p3, C_GOOD, 5, 4);
    legendRow(p3, R + 176, 154, [['设定点', C_BASE, 40, '5 4']], 11.5);
    legendRow(p3, R + 176, 176, [['关节实际的角度', C_INK, 84, 'line']], 11.5);
    tone(p3, R + 176, 198, 'PD 像弹簧，把关节往设定点拉', C_GOOD, 11.5);
    label(p3, R + 176, 226, '增益很低：设定点更像力矩', 'demo-x-ink2', 11.5);
    label(p3, R + 176, 246, '（照 BeyondMimic）', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 62, '噪声在世界模型外面加', 'demo-x-ink', 14);
    boxText(p4, R, 82, 120, 40, '世界模型', C_WM, { size: 12 });
    boxText(p4, R + 236, 82, 104, 40, '策略', C_INK, { size: 12 });
    var plus = ringAt(p4, R + 178, 102, 13, C_BASE, 2);
    void plus;
    tone(p4, R + 178, 107, '+', C_BASE, 16, 'middle');
    label(p4, R + 60, 142, '输出无噪声的 $\\hat{\\bar{o}}_t$', 'demo-x-mut', 11, 'middle');
    tone(p4, R + 186, 154, '$\\eta_t$', C_BASE, 12);
    var f4a = flowSeg(p4, C_WM, 2, 3, 40), f4b = flowSeg(p4, C_INK, 2, 3, 40), f4c = flowSeg(p4, C_BASE, 2, 3, 30);
    var noiseRows = [['关节角', 0.01, 'rad'], ['关节速度', 0.5, 'rad/s'], ['角速度', 0.2, 'rad/s'], ['重力方向', 0.05, '']];
    var nr = noiseRows.map(function (n0, i) {
      var y = 176 + i * 26;
      label(p4, R, y + 4, n0[0], 'demo-x-ink2', 11.5);
      hline(p4, R + 90, y, R + 250, y, C_BORDER, 1.2);
      var band = paint(svgEl('rect', { x: R + 130, y: y - 4, width: 80, height: 8, rx: 4 }), C_BASE);
      band.style.opacity = 0.3; p4.appendChild(band);
      label(p4, R + 260, y + 4, '±' + n0[1] + ' ' + n0[2], 'demo-x-ink', 11.5);
      return dotAt(p4, R + 170, y, 4, C_BASE);
    });
    var p5 = group(s);
    label(p5, R, 62, '采数据时，动作再加一层噪声', 'demo-x-ink', 14);
    math(p5, R, 96, '\\epsilon_t \\sim \\mathcal{N}(0,\\ 0.1^2)', 15);
    var hb = [];
    for (var b = 0; b < 21; b++) hb.push(vbar(p5, R + 20 + b * 15, 12, C_BASE));
    hline(p5, R + 14, 230, R + 340, 230, C_BORDER, 1.2);
    label(p5, R + 177, 248, '每一维的噪声（横轴 −0.3 到 0.3）', 'demo-x-mut', 11, 'middle');
    label(p5, R, 276, '只为让世界模型见到更多种动作；策略本身是确定的', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* 机器人往下倒：第 20–44 帧（4.8–5.8 s）来回放，参考的未来 1–5 帧（每帧 2 步）叠在身前 */
      var f = 20 + Math.round(((now * 6) % 48 < 24 ? (now * 6) % 48 : 48 - (now * 6) % 48));
      bot.put(74, 22, 1.0, f);
      ghosts.forEach(function (gs, i) { gs.put(74, 22, 1.0, Math.min(200, f + 5 - i)); });
      grid5.draw(f);
      /* 观测纸带往左走 */
      var off = (now * 20) % 28;
      tape.forEach(function (r, i) {
        var x = R + 64 + 284 - (i * 28) - off + 28;
        r.setAttribute('x', x.toFixed(1));
        r.style.opacity = x > R + 62 && x < R + 340 ? 0.85 : x + 24 > R + 364 || x < R + 30 ? 0 : 0.18;
      });
      fut.forEach(function (r, i) { r.style.opacity = 0.25 + 0.75 * clamp(since(t, clock, 3.6) * 4 - i * 0.3, 0, 1) * (1 - i * 0.06); });
      /* 关节：设定点在摆，实际角度慢一拍跟着走 */
      var sp = 0.6 * Math.sin(now * 1.6), act = 0.6 * Math.sin(now * 1.6 - 0.7) * 0.8;
      setLine(spSet, jc[0], jc[1], jc[0] + Math.cos(sp - 1.2) * jr, jc[1] + Math.sin(sp - 1.2) * jr);
      setLine(spLine, jc[0], jc[1], jc[0] + Math.cos(act - 1.2) * jr * 0.92, jc[1] + Math.sin(act - 1.2) * jr * 0.92);
      spr.set(jc[0] + Math.cos(act - 1.2) * jr * 0.92, jc[1] + Math.sin(act - 1.2) * jr * 0.92, jc[0] + Math.cos(sp - 1.2) * jr, jc[1] + Math.sin(sp - 1.2) * jr);
      f4a.at(now, [R + 124, 102], [R + 162, 102], true);
      f4b.at(now, [R + 194, 102], [R + 232, 102], true);
      f4c.at(now, [R + 178, 136], [R + 178, 118], true);
      nr.forEach(function (d, i) { moveDot(d, [R + 130 + 80 * rnd(Math.floor(now * 3) * 4 + i, 5), 176 + i * 26]); });
      /* 噪声直方图：一格格长成钟形 */
      var u5 = clamp(since(t, clock, 13.4) / 2, 0, 1);
      hb.forEach(function (v, i) { var z = (i - 10) / 10 * 0.3; v.set(230, 120 * Math.exp(-z * z / (2 * 0.01)) * u5 * (0.85 + 0.15 * rnd(i, 9))); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 世界模型：学一步的增量 ── */
  function buildSceneWM() {
    var s = sceneSvg('左边是世界模型的结构：状态 71 维、动作 29 维、仿真上下文 33 维进同一个三层、每层 2048 的网络，出 70 维的增量，加到当前状态上得到下一步；' +
      '右边依次出现：上下文里的三类随机化参数在各自的区间里跳；朝向坐标系（x 红、y 绿、z 蓝）；奖励、观测、终止三个头；八步的片段：白点是日志、蓝圈是模型自己往前推的预测；' +
      '最后是我们在复现模型上量的误差随步数长大的曲线');
    s.appendChild(svgText(24, 26, '世界模型：给定状态、动作、上下文，预测下一步', 'demo-x-ink2', 13.5));
    var L = group(s);
    var inB = [['状态 $\\hat{s}_t$ · 71', C_SIM], ['动作 $a_t$ · 29', C_INK], ['上下文 $\\xi$ · 33', C_BASE]].map(function (b0, i) {
      return boxText(L, 24, 60 + i * 52, 120, 40, b0[0], b0[1], { size: 11.5 });
    });
    void inB;
    var mlp = boxText(L, 176, 92, 96, 96, 'MLP\n3 × 2048\nSiLU\nLayerNorm', C_WM, { size: 11.5 });
    void mlp;
    var outB = boxText(L, 300, 112, 100, 56, '增量 $\\Delta$\n70 维', C_WM, { size: 11.5 });
    void outB;
    var fls = [0, 1, 2].map(function () { return flowSeg(L, C_MUTED, 2, 3, 40); });
    var flo = flowSeg(L, C_WM, 2, 3, 40);
    var back = pathLine(L, [[350, 170], [350, 230], [12, 230], [12, 80], [22, 80]], C_WM, 1.4, '5 4');
    void back;
    label(L, 214, 246, '下一步 = 当前 + $\\Delta$，再喂回去', 'demo-x-ink2', 11.5, 'middle');
    label(L, 24, 276, '状态 71 维：根部高度、相对朝向的倾斜（6 维）、身体系里的线速度与角速度、', 'demo-x-mut', 11);
    label(L, 24, 296, '29 个关节角与速度；水平位置和朝向不进网络，只在增量里换算', 'demo-x-mut', 11);
    label(L, 24, 318, '结构取自 Uni-SuperMimic 的代码（论文只说是 MLP 3 × 2048）', 'demo-x-mut', 11);
    var R = 424;
    var p1 = group(s);
    label(p1, R, 62, '确定性：随机性都当成输入', 'demo-x-ink', 14);
    var rr = [rangeRow(p1, R, 96, 360, '摩擦', 0.3, 1.2, 0, 1.4, function (v) { return f2(v); }, C_BASE),
      rangeRow(p1, R, 132, 360, '关节零点', -0.01, 0.01, -0.02, 0.02, function (v) { return sgn(f3(v)) + ' rad'; }, C_BASE),
      rangeRow(p1, R, 168, 360, '质心 x', -0.025, 0.025, -0.06, 0.06, function (v) { return sgn(f3(v)) + ' m'; }, C_BASE),
      rangeRow(p1, R, 204, 360, '质心 y、z', -0.05, 0.05, -0.06, 0.06, function (v) { return sgn(f3(v)) + ' m'; }, C_BASE)];
    label(p1, R, 244, '每回合抽一次，记作仿真上下文 $\\xi$（33 维）', 'demo-x-ink2', 12);
    label(p1, R, 266, '模型预测的是无噪声的观测', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 62, '学的是增量，不是整个状态', 'demo-x-ink', 14);
    var axes = K.svgAxes({ len: 46, size: 12 });
    p2.appendChild(axes.g);
    var head = paint(svgEl('path', { d: 'M 0 0', fill: 'none', 'stroke-width': 1.4 }), null, C_MUTED);
    p2.insertBefore(head, axes.g);
    /* 骨盆的方框（示意）和身体朝前的白箭头：先左右转身，再前倾、侧倒 */
    var bodyP = paint(svgEl('path', { d: 'M 0 0', 'stroke-width': 1.6, 'stroke-linejoin': 'round', 'fill-opacity': 0.12 }), C_MUTED, C_MUTED);
    p2.insertBefore(bodyP, axes.g);
    var fwd = arrow(p2, C_INK, 2.4);
    label(p2, R + 150, 100, '位置的增量写在「朝向系」里', 'demo-x-ink2', 11.5);
    var ph1 = tone(p2, R + 150, 124, '转身：朝向系跟着转', C_GOOD, 11.5);
    var ph2 = tone(p2, R + 150, 146, '前倾、侧倾：它保持水平', C_GOOD, 11.5);
    label(p2, R + 150, 168, 'z 轴一直朝上', 'demo-x-ink2', 11.5);
    legendRow(p2, R + 150, 192, [['身体朝前的方向', C_INK, 84, 'line'], ['骨盆（示意）', C_MUTED, 66]], 11);
    var phT = label(p2, R + 70, 214, '', 'demo-x-mut', 11, 'middle');
    label(p2, R, 240, '旋转、速度的增量写在身体系里；关节直接加', 'demo-x-ink2', 12);
    label(p2, R, 262, '同一个动作换个方向走，输入输出都一样', 'demo-x-ink2', 12);
    var p3 = group(s);
    label(p3, R, 62, '再配三个头：可以学，也可以按公式算', 'demo-x-ink', 14);
    boxText(p3, R, 124, 82, 46, '状态 $\\hat{s}_t$', C_WM, { size: 12 });
    var hdF = [['奖励 $\\hat{r}$', '和参考动作比'], ['观测 $\\hat{\\bar{o}}$', '从状态里取出来'], ['终止 $\\hat{d}$', '高度、倾斜 → 概率']].map(function (h0, i) {
      var y = 76 + i * 56;
      boxText(p3, R + 116, y, 100, 38, h0[0], C_WM, { size: 12 });
      label(p3, R + 236, y + 52, h0[1], 'demo-x-mut', 11);
      return flowSeg(p3, C_WM, 2, 3, 50);
    });
    rectBox(p3, R + 236, 89, 100, 12, C_BORDER, 'none').style.fill = 'none';
    var rwB = hbar(p3, R + 236, 89, 12, C_GOOD), rwT = label(p3, R + 344, 100, '', 'demo-x-ink2', 11.5);
    var obB = [];
    for (var ob = 0; ob < 7; ob++) obB.push(vbar(p3, R + 236 + ob * 14, 10, C_ACCENT));
    var tsLine = hline(p3, 0, 0, 0, 0, C_INK, 3), tsBase = dotAt(p3, R + 246, 216, 3, C_INK);
    void tsBase;
    rectBox(p3, R + 272, 202, 40, 10, C_BORDER, 'none').style.fill = 'none';
    var tmB = hbar(p3, R + 272, 202, 10, C_BAD), tmT = label(p3, R + 318, 212, '', 'demo-x-ink2', 11.5);
    label(p3, R, 248, 'Uni-SuperMimic 三个头都按公式算，', 'demo-x-ink2', 12);
    label(p3, R, 268, '网络只学动力学', 'demo-x-ink2', 12);
    var p4 = group(s);
    label(p4, R, 62, '训练：从日志出发，自己推 8 步', 'demo-x-ink', 14);
    var logD = [], predD = [], errL = [];
    for (var i = 0; i <= 8; i++) logD.push(dotAt(p4, R + 20 + i * 40, 150, 5, C_SIM));
    for (var j = 1; j <= 8; j++) { errL.push(hline(p4, 0, 0, 0, 0, C_BAD, 1.4)); predD.push(ringAt(p4, 0, 0, 6, C_WM, 2)); }
    label(p4, R, 196, '白点 = 记录下的真实状态；蓝圈 = 模型的预测', 'demo-x-ink2', 11.5);
    label(p4, R, 216, '红线 = 误差；8 步都算进损失', 'demo-x-ink2', 11.5);
    math(p4, R, 252, '\\mathcal{L}_{\\mathrm{WM}} = \\textstyle\\sum_{j=1}^{8} \\lVert \\hat{s}_j - s_j \\rVert^2 + \\cdots', 14);
    var p5 = group(s);
    label(p5, R, 62, '我们量的：推得越远，误差越大', 'demo-x-ink', 14);
    var E = REPRO.err8, keys = ['walk1_subject1', 'sprint1_subject2', 'jumps1_subject1', 'dance2_subject1', 'fallAndGetUp1_subject1'];
    var maxE = 0.4;
    var ch5 = chart(p5, R + 40, 100, 300, 112, { x0: 1, x1: 8, y0: 0, y1: maxE, xt: [[1, '1'], [2, '2'], [4, '4'], [6, '6'], [8, '8']], yt: [[0, '0'], [0.2, '0.2'], [0.4, '0.4']], xl: '往前推的步数（每步 0.02 秒）' });
    var lines5 = keys.map(function (k, i) {
      var pts = E[k].perK.map(function (v, j) { return [j + 1, v]; });
      return ch5.line(pts, [C_GOOD, C_ACCENT, C_WARN, C_PURPLE, C_BAD][i], 1.8, null, 1);
    });
    label(p5, R + 40, 88, '归一化误差', 'demo-x-mut', 11);
    legendRow(p5, R, 270, [['走路', C_GOOD, 24, 'line'], ['冲刺', C_ACCENT, 24, 'line'], ['跳跃', C_WARN, 24, 'line']], 11);
    legendRow(p5, R, 290, [['跳舞', C_PURPLE, 24, 'line'], ['摔倒再起身', C_BAD, 60, 'line']], 11);
    var leg5 = label(p5, R, 316, '', 'demo-x-ink2', 11.5);
    label(p5, R, 336, '每段动作从仿真里取 373 个起点，喂同样的动作往前推', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      fls.forEach(function (f, i) { f.at(now + i * 0.2, [146, 80 + i * 52], [174, 140], true); });
      flo.at(now, [274, 140], [298, 140], true);
      rr.forEach(function (r0, i) { r0.at(now, 31 + i, 0.9); });
      /* 朝向系：前 4 秒机器人左右转身，x、y 跟着转；后 4 秒前倾、侧倒，朝向系保持水平，z 一直朝上 */
      var o2 = [R + 70, 166], tau = since(t, clock, 3.6) % 8, yaw = 0, pit = 0, rol = 0;
      if (tau < 4) yaw = 0.75 * Math.sin(Math.PI * tau / 2);
      else if (tau < 6) pit = 0.55 * Math.pow(Math.sin(Math.PI * (tau - 4) / 2), 2);
      else rol = 0.5 * Math.pow(Math.sin(Math.PI * (tau - 6) / 2), 2);
      var turning = tau < 4;
      ph1.style.opacity = turning ? 1 : 0.35; ph2.style.opacity = turning ? 0.35 : 1;
      phT.textContent = turning ? '左右转身' : tau < 6 ? '往前倾' : '往旁边侧倾';
      var cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit), cr = Math.cos(rol), sr = Math.sin(rol);
      /* R = Rz(yaw) · Ry(pit) · Rx(rol)；pit > 0 时身体前方往下倾 */
      function rot(v) {
        var x1 = v[0], y1 = cr * v[1] - sr * v[2], z1 = sr * v[1] + cr * v[2];
        var x2 = cp * x1 + sp * z1, z2 = -sp * x1 + cp * z1;
        return [cyw * x2 - syw * y1, syw * x2 + cyw * y1, z2];
      }
      var CY = 0.8, SPC = Math.sin(0.35), CPC = Math.cos(0.35), KS = 46;
      function scr(v) { return [-Math.sin(CY) * v[0] + Math.cos(CY) * v[1], -(-Math.cos(CY) * SPC * v[0] - Math.sin(CY) * SPC * v[1] + CPC * v[2])]; }
      function at(v) { var q = scr(v); return [o2[0] + KS * q[0], o2[1] + KS * q[1]]; }
      axes.set(o2, scr([cyw, syw, 0]), scr([-syw, cyw, 0]), scr([0, 0, 1]));
      var e1 = [], N = 40;
      for (var q = 0; q <= N; q++) { var a = q / N * Math.PI * 2; e1.push(at([Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0])); }
      setPath(head, e1);
      var hx = 0.32, hy = 0.42, hz = 0.2, zc = 0.62, cs = [];
      [-1, 1].forEach(function (a1) { [-1, 1].forEach(function (b1) { [-1, 1].forEach(function (c1) { cs.push([a1 * hx, b1 * hy, zc + c1 * hz]); }); }); });
      var P = cs.map(function (c0) { return at(rot(c0)); }), d = '';
      [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(function (e) {
        d += 'M' + P[e[0]][0].toFixed(1) + ' ' + P[e[0]][1].toFixed(1) + 'L' + P[e[1]][0].toFixed(1) + ' ' + P[e[1]][1].toFixed(1);
      });
      bodyP.setAttribute('d', d);
      var c0 = at(rot([0, 0, zc])), c1 = at(rot([0.95, 0, zc]));
      fwd.set(c0[0], c0[1], c1[0], c1[1], 8);
      /* 三个头：状态流进去；奖励在 0.7–0.9 之间变，观测的几个分量一起抖，身体越歪终止概率越大 */
      hdF.forEach(function (f, i) { f.at(now + i * 0.3, [R + 84, 147], [R + 114, 95 + i * 56], t >= 7.0 && t < 10.7); });
      var rv = 0.8 + 0.1 * Math.sin(now * 1.3);
      setW(rwB, 100 * rv); rwT.textContent = f2(rv);
      obB.forEach(function (b, i) { var hh = 6 + 16 * (0.5 + 0.5 * Math.sin(now * 2 + i * 1.7)); b.set(160, hh); });
      var tilt = 1.25 * Math.abs(Math.sin(now * 0.7)), pT = 1 / (1 + Math.exp(-(tilt - 0.95) * 9));
      setLine(tsLine, R + 246, 216, R + 246 + Math.sin(tilt) * 26, 216 - Math.cos(tilt) * 26);
      setW(tmB, 40 * pT); tmT.textContent = f2(pT);
      /* 8 步：预测从日志出发，一步步偏开 */
      var u4 = (since(t, clock, 10.4) % 3.0) / 3.0;
      for (var j2 = 0; j2 < 8; j2++) {
        var on = u4 * 9 > j2 + 1, x = R + 20 + (j2 + 1) * 40, dy = Math.sin(j2 * 0.9 + 1) * (j2 + 1) * 2.4;
        moveDot(predD[j2], [x, 150 + dy]);
        predD[j2].style.opacity = on ? 1 : 0;
        setLine(errL[j2], x, 150, x, 150 + dy);
        errL[j2].style.opacity = on ? 1 : 0;
      }
      var u5 = clamp(since(t, clock, 13.4) / 2.0, 0, 1);
      lines5.forEach(function (l) { l.set(1 + 7 * u5); });
      leg5.textContent = '8 步（0.16 秒）后根部位置平均差 ' + f1(E.walk1_subject1.rootMm) + '–' + f1(E.fallAndGetUp1_subject1.rootMm) + ' 毫米';
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 7: 世界模型像不像仿真器（我们的复现） ── */
  function buildSceneRepro() {
    var s = sceneSvg('我们的复现：左边两台 G1 从同一个状态出发，左一台是 MuJoCo 仿真器、右一台是世界模型自己往前推（想象），地面网格跟着镜头走；' +
      '三段依次放：策略开着、摔倒再爬起来（8 秒）；策略关掉、跑步中扑倒（2 秒）；地面变滑、急停时打滑（3 秒）。右边是同一时刻的曲线：白实线是仿真器、蓝虚线是世界模型，竖线是当前时刻');
    s.appendChild(svgText(24, 26, '我们的复现：世界模型 vs 仿真器（同一个起点）', 'demo-x-ink2', 13.5));
    var SC = 0.74, TW = 280 * SC, TH = 290 * SC, X1 = 24, X2 = 24 + TW + 10, TY = 64;
    var parts = [
      { key: 'fall', sim: 'fall_sim', wm: 'fall_wm', name: '策略开着：摔倒、躺下、再爬起来', a: 0.4, b: 10.4 },
      { key: 'off', sim: 'off_sim', wm: 'off_wm', name: '策略关掉：动作全给 0，跑步中扑倒', a: 10.4, b: 13.4 },
      { key: 'slip', sim: 'slip_sim', wm: 'slip_wm', name: '地面变滑：开始急停的第 0 秒起，摩擦 1.0 → 0.3', a: 13.4, b: 1e9 }
    ];
    var frames = [];
    [X1, X2].forEach(function (x) { frames.push(rectBox(s, x, TY, TW, TH, C_BORDER, C_SURFACE2)); });
    tone(s, X1 + TW / 2, TY - 8, 'MuJoCo 仿真器', C_SIM, 12, 'middle');
    tone(s, X2 + TW / 2, TY - 8, '世界模型（想象）', C_WM, 12, 'middle');
    parts.forEach(function (p) {
      p.g = group(s);
      p.spS = g1Sprite(p.g, p.sim);
      p.spW = g1Sprite(p.g, p.wm);
      p.grS = groundGrid(p.g, p.spS, X1, TY, TW, TH);
      p.grW = groundGrid(p.g, p.spW, X2, TY, TW, TH);
      p.g.insertBefore(p.grS.g, p.spS.g);
      p.g.insertBefore(p.grW.g, p.spS.g);
      p.cap = label(p.g, 24, TY + TH + 22, p.name, 'demo-x-ink', 12.5);
      p.clock = label(p.g, X2 + TW - 6, TY + 16, '', 'demo-x-mut', 11, 'end');
    });
    label(s, 24, TY + TH + 44, 'Uni-SuperMimic 放出的 LAFAN1 模型 · 不是论文的实验', 'demo-x-mut', 11);
    /* 右：曲线 */
    var R = 474, cw = 300, chh = 130;
    var pane = parts.map(function (p) {
      var g = group(s), E = REPRO[p.key], n = E.hSim.length, T = (n - 1) / 25;
      var c;
      if (p.key !== 'slip') {
        label(g, R, 62, '根部高度（m）随时间', 'demo-x-ink', 13);
        c = chart(g, R + 28, 76, cw - 28, chh, { x0: 0, x1: T, y0: 0, y1: 0.9, xt: (p.key === 'fall' ? [0, 2, 4, 6, 8] : [0, 1, 2]).map(function (v) { return [v, v + ' s']; }), yt: [[0.4, '0.4'], [0.8, '0.8']] });
        p.lS = c.line(E.hSim.map(function (h, i) { return [i / 25, h]; }), C_SIM, 2.2);
        p.lW = c.line(E.hWm.map(function (h, i) { return [i / 25, h]; }), C_WM, 2.2, '6 4');
      } else {
        label(g, R, 58, '根部走过的距离（m）随时间', 'demo-x-ink', 13);
        var dist = function (arr) { var o = [], a0 = arr[0]; arr.forEach(function (q, i) { o.push([i / 25, Math.hypot(q[0] - a0[0], q[1] - a0[1])]); }); return o; };
        c = chart(g, R + 28, 76, cw - 28, chh, { x0: 0, x1: T, y0: 0, y1: 4, xt: [[0, '0 s'], [1, '1 s'], [2, '2 s'], [3, '3 s']], yt: [[2, '2'], [4, '4']] });
        p.lC = c.line(dist(E.rootCtrl), C_MUTED, 1.8, '2 3');
        p.lS = c.line(dist(E.rootSim), C_SIM, 2.2);
        p.lW = c.line(dist(E.rootWm), C_WM, 2.2, '6 4');
        hline(g, c.px(0), 76, c.px(0), 76 + chh, C_WARN, 2, '3 3');
        tone(g, c.px(0) + 6, 92, '第 0 秒（开始急停）：μ 1.0 → 0.3', C_WARN, 11);
      }
      p.c = c; p.T = T;
      p.cur = hline(g, 0, 0, 0, 0, C_WARN, 1.4);
      if (p.key === 'slip') { legendRow(g, R + 28, 248, [['仿真 μ 0.3', C_SIM, 58, 'line'], ['世界模型 μ 0.3', C_WM, 82, '6 4']], 11); legendRow(g, R + 28, 268, [['仿真 μ 1.0（对照）', C_MUTED, 100, '2 3']], 11); }
      else legendRow(g, R + 28, 248, [['仿真器', C_SIM, 40, 'line'], ['世界模型', C_WM, 52, '6 4']], 11);
      var sy0 = p.key === 'slip' ? 294 : 274;
      p.stat = [label(g, R, sy0, '', 'demo-x-ink2', 12), label(g, R, sy0 + 20, '', 'demo-x-ink2', 12), label(g, R, sy0 + 40, '', 'demo-x-mut', 11)];
      p.pg = g;
      return p;
    });
    void pane;
    var F = REPRO.fall, O = REPRO.off, SL = REPRO.slip;
    function draw(t, clock) {
      var now = nowOf(t, clock);
      parts.forEach(function (p, i) {
        var vis = i === 0 ? win(t, 0.3, 10.4) : i === 1 ? win(t, 10.4, 13.4) : win(t, 13.4);
        setOpacity(p.g, vis);
        setOpacity(p.pg, vis);
        if (vis < 0.01) return;
        var n = REPRO[p.key].hSim.length, f = seqFrame(since(t, clock, p.a), n, 25, 1.0);
        p.spS.put(X1, TY, SC, f); p.spW.put(X2, TY, SC, f);
        p.grS.draw(f); p.grW.draw(f);
        p.clock.textContent = f1(f / 25) + ' s' + (p.key === 'slip' ? '  μ = 0.3' : '');
        var tt = f / 25, X = p.c.px(tt);
        setLine(p.cur, X, 76, X, 76 + chh);
        p.lS.set(tt); p.lW.set(tt); if (p.lC) p.lC.set(tt);
      });
      parts[0].stat[0].textContent = '高度最多差 ' + f1(F.maxHeightGap * 100) + ' 厘米；关节角平均差 ' + f3(F.meanJoint) + ' rad';
      parts[0].stat[1].textContent = t >= 7.0 ? '400 步（8 秒），训练窗口只有 8 步，没有发散' : '8 秒后根部水平差 ' + f2(F.endRootErr) + ' m（漂移会累积）';
      parts[0].stat[2].textContent = '世界模型每一步吃的是自己上一步的预测';
      parts[1].stat[0].textContent = '同样的动作（全是 0）喂给两边';
      parts[1].stat[1].textContent = '2 秒后高度：仿真 ' + f2(O.hSim[O.hSim.length - 1]) + ' m，世界模型 ' + f2(O.hWm[O.hWm.length - 1]) + ' m';
      parts[1].stat[2].textContent = '世界模型也预测它会倒下';
      parts[2].stat[0].textContent = '之后 3 秒双脚贴地滑过：仿真 ' + f2(SL.slideSim) + ' m，世界模型 ' + f2(SL.slideWm) + ' m';
      parts[2].stat[1].textContent = '摩擦不变的话只有 ' + f2(SL.slideCtrl) + ' m';
      parts[2].stat[2].textContent = '告诉世界模型摩擦，它就预测得出滑';
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 在想象里反向传播（式 2） ── */
  function buildSceneBPTT() {
    var s = sceneSvg('左边是一条想象出来的轨迹：从缓冲区里的一个状态出发，世界模型往前推 32 步（画了前 8 步和最后一步），每一步一根绿色的奖励条，' +
      '下面一行是存活权重 c，一路连乘变小；最后接评论家。绿色虚线把梯度从每一步的奖励传回每一个动作。右边依次出现：折扣和存活权重、软终止与硬终止的曲线、' +
      'PPO 的梯度估计（一团乱晃的箭头）、我们在复现模型上量的两种估计和参考方向的余弦相似度');
    s.appendChild(svgText(24, 26, '目标函数：想象 32 步的回报，加评论家的估值', 'demo-x-ink2', 13.5));
    math(s, 24, 64, '\\hat{J}(\\theta)=\\mathbb{E}\\Big[\\textstyle\\sum_{t=0}^{H-1}\\gamma^t\\hat{c}_t\\,\\hat{r}_{t+1}+\\gamma^H\\hat{c}_H\\,V_\\psi\\Big]', 15);
    var N8 = 8, X0 = 40, DX = 40, Y0 = 140;
    var dots = [], bars = [], cs = [], grads = [];
    for (var i = 0; i <= N8; i++) {
      var x = X0 + i * DX + (i === N8 ? 22 : 0);
      if (i > 0) {
        var a = arrow(s, C_WM, 1.6);
        a.set(x - DX - (i === N8 ? 22 : 0) + 9, Y0, x - 9, Y0, 6);
        var b = arrow(s, C_GRAD, 1.6, '3 3');
        b.set(x - 4, Y0 + 70, x - DX - (i === N8 ? 22 : 0) + 4, Y0 + 70, 6);
        grads.push(b);
        bars.push(vbar(s, x - 5, 10, C_GOOD));
        cs.push(label(s, x, Y0 + 96, '', 'demo-x-mut', 11, 'middle'));
      }
      dots.push(dotAt(s, x, Y0, 7, C_WM));
      label(s, x, Y0 - 14, i === N8 ? 's32' : 's' + i, 'demo-x-ink2', 11, 'middle');
    }
    tone(s, X0 + 7.5 * DX + 22, Y0 + 2, '…', C_MUTED, 14, 'middle');
    var crit = boxText(s, X0 + N8 * DX + 44, Y0 - 18, 54, 36, '$V_\\psi$', C_CRIT, { size: 12 });
    label(s, 24, Y0 + 50, '奖励', 'demo-x-mut', 11);
    label(s, 24, Y0 + 96, '存活 c', 'demo-x-mut', 11);
    tone(s, 24, Y0 + 122, '⇠ 梯度沿时间往回传到每一个动作', C_GRAD, 11.5);
    label(s, 24, 300, '起点是回放缓冲区里真实采到的状态（Dyna 式）', 'demo-x-ink2', 11.5);
    var R = 470;
    var p1 = group(s);
    label(p1, R, 62, '从缓冲区里的一个真实状态出发', 'demo-x-ink', 14);
    var bufC = [];
    for (var bc = 0; bc < 24; bc++) { var bq = paint(svgEl('rect', { x: R + bc * 12.5, y: 80, width: 10, height: 18, rx: 2 }), C_SIM); p1.appendChild(bq); bufC.push(bq); }
    label(p1, R, 116, '回放缓冲区：仿真里真实采到的状态', 'demo-x-mut', 11);
    var fanL = [];
    for (var fk = 0; fk < 8; fk++) fanL.push(pathLine(p1, [], C_WM, 1.4));
    var s0d = dotAt(p1, R + 16, 186, 6, C_WM), pick = dotAt(p1, 0, 0, 4.5, C_SIM);
    void s0d;
    label(p1, R + 4, 214, '起点 $s_0$', 'demo-x-ink2', 11.5);
    var fanT = label(p1, R, 252, '', 'demo-x-ink2', 12);
    label(p1, R, 274, '世界模型冻住，策略在模型里往前走', 'demo-x-ink2', 12);
    label(p1, R, 294, '离片段结尾不到 32 帧的起点不用', 'demo-x-mut', 11);
    var p2 = group(s);
    label(p2, R, 62, '折扣与存活权重', 'demo-x-ink', 14);
    var c2 = chart(p2, R + 28, 82, 280, 120, { x0: 0, x1: 32, y0: 0, y1: 1, xt: [[0, '0'], [8, '8'], [16, '16'], [24, '24'], [32, '32']], yt: [[0, '0'], [0.5, '0.5'], [1, '1']], xl: '想象的第几步' });
    var gl = [], k2;
    for (k2 = 0; k2 <= 32; k2++) gl.push([k2, Math.pow(0.99, k2)]);
    var lg2 = c2.line(gl, C_GOOD, 2.2);
    var gH = label(p2, R + 28, 260, '', 'demo-x-ink2', 12);
    label(p2, R + 28, 282, '评论家的估值乘的就是这么多', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 62, '存活权重：软终止，梯度不断', 'demo-x-ink', 14);
    var c3 = chart(p3, R + 28, 82, 280, 120, { x0: 0, x1: 0.5, y0: 0, y1: 1, xt: [[0, '0'], [0.25, '0.25 m'], [0.5, '0.5']], yt: [[0, '0'], [1, '1']], xl: '根部高度和参考差多少' });
    var hard = [], soft = [];
    for (var q = 0; q <= 100; q++) { var e = q / 200; hard.push([e, e < 0.25 ? 1 : 0]); soft.push([e, 1 - 1 / (1 + Math.exp(-(e - 0.25) / 0.02))]); }
    c3.line(hard, C_BAD, 1.8, '5 4');
    c3.line(soft, C_GOOD, 2.4);
    legendRow(p3, R + 28, 264, [['硬终止（仿真器）', C_BAD, 96, '5 4'], ['模型预测的存活概率', C_GOOD, 120, 'line']], 11);
    label(p3, R, 290, '每一步乘 1 − 终止概率，连乘起来就是 c', 'demo-x-ink2', 12);
    var p4 = group(s);
    label(p4, R, 62, 'PPO：把动力学当黑箱', 'demo-x-ink', 14);
    label(p4, R, 86, '采样动作 → 看回报好坏 → 加权对数概率的梯度', 'demo-x-ink2', 11.5);
    var c4 = [R + 150, 186], noisy4 = [];
    for (var j = 0; j < 14; j++) noisy4.push(arrow(p4, C_BASE, 1.3));
    var tr4 = arrow(p4, C_GRAD, 2.8);
    tr4.set(c4[0], c4[1], c4[0] + 64, c4[1] - 40, 9);
    tone(p4, c4[0] + 72, c4[1] - 44, '真方向', C_GRAD, 11);
    label(p4, R, 280, 'BPTT：直接对每个动作求导，方差小得多', 'demo-x-ink2', 12);
    var p5 = group(s);
    label(p5, R, 62, '我们量的：梯度方向准不准', 'demo-x-ink', 14);
    var G = REPRO.grad, rows5 = G.rows;
    var c5 = chart(p5, R + 34, 110, 270, 110, { x0: 0.5, x1: rows5.length + 0.5, y0: 0, y1: 1, xt: rows5.map(function (r0, i) { return [i + 1, String(r0[0])]; }), yt: [[0, '0'], [0.5, '0.5'], [1, '1']], xl: '用了几条想象轨迹 N' });
    label(p5, R, 92, '纵轴：和参考方向的余弦相似度（1 = 完全一致）', 'demo-x-mut', 11);
    var b5 = rows5.map(function (r0, i) {
      return [vbar(c5.g, c5.px(i + 1) - 13, 12, C_GRAD), vbar(c5.g, c5.px(i + 1) + 1, 12, C_BASE)];
    });
    legendRow(p5, R, 282, [['BPTT（沿模型求导）', C_GRAD, 112], ['似然比（PPO 的做法）', C_BASE, 124]], 11);
    var note5 = label(p5, R, 306, '', 'demo-x-ink2', 11.5);
    label(p5, R, 326, '冲刺片段里同一个状态，想象 32 步', 'demo-x-mut', 11);
    label(p5, R, 346, '参考方向 = 2048 条 BPTT 梯度的平均', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* 轨迹：前向一步步出现（奖励条长出来），再整体往回传梯度，循环 */
      var u = (now % 4.0) / 4.0, uf = clamp(u / 0.55, 0, 1), ub = clamp((u - 0.55) / 0.35, 0, 1);
      var alive = 1;
      for (var i2 = 0; i2 < N8; i2++) {
        var on = uf * N8 > i2;
        var rv = [0.82, 0.9, 0.77, 0.85, 0.6, 0.72, 0.8, 0.66][i2];
        alive *= [1, 1, 0.99, 0.98, 0.9, 0.86, 0.84, 0.8][i2];
        bars[i2].set(Y0 + 64, on ? 40 * rv : 0);
        cs[i2].textContent = on ? f2(alive) : '';
        setOpacity(grads[i2].g, ub * N8 > N8 - 1 - i2 ? 1 : 0.1);
        dots[i2 + 1].style.opacity = on ? 1 : 0.2;
      }
      setOpacity(crit.g, uf >= 1 ? 1 : 0.3);
      /* 每 4 秒：从缓冲区抽一格当起点，再长出 8 条（代表 4096 条）想象轨迹，各走 32 步 */
      var cyc = since(t, clock, 0.3), kc = Math.floor(cyc / 4), ph = (cyc % 4), ki = Math.floor(rnd(kc, 5) * 24);
      bufC.forEach(function (b, i) { b.style.opacity = i === ki ? 1 : 0.3; });
      var pu = clamp(ph / 0.8, 0, 1), pa0 = [R + ki * 12.5 + 5, 98], pb0 = [R + 16, 186];
      moveDot(pick, [pa0[0] + (pb0[0] - pa0[0]) * pu, pa0[1] + (pb0[1] - pa0[1]) * pu]);
      pick.style.opacity = pu < 1 ? 1 : 0;
      var nst = Math.round(32 * clamp((ph - 0.8) / 2.6, 0, 1));
      fanL.forEach(function (l, k) {
        var pts3 = [[R + 16, 186]], yy = 186;
        for (var q = 1; q <= nst; q++) { yy += (rnd(kc * 97 + k * 31 + q, 9) - 0.5) * 7 + (k - 3.5) * 0.35; pts3.push([R + 16 + q * 9, yy]); }
        setPath(l, pts3);
      });
      fanT.textContent = '一次更新 4096 条轨迹（画了 8 条），已走 ' + nst + ' / 32 步';
      var u2 = clamp(since(t, clock, 3.6) / 2.2, 0, 1);
      lg2.set(32 * u2);
      gH.textContent = '第 32 步：0.99 的 32 次方 = ' + f3(Math.pow(0.99, 32));
      var k4 = Math.floor(now * 2.5);
      noisy4.forEach(function (a, i) {
        var ang = -0.56 + (rnd(k4 * 14 + i, 11) - 0.5) * 2.8, L = 30 + 50 * rnd(k4 * 14 + i, 13);
        a.set(c4[0], c4[1], c4[0] + Math.cos(ang) * L, c4[1] + Math.sin(ang) * L, 6);
      });
      var u5 = clamp(since(t, clock, 13.4) / 2.0, 0, 1);
      b5.forEach(function (bb, i) {
        var r0 = rows5[i], k5 = clamp(u5 * rows5.length - i, 0, 1), base = c5.py(0);
        bb[0].set(base, (base - c5.py(Math.max(0, r0[1]))) * k5);
        bb[1].set(base, (base - c5.py(Math.max(0, r0[3]))) * k5);
      });
      note5.textContent = '1 条 BPTT：' + f2(rows5[0][1]) + '；似然比用 ' + rows5[rows5.length - 1][0] + ' 条：' + f2(rows5[rows5.length - 1][3]) + '（各 8 次的平均）';
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: 评论家：看到第 32 步之后（式 3、图 4b、c） ── */
  function buildSceneCritic() {
    var s = sceneSvg('左边是一条 6 步的想象轨迹，从右往左算 GAE 目标：每一步把奖励和下一步的目标、估值按 λ 混在一起（玩具数字）；' +
      '右边依次出现：评论家怎么拟合；和 SHAC 的两处不同；论文图 4b（不同视界的最终回报，有无评论家）；图 4c（训到回报 0.82 要几小时，叉号是没训到）；被推一把以后站稳要多久');
    s.appendChild(svgText(24, 26, '评论家：估计想象窗口之外的回报', 'demo-x-ink2', 13.5));
    math(s, 24, 64, '\\hat{R}_t=\\hat{r}_{t+1}+\\gamma(1-\\hat{d}_{t+1})\\big[(1-\\lambda)V_{t+1}+\\lambda\\hat{R}_{t+1}\\big]', 14);
    var rr = [0.08, 0.09, 0.07, 0.09, 0.08, 0.06], vv = [1.2, 1.1, 1.3, 1.0, 1.15, 1.05, 1.1], gam = 0.99, lam = 0.95;
    var Rh = [];
    Rh[6] = vv[6];
    for (var i = 5; i >= 0; i--) Rh[i] = rr[i] + gam * ((1 - lam) * vv[i + 1] + lam * Rh[i + 1]);
    var cellsR = [], cellsV = [], cellsT = [];
    for (var k = 0; k < 7; k++) {
      var x = 36 + k * 52;
      dotAt(s, x + 18, 120, 6, C_WM);
      label(s, x + 18, 106, 's' + k, 'demo-x-ink2', 11, 'middle');
      if (k < 6) cellsR.push(label(s, x + 44, 148, f2(rr[k]), 'demo-x-ink2', 11, 'middle'));
      cellsV.push(label(s, x + 18, 176, f2(vv[k]), 'demo-x-mut', 11, 'middle'));
      cellsT.push(tone(s, x + 18, 206, '', C_CRIT, 12, 'middle'));
      if (k === 0) { label(s, 6, 151, '奖励', 'demo-x-mut', 11); label(s, 6, 179, '估值', 'demo-x-mut', 11); tone(s, 6, 209, '目标', C_CRIT, 11); }
    }
    /* 正在算的那一格：后一步的估值（×5%）和后一步的目标（×95%）流进来，再加上这一步的奖励 */
    var aV = arrow(s, C_MUTED, 1.6), aT = arrow(s, C_CRIT, 1.8);
    var hlR = rectBox(s, 0, 0, 34, 18, C_CRIT, 'none'); hlR.style.fill = 'none';
    tone(s, 24, 246, '最下面一排「目标」：评论家要去拟合的值', C_CRIT, 11.5);
    label(s, 24, 268, '目标 = 这一步的奖励 + 0.99 ×（5% 后一步估值 + 95% 后一步目标）', 'demo-x-ink2', 11.5);
    label(s, 24, 290, '最后一步的目标就是它的估值；奖励和估值是玩具数字', 'demo-x-mut', 11);
    legendRow(s, 24, 314, [['后一步的估值 ×5%', C_MUTED, 92, 'line'], ['后一步的目标 ×95%', C_CRIT, 98, 'line'], ['这一步的奖励', C_CRIT, 72, 'box']], 11);
    var R = 440;
    var p1 = group(s);
    label(p1, R, 62, '评论家怎么训', 'demo-x-ink', 14);
    label(p1, R, 88, '和策略在同一步里训：只用想象出来的转移', 'demo-x-ink2', 12);
    var cg = [];
    for (var ce = 0; ce < 5; ce++) for (var cb = 0; cb < 4; cb++) { var cr = paint(svgEl('rect', { x: R + ce * 30, y: 104 + cb * 20, width: 26, height: 16, rx: 3 }), C_CRIT); p1.appendChild(cr); cg.push(cr); }
    for (var ce2 = 0; ce2 < 5; ce2++) label(p1, R + ce2 * 30 + 13, 200, String(ce2 + 1), 'demo-x-mut', 11, 'middle');
    label(p1, R, 220, '每次更新：5 轮，每轮 4 个小批', 'demo-x-ink2', 12);
    var fCr = flowSeg(p1, C_CRIT, 3, 3, 50);
    boxText(p1, R + 196, 124, 136, 40, '评论家 MLP 256 × 128', C_CRIT, { size: 12 });
    label(p1, R, 246, '拟合的目标：GAE 回报（$\\lambda = 0.95$）', 'demo-x-ink2', 12);
    label(p1, R, 270, '输入：状态、目标、仿真上下文 $\\xi$', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 62, '短视界的 actor–critic，和 SHAC 同类', 'demo-x-ink', 14);
    var chains = [['SHAC', '可微仿真器', C_SIM, 110], ['SuperMimic', '学到的世界模型', C_WM, 172]].map(function (c0) {
      var y = c0[3];
      label(p2, R, y - 22, c0[0], 'demo-x-ink2', 12);
      boxText(p2, R, y - 14, 104, 28, c0[1], c0[2], { size: 11.5 });
      for (var q = 0; q < 4; q++) {
        var xq = R + 136 + q * 52;
        dotAt(p2, xq, y, 6, c0[2]);
        if (q) arrow(p2, c0[2], 1.4).set(xq - 52 + 8, y, xq - 8, y, 6);
      }
      hline(p2, R + 104, y, R + 128, y, c0[2], 1.4);
      return flowSeg(p2, C_GRAD, 3, 3, 46);
    });
    legendRow(p2, R, 210, [['梯度沿时间往回传', C_GRAD, 96, '3 4']], 11);
    var tk1 = group(p2), tk2 = group(p2);
    tick(tk1, R, 226, 12); label(tk1, R + 20, 238, '硬终止 → 可导的存活权重', 'demo-x-ink2', 12);
    tick(tk2, R, 252, 12); label(tk2, R + 20, 264, '评论家不要指数滑动平均的目标网络', 'demo-x-ink2', 12);
    var p3 = group(s);
    label(p3, R, 62, '论文图四 b：最终的训练回报', 'demo-x-ink', 14);
    var xt = [[8, '8'], [16, '16'], [32, '32'], [64, '64'], [128, '128']];
    var c3 = chart(p3, R + 28, 82, 300, 140, { logx: true, x0: 6, x1: 170, y0: 0, y1: 0.9, xt: xt, yt: [[0, '0'], [0.4, '0.4'], [0.82, '0.82']], xl: '想象的视界 H（步）' });
    var lc = c3.line(PAPER.fig4b_critic, C_SM, 2.4), ln3 = c3.line(PAPER.fig4b_nocritic, C_MUTED, 2, '5 4');
    var dc = PAPER.fig4b_critic.map(function (p) { return dotAt(c3.g, c3.px(p[0]), c3.py(p[1]), 4, C_SM); });
    var dn = PAPER.fig4b_nocritic.map(function (p) { return ringAt(c3.g, c3.px(p[0]), c3.py(p[1]), 4, C_MUTED, 1.6); });
    void lc; void ln3; void dc; void dn;
    legendRow(p3, R + 28, 282, [['有评论家', C_SM, 52, 'line'], ['没有评论家', C_MUTED, 62, '5 4']], 11);
    label(p3, R, 304, '越高越好；没有评论家时 H ≤ 16 训不起来', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 62, '论文图四 c：训到回报 0.82 要几小时', 'demo-x-ink', 14);
    var c4 = chart(p4, R + 28, 82, 300, 140, { logx: true, x0: 6, x1: 170, y0: 0, y1: 5, xt: xt, yt: [[0, '0'], [2, '2'], [4, '4']], xl: '想象的视界 H（步）' });
    c4.line(PAPER.fig4c_critic, C_SM, 2.4); c4.line(PAPER.fig4c_nocritic, C_MUTED, 2, '5 4');
    PAPER.fig4c_critic.forEach(function (p) { dotAt(c4.g, c4.px(p[0]), c4.py(p[1]), 4, C_SM); });
    PAPER.fig4c_nocritic.forEach(function (p) { ringAt(c4.g, c4.px(p[0]), c4.py(p[1]), 4, C_MUTED, 1.6); });
    cross(c4.g, c4.px(8) - 5, c4.py(5) - 5 + 6, 9, C_SM); cross(c4.g, c4.px(8) - 5, c4.py(4.4) - 5, 9, C_MUTED); cross(c4.g, c4.px(16) - 5, c4.py(5) - 5 + 6, 9, C_MUTED);
    var hiBand = paint(svgEl('rect', { x: c4.px(32) - 8, y: 82, width: 16, height: 140 }), C_SM);
    hiBand.style.opacity = 0.12; c4.g.insertBefore(hiBand, c4.g.firstChild.nextSibling);
    legendRow(p4, R + 28, 282, [['有评论家', C_SM, 52, 'line'], ['没有评论家', C_MUTED, 62, '5 4'], ['没训到', C_INK, 40, 'x']], 11);
    label(p4, R, 304, '越低越好；默认 H = 32 最快（0.88 小时）', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 62, '被推一把：T 字站着，0.5–4 m/s 的速度冲击', 'demo-x-ink', 14);
    var tr5 = [];
    [['有评论家', C_SM], ['没有评论家', C_MUTED]].forEach(function (c0, i) {
      var y = 100 + i * 90;
      label(p5, R, y, c0[0], 'demo-x-ink2', 12);
      hline(p5, R, y + 48, R + 330, y + 48, C_BORDER, 1);
      tr5.push(pathLine(p5, [], c0[1], 2.2));
    });
    tone(p5, R + 200, 100, '0.5–2.4 秒站稳', C_SM, 12);
    tone(p5, R + 160, 190, '一直踉跄，4 m/s 摔倒', C_BAD, 12);
    label(p5, R, 296, '回报相同时，评论家也让策略看得更远', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* GAE：从右往左一格格算出来，循环 */
      var u = (now % 5) / 5;
      cellsT.forEach(function (c0, k) {
        var on = u * 8 > (6 - k);
        c0.textContent = on ? f2(Rh[k]) : '';
      });
      var kn = 6 - Math.floor(u * 8), xk = 54 + 52 * kn, xn = xk + 52, showA = kn >= 0 && kn <= 5;
      [aV.g, aT.g, hlR].forEach(function (n) { n.style.opacity = showA ? 1 : 0; });
      if (showA) {
        aV.set(xn - 12, 180, xk + 14, 196, 7);
        aT.set(xn - 16, 202, xk + 18, 202, 7);
        hlR.setAttribute('x', (xk + 9).toFixed(1)); hlR.setAttribute('y', '135');
      }
      /* 评论家：5 轮 × 4 个小批一格格亮，亮过的数据流进评论家 */
      var ci2 = Math.floor(since(t, clock, 0.3) * 5) % 20;
      cg.forEach(function (c0, i) { c0.style.opacity = i === ci2 ? 1 : i < ci2 ? 0.55 : 0.15; });
      fCr.at(now, [R + 152, 144], [R + 194, 144], t < 3.9);
      /* 两条链：往前走一样，梯度一样往回传；下面两处不同依次亮起 */
      chains.forEach(function (f, i) { var y = [110, 172][i]; f.at(now, [R + 292, y + 10], [R + 136, y + 10], t >= 3.6 && t < 7.3); });
      setOpacity(tk1, clamp(since(t, clock, 4.2) / 0.5, 0, 1)); setOpacity(tk2, clamp(since(t, clock, 5.4) / 0.5, 0, 1));
      /* 推一把：有评论家的晃几下就停，没有的一直晃 */
      var tt = since(t, clock, 13.4) % 4;
      [0, 1].forEach(function (i) {
        var pts = [], y = 100 + i * 90 + 30;
        for (var q = 0; q <= 120; q++) {
          var x = q / 120 * 4;
          if (x > tt) break;
          var v = i === 0 ? Math.exp(-x * 1.6) * Math.sin(x * 9) : (0.55 + 0.25 * Math.sin(x * 1.3)) * Math.sin(x * 7.5);
          pts.push([R + q / 120 * 330, y - 26 * v]);
        }
        setPath(tr5[i], pts);
      });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: 奖励、终止与随机化（表 A.2、A.3） ── */
  var REWARDS = [['身体位置', 1, '0.3 m'], ['身体朝向', 1, '0.4 rad'], ['身体线速度', 1, '1.0 m/s'], ['身体角速度', 1, '3.14 rad/s'], ['根部位置', 0.5, '0.3 m'], ['根部朝向', 0.5, '0.4 rad']];
  function buildSceneReward() {
    var s = sceneSvg('左边是附录表 A.2 的奖励：六项跟踪奖励（条的长度是权重）和两项惩罚（红色），划掉的是去掉的自碰撞惩罚；' +
      '右边依次出现：一条指数奖励曲线；两个身体压在一起钻空子的示意；关节超限惩罚从 −10 降到 −2、终止的高度带和倾斜表盘；随机化的三类参数；被拿掉的速度推搡');
    s.appendChild(svgText(24, 26, '奖励沿用 BeyondMimic，删一项、改一项', 'demo-x-ink2', 13.5));
    var L = group(s);
    label(L, 24, 58, '跟踪（每项 = 指数形式，误差越小越接近 1）', 'demo-x-ink', 12.5);
    var rb = REWARDS.map(function (r0, i) {
      var y = 70 + i * 26;
      var row = barRowAt(L, 24, y, 92, r0[0], C_SM, 14, 11.5);
      label(L, 330, y + 11, r0[2], 'demo-x-mut', 11);
      return { row: row, w: r0[1] };
    });
    label(L, 24, 248, '惩罚', 'demo-x-ink', 12.5);
    var pen1 = barRowAt(L, 24, 258, 92, '动作变化', C_BAD, 14, 11.5);
    var pen2 = barRowAt(L, 24, 282, 92, '关节超限', C_BAD, 14, 11.5);
    var selfC = group(L);
    label(selfC, 24, 318, '自碰撞惩罚', 'demo-x-ink2', 11.5);
    hline(selfC, 22, 314, 92, 314, C_BAD, 2);
    tone(selfC, 100, 318, '去掉了', C_BAD, 11.5);
    label(L, 200, 318, '每项乘 0.02 秒；一步最多 0.1', 'demo-x-mut', 11);
    var R = 440;
    var p1 = group(s);
    label(p1, R, 62, '跟踪奖励：误差越小越接近 1', 'demo-x-ink', 14);
    var c1 = chart(p1, R + 28, 84, 300, 130, { x0: 0, x1: 0.6, y0: 0, y1: 1, xt: [[0, '0'], [0.3, '0.3'], [0.6, '0.6 m']], yt: [[0, '0'], [0.5, '0.5'], [1, '1']], xl: '身体位置的平均误差' });
    var ex = [];
    for (var q = 0; q <= 60; q++) { var e = q / 100; ex.push([e, Math.exp(-e * e / 0.09)]); }
    c1.line(ex, C_SM, 2.4);
    var d1 = dotAt(c1.g, 0, 0, 5, C_INK), d1t = label(p1, R + 200, 110, '', 'demo-x-ink2', 12);
    label(p1, R, 270, '六项加起来，最多 5 分', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 62, '为什么去掉自碰撞惩罚', 'demo-x-ink', 14);
    var bA = paint(svgEl('rect', { x: 0, y: 120, width: 60, height: 50, rx: 8 }), C_MUTED);
    var bB = paint(svgEl('rect', { x: 0, y: 120, width: 60, height: 50, rx: 8 }), C_MUTED);
    p2.appendChild(bA); p2.appendChild(bB);
    var noiseD = [];
    for (var nd = 0; nd < 10; nd++) noiseD.push(dotAt(p2, 0, 0, 2.5, C_BASE));
    label(p2, R, 206, '随机策略的漏洞：参考里两个部位靠得近却不碰，', 'demo-x-ink2', 11.5);
    label(p2, R, 226, '把它们压在一起，动作噪声被压住，速度奖励反而变高', 'demo-x-ink2', 11.5);
    tone(p2, R, 256, '想象时策略是确定性的，这个漏洞没好处，惩罚就不用了', C_GOOD, 11.5);
    var p3 = group(s);
    label(p3, R, 62, '关节超限：−10 → −2；终止：偏太多就停', 'demo-x-ink', 14);
    rectBox(p3, R, 84, 60, 150, C_BORDER, C_SURFACE2);
    var hb = paint(svgEl('rect', { x: R + 2, y: 0, width: 56, height: 0, rx: 4 }), C_GOOD);
    hb.style.opacity = 0.25; p3.appendChild(hb);
    hline(p3, R, 159, R + 60, 159, C_INK, 1.5, '4 3');
    var hdot = dotAt(p3, R + 30, 159, 6, C_INK);
    label(p3, R + 30, 252, '高度 ±0.25 m', 'demo-x-ink2', 11, 'middle');
    var gc = [R + 210, 200], gr = 90;
    var arcP = [];
    for (var a = 0; a <= 90; a += 3) arcP.push([gc[0] + Math.sin(a * Math.PI / 180) * gr, gc[1] - Math.cos(a * Math.PI / 180) * gr]);
    pathLine(p3, arcP, C_BORDER, 2);
    var th = 78.5 * Math.PI / 180;
    hline(p3, gc[0], gc[1], gc[0] + Math.sin(th) * gr, gc[1] - Math.cos(th) * gr, C_BAD, 2, '4 3');
    tone(p3, gc[0] + Math.sin(th) * gr + 6, gc[1] - Math.cos(th) * gr - 4, '约 78°', C_BAD, 11.5);
    var needle = hline(p3, 0, 0, 0, 0, C_INK, 3);
    var ntxt = label(p3, gc[0], gc[1] + 22, '', 'demo-x-ink2', 11.5, 'middle');
    label(p3, R + 110, 276, '倾斜：重力方向的 z 分量差超过 0.8', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 62, '随机化只剩物理参数（表 A.3）', 'demo-x-ink', 14);
    var rr4 = [rangeRow(p4, R, 100, 350, '摩擦系数', 0.3, 1.2, 0, 1.4, function (v) { return f2(v); }, C_BASE),
      rangeRow(p4, R, 140, 350, '关节零点', -0.01, 0.01, -0.02, 0.02, function (v) { return sgn(f3(v)) + ' rad'; }, C_BASE),
      rangeRow(p4, R, 180, 350, '躯干质心 x', -0.025, 0.025, -0.06, 0.06, function (v) { return sgn(f3(v)) + ' m'; }, C_BASE),
      rangeRow(p4, R, 220, 350, '躯干质心 y、z', -0.05, 0.05, -0.06, 0.06, function (v) { return sgn(f3(v)) + ' m'; }, C_BASE)];
    label(p4, R, 262, '这些就是世界模型的输入 ξ', 'demo-x-ink2', 12);
    var p5 = group(s);
    label(p5, R, 62, '拿掉根部速度推搡', 'demo-x-ink', 14);
    var c5 = chart(p5, R + 28, 100, 300, 100, { x0: 0, x1: 4, y0: -1, y1: 2, xt: [[0, '0'], [2, '2'], [4, '4 s']], yt: [[0, '0'], [1.5, '1.5']], xl: '时间' });
    var vline = pathLine(c5.g, [], C_BAD, 2.2);
    label(p5, R + 28, 92, '根部速度（m/s）', 'demo-x-mut', 11);
    label(p5, R, 262, '推一把 = 速度突然跳变；确定性的世界模型学不了这种突变', 'demo-x-ink2', 11.5);
    tone(p5, R, 284, '只随机化物理参数，上真机也够', C_GOOD, 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var u0 = clamp(since(t, clock, 0.4) / 1.5, 0, 1);
      rb.forEach(function (r0, i) { r0.row.set(150 * r0.w * clamp(u0 * 6 - i, 0, 1), String(r0.w)); });
      var u3 = clamp(since(t, clock, 7.0) / 1.5, 0, 1);
      pen1.set(15, '−0.1');
      var jl = -10 + 8 * u3;
      pen2.set(150 * Math.abs(jl) / 10 * 0.3, (t >= 7.0 ? sgn(String(Math.round(jl))) : '−2') + (t >= 7.0 && u3 < 1 ? '' : '（原来 −10）'));
      /* 指数曲线上的点来回走 */
      var e1 = 0.3 * (0.5 + 0.5 * Math.sin(now * 1.3));
      moveDot(d1, [c1.px(e1), c1.py(Math.exp(-e1 * e1 / 0.09))]);
      d1t.textContent = '误差 ' + f2(e1) + ' m → ' + f2(Math.exp(-e1 * e1 / 0.09));
      /* 两个身体被压到一起，噪声点跟着变小 */
      var pr = 0.5 + 0.5 * Math.sin(now * 1.4);
      bA.setAttribute('x', (R + 80 + 30 * pr).toFixed(1));
      bB.setAttribute('x', (R + 230 - 30 * pr).toFixed(1));
      noiseD.forEach(function (d, i) {
        var amp = 18 * (1 - pr) + 2;
        moveDot(d, [R + 170 + (rnd(Math.floor(now * 6) * 10 + i, 2) - 0.5) * amp * 2, 145 + (rnd(Math.floor(now * 6) * 10 + i, 4) - 0.5) * amp * 2]);
      });
      /* 终止：高度点在带子里晃，倾斜表盘的指针来回摆，过了 78° 变红 */
      var hz = Math.sin(now * 1.1) * 0.33;
      hb.setAttribute('y', (159 - 0.25 * 140).toFixed(1)); hb.setAttribute('height', (0.5 * 140).toFixed(1));
      moveDot(hdot, [R + 30, 159 - hz * 140]);
      hdot.style.fill = Math.abs(hz) > 0.25 ? C_BAD : C_INK;
      var tilt = 45 + 45 * Math.sin(now * 0.9), tr = tilt * Math.PI / 180;
      setLine(needle, gc[0], gc[1], gc[0] + Math.sin(tr) * (gr - 8), gc[1] - Math.cos(tr) * (gr - 8));
      needle.style.stroke = tilt > 78.5 ? C_BAD : C_INK;
      ntxt.textContent = '倾斜 ' + Math.round(tilt) + '°' + (tilt > 78.5 ? '：终止' : '');
      rr4.forEach(function (r0, i) { r0.at(now, 51 + i, 0.9); });
      var pts = [], tt5 = since(t, clock, 13.4) % 4;
      for (var k = 0; k <= 200; k++) {
        var x = k / 50;
        if (x > tt5) break;
        pts.push([c5.px(x), c5.py(0.3 * Math.sin(x * 3) + (x > 1.6 ? 1.2 * Math.exp(-(x - 1.6) * 2) : 0))]);
      }
      setPath(vline, pts);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 11: 动作库与重置采样（附录 D、E） ── */
  var BINS = [0.95, 0.9, 0.35, 0.2, 0.85, 0.92, 0.6, 0.97, 0.88, 0.45];
  function binProbs(G) {
    var m = Math.max.apply(null, G.map(function (g) { return -25 * g; })), ex = G.map(function (g) { return Math.exp(-25 * g - m); }), z = ex.reduce(function (a, b) { return a + b; }, 0);
    return G.map(function (g, i) { return 0.5 / G.length + 0.4 * ex[i] / z + 0.1 / G.length; });
  }
  function buildSceneData() {
    var s = sceneSvg('左边是附录 D 的数据过滤：三根条从 142,220 段缩到 129,667 段、再到 129,514 段；右边依次出现：动作名里被去掉的关键词和三种运动学上不可行的情况；' +
      '一段动作的时间轴按 1 秒切成格子，格子高度是回报估计，越低越常被抽中，小点落进格子表示一次重置；最后是数据量和 SONIC 的对比');
    s.appendChild(svgText(24, 26, '动作库：BONES-SEED；从哪里重来：回报低的地方', 'demo-x-ink2', 13.5));
    var L = group(s), stages = [[142220, '原始（G1 重定向版）'], [129667, '按名字去掉 12,553 段'], [129514, '按运动学再去掉 153 段']];
    var fb = stages.map(function (st, i) {
      var y = 70 + i * 74;
      label(L, 24, y, st[1], 'demo-x-ink2', 12);
      var b = hbar(L, 24, y + 10, 26, i === 2 ? C_SM : C_MUTED, 0.85);
      var v = label(L, 30, y + 29, '', 'demo-x-ink', 13);
      return { b: b, v: v, n: st[0] };
    });
    label(L, 24, 300, '一段平均约 7 秒，共 264.56 小时', 'demo-x-mut', 11);
    var R = 424;
    var p0 = group(s);
    label(p0, R, 62, '数据：BONES-SEED', 'demo-x-ink', 14);
    label(p0, R, 90, 'Bones Studio 采的动作捕捉，公开了重定向到 G1 的版本', 'demo-x-ink2', 12);
    label(p0, R, 114, '一段一个动作，名字就是动作的描述', 'demo-x-ink2', 12);
    var lib0 = cellGrid(p0, R, 132, 160, 32, 8, 3, C_MUTED);
    label(p0, R, 214, '原始一共 142,220 段', 'demo-x-ink', 13);
    var p1 = group(s);
    label(p1, R, 62, '去掉用不上的动作', 'demo-x-ink', 14);
    [['stair', 0, 0, 80], ['ladder', 90, 0, 80], ['box', 180, 0, 80], ['chair', 270, 0, 80], ['sit', 0, 1, 80], ['climb', 90, 1, 80], ['jump_off_50cm', 180, 1, 170], ['look_over_fence', 0, 2, 190]].forEach(function (c0) {
      chip(p1, R + c0[1], 76 + c0[2] * 32, c0[3], '`' + c0[0] + '`', C_BAD, { size: 11, h: 26 });
    });
    label(p1, R + 200, 158, '……', 'demo-x-mut', 11);
    label(p1, R, 186, '要用楼梯、梯子、箱子、椅子的（平地上做不了）', 'demo-x-ink2', 11.5);
    [['站在高处', '最低的连杆离地 > 0.20 m，持续 0.6 s'], ['穿进地面', '最低点 < −0.12 m'], ['双脚悬空', '站着不动、两脚都 > 0.02 m，持续 0.5 s']].forEach(function (f0_, i) {
      var y = 214 + i * 28;
      cross(p1, R, y - 10, 10, C_BAD);
      label(p1, R + 18, y, f0_[0], 'demo-x-ink', 12);
      label(p1, R + 88, y, f0_[1], 'demo-x-mut', 11);
    });
    var p2 = group(s);
    label(p2, R, 62, '重置：哪里没学会，就多从哪里开始', 'demo-x-ink', 14);
    var bw = 34, by = 210, bars2 = BINS.map(function (g, i) { return colBar(p2, R + 8 + i * bw, bw - 6, by, C_SM); });
    hline(p2, R, by, R + 350, by, C_BORDER, 1.2);
    label(p2, R, 228, '一段动作按 1 秒切成格子；条高 = 从这一格出发的回报估计', 'demo-x-mut', 11);
    var probs = binProbs(BINS), pb = BINS.map(function (g, i) { return label(p2, R + 8 + i * bw + (bw - 6) / 2, 250, '', 'demo-x-ink2', 11, 'middle'); });
    label(p2, R, 272, '抽中的概率：50% 均匀 + 40% 按 softmax(−25 G) + 10% 按历史', 'demo-x-ink2', 11.5);
    var drops = [];
    for (var q = 0; q < 6; q++) drops.push(dotAt(p2, 0, 0, 4, C_GOOD));
    var p3 = group(s);
    label(p3, R, 62, '数据量：比 SONIC 少', 'demo-x-ink', 14);
    var dA = barRowAt(p3, R, 96, 110, 'SONIC', C_BASE, 22, 12), dB = barRowAt(p3, R, 132, 110, 'SuperMimic', C_SM, 22, 12);
    label(p3, R, 190, 'BONES-SEED 是 SONIC 数据的公开子集', 'demo-x-ink2', 12);
    label(p3, R, 212, '611 ÷ 264.56 ≈ 2.3 倍', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      fb.forEach(function (f, i) {
        var u = clamp(since(t, clock, i === 0 ? 0.4 : 3.6) / 1.2 - (i === 2 ? 0.8 : 0), 0, 1);
        setW(f.b, 360 * f.n / 142220 * u);
        f.v.textContent = u > 0.2 ? kfmt(f.n * Math.min(1, u * 1.2)) : '';
        if (u >= 1) f.v.textContent = kfmt(f.n);
      });
      bars2.forEach(function (b, i) { b.set(BINS[i] * 120, ''); });
      pb.forEach(function (p, i) { p.textContent = Math.round(probs[i] * 100) + '%'; });
      var cum = [], acc = 0;
      probs.forEach(function (p) { acc += p; cum.push(acc); });
      drops.forEach(function (d, i) {
        var k = Math.floor(now * 1.5) * 6 + i, r = rnd(k, 21), idx = 0;
        while (idx < cum.length - 1 && r > cum[idx]) idx++;
        var u = (now * 1.5 + i / 6) % 1;
        moveDot(d, [R + 8 + idx * bw + (bw - 6) / 2, 88 + u * (by - 100)]);
        d.style.opacity = u < 0.9 ? 1 : 0;
      });
      var u3 = clamp(since(t, clock, 13.4) / 1.2, 0, 1);
      dA.set(170 * u3, f0(611 * u3) + ' 小时');
      dB.set(170 * 264.56 / 611 * u3, f1(264.56 * u3) + ' 小时');
      lib0.fill(Math.round(160 * clamp(since(t, clock, 0.4) / 2, 0, 1)));
      setOpacity(p0, win(t, 0.3, 3.6));
      setOpacity(p1, win(t, 3.6, 7.0));
      setOpacity(p2, win(t, 7.0, 13.4));
      setOpacity(p3, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 一张卡 3 小时（图 3a） ── */
  function buildSceneCompute() {
    var s = sceneSvg('论文图 3a 的重画：横轴是显卡小时（对数），纵轴是归一化回报，深蓝是 1 张 H100、浅蓝是 2 张，黄色虚线是 SONIC 放出的模型 0.90；' +
      '下面两行是预算：3 小时对 168 小时、3 显卡小时对约 21,000；右边依次出现：读法、保守的 3 小时、账本、为什么不是硬件和数据的差别');
    s.appendChild(svgText(24, 26, '论文图三 a：归一化回报 vs 显卡小时', 'demo-x-ink2', 13.5));
    var c = chart(s, 60, 60, 340, 170, { logx: true, x0: 0.05, x1: 4e4, y0: 0.6, y1: 0.98,
      xt: [[0.1, '0.1'], [1, '1'], [10, '10'], [100, '100'], [1000, '1000'], [10000, '10000']],
      yt: [[0.6, '0.60'], [0.76, '0.76'], [0.9, '0.90']], xl: '显卡小时（1 张卡时就是墙钟时间）' });
    var son = c.line([[0.05, 0.9012], [4e4, 0.9012]], C_BASE, 2, '6 4');
    void son;
    tone(s, 396, c.py(0.9012) - 6, 'SONIC 0.90', C_BASE, 11, 'end');
    var l1 = c.line(PAPER.fig3a_1, C_SM, 2.6), l2 = c.line(PAPER.fig3a_2, C_PURPLE, 2.2);
    var m3 = ringAt(c.g, c.px(3), c.py(0.9363), 6, C_GOOD, 2.4);
    legendRow(s, 60, 294, [['1 张 H100', C_SM, 54, 'line'], ['2 张 H100', C_PURPLE, 54, 'line'], ['SONIC（128 张 L40）', C_BASE, 112, '6 4']], 11);
    /* 预算两行 */
    var bud = group(s);
    function budRow(y, a, b, txtA, txtB, big) {
      hline(bud, c.px(a), y, c.px(b), y, C_BORDER, 6);
      dotAt(bud, c.px(a), y, 5, C_SM);
      paint(bud.appendChild(svgEl('rect', { x: c.px(b) - 5, y: y - 5, width: 10, height: 10, transform: 'rotate(45 ' + c.px(b) + ' ' + y + ')' })), C_BASE);
      tone(bud, c.px(a), y + 21, txtA, C_SM, 11, 'middle');
      tone(bud, c.px(b), y + 21, txtB, C_BASE, 11, 'middle');
      label(bud, (c.px(a) + c.px(b)) / 2, y - 8, big, 'demo-x-ink', 12, 'middle');
    }
    budRow(330, 3, 168, '3 小时', '168 小时', '墙钟 > 50 倍');
    var R = 440;
    var p1 = group(s);
    label(p1, R, 62, '怎么读', 'demo-x-ink', 14);
    label(p1, R, 88, '横轴：显卡小时，对数刻度，往右每格乘 10', 'demo-x-ink2', 12);
    label(p1, R, 112, '纵轴：归一化回报，越高越好，满分 1', 'demo-x-ink2', 12);
    label(p1, R, 136, '归一化回报 = 整段的奖励总和 ÷ 能拿到的最大值', 'demo-x-mut', 11.5);
    var trk = [150, 194].map(function (y) { var r0 = rectBox(p1, R, y, 260, 14, C_BORDER, 'none'); r0.style.fill = 'none'; return r0; });
    void trk;
    var nrA = hbar(p1, R, 150, 14, C_GOOD), nrB = hbar(p1, R, 194, 14, C_BAD);
    var nrAt = label(p1, R + 268, 162, '', 'demo-x-ink2', 11.5), nrBt = label(p1, R + 268, 206, '', 'demo-x-ink2', 11.5);
    label(p1, R, 182, '跟完整段', 'demo-x-mut', 11); label(p1, R, 226, '中途摔倒：后面的分拿不到（两条都是示意）', 'demo-x-mut', 11);
    var fallX = cross(p1, R + 260 * 0.41 - 5, 196, 10, C_BAD);
    label(p1, R, 256, '三个都在同一套 129,514 段动作上打分', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 62, '1 张卡、3 小时：超过 SONIC', 'demo-x-ink', 14);
    label(p2, R, 86, '「3 小时」为什么是保守的（放大 1–10 显卡小时）', 'demo-x-ink2', 12);
    var cz = chart(p2, R + 34, 104, 290, 110, { logx: true, x0: 1, x1: 10, y0: 0.88, y1: 0.975, xt: [[1, '1'], [3, '3'], [10, '10']], yt: [[0.9, '0.90'], [0.93, '0.93']], xl: '显卡小时' });
    cz.line([[1, 0.9012], [10, 0.9012]], C_BASE, 1.8, '6 4');
    var half = 0.9012 + (0.9616 - 0.9012) / 2;
    cz.line([[1, half], [10, half]], C_GOOD, 1.6, '3 3');
    var zl = cz.line(PAPER.fig3a_1.filter(function (p) { return p[0] >= 1; }), C_SM, 2.4);
    hline(cz.g, cz.px(3), 104, cz.px(3), 214, C_INK, 1.2, '2 3');
    var zd = PAPER.fig3a_1.filter(function (p) { return p[0] >= 3; }).map(function (p) { return dotAt(cz.g, cz.px(p[0]), cz.py(p[1]), 4, C_GOOD); });
    legendRow(p2, R, 278, [['SONIC 0.90', C_BASE, 62, '6 4'], ['SONIC + 差距的一半', C_GOOD, 104, '3 3']], 11);
    label(p2, R, 300, '3 小时以后，每个存档都在绿虚线之上；失败数也这样比', 'demo-x-ink2', 11.5);
    label(p2, R, 320, '3 小时含采数据、拟合模型、更新策略；训练后的评测不算', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 62, '账本', 'demo-x-ink', 14);
    var gpus = [];
    for (var gq = 0; gq < 128; gq++) { var gr = paint(svgEl('rect', { x: R + (gq % 16) * 9, y: 76 + Math.floor(gq / 16) * 9, width: 7, height: 7, rx: 1.5 }), C_BASE); p3.appendChild(gr); gpus.push(gr); }
    var oneG = paint(svgEl('rect', { x: R + 200, y: 139, width: 7, height: 7, rx: 1.5 }), C_SM); p3.appendChild(oneG);
    label(p3, R, 164, 'SONIC：128 张 L40', 'demo-x-ink2', 12); label(p3, R + 200, 164, 'SuperMimic：1 张 H100', 'demo-x-ink2', 12);
    [R, R + 200].forEach(function (x) { var r0 = rectBox(p3, x, 172, 140, 10, C_BORDER, 'none'); r0.style.fill = 'none'; });
    var hA = hbar(p3, R, 172, 10, C_BASE), hB = hbar(p3, R + 200, 172, 10, C_SM);
    var hAt = label(p3, R, 198, '', 'demo-x-mut', 11), hBt = label(p3, R + 200, 198, '', 'demo-x-mut', 11);
    var acc = [label(p3, R, 220, '', 'demo-x-ink2', 12.5), label(p3, R + 200, 220, '', 'demo-x-ink2', 12.5), label(p3, R, 246, '', 'demo-x-ink', 12.5)];
    tone(p3, R, 274, '论文保守地写成：显卡小时 > 1000 倍、墙钟 > 50 倍', C_GOOD, 12);
    label(p3, R, 296, '（128 × 168 = 21,504，论文写约 21,000）', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 62, '硬件和数据的差别够不够解释？', 'demo-x-ink', 14);
    var q1 = barRowAt(p4, R, 86, 120, '数据少', C_BASE, 18, 12), q2 = barRowAt(p4, R, 116, 120, 'H100 峰值算力', C_BASE, 18, 12), q3 = barRowAt(p4, R, 146, 120, '显卡小时少', C_SM, 18, 12);
    label(p4, R, 192, '对数长度：2.3 倍、最多 5.5 倍，加起来也远不到 1000 倍', 'demo-x-ink2', 11.5);
    label(p4, R, 214, 'H100 的 fp32 只有 L40 的 0.74 倍，张量核 5.5 倍', 'demo-x-mut', 11);
    label(p4, R, 234, '两边实际用了多少峰值，不知道', 'demo-x-mut', 11);
    function draw(t, clock) {
      var u = clamp(since(t, clock, 3.6) / 2.4, 0, 1), x = Math.pow(10, Math.log10(0.05) + u * (Math.log10(20) - Math.log10(0.05)));
      l1.set(x); l2.set(x);
      setOpacity(m3, t >= 7.0 ? 0.5 + 0.5 * Math.abs(Math.sin(nowOf(t, clock) * 2.5)) : 0);
      setOpacity(bud, win(t, 10.1));
      var u3 = clamp(since(t, clock, 10.4) / 2.2, 0, 1);
      /* 账本：两边一起开训，墙钟时间往前走；SuperMimic 3 小时就停，SONIC 一直跑到 168 小时 */
      var hrs = 168 * u3;
      setW(hA, 140 * hrs / 168); setW(hB, 140 * Math.min(hrs, 3) / 168);
      hAt.textContent = '训练 ' + Math.round(hrs) + ' 小时'; hBt.textContent = '训练 ' + f1(Math.min(hrs, 3)) + ' 小时';
      gpus.forEach(function (g0, i) { g0.style.opacity = u3 > 0 ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(nowOf(t, clock) * 6 + i)) : 0.4; });
      oneG.style.opacity = hrs < 3 ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(nowOf(t, clock) * 6)) : 0.6;
      acc[0].textContent = '≈ ' + countTo(21000, u3) + ' 显卡小时';
      acc[1].textContent = f1(Math.min(hrs, 3)) + ' 显卡小时';
      acc[2].textContent = u3 >= 1 ? '显卡小时约 7200 倍；墙钟 168 ÷ 3 = 56 倍' : '';
      /* 怎么读：两条整段的回报，一条跟完、一条中途摔倒 */
      var ur = (since(t, clock, 0.3) % 4) / 3;
      setW(nrA, 260 * 0.93 * clamp(ur, 0, 1)); nrAt.textContent = f2(0.93 * clamp(ur, 0, 1));
      var fb2 = clamp(ur, 0, 0.41 / 0.93);
      setW(nrB, 260 * 0.93 * fb2); nrBt.textContent = f2(0.93 * fb2);
      fallX.style.opacity = ur * 0.93 >= 0.41 ? 1 : 0;
      /* 3 小时以后的存档一个个亮起 */
      var uz = clamp(since(t, clock, 3.6) / 2.4, 0, 1);
      zl.set(Math.pow(10, uz));
      zd.forEach(function (d, i) { d.style.opacity = Math.pow(10, uz) >= PAPER.fig3a_1.filter(function (p) { return p[0] >= 3; })[i][0] ? 1 : 0; });
      var u4 = clamp(since(t, clock, 13.4) / 1.6, 0, 1);
      q1.set(100 * Math.log10(2.3) / Math.log10(7200) * u4, '2.3 倍');
      q2.set(100 * Math.log10(5.5) / Math.log10(7200) * u4, '≤ 5.5 倍');
      q3.set(100 * u4, '约 7200 倍');
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 10.4));
      setOpacity(p3, win(t, 10.4, 13.4));
      setOpacity(p4, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 13: 179、25、0（表 A.6、图 A.1） ── */
  var FAILS = [['侧滚', 22, 22, 2, 0], ['空翻 360° / 180° / 90°', 44, 44, 1, 0], ['「fire-in-the-hole」转身', 20, 3, 3, 0], ['交叉腿', 10, 9, 0, 0], ['躺下、休息、站起', 99, 28, 8, 0], ['立定跳远', 24, 15, 0, 0], ['一套舞', 8, 8, 0, 0], ['其他', 129287, 50, 11, 0]];
  function buildSceneFails() {
    var s = sceneSvg('左边是附录图 A.1 的重画：横轴是训练的墙钟时间，纵轴是失败的动作数，深蓝 1 张卡、浅紫 2 张卡，黄色虚线是 SONIC 的 179；' +
      '右边是附录表 A.6 的重画：每组动作三根条，黄是 SONIC、蓝是 1 张卡 3 小时、紫是 2 张卡 9.8 小时（都是 0），整组都失败的打红框');
    s.appendChild(svgText(24, 26, '129,514 段动作，各放一遍：失败了几段', 'demo-x-ink2', 13.5));
    var L = group(s);
    var c = chart(L, 60, 60, 340, 170, { x0: 0, x1: 10, y0: 0, y1: 500, xt: [[0, '0'], [2, '2'], [4, '4'], [6, '6'], [8, '8'], [10, '10 h']], yt: [[0, '0'], [179, '179'], [400, '400']], xl: '训练的墙钟时间（小时）' });
    c.line([[0, 179], [10, 179]], C_BASE, 2, '6 4');
    var clipId = 'sm-fail-clip';
    var cp = svgEl('clipPath', { id: clipId });
    cp.appendChild(svgEl('rect', { x: 60, y: 60, width: 340, height: 170 }));
    L.appendChild(cp);
    var lg = group(L);
    lg.setAttribute('clip-path', 'url(#' + clipId + ')');
    var cc = chart(lg, 60, 60, 340, 170, { x0: 0, x1: 10, y0: 0, y1: 500 });
    cc.g.firstChild.style.opacity = 0;
    var a1 = cc.line(PAPER.figA1_1, C_SM, 2.2), a2 = cc.line(PAPER.figA1_2, C_PURPLE, 2.2);
    legendRow(L, 60, 288, [['1 张 H100', C_SM, 54, 'line'], ['2 张 H100', C_PURPLE, 54, 'line'], ['SONIC 179', C_BASE, 56, '6 4']], 11);
    label(L, 24, 312, '每 4000 次迭代存一次档，拿全部 129,514 段打分（越低越好）', 'demo-x-mut', 11);
    var R = 440;
    var rows = FAILS.map(function (f, i) {
      var y = 66 + i * 30, g = group(s);
      label(g, R, y + 13, f[0], 'demo-x-ink2', 11.5);
      label(g, R + 136, y + 13, f[1] > 1000 ? '' : '（' + f[1] + '）', 'demo-x-mut', 11);
      var bS = hbar(g, R + 176, y, 8, C_BASE), b1 = hbar(g, R + 176, y + 9, 6, C_SM), b2 = hbar(g, R + 176, y + 16, 4, C_PURPLE);
      var v = label(g, R + 182, y + 12, '', 'demo-x-ink', 11);
      var allFail = rectBox(g, R - 4, y - 4, 360, 26, C_BAD, 'none');
      allFail.style.fill = 'none';
      return { g: g, bS: bS, b1: b1, b2: b2, v: v, f: f, all: allFail };
    });
    legendRow(s, R, 52, [['SONIC', C_BASE, 34], ['1 张卡 3 h', C_SM, 56], ['2 张卡 9.8 h', C_PURPLE, 66]], 11);
    var tot = label(s, R, 316, '', 'demo-x-ink', 13);
    function draw(t, clock) {
      var uS = clamp(since(t, clock, 3.6) / 1.2, 0, 1), uM = clamp(since(t, clock, 7.0) / 1.2, 0, 1);
      rows.forEach(function (r) {
        var sc = function (n) { return 90 * Math.min(1, n / 50); };
        setW(r.bS, sc(r.f[2]) * uS);
        setW(r.b1, sc(r.f[3]) * uM);
        setW(r.b2, 0);
        var txt = (uS > 0 ? String(r.f[2]) : '') + (uM > 0 ? ' / ' + r.f[3] + ' / ' + r.f[4] : '');
        r.v.textContent = txt;
        r.v.setAttribute('x', (R + 182 + Math.max(sc(r.f[2]) * uS, sc(r.f[3]) * uM)).toFixed(1));
        r.all.style.opacity = uS >= 1 && r.f[1] === r.f[2] ? 1 : 0;
      });
      tot.textContent = '合计：SONIC ' + Math.round(179 * uS) + (uM > 0 ? '，1 张卡 3 小时 ' + Math.round(25 * uM) + '，2 张卡 9.8 小时 0' : '');
      var u = clamp(since(t, clock, 10.4) / 2.4, 0, 1);
      a1.set(0.12 + u * 9.3); a2.set(0.13 + u * 9.7);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 14: 同样的设置和 PPO 比（图 4a） ── */
  function buildScenePPO() {
    var s = sceneSvg('论文图 4a 的重画：LAFAN1 的 40 段动作，横轴是墙钟时间（0–18 小时），纵轴是评测的归一化回报，蓝线是 SuperMimic 1 张卡，三条黄橙线是在仿真器里跑 PPO 的 1、4、8 张卡，灰色虚线是 0.82；' +
      '右边依次出现：两边相同的设置清单、SuperMimic 到 0.82 的时刻、PPO 18 小时的终点、我们用复现模型在 40 段上重测的每段回报');
    s.appendChild(svgText(24, 26, '论文图四 a：同样的设置，在仿真器里跑 PPO', 'demo-x-ink2', 13.5));
    var c = chart(s, 60, 60, 340, 180, { x0: 0, x1: 19, y0: 0, y1: 0.9, xt: [[0, '0'], [3, '3'], [6, '6'], [9, '9'], [12, '12'], [15, '15'], [18, '18 h']], yt: [[0, '0'], [0.4, '0.4'], [0.82, '0.82']], xl: '墙钟时间（小时）' });
    c.line([[0, 0.82], [19, 0.82]], C_MUTED, 1.4, '5 4');
    var lp = [c.line(PAPER.fig4a_ppo1, C_BASE, 1.8, '2 3'), c.line(PAPER.fig4a_ppo4, C_BASE, 2, '6 3'), c.line(PAPER.fig4a_ppo8, C_BASE, 2.2)];
    var ls = c.line(PAPER.fig4a_sm, C_SM, 2.8);
    var m12 = ringAt(c.g, c.px(1.2), c.py(0.82), 6, C_GOOD, 2.4);
    legendRow(s, 60, 300, [['SuperMimic 1 张', C_SM, 84, 'line'], ['目标 0.82', C_MUTED, 50, '5 4']], 11);
    legendRow(s, 60, 320, [['PPO 8 张', C_BASE, 48, 'line'], ['PPO 4 张', C_BASE, 48, '6 3'], ['PPO 1 张', C_BASE, 48, '2 3']], 11);
    label(s, 24, 340, '每个点是一个存档，在 40 段上打分；越高越好', 'demo-x-mut', 11);
    var R = 440;
    var p1 = group(s);
    label(p1, R, 62, 'PPO-Sim：只换训练方法', 'demo-x-ink', 14);
    var ckR = ['动作、观测、奖励、终止', '域随机化、网络大小、评测', 'PPO 超参数照 BeyondMimic', '每张卡 8192 个环境（是 SuperMimic 的 2 倍）'].map(function (w, i) {
      var g = group(p1);
      tick(g, R, 80 + i * 28, 12);
      label(g, R + 20, 92 + i * 28, w, 'demo-x-ink2', 12);
      return g;
    });
    label(p1, R, 200, '两边只差一件事：怎么更新策略', 'demo-x-ink2', 12);
    label(p1, R, 222, 'LAFAN1：40 段，共 2.45 小时', 'demo-x-mut', 11.5);
    var p2 = group(s);
    label(p2, R, 62, '结果', 'demo-x-ink', 14);
    label(p2, R, 88, '到 0.82 要多久（墙钟时间）', 'demo-x-ink2', 12);
    var race = [['SuperMimic 1 张', C_SM, 1.2, '1.2 小时到了'], ['PPO 8 张', C_BASE, 18, '18 小时没到：0.72'], ['PPO 4 张', C_BASE, 18, '18 小时没到：0.70'], ['PPO 1 张', C_BASE, 18, '18 小时没到：0.60']].map(function (r0, i) {
      return { b: barRowAt(p2, R, 100 + i * 28, 100, r0[0], r0[1], 16, 11.5), h: r0[2], txt: r0[3] };
    });
    var pr = [];
    label(p2, R, 232, '从 4 张加到 8 张几乎没用', 'demo-x-ink2', 12);
    label(p2, R, 254, '条长按墙钟时间画（18 小时 = 满格）', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 62, '我们重测：复现模型在 40 段上', 'demo-x-ink', 14);
    var EV = REPRO.eval, cl = EV.clips.slice().sort(function (a, b) { return b[1] - a[1]; });
    var c3 = chart(p3, R + 24, 80, 316, 120, { x0: 0, x1: cl.length, y0: 0.6, y1: 1, xt: [], yt: [[0.6, '0.6'], [0.8, '0.8'], [1, '1']] });
    var b3 = cl.map(function (r0, i) { return vbar(c3.g, c3.px(i) + 1, 316 / cl.length - 2, C_SM); });
    hline(c3.g, c3.px(0), c3.py(EV.mean), c3.px(cl.length), c3.py(EV.mean), C_GOOD, 1.6, '5 3');
    label(p3, R + 24, 218, '每根条是一段（从高到低排），绿虚线是平均', 'demo-x-mut', 11);
    var r3 = label(p3, R, 248, '', 'demo-x-ink', 13);
    label(p3, R, 272, 'Uni-SuperMimic 放出的模型，MuJoCo（CPU）重放', 'demo-x-mut', 11);
    function draw(t, clock) {
      var u = clamp(since(t, clock, 7.0) / 2.0, 0, 1);
      ls.set(3 * u);
      var up = clamp(since(t, clock, 10.4) / 2.4, 0, 1);
      lp.forEach(function (l) { l.set(18.7 * up); });
      setOpacity(m12, t >= 7.0 ? 1 : 0);
      void pr;
      ckR.forEach(function (g, i) { setOpacity(g, clamp(since(t, clock, 0.6) / 0.4 - i * 1.5, 0, 1)); });
      var hr = 18 * clamp(since(t, clock, 7.0) / 3.5, 0, 1);
      race.forEach(function (r0) { var w = Math.min(hr, r0.h); r0.b.set(100 * w / 18, hr >= r0.h ? r0.txt : f1(w) + ' 小时'); });
      var u3 = clamp(since(t, clock, 13.4) / 1.6, 0, 1), base = c3.py(0.6);
      b3.forEach(function (b, i) { b.set(base, (base - c3.py(Math.max(0.6, cl[i][1]))) * clamp(u3 * cl.length / 8 - i / 8, 0, 1)); });
      r3.textContent = '平均 ' + f3(EV.mean) + '，失败 ' + EV.failed + ' / ' + EV.n + ' 段';
      setOpacity(p1, win(t, 0.3, 7.0));
      setOpacity(p2, win(t, 7.0, 13.4));
      setOpacity(p3, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 15: 为什么省：三个性质（图 3b、c，图 5） ── */
  function buildSceneWhy() {
    var s = sceneSvg('三段依次出现：第一段是论文图 3b、3c——数据从 1 小时到 264 小时，到目标回报要的显卡小时（蓝点）和按数据量成比例的虚线、世界模型的 8 步预测误差；' +
      '第二段是图 5a——每秒能走多少步，蓝是世界模型、黄是 MuJoCo Warp，竖着的括号标出快多少倍；第三段是图 5b——训练回报随想象的步数，蓝是 SuperMimic，四条黄橙线是在世界模型里跑 PPO 的四种批量');
    s.appendChild(svgText(24, 26, '为什么省：世界模型的三个性质', 'demo-x-ink2', 13.5));
    /* 第一段 */
    var p1 = group(s);
    label(p1, 24, 54, '① 一个模型摊薄整个动作库（图三 b、c）', 'demo-x-ink', 14);
    var xtD = [[1, '1'], [10, '10'], [100, '100']];
    var cb = chart(p1, 60, 84, 300, 90, { logx: true, x0: 0.7, x1: 400, y0: 0, y1: 2.2, xt: xtD, yt: [[0, '0'], [1, '1'], [2, '2']] });
    label(p1, 60, 76, '到目标回报要的显卡小时', 'demo-x-mut', 11);
    var prop = cb.line([[1, 0.539], [4, 2.156]], C_MUTED, 1.6, '5 4');
    var lb = cb.line(PAPER.fig3b, C_SM, 2.4);
    var db = PAPER.fig3b.map(function (p) { return dotAt(cb.g, cb.px(p[0]), cb.py(p[1]), 4.5, C_SM); });
    legendRow(p1, 420, 178, [['论文实测', C_SM, 50, 'line'], ['和数据量成正比', C_MUTED, 84, '5 4']], 11);
    var cc = chart(p1, 60, 222, 300, 76, { logx: true, x0: 0.7, x1: 400, y0: 0, y1: 0.012, xt: xtD, yt: [[0, '0'], [0.01, '0.01']], xl: '数据量（小时，对数刻度）' });
    label(p1, 60, 214, '8 步预测误差（归一化）', 'demo-x-mut', 11);
    var lc = cc.line(PAPER.fig3c, C_SM, 2.4);
    var dc = PAPER.fig3c.map(function (p) { return dotAt(cc.g, cc.px(p[0]), cc.py(p[1]), 4.5, C_SM); });
    var v1 = [label(p1, 420, 96, '', 'demo-x-ink2', 12.5), label(p1, 420, 122, '', 'demo-x-ink2', 12.5), label(p1, 420, 148, '', 'demo-x-ink2', 12.5)];
    label(p1, 420, 232, '误差：0.007 → 0.011，基本不变', 'demo-x-ink2', 12.5);
    label(p1, 420, 258, '每一段动作都是同一个身体：', 'demo-x-mut', 11.5);
    label(p1, 420, 278, '多出来的数据是更多的证据，不是要多学的东西', 'demo-x-mut', 11.5);
    /* 第二段 */
    var p2 = group(s);
    label(p2, 24, 58, '② 想象比仿真快（图五 a，H100 上，每秒走几步）', 'demo-x-ink', 14);
    var ca = chart(p2, 70, 84, 360, 200, { logx: true, logy: true, x0: 400, x1: 84000, y0: 1e4, y1: 3e7,
      xt: [[512, '512'], [2048, '2k'], [8192, '8k'], [32768, '32k']], yt: [[1e4, '1万'], [1e5, '10万'], [1e6, '100万'], [1e7, '1000万']], xl: '并行的环境数（对数）' });
    var band = paint(svgEl('rect', { x: ca.px(2048), y: 84, width: ca.px(16384) - ca.px(2048), height: 200 }), C_MUTED);
    band.style.opacity = 0.12; ca.g.insertBefore(band, ca.g.firstChild.nextSibling);
    label(p2, (ca.px(2048) + ca.px(16384)) / 2, 100, '实际用的范围', 'demo-x-mut', 11, 'middle');
    var lw = ca.line(PAPER.fig5a_wm, C_SM, 2.4), lm = ca.line(PAPER.fig5a_mjw, C_BASE, 2.4);
    var brs = [[2048, 7.84e4, 8.43e5, '11 倍'], [16384, 2.61e5, 6.71e6, '26 倍'], [65536, 3.22e5, 2.00e7, '62 倍']].map(function (b) {
      var g = group(p2);
      hline(g, ca.px(b[0]), ca.py(b[1]), ca.px(b[0]), ca.py(b[2]), C_INK, 1.6);
      tone(g, b[0] > 40000 ? ca.px(b[0]) - 6 : ca.px(b[0]) + 6, (ca.py(b[1]) + ca.py(b[2])) / 2 + 4, b[3], C_INK, 12, b[0] > 40000 ? 'end' : 'start');
      return g;
    });
    legendRow(p2, 470, 262, [['世界模型', C_SM, 52, 'line'], ['MuJoCo Warp', C_BASE, 74, 'line']], 11);
    label(p2, 470, 110, '一步 = 50 Hz 的一个控制步', 'demo-x-ink2', 12);
    label(p2, 470, 134, 'MuJoCo Warp 要算 4 个 5 ms 的子步', 'demo-x-ink2', 12);
    label(p2, 470, 170, '常用的 2k–16k 个环境：快 10 倍以上', 'demo-x-ink', 12.5);
    label(p2, 470, 196, '65,536 个环境：快 62 倍', 'demo-x-ink', 12.5);
    label(p2, 470, 222, 'MuJoCo Warp 这时已经到顶', 'demo-x-mut', 11.5);
    /* 第三段 */
    var p3 = group(s);
    label(p3, 24, 58, '③ 一阶梯度：要的想象步数少 64 倍（图五 b）', 'demo-x-ink', 14);
    var c5 = chart(p3, 70, 84, 360, 200, { x0: 7, x1: 10.9, y0: 0, y1: 1.0, xt: [[7, '1000万'], [8, '1亿'], [9, '10亿'], [10, '100亿']], yt: [[0.4, '0.4'], [0.84, '0.84']], xl: '想象的总步数（对数）' });
    var pp = [['p4k32', '2 3'], ['p8k24', '4 3'], ['p8k32', '7 3'], ['p16k32', null]].map(function (k0) { return c5.line(PAPER['fig5b_' + k0[0]].filter(function (p) { return p[0] >= 7; }), C_BASE, k0[1] ? 1.6 : 2.2, k0[1]); });
    var lsm = c5.line(PAPER.fig5b_sm.filter(function (p) { return p[0] >= 7; }), C_SM, 2.6);
    var b64 = group(p3);
    hline(b64, c5.px(Math.log10(9.317e8)), c5.py(0.841), c5.px(Math.log10(5.956e10)), c5.py(0.841), C_INK, 1.6, '3 3');
    tone(b64, c5.px(10.3), c5.py(0.841) - 7, '64 倍', C_INK, 12.5, 'middle');
    legendRow(p3, 470, 286, [['SuperMimic', C_SM, 64, 'line']], 11);
    label(p3, 470, 306, '世界模型里跑 PPO（图例照论文）：', 'demo-x-mut', 11);
    legendRow(p3, 470, 326, [['16k × 32', C_BASE, 50, 'line'], ['8k × 32', C_BASE, 44, '7 3']], 11);
    legendRow(p3, 470, 346, [['8k × 24', C_BASE, 44, '4 3'], ['4k × 32', C_BASE, 44, '2 3']], 11);
    label(p3, 470, 110, '同样在世界模型里想象', 'demo-x-ink2', 12);
    label(p3, 470, 134, '只换更新策略的办法', 'demo-x-ink2', 12);
    label(p3, 470, 170, 'PPO：采样估梯度', 'demo-x-ink2', 12);
    label(p3, 470, 194, 'SuperMimic：沿模型求导', 'demo-x-ink2', 12);
    label(p3, 470, 230, '所以省下的不只是仿真速度，', 'demo-x-ink', 12.5);
    label(p3, 470, 254, '梯度本身也更有用', 'demo-x-ink', 12.5);
    label(p3, 470, 368, '数据：LAFAN1 里走、跑、冲刺', 'demo-x-mut', 11);
    function draw(t, clock) {
      var u1 = clamp(since(t, clock, 3.6) / 2, 0, 1);
      lb.set(Math.pow(264, u1)); lc.set(Math.pow(264, clamp(since(t, clock, 0.4) / 2, 0, 1)));
      db.forEach(function (d, i) { d.style.opacity = Math.pow(264, u1) >= PAPER.fig3b[i][0] ? 1 : 0; });
      dc.forEach(function (d, i) { d.style.opacity = Math.pow(264, clamp(since(t, clock, 0.4) / 2, 0, 1)) >= PAPER.fig3c[i][0] ? 1 : 0; });
      setOpacity(prop.node, u1);
      v1[0].textContent = u1 > 0.2 ? '1 小时：0.54 显卡小时' : '';
      v1[1].textContent = u1 > 0.6 ? '7 小时：1.35；40 小时：1.91' : '';
      v1[2].textContent = u1 > 0.95 ? '264 小时：1.89（差不多就封顶了）' : '';
      var u2 = clamp(since(t, clock, 7.0) / 2, 0, 1), xx = Math.pow(10, Math.log10(512) + u2 * (Math.log10(65536) - Math.log10(512)));
      lw.set(xx); lm.set(xx);
      brs.forEach(function (g, i) { setOpacity(g, t >= (i < 2 ? 7.6 : 10.4) ? 1 : 0); });
      var u3 = clamp(since(t, clock, 13.4) / 2.4, 0, 1), xr = 6 + u3 * 5;
      pp.forEach(function (l) { l.set(xr); });
      lsm.set(xr);
      setOpacity(b64, u3 >= 1 ? 1 : 0);
      setOpacity(p1, win(t, 0.3, 7.0));
      setOpacity(p2, win(t, 7.0, 13.4));
      setOpacity(p3, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 16: 上真机（图 6） ── */
  function buildSceneReal() {
    var s = sceneSvg('左边是项目页的真机视频：先是林子里侧滚一圈再跳舞，再是海边的蹦跳和空翻；右边是论文图 6 的四条真机快照：蹦跳着跳、侧滚、90 度空翻、原地 360 度空翻，讲到哪条框出哪条');
    s.appendChild(svgText(24, 26, '一个通用跟踪策略，上真机 G1', 'demo-x-ink2', 13.5));
    var cRoll = projClip(s, 'roll', 24, 44, 380, 214, '项目页视频（1x）：林间侧滚，再接着跳舞');
    var cBay = projClip(s, 'bay', 24, 67, 380, 168, '项目页视频：海边的蹦跳、翻滚、空翻');
    label(s, 24, 296, '不按动作单独调参；训练只用仿真器和世界模型', 'demo-x-ink2', 12);
    var R = 424, rows = [['skip', '蹦跳着跳', '0.2 s'], ['roll', '侧滚：躯干和四肢着地', '0.3 s'], ['flip90', '90° 空翻', '0.2 s'], ['flip360', '原地 360° 空翻', '0.2 s']];
    label(s, R, 54, '论文图六：真机快照（相邻两张隔 Δt）', 'demo-x-ink', 13);
    var fr = rows.map(function (r0, i) {
      var y = 62 + i * 78;
      var p = paperPart(s, r0[0], 0, 0, 1, 1, R, y, 330);
      label(s, R, y + p.h + 18, (i + 1) + '　' + r0[1] + '　Δt = ' + r0[2], 'demo-x-ink2', 11.5);
      var box = rectBox(s, R - 5, y - 5, 340, p.h + 31, C_SM, 'none');
      box.style.fill = 'none';
      return box;
    });
    function draw(t, clock) {
      var rollVis = win(t, 0.3, 10.4) > 0.02, bayVis = t >= 10.4;
      cRoll.at(K.clipSince(t, 0), rollVis && !bayVis);
      cBay.at(K.clipSince(t, 10.4), bayVis);
      setOpacity(cRoll.g, bayVis ? 0 : 1);
      setOpacity(cBay.g, seg(t, 10.4, 10.7));
      var k = t < 3.6 ? -1 : Math.floor((since(t, clock, 3.6) / 1.6)) % 4;
      fr.forEach(function (b, i) { b.style.opacity = t >= 3.6 && t < 7.0 ? (i === k ? 1 : 0) : 0; });
    }
    return { el: s, draw: draw };
  }

  /* ── scene 17: 下游：速度命令（图 7） ── */
  function buildSceneDownstream() {
    var s = sceneSvg('左边是附录 B 的结构：每种接口一个目标编码器，动作编码器吃未来 10 帧参考、速度编码器吃速度命令和观测历史的特征，都出 32 维的潜变量 z，共用一个解码器出动作；' +
      '右边是论文图 7 的重画：一次一个平面，每个圆环是一个阶跃命令，外圈越大误差越大，蓝色是强化学习训的编码器更好、黄橙是蒸馏更好、黑圈是蒸馏摔倒');
    s.appendChild(svgText(24, 26, '下游接口：同一个世界模型，训一个速度编码器', 'demo-x-ink2', 13.5));
    var L = group(s);
    boxText(L, 24, 56, 130, 50, '动作编码器\n未来 10 帧参考', C_SM, { size: 11.5 });
    boxText(L, 24, 122, 130, 50, '速度编码器\n$(v_x, v_y, \\omega_z)$', C_WARN, { size: 11.5 });
    var zb = boxText(L, 184, 89, 64, 50, '$z$\n32 维', C_INK, { size: 12 });
    void zb;
    var dec = boxText(L, 278, 82, 112, 64, '共用解码器\n潜变量 + 10 帧观测', C_INK, { size: 11, lh: 1.85 });
    void dec;
    label(L, 334, 168, '→ 29 维动作', 'demo-x-ink2', 11.5, 'middle');
    var fz1 = flowSeg(L, C_SM, 2, 3, 40), fz2 = flowSeg(L, C_WARN, 2, 3, 40), fz3 = flowSeg(L, C_INK, 2, 3, 40);
    var tr1 = group(L);
    label(tr1, 24, 206, '蒸馏：用动作跟踪的奖励，命令从参考动作里读', 'demo-x-ink2', 11.5);
    tone(tr1, 24, 228, '强化学习：直接用速度跟踪的奖励（表 A.7）', C_GOOD, 11.5);
    label(tr1, 24, 250, '只更新速度编码器，解码器的权重不动', 'demo-x-mut', 11);
    label(tr1, 24, 272, '强化学习那一版另加：潜变量往动作编码器的对齐，权重 0.1', 'demo-x-mut', 11);
    var tr2 = group(L);
    tone(tr2, 24, 300, '世界模型不用重训：身体还是那个身体', C_WM, 12);
    var R = 430;
    /* 右边（前 10 秒）：俯视的机器人照速度命令走——往前、往左、边走边转、往后 */
    var pv = group(s);
    label(pv, R, 52, '速度命令：往前、往左、转弯', 'demo-x-ink', 13.5);
    rectBox(pv, R, 66, 330, 200, C_BORDER, C_SURFACE2);
    for (var gx = 1; gx < 11; gx++) hline(pv, R + gx * 30, 66, R + gx * 30, 266, C_BORDER, 0.6, '2 4');
    for (var gy = 1; gy < 7; gy++) hline(pv, R, 66 + gy * 28.6, R + 330, 66 + gy * 28.6, C_BORDER, 0.6, '2 4');
    var trail = pathLine(pv, [], C_WARN, 2, '3 3');
    var bot = dotAt(pv, 0, 0, 11, C_SURFACE), botR = ringAt(pv, 0, 0, 11, C_INK, 2), botA = arrow(pv, C_INK, 2.2);
    var cmdT = [tone(pv, R, 288, '', C_WARN, 12.5), label(pv, R, 310, '', 'demo-x-ink2', 12)];
    label(pv, R, 332, '$v_x$ 往前、$v_y$ 往左（m/s），$\\omega_z$ 转弯（rad/s）', 'demo-x-mut', 11);
    var CMDS = [[1.0, 0, 0, '往前走'], [0, 0.6, 0, '往左横着走'], [0.7, 0, 1.2, '边走边转'], [-0.6, 0, 0, '往后退']];
    /* ── 图 7 一步一步读：阶跃测试 → 一个圆环 → 一张图 → 另两张图 → 总数 ── */
    var X0 = 40;
    /* ① 一次阶跃测试（示意：两条曲线按中位数 0.16、0.49 画，不是实测） */
    var fa = group(s);
    label(fa, X0, 52, '图 7 先读懂一次阶跃测试', 'demo-x-ink', 13.5);
    var cs1 = chart(fa, X0 + 30, 88, 330, 170, { x0: 0, x1: 5, y0: 0, y1: 1.25, xt: [[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5 s']], yt: [[0, '0'], [0.5, '0.5'], [1, '1.0']], xl: '时间（从站着开始）' });
    label(fa, X0 + 30, 80, '往前的速度（m/s）', 'demo-x-mut', 11);
    var band = paint(svgEl('rect', { x: cs1.px(3), y: 88, width: cs1.px(5) - cs1.px(3), height: 170 }), C_MUTED);
    band.style.opacity = 0.14; cs1.g.insertBefore(band, cs1.g.firstChild.nextSibling);
    label(fa, (cs1.px(3) + cs1.px(5)) / 2, 102, '最后 2 秒', 'demo-x-mut', 11, 'middle');
    cs1.line([[0, 1], [5, 1]], C_INK, 1.6, '6 4');
    function stepCurve(fin, wob) { var o = []; for (var q = 0; q <= 100; q++) { var tt = q / 20; o.push([tt, fin * (1 - Math.exp(-tt * 2.2)) + wob * Math.sin(tt * 5) * Math.exp(-tt * 0.4)]); } return o; }
    var cRL = cs1.line(stepCurve(0.84, 0.05), C_SM, 2.4), cDS = cs1.line(stepCurve(0.51, 0.08), C_BASE, 2.4);
    var brR = group(fa), brD = group(fa);
    hline(brR, cs1.px(4.7), cs1.py(1), cs1.px(4.7), cs1.py(0.84), C_SM, 2); tone(brR, cs1.px(4.7) - 6, cs1.py(0.92) + 4, '差 0.16', C_SM, 11, 'end');
    hline(brD, cs1.px(3.75), cs1.py(1), cs1.px(3.75), cs1.py(0.51), C_BASE, 2); tone(brD, cs1.px(3.75) - 6, cs1.py(0.7) + 4, '差 0.49', C_BASE, 11, 'end');
    legendRow(fa, X0 + 30, 322, [['命令 1.0 m/s', C_INK, 70, '6 4'], ['强化学习的编码器', C_SM, 96, 'line'], ['蒸馏的编码器', C_BASE, 72, 'line']], 11);
    label(fa, 450, 96, '从站着开始，给一个固定的速度命令，跑 5 秒', 'demo-x-ink2', 12);
    label(fa, 450, 120, '取最后 2 秒的平均速度，和命令差多少', 'demo-x-ink2', 12);
    label(fa, 450, 144, '再除以命令的大小：相对误差，越小越好', 'demo-x-ink2', 12);
    label(fa, 450, 168, '每个命令试 4 次，取中位数', 'demo-x-ink2', 12);
    label(fa, 450, 200, '两条曲线是示意：按两者误差的中位数', 'demo-x-mut', 11);
    label(fa, 450, 220, '0.16、0.49 画的，不是论文的实测', 'demo-x-mut', 11);
    /* ② 一个圆环 = 这一对误差 */
    var fb = group(s);
    label(fb, X0, 52, '一个圆环，画的是同一个命令的两个误差', 'demo-x-ink', 13.5);
    var eb1 = hbar(fb, X0 + 110, 84, 16, C_SM), eb2 = hbar(fb, X0 + 110, 112, 16, C_BASE);
    label(fb, X0 + 100, 97, '强化学习 0.16', 'demo-x-ink2', 11.5, 'end'); label(fb, X0 + 100, 125, '蒸馏 0.49', 'demo-x-ink2', 11.5, 'end');
    var bigC = [X0 + 150, 228], RB = 80;
    var bigRing = paint(svgEl('path', { d: 'M0 0', 'fill-rule': 'evenodd' }), C_SM); fb.appendChild(bigRing);
    var tO = tone(fb, bigC[0] + 72, bigC[1] - 38, '外圈面积 ∝ 较大的误差 0.49', C_SM, 11.5), tI = tone(fb, bigC[0] + 92, bigC[1] + 4, '孔的面积 ∝ 较小的误差 0.16', C_INK, 11.5);
    hline(fb, bigC[0] + 28, bigC[1], bigC[0] + 86, bigC[1], C_INK, 1.2, '2 3');
    label(fb, 470, 96, '颜色：谁的误差更小——蓝是强化学习，黄是蒸馏', 'demo-x-ink2', 12);
    label(fb, 470, 120, '圈越大：较差的那个越差', 'demo-x-ink2', 12);
    label(fb, 470, 144, '环越粗：两者差得越多', 'demo-x-ink2', 12);
    label(fb, 470, 168, '误差超过 0.9 的，按 0.9 画', 'demo-x-mut', 11);
    function ringD(cx, cy, ro, ri) {
      function c(r) { return 'M' + (cx - r).toFixed(1) + ' ' + cy.toFixed(1) + 'a' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 1 0 ' + (2 * r).toFixed(1) + ' 0a' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 1 0 ' + (-2 * r).toFixed(1) + ' 0Z'; }
      return c(ro) + (ri > 0.3 ? c(ri) : '');
    }
    var exs = [[0.85, 0.75, C_SM, '两个都不好'], [0.85, 0.08, C_SM, '差距很大'], [0.2, 0.15, C_BASE, '蒸馏略好']].map(function (e0, i) {
      var cx = 500 + i * 100, cy = 236, rr = 26;
      var pth = paint(svgEl('path', { d: ringD(cx, cy, rr * Math.sqrt(e0[0] / 0.9), rr * Math.sqrt(e0[1] / 0.9)), 'fill-rule': 'evenodd' }), e0[2]); fb.appendChild(pth);
      label(fb, cx, 286, e0[3], 'demo-x-mut', 11, 'middle');
      return pth;
    });
    void exs;
    /* ③ 一张图：一个平面上的 224 个命令；④ 另两张；⑤ 总数 */
    var PL = { vx_vy: [[-1.625, 2.125], [-1.4143, 1.4143], [[-1, '−1'], [0, '0'], [1, '1'], [2, '2']], [[-1, '−1'], [0, '0'], [1, '1']], '往前的速度 $v_x$（m/s）', '往左 $v_y$（m/s）', '$v_y$ 对 $v_x$'],
      vx_wz: [[-1.625, 2.125], [-3.5893, 3.5893], [[-1, '−1'], [0, '0'], [1, '1'], [2, '2']], [[-2, '−2'], [0, '0'], [2, '2']], '往前 $v_x$', '转弯 $\\omega_z$（rad/s）', '$\\omega_z$ 对 $v_x$'],
      vy_wz: [[-1.4143, 1.4143], [-3.5893, 3.5893], [[-1, '−1'], [0, '0'], [1, '1']], [[-2, '−2'], [0, '0'], [2, '2']], '往左 $v_y$', '转弯 $\\omega_z$', '$\\omega_z$ 对 $v_y$'] };
    function bgOp(sec) { return 0.05 + 0.75 * clamp((Math.log10(Math.max(sec, 0.01)) + 1) / 4, 0, 1); }
    function plane(parent, key, x0, y0, W, opts) {
      var o = opts || {}, P = PL[key], g = group(parent), cw = W / 15;
      rectBox(g, x0, y0, W, W, C_BORDER, C_SURFACE);
      function px(v) { return x0 + (v - P[0][0]) / (P[0][1] - P[0][0]) * W; }
      function py(v) { return y0 + W - (v - P[1][0]) / (P[1][1] - P[1][0]) * W; }
      FIG7F[key].forEach(function (sec, k) {
        var i = Math.floor(k / 15), j = k % 15, c = paint(svgEl('rect', { x: (x0 + i * cw).toFixed(1), y: (y0 + W - (j + 1) * cw).toFixed(1), width: cw.toFixed(1), height: cw.toFixed(1) }), C_MUTED);
        c.style.opacity = bgOp(sec).toFixed(2); g.appendChild(c);
      });
      if (o.ticks) {
        P[2].forEach(function (tk) { label(g, px(tk[0]), y0 + W + 17, tk[1], 'demo-x-mut', 11, 'middle'); });
        P[3].forEach(function (tk) { label(g, x0 - 9, py(tk[0]) + 4, tk[1], 'demo-x-mut', 11, 'end'); });
        label(g, x0 + W / 2, y0 + W + 37, P[4], 'demo-x-mut', 11, 'middle');
        label(g, x0, y0 - 8, P[5], 'demo-x-mut', 11);
      } else label(g, x0 + W / 2, y0 + W + 18, P[6], 'demo-x-mut', 11, 'middle');
      var rings = FIG7[key].map(function (r0) {
        var cx = px(r0[0]), cy = py(r0[1]), rr = cw * 0.48;
        if (r0[5]) { var f = ringAt(g, cx, cy, rr, C_INK, 2); return { n: f, fell: true, cx: cx, cy: cy }; }
        var n = paint(svgEl('path', { d: ringD(cx, cy, rr * Math.sqrt(Math.min(0.9, r0[2]) / 0.9), rr * Math.sqrt(Math.min(0.9, r0[3]) / 0.9)), 'fill-rule': 'evenodd' }), r0[4] ? C_SM : C_BASE);
        g.appendChild(n);
        return { n: n, fell: false, cx: cx, cy: cy, i: Math.round((r0[0] - P[0][0]) / (P[0][1] - P[0][0]) * 15 - 0.5) };
      });
      return { g: g, rings: rings, px: px, py: py };
    }
    var fc = group(s);
    label(fc, X0, 52, '一张图：转弯固定为 0 的一个平面', 'demo-x-ink', 13.5);
    var P1 = plane(fc, 'vx_vy', X0 + 40, 92, 230, { ticks: true });
    label(fc, 360, 96, '每个格子是一个命令：15 × 15 个', 'demo-x-ink2', 12);
    label(fc, 360, 120, '去掉站着不动的那一个，224 个', 'demo-x-ink2', 12);
    label(fc, 360, 152, '背景：动作库里这种速度有多少秒数据', 'demo-x-ink2', 12);
    var cbar = group(fc);
    for (var cbk = 0; cbk < 9; cbk++) { var cbr = paint(svgEl('rect', { x: 360 + cbk * 22, y: 162, width: 22, height: 12 }), C_MUTED); cbr.style.opacity = bgOp(Math.pow(10, -1 + cbk * 0.5)).toFixed(2); cbar.appendChild(cbr); }
    rectBox(cbar, 360, 162, 198, 12, C_BORDER, 'none').style.fill = 'none';
    label(fc, 360, 190, '0.1 s', 'demo-x-mut', 11); label(fc, 459, 190, '10 s', 'demo-x-mut', 11, 'middle'); label(fc, 558, 190, '1000 s', 'demo-x-mut', 11, 'end');
    legendRow(fc, 360, 222, [['强化学习更好', C_SM, 76, 'ring'], ['蒸馏更好', C_BASE, 52, 'ring']], 11);
    label(fc, 360, 250, '几乎全是蓝色：这一面蒸馏只赢了 10 个', 'demo-x-ink2', 12);
    var fd = group(s);
    label(fd, X0, 52, '另两张图：纵轴换成转弯的角速度', 'demo-x-ink', 13.5);
    var P2 = plane(fd, 'vx_wz', X0 + 30, 92, 190, { ticks: true }), P3 = plane(fd, 'vy_wz', X0 + 270, 92, 190, { ticks: true });
    var fellHl = [];
    [P2, P3].forEach(function (Pp) { Pp.rings.forEach(function (r0) { if (r0.fell) fellHl.push(ringAt(fd, r0.cx, r0.cy, 9, C_BAD, 2)); }); });
    legendRow(fd, 530, 96, [['蒸馏 4 次都摔倒', C_INK, 90, 'ring']], 11);
    label(fd, 530, 122, '一共 7 个命令', 'demo-x-ink2', 12);
    label(fd, 530, 146, '都在边平移、边快速转弯', 'demo-x-ink2', 12);
    label(fd, 530, 170, '（2.8 rad/s 以上）的地方', 'demo-x-ink2', 12);
    label(fd, 530, 194, '那里背景几乎是空的：', 'demo-x-ink2', 12);
    label(fd, 530, 218, '动作库里几乎没有这种数据', 'demo-x-ink2', 12);
    var fe = group(s);
    label(fe, X0, 52, '三张图加起来：672 个命令', 'demo-x-ink', 13.5);
    var mini = ['vx_vy', 'vx_wz', 'vy_wz'].map(function (k0, i) { return plane(fe, k0, X0 + 20 + i * 150, 74, 128); });
    void mini;
    var tb1 = barRowAt(fe, 500, 80, 96, '强化学习更好', C_SM, 16, 12), tb2 = barRowAt(fe, 500, 108, 96, '蒸馏更好', C_BASE, 16, 12), tb3 = barRowAt(fe, 500, 136, 96, '蒸馏摔倒', C_INK, 16, 12);
    label(fe, 500, 182, '相对误差的中位数', 'demo-x-ink2', 12);
    var tm1 = barRowAt(fe, 500, 194, 96, '强化学习', C_SM, 16, 12), tm2 = barRowAt(fe, 500, 222, 96, '蒸馏', C_BASE, 16, 12);
    label(fe, 500, 270, '论文自己说：这一节是初步研究', 'demo-x-mut', 11.5);
    label(fe, 500, 290, '每种训法只有一个随机种子', 'demo-x-mut', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      fz1.at(now, [156, 82], [182, 106], true);
      fz2.at(now, [156, 146], [182, 122], true);
      fz3.at(now, [250, 114], [276, 114], true);
      setOpacity(tr1, win(t, 3.3));
      setOpacity(tr2, win(t, 7.0));
      setOpacity(L, 1 - seg(t, 10.4, 10.7));
      /* 俯视的机器人：每 3 秒换一个命令，从中间出发 */
      var tc = since(t, clock, 0.4), ci = Math.floor(tc / 3) % 4, tl0 = tc % 3, C0 = CMDS[ci];
      var bx = 0, by = 0, th = 0, pts2 = [], KPX = 34, o0 = [R + 165, 166];
      for (var q = 0; q <= Math.floor(tl0 / 0.05); q++) {
        if (q) { bx += (C0[0] * Math.cos(th) - C0[1] * Math.sin(th)) * 0.05; by += (C0[0] * Math.sin(th) + C0[1] * Math.cos(th)) * 0.05; th += C0[2] * 0.05; }
        pts2.push([o0[0] + bx * KPX, o0[1] - by * KPX]);
      }
      setPath(trail, pts2);
      var bp = pts2[pts2.length - 1];
      moveDot(bot, bp); moveDot(botR, bp);
      botA.set(bp[0], bp[1], bp[0] + Math.cos(th) * 24, bp[1] - Math.sin(th) * 24, 8);
      cmdT[0].textContent = C0[3];
      cmdT[1].textContent = '往前 ' + f1(C0[0]) + ' m/s，往左 ' + f1(C0[1]) + ' m/s，转弯 ' + f1(C0[2]) + ' rad/s';
      setOpacity(pv, win(t, 0.3, 10.4));
      /* ① 阶跃测试：两条曲线 5 秒画完，最后 2 秒的差显出来 */
      var ua = (since(t, clock, 10.4) % 7) / 5;
      cRL.set(5 * clamp(ua, 0, 1)); cDS.set(5 * clamp(ua, 0, 1));
      setOpacity(brR, ua >= 1 ? 1 : 0); setOpacity(brD, ua >= 1 ? 1 : 0);
      setOpacity(fa, win(t, 10.4, 13.4));
      /* ② 两根条变成一个圆环：先外圈（较大的误差），再打孔（较小的误差） */
      var ub = (since(t, clock, 13.4) % 6) / 6, gro = clamp(ub / 0.3, 0, 1), hol = clamp((ub - 0.35) / 0.3, 0, 1);
      setW(eb1, 260 * 0.16 / 0.9); setW(eb2, 260 * 0.49 / 0.9);
      bigRing.setAttribute('d', ringD(bigC[0], bigC[1], RB * Math.sqrt(0.49 / 0.9) * gro, RB * Math.sqrt(0.16 / 0.9) * hol));
      tO.style.opacity = gro >= 1 ? 1 : 0.2; tI.style.opacity = hol >= 1 ? 1 : 0.2;
      setOpacity(fb, win(t, 13.4, 16.4));
      /* ③ 一张图：圆环从左到右一列列出来 */
      var uc = clamp(since(t, clock, 16.4) / 3, 0, 1);
      P1.rings.forEach(function (r0) { r0.n.style.opacity = (r0.i == null ? 0 : r0.i) < uc * 15 ? 1 : 0; });
      setOpacity(fc, win(t, 16.4, 19.4));
      /* ④ 摔倒的 7 个命令一闪一闪 */
      var pul = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * 5));
      fellHl.forEach(function (c0) { c0.style.opacity = pul.toFixed(2); });
      setOpacity(fd, win(t, 19.4, 22.4));
      /* ⑤ 总数 */
      var ue = clamp(since(t, clock, 22.4) / 2, 0, 1);
      tb1.set(110 * ue, Math.round(650 * ue) + ' 个'); tb2.set(110 * 15 / 650 * ue, Math.round(15 * ue) + ' 个'); tb3.set(110 * 7 / 650 * ue, Math.round(7 * ue) + ' 个');
      tm1.set(110 * 0.16 / 0.49 * ue, ue > 0 ? '0.16' : ''); tm2.set(110 * ue, ue > 0 ? '0.49' : '');
      setOpacity(fe, win(t, 22.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 18: 局限与复现 ── */
  var REPOS = [['Uni-SuperMimic', 'UniLab，mjwarp / MuJoCo / Motrix', '放出模型，Apache-2.0', true], ['SuperMimic-Reproduced', 'mjlab，全 BONES-SEED 跑过', 'MIT', false], ['SuperMimic-Repro-Sim2Real', '在上一个之上加真机部署', 'MIT', false], ['supermimic_vibed', 'Isaac Lab 3，LAFAN1', '作者自称一小时赶出来、没审过', false]];
  function buildSceneLimits() {
    var s = sceneSvg('右上依次出现论文第 6 节的三条局限：多接口训练、世界模型只学仿真、只在平地上；下面是四个社区复现，我们选的 Uni-SuperMimic 打勾；最后一张卡片在「论文」和「复现」之间来回翻，列出几处不同');
    s.appendChild(svgText(24, 26, '局限，以及我们怎么复现', 'demo-x-ink2', 13.5));
    var L = group(s);
    var lims = [['① 多接口训练还没研究透', '速度奖励只更新编码器，同时训和先后训其实一样'], ['② 世界模型只从仿真学', '真机数据可以拿来修正；可导也能做系统辨识'], ['③ 只在平地上', '地形、物体交互还在做']].map(function (l0, i) {
      var y = 52 + i * 70, g = group(L);
      var r = rectBox(g, 24, y, 380, 58, C_BORDER, C_SURFACE2);
      label(g, 38, y + 24, l0[0], 'demo-x-ink', 13);
      label(g, 38, y + 46, l0[1], 'demo-x-ink2', 11.5);
      return { g: g, r: r };
    });
    var R = 424;
    /* 右边：三条局限各一段动画 */
    /* ① 速度奖励的梯度只流进速度编码器，解码器不动；所以同时训和先后训最后一样 */
    var pa = group(s);
    label(pa, R, 52, '① 只用速度奖励时，梯度只到编码器', 'demo-x-ink', 13.5);
    boxText(pa, R, 70, 116, 38, '动作编码器', C_SM, { size: 12 });
    var encV = boxText(pa, R, 124, 116, 38, '速度编码器', C_WARN, { size: 12 });
    boxText(pa, R + 146, 98, 40, 38, '$z$', C_INK, { size: 13 });
    boxText(pa, R + 214, 92, 120, 50, '共用解码器\n权重不动', C_MUTED, { size: 11.5, dash: '5 4' });
    boxText(pa, R + 214, 176, 120, 32, '速度跟踪奖励', C_GOOD, { size: 11.5 });
    hline(pa, R + 116, 89, R + 146, 110, C_MUTED, 1.4); hline(pa, R + 116, 143, R + 146, 124, C_MUTED, 1.4); hline(pa, R + 186, 117, R + 214, 117, C_MUTED, 1.4);
    var gA = flowSeg(pa, C_GOOD, 3, 3.4, 50);
    tone(pa, R + 140, 196, '梯度', C_GOOD, 11);
    label(pa, R, 240, '同时训', 'demo-x-ink2', 11.5); label(pa, R, 276, '先后训', 'demo-x-ink2', 11.5);
    var tb = [[226, C_SM], [236, C_WARN], [262, C_SM], [272, C_WARN]].map(function (q) { return hbar(pa, R + 52, q[0], 7, q[1]); });
    var same = tone(pa, R + 246, 256, '最后一样', C_GOOD, 12.5);
    legendRow(pa, R, 304, [['动作编码器', C_SM, 60], ['速度编码器', C_WARN, 60]], 11);
    /* ② 世界模型只从仿真日志学：真机数据还没用上；它可导，也能拿来做系统辨识 */
    var pb = group(s);
    label(pb, R, 52, '② 世界模型只从仿真数据学', 'demo-x-ink', 13.5);
    rectBox(pb, R, 66, 124, 124, C_BORDER, C_SURFACE2);
    var spB = g1Sprite(pb, 'fall_sim');
    label(pb, R + 62, 206, '仿真日志（我们的复现）', 'demo-x-mut', 11, 'middle');
    boxText(pb, R + 190, 104, 96, 44, '世界模型', C_WM, { size: 12.5 });
    var fB = flowSeg(pb, C_SIM, 3, 3.4, 60);
    var real = paperPart(pb, 'roll', 0, 0, 0.155, 1, R + 196, 178, 64);
    void real;
    label(pb, R + 228, 256, '真机数据（论文图 6）', 'demo-x-mut', 11, 'middle');
    var rArr = arrow(pb, C_WARN, 1.8, '5 4');
    tone(pb, R + 270, 196, '还没用上：', C_WARN, 11);
    tone(pb, R + 270, 216, '可以拿来修正', C_WARN, 11);
    tone(pb, R + 270, 236, '世界模型', C_WARN, 11);
    label(pb, R, 236, '可导：也能做系统辨识', 'demo-x-ink2', 11.5);
    var cid = chart(pb, R, 248, 124, 46, { x0: 0, x1: 1, y0: 0, y1: 1.4 });
    var lossPts = [];
    for (var q2 = 0; q2 <= 40; q2++) { var xq = q2 / 40; lossPts.push([xq, 0.08 + 2.6 * (xq - 0.68) * (xq - 0.68)]); }
    cid.line(lossPts, C_MUTED, 1.8);
    var idDot = dotAt(pb, 0, 0, 4.5, C_GOOD);
    label(pb, R, 312, '横轴：仿真参数（如摩擦）', 'demo-x-mut', 11);
    label(pb, R, 332, '纵轴：和真机数据的差距', 'demo-x-mut', 11);
    /* ③ 只在平地上：地形和物体交互还没做 */
    var pc = group(s);
    label(pc, R, 52, '③ 只在平地上训练', 'demo-x-ink', 13.5);
    rectBox(pc, R, 66, 212, 222, C_BORDER, C_SURFACE2);
    var spC = g1Sprite(pc, 'slip_sim');
    var grC = groundGrid(pc, spC, R, 66, 212, 222);
    pc.insertBefore(grC.g, spC.g);
    label(pc, R + 106, 304, '平地（我们的复现：冲刺、急停）', 'demo-x-mut', 11, 'middle');
    var terr = group(pc);
    pathLine(terr, [[R + 232, 284], [R + 262, 284], [R + 262, 262], [R + 292, 262], [R + 292, 240], [R + 322, 240], [R + 322, 218], [R + 352, 218], [R + 352, 284], [R + 232, 284]], C_MUTED, 2, '5 4');
    var boxT = rectBox(terr, R + 262, 158, 54, 42, C_MUTED, 'none', '5 4'); boxT.style.fill = 'none';
    label(terr, R + 289, 150, '箱子', 'demo-x-mut', 11, 'middle');
    label(terr, R + 300, 300, '楼梯', 'demo-x-mut', 11, 'middle');
    tone(pc, R + 232, 92, '地形、物体交互：', C_WARN, 12);
    label(pc, R + 232, 114, '论文说还在做', 'demo-x-ink2', 12);
    var p4 = group(s);
    label(p4, R, 52, '官方代码没放出；社区有几个复现', 'demo-x-ink', 13.5);
    var repoRows = REPOS.map(function (r0, i) {
      var y = 64 + i * 50, g = group(p4);
      var box = rectBox(g, R, y, 360, 46, r0[3] ? C_GOOD : C_BORDER, C_SURFACE);
      label(g, R + 10, y + 16, r0[0], r0[3] ? 'demo-x-ink' : 'demo-x-ink2', 12);
      label(g, R + 10, y + 38, r0[1] + ' · ' + r0[2], 'demo-x-mut', 11);
      if (r0[3]) tick(g, R + 334, y + 12, 13, C_GOOD);
      return box;
    });
    label(p4, R, 282, '选它：放出了世界模型和策略的权重，', 'demo-x-ink2', 12);
    label(p4, R, 302, '还支持普通的 MuJoCo，能在 CPU 上重放', 'demo-x-ink2', 12);
    var p5 = group(s);
    label(p5, R, 52, '复现和论文的不同', 'demo-x-ink', 13.5);
    var fl = flipList(p5, R, 66, [['策略的观测', '93 维 × 10 帧', '99 维（+ 相对朝向 6）'], ['三个头', '可学可算', '全按公式算'], ['训练迭代', '320,000 次', '12,000 次'], ['训练用时', '1 张 H100 3 小时', '存档记 5000 秒']], 86, 182, ['论文', '复现']);
    label(p5, R, 248, '迭代次数的定义可能不同，不能直接比', 'demo-x-mut', 11);
    label(p5, R, 268, '我们的数字都写明是复现，不是论文的结果', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      lims.forEach(function (l, i) {
        var on = t >= [0.4, 3.6, 7.0][i];
        setOpacity(l.g, on ? 1 : 0.15);
        l.r.style.stroke = on && t < [3.6, 7.0, 10.4][i] ? C_WARN : C_BORDER;
      });
      /* ① */
      gA.at(now, [R + 212, 192], [R + 118, 150], t < 3.6);
      encV.r.style.strokeWidth = (1.3 + 1.4 * (0.5 + 0.5 * Math.sin(now * 4))).toFixed(2);
      var uA = (since(t, clock, 0.4) % 4) / 4, WA = 170;
      setW(tb[0], WA * uA); setW(tb[1], WA * uA);
      setW(tb[2], WA * clamp(2 * uA, 0, 1)); setW(tb[3], WA * clamp(2 * uA - 1, 0, 1));
      same.style.opacity = uA > 0.92 ? 1 : 0.3;
      setOpacity(pa, win(t, 0.3, 3.6));
      /* ② */
      spB.put(R + 6, 70, 0.4, seqFrame(since(t, clock, 3.6), 201, 25, 0.6));
      fB.at(now, [R + 126, 126], [R + 188, 126], t >= 3.6 && t < 7.0);
      rArr.set(R + 228, 176, R + 228, 152, 8);
      var kB = Math.floor(since(t, clock, 3.6) / 0.5) % 9, xB = 0.08;
      for (var j3 = 0; j3 < kB; j3++) xB -= 0.3 * 2 * 2.6 * (xB - 0.68) * 0.35;
      moveDot(idDot, [cid.px(xB), cid.py(0.08 + 2.6 * (xB - 0.68) * (xB - 0.68))]);
      setOpacity(pb, win(t, 3.6, 7.0));
      /* ③ */
      var fC = seqFrame(since(t, clock, 7.0), 76, 25, 0.6);
      spC.put(R + 5, 72, 0.72, fC); grC.draw(fC);
      terr.style.opacity = (0.55 + 0.45 * Math.sin(now * 2.4)).toFixed(2);
      setOpacity(pc, win(t, 7.0, 10.4));
      repoRows.forEach(function (b, i) { b.style.strokeWidth = i === 0 && t >= 11.4 ? 2.6 : 1.3; });
      fl.set(since(t, clock, 13.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  var SM_SCENES = [
    {
      title: '跟踪的动作越多，算力越贵',
      dur: 16,
      build: buildSceneIntro,
      cues: [
        { at: 0.4, s: '一个策略跟踪大规模动作库，是通用人形全身控制的主流做法。' },
        { at: 3.6, s: '动作越多越贵：SONIC 用 128 张 L40 训了 7 天，约 21,000 显卡小时。' },
        { at: 7.0, s: '所有动作共用一个身体，模型无关的 PPO 却每次从带噪的仿真采样里重新估梯度。' },
        { at: 10.4, s: '**SuperMimic**：从仿真日志学一个可微的世界模型，策略在想象里沿梯度学。' },
        { at: 13.4, s: '1 张 H100、3 小时超过 SONIC 的回报，显卡小时少 1000 倍以上；UC Berkeley，CoRL 2026 Oral。' }
      ]
    },
    {
      title: '两条老路（表 1）',
      dur: 16,
      build: buildScenePaths,
      cues: [
        { at: 0.4, s: '现有的流水线都用模型无关的强化学习，分两条路。' },
        { at: 3.6, s: '一条：每段动作先训一个专才，再蒸馏成通才，蒸馏会丢东西（BeyondMimic）。' },
        { at: 7.0, s: '另一条：一个策略直接吃下整个动作库，靠集群级的算力硬堆（SONIC）。' },
        { at: 10.4, s: '表 1：跟踪、潜空间、下游三步各用什么训；连起来的格子是一起训的。' },
        { at: 13.4, s: 'SuperMimic 三步都在同一个可微世界模型里训，下游既能蒸馏、也能直接强化学习。' }
      ]
    },
    {
      title: '所有动作共用一个身体',
      dur: 16,
      build: buildSceneShared,
      cues: [
        { at: 0.4, s: '动作千差万别，都由同一台 G1 执行：同样的刚体、同样的接触。' },
        { at: 3.6, s: '所以一个世界模型学下这套共享的动力学，就能摊薄到全部动作上。' },
        { at: 7.0, s: '世界模型可求导：沿短的想象轨迹做时间反向传播（BPTT），策略拿到解析梯度。' },
        { at: 10.4, s: '梯度来自学到的模型、不经过仿真器：仿真器不必可微，MuJoCo Warp 照用。' },
        { at: 13.4, s: '两个学习器在一个循环里一起长：模型越学越准，策略越学越好。' }
      ]
    },
    {
      title: '一个循环，两个学习器（图 2）',
      dur: 16,
      build: buildSceneLoop,
      cues: [
        { at: 0.4, s: '第一步：当前策略在仿真器里跑，动作加噪声，转移存进回放缓冲区。' },
        { at: 3.6, s: '缓冲区固定大小，新的挤掉旧的；旧数据照样能用：动力学和是谁采的无关。' },
        { at: 7.0, s: '第二步：从缓冲区抽 8 步的片段，拟合世界模型。' },
        { at: 10.4, s: '第三步：冻住世界模型，从缓冲区的状态出发想象 32 步，回报沿时间反传给策略。' },
        { at: 13.4, s: '两个每轮都更新，世界模型只在第三步里冻住：Dyna 式的做法。' }
      ]
    },
    {
      title: '策略看什么、做什么（表 A.1）',
      dur: 16,
      build: buildSceneIO,
      cues: [
        { at: 0.4, s: '观测：关节角、关节速度、角速度、重力方向、上一步动作，每帧 93 维，看最近 10 帧。' },
        { at: 3.6, s: '目标：未来 10 帧的参考动作（0.2 秒）；BeyondMimic 只看 1 帧。' },
        { at: 7.0, s: '动作：29 个关节设定点 $q^{\\mathrm{sp}}=\\alpha a_t+q^0$；PD 增益低，设定点更像力矩。' },
        { at: 10.4, s: '传感器噪声 $\\eta_t$ 在世界模型外面加：模型只预测无噪声的观测。' },
        { at: 13.4, s: '采数据时动作再加 $\\mathcal{N}(0,\\,0.1^2)$ 的噪声，只为让世界模型见到更多种动作。' }
      ]
    },
    {
      title: '世界模型：学一步的增量',
      dur: 16,
      build: buildSceneWM,
      cues: [
        { at: 0.4, s: '世界模型是确定性的：随机化的参数都已知，每回合作为上下文 $\\xi$ 喂进去。' },
        { at: 3.6, s: '输入状态、动作和 $\\xi$，输出 70 维的增量；位置的增量写在朝向坐标系里。' },
        { at: 7.0, s: '奖励、观测、终止三个头可学可算；Uni-SuperMimic 都按公式算。' },
        { at: 10.4, s: '训练时从日志出发、喂日志里的动作，自回归推 8 步，每一步都和日志比。' },
        { at: 13.4, s: '推 8 步让模型学会纠正自己的误差；我们量的：8 步后根部只差几毫米。' }
      ]
    },
    {
      title: '世界模型像不像仿真器（我们的复现）',
      dur: 20,
      build: buildSceneRepro,
      cues: [
        { at: 0.4, s: '我们用 Uni-SuperMimic 放出的模型：左边 MuJoCo，右边世界模型，同一个起点。' },
        { at: 3.6, s: '策略开着，各自闭环 8 秒：摔倒、躺下、爬起来，高度最多差 3.6 厘米。' },
        { at: 7.0, s: '400 步远超训练时的 8 步窗口，世界模型没有发散。' },
        { at: 10.4, s: '策略关掉：动作全给 0，跑步中的机器人扑倒，世界模型也预测它倒下。' },
        { at: 13.4, s: '地面变滑：摩擦降到 0.3，急停时脚打滑；告诉模型摩擦，它预测的滑和仿真几乎一样。' },
        { at: 17.0, s: '这是复现模型在 LAFAN1 上的结果，不是论文的实验。' }
      ]
    },
    {
      title: '在想象里反向传播（式 2）',
      dur: 16,
      build: buildSceneBPTT,
      cues: [
        { at: 0.4, s: '从缓冲区里一个真实状态出发，策略在冻住的世界模型里走 $H=32$ 步。' },
        { at: 3.6, s: '每步奖励乘折扣和存活权重相加；32 步之后的回报由评论家估计。' },
        { at: 7.0, s: '存活权重由模型预测的终止概率连乘而来，可导；硬终止会切断梯度。' },
        { at: 10.4, s: 'PPO 把动力学当黑箱，用采样动作的好坏加权对数概率的梯度，方差大。' },
        { at: 13.4, s: 'BPTT 直接对每个动作求导。我们在复现模型上量：1 条轨迹的方向比似然比用 1024 条还准。' }
      ]
    },
    {
      title: '评论家：看到第 32 步之后（图 4b、c）',
      dur: 16,
      build: buildSceneCritic,
      cues: [
        { at: 0.4, s: '评论家只用想象出来的转移，拟合 GAE 回报（$\\lambda=0.95$）。' },
        { at: 3.6, s: '和 SHAC 同类的短视界 actor–critic；存活权重代替硬终止，也没有目标网络。' },
        { at: 7.0, s: '图 4b：没有评论家，视界 16 步以下训不起来；有评论家，16 步就赶上无评论家的 32 步。' },
        { at: 10.4, s: '图 4c：32 步最快到 0.82；从 64 步加到 128 步，用时差不多翻三倍。' },
        { at: 13.4, s: '被推一把：有评论家 0.5–2.4 秒站稳；没有的一直踉跄，4 m/s 就摔倒。' }
      ]
    },
    {
      title: '奖励、终止与随机化（表 A.2、A.3）',
      dur: 16,
      build: buildSceneReward,
      cues: [
        { at: 0.4, s: '奖励沿用 BeyondMimic：身体位置、朝向、线速度、角速度，加根部位置、朝向。' },
        { at: 3.6, s: '去掉自碰撞惩罚：它防随机策略钻空子；想象时策略是确定的，没有这个漏洞。' },
        { at: 7.0, s: '关节超限惩罚从 −10 降到 −2；根部高度差超过 0.25 m、或倾斜约 78° 就终止。' },
        { at: 10.4, s: '随机化只剩物理参数：摩擦、关节零点、躯干质心，也就是世界模型的 $\\xi$。' },
        { at: 13.4, s: '去掉根部速度推搡：状态突变学不了；只随机化物理参数，上真机也够。' }
      ]
    },
    {
      title: '动作库与重置采样（附录 D、E）',
      dur: 16,
      build: buildSceneData,
      cues: [
        { at: 0.4, s: '数据：BONES-SEED 的 G1 重定向版，原始 142,220 段。' },
        { at: 3.6, s: '按名字去掉要用楼梯、箱子、椅子的 12,553 段，再按运动学去掉 153 段，剩 129,514。' },
        { at: 7.0, s: '重置：时间轴切成 1 秒的格子，每格记一个「从这里出发」的回报估计。' },
        { at: 10.4, s: '50% 均匀抽、40% 偏向回报低的格子、10% 按历史权重：学会了的难动作也还练得到。' },
        { at: 13.4, s: '一共 264.56 小时，是 SONIC 611 小时数据的公开子集，少 2.3 倍。' }
      ]
    },
    {
      title: '一张卡 3 小时（图 3a）',
      dur: 16,
      build: buildSceneCompute,
      cues: [
        { at: 0.4, s: '图 3a：横轴显卡小时（对数），纵轴归一化回报；黄虚线是 SONIC 放出的模型，0.90。' },
        { at: 3.6, s: '1 张 H100 训 3 小时就超过 SONIC；2 张卡同样超过。' },
        { at: 7.0, s: '「3 小时」是保守的说法：从那以后，每个存档都稳稳领先。' },
        { at: 10.4, s: '账本：约 21,000 对 3 显卡小时，约 7200 倍；墙钟 168 对 3 小时，56 倍。' },
        { at: 13.4, s: '数据少 2.3 倍、H100 峰值算力最多高 5.5 倍，都解释不了 1000 倍的差距。' }
      ]
    },
    {
      title: '179、25、0（表 A.6）',
      dur: 16,
      build: buildSceneFails,
      cues: [
        { at: 0.4, s: '129,514 段各从第一帧放一遍，不加噪声、不随机化，触发终止就算失败。' },
        { at: 3.6, s: 'SONIC 失败 179 段：44 个空翻、22 个侧滚、一套 8 段的舞全部失败。' },
        { at: 7.0, s: 'SuperMimic：1 张卡 3 小时失败 25 段；2 张卡 9.8 小时，一段都不失败。' },
        { at: 10.4, s: '附录图 A.1：失败数随训练一路降，2 张卡大约 6 小时后基本归零。' },
        { at: 13.4, s: '这些都是两边训练集里的动作：比的是覆盖，不是没见过的动作上的泛化。' }
      ]
    },
    {
      title: '同样的设置和 PPO 比（图 4a）',
      dur: 16,
      build: buildScenePPO,
      cues: [
        { at: 0.4, s: '和 SONIC 比，硬件、数据都不同；图 4a 是控制变量的对比：LAFAN1 的 40 段。' },
        { at: 3.6, s: 'PPO-Sim 在仿真器里跑 PPO，其余设置全一样，每张卡的环境数还多一倍。' },
        { at: 7.0, s: 'SuperMimic：1 张卡 1.2 小时，评测回报到 0.82。' },
        { at: 10.4, s: 'PPO-Sim 18 小时都没到：1 张卡 0.60、4 张 0.70、8 张 0.72。' },
        { at: 13.4, s: '我们用复现模型在 40 段上重放：平均 0.83，没有一段失败。' }
      ]
    },
    {
      title: '为什么省：三个性质（图 3b、c，图 5）',
      dur: 20,
      build: buildSceneWhy,
      cues: [
        { at: 0.4, s: '① 一个模型摊薄动作库：数据从 1 到 264 小时，8 步预测误差一直在 0.007–0.011。' },
        { at: 3.6, s: '到目标回报的显卡小时也涨得慢：0.54、1.35、1.91、1.89，远低于成比例的虚线。' },
        { at: 7.0, s: '② 想象更快：常用的 2k–16k 个环境里，世界模型比 MuJoCo Warp 快 10 倍以上。' },
        { at: 10.4, s: '64k 个环境时快 62 倍：MuJoCo Warp 已经到顶。' },
        { at: 13.4, s: '③ 一阶梯度：同样在世界模型里想象，PPO 要多 64 倍的步数才到它最好的回报。' },
        { at: 17.0, s: '省下的不只是仿真速度，梯度本身也更有用。' }
      ]
    },
    {
      title: '上真机（图 6）',
      dur: 16,
      build: buildSceneReal,
      cues: [
        { at: 0.4, s: '同一个通用跟踪策略直接上真机 Unitree G1，不按动作单独调参。' },
        { at: 3.6, s: '图 6：蹦跳着跳、侧滚（躯干和四肢都着地）、90° 空翻、原地 360° 空翻。' },
        { at: 7.0, s: '项目页视频：林子里先侧滚一圈，再接着跳舞。' },
        { at: 10.4, s: '海边：蹦跳、翻滚、空翻。' },
        { at: 13.4, s: '世界模型只从仿真数据学，真机数据还没用上。' }
      ]
    },
    {
      title: '下游：速度命令（图 7）',
      dur: 25.4,
      build: buildSceneDownstream,
      cues: [
        { at: 0.4, s: '一个策略拆成两半：每种接口一个目标编码器，共用一个解码器，潜变量 32 维。' },
        { at: 3.6, s: '速度编码器两种训法：蒸馏用跟踪奖励、命令读自参考；强化学习直接用速度奖励。' },
        { at: 7.0, s: '都在同一个世界模型里训，世界模型不用重训。' },
        { at: 10.4, s: '读图 7 先读懂一次阶跃测试：站着开始、给一个固定命令跑 5 秒，取最后 2 秒的平均速度，和命令差多少、再除以命令大小。' },
        { at: 13.4, s: '一个圆环画同一个命令的两个误差：外圈面积是较大的那个，孔是较小的那个，颜色是谁更好。' },
        { at: 16.4, s: '一张图是一个平面：转弯固定为 0，15 × 15 个命令；背景越显眼，动作库里这种速度的数据越多。' },
        { at: 19.4, s: '另两张图把纵轴换成转弯：黑圈是蒸馏 4 次都摔倒，7 个都在边走边快转、几乎没有数据的地方。' },
        { at: 22.4, s: '672 个命令：强化学习 650 个更好、蒸馏 15 个、7 个蒸馏摔倒；误差中位数 0.16 对 0.49，论文说是初步研究。' }
      ]
    },
    {
      title: '局限与复现',
      dur: 16,
      build: buildSceneLimits,
      cues: [
        { at: 0.4, s: '局限一：多接口训练没研究透，速度奖励只更新编码器。' },
        { at: 3.6, s: '局限二：世界模型只学仿真；真机数据可以修正它，可导也能做系统辨识。' },
        { at: 7.0, s: '局限三：只在平地上，地形和物体交互还在做。' },
        { at: 10.4, s: '官方没放代码；我们选 Uni-SuperMimic：Apache-2.0、放了模型、CPU 上能跑 MuJoCo。' },
        { at: 13.4, s: '它比论文多给策略 6 维相对朝向；我们的数字都标明是复现。' }
      ]
    }
  ];
  /* 要点里数字和单位之间用不换行空格（公式里不动），免得单位单独落到下一行开头（HOMIE 2026-10-21） */
  function nb(str) {
    return str.split(/(\$[^$]*\$)/).map(function (p, i) { return i % 2 ? p : p.replace(/(\d)(\*\*)? (?=[^\s\d+\-−→×<>=\/·（(])/g, '$1$2 ').replace(/(\d)–(\d)/g, '$1–⁠$2'); }).join('');
  }
  SM_SCENES.forEach(function (sc) { sc.cues.forEach(function (c) { c.s = nb(c.s); }); });
  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十八幕动画：SuperMimic 全流程速览',
      sub: '约 305 秒自动播放。空格播放/暂停，← → 换幕；曲线照论文 LaTeX 里的数重画，G1 是我们用社区复现 Uni-SuperMimic 放出的模型在 MuJoCo 里跑的。',
      ariaLabel: 'SuperMimic 十八幕讲解动画',
      notes: [
        '取数依据：图 3–5、图 7、附录图 A.1 的曲线是 arXiv 2610.28480 v1 的 LaTeX 源码里 pgfplots 的坐标（图 5b、图 7 来自源文件附带的 CSV），表 1、表 A.1–A.6 照抄；图 1、图 6 是论文图的裁剪。',
        '第 3、5、7 幕的 G1 和第 6、8、14 幕标着「我们」的数是复现：官方代码没有放出，我们照社区的 Motphys/Uni-SuperMimic（Apache-2.0）的代码独立重写了评测与世界模型的回放，载入它放出的 LAFAN1 模型，在 CPU 上的 MuJoCo 3.11 里跑；不是论文的实验。',
        '仿真与真机的视频片段剪自项目页 supermimic.github.io，只做讲解引用。'
      ],
      scenes: SM_SCENES
    });
  }
  // ─── the narrated vertical video of the same eighteen scenes ──────────────
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：SuperMimic 十八幕全流程',
      sub: '23 分 9 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十八幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '25.4 MB',
      fileName: 'SuperMimic_讲解视频.mp4'
    });
  }

  // ─── 演示 1：世界模型 vs 仿真器（复现） ──────────────────────────────────────
  function buildWMDemo(host) {
    var root = card(host, {
      title: '世界模型 vs 仿真器：同一个起点，各自往前推',
      sub: '我们用 Uni-SuperMimic 放出的 LAFAN1 模型做的三组对照（不是论文的实验）。拖时间看两边差多少：白线是 MuJoCo，蓝虚线是世界模型自己往前推的结果。'
    });
    var state = { exp: 'fall', t: 1 };
    var row = controlsRow(root);
    buttonGroup(row, { label: '对照', items: [{ label: '策略开着（8 秒）', value: 'fall' }, { label: '策略关掉（2 秒）', value: 'off' }, { label: '地面变滑（3 秒）', value: 'slip' }], value: 'fall', onPick: function (v) { state.exp = v; state.t = 1; tSl.set(1, true); render(); } });
    var row2 = controlsRow(root);
    var tSl = slider(row2, { label: '看到第几秒（占全长的比例）', min: 0, max: 1, step: 0.01, value: 1, format: function (v) { return Math.round(v * 100) + '%'; }, onInput: function (v) { state.t = v; render(); } });
    var stats = statsRow(root);
    var sT = stats.add('时刻'), sH = stats.add('高度：仿真 / 模型'), sE = stats.add('根部相差'), sJ = stats.add('关节角均方根差');
    var st = stage(root, 280);
    var verdict = verdictBox(root);
    note(root, ['做法：先让策略在仿真里跟 100 步攒好观测历史，在第 f0 帧把状态复制一份；一份继续在 MuJoCo 里跑（50 Hz、每步 4 个 5 ms 子步），另一份交给世界模型：每一步用它自己上一步的预测算观测、让策略出动作、再预测下一步。',
      '「策略关掉」是两边都喂全 0 的动作（关节目标就是默认站姿）；「地面变滑」在 f0 把地面和机器人几何体的摩擦从 1.0 改成 0.3，世界模型的上下文 $\\xi$ 也改成 0.3；对照组摩擦不变。',
      '数据：fallAndGetUp1_subject1 第 200 帧起 400 步；sprint1_subject2 第 450 帧起 100 步（策略关掉）、第 545 帧起 150 步（变滑）。这是复现模型在 LAFAN1 上的结果，数值不能和论文直接比。']);
    function render() {
      var E = REPRO[state.exp], n = E.hSim.length, i = Math.round(state.t * (n - 1));
      sT.set(f2(i / 25) + ' s');
      sH.set(f2(E.hSim[i]) + ' / ' + f2(E.hWm[i]) + ' m');
      sE.set(f3(E.rootErr[i]) + ' m');
      sJ.set(f3(E.jointRmse[i]) + ' rad');
      var gc = begin(st), ctx = gc.ctx, P = gc.P, x0 = 50, x1 = gc.w - 16, y0 = gc.h - 30, y1 = 16;
      var T = (n - 1) / 25, ymax = state.exp === 'slip' ? 4 : 0.9;
      var px = function (tt) { return x0 + tt / T * (x1 - x0); }, py = function (v) { return y0 - v / ymax * (y0 - y1); };
      for (var g = 0; g <= 4; g++) { var v = ymax * g / 4; line(ctx, [[x0, py(v)], [x1, py(v)]], P.grid, 1); text(ctx, f1(v), x0 - 6, py(v), P.text, 'right', '11px sans-serif'); }
      text(ctx, state.exp === 'slip' ? '根部走过的距离（m）' : '根部高度（m）', x0, 10, P.text, 'left', '11px sans-serif');
      text(ctx, '时间（s）', x1, gc.h - 8, P.text, 'right', '11px sans-serif');
      function series(arr) { return arr.map(function (v, k) { return [px(k / 25), py(v)]; }); }
      function dist(arr) { var a0 = arr[0]; return arr.map(function (q) { return Math.hypot(q[0] - a0[0], q[1] - a0[1]); }); }
      var sSim = state.exp === 'slip' ? dist(E.rootSim) : E.hSim, sWm = state.exp === 'slip' ? dist(E.rootWm) : E.hWm;
      if (state.exp === 'slip') line(ctx, series(dist(E.rootCtrl)), P.muted, 1.5, [2, 3]);
      line(ctx, series(sSim), P.text, 2.2);
      line(ctx, series(sWm), P.accent, 2.2, [6, 4]);
      line(ctx, [[px(i / 25), y0], [px(i / 25), y1]], P.warn, 1.4);
      if (state.exp === 'fall') verdict.set('8 秒里两边都摔倒、躺下、再爬起来：高度最多差 **' + f0(E.maxHeightGap * 100) + ' 厘米**，关节角平均差 **' + f3(E.meanJoint) + ' rad**；根部的水平位置会慢慢漂开，8 秒后差 ' + f2(E.endRootErr) + ' m。训练时世界模型只推 8 步，这里推了 400 步。', 'good');
      else if (state.exp === 'off') verdict.set('动作全给 0：跑步中的机器人往前扑倒，2 秒后仿真里根部高 ' + f2(E.hSim[n - 1]) + ' m、世界模型预测 ' + f2(E.hWm[n - 1]) + ' m。世界模型也预测它会倒下。', 'good');
      else verdict.set('摩擦 0.3：双脚贴地滑过的距离仿真 **' + f2(E.slideSim) + ' m**、世界模型 **' + f2(E.slideWm) + ' m**；摩擦不变的对照只有 ' + f2(E.slideCtrl) + ' m（灰线是对照的走过距离）。', 'good');
    }
    render();
    registerRenderer(render);
  }

  // ─── 演示 2：两种梯度估计（一维玩具 + 复现模型上的量测） ─────────────────────
  function buildGradDemo(host) {
    var root = card(host, {
      title: 'BPTT 与似然比：同一个梯度，两种估计',
      sub: '一维玩具：一个点在直线上，动作是加速度 $a=\\theta+\\epsilon$（$\\epsilon\\sim\\mathcal{N}(0,\\sigma^2)$），回报是 $H$ 步里离目标 1 m 的距离平方和取负。求回报的期望对 $\\theta$ 的梯度：BPTT 沿动力学求导，似然比（PPO 的做法）只看采样的好坏。'
    });
    var state = { N: 16, H: 32, sig: 0.1 };
    var row = controlsRow(root);
    slider(row, { label: '每次估计用几条轨迹 $N$', min: 0, max: 10, step: 1, value: 4, format: function (v) { return String(Math.pow(2, v)); }, onInput: function (v) { state.N = Math.pow(2, v); render(); } });
    slider(row, { label: '视界 $H$', min: 4, max: 64, step: 4, value: 32, format: function (v) { return v + ' 步'; }, onInput: function (v) { state.H = v; render(); } });
    slider(row, { label: '动作噪声 $\\sigma$', min: 0.02, max: 0.5, step: 0.02, value: 0.1, format: function (v) { return f2(v); }, onInput: function (v) { state.sig = v; render(); } });
    var stats = statsRow(root);
    var sTrue = stats.add('真梯度'), sPW = stats.add('BPTT：相对误差'), sLR = stats.add('似然比：相对误差');
    var st = stage(root, 240);
    var verdict = verdictBox(root);
    var G = REPRO.grad;
    var tb = table(root);
    tb.row(['每次用几条 $N$', 'BPTT 的余弦相似度（平均 / 最差）', '似然比的余弦相似度（平均 / 最差）'], true);
    G.rows.forEach(function (r0) { tb.row([String(r0[0]), f3(r0[1]) + ' / ' + f3(r0[2]), f3(r0[3]) + ' / ' + f3(r0[4])]); });
    note(root, ['上面是玩具模型（线性的一维动力学，$\\Delta t=0.02$ s、$\\theta=0$），只演示机制：每种估计各算 200 次，直方图看它们散得多开；数值不能和论文比。',
      '表格是我们在复现模型上量的：Uni-SuperMimic 放出的世界模型 + 策略，sprint1_subject2 第 500 帧的一个状态，$H=32$、$\\sigma=0.1$；参数是加到每一步动作上的 29 维偏置。参考方向是 2048 条 BPTT 梯度的平均，每个 $N$ 各算 8 次。',
      '两种估计算的是同一个量（加噪声后回报期望的梯度）：BPTT 每条轨迹都给出一个准确的方向，似然比要靠大量样本把噪声平均掉。']);
    function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6d2b79f5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(6.2831853 * r()); }
    function render() {
      var H = state.H, dt = 0.02, sig = state.sig, N = state.N, goal = 1;
      /* x_t = Σ_k c_{t,k} a_k，c_{t,k} = dt² (t − k)（k < t） */
      function roll(eps) {
        var x = 0, v = 0, J = 0, xs = [];
        for (var t = 0; t < H; t++) { v += eps[t] * dt * 50; x += v * dt; xs.push(x); J -= (x - goal) * (x - goal); }
        return { J: J, xs: xs };
      }
      var S = [];
      for (var t = 0; t < H; t++) { var sm = 0; for (var k = 0; k <= t; k++) sm += dt * dt * 50 * (t - k + 1); S.push(sm); }
      var trueG = 0, xm = roll(new Array(H).fill(0)).xs;
      for (var t2 = 0; t2 < H; t2++) trueG += -2 * (xm[t2] - goal) * S[t2];
      var pw = [], lr = [], r = rng(1234 + H * 7 + Math.round(sig * 100) + N * 13);
      for (var rep = 0; rep < 200; rep++) {
        var gp = 0, gl = 0, Js = [], scs = [];
        for (var n = 0; n < N; n++) {
          var eps = []; for (var q = 0; q < H; q++) eps.push(sig * gauss(r));
          var ro = roll(eps), d = 0;
          for (var t3 = 0; t3 < H; t3++) d += -2 * (ro.xs[t3] - goal) * S[t3];
          gp += d / N;
          var sc = 0; eps.forEach(function (e) { sc += e / (sig * sig); });
          Js.push(ro.J); scs.push(sc);
        }
        var b = N > 1 ? Js.reduce(function (a, c) { return a + c; }, 0) / N : 0;
        Js.forEach(function (J, i) { gl += (J - b) * scs[i] / N; });
        pw.push(gp); lr.push(gl);
      }
      function relErr(arr) { var s2 = 0; arr.forEach(function (g) { s2 += (g - trueG) * (g - trueG); }); return Math.sqrt(s2 / arr.length) / Math.abs(trueG); }
      sTrue.set(f2(trueG));
      sPW.set(f1(relErr(pw) * 100) + '%', 'good');
      sLR.set(f1(relErr(lr) * 100) + '%', 'bad');
      var gc = begin(st), ctx = gc.ctx, P = gc.P, x0 = 20, x1 = gc.w - 20, yb = gc.h - 28;
      var lo = trueG - 4 * Math.abs(trueG), hi = trueG + 4 * Math.abs(trueG), bins = 40;
      function hist(arr, color, off) {
        var cnt = new Array(bins).fill(0);
        arr.forEach(function (g) { var k = Math.floor((g - lo) / (hi - lo) * bins); if (k >= 0 && k < bins) cnt[k]++; });
        var mx = Math.max.apply(null, cnt.concat([1])), bw = (x1 - x0) / bins;
        cnt.forEach(function (c, k) { ctx.fillStyle = color; ctx.globalAlpha = 0.75; ctx.fillRect(x0 + k * bw + off, yb - c / mx * (gc.h - 60), bw / 2 - 1, c / mx * (gc.h - 60)); ctx.globalAlpha = 1; });
      }
      hist(pw, P.good, 0); hist(lr, P.warn, (x1 - x0) / bins / 2);
      var xt = x0 + (trueG - lo) / (hi - lo) * (x1 - x0);
      line(ctx, [[xt, 16], [xt, yb]], P.text, 1.6);
      text(ctx, '真梯度', xt + 4, 22, P.text, 'left', '11px sans-serif');
      text(ctx, '绿：BPTT　黄：似然比（各 200 次估计；横轴 = 估出来的梯度）', x0, gc.h - 8, P.text, 'left', '11px sans-serif');
      verdict.set('同样用 ' + N + ' 条轨迹：BPTT 的误差约 **' + f1(relErr(pw) * 100) + '%**，似然比约 **' + f1(relErr(lr) * 100) + '%**。视界越长、噪声越小，似然比越难：它要从回报的涨落里猜方向。', 'good');
    }
    render();
    registerRenderer(render);
  }

  // ─── 演示 3：论文的数字 ─────────────────────────────────────────────────────
  function buildComputeDemo(host) {
    var root = card(host, {
      title: '论文的数字：算力账本与曲线',
      sub: '左边算你自己的一次训练要多少显卡小时，和 SONIC 报的 128 张 L40 × 7 天比；下面换着看论文图 3a、4a、5a、5b 与附录图 A.1（坐标取自论文 LaTeX）。'
    });
    var state = { gpus: 1, hours: 3, fig: '3a' };
    var row = controlsRow(root);
    slider(row, { label: '显卡数', min: 1, max: 16, step: 1, value: 1, format: function (v) { return v + ' 张'; }, onInput: function (v) { state.gpus = v; render(); } });
    slider(row, { label: '训练时间', min: 0.5, max: 24, step: 0.5, value: 3, format: function (v) { return f1(v) + ' 小时'; }, onInput: function (v) { state.hours = v; render(); } });
    var stats = statsRow(root);
    var sG = stats.add('显卡小时'), sR = stats.add('比 SONIC 少'), sW = stats.add('墙钟比 SONIC 短');
    var row2 = controlsRow(root);
    buttonGroup(row2, { label: '曲线', items: [{ label: '图 3a', value: '3a' }, { label: '图 4a', value: '4a' }, { label: '图 5a', value: '5a' }, { label: '图 5b', value: '5b' }, { label: '图 A.1', value: 'A1' }], value: '3a', onPick: function (v) { state.fig = v; render(); } });
    var st = stage(root, 280);
    var verdict = verdictBox(root);
    var tb = table(root);
    tb.row(['动作组（段数）', 'SONIC', 'SuperMimic 1 张卡 3 小时', '2 张卡 9.8 小时'], true);
    FAILS.map(function (f) { return [f[0] + '（' + kfmt(f[1]) + '）', String(f[2]), String(f[3]), String(f[4])]; }).concat([['合计（129,514）', '179', '25', '0']]).forEach(function (r0) { tb.row(r0); });
    note(root, ['SONIC 的账：128 张 × 168 小时 = 21,504 显卡小时，论文写「约 21,000」；SuperMimic 3 显卡小时。比值约 7200 倍，论文保守地写成「超过 1000 倍」；墙钟 56 倍写成「超过 50 倍」。',
      '两边的硬件和数据都不同：SuperMimic 用 264.56 小时的 BONES-SEED（SONIC 611 小时的公开子集），H100 的 fp32 峰值是 L40 的 0.74 倍、张量核 5.5 倍。论文的说法是这两项加起来也解释不了 1000 倍。',
      '表是附录表 A.6：两边训练集里的动作，比的是覆盖、不是泛化；SONIC 是它放出的模型。']);
    function render() {
      var gh = state.gpus * state.hours;
      sG.set(f1(gh));
      sR.set(kfmt(21504 / gh) + ' 倍');
      sW.set(f1(168 / state.hours) + ' 倍');
      var gc = begin(st), ctx = gc.ctx, P = gc.P, x0 = 52, x1 = gc.w - 16, y0 = gc.h - 30, y1 = 16;
      function axes(xl, xh, yl, yh, logx, logy, xs, ys, xlab) {
        var tx = function (v) { return logx ? Math.log10(v) : v; }, ty = function (v) { return logy ? Math.log10(v) : v; };
        var px = function (v) { return x0 + (tx(v) - tx(xl)) / (tx(xh) - tx(xl)) * (x1 - x0); }, py = function (v) { return y0 - (ty(v) - ty(yl)) / (ty(yh) - ty(yl)) * (y0 - y1); };
        ys.forEach(function (v) { line(ctx, [[x0, py(v)], [x1, py(v)]], P.grid, 1); text(ctx, String(v), x0 - 6, py(v), P.text, 'right', '11px sans-serif'); });
        xs.forEach(function (v) { text(ctx, String(v), px(v), y0 + 14, P.text, 'center', '11px sans-serif'); });
        text(ctx, xlab, x1, gc.h - 2, P.text, 'right', '11px sans-serif');
        return { px: px, py: py };
      }
      function plot(A, pts, color, w, dash) { line(ctx, pts.map(function (p) { return [A.px(p[0]), A.py(p[1])]; }), color, w || 2, dash || null); }
      var A;
      if (state.fig === '3a') {
        A = axes(0.05, 4e4, 0.6, 0.98, true, false, [0.1, 1, 10, 100, 1000, 10000], [0.6, 0.7, 0.8, 0.9], '显卡小时（对数）');
        plot(A, [[0.05, 0.9012], [4e4, 0.9012]], P.warn, 1.6, [6, 4]); plot(A, PAPER.fig3a_1, P.accent, 2.4); plot(A, PAPER.fig3a_2, P.purple, 2);
        line(ctx, [[A.px(gh), y0], [A.px(gh), y1]], P.good, 1.4);
        verdict.set('黄虚线：SONIC 放出的模型 0.90；蓝：1 张 H100；紫：2 张。绿竖线是你设的 ' + f1(gh) + ' 显卡小时。', 'good');
      } else if (state.fig === '4a') {
        A = axes(0, 18, 0, 0.9, false, false, [0, 3, 6, 9, 12, 15, 18], [0, 0.2, 0.4, 0.6, 0.82], '墙钟时间（小时）');
        plot(A, [[0, 0.82], [18, 0.82]], P.grid, 1.4, [5, 4]);
        plot(A, PAPER.fig4a_ppo1, P.warn, 1.4, [2, 3]); plot(A, PAPER.fig4a_ppo4, P.warn, 1.6, [6, 3]); plot(A, PAPER.fig4a_ppo8, P.warn, 2); plot(A, PAPER.fig4a_sm, P.accent, 2.6);
        verdict.set('LAFAN1 的 40 段：SuperMimic 1 张卡 1.2 小时到 0.82；PPO-Sim 1 / 4 / 8 张卡 18 小时是 0.60 / 0.70 / 0.72（点线 / 虚线 / 实线）。', 'good');
      } else if (state.fig === '5a') {
        A = axes(400, 84000, 1e4, 3e7, true, true, [512, 2048, 8192, 32768], [1e4, 1e5, 1e6, 1e7], '并行环境数（对数）');
        plot(A, PAPER.fig5a_wm, P.accent, 2.4); plot(A, PAPER.fig5a_mjw, P.warn, 2.4);
        verdict.set('每秒走的控制步（对数）：蓝是世界模型、黄是 MuJoCo Warp；2k 个环境快 11 倍、16k 快 26 倍、64k 快 62 倍。', 'good');
      } else if (state.fig === '5b') {
        A = axes(6, 11, 0, 0.9, false, false, [6, 7, 8, 9, 10, 11], [0, 0.4, 0.84], '想象的总步数（10 的几次方）');
        ['p4k32', 'p8k24', 'p8k32', 'p16k32'].forEach(function (k, i) { plot(A, PAPER['fig5b_' + k], P.warn, i === 3 ? 2 : 1.3, i === 3 ? null : [2 + i * 2, 3]); });
        plot(A, PAPER.fig5b_sm, P.accent, 2.6);
        verdict.set('训练回报：SuperMimic（蓝）用约 9.3 亿想象步到 0.841，在世界模型里跑 PPO 最好的一组（16k × 32，黄实线）要约 596 亿步：约 64 倍。', 'good');
      } else {
        A = axes(0, 10, 0, 500, false, false, [0, 2, 4, 6, 8, 10], [0, 179, 400], '墙钟时间（小时）');
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y1, x1 - x0, y0 - y1); ctx.clip();
        plot(A, [[0, 179], [10, 179]], P.warn, 1.6, [6, 4]); plot(A, PAPER.figA1_1, P.accent, 2); plot(A, PAPER.figA1_2, P.purple, 2);
        ctx.restore();
        verdict.set('失败的动作数（129,514 段里）：黄虚线 SONIC 179；蓝 1 张卡、紫 2 张卡；第一个存档点分别失败 1554、899 段，图上截在 500。', 'good');
      }
    }
    render();
    registerRenderer(render);
  }

  K.mount({
    'sm-explainer': buildExplainerDemo,
    'sm-video': buildVideoDemo,
    'sm-wm': buildWMDemo,
    'sm-grad': buildGradDemo,
    'sm-compute': buildComputeDemo
  });
})();
