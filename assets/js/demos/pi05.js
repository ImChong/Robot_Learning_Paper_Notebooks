/* π0.5 demos for
 * papers/03_High_Impact_Selection/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["pi05"]`, after assets/js/demos/kit.js. The note itself only holds
 * empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   pi05-explainer — 七幕讲解动画：开放世界的难题 → 异构数据配方 → 一个模型两层推理
 *                    → 离散预训练 + 连续后训练 → 输入输出与部署 → 训练环境数量 → 消融：什么最重要
 *   pi05-video     — 同样七幕的配音竖屏视频（可下载）
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
    sceneSvg = K.sceneSvg;

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_MUTED = X.muted,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2;

  // ─── shared numbers (the note's worked example uses the same ones) ──────
  var MIX = { mmHours: 400, homes: 100, otherPct: 97.6 };
  var STAGE = { preSteps: 280, postSteps: 80, alphaPre: 0, alphaPost: 10, denoise: 10 };
  var LOCS = [3, 12, 22, 53, 82, 104];

  /* 第五幕：openpi 的离散状态（256 个桶）与分位数归一化 —— 玩具值 */
  var STATE_BIN = (function () {
    var x = 0.3, nb = 256;
    var edges = [];
    for (var i = 0; i < nb; i++) edges.push(-1 + (2 * i) / nb);
    var idx = 0;
    for (var j = 0; j < nb; j++) if (edges[j] <= x) idx = j;
    return { x: x, bin: idx, lo: edges[idx], hi: edges[idx] + 2 / nb };
  })();
  var QNORM = (function () {
    var q01 = -0.8, q99 = 1.2, a = 0.2;
    return { q01: q01, q99: q99, a: a, v: (2 * (a - q01)) / (q99 - q01) - 1 };
  })();

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

  // ── scene 1: 开放世界的难题 ──
  function buildSceneProblem() {
    var s = sceneSvg('目标是在训练时从没见过的家里清理厨房和卧室；预训练阶段 97.6% 的样本并不来自家里的移动机械臂');
    s.appendChild(svgText(40, 30, '任务：走进一个**从没见过**的家，用一句话让它收拾厨房或卧室', 'demo-x-ink2', 13.5)).textContent = '任务：走进一个从没见过的家，用一句话让它收拾厨房或卧室';

    var levels = [
      card(s, 30, 50, 240, 120, C_GOOD, '数据里常见的动作', ['拿起刀、拿起盘子', '场景和物体够多就能泛化']),
      card(s, 280, 50, 240, 120, C_WARN, '要改造、重排的技能', ['同样的抓放，换个顺序', '或换一种新用法']),
      card(s, 530, 50, 240, 120, C_BAD, '要靠语义常识的判断', ['该开哪个抽屉？', '台面上哪个是沥水架？'])
    ];

    var BX0 = 60, BW = 680;
    var bar = svgEl('g', {});
    bar.appendChild(svgText(BX0, 206, '第一阶段（预训练）样本从哪来', 'demo-x-mut', 11));
    var other = paint(svgEl('rect', { x: BX0, y: 216, width: 0, height: 34, rx: 4, 'fill-opacity': 0.8 }), C_ACCENT);
    var mm = paint(svgEl('rect', { x: BX0 + BW, y: 216, width: 0, height: 34, rx: 4, 'fill-opacity': 0.9 }), C_GOOD);
    bar.appendChild(other);
    bar.appendChild(mm);
    var otherTag = paint(svgText(BX0 + 12, 238, '其他来源 ' + fmt(MIX.otherPct, 1) + '%：别的机器人、实验室数据、网页数据', null, 11), null);
    bar.appendChild(otherTag);
    bar.appendChild(paint(svgText(BX0 + BW, 272, '家里的移动机械臂 ' + fmt(100 - MIX.otherPct, 1) + '%（约 ' + MIX.mmHours + ' 小时，约 ' + MIX.homes + ' 个家）', 'demo-x-mono', 10.5, 'end'), C_GOOD));
    s.appendChild(bar);

    var chips = [
      readoutChip(s, 215, 296, 350, '一次任务的长度（真机）', '10–15 分钟', C_ACCENT),
      readoutChip(s, 585, 296, 350, '评测的家', '全部不在训练集', C_BAD)
    ];
    var foot = svgRich(400, 372, '关键不在把机器人数据堆到每个家，而在于**从别的来源迁移知识**', { size: 13.5, anchor: 'middle', w: 760 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      levels.forEach(function (c, k) { setOpacity(c, seg(t, 0.8 + k * 1.2, 1.4 + k * 1.2)); });
      setOpacity(bar, seg(t, 4.8, 5.4));
      var p = ease(seg(t, 5.2, 6.8));
      var wOther = BW * (MIX.otherPct / 100) * p;
      other.setAttribute('width', wOther.toFixed(1));
      var wMM = BW * ((100 - MIX.otherPct) / 100) * ease(seg(t, 6.8, 7.6));
      mm.setAttribute('x', (BX0 + BW - wMM).toFixed(1));
      mm.setAttribute('width', wMM.toFixed(1));
      setOpacity(otherTag, seg(t, 6.2, 6.8));
      chips.forEach(function (c, k) { setOpacity(c, seg(t, 8.4 + k * 0.4, 9.0 + k * 0.4)); });
      setOpacity(foot, seg(t, 10.2, 11.0));
    }
    return { el: s, draw: draw };
  }

  // ── scene 2: 异构数据配方（图 4） ──
  var SOURCES = [
    { key: 'MM', name: '多环境移动机械臂', note: '约 400 h，约 100 个家', pre: true, post: true },
    { key: 'ME', name: '多环境非移动机械臂', note: '固定在台面的单 / 双臂，更多的家', pre: true, post: true },
    { key: 'CE', name: '实验室跨本体 + OXE', note: '收餐桌、叠衬衫……也有磨咖啡豆', pre: true, post: false },
    { key: 'HL', name: '高层子任务预测', note: '人工标子任务 + 边界框', pre: true, post: true },
    { key: 'WD', name: '多模态网页数据', note: '描述、问答、物体定位', pre: true, post: true },
    { key: 'VI', name: '口头指令示范', note: '专家用语言一步步「遥操作」', pre: false, post: true }
  ];
  function buildSceneData() {
    var s = sceneSvg('六类数据：移动机械臂、非移动机械臂、实验室跨本体、高层子任务、网页数据在预训练里都用；后训练去掉实验室数据、加入口头指令');
    s.appendChild(svgText(40, 30, '图 4：六类数据，两个阶段取用不同', 'demo-x-ink2', 13.5));
    s.appendChild(svgText(560, 62, '预训练', 'demo-x-mut', 11, 'middle'));
    s.appendChild(svgText(660, 62, '后训练', 'demo-x-mut', 11, 'middle'));
    var rows = SOURCES.map(function (src, k) {
      var y = 76 + k * 44;
      var g = svgEl('g', {});
      var robot = k < 3;
      g.appendChild(box(40, y, 460, 36, robot ? C_GOOD : C_ACCENT, 1.4));
      g.appendChild(paint(svgText(56, y + 23, src.key, 'demo-x-mono', 12.5), robot ? C_GOOD : C_ACCENT));
      g.appendChild(svgText(100, y + 23, src.name, null, 11.5));
      g.appendChild(svgText(488, y + 23, src.note, 'demo-x-mut', 10, 'end'));
      [[src.pre, 560], [src.post, 660]].forEach(function (cell) {
        g.appendChild(paint(svgText(cell[1], y + 24, cell[0] ? '✓' : '—', null, 15, 'middle'), cell[0] ? C_GOOD : C_BAD));
      });
      s.appendChild(g);
      return g;
    });
    var foot = svgRich(400, 360, '后训练：MM、ME 只留**成功且不太长**的片段；去掉 CE 聚焦移动操作；新加 VI 强化高层', { size: 12.5, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);
    var note = svgText(400, 392, '所有动作数据：按每维 1% / 99% 分位数归一化到 [−1, 1]，维度补零到最大的那台机器人', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(note);

    function draw(t) {
      rows.forEach(function (g, k) { setOpacity(g, seg(t, 0.6 + k * 1.3, 1.1 + k * 1.3)); });
      setOpacity(foot, seg(t, 9.4, 10.2));
      setOpacity(note, seg(t, 11.0, 11.6));
    }
    return { el: s, draw: draw };
  }

  // ── scene 3: 一个模型，两层推理 ──
  var ROLLOUT = ['pull out the top right drawer', 'pick up tong', 'put tong into drawer', 'push the top drawer'];
  function buildSceneHierarchy() {
    var s = sceneSvg('同一个模型先根据总任务预测子任务文本，再根据子任务生成动作块；动作分布只依赖子任务，不依赖总任务');
    var f = svgMath(400, 36, '\\pi_\\theta(a_{t:t+H}, \\hat\\ell \\mid o_t, \\ell) = \\pi_\\theta(a_{t:t+H} \\mid o_t, \\hat\\ell)\\;\\pi_\\theta(\\hat\\ell \\mid o_t, \\ell)', { size: 13, anchor: 'middle', w: 700 });
    s.appendChild(f);
    var arrow = K.arrowMarker(s, 'pi05-x-arrow-hl', C_MUTED);

    var cmd = svgEl('g', {});
    cmd.appendChild(box(30, 86, 200, 60, C_WARN, 2));
    cmd.appendChild(svgRich(44, 108, '总任务 $\\ell$（人给的）', { size: 10.5, cls: 'demo-x-mut', w: 180 }));
    cmd.appendChild(paint(svgText(130, 132, '"put the items in the drawer"', 'demo-x-mono', 9.5, 'middle'), C_WARN));
    s.appendChild(cmd);

    var hl = svgEl('g', {});
    hl.appendChild(line(230, 116, 282, 116, C_MUTED, 1.4, null, arrow));
    hl.appendChild(box(284, 86, 220, 60, C_ACCENT, 2));
    hl.appendChild(svgRich(298, 108, '高层：文本自回归 $\\hat\\ell$', { size: 10.5, cls: 'demo-x-mut', w: 200 }));
    var sub = paint(svgText(394, 132, '', 'demo-x-mono', 9.5, 'middle'), C_ACCENT);
    hl.appendChild(sub);
    s.appendChild(hl);

    var ll = svgEl('g', {});
    ll.appendChild(line(504, 116, 556, 116, C_MUTED, 1.4, null, arrow));
    ll.appendChild(box(558, 86, 212, 60, C_GOOD, 2));
    ll.appendChild(svgRich(572, 108, '低层：动作专家 10 步去噪', { size: 10.5, cls: 'demo-x-mut', w: 190 }));
    ll.appendChild(paint(svgText(664, 132, '50 Hz 动作块', 'demo-x-mono', 10, 'middle'), C_GOOD));
    s.appendChild(ll);

    var steps = svgEl('g', {});
    steps.appendChild(svgText(40, 184, '图 7 家 1 的一段真实输出（蓝色是模型预测的子任务）', 'demo-x-mut', 10.5));
    var stepNodes = ROLLOUT.map(function (r, k) {
      var g = svgEl('g', {});
      g.appendChild(box(40 + k * 184, 196, 172, 44, C_ACCENT, 1.2));
      g.appendChild(paint(svgText(126 + k * 184, 222, r, 'demo-x-mono', 9.5, 'middle'), C_ACCENT));
      steps.appendChild(g);
      return g;
    });
    s.appendChild(steps);

    var why = svgEl('g', {});
    [
      ['同一个模型：', '高层和低层是同一组权重，不是 SayCan 那样的两个模型', C_ACCENT],
      ['像思维链：', '先「想」下一步做什么，再按这一步出动作；高层频率低于低层', C_GOOD]
    ].forEach(function (row, k) {
      why.appendChild(paint(svgText(40, 280 + k * 30, row[0], null, 11.5), row[2]));
      why.appendChild(svgText(130, 280 + k * 30, row[1], 'demo-x-ink2', 11));
    });
    s.appendChild(why);
    var foot = svgRich(400, 380, '动作只条件在 $\\hat\\ell$ 上：高层吃网页和语言数据，低层吃别的机器人的动作数据', { size: 13, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(f, seg(t, 0.3, 0.9));
      setOpacity(cmd, seg(t, 1.4, 2.0));
      setOpacity(hl, seg(t, 2.4, 3.0));
      var k = Math.min(ROLLOUT.length - 1, Math.floor(ROLLOUT.length * seg(t, 5.0, 8.6)));
      sub.textContent = t > 2.6 ? ROLLOUT[t < 5.0 ? 0 : k] : '';
      setOpacity(ll, seg(t, 3.6, 4.2));
      setOpacity(steps, seg(t, 5.0, 5.4));
      stepNodes.forEach(function (g, i) { setOpacity(g, seg(t, 5.0 + i * 0.9, 5.4 + i * 0.9)); });
      setOpacity(why, seg(t, 8.8, 9.4));
      setOpacity(foot, seg(t, 10.4, 11.2));
    }
    return { el: s, draw: draw };
  }

  // ── scene 4: 离散预训练 + 连续后训练（式 1） ──
  function buildSceneStages() {
    var s = sceneSvg('预训练时所有输出都是离散 token（动作用 FAST），alpha 为 0；后训练加入随机初始化的动作专家，用流匹配，alpha 为 10');
    var f = svgMath(400, 38, '\\mathbb{E}\\Big[\\,H\\big(x_{1:M},\\, f^\\ell_\\theta(o_t, \\ell)\\big) + \\alpha\\,\\big\\lVert \\omega - a_{t:t+H} - f^a_\\theta(a^{\\tau,\\omega}_{t:t+H}, o_t, \\ell)\\big\\rVert^2 \\Big]', { size: 12.5, anchor: 'middle', w: 760 });
    s.appendChild(f);
    var tags = svgEl('g', {});
    tags.appendChild(svgRich(200, 70, '交叉熵：文本 + FAST 动作 token', { size: 10.5, anchor: 'middle', w: 260 }).setTone(C_ACCENT));
    tags.appendChild(svgRich(560, 70, '流匹配：动作专家输出连续动作', { size: 10.5, anchor: 'middle', w: 260 }).setTone(C_GOOD));
    s.appendChild(tags);

    var st1 = svgEl('g', {});
    st1.appendChild(box(30, 92, 360, 170, C_ACCENT, 2));
    st1.appendChild(paint(svgText(46, 116, '阶段 1 · 预训练', null, 13), C_ACCENT));
    st1.appendChild(svgRich(46, 144, '$\\alpha = 0$：就是一个标准 VLM，下一个 token 预测', { size: 10.5, cls: 'demo-x-ink2', w: 330 }));
    st1.appendChild(svgText(46, 168, '动作先用 FAST 压缩成离散 token', 'demo-x-ink2', 10.5));
    st1.appendChild(svgText(46, 190, 'MM · ME · CE · HL · WD 全部数据', 'demo-x-ink2', 10.5));
    st1.appendChild(paint(svgText(374, 246, STAGE.preSteps + 'k 步', 'demo-x-mono', 13, 'end'), C_ACCENT));
    st1.appendChild(svgText(46, 246, '训练快、稳，语言跟随好', 'demo-x-mut', 10));
    s.appendChild(st1);

    var st2 = svgEl('g', {});
    st2.appendChild(box(410, 92, 360, 170, C_GOOD, 2));
    st2.appendChild(paint(svgText(426, 116, '阶段 2 · 后训练', null, 13), C_GOOD));
    st2.appendChild(svgRich(426, 144, '加入**随机初始化**的动作专家，$\\alpha = 10$', { size: 10.5, cls: 'demo-x-ink2', w: 330 }));
    st2.appendChild(svgText(426, 168, '同时保留下一个 token 预测（文本能力不丢）', 'demo-x-ink2', 10.5));
    st2.appendChild(svgText(426, 190, '推理：先自回归出子任务，再 10 步去噪', 'demo-x-ink2', 10.5));
    st2.appendChild(paint(svgText(754, 246, STAGE.postSteps + 'k 步', 'demo-x-mono', 13, 'end'), C_GOOD));
    st2.appendChild(svgText(426, 246, '连续、细粒度、实时', 'demo-x-mut', 10));
    s.appendChild(st2);

    var mask = svgEl('g', {});
    mask.appendChild(box(30, 278, 740, 56, C_WARN, 1.6));
    mask.appendChild(paint(svgText(46, 300, '注意力约束（附录 E 图 18）', null, 11.5), C_WARN));
    mask.appendChild(svgText(46, 322, '动作专家看得到前缀，但看不到 FAST 动作 token —— 两种动作表示互不泄漏；VLM 一侧也不看动作专家', 'demo-x-ink2', 10.5));
    s.appendChild(mask);

    var foot = svgRich(400, 384, '符号细节：本文写速度 $\\omega - a$，和 π₀ 论文的 $A - \\epsilon$ 正好反号（插值式相同）', { size: 12, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(f, seg(t, 0.3, 0.9));
      setOpacity(tags, seg(t, 1.2, 1.8));
      setOpacity(st1, seg(t, 3.0, 3.6));
      setOpacity(st2, seg(t, 6.0, 6.6));
      setOpacity(mask, seg(t, 9.0, 9.6));
      setOpacity(foot, seg(t, 11.0, 11.8));
    }
    return { el: s, draw: draw };
  }

  // ── scene 5: 输入输出与部署 ──
  function buildSceneSystem() {
    var s = sceneSvg('状态以离散文本 token 输入，时间步用 adaRMSNorm 注入动作专家；两类移动机械臂 18 或 19 自由度，50 Hz 目标值交给 PD 跟踪');
    s.appendChild(svgRich(40, 30, '和 $\\pi_0$ 的三处结构差别（附录 E + openpi 的 `pi05` 分支）', { size: 13.5, cls: 'demo-x-ink2', w: 720 }));

    var diffs = [
      card(s, 30, 46, 240, 150, C_ACCENT, '状态变成文本', ['每维离散到 256 个桶', '玩具：$x = ' + fmt(STATE_BIN.x, 1) + '$ → 第 **' + STATE_BIN.bin + '** 桶', '写进 prompt，走 VLM 权重']),
      card(s, 280, 46, 240, 150, C_GOOD, '时间走 adaRMSNorm', ['$\\tau$ 单独过 MLP', '每层 RMSNorm 的缩放 / 平移 / 门控', '不再和带噪动作拼接']),
      card(s, 530, 46, 240, 150, C_WARN, '动作视界的写法', ['附录：视界 50，「即 $H = 49$」', '笔者推测按 $a_{t:t+H}$ 含两端计', 'openpi 默认 `action_horizon=50`'])
    ];

    var robot = svgEl('g', {});
    robot.appendChild(box(30, 212, 740, 110, C_BORDER, 1.4));
    robot.appendChild(paint(svgText(46, 236, '两款移动机械臂（图 5）', null, 12), C_GOOD));
    [
      '两条 6 自由度臂 + 平行夹爪 · 全向底盘（线速度 2 维 + 角速度 1 维） · 升降躯干 1–2 维 → 18 / 19 维',
      '四路相机：前、后、两个手腕；高层用全部四路，低层只用手腕 + 前向三路',
      '输出 50 Hz 的目标位姿与底盘速度，交给简单 PD 跟踪 —— 没有轨迹规划，也没有碰撞检测'
    ].forEach(function (ln, k) {
      robot.appendChild(svgText(46, 262 + k * 22, ln, 'demo-x-ink2', 10.5));
    });
    s.appendChild(robot);

    var chip = readoutChip(s, 400, 336, 500, '分位数归一化玩具：$q_{01} = -0.8$，$q_{99} = 1.2$，$a = 0.2$', '→ ' + fmt(QNORM.v, 2), C_ACCENT);
    var foot = svgRich(400, 400, '所有操作和导航都是端到端的：模型直接出关节目标和底盘速度', { size: 13, anchor: 'middle', w: 760 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      diffs.forEach(function (c, k) { setOpacity(c, seg(t, 0.6 + k * 2.0, 1.2 + k * 2.0)); });
      setOpacity(robot, seg(t, 6.8, 7.4));
      setOpacity(chip, seg(t, 9.4, 10.0));
      setOpacity(foot, seg(t, 10.6, 11.4));
    }
    return { el: s, draw: draw };
  }

  // ── scene 6: 训练环境数量的扩展（图 8–9） ──
  function buildSceneScaling() {
    var s = sceneSvg('用 3 到 104 个训练地点的移动操作数据分别后训练，训练步数相同；地点越多，陌生环境里的表现越好，104 个地点接近在测试家里训练过的对照');
    s.appendChild(svgText(40, 30, '§V-B：只改后训练里移动操作数据来自多少个地点（每个都训 40k 步）', 'demo-x-ink2', 13.5));

    var BX0 = 70, BY0 = 280, BY1 = 80;
    var bars = LOCS.map(function (n, k) {
      var x = BX0 + k * 92;
      var h = (BY0 - BY1) * (0.28 + 0.62 * Math.log(n) / Math.log(104));
      var g = svgEl('g', {});
      var r = paint(svgEl('rect', { x: x, y: BY0, width: 56, height: 0, rx: 4, 'fill-opacity': 0.75 }), C_ACCENT);
      g.appendChild(r);
      g.appendChild(svgText(x + 28, BY0 + 18, String(n), 'demo-x-mono', 11, 'middle'));
      s.appendChild(g);
      return { g: g, r: r, h: h };
    });
    s.appendChild(svgText(BX0 + 5 * 92 + 28, BY0 + 34, '训练地点数', 'demo-x-mut', 10, 'middle'));
    var ctrlY = BY0 - (BY0 - BY1) * 0.92;
    var ctrl = svgEl('g', {});
    ctrl.appendChild(line(BX0 - 10, ctrlY, BX0 + 5 * 92 + 70, ctrlY, C_GOOD, 1.6, '6 4'));
    ctrl.appendChild(paint(svgText(BX0 + 5 * 92 + 70, ctrlY - 8, '对照：训练集里**包含**测试家', 'demo-x-mono', 10, 'end'), C_GOOD)).textContent = '对照：训练集包含测试家';
    s.appendChild(ctrl);

    var side = svgEl('g', {});
    side.appendChild(box(620, 80, 150, 200, C_BAD, 1.6));
    side.appendChild(paint(svgText(634, 104, '去掉其他协同数据', null, 11), C_BAD));
    ['只用测试家的数据', '或只用 104 个地点', '的移动操作数据', '→ 明显更差'].forEach(function (ln, k) {
      side.appendChild(svgText(634, 132 + k * 22, ln, 'demo-x-ink2', 10.5));
    });
    s.appendChild(side);

    var note = svgText(400, 330, '柱高是示意趋势（对数刻度下单调上升），具体数值见论文图 8、图 9，这里不读图估数', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(note);
    var foot = svgRich(400, 372, '104 个地点的模型 ≈ 在测试家里训练过的对照：**协同训练配方把泛化缺口基本补上**', { size: 13, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      bars.forEach(function (b, k) {
        var p = ease(seg(t, 0.8 + k * 0.8, 1.6 + k * 0.8));
        b.r.setAttribute('y', (BY0 - b.h * p).toFixed(1));
        b.r.setAttribute('height', (b.h * p).toFixed(1));
      });
      setOpacity(ctrl, seg(t, 6.2, 6.8));
      setOpacity(side, seg(t, 8.0, 8.6));
      setOpacity(note, seg(t, 9.4, 10.0));
      setOpacity(foot, seg(t, 10.4, 11.2));
    }
    return { el: s, draw: draw };
  }

  // ── scene 7: 消融：什么最重要（图 10–13） ──
  var HL_RANK = [
    ['1', '$\\pi_{0.5}$ 完整（高层 + 低层），胜过「人当高层」', C_GOOD],
    ['2', 'implicit HL：训练含子任务，推理不显式写', C_GOOD],
    ['·', 'human HL（人当高层的「上界」对照）', C_ACCENT],
    ['·', 'no VI · no WD · no HL：都明显更差', C_WARN],
    ['末', 'GPT-4 零样本当高层：最差', C_BAD]
  ];
  function buildSceneAblations() {
    var s = sceneSvg('去掉跨本体数据明显变差；网页数据主要影响陌生物体和高层推理；高层推理里完整模型最好，隐式高层第二，GPT-4 零样本最差');
    s.appendChild(svgText(40, 30, '消融：每类数据、每种高层推理各值多少（§V-C、V-E）', 'demo-x-ink2', 13.5));

    var left = card(s, 30, 48, 340, 190, C_WARN, '数据配方（图 10、11）', [
      '去掉 ME 或 CE：四个家务任务都**明显变差**',
      '两个都去掉：更差',
      '去掉 WD：家务任务上差异不显著，',
      '但**陌生类别物体**的语言跟随明显变差',
      '对比 π₀、π₀-FAST+Flow：π₀.₅ 显著更好'
    ]);

    var right = svgEl('g', {});
    right.appendChild(box(390, 48, 380, 250, C_ACCENT, 1.8));
    right.appendChild(paint(svgText(404, 72, '高层推理（图 13）：正文给出的名次', null, 12), C_ACCENT));
    var rankNodes = HL_RANK.map(function (r, k) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgText(410, 108 + k * 38, r[0], 'demo-x-mono', 12), r[2]));
      g.appendChild(svgRich(436, 104 + k * 38, r[1], { size: 11, w: 320 }));
      right.appendChild(g);
      return g;
    });
    s.appendChild(right);

    var chip = readoutChip(s, 200, 252, 340, '口头指令 VI 占高层移动操作样本', '约 11%', C_WARN);
    var limits = svgRich(400, 334, '局限：没见过的把手、难打开的柜门、手臂挡住污渍、子任务**来回开关抽屉**；上下文短，没有跨房间记忆', { size: 11.5, anchor: 'middle', w: 780 }).setTone(C_BAD);
    s.appendChild(limits);
    var foot = svgRich(400, 380, '「人当高层」都不如完整 π₀.₅：**高层也要用机器人数据训出来**', { size: 13.5, anchor: 'middle', w: 780 }).setTone(C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(left, seg(t, 0.6, 1.2));
      setOpacity(right, seg(t, 4.0, 4.6));
      rankNodes.forEach(function (g, k) { setOpacity(g, seg(t, 4.4 + k * 0.6, 4.8 + k * 0.6)); });
      setOpacity(chip, seg(t, 8.4, 9.0));
      setOpacity(limits, seg(t, 10.0, 10.6));
      setOpacity(foot, seg(t, 11.6, 12.4));
    }
    return { el: s, draw: draw };
  }

  var PI05_SCENES = [
    {
      title: '开放世界的难题',
      dur: 12,
      build: buildSceneProblem,
      cues: [
        { at: 0.3, s: 'π₀.₅ 的目标：走进一个**训练时从没见过的家**，一句话让它收拾厨房或卧室。' },
        { at: 0.8, s: '作者把泛化分成三层：数据里常见的动作、需要重排改造的技能、以及要靠语义常识的判断。' },
        { at: 4.8, s: '靠在每个家都采机器人数据走不通。预训练阶段 **' + fmt(MIX.otherPct, 1) + '%** 的样本其实不来自家里的移动机械臂。' },
        { at: 6.8, s: '直接相关的移动机械臂数据约 **' + MIX.mmHours + ' 小时**、约 ' + MIX.homes + ' 个家。' },
        { at: 8.4, s: '真机评测全在没见过的家里；完整任务长 10–15 分钟，比如清理整个厨房或卧室。' },
        { at: 10.2, s: '所以关键问题变成：**怎么从别的来源迁移知识**。' }
      ]
    },
    {
      title: '异构数据配方',
      dur: 13,
      build: buildSceneData,
      cues: [
        { at: 0.3, s: '图 4 列了六类数据。前三类有机器人动作：' },
        { at: 0.6, s: '**MM**：约 400 小时、约 100 个家里的移动机械臂数据，和评测最相关。' },
        { at: 1.9, s: '**ME**：固定在台面上的单臂 / 双臂，更轻便，所以采到了更多的家。' },
        { at: 3.2, s: '**CE**：实验室里各种机器人的数据加上 OXE —— 有收餐桌，也有和评测无关的磨咖啡豆。' },
        { at: 4.5, s: '后三类是「非动作」监督：**HL** 人工标注的子任务和边界框，**WD** 网页上的描述、问答和物体定位。' },
        { at: 7.1, s: '**VI** 只在后训练里用：专家用语言一步步指挥机器人，相当于用语言做遥操作。' },
        { at: 9.4, s: '后训练只留成功、不太长的片段，去掉实验室数据 CE，聚焦家里的移动操作。' },
        { at: 11.0, s: '动作一律按每维 1% / 99% 分位数归一化到 $[-1, 1]$，维度补零到最大那台机器人。' }
      ]
    },
    {
      title: '一个模型，两层推理',
      dur: 12,
      build: buildSceneHierarchy,
      cues: [
        { at: 0.3, s: '模型分布拆成两半：先由总任务 $\\ell$ 预测子任务文本 $\\hat\\ell$，再由 $\\hat\\ell$ 生成动作块。' },
        { at: 1.4, s: '人只给一句总任务，比如「把东西放进抽屉」。' },
        { at: 2.4, s: '**高层**：模型自回归地写出下一个子任务，比如「拉开右上抽屉」。' },
        { at: 3.6, s: '**低层**：动作专家按这个子任务做 10 步去噪，出 50 Hz 的动作块。' },
        { at: 5.0, s: '图 7 家 1 的真实输出：拉开抽屉 → 拿起夹子 → 放进抽屉 → 推上抽屉。' },
        { at: 8.8, s: '高层和低层是**同一组权重**，不是 SayCan 那样的两个模型；更像思维链，但高层频率低于低层。' },
        { at: 10.4, s: '动作只条件在 $\\hat\\ell$ 上：高层能吃网页和语言数据，低层能吃别的机器人的动作数据。' }
      ]
    },
    {
      title: '离散预训练 + 连续后训练',
      dur: 13,
      build: buildSceneStages,
      cues: [
        { at: 0.3, s: '式 (1)：交叉熵管文本（包括 FAST 动作 token），流匹配项管动作专家，$\\alpha$ 在两者之间取舍。' },
        { at: 3.0, s: '**阶段 1**：$\\alpha = 0$，所有输出都是离散 token，就是标准的下一个 token 预测，训 **' + STAGE.preSteps + 'k** 步。' },
        { at: 4.6, s: '动作先用 FAST 压成离散 token —— 训练更快、更稳，语言跟随也更好；缺点是推理要自回归解码，太慢。' },
        { at: 6.0, s: '**阶段 2**：加入随机初始化的动作专家，$\\alpha = 10$，再训 **' + STAGE.postSteps + 'k** 步，同时保留文本预测。' },
        { at: 7.6, s: '推理：先自回归写出子任务，再用动作专家做 10 步去噪。' },
        { at: 9.0, s: '注意力约束：动作专家看得到前缀，**看不到 FAST 动作 token**，两种动作表示互不泄漏。' },
        { at: 11.0, s: '符号小坑：本文把速度写成 $\\omega - a$，π₀ 论文写 $A - \\epsilon$，插值式相同，正好反号。' }
      ]
    },
    {
      title: '输入输出与部署',
      dur: 12,
      build: buildSceneSystem,
      cues: [
        { at: 0.3, s: '结构上和 π₀ 有三处差别。' },
        { at: 0.6, s: '① 状态不再是连续向量：每维离散到 256 个桶写进文本。玩具例子，0.3 落在第 **' + STATE_BIN.bin + '** 桶。' },
        { at: 2.6, s: '② 时间步单独过 MLP，用 **adaRMSNorm** 在每层注入动作专家，而不是和带噪动作拼接。' },
        { at: 4.6, s: '③ 动作视界仍是 50；附录写「即 $H = 49$」，笔者推测是按 $a_{t:t+H}$ 两端都算的下标写法。' },
        { at: 6.8, s: '两款移动机械臂 18 / 19 维：两条 6 自由度臂、全向底盘、升降躯干；高层用四路相机，低层用三路。' },
        { at: 9.4, s: '动作按分位数归一化：$q_{01} = -0.8$、$q_{99} = 1.2$ 时，0.2 映射到 ' + fmt(QNORM.v, 2) + '（玩具数）。' },
        { at: 10.6, s: '输出 50 Hz 目标值交给 PD 跟踪，没有轨迹规划和碰撞检测 —— **端到端**。' }
      ]
    },
    {
      title: '训练环境数量的扩展',
      dur: 12,
      build: buildSceneScaling,
      cues: [
        { at: 0.3, s: '§V-B：只改后训练里移动操作数据来自多少个地点 —— 3、12、22、53、82、104。' },
        { at: 0.8, s: '每个模型都训 4 万步、见到的样本数相同，控制住了数据量；预训练里去掉移动操作数据。' },
        { at: 3.0, s: '在没见过的模拟家里评测：四个家务任务的平均表现随地点数上升。' },
        { at: 6.2, s: '104 个地点的模型，和**训练集包含测试家**的对照差不多。' },
        { at: 8.0, s: '如果不用其他协同数据，只用测试家、或只用 104 个地点的数据，都明显更差。' },
        { at: 10.4, s: '这里的柱高只是示意趋势；具体数值请看论文图 8、图 9。' }
      ]
    },
    {
      title: '消融：什么最重要',
      dur: 13,
      build: buildSceneAblations,
      cues: [
        { at: 0.3, s: '§V-C：去掉 ME 或 CE，四个家务任务都**明显变差**；两个都去掉更差。' },
        { at: 1.6, s: '去掉网页数据 WD，家务任务上差异不显著，但遇到**没见过类别的物体**时，语言跟随明显变差。' },
        { at: 3.0, s: '和 π₀、π₀-FAST+Flow 比，π₀.₅ 显著更好；就算把 π₀ 训到 30 万步也一样。' },
        { at: 4.0, s: '§V-E 高层推理：完整 π₀.₅ 最好，**连人当高层的「上界」对照都不如它**。' },
        { at: 5.6, s: '第二是 implicit HL：推理时不显式写子任务，但训练里有子任务数据 —— 大部分好处来自训练配方本身。' },
        { at: 8.4, s: '去掉口头指令 VI（只占高层移动操作样本的约 **11%**）、网页数据 WD、或子任务数据 HL 都明显更差；GPT-4 零样本当高层最差。' },
        { at: 10.0, s: '局限：陌生把手、难打开的柜门、手臂挡住污渍、子任务来回开关抽屉；上下文短，没有跨房间记忆。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '七幕动画：π₀.₅ 全流程速览',
      sub: '约 87 秒自动播放。空格播放/暂停，← → 换幕；手算例子与笔记「🚶 具体实例」用的是同一组数字。',
      ariaLabel: 'π₀.₅ 七幕讲解动画',
      notes: [
        '取数依据：97.6%、约 400 小时 / 约 100 个家来自 §I 与 §IV-C；六类数据与两阶段取用来自图 4 与 §IV-C–D；式 (1)、280k / 80k 步、$\\alpha = 10$ 来自 §IV-B–D；机器人与控制来自 §IV-E；地点数实验来自 §V-B；消融来自 §V-C–E。',
        '第五幕的状态分桶（256 桶）与 adaRMSNorm 实现对照了 openpi 的 `pi05` 分支；$x = 0.3$ 与分位数 $-0.8 / 1.2$ 是笔记构造的**玩具数**。',
        '第六幕的柱高是**示意趋势**，不是论文数值；第七幕的高层推理排序转述自正文与图 13 的结论，没有读图估数。'
      ],
      scenes: PI05_SCENES
    });
  }

  // ─── the narrated vertical video of the same seven scenes ─────────────
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：π₀.₅ 七幕全流程',
      sub: '6 分 27 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的七幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '8.7 MB',
      fileName: 'pi05_讲解视频.mp4'
    });
  }

  K.mount({
    'pi05-explainer': buildExplainerDemo,
    'pi05-video': buildVideoDemo
  });
})();
