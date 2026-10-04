/* Interactive demos for papers/03_High_Impact_Selection/
 * Learning_Quadrupedal_Locomotion_over_Challenging_Terrain
 * （Lee, Hwangbo, Wellhausen, Koltun, Hutter · Science Robotics 2020，ANYmal 盲走 · 特权教师—学生）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["quadterrain"]`, after assets/js/demos/kit.js. The note itself may
 * only contain empty placeholders, because scripts/sanitize_paper_html.py
 * strips <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   qt-explainer  — 九幕讲解动画：野外为什么难 → 相位振荡器动作空间 → 特权教师 → 本体学生 →
 *                   自适应地形课程 → 野外零样本 → 室内对照 → 记忆长度与踩空反射 → 解码器与局限
 *   qt-video      — 同一套九幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   qt-ftg        — 足端轨迹生成器：相位、频率偏移与足端残差怎么变成目标脚高
 *   qt-curriculum — 粒子滤波地形课程 vs 均匀采样（玩具模型）
 *   qt-memory     — 2 秒记忆窗口与踩空事件，配论文图 5B–D 的读图数
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

  // ─── 论文里的数字（arXiv 2010.11251 v1，Science Robotics 5(47) eabc5986） ───────────────
  /* 正文、表 1 与补充材料 S2–S4、表 S1–S8 照抄；图 3E、图 5、图 S2 没有数值表，下面标「读图」的是从图上读的近似值。
     九幕动画、三个演示与笔记「🚶 具体实例」共用这一份。 */
  var F0 = 1.25, FTG_H = 0.2, DT = 0.02; // 基础频率 Hz（S2–S3）、最高抬脚 m（S3）、动作生成 50 Hz（图 4C）
  var DIM_O = 121, DIM_X = 71, DIM_H = 60, DIM_A = 16, DIM_L = 64; // 表 S4 / S5 / S6
  var V_CAP = 0.6, V_LABEL = 0.2, TR_LO = 0.5, TR_HI = 0.9; // 式 12、式 2、式 4
  var REWARD_W = [0.05, 0.05, 0.04, 0.01, 0.02, 0.025, 2e-5]; // S4：lv / av / b / fc / bc / s / τ
  var N_PARTICLE = 10, N_TRAJ = 6, N_EVAL = 10, P_TRANS = 0.8, P_REPLAY = 0.05; // 表 S3
  var FIG_S1A = [
    // 补充材料图 S1A 的四个丘陵地形：粗糙度 m / 频率 / 幅度 m / 可通过性
    { r: 0.02, f: 0.1, a: 2.0, tr: 0.91 },
    { r: 0.15, f: 0.3, a: 2.0, tr: 0.56 },
    { r: 0.15, f: 1.2, a: 0.5, tr: 0.67 },
    { r: 0.15, f: 1.2, a: 2.0, tr: 0.15 }
  ];
  var TERRAINS = ['苔藓', '泥地', '厚植被'];
  var T1_SPEED = [[0.452, 0.338, 0.248], [0.199, 0.197, null]]; // 表 1：这篇 / 基线，m/s
  var T1_COT = [[0.423, 0.692, 1.23], [0.625, 0.931, null]]; // 表 1：机械 COT
  var STEP_H = [6.6, 10.1, 13.4, 15.7, 17.1, 20.1]; // 图 3E 横轴（cm），每个高度 10 次
  var STEP_UP = [
    // 图 3E 上台阶成功率（%，读图）
    { name: '这篇', v: [100, 100, 100, 100, 100, 20] },
    { name: '这篇 + 10 kg', v: [100, 100, 100, 10, 0, 0] },
    { name: '基线 0.2 m/s', v: [100, 0, 0, 0, 0, 0] },
    { name: '基线 0.6 m/s', v: [70, 30, 0, 0, 0, 0] },
    { name: '基线 0.2 m/s + 10 kg', v: [0, 0, 0, 0, 0, 0] }
  ];
  var STEP_DOWN_BASE = [[100, 100, 100, 100, 60, 0], [100, 100, 100, 90, 40, 0]]; // 图 3E 下台阶，基线 0.2 / 0.6 m/s（读图）
  var PAYLOAD_KG = 10, PAYLOAD_FRAC = 0.227, PAYLOAD_STEP = 13.4;
  var MEM_NAMES = ['TCN-1', 'TCN-20', 'TCN-100', '教师'];
  var MEM_STEPS = [1, 20, 100];
  var MEM_PARAMS = [161960, 158300, 158070]; // 表 S6
  var MEM_STEP18 = [22, 67, 78, 94]; // 图 5B：18 cm 台阶成功率 %（读图）
  var MEM_FRONT18 = [70, 86, 95]; // 图 5C：前腿（读图）
  var MEM_HIND18 = [35, 77, 84]; // 图 5C：后腿（读图）
  var MEM_DEV = [0.46, 0.38, 0.3, 0.18]; // 图 5D：侧推 50 N × 5 s 的偏离 rad（读图）
  var DEV_DROP = 0.355; // 正文：TCN-100 比 TCN-1 小 35.5%
  var FT_T = 2.1, SAL_T = 3.4; // 图 6C–D：踩空事件约 2.1 s，显著性图取 3.4 s
  var STEP_TRAP = 16.8, CLEAR_LF = [12.9, 22.5], CLEAR_RF = [13.6, 18.5], CLEAR_LH = [13.5, 16.6], CLEAR_RH = [9.06, 15.9];
  var PRIV_NO = { slope: 0, step16: 0, eplen: 40, reward: 0.15 }; // 图 5E–G：TCN-20 直接用 RL 训（读图）
  var PRIV_YES = { slope: 0.35, step16: 92, eplen: 370, reward: 0.19 }; // 走特权训练的 TCN-20 / 教师（读图）
  var CURR_NO = { slope25: 0.08, step18: 48, eplen: 250 }; // 图 5H–J：没有自适应课程（读图）
  var CURR_YES = { slope25: 0.27, step18: 98, eplen: 370 };
  var PROBE_FORCE = 80.1; // 图 S2B：10 kg 负重时解码出的向下外力 N
  var SUBT_ROBOTS = 2, SUBT_MISSIONS = 4, SUBT_MIN = 60;

  /* 式 11 的摆动段（去掉 −0.5 m 的名义腿长偏置，只看离地高度）：k = 2(φ − π)/π */
  function ftgHeight(phi) {
    var p = ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (p < Math.PI) return 0;
    var k = (2 * (p - Math.PI)) / Math.PI;
    if (k <= 1) return FTG_H * (-2 * k * k * k + 3 * k * k);
    return FTG_H * (2 * k * k * k - 9 * k * k + 12 * k - 4);
  }

  /* 每个控制步相位前进多少（rad）：2π (f0 + fi) Δt */
  function phaseStep(fi) {
    return 2 * Math.PI * (F0 + fi) * DT;
  }

  /* 式 12：命令方向上的速度奖励 */
  function rewardLv(v) {
    return v >= V_CAP ? 1 : Math.exp(-2 * (v - V_CAP) * (v - V_CAP));
  }

  // ─── demo 1: 足端轨迹生成器 ───────────────────────────────────────────
  function buildFtgDemo(host) {
    var root = card(host, {
      title: '足端轨迹生成器：策略只「调制」，不从零画轨迹',
      sub:
        '每条腿一个相位 $\\varphi_i$：$[0, \\pi)$ 支撑、$[\\pi, 2\\pi)$ 摆动，摆动段是补充材料式 11 的三次样条（最高 $h = 0.2$ m）。' +
        '策略每 0.02 s 输出频率偏移 $f_i$ 与足端残差 $\\Delta r$，目标脚位 $r = F(\\varphi_i) + \\Delta r$。'
    });

    var state = { phi: 1.25, fi: 0, dz: 0 };
    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '当前相位 $\\varphi$（单位 $\\pi$）',
      min: 0,
      max: 2,
      step: 0.01,
      value: state.phi,
      format: function (v) {
        return fmt(v, 2) + 'π';
      },
      onInput: function (v) {
        state.phi = v;
        render();
      }
    });
    slider(ctrls, {
      label: '这条腿的频率偏移 $f_i$',
      min: -1.25,
      max: 1.25,
      step: 0.05,
      value: state.fi,
      format: function (v) {
        return (v >= 0 ? '+' : '') + fmt(v, 2) + ' Hz';
      },
      onInput: function (v) {
        state.fi = v;
        render();
      }
    });
    slider(ctrls, {
      label: '竖直残差 $\\Delta r_z$',
      min: -5,
      max: 5,
      step: 0.5,
      value: state.dz,
      format: function (v) {
        return (v >= 0 ? '+' : '') + fmt(v, 1) + ' cm';
      },
      onInput: function (v) {
        state.dz = v;
        render();
      }
    });

    var setLegend = legend(root, [
      { key: 'accent', text: '$F(\\varphi)$ + 残差：目标脚高' },
      { key: 'muted', text: '虚线：只有 $f_0 = 1.25$ Hz、没有残差' },
      { key: 'warn', text: '圆点：当前时刻' }
    ]);
    var grid = stageGrid(root);
    var shapeStage = stage(grid, 230);
    var timeStage = stage(grid, 230);

    var stats = statsRow(root);
    var sK = stats.add('$k = 2(\\varphi - \\pi)/\\pi$');
    var sH = stats.add('目标脚高（离地）');
    var sStep = stats.add('每步相位前进');
    var sCycle = stats.add('一个步态周期');
    var verdict = verdictBox(root);

    note(root, [
      '**默认值就是笔记「🚶 具体实例」第 1 步**：$\\varphi = 1.25\\pi$ 时 $k = 0.5$，$F = 0.2 \\times (-2 \\cdot 0.125 + 3 \\cdot 0.25) = 0.10$ m；' +
        '$f_0 = 1.25$ Hz、每步 0.02 s 时相位前进 $2\\pi \\times 1.25 \\times 0.02 = 0.05\\pi$（9°），一个周期 40 步 = 0.8 s。',
      '**$f_0 + f_i = 0$ 时这条腿的相位停住**：处在支撑相就一直踩着地，处在摆动相就悬在半空 —— 策略借此让某条腿「等一等」。' +
        '论文训练时每条腿的初始相位从 $U(0, 2\\pi)$ 里随机抽，小跑步态（对角腿同相）是策略自己调出来的。',
      '**和论文的差别**：式 11 还带 $-0.5$ m 的名义腿长偏置，这里只画离地高度；残差 $\\Delta r$ 其实是三维的，这里只拖竖直分量。' +
        '论文公开的补充代码（ANYmal C 版）把基础频率写成 1.3 Hz、残差加在关节角上，见笔记「源码对照」。'
    ]);

    var render = registerRenderer(function () {
      var phi = state.phi * Math.PI;
      var k = phi < Math.PI ? null : (2 * (phi - Math.PI)) / Math.PI;
      var hNow = Math.max(0, ftgHeight(phi) * 100 + state.dz);
      var stepDeg = (phaseStep(state.fi) * 180) / Math.PI;
      var freq = F0 + state.fi;

      sK.set(k == null ? '支撑相（脚贴地）' : fmt(k, 2), k == null ? 'warn' : null);
      sH.set(fmt(hNow, 1) + ' cm', hNow > 0 ? 'good' : null);
      sStep.set(fmt(stepDeg, 1) + '°', Math.abs(freq) < 1e-9 ? 'bad' : null);
      sCycle.set(Math.abs(freq) < 1e-9 ? '相位停住' : fmt(1 / Math.abs(freq), 2) + ' s = ' + fmt(1 / Math.abs(freq) / DT, 0) + ' 步', Math.abs(freq) < 1e-9 ? 'bad' : 'good');
      if (Math.abs(freq) < 1e-9) {
        verdict.set('$f_0 + f_i = 0$：这条腿的相位不再前进，' + (k == null ? '停在支撑相，一直踩在地上。' : '停在摆动相，脚悬在 ' + fmt(hNow, 1) + ' cm 高。'), 'frozen');
      } else if (k == null) {
        verdict.set('支撑相：$F(\\varphi) = 0$，脚贴地；这时竖直残差 ' + fmt(state.dz, 1) + ' cm 会把脚往下踩或往上提（低于地面的目标在这里按 0 画）。', 'learning');
      } else {
        verdict.set(
          '摆动相 $k = ' + fmt(k, 2) + '$：样条给 ' + fmt(ftgHeight(phi) * 100, 1) + ' cm，加残差后目标脚高 ' + fmt(hNow, 1) + ' cm。频率 ' + fmt(freq, 2) + ' Hz 下一个周期 ' + fmt(1 / Math.abs(freq), 2) + ' s。',
          'learning'
        );
      }

      // ── 左：F(φ) 形状 ──
      var g = begin(shapeStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 12, t: 22, b: 34 }, [0, 2], [-6, 26]);
      axes(g, p, {
        xTicks: [0, 0.5, 1, 1.5, 2],
        yTicks: [0, 10, 20],
        xFmt: function (t) {
          return t === 0 ? '0' : fmt(t, 1) + 'π';
        },
        yFmt: function (t) {
          return fmt(t, 0) + 'cm';
        },
        xLabel: '相位 φ'
      });
      g.ctx.fillStyle = P.grid;
      g.ctx.globalAlpha = 0.35;
      g.ctx.fillRect(p.sx(0), p.y1, p.sx(1) - p.sx(0), p.y0 - p.y1);
      g.ctx.globalAlpha = 1;
      text(g.ctx, '支撑相', p.sx(0.5), p.y1 + 10, P.muted, 'center', '11px sans-serif');
      text(g.ctx, '摆动相', p.sx(1.5), p.y1 + 10, P.muted, 'center', '11px sans-serif');
      var base = [],
        mod = [];
      for (var i = 0; i <= 200; i++) {
        var u = (i / 200) * 2;
        base.push([p.sx(u), p.sy(ftgHeight(u * Math.PI) * 100)]);
        mod.push([p.sx(u), p.sy(Math.max(0, ftgHeight(u * Math.PI) * 100 + state.dz))]);
      }
      line(g.ctx, base, P.muted, 1.4, [4, 4]);
      line(g.ctx, mod, P.accent, 2.4);
      dot(g.ctx, p.sx(state.phi), p.sy(hNow), 5.5, P.warn, P.surface2);
      text(g.ctx, '式 11：一条腿的目标脚高', p.x0, p.y1 - 10, P.muted, 'left', '11px sans-serif');

      // ── 右：目标脚高随时间（2 s） ──
      var g2 = begin(timeStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 12, t: 22, b: 34 }, [0, 2], [-6, 26]);
      axes(g2, p2, {
        xTicks: [0, 0.4, 0.8, 1.2, 1.6, 2.0],
        yTicks: [0, 10, 20],
        xFmt: function (t) {
          return fmt(t, 1) + 's';
        },
        yFmt: function (t) {
          return fmt(t, 0) + 'cm';
        },
        xLabel: '时间（从当前相位往后 2 s）'
      });
      var nomT = [],
        modT = [];
      for (var j = 0; j <= 100; j++) {
        var tt = j * DT;
        nomT.push([p2.sx(tt), p2.sy(ftgHeight(phi + 2 * Math.PI * F0 * tt) * 100)]);
        modT.push([p2.sx(tt), p2.sy(Math.max(0, ftgHeight(phi + 2 * Math.PI * freq * tt) * 100 + state.dz))]);
      }
      line(g2.ctx, nomT, P2.muted, 1.4, [4, 4]);
      line(g2.ctx, modT, P2.accent, 2.4);
      for (var q = 0; q <= 100; q += 10) dot(g2.ctx, modT[q][0], modT[q][1], 2.2, P2.accent);
      dot(g2.ctx, p2.sx(0), p2.sy(hNow), 5.5, P2.warn, P2.surface2);
      text(g2.ctx, '每 0.02 s 一个控制步（每 10 步一个点）', p2.x0, p2.y1 - 10, P2.muted, 'left', '11px sans-serif');

      shapeStage.canvas.setAttribute('aria-label', '足端轨迹生成器：支撑相脚贴地，摆动相三次样条最高 20 厘米，当前相位处的目标脚高');
      timeStage.canvas.setAttribute('aria-label', '目标脚高随时间的变化：虚线是基础频率 1.25 赫兹，实线加上频率偏移与竖直残差');
    });

    render();
  }

  // ─── demo 2: 粒子滤波地形课程（玩具模型） ─────────────────────────────
  /* 玩具：楼梯参数网格（台阶宽 0.10–0.50 m × 台阶高 0.02–0.20 m，表 S2 的范围），难度 d 随台阶变高、变窄而增大；
     策略只有一个数「技能 s」（可通过性 = 0.5 处的难度），某个地形的可通过性 Tr = σ((s − d)/τ)，
     每条轨迹 20 个转移各自按 Tr 记 1 / 0（式 2）。学习量取 4·Tr·(1 − Tr)：太容易、太难的轨迹几乎不教东西。
     粒子滤波照搬表 S3：10 个粒子、每轮 6 × 10 = 60 条轨迹、p_transition 0.8、5% 从回放池抽、初始集中在几乎平的地形。
     这些都只是复现机制，数值不能和论文比。 */
  var CW = [], CH = [];
  for (var iw = 0; iw < 9; iw++) CW.push(0.1 + 0.05 * iw);
  for (var ih = 0; ih < 10; ih++) CH.push(0.02 + 0.02 * ih);
  var TOY_TRANS = 20, TOY_TAU = 0.012, TOY_ETA = 0.012, TOY_SMAX = 0.42, TOY_S0 = 0.03;

  function toyDifficulty(wi, hj) {
    return CH[hj] * (1 + (1.2 * (0.5 - CW[wi])) / 0.4);
  }

  function toyTr(wi, hj, s) {
    return 1 / (1 + Math.exp((toyDifficulty(wi, hj) - s) / TOY_TAU));
  }

  /* 一条轨迹的可通过性 = 20 个转移里标 1 的比例；落在 [0.5, 0.9] 的概率就是式 4 的期望值 */
  function toyDesirability(tr) {
    var out = 0;
    for (var k = 0; k <= TOY_TRANS; k++) {
      var x = k / TOY_TRANS;
      if (x < TR_LO || x > TR_HI) continue;
      var c = 1;
      for (var m = 0; m < k; m++) c = (c * (TOY_TRANS - m)) / (m + 1);
      out += c * Math.pow(tr, k) * Math.pow(1 - tr, TOY_TRANS - k);
    }
    return out;
  }

  function toyCurriculum(seed, mode, updates) {
    var rng = mulberry32(seed);
    var s = TOY_S0;
    var P = [];
    for (var k = 0; k < N_PARTICLE; k++) P.push([Math.floor(rng() * CW.length), 0]);
    var replay = [];
    var frames = [{ s: s, cells: P.map(function (c) { return c.slice(); }), pr: null }];
    for (var u = 0; u < updates; u++) {
      var cells =
        mode === 'pf'
          ? P
          : P.map(function () {
              return [Math.floor(rng() * CW.length), Math.floor(rng() * CH.length)];
            });
      var gsum = 0,
        n = 0,
        pr = [];
      cells.forEach(function (c) {
        var tr = toyTr(c[0], c[1], s);
        var good = 0;
        for (var m = 0; m < N_TRAJ * N_EVAL; m++) {
          var hits = 0;
          for (var q = 0; q < TOY_TRANS; q++) if (rng() < tr) hits++;
          var x = hits / TOY_TRANS;
          if (x >= TR_LO && x <= TR_HI) good++;
          gsum += 4 * x * (1 - x);
          n++;
        }
        pr.push(good / (N_TRAJ * N_EVAL));
      });
      s += TOY_ETA * (gsum / n) * (1 - s / TOY_SMAX);
      if (mode === 'pf') {
        var tot = pr.reduce(function (a, b) {
          return a + b;
        }, 0);
        var w = pr.map(function (p) {
          return tot > 0 ? p / tot : 1 / pr.length;
        });
        var np = [];
        for (var r = 0; r < N_PARTICLE; r++) {
          var x0 = rng(),
            acc = 0,
            idx = 0;
          for (; idx < N_PARTICLE; idx++) {
            acc += w[idx];
            if (x0 < acc) break;
          }
          np.push(P[Math.min(idx, N_PARTICLE - 1)].slice());
        }
        np.forEach(function (p) {
          replay.push(p.slice());
        });
        P = np.map(function (p) {
          if (rng() < P_REPLAY && replay.length) p = replay[Math.floor(rng() * replay.length)].slice();
          if (rng() < P_TRANS) p[0] = clamp(p[0] + (rng() < 0.5 ? -1 : 1), 0, CW.length - 1);
          if (rng() < P_TRANS) p[1] = clamp(p[1] + (rng() < 0.5 ? -1 : 1), 0, CH.length - 1);
          return p;
        });
      }
      frames.push({ s: s, cells: (mode === 'pf' ? P : cells).map(function (c) { return c.slice(); }), pr: pr });
    }
    return frames;
  }

  var TOY_UPDATES = 80;

  function buildCurriculumDemo(host) {
    var root = card(host, {
      title: '自适应地形课程：粒子滤波 vs 均匀采样（玩具模型）',
      sub:
        '楼梯参数网格（横轴台阶宽、纵轴台阶高，表 S2 的范围），底色是「值得练」的概率：可通过性落在 $[0.5, 0.9]$ 的概率（式 4）。' +
        '点是 10 个粒子；右图比较两种采样方式下策略技能怎么涨。'
    });

    var state = { seed: 1, u: 0, playing: false };
    var runs = null;
    function rerun() {
      runs = { pf: toyCurriculum(state.seed, 'pf', TOY_UPDATES), uni: toyCurriculum(state.seed, 'uni', TOY_UPDATES) };
    }
    rerun();

    var ctrls = controlsRow(root);
    var uSlider = slider(ctrls, {
      label: '课程更新次数（每次 = 10 轮策略迭代）',
      min: 0,
      max: TOY_UPDATES,
      step: 1,
      value: 0,
      format: function (v) {
        return fmt(v, 0) + ' / ' + TOY_UPDATES;
      },
      onInput: function (v) {
        state.u = v;
        render();
      }
    });
    var btns = el('div', 'demo-buttons');
    root.appendChild(btns);
    var playBtn = button(btns, '播放', function () {
      state.playing = !state.playing;
      if (state.playing && state.u >= TOY_UPDATES) state.u = 0;
      playBtn.textContent = state.playing ? '暂停' : '播放';
      if (state.playing) tick();
    });
    button(btns, '换个随机种子', function () {
      state.seed += 1;
      rerun();
      render();
    });
    button(btns, '回到开头', function () {
      state.u = 0;
      uSlider.set(0, true);
      render();
    });

    var setLegend = legend(root, [
      { key: 'good', text: '粒子滤波课程（式 6–7，表 S3）' },
      { key: 'bad', text: '在网格上均匀采样' },
      { key: 'accent', text: '底色越亮：越「值得练」' }
    ]);
    var grid = stageGrid(root);
    var mapStage = stage(grid, 260);
    var curveStage = stage(grid, 260);

    var stats = statsRow(root);
    var sPf = stats.add('课程组技能 $s$');
    var sUni = stats.add('均匀采样技能 $s$');
    var sDes = stats.add('粒子平均「值得练」概率');
    var sUniDes = stats.add('均匀采样平均');
    var verdict = verdictBox(root);

    note(root, [
      '**这是简化模型，数值不能和论文直接比**：策略被压成一个数 $s$（可通过性为 0.5 处的难度，约等于宽台阶上能过的台阶高度），难度、学习量的公式都是我们设的；只有采样流程照搬论文（式 2–7、表 S3）。',
      '**结论经得起换种子**：我们试了 30 个种子，第 80 次更新时课程组 $s$ 在 0.25–0.28、均匀采样在 0.13–0.16；课程组 40–52 次更新就到 0.2，均匀采样 80 次内一次也没到。' +
        '原因和论文图 5J 的解释一样：均匀采样大多抽到过不去（或太容易）的地形，回合早早结束，学到的东西少。',
      '**看粒子怎么走**：一开始集中在几乎平的地形（论文的两种初始化之一），随着技能变强沿着亮带往「更高、更窄」挪；左上角又窄又高的台阶一直没人去 —— 和补充材料图 S1D「拒绝短而陡的台阶」是同一个现象。'
    ]);

    var raf = null;
    function tick() {
      if (!state.playing) return;
      state.u = Math.min(TOY_UPDATES, state.u + 0.25);
      uSlider.set(Math.floor(state.u), true);
      render();
      if (state.u >= TOY_UPDATES) {
        state.playing = false;
        playBtn.textContent = '播放';
        return;
      }
      raf = window.requestAnimationFrame(tick);
    }

    var render = registerRenderer(function () {
      var u = Math.floor(state.u);
      var fp = runs.pf[u],
        fu = runs.uni[u];
      var desPf = 0,
        desUni = 0;
      fp.cells.forEach(function (c) {
        desPf += toyDesirability(toyTr(c[0], c[1], fp.s));
      });
      fu.cells.forEach(function (c) {
        desUni += toyDesirability(toyTr(c[0], c[1], fu.s));
      });
      desPf /= fp.cells.length;
      desUni /= fu.cells.length;
      sPf.set(fmt(fp.s, 3), 'good');
      sUni.set(fmt(fu.s, 3), 'bad');
      sDes.set(fmt(desPf * 100, 0) + '%', desPf > 0.3 ? 'good' : 'warn');
      sUniDes.set(fmt(desUni * 100, 0) + '%', desUni > 0.3 ? 'good' : 'warn');
      verdict.set(
        u === 0
          ? '起点：两边技能都是 ' + fmt(TOY_S0, 2) + '，粒子集中在最平的一行。点「播放」或拖动滑块。'
          : '第 ' + u + ' 次更新：课程组的粒子平均有 ' + fmt(desPf * 100, 0) + '% 的轨迹落在 [0.5, 0.9]，均匀采样只有 ' + fmt(desUni * 100, 0) + '%；技能 ' + fmt(fp.s, 3) + ' 对 ' + fmt(fu.s, 3) + '。',
        fp.s > fu.s ? 'learning' : 'frozen'
      );

      // ── 左：参数网格 ──
      var g = begin(mapStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 46, r: 12, t: 24, b: 34 }, [0.075, 0.525], [0.01, 0.21]);
      axes(g, p, {
        xTicks: [0.1, 0.2, 0.3, 0.4, 0.5],
        yTicks: [0.02, 0.1, 0.2],
        xFmt: function (t) {
          return fmt(t, 1);
        },
        yFmt: function (t) {
          return fmt(t * 100, 0) + 'cm';
        },
        xLabel: '台阶宽 m'
      });
      var cw = p.sx(0.125) - p.sx(0.075),
        ch = p.sy(0.01) - p.sy(0.03);
      for (var a = 0; a < CW.length; a++) {
        for (var b = 0; b < CH.length; b++) {
          var dsr = toyDesirability(toyTr(a, b, fp.s));
          g.ctx.fillStyle = P.accent;
          g.ctx.globalAlpha = 0.08 + 0.75 * dsr;
          g.ctx.fillRect(p.sx(CW[a]) - cw / 2 + 1, p.sy(CH[b]) - ch / 2 + 1, cw - 2, ch - 2);
        }
      }
      g.ctx.globalAlpha = 1;
      var rng = mulberry32(17 + u);
      fu.cells.forEach(function (c) {
        dot(g.ctx, p.sx(CW[c[0]]) + (rng() - 0.5) * cw * 0.5, p.sy(CH[c[1]]) + (rng() - 0.5) * ch * 0.5, 3.2, P.bad);
      });
      fp.cells.forEach(function (c) {
        dot(g.ctx, p.sx(CW[c[0]]) + (rng() - 0.5) * cw * 0.5, p.sy(CH[c[1]]) + (rng() - 0.5) * ch * 0.5, 4.2, P.good, P.surface2);
      });
      text(g.ctx, '楼梯参数（左上：又窄又高，最难）', p.x0, p.y1 - 12, P.muted, 'left', '11px sans-serif');

      // ── 右：技能曲线 ──
      var g2 = begin(curveStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 46, r: 12, t: 24, b: 34 }, [0, TOY_UPDATES], [0, 0.3]);
      axes(g2, p2, {
        xTicks: [0, 20, 40, 60, 80],
        yTicks: [0, 0.1, 0.2, 0.3],
        yFmt: function (t) {
          return fmt(t, 1);
        },
        xLabel: '课程更新次数'
      });
      [
        [runs.pf, P2.good],
        [runs.uni, P2.bad]
      ].forEach(function (c) {
        var pts = c[0].map(function (f, i) {
          return [p2.sx(i), p2.sy(f.s)];
        });
        line(g2.ctx, pts.slice(0, u + 1), c[1], 2.4);
        line(g2.ctx, pts, c[1], 1, [3, 4]);
      });
      line(g2.ctx, [[p2.sx(u), p2.y0], [p2.sx(u), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(u), p2.sy(fp.s), 5, P2.good, P2.surface2);
      dot(g2.ctx, p2.sx(u), p2.sy(fu.s), 5, P2.bad, P2.surface2);
      text(g2.ctx, '玩具技能 s（可通过性 0.5 处的难度）', p2.x0, p2.y1 - 12, P2.muted, 'left', '11px sans-serif');

      mapStage.canvas.setAttribute('aria-label', '楼梯参数网格上的值得练概率与粒子位置');
      curveStage.canvas.setAttribute('aria-label', '粒子滤波课程与均匀采样的技能随更新次数的变化');
    });

    render();
  }

  // ─── demo 3: 2 秒记忆窗口 ─────────────────────────────────────────────
  function buildMemoryDemo(host) {
    var root = card(host, {
      title: '记忆窗口：2.1 s 那一下撞台阶，3.4 s 时还看得见吗',
      sub:
        'TCN-N 看最近 $N$ 步本体历史，每步 0.02 s。论文图 6C–D：左前脚约 2.1 s 撞上台阶，3.4 s 算抬脚高度时策略仍最在意那一刻的关节读数。' +
        '拖动记忆长度与当前时刻，右图是论文图 5B–D 的消融（读图）。'
    });

    var state = { n: 100, t: SAL_T };
    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '记忆长度（论文的三档）',
      items: MEM_STEPS.map(function (n, i) {
        return { label: MEM_NAMES[i] + '（' + fmt(n * DT, 2) + ' s）', value: n };
      }),
      value: state.n,
      onPick: function (v) {
        state.n = v;
        nSlider.set(v, true);
        render();
      }
    });
    var nSlider = slider(ctrls, {
      label: '或者自己拖：$N$ 步',
      min: 1,
      max: 120,
      step: 1,
      value: state.n,
      format: function (v) {
        return fmt(v, 0) + ' 步 = ' + fmt(v * DT, 2) + ' s';
      },
      onInput: function (v) {
        state.n = v;
        render();
      }
    });
    slider(ctrls, {
      label: '当前时刻 $t$',
      min: 2.0,
      max: 4.5,
      step: 0.02,
      value: state.t,
      format: function (v) {
        return fmt(v, 2) + ' s';
      },
      onInput: function (v) {
        state.t = v;
        render();
      }
    });

    var setLegend = legend(root, [
      { key: 'accent', text: '阴影：TCN 此刻看得到的历史' },
      { key: 'bad', text: '红线：左前脚撞台阶（约 2.1 s）' },
      { key: 'muted', text: '曲线是示意的关节读数，不是论文数据' }
    ]);
    var grid = stageGrid(root);
    var tlStage = stage(grid, 230);
    var barStage = stage(grid, 230);

    var stats = statsRow(root);
    var sWin = stats.add('窗口');
    var sAgo = stats.add('撞台阶是多久以前');
    var sSee = stats.add('窗口里有没有它');
    var sAbl = stats.add('18 cm 台阶成功率（图 5B）');
    var verdict = verdictBox(root);

    note(root, [
      '**65 步这个数是现算的**：$(3.4 - 2.1) / 0.02 = 65$ 步，TCN-20 的窗口只有 20 步（0.4 s），只有 TCN-100（100 步 = 2 s）装得下。' +
        '论文没有说「TCN-20 正是因为看不到这一下才失败」，这是我们把图 5 与图 6 放在一起的解读。',
      '**三档参数量几乎一样**（表 S6：161 960 / 158 300 / 158 070），所以图 5 比的确实是记忆长度，不是网络大小。',
      '**右图数字是读图近似值**；侧推偏离那组正文给了精确数：TCN-100 比 TCN-1 小 35.5%。'
    ]);

    function trace(t) {
      // 示意的左前腿膝关节读数：0.8 s 周期的步态，2.1 s 处撞台阶的尖峰随后衰减
      var v = 0.5 * Math.sin(2 * Math.PI * F0 * t);
      if (t >= FT_T) v += 1.4 * Math.exp(-(t - FT_T) * 9) * Math.cos((t - FT_T) * 30);
      return v;
    }

    var render = registerRenderer(function () {
      var win = state.n * DT;
      var ago = state.t - FT_T;
      var see = ago >= 0 && ago <= win + 1e-9;
      var idx = MEM_STEPS.indexOf(state.n);
      sWin.set(fmt(state.n, 0) + ' 步 = ' + fmt(win, 2) + ' s');
      sAgo.set(ago < 0 ? '还没发生' : fmt(ago, 2) + ' s = ' + fmt(ago / DT, 0) + ' 步');
      sSee.set(ago < 0 ? '—' : see ? '在窗口里' : '已经滑出去了', ago < 0 ? null : see ? 'good' : 'bad');
      sAbl.set(idx >= 0 ? MEM_STEP18[idx] + '%（读图）' : '论文只测了 1 / 20 / 100 步', idx >= 0 ? (MEM_STEP18[idx] > 70 ? 'good' : 'warn') : null);
      verdict.set(
        ago < 0
          ? '当前时刻早于撞台阶，窗口里还没有这个事件。'
          : see
            ? '撞台阶发生在 ' + fmt(ago, 2) + ' s（' + fmt(ago / DT, 0) + ' 步）以前，还在 ' + fmt(win, 2) + ' s 的窗口里：策略可以根据它决定这一步抬多高。'
            : '撞台阶发生在 ' + fmt(ago, 2) + ' s 以前，' + fmt(win, 2) + ' s 的窗口已经装不下：这一步只能凭当前几帧的读数去猜。',
        see ? 'learning' : 'frozen'
      );

      // ── 左：时间轴 ──
      var g = begin(tlStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 34, r: 12, t: 24, b: 34 }, [0, 4.5], [-1.4, 1.9]);
      axes(g, p, {
        xTicks: [0, 1, 2, 3, 4],
        xFmt: function (t) {
          return fmt(t, 0) + 's';
        },
        xLabel: '时间'
      });
      var x0 = Math.max(0, state.t - win);
      g.ctx.fillStyle = P.accent;
      g.ctx.globalAlpha = 0.18;
      g.ctx.fillRect(p.sx(x0), p.y1, p.sx(state.t) - p.sx(x0), p.y0 - p.y1);
      g.ctx.globalAlpha = 1;
      var pts = [];
      for (var i = 0; i <= 450; i++) {
        var tt = i / 100;
        if (tt > state.t) break;
        pts.push([p.sx(tt), p.sy(trace(tt))]);
      }
      line(g.ctx, pts, P.muted, 1.6);
      line(g.ctx, [[p.sx(FT_T), p.y0], [p.sx(FT_T), p.y1]], P.bad, 1.6, [4, 3]);
      text(g.ctx, '撞台阶 2.1 s', p.sx(FT_T) - 4, p.y1 + 8, P.bad, 'right', '11px sans-serif');
      line(g.ctx, [[p.sx(state.t), p.y0], [p.sx(state.t), p.y1]], P.text, 1.4);
      text(g.ctx, '现在 ' + fmt(state.t, 2) + ' s', p.sx(state.t) + 4, p.y1 + 8, P.text, 'left', '11px sans-serif');
      text(g.ctx, '左前腿关节读数（示意）', p.x0, p.y1 - 12, P.muted, 'left', '11px sans-serif');

      // ── 右：图 5B–D（读图） ──
      var g2 = begin(barStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 40, r: 12, t: 24, b: 38 }, [0, 3], [0, 100]);
      axes(g2, p2, {
        yTicks: [0, 25, 50, 75, 100],
        yFmt: function (t) {
          return fmt(t, 0) + '%';
        }
      });
      text(g2.ctx, '18 cm 台阶成功率（图 5B–C，读图）', p2.x0, p2.y1 - 12, P2.muted, 'left', '11px sans-serif');
      var groups = [
        ['整体', MEM_STEP18],
        ['前腿', MEM_FRONT18],
        ['后腿', MEM_HIND18]
      ];
      var slot = (p2.x1 - p2.x0) / 3;
      var bw = Math.max(8, slot * 0.2);
      var cols = [P2.muted, P2.warn, P2.accent];
      groups.forEach(function (gr, k) {
        var cx = p2.x0 + slot * (k + 0.5);
        for (var m = 0; m < 3; m++) {
          var v = gr[1][m];
          var bx = cx + (m - 1.5) * (bw + 3);
          g2.ctx.fillStyle = cols[m];
          g2.ctx.globalAlpha = idx === -1 || idx === m ? 1 : 0.35;
          g2.ctx.fillRect(bx, p2.sy(v), bw, p2.y0 - p2.sy(v));
          g2.ctx.globalAlpha = 1;
          if (idx === m) barLabel(g2, p2, bx + bw / 2, p2.sy(v), String(v), cols[m]);
        }
        text(g2.ctx, gr[0], cx, p2.y0 + 14, P2.text, 'center', '11px sans-serif');
      });
      text(g2.ctx, 'TCN-1 / 20 / 100', p2.x1, p2.y0 + 28, P2.muted, 'right', '11px sans-serif');

      tlStage.canvas.setAttribute('aria-label', '本体历史时间轴：撞台阶在 2.1 秒，阴影是当前记忆窗口');
      barStage.canvas.setAttribute('aria-label', '论文图 5：TCN-1、TCN-20、TCN-100 在 18 厘米台阶上的成功率');
    });

    render();
  }

  // ─── narrated explainer: nine scenes ─────────────────────────────────────
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

  function hbar(parent, x, y, w, h, color, opacity) {
    var r = paint(svgEl('rect', { x: x, y: y, width: Math.max(0, w), height: h, rx: 3, opacity: opacity == null ? 0.85 : opacity }), color);
    parent.appendChild(r);
    return r;
  }

  function setW(node, w) {
    node.setAttribute('width', Math.max(0, w).toFixed(1));
  }

  /* 竖柱：底边固定在 yBase，高度 h 随动画长 */
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

  /* ── 一只侧视的四足示意（ANYmal 的简化）：机身 + 四条两段腿，远侧两条腿淡一些。
     腿的相位走式 11 的足端轨迹生成器：对角腿同相（小跑），支撑相脚贴地往后滑，摆动相按样条抬起。
     `pose(cx, groundY, phase)`：cx 是机身中心，phase 是左前腿的相位（rad）。 */
  function quadFigure(parent, sc, color) {
    var g = group(parent);
    var L1 = 20 * sc,
      L2 = 20 * sc,
      HIP_H = 33 * sc,
      HALF = 27 * sc,
      STROKE = 9 * sc,
      LIFT = 60 * sc; // 0.2 m 抬脚 → 12 px（乘 sc）
    var legs = [
      { dx: HALF, off: Math.PI, far: true, front: true },
      { dx: -HALF, off: 0, far: true, front: false },
      { dx: HALF, off: 0, far: false, front: true },
      { dx: -HALF, off: Math.PI, far: false, front: false }
    ].map(function (lg) {
      var a = paint(svgEl('line', { 'stroke-width': 3.2 * sc, 'stroke-linecap': 'round' }), null, color);
      var b = paint(svgEl('line', { 'stroke-width': 2.6 * sc, 'stroke-linecap': 'round' }), null, color);
      var f = paint(svgEl('circle', { r: 2.6 * sc }), color);
      if (lg.far) [a, b, f].forEach(function (n) { n.style.opacity = 0.4; });
      g.appendChild(a);
      g.appendChild(b);
      g.appendChild(f);
      lg.a = a;
      lg.b = b;
      lg.f = f;
      return lg;
    });
    var body = paint(svgEl('rect', { width: 70 * sc, height: 13 * sc, rx: 5 * sc }), color);
    body.style.opacity = 0.9;
    var head = paint(svgEl('rect', { width: 12 * sc, height: 11 * sc, rx: 3 * sc }), color);
    g.appendChild(body);
    g.appendChild(head);

    function put(ln, p, q) {
      ln.setAttribute('x1', p[0].toFixed(1));
      ln.setAttribute('y1', p[1].toFixed(1));
      ln.setAttribute('x2', q[0].toFixed(1));
      ln.setAttribute('y2', q[1].toFixed(1));
    }

    function pose(cx, groundY, phase, liftScale) {
      var hipY = groundY - HIP_H;
      body.setAttribute('x', (cx - 35 * sc).toFixed(1));
      body.setAttribute('y', (hipY - 11 * sc).toFixed(1));
      head.setAttribute('x', (cx + 35 * sc - 2 * sc).toFixed(1));
      head.setAttribute('y', (hipY - 17 * sc).toFixed(1));
      legs.forEach(function (lg) {
        var ph = (((phase + lg.off) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        var u = ph < Math.PI ? ph / Math.PI : (ph - Math.PI) / Math.PI;
        var fx = ph < Math.PI ? STROKE * (1 - 2 * u) : STROKE * (2 * u - 1);
        var fy = groundY - ftgHeight(ph) * LIFT * (liftScale == null ? 1 : liftScale);
        var hip = [cx + lg.dx, hipY];
        var foot = [hip[0] + fx, fy];
        var dx = foot[0] - hip[0],
          dy = foot[1] - hip[1];
        var d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.01);
        var base = Math.atan2(dy, dx);
        var bend = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
        var ang = base + (lg.front ? bend : -bend);
        var knee = [hip[0] + L1 * Math.cos(ang), hip[1] + L1 * Math.sin(ang)];
        put(lg.a, hip, knee);
        put(lg.b, knee, foot);
        lg.f.setAttribute('cx', foot[0].toFixed(1));
        lg.f.setAttribute('cy', foot[1].toFixed(1));
      });
    }

    return { el: g, pose: pose };
  }

  /* ── 小地形图：场景 1 的六种野外地形、场景 5 的三类训练地形。颜色是「图片」本身，不跟随站点主题。 */
  function terrainTile(parent, kind, x, y, w, h, seed) {
    var rng = mulberry32(seed || 7);
    var g = group(parent);
    var defs = svgEl('defs', {});
    g.appendChild(defs);
    var clipId = 'qt-x-clip-' + kind + '-' + Math.round(x) + '-' + Math.round(y);
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
    var sky = { mud: '#9fb2c4', snow: '#b9c7d6', rubble: '#c9c3b8', veg: '#a7c1a1', stream: '#9fb8c8', moss: '#8ea38a', hills: '#2b3442', steps: '#2b3442', stairs: '#2b3442' }[kind];
    add('rect', { x: x, y: y, width: w, height: h, fill: sky });
    var i, px;
    if (kind === 'mud') {
      add('path', { d: 'M ' + x + ' ' + (y + h * 0.55) + ' Q ' + (x + w * 0.4) + ' ' + (y + h * 0.45) + ' ' + (x + w) + ' ' + (y + h * 0.58) + ' L ' + (x + w) + ' ' + (y + h) + ' L ' + x + ' ' + (y + h) + ' Z', fill: '#6b4a2e' });
      for (i = 0; i < 4; i++) add('ellipse', { cx: x + w * (0.15 + 0.23 * i), cy: y + h * (0.72 + 0.12 * (i % 2)), rx: w * 0.1, ry: h * 0.05, fill: '#4a3220' });
    } else if (kind === 'snow') {
      add('path', { d: 'M ' + x + ' ' + (y + h * 0.85) + ' L ' + (x + w) + ' ' + (y + h * 0.3) + ' L ' + (x + w) + ' ' + (y + h) + ' L ' + x + ' ' + (y + h) + ' Z', fill: '#eef3f8' });
      for (i = 0; i < 3; i++) add('path', { d: 'M ' + (x + w * (0.6 + 0.12 * i)) + ' ' + (y + h * 0.5) + ' l 4 -14 l 4 14 Z', fill: '#4d6b4f' });
    } else if (kind === 'rubble') {
      add('rect', { x: x, y: y + h * 0.62, width: w, height: h * 0.38, fill: '#8d877d' });
      for (i = 0; i < 9; i++) {
        px = x + rng() * w;
        var py = y + h * (0.55 + rng() * 0.35),
          s = 6 + rng() * 9;
        add('path', { d: 'M ' + px + ' ' + py + ' l ' + s + ' ' + -s * 0.5 + ' l ' + s * 0.7 + ' ' + s * 0.6 + ' l ' + -s * 0.4 + ' ' + s * 0.5 + ' Z', fill: ['#6f6a62', '#a39d92', '#5d5852'][i % 3] });
      }
    } else if (kind === 'veg') {
      add('rect', { x: x, y: y + h * 0.75, width: w, height: h * 0.25, fill: '#4b3a26' });
      for (i = 0; i < 26; i++) {
        px = x + rng() * w;
        add('path', { d: 'M ' + px + ' ' + (y + h) + ' q ' + (rng() * 10 - 5) + ' ' + -h * 0.4 + ' ' + (rng() * 14 - 7) + ' ' + -h * (0.5 + rng() * 0.35), stroke: ['#2f6b2a', '#3f8a35', '#24561f'][i % 3], 'stroke-width': 2.2, fill: 'none' });
      }
    } else if (kind === 'stream') {
      add('rect', { x: x, y: y + h * 0.5, width: w, height: h * 0.5, fill: '#5b4630' });
      add('path', { d: 'M ' + x + ' ' + (y + h * 0.62) + ' q ' + w * 0.25 + ' -8 ' + w * 0.5 + ' 0 t ' + w * 0.5 + ' 0 L ' + (x + w) + ' ' + (y + h * 0.9) + ' q ' + -w * 0.25 + ' 8 ' + -w * 0.5 + ' 0 t ' + -w * 0.5 + ' 0 Z', fill: '#3f7fb3' });
      for (i = 0; i < 3; i++) add('path', { d: 'M ' + (x + w * (0.1 + 0.3 * i)) + ' ' + (y + h * 0.76) + ' q 6 -4 12 0', stroke: '#cfe6f7', 'stroke-width': 1.4, fill: 'none' });
    } else if (kind === 'moss') {
      add('rect', { x: x + w * 0.7, y: y, width: w * 0.09, height: h * 0.7, fill: '#4a3a2a' });
      add('path', { d: 'M ' + x + ' ' + (y + h * 0.68) + ' Q ' + (x + w * 0.5) + ' ' + (y + h * 0.58) + ' ' + (x + w) + ' ' + (y + h * 0.7) + ' L ' + (x + w) + ' ' + (y + h) + ' L ' + x + ' ' + (y + h) + ' Z', fill: '#3e5f2c' });
      for (i = 0; i < 7; i++) add('ellipse', { cx: x + rng() * w, cy: y + h * (0.75 + rng() * 0.2), rx: 6 + rng() * 6, ry: 3, fill: '#6f9a45' });
    } else if (kind === 'hills') {
      var pts = [];
      for (i = 0; i <= 40; i++) pts.push([x + (w * i) / 40, y + h * 0.62 - h * 0.22 * Math.sin(i / 5.5) - h * 0.06 * Math.sin(i * 1.7)]);
      pts.push([x + w, y + h], [x, y + h]);
      add('path', { d: polyPath(pts) + ' Z', fill: '#7d8ea3' });
    } else if (kind === 'steps') {
      var bw = w / 7;
      for (i = 0; i < 7; i++) {
        var bh = h * (0.18 + 0.4 * rng());
        add('rect', { x: x + i * bw, y: y + h - bh, width: bw + 0.5, height: bh, fill: ['#7d8ea3', '#91a2b6', '#6c7d92'][i % 3] });
      }
    } else if (kind === 'stairs') {
      var sw = w / 8;
      for (i = 0; i < 8; i++) {
        var lvl = i < 4 ? i : 7 - i;
        add('rect', { x: x + i * sw, y: y + h * (0.82 - 0.14 * lvl), width: sw + 0.5, height: h * (0.18 + 0.14 * lvl), fill: i % 2 ? '#8496ab' : '#7487a0' });
      }
    }
    g.appendChild(paint(svgEl('rect', { x: x + 0.5, y: y + 0.5, width: w - 1, height: h - 1, rx: 4, fill: 'none', 'stroke-width': 1 }), null, C_BORDER));
    return g;
  }

  /* ── scene 1: 野外为什么难 ── */
  var FIELD = [
    ['mud', '泥地 · 会陷'],
    ['snow', '雪坡 · 会滑'],
    ['rubble', '碎石 · 会动'],
    ['veg', '厚植被 · 会绊'],
    ['stream', '溪流 · 会冲'],
    ['moss', '湿苔藓 · 会滑']
  ];

  function buildSceneProblem() {
    var s = sceneSvg('野外的泥地、雪坡、碎石、厚植被、溪流和湿苔藓；传统状态机靠经验阈值估计接触，外部感知测不出摩擦和软硬还会被遮挡，只剩本体感知；这篇的三个关键是 TCN 读本体历史、特权教师到学生、自适应地形课程；只在刚性地形的仿真里训练，零样本上两代 ANYmal');
    s.appendChild(svgText(30, 28, '野外没有地形真值：会陷、会滑、会动、会绊腿', 'demo-x-ink2', 13.5));
    var tiles = FIELD.map(function (f, i) {
      var g = group(s);
      terrainTile(g, f[0], 30 + i * 124, 40, 116, 64, 11 + i);
      g.appendChild(svgText(88 + i * 124, 122, f[1], 'demo-x-ink2', 11, 'middle'));
      return g;
    });

    function column(x, w, color, dash, head, lines, last, lastCls) {
      var g = group(s);
      rectBox(g, x, 142, w, 124, color, C_SURFACE, dash);
      g.appendChild(svgText(x + 14, 164, head, null, 12.5));
      lines.forEach(function (str, k) {
        g.appendChild(svgText(x + 14, 190 + k * 22, str, 'demo-x-ink2', 11));
      });
      g.appendChild(svgText(x + 14, 252, last, lastCls, 11.5));
      return g;
    }
    var colA = column(30, 240, C_BAD, '4 3', '传统控制器', ['状态机调度运动原语和反射', '接触 / 打滑估计靠经验阈值'], '泥、雪、植被里阈值失灵', 'demo-x-bad');
    var colB = column(280, 240, C_BAD, '4 3', '外部感知：相机 / 激光雷达', ['测不出摩擦、软硬', '被雪、水、植被挡住'], '脚下松土塌陷也跟不上', 'demo-x-bad');
    var colC = column(530, 240, C_GOOD, null, '本体感知：关节编码器 + IMU', ['腿式机器人上最耐用的传感器', '高频感受身体自己的状态'], '这篇只用它', 'demo-x-good');

    var keys = group(s);
    keys.appendChild(svgText(30, 292, '这篇的三个关键', 'demo-x-ink2', 12));
    var keyChips = ['① **TCN** 读 2 秒本体历史', '② **特权教师** → 本体学生', '③ **自适应地形课程**'].map(function (str, i) {
      return chip(keys, 30 + i * 250, 302, 240, str, C_ACCENT, { h: 34, size: 12 });
    });
    var fin = group(s);
    chip(fin, 30, 352, 740, '仿真里只有刚性地形（丘陵 · 台阶 · 楼梯）→ **零样本**上两代 ANYmal 真机，不做任何微调', C_GOOD, { h: 36, size: 12.5 });

    function draw(t) {
      tiles.forEach(function (g, i) {
        setOpacity(g, seg(t, 0.3 + i * 0.25, 0.7 + i * 0.25));
      });
      setOpacity(colA, seg(t, 3.6, 4.2));
      setOpacity(colB, seg(t, 7.4, 8.0));
      setOpacity(colC, seg(t, 9.2, 9.8));
      setOpacity(keys, seg(t, 10.6, 10.9));
      keyChips.forEach(function (c, i) {
        setOpacity(c, seg(t, 10.7 + i * 0.8, 11.2 + i * 0.8));
      });
      setOpacity(fin, seg(t, 13.6, 14.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 2: 相位振荡器 + 足端残差 ── */
  function buildSceneFtg() {
    var s = sceneSvg('每条腿一个相位，零到 π 是支撑相，π 到 2π 是摆动相；摆动相按三次样条抬脚，k 等于 0.5 时 10 厘米，k 等于 1 时最高 20 厘米；策略每步输出 4 个频率偏移和 12 个足端残差共 16 维，经解析逆运动学交给 400 赫兹的关节 PD；每 0.02 秒相位前进 9 度，一个周期 40 步');
    s.appendChild(svgText(30, 28, '策略不直接出关节角：每条腿一个相位振荡器，策略只做「调制」', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'qt-x-arrow-s2', C_MUTED);

    // 左：F(φ) 曲线
    var PX0 = 70,
      PX1 = 380,
      PY0 = 206,
      PY1 = 86;
    function sx(u) {
      return PX0 + (u / 2) * (PX1 - PX0);
    }
    function sy(hm) {
      return PY0 - (hm / FTG_H) * (PY0 - PY1);
    }
    var plotG = group(s);
    plotG.appendChild(paint(svgEl('rect', { x: sx(0), y: PY1 - 14, width: sx(1) - sx(0), height: PY0 - PY1 + 14, opacity: 0.35 }), C_SURFACE2));
    plotG.appendChild(paint(svgEl('line', { x1: PX0, y1: PY0, x2: PX1, y2: PY0, 'stroke-width': 1 }), null, C_BORDER));
    plotG.appendChild(paint(svgEl('line', { x1: PX0, y1: PY0, x2: PX0, y2: PY1 - 14, 'stroke-width': 1 }), null, C_BORDER));
    [[0, '0'], [1, 'π'], [1.25, '1.25π'], [1.5, '1.5π'], [2, '2π']].forEach(function (tk) {
      plotG.appendChild(svgText(sx(tk[0]), PY0 + 16, tk[1], 'demo-x-mut demo-x-mono', 10, 'middle'));
    });
    [[0, '0'], [0.1, '10'], [0.2, '20 cm']].forEach(function (tk) {
      plotG.appendChild(svgText(PX0 - 6, sy(tk[0]) + 4, tk[1], 'demo-x-mut demo-x-mono', 10, 'end'));
      plotG.appendChild(paint(svgEl('line', { x1: PX0, y1: sy(tk[0]), x2: PX1, y2: sy(tk[0]), 'stroke-width': 0.6, 'stroke-dasharray': '2 4' }), null, C_BORDER));
    });
    plotG.appendChild(svgRich(sx(0.5), PY1 - 2, '支撑相 $[0, \\pi)$', { size: 11, anchor: 'middle', w: 150, cls: 'demo-x-mut' }));
    plotG.appendChild(svgRich(sx(1.5) - 40, PY1 - 34, '摆动相 $[\\pi, 2\\pi)$', { size: 11, anchor: 'middle', w: 150, cls: 'demo-x-mut' }));
    var curvePts = [];
    for (var i = 0; i <= 120; i++) {
      var u = (i / 120) * 2;
      curvePts.push([sx(u), sy(ftgHeight(u * Math.PI))]);
    }
    var curve = pathLine(plotG, curvePts, C_ACCENT, 2.6);
    var mover = paint(svgEl('circle', { r: 5 }), C_WARN);
    s.appendChild(mover);

    var marks = group(s);
    marks.appendChild(paint(svgEl('circle', { cx: sx(1.25), cy: sy(ftgHeight(1.25 * Math.PI)), r: 4 }), C_GOOD));
    marks.appendChild(svgRich(sx(1.25) - 8, sy(0.1) - 8, '$k = 0.5$：10 cm', { size: 10.5, anchor: 'end', w: 120, cls: 'demo-x-good' }));
    marks.appendChild(paint(svgEl('circle', { cx: sx(1.5), cy: sy(FTG_H), r: 4 }), C_GOOD));
    marks.appendChild(svgRich(sx(1.5) + 14, sy(FTG_H) - 14, '$k = 1$：20 cm', { size: 10.5, w: 110, cls: 'demo-x-good' }));

    var formula = group(s);
    formula.appendChild(svgMath(30, 248, 'F(\\varphi) = h\\,(-2k^3 + 3k^2),\\quad k = \\tfrac{2(\\varphi - \\pi)}{\\pi} \\in [0, 1]', { size: 12.5, w: 370 }));
    formula.appendChild(svgRich(30, 276, '下降段 $h\\,(2k^3 - 9k^2 + 12k - 4)$，$h = 0.2$ m，$f_0 = 1.25$ Hz', { size: 11, w: 370, cls: 'demo-x-ink2' }));

    // 右上：跑步机上的四足
    var robotG = group(s);
    rectBox(robotG, 410, 40, 360, 112, C_BORDER, C_SURFACE2);
    var ground = paint(svgEl('line', { x1: 420, y1: 134, x2: 760, y2: 134, 'stroke-width': 1.4 }), null, C_MUTED);
    robotG.appendChild(ground);
    var ticks = [];
    for (var k = 0; k < 12; k++) {
      var tk = paint(svgEl('line', { y1: 134, y2: 142, 'stroke-width': 1 }), null, C_MUTED);
      robotG.appendChild(tk);
      ticks.push(tk);
    }
    var quad = quadFigure(robotG, 1.35, C_INK);
    robotG.appendChild(svgText(420, 56, '对角腿同相：小跑（trot）', 'demo-x-mut', 10.5));

    // 右中：控制管线
    var pipe = group(s);
    var PIPE = [
      ['策略', '50 Hz', C_ACCENT],
      ['$F(\\varphi_i) + \\Delta r$', '目标脚位', C_BORDER],
      ['解析 IK', '水平系 → 关节角', C_BORDER],
      ['关节 PD', '400 Hz', C_BORDER]
    ];
    var pipeBoxes = PIPE.map(function (p, i) {
      var x = 410 + i * 93;
      var g = group(pipe);
      rectBox(g, x, 166, 80, 46, p[2]);
      g.appendChild(svgRich(x + 40, 186, p[0], { size: 11.5, anchor: 'middle', w: 78 }));
      g.appendChild(svgText(x + 40, 204, p[1], 'demo-x-mut', 9.5, 'middle'));
      if (i < PIPE.length - 1) arrowPath(g, [[x + 80, 189], [x + 91, 189]], C_MUTED, mk);
      return g;
    });
    var outLine = svgRich(410, 236, '每步 **16 维** = 4 个频率偏移 $f_i$ + 12 个足端残差 $\\Delta r$', { size: 11, w: 360, cls: 'demo-x-acc' });
    s.appendChild(outLine);
    var actLine = svgRich(410, 262, '仿真里 PD + 串联弹性执行器用学出来的**执行器网络**建模', { size: 10.5, w: 360, cls: 'demo-x-mut' });
    s.appendChild(actLine);

    var hChip = group(s);
    chip(hChip, 30, 300, 740, '目标脚位定义在水平坐标系 $H_i$：跟着机身转向，不跟俯仰、横滚 —— 训练初期乱动时也少摔', C_BORDER, { h: 34, size: 11.5 });
    var phChip = group(s);
    chip(phChip, 30, 350, 740, '相位推进 $\\varphi_i \\leftarrow \\varphi_i + 2\\pi(f_0 + f_i)\\,\\Delta t$：$f_0 = 1.25$ Hz、$\\Delta t = 0.02$ s → 每步 **9°**，一个周期 **40 步 = 0.8 s**', C_ACCENT, { h: 38, size: 12 });

    function draw(t, clock) {
      var now = clock == null ? t : clock;
      setOpacity(plotG, seg(t, 0.3, 0.9));
      drawOn(curve, ease(seg(t, 0.6, 2.6)));
      var ph = (Math.PI + 2 * Math.PI * F0 * now) % (2 * Math.PI);
      mover.setAttribute('cx', sx(ph / Math.PI).toFixed(1));
      mover.setAttribute('cy', sy(ftgHeight(ph)).toFixed(1));
      setOpacity(mover, seg(t, 2.6, 3.0));
      setOpacity(formula, seg(t, 3.8, 4.4));
      setOpacity(marks, seg(t, 5.0, 5.6));
      setOpacity(robotG, seg(t, 0.8, 1.4));
      quad.pose(590, 134, 2 * Math.PI * F0 * now);
      var shift = ((now * 60) % 30 + 30) % 30;
      ticks.forEach(function (tk, j) {
        var x = 760 - shift - j * 30;
        tk.setAttribute('x1', x.toFixed(1));
        tk.setAttribute('x2', (x - 6).toFixed(1));
        setOpacity(tk, x > 424 ? 1 : 0);
      });
      pipeBoxes.forEach(function (g, j) {
        setOpacity(g, seg(t, j === 0 ? 7.6 : 11.0 + (j - 1) * 0.4, (j === 0 ? 7.6 : 11.0 + (j - 1) * 0.4) + 0.5));
      });
      setOpacity(outLine, seg(t, 8.2, 8.8));
      setOpacity(actLine, seg(t, 12.2, 12.8));
      setOpacity(hChip, seg(t, 11.6, 12.2));
      setOpacity(phChip, seg(t, 13.8, 14.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 3: 特权教师 ── */
  var PRIV_ROWS = [
    ['每只脚周围 9 个高度点', 36],
    ['每只脚下的地形法向', 12],
    ['足端接触力', 4],
    ['接触状态：脚 / 大腿 / 小腿', 12],
    ['足地摩擦系数', 4],
    ['施加在机身上的外力', 3]
  ];

  function buildSceneTeacher() {
    var s = sceneSvg('教师的输入除了 121 维的机器人状态，还有 71 维特权信息：每只脚周围 9 个高度点、地形法向、接触力与接触状态、摩擦系数、外力；特权信息经 MLP 编码成 64 维潜向量，和状态拼起来输出 16 维动作；命令只给方向，速度奖励到 0.6 米每秒封顶；总奖励 7 项加权；TRPO 训练约 12 小时');
    s.appendChild(svgText(30, 28, '第一步：特权教师 —— 仿真里把地形和接触的真值直接喂给它', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'qt-x-arrow-s3', C_MUTED);

    var list = group(s);
    list.appendChild(svgRich(30, 52, '特权信息 $x_t$：**71 维**，真机上拿不到', { size: 12, w: 280, cls: 'demo-x-acc' }));
    var rows = PRIV_ROWS.map(function (r, i) {
      var g = group(list);
      g.appendChild(svgText(36, 80 + i * 24, r[0], 'demo-x-ink2', 11));
      g.appendChild(svgText(296, 80 + i * 24, String(r[1]), 'demo-x-mono demo-x-acc', 11, 'end'));
      return g;
    });
    var scan = group(s);
    scan.appendChild(paint(svgEl('circle', { cx: 112, cy: 244, r: 26, fill: 'none', 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_MUTED));
    for (var q = 0; q < 9; q++) {
      var a = (q / 9) * 2 * Math.PI;
      scan.appendChild(paint(svgEl('circle', { cx: 112 + 26 * Math.cos(a), cy: 244 + 26 * Math.sin(a), r: 3 }), C_WARN));
    }
    scan.appendChild(paint(svgEl('circle', { cx: 112, cy: 244, r: 6 }), C_INK));
    scan.appendChild(svgText(150, 240, '一只脚：半径 10 cm', 'demo-x-mut', 10));
    scan.appendChild(svgText(150, 256, '一圈 9 个高度点', 'demo-x-mut', 10));

    var net = group(s);
    function nbox(x, y, w, str, color) {
      var g = group(net);
      rectBox(g, x, y, w, 30, color || C_BORDER);
      g.appendChild(svgRich(x + w / 2, y + 19, str, { size: 11, anchor: 'middle', w: w - 4 }));
      return g;
    }
    var enc = group(net);
    var bx = nbox(322, 60, 62, '$x_t$ · 71', C_WARN);
    enc.appendChild(bx);
    enc.appendChild(nbox(404, 60, 150, 'MLP 编码器 72 → 64'));
    arrowPath(enc, [[384, 75], [402, 75]], C_MUTED, mk);
    enc.appendChild(nbox(424, 112, 110, '$\\bar{l}_t$ · 64 维', C_ACCENT));
    arrowPath(enc, [[479, 90], [479, 110]], C_MUTED, mk);
    var head = group(net);
    head.appendChild(nbox(322, 164, 62, '$o_t$ · 121'));
    head.appendChild(svgText(322, 208, '命令、姿态、速度、关节、', 'demo-x-mut', 9.5));
    head.appendChild(svgText(322, 222, '相位、上两步的目标', 'demo-x-mut', 9.5));
    head.appendChild(nbox(404, 164, 150, 'MLP 256 → 128 → 64'));
    arrowPath(head, [[384, 179], [402, 179]], C_MUTED, mk);
    arrowPath(head, [[479, 142], [479, 162]], C_MUTED, mk);
    var out = group(net);
    out.appendChild(nbox(434, 222, 90, '$\\bar{a}_t$ · 16', C_GOOD));
    arrowPath(out, [[479, 194], [479, 220]], C_MUTED, mk);

    // 右：速度奖励曲线
    var rl = group(s);
    var RX0 = 600,
      RX1 = 760,
      RY0 = 200,
      RY1 = 84;
    function rx(v) {
      return RX0 + (v / 0.8) * (RX1 - RX0);
    }
    function ry(r) {
      return RY0 - r * (RY0 - RY1);
    }
    rl.appendChild(svgRich(578, 54, '$r_{lv}$：命令方向上的速度 $v_{pr}$', { size: 11, w: 200, cls: 'demo-x-ink2' }));
    rl.appendChild(paint(svgEl('line', { x1: RX0, y1: RY0, x2: RX1, y2: RY0, 'stroke-width': 1 }), null, C_BORDER));
    rl.appendChild(paint(svgEl('line', { x1: RX0, y1: RY0, x2: RX0, y2: RY1 - 6, 'stroke-width': 1 }), null, C_BORDER));
    [0, 0.2, 0.4, 0.6, 0.8].forEach(function (v) {
      rl.appendChild(svgText(rx(v), RY0 + 14, fmt(v, 1), 'demo-x-mut demo-x-mono', 9.5, 'middle'));
    });
    rl.appendChild(svgText(RX1, RY0 + 28, 'm/s', 'demo-x-mut', 9.5, 'end'));
    [0, 0.5, 1].forEach(function (r) {
      rl.appendChild(svgText(RX0 - 5, ry(r) + 3, fmt(r, r === 0.5 ? 1 : 0), 'demo-x-mut demo-x-mono', 9.5, 'end'));
    });
    var rpts = [];
    for (var j = 0; j <= 80; j++) rpts.push([rx(j / 100), ry(rewardLv(j / 100))]);
    var rcurve = pathLine(rl, rpts, C_ACCENT, 2.2);
    rl.appendChild(paint(svgEl('line', { x1: rx(V_CAP), y1: RY0, x2: rx(V_CAP), y2: RY1, 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_MUTED));
    rl.appendChild(svgText(rx(V_CAP) + 3, RY1 + 30, '封顶', 'demo-x-mut', 9.5));
    var rdots = [0.2, 0.4].map(function (v) {
      var g = group(rl);
      g.appendChild(paint(svgEl('circle', { cx: rx(v), cy: ry(rewardLv(v)), r: 3.5 }), C_WARN));
      g.appendChild(svgText(rx(v) + 4, ry(rewardLv(v)) + 14, fmt(rewardLv(v), 2), 'demo-x-warn demo-x-mono', 10));
      return g;
    });
    rl.appendChild(svgText(578, 236, '旧控制器平地最快 0.6 m/s', 'demo-x-mut', 10));

    var cmd = group(s);
    chip(cmd, 30, 282, 740, '命令只给方向 $(\\cos\\psi, \\sin\\psi)$ 和转向 $\\{-1, 0, 1\\}$，**不给目标速度**：陡坡、台阶上能走多快本来就说不准', C_BORDER, { h: 32, size: 11.5 });
    var rew = group(s);
    rew.appendChild(svgMath(400, 340, 'r = 0.05\\,r_{lv} + 0.05\\,r_{av} + 0.04\\,r_{b} + 0.01\\,r_{fc} + 0.02\\,r_{bc} + 0.025\\,r_{s} + 2{\\times}10^{-5}\\,r_{\\tau}', { size: 13, anchor: 'middle', w: 760 }));
    rew.appendChild(svgText(400, 366, '朝命令方向走 · 转向 · 机身平稳 · 摆动脚高过周围 · 机身别碰地 · 目标平滑 · 力矩小', 'demo-x-mut', 10.5, 'middle'));
    var train = svgRich(400, 396, '**TRPO**：10000 轮 × 每轮 8 万步，一台 i7-8700K + RTX 2080 的台式机约 **12 小时**', { size: 11.5, anchor: 'middle', w: 760, cls: 'demo-x-ink2' });
    s.appendChild(train);

    function draw(t) {
      setOpacity(list, seg(t, 0.3, 0.6));
      rows.forEach(function (g, i) {
        setOpacity(g, seg(t, 0.5 + i * 0.4, 0.9 + i * 0.4));
      });
      setOpacity(scan, seg(t, 1.6, 2.2));
      setOpacity(net, seg(t, 4.0, 4.1));
      setOpacity(enc, seg(t, 4.0, 4.6));
      setOpacity(head, seg(t, 5.0, 5.6));
      setOpacity(out, seg(t, 6.0, 6.6));
      setOpacity(rl, seg(t, 7.6, 8.1));
      drawOn(rcurve, ease(seg(t, 7.8, 9.0)));
      rdots.forEach(function (g, i) {
        setOpacity(g, seg(t, 9.2 + i * 0.5, 9.6 + i * 0.5));
      });
      setOpacity(cmd, seg(t, 8.4, 9.0));
      setOpacity(rew, seg(t, 11.4, 12.0));
      setOpacity(train, seg(t, 14.0, 14.6));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 4: 本体学生 ── */
  function buildSceneStudent() {
    var s = sceneSvg('学生只拿得到状态和 2 秒本体历史：每步 60 维、每 0.02 秒一次、共 100 步；TCN 三层因果空洞卷积得到 64 维潜向量；损失是动作与潜向量两项平方误差，后半段 MLP 复制教师；DAgger 采数据；同样的 TCN-20 直接用强化学习训，上坡和上台阶全部失败');
    s.appendChild(svgText(30, 28, '第二步：本体学生 —— 2 秒历史过 TCN，模仿教师的动作和潜向量', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'qt-x-arrow-s4', C_MUTED);
    var mkRed = K.arrowMarker(s, 'qt-x-arrow-s4r', C_BAD);

    // 左上：历史条
    var hist = group(s);
    var cols = [];
    var rng = mulberry32(5);
    for (var c = 0; c < 100; c++) {
      var col = group(hist);
      for (var r = 0; r < 6; r++) {
        var v = 0.5 + 0.35 * Math.sin(c * 0.39 + r * 1.3) + 0.15 * (rng() - 0.5);
        if (c > 60 && c < 66 && r < 3) v = 1;
        col.appendChild(paint(svgEl('rect', { x: 40 + c * 3.2, y: 52 + r * 11, width: 3.2, height: 11, opacity: (0.15 + 0.75 * clamp(v, 0, 1)).toFixed(2) }), r < 3 ? C_ACCENT : C_WARN));
      }
      cols.push(col);
    }
    hist.appendChild(svgRich(40, 132, '$h_{t-100}$', { size: 10.5, w: 80, cls: 'demo-x-mut' }));
    hist.appendChild(svgRich(360, 132, '$h_{t-1}$', { size: 10.5, anchor: 'end', w: 80, cls: 'demo-x-mut' }));
    hist.appendChild(svgRich(200, 150, '每步 **60 维** × **100 步** × 0.02 s = **2 s**', { size: 11.5, anchor: 'middle', w: 320, cls: 'demo-x-ink2' }));

    // 左下：TCN 的空洞卷积
    var tcn = group(s);
    var NX = 16,
      X0 = 44,
      DX = 16,
      ROWS = [272, 248, 224, 200];
    var DIL = [1, 2, 4];
    var hiCol = NX - 1;
    for (var rr = 0; rr < 3; rr++) {
      for (var n = 0; n < NX; n++) {
        [n, n - DIL[rr]].forEach(function (m) {
          if (m < 0) return;
          tcn.appendChild(paint(svgEl('line', { x1: X0 + m * DX, y1: ROWS[rr], x2: X0 + n * DX, y2: ROWS[rr + 1], 'stroke-width': 0.6, opacity: 0.45 }), null, C_MUTED));
        });
      }
    }
    var field = group(tcn);
    var reach = [[hiCol]];
    for (var r2 = 2; r2 >= 0; r2--) {
      var next = [];
      reach[0].forEach(function (n) {
        [n, n - DIL[r2]].forEach(function (m) {
          if (m >= 0 && next.indexOf(m) < 0) next.push(m);
          field.appendChild(paint(svgEl('line', { x1: X0 + m * DX, y1: ROWS[r2], x2: X0 + n * DX, y2: ROWS[r2 + 1], 'stroke-width': 1.6 }), null, C_ACCENT));
        });
      });
      reach.unshift(next);
    }
    ROWS.forEach(function (y, ri) {
      for (var n2 = 0; n2 < NX; n2++) tcn.appendChild(paint(svgEl('circle', { cx: X0 + n2 * DX, cy: y, r: ri === 3 && n2 === hiCol ? 4.5 : 2.6 }), ri === 3 && n2 === hiCol ? C_ACCENT : C_MUTED));
    });
    tcn.appendChild(svgRich(320, 204, '→ tanh 64 → $l_t$', { size: 11, w: 100, cls: 'demo-x-acc' }));
    tcn.appendChild(svgText(310, 240, '空洞 1 / 2 / 4', 'demo-x-mut', 10));
    tcn.appendChild(svgText(310, 256, '穿插步长 2 降采样', 'demo-x-mut', 10));
    tcn.appendChild(svgText(310, 272, '只看过去（因果）', 'demo-x-mut', 10));

    // 右：教师 / 学生两行
    var duo = group(s);
    function dbox(x, y, w, str, color) {
      var g = group(duo);
      rectBox(g, x, y, w, 28, color || C_BORDER);
      g.appendChild(svgRich(x + w / 2, y + 18, str, { size: 11, anchor: 'middle', w: w - 2 }));
      return g;
    }
    var tRow = group(duo);
    tRow.appendChild(svgText(440, 52, '教师（只在仿真里）', 'demo-x-mut', 10));
    [[440, 50, '$x_t$'], [508, 66, '编码器'], [592, 50, '$\\bar{l}_t$'], [660, 62, 'MLP 头'], [740, 34, '$\\bar{a}_t$']].forEach(function (b, i, arr) {
      tRow.appendChild(dbox(b[0], 60, b[1], b[2], i === 2 || i === 4 ? C_ACCENT : null));
      if (i < arr.length - 1) arrowPath(tRow, [[b[0] + b[1], 74], [arr[i + 1][0] - 2, 74]], C_MUTED, mk);
    });
    var sRow = group(duo);
    sRow.appendChild(svgText(440, 164, '学生（上真机）', 'demo-x-mut', 10));
    [[440, 50, '$H$'], [508, 66, 'TCN'], [592, 50, '$l_t$'], [660, 62, 'MLP 头'], [740, 34, '$a_t$']].forEach(function (b, i, arr) {
      sRow.appendChild(dbox(b[0], 172, b[1], b[2], i === 2 || i === 4 ? C_GOOD : null));
      if (i < arr.length - 1) arrowPath(sRow, [[b[0] + b[1], 186], [arr[i + 1][0] - 2, 186]], C_MUTED, mk);
    });
    var links = group(duo);
    arrowPath(links, [[691, 90], [691, 170]], C_MUTED, mk, '4 3');
    links.appendChild(svgText(697, 134, '复制', 'demo-x-mut', 10));
    arrowPath(links, [[617, 90], [617, 170]], C_BAD, mkRed);
    arrowPath(links, [[757, 90], [757, 170]], C_BAD, mkRed);
    links.appendChild(svgText(612, 134, '模仿', 'demo-x-bad', 10, 'end'));
    var loss = svgMath(605, 232, '\\mathcal{L} = (\\bar{a}_t - a_t)^2 + (\\bar{l}_t - l_t)^2', { size: 14, anchor: 'middle', w: 330 });
    s.appendChild(loss);
    var dag = group(s);
    chip(dag, 440, 252, 330, '**DAgger**：学生自己走，教师给它走到的每个状态打标签', C_ACCENT, { h: 30, size: 10.5 });

    // 底：为什么非要教师
    var abl = group(s);
    abl.appendChild(svgText(30, 308, '为什么非要教师？同样的 TCN-20（图 5E–G，读图）', 'demo-x-ink2', 12));
    var AB = [
      ['10° 坡上的速度', PRIV_NO.slope, PRIV_YES.slope, 0.4, ' m/s', 2],
      ['16 cm 台阶成功率', PRIV_NO.step16, PRIV_YES.step16, 100, '%', 0],
      ['平均回合长度（满 400 步）', PRIV_NO.eplen, PRIV_YES.eplen, 400, ' 步', 0]
    ];
    var ablBars = AB.map(function (a, i) {
      var x = 30 + i * 250;
      var g = group(abl);
      g.appendChild(svgText(x, 330, a[0], 'demo-x-mut', 10.5));
      var b1 = hbar(g, x, 340, 0, 14, C_BAD, 0.9);
      var b2 = hbar(g, x, 360, 0, 14, C_ACCENT, 0.9);
      var l1 = svgText(x + 4, 351, '', 'demo-x-mono demo-x-bad', 10);
      var l2 = svgText(x + 4, 371, '', 'demo-x-mono demo-x-acc', 10);
      g.appendChild(l1);
      g.appendChild(l2);
      return { g: g, b1: b1, b2: b2, l1: l1, l2: l2, a: a, x: x };
    });
    abl.appendChild(svgText(30, 398, '红：直接用强化学习训（奖励太稀疏）　蓝：先训教师再蒸馏', 'demo-x-mut', 10.5));

    function draw(t) {
      setOpacity(hist, seg(t, 0.3, 0.6));
      var shown = seg(t, 0.3, 2.3) * 100;
      cols.forEach(function (cg, k) {
        setOpacity(cg, k < shown ? 1 : 0);
      });
      setOpacity(tcn, seg(t, 3.8, 4.4));
      setOpacity(field, seg(t, 5.0, 5.6));
      setOpacity(duo, seg(t, 7.2, 7.3));
      setOpacity(tRow, seg(t, 7.2, 7.7));
      setOpacity(sRow, seg(t, 7.6, 8.1));
      setOpacity(links, seg(t, 8.4, 8.9));
      setOpacity(loss, seg(t, 9.0, 9.5));
      setOpacity(dag, seg(t, 10.6, 11.2));
      setOpacity(abl, seg(t, 13.2, 13.5));
      ablBars.forEach(function (b, i) {
        var u = ease(seg(t, 13.4 + i * 0.4, 14.4 + i * 0.4));
        var W = 150;
        setW(b.b1, (b.a[1] / b.a[3]) * W * u);
        setW(b.b2, (b.a[2] / b.a[3]) * W * u);
        b.l1.setAttribute('x', (b.x + (b.a[1] / b.a[3]) * W * u + 5).toFixed(1));
        b.l2.setAttribute('x', (b.x + (b.a[2] / b.a[3]) * W * u + 5).toFixed(1));
        b.l1.textContent = u > 0 ? (b.a[1] === 0 ? '0' : '约 ' + fmt(b.a[1] * u, b.a[5]) + b.a[4]) : '';
        b.l2.textContent = u > 0 ? '约 ' + fmt(b.a[2] * u, b.a[5]) + b.a[4] : '';
      });
    }

    return { el: s, draw: draw };
  }

  /* ── scene 5: 自适应地形课程 ── */
  var CURR_FRAMES = null;

  function buildSceneCurriculum() {
    var s = sceneSvg('训练地形是程序生成的丘陵、台阶、楼梯；每步朝命令方向速度超过 0.2 米每秒记 1，一条轨迹的平均是可通过性，落在 0.5 到 0.9 的地形值得练；图 S1A 四个丘陵的可通过性是 0.91、0.56、0.67、0.15；粒子滤波追踪值得练的参数；没有课程时 25 度坡速度和 18 厘米台阶成功率都大幅下降');
    s.appendChild(svgText(30, 28, '自适应地形课程：只练「刚好够难」的地形', 'demo-x-ink2', 13.5));

    var kinds = group(s);
    [['hills', '丘陵（柏林噪声）', '粗糙度 · 频率 · 幅度'], ['steps', '台阶（随机高的方块）', '方块宽 · 最大高度'], ['stairs', '楼梯', '台阶宽 · 台阶高']].forEach(function (k, i) {
      var g = group(kinds);
      terrainTile(g, k[0], 30 + i * 122, 42, 112, 56, 21 + i);
      g.appendChild(svgText(86 + i * 122, 114, k[1], 'demo-x-ink2', 10.5, 'middle'));
      g.appendChild(svgText(86 + i * 122, 130, k[2], 'demo-x-mut', 9.5, 'middle'));
    });
    kinds.appendChild(svgRich(30, 150, '另有低摩擦的「湿滑丘陵」：摩擦 $\\mathcal{N}(0.3, 0.1)$', { size: 10, w: 360, cls: 'demo-x-mut' }));

    var lab = group(s);
    lab.appendChild(svgRich(410, 50, '每步：朝命令方向的速度 $v_{pr} > 0.2$ m/s 记 1，否则（含摔倒）记 0', { size: 11, w: 360, cls: 'demo-x-ink2' }));
    lab.appendChild(svgRich(410, 74, '可通过性 $Tr$ = 一条轨迹上的平均值', { size: 11, w: 360, cls: 'demo-x-ink2' }));
    var BX0 = 420,
      BX1 = 760;
    function bx(v) {
      return BX0 + v * (BX1 - BX0);
    }
    lab.appendChild(paint(svgEl('rect', { x: BX0, y: 90, width: BX1 - BX0, height: 14, rx: 3 }), C_SURFACE2));
    lab.appendChild(paint(svgEl('rect', { x: bx(TR_LO), y: 90, width: bx(TR_HI) - bx(TR_LO), height: 14, rx: 3 }), C_GOOD));
    [0, 0.5, 0.9, 1].forEach(function (v) {
      lab.appendChild(svgText(bx(v), 118, fmt(v, v % 1 ? 1 : 0), 'demo-x-mut demo-x-mono', 9.5, 'middle'));
    });
    lab.appendChild(svgText(bx(0.25), 136, '太难', 'demo-x-bad', 10.5, 'middle'));
    lab.appendChild(svgText(bx(0.7), 136, '值得练', 'demo-x-good', 10.5, 'middle'));
    lab.appendChild(svgText(bx(0.95), 136, '太易', 'demo-x-mut', 10.5, 'middle'));

    var s1a = group(s);
    s1a.appendChild(svgText(30, 172, '补充材料图 S1A 的四个丘陵', 'demo-x-ink2', 11));
    var s1aTiles = FIG_S1A.map(function (h, i) {
      var g = group(s1a);
      var x = 30 + i * 90,
        y = 182,
        w = 80,
        hh = 50;
      rectBox(g, x, y, w, hh, C_BORDER, C_SURFACE2);
      var pts = [];
      for (var k = 0; k <= 40; k++) {
        var u = k / 40;
        var z = 0.5 + 0.38 * (h.a / 2) * Math.sin(u * Math.PI * 2 * (0.6 + h.f * 2.2)) + (h.r > 0.1 ? 0.06 * Math.sin(u * 47) : 0);
        pts.push([x + 2 + u * (w - 4), y + hh - 4 - z * (hh - 14)]);
      }
      pathLine(g, pts, C_ACCENT, 1.6);
      var good = h.tr >= TR_LO && h.tr <= TR_HI;
      g.appendChild(svgRich(x + w / 2, y + hh + 18, '$Tr = ' + fmt(h.tr, 2) + '$', { size: 11, anchor: 'middle', w: w, cls: good ? 'demo-x-good' : h.tr > TR_HI ? 'demo-x-mut' : 'demo-x-bad' }));
      g.appendChild(svgText(x + w / 2, y + hh + 36, good ? '✓ 值得练' : h.tr > TR_HI ? '✗ 太容易' : '✗ 太难', good ? 'demo-x-good' : h.tr > TR_HI ? 'demo-x-mut' : 'demo-x-bad', 10.5, 'middle'));
      return g;
    });

    // 右中：粒子网格（复用演示 2 的玩具模型，种子 3）
    if (!CURR_FRAMES) CURR_FRAMES = toyCurriculum(3, 'pf', 60);
    var grid = group(s);
    grid.appendChild(svgText(410, 172, '粒子滤波：10 个粒子追着亮带走（玩具示意）', 'demo-x-ink2', 11));
    var GX0 = 452,
      GY0 = 278,
      CWX = 33,
      CHY = 9.6;
    var cells = [];
    for (var a = 0; a < CW.length; a++) {
      for (var b = 0; b < CH.length; b++) {
        var cell = paint(svgEl('rect', { x: GX0 + a * CWX, y: GY0 - (b + 1) * CHY, width: CWX - 1.5, height: CHY - 1.2, rx: 1.5 }), C_ACCENT);
        grid.appendChild(cell);
        cells.push({ a: a, b: b, el: cell });
      }
    }
    grid.appendChild(svgText(GX0 + (CW.length * CWX) / 2, GY0 + 14, '台阶宽 0.1 → 0.5 m', 'demo-x-mut', 9.5, 'middle'));
    grid.appendChild(svgText(GX0 - 6, GY0 - CH.length * CHY + 8, '高', 'demo-x-mut', 9.5, 'end'));
    grid.appendChild(svgText(GX0 - 6, GY0 - 2, '低', 'demo-x-mut', 9.5, 'end'));
    var dots = [];
    for (var d = 0; d < N_PARTICLE; d++) {
      var dt = paint(svgEl('circle', { r: 3.6, 'stroke-width': 1.2 }), C_GOOD, C_SURFACE2);
      grid.appendChild(dt);
      dots.push(dt);
    }
    var jit = mulberry32(9);
    var jx = [],
      jy = [];
    for (var e = 0; e < N_PARTICLE; e++) {
      jx.push((jit() - 0.5) * CWX * 0.55);
      jy.push((jit() - 0.5) * CHY * 0.5);
    }
    var iterLab = svgText(770, 172, '', 'demo-x-mut demo-x-mono', 10, 'end');
    grid.appendChild(iterLab);

    var abl = group(s);
    abl.appendChild(svgText(30, 308, '消融：同样训教师，改成在参数空间里均匀采样（图 5H–J，读图）', 'demo-x-ink2', 12));
    var AB = [
      ['25° 坡上的速度', CURR_NO.slope25, CURR_YES.slope25, 0.3, ' m/s', 2],
      ['18 cm 台阶成功率', CURR_NO.step18, CURR_YES.step18, 100, '%', 0],
      ['平均回合长度（满 400 步）', CURR_NO.eplen, CURR_YES.eplen, 400, ' 步', 0]
    ];
    var ablBars = AB.map(function (aa, i) {
      var x = 30 + i * 250;
      var g = group(abl);
      g.appendChild(svgText(x, 330, aa[0], 'demo-x-mut', 10.5));
      var b1 = hbar(g, x, 340, 0, 14, C_WARN, 0.9);
      var b2 = hbar(g, x, 360, 0, 14, C_GOOD, 0.9);
      var l1 = svgText(x + 4, 351, '', 'demo-x-mono demo-x-warn', 10);
      var l2 = svgText(x + 4, 371, '', 'demo-x-mono demo-x-good', 10);
      g.appendChild(l1);
      g.appendChild(l2);
      return { b1: b1, b2: b2, l1: l1, l2: l2, a: aa, x: x };
    });
    abl.appendChild(svgText(30, 398, '黄：均匀采样（常抽到过不去的地形，早早摔倒）　绿：自适应课程', 'demo-x-mut', 10.5));

    function draw(t) {
      setOpacity(kinds, seg(t, 0.3, 0.9));
      setOpacity(lab, seg(t, 3.6, 4.2));
      setOpacity(s1a, seg(t, 7.4, 7.7));
      s1aTiles.forEach(function (g, i) {
        setOpacity(g, seg(t, 7.5 + i * 0.6, 7.9 + i * 0.6));
      });
      setOpacity(grid, seg(t, 10.4, 10.9));
      var fi = Math.min(CURR_FRAMES.length - 1, Math.floor(seg(t, 10.8, 13.4) * (CURR_FRAMES.length - 1)));
      var fr = CURR_FRAMES[fi];
      cells.forEach(function (c) {
        setOpacity(c.el, 0.06 + 0.8 * toyDesirability(toyTr(c.a, c.b, fr.s)));
      });
      fr.cells.forEach(function (c, k) {
        dots[k].setAttribute('cx', (GX0 + c[0] * CWX + CWX / 2 + jx[k]).toFixed(1));
        dots[k].setAttribute('cy', (GY0 - c[1] * CHY - CHY / 2 + jy[k]).toFixed(1));
      });
      iterLab.textContent = '第 ' + fi + ' 次更新';
      setOpacity(abl, seg(t, 13.6, 13.9));
      ablBars.forEach(function (b, i) {
        var u = ease(seg(t, 13.8 + i * 0.4, 14.8 + i * 0.4));
        var W = 150;
        setW(b.b1, (b.a[1] / b.a[3]) * W * u);
        setW(b.b2, (b.a[2] / b.a[3]) * W * u);
        b.l1.setAttribute('x', (b.x + (b.a[1] / b.a[3]) * W * u + 5).toFixed(1));
        b.l2.setAttribute('x', (b.x + (b.a[2] / b.a[3]) * W * u + 5).toFixed(1));
        b.l1.textContent = u > 0 ? '约 ' + fmt(b.a[1] * u, b.a[5]) + b.a[4] : '';
        b.l2.textContent = u > 0 ? '约 ' + fmt(b.a[2] * u, b.a[5]) + b.a[4] : '';
      });
    }

    return { el: s, draw: draw };
  }

  /* ── scene 6: 野外零样本 ── */
  function buildSceneField() {
    var s = sceneSvg('ANYmal-B 与 ANYmal-C 两代机器人，同一代在所有地形用同一个控制器；训练只有刚性地形，部署遇到可变形地面、会动的落脚点和地面上的阻挡；表 1 苔藓上速度 0.452 对 0.199 米每秒，泥地 0.338 对 0.197，厚植被基线过不去；机械运输成本苔藓 0.423 对 0.625、泥地 0.692 对 0.931；DARPA 地下挑战赛两台 ANYmal-B 四场各 60 分钟零失败');
    s.appendChild(svgText(30, 28, '零样本上野外：训练里从没见过的泥、雪、植被和流水', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'qt-x-arrow-s6', C_GOOD);

    var top = group(s);
    chip(top, 30, 40, 150, 'ANYmal-B', C_ACCENT, { h: 28, size: 12 });
    chip(top, 190, 40, 150, 'ANYmal-C', C_ACCENT, { h: 28, size: 12 });
    top.appendChild(svgText(352, 58, '同一代机器人在所有地形上用同一个控制器，不调参', 'demo-x-mut', 10.5));

    var tr = group(s);
    rectBox(tr, 30, 84, 160, 186, C_BORDER, C_SURFACE2);
    tr.appendChild(svgText(42, 106, '训练（仿真）', null, 12));
    ['刚性地形', '丘陵 · 台阶 · 楼梯', '+ 湿滑丘陵', '随机化：摩擦、外力、', '观测噪声'].forEach(function (str, i) {
      tr.appendChild(svgText(42, 132 + i * 22, str, 'demo-x-ink2', 10.5));
    });
    var dep = group(s);
    rectBox(dep, 226, 84, 166, 186, C_GOOD);
    dep.appendChild(svgText(238, 106, '部署（真机）', 'demo-x-good', 12));
    [['可变形', '泥、苔藓、雪'], ['会动的落脚点', '碎石、一踩就翻的木板'], ['地面上的阻挡', '厚植被、湍急的水']].forEach(function (p, i) {
      dep.appendChild(svgText(238, 132 + i * 46, p[0], 'demo-x-ink2', 10.5));
      dep.appendChild(svgText(238, 150 + i * 46, p[1], 'demo-x-mut', 10));
    });
    var zs = group(s);
    arrowPath(zs, [[192, 176], [222, 176]], C_GOOD, mk, null, 2.2);
    zs.appendChild(svgText(207, 166, '零样本', 'demo-x-good', 9.5, 'middle'));

    // 右：表 1
    function chart(x0, title, data, vmax, digits, at) {
      var g = group(s);
      g.appendChild(svgText(x0, 100, title, 'demo-x-ink2', 11));
      var base = 250,
        H = 120;
      g.appendChild(paint(svgEl('line', { x1: x0, y1: base, x2: x0 + 172, y2: base, 'stroke-width': 1 }), null, C_BORDER));
      var bars = [];
      TERRAINS.forEach(function (name, k) {
        var cx = x0 + 30 + k * 56;
        [0, 1].forEach(function (who) {
          var v = data[who][k];
          var x = cx - 20 + who * 22;
          if (v == null) {
            var miss = svgText(x + 9, base - 6, '—', 'demo-x-bad', 12, 'middle');
            g.appendChild(miss);
            bars.push({ miss: miss, at: at + 0.3 * k });
            return;
          }
          var b = vbar(g, x, base, 18, who ? C_MUTED : C_ACCENT);
          var lab = svgText(x + 9, base - 4, '', 'demo-x-mono ' + (who ? 'demo-x-mut' : 'demo-x-acc'), 9, 'middle');
          g.appendChild(lab);
          bars.push({ b: b, lab: lab, v: v, h: (v / vmax) * H, at: at + 0.3 * k, digits: digits });
        });
        g.appendChild(svgText(cx, base + 15, name, 'demo-x-mut', 10, 'middle'));
      });
      return { g: g, bars: bars };
    }
    var spd = chart(412, '平均速度 m/s（表 1）', T1_SPEED, 0.5, 3, 7.2);
    var cot = chart(600, '机械 COT（越低越省）', T1_COT, 1.3, 3, 10.6);
    var leg = group(s);
    leg.appendChild(paint(svgEl('rect', { x: 412, y: 270, width: 10, height: 10, rx: 2 }), C_ACCENT));
    leg.appendChild(svgText(426, 279, '这篇', 'demo-x-mut', 10));
    leg.appendChild(paint(svgEl('rect', { x: 470, y: 270, width: 10, height: 10, rx: 2 }), C_MUTED));
    leg.appendChild(svgText(484, 279, '基线（当时最先进的模型控制器）', 'demo-x-mut', 10));
    leg.appendChild(svgText(770, 279, '— 过不去', 'demo-x-bad', 10, 'end'));

    var ratio = svgRich(30, 302, '苔藓：速度 $0.452 / 0.199 \\approx 2.27\\times$，COT 低 **32%**；泥地：$1.72\\times$，低 **26%**', { size: 11.5, w: 740, cls: 'demo-x-ink2' });
    s.appendChild(ratio);
    var def = svgRich(30, 326, 'COT $= \\sum [\\tau \\dot\\theta]^+ / (mgv)$：每走一米、每牛顿体重花的正机械功；基线摔倒后由人扶起，摔倒本身没算进表里', { size: 10.5, w: 740, cls: 'demo-x-mut' });
    s.appendChild(def);
    var subt = group(s);
    chip(subt, 30, 344, 740, 'DARPA 地下挑战赛城市赛：**' + SUBT_ROBOTS + ' 台 ANYmal-B · ' + SUBT_MISSIONS + ' 场 × ' + SUBT_MIN + ' 分钟 · 0 次失败**；楼梯每级 18 cm、坡度约 45°', C_GOOD, { h: 36, size: 12 });
    var first = svgText(400, 400, '论文说：这是第一次把无模型强化学习训的腿式控制器用在这种比赛里', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(first);

    function draw(t) {
      setOpacity(top, seg(t, 0.3, 0.9));
      setOpacity(tr, seg(t, 3.6, 4.1));
      setOpacity(dep, seg(t, 4.6, 5.1));
      setOpacity(zs, seg(t, 5.4, 5.9));
      [spd, cot].forEach(function (c, ci) {
        setOpacity(c.g, seg(t, ci ? 10.4 : 7.0, (ci ? 10.4 : 7.0) + 0.4));
        c.bars.forEach(function (b) {
          var u = ease(seg(t, b.at, b.at + 0.8));
          if (b.miss) {
            setOpacity(b.miss, u);
            return;
          }
          setH(b.b, b.h * u);
          b.lab.setAttribute('y', (250 - b.h * u - 4).toFixed(1));
          b.lab.textContent = u >= 1 ? String(b.v) : u > 0.02 ? fmt(b.v * u, b.digits) : '';
        });
      });
      setOpacity(leg, seg(t, 7.0, 7.4));
      setOpacity(ratio, seg(t, 9.0, 9.6));
      setOpacity(def, seg(t, 11.6, 12.2));
      setOpacity(subt, seg(t, 13.4, 14.0));
      setOpacity(first, seg(t, 15.0, 15.6));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 7: 室内对照 ── */
  function buildSceneIndoor() {
    var s = sceneSvg('图 3E 上台阶成功率：这篇到 17.1 厘米都是十次全过，20.1 厘米两次；基线 0.2 米每秒只过 6.6 厘米；带 10 公斤负重这篇仍能上 13.4 厘米，基线一级都上不去；平地 8 个方向航向误差这篇在 10 度以内，基线横向约 30 度；湿白板上基线摔倒，这篇照常走');
    s.appendChild(svgText(30, 28, '室内对照：台阶、10 kg 负重、湿滑白板', 'demo-x-ink2', 13.5));

    var PX0 = 74,
      PX1 = 404,
      PY0 = 230,
      PY1 = 72;
    function sx(h) {
      return PX0 + ((h - 5) / 16) * (PX1 - PX0);
    }
    function sy(v) {
      return PY0 - (v / 100) * (PY0 - PY1);
    }
    var ax = group(s);
    ax.appendChild(svgText(30, 52, '上台阶成功率（图 3E，每档 10 次，读图）', 'demo-x-ink2', 11));
    [0, 50, 100].forEach(function (v) {
      ax.appendChild(paint(svgEl('line', { x1: PX0, y1: sy(v), x2: PX1, y2: sy(v), 'stroke-width': 0.6, 'stroke-dasharray': '2 4' }), null, C_BORDER));
      ax.appendChild(svgText(PX0 - 6, sy(v) + 4, v + '%', 'demo-x-mut demo-x-mono', 9.5, 'end'));
    });
    STEP_H.forEach(function (h) {
      ax.appendChild(svgText(sx(h), PY0 + 15, fmt(h, 1), 'demo-x-mut demo-x-mono', 9.5, 'middle'));
    });
    ax.appendChild(svgText(30, PY0 + 15, '台阶高 cm', 'demo-x-mut', 9.5));
    var COLS = [C_ACCENT, C_GOOD, C_WARN, C_BAD, C_MUTED];
    var AT = [0.6, 7.4, 1.2, 1.8, 8.0];
    var series = STEP_UP.map(function (sr, i) {
      var g = group(s);
      var pts = STEP_H.map(function (h, k) {
        return [sx(h), sy(sr.v[k]) + (i === 4 ? 0 : i * 0.0)];
      });
      var p = pathLine(g, pts, COLS[i], i === 0 ? 2.8 : 2, i === 4 ? '5 4' : null);
      pts.forEach(function (q) {
        g.appendChild(paint(svgEl('circle', { cx: q[0], cy: q[1], r: 2.6 }), COLS[i]));
      });
      return { g: g, p: p, at: AT[i] };
    });
    var leg = group(s);
    STEP_UP.forEach(function (sr, i) {
      var x = 30 + (i % 3) * 132,
        y = 266 + Math.floor(i / 3) * 16;
      var lg = group(leg);
      lg.appendChild(paint(svgEl('rect', { x: x, y: y - 8, width: 10, height: 3, rx: 1 }), COLS[i]));
      lg.appendChild(svgText(x + 14, y - 3, sr.name, 'demo-x-mut', 9.5));
      series[i].leg = lg;
    });

    var pay = group(s);
    rectBox(pay, 440, 44, 330, 104, C_GOOD);
    pay.appendChild(svgText(454, 68, '10 kg 负重 = 整机重量的 22.7%', null, 12.5));
    pay.appendChild(svgText(454, 90, '训练里从没模拟过（模型误差）', 'demo-x-mut', 10.5));
    pay.appendChild(svgRich(454, 114, '这篇：仍能上 **13.4 cm** 的台阶', { size: 11.5, w: 300, cls: 'demo-x-good' }));
    pay.appendChild(svgText(454, 136, '基线：任何速度下一级都上不去', 'demo-x-bad', 11));

    var head = group(s);
    rectBox(head, 440, 160, 330, 110, C_BORDER);
    head.appendChild(svgText(454, 182, '平地 8 个方向，速度都在 0.4 m/s 左右（图 3F–G）', 'demo-x-ink2', 10.5));
    head.appendChild(svgText(454, 206, '航向误差', 'demo-x-mut', 10));
    var hb1 = hbar(head, 520, 214, 0, 14, C_ACCENT, 0.9);
    var hb2 = hbar(head, 520, 240, 0, 14, C_MUTED, 0.9);
    var hl1 = svgText(524, 225, '', 'demo-x-acc', 10);
    var hl2 = svgText(524, 251, '', 'demo-x-mut', 10);
    head.appendChild(hl1);
    head.appendChild(hl2);
    head.appendChild(svgText(454, 225, '这篇', 'demo-x-acc', 10.5));
    head.appendChild(svgText(454, 251, '基线横走', 'demo-x-mut', 10.5));

    var down = svgRich(30, 312, '下台阶：这篇每档 **10 / 10**；基线到 17.1 cm 只剩 6 次和 4 次，20.1 cm 全部失败', { size: 11.5, w: 740, cls: 'demo-x-ink2' });
    s.appendChild(down);
    var slip = group(s);
    chip(slip, 30, 326, 740, '湿白板：基线很快失衡、使劲甩腿然后摔倒；这篇适应了打滑，照常朝命令方向走（视频 S5）', C_BORDER, { h: 32, size: 11.5 });
    var concl = group(s);
    chip(concl, 30, 368, 740, '论文的结论：对模型误差（负重、打滑）的鲁棒性强得多', C_ACCENT, { h: 32, size: 12 });

    function draw(t) {
      setOpacity(ax, seg(t, 0.3, 0.8));
      series.forEach(function (sr) {
        setOpacity(sr.g, seg(t, sr.at, sr.at + 0.2));
        drawOn(sr.p, ease(seg(t, sr.at, sr.at + 1.2)));
        setOpacity(sr.leg, seg(t, sr.at, sr.at + 0.4));
      });
      setOpacity(down, seg(t, 4.0, 4.6));
      setOpacity(pay, seg(t, 7.0, 7.6));
      setOpacity(head, seg(t, 10.4, 10.9));
      var u = ease(seg(t, 10.8, 12.0));
      setW(hb1, 10 * 6 * u);
      setW(hb2, 30 * 6 * u);
      hl1.setAttribute('x', (524 + 60 * u + 2).toFixed(1));
      hl2.setAttribute('x', (524 + 180 * u + 2).toFixed(1));
      hl1.textContent = u > 0 ? '10° 以内' : '';
      hl2.textContent = u > 0 ? '约 30°' : '';
      setOpacity(slip, seg(t, 13.4, 14.0));
      setOpacity(concl, seg(t, 15.0, 15.6));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 8: 记忆要多长 + 踩空反射 ── */
  function buildSceneMemory() {
    var s = sceneSvg('图 5B 到 D：18 厘米台阶成功率 TCN-1 约 22%、TCN-20 约 67%、TCN-100 约 78%，后腿 35%、77%、84%；侧推偏离 TCN-100 比 TCN-1 小 35.5%；踩空反射把左前脚抬脚高度从 12.9 厘米提到 22.5 厘米；3.4 秒时策略仍在看 2.1 秒撞台阶那一刻，相隔 65 步，只有 2 秒窗口装得下');
    s.appendChild(svgText(30, 28, '记忆要多长：TCN-1 / 20 / 100（0.02 / 0.4 / 2 秒）', 'demo-x-ink2', 13.5));
    var MC = [C_MUTED, C_WARN, C_ACCENT, C_SURFACE2];

    var bars = group(s);
    bars.appendChild(svgText(30, 52, '图 5B–D（读图）：每个模型 5 个种子、每项 100 次试验', 'demo-x-mut', 10.5));
    var BASE = 216,
      H = 130;
    var GROUPS = [
      ['18 cm 台阶', MEM_STEP18, 100, '%', 4.0],
      ['其中后腿', MEM_HIND18, 100, '%', 5.6],
      ['侧推 50 N 偏离', MEM_DEV, 0.5, 'rad', 7.6]
    ];
    bars.appendChild(paint(svgEl('line', { x1: 30, y1: BASE, x2: 400, y2: BASE, 'stroke-width': 1 }), null, C_BORDER));
    var bset = [];
    GROUPS.forEach(function (gr, gi) {
      var gx = 40 + gi * 124;
      gr[1].forEach(function (v, m) {
        var b = vbar(bars, gx + m * 26, BASE, 22, MC[m], m === 3 ? 1 : 0.9);
        if (m === 3) b.style.stroke = 'var(--demo-muted)';
        var lab = svgText(gx + m * 26 + 11, BASE - 4, '', 'demo-x-mono demo-x-ink2', 9, 'middle');
        bars.appendChild(lab);
        bset.push({ b: b, lab: lab, v: v, h: (v / gr[2]) * H, at: gr[4] + m * 0.2, unit: gr[3] });
      });
      bars.appendChild(svgText(gx + (gr[1].length * 26) / 2 - 2, BASE + 15, gr[0], 'demo-x-mut', 10, 'middle'));
    });
    var drop = svgRich(316, 64, '$-35.5\\%$', { size: 11, w: 80, cls: 'demo-x-good' });
    s.appendChild(drop);
    var leg = group(s);
    MEM_NAMES.forEach(function (n, m) {
      var r = paint(svgEl('rect', { x: 30 + m * 92, y: 236, width: 10, height: 10, rx: 2 }), MC[m]);
      if (m === 3) r.style.stroke = 'var(--demo-muted)';
      leg.appendChild(r);
      leg.appendChild(svgText(44 + m * 92, 245, n, 'demo-x-mut', 10));
    });
    var fair = svgText(30, 268, '三档参数量都约 16 万（表 S6）：比的就是记忆长度', 'demo-x-mut', 10.5);
    s.appendChild(fair);

    // 右上：显著性时间轴
    var tl = group(s);
    var TX0 = 450,
      TX1 = 760;
    function tx(sec) {
      return TX0 + (sec / 4) * (TX1 - TX0);
    }
    tl.appendChild(svgText(420, 52, '图 6C–D：3.4 s 时策略仍盯着 2.1 s 那一下', 'demo-x-ink2', 11));
    tl.appendChild(paint(svgEl('line', { x1: TX0, y1: 120, x2: TX1, y2: 120, 'stroke-width': 1 }), null, C_BORDER));
    [0, 1, 2, 3, 4].forEach(function (sec) {
      tl.appendChild(svgText(tx(sec), 134, sec + ' s', 'demo-x-mut demo-x-mono', 9.5, 'middle'));
    });
    var tpts = [];
    for (var i = 0; i <= 170; i++) {
      var tt = i / 50;
      var v = 0.5 * Math.sin(2 * Math.PI * F0 * tt) + (tt >= FT_T ? 1.4 * Math.exp(-(tt - FT_T) * 9) * Math.cos((tt - FT_T) * 30) : 0);
      tpts.push([tx(tt), 100 - v * 14]);
    }
    var trace = pathLine(tl, tpts, C_MUTED, 1.4);
    tl.appendChild(paint(svgEl('line', { x1: tx(FT_T), y1: 64, x2: tx(FT_T), y2: 120, 'stroke-width': 1.6, 'stroke-dasharray': '4 3' }), null, C_BAD));
    tl.appendChild(svgText(tx(FT_T) - 4, 74, '撞台阶', 'demo-x-bad', 10, 'end'));
    tl.appendChild(paint(svgEl('line', { x1: tx(SAL_T), y1: 64, x2: tx(SAL_T), y2: 120, 'stroke-width': 1.6 }), null, C_INK));
    tl.appendChild(svgText(tx(SAL_T) + 4, 74, '现在', 'demo-x-ink2', 10));
    var gap = svgRich(tx((FT_T + SAL_T) / 2), 58, '$1.3$ s = **65 步**', { size: 10.5, anchor: 'middle', w: 120, cls: 'demo-x-warn' });
    tl.appendChild(gap);
    var w100 = paint(svgEl('rect', { x: tx(SAL_T - 2.0), y: 142, width: tx(SAL_T) - tx(SAL_T - 2.0), height: 12, rx: 3 }), C_ACCENT);
    var w20 = paint(svgEl('rect', { x: tx(SAL_T - 0.4), y: 160, width: tx(SAL_T) - tx(SAL_T - 0.4), height: 12, rx: 3 }), C_WARN);
    tl.appendChild(w100);
    tl.appendChild(w20);
    tl.appendChild(svgText(tx(SAL_T - 2.0) - 4, 152, 'TCN-100 · 2 s', 'demo-x-acc', 9.5, 'end'));
    tl.appendChild(svgText(tx(SAL_T - 0.4) - 4, 170, 'TCN-20 · 0.4 s', 'demo-x-warn', 9.5, 'end'));

    // 右下：踩空反射
    var rf = group(s);
    var GY = 274,
      SC = 3; // 1 cm = 3 px
    rf.appendChild(paint(svgEl('line', { x1: 430, y1: GY, x2: 770, y2: GY, 'stroke-width': 1.2 }), null, C_MUTED));
    rf.appendChild(paint(svgEl('rect', { x: 660, y: GY - STEP_TRAP * SC, width: 110, height: STEP_TRAP * SC }), C_SURFACE2));
    rf.appendChild(paint(svgEl('rect', { x: 660, y: GY - STEP_TRAP * SC, width: 110, height: STEP_TRAP * SC, fill: 'none', 'stroke-width': 1 }), null, C_BORDER));
    rf.appendChild(svgText(715, GY - 18, '台阶 16.8 cm', 'demo-x-mut', 10, 'middle'));
    function arc(x0, x1, peak) {
      var pts = [];
      for (var k = 0; k <= 30; k++) {
        var u = k / 30;
        pts.push([x0 + (x1 - x0) * u, GY - peak * SC * Math.sin(Math.PI * u)]);
      }
      return pts;
    }
    var a1 = pathLine(rf, arc(560, 680, CLEAR_LF[0]).filter(function (q) { return q[0] <= 660; }), C_BAD, 2, '5 3');
    var hit = paint(svgEl('circle', { cx: 660, cy: GY - 18, r: 4 }), C_BAD);
    rf.appendChild(hit);
    var a2 = pathLine(rf, arc(600, 720, CLEAR_LF[1]).map(function (q) { return [q[0], Math.min(q[1], q[0] > 660 ? GY - STEP_TRAP * SC : GY)]; }), C_GOOD, 2.4);
    var l1 = svgText(470, GY - 12, '平地最高 12.9 cm', 'demo-x-bad', 10);
    var l2 = svgText(644, GY - CLEAR_LF[1] * SC - 4, '撞上后 22.5 cm', 'demo-x-good', 10.5, 'end');
    rf.appendChild(l1);
    rf.appendChild(l2);

    var nums = svgRich(30, 300, '左前 12.9 → **22.5** cm、右前 13.6 → 18.5 cm；前腿上去后，后腿 LH 13.5 → 16.6、RH 9.06 → 15.9 cm', { size: 11, w: 740, cls: 'demo-x-ink2' });
    s.appendChild(nums);
    var emerg = group(s);
    chip(emerg, 30, 316, 740, '这个**踩空反射**没写进任何奖励，是训练中自己长出来的；撞到小腿中段也一样会抬（图 3C）', C_GOOD, { h: 32, size: 11.5 });
    var why = group(s);
    chip(why, 30, 362, 740, '相隔 $(3.4 - 2.1) / 0.02 = 65$ 步：TCN-20 的 20 步窗口装不下，TCN-100 的 100 步装得下', C_ACCENT, { h: 34, size: 12 });

    function draw(t) {
      setOpacity(bars, seg(t, 0.3, 0.8));
      setOpacity(leg, seg(t, 0.6, 1.0));
      setOpacity(fair, seg(t, 1.5, 2.0));
      bset.forEach(function (b) {
        var u = ease(seg(t, b.at, b.at + 0.8));
        setH(b.b, b.h * u);
        b.lab.setAttribute('y', (BASE - b.h * u - 4).toFixed(1));
        b.lab.textContent = u > 0.02 ? (b.unit === 'rad' ? fmt(b.v * u, 2) : fmt(b.v * u, 0)) : '';
      });
      setOpacity(drop, seg(t, 8.4, 8.9));
      setOpacity(rf, seg(t, 10.6, 11.0));
      drawOn(a1, ease(seg(t, 10.8, 11.6)));
      setOpacity(hit, seg(t, 11.5, 11.7));
      setOpacity(l1, seg(t, 11.0, 11.5));
      drawOn(a2, ease(seg(t, 11.8, 12.8)));
      setOpacity(l2, seg(t, 12.6, 13.0));
      setOpacity(nums, seg(t, 11.6, 12.2));
      setOpacity(emerg, seg(t, 12.4, 13.0));
      setOpacity(tl, seg(t, 13.8, 14.2));
      drawOn(trace, ease(seg(t, 13.8, 14.8)));
      setOpacity(gap, seg(t, 14.8, 15.2));
      setOpacity(w100, seg(t, 15.0, 15.4));
      setOpacity(w20, seg(t, 15.2, 15.6));
      setOpacity(why, seg(t, 15.6, 16.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 9: 解码器读出了什么 + 局限 ── */
  function buildSceneProbe() {
    var s = sceneSvg('冻结训好的 TCN，另训一个解码器从中间层读回特权信息；湿白板上摩擦估计随打滑下降、回到正常地面约 2 秒后回升；10 公斤负重时解码出向下 80.1 牛的外力，真值约 98 牛；局限是只会小跑、看不见悬崖、步态保守；留下的范式是特权教师、本体学生与自适应课程');
    s.appendChild(svgText(30, 28, '两秒记忆里装了什么：解码器读出摩擦和外力；以及它的边界', 'demo-x-ink2', 13.5));
    var mk = K.arrowMarker(s, 'qt-x-arrow-s9', C_MUTED);

    var probe = group(s);
    rectBox(probe, 30, 42, 108, 32, C_ACCENT);
    probe.appendChild(svgText(84, 63, '冻结的 TCN', 'demo-x-acc', 11.5, 'middle'));
    arrowPath(probe, [[138, 58], [158, 58]], C_MUTED, mk);
    rectBox(probe, 160, 42, 108, 32, C_BORDER);
    probe.appendChild(svgText(214, 63, '解码器 relu 196', null, 11, 'middle'));
    arrowPath(probe, [[268, 58], [288, 58]], C_MUTED, mk);
    probe.appendChild(svgRich(292, 62, '$\\hat{x}_t$：均值 + 标准差', { size: 11, w: 120, cls: 'demo-x-ink2' }));
    var nll = svgMath(30, 96, '\\mathcal{L} = \\textstyle\\sum_i \\frac{(m_i - m_i^{gt})^2}{2\\sigma_i^2} + \\log \\sigma_i', { size: 12.5, w: 300 });
    s.appendChild(nll);
    var nllNote = svgText(30, 120, '解码器只用来分析，不参与控制；接触状态用分类损失', 'demo-x-mut', 10);
    s.appendChild(nllNote);

    // 左下：摩擦估计（按图 S2A 的走势示意）
    var fr = group(s);
    var FX0 = 50,
      FX1 = 390,
      FY0 = 244,
      FY1 = 152;
    function fx(sec) {
      return FX0 + (sec / 9) * (FX1 - FX0);
    }
    function fy(mu) {
      return FY0 - mu * (FY0 - FY1);
    }
    fr.appendChild(svgText(30, 142, '湿白板上的摩擦系数估计（按图 S2A 的走势示意）', 'demo-x-ink2', 10.5));
    fr.appendChild(paint(svgEl('rect', { x: fx(1.3), y: FY1, width: fx(5.3) - fx(1.3), height: FY0 - FY1, opacity: 0.25 }), C_ACCENT));
    fr.appendChild(svgText((fx(1.3) + fx(5.3)) / 2, FY0 - 6, '湿白板上', 'demo-x-acc', 9.5, 'middle'));
    fr.appendChild(paint(svgEl('line', { x1: FX0, y1: FY0, x2: FX1, y2: FY0, 'stroke-width': 1 }), null, C_BORDER));
    [0, 0.5, 1].forEach(function (mu) {
      fr.appendChild(svgText(FX0 - 4, fy(mu) + 3, fmt(mu, mu === 0.5 ? 1 : 0), 'demo-x-mut demo-x-mono', 9, 'end'));
    });
    [0, 2, 4, 6, 8].forEach(function (sec) {
      fr.appendChild(svgText(fx(sec), FY0 + 13, sec + ' s', 'demo-x-mut demo-x-mono', 9, 'middle'));
    });
    var fpts = [];
    for (var i = 0; i <= 90; i++) {
      var sec = i / 10,
        mu;
      if (sec < 1.3) mu = 0.85;
      else if (sec < 2.2) mu = 0.85 - 0.6 * ease((sec - 1.3) / 0.9);
      else if (sec < 6.3) mu = 0.25;
      else if (sec < 8.4) mu = 0.25 + 0.6 * ease((sec - 6.3) / 2.1);
      else mu = 0.85;
      fpts.push([fx(sec), fy(mu)]);
    }
    var fcurve = pathLine(fr, fpts, C_WARN, 2.2);
    var marks = group(fr);
    [[1.3, 'i 开始打滑'], [5.3, 'iii 回到地面']].forEach(function (m) {
      marks.appendChild(paint(svgEl('line', { x1: fx(m[0]), y1: FY1, x2: fx(m[0]), y2: FY0, 'stroke-width': 1, 'stroke-dasharray': '3 3' }), null, C_MUTED));
      marks.appendChild(svgText(fx(m[0]) + 3, FY1 + 10, m[1], 'demo-x-mut', 9.5));
    });
    marks.appendChild(svgText(fx(8.2), fy(0.28), '约 2 s 后回升', 'demo-x-warn', 9.5, 'middle'));

    var right = group(s);
    function card3(y, h, head, sub, color, at) {
      var g = group(right);
      rectBox(g, 420, y, 350, h, color);
      g.appendChild(svgRich(434, y + 22, head, { size: 11.5, w: 330 }));
      if (sub) g.appendChild(svgRich(434, y + 44, sub, { size: 10.5, w: 330, cls: 'demo-x-mut' }));
      g.at = at;
      return g;
    }
    var cards = [
      card3(42, 58, '背 10 kg 未知负重 → 解码出向下 **80.1 N**', '真值 $10 \\times 9.81 \\approx 98$ N（图 S2B）', C_GOOD, 7.4),
      card3(110, 58, '钻厚植被 → 解码出与前进方向相反的力', '策略据此往前顶过去（图 S2C）', C_BORDER, 8.4),
      card3(178, 58, '野外地形 → 高度估计的不确定性明显变大', '它记住的是「这里很不平」（图 S2C–D）', C_BORDER, 9.2)
    ];

    var lim = group(s);
    lim.appendChild(svgText(30, 276, '局限（论文第 3 节）', 'demo-x-bad', 11.5));
    var limChips = ['只会**小跑**（trot）一种步态', '盲走：叫它走下悬崖，它就会走下去', '要用身体去摸地形，步态偏保守'].map(function (str, i) {
      return chip(lim, 30 + i * 250, 284, 240, str, C_BAD, { h: 32, dash: '4 3', size: 11 });
    });
    var leg = group(s);
    leg.appendChild(svgText(30, 334, '留下的范式', 'demo-x-good', 11.5));
    chip(leg, 30, 342, 740, '特权教师（看真值）→ 本体学生（读历史）+ 自适应课程：之后的 RMA、HOVER、ExBody2 等都沿用', C_GOOD, { h: 32, size: 11.5 });
    var fin = svgRich(400, 400, '**一句话：在简单得多的仿真里训练，也能在复杂的野外稳住**', { size: 13.5, anchor: 'middle', w: 760, cls: 'demo-x-acc' });
    s.appendChild(fin);

    function draw(t) {
      setOpacity(probe, seg(t, 0.3, 0.9));
      setOpacity(nll, seg(t, 1.6, 2.2));
      setOpacity(nllNote, seg(t, 2.4, 3.0));
      setOpacity(fr, seg(t, 4.0, 4.4));
      drawOn(fcurve, ease(seg(t, 4.2, 7.0)));
      setOpacity(marks, seg(t, 5.0, 5.6));
      cards.forEach(function (g) {
        setOpacity(g, seg(t, g.at, g.at + 0.5));
      });
      setOpacity(lim, seg(t, 10.6, 10.9));
      limChips.forEach(function (c, i) {
        setOpacity(c, seg(t, 10.7 + i * 0.8, 11.2 + i * 0.8));
      });
      setOpacity(leg, seg(t, 13.6, 14.2));
      setOpacity(fin, seg(t, 15.4, 16.0));
    }

    return { el: s, draw: draw };
  }

  var QT_SCENES = [
    {
      title: '野外为什么难：只能靠身体感觉',
      dur: 16,
      build: buildSceneProblem,
      cues: [
        { at: 0.3, s: '野外的地形会变形、会塌，表面材料处处不同：泥会陷、雪会滑、碎石会动、植被会绊腿。论文说，当时已发表的控制器在这些地方频繁打滑、失衡，最后摔倒。' },
        { at: 3.6, s: '传统做法是精心设计的**状态机**，调度运动原语和反射；什么时候切换，靠显式估计接触与打滑，阈值是经验调的 —— 碰到泥、雪、植被这些没建模的因素就不稳，场景越多越复杂。' },
        { at: 7.4, s: '相机、激光雷达也帮不上：测不出摩擦和软硬，会被植被、雪、水挡住，也跟不上脚下松土塌陷。剩下的只有**本体感知**：关节编码器和 IMU（惯性测量单元），腿式机器人上最耐用的传感器。' },
        { at: 10.6, s: '这篇的三个关键：① 不用只看当前一帧的 MLP（多层感知机），而用 **TCN**（时间卷积网络）读一长段本体历史；② **特权学习**：先训能看到地形真值的教师，再蒸馏给只用本体感知的学生；③ **自适应地形课程**。' },
        { at: 13.6, s: '仿真里只有刚性地形：丘陵、台阶、楼梯。同一套方法却**零样本**上了两代 ANYmal 四足机器人的野外，没有任何微调。' }
      ]
    },
    {
      title: '动作空间：相位振荡器 + 足端残差',
      dur: 17,
      build: buildSceneFtg,
      cues: [
        { at: 0.3, s: '先看动作空间。策略不直接输出 12 个关节角，而是用 **PMTG**（策略调制轨迹生成器）：每条腿一个周期相位 $\\varphi_i$，$[0, \\pi)$ 是支撑相，$[\\pi, 2\\pi)$ 是摆动相。' },
        { at: 3.8, s: '足端轨迹生成器（FTG）在摆动相画一条三次样条：令 $k = 2(\\varphi - \\pi)/\\pi$，最高抬脚 $h = 0.2$ m；$k = 0.5$ 时脚离地 **10 cm**，$k = 1$ 到最高 **20 cm**。基础频率 $f_0 = 1.25$ Hz 沿用以前给小跑步态调好的传统控制器。' },
        { at: 7.6, s: '策略每步输出 **16 维**：4 个频率偏移 $f_i$（让某条腿走快、走慢甚至停住）和 12 个足端位置残差 $\\Delta r$，目标脚位 $r = F(\\varphi_i) + \\Delta r$。' },
        { at: 11.0, s: '目标脚位定义在每条腿的**水平坐标系**里：跟着机身转向，不跟着俯仰和横滚，训练初期乱动时也少摔。再用解析逆运动学（IK）算关节目标，交给关节 PD 跟踪；仿真里 PD 和串联弹性执行器用一个学出来的**执行器网络**建模。' },
        { at: 13.8, s: '节拍：图 4C 里动作生成 50 Hz、跟踪 400 Hz。每 0.02 s 相位前进 $2\\pi \\times 1.25 \\times 0.02 = 0.05\\pi$，也就是 **9°**；一个步态周期 **40 步 = 0.8 s**。' }
      ]
    },
    {
      title: '特权教师：看得见地形和接触',
      dur: 17,
      build: buildSceneTeacher,
      cues: [
        { at: 0.3, s: '第一步训练**教师**。它的输入除了机器人测得到的 $o_t$（121 维），还有仿真里才有的**特权信息** $x_t$（71 维）：每只脚周围 9 个点的地形高度、地形法向、接触力和接触状态、足地摩擦系数、施加在机身上的外力。' },
        { at: 4.0, s: '$x_t$ 先过一个 MLP 编码器（72 → 64）得到潜向量 $\\bar{l}_t$，只装地形和接触；再和 $o_t$ 拼起来，过 256 → 128 → 64 的 MLP 输出 16 维动作 $\\bar{a}_t$。论文推测，正是 $\\bar{l}_t$ 让教师按地形改变抬脚高度。' },
        { at: 7.6, s: '命令**只给方向**：水平方向 $(\\cos\\psi, \\sin\\psi)$ 加转向 $\\{-1, 0, 1\\}$，不给目标速度 —— 陡坡、台阶上能走多快本来就说不准。速度奖励按命令方向上的速度 $v_{pr}$ 算，到 0.6 m/s 封顶（旧控制器在平地上的最快速度）。' },
        { at: 11.4, s: '总奖励是 7 项加权和：朝命令方向走、转向、机身平稳、摆动脚高过周围地形、机身别碰地、目标脚位平滑、力矩小。' },
        { at: 14.0, s: '训练算法是 **TRPO**（信赖域策略优化）：10000 轮、每轮 8 万步，一台带 RTX 2080 的台式机约 **12 小时**。教师只活在仿真里，不上真机。' }
      ]
    },
    {
      title: '本体学生：两秒历史 + 模仿教师',
      dur: 17,
      build: buildSceneStudent,
      cues: [
        { at: 0.3, s: '学生只拿得到 $o_t$ 和一段本体历史 $H$：每步 **60 维**（命令、重力方向、机身速度、关节位置 / 速度 / 位置误差、相位、频率），每 0.02 s 记一次，存 100 步 —— 正好 **2 秒**。' },
        { at: 3.8, s: '编码器是 **TCN**：三层因果空洞卷积，空洞率 1、2、4，中间穿插步长 2 的降采样，最后得到 64 维的 $l_t$。论文选 TCN，是因为历史长度一目了然、能吃很长的历史，对超参数也不敏感。' },
        { at: 7.2, s: '损失是两项平方误差：$\\mathcal{L} = (\\bar{a}_t - a_t)^2 + (\\bar{l}_t - l_t)^2$ —— 既模仿教师的动作，也模仿教师的潜向量。学生后半段的 MLP 直接**复制**教师训好的那几层。' },
        { at: 10.6, s: '数据按 **DAgger**（数据集聚合）采：让学生自己走，教师在学生走到的每个状态上给出 $\\bar{a}_t$、$\\bar{l}_t$ 当标签。学生训练约 4 小时。' },
        { at: 13.2, s: '为什么非要教师？同样的 TCN-20 直接用强化学习训，奖励信号太稀疏：上坡、上台阶全部失败，回合平均只撑四十步左右（满分 400 步）；走教师路线的 TCN-20，16 cm 台阶能过九成以上（图 5E–G，读图）。' }
      ]
    },
    {
      title: '地形课程：只练刚好够难的',
      dur: 17,
      build: buildSceneCurriculum,
      cues: [
        { at: 0.3, s: '训练地形是程序生成的三类：丘陵（柏林噪声，参数是粗糙度、频率、幅度）、台阶（随机高度的方块）、楼梯；还有低摩擦的「湿滑丘陵」。每个地形由一个参数向量 $c_T$ 决定，每个回合重新生成。' },
        { at: 3.6, s: '怎么判断难不难？每一步，如果朝命令方向的速度超过 **0.2 m/s**（约最快速度的三分之一）就记 1，否则记 0，摔倒也记 0；一条轨迹的平均值就是可通过性 $Tr$。$Tr$ 落在 **0.5 到 0.9** 之间的地形才「值得练」。' },
        { at: 7.4, s: '补充材料图 S1A 的四个丘陵：可通过性 0.91 太容易；0.56 和 0.67 正好；0.15 太难。论文不用奖励判断难度，因为奖励有好几项、而且没有上下界，不直观。' },
        { at: 10.4, s: '用**粒子滤波**追踪「值得练」的参数：每类地形 10 个粒子，每个粒子每轮跑 6 条轨迹、攒 10 轮，落在 $[0.5, 0.9]$ 的比例就是权重 $w_k$；按权重重采样，再以 0.8 的概率挪到相邻格子；另有 5% 从回放池里抽，防止遗忘。' },
        { at: 13.6, s: '消融（图 5H–J，读图）：同样训教师、改成均匀采样，25° 坡上的速度从约 0.27 掉到约 0.08 m/s，18 cm 台阶成功率从约 98% 掉到约 48%：均匀采样常抽到根本过不去的地形，策略早早摔倒，学到的东西少。' }
      ]
    },
    {
      title: '零样本上野外：表 1 与地下挑战赛',
      dur: 17,
      build: buildSceneField,
      cues: [
        { at: 0.3, s: '同一套方法带着两代机器人 **ANYmal-B** 和 **ANYmal-C** 进了野外：陡峭山路、有流水的小溪、泥地、厚植被、松散碎石、雪坡和潮湿的森林。同一代机器人在所有地形上用的都是同一个控制器，不调参。' },
        { at: 3.6, s: '这些都是训练里没见过的：仿真里只有刚性地形。真机却遇到了**可变形**的地面（泥、苔藓、雪）、**会动的落脚点**（碎石、一踩就翻的木板）和**地面上的阻挡**（厚植被、湍急的水）。' },
        { at: 7.0, s: '表 1 在森林里和当时最先进的基线控制器比：苔藓上平均速度 0.452 对 0.199 m/s，是 **2.27 倍**；泥地 0.338 对 0.197，**1.72 倍**；厚植被上基线过不去。' },
        { at: 10.4, s: '能效用机械 **COT**（运输成本）衡量：执行器输出的正机械功率，除以重量和速度 $\\sum [\\tau \\dot\\theta]^+ / (mgv)$。苔藓 0.423 对 0.625，低 **32%**；泥地 0.692 对 0.931，低 26%。论文说这张表还低估了差距：基线摔倒后由人扶起，摔倒本身没算进去。' },
        { at: 13.4, s: '它还被 CERBERUS 队用在 **DARPA 地下挑战赛**城市赛：两台 ANYmal-B，4 场各 60 分钟的任务，**零失败**；一段楼梯每级 18 cm、坡度约 45°。论文说，这是第一次把无模型强化学习训的腿式控制器用在这种比赛里。' }
      ]
    },
    {
      title: '室内对照：台阶、负重、打滑',
      dur: 17,
      build: buildSceneIndoor,
      cues: [
        { at: 0.3, s: '室内先比上台阶（图 3E，每档 10 次，读图）。基线要给目标速度，取 0.2 和 0.6 m/s。这篇到 17.1 cm 都是 **10 次全过**，20.1 cm 还过 2 次；基线 0.2 m/s 只过得了 6.6 cm，0.6 m/s 在 10.1 cm 只剩 3 次。' },
        { at: 4.0, s: '下台阶：这篇每一档都全过；基线到 17.1 cm 开始失手，20.1 cm 全部失败。论文说基线对「脚被台阶绊住」非常敏感，常常因此摔倒。' },
        { at: 7.0, s: '再背 **10 kg** 负重，是整机重量的 **22.7%**，训练里从没模拟过：这篇仍能上 **13.4 cm** 的台阶；基线带着负重，任何速度下一级都上不去。' },
        { at: 10.4, s: '平地上朝 8 个方向走（图 3F–G）：这篇各个方向都在 0.4 m/s 左右，带不带负重差不多，平均航向误差始终在 **10°** 以内；基线的速度随方向变，横着走时航向误差到 **30°** 左右。' },
        { at: 13.4, s: '最后是打滑：在打湿的白板上，基线很快失去平衡、使劲甩腿，然后摔倒；这篇适应了湿滑地面，照常朝命令方向走。论文的结论：它对模型误差的鲁棒性强得多。' }
      ]
    },
    {
      title: '记忆要多长：TCN-1 / 20 / 100',
      dur: 17,
      build: buildSceneMemory,
      cues: [
        { at: 0.3, s: '记忆有多重要？TCN-N 表示看最近 N 步：TCN-1 只有 0.02 s，TCN-20 是 0.4 s，TCN-100 是 **2 s**（真机用的就是它）。三档参数量都约 16 万，比较是公平的。匀速上坡时，记忆长短几乎没差别。' },
        { at: 4.0, s: '台阶就不一样了（图 5B–C，读图）：18 cm 台阶，TCN-1 只过约 22%，TCN-20 约 67%，TCN-100 约 78%。失败多发生在**后腿**碰到台阶时：后腿的成功率从约 35% 升到约 84%。' },
        { at: 7.6, s: '侧向 50 N 推 5 秒：偏离命令方向的角度，TCN-100 比 TCN-1 小 **35.5%**。' },
        { at: 10.6, s: '**踩空反射**（图 3B、图 6）：16.8 cm 的台阶比平地上的抬脚高度还高。左前脚撞上台阶后，下一次摆动从平地最高 12.9 cm 抬到 **22.5 cm**。这个反射没有人写进训练目标，是自己长出来的；撞到小腿中段也一样会抬。' },
        { at: 13.8, s: '显著性分析（图 6C–D）：在 3.4 s 算抬脚高度时，策略最敏感的输入仍是 2.1 s 那一刻、左前腿撞台阶时的关节读数 —— 相隔 $(3.4 - 2.1)/0.02 = 65$ 步，只有 2 秒的窗口装得下。' }
      ]
    },
    {
      title: '记忆里装了什么，以及局限',
      dur: 17,
      build: buildSceneProbe,
      cues: [
        { at: 0.3, s: '学生的潜向量里到底装了什么？作者冻结训好的 TCN，另训一个**解码器**，从中间层读回特权信息：接触状态用分类，其余每一维都预测均值和标准差，用高斯负对数似然训练。解码器只用来分析，不参与控制。' },
        { at: 4.0, s: '在打湿的白板上，第一只脚一打滑，摩擦系数估计就往下掉，整段湿滑路面上都保持在低位，回到正常地面约 2 秒后才回升（补充材料图 S2A）。' },
        { at: 7.4, s: '背上 10 kg 未知负重，解码出一个向下 **80.1 N** 的外力（真值 $10 \\times 9.81 \\approx 98$ N）；钻厚植被时，解码出和前进方向相反的力。论文据此认为：TCN 在内部建了一个环境的表示，并用它做决策。' },
        { at: 10.6, s: '局限：只学会了**小跑**一种步态；而且是盲走 —— 叫它走下悬崖，它就会走下去；因为要用身体去摸着地形走，步态也偏保守。论文把本体加视觉的混合控制器列为下一步。' },
        { at: 13.6, s: '留下的范式：先训看得到真值的**特权教师**，再蒸馏给只读本体历史的**学生**，配上**自适应课程**。之后的腿式和人形 sim-to-real，比如 RMA 和本仓库的 HOVER、ExBody2 笔记，都沿用这一套。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '九幕动画：ANYmal 野外盲走全流程速览',
      sub: '约 152 秒自动播放。空格播放/暂停，← → 换幕；数字与下面的演示、笔记「具体实例」用的是同一份论文数据，标「读图」的是从图上读的近似值。',
      ariaLabel: 'ANYmal 野外盲走九幕讲解动画',
      notes: [
        '取数依据：第 2 幕的 1.25 Hz / 0.2 m / 式 11 摘自补充材料 S2–S3，50 Hz / 400 Hz 摘自图 4C；第 3 幕的 71 / 121 / 16 维与网络结构摘自表 S4–S5，奖励权重摘自 S4，TRPO 10000 轮 × 8 万步摘自表 S7，12 小时摘自表 S1；' +
          '第 4 幕的 60 维 × 100 步、式 1、DAgger 摘自方法节与表 S5–S6、S8；第 5 幕的 0.2 m/s、[0.5, 0.9]、10 个粒子 / 6 条轨迹 / 10 轮 / 0.8 / 5% 摘自式 2–7 与表 S3，四个丘陵的 0.91 / 0.56 / 0.67 / 0.15 摘自图 S1A；' +
          '第 6 幕照抄表 1，2.27 倍、1.72 倍、32%、26% 是现算的；第 7 幕的 22.7% / 13.4 cm / 10° / 30° 摘自正文；第 8 幕的 35.5%、12.9 → 22.5 cm、16.8 cm 摘自正文，65 步是现算的；第 9 幕的 80.1 N 摘自图 S2B。',
        '**标「读图」的是近似值**：图 3E、图 5、图 S2 没有数值表，第 4、5、7、8 幕里的成功率、速度、回合长度、偏离角是从图上读出来的。' +
          '第 5 幕的粒子网格复用下面「地形课程」演示的玩具模型，只演示机制；第 9 幕的摩擦曲线按图 S2A 的走势画，是示意。机器人和地形的图都是示意，不是论文的照片。'
      ],
      scenes: QT_SCENES
    });
  }

  // ─── the narrated vertical video of the same nine scenes ──────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：ANYmal 野外盲走九幕全流程',
      sub: '9 分 27 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的九幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '10.4 MB',
      fileName: '四足野外盲走_讲解视频.mp4'
    });
  }

  K.mount({
    'qt-explainer': buildExplainerDemo,
    'qt-video': buildVideoDemo,
    'qt-ftg': buildFtgDemo,
    'qt-curriculum': buildCurriculumDemo,
    'qt-memory': buildMemoryDemo
  });
})();
