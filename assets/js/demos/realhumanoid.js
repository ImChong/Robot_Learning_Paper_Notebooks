/* Interactive demos for papers/03_High_Impact_Selection/
 * Real-World_Humanoid_Locomotion_with_RL
 * （Radosavovic, Xiao, Zhang, Darrell, Malik, Sreenath · Science Robotics 2024，Digit · 因果 Transformer）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["realhumanoid"]`, after assets/js/demos/kit.js. The note itself may
 * only contain empty placeholders, because scripts/sanitize_paper_html.py
 * strips <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   rh-explainer — 十幕讲解动画：全尺寸人形为什么难 → 因果 Transformer → 两步训练 → 奖励与命令 →
 *                  仿真闭链与域随机化 → 户外与实验室 → 自然行走 → 下坡换步态 → 脚被绊住 → 消融与局限
 *   rh-video     — 同一套十幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   rh-context   — 16 步上下文窗口与因果掩码，配论文图 8B 的读图数
 *   rh-reward    — 速度跟踪 / 转向 / 机身高度三项奖励的计算器（arXiv v1 附录式 3、4、7）
 *   rh-dr        — 按 arXiv v1 表 I 抽一台随机化的 Digit：阻尼为什么用对数均匀
 */

(function () {
  'use strict';

  var K = window.PaperDemoKit;
  var el = K.el,
    fmt = K.fmt,
    clamp = K.clamp,
    card = K.card,
    controlsRow = K.controlsRow,
    slider = K.slider,
    button = K.button,
    buttonGroup = K.buttonGroup,
    statsRow = K.statsRow,
    verdictBox = K.verdictBox,
    legend = K.legend,
    note = K.note,
    table = K.table,
    stage = K.stage,
    stageGrid = K.stageGrid,
    begin = K.begin,
    plot = K.plot,
    line = K.line,
    dot = K.dot,
    text = K.text,
    axes = K.axes,
    barLabel = K.barLabel,
    registerRenderer = K.registerRenderer,
    mulberry32 = K.mulberry32;

  // ─── 论文里的数字（Science Robotics 9: eadi9579，正文与 arXiv 2303.03381 v2 相同；附录表来自 v1） ───
  /* 正文照抄；arXiv v1 附录（表 I–IV、式 3–16）照抄；图 2D、图 8 没有数值表，标「读图」的是从图上读的近似值。
     十幕动画、三个演示与笔记「🚶 具体实例」共用这一份。 */
  var DIGIT_M = 1.6, DIGIT_KG = 45, DOF = 30; // 正文 Digit 一节：约 1.6 m、45 kg、浮动基座模型 30 个自由度
  var CTX = 16, DT = 0.02, D_MODEL = 192, N_HEAD = 4, N_BLOCK = 4, MLP_RATIO = 2.0; // 方法节 Model architecture
  var N_PD = 16, N_GAIN = 8, POLICY_HZ = 50, PD_HZ = 1000; // 动作空间与部署频率
  var OBS_DIMS = [
    // v1 表 III：学生（actor）的观测，共 66 维
    ['机身线速度', 3], ['机身角速度', 3], ['关节位置', 26], ['关节速度', 26], ['投影重力', 3], ['时钟输入', 2], ['命令', 3]
  ];
  var STATE_EXTRA = [
    // v1 表 III：只有教师 actor 与两边 critic 看得到的状态，加上观测共 480 维
    ['步态启发量', 6], ['地形高度图', 121], ['带噪与干净动作之差', 36], ['带噪与干净观测之差', 61],
    ['机器人与环境参数', 147], ['$K_p$、$K_d$', 40], ['重力', 3]
  ];
  var CMD_RANGE = [[-0.3, 1.0], [-0.3, 0.3], [-1.0, 1.0]], CMD_CUT = [0.1, 0.1, 0.26], CMD_EVERY = 10; // v1 表 II
  var SIGMA_V = 0.2, SIGMA_W = 0.2, H_LOW = 1.0, KAPPA = 0.04, SWING_Z_W = 5.0; // v1 式 3、4、7、10
  var ARM_ALPHA = [['肩：横滚、偏航', 2.0], ['肘', 1.0], ['髋：横滚、偏航', 0.5], ['肩、髋：俯仰', 0.1]]; // v1 式 15
  var DR = [
    // v1 表 I：名称 / 单位 / 区间 / 方式 / 分布
    ['关节位置噪声', 'rad', [0, 0.175], '加', '高斯'],
    ['关节速度噪声', 'rad/s', [0, 0.15], '加', '高斯'],
    ['机身线速度噪声', 'm/s', [0, 0.15], '加', '高斯'],
    ['机身角速度噪声', 'rad/s', [0, 0.15], '加', '高斯'],
    ['投影重力噪声', '—', [0, 0.075], '加', '高斯'],
    ['观测延迟', '$B(p) \\times dt$', [0, 0.2], '—', '均匀'],
    ['动作延迟', '$B(p) \\times dt$', [0, 0.2], '—', '均匀'],
    ['电机零位偏移', 'rad', [0, 0.035], '加', '均匀'],
    ['电机强度', '倍', [0.85, 1.15], '乘', '均匀'],
    ['电机阻尼', 'Nms/rad', [0.3, 4.0], '乘', '对数均匀'],
    ['质量', '倍', [0.5, 1.5], '乘', '均匀'],
    ['$K_p$ 系数', '倍', [0.9, 1.1], '乘', '均匀'],
    ['$K_d$ 系数', '倍', [0.9, 1.1], '乘', '均匀'],
    ['重力', 'm/s²', [0, 0.67], '加', '均匀'],
    ['摩擦', '倍', [0.3, 2.0], '乘', '均匀'],
    ['恢复系数', '—', [0, 0.4], '加', '均匀']
  ];
  var DAMP = [0.3, 4.0];
  var PPO = { gpus: 4, envT: 8192, envS: 4096, steps: 24, epochs: 5, mbT: 49152, mbS: 24576, iters: 6000, ep: 20 }; // v1 表 IV
  var SLOPE_TRAIN = 10, SLOPE_TEST = 8.7, LAB_V = 0.15; // 正文：训练坡最大 10%，测试坡最大 8.7%，实验室地面命令 0.15 m/s
  var FIG2D_NAMES = ['坡', '台阶', '不稳木板'];
  var FIG2D_OURS = [100, 100, 100], FIG2D_NATIVE = [100, 97, 71]; // 图 2D，Agility 仿真每种 10 次（读图）
  var FIG8A = [['Transformer', 97], ['LSTM', 89], ['TCN', 86], ['MLP', 75]]; // 图 8A，3 个场景共 30 次（读图）
  var SLOPES = [0, 5, 10, 15, 20, 25]; // 图 8B–C 横轴（°），命令 1 m/s
  var FIG8B = [
    // 图 8B：上下文长度 1 / 8 / 16（读图，m/s）
    [1, [0.88, 0.84, 0.79, 0.72, 0.67, 0.62]],
    [8, [0.92, 0.87, 0.79, 0.73, 0.73, 0.71]],
    [16, [1.01, 0.96, 0.9, 0.84, 0.8, 0.75]]
  ];
  var FIG8C = [
    // 图 8C：训练目标（读图，m/s）；IL+RL 就是图 8B 里上下文 16 的那条
    ['只 RL', [0.9, 0.89, 0.85, 0.79, 0.67, 0.16]],
    ['只模仿', [0.92, 0.85, 0.81, 0.75, 0.64, 0.63]],
    ['模仿 + RL', [1.01, 0.96, 0.9, 0.84, 0.8, 0.75]]
  ];
  var QT_STEPS = 100; // 上一篇（四足野外盲走）真机用的 TCN-100：100 步 = 2 s

  /* v1 式 3 / 4：exp(−误差² / σ)，σ = 0.2（论文写的是除以 σ，不是 σ²） */
  function trackReward(err, sigma) {
    return Math.exp(-(err * err) / sigma);
  }

  /* v1 式 7：机身低于 h_l = 1.0 m 时罚 (h_l − h)²，否则 0 */
  function heightPenalty(h) {
    return h < H_LOW ? (H_LOW - h) * (H_LOW - h) : 0;
  }

  /* 对数均匀分布的中位数与 P(x < c) */
  function logUniformMedian(a, b) {
    return Math.sqrt(a * b);
  }
  function logUniformCdf(c, a, b) {
    return clamp(Math.log(c / a) / Math.log(b / a), 0, 1);
  }

  /* 因果掩码下 l 个 token 一共有多少对 (i, j) 可以相互看：j ≤ i */
  function causalPairs(l) {
    return (l * (l + 1)) / 2;
  }

  function sumDims(rows) {
    return rows.reduce(function (a, r) { return a + r[1]; }, 0);
  }
  var OBS_TOTAL = sumDims(OBS_DIMS); // 66
  var STATE_TOTAL = OBS_TOTAL + sumDims(STATE_EXTRA); // 480

  // ─── demo 1: 上下文窗口与因果掩码 ─────────────────────────────────────
  function buildContextDemo(host) {
    var root = card(host, {
      title: '上下文窗口：16 步、0.32 秒，因果掩码让每一步只看过去',
      sub:
        '每个 token 是一对（这一刻的观测 $o_t$，上一步的动作 $a_{t-1}$），策略 50 Hz，窗口 $l$ 步就是最近 $0.02\\,l$ 秒。' +
        '拖动「事件发生在几步之前」，看它还在不在窗口里；右图是论文图 8B 的上下文长度消融（读图）。'
    });

    var state = { l: CTX, ago: 6, slope: 25 };
    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '上下文长度（论文图 8B 的三档）',
      items: FIG8B.map(function (r) {
        return { label: r[0] + ' 步（' + fmt(r[0] * DT, 2) + ' s）', value: r[0] };
      }),
      value: state.l,
      onPick: function (v) {
        state.l = v;
        render();
      }
    });
    slider(ctrls, {
      label: '事件（比如脚被绊住）发生在几步之前',
      min: 0,
      max: 30,
      step: 1,
      value: state.ago,
      format: function (v) {
        return fmt(v, 0) + ' 步 = ' + fmt(v * DT, 2) + ' s';
      },
      onInput: function (v) {
        state.ago = v;
        render();
      }
    });
    slider(ctrls, {
      label: '坡度（图 8B 横轴）',
      min: 0,
      max: 25,
      step: 5,
      value: state.slope,
      format: function (v) {
        return fmt(v, 0) + '°';
      },
      onInput: function (v) {
        state.slope = v;
        render();
      }
    });

    var setLegend = legend(root, [
      { key: 'accent', text: '蓝：窗口里的 token' },
      { key: 'bad', text: '红：事件那一步' },
      { key: 'muted', text: '右图：命令 1 m/s 时实际走多快（读图）' }
    ]);
    var grid = stageGrid(root);
    var maskStage = stage(grid, 250);
    var curveStage = stage(grid, 250);

    var stats = statsRow(root);
    var sWin = stats.add('窗口');
    var sPairs = stats.add('因果掩码里可看的格子');
    var sSee = stats.add('事件在不在窗口里');
    var sVel = stats.add('该坡度下的速度（图 8B）');
    var verdict = verdictBox(root);

    note(root, [
      '**窗口长度是现算的**：$16 \\times 0.02 = 0.32$ s。上一篇四足野外盲走的学生用 TCN-100 读 100 步 = 2 s 历史，是这里的 6.25 倍；这篇的 16 步是论文写明的设置（方法节 Model architecture）。',
      '**因果掩码**：第 $i$ 个 token 只能看第 $1 \\ldots i$ 个，$l$ 个 token 一共 $l(l+1)/2$ 对，16 步时是 136 / 256。',
      '**右图数字是读图近似值**（图 8B，每档 20 次）。正文只说「两种坡」，图的横轴却有 0–25° 六档，论文没解释；这里照图画。'
    ]);

    var render = registerRenderer(function () {
      var l = state.l;
      var see = state.ago < l;
      var row = FIG8B.filter(function (r) { return r[0] === l; })[0];
      var si = SLOPES.indexOf(state.slope);
      sWin.set(l + ' 步 = ' + fmt(l * DT, 2) + ' s');
      sPairs.set(causalPairs(l) + ' / ' + l * l);
      sSee.set(see ? '在（第 ' + (l - state.ago) + ' 个 token）' : '已经滑出去了', see ? 'good' : 'bad');
      sVel.set(fmt(row[1][si], 2) + ' m/s（读图）', row[1][si] >= 0.75 ? 'good' : 'warn');
      verdict.set(
        see
          ? '事件发生在 ' + fmt(state.ago * DT, 2) + ' s 以前，还在 ' + fmt(l * DT, 2) + ' s 的窗口里：最新那个 token 的注意力可以直接落到它上面。'
          : '事件发生在 ' + fmt(state.ago * DT, 2) + ' s 以前，' + fmt(l * DT, 2) + ' s 的窗口已经装不下：只能靠它留在最近几步观测里的余波。',
        see ? 'learning' : 'frozen'
      );

      // ── 左：时间轴 + 因果掩码 ──
      var g = begin(maskStage);
      var P = g.P;
      setLegend(P);
      var ctx = g.ctx;
      var N = 32;
      var cw = Math.min(16, (g.w - 40) / N);
      var x0 = (g.w - cw * N) / 2;
      text(ctx, '最近 32 步（每格 0.02 s），右端是现在', x0, 14, P.muted, 'left', '11px sans-serif');
      for (var k = 0; k < N; k++) {
        var ago = N - 1 - k;
        var inWin = ago < l;
        ctx.fillStyle = ago === state.ago ? P.bad : inWin ? P.accent : P.grid;
        ctx.globalAlpha = ago === state.ago ? 1 : inWin ? 0.75 : 0.6;
        ctx.fillRect(x0 + k * cw + 1, 26, cw - 2, 18);
      }
      ctx.globalAlpha = 1;
      text(ctx, '−0.62 s', x0, 56, P.muted, 'left', '10px monospace');
      text(ctx, '现在', x0 + N * cw, 56, P.muted, 'right', '10px monospace');

      // 掩码网格
      var side = Math.min(g.h - 86, g.w - 40);
      var cell = side / l;
      var gx = (g.w - side) / 2,
        gy = 70;
      for (var i = 0; i < l; i++) {
        for (var j = 0; j < l; j++) {
          var ok = j <= i;
          var hit = see && j === l - 1 - state.ago;
          ctx.fillStyle = ok ? (hit && i === l - 1 ? P.bad : i === l - 1 ? P.accent : P.surface) : P.surface2;
          ctx.globalAlpha = ok ? (i === l - 1 ? 0.9 : 0.85) : 0.5;
          ctx.fillRect(gx + j * cell + 0.5, gy + i * cell + 0.5, Math.max(1, cell - 1), Math.max(1, cell - 1));
        }
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = P.border;
      ctx.strokeRect(gx, gy, side, side);
      text(ctx, '行 = 查询（第 i 步）', gx - 4, gy + 6, P.muted, 'right', '10px sans-serif');
      text(ctx, '列 = 被看的 token', gx + side, gy + side + 10, P.muted, 'right', '10px sans-serif');

      // ── 右：图 8B ──
      var g2 = begin(curveStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 26, b: 36 }, [0, 25], [0.5, 1.05]);
      axes(g2, p2, {
        xTicks: SLOPES,
        xFmt: function (t) {
          return t + '°';
        },
        yTicks: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        yFmt: function (t) {
          return fmt(t, 1);
        },
        xLabel: '坡度'
      });
      text(g2.ctx, '实际速度 m/s（命令 1 m/s，图 8B 读图）', p2.x0, p2.y1 - 14, P2.muted, 'left', '11px sans-serif');
      line(g2.ctx, [[p2.x0, p2.sy(1)], [p2.x1, p2.sy(1)]], P2.bad, 1, [5, 4]);
      var cols = { 1: P2.warn, 8: P2.muted, 16: P2.accent };
      FIG8B.forEach(function (r) {
        var active = r[0] === l;
        var pts = SLOPES.map(function (s, m) {
          return [p2.sx(s), p2.sy(r[1][m])];
        });
        g2.ctx.globalAlpha = active ? 1 : 0.4;
        line(g2.ctx, pts, cols[r[0]], active ? 2.6 : 1.6);
        pts.forEach(function (q) {
          dot(g2.ctx, q[0], q[1], active ? 3.6 : 2.4, cols[r[0]]);
        });
        g2.ctx.globalAlpha = 1;
        text(g2.ctx, r[0] + ' 步', pts[5][0] - 4, pts[5][1] + (r[0] === 1 ? 12 : r[0] === 8 ? -10 : -12), cols[r[0]], 'right', '11px sans-serif');
      });
      var q = [p2.sx(state.slope), p2.sy(row[1][si])];
      dot(g2.ctx, q[0], q[1], 6, null, P2.text);

      maskStage.canvas.setAttribute('aria-label', '上下文窗口与因果掩码：最新一步只能看窗口里过去的 token');
      curveStage.canvas.setAttribute('aria-label', '论文图 8B：上下文 1、8、16 步时，不同坡度上的实际速度');
    });

    render();
  }

  // ─── demo 2: 奖励计算器 ───────────────────────────────────────────────
  function buildRewardDemo(host) {
    var root = card(host, {
      title: '奖励计算器：速度跟踪、转向跟踪与机身高度',
      sub:
        'arXiv v1 附录的式 3、4、7：$r_{lv} = \\exp(-\\lVert v_{xy} - v^*_{xy} \\rVert^2 / \\sigma_{xy})$，$r_{av} = \\exp(-(\\omega_z - \\omega^*_z)^2 / \\sigma_\\omega)$，$\\sigma = 0.2$；' +
        '机身低于 $h_l = 1.0$ m 时罚 $(h_l - h)^2$。论文没给各项权重，所以这里只算单项，不加总。'
    });

    var state = { vc: 0.5, va: 0.4, wc: 0.5, wa: 0.3, h: 0.95 };
    var ctrls = controlsRow(root);
    function sl(label, key, min, max, step, unit) {
      slider(ctrls, {
        label: label,
        min: min,
        max: max,
        step: step,
        value: state[key],
        format: function (v) {
          return fmt(v, 2) + ' ' + unit;
        },
        onInput: function (v) {
          state[key] = v;
          render();
        }
      });
    }
    sl('前进命令 $v^*_x$（训练范围 −0.3 … 1.0）', 'vc', -0.3, 1.0, 0.05, 'm/s');
    sl('实际前进速度 $v_x$', 'va', -0.5, 1.5, 0.05, 'm/s');
    sl('转向命令 $\\omega^*_z$（训练范围 −1 … 1）', 'wc', -1, 1, 0.05, 'rad/s');
    sl('实际转向 $\\omega_z$', 'wa', -1.5, 1.5, 0.05, 'rad/s');
    sl('机身高度 $h$', 'h', 0.8, 1.2, 0.01, 'm');

    var setLegend = legend(root, [
      { key: 'accent', text: '曲线：$\\exp(-e^2 / 0.2)$' },
      { key: 'warn', text: '点：当前的速度误差' },
      { key: 'good', text: '点：当前的转向误差' }
    ]);
    var st = stage(root, 230);
    var stats = statsRow(root);
    var sLv = stats.add('$r_{lv}$');
    var sAv = stats.add('$r_{av}$');
    var sBh = stats.add('机身高度罚 $r_{bh}$');
    var sCut = stats.add('命令会不会被置零');

    note(root, [
      '**默认值就是笔记「具体实例」第 3 步**：命令 0.5 m/s、实际 0.4 m/s，$e = 0.1$，$r_{lv} = e^{-0.05} \\approx 0.951$；实际 0.3 m/s 时 0.819，站着不动时 0.287。',
      '**$\\sigma$ 在分母上不平方**：误差 $\\sqrt{0.2} \\approx 0.45$ m/s 时奖励掉到 $1/e \\approx 0.37$。',
      '**命令小于阈值会被置零**（v1 表 II：前后、横向 0.10 m/s，转向 0.26 rad/s），所以训练里也有原地站着的命令。'
    ]);

    var render = registerRenderer(function () {
      var ev = state.va - state.vc,
        ew = state.wa - state.wc;
      var rlv = trackReward(ev, SIGMA_V),
        rav = trackReward(ew, SIGMA_W),
        rbh = heightPenalty(state.h);
      sLv.set(fmt(rlv, 3), rlv > 0.8 ? 'good' : rlv > 0.4 ? 'warn' : 'bad');
      sAv.set(fmt(rav, 3), rav > 0.8 ? 'good' : rav > 0.4 ? 'warn' : 'bad');
      sBh.set(rbh > 0 ? fmt(rbh, 4) + '（低于 1 m）' : '0', rbh > 0 ? 'warn' : 'good');
      var cutV = Math.abs(state.vc) < CMD_CUT[0],
        cutW = Math.abs(state.wc) < CMD_CUT[2];
      sCut.set(cutV || cutW ? (cutV ? '前进命令 → 0' : '') + (cutV && cutW ? '，' : '') + (cutW ? '转向命令 → 0' : '') : '都不会', cutV || cutW ? 'warn' : null);

      var g = begin(st);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 40, r: 14, t: 24, b: 36 }, [0, 1.2], [0, 1.05]);
      axes(g, p, {
        xTicks: [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2],
        xFmt: function (t) {
          return fmt(t, 1);
        },
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '误差 |e|（m/s 或 rad/s）'
      });
      var pts = [];
      for (var i = 0; i <= 120; i++) {
        var e = i / 100;
        pts.push([p.sx(e), p.sy(trackReward(e, SIGMA_V))]);
      }
      line(g.ctx, pts, P.accent, 2.4);
      var ae = Math.min(1.2, Math.abs(ev)),
        aw = Math.min(1.2, Math.abs(ew));
      dot(g.ctx, p.sx(ae), p.sy(trackReward(ae, SIGMA_V)), 6, P.warn);
      dot(g.ctx, p.sx(aw), p.sy(trackReward(aw, SIGMA_W)), 5, P.good);
      text(g.ctx, '1/e ≈ 0.37', p.sx(Math.sqrt(0.2)) + 6, p.sy(Math.exp(-1)) - 8, P.muted, 'left', '11px monospace');
      dot(g.ctx, p.sx(Math.sqrt(0.2)), p.sy(Math.exp(-1)), 3, P.muted);
      st.canvas.setAttribute('aria-label', '速度跟踪奖励随误差的变化曲线，标出当前速度误差与转向误差');
    });

    render();
  }

  // ─── demo 3: 抽一台随机化的 Digit ──────────────────────────────────────
  function sampleDr(rng) {
    function u(a, b) {
      return a + (b - a) * rng();
    }
    return {
      friction: u(0.3, 2.0),
      mass: u(0.5, 1.5),
      strength: u(0.85, 1.15),
      damping: DAMP[0] * Math.pow(DAMP[1] / DAMP[0], rng()),
      kp: u(0.9, 1.1),
      kd: u(0.9, 1.1),
      gravity: u(0, 0.67),
      restitution: u(0, 0.4),
      offset: u(0, 0.035)
    };
  }

  function buildDrDemo(host) {
    var root = card(host, {
      title: '抽一台随机化的 Digit：每个环境都是一台不一样的机器人',
      sub:
        '按 arXiv v1 表 I 的区间抽样（摩擦 ×0.3–2.0、质量 ×0.5–1.5、电机强度 ×0.85–1.15、阻尼 ×0.3–4.0 对数均匀……）。' +
        '多抽几次，看阻尼为什么要用**对数均匀**：均匀抽的话，大半落在 1 以上。'
    });

    var seed = 7;
    var rng = mulberry32(seed);
    var current = sampleDr(rng);
    var samples = [];
    var ctrls = controlsRow(root);
    var btns = el('div', 'demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '抽一台', function () {
      current = sampleDr(rng);
      samples.push(current.damping);
      render();
    });
    button(btns, '再抽 3000 台', function () {
      for (var i = 0; i < 3000; i++) {
        current = sampleDr(rng);
        samples.push(current.damping);
      }
      render();
    });
    button(btns, '清空', function () {
      samples = [];
      seed += 1;
      rng = mulberry32(seed);
      current = sampleDr(rng);
      render();
    });

    var tb = table(root);
    var setLegend = legend(root, [
      { key: 'accent', text: '柱：抽到的阻尼系数（对数均匀）' },
      { key: 'good', text: '实线：对数均匀的中位数 $\\sqrt{0.3 \\times 4.0} \\approx 1.10$' },
      { key: 'warn', text: '虚线：要是均匀抽，平均是 2.15' }
    ]);
    var st = stage(root, 200);
    var stats = statsRow(root);
    var sN = stats.add('已抽');
    var sMed = stats.add('样本中位数');
    var sLow = stats.add('小于 1 的比例');

    note(root, [
      '**区间照抄 v1 表 I**；表里「对数均匀」只用在阻尼上。对数均匀的中位数是 $\\sqrt{0.3 \\times 4.0} \\approx 1.10$，小于 1 的概率 $\\ln(1/0.3) / \\ln(4.0/0.3) \\approx 0.465$；均匀抽的话只有 $(1 - 0.3)/3.7 \\approx 0.189$。',
      '**为什么这样设**论文没解释。我们的理解：阻尼跨了一个数量级（0.3 到 4.0），按比例看 0.3→1 和 1→4 一样重要，对数均匀让两段各占约一半样本。',
      '**延迟一行写的是 $B(p) \\times dt$、区间 [0, 0.2]**：我们读作「每步以概率 $p$ 晚一个控制步，$p$ 在 0–0.2 间均匀抽」，论文没展开，这里不演示。'
    ]);

    var render = registerRenderer(function () {
      tb.clear();
      tb.row(['参数', '这一台', '区间（v1 表 I）'], true);
      [
        ['摩擦', fmt(current.friction, 2) + ' 倍', '×0.3–2.0'],
        ['质量', fmt(current.mass, 2) + ' 倍', '×0.5–1.5'],
        ['电机强度', fmt(current.strength, 2) + ' 倍', '×0.85–1.15'],
        ['电机阻尼', fmt(current.damping, 2) + ' 倍', '×0.3–4.0，对数均匀'],
        ['$K_p$ / $K_d$ 系数', fmt(current.kp, 2) + ' / ' + fmt(current.kd, 2), '×0.9–1.1'],
        ['重力（加）', '+' + fmt(current.gravity, 2) + ' m/s²', '+0–0.67'],
        ['恢复系数', fmt(current.restitution, 2), '0–0.4'],
        ['电机零位偏移', fmt(current.offset, 3) + ' rad', '0–0.035']
      ].forEach(function (r) {
        tb.row(r);
      });

      var n = samples.length;
      sN.set(n + ' 台');
      if (n) {
        var sorted = samples.slice().sort(function (a, b) { return a - b; });
        var med = sorted[Math.floor(n / 2)];
        var low = samples.filter(function (d) { return d < 1; }).length / n;
        sMed.set(fmt(med, 2) + '（理论 1.10）', Math.abs(med - 1.1) < 0.15 ? 'good' : null);
        sLow.set(fmt(low * 100, 1) + '%（理论 46.5%）', Math.abs(low - 0.465) < 0.03 ? 'good' : null);
      } else {
        sMed.set('—');
        sLow.set('—');
      }

      var g = begin(st);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 40, r: 14, t: 20, b: 34 }, [0, 4.2], [0, 1]);
      var bins = 21,
        counts = [];
      for (var b = 0; b < bins; b++) counts.push(0);
      samples.forEach(function (d) {
        counts[Math.min(bins - 1, Math.floor((d / 4.2) * bins))]++;
      });
      var mx = Math.max.apply(null, counts.concat([1]));
      axes(g, p, {
        xTicks: [0, 1, 2, 3, 4],
        xFmt: function (t) {
          return fmt(t, 0);
        },
        xLabel: '阻尼系数（倍）'
      });
      var bw = (p.x1 - p.x0) / bins;
      g.ctx.fillStyle = P.accent;
      counts.forEach(function (c, k) {
        var hgt = (c / mx) * (p.y0 - p.y1);
        g.ctx.fillRect(p.x0 + k * bw + 1, p.y0 - hgt, bw - 2, hgt);
      });
      var xm = p.sx(logUniformMedian(DAMP[0], DAMP[1]));
      line(g.ctx, [[xm, p.y0], [xm, p.y1]], P.good, 2);
      var xu = p.sx((DAMP[0] + DAMP[1]) / 2);
      line(g.ctx, [[xu, p.y0], [xu, p.y1]], P.warn, 2, [5, 4]);
      if (!n) text(g.ctx, '点「再抽 3000 台」看分布', (p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, P.muted, 'center', '12px sans-serif');
      st.canvas.setAttribute('aria-label', '抽到的电机阻尼系数直方图，对数均匀分布的中位数约 1.10');
    });

    samples.push(current.damping);
    render();
  }

  // ─── narrated explainer: ten scenes ──────────────────────────────────────
  var svgEl = K.svgEl,
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
    C_SURFACE2 = X.surface2,
    C_INK = X.ink;

  function rectBox(parent, x, y, w, h, stroke, fill, dash) {
    var r = paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 7, 'stroke-width': 1.3 }), fill || C_SURFACE, stroke || C_BORDER);
    if (dash) r.setAttribute('stroke-dasharray', dash);
    parent.appendChild(r);
    return r;
  }

  function group(parent) {
    var g = svgEl('g', {});
    parent.appendChild(g);
    return g;
  }

  function arrowPath(parent, pts, color, marker, dash, width) {
    var p = paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': width || 1.6, 'marker-end': marker }), null, color);
    if (dash) p.setAttribute('stroke-dasharray', dash);
    parent.appendChild(p);
    return p;
  }

  /* 竖柱：底边固定在 yBase，高度随动画长 */
  function vbar(parent, x, yBase, w, color, opacity) {
    var r = paint(svgEl('rect', { x: x, y: yBase, width: w, height: 0, rx: 2.5, opacity: opacity == null ? 0.9 : opacity }), color);
    r.yBase = yBase;
    parent.appendChild(r);
    return r;
  }

  function setH(node, h) {
    var hh = Math.max(0, h);
    node.setAttribute('y', (node.yBase - hh).toFixed(1));
    node.setAttribute('height', hh.toFixed(1));
  }

  function chip(parent, x, y, w, str, color, opts) {
    var o = opts || {};
    var g = group(parent);
    rectBox(g, x, y, w, o.h || 30, color, C_SURFACE, o.dash);
    g.appendChild(svgRich(x + w / 2, y + (o.h || 30) / 2 + 4, str, { size: o.size || 11, anchor: 'middle', w: w - 8, cls: o.cls || 'demo-x-ink2' }));
    return g;
  }

  function pathLine(parent, pts, color, width, dash) {
    var p = paint(svgEl('path', { d: polyPath(pts.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })), fill: 'none', 'stroke-width': width || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }), null, color);
    if (dash) p.setAttribute('stroke-dasharray', dash);
    parent.appendChild(p);
    return p;
  }

  /* 按比例 u ∈ [0, 1] 把一条折线「画出来」 */
  function drawOn(path, u) {
    if (!path.lenCache) path.lenCache = path.getTotalLength ? path.getTotalLength() || 1 : 1;
    path.setAttribute('stroke-dasharray', path.lenCache + ' ' + path.lenCache);
    path.setAttribute('stroke-dashoffset', (path.lenCache * (1 - u)).toFixed(1));
  }

  function put(ln, p, q) {
    ln.setAttribute('x1', p[0].toFixed(1));
    ln.setAttribute('y1', p[1].toFixed(1));
    ln.setAttribute('x2', q[0].toFixed(1));
    ln.setAttribute('y2', q[1].toFixed(1));
  }

  /* ── 一个侧视的 Digit 示意：躯干 + 头部的激光雷达盒 + 两条手臂 + 两条「鸟腿」
     （大腿往前、小腿往后、跗骨再往前落到脚板上）。远侧的手脚淡一些。
     `pose(cx, groundY, phase, o)`：cx 是髋的横坐标，phase 是左腿（近侧）的相位，
     o = { stride（半步长 m）, lift（抬脚高 m）, swing（摆臂幅度 °）, lean（前倾 °）, feet（直接给脚的位置） }。
     手臂与对侧腿同步（左腿往前时右臂往前），就是论文图 4A 的对侧摆臂。 */
  function digitFigure(parent, sc, color) {
    var g = group(parent);
    var M = 100 * sc; // px / m
    var L1 = 0.36 * M,
      L2 = 0.42 * M,
      TAR = [-0.11 * M, -0.2 * M],
      HIP_H = 0.86 * M,
      TORSO = 0.46 * M,
      UA = 0.26 * M,
      FA = 0.26 * M;
    function bone(w, far) {
      var ln = paint(svgEl('line', { 'stroke-width': w * sc, 'stroke-linecap': 'round' }), null, color);
      if (far) ln.style.opacity = 0.36;
      g.appendChild(ln);
      return ln;
    }
    function limbSet(far) {
      return { far: far };
    }
    var farArm = limbSet(true),
      farLeg = limbSet(true),
      nearLeg = limbSet(false),
      nearArm = limbSet(false);
    farArm.ua = bone(5, true);
    farArm.fa = bone(4.4, true);
    [farLeg, nearLeg].forEach(function (lg) {
      lg.thigh = bone(6.5, lg.far);
      lg.shin = bone(5.5, lg.far);
      lg.tar = bone(4, lg.far);
      lg.foot = bone(3.6, lg.far);
    });
    var torso = bone(17, false);
    torso.style.opacity = 0.92;
    var head = paint(svgEl('rect', { width: 0.14 * M, height: 0.09 * M, rx: 3 * sc }), color);
    g.appendChild(head);
    // 近侧腿和近侧手臂画在躯干前面
    g.appendChild(nearLeg.thigh);
    g.appendChild(nearLeg.shin);
    g.appendChild(nearLeg.tar);
    g.appendChild(nearLeg.foot);
    nearArm.ua = bone(5, false);
    nearArm.fa = bone(4.4, false);

    function legPose(lg, hip, foot) {
      var ankle = [foot[0] + TAR[0], foot[1] + TAR[1]];
      var dx = ankle[0] - hip[0],
        dy = ankle[1] - hip[1];
      var d = clamp(Math.hypot(dx, dy), 0.2 * M, L1 + L2 - 0.01);
      var base = Math.atan2(dy, dx);
      var bend = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      var ang = base - bend; // 膝盖朝前
      var knee = [hip[0] + L1 * Math.cos(ang), hip[1] + L1 * Math.sin(ang)];
      put(lg.thigh, hip, knee);
      put(lg.shin, knee, ankle);
      put(lg.tar, ankle, foot);
      put(lg.foot, [foot[0] - 0.05 * M, foot[1]], [foot[0] + 0.09 * M, foot[1]]);
      return { knee: knee, ankle: ankle };
    }

    function armPose(arm, sh, deg) {
      var a1 = ((8 + deg) * Math.PI) / 180,
        a2 = ((78 + deg) * Math.PI) / 180;
      var elbow = [sh[0] + UA * Math.sin(a1), sh[1] + UA * Math.cos(a1)];
      put(arm.ua, sh, elbow);
      put(arm.fa, elbow, [elbow[0] + FA * Math.sin(a2), elbow[1] + FA * Math.cos(a2)]);
    }

    function pose(cx, gy, phase, opts) {
      var o = opts || {};
      var S = (o.stride == null ? 0.15 : o.stride) * M,
        LIFT = (o.lift == null ? 0.1 : o.lift) * M,
        SW = o.swing == null ? 18 : o.swing,
        lean = ((o.lean == null ? 5 : o.lean) * Math.PI) / 180;
      var hip = [cx, gy - HIP_H + (o.crouch || 0) * M];
      var sh = [hip[0] + TORSO * Math.sin(lean), hip[1] - TORSO * Math.cos(lean)];
      put(torso, hip, sh);
      head.setAttribute('x', (sh[0] - 0.05 * M).toFixed(1));
      head.setAttribute('y', (sh[1] - 0.15 * M).toFixed(1));
      var fx = [], legs = [];
      [nearLeg, farLeg].forEach(function (lg, k) {
        var p = (((phase + (k ? Math.PI : 0)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        var u = p < Math.PI ? p / Math.PI : (p - Math.PI) / Math.PI;
        var x = p < Math.PI ? S * (1 - 2 * u) : S * (2 * u - 1);
        var y = gy - (p < Math.PI ? 0 : LIFT * Math.sin(Math.PI * u));
        var foot = o.feet && o.feet[k] ? o.feet[k] : [cx + x, y];
        legs.push(legPose(lg, hip, foot));
        fx.push(S ? x / S : 0);
      });
      // 对侧摆臂：近侧（左）手臂跟远侧（右）腿同步，远侧（右）手臂跟近侧（左）腿同步
      armPose(nearArm, sh, SW * fx[1]);
      armPose(farArm, sh, SW * fx[0]);
      // knee / ankle 是近侧腿的膝与踝（标注小腿时用）
      return { hip: hip, shoulder: sh, knee: legs[0].knee, ankle: legs[0].ankle };
    }

    return { el: g, pose: pose, M: M };
  }

  /* ── 小地面图：第 6 幕的户外与实验室地面。颜色是「图片」本身，不跟随站点主题。 */
  function groundTile(parent, kind, x, y, w, h, seed) {
    var rng = mulberry32(seed || 5);
    var g = group(parent);
    var defs = svgEl('defs', {});
    g.appendChild(defs);
    var clipId = 'rh-x-clip-' + kind + '-' + Math.round(x) + '-' + Math.round(y);
    var cp = svgEl('clipPath', { id: clipId });
    cp.appendChild(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 4 }));
    defs.appendChild(cp);
    var body = svgEl('g', { 'clip-path': 'url(#' + clipId + ')' });
    g.appendChild(body);
    function add(tag, attrs) {
      var n = svgEl(tag, attrs);
      body.appendChild(n);
      return n;
    }
    var sky = { plaza: '#b7c4d3', walk: '#aebccb', track: '#b9c6d2', grass: '#a9c0a2', wet: '#8e9cab', rubber: '#3a3f47', cloth: '#3a3f47', cable: '#3a3f47', bubble: '#3a3f47' }[kind];
    add('rect', { x: x, y: y, width: w, height: h, fill: sky });
    var i;
    if (kind === 'plaza') {
      add('rect', { x: x, y: y + h * 0.55, width: w, height: h * 0.45, fill: '#c9c4ba' });
      for (i = 0; i < 6; i++) add('line', { x1: x + (w * i) / 6, y1: y + h * 0.55, x2: x + (w * i) / 6 - 12, y2: y + h, stroke: '#9d988e', 'stroke-width': 1 });
      add('line', { x1: x, y1: y + h * 0.75, x2: x + w, y2: y + h * 0.75, stroke: '#9d988e', 'stroke-width': 1 });
    } else if (kind === 'walk') {
      add('rect', { x: x, y: y + h * 0.55, width: w, height: h * 0.45, fill: '#a5a29c' });
      add('rect', { x: x, y: y + h * 0.5, width: w, height: h * 0.07, fill: '#7d7a74' });
      for (i = 0; i < 4; i++) add('line', { x1: x + (w * (i + 0.5)) / 4, y1: y + h * 0.57, x2: x + (w * (i + 0.5)) / 4 - 10, y2: y + h, stroke: '#85827c', 'stroke-width': 1 });
    } else if (kind === 'track') {
      add('rect', { x: x, y: y + h * 0.52, width: w, height: h * 0.48, fill: '#b5533c' });
      for (i = 0; i < 3; i++) add('line', { x1: x, y1: y + h * (0.64 + 0.12 * i), x2: x + w, y2: y + h * (0.62 + 0.12 * i), stroke: '#f1e7df', 'stroke-width': 1.4 });
    } else if (kind === 'grass') {
      add('rect', { x: x, y: y + h * 0.55, width: w, height: h * 0.45, fill: '#4f8a3a' });
      for (i = 0; i < 22; i++) {
        var px = x + rng() * w;
        add('path', { d: 'M ' + px + ' ' + (y + h) + ' q ' + (rng() * 6 - 3) + ' ' + -h * 0.25 + ' ' + (rng() * 8 - 4) + ' ' + -h * (0.3 + rng() * 0.15), stroke: ['#3c7a2c', '#5f9d47', '#2f6524'][i % 3], 'stroke-width': 1.6, fill: 'none' });
      }
    } else if (kind === 'wet') {
      add('rect', { x: x, y: y + h * 0.55, width: w, height: h * 0.45, fill: '#6f7883' });
      for (i = 0; i < 4; i++) add('ellipse', { cx: x + w * (0.15 + 0.24 * i), cy: y + h * (0.7 + 0.1 * (i % 2)), rx: w * 0.1, ry: h * 0.04, fill: '#a9c3d8', opacity: 0.7 });
    } else if (kind === 'rubber') {
      for (i = 0; i < 5; i++) add('rect', { x: x + (w * i) / 5 + 1, y: y + h * 0.6, width: w / 5 - 2, height: h * 0.4, fill: i % 2 ? '#4a4f57' : '#5b6069' });
    } else if (kind === 'cloth') {
      add('path', { d: 'M ' + x + ' ' + (y + h * 0.7) + ' Q ' + (x + w * 0.3) + ' ' + (y + h * 0.55) + ' ' + (x + w * 0.55) + ' ' + (y + h * 0.7) + ' T ' + (x + w) + ' ' + (y + h * 0.68) + ' L ' + (x + w) + ' ' + (y + h) + ' L ' + x + ' ' + (y + h) + ' Z', fill: '#d58aa6' });
    } else if (kind === 'cable') {
      for (i = 0; i < 3; i++) add('path', { d: 'M ' + x + ' ' + (y + h * (0.72 + 0.08 * i)) + ' C ' + (x + w * 0.3) + ' ' + (y + h * (0.5 + 0.1 * i)) + ' ' + (x + w * 0.6) + ' ' + (y + h * 0.95) + ' ' + (x + w) + ' ' + (y + h * (0.7 + 0.06 * i)), stroke: ['#1d1f22', '#e8b44b', '#6b8fb5'][i], 'stroke-width': 2.6, fill: 'none' });
    } else if (kind === 'bubble') {
      for (i = 0; i < 14; i++) add('circle', { cx: x + 6 + ((i % 7) * (w - 12)) / 6, cy: y + h * (0.72 + 0.14 * Math.floor(i / 7)), r: 4.5, fill: '#cfe3f2', opacity: 0.8 });
    }
    g.appendChild(paint(svgEl('rect', { x: x + 0.5, y: y + 0.5, width: w - 1, height: h - 1, rx: 4, fill: 'none', 'stroke-width': 1 }), null, C_BORDER));
    return g;
  }

  /* 一张小折线图：xs / ys 是数据，返回 { g, sx, sy } */
  function miniAxes(parent, x, y, w, h, xd, yd, xTicks, yTicks, xFmt, yFmt) {
    var g = group(parent);
    function sx(v) {
      return x + ((v - xd[0]) / (xd[1] - xd[0])) * w;
    }
    function sy(v) {
      return y + h - ((v - yd[0]) / (yd[1] - yd[0])) * h;
    }
    g.appendChild(paint(svgEl('line', { x1: x, y1: y + h, x2: x + w, y2: y + h, 'stroke-width': 1 }), null, C_BORDER));
    g.appendChild(paint(svgEl('line', { x1: x, y1: y, x2: x, y2: y + h, 'stroke-width': 1 }), null, C_BORDER));
    (xTicks || []).forEach(function (t) {
      g.appendChild(svgText(sx(t), y + h + 13, xFmt ? xFmt(t) : String(t), 'demo-x-mut demo-x-mono', 9.5, 'middle'));
    });
    (yTicks || []).forEach(function (t) {
      g.appendChild(svgText(x - 5, sy(t) + 3.5, yFmt ? yFmt(t) : String(t), 'demo-x-mut demo-x-mono', 9.5, 'end'));
      g.appendChild(paint(svgEl('line', { x1: x, y1: sy(t), x2: x + w, y2: sy(t), 'stroke-width': 0.6, 'stroke-dasharray': '2 4' }), null, C_BORDER));
    });
    return { g: g, sx: sx, sy: sy };
  }

  /* ── scene 1: 全尺寸人形为什么难 ── */
  function buildSceneProblem() {
    var s = sceneSvg('经典控制靠模型预测控制、轨迹优化和状态机，换环境难泛化；学习方法已在四足、双足和小人形上见效，全尺寸人形还没有纯学习的控制器；Digit 身高约 1.6 米、45 公斤、30 个自由度，腿上有叶片弹簧和四连杆组成的闭链；它是盲的，只有关节编码器和惯性测量单元；论文假设观测动作历史里藏着世界的信息，Transformer 能在上下文里调整行为');
    s.appendChild(svgText(30, 28, '全尺寸人形：经典控制很强，但换个环境就得重新设计', 'demo-x-ink2', 13.5));

    function column(x, w, color, dash, head, lines, last, lastCls) {
      var g = group(s);
      rectBox(g, x, 44, w, 126, color, C_SURFACE, dash);
      g.appendChild(svgText(x + 14, 66, head, null, 12.5));
      lines.forEach(function (str, k) {
        g.appendChild(svgText(x + 14, 92 + k * 22, str, 'demo-x-ink2', 11));
      });
      g.appendChild(svgText(x + 14, 156, last, lastCls, 11.5));
      return g;
    }
    var colA = column(30, 240, C_BAD, '4 3', '经典控制', ['模型预测控制 · 轨迹优化 · 状态机', 'Atlas 后空翻、跳障碍、跳舞'], '难泛化，换环境就要重新调', 'demo-x-bad');
    var colB = column(280, 250, C_WARN, '4 3', '学习方法', ['灵巧操作 · 四足 · 双足（Cassie）', '小型人形；全尺寸人形要配模型控制器'], '纯学习的全尺寸人形：还没有', 'demo-x-warn');

    // 右：Digit 示意
    var robotG = group(s);
    rectBox(robotG, 545, 44, 225, 300, C_BORDER, C_SURFACE2);
    var ground = paint(svgEl('line', { x1: 555, y1: 318, x2: 760, y2: 318, 'stroke-width': 1.4 }), null, C_MUTED);
    robotG.appendChild(ground);
    var digit = digitFigure(robotG, 1.12, C_INK);
    robotG.appendChild(svgText(556, 62, 'Agility Robotics Digit（示意）', 'demo-x-mut', 10.5));
    var specs = group(s);
    [['约 1.6 m · 45 kg', 'demo-x-acc'], ['30 个自由度（含浮动基座）', 'demo-x-ink2'], ['每臂 4 个驱动关节', 'demo-x-ink2'], ['每腿 8 个关节，6 个驱动', 'demo-x-ink2']].forEach(function (r, k) {
      specs.appendChild(svgText(556, 84 + k * 17, r[0], r[1], 10.5));
    });
    var chain = group(s);
    var chainLine = paint(svgEl('path', { fill: 'none', 'stroke-width': 1.6, 'stroke-dasharray': '3 3' }), null, C_WARN);
    chain.appendChild(chainLine);
    var chainDot = paint(svgEl('circle', { r: 5, fill: 'none', 'stroke-width': 2 }), null, C_WARN);
    chain.appendChild(chainDot);
    chain.appendChild(svgText(556, 336, '小腿、跗骨被动：叶片弹簧 + 四连杆', 'demo-x-warn', 10.5));

    var sense = group(s);
    chip(sense, 30, 186, 500, '**盲走**：没有相机，只有关节编码器 + IMU（经 Agility 的接口读取）', C_BORDER, { h: 32, size: 11.5 });
    var hyp = group(s);
    chip(hyp, 30, 230, 500, '假设：观测—动作历史里藏着世界的信息 → Transformer **在上下文里**调整动作', C_ACCENT, { h: 34, size: 11.5 });
    hyp.appendChild(svgRich(40, 290, '例：比较「想到达的状态」和「实际到达的状态」，就知道下一步该怎么改', { size: 11, w: 490, cls: 'demo-x-ink2' }));
    hyp.appendChild(svgRich(40, 314, '权重不更新，像 GPT-3 的上下文学习（in-context learning）', { size: 11, w: 490, cls: 'demo-x-mut' }));
    var fin = group(s);
    chip(fin, 30, 356, 740, '纯学习控制器 · 只在仿真里训练 · **零样本**上真机 · 户外测了一周没有摔倒', C_GOOD, { h: 36, size: 12.5 });

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      setOpacity(colA, seg(t, 0.3, 0.9));
      setOpacity(colB, seg(t, 1.8, 2.4));
      setOpacity(robotG, seg(t, 3.6, 4.2));
      setOpacity(specs, seg(t, 4.0, 4.6));
      var walking = seg(t, 13.6, 14.2);
      /* 相位从起步那一刻（13.6 s）开始累加，起步时只让步幅从 0 长起来。
         写成 1.1 Hz × now × walking 的话，起步那 0.6 s 里相位的变化率会被放大约 now / 0.6 ≈ 23 倍，腿会猛转几圈 */
      var pz = digit.pose(690, 318, 2 * Math.PI * 1.1 * Math.max(0, now - 13.6), { stride: 0.15 * walking, lift: 0.1 * walking, swing: 18 * walking });
      // 圈心放在近侧小腿（膝—踝连线）的中点，跟着走路的姿态一起动；引线从圈边指向下方的标注
      var M = digit.M;
      var kx = (pz.knee[0] + pz.ankle[0]) / 2,
        ky = (pz.knee[1] + pz.ankle[1]) / 2,
        r = 0.14 * M;
      var lx = 600 - kx,
        ly = 326 - ky,
        ld = Math.hypot(lx, ly) || 1;
      chainDot.setAttribute('cx', kx.toFixed(1));
      chainDot.setAttribute('cy', ky.toFixed(1));
      chainDot.setAttribute('r', r.toFixed(1));
      chainLine.setAttribute('d', 'M ' + (kx + (r * lx) / ld).toFixed(1) + ' ' + (ky + (r * ly) / ld).toFixed(1) + ' L 600 326');
      setOpacity(chain, seg(t, 5.2, 5.8));
      setOpacity(sense, seg(t, 7.4, 8.0));
      setOpacity(hyp, seg(t, 10.6, 11.2));
      setOpacity(fin, seg(t, 13.6, 14.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 2: 因果 Transformer ── */
  function buildSceneModel() {
    var s = sceneSvg('每个 token 是一对观测和上一步动作，经 512、512 的 MLP 压成 192 维，加正弦位置编码；窗口 16 步即 0.32 秒；4 个 block、4 个头、每头 48 维；因果掩码让每个 token 只看过去，16 个 token 共 136 对；最后一个 token 经 256、128 的动作头输出 16 个关节的 PD 目标和 8 个腿部关节的 PD 增益；共 140 万参数，策略 50 赫兹，关节 PD 1 千赫兹');
    s.appendChild(svgText(30, 28, '控制器：最近 16 步的（观测，动作）→ 因果 Transformer → 下一步动作', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'rh-x-arrow-s2', C_MUTED);

    // token 行
    var TX0 = 40,
      TW = 25,
      TY = 70;
    var tokG = group(s);
    var toks = [];
    for (var i = 0; i < CTX; i++) {
      var g = group(tokG);
      var x = TX0 + i * (TW + 3);
      rectBox(g, x, TY, TW, 34, i === CTX - 1 ? C_ACCENT : C_BORDER, C_SURFACE2);
      g.appendChild(svgText(x + TW / 2, TY + 14, 'o', 'demo-x-acc demo-x-mono', 10.5, 'middle'));
      g.appendChild(svgText(x + TW / 2, TY + 28, 'a', 'demo-x-warn demo-x-mono', 10.5, 'middle'));
      toks.push(g);
    }
    var tokLbl = group(s);
    tokLbl.appendChild(svgRich(TX0, TY + 52, '$o_{t-15}, a_{t-16}$', { size: 10.5, w: 140, cls: 'demo-x-mut' }));
    tokLbl.appendChild(svgRich(TX0 + CTX * (TW + 3) - 3, TY + 52, '$o_t, a_{t-1}$', { size: 10.5, anchor: 'end', w: 120, cls: 'demo-x-acc' }));
    var brace = group(s);
    brace.appendChild(paint(svgEl('path', { d: 'M ' + TX0 + ' ' + (TY - 6) + ' L ' + TX0 + ' ' + (TY - 12) + ' L ' + (TX0 + CTX * (TW + 3) - 3) + ' ' + (TY - 12) + ' L ' + (TX0 + CTX * (TW + 3) - 3) + ' ' + (TY - 6), fill: 'none', 'stroke-width': 1.2 }), null, C_ACCENT));
    brace.appendChild(svgRich(TX0 + (CTX * (TW + 3)) / 2, TY - 18, '16 步 × 0.02 s = **0.32 s**', { size: 11, anchor: 'middle', w: 220, cls: 'demo-x-acc' }));

    // 嵌入
    var embG = group(s);
    rectBox(embG, TX0, 140, 445, 34, C_BORDER);
    embG.appendChild(svgRich(TX0 + 222, 161, '每对 $(o, a)$ → MLP（512、512）→ **192 维** token + 正弦位置编码', { size: 11, anchor: 'middle', w: 440 }));
    arrowPath(embG, [[TX0 + 222, 124], [TX0 + 222, 138]], C_MUTED, mk);

    // Transformer 块
    var blkG = group(s);
    var blocks = [];
    for (var b = 0; b < N_BLOCK; b++) {
      var bg = group(blkG);
      rectBox(bg, TX0 + 10 + b * 5, 188 + b * 5, 425, 46, b === N_BLOCK - 1 ? C_ACCENT : C_BORDER, C_SURFACE);
      blocks.push(bg);
    }
    blkG.appendChild(svgRich(TX0 + 240, 219, '**4 个 block** · 192 维 · 4 个头（每头 48 维）· MLP 比例 2.0', { size: 11.5, anchor: 'middle', w: 410 }));
    blkG.appendChild(svgMath(TX0 + 240, 240, '\\mathrm{Attention}(Q,K,V) = \\mathrm{softmax}\\!\\left(\\tfrac{QK^\\top}{\\sqrt{d_k}}\\right)V', { size: 11.5, anchor: 'middle', w: 410 }));
    arrowPath(blkG, [[TX0 + 222, 174], [TX0 + 222, 186]], C_MUTED, mk);

    // 动作头
    var headG = group(s);
    rectBox(headG, TX0, 272, 445, 70, C_GOOD);
    headG.appendChild(svgRich(TX0 + 14, 292, '最后一个 token → 动作头 MLP（256、128）→ $a_t$', { size: 11.5, w: 430 }));
    headG.appendChild(svgRich(TX0 + 14, 314, '**16** 个驱动关节的 PD 目标 + **8** 个腿部关节的 PD 增益', { size: 11, w: 430, cls: 'demo-x-good' }));
    headG.appendChild(svgText(TX0 + 14, 333, '4 个脚趾电机不归策略管：固定在默认位置、固定增益', 'demo-x-mut', 10.5));
    arrowPath(headG, [[TX0 + 222, 255], [TX0 + 222, 270]], C_MUTED, mk);

    // 右：因果掩码
    var maskG = group(s);
    var MX = 520,
      MY = 60,
      MS = 240,
      cell = MS / CTX;
    maskG.appendChild(svgText(MX, MY - 6, '因果掩码：第 i 步只看第 1…i 步', 'demo-x-ink2', 11));
    var cells = [];
    for (var r = 0; r < CTX; r++) {
      for (var c = 0; c < CTX; c++) {
        var ok = c <= r;
        var rc = paint(svgEl('rect', { x: MX + c * cell + 0.6, y: MY + r * cell + 0.6, width: cell - 1.2, height: cell - 1.2, rx: 1.5 }), ok ? C_ACCENT : C_SURFACE2);
        rc.style.opacity = ok ? 0.25 : 0.55;
        maskG.appendChild(rc);
        if (ok) cells.push({ el: rc, r: r, c: c });
      }
    }
    maskG.appendChild(paint(svgEl('rect', { x: MX, y: MY, width: MS, height: MS, fill: 'none', 'stroke-width': 1 }), null, C_BORDER));
    var pairsTxt = svgRich(MX + MS / 2, MY + MS + 20, '$16 \\times 17 / 2 =$ **136** 对（共 256 格）', { size: 11, anchor: 'middle', w: 260, cls: 'demo-x-acc' });
    maskG.appendChild(pairsTxt);

    var fin = group(s);
    chip(fin, 30, 356, 740, '全部只有 **140 万**参数 · 策略 **50 Hz** · 真机上关节 PD **1 kHz**', C_ACCENT, { h: 36, size: 12.5 });

    function draw(t) {
      toks.forEach(function (g, i) {
        setOpacity(g, seg(t, 0.3 + i * 0.12, 0.6 + i * 0.12));
      });
      setOpacity(tokLbl, seg(t, 2.2, 2.8));
      setOpacity(brace, seg(t, 3.8, 4.4));
      setOpacity(embG, seg(t, 1.4, 2.0));
      setOpacity(blkG, seg(t, 7.4, 8.0));
      blocks.forEach(function (g, k) {
        setOpacity(g, seg(t, 7.4 + k * 0.25, 7.8 + k * 0.25));
      });
      setOpacity(maskG, seg(t, 8.6, 9.2));
      var fillU = seg(t, 9.0, 10.6);
      cells.forEach(function (o) {
        var lit = o.r / CTX < fillU;
        o.el.style.opacity = !lit ? 0.12 : o.r === CTX - 1 && t >= 10.8 ? 0.95 : 0.45;
      });
      setOpacity(headG, seg(t, 10.8, 11.4));
      setOpacity(fin, seg(t, 13.8, 14.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 3: 两步训练 ── */
  function buildSceneTraining() {
    var s = sceneSvg('第一步假设环境完全可观，用 PPO 训教师状态策略，输入 480 维状态，网络是 512、512、256、128 的 MLP；第二步学生只看观测历史，损失是强化学习损失加 lambda 乘学生对教师的 KL 散度，lambda 逐渐退火，通常训练一半时到 0；评论家两步都看完整状态；图 8C 在 25 度坡上只用强化学习 0.16 米每秒，只模仿 0.63，联合 0.75');
    s.appendChild(svgText(30, 28, '两步训练：先训看得见一切的教师，再让学生边模仿边做强化学习', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'rh-x-arrow-s3', C_MUTED);

    var slow = group(s);
    chip(slow, 30, 42, 360, '直接在观测空间做 RL：样本效率低、又慢又费资源', C_BAD, { h: 30, size: 11, dash: '4 3' });

    var t1 = group(s);
    rectBox(t1, 30, 86, 360, 116, C_WARN);
    t1.appendChild(svgRich(44, 106, '① 教师：状态策略 $\\pi_s(a_t \\mid s_t)$', { size: 12, w: 340, cls: 'demo-x-warn' }));
    t1.appendChild(svgText(44, 126, 'MLP（512、512、256、128）· PPO · 假设环境完全可观', 'demo-x-ink2', 10.5));
    var stateRows = [['观测', OBS_TOTAL], ['高度图', 121], ['动作差', 36], ['观测差', 61], ['参数', 147], ['增益', 40]];
    var sx0 = 44;
    stateRows.forEach(function (r, k) {
      var w = 56;
      var g = group(t1);
      rectBox(g, sx0, 136, w - 4, 34, C_BORDER, C_SURFACE2);
      g.appendChild(svgText(sx0 + (w - 4) / 2, 150, r[0], 'demo-x-mut', 9.5, 'middle'));
      g.appendChild(svgText(sx0 + (w - 4) / 2, 165, String(r[1]), 'demo-x-ink2 demo-x-mono', 10, 'middle'));
      sx0 += w;
    });
    t1.appendChild(svgRich(44, 190, '再加步态启发量 6、重力 3 → 共 **480** 维（按 v1 表 III 加）', { size: 10.5, w: 340, cls: 'demo-x-ink2' }));

    var t2 = group(s);
    rectBox(t2, 30, 216, 360, 70, C_ACCENT);
    t2.appendChild(svgRich(44, 236, '② 学生：观测策略 $\\pi_o$（16 步历史 → Transformer）', { size: 12, w: 340, cls: 'demo-x-acc' }));
    t2.appendChild(svgMath(44, 262, '\\mathcal{L}(\\pi_o) = \\mathcal{L}_{RL}(\\pi_o) + \\lambda\\, D_{KL}(\\pi_o \\,\\|\\, \\pi_s)', { size: 12.5, w: 340 }));
    t2.appendChild(svgText(44, 280, '两项都是 on-policy，不需要离线数据', 'demo-x-mut', 10));
    arrowPath(t2, [[210, 202], [210, 214]], C_MUTED, mk);

    var why = group(s);
    chip(why, 30, 298, 360, '为什么还要 RL 项：状态空间和观测空间的「奖励流形」不同，只模仿会次优', C_BORDER, { h: 40, size: 10.5 });
    var critic = group(s);
    chip(critic, 30, 346, 360, 'critic 两步都看完整状态 $s_t$（非对称 actor-critic）', C_BORDER, { h: 30, size: 10.5 });

    // 右上：λ 退火
    var lamG = group(s);
    rectBox(lamG, 410, 42, 360, 130, C_BORDER, C_SURFACE2);
    lamG.appendChild(svgRich(424, 60, '$\\lambda$ 逐渐退火，通常训练进行到**一半**时到 0', { size: 11, w: 340 }));
    var la = miniAxes(lamG, 450, 74, 300, 70, [0, 1], [0, 1], [0, 0.5, 1], [0, 1], function (v) { return v === 0 ? '0' : v === 1 ? '6000 轮' : '一半'; }, function (v) { return v ? '' : '0'; });
    lamG.appendChild(svgRich(la.sx(0) - 5, la.sy(1) + 3.5, '$\\lambda_0$', { size: 10, anchor: 'end', w: 40, cls: 'demo-x-mut' }));
    var lamCurve = pathLine(lamG, [[la.sx(0), la.sy(1)], [la.sx(0.5), la.sy(0)], [la.sx(1), la.sy(0)]], C_ACCENT, 2.4);
    lamG.appendChild(svgText(la.sx(0.52), la.sy(0.75), '线性下降是示意，论文没写形状', 'demo-x-mut', 9.5));
    var lamDot = paint(svgEl('circle', { r: 4.5 }), C_WARN);
    lamG.appendChild(lamDot);

    // 右下：图 8C
    var abl = group(s);
    rectBox(abl, 410, 184, 360, 208, C_BORDER, C_SURFACE2);
    abl.appendChild(svgRich(424, 202, '图 8C（读图）：命令 1 m/s 爬坡，实际速度', { size: 11, w: 340 }));
    var ax = miniAxes(abl, 450, 218, 300, 136, [0, 25], [0, 1.05], SLOPES, [0, 0.5, 1], function (v) { return v + '°'; }, function (v) { return fmt(v, 1); });
    var cols = [C_BAD, C_MUTED, C_ACCENT];
    var curves = FIG8C.map(function (r, k) {
      var pts = SLOPES.map(function (sl, m) { return [ax.sx(sl), ax.sy(r[1][m])]; });
      var p = pathLine(abl, pts, cols[k], k === 2 ? 2.6 : 1.8);
      return p;
    });
    var labs = group(abl);
    labs.appendChild(svgText(ax.sx(25) + 4, ax.sy(0.75) - 4, '0.75', 'demo-x-acc demo-x-mono', 10));
    labs.appendChild(svgText(ax.sx(25) + 4, ax.sy(0.63) + 10, '0.63', 'demo-x-mut demo-x-mono', 10));
    labs.appendChild(svgText(ax.sx(25) + 4, ax.sy(0.16) + 4, '0.16', 'demo-x-bad demo-x-mono', 10));
    labs.appendChild(svgText(ax.sx(2), ax.sy(0.32), '模仿 + RL', 'demo-x-acc', 10));
    labs.appendChild(svgText(ax.sx(2), ax.sy(0.22), '只模仿', 'demo-x-mut', 10));
    labs.appendChild(svgText(ax.sx(2), ax.sy(0.12), '只 RL', 'demo-x-bad', 10));

    function draw(t) {
      setOpacity(slow, seg(t, 0.3, 0.9));
      setOpacity(t1, seg(t, 3.6, 4.2));
      setOpacity(t2, seg(t, 7.4, 8.0));
      setOpacity(lamG, seg(t, 8.4, 9.0));
      drawOn(lamCurve, ease(seg(t, 8.8, 10.4)));
      var u = seg(t, 9.0, 10.6);
      lamDot.setAttribute('cx', la.sx(u).toFixed(1));
      lamDot.setAttribute('cy', la.sy(Math.max(0, 1 - 2 * u)).toFixed(1));
      setOpacity(lamDot, seg(t, 9.0, 9.3));
      setOpacity(why, seg(t, 10.8, 11.4));
      setOpacity(critic, seg(t, 12.2, 12.8));
      setOpacity(abl, seg(t, 13.8, 14.3));
      curves.forEach(function (p, k) {
        drawOn(p, ease(seg(t, 14.0 + k * 0.4, 15.0 + k * 0.4)));
      });
      setOpacity(labs, seg(t, 15.6, 16.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 4: 奖励与命令 ── */
  var REWARD_GROUPS = [
    ['跟踪', ['线速度 $r_{lv}$', '转向 $r_{av}$'], C_GOOD],
    ['机身', ['上下与俯仰横滚 $r_{bm}$', '倾斜 $r_{bo}$', '低于 1 m $r_{bh}$'], C_ACCENT],
    ['接触', ['双脚离地 $r_{air}$', '触地力过大 $r_f$'], C_ACCENT],
    ['步态', ['摆脚轨迹 $r_{fs}$'], C_WARN],
    ['平滑与能耗', ['力矩 $r_\\tau$', '关节加速度 $r_{acc}$', '动作变化 $r_a$', '关节目标差分 $r_s$'], C_ACCENT],
    ['姿态与终止', ['关节偏离中立 $r_{jp}$', '碰撞终止 $r_k$'], C_ACCENT]
  ];

  function buildSceneReward() {
    var s = sceneSvg('命令是前后、横向线速度和转向角速度，每 10 秒重抽，小于阈值的置零；奖励 14 项：线速度跟踪是 exp 负误差平方除以 0.2，命令 0.5 实际 0.4 得 0.951；惩罚机身晃动、倾斜、过低、双脚离地、触地力、力矩、加速度、动作变化；摆脚轨迹跟踪 Raibert 启发式和 von Mises 分布；手臂关节偏离中立有惩罚，肩俯仰权重只有 0.1');
    s.appendChild(svgText(30, 28, '强化学习在优化什么：三维速度命令 + 14 项奖励（v1 附录）', 'demo-x-ink2', 13.5));

    // 左上：命令
    var cmdG = group(s);
    rectBox(cmdG, 30, 42, 360, 126, C_BORDER, C_SURFACE2);
    cmdG.appendChild(svgText(44, 60, '命令：每 10 s 重抽一次（一回合 20 s）', 'demo-x-ink2', 11));
    var CMD_ROWS = [['前后 $v_x$', CMD_RANGE[0], CMD_CUT[0], 'm/s'], ['横向 $v_y$', CMD_RANGE[1], CMD_CUT[1], 'm/s'], ['转向 $\\omega_z$', CMD_RANGE[2], CMD_CUT[2], 'rad/s']];
    var BX0 = 118,
      BW = 190;
    function bx(v) {
      return BX0 + ((v + 1) / 2) * BW;
    }
    var cmdDots = CMD_ROWS.map(function (r, k) {
      var y = 82 + k * 26;
      cmdG.appendChild(svgRich(44, y + 4, r[0], { size: 10.5, w: 66 }));
      cmdG.appendChild(paint(svgEl('line', { x1: bx(-1), y1: y, x2: bx(1), y2: y, 'stroke-width': 1 }), null, C_BORDER));
      cmdG.appendChild(paint(svgEl('rect', { x: bx(r[1][0]), y: y - 5, width: bx(r[1][1]) - bx(r[1][0]), height: 10, rx: 3, opacity: 0.35 }), C_ACCENT));
      cmdG.appendChild(paint(svgEl('rect', { x: bx(-r[2]), y: y - 7, width: bx(r[2]) - bx(-r[2]), height: 14, rx: 2, opacity: 0.55 }), C_WARN));
      cmdG.appendChild(svgText(bx(1) + 6, y + 3.5, fmt(r[1][0], 1) + ' … ' + fmt(r[1][1], 1), 'demo-x-mut demo-x-mono', 9));
      var d = paint(svgEl('circle', { r: 4.5, cy: y }), C_INK);
      cmdG.appendChild(d);
      return { el: d, row: r };
    });
    cmdG.appendChild(svgText(44, 160, '蓝条：训练范围 · 黄条：小于阈值置零 → 也练原地站', 'demo-x-warn', 10));

    // 右上：r_lv 曲线
    var curG = group(s);
    rectBox(curG, 410, 42, 360, 126, C_BORDER, C_SURFACE2);
    curG.appendChild(svgMath(424, 62, 'r_{lv} = \\exp\\!\\left(-\\lVert v_{xy} - v^*_{xy}\\rVert^2 / 0.2\\right)', { size: 11.5, w: 340 }));
    var ca = miniAxes(curG, 450, 92, 300, 54, [0, 1], [0, 1], [0, 0.5, 1], [0, 1], function (v) { return fmt(v, 1); }, function (v) { return fmt(v, 0); });
    var cpts = [];
    for (var i = 0; i <= 50; i++) cpts.push([ca.sx(i / 50), ca.sy(trackReward(i / 50, SIGMA_V))]);
    var curve = pathLine(curG, cpts, C_GOOD, 2.2);
    var marks = group(curG);
    [[0.1, '0.951'], [0.2, '0.819'], [0.5, '0.287']].forEach(function (m) {
      var x = ca.sx(m[0]),
        y = ca.sy(trackReward(m[0], SIGMA_V));
      marks.appendChild(paint(svgEl('circle', { cx: x, cy: y, r: 3.6 }), C_WARN));
      marks.appendChild(svgText(x + 5, y - 5, m[1], 'demo-x-warn demo-x-mono', 9.5));
    });
    curG.appendChild(svgText(424, 82, '命令 0.5 m/s：实际 0.4 / 0.3 / 0 → 误差 0.1 / 0.2 / 0.5', 'demo-x-mut', 9.5));

    // 中：14 项奖励
    var rwG = group(s);
    var groupsEls = [];
    var gx = 30;
    REWARD_GROUPS.forEach(function (gr, k) {
      var w = [118, 138, 120, 104, 138, 110][k];
      var g = group(rwG);
      rectBox(g, gx, 182, w - 6, 26 + gr[1].length * 19, gr[2], C_SURFACE);
      g.appendChild(svgText(gx + 8, 198, gr[0], k === 0 ? 'demo-x-good' : k === 3 ? 'demo-x-warn' : 'demo-x-acc', 11));
      gr[1].forEach(function (str, m) {
        g.appendChild(svgRich(gx + 8, 216 + m * 19, str, { size: 9.5, w: w - 14, cls: 'demo-x-ink2' }));
      });
      groupsEls.push(g);
      gx += w;
    });

    var fsG = group(s);
    chip(fsG, 30, 292, 370, '摆脚轨迹：水平用 Raibert 启发式，高度用 von Mises 分布（$\\kappa = 0.04$）', C_WARN, { h: 34, size: 10.5 });
    fsG.appendChild(svgText(40, 344, '观测里还有 2 维时钟输入：没有步态库，但奖励里有启发式的脚轨迹', 'demo-x-mut', 10));

    // 右下：手臂关节惩罚
    var armG = group(s);
    rectBox(armG, 410, 292, 360, 100, C_BORDER, C_SURFACE2);
    armG.appendChild(svgRich(424, 310, '关节偏离中立的权重 $\\alpha$（式 15）', { size: 11, w: 340 }));
    var armBars = ARM_ALPHA.map(function (r, k) {
      var y = 322 + k * 16;
      armG.appendChild(svgText(424, y + 8, r[0], 'demo-x-ink2', 9.5));
      var bar = paint(svgEl('rect', { x: 540, y: y, width: 0, height: 10, rx: 2 }), k === 3 ? C_GOOD : C_ACCENT);
      armG.appendChild(bar);
      armG.appendChild(svgText(540 + r[1] * 90 + 6, y + 9, fmt(r[1], 1), 'demo-x-mut demo-x-mono', 9.5));
      return { el: bar, v: r[1] };
    });
    var armNote = svgText(582, 380, '摆臂靠肩俯仰，罚得最轻（我们的观察）', 'demo-x-good', 9.5);
    armG.appendChild(armNote);

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      setOpacity(cmdG, seg(t, 0.3, 0.9));
      cmdDots.forEach(function (d, k) {
        var r = d.row;
        var span = r[1][1] - r[1][0];
        var phase = Math.floor(now / 1.6 + k * 0.37);
        var u = (Math.sin(phase * 12.9898 + k * 78.233) * 43758.5453) % 1;
        var v = r[1][0] + Math.abs(u) * span;
        if (Math.abs(v) < r[2]) v = 0;
        d.el.setAttribute('cx', bx(v).toFixed(1));
      });
      setOpacity(curG, seg(t, 3.6, 4.2));
      drawOn(curve, ease(seg(t, 3.8, 5.0)));
      setOpacity(marks, seg(t, 5.0, 5.6));
      setOpacity(rwG, seg(t, 7.4, 7.8));
      groupsEls.forEach(function (g, k) {
        setOpacity(g, k < 1 ? seg(t, 3.6, 4.2) : seg(t, 7.4 + (k - 1) * 0.35, 7.9 + (k - 1) * 0.35));
      });
      setOpacity(fsG, seg(t, 10.8, 11.4));
      setOpacity(armG, seg(t, 13.8, 14.3));
      armBars.forEach(function (b, k) {
        b.el.setAttribute('width', (b.v * 90 * ease(seg(t, 14.0 + k * 0.2, 14.8 + k * 0.2))).toFixed(1));
      });
      setOpacity(armNote, seg(t, 15.4, 16.0));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 5: 仿真闭链、域随机化与 sim-to-real ── */
  function springPath(a, b, n, amp) {
    var dx = b[0] - a[0],
      dy = b[1] - a[1];
    var L = Math.hypot(dx, dy) || 1;
    var ux = dx / L,
      uy = dy / L,
      nx = -uy,
      ny = ux;
    var pts = [a];
    for (var i = 1; i < n; i++) {
      var f = i / n;
      var side = i % 2 ? 1 : -1;
      pts.push([a[0] + dx * f + nx * amp * side, a[1] + dy * f + ny * amp * side]);
    }
    pts.push(b);
    return polyPath(pts.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; }));
  }

  function buildSceneSim() {
    var s = sceneSvg('Isaac Gym 只能模拟开链刚体，Digit 膝盖、小腿、跗骨和脚趾是闭链；作者把连杆换成刚度很高的虚拟弹簧，按偏离原长的量施加力，再用交替子步把长度拉回原长；域随机化包括摩擦、质量、电机强度、阻尼、增益、重力、延迟和噪声，地形有平地、粗糙平地和平滑坡；4 张 A100、8192 个环境、6000 轮；先在 Agility 高保真仿真里筛选，再零样本上真机');
    s.appendChild(svgText(30, 28, '仿真：Isaac Gym 模拟不了闭链，就用「虚拟弹簧」近似', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'rh-x-arrow-s5', C_MUTED);

    // 左：闭链腿
    var legG = group(s);
    rectBox(legG, 30, 42, 250, 214, C_BORDER, C_SURFACE2);
    legG.appendChild(svgText(44, 60, 'Digit 的腿（示意）', 'demo-x-mut', 10.5));
    var HIP = [110, 72],
      KNEE = [150, 130],
      TARS = [118, 194],
      TOE = [160, 226];
    function jointLine(a, b, w, c) {
      var ln = paint(svgEl('line', { 'stroke-width': w, 'stroke-linecap': 'round' }), null, c || C_INK);
      put(ln, a, b);
      legG.appendChild(ln);
      return ln;
    }
    jointLine(HIP, KNEE, 7);
    jointLine(KNEE, TARS, 6);
    jointLine(TARS, TOE, 4.5);
    jointLine([TOE[0] - 10, TOE[1]], [TOE[0] + 22, TOE[1]], 4);
    [HIP, KNEE, TARS].forEach(function (p) {
      legG.appendChild(paint(svgEl('circle', { cx: p[0], cy: p[1], r: 4.5 }), C_SURFACE, C_INK));
    });
    var rodA = [134, 140],
      rodB = [103, 201];
    jointLine(KNEE, rodA, 2.4, C_MUTED);
    jointLine(TARS, rodB, 2.4, C_MUTED);
    var rodReal = jointLine(rodA, rodB, 2.2, C_MUTED);
    rodReal.setAttribute('stroke-dasharray', '4 3');
    var spring = paint(svgEl('path', { d: springPath(rodA, rodB, 10, 5), fill: 'none', 'stroke-width': 2 }), null, C_WARN);
    legG.appendChild(spring);
    var rod2a = [112, 210],
      rod2b = [150, 232];
    var spring2 = paint(svgEl('path', { d: springPath(rod2a, rod2b, 6, 3.5), fill: 'none', 'stroke-width': 1.8 }), null, C_WARN);
    legG.appendChild(spring2);
    legG.appendChild(svgText(170, 112, '膝—小腿—跗骨', 'demo-x-ink2', 10));
    legG.appendChild(svgText(170, 126, '四连杆 + 叶片弹簧', 'demo-x-ink2', 10));
    legG.appendChild(svgText(186, 202, '跗骨—脚趾', 'demo-x-ink2', 10));
    legG.appendChild(svgText(186, 216, '连杆驱动', 'demo-x-ink2', 10));
    var springLbl = group(legG);
    springLbl.appendChild(svgText(44, 250, '黄色：刚度很高的「虚拟弹簧」代替连杆', 'demo-x-warn', 10));

    var fixG = group(s);
    rectBox(fixG, 30, 266, 250, 80, C_WARN);
    fixG.appendChild(svgText(44, 286, '① 按弹簧偏离原长的量算力，加到刚体上', 'demo-x-ink2', 10.5));
    fixG.appendChild(svgText(44, 306, '② 交替子步：很快把长度拉回原长', 'demo-x-ink2', 10.5));
    var errAx = miniAxes(fixG, 120, 314, 140, 22, [0, 6], [0, 1], [], [], null, null);
    var errPts = [];
    for (var e = 0; e <= 6; e++) errPts.push([errAx.sx(e), errAx.sy(Math.pow(0.45, e))]);
    var errLine = pathLine(fixG, errPts, C_WARN, 1.8);
    fixG.appendChild(svgText(44, 334, '长度误差（示意）', 'demo-x-mut', 9.5));

    // 中：域随机化
    var drG = group(s);
    rectBox(drG, 296, 42, 236, 304, C_BORDER, C_SURFACE2);
    drG.appendChild(svgText(310, 60, '域随机化（v1 表 I）', 'demo-x-ink2', 11));
    var DR_SHOW = [
      ['摩擦', '×0.3–2.0'], ['质量', '×0.5–1.5'], ['电机强度', '×0.85–1.15'], ['电机阻尼', '×0.3–4.0 对数均匀'],
      ['$K_p$、$K_d$', '×0.9–1.1'], ['重力', '+0–0.67 m/s²'], ['恢复系数', '0–0.4'], ['观测 / 动作延迟', '按概率晚一步'], ['观测噪声', '关节位置 0.175 rad …']
    ];
    var drRows = DR_SHOW.map(function (r, k) {
      var g = group(drG);
      var y = 82 + k * 21;
      g.appendChild(svgRich(310, y, r[0], { size: 10.5, w: 100, cls: 'demo-x-ink2' }));
      g.appendChild(svgText(518, y + 0.5, r[1], 'demo-x-acc demo-x-mono', 9.5, 'end'));
      return g;
    });
    var terrG = group(drG);
    terrG.appendChild(svgText(310, 282, '地形：平地 · 粗糙平地 · 平滑坡（≤ 10%）', 'demo-x-ink2', 10));
    var tY = 302;
    terrG.appendChild(paint(svgEl('line', { x1: 312, y1: tY + 20, x2: 368, y2: tY + 20, 'stroke-width': 2 }), null, C_MUTED));
    var rough = [];
    for (var q = 0; q <= 14; q++) rough.push([380 + q * 4, tY + 20 - (q % 2 ? 3 : 0) - (q % 3 === 0 ? 2 : 0)]);
    terrG.appendChild(paint(svgEl('path', { d: polyPath(rough), fill: 'none', 'stroke-width': 2 }), null, C_MUTED));
    terrG.appendChild(paint(svgEl('line', { x1: 450, y1: tY + 22, x2: 516, y2: tY + 12, 'stroke-width': 2 }), null, C_MUTED));
    terrG.appendChild(svgText(310, 338, '论文：动力学 + 地形 + 延迟的组合最关键', 'demo-x-mut', 9.5));

    // 右：管线
    var pipeG = group(s);
    var PIPE = [
      ['Isaac Gym 训练', '4 张 A100 · 教师 8192 / 学生 4096 个环境', C_ACCENT],
      ['Agility 高保真仿真', '准确的闭链与传感器噪声 · 只筛选，不改参数', C_WARN],
      ['Digit 真机', '零样本 · 策略 50 Hz · PD 1 kHz', C_GOOD]
    ];
    var pipeBoxes = PIPE.map(function (p, k) {
      var g = group(pipeG);
      var y = 42 + k * 102;
      rectBox(g, 548, y, 222, 78, p[2]);
      g.appendChild(svgText(560, y + 24, p[0], null, 12));
      g.appendChild(svgText(560, y + 46, p[1].split(' · ')[0], 'demo-x-ink2', 10));
      g.appendChild(svgText(560, y + 64, p[1].split(' · ').slice(1).join(' · '), 'demo-x-ink2', 10));
      if (k < PIPE.length - 1) arrowPath(g, [[659, y + 80], [659, y + 100]], C_MUTED, mk);
      return g;
    });

    var fin = group(s);
    chip(fin, 30, 358, 740, '教师每轮 $8192 \\times 24 \\approx 19.7$ 万步，6000 轮约 **11.8 亿**步（我们算的）；项目页说一天能采到百亿量级', C_ACCENT, { h: 36, size: 11.5 });

    function draw(t) {
      setOpacity(legG, seg(t, 0.3, 0.9));
      var sp = seg(t, 3.6, 4.4);
      setOpacity(spring, sp);
      setOpacity(spring2, sp);
      setOpacity(springLbl, sp);
      setOpacity(rodReal, 1 - 0.7 * sp);
      setOpacity(fixG, seg(t, 4.6, 5.2));
      drawOn(errLine, ease(seg(t, 5.4, 6.8)));
      setOpacity(drG, seg(t, 7.4, 7.8));
      drRows.forEach(function (g, k) {
        setOpacity(g, seg(t, 7.5 + k * 0.22, 7.9 + k * 0.22));
      });
      setOpacity(terrG, seg(t, 9.8, 10.4));
      pipeBoxes.forEach(function (g, k) {
        setOpacity(g, k === 0 ? seg(t, 10.8, 11.4) : seg(t, 13.8 + (k - 1) * 0.9, 14.4 + (k - 1) * 0.9));
      });
      setOpacity(fin, seg(t, 12.0, 12.6));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 6: 户外与实验室（图 1–2） ── */
  function buildSceneRobust() {
    var s = sceneSvg('户外的广场、人行道、跑道、草地和清晨潮湿的路面，测了一周没有摔倒；实验室里扔瑜伽球、木棍推、从后面拉；地面铺橡胶、布、电缆、气泡膜，坡度最高 8.7%；背包、手提袋、垃圾袋、纸袋五种负载；在 Agility 仿真里和厂家控制器比，坡都是百分之百，台阶 100 对约 97，不稳木板 100 对约 71');
    s.appendChild(svgText(30, 28, '真机：户外一周没摔过，实验室里推、拉、砸、背东西', 'demo-x-ink2', 13.5));

    var OUT = [['plaza', '广场'], ['walk', '人行道'], ['track', '跑道'], ['grass', '草地'], ['wet', '清晨潮湿']];
    var outTiles = OUT.map(function (o, i) {
      var g = group(s);
      groundTile(g, o[0], 30 + i * 100, 42, 92, 54, 3 + i);
      g.appendChild(svgText(76 + i * 100, 112, o[1], 'demo-x-ink2', 10.5, 'middle'));
      return g;
    });
    var outNote = group(s);
    rectBox(outNote, 530, 42, 240, 82, C_GOOD);
    outNote.appendChild(svgText(544, 64, '一周全天测试：没有一次摔倒', 'demo-x-good', 12));
    outNote.appendChild(svgText(544, 86, '不用安全吊架 · 训练里没见过这些地面', 'demo-x-ink2', 10));
    outNote.appendChild(svgText(544, 106, '盲走会撞上台阶、被绊住，但能自己调整', 'demo-x-ink2', 10));

    function panel(x, w, title, color, lines) {
      var g = group(s);
      rectBox(g, x, 134, w, 112, color, C_SURFACE);
      g.appendChild(svgText(x + 12, 154, title, null, 12));
      lines.forEach(function (str, k) {
        g.appendChild(svgRich(x + 12, 176 + k * 19, str, { size: 10.5, w: w - 20, cls: 'demo-x-ink2' }));
      });
      return g;
    }
    var pForce = panel(30, 236, '突然的外力（图 2A）', C_BORDER, ['扔一个大瑜伽球', '用木棍推', '往前走时从后面拉', '人形很不稳，要零点几秒内反应']);
    var pTerr = panel(276, 246, '不同地面（图 2B）', C_BORDER, ['命令 0.15 m/s 往前走', '橡胶 · 布 · 电缆 · 气泡膜', '坡：最高 **8.7%**（训练最多 10%）', '陡坡上 0.2 m/s 反而更稳']);
    var tiles2 = group(pTerr);
    [['rubber', 0], ['cloth', 1], ['cable', 2], ['bubble', 3]].forEach(function (k) {
      groundTile(tiles2, k[0], 434 + (k[1] % 2) * 42, 140 + Math.floor(k[1] / 2) * 30, 38, 26, 9 + k[1]);
    });
    var pLoad = panel(532, 238, '负载（图 2C）', C_BORDER, ['空背包 · 装满的背包', '布手提袋 · 纸袋', '装满的垃圾袋挂在**手臂**上', '五种全部走完']);

    // 图 2D
    var dG = group(s);
    rectBox(dG, 30, 256, 740, 136, C_BORDER, C_SURFACE2);
    dG.appendChild(svgText(44, 276, '图 2D：Agility 高保真仿真里和厂家控制器比，每种 10 次（读图）', 'demo-x-ink2', 11));
    var bars = [];
    FIG2D_NAMES.forEach(function (n, k) {
      var cx = 120 + k * 150;
      [[FIG2D_OURS[k], C_ACCENT], [FIG2D_NATIVE[k], C_MUTED]].forEach(function (b, m) {
        var r = vbar(dG, cx + m * 34 - 30, 370, 28, b[1]);
        var lbl = svgText(cx + m * 34 - 16, 370, String(b[0]), m ? 'demo-x-mut demo-x-mono' : 'demo-x-acc demo-x-mono', 10, 'middle');
        dG.appendChild(lbl);
        bars.push({ el: r, v: b[0], lbl: lbl });
      });
      dG.appendChild(svgText(cx + 3, 386, n, 'demo-x-ink2', 10.5, 'middle'));
    });
    dG.appendChild(svgText(560, 296, '蓝：本文  灰：厂家控制器', 'demo-x-mut', 9.5));
    var dNote = group(dG);
    dNote.appendChild(svgText(560, 318, '厂家控制器：脚被台阶绊住', 'demo-x-bad', 10.5));
    dNote.appendChild(svgText(560, 334, '会自动关机', 'demo-x-bad', 10.5));
    dNote.appendChild(svgText(560, 356, '本文没在台阶上训练过', 'demo-x-ink2', 10));
    dNote.appendChild(svgText(560, 372, '恢复是自发的；木板没上真机', 'demo-x-ink2', 10));

    function draw(t) {
      outTiles.forEach(function (g, i) {
        setOpacity(g, seg(t, 0.3 + i * 0.3, 0.7 + i * 0.3));
      });
      setOpacity(outNote, seg(t, 3.6, 4.2));
      setOpacity(pForce, seg(t, 7.0, 7.6));
      setOpacity(pTerr, seg(t, 10.4, 11.0));
      setOpacity(pLoad, seg(t, 11.6, 12.2));
      setOpacity(dG, seg(t, 13.4, 13.8));
      bars.forEach(function (b, k) {
        var h = (b.v / 100) * 70 * ease(seg(t, 13.6 + Math.floor(k / 2) * 0.3, 14.6 + Math.floor(k / 2) * 0.3));
        setH(b.el, h);
        b.lbl.setAttribute('y', (370 - h - 4).toFixed(1));
      });
      setOpacity(dNote, seg(t, 15.0, 15.6));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 7: 自然行走（图 3–4） ── */
  function buildSceneNatural() {
    var s = sceneSvg('命令是前后、横向线速度和转向角速度，训练时每 10 秒随机抽，部署时用摇杆连续改变也跟得上；阶跃到 1 米每秒，1 秒内追上；摆臂和对侧腿同步，奖励里没有约束摆臂也没有参考轨迹；生物力学里的几种假说；奖励里有力矩项，论文推测摆臂也省能；垃圾袋挂在手臂上照样走完');
    s.appendChild(svgText(30, 28, '自然行走：全向、快走，还有没人教过的摆臂', 'demo-x-ink2', 13.5));

    // 左：全向命令
    var omniG = group(s);
    rectBox(omniG, 30, 42, 220, 200, C_BORDER, C_SURFACE2);
    omniG.appendChild(svgText(44, 60, '全向（图 3）：俯视', 'demo-x-ink2', 11));
    var mk = K.arrowMarker(s, 'rh-x-arrow-s7', C_ACCENT);
    var OC = [140, 138];
    omniG.appendChild(paint(svgEl('circle', { cx: OC[0], cy: OC[1], r: 14 }), C_SURFACE, C_INK));
    var arrows = [
      [[OC[0], OC[1] - 18], [OC[0], OC[1] - 58], '前进'],
      [[OC[0], OC[1] + 18], [OC[0], OC[1] + 50], '后退'],
      [[OC[0] + 18, OC[1]], [OC[0] + 60, OC[1]], '横移']
    ].map(function (a) {
      var g = group(omniG);
      arrowPath(g, [a[0], a[1]], C_ACCENT, mk, null, 2);
      g.appendChild(svgText(a[1][0] + (a[2] === '横移' ? 4 : 6), a[1][1] + (a[2] === '后退' ? 12 : a[2] === '横移' ? 4 : -2), a[2], 'demo-x-acc', 10));
      return g;
    });
    var turn = paint(svgEl('path', { d: 'M ' + (OC[0] - 30) + ' ' + (OC[1] - 20) + ' A 36 36 0 0 0 ' + (OC[0] - 30) + ' ' + (OC[1] + 20), fill: 'none', 'stroke-width': 2, 'marker-end': mk }), null, C_ACCENT);
    omniG.appendChild(turn);
    var turnLbl = svgText(OC[0] - 92, OC[1] + 4, '转向', 'demo-x-acc', 10);
    omniG.appendChild(turnLbl);
    var joy = group(omniG);
    joy.appendChild(svgText(44, 230, '训练：每 10 s 随机抽 · 部署：摇杆连续变', 'demo-x-mut', 9.5));

    // 中：快走阶跃响应（示意）
    var fastG = group(s);
    rectBox(fastG, 260, 42, 250, 200, C_BORDER, C_SURFACE2);
    fastG.appendChild(svgText(274, 60, '快走（图 4B）：阶跃到 1 m/s', 'demo-x-ink2', 11));
    var fa = miniAxes(fastG, 300, 76, 196, 130, [0, 4], [0, 1.4], [0, 1, 2, 3, 4], [0, 0.5, 1], function (v) { return v + 's'; }, function (v) { return fmt(v, 1); });
    fastG.appendChild(paint(svgEl('line', { x1: fa.sx(0), y1: fa.sy(1), x2: fa.sx(4), y2: fa.sy(1), 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }), null, C_WARN));
    var vpts = [];
    for (var i = 0; i <= 80; i++) {
      var tt = i / 20;
      var v = tt < 0.3 ? 0 : tt < 1.2 ? (tt - 0.3) / 0.9 : 1 + 0.12 * Math.sin((tt - 1.2) * 5.2) * Math.exp(-(tt - 1.2) * 0.25);
      vpts.push([fa.sx(tt), fa.sy(Math.max(0, v))]);
    }
    var vLine = pathLine(fastG, vpts, C_ACCENT, 2.2);
    fastG.appendChild(svgText(274, 232, '1 s 内从静止追上 1 m/s（曲线按图 4B 走势画）', 'demo-x-mut', 9.5));

    // 右：摆臂
    var armG = group(s);
    rectBox(armG, 520, 42, 250, 200, C_BORDER, C_SURFACE2);
    armG.appendChild(svgText(534, 60, '对侧摆臂（图 4A）', 'demo-x-ink2', 11));
    armG.appendChild(paint(svgEl('line', { x1: 530, y1: 226, x2: 760, y2: 226, 'stroke-width': 1.4 }), null, C_MUTED));
    var digit = digitFigure(armG, 0.88, C_INK);
    var traceAx = miniAxes(armG, 690, 80, 66, 60, [0, 1], [-1, 1], [], [], null, null);
    var trR = pathLine(armG, [], C_ACCENT, 1.8);
    var trL = pathLine(armG, [], C_WARN, 1.8);
    armG.appendChild(svgText(690, 154, '右肩', 'demo-x-acc', 9.5));
    armG.appendChild(svgText(724, 154, '左膝', 'demo-x-warn', 9.5));
    var armLbl = svgText(534, 78, '左腿抬起，右臂往前摆', 'demo-x-good', 10);
    armG.appendChild(armLbl);

    var whyG = group(s);
    chip(whyG, 30, 256, 740, '奖励里**没有**约束摆臂，也没有参考轨迹 —— 摆臂是练出来的', C_GOOD, { h: 32, size: 11.5 });
    var hypG = group(s);
    [['动态稳定', 30], ['减少代谢能耗', 280], ['四足祖先留下的协调', 530]].forEach(function (h) {
      chip(hypG, h[1], 300, 240, '人的假说：' + h[0], C_BORDER, { h: 28, size: 10.5 });
    });
    hypG.appendChild(svgText(36, 346, '奖励里有力矩（能耗）项 → 论文推测：涌现的摆臂可能也省能', 'demo-x-ink2', 10.5));
    var bagG = group(s);
    chip(bagG, 30, 360, 740, '装满的垃圾袋挂在手臂上，手臂摆不起来，照样走完 → 论文据此说它能按上下文调整行为', C_ACCENT, { h: 34, size: 11 });

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      setOpacity(omniG, seg(t, 0.3, 0.9));
      arrows.forEach(function (g, k) {
        setOpacity(g, seg(t, 0.6 + k * 0.5, 1.0 + k * 0.5));
      });
      setOpacity(turn, seg(t, 2.1, 2.5));
      setOpacity(turnLbl, seg(t, 2.1, 2.5));
      setOpacity(joy, seg(t, 2.6, 3.2));
      setOpacity(fastG, seg(t, 3.8, 4.4));
      drawOn(vLine, ease(seg(t, 4.2, 6.6)));
      setOpacity(armG, seg(t, 7.4, 8.0));
      var ph = 2 * Math.PI * 1.2 * now;
      digit.pose(612, 226, ph, { stride: 0.14, lift: 0.1, swing: 26 });
      var rp = [],
        lp = [];
      for (var k = 0; k <= 40; k++) {
        var u = k / 40;
        var p = ph - (1 - u) * 2 * Math.PI * 1.6;
        rp.push([traceAx.sx(u), traceAx.sy(0.5 + 0.45 * Math.cos(p))]);
        lp.push([traceAx.sx(u), traceAx.sy(-0.5 + 0.4 * Math.cos(p))]);
      }
      trR.setAttribute('d', polyPath(rp.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })));
      trL.setAttribute('d', polyPath(lp.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })));
      setOpacity(armLbl, seg(t, 8.4, 9.0));
      setOpacity(whyG, seg(t, 8.8, 9.4));
      setOpacity(hypG, seg(t, 10.8, 11.4));
      setOpacity(bagG, seg(t, 13.8, 14.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 8: 下坡换步态（图 5） ── */
  function buildSceneGait() {
    var s = sceneSvg('命令一直是往前走，地面是平地、下坡、平地；平地上正常走，下坡换成小碎步、脚抬得低，回到平地又恢复；最后一层 192 维隐状态里，82 号、89 号神经元随步态振荡，平地幅度大坡上小；108 号、132 号神经元平地高坡上低；用 PCA 和 t-SNE 投到二维，平地和坡分成两簇');
    s.appendChild(svgText(30, 28, '慢变化：下坡时自己换成小碎步，神经元按地形分成两簇', 'demo-x-ink2', 13.5));

    // 上：赛道
    var CX0 = 50,
      CX1 = 750,
      FLAT1 = 260,
      SLOPE_END = 520,
      GY0 = 128,
      DROP = 46;
    // 第 1–12 s 匀速从 CX0 + 30 走到 CX1 − 30：tAtX 是走到横坐标 x 的时刻
    function tAtX(x) {
      return 1.0 + (11.0 * (x - CX0 - 30)) / (CX1 - CX0 - 60);
    }
    function rampUp(x, a, c) {
      return clamp((x - a) / (c - a), 0, 1);
    }
    // rampUp(·, a, c) 从 0 积到 x 的面积（a 之前是 0，a→c 线性升到 1，之后恒为 1）
    function rampArea(x, a, c) {
      if (x <= a) return 0;
      if (x < c) return ((x - a) * (x - a)) / (2 * (c - a));
      return (c - a) / 2 + (x - c);
    }
    function groundY(x) {
      if (x < FLAT1) return GY0;
      if (x < SLOPE_END) return GY0 + ((x - FLAT1) / (SLOPE_END - FLAT1)) * DROP;
      return GY0 + DROP;
    }
    var course = group(s);
    var gpts = [[CX0, GY0], [FLAT1, GY0], [SLOPE_END, GY0 + DROP], [CX1, GY0 + DROP]];
    course.appendChild(paint(svgEl('path', { d: polyPath(gpts) + ' L ' + CX1 + ' ' + (GY0 + DROP + 14) + ' L ' + CX0 + ' ' + (GY0 + DROP + 14) + ' Z', 'stroke-width': 1.4 }), C_SURFACE2, C_MUTED));
    course.appendChild(svgText(150, GY0 + 11, '平地', 'demo-x-acc', 10.5, 'middle'));
    course.appendChild(svgText(390, GY0 + 34, '下坡', 'demo-x-warn', 10.5, 'middle'));
    course.appendChild(svgText(635, GY0 + DROP + 11, '平地', 'demo-x-acc', 10.5, 'middle'));
    var digit = digitFigure(course, 0.68, C_INK);
    var gaitLbl = svgText(0, 0, '', 'demo-x-ink2', 10.5, 'middle');
    course.appendChild(gaitLbl);

    // 下左：神经元
    var nG = group(s);
    rectBox(nG, 30, 222, 480, 170, C_BORDER, C_SURFACE2);
    nG.appendChild(svgText(44, 240, '最后一层隐状态里的单个神经元（按图 5B–C 的走势画，示意）', 'demo-x-ink2', 10.5));
    var nx0 = 120,
      nw = 370;
    function tx(u) {
      return nx0 + u * nw;
    }
    var band = group(nG);
    band.appendChild(paint(svgEl('rect', { x: tx(0.25), y: 248, width: tx(0.7) - tx(0.25), height: 136, opacity: 0.12 }), C_WARN));
    band.appendChild(svgText(tx(0.475), 380, '下坡那一段', 'demo-x-warn', 9.5, 'middle'));
    function neuron(y, osc, label, cls) {
      var pts = [];
      for (var i = 0; i <= 200; i++) {
        var u = i / 200;
        var onSlope = u > 0.25 && u < 0.7;
        var v = osc ? (onSlope ? 0.32 : 1) * Math.sin(u * 2 * Math.PI * 18) : onSlope ? -0.75 + 0.15 * Math.sin(u * 90) : 0.55 + 0.25 * Math.sin(u * 2 * Math.PI * 18);
        pts.push([tx(u), y - v * 18]);
      }
      nG.appendChild(svgText(44, y + 4, label, cls, 10));
      return pathLine(nG, pts, osc ? C_ACCENT : C_GOOD, 1.4);
    }
    var n1 = neuron(278, true, '82 / 89 号', 'demo-x-acc');
    var n1Note = svgText(44, 292, '跟着步态', 'demo-x-mut', 9);
    nG.appendChild(n1Note);
    var n2 = neuron(338, false, '108 / 132 号', 'demo-x-good');
    var n2Note = svgText(44, 352, '跟着地形', 'demo-x-mut', 9);
    nG.appendChild(n2Note);

    // 下右：二维投影
    var pG = group(s);
    rectBox(pG, 520, 222, 250, 170, C_BORDER, C_SURFACE2);
    pG.appendChild(svgText(534, 240, '192 维 → 二维（PCA / t-SNE）', 'demo-x-ink2', 10.5));
    var rng = mulberry32(17);
    var flatDots = [],
      slopeDots = [];
    for (var i = 0; i < 70; i++) {
      var a = rng() * 2 * Math.PI;
      var c1 = paint(svgEl('circle', { cx: 640 + Math.cos(a) * (48 + rng() * 10), cy: 286 + Math.sin(a) * (18 + rng() * 6), r: 2.6, opacity: 0.8 }), C_ACCENT);
      pG.appendChild(c1);
      flatDots.push(c1);
      var c2 = paint(svgEl('circle', { cx: 640 + (rng() - 0.5) * 90, cy: 350 + (rng() - 0.5) * 34, r: 2.6, opacity: 0.8 }), C_WARN);
      pG.appendChild(c2);
      slopeDots.push(c2);
    }
    pG.appendChild(svgText(736, 268, '平地', 'demo-x-acc', 10, 'end'));
    pG.appendChild(svgText(736, 384, '坡', 'demo-x-warn', 10, 'end'));
    pG.appendChild(svgText(534, 384, '地形标签只用来上色', 'demo-x-mut', 9));

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      setOpacity(course, seg(t, 0.3, 0.9));
      var u = seg(t, 1.0, 12.0);
      var cx = CX0 + 30 + u * (CX1 - CX0 - 60);
      /* 步态在坡的两端各用 24 px 渐变过去（b：0 = 平地步态，1 = 坡上碎步），步频 1.1 → 1.7 Hz 也跟着渐变。
         相位是步频对时间的积分：直接写「步频 × now」的话，一换步频相位就跳 0.6 Hz × now ≈ 0.4 圈，腿会闪一下 */
      var b = rampUp(cx, FLAT1 - 18, FLAT1 + 6) - rampUp(cx, SLOPE_END - 6, SLOPE_END + 18);
      var onSlope = b > 0.5;
      var gy = groundY(cx);
      var ph = 2 * Math.PI * (1.1 * now + 0.6 * (rampArea(now, tAtX(FLAT1 - 18), tAtX(FLAT1 + 6)) - rampArea(now, tAtX(SLOPE_END - 6), tAtX(SLOPE_END + 18))));
      digit.pose(cx, gy, ph, { stride: 0.15 - 0.09 * b, lift: 0.11 - 0.075 * b, swing: 18 - 8 * b, lean: 5 - 3 * b });
      gaitLbl.textContent = onSlope ? '小碎步、脚抬得低' : '正常步幅';
      gaitLbl.setAttribute('x', cx.toFixed(1));
      gaitLbl.setAttribute('y', (gy - 108).toFixed(1));
      gaitLbl.setAttribute('class', onSlope ? 'demo-x-warn' : 'demo-x-ink2');
      setOpacity(gaitLbl, seg(t, 3.6, 4.0));
      setOpacity(nG, seg(t, 7.0, 7.4));
      setOpacity(band, seg(t, 7.0, 7.4));
      drawOn(n1, ease(seg(t, 7.2, 9.4)));
      setOpacity(n1Note, seg(t, 8.0, 8.4));
      drawOn(n2, ease(seg(t, 10.4, 12.4)));
      setOpacity(n2Note, seg(t, 11.0, 11.4));
      setOpacity(pG, seg(t, 13.4, 13.8));
      var sep = ease(seg(t, 13.6, 15.4));
      flatDots.forEach(function (d) {
        d.style.opacity = 0.8 * sep;
      });
      slopeDots.forEach(function (d) {
        d.style.opacity = 0.8 * sep;
      });
    }

    return { el: s, draw: draw };
  }

  /* ── scene 9: 脚被绊住（图 6） ── */
  function buildSceneTrap() {
    var s = sceneSvg('训练里没有台阶，也没有任何离散障碍；腿撞上台阶后，下一次抬得更高、更快，翻了上去；隐状态热图在被绊住的那一段明显变样；平均响应在约 6 秒处跌到约负 0.35；上下文只有 16 步即 0.32 秒，是上一篇四足 TCN-100 两秒的六分之一左右');
    s.appendChild(svgText(30, 28, '快变化：脚被台阶绊住，下一次就抬得更高、更快', 'demo-x-ink2', 13.5));

    // 左：台阶与两次尝试
    var stepG = group(s);
    rectBox(stepG, 30, 42, 330, 220, C_BORDER, C_SURFACE2);
    var GY = 230,
      SX = 230,
      SH = 34;
    stepG.appendChild(paint(svgEl('path', { d: 'M 40 ' + GY + ' L ' + SX + ' ' + GY + ' L ' + SX + ' ' + (GY - SH) + ' L 350 ' + (GY - SH) + ' L 350 252 L 40 252 Z', 'stroke-width': 1.4 }), C_SURFACE, C_MUTED));
    stepG.appendChild(svgText(44, 60, '训练里没有台阶，也没有任何离散障碍', 'demo-x-mut', 10.5));
    var digit = digitFigure(stepG, 1.0, C_INK);
    var try1 = pathLine(stepG, [[150, GY], [176, GY - 22], [204, GY - 26], [SX - 2, GY - 18]], C_BAD, 2, '5 4');
    var hit = group(stepG);
    hit.appendChild(paint(svgEl('circle', { cx: SX - 2, cy: GY - 18, r: 8, fill: 'none', 'stroke-width': 2 }), null, C_BAD));
    hit.appendChild(svgText(SX + 8, GY - 10, '第 1 次：撞上', 'demo-x-bad', 10.5));
    var try2 = pathLine(stepG, [[150, GY], [180, GY - 62], [226, GY - 76], [262, GY - SH]], C_GOOD, 2.4);
    var try2Lbl = svgText(250, GY - 82, '第 2 次：更高、更快', 'demo-x-good', 10.5, 'middle');
    stepG.appendChild(try2Lbl);

    // 右：热图
    var hmG = group(s);
    rectBox(hmG, 372, 42, 398, 148, C_BORDER, C_SURFACE2);
    hmG.appendChild(svgText(386, 60, '最后一层隐状态（每列 192 维，示意）', 'demo-x-ink2', 10.5));
    var rng = mulberry32(23);
    var HX = 400,
      HW = 356,
      HY = 70,
      HH = 100,
      COLS = 48,
      ROWS = 16;
    var hmCells = [];
    for (var c = 0; c < COLS; c++) {
      for (var r = 0; r < ROWS; r++) {
        var inEvt = c >= 20 && c < 28;
        var v = inEvt ? 0.15 + 0.35 * rng() : 0.35 + 0.6 * rng() * (0.6 + 0.4 * Math.sin((c + r * 3) * 0.9));
        var rc = paint(svgEl('rect', { x: HX + (c * HW) / COLS, y: HY + (r * HH) / ROWS, width: HW / COLS + 0.4, height: HH / ROWS + 0.4 }), C_INK);
        rc.style.opacity = 0;
        rc.baseV = clamp(v, 0.05, 1);
        hmG.appendChild(rc);
        hmCells.push(rc);
      }
    }
    var evtBox = paint(svgEl('rect', { x: HX + (20 * HW) / COLS, y: HY - 2, width: (8 * HW) / COLS, height: HH + 4, fill: 'none', 'stroke-width': 2 }), null, C_ACCENT);
    hmG.appendChild(evtBox);
    hmG.appendChild(svgText(HX, HY + HH + 14, '0 s', 'demo-x-mut demo-x-mono', 9.5));
    hmG.appendChild(svgText(HX + HW, HY + HH + 14, '15 s', 'demo-x-mut demo-x-mono', 9.5, 'end'));
    var evtLbl = svgText(HX + (24 * HW) / COLS, HY + HH + 14, '被绊住', 'demo-x-acc', 10, 'middle');
    hmG.appendChild(evtLbl);

    // 右下：平均响应
    var mG = group(s);
    rectBox(mG, 372, 200, 398, 110, C_BORDER, C_SURFACE2);
    mG.appendChild(svgText(386, 218, '平均响应（图 6C，读图）', 'demo-x-ink2', 10.5));
    var ma = miniAxes(mG, 420, 228, 330, 64, [0, 10], [-0.5, 0.5], [0, 2, 4, 6, 8, 10], [-0.3, 0, 0.3], function (v) { return v + 's'; }, function (v) { return fmt(v, 1); });
    var mpts = [];
    var rr = mulberry32(31);
    for (var i = 0; i <= 120; i++) {
      var tt = i / 12;
      var base = 0.18 + 0.08 * Math.sin(tt * 4.1) + (rr() - 0.5) * 0.12;
      var dip = -0.55 * Math.exp(-Math.pow((tt - 6.2) / 0.45, 2));
      mpts.push([ma.sx(tt), ma.sy(clamp(base + dip, -0.45, 0.45))]);
    }
    var mLine = pathLine(mG, mpts, C_ACCENT, 1.6);
    var dipLbl = svgText(ma.sx(6.2) + 8, ma.sy(-0.33) + 4, '约 −0.35', 'demo-x-bad demo-x-mono', 10);
    mG.appendChild(dipLbl);

    var ctxG = group(s);
    rectBox(ctxG, 30, 322, 740, 70, C_ACCENT);
    ctxG.appendChild(svgText(44, 342, '它只看最近 16 步（0.32 s）—— 上一篇四足的学生看 100 步（2 s）', 'demo-x-ink2', 11));
    var barA = paint(svgEl('rect', { x: 44, y: 352, width: 0, height: 12, rx: 3 }), C_ACCENT);
    var barB = paint(svgEl('rect', { x: 44, y: 370, width: 0, height: 12, rx: 3 }), C_MUTED);
    ctxG.appendChild(barA);
    ctxG.appendChild(barB);
    var barALbl = svgText(0, 362, '本文 16 步', 'demo-x-acc', 10);
    var barBLbl = svgText(0, 380, '四足 TCN-100：100 步', 'demo-x-mut', 10);
    ctxG.appendChild(barALbl);
    ctxG.appendChild(barBLbl);

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      setOpacity(stepG, seg(t, 0.3, 0.9));
      digit.pose(120, GY, 2 * Math.PI * 0.9 * now, { stride: 0.12, lift: 0.08, swing: 14 });
      drawOn(try1, ease(seg(t, 3.6, 4.6)));
      setOpacity(hit, seg(t, 4.6, 5.0));
      drawOn(try2, ease(seg(t, 5.4, 6.6)));
      setOpacity(try2Lbl, seg(t, 6.4, 6.9));
      setOpacity(hmG, seg(t, 7.0, 7.4));
      var hu = seg(t, 7.0, 9.0);
      hmCells.forEach(function (rc, k) {
        var col = Math.floor(k / ROWS);
        rc.style.opacity = col / COLS < hu ? rc.baseV * 0.85 : 0;
      });
      setOpacity(evtBox, seg(t, 9.0, 9.4));
      setOpacity(evtLbl, seg(t, 9.0, 9.4));
      setOpacity(mG, seg(t, 10.4, 10.8));
      drawOn(mLine, ease(seg(t, 10.6, 12.6)));
      setOpacity(dipLbl, seg(t, 12.0, 12.4));
      setOpacity(ctxG, seg(t, 13.4, 13.8));
      var full = 560;
      var wa = full * (CTX / QT_STEPS) * ease(seg(t, 13.6, 14.6)),
        wb = full * ease(seg(t, 14.2, 15.6));
      barA.setAttribute('width', wa.toFixed(1));
      barB.setAttribute('width', wb.toFixed(1));
      barALbl.setAttribute('x', (52 + wa).toFixed(1));
      barBLbl.setAttribute('x', (52 + wb).toFixed(1));
      setOpacity(barALbl, seg(t, 14.4, 14.8));
      setOpacity(barBLbl, seg(t, 15.4, 15.8));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 10: 消融、局限与之后（图 8A–B） ── */
  function buildSceneAblation() {
    var s = sceneSvg('图 8A 只换学生网络：Transformer 约 97%，LSTM 约 89%，TCN 约 86%，MLP 约 75%；图 8B 上下文 16 步在 25 度坡上 0.75 米每秒，8 步 0.71，1 步 0.62；局限：左右不完全对称，速度跟踪不完美，很强的拉拽会摔倒，Isaac Gym 的闭链只是近似；之后同组把它推到下一个 token 预测');
    s.appendChild(svgText(30, 28, '消融：Transformer 最好，上下文越长越好；以及它还做不到的', 'demo-x-ink2', 13.5));

    var aG = group(s);
    rectBox(aG, 30, 42, 360, 196, C_BORDER, C_SURFACE2);
    aG.appendChild(svgText(44, 60, '图 8A：只换学生网络，3 个场景共 30 次（读图）', 'demo-x-ink2', 10.5));
    var aBars = FIG8A.map(function (r, k) {
      var x = 70 + k * 78;
      var b = vbar(aG, x, 206, 46, k === 0 ? C_ACCENT : C_MUTED, k === 0 ? 0.95 : 0.6);
      aG.appendChild(svgText(x + 23, 224, r[0], k === 0 ? 'demo-x-acc' : 'demo-x-ink2', 10.5, 'middle'));
      var lbl = svgText(x + 23, 206, r[1] + '%', k === 0 ? 'demo-x-acc demo-x-mono' : 'demo-x-mut demo-x-mono', 10.5, 'middle');
      aG.appendChild(lbl);
      return { el: b, v: r[1], lbl: lbl };
    });

    var bG = group(s);
    rectBox(bG, 410, 42, 360, 196, C_BORDER, C_SURFACE2);
    bG.appendChild(svgText(424, 60, '图 8B：上下文长度（命令 1 m/s 爬坡，读图）', 'demo-x-ink2', 10.5));
    var bx = miniAxes(bG, 456, 76, 270, 124, [0, 25], [0.55, 1.05], SLOPES, [0.6, 0.8, 1.0], function (v) { return v + '°'; }, function (v) { return fmt(v, 1); });
    var bcols = [C_WARN, C_MUTED, C_ACCENT];
    var bCurves = FIG8B.map(function (r, k) {
      return pathLine(bG, SLOPES.map(function (sl, m) { return [bx.sx(sl), bx.sy(r[1][m])]; }), bcols[k], k === 2 ? 2.6 : 1.8);
    });
    var bLabs = group(bG);
    bLabs.appendChild(svgText(bx.sx(25) + 4, bx.sy(0.75) - 4, '16 步 0.75', 'demo-x-acc', 9.5));
    bLabs.appendChild(svgText(bx.sx(25) + 4, bx.sy(0.71) + 8, '8 步 0.71', 'demo-x-mut', 9.5));
    bLabs.appendChild(svgText(bx.sx(25) + 4, bx.sy(0.62) + 4, '1 步 0.62', 'demo-x-warn', 9.5));

    var limG = group(s);
    rectBox(limG, 30, 250, 360, 142, C_BAD, C_SURFACE, '4 3');
    limG.appendChild(svgText(44, 270, '论文写的局限', 'demo-x-bad', 12));
    ['左右不完全对称：往左横移比往右好', '速度跟踪不完美', '很强的拉拽（拽着电缆）会摔倒', 'Isaac Gym 的闭链只是近似'].forEach(function (str, k) {
      limG.appendChild(svgText(44, 294 + k * 22, '· ' + str, 'demo-x-ink2', 10.5));
    });

    var nextG = group(s);
    rectBox(nextG, 410, 250, 360, 142, C_GOOD);
    nextG.appendChild(svgText(424, 270, '它打开的方向', 'demo-x-good', 12));
    ['Transformer 更容易随数据和算力扩展', '更方便接入视觉、语言等更多输入', '2024：同组把行走写成「下一个 token 预测」，', '用多种来源的离线数据训练'].forEach(function (str, k) {
      nextG.appendChild(svgText(424, 294 + k * 22, (k < 3 ? '· ' : '  ') + str, 'demo-x-ink2', 10.5));
    });

    function draw(t) {
      setOpacity(aG, seg(t, 0.3, 0.7));
      aBars.forEach(function (b, k) {
        var h = ((b.v - 0) / 100) * 130 * ease(seg(t, 0.6 + k * 0.4, 1.6 + k * 0.4));
        setH(b.el, h);
        b.lbl.setAttribute('y', (206 - h - 5).toFixed(1));
      });
      setOpacity(bG, seg(t, 3.6, 4.0));
      bCurves.forEach(function (p, k) {
        drawOn(p, ease(seg(t, 3.8 + k * 0.6, 5.0 + k * 0.6)));
      });
      setOpacity(bLabs, seg(t, 5.8, 6.4));
      setOpacity(limG, seg(t, 7.0, 7.6));
      setOpacity(nextG, seg(t, 10.4, 11.0));
    }

    return { el: s, draw: draw };
  }

  var RH_SCENES = [
    {
      title: '全尺寸人形为什么难',
      dur: 17,
      build: buildSceneProblem,
      cues: [
        { at: 0.3, s: '经典控制（模型预测控制、轨迹优化、手写状态机）做出了 Atlas 后空翻、跳障碍、跳舞，但换一个环境就难泛化。学习方法已在灵巧操作、四足和双足（Cassie）上见效；全尺寸人形以前要和模型控制器结合，还没有纯学习的。' },
        { at: 3.6, s: '机器人是 Agility Robotics 的 **Digit**：约 1.6 m、45 kg，浮动基座模型 30 个自由度；每条手臂 4 个驱动关节，每条腿 8 个关节、其中 6 个驱动。小腿和跗骨是被动关节，靠**叶片弹簧 + 四连杆**连着，脚趾靠连杆驱动 —— 闭运动链、欠驱动。' },
        { at: 7.4, s: '它是**盲走**：没有相机，只有关节编码器和 IMU（通过 Agility 提供的接口读取）。看不见台阶，摩擦、负载、坡度都只能从身体的感觉里推断。' },
        { at: 10.6, s: '论文的假设：**观测—动作历史**里隐含了关于世界的信息，足够强的 Transformer 能据此**在上下文里**调整行为、不更新权重 —— 像 GPT-3 的上下文学习。比如比较「想到达的状态」与「实际到达的状态」，就知道该怎么改动作。' },
        { at: 13.6, s: '结果：一个纯学习的控制器，只在仿真里训练，**零样本**部署到全尺寸 Digit；户外整整测了一周全天，没有观察到一次摔倒。' }
      ]
    },
    {
      title: '控制器：因果 Transformer',
      dur: 17,
      build: buildSceneModel,
      cues: [
        { at: 0.3, s: '每个控制步把这一刻的观测 $o_t$ 和上一步的动作 $a_{t-1}$ 拼成一对，用 MLP（隐层 512、512）压成一个 **192 维** token，再加正弦位置编码。' },
        { at: 3.8, s: '窗口长度 $l = 16$：$o_t, a_{t-1}, o_{t-1}, a_{t-2}, \\ldots, o_{t-15}, a_{t-16}$。策略 50 Hz，16 步就是最近 **0.32 s**。' },
        { at: 7.4, s: '4 个 block，每个 192 维、4 个注意力头（每头 $d_k = 48$）、MLP 比例 2.0。注意力是 $\\mathrm{softmax}(QK^\\top / \\sqrt{d_k})V$；**因果掩码**让每个 token 只看它之前的，16 个 token 一共 $16 \\times 17 / 2 = 136$ 对。' },
        { at: 10.8, s: '最后一个 token 的输出经动作头 MLP（256、128）给出 $a_t$：**16 个驱动关节的 PD 目标 + 8 个腿部关节的 PD 增益**。4 个脚趾电机不归策略管，固定在默认位置、用固定增益。' },
        { at: 13.8, s: '整个模型只有 **140 万**参数。真机上策略 50 Hz 输出，关节 PD 控制器 1 kHz 跟踪。论文选 Transformer 的理由：更容易随数据和算力扩展，也方便以后加别的输入模态。' }
      ]
    },
    {
      title: '两步训练：教师模仿 + 强化学习',
      dur: 17,
      build: buildSceneTraining,
      cues: [
        { at: 0.3, s: '论文说，直接在观测空间里用强化学习训，样本效率低、又慢又费资源，拖慢迭代。所以分两步。' },
        { at: 3.6, s: '第一步假设环境**完全可观**，训教师状态策略 $\\pi_s(a_t \\mid s_t)$：MLP（512、512、256、128），PPO。状态里有观测 66 维、地形高度图 121 维、机器人与环境参数 147 维、增益 40 维等，按 v1 表 III 加起来 **480 维**。奖励（比如步态参数）就在这一步反复调。' },
        { at: 7.4, s: '第二步训学生观测策略：$\\mathcal{L}(\\pi_o) = \\mathcal{L}_{RL}(\\pi_o) + \\lambda D_{KL}(\\pi_o \\| \\pi_s)$。$\\lambda$ 逐渐退火到 0，**通常在训练进行到一半时**到 0：前期借教师，后期靠强化学习超过教师。两项都是 on-policy，不需要离线数据。' },
        { at: 10.8, s: '为什么还要 RL 项？状态空间和观测空间不同，两者的「奖励流形」也不同，只模仿教师会次优。和四足那篇不同，这里**不设潜向量瓶颈**；critic 两步都看完整状态（非对称 actor-critic）。' },
        { at: 13.8, s: '图 8C（读图）：命令 1 m/s 爬坡，25° 时只用 RL 只有 **0.16 m/s**，只模仿 0.63，模仿 + RL **0.75**；联合目标在每个坡度都最好。' }
      ]
    },
    {
      title: '奖励与命令：没有步态库',
      dur: 17,
      build: buildSceneReward,
      cues: [
        { at: 0.3, s: '命令三个数：前后 $v_x \\in [-0.3, 1.0]$ m/s、横向 $v_y \\in [-0.3, 0.3]$ m/s、转向 $\\omega_z \\in [-1, 1]$ rad/s，每 **10 s** 重抽一次；小于阈值（0.10、0.10、0.26）的置零，所以也练原地站。' },
        { at: 3.6, s: '奖励一共 14 项（arXiv v1 附录）。线速度跟踪 $r_{lv} = \\exp(-\\lVert v_{xy} - v^*_{xy} \\rVert^2 / 0.2)$：命令 0.5 m/s、实际 0.4 m/s 得 **0.951**，0.3 m/s 得 0.819，站着不动 0.287。转向跟踪同样的形式。' },
        { at: 7.4, s: '其余是约束：机身上下与俯仰横滚的晃动、倾斜、低于 1 m、双脚同时离地、触地力过大、力矩、关节加速度、动作变化、关节目标的一阶二阶差分、自碰撞或机身碰撞就终止。' },
        { at: 10.8, s: '摆脚轨迹也有一项：水平方向跟 **Raibert 启发式**、高度跟 von Mises 分布（$\\kappa = 0.04$）给出的启发式轨迹；观测里还有 2 维时钟输入。所以「没有预先算好的步态库」，但奖励里有启发式的脚轨迹（我们的读法）。' },
        { at: 13.8, s: '手臂：关节偏离「中立」位置有惩罚，权重 $\\alpha$ 是肩的横滚、偏航 2.0，肘 1.0，髋的横滚、偏航 0.5，肩和髋的俯仰只有 **0.1**。摆臂主要靠肩俯仰，正好是罚得最轻的（我们的观察）。论文没给各项奖励的权重。' }
      ]
    },
    {
      title: '仿真：虚拟弹簧与域随机化',
      dur: 17,
      build: buildSceneSim,
      cues: [
        { at: 0.3, s: '训练用 Isaac Gym（GPU 并行物理仿真）。可 Digit 的膝—小腿—跗骨、跗骨—脚趾是**闭运动链**、欠驱动，Isaac Gym 模拟不好。' },
        { at: 3.6, s: '办法：把连杆换成刚度很高的「**虚拟弹簧**」，按弹簧偏离原长的量算力、加到刚体上；再用**交替子步**很快把弹簧长度拉回原长。论文说这些合起来才让 sim-to-real 可行。' },
        { at: 7.4, s: '域随机化（v1 表 I）：摩擦 ×0.3–2.0、质量 ×0.5–1.5、电机强度 ×0.85–1.15、阻尼 ×0.3–4.0（对数均匀）、$K_p$ / $K_d$ ×0.9–1.1、重力 +0–0.67 m/s²、观测与动作延迟、观测噪声。地形：平地、粗糙平地、平滑坡（最多 10%）。' },
        { at: 10.8, s: '规模（v1 表 IV）：4 张 A100，教师 8192 / 学生 4096 个并行环境，每轮每个环境 24 步，6000 轮，一回合 20 s。教师一轮约 19.7 万步、6000 轮约 **11.8 亿**步（我们算的）；项目页说一天能采到百亿量级的样本。' },
        { at: 13.8, s: '上真机前先放进 Agility 的**高保真仿真**：它准确模拟闭链和真机的传感器噪声，只用来筛掉不安全的策略，不改网络参数。然后零样本上真机：策略 50 Hz、关节 PD 1 kHz。' }
      ]
    },
    {
      title: '真机：户外一周没摔过',
      dur: 17,
      build: buildSceneRobust,
      cues: [
        { at: 0.3, s: '户外（图 1）：广场、步道、人行道、跑道、草地；混凝土、橡胶、草；晴天下午是干的，清晨是湿的。这些地面属性训练里都没见过。' },
        { at: 3.6, s: '整整**一周全天**测试，没有观察到一次摔倒，所以敢不挂安全吊架。它是盲的，会撞上台阶这类障碍、被绊住，但能调整行为避免摔倒。' },
        { at: 7.0, s: '实验室（图 2A）：扔大瑜伽球、用木棍推、往前走时从后面拉，都稳住了。人形本身很不稳、扰动又是突然的，要在零点几秒内反应。' },
        { at: 10.4, s: '地面（图 2B）：命令 0.15 m/s，地上铺橡胶、布、电缆、气泡膜都走过去了；坡最高 **8.7%**（训练最多 10%），陡坡上 0.2 m/s 反而更稳。负载（图 2C）：空背包、装满的背包、布手提袋、装满的垃圾袋、纸袋，五种全部走完。' },
        { at: 13.4, s: '图 2D 在 Agility 仿真里和厂家控制器比（每种 10 次，读图）：坡都是 100%；台阶 100% 对约 97%；不稳木板 100% 对约 71%。厂家控制器在台阶上脚被绊住后会**自动关机**；本文没在台阶上训练过，恢复是自发的。木板怕损坏，没上真机。' }
      ]
    },
    {
      title: '自然行走：全向、快走、摆臂',
      dur: 17,
      build: buildSceneNatural,
      cues: [
        { at: 0.3, s: '全向（图 3）：命令是 $x$、$y$ 方向的线速度和绕 $z$ 轴的角速度，能前进、后退、转弯。训练时每 10 s 随机抽一次；部署时用摇杆实时连续变化，和训练不一样，也跟得上。' },
        { at: 3.8, s: '快走（图 4B）：给一个阶跃命令 **1 m/s**（训练范围的上限），从静止出发 1 s 内追上，之后一直跟得住。' },
        { at: 7.4, s: '摆臂（图 4A）：左腿抬起时右臂往前摆 —— 和人一样的**对侧**协调。论文强调：奖励里没有约束摆臂，也没有参考轨迹引导手臂。' },
        { at: 10.8, s: '人为什么摆臂，生物力学里有几种假说：动态稳定、减少代谢能耗、四足祖先留下的协调。奖励里有能耗相关的项（力矩），论文推测涌现的摆臂可能也省能。' },
        { at: 13.8, s: '把装满的垃圾袋挂在手臂上，手臂摆不起来了，策略照样走完全程 —— 论文据此说它能按上下文调整行为。' }
      ]
    },
    {
      title: '下坡换步态：神经元按地形分簇',
      dur: 17,
      build: buildSceneGait,
      cues: [
        { at: 0.3, s: '图 5A：命令一直是往前走，地面依次是**平地、下坡、平地**。' },
        { at: 3.6, s: '平地上正常走；下坡换成**小碎步**、脚抬得很低；回到平地又恢复正常步幅。没人预先规定，是自发出现的。' },
        { at: 7.0, s: '看 Transformer 最后一层的 192 维隐状态：有的神经元跟着步态振荡（图 5B 的 82、89 号），平地上幅度大、坡上幅度小。' },
        { at: 10.4, s: '有的神经元跟着地形走（图 5C 的 108、132 号）：平地上高，坡上低。' },
        { at: 13.4, s: '把每一步的 192 维隐状态用 PCA 和 t-SNE 投到二维、按地形上色（标签只用来画图）：平地和坡分成清楚的两簇。论文据此认为，表示里装着地形和步态的信息。' }
      ]
    },
    {
      title: '脚被绊住：下一步抬高抬快',
      dur: 17,
      build: buildSceneTrap,
      cues: [
        { at: 0.3, s: '图 6：训练里**没有台阶**，任何离散障碍都没有。可机器人是盲的，部署时难免碰上。' },
        { at: 3.6, s: '腿撞上台阶以后，下一次尝试会抬得**更高、更快**，翻了上去。两条腿都会，换几种情形都能稳定复现；这也没有预先编程，训练里也没鼓励过。' },
        { at: 7.0, s: '图 6B 是最后一层隐状态随时间的热图（每列 192 维，每行一个神经元）：被绊住的那一段，活动模式明显变了样。' },
        { at: 10.4, s: '图 6C 的平均响应在被绊住时出现一个明显的凹陷（读图：约 6 秒处跌到约 −0.35）。论文据此说，Transformer 从观测—动作历史里**隐式检测**到了这类事件。' },
        { at: 13.4, s: '它的上下文只有 16 步 = 0.32 s，上一篇四足的学生 TCN-100 看 2 s，是它的 6.25 倍。0.32 s 也够在撞上之后的下一步就改动作（这一句是我们的对比）。' }
      ]
    },
    {
      title: '消融、局限与之后',
      dur: 17,
      build: buildSceneAblation,
      cues: [
        { at: 0.3, s: '图 8A 只换学生网络、各自调好超参（3 个场景共 30 次，读图）：Transformer 约 **97%**，LSTM 约 89%，TCN 约 86%，MLP 约 75%。' },
        { at: 3.6, s: '图 8B 换上下文长度（命令 1 m/s 爬坡，读图）：25° 时 16 步 **0.75 m/s**，8 步 0.71，1 步 0.62；越长越好。' },
        { at: 7.0, s: '论文写的局限：左右不完全对称，往左横移比往右好；速度跟踪不完美；很强的拉拽（比如拽着电缆）会摔倒；Isaac Gym 里的闭链只是近似。' },
        { at: 10.4, s: '可能的扩展：Transformer 更容易随数据和算力扩展，也更方便接入视觉、语言等输入模态。' },
        { at: 13.4, s: '之后同一组作者在 2024 年把人形行走写成「**下一个 token 预测**」，用多种来源的离线轨迹训练，见本仓库的 Humanoid Locomotion as Next Token Prediction 笔记。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十幕动画：Digit 真实世界人形行走全流程速览',
      sub: '约 170 秒自动播放。空格播放/暂停，← → 换幕；数字与下面的演示、笔记「具体实例」用的是同一份论文数据，标「读图」的是从图上读的近似值。',
      ariaLabel: 'Digit 真实世界人形行走十幕讲解动画',
      notes: [
        '取数依据：第 1 幕的 1.6 m / 45 kg / 30 自由度摘自正文 Digit 一节；第 2 幕的 16 步、192 维、4 层 4 头、MLP 比例 2.0、512 / 256 / 128、140 万参数、50 Hz / 1 kHz 摘自方法节；' +
          '第 3 幕的式 2 与「训练一半时 λ 到 0」摘自方法节，480 维是 arXiv v1 表 III 各项之和；第 4 幕的命令区间摘自 v1 表 II，奖励形式与 0.2 / 1.0 m / κ = 0.04 / α 摘自 v1 式 3–16，0.951 / 0.819 / 0.287 是现算的；' +
          '第 5 幕的随机化区间摘自 v1 表 I，4 张 A100 / 8192 / 4096 / 24 步 / 6000 轮摘自 v1 表 IV，11.8 亿步是现算的，「一天百亿量级」摘自项目页；第 6 幕的 8.7% / 10% / 0.15 m/s 摘自正文；第 9 幕的 6.25 倍是现算的。',
        '**标「读图」的是近似值**：图 2D、图 6C、图 8 没有数值表。第 4 幕 λ 的直线下降、第 7 幕的速度曲线、第 8 幕的神经元曲线与二维散点、第 9 幕的热图都是按论文图的走势画的示意；Digit 是示意画，不是论文照片。'
      ],
      scenes: RH_SCENES
    });
  }

  // ─── the narrated vertical video of the same ten scenes ──────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：Digit 真实世界人形行走十幕全流程',
      sub: '10 分 33 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '11.1 MB',
      fileName: '真实世界人形行走_讲解视频.mp4'
    });
  }

  K.mount({
    'rh-explainer': buildExplainerDemo,
    'rh-video': buildVideoDemo,
    'rh-context': buildContextDemo,
    'rh-reward': buildRewardDemo,
    'rh-dr': buildDrDemo
  });
})();
