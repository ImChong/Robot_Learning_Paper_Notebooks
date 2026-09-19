/* Interactive OmniRetarget explainer for
 * papers/02_Motion_Retargeting/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["omniretarget"]`, after assets/js/demos/kit.js. The note itself may
 * only contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   omniretarget-explainer — 七幕讲解动画：现有 retargeting 只盯人体关键点 →
 *     interaction mesh 的 Delaunay 四面体 → Laplacian 形变能 → 序贯 SOCP 硬约束 →
 *     一条演示四路扩增 → 极简 RL 与 Table II 定量论据 → 数据工厂到 G1 真机的闭环
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
  /* 论文 Eq. (3e) 的 stance 判定：源动作里脚的 xy 速度 < 1 cm/s 才粘地。
     按常见 30 fps mocap 换算，单帧水平位移上限是多少毫米。 */
  var STANCE_CM_S = 1;
  var MOCAP_FPS = 30;
  var STANCE_MM_FRAME = (STANCE_CM_S * 10) / MOCAP_FPS; // 0.333 mm/帧

  /* 下游与 BeyondMimic 对齐的极简配方。 */
  var N_REWARDS = 5;
  var N_DR = 4;
  var N_TERMS = N_REWARDS + N_DR; // 9

  /* 论文 Table II · OMOMO 人-物交互（G1）。 */
  var OBJ = {
    phc: { pen: 0.68, depth: 5.11, skate: 0.05, contact: 0.96, rl: 71.28 },
    gmr: { pen: 0.83, depth: 8.5, skate: 0.02, contact: 0.99, rl: 50.83 },
    vm: { pen: 0.6, depth: 7.48, skate: 0.12, contact: 0.77, rl: 3.85 },
    omni: { pen: 0.0, depth: 1.34, skate: 0, contact: 0.96, rl: 82.2 }
  };
  var VS_PHC = OBJ.omni.rl - OBJ.phc.rl; // 10.92
  var VS_GMR = OBJ.omni.rl - OBJ.gmr.rl; // 31.37
  var VS_VM = OBJ.omni.rl - OBJ.vm.rl; // 78.35
  var DEPTH_VS_GMR = OBJ.gmr.depth - OBJ.omni.depth; // 7.16

  /* Table II · 自采 MoCap 人-地形。 */
  var TERR_RL = { phc: 52.63, gmr: 78.94, vm: 51.75, omni: 94.73 };
  var TERR_VS_GMR = TERR_RL.omni - TERR_RL.gmr; // 15.79

  /* 扩增集 vs 名义轨迹（论文 §V，全扩增训练、名义评测）。 */
  var AUG_FULL = 79.1;
  var AUG_NOM = 82.2;
  var AUG_DROP = AUG_NOM - AUG_FULL; // 3.1

  /* 开源数据集三段时长（论文 §V-B），加总对上摘要里的 8+ 小时。 */
  var H_OMOMO = 2.78;
  var H_MOCAP = 1;
  var H_LAFAN = 4.6;
  var H_SUM = H_OMOMO + H_MOCAP + H_LAFAN; // 8.38

  /* 真机旗舰数字。0.9 m 是身高的 70% → 反推名义身高，只用来对照，不是另测。 */
  var PARKOUR_S = 30;
  var CHAIR_KG = 4.6;
  var PLATFORM_M = 0.9;
  var PLATFORM_PCT = 70;
  var ROBOT_H_M = PLATFORM_M / (PLATFORM_PCT / 100); // ≈ 1.286 m
  var WALL_RAD_S = 15;
  var WALL_S = 0.5;
  var WALL_LIN = 3.5;
  var WALL_OK = 5;
  /* 峰值 × 时长，只说明量级：翻转不是匀速，不能当成转过的真实弧度。 */
  var WALL_RAD_IF_PEAK = WALL_RAD_S * WALL_S; // 7.5 rad

  var N_ROBOTS = 3;
  var N_AUG = 4;

  /* 第三幕的玩具 Laplacian：手 / 物体 / 骨盆 / 另一只手，等权 1/3。
     比例取「机器人比人短一截」的量级，不是论文测得的数值。 */
  var LAP_HAND = [2, 0];
  var LAP_OBJ = [10, 0];
  var LAP_PELVIS = [0, -16];
  var LAP_OTHER = [-4, 0];
  var LAP_W = 1 / 3;
  var LAP_SCALE = 0.7;

  function laplacian(p, nbs, w) {
    var lx = p[0],
      ly = p[1];
    nbs.forEach(function (q) {
      lx -= w * q[0];
      ly -= w * q[1];
    });
    return [lx, ly];
  }
  function dist(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
  function scalePt(p, s) {
    return [p[0] * s, p[1] * s];
  }

  var LAP_SRC = laplacian(LAP_HAND, [LAP_OBJ, LAP_PELVIS, LAP_OTHER], LAP_W);
  var LAP_HAND_KP = scalePt(LAP_HAND, LAP_SCALE);
  var LAP_PELVIS_KP = scalePt(LAP_PELVIS, LAP_SCALE);
  var LAP_OTHER_KP = scalePt(LAP_OTHER, LAP_SCALE);
  var LAP_KP = laplacian(LAP_HAND_KP, [LAP_OBJ, LAP_PELVIS_KP, LAP_OTHER_KP], LAP_W);
  var LAP_ERR = Math.hypot(LAP_KP[0] - LAP_SRC[0], LAP_KP[1] - LAP_SRC[1]);
  var DIST_SRC = dist(LAP_HAND, LAP_OBJ);
  var DIST_KP = dist(LAP_HAND_KP, LAP_OBJ);
  var DIST_GROW = DIST_KP - DIST_SRC;

  // ─── 第 1 幕：现有 retargeting 只盯人体关键点 ────────────────────────
  var S1_PIPE = [
    { t: '人体 mocap', d: 'OMOMO / LAFAN1', c: C_MUTED, w: 150 },
    { t: '关键点匹配 + 软惩罚', d: 'PHC / GMR / VideoMimic', c: C_WARN, w: 210, dash: true },
    { t: '机器人关节轨迹', d: '不显式建模物体 / 地形', c: C_MUTED, w: 170 },
    { t: 'RL tracking', d: '十几项 reward 补救', c: C_MUTED, w: 140 }
  ];

  var S1_PAINS = [
    { t: '① 交互被丢掉', d: '手↔物体、脚↔台阶、身体↔墙壁', d2: '只对齐人体关键点，contact 失真' },
    { t: '② 软约束没有保证', d: '脚滑 / 自穿 / 地穿 / 关节突变', d2: 'VideoMimic 也只是软惩罚' },
    { t: '③ 单演示盖不住', d: '换物体位姿、尺寸、地形、本体', d2: '就得重采一条 mocap' }
  ];

  function buildSceneProblem() {
    var s = sceneSvg(
      '现有 retargeting 只做人体关键点匹配，不显式建模物体与地形，软约束也杜绝不了脚滑和穿透；' +
        '一条演示还扩不到新的物体配置、地形高度和机器人本体'
    );
    s.appendChild(svgText(56, 28, 'loco-manipulation 要保住的，不只是「关节角像人」', 'demo-x-ink2', 13.5));

    var arrow = K.arrowMarker(s, 'omni-x-arrow-pipe', C_BORDER);
    var x = 40;
    var pipe = S1_PIPE.map(function (p, k) {
      var g = svgEl('g', {});
      var attrs = { x: x, y: 48, width: p.w, height: 54, rx: 8, 'stroke-width': p.dash ? 1.6 : 1.2 };
      if (p.dash) attrs['stroke-dasharray'] = '5 4';
      g.appendChild(paint(svgEl('rect', attrs), p.dash ? C_SURFACE : C_SURFACE2, p.c));
      g.appendChild(paint(svgText(x + p.w / 2, 71, p.t, null, p.dash ? 12 : 11.5, 'middle'), p.c));
      g.appendChild(svgText(x + p.w / 2, 90, p.d, 'demo-x-mut', 9, 'middle'));
      s.appendChild(g);
      if (k < S1_PIPE.length - 1) {
        s.appendChild(
          paint(
            svgEl('path', { d: polyPath([[x + p.w + 4, 75], [x + p.w + 18, 75]]), fill: 'none', 'stroke-width': 1.5, 'marker-end': arrow }),
            null,
            C_BORDER
          )
        );
      }
      x += p.w + 22;
      return { g: g, at: 0.4 + k * 0.55 };
    });

    var ring = paint(
      svgEl('rect', { x: 206, y: 40, width: 226, height: 70, rx: 10, fill: 'none', 'stroke-width': 1.8, 'stroke-dasharray': '6 4' }),
      null,
      C_BAD
    );
    s.appendChild(ring);

    var pains = S1_PAINS.map(function (p, k) {
      var g = svgEl('g', {});
      var px = 40 + k * 246;
      g.appendChild(paint(svgEl('rect', { x: px, y: 128, width: 234, height: 96, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, C_BAD));
      g.appendChild(paint(svgText(px + 16, 152, p.t, null, 11.5), C_BAD));
      g.appendChild(svgText(px + 16, 176, p.d, 'demo-x-mut', 9, 'start'));
      g.appendChild(svgText(px + 16, 194, p.d2, 'demo-x-mut', 9, 'start'));
      s.appendChild(g);
      return { g: g, at: 3.0 + k * 1.2 };
    });

    var band = svgEl('g', {});
    band.appendChild(paint(svgEl('rect', { x: 40, y: 240, width: 720, height: 60, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, C_ACCENT));
    band.appendChild(paint(svgText(400, 264, '脏参考逼出十几项 reward 调参；干净参考只要 DeepMimic 式 ' + N_REWARDS + ' 项奖励', null, 12.5, 'middle'), C_ACCENT));
    band.appendChild(svgText(400, 286, '这就是 BeyondMimic 的范式：高质量参考 → 极简 RL 配方', 'demo-x-mut', 10, 'middle'));
    s.appendChild(band);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 344, 'OmniRetarget 的回答：interaction mesh 保形 + 硬约束 + 系统性扩增', null, 15, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 370, '把人-物-地形的相对空间关系，保真地搬到机器人上', 'demo-x-mut', 11, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      pipe.forEach(function (p) {
        setOpacity(p.g, seg(t, p.at, p.at + 0.4));
      });
      setOpacity(ring, seg(t, 2.4, 3.0));
      pains.forEach(function (p) {
        setOpacity(p.g, seg(t, p.at, p.at + 0.5));
      });
      setOpacity(band, seg(t, 7.4, 8.2));
      setOpacity(foot, seg(t, 9.6, 10.4));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 2 幕：Interaction mesh 的 Delaunay 四面体 ─────────────────────
  var S2_NODES = [
    { t: '人体语义关键点', d: 'hand / foot / pelvis …', c: C_MUTED },
    { t: '机器人语义关键点', d: '只需 hand ↔ hand', c: C_ACCENT },
    { t: '物体表面采样', d: '接触区更密', c: C_WARN },
    { t: '地形 / 环境采样', d: '平台 / 地面网格', c: C_GOOD }
  ];

  function buildSceneMesh() {
    var s = sceneSvg(
      'Interaction mesh 的顶点是语义关键点加上物体与地形的表面采样点，' +
        'Delaunay 四面体剖分得到体积网格，人体与机器人只需语义一致的对应'
    );
    s.appendChild(svgText(56, 26, '先建一张「人-物-地形」的体积网格，再谈保形', 'demo-x-ink2', 13.5));

    var arrow = K.arrowMarker(s, 'omni-x-arrow-mesh', C_BORDER);
    var nodes = S2_NODES.map(function (n, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 186;
      g.appendChild(paint(svgEl('rect', { x: x, y: 46, width: 174, height: 52, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, n.c));
      g.appendChild(paint(svgText(x + 87, 68, n.t, null, 11.5, 'middle'), n.c));
      g.appendChild(svgText(x + 87, 86, n.d, 'demo-x-mut', 9, 'middle'));
      s.appendChild(g);
      s.appendChild(
        paint(
          svgEl('path', { d: polyPath([[x + 87, 100], [x + 87, 114], [400, 114], [400, 128]]), fill: 'none', 'stroke-width': 1.1 }),
          null,
          C_BORDER
        )
      );
      return { g: g, at: 0.4 + k * 0.55 };
    });

    var core = svgEl('g', {});
    core.appendChild(paint(svgEl('rect', { x: 170, y: 130, width: 460, height: 64, rx: 10, 'stroke-width': 1.8 }), C_SURFACE2, C_GOOD));
    core.appendChild(paint(svgText(400, 156, 'Delaunay 四面体剖分 → volumetric interaction mesh', null, 13.5, 'middle'), C_GOOD));
    core.appendChild(svgText(400, 178, '源侧 P_source 固定；目标侧 P_target(q_t) 随机器人构型变', 'demo-x-mut', 10, 'middle'));
    s.appendChild(core);

    var tet = svgEl('g', {});
    var tetPts = [
      [250, 230],
      [370, 250],
      [310, 318],
      [430, 280]
    ];
    tet.appendChild(
      paint(svgEl('path', { d: polyPath([tetPts[0], tetPts[1], tetPts[2], tetPts[0]]), fill: 'none', 'stroke-width': 1.4 }), null, C_ACCENT)
    );
    tet.appendChild(
      paint(
        svgEl('path', { d: polyPath([tetPts[0], tetPts[1], tetPts[3], tetPts[0]]), fill: 'none', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }),
        null,
        C_MUTED
      )
    );
    tet.appendChild(
      paint(svgEl('path', { d: polyPath([tetPts[1], tetPts[2], tetPts[3], tetPts[1]]), fill: 'none', 'stroke-width': 1.2 }), null, C_BORDER)
    );
    tetPts.forEach(function (p) {
      tet.appendChild(paint(svgEl('circle', { cx: p[0], cy: p[1], r: 5, 'stroke-width': 1.2 }), C_SURFACE2, C_ACCENT));
    });
    tet.appendChild(svgText(250, 218, 'hand', 'demo-x-mono', 9, 'middle'));
    tet.appendChild(svgText(370, 238, 'object', 'demo-x-mono', 9, 'middle'));
    tet.appendChild(svgText(310, 336, 'foot', 'demo-x-mono', 9, 'middle'));
    tet.appendChild(svgText(448, 278, 'terrain', 'demo-x-mono', 9));
    s.appendChild(tet);

    var note = svgEl('g', {});
    note.appendChild(paint(svgEl('rect', { x: 500, y: 214, width: 260, height: 122, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, C_BORDER));
    note.appendChild(svgText(516, 238, '为什么是四面体，不是骨架边？', 'demo-x-ink2', 11));
    note.appendChild(svgText(516, 260, '体积网格才能编码「手在箱子', 'demo-x-mut', 9.5));
    note.appendChild(svgText(516, 276, '哪一侧、脚离台阶多远」这种', 'demo-x-mut', 9.5));
    note.appendChild(svgText(516, 292, '三维相对关系，而不是只连关节点。', 'demo-x-mut', 9.5));
    note.appendChild(paint(svgText(516, 318, '对应只需语义一致，位置可粗', null, 10), C_ACCENT));
    s.appendChild(note);

    var foot = paint(svgText(400, 384, '保的是网格的局部形状，不是把人手坐标硬贴到机器人手上', null, 14, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      nodes.forEach(function (n) {
        setOpacity(n.g, seg(t, n.at, n.at + 0.4));
      });
      setOpacity(core, seg(t, 2.8, 3.6));
      setOpacity(tet, seg(t, 4.6, 5.4));
      setOpacity(note, seg(t, 7.0, 7.8));
      setOpacity(foot, seg(t, 10.2, 11.0));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 3 幕：Laplacian 形变能 ───────────────────────────────────────
  function buildSceneLaplacian() {
    var s = sceneSvg(
      'Laplacian 坐标量的是一个顶点相对邻域的局部几何；最小化源网格与目标网格的 Laplacian 差，' +
        '手-物体-骨盆的相对关系就被保住，而不是去对齐绝对坐标'
    );
    s.appendChild(svgText(56, 26, '目标函数保的是相对几何，不是绝对位置', 'demo-x-ink2', 13.5));

    var eMath = svgMath(400, 58, 'E_L = \\sum_i \\lVert L(p_{t,i}^{\\mathrm{source}}) - L(p_{t,i}^{\\mathrm{target}}(q_t)) \\rVert^2', {
      size: 13,
      w: 620,
      anchor: 'middle'
    });
    eMath.setTone('var(--demo-accent)');
    s.appendChild(eMath);

    var lMath = svgMath(400, 88, 'L(p_{t,i}) = p_{t,i} - \\sum_{j \\in \\mathcal{N}(i)} w_{ij}\\, p_{t,j}', {
      size: 12,
      w: 520,
      anchor: 'middle'
    });
    lMath.setTone('var(--demo-muted)');
    s.appendChild(lMath);

    var left = svgEl('g', {});
    left.appendChild(paint(svgEl('rect', { x: 40, y: 110, width: 350, height: 196, rx: 8, 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }), C_SURFACE, C_BAD));
    left.appendChild(paint(svgText(58, 134, '只匹配关键点（示意）', null, 12), C_BAD));
    left.appendChild(svgText(58, 156, '身体按 s = ' + fmt(LAP_SCALE, 2) + ' 缩放，物体留在原处', 'demo-x-mut', 9.5));
    left.appendChild(svgText(58, 176, '手-物距离 ' + fmt(DIST_SRC, 1) + ' → ' + fmt(DIST_KP, 1) + '，撑开 ' + fmt(DIST_GROW, 1), 'demo-x-mono', 10));
    var kpMath = svgMath(58, 206, '\\lVert L_{\\mathrm{kp}} - L_{\\mathrm{src}} \\rVert = ' + fmt(LAP_ERR, 2), { size: 12, w: 300 });
    kpMath.setTone('var(--demo-bad)');
    left.appendChild(kpMath);
    left.appendChild(svgText(58, 236, 'L_src = (' + fmt(LAP_SRC[0], 2) + ', ' + fmt(LAP_SRC[1], 2) + ')', 'demo-x-mono', 9.5));
    left.appendChild(svgText(58, 254, 'L_kp  = (' + fmt(LAP_KP[0], 2) + ', ' + fmt(LAP_KP[1], 2) + ')', 'demo-x-mono', 9.5));
    left.appendChild(paint(svgText(58, 284, '手漂离箱子，grasp 在几何上就断了', null, 10.5), C_BAD));
    s.appendChild(left);

    var right = svgEl('g', {});
    right.appendChild(paint(svgEl('rect', { x: 410, y: 110, width: 350, height: 196, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_GOOD));
    right.appendChild(paint(svgText(428, 134, '对齐 Laplacian（OmniRetarget）', null, 12), C_GOOD));
    right.appendChild(svgText(428, 156, '最小化 E_L，邻域相对关系被钉住', 'demo-x-mut', 9.5));
    var okMath = svgMath(428, 186, '\\min_{q_t}\\ E_L + \\lVert q_t - q_{t-1} \\rVert_Q^2', { size: 12, w: 310 });
    okMath.setTone('var(--demo-good)');
    right.appendChild(okMath);
    right.appendChild(svgText(428, 222, '手跟着物体走，骨盆相对网格也不漂', 'demo-x-mut', 10));
    right.appendChild(svgText(428, 242, '时间项 Q 让相邻帧关节角连续', 'demo-x-mut', 10));
    right.appendChild(paint(svgText(428, 274, '交互关系从人体演示「复印」到机器人', null, 10.5), C_GOOD));
    s.appendChild(right);

    var band = svgEl('g', {});
    band.appendChild(paint(svgEl('rect', { x: 40, y: 320, width: 720, height: 44, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_WARN));
    band.appendChild(
      paint(svgText(400, 348, '四个顶点、等权 ' + fmt(LAP_W, 2) + ' 的示意算例，用来讲「相对几何」；数值不能和论文直接比', null, 11.5, 'middle'), C_WARN)
    );
    s.appendChild(band);

    var foot = paint(svgText(400, 396, 'GMR 会把缩放过的手关键点推进箱子里；保形走的是另一条路', null, 13.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(eMath, seg(t, 0.4, 1.1));
      setOpacity(lMath, seg(t, 1.4, 2.0));
      setOpacity(left, seg(t, 2.6, 3.4));
      setOpacity(right, seg(t, 5.4, 6.2));
      setOpacity(band, seg(t, 8.6, 9.4));
      setOpacity(foot, seg(t, 10.6, 11.4));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 4 幕：序贯 SOCP 硬约束 ───────────────────────────────────────
  var S4_CONS = [
    { t: '非穿透 SDF', d: 'φ_j(q_t) ≥ 0', d2: '碰撞对写成硬约束', c: C_BAD },
    { t: '关节限位', d: 'q_min ≤ q_t ≤ q_max', d2: '解不出超限姿态', c: C_WARN },
    { t: '速度限位', d: 'v_min dt ≤ Δq ≤ v_max dt', d2: '相邻帧不能瞬移', c: C_ACCENT },
    { t: 'stance 脚粘地', d: 'p_t^F = p_{t-1}^F', d2: 'xy 速度 < ' + STANCE_CM_S + ' cm/s', c: C_GOOD }
  ];

  function buildSceneSocp() {
    var s = sceneSvg(
      '每帧把目标二次近似、约束线性化，序贯求解 SOCP：碰撞 SDF、关节与速度限位、stance 脚位置都是硬约束；' +
        'stance 判定是源动作 xy 速度低于 ' +
        STANCE_CM_S +
        ' cm/s，按 ' +
        MOCAP_FPS +
        ' fps 换算单帧最多移 ' +
        fmt(STANCE_MM_FRAME, 2) +
        ' mm'
    );
    s.appendChild(svgText(56, 26, '软惩罚没有保证；这四条写成硬约束，求解器不能违反', 'demo-x-ink2', 13.5));

    var cards = S4_CONS.map(function (c0, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 186;
      g.appendChild(paint(svgEl('rect', { x: x, y: 48, width: 174, height: 118, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, c0.c));
      g.appendChild(paint(svgText(x + 87, 72, c0.t, null, 12, 'middle'), c0.c));
      g.appendChild(svgText(x + 87, 98, c0.d, 'demo-x-mono', 10, 'middle'));
      g.appendChild(svgText(x + 87, 122, c0.d2, 'demo-x-mut', 9, 'middle'));
      g.appendChild(svgText(x + 87, 146, '硬约束，不是 λ 权重', 'demo-x-mut', 8.5, 'middle'));
      s.appendChild(g);
      return { g: g, at: 0.5 + k * 1.0 };
    });

    var loop = svgEl('g', {});
    loop.appendChild(paint(svgEl('rect', { x: 40, y: 182, width: 460, height: 118, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, C_BORDER));
    loop.appendChild(svgText(58, 206, '帧 t 的自定义 SQP（序贯 SOCP）', 'demo-x-ink2', 12));
    loop.appendChild(svgText(58, 228, '1. warm-start 上一帧 q*', 'demo-x-mut', 10));
    loop.appendChild(svgText(58, 248, '2. 目标二次近似 · 约束线性化', 'demo-x-mut', 10));
    loop.appendChild(svgText(58, 268, '3. Drake 自动微分处理四元数浮基 S³', 'demo-x-mut', 10));
    loop.appendChild(svgText(58, 288, '线性化会留下毫米级穿透，下游 RL 补得掉', 'demo-x-mut', 9.5));
    s.appendChild(loop);

    var stance = svgEl('g', {});
    stance.appendChild(paint(svgEl('rect', { x: 516, y: 182, width: 244, height: 118, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, C_GOOD));
    stance.appendChild(paint(svgText(638, 206, 'stance 阈值现算', null, 12, 'middle'), C_GOOD));
    stance.appendChild(svgText(638, 230, STANCE_CM_S + ' cm/s ÷ ' + MOCAP_FPS + ' fps', 'demo-x-mono', 10.5, 'middle'));
    stance.appendChild(paint(svgText(638, 256, '= ' + fmt(STANCE_MM_FRAME, 2) + ' mm / 帧', 'demo-x-mono', 13, 'middle'), C_GOOD));
    stance.appendChild(svgText(638, 282, '水平速度再大，这只脚就不粘', 'demo-x-mut', 8.5, 'middle'));
    s.appendChild(stance);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 344, '网格保形是目标，硬约束是可行域 —— 两件事不能挤进同一帧', null, 14, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 370, 'Table I：只有 OmniRetarget 同时勾了硬运动学约束、物体、地形和数据扩增', 'demo-x-mut', 10.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      cards.forEach(function (c) {
        setOpacity(c.g, seg(t, c.at, c.at + 0.5));
      });
      setOpacity(loop, seg(t, 5.2, 6.0));
      setOpacity(stance, seg(t, 7.2, 8.0));
      setOpacity(foot, seg(t, 10.0, 10.8));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 5 幕：一条演示四路扩增 ───────────────────────────────────────
  var S5_AXES = [
    { t: '物体初始位姿', d: '平移 / 旋转 + 指数插值', c: C_ACCENT },
    { t: '物体形状', d: '三轴缩放几何', c: C_WARN },
    { t: '地形高度', d: '平台高度 / 深度缩放', c: C_GOOD },
    { t: '机器人本体', d: 'G1 / H1 / T1 换碰撞模型', c: C_MUTED }
  ];

  function buildSceneAugment() {
    var s = sceneSvg(
      '固定源演示的 interaction mesh，变换目标侧物体位姿、形状、地形高度或机器人本体后重新求解同一优化；' +
        '全扩增集训练成功率 ' +
        fmt(AUG_FULL, 1) +
        '%，仅名义轨迹 ' +
        fmt(AUG_NOM, 1) +
        '%，只掉 ' +
        fmt(AUG_DROP, 1) +
        ' 个百分点'
    );
    s.appendChild(svgText(56, 26, '源 mesh 钉住，目标侧改配置，每一次扩增都是一道新的约束优化', 'demo-x-ink2', 13));

    var src = svgEl('g', {});
    src.appendChild(paint(svgEl('rect', { x: 40, y: 44, width: 200, height: 64, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_ACCENT));
    src.appendChild(paint(svgText(140, 70, '单条人体演示', null, 13, 'middle'), C_ACCENT));
    src.appendChild(svgText(140, 92, 'P_source 全程固定', 'demo-x-mut', 9.5, 'middle'));
    s.appendChild(src);

    var reopt = svgEl('g', {});
    reopt.appendChild(paint(svgEl('rect', { x: 280, y: 44, width: 240, height: 64, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_GOOD));
    reopt.appendChild(paint(svgText(400, 70, '重求解同一优化', null, 13, 'middle'), C_GOOD));
    reopt.appendChild(svgText(400, 92, '变的是目标侧采样点 / 物体 / 地形', 'demo-x-mut', 9, 'middle'));
    s.appendChild(reopt);

    var out = svgEl('g', {});
    out.appendChild(paint(svgEl('rect', { x: 560, y: 44, width: 200, height: 64, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_MUTED));
    out.appendChild(paint(svgText(660, 70, '多样参考轨迹', null, 13, 'middle'), C_MUTED));
    out.appendChild(svgText(660, 92, N_AUG + ' 轴 × ' + N_ROBOTS + ' 款本体', 'demo-x-mut', 9.5, 'middle'));
    s.appendChild(out);

    var arrow = K.arrowMarker(s, 'omni-x-arrow-aug', C_BORDER);
    s.appendChild(paint(svgEl('path', { d: polyPath([[244, 76], [274, 76]]), fill: 'none', 'stroke-width': 1.5, 'marker-end': arrow }), null, C_BORDER));
    s.appendChild(paint(svgEl('path', { d: polyPath([[524, 76], [554, 76]]), fill: 'none', 'stroke-width': 1.5, 'marker-end': arrow }), null, C_BORDER));

    var axes = S5_AXES.map(function (a, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 186;
      g.appendChild(paint(svgEl('rect', { x: x, y: 126, width: 174, height: 64, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, a.c));
      g.appendChild(paint(svgText(x + 87, 152, a.t, null, 12, 'middle'), a.c));
      g.appendChild(svgText(x + 87, 174, a.d, 'demo-x-mut', 9, 'middle'));
      s.appendChild(g);
      return { g: g, at: 2.4 + k * 0.7 };
    });

    var anchor = svgEl('g', {});
    anchor.appendChild(paint(svgEl('rect', { x: 40, y: 206, width: 720, height: 70, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_WARN));
    anchor.appendChild(paint(svgText(58, 230, '防平凡解锚定：否则整机跟着物体做一次刚体平移，扩增等于没扩', null, 12), C_WARN));
    anchor.appendChild(svgText(58, 254, '物体局部系建 mesh · 下身锚定名义轨迹 q̄* · 初始双脚位置与名义轨迹一致（pick-up 加重下身偏离惩罚）', 'demo-x-mut', 10));
    s.appendChild(anchor);

    var nums = svgEl('g', {});
    nums.appendChild(paint(svgEl('rect', { x: 40, y: 290, width: 350, height: 56, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, C_BORDER));
    nums.appendChild(svgText(58, 312, '全扩增集训练、名义轨迹评测', 'demo-x-ink2', 10.5));
    nums.appendChild(paint(svgText(58, 334, fmt(AUG_FULL, 1) + '%  vs  仅名义 ' + fmt(AUG_NOM, 1) + '%', 'demo-x-mono', 12), C_ACCENT));
    nums.appendChild(paint(svgEl('rect', { x: 410, y: 290, width: 350, height: 56, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_GOOD));
    nums.appendChild(svgText(428, 312, '覆盖显著扩大，成功率只掉', 'demo-x-ink2', 10.5));
    nums.appendChild(paint(svgText(428, 334, fmt(AUG_DROP, 1) + ' 个百分点', 'demo-x-mono', 12), C_GOOD));
    s.appendChild(nums);

    var foot = paint(svgText(400, 380, '遥操作难规模化；离线把一条演示扩成一个分布，才叫数据工厂', null, 13.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(src, seg(t, 0.3, 0.9));
      setOpacity(reopt, seg(t, 1.0, 1.6));
      setOpacity(out, seg(t, 1.8, 2.4));
      axes.forEach(function (a) {
        setOpacity(a.g, seg(t, a.at, a.at + 0.4));
      });
      setOpacity(anchor, seg(t, 5.6, 6.4));
      setOpacity(nums, seg(t, 8.0, 8.8));
      setOpacity(foot, seg(t, 10.6, 11.4));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 6 幕：极简 RL 与 Table II ────────────────────────────────────
  var S6_REW = ['Body Tracking', 'Object Tracking', 'Action Rate', 'Soft Joint Limit', 'Self-Collision > 1 N'];
  var S6_DR = ['躯干质心', '关节默认位', '随机推力', '观测噪声'];

  function buildSceneEvidence() {
    var s = sceneSvg(
      '同一套 BeyondMimic ' +
        N_REWARDS +
        ' 项奖励 + ' +
        N_DR +
        ' 项域随机化，只换 retargeter：OMOMO 上 OmniRetarget 成功率 ' +
        fmt(OBJ.omni.rl, 2) +
        '%，比 GMR 高 ' +
        fmt(VS_GMR, 1) +
        ' 个百分点，比 VideoMimic 高 ' +
        fmt(VS_VM, 1) +
        ' 个百分点'
    );
    s.appendChild(svgText(56, 24, 'RL 配方锁定，只换 retargeter —— 这就是 Table II 的对照', 'demo-x-ink2', 13));

    var recipe = svgEl('g', {});
    recipe.appendChild(paint(svgEl('rect', { x: 40, y: 40, width: 720, height: 70, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_ACCENT));
    recipe.appendChild(paint(svgText(58, 64, '极简配方 = ' + N_REWARDS + ' 项奖励 + ' + N_DR + ' 项域随机化 = ' + N_TERMS + ' 项，权重直接抄 BeyondMimic，零调参', null, 12), C_ACCENT));
    recipe.appendChild(svgText(58, 86, '观测纯本体感受（参考关节 / 骨盆误差 / 本体速度 / 上一步动作），没有显式场景感知', 'demo-x-mut', 10));
    s.appendChild(recipe);

    var rew = S6_REW.map(function (name, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 146;
      g.appendChild(paint(svgEl('rect', { x: x, y: 124, width: 138, height: 36, rx: 7, 'stroke-width': 1.2 }), C_SURFACE, C_WARN));
      g.appendChild(paint(svgText(x + 69, 147, name, null, 9.5, 'middle'), C_WARN));
      s.appendChild(g);
      return { g: g, at: 1.6 + k * 0.25 };
    });

    var methods = [
      { k: 'vm', t: 'VideoMimic', c: C_BAD },
      { k: 'gmr', t: 'GMR', c: C_WARN },
      { k: 'phc', t: 'PHC', c: C_ACCENT },
      { k: 'omni', t: 'OmniRetarget', c: C_GOOD }
    ];
    var MAX_RL = 100;
    var bars = svgEl('g', {});
    bars.appendChild(svgText(40, 184, 'OMOMO 下游 RL 成功率（Table II，越高越好）', 'demo-x-ink2', 10.5));
    methods.forEach(function (m, k) {
      var y = 196 + k * 28;
      var w = (OBJ[m.k].rl / MAX_RL) * 420;
      bars.appendChild(svgText(40, y + 14, m.t, 'demo-x-ink2', 10));
      bars.appendChild(paint(svgEl('rect', { x: 150, y: y, width: w, height: 18, rx: 3 }), C_SURFACE2, m.c));
      bars.appendChild(paint(svgText(156 + w, y + 14, fmt(OBJ[m.k].rl, 2) + '%', 'demo-x-mono', 10), m.c));
    });
    s.appendChild(bars);

    var side = svgEl('g', {});
    side.appendChild(paint(svgEl('rect', { x: 600, y: 184, width: 160, height: 132, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, C_BORDER));
    side.appendChild(svgText(680, 206, '穿透深度 cm', 'demo-x-ink2', 10, 'middle'));
    [
      { t: 'GMR', v: OBJ.gmr.depth, c: C_BAD },
      { t: 'PHC', v: OBJ.phc.depth, c: C_WARN },
      { t: 'Omni', v: OBJ.omni.depth, c: C_GOOD }
    ].forEach(function (r, k) {
      side.appendChild(svgText(616, 230 + k * 26, r.t, 'demo-x-mut', 10));
      side.appendChild(paint(svgText(744, 230 + k * 26, fmt(r.v, 2), 'demo-x-mono', 10, 'end'), r.c));
    });
    side.appendChild(paint(svgText(680, 306, '浅 ' + fmt(DEPTH_VS_GMR, 2) + ' cm', null, 10, 'middle'), C_GOOD));
    s.appendChild(side);

    var foot = svgEl('g', {});
    foot.appendChild(
      paint(
        svgText(
          400,
          356,
          '比 PHC +' + fmt(VS_PHC, 1) + ' pp、比 GMR +' + fmt(VS_GMR, 1) + ' pp、比 VideoMimic +' + fmt(VS_VM, 1) + ' pp',
          null,
          13.5,
          'middle'
        ),
        C_ACCENT
      )
    );
    foot.appendChild(
      svgText(
        400,
        380,
        '地形任务 ' + fmt(TERR_RL.omni, 2) + '%（GMR ' + fmt(TERR_RL.gmr, 2) + '%，再高 ' + fmt(TERR_VS_GMR, 1) + ' pp）；脚滑时长 / 速度都是 0',
        'demo-x-mut',
        10,
        'middle'
      )
    );
    s.appendChild(foot);

    function draw(t) {
      setOpacity(recipe, seg(t, 0.3, 1.0));
      rew.forEach(function (r) {
        setOpacity(r.g, seg(t, r.at, r.at + 0.3));
      });
      setOpacity(bars, seg(t, 3.6, 4.4));
      setOpacity(side, seg(t, 6.4, 7.2));
      setOpacity(foot, seg(t, 9.6, 10.4));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 7 幕：数据工厂到 G1 真机的闭环 ───────────────────────────────
  var S7_PARK = [
    { t: '搬 ' + CHAIR_KG + ' kg 椅', d: '当重物' },
    { t: '踩椅作踏台', d: '人-物-地形' },
    { t: '爬上平台', d: fmt(PLATFORM_M, 1) + ' m' },
    { t: '跳下', d: '腾空' },
    { t: '翻滚缓冲', d: '落地' }
  ];

  var S7_FILES = [
    { f: 'amazon-far/holosoma', d: '重定向 + RL 训练入口' },
    { f: 'OmniRetarget_Dataset', d: 'Hugging Face 已 retarget 轨迹' },
    { f: 'omniretarget.github.io', d: '物体 / 地形 / 本体 3D 对照' }
  ];

  function buildSceneLoop() {
    var s = sceneSvg(
      '开源数据集 ' +
        fmt(H_OMOMO, 2) +
        ' + ' +
        fmt(H_MOCAP, 1) +
        ' + ' +
        fmt(H_LAFAN, 1) +
        ' = ' +
        fmt(H_SUM, 2) +
        ' 小时参考轨迹；G1 零样本完成 ' +
        PARKOUR_S +
        ' 秒跑酷串联，以及 ' +
        WALL_S +
        ' s / ' +
        WALL_RAD_S +
        ' rad/s 的 wall-flip（真机 ' +
        WALL_OK +
        '/' +
        WALL_OK +
        '）'
    );
    s.appendChild(svgText(56, 24, '闭环：一条演示进工厂，G1 真机零样本跑出来', 'demo-x-ink2', 13));

    var hours = svgEl('g', {});
    hours.appendChild(paint(svgEl('rect', { x: 40, y: 40, width: 720, height: 50, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_GOOD));
    hours.appendChild(
      paint(
        svgText(
          400,
          62,
          'OMOMO ' + fmt(H_OMOMO, 2) + ' h  +  自采 MoCap ' + fmt(H_MOCAP, 1) + ' h  +  LAFAN1 ' + fmt(H_LAFAN, 1) + ' h  =  ' + fmt(H_SUM, 2) + ' h',
          null,
          13,
          'middle'
        ),
        C_GOOD
      )
    );
    hours.appendChild(svgText(400, 80, '论文 §V-B 三段相加；摘要写 8+ 小时，项目页写 9+', 'demo-x-mut', 9, 'middle'));
    s.appendChild(hours);

    var arrow = K.arrowMarker(s, 'omni-x-arrow-loop', C_BORDER);
    var x = 40;
    var park = S7_PARK.map(function (p, k) {
      var g = svgEl('g', {});
      var w = 136;
      g.appendChild(paint(svgEl('rect', { x: x, y: 106, width: w, height: 50, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_ACCENT));
      g.appendChild(paint(svgText(x + w / 2, 126, p.t, null, 11, 'middle'), C_ACCENT));
      g.appendChild(svgText(x + w / 2, 144, p.d, 'demo-x-mut', 8.5, 'middle'));
      s.appendChild(g);
      if (k < S7_PARK.length - 1) {
        s.appendChild(
          paint(svgEl('path', { d: polyPath([[x + w + 3, 131], [x + w + 16, 131]]), fill: 'none', 'stroke-width': 1.5, 'marker-end': arrow }), null, C_BORDER)
        );
      }
      x += w + 19;
      return { g: g, at: 2.0 + k * 0.45 };
    });

    var parkLbl = svgText(400, 174, PARKOUR_S + ' 秒跑酷串联（旗舰 demo，灵感来自 Atlas）', 'demo-x-mut', 10, 'middle');
    s.appendChild(parkLbl);

    var hw = svgEl('g', {});
    hw.appendChild(paint(svgEl('rect', { x: 40, y: 190, width: 360, height: 96, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, C_BORDER));
    hw.appendChild(svgText(58, 212, '其他真机技能', 'demo-x-ink2', 11));
    hw.appendChild(svgText(58, 234, '爬 ' + fmt(PLATFORM_M, 1) + ' m 平台 ≈ 身高 ' + PLATFORM_PCT + '%（反推 ' + fmt(ROBOT_H_M, 2) + ' m）', 'demo-x-mut', 10));
    hw.appendChild(svgText(58, 254, 'Wall-flip ≈ ' + fmt(WALL_S, 1) + ' s，峰值 ' + WALL_RAD_S + ' rad/s · ' + fmt(WALL_LIN, 1) + ' m/s', 'demo-x-mut', 10));
    hw.appendChild(paint(svgText(58, 274, '真机 ' + WALL_OK + '/' + WALL_OK + '；峰值×时长 = ' + fmt(WALL_RAD_IF_PEAK, 1) + ' rad（匀速示意）', null, 10), C_GOOD));
    s.appendChild(hw);

    var files = svgEl('g', {});
    S7_FILES.forEach(function (f, k) {
      var fy = 190 + k * 32;
      files.appendChild(paint(svgEl('rect', { x: 416, y: fy, width: 344, height: 28, rx: 6, 'stroke-width': 1.2 }), C_SURFACE2, C_BORDER));
      files.appendChild(paint(svgText(428, fy + 18, f.f, 'demo-x-mono', 10), C_ACCENT));
      files.appendChild(svgText(744, fy + 18, f.d, 'demo-x-mut', 8.5, 'end'));
    });
    s.appendChild(files);

    var rail = [
      [80, 312],
      [400, 312],
      [720, 312]
    ];
    var railPath = paint(svgEl('path', { d: polyPath(rail), fill: 'none', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }), null, C_BORDER);
    s.appendChild(railPath);
    var tok = paint(svgEl('circle', { r: 6, 'stroke-width': 1.6 }), C_ACCENT, C_SURFACE2);
    s.appendChild(tok);
    var railLbl = svgText(400, 332, '人体演示 → interaction mesh + 硬约束 → 扩增集 → 5+4 RL → G1 零样本', 'demo-x-mut', 10, 'middle');
    s.appendChild(railLbl);

    var foot = paint(svgText(400, 372, 'OmniRetarget = 人-物-地形交互的 loco-manipulation 数据工厂', null, 15, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(hours, seg(t, 0.3, 1.0));
      park.forEach(function (p) {
        setOpacity(p.g, seg(t, p.at, p.at + 0.35));
      });
      setOpacity(parkLbl, seg(t, 4.2, 4.8));
      setOpacity(hw, seg(t, 5.4, 6.2));
      setOpacity(files, seg(t, 7.4, 8.2));
      var on = seg(t, 9.2, 9.8);
      setOpacity(railPath, on);
      setOpacity(tok, on);
      setOpacity(railLbl, on);
      var pt = pointOn(rail, ease(seg(t, 9.4, 12.0)));
      tok.setAttribute('cx', pt[0].toFixed(1));
      tok.setAttribute('cy', pt[1].toFixed(1));
      setOpacity(foot, seg(t, 11.2, 12.0));
    }

    return { el: s, draw: draw };
  }

  var OMNI_SCENES = [
    {
      title: '现有 retargeting 只盯人体关键点',
      dur: 12,
      build: buildSceneProblem,
      cues: [
        { at: 0.4, s: 'loco-manipulation 要保住的是手↔物体、脚↔台阶、身体↔墙壁，不只是关节角像人。' },
        { at: 2.2, s: 'PHC / GMR / VideoMimic 走的是**关键点匹配 + 软惩罚**，物体和地形根本不进优化。' },
        { at: 3.6, s: '麻烦一：交互 contact 失真，下游只能靠脚滞空、接触时长这类 ad-hoc 正则补。' },
        { at: 5.0, s: '麻烦二：软约束**没有保证**。脚滑、自穿、地穿、关节突变照样出现。' },
        { at: 6.4, s: '麻烦三：一条演示扩不到新的物体位姿、尺寸、地形高度和机器人本体。' },
        { at: 8.0, s: '脏参考逼出十几项 reward；干净参考只要 DeepMimic 式 **' + N_REWARDS + ' 项奖励**。' },
        { at: 10.0, s: 'OmniRetarget 的回答：interaction mesh 保形 + 硬约束 + 系统性扩增。' }
      ]
    },
    {
      title: 'Interaction mesh：Delaunay 四面体',
      dur: 13,
      build: buildSceneMesh,
      cues: [
        { at: 0.4, s: '网格顶点有四类：人体语义关键点、机器人语义关键点、物体表面采样、地形采样。' },
        { at: 2.0, s: '接触区域采样更密 —— 手要抓的那一面、脚要踩的那一格，分辨率更高。' },
        { at: 3.4, s: '对顶点集做 **Delaunay 四面体剖分**，得到体积 interaction mesh。' },
        { at: 5.0, s: '人体与机器人只需语义一致的对应，比如 `hand ↔ hand`，精确解剖位置相对鲁棒。' },
        { at: 7.0, s: '体积网格才能编码「手在箱子哪一侧、脚离台阶多远」，骨架边做不到。' },
        { at: 8.8, s: '源侧 $\\mathcal{P}^{\\mathrm{source}}$ 固定，目标侧 $\\mathcal{P}^{\\mathrm{target}}(q_t)$ 随机器人构型变。' },
        { at: 10.6, s: '下一步要保的，就是这张网格的局部形状，而不是人手的绝对坐标。' }
      ]
    },
    {
      title: 'Laplacian 形变能：保相对几何',
      dur: 13,
      build: buildSceneLaplacian,
      cues: [
        { at: 0.4, s: 'Laplacian 坐标 $L(p_i) = p_i - \\sum_j w_{ij} p_j$，量的是顶点相对邻域的局部几何。' },
        { at: 2.0, s: '形变能 $E_L$ 是源网格与目标网格逐点 Laplacian 差的平方和。' },
        { at: 3.4, s: '示意：手、物体、骨盆、另一只手四个点，等权 $w = ' + fmt(LAP_W, 2) + '$。' },
        { at: 5.0, s: '只把身体按 $s = ' + fmt(LAP_SCALE, 2) + '$ 缩放、物体不动，手-物距离从 ' + fmt(DIST_SRC, 1) + ' 撑到 ' + fmt(DIST_KP, 1) + '。' },
        { at: 6.6, s: 'Laplacian 残差 $\\lVert L_{\\mathrm{kp}} - L_{\\mathrm{src}} \\rVert = ' + fmt(LAP_ERR, 2) + '$ —— grasp 在几何上断了。' },
        { at: 8.4, s: 'OmniRetarget 最小化 $E_L + \\lVert q_t - q_{t-1} \\rVert_Q^2$，相对关系被钉住。' },
        { at: 10.2, s: '这是示意算例，不是论文数据；论文里 GMR 的手关键点确实会被推进箱子。' },
        { at: 11.6, s: '保形是目标。下一幕的硬约束，才是可行域。' }
      ]
    },
    {
      title: '序贯 SOCP：四条硬约束',
      dur: 13,
      build: buildSceneSocp,
      cues: [
        { at: 0.4, s: '每帧解一道约束优化：目标二次近似，约束线性化，Drake 处理四元数浮基。' },
        { at: 1.6, s: '① 非穿透：碰撞对 SDF $\\phi_j(q_t) \\ge 0$，不是软惩罚 $\\lambda$。' },
        { at: 2.8, s: '② 关节限位 $q_{\\min} \\le q_t \\le q_{\\max}$，③ 速度限位挡住相邻帧瞬移。' },
        { at: 4.4, s: '④ stance 脚 $p_t^F = p_{t-1}^F$。判定阈值是源动作 xy 速度 $< ' + STANCE_CM_S + '\\ \\mathrm{cm/s}$。' },
        { at: 6.0, s: '按 ' + MOCAP_FPS + ' fps 换算，单帧水平位移上限 **' + fmt(STANCE_MM_FRAME, 2) + ' mm** —— 再大就不粘。' },
        { at: 8.0, s: '上一帧 $q^\\star$ warm-start 下一帧；线性化会留毫米级穿透，RL 补得掉。' },
        { at: 10.2, s: 'Table I：只有 OmniRetarget 同时勾了硬约束、物体交互、地形交互和数据扩增。' }
      ]
    },
    {
      title: '一条演示，四路扩增',
      dur: 13,
      build: buildSceneAugment,
      cues: [
        { at: 0.4, s: '源演示的 $\\mathcal{P}^{\\mathrm{source}}$ 钉住，目标侧改配置，重新求解**同一道**优化。' },
        { at: 2.0, s: '四条轴：物体初始位姿、物体形状、地形高度、机器人本体（G1 / H1 / T1）。' },
        { at: 3.8, s: '位姿用平移 / 旋转再和原始物体轨迹做指数插值；形状是三轴缩放。' },
        { at: 5.4, s: '不锚定就会得到平凡解：整机跟着物体做一次刚体平移，扩增等于没扩。' },
        { at: 7.0, s: '所以物体局部系建 mesh，下身锚定名义轨迹 $\\bar{q}_t^\\star$，初始双脚位置锁死。' },
        { at: 8.6, s: '全扩增集训练、名义轨迹评测 **' + fmt(AUG_FULL, 1) + '%**，仅名义 **' + fmt(AUG_NOM, 1) + '%**。' },
        { at: 10.4, s: '只掉 ' + fmt(AUG_DROP, 1) + ' 个百分点 —— 覆盖扩大，性能几乎不降级。' }
      ]
    },
    {
      title: '极简 RL 与 Table II',
      dur: 13,
      build: buildSceneEvidence,
      cues: [
        { at: 0.4, s: '参考干净之后，RL 配方就可以锁死：' + N_REWARDS + ' 项奖励 + ' + N_DR + ' 项域随机化，共 ' + N_TERMS + ' 项。' },
        { at: 2.0, s: '权重直接抄 BeyondMimic，零调参；观测纯本体感受，没有显式场景感知。' },
        { at: 3.4, s: 'OMOMO 上只换 retargeter：VideoMimic ' + fmt(OBJ.vm.rl, 2) + '%，GMR ' + fmt(OBJ.gmr.rl, 2) + '%，PHC ' + fmt(OBJ.phc.rl, 2) + '%。' },
        { at: 5.6, s: 'OmniRetarget **' + fmt(OBJ.omni.rl, 2) + '%**，比 GMR 高 ' + fmt(VS_GMR, 1) + ' 个百分点，比 VideoMimic 高 ' + fmt(VS_VM, 1) + '。' },
        { at: 7.4, s: '最大穿透深度从 GMR 的 ' + fmt(OBJ.gmr.depth, 2) + ' cm 降到 ' + fmt(OBJ.omni.depth, 2) + ' cm，浅了 ' + fmt(DEPTH_VS_GMR, 2) + ' cm。' },
        { at: 9.2, s: '脚滑时长和最大滑速都是 **0**。地形任务再拿到 ' + fmt(TERR_RL.omni, 2) + '%，比 GMR 高 ' + fmt(TERR_VS_GMR, 1) + ' pp。' },
        { at: 11.0, s: '论文原话：超过基线 10% 以上、方差更低。数字对得上 $' + fmt(VS_PHC, 1) + '$ 个百分点这条。' }
      ]
    },
    {
      title: '数据工厂到 G1 真机的闭环',
      dur: 13,
      build: buildSceneLoop,
      cues: [
        { at: 0.4, s: '开源数据三段相加：' + fmt(H_OMOMO, 2) + ' + ' + fmt(H_MOCAP, 1) + ' + ' + fmt(H_LAFAN, 1) + ' = **' + fmt(H_SUM, 2) + ' 小时**。' },
        { at: 2.0, s: '旗舰 demo 是 ' + PARKOUR_S + ' 秒跑酷：搬 ' + CHAIR_KG + ' kg 椅子 → 踩椅上台 → 跳下翻滚。' },
        { at: 4.0, s: '还能爬 ' + fmt(PLATFORM_M, 1) + ' m 平台，约为身高的 ' + PLATFORM_PCT + '%（反推名义身高 ' + fmt(ROBOT_H_M, 2) + ' m）。' },
        { at: 5.8, s: 'Wall-flip 约 ' + fmt(WALL_S, 1) + ' s，峰值角速度 $' + WALL_RAD_S + '\\ \\mathrm{rad/s}$、线速度 ' + fmt(WALL_LIN, 1) + ' m/s。' },
        { at: 7.6, s: '真机 **' + WALL_OK + '/' + WALL_OK + '**。峰值 × 时长 = ' + fmt(WALL_RAD_IF_PEAK, 1) + ' rad，只说明量级，翻转不是匀速。' },
        { at: 9.2, s: '代码入口 `amazon-far/holosoma`，数据在 Hugging Face `OmniRetarget_Dataset`。' },
        { at: 11.2, s: '**OmniRetarget = 人-物-地形交互的 loco-manipulation 数据工厂。**' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '七幕动画：OmniRetarget 全流程速览',
      sub: '约 90 秒自动播放。空格播放/暂停，← → 换幕；画面里的换算数字都是现算的，不是手写。',
      ariaLabel: 'OmniRetarget 七幕讲解动画',
      notes: [
        '取数依据：第四幕的「' +
          fmt(STANCE_MM_FRAME, 2) +
          ' mm/帧」由论文 stance 阈值 ' +
          STANCE_CM_S +
          ' cm/s 除以 ' +
          MOCAP_FPS +
          ' fps 再换成毫米；第六幕的成功率、穿透深度直接取 Table II 的 OMOMO 栏（PHC ' +
          fmt(OBJ.phc.rl, 2) +
          ' / GMR ' +
          fmt(OBJ.gmr.rl, 2) +
          ' / VideoMimic ' +
          fmt(OBJ.vm.rl, 2) +
          ' / OmniRetarget ' +
          fmt(OBJ.omni.rl, 2) +
          '），差值 ' +
          fmt(VS_PHC, 1) +
          ' / ' +
          fmt(VS_GMR, 1) +
          ' / ' +
          fmt(VS_VM, 1) +
          ' pp 与深度差 ' +
          fmt(DEPTH_VS_GMR, 2) +
          ' cm 都是现减。地形 ' +
          fmt(TERR_RL.omni, 2) +
          '% 与相对 GMR 的 ' +
          fmt(TERR_VS_GMR, 1) +
          ' pp 同理。',
        '第五幕的 ' +
          fmt(AUG_FULL, 1) +
          '% / ' +
          fmt(AUG_NOM, 1) +
          '% 是论文报告的原值，差值 ' +
          fmt(AUG_DROP, 1) +
          ' pp 现减。第七幕 ' +
          fmt(H_SUM, 2) +
          ' h = ' +
          fmt(H_OMOMO, 2) +
          ' + ' +
          fmt(H_MOCAP, 1) +
          ' + ' +
          fmt(H_LAFAN, 1) +
          '（§V-B 三段）；' +
          fmt(PLATFORM_M, 1) +
          ' m ÷ ' +
          PLATFORM_PCT +
          '% 反推名义身高 ' +
          fmt(ROBOT_H_M, 2) +
          ' m；峰值角速度 × 时长 = ' +
          fmt(WALL_RAD_IF_PEAK, 1) +
          ' rad 只说明量级，翻转不是匀速。',
        '第三幕是**示意算例，不是论文数据**：四个顶点（手 / 物体 / 骨盆 / 另一只手）等权 $w = ' +
          fmt(LAP_W, 2) +
          '$，身体缩放 $s = ' +
          fmt(LAP_SCALE, 2) +
          '$、物体不动，用来说明「只对齐关键点会撑开手-物距离」。$E_L$ 与 $L(p_i)$ 的公式是论文原式。'
      ],
      scenes: OMNI_SCENES
    });
  }

  K.mount({
    'omniretarget-explainer': buildExplainerDemo
  });
})();
