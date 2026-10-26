/* Interactive HDMI demos for
 * papers/04_Loco-Manipulation_and_WBC/HDMI__Learning_Interactive_Humanoid_Whole-Body_Control_from_Human_Videos
 * （Weng, Li, Sobanbabu, Wang, Luo, He, Ramanan, Shi · HDMI: Learning Interactive Humanoid Whole-Body Control from
 *   Human Videos · arXiv 2509.16757 v3；代码 LeCAR-Lab/HDMI，2026-01-17 的 main）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["hdmi"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   hdmi-explainer — 十八幕讲解动画：和物体打交道，只跟身体不够 → 三段流水线（图 2）→ 从视频到参考轨迹 →
 *                    一帧参考：机器人、物体、接触 → DeepMimic 式训练三件套 → 统一的物体表示（图 3）→ 残差动作空间 →
 *                    交互奖励（式 1–2）→ 奖励与终止（表 I、表 II）→ 代码里的教师与学生 → 上真机：动捕给位姿 →
 *                    开门穿门：连续 67 次 → 搬箱子与楚门式鞠躬 → 仿真里的 14 个任务 → 交互奖励的消融（图 6）→
 *                    交互奖励管什么（图 7）→ 残差动作的消融（图 8、图 9）→ 局限与之后
 *   hdmi-video     — 同一套十八幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   hdmi-reference — 参考与回放逐帧看：官方的搬行李箱参考（OMOMO）与官方仓库里录下的仿真回放，双手离接触点多远
 *   hdmi-reward    — 交互奖励计算器：式 1–2 与代码里的参数（0.3 m、40 N、10 N、×5）
 *   hdmi-results   — 图 6、图 7a、图 8、图 9a 的数字（从论文的矢量图里抽出来）
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
  /* 论文的图（arXiv 2509.16757 的图 1–5、7b、7c、9b、9c）与项目页视频的片段放在 assets/img/papers/hdmi/；
     G1 搬行李箱的 3D 逐帧贴图（官方动作数据、同一台正交相机）在 assets/img/papers/hdmi/g1_3d/ */
  var IMG_BASE = assetBase('../../img/papers/');
  var PAPER_IMG_BASE = IMG_BASE ? IMG_BASE + 'hdmi/' : '';
  var CLIP_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'clips/' : '';
  var G1_3D_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'g1_3d/' : '';
  var el = K.el,
    fmt = K.fmt,
    clamp = K.clamp,
    card = K.card,
    controlsRow = K.controlsRow,
    slider = K.slider,
    buttonGroup = K.buttonGroup,
    checkbox = K.checkbox,
    statsRow = K.statsRow,
    verdictBox = K.verdictBox,
    note = K.note,
    table = K.table,
    stage = K.stage,
    begin = K.begin,
    line = K.line,
    text = K.text,
    registerRenderer = K.registerRenderer;

  // ─── 论文里的数字（arXiv 2509.16757 v3：表 I–II、图 6–9） ───────────────────────────
  /* 表 I：奖励的权重 */
  var REW_TRACK = [['身体局部位姿', 2.0, 'robot'], ['根部全局位姿', 1.0, 'robot'], ['身体全局速度', 1.0, 'robot'], ['关节跟踪', 1.0, 'robot'],
    ['物体位姿', 2.0, 'obj'], ['接触奖励', 5.0, 'contact']];
  var REW_REG = [['动作变化率', '0.1'], ['关节限位', '10.0'], ['关节速度', '5e-4'], ['力矩限位', '0.01'], ['足底冲击', '1.0'], ['脚打滑', '0.5'], ['腾空时间', '5.0']];
  /* 表 II：终止条件（每项都要连续 25 步） */
  var TERM = [['根部全局位姿', '0.5 m、1.2 rad'], ['身体局部位姿', '0.5 m、1.2 rad'], ['物体位姿', '0.5 m、1.2 rad'], ['接触丢失', '0.2 m、1.0 N']];
  /* 消融用的 8 个任务（图 6、图 8 的横轴顺序） */
  var TASKS = ['搬行李箱', '搬面包箱', '箱子扛上肩', '用手推门', '用脚开门', '推大箱子', '打开折叠椅坐下', '推倒木板'];
  /* 图 6：最终成功率（从矢量图的柱高读出来）：[有交互奖励 + 接触终止, 只去掉交互奖励, 两个都去掉]；评测时不开接触终止 */
  var FIG6 = [[1.00, 0.996, 0], [0.984, 0.998, 0.995], [0.996, 0, 0], [1.00, 0.999, 1.00], [1.00, 1.00, 1.00], [0.981, 0.966, 0.984], [1.00, 1.00, 1.00], [0.981, 0.973, 0.982]];
  /* 图 8：三项跟踪误差（误差棒的中点）：[残差 + 身体误差终止, 去掉残差, 两个都去掉]；单位按代码的 debug 项推断：rad、m、rad */
  var FIG8 = {
    joint: { zh: '关节位置误差', unit: 'rad', v: [[0.117, 0.116, 0.135, 0.049, 0.051, 0.075, 0.083, 0.092], [0.184, 0.196, 0.206, 0.081, 0.077, 0.111, 0.109, 0.175], [0.191, 0.227, 0.195, 0.106, 0.095, 0.097, 0.111, 0.183]] },
    bpos: { zh: '身体位置误差', unit: 'm', v: [[0.096, 0.044, 0.058, 0.026, 0.025, 0.043, 0.045, 0.058], [0.115, 0.065, 0.071, 0.035, 0.033, 0.054, 0.051, 0.091], [0.101, 0.074, 0.070, 0.048, 0.038, 0.049, 0.049, 0.086]] },
    bori: { zh: '身体朝向误差', unit: 'rad', v: [[0.246, 0.233, 0.245, 0.110, 0.103, 0.129, 0.174, 0.224], [0.289, 0.300, 0.302, 0.151, 0.156, 0.170, 0.220, 0.309], [0.335, 0.333, 0.289, 0.193, 0.174, 0.163, 0.210, 0.326]] }
  };
  /* 图 7a（训练第 100, 200, …, 1100 步的成功率，从矢量图的折线读出来）：b = 有交互奖励 + 接触终止，r = 只去掉交互奖励，g = 两个都去掉 */
  var FIG7A = {
    imperfect: { zh: '搬行李箱（不完美参考）', b: [0, 0, 0.001, 0.979, 0.993, 0.993, 0.995, 0.998, 0.999, 0.999, 1.0], r: [0, 0, 0, 0, 0, 0.055, 0.98, 0.992, 0.991, 0.984, 0.998], g: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    perfect: { zh: '搬行李箱（完美参考）', b: [0, 0.796, 0.995, 0.999, 0.999, 1.0, 0.999, 0.999, 0.999, 0.988, 0.976], r: [0, 0.18, 0.955, 0.982, 0.991, 0.997, 0.999, 1.0, 0.999, 0.998, 0.999], g: [0, 0, 0.52, 0.973, 0.996, 0.998, 0.999, 1.0, 1.0, 0.997, 1.0] },
    boxOff: { zh: '推大箱子（评测不开接触终止）', b: [0, 0.372, 0.925, 0.879, 0.93, 0.985, 0.987, 0.993, 0.978, 0.989, 0.987], r: [0, 0.001, 0.82, 0.906, 0.856, 0.919, 0.902, 0.935, 0.911, 0.925, 0.966], g: [0.001, 0.51, 0.814, 0.887, 0.922, 0.943, 0.935, 0.95, 0.979, 0.98, 0.995] },
    boxOn: { zh: '推大箱子（评测开接触终止）', b: [0, 0.342, 0.916, 0.868, 0.898, 0.981, 0.978, 0.974, 0.977, 0.983, 0.976], r: [0, 0, 0.826, 0.897, 0.819, 0.87, 0.874, 0.939, 0.89, 0.912, 0.956], g: [0.003, 0.232, 0.107, 0.108, 0.185, 0.226, 0.595, 0.308, 0.488, 0.283, 0.321] }
  };
  /* 图 9a（同样每 100 步一点）：左 = 关节位置误差，右 = 成功率；b = 残差 + 终止，r = 去掉残差，g = 两个都去掉。论文没写是哪个任务 */
  var FIG9A = {
    err: { b: [0.118, 0.118, 0.127, 0.128, 0.129, 0.128, 0.126, 0.121, 0.127, 0.128, 0.124], r: [0.329, 0.308, 0.28, 0.242, 0.221, 0.192, 0.186, 0.184, 0.202, 0.192, 0.18], g: [0.312, 0.283, 0.251, 0.229, 0.205, 0.211, 0.201, 0.191, 0.186, 0.181, 0.191] },
    succ: { b: [0, 0, 0.068, 0.99, 0.994, 0.971, 0.991, 0.997, 0.982, 0.964, 0.997], r: [0, 0, 0, 0, 0, 0, 0, 0, 0.983, 0.997, 0.997], g: [0, 0, 0, 0, 0, 0.075, 0.855, 0.973, 0.981, 0.995, 0.992] }
  };
  function mean(a) { var s = 0; a.forEach(function (x) { s += x; }); return s / a.length; }

  // ─── 官方代码（LeCAR-Lab/HDMI）里论文没写的数 ───────────────────────────────────────
  /* 交互奖励 eef_contact_exp：pos_sigma 0.3 m、frc_sigma 40 N、frc_thres 10 N、gain 5；不该接触的末端给 1 */
  var CONTACT = { sigPos: 0.3, sigFrc: 40, fThres: 10, gain: 5 };
  function posTerm(d) { return Math.exp(-Math.max(0, d) / CONTACT.sigPos); }
  function frcTerm(f) { return Math.min(Math.exp((f - CONTACT.fThres) / CONTACT.sigFrc), 1); }
  function contactCode(d, f, c) { return c ? CONTACT.gain * posTerm(d) * frcTerm(f) : 1; }
  /* 策略的观测（学生 actor_adapt 与适应模块看的都是这 615 维）：
     command = 未来 5 帧（第 1, 2, 8, 16, 32 步 = 0.02, 0.04, 0.16, 0.32, 0.64 s）× 16 个关键点 × 3 + 5 × 23 个关节角 + 相位 1 = 356；
     policy = 根部角速度 3 + 重力方向 3 + 关节角历史（第 0, 1, 2, 3, 4, 8 步）6 × 29 + 上 3 步动作 3 × 23 = 249；object = 2 + 2 + 2 × 3 = 10 */
  var FUT_STEPS = [1, 2, 8, 16, 32];
  var OBS = { cmd: 5 * 16 * 3 + 5 * 23 + 1, prop: 3 + 3 + 6 * 29 + 3 * 23, obj: 2 + 2 + 2 * 3 };
  var OBS_ALL = OBS.cmd + OBS.prop + OBS.obj; // 615
  /* 第 10 幕把 615 维展开时用的一帧：仿真回放第 210 帧（参考第 4.70 s，即贴图第 EX_J 帧），世界坐标、单位 mm。
     kp：16 个关键点（骨盆、四个髋、躯干、两膝、两肩、两踝、两肘、两腕，官方 tracking_keypoint_names）在现在与未来第 1, 2, 8, 16, 32 步的位置；
     joints：29 个关节所在连杆的原点（腰 3，再左右各 13：髋 3、膝、踝 2、肩 3、肘、腕 3），wrist 标出手腕的 6 个；
     xy / head / cb：按官方 object_xy_b、object_heading_b、ref_contact_pos_b 的写法算出的这一帧物体观测（机器人坐标系、只取水平朝向，不加噪声，我们算的） */
  var OBS10 = {
    kp: [[[-515,-951,783],[-492,-904,674],[-523,-1028,689],[-435,-907,529],[-418,-1113,600],[-523,-945,826],[-469,-931,340],[-354,-1145,420],[-517,-855,1078],[-520,-1055,1069],[-554,-953,35],[-493,-1146,137],[-458,-849,904],[-440,-1114,898],[-279,-806,912],[-270,-1156,956]],[[-501,-954,784],[-479,-906,675],[-505,-1031,690],[-428,-907,528],[-393,-1110,605],[-509,-948,827],[-468,-928,339],[-322,-1138,427],[-505,-856,1078],[-506,-1056,1071],[-554,-953,35],[-449,-1145,138],[-447,-850,903],[-428,-1114,899],[-268,-806,911],[-258,-1155,957]],[[-486,-957,784],[-466,-909,675],[-487,-1035,691],[-421,-907,526],[-370,-1107,608],[-494,-951,827],[-466,-927,339],[-294,-1130,432],[-492,-857,1077],[-491,-1057,1072],[-554,-953,35],[-407,-1143,137],[-436,-851,903],[-416,-1114,900],[-257,-805,909],[-245,-1155,955]],[[-391,-971,775],[-385,-918,666],[-376,-1045,681],[-370,-910,513],[-252,-1078,592],[-400,-966,818],[-436,-927,331],[-181,-1074,411],[-401,-872,1068],[-386,-1072,1063],[-552,-951,37],[-190,-1102,97],[-361,-863,889],[-330,-1119,882],[-186,-803,884],[-152,-1153,917]],[[-258,-970,758],[-253,-911,652],[-222,-1036,662],[-228,-891,501],[-119,-1056,544],[-271,-970,800],[-282,-939,321],[-96,-1051,352],[-285,-906,1059],[-224,-1095,1032],[-510,-998,108],[-114,-1066,35],[-274,-871,879],[-188,-1110,842],[-122,-770,853],[-4,-1103,846]],[[-101,-922,766],[-120,-858,666],[-61,-972,663],[-31,-742,586],[17,-995,519],[-108,-928,810],[48,-696,415],[-7,-1012,328],[-153,-894,1071],[-15,-1035,1036],[-55,-788,130],[-114,-1066,35],[-161,-830,895],[2,-1015,848],[-55,-679,882],[174,-949,847]]],
    joints: [[-515,-951,783],[-523,-945,826],[-523,-945,826],[-492,-904,674],[-478,-858,638],[-435,-907,529],[-469,-931,340],[-552,-950,52],[-554,-953,35],[-517,-855,1078],[-513,-815,1077],[-490,-833,978],[-458,-849,904],[-360,-826,903],[-324,-817,907],[-279,-806,912],[-523,-1028,689],[-519,-1085,671],[-418,-1113,600],[-354,-1145,420],[-493,-1144,154],[-493,-1146,137],[-520,-1055,1069],[-516,-1095,1066],[-481,-1107,969],[-440,-1114,898],[-347,-1138,927],[-313,-1146,942],[-270,-1156,956]],
    wrist: [0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1],
    pel: [-515,-951,783], yaw: -0.2336, box: [-39,-1034,724], boxYaw: 0.0143,
    xy: [0.483,0.03], head: [0.969,0.245], cb: [[0.277,0.212,0.112],[0.343,-0.134,0.182]],
    /* 箱子碰撞盒八个角投到机器人坐标系水平面上的凸包（这一帧箱子往机器人那边倾了约 20°，接触点在侧面的高处，所以不画成平放的矩形） */
    hull: [[0.142,0.179],[0.197,-0.11],[0.325,-0.161],[0.511,-0.114],[0.455,0.175],[0.328,0.226]]
  };
  /* 默认站姿与动作缩放（hdmi-base.yaml 的 action_scaling；关节目标 = 默认 + 缩放 × 动作，手腕不在动作里，共 23 个动作） */
  var DEFAULT_KNEE = 0.669, KNEE_SCALE = 0.35;
  /* 第 3.20 s（贴图第 45 帧）跪得最低的那一帧：左膝参考 2.731 rad；23 个动作里 8 个离默认站姿超过 1 个动作单位 */
  var KNEEL = { j: 45, t: 3.20, knee: 2.731, over1: 8, meanU: 1.37 };
  var KNEEL_U = (KNEEL.knee - DEFAULT_KNEE) / KNEE_SCALE; // 5.89
  /* 官方的 13 个任务配置（cfg/task/G1/hdmi/）：物体、谁去接触、数据有多长 */
  var TASK_CFG = [
    ['move_suitcase', '搬行李箱', '箱子', '双手', 472], ['carry_box_over_shoulder', '箱子扛上肩', '箱子', '双手', 590],
    ['carry_and_place_bread_box', '搬面包箱', '面包箱', '双手', 840], ['move_foam', '搬泡沫垫', '泡沫垫', '双手', 680],
    ['move_stool-climb', '搬凳子再踩上去', '凳子', '双手', 833], ['push_box', '推大箱子', '大箱子', '双手（L 形末端）', 792],
    ['roll_ball-hand', '推球滚动', '大球', '双手', 602], ['topple_wood_board_and_cross', '推倒木板走过去', '木板', '双手', 582],
    ['open_foldchair-sit', '打开折叠椅坐下', '折叠椅（铰接）', '双手', 585], ['push_door-hand', '用手推门', '门（铰接）', '右手', 573],
    ['open_door-feet', '用脚开门', '门（铰接）', '左脚', 928], ['traverse_door', '开门穿门（真机）', '门（铰接）', '右手 + 左脚', 1463],
    ['truman', '楚门式鞠躬', '台阶', '双手', 3352]
  ];

  // ─── 官方动作数据：搬行李箱的参考（OMOMO）与录下来的仿真回放 ─────────────────────────────
  /* 参考：data/motion/g1/omomo/sub1_suitcase_011（472 帧、50 帧/秒）；回放：record_motion/x65r1823（447 帧 = 472 − 25，
     接触标签和参考去掉前 25 帧逐帧相同，我们推断是论文图 7b 那种「用成功策略回放录下来的参考」）。
     两段都从参考的第 25 帧对齐，每 3 帧取一帧，共 149 帧（约 16.7 帧/秒）。每帧 37 个 int16（mm）：
     参考的左手、右手末端点、左右两个目标接触点、骨盆、箱子中心（6 × 3），回放同样 18 个，最后是这一帧的接触信号 */
  var SUIT = { n: 149, per: 37, data: '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' };
  var SUIT_T0 = 25, SUIT_STEP = 3, SUIT_FPS = 50;
  function suitTime(j) { return (SUIT_T0 + SUIT_STEP * j) / SUIT_FPS; } // 参考里的秒
  function decode(b64) {
    var bin = atob(b64), n = bin.length >> 1, out = new Int16Array(n);
    for (var i = 0; i < n; i++) {
      var v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
      out[i] = v > 32767 ? v - 65536 : v;
    }
    return out;
  }
  var CACHE = {};
  function suitFrames() {
    if (CACHE.suit) return CACHE.suit;
    var a = decode(SUIT.data), out = [];
    function pt(o) { return [a[o] / 1000, a[o + 1] / 1000, a[o + 2] / 1000]; }
    function side(o) { return { eef: [pt(o), pt(o + 3)], tgt: [pt(o + 6), pt(o + 9)], pel: pt(o + 12), cen: pt(o + 15) }; }
    for (var j = 0; j < SUIT.n; j++) {
      var o = j * SUIT.per;
      out.push({ j: j, t: suitTime(j), ref: side(o), rob: side(o + 18), c: a[o + 36] });
    }
    CACHE.suit = out;
    return out;
  }
  function dist3(p, q) { var dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2]; return Math.sqrt(dx * dx + dy * dy + dz * dz); }
  function handDist(f, who) { var s = f[who]; return [dist3(s.eef[0], s.tgt[0]), dist3(s.eef[1], s.tgt[1])]; }
  /* 要接触的那几帧（参考第 3.44–6.74 s，56 帧）里双手离接触点的平均距离 */
  function contactStats(who) {
    var F = suitFrames(), sum = [0, 0], n = 0;
    F.forEach(function (f) { if (!f.c) return; var d = handDist(f, who); sum[0] += d[0]; sum[1] += d[1]; n += 1; });
    return { n: n, mean: [sum[0] / n, sum[1] / n] };
  }
  var CONTACT_J = [49, 104]; // 第一帧、最后一帧要接触的贴图帧（参考第 3.44 s、6.74 s）
  var EX_J = 70;             // 「🚶 具体实例」用的那一帧：参考第 4.70 s，箱子抱在身前

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
  /* 视频里分镜按 1080 宽、约 1.2 倍放大，9–10.5 号字只有 11–12 px，手机上看不清（FALCON 的看片反馈）：9–9.5 号放到 11，10–10.5 号放到 11.5 */
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
    C_SURFACE2 = X.surface2;
  /* 全片配色：期望接触点黄（论文图 3 的黄点）、机器人的手紫、两者的距离红；
     三种训练照论文图 6–9 的配色：完整方法蓝、去掉一项红、两项都去掉绿 */
  var C_TGT = C_WARN, C_EEF = C_PURPLE, C_ERR = C_BAD;
  var V_COLOR = [C_ACCENT, C_BAD, C_GOOD];

  /* 视频里一幕要讲一分钟左右，画面不能停：draw(t, clock) 的 clock 是这一幕的真实时间
     （旁白比分镜长时 t 停在一段的末尾，clock 照走），G1 的动作按 clock 播；网页播放器只传 t。
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
    /* 带公式的标注交给 KaTeX（svgRich）；纯文字仍是 svgText，textContent 可以改 */
    if (String(str).indexOf('$') >= 0) return rich(parent, x, y, str, size || 11, cls || 'demo-x-ink2', anchor || 'start');
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
  var FIGS = {
    fig1: ['fig1_teaser.webp', 1400, 1057],
    fig2: ['fig2_pipeline.webp', 1500, 1029],
    fig3: ['fig3_contact.webp', 1500, 457],
    fig4: ['fig4_real.webp', 1600, 509],
    fig5: ['fig5_truman.webp', 1600, 230],
    fig7b: ['fig7b_suitcase.webp', 1200, 798],
    fig7c: ['fig7c_pushbox.webp', 1200, 473],
    fig9b: ['fig9b_kneel.webp', 1100, 700],
    fig9c: ['fig9c_popup.webp', 1100, 758]
  };
  function paperPart(parent, key, u0, v0, u1, v1, x, y, w, caption) {
    var F = FIGS[key];
    return figPart(parent, F[0], F[1], F[2], u0, v0, u1, v1, x, y, w, caption);
  }
  /* 在论文图上框出一块（u、v 是图内的比例坐标）：返回框，draw 里调 setOpacity */
  function figBox(parent, fp, u0, v0, u1, v1, color) {
    var r = rectBox(parent, fp.x + u0 * fp.w, fp.y + v0 * fp.h, (u1 - u0) * fp.w, (v1 - v0) * fp.h, color || C_BAD, 'none');
    r.style.fill = 'none'; r.setAttribute('stroke-width', 3);
    return r;
  }
  /* 项目页的一段视频：深色底框，下面一行小字写出处；draw 里调 .at(秒, 是否可见) */
  function projClip(parent, id, x, y, w, h, caption, opts) {
    var o = opts || {}, g = group(parent);
    g.appendChild(svgEl('rect', { x: (x - 2).toFixed(1), y: (y - 2).toFixed(1), width: (w + 4).toFixed(1), height: (h + 4).toFixed(1), rx: 5, fill: '#111111', stroke: 'none' }));
    var c = K.svgClip(x, y, w, h, CLIP_BASE + id + '.mp4', { poster: CLIP_BASE + id + '.webp', loop: o.loop });
    g.appendChild(c);
    if (caption) label(g, o.capX == null ? x + w / 2 : o.capX, y + h + (o.capDy || 15), caption, o.capCls || 'demo-x-mut', o.capSize || 9.5, o.capAnchor || 'middle');
    return { g: g, x: x, y: y, w: w, h: h, at: function (sec, vis) { c.at(sec, vis); } };
  }
  /* 三维 → 画布：z 朝上；绕竖轴转 yaw、抬头 pitch 的正交投影（G1 的贴图是同一套相机离线渲染的）。
     贴图的锚点是世界坐标里的 A0（箱子和机器人之间的一个地面点），put(cam) 把 A0 摆到 (ox, oy) */
  var CAM_YAW = 0.9, CAM_PITCH = 0.18, A0 = [-0.15, -0.85, 0];
  function project(p, cam) {
    var c = Math.cos(CAM_YAW), s = Math.sin(CAM_YAW), x = p[0] - A0[0], y = p[1] - A0[1], z = p[2] - A0[2];
    var xr = x * c + y * s, depth = -x * s + y * c;
    var cp = Math.cos(CAM_PITCH), sp = Math.sin(CAM_PITCH);
    return [cam.ox + cam.s * xr, cam.oy - cam.s * (z * cp + depth * sp), depth];
  }
  function camAt(s, ox, oy) { return { s: s, ox: ox, oy: oy }; }
  /* 每张贴图 149 帧（参考第 0.50–9.38 s，每 3 帧取一帧），yaw 0.9、pitch 0.18、每米 170 px；g1_dflt 是第 3.20 s 那一帧的根部位置上摆出的默认站姿 */
  var SHEETS = {
    ref: { file: 'g1_suit_ref.webp', R: 170, yaw: 0.9, pitch: 0.18, cw: 387, ch: 261, cols: 12, n: 149, ax: 208, ay: 245 },
    rob: { file: 'g1_suit_rob.webp', R: 170, yaw: 0.9, pitch: 0.18, cw: 387, ch: 261, cols: 12, n: 149, ax: 208, ay: 245 },
    dflt: { file: 'g1_dflt.webp', R: 170, yaw: 0.9, pitch: 0.18, cw: 387, ch: 261, cols: 1, n: 1, ax: 208, ay: 245 }
  };
  /* 一台 G1（连同箱子）：贴图表里的一格；put(cam, 帧号) 让锚点 A0 落在 (ox, oy)。贴图第一次用到才设 href。
     opts.crop = [x0, y0, x1, y1]（格子里的像素）只显示这一块，小格子里放机器人时用，免得透明的空白也算进分镜的外框 */
  function g1Mesh(parent, key, opts) {
    var o = opts || {}, M = SHEETS[key], g = group(parent), rows = Math.ceil(M.n / M.cols), C = o.crop || [0, 0, M.cw, M.ch];
    g.setAttribute('class', 'demo-x-g1mesh');
    var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: 0, height: 0 });
    var img = svgEl('image', { x: 0, y: 0, width: M.cw * M.cols, height: M.ch * rows, preserveAspectRatio: 'none' });
    box.appendChild(img);
    g.appendChild(box);
    if (o.ghost) g.style.opacity = o.ghost;
    var woke = false, lastF = -1;
    return {
      g: g,
      put: function (cam, fr) {
        if (!woke && G1_3D_BASE) { woke = true; img.setAttribute('href', G1_3D_BASE + M.file); }
        var k = cam.s / M.R;
        var f = clamp(Math.round(fr || 0), 0, M.n - 1);
        box.setAttribute('x', (cam.ox - (M.ax - C[0]) * k).toFixed(1));
        box.setAttribute('y', (cam.oy - (M.ay - C[1]) * k).toFixed(1));
        box.setAttribute('width', ((C[2] - C[0]) * k).toFixed(1));
        box.setAttribute('height', ((C[3] - C[1]) * k).toFixed(1));
        if (f !== lastF) {
          box.setAttribute('viewBox', [(f % M.cols) * M.cw + C[0], Math.floor(f / M.cols) * M.ch + C[1], C[2] - C[0], C[3] - C[1]].join(' '));
          lastF = f;
        }
      }
    };
  }
  /* 帧号：按真实时间来回播放（16.7 帧/秒，正放到头再倒放），不从最后一帧跳回第一帧（TWIST2 的看片反馈）；[a, b) 是播放的帧区间 */
  function loopFrame(now, a, b) {
    var lo = a || 0, hi = b == null ? SUIT.n : b, n = hi - lo, period = 2 * (n - 1);
    var k = ((Math.floor(now * SUIT_FPS / SUIT_STEP) % period) + period) % period;
    return lo + (k < n ? k : period - k);
  }
  /* 期望接触点（黄）、手的末端点（紫）和两者的距离（红线）；put(帧, 'ref'|'rob', cam, 显示) */
  function contactOverlay(parent, opts) {
    var o = opts || {}, g = group(parent), lines = [], tg = [], ef = [];
    for (var i = 0; i < 2; i++) {
      lines.push(hline(g, 0, 0, 0, 0, C_ERR, o.lw || 2, '3 2'));
      tg.push(dotAt(g, 0, 0, o.r || 5.5, C_TGT));
      ef.push(dotAt(g, 0, 0, (o.r || 5.5) - 1.5, C_EEF));
    }
    tg.forEach(function (c) { c.style.stroke = '#ffffff'; c.style.strokeWidth = '1.2px'; });
    return {
      g: g,
      put: function (f, who, cam, show) {
        var s = f[who];
        for (var i = 0; i < 2; i++) {
          var a = project(s.tgt[i], cam), b = project(s.eef[i], cam);
          moveDot(tg[i], a); moveDot(ef[i], b); setLine(lines[i], a[0], a[1], b[0], b[1]);
          tg[i].style.opacity = show && show.tgt === false ? 0 : 1;
          ef[i].style.opacity = show && show.eef === false ? 0 : 1;
          lines[i].style.opacity = show && show.err === false ? 0 : (f.c ? 1 : 0.25);
        }
      }
    };
  }
  /* 接触信号的时间条：149 帧，要接触的那段涂黄；playhead(j) 移动竖线 */
  function contactBar(parent, x, y, w, h) {
    var g = group(parent), F = suitFrames(), dx = w / F.length;
    rectBox(g, x, y, w, h, C_BORDER, C_SURFACE2);
    var a = -1;
    F.forEach(function (f, j) {
      if (f.c && a < 0) a = j;
      if ((!f.c || j === F.length - 1) && a >= 0) {
        var b = f.c ? j + 1 : j;
        g.appendChild(paint(svgEl('rect', { x: (x + a * dx).toFixed(1), y: y + 1, width: ((b - a) * dx).toFixed(1), height: h - 2, rx: 2 }), C_TGT));
        a = -1;
      }
    });
    var ph = hline(g, x, y - 4, x, y + h + 4, 'var(--text)', 2);
    return { g: g, at: function (j) { var px = x + (j + 0.5) * dx; setLine(ph, px, y - 4, px, y + h + 4); } };
  }
  /* 分组柱状图（图 6、图 8）：cats 个组、每组 3 根；set(值, 最大值) 让柱子长到 u ∈ [0, 1] */
  function groupedBars(parent, x, y, w, h, cats, opts) {
    var o = opts || {}, g = group(parent), n = cats.length, gw = w / n, bw = Math.min(o.bw || 14, (gw - 10) / 3);
    hline(g, x, y + h, x + w, y + h, C_BORDER, 1.4);
    var bars = [], labs = [], vals = [];
    cats.forEach(function (c, i) {
      var cx = x + i * gw + gw / 2;
      labs.push(label(g, cx, y + h + 15, c, 'demo-x-ink2', o.catSize || 10, 'middle'));
      for (var k = 0; k < 3; k++) {
        var b = vbar(g, cx - 1.5 * bw + k * bw, bw - 2, V_COLOR[k]);
        bars.push(b);
        vals.push(o.values ? label(g, cx - 1.5 * bw + k * bw + (bw - 2) / 2, y + h - 4, '', 'demo-x-ink', o.valSize || 8.5, 'middle') : null);
      }
    });
    return {
      g: g, labs: labs,
      set: function (data, vmax, u, fmtV) {
        cats.forEach(function (c, i) {
          for (var k = 0; k < 3; k++) {
            var v = data[i][k], hh = h * clamp(v / vmax, 0, 1) * clamp(u == null ? 1 : u, 0, 1), b = bars[i * 3 + k];
            b.set(y + h, hh);
            var t = vals[i * 3 + k];
            if (t) { t.textContent = fmtV ? fmtV(v) : String(v); t.setAttribute('y', (y + h - hh - 3).toFixed(1)); halo(t); }
          }
        });
      },
      dim: function (i, op) { for (var k = 0; k < 3; k++) bars[i * 3 + k].node.style.opacity = op; labs[i].style.opacity = Math.max(op, 0.4); }
    };
  }
  /* 训练曲线：横轴第 100–1100 步，纵轴 [y0, y1]；line(数组, 颜色, 画到第几个点) */
  function stepPlot(parent, x, y, w, h, y0, y1, ticksY) {
    var g = group(parent);
    rectBox(g, x, y, w, h, C_BORDER, C_SURFACE);
    function px(i) { return x + 8 + i / 10 * (w - 16); }
    function py(v) { return y + h - 6 - (v - y0) / (y1 - y0) * (h - 12); }
    (ticksY || []).forEach(function (v) {
      hline(g, x, py(v), x + w, py(v), C_BORDER, 0.8, '2 3');
      label(g, x - 4, py(v) + 3.5, String(v), 'demo-x-mut', 8.5, 'end');
    });
    [0, 5, 10].forEach(function (i) { label(g, px(i), y + h + 18, String(100 + i * 100), 'demo-x-mut', 8.5, 'middle'); });
    return {
      g: g, px: px, py: py,
      line: function (arr, color, width) { return pathLine(g, arr.map(function (v, i) { return [px(i), py(v)]; }), color, width || 2.2); },
      upto: function (p, arr, u) {
        var k = clamp(u, 0, 1) * (arr.length - 1), pts = [];
        for (var i = 0; i <= Math.floor(k); i++) pts.push([px(i), py(arr[i])]);
        if (k < arr.length - 1) { var i0 = Math.floor(k), fr = k - i0; pts.push([px(k), py(arr[i0] + (arr[i0 + 1] - arr[i0]) * fr)]); }
        setPath(p, pts);
      }
    };
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
  /* 一扇门：门框 + 绕左边铰链转开的门板（u ∈ [0, 1] 是开了多少） */
  function doorIcon(parent, x, y, w, h, color) {
    var g = group(parent);
    rectBox(g, x - 3, y - 3, w + 6, h + 6, C_BORDER, C_SURFACE2);
    var panel = paint(svgEl('polygon', { points: '0,0', 'stroke-width': 1.4 }), C_SURFACE, color || C_ACCENT);
    g.appendChild(panel);
    var knob = dotAt(g, 0, 0, 2.6, color || C_ACCENT);
    return {
      g: g,
      at: function (u) {
        var k = Math.cos(clamp(u, 0, 1) * 1.2), sk = Math.sin(clamp(u, 0, 1) * 1.2) * 10;
        var xr = x + w * k;
        panel.setAttribute('points', [x, y, xr, y - sk, xr, y + h + sk, x, y + h].join(','));
        moveDot(knob, [x + (w - 8) * k, y + h * 0.55]);
      }
    };
  }
  /* 一个纸箱的示意（正面 + 顶面），返回 g */
  function boxIcon(parent, x, y, w, h) {
    var g = group(parent);
    g.appendChild(paint(svgEl('polygon', { points: [x, y, x + 10, y - 8, x + w + 10, y - 8, x + w, y].join(','), 'stroke-width': 1.2 }), '#d9b282', '#8a6238'));
    g.appendChild(paint(svgEl('rect', { x: x, y: y, width: w, height: h, 'stroke-width': 1.2 }), '#c4925a', '#8a6238'));
    return g;
  }

  /* ── scene 1: 和物体打交道，只跟身体不够 ── */
  function buildSceneIntro() {
    var s = sceneSvg('左边是项目页的视频：宇树 G1 用手推开门、走过去；右边依次出现：动作跟踪只跟机器人自己的身体，门开没开、箱子动没动才是任务；' +
      '数据少（自由空间的动作很多、带物体的三维数据很少）；强化学习难训（参考不完美时手碰不到箱子、跪着弯腰要保持平衡）；以前的做法；HDMI 的通用框架');
    s.appendChild(svgText(24, 26, '和物体打交道：只跟身体不够', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'door_front', 24, 44, 380, 214, '项目页视频：用手推开门，走过去');
    label(s, 24, 300, '宇树 G1 · 动作捕捉给出机器人和门的位姿', 'demo-x-ink2', 11.5);
    label(s, 24, 320, '卡内基梅隆大学 · arXiv 2025 年 9 月', 'demo-x-mut', 11);
    var R = 424, W = 352;
    /* 第 1 段：动作跟踪只跟身体；门和箱子才是任务 */
    var p1 = group(s);
    label(p1, R, 64, '动作跟踪：跟的是机器人自己的身体', 'demo-x-ink', 14);
    ['DeepMimic', 'BeyondMimic', 'TWIST'].forEach(function (n, i) { chip(p1, R + i * 120, 80, 110, n, C_ACCENT, { size: 12, h: 30 }); });
    rectBox(p1, R, 128, 160, 120, C_BORDER, C_SURFACE);
    label(p1, R + 80, 150, '身体跟准了', 'demo-x-ink2', 12, 'middle');
    tick(p1, R + 64, 170, 34, C_GOOD);
    rectBox(p1, R + 176, 128, 176, 120, C_BAD, C_SURFACE);
    label(p1, R + 264, 150, '门开没开？箱子动没动？', 'demo-x-ink2', 11.5, 'middle');
    var door1 = doorIcon(p1, R + 200, 166, 44, 64, C_ACCENT);
    var box1 = boxIcon(p1, R + 286, 206, 40, 30);
    label(p1, R + W / 2, 272, '这些才是开门、搬箱子要的结果', 'demo-x-mut', 11, 'middle');
    /* 第 2 段：难点一，数据少——点阵示意 */
    var p2 = group(s);
    label(p2, R, 64, '难点一：数据少', 'demo-x-ink', 14);
    rectBox(p2, R, 80, 168, 170, C_ACCENT, C_SURFACE);
    rectBox(p2, R + 184, 80, 168, 170, C_TGT, C_SURFACE);
    label(p2, R + 84, 100, '自由空间的动作', 'demo-x-ink2', 11.5, 'middle');
    label(p2, R + 268, 100, '人 + 物体的三维运动', 'demo-x-ink2', 11.5, 'middle');
    var dotsA = [], dotsB = [];
    for (var i = 0; i < 70; i++) dotsA.push(dotAt(p2, R + 18 + (i % 10) * 14.6, 118 + Math.floor(i / 10) * 17, 4.2, C_ACCENT));
    for (i = 0; i < 6; i++) dotsB.push(dotAt(p2, R + 220 + (i % 3) * 32, 140 + Math.floor(i / 3) * 34, 6, C_TGT));
    label(p2, R + 84, 268, '走、跑、跳：大量动捕', 'demo-x-mut', 10.5, 'middle');
    label(p2, R + 268, 268, '同时带物体：稀缺', 'demo-x-mut', 10.5, 'middle');
    label(p2, R + W / 2, 292, '点数只是示意，论文没给具体数量', 'demo-x-mut', 10, 'middle');
    /* 第 3 段：难点二，强化学习难训 */
    var p3 = group(s);
    label(p3, R, 64, '难点二：强化学习难训', 'demo-x-ink', 14);
    rectBox(p3, R, 80, 168, 190, C_BORDER, C_SURFACE);
    rectBox(p3, R + 184, 80, 168, 190, C_BORDER, C_SURFACE);
    label(p3, R + 84, 100, '参考不完美', 'demo-x-ink2', 12, 'middle');
    label(p3, R + 268, 100, '难的姿势要平衡', 'demo-x-ink2', 12, 'middle');
    boxIcon(p3, R + 60, 170, 50, 60);
    var hand = dotAt(p3, R + 40, 186, 6, C_EEF), tgt3 = dotAt(p3, R + 60, 196, 6, C_TGT), gap = hline(p3, 0, 0, 0, 0, C_ERR, 2, '3 2');
    label(p3, R + 84, 260, '手没真正碰到箱子', 'demo-x-mut', 10.5, 'middle');
    /* 跪着搬箱子的 G1（官方仓库录下的仿真回放第 40–50 帧，参考第 2.9–3.5 s），原先是火柴人 */
    var kneel = g1Mesh(p3, 'rob', { crop: [4, 96, 178, 245] }), camK = camAt(144.5, R + 367.4, 238.7);
    label(p3, R + 268, 260, '跪着、弯着腰', 'demo-x-mut', 10.5, 'middle');
    /* 第 4 段：以前的做法 */
    var p4 = group(s);
    label(p4, R, 64, '以前的人形与物体交互', 'demo-x-ink', 14);
    label(p4, R, 88, '① 每个任务单独做参考、设计奖励', 'demo-x-ink2', 12);
    /* 三张任务卡：开门、搬箱子、推箱子；每张卡轮流蹦出自己的「参考」「奖励」 */
    var cards4 = ['开门', '搬箱子', '推箱子'].map(function (n, i) {
      var g = group(p4), x = R + i * 120;
      var frame = rectBox(g, x, 98, 110, 112, C_BORDER, C_SURFACE);
      label(g, x + 55, 166, n, 'demo-x-ink2', 12, 'middle');
      var parts = [chip(g, x + 6, 176, 46, '参考', C_TGT, { size: 11, h: 24 }), chip(g, x + 58, 176, 46, '奖励', C_WARN, { size: 11, h: 24 })];
      return { g: g, x: x, frame: frame, parts: parts };
    });
    var door4 = doorIcon(p4, R + 42, 108, 26, 36, C_ACCENT);
    boxIcon(p4, R + 160, 122, 30, 28);
    boxIcon(p4, R + 266, 122, 52, 22);
    label(p4, R + 162, 266, '② 或者靠高层规划器指挥', 'demo-x-ink2', 12);
    chip(p4, R, 252, 150, '视觉语言模型 / 规划器', C_PURPLE, { size: 11.5, h: 30 });
    var f4 = [0, 1, 2].map(function () { return flowSeg(p4, C_PURPLE, 2, 2.8, 26, false); });
    var xA = cross(p4, R + W - 14, 82, 14, C_BAD), xB = cross(p4, R + W - 14, 255, 14, C_BAD);
    label(p4, R + 162, 290, '换一个任务，就要重新设计一遍', 'demo-x-mut', 11.5);
    /* 第 5 段：HDMI 的通用框架 */
    var p5 = group(s);
    label(p5, R, 64, 'HDMI：换任务只换视频', 'demo-x-ink', 14);
    label(p5, R, 84, 'HumanoiD iMitation for Interaction', 'demo-x-mut', 11);
    var row5 = [['视频', 56, C_ACCENT], ['参考', 56, C_TGT], ['共同跟踪', 92, C_GOOD], ['G1', 50, C_ACCENT]], rx5 = [], x0 = R;
    row5.forEach(function (c) { chip(p5, x0, 104, c[1], c[0], c[2], { size: 12, h: 32 }); rx5.push([x0, x0 + c[1]]); x0 += c[1] + 24; });
    var f5 = [0, 1, 2].map(function () { return flowSeg(p5, C_GOOD, 2, 3, 30, true); });
    var badges = [['手、脚都能接触', C_EEF], ['铰接的门、折叠椅', C_ACCENT], ['刚体的箱子、球', C_TGT], ['固定的、能移动的', C_GOOD]];
    var bg5 = badges.map(function (b, i) { var g = group(p5); chip(g, R + (i % 2) * 180, 160 + Math.floor(i / 2) * 44, 172, b[0], b[1], { size: 12, h: 32 }); return g; });
    function draw(t, clock) {
      var now = nowOf(t, clock);
      clip.at(K.clipSince(t, 0), true);
      door1.at(0.5 + 0.5 * Math.sin(now * 1.6));
      box1.setAttribute('transform', 'translate(0 ' + (-8 * Math.max(0, Math.sin(now * 1.6 + 1))).toFixed(1) + ')');
      var u2 = seg(since(t, clock, 3.6), 0.2, 2.0);
      dotsA.forEach(function (d, i) { d.style.opacity = clamp(u2 * 70 - i, 0, 1); });
      dotsB.forEach(function (d, i) { d.style.opacity = clamp(u2 * 6 - i, 0, 1); });
      var hx = R + 40 + 8 * Math.sin(now * 2.2);
      moveDot(hand, [hx, 186]); setLine(gap, hx, 186, R + 60, 196);
      void tgt3;
      kneel.put(camK, loopFrame(now, 40, 51));
      xA.style.opacity = seg(t, 11.0, 11.4); xB.style.opacity = seg(t, 11.8, 12.2);
      var u4 = since(t, clock, 10.4), hot = Math.floor(now / 1.2) % 3;
      cards4.forEach(function (c, i) {
        c.parts.forEach(function (pg, q) { setOpacity(pg, seg(u4, 0.6 + i * 0.7 + q * 0.3, 0.9 + i * 0.7 + q * 0.3)); });
        c.frame.style.stroke = u4 > 2.8 && i === hot ? C_WARN : C_BORDER;
      });
      door4.at(0.5 + 0.5 * Math.sin(now * 1.6));
      f4.forEach(function (f, i) { f.at(now + i * 0.25, [R + 75, 250], [R + 55 + i * 120, 212], u4 > 2.6); });
      f5.forEach(function (f, i) { f.at(now + i * 0.3, [rx5[i][1] + 2, 120], [rx5[i + 1][0] - 2, 120], true); });
      bg5.forEach(function (g, i) { setOpacity(g, seg(t, 14.0 + i * 0.4, 14.4 + i * 0.4)); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 三段流水线（图 2） ── */
  function buildScenePipeline() {
    var s = sceneSvg('左边是论文图 2，讲到哪一段就框出哪一段：视频变成动作、训练（观测与残差动作、三块奖励）、部署；右边依次出现三段的流程和各段的要点');
    s.appendChild(svgText(24, 26, '三段流水线：视频 → 动作 → 训练 → 部署', 'demo-x-ink2', 13.5));
    var fig = paperPart(s, 'fig2', 0, 0, 1, 1, 24, 44, 440, '论文图 2：HDMI 的流程');
    var boxes = [
      figBox(s, fig, 0, 0, 0.357, 1),          // 视频 → 动作
      figBox(s, fig, 0.37, 0.08, 0.805, 0.53),  // 观测 + 策略 + 残差动作
      figBox(s, fig, 0.37, 0.555, 0.805, 0.99), // 奖励
      figBox(s, fig, 0.815, 0, 1, 1)            // 部署
    ];
    var R = 484, W = 292;
    var p1 = group(s);
    label(p1, R, 64, '论文图 2：三栏', 'demo-x-ink', 13.5);
    var chain1 = [['黄：视频 → 动作', C_TGT], ['灰：训练', C_MUTED], ['蓝：部署到真机', C_ACCENT]];
    chain1.forEach(function (c, i) { chip(p1, R, 84 + i * 52, W, c[0], c[1], { size: 12.5, h: 32 }); });
    var fl1 = [0, 1].map(function () { return flowSeg(p1, C_MUTED, 2, 3, 22, true); });
    var p2 = group(s);
    label(p2, R, 64, '① 视频 → 参考', 'demo-x-ink', 13.5);
    var chain2 = [['单目 RGB 视频', C_ACCENT], ['人的动作 → 换到 G1', C_TGT], ['标出物体轨迹和接触', C_TGT], ['结构化的参考数据', C_GOOD]];
    chain2.forEach(function (c, i) { chip(p2, R, 84 + i * 46, W, c[0], c[1], { size: 12, h: 30 }); });
    var fl2 = [0, 1, 2].map(function () { return flowSeg(p2, C_MUTED, 2, 3, 22, true); });
    var p3 = group(s);
    label(p3, R, 64, '② 训练：观测与动作', 'demo-x-ink', 13.5);
    ['相位 $\\phi$', '本体感受', '物体'].forEach(function (n, i) { chip(p3, R + i * 100, 84, 92, n, C_TGT, { size: 12, h: 30 }); });
    /* 相加要画出来：策略输出的动作 a_t 和参考关节角两路一起汇进加号，加出来的才是关节目标（2026-10-26 看片反馈：参考关节角没连到加号） */
    var PX3 = R + 146, PY3 = 216;
    chip(p3, R, 140, 130, 'HDMI 策略', C_ACCENT, { size: 12.5, h: 32 });
    chip(p3, R + 162, 140, 130, '参考关节角', C_MUTED, { size: 12, h: 32 });
    hline(p3, R + 65, 172, PX3 - 10, PY3 - 9, C_ACCENT, 1.4, '3 4');
    hline(p3, R + 227, 172, PX3 + 10, PY3 - 9, C_MUTED, 1.4, '3 4');
    rich(p3, R + 30, 206, '动作 $a_t$', 12, 'demo-x-ink2', 'start');
    rich(p3, R + 196, 206, '$\\theta_t^{\\mathrm{ref}}$', 12.5, 'demo-x-ink2', 'start');
    var plus = group(p3), plusRing = ringAt(plus, PX3, PY3, 13, C_ACCENT, 2);
    label(plus, PX3, PY3 + 5, '+', 'demo-x-ink', 17, 'middle');
    hline(p3, PX3, PY3 + 13, PX3, 244, C_GOOD, 1.4, '3 4');
    chip(p3, R + 61, 246, 170, '关节目标 $\\theta_t^{\\mathrm{target}}$', C_GOOD, { size: 12, h: 30 });
    label(p3, R, 300, '策略的输出加在参考关节角上：残差动作', 'demo-x-mut', 10.5);
    /* 三路观测都要连到策略（2026-10-26 看片反馈：原先只有相位连过去） */
    var OBS3 = [0, 1, 2].map(function (i) { return [[R + 46 + i * 100, 116], [R + 35 + i * 30, 138]]; });
    OBS3.forEach(function (l) { hline(p3, l[0][0], l[0][1], l[1][0], l[1][1], C_TGT, 1.2, '3 4'); });
    var fl3o = OBS3.map(function () { return flowSeg(p3, C_TGT, 2, 3, 24, true); });
    var fl3 = [C_ACCENT, C_MUTED, C_GOOD].map(function (c) { return flowSeg(p3, c, 2, 3, 24, true); });
    var p4 = group(s);
    label(p4, R, 64, '② 训练：奖励三块', 'demo-x-ink', 13.5);
    [['交互', '引导并保持接触', C_TGT], ['机器人跟踪', '跟上参考的身体动作', C_ACCENT], ['物体跟踪', '物体也走参考的轨迹', C_GOOD]].forEach(function (r, i) {
      chip(p4, R, 84 + i * 56, 104, r[0], r[2], { size: 12.5, h: 34 });
      label(p4, R + 116, 84 + i * 56 + 22, r[1], 'demo-x-ink2', 11.5);
    });
    var p5 = group(s);
    label(p5, R, 64, '③ 部署', 'demo-x-ink', 13.5);
    chip(p5, R, 84, W, '不经微调，直接上宇树 G1', C_ACCENT, { size: 12.5, h: 34 });
    var nums = [['67', '次连续开门穿门'], ['6', '个真机任务'], ['14', '个仿真任务']];
    var numG = nums.map(function (n, i) {
      var g = group(p5);
      tone(g, R + 20 + i * 98, 176, n[0], C_ACCENT, 30, 'start');
      label(g, R + 20 + i * 98, 203, n[1], 'demo-x-mut', 10, 'start');
      return g;
    });
    function draw(t, clock) {
      var now = nowOf(t, clock);
      fl1.forEach(function (f, i) { f.at(now + i * 0.4, [R + W / 2, 84 + i * 52 + 34], [R + W / 2, 84 + (i + 1) * 52 - 2], true); });
      fl2.forEach(function (f, i) { f.at(now + i * 0.4, [R + W / 2, 84 + i * 46 + 32], [R + W / 2, 84 + (i + 1) * 46 - 2], true); });
      fl3o.forEach(function (f, i) { f.at(now + i * 0.2, OBS3[i][0], OBS3[i][1], true); });
      fl3[0].at(now + 0.3, [R + 65, 172], [PX3 - 10, PY3 - 9], true);
      fl3[1].at(now + 0.3, [R + 227, 172], [PX3 + 10, PY3 - 9], true);
      fl3[2].at(now + 0.6, [PX3, PY3 + 13], [PX3, 244], true);
      /* 两路小点到加号的那一下，加号亮一下 */
      var tot3 = Math.hypot(PX3 - 10 - (R + 65), PY3 - 9 - 172), glow3 = 0;
      for (var q3 = 0; q3 < 2; q3++) glow3 = Math.max(glow3, seg(((((now + 0.3) * 24 + q3 * tot3 / 2) % tot3) + tot3) % tot3 / tot3, 0.82, 1));
      plusRing.style.strokeWidth = (2 + 2.4 * glow3).toFixed(2) + 'px';
      var on = [win(t, 3.6, 7.0), win(t, 7.0, 10.4), win(t, 10.4, 13.4), win(t, 13.4)];
      boxes.forEach(function (b, i) { setOpacity(b, on[i]); });
      numG.forEach(function (g, i) { setOpacity(g, seg(t, 14.0 + i * 0.5, 14.4 + i * 0.5)); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 从视频到参考轨迹 ── */
  function buildSceneVideo2Ref() {
    var s = sceneSvg('左边是官方仓库录下的搬行李箱仿真回放，用 G1 的三维模型逐帧渲染：站在箱子旁、跪下抱起箱子、走过去放下；右边依次出现：' +
      '视频经 GVHMR 和 LocoMujoco 变成 G1 的动作；物体轨迹与接触靠人工标注；箱子高度随时间的曲线和拿起、放下两帧；OMOMO 这个例外；这段参考的帧数');
    s.appendChild(svgText(24, 26, '从视频到参考轨迹', 'demo-x-ink2', 13.5));
    var cam = camAt(160, 24 + 208 * 160 / 170, 52 + 245 * 160 / 170);
    /* 左边放官方仓库录下的仿真回放（record_motion，照这段参考跑出来、箱子由仿真算出）：参考里人工标注的箱子拿着时也会上下漂、
       离接触点平均 10–12 cm（第 16 幕讲），放在「参考里有什么」这两幕会被看成渲染出错（2026-10-26 看片反馈） */
    var bot = g1Mesh(s, 'rob');
    label(s, 214, 318, '官方仓库录下的仿真回放（OMOMO 搬行李箱）· G1 三维模型渲染', 'demo-x-mut', 10, 'middle');
    var tLab = label(s, 30, 62, '', 'demo-x-ink2', 11);
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '人的动作 → G1 的动作', 'demo-x-ink', 14);
    var ch1 = [['单目 RGB 视频', '一台普通相机拍的人', C_ACCENT], ['GVHMR', '估计世界坐标里的 SMPL 人体', C_TGT], ['LocoMujoco', '把人的动作重定向到 G1', C_GOOD]];
    ch1.forEach(function (c, i) {
      chip(p1, R, 82 + i * 60, 128, c[0], c[2], { size: 12, h: 32 });
      label(p1, R + 140, 82 + i * 60 + 21, c[1], 'demo-x-ink2', 11);
    });
    var fl1 = [0, 1].map(function () { return flowSeg(p1, C_MUTED, 2, 3, 20, true); });
    var p2 = group(s);
    label(p2, R, 64, '物体那一半：人工标注', 'demo-x-ink', 14);
    /* ① 物体的轨迹：播放头扫过一段视频，在拿起、放下两帧打上标记 */
    label(p2, R, 90, '① 物体的轨迹：标出关键帧', 'demo-x-ink2', 12);
    var film = [];
    for (var q = 0; q < 10; q++) film.push(rectBox(p2, R + q * 35, 100, 31, 30, C_BORDER, C_SURFACE2));
    var keyQ = [3, 7], keyTag = keyQ.map(function (qq, k) { return label(p2, R + qq * 35 + 15.5, 146, k ? '放下' : '拿起', 'demo-x-ink2', 11, 'middle'); });
    var head2 = hline(p2, R, 96, R, 134, C_ACCENT, 2);
    /* ② 期望的接触位置：在箱子两侧点上黄点 */
    label(p2, R, 176, '② 接触位置：点在物体上', 'demo-x-ink2', 12);
    boxIcon(p2, R + 30, 200, 76, 52);
    var cpt2 = [dotAt(p2, R + 34, 222, 6, C_TGT), dotAt(p2, R + 102, 222, 6, C_TGT)];
    cpt2.forEach(function (c) { c.style.stroke = '#ffffff'; c.style.strokeWidth = '1.2px'; });
    var cursor2 = paint(svgEl('path', { d: 'M0 0 L0 14 L4 10 L8 17 L10 16 L6 9 L11 9 Z' }), 'var(--text)', null);
    p2.appendChild(cursor2);
    /* ③ 每段视频一个后处理脚本：代码一行一行长出来 */
    label(p2, R + 176, 176, '③ 每段一个脚本', 'demo-x-ink2', 12);
    rectBox(p2, R + 168, 188, 184, 76, C_BORDER, C_SURFACE2);
    var code2 = [118, 150, 96, 136, 74].map(function (w, k) { return hbar(p2, R + 180 + (k % 2) * 12, 198 + k * 12, 6, k % 2 ? C_MUTED : C_ACCENT); });
    var codeW = [118, 150, 96, 136, 74];
    label(p2, R, 292, '出处：官方仓库的问答（FAQ）', 'demo-x-mut', 10.5);
    /* 第 3 段：箱子中心的高度随时间，标出拿起和放下 */
    var p3 = group(s);
    label(p3, R, 64, '例：行李箱的轨迹', 'demo-x-ink', 14);
    var PX = R + 24, PY = 86, PW = W - 40, PH = 140, F = suitFrames();
    rectBox(p3, PX, PY, PW, PH, C_BORDER, C_SURFACE);
    function hx(j) { return PX + 6 + j / (F.length - 1) * (PW - 12); }
    function hy(z) { return PY + PH - 8 - z / 0.9 * (PH - 16); }
    var hPath = pathLine(p3, F.map(function (f) { return [hx(f.j), hy(f.ref.cen[2])]; }), C_TGT, 2.4);
    void hPath;
    [CONTACT_J[0], CONTACT_J[1]].forEach(function (j, k) {
      hline(p3, hx(j), PY + 4, hx(j), PY + PH - 4, k ? C_GOOD : C_ACCENT, 1.4, '4 3');
      label(p3, hx(j) + (k ? 4 : -4), PY + 16, k ? '放下' : '拿起', 'demo-x-ink2', 10.5, k ? 'start' : 'end');
    });
    var hDot = dotAt(p3, 0, 0, 5, C_TGT);
    label(p3, PX - 4, hy(0) + 3, '0', 'demo-x-mut', 9, 'end');
    label(p3, PX - 4, hy(0.8) + 3, '0.8 m', 'demo-x-mut', 9, 'end');
    readHint(p3, R, PY + PH + 22, '横轴是时间，纵轴是箱子中心的高度', 10.5, W);
    label(p3, R, PY + PH + 44, '拿着时跟着手腕走，其余时间放在地上，再插值平滑', 'demo-x-mut', 10.5);
    var p4 = group(s);
    label(p4, R, 64, '唯一的例外', 'demo-x-ink', 14);
    /* 六张任务卡：五张来自 RGB 视频，搬行李箱来自 OMOMO；要用手抓握的两张打叉 */
    var tiles4 = [['开门穿门', 'RGB 视频'], ['用脚开门', 'RGB 视频'], ['搬面包箱', 'RGB 视频'], ['推大箱子', 'RGB 视频'], ['楚门式鞠躬', 'RGB 视频'], ['搬行李箱', 'OMOMO']].map(function (c, i) {
      var g = group(p4), x = R + (i % 3) * 118, y = 80 + Math.floor(i / 3) * 62, om = c[1] === 'OMOMO';
      rectBox(g, x, y, 110, 54, om ? C_TGT : C_ACCENT, C_SURFACE);
      label(g, x + 55, y + 22, c[0], 'demo-x-ink2', 12, 'middle');
      label(g, x + 55, y + 42, c[1], om ? 'demo-x-ink' : 'demo-x-mut', 11, 'middle');
      return g;
    });
    label(p4, R, 226, '要用手抓握的，这一版不做：', 'demo-x-ink2', 12);
    var grip4 = ['搬显示器', '搬台灯'].map(function (n, i) {
      var g = group(p4), x = R + i * 118;
      rectBox(g, x, 236, 110, 34, C_BORDER, C_SURFACE2);
      label(g, x + 55, 258, n, 'demo-x-mut', 12, 'middle');
      cross(g, x + 88, 246, 14, C_BAD);
      return g;
    });
    label(p4, R + 244, 258, 'OMOMO 里很多', 'demo-x-mut', 11);
    label(p4, R + 244, 280, '要灵巧手', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, '这段参考', 'demo-x-ink', 14);
    var st = [['472', '帧（50 帧/秒，9.44 s）'], ['28', '个机器人连杆 + 1 个箱子'], ['29', '个关节角']];
    var stN = [];
    var stG = st.map(function (n, i) {
      var g = group(p5);
      stN.push(tone(g, R, 112 + i * 52, n[0], C_ACCENT, 28, 'start'));
      label(g, R + 70, 110 + i * 52, n[1], 'demo-x-ink2', 12);
      return g;
    });
    function draw(t, clock) {
      var now = nowOf(t, clock), j = loopFrame(now);
      bot.put(cam, j);
      tLab.textContent = '参考第 ' + f2(suitTime(j)) + ' s';
      fl1.forEach(function (f, i) { f.at(now + i * 0.4, [R + 64, 82 + i * 60 + 34], [R + 64, 82 + (i + 1) * 60 - 2], true); });
      moveDot(hDot, [hx(j), hy(suitFrames()[j].ref.cen[2])]);
      stG.forEach(function (g, i) { setOpacity(g, seg(t, 13.8 + i * 0.5, 14.2 + i * 0.5)); });
      var u5 = since(t, clock, 13.4);
      stN.forEach(function (n, i) { n.textContent = countTo(+st[i][0], seg(u5, 0.4 + i * 0.5, 1.6 + i * 0.5)); });
      /* 人工标注：播放头 4 s 扫一遍；扫过的关键帧亮起；光标去点两个接触点；代码一行一行长出来 */
      var u2 = since(t, clock, 3.6), ph = (now % 4) / 4;
      head2.setAttribute('x1', (R + ph * 350).toFixed(1)); head2.setAttribute('x2', (R + ph * 350).toFixed(1));
      film.forEach(function (r, q) { var key = keyQ.indexOf(q); r.style.stroke = key >= 0 && ph * 10 > q ? (key ? C_GOOD : C_ACCENT) : C_BORDER; r.style.strokeWidth = key >= 0 && ph * 10 > q ? '2.4px' : ''; });
      keyTag.forEach(function (lb, k) { lb.style.opacity = ph * 10 > keyQ[k] ? 1 : 0.25; });
      var cp = (now % 3) / 3, ci = cp < 0.5 ? 0 : 1, cx = [R + 34, R + 102][ci], back = [R + 150, R + 60][ci];
      var ease = seg(cp % 0.5, 0, 0.3);
      cursor2.setAttribute('transform', 'translate(' + (back + (cx - back) * ease).toFixed(1) + ' ' + (262 - 40 * ease).toFixed(1) + ')');
      cpt2.forEach(function (c, k) { c.style.opacity = k === 0 ? (ci === 0 ? seg(cp, 0.3, 0.35) : 1) : (ci === 1 ? seg(cp, 0.8, 0.85) : 0); });
      code2.forEach(function (b, k) { setW(b, codeW[k] * seg(u2, 0.8 + k * 0.4, 1.2 + k * 0.4)); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 一帧参考：机器人、物体、接触 ── */
  function buildSceneRefFrame() {
    var s = sceneSvg('左边是同一段搬行李箱的仿真回放，箱子两侧的黄点是期望接触点、紫点是手的末端，下面的时间条上黄色一段是要接触的帧；右边依次出现：' +
      '参考的三部分、机器人的状态、物体的状态、接触信号与接触点、这段参考里有多少帧要接触');
    s.appendChild(svgText(24, 26, '一帧参考：机器人、物体、接触', 'demo-x-ink2', 13.5));
    var cam = camAt(150, 24 + 208 * 150 / 170, 50 + 245 * 150 / 170);
    var bot = g1Mesh(s, 'rob');
    var ov = contactOverlay(s, { r: 6 });
    var bar = contactBar(s, 40, 286, 350, 14);
    label(s, 40, 318, '接触信号 $c_t$', 'demo-x-ink2', 10.5);
    var cueLab = rich(s, 215, 318, '', 10.5, 'demo-x-ink2', 'middle', 200);
    label(s, 30, 46.5, '官方仓库录下的仿真回放', 'demo-x-mut', 10.5);
    var tLab = label(s, 30, 68, '', 'demo-x-ink2', 11);
    var R = 424, W = 352;
    var head = group(s);
    math(head, R + W / 2, 70, 's_t^{\\mathrm{ref}} = (\\,s_t^{\\mathrm{robot}},\\; s_t^{\\mathrm{obj}},\\; c_t\\,)', 17, 'middle');
    var parts = [['机器人', C_ACCENT], ['物体', C_GOOD], ['接触', C_TGT]].map(function (p, i) { return chip(head, R + 8 + i * 116, 92, 104, p[0], p[1], { size: 12.5, h: 30 }); });
    var p2 = group(s);
    label(p2, R, 152, '机器人', 'demo-x-ink', 13);
    [['根部位置', '$p^{\\mathrm{robot}}$'], ['根部朝向', '$q^{\\mathrm{robot}}$'], ['参考关节角', '$\\theta_t^{\\mathrm{ref}}$（29 个）']].forEach(function (r, i) {
      chip(p2, R, 164 + i * 40, 120, r[0], C_ACCENT, { size: 12, h: 30 });
      rich(p2, R + 132, 164 + i * 40 + 19, r[1], 12.5);
    });
    var p3 = group(s);
    label(p3, R, 152, '物体', 'demo-x-ink', 13);
    [['位置', '$p^{\\mathrm{obj}}$'], ['朝向', '$q^{\\mathrm{obj}}$'], ['关节角（铰接物体）', '$\\theta^{\\mathrm{obj}}$：门转开多少']].forEach(function (r, i) {
      chip(p3, R, 164 + i * 40, 140, r[0], C_GOOD, { size: 12, h: 30 });
      rich(p3, R + 152, 164 + i * 40 + 19, r[1], 12.5);
    });
    var door3 = doorIcon(p3, R + 300, 220, 30, 44, C_GOOD);
    var p4 = group(s);
    label(p4, R, 152, '接触', 'demo-x-ink', 13);
    chip(p4, R, 164, W, '$c_t \\in \\{0, 1\\}$：这一帧该不该碰到物体', C_TGT, { size: 12, h: 30, left: true });
    chip(p4, R, 204, W, '期望接触点 $p_t^{\\mathrm{contact}}$：定义在物体坐标系里', C_TGT, { size: 12, h: 30, left: true });
    label(p4, R, 258, '物体怎么动，黄点就跟着怎么动', 'demo-x-mut', 10.5);
    var p5 = group(s);
    label(p5, R, 152, '代码里的行李箱', 'demo-x-ink', 13);
    rich(p5, R, 178, '接触点偏移（箱子坐标系）：$x=-0.1$、$y=\\pm 0.18$、$z=0.25$ m', 11.5, null, 'start', W);
    var cnt = tone(p5, R, 226, '', C_TGT, 28, 'start');
    label(p5, R + 74, 216, '帧要求双手接触', 'demo-x-ink2', 12);
    label(p5, R + 74, 239, '（共 472 帧，约 36%）', 'demo-x-mut', 10.5);
    function draw(t, clock) {
      var now = nowOf(t, clock), j = loopFrame(now), F = suitFrames(), f = F[j];
      bot.put(cam, j);
      ov.put(f, 'rob', cam, { err: false });
      bar.at(j);
      cueLab.setText(f.c ? '$c_t = 1$：要接触' : '$c_t = 0$：不用接触');
      tLab.textContent = '参考第 ' + f2(suitTime(j)) + ' s';
      door3.at(0.5 + 0.5 * Math.sin(now * 1.5));
      parts.forEach(function (c, i) { setOpacity(c, 0.35 + 0.65 * (i === 0 ? win(t, 3.6, 7.0) : i === 1 ? win(t, 7.0, 10.4) : win(t, 10.4)) + (t < 3.6 ? 0.65 : 0)); });
      cnt.textContent = countTo(170, seg(since(t, clock, 13.4), 0.4, 2.0));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: DeepMimic 式训练三件套 ── */
  function buildSceneDeepMimic() {
    var s = sceneSvg('左边是官方仓库录下的仿真回放，每隔两秒从一个随机的帧重新开始（参考状态初始化），下面是相位条和跟踪误差的计数；右边依次出现：' +
      '三件套与 PPO、随机起点、相位、连续 25 步超标才终止、代码里的随机扰动范围');
    s.appendChild(svgText(24, 26, 'DeepMimic 式训练：初始化、相位、终止', 'demo-x-ink2', 13.5));
    var cam = camAt(140, 24 + 208 * 140 / 170, 52 + 245 * 140 / 170);
    /* 第 3–7 幕左边都放仿真回放：参考里人工标注的箱子拿着时也会上下飘（第 8 幕并排对比，2026-10-26 看片反馈） */
    var bot = g1Mesh(s, 'rob');
    var startLab = label(s, 30, 48, '', 'demo-x-ink2', 11);
    /* 相位条 */
    var PX = 40, PW = 340;
    label(s, PX, 274, '相位 $\\phi$', 'demo-x-ink2', 11);
    rectBox(s, PX + 56, 264, PW - 56, 12, C_BORDER, C_SURFACE2);
    var phBar = hbar(s, PX + 56, 264, 12, C_ACCENT);
    var phVal = label(s, PX + PW, 296, '', 'demo-x-ink', 11, 'end');
    label(s, PX + 56, 296, '0：开头', 'demo-x-mut', 9.5);
    label(s, PX + PW - 60, 296, '1：结尾', 'demo-x-mut', 9.5, 'end');
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '沿用 DeepMimic 的三件套', 'demo-x-ink', 14);
    [['① 参考状态初始化', C_ACCENT], ['② 相位变量', C_TGT], ['③ 误差太大就提前终止', C_BAD]].forEach(function (c, i) { chip(p1, R, 84 + i * 46, W, c[0], c[1], { size: 12.5, h: 34 }); });
    chip(p1, R, 230, W, '用 PPO 优化', C_GOOD, { size: 12.5, h: 32 });
    var p2 = group(s);
    label(p2, R, 64, '① 从参考里随机挑一帧开始', 'demo-x-ink', 14);
    var TX = R + 10, TW = W - 20;
    rectBox(p2, TX, 100, TW, 14, C_BORDER, C_SURFACE2);
    var starts = [];
    for (var i = 0; i < 9; i++) starts.push(paint(svgEl('path', { d: 'M0 0', 'stroke-width': 0 }), C_ACCENT));
    starts.forEach(function (p) { p2.appendChild(p); });
    label(p2, TX, 136, '每个三角是一个回合的起点（示意）', 'demo-x-mut', 10.5);
    label(p2, R, 176, '机器人和物体都摆成那一帧，再加一点扰动', 'demo-x-ink2', 12);
    label(p2, R, 200, '后半段不用等前半段学会，也能练到', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, '② 相位 $\\phi \\in [0, 1]$', 'demo-x-ink', 14);
    label(p3, R, 98, '0 是动作开头，1 是结尾', 'demo-x-ink2', 12);
    label(p3, R, 124, '论文：跟单段动作时，有相位就够了', 'demo-x-ink2', 12);
    label(p3, R, 160, '左下的条就是相位，跟着回放往前走', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 64, '③ 误差太大就终止', 'demo-x-ink', 14);
    var EX = R + 8, EY = 90, EW = W - 16, EH = 92;
    rectBox(p4, EX, EY, EW, EH, C_BORDER, C_SURFACE);
    var thY = EY + 30;
    hline(p4, EX, thY, EX + EW, thY, C_BAD, 1.4, '5 3');
    label(p4, EX + EW, EY - 9, '红虚线：阈值', 'demo-x-ink2', 10.5, 'end');
    var errPath = pathLine(p4, [], C_ACCENT, 2);
    var cells = [];
    for (i = 0; i < 25; i++) cells.push(paint(svgEl('rect', { x: EX + i * (EW / 25), y: EY + EH + 14, width: EW / 25 - 2, height: 12, rx: 2 }), C_SURFACE2, C_BORDER));
    cells.forEach(function (c) { p4.appendChild(c); });
    var cntLab = label(p4, EX, EY + EH + 46, '', 'demo-x-ink2', 11.5);
    label(p4, EX, EY + EH + 68, '代码：连续 25 步（0.5 s）超标才终止', 'demo-x-mut', 10.5);
    var p5 = group(s);
    label(p5, R, 64, '代码里的随机扰动', 'demo-x-ink', 14);
    var rows5 = [
      rangeRow(p5, R, 98, W, '根部位置', -0.05, 0.05, -0.25, 0.25, function (v) { return sgn(f2(v)) + ' m'; }, C_ACCENT),
      rangeRow(p5, R, 134, W, '开门的任务', -0.2, 0.2, -0.25, 0.25, function (v) { return sgn(f2(v)) + ' m'; }, C_TGT),
      rangeRow(p5, R, 170, W, '偏航', -0.2, 0.2, -0.25, 0.25, function (v) { return sgn(f2(v)) + ' rad'; }, C_ACCENT),
      rangeRow(p5, R, 206, W, '关节角', -0.1, 0.1, -0.25, 0.25, function (v) { return sgn(f2(v)) + ' rad'; }, C_ACCENT),
      rangeRow(p5, R, 242, W, '物体位置', -0.05, 0.05, -0.25, 0.25, function (v) { return sgn(f2(v)) + ' m'; }, C_GOOD)
    ];
    var EP = 2.0; // 每个「回合」两秒
    function errAt(x) { return 0.35 + 0.45 * Math.sin(x * 1.3) + 0.25 * Math.sin(x * 3.1 + 1); }
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var ep = Math.floor(now / EP), st0 = Math.floor(rnd(ep, 7) * 130), j = st0 + Math.floor((now - ep * EP) * SUIT_FPS / SUIT_STEP);
      j = Math.min(j, SUIT.n - 1);
      bot.put(cam, j);
      startLab.textContent = '仿真回放 · 这个回合从参考第 ' + f2(suitTime(st0)) + ' s 开始';
      var ph = j / (SUIT.n - 1);
      setW(phBar, (PW - 56) * ph);
      phVal.textContent = '相位 ' + f2(ph);
      starts.forEach(function (p, i) {
        var k = ep - i, x = TX + rnd(k, 7) * 130 / 148 * TW;
        p.setAttribute('d', 'M' + x.toFixed(1) + ' 98 l-5 -9 l10 0 Z');
        p.style.opacity = k < 0 ? 0 : 1 - i / 9;
      });
      /* 误差曲线滚动，超过阈值的连续步数填格子 */
      var pts = [], run = 0, sec = since(t, clock, 10.4);
      for (var q = 0; q <= 60; q++) {
        var x = sec * 1.2 - 3 + q / 20, e = errAt(x);
        pts.push([EX + q / 60 * EW, EY + EH - 6 - clamp(e, 0, 1.2) / 1.2 * (EH - 12)]);
      }
      setPath(errPath, pts);
      for (q = 60; q >= 0; q--) { if (errAt(sec * 1.2 - 3 + q / 20) > 0.8) run += 1; else break; }
      var steps = Math.min(25, Math.round(run * 25 / 20));
      cells.forEach(function (c, i) { c.style.fill = i < steps ? 'var(--demo-bad)' : C_SURFACE2; }); // 旁白说「一格一格变红」：填上的格子就是红的
      cntLab.textContent = steps >= 25 ? '连续超标 25 步：终止' : '连续超标 ' + steps + ' 步';
      rows5.forEach(function (r, i) { r.at(since(t, clock, 13.4), 11 + i, 0.9); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    void thY;
    return { el: s, draw: draw };
  }

  /* ── scene 6: 统一的物体表示（图 3） ── */
  function buildSceneObjRep() {
    var s = sceneSvg('左上是论文图 3 的三张图，黄点是期望接触点；左下是官方仓库录下的仿真回放，从骨盆指向箱子和两个接触点的箭头就是换到根部坐标系里的量；' +
      '右边依次出现：物体位姿换到根部坐标系、期望接触点、全部观测、代码里物体只占 10 维、以后换成相机');
    s.appendChild(svgText(24, 26, '统一的物体表示：都换到机器人的根部坐标系', 'demo-x-ink2', 13.5));
    var fig = paperPart(s, 'fig3', 0, 0, 1, 1, 24, 44, 380, '论文图 3：搬行李箱、用脚开门、打开折叠椅的期望接触点（黄）');
    var cam = camAt(118, 24 + 160 * 118 / 170 + 60, 188 + 245 * 118 / 170);
    var bot = g1Mesh(s, 'rob');
    var ov = contactOverlay(s, { r: 5 });
    var arrows = [arrow(s, C_ACCENT, 2), arrow(s, C_TGT, 1.8), arrow(s, C_TGT, 1.8)];
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '物体位姿 → 根部坐标系', 'demo-x-ink', 14);
    rich(p1, R, 96, '不管什么物体，策略只看它**相对机器人根部**的位姿', 12, null, 'start', W);
    label(p1, R, 124, '左下蓝色箭头：从骨盆指向箱子', 'demo-x-mut', 11);
    /* 小动图：根部坐标系的箭头指向一个轮换的物体（箱子 / 门 / 椅子），表示都一样 */
    var OX = R + 50, OY = 238;
    var axX = arrow(p1, C_BAD, 2), axY = arrow(p1, C_GOOD, 2);
    axX.set(OX, OY, OX + 46, OY, 7); axY.set(OX, OY, OX, OY - 46, 7);
    label(p1, OX, OY + 22, '根部坐标系', 'demo-x-ink2', 11.5, 'middle');
    var objArrow = arrow(p1, C_ACCENT, 2.4);
    var objs1 = [group(p1), group(p1), group(p1)];
    boxIcon(objs1[0], R + 236, 186, 56, 46);
    var door6 = doorIcon(objs1[1], R + 246, 168, 34, 64, C_ACCENT);
    objs1[2].appendChild(paint(svgEl('path', { d: 'M' + (R + 238) + ' 206 h56 M' + (R + 242) + ' 206 v28 M' + (R + 290) + ' 206 v28 M' + (R + 290) + ' 206 v-34', fill: 'none', 'stroke-width': 4, 'stroke-linecap': 'round' }), null, C_TGT));
    var objName1 = label(p1, R + 264, 260, '', 'demo-x-ink2', 12, 'middle');
    label(p1, R + 150, 290, '换什么物体，都是同一种量：位置 + 朝向', 'demo-x-mut', 11, 'middle');
    var p2 = group(s);
    label(p2, R, 64, '再加期望接触点（图 3 的黄点）', 'demo-x-ink', 14);
    [['搬行李箱', '箱子两侧'], ['用脚开门', '门板下沿'], ['打开折叠椅', '座面的边']].forEach(function (r, i) {
      chip(p2, R, 82 + i * 42, 120, r[0], C_TGT, { size: 12, h: 30 });
      label(p2, R + 134, 82 + i * 42 + 20, r[1], 'demo-x-ink2', 12);
    });
    label(p2, R, 222, '同样换到根部坐标系，训练和部署时都一样', 'demo-x-mut', 10.5);
    /* 论文图 3 的三张小图轮流框亮，右边对应的那一行标出来 */
    var fb6 = [0, 1, 2].map(function (k) { return figBox(p2, fig, k / 3 + 0.005, 0.02, (k + 1) / 3 - 0.005, 0.98, C_TGT); });
    var mark6 = paint(svgEl('path', { d: 'M0 0 l10 6 l-10 6 Z' }), C_TGT);
    p2.appendChild(mark6);
    var p3 = group(s);
    label(p3, R, 64, '策略的观测', 'demo-x-ink', 14);
    [['本体感受', C_ACCENT], ['相位 $\\phi$', C_MUTED], ['物体 + 接触点', C_TGT]].forEach(function (c, i) { chip(p3, R + i * 118, 84, 110, c[0], c[1], { size: 12, h: 32 }); });
    var net3 = chip(p3, R + 96, 160, 160, '同一个策略网络', C_GOOD, { size: 12.5, h: 36 });
    void net3;
    var fl6 = [0, 1, 2].map(function () { return flowSeg(p3, C_MUTED, 2, 3, 26, false); });
    label(p3, R, 234, '换一种物体，不用改网络结构', 'demo-x-ink2', 12.5);
    var p4 = group(s);
    label(p4, R, 64, '代码里物体只占 10 维', 'demo-x-ink', 14);
    var cellsX = R, cw = W / 10, cols4 = [C_ACCENT, C_ACCENT, C_GOOD, C_GOOD, C_TGT, C_TGT, C_TGT, C_TGT, C_TGT, C_TGT];
    var cells4 = cols4.map(function (c, i) {
      var r = paint(svgEl('rect', { x: cellsX + i * cw + 1, y: 86, width: cw - 3, height: 26, rx: 3 }), c);
      p4.appendChild(r);
      return r;
    });
    label(p4, R + cw, 130, '水平位置 2', 'demo-x-ink2', 10.5, 'middle');
    label(p4, R + 3 * cw, 130, '朝向 2', 'demo-x-ink2', 10.5, 'middle');
    label(p4, R + 7 * cw, 130, '两个接触点 2 × 3', 'demo-x-ink2', 10.5, 'middle');
    rich(p4, R, 168, '朝向给的是 $\\cos$、$\\sin$；接触点只按偏航转', 11.5, null, 'start', W);
    label(p4, R, 196, '官方 13 个任务的配置都是这一套', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, '以后换成机载相机', 'demo-x-ink', 14);
    chip(p5, R, 84, 150, '动作捕捉给位姿', C_MUTED, { size: 12, h: 32 });
    chip(p5, R + 202, 84, 150, 'RGB / 深度相机', C_ACCENT, { size: 12, h: 32 });
    var f5 = flowSeg(p5, C_ACCENT, 2, 3, 26, false);
    label(p5, R, 152, '和空间位置无关的表示，可以蒸馏到机载传感器上', 'demo-x-ink2', 11.5);
    label(p5, R, 176, '（论文第 III-B 节的说法，还没做）', 'demo-x-mut', 10.5);
    function draw(t, clock) {
      var now = nowOf(t, clock), j = loopFrame(now), f = suitFrames()[j];
      bot.put(cam, j);
      ov.put(f, 'rob', cam, { err: false, eef: false });
      var pel = [f.rob.pel[0], f.rob.pel[1], f.rob.pel[2]], a = project(pel, cam);
      var b = project(f.rob.cen, cam), c1 = project(f.rob.tgt[0], cam), c2 = project(f.rob.tgt[1], cam);
      arrows[0].set(a[0], a[1], b[0], b[1]); arrows[1].set(a[0], a[1], c1[0], c1[1], 7); arrows[2].set(a[0], a[1], c2[0], c2[1], 7);
      setOpacity(arrows[0].g, seg(t, 0.7, 1.1));
      setOpacity(arrows[1].g, seg(t, 3.9, 4.3)); setOpacity(arrows[2].g, seg(t, 3.9, 4.3));
      var kObj = Math.floor(now / 1.6) % 3;
      objs1.forEach(function (g, k) { setOpacity(g, k === kObj ? 1 : 0); });
      door6.at(0.3 + 0.3 * Math.sin(now * 1.8));
      objArrow.set(OX, OY, R + 228, 214, 8);
      objName1.textContent = ['箱子', '门', '椅子'][kObj];
      var k6 = Math.floor(now / 1.4) % 3;
      fb6.forEach(function (b, k) { b.style.opacity = k === k6 ? 1 : 0; });
      mark6.setAttribute('transform', 'translate(' + (R - 16) + ' ' + (91 + k6 * 42) + ')');
      fl6.forEach(function (f, k) { f.at(now + k * 0.3, [R + 55 + k * 118, 118], [R + 136 + k * 40, 158], true); });
      cells4.forEach(function (r, i) { r.style.opacity = clamp(seg(since(t, clock, 10.4), 0.2, 1.6) * 10 - i, 0, 1); });
      f5.at(now, [R + 152, 100], [R + 200, 100], true);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    void fig;
    return { el: s, draw: draw };
  }

  /* 一条函数曲线的小图：横轴 [0, xmax]，纵轴 [0, 1]；dot(x) 把小点放到曲线上 */
  function curvePlot(parent, x, y, w, h, xmax, fn, color, xticks, xunit) {
    var g = group(parent);
    rectBox(g, x, y, w, h, C_BORDER, C_SURFACE);
    function px(v) { return x + 8 + v / xmax * (w - 16); }
    function py(v) { return y + h - 8 - v * (h - 16); }
    hline(g, x, py(1), x + w, py(1), C_BORDER, 0.8, '2 3');
    label(g, x - 4, py(1) + 3.5, '1', 'demo-x-mut', 8.5, 'end');
    label(g, x - 4, py(0) + 3.5, '0', 'demo-x-mut', 8.5, 'end');
    var pts = [];
    for (var i = 0; i <= 80; i++) { var v = i / 80 * xmax; pts.push([px(v), py(fn(v))]); }
    pathLine(g, pts, color, 2.4);
    (xticks || []).forEach(function (v) { label(g, px(v), y + h + 18, String(v) + (xunit || ''), 'demo-x-mut', 8.5, 'middle'); });
    var d = dotAt(g, 0, 0, 5.5, color), vl = hline(g, 0, 0, 0, 0, color, 1, '3 3');
    return { g: g, px: px, py: py, dot: function (v) { var q = clamp(v, 0, xmax); moveDot(d, [px(q), py(fn(q))]); setLine(vl, px(q), py(fn(q)), px(q), y + h); } };
  }

  /* ── scene 7: 残差动作空间 ── */
  function buildSceneResidual() {
    var s = sceneSvg('左边是仿真回放里跪下抱箱子的那几帧（回放第 3.20 s 的左膝 2.71 rad，参考 2.73），讲到普通动作空间时叠上半透明的默认站姿：动作为零时关节目标就是它，机器人会被弹起来；' +
      '右边依次出现：默认站姿和跪姿的膝角、普通动作空间、残差动作的公式、左膝在两种动作空间里的探索范围、论文图 9c');
    s.appendChild(svgText(24, 26, '残差动作：探索围着参考姿态', 'demo-x-ink2', 13.5));
    var cam = camAt(150, 24 + 208 * 150 / 170, 50 + 245 * 150 / 170);
    var bot = g1Mesh(s, 'rob'), ghost = g1Mesh(s, 'dflt', { ghost: 0.45 });
    var gLab = label(s, 30, 62, '', 'demo-x-ink2', 11);
    var tagG = label(s, 214, 300, '半透明：动作为零时的关节目标（默认站姿）', 'demo-x-mut', 10.5, 'middle');
    var capS7 = label(s, 214, 300, '官方仓库录下的仿真回放（我们按 G1 三维模型渲染）', 'demo-x-mut', 10.5, 'middle');
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '跪、弯腰：离默认站姿很远', 'demo-x-ink', 14);
    /* 膝角刻度盘：0（伸直）到 π（折到底）；两根指针是默认站姿与第 3.20 s 的左膝 */
    var GX = R + 176, GY = 212, GR = 112;
    function gpt(a, r) { return [GX + r * Math.cos(a), GY - r * Math.sin(a)]; }
    var gArc = [];
    for (var ga = 0; ga <= 60; ga++) gArc.push(gpt(ga / 60 * Math.PI, GR));
    pathLine(p1, gArc, C_BORDER, 2);
    [0, 1, 2, 3].forEach(function (v) { var a0 = gpt(v, GR), a1 = gpt(v, GR + 7), lb = gpt(v, GR + 20); hline(p1, a0[0], a0[1], a1[0], a1[1], C_BORDER, 1.4); label(p1, lb[0], lb[1] + 4, v + ' rad', 'demo-x-mut', 9, 'middle'); });
    var sweep1 = pathLine(p1, [], C_ACCENT, 6);
    sweep1.style.opacity = 0.35;
    var needles1 = [[DEFAULT_KNEE, C_MUTED], [KNEEL.knee, C_ACCENT]].map(function (c) { var e = gpt(c[0], GR - 10); return hline(p1, GX, GY, e[0], e[1], c[1], 3.2); });
    dotAt(p1, GX, GY, 5, 'var(--text)');
    var midA = gpt((DEFAULT_KNEE + KNEEL.knee) / 2, 58);
    var dTxt1 = label(p1, midA[0], midA[1], '', 'demo-x-ink', 12.5, 'middle');
    legendRow(p1, R, 240, [['默认站姿 0.67 rad', C_MUTED, 112], ['跪下时的左膝 2.73 rad', C_ACCENT, 136]], 11.5);
    label(p1, R, 266, '刻度盘是膝角：0 伸直，越大弯得越深；取参考第 3.20 s 跪得最低的那一帧', 'demo-x-mut', 10.5);
    /* 第 2、3 段共用一条关节角数轴：圆点是左膝的关节目标，三角是「动作 = 0」时的目标 */
    var AX0 = R + 14, AW = W - 28, AY = 168;
    function ax(v) { return AX0 + clamp(v, 0, 3.2) / 3.2 * AW; }
    function axis(g) {
      hline(g, AX0, AY, AX0 + AW, AY, C_BORDER, 1.4);
      [0, 1, 2, 3].forEach(function (v) { hline(g, ax(v), AY, ax(v), AY + 5, C_BORDER, 1.2); label(g, ax(v), AY + 19, v + ' rad', 'demo-x-mut', 9, 'middle'); });
      label(g, AX0, AY - 54, '左膝的关节目标', 'demo-x-mut', 11);
    }
    function tri(g, v, color) { g.appendChild(paint(svgEl('path', { d: 'M' + (ax(v) - 7) + ' ' + (AY + 26) + ' l7 -10 l7 10 Z' }), color)); }
    var p2 = group(s);
    label(p2, R, 64, '普通动作：围着默认站姿探索', 'demo-x-ink', 14);
    axis(p2);
    tri(p2, DEFAULT_KNEE, C_MUTED);
    label(p2, ax(DEFAULT_KNEE), AY + 48, '动作 = 0：默认站姿', 'demo-x-ink2', 11.5, 'middle');
    label(p2, ax(KNEEL.knee), AY + 48, '回合从跪姿开始', 'demo-x-ink2', 11.5, 'middle');
    var dot2 = dotAt(p2, ax(KNEEL.knee), AY - 14, 7, C_BAD), trail2 = hline(p2, 0, 0, 0, 0, C_BAD, 2, '4 3');
    var pop2 = label(p2, ax(1.6), AY - 30, '一出手就被撑起来', 'demo-x-ink', 12.5, 'middle');
    label(p2, R, 268, '马上失去平衡，采到的样本没用', 'demo-x-mut', 11.5);
    var p3 = group(s);
    label(p3, R, 64, '残差动作', 'demo-x-ink', 14);
    math(p3, R + W / 2, 98, '\\theta_t^{\\mathrm{target}} = \\theta_t^{\\mathrm{ref}} + a_t', 20, 'middle');
    axis(p3);
    tri(p3, KNEEL.knee, C_ACCENT);
    label(p3, ax(KNEEL.knee) - 10, AY + 48, '动作 = 0：参考姿态', 'demo-x-ink2', 11.5, 'middle');
    var dots3 = [0, 1, 2, 3, 4].map(function (k) { return dotAt(p3, 0, 0, 4.5, C_ACCENT); });
    label(p3, R, 268, '一开始的探索就围着当前的参考展开', 'demo-x-ink2', 12);
    var p4 = group(s);
    label(p4, R, 64, '算一下：第 3.20 s 的左膝', 'demo-x-ink', 14);
    var NX = R + 10, NW = W - 20, NY = 180;
    function nx(v) { return NX + v / 3.2 * NW; }
    hline(p4, NX, NY, NX + NW, NY, C_BORDER, 1.4);
    [0, 1, 2, 3].forEach(function (v) { hline(p4, nx(v), NY, nx(v), NY + 5, C_BORDER, 1.2); label(p4, nx(v), NY + 17, v + ' rad', 'demo-x-mut', 9, 'middle'); });
    function bump(c, color) {
      var pts = [];
      for (var i = 0; i <= 60; i++) { var v = c - 1.2 + i / 60 * 2.4; pts.push([nx(clamp(v, 0, 3.2)), NY - 62 * Math.exp(-0.5 * Math.pow((v - c) / KNEE_SCALE, 2))]); }
      var p = pathLine(p4, pts, color, 2.2);
      return p;
    }
    var bAbs = bump(DEFAULT_KNEE, C_MUTED), bRes = bump(KNEEL.knee, C_ACCENT);
    var tgtLine = hline(p4, nx(KNEEL.knee), NY - 74, nx(KNEEL.knee), NY, C_TGT, 2, '4 3');
    void tgtLine;
    label(p4, nx(DEFAULT_KNEE), NY - 70, '普通：围着 0.67', 'demo-x-ink2', 10, 'middle');
    label(p4, nx(KNEEL.knee), NY - 80, '残差：围着 2.73', 'demo-x-ink2', 10, 'middle');
    rich(p4, R, NY + 44, '差 2.06 rad ÷ 缩放 0.35 = **' + f1(KNEEL_U) + ' 个动作单位**', 12, null, 'start', W);
    label(p4, R, NY + 68, '训练开始时的探索噪声：1 个单位（钟形的宽度）', 'demo-x-mut', 10.5);
    void bAbs; void bRes;
    var p5 = group(s);
    label(p5, R, 64, '论文图 9c', 'demo-x-ink', 14);
    paperPart(p5, 'fig9c', 0, 0, 1, 1, R + 20, 78, 300, '上排有残差动作，下排没有：一出手就弹起来');
    function draw(t, clock) {
      var now = nowOf(t, clock), j = loopFrame(now, 36, 61);
      bot.put(cam, j); ghost.put(cam, 0);
      gLab.textContent = '参考第 ' + f2(suitTime(j)) + ' s';
      /* 刻度盘：弧从默认站姿扫到跪姿；数轴：普通动作每 2.4 s 从 2.73 被拉回 0.67，残差动作只在 2.73 附近抖 */
      var u1 = seg(since(t, clock, 0.4), 0.6, 2.0), aNow = DEFAULT_KNEE + (KNEEL.knee - DEFAULT_KNEE) * u1, sw = [];
      for (var q = 0; q <= 30; q++) sw.push(gpt(DEFAULT_KNEE + (aNow - DEFAULT_KNEE) * q / 30, GR - 22));
      setPath(sweep1, sw);
      dTxt1.textContent = u1 > 0.98 ? '相差 2.06 rad' : '';
      void needles1;
      var c2 = (now % 2.4) / 2.4, k2 = KNEEL.knee + (DEFAULT_KNEE - KNEEL.knee) * seg(c2, 0.25, 0.45);
      moveDot(dot2, [ax(k2), AY - 14]); setLine(trail2, ax(KNEEL.knee), AY - 14, ax(k2), AY - 14);
      pop2.style.opacity = seg(c2, 0.4, 0.5) * (1 - seg(c2, 0.9, 1));
      dots3.forEach(function (d, k) { var j3 = KNEEL.knee + 0.18 * Math.sin(now * (1.7 + k * 0.6) + k * 1.3); moveDot(d, [ax(j3), AY - 14 - k * 3]); });
      var pop = t >= 3.6 && t < 10.4 ? 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(now * 2.4)) : 0;
      setOpacity(ghost.g, pop);
      setOpacity(tagG, pop > 0 ? 1 : 0);
      setOpacity(capS7, pop > 0 ? 0 : 1);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 交互奖励（式 1–2） ── */
  function buildSceneReward() {
    var s = sceneSvg('左边抱着箱子的那几帧，先放官方参考（人工标注的箱子拿着时也上下飘，手离接触点十几厘米），再换成官方仓库录下的仿真回放（箱子贴在手上）：' +
      '紫点是手，黄点是期望接触点，红色虚线是两者的距离；右边依次出现：为什么要交互奖励、参考与回放的左手距离曲线、位置项曲线、力项曲线（超过阈值封顶）、按接触信号门控的平均、代码里的参数');
    s.appendChild(svgText(24, 26, '交互奖励：手贴近接触点，力够但不过量', 'demo-x-ink2', 13.5));
    var cam = camAt(150, 24 + 208 * 150 / 170, 56 + 245 * 150 / 170);
    /* 先放参考（箱子相对手上下飘），再放回放（箱子贴着手）：第 3–7 幕放的都是回放，这里把两者对比给观众看（2026-10-26 看片反馈） */
    var botRef = g1Mesh(s, 'ref'), bot = g1Mesh(s, 'rob');
    var ov = contactOverlay(s, { r: 6 });
    var dLab = label(s, 30, 48, '', 'demo-x-ink2', 11);
    var capRef = label(s, 214, 300, '官方参考：箱子是人工标注的（我们按 G1 三维模型渲染）', 'demo-x-mut', 10, 'middle');
    var capRob = label(s, 214, 300, '官方仓库录下的仿真回放（我们按 G1 三维模型渲染）', 'demo-x-mut', 10, 'middle');
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '只靠跟踪奖励不够', 'demo-x-ink', 14);
    label(p1, R, 90, '视频重定向来的参考，只是运动学的轨迹', 'demo-x-ink2', 12);
    /* 两个小动图：左边手悬在接触点外，右边手穿进箱子 */
    var pan1 = [0, 1].map(function (k) { return rectBox(p1, R + k * 182, 102, 170, 112, C_BORDER, C_SURFACE); });
    void pan1;
    boxIcon(p1, R + 70, 140, 64, 52);
    boxIcon(p1, R + 252, 140, 64, 52);
    var tg1 = [dotAt(p1, R + 72, 164, 6, C_TGT), dotAt(p1, R + 254, 164, 6, C_TGT)];
    tg1.forEach(function (c) { c.style.stroke = '#ffffff'; c.style.strokeWidth = '1.2px'; });
    var hand1 = dotAt(p1, 0, 0, 5.5, C_EEF), gap1 = hline(p1, 0, 0, 0, 0, C_ERR, 2, '3 2');
    var hand1b = dotAt(p1, 0, 0, 5.5, C_EEF), flash1 = rectBox(p1, R + 252, 140, 64, 52, C_BAD, 'none');
    label(p1, R + 85, 232, '接触常常不准', 'demo-x-ink', 12.5, 'middle');
    label(p1, R + 267, 232, '还可能穿模', 'demo-x-ink', 12.5, 'middle');
    label(p1, R, 268, '每个该接触的末端：位置项 × 力项', 'demo-x-ink2', 12);
    /* 第 2 段：参考与回放的左手离接触点多远，跟着左边的帧走 */
    var p1b = group(s), FS = suitFrames(), J0 = 40, J1 = 112;
    label(p1b, R, 64, '左手离接触点多远', 'demo-x-ink', 14);
    var DX = R + 30, DY = 84, DW = W - 40, DH = 150, DMAX = 0.25;
    rectBox(p1b, DX, DY, DW, DH, C_BORDER, C_SURFACE);
    function dx(j) { return DX + 6 + (j - J0) / (J1 - 1 - J0) * (DW - 12); }
    function dy(v) { return DY + DH - 6 - clamp(v, 0, DMAX) / DMAX * (DH - 12); }
    var shade = -1;
    for (var jj = J0; jj <= J1; jj++) {
      var on = jj < J1 && FS[jj].c;
      if (on && shade < 0) shade = jj;
      if (!on && shade >= 0) {
        var sh = paint(svgEl('rect', { x: dx(shade).toFixed(1), y: DY + 1, width: (dx(jj - 1) - dx(shade)).toFixed(1), height: DH - 2 }), C_TGT);
        sh.style.opacity = 0.14; p1b.appendChild(sh); shade = -1;
      }
    }
    [0, 0.1, 0.2].forEach(function (v) { hline(p1b, DX, dy(v), DX + DW, dy(v), C_BORDER, 0.8, '2 3'); label(p1b, DX - 5, dy(v) + 4, String(v * 100) + ' cm', 'demo-x-mut', 9, 'end'); });
    var crvRef = [], crvRob = [];
    for (jj = J0; jj < J1; jj++) { crvRef.push([dx(jj), dy(handDist(FS[jj], 'ref')[0])]); crvRob.push([dx(jj), dy(handDist(FS[jj], 'rob')[0])]); }
    pathLine(p1b, crvRef, C_BAD, 2.4); pathLine(p1b, crvRob, C_GOOD, 2.4);
    var dHead = hline(p1b, 0, DY, 0, DY + DH, 'var(--text)', 1.6), dRef = dotAt(p1b, 0, 0, 5, C_BAD), dRob = dotAt(p1b, 0, 0, 5, C_GOOD);
    legendRow(p1b, R, 258, [['参考（人工标注）', C_BAD, 100], ['仿真回放', C_GOOD, 56]], 11);
    label(p1b, R + 236, 258, '黄底：要接触的帧', 'demo-x-ink2', 11);
    readHint(p1b, R, 284, '横轴是时间，纵轴是左手到接触点的距离，越低越好', 10.5, W);
    var p2 = group(s);
    math(p2, R + W / 2, 70, '\\exp\\!\\left(-\\lVert p_{\\mathrm{eef}} - p_{\\mathrm{target}}\\rVert_2 / \\sigma_{\\mathrm{pos}}\\right)', 15, 'middle');
    var cp2 = curvePlot(p2, R + 20, 92, W - 30, 130, 0.5, posTerm, C_EEF, [0, 0.25, 0.5], ' m');
    readHint(p2, R, 266, '横轴：手到接触点的距离；纵轴：位置项，越高越好', 10.5, W);
    label(p2, R, 292, '注意是距离本身，不是距离的平方', 'demo-x-mut', 10.5);
    var p3 = group(s);
    math(p3, R + W / 2, 70, '\\min\\!\\left(\\exp\\!\\left(\\frac{\\lVert F\\rVert - F_{\\mathrm{thres}}}{\\sigma_{\\mathrm{frc}}}\\right),\\,1\\right)', 15, 'middle');
    var cp3 = curvePlot(p3, R + 20, 96, W - 30, 126, 40, frcTerm, C_TGT, [0, 10, 20, 40], ' N');
    hline(p3, cp3.px(10), 96, cp3.px(10), 222, C_BAD, 1.4, '4 3');
    label(p3, cp3.px(40) - 6, 160, '过了阈值：封顶为 1', 'demo-x-ink2', 10, 'end');
    readHint(p3, R, 266, '横轴：接触力；纵轴：力项。力够就行，不鼓励更大的力', 10.5, W);
    var p4 = group(s);
    math(p4, R + W / 2, 74, 'R_{\\mathrm{interaction}} = \\frac{1}{N_c}\\sum_{i=1}^{N_c} R_{\\mathrm{contact},i}\\cdot c_{t,i}', 16, 'middle');
    label(p4, R, 126, '对要接触的末端取平均，用接触信号门控', 'demo-x-ink2', 12);
    var bar4 = contactBar(p4, R + 6, 150, W - 12, 14);
    label(p4, R + 6, 186, '黄色一段：$c_t = 1$，这一项才起作用', 'demo-x-mut', 10.5);
    var p5 = group(s);
    label(p5, R, 64, '论文没给的参数（官方代码）', 'demo-x-ink', 14);
    [['$\\sigma_{\\mathrm{pos}} = 0.3$ m', C_EEF], ['$\\sigma_{\\mathrm{frc}} = 40$ N', C_TGT], ['$F_{\\mathrm{thres}} = 10$ N', C_TGT]].forEach(function (c, i) { chip(p5, R + i * 118, 84, 110, c[0], c[1], { size: 12, h: 32 }); });
    label(p5, R, 148, '每个末端的得分（再对两只手取平均）', 'demo-x-ink2', 12);
    var b5 = [barRowAt(p5, R, 164, 96, '要接触', C_ACCENT, 16, 11), barRowAt(p5, R, 192, 96, '不用接触', C_MUTED, 16, 11)];
    label(p5, R, 236, '要接触时 × 5，不用接触时直接给 1', 'demo-x-mut', 10.5);
    label(p5, R, 258, '上面那条：距离取左边这一帧的左手，接触力假设 15 N', 'demo-x-mut', 10.5);
    function draw(t, clock) {
      var now = nowOf(t, clock), j = loopFrame(now, 40, 112), f = suitFrames()[j];
      /* 第 1 段的小动图：左手在接触点外来回晃（红虚线是差多远），右手穿进箱子时箱子闪红 */
      var hx1 = R + 40 + 10 * Math.sin(now * 2.0);
      moveDot(hand1, [hx1, 164]); setLine(gap1, hx1, 164, R + 72, 164);
      var hx1b = R + 236 + 34 * (0.5 + 0.5 * Math.sin(now * 1.6));
      moveDot(hand1b, [hx1b, 164]);
      flash1.style.opacity = hx1b > R + 258 ? 0.9 : 0;
      bot.put(cam, j); botRef.put(cam, j);
      var useRef = t < 3.75, wRef = 1 - seg(t, 3.6, 3.9);
      setOpacity(botRef.g, wRef); setOpacity(bot.g, 1 - wRef);
      setOpacity(capRef, 1 - seg(t, 3.6, 3.75)); setOpacity(capRob, seg(t, 3.75, 3.9));
      var who = useRef ? 'ref' : 'rob';
      ov.put(f, who, cam);
      var dRefNow = handDist(f, 'ref'), d = handDist(f, 'rob'), dShow = useRef ? dRefNow : d;
      dLab.textContent = f.c ? (useRef ? '参考：' : '回放：') + '左手离接触点 ' + f1(dShow[0] * 100) + ' cm · 右手 ' + f1(dShow[1] * 100) + ' cm' : '这一帧不用接触';
      var jc = clamp(j, J0, J1 - 1);
      setLine(dHead, dx(jc), DY, dx(jc), DY + DH);
      moveDot(dRef, [dx(jc), dy(dRefNow[0])]); moveDot(dRob, [dx(jc), dy(d[0])]);
      cp2.dot(d[0]);
      cp3.dot(14 + 12 * Math.sin(now * 0.9));
      bar4.at(j);
      var rr = contactCode(d[0], 15, 1);
      b5[0].set(rr / 5 * 200, f2(rr));
      b5[1].set(1 / 5 * 200, '1');
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p1b, win(t, 3.6, 7.0));
      setOpacity(p2, win(t, 7.0, 10.4));
      setOpacity(p3, win(t, 10.4, 13.8));
      setOpacity(p4, win(t, 13.8, 16.8));
      setOpacity(p5, win(t, 16.8));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: 奖励与终止（表 I、表 II） ── */
  function buildSceneTables() {
    var s = sceneSvg('左边是论文表一跟踪类奖励的权重，条越长权重越大；右边依次出现：读法、七项正则、代码里跟踪奖励拆成 10 个小项、表二的终止条件与连续 25 步、代码和论文不同的两处');
    s.appendChild(svgText(24, 26, '奖励与终止：表 I、表 II', 'demo-x-ink2', 13.5));
    label(s, 24, 58, '表 I 左：跟踪类奖励的权重', 'demo-x-ink', 13);
    var rows = REW_TRACK.map(function (r, i) {
      var col = r[2] === 'robot' ? C_ACCENT : r[2] === 'obj' ? C_GOOD : C_TGT;
      return barRowAt(s, 24, 76 + i * 36, 112, r[0], col, 20, 12);
    });
    label(s, 24, 312, '蓝：机器人跟踪　绿：物体　黄：接触', 'demo-x-mut', 10.5);
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '表 I：奖励的权重', 'demo-x-ink', 14);
    readHint(p1, R, 92, '左边每一条是一项奖励，条越长权重越大', 11.5, W);
    chip(p1, R, 116, W, '机器人跟踪四项：2.0 / 1.0 / 1.0 / 1.0', C_ACCENT, { size: 12, h: 32 });
    chip(p1, R, 158, W, '物体位姿 2.0', C_GOOD, { size: 12, h: 32 });
    chip(p1, R, 200, W, '接触奖励 5.0：全表最大', C_TGT, { size: 12, h: 32 });
    var p2 = group(s);
    label(p2, R, 64, '表 I 右：正则七项', 'demo-x-ink', 14);
    var regG = REW_REG.map(function (r, i) {
      var g = group(p2);
      chip(g, R + (i % 2) * 180, 82 + Math.floor(i / 2) * 42, 172, r[0] + '　' + r[1], C_MUTED, { size: 11.5, h: 32 });
      return g;
    });
    label(p2, R, 268, '腾空时间是正的：鼓励迈步时把脚抬起来', 'demo-x-mut', 10.5);
    var p3 = group(s);
    label(p3, R, 64, '代码：拆成 10 个 0.5 的小项', 'demo-x-ink', 14);
    label(p3, R, 92, '身体局部位姿 2.0 =', 'demo-x-ink2', 12);
    var segs = [['上身位置', C_ACCENT], ['上身朝向', C_ACCENT], ['下身位置', C_PURPLE], ['下身朝向', C_PURPLE]];
    var segR = segs.map(function (sg, i) {
      var r = paint(svgEl('rect', { x: R + i * 88, y: 104, width: 84, height: 30, rx: 4 }), sg[1]);
      r.style.opacity = 0.8; p3.appendChild(r);
      label(p3, R + i * 88 + 42, 123, sg[0], 'demo-x-ink', 11, 'middle');
      return r;
    });
    label(p3, R, 156, '每个小项权重 0.5，形如', 'demo-x-ink2', 12);
    math(p3, R + W / 2, 190, '0.5\\,\\exp(-\\text{误差的平均} / \\sigma)', 16, 'middle');
    label(p3, R, 226, '根部、速度、关节跟踪也都是两项各 0.5', 'demo-x-mut', 10.5);
    var p4 = group(s);
    label(p4, R, 64, '表 II：终止条件', 'demo-x-ink', 14);
    TERM.forEach(function (r, i) {
      chip(p4, R, 82 + i * 38, 150, r[0], i === 3 ? C_TGT : C_BAD, { size: 11.5, h: 30 });
      label(p4, R + 162, 82 + i * 38 + 20, r[1], 'demo-x-ink2', 11.5);
    });
    var cells4 = [];
    for (var i = 0; i < 25; i++) { var c = paint(svgEl('rect', { x: R + i * (W / 25), y: 246, width: W / 25 - 2, height: 12, rx: 2 }), C_SURFACE2, C_BORDER); p4.appendChild(c); cells4.push(c); }
    label(p4, R, 278, '每一项都要连续超标 25 步才终止', 'demo-x-mut', 10.5);
    var p5 = group(s);
    label(p5, R, 64, '代码和论文不同的两处', 'demo-x-ink', 14);
    var ob = [barRowAt(p5, R, 84, 110, '论文：物体朝向', C_MUTED, 16, 11), barRowAt(p5, R, 108, 110, '代码：物体朝向', C_BAD, 16, 11)];
    label(p5, R, 150, '奖励分四组，价值网络每组输出一个值', 'demo-x-ink2', 12);
    var groups5 = ['跟踪', '物体', '运动', '脚'].map(function (n, i) { return chip(p5, R + i * 88, 166, 80, n, [C_ACCENT, C_GOOD, C_MUTED, C_PURPLE][i], { size: 11.5, h: 28 }); });
    chip(p5, R + 96, 236, 160, '优势：四组加起来', C_TGT, { size: 11.5, h: 28 });
    var fl5 = [0, 1, 2, 3].map(function () { return flowSeg(p5, C_MUTED, 1, 2.8, 18, false); });
    void groups5;
    function draw(t, clock) {
      var now = nowOf(t, clock);
      rows.forEach(function (r, i) { var u = seg(t, 0.4 + i * 0.25, 0.9 + i * 0.25); r.set(REW_TRACK[i][1] / 5 * 200 * u, f1(REW_TRACK[i][1])); });
      rows.forEach(function (r, i) { r.bar.style.opacity = t >= 7.0 && t < 10.4 ? (i === 0 ? 1 : 0.3) : 1; });
      regG.forEach(function (g, i) { setOpacity(g, seg(since(t, clock, 3.6), 0.3 + i * 0.25, 0.7 + i * 0.25)); });
      segR.forEach(function (r, i) { r.style.opacity = clamp(seg(since(t, clock, 7.0), 0.4, 2.0) * 4 - i, 0, 1) * 0.85; });
      var run = Math.floor((since(t, clock, 10.4) * 12) % 34);
      cells4.forEach(function (c, i) { c.style.fill = i < Math.min(run, 25) ? (run >= 25 ? 'var(--demo-bad)' : 'var(--demo-warn)') : C_SURFACE2; });
      ob[0].set(1.2 / 1.2 * 150, '1.2 rad'); ob[1].set(0.8 / 1.2 * 150, '0.8 rad');
      fl5.forEach(function (f, i) { f.at(now + i * 0.2, [R + 40 + i * 88, 196], [R + 176, 234], true); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: 代码里的教师与学生（论文没写） ── */
  function buildSceneTeacher() {
    var s = sceneSvg('上面是官方代码里的训练结构：第一行是看特权信息的教师，加在参考关节角上的残差动作只在这里；第二行的适应模块从普通观测猜教师的特权特征；' +
      '第三行是学生的动作网络，模仿教师的动作均值；讲到哪一块就亮哪一块。之后下面是学生的 615 维观测和未来 5 帧参考的时间轴；' +
      '最后结构图淡出，按三块展开 615 维：同一台 G1（仿真回放第 4.70 s）上依次标出 16 个关键点与它们未来 5 帧的位置、29 个关节与角速度和重力，' +
      '物体那一块换成俯视图，画出箱子相对机器人的位置、朝向与两个接触点；右边按维数一格一格填满');
    s.appendChild(svgText(24, 26, '代码里的教师与学生（论文没写）', 'demo-x-ink2', 13.5));
    var Y1 = 56, Y2 = 148, Y3 = 240, BH = 44;
    var top = group(s); // 上面的结构图：展开 615 维时整块淡出
    function box(x, y, w, str, color) { return chip(top, x, y, w, str, color, { size: 14, h: BH }); }
    var tea = [box(20, Y1, 128, '特权观测', C_TGT), box(176, Y1, 100, '编码器', C_TGT), box(304, Y1, 130, '256 维特征', C_TGT), box(462, Y1, 150, '教师动作网络', C_TGT)];
    var plusT = group(top);
    ringAt(plusT, 646, Y1 + 22, 12, C_TGT, 2); label(plusT, 646, Y1 + 27.5, '+', 'demo-x-ink', 16, 'middle');
    var refJ = box(560, Y1 + 60, 116, '参考关节角', C_MUTED);
    var actT = box(680, Y1, 96, '动作', C_TGT);
    var ada = [box(20, Y2, 190, '普通观测（615 维）', C_ACCENT), box(238, Y2, 130, '适应模块', C_ACCENT), box(396, Y2, 140, '猜的 256 维', C_ACCENT)];
    var stu = [box(20, Y3, 260, '普通观测 + 猜的 256 维', C_GOOD), box(308, Y3, 160, '学生动作网络', C_GOOD), box(496, Y3, 96, '动作', C_GOOD)];
    var mse1 = group(top);
    var m1 = arrow(mse1, C_BAD, 1.8, '4 3'); m1.set(369, Y1 + BH + 2, 450, Y2 - 2, 8);
    label(mse1, 440, Y2 - 18, '均方误差', 'demo-x-ink2', 12.5, 'start');
    var mse2 = group(top);
    var m2 = arrow(mse2, C_BAD, 1.8, '4 3'); m2.set(740, Y1 + BH + 2, 596, Y3 + 8, 8);
    label(mse2, 664, Y3 - 6, '模仿均值', 'demo-x-ink2', 12.5, 'start');
    var flows = [];
    function link(a, b, y, color) { flows.push({ f: flowSeg(top, color, 2, 2.8, 24, true), a: [a, y], b: [b, y] }); }
    link(148, 176, Y1 + 22, C_TGT); link(276, 304, Y1 + 22, C_TGT); link(434, 462, Y1 + 22, C_TGT); link(612, 634, Y1 + 22, C_TGT); link(658, 680, Y1 + 22, C_TGT);
    link(210, 238, Y2 + 22, C_ACCENT); link(368, 396, Y2 + 22, C_ACCENT);
    link(280, 308, Y3 + 22, C_GOOD); link(468, 496, Y3 + 22, C_GOOD);
    /* 猜出来的 256 维接到学生的输入（2026-10-26 看片反馈：图里的输入要都连上） */
    flows.push({ f: flowSeg(top, C_ACCENT, 2, 2.8, 24, false), a: [452, Y2 + BH + 2], b: [262, Y3 - 2] });
    var rLine = arrow(top, C_MUTED, 1.4); rLine.set(646, Y1 + 60, 646, Y1 + 36, 6);
    var R = 24, W = 752, PY = 322;
    function two(g, l1, l2) { rich(g, R, PY, l1, 14.5, null, 'start', W); rich(g, R, PY + 28, l2, 14.5, null, 'start', W); }
    var p1 = group(s);
    two(p1, '论文只说用 PPO；官方代码分两步：先训特权教师，再蒸馏学生', '（问答里说借鉴了 ROA：正则化在线适应）');
    var p2 = group(s);
    two(p2, '教师：仿真里才拿得到的特权信息编码成 **256 维**', '残差动作只用在教师这里：修正量加在参考关节角上');
    var p3 = group(s);
    two(p3, '适应模块只看普通观测，去猜那 256 维', '学生动作网络用均方误差模仿教师的**均值**，不再加参考关节角');
    var p4 = group(s);
    two(p4, '第二步：学生自己再用 PPO 微调', '按 README 的流程，部署的应该是学生（我们的推断）');
    var p5 = group(s);
    label(p5, R, PY - 8, '学生看到的 615 维', 'demo-x-ink', 13.5);
    var tot = OBS_ALL, BX = R, BW = 440, by = PY + 4;
    [[OBS.cmd, '未来参考 + 相位 356', C_TGT], [OBS.prop, '本体感受 249', C_ACCENT], [OBS.obj, '物体 10', C_GOOD]].reduce(function (x, c) {
      var w = c[0] / tot * BW;
      p5.appendChild(paint(svgEl('rect', { x: x.toFixed(1), y: by, width: (w - 2).toFixed(1), height: 24, rx: 3 }), c[2]));
      label(p5, x + (c[0] === OBS.obj ? w + 6 : 6), by + 44, c[1], 'demo-x-ink2', 12, 'start');
      return x + w;
    }, BX);
    var TX = 540, TW = 230;
    label(p5, TX, PY - 8, '未来 5 帧参考（秒）', 'demo-x-ink', 13.5);
    hline(p5, TX, by + 12, TX + TW, by + 12, C_BORDER, 1.4);
    var futT = FUT_STEPS.map(function (k) {
      var x = TX + k * 0.02 / 0.64 * TW;
      var g = group(p5);
      hline(g, x, by + 2, x, by + 22, C_TGT, 3);
      return g;
    });
    label(p5, TX, by + 44, '0.02', 'demo-x-mut', 11, 'start');
    label(p5, TX + TW, by + 44, '0.64', 'demo-x-mut', 11, 'end');

    /* ── 展开 615 维（三段旁白各一块）：结构图淡出，左边同一台 G1（仿真回放第 4.70 s，贴图第 EX_J 帧），右边按维数一格一格填 ── */
    var CA = 16.0, CB = 31.1, CC = 48.1;
    /* 出场时刻按 WordBoundary 切词的时间写；视频里实际合成的三句比它慢 5–8%（14.76 / 14.04、16.70 / 15.98、9.36 / 8.65 s），按比例换算 */
    var SA = 14.76 / 14.04, SB = 16.70 / 15.98, SC = 9.36 / 8.65;
    var hdr = group(s);
    label(hdr, 776, 26, '学生的观测：共 615 维', 'demo-x-ink', 13.5, 'end');
    var hSegs = [], hx = 24, HW = 676;
    [[OBS.cmd, '未来参考 + 相位 356', C_TGT], [OBS.prop, '本体感受 249', C_ACCENT], [OBS.obj, '物体 10', C_GOOD]].forEach(function (c, i) {
      var w = c[0] / OBS_ALL * HW, g = group(hdr);
      g.appendChild(paint(svgEl('rect', { x: hx.toFixed(1), y: 38, width: Math.max(3, w - 2).toFixed(1), height: 12, rx: 3 }), c[2]));
      label(g, i === 2 ? hx + w + 6 : hx + 4, 68, c[1], 'demo-x-ink2', 12, 'start');
      hSegs.push(g);
      hx += w;
    });
    var bot10 = g1Mesh(hdr, 'rob'), cam10 = camAt(170, 216, 356), botOn = false;
    function P10(p) { return project([p[0] / 1000, p[1] / 1000, p[2] / 1000], cam10); }
    /* 一排格子：n 格、每格 w × h、间距 pitch；每 every 格多空 gap；返回格子数组 */
    function cellRow(parent, x, y, n, w, h, pitch, color, every, gap) {
      var out = [];
      for (var i = 0; i < n; i++) {
        var cx = x + i * pitch + (every ? Math.floor(i / every) * gap : 0);
        var r = paint(svgEl('rect', { x: cx.toFixed(1), y: y.toFixed(1), width: w, height: h, rx: 1.2 }), color);
        r.style.opacity = 0.15;
        parent.appendChild(r);
        out.push(r);
      }
      return out;
    }
    function fillCells(cells, a) { var v = (0.15 + 0.75 * a).toFixed(3); cells.forEach(function (c) { c.style.opacity = v; }); }
    var RX = 404, GX = 452;
    var FUT_LAB = FUT_STEPS.map(function (k) { return '+' + f2(k * 0.02) + ' s'; });

    // ① 未来参考 + 相位：16 个关键点（及其未来 5 帧）、23 个关节角 × 5、相位 1
    var pA = group(s);
    var kpNow = OBS10.kp[0].map(P10);
    var trailA = OBS10.kp[0].map(function (_, i) { return pathLine(pA, OBS10.kp.map(function (f) { return P10(f[i]); }), C_TGT, 1.1, '2 2'); });
    var ghostA = [1, 2, 3, 4, 5].map(function (k) { return OBS10.kp[k].map(function (p) { var q = P10(p); return dotAt(pA, q[0], q[1], 2.6, C_TGT); }); });
    var kpDots = kpNow.map(function (q) { var c = dotAt(pA, q[0], q[1], 4.2, C_TGT); c.style.stroke = '#fff'; c.style.strokeWidth = '1.2px'; return c; });
    var KP_PICK = 14; // 左手腕
    var pickRing = ringAt(pA, kpNow[KP_PICK][0], kpNow[KP_PICK][1], 9, C_BAD, 2);
    label(pA, RX, 92, '关键点位置：16 个 × 3（$x, y, z$）× 未来 5 帧', 'demo-x-ink', 12.5);
    var G1W = 324 / 16, rowsA1 = [], rowHiA = [];
    FUT_LAB.forEach(function (lab, r) {
      var y = 106 + r * 20;
      label(pA, GX - 6, y + 8.5, lab, 'demo-x-mut', 11, 'end');
      rowHiA.push(paint(svgEl('rect', { x: GX - 3, y: y - 2, width: 330, height: 13, rx: 3, fill: 'none', 'stroke-width': 1.4 }), null, C_TGT));
      pA.appendChild(rowHiA[r]);
      rowsA1.push(cellRow(pA, GX, y, 48, 5.4, 9, 6.15, C_TGT, 3, G1W - 3 * 6.15));
    });
    var pickBox = paint(svgEl('rect', { x: (GX + KP_PICK * G1W - 2.5).toFixed(1), y: 102, width: (3 * 6.15 + 3.6).toFixed(1), height: 97, rx: 3, fill: 'none', 'stroke-width': 1.8 }), null, C_BAD);
    pA.appendChild(pickBox);
    var cntA1 = label(pA, RX, 218, '每个点 3 维：$x, y, z$（红框是左手腕）', 'demo-x-ink2', 12.5);
    var cntA2 = label(pA, RX, 218, '$16 \\times 3 \\times 5 = 240$ 维', 'demo-x-ink', 13);
    var grpA2 = group(pA), rowsA2 = [];
    label(grpA2, RX, 242, '关节角：23 个（29 个去掉手腕的 6 个）× 未来 5 帧', 'demo-x-ink', 12.5);
    FUT_LAB.forEach(function (lab, r) {
      var y = 250 + r * 12.5;
      rowsA2.push(cellRow(grpA2, GX, y, 23, 12, 9, 324 / 23, C_TGT));
    });
    label(grpA2, GX - 6, 286, '5 帧', 'demo-x-mut', 11, 'end');
    var cntA3 = label(pA, RX, 330, '$23 \\times 5 = 115$ 维', 'demo-x-ink', 13);
    var grpA3 = group(pA);
    label(grpA3, RX, 352, '相位：参考已经播放的比例', 'demo-x-ink', 12.5);
    var PB0 = GX + 14, PBW = 776 - 24 - PB0;
    grpA3.appendChild(paint(svgEl('rect', { x: GX - 34, y: 364, width: 12, height: 10, rx: 1.2 }), C_TGT));
    grpA3.appendChild(paint(svgEl('rect', { x: PB0, y: 365, width: PBW, height: 8, rx: 4 }), C_SURFACE2));
    var phFill = paint(svgEl('rect', { x: PB0, y: 365, width: 0, height: 8, rx: 4 }), C_TGT);
    grpA3.appendChild(phFill);
    var phDot = dotAt(grpA3, PB0, 369, 5.5, C_TGT);
    phDot.style.stroke = '#fff'; phDot.style.strokeWidth = '1.4px';
    label(grpA3, PB0 - 8, 373, '0', 'demo-x-mut', 11, 'end');
    label(grpA3, PB0 + PBW + 8, 373, '1', 'demo-x-mut', 11, 'start');
    var phLab = label(grpA3, 776, 352, '这一帧约 0.5', 'demo-x-ink2', 11.5, 'end');
    var totA = label(pA, 776, 330, '$240 + 115 + 1 = 356$ 维', 'demo-x-ink', 14, 'end');

    // ② 本体感受：角速度、重力方向、29 个关节角的历史（第 0, 1, 2, 3, 4, 8 步）、前 3 步动作（23 维，没有手腕）
    var pB = group(s);
    var pel = P10(OBS10.pel);
    var gyro = group(pB);
    var gyEll = paint(svgEl('ellipse', { cx: pel[0], cy: pel[1], rx: 36, ry: 10, fill: 'none', 'stroke-width': 1.8, 'stroke-dasharray': '4 3' }), null, C_ACCENT);
    gyro.appendChild(gyEll);
    var gyDot = dotAt(gyro, pel[0] + 36, pel[1], 4.2, C_ACCENT);
    var grav = arrow(pB, C_ACCENT, 2.6);
    grav.set(pel[0], pel[1] + 4, pel[0], pel[1] + 74, 10);
    var jDots = OBS10.joints.map(function (p, i) { var q = P10(p), c = dotAt(pB, q[0], q[1], 3.3, C_ACCENT); c.style.stroke = '#fff'; c.style.strokeWidth = '1px'; return c; });
    var wristRings = [13, 26].map(function (i) { var q = P10(OBS10.joints[i + 1]); return ringAt(pB, q[0], q[1], 11, C_BAD, 2); });
    var grpB1 = group(pB), grpB2 = group(pB);
    label(grpB1, RX, 96, '根部角速度', 'demo-x-ink', 12.5);
    var cellsAng = cellRow(grpB1, RX + 76, 87, 3, 12, 10, 14, C_ACCENT);
    label(grpB2, 590, 96, '重力方向', 'demo-x-ink', 12.5);
    var cellsGrav = cellRow(grpB2, 590 + 64, 87, 3, 12, 10, 14, C_ACCENT);
    var grpB3 = group(pB);
    label(grpB3, RX, 128, '关节角：29 个 × 6 步', 'demo-x-ink', 12.5);
    /* 关节的格子按「上 23 个是动作里有的、下 6 个是手腕」排，和右边动作的 23 格上沿对齐 */
    var HP = 24, HX0 = RX, CH = 3.1, CP = 3.8, HY = 140, HIST = [8, 7, 6, 5, 4, 3, 2, 1, 0], USED = { 0: 5.8, 1: 6.8, 2: 7.2, 3: 7.6, 4: 8.1, 8: 8.6 };
    var histCols = {};
    HIST.forEach(function (k, c) {
      var x = HX0 + c * HP;
      if (USED[k] == null) {
        grpB3.appendChild(paint(svgEl('rect', { x: x, y: HY - 2, width: 18, height: 29 * CP + 3, rx: 3, fill: 'none', 'stroke-width': 1.1, 'stroke-dasharray': '3 3' }), null, C_BORDER));
      } else {
        var col = [];
        for (var r = 0; r < 29; r++) {
          var cell = paint(svgEl('rect', { x: x + 2, y: (HY + r * CP).toFixed(1), width: 14, height: CH, rx: 0.8 }), C_ACCENT);
          cell.style.opacity = 0.15;
          grpB3.appendChild(cell);
          col.push(cell);
        }
        histCols[k] = col;
      }
      label(grpB3, x + 9, HY + 29 * CP + 16, k === 0 ? '现在' : '−' + k, 'demo-x-mut', 11, 'middle');
    });
    var wristBr = group(pB);
    var WB_Y0 = HY + 23 * CP - 1, WB_Y1 = HY + 29 * CP;
    hline(wristBr, HX0 + 9 * HP - 2, WB_Y0, HX0 + 9 * HP - 2, WB_Y1, C_BAD, 2);
    hline(wristBr, HX0 - 4, WB_Y0 - 0.5, HX0 + 9 * HP - 2, WB_Y0 - 0.5, C_BAD, 1.2, '3 2');
    var cntB1 = label(pB, RX, 290, '$29 \\times 6 = 174$ 维（每步 0.02 s）', 'demo-x-ink', 13);
    var grpB4 = group(pB), actCols = [];
    label(grpB4, 660, 128, '前 3 步动作：23 个', 'demo-x-ink', 12.5);
    [3, 2, 1].forEach(function (k, c) {
      var x = 664 + c * HP, col = [];
      for (var r = 0; r < 23; r++) {
        var cell = paint(svgEl('rect', { x: x + 2, y: (HY + r * CP).toFixed(1), width: 14, height: CH, rx: 0.8 }), C_ACCENT);
        cell.style.opacity = 0.15;
        grpB4.appendChild(cell);
        col.push(cell);
      }
      actCols.push({ k: k, col: col });
      label(grpB4, x + 9, HY + 23 * CP + 16, '−' + k, 'demo-x-mut', 11, 'middle');
    });
    var cntB2 = label(pB, 660, 290, '$23 \\times 3 = 69$ 维', 'demo-x-ink', 13);
    var noteB = label(pB, RX, 318, '红线下面 6 格是手腕：在观测里，但不在动作里（$29 - 6 = 23$）', 'demo-x-ink2', 12);
    var totB = label(pB, 776, 372, '$3 + 3 + 174 + 69 = 249$ 维', 'demo-x-ink', 14, 'end');

    // ③ 物体：箱子的水平位置 2、朝向 2、两个接触点 6，都在机器人自己的坐标系里（原点在骨盆，只取水平朝向）
    var pC = group(s);
    /* 俯视图（这个相机几乎是平视，地面被压扁，画在 3D 贴图上看不出方向）：原点在骨盆，x 朝右（前）、y 朝上（左），每米 380 px；
       箱子画的是官方 suitcase-simplified.xml 碰撞盒（箱子坐标系里 x ∈ [−0.2, 0]、y ∈ [−0.15, 0.15]、z ∈ [0, 0.4]）从上往下看的轮廓；原点在离机器人远的那条底边中点 */
    var TO = [110, 250], TK = 380;
    function tv(x, y) { return [TO[0] + x * TK, TO[1] - y * TK]; }
    var hb = Math.atan2(OBS10.head[1], OBS10.head[0]), cb = Math.cos(hb), sb = Math.sin(hb);
    var frameC = group(pC);
    var axX = arrow(frameC, C_MUTED, 2.2), axY = arrow(frameC, C_MUTED, 2.2);
    axX.set(TO[0], TO[1], tv(0.66, 0)[0], TO[1], 9); axY.set(TO[0], TO[1], TO[0], tv(0, 0.4)[1], 9);
    label(frameC, tv(0.66, 0)[0], TO[1] + 20, '$x$ 朝前', 'demo-x-ink2', 12, 'end');
    label(frameC, TO[0] + 10, tv(0, 0.4)[1] + 6, '$y$ 朝左', 'demo-x-ink2', 12, 'start');
    var body = paint(svgEl('ellipse', { cx: TO[0], cy: TO[1], rx: 20, ry: 58, 'stroke-width': 1.4 }), C_SURFACE2, C_BORDER);
    frameC.appendChild(body);
    dotAt(frameC, TO[0], TO[1], 4.5, C_MUTED);
    label(frameC, TO[0] - 26, TO[1] + 4, '骨盆', 'demo-x-mut', 11.5, 'end');
    var xyC = group(pC);
    var boxPoly = paint(svgEl('path', { d: fmtPath(OBS10.hull.concat([OBS10.hull[0]]).map(function (q) { return tv(q[0], q[1]); })),
      'stroke-width': 1.6, opacity: 0.85 }), C_SURFACE2, C_GOOD);
    xyC.appendChild(boxPoly);
    var bO = tv(OBS10.xy[0], OBS10.xy[1]);
    hline(xyC, bO[0], bO[1], bO[0], TO[1], C_GOOD, 1.1, '3 3');
    var xyA = arrow(xyC, C_GOOD, 2.8);
    xyA.set(TO[0] + 6, TO[1] - 0.4, bO[0], bO[1], 10);
    var xyFlow = flowSeg(xyC, C_GOOD, 2, 2.6, 30, true);
    xyFlow.at(0, [TO[0] + 6, TO[1]], bO, false); // 没画到这一块之前也别停在原点
    dotAt(xyC, bO[0], bO[1], 4.5, C_GOOD);
    var headC = group(pC), hRef = arrow(headC, C_MUTED, 1.6, '3 3'), hBox = arrow(headC, C_GOOD, 2.6);
    var hEnd = tv(OBS10.xy[0] + 0.2 * cb, OBS10.xy[1] + 0.2 * sb);
    hRef.set(bO[0], bO[1], bO[0] + 0.2 * TK, bO[1], 7); hBox.set(bO[0], bO[1], hEnd[0], hEnd[1], 9);
    var arcR = 0.13 * TK;
    headC.appendChild(paint(svgEl('path', { d: 'M ' + (bO[0] + arcR).toFixed(1) + ' ' + bO[1].toFixed(1) + ' A ' + arcR + ' ' + arcR + ' 0 0 0 ' +
      (bO[0] + arcR * cb).toFixed(1) + ' ' + (bO[1] - arcR * sb).toFixed(1), fill: 'none', 'stroke-width': 1.6 }), null, C_GOOD));
    var conC = group(pC);
    var tgtP = OBS10.cb.map(function (c) { return tv(c[0], c[1]); });
    tgtP.forEach(function (q) { hline(conC, TO[0], TO[1], q[0], q[1], C_TGT, 1.4, '3 3'); });
    var tgtDots = tgtP.map(function (q) { var c = dotAt(conC, q[0], q[1], 5.5, C_TGT); c.style.stroke = '#fff'; c.style.strokeWidth = '1.2px'; return c; });
    label(conC, tgtP[0][0] - 10, tgtP[0][1] - 4, '左', 'demo-x-ink2', 12, 'end');
    label(conC, tgtP[1][0] + 8, tgtP[1][1] + 22, '右', 'demo-x-ink2', 12, 'start');
    label(pC, 24, 366, '俯视图：机器人自己的坐标系（仿真回放第 4.70 s）', 'demo-x-mut', 11.5);
    function vec(v) { return '(' + v.map(function (x) { return (x < 0 ? '−' : '') + f2(Math.abs(x)); }).join(', ') + ')'; }
    var rowsC = [
      ['箱子的水平位置', 2, C_GOOD, vec(OBS10.xy) + ' m', 1.0],
      ['朝向（余弦、正弦）', 2, C_GOOD, vec(OBS10.head) + '，夹角 ' + f2(Math.atan2(OBS10.head[1], OBS10.head[0])) + ' rad', 2.9],
      ['左手要接触的点', 3, C_TGT, vec(OBS10.cb[0]) + ' m', 4.8],
      ['右手要接触的点', 3, C_TGT, vec(OBS10.cb[1]) + ' m', 5.4]
    ].map(function (r, i) {
      var g = group(pC), y = 100 + i * 36;
      label(g, RX, y, r[0], 'demo-x-ink', 12.5);
      cellRow(g, 528, y - 10, r[1], 12, 10, 14, r[2]).forEach(function (c) { c.style.opacity = 0.9; });
      label(g, 582, y, r[3], 'demo-x-ink2', 12.5);
      return { g: g, at: r[4] };
    });
    var noteC1 = label(pC, RX, 244, '都在机器人自己的坐标系里：原点在骨盆，', 'demo-x-ink2', 12.5);
    var noteC2 = label(pC, RX, 266, '$x$ 朝前、$y$ 朝左，只跟着水平朝向', 'demo-x-ink2', 12.5);
    var hintC = readHint(pC, RX, 296, '俯视图：绿箭头指到箱子原点，绿弧是夹角，黄点是接触点', 11.5, 372);
    label(pC, RX, 340, '数是我们按这一帧算的（训练时还加了噪声）', 'demo-x-mut', 11.5);
    var totC = label(pC, 776, 372, '$2 + 2 + 3 + 3 = 10$ 维', 'demo-x-ink', 14, 'end');

    function drawObs(t, clock, now) {
      var on = win(t, CA);
      setOpacity(hdr, on);
      if (on <= 0) { setOpacity(pA, 0); setOpacity(pB, 0); setOpacity(pC, 0); return; }
      if (!botOn) { bot10.put(cam10, EX_J); botOn = true; }
      var act = t < CB ? 0 : t < CC ? 1 : 2;
      hSegs.forEach(function (g, i) { setOpacity(g, i === act ? 1 : 0.3); });
      var oA = win(t, CA, CB), oB = win(t, CB, CC), oC = win(t, CC);
      setOpacity(bot10.g, 1 - seg(t, CC, CC + 0.3));
      setOpacity(pA, oA); setOpacity(pB, oB); setOpacity(pC, oC);
      if (oA > 0) {
        var u = since(t, clock, CA) / SA, cyc = u > 6.6 ? Math.floor(now / 0.6) % 5 : -1;
        kpDots.forEach(function (c, i) { c.style.opacity = seg(u, 2.4 + i * 0.06, 2.5 + i * 0.06).toFixed(3); });
        ghostA.forEach(function (row, r) {
          var a = seg(u, 3.7 + r * 0.16, 3.85 + r * 0.16) * (cyc === r ? 1 : 0.75 - r * 0.1);
          row.forEach(function (c) { c.style.opacity = a.toFixed(3); c.setAttribute('r', cyc === r ? 3.6 : 2.6); });
          fillCells(rowsA1[r], seg(u, 3.7 + r * 0.16, 3.85 + r * 0.16));
          rowHiA[r].style.opacity = cyc === r ? 1 : 0;
          fillCells(rowsA2[r], seg(u, 8.5 + r * 0.16, 8.65 + r * 0.16));
        });
        trailA.forEach(function (p) { p.style.opacity = (0.55 * seg(u, 3.7, 4.5)).toFixed(3); });
        var pk = seg(u, 4.8, 5.0) * (1 - seg(u, 7.0, 7.3));
        setOpacity(pickRing, pk); setOpacity(pickBox, pk);
        setOpacity(cntA1, seg(u, 4.8, 5.0) * (1 - seg(u, 5.5, 5.75)));
        setOpacity(cntA2, seg(u, 5.8, 6.0));
        setOpacity(grpA2, seg(u, 7.1, 7.3));
        setOpacity(cntA3, seg(u, 9.5, 9.7));
        setOpacity(grpA3, seg(u, 10.5, 10.7));
        var ph = 0.5 * seg(u, 11.1, 11.8);
        phFill.setAttribute('width', (ph * PBW).toFixed(1));
        moveDot(phDot, [PB0 + ph * PBW, 369]);
        setOpacity(phLab, seg(u, 11.8, 12.0));
        setOpacity(totA, seg(u, 12.0, 12.3));
      }
      if (oB > 0) {
        var v = since(t, clock, CB) / SB;
        setOpacity(gyro, seg(v, 1.7, 1.9));
        moveDot(gyDot, [pel[0] + 36 * Math.cos(now * 3), pel[1] + 10 * Math.sin(now * 3)]);
        setOpacity(grav.g, seg(v, 2.9, 3.1));
        setOpacity(grpB1, seg(v, 1.7, 1.9)); setOpacity(grpB2, seg(v, 2.9, 3.1));
        fillCells(cellsAng, seg(v, 1.9, 2.2)); fillCells(cellsGrav, seg(v, 3.1, 3.4));
        var wr = seg(v, 14.2, 14.4);
        jDots.forEach(function (c, i) {
          c.style.opacity = seg(v, 4.3 + i * 0.025, 4.4 + i * 0.025).toFixed(3);
          c.style.fill = OBS10.wrist[i] && wr > 0.5 ? C_MUTED : C_ACCENT;
        });
        wristRings.forEach(function (c) { setOpacity(c, wr); });
        setOpacity(grpB3, seg(v, 4.3, 4.5));
        Object.keys(USED).forEach(function (k) { fillCells(histCols[k], seg(v, USED[k], USED[k] + 0.2)); });
        setOpacity(cntB1, seg(v, 9.1, 9.3));
        setOpacity(grpB4, seg(v, 10.6, 10.8));
        actCols.forEach(function (c, i) { fillCells(c.col, seg(v, 11.2 + i * 0.2, 11.4 + i * 0.2)); });
        setOpacity(cntB2, seg(v, 13.1, 13.3));
        setOpacity(totB, seg(v, 13.7, 13.9));
        setOpacity(wristBr, wr); setOpacity(noteB, wr);
      }
      if (oC > 0) {
        var w = since(t, clock, CC) / SC, em = seg(w, 6.9, 7.1);
        setOpacity(frameC, 0.55 + 0.45 * em);
        setOpacity(xyC, seg(w, 1.0, 1.2));
        xyFlow.at(now, [TO[0] + 6, TO[1]], bO, w >= 1.2);
        setOpacity(headC, seg(w, 2.9, 3.1));
        setOpacity(conC, seg(w, 4.8, 5.0));
        rowsC.forEach(function (r) { setOpacity(r.g, seg(w, r.at, r.at + 0.2)); });
        setOpacity(noteC1, em); setOpacity(noteC2, em); setOpacity(hintC, seg(w, 7.6, 7.8));
        setOpacity(totC, seg(w, 8.2, 8.4));
        tgtDots.forEach(function (c) { c.setAttribute('r', (5.5 + 1.2 * Math.max(0, Math.sin(now * 4))).toFixed(2)); });
      }
    }
    function draw(t, clock) {
      var now = nowOf(t, clock);
      flows.forEach(function (fl, i) { fl.f.at(now + i * 0.15, fl.a, fl.b, true); });
      var onT = t < 3.6 || (t >= 3.6 && t < 7.0) ? 1 : 0.35, onA = t >= 7.0 && t < 10.4 ? 1 : t < 3.6 ? 1 : 0.35, onS = t >= 7.0 ? 1 : t < 3.6 ? 1 : 0.35;
      tea.concat([plusT, actT, refJ]).forEach(function (g) { setOpacity(g, onT); });
      ada.forEach(function (g) { setOpacity(g, onA); });
      stu.forEach(function (g) { setOpacity(g, onS); });
      setOpacity(mse1, t >= 7.0 && t < 10.4 ? 1 : 0.25);
      setOpacity(mse2, t >= 7.0 && t < 10.4 ? 1 : 0.25);
      futT.forEach(function (g, i) { setOpacity(g, seg(since(t, clock, 13.4), 0.6 + i * 0.3, 0.9 + i * 0.3)); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4, CA));
      setOpacity(top, 1 - seg(t, CA, CA + 0.3));
      drawObs(t, clock, now);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 11: 上真机：动捕给位姿 ── */
  function buildSceneReal() {
    var s = sceneSvg('左边是论文图 4(a)：每轮起点不同，有木板和撤掉木板两种地面；右边依次出现：训练到部署的流程、动作捕捉的标记点贴在骨盆和物体上、' +
      '物体位姿换到根部坐标系、代码里的域随机化范围（小点在范围里跳动）、动作延迟和物体的随机化');
    s.appendChild(svgText(24, 26, '上真机：动作捕捉给位姿，零样本部署', 'demo-x-ink2', 13.5));
    paperPart(s, 'fig4', 0, 0, 0.6, 1, 24, 44, 380, '论文图 4(a)：开门穿门；每轮起点不同，有木板、撤掉木板');
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '训练到部署', 'demo-x-ink', 14);
    var ch1 = [['IsaacSim 里训练', C_ACCENT], ['所有任务同一套超参数', C_MUTED], ['不经微调', C_GOOD], ['宇树 G1', C_ACCENT]];
    ch1.forEach(function (c, i) { chip(p1, R, 82 + i * 46, W, c[0], c[1], { size: 12.5, h: 32 }); });
    var fl1 = [0, 1, 2].map(function () { return flowSeg(p1, C_MUTED, 2, 3, 20, true); });
    var p2 = group(s);
    label(p2, R, 64, '动作捕捉：标记点贴在骨盆和物体上', 'demo-x-ink', 14);
    /* 抱着箱子的 G1（仿真回放第 4.70 s），原先是火柴人；标记点按这一帧的骨盆和箱子位置投影 */
    var camM = camAt(102, R + 192, 234.6), fM = suitFrames()[EX_J].rob;
    var botM = g1Mesh(p2, 'rob', { crop: [118, 14, 224, 248] });
    var marks = [[0, 0.05, 0], [0, -0.05, 0]].map(function (d) { return project([fM.pel[0] + d[0], fM.pel[1] + d[1], fM.pel[2] + d[2]], camM); })
      .concat([[0, 0.12, 0.2], [0, -0.12, 0.2], [0, 0, 0.2]].map(function (d) { return project([fM.cen[0] + d[0], fM.cen[1] + d[1], fM.cen[2] + d[2]], camM); }));
    marks.forEach(function (p) { var c = dotAt(p2, p[0], p[1], 4, C_TGT); c.style.stroke = '#fff'; c.style.strokeWidth = '1px'; });
    var cams = [[R + 20, 96], [R + 330, 96]].map(function (p) { var r = paint(svgEl('rect', { x: p[0] - 10, y: p[1] - 7, width: 20, height: 14, rx: 3 }), C_MUTED); p2.appendChild(r); return p; });
    var rays = [];
    cams.forEach(function (c) { marks.forEach(function (m) { rays.push({ l: hline(p2, c[0], c[1], 0, 0, C_TGT, 0.8, '2 3'), c: c, m: m }); }); });
    label(p2, R, 266, '得到它们各自的全局位姿', 'demo-x-ink2', 12);
    var p3 = group(s);
    label(p3, R, 64, '换到机器人的根部坐标系', 'demo-x-ink', 14);
    chip(p3, R, 84, 150, '骨盆的全局位姿', C_ACCENT, { size: 12, h: 32 });
    chip(p3, R + 202, 84, 150, '物体的全局位姿', C_GOOD, { size: 12, h: 32 });
    chip(p3, R + 60, 148, 232, '物体相对根部的位姿', C_TGT, { size: 12, h: 32 });
    chip(p3, R + 60, 210, 232, '策略的输入（和训练时一样）', C_GOOD, { size: 12, h: 32 });
    var fl3 = [flowSeg(p3, C_ACCENT, 2, 3, 22, false), flowSeg(p3, C_GOOD, 2, 3, 22, false), flowSeg(p3, C_TGT, 2, 3, 22, false)];
    var p4 = group(s);
    label(p4, R, 64, '域随机化（代码里的范围）', 'demo-x-ink', 14);
    var rows4 = [
      rangeRow(p4, R, 100, W, '各部分质量', 0.9, 1.1, 0.8, 1.2, function (v) { return '× ' + f2(v); }, C_ACCENT),
      rangeRow(p4, R, 140, W, '手脚摩擦', 0.3, 1.6, 0, 2, function (v) { return f2(v); }, C_ACCENT),
      rangeRow(p4, R, 180, W, '质心偏移', -0.02, 0.02, -0.04, 0.04, function (v) { return sgn(f1(v * 100)) + ' cm'; }, C_ACCENT),
      rangeRow(p4, R, 220, W, '关节零位', -0.01, 0.01, -0.02, 0.02, function (v) { return sgn(f3(v)) + ' rad'; }, C_ACCENT)
    ];
    readHint(p4, R, 262, '色带是随机的范围，小点是这一次抽到的值', 10.5, W);
    var p5 = group(s);
    label(p5, R, 64, '还随机了这些', 'demo-x-ink', 14);
    var rows5 = [
      rangeRow(p5, R, 100, W, '动作延迟', 10, 30, 0, 40, function (v) { return f1(v) + ' ms'; }, C_PURPLE),
      rangeRow(p5, R, 140, W, '行李箱质量', 1.2, 1.8, 1.0, 2.0, function (v) { return f2(v) + ' kg'; }, C_GOOD),
      rangeRow(p5, R, 180, W, '行李箱尺寸', 0.9, 1.1, 0.8, 1.2, function (v) { return '× ' + f2(v); }, C_GOOD)
    ];
    label(p5, R, 222, '物体的质量和尺寸按任务各自设定', 'demo-x-mut', 10.5);
    readHint(p5, R, 248, '色带是随机的范围，小点是这一次抽到的值', 10.5, W);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      fl1.forEach(function (f, i) { f.at(now + i * 0.4, [R + W / 2, 82 + i * 46 + 34], [R + W / 2, 82 + (i + 1) * 46 - 2], true); });
      if (t >= 3.4) botM.put(camM, EX_J);
      rays.forEach(function (r, i) { setLine(r.l, r.c[0], r.c[1] + 8, r.m[0], r.m[1]); r.l.style.opacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * 3 + i)); });
      fl3[0].at(now, [R + 75, 118], [R + 140, 146], true);
      fl3[1].at(now + 0.3, [R + 277, 118], [R + 212, 146], true);
      fl3[2].at(now + 0.6, [R + 176, 182], [R + 176, 208], true);
      rows4.forEach(function (r, i) { r.at(since(t, clock, 10.4), 31 + i, 0.8); });
      rows5.forEach(function (r, i) { r.at(since(t, clock, 13.4), 41 + i, 0.8); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 开门穿门：连续 67 次 ── */
  var DOOR_PARTS = [[8.0, '加速剪辑：前几次'], [8.0, '第 68 次：摔倒']];
  function buildSceneDoor() {
    var s = sceneSvg('左边是项目页的加速剪辑：开门穿门一轮接一轮，画面里的计数一路走到 68，最后一段是第 68 次摔倒；右边依次出现：一轮的五个动作、' +
      '计数到 67、起点随机偏移 10 到 30 厘米、论文图 4 的有木板和撤掉木板、片段的说明');
    s.appendChild(svgText(24, 26, '开门穿门：连续 67 次', 'demo-x-ink2', 13.5));
    var clip = seqClip(s, 'door_run', 24, 44, 380, 214, '项目页视频（加速剪辑：35 分钟压成 108 秒）', DOOR_PARTS);
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '一轮：手和脚两种接触', 'demo-x-ink', 14);
    var steps = [['用手推开门', C_EEF], ['走过去', C_MUTED], ['转身', C_MUTED], ['用脚把门踢开', C_TGT], ['走回来', C_MUTED]];
    var stG = steps.map(function (c, i) { return chip(p1, R, 80 + i * 40, 200, c[0], c[1], { size: 12, h: 30 }); });
    var door1 = doorIcon(p1, R + 268, 120, 50, 110, C_ACCENT);
    label(p1, R + 293, 262, '同一个策略', 'demo-x-mut', 10.5, 'middle');
    var p2 = group(s);
    label(p2, R, 64, '连续成功', 'demo-x-ink', 14);
    var big = tone(p2, R, 148, '', C_ACCENT, 64, 'start');
    label(p2, R + 84, 146, '次', 'demo-x-ink2', 16);
    label(p2, R, 190, '约 34 分钟，第 68 次才失败', 'demo-x-ink2', 13);
    var p3 = group(s);
    label(p3, R, 64, '起点随机偏移', 'demo-x-ink', 14);
    var off = rangeRow(p3, R, 112, W, '每轮起点', 10, 30, 0, 40, function (v) { return f1(v) + ' cm'; }, C_TGT);
    label(p3, R, 166, '机器人自己调步子', 'demo-x-ink2', 12.5);
    label(p3, R, 190, '手抬到门上正确的位置', 'demo-x-ink2', 12.5);
    var p4 = group(s);
    label(p4, R, 64, '撤掉地上的木板之后', 'demo-x-ink', 14);
    paperPart(p4, 'fig4', 0.155, 0.06, 0.59, 0.83, R + 10, 80, 330, '');
    rich(p4, R, 300, '正文：又完成约 **7** 次；图 4：约 60 + 约 10 个来回', 11.5, null, 'start', W);
    var p5 = group(s);
    label(p5, R, 64, '左边的片段', 'demo-x-ink', 14);
    label(p5, R, 92, '项目页的加速剪辑：35 分钟压成 108 秒', 'demo-x-ink2', 12.5);
    /* 35 分钟的时间轴：每次成功落一根绿刻度，第 68 次是红的 */
    rectBox(p5, R, 108, W, 46, C_BORDER, C_SURFACE);
    var runTicks = [];
    for (var q = 0; q < 68; q++) runTicks.push(hline(p5, R + 8 + q * (W - 16) / 67, 114, R + 8 + q * (W - 16) / 67, 148, q < 67 ? C_GOOD : C_BAD, q < 67 ? 2 : 3.4));
    label(p5, R, 172, '0 分钟', 'demo-x-mut', 11);
    label(p5, R + W, 172, '约 35 分钟', 'demo-x-mut', 11, 'end');
    var runNo = label(p5, R, 204, '', 'demo-x-ink', 14);
    label(p5, R, 232, '绿：一次成功的来回；红：第 68 次摔倒', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var u12 = since(t, clock, 13.4), nRun = Math.floor(68 * seg(u12, 0.3, 3.0));
      runTicks.forEach(function (r, q) { r.style.opacity = q < nRun ? 1 : 0.12; });
      runNo.textContent = nRun > 0 ? (nRun < 68 ? '第 ' + nRun + ' 次：成功' : '第 68 次：摔倒') : '';
      clip.at(K.clipSince(t, 0), true);
      var k = Math.floor((now * 0.8) % 5);
      stG.forEach(function (g, i) { setOpacity(g, i === k ? 1 : 0.4); });
      door1.at(k === 0 || k === 3 ? 0.9 : k === 1 ? 1 : 0.15);
      big.textContent = countTo(67, seg(since(t, clock, 3.6), 0.3, 2.2));
      off.at(since(t, clock, 7.0), 5, 1.0);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 一排小块的流程（左 → 右），小点沿着走；返回 { g, at(秒) } */
  function chainRow(parent, x, y, items, h, gap, color) {
    var g = group(parent), xs = [], x0 = x;
    items.forEach(function (it) { chip(g, x0, y, it[1], it[0], it[2] || color || C_ACCENT, { size: 11.5, h: h || 30 }); xs.push([x0, x0 + it[1]]); x0 += it[1] + (gap || 18); });
    var fl = xs.slice(1).map(function () { return flowSeg(g, color || C_MUTED, 1, 2.8, 16, true); });
    return { g: g, at: function (sec) { fl.forEach(function (f, i) { f.at(sec + i * 0.25, [xs[i][1] + 1, y + (h || 30) / 2], [xs[i + 1][0] - 1, y + (h || 30) / 2], true); }); } };
  }

  /* ── scene 13: 搬箱子与楚门式鞠躬 ── */
  function buildSceneBox() {
    var s = sceneSvg('左边按旁白换项目页的真机片段：跪下搬纸箱、搬面包箱、搬泡沫垫、楚门式鞠躬；右边依次出现每个任务的动作流程和结果');
    s.appendChild(svgText(24, 26, '搬箱子与楚门式鞠躬', 'demo-x-ink2', 13.5));
    var cl = [
      projClip(s, 'box_real', 24, 44, 380, 214, '项目页视频：跪下搬纸箱（参考是 OMOMO 的搬行李箱）'),
      projClip(s, 'bread_real', 24, 44, 380, 214, '项目页视频：从人手里接过面包箱，转身再递回去'),
      projClip(s, 'foam_real', 24, 44, 380, 214, '项目页视频：搬泡沫垫（完整一段）', { loop: false }),
      projClip(s, 'truman_real', 24, 44, 380, 214, '项目页视频：楚门式鞠躬（完整一段）', { loop: false })
    ];
    var f5 = group(s);
    paperPart(f5, 'fig5', 0, 0, 1, 1, 24, 290, 380, '论文图 5：上台阶、鞠躬、坐下、挥手');
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '搬箱子：跪下、抓住、抬起、带着走', 'demo-x-ink', 14);
    var c1 = chainRow(p1, R, 84, [['跪下', 62], ['抓住', 62], ['抬起', 62], ['带着走', 80]], 32, 22);
    label(p1, R, 152, '参考：OMOMO 数据集的搬行李箱', 'demo-x-ink2', 12.5);
    label(p1, R, 176, '真机上搬的是一个纸箱', 'demo-x-ink2', 12.5);
    var p2 = group(s);
    label(p2, R, 64, '搬箱子：结果', 'demo-x-ink', 14);
    var big = tone(p2, R, 144, '', C_GOOD, 60, 'start');
    label(p2, R + 70, 118, '次连续成功', 'demo-x-ink2', 15);
    label(p2, R, 184, '跪下、抬起、带着负载走，衔接顺畅', 'demo-x-ink2', 12.5);
    var p3 = group(s);
    label(p3, R, 64, '搬面包箱', 'demo-x-ink', 14);
    var big3 = tone(p3, R, 142, '2', C_ACCENT, 56, 'start');
    label(p3, R + 52, 118, '次完整做完', 'demo-x-ink2', 15);
    label(p3, R, 176, '难点：快速转身 180°', 'demo-x-ink2', 12.5);
    label(p3, R, 200, '两条腿偶尔会碰到一起', 'demo-x-ink2', 12.5);
    var spin = group(p3), sp = arrow(spin, C_BAD, 2.4);
    ringAt(spin, R + 290, 150, 30, C_BORDER, 1.4);
    var p4 = group(s);
    label(p4, R, 64, '搬泡沫垫', 'demo-x-ink', 14);
    var c4 = chainRow(p4, R, 84, [['走过去', 72], ['抓起', 56], ['侧着走', 72], ['放下', 56]], 32, 18);
    label(p4, R, 152, '一摞泡沫垫，放在凳子上', 'demo-x-ink2', 12.5);
    var p5 = group(s);
    label(p5, R, 64, '楚门式鞠躬：一个长序列', 'demo-x-ink', 14);
    var c5a = chainRow(p5, R, 82, [['上台阶', 70], ['鞠躬', 56], ['坐下', 56], ['挥手', 56]], 30, 14);
    var c5b = chainRow(p5, R, 124, [['跳下', 56], ['走回来', 70]], 30, 14);
    label(p5, R, 186, '整段连续完成 3 次', 'demo-x-ink2', 13);
    label(p5, R, 210, '上台阶有风险，操作员偶尔在背后轻扶', 'demo-x-mut', 11);
    label(p5, R, 234, '名字我们猜是在致敬电影《楚门的世界》', 'demo-x-mut', 10.5);
    /* 泡沫垫（13.1 s）和楚门式鞠躬（23.0 s）两段整段放完再换：旁白讲完后画面接着放（2026-10-26 看片反馈） */
    var T_TRU = 24.0;
    var WIN = [[0, 7.0], [7.0, 10.4], [10.4, T_TRU], [T_TRU, null]], CUE = [0, 7.0, 10.4, T_TRU];
    function draw(t, clock) {
      var now = nowOf(t, clock);
      cl.forEach(function (c, i) {
        var a = WIN[i][0], b = WIN[i][1], vis = t >= a && (b == null || t < b);
        setOpacity(c.g, i === 0 ? (b == null ? 1 : 1 - seg(t, b, b + 0.3)) : win(t, a, b));
        c.at(K.clipSince(t, CUE[i]), vis);
      });
      setOpacity(f5, win(t, T_TRU));
      c1.at(now); c4.at(now); c5a.at(now); c5b.at(now);
      big.textContent = countTo(7, seg(since(t, clock, 3.6), 0.3, 1.6));
      big3.textContent = countTo(2, seg(since(t, clock, 7.0), 0.3, 1.2));
      var ang = now * 2.2, cx = R + 290, cy = 150;
      sp.set(cx + 30 * Math.cos(ang - 0.6), cy + 30 * Math.sin(ang - 0.6), cx + 30 * Math.cos(ang), cy + 30 * Math.sin(ang), 9);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, T_TRU));
      setOpacity(p5, win(t, T_TRU));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 14: 仿真里的 14 个任务 ── */
  var SIM_PARTS = [[4.5, '用手推门'], [4.5, '用脚开门'], [4.5, '打开折叠椅坐下'], [4.5, '推着大球滚'], [4.5, '推倒木板走过去'], [4.5, '箱子扛上肩'],
    [4.5, '搬凳子'], [4.5, '楚门式鞠躬'], [4.5, '搬面包箱'], [4.5, '推大箱子'], [4.5, '搬泡沫垫'], [3.6, '搬行李箱']];
  /* 各段的起点按旁白的实际长度排（11.7 / 6.5 / 7.6 / 8.2 s），最后一段拉长到 12 个任务放完（0.4 + 53.1 s）：
     原先这一幕 16 s、视频里约 43 s，片段只放到第 10 个，旁白念到的搬泡沫垫、搬行李箱没出现（2026-10-26 看片反馈） */
  var SIM_B = [0, 11.7, 18.2, 25.8, 34.0];
  function buildSceneSim() {
    var s = sceneSvg('左边是项目页的仿真视频，12 个任务按 2.5 倍速一个接一个放，下面标着放到第几个；右边依次出现：14 个仿真任务、' +
      '放到哪个任务哪个格子就亮、14 个里 6 个上了真机和原因、消融用的 8 个任务');
    s.appendChild(svgText(24, 26, '仿真里的 14 个任务：同一个框架', 'demo-x-ink2', 13.5));
    var clip = seqClip(s, 'sim_tasks', 24, 44, 380, 214, '项目页仿真视频（我们按 2.5 倍速播放）', SIM_PARTS);
    var tot = 0; SIM_PARTS.forEach(function (p) { tot += p[0]; });
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '仿真：14 个任务', 'demo-x-ink', 14);
    var dots1 = [];
    for (var i = 0; i < 14; i++) dots1.push(dotAt(p1, R + 16 + i * 24, 100, 8, C_ACCENT));
    chip(p1, R, 128, W, '同一个框架、同一套超参数', C_GOOD, { size: 12.5, h: 32 });
    label(p1, R, 190, '官方仓库里有其中 13 个的配置', 'demo-x-mut', 11);
    var p2 = group(s);
    label(p2, R, 64, '左边正在放', 'demo-x-ink', 14);
    var grid = SIM_PARTS.map(function (p, k) { return chip(p2, R + (k % 3) * 118, 80 + Math.floor(k / 3) * 44, 110, p[1], C_ACCENT, { size: 11, h: 34 }); });
    var p4 = group(s);
    label(p4, R, 64, '14 个里 6 个上了真机', 'demo-x-ink', 14);
    var dots4 = [];
    for (i = 0; i < 14; i++) dots4.push(dotAt(p4, R + 16 + i * 24, 98, 8, i < 6 ? C_GOOD : C_MUTED));
    chip(p4, R, 124, W, '球上没法贴动作捕捉标记点', C_MUTED, { size: 12, h: 32 });
    chip(p4, R, 166, W, '没有靠背结实的折叠椅', C_MUTED, { size: 12, h: 32 });
    label(p4, R, 222, '出处：官方仓库的问答', 'demo-x-mut', 10.5);
    var p5 = group(s);
    label(p5, R, 64, '消融用其中 8 个', 'demo-x-ink', 14);
    var g5 = TASKS.map(function (n, k) { return chip(p5, R + (k % 2) * 180, 80 + Math.floor(k / 2) * 38, 172, n, C_ACCENT, { size: 11.5, h: 30 }); });
    label(p5, R, 248, 'IsaacSim · 4096 个并行环境', 'demo-x-ink2', 12);
    label(p5, R, 272, '从参考开头开始，不触发终止就算成功', 'demo-x-mut', 10.5);
    function draw(t, clock) {
      var sec = K.clipSince(t, 0.4);
      clip.at(sec, true);
      var m = ((Math.max(0, sec) % tot) + tot) % tot, idx = 0, a = 0;
      SIM_PARTS.forEach(function (p, k) { if (m >= a) idx = k; a += p[0]; });
      grid.forEach(function (g, k) { setOpacity(g, k === idx ? 1 : 0.3); });
      dots1.forEach(function (d, k) { d.style.opacity = clamp(seg(since(t, clock, 0.4), 0.3, 1.8) * 14 - k, 0, 1); });
      dots4.forEach(function (d, k) { d.style.opacity = clamp(seg(since(t, clock, SIM_B[3]), 0.3, 1.8) * 14 - k, 0, 1); });
      g5.forEach(function (g, k) { setOpacity(g, seg(since(t, clock, SIM_B[4]), 0.3 + k * 0.15, 0.6 + k * 0.15)); });
      setOpacity(p1, win(t, 0.3, SIM_B[1]));
      setOpacity(p2, win(t, SIM_B[1], SIM_B[3]));
      setOpacity(p4, win(t, SIM_B[3], SIM_B[4]));
      setOpacity(p5, win(t, SIM_B[4]));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 15: 交互奖励的消融（图 6） ── */
  function buildSceneAblRew() {
    var s = sceneSvg('论文图 6 重画成分组柱状图：8 个任务，每组三根柱，蓝色有交互奖励和接触终止，红色只去掉交互奖励，绿色两个都去掉；' +
      '柱子从零长到最终成功率，讲到哪组就亮哪组，最后圈出两个成功率为零的地方');
    s.appendChild(svgText(24, 26, '交互奖励的消融：8 个任务的成功率（图 6）', 'demo-x-ink2', 13.5));
    legendRow(s, 110, 56, [['有交互奖励 + 接触终止', V_COLOR[0], 132], ['只去掉交互奖励', V_COLOR[1], 92], ['两个都去掉', V_COLOR[2], 66]], 11);
    var CX = 60, CY = 82, CW = 700, CH = 180;
    [0, 0.5, 1].forEach(function (v) {
      hline(s, CX, CY + CH - v * CH, CX + CW, CY + CH - v * CH, C_BORDER, 0.8, '2 3');
      label(s, CX - 6, CY + CH - v * CH + 3.5, v.toFixed(1), 'demo-x-mut', 9.5, 'end');
    });
    label(s, 24, 58, '成功率', 'demo-x-ink2', 10.5);
    var gb = groupedBars(s, CX, CY, CW, CH, TASKS, { bw: 18, catSize: 10.5 });
    var circles = [[0, 2], [2, 1], [2, 2]].map(function (ik) {
      var gw = CW / 8, cx = CX + ik[0] * gw + gw / 2 - 1.5 * 18 + ik[1] * 18 + 8;
      return ringAt(s, cx, CY + CH - 16, 10, C_BAD, 2.4);
    });
    var caps = [
      '三种训练：**蓝**有交互奖励和接触终止，**红**只去掉交互奖励，**绿**两个都去掉',
      '**读法**　横轴是 8 个任务，纵轴是最终成功率，越高越好；评测时都不开接触终止',
      '大多数任务三种差不多：用手推门、用脚开门、打开折叠椅坐下，三种都在 0.99 以上',
      '搬行李箱：两个都去掉是 **0**；箱子扛上肩：去掉交互奖励就是 **0**（我们从矢量图读的）',
      '8 个任务平均：0.99 / 0.87 / 0.75。论文：关键在**参考不准**和**接触位置要准**两类任务'
    ];
    var capN = caps.map(function (c) { return rich(s, 24, 318, c, 12.5, 'demo-x-ink', 'start', 752); });
    var BEST = [3, 4, 6];
    function draw(t) {
      gb.set(FIG6, 1, seg(t, 0.4, 2.4));
      TASKS.forEach(function (n, i) {
        var on = t >= 7.0 && t < 10.4 ? (BEST.indexOf(i) >= 0 ? 1 : 0.3) : t >= 10.4 && t < 13.4 ? (i === 0 || i === 2 ? 1 : 0.3) : 1;
        gb.dim(i, on);
      });
      circles.forEach(function (c) { c.style.opacity = win(t, 10.4, 13.4); });
      var w = [win(t, 0.3, 3.6), win(t, 3.6, 7.0), win(t, 7.0, 10.4), win(t, 10.4, 13.4), win(t, 13.4)];
      capN.forEach(function (n, i) { setOpacity(n, w[i]); });
    }
    return { el: s, draw: draw };
  }

  /* ── scene 16: 交互奖励管什么（图 7） ── */
  function buildSceneWhy() {
    var s = sceneSvg('左边先是论文图 7b：不完美参考里手没碰到箱子，有交互奖励的策略抓牢了，没有的抓不起来，下排是用回放录下的完美参考；右边是图 7a 的训练曲线。' +
      '然后左边换成官方数据的三维回放：左为原始参考，右为仿真回放，黄点是接触点、紫点是手、红线是距离；最后是论文图 7c 推大箱子和打开接触终止评测的成功率');
    s.appendChild(svgText(24, 26, '交互奖励管什么：参考不准、接触要准（图 7）', 'demo-x-ink2', 13.5));
    var L1 = group(s);
    var fb = paperPart(L1, 'fig7b', 0, 0, 1, 1, 24, 44, 380, '论文图 7b：上排不完美参考，下排完美参考');
    var hbTop = figBox(L1, fb, 0.02, 0.02, 0.99, 0.52, C_BAD), hbBot = figBox(L1, fb, 0.02, 0.52, 0.99, 0.99, C_GOOD);
    var L2 = group(s);
    var GK = 128 / 170;
    var camA = camAt(128, 24 + 208 * GK, 58 + 245 * GK), camB = camAt(128, 300 + 208 * GK, 58 + 245 * GK);
    var refBot = g1Mesh(L2, 'ref'), robBot = g1Mesh(L2, 'rob');
    var ovA = contactOverlay(L2, { r: 5.5, lw: 1.8 }), ovB = contactOverlay(L2, { r: 5.5, lw: 1.8 });
    label(L2, 24 + 146, 52, '原始参考（OMOMO）', 'demo-x-ink2', 13, 'middle');
    label(L2, 300 + 146, 52, '仿真回放（官方仓库）', 'demo-x-ink2', 13, 'middle');
    var dA = label(L2, 24 + 146, 274, '', 'demo-x-ink', 13, 'middle'), dB = label(L2, 300 + 146, 274, '', 'demo-x-ink', 13, 'middle');
    var bars2 = [barRowAt(L2, 24, 290, 150, '参考：左手 / 右手', C_BAD, 15, 12), barRowAt(L2, 24, 312, 150, '', C_BAD, 15, 12),
      barRowAt(L2, 24, 340, 150, '回放：左手 / 右手', C_GOOD, 15, 12), barRowAt(L2, 24, 362, 150, '', C_GOOD, 15, 12)];
    label(L2, 24, 400, '要接触的 56 帧里，手离接触点的平均距离（我们按官方数据算的）', 'demo-x-mut', 11.5);
    var L3 = group(s);
    paperPart(L3, 'fig7c', 0, 0, 1, 1, 24, 52, 380, '论文图 7c：左有交互奖励，L 形末端卡在箱沿；右没有，按在侧面');
    var R = 424, W = 352;
    var P1 = group(s);
    label(P1, R, 64, '第一类：参考不准', 'demo-x-ink', 14);
    chip(P1, R, 82, W, '(a) 重定向出来的手没碰到箱子', C_MUTED, { size: 12, h: 30, left: true });
    chip(P1, R, 120, W, '(b) 有交互奖励：偏离参考，把箱子抓牢', C_ACCENT, { size: 12, h: 30, left: true });
    chip(P1, R, 158, W, '(c) 没有：照着错的参考做，抓不起来', C_GOOD, { size: 12, h: 30, left: true });
    var P2 = group(s);
    label(P2, R, 64, '图 7a：搬行李箱（不完美参考）', 'demo-x-ink', 13.5);
    var spA = stepPlot(P2, R + 24, 80, W - 30, 150, 0, 1, [0, 0.5, 1]);
    var lA = ['b', 'r', 'g'].map(function (k, i) { return pathLine(P2, [], V_COLOR[i], 2.4); });
    readHint(P2, R, 268, '横轴是训练步数，纵轴是成功率；颜色同图 6', 10.5, W);
    /* 隔了一幕，观众已经记不住图 6 的颜色了：图例再列一遍（2026-10-26 看片反馈） */
    var LEG16 = [['完整方法', V_COLOR[0], 52], ['只去掉交互奖励', V_COLOR[1], 92], ['两个都去掉', V_COLOR[2], 66]];
    legendRow(P2, R, 294, LEG16, 11);
    var P3 = group(s);
    label(P3, R, 64, '图 7a：换成完美参考重训', 'demo-x-ink', 13.5);
    var spB = stepPlot(P3, R + 24, 80, W - 30, 150, 0, 1, [0, 0.5, 1]);
    var lB = ['b', 'r', 'g'].map(function (k, i) { return pathLine(P3, [], V_COLOR[i], 2.4); });
    label(P3, R, 268, '三种都能成功：交互奖励管的正是参考不准', 'demo-x-ink2', 11.5);
    legendRow(P3, R, 294, LEG16, 11);
    var P4 = group(s), R4 = 604;
    label(P4, R4, 76, '官方数据', 'demo-x-ink', 14);
    ['仓库里录下的一段仿真回放', '帧数 = 参考去掉前 25 帧', '接触标签逐帧相同'].forEach(function (str, i) { label(P4, R4, 104 + i * 24, str, 'demo-x-ink2', 12.5); });
    label(P4, R4, 190, '我们推断：它就是', 'demo-x-ink2', 12.5);
    label(P4, R4, 214, '图 7b 的「完美参考」', 'demo-x-ink2', 12.5);
    legendRow(P4, R4, 246, [['接触点', C_TGT, 52], ['手', C_EEF, 30]], 11.5);
    legendRow(P4, R4, 268, [['红色虚线：两者的距离', C_ERR, 124]], 11.5);
    var P5 = group(s);
    label(P5, R, 64, '第二类：接触位置要准', 'demo-x-ink', 14);
    label(P5, R, 88, '推大箱子，评测时打开接触终止：', 'demo-x-ink2', 12);
    var b5 = [0, 1, 2].map(function (k) { return barRowAt(P5, R, 106 + k * 30, 150, ['有交互奖励 + 接触终止', '只去掉交互奖励', '两个都去掉'][k], V_COLOR[k], 18, 11); });
    readHint(P5, R, 218, '条越长成功率越高；第 1100 步的读数', 10.5, W);
    label(P5, R, 244, '不开接触终止评测时，三种都在 0.96 以上', 'demo-x-mut', 10.5);
    var refStats = contactStats('ref'), robStats = contactStats('rob');
    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(L1, t < 10.4 ? 1 : 1 - seg(t, 10.4, 10.7));
      hbTop.style.opacity = t < 7.0 ? 1 : 0; hbBot.style.opacity = t >= 7.0 && t < 10.4 ? 1 : 0;
      setOpacity(L2, win(t, 10.4, 13.4));
      setOpacity(L3, win(t, 13.4));
      var j = loopFrame(now, 40, 112), F = suitFrames(), f = F[j];
      refBot.put(camA, j); robBot.put(camB, j);
      ovA.put(f, 'ref', camA); ovB.put(f, 'rob', camB);
      var da = handDist(f, 'ref'), db = handDist(f, 'rob');
      dA.textContent = f.c ? '左 ' + f1(da[0] * 100) + ' / 右 ' + f1(da[1] * 100) + ' cm' : '不用接触';
      dB.textContent = f.c ? '左 ' + f1(db[0] * 100) + ' / 右 ' + f1(db[1] * 100) + ' cm' : '不用接触';
      var u = seg(since(t, clock, 10.4), 0.3, 1.5), K2 = 2400;
      bars2[0].set(refStats.mean[0] * K2 * u, f1(refStats.mean[0] * 100) + ' cm');
      bars2[1].set(refStats.mean[1] * K2 * u, f1(refStats.mean[1] * 100) + ' cm');
      bars2[2].set(robStats.mean[0] * K2 * u, f1(robStats.mean[0] * 100) + ' cm');
      bars2[3].set(robStats.mean[1] * K2 * u, f1(robStats.mean[1] * 100) + ' cm');
      var uA = seg(since(t, clock, 3.6), 0.3, 2.6), uB = seg(since(t, clock, 7.0), 0.3, 2.6);
      ['b', 'r', 'g'].forEach(function (k, i) { spA.upto(lA[i], FIG7A.imperfect[k], uA); spB.upto(lB[i], FIG7A.perfect[k], uB); });
      var fin = [FIG7A.boxOn.b[10], FIG7A.boxOn.r[10], FIG7A.boxOn.g[10]], u5 = seg(since(t, clock, 13.4), 0.3, 1.5);
      b5.forEach(function (b, k) { b.set(fin[k] * 150 * u5, f3(fin[k])); });
      setOpacity(P1, win(t, 0.3, 3.6));
      setOpacity(P2, win(t, 3.6, 7.0));
      setOpacity(P3, win(t, 7.0, 10.4));
      setOpacity(P4, win(t, 10.4, 13.4));
      setOpacity(P5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 17: 残差动作的消融（图 8、图 9） ── */
  function buildSceneAblRes() {
    var s = sceneSvg('先是三种训练的说明；然后是论文图 8 重画的分组柱状图（8 个任务的关节位置误差，越低越好），三项误差的平均；' +
      '再是图 9a 的两条训练曲线：关节误差与成功率；最后是论文图 9b：有残差动作的跪下去抓箱子，没有的双脚平放、靠弯腰去够');
    s.appendChild(svgText(24, 26, '残差动作的消融（图 8、图 9）', 'demo-x-ink2', 13.5));
    var P1 = group(s);
    [['完整方法：残差动作 + 身体误差终止', C_ACCENT, '动作加在参考关节角上'], ['去掉残差动作', C_BAD, '动作改成相对默认站姿'], ['两个都去掉', C_GOOD, '只留根部误差终止，免得采到一堆躺在地上的样本']].forEach(function (r, i) {
      chip(P1, 24, 60 + i * 64, 300, r[0], r[1], { size: 12.5, h: 40, left: true });
      label(P1, 340, 60 + i * 64 + 25, r[2], 'demo-x-ink2', 12);
    });
    label(P1, 24, 270, '评测时去掉身体误差终止', 'demo-x-mut', 11);
    var P2 = group(s);
    legendRow(P2, 220, 56, [['残差 + 终止', V_COLOR[0], 72], ['去掉残差', V_COLOR[1], 56], ['两个都去掉', V_COLOR[2], 66]], 11);
    var CX = 60, CY = 78, CW = 700, CH = 180;
    [0, 0.1, 0.2].forEach(function (v) {
      hline(P2, CX, CY + CH - v / 0.25 * CH, CX + CW, CY + CH - v / 0.25 * CH, C_BORDER, 0.8, '2 3');
      label(P2, CX - 6, CY + CH - v / 0.25 * CH + 3.5, v.toFixed(1), 'demo-x-mut', 9.5, 'end');
    });
    label(P2, 24, CY - 6, '关节位置误差（rad）', 'demo-x-ink2', 10.5);
    var gb = groupedBars(P2, CX, CY, CW, CH, TASKS, { bw: 18, catSize: 10.5 });
    var trans = function (k) { return TASKS.map(function (n, i) { return [FIG8[k].v[0][i], FIG8[k].v[1][i], FIG8[k].v[2][i]]; }); };
    readHint(P2, 24, 312, '横轴是 8 个任务，纵轴是关节位置误差，越低越好；身体位置、朝向两张图一样，蓝色 24 个数全是最低', 11.5, 752);
    var P3 = group(s);
    label(P3, 24, 60, '8 个任务的平均（我们按图 8 的读数算的）', 'demo-x-ink', 13.5);
    var keys = ['joint', 'bpos', 'bori'];
    var avgRows = [];
    keys.forEach(function (k, i) {
      label(P3, 24, 104 + i * 72, FIG8[k].zh + '（' + FIG8[k].unit + '）', 'demo-x-ink2', 12);
      for (var v = 0; v < 3; v++) avgRows.push({ k: k, v: v, b: barRowAt(P3, 200, 84 + i * 72 + v * 21, 0, '', V_COLOR[v], 14, 11) });
    });
    var P4 = group(s);
    label(P4, 24, 60, '图 9a：训练过程', 'demo-x-ink', 13.5);
    var sp1 = stepPlot(P4, 60, 76, 310, 170, 0.1, 0.35, [0.1, 0.2, 0.3]), sp2 = stepPlot(P4, 444, 76, 310, 170, 0, 1, [0, 0.5, 1]);
    label(P4, 215, 69, '关节位置误差（越低越好）', 'demo-x-ink2', 11, 'middle');
    label(P4, 599, 69, '成功率（越高越好）', 'demo-x-ink2', 11, 'middle');
    var l1 = [0, 1, 2].map(function (i) { return pathLine(P4, [], V_COLOR[i], 2.4); }), l2 = [0, 1, 2].map(function (i) { return pathLine(P4, [], V_COLOR[i], 2.4); });
    readHint(P4, 24, 290, '横轴是训练步数；论文没写是哪个任务', 11, 752);
    var P5 = group(s);
    paperPart(P5, 'fig9b', 0, 0, 1, 1, 24, 48, 380, '论文图 9b：上排有残差动作，下排没有（框出腿）');
    label(P5, 424, 70, '搬行李箱：两个都去掉的策略', 'demo-x-ink', 13.5);
    chip(P5, 424, 88, 352, '学不会跪下', C_GOOD, { size: 12.5, h: 32 });
    chip(P5, 424, 130, 352, '双脚平放，靠弯腰去够箱子', C_GOOD, { size: 12.5, h: 32 });
    chip(P5, 424, 186, 352, '有残差动作：稳稳跪下去', C_ACCENT, { size: 12.5, h: 32 });
    function draw(t, clock) {
      gb.set(trans('joint'), 0.25, seg(since(t, clock, 3.6), 0.3, 2.0));
      avgRows.forEach(function (r) { var m = mean(FIG8[r.k].v[r.v]), mx = r.k === 'bori' ? 0.3 : r.k === 'bpos' ? 0.08 : 0.18; r.b.set(m / mx * 260 * seg(since(t, clock, 7.0), 0.3, 1.6), f3(m)); });
      var u4 = seg(since(t, clock, 10.4), 0.3, 2.6);
      ['b', 'r', 'g'].forEach(function (k, i) { sp1.upto(l1[i], FIG9A.err[k], u4); sp2.upto(l2[i], FIG9A.succ[k], u4); });
      setOpacity(P1, win(t, 0.3, 3.6));
      setOpacity(P2, win(t, 3.6, 7.0));
      setOpacity(P3, win(t, 7.0, 10.4));
      setOpacity(P4, win(t, 10.4, 13.4));
      setOpacity(P5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 18: 局限与之后 ── */
  function buildSceneLimits() {
    var s = sceneSvg('左边是官方回放的三维渲染，骨盆和箱子上闪着动作捕捉的标记点；右边依次出现：依赖动作捕捉、下一步换成机载相机、' +
      '一个技能一个策略到一个通才模型、我们补充的两点、开源的代码目录逐行出现');
    s.appendChild(svgText(24, 26, '局限与之后', 'demo-x-ink2', 13.5));
    var cam = camAt(150, 24 + 208 * 150 / 170, 50 + 245 * 150 / 170);
    var bot = g1Mesh(s, 'rob');
    var mk = [dotAt(s, 0, 0, 7, C_TGT), dotAt(s, 0, 0, 7, C_TGT)];
    mk.forEach(function (c) { c.style.stroke = '#fff'; c.style.strokeWidth = '1.2px'; });
    var camIcon = group(s);
    camIcon.appendChild(paint(svgEl('rect', { x: 330, y: 70, width: 44, height: 30, rx: 5 }), C_ACCENT));
    ringAt(camIcon, 352, 85, 9, '#ffffff', 2.4);
    label(camIcon, 352, 118, '机载相机？', 'demo-x-ink2', 11, 'middle');
    label(s, 214, 300, '黄点：动作捕捉的标记点（骨盆、箱子）', 'demo-x-mut', 10.5, 'middle');
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '局限一：依赖动作捕捉', 'demo-x-ink', 14);
    /* 左：动捕场地里四个相机都看得到标记点；右：没布置过的环境，没有相机 */
    var rays1 = [];
    [0, 1].forEach(function (k) {
      var x = R + k * 182;
      rectBox(p1, x, 84, 170, 150, k ? C_BAD : C_BORDER, C_SURFACE);
      boxIcon(p1, x + 92, 176, 40, 32);
      var pel = [x + 62, 168], bx = [x + 112, 166];
      [pel, bx].forEach(function (q) { var d = dotAt(p1, q[0], q[1], 5.5, C_TGT); d.style.stroke = '#fff'; d.style.strokeWidth = '1.2px'; });
      hline(p1, x + 62, 176, x + 62, 212, C_MUTED, 3);
      if (!k) {
        [[x + 14, 96], [x + 142, 96], [x + 14, 208], [x + 142, 208]].forEach(function (c) {
          p1.appendChild(paint(svgEl('rect', { x: c[0], y: c[1], width: 14, height: 10, rx: 2 }), C_ACCENT));
          [pel, bx].forEach(function (q) { rays1.push(hline(p1, c[0] + 7, c[1] + 5, q[0], q[1], C_ACCENT, 1, '3 3')); });
        });
      } else {
        label(p1, x + 62, 150, '?', 'demo-x-ink', 18, 'middle');
        label(p1, x + 112, 148, '?', 'demo-x-ink', 18, 'middle');
      }
    });
    label(p1, R + 85, 254, '动捕场地：骨盆和物体都贴标记点', 'demo-x-ink2', 11.5, 'middle');
    label(p1, R + 267, 254, '没布置过的环境：用不了', 'demo-x-ink2', 11.5, 'middle');
    var p2 = group(s);
    label(p2, R, 64, '下一步：机载传感器', 'demo-x-ink', 14);
    chip(p2, R, 84, 150, '动作捕捉', C_MUTED, { size: 12.5, h: 34 });
    chip(p2, R + 202, 84, 150, '相机', C_ACCENT, { size: 12.5, h: 34 });
    var f2a = flowSeg(p2, C_ACCENT, 2, 3, 26, false);
    label(p2, R, 156, '直接从机载相机这类传感器拿到物体', 'demo-x-ink2', 12);
    var p3 = group(s);
    label(p3, R, 64, '局限二：一个技能一个策略', 'demo-x-ink', 14);
    var smalls = [];
    for (var i = 0; i < 13; i++) smalls.push(paint(svgEl('rect', { x: R + 4 + i * 26.5, y: 86, width: 22, height: 22, rx: 4 }), C_ACCENT));
    smalls.forEach(function (r) { p3.appendChild(r); });
    label(p3, R + W / 2, 128, '13 个专门的策略', 'demo-x-mut', 10.5, 'middle');
    var gen = chip(p3, R + 96, 196, 160, '一个通才模型', C_GOOD, { size: 12.5, h: 34 });
    var fl3 = [0, 1, 2, 3, 4].map(function () { return flowSeg(p3, C_MUTED, 1, 2.6, 18, false); });
    label(p3, R + W / 2, 252, '把很多技能的数据合在一起训（之后的方向）', 'demo-x-mut', 10.5, 'middle');
    var p4 = group(s);
    label(p4, R, 64, '我们补充两点', 'demo-x-ink', 14);
    label(p4, R, 92, '① 14 个仿真任务，6 个上了真机', 'demo-x-ink2', 12);
    var d14 = [];
    for (i = 0; i < 14; i++) d14.push(dotAt(p4, R + 10 + i * 24, 112, 8, C_MUTED));
    label(p4, R, 160, '② 物体轨迹和接触点，一段一段人工标注', 'demo-x-ink2', 12);
    var clips4 = [0, 1, 2, 3, 4, 5].map(function (k) { return rectBox(p4, R + k * 58, 172, 50, 32, C_BORDER, C_SURFACE2); });
    var pen4 = paint(svgEl('path', { d: 'M0 0 l10 -10 l4 4 l-10 10 Z' }), C_TGT);
    p4.appendChild(pen4);
    label(p4, R, 236, '问答：以后可能接入 OmniRetarget 这类自动流程', 'demo-x-mut', 10.5);
    var p5 = group(s);
    label(p5, R, 64, '开源（LeCAR-Lab/HDMI）', 'demo-x-ink', 14);
    var tree = [['active_adaptation/', '环境、奖励、PPO-ROA'], ['cfg/task/G1/hdmi/', '13 个任务的配置'], ['data/motion/', '参考动作数据'], ['scripts/', 'train.py、play.py'], ['EGalahad/sim2real', '真机部署（另一个仓库）']];
    var treeG = tree.map(function (r, k) {
      var g = group(p5);
      tone(g, R + 4, 98 + k * 34, r[0], C_ACCENT, 12.5, 'start');
      label(g, R + 190, 98 + k * 34, r[1], 'demo-x-ink2', 11.5);
      return g;
    });
    function draw(t, clock) {
      var now = nowOf(t, clock), j = loopFrame(now), f = suitFrames()[j];
      bot.put(cam, j);
      moveDot(mk[0], project(f.rob.pel, cam)); moveDot(mk[1], project([f.rob.cen[0], f.rob.cen[1], f.rob.cen[2] + 0.2], cam));
      var blink = t < 7.0 ? 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(now * 5)) : 0.3;
      mk.forEach(function (c) { c.style.opacity = blink; });
      setOpacity(camIcon, win(t, 3.6, 7.0));
      f2a.at(now, [R + 152, 101], [R + 200, 101], true);
      fl3.forEach(function (fl, k) { fl.at(now + k * 0.2, [R + 15 + k * 79, 140], [R + 150 + k * 13, 194], true); });
      smalls.forEach(function (r, k) { r.style.opacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * 2 + k)); });
      rays1.forEach(function (r, k) { r.style.opacity = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(now * 3 + k)); });
      var u4 = since(t, clock, 10.4);
      d14.forEach(function (d, k) { var on = k < 6 && u4 > 0.5 + k * 0.25; d.style.fill = on ? C_GOOD : C_MUTED; d.style.opacity = on ? 1 : 0.45; });
      var cyc = (now % 6) / 6, ck = Math.floor(cyc * 6);
      clips4.forEach(function (r, k) { r.style.stroke = k < ck ? C_TGT : C_BORDER; r.style.fill = k < ck ? C_SURFACE : C_SURFACE2; });
      pen4.setAttribute('transform', 'translate(' + (R + ck * 58 + 30 + 8 * Math.sin(now * 9)).toFixed(1) + ' ' + (196 + 3 * Math.cos(now * 9)).toFixed(1) + ')');
      void gen;
      treeG.forEach(function (g, k) { setOpacity(g, seg(since(t, clock, 13.4), 0.3 + k * 0.35, 0.6 + k * 0.35)); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  var HDMI_SCENES = [
    {
      title: '和物体打交道：只跟身体不够',
      dur: 16,
      build: buildSceneIntro,
      cues: [
        { at: 0.4, s: '动作跟踪只跟机器人自己的身体；开门、搬箱子要看门开没开、箱子动没动。' },
        { at: 3.6, s: '难点一：同时带三维人体和物体运动的数据很少。' },
        { at: 7.0, s: '难点二：参考不完美时怎么建立接触？跪着、弯腰时怎么保持平衡？' },
        { at: 10.4, s: '以前：一个任务一套参考和奖励，或者靠 VLM、模型规划器。' },
        { at: 13.4, s: 'HDMI：换任务只换视频；手脚都能接触，铰接、刚体都能处理。' }
      ]
    },
    {
      title: '三段流水线（图 2）',
      dur: 16,
      build: buildScenePipeline,
      cues: [
        { at: 0.4, s: '图 2 三栏：视频 → 动作、训练、部署。' },
        { at: 3.6, s: '① 单目 RGB 视频变成机器人和物体的参考轨迹。' },
        { at: 7.0, s: '② 观测有相位 $\\phi$、本体感受和物体；输出加在参考关节角上。' },
        { at: 10.4, s: '奖励三块：交互、机器人跟踪、物体跟踪。' },
        { at: 13.4, s: '③ 不经微调，直接部署到宇树 G1。' }
      ]
    },
    {
      title: '从视频到参考轨迹',
      dur: 16,
      build: buildSceneVideo2Ref,
      cues: [
        { at: 0.4, s: 'GVHMR 估计 SMPL 人体，LocoMujoco 重定向到 G1。' },
        { at: 3.6, s: '物体轨迹和接触点：每段视频人工标注，再做专门的后处理。' },
        { at: 7.0, s: '行李箱：标出拿起、放下两帧；拿着时跟着手腕，其余放地上。' },
        { at: 10.4, s: '例外：搬行李箱的参考取自 OMOMO；要抓握的动作不做。' },
        { at: 13.4, s: '左边：官方开源的这段参考，472 帧、9.44 s。' }
      ]
    },
    {
      title: '一帧参考：机器人、物体、接触',
      dur: 16,
      build: buildSceneRefFrame,
      cues: [
        { at: 0.4, s: '每一帧参考：$s_t^{\\mathrm{ref}} = (s_t^{\\mathrm{robot}}, s_t^{\\mathrm{obj}}, c_t)$。' },
        { at: 3.6, s: '机器人：根部位置、根部朝向、参考关节角 $\\theta_t^{\\mathrm{ref}}$。' },
        { at: 7.0, s: '物体：位置和朝向；门、折叠椅还多一个关节角。' },
        { at: 10.4, s: '接触：$c_t \\in \\{0, 1\\}$；黄点是期望接触点，在物体坐标系里。' },
        { at: 13.4, s: '代码：行李箱两侧各一个点；472 帧里 170 帧要接触。' }
      ]
    },
    {
      title: 'DeepMimic 式训练三件套',
      dur: 16,
      build: buildSceneDeepMimic,
      cues: [
        { at: 0.4, s: '机器人和物体的共同跟踪：DeepMimic 三件套 + PPO。' },
        { at: 3.6, s: '① 参考状态初始化：随机挑一帧开始，机器人和物体都摆好。' },
        { at: 7.0, s: '② 相位 $\\phi \\in [0, 1]$：跟单段动作时有它就够。' },
        { at: 10.4, s: '③ 误差太大就终止：代码里要连续超标 25 步（0.5 s）。' },
        { at: 13.4, s: '代码的扰动：根部 ±5 cm（开门 ±20 cm）、偏航 ±0.2 rad。' }
      ]
    },
    {
      title: '统一的物体表示（图 3）',
      dur: 16,
      build: buildSceneObjRep,
      cues: [
        { at: 0.4, s: '不管什么物体，策略只看它相对机器人根部的位姿。' },
        { at: 3.6, s: '再加期望接触点（图 3 的黄点），同样换到根部坐标系。' },
        { at: 7.0, s: '加上本体感受和相位；换物体不用改网络结构。' },
        { at: 10.4, s: '代码里物体只占 10 维：位置 2、朝向 2、两个接触点 6。' },
        { at: 13.4, s: '这种表示以后可以换成机载相机（论文的说法，还没做）。' }
      ]
    },
    {
      title: '残差动作空间',
      dur: 16,
      build: buildSceneResidual,
      cues: [
        { at: 0.4, s: '跪、弯腰这类姿势，离默认站姿很远。' },
        { at: 3.6, s: '普通动作围着默认站姿探索：从跪姿开始，一出手就被弹起来。' },
        { at: 7.0, s: '残差动作：$\\theta_t^{\\mathrm{target}} = \\theta_t^{\\mathrm{ref}} + a_t$，探索围着参考姿态。' },
        { at: 10.4, s: '第 3.20 s 左膝：参考 2.73、默认 0.67 rad，差 5.9 个动作单位。' },
        { at: 13.4, s: '图 9c：上排在参考附近探索，下排一出手就弹起来。' }
      ]
    },
    {
      title: '交互奖励（式 1–2）',
      dur: 19.4,
      build: buildSceneReward,
      cues: [
        { at: 0.4, s: '视频重定向来的参考是纯运动学的：接触不准、还会穿模；左边的参考里，箱子相对手上下飘。' },
        { at: 3.6, s: '换成仿真回放：箱子贴在手上，左右手离接触点平均 4.1 / 1.2 cm。' },
        { at: 7.0, s: '位置项 $\\exp(-\\lVert p_{\\mathrm{eef}} - p_{\\mathrm{target}}\\rVert_2/\\sigma_{\\mathrm{pos}})$：用的是距离，不是平方。' },
        { at: 10.4, s: '力项：力不够打折扣，超过 $F_{\\mathrm{thres}}$ 封顶为 1。' },
        { at: 13.8, s: '式 2：对要接触的末端取平均，用接触信号 $c_{t,i}$ 门控。' },
        { at: 16.8, s: '代码：$\\sigma_{\\mathrm{pos}} = 0.3$ m、$\\sigma_{\\mathrm{frc}} = 40$ N、$F_{\\mathrm{thres}} = 10$ N；要接触 ×5，否则给 1。' }
      ]
    },
    {
      title: '奖励与终止（表 I、表 II）',
      dur: 16,
      build: buildSceneTables,
      cues: [
        { at: 0.4, s: '表 I：机器人跟踪 2.0 / 1.0 / 1.0 / 1.0，物体 2.0，接触 5.0 最大。' },
        { at: 3.6, s: '正则七项：动作变化率、限位、关节速度、力矩、冲击、打滑、腾空时间。' },
        { at: 7.0, s: '代码：跟踪拆成 10 个小项，都是 $0.5\\exp(-\\text{误差}/\\sigma)$。' },
        { at: 10.4, s: '表 II：误差超过 0.5 m 或 1.2 rad、接触丢失，连续 25 步就终止。' },
        { at: 13.4, s: '代码不同：物体朝向阈值 0.8 rad；奖励四组，各有一个价值输出。' }
      ]
    },
    {
      title: '代码里的教师与学生',
      dur: 57.8,
      build: buildSceneTeacher,
      cues: [
        { at: 0.4, s: '论文只说用 PPO；代码先训特权教师，再蒸馏学生（借鉴 ROA）。' },
        { at: 3.6, s: '教师：特权信息编码成 256 维；残差动作只用在教师这里。' },
        { at: 7.0, s: '适应模块猜那 256 维；学生动作网络模仿教师的均值，不加参考关节角。' },
        { at: 10.4, s: '学生再用 PPO 微调；部署的应该是学生（我们的推断）。' },
        { at: 13.4, s: '学生看 615 维：未来 5 帧参考 + 相位 356、本体 249、物体 10。' },
        { at: 16.0, s: '未来参考 356 = 16 个关键点 × 3 × 5 帧（240）+ 23 个关节角 × 5 帧（115）+ 相位 1。' },
        { at: 31.1, s: '本体感受 249 = 角速度 3 + 重力方向 3 + 关节角 29 × 6 步（174）+ 前 3 步动作 23 × 3（69）。' },
        { at: 48.1, s: '物体 10 = 水平位置 2 + 朝向 2 + 两个接触点 3 × 2，都在机器人自己的坐标系里。' }
      ]
    },
    {
      title: '上真机：动捕给位姿',
      dur: 16,
      build: buildSceneReal,
      cues: [
        { at: 0.4, s: 'IsaacSim 里训练，同一套超参数，零样本部署到宇树 G1。' },
        { at: 3.6, s: '动捕标记点贴在骨盆和物体上，得到全局位姿。' },
        { at: 7.0, s: '物体位姿换到根部坐标系，和训练时一样当观测。' },
        { at: 10.4, s: '域随机化（代码）：质量 ×0.9–1.1、摩擦 0.3–1.6、质心 ±2 cm。' },
        { at: 13.4, s: '还随机动作延迟 10–30 ms；行李箱 1.2–1.8 kg、尺寸 ×0.9–1.1。' }
      ]
    },
    {
      title: '开门穿门：连续 67 次',
      dur: 16,
      build: buildSceneDoor,
      cues: [
        { at: 0.4, s: '手推开门、走过去、转身、脚踢开门、走回来。' },
        { at: 3.6, s: '连续成功 67 次（约 34 分钟），第 68 次才失败。' },
        { at: 7.0, s: '起点随机偏移 10–30 cm：自己调步子，手抬到正确位置。' },
        { at: 10.4, s: '撤掉木板后又完成约 7 次（图 4：约 60 + 约 10 个来回）。' },
        { at: 13.4, s: '左边：项目页的加速剪辑，计数走到 68，最后一段摔倒。' }
      ]
    },
    {
      title: '搬箱子与楚门式鞠躬',
      dur: 47.5,
      build: buildSceneBox,
      cues: [
        { at: 0.4, s: '搬箱子：跪下、抓住、抬起、带着走；参考是 OMOMO 的搬行李箱。' },
        { at: 3.6, s: '连续成功 7 次，衔接顺畅。' },
        { at: 7.0, s: '搬面包箱：完整做完 2 次；快速转身 180° 时两腿偶尔相碰。' },
        { at: 10.4, s: '搬泡沫垫：走过去、抓起、侧着走、放下。' },
        { at: 24.0, s: '楚门式鞠躬：上台阶到走回来，连续 3 次（有人轻扶）。' }
      ]
    },
    {
      title: '仿真里的 14 个任务',
      dur: 53.9,
      build: buildSceneSim,
      cues: [
        { at: 0.4, s: '仿真里 14 个任务，同一个框架、同一套超参数。' },
        { at: 11.7, s: '推门、踢门、打开折叠椅坐下、推球、推倒木板……' },
        { at: 18.2, s: '扛箱子、搬凳子、搬面包箱、推大箱子、搬泡沫垫、搬行李箱。' },
        { at: 25.8, s: '14 个里 6 个上了真机：球没法贴标记点，也缺结实的折叠椅。' },
        { at: 34.0, s: '消融：其中 8 个任务，IsaacSim、4096 个并行环境。' }
      ]
    },
    {
      title: '交互奖励的消融（图 6）',
      dur: 16,
      build: buildSceneAblRew,
      cues: [
        { at: 0.4, s: '三种训练：完整方法 / 只去掉交互奖励 / 两个都去掉。' },
        { at: 3.6, s: '图 6：横轴 8 个任务，纵轴成功率，越高越好。' },
        { at: 7.0, s: '多数任务三种差不多：推门、开门、折叠椅都在 0.99 以上。' },
        { at: 10.4, s: '搬行李箱两个都去掉是 0；扛箱子去掉交互奖励就是 0。' },
        { at: 13.4, s: '关键在两类任务：参考不准、接触位置要准。' }
      ]
    },
    {
      title: '交互奖励管什么（图 7）',
      dur: 16,
      build: buildSceneWhy,
      cues: [
        { at: 0.4, s: '参考不准：重定向出来的手没碰到箱子（图 7b）。' },
        { at: 3.6, s: '有交互奖励会偏离参考去抓牢；没有就照着错的做，抓不起来。' },
        { at: 7.0, s: '用回放录下完美参考重训：三种都能成功（图 7a）。' },
        { at: 10.4, s: '官方数据：参考的双手离接触点 10.5 / 12.2 cm，回放 4.1 / 1.2 cm。' },
        { at: 13.4, s: '推大箱子要卡住箱沿：开着接触终止评测，两个都去掉只剩 0.32。' }
      ]
    },
    {
      title: '残差动作的消融（图 8、图 9）',
      dur: 16,
      build: buildSceneAblRes,
      cues: [
        { at: 0.4, s: '三种训练：完整方法 / 去掉残差动作 / 两个都去掉。' },
        { at: 3.6, s: '图 8：8 个任务的跟踪误差，越低越好；完整方法 24 个数全最低。' },
        { at: 7.0, s: '平均关节误差：0.090 / 0.142 / 0.151 rad。' },
        { at: 10.4, s: '图 9a：有残差的误差一开始就低，第 400 步成功率就到 0.99。' },
        { at: 13.4, s: '图 9b：两个都去掉学不会跪下，双脚平放靠弯腰去够。' }
      ]
    },
    {
      title: '局限与之后',
      dur: 16,
      build: buildSceneLimits,
      cues: [
        { at: 0.4, s: '局限一：依赖动捕，骨盆和物体的位姿都靠标记点。' },
        { at: 3.6, s: '下一步：直接用机载相机这类传感器。' },
        { at: 7.0, s: '局限二：一个技能一个策略，还没有通才模型。' },
        { at: 10.4, s: '补充：6 / 14 上真机；物体轨迹和接触点人工标注。' },
        { at: 13.4, s: '开源：训练代码、13 个任务配置、动作数据；部署在 sim2real。' }
      ]
    }
  ];
  /* 要点里数字和单位之间用不换行空格（公式里不动），免得单位单独落到下一行开头（HOMIE 2026-10-21） */
  function nb(str) {
    return str.split(/(\$[^$]*\$)/).map(function (p, i) { return i % 2 ? p : p.replace(/(\d)(\*\*)? (?=[^\s\d+\-−→×<>=\/·（(])/g, '$1$2 ').replace(/(\d)–(\d)/g, '$1–⁠$2'); }).join('');
  }
  HDMI_SCENES.forEach(function (sc) { sc.cues.forEach(function (c) { c.s = nb(c.s); }); });

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十八幕动画：HDMI 全流程速览',
      sub: '约 403 秒自动播放。空格播放/暂停，← → 换幕；G1 是官方开源的搬行李箱参考与仓库里录下的仿真回放，按真实模型做 3D 渲染，表格与图来自论文和官方代码。',
      ariaLabel: 'HDMI 十八幕讲解动画',
      notes: [
        '取数依据：表 I–II 照抄 arXiv 2509.16757 v3；图 6、图 7a、图 8、图 9a 的数是我们从论文的矢量图里抽出来的（柱高、误差棒中点、折线顶点），只保留到小数点后三位。',
        'G1 的动作不是我们训练的策略：原始参考是官方仓库 `data/motion/g1/omomo/sub1_suitcase_011`，回放是 `record_motion/x65r1823`（帧数是参考去掉前 25 帧、接触标签逐帧相同，我们推断是论文图 7b 那种用成功策略录下的「完美参考」）。3D 外形：材质与光照照抄 Robot Retarget Online（ImChong/Robot_Retarget_Online）的 three.js 场景，按官方数据的位姿用正交相机逐帧离线渲染。',
        '真机与仿真片段剪自项目页 hdmi-humanoid.github.io 的视频（项目页没标倍速；仿真片段我们按 2.5 倍速播放），只做讲解引用。'
      ],
      scenes: HDMI_SCENES
    });
  }

  // ─── the narrated vertical video of the same eighteen scenes ──────────────
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：HDMI 十八幕全流程',
      sub: '18 分 46 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十八幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '21.0 MB',
      fileName: 'HDMI_讲解视频.mp4'
    });
  }

  // ─── 演示 1：参考与回放逐帧看 ───────────────────────────────────────────────
  function buildReferenceDemo(host) {
    var root = card(host, {
      title: '参考与回放逐帧看：双手离接触点多远',
      sub: '左边是官方开源的搬行李箱参考（OMOMO 重定向，不完美），右边是官方仓库里录下的仿真回放，同一时刻对照看。黄点是期望接触点，紫点是手的末端点，红线是两者的距离。'
    });
    var state = { j: EX_J };
    var row = controlsRow(root);
    slider(row, { label: '时刻', min: 0, max: SUIT.n - 1, step: 1, value: EX_J, format: function (v) { return '参考第 ' + f2(suitTime(v)) + ' s'; }, onInput: function (v) { state.j = v; render(); } });
    var svg = sceneSvg('两台 G1：左为原始参考，右为仿真回放；箱子两侧的黄点是期望接触点，紫点是手', '0 0 640 250');
    var wrap = el('div', 'demo-stage');
    wrap.appendChild(svg);
    root.appendChild(wrap);
    var camA = camAt(130, 18 + 208 * 130 / 170, 22 + 245 * 130 / 170), camB = camAt(130, 328 + 208 * 130 / 170, 22 + 245 * 130 / 170);
    var refBot = g1Mesh(svg, 'ref'), robBot = g1Mesh(svg, 'rob');
    var ovA = contactOverlay(svg, { r: 5 }), ovB = contactOverlay(svg, { r: 5 });
    label(svg, 166, 242, '原始参考', 'demo-x-ink2', 11, 'middle');
    label(svg, 476, 242, '仿真回放', 'demo-x-ink2', 11, 'middle');
    var stats = statsRow(root);
    var sC = stats.add('接触信号 $c_t$'), sA = stats.add('参考：左 / 右'), sB = stats.add('回放：左 / 右');
    var tb = table(root);
    note(root, ['手的末端点照官方代码取：手腕偏航连杆往前 5 cm；期望接触点是箱子坐标系里的 $(-0.1, \\pm 0.18, 0.25)$ m（`move_suitcase.yaml`）。位置项按代码的 $\\exp(-d/0.3)$ 算；回放没有存接触力，这里不算力项。',
      '要接触的 56 帧（参考第 3.44–6.74 s）平均：参考左手 ' + f1(contactStats('ref').mean[0] * 100) + ' cm、右手 ' + f1(contactStats('ref').mean[1] * 100) + ' cm；回放左手 ' + f1(contactStats('rob').mean[0] * 100) + ' cm、右手 ' + f1(contactStats('rob').mean[1] * 100) + ' cm。默认的第 4.70 s 是笔记「🚶 具体实例」的例 4。']);
    function render() {
      var f = suitFrames()[state.j];
      refBot.put(camA, state.j); robBot.put(camB, state.j);
      ovA.put(f, 'ref', camA); ovB.put(f, 'rob', camB);
      var da = handDist(f, 'ref'), db = handDist(f, 'rob');
      sC.set(f.c ? '1：要接触' : '0：不用接触', f.c ? 'warn' : '');
      sA.set(f1(da[0] * 100) + ' / ' + f1(da[1] * 100) + ' cm', f.c && Math.max(da[0], da[1]) > 0.08 ? 'bad' : '');
      sB.set(f1(db[0] * 100) + ' / ' + f1(db[1] * 100) + ' cm', f.c ? 'good' : '');
      tb.clear();
      tb.row(['', '参考：距离', '参考：位置项', '回放：距离', '回放：位置项'], true);
      ['左手', '右手'].forEach(function (n, i) { tb.row([n, f1(da[i] * 100) + ' cm', f3(posTerm(da[i])), f1(db[i] * 100) + ' cm', f3(posTerm(db[i]))]); });
    }
    registerRenderer(render);
    render();
  }

  // ─── 演示 2：交互奖励计算器 ──────────────────────────────────────────────────
  function buildRewardDemo(host) {
    var root = card(host, {
      title: '交互奖励计算器：式 1–2 与代码里的参数',
      sub: '两只手各给一个「离接触点的距离」和「接触力」，按论文的式 1–2 与官方代码（$\\sigma_{\\mathrm{pos}} = 0.3$ m、$\\sigma_{\\mathrm{frc}} = 40$ N、$F_{\\mathrm{thres}} = 10$ N）算出交互奖励。'
    });
    var st = { d: [0.05, 0.05], f: [3, 15], c: true };
    var r1 = controlsRow(root), r2 = controlsRow(root);
    slider(r1, { label: '左手距离', min: 0, max: 0.5, step: 0.005, value: 0.05, format: function (v) { return f1(v * 100) + ' cm'; }, onInput: function (v) { st.d[0] = v; render(); } });
    slider(r1, { label: '左手接触力', min: 0, max: 40, step: 0.5, value: 3, format: function (v) { return f1(v) + ' N'; }, onInput: function (v) { st.f[0] = v; render(); } });
    slider(r2, { label: '右手距离', min: 0, max: 0.5, step: 0.005, value: 0.05, format: function (v) { return f1(v * 100) + ' cm'; }, onInput: function (v) { st.d[1] = v; render(); } });
    slider(r2, { label: '右手接触力', min: 0, max: 40, step: 0.5, value: 15, format: function (v) { return f1(v) + ' N'; }, onInput: function (v) { st.f[1] = v; render(); } });
    var r3 = controlsRow(root);
    checkbox(r3, '这一帧要接触（$c_t = 1$）', true, function (v) { st.c = v; render(); });
    var stg = stage(root, 220);
    var stats = statsRow(root);
    var sP = stats.add('论文：$R_{\\mathrm{interaction}}$'), sK = stats.add('代码：这一项的得分'), sW = stats.add('乘权重 1 之后');
    var tb = table(root);
    note(root, ['式 1：$R_{\\mathrm{contact},i} = \\exp(-\\lVert p_{\\mathrm{eef},i} - p_{\\mathrm{target},i}\\rVert_2/\\sigma_{\\mathrm{pos}})\\cdot\\min(\\exp((\\lVert F_i\\rVert_2 - F_{\\mathrm{thres}})/\\sigma_{\\mathrm{frc}}), 1)$；式 2：对 $N_c$ 个末端取平均并乘接触信号。',
      '官方代码 `eef_contact_exp` 多了两处：要接触时乘 `gain = 5`，不用接触的末端直接给 1（不是 0），再对两只手取平均；表 I 里接触奖励的 5.0 就是这个 gain。默认的 5 cm、3 N / 15 N 就是笔记「🚶 具体实例」的例 3。']);
    function render() {
      var Rs = [0, 1].map(function (i) { return posTerm(st.d[i]) * frcTerm(st.f[i]); });
      var paper = (Rs[0] + Rs[1]) / 2 * (st.c ? 1 : 0);
      var code = (contactCode(st.d[0], st.f[0], st.c) + contactCode(st.d[1], st.f[1], st.c)) / 2;
      sP.set(f3(paper), 'accent'); sK.set(f3(code), 'good'); sW.set(f3(code * 1.0));
      tb.clear();
      tb.row(['', '位置项', '力项', '$R_{\\mathrm{contact}}$', '代码：$5R$ 或 1'], true);
      ['左手', '右手'].forEach(function (n, i) { tb.row([n, f3(posTerm(st.d[i])), f3(frcTerm(st.f[i])), f3(Rs[i]), f3(contactCode(st.d[i], st.f[i], st.c))]); });
      var g = begin(stg), ctx = g.ctx, P = g.P, w2 = g.w / 2 - 20, h = g.h - 46;
      function panel(x0, xmax, fn, mk, col, title, unit, ticks) {
        line(ctx, [[x0, 14], [x0, 14 + h], [x0 + w2, 14 + h]], P.grid, 1);
        var pts = [];
        for (var i = 0; i <= 80; i++) { var v = i / 80 * xmax; pts.push([x0 + v / xmax * w2, 14 + h - fn(v) * h]); }
        line(ctx, pts, col, 2.4);
        mk.forEach(function (m) { K.dot(ctx, x0 + clamp(m[0], 0, xmax) / xmax * w2, 14 + h - fn(clamp(m[0], 0, xmax)) * h, 5, m[1]); });
        text(ctx, title, x0 + 4, 12, P.text, 'left', 'bold 11px sans-serif');
        ticks.forEach(function (v) { text(ctx, v + unit, x0 + v / xmax * w2, 14 + h + 16, P.text, 'center', '10px sans-serif'); });
      }
      panel(28, 0.5, posTerm, [[st.d[0], P.purple || P.accent], [st.d[1], P.accent]], P.purple || P.accent, '位置项（横轴：距离）', ' m', [0, 0.25, 0.5]);
      panel(g.w / 2 + 12, 40, frcTerm, [[st.f[0], P.purple || P.accent], [st.f[1], P.accent]], P.warn, '力项（横轴：接触力）', ' N', [0, 10, 20, 40]);
    }
    registerRenderer(render);
    render();
  }

  // ─── 演示 3：图 6、图 7a、图 8、图 9a 的数字 ─────────────────────────────────────
  function buildResultsDemo(host) {
    var root = card(host, {
      title: '消融实验的数字：图 6、图 7a、图 8、图 9a',
      sub: '我们从论文的矢量图里抽出来的数（柱高、误差棒中点、折线顶点）。蓝 = 完整方法，红 = 去掉一项，绿 = 两项都去掉，和论文配色一致。'
    });
    var state = { view: 'fig6' };
    var row = controlsRow(root);
    buttonGroup(row, { label: '看哪张图', items: [{ label: '图 6：成功率', value: 'fig6' }, { label: '图 8：关节误差', value: 'joint' }, { label: '图 8：身体位置', value: 'bpos' },
      { label: '图 8：身体朝向', value: 'bori' }, { label: '图 7a：搬行李箱', value: 'f7a' }, { label: '图 7a：推大箱子', value: 'f7b' }, { label: '图 9a', value: 'f9' }], value: 'fig6', onPick: function (v) { state.view = v; render(); } });
    var stg = stage(root, 280);
    var verdict = verdictBox(root);
    var tb = table(root);
    note(root, ['图 6、图 7a 是论文「交互奖励」的消融（蓝：有交互奖励和接触终止；红：只去掉交互奖励；绿：两个都去掉）；图 8、图 9a 是「残差动作」的消融（蓝：残差动作 + 身体误差终止；红：去掉残差动作；绿：两个都去掉）。',
      '图 8 没写单位，按官方代码里同名的调试量推断：关节误差是弧度的平均、身体位置是米、身体朝向是弧度。图 9a 论文没写是哪个任务。训练曲线每 100 步一个点，横轴是论文图上的「训练步数」。']);
    function bars(g, data, vmax, cats, fmtV) {
      var ctx = g.ctx, P = g.P, cols = [P.accent, P.bad, P.good], n = cats.length, gw = (g.w - 40) / n, bw = Math.min(16, (gw - 10) / 3), base = g.h - 40, top = 14;
      line(ctx, [[30, base], [g.w - 6, base]], P.grid, 1);
      cats.forEach(function (c, i) {
        for (var k = 0; k < 3; k++) {
          var v = data[i][k], hh = clamp(v / vmax, 0, 1) * (base - top), x = 34 + i * gw + gw / 2 - 1.5 * bw + k * bw;
          ctx.fillStyle = cols[k]; ctx.fillRect(x, base - hh, bw - 2, hh);
        }
        text(ctx, c, 34 + i * gw + gw / 2, base + 14, P.text, 'center', gw < 70 ? '9px sans-serif' : '10.5px sans-serif');
      });
      void fmtV;
    }
    function curves(g, obj, y0, y1) {
      var ctx = g.ctx, P = g.P, cols = [P.accent, P.bad, P.good], base = g.h - 34, top = 12;
      line(ctx, [[34, top], [34, base], [g.w - 8, base]], P.grid, 1);
      ['b', 'r', 'g'].forEach(function (k, i) {
        line(ctx, obj[k].map(function (v, q) { return [40 + q / 10 * (g.w - 56), base - (v - y0) / (y1 - y0) * (base - top)]; }), cols[i], 2.4);
      });
      [0, 5, 10].forEach(function (q) { text(ctx, String(100 + q * 100), 40 + q / 10 * (g.w - 56), base + 14, P.text, 'center', '10px sans-serif'); });
      text(ctx, String(y1), 30, top + 4, P.text, 'right', '10px sans-serif');
      text(ctx, String(y0), 30, base, P.text, 'right', '10px sans-serif');
    }
    function render() {
      var g = begin(stg), v = state.view;
      tb.clear();
      if (v === 'fig6') {
        bars(g, FIG6, 1, TASKS);
        tb.row(['任务', '完整方法', '只去掉交互奖励', '两个都去掉'], true);
        TASKS.forEach(function (n, i) { tb.row([n].concat(FIG6[i].map(function (x) { return f3(x); }))); });
        verdict.set('8 个任务平均 ' + f2(mean(FIG6.map(function (r) { return r[0]; }))) + ' / ' + f2(mean(FIG6.map(function (r) { return r[1]; }))) + ' / ' + f2(mean(FIG6.map(function (r) { return r[2]; }))) + '；差别全在搬行李箱（两个都去掉是 0）和箱子扛上肩（去掉交互奖励就是 0）。', 'good');
      } else if (FIG8[v]) {
        var M = FIG8[v], data = TASKS.map(function (n, i) { return [M.v[0][i], M.v[1][i], M.v[2][i]]; });
        bars(g, data, Math.max.apply(null, M.v[1].concat(M.v[2])) * 1.1, TASKS);
        tb.row(['任务（' + M.zh + '，' + M.unit + '）', '残差 + 终止', '去掉残差', '两个都去掉'], true);
        TASKS.forEach(function (n, i) { tb.row([n].concat(data[i].map(function (x) { return f3(x); }))); });
        tb.row(['平均', f3(mean(M.v[0])), f3(mean(M.v[1])), f3(mean(M.v[2]))]);
        verdict.set('8 个任务里，完整方法的' + M.zh + '都是三种里最低的。', 'good');
      } else if (v === 'f7a' || v === 'f7b') {
        var A = v === 'f7a' ? [FIG7A.imperfect, FIG7A.perfect] : [FIG7A.boxOff, FIG7A.boxOn];
        var gl = { ctx: g.ctx, P: g.P, w: g.w / 2 - 6, h: g.h }, gr = { ctx: g.ctx, P: g.P, w: g.w / 2 - 6, h: g.h };
        curves(gl, A[0], 0, 1);
        g.ctx.save(); g.ctx.translate(g.w / 2, 0); curves(gr, A[1], 0, 1); g.ctx.restore();
        tb.row(['第 1100 步', '完整方法', '只去掉交互奖励', '两个都去掉'], true);
        A.forEach(function (c) { tb.row([c.zh, f3(c.b[10]), f3(c.r[10]), f3(c.g[10])]); });
        verdict.set(v === 'f7a' ? '不完美参考：两个都去掉一直是 0；换成完美参考，三种都能到 1——交互奖励管的是参考不准。' : '不开接触终止评测，三种都在 0.96 以上；打开以后，两个都去掉的只剩 0.321。', 'good');
      } else {
        var gl2 = { ctx: g.ctx, P: g.P, w: g.w / 2 - 6, h: g.h }, gr2 = { ctx: g.ctx, P: g.P, w: g.w / 2 - 6, h: g.h };
        curves(gl2, FIG9A.err, 0.1, 0.35);
        g.ctx.save(); g.ctx.translate(g.w / 2, 0); curves(gr2, FIG9A.succ, 0, 1); g.ctx.restore();
        tb.row(['训练步数', '100', '400', '700', '900', '1100'], true);
        [['残差 + 终止', 'b'], ['去掉残差', 'r'], ['两个都去掉', 'g']].forEach(function (r) { tb.row([r[0] + '（成功率）'].concat([0, 3, 6, 8, 10].map(function (q) { return f3(FIG9A.succ[r[1]][q]); }))); });
        verdict.set('左：关节误差，右：成功率。有残差动作的第 400 步成功率就到 0.99；去掉残差要到第 900 步，两个都去掉要到第 700 步才过 0.85。', 'good');
      }
    }
    registerRenderer(render);
    render();
  }

  K.mount({
    'hdmi-explainer': buildExplainerDemo,
    'hdmi-video': buildVideoDemo,
    'hdmi-reference': buildReferenceDemo,
    'hdmi-reward': buildRewardDemo,
    'hdmi-results': buildResultsDemo
  });
})();
