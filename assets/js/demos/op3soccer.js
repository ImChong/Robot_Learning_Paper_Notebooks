/* OP3 Soccer demos for
 * papers/03_High_Impact_Selection/Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["op3soccer"]`, after assets/js/demos/kit.js. The note itself only
 * holds empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   soccer-explainer — 七幕讲解动画：任务与机器人 → 阶段 1 两个技能教师 → 阶段 2 自适应蒸馏
 *                      → 自博弈的对手池 → 奖励与安全正则 → 零样本 sim-to-real → 实验读数与边界
 *   soccer-video     — 同样七幕的配音竖屏视频（可下载）
 */

(function () {
  'use strict';

  var K = window.PaperDemoKit;
  var fmt = K.fmt,
    clamp = K.clamp,
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

  // ─── shared numbers (the note's worked examples use the same ones) ──────
  var ROBOT = { height: 51, mass: 3.5, joints: 20, hz: 40 };
  var PITCH = { len: 5, wid: 4, goal: 0.8 };

  /* 第一幕：指数动作滤波 u_t = 0.8 u_{t-1} + 0.2 a_t —— 目标从 0 跳到 1 */
  var FILTER = (function () {
    var u = 0, seq = [];
    for (var k = 0; k < 12; k++) { u = 0.8 * u + 0.2 * 1; seq.push(u); }
    var n90 = seq.findIndex(function (v) { return v >= 0.9; }) + 1;
    return { seq: seq, n90: n90, ms90: n90 * 1000 / ROBOT.hz };
  })();

  /* 第二幕：起身技能的姿态奖励（正文定义），玩具误差 */
  var POSE = (function () {
    var jointErr = 0.8, gravAng = 0.3;
    var p = (Math.PI - jointErr) / Math.PI;
    var g = (Math.PI - gravAng) / Math.PI;
    return { jointErr: jointErr, gravAng: gravAng, p: p, g: g, r: p * g };
  })();

  /* 第三幕：λ 的自适应 —— 预测回报低于阈值时 λ → 1（行为克隆），高于阈值时 λ → 0（纯 RL） */
  var LAMBDA = (function () {
    var qs = 0.6, n = 120, lam = 1, lr = 0.12;
    var qs_ = [], lams = [];
    for (var i = 0; i < n; i++) {
      var q = 1 / (1 + Math.exp(-(i - 55) / 12));
      lam = clamp(lam - lr * (q - qs), 0, 1);
      qs_.push(q);
      lams.push(lam);
    }
    var cross = qs_.findIndex(function (v) { return v >= qs; });
    return { qs: qs, q: qs_, lam: lams, cross: cross, n: n };
  })();

  /* 第四幕：对手池 = 前四分之一快照 + 一个未训练的对手 */
  var POOL = (function () {
    var saved = 40, pool = Math.floor(saved / 4) + 1;
    return { saved: saved, pool: pool, p: 1 / pool };
  })();

  /* 第五幕：Table S3 完整 1v1 智能体的奖励权重；直立奖励 0.2–0.4 rad 线性过渡 */
  var REWARDS = [
    { name: '进球', w: 1000, kind: 'task' },
    { name: '失球', w: 1000, kind: 'task' },
    { name: '朝球速度', w: 0.05, kind: 'shape' },
    { name: '前进速度', w: 0.1, kind: 'shape' },
    { name: '干扰对手', w: 1, kind: 'shape' },
    { name: '倒地 / 出界', w: 0.5, kind: 'shape' },
    { name: '保持直立', w: 0.02, kind: 'safe' },
    { name: '膝关节力矩', w: 0.01, kind: 'safe' }
  ];
  function upright(tilt) { return tilt < 0.2 ? 1 : tilt > 0.4 ? 0 : (0.4 - tilt) / 0.2; }
  var TILT = 0.3;

  /* 第六幕：系统辨识结果与域随机化范围 */
  var SYSID = [['阻尼', '1.084 Nm/(rad/s)'], ['电枢惯量', '0.045 kg·m²'], ['摩擦', '0.03'], ['最大力矩', '4.1 Nm'], ['比例增益', '21.1 N/rad']];
  var DR = [['地面摩擦', '0.5 – 1.0'], ['关节零位偏置', '± 2.9°'], ['IMU 姿态 / 位置', '≤ 2° / ≤ 5 mm'], ['躯干外加质量', '≤ 0.5 kg'], ['观测延迟', '10 – 50 ms']];

  /* 第七幕：Table 1 */
  var TABLE1 = [
    { name: '行走速度', unit: 'm/s', base: 0.20, rl: 0.57, sim: 0.51, better: 'up', paper: '+181%' },
    { name: '转身速度', unit: 'rad/s', base: 0.71, rl: 2.85, sim: 3.19, better: 'up', paper: '+302%' },
    { name: '起身时间', unit: 's', base: 2.52, rl: 0.93, sim: 0.73, better: 'down', paper: '−63%' },
    { name: '踢球速度（助跑）', unit: 'm/s', base: 2.07, rl: 2.77, sim: null, better: 'up', paper: '+34%' }
  ];
  TABLE1.forEach(function (r) { r.ratio = r.rl / r.base; });
  var SETPIECE = { real: 29, sim: 35, n: 50 };

  // ─── small drawing helpers ─────────────────────────────────────────────
  function box(x, y, w, h, tone, width) {
    return paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 8, 'stroke-width': width || 1.4 }), C_SURFACE2, tone || C_BORDER);
  }
  function line(x1, y1, x2, y2, tone, width, dash, marker) {
    var attrs = { x1: x1, y1: y1, x2: x2, y2: y2, 'stroke-width': width || 1.3 };
    if (dash) attrs['stroke-dasharray'] = dash;
    if (marker) attrs['marker-end'] = marker;
    return paint(svgEl('line', attrs), null, tone || C_MUTED);
  }
  function readoutChip(s, cx, y, w, label, value, color) {
    var g = svgEl('g', {});
    g.appendChild(paint(svgEl('rect', { x: cx - w / 2, y: y, width: w, height: 34, rx: 6, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    g.appendChild(svgRich(cx - w / 2 + 12, y + 18, label, { size: 10.5, cls: 'demo-x-mut', w: w * 0.64 }));
    g.appendChild(paint(svgText(cx + w / 2 - 12, y + 22, value, 'demo-x-mono', 11.5, 'end'), color || C_ACCENT));
    s.appendChild(g);
    return g;
  }
  function card(s, x, y, w, h, tone, title, lines) {
    var g = svgEl('g', {});
    g.appendChild(paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 10, 'stroke-width': 1.8 }), C_SURFACE2, tone));
    g.appendChild(svgRich(x + 14, y + 24, title, { size: 12, w: w - 24 }).setTone(tone));
    lines.forEach(function (ln, i) {
      g.appendChild(svgRich(x + 14, y + 50 + i * 21, ln, { size: 10.5, cls: 'demo-x-ink2', w: w - 24 }));
    });
    s.appendChild(g);
    return g;
  }

  // ── scene 1: 任务与机器人 ──
  function buildSceneTask() {
    var s = sceneSvg('20 个关节的小型人形 OP3 在 5 米乘 4 米的场地上 1 对 1 踢球；策略 40 Hz 输出关节目标，经指数滤波后交给舵机');
    s.appendChild(svgText(40, 30, '任务：Robotis OP3 在 5 m × 4 m 的场地上 1 对 1 踢球（图 1）', 'demo-x-ink2', 13.5));

    var PX0 = 40, PY0 = 56, PW = 300, PH = 240;
    var pitch = svgEl('g', {});
    pitch.appendChild(paint(svgEl('rect', { x: PX0, y: PY0, width: PW, height: PH, rx: 6, 'stroke-width': 2, 'fill-opacity': 0.12 }), C_GOOD, C_GOOD));
    pitch.appendChild(line(PX0 + PW / 2, PY0, PX0 + PW / 2, PY0 + PH, C_GOOD, 1.2));
    var gh = PH * PITCH.goal / PITCH.wid;
    pitch.appendChild(paint(svgEl('rect', { x: PX0 - 8, y: PY0 + PH / 2 - gh / 2, width: 8, height: gh }), C_ACCENT));
    pitch.appendChild(paint(svgEl('rect', { x: PX0 + PW, y: PY0 + PH / 2 - gh / 2, width: 8, height: gh }), C_BAD));
    pitch.appendChild(svgText(PX0 + PW / 2, PY0 + PH + 18, '5 m × 4 m，球门宽 0.8 m，四周斜坡把球弹回场内', 'demo-x-mut', 10, 'middle'));
    var me = paint(svgEl('circle', { cx: PX0 + 80, cy: PY0 + 150, r: 10 }), C_ACCENT);
    var opp = paint(svgEl('circle', { cx: PX0 + 230, cy: PY0 + 80, r: 10 }), C_BAD);
    var ball = paint(svgEl('circle', { cx: PX0 + 150, cy: PY0 + 120, r: 6 }), C_WARN);
    pitch.appendChild(me);
    pitch.appendChild(opp);
    pitch.appendChild(ball);
    s.appendChild(pitch);

    var robot = card(s, 370, 50, 400, 130, C_ACCENT, 'Robotis OP3（§Materials and Methods）', [
      '高 ' + ROBOT.height + ' cm，重 ' + ROBOT.mass + ' kg，' + ROBOT.joints + ' 个 Dynamixel XM430 舵机',
      '位置控制、只有比例项；板载 Intel i3 NUC，**全部在 CPU 上跑网络**',
      '14 台 OptiTrack 动捕相机提供自身、球和对手的位置'
    ]);

    var io = svgEl('g', {});
    io.appendChild(box(370, 194, 400, 104, C_GOOD, 1.6));
    io.appendChild(svgRich(384, 216, '策略 **40 Hz**：输出 20 维关节目标 $a_t$，再过指数滤波', { size: 10.5, w: 380 }).setTone(C_GOOD));
    io.appendChild(svgMath(570, 244, 'u_t = 0.8\\,u_{t-1} + 0.2\\,a_t', { size: 12, anchor: 'middle', w: 300 }));
    var fpts = FILTER.seq.map(function (v, k) { return [(390 + k * 28).toFixed(1), (290 - 30 * v).toFixed(1)]; });
    var fpath = paint(svgEl('path', { d: polyPath([[390, 290]].concat(fpts)), fill: 'none', 'stroke-width': 2 }), null, C_WARN);
    io.appendChild(fpath);
    io.appendChild(line(390, 260, 740, 260, C_MUTED, 1, '3 3'));
    io.appendChild(paint(svgText(756, 284, '目标跳到 1 后，第 ' + FILTER.n90 + ' 步（' + fmt(FILTER.ms90, 0) + ' ms）才到 0.9', 'demo-x-mono', 9.5, 'end'), C_WARN));
    s.appendChild(io);

    var fail = svgEl('g', {});
    fail.appendChild(box(40, 320, 730, 46, C_BAD, 1.6));
    fail.appendChild(svgText(56, 348, '直接端到端训 1v1 会卡死：只给进球奖励 → 学会**滚到球边用腿拨进去**；加倒地惩罚 → 只学会站起来不动', 'demo-x-ink2', 11)).textContent =
      '直接端到端训 1v1 会卡死：只给进球奖励 → 学会滚到球边用腿拨进去；加倒地惩罚 → 只学会站起来不动';
    s.appendChild(fail);
    var foot = svgRich(400, 398, '所以先分别训「踢球」和「起身」两个技能，再合成一个完整智能体', { size: 13.5, anchor: 'middle', w: 760 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(pitch, seg(t, 0.3, 0.9));
      var u = ease(seg(t, 1.0, 4.0));
      ball.setAttribute('cx', (PX0 + 150 + 140 * u).toFixed(1));
      ball.setAttribute('cy', (PY0 + 120 + 0 * u).toFixed(1));
      me.setAttribute('cx', (PX0 + 80 + 60 * u).toFixed(1));
      setOpacity(robot, seg(t, 2.0, 2.6));
      setOpacity(io, seg(t, 4.4, 5.0));
      fpath.style.strokeDasharray = '600';
      fpath.style.strokeDashoffset = String(600 * (1 - ease(seg(t, 5.2, 7.0))));
      setOpacity(fail, seg(t, 8.0, 8.6));
      setOpacity(foot, seg(t, 10.2, 11.0));
    }
    return { el: s, draw: draw };
  }

  // ── scene 2: 阶段 1 —— 两个技能教师 ──
  function buildSceneSkills() {
    var s = sceneSvg('阶段一分别训练两个技能：对一个会立刻摔倒的对手练进球，以及以脚本起身动作的三个关键姿态为目标练起身');
    s.appendChild(svgText(40, 30, '阶段 1：两个技能教师，分开训（图 2 左）', 'demo-x-ink2', 13.5));

    var soccer = card(s, 30, 46, 360, 176, C_ACCENT, '① 踢球技能', [
      '目标：尽可能多进球',
      '对手是**未训练**的策略 —— 开场几乎立刻摔倒',
      '倒地、出界、进禁区、被进球或满 50 s 就结束',
      '奖励：进球 + 朝球 / 前进速度 + 安全正则',
      '仿真 580 天，墙钟约 158 小时'
    ]);

    var getup = svgEl('g', {});
    getup.appendChild(box(410, 46, 360, 176, C_GOOD, 1.8));
    getup.appendChild(paint(svgText(424, 70, '② 起身技能', null, 12), C_GOOD));
    getup.appendChild(svgText(424, 96, '从 OP3 自带脚本起身动作里抽 3 个关键姿态（前 / 后倒各一套）', 'demo-x-ink2', 10.5));
    getup.appendChild(svgText(424, 118, '目标姿态在关键姿态之间插值，平均每 1.5 s 换一次', 'demo-x-ink2', 10.5));
    getup.appendChild(svgText(424, 140, '（间隔服从指数分布，换目标的概率与时间无关）', 'demo-x-mut', 10));
    getup.appendChild(svgRich(424, 166, '条件：目标关节角 $p_{target}$ + 目标重力方向 $g_{target}$', { size: 10.5, w: 340 }));
    getup.appendChild(svgText(424, 194, '训完后固定条件为「站立」姿态，就是起身技能', 'demo-x-ink2', 10.5));
    s.appendChild(getup);

    var reward = svgEl('g', {});
    reward.appendChild(box(30, 236, 740, 100, C_WARN, 1.8));
    reward.appendChild(svgMath(250, 266, '\\tilde p_t = \\frac{\\pi - \\lVert p_{target} - p_t \\rVert_2}{\\pi},\\qquad \\tilde g_t = \\frac{\\pi - \\arccos(g_t^\\top g_{target})}{\\pi}', { size: 11.5, anchor: 'middle', w: 440 }));
    reward.appendChild(svgRich(46, 306, '玩具：关节误差 ' + fmt(POSE.jointErr, 1) + ' rad → $\\tilde p = ' + fmt(POSE.p, 3) + '$；重力夹角 ' + fmt(POSE.gravAng, 1) + ' rad → $\\tilde g = ' + fmt(POSE.g, 3) + '$', { size: 10.5, w: 440 }));
    reward.appendChild(svgRich(46, 326, '两者都是「越接近越大」，按定义两者相乘 = **' + fmt(POSE.r, 3) + '**', { size: 10.5, w: 440 }));
    reward.appendChild(svgText(756, 266, '关节角对上了、', 'demo-x-ink2', 10.5, 'end'));
    reward.appendChild(svgText(756, 286, '但人还躺在地上也不行：', 'demo-x-ink2', 10.5, 'end'));
    reward.appendChild(paint(svgText(756, 310, '重力方向这一项逼它站起来', null, 11, 'end'), C_WARN));
    s.appendChild(reward);

    var foot = svgRich(400, 380, '论文式子前带负号、附录表的阈值写法也和正文不同；按「越接近越大」的定义，**应为乘积本身**（笔者推测）', { size: 11.5, anchor: 'middle', w: 780 }).setTone(C_MUTED);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(soccer, seg(t, 0.6, 1.2));
      setOpacity(getup, seg(t, 4.2, 4.8));
      setOpacity(reward, seg(t, 8.0, 8.6));
      setOpacity(foot, seg(t, 11.0, 11.8));
    }
    return { el: s, draw: draw };
  }

  // ── scene 3: 阶段 2 —— 自适应蒸馏（式 2–3） ──
  function buildSceneDistill() {
    var s = sceneSvg('阶段二把两个技能蒸馏进一个策略：站立时向踢球技能做 KL 正则，倒地时向起身技能；权重 λ 在预测回报超过阈值后自动降到 0');
    var f = svgMath(400, 36, '(1-\\lambda_s)\\,\\mathbb{E}_{a\\sim\\pi}[Q(s,a)] - \\lambda_s\\,\\mathrm{KL}\\big(\\pi_\\theta(\\cdot\\mid s)\\,\\Vert\\,\\pi_s(\\cdot\\mid s)\\big)\\quad \\text{若 } s \\in U', { size: 12, anchor: 'middle', w: 760 });
    s.appendChild(f);
    var sub = svgRich(400, 64, '$U$ = 直立状态的集合；倒地时换成起身教师 $\\pi_g$ 与 $\\lambda_g$ —— **每个状态只向一个教师看齐**', { size: 11, anchor: 'middle', cls: 'demo-x-ink2', w: 760 });
    s.appendChild(sub);

    var PX0 = 60, PX1 = 500, PY0 = 300, PY1 = 96;
    function px(i) { return PX0 + (i / (LAMBDA.n - 1)) * (PX1 - PX0); }
    function py(v) { return PY0 - v * (PY0 - PY1); }
    var pl = svgEl('g', {});
    pl.appendChild(paint(svgEl('rect', { x: PX0 - 20, y: PY1 - 16, width: PX1 - PX0 + 40, height: PY0 - PY1 + 48, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    pl.appendChild(line(PX0, py(LAMBDA.qs), PX1, py(LAMBDA.qs), C_WARN, 1.2, '5 4'));
    pl.appendChild(svgRich(PX0 + 4, py(LAMBDA.qs) - 8, '阈值 $Q_s$', { size: 10, w: 90 }).setTone(C_WARN));
    pl.appendChild(svgText(PX1, PY0 + 22, '训练进度 →（示意）', 'demo-x-mut', 10, 'end'));
    s.appendChild(pl);
    var qPath = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 2.2 }), null, C_ACCENT);
    var lPath = paint(svgEl('path', { d: '', fill: 'none', 'stroke-width': 2.2 }), null, C_GOOD);
    s.appendChild(qPath);
    s.appendChild(lPath);
    var qTag = svgRich(PX1 - 4, PY1 + 4, '预测回报 $\\mathbb{E}[Q]$', { size: 10.5, anchor: 'end', w: 160 }).setTone(C_ACCENT);
    var lTag = svgRich(PX0 + 70, PY1 + 4, '$\\lambda_s$', { size: 11, w: 60 }).setTone(C_GOOD);
    s.appendChild(qTag);
    s.appendChild(lTag);

    var rule = svgEl('g', {});
    rule.appendChild(box(530, 90, 240, 210, C_GOOD, 1.8));
    rule.appendChild(svgMath(650, 118, 'c(\\lambda_s) = \\lambda_s\\,\\big(\\mathbb{E}[Q] - Q_s\\big)', { size: 11.5, anchor: 'middle', w: 230 }));
    rule.appendChild(svgText(544, 150, '对 λ 做梯度下降（softplus + 截断到 [0, 1]）', 'demo-x-ink2', 10));
    rule.appendChild(svgRich(544, 180, '$\\mathbb{E}[Q] < Q_s$：$\\lambda \\to 1$', { size: 10.5, w: 220 }).setTone(C_WARN));
    rule.appendChild(svgText(544, 200, '→ 等于对教师做行为克隆', 'demo-x-ink2', 10.5));
    rule.appendChild(svgRich(544, 232, '$\\mathbb{E}[Q] > Q_s$：$\\lambda \\to 0$', { size: 10.5, w: 220 }).setTone(C_GOOD));
    rule.appendChild(svgText(544, 252, '→ 纯 RL，可以超过教师', 'demo-x-ink2', 10.5));
    rule.appendChild(svgText(544, 284, '思路同约束 RL 的拉格朗日乘子', 'demo-x-mut', 10));
    s.appendChild(rule);

    var foot = svgRich(400, 384, '学到的不只是「按状态切换两个技能」：切换本身被优化，技能也被微调得更流畅', { size: 13, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(f, seg(t, 0.3, 0.9));
      setOpacity(sub, seg(t, 1.8, 2.4));
      setOpacity(pl, seg(t, 3.6, 4.2));
      var n = Math.max(2, Math.floor(LAMBDA.n * seg(t, 4.2, 9.0)));
      qPath.setAttribute('d', polyPath(LAMBDA.q.slice(0, n).map(function (v, i) { return [px(i).toFixed(1), py(v).toFixed(1)]; })));
      lPath.setAttribute('d', polyPath(LAMBDA.lam.slice(0, n).map(function (v, i) { return [px(i).toFixed(1), py(v).toFixed(1)]; })));
      setOpacity(qPath, seg(t, 4.2, 4.4));
      setOpacity(lPath, seg(t, 4.2, 4.4));
      setOpacity(qTag, seg(t, 7.4, 8.0));
      setOpacity(lTag, seg(t, 4.6, 5.2));
      setOpacity(rule, seg(t, 6.0, 6.6));
      setOpacity(foot, seg(t, 11.0, 11.8));
    }
    return { el: s, draw: draw };
  }

  // ── scene 4: 自博弈的对手池 ──
  function buildSceneSelfPlay() {
    var s = sceneSvg('对手从智能体自己的历史快照里均匀抽取，但只取前四分之一加一个未训练对手；critic 额外输入对手编号');
    s.appendChild(svgText(40, 30, '自博弈：对手从自己的历史快照里抽（§Self-Play）', 'demo-x-ink2', 13.5));

    var SX0 = 40, SW = 17;
    var snaps = [];
    var row = svgEl('g', {});
    row.appendChild(svgText(SX0, 60, '已保存 ' + POOL.saved + ' 个快照（越往右越新、越强）', 'demo-x-mut', 10.5));
    for (var i = 0; i < POOL.saved; i++) {
      var inPool = i < POOL.saved / 4;
      var r = paint(svgEl('rect', { x: SX0 + i * SW, y: 70, width: SW - 3, height: 30, rx: 3, 'fill-opacity': inPool ? 0.8 : 0.25 }), inPool ? C_GOOD : C_MUTED);
      row.appendChild(r);
      snaps.push(r);
    }
    row.appendChild(paint(svgEl('rect', { x: SX0 - 2, y: 66, width: SW * POOL.saved / 4 + 1, height: 38, rx: 5, fill: 'none', 'stroke-width': 2, 'stroke-dasharray': '5 3' }), null, C_GOOD));
    row.appendChild(paint(svgText(SX0, 122, '前 1/4 进对手池', null, 10.5), C_GOOD));
    row.appendChild(paint(svgText(SX0 + SW * POOL.saved - 4, 122, '后 3/4 不用', 'demo-x-mut', 10.5, 'end'), null));
    s.appendChild(row);

    var calc = svgEl('g', {});
    calc.appendChild(box(40, 140, 350, 110, C_GOOD, 1.8));
    calc.appendChild(paint(svgText(56, 164, '对手池 = 前 ' + (POOL.pool - 1) + ' 个快照 + 1 个未训练对手', null, 11.5), C_GOOD));
    calc.appendChild(svgText(56, 190, '每局均匀抽一个：概率 1 / ' + POOL.pool + ' ≈ ' + fmt(POOL.p, 3), 'demo-x-ink2', 10.5));
    calc.appendChild(svgText(56, 212, '对手强度随训练慢慢上升 —— 自动课程', 'demo-x-ink2', 10.5));
    calc.appendChild(svgText(56, 234, '（快照数 40 是本幕的玩具数）', 'demo-x-mut', 10));
    s.appendChild(calc);

    var critic = svgEl('g', {});
    critic.appendChild(box(410, 140, 360, 110, C_ACCENT, 1.8));
    critic.appendChild(paint(svgText(426, 164, 'critic 额外输入「对手编号」', null, 11.5), C_ACCENT));
    critic.appendChild(svgText(426, 190, '不同对手，同一状态的价值不同', 'demo-x-ink2', 10.5));
    critic.appendChild(svgText(426, 212, '不告诉它是谁，价值函数就会混叠', 'demo-x-ink2', 10.5));
    critic.appendChild(svgText(426, 234, '（Table S2 的策略观测里没有这个编号）', 'demo-x-mut', 10));
    s.appendChild(critic);

    var abl = svgEl('g', {});
    abl.appendChild(box(40, 266, 730, 70, C_WARN, 1.6));
    abl.appendChild(paint(svgText(56, 288, '图 7 消融（固定 6 个对手 × 各 100 局，平局算半胜，5 个种子）', null, 11), C_WARN));
    abl.appendChild(svgText(56, 310, '从全部快照里抽 → 训练不稳、收敛更差；直接对着这 6 个评测对手训 → 反而略差于自博弈', 'demo-x-ink2', 10.5));
    abl.appendChild(svgText(56, 328, '不做技能正则、也不做奖励塑形 → 学会在地上滚着进球', 'demo-x-ink2', 10.5));
    s.appendChild(abl);

    var foot = svgRich(400, 382, '「只取前 1/4」让对手变强得慢一点 —— 稳定性来自一个很朴素的选择', { size: 13, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(row, seg(t, 0.4, 1.0));
      var k = Math.floor(POOL.saved * seg(t, 0.6, 3.0));
      snaps.forEach(function (r, i) { setOpacity(r, i < k ? 1 : 0.1); });
      setOpacity(calc, seg(t, 3.4, 4.0));
      setOpacity(critic, seg(t, 5.8, 6.4));
      setOpacity(abl, seg(t, 8.0, 8.6));
      setOpacity(foot, seg(t, 10.4, 11.2));
    }
    return { el: s, draw: draw };
  }

  // ── scene 5: 奖励与安全正则（Table S3） ──
  function buildSceneReward() {
    var s = sceneSvg('完整 1v1 智能体的八项奖励：进球和失球权重各 1000，塑形项很小；直立和膝关节力矩两项是为了真机安全');
    s.appendChild(svgText(40, 30, 'Table S3：完整 1v1 智能体的奖励权重', 'demo-x-ink2', 13.5));

    var tones = { task: C_ACCENT, shape: C_WARN, safe: C_GOOD };
    var rows = REWARDS.map(function (r, k) {
      var y = 52 + k * 34;
      var g = svgEl('g', {});
      g.appendChild(box(40, y, 380, 28, tones[r.kind], 1.2));
      g.appendChild(svgText(56, y + 19, r.name, null, 11));
      var wlog = (Math.log10(r.w) + 2.2) / 5.2;
      g.appendChild(paint(svgEl('rect', { x: 180, y: y + 8, width: 180 * clamp(wlog, 0.02, 1), height: 12, rx: 3, 'fill-opacity': 0.7 }), tones[r.kind]));
      g.appendChild(paint(svgText(410, y + 19, String(r.w), 'demo-x-mono', 11, 'end'), tones[r.kind]));
      s.appendChild(g);
      return g;
    });
    s.appendChild(svgText(180, 332, '条形按对数刻度', 'demo-x-mut', 9.5));

    var legend = svgEl('g', {});
    [['任务', C_ACCENT], ['探索塑形', C_WARN], ['sim-to-real 安全', C_GOOD]].forEach(function (lg, k) {
      legend.appendChild(paint(svgEl('rect', { x: 290 + k * 0, y: 0, width: 0, height: 0 }), lg[1]));
    });
    s.appendChild(legend);

    var up = svgEl('g', {});
    up.appendChild(box(440, 52, 330, 150, C_GOOD, 1.8));
    up.appendChild(paint(svgText(456, 76, '直立奖励：倾角 < 0.2 rad（11.5°）得 1', null, 11), C_GOOD));
    var UX0 = 470, UX1 = 740, UY0 = 180, UY1 = 100;
    function ux(tt) { return UX0 + (tt / 0.6) * (UX1 - UX0); }
    function uy(v) { return UY0 - v * (UY0 - UY1); }
    var pts = [];
    for (var i = 0; i <= 60; i++) { var tl = i / 100; pts.push([ux(tl).toFixed(1), uy(upright(tl)).toFixed(1)]); }
    up.appendChild(paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': 2.2 }), null, C_GOOD));
    up.appendChild(paint(svgEl('circle', { cx: ux(TILT), cy: uy(upright(TILT)), r: 4.5 }), C_WARN));
    up.appendChild(paint(svgText(ux(TILT) + 8, uy(upright(TILT)) - 6, '倾角 0.3 → ' + fmt(upright(TILT), 1), 'demo-x-mono', 10), C_WARN));
    [0, 0.2, 0.4, 0.6].forEach(function (tl) { up.appendChild(svgText(ux(tl), UY0 + 16, fmt(tl, 1), 'demo-x-mono demo-x-mut', 9.5, 'middle')); });
    s.appendChild(up);

    var knee = svgEl('g', {});
    knee.appendChild(box(440, 214, 330, 90, C_BAD, 1.8));
    knee.appendChild(paint(svgText(456, 238, '膝关节力矩惩罚', null, 11.5), C_BAD));
    knee.appendChild(svgText(456, 262, '正文：惩罚超过 5 Nm 的力矩峰值的时间积分', 'demo-x-ink2', 10.5));
    knee.appendChild(svgText(456, 284, '起因：激烈步态和踢球把膝关节齿轮打坏', 'demo-x-ink2', 10.5));
    s.appendChild(knee);

    var foot = svgRich(400, 384, '去掉前进速度奖励，踢球技能**根本学不会**；速度类塑形是为探索，安全两项是为真机', { size: 12.5, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      rows.forEach(function (g, k) { setOpacity(g, seg(t, 0.6 + k * 0.5, 1.0 + k * 0.5)); });
      setOpacity(up, seg(t, 5.6, 6.2));
      setOpacity(knee, seg(t, 8.4, 9.0));
      setOpacity(foot, seg(t, 11.0, 11.8));
    }
    return { el: s, draw: draw };
  }

  // ── scene 6: 零样本 sim-to-real ──
  function buildSceneSim2Real() {
    var s = sceneSvg('系统辨识只拟合了五个执行器参数；每局随机化地面摩擦、关节零位、IMU 安装、外加质量和观测延迟，并每 1 到 3 秒推一下机器人');
    s.appendChild(svgText(40, 30, '零样本迁移的三件事：系统辨识 + 域随机化 + 随机推搡', 'demo-x-ink2', 13.5));

    var sys = svgEl('g', {});
    sys.appendChild(box(30, 48, 240, 200, C_ACCENT, 1.8));
    sys.appendChild(paint(svgText(44, 72, '① 系统辨识（执行器）', null, 12), C_ACCENT));
    sys.appendChild(svgText(44, 94, '正弦激励 + 已知负载，拟合', 'demo-x-mut', 10));
    SYSID.forEach(function (r, k) {
      sys.appendChild(svgText(44, 122 + k * 24, r[0], 'demo-x-ink2', 10.5));
      sys.appendChild(paint(svgText(258, 122 + k * 24, r[1], 'demo-x-mono', 10, 'end'), C_ACCENT));
    });
    s.appendChild(sys);

    var dr = svgEl('g', {});
    dr.appendChild(box(280, 48, 250, 200, C_GOOD, 1.8));
    dr.appendChild(paint(svgText(294, 72, '② 域随机化（每局采一次）', null, 12), C_GOOD));
    dr.appendChild(svgText(294, 94, '只挑少数几个轴，怕策略变保守', 'demo-x-mut', 10));
    DR.forEach(function (r, k) {
      dr.appendChild(svgText(294, 122 + k * 24, r[0], 'demo-x-ink2', 10.5));
      dr.appendChild(paint(svgText(518, 122 + k * 24, r[1], 'demo-x-mono', 10, 'end'), C_GOOD));
    });
    s.appendChild(dr);

    var push = svgEl('g', {});
    push.appendChild(box(540, 48, 230, 200, C_WARN, 1.8));
    push.appendChild(paint(svgText(554, 72, '③ 随机推搡', null, 12), C_WARN));
    push.appendChild(svgText(554, 100, '每 1–3 s 一次', 'demo-x-ink2', 10.5));
    push.appendChild(svgText(554, 124, '持续 0.05–0.15 s', 'demo-x-ink2', 10.5));
    push.appendChild(svgText(554, 148, '强度「5–15 Nm」（论文原文单位）', 'demo-x-ink2', 10.5));
    push.appendChild(svgText(554, 172, '作用在躯干上随机一点', 'demo-x-ink2', 10.5));
    var arrowM = K.arrowMarker(s, 'soccer-x-arrow-push', C_WARN);
    var pushArrow = line(590, 222, 640, 222, C_WARN, 3, null, arrowM);
    push.appendChild(pushArrow);
    var bot = paint(svgEl('circle', { cx: 670, cy: 222, r: 12 }), C_ACCENT);
    push.appendChild(bot);
    s.appendChild(push);

    var fail = svgEl('g', {});
    fail.appendChild(box(30, 262, 740, 74, C_BAD, 1.8));
    fail.appendChild(paint(svgText(46, 286, '没有域随机化和推搡：真机上每走一两步就摔，一个球也进不了', null, 11.5), C_BAD));
    fail.appendChild(svgText(46, 310, '其他：本体观测堆叠最近 5 帧应对延迟；舵机用「带力矩反馈的位置控制」建模 —— 试过直接电流控制，差距太大', 'demo-x-ink2', 10.5));
    fail.appendChild(svgText(46, 328, '作者推测：位置控制的高频反馈把模型误差藏起来了', 'demo-x-mut', 10));
    s.appendChild(fail);

    var foot = svgRich(400, 384, '论文的经验：**少量、有针对性**的随机化就够，随机化太多反而让策略变保守', { size: 13, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(sys, seg(t, 0.4, 1.0));
      setOpacity(dr, seg(t, 3.4, 4.0));
      setOpacity(push, seg(t, 6.4, 7.0));
      var ph = (t % 1.6) / 1.6;
      bot.setAttribute('cx', (670 + (t > 7.0 ? 18 * Math.sin(Math.PI * clamp(ph * 2, 0, 1)) : 0)).toFixed(1));
      setOpacity(fail, seg(t, 8.6, 9.2));
      setOpacity(foot, seg(t, 11.0, 11.8));
    }
    return { el: s, draw: draw };
  }

  // ── scene 7: 实验读数与边界（Table 1） ──
  function buildSceneResults() {
    var s = sceneSvg('学到的策略比脚本控制器走得快、转得快、起身快，助跑后踢得更快；定位球真机进 29 个、仿真进 35 个');
    s.appendChild(svgText(40, 30, 'Table 1：真机上学到的策略 vs 手调的脚本控制器', 'demo-x-ink2', 13.5));

    var rows = TABLE1.map(function (r, k) {
      var y = 50 + k * 58;
      var g = svgEl('g', {});
      g.appendChild(box(30, y, 470, 50, r.better === 'down' ? C_GOOD : C_ACCENT, 1.4));
      g.appendChild(svgText(46, y + 22, r.name, null, 11.5));
      g.appendChild(svgText(46, y + 40, r.unit, 'demo-x-mut', 9.5));
      var maxV = Math.max(r.base, r.rl) * 1.05;
      var bScr = paint(svgEl('rect', { x: 170, y: y + 10, width: 0, height: 12, rx: 3 }), C_MUTED);
      var bRl = paint(svgEl('rect', { x: 170, y: y + 28, width: 0, height: 12, rx: 3 }), C_GOOD);
      g.appendChild(bScr);
      g.appendChild(bRl);
      g.appendChild(svgText(420, y + 21, '脚本 ' + fmt(r.base, 2), 'demo-x-mono demo-x-mut', 9.5, 'end'));
      g.appendChild(paint(svgText(420, y + 39, 'RL ' + fmt(r.rl, 2), 'demo-x-mono', 9.5, 'end'), C_GOOD));
      g.appendChild(paint(svgText(492, y + 31, r.paper, 'demo-x-mono', 12, 'end'), C_GOOD));
      s.appendChild(g);
      return { g: g, bs: bScr, br: bRl, ws: 170 * r.base / maxV, wr: 170 * r.rl / maxV };
    });

    var set = svgEl('g', {});
    set.appendChild(box(520, 50, 250, 108, C_WARN, 1.8));
    set.appendChild(paint(svgText(534, 74, '起身射门定位球（各 50 局）', null, 11.5), C_WARN));
    set.appendChild(paint(svgText(534, 100, '真机 ' + SETPIECE.real + ' / ' + SETPIECE.n + ' = ' + fmt(100 * SETPIECE.real / SETPIECE.n, 0) + '%', 'demo-x-mono', 11.5), C_WARN));
    set.appendChild(paint(svgText(534, 122, '仿真 ' + SETPIECE.sim + ' / ' + SETPIECE.n + ' = ' + fmt(100 * SETPIECE.sim / SETPIECE.n, 0) + '%', 'demo-x-mono', 11.5), C_MUTED));
    set.appendChild(svgText(534, 144, '真机每局都起身并踢到球', 'demo-x-ink2', 10));
    s.appendChild(set);

    var emerg = svgEl('g', {});
    emerg.appendChild(box(520, 170, 250, 110, C_ACCENT, 1.8));
    emerg.appendChild(paint(svgText(534, 194, '自己学出来的行为', null, 11.5), C_ACCENT));
    ['用脚掌一角支点转身', '站到球与自家球门之间防守', '逼近持球对手时碎步（30 步 vs 20 步）', '转身—走—转身—射门只用 10 步'].forEach(function (ln, k) {
      emerg.appendChild(svgText(534, 216 + k * 18, ln, 'demo-x-ink2', 10));
    });
    s.appendChild(emerg);

    var limits = svgRich(400, 312, '局限：靠**动捕**拿球和对手位置；舵机没建模，电量一变就敏感，一块电池只能跑 5–10 分钟；只做了小尺寸机器人', { size: 11.5, anchor: 'middle', w: 780 }).setTone(C_BAD);
    s.appendChild(limits);
    var note = svgText(400, 340, '按表中四舍五入的均值算是 +185% / +301%；正文写 +181% / +302%，差异来自四舍五入（笔者推测）', 'demo-x-mut', 10, 'middle');
    s.appendChild(note);
    var foot = svgRich(400, 384, '没有参考动作、没有手写步态：**深度 RL + 两段训练 + 针对性随机化**就让一台廉价小人形踢起了球', { size: 12.5, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      rows.forEach(function (r, k) {
        setOpacity(r.g, seg(t, 0.6 + k * 1.2, 1.0 + k * 1.2));
        var p = ease(seg(t, 0.8 + k * 1.2, 1.8 + k * 1.2));
        r.bs.setAttribute('width', (r.ws * p).toFixed(1));
        r.br.setAttribute('width', (r.wr * p).toFixed(1));
      });
      setOpacity(set, seg(t, 5.8, 6.4));
      setOpacity(emerg, seg(t, 8.0, 8.6));
      setOpacity(limits, seg(t, 10.2, 10.8));
      setOpacity(note, seg(t, 10.6, 11.2));
      setOpacity(foot, seg(t, 12.2, 13.0));
    }
    return { el: s, draw: draw };
  }

  var SOCCER_SCENES = [
    {
      title: '任务与机器人',
      dur: 12,
      build: buildSceneTask,
      cues: [
        { at: 0.3, s: 'DeepMind 用深度 RL 训练一台 20 关节的小型人形 **OP3**，在 5 m × 4 m 的场地上 1 对 1 踢球。' },
        { at: 2.0, s: 'OP3 高 51 cm、重 3.5 kg，舵机只有比例项；网络全在板载 CPU 上跑；球和对手的位置来自动捕。' },
        { at: 4.4, s: '策略以 **40 Hz** 输出 20 维关节目标，先过指数滤波 $u_t = 0.8u_{t-1} + 0.2a_t$ 再交给舵机。' },
        { at: 5.2, s: '目标突然从 0 跳到 1，滤波后要到第 ' + FILTER.n90 + ' 步（约 ' + fmt(FILTER.ms90, 0) + ' ms）才到 0.9 —— 高频抖动被挡掉了。' },
        { at: 8.0, s: '直接端到端训 1v1 会卡在局部最优：只给进球奖励，就学会滚到球边用腿拨；加倒地惩罚，就只会站着不动。' },
        { at: 10.2, s: '所以论文把训练拆成两段：先分别训两个技能，再合成一个完整智能体。' }
      ]
    },
    {
      title: '阶段 1：两个技能教师',
      dur: 13,
      build: buildSceneSkills,
      cues: [
        { at: 0.3, s: '阶段 1 分开训两个技能。' },
        { at: 0.6, s: '**踢球技能**：对手是未训练的策略，开场几乎立刻摔倒；倒地、出界、进禁区、被进球或满 50 秒就结束。' },
        { at: 4.2, s: '**起身技能**：从 OP3 自带的脚本起身动作里抽出前倒、后倒各 3 个关键姿态，在它们之间插值当目标。' },
        { at: 6.0, s: '目标平均每 1.5 秒换一次，间隔服从指数分布；训完后把条件固定成「站立」姿态，就得到起身技能。' },
        { at: 8.0, s: '奖励由两项相似度组成：关节角 $\\tilde p$ 和重力方向 $\\tilde g$。玩具例子 $\\tilde p = ' + fmt(POSE.p, 3) + '$、$\\tilde g = ' + fmt(POSE.g, 3) + '$，乘积 ' + fmt(POSE.r, 3) + '。' },
        { at: 9.6, s: '只对上关节角不够 —— 躺在地上也能摆出同样的角度，重力方向这一项逼它真的站起来。' },
        { at: 11.0, s: '论文式子前写了负号，附录表的阈值也和正文不同；按定义应为乘积本身，这是笔者的推测。' }
      ]
    },
    {
      title: '阶段 2：自适应蒸馏',
      dur: 13,
      build: buildSceneDistill,
      cues: [
        { at: 0.3, s: '阶段 2 把两个技能蒸馏进一个策略：在 MPO 的策略改进里，把 Q 值和对教师的 KL 正则按 $\\lambda$ 加权。' },
        { at: 1.8, s: '关键是**每个状态只向一个教师看齐**：直立时用踢球技能，倒地时用起身技能。' },
        { at: 3.6, s: '$\\lambda$ 不是手调的日程，而是自动调：目标是 $c(\\lambda) = \\lambda\\,(\\mathbb{E}[Q] - Q_s)$。' },
        { at: 6.0, s: '预测回报低于阈值 $Q_s$ 时，$\\lambda$ 被推到 1 —— 等于对教师做**行为克隆**。' },
        { at: 8.0, s: '一旦超过阈值，$\\lambda$ 降到 0，变成纯 RL，智能体可以**超过教师**。' },
        { at: 11.0, s: '所以学到的不只是按状态切换两个技能：切换本身被优化，技能也被微调得更流畅。' }
      ]
    },
    {
      title: '自博弈的对手池',
      dur: 12,
      build: buildSceneSelfPlay,
      cues: [
        { at: 0.3, s: '阶段 2 同时做**自博弈**：对手从智能体自己的历史快照里抽。' },
        { at: 0.6, s: '但只取**前四分之一**的快照，再加一个未训练的对手。' },
        { at: 3.4, s: '玩具例子：已存 ' + POOL.saved + ' 个快照，对手池是前 ' + (POOL.pool - 1) + ' 个加 1 个未训练的，每局抽到某个的概率 1/' + POOL.pool + '。' },
        { at: 5.8, s: '不同对手下同一状态的价值不同，所以 **critic 额外输入对手编号**，避免价值函数混叠。' },
        { at: 8.0, s: '消融：从全部快照里抽，训练不稳、收敛更差；直接对着评测用的 6 个对手训，反而略差于自博弈。' },
        { at: 10.4, s: '「只取前四分之一」让对手变强得慢一点 —— 稳定性来自一个很朴素的选择。' }
      ]
    },
    {
      title: '奖励与安全正则',
      dur: 13,
      build: buildSceneReward,
      cues: [
        { at: 0.3, s: 'Table S3：完整 1v1 智能体一共八项奖励。' },
        { at: 0.6, s: '任务项权重最大：进球 +1000、失球 −1000。' },
        { at: 1.6, s: '塑形项很小：朝球速度 0.05、前进速度 0.1、干扰对手 1、倒地或出界 0.5。' },
        { at: 3.6, s: '剩下两项是为了真机安全：保持直立 0.02、膝关节力矩 0.01。' },
        { at: 5.6, s: '直立奖励：倾角小于 0.2 rad（11.5°）得 1，大于 0.4 rad 得 0，中间线性；倾角 0.3 得 **' + fmt(upright(TILT), 1) + '**。' },
        { at: 7.2, s: '起因：前倾走得更快，但一上真机就容易往前栽。' },
        { at: 8.4, s: '膝关节力矩惩罚：激烈步态和踢球的冲击会**打坏膝关节齿轮**，加了这项以后很少再坏。' },
        { at: 11.0, s: '消融：去掉前进速度奖励，踢球技能根本学不会 —— 速度类塑形是为探索，安全两项是为真机。' }
      ]
    },
    {
      title: '零样本 sim-to-real',
      dur: 13,
      build: buildSceneSim2Real,
      cues: [
        { at: 0.3, s: '整套训练都在 MuJoCo 仿真里完成，然后**零样本**上真机。三件事缺一不可。' },
        { at: 0.6, s: '① 系统辨识：给电机正弦激励、挂已知负载，只拟合阻尼、电枢惯量、摩擦、最大力矩、比例增益五个参数。' },
        { at: 3.4, s: '② 域随机化，每局采一次：地面摩擦 0.5–1.0、关节零位 ±2.9°、IMU 安装误差、躯干外加 0.5 kg、观测延迟 10–50 ms。' },
        { at: 5.0, s: '作者刻意**只挑少数几个轴**：随机化太多，策略会变得保守。' },
        { at: 6.4, s: '③ 随机推搡：每 1–3 秒，在躯干随机一点推一下，持续 0.05–0.15 秒。' },
        { at: 8.6, s: '没有随机化和推搡，真机上每走一两步就摔，一个球也进不了。' },
        { at: 10.0, s: '舵机用「带力矩反馈的位置控制」建模；试过直接电流控制，仿真和真机差距太大，零样本失败。' }
      ]
    },
    {
      title: '实验读数与边界',
      dur: 14,
      build: buildSceneResults,
      cues: [
        { at: 0.3, s: 'Table 1，真机上学到的策略对比 OP3 手调的脚本控制器：' },
        { at: 0.6, s: '行走 0.20 → **0.57 m/s**，转身 0.71 → **2.85 rad/s**。' },
        { at: 3.0, s: '起身 2.52 → **0.93 s**；原地踢球两者都约 2 m/s，助跑后达到 **2.77 m/s**，最快 3.4 m/s。' },
        { at: 5.8, s: '起身射门定位球：真机 50 局进 29 个（58%），仿真 35 个（70%）；真机每局都起身并踢到球。' },
        { at: 8.0, s: '自己学出来的行为：用脚掌一角支点转身、站位防守、逼近持球对手时改碎步。' },
        { at: 10.2, s: '局限：靠动捕拿位置；舵机没建模，对电量敏感，一块电池只能跑 5–10 分钟；只做了小尺寸机器人。' },
        { at: 12.2, s: '没有参考动作、没有手写步态：深度 RL、两段训练和针对性随机化，就让一台廉价小人形踢起了球。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '七幕动画：OP3 足球全流程速览',
      sub: '约 90 秒自动播放。空格播放/暂停，← → 换幕；手算例子与笔记「🚶 具体实例」用的是同一组数字。',
      ariaLabel: 'OP3 足球七幕讲解动画',
      notes: [
        '取数依据：机器人与控制来自 Materials and Methods；两阶段训练与式 (2)(3) 来自 Training；奖励权重来自附录 Table S3；系统辨识、域随机化与推搡来自 Sim-to-Real Transfer；实验数字来自 Table 1、Behavior Analysis 与图 7。',
        '第一幕的滤波响应、第二幕的姿态误差、第三幕的 $\\lambda$ 曲线、第四幕的 40 个快照、第五幕的倾角 0.3 rad 是笔记构造的**玩具数**；第三幕的曲线形状是示意，不是论文的训练曲线。',
        '第二幕关于奖励符号的说法、第七幕关于 181% / 302% 与四舍五入的说法，都是笔者的推测，已在画面里标明。'
      ],
      scenes: SOCCER_SCENES
    });
  }

  // ─── the narrated vertical video of the same seven scenes ─────────────
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：OP3 足球七幕全流程',
      sub: '6 分 45 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的七幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '9.2 MB',
      fileName: 'OP3足球_讲解视频.mp4'
    });
  }

  K.mount({
    'soccer-explainer': buildExplainerDemo,
    'soccer-video': buildVideoDemo
  });
})();
