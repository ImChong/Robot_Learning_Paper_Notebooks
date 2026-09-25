/* Interactive PHP explainer for
 * papers/04_Loco-Manipulation_and_WBC/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["php"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   php-explainer — 八幕讲解动画：跑酷要同时过四关 → 动作匹配是特征空间里的最近邻 →
 *     临界阻尼弹簧把速度命令变成查询 → Loco → Skill → Loco 的长程拼接 →
 *     专家：跟踪 + 特权 + 自适应采样 → DAgger 看不见的对称误差与 PPO 课程 →
 *     深度学生只拿速度命令自己挑技能 → 定量证据与真机
 *
 * 画面里的算例（弹簧、最近邻、课程权重、奖励核、延迟换算、表格均值）都在这里现算，
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
    polyPath = K.polyPath,
    stickFigure = K.stickFigure,
    poseWalk = K.poseWalk;

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_MUTED = X.muted,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2;

  // ─── 论文给的量（正文 + 附录 A / B，Table III / IV / VI）───────────────
  var FEAT_TRAJ = 12; // 3 个未来时刻 ×（平面位置 2 + 朝向 2）
  var FEAT_FOOT = 12; // 双脚 ×（位置 3 + 线速度 3）
  var FEAT_ROOT = 3; // 根线速度
  var FEAT_DIM = FEAT_TRAJ + FEAT_FOOT + FEAT_ROOT; // 27
  var HORIZONS = [0.33, 0.67, 1.0]; // s
  var SPEEDS = [1, 2]; // m/s，合成数据的两档速度
  var DIRS = [-90, -45, 0, 45, 90]; // 度，五个转向
  var PRE_SKILL = [0.1, 3]; // s，技能前的步行时长均匀采样区间
  var SCAN_M = 0.7; // 专家的高度扫描边长（m）
  var TOTAL_ITERS = 20000; // 专家与学生都训 20K 迭代
  var LAMBDA_FLOOR = 0.1; // λ_D 的下限
  var TERM_EXPERT = 0.5; // m，专家的跟踪终止阈值
  var TERM_STUDENT = 1.0; // m，学生放宽后的阈值
  var DEPTH_H = 58,
    DEPTH_W = 87;
  var DEPTH_OUT = 32;
  var DELAY_MS = [60, 80];
  var CAM_HZ = 30;
  var N_ENVS = 16384;
  var ROBOT_H = 1.3; // G1 身高（m）
  var WALL_H = 1.25;
  var WALL_S = 3.63;
  var VAULT = { h: 0.4, len: 0.5, dur: 0.8, peak: 3.41, avg: 2.53 };

  /* Table III：技能库时长（s） */
  var LOCO_S = 495.5;
  var SKILLS = [
    { v: 1, t: 'Step 36', d: 2.2 },
    { v: 1, t: 'Climb 58', d: 12.1 },
    { v: 1, t: 'Climb 76', d: 8.8 },
    { v: 1, t: 'Climb 94', d: 10.3 },
    { v: 2, t: 'Step 36', d: 1.6 },
    { v: 2, t: 'Climb 58', d: 6.1 },
    { v: 2, t: 'Climb 76', d: 4.4 },
    { v: 2, t: 'Climb 94', d: 5.2 },
    { v: 2, t: 'Climb 125', d: 5.9 },
    { v: 2, t: 'Dash Vault', d: 5.0 },
    { v: 2, t: 'Speed Vault', d: 3.1 },
    { v: 3, t: 'Cat Vault', d: 1.5 }
  ];
  var SKILL_S = SKILLS.reduce(function (a, s) {
    return a + s.d;
  }, 0); // 66.2 s
  var SKILL_FRAC = (SKILL_S / (SKILL_S + LOCO_S)) * 100; // 11.8 %
  var N_COMMANDS = SPEEDS.length * DIRS.length; // 10 种命令组合

  // ─── 例 1：临界阻尼弹簧（附录 A 式 4 / 5）──────────────────────────────
  /* 速度从 1 m/s 追到命令 2 m/s，初始加速度为 0；y 是示意值，论文没给。 */
  var SPRING_Y = 4;
  var V0 = 1,
    V_CMD = 2;
  function springVal(s0, sd0, goal, tau) {
    var j0 = s0 - goal,
      j1 = sd0 + SPRING_Y * j0;
    return Math.exp(-SPRING_Y * tau) * (j0 + tau * j1) + goal;
  }
  function springPos(p0, s0, sd0, goal, tau) {
    var y = SPRING_Y,
      j0 = s0 - goal,
      j1 = sd0 + y * j0,
      e = Math.exp(-y * tau);
    return p0 - (j1 / (y * y)) * e + ((-j0 - tau * j1) / y) * e + j1 / (y * y) + j0 / y + goal * tau;
  }
  var FUT_V = HORIZONS.map(function (t) {
    return springVal(V0, 0, V_CMD, t);
  }); // 1.38 / 1.75 / 1.91
  var FUT_P = HORIZONS.map(function (t) {
    return springPos(0, V0, 0, V_CMD, t);
  }); // 0.38 / 0.92 / 1.53
  var HEAD_CMD = 45; // 度
  var FUT_PSI = HORIZONS.map(function (t) {
    return springVal(0, 0, HEAD_CMD, t);
  }); // 17.1° / 33.7° / 40.9°

  // ─── 例 2：三维玩具特征上的最近邻（式 1）─────────────────────────────
  /* 真实特征是 27 维；这里只留三维：未来 1 s 位移、左脚前向速度、根速度。
     不做标准化，只为看清「在哪个窗口里找」决定了找到谁。 */
  var QUERY = [FUT_P[2], 3.0, V0];
  var LOCO_DB = [
    { id: 'L1', t: '慢走 1 m/s', x: [1.0, 2.6, 1.0] },
    { id: 'L2', t: '跑 2 m/s', x: [2.0, 4.5, 2.0] },
    { id: 'L3', t: '加速中的小跑', x: [1.55, 3.1, 1.2] }
  ];
  var ENTRY_DB = [
    { id: 'S1', t: '左脚领跳入口', x: [2.0, 4.8, 2.0] },
    { id: 'S2', t: '右脚领跳入口', x: [2.0, 0.4, 2.0] }
  ];
  /* 2 m/s 跑到障碍前、要切进技能时的两个查询：左脚正在摆动 / 左脚正在支撑 */
  var Q_SWING = [2.0, 4.3, 2.0];
  var Q_STANCE = [2.0, 0.3, 2.0];
  function d2(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]);
    return s;
  }
  function nearest(q, db) {
    var best = null;
    db.forEach(function (f) {
      var d = d2(q, f.x);
      if (!best || d < best.d) best = { id: f.id, d: d };
    });
    return best;
  }
  var NN_LOCO = nearest(QUERY, LOCO_DB); // L3, 0.0505
  var D_L1 = d2(QUERY, LOCO_DB[0].x); // 0.4382
  var NN_SWING = nearest(Q_SWING, ENTRY_DB); // S1, 0.25
  var NN_STANCE = nearest(Q_STANCE, ENTRY_DB); // S2, 0.01

  // ─── 例 3：专家的高斯跟踪奖励（Table IV）───────────────────────────────
  var SIG_ANCHOR = 0.3; // m
  function trackRew(e, sig) {
    return Math.exp(-(e * e) / (sig * sig));
  }
  var R_015 = trackRew(0.15, SIG_ANCHOR); // 0.779
  var R_030 = trackRew(0.3, SIG_ANCHOR); // 0.368

  // ─── 例 4：DAgger 的对称盲区与课程（式 3）───────────────────────────────
  var A_EXPERT = 1.0,
    A_HIGH = 1.2,
    A_LOW = 0.8;
  var DAGGER_HIGH = (A_HIGH - A_EXPERT) * (A_HIGH - A_EXPERT); // 0.04
  var DAGGER_LOW = (A_LOW - A_EXPERT) * (A_LOW - A_EXPERT); // 0.04
  function lambdaD(k) {
    return Math.max(LAMBDA_FLOOR, 1 - k / (TOTAL_ITERS / 2));
  }
  /* 「用同一条线性课程把 0.5 m 放宽到 1 m」：这里按前半程线性增长来画（我的理解） */
  function termThr(k) {
    return TERM_EXPERT + (TERM_STUDENT - TERM_EXPERT) * Math.min(1, k / (TOTAL_ITERS / 2));
  }
  /* λ_PPO > 0.1 ⇔ λ_D < 0.9 ⇔ k > K/2 × 0.1 */
  var ADAPT_ITER = Math.round((TOTAL_ITERS / 2) * LAMBDA_FLOOR); // 1000
  var FLOOR_ITER = Math.round((TOTAL_ITERS / 2) * (1 - LAMBDA_FLOOR)); // 9000

  // ─── 例 5：深度学生的延迟换算 ─────────────────────────────────────────
  var DEPTH_PX = DEPTH_H * DEPTH_W; // 5046
  function delayDist(v, ms) {
    return (v * ms) / 1000;
  }
  var LAG_3 = [delayDist(3, DELAY_MS[0]), delayDist(3, DELAY_MS[1])]; // 0.18 / 0.24 m
  var FRAME_3 = 3 / CAM_HZ; // 0.10 m

  // ─── 论文表格 ───────────────────────────────────────────────────────
  /* Table I：六个任务 = {1, 2} m/s × {36, 58, 76} cm */
  var T1 = [
    { t: '速度跟踪（纯奖励塑形）', v: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0] },
    { t: '不做拼接（原子片段）', v: [0.06, 0.02, 0.0, 0.37, 0.27, 0.07] },
    { t: '端到端深度 RL', v: [0.95, 0.07, 0.08, 0.78, 0.19, 0.14] },
    { t: 'PHP', v: [1.0, 0.99, 0.95, 1.0, 0.99, 0.95] }
  ];
  /* Table II：{1.0 m/s: 58 / 76 / 94 cm, 2.0 m/s: 36 / 58 / 76 cm} */
  var T2 = [
    { t: '只保留两端距离', v: [0.99, 0.62, 0.64, 0.98, 0.6, 0.58] },
    { t: '一半密度', v: [0.95, 0.32, 0.57, 0.99, 0.85, 0.81] },
    { t: '只用 DAgger', v: [0.16, 0.03, 0.12, 0.63, 0.09, 0.1] },
    { t: 'DAgger + 存活奖励', v: [1.0, 0.9, 0.96, 0.94, 0.91, 0.84] },
    { t: 'DAgger + 根跟踪', v: [1.0, 0.79, 0.75, 1.0, 0.92, 0.87] },
    { t: '1/4 并行环境', v: [0.97, 0.0, 0.59, 0.94, 0.65, 0.58] },
    { t: '3 层 MLP', v: [0.99, 0.02, 0.0, 0.98, 0.89, 0.81] },
    { t: 'PHP', v: [0.99, 0.95, 1.0, 1.0, 0.98, 0.9] }
  ];
  function mean(a) {
    return (
      a.reduce(function (s, x) {
        return s + x;
      }, 0) / a.length
    );
  }
  var T1_MEAN = T1.map(function (r) {
    return mean(r.v);
  }); // 0.333 / 0.132 / 0.368 / 0.980
  var T2_MEAN = T2.map(function (r) {
    return mean(r.v);
  });
  var DAGGER_MEAN = T2_MEAN[2]; // 0.188
  var OURS_MEAN = T2_MEAN[T2.length - 1]; // 0.970
  var WALL_FRAC = (WALL_H / ROBOT_H) * 100; // 96.2 %
  var VAULT_DIST = VAULT.avg * VAULT.dur; // 2.02 m
  var VAULT_FRAC = (2 / ROBOT_H) * 100; // 论文「超过 2 m，154% 身高」

  // ─── 画图小工具 ─────────────────────────────────────────────────────
  function box(g, x, y, w, h, fill, stroke, sw) {
    var r = paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 8, 'stroke-width': sw || 1.3 }), fill, stroke);
    g.appendChild(r);
    return r;
  }
  function arrowLine(s, a, b, marker, color, w, dash) {
    var attrs = { d: polyPath([a, b]), fill: 'none', 'stroke-width': w || 1.5, 'marker-end': marker };
    if (dash) attrs['stroke-dasharray'] = dash;
    var p = paint(svgEl('path', attrs), null, color);
    s.appendChild(p);
    return p;
  }
  function hbar(g, x, y, label, v, max, w, color, txt, labelW) {
    var lw = labelW || 120;
    g.appendChild(svgText(x, y + 9, label, 'demo-x-ink2', 9.5));
    g.appendChild(paint(svgEl('rect', { x: x + lw, y: y, width: Math.max(1, (v / max) * w), height: 11, rx: 2 }), color));
    g.appendChild(svgText(x + lw + Math.max(1, (v / max) * w) + 5, y + 9, txt, 'demo-x-mono', 9));
  }
  function block(g, x, y, w, h, fill) {
    g.appendChild(paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 2, 'stroke-width': 1.2 }), fill, C_BORDER));
  }

  // ─── 第 1 幕：跑酷要同时过四关 ──────────────────────────────────────
  var PX_PER_M = 87; // 火柴人约 113 px 高 ≈ G1 的 1.3 m
  var GROUND_Y = 170;
  var S1_OBS = [
    { x: 290, h: 0.36, t: '36 cm：迈过' },
    { x: 420, h: 0.58, t: '58 cm：爬上 / 撑越' },
    { x: 560, h: 0.94, t: '94 cm：手撑爬上' },
    { x: 690, h: WALL_H, t: '1.25 m 墙' }
  ];
  var S1_WALLS = [
    { t: '① 高动态、接触密集', a: '零点几秒内撑越、爬过', b: '与身高相当的墙' },
    { t: '② 必须和视觉闭环', a: '障碍距离 / 高度随时在变', b: '没法按脚本回放' },
    { t: '③ 几十个技能进一个策略', a: '技能越多越难整合', b: '还要自然地互相衔接' },
    { t: '④ 人类数据极少', a: '一个技能一两段、几秒长', b: '猫跃只有 1.5 s' }
  ];

  function buildSceneProblem() {
    var s = sceneSvg(
      '人形跑酷要同时解决高动态接触、视觉闭环、多技能整合与人类数据稀缺四个问题；技能库里跑酷片段只占总时长约 12%'
    );
    s.appendChild(svgText(56, 26, '跑酷是一块「四关齐过」的试金石', 'demo-x-ink2', 13.5));

    var course = svgEl('g', {});
    course.appendChild(paint(svgEl('line', { x1: 40, y1: GROUND_Y, x2: 760, y2: GROUND_Y, 'stroke-width': 1.5 }), null, C_BORDER));
    var obs = S1_OBS.map(function (o, k) {
      var g = svgEl('g', {});
      var h = o.h * PX_PER_M;
      block(g, o.x, GROUND_Y - h, 60, h, k === 3 ? C_SURFACE2 : C_SURFACE);
      g.appendChild(svgText(o.x + 30, GROUND_Y + 16, o.t, 'demo-x-mut', 9, 'middle'));
      course.appendChild(g);
      return { g: g, at: 0.8 + k * 0.5 };
    });
    s.appendChild(course);
    var fig = stickFigure(C_ACCENT, 2.4);
    s.appendChild(fig.el);
    var figNote = svgText(150, 58, 'G1 身高 ' + ROBOT_H + ' m', 'demo-x-mono', 9, 'middle');
    s.appendChild(figNote);

    var walls = S1_WALLS.map(function (w, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 182;
      box(g, x, 196, 174, 76, C_SURFACE, k === 3 ? C_BAD : C_WARN, 1.3);
      g.appendChild(paint(svgText(x + 12, 218, w.t, null, 11), k === 3 ? C_BAD : C_WARN));
      g.appendChild(svgText(x + 12, 240, w.a, 'demo-x-mut', 9));
      g.appendChild(svgText(x + 12, 258, w.b, 'demo-x-mut', 9));
      s.appendChild(g);
      return { g: g, at: 2.6 + k * 1.2 };
    });

    var data = svgEl('g', {});
    data.appendChild(svgText(40, 298, 'Table III：技能库总时长', 'demo-x-ink2', 10.5));
    var total = LOCO_S + SKILL_S;
    var wLoco = (LOCO_S / total) * 560,
      wSkill = (SKILL_S / total) * 560;
    data.appendChild(paint(svgEl('rect', { x: 40, y: 306, width: wLoco - 2, height: 18, rx: 3 }), C_MUTED));
    data.appendChild(paint(svgEl('rect', { x: 40 + wLoco, y: 306, width: wSkill, height: 18, rx: 3 }), C_BAD));
    data.appendChild(svgText(40 + wLoco / 2, 319, '走 / 跑 ' + fmt(LOCO_S, 1) + ' s', 'demo-x-mono', 9.5, 'middle'));
    data.appendChild(
      paint(svgText(760, 319, '12 个跑酷片段合计 ' + fmt(SKILL_S, 1) + ' s（' + fmt(SKILL_FRAC, 1) + '%）', null, 10, 'end'), C_BAD)
    );
    s.appendChild(data);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 360, 'PHP：动作匹配把几秒的技能拼成长程参考 → 专家跟踪 → DAgger + RL 蒸馏成深度学生', null, 13, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 384, '部署时只给一个离散的二维速度命令，迈、爬、撑越、滚下由策略看着障碍自己挑', 'demo-x-mut', 10.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      obs.forEach(function (o) {
        setOpacity(o.g, seg(t, o.at, o.at + 0.4));
      });
      fig.pose(150, GROUND_Y - 48, poseWalk((t * 1.6) % 1));
      walls.forEach(function (w) {
        setOpacity(w.g, seg(t, w.at, w.at + 0.5));
      });
      setOpacity(data, seg(t, 7.4, 8.1));
      setOpacity(foot, seg(t, 9.6, 10.3));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 2 幕：动作匹配 = 特征空间里的最近邻 ─────────────────────────
  /* 散点图里只画前两维（未来 1 s 位移、左脚前向速度），第三维根速度写在表里。 */
  var SC = { x0: 430, y0: 110, w: 310, h: 170, xmin: 0.5, xmax: 2.5, ymin: 0, ymax: 5.2 };
  function scX(v) {
    return SC.x0 + ((v - SC.xmin) / (SC.xmax - SC.xmin)) * SC.w;
  }
  function scY(v) {
    return SC.y0 + SC.h - ((v - SC.ymin) / (SC.ymax - SC.ymin)) * SC.h;
  }
  var CLOUD = (function () {
    var rng = K.mulberry32(7),
      pts = [];
    for (var i = 0; i < 26; i++) {
      var u = 0.7 + rng() * 1.6;
      pts.push([u, 1.0 + u * 1.6 + (rng() - 0.5) * 1.6]);
    }
    return pts;
  })();

  function buildSceneMatch() {
    var s = sceneSvg(
      '动作匹配把每一帧写成 27 维特征：未来根轨迹、双脚状态与根速度；给定查询，在指定窗口里找欧氏距离最近的一帧接着播放'
    );
    s.appendChild(svgText(56, 26, '动作匹配：不学模型，只在数据库里「找最像的下一帧」', 'demo-x-ink2', 13.5));
    var eq = svgMath(400, 60, 'i^{\\star}_t = \\arg\\min_{i \\in \\mathcal{C}_t} \\lVert \\hat{\\mathbf{x}}_t - \\mathbf{x}_i \\rVert^2', {
      size: 15,
      w: 420,
      anchor: 'middle'
    });
    eq.setTone('var(--demo-accent)');
    s.appendChild(eq);

    var feat = svgEl('g', {});
    box(feat, 40, 92, 350, 200, C_SURFACE, C_BORDER, 1.2);
    feat.appendChild(svgRich(56, 114, '每一帧的特征 $\\mathbf{x}_i \\in \\mathbb{R}^{' + FEAT_DIM + '}$（角色局部坐标系）', { size: 10.5, cls: 'demo-x-ink2' }));
    var groups = [
      { n: FEAT_TRAJ, c: C_ACCENT, t: '未来根轨迹', d: HORIZONS.join(' / ') + ' s × (位置2 + 朝向2)' },
      { n: FEAT_FOOT, c: C_GOOD, t: '双脚状态', d: '左右脚 × (位置3 + 速度3)' },
      { n: FEAT_ROOT, c: C_WARN, t: '根速度', d: '线速度 3 维' }
    ];
    var cx = 56;
    groups.forEach(function (gr, k) {
      for (var i = 0; i < gr.n; i++) {
        feat.appendChild(paint(svgEl('rect', { x: cx + i * 11, y: 126, width: 9, height: 18, rx: 1.5 }), gr.c));
      }
      feat.appendChild(paint(svgText(56, 174 + k * 36, '■ ' + gr.t + '（' + gr.n + '）', null, 10), gr.c));
      feat.appendChild(svgText(72, 190 + k * 36, gr.d, 'demo-x-mut', 9));
      cx += gr.n * 11 + 4;
    });
    s.appendChild(feat);

    var plot = svgEl('g', {});
    box(plot, 410, 92, 350, 200, C_SURFACE, C_BORDER, 1.2);
    plot.appendChild(svgText(426, 108, '玩具投影：横轴未来 1 s 位移 (m)，纵轴左脚前向速度 (m/s)', 'demo-x-mut', 8.5));
    plot.appendChild(paint(svgEl('line', { x1: SC.x0, y1: SC.y0 + SC.h, x2: SC.x0 + SC.w, y2: SC.y0 + SC.h, 'stroke-width': 1 }), null, C_BORDER));
    plot.appendChild(paint(svgEl('line', { x1: SC.x0, y1: SC.y0, x2: SC.x0, y2: SC.y0 + SC.h, 'stroke-width': 1 }), null, C_BORDER));
    CLOUD.forEach(function (p) {
      plot.appendChild(paint(svgEl('circle', { cx: scX(p[0]), cy: scY(p[1]), r: 2.6 }), C_MUTED));
    });
    LOCO_DB.forEach(function (f) {
      plot.appendChild(paint(svgEl('circle', { cx: scX(f.x[0]), cy: scY(f.x[1]), r: 4.2 }), C_ACCENT));
      plot.appendChild(svgText(scX(f.x[0]) + 7, scY(f.x[1]) + 4, f.id, 'demo-x-mono', 9));
    });
    s.appendChild(plot);

    var qg = svgEl('g', {});
    var qx = scX(QUERY[0]),
      qy = scY(QUERY[1]);
    var l1 = LOCO_DB[0].x,
      l3 = LOCO_DB[2].x;
    qg.appendChild(paint(svgEl('line', { x1: qx, y1: qy, x2: scX(l1[0]), y2: scY(l1[1]), 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }), null, C_MUTED));
    qg.appendChild(paint(svgEl('line', { x1: qx, y1: qy, x2: scX(l3[0]), y2: scY(l3[1]), 'stroke-width': 2 }), null, C_GOOD));
    qg.appendChild(paint(svgEl('rect', { x: qx - 5, y: qy - 5, width: 10, height: 10, 'stroke-width': 2 }), 'none', C_BAD));
    qg.appendChild(svgRich(qx - 10, qy - 10, '查询 $\\hat{\\mathbf{x}}$', { size: 9.5, anchor: 'end' }).setTone(C_BAD));
    s.appendChild(qg);

    var tab = svgEl('g', {});
    tab.appendChild(svgRich(56, 318, '三维玩具特征（未标准化）：查询 $\\hat{\\mathbf{x}} = (' + fmt(QUERY[0], 2) + ', ' + fmt(QUERY[1], 1) + ', ' + fmt(QUERY[2], 1) + ')$', { size: 10, cls: 'demo-x-ink2' }));
    tab.appendChild(
      svgRich(56, 338, '$d^2(\\hat{\\mathbf{x}}, \\mathrm{L1}) = ' + fmt(D_L1, 4) + '$（慢走）；$d^2(\\hat{\\mathbf{x}}, \\mathrm{L3}) = ' + fmt(NN_LOCO.d, 4) + '$（小跑）→ 选 ' + NN_LOCO.id, { size: 10 })
    );
    s.appendChild(tab);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 372, '每 M 帧、或速度命令变化较大时检索一次；找到后从那一帧顺序往下播', null, 12, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 394, '切换处用 inertialization 平滑 —— 输出的是真实捕捉的动作，不是网络生成的', 'demo-x-mut', 10.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      setOpacity(eq, seg(t, 0.3, 1.0));
      setOpacity(feat, seg(t, 1.2, 1.9));
      setOpacity(plot, seg(t, 4.0, 4.7));
      setOpacity(qg, seg(t, 5.6, 6.3));
      setOpacity(tab, seg(t, 7.2, 7.9));
      setOpacity(foot, seg(t, 9.8, 10.5));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 3 幕：临界阻尼弹簧把命令变成查询 ────────────────────────────
  var SP = { x0: 70, y0: 96, w: 290, h: 160 };
  function spX(tau) {
    return SP.x0 + tau * SP.w;
  }
  function spY(v) {
    return SP.y0 + SP.h - ((v - 0.8) / 1.4) * SP.h;
  }

  function buildSceneSpring() {
    var s = sceneSvg(
      '用临界阻尼弹簧把目标速度与朝向外推成 0.33、0.67、1 秒三个时刻的未来根轨迹，作为查询的一部分；切换时用同一个弹簧把偏移衰减到零'
    );
    s.appendChild(svgText(56, 26, '命令只是一个速度；查询要的是「接下来一秒怎么走」', 'demo-x-ink2', 13.5));
    var eq = svgMath(400, 58, 's(\\tau) = e^{-y\\tau}\\,(j_0 + \\tau j_1) + s_{\\mathrm{goal}}, \\quad j_0 = s_0 - s_{\\mathrm{goal}},\\; j_1 = \\dot{s}_0 + y j_0', {
      size: 13.5,
      w: 640,
      anchor: 'middle'
    });
    eq.setTone('var(--demo-accent)');
    s.appendChild(eq);

    var plot = svgEl('g', {});
    box(plot, 40, 80, 350, 210, C_SURFACE, C_BORDER, 1.2);
    plot.appendChild(paint(svgEl('line', { x1: SP.x0, y1: SP.y0 + SP.h, x2: SP.x0 + SP.w, y2: SP.y0 + SP.h }), null, C_BORDER));
    plot.appendChild(paint(svgEl('line', { x1: SP.x0, y1: SP.y0, x2: SP.x0, y2: SP.y0 + SP.h }), null, C_BORDER));
    plot.appendChild(
      paint(svgEl('line', { x1: SP.x0, y1: spY(V_CMD), x2: SP.x0 + SP.w, y2: spY(V_CMD), 'stroke-dasharray': '5 4' }), null, C_MUTED)
    );
    plot.appendChild(svgText(SP.x0 + SP.w, spY(V_CMD) - 6, '命令 ' + V_CMD + ' m/s', 'demo-x-mut', 9, 'end'));
    plot.appendChild(svgText(SP.x0 - 6, spY(V0) + 4, V0 + '', 'demo-x-mono', 9, 'end'));
    plot.appendChild(svgRich(SP.x0 + SP.w / 2, SP.y0 + SP.h + 22, '$\\tau$ (s)：速度沿弹簧追命令（$y = ' + SPRING_Y + '$，示意值）', { size: 9, cls: 'demo-x-mut', anchor: 'middle' }));
    var curvePts = [];
    for (var i = 0; i <= 50; i++) {
      var tau = i / 50;
      curvePts.push([spX(tau), spY(springVal(V0, 0, V_CMD, tau))]);
    }
    var curve = paint(svgEl('path', { d: polyPath(curvePts), fill: 'none', 'stroke-width': 2.4 }), null, C_ACCENT);
    plot.appendChild(curve);
    var marks = HORIZONS.map(function (tau, k) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('circle', { cx: spX(tau), cy: spY(FUT_V[k]), r: 4.5 }), C_BAD));
      g.appendChild(svgText(spX(tau), spY(FUT_V[k]) + 18, fmt(FUT_V[k], 2), 'demo-x-mono', 9, 'middle'));
      plot.appendChild(g);
      return g;
    });
    s.appendChild(plot);

    var tab = svgEl('g', {});
    box(tab, 410, 80, 350, 210, C_SURFACE, C_BORDER, 1.2);
    tab.appendChild(svgText(426, 102, '位置对速度积分（式 5），朝向直接用式 4', 'demo-x-ink2', 10.5));
    var cols = [426, 520, 600, 690];
    ['$\\tau$ (s)', '弹簧 $p(\\tau)$', '按命令 $2\\tau$', '按当前 $1 \\cdot \\tau$'].forEach(function (h, k) {
      tab.appendChild(svgRich(cols[k], 126, h, { size: 9.5, cls: 'demo-x-mut' }));
    });
    HORIZONS.forEach(function (tau, k) {
      var y = 150 + k * 24;
      tab.appendChild(svgText(cols[0], y, fmt(tau, 2), 'demo-x-mono', 10));
      tab.appendChild(paint(svgText(cols[1], y, fmt(FUT_P[k], 2) + ' m', null, 10), C_ACCENT));
      tab.appendChild(svgText(cols[2], y, fmt(V_CMD * tau, 2) + ' m', 'demo-x-mono', 10));
      tab.appendChild(svgText(cols[3], y, fmt(V0 * tau, 2) + ' m', 'demo-x-mono', 10));
    });
    tab.appendChild(svgRich(426, 238, '朝向命令 ' + HEAD_CMD + '°：$\\psi = ' + FUT_PSI.map(function (p) {
      return fmt(p, 1) + '^\\circ';
    }).join(' \\,/\\, ') + '$', { size: 9.5 }));
    tab.appendChild(svgRich(426, 262, '三个时刻 × $(x, y, \\cos\\psi, \\sin\\psi)$ = 12 维，转到局部坐标系', { size: 9, cls: 'demo-x-mut' }));
    tab.appendChild(svgRich(426, 278, '再拼上当前的双脚状态与根速度，就是查询 $\\hat{\\mathbf{x}}$', { size: 9, cls: 'demo-x-mut' }));
    s.appendChild(tab);

    /* inertialization：切换瞬间记下两段动作的差，之后用同一个弹簧把差衰减到 0 */
    var inert = svgEl('g', {});
    var bx = 40,
      by = 304,
      bw = 720,
      bh = 70;
    box(inert, bx, by, bw, bh, C_SURFACE2, C_GOOD, 1.2);
    inert.appendChild(paint(svgText(bx + 14, by + 20, 'Inertialization（附录 A-3）', null, 10.5), C_GOOD));
    inert.appendChild(svgText(bx + 14, by + 40, '切换瞬间记下「旧片段 − 新片段」的偏移，', 'demo-x-mut', 9));
    inert.appendChild(svgText(bx + 14, by + 56, '加回新片段后，用 goal = 0 的同一个弹簧衰减掉', 'demo-x-mut', 9));
    var ix0 = 330,
      iw = 400,
      iy = by + 50;
    var oldPts = [],
      newPts = [],
      outPts = [];
    for (var j = 0; j <= 40; j++) {
      var u = j / 40,
        xx = ix0 + u * iw;
      var old = iy - 20 - 10 * Math.sin(u * 6);
      var nw = iy + 2 - 10 * Math.sin(u * 6 + 0.8);
      if (u <= 0.4) oldPts.push([xx, old]);
      if (u >= 0.4) {
        newPts.push([xx, nw]);
        var off = (iy - 20 - 10 * Math.sin(0.4 * 6)) - (iy + 2 - 10 * Math.sin(0.4 * 6 + 0.8));
        var tt = (u - 0.4) * 2.5;
        outPts.push([xx, nw + off * Math.exp(-4 * tt) * (1 + 4 * tt)]);
      }
    }
    inert.appendChild(paint(svgEl('path', { d: polyPath(oldPts), fill: 'none', 'stroke-width': 2 }), null, C_MUTED));
    inert.appendChild(paint(svgEl('path', { d: polyPath(newPts), fill: 'none', 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }), null, C_MUTED));
    var outPath = paint(svgEl('path', { d: polyPath(outPts), fill: 'none', 'stroke-width': 2.4 }), null, C_GOOD);
    inert.appendChild(outPath);
    inert.appendChild(paint(svgEl('line', { x1: ix0 + 0.4 * iw, y1: by + 8, x2: ix0 + 0.4 * iw, y2: by + bh - 6, 'stroke-dasharray': '3 3' }), null, C_BORDER));
    inert.appendChild(svgText(ix0 + 0.4 * iw + 4, by + 16, '切换', 'demo-x-mut', 8.5));
    s.appendChild(inert);

    function draw(t) {
      setOpacity(eq, seg(t, 0.3, 1.0));
      setOpacity(plot, seg(t, 1.2, 1.8));
      var u = seg(t, 1.8, 4.2);
      curve.setAttribute('stroke-dasharray', 400 * u + ' 400');
      marks.forEach(function (m, k) {
        setOpacity(m, seg(t, 2.2 + k * 0.7, 2.8 + k * 0.7));
      });
      setOpacity(tab, seg(t, 4.6, 5.3));
      setOpacity(inert, seg(t, 8.6, 9.3));
      setOpacity(outPath, seg(t, 9.6, 10.4));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 4 幕：Loco → Skill → Loco 的长程拼接 ─────────────────────────
  function buildSceneCompose() {
    var s = sceneSvg(
      '长程轨迹一律按走跑、技能、走跑三段拼接；切进技能时只在技能起跳前的入口窗口里检索，技能段内不再检索；不同的助跑距离会让不同的脚领跳'
    );
    s.appendChild(svgText(56, 26, '所有技能都经由「走 / 跑」这条共享流形出入', 'demo-x-ink2', 13.5));

    var tl = svgEl('g', {});
    var segs = [
      { x: 40, w: 230, c: C_ACCENT, t: 'Locomotion', d: '在 $\\mathcal{D}_{\\mathrm{loco}}$ 里检索' },
      { x: 270, w: 110, c: C_WARN, t: '入口窗口 $E_k$', d: '$[s_k - H_k,\\, s_k]$' },
      { x: 380, w: 220, c: C_BAD, t: '技能片段', d: '顺序播放到 $e_k$，不再检索' },
      { x: 600, w: 160, c: C_ACCENT, t: 'Locomotion', d: '再走 2 s 后停下' }
    ];
    segs.forEach(function (sg) {
      tl.appendChild(paint(svgEl('rect', { x: sg.x, y: 48, width: sg.w - 3, height: 26, rx: 4 }), sg.c));
      tl.appendChild(svgRich(sg.x + sg.w / 2, 66, sg.t, { size: 10.5, anchor: 'middle' }));
      tl.appendChild(svgRich(sg.x + sg.w / 2, 90, sg.d, { size: 9, cls: 'demo-x-mut', anchor: 'middle' }));
    });
    var head = paint(svgEl('line', { x1: 40, y1: 42, x2: 40, y2: 80, 'stroke-width': 2.5 }), null, C_GOOD);
    tl.appendChild(head);
    s.appendChild(tl);

    /* 两条助跑道：同一个障碍，起点距离不同 → 到入口窗口时处于不同步相 */
    var lanes = [
      { y: 138, dist: 3.9, q: Q_SWING, nn: NN_SWING, lead: '左脚领跳' },
      { y: 206, dist: 4.8, q: Q_STANCE, nn: NN_STANCE, lead: '右脚领跳' }
    ];
    var laneGs = lanes.map(function (ln, k) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('line', { x1: 40, y1: ln.y + 30, x2: 470, y2: ln.y + 30 }), null, C_BORDER));
      block(g, 440, ln.y + 6, 30, 24, C_SURFACE2);
      var x0 = 440 - ln.dist * 80;
      g.appendChild(svgText(x0, ln.y + 46, '起点 ' + ln.dist + ' m', 'demo-x-mono', 9, 'middle'));
      g.appendChild(paint(svgEl('line', { x1: x0, y1: ln.y + 24, x2: x0, y2: ln.y + 34, 'stroke-width': 2 }), null, C_MUTED));
      /* 脚印：左右交替，步长 0.6 m（示意） */
      var n = Math.floor(ln.dist / 0.6);
      for (var i = 0; i < n; i++) {
        var fx = x0 + 18 + i * 0.6 * 80;
        var left = (i + (k === 0 ? 0 : 1)) % 2 === 0;
        g.appendChild(paint(svgEl('rect', { x: fx, y: ln.y + (left ? 12 : 20), width: 12, height: 6, rx: 2 }), left ? C_ACCENT : C_GOOD));
      }
      g.appendChild(svgText(490, ln.y + 14, '到窗口时查询 = (' + ln.q.map(function (v) { return fmt(v, 1); }).join(', ') + ')', 'demo-x-mono', 9));
      g.appendChild(
        svgRich(490, ln.y + 32, '$d^2(S1) = ' + fmt(d2(ln.q, ENTRY_DB[0].x), 2) + '$；$d^2(S2) = ' + fmt(d2(ln.q, ENTRY_DB[1].x), 2) + '$', { size: 9 })
      );
      g.appendChild(paint(svgText(490, ln.y + 50, '→ ' + ln.nn.id + '：' + ln.lead, null, 10.5), k === 0 ? C_ACCENT : C_GOOD));
      s.appendChild(g);
      return g;
    });
    var legend = svgEl('g', {});
    legend.appendChild(paint(svgText(40, 124, '■ 左脚', null, 9), C_ACCENT));
    legend.appendChild(paint(svgText(86, 124, '■ 右脚', null, 9), C_GOOD));
    legend.appendChild(svgText(132, 124, '（第二维「左脚前向速度」在摆动时大、支撑时小；步长 0.6 m 为示意）', 'demo-x-mut', 9));
    s.appendChild(legend);

    var recipe = svgEl('g', {});
    box(recipe, 40, 274, 720, 70, C_SURFACE, C_BORDER, 1.2);
    recipe.appendChild(svgText(56, 296, '合成配方：速度 {' + SPEEDS.join(', ') + '} m/s × 转向 {' + DIRS.join('°, ') + '°} = ' + N_COMMANDS + ' 种命令；技能段里命令改成直行、保持同档速度', 'demo-x-ink2', 9.5));
    recipe.appendChild(svgText(56, 316, '技能前步行时长 ~ U[' + PRE_SKILL.join(', ') + '] s：防止策略靠「数步数 / 看时钟」起跳，只能看障碍', 'demo-x-mut', 9.5));
    recipe.appendChild(svgText(56, 334, '障碍宽度从片段所需最小值到 1.5 m、其余尺寸 ±5 cm、偏航 ±45°；再撒几个干扰箱', 'demo-x-mut', 9.5));
    s.appendChild(recipe);

    var foot = paint(svgText(400, 378, '检索密度 = 入口的多样性：同一段撑越，可以从跑步的任意步相进入', null, 12, 'middle'), C_ACCENT);
    s.appendChild(foot);
    var foot2 = svgText(400, 400, '训练数据只有单障碍，但走跑段把技能串起来，策略在真机上能连过多个障碍', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(foot2);

    function draw(t) {
      var u = seg(t, 0.4, 4.4);
      head.setAttribute('x1', 40 + u * 720);
      head.setAttribute('x2', 40 + u * 720);
      setOpacity(legend, seg(t, 4.2, 4.8));
      setOpacity(laneGs[0], seg(t, 4.4, 5.1));
      setOpacity(laneGs[1], seg(t, 6.2, 6.9));
      setOpacity(recipe, seg(t, 8.4, 9.1));
      setOpacity(foot, seg(t, 10.6, 11.2));
      setOpacity(foot2, seg(t, 11.6, 12.2));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 5 幕：专家 = 跟踪 + 特权 + 自适应采样 ─────────────────────────
  var AS_FAIL = [0.02, 0.03, 0.05, 0.35, 0.55, 0.3, 0.06, 0.02]; // 示意：高墙片段各段失败率

  function buildSceneExpert() {
    var s = sceneSvg(
      '每条拼好的参考先训一个单技能专家：沿用 BeyondMimic 的跟踪奖励，额外给 0.7 米见方的高度扫描和全局位置特权，并用自适应采样盯住常失败的片段'
    );
    s.appendChild(svgText(56, 26, '先把每条长程参考「跟住」：一个技能一个专家', 'demo-x-ink2', 13.5));

    var inp = svgEl('g', {});
    box(inp, 40, 48, 230, 230, C_SURFACE, C_ACCENT, 1.2);
    inp.appendChild(paint(svgText(56, 70, '专家的观测', null, 11), C_ACCENT));
    [
      '参考关节位置 / 速度',
      '参考骨盆位姿误差',
      '骨盆线 / 角速度、关节状态',
      '上一步动作',
      SCAN_M + ' m × ' + SCAN_M + ' m 高度扫描',
      '特权：骨盆全局位置与速度'
    ].forEach(function (l, k) {
      inp.appendChild(svgText(56, 96 + k * 22, '• ' + l, k >= 4 ? 'demo-x-ink2' : 'demo-x-mut', 9.5));
    });
    inp.appendChild(svgText(56, 238, '参考和地形焊死在一起，漂一点就错过', 'demo-x-mut', 8.5));
    inp.appendChild(svgText(56, 254, '台阶；全局特权让专家学会拉回来', 'demo-x-mut', 8.5));
    s.appendChild(inp);

    var rew = svgEl('g', {});
    box(rew, 290, 48, 220, 230, C_SURFACE, C_BORDER, 1.2);
    rew.appendChild(svgText(306, 70, '奖励：每项都是高斯核', 'demo-x-ink2', 10.5));
    var eq = svgMath(400, 96, 'r = \\exp(-e^2/\\sigma^2)', { size: 13, w: 200, anchor: 'middle' });
    rew.appendChild(eq);
    var px0 = 310,
      pw = 180,
      py0 = 120,
      ph = 90;
    var pts = [];
    for (var i = 0; i <= 40; i++) {
      var e = (i / 40) * 0.6;
      pts.push([px0 + (e / 0.6) * pw, py0 + ph - trackRew(e, SIG_ANCHOR) * ph]);
    }
    rew.appendChild(paint(svgEl('line', { x1: px0, y1: py0 + ph, x2: px0 + pw, y2: py0 + ph }), null, C_BORDER));
    rew.appendChild(paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': 2.2 }), null, C_ACCENT));
    [[0.15, R_015], [0.3, R_030]].forEach(function (p) {
      var x = px0 + (p[0] / 0.6) * pw,
        y = py0 + ph - p[1] * ph;
      rew.appendChild(paint(svgEl('circle', { cx: x, cy: y, r: 4 }), C_BAD));
      rew.appendChild(svgText(x + 6, y - 6, fmt(p[1], 3), 'demo-x-mono', 9));
    });
    rew.appendChild(svgRich(px0 + pw / 2, py0 + ph + 16, '锚点位置误差 $e$ (m)，$\\sigma = ' + SIG_ANCHOR + '$', { size: 8.5, cls: 'demo-x-mut', anchor: 'middle' }));
    rew.appendChild(svgText(306, 250, '6 个跟踪项权重都是 1.0', 'demo-x-mut', 9));
    rew.appendChild(svgText(306, 266, '+ 动作平滑 / 关节限位 / 自碰撞罚项', 'demo-x-mut', 9));
    s.appendChild(rew);

    var ad = svgEl('g', {});
    box(ad, 530, 48, 230, 230, C_SURFACE, C_WARN, 1.2);
    ad.appendChild(paint(svgText(546, 70, '自适应采样（专家专用）', null, 11), C_WARN));
    ad.appendChild(svgText(546, 88, '1.25 m 高墙片段按时间分段（示意）', 'demo-x-mut', 8.5));
    var totalF = AS_FAIL.reduce(function (a, b) {
      return a + b + 0.02;
    }, 0);
    var bars = AS_FAIL.map(function (f, k) {
      var p = (f + 0.02) / totalF;
      var h = p * 280;
      var r = paint(svgEl('rect', { x: 552 + k * 25, y: 220 - h, width: 18, height: h, rx: 2 }), k === 4 ? C_BAD : C_WARN);
      ad.appendChild(r);
      return { r: r, h: h };
    });
    ad.appendChild(svgText(552 + 4 * 25 + 9, 234, '拉起', 'demo-x-mut', 8.5, 'middle'));
    ad.appendChild(svgText(546, 254, '越常失败的段越常被选作起点', 'demo-x-mut', 9));
    ad.appendChild(svgText(546, 270, '论文：没有它，高墙专家学不出来', 'demo-x-ink2', 9));
    s.appendChild(ad);

    var foot = paint(svgText(400, 318, '动作 = 关节 PD 目标 / 固定尺度；专家一律把尺度设成 1（不用 BeyondMimic 的逐关节启发式）', null, 11.5, 'middle'), C_ACCENT);
    s.appendChild(foot);
    var foot2 = svgText(400, 342, '终止条件、域随机化、奖励形式都照搬 BeyondMimic；一个技能一套配方，不做逐技能调参', 'demo-x-mut', 10, 'middle');
    s.appendChild(foot2);
    var foot3 = svgText(400, 372, N_ENVS + ' 个并行环境，专家与学生都训 ' + TOTAL_ITERS / 1000 + 'K 次迭代', 'demo-x-mono', 10, 'middle');
    s.appendChild(foot3);

    function draw(t) {
      setOpacity(inp, seg(t, 0.4, 1.1));
      setOpacity(rew, seg(t, 3.6, 4.3));
      setOpacity(ad, seg(t, 6.4, 7.1));
      var g = Math.max(0.02, ease(seg(t, 6.8, 8.4)));
      bars.forEach(function (b) {
        b.r.setAttribute('y', (220 - b.h * g).toFixed(1));
        b.r.setAttribute('height', (b.h * g).toFixed(1));
      });
      setOpacity(foot, seg(t, 9.0, 9.6));
      setOpacity(foot2, seg(t, 10.0, 10.6));
      setOpacity(foot3, seg(t, 10.8, 11.4));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 6 幕：DAgger 的对称盲区与 PPO 课程 ───────────────────────────
  var CU = { x0: 450, y0: 92, w: 290, h: 150 };
  function cuX(k) {
    return CU.x0 + (k / TOTAL_ITERS) * CU.w;
  }
  function cuY(v) {
    return CU.y0 + CU.h - v * CU.h;
  }

  function buildSceneDistill() {
    var s = sceneSvg(
      '逐步模仿的 DAgger 损失对高出和低于专家的同样偏差一视同仁，只有更高的轨迹能越过障碍；PPO 按回合成败补上这一信号，并用课程从 DAgger 逐步过渡'
    );
    s.appendChild(svgText(56, 26, '多个专家蒸成一个学生：DAgger 管「像」，PPO 管「成」', 'demo-x-ink2', 13.5));
    var eq = svgMath(400, 56, '\\mathcal{L} = \\lambda_{\\mathrm{PPO}}\\,\\mathcal{L}_{\\mathrm{PPO}} + \\lambda_D\\,\\mathcal{L}_D, \\quad \\lambda_D(k) = \\max\\!\\left(0.1,\\ 1 - \\tfrac{k}{K/2}\\right)', {
      size: 13.5,
      w: 640,
      anchor: 'middle'
    });
    eq.setTone('var(--demo-accent)');
    s.appendChild(eq);

    /* 左：同样的 DAgger 损失，截然不同的结局 */
    var toy = svgEl('g', {});
    box(toy, 40, 78, 380, 200, C_SURFACE, C_BORDER, 1.2);
    toy.appendChild(svgText(56, 98, '起跳那几步的某个关节 PD 目标（归一化，示意）', 'demo-x-ink2', 10));
    var gy = 240;
    toy.appendChild(paint(svgEl('line', { x1: 56, y1: gy, x2: 404, y2: gy }), null, C_BORDER));
    block(toy, 250, gy - 62, 44, 62, C_SURFACE2);
    function arc(h, color, dash) {
      var pts = [];
      for (var i = 0; i <= 30; i++) {
        var u = i / 30;
        pts.push([90 + u * 280, gy - 30 - 4 * h * u * (1 - u)]);
      }
      var p = paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': 2.2 }), null, color);
      if (dash) p.setAttribute('stroke-dasharray', dash);
      toy.appendChild(p);
      return p;
    }
    var arcE = arc(36, C_MUTED, '5 4');
    var arcH = arc(52, C_GOOD);
    var arcL = arc(16, C_BAD);
    toy.appendChild(svgRich(92, 124, '专家 $a^* = ' + fmt(A_EXPERT, 1) + '$', { size: 9, cls: 'demo-x-mut' }));
    toy.appendChild(paint(svgText(92, 140, '学生 A = ' + fmt(A_HIGH, 1) + '：骨盆更高，越过', null, 9), C_GOOD));
    toy.appendChild(paint(svgText(92, 156, '学生 B = ' + fmt(A_LOW, 1) + '：骨盆更低，撞上', null, 9), C_BAD));
    s.appendChild(toy);
    var toyTxt = svgEl('g', {});
    toyTxt.appendChild(svgRich(56, 268, 'DAgger：$(' + fmt(A_HIGH, 1) + ' - 1)^2 = (' + fmt(A_LOW, 1) + ' - 1)^2 = ' + fmt(DAGGER_HIGH, 2) + '$，分不出好坏', { size: 9.5 }));
    s.appendChild(toyTxt);

    /* 右：课程 */
    var cur = svgEl('g', {});
    box(cur, 430, 78, 330, 200, C_SURFACE, C_BORDER, 1.2);
    cur.appendChild(paint(svgEl('line', { x1: CU.x0, y1: CU.y0 + CU.h, x2: CU.x0 + CU.w, y2: CU.y0 + CU.h }), null, C_BORDER));
    cur.appendChild(paint(svgEl('line', { x1: CU.x0, y1: CU.y0, x2: CU.x0, y2: CU.y0 + CU.h }), null, C_BORDER));
    var ld = [],
      lp = [];
    for (var k = 0; k <= TOTAL_ITERS; k += 250) {
      ld.push([cuX(k), cuY(lambdaD(k))]);
      lp.push([cuX(k), cuY(1 - lambdaD(k))]);
    }
    var pathD = paint(svgEl('path', { d: polyPath(ld), fill: 'none', 'stroke-width': 2.2 }), null, C_ACCENT);
    var pathP = paint(svgEl('path', { d: polyPath(lp), fill: 'none', 'stroke-width': 2.2 }), null, C_WARN);
    cur.appendChild(pathD);
    cur.appendChild(pathP);
    cur.appendChild(svgRich(CU.x0 + CU.w, cuY(LAMBDA_FLOOR) - 6, '$\\lambda_D \\to ' + LAMBDA_FLOOR + '$', { size: 9, anchor: 'end' }).setTone(C_ACCENT));
    cur.appendChild(svgRich(CU.x0 + CU.w, cuY(1 - LAMBDA_FLOOR) + 14, '$\\lambda_{\\mathrm{PPO}} \\to ' + fmt(1 - LAMBDA_FLOOR, 1) + '$', { size: 9, anchor: 'end' }).setTone(C_WARN));
    cur.appendChild(svgRich(CU.x0 + CU.w / 2, CU.y0 + CU.h + 28, '迭代 $k$（$K = ' + TOTAL_ITERS + '$）；虚线：1k 处 $\\lambda_{\\mathrm{PPO}}$ 超过 0.1，9k 处 $\\lambda_D$ 触底', { size: 8.5, cls: 'demo-x-mut', anchor: 'middle' }));
    var mk = svgEl('g', {});
    [ADAPT_ITER, FLOOR_ITER].forEach(function (k) {
      mk.appendChild(paint(svgEl('line', { x1: cuX(k), y1: CU.y0, x2: cuX(k), y2: CU.y0 + CU.h, 'stroke-dasharray': '3 3' }), null, C_BAD));
      mk.appendChild(paint(svgText(cuX(k), CU.y0 + CU.h + 12, k / 1000 + 'k', null, 8.5, 'middle'), C_BAD));
    });
    cur.appendChild(mk);
    s.appendChild(cur);

    var extra = svgEl('g', {});
    extra.appendChild(svgRich(56, 300, '• $\\lambda_{\\mathrm{PPO}}$ 超过 0.1 才打开自适应学习率与 KL 控制 —— 算下来正是第 ' + ADAPT_ITER + ' 次迭代，与 Table VI「1000 次后 adaptive」对上', { size: 9.5, cls: 'demo-x-mut' }));
    extra.appendChild(svgText(56, 318, '• 左右镜像也算完成：跟踪终止阈值从 ' + TERM_EXPERT + ' m 放宽到 ' + TERM_STUDENT + ' m；超出专家阈值的那些步只用 PPO，不给 DAgger 标签', 'demo-x-mut', 9.5));
    s.appendChild(extra);

    var t2 = svgEl('g', {});
    t2.appendChild(paint(svgText(400, 352, 'Table II 六任务平均：只用 DAgger ' + fmt(DAGGER_MEAN, 2) + ' → 加 PPO ' + fmt(OURS_MEAN, 2), null, 12.5, 'middle'), C_ACCENT));
    t2.appendChild(svgText(400, 374, '换成只给存活奖励也有 ' + fmt(T2_MEAN[3], 3) + '：RL 在这里主要是「按成败放大专家动作」，不靠精细奖励', 'demo-x-mut', 10, 'middle'));
    t2.appendChild(svgText(400, 394, '反过来，课程结束后拿掉 DAgger 只留 RL，动作会变抖 —— 模仿项是必要的正则', 'demo-x-mut', 10, 'middle'));
    s.appendChild(t2);

    function draw(t) {
      setOpacity(eq, seg(t, 0.3, 1.0));
      setOpacity(toy, seg(t, 1.0, 1.6));
      setOpacity(arcE, seg(t, 1.4, 2.0));
      setOpacity(arcH, seg(t, 2.6, 3.2));
      setOpacity(arcL, seg(t, 2.6, 3.2));
      setOpacity(toyTxt, seg(t, 3.6, 4.2));
      setOpacity(cur, seg(t, 5.2, 5.8));
      var u = seg(t, 5.6, 7.6);
      pathD.setAttribute('stroke-dasharray', 500 * u + ' 500');
      pathP.setAttribute('stroke-dasharray', 500 * u + ' 500');
      setOpacity(mk, seg(t, 7.6, 8.2));
      setOpacity(extra, seg(t, 8.6, 9.3));
      setOpacity(t2, seg(t, 11.0, 11.7));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 7 幕：深度学生只拿速度命令，自己挑技能 ───────────────────────
  var NOISE = (function () {
    var rng = K.mulberry32(11),
      pts = [];
    for (var i = 0; i < 70; i++) pts.push([rng(), rng(), rng()]);
    return pts;
  })();

  function buildSceneStudent() {
    var s = sceneSvg(
      '部署的学生策略只读本体感受、离散速度命令和 58 乘 87 的深度图；深度经三层卷积压成 32 维，再和其余输入一起进 5 层 MLP 输出关节 PD 目标'
    );
    s.appendChild(svgText(56, 26, '学生：没有参考动作、没有特权，只看深度图和一个速度命令', 'demo-x-ink2', 13.5));

    var dep = svgEl('g', {});
    var dx = 40,
      dy = 50,
      dw = DEPTH_W * 2.4,
      dh = DEPTH_H * 2.4;
    dep.appendChild(paint(svgEl('rect', { x: dx, y: dy, width: dw, height: dh, rx: 3, 'stroke-width': 1.2 }), C_SURFACE2, C_BORDER));
    dep.appendChild(paint(svgEl('path', { d: polyPath([[dx, dy + dh * 0.72], [dx + dw, dy + dh * 0.58], [dx + dw, dy + dh], [dx, dy + dh]]), 'stroke-width': 0 }), C_MUTED));
    dep.appendChild(paint(svgEl('rect', { x: dx + dw * 0.38, y: dy + dh * 0.34, width: dw * 0.3, height: dh * 0.3, 'stroke-width': 1.2 }), C_SURFACE, C_WARN));
    NOISE.forEach(function (n) {
      dep.appendChild(paint(svgEl('rect', { x: dx + n[0] * (dw - 3), y: dy + n[1] * (dh - 3), width: 3, height: 3 }), n[2] > 0.5 ? C_BORDER : C_MUTED));
    });
    dep.appendChild(svgText(dx + dw / 2, dy + dh + 16, DEPTH_H + ' × ' + DEPTH_W + ' 深度图 = ' + DEPTH_PX + ' 像素（Warp 渲染）', 'demo-x-mono', 9, 'middle'));
    s.appendChild(dep);

    var arrow = K.arrowMarker(s, 'php-x-arrow-student', C_BORDER);
    var net = svgEl('g', {});
    var nodes = [
      { x: 270, y: 70, w: 120, t: '3 层 CNN + GAP', d: '→ ' + DEPTH_OUT + ' 维' },
      { x: 270, y: 150, w: 120, t: '本体 + 上一步动作', d: '重力 / 角速度 / 关节' },
      { x: 270, y: 210, w: 120, t: '速度命令', d: '2 档速 × 5 个方向' },
      { x: 430, y: 130, w: 150, t: 'MLP 5 层', d: '[2048, 1024, 512, 256, 128]' },
      { x: 620, y: 130, w: 140, t: '29 个关节 PD 目标', d: '动作尺度 = 1' }
    ];
    nodes.forEach(function (n, k) {
      box(net, n.x, n.y, n.w, 46, k >= 3 ? C_SURFACE2 : C_SURFACE, k === 3 ? C_ACCENT : C_BORDER, 1.2);
      net.appendChild(svgText(n.x + n.w / 2, n.y + 19, n.t, null, 10, 'middle'));
      net.appendChild(svgText(n.x + n.w / 2, n.y + 36, n.d, 'demo-x-mono', 8.5, 'middle'));
    });
    s.appendChild(net);
    var arrows = svgEl('g', {});
    s.appendChild(arrows);
    arrowLine(arrows, [dx + dw + 4, 110], [268, 94], arrow, C_BORDER);
    arrowLine(arrows, [392, 94], [428, 146], arrow, C_BORDER);
    arrowLine(arrows, [392, 173], [428, 158], arrow, C_BORDER);
    arrowLine(arrows, [392, 233], [428, 168], arrow, C_BORDER);
    arrowLine(arrows, [582, 153], [618, 153], arrow, C_BORDER);

    var dr = svgEl('g', {});
    box(dr, 40, 262, 720, 76, C_SURFACE, C_WARN, 1.2);
    dr.appendChild(paint(svgText(56, 282, '相机建模（sim-to-real 的主要工作量）', null, 10.5), C_WARN));
    dr.appendChild(svgRich(56, 302, '外参在标定值附近 ±2.5 cm / ±2.5° 随机；深度加 ±3 cm 偏移与 $\\sigma = 3$ cm 高斯噪声，故意不加模糊（高速时会糊掉障碍）', { size: 9, cls: 'demo-x-mut' }));
    dr.appendChild(
      svgText(56, 320, '观测延迟 ' + DELAY_MS.join('–') + ' ms：3 m/s 时相当于晚看 ' + fmt(LAG_3[0], 2) + '–' + fmt(LAG_3[1], 2) + ' m；相机 ' + CAM_HZ + ' Hz，3 m/s 时两帧之间跑 ' + fmt(FRAME_3, 2) + ' m', 'demo-x-mono', 9)
    );
    s.appendChild(dr);

    var foot = paint(svgText(400, 370, '同一条「向前 2 m/s」命令：看到 36 cm 就迈过，看到 76 cm 就手撑爬上 —— 技能选择来自视觉', null, 12, 'middle'), C_ACCENT);
    s.appendChild(foot);
    var foot2 = svgText(400, 392, '专家的全局位置 / 速度特权，学生只能从深度与本体里推断', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(foot2);

    function draw(t) {
      setOpacity(dep, seg(t, 0.4, 1.1));
      setOpacity(net, seg(t, 2.0, 2.7));
      setOpacity(arrows, seg(t, 3.0, 3.6));
      setOpacity(dr, seg(t, 5.4, 6.1));
      setOpacity(foot, seg(t, 9.0, 9.6));
      setOpacity(foot2, seg(t, 10.2, 10.8));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 8 幕：定量证据与真机 ─────────────────────────────────────────
  function buildSceneEvidence() {
    var s = sceneSvg(
      '仿真里 PHP 在六个跑酷任务上平均成功率 0.98，纯奖励塑形、不拼接、端到端深度 RL 都在 0.37 以下；真机上 3.63 秒爬上 1.25 米墙'
    );
    s.appendChild(svgText(56, 26, '拿掉任何一环都会塌：人类参考、动作匹配、蒸馏缺一不可', 'demo-x-ink2', 13.5));

    var g1 = svgEl('g', {});
    box(g1, 40, 44, 350, 150, C_SURFACE, C_BORDER, 1.2);
    g1.appendChild(svgText(56, 64, 'Table I · 六任务平均成功率（1 / 2 m/s × 36 / 58 / 76 cm）', 'demo-x-ink2', 9.5));
    T1.forEach(function (r, k) {
      hbar(g1, 56, 78 + k * 26, r.t, T1_MEAN[k], 1, 150, k === 3 ? C_ACCENT : C_MUTED, fmt(T1_MEAN[k], 2), 132);
    });
    s.appendChild(g1);

    var g2 = svgEl('g', {});
    box(g2, 410, 44, 350, 230, C_SURFACE, C_BORDER, 1.2);
    g2.appendChild(svgText(426, 64, 'Table II · 消融（六任务平均）', 'demo-x-ink2', 9.5));
    T2.forEach(function (r, k) {
      var c = k === T2.length - 1 ? C_ACCENT : k === 2 ? C_BAD : C_MUTED;
      hbar(g2, 426, 76 + k * 24, r.t, T2_MEAN[k], 1, 140, c, fmt(T2_MEAN[k], 3), 118);
    });
    s.appendChild(g2);

    var g3 = svgEl('g', {});
    box(g3, 40, 206, 350, 68, C_SURFACE2, C_WARN, 1.2);
    g3.appendChild(paint(svgText(56, 226, '读法', null, 10.5), C_WARN));
    g3.appendChild(svgText(56, 244, '纯奖励塑形只会迈 36 cm，不会用手爬；不拼接的', 'demo-x-mut', 9));
    g3.appendChild(svgText(56, 260, '策略常常走到障碍前就停住（没见过「走→技能」）', 'demo-x-mut', 9));
    s.appendChild(g3);

    var real = svgEl('g', {});
    box(real, 40, 286, 720, 88, C_SURFACE2, C_GOOD, 1.3);
    real.appendChild(paint(svgText(56, 310, '真机（Unitree G1，零样本）', null, 11), C_GOOD));
    real.appendChild(
      svgText(56, 330, '爬 ' + WALL_H + ' m 墙 = 身高的 ' + fmt(WALL_FRAC, 0) + '%，从离地到站稳 ' + WALL_S + ' s；猫跃越过 ' + VAULT.h + ' m 高、' + VAULT.len + ' m 长的障碍只用 ' + VAULT.dur + ' s', 'demo-x-mono', 9.5)
    );
    real.appendChild(
      svgText(56, 348, '平均 ' + VAULT.avg + ' m/s × ' + VAULT.dur + ' s = ' + fmt(VAULT_DIST, 2) + ' m（论文：超过 2 m，≈ 身高的 ' + fmt(VAULT_FRAC, 0) + '%），峰值 ' + VAULT.peak + ' m/s', 'demo-x-mono', 9.5)
    );
    real.appendChild(svgText(56, 364, '48 s 多障碍连跑，途中把障碍推开约 0.5 m，策略临场改步点与时机', 'demo-x-mut', 9));
    s.appendChild(real);

    var foot = paint(svgText(400, 400, 'PHP = 动作匹配拼参考 + 单技能专家 + DAgger/PPO 蒸馏的深度学生', null, 12.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(g1, seg(t, 0.4, 1.1));
      setOpacity(g3, seg(t, 3.0, 3.6));
      setOpacity(g2, seg(t, 4.6, 5.3));
      setOpacity(real, seg(t, 8.0, 8.7));
      setOpacity(foot, seg(t, 11.0, 11.6));
    }
    return { el: s, draw: draw };
  }

  var PHP_SCENES = [
    {
      title: '跑酷要同时过四关',
      dur: 12,
      build: buildSceneProblem,
      cues: [
        { at: 0.4, s: '障碍从 36 cm 到 **1.25 m**（G1 身高 ' + ROBOT_H + ' m 的 ' + fmt(WALL_FRAC, 0) + '%）：迈、爬、撑越、滚下各不相同。' },
        { at: 2.6, s: '第一关：高动态、接触密集，零点几秒内要完成撑越。' },
        { at: 3.8, s: '第二关：必须和视觉闭环，障碍位置随时在变。第三关：几十个技能要进同一个策略。' },
        { at: 6.2, s: '第四关最要命：人类跑酷数据极少，一个技能一两段、只有几秒。' },
        { at: 7.6, s: 'Table III：12 个跑酷片段合计 ' + fmt(SKILL_S, 1) + ' s，只占技能库的 **' + fmt(SKILL_FRAC, 1) + '%**，其余都是走和跑。' },
        { at: 9.8, s: 'PHP 的回答：动作匹配拼参考，专家跟踪，DAgger + RL 蒸馏成**只看深度**的学生。' }
      ]
    },
    {
      title: '动作匹配：特征空间里的最近邻',
      dur: 13,
      build: buildSceneMatch,
      cues: [
        { at: 0.4, s: '动作匹配来自游戏动画：$i^{\\star}_t = \\arg\\min_{i\\in\\mathcal{C}_t}\\lVert\\hat{\\mathbf{x}}_t - \\mathbf{x}_i\\rVert^2$。' },
        { at: 1.6, s: '每帧特征 **' + FEAT_DIM + ' 维** = 未来根轨迹 ' + FEAT_TRAJ + ' + 双脚状态 ' + FEAT_FOOT + ' + 根速度 ' + FEAT_ROOT + '，都在角色局部坐标系里。' },
        { at: 4.2, s: '查询 $\\hat{\\mathbf{x}}_t$ 一半来自当前姿态（脚、根速度），一半来自速度命令（未来轨迹）。' },
        { at: 6.0, s: '玩具算例：$d^2$ 到慢走 L1 是 ' + fmt(D_L1, 4) + '，到小跑 L3 只有 **' + fmt(NN_LOCO.d, 4) + '** —— 选 L3 接着播。' },
        { at: 8.6, s: '$\\mathcal{C}_t$ 是**搜索窗口**：平时是整个走跑库，要切技能时只在入口窗口里找。' },
        { at: 10.4, s: '输出的每一帧都是真实捕捉的人类动作，只是被重新排了顺序。' }
      ]
    },
    {
      title: '临界阻尼弹簧：把命令变成查询',
      dur: 12,
      build: buildSceneSpring,
      cues: [
        { at: 0.4, s: '速度命令先经临界阻尼弹簧：$s(\\tau) = e^{-y\\tau}(j_0+\\tau j_1)+s_{\\mathrm{goal}}$。' },
        { at: 2.0, s: '从 ' + V0 + ' m/s 追到 ' + V_CMD + ' m/s：三个时刻的速度是 ' + FUT_V.map(function (v) { return fmt(v, 2); }).join(' / ') + ' m/s。' },
        { at: 4.6, s: '对速度积分得位置：$p(1.0) = ' + fmt(FUT_P[2], 2) + '$ m，比直接按命令的 2.00 m 短、比按当前速度的 1.00 m 长。' },
        { at: 6.6, s: '朝向同理：命令 ' + HEAD_CMD + '° 时三个时刻依次转到 ' + FUT_PSI.map(function (p) { return fmt(p, 1) + '°'; }).join(' / ') + '。' },
        { at: 8.8, s: '切换片段时的跳变用 **inertialization** 吸收：偏移加回去，再用 goal = 0 的同一个弹簧衰减。' },
        { at: 10.6, s: '论文没给 $y$ 的取值，这里的 $y = ' + SPRING_Y + '$ 只是示意。' }
      ]
    },
    {
      title: 'Loco → Skill → Loco 的长程拼接',
      dur: 13,
      build: buildSceneCompose,
      cues: [
        { at: 0.4, s: '每条轨迹都是「走跑 → 技能 → 走跑」：走跑是所有技能共用的连接段，不需要逐对采集过渡。' },
        { at: 2.2, s: '要切技能时，把 $\\mathcal{C}_t$ 收窄到入口窗口 $E_k = [s_k - H_k,\\, s_k]$，也就是起跳前那几步。' },
        { at: 4.4, s: '助跑 3.9 m：到窗口时左脚正在摆动，$d^2(S1) = ' + fmt(NN_SWING.d, 2) + '$ → **左脚领跳**。' },
        { at: 6.2, s: '助跑 4.8 m：到窗口时左脚正在支撑，$d^2(S2) = ' + fmt(NN_STANCE.d, 2) + '$ → **右脚领跳**。同一个技能，入口不同。' },
        { at: 8.4, s: '配方：' + SPEEDS.length + ' 档速度 × ' + DIRS.length + ' 个转向 = ' + N_COMMANDS + ' 种命令；技能前步行 $U[' + PRE_SKILL.join(', ') + ']$ s，堵住「数步数起跳」的捷径。' },
        { at: 10.6, s: '技能段内关掉检索、顺序播放，保住接触密集的人类动作；地形按入口帧的相对位姿摆到机器人前面。' }
      ]
    },
    {
      title: '专家：跟踪 + 特权 + 自适应采样',
      dur: 12,
      build: buildSceneExpert,
      cues: [
        { at: 0.4, s: '每条拼好的参考训一个跟踪专家，配方沿用 BeyondMimic / OmniRetarget。' },
        { at: 1.8, s: '额外给 ' + SCAN_M + ' m 见方的高度扫描，并开**全局跟踪**：特权的骨盆全局位置 / 速度让它学会纠偏。' },
        { at: 3.8, s: '奖励是高斯核 $r = \\exp(-e^2/\\sigma^2)$：锚点 $\\sigma = ' + SIG_ANCHOR + '$ m，偏 0.15 m 得 ' + fmt(R_015, 3) + '，偏 0.30 m 只剩 ' + fmt(R_030, 3) + '。' },
        { at: 6.6, s: '**自适应采样**：越常失败的片段段落越常被选为起点；论文说没有它，高墙专家学不出来。' },
        { at: 9.0, s: '动作尺度统一设为 1，不用 BeyondMimic 的逐关节启发式 —— 为了让高动态技能探索得开。' }
      ]
    },
    {
      title: 'DAgger 的盲区与 PPO 课程',
      dur: 14,
      build: buildSceneDistill,
      cues: [
        { at: 0.4, s: '学生损失：$\\mathcal{L} = \\lambda_{\\mathrm{PPO}}\\mathcal{L}_{\\mathrm{PPO}} + \\lambda_D\\mathcal{L}_D$，两个权重加起来是 1。' },
        { at: 1.6, s: '只用 DAgger 的问题：爬墙、撑越靠几步里的**短促大力矩**，逐步模仿不看回合结局。' },
        { at: 3.4, s: '偏高 0.2 和偏低 0.2 的 DAgger 损失都是 ' + fmt(DAGGER_HIGH, 2) + '，但只有骨盆更高的那条能越过去。' },
        { at: 5.4, s: '课程：$\\lambda_D(k) = \\max(0.1,\\ 1 - k/(K/2))$，前半程从 1 线性降到 0.1 后保持。' },
        { at: 7.6, s: '$\\lambda_{\\mathrm{PPO}} > 0.1$ 才开自适应学习率 —— 即 $k > ' + ADAPT_ITER + '$，与 Table VI 的「1000 次后」对上。' },
        { at: 9.0, s: '镜像执行也算完成：终止阈值 ' + TERM_EXPERT + ' → ' + TERM_STUDENT + ' m；超出专家阈值的步不给 DAgger 标签。' },
        { at: 11.0, s: 'Table II 平均：只用 DAgger ' + fmt(DAGGER_MEAN, 2) + '，加 PPO 到 **' + fmt(OURS_MEAN, 2) + '**；只给存活奖励也有 ' + fmt(T2_MEAN[3], 3) + '。' }
      ]
    },
    {
      title: '深度学生：只拿速度命令自己挑技能',
      dur: 12,
      build: buildSceneStudent,
      cues: [
        { at: 0.4, s: '学生看 **' + DEPTH_H + ' × ' + DEPTH_W + '** 的深度图（NVIDIA Warp 渲染，训练吞吐够高）。' },
        { at: 2.0, s: '3 层 CNN + 全局平均池化压成 ' + DEPTH_OUT + ' 维，与本体、速度命令一起进 5 层 MLP。' },
        { at: 4.0, s: '输出 29 个关节的 PD 目标；专家的全局位置特权在这里没有了，只能从视觉里推。' },
        { at: 5.6, s: '相机按「自身可见区域重叠」标定，外参再随机 ±2.5 cm / ±2.5°；深度噪声不加模糊。' },
        { at: 7.4, s: '延迟 ' + DELAY_MS.join('–') + ' ms：$3\\,\\mathrm{m/s} \\times 0.08\\,\\mathrm{s} = ' + fmt(LAG_3[1], 2) + '$ m，也就是晚看见 24 cm。' },
        { at: 9.0, s: '同一条速度命令，看到不同高度的障碍就走不同的技能 —— **技能选择来自视觉**。' }
      ]
    },
    {
      title: '定量证据与真机',
      dur: 13,
      build: buildSceneEvidence,
      cues: [
        { at: 0.4, s: 'Table I 六任务平均：速度跟踪 ' + fmt(T1_MEAN[0], 2) + '、不拼接 ' + fmt(T1_MEAN[1], 2) + '、端到端深度 ' + fmt(T1_MEAN[2], 2) + '，PHP **' + fmt(T1_MEAN[3], 2) + '**。' },
        { at: 3.0, s: '纯奖励塑形只会用脚迈，找不到用手撑的爬法；不拼接的策略走到障碍前就停住。' },
        { at: 4.8, s: 'Table II：拼接密度减半、只留两端距离都会掉点，差在**起跳时机**；小网络 / 少环境也掉点。' },
        { at: 8.2, s: '真机：' + WALL_S + ' s 爬上 ' + WALL_H + ' m 墙；猫跃 $' + VAULT.avg + ' \\times ' + VAULT.dur + ' = ' + fmt(VAULT_DIST, 2) + '$ m，峰值 ' + VAULT.peak + ' m/s。' },
        { at: 10.2, s: '48 s 连过多个障碍，途中推开障碍约 0.5 m，策略临场改步点和时机。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '八幕动画：PHP 全流程速览',
      sub: '约 101 秒自动播放。空格播放/暂停，← → 换幕；画面里的算例数字都是现算的，与正文「具体实例」一致。',
      ariaLabel: 'PHP 八幕讲解动画',
      notes: [
        '取数依据：特征维数与三个时刻取自附录 A-1；合成配方（2 档速度 × 5 个转向、$U[0.1, 3]$ s、障碍随机化）取自 §III-B；课程、终止阈值取自 §III-C 与 Table VI；第五幕的 $\\sigma$ 取自 Table IV；第八幕的平均成功率由 Table I / II 原值现算。',
        '第三幕的弹簧参数 $y = ' + SPRING_Y + '$、第二 / 四幕的三维玩具特征与数据库帧、第五幕的分段失败率、第六幕的 1.0 / 1.2 / 0.8 都是**示意算例，不是论文数据**。第六幕把「同一条线性课程」画成终止阈值在前半程线性放宽，是我的理解。'
      ],
      scenes: PHP_SCENES
    });
  }

  K.mount({
    'php-explainer': buildExplainerDemo
  });
})();
