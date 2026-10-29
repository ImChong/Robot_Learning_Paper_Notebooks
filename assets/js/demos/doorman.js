/* Interactive DoorMan demos for
 * papers/04_Loco-Manipulation_and_WBC/Opening_the_Sim-to-Real_Door_for_Humanoid_Pixel-to-Action_Policy_Transfer
 * （Xue, He, Wang, Ben, Xiao, Luo, Da, Castañeda, Shi, Sastry, Fan, Zhu · Opening the Sim-to-Real Door for Humanoid
 *   Pixel-to-Action Policy Transfer · arXiv 2512.01061 v1，CVPR 2026；代码 NVlabs/GR00T-VisualSim2Real 的 doorman 分支）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["doorman"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   doorman-explainer — 十七幕讲解动画：开门：人形的硬骨头 → 三个阶段（图 2）→ 站在 HOMIE 上：输出 19 维 → 特权教师看什么 →
 *                       六个阶段，各有奖励 → 卡在「抓门把」→ 分阶段重置（图 3）→ 图 6 右：缓冲区多大 → 学生只看 RGB：DAgger →
 *                       部分可观与 GRPO → 图 6 左：学生追上教师 → 程序化生成的门 → 视觉随机化 → 表 1：拿掉哪种随机化 →
 *                       真机：比遥操作快（图 5）→ 泛化与失败 → 局限与代码
 *   doorman-video     — 同一套十七幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   doorman-stages    — 六个阶段：每个阶段生效的奖励项与进阶条件；分阶段重置让各阶段多拿到多少样本（玩具链）
 *   doorman-grpo      — GRPO 组内优势计算器：一组 G 条回合只记成功 / 失败；对照图 6 左的三条训练曲线
 *   doorman-results   — 图 5、表 1、图 6 右的数字浏览器
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
  /* 论文的图（arXiv 2512.01061 的题图、图 1–4）与项目页视频的片段放在 assets/img/papers/doorman/；
     第 3 幕的 G1 走路贴图借用第 032 期 HOMIE 的复现（assets/img/papers/homie/g1_3d/g1_walk.webp） */
  var IMG_BASE = assetBase('../../img/papers/');
  var PAPER_IMG_BASE = IMG_BASE ? IMG_BASE + 'doorman/' : '';
  var CLIP_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'clips/' : '';
  var HOMIE_3D_BASE = IMG_BASE ? IMG_BASE + 'homie/g1_3d/' : '';
  var DM_3D_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'g1_3d/' : '';
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
    text = K.text,
    registerRenderer = K.registerRenderer;

  // ─── 论文里的数字（arXiv 2512.01061 v1：图 5、表 1、图 6，附录表 2–3） ───────────────────────────
  /* 图 5：真机，所有门的平均；成功率 %、平均用时 s */
  var FIG5 = [
    { key: 'doorman', zh: 'DoorMan', succ: 83, time: 15.40 },
    { key: 'expert', zh: '专家遥操作', succ: 80, time: 20.02 },
    { key: 'novice', zh: '新手遥操作', succ: 60, time: 22.55 }
  ];
  /* 表 1：视觉随机化消融，仿真里每种设置 120 次没见过外观的门；成功率 %：推门（转把手）、拉门（转把手）、推杠门 */
  var DOORS = ['推门（转把手）', '拉门（转把手）', '推杠门'];
  var TABLE1 = [
    { n: 1, zh: '不随机', dl: false, v: [10.8, 5.0, 20.0] },
    { n: 2, zh: '纯色随机', dl: true, v: [67.5, 65.8, 70.0] },
    { n: 3, zh: '+ 10% 纹理', dl: false, v: [58.3, 50.8, 76.7] },
    { n: 4, zh: '+ 10% 纹理', dl: true, v: [79.2, 77.5, 77.5] },
    { n: 5, zh: '+ 100% 纹理', dl: false, v: [73.3, 55.8, 76.7] },
    { n: 6, zh: '+ 100% 纹理', dl: true, v: [85.8, 80.8, 85.0] }
  ];
  /* 图 6 左（矢量图里抽出来的折线，按网格线标定，读图近似值）：GRPO 自举的成功率，每 4 次迭代一个点；虚线是教师 */
  var GRPO_IT = 4;
  var FIG6L = [
    { key: 'push', zh: '推门（转把手）', teacher: 0.861, v: [0.676, 0.641, 0.653, 0.661, 0.657, 0.655, 0.679, 0.687, 0.697, 0.712, 0.727, 0.723, 0.742, 0.745, 0.747, 0.755, 0.764, 0.763, 0.782, 0.802, 0.815, 0.815, 0.82, 0.818, 0.815, 0.81, 0.821, 0.828, 0.829, 0.833, 0.839, 0.842, 0.845, 0.843, 0.849, 0.848, 0.846, 0.836, 0.846, 0.842, 0.848, 0.846, 0.852, 0.842, 0.847, 0.847, 0.855, 0.853, 0.861, 0.859, 0.86] },
    { key: 'pull', zh: '拉门（转把手）', teacher: 0.815, v: [0.573, 0.55, 0.551, 0.55, 0.555, 0.569, 0.586, 0.611, 0.63, 0.652, 0.668, 0.681, 0.688, 0.7, 0.697, 0.704, 0.712, 0.717, 0.717, 0.731, 0.731, 0.726, 0.731, 0.74, 0.746, 0.742, 0.755, 0.762, 0.768, 0.773, 0.78, 0.781, 0.769, 0.771, 0.769, 0.775, 0.771, 0.781, 0.778, 0.782, 0.788, 0.8, 0.81, 0.812, 0.808, 0.804, 0.808, 0.801, 0.808, 0.813, 0.815] },
    { key: 'bar', zh: '推杠门', teacher: 0.877, v: [0.487, 0.538, 0.594, 0.612, 0.626, 0.647, 0.688, 0.698, 0.717, 0.748, 0.762, 0.779, 0.794, 0.809, 0.81, 0.82, 0.82, 0.824, 0.826, 0.831, 0.841, 0.841, 0.849, 0.85, 0.846, 0.849, 0.856, 0.86, 0.865, 0.869, 0.866, 0.862, 0.86, 0.853, 0.861, 0.861, 0.857, 0.863, 0.873, 0.856, 0.855, 0.861, 0.854, 0.849, 0.858, 0.861, 0.861, 0.869, 0.871, 0.873, 0.873] }
  ];
  /* 图 6 右（同上，读图近似值）：平均能到达的最远阶段（0–5），每 50 次迭代一个点，到第 3800 次 */
  var STAGE_IT = 50;
  var FIG6R = [
    { key: 'b100', zh: '缓冲区 100', v: [0.001, 0.125, 0.64, 1.044, 1.566, 1.771, 2.262, 2.633, 2.871, 3.197, 3.668, 3.723, 3.744, 3.747, 3.75, 3.757, 3.764, 3.772, 3.782, 3.788, 3.792, 3.775, 3.787, 3.796, 3.798, 3.794, 3.8, 3.79, 3.794, 3.792, 3.778, 3.816, 4.097, 4.38, 4.447, 4.44, 4.476, 4.477, 4.507, 4.516, 4.522, 4.541, 4.542, 4.559, 4.579, 4.591, 4.607, 4.601, 4.614, 4.613, 4.605, 4.606, 4.62, 4.62, 4.611, 4.602, 4.607, 4.624, 4.643, 4.644, 4.642, 4.644, 4.653, 4.644, 4.645, 4.654, 4.655, 4.668, 4.683, 4.662, 4.637, 4.664, 4.682, 4.704, 4.701, 4.705, 4.723] },
    { key: 'b10', zh: '缓冲区 10', v: [0.001, 0.109, 0.124, 0.126, 0.312, 0.659, 0.862, 0.899, 0.927, 0.934, 0.934, 0.932, 0.936, 0.937, 0.937, 0.937, 0.937, 0.937, 0.937, 0.936, 0.935, 0.934, 0.933, 0.932, 0.934, 0.94, 0.936, 0.938, 0.942, 0.963, 1.02, 1.083, 1.12, 1.149, 1.186, 1.268, 1.375, 1.475, 1.573, 1.63, 1.715, 1.777, 1.825, 1.962, 2.279, 2.454, 2.59, 2.685, 2.724, 2.739, 2.756, 2.771, 2.806, 2.878, 3.163, 3.515, 3.584, 3.647, 3.653, 3.644, 3.654, 3.672, 3.683, 3.688, 3.696, 3.699, 3.709, 3.74, 3.784, 3.825, 3.86, 3.902, 3.908, 3.924, 3.908, 3.917, 3.909] },
    { key: 'b0', zh: '不用缓冲区', v: [0.0, 0.126, 0.146, 0.221, 0.673, 0.863, 0.93, 0.935, 0.937, 0.939, 0.938, 0.941, 0.939, 0.939, 0.939, 0.939, 0.941, 0.943, 0.944, 0.943, 0.944, 0.947, 0.95, 0.951, 0.952, 0.953, 0.956, 0.96, 0.969, 0.973, 0.982, 0.997, 1.009, 1.02, 1.033, 1.046, 1.056, 1.067, 1.074, 1.079, 1.093, 1.1, 1.104, 1.118, 1.126, 1.131, 1.142, 1.152, 1.168, 1.172, 1.179, 1.188, 1.188, 1.187, 1.183, 1.191, 1.196, 1.2, 1.197, 1.199, 1.199, 1.201, 1.207, 1.211, 1.216, 1.217, 1.221, 1.225, 1.22, 1.222, 1.223, 1.223, 1.226, 1.225, 1.234, 1.24, 1.247] }
  ];
  function at50(series, it) { return series.v[Math.round(it / STAGE_IT)]; }

  /* 六个阶段（附录 A）与各阶段生效的奖励（附录表 2，权重；代码 reward_door_open_homie.yaml 一致）。
     time：代码 max_stage_time（步，50 Hz）；cond：代码里进到下一阶段的条件 */
  var STAGES = [
    { zh: '走到门前', short: '走近', time: 250, cond: '根部离抓取点水平距离 < 0.3 m，手臂每个关节离静息姿态 < 0.25 rad',
      rew: [['朝门走的速度', 5.0], ['手指张开', 1.5], ['手臂别乱动', -1.0], ['面朝门', -1.0]] },
    { zh: '预抓', short: '预抓', time: 100, cond: '手掌高过把手 5 cm、离预抓点 < 0.1 m、手指接近张开、朝向奖励 > 0.2、速度命令 ≤ 0.1；或门已开过 10°',
      rew: [['手到预抓点', 6.0], ['手对着门把的朝向', 3.0], ['手指张开', 1.5], ['抓握的力', 0.2], ['另一只手别动', -1.0], ['面朝门', -1.0], ['站稳别走', -15.0]] },
    { zh: '抓住', short: '抓住', time: 100, cond: '手上 ≥ 4 个刚体对门把的接触力 > 1 N；或门已开过 10°',
      rew: [['手指握拢', 3.0], ['手到抓取点', 3.0], ['手对着门把的朝向', 3.0], ['抓握的力', 0.2], ['另一只手别动', -1.0], ['面朝门', -1.0], ['站稳别走', -15.0]] },
    { zh: '压门把开门', short: '开门', time: 100, cond: '门轴转过 10°（0.1745 rad）',
      rew: [['门把转动', 6.0], ['门轴转动', 6.0], ['往前推的力', 0.3], ['手指握拢', 3.0], ['手到抓取点', 3.0], ['手对着门把的朝向', 3.0], ['抓握的力', 0.2], ['另一只手别动', -1.0], ['站稳别走', -15.0]] },
    { zh: '推开', short: '推开', time: 100, cond: '根部越过门的平面、门开到 60° 以上、门把回到 0.2 rad 以内',
      rew: [['根部往目标走', 12.0], ['门轴转动', 6.0], ['别再压门把', 3.0], ['手指握拢', 3.0], ['手到抓取点', 3.0], ['手对着门把的朝向', 3.0], ['抓握的力', 0.2], ['另一只手别动', -1.0], ['站着不动', -1.0]] },
    { zh: '穿过去', short: '穿门', time: 200, cond: '根部越过门 1.5 m → 完成',
      rew: [['根部往目标走', 12.0], ['别再压门把', 3.0], ['手指张开', 1.5], ['手臂别乱动', -1.0], ['面朝门', -1.0]] }
  ];
  /* 全程生效（附录表 2 的「终止 / 通用惩罚」与「全程奖励」） */
  var ALWAYS = [['终止', -1000], ['完成', 4.0], ['阶段奖励', 1.0], ['省下的时间', 0.5], ['动作变化率', -0.01], ['关节限位', -5.0], ['躯干直立', -1.0], ['碰门框 / 门板', -0.1]];
  var REWARD_TERMS = 30; // 附录表 2：13 + 3 + 5 + 3 + 3 + 3 + 3
  /* 代码：分阶段重置的起步比例（staged_reset_ratios），每个环境每个阶段存 200 个快照 */
  var RESET_RATIOS = [0.5, 0.1, 0.1, 0.1, 0.1, 0.1];
  var SNAP_PER_STAGE = 200;
  /* 「🚶 具体实例」例 6 的玩具链：相邻两阶段之间的通过率，「抓门把 → 转把手」那座桥只有 5% */
  var TOY_P = [0.9, 0.8, 0.05, 0.6, 0.7];
  function toyVisits(alpha, P) {
    var v = [];
    for (var k = 0; k < 6; k++) {
      var tot = 0;
      for (var y = 0; y <= k; y++) {
        var p = alpha[y];
        for (var j = y; j < k; j++) p *= P[j];
        tot += p;
      }
      v.push(tot);
    }
    return v;
  }
  /* 有快照的阶段才参与抽样，剩下的按比例重新归一化（代码 _sample_reset_stages） */
  function resetProbs(filled) {
    var s = 0, out = [];
    RESET_RATIOS.forEach(function (r, i) { if (filled[i]) s += r; });
    RESET_RATIOS.forEach(function (r, i) { out.push(filled[i] ? r / s : 0); });
    return out;
  }
  /* 「🚶 具体实例」例 7：一组 8 条回合 */
  var EX_GROUP = [1, 1, 0, 1, 0, 1, 1, 0];
  function grpoAdv(R) {
    var n = R.length, m = 0, v = 0;
    R.forEach(function (r) { m += r / n; });
    R.forEach(function (r) { v += (r - m) * (r - m) / n; });
    var sd = Math.sqrt(v);
    return { mean: m, std: sd, adv: R.map(function (r) { return sd > 0 ? (r - m) / sd : 0; }) };
  }
  /* 「🚶 具体实例」例 4：阶段 3 的一步（门把 0.4 rad、0.3 rad/s；门轴 0.05 rad、0.02 rad/s；推力 8 N） */
  function openStepReward(th, thd, hh, hhd, fx) {
    var handle = clamp(thd + clamp(th, 0, 0.785398) / 0.785398, -1, 1);
    var hinge = clamp(10 * hhd + clamp(hh, 0, 1.5708) / 1.5708, -1, 1);
    var force = clamp(fx, 0, 20);
    return { handle: handle, hinge: hinge, force: force, sum: 6 * handle + 6 * hinge + 0.3 * force };
  }
  /* 动作 19 维：HOMIE 速度命令 3、两臂 14、手指原语 2；增量累加 c ← clip(c + 0.3 a, −15, 15) */
  var ACT = { homie: 3, arm: 14, finger: 2, scale: 0.3, clip: 15, cmdScale: 0.25 };
  /* 教师 246 维的拼法（代码 door_open_homie.yaml 的 actor_obs）；学生本体 122 维 + 216×384 RGB */
  var TEACH_OBS = [['关节角', 43], ['关节速度', 43], ['上一步动作', 31], ['手上接触力', 48], ['增量累加器', 19], ['两手 → 门把', 18],
    ['门相对根部', 9], ['门的参数', 8], ['HOMIE 命令', 7], ['阶段', 6], ['其余 5 项', 14]];
  var STU_OBS = [['关节角', 29], ['关节速度', 29], ['上一步动作', 31], ['增量累加器', 19], ['HOMIE 命令', 7], ['其余 3 项', 7]];
  var TEACH_DIM = 246, STU_DIM = 122, IMG_H = 216, IMG_W = 384;
  /* 附录表 3：门的物理随机化 */
  var DOOR_RANGES = [['门板宽', 0.8, 1.1, 'm'], ['门板高', 1.9, 2.2, 'm'], ['把手高度', 0.85, 0.95, 'm'], ['门重', 80, 120, 'kg'], ['门轴最大力', 20, 30, 'N·m'], ['门把最大力', 1, 3, 'N·m']];
  /* 项目页：三个阶段的算力 */
  var GPU = [['教师 PPO', 1, 6], ['学生 DAgger', 32, 24], ['学生 GRPO', 64, 12]];

  // ─── 讲解动画：十七幕 ───────────────────────────────────────────────────────
  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    paint = K.paint,
    seg = K.seg,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
    polyPath = K.polyPath;
  /* 视频里分镜按 1080 宽、约 1.2 倍放大，9–10.5 号字只有 11–12 px，手机上看不清（FALCON 2026-10-25 看片反馈）：
     9–9.5 号放到 11，10–10.5 号放到 11.5 */
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
    C_SURFACE2 = X.surface2,
    C_INK = X.ink;
  /* 全片配色：教师橙（warn）、学生绿；HOMIE 与速度命令蓝、手臂紫、手指绿；罚分 / 失败红；门把黄 */
  var C_TEA = C_WARN, C_STU = C_GOOD, C_CMD = C_ACCENT, C_ARM = C_PURPLE, C_FIN = C_GOOD, C_PEN = C_BAD, C_DOOR = C_WARN;
  /* 图 5 / 图 6 的配色：DoorMan 与缓冲区 100 绿、专家与缓冲区 10 蓝、新手与不用缓冲区灰；三类门：推门蓝、拉门紫、推杠门绿 */
  var M_COLOR = { doorman: C_GOOD, expert: C_ACCENT, novice: C_MUTED, b100: C_GOOD, b10: C_ACCENT, b0: C_MUTED, push: C_ACCENT, pull: C_PURPLE, bar: C_GOOD };

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
  function paperPart(parent, key, u0, v0, u1, v1, x, y, w, caption) {
    var F = FIGS[key];
    return figPart(parent, F[0], F[1], F[2], u0, v0, u1, v1, x, y, w, caption);
  }
  /* 项目页的一段视频：深色底框，下面一行小字写出处；draw 里调 .at(秒, 是否可见) */
  function projClip(parent, id, x, y, w, h, caption, opts) {
    var o = opts || {}, g = group(parent);
    g.appendChild(svgEl('rect', { x: (x - 2).toFixed(1), y: (y - 2).toFixed(1), width: (w + 4).toFixed(1), height: (h + 4).toFixed(1), rx: 5, fill: '#111111', stroke: 'none' }));
    var c = K.svgClip(x, y, w, h, CLIP_BASE + id + '.mp4', { poster: CLIP_BASE + id + '.webp' });
    g.appendChild(c);
    if (caption) label(g, o.capX == null ? x + w / 2 : o.capX, y + h + (o.capDy || 15), caption, o.capCls || 'demo-x-mut', o.capSize || 9.5, o.capAnchor || 'middle');
    return { g: g, x: x, y: y, w: w, h: h, at: function (sec, vis) { c.at(sec, vis); } };
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
  /* 论文 ↔ 代码 翻牌：每行一个名字和一张卡片，卡片在论文值（橙）和代码值（绿）之间来回翻；set(秒) 按 1.6 s 一翻 */
  function flipList(parent, x, y0, items, nameW, boxW) {
    var rows = items.map(function (f, i) {
      var y = y0 + i * 40;
      label(parent, x, y + 20, f[0], 'demo-x-ink2', 12);
      var box = rectBox(parent, x + nameW, y, boxW, 30, C_BORDER, C_SURFACE);
      var v = label(parent, x + nameW + boxW / 2, y + 20, '', 'demo-x-ink', 12.5, 'middle');
      var who = label(parent, x + nameW + boxW + 10, y + 20, '', 'demo-x-mut', 11.5);
      return { box: box, v: v, who: who, f: f };
    });
    return {
      set: function (sec) {
        var side = Math.floor(Math.max(0, sec) / 1.6) % 2, ph = (Math.max(0, sec) % 1.6) / 1.6;
        /* 翻牌：每次换面时卡片横向压扁再展开 */
        var sq = ph < 0.12 ? Math.abs(1 - ph / 0.06) : 1;
        rows.forEach(function (r) {
          r.v.textContent = side ? r.f[2] : r.f[1];
          r.who.textContent = side ? '代码' : '论文';
          r.box.style.stroke = side ? C_STU : C_TEA;
          r.v.style.opacity = sq;
        });
      }
    };
  }
  /* 五种把手的小图标（圆球、杠杆、推杠、拉手、平板），画在 (cx, cy) */
  function handleIcon(g, cx, cy, i) {
    if (i === 0) dotAt(g, cx, cy, 8, C_DOOR);
    if (i === 1) { dotAt(g, cx - 10, cy, 5, C_DOOR); hline(g, cx - 10, cy, cx + 16, cy, C_DOOR, 5); }
    if (i === 2) hline(g, cx - 22, cy, cx + 22, cy, C_DOOR, 6);
    if (i === 3) g.appendChild(paint(svgEl('path', { d: 'M ' + (cx - 4) + ' ' + (cy - 14) + ' h 8 v 28 h -8', fill: 'none', 'stroke-width': 4 }), null, C_DOOR));
    if (i === 4) g.appendChild(paint(svgEl('rect', { x: cx - 9, y: cy - 14, width: 18, height: 28, rx: 2 }), C_DOOR));
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

  var FIGS = {
    teaser: ['teaser.webp', 1400, 731],
    fig1: ['fig1_realworld.webp', 1200, 877],
    fig2: ['fig2_pipeline.webp', 1000, 672],
    fig3: ['fig3_staged_reset.webp', 1400, 669],
    fig4: ['fig4_doors.webp', 1600, 450]
  };
  /* 第 3 幕：一台走路的 G1（第 032 期 HOMIE 在 MuJoCo 里跑官方 deploy.onnx 的回放贴图，15 帧/秒、45 帧一个循环），
     根部正下方的地面点 (ax, ay) 落在 (ox, oy)；R 是贴图的像素/米。贴图第一次用到才设 href */
  var WALK = { file: 'g1_walk.webp', R: 220, cw: 155, ch: 302, cols: 12, n: 45, ax: 70.2, ay: 288.5 };
  function g1Walk(parent) {
    var M = WALK, g = group(parent), rows = Math.ceil(M.n / M.cols);
    g.setAttribute('class', 'demo-x-g1mesh');
    var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: 0, height: 0 });
    var img = svgEl('image', { x: 0, y: 0, width: M.cw * M.cols, height: M.ch * rows, preserveAspectRatio: 'none' });
    box.appendChild(img);
    g.appendChild(box);
    var woke = false, lastF = -1;
    return {
      g: g,
      put: function (ox, oy, s, now) {
        if (!woke && HOMIE_3D_BASE) { woke = true; img.setAttribute('href', HOMIE_3D_BASE + M.file); }
        var k = s / M.R, f = ((Math.floor(now * 15) % M.n) + M.n) % M.n;
        box.setAttribute('x', (ox - M.ax * k).toFixed(1));
        box.setAttribute('y', (oy - M.ay * k).toFixed(1));
        box.setAttribute('width', (M.cw * k).toFixed(1));
        box.setAttribute('height', (M.ch * k).toFixed(1));
        if (f !== lastF) {
          box.setAttribute('viewBox', [(f % M.cols) * M.cw, Math.floor(f / M.cols) * M.ch, M.cw, M.ch].join(' '));
          lastF = f;
        }
      }
    };
  }
  /* G1 的模型（第 3、4、10、16 幕）：Robot_Retarget_Online 的带 Dex3 三指手 G1（g1_mocap_29dof_with_hands.xml），
     我们按下面的关节角做正运动学、照它的 three.js 材质与灯光离线渲染成透明底贴图（正交相机），放在 doorman/g1_3d/。
     HAND：右手 21 档手指原语，u = 0, 0.05, …, 1 在官方 door_open_homie_lstm.yaml 的 pos_0（张开的预抓姿态）与
       pos_1（握住）之间线性插值；3/4 视角、1200 px/m，7 列 3 行；pts 是 u = 0 时 8 个刚体的中心
       （掌、食指两节、中指两节、拇指三节；掌取手掌网格的中心，其余取这一节两端的中点），用手掌网格量过，21 档都不穿模。
     TOP：俯视全身，机器人朝上（+x）、左手（+y）在画面左边，前臂往前伸、两手在预抓姿态；330 px/m；
       root 是根部（骨盆）在贴图里的位置，lh / rh 是左右手掌心。 */
  var HAND = { file: 'g1_hand_r.webp', cw: 230, ch: 176, n: 21, cols: 7,
    pts: [[128.9, 42.7], [192.4, 70.7], [205.5, 116.5], [172.7, 42.4], [185.9, 88.2], [108.0, 56.9], [93.4, 90.7], [80.2, 139.9]] };
  var TOP = { file: 'g1_top.webp', w: 144, h: 165, R: 330, root: [70, 137.4], lh: [17.4, 28.0], rh: [133.0, 56.7] };
  /* 右手贴图：put(x, y, k, u, mirror) 把贴图左上角放在 (x, y)、缩放 k，u ∈ [0, 1] 取最近的一档；mirror 左右翻转当左手用 */
  function g1Hand(parent) {
    var g = group(parent), rows = Math.ceil(HAND.n / HAND.cols);
    g.setAttribute('class', 'demo-x-g1mesh');
    var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: 0, height: 0 });
    var img = svgEl('image', { x: 0, y: 0, width: HAND.cw * HAND.cols, height: HAND.ch * rows, preserveAspectRatio: 'none' });
    box.appendChild(img);
    g.appendChild(box);
    var woke = false, lastF = -1;
    return {
      g: g,
      put: function (x, y, k, u, mirror) {
        if (!woke && DM_3D_BASE) { woke = true; img.setAttribute('href', DM_3D_BASE + HAND.file); }
        var f = Math.round(clamp(u, 0, 1) * (HAND.n - 1));
        box.setAttribute('x', (mirror ? 0 : x).toFixed(1)); box.setAttribute('y', y.toFixed(1));
        box.setAttribute('width', (HAND.cw * k).toFixed(1)); box.setAttribute('height', (HAND.ch * k).toFixed(1));
        g.setAttribute('transform', mirror ? 'translate(' + (x + HAND.cw * k).toFixed(1) + ' 0) scale(-1 1)' : '');
        if (f !== lastF) {
          box.setAttribute('viewBox', [(f % HAND.cols) * HAND.cw, Math.floor(f / HAND.cols) * HAND.ch, HAND.cw, HAND.ch].join(' '));
          lastF = f;
        }
        /* 第 0 档 8 个刚体中心在画面上的位置 */
        return HAND.pts.map(function (p) { return [mirror ? x + (HAND.cw - p[0]) * k : x + p[0] * k, y + p[1] * k]; });
      }
    };
  }
  /* 俯视全身：put(x, y, s, yaw) 把根部放在 (x, y)，s 是像素/米，yaw 是偏航角（rad，从上往下看逆时针，往画面左边转）；
     返回根部的 x、y 轴在画面上的方向和两手掌心的位置 */
  function g1Top(parent) {
    var g = group(parent);
    g.setAttribute('class', 'demo-x-g1mesh');
    var img = svgEl('image', { x: -TOP.root[0], y: -TOP.root[1], width: TOP.w, height: TOP.h, preserveAspectRatio: 'none' });
    g.appendChild(img);
    var woke = false;
    return {
      g: g,
      put: function (x, y, s, yaw) {
        if (!woke && DM_3D_BASE) { woke = true; img.setAttribute('href', DM_3D_BASE + TOP.file); }
        var k = s / TOP.R, c = Math.cos(yaw), sn = Math.sin(yaw);
        g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (-yaw * 180 / Math.PI).toFixed(2) + ') scale(' + k.toFixed(4) + ')');
        function map(p) { var vx = (p[0] - TOP.root[0]) * k, vy = (p[1] - TOP.root[1]) * k; return [x + vx * c + vy * sn, y - vx * sn + vy * c]; }
        return { ex: [-sn, -c], ey: [-c, sn], lh: map(TOP.lh), rh: map(TOP.rh) };
      }
    };
  }
  /* 一行字的宽度估计（中文按 1 个字号、其余按 0.55 个字号），排版用 */
  function textW(str, size) {
    var w = 0;
    for (var i = 0; i < str.length; i++) w += str.charCodeAt(i) > 255 ? size : size * 0.55;
    return w;
  }
  /* 一组小方格（GPU、维数），n 个，每行 cols 个；fill(m) 点亮前 m 个 */
  function cellGrid(parent, x, y, n, cols, size, gap, color) {
    var g = group(parent), cells = [];
    for (var i = 0; i < n; i++) {
      var r = paint(svgEl('rect', { x: x + (i % cols) * (size + gap), y: y + Math.floor(i / cols) * (size + gap), width: size, height: size, rx: 2 }), color);
      g.appendChild(r);
      cells.push(r);
    }
    return { g: g, fill: function (m) { cells.forEach(function (c, i) { c.style.opacity = i < m ? 1 : 0.15; }); } };
  }
  /* 俯视的一扇门：墙沿 y = wy 水平，门轴在 (hx, wy)，门板长 L 往左伸（右侧门轴），开门往上转（远离机器人）；
     返回 { set(θ) }，θ 是门轴角（rad），门把在离自由端 0.1 L 处 */
  function doorTop(parent, x1, x2, hx, wy, L) {
    var g = group(parent);
    hline(g, x1, wy, hx - L - 4, wy, C_BORDER, 5);
    hline(g, hx + 4, wy, x2, wy, C_BORDER, 5);
    /* 开门的圆弧只画到 50°，不越出左边的框 */
    var arc = paint(svgEl('path', { d: 'M ' + (hx - L) + ' ' + wy + ' A ' + L + ' ' + L + ' 0 0 1 ' + (hx - L * Math.cos(0.87)).toFixed(1) + ' ' + (wy - L * Math.sin(0.87)).toFixed(1), fill: 'none', 'stroke-width': 1, 'stroke-dasharray': '3 4' }), null, C_BORDER);
    g.appendChild(arc);
    var panel = hline(g, hx, wy, hx - L, wy, C_DOOR, 5);
    var handle = dotAt(g, hx - 0.9 * L, wy + 6, 4.5, C_DOOR);
    dotAt(g, hx, wy, 5, C_MUTED);
    return {
      g: g,
      set: function (th) {
        var ex = hx - L * Math.cos(th), ey = wy - L * Math.sin(th);
        setLine(panel, hx, wy, ex, ey);
        moveDot(handle, [hx - 0.9 * L * Math.cos(th) + 6 * Math.sin(th), wy - 0.9 * L * Math.sin(th) + 6 * Math.cos(th)]);
        return { ex: ex, ey: ey, handle: [hx - 0.9 * L * Math.cos(th) + 6 * Math.sin(th), wy - 0.9 * L * Math.sin(th) + 6 * Math.cos(th)] };
      }
    };
  }
  /* ── scene 1: 开门：人形的硬骨头 ── */
  function buildSceneIntro() {
    var s = sceneSvg('左边是项目页的视频：宇树 G1 只靠头上相机的 RGB 自己走过去开门、穿门，右上的小窗是策略实际看到的画面；右边依次出现：' +
      '功夫和后空翻打勾、只靠 RGB 开门打叉；开门要同时做到的四件事逐个亮起；以前五类开门系统逐个打叉；两个挑战；最后是 DoorMan 的流程，小点沿流程走');
    s.appendChild(svgText(24, 26, '人形会打功夫，却还不能只靠 RGB 开门', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'hero', 24, 44, 380, 214, '项目页视频（1x）：DoorMan 自己开门；右上小窗是策略看到的画面');
    label(s, 24, 300, '宇树 G1 · 头上一台 RealSense，只用 RGB', 'demo-x-ink2', 11.5);
    label(s, 24, 320, '全程只用仿真数据训练，真机零样本', 'demo-x-mut', 11);
    var R = 424, W = 352;
    /* 第 1 段：功夫 ✓、后空翻 ✓、只靠 RGB 开门 ✗ */
    var p1 = group(s);
    label(p1, R, 64, '机器人圈的现实（引言第一句）', 'demo-x-ink', 14);
    var facts = [['人形打**功夫**', true], ['人形翻**后空翻**', true], ['只靠 **RGB** 自己开门', false]];
    var marks = facts.map(function (f, i) {
      var g = group(p1);
      chip(g, R, 82 + i * 48, W, f[0], f[1] ? C_GOOD : C_BAD, { size: 13, left: true, h: 36 });
      return f[1] ? tick(g, R + W - 34, 90 + i * 48, 18, C_GOOD) : cross(g, R + W - 32, 91 + i * 48, 17, C_BAD);
    });
    label(p1, R, 242, 'kung fu and backflips are solved before', 'demo-x-mut', 10.5);
    label(p1, R, 264, 'they can open doors using only RGB vision', 'demo-x-mut', 10.5);
    /* 第 2 段：开门要同时做到的四件事 */
    var p2 = group(s);
    label(p2, R, 64, '开门要同时做到四件事', 'demo-x-ink', 14);
    /* 四个小动画，2 × 2：每格 170 × 96，下面一行说明 */
    var CW4 = 170, CH4 = 96, cellXY = [[R, 78], [R + 182, 78], [R, 214], [R + 182, 214]];
    var needs = ['① 晃动的相机里找门把', '② 顶着弹簧压下门把', '③ 跟着门轴的圆弧推门', '④ 门的反力下保持平衡'];
    var needG = needs.map(function (n, i) {
      var g = group(p2), c = cellXY[i];
      rectBox(g, c[0], c[1], CW4, CH4, C_BORDER, C_SURFACE);
      label(g, c[0] + CW4 / 2, c[1] + CH4 + 18, n, 'demo-x-ink2', 11.5, 'middle');
      return g;
    });
    /* ① 相机框不动，画面里的门和门把跟着头晃，十字准星追门把 */
    var n1 = cellXY[0], camView = group(needG[0]);
    rectBox(camView, n1[0] + 66, n1[1] + 14, 40, 70, C_DOOR, 'none');
    var h1 = dotAt(camView, n1[0] + 98, n1[1] + 52, 3.6, C_DOOR);
    var aim = group(needG[0]);
    ringAt(aim, 0, 0, 9, C_GOOD, 2);
    hline(aim, -14, 0, -6, 0, C_GOOD, 2); hline(aim, 6, 0, 14, 0, C_GOOD, 2);
    hline(aim, 0, -14, 0, -6, C_GOOD, 2); hline(aim, 0, 6, 0, 14, C_GOOD, 2);
    /* ② 侧视：门把绕转轴往下压，下面的弹簧被压短 */
    var n2 = cellXY[1], PVX = n2[0] + 52, PVY = n2[1] + 34;
    dotAt(needG[1], PVX, PVY, 5, C_MUTED);
    var lev2 = hline(needG[1], PVX, PVY, PVX + 70, PVY, C_DOOR, 6);
    var spr2 = pathLine(needG[1], [], C_MUTED, 1.8);
    hline(needG[1], PVX + 40, n2[1] + 88, PVX + 84, n2[1] + 88, C_BORDER, 2);
    var push2 = arrow(needG[1], C_CMD, 2.4);
    /* ③ 俯视：门绕门轴转，手沿圆弧走 */
    var n3 = cellXY[2], HGX = n3[0] + 44, HGY = n3[1] + 80, DL = 84;
    hline(needG[2], n3[0] + 8, HGY, HGX, HGY, C_BORDER, 3);
    hline(needG[2], HGX + DL + 4, HGY, n3[0] + CW4 - 8, HGY, C_BORDER, 3);
    pathLine(needG[2], Array.from({ length: 25 }, function (_, k) { var a = k / 24 * 1.3; return [HGX + DL * Math.cos(a), HGY - DL * Math.sin(a)]; }), C_STU, 1.4, '3 4');
    var door3 = hline(needG[2], HGX, HGY, HGX + DL, HGY, C_DOOR, 5);
    dotAt(needG[2], HGX, HGY, 4, C_MUTED);
    var hand3 = dotAt(needG[2], HGX + DL, HGY, 4.5, C_STU);
    /* ④ 一台 G1（第 032 期 HOMIE 回放贴图的一帧），门的反力往后推，身体轻轻晃 */
    var n4 = cellXY[3], body4 = group(needG[3]), g14 = g1Walk(body4);
    hline(needG[3], n4[0] + 10, n4[1] + 88, n4[0] + CW4 - 10, n4[1] + 88, C_BORDER, 1.4);
    var react4 = arrow(needG[3], C_BAD, 2.6);
    label(needG[3], n4[0] + CW4 - 8, n4[1] + 20, '门的反力', 'demo-x-ink2', 11, 'end');
    /* 第 3 段：以前的开门系统 */
    var p3 = group(s);
    label(p3, R, 64, '以前的开门系统', 'demo-x-ink', 14);
    var prior = ['深度、手工特征、写死的动作原语', '用钩子代替抓握，要准确定位', 'DARPA 挑战赛：脚本 + 人工介入', '遥操作 + 模仿学习：换场景就不行', 'HDMI：要动捕给出物体位姿'];
    var priorX = prior.map(function (n, i) {
      var g = group(p3);
      chip(g, R, 78 + i * 36, W, n, C_MUTED, { size: 11.5, left: true, h: 30 });
      return cross(g, R + W - 26, 86 + i * 36, 14, C_BAD);
    });
    /* 第 4 段：两个挑战 */
    var p4 = group(s);
    label(p4, R, 64, '论文：两个挑战', 'demo-x-ink', 14);
    var AX = R + 86, BX = R + 266, IY = 138;
    rectBox(p4, AX - 46, IY - 36, 92, 72, C_STU, C_SURFACE);
    math(p4, AX, IY + 9, '\\pi', 26, 'middle');
    label(p4, AX, IY + 62, '(i) 算法：简单、能放大', 'demo-x-ink2', 11.5, 'middle');
    label(p4, AX, IY + 83, '扛得住部分可观', 'demo-x-ink2', 11.5, 'middle');
    var cam = group(p4);
    rectBox(cam, BX - 40, IY - 22, 80, 50, C_ACCENT, C_SURFACE);
    ringAt(cam, BX, IY + 3, 15, C_ACCENT, 3);
    rectBox(cam, BX - 26, IY - 32, 24, 10, C_ACCENT, C_SURFACE);
    label(p4, BX, IY + 62, '(ii) 视觉鸿沟：外观和', 'demo-x-ink2', 11.5, 'middle');
    label(p4, BX, IY + 83, '物理的变化太多', 'demo-x-ink2', 11.5, 'middle');
    var qm = label(p4, BX + 34, IY - 34, '?', 'demo-x-ink', 22, 'middle');
    /* 第 5 段：DoorMan */
    var p5 = group(s);
    label(p5, R, 64, 'DoorMan（CVPR 2026）', 'demo-x-ink', 14);
    label(p5, R, 84, 'NVIDIA · UC Berkeley · CMU · 港中文', 'demo-x-mut', 11);
    var row5 = [['仿真里的海量门', 110, C_ACCENT], ['教师—学生—自举', 118, C_WARN], ['RGB 策略', 80, C_GOOD]], rx5 = [], x0 = R;
    row5.forEach(function (c) { chip(p5, x0, 112, c[1], c[0], c[2], { size: 12, h: 32 }); rx5.push([x0, x0 + c[1]]); x0 += c[1] + 22; });
    var f5 = [0, 1].map(function () { return flowSeg(p5, C_STU, 2, 3, 30); });
    chip(p5, R + 236, 168, 116, 'G1 真机零样本', C_GOOD, { size: 12, h: 32 });
    var f5b = flowSeg(p5, C_STU, 2, 3, 30);
    rich(p5, R, 232, '全程只用**仿真数据**；比人遥操作快 23–32%', 12.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      clip.at(K.clipSince(t, 0), true);
      marks.forEach(function (m, i) { m.style.opacity = seg(t, 0.8 + i * 0.9, 1.1 + i * 0.9); });
      needG.forEach(function (g, i) { setOpacity(g, 0.25 + 0.75 * seg(t, 3.9 + i * 0.7, 4.2 + i * 0.7)); });
      if (t > 3.3 && t < 7.4) {
        /* ① 画面跟着头晃，准星稍慢地追上门把 */
        var jx = 7 * Math.sin(now * 2.3) + 3 * Math.sin(now * 5.1), jy = 4 * Math.sin(now * 3.1 + 1);
        camView.setAttribute('transform', 'translate(' + jx.toFixed(1) + ' ' + jy.toFixed(1) + ')');
        var lag = 0.35, ax = n1[0] + 98 + 7 * Math.sin((now - lag) * 2.3) + 3 * Math.sin((now - lag) * 5.1), ay = n1[1] + 52 + 4 * Math.sin((now - lag) * 3.1 + 1);
        aim.setAttribute('transform', 'translate(' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ')');
        void h1;
        /* ② 压下 0–0.6 rad，弹簧跟着变短 */
        var ph2 = (now % 2.4) / 2.4, a2 = 0.6 * Math.sin(Math.PI * Math.min(1, ph2 / 0.8)) * (ph2 < 0.8 ? 1 : 0);
        var tipX = PVX + 70 * Math.cos(a2), tipY = PVY + 70 * Math.sin(a2), sx = PVX + 62 * Math.cos(a2), sy = PVY + 62 * Math.sin(a2), base = n2[1] + 88, zz = [];
        for (var q = 0; q <= 10; q++) zz.push([sx + (q % 2 ? 6 : -6) * (q > 0 && q < 10 ? 1 : 0), sy + (base - sy) * q / 10]);
        setPath(spr2, zz);
        setLine(lev2, PVX, PVY, tipX, tipY);
        push2.set(tipX - 4, tipY - 30, tipX - 4, tipY - 6, 8);
        /* ③ 门转到 75°，手跟着走圆弧 */
        var ph3 = (now % 3.2) / 3.2, a3 = 1.3 * (ph3 < 0.7 ? 0.5 - 0.5 * Math.cos(Math.PI * ph3 / 0.7) : 1 - (ph3 - 0.7) / 0.3);
        setLine(door3, HGX, HGY, HGX + DL * Math.cos(a3), HGY - DL * Math.sin(a3));
        moveDot(hand3, [HGX + DL * Math.cos(a3), HGY - DL * Math.sin(a3)]);
        /* ④ 贴图只取一帧（站着），反力一大身体就往后晃一点 */
        var f4 = 0.5 + 0.5 * Math.sin(now * 2.0), tilt = -3 * f4;
        g14.put(n4[0] + 70, n4[1] + 88, 58, 0);
        body4.setAttribute('transform', 'rotate(' + tilt.toFixed(2) + ' ' + (n4[0] + 70) + ' ' + (n4[1] + 88) + ')');
        react4.set(n4[0] + 150, n4[1] + 46, n4[0] + 150 - 16 - 26 * f4, n4[1] + 46, 9);
      }
      priorX.forEach(function (m, i) { m.style.opacity = seg(t, 7.3 + i * 0.5, 7.6 + i * 0.5); });
      qm.style.opacity = 0.4 + 0.6 * Math.abs(Math.sin(now * 2.4));
      f5.forEach(function (f, i) { f.at(now + i * 0.3, [rx5[i][1] + 2, 128], [rx5[i + 1][0] - 2, 128], true); });
      f5b.at(now, [R + 294, 146], [R + 294, 166], true);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: 三个阶段（图 2） ── */
  function buildScenePipeline() {
    var s = sceneSvg('左边是论文图 2 的三个阶段，讲到哪一段就框出哪一段：教师强化学习、学生蒸馏、学生自举，底下是 Isaac Lab 环境；右边依次出现：' +
      '三个阶段的竖向流程、每个阶段的训练方式和用了多少张 GPU（小方格逐个点亮）、最后三个阶段的 GPU 小时数的条形图');
    s.appendChild(svgText(24, 26, '三个阶段，全在 Isaac Lab 里（论文图 2）', 'demo-x-ink2', 13.5));
    var FW = 440, fig = paperPart(s, 'fig2', 0, 0, 1, 1, 24, 44, FW, '论文图 2：DoorMan 的训练流水线'), FH = fig.h;
    var boxes = [[0, 0, 0.32, 0.805], [0.338, 0, 0.66, 0.805], [0.678, 0, 1, 0.805], [0, 0.845, 1, 1]].map(function (b) {
      var r = rectBox(s, 24 + b[0] * FW, 44 + b[1] * FH, (b[2] - b[0]) * FW, (b[3] - b[1]) * FH, C_BAD, 'none');
      r.style.fill = 'none'; r.setAttribute('stroke-width', 3);
      return r;
    });
    var R = 488, W = 288, CXm = R + W / 2;
    /* 第 1 段：竖向流程 */
    var p1 = group(s);
    label(p1, R, 64, '三步都在仿真里交互式完成', 'demo-x-ink', 13.5);
    var chain = [['① 教师：PPO + 特权观测', C_TEA], ['② 学生：DAgger 蒸馏', C_STU], ['③ 学生：GRPO 自举', C_STU]];
    chain.forEach(function (c, i) { chip(p1, R, 80 + i * 50, W, c[0], c[1], { size: 12, h: 32 }); });
    chip(p1, R, 238, W, 'Isaac Lab 环境（三步共用）', C_ACCENT, { size: 11.5, h: 28, dash: '5 4' });
    var fl1 = [0, 1].map(function () { return flowSeg(p1, C_MUTED, 2, 3, 20); });
    /* 第 2–4 段：每个阶段一块；GPU 小方格逐个点亮 */
    var PH = [
      ['① 教师强化学习', ['PPO · 特权观测', '专家奖励（分六个阶段）'], 1, 6, C_TEA],
      ['② 学生蒸馏', ['DAgger · 头部 RGB + 本体感受', '在学生自己走到的状态上学'], 32, 24, C_STU],
      ['③ 学生自举', ['GRPO · 只用「成功没有」', '从 ② 复制参数接着练'], 64, 12, C_STU]
    ];
    var ph = PH.map(function (P) {
      var g = group(s);
      label(g, R, 64, P[0], 'demo-x-ink', 14);
      P[1].forEach(function (l, i) { label(g, R, 92 + i * 22, l, 'demo-x-ink2', 12); });
      var grid = cellGrid(g, R, 150, P[2], 16, 13, 4, P[4]);
      label(g, R, 150 + Math.ceil(P[2] / 16) * 17 + 20, P[2] + ' 张 L40S × ' + P[3] + ' 小时（项目页）', 'demo-x-ink', 12.5);
      return { g: g, grid: grid, n: P[2] };
    });
    /* 第 5 段：GPU 小时数 */
    var p5 = group(s);
    label(p5, R, 64, '三个阶段用了多少 GPU 小时', 'demo-x-ink', 13.5);
    readHint(p5, R, 86, '条越长，GPU × 小时越多', 10.5);
    var bars = GPU.map(function (G, i) { return barRowAt(p5, R, 104 + i * 34, 86, G[0], i ? C_STU : C_TEA, 18, 11); });
    label(p5, R, 222, '6 对 768 对 768：两步蒸馏占了绝大部分', 'demo-x-ink2', 11.5);
    rich(p5, R, 246, '项目页：GRPO 让成功率提高 **20–30%**', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      fl1.forEach(function (f, i) { f.at(now, [CXm, 114 + i * 50], [CXm, 128 + i * 50], true); });
      ph.forEach(function (p, i) {
        var a = [3.6, 7.0, 10.4][i];
        p.grid.fill(Math.ceil(p.n * seg(since(t, clock, a), 0.3, 2.3)));
        setOpacity(p.g, win(t, a, [7.0, 10.4, 13.4][i]));
      });
      var u5 = seg(since(t, clock, 13.4), 0.3, 1.8);
      bars.forEach(function (b, i) { var v = GPU[i][1] * GPU[i][2]; b.set(Math.max(1, v / 768 * 120 * u5), countTo(v, u5) + ' GPU·h'); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p5, win(t, 13.4));
      setOpacity(boxes[3], win(t, 0.3, 3.6));
      setOpacity(boxes[0], win(t, 3.6, 7.0));
      setOpacity(boxes[1], win(t, 7.0, 10.4));
      setOpacity(boxes[2], win(t, 10.4, 13.4));
      void fig;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 站在 HOMIE 上：输出 19 维 ── */
  function buildSceneAction() {
    var s = sceneSvg('左边一台 G1 原地走路（借第 032 期 HOMIE 的回放贴图），脚下的刻度往后退，蓝色箭头是速度命令；右边依次出现：论文说要输出的 43 个关节角；' +
      '代码里策略只输出的 19 格（3 格速度命令、14 格手臂、2 格手指原语），腿的 15 格由 HOMIE 输出；增量累加的小柱子一格一格长高；' +
      'G1 右手（Dex3 三指手）的模型在张开的预抓姿态和握住之间来回；走路和站立两个 HOMIE 模型随命令大小切换');
    s.appendChild(svgText(24, 26, '腿交给 HOMIE，策略只出 19 维', 'demo-x-ink2', 13.5));
    var GX = 140, GY = 318, gw = g1Walk(s);
    var ground = group(s);
    hline(ground, 40, GY, 250, GY, C_BORDER, 1.4);
    var ticks = [];
    for (var i = 0; i < 6; i++) ticks.push(hline(ground, 0, 0, 0, 0, C_BORDER, 2));
    var vArrow = arrow(s, C_CMD, 3);
    label(s, 226, 300, '速度命令', 'demo-x-ink2', 11, 'middle');
    label(s, 24, 350, 'HOMIE（第 032 期）：按速度命令走路、站立', 'demo-x-ink2', 11.5);
    label(s, 24, 370, '贴图借自第 032 期的复现，只作示意', 'demo-x-mut', 10.5);
    var R = 300, W = 476;
    /* 第 1 段：论文的说法 */
    var p1 = group(s);
    label(p1, R, 64, '论文：全身控制要输出关节目标角', 'demo-x-ink', 14);
    var g43 = cellGrid(p1, R, 82, 43, 22, 16, 4, C_MUTED);
    label(p1, R, 140, '29 个身体关节 + 14 个手指关节 = 43（原文写「33 维」）', 'demo-x-ink2', 11.5);
    label(p1, R, 162, '每秒 50 次，还要顶着弹簧门保持平衡', 'demo-x-ink2', 11.5);
    rich(p1, R, 194, '→ 建在预训练的 **HOMIE** 上，不从头学走路', 13);
    /* 第 2 段：代码里 19 维 */
    var p2 = group(s);
    label(p2, R, 64, '代码：策略只输出 19 维', 'demo-x-ink', 14);
    var CW = 21, CG = 3, cols = [];
    for (i = 0; i < 19; i++) {
      var col = i < 3 ? C_CMD : i < 17 ? C_ARM : C_FIN;
      cols.push(paint(svgEl('rect', { x: R + i * (CW + CG), y: 82, width: CW, height: 26, rx: 3 }), col));
      p2.appendChild(cols[i]);
    }
    label(p2, R + 1.5 * (CW + CG), 126, '速度命令 3', 'demo-x-ink2', 11, 'middle');
    label(p2, R + 10 * (CW + CG), 126, '两臂关节 14', 'demo-x-ink2', 11, 'middle');
    label(p2, R + 18 * (CW + CG) - 2, 126, '手指 2', 'demo-x-ink2', 11, 'end');
    var legs = cellGrid(p2, R, 150, 15, 15, 21, 3, C_MUTED);
    label(p2, R, 194, '腿的 15 个关节：由 HOMIE 输出，策略不直接碰', 'demo-x-ink2', 11.5);
    /* 第 3 段：增量累加 */
    var p3 = group(s);
    label(p3, R, 64, '增量设定点：每步加 0.3 × 输出', 'demo-x-ink', 14);
    math(p3, R, 96, 'c_t=\\operatorname{clip}(c_{t-1}+0.3\\,a_t,\\,-15,\\,15)', 15);
    var BX = R + 10, BY = 210, steps = [];
    hline(p3, BX - 4, BY, BX + 8 * 44, BY, C_BORDER, 1.2);
    for (i = 0; i < 8; i++) steps.push(vbar(p3, BX + i * 44, 30, C_CMD));
    var aDots = [];
    for (i = 0; i < 8; i++) aDots.push(label(p3, BX + i * 44 + 15, BY + 18, '', 'demo-x-mut', 10.5, 'middle'));
    var cTxt = label(p3, R + W, 140, '', 'demo-x-ink', 12, 'end');
    label(p3, BX + 8 * 44 + 6, BY + 18, '← 输出 a', 'demo-x-mut', 10.5);
    label(p3, R, 262, '速度命令 = c × 0.25（再截到 ±0.5）', 'demo-x-ink2', 11.5);
    /* 第 4 段：手指原语 */
    var p4 = group(s);
    label(p4, R, 64, '手指原语：每只手 7 个关节只由 1 个数控制', 'demo-x-ink', 14);
    var hand = g1Hand(p4);
    var SX = R + 150, SW = 280;
    hline(p4, SX, 150, SX + SW, 150, C_BORDER, 3);
    var sDot = dotAt(p4, SX, 150, 7, C_FIN);
    rich(p4, SX, 176, '$p_0$ 张开', 11.5);
    rich(p4, SX + SW, 176, '握住 $p_1$', 11.5, null, 'end');
    rich(p4, R, 230, '$u=\\operatorname{clip}(0.25\\,c,\\,-1,\\,1)$，在 $p_0$ 和 $p_1$ 之间线性插值', 12.5);
    label(p4, SX, 204, 'G1 右手（Dex3）模型，按代码的 7 个关节角渲染', 'demo-x-mut', 11);
    /* 第 5 段：两个 HOMIE 模型 */
    var p5 = group(s);
    label(p5, R, 64, '两个预训练的 HOMIE 模型，按命令大小切换', 'demo-x-ink', 14);
    /* 一条 0–1 的刻度：小点是速度命令的大小，过了 0.5 换走路模型 */
    var GX0 = R + 10, GW = 320, GY5 = 104;
    var gzS = svgEl('rect', { x: GX0, y: GY5 - 5, width: GW / 2, height: 10, rx: 5 }), gzW = svgEl('rect', { x: GX0 + GW / 2, y: GY5 - 5, width: GW / 2, height: 10, rx: 5 });
    paint(gzS, C_MUTED); paint(gzW, C_CMD); gzS.style.opacity = 0.35; gzW.style.opacity = 0.35;
    p5.appendChild(gzS); p5.appendChild(gzW);
    hline(p5, GX0 + GW / 2, GY5 - 14, GX0 + GW / 2, GY5 + 14, C_INK, 2);
    label(p5, GX0, GY5 + 26, '0', 'demo-x-mut', 11, 'middle');
    label(p5, GX0 + GW / 2, GY5 + 26, '阈值 0.5', 'demo-x-ink2', 11.5, 'middle');
    label(p5, GX0 + GW, GY5 + 26, '1', 'demo-x-mut', 11, 'middle');
    var cmdDot = dotAt(p5, GX0, GY5, 8, C_CMD);
    var mS = chip(p5, GX0, 148, 150, '站立模型', C_MUTED, { size: 12.5, h: 34 }), mW = chip(p5, GX0 + GW - 150, 148, 150, '走路模型', C_CMD, { size: 12.5, h: 34 });
    var cmdTxt = label(p5, R, 212, '', 'demo-x-ink', 12.5);
    /* 一把锁：HOMIE 的参数冻结 */
    var lock = group(p5);
    rectBox(lock, R + 2, 238, 18, 14, C_WARN, 'none');
    lock.appendChild(paint(svgEl('path', { d: 'M ' + (R + 6) + ' 238 v -5 a 5 5 0 0 1 10 0 v 5', fill: 'none', 'stroke-width': 2 }), null, C_WARN));
    label(p5, R + 30, 250, '训练 DoorMan 时 HOMIE 冻结、不更新', 'demo-x-ink2', 12);
    rich(p5, R, 282, '遥操作的基线也接**同一个 HOMIE**：比较才公平', 12.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      gw.put(GX, GY, 168, now);
      var off = (now * 0.4 * 168) % 35;
      ticks.forEach(function (tk, j) { var x = 250 - off - j * 35; setLine(tk, x, GY, x - 7, GY + 5); tk.style.opacity = x > 46 && x < 248 ? 1 : 0; });
      vArrow.set(196, 282, 254, 282, 9);
      g43.fill(Math.round(43 * seg(t, 0.6, 2.0)));
      cols.forEach(function (c, j) { c.style.opacity = 0.25 + 0.75 * seg(t, 3.9 + j * 0.08, 4.1 + j * 0.08); });
      legs.fill(Math.round(15 * seg(t, 5.6, 6.6)));
      /* 增量：每 4 s 一轮，前 4 步输出 1.0，后 4 步输出 0 */
      var k = Math.floor((since(t, clock, 7.0) % 4) / 0.45), c = 0;
      steps.forEach(function (b, j) {
        var a = j < 4 ? 1 : 0;
        if (j <= k) c = Math.min(15, c + 0.3 * a);
        b.set(BY, j <= k ? c / 1.2 * 70 : 0);
        aDots[j].textContent = j <= k ? (a ? '1.0' : '0') : '';
      });
      cTxt.textContent = 'c = ' + f1(c) + ' → 命令 ' + f2(c * 0.25);
      var u = 0.5 + 0.5 * Math.sin(now * 1.6);
      hand.put(R - 6, 92, 0.62, u);
      moveDot(sDot, [SX + u * SW, 150]);
      var cmd = 0.5 + 0.42 * Math.sin(since(t, clock, 13.4) * 0.9), walk = cmd > 0.5;
      moveDot(cmdDot, [GX0 + cmd * GW, GY5]);
      setOpacity(mW, walk ? 1 : 0.3); setOpacity(mS, walk ? 0.3 : 1);
      gzW.style.opacity = walk ? 0.8 : 0.25; gzS.style.opacity = walk ? 0.25 : 0.8;
      cmdTxt.textContent = '命令大小 ' + f2(cmd) + (walk ? ' > 0.5 → 走路模型' : ' ≤ 0.5 → 站立模型');
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 特权教师看什么 ── */
  function buildSceneTeacher() {
    var s = sceneSvg('左边是俯视图：墙上一扇右侧门轴的门，一台 G1（模型渲染）从下面走近；机器人根部和门上各画一个坐标系，x 红、y 绿、z 蓝（z 朝上，画成圆点）；' +
      '教师能看到的东西依次画出来：根部到门的位姿（紫色箭头）、手到门把的位姿（紫色虚线）、手上的接触力（短箭头）、根部线速度（长箭头）、门的宽度；' +
      '右边依次出现：特权信息清单、246 维的拼法（色带一段段长出）、手上 16 个刚体（G1 两只手的模型上标出）、网络结构、最后这些信息在部署时都被划掉');
    s.appendChild(svgText(24, 26, '特权教师：看得见门、门把和手上的力', 'demo-x-ink2', 13.5));
    rectBox(s, 24, 44, 380, 268, C_BORDER, C_SURFACE2);
    label(s, 34, 62, '俯视：G1 是模型渲染，门是示意', 'demo-x-mut', 10.5);
    /* 门宽约 0.95 m 画成 133 px：约 140 px/m，G1 也按这个比例画 */
    var HX = 326, WY = 160, L = 133, PXM = 140;
    var door = doorTop(s, 34, 394, HX, WY, L);
    var bot = g1Top(s);
    /* 坐标系：门的原点在门洞中间的墙面上（官方 door.py 的 root），x 穿过门洞、y 沿墙往左；根部的 x 朝前、y 朝左；z 都朝上 */
    /* 根部的坐标系画在机器人身上，不写字母（颜色和门的坐标系一样），免得字压在机器人上 */
    var fDoor = K.svgAxes({ len: 24, size: 11 }), fRoot = K.svgAxes({ len: 24, labels: false });
    var frLab = group(s);
    label(frLab, HX - L / 2 + 14, WY + 22, '门坐标系', 'demo-x-ink2', 11);
    label(frLab, 128, 306, '根部坐标系', 'demo-x-ink2', 11);
    var aRD = arrow(s, C_PURPLE, 2.4), rdTxt = rich(s, 0, 0, '$\\xi_{RD}$ 根部 → 门', 11.5);
    var hh = hline(s, 0, 0, 0, 0, C_PURPLE, 2, '5 4'), hhTxt = rich(s, 0, 0, '手 → 门把', 11.5);
    var forces = [0, 1, 2].map(function () { return arrow(s, C_INK, 1.8); });
    var fTxt = label(s, 0, 0, '接触力', 'demo-x-ink2', 11);
    var vR = arrow(s, C_INK, 2.4), vTxt = rich(s, 0, 0, '$v_R$ 根部线速度', 11.5);
    s.appendChild(fDoor.g); s.appendChild(fRoot.g);
    var dimG = group(s);
    hline(dimG, HX - L, WY - 46, HX, WY - 46, C_MUTED, 1.2);
    hline(dimG, HX - L, WY - 52, HX - L, WY - 40, C_MUTED, 1.2);
    hline(dimG, HX, WY - 52, HX, WY - 40, C_MUTED, 1.2);
    label(dimG, HX - L / 2, WY - 54, '门宽 0.8–1.1 m', 'demo-x-ink2', 10.5, 'middle');
    var R = 424, W = 352;
    /* 第 1 段：特权信息清单 */
    var p1 = group(s);
    label(p1, R, 64, '只有仿真里才有的特权信息', 'demo-x-ink', 14);
    var PRIV = [['机器人根部 → 门的位姿', C_PURPLE], ['左右手 → 门把的位姿', C_PURPLE], ['手上各刚体的接触力', C_INK], ['根部线速度', C_INK]];
    var privG = PRIV.map(function (p, i) { var g = group(p1); chip(g, R, 80 + i * 42, W, p[0], p[1], { size: 12.5, left: true, h: 32 }); return g; });
    label(p1, R, 266, '以前的工作用手写的估计器估其中一部分', 'demo-x-mut', 11);
    /* 第 2 段：246 维 */
    var p2 = group(s);
    label(p2, R, 64, '代码里教师一共看 246 维', 'demo-x-ink', 14);
    var segs = [], acc = 0, PAL = [C_MUTED, C_MUTED, C_ARM, C_PEN, C_CMD, C_DOOR, C_PURPLE, C_WARN, C_CMD, C_GOOD, C_BORDER];
    TEACH_OBS.forEach(function (o, i) {
      var r = paint(svgEl('rect', { x: R + acc / TEACH_DIM * W, y: 80, width: 0, height: 24 }), PAL[i]);
      r.style.opacity = i < 2 ? 0.55 : 0.9;
      p2.appendChild(r); segs.push({ r: r, x0: acc, w: o[1] });
      acc += o[1];
    });
    TEACH_OBS.slice(0, 10).forEach(function (o, i) {
      label(p2, R + (i % 2) * 180, 130 + Math.floor(i / 2) * 22, o[0] + ' ' + o[1], 'demo-x-ink2', 11.5);
    });
    label(p2, R, 252, '价值网络再加 5 维时间 / 阶段信息：251 维', 'demo-x-mut', 11);
    /* 第 3 段：手上的接触力 */
    var p3 = group(s);
    label(p3, R, 64, '手上的接触力', 'demo-x-ink', 14);
    rich(p3, R, 88, '论文：18 个刚体 × 6 维；代码：**16 个 × 3 维 = 48**', 12);
    /* G1 两只手的模型（右手的贴图，左手左右翻转），8 个刚体的中心标成点，依次点亮 */
    var bodies = [], HK = 0.6;
    [false, true].forEach(function (right, hIdx) {
      var hx = right ? R + 194 : R + 6, hy = 100;
      var pts = g1Hand(p3).put(hx, hy, HK, 0, !right);
      pts.forEach(function (p) {
        var d = dotAt(p3, p[0], p[1], 4.6, C_INK);
        d.style.stroke = C_SURFACE2; d.style.strokeWidth = 1.6;
        bodies.push(d);
      });
      label(p3, hx + HAND.cw * HK / 2, 226, right ? '右手 8 个' : '左手 8 个', 'demo-x-ink2', 11.5, 'middle');
    });
    label(p3, R, 252, '掌 1 + 食指 2 + 中指 2 + 拇指 3（G1 模型渲染）', 'demo-x-mut', 11);
    /* 第 4 段：网络 */
    var p4 = group(s);
    label(p4, R, 64, '教师网络（代码）', 'demo-x-ink', 14);
    var net = [['特权观测 246 维', C_TEA], ['LSTM 256 × 2 层', C_TEA], ['MLP 512 / 256 / 128', C_TEA], ['动作 19 维', C_CMD]];
    net.forEach(function (n, i) { chip(p4, R + 60, 80 + i * 44, W - 120, n[0], n[1], { size: 12, h: 30 }); });
    var fl4 = [0, 1, 2].map(function () { return flowSeg(p4, C_TEA, 2, 3, 18); });
    rich(p4, R, 268, 'PPO：$\\gamma=0.9975$，$\\lambda=0.985$', 12);
    /* 第 5 段：部署时都没有 */
    var p5 = group(s);
    label(p5, R, 64, '部署时，这些一个都没有', 'demo-x-ink', 14);
    var gone = PRIV.map(function (p, i) {
      var g = group(p5);
      chip(g, R, 80 + i * 42, W, p[0], C_MUTED, { size: 12.5, left: true, h: 32 });
      var x = cross(g, R + W - 30, 88 + i * 42, 16, C_BAD);
      return x;
    });
    rich(p5, R, 268, '→ 只能交给看 **RGB** 的学生自己推断', 13);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var th = 0.22 + 0.08 * Math.sin(now * 0.8), d = door.set(th);
      /* G1 站在门前约 0.8 m、往左偏一点（偏航 0.2 rad 上下），前后轻轻晃 */
      var yaw = 0.22 + 0.04 * Math.sin(now * 0.6), sway = 3 * Math.sin(now * 1.3);
      var bx = 240 - sway * Math.sin(yaw), by = 272 - sway * Math.cos(yaw);
      var b = bot.put(bx, by, PXM, yaw), ex = b.ex, ey = b.ey, lh = b.lh;
      var u0 = seg(t, 0.5, 0.8), u1 = seg(t, 0.8, 1.2), u2 = seg(t, 1.5, 1.9), u3 = seg(t, 2.2, 2.6), u4 = seg(t, 2.9, 3.3);
      var DO = [HX - L / 2, WY];
      fDoor.set(DO, [0, -1], [-1, 0], { toward: true, label: [-10, 13] });
      fRoot.set([bx, by], ex, ey, { toward: true, label: [10, 14] });
      setOpacity(fDoor.g, u0); setOpacity(fRoot.g, u0); setOpacity(frLab, u0);
      var rx = DO[0] - bx, ry = DO[1] - by, rl = Math.hypot(rx, ry);
      aRD.set(bx + rx / rl * 12, by + ry / rl * 12, DO[0] - rx / rl * 9, DO[1] - ry / rl * 9, 9); setOpacity(aRD.g, u1);
      rdTxt.setX(284); rdTxt.setY(214); setOpacity(rdTxt, u1);
      setLine(hh, lh[0], lh[1], d.handle[0], d.handle[1]); hh.style.opacity = u2;
      hhTxt.setX(104); hhTxt.setY(196); setOpacity(hhTxt, u2);
      forces.forEach(function (f, i) {
        var a = -0.5 + i * 0.5, L2 = 13 + 3 * Math.sin(now * 3 + i), ca = Math.cos(a), sa = Math.sin(a);
        var fx = ex[0] * ca - ex[1] * sa, fy = ex[0] * sa + ex[1] * ca;
        f.set(lh[0], lh[1], lh[0] + L2 * fx, lh[1] + L2 * fy, 5.5); setOpacity(f.g, u3);
      });
      fTxt.setAttribute('x', (lh[0] - 66).toFixed(1)); fTxt.setAttribute('y', (lh[1] + 18).toFixed(1)); fTxt.style.opacity = u3;
      var vx0 = bx - ey[0] * 36 - ex[0] * 6, vy0 = by - ey[1] * 36 - ex[1] * 6;
      vR.set(vx0, vy0, vx0 + ex[0] * 34, vy0 + ex[1] * 34, 8); setOpacity(vR.g, u4);
      vTxt.setX(vx0 + 10); vTxt.setY(vy0 + 4); setOpacity(vTxt, u4);
      setOpacity(dimG, seg(t, 3.0, 3.4));
      privG.forEach(function (g, i) { setOpacity(g, 0.25 + 0.75 * [u1, u2, u3, u4][i]); });
      var u = seg(since(t, clock, 3.6), 0.3, 2.3);
      segs.forEach(function (sg) { var w = clamp(u * TEACH_DIM - sg.x0, 0, sg.w); sg.r.setAttribute('width', (w / TEACH_DIM * W).toFixed(1)); });
      var lit = Math.floor(since(t, clock, 7.0) * 6) % 9;
      bodies.forEach(function (b, i) { b.style.opacity = (i % 8) <= lit ? 1 : 0.25; });
      fl4.forEach(function (f, i) { f.at(now, [R + W / 2, 112 + i * 44], [R + W / 2, 122 + i * 44], true); });
      gone.forEach(function (x, i) { x.style.opacity = seg(t, 13.8 + i * 0.4, 14.1 + i * 0.4); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: 六个阶段，各有奖励 ── */
  /* 无纹理仿真片段里各阶段大致的起点（s）：我们看画面估的，不是论文给的 */
  var NOTEX_STAGE = [0, 1.5, 2.3, 3.0, 3.6, 5.0, 7.5];
  function buildSceneStages() {
    var s = sceneSvg('左边是项目页的无纹理仿真开门视频，下面一条六格的阶段条跟着视频走（阶段是我们看画面估的）；右边是六个阶段的梯子，' +
      '讲到哪几个阶段就亮哪几行，旁边列出这几个阶段生效的奖励和权重；最后每行右边长出这个阶段的时间预算');
    s.appendChild(svgText(24, 26, '开门拆成六个阶段，每个阶段有自己的奖励', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'sim_notex', 24, 44, 380, 214, '项目页视频：无纹理的仿真开门（阶段是我们看画面估的）');
    var TW = 380, tl = [], tx = function (sec) { return 24 + sec / 7.5 * TW; };
    for (var i = 0; i < 6; i++) {
      var r = paint(svgEl('rect', { x: tx(NOTEX_STAGE[i]) + 1, y: 286, width: tx(NOTEX_STAGE[i + 1]) - tx(NOTEX_STAGE[i]) - 2, height: 12, rx: 3 }), C_ACCENT);
      s.appendChild(r); tl.push(r);
    }
    var head = hline(s, 0, 280, 0, 304, C_BAD, 2.4);
    var stName = label(s, 24, 324, '', 'demo-x-ink', 12.5);
    var R = 424, W = 352, RH = 30;
    /* 一直在的阶段梯子 */
    var rows = STAGES.map(function (st, k) {
      var g = group(s);
      var box = rectBox(g, R, 44 + k * (RH + 4), 112, RH, C_ACCENT, C_SURFACE);
      label(g, R + 10, 44 + k * (RH + 4) + 20, k + '  ' + st.zh, 'demo-x-ink', 12);
      var bar = hbar(g, R + 120, 44 + k * (RH + 4) + 9, 12, C_ACCENT, 0.7);
      var bt = label(g, R + 120, 44 + k * (RH + 4) + 20, '', 'demo-x-ink2', 11);
      return { g: g, box: box, bar: bar, bt: bt };
    });
    var DX = R + 122, DY = 60;
    function detail(lines) {
      var g = group(s);
      lines.forEach(function (l, i) { rich(g, DX, DY + i * 20, l, 11.5, 'demo-x-ink2', 'start', W - 122); });
      return g;
    }
    var d1 = detail(['附录表 2：**30 项**奖励', '按阶段生效', '', '用门把、门轴的状态', '区分阶段（人为设计）']);
    /* 奖励权重画成条：绿正红负，条长按 √|权重|（−1000 太长，截断画成折线） */
    function wdetail(items, y0) {
      var g = group(s), bars = [], y = y0;
      items.forEach(function (it) {
        if (typeof it === 'string') { rich(g, DX, y + 12, '**' + it + '**', 11.5, 'demo-x-ink'); y += 21; return; }
        var neg = it[1] < 0, len = Math.min(100, 11 * Math.sqrt(Math.abs(it[1]))), bx = DX + 98;
        label(g, DX + 92, y + 12, it[0], 'demo-x-ink2', 11.5, 'end');
        var r = paint(svgEl('rect', { x: bx, y: y + 3, width: 0, height: 11, rx: 2 }), neg ? C_PEN : C_GOOD);
        g.appendChild(r);
        var cut = Math.abs(it[1]) > 100 ? label(g, bx + 50, y + 13, '//', 'demo-x-ink', 11, 'middle') : null;
        var v = label(g, bx + len + 6, y + 13, sgn((it[1] > 0 ? '+' : '') + it[1]), 'demo-x-ink', 11.5);
        bars.push({ r: r, len: len, v: v, cut: cut });
        y += 20;
      });
      return { g: g, bars: bars };
    }
    var d2 = wdetail(['0 走到门前', ['朝门走', 5], ['面朝门', -1], ['手臂别乱动', -1], '1 预抓', ['手到预抓点', 6], ['手对着门把', 3], ['站稳别走', -15]], 48);
    var d3 = wdetail(['2 抓住', ['手指握拢', 3], ['手到抓取点', 3], '3 开门', ['门把转动', 6], ['门轴转动', 6], ['往前推的力', 0.3]], 70);
    var d4 = wdetail(['全程', ['终止', -1000], ['完成', 4], ['省下的时间', 0.5], '4 推开、5 穿过去', ['往目标走', 12], ['别再压门把', 3]], 48);
    var d4hint = group(s);
    rich(d4hint, R, 268, '**读法**　绿正红负，条长按 $\\sqrt{|w|}$ 画', 11.5);
    var d5 = group(s);
    label(d5, R, 266, '右边是代码里每个阶段的时间预算（50 Hz）', 'demo-x-ink2', 11.5);
    label(d5, R, 288, '超时就重置；提前进阶，剩下的时间带到下一阶段', 'demo-x-mut', 11);
    var HL = [null, [0, 1], [2, 3], [4, 5], null];
    function draw(t, clock) {
      var cs = K.clipSince(t, 0);
      clip.at(cs, true);
      var m = ((cs % 7.5) + 7.5) % 7.5, cur = 0;
      for (var k = 0; k < 6; k++) if (m >= NOTEX_STAGE[k]) cur = k;
      setLine(head, tx(m), 280, tx(m), 304);
      tl.forEach(function (r, k) { r.style.opacity = k === cur ? 1 : 0.3; });
      stName.textContent = '视频里大约在：阶段 ' + cur + ' ' + STAGES[cur].zh;
      var pn = t < 3.6 ? 0 : t < 7.0 ? 1 : t < 10.4 ? 2 : t < 13.4 ? 3 : 4, hl = HL[pn];
      var u5 = seg(since(t, clock, 13.4), 0.3, 1.8);
      rows.forEach(function (rw, k) {
        var on = hl ? hl.indexOf(k) >= 0 : pn === 0 ? k === cur : true;
        setOpacity(rw.g, on ? 1 : 0.35);
        rw.box.style.strokeWidth = on && pn > 0 && pn < 4 ? 2.6 : 1.3;
        var sec = STAGES[k].time / 50, w = sec / 5 * 100 * u5;
        setW(rw.bar, w);
        rw.bt.setAttribute('x', (R + 126 + w).toFixed(1));
        rw.bt.textContent = u5 > 0 ? STAGES[k].time + ' 步 · ' + sec + ' s' : '';
        rw.bar.style.opacity = pn === 4 ? 0.7 : 0;
        rw.bt.style.opacity = pn === 4 ? 1 : 0;
      });
      setOpacity(d1, win(t, 0.3, 3.6));
      [[d2, 3.6], [d3, 7.0], [d4, 10.4]].forEach(function (dd) {
        var u = since(t, clock, dd[1]);
        dd[0].bars.forEach(function (b, j) {
          var w = b.len * seg(u, 0.4 + j * 0.25, 0.9 + j * 0.25);
          setW(b.r, w);
          b.v.style.opacity = seg(u, 0.8 + j * 0.25, 1.0 + j * 0.25);
          if (b.cut) b.cut.style.opacity = w > 50 ? 1 : 0;
        });
      });
      setOpacity(d2.g, win(t, 3.6, 7.0));
      setOpacity(d3.g, win(t, 7.0, 10.4));
      setOpacity(d4.g, win(t, 10.4, 13.4));
      setOpacity(d4hint, win(t, 3.6, 13.4));
      setOpacity(d5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 卡在「抓门把」 ── */
  function buildSceneStuck() {
    var s = sceneSvg('上面是六个阶段连成的一条链，小点是一个个回合从阶段 0 出发往右走，每过一座桥都可能停下；「抓住 → 开门」那座桥又窄又红，' +
      '大多数小点在这里掉下去，节点上方的数字是到过这个阶段的回合占比（玩具模型）；下面依次出现：问题、抓住门把后挨的三种罚、策略「学回去」、窄桥的公式、后面阶段几乎没有样本');
    s.appendChild(svgText(24, 26, '最难的一关：抓住门把，却不会转', 'demo-x-ink2', 13.5));
    var NX = function (k) { return 70 + k * 132; }, NY = 112;
    var NDOT = 26, dots = [];
    for (var i = 0; i < NDOT; i++) dots.push(dotAt(s, 0, 0, 5, C_ACCENT));
    var bridges = [];
    for (var k = 0; k < 5; k++) {
      var narrow = k === 2;
      bridges.push(hline(s, NX(k) + 20, NY, NX(k + 1) - 20, NY, narrow ? C_BAD : C_BORDER, narrow ? 2 : 6, narrow ? '4 4' : null));
    }
    /* 节点画在小点上面：小点从节点后面穿过去，不压住节点里的数字 */
    var nodes = STAGES.map(function (st, k) {
      var c = ringAt(s, NX(k), NY, 19, C_ACCENT, 2.6);
      c.style.fill = C_SURFACE;
      label(s, NX(k), NY + 5, String(k), 'demo-x-ink', 13, 'middle');
      label(s, NX(k), NY + 40, st.zh, 'demo-x-ink2', 11.5, 'middle');
      return c;
    });
    var V0 = toyVisits([1, 0, 0, 0, 0, 0], TOY_P);
    STAGES.forEach(function (st, k) { label(s, NX(k), NY - 30, (V0[k] * 100 >= 10 ? Math.round(V0[k] * 100) : f1(V0[k] * 100)) + '%', 'demo-x-ink', 12, 'middle'); });
    label(s, 24, 186, '玩具：每座桥的通过率 0.9 / 0.8 / 0.05 / 0.6 / 0.7，数字是到过这个阶段的回合占比', 'demo-x-mut', 10.5);
    var R = 24, W = 752, Y0 = 220;
    var p1 = group(s);
    label(p1, R, Y0, '开门要精细操作、接触又多', 'demo-x-ink', 14);
    label(p1, R, Y0 + 26, 'RL 很难稳定地往后面的阶段探索——论文说，以前全身控制 RL 的成功里没遇到过这个问题', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, Y0, '抓住了门把，却不知道往哪转、全身怎么配合', 'demo-x-ink', 14);
    var pens = [['力矩过大', '−'], ['接触力尖峰', '−'], ['摔倒、终止', '−1000']].map(function (p, j) {
      var g = group(p2);
      chip(g, R + j * 200, Y0 + 16, 180, p[0] + '　**' + p[1] + '**', C_PEN, { size: 12.5, h: 34 });
      return g;
    });
    var p3 = group(s);
    label(p3, R, Y0, '于是策略「学回去」：躲着不进下一阶段', 'demo-x-ink', 14);
    var shy = dotAt(p3, 0, Y0 + 40, 7, C_ACCENT);
    var shyNode = ringAt(p3, R + 360, Y0 + 40, 16, C_BAD, 2.4);
    void shyNode;
    label(p3, R + 360, Y0 + 72, '抓住', 'demo-x-ink2', 11.5, 'middle');
    label(p3, R + 420, Y0 + 45, '一靠近就挨罚，回报更低 → 下次离远点', 'demo-x-ink2', 12);
    var p4 = group(s);
    label(p4, R, Y0, '形式化：阶段之间只有一座窄桥', 'demo-x-ink', 14);
    rich(p4, R, Y0 + 30, '状态分成互不相交的子集 $S_1,\\dots,S_K$，相邻两段之间是桥 $\\mathcal{B}_{y,y+1}$', 13);
    math(p4, R, Y0 + 66, 'p_{\\text{bridge}} \\ll 1', 17);
    label(p4, R + 120, Y0 + 66, '从初始分布出发，训练早期常常到不了下游阶段', 'demo-x-ink2', 12);
    var p5 = group(s);
    label(p5, R, Y0, '后面几个阶段几乎采不到样本', 'demo-x-ink', 14);
    label(p5, R, Y0 + 26, '玩具里：到过阶段 3 的回合只有 3.6%，阶段 5 只有 1.5%', 'demo-x-ink2', 12);
    label(p5, R, Y0 + 50, '长时程的信用分配做不好 → 下一幕：分阶段重置', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var period = 0.42, speed = 150;
      for (var i = 0; i < NDOT; i++) {
        /* 第 j 个回合：j = 已经出发的回合编号（循环用 NDOT 个点画） */
        var j = Math.floor((now - i * period) / (NDOT * period)) * NDOT + i;
        var age = now - j * period;
        var d = dots[i];
        if (age < 0) { d.style.opacity = 0; continue; }
        var stop = 0;
        while (stop < 5 && rnd(j, stop + 11) < TOY_P[stop]) stop++;
        var x = NX(0) + age * speed, xs = NX(stop);
        /* 走到停下的那个节点就在节点后面淡出（不往下掉，免得压住下面的阶段名） */
        if (x <= xs) { moveDot(d, [x, NY]); d.style.opacity = 1; }
        else { var fade = (x - xs) / speed; moveDot(d, [xs, NY]); d.style.opacity = clamp(1 - fade * 2, 0, 1); }
      }
      nodes.forEach(function (c, q) { c.style.stroke = q === 2 && t >= 3.6 && t < 10.4 ? C_BAD : ''; });
      pens.forEach(function (g, q) { setOpacity(g, 0.3 + 0.7 * Math.abs(Math.sin(now * 2 + q))); });
      var sw = since(t, clock, 7.0) % 3, sx = R + 120 + 200 * (sw < 1.5 ? sw / 1.5 : (3 - sw) / 1.5) * 0.95;
      moveDot(shy, [sx, Y0 + 40]);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 7: 分阶段重置（图 3） ── */
  function buildSceneReset() {
    var s = sceneSvg('左上是论文图 3：每个阶段下面一摞快照；左下是我们画的六摞缓冲区，环境一进到新阶段就往那一摞加一张快照，' +
      '一个小球每隔一会儿按比例抽一个阶段，表示这次重置从哪里起步；右边依次出现：存了什么、起步比例、式 2、玩具链上两种做法各阶段的样本（灰色不用重置、绿色分阶段重置）、代码里的数');
    s.appendChild(svgText(24, 26, '分阶段重置：进到新阶段就存档，重置时从存档接着练', 'demo-x-ink2', 13.5));
    var fig = paperPart(s, 'fig3', 0, 0, 1, 1, 24, 44, 456, '论文图 3：分阶段重置');
    var SX = function (k) { return 52 + k * 78; }, SY = 384, SH = 7;
    var stacks = STAGES.map(function (st, k) {
      var g = group(s), cards = [];
      for (var j = 0; j < 8; j++) {
        var c = paint(svgEl('rect', { x: SX(k) - 22, y: SY - (j + 1) * (SH + 2), width: 44, height: SH, rx: 2 }), k ? C_TEA : C_MUTED);
        g.appendChild(c); cards.push(c);
      }
      label(g, SX(k), SY + 16, k + ' ' + st.short, 'demo-x-ink2', 11, 'middle');
      return cards;
    });
    var ball = dotAt(s, 0, 0, 7, C_STU);
    var ballTxt = label(s, 24, 304, '', 'demo-x-ink', 11.5);
    /* 每个阶段第一次有快照的时刻（秒，从这一幕开头的视频时间算）：后面的阶段越来越晚，「开门」那一摞要等最久 */
    var FIRST = [0, 0.8, 1.6, 4.2, 5.0, 5.8];
    function filledAt(sec) { return FIRST.map(function (f) { return sec >= f; }); }
    var R = 512, W = 264;
    var p1 = group(s);
    label(p1, R, 64, '一进到新阶段，就存档', 'demo-x-ink', 14);
    ['机器人：根部位姿、所有关节', '门：根部、门轴、门把', '增量累加器、用掉的时间'].forEach(function (l, i) { chip(p1, R, 80 + i * 40, W, l, C_TEA, { size: 11.5, left: true, h: 30 }); });
    /* 三样东西一张张飞进一张快照卡片 */
    var snapCard = group(p1);
    rectBox(snapCard, R + W / 2 - 60, 206, 120, 34, C_TEA, C_SURFACE);
    var snapN = label(snapCard, R + W / 2, 228, '', 'demo-x-ink', 12.5, 'middle');
    var flyers = [0, 1, 2].map(function () { var r = paint(svgEl('rect', { x: 0, y: 0, width: 26, height: 10, rx: 2 }), C_TEA); p1.appendChild(r); return r; });
    label(p1, R, 268, '受 Go-Explore「先回去，再探索」启发', 'demo-x-mut', 11);
    label(p1, R, 288, '仿真器能完全恢复状态，才做得到', 'demo-x-mut', 11);
    var p2 = group(s);
    label(p2, R, 64, '重置时按比例抽起点', 'demo-x-ink', 14);
    var acc = 0;
    RESET_RATIOS.forEach(function (r, k) {
      var w = r * W;
      p2.appendChild(paint(svgEl('rect', { x: R + acc + 1, y: 82, width: w - 2, height: 26, rx: 3 }), k ? C_TEA : C_MUTED));
      label(p2, R + acc + w / 2, 125, k ? '10%' : '50%', 'demo-x-ink2', 10.5, 'middle');
      acc += w;
    });
    label(p2, R, 152, '一半从头开始，五个中间阶段各 10%', 'demo-x-ink2', 12);
    label(p2, R, 174, '（代码 staged_reset_ratios）', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, '起点变成一个混合分布', 'demo-x-ink', 14);
    math(p3, R, 100, '\\tilde\\rho_\\alpha=\\textstyle\\sum_y \\alpha_y\\,\\rho_y', 17);
    label(p3, R, 136, '还没有快照的阶段，权重为 0', 'demo-x-ink2', 12);
    label(p3, R, 158, '剩下的按比例重新归一化', 'demo-x-ink2', 12);
    var probTxt = [0, 1, 2, 3, 4, 5].map(function (k) { return label(p3, R + (k % 3) * 88, 192 + Math.floor(k / 3) * 22, '', 'demo-x-ink', 11.5); });
    var p4 = group(s);
    label(p4, R, 64, '后面的阶段多拿到样本（玩具）', 'demo-x-ink', 13.5);
    readHint(p4, R, 84, '灰 = 不用重置，绿 = 分阶段；越高样本越多', 10, W);
    var v0 = toyVisits([1, 0, 0, 0, 0, 0], TOY_P), va = toyVisits(RESET_RATIOS, TOY_P), BY = 236, pairs = [];
    hline(p4, R, BY, R + W, BY, C_BORDER, 1.2);
    for (var k = 0; k < 6; k++) {
      var bx = R + 6 + k * 43;
      pairs.push([vbar(p4, bx, 16, C_MUTED), vbar(p4, bx + 18, 16, C_STU)]);
      label(p4, bx + 17, BY + 16, String(k), 'demo-x-ink2', 11, 'middle');
    }
    var bigTxt = label(p4, R, BY + 40, '', 'demo-x-ink', 12);
    var p5 = group(s);
    label(p5, R, 64, '只改起点，不改奖励', 'demo-x-ink', 14);
    /* 两个框：起点分布换了（打勾），奖励不动（锁） */
    rectBox(p5, R, 78, 124, 50, C_STU, C_SURFACE);
    label(p5, R + 12, 97, '起点分布', 'demo-x-ink2', 11.5);
    math(p5, R + 12, 123, '\\tilde\\rho_\\alpha', 14);
    var okTick = tick(p5, R + 92, 92, 20, C_STU);
    rectBox(p5, R + 140, 78, 124, 50, C_MUTED, C_SURFACE);
    label(p5, R + 152, 99, '奖励', 'demo-x-ink2', 11.5);
    label(p5, R + 152, 120, '不变', 'demo-x-mut', 11.5);
    var lk = group(p5);
    rectBox(lk, R + 232, 100, 16, 13, C_MUTED, 'none');
    lk.appendChild(paint(svgEl('path', { d: 'M ' + (R + 236) + ' 100 v -5 a 4 4 0 0 1 8 0 v 5', fill: 'none', 'stroke-width': 2 }), null, C_MUTED));
    rich(p5, R, 152, '式 3：占用测度 $d_\\pi^\\alpha$ 往后面的阶段加权', 12, null, null, W);
    /* 环形缓冲：10 格（每格代表 20 张），写指针一格格往前走，满了从最旧的开始覆盖 */
    var ringCells = [], RCW = 24;
    for (var q5 = 0; q5 < 10; q5++) { var rc = paint(svgEl('rect', { x: R + q5 * (RCW + 2), y: 170, width: RCW, height: 18, rx: 3 }), C_TEA); p5.appendChild(rc); ringCells.push(rc); }
    var wPtr = arrow(p5, C_INK, 2);
    label(p5, R, 222, '代码：每个阶段存 200 张（论文写 100 张）', 'demo-x-ink2', 11.5);
    label(p5, R, 242, '满了从最旧的开始覆盖', 'demo-x-mut', 11.5);
    label(p5, R, 274, '学生蒸馏时关掉分阶段重置', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock), sec = since(t, clock, 0);
      var filled = filledAt(sec);
      stacks.forEach(function (cards, k) {
        var n = sec < FIRST[k] ? 0 : Math.min(8, 1 + Math.floor((sec - FIRST[k]) * 1.6));
        cards.forEach(function (c, j) { c.style.opacity = j < n ? 1 : 0.1; });
      });
      var probs = resetProbs(filled), slot = Math.floor(now / 0.9), r = rnd(slot, 5), pick = 0, cum = 0;
      for (var q = 0; q < 6; q++) { cum += probs[q]; if (r < cum) { pick = q; break; } }
      var hop = (now / 0.9) % 1;
      moveDot(ball, [SX(pick), 300 - 10 * Math.sin(Math.PI * Math.min(1, hop * 2.5))]);
      ballTxt.textContent = '这次重置从阶段 ' + pick + ' 起步';
      /* 小球右边放不下时，说明挪到小球左边 */
      var leftSide = SX(pick) + 16 > 300;
      ballTxt.setAttribute('x', (leftSide ? SX(pick) - 16 : SX(pick) + 16).toFixed(1));
      ballTxt.setAttribute('text-anchor', leftSide ? 'end' : 'start');
      probTxt.forEach(function (p, q) { p.textContent = '阶段 ' + q + '：' + (probs[q] ? f2(probs[q]) : '0'); });
      var u4 = seg(since(t, clock, 10.4), 0.3, 1.8);
      pairs.forEach(function (pp, q) { pp[0].set(BY, v0[q] * 110 * u4); pp[1].set(BY, va[q] * 110 * u4); });
      bigTxt.textContent = u4 > 0.9 ? '阶段 5：' + f3(v0[5]) + ' → ' + f3(va[5]) + '，约 ' + Math.round(va[5] / v0[5]) + ' 倍' : '';
      /* 存档：三样东西依次飞进快照卡片，每 3 s 一轮 */
      var u1 = since(t, clock, 0.4) % 3, nIn = 0;
      flyers.forEach(function (f, i) {
        var a = clamp((u1 - 0.3 - i * 0.6) / 0.6, 0, 1), sx = R + W - 40, sy = 90 + i * 40, ex = R + W / 2 - 13, ey = 218;
        f.setAttribute('x', (sx + (ex - sx) * a).toFixed(1)); f.setAttribute('y', (sy + (ey - sy) * a).toFixed(1));
        f.style.opacity = a > 0 && a < 1 ? 1 : 0;
        if (a >= 1) nIn++;
      });
      snapN.textContent = '快照：' + nIn + ' / 3';
      /* 环形缓冲的写指针 */
      var wp = Math.floor(since(t, clock, 13.4) / 0.5) % 10;
      ringCells.forEach(function (c, q) { c.style.opacity = q === wp ? 1 : 0.4; });
      wPtr.set(R + wp * (RCW + 2) + RCW / 2, 206, R + wp * (RCW + 2) + RCW / 2, 192, 7);
      okTick.style.opacity = seg(since(t, clock, 13.4), 0.6, 0.9);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
      void fig;
    }
    return { el: s, draw: draw };
  }

  /* 一张折线图：横轴 0–xmax，纵轴 ymin–ymax，在 (x, y, w, h) 的框里；series 的 v 每 dx 一个点 */
  function curvePlot(parent, x, y, w, h, xmax, ymin, ymax) {
    var g = group(parent);
    rectBox(g, x, y, w, h, C_BORDER, C_SURFACE);
    return {
      g: g,
      px: function (v) { return x + v / xmax * w; },
      py: function (v) { return y + h - (v - ymin) / (ymax - ymin) * h; },
      path: function (vals, dx, upto) {
        var pts = [];
        for (var i = 0; i < vals.length; i++) { if (i * dx > upto + 1e-9) break; pts.push([x + i * dx / xmax * w, y + h - (vals[i] - ymin) / (ymax - ymin) * h]); }
        return pts;
      }
    };
  }

  /* ── scene 8: 图 6 右：缓冲区多大 ── */
  function buildSceneBuffer() {
    var s = sceneSvg('照论文图 6 右重画的三条曲线（读图近似值）：横轴是教师训练的迭代次数，纵轴是平均能到达的最远阶段；绿色缓冲区 100、蓝色缓冲区 10、灰色不用缓冲区，' +
      '曲线从左往右画出来；右边依次讲读法、缓冲区 100 在第 500 次和第 1700 次的点、缓冲区 10 要四千多次、不用缓冲区停在阶段 2 下面、奖励完全相同');
    s.appendChild(svgText(24, 26, '论文图 6 右：缓冲区存多少张快照', 'demo-x-ink2', 13.5));
    var PX = 92, PY = 50, PW = 400, PH = 290, XM = 3800;
    var P = curvePlot(s, PX, PY, PW, PH, XM, 0, 5);
    for (var k = 0; k <= 5; k++) {
      hline(s, PX, P.py(k), PX + PW, P.py(k), C_BORDER, 0.8, k === 2 ? '5 4' : null);
      label(s, PX - 8, P.py(k) + 4, k + ' ' + STAGES[k].short, 'demo-x-ink2', 10.5, 'end');
    }
    [0, 1000, 2000, 3000].forEach(function (v) { label(s, P.px(v), PY + PH + 16, v ? (v / 1000) + 'k' : '0', 'demo-x-ink2', 10.5, 'middle'); });
    label(s, PX + PW / 2, PY + PH + 36, '迭代次数', 'demo-x-ink2', 11, 'middle');
    var lines = FIG6R.map(function (sr) { return pathLine(s, [], M_COLOR[sr.key], 3); });
    legendRow(s, PX, 44 + PH + 62, FIG6R.map(function (sr) { return [sr.zh, M_COLOR[sr.key], textW(sr.zh, 10.5)]; }), 10.5);
    var mk = [[500, 'b100'], [1700, 'b100'], [2750, 'b10'], [3800, 'b0']].map(function (m) {
      var g = group(s), v = at50(FIG6R[['b100', 'b10', 'b0'].indexOf(m[1])], m[0]);
      ringAt(g, P.px(m[0]), P.py(v), 7, C_BAD, 2.4);
      halo(label(g, P.px(m[0]) + (m[0] > 3000 ? -10 : 10), P.py(v) + (m[1] === 'b0' ? -12 : 20), '第 ' + m[0] + ' 次：' + f2(v), 'demo-x-ink', 11, m[0] > 3000 ? 'end' : 'start'));
      return g;
    });
    var R = 516, W = 260;
    var p1 = group(s);
    label(p1, R, 64, '怎么读这张图', 'demo-x-ink', 14);
    ['横轴：教师训练的迭代次数', '纵轴：平均能到达的最远阶段', '（0 走近 … 5 穿门），越高越好', '三条线只差缓冲区的大小'].forEach(function (l, i) { label(p1, R, 92 + i * 22, l, 'demo-x-ink2', 12); });
    var p2 = group(s);
    label(p2, R, 64, '缓冲区 100（绿）', 'demo-x-ink', 14);
    label(p2, R, 92, '500 次内就到了 3.7 左右', 'demo-x-ink2', 12);
    label(p2, R, 114, '约 1700 次到达全部阶段', 'demo-x-ink2', 12);
    label(p2, R, 136, '（论文正文的说法）', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, '缓冲区 10（蓝）', 'demo-x-ink', 14);
    label(p3, R, 92, '前 1500 次一直停在 0.94', 'demo-x-ink2', 12);
    label(p3, R, 114, '要四千多次才探索完', 'demo-x-ink2', 12);
    label(p3, R, 136, '存得少，后面阶段的起点不够多样', 'demo-x-mut', 11);
    label(p3, R, 156, '（这一句是我们的理解）', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 64, '不用缓冲区（灰）', 'demo-x-ink', 14);
    label(p4, R, 92, '到第 3800 次也只有 1.25', 'demo-x-ink2', 12);
    label(p4, R, 114, '进不了阶段 2（抓门把）：', 'demo-x-ink2', 12);
    label(p4, R, 136, '刚抓不好就挨碰撞惩罚，', 'demo-x-ink2', 12);
    label(p4, R, 158, '于是学回去、躲着这一关', 'demo-x-ink2', 12);
    var p5 = group(s);
    label(p5, R, 64, '三组的奖励完全相同', 'demo-x-ink', 14);
    label(p5, R, 92, '分阶段重置不参与奖励计算', 'demo-x-ink2', 12);
    label(p5, R, 114, '差别全来自起点', 'demo-x-ink2', 12);
    label(p5, R, 146, '曲线是从论文矢量图里抽的', 'demo-x-mut', 11);
    label(p5, R, 166, '读图近似值', 'demo-x-mut', 11);
    function draw(t, clock) {
      var u = seg(since(t, clock, 0.4), 0.2, 4.0) * XM;
      FIG6R.forEach(function (sr, i) { setPath(lines[i], P.path(sr.v, STAGE_IT, u)); });
      setOpacity(mk[0], win(t, 3.6, 7.0)); setOpacity(mk[1], win(t, 3.6, 7.0));
      setOpacity(mk[2], win(t, 7.0, 10.4)); setOpacity(mk[3], win(t, 10.4, 13.4));
      lines.forEach(function (l, i) { l.style.opacity = t < 3.6 || t >= 13.4 ? 1 : (t < 7.0 ? i === 0 : t < 10.4 ? i === 1 : i === 2) ? 1 : 0.3; });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: 学生只看 RGB：DAgger ── */
  function buildSceneStudent() {
    var s = sceneSvg('左边是项目页视频里策略实际看到的 RGB 画面（真机）；右边依次出现：学生能拿到的输入；网络结构，小点从图像和本体两路流到动作；' +
      'DAgger 的循环，一个小点绕着「学生开车 → 走到的状态 → 教师给答案 → 学生看齐」转；行为克隆和 DAgger 训练的状态分布；论文和代码的出入');
    s.appendChild(svgText(24, 26, '学生只看头上的 RGB：DAgger 把教师蒸馏过来', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'ego', 24, 44, 380, 214, '项目页视频（1x）：学生实际看到的画面（真机）');
    label(s, 24, 300, '代码：头部 d435_link 的 216 × 384 RGB，不用深度', 'demo-x-ink2', 11.5);
    label(s, 24, 320, '门的位姿、接触力都得从画面和历史里推断', 'demo-x-mut', 11);
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '学生能拿到的', 'demo-x-ink', 14);
    [['头部 RGB 画面', C_STU], ['关节角、关节速度', C_STU], ['根部角速度、投影重力', C_STU]].forEach(function (c, i) { chip(p1, R, 80 + i * 40, 200, c[0], c[1], { size: 12, left: true, h: 30 }); });
    chip(p1, R + 262, 110, 90, '学生', C_STU, { size: 13, h: 40 });
    var fl1 = [0, 1, 2].map(function () { return flowSeg(p1, C_STU, 2, 3, 30); });
    label(p1, R, 222, '看不到（只有教师有）：', 'demo-x-ink2', 12);
    var HIDE = ['门的位姿', '门把的位姿', '接触力', '根部线速度', '门的参数', '当前阶段'], hx = R, hy = 234;
    var hides = HIDE.map(function (h, i) {
      var w = textW(h, 11.5) + 18;
      if (i === 3) { hx = R; hy += 34; }
      var g = group(p1);
      chip(g, hx, hy, w, h, C_MUTED, { size: 11.5, h: 26 });
      var strike = hline(g, hx + 4, hy + 13, hx + 4, hy + 13, C_BAD, 2.4);
      var r = { g: g, strike: strike, x: hx, w: w, y: hy + 13 };
      hx += w + 8;
      return r;
    });
    var p2 = group(s);
    label(p2, R, 64, '学生网络（代码）', 'demo-x-ink', 14);
    chip(p2, R, 78, 160, 'RGB 216 × 384', C_STU, { size: 11.5, h: 28 });
    chip(p2, R + 192, 78, 160, '本体 122 维', C_STU, { size: 11.5, h: 28 });
    chip(p2, R, 124, 160, 'ResNet18 → 128 维', C_STU, { size: 11.5, h: 28 });
    chip(p2, R, 172, W, 'LSTM 两层', C_STU, { size: 11.5, h: 28 });
    chip(p2, R, 214, W, 'MLP 512 / 256 / 128', C_STU, { size: 11.5, h: 28 });
    chip(p2, R, 256, W, '动作 19 维', C_CMD, { size: 11.5, h: 28 });
    var fl2 = [0, 1, 2, 3, 4].map(function () { return flowSeg(p2, C_STU, 2, 3, 18); });
    var p3 = group(s);
    label(p3, R, 64, 'DAgger：学生开车，教师批改', 'demo-x-ink', 14);
    var CX = R + W / 2, CY = 170, RR = 66;
    var loop = ['学生开车', '走到的状态', '教师给答案', '学生看齐'];
    loop.forEach(function (n, i) {
      var a = -Math.PI / 2 + i * Math.PI / 2, x = CX + (RR + 40) * Math.cos(a), y = CY + (RR + 4) * Math.sin(a);
      chip(p3, x - 52, y - 14, 104, n, i === 2 ? C_TEA : C_STU, { size: 11.5, h: 28 });
    });
    var orbit = paint(svgEl('circle', { cx: CX, cy: CY, r: RR - 18, fill: 'none', 'stroke-width': 1.2, 'stroke-dasharray': '4 5' }), null, C_BORDER);
    p3.appendChild(orbit);
    var od = dotAt(p3, 0, 0, 6, C_STU);
    var p4 = group(s);
    label(p4, R, 64, '为什么不用行为克隆', 'demo-x-ink', 14);
    var eT = paint(svgEl('ellipse', { cx: R + 120, cy: 150, rx: 92, ry: 44 }), C_TEA); eT.style.opacity = 0.25; p4.appendChild(eT);
    var eS = paint(svgEl('ellipse', { cx: R + 200, cy: 168, rx: 92, ry: 44 }), C_STU); eS.style.opacity = 0.25; p4.appendChild(eS);
    label(p4, R + 70, 140, '教师走过的状态', 'demo-x-ink2', 11, 'middle');
    label(p4, R + 250, 186, '学生走到的状态', 'demo-x-ink2', 11, 'middle');
    label(p4, R, 236, '行为克隆：只在教师的状态上学', 'demo-x-ink2', 12);
    label(p4, R, 258, 'DAgger：在学生自己的状态上监督', 'demo-x-ink2', 12);
    var p5 = group(s);
    label(p5, R, 64, '论文和代码的出入', 'demo-x-ink', 14);
    var flips9 = flipList(p5, R, 82, [['LSTM 每层', '512', '256'], ['视觉编码器', 'ResNet', 'ResNet18']], 100, 150);
    label(p5, R, 190, '代码里有、论文没写的：', 'demo-x-ink2', 12);
    chip(p5, R, 202, 160, '图像增强', C_STU, { size: 12, h: 28 });
    chip(p5, R + 176, 202, 176, '预测物体位置的辅助头', C_STU, { size: 12, h: 28 });
    function draw(t, clock) {
      var now = nowOf(t, clock);
      clip.at(K.clipSince(t, 0), true);
      fl1.forEach(function (f, i) { f.at(now + i * 0.2, [R + 204, 95 + i * 40], [R + 258, 130], true); });
      hides.forEach(function (h, i) {
        var u = seg(since(t, clock, 0.4), 1.2 + i * 0.35, 1.5 + i * 0.35);
        setLine(h.strike, h.x + 4, h.y, h.x + 4 + (h.w - 8) * u, h.y);
      });
      fl2[0].at(now, [R + 80, 108], [R + 80, 122], true);
      fl2[1].at(now, [R + 80, 154], [R + 80, 170], true);
      fl2[2].at(now, [R + 272, 108], [R + 272, 170], true);
      fl2[3].at(now, [R + W / 2, 202], [R + W / 2, 212], true);
      fl2[4].at(now, [R + W / 2, 244], [R + W / 2, 254], true);
      var a = -Math.PI / 2 + now * 0.9;
      moveDot(od, [CX + (RR - 18) * Math.cos(a), CY + (RR - 18) * Math.sin(a)]);
      eS.setAttribute('cx', (R + 200 + 10 * Math.sin(now)).toFixed(1));
      flips9.set(since(t, clock, 13.4));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: 部分可观与 GRPO ── */
  function buildSceneGRPO() {
    var s = sceneSvg('左边是一组 8 条回合，每行一条从左往右走的轨迹，结尾打勾或打叉；下面算出这组的平均和标准差，每行右边长出这条回合的优势（绿色向右是正、红色向左是负）；' +
      '右边依次出现：教师和学生成功率的差距、PPO 和 GRPO 的区别、优势公式、奖励的组成、俯视的 G1（模型渲染）和头上相机的视野：门把快出画面时视野变红，学生转身把它留在画面里');
    s.appendChild(svgText(24, 26, '学生停在五到七成：用 GRPO 在自己的回合上接着练', 'demo-x-ink2', 13.5));
    var G = EX_GROUP, A = grpoAdv(G), RX = 34, RY = 66, RH = 28;
    rectBox(s, 24, 44, 380, 300, C_BORDER, C_SURFACE2);
    label(s, 34, 60, '一组 G = 8 条回合（我们编的例子）', 'demo-x-mut', 10.5);
    var trajs = [], marks = [], advs = [], advT = [];
    var AX0 = 330;
    hline(s, AX0, RY + 4, AX0, RY + 8 * RH + 2, C_BORDER, 1.2);
    G.forEach(function (r, i) {
      var y = RY + 18 + i * RH;
      label(s, RX, y + 4, '#' + (i + 1), 'demo-x-ink2', 11);
      trajs.push(pathLine(s, [], r ? C_STU : C_MUTED, 2.2));
      marks.push(r ? tick(s, 196, y - 9, 16, C_GOOD) : cross(s, 198, y - 7, 13, C_BAD));
      label(s, 230, y + 4, 'R = ' + r, 'demo-x-ink', 11);
      var b = paint(svgEl('rect', { x: AX0, y: y - 6, width: 0, height: 12, rx: 2 }), r ? C_GOOD : C_BAD);
      s.appendChild(b); advs.push(b);
      advT.push(label(s, 0, y + 4, '', 'demo-x-ink', 10.5));
    });
    var stat = rich(s, 34, 316, '', 12, 'demo-x-ink', 'start', 360);
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '看不见的信息，光模仿补不回来', 'demo-x-ink', 14);
    var b1 = barRowAt(p1, R, 86, 70, '教师', C_TEA, 22, 12), b2 = barRowAt(p1, R, 120, 70, 'DAgger 学生', C_STU, 22, 12);
    label(p1, R, 172, '教师稳定在八到九成，学生停在五到七成', 'demo-x-ink2', 12);
    label(p1, R, 194, '学生得在自己的回合上自举，找到补偿的办法', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 64, 'GRPO：没有价值网络的 PPO', 'demo-x-ink', 14);
    chip(p2, R, 82, W, 'PPO：价值网络估基线', C_MUTED, { size: 12, left: true, h: 32 });
    var xPPO = cross(p2, R + W - 30, 90, 16, C_BAD);
    chip(p2, R, 126, W, 'GRPO：同一组回合的平均当基线', C_STU, { size: 12, left: true, h: 32 });
    /* 8 条回合的回报画成小柱，组内平均画成一条虚线：它就是基线 */
    var MB = 248, mcols = G.map(function (r, i) { return vbar(p2, R + 12 + i * 26, 16, r ? C_STU : C_PEN); });
    hline(p2, R + 4, MB, R + 12 + 8 * 26, MB, C_BORDER, 1.2);
    var meanLn = hline(p2, R + 4, MB, R + 12 + 8 * 26, MB, C_TEA, 2.2, '5 4');
    var meanTx = label(p2, R + 12 + 8 * 26 + 8, MB, '', 'demo-x-ink', 12);
    label(p2, R, 278, '只有 0 / 1 信号，价值网络难学准（我们的理解）', 'demo-x-mut', 11.5);
    var p3 = group(s);
    label(p3, R, 64, '组内相对优势（式 4）', 'demo-x-ink', 14);
    math(p3, R, 102, '\\hat A_i=\\dfrac{R_i-\\operatorname{mean}(R)}{\\operatorname{std}(R)}', 17);
    label(p3, R, 150, '8 条里 5 条成功：均值 0.625，标准差 0.484', 'demo-x-ink2', 12);
    rich(p3, R, 174, '成功 **+0.775**，失败 **−1.291**（总体标准差）', 12);
    label(p3, R, 198, '同一条回合里每一步共用这个优势', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 64, '奖励：基本只看成没成', 'demo-x-ink', 14);
    chip(p4, R, 82, W, '任务成功：1 / 0', C_STU, { size: 12.5, left: true, h: 32 });
    chip(p4, R, 124, W, '平滑惩罚：关节速度、加速度、动作变化率', C_MUTED, { size: 11.5, left: true, h: 32 });
    label(p4, R, 184, '更新用 PPO 的截断目标（式 5）', 'demo-x-ink2', 12);
    label(p4, R, 206, '论文：成功率不为零的策略都能这么改进', 'demo-x-ink2', 12);
    label(p4, R, 228, '一组全成功或全失败：标准差为 0，没有信号', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, '学会教师没示范过的事', 'demo-x-ink', 14);
    var VX = R + 100, VY = 228;
    /* 俯视的 G1（模型渲染）和头上相机的视野：门把出了视野，视野变红 */
    var bot5 = g1Top(p5);
    var cone = paint(svgEl('path', { d: 'M 0 0', 'stroke-width': 1.2 }), C_STU, C_STU); cone.style.fillOpacity = 0.15; p5.appendChild(cone);
    var hdl = dotAt(p5, VX + 40, 110, 6, C_DOOR);
    var inView = label(p5, R + 200, 150, '', 'demo-x-ink', 12);
    label(p5, R + 200, 196, '让门把留在画面里', 'demo-x-ink2', 12);
    label(p5, R + 200, 218, '调整站位、末端姿态', 'demo-x-ink2', 12);
    label(p5, R + 200, 240, '项目页：成功率提高 20–30%', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      G.forEach(function (r, i) {
        var y = RY + 18 + i * RH, u = seg(t, 0.5 + i * 0.25, 1.4 + i * 0.25), pts = [];
        for (var j = 0; j <= 20 * u; j++) { var x = 64 + j * 6.5; pts.push([x, y + 5 * Math.sin(j * 0.7 + i * 1.3) * (r ? 0.6 : 1) + (r ? 0 : j * 0.25)]); }
        setPath(trajs[i], pts);
        marks[i].style.opacity = u >= 1 ? 1 : 0;
        var ua = seg(t, 7.3 + i * 0.12, 7.8 + i * 0.12), w = A.adv[i] * 34 * ua;
        advs[i].setAttribute('x', (w >= 0 ? AX0 : AX0 + w).toFixed(1)); setW(advs[i], Math.abs(w));
        advT[i].setAttribute('x', (AX0 + Math.max(w, 0) + 4).toFixed(1));
        advT[i].textContent = ua > 0.9 ? (A.adv[i] > 0 ? '+' : '−') + f3(Math.abs(A.adv[i])) : '';
      });
      stat.setText(t >= 7.0 ? '均值 **' + f3(A.mean) + '**，标准差 **' + f3(A.std) + '**' : '先跑一组回合，只记成功 / 失败');
      var u1 = seg(since(t, clock, 0.4), 0.3, 1.5);
      b1.set(0.85 * 230 * u1, '约 0.85'); b2.set(0.6 * 230 * u1, '约 0.6');
      xPPO.style.opacity = seg(t, 4.6, 5.0);
      var u2 = since(t, clock, 3.6);
      mcols.forEach(function (c, i) { c.set(MB, (G[i] ? 60 : 3) * seg(u2, 1.0 + i * 0.12, 1.3 + i * 0.12)); });
      var um = seg(u2, 2.4, 3.2), my = MB - 60 * A.mean * um;
      setLine(meanLn, R + 4, my, R + 12 + 8 * 26, my);
      meanLn.style.opacity = um > 0 ? 1 : 0;
      meanTx.setAttribute('y', (my + 4).toFixed(1));
      meanTx.textContent = um > 0.95 ? '平均 ' + f3(A.mean) + ' = 基线' : '';
      var a = 0.5 * Math.sin(now * 0.7), ang = -Math.PI / 2 + a * 0.9;
      var tip1 = [VX + 120 * Math.cos(ang - 0.35), VY + 120 * Math.sin(ang - 0.35)], tip2 = [VX + 120 * Math.cos(ang + 0.35), VY + 120 * Math.sin(ang + 0.35)];
      cone.setAttribute('d', 'M ' + VX + ' ' + VY + ' L ' + tip1[0].toFixed(1) + ' ' + tip1[1].toFixed(1) + ' L ' + tip2[0].toFixed(1) + ' ' + tip2[1].toFixed(1) + ' Z');
      var hx = VX + 40 + 70 * Math.sin(now * 0.7 + 0.6);
      moveDot(hdl, [hx, 120]);
      var hAng = Math.atan2(120 - VY, hx - VX), vis = Math.abs(hAng - ang) < 0.35;
      inView.textContent = vis ? '门把在画面里 ✓' : '门把快出画面了';
      bot5.put(VX, VY, 120, Math.atan2(-Math.cos(ang), -Math.sin(ang)));
      cone.style.fill = vis ? C_STU : C_BAD; cone.style.stroke = vis ? C_STU : C_BAD;
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 11: 图 6 左：学生追上教师 ── */
  function buildSceneGRPOCurve() {
    var s = sceneSvg('照论文图 6 左重画（读图近似值）：横轴是 GRPO 的迭代次数 0 到 200，纵轴是成功率；蓝色推门、紫色拉门、绿色推杠门，同色虚线是对应的教师；' +
      '三条曲线从左往右画出来，起点和终点圈出来；右边依次讲读法、起点、终点和教师上限、各涨了多少、和表 1 对照');
    s.appendChild(svgText(24, 26, '论文图 6 左：GRPO 让学生追上教师', 'demo-x-ink2', 13.5));
    var PX = 70, PY = 50, PW = 420, PH = 290;
    var P = curvePlot(s, PX, PY, PW, PH, 200, 0.4, 0.9);
    [0.4, 0.5, 0.6, 0.7, 0.8, 0.9].forEach(function (v) { hline(s, PX, P.py(v), PX + PW, P.py(v), C_BORDER, 0.8); label(s, PX - 8, P.py(v) + 4, f1(v), 'demo-x-ink2', 10.5, 'end'); });
    [0, 50, 100, 150, 200].forEach(function (v) { label(s, P.px(v), PY + PH + 16, String(v), 'demo-x-ink2', 10.5, 'middle'); });
    label(s, PX + PW / 2, PY + PH + 37, 'GRPO 迭代次数', 'demo-x-ink2', 11, 'middle');
    FIG6L.forEach(function (sr) { var l = hline(s, PX, P.py(sr.teacher), PX + PW, P.py(sr.teacher), M_COLOR[sr.key], 1.6, '3 5'); l.style.opacity = 0.8; });
    var lines = FIG6L.map(function (sr) { return pathLine(s, [], M_COLOR[sr.key], 3); });
    legendRow(s, PX, PY + PH + 62, FIG6L.map(function (sr) { return [sr.zh, M_COLOR[sr.key], textW(sr.zh, 10.5)]; }), 10.5);
    var starts = FIG6L.map(function (sr) { return ringAt(s, P.px(0), P.py(sr.v[0]), 7, C_BAD, 2.4); });
    var ends = FIG6L.map(function (sr) { return ringAt(s, P.px(200), P.py(sr.v[sr.v.length - 1]), 7, C_BAD, 2.4); });
    var R = 516, W = 260;
    var p1 = group(s);
    label(p1, R, 64, '怎么读这张图', 'demo-x-ink', 14);
    ['横轴：GRPO 的迭代次数', '纵轴：成功率，越高越好', '实线：学生；同色虚线：教师', '蓝推门、紫拉门、绿推杠门'].forEach(function (l, i) { label(p1, R, 92 + i * 22, l, 'demo-x-ink2', 12); });
    var p2 = group(s);
    label(p2, R, 64, '起点：DAgger 学生', 'demo-x-ink', 14);
    FIG6L.forEach(function (sr, i) { label(p2, R, 92 + i * 22, sr.zh + '：' + f3(sr.v[0]), 'demo-x-ink2', 12); });
    label(p2, R, 166, '正文：教师八到九成，学生五到七成', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, '第 200 次：贴着教师走平', 'demo-x-ink', 14);
    FIG6L.forEach(function (sr, i) { label(p3, R, 92 + i * 22, sr.zh + '：' + f3(sr.v[sr.v.length - 1]) + ' / ' + f3(sr.teacher), 'demo-x-ink2', 12); });
    label(p3, R, 166, '斜线后面是教师的虚线', 'demo-x-mut', 11);
    var p4 = group(s);
    label(p4, R, 64, '各涨了多少（百分点）', 'demo-x-ink', 14);
    var gains = FIG6L.map(function (sr, i) { return barRowAt(p4, R, 82 + i * 30, 100, sr.zh, M_COLOR[sr.key], 18, 11); });
    label(p4, R, 186, '推杠门起点最低，涨得最多', 'demo-x-ink2', 12);
    label(p4, R, 208, '项目页说提高 20–30%', 'demo-x-mut', 11);
    var p5 = group(s);
    label(p5, R, 64, '正文：最后 80.8–85.8%', 'demo-x-ink', 14);
    label(p5, R, 92, '和表 1 第 6 种设置一样', 'demo-x-ink2', 12);
    label(p5, R, 114, '图上推杠门最后约 0.873，', 'demo-x-ink2', 12);
    label(p5, R, 136, '表 1 是 85.0%，不完全对得上', 'demo-x-ink2', 12);
    label(p5, R, 166, '曲线是从论文矢量图里抽的', 'demo-x-mut', 11);
    function draw(t, clock) {
      var u = seg(since(t, clock, 0.4), 0.2, 4.0) * 200;
      FIG6L.forEach(function (sr, i) { setPath(lines[i], P.path(sr.v, GRPO_IT, u)); });
      starts.forEach(function (c) { c.style.opacity = win(t, 3.6, 7.0); });
      ends.forEach(function (c) { c.style.opacity = win(t, 7.0, 10.4); });
      var u4 = seg(since(t, clock, 10.4), 0.3, 1.6);
      gains.forEach(function (g, i) { var d = (FIG6L[i].v[FIG6L[i].v.length - 1] - FIG6L[i].v[0]) * 100; g.set(d * 2.6 * u4, '+' + f1(d * u4)); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 程序化生成的门 ── */
  function buildSceneDoors() {
    var s = sceneSvg('左边先放项目页的仿真俯瞰视频：成千上万个并行环境，每个环境一扇不一样的门；之后换成一扇扇程序化生成的门轮流出现；' +
      '右边依次出现：不复刻真实场景；五种把手、三大类门；门的尺寸和重量在区间里跳动的小点；门闩的示意：门把转下去，门闩缩回，门才推得开；公开代码只开了一种门');
    s.appendChild(svgText(24, 26, '在 Isaac Lab 里程序化生成成千上万扇门', 'demo-x-ink2', 13.5));
    var cFly = projClip(s, 'sim_fly', 24, 44, 380, 214, '项目页视频：并行训练的环境，每个环境一扇门');
    var cDoors = projClip(s, 'sim_doors', 24, 44, 380, 214, '项目页视频：程序化生成的门');
    var fig = paperPart(s, 'fig4', 0, 0, 1, 1, 24, 290, 380, '论文图 4：程序化生成的门（最后一张没上材质）');
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '每个并行环境一扇不一样的门', 'demo-x-ink', 14);
    /* 6 × 3 个并行环境，每格一扇门：颜色、宽窄、把手在哪一边隔一会儿就换 */
    var envDoors = [];
    for (var e = 0; e < 18; e++) {
      var ex = R + (e % 6) * 58, ey = 80 + Math.floor(e / 6) * 54, eg = group(p1);
      rectBox(eg, ex, ey, 52, 48, C_BORDER, C_SURFACE2);
      var dr = svgEl('rect', { x: ex + 16, y: ey + 8, width: 20, height: 36, rx: 2 });
      eg.appendChild(dr);
      var dh = dotAt(eg, ex + 32, ey + 28, 2.4, C_INK);
      envDoors.push({ dr: dr, dh: dh, x: ex, y: ey });
    }
    label(p1, R, 260, '刻意不复刻任何真实场景：', 'demo-x-ink2', 12);
    label(p1, R, 282, '真机测试的地方，训练时都没见过', 'demo-x-ink2', 12);
    var p2 = group(s);
    label(p2, R, 64, '5 种门，3 大类', 'demo-x-ink', 14);
    var cats = ['推门：转把手，往前推开', '拉门：转把手，往回拉开', '推杠门：顶开弹簧门轴'].map(function (c, i) { var g = group(p2); chip(g, R, 80 + i * 40, W, c, C_DOOR, { size: 12, left: true, h: 30 }); return g; });
    /* 五种把手画成小图标 */
    var HK = ['圆球', '杠杆', '推杠', '拉手', '平板'], hIcons = HK.map(function (n, i) {
      var g = group(p2), cx = R + 34 + i * 70, cy = 222;
      rectBox(g, cx - 28, cy - 22, 56, 44, C_BORDER, C_SURFACE2);
      handleIcon(g, cx, cy, i);
      label(g, cx, cy + 40, n, 'demo-x-ink2', 11.5, 'middle');
      return g;
    });
    label(p2, R, 300, '左开 / 右开 · 往里 / 往外', 'demo-x-ink2', 11.5);
    var p3 = group(s);
    label(p3, R, 64, '尺寸、重量都随机（附录表 3）', 'demo-x-ink', 14);
    var rows3 = DOOR_RANGES.slice(0, 4).map(function (d, i) {
      var pad = (d[2] - d[1]) * 0.25;
      return rangeRow(p3, R, 92 + i * 34, W, d[0], d[1], d[2], d[1] - pad, d[2] + pad, function (v) { return (d[3] === 'kg' ? Math.round(v) : f2(v)) + ' ' + d[3]; }, C_DOOR);
    });
    var p4 = group(s);
    label(p4, R, 64, '真实的门闩', 'demo-x-ink', 14);
    var LX = R + 30, LY = 140;
    rectBox(p4, LX - 10, LY - 50, 120, 100, C_BORDER, C_SURFACE2);
    var lever = hline(p4, LX + 70, LY, LX + 70, LY, C_DOOR, 6);
    dotAt(p4, LX + 70, LY, 6, C_DOOR);
    var bolt = paint(svgEl('rect', { x: LX + 110, y: LY + 20, width: 24, height: 10, rx: 2 }), C_MUTED);
    p4.appendChild(bolt);
    label(p4, LX + 50, LY + 72, '门把一压，门闩缩回', 'demo-x-ink2', 11, 'middle');
    label(p4, R + 180, 104, '开门那一刻', 'demo-x-ink2', 12);
    label(p4, R + 180, 126, '全身受的力突然变化', 'demo-x-ink2', 12);
    var rows4 = DOOR_RANGES.slice(4).map(function (d, i) {
      return rangeRow(p4, R, 238 + i * 30, W, d[0], d[1], d[2], 0, d[2] * 1.15, function (v) { return f1(v) + ' ' + d[3]; }, C_PEN);
    });
    var p5 = group(s);
    label(p5, R, 64, '公开代码里的门：和论文对不上', 'demo-x-ink', 14);
    var flips12 = flipList(p5, R, 82, [['门的种类', '5 种', '默认 1 种'], ['门轴最大力', '20–30 N·m', '2.5–4.5'], ['门把预紧', '−5°', '−15°']], 100, 150);
    label(p5, R, 222, '代码默认：杠杆把手、门轴在右边、阻尼固定 50', 'demo-x-ink2', 11.5);
    label(p5, R, 244, '原因论文没说', 'demo-x-mut', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock), cs = K.clipSince(t, 0), sd = K.clipSince(t, 3.6);
      var flyOn = t < 3.6 + 0.3;
      cFly.at(cs, flyOn); cDoors.at(sd, !flyOn);
      setOpacity(cFly.g, 1 - seg(t, 3.6, 3.75)); setOpacity(cDoors.g, seg(t, 3.75, 3.9));
      var u12 = since(t, clock, 3.6);
      cats.forEach(function (g, i) { setOpacity(g, 0.3 + 0.7 * (Math.floor(u12 / 1.2) % 3 === i ? 1 : 0.4)); });
      hIcons.forEach(function (g, i) { setOpacity(g, 0.3 + 0.7 * (Math.floor(u12 / 0.8) % 5 === i ? 1 : 0.4)); });
      envDoors.forEach(function (d, e) {
        var k = Math.floor(now / 0.8 + rnd(e, 9) * 3), w = 14 + 12 * rnd(k, e + 3), left = rnd(k, e + 7) < 0.5;
        d.dr.setAttribute('x', (d.x + 26 - w / 2).toFixed(1)); d.dr.setAttribute('width', w.toFixed(1));
        d.dr.style.fill = 'hsl(' + Math.round(360 * rnd(k, e + 1)) + ', 45%, ' + Math.round(40 + 25 * rnd(k, e + 2)) + '%)';
        moveDot(d.dh, [d.x + 26 + (left ? -1 : 1) * (w / 2 - 4), d.y + 28]);
      });
      rows3.forEach(function (r, i) { r.at(now, 31 + i, 0.8); });
      rows4.forEach(function (r, i) { r.at(now, 41 + i, 0.8); });
      var ph = (now % 3) / 3, ang = ph < 0.4 ? ph / 0.4 : ph < 0.7 ? 1 : (1 - ph) / 0.3;
      var a = ang * 0.75;
      setLine(lever, LX + 70, LY, LX + 70 - 50 * Math.cos(a), LY + 50 * Math.sin(a));
      bolt.setAttribute('x', (LX + 110 - 16 * ang).toFixed(1));
      flips12.set(since(t, clock, 13.4));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
      void fig;
    }
    return { el: s, draw: draw };
  }

  /* ── scene 13: 视觉随机化 ── */
  function buildSceneVisual() {
    var s = sceneSvg('左上是项目页的仿真开门视频，同一段开门，材质和光照一直在换；左下一排小方块每隔一秒左右换一次颜色，示意随机抽的材质；' +
      '右边依次出现：PBR 材质；环境光贴图的计数从 0 数到 5233，太阳沿弧线走；运动模糊的残影；一台晃动的相机；代码里的图像增强');
    s.appendChild(svgText(24, 26, '视觉随机化：材质、环境光、渲染、相机', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'sim_tex', 24, 44, 380, 214, '项目页视频：同一段开门，材质和光照一直在换');
    label(s, 24, 300, '材质：每 0.9–1.1 s 换一次（示意）', 'demo-x-ink2', 11.5);
    var sw = [];
    for (var i = 0; i < 10; i++) { var r = svgEl('rect', { x: 24 + i * 38, y: 312, width: 32, height: 32, rx: 4 }); s.appendChild(r); sw.push(r); }
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, 'PBR 材质：所有表面都随机', 'demo-x-ink', 14);
    ['从 Isaac Lab 的 OmniPBR 材质里抽', '再变出子材质、纹理变换、反照率、色调', '每 0.9–1.1 秒，场景里某个几何体换一次'].forEach(function (l, i) { chip(p1, R, 80 + i * 40, W, l, C_ACCENT, { size: 11.5, left: true, h: 30 }); });
    var p2 = group(s);
    label(p2, R, 64, '环境光贴图：背景 + 光照', 'demo-x-ink', 14);
    var cnt = label(p2, R, 112, '', 'demo-x-ink', 30);
    label(p2, R, 140, 'Poly Haven 的 5233 张 + Omniverse 公开的', 'demo-x-ink2', 12);
    label(p2, R, 162, '室内、室外、一天中的不同时刻', 'demo-x-ink2', 12);
    var SKX = R + 260, SKY = 240;
    var arc2 = paint(svgEl('path', { d: 'M ' + (SKX - 70) + ' ' + SKY + ' A 70 70 0 0 1 ' + (SKX + 70) + ' ' + SKY, fill: 'none', 'stroke-width': 1.2, 'stroke-dasharray': '3 4' }), null, C_BORDER);
    p2.appendChild(arc2);
    hline(p2, SKX - 80, SKY, SKX + 80, SKY, C_BORDER, 1.4);
    var sun = dotAt(p2, SKX, SKY - 70, 9, C_WARN);
    var p3 = group(s);
    label(p3, R, 64, 'RTX 实时渲染（性能模式）', 'demo-x-ink', 14);
    label(p3, R, 92, '打开运动模糊、自动白平衡', 'demo-x-ink2', 12);
    var ghosts = [0.12, 0.22, 0.4, 1].map(function (o) { var r2 = paint(svgEl('rect', { x: 0, y: 150, width: 40, height: 40, rx: 6 }), C_DOOR); r2.style.opacity = o; p3.appendChild(r2); return r2; });
    label(p3, R, 226, '模拟腿式机器人上一直在晃的相机画面', 'demo-x-mut', 11.5);
    var p4 = group(s);
    label(p4, R, 64, '相机：对齐真机，再轻微随机', 'demo-x-ink', 14);
    var camG = group(p4);
    rectBox(camG, R + 120, 120, 90, 56, C_ACCENT, C_SURFACE);
    ringAt(camG, R + 165, 148, 18, C_ACCENT, 3);
    label(p4, R, 216, '内参、外参都按真机标定，再加一点扰动', 'demo-x-ink2', 12);
    label(p4, R, 238, '代码：挂在头部 d435_link，俯仰约 3.4°', 'demo-x-mut', 11.5);
    var p5 = group(s);
    label(p5, R, 64, '代码里还有图像增强（论文没提）', 'demo-x-ink', 14);
    var AUG = [['亮度', '0.7–2', 0.25], ['对比度', '0.5–1.5', 0.25], ['色相', '±0.1', 0.5], ['饱和度', '0.5–2', 0.25], ['高斯噪声', 'σ ≤ 0.15', 0.25], ['模糊', '核 3–5', 0.25]];
    /* 一张仿真画面的缩略图，依次套上六种增强（SVG 滤镜，参数在范围里来回变） */
    var defs = svgEl('defs', {});
    s.appendChild(defs);
    function fil(id, kids) {
      var f = svgEl('filter', { id: id, x: 0, y: 0, width: 1, height: 1, 'color-interpolation-filters': 'sRGB' });
      kids.forEach(function (k) { f.appendChild(k); });
      defs.appendChild(f);
      return f;
    }
    function ct(slope, icpt) {
      var c = svgEl('feComponentTransfer', {}), fs = ['feFuncR', 'feFuncG', 'feFuncB'].map(function (n) { var e = svgEl(n, { type: 'linear', slope: slope, intercept: icpt || 0 }); c.appendChild(e); return e; });
      return { node: c, set: function (sl, ic) { fs.forEach(function (e) { e.setAttribute('slope', sl.toFixed(3)); e.setAttribute('intercept', (ic || 0).toFixed(3)); }); } };
    }
    var fB = ct(1), fC = ct(1), fH = svgEl('feColorMatrix', { type: 'hueRotate', values: 0 }), fS = svgEl('feColorMatrix', { type: 'saturate', values: 1 });
    var fNt = svgEl('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.9, numOctaves: 1, seed: 3, result: 'n' });
    var fNc = svgEl('feColorMatrix', { in: 'n', type: 'saturate', values: 0, result: 'g' });
    var fNk = svgEl('feComposite', { in: 'SourceGraphic', in2: 'g', operator: 'arithmetic', k1: 0, k2: 1, k3: 0.3, k4: -0.15 });
    var fG = svgEl('feGaussianBlur', { stdDeviation: 0 });
    var FID = ['dm-aug-b', 'dm-aug-c', 'dm-aug-h', 'dm-aug-s', 'dm-aug-n', 'dm-aug-g'];
    fil(FID[0], [fB.node]); fil(FID[1], [fC.node]); fil(FID[2], [fH]); fil(FID[3], [fS]); fil(FID[4], [fNt, fNc, fNk]); fil(FID[5], [fG]);
    var thumb = svgEl('image', { href: PAPER_IMG_BASE + 'aug_input.webp', x: R, y: 80, width: 200, height: 112.5, preserveAspectRatio: 'xMidYMid slice' });
    p5.appendChild(thumb);
    rectBox(p5, R, 80, 200, 112, C_BORDER, 'none').style.fill = 'none';
    var augR = AUG.map(function (a, i) {
      var g = group(p5);
      label(g, R + 214, 94 + i * 20, a[0] + ' ' + a[1], 'demo-x-ink2', 11.5);
      return g;
    });
    label(p5, R, 214, '学生的输入：384 × 216（项目页视频的一帧）', 'demo-x-mut', 11);
    var augNow = label(p5, R, 240, '', 'demo-x-ink', 13);
    label(p5, R, 266, '每种增强各按一个概率抽到（25% 或 50%）', 'demo-x-mut', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      clip.at(K.clipSince(t, 0), true);
      sw.forEach(function (r2, j) {
        var k = Math.floor(now / (0.9 + 0.2 * rnd(j, 3)) + j * 0.37);
        r2.style.fill = 'hsl(' + Math.round(360 * rnd(k, j + 1)) + ', ' + Math.round(25 + 50 * rnd(k, j + 2)) + '%, ' + Math.round(35 + 35 * rnd(k, j + 5)) + '%)';
      });
      cnt.textContent = countTo(5233, seg(since(t, clock, 3.6), 0.3, 2.5));
      var a = Math.PI * (0.1 + 0.8 * ((now * 0.12) % 1));
      moveDot(sun, [SKX - 70 * Math.cos(a), SKY - 70 * Math.sin(a)]);
      var bx = R + 60 + 220 * (0.5 + 0.5 * Math.sin(now * 1.4));
      ghosts.forEach(function (g, j) { g.setAttribute('x', (bx - (3 - j) * 14 * Math.cos(now * 1.4)).toFixed(1)); });
      camG.setAttribute('transform', 'rotate(' + (4 * Math.sin(now * 3.1)).toFixed(2) + ' ' + (R + 165) + ' 148) translate(' + (3 * Math.sin(now * 2.3)).toFixed(1) + ' ' + (2 * Math.cos(now * 2.9)).toFixed(1) + ')');
      /* 每 1.5 s 换一种增强，参数在范围里来回变 */
      var ua = since(t, clock, 13.4), kA = Math.floor(ua / 1.5) % 6, wv = 0.5 - 0.5 * Math.cos(Math.PI * 2 * ((ua % 1.5) / 1.5));
      augR.forEach(function (g, j) { setOpacity(g, j === kA ? 1 : 0.35); });
      thumb.setAttribute('filter', 'url(#' + FID[kA] + ')');
      var val;
      if (kA === 0) { val = 0.7 + 1.3 * wv; fB.set(val, 0); augNow.textContent = '亮度 × ' + f2(val); }
      if (kA === 1) { val = 0.5 + 1.0 * wv; fC.set(val, 0.5 * (1 - val)); augNow.textContent = '对比度 × ' + f2(val); }
      if (kA === 2) { val = -0.1 + 0.2 * wv; fH.setAttribute('values', (val * 360).toFixed(1)); augNow.textContent = '色相 ' + sgn((val >= 0 ? '+' : '') + f2(val)); }
      if (kA === 3) { val = 0.5 + 1.5 * wv; fS.setAttribute('values', val.toFixed(3)); augNow.textContent = '饱和度 × ' + f2(val); }
      if (kA === 4) { val = 0.15 * wv; fNk.setAttribute('k3', (val * 2).toFixed(3)); fNk.setAttribute('k4', (-val).toFixed(3)); fNt.setAttribute('seed', String(1 + Math.floor(ua * 8) % 20)); augNow.textContent = '高斯噪声 σ = ' + f2(val); }
      if (kA === 5) { val = 3 + 2 * wv; fG.setAttribute('stdDeviation', ((val - 1) / 2).toFixed(2)); augNow.textContent = '模糊 核 ' + f1(val); }
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 14: 表 1：拿掉哪种随机化 ── */
  function buildSceneTable1() {
    var s = sceneSvg('照论文表 1 重画的分组条形图：六行是六种视觉随机化设置，每行三根条：蓝色推门、紫色拉门、绿色推杠门，条越长成功率越高；' +
      '条从左往右长出来；讲到哪两行的对比就亮哪两行，其余变淡');
    s.appendChild(svgText(24, 26, '论文表 1：视觉随机化拿掉哪一块，成功率掉多少', 'demo-x-ink2', 13.5));
    var LX = 24, BX0 = 196, BW = 330, GY = 40, GH = 60, BH = 12, BP = 20;
    var groups = TABLE1.map(function (row, i) {
      var g = group(s), y = GY + i * GH;
      label(g, LX, y + 16, row.n + '  ' + row.zh, 'demo-x-ink', 12);
      label(g, LX + 18, y + 36, row.dl ? '环境光 ✓' : '环境光 ✗', row.dl ? 'demo-x-ink2' : 'demo-x-mut', 10.5);
      var bars = row.v.map(function (v, j) {
        var b = paint(svgEl('rect', { x: BX0, y: y + 3 + j * BP, width: 0, height: BH, rx: 2 }), M_COLOR[['push', 'pull', 'bar'][j]]);
        g.appendChild(b);
        var tl = halo(label(g, BX0, y + 3 + j * BP + 11, '', 'demo-x-ink2', 11));
        return { b: b, t: tl, v: v };
      });
      return { g: g, bars: bars };
    });
    [0, 25, 50, 75, 100].forEach(function (v) {
      var x = BX0 + v / 100 * BW;
      hline(s, x, GY - 4, x, GY + 6 * GH - 4, C_BORDER, 0.8, '3 4');
      label(s, x, GY + 6 * GH + 10, v + '%', 'demo-x-ink2', 10, 'middle');
    });
    legendRow(s, 380, 26, DOORS.map(function (d, j) { return [d, M_COLOR[['push', 'pull', 'bar'][j]], textW(d, 11.5)]; }), 11.5);
    var R = 584, W = 192;
    readHint(s, R, 300, '每组三根条，条越长越好', 11.5, W);
    label(s, R, 322, '每种设置在仿真里测 120 次', 'demo-x-mut', 11.5);
    label(s, R, 342, '门的外观都没见过', 'demo-x-mut', 11.5);
    function panel(lines) {
      var g = group(s);
      lines.forEach(function (l, i) { rich(g, R, 64 + i * 24, l, i ? 12 : 13.5, i ? 'demo-x-ink2' : 'demo-x-ink', 'start', W); });
      return g;
    }
    var p1 = panel(['只改视觉随机化', '物理随机化不变', '从「不随机」开始', '逐步加纹理、环境光']);
    var p2 = panel(['最好 vs 最差', '第 6 组：**81–86%**', '全部纹理 + 环境光', '第 1 组：**5–20%**', '灰色材质，只剩几何']);
    var p3 = panel(['去掉环境光（6 → 5）', '推门 −12.5', '拉门 **−25.0**', '推杠门 −8.3', '拉门最长、最难']);
    var p4 = panel(['只用 10% 的纹理（6 → 4）', '推门 −6.6', '拉门 −3.3', '推杠门 −7.5', '正文：只掉 4–8%']);
    var p5 = panel(['纯色 + 环境光（第 2 组）', '**66–70%**', '早期域随机化的做法', '和 85% 左右的差距：', '归功于高保真渲染']);
    var HL = [null, [0, 5], [4, 5], [3, 5], [1, 5]];
    function draw(t, clock) {
      var u = seg(since(t, clock, 0.4), 0.3, 2.3);
      var pn = t < 3.6 ? 0 : t < 7.0 ? 1 : t < 10.4 ? 2 : t < 13.4 ? 3 : 4, hl = HL[pn];
      groups.forEach(function (gr, i) {
        setOpacity(gr.g, !hl || hl.indexOf(i) >= 0 ? 1 : 0.28);
        gr.bars.forEach(function (b) {
          var w = b.v / 100 * BW * u;
          setW(b.b, w);
          b.t.setAttribute('x', (BX0 + w + 4).toFixed(1));
          b.t.textContent = u > 0.95 ? f1(b.v) : '';
        });
      });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 15: 真机：比遥操作快（图 5） ── */
  var TELEOP_PARTS = [[10.033, '遥操作：抓不住门把'], [10.0, '遥操作：穿门时摔倒']];
  function buildSceneTeleop() {
    var s = sceneSvg('左边是项目页的遥操作视频，按顺序放两段：操作员抓不住门把、机器人穿门时失去平衡摔倒；右边依次出现：遥操作基线的设置；' +
      '照论文图 5 重画的成功率条形图（绿 DoorMan、蓝专家、灰新手，越长越好）；平均用时条形图（越短越好）；快了多少；为什么');
    s.appendChild(svgText(24, 26, '真机：和人遥操作比（论文图 5）', 'demo-x-ink2', 13.5));
    var clip = seqClip(s, 'teleop', 24, 44, 380, 214, '项目页视频：人戴头显遥操作，用的是同一个 HOMIE', TELEOP_PARTS);
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '遥操作基线（附录 C）', 'demo-x-ink', 14);
    /* 两条链：头和手腕的位姿 → 逆向运动学 → 手臂；摇杆 → 同一个 HOMIE → 腿 */
    var TB = [[R, 96, 'PICO 头显 + 手柄'], [R + 128, 96, 'Pinocchio 逆运动学'], [R + 268, 96, '手臂关节'], [R, 160, '手柄摇杆'], [R + 128, 160, '同一个 HOMIE'], [R + 268, 160, '腿']];
    TB.forEach(function (b, i) { chip(p1, b[0], b[1], i % 3 === 2 ? 84 : 116, b[2], i === 4 ? C_CMD : C_ACCENT, { size: 11.5, h: 30 }); });
    label(p1, R, 86, '头和两只手腕的位姿', 'demo-x-mut', 11);
    label(p1, R, 150, '速度命令', 'demo-x-mut', 11);
    var tf = [0, 1, 2, 3].map(function () { return flowSeg(p1, C_ACCENT, 2, 3, 26); });
    label(p1, R, 230, '新手：不到 1 天；专家：全职 3 个月以上', 'demo-x-ink2', 12);
    function bars(g, key, unit, maxV, y0) {
      return FIG5.map(function (f, i) { return { r: barRowAt(g, R, y0 + i * 34, 86, f.zh, M_COLOR[f.key], 20, 11.5), v: f[key] }; });
    }
    var p2 = group(s);
    label(p2, R, 64, '成功率（所有门的平均）', 'demo-x-ink', 14);
    readHint(p2, R, 86, '条越长越好', 10.5);
    var sb = bars(p2, 'succ', '%', 100, 102);
    label(p2, R, 222, '和专家持平；正文说比新手好 28%', 'demo-x-ink2', 12);
    label(p2, R, 244, '（(83 − 60) / 83 = 27.7%）', 'demo-x-mut', 11);
    var p3 = group(s);
    label(p3, R, 64, '开完一扇门的平均用时', 'demo-x-ink', 14);
    readHint(p3, R, 86, '条越短越好（秒）', 10.5);
    var tb = bars(p3, 'time', 's', 25, 102);
    var p4 = group(s);
    label(p4, R, 64, '快了多少：三个人同时开一扇门', 'demo-x-ink', 14);
    /* 三条跑道：小点按各自的平均用时跑到终点（放快 5 倍），旁边的表按真实秒数走 */
    var TX0 = R + 86, TX1 = R + 300, race = FIG5.map(function (f, i) {
      var y = 92 + i * 30;
      label(p4, TX0 - 8, y + 4, f.zh, 'demo-x-ink2', 11.5, 'end');
      hline(p4, TX0, y, TX1, y, C_BORDER, 3);
      var d = dotAt(p4, TX0, y, 7, M_COLOR[f.key]);
      var tt = label(p4, TX1 + 10, y + 4, '', 'demo-x-ink', 11.5);
      return { d: d, tt: tt, f: f, y: y };
    });
    hline(p4, TX1, 78, TX1, 166, C_INK, 1.6, '4 3');
    var fast1 = rich(p4, R, 200, '比专家快 **23.1%**（4.62 s）', 13), fast2 = rich(p4, R, 226, '比新手快 **31.7%**（7.15 s）', 13);
    label(p4, R, 258, '正文另一处写 23.8%，按图上的数应是 23.1%', 'demo-x-mut', 11.5);
    label(p4, R, 280, '论文没写真机每种门试了多少次', 'demo-x-mut', 11.5);
    var p5 = group(s);
    label(p5, R, 64, '为什么人反而慢', 'demo-x-ink', 14);
    ['感觉不到门把和门轴的弹簧有多大劲', '拿不准机器人该往前倾多少', '跟不上门板绕轴转的圆弧'].forEach(function (l, i) { chip(p5, R + 48, 80 + i * 40, W - 48, l, C_MUTED, { size: 11.5, left: true, h: 30 }); rectBox(p5, R, 80 + i * 40, 40, 30, C_BORDER, C_SURFACE2); });
    /* 三个小图标：弹簧一伸一缩、身体前后晃、小点沿圆弧走 */
    var why1 = pathLine(p5, [], C_DOOR, 1.8), why2 = hline(p5, R + 20, 146, R + 20, 124, C_INK, 3), why3d = dotAt(p5, R + 20, 160, 3.5, C_STU);
    pathLine(p5, Array.from({ length: 13 }, function (_, k) { var a = Math.PI * (0.15 + 0.7 * k / 12); return [R + 20 - 14 * Math.cos(a), 186 - 14 * Math.sin(a)]; }), C_BORDER, 1.2, '2 3');
    rich(p5, R, 222, 'VR 遥操作给不了这些反馈，**仿真里能学到**', 12.5);
    function draw(t, clock) {
      clip.at(K.clipSince(t, 0), true);
      var u2 = seg(since(t, clock, 3.6), 0.3, 1.8), u3 = seg(since(t, clock, 7.0), 0.3, 1.8);
      sb.forEach(function (b) { b.r.set(b.v / 100 * 230 * u2, Math.round(b.v * u2) + '%'); });
      tb.forEach(function (b) { b.r.set(b.v / 25 * 230 * u3, f2(b.v * u3) + ' s'); });
      var now = nowOf(t, clock);
      tf[0].at(now, [R + 118, 111], [R + 126, 111], true); tf[1].at(now, [R + 246, 111], [R + 266, 111], true);
      tf[2].at(now, [R + 118, 175], [R + 126, 175], true); tf[3].at(now, [R + 246, 175], [R + 266, 175], true);
      /* 赛跑：每 6 s 一轮，放快 5 倍 */
      var ur = (since(t, clock, 10.4) % 6) * 5;
      race.forEach(function (r) {
        var u = clamp(ur / r.f.time, 0, 1);
        moveDot(r.d, [TX0 + (TX1 - TX0) * u, r.y]);
        r.tt.textContent = u >= 1 ? f2(r.f.time) + ' s' : f1(ur) + ' s';
      });
      var fin = since(t, clock, 10.4) > 22.55 / 5;
      fast1.style.opacity = fin ? 1 : 0.15; fast2.style.opacity = fin ? 1 : 0.15;
      /* 为什么慢的三个小图标 */
      var ph = now % 2, sq = 0.5 + 0.5 * Math.cos(Math.PI * ph), zz = [];
      for (var q = 0; q <= 8; q++) zz.push([R + 8 + q * 3 * (0.6 + 0.4 * sq), 95 + (q % 2 ? -6 : 6) * (q > 0 && q < 8 ? 1 : 0)]);
      setPath(why1, zz);
      var lean = 0.35 * Math.sin(now * 2.2);
      setLine(why2, R + 20, 146, R + 20 + 22 * Math.sin(lean), 146 - 22 * Math.cos(lean));
      var aa = Math.PI * (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(now * 1.6)));
      moveDot(why3d, [R + 20 - 14 * Math.cos(aa), 186 - 14 * Math.sin(aa)]);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 16: 泛化与失败 ── */
  var HANDLE_PARTS = [[5, '把手 1'], [5, '把手 2'], [5, '把手 3']];
  var PANEL_PARTS = [[6, '墙面 1：绿'], [6, '墙面 2：蓝 + 黄'], [6, '墙面 3：紫 + 青']];
  var FAIL_PARTS = [[9.533, '失败 1：被门框挡住'], [8.367, '失败 2：抓了个空'], [9.667, '失败 3：门本来就虚掩着']];
  /* 分镜按片段长度排：换把手 0.4–15.4（15 s），换墙面 15.4–33.4（18 s），失败 33.4–61.0（27.6 s），每段片段放完再换（HDMI 2026-10-26 看片反馈） */
  var T16 = { h: 0.4, p: 15.4, f: 33.4, f2: 42.93, f3: 51.3, sum: 60.97 };
  function buildSceneGeneral() {
    var s = sceneSvg('左边按讲到的内容换片段，每段放完再换：先是换把手的第一视角（三段），再是换墙面颜色（三段），最后是项目页的三个失败案例；' +
      '右边依次出现：论文图 1 的把手一排；仿真里程序生成的五种把手和真机的把手；图 1 的墙面一排和三对颜色；三个失败各自的小动画：俯视的 G1 模型被门框挡住、G1 右手的模型抓空、门本来虚掩着');
    s.appendChild(svgText(24, 26, '真机泛化与失败（论文图 1、项目页）', 'demo-x-ink2', 13.5));
    var cH = seqClip(s, 'handles', 24, 44, 380, 214, '项目页视频：换把手（第一视角）', HANDLE_PARTS);
    var cP = seqClip(s, 'panels', 24, 44, 380, 214, '项目页视频：换墙面', PANEL_PARTS);
    var cF = seqClip(s, 'fail', 24, 44, 380, 214, '项目页视频：失败案例', FAIL_PARTS);
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '换把手：外观和形状都不一样', 'demo-x-ink', 14);
    paperPart(p1, 'fig1', 0, 0.035, 1, 0.305, R, 84, W, '论文图 1 上面一排：不同的把手');
    var p2 = group(s);
    label(p2, R, 64, '训练时一个都没见过', 'demo-x-ink', 14);
    label(p2, R, 88, '仿真里只有程序生成的 5 种：', 'demo-x-ink2', 12);
    var hk2 = ['圆球', '杠杆', '推杠', '拉手', '平板'].map(function (n, i) {
      var g = group(p2), cx = R + 34 + i * 70, cy = 122;
      rectBox(g, cx - 28, cy - 20, 56, 40, C_BORDER, C_SURFACE2);
      handleIcon(g, cx, cy, i);
      label(g, cx, cy + 36, n, 'demo-x-ink2', 11.5, 'middle');
      return g;
    });
    label(p2, R + W / 2, 196, '≠', 'demo-x-ink', 22, 'middle');
    paperPart(p2, 'fig1', 0, 0.035, 1, 0.305, R, 214, W, '真机：论文图 1 里的把手');
    var p3 = group(s);
    label(p3, R, 64, '换墙面：门两边挂上不同颜色的布', 'demo-x-ink', 14);
    paperPart(p3, 'fig1', 0, 0.36, 1, 0.625, R, 84, W, '论文图 1 第二排：不同的墙面');
    var PAIRS = [['#5bbf3a', '#5bbf3a', '绿'], ['#2f45c8', '#e3c935', '蓝 + 黄'], ['#a35bd8', '#4fd2d6', '紫 + 青']];
    var pairs = PAIRS.map(function (pc, i) {
      var g = group(p3), x = R + i * 120;
      rectBox(g, x, 196, 108, 52, C_BORDER, C_SURFACE2);
      g.appendChild(svgEl('rect', { x: x + 10, y: 204, width: 18, height: 36, rx: 2, fill: pc[0] }));
      g.appendChild(svgEl('rect', { x: x + 36, y: 204, width: 36, height: 36, rx: 2, fill: '#d9d4c8' }));
      g.appendChild(svgEl('rect', { x: x + 80, y: 204, width: 18, height: 36, rx: 2, fill: pc[1] }));
      label(g, x + 54, 268, '第 ' + (i + 1) + ' 段：' + pc[2], 'demo-x-ink2', 11.5, 'middle');
      return g;
    });
    var p4 = group(s);
    label(p4, R, 64, '项目页的三个失败案例（论文正文没提）', 'demo-x-ink', 14);
    var FROW = [['① 走到一半，被门框挡住', '没观测到的扰动'], ['② 手伸过去，抓了个空', '距离估计误差'], ['③ 门本来就虚掩着', '没建模的环境状态']];
    var frows = FROW.map(function (f, i) {
      var g = group(p4), y = 80 + i * 76;
      var box = rectBox(g, R, y, 110, 66, C_BORDER, C_SURFACE2);
      label(g, R + 122, y + 26, f[0], 'demo-x-ink', 12.5);
      var cat = label(g, R + 122, y + 50, '→ ' + f[1], 'demo-x-ink2', 11.5);
      return { g: g, box: box, cat: cat, y: y };
    });
    /* ① 俯视：墙上一道门，机器人从下往上走，偏左，肩膀撞上左边门框 */
    var a1 = frows[0].y, wallY = a1 + 22;
    hline(p4, R + 6, wallY, R + 38, wallY, C_MUTED, 4); hline(p4, R + 72, wallY, R + 104, wallY, C_MUTED, 4);
    var bot1 = g1Top(p4), hit1 = ringAt(p4, 0, 0, 7, C_BAD, 2.2);
    /* ② 侧视：门把在上面，手伸到估计的位置（低了一截），中间一条虚线是估错的距离 */
    var a2 = frows[1].y;
    hline(p4, R + 84, a2 + 6, R + 84, a2 + 62, C_DOOR, 3);
    var knob2 = dotAt(p4, R + 76, a2 + 24, 5, C_DOOR);
    var hand2 = g1Hand(p4);
    var err2 = hline(p4, R + 76, a2 + 24, R + 76, a2 + 42, C_BAD, 1.6, '3 3');
    void knob2;
    /* ③ 俯视：训练时门总是关着（虚线），真机上门本来就开了一条缝（实线，轻轻晃） */
    var a3 = frows[2].y, hx3 = R + 22, hy3 = a3 + 40;
    hline(p4, R + 6, hy3, hx3, hy3, C_MUTED, 4);
    hline(p4, hx3, hy3, hx3 + 70, hy3, C_MUTED, 1.6, '4 3');
    label(p4, hx3 + 74, hy3 + 14, '训练时', 'demo-x-mut', 11, 'end');
    var door3 = hline(p4, hx3, hy3, hx3 + 70, hy3, C_DOOR, 4);
    dotAt(p4, hx3, hy3, 3.5, C_MUTED);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var hOn = t < T16.p + 0.3, pOn = t >= T16.p + 0.3 && t < T16.f + 0.3, fOn = t >= T16.f + 0.3;
      cH.at(K.clipSince(t, T16.h), hOn);
      var sp = K.clipSince(t, T16.p);
      cP.at(sp, pOn);
      var sf = K.clipSince(t, T16.f);
      cF.at(sf, fOn);
      /* 先淡出再淡入，两层字幕不叠在一起 */
      setOpacity(cH.g, 1 - seg(t, T16.p, T16.p + 0.15));
      setOpacity(cP.g, seg(t, T16.p + 0.15, T16.p + 0.3) * (1 - seg(t, T16.f, T16.f + 0.15)));
      setOpacity(cF.g, seg(t, T16.f + 0.15, T16.f + 0.3));
      /* 换墙面：放到第几段就亮第几对颜色 */
      var pk = Math.min(2, Math.floor(Math.max(0, sp % 18) / 6));
      pairs.forEach(function (g, i) { setOpacity(g, i === pk ? 1 : 0.3); });
      hk2.forEach(function (g, i) { setOpacity(g, 0.35 + 0.65 * (Math.floor(since(t, clock, 7.8) / 0.8) % 5 === i ? 1 : 0.5)); });
      /* 失败：放到第几个案例就亮第几行，最后一段三行都亮、类别加粗 */
      var fk = t >= T16.sum ? -1 : sf % 27.567 < 9.533 ? 0 : sf % 27.567 < 17.9 ? 1 : 2;
      frows.forEach(function (r, i) {
        var on = fk < 0 || fk === i;
        setOpacity(r.g, on ? 1 : 0.35);
        r.box.style.stroke = fk === i ? C_BAD : '';
        r.cat.style.fontWeight = fk < 0 ? 700 : 400;
      });
      /* ① 每 3 s 一轮：走到门框高度时撞上、变红、停住 */
      /* 机器人比门洞中线偏左 11 px：左肩（离根部约 0.17 m）走到墙线就撞上 */
      var u1 = (now % 3) / 3, yy = a1 + 58 - 32 * Math.min(1, u1 / 0.6), hit = u1 >= 0.6;
      bot1.put(R + 44, yy, 70, 0);
      moveDot(hit1, [R + 44 - 12, wallY]);
      hit1.style.opacity = hit ? 1 : 0;
      /* ② 手伸向估计的位置，比门把低了 18 px，合拢时抓空 */
      var u2 = (now % 2.6) / 2.6, hxp = R + 44 + 32 * Math.min(1, u2 / 0.6);
      /* G1 右手的模型：指尖一侧对准估计的位置，到了以后合拢、抓空 */
      hand2.put(hxp - 36, a2 + 30, 0.18, seg(u2, 0.62, 0.8));
      err2.style.opacity = u2 > 0.6 ? 1 : 0;
      /* ③ 虚掩的门在 15°–25° 之间轻轻晃 */
      var ang3 = (20 + 5 * Math.sin(now * 1.8)) * Math.PI / 180;
      setLine(door3, hx3, hy3, hx3 + 70 * Math.cos(ang3), hy3 - 70 * Math.sin(ang3));
      setOpacity(p1, win(t, 0.3, 7.8));
      setOpacity(p2, win(t, 7.8, T16.p));
      setOpacity(p3, win(t, T16.p, T16.f));
      setOpacity(p4, win(t, T16.f));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 17: 局限与代码 ── */
  function buildSceneLimits() {
    var s = sceneSvg('左边是官方仓库 doorman 分支的目录，一行一行长出来；右边依次出现：30 个小格逐个点亮表示 30 项奖励；只做了开门、真机统计少；' +
      '公开代码里有什么、没什么（打勾和打叉）；论文和代码对不上的四处，卡片在论文值和代码值之间来回翻；论文的展望');
    s.appendChild(svgText(24, 26, '局限与代码', 'demo-x-ink2', 13.5));
    rectBox(s, 24, 44, 380, 300, C_BORDER, C_SURFACE2);
    var TREE = [['GR00T-VisualSim2Real（doorman 分支）', ''], ['├ env/door_open_homie.yaml', '阶段预算、重置比例'], ['├ rewards/…/reward_door_open_homie', '表 2 的权重'],
      ['├ envs/door/door_open_homie.py', '六个阶段'], ['├ base_task/staged_task_base.py', '快照与重置'], ['├ base_task/delta_action_base.py', '增量动作'],
      ['├ base_task/homie_base.py', '接 HOMIE'], ['├ env_rand/door.py', '门的生成'], ['└ trl/trainer/', 'PPO、DAgger']];
    var tree = TREE.map(function (r, i) {
      var g = group(s);
      label(g, 36, 72 + i * 32, r[0], i ? 'demo-x-ink2' : 'demo-x-ink', i ? 11 : 12);
      if (r[1]) label(g, 392, 72 + i * 32, r[1], 'demo-x-mut', 10, 'end');
      return g;
    });
    var R = 424, W = 352;
    var p1 = group(s);
    label(p1, R, 64, '奖励设计很繁琐', 'demo-x-ink', 14);
    var cells = cellGrid(p1, R, 80, REWARD_TERMS, 10, 26, 6, C_TEA);
    var cTxt = label(p1, R, 196, '', 'demo-x-ink', 13);
    label(p1, R, 220, '还要配六个阶段的进阶条件和时间预算', 'demo-x-ink2', 12);
    label(p1, R, 242, '换一个任务，要从头再写一套', 'demo-x-mut', 11.5);
    var p2 = group(s);
    label(p2, R, 64, '只验证了开门一个任务', 'demo-x-ink', 14);
    /* 四个铰接物体的小图标：门打勾，抽屉、冰箱门、闸门是问号 */
    var TASKS = ['门', '抽屉', '冰箱门', '闸门'], taskG = TASKS.map(function (n, i) {
      var g = group(p2), x = R + i * 88, y = 78;
      rectBox(g, x, y, 76, 64, i ? C_BORDER : C_STU, C_SURFACE2);
      if (i === 0) { rectBox(g, x + 26, y + 10, 24, 44, C_DOOR, 'none'); dotAt(g, x + 45, y + 34, 2.5, C_DOOR); }
      if (i === 1) { [0, 1, 2].forEach(function (k) { rectBox(g, x + 14, y + 10 + k * 15, 48, 12, C_MUTED, 'none'); hline(g, x + 32, y + 16 + k * 15, x + 44, y + 16 + k * 15, C_MUTED, 2); }); }
      if (i === 2) { rectBox(g, x + 22, y + 8, 32, 48, C_MUTED, 'none'); hline(g, x + 22, y + 24, x + 54, y + 24, C_MUTED, 1.6); hline(g, x + 48, y + 12, x + 48, y + 20, C_MUTED, 2); hline(g, x + 48, y + 30, x + 48, y + 44, C_MUTED, 2); }
      if (i === 3) { hline(g, x + 8, y + 14, x + 56, y + 14, C_MUTED, 2); hline(g, x + 8, y + 54, x + 56, y + 54, C_MUTED, 2); [0, 1, 2, 3, 4].forEach(function (k) { hline(g, x + 12 + k * 10, y + 14, x + 12 + k * 10, y + 54, C_MUTED, 2); }); }
      label(g, x + 38, y + 82, n, 'demo-x-ink2', 11.5, 'middle');
      if (i === 0) tick(g, x + 56, y + 4, 14, C_STU); else label(g, x + 67, y + 22, '?', 'demo-x-ink', 15, 'middle');
      return g;
    });
    label(p2, R, 196, '真机只有三个平均数（图 5）', 'demo-x-ink', 14);
    var avg5 = FIG5.map(function (f, i) { return barRowAt(p2, R, 208 + i * 24, 86, f.zh, M_COLOR[f.key], 16, 11.5); });
    label(p2, R, 296, '没写试了多少次、每类门的成功率；表 1、图 6 都在仿真里', 'demo-x-mut', 11.5);
    var p3 = group(s);
    label(p3, R, 64, '公开代码里有什么', 'demo-x-ink', 14);
    var HAVE = [['教师 PPO（六个阶段、分阶段重置）', true], ['学生 DAgger（ResNet18 + LSTM）', true], ['门的程序化生成', true], ['GRPO 自举', false], ['训好的 DoorMan 模型', false]];
    var haveM = HAVE.map(function (h, i) {
      var g = group(p3);
      label(g, R + 30, 98 + i * 30, h[0], 'demo-x-ink2', 12);
      return h[1] ? tick(g, R, 86 + i * 30, 15, C_GOOD) : cross(g, R + 2, 87 + i * 30, 12, C_BAD);
    });
    var p4 = group(s);
    label(p4, R, 64, '论文和代码对不上的地方', 'demo-x-ink', 14);
    var flips = flipList(p4, R, 82, [['动作维数', '33（应为 43）', '19'], ['接触力', '18 × 6', '16 × 3'], ['LSTM 每层', '512', '256'], ['每阶段快照', '100', '200']], 110, 150);
    var p5 = group(s);
    label(p5, R, 64, '论文的展望', 'demo-x-ink', 14);
    chip(p5, R, 82, W, '用高容量的行为克隆教师，代替手写的奖励', C_STU, { size: 12, left: true, h: 32 });
    chip(p5, R, 124, W, '把这套框架推广到更多日常的全身交互', C_STU, { size: 12, left: true, h: 32 });
    label(p5, R, 190, '同一个仓库的 main 分支是同组的 VIRAL', 'demo-x-mut', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      tree.forEach(function (g, i) { setOpacity(g, seg(t, 0.4 + i * 0.35, 0.7 + i * 0.35)); });
      var n = Math.round(REWARD_TERMS * seg(since(t, clock, 0.4), 0.3, 2.3));
      cells.fill(n);
      cTxt.textContent = n + ' 项奖励（附录表 2）';
      haveM.forEach(function (m, i) { m.style.opacity = seg(t, 7.4 + i * 0.4, 7.7 + i * 0.4); });
      flips.set(since(t, clock, 10.4));
      var u2 = since(t, clock, 3.6);
      taskG.forEach(function (g, i) { setOpacity(g, seg(u2, 0.3 + i * 0.4, 0.6 + i * 0.4)); });
      avg5.forEach(function (b, i) { var w = FIG5[i].succ / 100 * 200 * seg(u2, 2.2 + i * 0.2, 3.2 + i * 0.2); b.set(w, w > 0 ? Math.round(FIG5[i].succ * w / (FIG5[i].succ / 100 * 200)) + '%' : ''); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  var DOORMAN_SCENES = [
    {
      title: '开门：人形的硬骨头',
      dur: 16,
      build: buildSceneIntro,
      cues: [
        { at: 0.4, s: '人形会打功夫、翻跟头，却还不能只靠 **RGB** 自己开门。' },
        { at: 3.6, s: '开门要同时做到四件事：找门把、转把手、跟着圆弧推、保持平衡。' },
        { at: 7.0, s: '以前的系统靠深度、动作原语、钩子、准确定位或动捕，都不是纯 RGB。' },
        { at: 10.4, s: '两个挑战：算法要扛得住**部分可观**；视觉的 sim-to-real 鸿沟太大。' },
        { at: 13.4, s: '**DoorMan**：全程仿真数据，真机零样本；NVIDIA 等，CVPR 2026。' }
      ]
    },
    {
      title: '三个阶段（图 2）',
      dur: 16,
      build: buildScenePipeline,
      cues: [
        { at: 0.4, s: '三步都在 Isaac Lab 里：教师强化学习 → 学生蒸馏 → 学生自举。' },
        { at: 3.6, s: '① 教师：PPO + 特权观测 + 分阶段奖励；1 张 L40S，6 小时。' },
        { at: 7.0, s: '② 学生：DAgger，只看 RGB 和本体；32 张 L40S，24 小时。' },
        { at: 10.4, s: '③ 学生：GRPO，只用「成功没有」接着练；64 张 L40S，12 小时。' },
        { at: 13.4, s: '算力：6 对 768 对 768 GPU 小时；项目页说 GRPO 提高 20–30%。' }
      ]
    },
    {
      title: '站在 HOMIE 上：输出 19 维',
      dur: 16,
      build: buildSceneAction,
      cues: [
        { at: 0.4, s: '论文：要输出 29 + 14 个关节角，还要 50 Hz、自己平衡 → 建在 HOMIE 上。' },
        { at: 3.6, s: '代码：只出 **19 维**：速度命令 3 + 两臂 14 + 手指原语 2；腿归 HOMIE。' },
        { at: 7.0, s: '增量设定点：$c_t = c_{t-1} + 0.3\\,a_t$，截到 ±15；速度命令是 $0.25\,c_t$。' },
        { at: 10.4, s: '手指原语：每只手 7 个关节，只在张开 $p_0$ 和握住 $p_1$ 之间插值。' },
        { at: 13.4, s: '两个 HOMIE 模型按命令大小切换；人遥操作的基线也用同一个 HOMIE。' }
      ]
    },
    {
      title: '特权教师看什么',
      dur: 16,
      build: buildSceneTeacher,
      cues: [
        { at: 0.4, s: '教师看得到：根部到门 $\\xi_{RD}$、手到门把、手上接触力、根部线速度。' },
        { at: 3.6, s: '代码里一共 **246 维**：关节、动作、接触力、门的参数、阶段……' },
        { at: 7.0, s: '接触力：论文写 18 × 6，代码是每只手 8 个刚体、各 3 维，共 48。' },
        { at: 10.4, s: '网络：LSTM 两层各 256，接 MLP 512 / 256 / 128；PPO 训练。' },
        { at: 13.4, s: '部署时这些一个都没有，只能交给看 RGB 的学生自己推断。' }
      ]
    },
    {
      title: '六个阶段，各有奖励',
      dur: 16,
      build: buildSceneStages,
      cues: [
        { at: 0.4, s: '开门拆成六个阶段：走近、预抓、抓住、开门、推开、穿过去。' },
        { at: 3.6, s: '走近：朝门走 +5；预抓：手到预抓点 +6，**站稳别走 −15**。' },
        { at: 7.0, s: '抓住：手指握拢 +3；开门：门把、门轴转动各 +6，推力 +0.3。' },
        { at: 10.4, s: '推开、穿过：往目标走 +12；全程：终止 −1000、完成 +4。' },
        { at: 13.4, s: '代码：每个阶段有进阶条件和时间预算，共 17 s，超时就重置。' }
      ]
    },
    {
      title: '卡在「抓门把」',
      dur: 16,
      build: buildSceneStuck,
      cues: [
        { at: 0.4, s: '开门要精细操作、接触又多：RL 很难稳定地往后面的阶段探索。' },
        { at: 3.6, s: '抓住了却不会转：力矩过大、接触力尖峰、甚至摔倒，都要挨罚。' },
        { at: 7.0, s: '于是策略「学回去」：躲着门把，不进下一阶段。' },
        { at: 10.4, s: '阶段之间是窄桥，通过的概率 $p_{\\text{bridge}} \\ll 1$。' },
        { at: 13.4, s: '后面的阶段几乎采不到样本，长时程的信用分配做不好。' }
      ]
    },
    {
      title: '分阶段重置（图 3）',
      dur: 16,
      build: buildSceneReset,
      cues: [
        { at: 0.4, s: '一进到新阶段，就把整个仿真状态存成快照。' },
        { at: 3.6, s: '重置时按比例抽起点：代码里 50% 从头，其余五个阶段各 10%。' },
        { at: 7.0, s: '起点变成混合分布 $\\tilde\\rho_\\alpha=\\sum_y \\alpha_y\\rho_y$；没有快照的阶段权重为 0。' },
        { at: 10.4, s: '玩具链上：阶段 5 的样本从 1.5% 涨到 22%，约 15 倍。' },
        { at: 13.4, s: '只改起点、不改奖励；代码每个阶段存 200 张（论文写 100）。' }
      ]
    },
    {
      title: '图 6 右：缓冲区多大',
      dur: 16,
      build: buildSceneBuffer,
      cues: [
        { at: 0.4, s: '横轴：迭代次数；纵轴：平均能到达的最远阶段，越高越好。' },
        { at: 3.6, s: '缓冲区 100：500 次内到 3.7 左右，约 1700 次到达全部阶段。' },
        { at: 7.0, s: '缓冲区 10：前 1500 次停在 0.94，要四千多次才探索完。' },
        { at: 10.4, s: '不用缓冲区：一直进不了阶段 2，到第 3800 次只有 1.25。' },
        { at: 13.4, s: '三组奖励完全相同，差别全来自重置的起点。' }
      ]
    },
    {
      title: '学生只看 RGB：DAgger',
      dur: 16,
      build: buildSceneStudent,
      cues: [
        { at: 0.4, s: '学生只有头部 RGB 和本体感受；门的位姿、接触力都看不到。' },
        { at: 3.6, s: 'ResNet18 编码图像，接上本体特征，进两层 LSTM 和 MLP。' },
        { at: 7.0, s: 'DAgger：学生自己开车，教师在学生走到的状态上给答案。' },
        { at: 10.4, s: '行为克隆只在教师的状态上学；DAgger 在学生自己的状态上监督。' },
        { at: 13.4, s: '论文写 LSTM 512，代码是 256；代码还有图像增强和辅助头。' }
      ]
    },
    {
      title: '部分可观与 GRPO',
      dur: 16,
      build: buildSceneGRPO,
      cues: [
        { at: 0.4, s: '教师八到九成，DAgger 学生只有五到七成：看不见的信息补不回来。' },
        { at: 3.6, s: 'GRPO：去掉价值网络的 PPO，用同一组回合的平均当基线。' },
        { at: 7.0, s: '$\\hat A_i=(R_i-\\bar R)/\\sigma_R$：8 条里成功 5 条，成功 +0.775，失败 −1.291。' },
        { at: 10.4, s: '奖励几乎只看成没成，外加几项平滑惩罚；用 PPO 的截断目标更新。' },
        { at: 13.4, s: '学生自己学会：让门把一直留在画面里。' }
      ]
    },
    {
      title: '图 6 左：学生追上教师',
      dur: 16,
      build: buildSceneGRPOCurve,
      cues: [
        { at: 0.4, s: '横轴是 GRPO 迭代次数，纵轴是成功率；同色虚线是对应的教师。' },
        { at: 3.6, s: '起点：推门 0.68、拉门 0.57、推杠门 0.49（读图值）。' },
        { at: 7.0, s: '第 200 次：三类门 0.86 / 0.82 / 0.87，贴着教师的虚线走平。' },
        { at: 10.4, s: '涨了 18 / 24 / 39 个百分点，推杠门起点最低、涨得最多。' },
        { at: 13.4, s: '论文正文说最后是 80.8–85.8%，和表 1 第 6 种设置一样。' }
      ]
    },
    {
      title: '程序化生成的门',
      dur: 16,
      build: buildSceneDoors,
      cues: [
        { at: 0.4, s: '每个并行环境一扇不一样的门；刻意不复刻任何真实场景。' },
        { at: 3.6, s: '5 种门、3 大类：推门、拉门（都是转动把手）和推杠门。' },
        { at: 7.0, s: '门板宽 0.8–1.1 m、高 1.9–2.2 m，门重 80–120 kg，都随机。' },
        { at: 10.4, s: '真实的门闩：开门那一刻，全身动力学突变。' },
        { at: 13.4, s: '公开代码默认只开了一种门，参数和表 3 好几处对不上。' }
      ]
    },
    {
      title: '视觉随机化',
      dur: 16,
      build: buildSceneVisual,
      cues: [
        { at: 0.4, s: 'PBR 材质：所有表面随机，每 0.9–1.1 秒换一次。' },
        { at: 3.6, s: '环境光贴图：Poly Haven 的 **5233** 张，覆盖室内外和不同时刻。' },
        { at: 7.0, s: 'RTX 实时渲染，打开运动模糊和自动白平衡。' },
        { at: 10.4, s: '相机内外参对齐真机，再轻微随机。' },
        { at: 13.4, s: '代码还有图像增强：亮度、对比度、色相、饱和度、噪声、模糊。' }
      ]
    },
    {
      title: '表 1：拿掉哪种随机化',
      dur: 16,
      build: buildSceneTable1,
      cues: [
        { at: 0.4, s: '每行三根条，条越长成功率越高；每种设置测 120 次。' },
        { at: 3.6, s: '全部纹理加环境光 81–86%；不随机只有 5–20%。' },
        { at: 7.0, s: '去掉环境光：拉门掉 25 个点，掉得最多。' },
        { at: 10.4, s: '只用 10% 的纹理：只掉 3–8 个点。' },
        { at: 13.4, s: '纯色加环境光 66–70%：差距来自高保真渲染。' }
      ]
    },
    {
      title: '真机：比遥操作快（图 5）',
      dur: 16,
      build: buildSceneTeleop,
      cues: [
        { at: 0.4, s: '遥操作基线：同一个 HOMIE，PICO 头显加手柄，逆向运动学。' },
        { at: 3.6, s: '成功率：DoorMan 83%、专家 80%、新手 60%。' },
        { at: 7.0, s: '平均用时：15.40 s、20.02 s、22.55 s，用时越短越好。' },
        { at: 10.4, s: '比专家快 **23.1%**，比新手快 **31.7%**，每扇门快 7.15 s。' },
        { at: 13.4, s: '人感觉不到弹簧力、跟不上门的圆弧；仿真里却能学到。' }
      ]
    },
    {
      title: '泛化与失败',
      dur: 64,
      build: buildSceneGeneral,
      cues: [
        { at: 0.4, s: '换把手：外观和形状都不一样（论文图 1 上面一排）。' },
        { at: 7.8, s: '这些把手训练时一个都没见过；仿真里只有程序生成的五种。' },
        { at: 15.4, s: '换墙面：先是绿色的布。' },
        { at: 21.4, s: '再换成蓝色和黄色。' },
        { at: 27.4, s: '最后是紫色和青色，策略照样能开。' },
        { at: 33.4, s: '失败一：走到一半，被门框挡住。' },
        { at: 42.93, s: '失败二：手伸过去抓了个空，距离估错了。' },
        { at: 51.3, s: '失败三：门本来就虚掩着，可训练时门一开始总是关着的。' },
        { at: 60.97, s: '项目页的归类：没观测到的扰动、距离估计误差、没建模的状态。' }
      ]
    },
    {
      title: '局限与代码',
      dur: 16,
      build: buildSceneLimits,
      cues: [
        { at: 0.4, s: '奖励工程重：30 项奖励，加六个阶段的进阶条件和时间预算。' },
        { at: 3.6, s: '只验证了开门；真机只有三个平均数，没写试了多少次。' },
        { at: 7.0, s: '公开代码有教师、学生和门的生成；没有 GRPO，也没有模型。' },
        { at: 10.4, s: '论文和代码对不上：动作 33 / 19、LSTM 512 / 256、快照 100 / 200。' },
        { at: 13.4, s: '展望：用行为克隆教师代替手写奖励，推广到更多日常交互。' }
      ]
    }
  ];
  /* 要点里数字和单位之间用不换行空格（公式里不动），免得单位单独落到下一行开头（HOMIE 2026-10-21） */
  function nb(str) {
    return str.split(/(\$[^$]*\$)/).map(function (p, i) { return i % 2 ? p : p.replace(/(\d)(\*\*)? (?=[^\s\d+\-−→×<>=\/·（(])/g, '$1$2 ').replace(/(\d)–(\d)/g, '$1–⁠$2'); }).join('');
  }
  DOORMAN_SCENES.forEach(function (sc) { sc.cues.forEach(function (c) { c.s = nb(c.s); }); });

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十七幕动画：DoorMan 全流程速览',
      sub: '约 320 秒自动播放。空格播放/暂停，← → 换幕；真机与仿真画面剪自项目页的视频，曲线和柱子照论文的数重画，第 3 幕的 G1 借第 032 期 HOMIE 的复现贴图示意。',
      ariaLabel: 'DoorMan 十七幕讲解动画',
      notes: [
        '取数依据：图 5、表 1 和附录表 2–3 的数字照抄 arXiv 2512.01061（只有 v1，读的是 LaTeX 源码）；图 6 的曲线是从论文的矢量图里按网格线标定抽出来的（读图近似值）；动作维数、观测维数、重置比例、阶段的进阶条件和时间预算取自官方仓库 NVlabs/GR00T-VisualSim2Real 的 `doorman` 分支。',
        '这一期没有复现：官方没有放出训好的 DoorMan 模型，也没有 GRPO 那一阶段的代码。第 5 幕视频下面的阶段条是我们看画面估的；第 6、7 幕的样本分配是标明的玩具链（每座桥的通过率 0.9 / 0.8 / 0.05 / 0.6 / 0.7）；第 10 幕的 8 条回合是我们编的例子。',
        '真机与仿真片段剪自项目页 doorman-humanoid.github.io 的视频（画面里标了项目页写的 1x），只做讲解引用。'
      ],
      scenes: DOORMAN_SCENES
    });
  }

  // ─── the narrated vertical video of the same seventeen scenes ──────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：DoorMan 十七幕全流程',
      sub: '19 分 6 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十七幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '21.9 MB',
      fileName: 'DoorMan_讲解视频.mp4'
    });
  }

  // ─── 演示 1：六个阶段与分阶段重置 ───────────────────────────────────────────
  function buildStagesDemo(host) {
    var root = card(host, {
      title: '六个阶段：奖励、进阶条件与分阶段重置',
      sub: '点一个阶段，看这时生效的奖励项（附录表 2）和代码里进到下一阶段的条件；再拖下面两个滑块，看分阶段重置让后面几个阶段多拿到多少样本（玩具链）。'
    });
    var state = { k: 3, bridge: 0.05, a0: 0.5 };
    var row = controlsRow(root);
    buttonGroup(row, { label: '阶段', items: STAGES.map(function (st, k) { return { label: k + ' ' + st.zh, value: k }; }), value: 3, onPick: function (v) { state.k = v; render(); } });
    var stats = statsRow(root);
    var sTime = stats.add('时间预算'), sN = stats.add('生效的奖励项'), sMax = stats.add('最大的一项');
    var condBox = verdictBox(root);
    var tb = table(root);
    var row2 = controlsRow(root);
    slider(row2, { label: '「抓住 → 开门」那座桥的通过率', min: 0.01, max: 0.5, step: 0.01, value: 0.05, format: function (v) { return f2(v); }, onInput: function (v) { state.bridge = v; render(); } });
    slider(row2, { label: '从头开始的比例 $\\alpha_0$', min: 0.1, max: 1, step: 0.05, value: 0.5, format: function (v) { return f2(v) + '（其余五个阶段平分）'; }, onInput: function (v) { state.a0 = v; render(); } });
    var st = stage(root, 230);
    var verdict = verdictBox(root);
    note(root, ['表格里是这个阶段生效的阶段奖励（附录表 2 的阶段列）；另有 13 项全程生效的终止与通用惩罚、3 项全程奖励（终止 −1000、完成 4.0、阶段 1.0、省下的时间 0.5……），代码里所有项再乘 $\\Delta t=0.02$。',
      '下面的柱子是**玩具模型**：只看每个阶段能不能进到下一阶段，其余四座桥的通过率固定为 0.9 / 0.8 / 0.6 / 0.7；高度是每个回合「到达或从这里起步」的概率 $v_k=\\sum_{y\\le k}\\alpha_y\\prod_{j=y}^{k-1}P_j$。它只说明机制，数值不能和论文比。默认值就是笔记「🚶 具体实例」的例 6。',
      '真实训练里，某个阶段要先被某个环境自己闯进去一次、存下第一张快照，之后才会被重放（没有快照的阶段权重为 0）。']);
    function render() {
      var S = STAGES[state.k];
      sTime.set(S.time + ' 步（' + S.time / 50 + ' s）');
      sN.set(String(S.rew.length));
      var mx = S.rew.reduce(function (a, b) { return Math.abs(b[1]) > Math.abs(a[1]) ? b : a; });
      sMax.set(mx[0] + ' ' + (mx[1] > 0 ? '+' : '−') + Math.abs(mx[1]), mx[1] > 0 ? 'good' : 'bad');
      condBox.set('**进到下一阶段的条件（代码）**：' + S.cond, 'good');
      tb.clear();
      tb.row(['奖励项', '权重（表 2）', '正负'], true);
      S.rew.forEach(function (r) { tb.row([r[0], sgn(String(r[1])), r[1] > 0 ? '奖励' : '惩罚']); });
      var P = TOY_P.slice(); P[2] = state.bridge;
      var rest = (1 - state.a0) / 5, alpha = [state.a0, rest, rest, rest, rest, rest];
      var v0 = toyVisits([1, 0, 0, 0, 0, 0], P), va = toyVisits(alpha, P);
      var g = begin(st), ctx = g.ctx, C = g.P, base = g.h - 34, top = 30, bw = Math.min(26, (g.w - 60) / 14), gw = (g.w - 40) / 6;
      text(ctx, '■ 不用重置', 14, 14, C.muted, 'left', 'bold 11px sans-serif');
      text(ctx, '■ 分阶段重置', 100, 14, C.good, 'left', 'bold 11px sans-serif');
      for (var k = 0; k < 6; k++) {
        var x = 30 + k * gw + gw / 2 - bw;
        [[v0[k], C.muted], [va[k], C.good]].forEach(function (p, j) {
          var h = p[0] * (base - top);
          ctx.fillStyle = p[1]; ctx.fillRect(x + j * (bw + 2), base - h, bw, h);
          text(ctx, f2(p[0]), x + j * (bw + 2) + bw / 2, base - h - 8, C.text, 'center', '10px sans-serif');
        });
        text(ctx, k + ' ' + STAGES[k].short, 30 + k * gw + gw / 2, base + 16, C.text, 'center', '11px sans-serif');
      }
      line(ctx, [[24, base], [g.w - 8, base]], C.grid, 1);
      verdict.set('阶段 5 的样本：不用重置 **' + f3(v0[5]) + '**，分阶段重置 **' + f3(va[5]) + '**，约 **' + f1(va[5] / v0[5]) + ' 倍**；代价是只有 ' + Math.round(state.a0 * 100) + '% 的回合从头开始。', va[5] > v0[5] ? 'good' : 'warn');
    }
    registerRenderer(render);
    render();
  }

  // ─── 演示 2：GRPO 组内优势计算器 ─────────────────────────────────────────────
  function buildGrpoDemo(host) {
    var root = card(host, {
      title: 'GRPO 组内优势计算器（式 4）',
      sub: '一组 $G$ 条回合，只记成功（1）和失败（0）；$\\hat A_i=(R_i-\\operatorname{mean}(R))/\\operatorname{std}(R)$。再切到「图 6 左」看三类门的训练曲线。'
    });
    var state = { G: 8, k: 5, sample: false, view: 'adv' };
    var row = controlsRow(root);
    var kSl;
    slider(row, { label: '组大小 $G$', min: 2, max: 32, step: 1, value: 8, format: function (v) { return String(v); }, onInput: function (v) { state.G = v; state.k = Math.min(state.k, v); render(); } });
    kSl = slider(row, { label: '成功的条数', min: 0, max: 32, step: 1, value: 5, format: function (v) { return String(v); }, onInput: function (v) { state.k = v; render(); } });
    void kSl;
    var row2 = controlsRow(root);
    buttonGroup(row2, { label: '标准差', items: [{ label: '总体（除以 G）', value: false }, { label: '样本（除以 G − 1）', value: true }], value: false, onPick: function (v) { state.sample = v; render(); } });
    buttonGroup(row2, { label: '看哪个', items: [{ label: '这一组的优势', value: 'adv' }, { label: '图 6 左：训练曲线', value: 'fig' }], value: 'adv', onPick: function (v) { state.view = v; render(); } });
    var stats = statsRow(root);
    var sP = stats.add('成功率'), sStd = stats.add('标准差'), sAp = stats.add('成功回合的优势'), sAm = stats.add('失败回合的优势');
    var st = stage(root, 240);
    var verdict = verdictBox(root);
    note(root, ['论文没写组大小 $G$、截断 $\\epsilon$，也没说标准差是总体的还是样本的；这里两种都给。默认的 8 条成 5 条是笔记「🚶 具体实例」例 7 编的例子。',
      '一组全成功或全失败时 $\\operatorname{std}(R)=0$，优势没有定义；这里按「没有信号」画成 0（常见做法是分母加一个小量）。这一点论文没讨论。',
      '图 6 左的曲线是从论文矢量图里按网格线抽的读图近似值，虚线是教师。']);
    function render() {
      var G = state.G, k = Math.min(state.k, G), p = k / G;
      var varP = p * (1 - p), sd = Math.sqrt(state.sample && G > 1 ? varP * G / (G - 1) : varP);
      var ap = sd > 0 ? (1 - p) / sd : 0, am = sd > 0 ? -p / sd : 0;
      sP.set(f3(p));
      sStd.set(f3(sd));
      sAp.set(k ? '+' + f3(ap) : '—', 'good');
      sAm.set(k < G ? '−' + f3(-am) : '—', 'bad');
      var g = begin(st), ctx = g.ctx, C = g.P;
      if (state.view === 'adv') {
        var n = Math.min(G, 32), bw = (g.w - 40) / n, mid = g.h / 2;
        line(ctx, [[20, mid], [g.w - 10, mid]], C.grid, 1);
        for (var i = 0; i < n; i++) {
          var a = i < k ? ap : am, h = clamp(a, -3, 3) / 3 * (g.h / 2 - 24);
          ctx.fillStyle = i < k ? C.good : C.bad;
          ctx.fillRect(24 + i * bw + 1, h > 0 ? mid - h : mid, Math.max(1, bw - 2), Math.abs(h));
        }
        text(ctx, '每根柱是一条回合的优势（绿 = 成功，红 = 失败）', 14, 14, C.text, 'left', '11px sans-serif');
        verdict.set(sd > 0 ? '成功率越高，一次成功的优势越小、一次失败的惩罚越大：$p=' + f2(p) + '$ 时 **+' + f3(ap) + '** / **' + sgn(f3(am)) + '**。' : '这一组全是同一个结果：标准差为 0，没有学习信号。', sd > 0 ? 'good' : 'warn');
      } else {
        var x0 = 46, x1 = g.w - 12, y0 = g.h - 28, y1 = 24, sx = function (v) { return x0 + v / 200 * (x1 - x0); }, sy = function (v) { return y0 - (v - 0.4) / 0.5 * (y0 - y1); };
        [0.4, 0.5, 0.6, 0.7, 0.8, 0.9].forEach(function (v) { line(ctx, [[x0, sy(v)], [x1, sy(v)]], C.grid, 1); text(ctx, f1(v), x0 - 6, sy(v), C.text, 'right', '10px sans-serif'); });
        [0, 50, 100, 150, 200].forEach(function (v) { text(ctx, String(v), sx(v), y0 + 14, C.text, 'center', '10px sans-serif'); });
        var cols = { push: C.accent, pull: C.purple, bar: C.good };
        FIG6L.forEach(function (sr, j) {
          line(ctx, [[x0, sy(sr.teacher)], [x1, sy(sr.teacher)]], cols[sr.key], 1.4, [3, 4]);
          line(ctx, sr.v.map(function (v, q) { return [sx(q * GRPO_IT), sy(v)]; }), cols[sr.key], 2.4);
          text(ctx, '■ ' + sr.zh, 14 + j * 120, 12, cols[sr.key], 'left', 'bold 11px sans-serif');
        });
        verdict.set('三条曲线都从五到七成涨到贴着教师的虚线：推门 0.676 → 0.860，拉门 0.573 → 0.815，推杠门 0.487 → 0.873（读图值）。', 'good');
      }
    }
    registerRenderer(render);
    render();
  }

  // ─── 演示 3：图 5、表 1、图 6 右 ─────────────────────────────────────────────
  function buildResultsDemo(host) {
    var root = card(host, {
      title: '图 5、表 1、图 6 右的数字',
      sub: '和人遥操作比（真机）、视觉随机化消融（仿真里 120 次）、分阶段重置的缓冲区大小（教师训练）。选一张看。'
    });
    var state = { view: 'succ' };
    var row = controlsRow(root);
    buttonGroup(row, { label: '看哪个', items: [{ label: '图 5：成功率', value: 'succ' }, { label: '图 5：用时', value: 'time' }, { label: '表 1：视觉随机化', value: 'tab1' }, { label: '图 6 右：缓冲区', value: 'fig6r' }], value: 'succ', onPick: function (v) { state.view = v; render(); } });
    var st = stage(root, 280);
    var verdict = verdictBox(root);
    var tb = table(root);
    note(root, ['图 5 的数照图上标的；正文说比专家快 23.8%，按图上的数是 $(20.02-15.40)/20.02=23.1\\%$；「比新手好 28%」是 $(83-60)/83$。论文没写真机试了多少次。',
      '表 1 照抄论文；图 6 右是从矢量图里抽的读图近似值，纵轴是平均能到达的最远阶段（0–5）。']);
    function render() {
      var g = begin(st), ctx = g.ctx, C = g.P, v = state.view;
      var cols = { doorman: C.good, expert: C.accent, novice: C.muted, b100: C.good, b10: C.accent, b0: C.muted };
      tb.clear();
      if (v === 'succ' || v === 'time') {
        var mx = v === 'succ' ? 100 : 25, bh = 34;
        FIG5.forEach(function (f, i) {
          var y = 40 + i * (bh + 22), w = f[v] / mx * (g.w - 170);
          text(ctx, f.zh, 12, y + bh / 2, C.text, 'left', '12px sans-serif');
          ctx.fillStyle = cols[f.key]; ctx.fillRect(110, y, w, bh);
          text(ctx, v === 'succ' ? f.succ + '%' : f2(f.time) + ' s', 116 + w, y + bh / 2, C.text, 'left', 'bold 12px sans-serif');
        });
        text(ctx, v === 'succ' ? '条越长越好' : '条越短越好', 12, 16, C.muted, 'left', '11px sans-serif');
        tb.row(['', '成功率', '平均用时'], true);
        FIG5.forEach(function (f) { tb.row([f.zh, f.succ + '%', f2(f.time) + ' s']); });
        verdict.set(v === 'succ' ? '成功率和专家持平（83% 对 80%），比新手高 23 个百分点。' : '比专家快 23.1%（4.62 s），比新手快 31.7%（7.15 s）。', 'good');
      } else if (v === 'tab1') {
        var gh = (g.h - 40) / 6, bw2 = g.w - 200;
        TABLE1.forEach(function (r, i) {
          var y = 24 + i * gh;
          text(ctx, r.n + ' ' + r.zh + (r.dl ? ' + 环境光' : ''), 10, y + gh / 2, C.text, 'left', '11px sans-serif');
          r.v.forEach(function (val, j) {
            ctx.fillStyle = [C.accent, C.purple, C.good][j];
            ctx.fillRect(170, y + 4 + j * (gh - 10) / 3, val / 100 * bw2, (gh - 14) / 3);
          });
        });
        text(ctx, '■ 推门  ■ 拉门  ■ 推杠门（条越长越好）', 170, 12, C.text, 'left', '11px sans-serif');
        tb.row(['#', '外观', '环境光'].concat(DOORS), true);
        TABLE1.forEach(function (r) { tb.row([String(r.n), r.zh, r.dl ? '✓' : '✗'].concat(r.v.map(function (x) { return f1(x); }))); });
        verdict.set('全部纹理 + 环境光最好（81–86%）；去掉环境光拉门掉 25 个点；只用 10% 纹理只掉 3–8 个点；不随机只剩 5–20%。', 'good');
      } else {
        var x0 = 40, x1 = g.w - 12, y0 = g.h - 26, y1 = 22, sx = function (it) { return x0 + it / 3800 * (x1 - x0); }, sy = function (s5) { return y0 - s5 / 5 * (y0 - y1); };
        for (var k = 0; k <= 5; k++) { line(ctx, [[x0, sy(k)], [x1, sy(k)]], C.grid, 1, k === 2 ? [4, 4] : null); text(ctx, String(k), x0 - 8, sy(k), C.text, 'right', '10px sans-serif'); }
        [0, 1000, 2000, 3000].forEach(function (it) { text(ctx, it ? it / 1000 + 'k' : '0', sx(it), y0 + 14, C.text, 'center', '10px sans-serif'); });
        FIG6R.forEach(function (sr, j) {
          line(ctx, sr.v.map(function (val, q) { return [sx(q * STAGE_IT), sy(val)]; }), cols[sr.key], 2.4);
          text(ctx, '■ ' + sr.zh, 50 + j * 110, 10, cols[sr.key], 'left', 'bold 11px sans-serif');
        });
        tb.row(['迭代次数'].concat(FIG6R.map(function (sr) { return sr.zh; })), true);
        [500, 1000, 1700, 2750, 3800].forEach(function (it) { tb.row([String(it)].concat(FIG6R.map(function (sr) { return f2(at50(sr, it)); }))); });
        verdict.set('缓冲区 100：第 500 次约 3.7、第 1700 次约 4.4；缓冲区 10 要四千多次；不用缓冲区停在 1.2，进不了阶段 2（抓住）。', 'good');
      }
    }
    registerRenderer(render);
    render();
  }

  K.mount({
    'doorman-explainer': buildExplainerDemo,
    'doorman-video': buildVideoDemo,
    'doorman-stages': buildStagesDemo,
    'doorman-grpo': buildGrpoDemo,
    'doorman-results': buildResultsDemo
  });
})();
