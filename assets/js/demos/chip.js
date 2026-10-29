/* Interactive CHIP demos for
 * papers/04_Loco-Manipulation_and_WBC/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation
 * （Chen, Cao, Luo, Castañeda, Li, Wang, Yuan, Fan, Liu, Zhu · CHIP: Adaptive Compliance for Humanoid Control through
 *   Hindsight Perturbation · arXiv 2512.14689 v1 / v2；项目页 nvlabs.github.io/CHIP；代码没有放出）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["chip"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   chip-explainer — 十八幕讲解动画：会跑会跳，却搬不动东西 → 前人怎么教柔顺（图 3b、c）→ 事后扰动：改观测，不改参考 →
 *                    部署时：一根看不见的弹簧 → 三个好处 → 力怎么加（图 9）→ 策略看什么（图 2）→ 奖励：照抄原参考（表 III）→
 *                    阻尼：让目标跟着手走 → 全局三点与定位 → 两台机器人一起抱（图 5）→ 表 II：抓得住吗 → 局部三点与遥操作（图 4）→
 *                    表 I：柔顺不伤跟踪 → 两只手，两种刚度（图 7a）→ 连续的柔顺度（图 7b、c）→ 自主：GR00T N1.5（图 8）→ 局限与没说清的地方
 *   chip-video     — 同一套十八幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   chip-hindsight — 事后扰动实验台：外力、方向、1/k → 训练时看到的目标 g − f/k、奖励的目标 g、部署时手停在 g + f/k；对照 GentleHumanoid 的改法；梯形力
 *   chip-damper    — 弹簧与阻尼（一维玩具）：硬 / 软 + 全局跟踪 / 软 + 阻尼跟随，人拉一下再松手
 *   chip-results   — 表 I、表 II、v1 的「20 N 下末端位移」图、图 7b 与 Gemini 预测、VLA 的数字浏览器
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
  /* 论文图（arXiv 2512.14689 v2 的图 1–8 裁剪）、项目页视频的片段（clips/）、G1 的示意贴图（g1_3d/）放在 assets/img/papers/chip/ */
  var IMG_BASE = assetBase('../../img/papers/');
  var PAPER_IMG_BASE = IMG_BASE ? IMG_BASE + 'chip/' : '';
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

  // ─── 论文里的数字（arXiv 2512.14689 v2：表 I–III、第 IV–V 节、附录 B；v1 的位移图；项目页） ───────────────
  /* 表 I：MuJoCo 里不加外力、TWIST 数据集 100 段；[全局位置 m, 全局朝向 rad, 局部位置 m, 局部朝向 rad]，括号里是标准差；
     GentleHumanoid 只有局部 */
  var TABLE1 = [
    { key: 'c0', zh: 'CHIP 1/k = 0', v: [0.08, 0.09, 0.02, 0.09], sd: [0.04, 0.04, 0.02, 0.06] },
    { key: 'c2', zh: 'CHIP 1/k = 0.02', v: [0.08, 0.08, 0.02, 0.10], sd: [0.05, 0.05, 0.02, 0.06] },
    { key: 'c5', zh: 'CHIP 1/k = 0.05', v: [0.08, 0.08, 0.02, 0.11], sd: [0.04, 0.04, 0.02, 0.06] },
    { key: 'gh', zh: 'GentleHumanoid 硬（15 N）', v: [null, null, 0.04, 0.15], sd: [null, null, 0.03, 0.08] },
    { key: 'gc', zh: 'GentleHumanoid 软（5 N）', v: [null, null, 0.05, 0.16], sd: [null, null, 0.04, 0.10] },
    { key: 'falcon', zh: 'FALCON', v: [0.09, 0.08, 0.02, 0.08], sd: [0.04, 0.04, 0.02, 0.05] },
    { key: 'noforce', zh: '不加外力训', v: [0.11, 0.09, 0.02, 0.08], sd: [0.04, 0.05, 0.02, 0.05] }
  ];
  var T1_METRICS = ['全局位置 [m]', '全局朝向 [rad]', '局部位置 [m]', '局部朝向 [rad]'];
  /* 表 II：两台 G1 一起抓、抬起来才算成功，每种 5 次；[CHIP, FALCON, 不加外力训] */
  var TABLE2 = [
    { zh: '箱子 18 cm', v: [0.6, 0.0, 0.4] },
    { zh: '箱子 35 cm', v: [0.8, 0.0, 0.4] },
    { zh: '球 12 cm', v: [1.0, 0.2, 0.4] },
    { zh: '球 35 cm', v: [0.8, 0.0, 0.4] }
  ];
  var T2_TRIALS = 5;
  var GRASP_K = 0.04;
  /* v1 的图（v2 删掉了）：全局跟踪、20 N 外力下末端的位移 [m]，从 v1 的矢量图里按网格线抽出来 */
  var DISP_F = 20;
  var DISP_K = [0, 0.01, 0.03, 0.05, 0.07, 0.09, 0.11, 0.13, 0.15];
  var DISP_CHIP = [0.06, 0.11, 0.20, 0.27, 0.29, 0.33, 0.38, 0.39, 0.51];
  var DISP_RT = [0.08, 0.09, 0.08, 0.09, 0.07, 0.08, 0.08, 0.10, 0.09];
  /* 表 III（附录 A）：[名称, σ, 权重, 组]；组：t 跟踪、g 只有全局策略、p 惩罚 */
  var REWARDS = [
    ['根部朝向', '0.4', 0.5, 't'], ['连杆位置（相对）', '0.3 m', 1.0, 't'], ['连杆朝向（相对）', '0.4', 1.0, 't'],
    ['连杆线速度', '1.0 m/s', 1.0, 't'], ['连杆角速度', '3.14 rad/s', 1.0, 't'], ['三点位置（相对）', '0.3 m', 1.0, 't'],
    ['三点朝向（相对）', '0.4', 1.0, 't'], ['三点位置（绝对）', '0.3 m', 0.5, 'g'], ['三点朝向（绝对）', '0.4', 0.5, 'g'],
    ['动作变化率', '—', -0.1, 'p'], ['关节超限', '—', -10.0, 'p'], ['多余的接触', '—', -0.1, 'p']
  ];
  /* 附录 B：每次扰动的峰值 U[0, 40] N、方向随机、持续 U[1, 3] s；大小按梯形：0–0.25 上升、0.25–0.75 平台、0.75–1 下降 */
  var FORCE = { fmax: 40, tmin: 1, tmax: 3, up: 0.25, down: 0.75 };
  function trap(u, F) {
    return u <= 0 || u >= 1 ? 0 : u < FORCE.up ? F * u / FORCE.up : u < FORCE.down ? F : F * (1 - u) / (1 - FORCE.down);
  }
  /* 「🚶 具体实例」例 1–3：渲染用的 G1 站姿里右手腕的位置 g（m，机器人朝 +x、+y 是它的左手边），往外 5 N，1/k = 0.02 */
  var EX = { g: [0.22, -0.23, 0.82], f: [0, -5, 0], ik: 0.02 };
  function exHind() { return EX.g.map(function (v, i) { return v - EX.ik * EX.f[i]; }); }
  /* 例 2：三点位置项 exp(−(1/3)Σ‖Δp‖² / 0.3²)，手硬顶在 g − f/k 时只有右手偏 |f|/k */
  function threePtReward(dRight) { return Math.exp(-(dRight * dRight) / 3 / (0.3 * 0.3)); }
  /* 例 4：一次 T = 2 s、F = 24 N 的扰动 */
  var EX_TRAP = { T: 2, F: 24, at: [0.3, 1.0, 1.8] };
  /* 例 5（假设，论文没写）：阻尼 α = 0.1、控制 50 Hz */
  var DAMP = { alpha: 0.1, hz: 50 };
  /* 图 7b：同一个箱子越装越重时的 1/k；[1/k, 名称, 磅] */
  var FIG7B = [[0.05, '空箱', 0], [0.03, '约 4 磅', 4], [0.02, '约 7 磅', 7]];
  /* 项目页：Gemini 看图预测的柔顺度（写成 10/k）；ok = 稳不稳；锚点：空箱 0.5、约 7 磅 0.2 */
  var GEMINI = [
    { zh: '没见过的玩具', v: 0.475, ok: true }, { zh: '一瓶水', v: 0.425, ok: true }, { zh: '一瓶水', v: 0.475, ok: false, why: '太软' },
    { zh: '一只哑铃', v: 0.25, ok: true }, { zh: '一只哑铃', v: 0.15, ok: false, why: '太硬' }, { zh: '一只哑铃', v: 0.425, ok: false, why: '太软' },
    { zh: '鞋', v: 0.475, ok: true }, { zh: '胶带和球', v: 0.475, ok: true }
  ];
  var ANCHORS = [[0.5, '空箱'], [0.2, '约 7 磅']];
  /* 第 V-D 节：VLA（GR00T N1.5），每个任务 20 次、2 分钟内完成才算 */
  var VLA = [
    { zh: '擦大白板', demos: 400, succ: 60, k: '擦的手 1/k = 0.05' },
    { zh: '一手拿小白板、一手擦', demos: 200, succ: 80, k: '拿板硬、擦的手软' },
    { zh: '蹲下抱箱子放到桌上', demos: 200, succ: 90, k: '两只手都软' }
  ];
  var VLA_N = 20;
  /* 第 V-A 节：训练规模 */
  var TRAIN = { gpus: 64, envs: 4096, days: 4 };
  /* 第 IV-A 节：全局策略看未来 0.2 s（5 帧）；定位三路融合成 50 Hz */
  var FUTURE = { sec: 0.2, frames: 5 };
  var LOC = [['足端里程计', 50], ['Fast-LIO2', 10], ['IMU 角速度', 50]];

  // ─── 讲解动画：十八幕 ───────────────────────────────────────────────────────
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
  /* 全片配色（照论文图 3）：参考 / 算奖励用的目标是粉紫（purple），策略看到的目标是黄（warn），外力是蓝（accent）；
     硬（1/k 小）用蓝绿、软（1/k 大）用粉紫；方法：CHIP 绿、FALCON 蓝、不加外力训灰、GentleHumanoid 黄 */
  var C_REF = C_PURPLE, C_OBS = C_WARN, C_F = C_ACCENT, C_STIFF = C_ACCENT, C_SOFT = C_PURPLE, C_PEN = C_BAD;
  /* 视频里一幕要讲一分钟左右，画面不能停：draw(t, clock) 的 clock 是这一幕的真实时间
     （旁白比分镜长时 t 停在一段的末尾，clock 照走），循环的动作按 clock 播；网页播放器只传 t。
     各幕的 cue 时刻都落在 0.4 / 3.6 / 7.0 / 10.4 / 13.4，一次性的出场动画不跨过这些时刻。 */
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
  function legendRow(parent, x, y, items, size) {
    var g = group(parent), cx = x;
    items.forEach(function (it) {
      g.appendChild(paint(svgEl('rect', { x: cx, y: y - 8, width: 12, height: 10, rx: 2 }), it[1]));
      var t = label(g, cx + 16, y, it[0], 'demo-x-ink2', size || 10.5);
      cx += 16 + (it[2] || it[0].length * (size || 10.5) * 0.95) + 16;
      void t;
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

  /* 论文图（arXiv 2512.14689 v2）：[文件, 宽, 高] */
  var FIGS = {
    fig1: ['fig1_teaser.webp', 1400, 561],
    fig2: ['fig2_overview.webp', 1400, 637],
    fig3: ['fig3_hindsight.webp', 1100, 576],
    fig4: ['fig4_teleop.webp', 1000, 442],
    fig5: ['fig5_grasp.webp', 1200, 747],
    fig6: ['fig6_failure.webp', 1400, 515],
    fig7: ['fig7_teleop.webp', 1250, 1257],
    fig8: ['fig8_vla.webp', 1100, 876]
  };
  /* G1 的示意贴图（第 3–7、10、18 幕）：Robot_Retarget_Online 的带三指手 G1（g1_mocap_29dof_with_hands.xml），
     MuJoCo 正运动学 + 它的 three.js 材质与灯光离线渲染，正交相机正对机器人（俯 0.06 rad）、300 px/m。
     21 档：站姿、两臂微屈（肩俯仰 −0.25、横滚 ±0.30、肘 0.75），两只手往外让开：肩横滚往外 0.45、肘伸直 0.5、肩俯仰往后 0.3，
     乘 s = 0, 0.05, …, 1；正视图里手腕几乎水平往外挪 0–49.3 px（0.164 m）。rw / lw 是手腕（wrist_yaw_link 原点）在贴图里的像素位置，
     head 是头部网格的中心。这是示意姿态，不是策略的输出。 */
  var YIELD = { file: 'g1_yield.webp', cw: 330, ch: 470, cols: 7, n: 21, R: 300, head: [165, 90.8], pelvis: [165, 219.3],
    rw: [[96.2, 213.3], [93.6, 214.5], [91, 215.6], [88.3, 216.6], [85.6, 217.4], [83, 218.1], [80.4, 218.7], [77.8, 219.2], [75.1, 219.4], [72.6, 219.6], [70, 219.6],
      [67.5, 219.5], [65, 219.2], [62.6, 218.8], [60.2, 218.2], [57.8, 217.5], [55.5, 216.7], [53.3, 215.7], [51.1, 214.6], [49, 213.3], [46.9, 211.9]],
    lw: [[233.8, 213.3], [236.4, 214.5], [239.1, 215.6], [241.7, 216.6], [244.3, 217.4], [247, 218.1], [249.6, 218.7], [252.2, 219.2], [254.8, 219.4], [257.4, 219.6], [260, 219.6],
      [262.5, 219.5], [265, 219.2], [267.4, 218.8], [269.8, 218.2], [272.2, 217.5], [274.5, 216.7], [276.7, 215.7], [278.9, 214.6], [281, 213.3], [283.1, 211.9]] };
  /* 手往外让开 d 米对应第几档（按右手腕的水平位移找最近的一档） */
  function yieldFrame(d) {
    var px = d * YIELD.R, best = 0;
    for (var i = 1; i < YIELD.n; i++) if (Math.abs(YIELD.rw[0][0] - YIELD.rw[i][0] - px) < Math.abs(YIELD.rw[0][0] - YIELD.rw[best][0] - px)) best = i;
    return best;
  }
  /* put(x, y, k, f)：贴图左上角放在 (x, y)、缩放 k、第 f 档；返回两手腕、头在画面上的位置。贴图第一次用到才设 href */
  function g1Yield(parent) {
    var g = group(parent), rows = Math.ceil(YIELD.n / YIELD.cols);
    g.setAttribute('class', 'demo-x-g1mesh');
    var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: 0, height: 0 });
    var img = svgEl('image', { x: 0, y: 0, width: YIELD.cw * YIELD.cols, height: YIELD.ch * rows, preserveAspectRatio: 'none' });
    box.appendChild(img);
    g.appendChild(box);
    var woke = false, lastF = -1;
    return {
      g: g,
      put: function (x, y, k, f) {
        if (!woke && G1_BASE) { woke = true; img.setAttribute('href', G1_BASE + YIELD.file); }
        f = clamp(Math.round(f || 0), 0, YIELD.n - 1);
        box.setAttribute('x', x.toFixed(1)); box.setAttribute('y', y.toFixed(1));
        box.setAttribute('width', (YIELD.cw * k).toFixed(1)); box.setAttribute('height', (YIELD.ch * k).toFixed(1));
        if (f !== lastF) {
          box.setAttribute('viewBox', [(f % YIELD.cols) * YIELD.cw, Math.floor(f / YIELD.cols) * YIELD.ch, YIELD.cw, YIELD.ch].join(' '));
          lastF = f;
        }
        function at(p) { return [x + p[0] * k, y + p[1] * k]; }
        return { rw: at(YIELD.rw[f]), lw: at(YIELD.lw[f]), head: at(YIELD.head), rw0: at(YIELD.rw[0]), lw0: at(YIELD.lw[0]), pel: at(YIELD.pelvis) };
      }
    };
  }
  /* 一段由几部分拼成的项目页片段：at(k, 秒, 是否可见) 从第 k 部分的开头起放、在这一部分里循环；下面一排小条标出放的是哪一部分 */
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
  /* 弹簧：两端 (x1, y1)–(x2, y2) 之间画 n 圈锯齿 */
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
  function kSlider(parent, x, y, w, max, title) {
    var g = group(parent);
    if (title !== '') label(g, x, y - 10, title || '柔顺度 1/k', 'demo-x-ink2', 11.5);
    var bar = rectBox(g, x, y, w, 8, C_BORDER, C_SURFACE2);
    bar.setAttribute('rx', 4);
    var fill = hbar(g, x, y, 8, C_SOFT, 0.75);
    var knob = ringAt(g, x, y + 4, 8, C_SOFT, 2.6);
    knob.style.fill = C_SURFACE;
    label(g, x, y + 28, '0　硬', 'demo-x-mut', 11);
    label(g, x + w, y + 28, f2(max) + '　软', 'demo-x-mut', 11, 'end');
    var val = label(g, x + w, y - 10, '', 'demo-x-ink', 12, 'end');
    return {
      g: g,
      set: function (v, txt) {
        var px = x + clamp(v / max, 0, 1) * w;
        setW(fill, px - x);
        moveDot(knob, [px, y + 4]);
        val.textContent = txt == null ? '1/k = ' + (v < 0.01 ? f3(v) : f2(v)) : txt;
      }
    };
  }
  /* 竖条形图的一根：底在 yBase，set(高, 文字) 把数字写在柱顶上方 */
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

  /* ── scene 1: 会跑会跳，却搬不动东西 ── */
  function buildSceneIntro() {
    var s = sceneSvg('左边是项目页的视频：宇树 G1 一边抱着箱子一边跑，手一直贴着箱子；右边依次出现：人形已经会的动作打勾、要用力的操作打问号；' +
      '太硬撞飞箱子、太软举不起重物两段小动画；机械臂的弹簧—阻尼；扛住和让位两条路；最后是 CHIP 的柔顺度旋钮');
    s.appendChild(svgText(24, 26, '人形会跑会跳，搬东西却还很难', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'hero', 24, 44, 380, 214, '项目页视频（1x）：抱着箱子跑过圣诞树，手一直贴着箱子');
    label(s, 24, 300, '同一个控制器：腿是敏捷的，手是软的', 'demo-x-ink2', 11.5);
    label(s, 24, 320, '宇树 G1 · 遥操作 · NVIDIA、Stanford、UT Austin', 'demo-x-mut', 11);
    var R = 424;
    /* 第 1 段：会的 ✓、难的 ? */
    var p1 = group(s);
    label(p1, R, 62, '人形已经会的', 'demo-x-ink', 14);
    ['后空翻', '跑', '爬', '跳舞'].forEach(function (w, i) {
      var x = R + (i % 2) * 176, y = 74 + Math.floor(i / 2) * 40;
      chip(p1, x, y, 164, w, C_GOOD, { size: 12.5, h: 30 });
      tick(p1, x + 136, y + 8, 13);
    });
    label(p1, R, 182, '还很难的：要用力的操作', 'demo-x-ink', 14);
    var qs = ['搬箱子', '擦白板', '推车'].map(function (w, i) {
      var x = R + i * 118, y = 194;
      chip(p1, x, y, 108, w, C_WARN, { size: 12.5, h: 30 });
      return tone(p1, x + 54, y + 58, '?', C_WARN, 22, 'middle');
    });
    /* 第 2 段：太硬 / 太软 */
    var p2 = group(s);
    label(p2, R, 62, '难在接触', 'demo-x-ink', 14);
    rectBox(p2, R, 76, 168, 150, C_BORDER, C_SURFACE2);
    rectBox(p2, R + 184, 76, 168, 150, C_BORDER, C_SURFACE2);
    tone(p2, R + 84, 98, '太硬：一碰就撞飞', C_BAD, 12, 'middle');
    tone(p2, R + 268, 98, '太软：使不上劲', C_SOFT, 12, 'middle');
    var hardHand = dotAt(p2, 0, 170, 9, C_STIFF);
    var hardBox = paint(svgEl('rect', { x: 0, y: 150, width: 36, height: 36, rx: 3 }), C_WARN);
    p2.appendChild(hardBox);
    hline(p2, R + 8, 188, R + 160, 188, C_BORDER, 2);
    var softTop = R + 268, softHand = dotAt(p2, softTop, 0, 9, C_SOFT), softSp = spring(p2, C_SOFT, 5, 5);
    hline(p2, softTop - 30, 116, softTop + 30, 116, C_BORDER, 3);
    var softBox = paint(svgEl('rect', { x: softTop - 18, y: 0, width: 36, height: 30, rx: 3 }), C_WARN);
    p2.appendChild(softBox);
    label(p2, R, 252, '要的是：可控、持续的接触力', 'demo-x-ink2', 12);
    /* 第 3 段：机械臂的阻抗控制 */
    var p3 = group(s);
    label(p3, R, 62, '机械臂：阻抗控制', 'demo-x-ink', 14);
    label(p3, R, 84, '末端像一根弹簧，按位移给力', 'demo-x-ink2', 12);
    var gx = R + 40, gy = 150;
    var gRing = ringAt(p3, gx, gy, 9, C_OBS, 2.5);
    void gRing;
    tone(p3, gx, gy + 30, '目标 g', C_OBS, 12, 'middle');
    var sp3 = spring(p3, C_INK, 7, 7), hand3 = dotAt(p3, gx + 120, gy, 9, C_INK), f3a = forceArrow(p3, C_F);
    var hand3t = label(p3, gx + 120, gy + 30, '手 x', 'demo-x-ink2', 12, 'middle');
    math(p3, R, 222, 'x = g + \\tfrac{1}{k}\\,f', 17);
    label(p3, R, 252, '人形的敏捷来自 RL 跟踪：任何偏离都狠狠纠正，没有柔顺的写法', 'demo-x-ink2', 11.5);
    /* 第 4 段：两条路 */
    var p4 = group(s);
    label(p4, R, 62, '两条路', 'demo-x-ink', 14);
    rectBox(p4, R, 76, 168, 150, C_BORDER, C_SURFACE2);
    rectBox(p4, R + 184, 76, 168, 150, C_BORDER, C_SURFACE2);
    label(p4, R + 84, 98, '扛住（FALCON）', 'demo-x-ink', 12, 'middle');
    label(p4, R + 268, 98, '让位（这一期 CHIP）', 'demo-x-ink', 12, 'middle');
    var hA = dotAt(p4, R + 84, 160, 9, C_STIFF), fA = forceArrow(p4, C_F);
    var hB = dotAt(p4, R + 268, 160, 9, C_SOFT), fB = forceArrow(p4, C_F), gB = ringAt(p4, R + 240, 160, 8, C_OBS, 2);
    label(p4, R + 84, 212, '拉重车 ✓，擦白板 ✗', 'demo-x-ink2', 11.5, 'middle');
    label(p4, R + 268, 212, '按指定的柔顺度让开', 'demo-x-ink2', 11.5, 'middle');
    /* 第 5 段：CHIP 的柔顺度旋钮 */
    var p5 = group(s);
    label(p5, R, 62, 'CHIP：给跟踪控制器加一个旋钮', 'demo-x-ink', 14);
    var ks = kSlider(p5, R, 104, 340, 0.05);
    var g5 = ringAt(p5, R + 30, 190, 9, C_OBS, 2.5), sp5 = spring(p5, C_SOFT, 7, 6), h5 = dotAt(p5, R + 60, 190, 9, C_SOFT), f5 = forceArrow(p5, C_F);
    void g5;
    label(p5, R, 240, '即插即用：不改参考、不加奖励项、不用合成数据', 'demo-x-ink2', 12);
    label(p5, R, 262, 'arXiv 2025-12（v2 2026-02）· 代码还没放出', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      clip.at(K.clipSince(t, 0), true);
      qs.forEach(function (q, i) { setOpacity(q, 0.35 + 0.65 * Math.abs(Math.sin(now * 2 + i))); });
      /* 太硬：手往右撞箱子，箱子被撞飞再复位（2.4 s 一循环） */
      var u = (now % 2.4) / 2.4, hx = R + 20 + Math.min(u, 0.35) / 0.35 * 70, bx = R + 104 + (u > 0.35 ? (u - 0.35) * 110 : 0);
      moveDot(hardHand, [hx, 170]);
      hardBox.setAttribute('x', Math.min(bx, R + 128).toFixed(1));
      hardBox.style.opacity = u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1;
      /* 太软：箱子挂在手下，手被往下拉、弹簧拉长 */
      var sag = 30 + 22 * (0.5 + 0.5 * Math.sin(now * 2.2));
      softSp.set(softTop, 116, softTop, 116 + sag);
      moveDot(softHand, [softTop, 116 + sag]);
      softBox.setAttribute('y', (116 + sag + 8).toFixed(1));
      /* 阻抗：力一推一放，手按 f/k 让开 */
      var fz = 0.5 + 0.5 * Math.sin(now * 1.6), d3 = 70 + 50 * fz;
      sp3.set(gx + 10, gy, gx + d3, gy);
      moveDot(hand3, [gx + d3, gy]);
      hand3t.setAttribute('x', (gx + d3).toFixed(1));
      f3a.set([gx + d3 + 12, gy], [1, 0], 50 * fz, 'f');
      /* 两条路：同样的推力，左边不动、右边让开 */
      var fp = 0.5 + 0.5 * Math.sin(now * 1.8);
      fA.set([R + 84 + 12, 160], [1, 0], 52 * fp, 'f');
      moveDot(hB, [R + 268 + 30 * fp, 160]);
      fB.set([R + 268 + 30 * fp + 8, 160], [1, 0], 34 * fp, 'f');
      moveDot(gB, [R + 268, 160]);
      /* 旋钮：1/k 在 0 和 0.05 之间来回拧，同样的力下让开的距离跟着变 */
      var kv = 0.025 + 0.025 * Math.sin(since(t, clock, 13.4) * 0.9 - 1.57);
      ks.set(kv);
      var d5 = 40 + kv / 0.05 * 150;
      sp5.set(R + 40, 190, R + 30 + d5, 190);
      moveDot(h5, [R + 30 + d5, 190]);
      f5.set([R + 30 + d5 + 12, 190], [1, 0], 46, 'f');
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 前人怎么教柔顺（图 3b、c） ── */
  function buildScenePrior() {
    var s = sceneSvg('左边是论文图 3 的 (b) 和 (c)：粉点是算奖励用的参考、黄点是策略看到的目标、蓝箭头是扰动力；讲到哪种做法就框出哪一张。' +
      '右边依次出现：四足上合成弹簧—阻尼参考的做法；GentleHumanoid 把奖励里的关键点按 g + f/k 挪开；SoftMimic 用逆运动学改整条手臂；' +
      '稠密的参考要一起改；GentleHumanoid 去掉了关节级跟踪奖励、跟踪误差变大');
    s.appendChild(svgText(24, 26, '以前的做法：改算奖励用的参考', 'demo-x-ink2', 13.5));
    var fig = paperPart(s, 'fig3', 0.335, 0.075, 1, 1, 24, 44, 380, '论文图 3（b）（c）：粉点 = 算奖励的参考，黄点 = 策略看到的目标，蓝箭头 = 扰动力');
    var boxB = rectBox(s, 24, 44, 188, fig.h, C_WARN, 'none'), boxC = rectBox(s, 216, 44, 188, fig.h, C_WARN, 'none');
    boxB.style.strokeWidth = '3'; boxC.style.strokeWidth = '3';
    var R = 424;
    /* 第 1 段：四足上的 UniFP、FACET */
    var p1 = group(s);
    label(p1, R, 62, '四足：UniFP、FACET', 'demo-x-ink', 14);
    label(p1, R, 84, '从零学阻抗：模仿目标的弹簧—质量—阻尼动力学', 'demo-x-ink2', 12);
    rectBox(p1, R, 98, 352, 120, C_BORDER, C_SURFACE2);
    var curves = [];
    for (var i = 0; i < 9; i++) curves.push(pathLine(p1, [[R, 158]], C_ACCENT, 1.4));
    label(p1, R + 8, 212, '合成的柔顺参考，一条接一条', 'demo-x-mut', 11);
    label(p1, R, 244, '单个末端还行；搬到人形，合成的动作很难留在人类动作的分布里', 'demo-x-ink2', 11.5);
    /* 第 2 段：GentleHumanoid（图 3b） */
    var p2 = group(s);
    label(p2, R, 62, 'GentleHumanoid：改奖励里的关键点（图 3b）', 'demo-x-ink', 14);
    math(p2, R, 104, 'r=\\exp\\!\\big(-\\lVert x_{\\mathrm{eef}}-g_{\\mathrm{ptb}}\\rVert\\big),\\ \\ g_{\\mathrm{ptb}}=g+\\tfrac{1}{k}f', 15);
    var o2 = [R + 120, 170];
    var obs2 = ringAt(p2, o2[0], o2[1], 9, C_OBS, 2.5), ref2 = dotAt(p2, o2[0], o2[1], 8, C_REF), f2a = forceArrow(p2, C_F);
    void obs2;
    tone(p2, o2[0] - 14, o2[1] + 32, '看到的：g', C_OBS, 12, 'end');
    var ref2t = tone(p2, o2[0], o2[1] + 32, '奖励用：g + f/k', C_REF, 12, 'start');
    label(p2, R, 244, '策略看原目标，奖励却要它跟着力挪开', 'demo-x-ink2', 12);
    /* 第 3 段：SoftMimic（图 3c） */
    var p3 = group(s);
    label(p3, R, 62, 'SoftMimic：用逆运动学改整条手臂（图 3c）', 'demo-x-ink', 14);
    var sh = [R + 90, 92], ghost = pathLine(p3, [sh], C_MUTED, 3, '5 4'), arm = pathLine(p3, [sh], C_REF, 4);
    var jd = [dotAt(p3, 0, 0, 6, C_REF), dotAt(p3, 0, 0, 6, C_REF), dotAt(p3, 0, 0, 6, C_REF)];
    var f3a = forceArrow(p3, C_F);
    label(p3, R + 200, 120, '离线生成一批', 'demo-x-ink2', 12);
    label(p3, R + 200, 140, '「被推之后」的动作', 'demo-x-ink2', 12);
    label(p3, R + 200, 166, '灰虚线：原来的手臂', 'demo-x-mut', 11);
    label(p3, R, 244, '肩、肘、手的参考都要跟着改，还得保持可行', 'demo-x-ink2', 12);
    /* 第 4 段：稠密的参考 */
    var p4 = group(s);
    label(p4, R, 62, '难在：奖励要用的参考是稠密的', 'demo-x-ink', 14);
    var names = ['连杆位置', '连杆朝向', '线速度', '角速度', '关节角', '关节速度'];
    var cells = [];
    names.forEach(function (n, r) {
      label(p4, R, 96 + r * 22, n, 'demo-x-ink2', 11.5);
      for (var c = 0; c < 14; c++) cells.push(dotAt(p4, R + 92 + c * 18, 92 + r * 22, 5, C_REF));
    });
    label(p4, R, 244, '改一处，这一整套都要一起改对；跑步还要满足动力学', 'demo-x-ink2', 12);
    /* 第 5 段：GentleHumanoid 去掉关节级跟踪奖励 → 误差变大（表 I） */
    var p5 = group(s);
    label(p5, R, 62, 'GentleHumanoid 还去掉了关节级的跟踪奖励', 'demo-x-ink', 14);
    label(p5, R, 84, '局部位置误差（表 I，越短越好）', 'demo-x-ink2', 12);
    var rows5 = [['CHIP', 0.02, C_GOOD], ['GentleHumanoid 硬', 0.04, C_WARN], ['GentleHumanoid 软', 0.05, C_WARN]].map(function (r, i) {
      var b = barRowAt(p5, R, 104 + i * 34, 130, r[0], r[2], 18, 12);
      return { b: b, v: r[1] };
    });
    label(p5, R, 244, '误差是 CHIP 的 2–2.5 倍：奖励和柔顺目标打架', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(boxB, t >= 3.6 && t < 7.0 ? 0.55 + 0.45 * Math.sin(now * 4) : 0);
      setOpacity(boxC, t >= 7.0 && t < 10.4 ? 0.55 + 0.45 * Math.sin(now * 4) : 0);
      /* 合成的参考曲线一条一条画出来 */
      var n1 = Math.floor(since(t, clock, 0.4) * 1.5) % 10;
      curves.forEach(function (c, j) {
        var pts = [], amp = 18 + j * 3, z = 0.25 + j * 0.05;
        for (var q = 0; q <= 60; q++) { var xx = q / 60; pts.push([R + 6 + xx * 340, 158 - amp * Math.exp(-z * xx * 8) * Math.cos(xx * (10 + j))]); }
        setPath(c, pts);
        setOpacity(c, j < n1 ? 0.75 : 0);
      });
      /* GentleHumanoid：力推着奖励的目标挪开 */
      var fz = 0.5 + 0.5 * Math.sin(now * 1.7);
      f2a.set([o2[0] + 12, o2[1]], [1, 0], 70 * fz, 'f');
      moveDot(ref2, [o2[0] + 60 * fz, o2[1]]);
      ref2t.setAttribute('x', (o2[0] + 6).toFixed(1));
      /* SoftMimic：整条手臂跟着力挪 */
      var a3 = 0.5 + 0.5 * Math.sin(now * 1.5);
      var el0 = [sh[0] - 30, sh[1] + 50], wr0 = [sh[0] + 10, sh[1] + 96];
      var el1 = [el0[0] - 22 * a3, el0[1] + 6 * a3], wr1 = [wr0[0] - 58 * a3, wr0[1] + 10 * a3];
      setPath(ghost, [sh, el0, wr0]);
      setPath(arm, [sh, el1, wr1]);
      moveDot(jd[0], sh); moveDot(jd[1], el1); moveDot(jd[2], wr1);
      f3a.set([wr1[0] - 10, wr1[1]], [-1, 0.15], 30 * a3 + 2, 'f', [-6, -8]);
      /* 稠密参考：一列一列地挪 */
      var col = Math.floor(since(t, clock, 10.4) * 5) % 16;
      cells.forEach(function (c, i) {
        var cc = i % 14;
        c.style.opacity = cc < col ? 1 : 0.3;
        c.setAttribute('cy', (92 + Math.floor(i / 14) * 22 + (cc < col ? 3 : 0)).toFixed(1));
      });
      var u5 = seg(since(t, clock, 13.4), 0.3, 1.8);
      rows5.forEach(function (r) { r.b.set(r.v / 0.05 * 170 * u5, u5 > 0.05 ? f2(r.v) + ' m' : ''); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 第 3、4、6、10、18 幕的 G1 放在左边：贴图左上角 (G1X, G1Y)、缩放 G1K（300 px/m × 0.62 = 186 px/m） */
  var G1X = 96, G1Y = 40, G1K = 0.62, PXM = YIELD.R * G1K;

  /* ── scene 3: 事后扰动：改观测，不改参考 ── */
  function buildSceneHindsight() {
    var s = sceneSvg('左边是 G1 的模型（站姿示意）：粉点是参考里两只手腕和头的位置，也是算奖励用的目标；蓝箭头是加在手上的外力，按梯形一推一放；' +
      '黄圈是策略看到的目标 g − f/k，往力的反方向挪开；机器人停在粉点就拿满分。右边依次出现：关键洞见、事后目标的式子与算例、两种停法的奖励、学到的规律、论文图 3a 与三种写法的对比');
    s.appendChild(svgText(24, 26, '事后扰动：参考不改，只改策略看到的目标', 'demo-x-ink2', 13.5));
    var robot = g1Yield(s);
    var P = robot.put(G1X, G1Y, G1K, 0);
    var refH = dotAt(s, P.head[0], P.head[1], 6, C_REF);
    void refH;
    var obsR = ringAt(s, P.rw[0], P.rw[1], 7, C_OBS, 2.6), obsL = ringAt(s, P.lw[0], P.lw[1], 7, C_OBS, 2.6);
    var linkR = hline(s, 0, 0, 0, 0, C_OBS, 1.4, '3 3'), linkL = hline(s, 0, 0, 0, 0, C_OBS, 1.4, '3 3');
    var refR = dotAt(s, P.rw[0], P.rw[1], 6, C_REF), refL = dotAt(s, P.lw[0], P.lw[1], 6, C_REF);
    void refR; void refL;
    var fR = forceArrow(s, C_F), fL = forceArrow(s, C_F);
    var fTxt = label(s, 24, 340, '', 'demo-x-ink2', 11.5);
    legendRow(s, 24, 366, [['参考 g（算奖励）', C_REF, 110], ['看到的 g − f/k', C_OBS, 100], ['外力 f', C_F, 40]], 11);
    label(s, 24, 390, '示意：f 峰值 5 N、1/k = 0.02（例 1），按 186 px/m 画', 'demo-x-mut', 11);
    var R = 424;
    /* 第 1 段：关键洞见 */
    var p1 = group(s);
    label(p1, R, 62, '关键洞见：把参考看成「已经被推过之后」', 'demo-x-ink', 14);
    var a1 = [R + 40, 140], b1 = [R + 290, 140];
    ringAt(p1, a1[0], a1[1], 11, C_OBS, 2.6);
    dotAt(p1, b1[0], b1[1], 9, C_REF);
    tone(p1, a1[0], a1[1] + 34, '本来的目标 g − f/k', C_OBS, 12, 'middle');
    tone(p1, b1[0], b1[1] + 34, '参考里的 g', C_REF, 12, 'middle');
    var mv1 = dotAt(p1, a1[0], a1[1], 5, C_INK), arr1 = forceArrow(p1, C_F);
    label(p1, R + 165, 118, '被力 f 推开 f/k', 'demo-x-ink2', 12, 'middle');
    label(p1, R, 222, '于是原参考可以原封不动地拿来算奖励', 'demo-x-ink2', 12);
    /* 第 2 段：式子与算例 */
    var p2 = group(s);
    label(p2, R, 62, '训练时策略看到的目标', 'demo-x-ink', 14);
    math(p2, R, 106, 'g_{\\mathrm{hind}} = g - \\tfrac{1}{k}\\,f', 20);
    rich(p2, R, 146, '例：右手腕 $g=(0.22,\\,-0.23,\\,0.82)$ m', 12.5);
    rich(p2, R, 172, '往外 $f=(0,\\,-5,\\,0)$ N，$1/k=0.02$', 12.5);
    rich(p2, R, 198, '→ $g_{\\mathrm{hind}}=(0.22,\\,-0.13,\\,0.82)$ m', 12.5);
    label(p2, R, 228, '往力的反方向（往里）挪 0.10 m', 'demo-x-ink2', 12);
    /* 第 3 段：奖励按原参考算 */
    var p3 = group(s);
    label(p3, R, 62, '奖励照旧按原来的 g 算', 'demo-x-ink', 14);
    label(p3, R, 86, '表 III 的三点位置项（越长越好，满分 1）', 'demo-x-ink2', 12);
    var b3a = barRowAt(p3, R, 104, 132, '停在粉点（让开）', C_GOOD, 20, 12), b3b = barRowAt(p3, R, 136, 132, '硬顶在黄点', C_BAD, 20, 12);
    label(p3, R, 190, '只有让开 f/k，才拿满分（例 2）', 'demo-x-ink2', 12);
    /* 第 4 段：学到的规律 */
    var p4 = group(s);
    label(p4, R, 62, '策略学到的规律', 'demo-x-ink', 14);
    var y4 = 130;
    hline(p4, R + 20, y4, R + 330, y4, C_BORDER, 2);
    var o4 = ringAt(p4, R + 80, y4, 10, C_OBS, 2.6), r4 = dotAt(p4, R + 250, y4, 8, C_REF);
    void o4; void r4;
    tone(p4, R + 80, y4 + 32, '看到的目标', C_OBS, 12, 'middle');
    tone(p4, R + 250, y4 + 32, '手停的位置', C_REF, 12, 'middle');
    var gap4 = arrow(p4, C_F, 2);
    label(p4, R + 165, y4 - 18, '+ f/k', 'demo-x-ink', 13, 'middle');
    label(p4, R, 200, '「看到目标、手上有力，就停在目标外 f/k 处」', 'demo-x-ink2', 12);
    label(p4, R, 224, '这是我们对它为什么能学到柔顺的理解', 'demo-x-mut', 11);
    /* 第 5 段：图 3a 与三种写法 */
    var p5 = group(s);
    label(p5, R, 62, '三种写法（论文图 3）', 'demo-x-ink', 14);
    var rows = [['(a) CHIP', '看 g − f/k', '奖励用 g'], ['(b) GentleHumanoid', '看 g', '奖励用 g + f/k'], ['(c) SoftMimic', '看 g', 'IK 改整条手臂']];
    rows.forEach(function (r, i) {
      var y = 88 + i * 42;
      chip(p5, R, y, 130, r[0], i ? C_BORDER : C_GOOD, { size: 12, h: 30, left: true });
      label(p5, R + 140, y + 20, r[1], 'demo-x-ink2', 12);
      label(p5, R + 240, y + 20, r[2], 'demo-x-ink2', 12);
    });
    label(p5, R, 236, 'CHIP 只改观测里三个稀疏的点，参考一个点都不动', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* 外力：4 s 一次，3 s 梯形 + 1 s 空着；峰值 5 N，1/k = 0.02 → 让开 0.10 m = 18.6 px */
      var u = (now % 4) / 3, F = trap(u, 5), d = F * EX.ik * PXM;
      moveDot(obsR, [P.rw[0] + d, P.rw[1]]);
      moveDot(obsL, [P.lw[0] - d, P.lw[1]]);
      setLine(linkR, P.rw[0], P.rw[1], P.rw[0] + d, P.rw[1]);
      setLine(linkL, P.lw[0], P.lw[1], P.lw[0] - d, P.lw[1]);
      fR.set([P.rw[0] - 9, P.rw[1]], [-1, 0], F * 9, 'f', [-2, -10]);
      fL.set([P.lw[0] + 9, P.lw[1]], [1, 0], F * 9, 'f', [2, -10]);
      fTxt.textContent = '外力 ' + f1(F) + ' N → 看到的目标往里挪 ' + f2(F * EX.ik) + ' m';
      var w1 = (now % 3) / 3;
      moveDot(mv1, [a1[0] + (b1[0] - a1[0]) * w1, a1[1]]);
      arr1.set([a1[0] + 16, a1[1] - 4], [1, 0], (b1[0] - a1[0] - 32) * Math.min(1, w1 * 1.3), '');
      var u3 = seg(since(t, clock, 7.0), 0.3, 1.5);
      b3a.set(150 * u3, u3 > 0.05 ? f3(1) : '');
      b3b.set(150 * threePtReward(0.10) * u3, u3 > 0.05 ? f3(threePtReward(0.10)) : '');
      var u4 = 0.5 + 0.5 * Math.sin(now * 2);
      gap4.set(R + 94, y4, R + 94 + (R + 236 - R - 94) * (0.3 + 0.7 * u4), y4, 8);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 部署时：一根看不见的弹簧 ── */
  function buildSceneSpring() {
    var s = sceneSvg('左边是 G1 的模型：黄圈是部署时的命令目标 g，固定不动；蓝箭头是外力，按梯形一推一放；手按 f/k 往外让开，1/k 依次取 0、0.02、0.03。' +
      '右边依次出现：部署时观测里就是 g；手停在 g + f/k；力和位移的三条直线；v1 论文里 20 N 下末端位移随 1/k 的曲线，蓝色 CHIP、红色只改奖励的基线；最后叠上按式子算的虚线');
    s.appendChild(svgText(24, 26, '部署时：手按 f / k 让开，像一根弹簧', 'demo-x-ink2', 13.5));
    var robot = g1Yield(s);
    var P0 = robot.put(G1X, G1Y, G1K, 0);
    var gR = ringAt(s, P0.rw0[0], P0.rw0[1], 8, C_OBS, 2.6), gL = ringAt(s, P0.lw0[0], P0.lw0[1], 8, C_OBS, 2.6);
    void gR; void gL;
    var hR = dotAt(s, 0, 0, 5, C_INK), hL = dotAt(s, 0, 0, 5, C_INK);
    var fR = forceArrow(s, C_F), fL = forceArrow(s, C_F);
    var kTxt = label(s, 24, 340, '', 'demo-x-ink', 12.5), dTxt = label(s, 24, 362, '', 'demo-x-ink2', 11.5);
    legendRow(s, 24, 388, [['命令目标 g', C_OBS, 76], ['手', C_INK, 20], ['外力 f（峰值 5 N）', C_F, 120]], 11);
    var R = 424;
    var p1 = group(s);
    label(p1, R, 62, '部署：观测里就是真正的目标 g', 'demo-x-ink', 14);
    label(p1, R, 86, 'VR、规划器或 VLA 给的目标，原样喂进去', 'demo-x-ink2', 12);
    var gg = [R + 170, 150];
    ringAt(p1, gg[0], gg[1], 13, C_OBS, 2.6);
    dotAt(p1, gg[0], gg[1], 7, C_REF);
    label(p1, gg[0], gg[1] + 40, '看到的 = 想要的（不减任何东西）', 'demo-x-ink2', 12, 'middle');
    var p2 = group(s);
    label(p2, R, 62, '手上来了力：停在目标外 f / k 处', 'demo-x-ink', 14);
    math(p2, R, 112, 'x_{\\mathrm{eef}} \\approx g + \\tfrac{1}{k}\\,f', 22);
    label(p2, R, 150, '训练时学到的规律，原样用在真正的目标上', 'demo-x-ink2', 12);
    rich(p2, R, 178, '例 3：5 N、$1/k=0.02$ → 让开 0.10 m', 12.5);
    rich(p2, R, 202, '$1/k=0$：一点不让，就是普通的硬跟踪', 12.5);
    /* 第 3 段：力—位移的三条直线 */
    var p3 = group(s);
    label(p3, R, 62, '胡克定律：位移 = 力 × 1/k', 'demo-x-ink', 14);
    var pb3 = plotBox(p3, R + 30, 80, 300, 140, 0, 10, 0, 0.5);
    [[0, C_STIFF, '1/k = 0'], [0.02, C_GOOD, '0.02'], [0.05, C_SOFT, '0.05']].forEach(function (c) {
      var pts = [];
      for (var f = 0; f <= 10; f += 0.5) pts.push([pb3.px(f), pb3.py(Math.min(0.5, f * c[0]))]);
      pathLine(pb3.g, pts, c[1], 2.4);
      tone(p3, pb3.px(10) + 4, pb3.py(Math.min(0.5, 10 * c[0])) + (c[0] ? 4 : -6), c[2], c[1], 11);
    });
    label(p3, R + 30, 236, '0', 'demo-x-mut', 11, 'middle');
    label(p3, R + 330, 236, '10 N', 'demo-x-mut', 11, 'middle');
    label(p3, R + 24, 84, '0.5 m', 'demo-x-mut', 11, 'end');
    readHint(p3, R, 258, '横轴是力、纵轴是让开的距离；线越陡越软', 11.5);
    /* 第 4、5 段：v1 的图（v2 删了） */
    var p4 = group(s);
    label(p4, R, 62, 'v1 的图：20 N 下末端让开多少（v2 删了）', 'demo-x-ink', 13.5);
    var pb = plotBox(p4, R + 34, 78, 300, 150, 0, 0.15, 0, 0.6);
    [0.2, 0.4].forEach(function (v) { hline(pb.g, pb.px(0), pb.py(v), pb.px(0.15), pb.py(v), C_BORDER, 1, '2 4'); label(p4, R + 28, pb.py(v) + 4, f1(v), 'demo-x-mut', 11, 'end'); });
    label(p4, R + 28, pb.py(0.6) + 8, '0.6 m', 'demo-x-mut', 11, 'end');
    [0, 0.05, 0.1, 0.15].forEach(function (v) { label(p4, pb.px(v), 244, String(v), 'demo-x-mut', 11, 'middle'); });
    var cChip = pathLine(pb.g, [], C_ACCENT, 2.6), cRt = pathLine(pb.g, [], C_BAD, 2.6);
    var cHk = pathLine(pb.g, [], C_MUTED, 2, '6 4');
    var mk = dotAt(pb.g, pb.px(0.05), pb.py(0.27), 5, C_ACCENT);
    var mkT = halo(label(p4, pb.px(0.05) + 8, pb.py(0.27) + 18, '0.05 → 0.27 m', 'demo-x-ink', 11.5));
    legendRow(p4, R, 268, [['CHIP', C_ACCENT, 34], ['只改奖励的基线', C_BAD, 96]], 11);
    readHint(p4, R, 292, '横轴 1/k、纵轴 20 N 下的位移；线越高越软', 11.5);
    var p5 = group(s);
    tone(p5, pb.px(0.032), pb.py(0.6) + 14, '式子 20 × 1/k', C_MUTED, 11);
    rich(p5, R, 318, '式子：$0.05\\times20=1.0$ m，图上只有 0.27 m', 12);
    label(p5, R, 342, '论文没解释；肩到手腕最多约 0.39 m（例 3）', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      /* 4 s 一次扰动：3 s 梯形 + 1 s 空着；1/k 依次取 0、0.02、0.03 */
      var cyc = Math.floor(now / 4), ik = [0, 0.02, 0.03][((cyc % 3) + 3) % 3];
      var u = (now % 4) / 3, F = trap(u, 5), d = F * ik;
      var P = robot.put(G1X, G1Y, G1K, yieldFrame(d));
      moveDot(hR, P.rw); moveDot(hL, P.lw);
      fR.set([P.rw[0] - 8, P.rw[1]], [-1, 0], F * 9, 'f', [-2, -10]);
      fL.set([P.lw[0] + 8, P.lw[1]], [1, 0], F * 9, 'f', [2, -10]);
      kTxt.textContent = '1/k = ' + (ik ? f2(ik) : '0') + (ik ? '（软一点）' : '（硬）');
      dTxt.textContent = '外力 ' + f1(F) + ' N → 手往外让开 ' + f2(d) + ' m';
      /* v1 曲线一点点画出来 */
      var u4 = seg(since(t, clock, 10.4), 0.3, 2.3), n = Math.max(1, Math.round(u4 * (DISP_K.length - 1)));
      setPath(cChip, DISP_K.slice(0, n + 1).map(function (k, i) { return [pb.px(k), pb.py(DISP_CHIP[i])]; }));
      setPath(cRt, DISP_K.slice(0, n + 1).map(function (k, i) { return [pb.px(k), pb.py(DISP_RT[i])]; }));
      setOpacity(mk, u4 > 0.4 ? 1 : 0); setOpacity(mkT, u4 > 0.4 ? 1 : 0);
      var u5 = seg(since(t, clock, 13.4), 0.3, 1.5);
      setPath(cHk, [[pb.px(0), pb.py(0)], [pb.px(0.03 * u5), pb.py(0.6 * u5)]]);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: 三个好处 ── */
  function buildSceneBenefits() {
    var s = sceneSvg('上面三张卡片依次亮起：改稀疏目标（三个点在挪，下面一整片稠密参考不动）；奖励永远是原动作（小点在参考动作的分布里走，改过的参考可能跑出去）；' +
      '观测里多了被平移过的目标（灰点是数据集里的目标，黄点是挪开的）。下面依次出现：三样不需要的东西打叉；CHIP 像插头一样插进关键点跟踪框架');
    s.appendChild(svgText(24, 26, '为什么改观测比改参考好：论文列了三条', 'demo-x-ink2', 13.5));
    var CW = 240, cards = [], X0 = [24, 280, 536];
    ['① 改稀疏的目标，在线就能做', '② 奖励永远是原动作 → 更自然', '③ 见过平移过的目标 → 更鲁棒'].forEach(function (tt, i) {
      var g = group(s);
      var bx = rectBox(g, X0[i], 40, CW, 220, C_BORDER, C_SURFACE2);
      label(g, X0[i] + 10, 62, tt, 'demo-x-ink', 12.5);
      cards.push({ g: g, box: bx });
    });
    /* 卡片 1：三个点挪动、下面的稠密参考不动 */
    var c1 = cards[0].g, sp1 = [], dense = [];
    for (var i = 0; i < 3; i++) sp1.push(ringAt(c1, X0[0] + 60 + i * 60, 102, 8, C_OBS, 2.4));
    label(c1, X0[0] + 10, 136, '观测：三个点（头、两手腕）', 'demo-x-ink2', 11);
    for (var r = 0; r < 4; r++) for (var c = 0; c < 12; c++) dense.push(dotAt(c1, X0[0] + 22 + c * 18, 156 + r * 16, 4, C_REF));
    label(c1, X0[0] + 10, 236, '奖励用的稠密参考：一个不改', 'demo-x-ink2', 11);
    /* 卡片 2：分布 */
    var c2 = cards[1].g, cx2 = X0[1] + 120, cy2 = 150;
    var blob = paint(svgEl('ellipse', { cx: cx2, cy: cy2, rx: 80, ry: 52 }), C_REF);
    blob.style.opacity = 0.18; c2.appendChild(blob);
    label(c2, cx2, cy2 + 64, '粉紫：参考动作的分布', 'demo-x-mut', 11, 'middle');
    var walk2 = dotAt(c2, cx2, cy2, 6, C_GOOD), trail2 = pathLine(c2, [], C_GOOD, 1.6);
    var out2 = pathLine(c2, [], C_BAD, 1.6, '4 3');
    label(c2, X0[1] + 10, 236, '绿：CHIP 的动作；红虚线：改过的参考', 'demo-x-ink2', 11);
    /* 卡片 3：观测的覆盖 */
    var c3 = cards[2].g, cx3 = X0[2] + 120, cy3 = 150, grey = [], yel = [];
    for (var k = 0; k < 22; k++) grey.push(dotAt(c3, cx3 + (rnd(k, 3) - 0.5) * 70, cy3 + (rnd(k, 5) - 0.5) * 50, 4, C_MUTED));
    for (var k2 = 0; k2 < 30; k2++) {
      var ang = rnd(k2, 7) * 6.283, rr = 40 + rnd(k2, 9) * 50;
      yel.push(ringAt(c3, cx3 + Math.cos(ang) * rr * 1.3, cy3 + Math.sin(ang) * rr * 0.75, 3.5, C_OBS, 1.6));
    }
    label(c3, X0[2] + 10, 236, '灰：数据集里的目标；黄：挪开的', 'demo-x-ink2', 11);
    /* 下面第 4 段：三样不需要的 */
    var p4 = group(s);
    ['不用合成数据', '不加奖励项', '不学力估计器'].forEach(function (w, j) {
      chip(p4, 24 + j * 180, 290, 160, w, C_GOOD, { size: 12.5, h: 32 });
    });
    var crosses = [0, 1, 2].map(function (j) { return cross(p4, 24 + j * 180 + 140, 300, 12, C_BAD); });
    label(p4, 24, 352, '只有一个策略、一个 PPO 目标（摘要：「既不要数据增广，也不要额外调奖励」）', 'demo-x-ink2', 12);
    /* 第 5 段：即插即用 */
    var p5 = group(s);
    rectBox(p5, 544, 280, 248, 100, C_BORDER, C_SURFACE2);
    label(p5, 668, 300, '关键点跟踪框架', 'demo-x-ink', 12.5, 'middle');
    label(p5, 668, 351, '局部：SONIC、OmniH2O', 'demo-x-ink2', 11, 'middle');
    label(p5, 668, 372, '全局：CLONE、HEAD', 'demo-x-ink2', 11, 'middle');
    var plug = group(p5);
    rectBox(plug, 0, 311, 64, 22, C_GOOD, C_SURFACE);
    label(plug, 32, 326, 'CHIP', 'demo-x-ink', 12, 'middle');
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var dx = 14 * Math.sin(now * 2);
      sp1.forEach(function (c, j) { moveDot(c, [X0[0] + 60 + j * 60 + (j === 1 ? 0 : (j ? dx : -dx)), 102]); });
      var pts = [];
      for (var q = 0; q < 40; q++) { var tt = now - q * 0.05; pts.push([cx2 + 62 * Math.sin(tt * 1.3), cy2 + 36 * Math.sin(tt * 2.1 + 1)]); }
      setPath(trail2, pts);
      moveDot(walk2, pts[0]);
      var tt2 = now % 4, oq = [];
      for (var q2 = 0; q2 <= 20; q2++) { var z = q2 / 20 * Math.min(1, tt2 / 2); oq.push([cx2 - 60 + z * 160, cy2 + 30 - z * 90]); }
      setPath(out2, oq);
      var nY = Math.floor(since(t, clock, 7.0) * 6);
      yel.forEach(function (c, j) { c.style.opacity = j < nY ? 1 : 0; });
      crosses.forEach(function (c, j) { setOpacity(c, seg(since(t, clock, 10.4), 0.5 + j * 0.5, 0.8 + j * 0.5)); });
      var u5 = seg(since(t, clock, 13.4), 0.4, 1.6);
      plug.setAttribute('transform', 'translate(' + (636 - 32 * u5).toFixed(1) + ' 0)');
      setOpacity(plug, u5);
      cards.forEach(function (c, j) {
        var at = [0.3, 3.6, 7.0][j], next = [3.6, 7.0, 10.4][j];
        setOpacity(c.g, seg(t, at + 0.3, at + 0.7));
        c.box.style.stroke = t >= at && t < next ? C_GOOD : '';
      });
      setOpacity(p4, win(t, 10.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 力怎么加（附录 B、图 9） ── */
  function buildSceneForce() {
    var s = sceneSvg('左边是 G1 的模型，两只手上各有一支蓝箭头：每次扰动换一个随机方向、随机峰值和随机持续时间，大小按梯形一升一平一降。' +
      '右边依次出现：加在末端；峰值的直方图在 0 到 40 牛之间一个个落下；持续时间的直方图在 1 到 3 秒之间落下；论文图 9 的梯形，竖线跟着当前这次扰动走；用意与没写的细节');
    s.appendChild(svgText(24, 26, '训练时的外力：方向、大小、时长都随机（附录 B）', 'demo-x-ink2', 13.5));
    var robot = g1Yield(s);
    var P = robot.put(G1X, G1Y, G1K, 0);
    var fR = forceArrow(s, C_F), fL = forceArrow(s, C_F);
    var info = label(s, 24, 346, '', 'demo-x-ink2', 11.5), info2 = label(s, 24, 368, '', 'demo-x-mut', 11);
    /* 扰动序列：每次 [开始, 时长, 峰值, 右手方向角, 左手方向角]；两次之间空 0.6 s（显示用） */
    var SEQ = [], t0 = 0;
    for (var i = 0; i < 40; i++) {
      var T = FORCE.tmin + (FORCE.tmax - FORCE.tmin) * rnd(i, 21), F = FORCE.fmax * rnd(i, 23);
      SEQ.push([t0, T, F, rnd(i, 25) * 6.283, rnd(i, 27) * 6.283]);
      t0 += T + 0.6;
    }
    function current(sec) {
      var m = ((sec % t0) + t0) % t0;
      for (var j = 0; j < SEQ.length; j++) if (m >= SEQ[j][0] && m < SEQ[j][0] + SEQ[j][1] + 0.6) return { k: j, e: SEQ[j], u: (m - SEQ[j][0]) / SEQ[j][1] };
      return { k: 0, e: SEQ[0], u: 0 };
    }
    var R = 424;
    var p1 = group(s);
    label(p1, R, 62, '加在末端：两只手', 'demo-x-ink', 14);
    label(p1, R, 86, '图 2、图 3 里头上也画了力；正文只说「末端」', 'demo-x-ink2', 12);
    label(p1, R, 110, '每次：方向、峰值、持续时间各抽一个', 'demo-x-ink2', 12);
    /* 第 2、3 段：两个直方图 */
    var p2 = group(s), p3 = group(s);
    function histo(g, y, lo, hi, unit, title, idx) {
      label(g, R, y, title, 'demo-x-ink', 13);
      hline(g, R + 10, y + 70, R + 330, y + 70, C_BORDER, 1.4);
      label(g, R + 10, y + 86, lo + ' ' + unit, 'demo-x-mut', 11, 'middle');
      label(g, R + 330, y + 86, hi + ' ' + unit, 'demo-x-mut', 11, 'middle');
      var dots = SEQ.slice(0, 32).map(function () { return dotAt(g, 0, 0, 4, C_F); });
      return { dots: dots, set: function (n) {
        var counts = [0, 0, 0, 0, 0, 0, 0, 0];
        dots.forEach(function (d, j) {
          var v = SEQ[j][idx], b = Math.min(7, Math.floor((v - lo) / (hi - lo) * 8));
          var cy = y + 64 - counts[b] * 9;
          counts[b]++;
          moveDot(d, [R + 10 + (b + 0.5) * 40, cy]);
          d.style.opacity = j < n ? 1 : 0;
        });
      } };
    }
    var hF = histo(p2, 62, 0, 40, 'N', '峰值 U[0, 40] N（方向均匀随机）', 2);
    var hT = histo(p3, 196, 1, 3, 's', '持续 U[1, 3] s', 1);
    /* 第 4 段：图 9 的梯形 */
    var p4 = group(s);
    label(p4, R, 62, '大小按梯形走（图 9）', 'demo-x-ink', 14);
    var pb = plotBox(p4, R + 34, 76, 300, 140, 0, 1, 0, 40);
    pathLine(pb.g, [[pb.px(0), pb.py(0)], [pb.px(0.25), pb.py(40)], [pb.px(0.75), pb.py(40)], [pb.px(1), pb.py(0)]], C_F, 2.6);
    [0, 0.25, 0.75, 1].forEach(function (v) { label(p4, pb.px(v), 232, String(v), 'demo-x-mut', 11, 'middle'); });
    label(p4, R + 28, pb.py(40) + 9, '40 N', 'demo-x-mut', 11, 'end');
    var cur = hline(p4, 0, 76, 0, 216, C_WARN, 1.6), curDot = dotAt(p4, 0, 0, 5, C_WARN);
    readHint(p4, R, 256, '横轴是一次扰动里的相对时间、纵轴是力的大小', 11.5);
    rich(p4, R, 282, '例 4：$T=2$ s、$F=24$ N → 0.3 s 时 14.4 N，1.8 s 时 9.6 N', 12);
    var p5 = group(s);
    label(p5, R, 316, '用意：模仿阻抗控制下的接触力——碰上时增大、松开时降到 0', 'demo-x-ink2', 11.5);
    label(p5, R, 340, '没写：两次之间隔多久、两只手是否同时、1/k 怎么抽', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock), c = current(now), e = c.e;
      var F = trap(c.u, e[2]), L = F * 1.5;
      fR.set([P.rw[0], P.rw[1]], [Math.cos(e[3]), Math.sin(e[3])], L, '', [0, 0]);
      fL.set([P.lw[0], P.lw[1]], [Math.cos(e[4]), Math.sin(e[4])], L, '', [0, 0]);
      info.textContent = '第 ' + (c.k + 1) + ' 次：峰值 ' + f1(e[2]) + ' N，持续 ' + f1(e[1]) + ' s；现在 ' + f1(F) + ' N';
      info2.textContent = '箭头是投影到正视图上的方向（三维里方向均匀随机）';
      hF.set(Math.floor(since(t, clock, 3.6) * 6));
      hT.set(Math.floor(since(t, clock, 7.0) * 6));
      var x = pb.px(clamp(c.u, 0, 1));
      setLine(cur, x, 76, x, 216);
      moveDot(curDot, [x, pb.py(trap(c.u, 40))]);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 10.4));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 7: 策略看什么（图 2） ── */
  function buildSceneInputs() {
    var s = sceneSvg('上面是论文图 2 的训练部分：第 1 步往末端加力、算出事后目标，第 2 步用原目标的奖励训练；讲到哪一块就框出哪一块。' +
      '下面依次出现：四路输入流向演员；10 步历史像纸带一样往左走；批评家多看真实外力；不学力估计器；64 张显卡一格格亮起');
    s.appendChild(svgText(24, 26, '策略看什么、怎么训（图 2）', 'demo-x-ink2', 13.5));
    var fig = paperPart(s, 'fig2', 0, 0, 1, 0.47, 24, 40, 752, '');
    /* 在裁剪后的图上框出一块：u、v 是原图的归一化坐标（v ≤ 0.47） */
    function figBox(u0, v0, u1, v1, color) {
      var r = rectBox(s, 24 + u0 * 752, 40 + v0 / 0.47 * fig.h, (u1 - u0) * 752, (v1 - v0) / 0.47 * fig.h, color || C_WARN, 'none');
      r.style.strokeWidth = '3';
      return r;
    }
    var bxIn = figBox(0.405, 0.095, 0.585, 0.29), bxAct = figBox(0.612, 0.115, 0.735, 0.27), bxCri = figBox(0.612, 0.29, 0.735, 0.445), bxF = figBox(0.47, 0.375, 0.6, 0.43);
    var Y = 218;
    /* 第 1 段：四路输入 → 演员 */
    var p1 = group(s);
    var ins = [['三点目标（训练时 $g-f/k$）', C_OBS], ['每只手的 $1/k$', C_SOFT], ['10 步本体感受', C_INK], ['11 步历史动作', C_INK]];
    ins.forEach(function (it, i) { chip(p1, 24, Y + 6 + i * 40, 220, it[0], it[1], { size: 12, h: 30 }); });
    rectBox(p1, 360, Y + 60, 120, 50, C_GOOD, C_SURFACE2);
    label(p1, 420, Y + 90, '演员（策略）', 'demo-x-ink', 13, 'middle');
    chip(p1, 600, Y + 70, 120, '动作 $a_t$', C_GOOD, { size: 12.5, h: 30 });
    var fl1 = ins.map(function () { return flowSeg(p1, C_MUTED, 2, 3, 70); }), fo1 = flowSeg(p1, C_GOOD, 3, 3.4, 70);
    /* 第 2 段：历史纸带 */
    var p2 = group(s);
    label(p2, 24, Y + 18, '力从历史里猜：同样的动作，手没到该到的地方，就说明有外力', 'demo-x-ink', 13);
    var tape = group(p2), cells2 = [];
    for (var i = 0; i < 12; i++) {
      var g = group(tape);
      rectBox(g, 0, 0, 52, 46, C_BORDER, C_SURFACE2);
      var lb = label(g, 26, 20, '', 'demo-x-ink2', 11, 'middle'), lb2 = label(g, 26, 37, '', 'demo-x-mut', 11, 'middle');
      cells2.push({ g: g, a: lb, b: lb2 });
    }
    var winT = hline(p2, 84 - 6, Y + 42, 84 + 10 * 60 - 14, Y + 42, C_WARN, 1.6, '5 4'), winB = hline(p2, 84 - 6, Y + 104, 84 + 10 * 60 - 14, Y + 104, C_WARN, 1.6, '5 4');
    void winT; void winB;
    label(p2, 24, Y + 128, '框里是策略能看到的 10 步；每一格记一步的本体感受和上一步的动作', 'demo-x-ink2', 12);
    /* 第 3 段：批评家看真实外力 */
    var p3 = group(s);
    rectBox(p3, 300, Y + 10, 140, 46, C_GOOD, C_SURFACE2);
    label(p3, 370, Y + 39, '演员', 'demo-x-ink', 13, 'middle');
    rectBox(p3, 300, Y + 92, 140, 46, C_ACCENT, C_SURFACE2);
    label(p3, 370, Y + 121, '批评家（价值）', 'demo-x-ink', 13, 'middle');
    chip(p3, 24, Y + 50, 200, '同样的输入', C_INK, { size: 12, h: 30 });
    chip(p3, 24, Y + 110, 200, '真实外力 $f$（特权）', C_F, { size: 12, h: 30 });
    var fA = flowSeg(p3, C_MUTED, 2, 3, 60), fB = flowSeg(p3, C_MUTED, 2, 3, 60), fC = flowSeg(p3, C_F, 3, 3.4, 60);
    label(p3, 470, Y + 39, '部署时只有它：看不到力', 'demo-x-ink2', 12);
    label(p3, 470, Y + 121, '只在训练时用：价值估得更准', 'demo-x-ink2', 12);
    /* 第 4 段：不学力估计器 */
    var p4 = group(s);
    chip(p4, 24, Y + 20, 260, '单独的外力估计器（UniFP、FACET）', C_BORDER, { size: 12, h: 34, dash: '4 3' });
    var x4 = cross(p4, 262, Y + 30, 14, C_BAD);
    chip(p4, 330, Y + 20, 300, '一个策略，只用 PPO 一个目标', C_GOOD, { size: 12.5, h: 34 });
    label(p4, 24, Y + 90, '力的感知是隐式学到的：部署时策略自己估计扰动，再按指令的柔顺度去抵抗', 'demo-x-ink2', 12);
    /* 第 5 段：规模 */
    var p5 = group(s);
    label(p5, 24, Y + 18, '训练规模（第 V-A 节）', 'demo-x-ink', 13);
    var grid5 = cellGrid(p5, 24, Y + 32, TRAIN.gpus, 16, 14, 4, C_GOOD);
    label(p5, 24, Y + 128, '64 张 L40S', 'demo-x-ink2', 12);
    var n5a = label(p5, 360, Y + 52, '', 'demo-x-ink', 14), n5b = label(p5, 360, Y + 82, '', 'demo-x-ink', 14);
    label(p5, 360, Y + 108, '每张 4096 个环境，训 4 天', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var blink = 0.55 + 0.45 * Math.sin(now * 4);
      setOpacity(bxIn, t >= 0.4 && t < 7.0 ? blink : 0);
      setOpacity(bxAct, t >= 0.4 && t < 3.6 ? blink : 0);
      setOpacity(bxCri, t >= 7.0 && t < 10.4 ? blink : 0);
      setOpacity(bxF, t >= 7.0 && t < 10.4 ? blink : 0);
      fl1.forEach(function (f, i) { f.at(now, [248, Y + 21 + i * 40], [356, Y + 85]); });
      fo1.at(now, [484, Y + 85], [596, Y + 85]);
      /* 纸带：每 0.6 s 往左挪一格 */
      var st = now / 0.6, k0 = Math.floor(st), fr = st - k0;
      cells2.forEach(function (c, i) {
        var idx = k0 + i, x = 24 + (i - fr) * 60;
        c.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + (Y + 50) + ')');
        c.a.textContent = '第 ' + (idx % 100) + ' 步';
        c.b.textContent = 's, a';
        setOpacity(c.g, clamp(Math.min(i - fr + 0.5, 11.5 - (i - fr)), 0, 1));
      });
      fA.at(now, [228, Y + 65], [296, Y + 36]);
      fB.at(now, [228, Y + 65], [296, Y + 110]);
      fC.at(now, [228, Y + 125], [296, Y + 120]);
      setOpacity(x4, seg(since(t, clock, 10.4), 0.4, 0.8));
      var u5 = seg(since(t, clock, 13.4), 0.2, 1.6);
      grid5.fill(Math.round(TRAIN.gpus * u5));
      n5a.textContent = countTo(TRAIN.gpus * TRAIN.envs, u5) + ' 个并行环境';
      n5b.textContent = countTo(TRAIN.gpus * TRAIN.days * 24, u5) + ' GPU 小时';
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 奖励：照抄原参考（表 III） ── */
  function buildSceneReward() {
    var s = sceneSvg('左边是表 III 的 12 项奖励，条的长短是权重（惩罚是红色，关节超限的 −10 画不下、截断了）；讲到哪一组就亮哪一组。' +
      '右边依次出现：误差和得分的指数曲线（误差 0.1 米时约 0.89）；跟踪 7 项合计 6.5；全局策略再加 2 项；3 项惩罚；最后是「和柔顺有关的奖励：0 项」');
    s.appendChild(svgText(24, 26, '奖励：全按原参考算，没有一项和柔顺有关（表 III）', 'demo-x-ink2', 13.5));
    var rows = REWARDS.map(function (r, i) {
      var y = 48 + i * 26, col = r[3] === 'p' ? C_BAD : r[3] === 'g' ? C_PURPLE : C_ACCENT;
      var g = group(s);
      label(g, 24, y + 13, r[0], 'demo-x-ink2', 11.5);
      label(g, 158, y + 13, r[1], 'demo-x-mut', 11);
      var w = Math.min(Math.abs(r[2]), 2.2) * 80;
      var b = hbar(g, 230, y + 2, 14, col);
      setW(b, w);
      label(g, 230 + w + 6, y + 13, (r[2] < 0 ? '−' : '') + Math.abs(r[2]) + (Math.abs(r[2]) > 2.2 ? '（截断）' : ''), 'demo-x-ink', 11.5);
      return { g: g, grp: r[3] };
    });
    legendRow(s, 24, 376, [['跟踪', C_ACCENT, 26], ['只有全局策略', C_PURPLE, 80], ['惩罚', C_BAD, 26]], 11);
    readHint(s, 24, 400, '条越长权重越大；σ 越大，这一项对误差越宽容', 11);
    var R = 470;
    var p1 = group(s);
    label(p1, R, 62, '形式：误差越小越接近 1', 'demo-x-ink', 14);
    math(p1, R, 100, 'r = \\exp\\!\\big(-\\lVert e\\rVert^2/\\sigma^2\\big)', 18);
    var pb = plotBox(p1, R + 30, 122, 260, 120, 0, 0.6, 0, 1);
    var cv = [];
    for (var e = 0; e <= 0.6; e += 0.01) cv.push([pb.px(e), pb.py(Math.exp(-e * e / 0.09))]);
    pathLine(pb.g, cv, C_ACCENT, 2.4);
    dotAt(pb.g, pb.px(0.1), pb.py(Math.exp(-0.01 / 0.09)), 5, C_WARN);
    halo(label(p1, pb.px(0.1) + 8, pb.py(Math.exp(-0.01 / 0.09)) + 4, '0.1 m → ' + f3(Math.exp(-0.01 / 0.09)), 'demo-x-ink', 11.5));
    label(p1, R + 30, 258, '0', 'demo-x-mut', 11, 'middle');
    label(p1, R + 290, 258, '0.6 m', 'demo-x-mut', 11, 'middle');
    readHint(p1, R, 280, '横轴是位置误差、纵轴是得分（σ = 0.3 m）', 11);
    var p2 = group(s);
    label(p2, R, 62, '跟踪 7 项：权重合计 6.5', 'demo-x-ink', 14);
    label(p2, R, 88, '根部朝向 0.5，其余 6 项各 1', 'demo-x-ink2', 12);
    label(p2, R, 112, '连杆的位置、朝向、线速度、角速度', 'demo-x-ink2', 12);
    label(p2, R, 136, '三个点（头、两手腕）的位置、朝向', 'demo-x-ink2', 12);
    label(p2, R, 168, '参照 SONIC 和 BeyondMimic', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 62, '全局策略再加 2 项：合计 7.5', 'demo-x-ink', 14);
    label(p3, R, 88, '世界坐标系里三个点的位置、朝向，各 0.5', 'demo-x-ink2', 12);
    var p4 = group(s);
    label(p4, R, 62, '3 项惩罚', 'demo-x-ink', 14);
    label(p4, R, 88, '动作变化太快 −0.1', 'demo-x-ink2', 12);
    label(p4, R, 112, '关节超出限位（按个数）−10', 'demo-x-ink2', 12);
    label(p4, R, 136, '脚踝、手腕以外的接触（> 1 N）−0.1', 'demo-x-ink2', 12);
    var p5 = group(s);
    label(p5, R, 62, '和柔顺、外力有关的奖励', 'demo-x-ink', 14);
    var zero = tone(p5, R + 80, 150, '0 项', C_GOOD, 40, 'middle');
    label(p5, R, 200, '柔顺全靠观测里的 g − f/k', 'demo-x-ink2', 12.5);
    label(p5, R, 224, '这就是「不用额外调奖励」的意思', 'demo-x-ink2', 12.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      rows.forEach(function (r) {
        var on = t < 3.6 || (t < 7.0 && r.grp === 't') || (t >= 7.0 && t < 10.4 && r.grp === 'g') || (t >= 10.4 && t < 13.4 && r.grp === 'p');
        setOpacity(r.g, t >= 13.4 ? 0.35 : on ? 1 : 0.3);
      });
      zero.style.opacity = 0.6 + 0.4 * Math.sin(now * 3);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: 阻尼：让目标跟着手走 ── */
  var FOLLOW_PARTS = [[9.5, '硬 + 全局跟踪：推不动'], [8.0, '软 + 全局跟踪：推得动，松手回来'], [13.0, '软 + 阻尼跟随：人牵着就走']];
  function buildSceneDamper() {
    var s = sceneSvg('左边是项目页的三段视频，讲到哪种模式就放哪一段：硬加全局跟踪、软加全局跟踪、软加阻尼跟随。右边上方是一维的示意：黄圈是目标、白点是手、蓝箭头是人拉的力，' +
      '按当前的模式走：只有弹簧时松手就弹回，加了阻尼后目标跟着手走。下面依次出现：只有弹簧、阻尼的式子、三种模式和一个算例');
    s.appendChild(svgText(24, 26, '阻尼：让目标跟着手走（人机交互的三种模式）', 'demo-x-ink2', 13.5));
    var clip = partClip(s, 'follow', 24, 44, 380, 214, FOLLOW_PARTS, '项目页视频（1x）：同一个人推、拉 G1 的手');
    var R = 424, TY = 110;
    rectBox(s, R, 44, 352, 104, C_BORDER, C_SURFACE2);
    var modeT = label(s, R + 10, 64, '', 'demo-x-ink', 12.5);
    hline(s, R + 20, TY + 14, R + 332, TY + 14, C_BORDER, 1.4);
    var g0 = ringAt(s, 0, TY, 10, C_OBS, 2.6), hand = dotAt(s, 0, TY, 8, C_INK), sp = spring(s, C_SOFT, 6, 6), pull = forceArrow(s, C_F);
    var gTrail = pathLine(s, [], C_OBS, 1.4, '3 3');
    var p1 = group(s);
    label(p1, R, 180, '只有弹簧：松手后手弹回目标', 'demo-x-ink', 13.5);
    label(p1, R, 204, '想让人牵着走，目标自己也得动', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 180, '仿照 FACET：每步把目标往手挪一点', 'demo-x-ink', 13.5);
    math(p2, R, 222, 'g_t = \\alpha\\, x_{\\mathrm{eef}} + (1-\\alpha)\\, g_{t-1}', 17);
    label(p2, R, 256, '论文没给 α', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 180, '① 硬 + 全局跟踪', 'demo-x-ink', 13.5);
    label(p3, R, 204, '1/k 小：顶住推力，一直贴着全局轨迹', 'demo-x-ink2', 12);
    var p4 = group(s);
    label(p4, R, 180, '② 软 + 全局跟踪', 'demo-x-ink', 13.5);
    label(p4, R, 204, '1/k 大：推得动，松手后回到轨迹', 'demo-x-ink2', 12);
    var p5 = group(s);
    label(p5, R, 180, '③ 软 + 阻尼跟随：「无限柔顺」', 'demo-x-ink', 13.5);
    label(p5, R, 204, '目标跟着手走，人牵着就走', 'demo-x-ink2', 12);
    rich(p5, R, 236, '例 5（假设 $\\alpha=0.1$、50 Hz）：5 N、$1/k=0.02$', 12);
    label(p5, R, 260, '→ 目标每步挪 1 cm，速度 0.5 m/s', 'demo-x-ink2', 12);
    /* 一维示意：4 s 一循环，0.4–2.4 s 人拉（梯形），之后松手；mode 0 硬、1 软 + 全局、2 软 + 阻尼。
       返回目标挪了多少（px）和手离目标多远（px）：阻尼时目标每步挪 α f/k（这里按 25 步/秒画） */
    function sim(mode, sec) {
      var u = sec % 4, F = trap((u - 0.4) / 2.0, 1), gx = 0;
      if (mode === 2) for (var i = 0; i <= Math.floor(u * 25); i++) gx += 3.2 * trap((i / 25 - 0.4) / 2.0, 1);
      return { F: F, g: gx, d: mode === 0 ? 0 : 70 * F };
    }
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var k = t < 3.6 ? 1 : t < 7.0 ? 2 : t < 10.4 ? 0 : t < 13.4 ? 1 : 2;
      var cue = [0.4, 3.6, 7.0, 10.4, 13.4][t < 3.6 ? 0 : t < 7.0 ? 1 : t < 10.4 ? 2 : t < 13.4 ? 3 : 4];
      clip.at(k, K.clipSince(t, cue), true);
      modeT.textContent = ['① 硬', '② 软 + 全局跟踪', '③ 软 + 阻尼跟随'][k];
      var r = sim(k, now), base = R + 50, gpx = base + r.g, xpx = gpx + r.d;
      moveDot(g0, [gpx, TY]);
      moveDot(hand, [xpx, TY]);
      sp.set(gpx + 10, TY, xpx - 8, TY);
      setOpacity(sp.node, k === 0 || r.d < 18 ? 0 : 1);
      pull.set([xpx + 10, TY], [1, 0], 60 * r.F, r.F > 0.05 ? '人拉' : '', [0, -10]);
      setPath(gTrail, k === 2 ? [[base, TY], [gpx, TY]] : []);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: 全局三点与定位 ── */
  function buildSceneGlobal() {
    var s = sceneSvg('左边是 G1 的模型：粉点是全局策略跟踪的三个点——头（带朝向，画出坐标系：红、绿、蓝分别是 x、y、z）和两只手腕（只有位置）；' +
      '脚下是世界坐标系。右边依次出现：目标的式子；俯视图里三点往前挪时分不清该走还是伸手，看未来 5 帧就分得清；三路定位的频率；两台机器人的点云配准到同一张地图；跑在台式机上');
    s.appendChild(svgText(24, 26, '全局三点：多台机器人要用同一个坐标系', 'demo-x-ink2', 13.5));
    var robot = g1Yield(s);
    var P = robot.put(G1X, G1Y, G1K, 0);
    var hAx = K.svgAxes({ len: 26, size: 11 }); s.appendChild(hAx.g);
    hAx.set([P.head[0], P.head[1] - 4], { toward: true, label: [-24, 4] }, [1, 0], [0, -1]);
    var wAx = K.svgAxes({ len: 30, size: 11 }); s.appendChild(wAx.g);
    var gy = G1Y + 455 * G1K;
    wAx.set([P.pel[0] + 70, gy], { toward: true, label: [-12, 4] }, [1, 0], [0, -1]);
    label(s, P.pel[0] + 70, gy + 27, '世界坐标系', 'demo-x-mut', 11, 'middle');
    var kps = [dotAt(s, P.head[0], P.head[1] + 12, 6, C_REF), dotAt(s, P.rw[0], P.rw[1], 6, C_REF), dotAt(s, P.lw[0], P.lw[1], 6, C_REF)];
    legendRow(s, 24, 366, [['跟踪的三个点', C_REF, 80]], 11);
    label(s, 24, 390, '坐标系：红、绿、蓝 = x、y、z；朝着我们的 x 画成 ⊙', 'demo-x-mut', 11);
    var R = 424;
    var p1 = group(s);
    label(p1, R, 62, '全局策略跟踪的目标（世界坐标系）', 'demo-x-ink', 14);
    math(p1, R, 106, 'g=\\{p_{\\mathrm{head}},\\, r_{\\mathrm{head}},\\, p_{\\mathrm{lwrist}},\\, p_{\\mathrm{rwrist}}\\}', 16);
    label(p1, R, 140, '头：位置 + 朝向（6D）；手腕：只要位置（3D）', 'demo-x-ink2', 12);
    label(p1, R, 164, '奖励多两项：三个点在世界坐标系里的误差', 'demo-x-ink2', 12);
    /* 第 2 段：歧义与未来 5 帧（俯视） */
    var p2 = group(s);
    label(p2, R, 62, '三个点往前挪：该走过去，还是伸手？', 'demo-x-ink', 13.5);
    rectBox(p2, R, 76, 168, 150, C_BORDER, C_SURFACE2);
    rectBox(p2, R + 184, 76, 168, 150, C_BORDER, C_SURFACE2);
    label(p2, R + 84, 96, '只看当前一帧', 'demo-x-ink2', 12, 'middle');
    label(p2, R + 268, 96, '看未来 0.2 s（5 帧）', 'demo-x-ink2', 12, 'middle');
    var bA = ringAt(p2, R + 84, 190, 14, C_INK, 2), bB = ringAt(p2, R + 268, 190, 14, C_INK, 2);
    var tA = [dotAt(p2, 0, 0, 4.5, C_REF), dotAt(p2, 0, 0, 4.5, C_REF)], qA = tone(p2, R + 84, 216, '?', C_WARN, 14, 'middle');
    var fut = [];
    for (var i = 0; i < 5; i++) fut.push(dotAt(p2, 0, 0, 3.5, C_REF));
    label(p2, R, 248, '论文：5 帧、每步隔 4 帧，就能消掉这种歧义', 'demo-x-ink2', 11.5);
    /* 第 3 段：定位频率（固定画 0.2 s） */
    var p3 = group(s);
    label(p3, R, 62, '定位（照 BeyondMimic）：三路融合成 50 Hz', 'demo-x-ink', 13.5);
    var rowsY = [100, 136, 172, 216];
    LOC.concat([['融合后', 50]]).forEach(function (r, j) {
      var y = rowsY[j];
      label(p3, R, y + 4, r[0], 'demo-x-ink2', 11.5);
      label(p3, R + 352, y + 4, r[1] + ' Hz', 'demo-x-ink', 11.5, 'end');
      var n = Math.round(0.2 * r[1]) + 1;
      for (var q = 0; q < n; q++) hline(p3, R + 100 + q * (200 / (n - 1)), y - 8, R + 100 + q * (200 / (n - 1)), y + 8, j === 3 ? C_WARN : C_INK, 2);
    });
    var cur3 = hline(p3, 0, 88, 0, 228, C_PURPLE, 1.4);
    label(p3, R, 252, '竖线是 0.2 s 里的每一次更新', 'demo-x-mut', 11);
    /* 第 4 段：点云地图配准 */
    var p4 = group(s);
    label(p4, R, 62, '两台机器人对齐到同一张点云地图', 'demo-x-ink', 13.5);
    var mapPts = [];
    for (var m = 0; m < 70; m++) {
      var side = m % 4, u = rnd(m, 31);
      var px = side === 0 ? u : side === 1 ? 1 : side === 2 ? u : 0, py = side === 0 ? 0 : side === 1 ? u : side === 2 ? 1 : u;
      mapPts.push([R + 40 + px * 270 + (rnd(m, 33) - 0.5) * 6, 84 + py * 150 + (rnd(m, 35) - 0.5) * 6]);
      dotAt(p4, mapPts[m][0], mapPts[m][1], 2.2, C_MUTED);
    }
    var cloudA = [], cloudB = [];
    for (var c = 0; c < 18; c++) { cloudA.push(dotAt(p4, 0, 0, 2.6, C_PURPLE)); cloudB.push(dotAt(p4, 0, 0, 2.6, C_WARN)); }
    label(p4, R, 262, '先用 Fast-LIO2 建图，开机时各自把实时点云配准上去', 'demo-x-ink2', 11.5);
    var p5 = group(s);
    label(p5, R, 62, '算在哪', 'demo-x-ink', 14);
    chip(p5, R, 80, 340, '全局策略 + 状态估计：i7-13700K + RTX 3090 台式机', C_ACCENT, { size: 12, h: 32 });
    chip(p5, R, 124, 340, '局部策略（第 13 幕）：G1 上的 Jetson NX', C_BORDER, { size: 12, h: 32 });
    label(p5, R, 184, '多机协作要高频、不靠外部设施的定位', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      kps.forEach(function (d) { d.setAttribute('r', (5.5 + 1.2 * Math.sin(now * 3)).toFixed(2)); });
      /* 俯视：目标往上（前）挪 */
      var u2 = (now % 3) / 3, adv = 40 * u2;
      moveDot(tA[0], [R + 84 - 12, 170 - adv]); moveDot(tA[1], [R + 84 + 12, 170 - adv]);
      qA.style.opacity = 0.4 + 0.6 * Math.abs(Math.sin(now * 3));
      var by = 190 - 40 * u2;
      moveDot(bB, [R + 268, by]);
      moveDot(bA, [R + 84, 190]);
      fut.forEach(function (d, j) { moveDot(d, [R + 268, by - 22 - j * 10]); d.style.opacity = 1 - j * 0.15; });
      var x3 = R + 100 + ((now % 2) / 2) * 200;
      setLine(cur3, x3, 88, x3, 228);
      /* 两团点云从偏开的位置转回地图上（4 s 一循环） */
      var u4 = clamp(((now % 4) - 0.5) / 2.2, 0, 1), e4 = 1 - Math.pow(1 - u4, 3);
      cloudA.forEach(function (d, j) {
        var p = mapPts[j * 2], ang = (1 - e4) * 0.35;
        var dx = p[0] - (R + 175), dy = p[1] - 160;
        moveDot(d, [R + 175 + dx * Math.cos(ang) - dy * Math.sin(ang) - (1 - e4) * 40, 160 + dx * Math.sin(ang) + dy * Math.cos(ang) + (1 - e4) * 20]);
      });
      cloudB.forEach(function (d, j) {
        var p = mapPts[(j * 2 + 37) % mapPts.length], ang = -(1 - e4) * 0.3;
        var dx = p[0] - (R + 175), dy = p[1] - 160;
        moveDot(d, [R + 175 + dx * Math.cos(ang) - dy * Math.sin(ang) + (1 - e4) * 36, 160 + dx * Math.sin(ang) + dy * Math.cos(ang) - (1 - e4) * 18]);
      });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 11: 两台机器人一起抱（图 5） ── */
  var LIFT_PARTS = [[8, '两台 G1 抱起箱子（2x）'], [9, '两台 G1 抱起大球（2x）'], [14, '抱起来以后一起搬走（1.5x）']];
  function buildSceneLift() {
    var s = sceneSvg('左边是项目页的三段视频，讲到哪一步放哪一段：抱箱子、抱大球、一起搬走。右边依次出现：俯视图里两台机器人和抓取点；稳、不碰撞、柔顺三个要求；' +
      '侧视图里靠近、抓、抬三步，黄圈是压进物体里一点的手腕目标；键盘平移两台的目标；抓的时候柔顺度设成 0.04');
    s.appendChild(svgText(24, 26, '两台 G1 一起抱起大东西（图 5）', 'demo-x-ink2', 13.5));
    var clip = partClip(s, 'lift', 24, 44, 380, 214, LIFT_PARTS, '项目页视频：全局三点策略，抓取点由 SpringGrasp 规划');
    var R = 424;
    /* 第 1 段：俯视的抓取 */
    var p1 = group(s);
    label(p1, R, 62, '抓取点：把 SpringGrasp 扩展到两台人形', 'demo-x-ink', 13.5);
    var ox = R + 176, oy = 150;
    var box1 = paint(svgEl('rect', { x: ox - 50, y: oy - 34, width: 100, height: 68, rx: 4 }), C_WARN);
    box1.style.opacity = 0.75; p1.appendChild(box1);
    [[-1, 0], [1, 0]].forEach(function (d, i) {
      var cx = ox + d[0] * 112;
      ringAt(p1, cx, oy, 18, C_INK, 2);
      label(p1, cx, oy + 40, '机器人 ' + (i + 1), 'demo-x-ink2', 11.5, 'middle');
    });
    var gp = [[ox - 50, oy - 20], [ox - 50, oy + 20], [ox + 50, oy - 20], [ox + 50, oy + 20]].map(function (p) { return dotAt(p1, p[0], p[1], 5.5, C_REF); });
    label(p1, R, 236, '解一个优化：两台各自的头位姿（6D）和两只手腕的位置（3D）', 'demo-x-ink2', 11.5);
    /* 第 2 段：三个要求 */
    var p2 = group(s);
    label(p2, R, 62, '抓取要满足', 'demo-x-ink', 14);
    var reqs = ['稳定', '不碰撞', '柔顺'].map(function (w, i) {
      var g = group(p2);
      chip(g, R + i * 118, 82, 108, w, C_GOOD, { size: 13, h: 34 });
      tick(g, R + i * 118 + 82, 92, 13);
      return g;
    });
    label(p2, R, 152, '再在当前位姿和目标位姿之间规划一条最小曲率的轨迹', 'demo-x-ink2', 12);
    label(p2, R, 176, '手腕目标沿着它走', 'demo-x-ink2', 12);
    /* 第 3 段：靠近 → 抓 → 抬（侧视） */
    var p3 = group(s);
    label(p3, R, 62, '三步：靠近 → 抓 → 抬', 'demo-x-ink', 14);
    var phs = ['靠近', '抓', '抬'].map(function (w, i) { return chip(p3, R + i * 118, 76, 108, w, C_BORDER, { size: 12.5, h: 28 }); });
    var floorY = 236;
    hline(p3, R + 20, floorY, R + 332, floorY, C_BORDER, 2);
    var obj = paint(svgEl('rect', { x: ox - 46, y: 0, width: 92, height: 60, rx: 4 }), C_WARN);
    obj.style.opacity = 0.75; p3.appendChild(obj);
    var hL3 = dotAt(p3, 0, 0, 7, C_INK), hR3 = dotAt(p3, 0, 0, 7, C_INK), tL3 = ringAt(p3, 0, 0, 7, C_OBS, 2.2), tR3 = ringAt(p3, 0, 0, 7, C_OBS, 2.2);
    var sqL = forceArrow(p3, C_F), sqR = forceArrow(p3, C_F);
    label(p3, R, 262, '抓：手腕目标稍微压进物体里，压进去越多夹得越紧（我们的理解）', 'demo-x-ink2', 11);
    /* 第 4 段：键盘 */
    var p4 = group(s);
    label(p4, R, 62, '抬起来以后：键盘同时平移两台的目标', 'demo-x-ink', 13.5);
    var keys = [[0, -1, '↑'], [-1, 0, '←'], [0, 0, '↓'], [1, 0, '→']].map(function (k) {
      var x = R + 60 + k[0] * 40, y = 150 + k[1] * 40;
      var b = rectBox(p4, x - 17, y - 17, 34, 34, C_BORDER, C_SURFACE2);
      label(p4, x, y + 6, k[2], 'demo-x-ink', 14, 'middle');
      return b;
    });
    var mv = group(p4);
    var mObj = paint(svgEl('rect', { x: -30, y: -20, width: 60, height: 40, rx: 4 }), C_WARN);
    mObj.style.opacity = 0.75; mv.appendChild(mObj);
    ringAt(mv, -50, 0, 12, C_INK, 2); ringAt(mv, 50, 0, 12, C_INK, 2);
    var p5 = group(s);
    label(p5, R, 62, '抓的时候柔顺度设成 1/k = 0.04', 'demo-x-ink', 14);
    var ks = kSlider(p5, R, 104, 340, 0.05);
    label(p5, R, 170, '在抬起的力和交互的安全之间取平衡（第 V-C 节）', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var k = t < 7.0 ? 0 : t < 10.4 ? 1 : 2, cue = t < 7.0 ? 0.4 : t < 10.4 ? 7.0 : 10.4;
      clip.at(k, K.clipSince(t, cue), true);
      gp.forEach(function (d, i) { d.setAttribute('r', (5 + 1.2 * Math.sin(now * 3 + i)).toFixed(2)); });
      reqs.forEach(function (g, i) { setOpacity(g, seg(since(t, clock, 3.6), 0.3 + i * 0.4, 0.6 + i * 0.4)); });
      /* 侧视三步：6 s 一循环 */
      var u = (now % 6) / 6, ph = u < 0.35 ? 0 : u < 0.6 ? 1 : 2;
      phs.forEach(function (c, i) { setOpacity(c, i === ph ? 1 : 0.35); });
      var lift = ph === 2 ? Math.min(1, (u - 0.6) / 0.3) * 40 : 0, oyT = floorY - 60 - lift;
      obj.setAttribute('y', oyT.toFixed(1));
      var appr = ph === 0 ? u / 0.35 : 1, hx = 120 - 66 * appr;
      var tIn = ph >= 1 ? 8 : 0, hy = oyT + 30;
      moveDot(tL3, [ox - hx + tIn, hy]); moveDot(tR3, [ox + hx - tIn, hy]);
      moveDot(hL3, [ox - Math.max(hx, 54), hy]); moveDot(hR3, [ox + Math.max(hx, 54), hy]);
      sqL.set([ox - 74, hy], [1, 0], ph >= 1 ? 18 : 0, '');
      sqR.set([ox + 74, hy], [-1, 0], ph >= 1 ? 18 : 0, '');
      /* 键盘：每 1.5 s 换一个方向 */
      var kk = Math.floor(now / 1.5) % 4, dirs = [[0, -1], [-1, 0], [0, 1], [1, 0]], pr = (now % 1.5) / 1.5;
      keys.forEach(function (b, i) { b.style.stroke = i === kk ? C_GOOD : ''; });
      var off = [0, 0], cum = [[0, 0], [0, -1], [-1, -1], [-1, 0]][kk];
      off = [(cum[0] + dirs[kk][0] * pr) * 26, (cum[1] + dirs[kk][1] * pr) * 26];
      mv.setAttribute('transform', 'translate(' + (R + 250 + off[0]).toFixed(1) + ' ' + (160 + off[1]).toFixed(1) + ')');
      ks.set(GRASP_K * seg(since(t, clock, 13.4), 0.2, 1.4));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 表 II：抓得住吗 ── */
  var FAIL_PARTS = [[7.5, 'FALCON（一直很硬）抱箱子：被挤飞（2x）'], [9.0, '不加外力训的抱球：抓不稳（2x）']];
  function buildSceneTable2() {
    var s = sceneSvg('左边是项目页里两个基线的失败视频：一直很硬的 FALCON 抱箱子、不加外力训的策略抱球。右边上方是表 II 的柱状图：四种物体加平均，每组三根柱，' +
      '绿色 CHIP、蓝色 FALCON、灰色不加外力训，柱越高成功率越高。下面依次出现：测法；平均 0.8、0.05、0.4；两只硬手对顶把箱子挤飞；不加外力训的偶尔能抓住；CHIP 的失败是膝盖先撞上');
    s.appendChild(svgText(24, 26, '表 II：两台机器人一起抓，抓得住吗？', 'demo-x-ink2', 13.5));
    var clip = partClip(s, 'fail', 24, 44, 380, 214, FAIL_PARTS, '项目页视频：两个基线的失败');
    var R = 424, base = 196, top = 60, gw = 70;
    var groups = TABLE2.concat([{ zh: '平均', v: [0.8, 0.05, 0.4] }]);
    var bars = [];
    groups.forEach(function (gr, i) {
      var x0 = R + 6 + i * gw;
      gr.v.forEach(function (v, j) {
        bars.push({ b: colBar(s, x0 + j * 20, 16, base, [C_GOOD, C_ACCENT, C_MUTED][j]), v: v, i: i });
      });
      label(s, x0 + 28, base + 16, gr.zh, i === 4 ? 'demo-x-ink' : 'demo-x-ink2', 11, 'middle');
    });
    hline(s, R, base, R + 352, base, C_BORDER, 1.4);
    legendRow(s, R, 236, [['CHIP', C_GOOD, 30], ['FALCON', C_ACCENT, 48], ['不加外力训', C_MUTED, 66]], 11);
    readHint(s, R, 258, '每组三根柱，柱越高成功率越高；每格 5 次', 11);
    var Y = 290;
    var p1 = group(s);
    label(p1, R, Y, '两种高度的箱子和球，各 5 次，抬起来才算', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, Y, 'CHIP 0.8、FALCON 0.05、不加外力训 0.4', 'demo-x-ink', 13);
    label(p2, R, Y + 24, '比一直很硬的高 75 个百分点，比没训过外力的高 40 个', 'demo-x-ink2', 11.5);
    var p3 = group(s);
    label(p3, R, Y, 'FALCON 为什么最差：两边都硬着往里推', 'demo-x-ink', 13);
    var bx3 = paint(svgEl('rect', { x: R + 150, y: Y + 14, width: 56, height: 36, rx: 3 }), C_WARN);
    bx3.style.opacity = 0.8; p3.appendChild(bx3);
    var a3L = forceArrow(p3, C_F), a3R = forceArrow(p3, C_F);
    var p4 = group(s);
    label(p4, R, Y, '没训过外力的：本身有点软，偶尔能抓住', 'demo-x-ink', 13);
    label(p4, R, Y + 24, '（v1 的原话，v2 删掉了这一句）', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, Y, 'CHIP 的失败：膝盖在抓之前先撞上了物体', 'demo-x-ink', 13);
    label(p5, R, Y + 24, '论文说这没能充分展示控制器的能力', 'demo-x-ink2', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var k = t < 10.4 ? 0 : 1, cue = t < 7.0 ? 0.4 : t < 10.4 ? 7.0 : 10.4;
      clip.at(k, K.clipSince(t, cue), true);
      var u = seg(since(t, clock, 0.4), 0.3, 1.8);
      bars.forEach(function (b) {
        var h = b.v * (base - top) * u;
        b.b.set(h, u > 0.05 && b.i === 4 ? String(b.v) : '');
        setOpacity(b.b.b.node, t >= 3.6 && t < 7.0 && b.i !== 4 ? 0.35 : 1);
      });
      /* 两只硬手对顶：箱子被挤得往上蹦（2 s 一循环） */
      var q = (now % 2) / 2, pop = q > 0.5 ? Math.sin((q - 0.5) / 0.5 * Math.PI) * 18 : 0;
      bx3.setAttribute('y', (Y + 14 - pop).toFixed(1));
      bx3.setAttribute('transform', 'rotate(' + (pop * 0.8).toFixed(1) + ' ' + (R + 178) + ' ' + (Y + 32) + ')');
      a3L.set([R + 92, Y + 32], [1, 0], 52, '硬', [-30, 4]);
      a3R.set([R + 264, Y + 32], [-1, 0], 52, '硬', [30, 4]);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 13: 局部三点与遥操作（图 4） ── */
  var PHONE_PARTS = [[5.5, '软：拉推车（1.5x）'], [10.0, '硬：推开弹簧门（1.5x）'], [12.0, '软：抱箱子（1.5x）']];
  function buildSceneLocal() {
    var s = sceneSvg('左边是项目页的视频「送快递进电话间」，讲到哪一步放哪一段：软着拉推车、硬着推开弹簧门、软着抱箱子。右上是论文图 4 的遥操作接口。' +
      '下面依次出现：局部策略跟踪的目标；摇杆经运动学规划器给出下半身参考；VR 给三个点；两只手的柔顺度各自调；任务时间轴上软硬交替');
    s.appendChild(svgText(24, 26, '局部三点：接 VR 遥操作（图 4）', 'demo-x-ink2', 13.5));
    var clip = partClip(s, 'phone', 24, 44, 380, 214, PHONE_PARTS, '项目页视频：送快递进电话间，同一个控制器、按需切换软硬');
    var fig = paperPart(s, 'fig4', 0, 0, 1, 1, 424, 44, 352, '论文图 4：VR 给三点和 k，摇杆给根部速度和高度');
    var R = 424, Y = 44 + fig.h + 46;
    var p1 = group(s);
    label(p1, R, Y, '局部策略：三个点都相对根部', 'demo-x-ink', 13.5);
    label(p1, R, Y + 24, '头、两手腕的 SE(3) 位姿 + 下半身的关节角和速度', 'demo-x-ink2', 12);
    label(p1, R, Y + 48, '只给三个点会漂；下半身另给参考，上下身在命令层面解耦', 'demo-x-ink2', 11.5);
    var p2 = group(s);
    label(p2, R, Y, '下半身：运动学规划器（照 SONIC）', 'demo-x-ink', 13.5);
    chip(p2, R, Y + 14, 104, '摇杆 $v,\\omega,z$', C_ACCENT, { size: 11.5, h: 28 });
    chip(p2, R + 124, Y + 14, 104, '运动学规划器', C_ACCENT, { size: 11.5, h: 28 });
    chip(p2, R + 248, Y + 14, 104, '$q_{\\mathrm{lower}},\\dot q_{\\mathrm{lower}}$', C_GOOD, { size: 11.5, h: 28 });
    var f2a = flowSeg(p2, C_ACCENT, 2, 3, 50), f2b = flowSeg(p2, C_GOOD, 2, 3, 50);
    label(p2, R, Y + 68, '根部速度、转向和高度 → 下半身的关节参考', 'demo-x-ink2', 11.5);
    var p3 = group(s);
    label(p3, R, Y, '上半身：VR 直接给三个点', 'demo-x-ink', 13.5);
    label(p3, R, Y + 24, '头显给头的位姿，两个手柄给两只手腕的位姿', 'demo-x-ink2', 12);
    label(p3, R, Y + 48, '策略、规划器、遥操作服务都跑在 G1 的 Jetson NX 上', 'demo-x-ink2', 11.5);
    var p4 = group(s);
    label(p4, R, Y, '每只手的柔顺度：操作员在 VR 里调', 'demo-x-ink', 13.5);
    var kl = kSlider(p4, R + 40, Y + 26, 300, 0.05, ''), kr = kSlider(p4, R + 40, Y + 84, 300, 0.05, '');
    label(p4, R, Y + 34, '左手', 'demo-x-ink2', 11.5);
    label(p4, R, Y + 92, '右手', 'demo-x-ink2', 11.5);
    var p5 = group(s);
    label(p5, R, Y, '一路按需切换', 'demo-x-ink', 13.5);
    var segs = [['拉推车：软', C_SOFT, 5.5], ['开门：硬', C_STIFF, 10.0], ['抱箱子：软', C_SOFT, 12.0]];
    var tot = 27.5, xx = R, segR = [];
    segs.forEach(function (g, i) {
      var w = g[2] / tot * 352;
      segR.push(chip(p5, xx, Y + 14, w - 4, g[0], g[1], { size: 11.5, h: 28 }));
      xx += w;
    });
    var cur5 = paint(svgEl('path', { d: 'M 0 0' }), C_WARN);
    p5.appendChild(cur5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var k = t < 7.0 ? 0 : t < 10.4 ? 1 : 2, cue = t < 7.0 ? 0.4 : t < 10.4 ? 7.0 : 10.4;
      if (t >= 13.4) {
        var sec = K.clipSince(t, 13.4) % tot, kk = sec < 5.5 ? 0 : sec < 15.5 ? 1 : 2;
        clip.at(kk, sec - [0, 5.5, 15.5][kk], true);
        var cx = R + sec / tot * 352;
        cur5.setAttribute('d', 'M ' + (cx - 6).toFixed(1) + ' ' + (Y + 50) + ' L ' + (cx + 6).toFixed(1) + ' ' + (Y + 50) + ' L ' + cx.toFixed(1) + ' ' + (Y + 44) + ' Z');
        segR.forEach(function (g, i) { setOpacity(g, i === kk ? 1 : 0.4); });
      } else clip.at(k, K.clipSince(t, cue), true);
      f2a.at(now, [R + 106, Y + 28], [R + 122, Y + 28]);
      f2b.at(now, [R + 230, Y + 28], [R + 246, Y + 28]);
      kl.set(0.05 * (0.5 + 0.5 * Math.sin(now * 0.9)), '');
      kr.set(0.05 * (0.5 + 0.5 * Math.sin(now * 1.4 + 2)), '');
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 14: 表 I：柔顺不伤跟踪 ── */
  function buildSceneTable1() {
    var s = sceneSvg('四张小柱状图：全局位置误差、全局朝向误差、局部位置误差、局部朝向误差；每张七根柱：CHIP 三个柔顺度（绿，深浅不同）、GentleHumanoid 硬和软（黄，只有局部）、' +
      'FALCON（蓝）、不加外力训（灰）；柱越矮误差越小越好。讲到哪一组就亮哪一组');
    s.appendChild(svgText(24, 26, '表 I：柔顺度怎么调，跟踪精度都不掉', 'demo-x-ink2', 13.5));
    var COLS = [C_GOOD, C_GOOD, C_GOOD, C_WARN, C_WARN, C_ACCENT, C_MUTED], OPA = [1, 0.75, 0.5, 1, 0.6, 1, 1];
    var charts = [];
    var cw = 368, chh = 108, pos = [[24, 64], [408, 64], [24, 214], [408, 214]];
    var ymax = [0.12, 0.12, 0.06, 0.18];
    T1_METRICS.forEach(function (m, q) {
      var x0 = pos[q][0], y0 = pos[q][1], g = group(s), bars = [];
      label(g, x0, y0 - 6, m, 'demo-x-ink', 12.5);
      var base = y0 + chh;
      hline(g, x0, base, x0 + cw, base, C_BORDER, 1.4);
      TABLE1.forEach(function (row, j) {
        var bx = x0 + 8 + j * 51, v = row.v[q];
        var b = colBar(g, bx, 34, base, COLS[j]);
        b.b.node.style.opacity = OPA[j];
        if (v == null) label(g, bx + 17, base - 6, '—', 'demo-x-mut', 12, 'middle');
        bars.push({ b: b, v: v, j: j });
      });
      charts.push({ g: g, bars: bars, base: base, max: ymax[q] });
    });
    legendRow(s, 24, 352, [['CHIP 1/k = 0 / 0.02 / 0.05', C_GOOD, 150], ['GentleHumanoid 硬 / 软', C_WARN, 132], ['FALCON', C_ACCENT, 46], ['不加外力训', C_MUTED, 64]], 11);
    readHint(s, 24, 376, '每张图七根柱，顺序同图例；柱越矮误差越小，越好', 11);
    var foot = label(s, 24, 404, '', 'demo-x-ink2', 12);
    var notes = ['MuJoCo 里不加外力，从 TWIST 数据集抽 100 段动作，量跟踪误差',
      '全局位置：CHIP 三个柔顺度都是 0.08 m，FALCON 0.09，不加外力训 0.11',
      '局部位置都是 0.02 m；朝向 CHIP 0.09–0.11 rad，比 0.08 略差',
      'GentleHumanoid 只有局部：位置 0.04、0.05 m，朝向 0.15、0.16 rad',
      '换 1/k 精度几乎不变：策略分得清自己的驱动力和外来的力'];
    function draw(t, clock) {
      var u = seg(since(t, clock, 0.4), 0.2, 1.8);
      var hi = t < 3.6 ? null : t < 7.0 ? [0] : t < 10.4 ? [2, 3] : t < 13.4 ? [2, 3] : null;
      charts.forEach(function (c, q) {
        c.bars.forEach(function (b) {
          if (b.v == null) { b.b.set(0, ''); return; }
          b.b.set(b.v / c.max * (chh - 18) * u, u > 0.05 ? f2(b.v) : '');
          var on = !hi || hi.indexOf(q) >= 0;
          if (t >= 10.4 && t < 13.4) on = on && (b.j === 3 || b.j === 4 || b.j < 3);
          setOpacity(b.b.b.node, on ? OPA[b.j] : 0.2);
          setOpacity(b.b.v, on ? 1 : 0.25);
        });
      });
      var idx = t < 3.6 ? 0 : t < 7.0 ? 1 : t < 10.4 ? 2 : t < 13.4 ? 3 : 4;
      foot.textContent = notes[idx];
    }
    return { el: s, draw: draw };
  }

  /* ── scene 15: 两只手，两种刚度（图 7a） ── */
  var WRITE_PARTS = [[7, '拔笔帽：两手混合拔不开，两手都硬才拔开（1.5x）'], [7, '写字：左手硬拿板、右手软着写（1.5x）'], [7, '擦白板：软着擦（1.5x）']];
  function buildSceneHybrid() {
    var s = sceneSvg('左边是项目页的视频「写字和擦白板」，讲到哪一步放哪一段。右边上方是左右手两条时间轴：蓝色是硬、粉紫是软，竖线跟着走。' +
      '下面依次出现：要软的和要硬的任务；一只手 0.001、一只手 0.05；长任务里随时切换；拔笔帽要两手都硬；论文图 7a 的读法');
    s.appendChild(svgText(24, 26, '同一个控制器：两只手、两种刚度，随时切换（图 7a）', 'demo-x-ink2', 13.5));
    var clip = partClip(s, 'write', 24, 44, 380, 214, WRITE_PARTS, '项目页视频：写字和擦白板（遥操作）');
    var R = 424;
    /* 上方：左右手两条时间轴 */
    var TL = [['拔笔帽', 0.0, 0.0, 3], ['写字', 0.001, 0.05, 4], ['擦白板', null, 0.05, 3]];
    var tw = 352, sum = 10, xx = R;
    label(s, R, 56, '左手', 'demo-x-ink2', 11.5);
    label(s, R, 96, '右手', 'demo-x-ink2', 11.5);
    TL.forEach(function (g) {
      var w = g[3] / sum * (tw - 40);
      [[g[1], 62], [g[2], 102]].forEach(function (h) {
        if (h[0] == null) { rectBox(s, xx + 40, h[1], w - 4, 22, C_BORDER, 'none', '3 3'); return; }
        var c = h[0] >= 0.02 ? C_SOFT : C_STIFF;
        var r = rectBox(s, xx + 40, h[1], w - 4, 22, c, C_SURFACE2);
        void r;
        label(s, xx + 40 + (w - 4) / 2, h[1] + 15, h[0] >= 0.02 ? '软 ' + f2(h[0]) : '硬 ' + (h[0] ? f3(h[0]) : '0'), 'demo-x-ink', 11, 'middle');
      });
      label(s, xx + 40 + (w - 4) / 2, 140, g[0], 'demo-x-ink2', 11.5, 'middle');
      xx += w;
    });
    var cur = paint(svgEl('path', { d: 'M 0 0' }), C_WARN);
    s.appendChild(cur);
    var Y = 178;
    var p1 = group(s);
    label(p1, R, Y, '要软的：抬箱子、搬箱子、擦表面', 'demo-x-ink', 13);
    label(p1, R, Y + 24, '要硬的：推弹簧门、推龙门架、翻重箱子', 'demo-x-ink', 13);
    var p2 = group(s);
    label(p2, R, Y, '两只手可以不一样', 'demo-x-ink', 13.5);
    label(p2, R, Y + 24, '左手 1/k = 0.001：硬着拿小白板', 'demo-x-ink2', 12);
    label(p2, R, Y + 48, '右手 1/k = 0.05：软着在上面写字', 'demo-x-ink2', 12);
    var p3 = group(s);
    label(p3, R, Y, '时间很长的任务里随时切', 'demo-x-ink', 13.5);
    label(p3, R, Y + 24, '先硬着拔开笔帽，再软着写字、擦白板', 'demo-x-ink2', 12);
    var p4 = group(s);
    label(p4, R, Y, '拔笔帽：两手都要硬', 'demo-x-ink', 13.5);
    label(p4, R, Y + 24, '项目页：一手硬一手软时力不够，拔不开', 'demo-x-ink2', 12);
    var p5 = group(s);
    label(p5, R, Y, '论文图 7a 的竖条：在线调柔顺度的命令', 'demo-x-ink', 13.5);
    [['调硬：1/k → 0', C_ACCENT], ['调软：1/k → 0.05', C_WARN], ['保持不变', C_GOOD]].forEach(function (it, i) {
      p5.appendChild(paint(svgEl('rect', { x: R + i * 118, y: Y + 14, width: 8, height: 30, rx: 2 }), it[1]));
      label(p5, R + i * 118 + 14, Y + 34, it[0], 'demo-x-ink2', 11.5);
    });
    label(p5, R, Y + 70, '虚线圈：青色是硬模式（0），品红是柔顺模式（0.05）', 'demo-x-mut', 11);
    function draw(t, clock) {
      var map = t < 3.6 ? [2, 0.4] : t < 7.0 ? [1, 3.6] : t < 13.4 ? [0, t < 10.4 ? 7.0 : 10.4] : [2, 13.4];
      clip.at(map[0], K.clipSince(t, map[1]), true);
      var pos = map[0] === 0 ? 0.15 : map[0] === 1 ? 0.5 : 0.85;
      var cx = R + 40 + pos * (tw - 40);
      cur.setAttribute('d', 'M ' + (cx - 7).toFixed(1) + ' 44 L ' + (cx + 7).toFixed(1) + ' 44 L ' + cx.toFixed(1) + ' 56 Z');
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 16: 连续的柔顺度（图 7b、7c、项目页） ── */
  var ANCHOR_PARTS = [[4, '空箱，10/k = 0.5：稳（1.5x）'], [6, '装了约 4 磅，还是 0.5：一推就掉'], [5, '调到 0.3：稳'], [6, '装到约 7 磅，0.3：抬不动'], [5.5, '调到 0.2：稳']];
  var EXTREME_PARTS = [[8, '太硬：空箱子被两只手挤掉（1.5x）'], [16, '太软举不起哑铃，切到硬就行（1x）']];
  var GEMINI_PARTS = [[8, 'Gemini 预测 0.25：稳（1.5x）'], [8, '0.15：太硬，抓不稳'], [5, '0.425：太软，举不起来']];
  function buildSceneContinuous() {
    var s = sceneSvg('左边是项目页的视频，讲到哪段放哪段：同一个箱子越装越重时调柔顺度、太硬和太软的失败、Gemini 预测的柔顺度（项目页写成 10/k）。' +
      '右边依次出现：1/k 的数轴上三个箱子；太硬和太软两段小动画；GentleHumanoid 的力上限和 CHIP 的连续谱；Gemini 的数轴：方块是用户给的两个锚点，圆点是 Gemini 的预测；最后是装哑铃的三次尝试');
    s.appendChild(svgText(24, 26, '连续的柔顺度：刚好够硬（图 7b、7c）', 'demo-x-ink2', 13.5));
    var cA = seqClip(s, 'anchor', 24, 44, 380, 214, '项目页视频：同一个箱子越装越重', ANCHOR_PARTS);
    var cE = seqClip(s, 'extreme', 24, 44, 380, 214, '项目页视频：柔顺度调错了会怎样', EXTREME_PARTS);
    var cG = seqClip(s, 'gemini', 24, 44, 380, 214, '项目页视频：Gemini 看图预测柔顺度', GEMINI_PARTS);
    var R = 424;
    var p1 = group(s);
    label(p1, R, 62, '箱子越重，1/k 调得越小（图 7b）', 'demo-x-ink', 13.5);
    var ax = function (v) { return R + 20 + v / 0.06 * 310; };
    hline(p1, ax(0), 150, ax(0.06), 150, C_BORDER, 2);
    [0, 0.02, 0.04, 0.06].forEach(function (v) { label(p1, ax(v), 170, f2(v), 'demo-x-mut', 11, 'middle'); });
    FIG7B.forEach(function (b, i) {
      var x = ax(b[0]), sz = 20 + b[2] * 2.4;
      var bx = paint(svgEl('rect', { x: x - sz / 2, y: 140 - sz, width: sz, height: sz, rx: 3 }), C_WARN);
      bx.style.opacity = 0.35 + b[2] * 0.08; p1.appendChild(bx);
      dotAt(p1, x, 150, 5, C_SOFT);
      label(p1, x, 194, b[1], 'demo-x-ink2', 11.5, 'middle');
      label(p1, x, 215, f2(b[0]), 'demo-x-ink', 11.5, 'middle');
    });
    label(p1, R, 240, '4 磅约 1.8 kg，7 磅约 3.2 kg', 'demo-x-mut', 11);
    var p2 = group(s);
    label(p2, R, 62, '调错了会失败（图 7c）', 'demo-x-ink', 13.5);
    rectBox(p2, R, 76, 168, 140, C_BORDER, C_SURFACE2);
    rectBox(p2, R + 184, 76, 168, 140, C_BORDER, C_SURFACE2);
    tone(p2, R + 84, 98, '太硬：空箱被挤掉', C_STIFF, 12, 'middle');
    tone(p2, R + 268, 98, '太软：举不起重物', C_SOFT, 12, 'middle');
    var sb = paint(svgEl('rect', { x: R + 64, y: 140, width: 40, height: 30, rx: 3 }), C_WARN);
    sb.style.opacity = 0.8; p2.appendChild(sb);
    var sL = forceArrow(p2, C_F), sR = forceArrow(p2, C_F);
    var hb = paint(svgEl('rect', { x: R + 248, y: 0, width: 40, height: 30, rx: 3 }), C_WARN);
    hb.style.opacity = 0.9; p2.appendChild(hb);
    var hh = [dotAt(p2, R + 244, 0, 6, C_SOFT), dotAt(p2, R + 292, 0, 6, C_SOFT)];
    var p3 = group(s);
    label(p3, R, 62, 'GentleHumanoid：力上限 5–15 N', 'demo-x-ink', 13.5);
    var fx = function (v) { return R + 20 + v / 40 * 310; };
    hline(p3, fx(0), 140, fx(40), 140, C_BORDER, 2);
    var band = paint(svgEl('rect', { x: fx(5), y: 128, width: fx(15) - fx(5), height: 24, rx: 4 }), C_WARN);
    band.style.opacity = 0.4; p3.appendChild(band);
    label(p3, (fx(5) + fx(15)) / 2, 120, '截断的阈值', 'demo-x-ink2', 11, 'middle');
    [0, 10, 20, 30, 40].forEach(function (v) { label(p3, fx(v), 160, v + ' N', 'demo-x-mut', 11, 'middle'); });
    var chipLine = pathLine(p3, [], C_GOOD, 3);
    label(p3, R, 196, 'CHIP：外力超出这个范围，仍能按 1/k 分出不同的柔顺', 'demo-x-ink2', 11.5);
    label(p3, R, 220, '而且 1/k 对应胡克定律，看一眼重量就能估', 'demo-x-ink2', 11.5);
    var p4 = group(s);
    label(p4, R, 62, '项目页：让 Gemini 看图猜柔顺度（10/k）', 'demo-x-ink', 13.5);
    var gx = function (v) { return R + 20 + v / 0.6 * 310; };
    hline(p4, gx(0), 150, gx(0.6), 150, C_BORDER, 2);
    [0, 0.2, 0.4, 0.6].forEach(function (v) { label(p4, gx(v), 170, f1(v), 'demo-x-mut', 11, 'middle'); });
    ANCHORS.forEach(function (a) {
      p4.appendChild(paint(svgEl('rect', { x: gx(a[0]) - 6, y: 144, width: 12, height: 12 }), C_INK));
      label(p4, gx(a[0]), 136, '锚点：' + a[1], 'demo-x-ink2', 11, 'middle');
    });
    var gd = GEMINI.filter(function (g) { return g.ok; }).map(function (g, i) { return { d: dotAt(p4, gx(g.v), 186 + i * 10, 5, C_GOOD), g: g }; });
    label(p4, R, 248, '绿点：Gemini 预测、实际也稳；给两个锚点就够', 'demo-x-ink2', 11.5);
    var p5 = group(s);
    label(p5, R, 62, '装一只哑铃的箱子', 'demo-x-ink', 13.5);
    hline(p5, gx(0), 150, gx(0.6), 150, C_BORDER, 2);
    [0, 0.2, 0.4, 0.6].forEach(function (v) { label(p5, gx(v), 170, f1(v), 'demo-x-mut', 11, 'middle'); });
    var dumb = GEMINI.filter(function (g) { return g.zh === '一只哑铃'; });
    var marks = dumb.map(function (g, i) {
      var gg = group(p5);
      dotAt(gg, gx(g.v), 150, 7, g.ok ? C_GOOD : C_BAD);
      label(gg, gx(g.v), 124 - (i % 2) * 22, String(g.v) + (g.ok ? ' ✓ 稳' : ' ✗ ' + g.why), g.ok ? 'demo-x-ink' : 'demo-x-ink2', 11.5, 'middle');
      return gg;
    });
    label(p5, R, 214, '0.25 正好落在 0.2 和 0.3 之间（例 8）', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var which = t < 3.6 ? 0 : t < 10.4 ? 1 : 2;
      [cA, cE, cG].forEach(function (c, i) {
        var cue = [0.4, 3.6, 10.4][i];
        setOpacity(c.g, i === which ? 1 : 0);
        c.at(i === which ? K.clipSince(t, cue) : 0, i === which);
      });
      var q = (now % 2) / 2, pop = q > 0.5 ? Math.sin((q - 0.5) / 0.5 * Math.PI) * 22 : 0;
      sb.setAttribute('y', (140 - pop).toFixed(1));
      sL.set([R + 24, 155], [1, 0], 34, '');
      sR.set([R + 144, 155], [-1, 0], 34, '');
      var sag = 30 * (0.5 + 0.5 * Math.sin(now * 2));
      hb.setAttribute('y', (130 + sag).toFixed(1));
      hh.forEach(function (d) { d.setAttribute('cy', (145 + sag).toFixed(1)); });
      var u3 = seg(since(t, clock, 7.0), 0.4, 2.0);
      setPath(chipLine, [[fx(0), 140], [fx(40 * u3), 140]]);
      gd.forEach(function (o, i) { o.d.style.opacity = seg(since(t, clock, 10.4), 0.4 + i * 0.4, 0.7 + i * 0.4); });
      marks.forEach(function (m, i) { setOpacity(m, seg(since(t, clock, 13.4), 0.3 + i * 0.5, 0.6 + i * 0.5)); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 17: 自主：GR00T N1.5（图 8） ── */
  var VLA_PARTS = [[12, '擦大白板（2x）'], [10, '一手拿小白板、一手擦（4x）'], [14, '蹲下抱箱子、转身放到桌上（1.5x）']];
  function buildSceneVLA() {
    var s = sceneSvg('左边是项目页里 GR00T N1.5 自主执行的视频，讲到哪个任务放哪一段。右边依次出现：遥操作数据流向 GR00T N1.5、再输出三点目标和柔顺度给 CHIP；' +
      '三个任务的示范数和成功率，柱越长成功率越高；评测方法和失败原因');
    s.appendChild(svgText(24, 26, '自主执行：微调 GR00T N1.5（图 8）', 'demo-x-ink2', 13.5));
    var clip = partClip(s, 'vla', 24, 44, 380, 214, VLA_PARTS, '项目页视频：GR00T N1.5 自主执行，没人操作');
    var R = 424;
    var p1 = group(s);
    label(p1, R, 62, '遥操作时把柔顺度一起录下来', 'demo-x-ink', 13.5);
    var fbox = [['遥操作：动作 + 1/k + 双目 RGB', C_INK, 76], ['微调 GR00T N1.5', C_GOOD, 126], ['三点目标 + 每只手的 1/k', C_OBS, 176], ['CHIP 局部策略 → G1', C_ACCENT, 226]];
    fbox.forEach(function (b) { chip(p1, R + 40, b[2], 280, b[0], b[1], { size: 12, h: 30 }); });
    var fl = [0, 1, 2].map(function () { return flowSeg(p1, C_MUTED, 2, 3, 40); });
    label(p1, R, 284, 'VLA 输出里含柔顺度，是我们按第 IV-B 节的理解', 'demo-x-mut', 11);
    /* 第 2–4 段：三个任务（累积） */
    var p2 = group(s);
    label(p2, R, 62, '三个任务（每个 20 次，2 分钟内完成才算）', 'demo-x-ink', 13);
    var rows = VLA.map(function (v, i) {
      var g = group(p2), y = 84 + i * 66;
      label(g, R, y + 14, v.zh + '　' + v.demos + ' 条示范 · ' + v.k, 'demo-x-ink2', 11.5);
      rectBox(g, R, y + 22, 220, 20, C_BORDER, 'none');
      var b = hbar(g, R, y + 22, 20, C_GOOD), tv = label(g, R + 230, y + 37, '', 'demo-x-ink', 12);
      return { g: g, b: b, tv: tv, v: v };
    });
    readHint(p2, R, 290, '条越长成功率越高（满格 100%）', 11);
    var p5 = group(s);
    label(p5, R, 316, '擦大白板要全擦干净；失败多是字被手挡住、或出了视野', 'demo-x-ink2', 11.5);
    label(p5, R, 338, '抱箱子的失败主要是一开始没抓住', 'demo-x-ink2', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var k = t < 7.0 ? 0 : t < 10.4 ? 1 : 2, cue = t < 3.6 ? 0.4 : t < 7.0 ? 3.6 : t < 10.4 ? 7.0 : 10.4;
      if (t >= 13.4) { k = 2; cue = 10.4; }
      clip.at(k, K.clipSince(t, cue), true);
      fl.forEach(function (f, i) { f.at(now, [R + 180, fbox[i][2] + 32], [R + 180, fbox[i + 1][2] - 2]); });
      rows.forEach(function (r, i) {
        var at = [3.6, 7.0, 10.4][i], u = seg(since(t, clock, at), 0.3, 1.3);
        setOpacity(r.g, t >= at ? 1 : 0);
        setW(r.b, r.v.succ / 100 * 220 * u);
        r.tv.textContent = u > 0.05 ? r.v.succ + '%（' + Math.round(r.v.succ / 100 * VLA_N) + ' / ' + VLA_N + '）' : '';
        r.b.style.opacity = t >= at && (t < at + 3.4 || t >= 13.4) ? 1 : 0.45;
      });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 18: 局限与没说清的地方 ── */
  function buildSceneLimits() {
    var s = sceneSvg('左边是 G1 的模型，右手腕上一支实线箭头和几支虚线箭头：真机只用单方向的刚度；手腕上没有力传感器。' +
      '右边依次出现：本体感受不够准；没有腕部力传感器、柔顺度要人调；多机实验有限；论文没写的三件事来回翻；代码一直显示「即将放出」');
    s.appendChild(svgText(24, 26, '局限与没说清的地方', 'demo-x-ink2', 13.5));
    var robot = g1Yield(s);
    var P = robot.put(G1X, G1Y, G1K, 0);
    var uni = forceArrow(s, C_F), qm = tone(s, 0, 0, '?', C_WARN, 18, 'middle');
    var sensor = ringAt(s, P.lw[0], P.lw[1], 12, C_BAD, 2);
    var sx = cross(s, P.lw[0] + 8, P.lw[1] - 22, 10, C_BAD);
    label(s, 24, 346, '右手：真机只用「单方向（unidirectional）」的刚度，论文没解释', 'demo-x-ink2', 11);
    label(s, 24, 368, '左手：没有腕部力 / 力矩传感器', 'demo-x-ink2', 11);
    var R = 424;
    var p1 = group(s);
    label(p1, R, 62, '论文写的局限（第 VI 节）', 'demo-x-ink', 14);
    label(p1, R, 90, '① G1 的本体感受不够准', 'demo-x-ink2', 12.5);
    label(p1, R, 114, '　→ 真机只用单方向的刚度', 'demo-x-ink2', 12.5);
    var p2 = group(s);
    label(p2, R, 62, '论文写的局限（续）', 'demo-x-ink', 14);
    label(p2, R, 90, '② 没有准确的腕部力传感，插孔这类精细接触做不了', 'demo-x-ink2', 12);
    label(p2, R, 114, '③ 柔顺度要按接口和任务手调', 'demo-x-ink2', 12);
    var ks = kSlider(p2, R, 156, 300, 0.05, '');
    var p3 = group(s);
    label(p3, R, 62, '论文写的局限（续）', 'demo-x-ink', 14);
    label(p3, R, 90, '④ 多机协作的场景有限', 'demo-x-ink2', 12.5);
    label(p3, R, 114, '　膝盖先撞上物体的失败，没能单独测出控制器的本事', 'demo-x-ink2', 12);
    var p4 = group(s);
    label(p4, R, 62, '我们补充：没说清的地方', 'demo-x-ink', 14);
    var flips = flipList(p4, R, 80, [['训练时 1/k', '怎么抽？', '没写'], ['阻尼 α', '取多少？', '没写'], ['20 N、1/k = 0.05', '式子 1.0 m', '图上 0.27 m'], ['柔顺度的写法', '论文 1/k', '项目页 10/k']], 120, 120, ['问题', '现状']);
    var p5 = group(s);
    label(p5, R, 62, '代码', 'demo-x-ink', 14);
    chip(p5, R, 80, 220, 'Code (Coming Soon)', C_WARN, { size: 13, h: 34 });
    var mon = label(p5, R, 146, '', 'demo-x-ink', 14);
    label(p5, R, 172, '项目页写着「一个月内放出代码」；到 2026-10 仍未放出', 'demo-x-ink2', 12);
    label(p5, R, 196, '这一期只能照论文和项目页讲，没有复现', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var a = 0.5 + 0.5 * Math.sin(now * 2);
      uni.set([P.rw[0] - 8, P.rw[1]], [-1, 0], 22 + 26 * a, '');
      qm.setAttribute('x', (P.rw[0] - 18).toFixed(1)); qm.setAttribute('y', (P.rw[1] - 22).toFixed(1));
      sensor.style.opacity = 0.5 + 0.5 * Math.abs(Math.sin(now * 2.5));
      void sx;
      ks.set(0.05 * (0.5 + 0.5 * Math.sin(now * 1.3)), '手调');
      flips.set(since(t, clock, 10.4));
      var m = Math.min(10, Math.floor(seg(since(t, clock, 13.4), 0.3, 2.3) * 10));
      mon.textContent = '离 arXiv 第一版已经 ' + m + ' 个月';
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  var CHIP_SCENES = [
    {
      title: '会跑会跳，却搬不动东西',
      dur: 16,
      build: buildSceneIntro,
      cues: [
        { at: 0.4, s: '人形会后空翻、会跑；搬箱子、擦白板、推车这类要用力的操作却还很难。' },
        { at: 3.6, s: '难在接触：太硬会把东西撞飞，太软又使不上劲。' },
        { at: 7.0, s: '机械臂靠阻抗控制：末端像弹簧，位移 = 力 × $1/k$；人形的 RL 跟踪没有这种写法。' },
        { at: 10.4, s: '两条路：之前讲过的 FALCON 学着「扛住」外力；CHIP 学着按指定的柔顺度「让位」。' },
        { at: 13.4, s: '**CHIP**：给跟踪控制器加一个可调的柔顺度 $1/k$；NVIDIA、Stanford、UT Austin。' }
      ]
    },
    {
      title: '前人怎么教柔顺（图 3b、c）',
      dur: 16,
      build: buildScenePrior,
      cues: [
        { at: 0.4, s: '四足上的 UniFP、FACET：合成大量弹簧—阻尼的参考动作去模仿。' },
        { at: 3.6, s: 'GentleHumanoid：策略看原目标 $g$，奖励却用挪开的 $g+f/k$ 算（图 3b）。' },
        { at: 7.0, s: 'SoftMimic：离线用逆运动学改整条手臂的参考（图 3c）。' },
        { at: 10.4, s: '可奖励要用的参考是稠密的：位姿、速度、关节角都得一起改对，跑步还要满足动力学。' },
        { at: 13.4, s: 'GentleHumanoid 还去掉了关节级的跟踪奖励，局部位置误差是 CHIP 的 2–2.5 倍。' }
      ]
    },
    {
      title: '事后扰动：改观测，不改参考',
      dur: 16,
      build: buildSceneHindsight,
      cues: [
        { at: 0.4, s: '关键洞见：把参考动作看成「已经被力推过之后」的结果。' },
        { at: 3.6, s: '训练时手上加力 $f$，策略看到的目标改成 $g-f/k$（黄圈）。' },
        { at: 7.0, s: '奖励照旧用原参考 $g$（粉点）算：停在粉点就拿满分。' },
        { at: 10.4, s: '策略学到：看到目标、手上有力，就停在目标外 $f/k$ 处。' },
        { at: 13.4, s: '参考一个点都不改，改的只是观测里的三个稀疏的点（图 3a）。' }
      ]
    },
    {
      title: '部署时：一根看不见的弹簧',
      dur: 16,
      build: buildSceneSpring,
      cues: [
        { at: 0.4, s: '部署时观测里就是真正的目标 $g$，不减任何东西。' },
        { at: 3.6, s: '手上来了力，就停在 $g+f/k$：5 N、$1/k=0.02$ 让开 0.10 m。' },
        { at: 7.0, s: '这就是胡克定律：$1/k$ 越大越软，$1/k=0$ 就是普通的硬跟踪。' },
        { at: 10.4, s: 'v1 的图：20 N 下 CHIP 的位移随 $1/k$ 增大，只改奖励的基线几乎不动。' },
        { at: 13.4, s: '但量级对不上：按式子应让开 1.0 m，图上只有 0.27 m，论文没解释。' }
      ]
    },
    {
      title: '三个好处',
      dur: 16,
      build: buildSceneBenefits,
      cues: [
        { at: 0.4, s: '① 改稀疏的目标，比改稠密的参考省事，训练时在线就能做。' },
        { at: 3.6, s: '② 奖励永远是原动作，动作一直留在参考的分布里，更自然。' },
        { at: 7.0, s: '③ 观测里既有数据集里的目标，也有被平移过的，测试时更鲁棒。' },
        { at: 10.4, s: '不合成数据、不加奖励项、不学单独的力估计器。' },
        { at: 13.4, s: '所以叫「即插即用」：局部、全局的关键点跟踪框架都能加。' }
      ]
    },
    {
      title: '力怎么加（图 9）',
      dur: 16,
      build: buildSceneForce,
      cues: [
        { at: 0.4, s: '训练时往末端（两只手）加随机的外力。' },
        { at: 3.6, s: '方向均匀随机，峰值在 0 到 40 N 之间均匀抽。' },
        { at: 7.0, s: '每次持续 1 到 3 s，同样均匀抽。' },
        { at: 10.4, s: '大小按梯形：前 1/4 升到峰值，中间一半保持，最后 1/4 降到 0（图 9）。' },
        { at: 13.4, s: '用意：模仿阻抗控制下的接触力；两次之间隔多久、$1/k$ 怎么抽，论文没写。' }
      ]
    },
    {
      title: '策略看什么（图 2）',
      dur: 16,
      build: buildSceneInputs,
      cues: [
        { at: 0.4, s: '演员看：三点目标（训练时是 $g-f/k$）、每只手的 $1/k$。' },
        { at: 3.6, s: '再加 10 步本体感受和 11 步历史动作：力要从这些里自己猜。' },
        { at: 7.0, s: '批评家另外看真实的外力 $f$（特权信息），演员看不到。' },
        { at: 10.4, s: '只用 PPO 一个目标，不学单独的力估计器。' },
        { at: 13.4, s: '64 张 L40S，每张 4096 个环境，训 4 天。' }
      ]
    },
    {
      title: '奖励：照抄原参考（表 III）',
      dur: 16,
      build: buildSceneReward,
      cues: [
        { at: 0.4, s: '奖励参照 SONIC 和 BeyondMimic：误差越小越接近 1 的指数形式。' },
        { at: 3.6, s: '跟踪 7 项：根部朝向 0.5，连杆和三个点的位置、朝向、速度各 1。' },
        { at: 7.0, s: '全局策略再加 2 项：世界坐标系里三个点的位置、朝向，各 0.5。' },
        { at: 10.4, s: '惩罚：动作变化 −0.1、关节超限 −10、多余的接触 −0.1。' },
        { at: 13.4, s: '没有一项和柔顺有关：柔顺全靠观测里的 $g-f/k$。' }
      ]
    },
    {
      title: '阻尼：让目标跟着手走',
      dur: 16,
      build: buildSceneDamper,
      cues: [
        { at: 0.4, s: '只有弹簧时，松手后手会弹回目标。' },
        { at: 3.6, s: '仿照 FACET 加一个阻尼：每步把目标往手挪一点，$g_t=\\alpha x+(1-\\alpha)g_{t-1}$。' },
        { at: 7.0, s: '项目页的三种模式：① 硬 + 全局跟踪，推不动。' },
        { at: 10.4, s: '② 软 + 全局跟踪：推得动，松手后回到轨迹。' },
        { at: 13.4, s: '③ 软 + 阻尼跟随：目标跟着手走，人牵着就走。' }
      ]
    },
    {
      title: '全局三点与定位',
      dur: 16,
      build: buildSceneGlobal,
      cues: [
        { at: 0.4, s: '全局策略在世界坐标系里跟踪头的 6D 位姿和两手腕的 3D 位置。' },
        { at: 3.6, s: '三个点太稀疏：该走过去还是伸手？看未来 0.2 s（5 帧）就分得清。' },
        { at: 7.0, s: '定位照 BeyondMimic：足端里程计、Fast-LIO2、IMU，融合成 50 Hz。' },
        { at: 10.4, s: '两台机器人先建一张点云地图，开机时各自配准上去，共用一个坐标系。' },
        { at: 13.4, s: '全局策略和状态估计跑在一台 i7 + RTX 3090 的台式机上。' }
      ]
    },
    {
      title: '两台机器人一起抱（图 5）',
      dur: 16,
      build: buildSceneLift,
      cues: [
        { at: 0.4, s: '把 SpringGrasp 扩展到两台人形：优化出两台的头位姿和手腕位置。' },
        { at: 3.6, s: '要求稳定、不碰撞、柔顺，再规划一条最小曲率的轨迹。' },
        { at: 7.0, s: '三步：靠近、抓（手腕目标稍微压进物体）、抬。' },
        { at: 10.4, s: '抬起来以后，键盘同时平移两台的目标，就能一起搬走。' },
        { at: 13.4, s: '抓的时候柔顺度设成 $1/k=0.04$：抬得动，又不至于把箱子挤飞。' }
      ]
    },
    {
      title: '表 II：抓得住吗',
      dur: 16,
      build: buildSceneTable2,
      cues: [
        { at: 0.4, s: '两种高度的箱子和球，各 5 次，抬起来才算成功。' },
        { at: 3.6, s: 'CHIP 平均 0.8，一直很硬的 FALCON 0.05，没训过外力的 0.4。' },
        { at: 7.0, s: 'FALCON 两边都硬着往里推，箱子被夹在两股大力之间，一碰就失稳（图 6）。' },
        { at: 10.4, s: '没训过外力的本身有点软，偶尔能抓住（v1 的说法）。' },
        { at: 13.4, s: 'CHIP 的失败主要是膝盖先撞上物体。' }
      ]
    },
    {
      title: '局部三点与遥操作（图 4）',
      dur: 16,
      build: buildSceneLocal,
      cues: [
        { at: 0.4, s: '局部策略：头和两手腕相对根部的位姿，加下半身的关节参考。' },
        { at: 3.6, s: '下半身参考由运动学规划器按摇杆的速度、转向、高度生成（照 SONIC）。' },
        { at: 7.0, s: 'VR 头显和两个手柄直接给三个点；全部跑在 G1 的 Jetson NX 上。' },
        { at: 10.4, s: '每只手的柔顺度由操作员在 VR 里调。' },
        { at: 13.4, s: '送快递：软着拉推车、硬着推开弹簧门、再软着抱箱子。' }
      ]
    },
    {
      title: '表 I：柔顺不伤跟踪',
      dur: 16,
      build: buildSceneTable1,
      cues: [
        { at: 0.4, s: 'MuJoCo 里不加外力，从 TWIST 数据集抽 100 段动作量跟踪误差。' },
        { at: 3.6, s: '全局位置误差：CHIP 0.08 m，FALCON 0.09，不加外力训 0.11。' },
        { at: 7.0, s: '局部位置都是 0.02 m；朝向 CHIP 0.09–0.11 rad，比基线的 0.08 略差。' },
        { at: 10.4, s: 'GentleHumanoid：局部位置 0.04、0.05 m，朝向 0.15、0.16 rad。' },
        { at: 13.4, s: '换 $1/k$ 精度几乎不变：策略分得清自己的驱动力和外来的力。' }
      ]
    },
    {
      title: '两只手，两种刚度（图 7a）',
      dur: 16,
      build: buildSceneHybrid,
      cues: [
        { at: 0.4, s: '同一个控制器：抱箱、擦白板要软；推弹簧门、翻重箱子要硬。' },
        { at: 3.6, s: '两只手可以不一样：左手 $1/k=0.001$ 硬拿白板，右手 0.05 软着写。' },
        { at: 7.0, s: '时间很长的任务里随时切：先硬着拔笔帽，再软着写字、擦白板。' },
        { at: 10.4, s: '拔笔帽要两只手都硬：一硬一软时力不够（项目页）。' },
        { at: 13.4, s: '图 7a：蓝条调硬、橙条调软、绿条保持。' }
      ]
    },
    {
      title: '连续的柔顺度（图 7b、c）',
      dur: 16,
      build: buildSceneContinuous,
      cues: [
        { at: 0.4, s: '同一个箱子越装越重：空箱 $1/k=0.05$，约 4 磅 0.03，约 7 磅 0.02。' },
        { at: 3.6, s: '太硬，两只手对顶，空箱被挤掉；太软，举不起重物（图 7c）。' },
        { at: 7.0, s: 'GentleHumanoid 的力上限只有 5–15 N；CHIP 的连续谱超出这个范围也能用。' },
        { at: 10.4, s: '$1/k$ 有物理意义：项目页给两个锚点，让 Gemini 看图猜柔顺度。' },
        { at: 13.4, s: '装哑铃的箱子：Gemini 猜 0.25，稳；0.15 太硬，0.425 太软。' }
      ]
    },
    {
      title: '自主：GR00T N1.5（图 8）',
      dur: 16,
      build: buildSceneVLA,
      cues: [
        { at: 0.4, s: '遥操作时把柔顺度一起录下来，拿来微调 GR00T N1.5。' },
        { at: 3.6, s: '擦大白板：400 条示范，成功 60%。' },
        { at: 7.0, s: '一手硬拿小白板、一手软着擦：200 条，80%。' },
        { at: 10.4, s: '蹲下抱箱子、转身放到桌上：200 条，两手都软，90%。' },
        { at: 13.4, s: '每个任务 20 次，2 分钟内完成才算。' }
      ]
    },
    {
      title: '局限与没说清的地方',
      dur: 16,
      build: buildSceneLimits,
      cues: [
        { at: 0.4, s: '本体感受不够准：真机上只用单方向的刚度。' },
        { at: 3.6, s: '没有腕部力传感器，插孔这类精细接触做不了；柔顺度要人按任务调。' },
        { at: 7.0, s: '多机实验场景有限，失败里有膝盖先撞上物体。' },
        { at: 10.4, s: '没写清的：$1/k$ 怎么抽、$\\alpha$ 取多少、位移量级对不上。' },
        { at: 13.4, s: '代码至今没放出，这一期只能照论文和项目页讲。' }
      ]
    }
  ];
  /* 要点里数字和单位之间用不换行空格（公式里不动），免得单位单独落到下一行开头（HOMIE 2026-10-21） */
  function nb(str) {
    return str.split(/(\$[^$]*\$)/).map(function (p, i) { return i % 2 ? p : p.replace(/(\d)(\*\*)? (?=[^\s\d+\-−→×<>=\/·（(])/g, '$1$2 ').replace(/(\d)–(\d)/g, '$1–⁠$2'); }).join('');
  }
  CHIP_SCENES.forEach(function (sc) { sc.cues.forEach(function (c) { c.s = nb(c.s); }); });
  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十八幕动画：CHIP 全流程速览',
      sub: '约 288 秒自动播放。空格播放/暂停，← → 换幕；真机画面剪自项目页的视频，曲线和柱子照论文的数重画，G1 是按示意姿态渲染的模型。',
      ariaLabel: 'CHIP 十八幕讲解动画',
      notes: [
        '取数依据：表 I–III、附录 B 和第 IV–V 节的数字照抄 arXiv 2512.14689 v2（读的是 LaTeX 源码）；第 4 幕「20 N 下末端位移」那张图只在 v1 里有，数是从 v1 的矢量图里按网格线抽的；Gemini 预测的柔顺度（10/k）取自项目页。',
        '这一期没有复现：官方代码没有放出。G1 是 Robot_Retarget_Online 的带三指手模型，按示意姿态渲染（两只手沿外力方向往外让开 0–0.164 m），不是策略的输出；第 9 幕的一维示意和例 5 的 α = 0.1、50 Hz 是我们的假设。',
        '真机片段剪自项目页 nvlabs.github.io/CHIP 的视频（画面里自带倍速标签），只做讲解引用。'
      ],
      scenes: CHIP_SCENES
    });
  }
  // ─── the narrated vertical video of the same eighteen scenes ──────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：CHIP 十八幕全流程',
      sub: '18 分 50 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十八幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '22.4 MB',
      fileName: 'CHIP_讲解视频.mp4'
    });
  }

  // ─── 演示 1：事后扰动实验台 ─────────────────────────────────────────────────
  function buildHindsightDemo(host) {
    var root = card(host, {
      title: '事后扰动实验台：训练时看什么、奖励用什么、部署时手停在哪',
      sub: '拖外力的大小和方向、柔顺度 $1/k$。默认值就是笔记「🚶 具体实例」的例 1–3：右手腕 $g=(0.22,\\,-0.23,\\,0.82)$ m，往外 5 N，$1/k=0.02$。'
    });
    var state = { F: 5, ang: 180, ik: 0.02, mode: 'chip', view: 'train', T: 2 };
    var row = controlsRow(root);
    slider(row, { label: '外力大小 $|f|$', min: 0, max: 40, step: 0.5, value: 5, format: function (v) { return f1(v) + ' N'; }, onInput: function (v) { state.F = v; render(); } });
    slider(row, { label: '方向（正视图里，0° 朝机器人左手、180° 朝右手外侧）', min: 0, max: 359, step: 1, value: 180, format: function (v) { return v + '°'; }, onInput: function (v) { state.ang = v; render(); } });
    slider(row, { label: '柔顺度 $1/k$', min: 0, max: 0.05, step: 0.001, value: 0.02, format: function (v) { return f3(v); }, onInput: function (v) { state.ik = v; render(); } });
    var row2 = controlsRow(root);
    buttonGroup(row2, { label: '写法', items: [{ label: 'CHIP：改观测', value: 'chip' }, { label: 'GentleHumanoid：改奖励', value: 'gh' }], value: 'chip', onPick: function (v) { state.mode = v; render(); } });
    buttonGroup(row2, { label: '看哪个阶段', items: [{ label: '训练', value: 'train' }, { label: '部署', value: 'deploy' }], value: 'train', onPick: function (v) { state.view = v; render(); } });
    var stats = statsRow(root);
    var sOff = stats.add('$|f|/k$'), sObs = stats.add('策略看到的目标'), sRw = stats.add('奖励用的目标'), sHand = stats.add('手停在');
    var st = stage(root, 300);
    var verdict = verdictBox(root);
    var row3 = controlsRow(root);
    slider(row3, { label: '一次扰动的持续时间 $T$', min: 1, max: 3, step: 0.1, value: 2, format: function (v) { return f1(v) + ' s'; }, onInput: function (v) { state.T = v; render(); } });
    var st2 = stage(root, 170);
    note(root, ['正视图：横轴是机器人的左右（$y$，右边是它的左手边）、纵轴是高低（$z$），单位 m；粉点是算奖励用的目标、黄圈是策略看到的目标、白点是手、蓝箭头是外力。',
      '「部署」时观测里就是 $g$，手按学到的规律停在 $g+f/k$。这是按论文的式子画的；v1 那张图里 20 N、$1/k=0.05$ 只让开 0.27 m，比 $f/k=1$ m 小得多（例 3），论文没解释。',
      '$1/k$ 的单位论文没写，这里按 m/N 算；训练时 $1/k$ 在什么范围里抽，论文也没写。下面的梯形是附录 B 的力的时间曲线（峰值取上面的 $|f|$）。']);
    render();
    function render() {
      var a = state.ang * Math.PI / 180, f = [state.F * Math.cos(a), state.F * Math.sin(a)];
      var off = [f[0] * state.ik, f[1] * state.ik], g = [EX.g[1], EX.g[2]];
      var obs, rew, hand;
      if (state.mode === 'chip') {
        obs = state.view === 'train' ? [g[0] - off[0], g[1] - off[1]] : g;
        rew = g;
        hand = state.view === 'train' ? g : [g[0] + off[0], g[1] + off[1]];
      } else {
        obs = g;
        rew = [g[0] + off[0], g[1] + off[1]];
        hand = state.view === 'train' ? rew : [g[0] + off[0], g[1] + off[1]];
      }
      var L = Math.hypot(off[0], off[1]);
      sOff.set(f3(L) + ' m');
      sObs.set('(' + f2(obs[0]) + ', ' + f2(obs[1]) + ')');
      sRw.set('(' + f2(rew[0]) + ', ' + f2(rew[1]) + ')');
      sHand.set('(' + f2(hand[0]) + ', ' + f2(hand[1]) + ')', 'good');
      var gc = begin(st), ctx = gc.ctx, C = gc.P, span = Math.max(0.35, L * 1.4 + 0.1);
      var sx = function (y) { return gc.w / 2 - (y - g[0]) / span * (gc.w / 2 - 20); };
      var sy = function (z) { return gc.h / 2 - (z - g[1]) / span * (gc.h / 2 - 20) * (gc.w / gc.h > 1.5 ? 1 : 1); };
      line(ctx, [[20, gc.h / 2], [gc.w - 20, gc.h / 2]], C.grid, 1);
      line(ctx, [[gc.w / 2, 14], [gc.w / 2, gc.h - 14]], C.grid, 1);
      text(ctx, '±' + f2(span) + ' m', gc.w - 24, gc.h / 2 - 8, C.text, 'right', '11px sans-serif');
      function dotC(p, r, col, ring) { ctx.beginPath(); ctx.arc(sx(p[0]), sy(p[1]), r, 0, 6.283); if (ring) { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke(); } else { ctx.fillStyle = col; ctx.fill(); } }
      if (L > 1e-6) {
        var p0 = hand, p1 = [hand[0] + f[0] / state.F * span * 0.35, hand[1] + f[1] / state.F * span * 0.35];
        if (state.F > 0) {
          line(ctx, [[sx(p0[0]), sy(p0[1])], [sx(p1[0]), sy(p1[1])]], C.accent, 2.5);
          text(ctx, 'f = ' + f1(state.F) + ' N', sx(p1[0]), sy(p1[1]) - 8, C.accent, 'center', 'bold 11px sans-serif');
        }
      }
      dotC(rew, 7, C.purple);
      dotC(obs, 10, C.warn, true);
      dotC(hand, 5, C.text);
      text(ctx, '奖励用的目标', sx(rew[0]) + 12, sy(rew[1]) + 16, C.purple, 'left', '11px sans-serif');
      text(ctx, '看到的目标', sx(obs[0]) + 12, sy(obs[1]) - 12, C.warn, 'left', '11px sans-serif');
      if (state.view === 'train') {
        verdict.set(state.mode === 'chip'
          ? '训练：策略看到 $g-f/k$，奖励用原来的 $g$。手停在 $g$ 时三点位置项是 **1.000**；硬顶在看到的目标上只有 **' + f3(threePtReward(L)) + '**（例 2）。参考动作一点没改。'
          : 'GentleHumanoid 的写法：策略看原目标 $g$，奖励用挪开的 $g+f/k$——要把算奖励用的参考改掉，稠密的连杆、速度、关节参考都得跟着改。', 'good');
      } else {
        verdict.set('部署：观测里就是 $g$，手停在 $g+f/k$，让开 **' + f3(L) + ' m**；等效刚度 $k=' + (state.ik > 0 ? f1(1 / state.ik) : '\\infty') + '$ N/m。两种写法学到的部署行为相同，区别在训练时要改什么。', 'good');
      }
      /* 梯形 */
      var g2 = begin(st2), c2 = g2.ctx, P2 = g2.P, x0 = 46, x1 = g2.w - 14, y0 = g2.h - 26, y1 = 18;
      var px = function (tt) { return x0 + tt / 3 * (x1 - x0); }, py = function (v) { return y0 - v / 40 * (y0 - y1); };
      [0, 10, 20, 30, 40].forEach(function (v) { line(c2, [[x0, py(v)], [x1, py(v)]], P2.grid, 1); text(c2, v + ' N', x0 - 6, py(v), P2.text, 'right', '10px sans-serif'); });
      [0, 1, 2, 3].forEach(function (v) { text(c2, v + ' s', px(v), y0 + 14, P2.text, 'center', '10px sans-serif'); });
      var pts = [];
      for (var q = 0; q <= 120; q++) { var tt = q / 120 * 3; pts.push([px(tt), py(trap(tt / state.T, state.F))]); }
      line(c2, pts, P2.accent, 2.4);
    }
    registerRenderer(render);
  }

  // ─── 演示 2：弹簧与阻尼（一维玩具） ─────────────────────────────────────────
  function buildDamperDemo(host) {
    var root = card(host, {
      title: '弹簧与阻尼：人拉一下再松手',
      sub: '一维的玩具：人在 0.5–2.5 s 用梯形的力拉手，之后松开。手按准静态 $x=g+f/k$ 停，加阻尼时目标按 $g_t=\\alpha x+(1-\\alpha)g_{t-1}$ 跟着走。'
    });
    var state = { mode: 'damp', F: 5, ik: 0.02, alpha: DAMP.alpha };
    var row = controlsRow(root);
    buttonGroup(row, { label: '模式', items: [{ label: '硬（1/k = 0）', value: 'stiff' }, { label: '软 + 全局跟踪', value: 'spring' }, { label: '软 + 阻尼跟随', value: 'damp' }], value: 'damp', onPick: function (v) { state.mode = v; render(); } });
    var row2 = controlsRow(root);
    slider(row2, { label: '拉力峰值', min: 0, max: 20, step: 0.5, value: 5, format: function (v) { return f1(v) + ' N'; }, onInput: function (v) { state.F = v; render(); } });
    slider(row2, { label: '$1/k$', min: 0.001, max: 0.05, step: 0.001, value: 0.02, format: function (v) { return f3(v); }, onInput: function (v) { state.ik = v; render(); } });
    slider(row2, { label: '阻尼 $\\alpha$（论文没给）', min: 0.01, max: 0.5, step: 0.01, value: DAMP.alpha, format: function (v) { return f2(v); }, onInput: function (v) { state.alpha = v; render(); } });
    var stats = statsRow(root);
    var sMax = stats.add('最大让开'), sEnd = stats.add('松手后手的位置'), sV = stats.add('拉的时候目标的速度');
    var st = stage(root, 260);
    var verdict = verdictBox(root);
    note(root, ['这是玩具模型：没有动力学，手每一步都停在 $g+f/k$（准静态）；控制频率按 50 Hz 算（论文没写）。数值只说明机制，不能和论文比。',
      '默认值就是笔记「🚶 具体实例」的例 5：$\\alpha=0.1$、5 N、$1/k=0.02$ 时，目标每步挪 $\\alpha f/k=1$ cm，即 0.5 m/s。',
      '「硬」时不管多大的力手都不动；「软 + 全局跟踪」松手后回到原来的目标；「软 + 阻尼跟随」松手后留在被拉到的地方——项目页说的「无限柔顺」。']);
    function simulate() {
      var dt = 1 / DAMP.hz, n = Math.round(6 / dt), g = 0, xs = [], gs = [], fs = [], ik = state.mode === 'stiff' ? 0 : state.ik;
      for (var i = 0; i <= n; i++) {
        var tt = i * dt, F = trap((tt - 0.5) / 2.0, state.F), x = g + F * ik;
        if (state.mode === 'damp') g = state.alpha * x + (1 - state.alpha) * g;
        xs.push(x); gs.push(g); fs.push(F);
      }
      return { xs: xs, gs: gs, fs: fs, dt: dt };
    }
    function render() {
      var r = simulate(), mx = Math.max.apply(null, r.xs), end = r.xs[r.xs.length - 1];
      var v = state.mode === 'damp' ? state.alpha * state.F * state.ik * DAMP.hz : 0;
      sMax.set(f3(mx) + ' m'); sEnd.set(f3(end) + ' m'); sV.set(state.mode === 'damp' ? f2(v) + ' m/s（峰值时）' : '0');
      var gc = begin(st), ctx = gc.ctx, C = gc.P, x0 = 50, x1 = gc.w - 14, y0 = gc.h - 26, y1 = 16;
      var ymax = Math.max(0.1, mx * 1.15);
      var px = function (tt) { return x0 + tt / 6 * (x1 - x0); }, py = function (val) { return y0 - val / ymax * (y0 - y1); };
      [0, 0.5, 1].forEach(function (q) { line(ctx, [[x0, py(ymax * q)], [x1, py(ymax * q)]], C.grid, 1); text(ctx, f2(ymax * q) + ' m', x0 - 6, py(ymax * q), C.text, 'right', '10px sans-serif'); });
      [0, 1, 2, 3, 4, 5, 6].forEach(function (q) { text(ctx, q + ' s', px(q), y0 + 14, C.text, 'center', '10px sans-serif'); });
      line(ctx, r.gs.map(function (g, i) { return [px(i * r.dt), py(g)]; }), C.warn, 2, [5, 4]);
      line(ctx, r.xs.map(function (x, i) { return [px(i * r.dt), py(x)]; }), C.text, 2.4);
      line(ctx, r.fs.map(function (f, i) { return [px(i * r.dt), py(f / Math.max(1, state.F) * ymax * 0.25)]; }), C.accent, 1.6);
      text(ctx, '白线：手　黄虚线：目标　蓝线：拉力（缩放后）', x0 + 4, y1 + 4, C.text, 'left', '11px sans-serif');
      verdict.set(state.mode === 'stiff' ? '硬：手一直停在目标上，拉力全被顶回去。' : state.mode === 'spring'
        ? '软 + 全局跟踪：拉的时候让开最多 **' + f3(mx) + ' m**，松手后回到 **' + f3(end) + ' m**（原来的目标）。'
        : '软 + 阻尼跟随：目标跟着手走，松手后留在 **' + f3(end) + ' m**；拉力峰值时目标的速度 $\\alpha f/(k\\Delta t)=' + f2(v) + '$ m/s。', 'good');
    }
    registerRenderer(render);
    render();
  }

  // ─── 演示 3：论文的数字 ──────────────────────────────────────────────────────
  function buildResultsDemo(host) {
    var root = card(host, {
      title: '论文的数字：表 I、表 II、v1 的位移图、图 7b 与 Gemini、VLA',
      sub: '切换看哪一组。柱和曲线按 arXiv 2512.14689 的数重画；v1 的位移图是从 v1 的矢量图里抽的读图值；Gemini 那组取自项目页（写成 10/k）。'
    });
    var state = { view: 't1', metric: 2 };
    var row = controlsRow(root);
    buttonGroup(row, { label: '看哪个', items: [{ label: '表 I：跟踪误差', value: 't1' }, { label: '表 II：多机抓取', value: 't2' }, { label: 'v1：20 N 下的位移', value: 'disp' }, { label: '图 7b 与 Gemini', value: 'k' }, { label: 'VLA', value: 'vla' }], value: 't1', onPick: function (v) { state.view = v; render(); } });
    var row2 = controlsRow(root);
    buttonGroup(row2, { label: '表 I 的指标', items: T1_METRICS.map(function (m, i) { return { label: m, value: i }; }), value: 2, onPick: function (v) { state.metric = v; render(); } });
    var st = stage(root, 280);
    var verdict = verdictBox(root);
    var tb = table(root);
    note(root, ['表 I：MuJoCo 里不加外力、TWIST 数据集 100 段；GentleHumanoid 只给了局部的两项。表 II：每格 5 次，所以只能是 0.2 的倍数。',
      'v1 的位移图：全局跟踪、20 N 外力；红线是「只加一项跟踪改过的末端轨迹的奖励、不用事后扰动」的基线。按 $f/k$ 算，0.05 时应是 1.0 m（例 3）。',
      'VLA：每个任务 20 次、2 分钟内完成才算；v1 的擦大白板只测了 10 次。']);
    function bars(ctx, C, gw, gh, items, ymax, unit) {
      var x0 = 50, y0 = gh - 40, y1 = 18, bw = Math.min(56, (gw - x0 - 20) / items.length - 10);
      [0, 0.5, 1].forEach(function (q) { line(ctx, [[x0, y0 - q * (y0 - y1)], [gw - 10, y0 - q * (y0 - y1)]], C.grid, 1); text(ctx, f2(ymax * q) + unit, x0 - 6, y0 - q * (y0 - y1), C.text, 'right', '10px sans-serif'); });
      items.forEach(function (it, i) {
        var x = x0 + 10 + i * (bw + 10);
        if (it.v == null) { text(ctx, '—', x + bw / 2, y0 - 10, C.text, 'center', '12px sans-serif'); }
        else {
          var h = it.v / ymax * (y0 - y1);
          ctx.fillStyle = it.c; ctx.fillRect(x, y0 - h, bw, h);
          text(ctx, it.t || String(it.v), x + bw / 2, y0 - h - 8, C.text, 'center', '11px sans-serif');
        }
        text(ctx, K.richToPlain(it.n), x + bw / 2, y0 + 14, C.text, 'center', '10px sans-serif');
      });
    }
    function render() {
      var g = begin(st), ctx = g.ctx, C = g.P;
      tb.clear();
      if (state.view === 't1') {
        var cols = [C.good, C.good, C.good, C.warn, C.warn, C.accent, C.muted];
        bars(ctx, C, g.w, g.h, TABLE1.map(function (r, i) { return { v: r.v[state.metric], c: cols[i], n: ['CHIP 0', 'CHIP .02', 'CHIP .05', 'GH 硬', 'GH 软', 'FALCON', '无外力'][i] }; }), [0.12, 0.12, 0.06, 0.18][state.metric], '');
        tb.row(['方法'].concat(T1_METRICS), true);
        TABLE1.forEach(function (r) { tb.row([r.zh].concat(r.v.map(function (v, j) { return v == null ? '—' : f2(v) + '（' + f2(r.sd[j]) + '）'; }))); });
        verdict.set('柱越矮越好。CHIP 换三个柔顺度，误差几乎不变；局部位置都是 0.02 m，GentleHumanoid 是 0.04 / 0.05 m（2–2.5 倍）。', 'good');
      } else if (state.view === 't2') {
        var items = [];
        TABLE2.concat([{ zh: '平均', v: [0.8, 0.05, 0.4] }]).forEach(function (r) {
          [C.good, C.accent, C.muted].forEach(function (c, j) { items.push({ v: r.v[j], c: c, n: j === 1 ? r.zh : '' }); });
        });
        bars(ctx, C, g.w, g.h, items, 1, '');
        tb.row(['设置', 'CHIP', 'FALCON（不柔顺）', '不加外力训'], true);
        TABLE2.forEach(function (r) { tb.row([r.zh].concat(r.v.map(function (v) { return f1(v) + '（' + Math.round(v * T2_TRIALS) + ' / ' + T2_TRIALS + '）'; }))); });
        tb.row(['平均', '0.8（16 / 20）', '0.05（1 / 20）', '0.4（8 / 20）']);
        verdict.set('绿 CHIP、蓝 FALCON、灰 不加外力训，柱越高越好。抓的时候 CHIP 设 $1/k=0.04$；一直很硬的 FALCON 反而最差：两边对顶把物体挤飞。', 'good');
      } else if (state.view === 'disp') {
        var x0 = 50, x1 = g.w - 14, y0 = g.h - 30, y1 = 16;
        var px = function (v) { return x0 + v / 0.15 * (x1 - x0); }, py = function (v) { return y0 - v / 0.6 * (y0 - y1); };
        [0, 0.2, 0.4, 0.6].forEach(function (v) { line(ctx, [[x0, py(v)], [x1, py(v)]], C.grid, 1); text(ctx, f1(v) + ' m', x0 - 6, py(v), C.text, 'right', '10px sans-serif'); });
        [0, 0.05, 0.1, 0.15].forEach(function (v) { text(ctx, String(v), px(v), y0 + 14, C.text, 'center', '10px sans-serif'); });
        line(ctx, DISP_K.map(function (k, i) { return [px(k), py(DISP_CHIP[i])]; }), C.accent, 2.4);
        line(ctx, DISP_K.map(function (k, i) { return [px(k), py(DISP_RT[i])]; }), C.bad, 2.4);
        line(ctx, [[px(0), py(0)], [px(0.03), py(0.6)]], C.muted, 1.6, [5, 4]);
        text(ctx, '蓝：CHIP　红：只改奖励　灰虚线：按 20 × 1/k 算', x0 + 6, y1 + 4, C.text, 'left', '11px sans-serif');
        tb.row(['1/k'].concat(DISP_K.map(String)), true);
        tb.row(['CHIP [m]'].concat(DISP_CHIP.map(f2)));
        tb.row(['只改奖励 [m]'].concat(DISP_RT.map(f2)));
        tb.row(['按式子 20/k [m]'].concat(DISP_K.map(function (k) { return f2(DISP_F * k); })));
        verdict.set('CHIP 的位移随 $1/k$ 单调变大，基线一直在 0.07–0.10 m。但 0.05 时实测 0.27 m，只有式子的 27%。', 'warn');
      } else if (state.view === 'k') {
        var items2 = FIG7B.map(function (b) { return { v: b[0], c: C.purple, n: b[1], t: f2(b[0]) }; });
        bars(ctx, C, g.w / 2, g.h, items2, 0.06, '');
        var gx0 = g.w / 2 + 30, gx1 = g.w - 20, gy = g.h / 2;
        var gx = function (v) { return gx0 + v / 0.6 * (gx1 - gx0); };
        line(ctx, [[gx0, gy], [gx1, gy]], C.grid, 2);
        [0, 0.2, 0.4, 0.6].forEach(function (v) { text(ctx, f1(v), gx(v), gy + 16, C.text, 'center', '10px sans-serif'); });
        ANCHORS.forEach(function (a) { ctx.fillStyle = C.text; ctx.fillRect(gx(a[0]) - 5, gy - 5, 10, 10); text(ctx, a[1], gx(a[0]), gy - 14, C.text, 'center', '10px sans-serif'); });
        GEMINI.forEach(function (o, i) { ctx.beginPath(); ctx.arc(gx(o.v), gy + 30 + (i % 4) * 10, 4, 0, 6.283); ctx.fillStyle = o.ok ? C.good : C.bad; ctx.fill(); });
        text(ctx, '左：图 7b 的 1/k　右：项目页的 10/k（方块是锚点，绿稳、红不稳）', 10, 12, C.text, 'left', '11px sans-serif');
        tb.row(['箱子里装的', 'Gemini / 试的 10/k', '结果'], true);
        GEMINI.forEach(function (o) { tb.row([o.zh, String(o.v), o.ok ? '稳' : o.why]); });
        verdict.set('图 7b：空箱 0.05、约 4 磅 0.03、约 7 磅 0.02；项目页写成 10/k 就是 0.5 / 0.3 / 0.2。装哑铃的箱子 Gemini 预测 0.25 正好落在 0.2 和 0.3 之间。', 'good');
      } else {
        bars(ctx, C, g.w, g.h, VLA.map(function (v) { return { v: v.succ, c: C.good, n: v.zh, t: v.succ + '%' }; }), 100, '');
        tb.row(['任务', '示范数', '柔顺设定', '成功率（20 次）'], true);
        VLA.forEach(function (v) { tb.row([v.zh, String(v.demos), v.k, v.succ + '%（' + Math.round(v.succ / 100 * VLA_N) + ' / ' + VLA_N + '）']); });
        verdict.set('三个任务一共 800 条示范，擦大白板一个就占一半，成功率却最低：要全擦干净，字还会被手挡住、或出了视野。', 'good');
      }
    }
    registerRenderer(render);
    render();
  }

  K.mount({
    'chip-explainer': buildExplainerDemo,
    'chip-video': buildVideoDemo,
    'chip-hindsight': buildHindsightDemo,
    'chip-damper': buildDamperDemo,
    'chip-results': buildResultsDemo
  });
})();
