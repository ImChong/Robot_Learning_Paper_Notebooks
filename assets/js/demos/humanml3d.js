/* Interactive HumanML3D explainer for
 * papers/14_Human_Motion/HumanML3D.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["humanml3d"]`, after assets/js/demos/kit.js. The note itself may
 * only contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   humanml3d-explainer — 九幕讲解动画：文本生成动作卡在哪 → 数据集怎么建 →
 *     一帧 263 维 → 每 4 帧一个 snippet code → Text2Length 的长度分布 →
 *     时序 VAE 的一步 → 三项损失与课程学习 → 对比学习评测器与 R-Precision →
 *     Table 2 / 4 的结果与遗产
 *   humanml3d-video — 同一套分镜离线渲染的配音竖屏视频（K.video）
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
    softmax = K.softmax;

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_MUTED = X.muted,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2,
    C_GRID = X.grid;

  /* 14616 → '14,616' */
  function thou(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function sum(a) {
    return a.reduce(function (s, x) {
      return s + x;
    }, 0);
  }

  // ─── 画面上的数字从这里现算，不手写 ───────────────────────────────────

  /* 论文 Table 1：HumanML3D vs KIT-ML。 */
  var HML = { motions: 14616, texts: 44970, hours: 28.59, vocab: 5371 };
  var KIT = { motions: 3911, texts: 6278, hours: 10.33, vocab: 1623 };
  var RATIO = {
    motions: HML.motions / KIT.motions, // 3.74
    texts: HML.texts / KIT.texts, // 7.16
    hours: HML.hours / KIT.hours, // 2.77
    vocab: HML.vocab / KIT.vocab // 3.31
  };
  var TEXTS_PER_MOTION = HML.texts / HML.motions; // 3.08
  var MEAN_SEC = (HML.hours * 3600) / HML.motions; // 7.04（论文写 7.1）
  var MIRRORED = HML.motions * 2; // 29,232

  /* 官方仓库 index.csv 里 14,616 段的来源（按 source_path 数出来）。 */
  var SOURCES = [
    { t: 'KIT', n: 4648, c: C_ACCENT },
    { t: 'CMU', n: 2913, c: C_GOOD },
    { t: 'BMLmovi', n: 1839, c: C_WARN },
    { t: 'Eyes_Japan', n: 1465, c: C_MUTED },
    { t: 'HumanAct12', n: 1191, c: C_BAD },
    { t: '其余 13 个 AMASS 子集', n: 2560, c: C_BORDER }
  ];
  var N_SOURCES = sum(
    SOURCES.map(function (s) {
      return s.n;
    })
  ); // 14,616
  var N_AMASS = N_SOURCES - 1191; // 13,425
  var N_AMASS_SUBSETS = 4 + 13; // 17

  /* 一帧特征的七段（motion_representation.ipynb 的 process_file）。 */
  var JOINTS = 22;
  var JOINTS_KIT = 21;
  function poseDim(j) {
    return 1 + 2 + 1 + 3 * (j - 1) + 6 * (j - 1) + 3 * j + 4;
  }
  var DIM = poseDim(JOINTS); // 263
  var DIM_KIT = poseDim(JOINTS_KIT); // 251
  var FEAT = [
    { t: '根角速度', n: 1, c: C_BAD },
    { t: '根 xz 速度', n: 2, c: C_BAD },
    { t: '根高度', n: 1, c: C_BAD },
    { t: '局部位置 ric', n: 3 * (JOINTS - 1), c: C_ACCENT },
    { t: '6D 旋转', n: 6 * (JOINTS - 1), c: C_GOOD },
    { t: '局部速度', n: 3 * JOINTS, c: C_WARN },
    { t: '触地', n: 4, c: C_MUTED }
  ];

  /* 官方仓库自带的真实片段 012314（打网球），new_joint_vecs/012314.npy 现算。 */
  var CLIP = {
    id: '012314',
    rows: 170,
    contactL: [0.794, 0.812], // 左脚两个触地通道（关节 7 / 10）
    contactR: [0.747, 0.747], // 右脚（关节 8 / 11）
    wristPeak: 10.0, // 右腕（关节 21）峰值速度 m/s
    wristFrame: 28,
    rootY: 0.88, // 根节点平均高度 m
    yawDeg: -22.8 // 根节点绕竖轴累计转角
  };
  var FPS = 20;
  var CLIP_RAW = CLIP.rows + 1; // 速度要两帧做差，原始帧比特征多一帧
  var CLIP_SEC = CLIP.rows / FPS; // 8.5 s
  var CLIP_NUMS = CLIP.rows * DIM; // 44,710
  var WRIST_SEC = CLIP.wristFrame / FPS; // 1.4 s

  /* 触地阈值：相邻帧位移平方和 < 0.002（单位 m²）。 */
  var FOOT_THR = 0.002;
  var FOOT_M = Math.sqrt(FOOT_THR); // 0.0447 m / 帧
  var FOOT_MS = FOOT_M * FPS; // 0.894 m/s

  /* motion snippet code：两层 Conv1d(k=4, s=2, p=1)，长度各减半。 */
  var UNIT = 4;
  var CODE_DIM = 512;
  var CLIP_FRAMES = Math.floor(CLIP.rows / UNIT) * UNIT; // 168
  var CLIP_CODES = CLIP_FRAMES / UNIT; // 42
  function convLen(n) {
    return Math.floor((n + 2 * 1 - 4) / 2) + 1;
  }
  var CONV1 = convLen(CLIP_FRAMES); // 84
  var CONV2 = convLen(CONV1); // 42
  var ENC_IN = DIM - 4; // 259：触地只让解码器预测
  var NUMS_IN = CLIP_FRAMES * DIM; // 44,184
  var NUMS_CODE = CLIP_CODES * CODE_DIM; // 21,504
  var SQUEEZE = NUMS_IN / NUMS_CODE; // 2.05
  var RF = 4 + (4 - 1) * 2; // 两层 k=4、s=2 的感受野：10 帧
  var RF_SEC = RF / FPS; // 0.5 s
  var LAMBDA_SPR = 0.001;

  /* Text2Length：200 // 4 = 50 个长度类；k 个 code = 4k 帧 = k / 5 秒。 */
  var N_LEN_CLASSES = 200 / UNIT; // 50
  var K_MIN = 10; // 训练时丢掉不足 40 帧（2 s）的动作
  var K_MAX = 49; // 数据只收 < 200 帧
  /* 示意分布：离散高斯截在 [10, 49]，不是论文 Fig. 6 的数。 */
  function lengthDist(mu, sigma) {
    var p = [];
    for (var k = K_MIN; k <= K_MAX; k++) p.push(Math.exp(-((k - mu) * (k - mu)) / (2 * sigma * sigma)));
    var s = sum(p);
    return p.map(function (x) {
      return x / s;
    });
  }
  /* 按累积概率 u 取样（逆 CDF），三次采样的 u 固定，方便和笔记对数。 */
  function quantile(p, u) {
    var acc = 0;
    for (var i = 0; i < p.length; i++) {
      acc += p[i];
      if (u <= acc) return K_MIN + i;
    }
    return K_MAX;
  }
  var SAMPLE_U = [0.2, 0.5, 0.9];
  var LEN_PEAK = lengthDist(CLIP_CODES, 3); // 非周期：网球挥拍
  var LEN_FLAT = lengthDist(30, 9); // 周期：挥手
  var PEAK_SAMPLES = SAMPLE_U.map(function (u) {
    return quantile(LEN_PEAK, u);
  }); // 39 / 42 / 46
  var FLAT_SAMPLES = SAMPLE_U.map(function (u) {
    return quantile(LEN_FLAT, u);
  }); // 23 / 30 / 41
  function codesToSec(k) {
    return (k * UNIT) / FPS;
  }

  /* 时序 VAE 的维度（官方代码 / 补充材料 Table 1）。 */
  var DIM_Z = 128;
  var DIM_ATT = 512;
  var DIM_HID = 1024;
  var PRI_IN = CODE_DIM + DIM_ATT; // 1024
  var POS_IN = CODE_DIM + CODE_DIM + DIM_ATT; // 1536
  var GEN_IN = CODE_DIM + DIM_ATT + DIM_Z; // 1152
  var SQRT_ATT = Math.sqrt(DIM_ATT); // 22.6
  var SWING_T = Math.floor(CLIP.wristFrame / UNIT) + 1; // 第 8 个 code（帧 28–31）覆盖挥拍那一刻
  var TTA_SWING = CLIP_CODES - SWING_T; // T − t = 34

  /* 第六幕的示意注意力：两步的打分是编的，权重由 softmax 现算。 */
  var ATT_WORDS = ['play', 'tennis', 'shoot', 'ball', 'racket'];
  var ATT_EARLY_T = 2;
  var ATT_EARLY = softmax([1.8, 1.5, 0.2, 0.1, 0.4]); // .422 .312 .085 .077 .104
  var ATT_SWING = softmax([0.2, 0.4, 2.0, 1.3, 1.1]); // .073 .089 .440 .219 .179

  /* 训练（补充材料 A + 官方 train_comp_v6.py / CompTrainerV6）。 */
  var LAMBDA_MOT = 1;
  var LAMBDA_KL = 0.01;
  var LAMBDA_KL_KIT = 0.005;
  var P_TF = 0.4;
  var CUR_START = 10; // 代码里 HumanML3D 从 10 个 code 起步（补充材料写 T_cur = 8）
  var CUR_END = 49;
  var N_STAGES = CUR_END - CUR_START + 1; // 40
  var LR = 2e-4;
  var LR_DEC = LR / 10;

  /* 评测（补充材料 B + final_evaluations.py）。 */
  var POOL = 32;
  var CHANCE = [1 / POOL, 2 / POOL, 3 / POOL]; // 3.1% / 6.3% / 9.4%
  var MARGIN = 10;
  function contrastive(d, matched) {
    return matched ? d * d : Math.pow(Math.max(0, MARGIN - d), 2);
  }
  var CTA = [
    { d: 3, y: 0 },
    { d: 6, y: 1 },
    { d: 12, y: 1 }
  ].map(function (r) {
    return { d: r.d, y: r.y, loss: contrastive(r.d, r.y === 0) };
  }); // 9 / 16 / 0
  var DIV_PAIRS = 300;
  var MM_TEXTS = 100;
  var MM_REPEATS = 30;
  var MM_PAIRS = 10;
  var REPLICATIONS = 20;
  var CI_FACTOR = 1.96 / Math.sqrt(REPLICATIONS); // 0.438
  /* R-Precision 示意：真值排第 2 的一个池子。 */
  var GT_D = 3.1;
  var CLOSER_D = 2.85;

  /* 论文 Table 2（HumanML3D 测试集）与 Table 4（消融）。 */
  var T2 = [
    { k: 'real', t: '真实动作', top1: 0.511, top3: 0.797, fid: 0.002, c: C_MUTED },
    { k: 'ours', t: 'Ours', top1: 0.455, top3: 0.736, fid: 1.087, c: C_GOOD },
    { k: 'l2p', t: 'Language2Pose', top1: 0.246, top3: 0.486, fid: 11.02, c: C_ACCENT },
    { k: 's2s', t: 'Seq2Seq', top1: 0.18, top3: 0.396, fid: 11.75, c: C_ACCENT },
    { k: 't2g', t: 'Text2Gesture', top1: 0.165, top3: 0.345, fid: 7.664, c: C_ACCENT },
    { k: 'moco', t: 'MoCoGAN', top1: 0.037, top3: 0.106, fid: 94.41, c: C_BAD },
    { k: 'd2m', t: 'Dance2Music', top1: 0.033, top3: 0.097, fid: 66.98, c: C_BAD }
  ];
  function row(k) {
    return T2.filter(function (r) {
      return r.k === k;
    })[0];
  }
  var OURS = row('ours'),
    REAL = row('real'),
    L2P = row('l2p');
  var OURS_REAL_LEN = { top1: 0.457, fid: 1.067, mmod: 2.09 };
  var OURS_MMOD = 2.219;
  var MMOD_GAIN = (OURS_MMOD - OURS_REAL_LEN.mmod) / OURS_REAL_LEN.mmod; // +6.2%
  var TOP1_OF_REAL = OURS.top1 / REAL.top1; // 89.0%
  var TOP3_OF_REAL = OURS.top3 / REAL.top3; // 92.3%
  var FID_VS_L2P = L2P.fid / OURS.fid; // 10.1×
  var ABL = [
    { t: 'w/o snippet code', top1: 0.37 },
    { t: 'w/o 词注意力', top1: 0.396 },
    { t: 'w/o 词性标签', top1: 0.443 },
    { t: 'w/o 位置编码', top1: 0.444 }
  ].map(function (a) {
    return { t: a.t, top1: a.top1, drop: OURS.top1 - a.top1 };
  }); // −.085 / −.059 / −.012 / −.011
  var USER_TOP2 = 72;

  // ─── 共用小部件 ─────────────────────────────────────────────────────
  function box(g, x, y, w, h, fill, stroke, o) {
    var attrs = { x: x, y: y, width: w, height: h, rx: (o && o.rx) || 8, 'stroke-width': (o && o.sw) || 1.3 };
    if (o && o.dash) attrs['stroke-dasharray'] = o.dash;
    var r = paint(svgEl('rect', attrs), fill, stroke);
    g.appendChild(r);
    return r;
  }
  function arrow(s, id) {
    return K.arrowMarker(s, id, C_BORDER);
  }
  function link(g, pts, marker, color, dash) {
    var attrs = { d: polyPath(pts), fill: 'none', 'stroke-width': 1.4 };
    if (marker) attrs['marker-end'] = marker;
    if (dash) attrs['stroke-dasharray'] = dash;
    var p = paint(svgEl('path', attrs), null, color || C_BORDER);
    g.appendChild(p);
    return p;
  }
  function group(s) {
    var g = svgEl('g', {});
    s.appendChild(g);
    return g;
  }

  // ─── 第 1 幕：文本生成动作卡在哪 ─────────────────────────────────────
  var S1_OLD = ['确定性一对一：一句话只出一段动作', '长度固定：要先告诉它真实帧数', '生成的动作趋于静止、没有生气', '只有 KIT-ML：' + thou(KIT.motions) + ' 段，偏 locomotion'];
  var S1_HARD = [
    { t: '① 长度可变', d: '同一句话，动作可长可短' },
    { t: '② 一句多解', d: '同一句话，有很多种合理做法' },
    { t: '③ 文本有长有短', d: '从一个短语到一串先后动作' }
  ];

  function buildSceneProblem() {
    var s = sceneSvg('2022 年以前的文本生成动作是确定性的一对一映射、长度固定、数据只有 KIT-ML；论文提出三个难点，并用两阶段方法加新数据集回答');
    s.appendChild(svgText(56, 26, '一句话 → 一段 3D 动作：2022 年以前卡在哪', 'demo-x-ink2', 13.5));

    var sent = group(s);
    box(sent, 40, 40, 720, 52, C_SURFACE2, C_ACCENT);
    sent.appendChild(svgText(56, 58, '输入（论文 Fig. 1 的例句）', 'demo-x-mut', 9));
    sent.appendChild(
      paint(svgText(56, 79, 'the figure rises from a lying position and walks in a counterclockwise circle, and then lays back down the ground', 'demo-x-mono', 8.6), C_ACCENT)
    );

    var old = group(s);
    box(old, 40, 106, 350, 150, C_SURFACE, C_BAD, { dash: '5 4' });
    old.appendChild(paint(svgText(56, 128, '已有做法：Seq2Seq / Language2Pose / Text2Gesture', null, 11), C_BAD));
    var oldLines = S1_OLD.map(function (t, k) {
      var tx = svgText(60, 154 + k * 26, '· ' + t, 'demo-x-mut', 10);
      old.appendChild(tx);
      return tx;
    });

    var hard = S1_HARD.map(function (h, k) {
      var g = group(s);
      var y = 106 + k * 52;
      box(g, 410, y, 350, 46, C_SURFACE2, C_WARN);
      g.appendChild(paint(svgText(426, y + 19, h.t, null, 11.5), C_WARN));
      g.appendChild(svgText(426, y + 37, h.d, 'demo-x-mut', 9.5));
      return { g: g, y: y, at: 3.6 + k * 1.4 };
    });
    /* ① 三根长短不一的条；② 两条不同的轨迹；③ 一短一长两条字条 */
    var lenBars = [70, 46, 92].map(function (w, k) {
      return paint(svgEl('rect', { x: 620, y: hard[0].y + 8 + k * 11, width: w, height: 7, rx: 2 }), C_WARN);
    });
    lenBars.forEach(function (r) {
      hard[0].g.appendChild(r);
    });
    var pathA = paint(svgEl('path', { d: 'M 620 182 C 650 160, 680 200, 720 172', fill: 'none', 'stroke-width': 2 }), null, C_GOOD);
    var pathB = paint(svgEl('path', { d: 'M 620 182 C 640 196, 690 150, 720 186', fill: 'none', 'stroke-width': 2, 'stroke-dasharray': '4 3' }), null, C_ACCENT);
    hard[1].g.appendChild(pathA);
    hard[1].g.appendChild(pathB);
    hard[2].g.appendChild(paint(svgEl('rect', { x: 620, y: hard[2].y + 10, width: 36, height: 8, rx: 2 }), C_MUTED));
    hard[2].g.appendChild(paint(svgEl('rect', { x: 620, y: hard[2].y + 24, width: 124, height: 8, rx: 2 }), C_MUTED));

    var band = group(s);
    box(band, 40, 272, 720, 62, C_SURFACE2, C_GOOD, { sw: 1.5 });
    band.appendChild(paint(svgText(400, 297, '论文的回答：text2length 先采长度 → text2motion 用时序 VAE 逐段生成', null, 12.5, 'middle'), C_GOOD));
    band.appendChild(svgText(400, 320, '中间表示换成 motion snippet code；再配一套 ' + thou(HML.motions) + ' 段 / ' + thou(HML.texts) + ' 条描述的数据集', 'demo-x-mut', 10, 'middle'));

    var foot = paint(svgText(400, 372, 'HumanML3D 后来成了文本生成动作的标准 benchmark', null, 14.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      setOpacity(sent, seg(t, 0.3, 1.0));
      setOpacity(old, seg(t, 1.4, 2.0));
      oldLines.forEach(function (ln, k) {
        setOpacity(ln, seg(t, 1.6 + k * 0.4, 2.0 + k * 0.4));
      });
      hard.forEach(function (h) {
        setOpacity(h.g, seg(t, h.at, h.at + 0.5));
      });
      var grow = ease(seg(t, 4.0, 5.2));
      [70, 46, 92].forEach(function (w, k) {
        lenBars[k].setAttribute('width', (w * grow).toFixed(1));
      });
      setOpacity(pathB, seg(t, 5.6, 6.2));
      setOpacity(band, seg(t, 8.4, 9.2));
      setOpacity(foot, seg(t, 10.4, 11.2));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 2 幕：数据集怎么建 ──────────────────────────────────────────
  var S2_PIPE = [
    { t: 'AMASS ' + N_AMASS_SUBSETS + ' 个子集', d: '+ HumanAct12' },
    { t: '降到 ' + FPS + ' fps', d: '>10 s 随机裁成 10 s' },
    { t: '统一骨架', d: '初始面朝 Z+' },
    { t: 'AMT 每段 3 条', d: '≥5 词 · 通过率 >92%' },
    { t: '镜像扩增', d: 'left ↔ right 一起换' }
  ];
  var S2_ROWS = [
    { t: '动作段数', a: HML.motions, b: KIT.motions, r: RATIO.motions, f: thou },
    { t: '文本描述', a: HML.texts, b: KIT.texts, r: RATIO.texts, f: thou },
    {
      t: '总时长 h',
      a: HML.hours,
      b: KIT.hours,
      r: RATIO.hours,
      f: function (x) {
        return fmt(x, 2);
      }
    },
    { t: '词表', a: HML.vocab, b: KIT.vocab, r: RATIO.vocab, f: thou }
  ];

  function buildSceneData() {
    var s = sceneSvg(
      'HumanML3D 由 AMASS 与 HumanAct12 统一到 20 fps、默认骨架和朝向，再在 AMT 上每段收 3 条描述：' +
        thou(HML.motions) +
        ' 段、' +
        thou(HML.texts) +
        ' 条描述、' +
        fmt(HML.hours, 2) +
        ' 小时，段数是 KIT-ML 的 ' +
        fmt(RATIO.motions, 2) +
        ' 倍'
    );
    s.appendChild(svgText(56, 26, '把动捕洗成统一格式，再请人每段写三句话', 'demo-x-ink2', 13.5));

    var mk = arrow(s, 'hml-x-arrow-data');
    var pipe = S2_PIPE.map(function (p, k) {
      var g = group(s);
      var x = 40 + k * 146;
      box(g, x, 40, 132, 54, C_SURFACE2, k === 3 ? C_GOOD : C_ACCENT);
      g.appendChild(paint(svgText(x + 66, 62, p.t, null, 11, 'middle'), k === 3 ? C_GOOD : C_ACCENT));
      g.appendChild(svgText(x + 66, 81, p.d, 'demo-x-mut', 8.6, 'middle'));
      if (k < S2_PIPE.length - 1) link(g, [[x + 133, 67], [x + 145, 67]], mk);
      return { g: g, at: 0.3 + k * 0.6 };
    });

    var src = group(s);
    src.appendChild(svgText(40, 118, thou(N_SOURCES) + ' 段的来源（官方仓库 index.csv）：AMASS ' + thou(N_AMASS) + ' + HumanAct12 1,191', 'demo-x-ink2', 10));
    var x0 = 40;
    var srcSegs = SOURCES.map(function (sc, k) {
      var w = (sc.n / N_SOURCES) * 720;
      var r = paint(svgEl('rect', { x: x0, y: 126, width: w - 2, height: 20, rx: 3 }), sc.c);
      r.style.opacity = sc.c === C_BORDER ? 1 : 0.85;
      src.appendChild(r);
      var lbl = svgText(x0 + 2, 162, sc.t, 'demo-x-mut', 8.6);
      var num = svgText(x0 + 2, 175, thou(sc.n) + '·' + fmt((sc.n / N_SOURCES) * 100, 1) + '%', 'demo-x-mono', 7.8);
      src.appendChild(lbl);
      src.appendChild(num);
      var out = { r: r, w: w, x: x0, at: 3.0 + k * 0.25 };
      x0 += w;
      return out;
    });

    var cmp = group(s);
    cmp.appendChild(svgText(40, 202, '论文 Table 1：HumanML3D（蓝）对比 KIT-ML（灰）', 'demo-x-ink2', 10));
    var bars = S2_ROWS.map(function (r, k) {
      var y = 214 + k * 30;
      cmp.appendChild(svgText(40, y + 15, r.t, 'demo-x-ink2', 10));
      var full = 380;
      var a = paint(svgEl('rect', { x: 120, y: y + 2, width: full, height: 10, rx: 2 }), C_ACCENT);
      var b = paint(svgEl('rect', { x: 120, y: y + 14, width: full / r.r, height: 8, rx: 2 }), C_MUTED);
      cmp.appendChild(a);
      cmp.appendChild(b);
      cmp.appendChild(paint(svgText(508, y + 11, r.f(r.a), 'demo-x-mono', 9.5), C_ACCENT));
      cmp.appendChild(svgText(508, y + 23, r.f(r.b), 'demo-x-mono', 8.6));
      cmp.appendChild(paint(svgText(640, y + 17, '× ' + fmt(r.r, 2), 'demo-x-mono', 12), C_GOOD));
      return { a: a, b: b, full: full, r: r.r };
    });

    var foot = group(s);
    foot.appendChild(
      paint(
        svgText(400, 352, '平均每段 ' + fmt(TEXTS_PER_MOTION, 2) + ' 条描述、7.1 s、12 个词；镜像后 ' + thou(MIRRORED) + ' 段，0.8 : 0.15 : 0.05 切分', null, 12, 'middle'),
        C_ACCENT
      )
    );
    foot.appendChild(svgText(400, 376, fmt(HML.hours, 2) + ' h ÷ ' + thou(HML.motions) + ' 段 = ' + fmt(MEAN_SEC, 2) + ' s，和论文的 7.1 s 同一量级；最短 2 s、最长 10 s', 'demo-x-mut', 9.5, 'middle'));

    function draw(t) {
      pipe.forEach(function (p) {
        setOpacity(p.g, seg(t, p.at, p.at + 0.4));
      });
      setOpacity(src, seg(t, 3.0, 3.4));
      srcSegs.forEach(function (sg) {
        sg.r.setAttribute('width', Math.max(0, (sg.w - 2) * ease(seg(t, sg.at, sg.at + 0.5))).toFixed(1));
      });
      setOpacity(cmp, seg(t, 6.0, 6.6));
      var g = ease(seg(t, 6.4, 8.0));
      bars.forEach(function (b) {
        b.a.setAttribute('width', (b.full * g).toFixed(1));
        b.b.setAttribute('width', ((b.full / b.r) * g).toFixed(1));
      });
      setOpacity(foot, seg(t, 10.0, 10.8));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 3 幕：一帧 263 维 ───────────────────────────────────────────
  function buildSceneFeature() {
    var s = sceneSvg(
      '每帧特征 ' +
        DIM +
        ' 维：根节点角速度、xz 速度、高度共 4 维，21 个关节的局部位置 63 维、6D 旋转 126 维，22 个关节的局部速度 66 维，脚的触地标签 4 维'
    );
    s.appendChild(svgText(56, 26, '一帧不是 22 个关节坐标，而是 ' + DIM + ' 个精心拆过的数', 'demo-x-ink2', 13.5));

    var barG = group(s);
    var x = 40;
    var parts = FEAT.map(function (f, k) {
      var w = (f.n / DIM) * 720;
      var r = paint(svgEl('rect', { x: x, y: 44, width: Math.max(w - 1, 1.5), height: 30, rx: 2 }), f.c);
      r.style.opacity = 0.85;
      barG.appendChild(r);
      var p = { r: r, x: x, w: w, f: f, at: 0.6 + k * 0.45 };
      x += w;
      return p;
    });
    /* 宽的段把标签写在条里，窄的（根节点 4 维、触地 4 维）用引线拉出来 */
    var lbls = parts.map(function (p, k) {
      var g = group(barG);
      if (p.w > 60) {
        g.appendChild(paint(svgText(p.x + p.w / 2, 64, p.f.t + ' ' + p.f.n, null, 10.5, 'middle'), 'var(--demo-surface)'));
      } else if (k < 3) {
        if (k === 0) {
          link(g, [[42, 76], [42, 96]], null, C_BAD);
          g.appendChild(paint(svgText(46, 100, '根节点 1 + 2 + 1 = 4', null, 9.5), C_BAD));
        }
      } else {
        link(g, [[p.x + p.w / 2, 76], [p.x + p.w / 2, 96], [p.x - 20, 96]], null, C_MUTED);
        g.appendChild(svgText(p.x - 24, 100, '触地 4', 'demo-x-ink2', 9.5, 'end'));
      }
      return g;
    });

    var formula = group(s);
    var fMath = svgMath(310, 128, '1 + 2 + 1 + 3(J-1) + 6(J-1) + 3J + 4 = ' + DIM + '\\quad (J = ' + JOINTS + ')', { size: 12.5, w: 540, anchor: 'middle' });
    fMath.setTone('var(--demo-accent)');
    formula.appendChild(fMath);
    formula.appendChild(svgRich(760, 128, 'KIT-ML $J = ' + JOINTS_KIT + '$ → ' + DIM_KIT, { size: 10, cls: 'demo-x-mut', anchor: 'end', w: 200 }));

    var clip = group(s);
    box(clip, 40, 152, 400, 168, C_SURFACE, C_ACCENT);
    clip.appendChild(paint(svgText(56, 174, '真实片段 ' + CLIP.id + '（官方仓库自带，打网球）', null, 11.5), C_ACCENT));
    var clipLines = [
      CLIP.rows + ' 行 × ' + DIM + ' 维 = ' + thou(CLIP_NUMS) + ' 个数（' + fmt(CLIP_SEC, 1) + ' s）',
      '速度要两帧做差：原始 ' + CLIP_RAW + ' 帧 → ' + CLIP.rows + ' 行',
      '左脚触地 ' + fmt(CLIP.contactL[0] * 100, 0) + '% / ' + fmt(CLIP.contactL[1] * 100, 0) + '%，右脚 ' + fmt(CLIP.contactR[0] * 100, 0) + '% / ' + fmt(CLIP.contactR[1] * 100, 0) + '%',
      '右腕峰值速度 ' + fmt(CLIP.wristPeak, 1) + ' m/s，在第 ' + CLIP.wristFrame + ' 帧（' + fmt(WRIST_SEC, 1) + ' s）',
      '根节点平均高 ' + fmt(CLIP.rootY, 2) + ' m；绕竖轴累计转 ' + fmt(CLIP.yawDeg, 1) + '°'
    ].map(function (t, k) {
      var tx = svgText(60, 198 + k * 24, t, k === 3 ? 'demo-x-mono' : 'demo-x-mut', 10);
      if (k === 3) paint(tx, C_WARN);
      clip.appendChild(tx);
      return tx;
    });

    var foot2 = group(s);
    box(foot2, 456, 152, 304, 168, C_SURFACE2, C_MUTED);
    foot2.appendChild(svgText(472, 174, '触地标签怎么来', 'demo-x-ink2', 11.5));
    foot2.appendChild(svgMath(472, 202, '\\lVert p^{\\mathrm{foot}}_{t+1} - p^{\\mathrm{foot}}_{t} \\rVert^2 < ' + FOOT_THR, { size: 11.5, w: 280 }));
    foot2.appendChild(svgText(472, 232, '= 每帧位移 < ' + fmt(FOOT_M * 100, 2) + ' cm', 'demo-x-mono', 10.5));
    foot2.appendChild(paint(svgText(472, 256, '× ' + FPS + ' fps = ' + fmt(FOOT_MS, 3) + ' m/s', 'demo-x-mono', 12), C_GOOD));
    foot2.appendChild(svgText(472, 282, '比这慢就记作「踩着地」，', 'demo-x-mut', 9.5));
    foot2.appendChild(svgText(472, 300, '左右脚各 2 个关节 = 4 维', 'demo-x-mut', 9.5));

    var foot = paint(svgText(400, 360, '根节点只存速度、关节存相对根的量 → 平移和朝向不变；触地标签用来压脚滑', null, 12.5, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      parts.forEach(function (p) {
        var u = ease(seg(t, p.at, p.at + 0.5));
        p.r.setAttribute('width', Math.max((p.w - 1) * u, 0).toFixed(1));
      });
      lbls.forEach(function (g, k) {
        setOpacity(g, seg(t, parts[k].at + 0.3, parts[k].at + 0.7));
      });
      setOpacity(formula, seg(t, 4.0, 4.8));
      setOpacity(clip, seg(t, 5.6, 6.2));
      clipLines.forEach(function (ln, k) {
        setOpacity(ln, seg(t, 5.8 + k * 0.5, 6.2 + k * 0.5));
      });
      setOpacity(foot2, seg(t, 8.6, 9.4));
      setOpacity(foot, seg(t, 11.0, 11.8));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 4 幕：每 4 帧一个 snippet code ─────────────────────────────
  function buildSceneSnippet() {
    var s = sceneSvg(
      '运动自编码器用两层 kernel 4、stride 2 的一维卷积把 ' +
        CLIP_FRAMES +
        ' 帧压成 ' +
        CLIP_CODES +
        ' 个 ' +
        CODE_DIM +
        ' 维 snippet code，损失含 L1 重建、稀疏与平滑三项'
    );
    s.appendChild(svgText(56, 26, '先压缩：每 ' + UNIT + ' 帧 → 1 个 ' + CODE_DIM + ' 维 snippet code', 'demo-x-ink2', 13.5));

    var FW = 720 / CLIP_FRAMES;
    var frames = group(s);
    frames.appendChild(svgText(40, 46, CLIP.rows + ' 行裁到 ' + UNIT + ' 的倍数：' + CLIP_FRAMES + ' 帧 × ' + ENC_IN + ' 维（触地 4 维不进编码器）', 'demo-x-ink2', 10));
    for (var i = 0; i < CLIP_FRAMES; i++) {
      frames.appendChild(paint(svgEl('rect', { x: 40 + i * FW, y: 54, width: Math.max(FW - 0.8, 0.6), height: 22 }), i === CLIP.wristFrame ? C_WARN : C_MUTED));
    }

    var convs = [
      { y: 96, n: CONV1, t: 'Conv1d k=4 s=2 → ' + CONV1 + ' 步' },
      { y: 124, n: CONV2, t: 'Conv1d k=4 s=2 → ' + CONV2 + ' 步' }
    ].map(function (c) {
      var g = group(s);
      var w = 720 / c.n;
      for (var j = 0; j < c.n; j++) {
        g.appendChild(paint(svgEl('rect', { x: 40 + j * w, y: c.y, width: Math.max(w - 1, 0.8), height: 14, rx: 1.5 }), C_SURFACE2, C_BORDER));
      }
      return { g: g, t: c.t, y: c.y };
    });
    convs.forEach(function (c) {
      c.g.appendChild(svgText(400, c.y - 3, c.t, 'demo-x-mut', 8.6, 'middle'));
    });

    var CW = 720 / CLIP_CODES;
    var codes = group(s);
    var cells = [];
    for (var j2 = 0; j2 < CLIP_CODES; j2++) {
      var r = paint(svgEl('rect', { x: 40 + j2 * CW, y: 158, width: CW - 1.5, height: 26, rx: 3, 'stroke-width': 1 }), C_SURFACE2, C_ACCENT);
      codes.appendChild(r);
      cells.push(r);
    }
    codes.appendChild(svgText(40, 200, CLIP_CODES + ' 个 code × ' + CODE_DIM + ' 维；第 ' + (CLIP.wristFrame / UNIT + 1) + ' 个 code 管到挥拍那一帧（橙）', 'demo-x-ink2', 10));

    var win = paint(svgEl('rect', { y: 52, height: 26, width: UNIT * FW, rx: 2, fill: 'none', 'stroke-width': 1.8 }), null, C_GOOD);
    var cellHi = paint(svgEl('rect', { y: 156, height: 30, width: CW + 1, rx: 3, fill: 'none', 'stroke-width': 2 }), null, C_GOOD);
    s.appendChild(win);
    s.appendChild(cellHi);

    var left = group(s);
    box(left, 40, 214, 350, 104, C_SURFACE, C_BORDER);
    left.appendChild(paint(svgText(56, 236, '为什么先压缩', null, 11.5), C_ACCENT));
    left.appendChild(svgText(56, 258, thou(NUMS_IN) + ' 个数 → ' + thou(NUMS_CODE) + ' 个数（少 ' + fmt(SQUEEZE, 2) + ' 倍）', 'demo-x-mono', 10));
    left.appendChild(svgText(56, 278, '生成器只要走 ' + CLIP_CODES + ' 步，不是 ' + CLIP_FRAMES + ' 步', 'demo-x-mut', 10));
    left.appendChild(svgText(56, 298, '每个 code 管 ' + fmt(UNIT / FPS, 1) + ' s，感受野约 ' + fmt(RF_SEC, 1) + ' s（' + RF + ' 帧）', 'demo-x-mut', 10));

    var right = group(s);
    box(right, 406, 214, 354, 104, C_SURFACE2, C_ACCENT);
    var lossMath = svgMath(
      583,
      246,
      '\\mathcal{L}_{E,D} = \\sum \\lVert \\hat{p} - p \\rVert_1 + \\lambda_{spr} \\sum \\lVert c^t \\rVert_1 + \\lambda_{smt} \\sum \\lVert c^t - c^{t-1} \\rVert_1',
      { size: 10.5, w: 346, anchor: 'middle' }
    );
    lossMath.setTone('var(--demo-accent)');
    right.appendChild(lossMath);
    right.appendChild(svgRich(422, 278, '$\\lambda_{spr} = \\lambda_{smt} = ' + LAMBDA_SPR + '$：code 稀疏、相邻 code 平滑', { size: 10, cls: 'demo-x-mut', w: 330 }));
    right.appendChild(svgText(422, 302, '解码器还要额外预测 4 维触地，防脚滑', 'demo-x-mut', 10));

    var foot = paint(svgText(400, 352, '消融：去掉 snippet code，R-Precision top-1 从 ' + fmt(OURS.top1, 3) + ' 掉到 ' + fmt(ABL[0].top1, 3), null, 13, 'middle'), C_ACCENT);
    s.appendChild(foot);
    var foot2 = svgText(400, 376, '编码器 E 之后冻住，给时序 VAE 提供目标 code；评测器也复用同一个 E', 'demo-x-mut', 10, 'middle');
    s.appendChild(foot2);

    function draw(t) {
      setOpacity(frames, seg(t, 0.3, 0.9));
      setOpacity(convs[0].g, seg(t, 1.6, 2.2));
      setOpacity(convs[1].g, seg(t, 2.4, 3.0));
      setOpacity(codes, seg(t, 3.2, 3.8));
      var on = seg(t, 3.8, 4.2) * (1 - seg(t, 10.6, 11.0));
      var k = Math.min(CLIP_CODES - 1, Math.floor(ease(seg(t, 4.0, 7.0)) * (CLIP.wristFrame / UNIT)));
      win.setAttribute('x', (40 + k * UNIT * FW).toFixed(1));
      cellHi.setAttribute('x', (40 + k * CW - 1.2).toFixed(1));
      setOpacity(win, on);
      setOpacity(cellHi, on);
      cells.forEach(function (c, j) {
        c.style.fill = j === CLIP.wristFrame / UNIT && t > 6.8 ? C_WARN : C_SURFACE2;
      });
      setOpacity(left, seg(t, 5.4, 6.0));
      setOpacity(right, seg(t, 7.6, 8.4));
      setOpacity(foot, seg(t, 10.2, 11.0));
      setOpacity(foot2, seg(t, 11.0, 11.6));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 5 幕：Text2Length ───────────────────────────────────────────
  var S5_ENC = [
    { t: 'GloVe 300 维 + 词性 one-hot 15 维', d: '方向 / 身体部位 / 物体 / 动作词另标' },
    { t: 'Bi-GRU（隐层 512）', d: '句向量 1024 维' },
    { t: 'MLP + softmax', d: N_LEN_CLASSES + ' 个长度类，交叉熵训练' }
  ];
  var S5_TOKENS = [
    { w: 'play', p: 'VERB', vip: false },
    { w: 'tennis', p: 'NOUN', vip: false },
    { w: 'ball', p: '物体', vip: true },
    { w: 'right', p: '方向', vip: true },
    { w: 'hand', p: '部位', vip: true }
  ];

  function buildSceneLength() {
    var s = sceneSvg(
      'Text2Length 把文本编码后输出 ' +
        N_LEN_CLASSES +
        ' 个长度类上的分布，k 个 code 对应 4k 帧；示意分布在 ' +
        PEAK_SAMPLES.join(' / ') +
        ' 个 code 处取样，周期动作的分布更平'
    );
    s.appendChild(svgText(56, 26, 'Text2Length：先从文本得到一个长度分布，再采样', 'demo-x-ink2', 13.5));

    var mk = arrow(s, 'hml-x-arrow-len');
    var enc = S5_ENC.map(function (e, k) {
      var g = group(s);
      var y = 42 + k * 62;
      box(g, 40, y, 300, 48, C_SURFACE2, k === 2 ? C_GOOD : C_ACCENT);
      g.appendChild(paint(svgText(56, y + 20, e.t, null, 10.5), k === 2 ? C_GOOD : C_ACCENT));
      g.appendChild(svgText(56, y + 38, e.d, 'demo-x-mut', 9));
      if (k < S5_ENC.length - 1) link(g, [[190, y + 49], [190, y + 61]], mk);
      return { g: g, at: 0.4 + k * 0.8 };
    });

    var toks = group(s);
    toks.appendChild(svgText(40, 238, '例句 ' + CLIP.id + '：a person appears to be playing tennis …', 'demo-x-mut', 9));
    S5_TOKENS.forEach(function (tk, k) {
      var x = 40 + k * 60;
      box(toks, x, 246, 56, 34, tk.vip ? C_SURFACE2 : C_SURFACE, tk.vip ? C_WARN : C_BORDER, { rx: 6 });
      toks.appendChild(paint(svgText(x + 28, 260, tk.w, 'demo-x-mono', 9.5, 'middle'), tk.vip ? C_WARN : null));
      toks.appendChild(svgText(x + 28, 274, tk.p, 'demo-x-mut', 8, 'middle'));
    });

    /* 直方图：x 是 code 数 k ∈ [10, 49]，y 是概率 */
    var PX = 380,
      PY = 54,
      PW = 370,
      PH = 180;
    var BW = PW / (K_MAX - K_MIN + 1);
    var YMAX = 0.15;
    var plot = group(s);
    box(plot, PX - 10, PY - 18, PW + 20, PH + 52, C_SURFACE, C_BORDER);
    plot.appendChild(svgRich(PX, PY - 4, '示意分布 $p(k \\mid \\text{text})$，不是论文 Fig. 6 的数', { size: 9.5, cls: 'demo-x-ink2', w: 360 }));
    plot.appendChild(paint(svgEl('line', { x1: PX, y1: PY + PH, x2: PX + PW, y2: PY + PH, 'stroke-width': 1 }), null, C_GRID));
    [10, 20, 30, 40, 49].forEach(function (k) {
      var x = PX + (k - K_MIN + 0.5) * BW;
      plot.appendChild(svgText(x, PY + PH + 14, String(k), 'demo-x-mono', 8.5, 'middle'));
    });
    plot.appendChild(svgRich(PX + PW, PY + PH + 28, '$k$ 个 code = $4k$ 帧 = $k/5$ 秒', { size: 8.6, cls: 'demo-x-mut', anchor: 'end', w: 260 }));
    function bars(p, color, dx) {
      var g = group(plot);
      var rs = p.map(function (v, i) {
        var h = (v / YMAX) * PH;
        var r = paint(svgEl('rect', { x: PX + i * BW + dx, y: PY + PH - h, width: BW / 2 - 0.6, height: h }), color);
        g.appendChild(r);
        return { r: r, h: h };
      });
      return { g: g, rs: rs };
    }
    var peak = bars(LEN_PEAK, C_ACCENT, 0);
    var flat = bars(LEN_FLAT, C_WARN, BW / 2);
    var peakLbl = paint(svgText(PX + (CLIP_CODES - K_MIN) * BW - 6, PY + 10, '打网球：峰在 ' + CLIP_CODES, null, 9.5, 'end'), C_ACCENT);
    var flatLbl = paint(svgText(PX + 4, PY + PH - 46, '挥手（周期）：更平', null, 9.5), C_WARN);
    plot.appendChild(peakLbl);
    plot.appendChild(flatLbl);
    var marks = PEAK_SAMPLES.map(function (k) {
      var x = PX + (k - K_MIN + 0.25) * BW;
      var m = paint(svgEl('path', { d: polyPath([[x, PY + PH + 2], [x - 4, PY + PH + 9], [x + 4, PY + PH + 9], [x, PY + PH + 2]]), 'stroke-width': 1 }), C_GOOD, C_GOOD);
      plot.appendChild(m);
      return m;
    });

    var res = group(s);
    box(res, 40, 296, 720, 50, C_SURFACE2, C_GOOD);
    res.appendChild(
      paint(
        svgText(
          56,
          317,
          '按累积概率 ' + SAMPLE_U.join(' / ') + ' 取三次：' + PEAK_SAMPLES.join(' / ') + ' 个 code → ' + PEAK_SAMPLES.map(codesToSec).map(function (v) {
            return fmt(v, 1);
          }).join(' / ') + ' s',
          null,
          11.5
        ),
        C_GOOD
      )
    );
    res.appendChild(
      svgText(
        56,
        336,
        '挥手那条：' + FLAT_SAMPLES.join(' / ') + ' 个 code → ' + FLAT_SAMPLES.map(codesToSec).map(function (v) {
          return fmt(v, 1);
        }).join(' / ') + ' s，长短差得更多',
        'demo-x-mut',
        10
      )
    );

    var foot = svgRich(400, 378, '推理时采到 $k < ' + K_MIN + '$（不足 2 s）会重采；同一句话因此能生成不同时长的动作', { size: 12.5, anchor: 'middle', w: 700 }).setTone('var(--demo-accent)');
    s.appendChild(foot);

    function draw(t) {
      enc.forEach(function (e) {
        setOpacity(e.g, seg(t, e.at, e.at + 0.5));
      });
      setOpacity(toks, seg(t, 2.6, 3.2));
      setOpacity(plot, seg(t, 4.2, 4.8));
      var gp = ease(seg(t, 4.6, 6.0));
      peak.rs.forEach(function (b) {
        b.r.setAttribute('height', (b.h * gp).toFixed(1));
        b.r.setAttribute('y', (PY + PH - b.h * gp).toFixed(1));
      });
      setOpacity(peakLbl, seg(t, 5.6, 6.0));
      var gf = ease(seg(t, 9.0, 10.2));
      flat.rs.forEach(function (b) {
        b.r.setAttribute('height', (b.h * gf).toFixed(1));
        b.r.setAttribute('y', (PY + PH - b.h * gf).toFixed(1));
      });
      setOpacity(flatLbl, seg(t, 9.8, 10.2));
      marks.forEach(function (m, k) {
        setOpacity(m, seg(t, 6.6 + k * 0.4, 7.0 + k * 0.4));
      });
      setOpacity(res, seg(t, 7.4, 8.0));
      setOpacity(foot, seg(t, 11.0, 11.8));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 6 幕：时序 VAE 的一步 ───────────────────────────────────────
  var S6_NETS = [
    { t: '先验 $F_\\psi$', tex: '[c^{t-1},\\, w^t_{att}]', n: PRI_IN, d: '推理时唯一的 $z_t$ 来源', c: C_ACCENT },
    { t: '后验 $F_\\phi$', tex: '[c^{t-1},\\, c^t,\\, w^t_{att}]', n: POS_IN, d: '只在训练时看真值 $c^t$', c: C_WARN },
    { t: '生成器 $F_\\theta$', tex: '[c^{t-1},\\, w^t_{att},\\, z_t]', n: GEN_IN, d: '输出 $\\hat{c}^t$（' + CODE_DIM + ' 维）', c: C_GOOD }
  ];

  function buildSceneStep() {
    var s = sceneSvg(
      '时序 VAE 每一步先用生成器隐状态对词特征做注意力，再由先验、后验、生成器三个 GRU 处理上一步 code；第 ' +
        SWING_T +
        ' 步离终点还剩 ' +
        TTA_SWING +
        ' 个 code'
    );
    s.appendChild(svgText(56, 24, 'Text2Motion：时序 VAE 每一步生成一个 code', 'demo-x-ink2', 13.5));

    var att = svgMath(400, 52, 'w^t_{att} = \\mathrm{softmax}\\!\\left(\\frac{(h^{t-1}_\\theta W^Q)(w_{1:M} W^K)^\\top}{\\sqrt{d_{att}}}\\right) w_{1:M} W^V', { size: 13.5, w: 640, anchor: 'middle' });
    att.setTone('var(--demo-accent)');
    s.appendChild(att);

    var words = group(s);
    var BH = 46;
    var early = [],
      swing = [];
    ATT_WORDS.forEach(function (w, k) {
      var x = 40 + k * 90;
      box(words, x, 136, 82, 22, C_SURFACE2, C_BORDER, { rx: 5 });
      words.appendChild(svgText(x + 41, 151, w, 'demo-x-mono', 9.5, 'middle'));
      var a = paint(svgEl('rect', { x: x + 10, y: 132, width: 28, height: 0 }), C_ACCENT);
      var b = paint(svgEl('rect', { x: x + 44, y: 132, width: 28, height: 0 }), C_GOOD);
      var la = svgText(x + 24, 128, fmt(ATT_EARLY[k], 2), 'demo-x-mono', 8.2, 'middle');
      var lb = paint(svgText(x + 58, 128, fmt(ATT_SWING[k], 2), 'demo-x-mono', 8.2, 'middle'), C_GOOD);
      words.appendChild(a);
      words.appendChild(b);
      words.appendChild(la);
      words.appendChild(lb);
      early.push({ r: a, l: la, v: ATT_EARLY[k] });
      swing.push({ r: b, l: lb, v: ATT_SWING[k] });
    });
    var legend = group(s);
    box(legend, 500, 74, 260, 84, C_SURFACE, C_BORDER);
    legend.appendChild(svgText(514, 94, '示意注意力（打分是编的，权重现算）', 'demo-x-ink2', 9.5));
    legend.appendChild(paint(svgText(514, 114, '■ 第 ' + ATT_EARLY_T + ' 步：还在准备', null, 9.5), C_ACCENT));
    legend.appendChild(paint(svgText(514, 132, '■ 第 ' + SWING_T + ' 步：挥拍（第 ' + CLIP.wristFrame + ' 帧）', null, 9.5), C_GOOD));
    legend.appendChild(svgRich(514, 150, '$d_{att} = ' + DIM_ATT + '$，除以 $\\sqrt{' + DIM_ATT + '} \\approx ' + fmt(SQRT_ATT, 1) + '$', { size: 9.5, cls: 'demo-x-mut', w: 240 }));

    var nets = S6_NETS.map(function (n, k) {
      var g = group(s);
      var x = 40 + k * 244;
      box(g, x, 172, 232, 92, C_SURFACE2, n.c, { sw: 1.5 });
      g.appendChild(svgRich(x + 14, 192, n.t, { size: 11.5, w: 210 }).setTone(n.c));
      g.appendChild(svgMath(x + 14, 218, n.tex, { size: 10.5, w: 210 }));
      g.appendChild(svgText(x + 14, 240, '输入 ' + thou(n.n) + ' 维 → GRU ' + DIM_HID, 'demo-x-mono', 9.5));
      g.appendChild(svgRich(x + 14, 256, n.d, { size: 9, cls: 'demo-x-mut', w: 210 }));
      return { g: g, at: 4.2 + k * 1.2 };
    });

    var kl = group(s);
    link(kl, [[156, 266], [156, 278], [400, 278]], null, C_BAD, '4 3');
    link(kl, [[400, 266], [400, 278]], null, C_BAD, '4 3');
    kl.appendChild(svgRich(412, 283, '$D_{\\mathrm{KL}}(\\mathcal{N}(\\mu_\\phi, \\sigma_\\phi) \\,\\Vert\\, \\mathcal{N}(\\mu_\\psi, \\sigma_\\psi))$：把后验拉向先验', { size: 9.5, cls: 'demo-x-mut', w: 340 }));

    var pe = group(s);
    box(pe, 40, 298, 720, 44, C_SURFACE, C_WARN);
    pe.appendChild(
      svgRich(
        56,
        324,
        '到达倒计时 $\\mathrm{PE}(T - t)$：本段 $T = ' + CLIP_CODES + '$ 个 code，第 ' + SWING_T + ' 步还剩 $T - t = ' + TTA_SWING + '$；句向量 $s$ 初始化三个 GRU 的隐状态',
        { size: 10.5, w: 700 }
      ).setTone('var(--demo-warn)')
    );

    var foot = svgRich(400, 376, '训练时 $z_t$ 来自后验，推理时只剩先验 —— KL 项就是在让两者对得上', { size: 13, anchor: 'middle', w: 700 }).setTone('var(--demo-accent)');
    s.appendChild(foot);

    function draw(t) {
      setOpacity(att, seg(t, 0.3, 1.0));
      setOpacity(words, seg(t, 1.2, 1.6));
      setOpacity(legend, seg(t, 1.4, 1.9));
      var ge = ease(seg(t, 1.6, 2.6)),
        gs = ease(seg(t, 2.8, 3.8));
      early.forEach(function (b) {
        var h = b.v * BH * 2 * ge;
        b.r.setAttribute('y', (132 - h).toFixed(1));
        b.r.setAttribute('height', h.toFixed(1));
        b.l.setAttribute('y', (128 - h).toFixed(1));
        setOpacity(b.l, ge);
      });
      swing.forEach(function (b) {
        var h = b.v * BH * 2 * gs;
        b.r.setAttribute('y', (132 - h).toFixed(1));
        b.r.setAttribute('height', h.toFixed(1));
        b.l.setAttribute('y', (128 - h).toFixed(1));
        setOpacity(b.l, gs);
      });
      nets.forEach(function (n) {
        setOpacity(n.g, seg(t, n.at, n.at + 0.5));
      });
      setOpacity(kl, seg(t, 8.0, 8.6));
      setOpacity(pe, seg(t, 9.6, 10.2));
      setOpacity(foot, seg(t, 11.6, 12.4));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 7 幕：三项损失 + 课程学习 + teacher forcing ─────────────────
  function buildSceneTrain() {
    var s = sceneSvg(
      '总损失是 code 重建、动作重建与 KL 三项；课程学习从 ' +
        CUR_START +
        ' 个 code 起每阶段加 1 直到 ' +
        CUR_END +
        '，共 ' +
        N_STAGES +
        ' 个阶段；teacher forcing 概率 ' +
        P_TF
    );
    s.appendChild(svgText(56, 24, '怎么训：三项损失 + 课程学习 + teacher forcing', 'demo-x-ink2', 13.5));

    var loss = svgMath(400, 54, '\\mathcal{L} = \\mathcal{L}^{code}_{rec} + \\lambda_{mot}\\, \\mathcal{L}^{mot}_{rec} + \\lambda_{KL}\\, \\mathcal{L}_{KL}', { size: 14, w: 520, anchor: 'middle' });
    loss.setTone('var(--demo-accent)');
    s.appendChild(loss);
    var lossNote = svgRich(400, 82, '$\\lambda_{mot} = ' + LAMBDA_MOT + '$，$\\lambda_{KL} = ' + LAMBDA_KL + '$（KIT-ML ' + LAMBDA_KL_KIT + '）；三项都是逐 code / 逐帧的 L1 与逐步 KL 求和', {
      size: 10,
      cls: 'demo-x-mut',
      anchor: 'middle',
      w: 640
    });
    s.appendChild(lossNote);

    /* 课程学习的台阶：x 是阶段，y 是这一阶段训到的 code 数 */
    var GX = 64,
      GY = 112,
      GW = 380,
      GH = 168;
    var stair = group(s);
    box(stair, 40, 100, 430, 222, C_SURFACE, C_BORDER);
    stair.appendChild(svgRich(56, 120, '课程学习：每阶段训练前 $T_{cur}$ 个 code，验证损失不降就 +1', { size: 10, cls: 'demo-x-ink2', w: 400 }));
    function sy(k) {
      return GY + GH - ((k - 0) / CUR_END) * (GH - 20);
    }
    var pts = [];
    for (var st = 0; st < N_STAGES; st++) {
      var x0 = GX + (st / N_STAGES) * GW,
        x1 = GX + ((st + 1) / N_STAGES) * GW;
      var y = sy(CUR_START + st);
      pts.push([x0, y], [x1, y]);
    }
    var stairPath = paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': 2 }), null, C_GOOD);
    stair.appendChild(stairPath);
    var stairLen = 0;
    for (var q = 1; q < pts.length; q++) stairLen += Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]);
    stairPath.setAttribute('stroke-dasharray', stairLen.toFixed(1));
    stair.appendChild(paint(svgEl('line', { x1: GX, y1: GY + GH, x2: GX + GW, y2: GY + GH, 'stroke-width': 1 }), null, C_GRID));
    stair.appendChild(svgText(GX - 4, sy(CUR_START) + 4, String(CUR_START), 'demo-x-mono', 8.6, 'end'));
    stair.appendChild(svgText(GX - 4, sy(CUR_END) + 4, String(CUR_END), 'demo-x-mono', 8.6, 'end'));
    stair.appendChild(svgText(GX + 8, sy(CUR_START) + 16, CUR_START * UNIT + ' 帧 = ' + fmt(codesToSec(CUR_START), 1) + ' s', 'demo-x-mut', 8.6));
    stair.appendChild(paint(svgText(GX + GW - 4, sy(CUR_END) - 8, CUR_END * UNIT + ' 帧 = ' + fmt(codesToSec(CUR_END), 1) + ' s', null, 9, 'end'), C_GOOD));
    stair.appendChild(svgText(GX + GW / 2, GY + GH + 16, N_STAGES + ' 个阶段（官方代码 HumanML3D：' + CUR_START + ' → ' + CUR_END + '）', 'demo-x-mut', 9, 'middle'));

    var tf = group(s);
    box(tf, 486, 100, 274, 104, C_SURFACE2, C_WARN);
    tf.appendChild(paint(svgText(500, 120, 'teacher forcing：每个 batch 抛一次硬币', null, 10.5), C_WARN));
    var tfA = paint(svgEl('rect', { x: 500, y: 132, width: 246 * P_TF, height: 18, rx: 3 }), C_GOOD);
    var tfB = paint(svgEl('rect', { x: 500 + 246 * P_TF, y: 132, width: 246 * (1 - P_TF), height: 18, rx: 3 }), C_MUTED);
    tf.appendChild(tfA);
    tf.appendChild(tfB);
    tf.appendChild(svgRich(500, 168, fmt(P_TF * 100, 0) + '%：下一步喂真实 $c^{t}$', { size: 9.5, cls: 'demo-x-mut', w: 250 }));
    tf.appendChild(svgRich(500, 188, fmt((1 - P_TF) * 100, 0) + '%：喂自己生成的 $\\hat{c}^{t}$，贴近推理', { size: 9.5, cls: 'demo-x-mut', w: 250 }));

    var misc = group(s);
    box(misc, 486, 214, 274, 108, C_SURFACE, C_BORDER);
    misc.appendChild(svgRich(500, 236, '$c^0 = E(\\text{平均姿态})$：开头喂一个常数 code', { size: 10, w: 250 }));
    misc.appendChild(svgText(500, 260, '解码器 D 一起微调，学习率小 10 倍', 'demo-x-mut', 9.5));
    misc.appendChild(svgText(500, 280, fmt(LR_DEC * 1e5, 0) + 'e-5 vs 其余 ' + fmt(LR * 1e4, 0) + 'e-4（Adam）', 'demo-x-mono', 9.5));
    misc.appendChild(svgText(500, 304, '根速度 / 高度 / 触地的特征放大 5 倍', 'demo-x-mut', 9.5));

    var foot = svgRich(400, 356, '推理：text2length 采 $T$ → 先验采 $z_t$ → 生成器滚 $T$ 步 → 解码器 $D$ 还原 $4T$ 帧', { size: 12.5, anchor: 'middle', w: 720 }).setTone('var(--demo-accent)');
    s.appendChild(foot);
    var foot2 = svgRich(400, 380, '补充材料写 $T_{cur}$ 从 8 起步、$T_{max} = 50$；开源代码按 ' + CUR_START + ' → ' + CUR_END + ' 跑', { size: 9.5, cls: 'demo-x-mut', anchor: 'middle', w: 560 });
    s.appendChild(foot2);

    function draw(t) {
      setOpacity(loss, seg(t, 0.3, 1.0));
      setOpacity(lossNote, seg(t, 1.2, 1.8));
      setOpacity(stair, seg(t, 3.0, 3.6));
      stairPath.setAttribute('stroke-dashoffset', (stairLen * (1 - ease(seg(t, 3.4, 6.4)))).toFixed(1));
      setOpacity(tf, seg(t, 6.8, 7.4));
      var g = ease(seg(t, 7.2, 8.0));
      tfA.setAttribute('width', (246 * P_TF * g).toFixed(1));
      tfB.setAttribute('x', (500 + 246 * P_TF * g).toFixed(1));
      tfB.setAttribute('width', (246 * (1 - P_TF) * g).toFixed(1));
      setOpacity(misc, seg(t, 9.0, 9.6));
      setOpacity(foot, seg(t, 10.8, 11.6));
      setOpacity(foot2, seg(t, 11.6, 12.2));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 8 幕：评测器与 R-Precision ─────────────────────────────────
  var S8_METRICS = [
    { t: 'FID', d: '生成 vs 真实的特征分布距离', c: C_ACCENT },
    { t: 'MultiModal Dist', d: '动作特征到自己那句的平均距离', c: C_ACCENT },
    { t: 'Diversity', d: '随机抽 ' + DIV_PAIRS + ' 对，平均距离', c: C_GOOD },
    { t: 'MultiModality', d: MM_TEXTS + ' 句 × ' + MM_REPEATS + ' 次，每句抽 ' + MM_PAIRS + ' 对', c: C_GOOD }
  ];

  function buildSceneEval() {
    var s = sceneSvg(
      '评测先用对比损失训练文本与动作特征提取器（margin ' +
        MARGIN +
        '），再算 R-Precision：' +
        POOL +
        ' 条描述里排序，随机猜的 top-1 只有 ' +
        fmt(CHANCE[0] * 100, 1) +
        '%；另有 FID、MultiModal Dist、Diversity、MultiModality，各跑 ' +
        REPLICATIONS +
        ' 次'
    );
    s.appendChild(svgText(56, 24, '先训一对「文本 / 动作」特征提取器，再拿它打分', 'demo-x-ink2', 13.5));

    var enc = group(s);
    box(enc, 40, 40, 330, 112, C_SURFACE2, C_ACCENT);
    enc.appendChild(paint(svgText(56, 60, '对比学习的两个提取器', null, 11), C_ACCENT));
    enc.appendChild(svgRich(56, 80, '文本：同结构的 Bi-GRU → 特征 $\\mathbf{s}$', { size: 9.5, cls: 'demo-x-mut', w: 300 }));
    enc.appendChild(svgRich(56, 98, '动作：snippet code → Bi-GRU(1024) → 特征 $\\mathbf{m}$', { size: 9.5, cls: 'demo-x-mut', w: 300 }));
    var ctaMath = svgMath(56, 130, '\\mathcal{L}_{Cta} = (1-y)\\,D^2 + y\\,\\max(0,\\, m - D)^2', { size: 11, w: 300 });
    ctaMath.setTone('var(--demo-accent)');
    enc.appendChild(ctaMath);

    var toy = group(s);
    box(toy, 386, 40, 374, 112, C_SURFACE, C_BORDER);
    toy.appendChild(svgRich(400, 60, 'margin $m = ' + MARGIN + '$ 的三个算例', { size: 10.5, cls: 'demo-x-ink2', w: 340 }));
    CTA.forEach(function (r, k) {
      toy.appendChild(
        svgRich(400, 84 + k * 22, (r.y === 0 ? '配对 ' : '不配对 ') + '$D = ' + r.d + '$ → ' + (r.y === 0 ? '$D^2$' : '$(m - D)^2$') + ' = **' + fmt(r.loss, 0) + '**', {
          size: 10,
          w: 340
        }).setTone(r.y === 0 ? 'var(--demo-good)' : r.loss === 0 ? 'var(--demo-muted)' : 'var(--demo-bad)')
      );
    });

    /* R-Precision 的一个池子：真值 + 31 个干扰描述，按距离排 */
    var RX = 60,
      RW = 680,
      RY = 202;
    var DMIN = 2.5,
      DMAX = 8.5;
    function rx(d) {
      return RX + ((d - DMIN) / (DMAX - DMIN)) * RW;
    }
    var pool = group(s);
    pool.appendChild(svgText(40, 172, 'R-Precision：1 条真值 + ' + (POOL - 1) + ' 条随机描述，共 ' + POOL + ' 条，按特征距离排序（示意）', 'demo-x-ink2', 10));
    pool.appendChild(paint(svgEl('line', { x1: RX, y1: RY, x2: RX + RW, y2: RY, 'stroke-width': 1 }), null, C_GRID));
    var ds = [CLOSER_D];
    for (var i = 0; i < POOL - 2; i++) ds.push(3.6 + (i * (8.2 - 3.6)) / (POOL - 3));
    var dots = ds.map(function (d, k) {
      var c = paint(svgEl('circle', { cx: rx(d), cy: RY, r: 4.2, 'stroke-width': 1 }), C_SURFACE2, C_MUTED);
      pool.appendChild(c);
      return { c: c, at: 4.0 + k * 0.04 };
    });
    var gt = paint(svgEl('circle', { cx: rx(GT_D), cy: RY, r: 6, 'stroke-width': 2 }), C_GOOD, C_GOOD);
    pool.appendChild(gt);
    var gtLbl = paint(svgText(rx(GT_D), RY - 12, '真值排第 2', null, 9.5, 'middle'), C_GOOD);
    pool.appendChild(gtLbl);
    var verdict = svgRich(RX, RY + 26, 'top-1 ✗，top-2 ✓，top-3 ✓；随机猜：top-1 ' + fmt(CHANCE[0] * 100, 1) + '%、top-3 ' + fmt(CHANCE[2] * 100, 1) + '%', { size: 10, w: 620 });
    pool.appendChild(verdict);

    var mets = S8_METRICS.map(function (m, k) {
      var g = group(s);
      var x = 40 + k * 182;
      box(g, x, 254, 174, 58, C_SURFACE2, m.c);
      g.appendChild(paint(svgText(x + 87, 276, m.t, null, 11, 'middle'), m.c));
      g.appendChild(svgText(x + 87, 297, m.d, 'demo-x-mut', 8.4, 'middle'));
      return { g: g, at: 8.4 + k * 0.5 };
    });

    var foot = svgRich(400, 344, '每项跑 ' + REPLICATIONS + ' 次，报 95% 置信区间 $\\pm 1.96\\sigma/\\sqrt{' + REPLICATIONS + '} = \\pm ' + fmt(CI_FACTOR, 3) + '\\sigma$', {
      size: 12.5,
      anchor: 'middle',
      w: 620
    }).setTone('var(--demo-accent)');
    s.appendChild(foot);
    var foot2 = svgText(400, 370, 'R-Precision 与 MultiModal Dist 是这篇论文新提出的；后来的文本生成动作论文几乎都照搬这套评测器', 'demo-x-mut', 9.5, 'middle');
    s.appendChild(foot2);

    function draw(t) {
      setOpacity(enc, seg(t, 0.3, 0.9));
      setOpacity(toy, seg(t, 1.8, 2.4));
      setOpacity(pool, seg(t, 3.8, 4.2));
      dots.forEach(function (d) {
        setOpacity(d.c, seg(t, d.at, d.at + 0.3));
      });
      setOpacity(gt, seg(t, 5.6, 6.0));
      setOpacity(gtLbl, seg(t, 5.8, 6.2));
      setOpacity(verdict, seg(t, 6.6, 7.2));
      mets.forEach(function (m) {
        setOpacity(m.g, seg(t, m.at, m.at + 0.4));
      });
      setOpacity(foot, seg(t, 10.8, 11.4));
      setOpacity(foot2, seg(t, 11.6, 12.2));
    }

    return { el: s, draw: draw };
  }

  // ─── 第 9 幕：结果、消融与遗产 ─────────────────────────────────────
  function buildSceneResults() {
    var s = sceneSvg(
      'HumanML3D 测试集上 R-Precision top-1：真实动作 ' +
        fmt(REAL.top1, 3) +
        '，本文 ' +
        fmt(OURS.top1, 3) +
        '（真实的 ' +
        fmt(TOP1_OF_REAL * 100, 1) +
        '%），最好的基线 Language2Pose ' +
        fmt(L2P.top1, 3) +
        '；FID 低 ' +
        fmt(FID_VS_L2P, 1) +
        ' 倍'
    );
    s.appendChild(svgText(56, 24, '结果：离真实动作只差一截，基线差了一大截', 'demo-x-ink2', 13.5));

    var BX = 150,
      BW = 300,
      BY = 46;
    var chart = group(s);
    chart.appendChild(svgText(40, BY - 6, 'Table 2 · R-Precision top-1（越高越好）', 'demo-x-ink2', 10));
    var bars = T2.map(function (r, k) {
      var y = BY + 4 + k * 26;
      chart.appendChild(svgText(40, y + 13, r.t, 'demo-x-ink2', 9.5));
      var w = (r.top1 / 0.55) * BW;
      var b = paint(svgEl('rect', { x: BX, y: y + 2, width: w, height: 15, rx: 2 }), r.c);
      chart.appendChild(b);
      var v = paint(svgText(BX + w + 6, y + 14, fmt(r.top1, 3), 'demo-x-mono', 9.5), r.c);
      chart.appendChild(v);
      return { b: b, v: v, w: w, at: 0.4 + k * 0.35 };
    });
    var cx = BX + (CHANCE[0] / 0.55) * BW;
    var chance = group(chart);
    link(chance, [[cx, BY], [cx, BY + 4 + T2.length * 26]], null, C_BAD, '3 3');
    chance.appendChild(paint(svgText(cx + 4, BY + 4 + T2.length * 26 + 12, '随机猜 1/' + POOL + ' = ' + fmt(CHANCE[0], 3), null, 9), C_BAD));

    var side = group(s);
    box(side, 486, 40, 274, 128, C_SURFACE2, C_GOOD);
    side.appendChild(paint(svgText(500, 62, '本文 vs 真实 / vs 最好的基线', null, 11), C_GOOD));
    side.appendChild(svgText(500, 86, 'top-1 是真实的 ' + fmt(TOP1_OF_REAL * 100, 1) + '%，top-3 是 ' + fmt(TOP3_OF_REAL * 100, 1) + '%', 'demo-x-mut', 9.8));
    side.appendChild(svgText(500, 108, 'FID ' + fmt(OURS.fid, 3) + ' vs Language2Pose ' + fmt(L2P.fid, 2), 'demo-x-mono', 9.8));
    side.appendChild(paint(svgText(500, 130, '低 ' + fmt(FID_VS_L2P, 1) + ' 倍；MultiModality ' + fmt(OURS_MMOD, 3), null, 10), C_GOOD));
    side.appendChild(svgText(500, 152, '采样长度比真实长度多 ' + fmt(MMOD_GAIN * 100, 1) + '% 的多样性', 'demo-x-mut', 9.5));

    var abl = group(s);
    box(abl, 486, 178, 274, 96, C_SURFACE, C_WARN);
    abl.appendChild(paint(svgText(500, 198, 'Table 4 · 消融 top-1 掉多少', null, 10.5), C_WARN));
    ABL.forEach(function (a, k) {
      abl.appendChild(svgText(500, 218 + k * 16, a.t, 'demo-x-mut', 9.2));
      abl.appendChild(paint(svgText(744, 218 + k * 16, '−' + fmt(a.drop, 3), 'demo-x-mono', 9.5, 'end'), k < 2 ? C_BAD : C_MUTED));
    });

    var legacy = group(s);
    box(legacy, 40, 294, 720, 52, C_SURFACE2, C_ACCENT);
    legacy.appendChild(paint(svgText(400, 315, 'MDM、T2M-GPT、MotionDiffuse、MoMask 都在 HumanML3D 上用这套评测器报数', null, 11.5, 'middle'), C_ACCENT));
    legacy.appendChild(svgText(400, 335, '用户研究：约 ' + USER_TOP2 + '% 的生成动作被排进前二（与真实动作并列或仅次于它）', 'demo-x-mut', 9.5, 'middle'));

    var foot = paint(svgText(400, 378, '用到人形机器人：SMPL 22 关节 → retarget → 物理跟踪，HumanML3D 是语言到动作的先验', null, 12.5, 'middle'), C_GOOD);
    s.appendChild(foot);

    function draw(t) {
      bars.forEach(function (b) {
        var u = ease(seg(t, b.at, b.at + 0.6));
        b.b.setAttribute('width', (b.w * u).toFixed(1));
        b.v.setAttribute('x', (BX + b.w * u + 6).toFixed(1));
        setOpacity(b.v, u);
      });
      setOpacity(chance, seg(t, 3.0, 3.6));
      setOpacity(side, seg(t, 4.4, 5.0));
      setOpacity(abl, seg(t, 7.0, 7.6));
      setOpacity(legacy, seg(t, 9.4, 10.0));
      setOpacity(foot, seg(t, 11.2, 12.0));
    }

    return { el: s, draw: draw };
  }

  var HML_SCENES = [
    {
      title: '文本生成动作卡在哪',
      dur: 12,
      build: buildSceneProblem,
      cues: [
        { at: 0.3, s: '输入一句话，输出一段 3D 人体动作：方向、速度、先后顺序都要对得上。' },
        { at: 1.6, s: '已有做法是**确定性**的一对一映射，长度固定，生成结果容易僵住不动。' },
        { at: 2.8, s: '唯一的数据集 KIT-ML 只有 ' + thou(KIT.motions) + ' 段动作，以走路类为主。' },
        { at: 3.6, s: '论文点出三个难点：① 长度可变，② 一句多解，③ 文本有短有长。' },
        { at: 8.4, s: '回答：**text2length** 先采长度，**text2motion** 用时序 VAE 逐段生成。' },
        { at: 10.4, s: '再配一套新数据集 HumanML3D —— 后来成了这个方向的标准 benchmark。' }
      ]
    },
    {
      title: 'HumanML3D 怎么建',
      dur: 13,
      build: buildSceneData,
      cues: [
        { at: 0.3, s: '来源：AMASS 的 ' + N_AMASS_SUBSETS + ' 个子集加 HumanAct12，都是现成动捕，但没有文字描述。' },
        { at: 1.6, s: '统一到 ' + FPS + ' fps，超过 10 s 的随机裁成 10 s；换到默认骨架，初始朝向转到 Z+。' },
        { at: 2.4, s: '在 AMT 上每段收 3 条描述：至少 5 个词，标注者通过率要高于 92%。' },
        { at: 3.0, s: '官方 index.csv：AMASS 贡献 ' + thou(N_AMASS) + ' 段，其中 KIT 子集 ' + thou(SOURCES[0].n) + ' 段；HumanAct12 贡献 1,191 段。' },
        { at: 6.0, s: '和 KIT-ML 比：段数 **' + fmt(RATIO.motions, 2) + '×**，描述 **' + fmt(RATIO.texts, 2) + '×**，时长 ' + fmt(RATIO.hours, 2) + '×，词表 ' + fmt(RATIO.vocab, 2) + '×。' },
        { at: 10.0, s: '训练前再做镜像：动作左右翻转，描述里 left / right 一起换，' + thou(HML.motions) + ' 段变 ' + thou(MIRRORED) + ' 段。' }
      ]
    },
    {
      title: '一帧 = ' + DIM + ' 个数',
      dur: 13,
      build: buildSceneFeature,
      cues: [
        { at: 0.3, s: '每一帧不存 22 个关节的世界坐标，而是拆成 ' + DIM + ' 维的特征向量。' },
        { at: 0.6, s: '根节点 4 维只存**速度**和高度：绕竖轴角速度、xz 平面线速度、离地高度。' },
        { at: 2.0, s: '21 个关节相对根的位置 63 维、6D 旋转 126 维，22 个关节的局部速度 66 维，最后 4 维触地。' },
        { at: 4.0, s: '加起来 $1 + 2 + 1 + 63 + 126 + 66 + 4 = ' + DIM + '$；KIT-ML 少一个关节，是 ' + DIM_KIT + ' 维。' },
        { at: 5.6, s: '官方仓库自带片段 ' + CLIP.id + '：' + CLIP.rows + ' 行 × ' + DIM + ' 维，' + fmt(CLIP_SEC, 1) + ' 秒的打网球。' },
        { at: 7.6, s: '右腕峰值速度 ' + fmt(CLIP.wristPeak, 1) + ' m/s 出现在第 ' + CLIP.wristFrame + ' 帧 —— 那一下就是挥拍。' },
        { at: 8.6, s: '触地：脚相邻两帧位移平方 $< ' + FOOT_THR + '$，即每帧 < ' + fmt(FOOT_M * 100, 2) + ' cm，约 ' + fmt(FOOT_MS, 2) + ' m/s。' },
        { at: 11.0, s: '速度化、以根为参照，平移和朝向就不影响特征；触地标签留给解码器压脚滑。' }
      ]
    },
    {
      title: '每 4 帧一个 snippet code',
      dur: 13,
      build: buildSceneSnippet,
      cues: [
        { at: 0.3, s: '先单独训一个运动自编码器：不在逐帧姿态上生成，而是在压缩后的 code 上生成。' },
        { at: 1.6, s: '两层一维卷积，kernel 4、stride 2：' + CLIP_FRAMES + ' 帧 → ' + CONV1 + ' → **' + CLIP_CODES + ' 个 code**，每个 ' + CODE_DIM + ' 维。' },
        { at: 4.0, s: '编码器只看 ' + ENC_IN + ' 维，4 维触地交给解码器预测，用来防脚滑。' },
        { at: 5.4, s: '生成器因此只滚 ' + CLIP_CODES + ' 步；每个 code 管 ' + fmt(UNIT / FPS, 1) + ' 秒，感受野约 ' + fmt(RF_SEC, 1) + ' 秒。' },
        { at: 7.6, s: '损失：L1 重建，加 $\\lambda_{spr} = \\lambda_{smt} = ' + LAMBDA_SPR + '$ 的稀疏项与平滑项。' },
        { at: 10.2, s: '消融：去掉 snippet code，top-1 从 ' + fmt(OURS.top1, 3) + ' 掉到 ' + fmt(ABL[0].top1, 3) + '，后半段会跑偏。' }
      ]
    },
    {
      title: 'Text2Length：先定长度',
      dur: 13,
      build: buildSceneLength,
      cues: [
        { at: 0.4, s: '词向量用 GloVe 300 维，再加 15 维词性 one-hot；方向、身体部位、物体、动作这类关键词单独打标。' },
        { at: 1.2, s: 'Bi-GRU 编码成 1024 维句向量，MLP 加 softmax 输出 **' + N_LEN_CLASSES + ' 个长度类**。' },
        { at: 2.6, s: '例句里 ball 标成物体、right 标成方向、hand 标成身体部位。' },
        { at: 4.2, s: '第 k 类 = k 个 code = 4k 帧 = k/5 秒；交叉熵训练。' },
        { at: 6.6, s: '示意：打网球那句的分布峰在 ' + CLIP_CODES + '，三次采样得到 ' + PEAK_SAMPLES.join(' / ') + ' 个 code。' },
        { at: 7.4, s: '对应 ' + PEAK_SAMPLES.map(codesToSec).map(function (v) { return fmt(v, 1); }).join(' / ') + ' 秒 —— 同一句话，生成的动作长短不一。' },
        { at: 9.0, s: '论文观察：挥手这类**周期动作**的长度分布更平，采样差得更多。' },
        { at: 11.0, s: '推理时采到不足 ' + K_MIN + ' 个 code（2 秒）会重采。' }
      ]
    },
    {
      title: '时序 VAE 的一步',
      dur: 14,
      build: buildSceneStep,
      cues: [
        { at: 0.3, s: '每一步先做**局部词注意力**：查询来自生成器上一步的隐状态 $h^{t-1}_\\theta$。' },
        { at: 1.6, s: '示意权重：第 ' + ATT_EARLY_T + ' 步还在准备，play 占 ' + fmt(ATT_EARLY[0], 2) + '；' },
        { at: 2.8, s: '第 ' + SWING_T + ' 步正好挥拍，shoot 升到 ' + fmt(ATT_SWING[2], 2) + '。打分是编的，只演示机制。' },
        { at: 4.2, s: '先验网络看上一步 code 和注意力向量，输入 ' + thou(PRI_IN) + ' 维。' },
        { at: 5.4, s: '后验网络在训练时多看真值 $c^t$，输入 ' + thou(POS_IN) + ' 维。' },
        { at: 6.6, s: '生成器拿上一步 code、注意力和 $z_t$（' + DIM_Z + ' 维），输入 ' + thou(GEN_IN) + ' 维，输出 $\\hat{c}^t$。' },
        { at: 8.0, s: 'KL 项把后验拉向先验，推理时只用先验采 $z_t$。' },
        { at: 9.6, s: '到达倒计时 $\\mathrm{PE}(T - t)$：' + CLIP_CODES + ' 个 code 的片段，第 ' + SWING_T + ' 步还剩 ' + TTA_SWING + ' 步。' },
        { at: 11.6, s: '句向量 $s$ 初始化三个 GRU，词特征在每一步通过注意力进来。' }
      ]
    },
    {
      title: '三项损失与课程学习',
      dur: 13,
      build: buildSceneTrain,
      cues: [
        { at: 0.3, s: '总损失三项：code 重建、动作重建，加 $\\lambda_{KL} = ' + LAMBDA_KL + '$ 的 KL。' },
        { at: 1.2, s: '$\\lambda_{mot} = ' + LAMBDA_MOT + '$；KIT-ML 上 $\\lambda_{KL}$ 取 ' + LAMBDA_KL_KIT + '。' },
        { at: 3.0, s: '**课程学习**：先只学前 ' + CUR_START + ' 个 code，验证损失不再降就加一个。' },
        { at: 5.0, s: '一路加到 ' + CUR_END + ' 个 code（' + fmt(codesToSec(CUR_END), 1) + ' 秒），共 ' + N_STAGES + ' 个阶段。' },
        { at: 6.8, s: 'teacher forcing：每个 batch 抛一次硬币，' + fmt(P_TF * 100, 0) + '% 喂真值，' + fmt((1 - P_TF) * 100, 0) + '% 喂自己的生成。' },
        { at: 9.0, s: '$c^0$ 是编码器对平均姿态的输出；解码器跟着微调，学习率小 10 倍。' },
        { at: 10.8, s: '推理链：采长度 T → 先验采 z → 滚 T 步 → 解码成 4T 帧。' }
      ]
    },
    {
      title: '评测器与 R-Precision',
      dur: 13,
      build: buildSceneEval,
      cues: [
        { at: 0.3, s: '没有现成的动作特征网络，论文自己训一对文本 / 动作提取器，用**对比损失**。' },
        { at: 1.8, s: '配对 $D = 3$ 损失 9；不配对 $D = 6$ 损失 16；不配对 $D = 12$ 超过 margin，损失 0。' },
        { at: 3.8, s: 'R-Precision：真值描述加 ' + (POOL - 1) + ' 条随机描述，一共 ' + POOL + ' 条，按特征距离排序。' },
        { at: 5.6, s: '示意里真值排第 2：top-1 算错，top-2、top-3 算对。' },
        { at: 6.6, s: '瞎猜的基线：top-1 是 1/' + POOL + ' = ' + fmt(CHANCE[0] * 100, 1) + '%，top-3 是 ' + fmt(CHANCE[2] * 100, 1) + '%。' },
        { at: 8.4, s: '另有 FID、MultiModal Dist，以及 Diversity（' + DIV_PAIRS + ' 对）与 MultiModality（每句 ' + MM_PAIRS + ' 对）。' },
        { at: 10.8, s: '每项跑 ' + REPLICATIONS + ' 次报 95% 置信区间；这套评测器后来被整个领域沿用。' }
      ]
    },
    {
      title: '结果、消融与遗产',
      dur: 13,
      build: buildSceneResults,
      cues: [
        { at: 0.4, s: 'Table 2，top-1：真实动作 ' + fmt(REAL.top1, 3) + '，本文 **' + fmt(OURS.top1, 3) + '**，最好的基线 Language2Pose ' + fmt(L2P.top1, 3) + '。' },
        { at: 3.0, s: 'MoCoGAN ' + fmt(row('moco').top1, 3) + '、Dance2Music ' + fmt(row('d2m').top1, 3) + '，几乎贴着随机猜的 ' + fmt(CHANCE[0], 3) + '。' },
        { at: 4.4, s: 'top-1 是真实动作的 ' + fmt(TOP1_OF_REAL * 100, 1) + '%；FID ' + fmt(OURS.fid, 3) + '，比 Language2Pose 低 ' + fmt(FID_VS_L2P, 1) + ' 倍。' },
        { at: 5.8, s: '用采样长度比用真实长度多出 ' + fmt(MMOD_GAIN * 100, 1) + '% 的 MultiModality，R-Precision 几乎不掉。' },
        { at: 7.0, s: '消融：去掉 snippet code 掉 ' + fmt(ABL[0].drop, 3) + '，去掉词注意力掉 ' + fmt(ABL[1].drop, 3) + '；词性和位置编码只掉一点。' },
        { at: 9.4, s: 'MDM、T2M-GPT、MoMask 都在 HumanML3D 上、用同一个评测器报数。' },
        { at: 11.2, s: '用到人形机器人上，还要 retarget 加物理跟踪：HumanML3D 给的是语言到动作的先验。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '九幕动画：HumanML3D 全流程速览',
      sub: '约 117 秒自动播放。空格播放/暂停，← → 换幕；画面里的统计、维度和比例都是现算的，不是手写。',
      ariaLabel: 'HumanML3D 九幕讲解动画',
      notes: [
        '取数依据：第二幕的四个倍数由论文 Table 1 现除（' +
          thou(HML.motions) +
          ' / ' +
          thou(KIT.motions) +
          ' = ' +
          fmt(RATIO.motions, 2) +
          ' 等），来源条形图按官方仓库 `index.csv` 的 `source_path` 计数；第三幕的 ' +
          DIM +
          ' 维由 `motion_representation.ipynb` 的拼接顺序现加，片段 ' +
          CLIP.id +
          ' 的触地比例、右腕峰值速度与转角由仓库自带的 `new_joint_vecs/' +
          CLIP.id +
          '.npy` 算出。',
        '第四、六幕的维度（' +
          ENC_IN +
          ' / ' +
          thou(PRI_IN) +
          ' / ' +
          thou(POS_IN) +
          ' / ' +
          thou(GEN_IN) +
          '）与补充材料 Table 1、官方 `networks/modules.py` 一致；第七幕的 ' +
          CUR_START +
          ' → ' +
          CUR_END +
          ' 取自 `CompTrainerV6.train()`，补充材料写的是 $T_{cur} = 8$、$T_{max} = 50$。第九幕取论文 Table 2 / Table 4 原值，比例与差值现算。',
        '第五幕的长度分布与第六幕的注意力打分是**示意，不是论文数据**：长度分布是截在 $[' +
          K_MIN +
          ', ' +
          K_MAX +
          ']$ 的离散高斯（峰 ' +
          CLIP_CODES +
          '、σ = 3；周期动作峰 30、σ = 9），三次采样取累积概率 ' +
          SAMPLE_U.join(' / ') +
          ' 处；注意力权重由编造的打分过 softmax 得到，只演示机制。'
      ],
      scenes: HML_SCENES
    });
  }

  // ─── the narrated vertical video of the same nine scenes ─────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：HumanML3D 九幕全流程',
      sub: '7 分 11 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的九幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '9.2 MB',
      fileName: 'HumanML3D_讲解视频.mp4'
    });
  }

  K.mount({
    'humanml3d-explainer': buildExplainerDemo,
    'humanml3d-video': buildVideoDemo
  });
})();
