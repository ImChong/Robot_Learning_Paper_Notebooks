/* Interactive UMR explainer for
 * papers/02_Motion_Retargeting/UMR__Unified_Motion_Retargeting_with_Learned_Point_Cloud_Correspondence.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["umr"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   umr-explainer — 八幕讲解动画：骨架中心的对应是一款机器人一套配方 →
 *     体表点云当接口（形变而非匹配）→ 三项损失与测地图 → 绑定与位姿残差 →
 *     接触图共用环境点 → 阻尼约束 Gauss-Newton QP → 三个尺度的定量证据 →
 *     闭环与源码落点
 *
 * 第 3–6 幕里的小算例与笔记「🧮 数据计算实例」一节是同一组数字，
 * 都在这里现算；tests/test_paper_demos.py 会按同样的公式在 Python 里复算。
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

  // ─── 仓库默认参数（humanoid_retarget_defaults.json）──────────────────
  var N_POINTS = 4096;
  var LAMBDA_C = 1.0;
  var LAMBDA_R = 0.002;
  var LAMBDA_E = 0.4;
  var REP_K = 8;
  var REP_R = 0.035; // m
  var EDGE_K = 32;
  var TAU_C = 0.1; // m
  var MU = 0.01;
  var ETA = 0.15;
  var N_ROBOTS = 5;

  // ─── 例 1：三个点的 Edge 项（正确对应 vs 左右翻转）─────────────────────
  /* 人体 T-pose 上的三个点 x1, x2, x3（一条手臂，单位 m），机器人表面上的目标点
     y_a, y_b, y_c。两种对应都把点集整体盖住机器人表面，所以 Chamfer 都是 0；
     区别只在形变向量 d_i 是否「挨着的点挨着动」。 */
  var TOY_H = [[0, 0], [0.1, 0], [0.2, 0]];
  var TOY_R = [[0, 0], [0.1, 0.02], [0.2, 0.02]];
  var TOY_EDGES = [[0, 1], [1, 2]];

  function sub(a, b) {
    return [a[0] - b[0], a[1] - b[1]];
  }
  function sq(v) {
    return v.reduce(function (s, x) {
      return s + x * x;
    }, 0);
  }
  function edgeLoss(dirs) {
    var tot = 0;
    TOY_EDGES.forEach(function (e) {
      tot += sq(sub(dirs[e[0]], dirs[e[1]]));
    });
    return tot / TOY_EDGES.length;
  }
  var D_OK = TOY_H.map(function (p, i) {
    return sub(TOY_R[i], p);
  });
  var D_FLIP = TOY_H.map(function (p, i) {
    return sub(TOY_R[TOY_R.length - 1 - i], p);
  });
  var LE_OK = edgeLoss(D_OK); // 0.0002
  var LE_FLIP = edgeLoss(D_FLIP); // 0.0402
  var LE_RATIO = LE_FLIP / LE_OK; // 201

  /* Repulsion 的核 exp(-d²/r²)：只在几厘米内起作用。 */
  function repKernel(d) {
    return Math.exp(-(d * d) / (REP_R * REP_R));
  }
  var REP_DS = [0.01, REP_R, 2 * REP_R];

  // ─── 例 2：一对点的位姿残差 ───────────────────────────────────────────
  var POSE_DX = [-0.02, 0.03, -0.05]; // x^r - x^h（m）
  var POSE_POS_SQ = sq(POSE_DX); // 0.0038
  var NORMAL_H_DEG = 30; // 人点相对 T-pose 绑定转了 30°
  var NORMAL_R_DEG = 20; // 机器人点只转了 20°
  var NORMAL_SQ = 2 * (1 - Math.cos(((NORMAL_H_DEG - NORMAL_R_DEG) * Math.PI) / 180)); // 0.0304
  var W_P = 1; // 示意权重，不是仓库值
  var W_N = 0.1;
  var POSE_COST = W_P * POSE_POS_SQ + W_N * NORMAL_SQ; // 0.00684
  var NORMAL_AS_POS_CM = Math.sqrt(W_N * NORMAL_SQ) * 100; // 5.5 cm

  // ─── 例 3：接触向量与活跃集 ───────────────────────────────────────────
  var CT_Y = [0.5, 0.0, 0.8];
  var CT_XH = [0.5, 0.03, 0.8];
  var CT_XR = [0.5, 0.09, 0.84];
  function sub3(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }
  var CT_CH = sub3(CT_XH, CT_Y);
  var CT_CR = sub3(CT_XR, CT_Y);
  var CT_CH_NORM = Math.sqrt(sq(CT_CH)); // 0.03
  var CT_RES = Math.sqrt(sq(sub3(CT_CR, CT_CH))); // 0.0721
  var CT_LEAVE = 0.12; // 下一段手离开箱子，‖c^h‖ 超过 τ_c

  // ─── 例 4：两个关节、两条残差的一步阻尼约束 GN ─────────────────────────
  var GN_J = [[0.4, 0.1], [0.0, 0.3]];
  var GN_R = [0.06, -0.03];
  var GN_JZ = [0.2, -0.1]; // 一个近地表面点 z 方向的雅可比行
  var GN_Z_GAP = 0.05; // 该点离地 5 cm

  function gnStep(lam) {
    var J = GN_J,
      r = GN_R;
    var a = J[0][0] * J[0][0] + J[1][0] * J[1][0] + lam;
    var b = J[0][0] * J[0][1] + J[1][0] * J[1][1];
    var d = J[0][1] * J[0][1] + J[1][1] * J[1][1] + lam;
    var g0 = J[0][0] * r[0] + J[1][0] * r[1];
    var g1 = J[0][1] * r[0] + J[1][1] * r[1];
    var det = a * d - b * b;
    return [-(d * g0 - b * g1) / det, -(-b * g0 + a * g1) / det];
  }
  function norm2(v) {
    return Math.sqrt(sq(v));
  }
  function linRes(dq) {
    return norm2([
      GN_R[0] + GN_J[0][0] * dq[0] + GN_J[0][1] * dq[1],
      GN_R[1] + GN_J[1][0] * dq[0] + GN_J[1][1] * dq[1]
    ]);
  }
  /* 信赖域激活时，KKT 条件等价于把阻尼再加一个 λ ≥ 0，使 ‖Δq‖ 恰好等于 η。 */
  function trustLambda() {
    var lo = 0,
      hi = 10;
    for (var k = 0; k < 100; k++) {
      var m = (lo + hi) / 2;
      if (norm2(gnStep(MU + m)) > ETA) lo = m;
      else hi = m;
    }
    return hi;
  }
  var GN_R0 = norm2(GN_R); // 0.0671
  var DQ_GN = gnStep(0); // (-0.175, 0.100)
  var DQ_DAMP = gnStep(MU); // (-0.161, 0.086)
  var TR_LAMBDA = trustLambda(); // 0.0246
  var DQ_TR = gnStep(MU + TR_LAMBDA); // (-0.136, 0.063)
  var RES_DAMP = linRes(DQ_DAMP); // 0.0058
  var RES_TR = linRes(DQ_TR); // 0.0162
  var FLOOR_DZ = GN_JZ[0] * DQ_TR[0] + GN_JZ[1] * DQ_TR[1]; // -0.0335

  // ─── 论文表格（Table I / II / III / IV）──────────────────────────────
  var T1 = { sample: 9.83, geo: 5.58, train: 10.38, prep: 141.46, solve: 121.26, e2e: 65.29 };
  var STAGE1_S = T1.sample + T1.geo + T1.train; // 25.79 s
  var PREP_MS = 1000 / T1.prep; // 7.07 ms
  var SOLVE_MS = 1000 / T1.solve; // 8.25 ms
  var E2E_FPS = 1000 / (PREP_MS + SOLVE_MS); // 65.29 FPS：两段串行
  var CLIP_FPS = 30; // 假设源动作 30 fps，只用来换算量级
  var CLIP_S = 60;
  var CLIP_WALL_S = (CLIP_FPS * CLIP_S) / T1.e2e; // 27.6 s

  var T2 = {
    fall: { umr: 96.98, gmr: 84.72 },
    fight: { umr: 99.94, gmr: 87.6 }
  };
  var FALL_GAIN = T2.fall.umr - T2.fall.gmr; // 12.26
  var FIGHT_GAIN = T2.fight.umr - T2.fight.gmr; // 12.34

  var T4 = {
    carry: { umr: 0.57, omni: 1.03 },
    kick: { umr: 0.619, omni: 1.396 },
    push: { umr: 0.63, omni: 1.043 }
  };
  function drop(o) {
    return ((o.omni - o.umr) / o.omni) * 100;
  }
  var CARRY_DROP = drop(T4.carry); // 44.7
  var KICK_DROP = drop(T4.kick); // 55.7
  var PUSH_DROP = drop(T4.push); // 39.6
  var STAIR = { umr: 43.53, omni: 11.01 };
  var STAIR_X = STAIR.umr / STAIR.omni; // 3.95

  function arrowLine(s, a, b, marker, color, w, dash) {
    var attrs = { d: polyPath([a, b]), fill: 'none', 'stroke-width': w || 1.5, 'marker-end': marker };
    if (dash) attrs['stroke-dasharray'] = dash;
    var p = paint(svgEl('path', attrs), null, color);
    s.appendChild(p);
    return p;
  }
  function box(g, x, y, w, h, fill, stroke, sw) {
    var r = paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 8, 'stroke-width': sw || 1.3 }), fill, stroke);
    g.appendChild(r);
    return r;
  }

  // ─── 第 1 幕：骨架中心的对应 = 一款机器人一套配方 ─────────────────────
  var S1_ROBOTS = ['Unitree G1', 'Unitree H2', 'Booster K1', 'EngineAI T800', 'HighTorque Pi+'];
  var S1_PAINS = [
    { t: '① 一款机器人一张映射表', d: '人体骨骼 ↔ 机器人 body + 权重 + 偏移', d2: '换机器人、换动作源都要重写' },
    { t: '② 稀疏关节管不住表面', d: '关节之间的大片体表没人约束', d2: '肩背、胯部姿态靠插值出来' },
    { t: '③ 接触靠手工启发式', d: '支撑相检测 + 脚部硬粘地', d2: '跨动作分布会失配' }
  ];

  function buildSceneProblem() {
    var s = sceneSvg(
      '骨架中心的重定向要为每一款机器人手写人体骨骼到机器人连杆的映射表，稀疏关节约束不住体表，接触迁移依赖手工启发式'
    );
    s.appendChild(svgText(56, 28, 'GMR / OmniRetarget / ReActor：对应关系都是人手工挑出来的', 'demo-x-ink2', 13.5));

    var robots = S1_ROBOTS.map(function (name, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 146;
      box(g, x, 46, 134, 66, C_SURFACE2, C_WARN, 1.3);
      g.appendChild(paint(svgText(x + 67, 70, name, null, 11, 'middle'), C_WARN));
      g.appendChild(svgText(x + 67, 90, 'ik_config.yaml', 'demo-x-mono', 9, 'middle'));
      g.appendChild(svgText(x + 67, 104, '手写 10–20 行', 'demo-x-mut', 8.5, 'middle'));
      s.appendChild(g);
      return { g: g, at: 0.6 + k * 0.45 };
    });

    var pains = S1_PAINS.map(function (p, k) {
      var g = svgEl('g', {});
      var px = 40 + k * 246;
      box(g, px, 132, 234, 94, C_SURFACE, C_BAD, 1.3);
      g.appendChild(paint(svgText(px + 16, 156, p.t, null, 11.5), C_BAD));
      g.appendChild(svgText(px + 16, 180, p.d, 'demo-x-mut', 9));
      g.appendChild(svgText(px + 16, 198, p.d2, 'demo-x-mut', 9));
      s.appendChild(g);
      return { g: g, at: 3.4 + k * 1.3 };
    });

    var band = svgEl('g', {});
    box(band, 40, 244, 720, 58, C_SURFACE2, C_ACCENT, 1.4);
    band.appendChild(
      paint(svgText(400, 268, '把接口从「骨架」换成「体表」：人和机器人各自的 T-pose 外表面点云', null, 12.5, 'middle'), C_ACCENT)
    );
    band.appendChild(svgText(400, 289, '对应从几何里学出来，不从语义里指定出来', 'demo-x-mut', 10, 'middle'));
    s.appendChild(band);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 344, 'UMR：学一次稠密表面对应 → 逐帧约束 Gauss-Newton', null, 15, 'middle'), C_ACCENT));
    foot.appendChild(
      svgText(400, 370, '换机器人只要一个 T-pose（UMR Studio 导出 tpose_qpos），不再写映射表', 'demo-x-mut', 11, 'middle')
    );
    s.appendChild(foot);

    function draw(t) {
      robots.forEach(function (r) {
        setOpacity(r.g, seg(t, r.at, r.at + 0.4));
      });
      pains.forEach(function (p) {
        setOpacity(p.g, seg(t, p.at, p.at + 0.5));
      });
      setOpacity(band, seg(t, 7.6, 8.4));
      setOpacity(foot, seg(t, 9.6, 10.4));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 2 幕：体表点云当接口，形变而非匹配 ────────────────────────────
  /* 示意用的 T-pose「表面点」：沿躯干 / 手臂 / 腿 / 头按固定顺序采样，
     人和机器人用同一套顺序，所以第 i 个点天然成对。尺寸只是示意。 */
  var HUMAN_DIMS = { torso: 70, arm: 78, leg: 92, spread: 16, head: 13, thick: 7 };
  var ROBOT_DIMS = { torso: 54, arm: 56, leg: 72, spread: 14, head: 10, thick: 11 };

  function tposePoints(d, cx, cy) {
    var pts = [];
    function line(a, b, n, part) {
      var dx = b[0] - a[0],
        dy = b[1] - a[1];
      var len = Math.hypot(dx, dy) || 1;
      var nx = -dy / len,
        ny = dx / len;
      for (var j = 0; j < n; j++) {
        var u = (j + 0.5) / n;
        var off = (j % 2 ? 1 : -1) * d.thick;
        pts.push({ p: [a[0] + dx * u + nx * off, a[1] + dy * u + ny * off], part: part });
      }
    }
    var pelvis = [cx, cy],
      neck = [cx, cy - d.torso];
    line(pelvis, neck, 8, 'torso');
    line(neck, [cx - d.arm, cy - d.torso], 8, 'arm');
    line(neck, [cx + d.arm, cy - d.torso], 8, 'arm');
    line(pelvis, [cx - d.spread, cy + d.leg], 8, 'leg');
    line(pelvis, [cx + d.spread, cy + d.leg], 8, 'leg');
    var hc = [cx, cy - d.torso - d.head - 3];
    for (var k = 0; k < 6; k++) {
      var a = (k / 6) * Math.PI * 2;
      pts.push({ p: [hc[0] + d.head * Math.cos(a), hc[1] + d.head * Math.sin(a)], part: 'head' });
    }
    return pts;
  }
  var PART_COLOR = { torso: C_WARN, arm: C_ACCENT, leg: C_GOOD, head: C_MUTED };
  var HAND_IDX = 8 + 7; // 左臂最后一个采样点

  function buildSceneSurface() {
    var s = sceneSvg(
      '人和机器人在 T-pose 下各采 4096 个外表面点；网络把有序的人点云整体形变成机器人形状，第 i 个人点自然对应第 i 个机器人点'
    );
    s.appendChild(svgText(56, 26, '不做配对，只做形变：索引从人点云直接继承', 'demo-x-ink2', 13.5));

    var eq = svgMath(400, 58, '\\hat{\\mathbf{x}}^{r}_{i} = \\mathbf{x}^{h}_{i} + \\mathbf{d}_{i}, \\quad \\mathbf{d} = D_\\theta(E_\\theta(\\mathbf{X}^{r}))', {
      size: 14,
      w: 560,
      anchor: 'middle'
    });
    eq.setTone('var(--demo-accent)');
    s.appendChild(eq);

    var H = tposePoints(HUMAN_DIMS, 170, 250);
    var R = tposePoints(ROBOT_DIMS, 620, 262);

    var hLabel = svgEl('g', {});
    hLabel.appendChild(svgText(170, 380, '人体 T-pose（有序 X^h）', 'demo-x-mut', 10.5, 'middle'));
    hLabel.appendChild(svgText(170, 398, 'SMPL-X / SOMA / 角色 / 扫描网格', 'demo-x-mono', 9, 'middle'));
    s.appendChild(hLabel);
    var rLabel = svgEl('g', {});
    rLabel.appendChild(svgText(620, 380, '机器人 T-pose（无序 X^r）', 'demo-x-mut', 10.5, 'middle'));
    rLabel.appendChild(svgText(620, 398, 'MJCF 几何 first-hit 采样', 'demo-x-mono', 9, 'middle'));
    s.appendChild(rLabel);

    /* 人点云留一份淡色底稿，点飞走之后左边仍看得出原来的形状 */
    var hGhost = svgEl('g', {});
    H.forEach(function (q) {
      hGhost.appendChild(paint(svgEl('circle', { cx: q.p[0], cy: q.p[1], r: 3.2, 'stroke-width': 1 }), 'none', PART_COLOR[q.part]));
    });
    setOpacity(hGhost, 0);
    s.appendChild(hGhost);

    var ghost = svgEl('g', {});
    R.forEach(function (q) {
      ghost.appendChild(paint(svgEl('circle', { cx: q.p[0], cy: q.p[1], r: 3.2, 'stroke-width': 1 }), 'none', C_BORDER));
    });
    s.appendChild(ghost);

    var dots = H.map(function (q) {
      var c = paint(svgEl('circle', { cx: q.p[0], cy: q.p[1], r: 3.2 }), PART_COLOR[q.part]);
      s.appendChild(c);
      return c;
    });

    var tag = svgEl('g', {});
    var tagH = paint(svgText(0, 0, 'i', null, 12, 'middle'), C_BAD);
    var tagR = paint(svgText(0, 0, 'i', null, 12, 'middle'), C_BAD);
    tag.appendChild(tagH);
    tag.appendChild(tagR);
    var hp = H[HAND_IDX].p,
      rp = R[HAND_IDX].p;
    tagH.setAttribute('x', hp[0]);
    tagH.setAttribute('y', hp[1] - 12);
    tagR.setAttribute('x', rp[0]);
    tagR.setAttribute('y', rp[1] - 12);
    tag.appendChild(paint(svgEl('circle', { cx: hp[0], cy: hp[1], r: 7, fill: 'none', 'stroke-width': 1.6 }), null, C_BAD));
    tag.appendChild(paint(svgEl('circle', { cx: rp[0], cy: rp[1], r: 7, fill: 'none', 'stroke-width': 1.6 }), null, C_BAD));
    tag.appendChild(svgText(400, 126, '第 i 个人点 ↔ 第 i 个机器人点：没有匹配这一步', 'demo-x-ink2', 11, 'middle'));
    s.appendChild(tag);

    var note = svgEl('g', {});
    box(note, 290, 150, 220, 74, C_SURFACE, C_BORDER, 1.2);
    note.appendChild(svgText(400, 172, '默认 N = ' + N_POINTS + ' 点 / 侧', 'demo-x-ink2', 11, 'middle'));
    note.appendChild(svgText(400, 192, 'PointNet 编码机器人点云', 'demo-x-mut', 9.5, 'middle'));
    note.appendChild(svgText(400, 210, 'MLP 为每个人点吐一个 d_i', 'demo-x-mut', 9.5, 'middle'));
    s.appendChild(note);

    function draw(t) {
      setOpacity(eq, seg(t, 0.3, 1.0));
      setOpacity(hLabel, seg(t, 0.6, 1.2));
      setOpacity(ghost, seg(t, 1.6, 2.3));
      setOpacity(rLabel, seg(t, 1.6, 2.3));
      setOpacity(note, seg(t, 2.4, 3.0));
      setOpacity(hGhost, 0.45 * seg(t, 3.2, 3.8));
      var u = ease(seg(t, 3.2, 7.2));
      dots.forEach(function (c, i) {
        c.setAttribute('cx', (H[i].p[0] + (R[i].p[0] - H[i].p[0]) * u).toFixed(1));
        c.setAttribute('cy', (H[i].p[1] + (R[i].p[1] - H[i].p[1]) * u).toFixed(1));
      });
      setOpacity(tag, seg(t, 7.6, 8.3));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 3 幕：三项损失与测地图 ───────────────────────────────────────
  function buildSceneLoss() {
    var s = sceneSvg(
      '对应损失是 Chamfer、Repulsion 与沿测地图的 Edge 平滑三项之和；左右翻转的对应 Chamfer 同样为零，只有 Edge 项能把它识别出来'
    );
    s.appendChild(svgText(56, 26, 'Chamfer 只管「盖住」，Edge 才管「挨着的点挨着动」', 'demo-x-ink2', 13.5));

    var eq = svgMath(
      400,
      56,
      '\\mathcal{L}_{\\mathrm{corr}} = ' + fmt(LAMBDA_C, 1) + '\\,\\mathcal{L}_c + ' + LAMBDA_R + '\\,\\mathcal{L}_r + ' + fmt(LAMBDA_E, 1) + '\\,\\mathcal{L}_e',
      { size: 14, w: 520, anchor: 'middle' }
    );
    eq.setTone('var(--demo-accent)');
    s.appendChild(eq);

    var arrow = K.arrowMarker(s, 'umr-x-arrow-loss', C_BORDER);
    var arrowBad = K.arrowMarker(s, 'umr-x-arrow-loss-bad', C_BAD);
    /* 两块小面板：上为正确对应，下为左右翻转。1 m → 1200 px（示意放大）。 */
    function panel(y0, dirs, color, marker, title, val, good) {
      var g = svgEl('g', {});
      box(g, 40, y0, 420, 118, C_SURFACE, good ? C_GOOD : C_BAD, 1.2);
      g.appendChild(paint(svgText(56, y0 + 20, title, null, 11), good ? C_GOOD : C_BAD));
      var sx = 1200,
        ox = 110,
        hy = y0 + 92,
        ry = y0 + 52;
      TOY_H.forEach(function (p, i) {
        var a = [ox + p[0] * sx, hy];
        var tgt = [ox + (p[0] + dirs[i][0]) * sx, ry - dirs[i][1] * sx * 0.6];
        g.appendChild(paint(svgEl('circle', { cx: a[0], cy: a[1], r: 4.5 }), C_WARN));
        g.appendChild(svgText(a[0], a[1] + 16, 'x' + (i + 1), 'demo-x-mono', 9, 'middle'));
        g.appendChild(
          paint(
            svgEl('path', { d: polyPath([a, [tgt[0], tgt[1] + 6]]), fill: 'none', 'stroke-width': 1.3, 'marker-end': marker }),
            null,
            color
          )
        );
      });
      TOY_R.forEach(function (p) {
        g.appendChild(
          paint(svgEl('circle', { cx: ox + p[0] * sx, cy: ry - p[1] * sx * 0.6, r: 4.5, 'stroke-width': 1.4 }), 'none', C_ACCENT)
        );
      });
      g.appendChild(svgText(410, y0 + 46, 'L_c = 0', 'demo-x-mono', 10, 'middle'));
      g.appendChild(paint(svgText(410, y0 + 70, 'L_e = ' + fmt(val, 4), null, 11, 'middle'), good ? C_GOOD : C_BAD));
      g.appendChild(svgText(410, y0 + 90, 'λ_e·L_e = ' + fmt(LAMBDA_E * val, 5), 'demo-x-mut', 9, 'middle'));
      s.appendChild(g);
      return g;
    }
    var pOk = panel(80, D_OK, C_BORDER, arrow, '正确对应：d_i 几乎一样', LE_OK, true);
    var pFlip = panel(210, D_FLIP, C_BAD, arrowBad, '左右翻转：点集一样，d_i 互相打架', LE_FLIP, false);

    var ratio = svgEl('g', {});
    ratio.appendChild(paint(svgText(250, 350, 'Edge 项差 ' + fmt(LE_RATIO, 0) + ' 倍，Chamfer 一样是 0', null, 13, 'middle'), C_BAD));
    s.appendChild(ratio);

    /* 右侧：Repulsion 核 exp(-d²/r²) */
    var rep = svgEl('g', {});
    box(rep, 480, 80, 280, 150, C_SURFACE, C_BORDER, 1.2);
    rep.appendChild(svgText(496, 100, 'Repulsion 核：r = ' + REP_R + ' m，K_r = ' + REP_K, 'demo-x-ink2', 10.5));
    var px0 = 500,
      py0 = 210,
      pw = 240,
      ph = 80,
      dmax = 0.1;
    rep.appendChild(paint(svgEl('path', { d: polyPath([[px0, py0 - ph - 4], [px0, py0], [px0 + pw, py0]]), fill: 'none', 'stroke-width': 1 }), null, C_BORDER));
    var curve = [];
    for (var k = 0; k <= 60; k++) {
      var d = (k / 60) * dmax;
      curve.push([px0 + (d / dmax) * pw, py0 - repKernel(d) * ph]);
    }
    rep.appendChild(paint(svgEl('path', { d: polyPath(curve), fill: 'none', 'stroke-width': 1.8 }), null, C_ACCENT));
    REP_DS.forEach(function (d, k) {
      var x = px0 + (d / dmax) * pw,
        y = py0 - repKernel(d) * ph;
      rep.appendChild(paint(svgEl('circle', { cx: x, cy: y, r: 3.5 }), C_WARN));
      var last = k === REP_DS.length - 1;
      rep.appendChild(
        svgText(last ? x - 4 : x + 6, last ? y - 12 : y - 6, fmt(d * 100, 1) + ' cm → ' + fmt(repKernel(d), 3), 'demo-x-mono', 8.5, last ? 'end' : null)
      );
    });
    rep.appendChild(svgText(px0 + pw, py0 + 14, '10 cm', 'demo-x-mono', 8.5, 'end'));
    s.appendChild(rep);

    var geo = svgEl('g', {});
    box(geo, 480, 244, 280, 88, C_SURFACE2, C_GOOD, 1.2);
    geo.appendChild(paint(svgText(496, 266, 'Edge 为什么走测地图（k = ' + EDGE_K + '）', null, 11), C_GOOD));
    geo.appendChild(svgText(496, 288, 'T-pose 下手臂贴躯干：欧氏近、体表远', 'demo-x-mut', 9.5));
    geo.appendChild(svgText(496, 306, '欧氏近邻会把手臂和躯干的 d_i 绑死', 'demo-x-mut', 9.5));
    geo.appendChild(svgText(496, 324, '测地距离沿体表走，跨不过这道缝', 'demo-x-mut', 9.5));
    s.appendChild(geo);

    var foot = paint(svgText(400, 392, '学完还白送一件事：机器人点继承人体的身体分区标签，权重可跨机器人复用', null, 12.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(eq, seg(t, 0.3, 1.0));
      setOpacity(pOk, seg(t, 1.4, 2.1));
      setOpacity(pFlip, seg(t, 3.4, 4.1));
      setOpacity(ratio, seg(t, 5.2, 5.8));
      setOpacity(rep, seg(t, 7.0, 7.7));
      setOpacity(geo, seg(t, 9.0, 9.7));
      setOpacity(foot, seg(t, 11.4, 12.0));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 4 幕：绑定 + 位姿残差（位置 + 法向）────────────────────────────
  function buildScenePose() {
    var s = sceneSvg(
      '人点用重心坐标绑定在源网格三角面上，机器人点绑定在连杆局部坐标上由前向运动学带着走；每对点贡献一条位置残差和一条相对 T-pose 的法向残差'
    );
    s.appendChild(svgText(56, 26, '点对绑好之后，每一对就是一条「位置 + 法向」残差', 'demo-x-ink2', 13.5));

    /* 左：人点在三角面上的重心坐标 */
    var tri = svgEl('g', {});
    var A = [70, 190],
      B = [210, 170],
      Cc = [130, 90];
    tri.appendChild(paint(svgEl('path', { d: polyPath([A, B, Cc, A]), 'stroke-width': 1.4 }), C_SURFACE2, C_WARN));
    var bary = [0.5, 0.3, 0.2];
    var P = [bary[0] * A[0] + bary[1] * B[0] + bary[2] * Cc[0], bary[0] * A[1] + bary[1] * B[1] + bary[2] * Cc[1]];
    tri.appendChild(paint(svgEl('circle', { cx: P[0], cy: P[1], r: 5 }), C_WARN));
    tri.appendChild(svgText(140, 214, '人点 = 0.5A + 0.3B + 0.2C', 'demo-x-mono', 9, 'middle'));
    tri.appendChild(svgText(140, 232, '网格怎么动，点就跟着怎么动', 'demo-x-mut', 9, 'middle'));
    s.appendChild(tri);

    /* 中：机器人连杆 + 局部偏移，随关节角转动 */
    var link = svgEl('g', {});
    var pivot = [330, 180];
    var bar = paint(svgEl('line', { x1: pivot[0], y1: pivot[1], 'stroke-width': 10, 'stroke-linecap': 'round' }), null, C_ACCENT);
    var pt = paint(svgEl('circle', { r: 5 }), C_ACCENT);
    link.appendChild(bar);
    link.appendChild(pt);
    link.appendChild(paint(svgEl('circle', { cx: pivot[0], cy: pivot[1], r: 6 }), C_SURFACE2, C_BORDER));
    link.appendChild(svgText(330, 232, '机器人点 = FK(q) · 局部偏移', 'demo-x-mono', 9, 'middle'));
    s.appendChild(link);

    var eq = svgMath(
      600,
      110,
      '\\mathbf{r}_{p,i} = \\begin{bmatrix}\\sqrt{w^p_i}\\,(\\mathbf{x}^r_i(\\mathbf{q}_t) - \\mathbf{x}^h_{t,i}) \\\\ \\sqrt{w^n_i}\\,(\\bar{\\mathbf{n}}^r_i(\\mathbf{q}_t) - \\bar{\\mathbf{n}}^h_{t,i})\\end{bmatrix}',
      { size: 12.5, w: 330, h: 70, anchor: 'middle' }
    );
    eq.setTone('var(--demo-accent)');
    s.appendChild(eq);

    var num = svgEl('g', {});
    box(num, 40, 258, 460, 120, C_SURFACE, C_BORDER, 1.2);
    num.appendChild(svgText(56, 280, '算一对点（示意权重 w^p = ' + W_P + '，w^n = ' + W_N + '）', 'demo-x-ink2', 11));
    num.appendChild(
      svgText(56, 302, '位置差 (' + POSE_DX.map(function (v) { return fmt(v, 2); }).join(', ') + ') m → ‖·‖² = ' + fmt(POSE_POS_SQ, 4), 'demo-x-mono', 9.5)
    );
    num.appendChild(
      svgText(56, 322, '法向：人转 ' + NORMAL_H_DEG + '°、机器人转 ' + NORMAL_R_DEG + '° → 2(1−cos10°) = ' + fmt(NORMAL_SQ, 4), 'demo-x-mono', 9.5)
    );
    num.appendChild(
      paint(svgText(56, 346, '合计 ' + fmt(W_P * POSE_POS_SQ, 4) + ' + ' + fmt(W_N * NORMAL_SQ, 5) + ' = ' + fmt(POSE_COST, 5), null, 11), C_ACCENT)
    );
    num.appendChild(svgText(56, 366, '10° 的朝向差，代价相当于 ' + fmt(NORMAL_AS_POS_CM, 1) + ' cm 的位置差', 'demo-x-mut', 9.5));
    s.appendChild(num);

    var mode = svgEl('g', {});
    box(mode, 520, 258, 240, 120, C_SURFACE2, C_GOOD, 1.2);
    mode.appendChild(paint(svgText(536, 280, 'tpose_offset：只比「转了多少」', null, 11), C_GOOD));
    mode.appendChild(svgText(536, 304, '人是肉、机器人是塑料壳，', 'demo-x-mut', 9.5));
    mode.appendChild(svgText(536, 322, '绝对法向本来就对不上；', 'demo-x-mut', 9.5));
    mode.appendChild(svgText(536, 340, '能比的只有相对各自 T-pose', 'demo-x-mut', 9.5));
    mode.appendChild(svgText(536, 358, '绑定的朝向变化', 'demo-x-mut', 9.5));
    s.appendChild(mode);

    function draw(t) {
      setOpacity(tri, seg(t, 0.4, 1.1));
      setOpacity(link, seg(t, 1.8, 2.5));
      var ang = -0.9 + 0.5 * Math.sin(Math.max(0, t - 2.0) * 1.3);
      var end = [pivot[0] + 90 * Math.cos(ang), pivot[1] + 90 * Math.sin(ang)];
      bar.setAttribute('x2', end[0].toFixed(1));
      bar.setAttribute('y2', end[1].toFixed(1));
      pt.setAttribute('cx', (pivot[0] + 62 * Math.cos(ang) - 12 * Math.sin(ang)).toFixed(1));
      pt.setAttribute('cy', (pivot[1] + 62 * Math.sin(ang) + 12 * Math.cos(ang)).toFixed(1));
      setOpacity(eq, seg(t, 3.4, 4.1));
      setOpacity(num, seg(t, 5.4, 6.1));
      setOpacity(mode, seg(t, 9.4, 10.1));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 5 幕：接触图共用同一个环境点 ─────────────────────────────────
  function buildSceneContact() {
    var s = sceneSvg(
      '接触向量是体表点指向最近环境点的向量，人和机器人共用同一个环境点；只有人侧向量短于阈值的点进入活跃集，离开物体就自动退出'
    );
    s.appendChild(svgText(56, 26, '接触 = 每帧算出来的向量残差，不是相位状态机', 'demo-x-ink2', 13.5));

    var arrH = K.arrowMarker(s, 'umr-x-arrow-ch', C_WARN);
    var arrR = K.arrowMarker(s, 'umr-x-arrow-cr', C_ACCENT);

    /* 箱子表面 + 共享环境点 y；1 m → 1000 px（示意） */
    var sc = 1000;
    var boxTop = 250;
    var yPt = [250, boxTop];
    var env = svgEl('g', {});
    env.appendChild(paint(svgEl('rect', { x: 120, y: boxTop, width: 260, height: 120, 'stroke-width': 1.4 }), C_SURFACE2, C_BORDER));
    env.appendChild(svgText(250, 320, '物体 / 场景 / 地面', 'demo-x-mut', 10, 'middle'));
    env.appendChild(paint(svgEl('circle', { cx: yPt[0], cy: yPt[1], r: 5 }), C_GOOD));
    env.appendChild(paint(svgText(262, boxTop + 18, 'y_π(i)', null, 10), C_GOOD));
    s.appendChild(env);

    var ring = paint(
      svgEl('circle', { cx: yPt[0], cy: yPt[1], r: TAU_C * sc, fill: 'none', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }),
      null,
      C_MUTED
    );
    s.appendChild(ring);
    var ringLbl = svgText(yPt[0] - TAU_C * sc - 4, yPt[1] - 8, 'τ_c = ' + TAU_C + ' m', 'demo-x-mono', 9, 'end');
    s.appendChild(ringLbl);

    var hDot = paint(svgEl('circle', { r: 5 }), C_WARN);
    var hVec = paint(svgEl('path', { fill: 'none', 'stroke-width': 1.6, 'marker-end': arrH }), null, C_WARN);
    var rDot = paint(svgEl('circle', { r: 5 }), C_ACCENT);
    var rVec = paint(svgEl('path', { fill: 'none', 'stroke-width': 1.6, 'marker-end': arrR }), null, C_ACCENT);
    var hLbl = paint(svgText(0, 0, 'c^h', null, 10.5), C_WARN);
    var rLbl = paint(svgText(0, 0, 'c^r', null, 10.5), C_ACCENT);
    [hVec, rVec, hDot, rDot, hLbl, rLbl].forEach(function (n) {
      s.appendChild(n);
    });
    var state = svgText(250, 390, '', 'demo-x-ink2', 11, 'middle');
    s.appendChild(state);

    var eq = svgMath(600, 70, '\\mathbf{c}^h_{t,i} = \\mathbf{x}^h_{t,i} - \\mathbf{y}_{t,\\pi_t(i)},\\ \\ \\mathbf{c}^r_i = \\mathbf{x}^r_i(\\mathbf{q}_t) - \\mathbf{y}_{t,\\pi_t(i)}', {
      size: 12,
      w: 360,
      anchor: 'middle'
    });
    eq.setTone('var(--demo-accent)');
    s.appendChild(eq);
    var eq2 = svgMath(600, 104, '\\mathbf{r}_{c,i} = \\sqrt{w^c_i}\\,(\\mathbf{c}^r_i - \\mathbf{c}^h_{t,i}),\\ \\ \\lVert\\mathbf{c}^h_{t,i}\\rVert \\le \\tau_c', {
      size: 12,
      w: 360,
      anchor: 'middle'
    });
    s.appendChild(eq2);

    var num = svgEl('g', {});
    box(num, 440, 132, 320, 110, C_SURFACE, C_BORDER, 1.2);
    num.appendChild(svgText(456, 154, '算一对手点（m）', 'demo-x-ink2', 11));
    num.appendChild(svgText(456, 176, 'c^h = (0, ' + fmt(CT_CH[1], 2) + ', 0)，‖c^h‖ = ' + fmt(CT_CH_NORM, 2) + ' ≤ ' + TAU_C + ' → 活跃', 'demo-x-mono', 9));
    num.appendChild(svgText(456, 196, 'c^r = (0, ' + fmt(CT_CR[1], 2) + ', ' + fmt(CT_CR[2], 2) + ')', 'demo-x-mono', 9));
    num.appendChild(paint(svgText(456, 220, '残差 ‖c^r − c^h‖ = ' + fmt(CT_RES, 4) + ' m', null, 10.5), C_ACCENT));
    s.appendChild(num);

    var why = svgEl('g', {});
    box(why, 440, 256, 320, 114, C_SURFACE2, C_GOOD, 1.2);
    why.appendChild(paint(svgText(456, 278, '代数上 c^r − c^h = x^r − x^h', null, 11), C_GOOD));
    why.appendChild(svgText(456, 300, '（按论文式子推导）接触项的作用是：', 'demo-x-mut', 9.5));
    why.appendChild(svgText(456, 318, '对「贴着环境」的那几个点再加一份权重 w^c，', 'demo-x-mut', 9.5));
    why.appendChild(svgText(456, 336, '且只在活跃集里生效；自接触把 y 换成', 'demo-x-mut', 9.5));
    why.appendChild(svgText(456, 354, '另一个不相邻身体分区上的对应点', 'demo-x-mut', 9.5));
    s.appendChild(why);

    function place(pt, off) {
      return [yPt[0] + off[0] * sc, yPt[1] - off[1] * sc];
    }
    function draw(t) {
      var show = seg(t, 0.4, 1.0);
      [env, ring, ringLbl].forEach(function (n) {
        setOpacity(n, show);
      });
      setOpacity(eq, seg(t, 1.2, 1.8));
      setOpacity(eq2, seg(t, 1.2, 1.8));
      /* 人手从贴箱 3 cm 抬到 12 cm：先停住让读者看数字，再离开 */
      var lift = ease(seg(t, 8.6, 10.6));
      var hOff = [0, CT_CH_NORM + (CT_LEAVE - CT_CH_NORM) * lift];
      var rOff = [0.03, CT_CR[1] + (CT_LEAVE + 0.06 - CT_CR[1]) * lift];
      var hp = place(null, hOff),
        rp = place(null, rOff);
      var pv = seg(t, 2.2, 2.8);
      [hDot, hVec, hLbl, rDot, rVec, rLbl].forEach(function (n) {
        setOpacity(n, pv);
      });
      hDot.setAttribute('cx', hp[0].toFixed(1));
      hDot.setAttribute('cy', hp[1].toFixed(1));
      rDot.setAttribute('cx', rp[0].toFixed(1));
      rDot.setAttribute('cy', rp[1].toFixed(1));
      hVec.setAttribute('d', polyPath([hp, [yPt[0] - 3, yPt[1] - 4]]));
      rVec.setAttribute('d', polyPath([rp, [yPt[0] + 3, yPt[1] - 4]]));
      hLbl.setAttribute('x', (hp[0] - 34).toFixed(1));
      hLbl.setAttribute('y', (hp[1] + 4).toFixed(1));
      rLbl.setAttribute('x', (rp[0] + 10).toFixed(1));
      rLbl.setAttribute('y', (rp[1] + 4).toFixed(1));
      var cNorm = Math.hypot(hOff[0], hOff[1]);
      var active = cNorm <= TAU_C;
      state.textContent = t < 2.2 ? '' : '‖c^h‖ = ' + fmt(cNorm, 3) + ' m → ' + (active ? '活跃接触' : '退出活跃集');
      paint(hVec, null, active ? C_WARN : C_MUTED);
      paint(rVec, null, active ? C_ACCENT : C_MUTED);
      setOpacity(num, seg(t, 3.6, 4.3));
      setOpacity(why, seg(t, 11.0, 11.7));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 6 幕：阻尼约束 Gauss-Newton QP ─────────────────────────────────
  function buildSceneQp() {
    var s = sceneSvg(
      '残差经 FK 线性化，每步解一个带阻尼的凸二次规划，约束为关节限位、地面净空和信赖域；信赖域激活时等价于加大阻尼'
    );
    s.appendChild(svgText(56, 26, '每一步：线性化 → 带约束的凸 QP → Clarabel', 'demo-x-ink2', 13.5));

    var eq = svgMath(
      220,
      62,
      '\\min_{\\Delta\\mathbf{q}}\\ \\tfrac12\\lVert\\mathbf{r} + \\mathbf{J}\\Delta\\mathbf{q}\\rVert^2 + \\tfrac{\\mu}{2}\\lVert\\Delta\\mathbf{q}\\rVert^2',
      { size: 13, w: 380, anchor: 'middle' }
    );
    eq.setTone('var(--demo-accent)');
    s.appendChild(eq);

    var cons = svgEl('g', {});
    box(cons, 40, 92, 360, 96, C_SURFACE, C_BORDER, 1.2);
    cons.appendChild(svgText(56, 114, '约束（论文 Eq. 13–15）', 'demo-x-ink2', 11));
    cons.appendChild(svgText(56, 136, '关节限位  q⁻ ≤ q + Δq ≤ q⁺', 'demo-x-mono', 9.5));
    cons.appendChild(svgText(56, 156, '地面净空  −J^z_i Δq ≤ z_i − z_f（近地表面点）', 'demo-x-mono', 9.5));
    cons.appendChild(svgText(56, 176, '信赖域    ‖Δq‖₂ ≤ η = ' + ETA + '；阻尼 μ = ' + MU, 'demo-x-mono', 9.5));
    s.appendChild(cons);

    var num = svgEl('g', {});
    box(num, 40, 202, 360, 180, C_SURFACE2, C_ACCENT, 1.2);
    num.appendChild(svgText(56, 224, '算一步：2 个关节、2 条残差（示意数字）', 'demo-x-ink2', 11));
    num.appendChild(svgText(56, 246, 'J = [[0.4, 0.1], [0, 0.3]]，r = (0.06, −0.03)，‖r‖ = ' + fmt(GN_R0, 4), 'demo-x-mono', 9));
    var rows = [
      { t: '纯 GN（μ = 0）', dq: DQ_GN, res: 0, c: C_MUTED },
      { t: '加阻尼 μ = ' + MU, dq: DQ_DAMP, res: RES_DAMP, c: C_WARN },
      { t: '再加信赖域 η = ' + ETA, dq: DQ_TR, res: RES_TR, c: C_GOOD }
    ];
    var rowEls = rows.map(function (r, k) {
      var g = svgEl('g', {});
      var y = 270 + k * 22;
      g.appendChild(paint(svgText(56, y, r.t, null, 9.5), r.c));
      g.appendChild(
        svgText(
          190,
          y,
          'Δq = (' + fmt(r.dq[0], 3) + ', ' + fmt(r.dq[1], 3) + ')  ‖Δq‖ = ' + fmt(norm2(r.dq), 3),
          'demo-x-mono',
          9
        )
      );
      num.appendChild(g);
      return g;
    });
    var tail = svgEl('g', {});
    tail.appendChild(svgText(56, 342, '信赖域激活 ⇔ 阻尼再加 λ = ' + fmt(TR_LAMBDA, 4) + '（KKT）', 'demo-x-mut', 9.5));
    tail.appendChild(
      svgText(56, 362, '线性化残差 ' + fmt(GN_R0, 4) + ' → ' + fmt(RES_TR, 4) + '；地面项 J^zΔq = ' + fmt(FLOOR_DZ, 4) + ' ≥ −' + GN_Z_GAP, 'demo-x-mut', 9)
    );
    num.appendChild(tail);
    s.appendChild(num);

    /* 右：Δq 平面，1 rad → 1000 px */
    var ox = 740,
      oy = 340,
      sc = 1000;
    function P(dq) {
      return [ox + dq[0] * sc, oy - dq[1] * sc];
    }
    var plane = svgEl('g', {});
    plane.appendChild(paint(svgEl('path', { d: polyPath([[430, oy], [770, oy]]), fill: 'none', 'stroke-width': 1 }), null, C_BORDER));
    plane.appendChild(paint(svgEl('path', { d: polyPath([[ox, 380], [ox, 120]]), fill: 'none', 'stroke-width': 1 }), null, C_BORDER));
    plane.appendChild(svgText(436, oy + 16, 'Δq₁ (rad)', 'demo-x-mono', 9));
    plane.appendChild(svgText(ox - 6, 128, 'Δq₂', 'demo-x-mono', 9, 'end'));
    plane.appendChild(
      paint(
        svgEl('path', {
          d: 'M ' + ox + ' ' + (oy - ETA * sc) + ' A ' + ETA * sc + ' ' + ETA * sc + ' 0 0 0 ' + (ox - ETA * sc) + ' ' + oy,
          fill: 'none',
          'stroke-width': 1.5,
          'stroke-dasharray': '6 4'
        }),
        null,
        C_GOOD
      )
    );
    plane.appendChild(paint(svgText(ox - ETA * sc * 0.72 - 6, oy - ETA * sc * 0.72 - 6, '‖Δq‖ = ' + ETA, null, 9.5, 'end'), C_GOOD));
    s.appendChild(plane);

    var marks = rows.map(function (r) {
      var g = svgEl('g', {});
      var p = P(r.dq);
      g.appendChild(paint(svgEl('path', { d: polyPath([[ox, oy], p]), fill: 'none', 'stroke-width': 1.3 }), null, r.c));
      g.appendChild(paint(svgEl('circle', { cx: p[0], cy: p[1], r: 5 }), r.c));
      s.appendChild(g);
      return g;
    });

    var foot = paint(svgText(590, 400, '线性化只在局部成立：宁可少走一点，也不跳到奇异位形', null, 11.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(eq, seg(t, 0.3, 1.0));
      setOpacity(cons, seg(t, 1.2, 1.9));
      setOpacity(num, seg(t, 3.4, 4.0));
      setOpacity(plane, seg(t, 3.4, 4.0));
      [4.4, 6.0, 7.8].forEach(function (a, k) {
        setOpacity(rowEls[k], seg(t, a, a + 0.5));
        setOpacity(marks[k], seg(t, a, a + 0.5));
      });
      setOpacity(tail, seg(t, 9.6, 10.2));
      setOpacity(foot, seg(t, 11.8, 12.4));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 7 幕：三个尺度的定量证据 ─────────────────────────────────────
  function buildSceneEvidence() {
    var s = sceneSvg(
      '单段跟踪上 UMR 在翻滚与格斗动作上比 GMR 高约 12 个百分点；接触密集任务上关节误差比 OmniRetarget 低 40% 到 56%'
    );
    s.appendChild(svgText(56, 26, '只换重定向，下游配方不动：差距落在接触密集、大幅翻滚的动作上', 'demo-x-ink2', 13.5));

    function barRow(g, x, y, label, a, b, max, w, fa, fb, suffix) {
      g.appendChild(svgText(x, y + 10, label, 'demo-x-ink2', 10));
      var bx = x + 96;
      g.appendChild(paint(svgEl('rect', { x: bx, y: y, width: (a / max) * w, height: 9, rx: 2 }), C_ACCENT));
      g.appendChild(paint(svgEl('rect', { x: bx, y: y + 12, width: (b / max) * w, height: 9, rx: 2 }), C_MUTED));
      g.appendChild(svgText(bx + (a / max) * w + 4, y + 8, fa, 'demo-x-mono', 8.5));
      g.appendChild(svgText(bx + (b / max) * w + 4, y + 20, fb, 'demo-x-mono', 8.5));
      if (suffix) g.appendChild(paint(svgText(x + 96 + w + 80, y + 15, suffix, null, 10, 'end'), C_GOOD));
    }

    var g1 = svgEl('g', {});
    box(g1, 40, 48, 350, 150, C_SURFACE, C_BORDER, 1.2);
    g1.appendChild(svgText(56, 70, 'Table II · 成功率 %（Sim 无 DR，G1）', 'demo-x-ink2', 11));
    g1.appendChild(paint(svgText(56, 88, '■ UMR', null, 9), C_ACCENT));
    g1.appendChild(paint(svgText(110, 88, '■ GMR', null, 9), C_MUTED));
    barRow(g1, 56, 104, 'Fall & GetUp', T2.fall.umr, T2.fall.gmr, 100, 150, fmt(T2.fall.umr, 2), fmt(T2.fall.gmr, 2), '+' + fmt(FALL_GAIN, 2));
    barRow(g1, 56, 144, 'Fight', T2.fight.umr, T2.fight.gmr, 100, 150, fmt(T2.fight.umr, 2), fmt(T2.fight.gmr, 2), '+' + fmt(FIGHT_GAIN, 2));
    s.appendChild(g1);

    var g2 = svgEl('g', {});
    box(g2, 410, 48, 350, 196, C_SURFACE, C_BORDER, 1.2);
    g2.appendChild(svgText(426, 70, 'Table IV · 关节误差 rad（人-物，越低越好）', 'demo-x-ink2', 11));
    g2.appendChild(paint(svgText(426, 88, '■ UMR', null, 9), C_ACCENT));
    g2.appendChild(paint(svgText(480, 88, '■ OmniRetarget', null, 9), C_MUTED));
    barRow(g2, 426, 104, 'Carry', T4.carry.umr, T4.carry.omni, 1.5, 150, fmt(T4.carry.umr, 3), fmt(T4.carry.omni, 3), '−' + fmt(CARRY_DROP, 1) + '%');
    barRow(g2, 426, 144, 'Kick', T4.kick.umr, T4.kick.omni, 1.5, 150, fmt(T4.kick.umr, 3), fmt(T4.kick.omni, 3), '−' + fmt(KICK_DROP, 1) + '%');
    barRow(g2, 426, 184, 'Push', T4.push.umr, T4.push.omni, 1.5, 150, fmt(T4.push.umr, 3), fmt(T4.push.omni, 3), '−' + fmt(PUSH_DROP, 1) + '%');
    s.appendChild(g2);

    var g3 = svgEl('g', {});
    box(g3, 40, 214, 350, 108, C_SURFACE2, C_WARN, 1.2);
    g3.appendChild(paint(svgText(56, 236, 'GRAIL Stair（人-场景，源数据噪声大）', null, 11), C_WARN));
    g3.appendChild(svgText(56, 258, '成功率 ' + fmt(STAIR.omni, 2) + '% → ' + fmt(STAIR.umr, 2) + '%，约 ' + fmt(STAIR_X, 2) + ' 倍', 'demo-x-mono', 9.5));
    g3.appendChild(svgText(56, 280, '论文归因：OmniRetarget 的支撑相启发式', 'demo-x-mut', 9.5));
    g3.appendChild(svgText(56, 298, '跨分布失配，不该粘的接触一直粘着', 'demo-x-mut', 9.5));
    g3.appendChild(svgText(56, 314, 'Chair 上 OmniRetarget 仍略优（79.67 vs 75.24）', 'demo-x-mut', 9));
    s.appendChild(g3);

    var g4 = svgEl('g', {});
    box(g4, 410, 258, 350, 64, C_SURFACE2, C_GOOD, 1.2);
    g4.appendChild(paint(svgText(426, 280, 'SONIC + BONES-SEED（不带 SMPL encoder）', null, 11), C_GOOD));
    g4.appendChild(svgText(426, 302, '总奖励 / 锚点误差 / 关节误差一致更好，后期约 +10%', 'demo-x-mut', 9.5));
    s.appendChild(g4);

    var foot = paint(svgText(400, 360, '成功率 vs 关节误差：OmniContact 终止判据宽松，关节误差更能说明参考质量', null, 12, 'middle'), C_ACCENT);
    s.appendChild(foot);
    var foot2 = svgText(400, 384, '对 Unitree 官方精修参考基本打平；Walk / Jump 这类平稳动作两者都够用', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(foot2);

    function draw(t) {
      setOpacity(g1, seg(t, 0.4, 1.1));
      setOpacity(g2, seg(t, 3.0, 3.7));
      setOpacity(g3, seg(t, 6.2, 6.9));
      setOpacity(g4, seg(t, 8.2, 8.9));
      setOpacity(foot, seg(t, 10.0, 10.6));
      setOpacity(foot2, seg(t, 11.2, 11.8));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 8 幕：闭环与源码落点 ─────────────────────────────────────────
  function buildSceneLoop() {
    var s = sceneSvg(
      '阶段一一次性准备约 26 秒且可复用，阶段二预处理与求解串行，端到端 65 帧每秒；配置切成机器人与动作源正交的两半'
    );
    s.appendChild(svgText(56, 26, '半分钟学一次对应，之后每段动作 65 FPS', 'demo-x-ink2', 13.5));

    var st1 = svgEl('g', {});
    st1.appendChild(svgText(40, 64, '阶段一（每个「源模板 × 机器人」一次，Table I）', 'demo-x-ink2', 11));
    var parts = [
      { v: T1.sample, t: '采样', c: C_WARN },
      { v: T1.geo, t: '测地', c: C_GOOD },
      { v: T1.train, t: '训练', c: C_ACCENT }
    ];
    var x = 40,
      pxs = 560 / STAGE1_S;
    parts.forEach(function (p) {
      var w = p.v * pxs;
      st1.appendChild(paint(svgEl('rect', { x: x, y: 74, width: w - 2, height: 26, rx: 4 }), p.c));
      st1.appendChild(svgText(x + w / 2, 116, p.t + ' ' + fmt(p.v, 2) + ' s', 'demo-x-mono', 9.5, 'middle'));
      x += w;
    });
    st1.appendChild(paint(svgText(760, 92, '= ' + fmt(STAGE1_S, 2) + ' s', null, 11, 'end'), C_ACCENT));
    s.appendChild(st1);

    var st2 = svgEl('g', {});
    st2.appendChild(svgText(40, 150, '阶段二（每帧串行两段）', 'demo-x-ink2', 11));
    var msScale = 30;
    st2.appendChild(paint(svgEl('rect', { x: 40, y: 160, width: PREP_MS * msScale - 2, height: 26, rx: 4 }), C_WARN));
    st2.appendChild(paint(svgEl('rect', { x: 40 + PREP_MS * msScale, y: 160, width: SOLVE_MS * msScale - 2, height: 26, rx: 4 }), C_ACCENT));
    st2.appendChild(svgText(40 + (PREP_MS * msScale) / 2, 202, '预处理 ' + fmt(T1.prep, 2) + ' FPS = ' + fmt(PREP_MS, 2) + ' ms', 'demo-x-mono', 9, 'middle'));
    st2.appendChild(
      svgText(40 + PREP_MS * msScale + (SOLVE_MS * msScale) / 2, 202, '求解 ' + fmt(T1.solve, 2) + ' FPS = ' + fmt(SOLVE_MS, 2) + ' ms', 'demo-x-mono', 9, 'middle')
    );
    st2.appendChild(
      paint(svgText(760, 178, '1000 / ' + fmt(PREP_MS + SOLVE_MS, 2) + ' = ' + fmt(E2E_FPS, 2) + ' FPS', null, 11, 'end'), C_ACCENT)
    );
    st2.appendChild(
      svgText(760, 220, '一段 ' + CLIP_S + ' s、' + CLIP_FPS + ' fps 的动作 ≈ ' + fmt(CLIP_WALL_S, 1) + ' s 跑完（fps 为假设）', 'demo-x-mut', 9.5, 'end')
    );
    s.appendChild(st2);

    var cfgA = svgEl('g', {});
    box(cfgA, 40, 244, 350, 86, C_SURFACE2, C_ACCENT, 1.3);
    cfgA.appendChild(paint(svgText(56, 266, 'robot_configs/*.json', null, 11), C_ACCENT));
    cfgA.appendChild(svgText(56, 288, '只描述机器人：tpose_qpos / 限位 / MJCF', 'demo-x-mut', 9.5));
    cfgA.appendChild(svgText(56, 306, '唯一的人工产出：UMR Studio 摆 T-pose', 'demo-x-mut', 9.5));
    cfgA.appendChild(svgText(56, 322, '仓库自带 ' + N_ROBOTS + ' 款人形 + MimicKit 角色', 'demo-x-mono', 9));
    s.appendChild(cfgA);

    var cfgB = svgEl('g', {});
    box(cfgB, 410, 244, 350, 86, C_SURFACE2, C_GOOD, 1.3);
    cfgB.appendChild(paint(svgText(426, 266, 'humanoid_retarget_defaults*.json', null, 11), C_GOOD));
    cfgB.appendChild(svgText(426, 288, '只描述动作源与任务：采样 / 损失 / 求解器', 'demo-x-mut', 9.5));
    cfgB.appendChild(svgText(426, 306, 'N = ' + N_POINTS + '，τ_c = ' + TAU_C + '，μ = ' + MU + '，η = ' + ETA, 'demo-x-mono', 9));
    cfgB.appendChild(svgText(426, 322, '身体分区权重按动作源分文件，不按机器人', 'demo-x-mut', 9.5));
    s.appendChild(cfgB);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 364, 'UMR = 体表稠密对应 + 约束 GN：去掉手写映射表，接触一并搬过去', null, 13.5, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 388, '局限：要网格化的源几何；纯运动学，动力学可行性仍交给下游 RL', 'demo-x-mut', 10.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      setOpacity(st1, seg(t, 0.4, 1.1));
      setOpacity(st2, seg(t, 2.6, 3.3));
      setOpacity(cfgA, seg(t, 6.0, 6.7));
      setOpacity(cfgB, seg(t, 7.4, 8.1));
      setOpacity(foot, seg(t, 9.6, 10.3));
    }
    return { el: s, draw: draw };
  }

  var UMR_SCENES = [
    {
      title: '骨架中心：一款机器人一套配方',
      dur: 12,
      build: buildSceneProblem,
      cues: [
        { at: 0.4, s: 'GMR、OmniRetarget、ReActor 的对应都是人手工挑的：人的哪块 ↔ 机器人的哪块。' },
        { at: 2.2, s: '仓库里 ' + N_ROBOTS + ' 款人形，按骨架路线就是 ' + N_ROBOTS + ' 张手写映射表，换动作源还得再来一遍。' },
        { at: 3.6, s: '麻烦一：换机器人 / 换源骨架 → 重写映射、重调权重。' },
        { at: 4.9, s: '麻烦二：关节是离散点，**关节之间的大片体表没人约束**，肩背、胯部靠插值。' },
        { at: 6.2, s: '麻烦三：接触靠支撑相检测 + 脚部硬粘，跨动作分布会失配。' },
        { at: 8.0, s: 'UMR 把接口换成**体表点云**：对应从几何里学，不从语义里指定。' },
        { at: 10.0, s: '换机器人只要一个 T-pose，不再写映射表。' }
      ]
    },
    {
      title: '体表点云当接口：形变而非匹配',
      dur: 12,
      build: buildSceneSurface,
      cues: [
        { at: 0.4, s: '网络把人点云整体形变成机器人形状：$\\hat{\\mathbf{x}}^r_i = \\mathbf{x}^h_i + \\mathbf{d}_i$。' },
        { at: 1.8, s: '人侧点云**有序**，机器人侧点云**无序**；两边默认各采 **' + N_POINTS + '** 个外表面点（first-hit）。' },
        { at: 3.4, s: 'PointNet 把机器人点云压成一个潜向量，MLP 为每个人点吐一个形变向量 $\\mathbf{d}_i$。' },
        { at: 5.4, s: '点在「变形」，不是在「找对象」：第 $i$ 个点从人身上一路走到机器人身上。' },
        { at: 7.8, s: '所以第 $i$ 个人点和第 $i$ 个机器人点**天生就是一对**，根本没有匹配这一步。' },
        { at: 9.8, s: '只在 T-pose 上学一次；同一「源模板 × 机器人」的所有动作共享这套点对。' }
      ]
    },
    {
      title: '三项损失与测地图',
      dur: 13,
      build: buildSceneLoss,
      cues: [
        { at: 0.4, s: '$\\mathcal{L}_{\\mathrm{corr}} = \\lambda_c\\mathcal{L}_c + \\lambda_r\\mathcal{L}_r + \\lambda_e\\mathcal{L}_e$，仓库默认 ' + fmt(LAMBDA_C, 1) + ' / ' + LAMBDA_R + ' / ' + fmt(LAMBDA_E, 1) + '。' },
        { at: 1.6, s: '算例：三个点正确对应，$\\mathcal{L}_c = 0$，$\\mathcal{L}_e = ' + fmt(LE_OK, 4) + '$。' },
        { at: 3.6, s: '把左右翻过来：点集还是那三个，$\\mathcal{L}_c$ 依旧是 **0** —— Chamfer 看不出错。' },
        { at: 5.2, s: '但 $\\mathcal{L}_e$ 变成 ' + fmt(LE_FLIP, 4) + '，是正确对应的 **' + fmt(LE_RATIO, 0) + ' 倍**。这就是论文说 Edge 项「关键」的原因。' },
        { at: 7.2, s: 'Repulsion 核 $e^{-d^2/r^2}$，$r = ' + REP_R + '$ m：1 cm 时 ' + fmt(repKernel(0.01), 3) + '，7 cm 时只剩 ' + fmt(repKernel(2 * REP_R), 3) + '，只管防扎堆。' },
        { at: 9.2, s: 'Edge 沿**测地图**（k = ' + EDGE_K + '）建边：手臂贴躯干时欧氏近、体表远，不能连。' },
        { at: 11.4, s: '学完白送：机器人点继承人体的身体分区标签，权重可跨机器人复用。' }
      ]
    },
    {
      title: '绑定与位姿残差：位置 + 法向',
      dur: 13,
      build: buildScenePose,
      cues: [
        { at: 0.4, s: '人点用**重心坐标**绑在源网格三角面上，网格怎么动它就怎么动。' },
        { at: 1.8, s: '机器人点绑在**连杆局部坐标**上，由 FK 带着走 —— 残差因此是 $\\mathbf{q}_t$ 的非线性函数。' },
        { at: 3.6, s: '每对点一条残差：位置差加法向差，权重 $w^p_i, w^n_i$ 按身体分区给。' },
        { at: 5.6, s: '算例：位置差平方和 ' + fmt(POSE_POS_SQ, 4) + '；法向转角差 10°，$2(1-\\cos 10^\\circ) = ' + fmt(NORMAL_SQ, 4) + '$。' },
        { at: 7.6, s: '示意权重 $w^n = ' + W_N + '$ 下，10° 的朝向差 ≈ **' + fmt(NORMAL_AS_POS_CM, 1) + ' cm** 的位置差。' },
        { at: 9.6, s: '法向比的是**相对各自 T-pose 绑定的转动**（`tpose_offset`），不是绝对朝向。' }
      ]
    },
    {
      title: '接触图：共用同一个环境点',
      dur: 13,
      build: buildSceneContact,
      cues: [
        { at: 0.4, s: '对每个人点找最近环境点 $\\pi_t(i)$：物体、场景、地面走同一套构造。' },
        { at: 1.6, s: '人和机器人**共用这个环境点**：$\\mathbf{c}^h = \\mathbf{x}^h - \\mathbf{y}$，$\\mathbf{c}^r = \\mathbf{x}^r - \\mathbf{y}$。' },
        { at: 3.8, s: '算例：$\\lVert\\mathbf{c}^h\\rVert = ' + fmt(CT_CH_NORM, 2) + '\\ \\mathrm{m} \\le \\tau_c = ' + TAU_C + '$，活跃；残差 ' + fmt(CT_RES, 4) + ' m。' },
        { at: 6.2, s: '只有 $\\lVert\\mathbf{c}^h\\rVert \\le \\tau_c$ 的点进入活跃集，其余点不参与接触项。' },
        { at: 8.6, s: '人手抬离箱子，$\\lVert\\mathbf{c}^h\\rVert$ 涨到 ' + fmt(CT_LEAVE, 2) + ' m，**自动退出**活跃集 —— 不需要相位状态机。' },
        { at: 11.0, s: '按式子推导 $\\mathbf{c}^r - \\mathbf{c}^h = \\mathbf{x}^r - \\mathbf{x}^h$：接触项是给贴着环境的点再加一份权重。' }
      ]
    },
    {
      title: '阻尼约束 Gauss-Newton QP',
      dur: 14,
      build: buildSceneQp,
      cues: [
        { at: 0.4, s: '线性化 $\\mathbf{r}(\\mathbf{q}+\\Delta\\mathbf{q}) \\approx \\mathbf{r} + \\mathbf{J}\\Delta\\mathbf{q}$，每步解一个带阻尼 $\\mu$ 的凸 QP。' },
        { at: 1.6, s: '三条硬约束：关节限位、近地表面点不穿地、信赖域 $\\lVert\\Delta\\mathbf{q}\\rVert_2 \\le \\eta$。' },
        { at: 4.4, s: '算例：纯 GN 一步走到 $\\lVert\\Delta\\mathbf{q}\\rVert = ' + fmt(norm2(DQ_GN), 3) + '$，线性化残差直接归零。' },
        { at: 6.0, s: '加阻尼 $\\mu = ' + MU + '$：步长缩到 ' + fmt(norm2(DQ_DAMP), 3) + '，仍超过 $\\eta = ' + ETA + '$。' },
        { at: 7.8, s: '信赖域卡住：解落在圆上，$\\Delta\\mathbf{q} = (' + fmt(DQ_TR[0], 3) + ', ' + fmt(DQ_TR[1], 3) + ')$，方向也跟着变了。' },
        { at: 9.6, s: 'KKT 看，等价于阻尼再加 $\\lambda = ' + fmt(TR_LAMBDA, 4) + '$；残差 ' + fmt(GN_R0, 4) + ' → ' + fmt(RES_TR, 4) + '，剩下的留给下一次迭代。' },
        { at: 11.8, s: 'QP 交给 **Clarabel**，FK 与几何走 **MuJoCo**。' }
      ]
    },
    {
      title: '三个尺度的定量证据',
      dur: 13,
      build: buildSceneEvidence,
      cues: [
        { at: 0.4, s: 'BeyondMimic 单段跟踪：Fall & GetUp 比 GMR 高 **' + fmt(FALL_GAIN, 2) + '** pp，Fight 高 **' + fmt(FIGHT_GAIN, 2) + '** pp。' },
        { at: 3.0, s: 'OmniContact 人-物任务，关节误差对 OmniRetarget 降 ' + fmt(PUSH_DROP, 1) + '% – ' + fmt(KICK_DROP, 1) + '%。' },
        { at: 6.2, s: 'GRAIL Stair：' + fmt(STAIR.omni, 2) + '% → ' + fmt(STAIR.umr, 2) + '%；Chair 上 OmniRetarget 仍略优，论文如实报了。' },
        { at: 8.2, s: 'SONIC 关掉 SMPL encoder 才能看出参考质量：UMR 后期约好 10%。' },
        { at: 10.0, s: '成功率对保真度不敏感时，**关节误差**更能说明问题。' }
      ]
    },
    {
      title: '闭环与源码落点',
      dur: 12,
      build: buildSceneLoop,
      cues: [
        { at: 0.4, s: '阶段一：' + fmt(T1.sample, 2) + ' + ' + fmt(T1.geo, 2) + ' + ' + fmt(T1.train, 2) + ' = **' + fmt(STAGE1_S, 2) + ' s**，一次性且可复用。' },
        { at: 2.6, s: '阶段二两段串行：' + fmt(PREP_MS, 2) + ' ms + ' + fmt(SOLVE_MS, 2) + ' ms → **' + fmt(E2E_FPS, 2) + ' FPS**，正好对上 Table I 的端到端数字。' },
        { at: 4.6, s: '按 ' + CLIP_FPS + ' fps 假设，一分钟动作约 ' + fmt(CLIP_WALL_S, 1) + ' s 重定向完。' },
        { at: 6.0, s: '配置切成正交两半：`robot_configs/*.json` 只写机器人，唯一人工产出是 `tpose_qpos`。' },
        { at: 7.4, s: '`humanoid_retarget_defaults*.json` 只写动作源与求解参数，与机器人无关。' },
        { at: 9.6, s: '**UMR = 体表稠密对应 + 约束 GN**：去掉手写映射表，接触一并搬过去。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '八幕动画：UMR 全流程速览',
      sub: '约 102 秒自动播放。空格播放/暂停，← → 换幕；画面里的算例数字都是现算的，与正文「数据计算实例」一致。',
      ariaLabel: 'UMR 八幕讲解动画',
      notes: [
        '取数依据：第三幕的 $\\lambda_c / \\lambda_r / \\lambda_e$、$r$、$K_r$、$k$，第五幕的 $\\tau_c$，第六幕的 $\\mu$、$\\eta$ 都取自仓库 `humanoid_retarget_defaults.json`；第七幕是论文 Table II / IV 原值，差值与降幅现算；第八幕 ' +
          fmt(STAGE1_S, 2) +
          ' s 与 ' +
          fmt(E2E_FPS, 2) +
          ' FPS 由 Table I 分项现加 / 串行合成，与论文的合计一致。',
        '第二至六幕的点云、三点对应、位置 / 法向差、接触向量、$\\mathbf{J}$ 与 $\\mathbf{r}$ 都是**示意算例，不是论文数据**；权重 $w^p = ' +
          W_P +
          '$、$w^n = ' +
          W_N +
          '$ 也是示意值（仓库按身体分区给权重）。第八幕的 ' +
          CLIP_FPS +
          ' fps 是假设。第五幕「接触项等于给活跃点加权」是按论文式子做的代数推导。'
      ],
      scenes: UMR_SCENES
    });
  }

  K.mount({
    'umr-explainer': buildExplainerDemo
  });
})();
