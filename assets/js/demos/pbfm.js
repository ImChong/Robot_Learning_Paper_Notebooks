/* Interactive Perceptive BFM explainer for
 * papers/03_High_Impact_Selection/Perceptive_BFM_Adapting_Human_Motion_Priors_to_Robot-Centric_Terrain.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["pbfm"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   pbfm-explainer — 七幕讲解动画：操作者与环境错配 → PMT 四阶段与「原始参考即命令」
 *     的契约 → TCRS 摆动（接触检测 / 中足坐标 / MPPI）→ TCRS 身体（根高度 / 碰撞修复 /
 *     多点 IK）→ 目标系动作对齐 → 恒等门控的地形残差 → 定量证据
 *
 * 第 3–6 幕的小算例与笔记「🚶 具体实例」是同一组数字，都在这里现算；
 * tests/test_paper_demos.py 会按同样的公式在 Python 里复算。
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

  // ─── 观测契约（论文 §III-A、Table VI；代码 stepping_stone.py）─────────
  var SCAN_X = 1.6,
    SCAN_Y = 1.0,
    SCAN_RES = 0.1; // m
  var GRID_NX = Math.round(SCAN_X / SCAN_RES) + 1; // 17
  var GRID_NY = Math.round(SCAN_Y / SCAN_RES) + 1; // 11
  var GRID_CELLS = GRID_NX * GRID_NY; // 187
  var N_JOINTS = 29;
  var CMD_WIN = 21;
  var CMD_DIM = 3 + 3 + 3 + N_JOINTS; // v_ref_b, w_ref_b, g_ref_b, q_ref = 38
  var PROPRIO_DIM = 3 + 3 + 3 * N_JOINTS; // 重力、角速度、关节位置 / 速度、上一步动作 = 93
  var HIST = 10;

  // ─── TCRS 默认参数（TCRS/stair_mppi：gait_phase.py / mppi_foot_planner_smooth.py CLI）──
  var CONTACT_Z = 0.06; // m
  var CONTACT_V = 0.5; // m/s
  var MPPI_SAMPLES = 128;
  var MPPI_ITERS = 10;
  var MPPI_KNOTS = 5;
  var MPPI_TEMP = 0.1;
  var W_TRACK = 10;
  var W_TERRAIN = 1000;
  var W_SMOOTH = 10;
  var H_CLEAR = 0.03; // m，中摆时的净空是它的 2 倍
  var ALPHA_UP = 0.5,
    ALPHA_DOWN = 0.35,
    MAX_DZ = 0.035; // 根高度滤波（规划器里的取值）
  var MOTION_FPS = 30;
  var LEG_JOINTS = 12;
  var IK_POINTS = 3; // ankle / toe / heel

  // ─── 例 1：一次摆腿的 MPPI 打分（5 个密集点，示意）──────────────────
  /* 脚从平地（z=0）迈上 15 cm 台阶，台阶边缘在第 3 个点处。原始参考 = 线性抬到台阶高度
     + 平地摆腿的拱形；A 就是它，B / C 是两条抬得更高的候选。 */
  var PHI = [0, 0.25, 0.5, 0.75, 1];
  var TERR = [0, 0, 0.15, 0.15, 0.15];
  var BUMP = [0, 0.05, 0.08, 0.05, 0];
  var STEP_H = 0.15;
  var REF = PHI.map(function (p, i) {
    return STEP_H * p + BUMP[i];
  });
  var CLEAR = PHI.map(function (p) {
    var s = Math.sin(Math.PI * p);
    return 2 * H_CLEAR * s * s;
  });
  var FLOOR = TERR.map(function (t, i) {
    return t + CLEAR[i];
  });
  var CANDS = [
    { id: 'A', t: '原始参考', z: REF.slice() },
    { id: 'B', t: '抬高一些', z: [0, 0.11, 0.215, 0.19, 0.15] },
    { id: 'C', t: '抬得很高', z: [0, 0.16, 0.3, 0.25, 0.15] }
  ];
  function costParts(z) {
    var track = 0,
      terr = 0,
      smooth = 0;
    for (var i = 0; i < z.length; i++) {
      track += (z[i] - REF[i]) * (z[i] - REF[i]);
      var pen = Math.max(FLOOR[i] - z[i], 0);
      terr += pen * pen;
      if (i > 0 && i < z.length - 1) {
        var d2 = z[i + 1] - 2 * z[i] + z[i - 1];
        smooth += d2 * d2;
      }
    }
    return { track: W_TRACK * track, terr: W_TERRAIN * terr, smooth: W_SMOOTH * smooth, total: W_TRACK * track + W_TERRAIN * terr + W_SMOOTH * smooth };
  }
  CANDS.forEach(function (c) {
    c.cost = costParts(c.z);
  });
  function softminWeights(temp) {
    var cmin = Math.min.apply(
      null,
      CANDS.map(function (c) {
        return c.cost.total;
      })
    );
    var w = CANDS.map(function (c) {
      return Math.exp(-(c.cost.total - cmin) / temp);
    });
    var s = w.reduce(function (a, b) {
      return a + b;
    }, 0);
    return w.map(function (v) {
      return v / s;
    });
  }
  function blend(w) {
    return PHI.map(function (_, i) {
      return CANDS.reduce(function (a, c, k) {
        return a + w[k] * c.z[i];
      }, 0);
    });
  }
  var W_T01 = softminWeights(MPPI_TEMP); // 0.000 / 0.994 / 0.006
  var W_T1 = softminWeights(1.0); // 0.026 / 0.608 / 0.366
  var Z_T01 = blend(W_T01);
  var Z_T1 = blend(W_T1);
  var REF_PEN_MID = FLOOR[2] - REF[2]; // 0.055 m：原始参考在台阶边缘缺的净空

  // ─── 例 2：支撑感知的根高度（式 7）+ 规划器里的限速滤波 ───────────────
  var Z_ROOT_RAW = 0.72; // 平地参考里的骨盆高度（示意）
  function rootTarget(wl, wr) {
    /* 左脚踩台阶（h = 0.15），右脚在地面（h = 0）；两脚在原始平地参考里都贴地（z_f = 0） */
    return (wl * (STEP_H + Z_ROOT_RAW - 0) + wr * (0 + Z_ROOT_RAW - 0)) / (wl + wr);
  }
  var ROOT_HALF = rootTarget(0.5, 0.5); // 0.795
  var ROOT_LEFT = rootTarget(0.8, 0.2); // 0.84
  function emaSeq(z0, target, n) {
    var z = z0,
      out = [];
    for (var i = 0; i < n; i++) {
      var a = target > z ? ALPHA_UP : ALPHA_DOWN;
      var e = z + a * (target - z);
      z = z + Math.max(-MAX_DZ, Math.min(MAX_DZ, e - z));
      out.push(z);
    }
    return out;
  }
  var EMA = emaSeq(Z_ROOT_RAW, ROOT_HALF, 5); // 0.755 / 0.775 / 0.785 / 0.790 / 0.7925
  var MAX_VZ = MAX_DZ * MOTION_FPS; // 1.05 m/s
  var IK_ROWS = IK_POINTS * 2 * 3; // 18
  var KEPT_JOINTS = N_JOINTS - LEG_JOINTS; // 17

  // ─── 例 3：目标系动作对齐（式 10）─────────────────────────────────────
  var Q_RAW = 0.3; // 左膝在平地原始参考里的角度（rad，示意）
  var Q_TCRS = 0.62; // TCRS 为上台阶把膝盖弯得更多
  var MU_TEA = 0.05; // 教师在自己的命令系里输出的残差
  var A_STAR = Q_TCRS + MU_TEA - Q_RAW; // 0.37
  var NAIVE_TARGET = Q_RAW + MU_TEA; // 0.35：直接抄教师残差
  var NAIVE_ERR = Q_TCRS + MU_TEA - NAIVE_TARGET; // 0.32 rad

  // ─── 例 4：恒等门控 ─────────────────────────────────────────────────
  var ALPHAS = [0, 0.25, 0.5, 1.0];

  // ─── 论文表格 ───────────────────────────────────────────────────────
  var T1 = {
    zoff: { pen: 5.48, flt: 12.4, clr: 33.8, sm: 15.1, up: 6.51 },
    cubic: { pen: 2.69, flt: 31.7, clr: 14.3, sm: 6.9, up: 3.98 },
    tcrs: { pen: 2.38, flt: 32.3, clr: 7.4, sm: 8.6, up: 4.0 }
  };
  var PEN_DROP = ((T1.zoff.pen - T1.tcrs.pen) / T1.zoff.pen) * 100; // 56.6
  var CLR_DROP = ((T1.cubic.clr - T1.tcrs.clr) / T1.cubic.clr) * 100; // 48.3
  var T2 = [
    { t: 'PMT（完整）', v: 55.1 },
    { t: '去掉恒等门控', v: 30.4 },
    { t: '视觉直接拼接', v: 29.9 },
    { t: '去掉 TCRS', v: 27.3 },
    { t: '去掉目标系对齐', v: 26.7 },
    { t: '去掉视觉', v: 26.5 }
  ];
  var T3 = [
    { t: '原始参考', v: 27.3 },
    { t: 'Z 偏移', v: 33.0 },
    { t: '三次插值 + IK', v: 41.0 },
    { t: 'TCRS', v: 55.1 }
  ];
  var SLOTS = 90; // 每类地形 30 条命令 × 3 个种子
  var T4 = [
    { t: '台阶', pmt: [53.3, 25.6, 21.1, 11.1], raw: [24.4, 47.8, 27.8, 26.7] },
    { t: '斜坡', pmt: [66.7, 15.6, 17.8, 5.6], raw: [35.6, 37.8, 26.7, 17.8] },
    { t: '稀疏支撑', pmt: [42.2, 33.3, 24.4, 15.6], raw: [17.8, 55.6, 26.7, 33.3] },
    { t: '凹陷障碍', pmt: [52.2, 26.7, 21.1, 10.0], raw: [25.6, 46.7, 27.8, 24.4] },
    { t: '室内混合', pmt: [61.1, 17.8, 21.1, 7.8], raw: [33.3, 41.1, 25.6, 21.1] }
  ];
  function count(pct) {
    return Math.round((pct / 100) * SLOTS);
  }
  function sumCol(key, j) {
    return T4.reduce(function (a, r) {
      return a + count(r[key][j]);
    }, 0);
  }
  var PMT_COMP = sumCol('pmt', 0); // 248
  var RAW_COMP = sumCol('raw', 0); // 123
  var PMT_COLL = sumCol('pmt', 3); // 45
  var RAW_COLL = sumCol('raw', 3); // 111
  var N_ROLL = SLOTS * T4.length; // 450

  // ─── 画图小工具 ─────────────────────────────────────────────────────
  function box(g, x, y, w, h, fill, stroke, sw) {
    var r = paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 8, 'stroke-width': sw || 1.3 }), fill, stroke);
    g.appendChild(r);
    return r;
  }
  function arrowLine(g, a, b, marker, color, w, dash) {
    var attrs = { d: polyPath([a, b]), fill: 'none', 'stroke-width': w || 1.5, 'marker-end': marker };
    if (dash) attrs['stroke-dasharray'] = dash;
    var p = paint(svgEl('path', attrs), null, color);
    g.appendChild(p);
    return p;
  }
  function hbar(g, x, y, label, v, max, w, color, txt, labelW) {
    var lw = labelW || 110;
    g.appendChild(svgText(x, y + 9, label, 'demo-x-ink2', 9.5));
    g.appendChild(paint(svgEl('rect', { x: x + lw, y: y, width: Math.max(1, (v / max) * w), height: 11, rx: 2 }), color));
    g.appendChild(svgText(x + lw + Math.max(1, (v / max) * w) + 5, y + 9, txt, 'demo-x-mono', 9));
  }

  // ─── 第 1 幕：操作者与环境错配 ─────────────────────────────────────
  function buildSceneMismatch() {
    var s = sceneSvg(
      '动捕操作者在平地上做的动作只说明做什么，不说明机器人那边的落脚点、抬脚高度、身体高度与接触时机；Perceptive BFM 保留原始参考作为命令，由机器人自己的地形感知补上这些'
    );
    s.appendChild(svgText(56, 26, '人在平地上给的动作，机器人要在台阶上做出来', 'demo-x-ink2', 13.5));

    var left = svgEl('g', {});
    box(left, 40, 44, 340, 206, C_SURFACE, C_BORDER, 1.2);
    left.appendChild(paint(svgText(56, 66, '操作者 / 动捕片段：平地', null, 11), C_ACCENT));
    left.appendChild(paint(svgEl('line', { x1: 60, y1: 220, x2: 360, y2: 220, 'stroke-width': 1.5 }), null, C_BORDER));
    var human = stickFigure(C_ACCENT, 2.4);
    left.appendChild(human.el);
    left.appendChild(svgText(210, 240, '参考只说「做什么、什么风格」', 'demo-x-mut', 9.5, 'middle'));
    s.appendChild(left);

    var right = svgEl('g', {});
    box(right, 420, 44, 340, 206, C_SURFACE, C_BORDER, 1.2);
    right.appendChild(paint(svgText(436, 64, '机器人：随机摆放的台阶', null, 11), C_WARN));
    var gy = 220;
    right.appendChild(paint(svgEl('line', { x1: 440, y1: gy, x2: 740, y2: gy, 'stroke-width': 1.5 }), null, C_BORDER));
    [0, 1, 2].forEach(function (k) {
      var h = (k + 1) * 18;
      right.appendChild(paint(svgEl('rect', { x: 560 + k * 50, y: gy - h, width: 50, height: h, 'stroke-width': 1.2 }), C_SURFACE2, C_BORDER));
    });
    var ghost = stickFigure(C_BAD, 2, true);
    right.appendChild(ghost.el);
    var robot = stickFigure(C_GOOD, 2.4);
    right.appendChild(robot.el);
    s.appendChild(right);
    var ghostTag = paint(svgText(436, 86, '虚线 = 原样照搬：脚穿进台阶', null, 9.5), C_BAD);
    s.appendChild(ghostTag);
    var robotTag = paint(svgText(436, 101, '实线 = 按地形落脚、抬高骨盆', null, 9.5), C_GOOD);
    s.appendChild(robotTag);

    var miss = svgEl('g', {});
    ['落脚点', '摆腿净空', '身体高度', '接触时机'].forEach(function (w, k) {
      var x = 40 + k * 182;
      box(miss, x, 266, 174, 40, C_SURFACE2, C_WARN, 1.2);
      miss.appendChild(paint(svgText(x + 87, 291, '参考里没有：' + w, null, 10.5, 'middle'), C_WARN));
    });
    s.appendChild(miss);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 344, '契约：原始运动学参考 = 部署命令；地形感知只补局部实现', null, 13.5, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 370, '不像跑酷策略那样由系统挑技能，也不在线改写参考 —— 用户给什么动作，就跟什么动作', 'demo-x-mut', 10.5, 'middle'));
    foot.appendChild(svgText(400, 392, '一套权重覆盖走跑、舞蹈、后空翻、侧手翻与动捕遥操作，G1 真机室内外都跑', 'demo-x-mut', 10.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      var ph = (t * 0.9) % 1;
      setOpacity(left, seg(t, 0.3, 1.0));
      human.pose(180 + 60 * Math.sin(t * 0.5), 172, poseWalk(ph));
      setOpacity(right, seg(t, 2.0, 2.7));
      /* 走上台阶：机器人骨盆随台阶抬高，幽灵参考保持平地高度 */
      var u = seg(t, 2.6, 9.0);
      var x = 470 + u * 200;
      var stepIdx = Math.max(0, Math.min(3, Math.floor((x - 540) / 50) + 1));
      var lift = (x < 560 ? 0 : stepIdx * 18);
      ghost.pose(x, 172, poseWalk(ph));
      robot.pose(x, 172 - lift, poseWalk(ph));
      setOpacity(ghost.el, seg(t, 3.4, 4.0) * 0.7);
      setOpacity(ghostTag, seg(t, 3.8, 4.4));
      setOpacity(robotTag, seg(t, 5.0, 5.6));
      setOpacity(miss, seg(t, 6.0, 6.7));
      setOpacity(foot, seg(t, 9.2, 9.9));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 2 幕：PMT 四阶段 ───────────────────────────────────────────
  function buildScenePipeline() {
    var s = sceneSvg(
      'PMT 四个阶段：离线 TCRS 合成地形适配参考、盲教师用 PPO 跟踪它、视觉学生经目标系对齐蒸馏、再用 PPO 微调；部署时只有原始参考、本体与高度图'
    );
    s.appendChild(svgText(56, 26, 'PMT：TCRS 只用来「教」，部署时从不调用', 'demo-x-ink2', 13.5));
    var eq = svgMath(400, 58, 'q^{\\mathrm{pd}}_t = q^{\\mathrm{cmd}}_t + a_t, \\quad q^{\\mathrm{cmd}}_{\\text{教师}} = q^{\\mathrm{tcrs}}_t,\\ \\ q^{\\mathrm{cmd}}_{\\text{学生}} = q^{\\mathrm{raw}}_t', {
      size: 13.5,
      w: 640,
      anchor: 'middle'
    });
    eq.setTone('var(--demo-accent)');
    s.appendChild(eq);

    var arrow = K.arrowMarker(s, 'pbfm-x-arrow-pipe', C_BORDER);
    var stages = [
      { t: '① TCRS', d: '原始片段 + 高度场', d2: '→ 地形适配参考', c: C_WARN },
      { t: '② 盲教师 PPO', d: 'Transformer，无感知', d2: '跟踪 TCRS 参考', c: C_ACCENT },
      { t: '③ 视觉学生蒸馏', d: '收原始参考 + 高度图', d2: '目标系动作对齐', c: C_GOOD },
      { t: '④ PPO 微调', d: '恒等门控地形残差', d2: '骨干学习率打折', c: C_GOOD }
    ];
    var boxes = stages.map(function (st, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 184;
      box(g, x, 82, 168, 84, C_SURFACE, st.c, 1.4);
      g.appendChild(paint(svgText(x + 84, 106, st.t, null, 11.5, 'middle'), st.c));
      g.appendChild(svgText(x + 84, 128, st.d, 'demo-x-mut', 9.5, 'middle'));
      g.appendChild(svgText(x + 84, 146, st.d2, 'demo-x-mut', 9.5, 'middle'));
      if (k < 3) arrowLine(g, [x + 170, 124], [x + 182, 124], arrow, C_BORDER);
      s.appendChild(g);
      return g;
    });

    var dep = svgEl('g', {});
    box(dep, 40, 188, 720, 118, C_SURFACE2, C_ACCENT, 1.3);
    dep.appendChild(paint(svgText(56, 210, '部署时学生读到的全部输入（Table VI）', null, 11), C_ACCENT));
    var chips = [
      '本体 ' + PROPRIO_DIM + ' 维',
      '本体历史 ' + HIST + ' 步',
      '命令窗口 ' + CMD_WIN + ' × ' + CMD_DIM,
      '锚点位移窗口 ' + CMD_WIN + ' × 3',
      '高度图 ' + GRID_NX + ' × ' + GRID_NY + ' + 有效掩码'
    ];
    chips.forEach(function (c, k) {
      var x = 56 + k * 140;
      dep.appendChild(paint(svgEl('rect', { x: x, y: 222, width: 132, height: 26, rx: 13, 'stroke-width': 1.1 }), C_SURFACE, C_BORDER));
      dep.appendChild(svgText(x + 66, 239, c, 'demo-x-mono', 9, 'middle'));
    });
    dep.appendChild(svgText(56, 272, '命令窗口每帧 = 参考速度 3 + 参考角速度 3 + 参考重力 3 + 参考关节 ' + N_JOINTS + ' = ' + CMD_DIM + ' 维', 'demo-x-mut', 9.5));
    dep.appendChild(svgText(56, 292, '高度扫描：躯干居中 ' + SCAN_X + ' m × ' + SCAN_Y + ' m、分辨率 ' + SCAN_RES + ' m → ' + GRID_NX + ' × ' + GRID_NY + ' = ' + GRID_CELLS + ' 格', 'demo-x-mut', 9.5));
    s.appendChild(dep);

    var cross = svgEl('g', {});
    cross.appendChild(paint(svgEl('line', { x1: 48, y1: 90, x2: 200, y2: 158, 'stroke-width': 2.5 }), null, C_BAD));
    cross.appendChild(paint(svgText(124, 182, '部署时不查询', null, 9.5, 'middle'), C_BAD));
    s.appendChild(cross);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 340, '特权量（真值身体位姿、全局锚点、基座线速度）只给教师 / critic / 辅助损失', null, 12, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 364, '学生 actor 读的是两个估计头（基座速度、锚点位置）的输出，且梯度截断', 'demo-x-mut', 10.5, 'middle'));
    foot.appendChild(svgText(400, 386, '仿真 50 Hz 控制、一回合 750 步（15 s），每 GPU 6144 个环境 × 48 张 A800', 'demo-x-mono', 9.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      setOpacity(eq, seg(t, 0.3, 1.0));
      boxes.forEach(function (b, k) {
        setOpacity(b, seg(t, 1.2 + k * 0.9, 1.8 + k * 0.9));
      });
      setOpacity(cross, seg(t, 5.2, 5.8));
      setOpacity(dep, seg(t, 6.4, 7.1));
      setOpacity(foot, seg(t, 10.0, 10.7));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 3 幕：TCRS 摆动：接触、中足、MPPI ──────────────────────────
  var SW = { x0: 70, x1: 400, z0: 300, pxm: 620 };
  function swX(p) {
    return SW.x0 + p * (SW.x1 - SW.x0);
  }
  function swY(z) {
    return SW.z0 - z * SW.pxm;
  }

  function buildSceneSwing() {
    var s = sceneSvg(
      'TCRS 先用脚高与脚速判定支撑相，支撑脚贴到地形上；摆动腿在中足坐标系里用 MPPI 采样优化，代价是贴参考、平滑、地形净空与边缘罚项，按软最小值加权更新'
    );
    s.appendChild(svgText(56, 26, 'TCRS ①：摆动腿在中足坐标系里用 MPPI 重规划', 'demo-x-ink2', 13.5));
    var eq = svgMath(400, 56, 'Y \\leftarrow Y + \\textstyle\\sum_j w_j\\,\\epsilon^{(j)}, \\quad w_j \\propto \\exp\\!\\left(-J_s(Y+\\epsilon^{(j)})/\\eta\\right)', {
      size: 14,
      w: 560,
      anchor: 'middle'
    });
    eq.setTone('var(--demo-accent)');
    s.appendChild(eq);

    var pane = svgEl('g', {});
    box(pane, 40, 80, 380, 250, C_SURFACE, C_BORDER, 1.2);
    /* 地形：前半平地，后半 15 cm 台阶 */
    var tp = [[swX(0) - 20, swY(0)], [swX(0.42), swY(0)], [swX(0.42), swY(STEP_H)], [swX(1) + 20, swY(STEP_H)], [swX(1) + 20, swY(0) + 20], [swX(0) - 20, swY(0) + 20]];
    pane.appendChild(paint(svgEl('path', { d: polyPath(tp) + ' Z', 'stroke-width': 1.2 }), C_SURFACE2, C_BORDER));
    /* 净空包络：floor = 地形 + 2h·sin²(πφ) */
    var fl = [];
    for (var i = 0; i <= 40; i++) {
      var p = i / 40;
      var terr = p < 0.42 ? 0 : STEP_H;
      var sn = Math.sin(Math.PI * p);
      fl.push([swX(p), swY(terr + 2 * H_CLEAR * sn * sn)]);
    }
    var floorPath = paint(svgEl('path', { d: polyPath(fl), fill: 'none', 'stroke-width': 1.4, 'stroke-dasharray': '3 3' }), null, C_WARN);
    pane.appendChild(floorPath);
    pane.appendChild(paint(svgText(swX(0.74), swY(0.05), '虚线：净空下限（中摆 +' + fmt(2 * H_CLEAR * 100, 0) + ' cm）', null, 8.5, 'middle'), C_WARN));
    s.appendChild(pane);

    function traj(z, color, w, dash) {
      var pts = PHI.map(function (p, k) {
        return [swX(p), swY(z[k])];
      });
      var g = svgEl('g', {});
      var path = paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': w }), null, color);
      if (dash) path.setAttribute('stroke-dasharray', dash);
      g.appendChild(path);
      pts.forEach(function (q) {
        g.appendChild(paint(svgEl('circle', { cx: q[0], cy: q[1], r: 3 }), color));
      });
      pane.appendChild(g);
      return g;
    }
    var gA = traj(CANDS[0].z, C_BAD, 2, '5 4');
    var gB = traj(CANDS[1].z, C_GOOD, 1.6);
    var gC = traj(CANDS[2].z, C_MUTED, 1.6);
    var gOut = traj(Z_T01, C_ACCENT, 3);
    var penMark = svgEl('g', {});
    penMark.appendChild(paint(svgEl('line', { x1: swX(0.5), y1: swY(REF[2]), x2: swX(0.5), y2: swY(FLOOR[2]), 'stroke-width': 2.5 }), null, C_BAD));
    penMark.appendChild(paint(svgText(swX(0.5) + 8, swY(0.19), '缺 ' + fmt(REF_PEN_MID * 100, 1) + ' cm', null, 9), C_BAD));
    pane.appendChild(penMark);
    var contact = svgEl('g', {});
    contact.appendChild(svgText(56, 322, '支撑判定：脚高 < ' + CONTACT_Z + ' m 且脚速 < ' + CONTACT_V + ' m/s；支撑脚贴到台面', 'demo-x-mut', 8.5));
    pane.appendChild(contact);

    var tab = svgEl('g', {});
    box(tab, 440, 80, 320, 250, C_SURFACE, C_BORDER, 1.2);
    tab.appendChild(svgText(456, 100, '三条候选（5 个密集点，示意）', 'demo-x-ink2', 10));
    var cols = [456, 506, 560, 614, 668, 718];
    ['', '跟踪', '地形', '平滑', '总代价', '$\\eta = 0.1$'].forEach(function (h, k) {
      tab.appendChild(svgRich(cols[k], 122, h, { size: 9, cls: 'demo-x-mut' }));
    });
    CANDS.forEach(function (c, k) {
      var y = 144 + k * 22;
      var col = k === 0 ? C_BAD : k === 1 ? C_GOOD : C_MUTED;
      tab.appendChild(paint(svgText(cols[0], y, c.id + ' ' + c.t, null, 9), col));
      tab.appendChild(svgText(cols[1] + 12, y, fmt(c.cost.track, 3), 'demo-x-mono', 9));
      tab.appendChild(svgText(cols[2] + 12, y, fmt(c.cost.terr, 3), 'demo-x-mono', 9));
      tab.appendChild(svgText(cols[3] + 12, y, fmt(c.cost.smooth, 3), 'demo-x-mono', 9));
      tab.appendChild(svgText(cols[4] + 12, y, fmt(c.cost.total, 3), 'demo-x-mono', 9));
      tab.appendChild(paint(svgText(cols[5] + 6, y, fmt(W_T01[k], 3), null, 9), col));
    });
    tab.appendChild(svgRich(456, 222, '权重 $w_{\\mathrm{track}} / w_{\\mathrm{terrain}} / w_{\\mathrm{smooth}} = ' + W_TRACK + ' / ' + W_TERRAIN + ' / ' + W_SMOOTH + '$', { size: 8.5 }));
    tab.appendChild(svgRich(456, 242, '温度 $\\eta = ' + MPPI_TEMP + '$：几乎就是取最小值', { size: 9, cls: 'demo-x-mut' }));
    tab.appendChild(svgRich(456, 258, '若 $\\eta = 1$：权重 ' + W_T1.map(function (w) { return fmt(w, 3); }).join(' / ') + '，中点 ' + fmt(Z_T1[2], 3) + ' m', { size: 8.5, cls: 'demo-x-mono' }));
    tab.appendChild(svgText(456, 282, '开源默认：' + MPPI_SAMPLES + ' 个样本 × ' + MPPI_ITERS + ' 次迭代、' + MPPI_KNOTS + ' 个控制点', 'demo-x-mut', 9));
    tab.appendChild(svgText(456, 300, '三次样条（clamped）连成轨迹，起落点固定', 'demo-x-mut', 9));
    tab.appendChild(svgText(456, 318, '在中足点（脚尖与脚跟的中点）上规划', 'demo-x-mut', 9));
    s.appendChild(tab);

    var foot = paint(svgText(400, 364, '中足点 = (脚尖 + 脚跟) / 2：同时照顾脚尖撞台阶边和脚跟刮台阶沿', null, 12, 'middle'), C_ACCENT);
    s.appendChild(foot);
    var foot2 = svgText(400, 388, '保留原始的起落时刻与步相：TCRS 是「局部修参考」，不是重新规划落脚点', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(foot2);

    function draw(t) {
      setOpacity(eq, seg(t, 0.3, 1.0));
      setOpacity(pane, seg(t, 0.8, 1.4));
      setOpacity(contact, seg(t, 1.4, 2.0));
      setOpacity(gA, seg(t, 2.4, 3.0));
      setOpacity(floorPath, seg(t, 3.4, 4.0));
      setOpacity(penMark, seg(t, 4.2, 4.8));
      setOpacity(gB, seg(t, 5.6, 6.2));
      setOpacity(gC, seg(t, 5.6, 6.2));
      setOpacity(tab, seg(t, 6.4, 7.1));
      setOpacity(gOut, seg(t, 9.0, 9.7));
      setOpacity(foot, seg(t, 11.0, 11.6));
      setOpacity(foot2, seg(t, 12.0, 12.6));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 4 幕：TCRS 身体：根高度、碰撞修复、多点 IK ──────────────────
  function buildSceneBody() {
    var s = sceneSvg(
      '摆腿重规划之后，按支撑脚所在的地形高度重建骨盆高度并限速平滑，再修小腿与脚的碰撞，最后只解 12 个腿关节的多点雅可比 IK，根朝向和上半身原样保留'
    );
    s.appendChild(svgText(56, 26, 'TCRS ②：脚先定好，再把身体「抬」上去', 'demo-x-ink2', 13.5));
    var eq = svgMath(400, 58, 'z^\\star_{\\mathrm{root}} = \\textstyle\\sum_f w_f\\left[h_\\tau(x^{\\mathrm{tcrs}}_f) + z^{\\mathrm{raw}}_{\\mathrm{root}} - z^{\\mathrm{raw}}_f\\right] \\big/ \\sum_f w_f', {
      size: 14,
      w: 620,
      anchor: 'middle'
    });
    eq.setTone('var(--demo-accent)');
    s.appendChild(eq);

    var rt = svgEl('g', {});
    box(rt, 40, 88, 350, 230, C_SURFACE, C_BORDER, 1.2);
    rt.appendChild(svgText(56, 108, '左脚踩 15 cm 台阶、右脚在地面（示意）', 'demo-x-ink2', 10));
    var rows = [
      ['原始骨盆高度', fmt(Z_ROOT_RAW, 3) + ' m'],
      ['支撑权重 0.5 / 0.5', fmt(ROOT_HALF, 3) + ' m'],
      ['支撑权重 0.8 / 0.2', fmt(ROOT_LEFT, 3) + ' m']
    ];
    rows.forEach(function (r, k) {
      rt.appendChild(svgText(56, 132 + k * 20, r[0], 'demo-x-mut', 9.5));
      rt.appendChild(svgText(260, 132 + k * 20, r[1], 'demo-x-mono', 9.5));
    });
    rt.appendChild(svgRich(56, 206, '规划器里的平滑：上升 $\\alpha = ' + ALPHA_UP + '$、下降 ' + ALPHA_DOWN + '，每帧最多 ' + MAX_DZ + ' m', { size: 9, cls: 'demo-x-mut' }));
    var bars = EMA.map(function (z, k) {
      var h = (z - 0.7) * 800;
      var r = paint(svgEl('rect', { x: 70 + k * 56, y: 300 - h, width: 34, height: h, rx: 2 }), k < 2 ? C_WARN : C_ACCENT);
      rt.appendChild(r);
      rt.appendChild(svgText(87 + k * 56, 296 - h, fmt(z, 4), 'demo-x-mono', 8.5, 'middle'));
      return r;
    });
    rt.appendChild(paint(svgEl('line', { x1: 60, y1: 300 - (ROOT_HALF - 0.7) * 800, x2: 360, y2: 300 - (ROOT_HALF - 0.7) * 800, 'stroke-dasharray': '4 3' }), null, C_GOOD));
    rt.appendChild(paint(svgText(62, 296 - (ROOT_HALF - 0.7) * 800, '目标 ' + fmt(ROOT_HALF, 3), null, 8.5), C_GOOD));
    s.appendChild(rt);

    var ik = svgEl('g', {});
    box(ik, 410, 88, 350, 230, C_SURFACE, C_BORDER, 1.2);
    ik.appendChild(svgText(426, 108, '碰撞修复 → 多点雅可比 IK（式 12）', 'demo-x-ink2', 10));
    ik.appendChild(svgText(426, 132, '• 小腿 / 脚当胶囊体，往外推开、留出安全裕量', 'demo-x-mut', 9));
    ik.appendChild(svgText(426, 150, '• 台阶边上没踩实的脚尖 / 脚跟：降权或放弃', 'demo-x-mut', 9));
    ik.appendChild(svgText(426, 176, '只解腿：' + LEG_JOINTS + ' 个关节', null, 10.5));
    ik.appendChild(
      svgText(426, 196, '残差：踝 / 脚尖 / 脚跟 × 两脚 × 3 维 = ' + IK_ROWS + ' 行', 'demo-x-mono', 9)
    );
    ik.appendChild(svgText(426, 214, '+ 贴原始姿态、贴上一帧、穿透罚项、阻尼项', 'demo-x-mut', 9));
    ik.appendChild(svgText(426, 238, '根平移：取上一步重建的高度，IK 时固定', 'demo-x-mut', 9));
    ik.appendChild(paint(svgText(426, 258, '根朝向 + 其余 ' + KEPT_JOINTS + ' 个关节：原样照抄参考', null, 10), C_GOOD));
    ik.appendChild(svgText(426, 280, '误差大或关节跳变 → 换种子重解（多种子兜底）', 'demo-x-mut', 9));
    ik.appendChild(svgRich(426, 302, '→ 成对数据 $(q^{\\mathrm{raw}}, q^{\\mathrm{tcrs}}, \\tau)$', { size: 9.5 }));
    s.appendChild(ik);

    var foot = paint(svgText(400, 352, '限速 ' + MAX_DZ + ' m/帧 × ' + MOTION_FPS + ' fps = ' + fmt(MAX_VZ, 2) + ' m/s：骨盆不会因为台阶一下子「弹」上去', null, 12, 'middle'), C_ACCENT);
    s.appendChild(foot);
    var foot2 = svgText(400, 376, '风格留在上半身，地形适配只落在下半身接触上 —— 这也是它的局限：手臂不会躲障碍', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(foot2);

    function draw(t) {
      setOpacity(eq, seg(t, 0.3, 1.0));
      setOpacity(rt, seg(t, 1.2, 1.9));
      bars.forEach(function (b, k) {
        setOpacity(b, seg(t, 4.2 + k * 0.5, 4.6 + k * 0.5));
      });
      setOpacity(ik, seg(t, 7.0, 7.7));
      setOpacity(foot, seg(t, 9.6, 10.2));
      setOpacity(foot2, seg(t, 10.8, 11.4));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 5 幕：目标系动作对齐 ─────────────────────────────────────────
  var AX = { x: 150, y0: 447, pxr: 500 }; // 关节角轴：0 rad 在 y0（画面外），1 rad = 500 px
  function axY(q) {
    return AX.y0 - q * AX.pxr;
  }

  function buildSceneAlign() {
    var s = sceneSvg(
      '教师的动作是围绕地形适配参考的残差，学生的动作是围绕原始参考的残差；蒸馏时把教师真正的 PD 目标换算到学生的原始参考系下再模仿'
    );
    s.appendChild(svgText(56, 26, '同一个 PD 目标，两套坐标系：先换算再模仿', 'demo-x-ink2', 13.5));
    var eq = svgMath(400, 58, 'a^\\star_t = \\bigl(q^{\\mathrm{tcrs}}_t + \\mu^{\\mathrm{tea}}_t\\bigr) - q^{\\mathrm{raw}}_t, \\qquad \\mathcal{L} = \\lVert \\mu^{\\mathrm{stu}}_t - a^\\star_t \\rVert_2^2', {
      size: 14,
      w: 600,
      anchor: 'middle'
    });
    eq.setTone('var(--demo-accent)');
    s.appendChild(eq);

    var axis = svgEl('g', {});
    box(axis, 40, 84, 330, 250, C_SURFACE, C_BORDER, 1.2);
    axis.appendChild(svgText(56, 326, '左膝角（rad，示意）', 'demo-x-ink2', 10));
    axis.appendChild(paint(svgEl('line', { x1: AX.x, y1: axY(0.27), x2: AX.x, y2: axY(0.71), 'stroke-width': 2 }), null, C_BORDER));
    [0.3, 0.4, 0.5, 0.6, 0.7].forEach(function (q) {
      axis.appendChild(paint(svgEl('line', { x1: AX.x - 4, y1: axY(q), x2: AX.x + 4, y2: axY(q) }), null, C_BORDER));
      axis.appendChild(svgText(AX.x - 8, axY(q) + 3, fmt(q, 1), 'demo-x-mono', 8.5, 'end'));
    });
    s.appendChild(axis);
    function mark(q, color, label, dx) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('circle', { cx: AX.x, cy: axY(q), r: 5 }), color));
      g.appendChild(svgRich(AX.x + (dx || 14), axY(q) + 4, label, { size: 9.5 }).setTone(color));
      s.appendChild(g);
      return g;
    }
    var mRaw = mark(Q_RAW, C_MUTED, '$q^{\\mathrm{raw}} = ' + fmt(Q_RAW, 2) + '$（学生的命令）');
    var mTc = mark(Q_TCRS, C_WARN, '$q^{\\mathrm{tcrs}} = ' + fmt(Q_TCRS, 2) + '$（教师的命令）');
    var mTea = mark(Q_TCRS + MU_TEA, C_GOOD, '教师 PD 目标 ' + fmt(Q_TCRS + MU_TEA, 2));
    var mBad = mark(NAIVE_TARGET, C_BAD, '直接抄 $\\mu^{\\mathrm{tea}}$ → ' + fmt(NAIVE_TARGET, 2));
    var brace = svgEl('g', {});
    brace.appendChild(paint(svgEl('line', { x1: AX.x - 30, y1: axY(Q_RAW), x2: AX.x - 30, y2: axY(Q_TCRS + MU_TEA), 'stroke-width': 3 }), null, C_ACCENT));
    brace.appendChild(svgMath(AX.x - 36, axY((Q_RAW + Q_TCRS + MU_TEA) / 2), 'a^\\star = ' + fmt(A_STAR, 2), { size: 10, w: 90, anchor: 'end' }).setTone(C_ACCENT));
    s.appendChild(brace);

    var right = svgEl('g', {});
    box(right, 390, 84, 370, 250, C_SURFACE, C_BORDER, 1.2);
    right.appendChild(svgText(406, 106, '换算', 'demo-x-ink2', 10.5));
    right.appendChild(svgText(406, 128, '教师 PD 目标 = ' + fmt(Q_TCRS, 2) + ' + ' + fmt(MU_TEA, 2) + ' = ' + fmt(Q_TCRS + MU_TEA, 2) + ' rad', 'demo-x-mono', 9.5));
    right.appendChild(svgRich(406, 148, '对齐标签 $a^\\star$ = ' + fmt(Q_TCRS + MU_TEA, 2) + ' − ' + fmt(Q_RAW, 2) + ' = ' + fmt(A_STAR, 2) + ' rad', { size: 9.5, cls: 'demo-x-mono' }));
    right.appendChild(paint(svgText(406, 170, '不对齐：学生学到 ' + fmt(MU_TEA, 2) + '，PD 目标 ' + fmt(NAIVE_TARGET, 2) + '，差 ' + fmt(NAIVE_ERR, 2) + ' rad', null, 9.5), C_BAD));
    right.appendChild(svgText(406, 198, '开源代码（_teacher_alignment.py）：', 'demo-x-mut', 9));
    right.appendChild(svgText(406, 216, 'aligned = teacher_actions', 'demo-x-mono', 9));
    right.appendChild(svgText(406, 232, '        + (q_ref_teacher − q_ref_student)', 'demo-x-mono', 9));
    right.appendChild(svgText(406, 250, 'q_ref 取命令窗口中间那一帧的后 ' + N_JOINTS + ' 维', 'demo-x-mut', 9));
    right.appendChild(svgText(406, 274, 'DAgger 式混合 rollout：教师接管概率 1 → 0', 'demo-x-mut', 9));
    right.appendChild(svgText(406, 292, '教师接管时执行的也是对齐后的动作', 'demo-x-mut', 9));
    right.appendChild(svgText(406, 316, '同样的残差上限与裁剪作用在标签上', 'demo-x-mut', 9));
    s.appendChild(right);

    var foot = paint(svgText(400, 366, 'Table II：去掉目标系对齐，成功率 55.1% → 26.7%，关节误差 1.243 → 1.959 rad', null, 12, 'middle'), C_ACCENT);
    s.appendChild(foot);
    var foot2 = svgText(400, 390, '教师学「跟地形适配后的命令」，学生必须在「用户原始命令」附近表达同一个修正', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(foot2);

    function draw(t) {
      setOpacity(eq, seg(t, 0.3, 1.0));
      setOpacity(axis, seg(t, 1.0, 1.6));
      setOpacity(mRaw, seg(t, 1.6, 2.2));
      setOpacity(mTc, seg(t, 2.6, 3.2));
      setOpacity(mTea, seg(t, 3.6, 4.2));
      setOpacity(brace, seg(t, 5.0, 5.6));
      setOpacity(right, seg(t, 5.4, 6.0));
      setOpacity(mBad, seg(t, 6.8, 7.4));
      setOpacity(foot, seg(t, 10.0, 10.6));
      setOpacity(foot2, seg(t, 11.0, 11.6));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 6 幕：恒等门控的地形残差 ─────────────────────────────────────
  function buildSceneGate() {
    var s = sceneSvg(
      '学生沿用教师的命令与历史 Transformer，地形特征只从两条门控残差进入：意图潜变量加上 tanh(α) 乘地形修正，动作均值加上 tanh(α) 乘残差；α 从零开始，初始化时策略就是纯原始参考跟踪器'
    );
    s.appendChild(svgText(56, 26, '恒等门控：一开始看不见地形，需要时才慢慢睁眼', 'demo-x-ink2', 13.5));

    var arrow = K.arrowMarker(s, 'pbfm-x-arrow-gate', C_BORDER);
    var net = svgEl('g', {});
    var nodes = [
      { x: 40, y: 58, w: 150, t: '命令窗口 + 本体历史', d: '21 × 38 / 10 步' },
      { x: 220, y: 58, w: 150, t: 'Transformer 骨干', d: '交叉注意力编码' },
      { x: 40, y: 150, w: 150, t: '高度图 17 × 11 + 掩码', d: '机器人中心' },
      { x: 220, y: 150, w: 150, t: 'Map CNN → MapTransformer', d: 'query = 本体 + $u_t$' },
      { x: 420, y: 58, w: 150, t: '意图门', d: "$u' = u + \\tanh(\\alpha_u)\\,\\Delta u$" },
      { x: 420, y: 150, w: 150, t: '动作残差门', d: '$\\mu = \\mu^{\\mathrm{base}} + \\tanh(\\alpha_a)\\, r$' },
      { x: 610, y: 104, w: 150, t: '关节残差动作', d: '$q^{\\mathrm{pd}} = q^{\\mathrm{raw}} + a$' }
    ];
    nodes.forEach(function (n, k) {
      box(net, n.x, n.y, n.w, 50, k >= 4 && k <= 5 ? C_SURFACE2 : C_SURFACE, k >= 4 && k <= 5 ? C_ACCENT : C_BORDER, 1.2);
      net.appendChild(svgText(n.x + n.w / 2, n.y + 21, n.t, null, 9.5, 'middle'));
      net.appendChild(svgRich(n.x + n.w / 2, n.y + 39, n.d, { size: 8.5, cls: 'demo-x-mono', anchor: 'middle' }));
    });
    arrowLine(net, [192, 83], [218, 83], arrow, C_BORDER);
    arrowLine(net, [192, 175], [218, 175], arrow, C_BORDER);
    arrowLine(net, [372, 83], [418, 83], arrow, C_BORDER);
    arrowLine(net, [372, 170], [418, 97], arrow, C_BORDER, 1.3, '4 3');
    arrowLine(net, [372, 180], [418, 180], arrow, C_BORDER);
    arrowLine(net, [572, 83], [608, 120], arrow, C_BORDER);
    arrowLine(net, [572, 175], [608, 140], arrow, C_BORDER);
    s.appendChild(net);

    var gate = svgEl('g', {});
    box(gate, 40, 222, 350, 110, C_SURFACE, C_ACCENT, 1.2);
    gate.appendChild(svgRich(56, 244, '$\\alpha$ 从 0 开始：$\\tanh(0) = 0$ → 输出与盲跟踪器完全一样', { size: 10 }).setTone(C_ACCENT));
    var cols = [56, 136, 216, 296];
    ALPHAS.forEach(function (a, k) {
      gate.appendChild(svgMath(cols[k], 270, '\\alpha = ' + a, { size: 9, w: 76, cls: 'demo-x-mut' }));
      gate.appendChild(svgMath(cols[k], 290, '\\tanh\\alpha = ' + fmt(Math.tanh(a), 3), { size: 9, w: 76 }));
      gate.appendChild(svgMath(cols[k], 310, "\\tanh'\\alpha = " + fmt(1 - Math.tanh(a) * Math.tanh(a), 3), { size: 9, w: 76 }));
    });
    s.appendChild(gate);

    var dead = svgEl('g', {});
    box(dead, 410, 222, 350, 110, C_SURFACE2, C_WARN, 1.2);
    dead.appendChild(paint(svgText(426, 244, '论文 vs 开源代码的一处差别', null, 10), C_WARN));
    dead.appendChild(svgText(426, 264, '论文：门向量与残差末层都零初始化', 'demo-x-mut', 9));
    dead.appendChild(svgText(426, 282, '代码：有门时残差支路保持随机初始化', 'demo-x-mut', 9));
    dead.appendChild(svgRich(426, 300, '否则 $\\partial\\mathcal{L}/\\partial\\alpha \\propto \\Delta u = 0$、$\\partial\\mathcal{L}/\\partial\\Delta u \\propto \\tanh\\alpha = 0$', { size: 8.5 }));
    dead.appendChild(svgText(426, 318, '→ 梯度互锁，门永远打不开（注释引 ReZero）', 'demo-x-mut', 9));
    s.appendChild(dead);

    var foot = paint(svgText(400, 364, 'Table II：去掉门控 30.4%、视觉直接拼接 29.9%，完整 PMT 55.1%', null, 12, 'middle'), C_ACCENT);
    s.appendChild(foot);
    var foot2 = svgText(400, 388, '微调时迁移来的骨干学习率打 0.3 折，地形编码器、critic 与残差支路全速学', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(foot2);

    function draw(t) {
      setOpacity(net, seg(t, 0.3, 1.2));
      setOpacity(gate, seg(t, 3.8, 4.5));
      setOpacity(dead, seg(t, 7.0, 7.7));
      setOpacity(foot, seg(t, 10.0, 10.6));
      setOpacity(foot2, seg(t, 11.0, 11.6));
    }
    return { el: s, draw: draw };
  }

  // ─── 第 7 幕：定量证据 ─────────────────────────────────────────────
  function buildSceneEvidence() {
    var s = sceneSvg(
      'TCRS 参考的穿透深度比 Z 偏移低 56.6%；监督来源从原始参考换成 TCRS，日志成功率从 27.3% 到 55.1%；跨五类地形的固定策略评估中完成率 248 比 123、小腿碰撞 45 比 111'
    );
    s.appendChild(svgText(56, 26, '三层证据：参考本身、训练日志、跨地形回放', 'demo-x-ink2', 13.5));

    var g1 = svgEl('g', {});
    box(g1, 40, 44, 350, 124, C_SURFACE, C_BORDER, 1.2);
    g1.appendChild(svgText(56, 64, 'Table I · 参考质量（30 段，越低越好）', 'demo-x-ink2', 9.5));
    g1.appendChild(svgText(56, 82, '穿透深度 cm', 'demo-x-mut', 9));
    hbar(g1, 56, 88, 'Z 偏移', T1.zoff.pen, 6, 150, C_MUTED, fmt(T1.zoff.pen, 2), 80);
    hbar(g1, 56, 104, '三次插值+IK', T1.cubic.pen, 6, 150, C_MUTED, fmt(T1.cubic.pen, 2), 80);
    hbar(g1, 56, 120, 'TCRS', T1.tcrs.pen, 6, 150, C_ACCENT, fmt(T1.tcrs.pen, 2) + '（−' + fmt(PEN_DROP, 1) + '%）', 80);
    g1.appendChild(svgText(56, 150, '净空违例 %：' + T1.zoff.clr + ' / ' + T1.cubic.clr + ' / ' + T1.tcrs.clr + '（比三次插值 −' + fmt(CLR_DROP, 1) + '%）', 'demo-x-mono', 8.5));
    g1.appendChild(svgText(56, 162, '代价：浮空率 32.3% 最高，平滑度输给三次插值', 'demo-x-mut', 8.5));
    s.appendChild(g1);

    var g2 = svgEl('g', {});
    box(g2, 40, 178, 350, 122, C_SURFACE, C_BORDER, 1.2);
    g2.appendChild(svgText(56, 198, 'Table III · 教师监督来源 → 日志成功率 %', 'demo-x-ink2', 9.5));
    T3.forEach(function (r, k) {
      hbar(g2, 56, 208 + k * 20, r.t, r.v, 60, 170, k === 3 ? C_ACCENT : C_MUTED, fmt(r.v, 1), 90);
    });
    s.appendChild(g2);

    var g3 = svgEl('g', {});
    box(g3, 410, 44, 350, 256, C_SURFACE, C_BORDER, 1.2);
    g3.appendChild(svgText(426, 64, 'Table IV · 完成率 %（每类 30 命令 × 3 种子）', 'demo-x-ink2', 9.5));
    g3.appendChild(paint(svgText(426, 80, '■ PMT', null, 9), C_ACCENT));
    g3.appendChild(paint(svgText(478, 80, '■ 去掉 TCRS（原始参考）', null, 9), C_MUTED));
    T4.forEach(function (r, k) {
      var y = 92 + k * 34;
      g3.appendChild(svgText(426, y + 12, r.t, 'demo-x-ink2', 9.5));
      g3.appendChild(paint(svgEl('rect', { x: 490, y: y, width: (r.pmt[0] / 70) * 200, height: 10, rx: 2 }), C_ACCENT));
      g3.appendChild(paint(svgEl('rect', { x: 490, y: y + 13, width: (r.raw[0] / 70) * 200, height: 10, rx: 2 }), C_MUTED));
      g3.appendChild(svgText(494 + (r.pmt[0] / 70) * 200, y + 9, fmt(r.pmt[0], 1) + '（' + count(r.pmt[0]) + '/' + SLOTS + '）', 'demo-x-mono', 8.5));
      g3.appendChild(svgText(494 + (r.raw[0] / 70) * 200, y + 22, fmt(r.raw[0], 1), 'demo-x-mono', 8.5));
    });
    g3.appendChild(svgText(426, 270, '合计完成 ' + PMT_COMP + ' / ' + N_ROLL + ' vs ' + RAW_COMP + ' / ' + N_ROLL, 'demo-x-mono', 9.5));
    g3.appendChild(svgText(426, 288, '小腿碰撞 ' + PMT_COLL + ' / ' + N_ROLL + ' vs ' + RAW_COLL + ' / ' + N_ROLL, 'demo-x-mono', 9.5));
    s.appendChild(g3);

    var cav = svgEl('g', {});
    box(cav, 40, 310, 720, 64, C_SURFACE2, C_WARN, 1.2);
    cav.appendChild(paint(svgText(56, 330, '论文自己划的边界', null, 10), C_WARN));
    cav.appendChild(svgText(56, 350, 'Table II / III 是训练末 100 次迭代的 TensorBoard 计数，没有种子方差、没有独立留出集；真机只有定性展示', 'demo-x-mut', 9));
    cav.appendChild(svgText(56, 364, 'Table IV 的「All」行与 Table II 的 55.1 / 27.3 完全相同，论文说两者是不同协议', 'demo-x-mut', 9));
    s.appendChild(cav);

    var foot = paint(svgText(400, 400, 'Perceptive BFM = TCRS 离线造监督 + 目标系对齐 + 恒等门控残差，命令接口不变', null, 12, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(g1, seg(t, 0.4, 1.1));
      setOpacity(g2, seg(t, 3.6, 4.3));
      setOpacity(g3, seg(t, 6.4, 7.1));
      setOpacity(cav, seg(t, 10.0, 10.7));
      setOpacity(foot, seg(t, 12.2, 12.8));
    }
    return { el: s, draw: draw };
  }

  var PBFM_SCENES = [
    {
      title: '操作者与环境错配',
      dur: 12,
      build: buildSceneMismatch,
      cues: [
        { at: 0.4, s: '动捕操作者在平地上做动作；机器人却站在一片随机摆放的台阶前。' },
        { at: 2.6, s: '把参考原样照搬：脚会穿进台阶 —— 参考根本不知道机器人那边的地形。' },
        { at: 5.0, s: '参考只给**意图与风格**；落脚点、摆腿净空、身体高度、接触时机都得机器人自己定。' },
        { at: 7.4, s: '论文把这叫 operator–environment mismatch：示教者、操作者、机器人不在同一个环境里。' },
        { at: 9.4, s: '契约：**原始参考 = 部署命令**，感知只补局部实现 $\\Rightarrow$ 命令接口一个字都不改。' }
      ]
    },
    {
      title: 'PMT 四阶段：TCRS 只教不用',
      dur: 13,
      build: buildScenePipeline,
      cues: [
        { at: 0.4, s: '动作是围绕命令的残差：$q^{\\mathrm{pd}}_t = q^{\\mathrm{cmd}}_t + a_t$，教师的命令是 $q^{\\mathrm{tcrs}}$，学生的是 $q^{\\mathrm{raw}}$。' },
        { at: 1.4, s: '① TCRS 离线把平地片段 + 采样的高度场变成地形适配参考。' },
        { at: 2.4, s: '② 盲教师（Transformer，无感知）用 PPO 跟踪 TCRS 参考；③ 视觉学生只收原始参考 + 高度图做蒸馏。' },
        { at: 4.2, s: '④ 再用 PPO 在原始参考命令下微调。' },
        { at: 5.4, s: '**TCRS 在部署时从不被调用** —— 它只是训练期的「老师的老师」。' },
        { at: 7.0, s: '学生输入：本体 ' + PROPRIO_DIM + ' 维、' + HIST + ' 步历史、' + CMD_WIN + ' × ' + CMD_DIM + ' 命令窗口、' + CMD_WIN + ' × 3 锚点窗口、' + GRID_NX + ' × ' + GRID_NY + ' 高度图。' },
        { at: 10.2, s: '特权量只进教师 / critic / 辅助损失；学生读的是两个估计头的输出。' }
      ]
    },
    {
      title: 'TCRS ①：接触、中足与 MPPI 摆腿',
      dur: 14,
      build: buildSceneSwing,
      cues: [
        { at: 0.4, s: 'MPPI 更新：$Y \\leftarrow Y + \\sum_j w_j\\,\\epsilon^{(j)}$，$w_j \\propto e^{-J_s/\\eta}$。' },
        { at: 1.4, s: '先判支撑：脚高 < ' + CONTACT_Z + ' m 且脚速 < ' + CONTACT_V + ' m/s；支撑脚贴到地形表面，起落时刻沿用原始片段。' },
        { at: 3.0, s: '原始摆腿从平地迈上 15 cm 台阶：在台阶边缘比净空下限低 **' + fmt(REF_PEN_MID * 100, 1) + ' cm**。' },
        { at: 5.0, s: '代价 $J_s$ = 贴原始摆腿 + 平滑 + 地形净空（$[h_\\tau+\\delta-z]_+^2$）+ 竖直面边缘罚项 + 起落点固定。' },
        { at: 7.0, s: '算例：A / B / C 总代价 ' + CANDS.map(function (c) { return fmt(c.cost.total, 3); }).join(' / ') + '，$\\eta = ' + MPPI_TEMP + '$ 时权重 ' + W_T01.map(function (w) { return fmt(w, 3); }).join(' / ') + '。' },
        { at: 9.2, s: '温度越小越贪心：这里几乎直接取 B；$\\eta = 1$ 时才会把 C 混进来 ' + fmt(W_T1[2] * 100, 0) + '%。' },
        { at: 11.0, s: '规划的是**中足点**（脚尖与脚跟的中点），脚尖撞沿、脚跟刮沿两头都照顾到。' }
      ]
    },
    {
      title: 'TCRS ②：根高度、碰撞修复与多点 IK',
      dur: 12,
      build: buildSceneBody,
      cues: [
        { at: 0.4, s: '根高度按支撑脚重建：$z^\\star = \\sum_f w_f[h_\\tau + z^{\\mathrm{raw}}_{\\mathrm{root}} - z^{\\mathrm{raw}}_f] / \\sum_f w_f$。' },
        { at: 2.0, s: '算例：原始骨盆 ' + fmt(Z_ROOT_RAW, 2) + ' m，左脚踩 15 cm 台阶；权重 0.5 / 0.5 → **' + fmt(ROOT_HALF, 3) + ' m**，0.8 / 0.2 → ' + fmt(ROOT_LEFT, 2) + ' m。' },
        { at: 4.2, s: '再做非对称 EMA + 限速：' + EMA.slice(0, 4).map(function (z) { return fmt(z, 3); }).join(' → ') + '，每帧最多 ' + MAX_DZ + ' m。' },
        { at: 6.2, s: '腾空或弱接触时退回原始的竖直轨迹，只限制每帧位移。' },
        { at: 7.4, s: '修完小腿 / 脚的碰撞，只解 **' + LEG_JOINTS + ' 个腿关节**：踝、脚尖、脚跟三点 × 两脚 = ' + IK_ROWS + ' 行残差。' },
        { at: 9.4, s: '根朝向与其余 ' + KEPT_JOINTS + ' 个关节照抄原始参考 —— 风格留在上半身。' }
      ]
    },
    {
      title: '目标系动作对齐',
      dur: 13,
      build: buildSceneAlign,
      cues: [
        { at: 0.4, s: '教师与学生的动作围绕不同的命令，残差不能直接抄：$a^\\star_t = (q^{\\mathrm{tcrs}}_t + \\mu^{\\mathrm{tea}}_t) - q^{\\mathrm{raw}}_t$。' },
        { at: 1.8, s: '算例：学生的命令 $q^{\\mathrm{raw}} = ' + fmt(Q_RAW, 2) + '$，教师的命令 $q^{\\mathrm{tcrs}} = ' + fmt(Q_TCRS, 2) + '$（上台阶膝盖弯得更多）。' },
        { at: 3.6, s: '教师残差 ' + fmt(MU_TEA, 2) + '，真正的 PD 目标是 ' + fmt(Q_TCRS + MU_TEA, 2) + ' rad。' },
        { at: 5.0, s: '换到学生的系里：$a^\\star = ' + fmt(Q_TCRS + MU_TEA, 2) + ' - ' + fmt(Q_RAW, 2) + ' = ' + fmt(A_STAR, 2) + '$ rad。' },
        { at: 6.8, s: '不对齐、直接抄 ' + fmt(MU_TEA, 2) + '：PD 目标只有 ' + fmt(NAIVE_TARGET, 2) + '，差了 **' + fmt(NAIVE_ERR, 2) + ' rad**，等于在台阶上按平地弯膝。' },
        { at: 8.6, s: '混合 rollout 里教师接管概率从 1 退火到 0，接管时执行的也是对齐后的动作。' },
        { at: 10.0, s: 'Table II：去掉对齐，成功率 55.1% → **26.7%**。' }
      ]
    },
    {
      title: '恒等门控的地形残差',
      dur: 13,
      build: buildSceneGate,
      cues: [
        { at: 0.4, s: '学生沿用教师的命令 / 历史 Transformer；地形走 Map CNN → MapTransformer 得 $z^{\\mathrm{vis}}$。' },
        { at: 2.0, s: "两条门：$u'_t = u_t + \\tanh(\\alpha_u)\\odot f_u(z^{\\mathrm{vis}})$，$\\mu_t = \\mu^{\\mathrm{base}}_t + \\tanh(\\alpha_a)\\odot f_a(\\cdot)$。" },
        { at: 4.0, s: '$\\alpha$ 从 0 开始，$\\tanh(0) = 0$：初始化时学生就是**纯原始参考跟踪器**，地形只能作为「修正」慢慢长出来。' },
        { at: 5.8, s: '$\\alpha = 0.5$ 时门开到 ' + fmt(Math.tanh(0.5), 3) + '；在 0 处导数是 1，门最容易被推开。' },
        { at: 7.2, s: '开源代码的注释补了一句：有门时残差支路**不能**也置零，否则两边梯度互锁，门永远打不开。' },
        { at: 10.0, s: 'Table II：去掉门控 30.4%、视觉直接拼接 29.9%，都远低于 55.1%。' }
      ]
    },
    {
      title: '定量证据与边界',
      dur: 14,
      build: buildSceneEvidence,
      cues: [
        { at: 0.4, s: 'Table I：TCRS 参考穿透深度 ' + T1.zoff.pen + ' → ' + T1.tcrs.pen + ' cm（−' + fmt(PEN_DROP, 1) + '%），净空违例比三次插值低 ' + fmt(CLR_DROP, 1) + '%。' },
        { at: 2.4, s: '它不是全面最好：浮空率最高、平滑度输给三次插值 —— 为了不撞，宁可脚略悬空。' },
        { at: 3.8, s: 'Table III：监督来源 原始 → Z 偏移 → 三次插值 → TCRS，日志成功率 27.3 → 33.0 → 41.0 → **55.1**%。' },
        { at: 6.6, s: 'Table IV：五类地形每类 ' + SLOTS + ' 次，合计完成 ' + PMT_COMP + ' / ' + N_ROLL + ' vs ' + RAW_COMP + ' / ' + N_ROLL + '，小腿碰撞 ' + PMT_COLL + ' vs ' + RAW_COLL + '。' },
        { at: 10.2, s: '边界：日志统计无种子方差、无留出集；真机只有定性展示；手臂不会躲障碍。' },
        { at: 12.2, s: '一句话：**命令接口不变，TCRS 造监督，对齐 + 门控把地形修正装进学生**。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '七幕动画：Perceptive BFM 全流程速览',
      sub: '约 91 秒自动播放。空格播放/暂停，← → 换幕；画面里的算例数字都是现算的，与正文「具体实例」一致。',
      ariaLabel: 'Perceptive BFM 七幕讲解动画',
      notes: [
        '取数依据：观测维度与高度图取自论文 §III-A / Table VI 与开源 `stepping_stone.py`；接触阈值、MPPI 样本数 / 迭代 / 温度 / 代价权重、根高度滤波取自开源 `TCRS/stair_mppi`（规划器命令行默认值）；第七幕是论文 Table I / III / IV 原值，百分比、次数与合计现算。',
        '第三至五幕的台阶摆腿三条候选、骨盆高度 0.72 m、膝角 0.30 / 0.62 / 0.05 都是**示意算例，不是论文数据**；第三幕只用 5 个密集点、且没有加边缘罚项，开源 MPPI 用 100 个密集点。'
      ],
      scenes: PBFM_SCENES
    });
  }

  K.mount({
    'pbfm-explainer': buildExplainerDemo
  });
})();
