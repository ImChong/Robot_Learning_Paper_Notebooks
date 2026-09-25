/* Interactive GMR demos for
 * papers/02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["gmr"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   gmr-explainer — 七幕讲解动画：retargeting 被当成前处理脚本 → 一条管线接 5 种格式 ×
 *                   18+ 款机器人 → 论文的五步显式流程 → 非均匀局部缩放为什么是关键 →
 *                   mink + DAQP 的两阶段约束 IK → 「Retargeting Matters」的定量论据 →
 *                   闭环、已知失败与源码落点
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
  /* 「通用」这两个字的规模：README 的 18+ 款人形 × 5 种人体动作格式。
     过去每家自己写脚本，等于每个组合各写一份。 */
  var N_ROBOTS = 18,
    N_FORMATS = 5;
  var N_PATHS = N_ROBOTS * N_FORMATS; // 90 条「格式 → 机器人」通路

  /* README 报的两档 CPU 吞吐，换算成每帧毫秒与相对 30 fps mocap 的实时倍率。 */
  var MOCAP_FPS = 30;
  var CPUS = [
    { n: 'AMD Ryzen Threadripper 7960X', lo: 60, hi: 70, c: C_GOOD },
    { n: 'Intel Core i9-13900K', lo: 35, hi: 45, c: C_ACCENT }
  ];

  function midFps(cpu) {
    return (cpu.lo + cpu.hi) / 2;
  }
  function msPerFrame(fps) {
    return 1000 / fps;
  }
  function realtime(fps) {
    return fps / MOCAP_FPS;
  }

  /* `motion_retarget.py` 里写死的四个 IK 超参。关节速度限位是唯一一个
     「带单位」的，把它按 mocap 帧率换算，就知道单帧最多允许转多少度。 */
  var LM_DAMPING = 0.5,
    MAX_ITERS = 10,
    IK_TOL = 0.001;
  var VEL_LIMIT = 3 * Math.PI; // rad/s ≈ 9.42
  var STEP_LIMIT_RAD = VEL_LIMIT / MOCAP_FPS; // 单帧 0.314 rad
  var STEP_LIMIT_DEG = (STEP_LIMIT_RAD * 180) / Math.PI; // 18°

  /* 第四幕的玩具算例：比例取自笔记 Q7 的量级说法（手臂差 ~20%、腿差 ~15%、
     躯干几乎一样），不是论文测得的数值。全局等比例只能取一个缩放因子，
     这里取三条链的平均；非均匀缩放则每条链各自取自己的比例，残差归零。 */
  var CHAINS = [
    { n: '手臂链', ratio: 0.8, len: 60 },
    { n: '腿链', ratio: 0.85, len: 85 },
    { n: '躯干链', ratio: 1.0, len: 50 }
  ];
  var GLOBAL_S =
    CHAINS.reduce(function (a, c) {
      return a + c.ratio;
    }, 0) / CHAINS.length; // 0.883

  function residCm(c) {
    return Math.abs(c.ratio - GLOBAL_S) * c.len;
  }
  var RESID_SUM = CHAINS.reduce(function (a, c) {
    return a + residCm(c);
  }, 0); // ≈ 13.7 cm

  /* 实验那一幕的两个可以现算的数字。 */
  var LAFAN_SEQS = 21,
    PERFECT_SEQS = 3;
  var PERFECT_PCT = (100 * PERFECT_SEQS) / LAFAN_SEQS; // 14.3%
  var HARD_SEQS = LAFAN_SEQS - PERFECT_SEQS; // 18
  var USERS = 20,
    INIT_FRAME_GAP = 50; // 个百分点

  // ─── 第 1 幕：retargeting 被当成前处理脚本 ────────────────────────────
  var S1_PIPE = [
    { t: '人类 mocap', d: 'SMPL-X / BVH', c: C_MUTED, w: 150 },
    { t: '[ 某种 retargeting 脚本 ]', d: '每篇论文自己写一份', c: C_WARN, w: 200, dash: true },
    { t: '机器人关节轨迹', d: 'root + dof_pos', c: C_MUTED, w: 150 },
    { t: 'RL tracking policy', d: '跟不跟得上，看上一步', c: C_MUTED, w: 150 }
  ];

  var S1_PAINS = [
    { t: '① 当成前处理脚本，其实是瓶颈', d: '参考动作本身不可行（超关节限位 / 脚穿地板 / 自碰撞），', d2: 'RL 要么追不上，要么追上了 sim-to-real 也崩' },
    { t: '② 每家一套配方，互不兼容', d: 'OmniH2O 自家参数化、ExBody2 自家 loss、', d2: 'OmniXtreme 又一套；换机器人就得重写一遍' },
    { t: '③ 很多实现要 GPU 甚至 CUDA', d: '「带笔记本进实验室做遥操 demo」这种场景里，', d2: 'GPU 依赖本身就是障碍' }
  ];

  function buildSceneProblem() {
    var s = sceneSvg(
      'humanoid tracking 的默认流程里，retargeting 被当成一段前处理脚本；' +
        '论文指出它其实是瓶颈：各家配方互不兼容、质量直接决定下游 RL 能否跟上、很多实现还依赖 GPU'
    );
    s.appendChild(svgText(56, 28, '几乎每篇 humanoid tracking 论文都有这条默认流程', 'demo-x-ink2', 13.5));

    var arrow = K.arrowMarker(s, 'gmr-x-arrow-pipe', C_BORDER);
    var x = 40;
    var pipe = S1_PIPE.map(function (p, k) {
      var g = svgEl('g', {});
      var attrs = { x: x, y: 50, width: p.w, height: 54, rx: 8, 'stroke-width': p.dash ? 1.6 : 1.2 };
      if (p.dash) attrs['stroke-dasharray'] = '5 4';
      g.appendChild(paint(svgEl('rect', attrs), p.dash ? C_SURFACE : C_SURFACE2, p.c));
      g.appendChild(paint(svgText(x + p.w / 2, 73, p.t, null, p.dash ? 12 : 11.5, 'middle'), p.c));
      g.appendChild(svgText(x + p.w / 2, 92, p.d, 'demo-x-mut', 9, 'middle'));
      s.appendChild(g);
      if (k < S1_PIPE.length - 1) {
        s.appendChild(
          paint(
            svgEl('path', { d: polyPath([[x + p.w + 4, 77], [x + p.w + 18, 77]]), fill: 'none', 'stroke-width': 1.5, 'marker-end': arrow }),
            null,
            C_BORDER
          )
        );
      }
      x += p.w + 22;
      return { g: g, at: 0.4 + k * 0.6 };
    });

    var ring = paint(
      svgEl('rect', { x: 206, y: 42, width: 216, height: 70, rx: 10, fill: 'none', 'stroke-width': 1.8, 'stroke-dasharray': '6 4' }),
      null,
      C_BAD
    );
    s.appendChild(ring);

    var pains = S1_PAINS.map(function (p, k) {
      var g = svgEl('g', {});
      var px = 40 + k * 246;
      g.appendChild(paint(svgEl('rect', { x: px, y: 132, width: 234, height: 96, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, C_BAD));
      g.appendChild(paint(svgText(px + 16, 156, p.t, null, 11.5), C_BAD));
      g.appendChild(svgText(px + 16, 180, p.d, 'demo-x-mut', 9, 'start'));
      g.appendChild(svgText(px + 16, 198, p.d2, 'demo-x-mut', 9, 'start'));
      s.appendChild(g);
      return { g: g, at: 3.2 + k * 1.2 };
    });

    var band = svgEl('g', {});
    band.appendChild(paint(svgEl('rect', { x: 40, y: 246, width: 720, height: 60, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, C_ACCENT));
    band.appendChild(paint(svgText(400, 270, '标题里的 “Matters” 是在叫板：把 retargeting 提到和 policy learning / sim-to-real 同一级', null, 12.5, 'middle'), C_ACCENT));
    band.appendChild(svgText(400, 292, '把这块从各家附录里砍下来单独发表，后续工作才能显式引用它、讨论它', 'demo-x-mut', 10, 'middle'));
    s.appendChild(band);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 352, '翻译这一步没做好，后面训得再久也追不上', null, 15.5, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 378, 'GMR 的答案：一套通用、快速、CPU-only、全开源的管线', 'demo-x-mut', 11, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      pipe.forEach(function (p) {
        setOpacity(p.g, seg(t, p.at, p.at + 0.4));
      });
      setOpacity(ring, seg(t, 2.6, 3.2));
      pains.forEach(function (p) {
        setOpacity(p.g, seg(t, p.at, p.at + 0.5));
      });
      setOpacity(band, seg(t, 7.6, 8.4));
      setOpacity(foot, seg(t, 9.8, 10.6));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 2 幕：一条管线，5 种格式 × 18+ 款机器人 ───────────────────────
  var S2_FORMATS = [
    { t: 'SMPL-X', d: 'AMASS / OMOMO' },
    { t: 'BVH', d: 'LAFAN1 / Nokov' },
    { t: 'FBX', d: 'OptiTrack' },
    { t: 'Xsens MVN', d: '惯性动捕' },
    { t: 'GVHMR', d: '单目视频' }
  ];

  var S2_ROBOTS = [
    { t: 'Unitree G1', d: '29 DOF' },
    { t: 'Unitree H1', d: '19 DOF' },
    { t: 'Unitree H1-2', d: '27 DOF' },
    { t: 'Booster T1 / K1', d: 'Fourier N1 / GR3' },
    { t: '… 共 ' + N_ROBOTS + '+ 款', d: 'ik_configs/*.yaml' }
  ];

  function buildSceneGeneral() {
    var s = sceneSvg(
      'GMR 用一条管线把 5 种人体动作格式翻译到 18 款以上的人形机器人，' +
        '共 ' + N_PATHS + ' 条「格式 → 机器人」通路，输出 .pkl 关节轨迹，CPU 上就跑得过实时'
    );
    s.appendChild(svgText(56, 26, 'GMR 里的 “General”：一条管线，两头都可以换', 'demo-x-ink2', 13.5));

    var arrow = K.arrowMarker(s, 'gmr-x-arrow-gen', C_BORDER);

    var fmts = S2_FORMATS.map(function (f, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 146;
      g.appendChild(paint(svgEl('rect', { x: x, y: 44, width: 134, height: 44, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_ACCENT));
      g.appendChild(paint(svgText(x + 67, 63, f.t, null, 11.5, 'middle'), C_ACCENT));
      g.appendChild(svgText(x + 67, 79, f.d, 'demo-x-mut', 8.5, 'middle'));
      s.appendChild(g);
      s.appendChild(
        paint(
          svgEl('path', { d: polyPath([[x + 67, 90], [x + 67, 104], [400, 104], [400, 116]]), fill: 'none', 'stroke-width': 1.1 }),
          null,
          C_BORDER
        )
      );
      return { g: g, at: 0.4 + k * 0.4 };
    });

    var core = svgEl('g', {});
    core.appendChild(paint(svgEl('rect', { x: 180, y: 118, width: 440, height: 62, rx: 10, 'stroke-width': 1.8 }), C_SURFACE2, C_GOOD));
    core.appendChild(paint(svgText(400, 142, 'GMR · mink + DAQP 的两阶段约束 IK · CPU-only', null, 13.5, 'middle'), C_GOOD));
    core.appendChild(svgText(400, 162, '五步显式流程，确定性、不训练、不装 CUDA；MIT 协议', 'demo-x-mut', 10, 'middle'));
    s.appendChild(core);

    var badge = svgEl('g', {});
    badge.appendChild(paint(svgEl('rect', { x: 640, y: 118, width: 120, height: 62, rx: 8, 'stroke-width': 1.4 }), C_SURFACE, C_WARN));
    badge.appendChild(paint(svgText(700, 143, N_FORMATS + ' × ' + N_ROBOTS + ' = ' + N_PATHS, 'demo-x-mono', 14, 'middle'), C_WARN));
    badge.appendChild(svgText(700, 166, '条通路，一份实现', 'demo-x-mut', 9, 'middle'));
    s.appendChild(badge);

    var robots = S2_ROBOTS.map(function (r, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 146;
      s.appendChild(
        paint(
          svgEl('path', { d: polyPath([[400, 182], [400, 196], [x + 67, 196], [x + 67, 208]]), fill: 'none', 'stroke-width': 1.1, 'marker-end': arrow }),
          null,
          C_BORDER
        )
      );
      g.appendChild(paint(svgEl('rect', { x: x, y: 210, width: 134, height: 44, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_MUTED));
      g.appendChild(paint(svgText(x + 67, 229, r.t, null, 11.5, 'middle'), C_MUTED));
      g.appendChild(svgText(x + 67, 245, r.d, 'demo-x-mut', 8.5, 'middle'));
      s.appendChild(g);
      return { g: g, at: 4.2 + k * 0.4 };
    });

    var out = svgEl('g', {});
    out.appendChild(paint(svgEl('rect', { x: 40, y: 268, width: 720, height: 50, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, C_BORDER));
    out.appendChild(svgText(58, 288, '输出一个 .pkl，直接喂 RL tracking 策略或 PD 控制器：', 'demo-x-ink2', 10.5));
    out.appendChild(
      paint(svgText(58, 308, 'root_pos (T, 3) · root_quat (T, 4) wxyz · dof_pos (T, num_dof) · fps（与输入一致）', 'demo-x-mono', 10.5), C_ACCENT)
    );
    s.appendChild(out);

    var perf = svgEl('g', {});
    perf.appendChild(paint(svgEl('rect', { x: 40, y: 330, width: 720, height: 50, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_GOOD));
    CPUS.forEach(function (c, k) {
      var mid = midFps(c);
      var x = 58 + k * 366;
      perf.appendChild(paint(svgText(x, 350, c.n, null, 10, 'start'), c.c));
      perf.appendChild(
        svgText(
          x,
          368,
          c.lo + '–' + c.hi + ' FPS → ' + fmt(msPerFrame(mid), 1) + ' ms/帧 ≈ ' + fmt(realtime(mid), 1) + ' × 实时（' + MOCAP_FPS + ' fps mocap）',
          'demo-x-mono',
          9.5,
          'start'
        )
      );
    });
    s.appendChild(perf);

    var foot = paint(svgText(400, 406, '遥操现场一台笔记本就够，不必等 CUDA 环境', null, 13, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      fmts.forEach(function (f) {
        setOpacity(f.g, seg(t, f.at, f.at + 0.4));
      });
      setOpacity(core, seg(t, 2.6, 3.4));
      robots.forEach(function (r) {
        setOpacity(r.g, seg(t, r.at, r.at + 0.4));
      });
      setOpacity(badge, seg(t, 6.6, 7.4));
      setOpacity(out, seg(t, 8.2, 8.9));
      setOpacity(perf, seg(t, 9.8, 10.5));
      setOpacity(foot, seg(t, 11.4, 12.0));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 3 幕：论文的五步显式流程 ──────────────────────────────────────
  var S3_STEPS = [
    { t: '① 骨骼对应关系', d: '人体骨骼 → 机器人 body', d2: '写成 YAML，一次性手工活', c: C_MUTED },
    { t: '② 对齐静止姿态旋转', d: '修正 T-pose 与机器人静止姿态', d2: '不然每一帧都带同一个偏差', c: C_MUTED },
    { t: '③ 非均匀局部缩放', d: '每条骨骼链各自估比例', d2: '关键创新，下一幕细讲', c: C_GOOD, star: true },
    { t: '④ 带旋转约束的 IK', d: 'mink + DAQP 解关节角', d2: '施加关节限位约束', c: C_ACCENT },
    { t: '⑤ 全约束精调', d: '加地面接触、自碰撞', d2: '最后一轮精修', c: C_ACCENT }
  ];

  function buildSceneSteps() {
    var s = sceneSvg(
      'GMR 把 retargeting 拆成五个显式步骤：定义骨骼对应关系、对齐静止姿态旋转、' +
        '非均匀局部缩放、带旋转约束的 IK、全约束精调，每一步的目标和约束都能单独检查'
    );
    s.appendChild(svgText(56, 26, '论文把这段「黑盒 IK 脚本」拆成五个能单独检查的步骤', 'demo-x-ink2', 13.5));

    var arrow = K.arrowMarker(s, 'gmr-x-arrow-step', C_BORDER);
    var cards = S3_STEPS.map(function (c0, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 148;
      g.appendChild(paint(svgEl('rect', { x: x, y: 54, width: 128, height: 152, rx: 8, 'stroke-width': c0.star ? 1.8 : 1.3 }), C_SURFACE2, c0.c));
      if (c0.star) g.appendChild(paint(svgText(x + 64, 80, '⭐', null, 15, 'middle'), c0.c));
      g.appendChild(paint(svgText(x + 64, c0.star ? 104 : 90, c0.t, null, 11.5, 'middle'), c0.c));
      g.appendChild(svgText(x + 64, c0.star ? 132 : 122, c0.d, 'demo-x-mut', 9, 'middle'));
      g.appendChild(svgText(x + 64, c0.star ? 152 : 142, c0.d2, 'demo-x-mut', 9, 'middle'));
      s.appendChild(g);
      if (k < S3_STEPS.length - 1) {
        s.appendChild(
          paint(
            svgEl('path', { d: polyPath([[x + 132, 130], [x + 145, 130]]), fill: 'none', 'stroke-width': 1.5, 'marker-end': arrow }),
            null,
            C_BORDER
          )
        );
      }
      return { g: g, at: 0.5 + k * 1.1 };
    });

    var cmp = svgEl('g', {});
    cmp.appendChild(paint(svgEl('rect', { x: 40, y: 224, width: 350, height: 74, rx: 8, 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }), C_SURFACE, C_BAD));
    cmp.appendChild(paint(svgText(58, 248, '隐式 IK 脚本：一把解完', null, 11.5), C_BAD));
    cmp.appendChild(svgText(58, 268, '出了问题只能整体调参，说不清是哪一步坏的', 'demo-x-mut', 9.5));
    cmp.appendChild(svgText(58, 286, '换机器人 = 重新调一遍玄学', 'demo-x-mut', 9.5));
    s.appendChild(cmp);

    var good = svgEl('g', {});
    good.appendChild(paint(svgEl('rect', { x: 410, y: 224, width: 350, height: 74, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, C_GOOD));
    good.appendChild(paint(svgText(428, 248, 'GMR：五步各有各的目标与约束', null, 11.5), C_GOOD));
    good.appendChild(svgText(428, 268, '接新机器人的手工活被收敛成一张 10–20 行的 YAML', 'demo-x-mut', 9.5));
    good.appendChild(svgText(428, 286, '（ik_configs/*.yaml：body ↔ human ↔ 权重 ↔ 偏移）', 'demo-x-mut', 9.5));
    s.appendChild(good);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 344, '第 ③ 步是全篇的关键创新，也是这五步里唯一「以前大家没认真做」的一步', null, 14, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 370, '④ ⑤ 两步的求解器细节，第五幕再拆开看', 'demo-x-mut', 10.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      cards.forEach(function (c) {
        setOpacity(c.g, seg(t, c.at, c.at + 0.5));
      });
      setOpacity(cmp, seg(t, 6.4, 7.2));
      setOpacity(good, seg(t, 8.0, 8.8));
      setOpacity(foot, seg(t, 10.4, 11.2));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 4 幕：非均匀局部缩放为什么是关键 ──────────────────────────────
  function buildSceneScaling() {
    var s = sceneSvg(
      '全局等比例缩放只能给所有骨骼链一个缩放因子，比例差异大的链会被要求够到机器人到不了的位置；' +
        '非均匀局部缩放让每条链各自对齐比例，IK 的起点就落在可达范围内'
    );
    s.appendChild(svgText(56, 26, '为什么等比例缩放不行：人和机器人的四肢比例差异是非均匀的', 'demo-x-ink2', 13.5));

    var left = svgEl('g', {});
    left.appendChild(paint(svgEl('rect', { x: 40, y: 46, width: 350, height: 232, rx: 8, 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }), C_SURFACE, C_BAD));
    left.appendChild(paint(svgText(58, 70, '全局等比例：三条链共用一个 s', null, 12), C_BAD));
    s.appendChild(left);

    var sMath = svgMath(58, 94, 's_{\\text{global}} = \\tfrac{1}{3}\\sum_i s_i = ' + fmt(GLOBAL_S, 3), { size: 12, w: 240 });
    sMath.setTone('var(--demo-bad)');
    left.appendChild(sMath);

    var right = svgEl('g', {});
    right.appendChild(paint(svgEl('rect', { x: 410, y: 46, width: 350, height: 232, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_GOOD));
    right.appendChild(paint(svgText(428, 70, '非均匀局部缩放：每条链各自一个 s', null, 12), C_GOOD));
    s.appendChild(right);

    var rMath = svgMath(428, 94, 's_i = \\ell_i^{\\text{robot}} \\,/\\, \\ell_i^{\\text{human}}\\quad (i = \\text{arm, leg, torso})', { size: 12, w: 310 });
    rMath.setTone('var(--demo-good)');
    right.appendChild(rMath);

    var rows = CHAINS.map(function (c, k) {
      var y = 128 + k * 46;
      var g = svgEl('g', {});
      /* 左：条形长度按 ratio 画，虚线是全局 s，差出来的那一段就是残差。 */
      var BX = 150,
        BW = 162;
      g.appendChild(svgText(58, y + 4, c.n, 'demo-x-ink2', 10.5));
      g.appendChild(svgText(58, y + 20, 's = ' + fmt(c.ratio, 2), 'demo-x-mono', 9));
      g.appendChild(paint(svgEl('rect', { x: BX, y: y - 9, width: BW * c.ratio, height: 16, rx: 3 }), C_SURFACE2, C_BORDER));
      g.appendChild(paint(svgEl('line', { x1: BX + BW * GLOBAL_S, y1: y - 15, x2: BX + BW * GLOBAL_S, y2: y + 13, 'stroke-width': 1.6, 'stroke-dasharray': '3 3' }), null, C_BAD));
      g.appendChild(paint(svgText(378, y + 4, '+' + fmt(residCm(c), 1) + ' cm', 'demo-x-mono', 10, 'end'), C_BAD));

      /* 右：每条链自己的比例，残差归零。 */
      g.appendChild(svgText(428, y + 4, c.n, 'demo-x-ink2', 10.5));
      g.appendChild(svgText(428, y + 20, 's = ' + fmt(c.ratio, 2), 'demo-x-mono', 9));
      g.appendChild(paint(svgEl('rect', { x: 520, y: y - 9, width: BW * c.ratio, height: 16, rx: 3 }), C_SURFACE2, C_GOOD));
      g.appendChild(paint(svgText(744, y + 4, '0.0 cm', 'demo-x-mono', 10, 'end'), C_GOOD));
      s.appendChild(g);
      return { g: g, at: 1.6 + k * 1.0 };
    });

    var sum = svgEl('g', {});
    sum.appendChild(paint(svgText(378, 268, '末端目标合计偏出 ' + fmt(RESID_SUM, 1) + ' cm', null, 11.5, 'end'), C_BAD));
    sum.appendChild(paint(svgText(744, 268, '起点就在可达范围内', null, 11.5, 'end'), C_GOOD));
    s.appendChild(sum);

    var band = svgEl('g', {});
    band.appendChild(paint(svgEl('rect', { x: 40, y: 292, width: 720, height: 56, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_WARN));
    band.appendChild(paint(svgText(400, 314, '偏出去的那几厘米，IK 只能用「极端关节角」去够 —— 解出来的姿势几何上对，物理上崩', null, 12, 'middle'), C_WARN));
    band.appendChild(svgText(400, 336, '这正是下游 RL 追不上、或追上了 sim-to-real 崩掉的源头之一', 'demo-x-mut', 10, 'middle'));
    s.appendChild(band);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 378, '分链各自对齐比例，IK 的残差从源头上就小了', null, 15, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 402, '（上面三条比例是笔记 Q7 的量级说法搭的示意算例，不是论文测得的数值）', 'demo-x-mut', 9.5, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      setOpacity(left, seg(t, 0.4, 1.0));
      setOpacity(right, seg(t, 0.8, 1.4));
      rows.forEach(function (r) {
        setOpacity(r.g, seg(t, r.at, r.at + 0.5));
      });
      setOpacity(sum, seg(t, 5.4, 6.2));
      setOpacity(band, seg(t, 7.6, 8.4));
      setOpacity(foot, seg(t, 10.2, 11.0));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 5 幕：mink + DAQP 的两阶段约束 IK ─────────────────────────────
  var S5_HYPERS = [
    { k: 'lm_damping', v: fmt(LM_DAMPING, 1), d: 'Levenberg-Marquardt 阻尼，越大越稳越慢' },
    { k: '关节速度限位', v: '$3\\pi$ rad/s', d: '≈ ' + fmt(VEL_LIMIT, 2) + ' rad/s；' + MOCAP_FPS + ' fps 下单帧最多转 ' + fmt(STEP_LIMIT_DEG, 0) + '°' },
    { k: 'max_iters', v: String(MAX_ITERS), d: '单帧最多 ' + MAX_ITERS + ' 步 Newton 迭代' },
    { k: '收敛阈值', v: 'err < ' + IK_TOL, d: '提前停止，10 步内达到即跳出' },
    { k: 'QP 求解器', v: 'daqp', d: '默认 DAQP，可切 quadprog；多约束下更快' }
  ];

  function buildSceneIK() {
    var s = sceneSvg(
      'GMR 的 IK 是两阶段的：第一张 match table 先对齐 root 与主干，第二张再细化四肢末端；' +
        '求解器是 mink + DAQP，四个超参写死在 motion_retarget.py 里'
    );
    s.appendChild(svgText(56, 26, '两阶段约束 IK：先锁住躯干，再去拟合手脚', 'demo-x-ink2', 13.5));

    var arrow = K.arrowMarker(s, 'gmr-x-arrow-ik', C_BORDER);

    var st1 = svgEl('g', {});
    st1.appendChild(paint(svgEl('rect', { x: 40, y: 48, width: 330, height: 96, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_ACCENT));
    st1.appendChild(paint(svgText(58, 72, 'Stage 1 · ik_match_table1', 'demo-x-mono', 12), C_ACCENT));
    st1.appendChild(svgText(58, 96, 'root · pelvis · torso · head', 'demo-x-mut', 10));
    st1.appendChild(svgText(58, 116, '先把 root 与主干骨骼的位姿锁定下来', 'demo-x-mut', 9.5));
    st1.appendChild(svgText(58, 134, '每条 task 带 position_weight / rotation_weight / offset', 'demo-x-mut', 9.5));
    s.appendChild(st1);

    var st2 = svgEl('g', {});
    st2.appendChild(paint(svgEl('rect', { x: 40, y: 172, width: 330, height: 96, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_GOOD));
    st2.appendChild(paint(svgText(58, 196, 'Stage 2 · ik_match_table2', 'demo-x-mono', 12), C_GOOD));
    st2.appendChild(svgText(58, 220, 'hands · feet · elbows · knees', 'demo-x-mut', 10));
    st2.appendChild(svgText(58, 240, '在已经站稳的躯干上细化四肢与末端', 'demo-x-mut', 9.5));
    st2.appendChild(svgText(58, 258, '第 ③ 步的分链缩放就是它的参考长度', 'demo-x-mut', 9.5));
    s.appendChild(st2);

    var link = paint(
      svgEl('path', { d: polyPath([[205, 148], [205, 166]]), fill: 'none', 'stroke-width': 1.6, 'marker-end': arrow }),
      null,
      C_BORDER
    );
    s.appendChild(link);

    var table = svgEl('g', {});
    table.appendChild(paint(svgEl('rect', { x: 392, y: 48, width: 368, height: 220, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, C_BORDER));
    table.appendChild(svgText(410, 70, '写死在 general_motion_retargeting/motion_retarget.py：', 'demo-x-ink2', 10));
    S5_HYPERS.forEach(function (h, k) {
      var y = 94 + k * 34;
      table.appendChild(svgText(410, y, h.k, 'demo-x-mono', 10));
      table.appendChild(svgRich(620, y, h.v, { size: 10.5, cls: 'demo-x-mono', anchor: 'end', w: 200 }).setTone(C_ACCENT));
      table.appendChild(svgText(410, y + 15, h.d, 'demo-x-mut', 8.5));
    });
    s.appendChild(table);

    var qp = svgEl('g', {});
    qp.appendChild(paint(svgEl('rect', { x: 40, y: 284, width: 720, height: 60, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, C_MUTED));
    qp.appendChild(svgText(58, 306, '每一步都是一个带阻尼的加权最小二乘 QP（mink 搭好 task / limit，DAQP 求解）：', 'demo-x-ink2', 10));
    var qpMath = svgMath(
      400,
      332,
      '\\min_{\\dot q}\\ \\sum_i w_i \\lVert J_i \\dot q - v_i \\rVert^2 + \\lambda \\lVert \\dot q \\rVert^2,\\quad \\lambda = ' + fmt(LM_DAMPING, 1),
      { size: 12.5, w: 560, anchor: 'middle' }
    );
    qpMath.setTone('var(--demo-accent)');
    qp.appendChild(qpMath);
    s.appendChild(qp);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 376, '一次性把所有 task 塞进同一个 QP，远端误差会拉着 root 漂移', null, 14, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 400, '分两步，就不会「为了把手放对而牺牲躯干姿态」；求解器复用社区打磨过的 mink，不自己写 Jacobian', 'demo-x-mut', 10, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      setOpacity(st1, seg(t, 0.4, 1.2));
      setOpacity(link, seg(t, 1.8, 2.3));
      setOpacity(st2, seg(t, 2.2, 3.0));
      setOpacity(table, seg(t, 4.2, 5.0));
      setOpacity(qp, seg(t, 7.0, 7.8));
      setOpacity(foot, seg(t, 10.0, 10.8));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 6 幕：「Retargeting Matters」的定量论据 ───────────────────────
  var S6_SETUP = [
    { t: 'BeyondMimic 作训练框架', d: '刻意选的「中性框架」，不针对某个 retargeter 调奖励' },
    { t: 'LAFAN1 · ' + LAFAN_SEQS + ' 段动作', d: '唯一被测机器人是 Unitree G1' },
    { t: '对比 PHC / ProtoMotions / Unitree', d: '前两个开源，Unitree 数据集是闭源基线' }
  ];

  var S6_ARTIFACTS = [
    { t: '① 地面穿透', d: 'ground penetration' },
    { t: '② 自碰撞', d: 'self-intersection' },
    { t: '③ 关节值突变', d: 'sudden joint value jumps' }
  ];

  function buildSceneEvidence() {
    var s = sceneSvg(
      '论文用中性的 BeyondMimic 框架在 LAFAN1 的 21 段动作上比较不同 retargeter：' +
        'GMR 接近闭源 Unitree 基线、PHC 明显落后，21 段里只有 3 段是所有方法都跟得完美的'
    );
    s.appendChild(svgText(56, 24, '把 retargeter 换掉、RL 训练不动，成功率就变了 —— 这就是全篇的论据', 'demo-x-ink2', 13));

    var setup = S6_SETUP.map(function (c0, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 246;
      g.appendChild(paint(svgEl('rect', { x: x, y: 40, width: 234, height: 46, rx: 8, 'stroke-width': 1.2 }), C_SURFACE, C_BORDER));
      g.appendChild(paint(svgText(x + 117, 60, c0.t, null, 10.5, 'middle'), C_ACCENT));
      g.appendChild(svgText(x + 117, 76, c0.d, 'demo-x-mut', 8.5, 'middle'));
      s.appendChild(g);
      return { g: g, at: 0.4 + k * 0.7 };
    });

    var grid = svgEl('g', {});
    grid.appendChild(svgText(40, 108, LAFAN_SEQS + ' 段动作里，所有方法都跟得完美的只有 ' + PERFECT_SEQS + ' 段：', 'demo-x-ink2', 10.5));
    var cells = [];
    for (var i = 0; i < LAFAN_SEQS; i++) {
      var ok = i < PERFECT_SEQS;
      var cell = paint(
        svgEl('rect', { x: 40 + i * 30, y: 118, width: 24, height: 24, rx: 4, 'stroke-width': 1.3 }),
        ok ? C_SURFACE2 : C_SURFACE,
        ok ? C_GOOD : C_BAD
      );
      grid.appendChild(cell);
      cells.push(cell);
    }
    grid.appendChild(
      paint(svgText(40, 162, '也就是 ' + fmt(PERFECT_PCT, 1) + ' %；剩下 ' + HARD_SEQS + ' 段至少有一种方法跟不上', null, 10.5), C_BAD)
    );
    s.appendChild(grid);

    var rank = svgEl('g', {});
    rank.appendChild(svgText(40, 186, '感知保真度与跟踪成功率的名次（论文未给逐段数字，这里只画名次）：', 'demo-x-ink2', 10.5));
    [
      { t: 'Unitree（闭源基线）', c: C_GOOD },
      { t: 'GMR', c: C_GOOD },
      { t: 'ProtoMotions', c: C_ACCENT },
      { t: 'PHC（明显落后）', c: C_BAD }
    ].forEach(function (r, k) {
      var x = 40 + k * 184;
      rank.appendChild(paint(svgEl('rect', { x: x, y: 196, width: 172, height: 38, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, r.c));
      rank.appendChild(paint(svgText(x + 86, 220, r.t, null, 11, 'middle'), r.c));
      if (k < 3) rank.appendChild(paint(svgText(x + 178, 220, '≳', null, 12, 'middle'), C_MUTED));
    });
    s.appendChild(rank);

    var arts = S6_ARTIFACTS.map(function (a, k) {
      var g = svgEl('g', {});
      var x = 40 + k * 246;
      g.appendChild(paint(svgEl('rect', { x: x, y: 246, width: 234, height: 46, rx: 8, 'stroke-width': 1.3 }), C_SURFACE, C_BAD));
      g.appendChild(paint(svgText(x + 117, 266, a.t, null, 11, 'middle'), C_BAD));
      g.appendChild(svgText(x + 117, 282, a.d, 'demo-x-mono', 8.5, 'middle'));
      s.appendChild(g);
      return { g: g, at: 7.0 + k * 0.6 };
    });

    var surprise = svgEl('g', {});
    surprise.appendChild(paint(svgEl('rect', { x: 40, y: 302, width: 720, height: 58, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_WARN));
    surprise.appendChild(
      paint(svgText(400, 324, '最意外的发现：同一段动作，换一个初始参考帧，成功率能差 ' + INIT_FRAME_GAP + '+ 个百分点', null, 12.5, 'middle'), C_WARN)
    );
    surprise.appendChild(
      svgText(400, 346, USERS + ' 名参与者的主观打分也和定量结果一致：GMR 的感知保真度介于 PHC 与 Unitree 基线之间', 'demo-x-mut', 10, 'middle')
    );
    s.appendChild(surprise);

    var foot = paint(svgText(400, 394, '同一套 RL 训练，换 retargeter 就换结果 —— retargeting 确实 matters', null, 15, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setup.forEach(function (c) {
        setOpacity(c.g, seg(t, c.at, c.at + 0.4));
      });
      setOpacity(grid, seg(t, 2.6, 3.2));
      cells.forEach(function (cell, i) {
        var on = seg(t, 3.0 + i * 0.09, 3.3 + i * 0.09);
        setOpacity(cell, 0.25 + 0.75 * ease(on));
      });
      setOpacity(rank, seg(t, 5.4, 6.2));
      arts.forEach(function (a) {
        setOpacity(a.g, seg(t, a.at, a.at + 0.4));
      });
      setOpacity(surprise, seg(t, 9.2, 10.0));
      setOpacity(foot, seg(t, 11.2, 12.0));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 7 幕：闭环、已知失败与源码落点 ────────────────────────────────
  var S7_CHAIN = [
    { t: '手机 RGB 视频', d: '随手拍一段', c: C_MUTED, w: 128 },
    { t: 'GVHMR', d: '视频 → SMPL-X', c: C_ACCENT, w: 110 },
    { t: 'SMPL-X 动作', d: 'root + 各骨骼旋转', c: C_MUTED, w: 130 },
    { t: 'GMR', d: 'smplx_to_robot.py', c: C_GOOD, w: 118 },
    { t: 'G1 关节角 .pkl', d: '与输入同帧率', c: C_GOOD, w: 140 }
  ];

  var S7_FILES = [
    { f: 'scripts/smplx_to_robot.py', d: 'SMPL-X → 机器人关节序列' },
    { f: 'scripts/bvh_to_robot.py', d: 'BVH → 机器人关节序列' },
    { f: 'scripts/vis_robot_motion.py', d: '可视化重定向结果' },
    { f: 'motion_retarget.py', d: '★ mink + DAQP + 两阶段 IK' },
    { f: 'kinematics_model.py', d: '★ 自研 PyTorch FK，全程可微' },
    { f: 'ik_configs/*.yaml', d: N_ROBOTS + '+ 款人形的映射 + 权重 + 偏移' }
  ];

  function buildSceneLoop() {
    var s = sceneSvg(
      '典型下游串接：手机视频经 GVHMR 得到 SMPL-X，再经 GMR 得到 G1 关节角，' +
        '分别喂给 RL tracking 策略与真机 PD 控制器；仓库还维护了一份已知失败动作清单'
    );
    s.appendChild(svgText(56, 24, '闭环与源码落点：一条命令就从视频走到机器人', 'demo-x-ink2', 13));

    var arrow = K.arrowMarker(s, 'gmr-x-arrow-loop', C_BORDER);
    var x = 40;
    var chain = S7_CHAIN.map(function (c0, k) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: x, y: 40, width: c0.w, height: 54, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, c0.c));
      g.appendChild(paint(svgText(x + c0.w / 2, 62, c0.t, null, 11, 'middle'), c0.c));
      g.appendChild(svgText(x + c0.w / 2, 80, c0.d, 'demo-x-mut', 8.5, 'middle'));
      s.appendChild(g);
      if (k < S7_CHAIN.length - 1) {
        s.appendChild(
          paint(
            svgEl('path', { d: polyPath([[x + c0.w + 3, 67], [x + c0.w + 16, 67]]), fill: 'none', 'stroke-width': 1.5, 'marker-end': arrow }),
            null,
            C_BORDER
          )
        );
      }
      x += c0.w + 19;
      return { g: g, at: 0.4 + k * 0.6 };
    });

    var sinks = [
      { t: 'RL tracking policy', d: 'BeyondMimic / PHC / …', c: C_ACCENT },
      { t: '真机 PD 控制器', d: 'TWIST 遥操直接用它', c: C_ACCENT }
    ].map(function (b, k) {
      var g = svgEl('g', {});
      var bx = 430 + k * 172;
      s.appendChild(
        paint(
          svgEl('path', { d: polyPath([[697, 96], [697, 108], [bx + 78, 108], [bx + 78, 120]]), fill: 'none', 'stroke-width': 1.2, 'marker-end': arrow }),
          null,
          C_BORDER
        )
      );
      g.appendChild(paint(svgEl('rect', { x: bx, y: 122, width: 156, height: 44, rx: 8, 'stroke-width': 1.3 }), C_SURFACE2, b.c));
      g.appendChild(paint(svgText(bx + 78, 142, b.t, null, 11, 'middle'), b.c));
      g.appendChild(svgText(bx + 78, 158, b.d, 'demo-x-mut', 8.5, 'middle'));
      s.appendChild(g);
      return { g: g, at: 3.8 + k * 0.5 };
    });

    var fail = svgEl('g', {});
    fail.appendChild(paint(svgEl('rect', { x: 40, y: 122, width: 366, height: 96, rx: 8, 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }), C_SURFACE, C_BAD));
    fail.appendChild(paint(svgText(58, 144, 'TEST_MOTIONS.md：仓库自己维护的失败清单', null, 11), C_BAD));
    fail.appendChild(svgText(58, 164, '步态相位漂移 · 行走稳态被破坏 · 高频抖动 ·', 'demo-x-mut', 9.5));
    fail.appendChild(svgText(58, 180, '地面支撑里手腕被卡住 · 大幅抛甩时上肢失稳', 'demo-x-mut', 9.5));
    fail.appendChild(paint(svgText(58, 204, '共性：接触丰富 + 大幅旋转 —— 显式 IK 没有物理一致性约束', null, 9.5), C_BAD));
    s.appendChild(fail);

    var files = svgEl('g', {});
    S7_FILES.forEach(function (f, k) {
      var fx = 40 + (k % 3) * 246;
      var fy = 234 + Math.floor(k / 3) * 52;
      files.appendChild(paint(svgEl('rect', { x: fx, y: fy, width: 234, height: 44, rx: 7, 'stroke-width': 1.2 }), C_SURFACE2, C_BORDER));
      files.appendChild(paint(svgText(fx + 12, fy + 19, f.f, 'demo-x-mono', 9.5), C_ACCENT));
      files.appendChild(svgText(fx + 12, fy + 34, f.d, 'demo-x-mut', 8.5));
    });
    s.appendChild(files);

    var rail = [[100, 348], [400, 348], [700, 348]];
    var railPath = paint(svgEl('path', { d: polyPath(rail), fill: 'none', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }), null, C_BORDER);
    s.appendChild(railPath);
    var tok = paint(svgEl('circle', { r: 6, 'stroke-width': 1.6 }), C_ACCENT, C_SURFACE2);
    s.appendChild(tok);
    var railLbl = svgText(400, 368, N_PATHS + ' 条通路共用同一份实现，CPU 上就跑得过实时', 'demo-x-mut', 10, 'middle');
    s.appendChild(railLbl);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 398, 'GMR = 把 retargeting 从附录里砍出来，做成能被引用、被讨论的一层', null, 15, 'middle'), C_ACCENT));
    s.appendChild(foot);

    function draw(t) {
      chain.forEach(function (c) {
        setOpacity(c.g, seg(t, c.at, c.at + 0.4));
      });
      sinks.forEach(function (b) {
        setOpacity(b.g, seg(t, b.at, b.at + 0.4));
      });
      setOpacity(fail, seg(t, 5.4, 6.2));
      setOpacity(files, seg(t, 7.4, 8.2));
      var on = seg(t, 9.4, 10.0);
      setOpacity(railPath, on);
      setOpacity(tok, on);
      setOpacity(railLbl, on);
      var pt = pointOn(rail, ease(seg(t, 9.6, 12.0)));
      tok.setAttribute('cx', pt[0].toFixed(1));
      tok.setAttribute('cy', pt[1].toFixed(1));
      setOpacity(foot, seg(t, 11.4, 12.2));
    }

    return { el: s, draw: draw };
  }

  var GMR_SCENES = [
    {
      title: 'retargeting 被当成前处理脚本',
      dur: 12,
      build: buildSceneProblem,
      cues: [
        { at: 0.4, s: '几乎每篇 humanoid tracking 论文都有这条流程：人类 mocap → 某种 retargeting 脚本 → 机器人轨迹 → RL tracking。' },
        { at: 2.4, s: '中间那一格一直是虚线框：**每家自己写一份，谁也说不清里面是什么**。' },
        { at: 3.6, s: '麻烦一：参考动作本身不可行（超关节限位、脚穿地板、自碰撞），RL 就追不上。' },
        { at: 5.0, s: '麻烦二：OmniH2O、ExBody2、OmniXtreme 各一套配方，换机器人 / 换数据集就得重写。' },
        { at: 6.4, s: '麻烦三：很多实现要 GPU 甚至 CUDA，遥操现场带台笔记本就办不成事。' },
        { at: 8.0, s: '所以标题里的 “Matters” 是在叫板 —— **把 retargeting 提到和 policy learning 同一级**。' },
        { at: 10.2, s: '翻译这一步没做好，后面训得再久也追不上。' }
      ]
    },
    {
      title: '一条管线，两头都能换',
      dur: 13,
      build: buildSceneGeneral,
      cues: [
        { at: 0.4, s: '先看 “General” 这两个字有多大：输入端 ' + N_FORMATS + ' 种人体动作格式。' },
        { at: 1.6, s: 'SMPL-X（AMASS / OMOMO）、BVH（LAFAN1）、FBX（OptiTrack）、Xsens MVN，还有单目视频来的 GVHMR。' },
        { at: 3.2, s: '中间是同一份实现：`mink` + DAQP 的两阶段约束 IK，确定性、不训练、不装 CUDA。' },
        { at: 4.6, s: '输出端 ' + N_ROBOTS + '+ 款人形：G1 29 DOF、H1 19 DOF、H1-2 27 DOF、Booster、Fourier……' },
        { at: 6.8, s: '两头一乘就是 **' + N_FORMATS + ' × ' + N_ROBOTS + ' = ' + N_PATHS + ' 条通路**，过去这等于要写 ' + N_PATHS + ' 份脚本。' },
        { at: 8.4, s: '产物是一个 `.pkl`：`root_pos`、`root_quat`、`dof_pos`、`fps`，直接喂下游。' },
        { at: 10.0, s: 'CPU 上的吞吐：Threadripper ' + fmt(msPerFrame(midFps(CPUS[0])), 1) + ' ms/帧、i9-13900K ' + fmt(msPerFrame(midFps(CPUS[1])), 1) + ' ms/帧。' },
        { at: 11.4, s: '$\\ge 1$ 倍实时（对 30 fps 的 mocap 而言）—— 遥操现场一台笔记本就够，不必等 CUDA 环境。' }
      ]
    },
    {
      title: '论文的五步显式流程',
      dur: 13,
      build: buildSceneSteps,
      cues: [
        { at: 0.4, s: '论文把这段黑盒拆成五步，每一步的目标和约束都能单独检查。' },
        { at: 1.2, s: '① 定义骨骼对应关系：人体骨骼 → 机器人 body，写成 YAML，一次性手工活。' },
        { at: 2.4, s: '② 对齐静止姿态旋转：修正人类 T-pose 与机器人静止姿态的坐标系偏差。' },
        { at: 3.4, s: '不做这一步，**所有帧都会带上同一个系统性旋转偏差**。' },
        { at: 4.6, s: '③ 非均匀局部缩放 —— 加星号的那一格，下一幕单独讲。' },
        { at: 5.6, s: '④ 带旋转约束的 IK：在缩放后的参考下解关节角，施加关节限位。' },
        { at: 6.6, s: '⑤ 全约束精调：再加地面接触、自碰撞，做最后一轮精修。' },
        { at: 8.2, s: '对比隐式脚本：出了问题只能整体调参，说不清是哪一步坏的。' },
        { at: 9.6, s: '拆开之后，接新机器人的手工活被收敛成一张 10–20 行的 `ik_configs/*.yaml`。' }
      ]
    },
    {
      title: '非均匀局部缩放为什么是关键',
      dur: 13,
      build: buildSceneScaling,
      cues: [
        { at: 0.4, s: '人和机器人的四肢比例差异是**非均匀的**：手臂可能差 20%，腿差 15%，躯干几乎一样。' },
        { at: 1.8, s: '全局等比例只能取一个缩放因子，这里取三条链的平均 $s = ' + fmt(GLOBAL_S, 3) + '$。' },
        { at: 3.2, s: '于是每条链都对不齐：手臂 ' + fmt(residCm(CHAINS[0]), 1) + ' cm、腿 ' + fmt(residCm(CHAINS[1]), 1) + ' cm、躯干 ' + fmt(residCm(CHAINS[2]), 1) + ' cm。' },
        { at: 5.6, s: '合计 ' + fmt(RESID_SUM, 1) + ' cm 的末端目标偏差 —— 机器人根本够不到那个位置。' },
        { at: 7.0, s: 'IK 只能用极端关节角去够，**解出来的姿势几何上对、物理上崩**。' },
        { at: 8.6, s: '非均匀缩放让每条链各自取自己的比例，残差归零，IK 的起点就落在可达范围内。' },
        { at: 10.4, s: '这就是论文说「防止四肢比例差异导致 IK 解出大误差」的那一步。' },
        { at: 11.6, s: '（画面里的三条比例是量级示意算例，不是论文测得的数值。）' }
      ]
    },
    {
      title: '两阶段约束 IK：mink + DAQP',
      dur: 13,
      build: buildSceneIK,
      cues: [
        { at: 0.4, s: '第 ④ ⑤ 步拆开看：GMR 的 IK 是两阶段的，两张 match table。' },
        { at: 1.4, s: 'Stage 1 只管 `root`、`pelvis`、`torso`、`head` —— 先把主干的位姿锁定。' },
        { at: 2.8, s: 'Stage 2 才去细化 `hands`、`feet`、`elbows`、`knees`。' },
        { at: 4.4, s: '四个超参写死在 `motion_retarget.py`：`lm_damping` = ' + fmt(LM_DAMPING, 1) + '，越大越稳也越慢。' },
        { at: 5.6, s: '关节速度限位 $3\\pi\\ \\text{rad/s}$ ≈ ' + fmt(VEL_LIMIT, 2) + '，按 ' + MOCAP_FPS + ' fps 换算就是**单帧最多转 ' + fmt(STEP_LIMIT_DEG, 0) + '°**，解不出「瞬移」pose。' },
        { at: 7.2, s: '单帧最多 ' + MAX_ITERS + ' 步 Newton 迭代，误差 $< ' + IK_TOL + '$ 就提前跳出。' },
        { at: 8.4, s: '每一步都是一个带阻尼的加权最小二乘 QP，`mink` 搭 task 与 limit，DAQP 求解。' },
        { at: 10.2, s: '为什么要分两步：一次性全塞进同一个 QP，**远端误差会拉着 root 漂移**。' },
        { at: 11.6, s: '分开之后，就不会「为了把手放对而牺牲躯干姿态」。' }
      ]
    },
    {
      title: 'Retargeting Matters 的定量论据',
      dur: 13,
      build: buildSceneEvidence,
      cues: [
        { at: 0.4, s: '怎么证明 retargeting 真的 matters？把 RL 训练固定住，只换 retargeter。' },
        { at: 1.2, s: '训练框架选 **BeyondMimic** —— 刻意挑的中性框架，不针对某个 retargeter 调奖励。' },
        { at: 2.4, s: '数据是 LAFAN1 的 ' + LAFAN_SEQS + ' 段动作，被测机器人只有 Unitree G1 一款。' },
        { at: 3.4, s: '' + LAFAN_SEQS + ' 段里，所有方法都跟得完美的只有 ' + PERFECT_SEQS + ' 段，' + fmt(PERFECT_PCT, 1) + '%。' },
        { at: 5.0, s: '剩下 ' + HARD_SEQS + ' 段至少有一种方法跟不上 —— **通用跟踪仍然很难**。' },
        { at: 6.0, s: '名次上：GMR 与 ProtoMotions 接近闭源的 Unitree 数据集，PHC 明显落后。' },
        { at: 7.2, s: '拖后腿的是三类 artifact：地面穿透、自碰撞、关节值突变。' },
        { at: 9.4, s: '还有个意外发现：同一段动作换一个初始参考帧，成功率能差 **' + INIT_FRAME_GAP + '+ 个百分点**。' },
        { at: 11.0, s: USERS + ' 人的主观打分也和定量结果一致：GMR 介于 PHC 与 Unitree 基线之间。' }
      ]
    },
    {
      title: '闭环、已知失败与源码落点',
      dur: 13,
      build: buildSceneLoop,
      cues: [
        { at: 0.4, s: '典型下游串接：手机拍一段视频，GVHMR 转成 SMPL-X，GMR 转成 G1 关节角。' },
        { at: 2.0, s: '一条命令：`python scripts/smplx_to_robot.py --robot unitree_g1 --save_path ...`。' },
        { at: 3.6, s: '产物同时喂两头：RL tracking 策略，和真机 PD 控制器（TWIST 遥操就直接用它）。' },
        { at: 5.6, s: '仓库还维护了 `TEST_MOTIONS.md`：**一份诚实的失败清单**。' },
        { at: 6.8, s: '共性是接触丰富 + 大幅旋转 —— 显式 IK 没有物理一致性约束，只能留给下游 RL 补救。' },
        { at: 8.0, s: '核心两个文件：`motion_retarget.py` 是两阶段 IK，`kinematics_model.py` 是自研的可微 PyTorch FK。' },
        { at: 9.6, s: '接新机器人只要往 `ik_configs/` 里加一张表，管线本身一行不改。' },
        { at: 11.6, s: '**GMR = 把 retargeting 从各家附录里砍出来，做成能被引用、被讨论的一层。**' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '七幕动画：GMR 全流程速览',
      sub: '约 90 秒自动播放。空格播放/暂停，← → 换幕；画面里的换算数字都是现算的，不是手写。',
      ariaLabel: 'GMR 七幕讲解动画',
      notes: [
        '取数依据：第二幕的「' + N_FORMATS + ' × ' + N_ROBOTS + ' = ' + N_PATHS +
          ' 条通路」由 README 的「18+ 款机器人」「5 种输入格式」相乘得到；每帧毫秒与实时倍率由同一段 README ' +
          '报的 FPS 现算（Threadripper 60–70、i9-13900K 35–45，取中点除 1000，再除 ' + MOCAP_FPS + ' fps 的 mocap 帧率）。',
        '第五幕的「单帧最多 ' + fmt(STEP_LIMIT_DEG, 0) + '°」由 `motion_retarget.py` 写死的关节速度限位 ' +
          '$3\\pi\\ \\text{rad/s}$ 除以 ' + MOCAP_FPS + ' fps 换算；`lm_damping` = ' + fmt(LM_DAMPING, 1) + '、`max_iters` = ' +
          MAX_ITERS + '、收敛阈值 ' + IK_TOL + ' 都是仓库里的原值。第六幕的 ' + fmt(PERFECT_PCT, 1) + '% 是 ' +
          PERFECT_SEQS + ' / ' + LAFAN_SEQS + ' 算出来的；' + INIT_FRAME_GAP + '+ 个百分点、' + USERS +
          ' 名参与者是论文报告的原值，名次条只画名次（论文未给逐段数字）。',
        '第四幕是**示意算例，不是论文数据**：三条链的比例（手臂 0.80 / 腿 0.85 / 躯干 1.00）取自本笔记 Q7 ' +
          '「手臂可能差 20%、腿差 15%、躯干几乎一样」的量级说法，全局缩放因子取三者平均，残差 ' +
          '$= \\lvert s_i - \\bar{s} \\rvert \\times \\ell_i$，用来说明「一个因子对不齐三条链」这个机制，' +
          '数值不能和论文直接比。'
      ],
      scenes: GMR_SCENES
    });
  }

  K.mount({
    'gmr-explainer': buildExplainerDemo
  });
})();
