/* Interactive OmniH2O demos for
 * papers/03_High_Impact_Selection/OmniH2O_Universal_Whole-Body_Teleoperation
 * （He, Luo, He, Xiao, Zhang, Zhang, Kitani, Liu, Shi · OmniH2O: Universal and Dexterous Human-to-Humanoid
 *   Whole-Body Teleoperation and Learning · arXiv 2406.08858 v1，CoRL 2024；代码 LeCAR-Lab/human2humanoid）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["omnih2o"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   omnih2o-explainer — 十七幕讲解动画：H2O 留下的问题 → 运动学姿态：一个通用接口 → 站住、蹲住：给动作库加偏置 →
 *                       每一步的最高抬脚 → 惩罚从一半开始 → 特权教师：913 维 → 学生只看头和双手 → 25 步历史代替线速度 →
 *                       DAgger：学生开车，老师批改 → 灵巧手与机载系统 → 表 1：学生追上老师 → 表 1：仿真里差别不大 →
 *                       表 2：真机才看得出 → 一个策略，接各种遥控 → GPT-4o 与 OmniH2O-6 → 从示范学自主（表 3）→ 局限
 *   omnih2o-video     — 同一套十七幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   omnih2o-points    — 三个点浏览器：官方样例（站姿版出拳）逐帧看 H1、头和双手的目标、27 维观测；可切 3 / 8 / 22 个点
 *   omnih2o-reward    — 抬脚奖励与惩罚课程：一步的抬脚高度 → 代码与论文两种写法的分数；回合长度 → 惩罚系数 s 怎么变
 *   omnih2o-tables    — 表 1、表 2、表 3（以及附录表 17 的逐任务成功率）
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
  /* 论文的图（arXiv 2406.08858 v1 的图 1–11）、官方仓库 README 的硬件图与 H1 的 3D 逐帧贴图都放在 assets/img/papers/omnih2o/ */
  var PAPER_IMG_BASE = assetBase('../../img/papers/omnih2o/');
  var H1_3D_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'h1_3d/' : '';
  /* 项目页 omni.human2humanoid.com 的真机视频，剪成片段放在 clips/（mp4 + 首帧 webp），用 K.svgClip 嵌进分镜 */
  var CLIP_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'clips/' : '';
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
    dot = K.dot,
    text = K.text,
    registerRenderer = K.registerRenderer;

  // ─── 论文里的数字（arXiv 2406.08858 v1 的正文、表 1–3、附录表 4–19） ─────────
  /* 表 1：仿真里的动作模仿（在加了站姿 / 蹲姿版的 AMASS 重定向数据 Q̂ 上，约 1.4 万段）。
     all = 全部序列的 [成功率 %, 全局 MPJPE mm, MPJPE mm, 加速度误差 mm/帧², 速度误差 mm/帧]，succ = 成功序列的后四项 */
  var TABLE1 = [
    { key: 'priv', zh: '特权教师', group: 'main', dim: 913, real: false, all: [94.77, 126.51, 70.68, 3.57, 6.20], succ: [122.71, 69.06, 2.22, 5.20] },
    { key: 'h2o', zh: 'H2O', group: 'main', dim: 138, real: true, all: [87.52, 148.13, 81.06, 5.12, 7.89], succ: [133.28, 75.99, 2.40, 5.75] },
    { key: 'omni', zh: 'OmniH2O', group: 'main', dim: 1665, real: true, all: [94.10, 141.11, 77.82, 3.70, 6.54], succ: [135.49, 75.75, 2.30, 5.47] },
    { key: 'woDH0', zh: '不用 DAgger、无历史', group: 'a', dim: 90, real: false, all: [90.62, 163.44, 91.29, 5.12, 8.80], succ: [153.31, 87.59, 3.15, 7.27] },
    { key: 'woD', zh: '不用 DAgger', group: 'a', dim: 1665, real: false, all: [47.11, 223.27, 128.90, 15.03, 16.29], succ: [182.13, 119.54, 5.47, 9.10] },
    { key: 'h0', zh: '历史 0 步', group: 'b', dim: 90, real: true, all: [93.80, 141.21, 78.52, 3.74, 6.62], succ: [134.90, 76.11, 2.25, 5.48] },
    { key: 'h5', zh: '历史 5 步', group: 'b', dim: 405, real: true, all: [93.60, 139.23, 77.82, 3.91, 6.66], succ: [132.67, 75.33, 2.24, 5.41] },
    { key: 'h25', zh: '历史 25 步（OmniH2O）', group: 'b', dim: 1665, real: true, all: [94.10, 141.11, 77.82, 3.70, 6.54], succ: [135.49, 75.75, 2.30, 5.47] },
    { key: 'h50', zh: '历史 50 步', group: 'b', dim: 3240, real: true, all: [93.56, 141.51, 78.51, 4.01, 6.79], succ: [135.04, 76.07, 2.36, 5.55] },
    { key: 'gru', zh: 'GRU', group: 'b', dim: 90, real: true, all: [92.85, 147.67, 80.84, 4.05, 6.93], succ: [142.75, 79.10, 2.38, 5.66] },
    { key: 'lstm', zh: 'LSTM', group: 'b', dim: 90, real: true, all: [91.03, 147.36, 80.34, 4.12, 7.04], succ: [142.64, 78.59, 2.37, 5.72] },
    { key: 'p22', zh: '22 个点', group: 'c', dim: 1836, real: true, all: [94.72, 127.71, 70.39, 3.62, 6.25], succ: [123.87, 68.92, 2.22, 5.24] },
    { key: 'p8', zh: '8 个点', group: 'c', dim: 1710, real: true, all: [94.31, 129.30, 71.70, 3.78, 6.39], succ: [125.14, 70.07, 2.22, 5.26] },
    { key: 'p3', zh: '3 个点（OmniH2O）', group: 'c', dim: 1665, real: true, all: [94.10, 141.11, 77.82, 3.70, 6.54], succ: [135.49, 75.75, 2.30, 5.47] },
    { key: 'linvel', zh: '加线速度', group: 'd', dim: 1743, real: true, all: [93.80, 138.18, 78.12, 3.94, 6.61], succ: [132.44, 75.98, 2.29, 5.40] }
  ];
  function t1(key) { return TABLE1.filter(function (r) { return r.key === key; })[0]; }
  /* 表 2：真机上 20 段站立动作，[全局 MPJPE, MPJPE, 加速度误差, 速度误差]；用 VIO 线速度的那一版摔倒了，测不完 */
  var TABLE2 = [
    { key: 'h2o', zh: 'H2O', group: 'main', dim: 138, v: [87.33, 53.32, 6.03, 5.87] },
    { key: 'omni', zh: 'OmniH2O', group: 'main', dim: 1665, v: [47.94, 41.87, 1.84, 2.20] },
    { key: 'vio', zh: '线速度用 VIO', group: 'a', dim: 1743, v: null },
    { key: 'mlp', zh: '线速度用 MLP 估', group: 'a', dim: 1743, v: [50.93, 42.47, 2.16, 2.26] },
    { key: 'gru', zh: '线速度用 GRU 估', group: 'a', dim: 1743, v: [49.75, 42.38, 2.20, 2.31] },
    { key: 'h0', zh: '历史 0 步', group: 'b', dim: 90, v: [83.26, 46.00, 4.86, 4.45] },
    { key: 'h5', zh: '历史 5 步', group: 'b', dim: 405, v: [62.18, 46.50, 2.66, 2.90] },
    { key: 'h50', zh: '历史 50 步', group: 'b', dim: 3240, v: [50.24, 40.11, 2.37, 2.71] },
    { key: 'lstm', zh: 'LSTM', group: 'b', dim: 90, v: [87.00, 46.06, 3.89, 3.88] }
  ];
  function t2(key) { return TABLE2.filter(function (r) { return r.key === key; })[0]; }
  /* 表 3：4 个任务 × 10 次的平均 [MSE, 成功次数 / 10]；表 17：逐任务的成功次数（接住扔掉、下蹲、接锤子、石头剪刀布） */
  var TABLE3 = {
    data: [['25% 数据', 1.30e-2, 4, [1, 9, 3, 3]], ['50% 数据', 7.48e-3, 6.5, [3, 10, 6, 9]], ['100% 数据', 5.25e-4, 8, [6, 10, 6, 10]]],
    seq: [['单帧图 → 单步', 4.89e-4, 6.5, [3, 10, 5, 10]], ['4 帧图 → 8 步', 9.91e-4, 8.75, [7, 10, 9, 9]], ['单帧图 → 8 步', 5.25e-4, 8, [6, 10, 6, 10]]],
    algo: [['BC', 5.63e-3, 1, [0, 3, 0, 1]], ['DP-DDIM', 1.9e-3, 7.75, [6, 10, 5, 10]], ['DP-DDPM', 5.25e-4, 8, [6, 10, 6, 10]]]
  };
  /* OmniH2O-6 数据集：6 个任务的帧数（30 Hz），合计 73,462 帧 ≈ 40.8 分钟 */
  var DATASET = [['接住扔掉', 'Catch-Release', 13234], ['下蹲', 'Squat', 8535], ['接锤子', 'Hammer-Catch', 12759],
    ['石头剪刀布', 'Rock-Paper-Scissors', 9380], ['拳击', 'Boxing', 11118], ['篮子取放', 'Basket-Pick-Place', 18436]];
  var DATA_FPS = 30;
  /* 学生（部署策略）的观测：一步 63 维本体感受 + 27 维目标（单步 90 维），再叠 25 步历史（每步 63 维） */
  var PROP_STU = [['关节位置', 19], ['关节速度', 19], ['根角速度', 3], ['投影重力', 3], ['上一步动作', 19]];
  var PROP_DIM = PROP_STU.reduce(function (a, r) { return a + r[1]; }, 0); // 63
  var GOAL_DIM = 3 * 3 * 3; // 27
  var HIST = 25;
  var OBS_DIM = PROP_DIM + GOAL_DIM + HIST * PROP_DIM; // 1665
  /* 教师（特权策略）：本体感受 361 维（23 个刚体：20 个连杆 + 两手 + 头）+ 目标 552 维 = 913 维（PMLR 定稿表 4 的叫法） */
  var TEACH_P = [['刚体位置', 66], ['刚体旋转', 138], ['刚体速度', 69], ['刚体角速度', 69], ['上一步动作', 19]];
  var TEACH_G = [['位置差', 69], ['旋转差', 138], ['速度差', 69], ['角速度差', 69], ['参考位置', 69], ['参考旋转', 138]];
  /* 惩罚课程（附录 F）：负奖励乘 s；回合平均长度 < 40 步 s × 0.9999，> 120 步 s × 1.0001；s 从 0.5 起、上限 1。
     官方代码：s × (1 ∓ 0.00001)，阈值 50 / 120，范围 [0.25, 1]，按名单乘（名单里有正的腾空时间奖励） */
  var CURR = { s0: 0.5, down: 0.9999, up: 1.0001, lo: 40, hi: 120, cap: 1 };
  var CURR_CODE = { s0: 0.5, step: 1e-5, lo: 50, hi: 120, min: 0.25, cap: 1 };
  function stepsToDouble(f) { return Math.log(2) / Math.log(f); }
  /* 每一步的最高抬脚（表 15 / 代码 rewards_teleop_omnih2o_teacher.yaml）：0.25 m 量的是踝关节连杆原点，站着时它就有 0.068 m */
  var FEET = { h: 0.25, wCode: -2500, wPaper: 1000, ankle0: 0.068, air: 0.25, wAir: 1000, dt: 0.02 };
  function feetCode(hmax) { return FEET.wCode * Math.max(FEET.h - hmax, 0); }
  function feetPaper(hmax) { return FEET.wPaper * Math.max(hmax - FEET.h, 0); }
  /* 域随机化（表 16）与真机系统（附录 A） */
  var DR = [['摩擦', 'U(0.2, 1.1)'], ['躯干质心偏移', '±0.1 m'], ['连杆质量', '× 0.7–1.3'], ['P / D 增益', '× 0.75–1.25'],
    ['力矩噪声', '0.1 × 上限'], ['控制延迟', '20–60 ms'], ['参考偏移', '±0.02 / ±0.02 / ±0.1'], ['推一把', '每 5 s，1 m/s'], ['地形', '平地 / 粗糙 / 低矮障碍']];
  var SYS = { policyHz: 50, vioHz: 60, latencyMs: 20, dataHz: 30 };

  // ─── 官方样例的复现数据（KIT 572 号受试者的左手出拳，官方 legged_gym/resources/motions/h1/stable_punch.pkl） ──
  /* 三张 H1 贴图表：Robot_Retarget_Online 的 three.js 材质与光照、MuJoCo Menagerie 的 H1，正交相机（与 project() 同一套）。
     stable = 官方样例的 pose_aa（根固定在 (0, 0, 0.979)、腿是默认站姿、上身是重定向结果）；squat = 我们照论文做的蹲姿版
     （髋 −0.8、膝 1.6、踝 −0.8 rad，根降到 0.7995 m）；retarget = 我们用官方 dof 字段近似重建的原始重定向（只解根部的位姿）。
     都取原 30 fps 的第 30–148 帧（第 1.00–4.93 s）、隔帧抽成 15 fps 共 60 帧 */
  var SHEETS = {"stable": {"file": "h1_stable.webp", "R": 220, "yaw": 1.1, "pitch": 0.1, "cw": 248, "ch": 396, "cols": 12, "n": 60, "ax": 72.0, "ay": 384.5}, "squat": {"file": "h1_squat.webp", "R": 220, "yaw": 1.1, "pitch": 0.1, "cw": 248, "ch": 357, "cols": 12, "n": 60, "ax": 72.0, "ay": 345.5}, "retarget": {"file": "h1_retarget.webp", "R": 220, "yaw": 1.1, "pitch": 0.1, "cw": 203, "ch": 407, "cols": 12, "n": 60, "ax": 92.5, "ay": 406.0}};
  /* 每帧 144 个 int16（毫米）：站姿版 23 个点（20 个连杆原点 + 左手 + 右手 + 头，69）+ 重建的根位置（3）+ 人的 SMPL 24 个关节（72）。
     手 = 肘连杆坐标系里 (0.3, 0, 0)，头 = 骨盆坐标系里 (0, 0, 0.75)（官方 legged_robot.py 的 extend_body_pos）；
     重建与人都转到「第一帧朝 +x、根在原点」的显示坐标系，整体抬高 0.0422 m 让最低的脚底落地 */
  var CLIP = { fps: 15, n: 60, t0: 1.0, per: 144, data: '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' };
  var SQUAT = { a: 0.8, z: 0.7995 };
  var STAND_Z = 0.979;
  var PT = { pelvis: 0, lsp: 12, lel: 15, rsp: 16, rel: 19, lh: 20, rh: 21, head: 22, lank: 5, rank: 10 };
  var VR3 = [PT.lh, PT.rh, PT.head]; // 代码里学生的三个点：左手、右手、头（_track_bodies_extend_id 的顺序）
  var VR3_ZH = ['左手', '右手', '头'];
  /* 8 个点（H2O 的那一组：双踝、双肩、双肘、双手）与 22 个点（20 个连杆 + 两手）；代码里两者都会自动再加上头 */
  var KP8 = [PT.lank, PT.rank, PT.lsp, PT.rsp, PT.lel, PT.rel, PT.lh, PT.rh];
  var KP22 = []; for (var kq = 0; kq < 22; kq++) KP22.push(kq);
  function decode(b64) {
    var s = atob(b64), u = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return new Int16Array(u.buffer);
  }
  var RAW = null;
  function raw() { if (!RAW) RAW = decode(CLIP.data); return RAW; }
  function vec3(a, o) { return [a[o] / 1000, a[o + 1] / 1000, a[o + 2] / 1000]; }
  /* 第 k 帧：站姿版 23 个点、重建的根、人的 24 个关节 */
  var FRAMES = [];
  function frame(k) {
    k = clamp(Math.round(k), 0, CLIP.n - 1);
    if (FRAMES[k]) return FRAMES[k];
    var a = raw(), o = k * CLIP.per, st = [], hu = [], i;
    for (i = 0; i < 23; i++) st.push(vec3(a, o + 3 * i));
    var rr = vec3(a, o + 69);
    for (i = 0; i < 24; i++) hu.push(vec3(a, o + 72 + 3 * i));
    FRAMES[k] = { st: st, root: rr, human: hu };
    return FRAMES[k];
  }
  function sub3(p, q) { return [p[0] - q[0], p[1] - q[1], p[2] - q[2]]; }
  /* 例 2：第 2.40 s（15 fps 的第 21 帧）的 27 维目标，假设机器人落后参考 0.2 s（3 帧）、根在同一处；
     参考速度用 15 fps 的中心差分。根的朝向不转（站姿版），所以朝向坐标系就是世界坐标系 */
  var EX_K = 21, EX_LAG = 3;
  function goal27(k, lag) {
    var f = frame(k), g = frame(k - lag), a = frame(k - 1), b = frame(k + 1);
    return VR3.map(function (j) {
      return {
        diff: sub3(f.st[j], g.st[j]),
        ref: sub3(f.st[j], f.st[PT.pelvis]),
        own: sub3(g.st[j], g.st[PT.pelvis]),
        vel: sub3(b.st[j], a.st[j]).map(function (v) { return v * CLIP.fps / 2; })
      };
    });
  }
  var EX = { t: 2.40, ref: [[0.238, 0.677, 0.468], [0.192, -0.004, 0.358], [0.0, 0.0, 0.75]],
    own: [[0.221, 0.309, 0.392], [0.241, -0.017, 0.387], [0.0, 0.0, 0.75]],
    diff: [[0.017, 0.368, 0.076], [-0.049, 0.013, -0.029], [0.0, 0.0, 0.0]],
    vel: [[-0.232, 1.777, 1.110], [-0.337, -0.068, -0.038], [0.0, 0.0, 0.0]] };
  /* 例 1：第 2.67 s（第 25 帧）左手打到了身体左侧：站姿版的骨盆不转，人出拳时骨盆转了约 68°（重建：166.9° → 98.6°） */
  var REACH_K = 25;
  var RECON = { err: 44.3, yaw0: 166.9, yawReach: 98.6, lift: 0.0422 };

  // ─── 讲解动画：十七幕 ───────────────────────────────────────────────────────
  var svgEl = K.svgEl,
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
    C_SURFACE2 = X.surface2,
    C_INK = X.ink,
    C_INK2 = X.ink2;
  /* 全片统一：人蓝、H1 身上的点橙、VR 的三个点（头和双手）绿、误差 / 扣分红、H1 本身灰（3D 贴图） */
  var C_HUMAN = C_ACCENT, C_H1 = C_WARN, C_VR = C_GOOD;

  /* 视频里一幕要讲一分钟左右，画面不能停：draw(t, clock) 的 clock 是这一幕的真实时间
     （旁白比分镜长时 t 停在一段的末尾，clock 照走），H1 和人的动作按 clock 播；网页播放器只传 t。
     各幕的 cue 时刻都落在 0.4 / 3.6 / 7.0 / 10.4 / 13.4，一次性的出场动画不跨过这些时刻。 */
  function nowOf(t, clock) {
    return clock == null ? t : clock;
  }
  /* 一段窗口：a 之后 0.3 s 起淡入 0.4 s，到 b 才开始淡出 0.3 s（先淡出再淡入，两层字不交叉）。
     淡出必须落在 b 之后：视频里旁白比分镜长时，stage.html 把 t 停在 b 前一点（AGENTS.md「面板到 cue 之后才淡出」） */
  function win(t, a, b) {
    return seg(t, a + 0.3, a + 0.7) * (b == null ? 1 : 1 - seg(t, b, b + 0.3));
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
    if (o.strike) g.appendChild(paint(svgEl('line', { x1: x + 6, y1: y + h / 2, x2: x + w - 6, y2: y + h / 2, 'stroke-width': 2 }), null, C_BAD));
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
  function ring(parent, cx, cy, rx, ry, color) {
    var e = paint(svgEl('ellipse', { cx: cx, cy: cy, rx: rx, ry: ry || rx, fill: 'none', 'stroke-width': 2.6 }), null, color);
    parent.appendChild(e);
    return e;
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
  function arrow(parent, color, width) {
    var g = group(parent), l = hline(g, 0, 0, 0, 0, color, width || 2.4), h = arrowHead(g, color);
    return {
      g: g,
      set: function (x1, y1, x2, y2, size) { setLine(l, x1, y1, x2, y2); h.set(x1, y1, x2, y2, size || 9); }
    };
  }
  /* 论文原图：白底圆角卡片里放图，下面一行小字写图号；opts.ar 给图的宽 / 高，px(u, v) 按图本身的范围取比例 */
  function paperFig(parent, file, x, y, w, h, caption, opts) {
    var o = opts || {}, g = group(parent), pad = o.pad == null ? 3 : o.pad;
    g.appendChild(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 5, fill: '#ffffff', stroke: 'none' }));
    g.appendChild(svgEl('image', { href: PAPER_IMG_BASE + file, x: (x + pad).toFixed(1), y: (y + pad).toFixed(1), width: (w - 2 * pad).toFixed(1), height: (h - 2 * pad).toFixed(1), preserveAspectRatio: 'xMidYMid meet' }));
    if (caption) g.appendChild(svgText(o.capX == null ? x + w / 2 : o.capX, o.capY == null ? y + h + 15 : o.capY, caption, 'demo-x-mut', 9, o.capAnchor || 'middle'));
    var iw = w - 2 * pad, ih = h - 2 * pad, cw = iw, ch = ih;
    if (o.ar) { if (iw / ih > o.ar) cw = ih * o.ar; else ch = iw / o.ar; }
    var ox = x + pad + (iw - cw) / 2, oy = y + pad + (ih - ch) / 2;
    return { g: g, x: x, y: y, w: w, h: h, cw: cw, ch: ch, px: function (u, v) { return [ox + u * cw, oy + v * ch]; } };
  }
  /* 论文图的一块：图片 imgW × imgH 像素，按比例裁出 (u0, v0)–(u1, v1)，宽度为 w（高按比例）摆到 (x, y)，白底；返回实际高 */
  function figPart(parent, file, imgW, imgH, u0, v0, u1, v1, x, y, w, caption) {
    var g = group(parent), cw = (u1 - u0) * imgW, chh = (v1 - v0) * imgH, h = w * chh / cw;
    g.appendChild(svgEl('rect', { x: (x - 3).toFixed(1), y: (y - 3).toFixed(1), width: (w + 6).toFixed(1), height: (h + 6).toFixed(1), rx: 5, fill: '#ffffff', stroke: 'none' }));
    var box = svgEl('svg', { x: x.toFixed(1), y: y.toFixed(1), width: w.toFixed(1), height: h.toFixed(1), overflow: 'hidden', preserveAspectRatio: 'none',
      viewBox: [(u0 * imgW).toFixed(1), (v0 * imgH).toFixed(1), cw.toFixed(1), chh.toFixed(1)].join(' ') });
    box.appendChild(svgEl('image', { href: PAPER_IMG_BASE + file, x: 0, y: 0, width: imgW, height: imgH, preserveAspectRatio: 'none' }));
    g.appendChild(box);
    if (caption) g.appendChild(svgText(x + w / 2, y + h + 18, caption, 'demo-x-mut', 9.5, 'middle'));
    return { g: g, h: h, x: x, y: y, w: w };
  }
  /* 项目页的一段真机视频：深色底框，下面一行小字写出处与倍速；draw 里调 .at(秒, 是否可见) */
  function projClip(parent, id, x, y, w, h, caption, opts) {
    var o = opts || {}, g = group(parent);
    g.appendChild(svgEl('rect', { x: (x - 2).toFixed(1), y: (y - 2).toFixed(1), width: (w + 4).toFixed(1), height: (h + 4).toFixed(1), rx: 5, fill: '#111111', stroke: 'none' }));
    var c = K.svgClip(x, y, w, h, CLIP_BASE + id + '.mp4', { poster: CLIP_BASE + id + '.webp' });
    g.appendChild(c);
    if (caption) label(g, o.capX == null ? x + w / 2 : o.capX, y + h + (o.capDy || 17), caption, 'demo-x-mut', o.capSize || 9.5, o.capAnchor || 'middle');
    return { g: g, x: x, y: y, w: w, h: h, at: function (sec, vis) { c.at(sec, vis); } };
  }
  /* 三维 → 画布：z 朝上；绕竖轴转 yaw、抬头 pitch 的正交投影。cam = { yaw, pitch, s(像素/米), ox, oy, cx, cy }：
     (cx, cy) 是地面上对准画布 (ox, oy) 的那一点。H1 的贴图是同一套相机离线渲染的 */
  function project(p, cam) {
    var dx = p[0] - (cam.cx || 0), dy = p[1] - (cam.cy || 0);
    var c = Math.cos(cam.yaw || 0), s = Math.sin(cam.yaw || 0);
    var xr = dx * c + dy * s, depth = -dx * s + dy * c;
    var cp = Math.cos(cam.pitch || 0), sp = Math.sin(cam.pitch || 0);
    return [cam.ox + cam.s * xr, cam.oy - cam.s * (p[2] * cp + depth * sp), depth];
  }
  function camFor(sheet, s, ox, oy, cx, cy) {
    return { yaw: sheet.yaw, pitch: sheet.pitch, s: s, ox: ox, oy: oy, cx: cx || 0, cy: cy || 0 };
  }
  /* 一台 H1：贴图表里的一格；put(root, cam, 帧号) 摆到根部正下方的地面点。贴图第一次用到才设 href */
  function h1Mesh(parent, sheet, opts) {
    var o = opts || {}, M = sheet, g = group(parent), rows = Math.ceil(M.n / M.cols);
    g.setAttribute('class', 'demo-x-g1mesh');
    var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: 0, height: 0 });
    var img = svgEl('image', { x: 0, y: 0, width: M.cw * M.cols, height: M.ch * rows, preserveAspectRatio: 'none' });
    box.appendChild(img);
    g.appendChild(box);
    if (o.ghost) g.style.opacity = o.ghost;
    var woke = false, lastF = -1;
    return {
      g: g,
      put: function (root, cam, fr) {
        if (!woke && H1_3D_BASE) { woke = true; img.setAttribute('href', H1_3D_BASE + M.file); }
        var k = cam.s / M.R, a = project([root[0], root[1], 0], cam);
        var f = clamp(Math.round(fr || 0), 0, M.n - 1);
        box.setAttribute('x', (a[0] - M.ax * k).toFixed(1));
        box.setAttribute('y', (a[1] - M.ay * k).toFixed(1));
        box.setAttribute('width', (M.cw * k).toFixed(1));
        box.setAttribute('height', (M.ch * k).toFixed(1));
        if (f !== lastF) {
          box.setAttribute('viewBox', [(f % M.cols) * M.cw, Math.floor(f / M.cols) * M.ch, M.cw, M.ch].join(' '));
          lastF = f;
        }
      }
    };
  }
  /* 人的骨架（SMPL 的 24 个关节）：两腿、脊柱到头、两臂 */
  var H_CHAINS = [[0, 1, 4, 7, 10], [0, 2, 5, 8, 11], [0, 3, 6, 9, 12, 15], [9, 13, 16, 18, 20, 22], [9, 14, 17, 19, 21, 23]];
  function humanSkel(parent, opts) {
    var o = opts || {}, g = group(parent), color = o.color || C_HUMAN;
    var paths = H_CHAINS.map(function () { return pathLine(g, [], color, o.sw || 3); });
    var head = paint(svgEl('circle', { cx: 0, cy: 0, r: o.head || 9, fill: 'none', 'stroke-width': o.sw || 3 }), null, color);
    g.appendChild(head);
    if (o.dash) paths.forEach(function (p) { p.setAttribute('stroke-dasharray', o.dash); });
    return {
      g: g,
      put: function (P3, cam) {
        var P = P3.map(function (p) { return project(p, cam); });
        H_CHAINS.forEach(function (ch, i) { setPath(paths[i], ch.map(function (j) { return P[j]; })); });
        var hd = P[15];
        head.setAttribute('cx', hd[0].toFixed(1)); head.setAttribute('cy', (hd[1] - (o.head || 9) * 0.7).toFixed(1));
        return P;
      }
    };
  }
  /* 一组点（H1 身上的点、VR 的三个点） */
  function dotLayer(parent, n, r, color) {
    var g = group(parent), ds = [];
    for (var i = 0; i < n; i++) ds.push(dotAt(g, 0, 0, r, color));
    return {
      g: g, dots: ds,
      put: function (P3, cam, idx) {
        return (idx || P3.map(function (p, i) { return i; })).map(function (j, i) {
          var q = project(P3[j], cam); moveDot(ds[i], q); return q;
        });
      }
    };
  }
  /* 帧号：按真实时间循环播放 */
  function loopFrame(now, start) {
    return Math.floor((start || 0) + now * CLIP.fps) % CLIP.n;
  }
  function groundLine(parent, x1, x2, y) {
    return hline(parent, x1, y, x2, y, C_BORDER, 1.4);
  }
  function f1(x) { return fmt(x, 1); }
  function f2(x) { return fmt(x, 2); }
  function f3(x) { return fmt(x, 3); }
  /* 排版用的负号 */
  function sgn(s) { return String(s).replace(/-/g, '−'); }
  function vec(p, d) { return '(' + p.map(function (v) { return sgn(fmt(v, d == null ? 3 : d)); }).join(', ') + ')'; }
  /* 横向条形图的一行：标签、条、数字 */
  function barRowAt(parent, x, y, labelW, maxW, str, color, h) {
    var g = group(parent);
    label(g, x + labelW - 8, y + (h || 16) / 2 + 4, str, 'demo-x-ink2', 11, 'end');
    var b = hbar(g, x + labelW, y, h || 16, color);
    var v = label(g, x + labelW + 6, y + (h || 16) / 2 + 4, '', 'demo-x-ink', 11);
    return {
      g: g,
      set: function (w, txt) { setW(b, w); v.setAttribute('x', (x + labelW + Math.max(0, w) + 6).toFixed(1)); v.textContent = txt; }
    };
  }
  /* VR 头显的小图标 */
  function vrIcon(parent, x, y, color) {
    var g = group(parent);
    g.appendChild(paint(svgEl('rect', { x: x - 15, y: y - 8, width: 30, height: 16, rx: 6, 'stroke-width': 1.8 }), C_SURFACE, color));
    dotAt(g, x - 6, y, 3.2, color);
    dotAt(g, x + 6, y, 3.2, color);
    return g;
  }

  /* ── scene 1: H2O 留下的问题 ── */
  function buildSceneGap() {
    var s = sceneSvg('左边：官方样例里的一段出拳（站姿版）由 Unitree H1 做出来，头和双手三个点发绿光，这是 VR 头显给得出的三个点；右边依次出现：' +
      'OmniH2O 的目标、H2O 做到与没做到的、全身控制为什么难、遥操作接口为什么贵、OmniH2O 的三条贡献');
    s.appendChild(svgText(30, 28, 'VR 头显只给三个点：头和双手（官方样例：站姿版出拳）', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 360, 350, C_BORDER, C_SURFACE2);
    var GY = 376, SC = 150, cam = camFor(SHEETS.stable, SC, 196, GY, 0, 0);
    groundLine(left, 46, 374, GY);
    var h1 = h1Mesh(left, SHEETS.stable);
    var rings = VR3.map(function () { return ring(left, 0, 0, 11, 11, C_VR); });
    var vr = dotLayer(left, 3, 5, C_VR);
    var names = VR3_ZH.map(function (n) { return tone(left, 0, 0, n, C_VR, 11, 'middle'); });
    var icon = vrIcon(left, 330, 80, C_VR);
    label(left, 330, 106, 'VR 头显', 'demo-x-mut', 10, 'middle');
    var R = 410;
    var p1 = group(s);
    label(p1, R, 70, '目标：人形机器人的全身灵巧移动操作', 'demo-x-ink', 14);
    chip(p1, R, 88, 170, '手指也要动', C_GOOD, { size: 12 });
    chip(p1, R + 182, 88, 178, '上下身一起协调', C_GOOD, { size: 12 });
    chip(p1, R, 126, 170, '接口便宜、好用', C_GOOD, { size: 12 });
    chip(p1, R + 182, 126, 178, '录下来能训自主策略', C_GOOD, { size: 12 });
    label(p1, R, 190, '论文的出发点：像大模型一样，', 'demo-x-ink2', 12.5);
    label(p1, R, 212, '先在真实世界里大规模采人的示范', 'demo-x-ink2', 12.5);
    var p2 = group(s);
    label(p2, R, 70, '上一篇 H2O：做到了，但不够', 'demo-x-ink', 14);
    chip(p2, R, 88, 360, '✓ 一台 RGB 摄像头，实时全身遥操作', C_GOOD, { size: 12, left: true });
    chip(p2, R, 126, 360, '✗ 测试时还要动捕：根部线速度进观测', C_BAD, { size: 12, left: true });
    chip(p2, R, 164, 360, '✗ RGB 估姿态慢、不准：只做得了简单移动', C_BAD, { size: 12, left: true });
    chip(p2, R, 202, 360, '✗ 站不住：总在原地挪小碎步', C_BAD, { size: 12, left: true });
    chip(p2, R, 240, 360, '✗ 没有手，做不了精细操作', C_BAD, { size: 12, left: true });
    var p3 = group(s);
    label(p3, R, 70, '全身控制本身就难', 'demo-x-ink', 14);
    chip(p3, R, 88, 360, '很多工作只管下身：走路、跑', C_WARN, { size: 12, left: true });
    chip(p3, R, 126, 360, '或者上下身拆成两个控制器', C_WARN, { size: 12, left: true });
    chip(p3, R, 164, 360, '目标走路速度：要别的策略再给下身', C_WARN, { size: 12, left: true });
    label(p3, R, 222, '灵巧操作要稳的下身托着：', 'demo-x-ink2', 12.5);
    label(p3, R, 244, '上下身得一起协调，端到端一个策略', 'demo-x-ink2', 12.5);
    var p4 = group(s);
    label(p4, R, 70, '遥操作接口贵，数据就采不多', 'demo-x-ink', 14);
    chip(p4, R, 88, 170, '动捕', C_BAD, { size: 12.5, strike: true });
    chip(p4, R + 182, 88, 178, '外骨骼驾驶舱', C_BAD, { size: 12.5, strike: true });
    chip(p4, R, 136, 360, 'VR 头显：只知道头和双手 3 个点', C_GOOD, { size: 12.5, left: true });
    label(p4, R, 196, '输入一稀疏，强化学习就难训', 'demo-x-ink2', 12.5);
    label(p4, R, 218, '（后面靠教师—学生解决）', 'demo-x-mut', 12);
    var p5 = group(s);
    label(p5, R, 70, 'OmniH2O 的三条贡献', 'demo-x-ink', 14);
    chip(p5, R, 88, 360, '① 一套训练流程：一个策略跟任意来源的运动学目标', C_ACCENT, { size: 11.5, left: true });
    chip(p5, R, 126, 360, '② 仿真和真机里的大规模跟踪实验', C_ACCENT, { size: 11.5, left: true });
    chip(p5, R, 164, 360, '③ 首个人形全身移动操作数据集 OmniH2O-6', C_ACCENT, { size: 11.5, left: true });
    label(p5, R, 222, '人通过 VR / RGB / 语言控制，', 'demo-x-ink2', 12.5);
    label(p5, R, 244, '也能交给 GPT-4o 或模仿学习的策略', 'demo-x-ink2', 12.5);
    function draw(t, clock) {
      var now = nowOf(t, clock), k = loopFrame(now, 0), f = frame(k);
      h1.put([0, 0], cam, k);
      var q = vr.put(f.st, cam, VR3);
      var pulse = 11 + 3 * Math.sin(now * 4);
      rings.forEach(function (r, i) { r.setAttribute('cx', q[i][0].toFixed(1)); r.setAttribute('cy', q[i][1].toFixed(1)); r.setAttribute('rx', pulse.toFixed(1)); r.setAttribute('ry', pulse.toFixed(1)); });
      names.forEach(function (n, i) { n.setAttribute('x', (q[i][0] + (i === 0 ? 36 : i === 1 ? -62 : 0)).toFixed(1)); n.setAttribute('y', (q[i][1] + (i === 2 ? -20 : 4)).toFixed(1)); });
      setOpacity(icon, seg(t, 10.7, 11.1));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 运动学姿态：一个通用接口（图 3） ── */
  function buildSceneInterface() {
    var s = sceneSvg('论文图 3 的总览：(a) 重定向与筛数据，(b) 仿真里先用强化学习训特权教师、再监督学生，(c) 真机上的各种接口；' +
      '旁白念到哪一块就框出哪一块：人的接口、自主智能体、三个点的运动目标、手的逆运动学');
    var FX = 12, FY = 36, FW = 566, FH = 349;
    var fig = paperFig(s, 'fig3_pipeline.webp', FX, FY, FW, FH, '论文图 3', { ar: 1700 / 1049, pad: 2, capY: FY + FH + 15 });
    function boxOn(u0, v0, u1, v1, color) {
      var a = fig.px(u0, v0), b = fig.px(u1, v1);
      var r = paint(svgEl('rect', { x: a[0] - 1, y: a[1] - 1, width: b[0] - a[0] + 2, height: b[1] - a[1] + 2, rx: 6, fill: 'none', 'stroke-width': 3.2 }), null, color);
      s.appendChild(r);
      return r;
    }
    var bA = boxOn(0, 0, 0.318, 0.455, C_WARN), bB = boxOn(0.328, 0, 1, 0.455, C_BAD), bC = boxOn(0, 0.465, 1, 1, C_ACCENT);
    var bIf = boxOn(0.005, 0.51, 0.435, 0.79, C_GOOD), bAg = boxOn(0.005, 0.80, 0.623, 0.98, C_WARN);
    var bGoal = boxOn(0.452, 0.548, 0.62, 0.75, C_BAD), bHand = boxOn(0.62, 0.68, 0.89, 0.77, C_ACCENT);
    var RX = 592;
    var c0 = group(s);
    label(c0, RX, 60, '三块', 'demo-x-ink', 14);
    chip(c0, RX, 76, 196, '(a) 重定向 + 筛数据', C_WARN, { size: 12, left: true });
    chip(c0, RX, 112, 196, '(b) 仿真：先 RL 教师，再监督学生', C_BAD, { size: 11, left: true });
    chip(c0, RX, 148, 196, '(c) 真机：各种接口与学习', C_ACCENT, { size: 12, left: true });
    label(c0, RX, 208, '底层只有一个策略', 'demo-x-ink2', 12.5);
    rich(c0, RX, 230, '$\\pi_{\\text{OmniH2O}}$ 跟踪运动目标', 12.5, 'demo-x-ink2');
    var c1 = group(s);
    label(c1, RX, 60, '接口：运动学姿态', 'demo-x-ink', 14);
    c1.appendChild(svgMath(RX + 98, 96, '\\mathbf{q}_t \\triangleq (\\boldsymbol{\\theta}_t,\\, \\mathbf{p}_t)', { size: 17, anchor: 'middle', w: 196 }));
    label(c1, RX, 132, '每个关节的 3D 旋转和位置', 'demo-x-mut', 11.5);
    ['VR 头显', 'RGB 摄像头', '手柄', '外骨骼', '动捕', '语言 → MDM'].forEach(function (n, i) {
      chip(c1, RX + (i % 2) * 102, 148 + Math.floor(i / 2) * 36, 94, n, C_GOOD, { size: 11.5 });
    });
    label(c1, RX, 276, '谁都给得出这个，底层就能复用', 'demo-x-ink2', 11.5);
    var c2 = group(s);
    label(c2, RX, 60, '自主也走同一个接口', 'demo-x-ink', 14);
    chip(c2, RX, 76, 196, 'GPT-4o：选动作原语', C_WARN, { size: 12, left: true });
    chip(c2, RX, 112, 196, '或直接回几个数：手和头的位置', C_WARN, { size: 11, left: true });
    chip(c2, RX, 148, 196, '扩散策略：从遥操作数据学', C_WARN, { size: 11.5, left: true });
    rich(c2, RX, 206, '$\\pi_{\\text{LfD}}$ 输出运动目标，', 12, 'demo-x-ink2');
    label(c2, RX, 228, '不直接输出电机指令', 'demo-x-ink2', 12);
    var c3 = group(s);
    label(c3, RX, 60, '遥操作只用位置', 'demo-x-ink', 14);
    rich(c3, RX, 88, '目标里只放 $\\tilde{\\mathbf{p}}_t$，不放旋转：', 12, 'demo-x-ink2');
    label(c3, RX, 110, 'VR 估全身旋转太难', 'demo-x-ink2', 12);
    chip(c3, RX, 128, 196, '头 + 左手 + 右手 = 3 个点', C_VR, { size: 12 });
    label(c3, RX, 188, '图里的红点就是运动目标；', 'demo-x-mut', 11.5);
    label(c3, RX, 208, 'RGB、语言也只给这 3 个点', 'demo-x-mut', 11.5);
    var c4 = group(s);
    label(c4, RX, 60, '手指不走策略', 'demo-x-ink', 14);
    chip(c4, RX, 76, 196, 'VR 估出的手部姿态', C_ACCENT, { size: 12 });
    chip(c4, RX, 112, 196, '→ 逆运动学 → 灵巧手控制器', C_ACCENT, { size: 11.5 });
    label(c4, RX, 170, '论文的记号', 'demo-x-ink2', 12.5);
    rich(c4, RX, 194, '$\\tilde{\\cdot}$ VR / 动作生成器给的', 12, 'demo-x-ink2');
    rich(c4, RX, 218, '$\\hat{\\cdot}$ 动捕数据的真值', 12, 'demo-x-ink2');
    label(c4, RX, 242, '不带帽子：仿真或真机里的', 'demo-x-ink2', 12);
    function draw(t) {
      [bA, bB, bC].forEach(function (b, i) { setOpacity(b, seg(t, 0.6 + i * 0.4, 1.0 + i * 0.4) * (1 - seg(t, 3.6, 3.9))); });
      setOpacity(c0, win(t, 0.3, 3.6));
      setOpacity(bIf, win(t, 3.6, 7.0)); setOpacity(c1, win(t, 3.6, 7.0));
      setOpacity(bAg, win(t, 7.0, 10.4)); setOpacity(c2, win(t, 7.0, 10.4));
      setOpacity(bGoal, win(t, 10.4, 13.4)); setOpacity(c3, win(t, 10.4, 13.4));
      setOpacity(bHand, win(t, 13.4)); setOpacity(c4, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 站住、蹲住：给动作库加偏置（图 2、图 9） ── */
  function buildSceneVariants() {
    var s = sceneSvg('四列同步播放同一段出拳：(a) 人的原动作（官方样例里的 SMPL 关节），(b) 重定向到 H1（我们用官方 dof 字段近似重建），' +
      '(c) 站姿版（官方样例：根固定、腿是默认站姿），(d) 蹲姿版（我们照论文做的）；最后换成论文图 9 的消融');
    var GY = 318, SC = 96, XS = [104, 296, 494, 690];
    var cols = group(s);
    groundLine(cols, 24, 776, GY);
    var hum = humanSkel(cols, { sw: 2.6, head: 7 });
    var bRe = h1Mesh(cols, SHEETS.retarget), bSt = h1Mesh(cols, SHEETS.stable), bSq = h1Mesh(cols, SHEETS.squat);
    var cams = XS.map(function (x, i) { return camFor(i === 3 ? SHEETS.squat : SHEETS.stable, SC, x, GY, 0, 0); });
    var heads = [['(a) 人：原动作', 'AMASS · KIT 572 号'], ['(b) 重定向到 H1', '我们的近似重建'], ['(c) 站姿版', '官方样例 stable_punch'], ['(d) 蹲姿版', '我们照论文做的']];
    var colTags = heads.map(function (h, i) {
      var g = group(cols);
      label(g, XS[i], GY + 21, h[0], 'demo-x-ink', 12.5, 'middle');
      label(g, XS[i], GY + 42, h[1], 'demo-x-mut', 10.5, 'middle');
      return g;
    });
    var hiC = rectBox(cols, XS[2] - 92, 66, 184, 336, C_GOOD, 'none'), hiD = rectBox(cols, XS[3] - 92, 66, 184, 336, C_WARN, 'none'), hiB = rectBox(cols, XS[1] - 92, 66, 184, 336, C_MUTED, 'none', '5 4');
    [hiC, hiD, hiB].forEach(function (r) { r.style.fill = 'none'; r.setAttribute('stroke-width', 2.6); });
    var top0 = group(s);
    chip(top0, 150, 20, 500, 'H2O 的毛病：机器人总在原地挪小碎步，站不住', C_BAD, { size: 12.5, h: 30 });
    var top1 = group(s);
    chip(top1, 110, 20, 580, '每段动作再做一份稳定版：根固定，下半身固定成站姿或蹲姿，上半身照旧', C_ACCENT, { size: 12, h: 30 });
    var top2 = group(s);
    chip(top2, 120, 20, 560, '官方样例：根在 (0, 0, 0.979) m，朝向不转；腿 −0.4 / 0.8 / −0.4 rad', C_GOOD, { size: 12, h: 30 });
    var top3 = group(s);
    chip(top3, 110, 20, 580, '蹲姿版：髋 −0.8、膝 1.6、踝 −0.8 rad，根降到 0.80 m（我们做的）', C_WARN, { size: 12, h: 30 });
    var top4 = group(s);
    var f9 = figPart(top4, 'fig9_aug.webp', 1328, 219, 0, 0, 1, 1, 34, 96, 732, '论文图 9：(a) 加了站姿 / 蹲姿数据 (b) 不加');
    chip(top4, 110, 20, 580, '不加这些数据：很难站住不动、只动上身', C_BAD, { size: 12.5, h: 30 });
    label(top4, 400, 96 + f9.h + 46, '训练数据要偏向「站」和「蹲」', 'demo-x-ink', 14, 'middle');
    function draw(t, clock) {
      var now = nowOf(t, clock), k = loopFrame(now, 0), f = frame(k);
      hum.put(f.human, cams[0]);
      bRe.put(f.root, cams[1], k);
      bSt.put([0, 0], cams[2], k);
      bSq.put([0, 0], cams[3], k);
      var late = seg(t, 13.4, 13.7);
      setOpacity(cols, 1 - 0.92 * late);
      [hum.g, bRe.g, colTags[0], colTags[1]].forEach(function (g) { setOpacity(g, 1); });
      [bSt.g, bSq.g, colTags[2], colTags[3]].forEach(function (g) { setOpacity(g, seg(t, 3.9, 4.4)); });
      setOpacity(hiC, win(t, 7.0, 10.4));
      setOpacity(hiD, win(t, 10.4, 13.4));
      setOpacity(hiB, win(t, 10.4, 13.4));
      setOpacity(top0, win(t, 0.3, 3.6));
      setOpacity(top1, win(t, 3.6, 7.0));
      setOpacity(top2, win(t, 7.0, 10.4));
      setOpacity(top3, win(t, 10.4, 13.4));
      setOpacity(top4, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 每一步的最高抬脚（玩具示意） ── */
  /* 三种步态的踝关节高度（m）：小碎步每 0.5 s 抬一只脚、最高 0.12；大步每 1 s 一步、最高 0.30；站住不抬。
     每一步落地时结算 −2500 × max(0.25 − h_max, 0)（官方代码；还要乘 dt = 0.02 和课程系数 s） */
  var GAITS = [
    { zh: '原地小碎步', period: 0.5, swing: 0.3, peak: 0.12, phase: 0.1 },
    { zh: '迈大步', period: 1.0, swing: 0.5, peak: 0.30, phase: 0.2 },
    { zh: '站住不动', period: 0, swing: 0, peak: FEET.ankle0, phase: 0 }
  ];
  function gaitSwings(g, T) {
    var out = [];
    if (!g.period) return out;
    for (var t0 = g.phase, i = 0; t0 + g.swing <= T + 1e-9; t0 += g.period, i++) out.push({ a: t0, b: t0 + g.swing, foot: i % 2 });
    return out;
  }
  function gaitHeight(g, foot, t) {
    var sw = gaitSwings(g, 4), z = FEET.ankle0;
    sw.forEach(function (w) {
      if (w.foot === foot && t > w.a && t < w.b) z = FEET.ankle0 + (g.peak - FEET.ankle0) * Math.sin(Math.PI * (t - w.a) / (w.b - w.a));
    });
    return z;
  }
  function gaitTotal(g) { return gaitSwings(g, 4).reduce(function (a) { return a + feetCode(g.peak); }, 0); }
  function buildSceneFeet() {
    var s = sceneSvg('三行时间轴（0–4 秒）画踝关节的高度：原地小碎步、迈大步、站住不动；红色虚线是 0.25 m。' +
      '每一步落地时结算一次分数：小碎步每一步都扣，大步不扣，站住不落地也不扣；右边是 4 秒累计。这是示意，不是论文的仿真');
    var X0 = 132, XW = 440, PX = XW / 4, ZS = 210, ROWS = [118, 214, 310];
    var tl = group(s);
    var curves = [], marks = [];
    GAITS.forEach(function (g, r) {
      var base = ROWS[r];
      label(tl, X0 - 12, base - 8, g.zh, 'demo-x-ink', 12.5, 'end');
      hline(tl, X0, base, X0 + XW, base, C_BORDER, 1.2);
      hline(tl, X0, base - ZS * (FEET.h - 0.0), X0 + XW, base - ZS * (FEET.h - 0.0), C_BAD, 1.4, '6 4');
      curves.push([pathLine(tl, [], C_H1, 2.4), pathLine(tl, [], C_ACCENT, 2.4, '5 3')]);
      marks.push(gaitSwings(g, 4).map(function (w) {
        var mg = group(tl), x = X0 + PX * w.b;
        dotAt(mg, x, base, 4.2, feetCode(g.peak) < 0 ? C_BAD : C_GOOD);
        tone(mg, x, base + 16, feetCode(g.peak) < 0 ? sgn(String(Math.round(feetCode(g.peak)))) : '0', feetCode(g.peak) < 0 ? C_BAD : C_GOOD, 10.5, 'middle');
        return { g: mg, at: w.b };
      }));
    });
    label(tl, X0 + XW + 6, ROWS[0] - ZS * FEET.h + 4, '0.25 m', 'demo-x-mut', 10);
    [0, 1, 2, 3, 4].forEach(function (k) { label(tl, X0 + PX * k, ROWS[2] + 36, k + ' s', 'demo-x-mut', 10, 'middle'); });
    tone(tl, X0, 54, '实线：左踝', C_H1, 11); tone(tl, X0 + 90, 54, '虚线：右踝', C_ACCENT, 11);
    label(tl, X0 + 190, 54, '纵轴：踝关节连杆离地的高度', 'demo-x-mut', 11);
    var p0 = group(s);
    chip(p0, 128, 4, 540, '以前：奖励「腾空时间」「抬脚高度」→ 机器人为了平衡原地跺脚', C_BAD, { size: 12, h: 28 });
    var p1 = group(s);
    chip(p1, 128, 4, 540, '新加一项：每一步落地那一刻，看这一步脚最高抬到多少', C_ACCENT, { size: 12, h: 28 });
    var p2 = group(s);
    p2.appendChild(svgMath(400, 24, 'r = -2500 \\cdot \\max(0.25 - h_{\\max},\\, 0)', { size: 16, anchor: 'middle', w: 420 }));
    var tot = group(s);
    label(tot, 612, 60, '4 秒累计', 'demo-x-ink', 13);
    label(tot, 612, 78, '（还要乘 dt 和课程系数 s）', 'demo-x-mut', 10);
    var totBars = GAITS.map(function (g, r) {
      var b = hbar(tot, 612, ROWS[r] - 22, 16, C_BAD, 0.85);
      var v = tone(tot, 612, ROWS[r] - 28, '', C_BAD, 12);
      return { b: b, v: v, total: gaitTotal(g) };
    });
    var p4 = group(s);
    rectBox(p4, 600, 236, 190, 150, C_WARN, C_SURFACE2);
    label(p4, 612, 258, '论文表 15 和代码不一样', 'demo-x-ink', 12);
    label(p4, 612, 282, '论文：超过 0.25 m 才加分', 'demo-x-ink2', 11);
    label(p4, 612, 302, '（权重 +1000）', 'demo-x-mut', 10.5);
    label(p4, 612, 325, '代码：不到 0.25 m 就扣分', 'demo-x-ink2', 11);
    label(p4, 612, 345, '（权重 −2500）', 'demo-x-mut', 10.5);
    label(p4, 612, 369, '踝关节站着就离地 0.068 m', 'demo-x-ink2', 11);
    function draw(t) {
      var show = seg(t, 3.9, 4.4);
      GAITS.forEach(function (g, r) {
        var base = ROWS[r];
        [0, 1].forEach(function (foot) {
          var pts = [];
          for (var i = 0; i <= 120; i++) {
            var tt = 4 * i / 120;
            pts.push([X0 + PX * tt, base - ZS * gaitHeight(g, foot, tt)]);
          }
          setPath(curves[r][foot], pts);
        });
        marks[r].forEach(function (m) { setOpacity(m.g, show * seg(t, 7.0 + 0.6 * m.at, 7.3 + 0.6 * m.at)); });
      });
      setOpacity(tl, 0.35 + 0.65 * show);
      totBars.forEach(function (tb) {
        var w = Math.min(150, Math.abs(tb.total) / 20) * seg(t, 10.7, 11.5);
        setW(tb.b, w);
        tb.v.setAttribute('x', (612 + w + (w ? 6 : 0)).toFixed(1));
        tb.v.setAttribute('y', (parseFloat(tb.b.getAttribute('y')) + 13).toFixed(1));
        tb.v.textContent = tb.total ? sgn(String(Math.round(tb.total * seg(t, 10.7, 11.5)))) : '0';
        tb.v.style.fill = tb.total ? C_BAD : C_GOOD;
      });
      setOpacity(tot, win(t, 10.4, 13.4));
      setOpacity(p0, win(t, 0.3, 3.6));
      setOpacity(p1, win(t, 3.6, 7.0));
      setOpacity(p2, win(t, 7.0));
      setOpacity(p4, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: 惩罚从一半开始（附录 F 的课程，玩具示意） ── */
  /* 假设的回合平均长度：从 20 步慢慢涨到 250 步（24000 次更新）；s 按论文的规则每次更新乘 0.9999 或 1.0001 */
  var CURR_TOY = (function () {
    var N = 24000, L = [], S = [], sv = CURR.s0;
    for (var i = 0; i <= N; i++) {
      var len = 20 + 230 * Math.pow(i / N, 1.25);
      if (len < CURR.lo) sv *= CURR.down; else if (len > CURR.hi) sv *= CURR.up;
      sv = Math.min(sv, CURR.cap);
      if (i % 200 === 0) { L.push(len); S.push(sv); }
    }
    return { N: N, L: L, S: S };
  })();
  function buildSceneCurr() {
    var s = sceneSvg('上图是假设的回合平均长度随训练上升，下面是惩罚系数 s：回合短于 40 步时 s 慢慢变小、40 到 120 步之间不变、长于 120 步时慢慢变大，' +
      '上限 1；右边是规则和官方代码的不同。曲线是示意');
    var X0 = 70, XW = 400, Y1 = 64, H1P = 120, Y2 = 232, H2P = 130;
    var plots = group(s);
    rectBox(plots, X0, Y1, XW, H1P, C_BORDER, C_SURFACE2);
    rectBox(plots, X0, Y2, XW, H2P, C_BORDER, C_SURFACE2);
    label(plots, X0, Y1 - 10, '回合平均长度（步，50 Hz）', 'demo-x-ink2', 12);
    label(plots, X0, Y2 - 10, '惩罚系数 s', 'demo-x-ink2', 12);
    function yL(v) { return Y1 + H1P - H1P * v / 260; }
    function yS(v) { return Y2 + H2P - H2P * (v - 0.2) / 0.85; }
    hline(plots, X0, yL(40), X0 + XW, yL(40), C_BAD, 1.2, '5 4');
    hline(plots, X0, yL(120), X0 + XW, yL(120), C_GOOD, 1.2, '5 4');
    tone(plots, X0 + XW + 6, yL(40) + 4, '40', C_BAD, 10.5);
    tone(plots, X0 + XW + 6, yL(120) + 4, '120', C_GOOD, 10.5);
    [0.5, 1.0].forEach(function (v) { hline(plots, X0, yS(v), X0 + XW, yS(v), C_BORDER, 1, '3 4'); label(plots, X0 - 6, yS(v) + 4, f1(v), 'demo-x-mut', 10, 'end'); });
    label(plots, X0 + XW, Y2 + H2P + 16, '训练 →', 'demo-x-mut', 10, 'end');
    var pL = pathLine(plots, [], C_ACCENT, 2.4), pS = pathLine(plots, [], C_WARN, 2.6);
    var cur = hline(plots, 0, Y1, 0, Y2 + H2P, C_INK2, 1, '3 3');
    var sVal = tone(plots, 0, 0, '', C_WARN, 12);
    var RX = 524;
    var p0 = group(s);
    label(p0, RX, 70, '一上来就罚满，会怎样？', 'demo-x-ink', 13.5);
    label(p0, RX, 96, '惩罚、正则一大堆，', 'demo-x-ink2', 12);
    label(p0, RX, 118, '强化学习被罚得不敢动，', 'demo-x-ink2', 12);
    label(p0, RX, 140, '回合很快就结束，学不会', 'demo-x-ink2', 12);
    var p1 = group(s);
    label(p1, RX, 70, '负奖励乘一个系数 s', 'demo-x-ink', 13.5);
    p1.appendChild(svgMath(RX + 132, 106, '\\mathbb{E}\\Big[\\sum_t \\gamma^{t-1} \\sum_i s_{t,i}\\, r_{t,i}\\Big]', { size: 15, anchor: 'middle', w: 264 }));
    rich(p1, RX, 146, '$r_{t,i} < 0$ 时 $s_{t,i} = s$，否则为 1', 12, 'demo-x-ink2');
    chip(p1, RX, 164, 250, 's 从 0.5 开始，上限 1', C_WARN, { size: 12 });
    var p2 = group(s);
    label(p2, RX, 70, '看回合平均长度调 s', 'demo-x-ink', 13.5);
    chip(p2, RX, 86, 250, '短于 40 步：s × 0.9999（放松）', C_BAD, { size: 11.5, left: true });
    chip(p2, RX, 122, 250, '40 到 120 步：不变', C_MUTED, { size: 11.5, left: true });
    chip(p2, RX, 158, 250, '长于 120 步：s × 1.0001（收紧）', C_GOOD, { size: 11.5, left: true });
    label(p2, RX, 214, '先学会别摔，再慢慢讲究', 'demo-x-ink2', 12);
    var p3 = group(s);
    label(p3, RX, 70, '要乘多少次？', 'demo-x-ink', 13.5);
    label(p3, RX, 98, '从 0.5 涨到 1：', 'demo-x-ink2', 12);
    tone(p3, RX, 128, '约 ' + Math.round(stepsToDouble(CURR.up)) + ' 次', C_WARN, 20);
    label(p3, RX, 158, '每重置一次环境就更新一次', 'demo-x-mut', 11);
    label(p3, RX, 178, '回合越长，罚得越重', 'demo-x-ink2', 12);
    var p4 = group(s);
    label(p4, RX, 70, '官方代码不太一样', 'demo-x-ink', 13.5);
    chip(p4, RX, 86, 250, '每次乘 1 ± 0.00001（论文 0.0001）', C_WARN, { size: 11, left: true });
    chip(p4, RX, 122, 250, '阈值 50 / 120（论文 40 / 120）', C_WARN, { size: 11, left: true });
    chip(p4, RX, 158, 250, 's 在 0.25 到 1 之间', C_WARN, { size: 11, left: true });
    chip(p4, RX, 194, 250, '按名单乘，名单里有正的腾空时间', C_WARN, { size: 11, left: true });
    function draw(t) {
      var u = seg(t, 3.9, 12.4), n = Math.max(2, Math.round(u * (CURR_TOY.L.length - 1)) + 1);
      var xs = function (i) { return X0 + XW * i / (CURR_TOY.L.length - 1); };
      setPath(pL, CURR_TOY.L.slice(0, n).map(function (v, i) { return [xs(i), yL(v)]; }));
      setPath(pS, CURR_TOY.S.slice(0, n).map(function (v, i) { return [xs(i), yS(v)]; }));
      var cx = xs(n - 1);
      setLine(cur, cx, Y1, cx, Y2 + H2P);
      // 当前的 s 写在小标题后面：贴着曲线写，涨到上限时不是压框线就是压曲线
      sVal.setAttribute('x', X0 + 62); sVal.setAttribute('y', Y2 - 10);
      sVal.textContent = '= ' + f2(CURR_TOY.S[n - 1]);
      setOpacity(plots, 0.4 + 0.6 * seg(t, 3.9, 4.3));
      setOpacity(p0, win(t, 0.3, 3.6));
      setOpacity(p1, win(t, 3.6, 7.0));
      setOpacity(p2, win(t, 7.0, 10.4));
      setOpacity(p3, win(t, 10.4, 13.4));
      setOpacity(p4, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 特权教师：913 维 ── */
  function buildSceneTeacher() {
    var s = sceneSvg('左边：H1 做同一段出拳，身上 23 个点全部亮起（20 个连杆、两只手、头），这是特权教师看得见的；右边两根条：' +
      '本体感受 361 维和目标 552 维逐段长出来，最后是教师策略与仿真里的成功率 94.77%');
    s.appendChild(svgText(30, 28, '教师：23 个刚体的状态全给（仿真里才有）', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 300, 350, C_BORDER, C_SURFACE2);
    var GY = 376, cam = camFor(SHEETS.stable, 150, 170, GY, 0, 0);
    groundLine(left, 46, 314, GY);
    var h1 = h1Mesh(left, SHEETS.stable);
    var all = dotLayer(left, 23, 3.6, C_H1);
    var p0 = group(s), R = 352;
    label(p0, R, 70, '为什么不直接训学生？', 'demo-x-ink', 14);
    chip(p0, R, 88, 420, '真机拿不到每个连杆的全局速度、角速度', C_BAD, { size: 12, left: true });
    chip(p0, R, 126, 420, 'VR 只给 3 个点：输入稀疏，强化学习很难优化', C_BAD, { size: 12, left: true });
    label(p0, R, 190, '先在仿真里，拿满特权信息训一个老师', 'demo-x-ink2', 12.5);
    var BX = R + 80, BW = 330, SCL = BW / 552;
    function stack(parent, y, parts, colors, total) {
      var g = group(parent), x = BX, segs = [];
      label(g, BX - 10, y + 15, '', 'demo-x-ink', 12, 'end');
      parts.forEach(function (p, i) {
        var w = p[1] * SCL, r = paint(svgEl('rect', { x: x.toFixed(1), y: y, width: Math.max(0, w - 1.5).toFixed(1), height: 22, rx: 2 }), colors[i % colors.length]);
        g.appendChild(r);
        var lb = label(g, x + w / 2, y + 40 + (i % 2) * 17, p[0] + ' ' + p[1], 'demo-x-ink2', 10, 'middle');
        segs.push([r, lb]);
        x += w;
      });
      tone(g, x + 6, y + 16, String(total), C_INK, 13);
      return { g: g, segs: segs };
    }
    var p1 = group(s);
    label(p1, R, 70, '23 个刚体：20 个连杆 + 两只手 + 头', 'demo-x-ink', 14);
    label(p1, R, 96, '每个刚体都给位置、旋转、速度、角速度', 'demo-x-ink2', 12.5);
    label(p1, R, 118, '目标还给下一帧参考，和自己差多少', 'demo-x-ink2', 12.5);
    var bars = group(s);
    label(bars, R, 168, '本体感受', 'demo-x-ink', 12.5);
    var sp = stack(bars, 156, TEACH_P, [C_H1, C_WARN, C_ACCENT, C_GOOD, C_MUTED], 361);
    label(bars, R, 248, '目标', 'demo-x-ink', 12.5);
    var sg = stack(bars, 236, TEACH_G, [C_BAD, C_WARN, C_ACCENT, C_GOOD, C_H1, C_MUTED], 552);
    var p4 = group(s);
    rectBox(p4, R, 316, 420, 70, C_GOOD, C_SURFACE2);
    p4.appendChild(svgRich(R + 14, 342, '$\\pi_{\\text{privileged}}$：913 维 → 19 个关节目标，PPO 训', { size: 12.5, cls: 'demo-x-ink' }));
    label(p4, R + 14, 368, '奖励、域随机化都上；仿真里成功率 94.77%', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock), k = loopFrame(now, 0), f = frame(k);
      h1.put([0, 0], cam, k);
      all.put(f.st, cam);
      setOpacity(all.g, seg(t, 3.9, 4.3));
      setOpacity(p0, win(t, 0.3, 3.6));
      setOpacity(p1, seg(t, 3.9, 4.3));
      setOpacity(bars, seg(t, 7.3, 7.7));
      sp.segs.forEach(function (sg2, i) { setOpacity(sg2[0], seg(t, 7.3 + 0.3 * i, 7.6 + 0.3 * i)); setOpacity(sg2[1], seg(t, 7.3 + 0.3 * i, 7.6 + 0.3 * i)); });
      setOpacity(sg.g, seg(t, 10.7, 11.0));
      sg.segs.forEach(function (sg2, i) { setOpacity(sg2[0], seg(t, 10.7 + 0.3 * i, 11.0 + 0.3 * i)); setOpacity(sg2[1], seg(t, 10.7 + 0.3 * i, 11.0 + 0.3 * i)); });
      setOpacity(p4, seg(t, 13.7, 14.1));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 7: 学生只看头和双手 ── */
  function buildSceneStudent() {
    var s = sceneSvg('左边：H1 落后参考 0.2 秒，绿圈是参考里的头和双手，橙点是机器人自己的，红箭头是位置差；从第二段起停在第 2.40 秒。' +
      '右边是这一帧的 27 维目标：三个点 × 位置差、参考位置、参考速度；后面标出头和手在代码里是怎么来的，以及头的目标离得太远时被拉回 1 m');
    s.appendChild(svgText(30, 28, '学生：只看头和双手 3 个点（机器人落后参考 0.2 s，示意）', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 300, 350, C_BORDER, C_SURFACE2);
    var GY = 376, cam = camFor(SHEETS.stable, 150, 160, GY, 0, 0);
    groundLine(left, 46, 314, GY);
    var h1 = h1Mesh(left, SHEETS.stable);
    var arrows = VR3.map(function () { return arrow(left, C_BAD, 2.4); });
    var refR = VR3.map(function () { return ring(left, 0, 0, 7, 7, C_VR); });
    var own = dotLayer(left, 3, 4.2, C_H1);
    var build = group(left);
    var lnHead = hline(build, 0, 0, 0, 0, C_VR, 1.8, '4 3'), lnHand = hline(build, 0, 0, 0, 0, C_VR, 1.8, '4 3');
    var tHead = tone(build, 0, 0, '骨盆 + 0.75 m', C_VR, 10.5), tHand = tone(build, 0, 0, '肘 + 0.3 m', C_VR, 10.5);
    var tStamp = label(left, 46, 66, '', 'demo-x-mut', 11);
    var R = 350;
    var tab = group(s);
    label(tab, R, 64, '第 2.40 s 的 27 维目标（m、m/s，机器人朝向坐标系）', 'demo-x-ink', 12.5);
    var cols = [R + 52, R + 172, R + 302];
    ['位置差', '参考位置', '参考速度'].forEach(function (h, i) { label(tab, cols[i] + 54, 90, h, 'demo-x-ink2', 11.5, 'middle'); });
    VR3_ZH.forEach(function (n, r) {
      var y = 118 + r * 30;
      tone(tab, R, y, n, C_VR, 12);
      [EX.diff[r], EX.ref[r], EX.vel[r]].forEach(function (v, i) { label(tab, cols[i] + 54, y, vec(v), i === 0 ? 'demo-x-ink' : 'demo-x-ink2', 10.5, 'middle'); });
      hline(tab, R, y + 10, R + 430, y + 10, C_BORDER, 1);
    });
    tab.appendChild(svgMath(R + 215, 226, '3 \\times 3 \\times 3 = 27', { size: 15, anchor: 'middle', w: 300 }));
    var p2 = group(s);
    chip(p2, R, 250, 430, '头和手 H1 身上都没有：代码在骨盆、肘上各延长一段', C_VR, { size: 11.5, left: true });
    label(p2, R, 304, '左手要往左再移 0.37 m（位置差的第 2 个数）', 'demo-x-ink2', 12);
    var p3 = group(s);
    chip(p3, R, 250, 430, 'RGB、语言等接口也只给这 3 个点，和 VR 保持一致', C_ACCENT, { size: 11.5, left: true });
    label(p3, R, 304, '想消歧义，可以再多给几个点（表 1(c)）', 'demo-x-ink2', 12);
    var p4 = group(s);
    var ox = R + 330, oy = 318;
    ring(p4, ox, oy, 52, 22, C_GOOD);
    dotAt(p4, ox, oy, 5, C_H1);
    var far = dotAt(p4, ox + 96, oy - 10, 4.5, C_BAD), pull = arrow(p4, C_GOOD, 2);
    label(p4, R, 262, '头的目标离机器人超过 1 m（水平方向）', 'demo-x-ink2', 12);
    label(p4, R, 284, '代码把它拉回 1 m 以内：clip_motion_goal', 'demo-x-ink2', 12);
    label(p4, ox, oy + 40, '半径 1 m', 'demo-x-mut', 10, 'middle');
    function draw(t, clock) {
      var now = nowOf(t, clock), frozen = t >= 3.6;
      var k = frozen ? EX_K : clamp(loopFrame(now, 0), EX_LAG, CLIP.n - 1), g = k - EX_LAG;
      var f = frame(k), fo = frame(g);
      h1.put([0, 0], cam, g);
      var qo = own.put(fo.st, cam, VR3), qr = VR3.map(function (j) { return project(f.st[j], cam); });
      qr.forEach(function (q, i) { refR[i].setAttribute('cx', q[0].toFixed(1)); refR[i].setAttribute('cy', q[1].toFixed(1)); arrows[i].set(qo[i][0], qo[i][1], q[0], q[1], Math.hypot(q[0] - qo[i][0], q[1] - qo[i][1]) > 8 ? 8 : 0.01); });
      tStamp.textContent = frozen ? '停在第 2.40 s（参考）' : '参考第 ' + f2(CLIP.t0 + k / CLIP.fps) + ' s';
      var pel = project(fo.st[PT.pelvis], cam), hd = project(fo.st[PT.head], cam), el2 = project(fo.st[PT.lel], cam), hn = project(fo.st[PT.lh], cam);
      setLine(lnHead, pel[0], pel[1], hd[0], hd[1]); setLine(lnHand, el2[0], el2[1], hn[0], hn[1]);
      tHead.setAttribute('x', (hd[0] - 92).toFixed(1)); tHead.setAttribute('y', (hd[1] + 30).toFixed(1));
      tHand.setAttribute('x', (hn[0] + 14).toFixed(1)); tHand.setAttribute('y', (hn[1] + 28).toFixed(1));
      setOpacity(build, win(t, 7.0, 10.4));
      setOpacity(tab, seg(t, 3.9, 4.3));
      setOpacity(p2, win(t, 7.0, 10.4));
      setOpacity(p3, win(t, 10.4, 13.4));
      var u = ease(seg(t, 14.2, 15.2));
      moveDot(far, [ox + 96 - 46 * u, oy - 10 + 4 * u]);
      pull.set(ox + 92, oy - 10, ox + 54, oy - 6, u > 0.02 ? 7 : 0.01);
      setOpacity(p4, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 25 步历史代替线速度 ── */
  function buildSceneHistory() {
    var s = sceneSvg('一条 26 格的纸带：最左一格是现在这一步的 63 维本体感受（关节位置、关节速度、根角速度、投影重力、上一步动作），后面 25 格是过去的，' +
      '每过一步整条往右挪一格；下面写着 90 + 25 × 63 = 1665；随后划掉根部线速度、换上户外的图和腰上的 ZED 相机');
    var TX = 60, TY = 70, CW = 22, CH = 126, SCL = CH / PROP_DIM, NC = 26;
    var tape = group(s);
    label(tape, TX, TY - 14, '每一步 63 维：', 'demo-x-ink2', 12);
    var colors = [C_H1, C_ACCENT, C_GOOD, C_WARN, C_MUTED];
    PROP_STU.forEach(function (p, i) { tone(tape, TX + 92 + i * 92, TY - 14, p[0] + ' ' + p[1], colors[i], 11); });
    var colsG = [], colsBox = group(tape);
    for (var c = 0; c < NC + 1; c++) {
      var g = group(colsBox), y = TY;
      PROP_STU.forEach(function (p, i) {
        var h = p[1] * SCL;
        g.appendChild(paint(svgEl('rect', { x: 0, y: y.toFixed(1), width: CW - 3, height: Math.max(1, h - 1).toFixed(1), rx: 1.5 }), colors[i]));
        y += h;
      });
      colsG.push(g);
    }
    var nowBox = rectBox(tape, TX - 3, TY - 3, CW + 3, CH + 6, C_INK, 'none');
    nowBox.style.fill = 'none'; nowBox.setAttribute('stroke-width', 2);
    label(tape, TX + CW / 2, TY + CH + 22, '现在', 'demo-x-ink', 11, 'middle');
    label(tape, TX + (NC - 0.5) * CW, TY + CH + 22, '25 步前', 'demo-x-mut', 11, 'middle');
    var hist = rectBox(tape, TX + CW - 1, TY - 6, (NC - 1) * CW + 2, CH + 12, C_ACCENT, 'none', '5 4');
    hist.style.fill = 'none';
    label(tape, TX + CW + (NC - 1) * CW / 2, TY + CH + 34, '历史 25 步（0.5 s）', 'demo-x-ink2', 11.5, 'middle');
    var clipPath = svgEl('clipPath', { id: 'omnih2o-tape-clip' });
    clipPath.appendChild(svgEl('rect', { x: TX - 6, y: TY - 10, width: NC * CW + 8, height: CH + 20 }));
    s.appendChild(clipPath);
    colsBox.setAttribute('clip-path', 'url(#omnih2o-tape-clip)');
    var form = group(s);
    form.appendChild(svgMath(400, 266, '90 + 25 \\times 63 = 1665', { size: 20, anchor: 'middle', w: 420 }));
    label(form, 400, 296, '单步 90 维 = 63 维本体感受 + 27 维目标；图 3 写作 26 步 × 63 = 1638，再加 27', 'demo-x-mut', 11, 'middle');
    var p2 = group(s);
    chip(p2, 150, 322, 230, '根部线速度 3 维', C_BAD, { size: 12.5, strike: true });
    label(p2, 400, 342, 'H2O 靠动捕拿；OmniH2O 不放，让策略从历史里自己推', 'demo-x-ink2', 12);
    var p3 = group(s);
    var f5 = figPart(p3, 'fig5_robust.webp', 1190, 234, 0.48, 0.07, 1.0, 1.0, 150, 314, 232);
    label(p3, 400, 336, '测试时不再需要动捕：', 'demo-x-ink', 12.5);
    label(p3, 400, 358, '可以走出实验室（论文图 5b）', 'demo-x-ink2', 12);
    void f5;
    var p4 = group(s);
    figPart(p4, 'fig8_vio.webp', 1292, 300, 0.772, 0.04, 0.985, 0.78, 150, 312, 120);
    label(p4, 290, 332, '但 VR 的目标要换到机器人坐标系：', 'demo-x-ink', 12.5);
    label(p4, 290, 354, '腰上的 ZED 做视觉惯性里程计（60 Hz）', 'demo-x-ink2', 12);
    label(p4, 290, 376, '只用来换坐标，不进策略（论文图 8d）', 'demo-x-mut', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock), step = now / 0.5, base = Math.floor(step), frac = ease(step - base);
      colsG.forEach(function (g, i) {
        var x = TX + (i - 1 + frac) * CW;
        g.setAttribute('transform', 'translate(' + x.toFixed(1) + ',0)');
        g.style.opacity = i === 0 ? frac : 1;
      });
      setOpacity(hist, seg(t, 3.9, 4.3));
      setOpacity(form, seg(t, 3.9, 4.3));
      setOpacity(p2, win(t, 7.0, 10.4));
      setOpacity(p3, win(t, 10.4, 13.4));
      setOpacity(p4, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: DAgger：学生开车，老师批改 ── */
  function buildSceneDagger() {
    var s = sceneSvg('流程图：学生在仿真里自己开，仿真状态加参考动作算出特权观测，冻结的教师给出它会怎么做，两者的动作之差就是损失；' +
      '小圆点沿着箭头跑一圈。右边先比较直接用强化学习训学生（47.11%）和用 DAgger（94.10%），再列官方代码的设置');
    var N = {
      stu: [36, 70, 196, 64], sim: [316, 70, 196, 64], priv: [316, 186, 196, 56], tea: [316, 296, 196, 64], loss: [36, 296, 196, 64]
    };
    var nodes = group(s);
    function node(key, color, l1, l2, isRich) {
      var r = N[key], g = group(nodes);
      rectBox(g, r[0], r[1], r[2], r[3], color, C_SURFACE2);
      if (isRich) g.appendChild(svgRich(r[0] + r[2] / 2, r[1] + 26, l1, { size: 12.5, anchor: 'middle', w: r[2] - 10, cls: 'demo-x-ink' }));
      else label(g, r[0] + r[2] / 2, r[1] + 26, l1, 'demo-x-ink', 12.5, 'middle');
      if (l2) g.appendChild(svgRich(r[0] + r[2] / 2, r[1] + 48, l2, { size: 10.5, anchor: 'middle', w: r[2] - 10, cls: 'demo-x-ink2' }));
      return g;
    }
    var nStu = node('stu', C_GOOD, '学生 $\\pi_{\\text{OmniH2O}}$', '1665 维：本体感受历史 + 3 个点', true);
    var nSim = node('sim', C_MUTED, '仿真（Isaac Gym）', '4096 个环境，学生自己开');
    var nPriv = node('priv', C_WARN, '算出特权观测', '参考动作 + 仿真状态 → 913 维');
    var nTea = node('tea', C_BAD, '教师 $\\pi_{\\text{privileged}}$', '冻结，只负责回答', true);
    var nLoss = node('loss', C_ACCENT, '损失', '$\\lVert \\mathbf{a}^{\\text{privileged}}_t - \\mathbf{a}_t \\rVert_2^2$', true);
    function mid(r, side) {
      return side === 'r' ? [r[0] + r[2], r[1] + r[3] / 2] : side === 'l' ? [r[0], r[1] + r[3] / 2] : side === 't' ? [r[0] + r[2] / 2, r[1]] : [r[0] + r[2] / 2, r[1] + r[3]];
    }
    var E = [
      { pts: [mid(N.stu, 'r'), mid(N.sim, 'l')], c: C_GOOD, lab: '动作 $\\mathbf{a}_t$', at: 0.6, dy: -10 },
      { pts: [mid(N.sim, 'b'), mid(N.priv, 't')], c: C_WARN, lab: '', at: 3.9 },
      { pts: [mid(N.priv, 'b'), mid(N.tea, 't')], c: C_WARN, lab: '', at: 4.4 },
      { pts: [mid(N.tea, 'l'), mid(N.loss, 'r')], c: C_BAD, lab: '$\\mathbf{a}^{\\text{privileged}}_t$', at: 7.3, dy: -10 },
      { pts: [mid(N.stu, 'b'), mid(N.loss, 't')], c: C_GOOD, lab: '', at: 7.3 }
    ];
    var edges = group(s);
    var eg = E.map(function (e) {
      var g = group(edges), a = arrow(g, e.c, 2.2);
      a.set(e.pts[0][0], e.pts[0][1], e.pts[1][0], e.pts[1][1], 8);
      if (e.lab) g.appendChild(svgRich((e.pts[0][0] + e.pts[1][0]) / 2, (e.pts[0][1] + e.pts[1][1]) / 2 + (e.dy || 0), e.lab, { size: 11, anchor: 'middle', w: 120, cls: 'demo-x-ink2' }));
      var tok = dotAt(g, 0, 0, 4.5, e.c);
      return { g: g, tok: tok, e: e };
    });
    var back = group(s);
    var bp = [[N.sim[0] + 40, N.sim[1]], [N.sim[0] + 40, N.sim[1] - 22], [N.stu[0] + 150, N.stu[1] - 22], [N.stu[0] + 150, N.stu[1]]];
    pathLine(back, bp, C_MUTED, 1.8, '5 4');
    label(back, (bp[1][0] + bp[2][0]) / 2, N.sim[1] - 28, '状态：本体感受 + 3 个点的目标', 'demo-x-mut', 10.5, 'middle');
    var upd = group(s);
    var up = [[N.loss[0] + 30, N.loss[1]], [N.loss[0] + 30, N.stu[1] + N.stu[3] + 22], [N.stu[0] + 30, N.stu[1] + N.stu[3] + 22], [N.stu[0] + 30, N.stu[1] + N.stu[3]]];
    pathLine(upd, up.slice(0, 2), C_ACCENT, 1.8, '5 4');
    label(upd, N.loss[0] + 36, N.loss[1] - 50, '更新学生', 'demo-x-ink2', 10.5);
    var RX = 540;
    var p3 = group(s);
    label(p3, RX, 80, '为什么不直接用强化学习？', 'demo-x-ink', 13);
    var bRL = barRowAt(p3, RX, 100, 76, 120, '直接 RL', C_BAD, 18), bDA = barRowAt(p3, RX, 130, 76, 120, 'DAgger', C_GOOD, 18);
    label(p3, RX, 176, '同样 1665 维的输入（表 1(a)）', 'demo-x-mut', 11);
    label(p3, RX, 198, '历史一长，RL 学不出连贯的策略', 'demo-x-ink2', 11.5);
    var p4 = group(s);
    label(p4, RX, 80, '官方代码的设置', 'demo-x-ink', 13);
    chip(p4, RX, 96, 246, '只用模仿损失：dagger_only', C_ACCENT, { size: 11, left: true });
    chip(p4, RX, 132, 246, '初始动作噪声 0.001（RL 是 1.0）', C_ACCENT, { size: 11, left: true });
    chip(p4, RX, 168, 246, '蒸馏时不加观测噪声', C_ACCENT, { size: 11, left: true });
    chip(p4, RX, 204, 246, '损失是不带平方的 L2 范数取平均', C_WARN, { size: 11, left: true });
    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(nStu, seg(t, 0.4, 0.8)); setOpacity(nSim, seg(t, 0.4, 0.8)); setOpacity(back, seg(t, 0.8, 1.2));
      setOpacity(nPriv, seg(t, 3.9, 4.3)); setOpacity(nTea, seg(t, 4.3, 4.7));
      setOpacity(nLoss, seg(t, 7.3, 7.7)); setOpacity(upd, seg(t, 8.0, 8.4));
      eg.forEach(function (x, i) {
        setOpacity(x.g, seg(t, x.e.at, x.e.at + 0.4));
        var u = ((now * 0.6) + i * 0.2) % 1;
        moveDot(x.tok, pointOn(x.e.pts, u));
      });
      var g = seg(t, 10.7, 11.5);
      bRL.set(120 * t1('woD').all[0] / 100 * g, f2(t1('woD').all[0] * g) + '%');
      bDA.set(120 * t1('omni').all[0] / 100 * g, f2(t1('omni').all[0] * g) + '%');
      setOpacity(p3, win(t, 10.4, 13.4));
      setOpacity(p4, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: 灵巧手与机载系统（附录 A、官方 README 的硬件图） ── */
  function buildSceneSystem() {
    var s = sceneSvg('左边：项目页视频里 H1 用灵巧手遥操作写「H2O」（4 倍速）；右边是机载系统的方框图：Vision Pro 经 Wi-Fi 把目标发给第一台 Orin NX，' +
      '它同时接腰上的 ZED 相机做里程计；第二台 Orin NX 跑策略和底层控制；手和手腕不经过策略，由逆运动学直接算；最后换成官方仓库 README 的硬件图');
    var left = group(s);
    var fw = projClip(left, 'brush', 24, 54, 232, 130.5, '项目页视频：遥操作写「H2O」（4 倍速）');
    var parts = group(left);
    chip(parts, 24, 54 + fw.h + 34, 232, 'Unitree H1：19 个电机', C_MUTED, { size: 11.5, left: true });
    chip(parts, 24, 54 + fw.h + 68, 232, 'Inspire 灵巧手', C_ACCENT, { size: 11.5, left: true });
    chip(parts, 24, 54 + fw.h + 102, 232, '达妙 DM-J4310-2EC 腕部电机', C_ACCENT, { size: 11.5, left: true });
    var B = {
      vp: [280, 50, 144, 52], nx1: [460, 50, 150, 52], zed: [640, 50, 140, 52],
      nx2: [460, 168, 150, 62], h1: [640, 168, 140, 62], ik: [280, 268, 150, 52], hand: [640, 268, 140, 52]
    };
    var dia = group(s);
    function box(key, color, l1, l2) {
      var r = B[key], g = group(dia);
      rectBox(g, r[0], r[1], r[2], r[3], color, C_SURFACE2);
      label(g, r[0] + r[2] / 2, r[1] + 21, l1, 'demo-x-ink', 12, 'middle');
      if (l2) label(g, r[0] + r[2] / 2, r[1] + 42, l2, 'demo-x-ink2', 10.5, 'middle');
      return g;
    }
    var gVp = box('vp', C_GOOD, 'Vision Pro', '头、双手、手部姿态');
    var gNx1 = box('nx1', C_MUTED, 'Orin NX #1', '收目标 · 里程计');
    var gZed = box('zed', C_MUTED, 'ZED 相机（腰）', '视觉惯性里程计 60 Hz');
    var gNx2 = box('nx2', C_WARN, 'Orin NX #2', '策略 50 Hz · H1 底层');
    var gH1 = box('h1', C_MUTED, 'Unitree H1', '19 个关节目标');
    var gIk = box('ik', C_ACCENT, '逆运动学', '手部姿态 → 关节');
    var gHand = box('hand', C_ACCENT, '灵巧手 + 手腕', '直接映射，不推理');
    function edge(p, q, color, lab, dash) {
      var g = group(dia), a = arrow(g, color, 2);
      a.set(p[0], p[1], q[0], q[1], 7);
      if (dash) g.querySelector('line').setAttribute('stroke-dasharray', dash);
      if (lab) label(g, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - 6, lab, 'demo-x-mut', 10, 'middle');
      return g;
    }
    var eWifi = edge([424, 76], [458, 76], C_GOOD, 'Wi-Fi');
    var eZed = edge([640, 76], [612, 76], C_MUTED, '');
    var eRos = edge([535, 102], [535, 166], C_MUTED, '');
    var tRos = label(dia, 542, 138, '网线 · ROS', 'demo-x-mut', 10);
    var eH1 = edge([610, 199], [638, 199], C_WARN, '');
    var eIk = edge([355, 102], [355, 266], C_ACCENT, '');
    var eHand = edge([430, 294], [638, 294], C_ACCENT, '经 Orin NX #2 下发', '5 4');
    var lat = group(s);
    chip(lat, 280, 346, 500, '整套延迟约 20 ms；也可以换成一台 i9 + RTX 4090 的笔记本，效果相近', C_GOOD, { size: 11.5, left: true });
    var hw = group(s);
    rectBox(hw, 270, 40, 520, 352, C_BORDER, C_SURFACE);
    var fh = figPart(hw, 'hw_readme.webp', 1364, 580, 0, 0, 1, 1, 284, 60, 492, '官方仓库 README 的硬件图（CC BY-NC 4.0）');
    label(hw, 290, 60 + fh.h + 44, '头上的 RealSense 录第一人称 RGB，后面拿来做数据集', 'demo-x-ink', 12);
    label(hw, 290, 60 + fh.h + 66, '腰上的 ZED Mini 做视觉惯性里程计', 'demo-x-ink2', 11.5);
    function draw(t) {
      fw.at(K.clipSince(t, 0), true);
      setOpacity(parts, seg(t, 0.6, 1.0));
      setOpacity(gH1, seg(t, 0.6, 1.0)); setOpacity(gHand, seg(t, 0.8, 1.2));
      setOpacity(gVp, seg(t, 3.9, 4.3)); setOpacity(gIk, seg(t, 4.3, 4.7)); setOpacity(eIk, seg(t, 4.3, 4.7)); setOpacity(eHand, seg(t, 4.7, 5.1));
      setOpacity(gNx1, seg(t, 7.3, 7.7)); setOpacity(gZed, seg(t, 7.3, 7.7)); setOpacity(eWifi, seg(t, 7.5, 7.9)); setOpacity(eZed, seg(t, 7.5, 7.9));
      setOpacity(gNx2, seg(t, 8.2, 8.6)); setOpacity(eRos, seg(t, 8.2, 8.6)); setOpacity(tRos, seg(t, 8.2, 8.6)); setOpacity(eH1, seg(t, 8.6, 9.0));
      setOpacity(lat, win(t, 10.4, 13.4));
      setOpacity(dia, 1 - seg(t, 13.4, 13.7));
      setOpacity(hw, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 一张横向条形图：rows = [[标签, 数值, 颜色]]，返回 set(进度) */
  function barChart(parent, x, y, labelW, maxW, rowH, rows, vmax, fmtV, vmin) {
    var g = group(parent), lo = vmin || 0;
    var items = rows.map(function (r, i) {
      var b = barRowAt(g, x, y + i * rowH, labelW, maxW, r[0], r[2], Math.min(18, rowH - 8));
      return { b: b, v: r[1] };
    });
    return {
      g: g,
      set: function (u) {
        items.forEach(function (it) {
          if (it.v == null) { it.b.set(0, '摔倒，测不完'); return; }
          it.b.set(maxW * clamp((it.v - lo) / (vmax - lo), 0, 1) * u, fmtV(it.v * (u < 1 ? u : 1)));
        });
      }
    };
  }
  function pct(v) { return f2(v) + '%'; }
  function mm(v) { return f2(v) + ' mm'; }

  /* ── scene 11: 表 1：学生追上老师（主结果 + DAgger 消融） ── */
  function buildSceneTable1() {
    var s = sceneSvg('表 1 的成功率：上面三行是特权教师、H2O 和 OmniH2O，学生只比教师低 0.67 个点、比 H2O 高 6.58 个点；' +
      '下面四行是 DAgger 的消融：不用 DAgger、直接用强化学习训 1665 维的学生只有 47.11%');
    var top = group(s);
    chip(top, 70, 14, 660, '表 1：仿真里，在加了站姿 / 蹲姿版的 AMASS 重定向数据（约 1.4 万段）上评测', C_BORDER, { size: 12, h: 28 });
    label(top, 400, 62, '成功 = 整段里与参考的平均偏差始终不超过 0.5 m（沿用 PHC 的定义）', 'demo-x-ink2', 12, 'middle');
    var LW = 196, MW = 300;
    var main = group(s);
    label(main, 60, 96, '主结果', 'demo-x-ink', 13);
    var cMain = barChart(main, 60, 108, LW, MW, 30, [
      ['特权教师（913 维）', t1('priv').all[0], C_MUTED], ['H2O（138 维）', t1('h2o').all[0], C_ACCENT], ['OmniH2O（1665 维）', t1('omni').all[0], C_GOOD]
    ], 100, pct);
    var nGap = group(s);
    tone(nGap, 612, 128, '学生只比教师低 0.67 个点', C_GOOD, 12);
    tone(nGap, 612, 152, '比 H2O 高 6.58 个点', C_GOOD, 12);
    label(nGap, 612, 174, '全局误差 148.13 → 141.11 mm', 'demo-x-mut', 10.5);
    var abl = group(s);
    label(abl, 60, 226, '(a) DAgger 还是强化学习', 'demo-x-ink', 13);
    var cAbl = barChart(abl, 60, 238, LW, MW, 30, [
      ['RL、无历史（90 维）', t1('woDH0').all[0], C_WARN], ['RL、25 步历史（1665 维）', t1('woD').all[0], C_BAD],
      ['DAgger、无历史（90 维）', t1('h0').all[0], C_ACCENT], ['DAgger、25 步历史（1665 维）', t1('omni').all[0], C_GOOD]
    ], 100, pct);
    var why = group(s);
    rectBox(why, 600, 228, 190, 100, C_BAD, C_SURFACE2);
    label(why, 612, 252, '历史一长，输入维度暴涨，', 'demo-x-ink2', 11);
    label(why, 612, 272, 'RL 学不出连贯的策略；', 'demo-x-ink2', 11);
    label(why, 612, 292, '监督学习用得好历史', 'demo-x-ink2', 11);
    label(why, 612, 314, '（论文的解释）', 'demo-x-mut', 10.5);
    var same = group(s);
    rectBox(same, 600, 228, 190, 100, C_ACCENT, C_SURFACE2);
    label(same, 612, 252, '用 DAgger 时，有没有历史', 'demo-x-ink2', 11);
    label(same, 612, 272, '仿真里差不多：93.80 对 94.10', 'demo-x-ink2', 11);
    label(same, 612, 296, '历史的用处要到真机上', 'demo-x-ink', 11);
    label(same, 612, 316, '才看得出（表 2）', 'demo-x-ink', 11);
    function draw(t) {
      setOpacity(top, seg(t, 0.4, 0.8));
      setOpacity(main, seg(t, 3.9, 4.3)); cMain.set(ease(seg(t, 3.9, 5.0)));
      setOpacity(nGap, seg(t, 5.0, 5.4));
      setOpacity(abl, seg(t, 7.3, 7.7)); cAbl.set(ease(seg(t, 7.3, 8.4)));
      setOpacity(why, win(t, 10.4, 13.4));
      setOpacity(same, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 表 1：仿真里差别都不大（历史、结构、跟踪点、线速度） ── */
  function buildSceneTable1b() {
    var s = sceneSvg('表 1 的三组消融，横轴从 90% 起放大：历史 0 / 5 / 25 / 50 步和 GRU、LSTM；跟踪点 22 / 8 / 3 个；加不加线速度。' +
      '成功率都在 91% 到 95% 之间，22 个点的全局误差比 3 个点小 13.4 mm');
    var LW = 200, MW = 330, LO = 90, HI = 95.5;
    var axis = group(s);
    function zoomAxis(parent, x, y, h) {
      var g = group(parent);
      [90, 92, 94].forEach(function (v) {
        var xx = x + LW + MW * (v - LO) / (HI - LO);
        hline(g, xx, y, xx, y + h, C_BORDER, 1, '3 4');
        label(g, xx, y + h + 14, v + '%', 'demo-x-mut', 10, 'middle');
      });
      label(g, x + LW, y - 8, '横轴从 90% 起（放大看差别）', 'demo-x-mut', 10.5);
      return g;
    }
    var b = group(s);
    label(b, 50, 46, '(b) 历史多长？用什么网络？', 'demo-x-ink', 13.5);
    zoomAxis(b, 50, 70, 182);
    var cH = barChart(b, 50, 74, LW, MW, 30, [
      ['0 步（90 维）', t1('h0').all[0], C_MUTED], ['5 步（405 维）', t1('h5').all[0], C_MUTED],
      ['25 步（1665 维）', t1('h25').all[0], C_GOOD], ['50 步（3240 维）', t1('h50').all[0], C_MUTED]
    ], HI, pct, LO);
    var cR = barChart(b, 50, 194, LW, MW, 30, [['GRU（90 维）', t1('gru').all[0], C_WARN], ['LSTM（90 维）', t1('lstm').all[0], C_WARN]], HI, pct, LO);
    var c = group(s);
    label(c, 50, 46, '(c) 跟踪几个点？', 'demo-x-ink', 13.5);
    zoomAxis(c, 50, 70, 92);
    var cP = barChart(c, 50, 74, LW, MW, 30, [
      ['22 个点（1836 维）', t1('p22').all[0], C_ACCENT], ['8 个点（1710 维）', t1('p8').all[0], C_ACCENT], ['3 个点（1665 维）', t1('p3').all[0], C_GOOD]
    ], HI, pct, LO);
    var cG = group(s);
    label(cG, 50, 214, '全局关节误差（越小越好，横轴从 0 起）', 'demo-x-ink2', 12);
    var cPg = barChart(cG, 50, 226, LW, MW, 30, [
      ['22 个点', t1('p22').all[1], C_ACCENT], ['8 个点', t1('p8').all[1], C_ACCENT], ['3 个点', t1('p3').all[1], C_GOOD]
    ], 160, mm);
    var d = group(s);
    label(d, 50, 46, '(d) 观测里加不加线速度？', 'demo-x-ink', 13.5);
    zoomAxis(d, 50, 70, 62);
    var cL = barChart(d, 50, 74, LW, MW, 30, [['加线速度（1743 维）', t1('linvel').all[0], C_WARN], ['不加（1665 维）', t1('omni').all[0], C_GOOD]], HI, pct, LO);
    label(d, 50, 186, '全局关节误差：138.18 对 141.11 mm', 'demo-x-ink2', 12);
    label(d, 50, 210, '仿真里线速度是真值，加了也没多大好处；', 'demo-x-ink2', 12);
    label(d, 50, 232, '真机上它得靠估，问题就来了（下一幕）', 'demo-x-ink', 12);
    var side = group(s);
    rectBox(side, 600, 66, 190, 120, C_GOOD, C_SURFACE2);
    label(side, 612, 90, '25 步最好', 'demo-x-ink', 12.5);
    label(side, 612, 112, '0 / 5 / 50 步都差不到', 'demo-x-ink2', 11);
    label(side, 612, 132, '0.6 个点', 'demo-x-ink2', 11);
    label(side, 612, 160, 'MLP 比 GRU、LSTM 好', 'demo-x-ink2', 11);
    var side2 = group(s);
    rectBox(side2, 600, 66, 190, 120, C_ACCENT, C_SURFACE2);
    label(side2, 612, 90, '3 个点只低 0.62 个点', 'demo-x-ink', 12);
    label(side2, 612, 112, '但全局误差多 13.4 mm：', 'demo-x-ink2', 11);
    label(side2, 612, 132, '点少，全身姿态更含糊', 'demo-x-ink2', 11);
    label(side2, 612, 160, '换来的是商用 VR 就能用', 'demo-x-ink2', 11);
    function draw(t) {
      setOpacity(b, win(t, 0.3, 7.0)); cH.set(ease(seg(t, 0.7, 1.8)));
      setOpacity(cR.g, seg(t, 3.9, 4.3)); cR.set(ease(seg(t, 3.9, 4.8)));
      setOpacity(side, win(t, 3.6, 7.0));
      setOpacity(c, win(t, 7.0, 13.4)); cP.set(ease(seg(t, 7.4, 8.4)));
      setOpacity(cG, win(t, 10.4, 13.4)); cPg.set(ease(seg(t, 10.8, 11.8)));
      setOpacity(side2, win(t, 10.4, 13.4));
      setOpacity(d, win(t, 13.4)); cL.set(ease(seg(t, 13.8, 14.6)));
      void axis;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 13: 表 2：真机才看得出 ── */
  function buildSceneTable2() {
    var s = sceneSvg('表 2 的真机结果（20 段站立动作，全局关节误差）：H2O 87.33 mm 对 OmniH2O 47.94 mm；论文图 8 里 ZED 视觉惯性里程计估的线速度噪声很大，' +
      '用它当输入的策略摔倒了；神经网络估的速度也不如不给；历史 0 步 83.26 mm、25 步 47.94 mm；LSTM 87.00 mm');
    var LW = 190, MW = 360;
    var a = group(s);
    chip(a, 70, 14, 660, '表 2：真机上 20 段站立动作（实验室空间有限）；数字是全局关节误差，越小越好', C_BORDER, { size: 12, h: 28 });
    var cMain = barChart(a, 60, 76, LW, MW, 34, [['H2O（138 维）', t2('h2o').v[0], C_ACCENT], ['OmniH2O（1665 维）', t2('omni').v[0], C_GOOD]], 100, mm);
    var tb = group(s);
    var heads = ['', '全局', '局部', '加速度', '速度'];
    heads.forEach(function (h, i) { label(tb, 120 + i * 120, 180, h, 'demo-x-ink2', 11.5, i ? 'middle' : 'start'); });
    [['H2O', t2('h2o').v], ['OmniH2O', t2('omni').v]].forEach(function (r, j) {
      var y = 206 + j * 26;
      label(tb, 120, y, r[0], 'demo-x-ink', 11.5);
      r[1].forEach(function (v, i) { label(tb, 240 + i * 120, y, f2(v), j ? 'demo-x-ink' : 'demo-x-ink2', 11.5, 'middle'); });
    });
    label(tb, 120, 264, '单位：mm、mm/帧²、mm/帧；全局误差降了 45%', 'demo-x-mut', 10.5);
    var v = group(s);
    figPart(v, 'fig8_vio.webp', 1292, 300, 0, 0, 0.755, 1.0, 40, 60, 500, '论文图 8：灰线是 ZED 视觉惯性里程计估的速度，绿 / 蓝是神经网络估的');
    chip(v, 570, 76, 210, '观测里放 VIO 线速度', C_BAD, { size: 12 });
    label(v, 675, 132, '摔倒了，测不完', 'demo-x-ink', 13, 'middle');
    label(v, 675, 156, '（表 2(a) 的 N/A）', 'demo-x-mut', 10.5, 'middle');
    var e = group(s);
    label(e, 60, 64, '(a) 换成神经网络估速度（仿真里监督训练）', 'demo-x-ink', 13);
    var cE = barChart(e, 60, 80, LW, MW, 34, [['线速度用 VIO', null, C_BAD], ['线速度用 MLP 估', t2('mlp').v[0], C_WARN], ['线速度用 GRU 估', t2('gru').v[0], C_WARN], ['不给线速度（OmniH2O）', t2('omni').v[0], C_GOOD]], 100, mm);
    label(e, 60, 238, '有了 25 步历史，显式的线速度不但不必要，还拖后腿', 'demo-x-ink2', 12);
    var h = group(s);
    label(h, 60, 64, '(b) 历史多长？真机上差一倍', 'demo-x-ink', 13);
    var cH = barChart(h, 60, 80, LW, MW, 32, [['0 步', t2('h0').v[0], C_BAD], ['5 步', t2('h5').v[0], C_WARN], ['25 步（OmniH2O）', t2('omni').v[0], C_GOOD], ['50 步', t2('h50').v[0], C_ACCENT]], 100, mm);
    label(h, 60, 230, '仿真成功率：93.80 / 93.60 / 94.10 / 93.56%，几乎看不出差别', 'demo-x-mut', 11.5);
    var l = group(s);
    label(l, 60, 64, 'LSTM：真机上和 H2O 差不多', 'demo-x-ink', 13);
    var cLs = barChart(l, 60, 80, LW, MW, 34, [['H2O', t2('h2o').v[0], C_ACCENT], ['LSTM（90 维）', t2('lstm').v[0], C_WARN], ['MLP + 25 步历史', t2('omni').v[0], C_GOOD]], 100, mm);
    chip(l, 60, 206, 560, '论文的结论：25 步历史的 MLP 最好；仿真里看不出的差别，真机上看得出', C_GOOD, { size: 12, left: true });
    function draw(t) {
      setOpacity(a, win(t, 0.3, 3.6)); cMain.set(ease(seg(t, 0.7, 1.8)));
      setOpacity(tb, win(t, 0.3, 3.6) * seg(t, 1.8, 2.2));
      setOpacity(v, win(t, 3.6, 7.0));
      setOpacity(e, win(t, 7.0, 10.4)); cE.set(ease(seg(t, 7.4, 8.4)));
      setOpacity(h, win(t, 10.4, 13.4)); cH.set(ease(seg(t, 10.8, 11.8)));
      setOpacity(l, win(t, 13.4)); cLs.set(ease(seg(t, 13.8, 14.6)));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 14: 一个策略，接各种遥控（图 1、4、5、10） ── */
  function buildSceneInterfaces() {
    var s = sceneSvg('依次播项目页的真机视频：VR 遥操作打网球、乒乓球、羽毛球、浇花；蹲下拿篮子、拳击、搬篮子、推车与架子上取放；' +
      'MDM 语言指令（挥左手、T 字、往前走），旁边是论文图 10 的 RGB 遥操作；站着或用手柄走时被拳打脚踢；户外的草地、斜坡、碎石路');
    var VX = 20, VY = 48, VW = 500, VH = 280, RX = 544;
    function side(g, title, lines, y0) {
      label(g, RX, y0 || 70, title, 'demo-x-ink', 13.5);
      lines.forEach(function (l, i) { label(g, RX, (y0 || 70) + 30 + i * 24, l, 'demo-x-ink2', 12); });
    }
    var p0 = group(s);
    var v0 = projClip(p0, 'teleop', VX, VY, VW, VH, '项目页视频（1 倍速）：网球、乒乓球 / 羽毛球、浇花');
    side(p0, 'VR 遥操作：只跟头和双手', ['左上 网球', '右上 乒乓球', '左下 羽毛球', '右下 浇花', '上身要准，手要灵']);
    var p1 = group(s);
    var v1 = projClip(p1, 'wholebody', VX, VY, VW, VH, '项目页视频：上下身一起');
    side(p1, '上下身一起，同一个策略', ['左上 蹲下拿篮子（2 倍速）', '右上 拳击（1 倍速）', '左下 来回搬篮子（4 倍速）', '右下 架子、推车上取放（4 倍速）']);
    var p2 = group(s);
    var v2 = projClip(p2, 'mdm', VX, VY, VW, VH, '项目页视频（1 倍速）：MDM 把一句话变成动作，策略照着做');
    side(p2, '语言 → MDM → 运动目标', ['「挥左手」→「摆 T 字」', '→「往前走」']);
    figPart(p2, 'fig10_vrrgb.webp', 1307, 240, 0.555, 0, 1, 1, RX, 168, 236, '论文图 10(b)：RGB 摄像头也能遥操作');
    var p3 = group(s);
    var v3 = projClip(p3, 'robust', VX, VY, VW, VH, '项目页视频（1 倍速）：抗干扰测试');
    side(p3, '被拳打脚踢也站得稳', ['先是原地站着被踢、被推，', '再是用手柄前后走着被打；', '用的还是同一个跟踪策略']);
    var p4 = group(s);
    var OW = 760, OH = OW * 180 / 960;
    var v4 = projClip(p4, 'outdoor', 20, 60, OW, OH, '');
    ['草地', '斜坡', '碎石路'].forEach(function (n, i) { label(p4, 20 + OW * (2 * i + 1) / 6, 60 + OH + 22, n, 'demo-x-ink', 13, 'middle'); });
    label(p4, 400, 60 + OH + 62, '户外也是同一个策略：不要动捕，历史里自己推速度', 'demo-x-ink2', 12.5, 'middle');
    label(p4, 400, 60 + OH + 84, '项目页视频（1 倍速）', 'demo-x-mut', 9.5, 'middle');
    var V = [[p0, v0, 0.3, 3.6], [p1, v1, 3.6, 7.0], [p2, v2, 7.0, 10.4], [p3, v3, 10.4, 13.4], [p4, v4, 13.4, null]];
    function draw(t) {
      V.forEach(function (r) {
        var a = r[3] == null ? win(t, r[2]) : win(t, r[2], r[3]);
        setOpacity(r[0], a);
        r[1].at(K.clipSince(t, r[2] === 0.3 ? 0 : r[2]), a > 0.02);
      });
    }
    return { el: s, draw: draw };
  }

  /* ── scene 15: GPT-4o 与 OmniH2O-6（图 6、图 11） ── */
  function buildSceneGpt() {
    var s = sceneSvg('项目页视频：头上的摄像头拍一张图给 GPT-4o，它从几个动作原语里选：蓝靶出左拳、红靶出右拳；握手、拥抱、挥手道别；' +
      '也可以让它直接回 6 个数。随后是论文图 11 的 OmniH2O-6 数据集：6 个任务的第一人称画面，以及每个任务录了多少帧');
    var p0 = group(s);
    var g0 = projClip(p0, 'gptbox', 20, 50, 400, 225, '项目页视频：GPT-4o 自主拳击（4 倍速）');
    rectBox(p0, 446, 50, 336, 225, C_WARN, C_SURFACE2);
    label(p0, 460, 74, '给 GPT-4o 的提示（附录 L，节选）', 'demo-x-ink', 12);
    label(p0, 460, 100, '蓝靶出现：伸出左拳再收回', 'demo-x-ink2', 11.5);
    label(p0, 460, 122, '红靶出现：伸出右拳再收回', 'demo-x-ink2', 11.5);
    label(p0, 460, 144, '没有靶：不动', 'demo-x-ink2', 11.5);
    label(p0, 460, 170, '只回答 A、B 或 C', 'demo-x-ink', 11.5);
    label(p0, 460, 196, '注意自己戴着蓝左、红右的拳套，', 'demo-x-mut', 11);
    label(p0, 460, 216, '别把它们当成靶', 'demo-x-mut', 11);
    var p1 = group(s);
    var g1 = projClip(p1, 'gptgreet', 20, 50, 500, 281, '项目页视频（1 倍速）：GPT-4o 自主握手 → 拥抱 → 挥手道别');
    rectBox(p1, 540, 50, 242, 230, C_WARN, C_SURFACE2);
    label(p1, 552, 74, 'GPT-4o 回复慢，所以选原语', 'demo-x-ink', 11.5);
    label(p1, 552, 100, '也可以直接回 6 个数：', 'demo-x-ink2', 11.5);
    label(p1, 552, 122, '左右手相对骨盆的位置', 'demo-x-ink2', 11.5);
    label(p1, 552, 148, '[0.25, 0.2, 0.3,', 'demo-x-ink', 11.5);
    label(p1, 552, 168, ' 0.15, −0.19, 0.27]', 'demo-x-ink', 11.5);
    label(p1, 552, 196, '（图 3 写的是 9 个数，', 'demo-x-mut', 10.5);
    label(p1, 552, 214, '多了头的位置）', 'demo-x-mut', 10.5);
    var p2 = group(s);
    var fd = figPart(p2, 'fig11_dataset.webp', 794, 819, 0, 0, 1, 1, 30, 40, 330, '论文图 11：OmniH2O-6 的第一人称画面');
    label(p2, 392, 70, '先用 VR 遥操作录示范：OmniH2O-6', 'demo-x-ink', 13.5);
    ['头部相机的 RGBD 图像', '头和双手相对根的运动目标', '电机的关节目标', '30 Hz 录制'].forEach(function (n, i) {
      chip(p2, 392, 90 + i * 38, 380, n, C_ACCENT, { size: 12, left: true });
    });
    void fd;
    var p3 = group(s);
    label(p3, 392, 70, '6 个任务，共约 40 分钟', 'demo-x-ink', 13.5);
    var dmax = 18436, bars = DATASET.map(function (r, i) {
      var y = 90 + i * 36, g = group(p3);
      label(g, 492, y + 14, r[0], 'demo-x-ink2', 11.5, 'end');
      var b = hbar(g, 500, y, 18, C_ACCENT);
      var v = label(g, 506, y + 14, '', 'demo-x-ink', 10.5);
      return { b: b, v: v, n: r[2] };
    });
    label(p3, 392, 316, '合计 73,462 帧 ÷ 30 Hz ≈ 40.8 分钟', 'demo-x-ink2', 11.5);
    var p4 = group(s);
    chip(p4, 392, 90, 380, '论文说：首个人形全身移动操作数据集', C_GOOD, { size: 12.5, left: true });
    label(p4, 392, 152, '以前的机器人数据集几乎都是固定底座的机械臂；', 'demo-x-ink2', 11.5);
    label(p4, 392, 174, 'Open X-Embodiment 里也没有人形', 'demo-x-ink2', 11.5);
    label(p4, 392, 210, '数据集链接在项目主页（cmu.box.com）', 'demo-x-mut', 11);
    function draw(t) {
      var a0 = win(t, 0.3, 3.6), a1 = win(t, 3.6, 7.0);
      setOpacity(p0, a0); g0.at(K.clipSince(t, 0), a0 > 0.02);
      setOpacity(p1, a1); g1.at(K.clipSince(t, 3.6), a1 > 0.02);
      setOpacity(p2, win(t, 7.0));
      p2.childNodes.forEach(function (n, i) { if (i > 0) setOpacity(n, 1 - seg(t, 10.4, 10.7)); });
      var u = ease(seg(t, 10.8, 11.8));
      bars.forEach(function (b) { setW(b.b, 150 * b.n / dmax * u); b.v.setAttribute('x', (506 + 150 * b.n / dmax * u).toFixed(1)); b.v.textContent = Math.round(b.n * u) + ' 帧 ≈ ' + f1(b.n * u / DATA_FPS / 60) + ' 分钟'; });
      setOpacity(p3, win(t, 10.4, 13.4));
      setOpacity(p4, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 16: 从示范学自主（表 3、图 7） ── */
  function buildSceneLfd() {
    var s = sceneSvg('上面是自主的两层：模仿学习的策略看一张第一人称图，输出未来 8 帧的运动目标（含手指指令），交给 OmniH2O 的跟踪策略去执行；' +
      '下面先播项目页的四段自主视频（接住扔掉、下蹲、接锤子、石头剪刀布），再依次是表 3 的三组对比：BC、DDIM、DDPM；单步还是一次 8 步；数据量 25% / 50% / 100%');
    var dia = group(s);
    var NB = [[24, 52, 120, 52, '一张图', '头部相机'], [190, 52, 160, 52, '模仿学习策略', '扩散策略'], [396, 52, 160, 52, '未来 8 帧运动目标', '3 个点 + 手指'], [602, 52, 170, 52, 'OmniH2O 跟踪策略', '50 Hz → 关节目标']];
    var nb = NB.map(function (b, i) {
      var g = group(dia);
      rectBox(g, b[0], b[1], b[2], b[3], [C_MUTED, C_WARN, C_VR, C_GOOD][i], C_SURFACE2);
      label(g, b[0] + b[2] / 2, b[1] + 21, b[4], 'demo-x-ink', 12, 'middle');
      label(g, b[0] + b[2] / 2, b[1] + 42, b[5], 'demo-x-ink2', 10.5, 'middle');
      if (i) { var a = arrow(g, C_MUTED, 2); a.set(NB[i - 1][0] + NB[i - 1][2] + 2, b[1] + b[3] / 2, b[0] - 2, b[1] + b[3] / 2, 7); }
      return g;
    });
    dia.appendChild(svgMath(400, 136, '\\pi_{\\text{LfD}}\\big(\\hat{\\mathbf{p}}^{\\text{Sparse-lfd}}_{t:t+\\phi} \\mid \\mathbf{I}_t\\big),\\ \\ \\phi = 8', { size: 15, anchor: 'middle', w: 520 }));
    var p1 = group(s);
    var lv = projClip(p1, 'lfd', 30, 172, 380, 212.8, '');
    label(p1, 440, 196, '项目页视频（1 倍速）：扩散策略自主完成', 'demo-x-ink', 12.5);
    ['左上 接住再扔掉', '右上 下蹲', '左下 接锤子', '右下 石头剪刀布'].forEach(function (n, i) { label(p1, 440, 226 + i * 24, n, 'demo-x-ink2', 12); });
    label(p1, 440, 334, '策略只看头部相机的一张图', 'demo-x-mut', 11);
    var p1b = group(s);
    label(p1b, 440, 362, '不直接输出电机指令：复用跟踪策略', 'demo-x-ink2', 12);
    label(p1b, 440, 384, '学好的运动技能，需要的示范少得多', 'demo-x-ink2', 12);
    var LW = 190, MW = 300;
    function tableBars(parent, title, rows, colors) {
      var g = group(parent);
      label(g, 60, 196, title, 'demo-x-ink', 13);
      var c = barChart(g, 60, 210, LW, MW, 34, rows.map(function (r, i) { return [r[0], r[2], colors[i]]; }), 10, function (v) { return f2(v).replace(/\.?0+$/, '') + ' / 10'; });
      return { g: g, c: c };
    }
    var a = tableBars(s, '表 3(c)：用哪种模仿学习？（4 个任务 × 10 次的平均）', TABLE3.algo, [C_BAD, C_ACCENT, C_GOOD]);
    var b = tableBars(s, '表 3(b)：一次输出几步？', TABLE3.seq, [C_BAD, C_ACCENT, C_GOOD]);
    var c = tableBars(s, '表 3(a)：数据量', TABLE3.data, [C_BAD, C_WARN, C_GOOD]);
    var noteA = label(a.g, 600, 246, '扩散策略远好于普通 BC', 'demo-x-ink2', 11.5);
    var noteB = label(b.g, 600, 246, '一次多输出几步很关键', 'demo-x-ink2', 11.5);
    var noteC = label(c.g, 600, 246, '40 分钟还远远不够多', 'demo-x-ink2', 11.5);
    void noteA; void noteB; void noteC;
    function draw(t) {
      nb.forEach(function (g, i) { setOpacity(g, seg(t, 0.5 + 0.5 * i, 0.9 + 0.5 * i)); });
      var a1 = win(t, 0.3, 7.0);
      setOpacity(p1, a1); lv.at(K.clipSince(t, 0), a1 > 0.02);
      setOpacity(p1b, win(t, 3.6, 7.0));
      setOpacity(a.g, win(t, 7.0, 10.4)); a.c.set(ease(seg(t, 7.4, 8.4)));
      setOpacity(b.g, win(t, 10.4, 13.4)); b.c.set(ease(seg(t, 10.8, 11.8)));
      setOpacity(c.g, win(t, 13.4)); c.c.set(ease(seg(t, 13.8, 14.6)));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 17: 局限 ── */
  function buildSceneLimits() {
    var s = sceneSvg('卡片依次出现：要靠根部里程计换坐标，VIO 有噪声甚至跳变；没有安全保证；只给上身的稀疏目标上不了楼梯；' +
      '讲后两条时下面播项目页的三个失败案例（被墙卡住、脚下有障碍、扩散策略放不下锤子）；' +
      '模仿学习还要更多传感器和更好的算法；最后是我们读代码时看到的出入，以及 OmniH2O 的核心一句话');
    var W = 236, Y0 = 52;
    function cardAt(i, title, color) {
      var x = 30 + i * (W + 16), g = group(s);
      rectBox(g, x, Y0, W, 210, color, C_SURFACE2);
      label(g, x + 14, Y0 + 26, title, 'demo-x-ink', 13);
      return { g: g, x: x };
    }
    var c1 = cardAt(0, '① 要知道机器人在哪', C_BAD);
    ['VR 给的是人在世界里的姿态，', '要靠根部里程计换到机器人', '坐标系；VIO 有噪声，', '甚至会跳，目标就偏了'].forEach(function (l, i) { label(c1.g, c1.x + 14, Y0 + 58 + i * 22, l, 'demo-x-ink2', 11.5); });
    var c2 = cardAt(1, '② 没有安全保证', C_WARN);
    ['策略很鲁棒，但没有保证，', '也没有安全检查；', '极端的外力、分布外的目标', '（比如目标突然跳很远）', '都没处理'].forEach(function (l, i) { label(c2.g, c2.x + 14, Y0 + 58 + i * 22, l, 'demo-x-ink2', 11.5); });
    var c3 = cardAt(2, '③ 还上不了楼梯', C_ACCENT);
    ['只给上身的 3 个点，', '下身怎么迈全靠策略猜；', '以后：更多传感器（激光雷达、', '腕部相机、触觉）和', '更好的模仿学习算法'].forEach(function (l, i) { label(c3.g, c3.x + 14, Y0 + 58 + i * 22, l, 'demo-x-ink2', 11.5); });
    var fl = group(s), FW = 600, FH = FW * 180 / 960, FX = 170, FY = 282;
    label(fl, 30, 306, '项目页的', 'demo-x-ink', 13);
    label(fl, 30, 328, '失败案例', 'demo-x-ink', 13);
    label(fl, 30, 352, '（1 倍速）', 'demo-x-mut', 10.5);
    var fv = projClip(fl, 'fail', FX, FY, FW, FH, '');
    ['被墙卡住就摔了（遥操作）', '脚下有障碍会绊倒（走路）', '放不下锤子（扩散策略）'].forEach(function (n, i) {
      label(fl, FX + FW * (2 * i + 1) / 6, FY + FH + 19, n, 'demo-x-ink2', 11, 'middle');
    });
    var bot1 = group(s);
    rectBox(bot1, 30, 280, 740, 112, C_BORDER, C_SURFACE2);
    label(bot1, 44, 304, '读代码时看到的（我们的观察）', 'demo-x-ink', 13);
    label(bot1, 44, 330, '官方只放出出拳样例 stable_punch.pkl（站姿版）和筛过的 AMASS 下载链接，蹲姿版不在样例里；', 'demo-x-ink2', 11.5);
    label(bot1, 44, 352, '抬脚奖励的正负、绊脚的权重、课程的步长与阈值、DAgger 的损失，代码和附录都有出入；', 'demo-x-ink2', 11.5);
    label(bot1, 44, 374, '「8 个点」「22 个点」在代码里会自动再加上头，观测是 1719 / 1845 维', 'demo-x-ink2', 11.5);
    var bot2 = group(s);
    rectBox(bot2, 30, 280, 740, 112, C_GOOD, C_SURFACE2);
    label(bot2, 44, 306, 'OmniH2O 的核心', 'demo-x-ink', 14);
    label(bot2, 44, 336, '一个运动学姿态接口 + 教师—学生蒸馏：', 'demo-x-ink2', 13);
    label(bot2, 44, 362, '同一个策略既能被人遥操作，又能当自主系统的底层', 'demo-x-ink', 13);
    function draw(t) {
      setOpacity(c1.g, seg(t, 0.6, 1.0));
      setOpacity(c2.g, seg(t, 3.9, 4.3));
      setOpacity(c3.g, seg(t, 7.3, 7.7));
      var af = win(t, 3.6, 10.4);
      setOpacity(fl, af); fv.at(K.clipSince(t, 3.6), af > 0.02);
      setOpacity(bot1, win(t, 10.4, 13.4));
      setOpacity(bot2, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 各幕的 cue 时刻都落在 0.4 / 3.6 / 7.0 / 10.4 / 13.4，和配音旁白的分段一致 */
  var OMNI_SCENES = [
    {
      title: 'H2O 留下的问题',
      dur: 16,
      build: buildSceneGap,
      cues: [
        { at: 0.4, s: '目标：全尺寸人形的**全身灵巧移动操作**，手指也要动；还要好用的遥操作接口，录下来的数据能**训自主策略**。' },
        { at: 3.6, s: '上一篇 H2O：一台 RGB 摄像头实时遥操作，但测试时还要**动捕**给根部线速度，估姿态又慢又不准，**站不住**，也没有手。' },
        { at: 7.0, s: '全身控制本身就难：很多工作只管下身，或者把上下身拆开；灵巧操作要稳的下身托着，得**一个策略**协调全身。' },
        { at: 10.4, s: '接口贵就采不到数据：动捕、外骨骼都贵；**VR 头显**便宜，但只给**头和双手 3 个点**。' },
        { at: 13.4, s: '三条贡献：一个策略跟任意来源的**运动学目标**；仿真与真机的大规模跟踪实验；首个人形全身移动操作数据集 **OmniH2O-6**。' }
      ]
    },
    {
      title: '运动学姿态：一个通用接口',
      dur: 16,
      build: buildSceneInterface,
      cues: [
        { at: 0.4, s: '论文图 3：(a) 重定向 + 筛数据，(b) 仿真里先用强化学习训**教师**、再用监督学习蒸馏**学生**，(c) 真机上的各种接口。' },
        { at: 3.6, s: '接口统一成**运动学姿态** $\\mathbf{q}_t \\triangleq (\\boldsymbol{\\theta}_t, \\mathbf{p}_t)$：VR、RGB、手柄、外骨骼、动捕、语言（MDM）都给得出。' },
        { at: 7.0, s: '自主也走同一个接口：GPT-4o 选动作原语或直接给位置，扩散策略 $\\pi_{\\text{LfD}}$ 从遥操作数据学着输出目标。' },
        { at: 10.4, s: '遥操作只用**位置** $\\tilde{\\mathbf{p}}_t$：VR 估不准全身的旋转，只放头和双手 **3 个点**。' },
        { at: 13.4, s: '手指不走策略：VR 估出的手部姿态 → **逆运动学** → 灵巧手控制器。' }
      ]
    },
    {
      title: '站住、蹲住：给动作库加偏置',
      dur: 16,
      build: buildSceneVariants,
      cues: [
        { at: 0.4, s: '重定向沿用 H2O 的流程（改身材、位置逆运动学、仿真筛数据）；H2O 的毛病是机器人总在原地**挪小碎步**，站不住。' },
        { at: 3.6, s: '办法：每段动作 $\\hat{\\mathbf{q}}_{1:T}$ 再做一份稳定版 $\\hat{\\mathbf{q}}^{\\text{stable}}_{1:T}$：**根固定**、下半身固定成**站姿或蹲姿**，上半身照旧。' },
        { at: 7.0, s: '官方样例 `stable_punch.pkl` 就是站姿版：根在 (0, 0, 0.979) m、朝向不转，腿取默认站姿 −0.4 / 0.8 / −0.4 rad，脚底正好落地。' },
        { at: 10.4, s: '蹲姿版是我们照论文做的：髋 −0.8、膝 1.6、踝 −0.8 rad，根降到 0.80 m；(b) 是我们按官方 `dof` 字段近似重建的原始重定向。' },
        { at: 13.4, s: '论文图 9：不加这些数据，机器人很难站住不动、只动上身——训练数据要**偏向站和蹲**。' }
      ]
    },
    {
      title: '每一步的最高抬脚',
      dur: 16,
      build: buildSceneFeet,
      cues: [
        { at: 0.4, s: '以前的工作用「腾空时间」「抬脚高度」塑造下身动作，结果机器人为了平衡**原地跺脚**，而不是站住。' },
        { at: 3.6, s: 'OmniH2O 新加一项：**每一步的最高抬脚**——脚落地那一刻结算，看这一步腾空时脚最高抬到多少。' },
        { at: 7.0, s: '官方代码：$r = -2500\\cdot\\max(0.25 - h_{\\max}, 0)$，抬不到 0.25 m 就扣；站着不动不落地，就**不扣**。' },
        { at: 10.4, s: '所以要么**站住**，要么**迈大步**；小碎步每一步都扣分（玩具示意，4 秒累计 −2600）。' },
        { at: 13.4, s: '论文表 15 写成「超过 0.25 m 才加分」（+1000），代码是「不到 0.25 m 就扣分」；0.25 m 量的是踝关节连杆，站着时它就离地 0.068 m。' }
      ]
    },
    {
      title: '惩罚从一半开始',
      dur: 16,
      build: buildSceneCurr,
      cues: [
        { at: 0.4, s: '惩罚和正则一上来就给满，强化学习会被罚得不敢动、回合很快结束，什么也学不会。' },
        { at: 3.6, s: '论文的课程：每一项**负**奖励乘系数 $s$，正奖励不乘；$s$ 从 **0.5** 开始，上限 1。' },
        { at: 7.0, s: '回合平均长度短于 40 步：$s \\times 0.9999$（放松）；长于 120 步：$s \\times 1.0001$（收紧）；中间不变。' },
        { at: 10.4, s: '从 0.5 涨到 1 要连乘约 **6932** 次：先学会别摔，再慢慢讲究（曲线是示意）。' },
        { at: 13.4, s: '官方代码：每次乘 1 ± 0.00001、阈值 50 / 120、$s$ 在 0.25 到 1 之间，按名单乘——名单里还有正的腾空时间奖励。' }
      ]
    },
    {
      title: '特权教师：913 维',
      dur: 16,
      build: buildSceneTeacher,
      cues: [
        { at: 0.4, s: '真机拿不到每个连杆的全局速度；VR 又只给 3 个点——直接用强化学习训这种**稀疏输入**的策略很难。' },
        { at: 3.6, s: '先在仿真里训一个**特权教师** $\\pi_{\\text{privileged}}$：23 个刚体（20 个连杆 + 两手 + 头）的状态全给。' },
        { at: 7.0, s: '本体感受 **361** 维：刚体位置 66、旋转 138、速度 69、角速度 69，加上一步动作 19。' },
        { at: 10.4, s: '目标 **552** 维：和**下一帧**参考之间的位置、旋转、速度、角速度之差，再加参考的位置和旋转。' },
        { at: 13.4, s: '913 维 → 19 个关节目标，用 PPO 训，奖励、随机化都上；仿真里成功率 **94.77%**。' }
      ]
    },
    {
      title: '学生只看头和双手',
      dur: 16,
      build: buildSceneStudent,
      cues: [
        { at: 0.4, s: '学生 $\\pi_{\\text{OmniH2O}}$ 的目标只有 **3 个点**：头和双手——VR 头显正好给得出这三个。' },
        { at: 3.6, s: '每个点 3 种量：**位置差**、参考**位置**、参考**速度**，都换到机器人朝向坐标系：3 × 3 × 3 = **27 维**（第 2.40 s 的例子）。' },
        { at: 7.0, s: '头和手 H1 身上都没有：代码里「头」是骨盆往上 0.75 m，「手」是肘往前 0.3 m；左手这时要往左再移 0.37 m。' },
        { at: 10.4, s: 'RGB、语言等接口也只给这 3 个点，保持一致；想消歧义可以多给几个点。' },
        { at: 13.4, s: '头的目标水平方向离机器人超过 1 m 时，代码把它拉回 1 m 以内（`clip_motion_goal`）。' }
      ]
    },
    {
      title: '25 步历史代替线速度',
      dur: 16,
      build: buildSceneHistory,
      cues: [
        { at: 0.4, s: '本体感受只放真机拿得到的：关节位置 19、关节速度 19、根角速度 3、投影重力 3、上一步动作 19，一步 **63** 维。' },
        { at: 3.6, s: '再叠过去 **25 步**：$90 + 25 \\times 63 = 1665$ 维（图 3 写作 26 步 × 63 = 1638，再加 27）。' },
        { at: 7.0, s: '**没有全局线速度**：H2O 要动捕给它；OmniH2O 让策略从历史里自己推出来。' },
        { at: 10.4, s: '测试时不再需要动捕，机器人可以走出实验室。' },
        { at: 13.4, s: '但 VR 的目标要换到机器人坐标系：腰上的 **ZED** 做视觉惯性里程计（60 Hz），只用来换坐标，不进策略。' }
      ]
    },
    {
      title: 'DAgger：学生开车，老师批改',
      dur: 16,
      build: buildSceneDagger,
      cues: [
        { at: 0.4, s: '学生不用强化学习训，照 **DAgger**：每个回合让**学生**自己在仿真里开。' },
        { at: 3.6, s: '学生走到的每个状态，用参考动作和仿真状态算出特权观测，问**教师**这里会怎么做，得到 $\\mathbf{a}^{\\text{privileged}}_t$。' },
        { at: 7.0, s: '损失 $\\mathcal{L} = \\lVert \\mathbf{a}^{\\text{privileged}}_t - \\mathbf{a}_t \\rVert_2^2$；数据来自学生自己走出的分布，犯了错也有人教。' },
        { at: 10.4, s: '为什么不直接 RL？同样 1665 维的输入，不用 DAgger 只有 **47.11%**，用了 **94.10%**。' },
        { at: 13.4, s: '官方代码：只用模仿损失（`dagger_only`）、初始动作噪声 0.001、不加观测噪声；损失是不带平方的 L2 范数取平均。' }
      ]
    },
    {
      title: '灵巧手与机载系统',
      dur: 16,
      build: buildSceneSystem,
      cues: [
        { at: 0.4, s: '机器人：Unitree H1（19 个电机）+ Inspire 灵巧手 + 达妙 DM-J4310-2EC 腕部电机。' },
        { at: 3.6, s: '手和手腕**不经过策略**：Vision Pro 估出的手部姿态 → 逆运动学 → 直接给手和腕的控制器。' },
        { at: 7.0, s: '机载两台 Orin NX：一台接腰上的 ZED 做里程计、经 Wi-Fi 收 Vision Pro 的目标；另一台跑策略（**50 Hz**）和底层控制。' },
        { at: 10.4, s: '两台用网线、ROS 通信，整套延迟约 **20 ms**；也可以换成一台 RTX 4090 笔记本，效果相近。' },
        { at: 13.4, s: '官方仓库的硬件图：头上的 RealSense 录第一人称 RGB，腰上是 ZED Mini。' }
      ]
    },
    {
      title: '表 1：学生追上老师',
      dur: 16,
      build: buildSceneTable1,
      cues: [
        { at: 0.4, s: '表 1：在加了站姿 / 蹲姿版的 AMASS 重定向数据（约 1.4 万段）上评测；成功 = 平均偏差始终不超过 0.5 m。' },
        { at: 3.6, s: '学生 **94.10%**，教师 94.77%，只差 0.67 个点；比 H2O（87.52%）高 6.58 个点，全局误差 148.13 → 141.11 mm。' },
        { at: 7.0, s: '(a) 不用 DAgger、直接 RL：1665 维只有 **47.11%**；去掉历史（90 维）倒有 90.62%。' },
        { at: 10.4, s: '论文的解释：历史让输入复杂度指数增长，RL 处理不了；监督学习能用好历史。' },
        { at: 13.4, s: '用 DAgger 时，有没有历史在仿真里差不多（93.80% 对 94.10%）——历史的用处要到真机上才看得出。' }
      ]
    },
    {
      title: '表 1：仿真里差别不大',
      dur: 16,
      build: buildSceneTable1b,
      cues: [
        { at: 0.4, s: '(b) 历史 0 / 5 / 25 / 50 步：93.80 / 93.60 / **94.10** / 93.56%，25 步最好。' },
        { at: 3.6, s: '换成自己记历史的 GRU、LSTM：92.85%、91.03%，不如 MLP。' },
        { at: 7.0, s: '(c) 跟踪 22 / 8 / 3 个点：94.72 / 94.31 / 94.10%，3 个点只低 0.62 个点。' },
        { at: 10.4, s: '但全局误差 127.71 → 141.11 mm：点少了，全身姿态更含糊；换来的是商用 VR 就能用。' },
        { at: 13.4, s: '(d) 观测里加线速度：93.80% 对 94.10%，仿真里没好处；真机上它却是大麻烦。' }
      ]
    },
    {
      title: '表 2：真机才看得出',
      dur: 16,
      build: buildSceneTable2,
      cues: [
        { at: 0.4, s: '表 2：真机上 20 段站立动作；全局关节误差 H2O 87.33 mm → OmniH2O **47.94 mm**，降了 45%。' },
        { at: 3.6, s: '线速度从哪来？ZED 的视觉惯性里程计噪声很大（图 8），把它放进观测的策略**摔倒了**，测不完。' },
        { at: 7.0, s: '换成神经网络估速度（MLP / GRU）：50.93 / 49.75 mm，仍不如**不给线速度**的 47.94 mm。' },
        { at: 10.4, s: '历史 0 / 5 / 25 / 50 步：83.26 / 62.18 / **47.94** / 50.24 mm——仿真里看不出的差别，真机上差一倍。' },
        { at: 13.4, s: 'LSTM 在真机上 87.00 mm，和 H2O 差不多；论文的结论：25 步历史的 MLP 最好。' }
      ]
    },
    {
      title: '一个策略，接各种遥控',
      dur: 16,
      build: buildSceneInterfaces,
      cues: [
        { at: 0.4, s: '同一个策略 $\\pi_{\\text{OmniH2O}}$：VR 遥操作打网球、乒乓球、羽毛球，浇花（项目页视频）。' },
        { at: 3.6, s: '上下身一起：蹲下拿篮子、拳击、搬篮子、在架子和推车上取放。' },
        { at: 7.0, s: '语言：接上文本生成动作的 MDM，「挥左手」「T 字」「往前走 0.5 米」；普通 RGB 摄像头也能遥操作（图 10）。' },
        { at: 10.4, s: '抗干扰：站着或用手柄控制前后走时，被从各个角度拳打脚踢，自己站稳。' },
        { at: 13.4, s: '户外：草地、斜坡、碎石路，同一个策略。' }
      ]
    },
    {
      title: 'GPT-4o 与 OmniH2O-6',
      dur: 16,
      build: buildSceneGpt,
      cues: [
        { at: 0.4, s: '自主方式一：头上的摄像头拍一张图给 **GPT-4o**，它从动作原语里选：蓝靶出左拳、红靶出右拳。' },
        { at: 3.6, s: '握手、拥抱、挥手道别；GPT-4o 回复慢，所以选原语；也可以让它直接回 6 个数：双手相对骨盆的位置。' },
        { at: 7.0, s: '自主方式二：先用 VR 遥操作录数据 **OmniH2O-6**：头部 RGBD、头和双手相对根的目标、关节目标，30 Hz。' },
        { at: 10.4, s: '6 个任务：接住扔掉、下蹲、接锤子、石头剪刀布、拳击、篮子取放，共 73,462 帧，约 **40 分钟**。' },
        { at: 13.4, s: '论文说这是首个人形全身移动操作数据集：以前的数据集几乎都是固定底座的机械臂。' }
      ]
    },
    {
      title: '从示范学自主（表 3）',
      dur: 16,
      build: buildSceneLfd,
      cues: [
        { at: 0.4, s: '$\\pi_{\\text{LfD}}$ 看一张图 $\\mathbf{I}_t$，输出未来 $\\phi = 8$ 帧的**运动目标**（含手指指令），交给 $\\pi_{\\text{OmniH2O}}$ 去执行。' },
        { at: 3.6, s: '不直接输出电机指令：复用跟踪策略学好的运动技能，需要的示范少得多。' },
        { at: 7.0, s: '表 3（4 个任务 × 10 次的平均）：扩散策略 DDPM **8/10**、DDIM 7.75/10，普通行为克隆只有 **1/10**。' },
        { at: 10.4, s: '一次输出 8 步很关键：单步 6.5/10，单帧图 + 8 步 8/10，4 帧图 + 8 步 8.75/10。' },
        { at: 13.4, s: '数据越多越好：25% 4/10、50% 6.5/10、100% 8/10。' }
      ]
    },
    {
      title: '局限',
      dur: 16,
      build: buildSceneLimits,
      cues: [
        { at: 0.4, s: '要靠机器人的根部里程计，把接口给的姿态换到机器人坐标系；VIO 有噪声甚至跳变，目标会偏。' },
        { at: 3.6, s: '安全：策略很鲁棒，但没有保证、没有安全检查；目标突然跳很远这种分布外输入没处理；项目页的失败案例：被墙卡住就摔了。' },
        { at: 7.0, s: '只给上身的稀疏目标还上不了楼梯；以后要更多传感器（激光雷达、腕部相机、触觉）和更好的模仿学习算法。' },
        { at: 10.4, s: '我们读代码看到：官方只放出站姿版的出拳样例；抬脚奖励、课程、DAgger 损失，代码和附录都有出入。' },
        { at: 13.4, s: 'OmniH2O 的核心：一个**运动学姿态接口** + 教师—学生，让同一个策略既能遥操作，又能当自主系统的底层。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十七幕动画：OmniH2O 全流程速览',
      sub: '约 272 秒自动播放。空格播放/暂停，← → 换幕；H1 用官方样例的动作按真实模型做 3D 渲染（蹲姿版与原始重定向是我们做的），表格与图来自论文，真机片段剪自项目页的视频。',
      ariaLabel: 'OmniH2O 十七幕讲解动画',
      notes: [
        '取数依据：表 1–3、附录表 4–19 的数字照抄 arXiv 2406.08858 v1（与 PMLR 定稿一致）；代码里的数（站姿版样例、头和手的延长、27 / 913 / 1665 维的排布、抬脚奖励与课程、DAgger 的设置、把头的目标拉回 1 m）读自 LeCAR-Lab/human2humanoid。',
        'H1 的动作是**官方样例** `stable_punch.pkl` 里 KIT 572 号受试者的左手出拳（第 1.00–4.93 s）：站姿版直接取它的 `pose_aa`；蹲姿版是我们照论文改的下半身；原始重定向是我们用它的 `dof` 字段近似重建的（只解根部的位姿，11 对点平均差 44.3 mm）。第 4、5 幕的步态与课程曲线是示意，第 7 幕「机器人落后 0.2 s」是假设。',
        'H1 的 3D 外形：材质与光照照抄 Robot Retarget Online（ImChong/Robot_Retarget_Online）的 three.js 场景，读它仓库里的 `unitree_h1/h1.xml`（MuJoCo Menagerie 的 H1，与官方仓库的 `h1.xml` 正运动学逐位相同），按关节角用正交相机逐帧离线渲染成贴图；身上的点与人的骨架用同一套投影叠在上面。'
      ],
      scenes: OMNI_SCENES
    });
  }

  // ─── the narrated vertical video of the same seventeen scenes ────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：OmniH2O 十七幕全流程',
      sub: '13 分 25 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十七幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '14.5 MB',
      fileName: 'OmniH2O_讲解视频.mp4'
    });
  }

  // ─── 演示 1：三个点浏览器（官方样例） ───────────────────────────────────────
  function buildPointsDemo(host) {
    var root = card(host, {
      title: '三个点浏览器：头和双手 → 27 维目标',
      sub: '官方样例（KIT 572 号受试者的左手出拳，站姿版）逐帧看：绿圈是参考里的头和双手，橙点是落后几帧的机器人自己的，红线是位置差。切到 8 / 22 个点，看观测有多少维、表 1(c) 的成绩差多少。'
    });
    var state = { k: EX_K, lag: EX_LAG, pts: 3 };
    var row = controlsRow(root);
    var sk = slider(row, { label: '参考帧（15 fps）', min: EX_LAG, max: CLIP.n - 2, step: 1, value: EX_K, format: function (v) { return '第 ' + f2(CLIP.t0 + v / CLIP.fps) + ' s'; }, onInput: function (v) { state.k = v; render(); } });
    var sl = slider(row, { label: '机器人落后', min: 0, max: 6, step: 1, value: EX_LAG, format: function (v) { return v + ' 帧（' + f2(v / CLIP.fps) + ' s）'; }, onInput: function (v) { state.lag = v; render(); } });
    var row2 = controlsRow(root);
    buttonGroup(row2, { label: '跟踪几个点', items: [{ label: '3 个点（OmniH2O）', value: 3 }, { label: '8 个点', value: 8 }, { label: '22 个点', value: 22 }], value: 3, onPick: function (v) { state.pts = v; render(); } });
    var svg = sceneSvg('官方样例的 H1：绿圈是参考的头和双手，橙点是机器人自己的，红线是位置差', '0 0 640 380');
    var wrap = el('div', 'demo-stage');
    wrap.appendChild(svg);
    root.appendChild(wrap);
    var GY = 360, cam = camFor(SHEETS.stable, 160, 300, GY, 0, 0);
    groundLine(svg, 120, 520, GY);
    var h1 = h1Mesh(svg, SHEETS.stable);
    var lines = []; var refs = []; var owns = [];
    for (var i = 0; i < 23; i++) {
      lines.push(hline(svg, 0, 0, 0, 0, C_BAD, 2));
      refs.push(ring(svg, 0, 0, 6, 6, C_VR));
      owns.push(dotAt(svg, 0, 0, 3.6, C_H1));
    }
    var stamp = svgText(16, 24, '', 'demo-x-ink2', 13);
    svg.appendChild(stamp);
    var stats = statsRow(root);
    var sDim = stats.add('观测维数（论文）'), sCode = stats.add('官方代码'), sSucc = stats.add('表 1(c) 成功率'), sG = stats.add('表 1(c) 全局误差');
    var tb = table(root);
    note(root, [
      '位置差、参考位置、参考速度都在机器人的朝向坐标系里（站姿版的骨盆不转，所以就是世界坐标系）；参考位置相对机器人的骨盆。参考速度用 15 fps 的中心差分，是我们的近似。',
      '代码里的「头」是骨盆坐标系里往上 0.75 m 的一点，「手」是肘连杆坐标系里往前 0.3 m 的一点；8 / 22 个点在代码里会自动再加上头，所以是 1719 / 1845 维。',
      '第 2.67 s 左手打到了身体左侧 $y = 0.82$ m：站姿版把骨盆的朝向也固定了，人出拳时骨盆转了约 68°（我们重建的结果），这一拳就偏到了侧面。'
    ]);
    function idxFor(n) { return n === 3 ? VR3 : n === 8 ? KP8.concat([PT.head]) : KP22.concat([PT.head]); }
    function render() {
      var k = state.k, g = Math.max(0, k - state.lag), f = frame(k), fo = frame(g), idx = idxFor(state.pts);
      h1.put([0, 0], cam, g);
      for (var j = 0; j < 23; j++) {
        var on = idx.indexOf(j) >= 0;
        var a = project(fo.st[j], cam), b = project(f.st[j], cam);
        setLine(lines[j], a[0], a[1], b[0], b[1]); moveDot(owns[j], a); moveDot(refs[j], b);
        [lines[j], owns[j], refs[j]].forEach(function (n) { n.style.opacity = on ? 1 : 0; });
      }
      stamp.textContent = '参考第 ' + f2(CLIP.t0 + k / CLIP.fps) + ' s，机器人在第 ' + f2(CLIP.t0 + g / CLIP.fps) + ' s';
      var n = state.pts, goal = n === 3 ? 27 : n === 8 ? 72 : 198, code = n === 3 ? 1665 : n === 8 ? 1719 : 1845;
      sDim.set((PROP_DIM + goal + HIST * PROP_DIM) + ' 维');
      sCode.set(code + ' 维（目标 ' + ((n === 3 ? 3 : n + 1) * 9) + '）');
      var r = n === 3 ? t1('p3') : n === 8 ? t1('p8') : t1('p22');
      sSucc.set(pct(r.all[0]), n === 3 ? 'good' : null);
      sG.set(mm(r.all[1]), n === 3 ? null : 'good');
      tb.clear();
      var gl = goal27(k, state.lag);
      tb.row(['点', '位置差 (m)', '参考位置 (m)', '参考速度 (m/s)', '机器人自己 (m)'], true);
      gl.forEach(function (q, i) { tb.row([VR3_ZH[i], vec(q.diff), vec(q.ref), vec(q.vel), vec(q.own)]); });
    }
    sk.refresh(); sl.refresh();
    registerRenderer(render);
    render();
  }

  // ─── 演示 2：抬脚奖励与惩罚课程 ─────────────────────────────────────────────
  function buildRewardDemo(host) {
    var root = card(host, {
      title: '抬脚奖励与惩罚课程',
      sub: '上半部分：一只脚抬起、落地，这一步结算多少分？比较官方代码与论文表 15 的两种写法，以及腾空时间奖励。下半部分：回合平均长度一直保持在某个值时，惩罚系数 $s$ 怎么变。'
    });
    var state = { h: 0.12, air: 0.3, moving: true, s: 0.5, L: 150, n: 5000 };
    var row = controlsRow(root);
    slider(row, { label: '这一步踝关节最高离地 $h_{\\max}$', min: 0.07, max: 0.40, step: 0.01, value: state.h, format: function (v) { return f2(v) + ' m'; }, onInput: function (v) { state.h = v; render(); } });
    slider(row, { label: '腾空时间', min: 0.05, max: 0.8, step: 0.05, value: state.air, format: function (v) { return f2(v) + ' s'; }, onInput: function (v) { state.air = v; render(); } });
    slider(row, { label: '课程系数 $s$', min: 0.25, max: 1, step: 0.05, value: state.s, format: function (v) { return f2(v); }, onInput: function (v) { state.s = v; render(); } });
    var row2 = controlsRow(root);
    K.checkbox(row2, '参考动作在走（根水平速度 > 0.1 m/s）', state.moving, function (v) { state.moving = v; render(); });
    var stats = statsRow(root);
    var sCode = stats.add('代码：最高抬脚'), sPaper = stats.add('论文：最高抬脚'), sAir = stats.add('腾空时间'), sSum = stats.add('代码这一步合计');
    var verdict = verdictBox(root);
    var row3 = controlsRow(root);
    slider(row3, { label: '回合平均长度', min: 10, max: 250, step: 5, value: state.L, format: function (v) { return v + ' 步（' + f1(v / 50) + ' s）'; }, onInput: function (v) { state.L = v; render(); } });
    slider(row3, { label: '更新次数', min: 500, max: 80000, step: 500, value: state.n, format: function (v) { return String(v); }, onInput: function (v) { state.n = v; render(); } });
    var st = stage(root, 220);
    var stats2 = statsRow(root);
    var sP = stats2.add('论文规则：$s$'), sC = stats2.add('代码规则：$s$');
    note(root, [
      '分数按代码的权重写（奖励文件 `rewards_teleop_omnih2o_teacher.yaml`），每一项还要乘 dt = 0.02；名单里的项（包括最高抬脚和腾空时间）再乘课程系数 $s$。论文表 15 把最高抬脚写成 $+1000\\cdot\\max(h_{\\max} - 0.25, 0)$，代码是 $-2500\\cdot\\max(0.25 - h_{\\max}, 0)$：一个奖励抬得高，一个惩罚抬得低，都只在落地那一刻结算。',
      '$h_{\\max}$ 量的是踝关节连杆原点离地的高度：站着时它就有 0.068 m，所以「0.25 m」相当于脚底要抬起约 0.18 m。腾空时间奖励是 $1000\\,(T_{\\text{air}} - 0.25)$，只在参考动作的根部水平速度超过 0.1 m/s 时才给（腾空不到 0.25 s 就是负的）。',
      '课程：论文是 $s \\times 0.9999$（回合 < 40 步）/ $\\times 1.0001$（> 120 步），$s \\le 1$；代码是 $s \\times (1 \\mp 10^{-5})$、阈值 50 / 120、$0.25 \\le s \\le 1$。这里假设回合平均长度一直不变，只看规则本身。'
    ]);
    function sAfter(rule, L, n) {
      var sv = 0.5;
      if (rule === 'paper') {
        if (L < CURR.lo) sv *= Math.pow(CURR.down, n); else if (L > CURR.hi) sv *= Math.pow(CURR.up, n);
        return Math.min(sv, CURR.cap);
      }
      if (L < CURR_CODE.lo) sv *= Math.pow(1 - CURR_CODE.step, n); else if (L > CURR_CODE.hi) sv *= Math.pow(1 + CURR_CODE.step, n);
      return clamp(sv, CURR_CODE.min, CURR_CODE.cap);
    }
    function render() {
      var code = feetCode(state.h), paper = feetPaper(state.h);
      var air = state.moving ? FEET.wAir * (state.air - FEET.air) : 0;
      var k = FEET.dt * state.s;
      sCode.set(sgn(f1(code)) + ' → ' + sgn(f2(code * k)), code < 0 ? 'bad' : 'good');
      sPaper.set(sgn(f1(paper)) + ' → ' + sgn(f2(paper * k)), paper > 0 ? 'good' : null);
      sAir.set(sgn(f1(air)) + ' → ' + sgn(f2(air * k)), air < 0 ? 'bad' : air > 0 ? 'good' : null);
      sSum.set(sgn(f2((code + air) * k)), code + air < 0 ? 'bad' : 'good');
      verdict.set(code < 0 ? '这一步抬得不够高（< 0.25 m），代码按 $-2500\\times$ ' + f2(FEET.h - state.h) + ' 扣分；站着不动不落地就不扣，所以小碎步最吃亏。' :
        '抬过了 0.25 m：代码不扣分；论文的写法反而会按超出的部分加分。', code < 0 ? 'bad' : 'good');
      var g = begin(st), ctx = g.ctx, P = g.P;
      var x0 = 54, x1 = g.w - 20, y0 = 16, y1 = g.h - 30, nMax = 80000;
      var sx = function (n) { return x0 + (x1 - x0) * n / nMax; }, sy = function (v) { return y1 - (y1 - y0) * (v - 0.2) / 0.85; };
      [0.25, 0.5, 0.75, 1].forEach(function (v) { line(ctx, [[x0, sy(v)], [x1, sy(v)]], P.grid, 1); text(ctx, f2(v), x0 - 8, sy(v), P.muted, 'right'); });
      [0, 20000, 40000, 60000, 80000].forEach(function (n) { text(ctx, String(n), sx(n), y1 + 16, P.muted, 'center'); });
      ['paper', 'code'].forEach(function (rule) {
        var pts = [];
        for (var i = 0; i <= 100; i++) { var n = nMax * i / 100; pts.push([sx(n), sy(sAfter(rule, state.L, n))]); }
        line(ctx, pts, rule === 'paper' ? P.warn : P.accent, 2.4);
      });
      line(ctx, [[sx(state.n), y0], [sx(state.n), y1]], P.muted, 1, [4, 4]);
      text(ctx, '论文规则', x1 - 4, sy(sAfter('paper', state.L, nMax)) - 10, P.warn, 'right');
      text(ctx, '代码规则', x1 - 4, sy(sAfter('code', state.L, nMax)) + 14, P.accent, 'right');
      sP.set(f3(sAfter('paper', state.L, state.n)));
      sC.set(f3(sAfter('code', state.L, state.n)));
    }
    registerRenderer(render);
    render();
  }

  // ─── 演示 3：表 1、表 2、表 3 ──────────────────────────────────────────────
  function buildTablesDemo(host) {
    var root = card(host, {
      title: '表 1、表 2、表 3：仿真、真机与模仿学习',
      sub: '表 1 在仿真里（约 1.4 万段），表 2 在真机上（20 段站立动作），表 3 是 4 个任务各试 10 次的平均（附录表 17 有逐任务的数）。'
    });
    var state = { view: 't1succ' };
    var row = controlsRow(root);
    var VIEWS = [{ label: '表 1 成功率', value: 't1succ' }, { label: '表 1 全局误差', value: 't1g' }, { label: '表 2 真机误差', value: 't2' }, { label: '表 3 模仿学习', value: 't3' }];
    buttonGroup(row, { label: '看什么', items: VIEWS, value: state.view, onPick: function (v) { state.view = v; render(); } });
    var st = stage(root, 360);
    var verdict = verdictBox(root);
    var tb = table(root);
    note(root, ['单位：MPJPE 是 mm，加速度误差 mm/帧²，速度误差 mm/帧。表 1 所有变体都用同样的奖励、随机化和数据（PMLR 定稿的表注）。表 2 里观测带 VIO 线速度的那一版在真机上摔倒，没有数。',
      '表 3 与附录表 17 对不上的两处：50% 数据和「单帧图 → 单步」按表 17 的四个任务平均都是 7/10，表 3 写的是 6.5/10；BC 与 DDIM 的平均 MSE 按表 17 算是 5.28e-3 与 7.18e-4，表 3 写的是 5.63e-3 与 1.9e-3（我们的核对）。']);
    var GROUP_ZH = { main: '主结果', a: '(a) DAgger / RL', b: '(b) 历史与结构', c: '(c) 跟踪点', d: '(d) 线速度' };
    function bars(g, rows, vmax, fmtV, lo) {
      var ctx = g.ctx, P = g.P, bx = Math.min(200, g.w * 0.38), bw = g.w - bx - 80, rh = (g.h - 16) / rows.length;
      rows.forEach(function (r, i) {
        var y = 8 + i * rh, v = r.v;
        text(ctx, r.label, bx - 8, y + rh * 0.5, r.head ? P.text : P.muted, 'right', (r.head ? 'bold ' : '') + '11.5px sans-serif');
        if (v == null) { if (!r.head) text(ctx, r.na || '—', bx + 4, y + rh * 0.5, P.bad, 'left'); return; }
        var w = Math.max(2, bw * clamp((v - (lo || 0)) / (vmax - (lo || 0)), 0, 1));
        ctx.save(); ctx.fillStyle = P[r.color] || P.accent; ctx.globalAlpha = 0.85; ctx.fillRect(bx, y + rh * 0.2, w, rh * 0.6); ctx.restore();
        text(ctx, fmtV(v), bx + w + 6, y + rh * 0.5, P.text, 'left');
      });
    }
    function render() {
      var g = begin(st);
      tb.clear();
      if (state.view === 't1succ' || state.view === 't1g') {
        var mi = state.view === 't1succ' ? 0 : 1, rows = [], last = null;
        TABLE1.forEach(function (r) {
          if (r.group !== last) { rows.push({ label: GROUP_ZH[r.group], head: true }); last = r.group; }
          rows.push({ label: r.zh + '（' + r.dim + '）', v: r.all[mi], color: r.key === 'omni' || r.key === 'h25' || r.key === 'p3' ? 'good' : r.key === 'woD' ? 'bad' : r.key === 'priv' ? 'muted' : 'accent' });
        });
        if (mi === 0) bars(g, rows, 96, pct, 40); else bars(g, rows, 230, mm, 0);
        verdict.set(mi === 0 ? '学生 94.10% 只比教师低 0.67 个点；不用 DAgger 只有 47.11%。历史、结构、点数、线速度的差别都在 3.1 个点以内（横轴从 40% 起）。' :
          '全局误差越小越好：22 个点 127.71 mm 最接近教师（126.51），3 个点 141.11 mm；不用 DAgger 223.27 mm。', 'good');
        tb.row(['方法', '分组', '维度', '成功率 %', '全局', 'MPJPE', '加速度', '速度', '成功：全局', '成功：MPJPE', '成功：加速度', '成功：速度'], true);
        TABLE1.forEach(function (r) { tb.row([r.zh, GROUP_ZH[r.group], r.dim].concat(r.all).concat(r.succ)); });
      } else if (state.view === 't2') {
        var rows2 = [], last2 = null;
        TABLE2.forEach(function (r) {
          if (r.group !== last2) { rows2.push({ label: { main: '主结果', a: '(a) 线速度从哪来', b: '(b) 历史与结构' }[r.group], head: true }); last2 = r.group; }
          rows2.push({ label: r.zh + '（' + r.dim + '）', v: r.v ? r.v[0] : null, na: '摔倒，测不完', color: r.key === 'omni' ? 'good' : r.key === 'h0' || r.key === 'lstm' || r.key === 'h2o' ? 'bad' : 'accent' });
        });
        bars(g, rows2, 100, mm, 0);
        verdict.set('真机上全局误差 87.33 → 47.94 mm（−45%）；历史 0 步 83.26 mm，25 步 47.94 mm——仿真里 0.3 个点的差别，真机上差了 74%。', 'good');
        tb.row(['方法', '维度', '全局 MPJPE', 'MPJPE', '加速度', '速度'], true);
        TABLE2.forEach(function (r) { tb.row([r.zh, r.dim].concat(r.v || ['摔倒', '—', '—', '—'])); });
      } else {
        var rows3 = [];
        [['data', '(a) 数据量'], ['seq', '(b) 一次输出几步'], ['algo', '(c) 用哪种模仿学习']].forEach(function (grp) {
          rows3.push({ label: grp[1], head: true });
          TABLE3[grp[0]].forEach(function (r) { rows3.push({ label: r[0], v: r[2], color: r[2] >= 8 ? 'good' : r[2] <= 1 ? 'bad' : 'accent' }); });
        });
        bars(g, rows3, 10, function (v) { return fmt(v, 2).replace(/\.?0+$/, '') + ' / 10'; }, 0);
        verdict.set('扩散策略（DDPM 8/10、DDIM 7.75/10）远好于普通 BC（1/10）；一次输出 8 步比单步好；数据越多越好。', 'good');
        tb.row(['设置', '平均 MSE', '平均成功', '接住扔掉', '下蹲', '接锤子', '石头剪刀布'], true);
        ['data', 'seq', 'algo'].forEach(function (k) { TABLE3[k].forEach(function (r) { tb.row([r[0], r[1].toExponential(2), r[2] + ' / 10'].concat(r[3].map(function (x) { return x + ' / 10'; }))); }); });
      }
    }
    registerRenderer(render);
    render();
  }

  K.mount({
    'omnih2o-explainer': buildExplainerDemo,
    'omnih2o-video': buildVideoDemo,
    'omnih2o-points': buildPointsDemo,
    'omnih2o-reward': buildRewardDemo,
    'omnih2o-tables': buildTablesDemo
  });
})();
