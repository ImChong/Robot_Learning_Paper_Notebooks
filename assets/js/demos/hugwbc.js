/* Interactive HugWBC demos for
 * papers/03_High_Impact_Selection/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller
 * （Xue, Dong, Liu, Zhang, Pang · HugWBC: A Unified and General Humanoid Whole-Body Controller for Versatile Locomotion ·
 *   arXiv 2502.03206 v3，RSS 2025；代码 apexrl/HugWBC，Isaac Gym + legged_gym）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["hugwbc"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   hugwbc-explainer — 十六幕讲解动画：人会的，人形还做不到 → 命令空间：任务 + 行为 → 相位：切换四种步态 → 期望接地概率 →
 *                      非对称 Actor-Critic → 奖励（一）：速度与姿态 → 奖励（二）：着地与抬脚 → 对称损失 → 干预训练 →
 *                      噪声课程与两组机器人 → 单个命令跟得多准（表 III）→ 命令能不能随便组合（图 8）→ 干预训练的消融（表 IV）→
 *                      站着干活与抗推（表 V、图 6）→ 真机（表 VI）→ 局限与代码
 *   hugwbc-video     — 同一套十六幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   hugwbc-gait      — 步态实验台：选步态、调 f / l / σ，看两只脚的相位、时钟、期望接地概率与抬脚目标
 *   hugwbc-intervene — 干预实验台：切换概率 p、噪声课程的 α、重抽间隔，看 I(t) 的时间线与一个手臂关节的目标
 *   hugwbc-tables    — 表 III / XI、表 IV / X、表 V、表 VI
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
  /* 论文的图（arXiv 2502.03206 的图 1–6、图 8）与项目页视频的片段放在 assets/img/papers/hugwbc/；
     H1 的运动学示意贴图（我们按命令和论文的目标轨迹摆的姿态，不是策略的输出）在 assets/img/papers/hugwbc/h1_3d/ */
  var IMG_BASE = assetBase('../../img/papers/');
  var PAPER_IMG_BASE = IMG_BASE ? IMG_BASE + 'hugwbc/' : '';
  var CLIP_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'clips/' : '';
  var H1_3D_BASE = IMG_BASE ? IMG_BASE + 'hugwbc/h1_3d/' : '';
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
    plot = K.plot,
    axes = K.axes,
    line = K.line,
    dot = K.dot,
    text = K.text,
    registerRenderer = K.registerRenderer;

  // ─── 论文里的数字（arXiv 2502.03206 v3 的正文、表 I–XI、图 6） ─────────────────
  /* 表 II：命令的默认值与范围（单脚跳之外的步态）；v_x、ω 的上限靠速度课程从初始范围放到最终范围 */
  var CMDS = [
    { sym: 'v_x', zh: '前后速度', grp: 'task', def: '0', range: '[−0.6, 0.6] → [−0.6, 2.0]', unit: 'm/s' },
    { sym: 'v_y', zh: '侧向速度', grp: 'task', def: '0', range: '[−0.6, 0.6]', unit: 'm/s' },
    { sym: '\\omega', zh: '偏航角速度', grp: 'task', def: '0', range: '[−0.6, 0.6] → [−1, 1]', unit: 'rad/s' },
    { sym: 'f', zh: '步频', grp: 'foot', def: '2', range: '[1.5, 3.5]', unit: 'Hz' },
    { sym: 'l', zh: '最高抬脚', grp: 'foot', def: '0.15', range: '[0.1, 0.35]', unit: 'm' },
    { sym: 'h', zh: '身高（相对）', grp: 'posture', def: '0', range: '[−0.3, 0]', unit: 'm' },
    { sym: 'p', zh: '身体俯仰', grp: 'posture', def: '0', range: '[0, 0.4]', unit: 'rad' },
    { sym: 'w', zh: '腰偏航', grp: 'posture', def: '0', range: '[−1, 1]', unit: 'rad' }
  ];
  /* 表 I 的奖励权重 */
  var REWARD = {
    linVel: 2, angVel: 2, height: -40, pitch: -10, waist: -2, swing: -30, contact: -2,
    reg: [['横滚、俯仰角速度', -0.5], ['竖直速度', -0.1], ['滑脚', -0.2], ['动作变化率', -0.01], ['动作平滑', -0.01],
      ['关节力矩', -5e-6], ['关节加速度', -2.5e-7], ['上身偏离默认', -0.5], ['髋偏离默认', -2], ['双脚对称（跳）', -5], ['提前终止', -200]]
  };
  var SIGMA = 0.05; // 官方代码 rewards.kappa_gait_probs：期望接地概率里正态分布的标准差
  var P_SWITCH = 0.005, T_INTERVAL = 90, DT = 0.02; // 论文：翻转概率、重抽间隔（步）、控制周期（50 Hz）
  /* 表 III：只扫一个命令、其余放默认值时的跟踪误差（L1）。列：v_x 低速（≤ 1 m/s）、v_x 高速、v_y、ω、f、l、h、p、w；null 是论文写的「-」 */
  var T3_COLS = ['$v_x$ 低速', '$v_x$ 高速', '$v_y$', '$\\omega$', '$f$', '$l$', '$h$', '$p$', '$w$'];
  var T3_UNITS = ['m/s', 'm/s', 'm/s', 'rad/s', 'Hz', 'm', 'm', 'rad', 'rad'];
  var TABLE3 = [
    { zh: '站', v: [null, null, null, null, null, null, 0.035, 0.047, 0.022] },
    { zh: '走', v: [0.030, 0.216, 0.085, 0.054, 0.028, 0.011, 0.064, 0.038, 0.075] },
    { zh: '跳', v: [0.090, 0.532, 0.069, 0.077, 0.027, 0.012, 0.058, 0.048, 0.022] },
    { zh: '单脚跳', v: [0.033, null, 0.046, 0.078, null, null, 0.103, null, null] }
  ];
  /* 表 XI（附录，v3 新加）：走路时和 HOVER、ExBody 比。列：v_x 低速、v_x 高速、v_y、ω、h、p、w */
  var T11_COLS = ['$v_x$ 低速', '$v_x$ 高速', '$v_y$', '$\\omega$', '$h$', '$p$', '$w$'];
  var TABLE11 = [
    { zh: 'HOVER', v: [0.559, 1.324, 0.328, 0.436, 0.270, 0.127, 0.082] },
    { zh: 'ExBody', v: [0.109, 0.242, 0.114, 0.587, 0.145, 0.122, 0.097] },
    { zh: 'HugWBC', v: [0.030, 0.216, 0.085, 0.054, 0.064, 0.038, 0.075] }
  ];
  /* 表 IV（走）与表 X（站、跳）：三种训练 × 三种测试。列：v_x、v_y、ω、f、l、h、p、w；站立只测 h、p、w */
  var T4_COLS = ['$v_x$', '$v_y$', '$\\omega$', '$f$', '$l$', '$h$', '$p$', '$w$'];
  var STRATS = ['噪声课程（HugWBC）', 'AMASS 动作', '不干预'];
  var TESTS = ['噪声', 'AMASS', '无干预'];
  var TABLE4 = {
    walk: [
      [[0.0483, 0.0962, 0.1879, 0.0471, 0.0542, 0.0402, 0.0432, 0.0552], [0.0391, 0.0920, 0.1039, 0.0464, 0.0543, 0.0387, 0.0364, 0.0540], [0.0264, 0.0863, 0.0543, 0.0447, 0.0522, 0.0372, 0.0375, 0.0475]],
      [[0.1697, 0.1055, 0.2156, 0.0621, 0.0542, 0.0620, 0.0812, 0.0694], [0.0567, 0.0965, 0.1593, 0.0466, 0.0555, 0.0579, 0.0458, 0.0554], [0.0645, 0.0916, 0.0802, 0.0460, 0.0531, 0.0577, 0.0455, 0.0568]],
      [[0.8658, 0.7511, 0.9116, 0.1930, 0.1913, 0.1658, 0.3622, 0.2241], [0.6299, 0.4026, 0.5758, 0.2245, 0.2527, 0.1305, 0.2367, 0.1112], [0.0755, 0.1076, 0.1151, 0.0450, 0.0678, 0.0255, 0.0211, 0.0380]]
    ],
    stand: [
      [[null, null, null, null, null, 0.0291, 0.0662, 0.0605], [null, null, null, null, null, 0.0237, 0.0611, 0.0624], [null, null, null, null, null, 0.0228, 0.0476, 0.0564]],
      [[null, null, null, null, null, 0.0301, 0.1222, 0.0875], [null, null, null, null, null, 0.0204, 0.0782, 0.0707], [null, null, null, null, null, 0.0198, 0.0778, 0.0727]],
      [[null, null, null, null, null, 0.1931, 0.4051, 0.2283], [null, null, null, null, null, 0.1357, 0.2571, 0.1243], [null, null, null, null, null, 0.0213, 0.0218, 0.0514]]
    ],
    jump: [
      [[0.0886, 0.1078, 0.1785, 0.0580, 0.0457, 0.0411, 0.0471, 0.0527], [0.0750, 0.0729, 0.1010, 0.0487, 0.0458, 0.0402, 0.0417, 0.0519], [0.0504, 0.0606, 0.0778, 0.0556, 0.0445, 0.0417, 0.0491, 0.0511]],
      [[0.3026, 0.1179, 0.2736, 0.0591, 0.2560, 0.0424, 0.1217, 0.0757], [0.0826, 0.0759, 0.1104, 0.0553, 0.0469, 0.0428, 0.0486, 0.0536], [0.0854, 0.0743, 0.0804, 0.0583, 0.0461, 0.0431, 0.0476, 0.0551]],
      [[0.8082, 0.5533, 0.8340, 0.0717, 0.6358, 0.1931, 0.4051, 0.2283], [0.8632, 0.4105, 0.6888, 0.0787, 0.7720, 0.1357, 0.2591, 0.1243], [0.0711, 0.0976, 0.1127, 0.0625, 0.3255, 0.0449, 0.0368, 0.0375]]
    ]
  };
  /* 表 V：站着、跟姿态命令时一回合（20 s）两只脚总共挪了多远（论文表头写 m/s，图注说是位移，按米读）。列：D_h、D_p、D_w */
  var TABLE5 = [
    [[0.0339, 0.0892, 0.0199], [0.0454, 0.0728, 0.0196], [0.0003, 0.0016, 0.0007]],
    [[2.0815, 2.8978, 3.2630], [0.0536, 0.1743, 0.0396], [0.0139, 0.0160, 0.0013]],
    [[17.5358, 17.9732, 25.7132], [25.3802, 26.3496, 21.3078], [0.0159, 1.7065, 1.7152]]
  ];
  /* 表 VI：真机上俯仰 p、腰 w 的跟踪误差（rad，5 次测试的均值 ± 标准差） */
  var TABLE6 = [
    { zh: '站', p: [0.0712, 0.0425], w: [0.0718, 0.0614] },
    { zh: '走', p: [0.1006, 0.0581], w: [0.0571, 0.0489] },
    { zh: '跳', p: [0.0674, 0.0569], w: [0.0552, 0.0469] }
  ];
  /* 图 6：站立时 8 个方向上扛得住的最大外力（N，读图近似值，按灰圈 300 / 700 N 与 500 / 1000 N 换算）；方向从 0° 起逆时针，论文没写 0° 指哪边 */
  var RADAR = {
    load: { hug: [600, 490, 270, 490, 360, 420, 290, 570], wo: [510, 270, 190, 470, 410, 490, 270, 340] },
    push: { hug: [940, 860, 350, 920, 910, 930, 410, 940], wo: [750, 620, 330, 970, 990, 870, 380, 620] }
  };

  // ─── H1 的运动学示意：按命令、相位和论文式 (8) 的目标抬脚轨迹摆的姿态（我们写的玩具，不是策略的输出） ──────
  /* 贴图表：正交相机 yaw / pitch 与下面的 project() 同一套，地面上的世界原点对准 (ax, ay)。
     walk / walk_hi / jump / hop 按左脚相位 φ₁ = i / 20 取帧；posture 依次是 h 13 档、p 9 档、w 9 档；noise 是 10 fps 的三段干预 */
  var SHEETS = {
    walk: { file: 'h1_walk.webp', R: 200, yaw: 0.75, pitch: 0.1, cw: 220, ch: 420, cols: 10, n: 20, ax: 110, ay: 400 },
    walk_hi: { file: 'h1_walk_hi.webp', R: 200, yaw: 0.75, pitch: 0.1, cw: 220, ch: 420, cols: 10, n: 20, ax: 110, ay: 400 },
    jump: { file: 'h1_jump.webp', R: 200, yaw: 0.75, pitch: 0.1, cw: 220, ch: 420, cols: 10, n: 20, ax: 110, ay: 400 },
    hop: { file: 'h1_hop.webp', R: 200, yaw: 0.75, pitch: 0.1, cw: 220, ch: 420, cols: 10, n: 20, ax: 110, ay: 400 },
    posture: { file: 'h1_posture.webp', R: 200, yaw: 0.75, pitch: 0.1, cw: 220, ch: 420, cols: 11, n: 31, ax: 110, ay: 400 },
    noise: { file: 'h1_noise.webp', R: 200, yaw: 1.25, pitch: 0.1, cw: 320, ch: 440, cols: 9, n: 54, ax: 160, ay: 420 }
  };
  /* 每帧 15 个 int16（毫米）：骨盆、左踝、右踝、左手、右手的世界坐标（MuJoCo 正运动学，Menagerie 的 unitree_h1） */
  var TOY = {
    walk: 'AAAAAOADSwDLAEYAtf81/0YAGgEJAe4DGgH3/u4DAAAAAN4DPADLAEYAtv81/04APQH+AAIE9ADu/tcDAAAAANgDLQDLAEYAvv81/3UAWwHzABQE0ADm/sIDAAAAANADHgDLAEYAzv81/6wAcgHqACAEswDi/rADAAAAAMoDDwDLAEYA5f81/9MAfwHkACcEoADf/qQDAAAAAMgDAADLAEYAAAA1/9wAhAHiACoEmgDe/qADAAAAAMoD8f/LAEYAGwA1/9MAfwHkACcEoADf/qQDAAAAANAD4v/LAEYAMgA1/6wAcgHqACAEswDi/rADAAAAANgD0//LAEYAQgA1/3UAWwHzABQE0ADm/sIDAAAAAN4DxP/LAEYASgA1/04APQH+AAIE9ADu/tcDAAAAAOADtf/LAEYASwA1/0YAGgEJAe4DGgH3/u4DAAAAAN4Dtv/LAE4APAA1/0YA9AASAdcDPQEC/wIEAAAAANgDvv/LAHUALQA1/0YA0AAaAcIDWwEN/xQEAAAAANADzv/LAKwAHgA1/0YAswAeAbADcgEW/yAEAAAAAMoD5f/LANMADwA1/0YAoAAhAaQDfwEc/ycEAAAAAMgDAADLANwAAAA1/0YAmgAiAaADhAEe/yoEAAAAAMoDGwDLANMA8f81/0YAoAAhAaQDfwEc/ycEAAAAANADMgDLAKwA4v81/0YAswAeAbADcgEW/yAEAAAAANgDQgDLAHUA0/81/0YA0AAaAcIDWwEN/xQEAAAAAN4DSgDLAE4AxP81/0YA9AASAdcDPQEC/wIE',
    walk_hi: 'AAAAAOADSwDLAEYAtf81/0YAGgEJAe4DGgH3/u4DAAAAAN4DPADLAEYAtv81/1oAPQH+AAIE9ADu/tcDAAAAANgDLQDLAEYAvv81/7UAWwHzABQE0ADm/sIDAAAAANADHgDLAEYAzv81/zUBcgHqACAEswDi/rADAAAAAMoDDwDLAEYApgA1/5ABfwHkACcEoADf/qQDAAAAAMgDAADLAEYA3gA1/6QBhAHiACoEmgDe/qADAAAAAMoD8f/LAEYApgA1/5ABfwHkACcEoADf/qQDAAAAANAD4v/LAEYAMgA1/zUBcgHqACAEswDi/rADAAAAANgD0//LAEYAQgA1/7UAWwHzABQE0ADm/sIDAAAAAN4DxP/LAEYASgA1/1oAPQH+AAIE9ADu/tcDAAAAAOADtf/LAEYASwA1/0YAGgEJAe4DGgH3/u4DAAAAAN4Dtv/LAFoAPAA1/0YA9AASAdcDPQEC/wIEAAAAANgDvv/LALUALQA1/0YA0AAaAcIDWwEN/xQEAAAAANADzv/LADUBHgA1/0YAswAeAbADcgEW/yAEAAAAAMoDpgDLAJABDwA1/0YAoAAhAaQDfwEc/ycEAAAAAMgD3gDLAKQBAAA1/0YAmgAiAaADhAEe/yoEAAAAAMoDpgDLAJAB8f81/0YAoAAhAaQDfwEc/ycEAAAAANADMgDLADUB4v81/0YAswAeAbADcgEW/yAEAAAAANgDQgDLALUA0/81/0YA0AAaAcIDWwEN/xQEAAAAAN4DSgDLAFoAxP81/0YA9AASAdcDPQEC/wIE',
    jump: 'AAAAANQDSwDLAEYASwA1/0YAAQEPAbADAQHx/rADAAAAAMQDPADLAEYAPAA1/0YAvQAcAYUDvQDk/oUDAAAAALcDLQDLAEYALQA1/0YAfQAkAWYDfQDc/mYDAAAAAKwDHgDLAEYAHgA1/0YASQAoAVIDSQDY/lIDAAAAAKQDDwDLAEYADwA1/0YAJwApAUgDJwDX/kgDAAAAAKIDAADLAEYAAAA1/0YAGwApAUUDGwDX/kUDAAAAAKQD8f/LAEYA8f81/0YAJwApAUgDJwDX/kgDAAAAAKwD4v/LAEYA4v81/0YASQAoAVIDSQDY/lIDAAAAALcD0//LAEYA0/81/0YAfQAkAWYDfQDc/mYDAAAAAMQDxP/LAEYAxP81/0YAvQAcAYUDvQDk/oUDAAAAANQDtf/LAEYAtf81/0YAAQEPAbADAQHx/rADAAAAANkDtv/LAE4Atv81/04AQAH+ANkDQAEC/9kDAAAAAPEDvv/LAHUAvv81/3UAdAHsABcEdAEU/xcEAAAAABEEzv/LAKwAzv81/6wAmQHcAFoEmQEk/1oEAAAAACkE5f/LANMA5f81/9MArgHRAIoErgEv/4oEAAAAAC4EAADLANwAAAA1/9wAtQHNAJgEtQEz/5gEAAAAACkEGwDLANMAGwA1/9MArgHRAIoErgEv/4oEAAAAABEEMgDLAKwAMgA1/6wAmQHcAFoEmQEk/1oEAAAAAPEDQgDLAHUAQgA1/3UAdAHsABcEdAEU/xcEAAAAANkDSgDLAE4ASgA1/04AQAH+ANkDQAEC/9kD',
    hop: 'AAAAANQDSwDLAEYAnP81/3IBlwDAAaQDlwBA/qQDAAAAAMQDPADLAEYAnP81/2IBlwDAAZQDlwBA/pQDAAAAALcDLQDLAEYAnP81/1QBlwDAAYYDlwBA/oYDAAAAAKwDHgDLAEYAnP81/0kBlwDAAXsDlwBA/nsDAAAAAKQDDwDLAEYAnP81/0IBlwDAAXQDlwBA/nQDAAAAAKIDAADLAEYAnP81/0ABlwDAAXIDlwBA/nIDAAAAAKQD8f/LAEYAnP81/0IBlwDAAXQDlwBA/nQDAAAAAKwD4v/LAEYAnP81/0kBlwDAAXsDlwBA/nsDAAAAALcD0//LAEYAnP81/1QBlwDAAYYDlwBA/oYDAAAAAMQDxP/LAEYAnP81/2IBlwDAAZQDlwBA/pQDAAAAANQDtf/LAEYAnP81/3IBlwDAAaQDlwBA/qQDAAAAANkDtv/LAE4AnP81/3cBlwDAAakDlwBA/qkDAAAAAPEDvv/LAHUAnP81/44BlwDAAcADlwBA/sADAAAAABEEzv/LAKwAnP81/68BlwDAAeEDlwBA/uEDAAAAACkE5f/LANMAnP81/8cBlwDAAfkDlwBA/vkDAAAAAC4EAADLANwAnP81/8wBlwDAAf4DlwBA/v4DAAAAACkEGwDLANMAnP81/8cBlwDAAfkDlwBA/vkDAAAAABEEMgDLAKwAnP81/68BlwDAAeEDlwBA/uEDAAAAAPEDQgDLAHUAnP81/44BlwDAAcADlwBA/sADAAAAANkDSgDLAE4AnP81/3cBlwDAAakDlwBA/qkD',
    posture: 'AAAAANQDAADLAEYAAAA1/0YAGgEJAeIDGgH3/uIDAAAAALsDAADLAEYAAAA1/0YAGgEJAckDGgH3/skDAAAAAKIDAADLAEYAAAA1/0YAGgEJAbADGgH3/rADAAAAAIkDAADLAEYAAAA1/0YAGgEJAZcDGgH3/pcDAAAAAHADAADLAEYAAAA1/0YAGgEJAX4DGgH3/n4DAAAAAFcDAADLAEYAAAA1/0YAGgEJAWUDGgH3/mUDAAAAAD4DAADLAEYAAAA1/0YAGgEJAUwDGgH3/kwDAAAAACUDAADLAEYAAAA1/0YAGgEJATMDGgH3/jMDAAAAAAwDAADLAEYAAAA1/0YAGgEJARoDGgH3/hoDAAAAAPMCAADLAEYAAAA1/0YAGgEJAQEDGgH3/gEDAAAAANoCAADLAEYAAAA1/0YAGgEJAegCGgH3/ugCAAAAAMECAADLAEYAAAA1/0YAGgEJAc8CGgH3/s8CAAAAAKgCAADLAEYAAAA1/0YAGgEJAbYCGgH3/rYCAAAAANQDAADLAEYAAAA1/0YAGgEJAeIDGgH3/uID8P8AANQDAADLAEYAAAA1/0YACgEJAdQDCgH3/tQD4P8AANQDAADLAEYAAAA1/0YA+gAJAcYD+gD3/sYD0P8AANQDAADLAEYAAAA1/0YA6QAJAbgD6QD3/rgDwP8AANQDAADLAEYAAAA1/0YA1wAJAaoD1wD3/qoDsf8AANQDAADLAEYAAAA1/0YAxQAJAZwDxQD3/pwDof8AANQDAADLAEYAAAA1/0YAsgAJAY4DsgD3/o4Dkv8AANQDAADLAEYAAAA1/0YAnwAJAYADnwD3/oADg/8AANQDAADLAEYAAAA1/0YAjAAJAXMDjAD3/nMDAAAAANQDAADLAEYAAAA1/0YAdwGi/+IDuf+E/uIDAAAAANQDAADLAEYAAAA1/0YAggECAOIDGgB+/uIDAAAAANQDAADLAEYAAAA1/0YAdgFhAOIDeACR/uIDAAAAANQDAADLAEYAAAA1/0YAUgG7AOIDzwC6/uIDAAAAANQDAADLAEYAAAA1/0YAGgEJAeIDGgH3/uIDAAAAANQDAADLAEYAAAA1/0YAzwBGAeIDUgFF/+IDAAAAANQDAADLAEYAAAA1/0YAeABvAeIDdgGf/+IDAAAAANQDAADLAEYAAAA1/0YAGgCCAeIDggH+/+IDAAAAANQDAADLAEYAAAA1/0YAuf98AeIDdwFeAOID',
    noise: 'AAAAANQDAADLAEYAAAA1/0YAGgEJAeIDGgH3/uIDAAAAANQDAADLAEYAAAA1/0YA/gCmARAEJAGh/uIDAAAAANQDAADLAEYAAAA1/0YA0gAnAmsEFgFf/twDAAAAANQDAADLAEYAAAA1/0YAnwB7AugE/QA6/ssDAAAAANQDAADLAEYAAAA1/0YAbACcAnQF5gA0/rADAAAAANQDAADLAEYAAAA1/0YAPgCLAv0F3QBM/pMDAAAAANQDAADLAEYAAAA1/0YAFgBRAnIG6gB7/nsDAAAAANQDAADLAEYAAAA1/0YA9P/+AccGDgG1/nQDAAAAANQDAADLAEYAAAA1/0YA1P+kAfgGQwHv/oEDAAAAANQDAADLAEYAAAA1/0YAtf9TAQoHggEe/6YDAAAAANQDAADLAEYAAAA1/0YAmf8YAQYHwAE7/90DAAAAANQDAADLAEYAAAA1/0YAg//4APYG9AFC/xsEAAAAANQDAADLAEYAAAA1/0YAef/yAOQGGAI3/1cEAAAAANQDAADLAEYAAAA1/0YAef/yAOQGGAI3/1cEAAAAANQDAADLAEYAAAA1/0YAef/yAOQGGAI3/1cEAAAAANQDAADLAEYAAAA1/0YAef/yAOQGGAI3/1cEAAAAANQDAADLAEYAAAA1/0YAef/yAOQGGAI3/1cEAAAAANQDAADLAEYAAAA1/0YAef/yAOQGGAI3/1cEAAAAANQDAADLAEYAAAA1/0YAef/yAOQGGAI3/1cEAAAAANQDAADLAEYAAAA1/0YAq//dAPkGJwIO/2sEAAAAANQDAADLAEYAAAA1/0YA6v/aAAYHLgLe/n0EAAAAANQDAADLAEYAAAA1/0YALgDpAAYHLQKk/o8EAAAAANQDAADLAEYAAAA1/0YAcAAMAfcGIwJi/qYEAAAAANQDAADLAEYAAAA1/0YApwBAAdcGDgIa/sQEAAAAANQDAADLAEYAAAA1/0YAygB+AacG7AHQ/ewEAAAAANQDAADLAEYAAAA1/0YA1ADCAWoGvgGL/SAFAAAAANQDAADLAEYAAAA1/0YAwgABAiUGggFQ/V0FAAAAANQDAADLAEYAAAA1/0YAlAA1At4FPAEk/aIFAAAAANQDAADLAEYAAAA1/0YATwBWApkF7wAN/esFAAAAANQDAADLAEYAAAA1/0YA9/9eAlwFoQAM/TQGAAAAANQDAADLAEYAAAA1/0YAl/9KAiwFVwAf/XoGAAAAANQDAADLAEYAAAA1/0YAl/9KAiwFVwAf/XoGAAAAANQDAADLAEYAAAA1/0YAl/9KAiwFVwAf/XoGAAAAANQDAADLAEYAAAA1/0YAl/9KAiwFVwAf/XoGAAAAANQDAADLAEYAAAA1/0YAl/9KAiwFVwAf/XoGAAAAANQDAADLAEYAAAA1/0YAl/9KAiwFVwAf/XoGAAAAANQDAADLAEYAAAA1/0YAl/9KAiwFVwAf/XoGAAAAANQDAADLAEYAAAA1/0YAkP9MAhAFlAAq/W4GAAAAANQDAADLAEYAAAA1/0YAj/9KAu4E0gA4/VMGAAAAANQDAADLAEYAAAA1/0YAlf9EAscECwFK/SoGAAAAANQDAADLAEYAAAA1/0YApP86Ap0EPgFf/fIFAAAAANQDAADLAEYAAAA1/0YAvf8rAnEEZwF6/a8FAAAAANQDAADLAEYAAAA1/0YA3/8WAkYEgwGb/WQFAAAAANQDAADLAEYAAAA1/0YACgD7ASAEkQHD/RQFAAAAANQDAADLAEYAAAA1/0YAOwDYAQAEjwHz/cQEAAAAANQDAADLAEYAAAA1/0YAcgCvAegDgAEq/nkEAAAAANQDAADLAEYAAAA1/0YAqwB+AdsDZQFp/jgEAAAAANQDAADLAEYAAAA1/0YA5ABGAdkDQgGu/gUEAAAAANQDAADLAEYAAAA1/0YAGgEJAeIDGgH3/uIDAAAAANQDAADLAEYAAAA1/0YAGgEJAeIDGgH3/uIDAAAAANQDAADLAEYAAAA1/0YAGgEJAeIDGgH3/uIDAAAAANQDAADLAEYAAAA1/0YAGgEJAeIDGgH3/uIDAAAAANQDAADLAEYAAAA1/0YAGgEJAeIDGgH3/uIDAAAAANQDAADLAEYAAAA1/0YAGgEJAeIDGgH3/uID'
  };
  var TOY_L = { walk: 0.15, walk_hi: 0.35, jump: 0.15, hop: 0.15 }; // 各张贴图表用的抬脚命令 l
  var ANKLE_H = 0.0698; // 踝关节原点离脚底
  var BASE_H = 0.98; // 代码 rewards.base_height_target
  var NOISE_FPS = 10, NOISE_SEG = 18; // 干预贴图：10 fps，每 90 步（1.8 s）一个目标
  var TOY_CACHE = {};
  function decode(b64) {
    var bin = atob(b64), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Int16Array(u.buffer);
  }
  function toyFrame(key, k) {
    var a = TOY_CACHE[key] || (TOY_CACHE[key] = decode(TOY[key]));
    var n = SHEETS[key].n, i = ((k % n) + n) % n, o = i * 15;
    function p(j) { return [a[o + 3 * j] / 1000, a[o + 3 * j + 1] / 1000, a[o + 3 * j + 2] / 1000]; }
    return { k: i, pel: p(0), ank: [p(1), p(2)], hand: [p(3), p(4)] };
  }
  function postureIndex(cmd, v) {
    if (cmd === 'h') return clamp(Math.round(-v / 0.025), 0, 12);
    if (cmd === 'p') return 13 + clamp(Math.round(v / 0.05), 0, 8);
    return 22 + clamp(Math.round((v + 1) / 0.25), 0, 8);
  }

  // ─── 相位、期望接地概率、目标抬脚轨迹（论文 III-A、III-C） ─────────────────────────
  function erf(x) {
    var s = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  function Phi(x) { return 0.5 * (1 + erf(x / Math.SQRT2)); }
  /* 式 (3)：期望接地概率 */
  function contactProb(pb, sigma) {
    var s = sigma || SIGMA;
    return Phi(pb / s) * (1 - Phi((pb - 0.5) / s)) + Phi((pb - 1) / s) * (1 - Phi((pb - 1.5) / s));
  }
  /* 式 (4)：均匀化的相位 φ̄，把着地段映到 [0, 0.5)、摆动段映到 [0.5, 1) */
  function barPhi(phi, st) {
    var s = st == null ? 0.5 : st;
    phi = ((phi % 1) + 1) % 1;
    return phi < s ? 0.5 * phi / s : 0.5 + 0.5 * (phi - s) / (1 - s);
  }
  /* 五次多项式：起止速度、加速度为 0 */
  function quintic(tau) {
    var t = clamp(tau, 0, 1);
    return 10 * t * t * t - 15 * t * t * t * t + 6 * t * t * t * t * t;
  }
  /* 式 (8)：目标抬脚高度（离地） */
  function swingTarget(pb, l) {
    return pb < 0.5 ? 0 : l * quintic((0.25 - Math.abs(pb - 0.75)) / 0.25);
  }
  /* 官方代码真正生效的 feet_clearance_cmd_linear：三角形，峰值 l，再加 0.07 m 的踝高 */
  function codeLinearTarget(phi, l) {
    var ph = 1 - Math.abs(1 - clamp(phi * 2 - 1, 0, 1) * 2);
    return l * ph + 0.07;
  }
  function clockOf(pb) { return Math.sin(2 * Math.PI * pb); }
  /* 四种步态：两只脚的相位 */
  function gaitPhases(gait, phi1) {
    phi1 = ((phi1 % 1) + 1) % 1;
    if (gait === 'walk') return [phi1, (phi1 + 0.5) % 1];
    if (gait === 'jump') return [phi1, phi1];
    if (gait === 'stand') return [0.25, 0.25];
    return [phi1, 0.75];
  }
  var GAIT_ZH = { walk: '走', jump: '跳', stand: '站', hop: '单脚跳' };
  var GAIT_SHEET = { walk: 'walk', jump: 'jump', stand: 'posture', hop: 'hop' };
  /* 期望的连续段长度：每步以 p 翻转 → Σ n p (1−p)^n = (1 − p) / p */
  function runLength(p) { return (1 - p) / p; }
  /* 官方代码的正则课程：正则项乘 0.2，每 100 次迭代开 0.8 次方 */
  function penaltyScale(iter) { return Math.pow(0.2, Math.pow(0.8, Math.floor(iter / 100))); }

  // ─── 讲解动画：十六幕 ───────────────────────────────────────────────────────
  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    paint = K.paint,
    seg = K.seg,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
    polyPath = K.polyPath;

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
  /* 配色照论文图 4：左脚 φ₁ 紫、右脚 φ₂ 绿、着地蓝、摆动黄；命令按组：任务蓝、脚黄、姿态紫、步态绿 */
  var C_LEFT = C_PURPLE, C_RIGHT = C_GOOD, C_STANCE = C_ACCENT, C_SWING = C_WARN;
  var GRP_COLOR = { task: C_ACCENT, foot: C_WARN, posture: C_PURPLE, gait: C_GOOD };
  var CUES = [0.4, 3.6, 7.0, 10.4, 13.4], DUR = 16;

  function nowOf(t, clock) {
    return clock == null ? t : clock;
  }
  /* 一段窗口：a 之后 0.3 s 起淡入 0.4 s，到 b 才开始淡出 0.3 s（淡出落在 b 之后：视频里旁白比分镜长时，t 停在 b 前一点） */
  function win(t, a, b) {
    return seg(t, a + 0.3, a + 0.7) * (b == null ? 1 : 1 - seg(t, b, b + 0.3));
  }
  /* 第 i 段面板的可见度 */
  function cueWin(t, i) {
    return win(t, i === 0 ? 0.3 : CUES[i], i + 1 < CUES.length ? CUES[i + 1] : null);
  }
  /* 一幕里从 cue 起算的真实秒数 */
  function since(t, clock, cue) {
    return clock == null ? t - cue : Math.max(0, clock - cue);
  }
  /* 当前落在第几段（按 t） */
  function cueIndex(t) {
    var i = 0;
    CUES.forEach(function (c, k) { if (t >= c) i = k; });
    return i;
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
  function bar(parent, x, y, h, color, opacity) {
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
  function math(parent, x, y, tex, size, anchor, w) {
    var n = svgMath(x, y, tex, { size: size || 14, anchor: anchor || 'start', w: w });
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
    fig1: ['fig1_teaser.webp', 1292, 649],
    fig2: ['fig2_framework.webp', 2000, 800],
    fig3: ['fig3_contact.webp', 911, 380],
    fig5: ['fig5_noise.webp', 779, 639],
    fig6: ['fig6_radar.webp', 1400, 679],
    fig8w: ['fig8_walk.webp', 2100, 2061],
    fig8s: ['fig8_stand.webp', 900, 851]
  };
  function paperPart(parent, key, u0, v0, u1, v1, x, y, w, caption) {
    var F = FIGS[key];
    return figPart(parent, F[0], F[1], F[2], u0, v0, u1, v1, x, y, w, caption);
  }
  /* 图 8 走路热图的一格：第 r 行、第 c 列（8 × 8，每格约 163 px） */
  function heatCell(r, c) {
    var x0 = 57 + 163.3 * c, y0 = 28 + 163.4 * r;
    return [x0 / 1400, y0 / 1374, (x0 + 161) / 1400, (y0 + 161) / 1374];
  }
  /* 项目页的一段视频：深色底框；draw 里调 .at(秒, 是否可见)。opts.range = [起, 止] 只放片段里的这一段（循环） */
  function projClip(parent, id, x, y, w, h, caption, opts) {
    var o = opts || {}, g = group(parent);
    g.appendChild(svgEl('rect', { x: (x - 2).toFixed(1), y: (y - 2).toFixed(1), width: (w + 4).toFixed(1), height: (h + 4).toFixed(1), rx: 5, fill: '#111111', stroke: 'none' }));
    var c = K.svgClip(x, y, w, h, CLIP_BASE + id + '.mp4', { poster: CLIP_BASE + id + '.webp' });
    g.appendChild(c);
    var cap = caption ? label(g, o.capX == null ? x + w / 2 : o.capX, y + h + (o.capDy || 17), caption, 'demo-x-mut', o.capSize || 9.5, o.capAnchor || 'middle') : null;
    return {
      g: g, x: x, y: y, w: w, h: h, cap: cap,
      at: function (sec, vis) {
        var s = Math.max(0, sec);
        if (o.range) s = o.range[0] + (s % (o.range[1] - o.range[0]));
        c.at(s, vis);
      }
    };
  }
  /* 片段的时长（秒） */
  var CLIP_DUR = { intro: 21.4, noise: 8.0, hello: 11.5, box: 18.0, posture: 19.9, lawn: 9.0 };
  /* intro 是四段拼起来的：户外走跑、侧向跳、单脚跳、跳着张开 / 交叉手臂（各自在源视频里的时刻见笔记） */
  var INTRO_PARTS = [[4.0, '户外走、跑'], [6.0, '侧向跳'], [5.0, '单脚跳'], [6.4, '跳着张开、交叉手臂']];
  /* posture 片段里项目页字幕换掉的时刻（相对片段开头，逐帧比对左下角字幕量出来的）：Height ↓↑、Pitch ↓↑、Waist ←→、Frequency */
  var POSTURE_TAGS = [[0, 2.9, '身高 $h$ ↓'], [2.9, 4.1, '身高 $h$ ↑'], [5.0, 6.5, '俯仰 $p$ ↓'], [6.5, 8.5, '俯仰 $p$ ↑'], [8.5, 9.7, '腰 $w$ ←'],
    [9.7, 10.7, '腰 $w$ →'], [11.4, 12.9, '腰 $w$ →'], [12.9, 13.7, '腰 $w$ ←'], [15.0, 19.9, '步频 $f$ 先升后降']];
  /* 三维 → 画布：z 朝上；绕竖轴转 yaw、抬头 pitch 的正交投影；世界原点（地面）对准 (ox, oy) */
  function project(p, cam) {
    var c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
    var xr = p[0] * c + p[1] * s, depth = -p[0] * s + p[1] * c;
    var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    return [cam.ox + cam.s * xr, cam.oy - cam.s * (p[2] * cp + depth * sp), depth];
  }
  function camOf(key, s, ox, oy) {
    var M = SHEETS[key];
    return { yaw: M.yaw, pitch: M.pitch, s: s, ox: ox, oy: oy };
  }
  /* 一台 H1：贴图表里的一格；sheet 可以换（同一套相机）。opts.flip：沿 ox 竖线左右镜像。贴图第一次用到才设 href */
  function toyBot(parent, opts) {
    var o = opts || {}, g = group(parent), flipG = group(g), imgs = {}, cur = null, lastF = -1;
    g.setAttribute('class', 'demo-x-g1mesh');
    function boxFor(key) {
      if (imgs[key]) return imgs[key];
      var M = SHEETS[key], rows = Math.ceil(M.n / M.cols);
      var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: 0, height: 0 });
      var img = svgEl('image', { x: 0, y: 0, width: M.cw * M.cols, height: M.ch * rows, preserveAspectRatio: 'none' });
      box.appendChild(img);
      box.style.display = 'none';
      flipG.appendChild(box);
      imgs[key] = { box: box, img: img, woke: false };
      return imgs[key];
    }
    return {
      g: g,
      put: function (key, cam, fr) {
        var M = SHEETS[key], b = boxFor(key);
        if (cur !== key) {
          Object.keys(imgs).forEach(function (k2) { imgs[k2].box.style.display = k2 === key ? '' : 'none'; });
          cur = key; lastF = -1;
        }
        if (!b.woke && H1_3D_BASE) { b.woke = true; b.img.setAttribute('href', H1_3D_BASE + M.file); }
        var k = cam.s / M.R, f = clamp(Math.round(fr || 0), 0, M.n - 1);
        b.box.setAttribute('x', (cam.ox - M.ax * k).toFixed(1));
        b.box.setAttribute('y', (cam.oy - M.ay * k).toFixed(1));
        b.box.setAttribute('width', (M.cw * k).toFixed(1));
        b.box.setAttribute('height', (M.ch * k).toFixed(1));
        if (f !== lastF) {
          b.box.setAttribute('viewBox', [(f % M.cols) * M.cw, Math.floor(f / M.cols) * M.ch, M.cw, M.ch].join(' '));
          lastF = f;
        }
        if (o.flip) flipG.setAttribute('transform', 'translate(' + (2 * cam.ox).toFixed(1) + ' 0) scale(-1 1)');
      }
    };
  }
  /* 地面：一条线 + 每 0.5 m 一道刻度，按 shift（米）往后退，表示在往前走 */
  function groundTicks(parent, x1, x2, key) {
    var g = group(parent), base = hline(g, x1, 0, x2, 0, C_BORDER, 1.4), ticks = [];
    for (var i = 0; i < 9; i++) ticks.push(hline(g, 0, 0, 0, 0, C_BORDER, 2));
    return {
      g: g,
      put: function (cam, shift) {
        var a = project([0, 0, 0], cam);
        setLine(base, x1, a[1], x2, a[1]);
        var off = ((shift || 0) % 0.5 + 0.5) % 0.5;
        ticks.forEach(function (tk, i) {
          var p = project([(i - 4) * 0.5 - off, 0, 0], cam);
          var on = p[0] > x1 + 4 && p[0] < x2 - 12;
          setLine(tk, p[0], p[1], p[0] + 9, p[1] + 5);
          tk.style.opacity = on ? 1 : 0;
        });
      }
    };
  }
  /* 圆弧：相位 a → b（从顶上起逆时针，和论文图 4 一样：左半圈着地、右半圈摆动） */
  function phasePt(cx, cy, r, phi) {
    var a = 2 * Math.PI * phi;
    return [cx - r * Math.sin(a), cy - r * Math.cos(a)];
  }
  function arcD(cx, cy, r, a, b) {
    var span = b - a;
    if (span >= 0.999) {
      var m = phasePt(cx, cy, r, a + 0.5), s0 = phasePt(cx, cy, r, a);
      return 'M ' + s0[0].toFixed(1) + ' ' + s0[1].toFixed(1) + ' A ' + r + ' ' + r + ' 0 1 0 ' + m[0].toFixed(1) + ' ' + m[1].toFixed(1) +
        ' A ' + r + ' ' + r + ' 0 1 0 ' + s0[0].toFixed(1) + ' ' + s0[1].toFixed(1);
    }
    var p0 = phasePt(cx, cy, r, a), p1 = phasePt(cx, cy, r, b);
    return 'M ' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A ' + r + ' ' + r + ' 0 ' + (span > 0.5 ? 1 : 0) + ' 0 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
  }
  /* 论文图 4 的相位环：内圈左脚 φ₁（紫）、外圈右脚 φ₂（绿）；每圈左半蓝（着地）、右半黄（摆动） */
  function phaseRings(parent, cx, cy, r1, r2, opts) {
    var o = opts || {}, g = group(parent), bw = o.band || 8;
    [r1, r2].forEach(function (r) {
      var st = paint(svgEl('path', { d: arcD(cx, cy, r, 0, 0.5), fill: 'none', 'stroke-width': bw, opacity: 0.32 }), null, C_STANCE);
      var sw = paint(svgEl('path', { d: arcD(cx, cy, r, 0.5, 1), fill: 'none', 'stroke-width': bw, opacity: 0.32 }), null, C_SWING);
      g.appendChild(st); g.appendChild(sw);
    });
    hline(g, cx, cy - r2 - bw, cx, cy - r1 + bw, C_MUTED, 1.2);
    label(g, cx, cy - r2 - bw - 3, '0', 'demo-x-mut', 9, 'middle');
    var hand1 = hline(g, cx, cy, cx, cy, C_LEFT, 1.6), hand2 = hline(g, cx, cy, cx, cy, C_RIGHT, 1.6);
    var m1 = dotAt(g, cx, cy, o.dot || 5.5, C_LEFT), m2 = dotAt(g, cx, cy, o.dot || 5.5, C_RIGHT);
    var psiArc = paint(svgEl('path', { d: 'M 0 0', fill: 'none', 'stroke-width': 1.6, 'stroke-dasharray': '3 3' }), null, C_MUTED);
    g.appendChild(psiArc);
    if (!o.noLegend) {
      label(g, cx - r2 - bw, cy + r2 + bw + 14, '左半：着地', 'demo-x-acc', 9.5, 'start');
      label(g, cx + r2 + bw, cy + r2 + bw + 14, '右半：摆动', 'demo-x-warn', 9.5, 'end');
    }
    return {
      g: g,
      set: function (ph1, ph2) {
        var a = phasePt(cx, cy, r1, ph1), b = phasePt(cx, cy, r2, ph2);
        moveDot(m1, a); moveDot(m2, b);
        setLine(hand1, cx, cy, a[0], a[1]); setLine(hand2, cx, cy, b[0], b[1]);
        var d = ((ph2 - ph1) % 1 + 1) % 1;
        psiArc.setAttribute('d', d > 0.01 ? arcD(cx, cy, r2 + bw + 3, ph1, ph1 + d) : 'M 0 0');
      }
    };
  }
  /* 小坐标系：(x, y, w, h) 里画 u ∈ [u0, u1]、v ∈ [v0, v1] */
  function miniPlot(parent, x, y, w, h, u0, u1, v0, v1, opts) {
    var o = opts || {}, g = group(parent);
    rectBox(g, x, y, w, h, C_BORDER, C_SURFACE2);
    function px(u) { return x + (u - u0) / (u1 - u0) * w; }
    function py(v) { return y + h - (v - v0) / (v1 - v0) * h; }
    (o.yTicks || []).forEach(function (v) {
      hline(g, x, py(v), x + w, py(v), C_BORDER, 0.8, '2 3');
      label(g, x - 6, py(v) + 3.5, String(v).replace('-', '−'), 'demo-x-mut', 9, 'end');
    });
    (o.xTicks || []).forEach(function (u) {
      label(g, px(u), y + h + 14, String(u), 'demo-x-mut', 9, 'middle');
    });
    if (o.xLabel) rich(g, x + w, y + h + 34, o.xLabel, 10, 'demo-x-mut', 'end', 200);
    if (o.yLabel) rich(g, x, y - 7, o.yLabel, 10, 'demo-x-mut', 'start', 260);
    return {
      g: g, px: px, py: py,
      curve: function (fn, color, width, dash, n) {
        var pts = [], N = n || 160;
        for (var i = 0; i <= N; i++) { var u = u0 + (u1 - u0) * i / N; pts.push([px(u), py(fn(u))]); }
        return pathLine(g, pts, color, width || 2, dash);
      },
      setCurve: function (p, fn, n) {
        var pts = [], N = n || 160;
        for (var i = 0; i <= N; i++) { var u = u0 + (u1 - u0) * i / N; pts.push([px(u), py(fn(u))]); }
        setPath(p, pts);
      }
    };
  }
  function f2(x) { return fmt(x, 2); }
  function f3(x) { return fmt(x, 3); }
  function sgn(s) { return String(s).replace(/-/g, '−'); }
  /* 表里的数照论文的写法 */
  function paperNum(v) { return v == null ? '–' : v >= 1 ? v.toFixed(v >= 10 ? 2 : 3) : String(v); }
  /* 面板：右栏一组一组，按 cue 淡入淡出 */
  function panels(s, n) {
    var ps = [];
    for (var i = 0; i < n; i++) ps.push(group(s));
    return ps;
  }
  function fadePanels(ps, t) {
    ps.forEach(function (p, i) { setOpacity(p, cueWin(t, i)); });
  }
  var R = 404, RW = 372;

  /* ── scene 1: 人会的，人形还做不到 ── */
  function buildSceneIntro() {
    var s = sceneSvg('左边：项目页视频里 HugWBC 控制的 Unitree H1，依次是户外走跑、侧向跳、单脚跳、跳着张开和交叉手臂；右边依次出现：人会的步态与可调的参数、' +
      '以前学出来的人形行走的四个毛病、上身一被接管下身就失稳；讲 HugWBC 的三件事时换成铺满的论文图 2，按旁白依次框出命令、步态与输出、外部控制；最后是出处');
    s.appendChild(svgText(24, 26, '人会的这些，学出来的人形行走大多做不到', 'demo-x-ink2', 13.5));
    var VX = 44, VY = 44, VW = 320;
    var vid = group(s);
    var clip = projClip(vid, 'intro', VX, VY, VW, VW, '');
    var acc = 0, total = 0, bars = [];
    INTRO_PARTS.forEach(function (p) { total += p[0]; });
    INTRO_PARTS.forEach(function (p) {
      var r = paint(svgEl('rect', { x: (VX + acc / total * VW).toFixed(1), y: VY + VW + 8, width: (p[0] / total * VW - 4).toFixed(1), height: 5, rx: 2.5 }), C_ACCENT);
      vid.appendChild(r); bars.push(r); acc += p[0];
    });
    var name = label(vid, VX, VY + VW + 30, '', 'demo-x-ink', 12.5);
    label(vid, VX + VW, VY + VW + 30, '项目页视频（1 倍速）', 'demo-x-mut', 10, 'end');
    /* 第 4 段：论文图 2 铺满卡片，旁白念到哪件事就框出图里对应的部分（时刻按旁白的字幕量出来） */
    var figG = group(s), FX = 24, FY = 40, FW = 752, FS = FW / 2000;
    paperPart(figG, 'fig2', 0, 0, 1, 1, FX, FY, FW, '');
    function f2box(x0, y0, x1, y1, color) {
      var r = rectBox(figG, FX + x0 * FS, FY + y0 * FS, (x1 - x0) * FS, (y1 - y0) * FS, color, 'none');
      r.setAttribute('stroke-width', 3);
      return r;
    }
    var HL = [
      [f2box(25, 15, 640, 740, C_ACCENT), f2box(640, 228, 1132, 392, C_ACCENT)],
      [f2box(652, 428, 1312, 738, C_GOOD), f2box(1326, 70, 1536, 726, C_GOOD)],
      [f2box(1544, 55, 1976, 606, C_WARN), f2box(900, 148, 1262, 240, C_WARN)]
    ];
    var HL_AT = [2.1, 4.8, 8.4];
    var CY3 = FY + FW * 800 / 2000 + 12;
    chip(figG, FX, CY3, 244, '① 命令 = **任务** + **行为**', C_ACCENT, { size: 11.5 });
    chip(figG, FX + 254, CY3, 244, '② 一个策略：走、跳、站（单脚跳另训）', C_GOOD, { size: 11 });
    chip(figG, FX + 508, CY3, 244, '③ 干预训练：上身交给别人', C_WARN, { size: 11.5 });
    label(figG, FX + FW, CY3 + 44, '论文图 2：(a) 命令　(b) 策略与四种步态　(c) 输出　(d) 外部的上身控制', 'demo-x-mut', 9.5, 'end');
    var ps = panels(s, 5);
    label(ps[0], R, 64, '人会的', 'demo-x-ink', 14);
    chip(ps[0], R, 80, 110, '走、跑', C_ACCENT, { size: 12 });
    chip(ps[0], R + 120, 80, 110, '跳', C_ACCENT, { size: 12 });
    chip(ps[0], R + 240, 80, 132, '单脚跳', C_ACCENT, { size: 12 });
    chip(ps[0], R, 120, RW, '只是走路，也能细调：频率、步幅、抬脚高度', C_WARN, { size: 12 });
    label(ps[0], R, 180, '论文引言的原话（even when only walking…）', 'demo-x-mut', 11);
    label(ps[1], R, 64, '以前学出来的人形行走', 'demo-x-ink', 14);
    [['单一', 'single'], ['乏味', 'tedious'], ['不可扩展', 'unextendable'], ['不受约束', 'unconstrained']].forEach(function (w, i) {
      chip(ps[1], R + (i % 2) * 190, 80 + Math.floor(i / 2) * 38, 182, w[0] + '　' + w[1], C_BAD, { size: 12 });
    });
    label(ps[1], R, 178, '多数工作不在意步态风格能不能变、能不能控', 'demo-x-ink2', 12.5);
    label(ps[1], R, 200, '摘要原话：single, tedious, unextendable, unconstrained', 'demo-x-mut', 11);
    label(ps[2], R, 64, '上身一被接管', 'demo-x-ink', 14);
    chip(ps[2], R, 80, RW, '遥操作、IK、关节序列回放：外部接管手臂', C_WARN, { size: 12 });
    var a3 = arrow(ps[2], C_MUTED, 2); a3.set(R + RW / 2, 112, R + RW / 2, 130, 7);
    chip(ps[2], R, 134, RW, '下身策略没见过这种上身 → 容易失稳', C_BAD, { size: 12 });
    label(ps[2], R, 190, 'HOVER、OmniH2O：把上身目标塞进命令空间一起跟', 'demo-x-mut', 11);
    label(ps[2], R, 210, 'HugWBC：上身直接交给外部控制器，下身照样跟命令', 'demo-x-mut', 11);
    label(ps[4], R, 64, '出处', 'demo-x-ink', 14);
    chip(ps[4], R, 80, RW, 'Yufei Xue、Wentao Dong（共同一作）等五位作者', C_BORDER, { size: 11.5, left: true });
    chip(ps[4], R, 118, RW, '上海交通大学 · 上海人工智能实验室 · RSS 2025', C_BORDER, { size: 11.5, left: true });
    chip(ps[4], R, 156, RW, 'Unitree H1（19 个自由度）· Isaac Gym · 代码 2025-06 开源', C_BORDER, { size: 11.5, left: true });
    var last = -1;
    function draw(t, clock) {
      var ci = cueIndex(t);
      /* 片段在第 4 段让位给论文图 2，第 5 段再回来 */
      var vOp = ci < 3 ? 1 : ci === 3 ? 1 - seg(t, CUES[3], CUES[3] + 0.3) : seg(t, CUES[4] + 0.3, CUES[4] + 0.7);
      setOpacity(vid, vOp);
      setOpacity(figG, ci >= 3 ? win(t, CUES[3], CUES[4]) : 0);
      var u = clock == null ? (t - CUES[3]) * 3 : K.clipSince(t, CUES[3]);
      HL.forEach(function (g, k) { g.forEach(function (r) { setOpacity(r, ci === 3 && u >= HL_AT[k] ? 1 : 0); }); });
      var sec = Math.max(0, K.clipSince(t, 0));
      clip.at(sec, vOp > 0);
      var m = ((sec % total) + total) % total, idx = 0, a = 0;
      INTRO_PARTS.forEach(function (p, i) { if (m >= a) idx = i; a += p[0]; });
      if (idx !== last) {
        last = idx;
        bars.forEach(function (r, i) { r.style.opacity = i === idx ? 1 : 0.25; });
        name.textContent = (idx + 1) + ' / 4　' + INTRO_PARTS[idx][1];
      }
      fadePanels(ps, t);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 命令空间：任务 + 行为 ── */
  function buildSceneCommands() {
    var s = sceneSvg('左边：一台 H1（按命令摆的运动学示意）依次演示速度、抬脚高度、身高 / 俯仰 / 腰、步态相位；右边是表 II 的命令表，讲到哪组哪组亮');
    s.appendChild(svgRich(24, 26, '命令空间 $\\mathcal{C} = \\mathcal{K} \\times \\mathcal{B}$：任务命令 + 行为命令', { size: 13.5, cls: 'demo-x-ink2', w: 520 }));
    var left = group(s);
    rectBox(left, 24, 38, 360, 360, C_BORDER, C_SURFACE2);
    var OX = 190, OY = 352, SC = 140;
    var ground = groundTicks(left, 30, 378);
    var bot = toyBot(left);
    var ov = group(left);
    var vArr = arrow(ov, C_ACCENT, 3);
    var vLab = rich(ov, 0, 0, '$v_x$', 13, 'demo-x-acc', 'start', 60);
    var wArc = paint(svgEl('path', { d: 'M 0 0', fill: 'none', 'stroke-width': 2.4 }), null, C_ACCENT);
    ov.appendChild(wArc);
    var wHead = arrowHead(ov, C_ACCENT);
    var wLab = rich(ov, 0, 0, '$\\omega$', 13, 'demo-x-acc', 'start', 60);
    var lLine = hline(ov, 0, 0, 0, 0, C_WARN, 1.6, '4 3'), lTop = hline(ov, 0, 0, 0, 0, C_WARN, 2), lBot = hline(ov, 0, 0, 0, 0, C_WARN, 2);
    var lLab = rich(ov, 0, 0, '', 12, 'demo-x-warn', 'start', 120);
    var hLine = hline(ov, 0, 0, 0, 0, C_PURPLE, 2), hLab = rich(ov, 0, 0, '', 12, 'demo-x-ink2', 'end', 140);
    var pLab = rich(ov, 0, 0, '', 12, 'demo-x-ink2', 'start', 140);
    var rings = phaseRings(left, 318, 108, 22, 34, { band: 7, dot: 4.5, noLegend: true });
    var ringLab = rich(left, 318, 162, '', 11, 'demo-x-ink2', 'middle', 140);
    var ringKey = rich(left, 318, 180, '蓝：着地　黄：摆动', 10, 'demo-x-mut', 'middle', 140);
    var tag = label(left, 36, 390, '', 'demo-x-mut', 10.5);
    /* 右栏：表 II */
    var tb = group(s);
    var TX = [R, R + 44, R + 92, R + 196, R + 238], TY = 50, RH = 25;
    label(tb, TX[0], TY, '组', 'demo-x-mut', 10.5); label(tb, TX[1], TY, '命令', 'demo-x-mut', 10.5); label(tb, TX[2], TY, '含义', 'demo-x-mut', 10.5);
    label(tb, TX[3], TY, '默认', 'demo-x-mut', 10.5); label(tb, TX[4], TY, '范围（表 II）', 'demo-x-mut', 10.5);
    var rowsG = [];
    var GRP_ZH = { task: '任务', foot: '脚', posture: '姿态' };
    CMDS.forEach(function (c, i) {
      var g = group(tb), y = TY + 12 + i * RH;
      rectBox(g, R - 4, y, RW + 4, RH - 3, GRP_COLOR[c.grp], C_SURFACE);
      tone(g, TX[0] + 2, y + 16, GRP_ZH[c.grp], GRP_COLOR[c.grp], 11);
      math(g, TX[1], y + 16, c.sym, 13);
      label(g, TX[2], y + 16, c.zh, 'demo-x-ink2', 11);
      label(g, TX[3], y + 16, c.def, 'demo-x-ink2', 11);
      label(g, TX[4], y + 16, c.range + ' ' + c.unit, 'demo-x-ink2', 10);
      rowsG.push({ g: g, grp: c.grp });
    });
    var gy = TY + 12 + CMDS.length * RH;
    var gaitG = group(tb);
    rectBox(gaitG, R - 4, gy, RW + 4, RH + 6, C_GOOD, C_SURFACE);
    tone(gaitG, TX[0] + 2, gy + 19, '步态', C_GOOD, 11);
    math(gaitG, TX[1], gy + 19, '\\psi,\\ \\phi_1,\\ \\phi_2,\\ \\phi_{\\text{stance}}', 13);
    label(gaitG, TX[3] + 14, gy + 19, '相位偏移、两脚相位、支撑占比', 'demo-x-ink2', 10.5);
    var NY = gy + 52;
    var notes = panels(s, 5);
    rich(notes[0], R, NY, '**任务命令** $\\mathcal{K}$：往哪走——$v_x, v_y$ 和偏航角速度 $\\omega$', 12, 'demo-x-ink2', 'start', RW);
    rich(notes[0], R, NY + 22, '$v_x$、$\\omega$ 的上限靠速度课程慢慢放开', 11, 'demo-x-mut', 'start', RW);
    rich(notes[1], R, NY, '**脚**：步频 $f$（一秒几个周期）、最高抬脚 $l$', 12, 'demo-x-ink2', 'start', RW);
    rich(notes[1], R, NY + 22, '左边：$l = 0.35$ m（范围上限），$f = 2$ Hz', 11, 'demo-x-mut', 'start', RW);
    rich(notes[2], R, NY, '**姿态**：身高 $h$（相对 0.98 m）、俯仰 $p$、腰偏航 $w$', 12, 'demo-x-ink2', 'start', RW);
    rich(notes[2], R, NY + 22, 'H1 腰上只有一个偏航关节：弯腰靠骨盆和髋', 11, 'demo-x-mut', 'start', RW);
    rich(notes[3], R, NY, '**步态**：$\\psi$、$\\phi_1, \\phi_2$、$\\phi_{\\text{stance}}$（论文固定 0.5）', 12, 'demo-x-ink2', 'start', RW);
    rich(notes[3], R, NY + 22, '下一幕讲：同一组命令怎么切出四种步态', 11, 'demo-x-mut', 'start', RW);
    rich(notes[4], R, NY, '官方代码：命令 11 维 + 两个时钟 = 13 维', 12, 'demo-x-ink2', 'start', RW);
    rich(notes[4], R, NY + 22, '$3 + 4\\,(f, \\psi, \\phi_{\\text{stance}}, l) + 1\\,(h) + 2\\,(p, w) + 1\\,(I)$', 11, 'demo-x-mut', 'start', RW);
    function draw(t, clock) {
      var now = nowOf(t, clock), ci = cueIndex(t), cam = camOf('walk', SC, OX, OY);
      var key = 'walk', fr = 0, shift = 0, phi1 = (now * 1.0) % 1;
      var showV = ci === 0 || ci === 4, showL = ci === 1, showP = ci === 2, showRing = ci >= 3;
      if (ci === 1) key = 'walk_hi';
      if (ci === 2) key = 'posture';
      if (key !== 'posture') { fr = Math.floor(phi1 * 20); shift = now * 0.5; }
      var hv = 0, pv = 0, wv = 0, sub = '';
      if (key === 'posture') {
        var u = since(t, clock, CUES[2]) % 9, k = u % 3 / 3, bump = Math.pow(Math.sin(Math.PI * k), 2);
        if (u < 3) { hv = -0.3 * bump; fr = postureIndex('h', hv); sub = 'h'; }
        else if (u < 6) { pv = 0.4 * bump; fr = postureIndex('p', pv); sub = 'p'; }
        else { wv = Math.sin(2 * Math.PI * k); fr = postureIndex('w', wv); sub = 'w'; }
      }
      ground.put(cam, shift);
      bot.put(key, cam, fr);
      var F = toyFrame(key, fr);
      /* 速度：脚下往前的箭头；角速度：头顶的一段弧 */
      var g0 = project([0.15, -0.35, 0], cam), g1 = project([0.75, -0.35, 0], cam);
      vArr.set(g0[0], g0[1], g1[0], g1[1], 9); vLab.setX(g1[0] + 4); vLab.setY(g1[1] + 4);
      var top = project([F.pel[0], 0, F.pel[2] + 0.95], cam), pts = [];
      for (var i = 0; i <= 24; i++) { var a = -2.4 + 3.6 * i / 24; pts.push(project([F.pel[0] + 0.22 * Math.cos(a), 0.22 * Math.sin(a), F.pel[2] + 0.95], cam)); }
      wArc.setAttribute('d', fmtPath(pts)); wHead.set(pts[22][0], pts[22][1], pts[24][0], pts[24][1], 8);
      wLab.setX(top[0] + 34); wLab.setY(top[1] - 12);
      setOpacity(ov, 1);
      [vArr.g, vLab, wArc, wHead.node, wLab].forEach(function (n) { setOpacity(n, showV ? 1 : 0); });
      /* 抬脚：摆动脚的目标高度 */
      var sw = F.ank[0][2] > F.ank[1][2] ? 0 : 1, an = F.ank[sw], lv = TOY_L.walk_hi;
      var gp = project([an[0], an[1], 0], cam), lp = project([an[0], an[1], lv + ANKLE_H], cam);
      var lx = OX + 96;
      setLine(lLine, lx, gp[1], lx, lp[1]); setLine(lTop, lx - 5, lp[1], lx + 5, lp[1]); setLine(lBot, lx - 5, gp[1], lx + 5, gp[1]);
      lLab.setText('$l = ' + lv + '$ m'); lLab.setX(lx + 8); lLab.setY(lp[1] + 4);
      [lLine, lTop, lBot, lLab].forEach(function (n) { setOpacity(n, showL ? 1 : 0); });
      /* 姿态：骨盆高度、俯仰、腰 */
      var pg = project([F.pel[0], 0, 0], cam), pp = project(F.pel, cam);
      setLine(hLine, pg[0] - 58, pg[1], pg[0] - 58, pp[1]);
      hLab.setText(sub === 'h' ? '$h = ' + sgn(f2(hv)) + '$ m' : sub === 'p' ? '$p = ' + f2(pv) + '$ rad' : '$w = ' + sgn(f2(wv)) + '$ rad');
      hLab.setX(pg[0] - 64); hLab.setY((pg[1] + pp[1]) / 2);
      pLab.setText(sub === 'h' ? '身高：0.98 m + $h$' : sub === 'p' ? '身体往前倾' : '腰左右转');
      pLab.setX(pg[0] + 60); pLab.setY(pp[1] - 120);
      [hLine, hLab, pLab].forEach(function (n) { setOpacity(n, showP ? 1 : 0); });
      var ph = gaitPhases('walk', phi1);
      rings.set(ph[0], ph[1]);
      setOpacity(rings.g, showRing ? 1 : 0);
      ringLab.setText('$\\phi_1$ 左脚　$\\phi_2$ 右脚');
      setOpacity(ringLab, showRing ? 1 : 0); setOpacity(ringKey, showRing ? 1 : 0);
      tag.textContent = '运动学示意（按命令摆的姿态，不是策略的输出）';
      /* 右栏：讲到哪组哪组亮 */
      var hi = ['task', 'foot', 'posture', 'gait', 'all'][ci];
      rowsG.forEach(function (r) { setOpacity(r.g, hi === 'all' || r.grp === hi ? 1 : 0.3); });
      setOpacity(gaitG, hi === 'all' || hi === 'gait' ? 1 : 0.3);
      fadePanels(notes, t);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 相位：一个数切换四种步态 ── */
  function buildScenePhase() {
    var s = sceneSvg('左边：一台 H1（运动学示意）按两只脚的相位走、跳、站、单脚跳，右上角是论文图 4 那样的相位环（内圈左脚紫、外圈右脚绿），下面是两只脚的时钟；右边依次出现相位的更新公式、四种步态各自的设定、一个策略管三种');
    s.appendChild(svgText(24, 26, '相位：同一组命令切出四种步态（照论文图 4 重画）', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 360, 360, C_BORDER, C_SURFACE2);
    var OX = 130, OY = 352, SC = 135;
    var ground = groundTicks(left, 30, 236);
    var bot = toyBot(left);
    var gaitTag = rich(left, 36, 62, '', 13, 'demo-x-ink', 'start', 200);
    rich(left, 36, 80, '慢放：画成 $f = 1$ Hz（默认是 2 Hz）', 10, 'demo-x-mut', 'start', 200);
    var rings = phaseRings(left, 306, 112, 26, 40, { band: 8, noLegend: true });
    rich(left, 306, 174, '内圈 $\\phi_1$（左）· 外圈 $\\phi_2$（右）', 10, 'demo-x-ink2', 'middle', 170);
    rich(left, 306, 191, '蓝：着地　黄：摆动', 10, 'demo-x-mut', 'middle', 170);
    var mp = miniPlot(left, 236, 222, 136, 90, 0, 1, -1.15, 1.15, { yTicks: [-1, 0, 1] });
    rich(left, 236, 214, '时钟 $\\sin 2\\pi\\bar\\phi$', 10, 'demo-x-mut', 'start', 140);
    var cL = mp.curve(function () { return 0; }, C_LEFT, 2), cR = mp.curve(function () { return 0; }, C_RIGHT, 2, '5 3');
    var cur = hline(left, 0, 222, 0, 312, C_MUTED, 1.2, '3 3');
    label(left, 304, 330, '一个周期', 'demo-x-mut', 9.5, 'middle');
    rich(left, 304, 348, '紫：左脚　绿虚线：右脚', 9.5, 'demo-x-mut', 'middle', 150);
    var ps = panels(s, 5);
    label(ps[0], R, 64, '每只脚一个相位 φ ∈ [0, 1)', 'demo-x-ink', 14);
    math(ps[0], R, 98, '\\phi_{t+1,1} = \\phi_{t,1} + f_t\\,\\mathrm{d}t,\\quad \\phi_{t+1,2} = \\phi_{t+1,1} + \\psi', 14, 'start', RW);
    chip(ps[0], R, 124, 182, '$\\phi < \\phi_{\\text{stance}}$：着地', C_STANCE, { size: 12 });
    chip(ps[0], R + 190, 124, 182, '$\\phi \\ge \\phi_{\\text{stance}}$：摆动', C_SWING, { size: 12 });
    rich(ps[0], R, 182, '论文把 $\\phi_{\\text{stance}}$ 固定为 0.5：一半时间着地、一半摆动', 11, 'demo-x-mut', 'start', RW);
    rich(ps[0], R, 202, '每一步 $\\mathrm{d}t = 0.02$ s（50 Hz），转满一圈回到 0', 11, 'demo-x-mut', 'start', RW);
    label(ps[1], R, 64, '走', 'demo-x-ink', 14);
    math(ps[1], R + 30, 64, '\\psi = 0.5', 14);
    label(ps[1], R, 92, '右脚比左脚晚半圈：一只脚着地，另一只在空中', 'demo-x-ink2', 12);
    chip(ps[1], R, 108, RW, '两个时钟一正一负，正好相反', C_GOOD, { size: 12 });
    label(ps[2], R, 64, '跳', 'demo-x-ink', 14);
    math(ps[2], R + 30, 64, '\\psi = 0', 14);
    label(ps[2], R, 92, '两只脚同相：一起着地，一起腾空', 'demo-x-ink2', 12);
    chip(ps[2], R, 108, RW, '两个时钟重合', C_GOOD, { size: 12 });
    rich(ps[2], R, 166, '注：跑步可以从走里得到：高速 + 小的 $\\phi_{\\text{stance}}$（论文脚注）', 11, 'demo-x-mut', 'start', RW);
    label(ps[3], R, 64, '站 / 单脚跳：相位固定不动', 'demo-x-ink', 14);
    chip(ps[3], R, 80, RW, '站：$\\phi_1 = \\phi_2 = 0.25$，两只脚一直着地', C_STANCE, { size: 12, left: true });
    chip(ps[3], R, 118, RW, '单脚跳：抬起的脚 $\\phi = 0.75$，一直在空中', C_SWING, { size: 12, left: true });
    rich(ps[3], R, 172, '另一只脚照样按 $f$ 循环；固定的相位让接地概率恒为 1 或 0，$\\psi$ 不起作用', 11, 'demo-x-mut', 'start', RW);
    label(ps[4], R, 64, '一个策略管三种', 'demo-x-ink', 14);
    chip(ps[4], R, 80, RW, '走、跳、站：同一个策略', C_GOOD, { size: 12, left: true });
    chip(ps[4], R, 118, RW, '单脚跳：单独一个策略，只跟 $v_x, v_y, \\omega, h$（表 VII）', C_WARN, { size: 12, left: true });
    rich(ps[4], R, 174, '官方代码：只采 $\\psi \\in \\{0, 0.5\\}$，再有 10% 的环境站着；没有单脚跳', 11, 'demo-x-mut', 'start', RW);
    function draw(t, clock) {
      var now = nowOf(t, clock), ci = cueIndex(t), cam = camOf('walk', SC, OX, OY);
      var gait = ci <= 1 ? 'walk' : ci === 2 ? 'jump' : 'walk';
      if (ci === 3) gait = since(t, clock, CUES[3]) % 6 < 3 ? 'stand' : 'hop';
      if (ci === 4) gait = ['walk', 'jump', 'stand', 'hop'][Math.floor(since(t, clock, CUES[4]) / 3) % 4];
      var phi1 = (now * 1.0) % 1, ph = gaitPhases(gait, phi1), key = GAIT_SHEET[gait];
      var fr = gait === 'stand' ? 0 : Math.floor(phi1 * 20);
      ground.put(cam, gait === 'walk' ? now * 0.5 : 0);
      bot.put(key, cam, fr);
      gaitTag.setText(GAIT_ZH[gait] + (gait === 'walk' ? '：$\\psi = 0.5$' : gait === 'jump' ? '：$\\psi = 0$' : gait === 'stand' ? '：$\\phi_1 = \\phi_2 = 0.25$' : '：抬起的脚 $\\phi = 0.75$'));
      rings.set(ph[0], ph[1]);
      /* 时钟：一个周期里两只脚的 sin(2πφ̄)，竖线是现在 */
      mp.setCurve(cL, function (u) { return clockOf(barPhi(gaitPhases(gait, u)[0])); });
      mp.setCurve(cR, function (u) { return clockOf(barPhi(gaitPhases(gait, u)[1])); });
      var x = mp.px(phi1);
      setLine(cur, x, 222, x, 312);
      fadePanels(ps, t);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 期望接地概率 ── */
  function buildSceneContact() {
    var s = sceneSvg('左上：期望接地概率随均匀化相位的变化，硬切换是虚线台阶，正态分布放松后是实线的坡，σ 会变；左下：两只脚的时钟信号；竖线随相位移动；右边依次讲硬切换、公式、σ 与代码里的取值、时钟、站立时论文与代码的差别');
    s.appendChild(svgRich(24, 26, '期望接地概率 $C(\\bar\\phi)$：把硬切换放松成一段坡（论文图 3）', { size: 13.5, cls: 'demo-x-ink2', w: 600 }));
    var left = group(s);
    var P1 = miniPlot(left, 58, 62, 316, 130, 0, 1, -0.05, 1.08, { yTicks: [0, 0.5, 1], xTicks: [0, 0.25, 0.5, 0.75, 1], xLabel: '$\\bar\\phi$', yLabel: '期望接地概率 $C$' });
    var step = P1.curve(function (u) { return u < 0.5 ? 1 : 0; }, C_MUTED, 2, '5 4', 400);
    var loose = P1.curve(function (u) { return contactProb(u, SIGMA); }, C_ACCENT, 2.6);
    var band1 = paint(svgEl('rect', { x: 0, y: 62, width: 0, height: 130, 'fill-opacity': 0.2 }), C_WARN);
    var band2 = paint(svgEl('rect', { x: 0, y: 62, width: 0, height: 130, 'fill-opacity': 0.2 }), C_WARN);
    left.appendChild(band1); left.appendChild(band2);
    var mk = dotAt(left, 0, 0, 5, C_ACCENT), vline = hline(left, 0, 62, 0, 192, C_MUTED, 1.2, '3 3');
    var readC = rich(left, 374, 56, '', 11, 'demo-x-ink2', 'end', 240);
    var sigLab = rich(left, P1.px(0.6), 84, '', 11.5, 'demo-x-acc', 'start', 120);
    var P2 = miniPlot(left, 58, 262, 316, 110, 0, 1, -1.2, 1.2, { yTicks: [-1, 0, 1], xTicks: [0, 0.5, 1], xLabel: '左脚相位 $\\phi_1$（走：$\\psi = 0.5$）', yLabel: '时钟 $Cl = \\sin 2\\pi\\bar\\phi$' });
    P2.curve(function (u) { return clockOf(barPhi(u)); }, C_LEFT, 2.2);
    P2.curve(function (u) { return clockOf(barPhi(u + 0.5)); }, C_RIGHT, 2.2, '5 3');
    var v2 = hline(left, 0, 262, 0, 372, C_MUTED, 1.2, '3 3');
    var d1 = dotAt(left, 0, 0, 4.5, C_LEFT), d2 = dotAt(left, 0, 0, 4.5, C_RIGHT);
    /* 读法：纵轴 1 = 该触地、0 = 该摆动；两条线各是什么 */
    rich(left, 58, 226, '灰虚线：硬切换　蓝线：放松后；1 = 该触地，0 = 该摆动', 9.5, 'demo-x-mut', 'start', 280);
    rich(left, 58, 406, '紫：左脚　绿虚线：右脚', 9.5, 'demo-x-mut', 'start', 150);
    var clockG = group(left);
    setOpacity(clockG, 1);
    var ps = panels(s, 5);
    label(ps[0], R, 64, '硬切换', 'demo-x-ink', 14);
    rich(ps[0], R, 92, '$\\bar\\phi$ 过 0.5 的一瞬间，期望接地从 1 掉到 0', 12, 'demo-x-ink2', 'start', RW);
    rich(ps[0], R, 116, '$\\bar\\phi$：把着地段映到 [0, 0.5)、摆动段映到 [0.5, 1)', 11, 'demo-x-mut', 'start', RW);
    rich(ps[0], R, 136, '论文用 $\\phi_{\\text{stance}} = 0.5$，所以 $\\bar\\phi = \\phi$', 11, 'demo-x-mut', 'start', RW);
    label(ps[1], R, 64, '用正态分布的 CDF 放松', 'demo-x-ink', 14);
    math(ps[1], R, 100, 'C = \\Phi\\!\\left(\\tfrac{\\bar\\phi}{\\sigma}\\right)\\left[1-\\Phi\\!\\left(\\tfrac{\\bar\\phi-0.5}{\\sigma}\\right)\\right] + \\Phi\\!\\left(\\tfrac{\\bar\\phi-1}{\\sigma}\\right)\\left[1-\\Phi\\!\\left(\\tfrac{\\bar\\phi-1.5}{\\sigma}\\right)\\right]', 12.5, 'start', RW);
    rich(ps[1], R, 140, '$\\Phi$：标准正态分布的累积分布函数', 11, 'demo-x-mut', 'start', RW);
    rich(ps[1], R, 160, '着地段第一项起作用，摆动段第二项起作用', 11, 'demo-x-mut', 'start', RW);
    paperPart(ps[1], 'fig3', 0, 0, 1, 1, R + 4, 184, RW - 8, '论文图 3：橙 Loose（放松后），蓝 Normal（硬切换）');
    label(ps[2], R, 64, 'σ 决定坡有多缓', 'demo-x-ink', 14);
    rich(ps[2], R, 92, '切换点放松成区间 $[-3\\sigma, 3\\sigma]$、$[0.5-3\\sigma, 0.5+3\\sigma]$', 12, 'demo-x-ink2', 'start', RW);
    chip(ps[2], R, 108, RW, '官方代码 $\\sigma = 0.05$（`kappa_gait_probs`），坡宽 ±0.15', C_ACCENT, { size: 11.5 });
    rich(ps[2], R, 166, '$C(0) = C(0.5) = 0.5$，$C(0.1) = 0.977$，$C(0.6) = 0.023$', 11.5, 'demo-x-ink2', 'start', RW);
    label(ps[3], R, 64, '策略看的是时钟', 'demo-x-ink', 14);
    rich(ps[3], R, 92, '命令里不直接放 $\\phi$，换成两个时钟 $Cl = \\sin 2\\pi\\bar\\phi$', 12, 'demo-x-ink2', 'start', RW);
    chip(ps[3], R, 108, 182, '左脚 $Cl_L$', C_LEFT, { size: 12 });
    chip(ps[3], R + 190, 108, 182, '右脚 $Cl_R$', C_RIGHT, { size: 12 });
    rich(ps[3], R, 166, '走：一正一负；跳：两条重合；转一圈连续，没有 1 → 0 的跳变', 11, 'demo-x-mut', 'start', RW);
    label(ps[4], R, 64, '站立时：论文和代码不一样', 'demo-x-ink', 14);
    chip(ps[4], R, 80, RW, '论文：$\\phi = 0.25$ → $Cl = 1$，$C = 1$', C_GOOD, { size: 12, left: true });
    chip(ps[4], R, 118, RW, '官方代码：相位置 0 → $Cl = 0$，$C = 0.5$', C_WARN, { size: 12, left: true });
    label(ps[4], R, 172, '代码另有站立专用的奖励（双脚着地、双脚离地惩罚）', 'demo-x-mut', 11);
    label(ps[4], R, 192, '后两行是我们读代码的结果', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock), ci = cueIndex(t);
      var sig = SIGMA;
      if (ci === 2) { var u = since(t, clock, CUES[2]) % 8; sig = u < 4 ? 0.02 + 0.08 * Math.sin(Math.PI * u / 8) : 0.05 + 0.05 * Math.sin(Math.PI * (u - 4) / 4); }
      P1.setCurve(loose, function (x) { return contactProb(x, sig); });
      setOpacity(loose, ci === 0 ? 0 : 1);
      var w3 = 3 * sig * 316;
      band1.setAttribute('x', (P1.px(0)).toFixed(1)); setW(band1, w3);
      band2.setAttribute('x', (P1.px(0.5) - w3).toFixed(1)); setW(band2, 2 * w3);
      setOpacity(band1, ci === 2 ? 1 : 0); setOpacity(band2, ci === 2 ? 1 : 0);
      var phi = (now * 0.5) % 1, cv = ci === 0 ? (phi < 0.5 ? 1 : 0) : contactProb(phi, sig);
      moveDot(mk, [P1.px(phi), P1.py(cv)]);
      setLine(vline, P1.px(phi), 62, P1.px(phi), 192);
      readC.setText('$\\bar\\phi = ' + f2(phi) + '$，$C = ' + f3(cv) + '$');
      sigLab.setText(ci === 0 ? '' : '$\\sigma = ' + f3(sig) + '$');
      var x2 = P2.px(phi);
      setLine(v2, x2, 262, x2, 372);
      moveDot(d1, [x2, P2.py(clockOf(barPhi(phi)))]);
      moveDot(d2, [x2, P2.py(clockOf(barPhi(phi + 0.5)))]);
      fadePanels(ps, t);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: 非对称 Actor-Critic ── */
  function buildSceneAAC() {
    var s = sceneSvg('上半部分是网络结构：左边是输入（本体感受 63 维叠 5 步、命令 13 维、特权 24 维、地形 221 个高度），中间是 actor 的历史编码器、估计器、底层网络，下面是 critic；' +
      '下半部分依次讲本体感受、critic 多看的东西、actor 的输入、估计器、损失');
    s.appendChild(svgText(24, 26, '非对称 Actor-Critic：critic 看得多，actor 只看真机拿得到的', 'demo-x-ink2', 13.5));
    var d = group(s);
    /* 输入列 */
    var IX = 24, IW = 196;
    var inPro = chip(d, IX, 44, IW, '本体感受 **63** × 最近 5 步', C_ACCENT, { size: 11.5, h: 30 });
    var tape = group(d);
    for (var i = 0; i < 5; i++) rectBox(tape, IX + 8 + i * 37, 80, 31, 12, C_ACCENT, C_SURFACE);
    /* 分量逐项写在下面的要点里；这里只写加法，整行收在输入列宽度以内，不伸到右边的竖线下面 */
    label(tape, IX + IW / 2, 106, '每步 63 = 3 + 3 + 19 + 19 + 19', 'demo-x-mut', 8.5, 'middle');
    var inCmd = chip(d, IX, 114, IW, '命令 **11** + 时钟 **2**（含 $I(t)$）', C_GOOD, { size: 11.5, h: 30 });
    var inPri = chip(d, IX, 152, IW, '特权 **24**：线速度、身高误差…', C_WARN, { size: 11.5, h: 30 });
    var terr = group(d);
    rectBox(terr, IX, 190, IW, 56, C_WARN, C_SURFACE);
    for (var r = 0; r < 4; r++) for (var c = 0; c < 17; c++) dotAt(terr, IX + 14 + c * 10, 202 + r * 9, 1.6, C_WARN);
    label(terr, IX + IW / 2, 242, '地形 221 = 17 × 13 个高度（画了 4 行）', 'demo-x-mut', 8.5, 'middle');
    /* actor */
    var AX = 262;
    var enc = chip(d, AX, 44, 150, '历史编码器 [256, 128]', C_ACCENT, { size: 11, h: 30 });
    var zc = chip(d, AX + 162, 44, 54, '$z$ 32', C_ACCENT, { size: 11, h: 30 });
    var est = chip(d, AX + 228, 44, 150, '估计器 [64, 32] → $\\hat v$', C_PURPLE, { size: 11, h: 30 });
    var low = chip(d, AX, 104, 266, '底层网络 [256, 128, 32]（论文写 64）', C_GOOD, { size: 11, h: 30 });
    var act = chip(d, AX + 278, 104, 100, '19 个关节目标', C_GOOD, { size: 11, h: 30 });
    var pd = chip(d, AX + 278, 152, 100, 'PD → 力矩', C_BORDER, { size: 11, h: 30 });
    var critic = chip(d, AX, 200, 266, 'critic [512, 256, 128] → $V$', C_WARN, { size: 11, h: 30 });
    label(d, AX + 133, 248, 'critic 只在训练时用', 'demo-x-mut', 9.5, 'middle');
    var links = group(d);
    function link(p) { return pathLine(links, p, C_MUTED, 1.4); }
    link([[IX + IW, 59], [AX, 59]]);
    link([[AX + 150, 59], [AX + 162, 59]]); link([[AX + 216, 59], [AX + 228, 59]]);
    link([[AX + 189, 74], [AX + 189, 104]]); link([[AX + 303, 74], [AX + 303, 90], [AX + 220, 90], [AX + 220, 104]]);
    link([[IX + IW, 129], [AX, 119]]); link([[AX + 266, 119], [AX + 278, 119]]); link([[AX + 328, 134], [AX + 328, 152]]);
    /* 特权和地形两根线在 y = 218 汇合后进 critic（原先竖线只到 215，地形那根差 3 个单位没接上） */
    link([[IX + IW, 167], [AX - 18, 167], [AX - 18, 218], [AX, 218]]); link([[IX + IW, 218], [AX - 18, 218]]);
    link([[IX + IW, 64], [AX - 30, 64], [AX - 30, 210], [AX, 210]]);
    var flowA = dotAt(d, 0, 0, 4, C_ACCENT), flowC = dotAt(d, 0, 0, 4, C_WARN);
    var ACT_PATH = [[IX + IW, 59], [AX, 59], [AX + 228, 59], [AX + 303, 59], [AX + 303, 90], [AX + 220, 90], [AX + 220, 104], [AX + 266, 119], [AX + 328, 119]];
    var CRI_PATH = [[IX + IW, 167], [AX - 18, 167], [AX - 18, 218], [AX + 266, 218]];
    /* 数据点只在连线上画：路径穿过方框时藏起来，免得从框里的字上压过去 */
    var BOXES = [[IX, 44, IW, 30], [IX, 114, IW, 30], [IX, 152, IW, 30], [IX, 190, IW, 56], [AX, 44, 150, 30], [AX + 162, 44, 54, 30],
      [AX + 228, 44, 150, 30], [AX, 104, 266, 30], [AX + 278, 104, 100, 30], [AX + 278, 152, 100, 30], [AX, 200, 266, 30]];
    function inBox(p) { return BOXES.some(function (b) { return p[0] > b[0] - 4 && p[0] < b[0] + b[2] + 4 && p[1] > b[1] - 4 && p[1] < b[1] + b[3] + 4; }); }
    var NY = 278;
    var ps = panels(s, 5);
    rich(ps[0], 24, NY, '**本体感受 63 维**：角速度 3、重力方向 3、19 个关节的位置和速度、上一步动作 19', 12.5, 'demo-x-ink2', 'start', 760);
    rich(ps[0], 24, NY + 24, 'IMU 和关节编码器就能给：真机上拿得到', 11.5, 'demo-x-mut', 'start', 760);
    rich(ps[1], 24, NY, '**critic 还看**：特权 24 维（线速度 3、身高误差 1、抬脚高度 2、摩擦 1、足底力 6、11 个连杆的碰撞）和脚下 221 个地形高度', 12.5, 'demo-x-ink2', 'start', 760);
    rich(ps[1], 24, NY + 24, '这些在仿真里随手可得，真机上量不到；官方代码里 critic 的输入合计 321 维', 11.5, 'demo-x-mut', 'start', 760);
    rich(ps[2], 24, NY, '**actor 只看**：最近 5 步的本体感受、命令、干预标志 $I(t)$', 12.5, 'demo-x-ink2', 'start', 760);
    rich(ps[2], 24, NY + 24, '这一套是 DreamWaQ 一路的非对称训练：一阶段训完，不用再蒸馏', 11.5, 'demo-x-mut', 'start', 760);
    rich(ps[3], 24, NY, '**估计器**从 5 步历史里估出线速度；监督信号就是特权里的真值', 12.5, 'demo-x-ink2', 'start', 760);
    rich(ps[3], 24, NY + 24, '论文还写了估抬脚高度、身高；官方代码只估线速度 3 维（`privileged_recon_dim = 3`）', 11.5, 'demo-x-mut', 'start', 760);
    math(ps[4], 24, NY, '\\mathcal{L}^{\\text{AAC}} = \\mathcal{L}^{\\text{value}} + \\lambda^{\\text{policy}}\\mathcal{L}^{\\text{policy}} + \\lambda^{\\text{est}}\\mathcal{L}^{\\text{est}}', 15, 'start', 600);
    rich(ps[4], 24, NY + 30, '部署时只用 actor（含估计器），50 Hz；代码：目标角 = 默认角 + 0.25 × 动作，PD 每 4 个仿真步出一次动作', 11.5, 'demo-x-mut', 'start', 760);
    function pointOnPath(pts, u) { return K.pointOn(pts, u); }
    function draw(t, clock) {
      var now = nowOf(t, clock), ci = cueIndex(t);
      var on = [
        [inPro, tape],
        [inPri, terr, critic],
        [inPro, tape, inCmd, enc, zc, low, act],
        [enc, zc, est, low],
        [inPro, tape, inCmd, inPri, terr, enc, zc, est, low, act, pd, critic]
      ][ci];
      [inPro, tape, inCmd, inPri, terr, enc, zc, est, low, act, pd, critic].forEach(function (n) { setOpacity(n, on.indexOf(n) >= 0 ? 1 : 0.28); });
      var u = (now * 0.35) % 1;
      var pa = pointOnPath(ACT_PATH, u), pc = pointOnPath(CRI_PATH, u);
      moveDot(flowA, pa); moveDot(flowC, pc);
      setOpacity(flowA, ci === 1 || inBox(pa) ? 0 : 1); setOpacity(flowC, (ci === 1 || ci === 4) && !inBox(pc) ? 1 : 0);
      fadePanels(ps, t);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 奖励（一）：跟上速度和姿态 ── */
  function buildSceneRewardTask() {
    var s = sceneSvg('左边：一台 H1（运动学示意）站着跟身高命令，虚线是命令、实线是实际，下面的条是这一步的身高惩罚；右边依次讲速度跟踪、姿态的平方误差、一个算例、正则奖励、代码里的正则课程');
    s.appendChild(svgText(24, 26, '奖励（一）：跟上速度和姿态（论文表 I）', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 360, 360, C_BORDER, C_SURFACE2);
    var OX = 200, OY = 330, SC = 135;
    var ground = groundTicks(left, 30, 378);
    var bot = toyBot(left);
    var cmdL = hline(left, 0, 0, 0, 0, C_PURPLE, 2, '6 4'), actL = hline(left, 0, 0, 0, 0, C_PURPLE, 2.6);
    /* 「实际」标签右对齐、放在实线左边同一高度：放在线上方时，命令虚线一升上来就从字中间穿过 */
    var cmdLab = rich(left, 0, 0, '', 11, 'demo-x-ink2', 'start', 160), actLab = rich(left, 0, 0, '', 11, 'demo-x-ink2', 'end', 160);
    rich(left, 36, 60, '运动学示意：站着跟身高命令 $h$，实际慢半拍跟上', 10, 'demo-x-mut', 'start', 330);
    var penBar = bar(left, 60, 362, 12, C_BAD);
    var penLab = rich(left, 36, 356, '', 11, 'demo-x-ink2', 'start', 330);
    rich(left, 36, 390, '红条：这一步的惩罚，越长罚得越多', 9.5, 'demo-x-mut', 'start', 200);
    var ps = panels(s, 5);
    label(ps[0], R, 64, '任务奖励：跟速度', 'demo-x-ink', 14);
    math(ps[0], R, 100, 'r = 2\\exp\\!\\left(-\\lVert v^{\\text{target}}_{xy} - v_{xy}\\rVert^2 / 0.2\\right)', 15, 'start', RW);
    rich(ps[0], R, 134, '偏航角速度 $\\omega$ 同样，权重也是 2', 12, 'demo-x-ink2', 'start', RW);
    rich(ps[0], R, 158, '例：速度差 0.3 m/s → $2\\exp(-0.09/0.2) = 1.28$（满分 2）', 11.5, 'demo-x-mut', 'start', RW);
    label(ps[1], R, 64, '姿态命令：平方误差直接罚', 'demo-x-ink', 14);
    [['身高 $h$', -40], ['俯仰 $p$', -10], ['腰 $w$', -2]].forEach(function (w, i) {
      var y = 86 + i * 34;
      rich(ps[1], R, y + 14, w[0], 12, 'demo-x-ink2', 'start', 90);
      var b = bar(ps[1], R + 90, y, 20, C_PURPLE); setW(b, -w[1] * 6);
      label(ps[1], R + 96 + (-w[1]) * 6, y + 15, String(w[1]).replace('-', '−'), 'demo-x-ink', 12);
    });
    rich(ps[1], R, 206, '奖励 = 权重 × $(\\text{命令} - \\text{实际})^2$', 11.5, 'demo-x-mut', 'start', RW);
    label(ps[2], R, 64, '算一步', 'demo-x-ink', 14);
    rich(ps[2], R, 92, '命令 $h = -0.2$ m，实际 $-0.15$ m，差 0.05 m', 12, 'demo-x-ink2', 'start', RW);
    math(ps[2], R, 128, '-40 \\times 0.05^2 = -0.1', 16, 'start', RW);
    rich(ps[2], R, 160, '同样的差放在腰上：$-2 \\times 0.05^2 = -0.005$', 11.5, 'demo-x-mut', 'start', RW);
    rich(ps[2], R, 180, '权重差 20 倍：身高跟不上罚得最狠', 11.5, 'demo-x-mut', 'start', RW);
    label(ps[3], R, 64, '正则奖励：表 I 的 11 项', 'demo-x-ink', 14);
    REWARD.reg.forEach(function (rw, i) {
      var col = i % 2, row = Math.floor(i / 2), x = R + col * 190, y = 78 + row * 26;
      chip(ps[3], x, y, 182, rw[0] + ' ' + String(rw[1]).replace('-', '−').replace('e−', 'e-'), C_BORDER, { size: 10.5, h: 22 });
    });
    label(ps[3], R, 246, '管平稳、省力、不怪异；提前终止一次扣 200', 'demo-x-mut', 11);
    label(ps[4], R, 64, '官方代码多了两样', 'demo-x-ink', 14);
    chip(ps[4], R, 80, RW, '十几项论文没列的：不腾空、站立双脚着地、足底力上限…', C_WARN, { size: 11, left: true });
    chip(ps[4], R, 118, RW, '正则课程：先乘 0.2，每 100 次迭代开 0.8 次方', C_WARN, { size: 11, left: true });
    var curve = miniPlot(ps[4], R + 40, 166, RW - 50, 70, 0, 2000, 0, 1, { yTicks: [0, 1], xTicks: [0, 1000, 2000] });
    curve.curve(function (it) { return penaltyScale(it); }, C_WARN, 2, null, 200);
    rich(ps[4], R + RW, 154, '纵轴：正则项的系数', 10, 'demo-x-mut', 'end', 140);
    rich(ps[4], R + RW, 270, '约 1300 次迭代后超过 0.9', 10, 'demo-x-mut', 'end', 200);
    rich(ps[4], R + 40, 270, '横轴：训练迭代次数', 10, 'demo-x-mut', 'start', 140);
    function draw(t, clock) {
      var now = nowOf(t, clock), cam = camOf('posture', SC, OX, OY);
      /* 命令每 3 s 换一次：0 → −0.2 → −0.1 → −0.3；实际按 0.6 s 的时间常数跟上 */
      var seq = [0, -0.2, -0.1, -0.3], k = Math.floor(now / 3) % 4, u = now % 3;
      var prev = seq[(k + 3) % 4], hc = seq[k], ha = hc + (prev - hc) * Math.exp(-u / 0.6);
      ground.put(cam, 0);
      bot.put('posture', cam, postureIndex('h', ha));
      var yc = project([0, 0, BASE_H + hc], cam)[1], ya = project([0, 0, BASE_H + ha], cam)[1];
      setLine(cmdL, OX - 90, yc, OX + 70, yc); setLine(actL, OX - 90, ya, OX - 30, ya);
      cmdLab.setText('命令 $h = ' + sgn(f2(hc)) + '$'); cmdLab.setX(OX + 74); cmdLab.setY(yc + 4);
      actLab.setText('实际 ' + sgn(f2(ha))); actLab.setX(OX - 96); actLab.setY(ya + 4);
      var pen = REWARD.height * (hc - ha) * (hc - ha);
      penBar.setAttribute('x', '200'); setW(penBar, Math.min(170, -pen * 600));
      penLab.setText('这一步：$-40 \\times ' + f3(Math.abs(hc - ha)) + '^2 = ' + sgn(f3(pen)) + '$');
      fadePanels(ps, t);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 7: 奖励（二）：什么时候着地、脚抬多高 ── */
  function buildSceneRewardFoot() {
    var s = sceneSvg('左边：一台 H1（运动学示意）走路，摆动脚上方的空心圈是论文式 (8) 的目标高度，左上角的小图是一个周期里的目标抬脚曲线和接地权重；右边依次讲接触—摆动奖励、五次多项式的边界条件、公式与算例、抬脚奖励、代码里实际生效的那一项');
    s.appendChild(svgText(24, 26, '奖励（二）：什么时候着地、脚抬多高', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 360, 360, C_BORDER, C_SURFACE2);
    var OX = 150, OY = 360, SC = 150;
    var ground = groundTicks(left, 30, 378);
    var bot = toyBot(left);
    var tgt = [ringAt(left, 0, 0, 6, C_WARN, 2.4), ringAt(left, 0, 0, 6, C_WARN, 2.4)];
    var tgtLab = rich(left, 36, 64, '', 11, 'demo-x-warn', 'start', 190);
    var mp = miniPlot(left, 230, 60, 140, 92, 0, 1, 0, 0.17, { yTicks: [0, 0.15], xTicks: [0, 0.5, 1] });
    rich(left, 230, 184, '横轴：相位；纵轴：高度（m）', 10, 'demo-x-mut', 'start', 150);
    rich(left, 230, 216, '实线：目标 $l^{\\text{target}}$　虚线：$1 - C$', 9.5, 'demo-x-mut', 'start', 150);
    mp.curve(function (u) { return 0.15 * (1 - contactProb(u)); }, C_SWING, 1.4, '3 3');
    mp.curve(function (u) { return swingTarget(u, 0.15); }, C_WARN, 2.4);
    var lin = mp.curve(function (u) { return codeLinearTarget(u, 0.15) - 0.07; }, C_BAD, 1.8, '6 3');
    var mk = dotAt(left, 0, 0, 4, C_LEFT);
    var linLab = rich(left, 230, 232, '红虚线：代码的三角形', 9.5, 'demo-x-bad', 'start', 150);
    var ps = panels(s, 5);
    label(ps[0], R, 64, '接触—摆动奖励', 'demo-x-ink', 14);
    math(ps[0], R, 100, 'r = -\\textstyle\\sum_i (1-C_i)\\big[1-e^{-\\lVert f_i\\rVert^2/50}\\big] - \\textstyle\\sum_i C_i\\big[1-e^{-\\lVert v_{i,xy}\\rVert^2/5}\\big]', 12.5, 'start', RW);
    chip(ps[0], R, 124, 182, '该着地：罚脚的速度', C_STANCE, { size: 12 });
    chip(ps[0], R + 190, 124, 182, '该摆动：罚脚底的力', C_SWING, { size: 12 });
    rich(ps[0], R, 180, '表 I 的式子指数前少了负号，代码里有；代码的脚速度用的是三维', 11, 'demo-x-mut', 'start', RW);
    label(ps[1], R, 64, '抬脚轨迹：五次多项式', 'demo-x-ink', 14);
    [['$\\bar\\phi = 0.5$', '起点', '速度、加速度 0'], ['$\\bar\\phi = 0.75$', '最高点 $l$', '速度、加速度 0'], ['$\\bar\\phi = 1$', '落点', '速度、加速度 0']].forEach(function (rw, i) {
      var y = 80 + i * 30;
      rectBox(ps[1], R, y, RW, 26, C_WARN, C_SURFACE);
      rich(ps[1], R + 10, y + 17, rw[0], 12, 'demo-x-ink2', 'start', 90);
      rich(ps[1], R + 110, y + 17, rw[1], 12, 'demo-x-ink2', 'start', 100);
      rich(ps[1], R + 220, y + 17, rw[2], 11, 'demo-x-mut', 'start', 150);
    });
    rich(ps[1], R, 196, '附录表 VIII 的边界条件：落地、抬起都要平顺', 11, 'demo-x-mut', 'start', RW);
    label(ps[2], R, 64, '归一化之后', 'demo-x-ink', 14);
    math(ps[2], R, 98, 's(\\tau) = 10\\tau^3 - 15\\tau^4 + 6\\tau^5,\\quad \\tau = \\frac{0.25 - |\\bar\\phi - 0.75|}{0.25}', 14, 'start', RW);
    rich(ps[2], R, 136, '目标高度 $l^{\\text{target}} = l \\cdot s(\\tau)$；着地段为 0', 12, 'demo-x-ink2', 'start', RW);
    rich(ps[2], R, 162, '例：$\\bar\\phi = 0.6$ → $\\tau = 0.4$ → $s = 0.317$ → $0.15 \\times 0.317 = 0.048$ m', 11.5, 'demo-x-mut', 'start', RW);
    label(ps[3], R, 64, '抬脚奖励', 'demo-x-ink', 14);
    math(ps[3], R, 100, 'r^{\\text{swing}} = -30 \\textstyle\\sum_i (1 - C_i)\\,(l^{\\text{target}}_i - l^{\\text{foot}}_i)^2', 15, 'start', RW);
    rich(ps[3], R, 136, '只定竖直方向：前后的步长由步频 $f$ 和速度 $v$ 决定，不另给目标', 11.5, 'demo-x-ink2', 'start', RW);
    label(ps[4], R, 64, '官方代码里真正生效的', 'demo-x-ink', 14);
    chip(ps[4], R, 80, RW, '五次多项式那一项：权重 **0**', C_BORDER, { size: 12, left: true });
    chip(ps[4], R, 118, RW, '三角形目标 + 0.07 m 踝高：权重 **−30**', C_BAD, { size: 12, left: true });
    rich(ps[4], R, 174, '$\\phi = 0.6$：$0.15 \\times 0.4 + 0.07 = 0.13$ m（踝关节离地）', 11.5, 'demo-x-mut', 'start', RW);
    function draw(t, clock) {
      var now = nowOf(t, clock), ci = cueIndex(t), cam = camOf('walk', SC, OX, OY);
      var phi1 = (now * 0.6) % 1, fr = Math.floor(phi1 * 20), ph = gaitPhases('walk', fr / 20);
      ground.put(cam, now * 0.3);
      bot.put('walk', cam, fr);
      var F = toyFrame('walk', fr), best = -1;
      for (var i = 0; i < 2; i++) {
        var lt = swingTarget(ph[i], 0.15), p = project([F.ank[i][0], F.ank[i][1], lt + ANKLE_H], cam);
        moveDot(tgt[i], p);
        setOpacity(tgt[i], ph[i] >= 0.5 ? 1 : 0);
        if (ph[i] >= 0.5) best = i;
      }
      if (best >= 0) {
        var q = project([F.ank[best][0], F.ank[best][1], swingTarget(ph[best], 0.15) + ANKLE_H], cam);
        tgtLab.setText('摆动脚的目标高度 ' + f3(swingTarget(ph[best], 0.15)) + ' m');
      }
      moveDot(mk, [mp.px(ph[0]), mp.py(swingTarget(ph[0], 0.15))]);
      setOpacity(lin, ci === 4 ? 1 : 0); setOpacity(linLab, ci === 4 ? 1 : 0);
      fadePanels(ps, t);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 对称损失 ── */
  function buildSceneMirror() {
    var s = sceneSvg('左边：两台 H1（运动学示意）隔着一面镜子，左边用左脚单脚跳，右边是它的镜像——用右脚单脚跳；右边依次讲为什么要对称、镜像函数怎么翻、对称损失、单脚跳也适用、总目标与代码');
    s.appendChild(svgText(24, 26, '对称损失：左右镜像', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 360, 360, C_BORDER, C_SURFACE2);
    var OY = 356, SC = 120, OX1 = 112, OX2 = 296;
    var g1 = groundTicks(left, 30, 196), g2 = groundTicks(left, 212, 378);
    var b1 = toyBot(left), b2 = toyBot(left, { flip: true });
    hline(left, 204, 50, 204, 372, C_MUTED, 1.6, '6 5');
    label(left, 204, 388, '镜面：x–z 平面', 'demo-x-mut', 10, 'middle');
    label(left, OX1, 70, '原来：左脚跳', 'demo-x-ink2', 11.5, 'middle');
    label(left, OX2, 70, '镜像：右脚跳', 'demo-x-ink2', 11.5, 'middle');
    var ps = panels(s, 5);
    label(ps[0], R, 64, 'H1 左右对称，策略却不知道', 'demo-x-ink', 14);
    rich(ps[0], R, 92, '没有这个先验，探索时容易落进局部最优', 12, 'demo-x-ink2', 'start', RW);
    chip(ps[0], R, 108, RW, '动作不自然；一边好、一边差', C_BAD, { size: 12 });
    rich(ps[0], R, 166, '论文 III-D：对称又高效的动作是人后天学会的', 11, 'demo-x-mut', 'start', RW);
    label(ps[1], R, 64, '镜像函数 𝓕：沿 x–z 平面翻过来', 'demo-x-ink', 14);
    chip(ps[1], R, 80, 182, '左右关节对调', C_ACCENT, { size: 11.5 });
    chip(ps[1], R + 190, 80, 182, '横滚、偏航取反', C_ACCENT, { size: 11.5 });
    chip(ps[1], R, 116, 182, '$v_y$、$\\omega$、$w$ 取反', C_ACCENT, { size: 11.5 });
    chip(ps[1], R + 190, 116, 182, '两个时钟对调', C_ACCENT, { size: 11.5 });
    rich(ps[1], R, 172, '官方代码：一张 ±1 的置换矩阵，躯干偏航也取反', 11, 'demo-x-mut', 'start', RW);
    label(ps[2], R, 64, '对称损失', 'demo-x-ink', 14);
    math(ps[2], R, 104, '\\mathcal{L}_{\\text{sym}} = \\sum_t \\big\\lVert \\pi(o_t) - \\mathcal{F}_a\\big(\\pi(\\mathcal{F}_o(o_t))\\big)\\big\\rVert^2', 15, 'start', RW);
    rich(ps[2], R, 140, '对称的输入，要给出对称的动作', 12, 'demo-x-ink2', 'start', RW);
    rich(ps[2], R, 162, '和强化学习的目标无关，换别的算法也能加', 11, 'demo-x-mut', 'start', RW);
    label(ps[3], R, 64, '不只对称的步态有用', 'demo-x-ink', 14);
    rich(ps[3], R, 92, '左脚单脚跳和右脚单脚跳互为镜像', 12, 'demo-x-ink2', 'start', RW);
    chip(ps[3], R, 108, RW, '同一条约束照样成立：对称的状态 → 对称的动作', C_GOOD, { size: 12 });
    label(ps[4], R, 64, '总目标', 'demo-x-ink', 14);
    math(ps[4], R, 98, '\\mathcal{L} = \\mathcal{L}_{\\text{AAC}} + \\beta\\,\\mathcal{L}_{\\text{sym}},\\quad \\beta = 0.5', 15, 'start', RW);
    rich(ps[4], R, 132, 'PPO 当强化学习算法', 12, 'demo-x-ink2', 'start', RW);
    rich(ps[4], R, 156, '官方代码：只约束 actor，原动作那一支 `detach`，梯度只走镜像那一支', 11, 'demo-x-mut', 'start', RW);
    function draw(t, clock) {
      var now = nowOf(t, clock), fr = Math.floor(((now * 0.8) % 1) * 20);
      var c1 = camOf('hop', SC, OX1, OY), c2 = camOf('hop', SC, OX2, OY);
      g1.put(c1, 0); g2.put(c2, 0);
      b1.put('hop', c1, fr); b2.put('hop', c2, fr);
      fadePanels(ps, t);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: 干预训练 ── */
  function buildSceneIntervene() {
    var s = sceneSvg('左边：一台 H1（运动学示意）站着，两只手臂被均匀噪声接管：每 90 步换一个目标，前 2/3 线性插值过去、后 1/3 停住；下面是插值进度和 I(t) 的时间线；右边依次讲干预标志、切换概率、噪声怎么来、奖励遮罩、代码的版本');
    s.appendChild(svgText(24, 26, '干预训练：上身随时可以交给别人', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 24, 38, 360, 360, C_BORDER, C_SURFACE2);
    var OX = 204, OY = 300, SC = 100;
    var ground = groundTicks(left, 30, 378);
    var bot = toyBot(left);
    var hands = [ringAt(left, 0, 0, 7, C_WARN, 2.4), ringAt(left, 0, 0, 7, C_WARN, 2.4)];
    var segLab = label(left, 36, 60, '', 'demo-x-ink2', 11.5);
    rich(left, 36, 80, '运动学示意：手臂目标照论文的插值，噪声按代码的关节范围抽', 9.5, 'demo-x-mut', 'start', 330);
    var rBar = bar(left, 60, 318, 10, C_WARN);
    rectBox(left, 60, 318, 300, 10, C_BORDER, 'none');
    var rLab = rich(left, 36, 344, '', 10.5, 'demo-x-ink2', 'start', 330);
    var tl = group(left);
    var TLX = 36, TLY = 360, TLW = 336;
    var flips = [];
    var rng = K.mulberry32(20250205), state = 0, run = [];
    for (var k = 0; k < 1500; k++) { if (rng() < 0.012) { state = 1 - state; } run.push(state); }
    var segs = [], st = 0;
    for (var j = 1; j <= run.length; j++) if (j === run.length || run[j] !== run[st]) { segs.push([st, j, run[st]]); st = j; }
    segs.forEach(function (sg) {
      var r = paint(svgEl('rect', { x: (TLX + sg[0] / run.length * TLW).toFixed(1), y: TLY, width: ((sg[1] - sg[0]) / run.length * TLW).toFixed(1), height: 12 }), sg[2] ? C_WARN : C_ACCENT);
      r.setAttribute('opacity', sg[2] ? 0.85 : 0.35);
      tl.appendChild(r); flips.push(r);
    });
    rich(tl, TLX, TLY + 26, '$I(t)$ 示意：黄 = 被接管，蓝 = 自己控制（为了看清，翻转概率画大了）', 9.5, 'demo-x-mut', 'start', 340);
    var ps = panels(s, 5);
    label(ps[0], R, 64, '干预标志 I(t)', 'demo-x-ink', 14);
    chip(ps[0], R, 80, RW, '$I = 0$：上身由策略自己摆（自然摆臂）', C_ACCENT, { size: 12, left: true });
    chip(ps[0], R, 118, RW, '$I = 1$：上身关节被外部动作替换', C_WARN, { size: 12, left: true });
    rich(ps[0], R, 172, '外部：遥操作、IK、重定向好的关节序列；$I(t)$ 也进策略的输入', 11, 'demo-x-mut', 'start', RW);
    label(ps[1], R, 64, '什么时候切换', 'demo-x-ink', 14);
    rich(ps[1], R, 92, '每一步以 $p = 0.005$ 的概率翻转 $I(t)$', 12, 'demo-x-ink2', 'start', RW);
    math(ps[1], R, 128, '\\textstyle\\sum_{n\\ge1} n\\,p\\,(1-p)^n = \\frac{1-p}{p} = 199\\ \\text{步} \\approx 4\\ \\text{s}', 15, 'start', RW);
    rich(ps[1], R, 164, '大多是长段的「自己控制」或「被接管」，不会来回乱切', 11, 'demo-x-mut', 'start', RW);
    label(ps[2], R, 64, '外部动作从哪来：均匀噪声', 'demo-x-ink', 14);
    rich(ps[2], R, 92, '每 90 步（1.8 s）抽一个新目标：前 2/3 线性插值、后 1/3 保持', 12, 'demo-x-ink2', 'start', RW);
    math(ps[2], R, 128, 'a = (1-r)\\,a^{\\text{init}} + r\\,a^{\\text{targ}},\\quad r = \\min\\!\\left(1, \\tfrac{3}{2}\\,\\tfrac{t-t_0}{t_{\\text{interval}}}\\right)', 13.5, 'start', RW);
    rich(ps[2], R, 164, '噪声会让手撞到身体：模拟操作员的误操作', 11, 'demo-x-mut', 'start', RW);
    label(ps[3], R, 64, '奖励遮罩', 'demo-x-ink', 14);
    rich(ps[3], R, 92, '被接管时，上身的正则奖励不算', 12, 'demo-x-ink2', 'start', RW);
    chip(ps[3], R, 108, RW, '免得策略和外部控制器「抢」上身', C_WARN, { size: 12 });
    rich(ps[3], R, 162, '代码里遮掉：肩肘偏离、上身动作变化率、碰撞、站立时的关节偏离', 11, 'demo-x-mut', 'start', RW);
    label(ps[4], R, 64, '官方代码的版本', 'demo-x-ink', 14);
    chip(ps[4], R, 80, RW, '每 30 步重抽，每步只朝目标挪 0.2 rad 以内', C_WARN, { size: 11.5, left: true });
    chip(ps[4], R, 118, RW, '翻转函数写了没调用：每 10 s 重抽命令时一半被接管', C_WARN, { size: 11.5, left: true });
    rich(ps[4], R, 172, '只接管 8 个手臂关节，按关节范围均匀抽（我们读代码的结果）', 11, 'demo-x-mut', 'start', RW);
    function draw(t, clock) {
      var now = nowOf(t, clock), fr = Math.floor(now * NOISE_FPS) % SHEETS.noise.n, cam = camOf('noise', SC, OX, OY);
      ground.put(cam, 0);
      bot.put('noise', cam, fr);
      var F = toyFrame('noise', fr);
      hands.forEach(function (h, i) { moveDot(h, project(F.hand[i], cam)); });
      var sgi = Math.floor(fr / NOISE_SEG), i2 = fr % NOISE_SEG, r = Math.min(1, 1.5 * (i2 * 5) / T_INTERVAL);
      segLab.textContent = '第 ' + (sgi + 1) + ' 个目标　第 ' + (i2 * 5) + ' / 90 步';
      setW(rBar, 300 * r);
      rLab.setText('插值进度 $r = ' + f2(r) + '$' + (r >= 1 ? '（保持）' : ''));
      fadePanels(ps, t);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: 噪声课程与两组机器人 ── */
  function buildSceneCurriculum() {
    var s = sceneSvg('左边：论文图 5 的噪声课程（上排三个阶段的噪声由小到大、下排是最后阶段的正面和俯视），下面一条 α 的进度；后半段换成两组机器人与课程顺序的示意；右边依次讲 α 的混合、α 的加减规则、两组机器人、课程顺序、命令范围与训练时长');
    s.appendChild(svgText(24, 26, '噪声课程与两组机器人', 'demo-x-ink2', 13.5));
    var left = group(s);
    var fig = paperPart(left, 'fig5', 0, 0, 1, 1, 34, 46, 340, '论文图 5：上排三个课程阶段，噪声由小到大；下排是最后阶段（正面、俯视）');
    var hi = [rectBox(left, 34, 46, 113, 128, C_WARN, 'none'), rectBox(left, 147, 46, 113, 128, C_WARN, 'none'), rectBox(left, 260, 46, 113, 128, C_WARN, 'none')];
    hi.forEach(function (h) { h.setAttribute('stroke-width', 3); });
    var AY = 46 + fig.h + 52;
    var aBar = bar(left, 60, AY, 12, C_WARN);
    rectBox(left, 60, AY, 300, 12, C_BORDER, 'none');
    var aLab = rich(left, 36, AY - 6, '', 11, 'demo-x-ink2', 'start', 330);
    var grp = group(left);
    rectBox(grp, 24, 38, 360, 360, C_BORDER, C_SURFACE2);
    label(grp, 112, 66, '敏捷组', 'demo-x-acc', 13, 'middle');
    label(grp, 296, 66, '干预组', 'demo-x-warn', 13, 'middle');
    for (var i = 0; i < 12; i++) {
      var cx = 52 + (i % 4) * 40, cy = 92 + Math.floor(i / 4) * 34;
      dotAt(grp, cx, cy, 8, C_ACCENT);
      dotAt(grp, cx + 184, cy, 8, C_WARN);
    }
    var steps = [['① 都走地形课程：连续的粗糙地形', C_BORDER], ['② 最难的一关过了，地形留着不动', C_BORDER], ['③ 敏捷组：速度课程（网格自适应）', C_ACCENT], ['③ 干预组：噪声课程（α 往上加）', C_WARN]];
    var stepG = steps.map(function (sp, k) { return chip(grp, 40, 214 + k * 40, 328, sp[0], sp[1], { size: 11.5, left: true }); });
    var ps = panels(s, 5);
    label(ps[0], R, 64, '外部动作：从策略的动作慢慢换成噪声', 'demo-x-ink', 14);
    math(ps[0], R, 100, 'a^{\\text{interv}}_t = \\alpha\\,a^{\\text{interv}}_{\\text{noise},t} + (1-\\alpha)\\,a_t', 15, 'start', RW);
    rich(ps[0], R, 134, '$\\alpha$ 从 0 往上加：一开始几乎就是策略自己的动作', 12, 'demo-x-ink2', 'start', RW);
    label(ps[1], R, 64, 'α 怎么加减', 'demo-x-ink', 14);
    chip(ps[1], R, 80, RW, '线速度、角速度奖励都过阈值：$\\alpha + 0.01$', C_GOOD, { size: 12, left: true });
    chip(ps[1], R, 118, RW, '任一项不到阈值的 2/3：$\\alpha - 0.01$', C_BAD, { size: 12, left: true });
    rich(ps[1], R, 172, '代码：每次 ±0.05，只看线速度（0.6 倍满分），低于一半就减', 11, 'demo-x-mut', 'start', RW);
    label(ps[2], R, 64, '并行的机器人分两组', 'demo-x-ink', 14);
    chip(ps[2], R, 80, RW, '**敏捷组**：学高速、敏捷的移动', C_ACCENT, { size: 12, left: true });
    chip(ps[2], R, 118, RW, '**干预组**：学上身被外部接管', C_WARN, { size: 12, left: true });
    rich(ps[2], R, 172, '开始时每台机器人从四种步态里随机抽一种；官方代码两组各占一半', 11, 'demo-x-mut', 'start', RW);
    label(ps[3], R, 64, '课程的顺序', 'demo-x-ink', 14);
    rich(ps[3], R, 92, '两组都先走地形课程（参考前人：连续的粗糙地形）', 12, 'demo-x-ink2', 'start', RW);
    rich(ps[3], R, 116, '最难的地形过了：同时开始速度课程和噪声课程', 12, 'demo-x-ink2', 'start', RW);
    rich(ps[3], R, 146, '速度课程只给敏捷组，噪声课程只给干预组', 11, 'demo-x-mut', 'start', RW);
    label(ps[4], R, 64, '命令范围与训练时长', 'demo-x-ink', 14);
    rich(ps[4], R, 92, '$v_x$：$[-0.6, 0.6]$ → $[-0.6, 2.0]$ m/s；$\\omega$：→ $[-1, 1]$ rad/s', 12, 'demo-x-ink2', 'start', RW);
    rich(ps[4], R, 116, '其余命令一开始就在表 II 的全范围里均匀采样', 12, 'demo-x-ink2', 'start', RW);
    chip(ps[4], R, 132, RW, '一张 RTX 4090 训一个策略：16 小时（v3 加的）', C_BORDER, { size: 12 });
    rich(ps[4], R, 190, '官方代码：最多 4 万次迭代 × 4096 个环境 × 每次 24 步', 11, 'demo-x-mut', 'start', RW);
    function draw(t, clock) {
      var ci = cueIndex(t), u = Math.max(0, since(t, clock, 0));
      var alpha = clamp(u / 7, 0, 1);
      setW(aBar, 300 * alpha);
      aLab.setText('$\\alpha = ' + f2(alpha) + '$　噪声占比：0 全是策略自己的，1 全是噪声');
      hi.forEach(function (h, k) { setOpacity(h, alpha * 3 >= k && alpha * 3 < k + 1.2 ? 1 : 0); });
      var showGrp = ci >= 2;
      setOpacity(grp, showGrp ? win(t, CUES[2]) : 0);
      setOpacity(fig.g, showGrp ? 0 : 1); setOpacity(aBar, showGrp ? 0 : 1); setOpacity(aLab, showGrp ? 0 : 1);
      stepG.forEach(function (g, k) { setOpacity(g, ci < 3 ? (k < 2 ? 0.3 : 0.3) : 1); });
      fadePanels(ps, t);
    }
    return { el: s, draw: draw };
  }

  /* 一行横向条：标签、条、数字 */
  function barRow(parent, x, y, labelW, str, color, h, size) {
    var g = group(parent);
    rich(g, x + labelW - 6, y + (h || 14) / 2 + 4, str, size || 10.5, 'demo-x-ink2', 'end', labelW);
    var b = bar(g, x + labelW, y, h || 14, color);
    var v = label(g, x + labelW + 6, y + (h || 14) / 2 + 4, '', 'demo-x-ink', size || 10.5);
    return {
      g: g,
      set: function (w, txt) { setW(b, w); v.setAttribute('x', (x + labelW + Math.max(0, w) + 6).toFixed(1)); v.textContent = txt; }
    };
  }

  /* ── scene 11: 单个命令跟得多准（表 III、表 XI） ── */
  function buildSceneTable3() {
    var s = sceneSvg('上半部分：表 III 的九个命令各一列，四种步态的误差画成竖条（每列按这一列的最大值缩放，条上写数）；后来换成表 XI：走路时 HOVER、ExBody 与 HugWBC 七个命令的误差；下半部分依次讲测法、走路的数、步态之间的差别、侧向与姿态、和基线比');
    s.appendChild(svgText(24, 26, '单个命令跟得多准（表 III）', 'demo-x-ink2', 13.5));
    var top = group(s);
    var GX = 70, GW = 700, GY = 70, GH = 150, colW = GW / 9;
    var GAIT_C = [C_ACCENT, C_GOOD, C_WARN, C_PURPLE];
    var cells = [];
    T3_COLS.forEach(function (cn, j) {
      var x0 = GX + j * colW;
      rich(top, x0 + colW / 2, GY + GH + 18, cn, 11, 'demo-x-ink2', 'middle', colW);
      label(top, x0 + colW / 2, GY + GH + 36, T3_UNITS[j], 'demo-x-mut', 9, 'middle');
      var mx = 0;
      TABLE3.forEach(function (r) { if (r.v[j] != null) mx = Math.max(mx, r.v[j]); });
      TABLE3.forEach(function (r, i) {
        var bw = (colW - 12) / 4, bx = x0 + 6 + i * bw, v = r.v[j];
        var g = group(top);
        if (v == null) { label(g, bx + bw / 2, GY + GH - 4, '–', 'demo-x-mut', 10, 'middle'); cells.push({ g: g, i: i, j: j }); return; }
        var h = GH * 0.82 * v / mx;
        g.appendChild(paint(svgEl('rect', { x: (bx + 1).toFixed(1), y: (GY + GH - h).toFixed(1), width: (bw - 2).toFixed(1), height: h.toFixed(1), rx: 2 }), GAIT_C[i]));
        var tv = label(g, bx + bw / 2 + 3, GY + GH - h - 4, v.toFixed(3).replace(/^0\./, '.'), 'demo-x-ink2', 8.5, 'start');
        tv.setAttribute('transform', 'rotate(-90 ' + (bx + bw / 2 + 3).toFixed(1) + ' ' + (GY + GH - h - 4).toFixed(1) + ')');
        cells.push({ g: g, i: i, j: j });
      });
    });
    hline(top, GX, GY + GH, GX + GW, GY + GH, C_BORDER, 1.2);
    /* 纵轴读法：柱子是误差，越低越好；每列按这一列的最大值缩放 */
    function yAxisNote(g) { var n = label(g, 50, GY + GH / 2, '误差：越低越好（每列各自缩放）', 'demo-x-mut', 9.5, 'middle'); n.setAttribute('transform', 'rotate(-90 50 ' + (GY + GH / 2) + ')'); }
    yAxisNote(top);
    TABLE3.forEach(function (r, i) {
      dotAt(top, 80 + i * 90, 50, 6, GAIT_C[i]);
      label(top, 90 + i * 90, 54, r.zh, 'demo-x-ink2', 11.5);
    });
    label(top, 772, 54, '数字省掉了「0」，如 .030 = 0.030', 'demo-x-mut', 9.5, 'end');
    /* 表 XI */
    var t11 = group(s);
    var BX = 70, BW = 700, bcol = BW / 7, B_C = [C_MUTED, C_PURPLE, C_GOOD];
    T11_COLS.forEach(function (cn, j) {
      var x0 = BX + j * bcol, mx = Math.max.apply(null, TABLE11.map(function (r) { return r.v[j]; }));
      rich(t11, x0 + bcol / 2, GY + GH + 18, cn, 11, 'demo-x-ink2', 'middle', bcol);
      TABLE11.forEach(function (r, i) {
        var bw = (bcol - 16) / 3, bx = x0 + 8 + i * bw, h = GH * 0.82 * r.v[j] / mx;
        t11.appendChild(paint(svgEl('rect', { x: (bx + 1).toFixed(1), y: (GY + GH - h).toFixed(1), width: (bw - 2).toFixed(1), height: h.toFixed(1), rx: 2 }), B_C[i]));
        var tv = label(t11, bx + bw / 2 + 3, GY + GH - h - 4, r.v[j].toFixed(3).replace(/^0\./, '.'), 'demo-x-ink2', 8.5, 'start');
        tv.setAttribute('transform', 'rotate(-90 ' + (bx + bw / 2 + 3).toFixed(1) + ' ' + (GY + GH - h - 4).toFixed(1) + ')');
      });
    });
    hline(t11, BX, GY + GH, BX + BW, GY + GH, C_BORDER, 1.2);
    yAxisNote(t11);
    TABLE11.forEach(function (r, i) { dotAt(t11, 80 + i * 110, 50, 6, B_C[i]); label(t11, 90 + i * 110, 54, r.zh, 'demo-x-ink2', 11.5); });
    label(t11, 772, 54, '表 XI：走路，上身放在默认姿态当参考', 'demo-x-mut', 9.5, 'end');
    var NY = 290;
    var ps = panels(s, 5);
    rich(ps[0], 24, NY, '**测法**：一次只扫一个命令（在表 II 的范围里均匀采样），其余放默认值；误差是 L1 的回合平均', 12.5, 'demo-x-ink2', 'start', 760);
    rich(ps[0], 24, NY + 24, '脚的两项按整个步态周期算，其余按每一步算；站立只测姿态三项，单脚跳只测它的四个命令', 11.5, 'demo-x-mut', 'start', 760);
    rich(ps[1], 24, NY, '**走**：$v_x$ 低速 0.030 m/s、高速（> 1 m/s）0.216；$v_y$ 0.085，$\\omega$ 0.054 rad/s', 12.5, 'demo-x-ink2', 'start', 760);
    rich(ps[1], 24, NY + 24, '步频 0.028 Hz、抬脚 0.011 m；身高 0.064 m、俯仰 0.038 rad、腰 0.075 rad', 11.5, 'demo-x-mut', 'start', 760);
    rich(ps[2], 24, NY, '**论文：站、走比跳、单脚跳准得多，单脚跳误差最大**——高速、俯仰、腰的命令下会摔，策略先保平衡', 12.5, 'demo-x-ink2', 'start', 760);
    rich(ps[2], 24, NY + 24, '但表里单脚跳的低速 $v_x$（0.033）、$v_y$（0.046）比跳（0.090、0.069）还小；论文：训练时先学会的步态跟得准', 11.5, 'demo-x-mut', 'start', 760);
    rich(ps[3], 24, NY, '**侧向不如前向**：论文归因于 H1 的硬件；**调姿态比调脚难**：姿态更影响平衡，策略更保守', 12.5, 'demo-x-ink2', 'start', 760);
    rich(ps[3], 24, NY + 24, '论文文字说抬脚 $l$ 跟得最不准，但表里 $E_l$ 是 0.011 m，量纲不同、我们看不出它怎么比的', 11.5, 'demo-x-mut', 'start', 760);
    rich(ps[4], 24, NY, '**表 XI**：同样扫单个命令，HugWBC 七项都比 HOVER、ExBody 低（$v_x$ 低速 0.030 对 0.559 / 0.109）', 12.5, 'demo-x-ink2', 'start', 760);
    rich(ps[4], 24, NY + 24, '论文自己说明：这是让两个基线做它们不是为之设计的事，所以比它们原论文的成绩差', 11.5, 'demo-x-mut', 'start', 760);
    function draw(t, clock) {
      var ci = cueIndex(t);
      var showT11 = ci === 4;
      setOpacity(top, showT11 ? 1 - seg(t, CUES[4], CUES[4] + 0.3) : 1);
      setOpacity(t11, showT11 ? seg(t, CUES[4] + 0.3, CUES[4] + 0.7) : 0);
      cells.forEach(function (c) {
        var on = ci === 1 ? c.i === 1 : ci === 2 ? true : ci === 3 ? (c.j === 2 || c.j >= 6) : true;
        setOpacity(c.g, on ? 1 : 0.25);
      });
      fadePanels(ps, t);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 命令能不能随便组合（图 8） ── */
  function buildSceneOrtho() {
    var s = sceneSvg('左边：论文图 8 的走路误差热图（8 × 8 个命令两两组合，红色误差小、蓝色误差大），讲到哪几格就放大哪几格，后来换成站立的三个姿态命令；右边依次讲热图怎么读、走路时哪些命令互不影响、步频与几个窄范围的命令、站立时身高和俯仰的冲突、跳和单脚跳以及代码里的截断');
    s.appendChild(svgText(24, 26, '命令能不能随便组合：误差热图（图 8）', 'demo-x-ink2', 13.5));
    var left = group(s);
    var full = paperPart(left, 'fig8w', 0, 0, 1, 1, 34, 44, 340, '论文图 8(a)：走路，8 个命令两两扫一遍；红 = 误差小，蓝 = 误差大');
    var zA = group(left);
    var a1 = heatCell(5, 0), a2 = heatCell(5, 2);
    paperPart(zA, 'fig8w', a1[0] - 0.04, a1[1], a1[2], a1[3], 34, 50, 165, '');
    label(zA, 116, 222, '身高 × 前向速度', 'demo-x-mut', 9.5, 'middle');
    paperPart(zA, 'fig8w', a2[0], a2[1], a2[2], a2[3], 214, 50, 150, '');
    label(zA, 289, 222, '身高 × 偏航角速度', 'demo-x-mut', 9.5, 'middle');
    var a3 = heatCell(7, 0);
    paperPart(zA, 'fig8w', a3[0] - 0.04, a3[1], a3[2], a3[3] + 0.03, 34, 236, 150, '');
    label(zA, 109, 396, '腰 × 前向速度：右端变蓝', 'demo-x-mut', 9.5, 'middle');
    var zB = group(left);
    var b1 = heatCell(3, 0), b2 = heatCell(4, 3), b3 = heatCell(6, 5);
    paperPart(zB, 'fig8w', b1[0] - 0.04, b1[1], b1[2], b1[3], 34, 50, 165, '');
    label(zB, 116, 222, '步频一行：条纹（离散的正交）', 'demo-x-mut', 9.5, 'middle');
    paperPart(zB, 'fig8w', b2[0], b2[1], b2[2], b2[3], 214, 50, 150, '');
    label(zB, 289, 222, '抬脚 × 步频：只在窄带里好', 'demo-x-mut', 9.5, 'middle');
    paperPart(zB, 'fig8w', b3[0], b3[1], b3[2], b3[3], 34, 236, 144, '');
    label(zB, 106, 396, '俯仰 × 身高', 'demo-x-mut', 9.5, 'middle');
    var zC = group(left);
    paperPart(zC, 'fig8s', 0, 0, 1, 1, 34, 44, 340, '论文图 8(c)：站立，身高、俯仰、腰两两组合');
    var ps = panels(s, 5);
    label(ps[0], R, 64, '两个命令一起扫', 'demo-x-ink', 14);
    rich(ps[0], R, 92, '每一格：横轴、纵轴各是一个命令的取值，颜色是误差', 12, 'demo-x-ink2', 'start', RW);
    chip(ps[0], R, 108, RW, '**正交**：一个命令在它的范围里随便变，另一个照样跟得准', C_GOOD, { size: 11.5 });
    rich(ps[0], R, 166, '红 = 误差小，蓝 = 误差大：红色越多越好', 11.5, 'demo-x-ink2', 'start', RW);
    rich(ps[0], R, 188, '对角线上是单个命令的误差曲线；每行的色标范围不同', 11, 'demo-x-mut', 'start', RW);
    label(ps[1], R, 64, '走：大部分组合互不影响', 'demo-x-ink', 14);
    rich(ps[1], R, 92, '$v_x$、$\\omega$、$h$、$w$ 两两正交', 12, 'demo-x-ink2', 'start', RW);
    chip(ps[1], R, 108, RW, '$v_x$ 超过 1.5 m/s 后正交性下降：先保稳定', C_WARN, { size: 11.5 });
    rich(ps[1], R, 166, '红 = 误差小，蓝 = 误差大', 11, 'demo-x-mut', 'start', RW);
    label(ps[2], R, 64, '步频与几个窄范围的命令', 'demo-x-ink', 14);
    rich(ps[2], R, 92, '步频是「离散的正交」：1.5、2 Hz 最好，高频变差', 12, 'demo-x-ink2', 'start', RW);
    rich(ps[2], R, 116, '$v_y$、$l$、$p$ 只在窄范围里和别的命令正交', 12, 'demo-x-ink2', 'start', RW);
    rich(ps[2], R, 142, '红 = 误差小，蓝 = 误差大', 11, 'demo-x-mut', 'start', RW);
    label(ps[3], R, 64, '站：身高和俯仰打架', 'demo-x-ink', 14);
    rich(ps[3], R, 92, '$w$ 和另外两个几乎正交；$h$、$p$ 范围越大越冲突', 12, 'demo-x-ink2', 'start', RW);
    chip(ps[3], R, 108, RW, '身高降 0.3 m，髋俯仰几乎没余量了，$p$ 跟不上', C_BAD, { size: 11.5 });
    rich(ps[3], R, 166, 'H1 腰上只有一个偏航自由度，弯腰全靠髋俯仰', 11, 'demo-x-mut', 'start', RW);
    label(ps[4], R, 64, '跳与单脚跳；代码先截掉冲突的组合', 'demo-x-ink', 14);
    rich(ps[4], R, 92, '跳的正交范围比走小；单脚跳几乎没有，只能跟 $v_x, v_y, \\omega, h$', 12, 'demo-x-ink2', 'start', RW);
    chip(ps[4], R, 108, RW, '高速：$f \\ge 2$、$p \\le 0.3$、$|w| \\le 0.15$', C_BORDER, { size: 11 });
    chip(ps[4], R, 142, RW, '$f > 2.5$ 或 $h < -0.15$：$l \\le 0.2$；$h < -0.2$：$p \\le 0.3$', C_BORDER, { size: 11 });
    rich(ps[4], R, 196, '官方代码 `h1.py` 采命令时就这样截（`h1int` 任务只保留了对跳的截断）', 10.5, 'demo-x-mut', 'start', RW);
    function draw(t, clock) {
      var ci = cueIndex(t);
      var vis = [ci === 0 || ci === 4 ? 1 : 0, ci === 1 ? 1 : 0, ci === 2 ? 1 : 0, ci === 3 ? 1 : 0];
      [full.g, zA, zB, zC].forEach(function (g, k) {
        var a = k === 0 ? (ci === 0 ? cueWin(t, 0) : ci === 4 ? win(t, CUES[4]) : 0) : cueWin(t, k);
        setOpacity(g, vis[k] ? a : 0);
      });
      fadePanels(ps, t);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 13: 干预训练的消融（表 IV、表 X） ── */
  function buildSceneAblation() {
    var s = sceneSvg('左边：项目页视频，讲到哪组换哪段（上身被噪声接管、边走边挥手、跳着张开 / 交叉手臂）；右边是表 IV 的条形图：三种训练（噪声课程、AMASS 动作、不干预）各在三种测试下的误差，讲到哪项换哪项，最后换成跳（表 X）；下面一行字随旁白变');
    s.appendChild(svgText(24, 26, '干预训练的消融（表 IV：走路）', 'demo-x-ink2', 13.5));
    /* 讲到哪组就换哪段：表 IV 开头和「不干预的被噪声接管」放噪声；AMASS 那组与「没有干预时」放边走边挥手（像人的手臂动作）；
       跳（表 X）放跳着张开、交叉手臂（复用第 1 幕 intro 片段的最后一截） */
    var clips = [
      projClip(s, 'noise', 44, 50, 300, 300, '项目页视频（1 倍速）：上身被均匀噪声接管'),
      projClip(s, 'hello', 44, 50, 300, 300, '项目页视频（1 倍速）：边走边挥手'),
      projClip(s, 'intro', 44, 50, 300, 300, '项目页视频（1 倍速）：跳着张开、交叉手臂', { range: [15.0, 21.4] })
    ];
    var chart = group(s);
    var CX = R, CY = 72;
    var head = rich(chart, CX, 54, '', 12.5, 'demo-x-ink', 'start', RW);
    var TEST_C = [C_WARN, C_PURPLE, C_ACCENT];
    var rowsB = [];
    STRATS.forEach(function (st, i) {
      var y0 = CY + i * 76;
      label(chart, CX, y0 + 6, st, 'demo-x-ink2', 11.5);
      TESTS.forEach(function (tn, j) {
        rowsB.push({ i: i, j: j, r: barRow(chart, CX, y0 + 16 + j * 17, 60, '测：' + tn, TEST_C[j], 12, 9.5) });
      });
    });
    var NY = 306;
    var nt = panels(s, 5);
    rich(nt[0], R, NY, '三种训练 × 三种测试：噪声、AMASS 动作、不干预', 11.5, 'demo-x-ink2', 'start', RW);
    rich(nt[0], R, NY + 20, 'AMASS 基线：手臂动作取自过滤后的 AMASS（OmniH2O 的那份）', 10.5, 'demo-x-mut', 'start', RW);
    rich(nt[1], R, NY, '不干预训出来的：一被噪声接管，$v_x$ 误差 0.076 → 0.866 m/s', 11.5, 'demo-x-ink2', 'start', RW);
    rich(nt[1], R, NY + 20, 'HugWBC 只从 0.026 涨到 0.048', 10.5, 'demo-x-mut', 'start', RW);
    rich(nt[2], R, NY, 'AMASS 训的：碰到 AMASS 还行（0.057），碰到噪声 0.170', 11.5, 'demo-x-ink2', 'start', RW);
    rich(nt[2], R, NY + 20, '论文：动作库覆盖不到的上身动作，它就没见过', 10.5, 'demo-x-mut', 'start', RW);
    rich(nt[3], R, NY, '没干预时，HugWBC 的速度、脚也最准：干预训练本身让策略更稳', 11.5, 'demo-x-ink2', 'start', RW);
    rich(nt[3], R, NY + 20, '只有姿态三项不如不干预的策略（$h$ 0.037 对 0.026）', 10.5, 'demo-x-mut', 'start', RW);
    rich(nt[4], R, NY, '跳（表 X）：手臂被接管影响最大——跳要靠摆臂', 11.5, 'demo-x-ink2', 'start', RW);
    rich(nt[4], R, NY + 20, '表 X「不干预」的姿态误差，跳和站立基本一样，见笔记', 10.5, 'demo-x-mut', 'start', RW);
    function draw(t, clock) {
      var ci = cueIndex(t);
      /* 先淡出上一段、再淡入下一段，两条图注不叠在一起 */
      var ops = [1 - seg(t, CUES[2], CUES[2] + 0.3), seg(t, CUES[2] + 0.3, CUES[2] + 0.6) * (1 - seg(t, CUES[4], CUES[4] + 0.3)), seg(t, CUES[4] + 0.3, CUES[4] + 0.6)];
      clips.forEach(function (c, k) { setOpacity(c.g, ops[k]); c.at(K.clipSince(t, [0, CUES[2] + 0.3, CUES[4] + 0.3][k]), ops[k] > 0.01); });
      var gait = ci === 4 ? 'jump' : 'walk', col = ci === 3 ? 5 : 0;
      var data = TABLE4[gait], mx = 0;
      data.forEach(function (rw) { rw.forEach(function (v) { if (v[col] != null) mx = Math.max(mx, v[col]); }); });
      head.setText((gait === 'walk' ? '走路' : '跳（表 X）') + '：' + T4_COLS[col] + ' 的误差' + (col === 0 ? '（m/s）' : '（m）') + '，条越短越好');
      rowsB.forEach(function (rb) {
        var v = data[rb.i][rb.j][col];
        rb.r.set(240 * v / mx, String(v));
        var hiOn = ci === 1 ? rb.i === 2 || rb.i === 0 : ci === 2 ? rb.i === 1 : ci === 3 ? rb.j === 2 : true;
        setOpacity(rb.r.g, hiOn ? 1 : 0.3);
      });
      fadePanels(nt, t);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 14: 站着干活与抗推（表 V、图 6） ── */
  function buildSceneStand() {
    var s = sceneSvg('左边：表 V，站着跟姿态命令、上身被噪声接管时，一回合两只脚挪了多远（对数轴），三种训练各三项；右边：论文图 6 的雷达图，8 个方向上扛得住的力；下面一行字随旁白变');
    s.appendChild(svgText(24, 26, '站着干活与抗推（表 V、图 6）', 'demo-x-ink2', 13.5));
    var lt = group(s);
    label(lt, 24, 56, '噪声接管时，20 s 里两只脚挪了多远（m，对数轴）', 'demo-x-ink', 12);
    var STRAT_C = [C_GOOD, C_PURPLE, C_BAD], LX = 24, LW = 360, logMin = -4, logMax = 1.5;
    function lx(v) { return LX + 70 + (Math.log(v) / Math.LN10 - logMin) / (logMax - logMin) * (LW - 110); }
    [0.001, 0.01, 0.1, 1, 10].forEach(function (v) {
      hline(lt, lx(v), 68, lx(v), 252, C_BORDER, 0.8, '2 3');
      label(lt, lx(v), 264, String(v), 'demo-x-mut', 9, 'middle');
    });
    label(lt, LX, 264, '越短越好；每格差 10 倍', 'demo-x-mut', 9, 'start');
    var bars5 = [];
    ['$D_h$（身高）', '$D_p$（俯仰）', '$D_w$（腰）'].forEach(function (dn, k) {
      var y0 = 74 + k * 62;
      rich(lt, LX, y0 + 8, dn, 11, 'demo-x-ink2', 'start', 100);
      STRATS.forEach(function (st, i) {
        var y = y0 + 14 + i * 14, v = TABLE5[i][0][k];
        var b = bar(lt, LX + 70, y, 11, STRAT_C[i]);
        setW(b, lx(v) - (LX + 70));
        /* 数值下面垫一块底色，竖向虚线网格不从数字上穿过 */
        lt.appendChild(paint(svgEl('rect', { x: lx(v) + 3, y: y, width: String(v).length * 5 + 4, height: 11 }), C_SURFACE));
        label(lt, lx(v) + 5, y + 9, String(v), 'demo-x-ink', 9);
        bars5.push(b);
      });
    });
    STRATS.forEach(function (st, i) { dotAt(lt, 30 + i * 118, 282, 5, STRAT_C[i]); label(lt, 38 + i * 118, 286, st.replace('（HugWBC）', ''), 'demo-x-ink2', 9.5); });
    var rt = group(s);
    var fig = paperPart(rt, 'fig6', 0, 0, 1, 1, R, 44, RW, '论文图 6：左 = 持续的力，右 = 推一秒；蓝 HugWBC，红 不做干预训练');
    /* 讲图 6 的三段：雷达图放大到卡片中间（宽 480），标题挪到图上方 */
    var big = group(s), BW = 480, BX = (800 - BW) / 2;
    label(big, 400, 50, '论文图 6：左 = 一直加着的力，右 = 推一秒；蓝 HugWBC，红 不做干预训练；离中心越远，扛得住的力越大', 'demo-x-mut', 10.5, 'middle');
    paperPart(big, 'fig6', 0, 0, 1, 1, BX, 60, BW, '');
    var NY = 316;
    var ps = panels(s, 5);
    rich(ps[0], 24, NY, '**站着调姿态时脚应该不动**：表 V 量一回合（20 s）里两只脚总共挪了多远', 12.5, 'demo-x-ink2', 'start', 760);
    rich(ps[0], 24, NY + 24, '要站着做精细操作，脚一直挪就干不了活（论文的动机）；表头写的单位是 m/s，按图注是位移', 11.5, 'demo-x-mut', 'start', 760);
    rich(ps[1], 24, NY, '噪声接管时：**HugWBC 0.02–0.09 m**；AMASS 训的 2.1–3.3 m，不停小碎步；不干预的 17.5–25.7 m', 12.5, 'demo-x-ink2', 'start', 760);
    rich(ps[1], 24, NY + 24, '论文：不做干预训练的策略一被接管就容易翻倒，整个任务失败', 11.5, 'demo-x-mut', 'start', 760);
    rich(ps[2], 24, NY, '**图 6**：站立、默认命令，在 8 个方向上加力；4096 次里存活超过 98% 才算扛住', 12.5, 'demo-x-ink2', 'start', 760);
    rich(ps[2], 24, NY + 24, '左图是一直加着的力，右图是推一秒；比的是做和不做干预训练', 11.5, 'demo-x-mut', 'start', 760);
    rich(ps[3], 24, NY, '大多数方向上 HugWBC 扛得更多：例如 0° 方向持续的力约 600 对 510 N，推一秒约 940 对 750 N', 12.5, 'demo-x-ink2', 'start', 760);
    rich(ps[3], 24, NY + 24, '读图近似值；8 个方向里各有 6 个更大，180° 等少数方向反而更小；论文没写 0° 指哪边', 11.5, 'demo-x-mut', 'start', 760);
    rich(ps[4], 24, NY, '**论文的解释**：干预让上身一直在晃，机器人练出了动态调整腿上力量来稳住的本事', 12.5, 'demo-x-ink2', 'start', 760);
    rich(ps[4], 24, NY + 24, '论文同一节还提到：真机上脚落地时更用力（触地的力更大），动作平稳和跟踪精度之间可能要取舍', 11.5, 'demo-x-mut', 'start', 760);
    function draw(t, clock) {
      var ci = cueIndex(t);
      var small = ci <= 1 ? 1 : 1 - seg(t, CUES[2], CUES[2] + 0.3);
      setOpacity(lt, small);
      setOpacity(rt, 0.35 * small);
      setOpacity(big, ci >= 2 ? win(t, CUES[2]) : 0);
      fadePanels(ps, t);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 15: 真机 ── */
  function buildSceneReal() {
    var s = sceneSvg('左边：项目页的真机视频，依次是站着调身高 / 俯仰 / 腰 / 步频（下面标出项目页字幕当时写的命令）、单脚跳与跳、搬箱子（2 倍速）、户外草地上换步态；右边依次讲部署、表 VI 的真机误差、跳、移动操作、户外');
    s.appendChild(svgText(24, 26, '真机：Unitree H1（表 VI）', 'demo-x-ink2', 13.5));
    var V = 300, VX = 44, VY = 50;
    var vPost = group(s), vJump = group(s), vBox = group(s), vLawn = group(s);
    var cPost = projClip(vPost, 'posture', VX, VY, V, V, '项目页视频（1 倍速）：站着跟姿态、原地改步频');
    var postTag = rich(vPost, VX + V / 2, VY + V + 42, '', 13, 'demo-x-ink', 'middle', V);
    var cJump = projClip(vJump, 'intro', VX, VY, V, V, '项目页视频（1 倍速）：单脚跳、侧向跳', { range: [4.0, 15.0] });
    var cBox = projClip(vBox, 'box', VX - 16, VY + 30, 332, 249, '项目页视频（2 倍速）：外部控制上身搬箱子');
    var cLawn = projClip(vLawn, 'lawn', VX, VY, V, V, '项目页视频（1 倍速）：户外草地，步态之间切换');
    var ps = panels(s, 5);
    label(ps[0], R, 64, '直接部署', 'demo-x-ink', 14);
    chip(ps[0], R, 80, RW, 'Unitree H1，策略 50 Hz', C_BORDER, { size: 12, left: true });
    chip(ps[0], R, 118, RW, 'sim-to-sim：unitree_mujoco；真机：unitree_sdk2_python', C_BORDER, { size: 11, left: true });
    rich(ps[0], R, 172, '左边：站着调身高、俯仰、腰，原地踏步改步频', 11.5, 'demo-x-mut', 'start', RW);
    label(ps[1], R, 64, '表 VI：真机只量得了俯仰和腰', 'demo-x-ink', 14);
    var bars6 = [];
    TABLE6.forEach(function (r, i) {
      var y = 84 + i * 44;
      label(ps[1], R, y + 14, r.zh, 'demo-x-ink2', 12);
      [['p', C_PURPLE], ['w', C_WARN]].forEach(function (q, k) {
        var yy = y + k * 17, v = r[q[0]];
        var b = bar(ps[1], R + 40, yy, 13, q[1]); setW(b, v[0] * 1200);
        hline(ps[1], R + 40 + (v[0] - v[1]) * 1200, yy + 6.5, R + 40 + (v[0] + v[1]) * 1200, yy + 6.5, C_MUTED, 1.2);
        rich(ps[1], R + 44 + (v[0] + v[1]) * 1200, yy + 11, '$E_' + q[0] + '$ ' + v[0] + ' ± ' + v[1], 9.5, 'demo-x-ink2', 'start', 140);
      });
    });
    rich(ps[1], R, 222, '紫 = 俯仰 $E_p$，黄 = 腰 $E_w$（rad）；条越短越好，细线是标准差', 10.5, 'demo-x-ink2', 'start', RW);
    rich(ps[1], R, 242, '读电机编码器；其他命令没有动捕量不准。误差比仿真略大（传感器噪声、硬件磨损）', 10.5, 'demo-x-mut', 'start', RW);
    label(ps[2], R, 64, '跳与单脚跳也上了真机', 'demo-x-ink', 14);
    rich(ps[2], R, 92, '表 VI 里跳的两项误差都最小：0.067、0.055 rad', 12, 'demo-x-ink2', 'start', RW);
    rich(ps[2], R, 116, '项目页：单脚跳往各个方向、身高由高到低；跳着前进由慢到快', 11.5, 'demo-x-mut', 'start', RW);
    label(ps[3], R, 64, '移动操作', 'demo-x-ink', 14);
    rich(ps[3], R, 92, '外部控制上身搬箱子；下身照样蹲下、弯腰、走过去', 12, 'demo-x-ink2', 'start', RW);
    chip(ps[3], R, 108, RW, '这就是干预训练要的：上身交给别人，腿照常跟命令', C_GOOD, { size: 11.5 });
    label(ps[4], R, 64, '走出实验室', 'demo-x-ink', 14);
    rich(ps[4], R, 92, '校园、商业街、草地；走、跑、跳、单脚跳之间切换', 12, 'demo-x-ink2', 'start', RW);
    rich(ps[4], R, 116, '论文的定量结果只有表 VI；其余是视频展示', 11.5, 'demo-x-mut', 'start', RW);
    function draw(t, clock) {
      var ci = cueIndex(t);
      var vis = [ci <= 1, ci === 2, ci === 3, ci === 4];
      [vPost, vJump, vBox, vLawn].forEach(function (g, k) {
        var a = !vis[k] ? 0 : k === 0 ? (ci === 0 ? cueWin(t, 0) : 1 - seg(t, CUES[2], CUES[2] + 0.3)) : cueWin(t, k + 1);
        setOpacity(g, a);
      });
      var secP = K.clipSince(t, 0);
      cPost.at(secP, vis[0]);
      var m = ((secP % CLIP_DUR.posture) + CLIP_DUR.posture) % CLIP_DUR.posture, tg = '';
      POSTURE_TAGS.forEach(function (pt) { if (m >= pt[0] && m < pt[1]) tg = pt[2]; });
      postTag.setText(tg ? '项目页字幕：' + tg : '');
      cJump.at(K.clipSince(t, CUES[2]), vis[1]);
      cBox.at(K.clipSince(t, CUES[3]), vis[2]);
      cLawn.at(K.clipSince(t, CUES[4]), vis[3]);
      fadePanels(ps, t);
    }
    return { el: s, draw: draw };
  }

  /* ── scene 16: 局限与代码 ── */
  function buildSceneLimits() {
    var s = sceneSvg('左边：论文图 1 的真机拼图，下面是官方代码的目录；右边依次讲论文自己的局限、命令之间的冲突、官方代码有什么、代码和论文的几处出入、总结');
    s.appendChild(svgText(24, 26, '局限与代码', 'demo-x-ink2', 13.5));
    var left = group(s);
    var fig = paperPart(left, 'fig1', 0, 0, 1, 1, 34, 44, 340, '论文图 1：四种步态、外部接管上身、各种命令组合');
    var code = group(left);
    var CY0 = 44 + fig.h + 34;
    rectBox(code, 34, CY0, 340, 398 - CY0, C_BORDER, C_SURFACE2);
    ['apexrl/HugWBC（2025-06 开源）', 'legged_gym/envs/h1/', '  h1.py：命令、相位时钟、奖励', '  h1interrupt.py：干预（--task=h1int）', 'rsl_rl/algorithms/ppo.py：PPO + 对称损失',
      'rsl_rl/modules/net_model.py：编码器 + 估计器'].forEach(function (ln, i) {
      label(code, 46, CY0 + 20 + i * 18, ln, i ? 'demo-x-ink2 demo-x-mono' : 'demo-x-ink demo-x-mono', i ? 10 : 11);
    });
    var ps = panels(s, 5);
    label(ps[0], R, 64, '局限（论文没单列，我们整理的）', 'demo-x-ink', 14);
    chip(ps[0], R, 80, RW, '单脚跳：单独一个策略、4 个命令、没做干预训练', C_WARN, { size: 11.5, left: true });
    chip(ps[0], R, 118, RW, '只在 H1 上做；结论说以后换别的人形、接高层规划器', C_WARN, { size: 11.5, left: true });
    label(ps[1], R, 64, '命令之间会打架', 'demo-x-ink', 14);
    rich(ps[1], R, 92, '高速、低身高、高步频时，有些组合做不到', 12, 'demo-x-ink2', 'start', RW);
    chip(ps[1], R, 108, RW, '上层规划器要知道哪些组合是安全的（我们的理解）', C_BAD, { size: 11.5 });
    rich(ps[1], R, 162, '图 8 的热图就是一张「哪里能组合」的地图', 11, 'demo-x-mut', 'start', RW);
    label(ps[2], R, 64, '官方代码有什么', 'demo-x-ink', 14);
    rich(ps[2], R, 92, 'Isaac Gym Preview 4 + legged_gym + rsl_rl', 12, 'demo-x-ink2', 'start', RW);
    rich(ps[2], R, 116, '`train.py --task=h1int`、`play.py --task=h1int`', 11.5, 'demo-x-ink2', 'start', RW);
    chip(ps[2], R, 132, RW, '只有走、跳、站：单脚跳的策略没放出来', C_WARN, { size: 11.5 });
    label(ps[3], R, 64, '代码和论文的出入（我们读代码的结果）', 'demo-x-ink', 14);
    ['站立时相位置 0：时钟 0、接地概率 0.5', '抬脚：三角形目标生效，五次多项式权重 0', '估计器只估线速度', '干预：每 30 步重抽，翻转函数未调用', '角速度奖励权重 3，跟踪的 σ 是 0.25'].forEach(function (ln, i) {
      rich(ps[3], R, 92 + i * 22, '· ' + ln, 11.5, 'demo-x-ink2', 'start', RW);
    });
    label(ps[4], R, 64, '论文里对不上的几处', 'demo-x-ink', 14);
    ['表 I：接触奖励的指数前少了负号', '表 V：表头单位写成 m/s，其实是位移（m）', '表 X：「不干预」的姿态误差，跳和站立几乎一样',
      '正文说抬脚跟得最不准，表 III 里 $E_l$ 才 0.011 m', '正文说腰比俯仰准，站立那一行反过来'].forEach(function (ln, i) {
      rich(ps[4], R, 92 + i * 22, '· ' + ln, 11.5, 'demo-x-ink2', 'start', RW);
    });
    function draw(t, clock) {
      fadePanels(ps, t);
    }
    return { el: s, draw: draw };
  }

  var HUGWBC_SCENES = [
    {
      title: '人会的，人形还做不到',
      dur: 16,
      build: buildSceneIntro,
      cues: [
        { at: 0.4, s: '人会走、跑、跳、单脚跳；只是走路，也能细调**频率、步幅、抬脚高度**。' },
        { at: 3.6, s: '以前的人形行走大多不在意步态风格能不能变、能不能控——摘要说它 single、tedious、unextendable、unconstrained。' },
        { at: 7.0, s: '上身一被遥操作或 IK 接管，下身策略就碰上没见过的输入，容易失稳。' },
        { at: 10.4, s: 'HugWBC：**任务 + 行为**的命令空间，一个策略走、跳、站（单脚跳另训），上身随时交给外部控制器。' },
        { at: 13.4, s: '上海交大、上海人工智能实验室 · RSS 2025 · Unitree H1 · 代码 2025-06 开源。' }
      ]
    },
    {
      title: '命令空间：任务 + 行为',
      dur: 16,
      build: buildSceneCommands,
      cues: [
        { at: 0.4, s: '**任务命令** $\\mathcal{K}$：目标速度 $v = (v_x, v_y, \\omega)$。' },
        { at: 3.6, s: '**行为命令** $\\mathcal{B}$ 第一组「脚」：步频 $f$（1.5–3.5 Hz）、最高抬脚 $l$（0.1–0.35 m）。' },
        { at: 7.0, s: '第二组「姿态」：身高 $h$（往下 0–0.3 m）、身体俯仰 $p$（0–0.4 rad）、腰偏航 $w$（±1 rad）。' },
        { at: 10.4, s: '第三组「步态」：相位偏移 $\\psi$、两只脚的相位 $\\phi_1, \\phi_2$、支撑占比 $\\phi_{\\text{stance}}$。' },
        { at: 13.4, s: '合起来 $\\mathcal{C} = \\mathcal{K} \\times \\mathcal{B}$；官方代码里命令 11 维（含干预标志），再加两个时钟。' }
      ]
    },
    {
      title: '相位：切换四种步态',
      dur: 16,
      build: buildScenePhase,
      cues: [
        { at: 0.4, s: '每只脚一个相位 $\\phi \\in [0, 1)$，每步加 $f\\,\\mathrm{d}t$；$\\phi < \\phi_{\\text{stance}} = 0.5$ 着地，否则摆动。' },
        { at: 3.6, s: '**走**：$\\psi = 0.5$，右脚比左脚晚半圈。' },
        { at: 7.0, s: '**跳**：$\\psi = 0$，两只脚同相，一起着地、一起腾空。' },
        { at: 10.4, s: '**站**：两只脚的相位固定在 0.25；**单脚跳**：抬起的脚固定在 0.75，另一只脚按 $f$ 跳。' },
        { at: 13.4, s: '走、跳、站共用一个策略；单脚跳单独训，只跟 $v_x, v_y, \\omega, h$。官方代码没有单脚跳。' }
      ]
    },
    {
      title: '期望接地概率',
      dur: 16,
      build: buildSceneContact,
      cues: [
        { at: 0.4, s: '硬切换：$\\bar\\phi$ 一过 0.5，期望接地就从 1 掉到 0。' },
        { at: 3.6, s: '用标准正态的 CDF $\\Phi$ 把切换点放松成一段坡：期望接地概率 $C(\\bar\\phi)$。' },
        { at: 7.0, s: '$\\sigma$ 越大坡越缓；官方代码 $\\sigma = 0.05$，坡宽 ±0.15：$C(0.1) = 0.977$、$C(0.6) = 0.023$。' },
        { at: 10.4, s: '策略看到的是时钟 $Cl = \\sin 2\\pi\\bar\\phi$：走路时左右一正一负，跳时重合。' },
        { at: 13.4, s: '站立：论文 $\\phi = 0.25$，$Cl = 1$；官方代码把相位置 0，$Cl = 0$、$C = 0.5$（我们读代码的结果）。' }
      ]
    },
    {
      title: '非对称 Actor-Critic',
      dur: 16,
      build: buildSceneAAC,
      cues: [
        { at: 0.4, s: '本体感受 63 维：角速度、重力方向、19 个关节的位置和速度、上一步动作。' },
        { at: 3.6, s: 'critic 还看特权 24 维（线速度、身高误差、抬脚高度、摩擦、足底力、碰撞）和脚下 221 个地形高度。' },
        { at: 7.0, s: 'actor 只看最近 5 步的本体感受、命令和干预标志 $I(t)$：真机拿得到的。' },
        { at: 10.4, s: '估计器从历史里估线速度（论文还写了抬脚高度、身高；官方代码只估线速度）。' },
        { at: 13.4, s: '$\\mathcal{L}^{\\text{AAC}} = \\mathcal{L}^{\\text{value}} + \\lambda^{\\text{policy}}\\mathcal{L}^{\\text{policy}} + \\lambda^{\\text{est}}\\mathcal{L}^{\\text{est}}$；部署时 actor 50 Hz。' }
      ]
    },
    {
      title: '奖励（一）：速度与姿态',
      dur: 16,
      build: buildSceneRewardTask,
      cues: [
        { at: 0.4, s: '任务奖励：线速度、角速度跟踪，$\\exp(-\\text{误差}^2/0.2)$，权重各 2。' },
        { at: 3.6, s: '姿态命令直接罚平方误差：身高 −40、俯仰 −10、腰 −2。' },
        { at: 7.0, s: '算一步：命令 $h = -0.2$、实际 $-0.15$，$-40 \\times 0.05^2 = -0.1$。' },
        { at: 10.4, s: '正则奖励 11 项：角速度、竖直速度、滑脚、动作变化与平滑、力矩、加速度、上身与髋的偏离、双脚对称、提前终止 −200。' },
        { at: 13.4, s: '官方代码另有十几项，而且正则项先乘 0.2、每 100 次迭代开 0.8 次方，慢慢放开。' }
      ]
    },
    {
      title: '奖励（二）：着地与抬脚',
      dur: 16,
      build: buildSceneRewardFoot,
      cues: [
        { at: 0.4, s: '接触—摆动奖励：该着地时罚脚的速度，该摆动时罚脚底的力；权重由 $C$ 和 $1 - C$ 分。' },
        { at: 3.6, s: '抬脚轨迹用五次多项式：起点、最高点、落点的速度和加速度都为 0。' },
        { at: 7.0, s: '$s(\\tau) = 10\\tau^3 - 15\\tau^4 + 6\\tau^5$；$\\bar\\phi = 0.6$ 时目标 $0.15 \\times 0.317 = 0.048$ m。' },
        { at: 10.4, s: '抬脚奖励 $-30 \\sum (1 - C)(l^{\\text{target}} - l^{\\text{foot}})^2$；前后步长由 $f$ 和 $v$ 决定。' },
        { at: 13.4, s: '官方代码：五次多项式那一项权重 0，生效的是三角形目标加 7 cm 的踝高。' }
      ]
    },
    {
      title: '对称损失',
      dur: 16,
      build: buildSceneMirror,
      cues: [
        { at: 0.4, s: 'H1 左右对称，但策略不知道：探索容易落进局部最优，动作不自然、一边好一边差。' },
        { at: 3.6, s: '镜像函数 $\\mathcal{F}$：左右关节对调，横滚、偏航取反，$v_y$、$\\omega$、$w$ 取反，两个时钟对调。' },
        { at: 7.0, s: '$\\mathcal{L}_{\\text{sym}} = \\sum_t \\lVert \\pi(o_t) - \\mathcal{F}_a(\\pi(\\mathcal{F}_o(o_t))) \\rVert^2$：对称的输入给对称的动作。' },
        { at: 10.4, s: '单脚跳也适用：左脚跳和右脚跳互为镜像。' },
        { at: 13.4, s: '总目标 $\\mathcal{L} = \\mathcal{L}_{\\text{AAC}} + \\beta\\mathcal{L}_{\\text{sym}}$，$\\beta = 0.5$。' }
      ]
    },
    {
      title: '干预训练',
      dur: 16,
      build: buildSceneIntervene,
      cues: [
        { at: 0.4, s: '干预标志 $I(t)$：0 时上身由策略自己摆，1 时上身关节被外部动作替换。' },
        { at: 3.6, s: '每一步以 $p = 0.005$ 翻转：同一种模式平均持续 $(1 - p)/p = 199$ 步，约 4 秒。' },
        { at: 7.0, s: '外部动作取均匀噪声：每 90 步换一个目标，前 2/3 线性插值、后 1/3 保持。' },
        { at: 10.4, s: '被接管时，上身的正则奖励不算，免得策略和外部控制器「抢」上身。' },
        { at: 13.4, s: '官方代码：每 30 步重抽、每步最多挪 0.2 rad；翻转函数写了没调用（我们读代码的结果）。' }
      ]
    },
    {
      title: '噪声课程与两组机器人',
      dur: 16,
      build: buildSceneCurriculum,
      cues: [
        { at: 0.4, s: '外部动作 = $\\alpha$ · 噪声 + $(1 - \\alpha)$ · 策略自己的动作；$\\alpha$ 从 0 往上加。' },
        { at: 3.6, s: '速度奖励都过阈值，$\\alpha$ 加 0.01；任一不到阈值的 2/3，减 0.01。图 5：噪声由小到大。' },
        { at: 7.0, s: '并行的机器人分两组：**敏捷组**学高速，**干预组**学被接管。' },
        { at: 10.4, s: '先走地形课程；最难的地形过了，敏捷组开始速度课程，干预组开始噪声课程。' },
        { at: 13.4, s: '$v_x$ 的范围从 ±0.6 放到 [−0.6, 2.0] m/s；一张 RTX 4090 训 16 小时。' }
      ]
    },
    {
      title: '单个命令跟得多准（表 III）',
      dur: 16,
      build: buildSceneTable3,
      cues: [
        { at: 0.4, s: '一次只扫一个命令，其余放默认值；误差是 L1 的回合平均。' },
        { at: 3.6, s: '走：$v_x$ 低速 0.030 m/s、高速 0.216；步频 0.028 Hz、抬脚 0.011 m。' },
        { at: 7.0, s: '论文说站、走最准，单脚跳误差最大；但表里单脚跳的低速 $v_x$、$v_y$ 比跳还小。' },
        { at: 10.4, s: '侧向不如前向（H1 的硬件）；调姿态比调脚难，策略更保守。' },
        { at: 13.4, s: '表 XI：同样的测法，HugWBC 七项都比 HOVER、ExBody 低——但这是让基线做它们不擅长的事。' }
      ]
    },
    {
      title: '命令能不能随便组合（图 8）',
      dur: 16,
      build: buildSceneOrtho,
      cues: [
        { at: 0.4, s: '两个命令一起扫，画误差热图；一个变了另一个照样跟得准，叫「正交」。' },
        { at: 3.6, s: '走：$v_x$、$\\omega$、$h$、$w$ 两两正交；$v_x$ 超过 1.5 m/s 后正交性下降。' },
        { at: 7.0, s: '步频是「离散的正交」：1.5、2 Hz 最好；$v_y$、$l$、$p$ 只在窄范围里正交。' },
        { at: 10.4, s: '站：身高降 0.3 m 时，髋俯仰几乎没有余量，身体俯仰就跟不准了。' },
        { at: 13.4, s: '跳的正交范围比走小，单脚跳几乎没有；官方代码采命令时就截掉冲突的组合。' }
      ]
    },
    {
      title: '干预训练的消融（表 IV）',
      dur: 16,
      build: buildSceneAblation,
      cues: [
        { at: 0.4, s: '三种训练：噪声课程（HugWBC）、AMASS 手臂动作、不干预；三种测试同样。' },
        { at: 3.6, s: '不干预训出来的：一被噪声接管，$v_x$ 误差 0.076 → 0.866 m/s；HugWBC 只 0.026 → 0.048。' },
        { at: 7.0, s: 'AMASS 训的：碰到 AMASS 还行（0.057），碰到噪声 0.170——动作库覆盖不到。' },
        { at: 10.4, s: '没干预时 HugWBC 的速度、脚也最准；只有姿态三项不如不干预的策略。' },
        { at: 13.4, s: '跳（表 X）：手臂被接管影响最大，跳要靠摆臂。' }
      ]
    },
    {
      title: '站着干活与抗推（表 V、图 6）',
      dur: 16,
      build: buildSceneStand,
      cues: [
        { at: 0.4, s: '站着调姿态时脚应该不动：表 V 量一回合（20 s）两只脚挪了多远。' },
        { at: 3.6, s: '噪声接管时：HugWBC 0.02–0.09 m；AMASS 训的 2.1–3.3 m；不干预的 17.5–25.7 m。' },
        { at: 7.0, s: '图 6：站立时在 8 个方向上加力，存活率超过 98% 算扛住；左是持续的力，右是推一秒。' },
        { at: 10.4, s: '大多数方向上 HugWBC 扛得更多（读图：0° 持续力约 600 对 510 N）。' },
        { at: 13.4, s: '论文的解释：干预让上身一直在晃，机器人学会了用腿稳住；同一节还提到，真机上脚落地时更用力。' }
      ]
    },
    {
      title: '真机（表 VI）',
      dur: 16,
      build: buildSceneReal,
      cues: [
        { at: 0.4, s: '直接部署到 Unitree H1：站着调身高、俯仰、腰，原地改步频。' },
        { at: 3.6, s: '表 VI：真机俯仰误差 0.067–0.101 rad、腰 0.055–0.072 rad，比仿真略大。' },
        { at: 7.0, s: '跳与单脚跳也上了真机；表 VI 里，跳的两项误差是三种步态里最小的。' },
        { at: 10.4, s: '移动操作：外部控制上身搬箱子，下身照样蹲下、弯腰、走过去（2 倍速）。' },
        { at: 13.4, s: '走出实验室：在校园、商业街和草地上，走、跑、跳、单脚跳来回切换。' }
      ]
    },
    {
      title: '局限与代码',
      dur: 16,
      build: buildSceneLimits,
      cues: [
        { at: 0.4, s: '局限（我们整理的）：单脚跳单独一个策略、只跟 4 个命令、没做干预训练；只在 H1 上做。' },
        { at: 3.6, s: '命令会打架：高速、低身高、高步频时，有的组合做不到；上层要避开（我们的理解）。' },
        { at: 7.0, s: '官方代码（2025-06）：Isaac Gym + legged_gym，`--task=h1int`；只有走、跳、站。' },
        { at: 10.4, s: '代码与论文有几处出入：站立的相位、抬脚目标、估计器、干预的重抽与切换（我们读代码的结果）。' },
        { at: 13.4, s: '论文里对不上的几处：表 I 少了负号、表 V 的单位、表 X 的重复，以及正文与表 III、表 VI 不一致的两句。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十六幕动画：HugWBC 全流程速览',
      sub: '约 256 秒自动播放。空格播放/暂停，← → 换幕；H1 是按命令和论文的目标轨迹摆出的运动学示意（不是策略的输出），表格与图来自论文，真机片段剪自项目页的视频。',
      ariaLabel: 'HugWBC 十六幕讲解动画',
      notes: [
        '取数依据：表 I–XI、图 3–6、图 8 照抄 arXiv 2502.03206 v3；图 6 的力是读图近似值。代码里的数（σ = 0.05、命令 11 维 + 两个时钟、critic 321 维、估计器只估线速度、干预的重抽与切换、正则课程、命令截断）读自 apexrl/HugWBC。',
        'H1 的 3D 外形：材质与光照照抄 Robot Retarget Online（ImChong/Robot_Retarget_Online）的 three.js 场景，用 MuJoCo Menagerie 的 `unitree_h1` 做正运动学、正交相机离线渲染成贴图。姿态是**我们写的运动学示意**：两只脚按论文的相位与式 (8) 的五次多项式抬脚，腿用两连杆逆运动学，手臂的干预目标按论文的插值、噪声按代码的关节范围抽——不是 HugWBC 策略在仿真里的结果。',
        '真机片段剪自项目页 hugwbc.github.io 的视频（户外走跑、侧向跳、单脚跳、跳着张开 / 交叉手臂、噪声接管上身、站着调姿态与步频、搬箱子、草地），只做讲解引用；姿态片段下面的命令名按项目页字幕换掉的时刻标。'
      ],
      scenes: HUGWBC_SCENES
    });
  }

  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：HugWBC 十六幕全流程',
      sub: '18 分 30 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十六幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '20.2 MB',
      fileName: 'HugWBC_讲解视频.mp4'
    });
  }

  /* ── 交互演示 1：步态实验台 ── */
  function buildGaitDemo(host) {
    var root = card(host, {
      title: '步态实验台：相位 → 时钟 → 期望接地概率 → 抬脚目标',
      sub: '选一种步态、调步频 $f$、抬脚高度 $l$ 和 $\\sigma$：上图是两只脚 2 秒里的期望接地概率 $C$（实线）和时钟（虚线），下图是摆动脚的目标高度（论文的五次多项式与代码里的三角形）；右边的 H1 是按相位摆的运动学示意。'
    });
    var state = { gait: 'walk', f: 2, l: 0.15, sigma: SIGMA, st: 0.5, t: 0.3 };
    var row = controlsRow(root);
    buttonGroup(row, { label: '步态', items: [{ label: '走 ψ = 0.5', value: 'walk' }, { label: '跳 ψ = 0', value: 'jump' }, { label: '站 φ = 0.25', value: 'stand' }, { label: '单脚跳', value: 'hop' }], value: 'walk', onPick: function (v) { state.gait = v; render(); } });
    var row2 = controlsRow(root);
    slider(row2, { label: '步频 $f$（Hz）', min: 1.5, max: 3.5, step: 0.1, value: 2, format: function (v) { return fmt(v, 1); }, onInput: function (v) { state.f = v; render(); } });
    slider(row2, { label: '抬脚 $l$（m）', min: 0.1, max: 0.35, step: 0.01, value: 0.15, format: function (v) { return fmt(v, 2); }, onInput: function (v) { state.l = v; render(); } });
    slider(row2, { label: '$\\sigma$（代码 0.05）', min: 0.01, max: 0.15, step: 0.01, value: SIGMA, format: function (v) { return fmt(v, 2); }, onInput: function (v) { state.sigma = v; render(); } });
    var row3 = controlsRow(root);
    slider(row3, { label: '看第几秒', min: 0, max: 2, step: 0.02, value: 0.3, format: function (v) { return fmt(v, 2) + ' s'; }, onInput: function (v) { state.t = v; render(); } });
    slider(row3, { label: '$\\phi_{\\text{stance}}$（论文固定 0.5）', min: 0.3, max: 0.7, step: 0.05, value: 0.5, format: function (v) { return fmt(v, 2); }, onInput: function (v) { state.st = v; render(); } });
    var wrap = el('div', 'demo-stage');
    var svg = sceneSvg('一台 H1 按两只脚的相位摆出姿态（运动学示意），旁边是论文图 4 那样的相位环', '0 0 640 300');
    wrap.appendChild(svg);
    root.appendChild(wrap);
    var bot = toyBot(svg), rings = phaseRings(svg, 470, 120, 44, 64, { band: 11, dot: 6 });
    var ground = groundTicks(svg, 20, 330);
    var botTag = label(svg, 20, 24, '', 'demo-x-mut', 11);
    var st1 = stage(root, 210), st2 = stage(root, 170);
    var stats = statsRow(root);
    var sPh = stats.add('两脚相位 φ'), sC = stats.add('期望接地 C'), sCl = stats.add('时钟 Cl'), sL = stats.add('目标抬脚');
    note(root, ['$C$、时钟、五次多项式都照论文式 (2)–(4)、(8) 现算；代码里的三角形目标是 `feet_clearance_cmd_linear`（踝关节离地，多 0.07 m）。左边的 H1 是我们按相位摆的运动学示意，抬脚高度只做了 $l = 0.15$ 与 $0.35$ 两套贴图（拖动 $l$ 时就近换），$\\phi_{\\text{stance}}$ 不是 0.5 时贴图照 0.5 画。',
      '站：两只脚相位都固定在 0.25（论文）；单脚跳：抬起的右脚固定在 0.75。官方代码的站立是把相位置 0，见第 4 幕。']);
    function phasesAt(t) {
      var phi1 = (state.f * t) % 1;
      return gaitPhases(state.gait, phi1);
    }
    function render() {
      var cam = camOf('walk', 120, 160, 280), ph = phasesAt(state.t);
      var key = state.gait === 'walk' ? (state.l > 0.25 ? 'walk_hi' : 'walk') : GAIT_SHEET[state.gait];
      var fr = state.gait === 'stand' ? 0 : Math.floor(ph[0] * 20);
      ground.put(cam, state.gait === 'walk' ? state.t * 0.6 : 0);
      bot.put(key, cam, fr);
      botTag.textContent = '运动学示意 · ' + GAIT_ZH[state.gait];
      rings.set(ph[0], ph[1]);
      var pb = ph.map(function (p) { return barPhi(p, state.st); });
      var Cv = pb.map(function (b) { return contactProb(b, state.sigma); });
      sPh.set(f2(ph[0]) + ' / ' + f2(ph[1]), 'accent');
      sC.set(f3(Cv[0]) + ' / ' + f3(Cv[1]));
      sCl.set(sgn(f2(clockOf(pb[0]))) + ' / ' + sgn(f2(clockOf(pb[1]))));
      sL.set(f3(swingTarget(pb[0], state.l)) + ' / ' + f3(swingTarget(pb[1], state.l)) + ' m', 'good');
      var g = begin(st1), ctx = g.ctx, P = g.P, p = plot(g, { l: 46, r: 16, t: 14, b: 30 }, [0, 2], [-1.15, 1.15]);
      axes(g, p, { xTicks: [0, 0.5, 1, 1.5, 2], yTicks: [-1, 0, 1], xLabel: '时间 s', yFmt: function (v) { return String(v); } });
      [[0, P.purple], [1, P.good]].forEach(function (lc) {
        var cpts = [], kpts = [];
        for (var i = 0; i <= 400; i++) {
          var tt = 2 * i / 400, b = barPhi(phasesAt(tt)[lc[0]], state.st);
          cpts.push([p.sx(tt), p.sy(contactProb(b, state.sigma))]); kpts.push([p.sx(tt), p.sy(clockOf(b))]);
        }
        line(ctx, cpts, lc[1], 2.4); line(ctx, kpts, lc[1], 1.4, [5, 4]);
      });
      line(ctx, [[p.sx(state.t), p.y0], [p.sx(state.t), p.y1]], P.muted, 1, [3, 3]);
      text(ctx, '实线 C（接地概率），虚线 时钟；紫 = 左脚，绿 = 右脚', p.x0 + 4, p.y1 + 4, P.muted, 'left');
      var g2 = begin(st2), c2 = g2.ctx, q = plot(g2, { l: 46, r: 16, t: 14, b: 30 }, [0, 2], [0, 0.45]);
      axes(g2, q, { xTicks: [0, 0.5, 1, 1.5, 2], yTicks: [0, 0.1, 0.2, 0.3, 0.4], xLabel: '时间 s', yFmt: function (v) { return fmt(v, 1); } });
      [[0, g2.P.purple]].forEach(function (lc) {
        var a = [], b2 = [];
        for (var i = 0; i <= 400; i++) {
          var tt = 2 * i / 400, ph2 = phasesAt(tt), bb = barPhi(ph2[lc[0]], state.st);
          a.push([q.sx(tt), q.sy(swingTarget(bb, state.l))]);
          b2.push([q.sx(tt), q.sy(codeLinearTarget(bb, state.l))]);
        }
        line(c2, a, lc[1], 2.4); line(c2, b2, g2.P.bad, 1.6, [6, 3]);
      });
      line(c2, [[q.sx(state.t), q.y0], [q.sx(state.t), q.y1]], g2.P.muted, 1, [3, 3]);
      text(c2, '左脚：实线 论文的五次多项式（离地），红虚线 代码的三角形（踝关节离地）', q.x0 + 4, q.y1 + 4, g2.P.muted, 'left');
    }
    registerRenderer(render);
    render();
  }

  /* ── 交互演示 2：干预实验台 ── */
  function buildInterveneDemo(host) {
    var root = card(host, {
      title: '干预实验台：什么时候被接管、手臂往哪去',
      sub: '上图：$I(t)$ 在 60 秒里的样子（每一步以概率 $p$ 翻转，50 Hz）；下图：一个手臂关节（左肩俯仰）的外部目标——论文的做法是每隔一段抽一个均匀噪声，前 2/3 线性插值过去；再乘上噪声课程的 $\\alpha$ 和策略自己的动作混合。'
    });
    var state = { p: P_SWITCH, alpha: 1, interval: T_INTERVAL, seed: 3 };
    var row = controlsRow(root);
    slider(row, { label: '翻转概率 $p$', min: 0.001, max: 0.02, step: 0.001, value: P_SWITCH, format: function (v) { return fmt(v, 3); }, onInput: function (v) { state.p = v; render(); } });
    slider(row, { label: '噪声课程 $\\alpha$', min: 0, max: 1, step: 0.05, value: 1, format: function (v) { return fmt(v, 2); }, onInput: function (v) { state.alpha = v; render(); } });
    slider(row, { label: '重抽间隔（步）', min: 30, max: 150, step: 10, value: T_INTERVAL, format: function (v) { return v + ' 步 = ' + fmt(v * DT, 1) + ' s'; }, onInput: function (v) { state.interval = v; render(); } });
    var row2 = controlsRow(root);
    buttonGroup(row2, { label: '', items: [{ label: '换一组随机数', value: 'again' }], value: null, onPick: function () { state.seed += 1; render(); } });
    var st1 = stage(root, 120), st2 = stage(root, 200);
    var stats = statsRow(root);
    var sRun = stats.add('理论平均段长'), sObs = stats.add('这次的平均段长'), sFrac = stats.add('被接管的时间');
    note(root, ['段长的期望 $(1-p)/p$：$p = 0.005$ 时 199 步、约 4 s。「这次的平均段长」是这 60 秒里实际抽到的，段数少时会偏离理论值。',
      '下图的灰线是假想的「策略自己的动作」（一段慢摆），黄线是噪声目标按论文插值的轨迹，实线是混合后真正执行的 $\\alpha a^{\\text{noise}} + (1-\\alpha)a$。噪声范围照官方代码：左肩俯仰在 [−2.6, 2.6] rad 里均匀抽。官方代码其实不插值，而是每步最多朝目标挪 0.2 rad，这里没画。']);
    function render() {
      var N = 3000, rng = K.mulberry32(state.seed * 7919 + 11), I = [], s = 0, runs = [], cur = 1;
      for (var i = 0; i < N; i++) { if (rng() < state.p) { s = 1 - s; runs.push(cur); cur = 1; } else cur++; I.push(s); }
      runs.push(cur);
      var g = begin(st1), ctx = g.ctx, P = g.P, x0 = 46, x1 = g.w - 16;
      for (var j = 0; j < N; j++) {
        if (j === 0 || I[j] !== I[j - 1]) {
          var k = j; while (k < N && I[k] === I[j]) k++;
          ctx.fillStyle = I[j] ? P.warn : P.accent; ctx.globalAlpha = I[j] ? 0.85 : 0.3;
          ctx.fillRect(x0 + (x1 - x0) * j / N, 34, (x1 - x0) * (k - j) / N, 40);
        }
      }
      ctx.globalAlpha = 1;
      text(ctx, '黄 = 被接管（I = 1），蓝 = 策略自己控制', x0, 18, P.muted, 'left');
      [0, 10, 20, 30, 40, 50, 60].forEach(function (sec) { text(ctx, sec + ' s', x0 + (x1 - x0) * sec / 60, 92, P.muted, 'center', '11px monospace'); });
      var mean = runs.reduce(function (a, b) { return a + b; }, 0) / runs.length;
      sRun.set(fmt(runLength(state.p), 0) + ' 步 ≈ ' + fmt(runLength(state.p) * DT, 1) + ' s', 'accent');
      sObs.set(fmt(mean, 0) + ' 步（' + runs.length + ' 段）');
      sFrac.set(fmt(100 * I.reduce(function (a, b) { return a + b; }, 0) / N, 0) + '%');
      /* 一个关节：10 秒 */
      var M = 500, rng2 = K.mulberry32(state.seed * 104729 + 5), lo = -2.6, sc2 = 5.2;
      var init = 0, targ = lo + sc2 * rng2(), t0 = 0, noise = [], pol = [], mix = [], targs = [];
      for (var m2 = 0; m2 < M; m2++) {
        if (m2 - t0 >= state.interval) { init = noise[m2 - 1]; targ = lo + sc2 * rng2(); t0 = m2; }
        var r = Math.min(1, 1.5 * (m2 - t0) / state.interval);
        var a = (1 - r) * init + r * targ;
        noise.push(a); targs.push(targ);
        var pa = 0.35 * Math.sin(2 * Math.PI * m2 * DT * 1.0);
        pol.push(pa); mix.push(state.alpha * a + (1 - state.alpha) * pa);
      }
      var g2 = begin(st2), c2 = g2.ctx, q = plot(g2, { l: 46, r: 16, t: 16, b: 30 }, [0, M * DT], [-2.8, 2.8]);
      axes(g2, q, { xTicks: [0, 2, 4, 6, 8, 10], yTicks: [-2, -1, 0, 1, 2], xLabel: '时间 s', yLabel: 'rad', yFmt: function (v) { return String(v); } });
      function L(arr) { return arr.map(function (v, i) { return [q.sx(i * DT), q.sy(v)]; }); }
      line(c2, L(pol), g2.P.muted, 1.4);
      line(c2, L(targs), g2.P.warn, 1, [2, 4]);
      line(c2, L(noise), g2.P.warn, 1.8, [6, 3]);
      line(c2, L(mix), g2.P.accent, 2.4);
    }
    registerRenderer(render);
    render();
  }

  /* ── 交互演示 3：表格 ── */
  function buildTablesDemo(host) {
    var root = card(host, {
      title: '表 III / XI、表 IV / X、表 V、表 VI',
      sub: '选一张表：单个命令的跟踪误差（含和 HOVER、ExBody 的比较）、三种干预训练在三种测试下的误差（走 / 站 / 跳）、站着时脚挪了多远、真机的两项误差。粗体是这一列最好的。'
    });
    var state = { view: 't3', gait: 'walk', col: 0 };
    var row = controlsRow(root), row2 = controlsRow(root);
    function sub() {
      row2.innerHTML = '';
      if (state.view === 't4') {
        buttonGroup(row2, { label: '步态', items: [{ label: '走（表 IV）', value: 'walk' }, { label: '站（表 X）', value: 'stand' }, { label: '跳（表 X）', value: 'jump' }], value: state.gait, onPick: function (v) { state.gait = v; render(); } });
      }
    }
    buttonGroup(row, { label: '哪张表', items: [{ label: '表 III 单个命令', value: 't3' }, { label: '表 XI 对 HOVER / ExBody', value: 't11' }, { label: '表 IV / X 干预消融', value: 't4' }, { label: '表 V 脚挪多远', value: 't5' }, { label: '表 VI 真机', value: 't6' }], value: 't3', onPick: function (v) { state.view = v; sub(); render(); } });
    sub();
    var verdict = verdictBox(root);
    var tb = table(root);
    note(root, ['单位：速度 m/s，角速度 rad/s，步频 Hz，抬脚 / 身高 m，俯仰 / 腰 rad；表 V 的表头写 m/s，按图注读成一回合里的位移（m）。',
      '表 X 里「不干预」策略在噪声、AMASS 测试下的身高 / 俯仰 / 腰三项，站立和跳两组几乎一样（0.1931 / 0.4051 / 0.2283），像是复制时串了行，照原表列出。']);
    function best(vals) { var m = Infinity; vals.forEach(function (v) { if (v != null && v < m) m = v; }); return m; }
    function cell(v, b, dg) { var s0 = v == null ? '–' : v.toFixed(dg); return v != null && v === b ? '**' + s0 + '**' : s0; }
    function render() {
      tb.clear();
      if (state.view === 't3') {
        tb.row(['步态'].concat(T3_COLS), true);
        var bests = T3_COLS.map(function (c, j) { return best(TABLE3.map(function (r) { return r.v[j]; })); });
        TABLE3.forEach(function (r) { tb.row([r.zh].concat(r.v.map(function (v, j) { return cell(v, bests[j], 3); }))); });
        verdict.set('走路的 9 项里，$v_x$ 高速（0.216 m/s）和身高（0.064 m）误差最大；跳的高速 $v_x$ 是 0.532 m/s，单脚跳只测了 4 项。', 'warn');
      } else if (state.view === 't11') {
        tb.row(['方法'].concat(T11_COLS), true);
        var b11 = T11_COLS.map(function (c, j) { return best(TABLE11.map(function (r) { return r.v[j]; })); });
        TABLE11.forEach(function (r) { tb.row([r.zh].concat(r.v.map(function (v, j) { return cell(v, b11[j], 3); }))); });
        verdict.set('HugWBC 七项都最低；论文说明这是让 HOVER、ExBody 做它们不是为之设计的事（上身放在默认姿态当参考）。', 'good');
      } else if (state.view === 't4') {
        var d = TABLE4[state.gait];
        tb.row(['训练', '测试'].concat(T4_COLS), true);
        var bc = T4_COLS.map(function (c, j) { var vs = []; d.forEach(function (rw) { rw.forEach(function (v) { vs.push(v[j]); }); }); return best(vs); });
        d.forEach(function (rw, i) { rw.forEach(function (v, k) { tb.row([k === 0 ? STRATS[i] : '', TESTS[k]].concat(v.map(function (x, j) { return cell(x, bc[j], 4); }))); }); });
        var a = d[2][0], b = d[0][0];
        verdict.set(state.gait === 'stand' ? '站立：被噪声接管时，不干预训的策略俯仰误差 0.405 rad，HugWBC 0.066。' :
          '被噪声接管时 $v_x$ 误差：不干预训的 ' + a[0] + '，HugWBC ' + b[0] + '。', 'good');
      } else if (state.view === 't5') {
        tb.row(['训练', '测试', '$D_h$', '$D_p$', '$D_w$'], true);
        TABLE5.forEach(function (rw, i) { rw.forEach(function (v, k) { tb.row([k === 0 ? STRATS[i] : '', TESTS[k]].concat(v.map(function (x) { return x.toFixed(4); }))); }); });
        verdict.set('噪声接管时：HugWBC 两只脚一共只挪了 0.02–0.09 m，AMASS 训的 2.1–3.3 m，不干预训的 17.5–25.7 m。', 'good');
      } else {
        tb.row(['步态', '$E_p$（rad）', '$E_w$（rad）'], true);
        TABLE6.forEach(function (r) { tb.row([r.zh, r.p[0] + ' ± ' + r.p[1], r.w[0] + ' ± ' + r.w[1]]); });
        verdict.set('真机上跳的两项误差都最小；走的俯仰误差最大（0.1006 rad）。论文说腰比俯仰准，但站立时腰 0.0718 略大于俯仰 0.0712。', 'warn');
      }
    }
    render();
  }

  K.mount({
    'hugwbc-explainer': buildExplainerDemo,
    'hugwbc-video': buildVideoDemo,
    'hugwbc-gait': buildGaitDemo,
    'hugwbc-intervene': buildInterveneDemo,
    'hugwbc-tables': buildTablesDemo
  });
})();
