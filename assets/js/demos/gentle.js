/* Interactive GentleHumanoid explainer for
 * papers/04_Loco-Manipulation_and_WBC/GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["gentle"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   gentle-explainer — 七幕讲解动画：跟踪策略把外力当扰动硬顶回去 → 阻抗参考动力学
 *     （虚拟质量 + 弹簧阻尼，4 × 0.005 s 子步）→ 两种交互弹簧（抵抗 / 引导，单侧投影）→
 *     受力暴露的多样性 → 安全力阈值 → 教师—学生策略与柔顺奖励 → 定量证据与局限
 *
 * 第 2–6 幕里的算例（参考动力学积分、平衡点、阈值换算、奖励核）都在这里现算，
 * 与笔记「🚶 具体实例」是同一组数字；tests/test_paper_demos.py 会按同样的公式复算。
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

  // ─── 论文附录 Table II / III 与训练仓库 MotionTrackingCommand_impedance ─────
  var MASS = 0.1; // kg，每个 link 的虚拟质量
  var DAMP = 2.0; // 积分阻尼 D
  var DT = 0.005; // s，Isaac 物理步长；每个策略步积 4 个子步
  var SUBSTEPS = 4;
  var POLICY_HZ = 50;
  var KP_DIST = 0.05; // m：K_p = τ_safe / 0.05
  var TAU_LO = 5,
    TAU_HI = 15,
    TAU_DEF = 10; // N
  var KS_LO = 5,
    KS_HI = 250; // N/m，交互弹簧刚度
  var F_MAX = 30; // N，单个 link 的交互力上限
  var NET_F = 30,
    NET_M = 20; // 躯干处净力 / 净力矩上限
  var V_CLIP = 4,
    A_CLIP = 1000;
  var DELTA_TOL = 10; // N，不安全力惩罚的容差
  var N_POSTURES = 5414; // hand_grid_samples.pt：每侧 5414 组（肩、腕、手）位置
  var MODE_P = [0.4, 0.15, 0.15, 0.15, 0.15]; // 代码：无力 / 全部 / 左臂 / 右臂 / 随机子集
  var PARTIAL_P = 0.5; // 随机子集里每个 link 被选中的概率
  var PAPER_P = [0.4, 0.15, 0.3, 0.15]; // 论文正文：无力 / 双臂 6 个 / 单臂 3 个 / 单个 link

  function kp(tau) {
    return tau / KP_DIST;
  }
  function kd(tau) {
    return 2 * Math.sqrt(MASS * kp(tau));
  }
  function clampAbs(f, m) {
    return Math.max(-m, Math.min(m, f));
  }

  // ─── 例 1：一维的参考动力学（引导接触把手腕往外拉，示意）────────────
  /* 沿拉力方向取一维坐标：目标位置在 0，采样得到的锚点在 +0.15 m，交互弹簧 K_s = 150。
     交互力只在「连杆位于锚点与参考之间」时存在（单侧投影），驱动力按 τ_safe 截断。 */
  var ANCHOR = 0.15; // m（示意）
  var KS = 150; // N/m（示意，在 5–250 范围内）
  function fExt(x) {
    return clampAbs(KS * Math.max(ANCHOR - x, 0), F_MAX);
  }
  function simulate(tau, steps) {
    var x = 0,
      v = 0,
      out = [];
    for (var i = 0; i < steps; i++) {
      var fd = clampAbs(kp(tau) * (0 - x) + kd(tau) * (0 - v), tau);
      var fe = fExt(x);
      var a = clampAbs((fd + fe - DAMP * v) / MASS, A_CLIP);
      v = clampAbs(v + a * DT, V_CLIP);
      x = x + v * DT;
      out.push({ fd: fd, fe: fe, a: a, v: v, x: x });
    }
    return out;
  }
  var SIM10 = simulate(TAU_DEF, 100); // 0.5 s
  var STEP1 = SIM10.slice(0, SUBSTEPS); // 第一个策略步的 4 个子步
  function equilibrium(tau) {
    var free = (KS * ANCHOR) / (kp(tau) + KS); // 驱动力不截断时的平衡点
    if (kp(tau) * free <= tau + 1e-9) return { x: free, f: kp(tau) * free, free: free };
    return { x: ANCHOR - tau / KS, f: tau, free: free }; // 截断后：交互力 = τ
  }
  var EQ = [TAU_LO, TAU_DEF, TAU_HI].map(function (t) {
    var e = equilibrium(t);
    e.tau = t;
    return e;
  }); // 11.7 cm / 8.3 cm / 5.0 cm
  var RIGID_F = KS * ANCHOR; // 22.5 N：完全不让时的交互力

  // ─── 例 2：安全阈值与压强换算（§III-D）─────────────────────────────
  var MIN_AREA_CM2 = 0.25; // 0.5 cm × 0.5 cm
  var HUG_AREA_CM2 = 16;
  var P_MIN_AREA = TAU_HI / MIN_AREA_CM2; // 60 N/cm²
  var P_HUG_LO = (TAU_LO / HUG_AREA_CM2) * 10; // kPa：1 N/cm² = 10 kPa → 3.1
  var P_HUG_HI = (TAU_HI / HUG_AREA_CM2) * 10; // 9.4 kPa
  var ISO_BACK = 160,
    ISO_CHEST = 120; // N/cm²
  var COMFORT_KPA = 13;

  // ─── 例 3：奖励核（代码用 exp(-e/σ)，多个 σ 取平均）──────────────────
  function expSigma(e, sigmas) {
    return (
      sigmas.reduce(function (s, sg) {
        return s + Math.exp(-e / sg);
      }, 0) / sigmas.length
    );
  }
  var R_POS = expSigma(0.02, [0.3]); // 位置差 2 cm → 0.936
  var R_FORCE = expSigma(2, [8, 4]); // 力差 2 N → 0.693
  var PEN_LINE = TAU_DEF + DELTA_TOL; // 20 N

  // ─── 例 4：接触组合的期望 link 数 ─────────────────────────────────
  var E_LINKS_CODE = MODE_P[1] * 6 + MODE_P[2] * 3 + MODE_P[3] * 3 + MODE_P[4] * 6 * PARTIAL_P; // 2.25
  var E_LINKS_PAPER = PAPER_P[1] * 6 + PAPER_P[2] * 3 + PAPER_P[3] * 1; // 1.95

  // ─── 论文实验数字 ───────────────────────────────────────────────────
  var MARK10 = { extreme: 51.14, vanilla: 24.59 };
  var MARK_RATIO = MARK10.extreme / MARK10.vanilla; // 2.08
  var TAXEL_MM2 = 36; // 6 mm × 6 mm
  var TAXEL_N_100KPA = 100e3 * TAXEL_MM2 * 1e-6; // 3.6 N

  // ─── 画图小工具 ─────────────────────────────────────────────────────
  function box(g, x, y, w, h, fill, stroke, sw) {
    var r = paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 8, 'stroke-width': sw || 1.3 }), fill, stroke);
    g.appendChild(r);
    return r;
  }
  function line(g, a, b, color, w, dash) {
    var l = paint(svgEl('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], 'stroke-width': w || 1.5, 'stroke-linecap': 'round' }), null, color);
    if (dash) l.setAttribute('stroke-dasharray', dash);
    g.appendChild(l);
    return l;
  }
  function arrow(g, a, b, marker, color, w) {
    var p = paint(svgEl('path', { d: polyPath([a, b]), fill: 'none', 'stroke-width': w || 2, 'marker-end': marker }), null, color);
    g.appendChild(p);
    return p;
  }
  function hbar(g, x, y, label, v, max, w, color, txt, labelW) {
    var lw = labelW || 110;
    g.appendChild(svgText(x, y + 9, label, 'demo-x-ink2', 9.5));
    g.appendChild(paint(svgEl('rect', { x: x + lw, y: y, width: Math.max(1, (v / max) * w), height: 11, rx: 2 }), color));
    g.appendChild(svgText(x + lw + Math.max(1, (v / max) * w) + 5, y + 9, txt, 'demo-x-mono', 9));
  }
  /* 一条平面上臂链：肩 → 肘 → 腕 → 手；角度以度计，0° 指向 +x，逆时针为正。 */
  function armChain(color, w) {
    var g = svgEl('g', {});
    var up = line(g, [0, 0], [0, 0], color, w);
    var fore = line(g, [0, 0], [0, 0], color, w);
    var dots = [0, 1, 2].map(function () {
      var c = paint(svgEl('circle', { r: 5 }), color);
      g.appendChild(c);
      return c;
    });
    function pose(sx, sy, a1, a2, l1, l2) {
      var r1 = (a1 * Math.PI) / 180,
        r2 = (a2 * Math.PI) / 180;
      var e = [sx + l1 * Math.cos(r1), sy - l1 * Math.sin(r1)];
      var h = [e[0] + l2 * Math.cos(r2), e[1] - l2 * Math.sin(r2)];
      [[up, [sx, sy], e], [fore, e, h]].forEach(function (s) {
        s[0].setAttribute('x1', s[1][0].toFixed(1));
        s[0].setAttribute('y1', s[1][1].toFixed(1));
        s[0].setAttribute('x2', s[2][0].toFixed(1));
        s[0].setAttribute('y2', s[2][1].toFixed(1));
      });
      [[sx, sy], e, h].forEach(function (p, k) {
        dots[k].setAttribute('cx', p[0].toFixed(1));
        dots[k].setAttribute('cy', p[1].toFixed(1));
      });
      return { s: [sx, sy], e: e, h: h };
    }
    return { el: g, pose: pose };
  }

  // ─── 第 1 幕：跟踪策略把外力当扰动 ─────────────────────────────────
  function buildSceneProblem() {
    var s = sceneSvg(
      '普通跟踪策略把外力当扰动，手臂被拉时硬顶回去、躯干跟着晃；GentleHumanoid 让肩、肘、手整条上肢一起顺着外力让开，且力度可调'
    );
    s.appendChild(svgText(56, 26, '拥抱、搀扶、托气球：接触落在整条上肢，而不只是手', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'gentle-x-arrow-pull', C_BAD);

    function panel(x0, title, color, yielding) {
      var g = svgEl('g', {});
      box(g, x0, 44, 350, 220, C_SURFACE, color, 1.3);
      g.appendChild(paint(svgText(x0 + 16, 66, title, null, 11), color));
      var torso = paint(svgEl('rect', { x: x0 + 60, y: 108, width: 46, height: 110, rx: 10, 'stroke-width': 1.4 }), C_SURFACE2, C_BORDER);
      g.appendChild(torso);
      g.appendChild(paint(svgEl('circle', { cx: x0 + 83, cy: 92, r: 12, 'stroke-width': 1.4 }), C_SURFACE2, C_BORDER));
      line(g, [x0 + 40, 240], [x0 + 330, 240], C_BORDER, 1.5);
      var arm = armChain(color, 4);
      g.appendChild(arm.el);
      var pull = arrow(g, [0, 0], [0, 0], mk, C_BAD, 2.5);
      var gauge = paint(svgText(x0 + 330, 232, '', null, 11, 'end'), color);
      g.appendChild(gauge);
      s.appendChild(g);
      return { g: g, torso: torso, arm: arm, pull: pull, gauge: gauge, x0: x0, yielding: yielding };
    }
    var rigid = panel(40, '跟踪 RL：把外力当扰动', C_BAD, false);
    var gentle = panel(410, 'GentleHumanoid：整条链一起让', C_GOOD, true);

    var req = svgEl('g', {});
    [
      { t: '① 多 link 协调', d: '肩、肘、手可能同时受力，力要沿运动链协调' },
      { t: '② 从轻柔到有力', d: '握手 / 托气球要软，扶人站起要稳，都得在安全阈值内' }
    ].forEach(function (r, k) {
      var x = 40 + k * 370;
      box(req, x, 280, 350, 56, C_SURFACE2, C_ACCENT, 1.2);
      req.appendChild(paint(svgText(x + 14, 302, r.t, null, 11), C_ACCENT));
      req.appendChild(svgText(x + 14, 322, r.d, 'demo-x-mut', 9.5));
    });
    s.appendChild(req);

    var foot = paint(svgText(400, 366, '已有的阻抗 / 导纳 + RL 只管基座或末端，而且多是为了「扛住大力」', null, 12, 'middle'), C_ACCENT);
    s.appendChild(foot);
    var foot2 = svgText(400, 390, 'GentleHumanoid：把阻抗模型写进全身跟踪的参考，让策略学会「有分寸地让」', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(foot2);

    function drawPanel(p, u) {
      var sx = p.x0 + 100,
        sy = 124;
      var lean = p.yielding ? 0 : 8 * u; // 硬顶：躯干被带着前倾
      p.torso.setAttribute('transform', 'rotate(' + lean.toFixed(1) + ' ' + (p.x0 + 83) + ' 218)');
      var a1 = p.yielding ? -20 + 18 * u : -20 + 2 * u;
      var a2 = p.yielding ? -5 + 20 * u : -5 + 3 * u;
      var j = p.arm.pose(sx + lean * 1.1, sy, a1, a2, 70, 64);
      var hx = j.h[0],
        hy = j.h[1];
      p.pull.setAttribute('d', polyPath([[hx + 8, hy], [hx + 58, hy - 4]]));
      var f = p.yielding ? TAU_DEF : MARK10.vanilla;
      p.gauge.textContent = u > 0.05 ? '手腕处力 ≈ ' + fmt(f * u, 1) + ' N' : '';
    }

    function draw(t) {
      setOpacity(rigid.g, seg(t, 0.3, 1.0));
      setOpacity(gentle.g, seg(t, 3.4, 4.1));
      drawPanel(rigid, ease(seg(t, 1.2, 3.0)));
      drawPanel(gentle, ease(seg(t, 4.2, 6.0)));
      setOpacity(req, seg(t, 6.8, 7.5));
      setOpacity(foot, seg(t, 9.0, 9.6));
      setOpacity(foot2, seg(t, 10.0, 10.6));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 2 幕：阻抗参考动力学 ───────────────────────────────────────
  var RP = { x0: 440, y0: 92, w: 300, h: 170, tmax: 0.5, zmax: 0.14 };
  function rpX(t) {
    return RP.x0 + (t / RP.tmax) * RP.w;
  }
  function rpY(z) {
    return RP.y0 + RP.h - (z / RP.zmax) * RP.h;
  }

  function buildSceneRefDyn() {
    var s = sceneSvg(
      '每个上肢关键点被建成一个 0.1 千克的虚拟质量，受驱动弹簧阻尼与交互力共同作用，每个策略步用 4 个 0.005 秒子步积分，得到策略要跟踪的柔顺参考'
    );
    s.appendChild(svgText(56, 26, '先算「应该怎么让」，再让策略去跟：参考不是原动作，而是积分出来的', 'demo-x-ink2', 13.5));
    var eq = svgMath(400, 58, 'M\\ddot{x} = f_{\\mathrm{drive}} + f_{\\mathrm{interact}} - D\\dot{x}, \\quad f_{\\mathrm{drive}} = K_p(x_{\\mathrm{tar}}-x) + K_d(v_{\\mathrm{tar}}-\\dot{x})', {
      size: 14,
      w: 700,
      anchor: 'middle'
    });
    eq.setTone('var(--demo-accent)');
    s.appendChild(eq);

    var par = svgEl('g', {});
    box(par, 40, 80, 370, 190, C_SURFACE, C_BORDER, 1.2);
    par.appendChild(svgText(56, 102, '参数（附录 Table III + 训练代码）', 'demo-x-ink2', 10.5));
    [
      ['虚拟质量 $M$', MASS + ' kg'],
      ['$K_p = \\tau_{\\mathrm{safe}} / ' + KP_DIST + '$', fmt(kp(TAU_DEF), 0) + ' N/m（$\\tau = ' + TAU_DEF + '$ N）'],
      ['$K_d = 2\\sqrt{M K_p}$（临界阻尼）', fmt(kd(TAU_DEF), 2) + ' N·s/m'],
      ['积分阻尼 $D$', DAMP + ''],
      ['子步', SUBSTEPS + ' × ' + DT + ' s = 1 个策略步'],
      ['截断', '$|v| \\le ' + V_CLIP + '$ m/s，$|a| \\le ' + A_CLIP + '$ m/s²']
    ].forEach(function (r, k) {
      par.appendChild(svgRich(56, 128 + k * 22, r[0], { size: 9.5, cls: 'demo-x-mut' }));
      par.appendChild(svgRich(394, 128 + k * 22, r[1], { size: 9.5, cls: 'demo-x-mono', anchor: 'end' }));
    });
    s.appendChild(par);

    var plot = svgEl('g', {});
    box(plot, 420, 80, 340, 190, C_SURFACE, C_BORDER, 1.2);
    plot.appendChild(svgRich(436, 100, '手腕被拉：锚点 +0.15 m、$K_s = ' + KS + '$（示意）', { size: 9, cls: 'demo-x-mut' }));
    line(plot, [RP.x0, RP.y0 + RP.h], [RP.x0 + RP.w, RP.y0 + RP.h], C_BORDER, 1);
    line(plot, [RP.x0, RP.y0], [RP.x0, RP.y0 + RP.h], C_BORDER, 1);
    var eq10 = EQ[1];
    line(plot, [RP.x0, rpY(eq10.x)], [RP.x0 + RP.w, rpY(eq10.x)], C_GOOD, 1.2, '4 3');
    plot.appendChild(paint(svgText(RP.x0 + RP.w, rpY(eq10.x) - 5, '平衡 ' + fmt(eq10.x * 100, 1) + ' cm', null, 8.5, 'end'), C_GOOD));
    var pts = [[RP.x0, rpY(0)]];
    SIM10.forEach(function (r, i) {
      pts.push([rpX((i + 1) * DT), rpY(r.x)]);
    });
    var curve = paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': 2.4 }), null, C_ACCENT);
    plot.appendChild(curve);
    plot.appendChild(svgRich(RP.x0 + RP.w / 2, RP.y0 + RP.h + 16, '$t$ (s)，0–0.5 s；纵轴：参考点偏离目标 (m)', { size: 8.5, cls: 'demo-x-mut', anchor: 'middle' }));
    var s1 = STEP1[SUBSTEPS - 1];
    var mark1 = paint(svgEl('circle', { cx: rpX(SUBSTEPS * DT), cy: rpY(s1.x), r: 4.5 }), C_BAD);
    plot.appendChild(mark1);
    s.appendChild(plot);

    var tab = svgEl('g', {});
    box(tab, 40, 284, 720, 76, C_SURFACE2, C_WARN, 1.2);
    tab.appendChild(svgRich(56, 304, '第一个策略步的 4 个子步（$\\tau = 10$ N，从静止开始）', { size: 10 }).setTone(C_WARN));
    STEP1.forEach(function (r, k) {
      var x = 56 + k * 176;
      tab.appendChild(svgRich(x, 326, '子步 ' + (k + 1) + '：$f_d = ' + fmt(r.fd, 1) + '$，$f_i = ' + fmt(r.fe, 2) + '$', { size: 8.5, w: 170 }));
      tab.appendChild(svgRich(x, 344, '$v = ' + fmt(r.v, 3) + '$，$x = ' + fmt(r.x, 4) + '$', { size: 8.5, w: 170 }));
    });
    s.appendChild(tab);

    var foot = paint(svgText(400, 392, '驱动力第 2 个子步就撞上 10 N 的上限；参考先冲过头，再落到平衡点 —— 策略跟踪的就是这条曲线', null, 11.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(eq, seg(t, 0.3, 1.0));
      setOpacity(par, seg(t, 1.4, 2.1));
      setOpacity(plot, seg(t, 5.4, 6.0));
      var u = seg(t, 6.0, 9.0);
      curve.setAttribute('stroke-dasharray', 700 * u + ' 700');
      setOpacity(mark1, seg(t, 6.2, 6.8));
      setOpacity(tab, seg(t, 9.4, 10.1));
      setOpacity(foot, seg(t, 12.0, 12.6));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 3 幕：两种交互弹簧 ─────────────────────────────────────────
  function buildSceneContacts() {
    var s = sceneSvg(
      '同一个弹簧公式描述两种接触：抵抗式接触把锚点固定在刚接触的位置，引导式接触从人类动作的整条手臂姿态里采样锚点；力只在压向锚点的一侧产生'
    );
    s.appendChild(svgText(56, 26, '同一个公式、两种锚点：接触力不从仿真碰撞里来，而是造出来的', 'demo-x-ink2', 13.5));
    var eq = svgMath(400, 58, 'f_{\\mathrm{interact}} = K_{\\mathrm{spring}}\\,(x_{\\mathrm{anchor}} - x_{\\mathrm{cur}}), \\quad x_{\\mathrm{anchor}} \\in \\{\\, x_{\\mathrm{cur}}(t_0),\\ x_{\\mathrm{sample}} \\,\\}', {
      size: 14,
      w: 700,
      anchor: 'middle'
    });
    eq.setTone('var(--demo-accent)');
    s.appendChild(eq);
    var mk = K.arrowMarker(s, 'gentle-x-arrow-spring', C_WARN);

    var res = svgEl('g', {});
    box(res, 40, 80, 350, 200, C_SURFACE, C_WARN, 1.2);
    res.appendChild(paint(svgText(56, 102, '抵抗式接触：锚点 = 刚接触时的位置', null, 11), C_WARN));
    res.appendChild(paint(svgEl('rect', { x: 250, y: 118, width: 90, height: 130, rx: 6, 'stroke-width': 1.2 }), C_SURFACE2, C_BORDER));
    res.appendChild(svgText(295, 188, '人 / 物体', 'demo-x-mut', 9.5, 'middle'));
    var armR = armChain(C_ACCENT, 4);
    res.appendChild(armR.el);
    var anchorR = paint(svgEl('circle', { r: 6, 'stroke-width': 2 }), 'none', C_WARN);
    res.appendChild(anchorR);
    var springR = arrow(res, [0, 0], [0, 0], mk, C_WARN, 2);
    res.appendChild(svgText(56, 262, '继续往里压 → 弹簧把连杆推回锚点', 'demo-x-mut', 9.5));
    s.appendChild(res);

    var gui = svgEl('g', {});
    box(gui, 410, 80, 350, 200, C_SURFACE, C_GOOD, 1.2);
    gui.appendChild(paint(svgText(426, 102, '引导式接触：锚点 = 采样的人类手臂姿态', null, 11), C_GOOD));
    var ghost = armChain(C_MUTED, 3);
    ghost.el.setAttribute('stroke-dasharray', '4 3');
    gui.appendChild(ghost.el);
    var armG = armChain(C_ACCENT, 4);
    gui.appendChild(armG.el);
    var springsG = [0, 1, 2].map(function () {
      return arrow(gui, [0, 0], [0, 0], mk, C_GOOD, 1.8);
    });
    gui.appendChild(svgText(426, 250, '每侧 ' + N_POSTURES + ' 组（肩、腕、手）位置，躯干坐标系', 'demo-x-mono', 8.5));
    gui.appendChild(svgText(426, 266, '整条手臂一起被拉：三个锚点来自同一个姿态', 'demo-x-mut', 9.5));
    s.appendChild(gui);

    var one = svgEl('g', {});
    box(one, 40, 292, 720, 60, C_SURFACE2, C_ACCENT, 1.2);
    one.appendChild(paint(svgText(56, 314, '单侧投影（附录 A-3）：只取位移在「锚点 → 参考」方向上的分量，且只在压向锚点时有力', null, 10.5), C_ACCENT));
    one.appendChild(svgText(56, 336, '代码：coef = ((anchor − x) · dir).clamp_max(0)，f = K_spring · coef · dir；离开接触侧力就归零，不会在空中凭空把手拽回去', 'demo-x-mono', 8.5));
    s.appendChild(one);

    var foot = paint(svgText(400, 384, '为什么不直接用仿真碰撞力：它们只在碰撞时出现，又噪、又局部、又不协调', null, 12, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(eq, seg(t, 0.3, 1.0));
      setOpacity(res, seg(t, 1.2, 1.9));
      var u = ease(seg(t, 2.0, 4.0));
      var jr = armR.pose(100, 170, -8 + 6 * u, 8 + 4 * u, 90, 80);
      var anc = [252, jr.h[1]];
      anchorR.setAttribute('cx', anc[0]);
      anchorR.setAttribute('cy', anc[1]);
      var press = Math.max(0, jr.h[0] - 252);
      setOpacity(anchorR, seg(t, 3.0, 3.4));
      springR.setAttribute('d', polyPath([[jr.h[0], jr.h[1] + 16], [jr.h[0] - 10 - press, jr.h[1] + 16]]));
      setOpacity(springR, seg(t, 3.4, 3.8));

      setOpacity(gui, seg(t, 5.2, 5.9));
      var jg0 = ghost.pose(470, 205, 20, 55, 74, 64);
      var v = ease(seg(t, 6.4, 9.0));
      var jg = armG.pose(470, 205, -10 + 22 * v, 0 + 40 * v, 74, 64);
      [[jg.s, jg0.s], [jg.e, jg0.e], [jg.h, jg0.h]].forEach(function (p, k) {
        springsG[k].setAttribute('d', polyPath([p[0], [p[0][0] + (p[1][0] - p[0][0]) * 0.8, p[0][1] + (p[1][1] - p[0][1]) * 0.8]]));
        setOpacity(springsG[k], k === 0 ? 0 : seg(t, 6.0, 6.5));
      });
      setOpacity(one, seg(t, 9.6, 10.3));
      setOpacity(foot, seg(t, 11.6, 12.2));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 4 幕：受力暴露的多样性 ─────────────────────────────────────
  function buildSceneExposure() {
    var s = sceneSvg(
      '训练时随机决定哪些连杆受力、弹簧有多硬、持续多久：四成时间不加力，其余在双臂、单臂与随机子集之间切换，弹簧刚度在 5 到 250 之间变化，并限制躯干处的净力与净力矩'
    );
    s.appendChild(svgText(56, 26, '让策略见过足够多种「被碰」：哪几个 link、多硬、多久', 'demo-x-ink2', 13.5));

    var modes = svgEl('g', {});
    box(modes, 40, 44, 380, 206, C_SURFACE, C_BORDER, 1.2);
    modes.appendChild(svgText(56, 64, '接触组合（代码 force_type_probs）', 'demo-x-ink2', 10.5));
    var names = ['不加力', '双臂 6 个 link', '只左臂 3 个', '只右臂 3 个', '随机子集（每个 50%）'];
    MODE_P.forEach(function (p, k) {
      hbar(modes, 56, 78 + k * 24, names[k], p * 100, 50, 150, k === 0 ? C_MUTED : C_ACCENT, fmt(p * 100, 0) + '%', 124);
    });
    modes.appendChild(svgText(56, 212, '论文正文写的是「15% 只有单个 link」；代码是随机子集', 'demo-x-mut', 8.5));
    modes.appendChild(
      svgText(56, 230, '期望受力 link 数：代码 ' + fmt(E_LINKS_CODE, 2) + ' 个 vs 正文口径 ' + fmt(E_LINKS_PAPER, 2) + ' 个', 'demo-x-mono', 8.5)
    );
    s.appendChild(modes);

    var ks = svgEl('g', {});
    box(ks, 440, 44, 320, 206, C_SURFACE, C_BORDER, 1.2);
    ks.appendChild(svgText(456, 64, '弹簧刚度与时间表（代码）', 'demo-x-ink2', 10.5));
    var kx0 = 460,
      kw = 280;
    line(ks, [kx0, 92], [kx0 + kw, 92], C_BORDER, 6);
    var knob = paint(svgEl('circle', { cy: 92, r: 8 }), C_ACCENT);
    ks.appendChild(knob);
    ks.appendChild(svgText(kx0, 112, KS_LO + '', 'demo-x-mono', 9, 'middle'));
    ks.appendChild(svgText(kx0 + kw, 112, KS_HI + ' N/m', 'demo-x-mono', 9, 'middle'));
    /* 数字逐帧在变：公式只画一次，数字交给 svgText */
    var knobLbl = svgMath(kx0 + kw / 2, 80, 'K_s =', { size: 9.5, w: 40, anchor: 'end' });
    var knobTxt = svgText(kx0 + kw / 2, 80, '', 'demo-x-mono', 9.5);
    ks.appendChild(knobLbl);
    ks.appendChild(knobTxt);
    [
      '左右臂各抽一个 $K_s$，之后按 ±5 / 步的斜率慢慢漂',
      '一段受力持续 20–200 步（0.4–4 s），结束时渐退到 0',
      '锚点在 25–100 步内线性挪到新位置，不跳变',
      '安全阈值 $\\tau_{\\mathrm{safe}}$ 每 100–200 步重采样，渐变过去',
      '躯干处净力 ≤ ' + NET_F + ' N、净力矩 ≤ ' + NET_M + ' N·m，超了在躯干补反向力'
    ].forEach(function (l, k) {
      ks.appendChild(svgRich(456, 136 + k * 22, '• ' + l, { size: 8.8, cls: 'demo-x-mut' }));
    });
    s.appendChild(ks);

    var dist = svgEl('g', {});
    box(dist, 40, 262, 720, 64, C_SURFACE2, C_GOOD, 1.2);
    dist.appendChild(paint(svgText(56, 284, 'Fig. 3：这样造出来的力在球面上各个方向都有，大小 0–25 N', null, 10.5), C_GOOD));
    dist.appendChild(svgText(56, 306, '论文局限里也承认：肩部受力偏小 —— 力的分布受限于人类动作数据本身（肩的姿态变化少）', 'demo-x-mut', 9.5));
    s.appendChild(dist);

    var foot = paint(svgText(400, 360, '训练用 25 小时的人类动作（AMASS / InterX / LAFAN，GMR 重定向，50 Hz）', null, 12, 'middle'), C_ACCENT);
    s.appendChild(foot);
    var foot2 = svgText(400, 384, '代码里三者的采样权重是 0.4 / 0.2 / 0.4（InterX / LAFAN / AMASS）', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(foot2);

    function draw(t) {
      setOpacity(modes, seg(t, 0.4, 1.1));
      setOpacity(ks, seg(t, 4.0, 4.7));
      var u = 0.5 + 0.5 * Math.sin(t * 1.3);
      var kv = KS_LO + (KS_HI - KS_LO) * u;
      knob.setAttribute('cx', (kx0 + kw * u).toFixed(1));
      knobLbl.setX(kx0 + kw * u - 2);
      knobTxt.setAttribute('x', (kx0 + kw * u + 1).toFixed(1));
      knobTxt.textContent = fmt(kv, 0);
      setOpacity(dist, seg(t, 8.0, 8.7));
      setOpacity(foot, seg(t, 9.8, 10.4));
      setOpacity(foot2, seg(t, 10.6, 11.2));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 5 幕：安全力阈值 ───────────────────────────────────────────
  var TH = { x0: 80, y0: 96, w: 290, h: 150, emax: 0.1, fmax: 18 };
  function thX(e) {
    return TH.x0 + (e / TH.emax) * TH.w;
  }
  function thY(f) {
    return TH.y0 + TH.h - (f / TH.fmax) * TH.h;
  }

  function buildSceneThreshold() {
    var s = sceneSvg(
      '驱动力超过安全阈值就按比例缩到阈值；刚度取阈值除以 5 厘米，所以三档阈值都在偏离 5 厘米时封顶；同一个外拉下，阈值越低手臂让得越多、接触力越小'
    );
    s.appendChild(svgRich(56, 26, '一个旋钮调软硬：$\\tau_{\\mathrm{safe}}$ 从 5 N 到 15 N，部署时每按一次 ±1 N', { size: 13.5, cls: 'demo-x-ink2' }));
    var eq = svgMath(400, 58, 'f^{\\mathrm{limited}}_{\\mathrm{drive}} = \\min\\!\\left(1,\\ \\frac{\\tau_{\\mathrm{safe}}}{\\lVert f_{\\mathrm{drive}}\\rVert}\\right) f_{\\mathrm{drive}}, \\qquad K_p = \\tau_{\\mathrm{safe}} / 0.05', {
      size: 14,
      w: 640,
      anchor: 'middle'
    });
    eq.setTone('var(--demo-accent)');
    s.appendChild(eq);

    var plot = svgEl('g', {});
    box(plot, 40, 80, 360, 196, C_SURFACE, C_BORDER, 1.2);
    line(plot, [TH.x0, TH.y0 + TH.h], [TH.x0 + TH.w, TH.y0 + TH.h], C_BORDER, 1);
    line(plot, [TH.x0, TH.y0], [TH.x0, TH.y0 + TH.h], C_BORDER, 1);
    var cols = [C_GOOD, C_ACCENT, C_WARN];
    [TAU_LO, TAU_DEF, TAU_HI].forEach(function (tau, k) {
      var p = [];
      for (var i = 0; i <= 40; i++) {
        var e = (i / 40) * TH.emax;
        p.push([thX(e), thY(Math.min(kp(tau) * e, tau))]);
      }
      plot.appendChild(paint(svgEl('path', { d: polyPath(p), fill: 'none', 'stroke-width': 2.2 }), null, cols[k]));
      plot.appendChild(paint(svgText(TH.x0 + TH.w + 4, thY(tau) + 4, tau + ' N', null, 9), cols[k]));
    });
    line(plot, [thX(KP_DIST), TH.y0], [thX(KP_DIST), TH.y0 + TH.h], C_BAD, 1.2, '3 3');
    plot.appendChild(paint(svgText(thX(KP_DIST), TH.y0 + TH.h + 14, '5 cm：三档同时封顶', null, 8.5, 'middle'), C_BAD));
    plot.appendChild(svgText(56, 100, '驱动力 vs 偏离目标的距离', 'demo-x-mut', 9));
    s.appendChild(plot);

    var eqt = svgEl('g', {});
    box(eqt, 420, 80, 340, 196, C_SURFACE, C_BORDER, 1.2);
    eqt.appendChild(svgRich(436, 100, '同一个外拉（锚点 0.15 m、$K_s = ' + KS + '$）下的平衡', { size: 9.5, cls: 'demo-x-ink2' }));
    ['$\\tau_{\\mathrm{safe}}$', '让开', '接触力'].forEach(function (h, k) {
      eqt.appendChild(svgRich([436, 540, 640][k], 124, h, { size: 9.5, cls: 'demo-x-mut' }));
    });
    EQ.forEach(function (e, k) {
      var y = 148 + k * 24;
      eqt.appendChild(paint(svgText(436, y, e.tau + ' N', null, 10), cols[k]));
      eqt.appendChild(svgText(540, y, fmt(e.x * 100, 1) + ' cm', 'demo-x-mono', 10));
      eqt.appendChild(svgText(640, y, fmt(e.f, 1) + ' N', 'demo-x-mono', 10));
    });
    eqt.appendChild(paint(svgText(436, 222, '完全不让（刚性跟踪）', null, 10), C_BAD));
    eqt.appendChild(svgText(540, 222, '0.0 cm', 'demo-x-mono', 10));
    eqt.appendChild(svgText(640, 222, fmt(RIGID_F, 1) + ' N', 'demo-x-mono', 10));
    eqt.appendChild(svgRich(436, 250, '截断后平衡条件：$K_s\\,(0.15 - x) = \\tau_{\\mathrm{safe}}$', { size: 9, cls: 'demo-x-mut' }));
    eqt.appendChild(svgText(436, 266, '→ 接触力就等于你设的阈值', 'demo-x-mut', 9));
    s.appendChild(eqt);

    var iso = svgEl('g', {});
    box(iso, 40, 288, 720, 70, C_SURFACE2, C_GOOD, 1.2);
    iso.appendChild(paint(svgText(56, 308, '为什么是 5–15 N（§III-D）', null, 10.5), C_GOOD));
    iso.appendChild(
      svgText(56, 328, '最坏情况 0.5 × 0.5 cm 接触：' + TAU_HI + ' N / ' + MIN_AREA_CM2 + ' cm² = ' + fmt(P_MIN_AREA, 0) + ' N/cm²，低于 ISO/TS 15066 胸 ' + ISO_CHEST + '、背 / 肩 ' + ISO_BACK + ' N/cm²', 'demo-x-mono', 8.8)
    );
    iso.appendChild(
      svgText(56, 346, '拥抱接触约 ' + HUG_AREA_CM2 + ' cm²：' + TAU_LO + '–' + TAU_HI + ' N → ' + fmt(P_HUG_LO, 1) + '–' + fmt(P_HUG_HI, 1) + ' kPa，在康复研究建议的 ≤ ' + COMFORT_KPA + ' kPa 以内', 'demo-x-mono', 8.8)
    );
    s.appendChild(iso);

    var foot = paint(svgText(400, 388, '部署：握手 / 气球 5 N，抱人台 10 N，扶人站起用更高的阈值（论文没给具体值）', null, 12, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(eq, seg(t, 0.3, 1.0));
      setOpacity(plot, seg(t, 1.4, 2.1));
      setOpacity(eqt, seg(t, 5.4, 6.1));
      setOpacity(iso, seg(t, 9.4, 10.1));
      setOpacity(foot, seg(t, 12.0, 12.6));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 6 幕：教师—学生策略与柔顺奖励 ───────────────────────────────
  function buildScenePolicy() {
    var s = sceneSvg(
      '教师策略能看到参考动力学状态与真实交互力等特权信息，学生只看阈值、目标动作与本体历史；柔顺奖励由参考状态跟踪、参考力跟踪与不安全力惩罚三项组成'
    );
    s.appendChild(svgText(56, 26, '学生看不到力，却要表现得像「感觉得到力」', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'gentle-x-arrow-policy', C_BORDER);

    var tea = svgEl('g', {});
    box(tea, 40, 44, 350, 124, C_SURFACE, C_WARN, 1.2);
    tea.appendChild(paint(svgText(56, 66, '教师（仿真里才有的特权）', null, 11), C_WARN));
    ['参考动力学状态 $x_{\\mathrm{ref}}$、$\\dot{x}_{\\mathrm{ref}}$', '参考交互力 $f_{\\mathrm{interact}}$ 与仿真实测 $f_{\\mathrm{sim}}$', 'link 离地高度、上一步关节力矩、累计跟踪误差'].forEach(function (l, k) {
      tea.appendChild(svgRich(56, 90 + k * 22, '• ' + l, { size: 9.5, cls: 'demo-x-mut' }));
    });
    s.appendChild(tea);

    var stu = svgEl('g', {});
    box(stu, 410, 44, 350, 124, C_SURFACE, C_ACCENT, 1.2);
    stu.appendChild(paint(svgText(426, 66, '学生（真机可得）', null, 11), C_ACCENT));
    ['$\\tau_{\\mathrm{safe}}$（用户可调）+ 目标动作（未来根位姿、目标关节）', '根角速度、投影重力', '关节位置历史 [0,1,2,3,4,8] 步 + 最近 3 步动作'].forEach(function (l, k) {
      stu.appendChild(svgRich(426, 90 + k * 22, '• ' + l, { size: 9.5, cls: 'demo-x-mut' }));
    });
    stu.appendChild(svgText(426, 158, '→ 29 维关节位置目标，' + POLICY_HZ + ' Hz，交给底层 PD', 'demo-x-mono', 9));
    s.appendChild(stu);
    var arr = svgEl('g', {});
    arrow(arr, [392, 106], [406, 106], mk, C_BORDER, 2);
    s.appendChild(arr);

    var rw = svgEl('g', {});
    box(rw, 40, 180, 720, 124, C_SURFACE, C_BORDER, 1.2);
    rw.appendChild(svgText(56, 200, '柔顺奖励（Table I 权重）与一个算例', 'demo-x-ink2', 10.5));
    var rows = [
      ['参考状态跟踪 × 2.0', '仿真 link 与 $x_{\\mathrm{ref}}$ 差 2 cm：$\\exp(-0.02 / 0.3) = ' + fmt(R_POS, 3) + '$'],
      ['参考力跟踪 × 2.0', '实测力比参考大 2 N：$[\\exp(-2/8) + \\exp(-2/4)] / 2 = ' + fmt(R_FORCE, 3) + '$'],
      ['不安全力惩罚 × 6.0', '$\\lVert f\\rVert > \\tau_{\\mathrm{safe}} + ' + DELTA_TOL + '$ N 才罚：$\\tau = ' + TAU_DEF + '$ 时门槛 ' + PEN_LINE + ' N（代码还要求超出参考 5 N）']
    ];
    rows.forEach(function (r, k) {
      rw.appendChild(paint(svgText(56, 226 + k * 24, r[0], null, 10), k === 2 ? C_BAD : C_ACCENT));
      rw.appendChild(svgRich(200, 226 + k * 24, r[1], { size: 9, cls: 'demo-x-mono' }));
    });
    rw.appendChild(svgRich(56, 296, '论文把核写成 $\\exp(-\\lVert\\cdot\\rVert^2/\\sigma)$；开源代码是 $\\exp(-\\lVert\\cdot\\rVert/\\sigma)$，并对几个 $\\sigma$ 取平均 —— 上面按代码算', { size: 8.8, cls: 'demo-x-mut' }));
    s.appendChild(rw);

    var foot = paint(svgText(400, 334, '其余奖励照搬全身跟踪：根 / 关节跟踪、存活 5.0、落地冲击、打滑、动作变化率、关节限位', null, 11.5, 'middle'), C_ACCENT);
    s.appendChild(foot);
    var foot2 = svgText(400, 358, '师生都用 PPO，架构与训练流程沿用 FACET；数据 25 小时（AMASS + InterX + LAFAN）', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(foot2);
    var foot3 = svgText(400, 382, '对照组：Vanilla-RL（不加力）与 Extreme-RL（末端随机加到 30 N 的扰动）', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(foot3);

    function draw(t) {
      setOpacity(tea, seg(t, 0.4, 1.1));
      setOpacity(stu, seg(t, 2.4, 3.1));
      setOpacity(arr, seg(t, 3.2, 3.8));
      setOpacity(rw, seg(t, 5.0, 5.7));
      setOpacity(foot, seg(t, 10.0, 10.6));
      setOpacity(foot2, seg(t, 10.8, 11.4));
      setOpacity(foot3, seg(t, 11.6, 12.2));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 7 幕：定量证据与局限 ───────────────────────────────────────
  function buildSceneEvidence() {
    var s = sceneSvg(
      '仿真拥抱被外拉时手部力稳在约 10 牛，基线在 13 到 20 牛以上；真机拉动手腕，Extreme-RL 要 51 牛、Vanilla-RL 要 25 牛，GentleHumanoid 维持在设定阈值附近'
    );
    s.appendChild(svgText(56, 26, '峰值力降下来，任务照样完成', 'demo-x-ink2', 13.5));

    var g1 = svgEl('g', {});
    box(g1, 40, 44, 350, 150, C_SURFACE, C_BORDER, 1.2);
    g1.appendChild(svgText(56, 64, 'Fig. 4 · 仿真：拥抱中被往外拉（手部力）', 'demo-x-ink2', 9.5));
    hbar(g1, 56, 80, 'GentleHumanoid', 10, 25, 150, C_GOOD, '≈ 10 N', 110);
    hbar(g1, 56, 104, 'Extreme-RL', 13, 25, 150, C_WARN, '> 13 N', 110);
    hbar(g1, 56, 128, 'Vanilla-RL', 20, 25, 150, C_BAD, '> 20 N', 110);
    g1.appendChild(svgText(56, 164, '肘 / 肩：基线很快饱和到 15–20 N，GentleHumanoid 7–10 N', 'demo-x-mut', 8.8));
    g1.appendChild(svgText(56, 182, '（数值是论文正文对曲线的描述，不是表格）', 'demo-x-mut', 8.5));
    s.appendChild(g1);

    var g2 = svgEl('g', {});
    box(g2, 410, 44, 350, 150, C_SURFACE, C_BORDER, 1.2);
    g2.appendChild(svgText(426, 64, 'Fig. 5 · 真机：用 Mark-10 推拉手腕的峰值力', 'demo-x-ink2', 9.5));
    hbar(g2, 426, 80, 'Extreme-RL', MARK10.extreme, 60, 150, C_WARN, fmt(MARK10.extreme, 2) + ' N', 90);
    hbar(g2, 426, 104, 'Vanilla-RL', MARK10.vanilla, 60, 150, C_BAD, fmt(MARK10.vanilla, 2) + ' N', 90);
    hbar(g2, 426, 128, 'Gentle（10 N）', TAU_DEF, 60, 150, C_GOOD, '≈ 阈值，5–15 N', 90);
    g2.appendChild(svgText(426, 164, '基线不是手臂让开，而是躯干被带着走、容易失衡', 'demo-x-mut', 8.8));
    g2.appendChild(svgText(426, 182, 'Extreme / Vanilla = ' + fmt(MARK_RATIO, 2) + ' 倍', 'demo-x-mono', 8.8));
    s.appendChild(g2);

    var g3 = svgEl('g', {});
    box(g3, 40, 206, 720, 88, C_SURFACE, C_BORDER, 1.2);
    g3.appendChild(svgRich(56, 226, '拥抱人台（$\\tau = 10$ N）+ 气球（$\\tau = 5$ N）', { size: 10, cls: 'demo-x-ink2' }));
    g3.appendChild(svgText(56, 246, '人台腰上贴 40 个电容 taxel 的压力垫；每个 taxel 按 6 × 6 mm 算面积：100 kPa ≈ ' + fmt(TAXEL_N_100KPA, 1) + ' N', 'demo-x-mono', 9));
    g3.appendChild(svgText(56, 264, '对齐 / 故意错位两种条件下，GentleHumanoid 的力都有界且平稳；基线出现局部高压峰值或抱不住', 'demo-x-mut', 9.5));
    g3.appendChild(svgText(56, 282, '气球：GentleHumanoid 托住不破；两个基线越挤越狠，最后 G1 失衡把气球弄掉', 'demo-x-mut', 9.5));
    s.appendChild(g3);

    var lim = svgEl('g', {});
    box(lim, 40, 304, 720, 62, C_SURFACE2, C_WARN, 1.2);
    lim.appendChild(paint(svgText(56, 324, '局限（§V）', null, 10.5), C_WARN));
    lim.appendChild(svgText(56, 344, '真机偶有 1–3 N 超调；弹簧模型没有摩擦与组织黏弹性；肩部受力样本少；人的位置与身高仍靠动捕', 'demo-x-mut', 9.5));
    lim.appendChild(svgText(56, 360, '部署仓库的 TODO：视频 → G1 的完整流程、行走与动作跟踪的切换模块尚未开源', 'demo-x-mut', 9));
    s.appendChild(lim);

    var foot = paint(svgText(400, 394, 'GentleHumanoid = 阻抗参考动力学 + 造出来的多 link 交互力 + 可调安全阈值', null, 12, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(g1, seg(t, 0.4, 1.1));
      setOpacity(g2, seg(t, 3.2, 3.9));
      setOpacity(g3, seg(t, 6.2, 6.9));
      setOpacity(lim, seg(t, 9.2, 9.9));
      setOpacity(foot, seg(t, 11.6, 12.2));
    }
    return { el: s, draw: draw };
  }

  var GENTLE_SCENES = [
    {
      title: '跟踪策略把外力当扰动',
      dur: 12,
      build: buildSceneProblem,
      cues: [
        { at: 0.4, s: '普通全身跟踪 RL 的目标是「别偏离参考」：手腕被拉，它就把外力当扰动顶回去。' },
        { at: 2.2, s: '结果是手臂不动、躯干被带着晃；真机上把 Vanilla-RL 的手腕拉开要 **' + fmt(MARK10.vanilla, 2) + ' N**。' },
        { at: 4.2, s: 'GentleHumanoid：肩、肘、手整条链一起顺着外力让开，力度停在设定的阈值附近。' },
        { at: 6.8, s: '两个难点：**多 link 协调**，以及**从轻柔到有力**都得在安全阈值内。' },
        { at: 9.2, s: '已有的阻抗 / 导纳 + RL 只管基座或末端，主要为了扛住大力，而不是柔顺。' }
      ]
    },
    {
      title: '阻抗参考动力学',
      dur: 14,
      build: buildSceneRefDyn,
      cues: [
        { at: 0.4, s: '每个关键点是一个虚拟质量：$M\\ddot{x} = f_{\\mathrm{drive}} + f_{\\mathrm{interact}} - D\\dot{x}$，$M = ' + MASS + '$ kg。' },
        { at: 2.0, s: '驱动力是朝目标动作的弹簧阻尼：$K_p = \\tau_{\\mathrm{safe}}/0.05$，$\\tau = 10$ N 时 **' + fmt(kp(TAU_DEF), 0) + ' N/m**，$K_d = 2\\sqrt{MK_p} = ' + fmt(kd(TAU_DEF), 2) + '$。' },
        { at: 4.2, s: '每个 50 Hz 策略步积 **' + SUBSTEPS + ' × ' + DT + ' s** 子步（先更新速度再更新位置）。' },
        { at: 6.2, s: '算例：手腕被拉向 +0.15 m 的锚点，$K_s = ' + KS + '$；第一个策略步后参考点已偏出 ' + fmt(STEP1[SUBSTEPS - 1].x * 100, 2) + ' cm。' },
        { at: 9.6, s: '驱动力第 2 个子步就撞上 10 N 上限；参考先冲过头，最后停在 **' + fmt(EQ[1].x * 100, 1) + ' cm**。' },
        { at: 12.0, s: '策略跟踪的不是原动作，而是这条积分出来的**柔顺参考**。' }
      ]
    },
    {
      title: '两种交互弹簧：抵抗与引导',
      dur: 13,
      build: buildSceneContacts,
      cues: [
        { at: 0.4, s: '交互力统一写成弹簧：$f_{\\mathrm{interact}} = K_{\\mathrm{spring}}(x_{\\mathrm{anchor}} - x_{\\mathrm{cur}})$。' },
        { at: 1.6, s: '**抵抗式接触**：机器人自己压到人或物体上，锚点就是刚接触那一刻的位置。' },
        { at: 3.6, s: '继续往里压，弹簧把连杆推回锚点 —— 就像碰到一个有弹性的表面。' },
        { at: 5.4, s: '**引导式接触**：锚点从人类动作里采样一整条手臂的姿态（每侧 ' + N_POSTURES + ' 组），肩、腕、手的锚点来自同一个姿态。' },
        { at: 8.0, s: '所以三个点的受力方向彼此协调，整条手臂一起被带过去，而不是各拉各的。' },
        { at: 9.8, s: '单侧投影：只在压向锚点的一侧有力，离开接触侧力归零。' }
      ]
    },
    {
      title: '受力暴露的多样性',
      dur: 12,
      build: buildSceneExposure,
      cues: [
        { at: 0.4, s: '四成时间不加力；其余在双臂、单臂、随机子集之间切换（代码概率 0.4 / 0.15 × 4）。' },
        { at: 2.6, s: '期望受力 link 数：代码 ' + fmt(E_LINKS_CODE, 2) + ' 个；按论文正文「单个 link」的口径是 ' + fmt(E_LINKS_PAPER, 2) + ' 个。' },
        { at: 4.2, s: '弹簧刚度 $K_s \\in [' + KS_LO + ', ' + KS_HI + ']$ 并随时间慢慢漂；一段受力 0.4–4 s，结束时渐退。' },
        { at: 6.6, s: '躯干处净力 ≤ ' + NET_F + ' N、净力矩 ≤ ' + NET_M + ' N·m，防止总扰动过大。' },
        { at: 8.2, s: 'Fig. 3：力的方向铺满球面、大小 0–25 N；但肩部受力偏小，受限于动作数据。' }
      ]
    },
    {
      title: '安全力阈值',
      dur: 14,
      build: buildSceneThreshold,
      cues: [
        { at: 0.4, s: '驱动力超过阈值就等比例缩到阈值：$f = \\min(1, \\tau_{\\mathrm{safe}}/\\lVert f\\rVert)\\,f$。' },
        { at: 2.0, s: '代码里 $K_p = \\tau_{\\mathrm{safe}}/0.05$：三档阈值都在**偏离 5 cm** 时封顶，阈值只改变「多早开始让」。' },
        { at: 5.6, s: '同一个外拉下：$\\tau = 5 / 10 / 15$ N 时分别让开 ' + EQ.map(function (e) { return fmt(e.x * 100, 1); }).join(' / ') + ' cm。' },
        { at: 7.6, s: '截断后平衡时**接触力正好等于阈值**；完全不让的刚性跟踪是 ' + fmt(RIGID_F, 1) + ' N。' },
        { at: 9.6, s: '最坏 0.25 cm² 接触：15 N → ' + fmt(P_MIN_AREA, 0) + ' N/cm²，低于 ISO/TS 15066 的胸 120、背肩 160。' },
        { at: 11.2, s: '拥抱约 16 cm²：5–15 N 是 ' + fmt(P_HUG_LO, 1) + '–' + fmt(P_HUG_HI, 1) + ' kPa，落在舒适区间。' }
      ]
    },
    {
      title: '教师—学生与柔顺奖励',
      dur: 13,
      build: buildScenePolicy,
      cues: [
        { at: 0.4, s: '教师看得到参考动力学状态、参考力与仿真实测力等特权信息。' },
        { at: 2.4, s: '学生只看 $\\tau_{\\mathrm{safe}}$、目标动作、角速度、重力与关节 / 动作历史，输出 29 维关节目标。' },
        { at: 5.2, s: '柔顺奖励三项：参考状态跟踪（2.0）、参考力跟踪（2.0）、不安全力惩罚（6.0）。' },
        { at: 7.2, s: '算例：位置差 2 cm 得 ' + fmt(R_POS, 3) + '；力差 2 N 得 ' + fmt(R_FORCE, 3) + '；$\\tau = 10$ 时超过 **' + PEN_LINE + ' N** 才罚。' },
        { at: 9.4, s: '注意：论文写的核是 $\\exp(-\\lVert\\cdot\\rVert^2/\\sigma)$，开源代码是 $\\exp(-\\lVert\\cdot\\rVert/\\sigma)$。' },
        { at: 11.0, s: '对照组 Vanilla-RL 不加力，Extreme-RL 在末端加最高 30 N 的随机扰动。' }
      ]
    },
    {
      title: '定量证据与局限',
      dur: 13,
      build: buildSceneEvidence,
      cues: [
        { at: 0.4, s: '仿真拥抱被外拉：手部力 GentleHumanoid ≈ 10 N，Extreme-RL > 13 N，Vanilla-RL > 20 N。' },
        { at: 3.2, s: '真机拉手腕：Extreme-RL 峰值 **' + fmt(MARK10.extreme, 2) + ' N**、Vanilla-RL ' + fmt(MARK10.vanilla, 2) + ' N；GentleHumanoid 维持在阈值附近，且与姿态无关。' },
        { at: 6.2, s: '拥抱人台的压力垫与气球实验：力有界、不挤爆；基线出现高压峰值或失衡掉球。' },
        { at: 9.2, s: '局限：真机 1–3 N 超调、弹簧模型不含摩擦与组织黏弹性、人的定位靠动捕。' },
        { at: 11.2, s: '一句话：**阻抗参考动力学 + 造出来的多 link 交互力 + 可调阈值**。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '七幕动画：GentleHumanoid 全流程速览',
      sub: '约 91 秒自动播放。空格播放/暂停，← → 换幕；画面里的算例数字都是现算的，与正文「具体实例」一致。',
      ariaLabel: 'GentleHumanoid 七幕讲解动画',
      notes: [
        '取数依据：$M$、$D$、子步数、速度 / 加速度截断、$K_p = \\tau_{\\mathrm{safe}}/0.05$ 取自附录 Table III 与训练仓库 `MotionTrackingCommand_impedance`；接触组合概率、时间表与躯干净力限制取自同一文件与 Table II；5–15 N、ISO 与舒适压强取自 §III-D；第七幕是论文正文与图注里的数字。',
        '第二、五幕的「锚点 +0.15 m、$K_s = ' + KS + '$ 的一维外拉」、第六幕的「位置差 2 cm / 力差 2 N」都是**示意算例，不是论文数据**；第一幕手臂与读数只示意趋势。'
      ],
      scenes: GENTLE_SCENES
    });
  }

  K.mount({
    'gentle-explainer': buildExplainerDemo
  });
})();
