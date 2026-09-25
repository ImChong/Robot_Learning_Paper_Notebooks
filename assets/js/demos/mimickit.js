/* Interactive MimicKit demos for
 * papers/01_Foundational_RL/MimicKit_A_Reinforcement_Learning_Framework_for_Motion_Imitation_and_Control.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["mimickit"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   mimickit-family — 点一个算法，看它到底替换了框架里的哪几块
 *   mimickit-reward — G1 walk 那五项奖励：权重管「谁重要」，scale 管「多敏感」
 *   mimickit-config — 4096 × 32 = 131072：一次迭代到底吃掉多少 transition
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
    stepper = K.stepper,
    stage = K.stage,
    stageGrid = K.stageGrid,
    begin = K.begin,
    plot = K.plot,
    line = K.line,
    dot = K.dot,
    text = K.text,
    axes = K.axes,
    barLabel = K.barLabel,
    registerRenderer = K.registerRenderer;

  // ─── demo 1: 谱系与模块替换 ──────────────────────────────────────────────
  /* 框架论文的价值那句话：「哪些部分应该共享，哪些部分应该替换」。
     改动量是**相对它继承的那个父类**说的：AMP 相对 PPO，ASE / ADD 相对 AMP。
     0 = 原样复用，1 = 整块换掉。 */
  var MODULES = ['Environment', 'Agent', 'Model', 'Motion Data', 'Config'];

  var ALGOS = [
    {
      id: 'ppo',
      year: 2017,
      name: 'PPO',
      touch: [0.2, 1, 0.6, 0, 0.4],
      file: 'mimickit/learning/ppo_agent.py',
      disc: '没有判别器',
      pos: '—',
      reward: '纯任务奖励',
      lookahead: '看任务而定',
      one: '所有人的优化骨架，别的算法都在它上面改'
    },
    {
      id: 'deepmimic',
      year: 2018,
      name: 'DeepMimic',
      touch: [1, 0, 0, 0.8, 0.5],
      file: 'mimickit/envs/deepmimic_env.py',
      disc: '没有判别器',
      pos: '—',
      reward: '手写 5 项指数核',
      lookahead: '有（tar_obs_steps）',
      one: '改的全在 env：奖励、RSI、early termination，更新照用 PPO'
    },
    {
      id: 'awr',
      year: 2019,
      name: 'AWR',
      touch: [0, 1, 0.2, 0, 0.4],
      file: 'mimickit/learning/awr_agent.py',
      disc: '没有判别器',
      pos: '—',
      reward: '沿用环境奖励',
      lookahead: '看环境而定',
      one: '只换更新规则：把 PPO 的 clip 换成 $\\exp(A/\\beta)$ 加权回归'
    },
    {
      id: 'amp',
      year: 2021,
      name: 'AMP',
      touch: [0.6, 0.8, 0.7, 0.5, 0.6],
      file: 'mimickit/learning/amp_agent.py',
      disc: '状态转移片段（10 步窗口）',
      pos: '专家动作片段',
      reward: 'task + disc 风格奖励',
      lookahead: '没有',
      one: '判别器替代手写奖励：env 要出 disc obs，model 要多一个判别头'
    },
    {
      id: 'ase',
      year: 2022,
      name: 'ASE',
      touch: [0.3, 0.9, 0.8, 0.2, 0.5],
      file: 'mimickit/learning/ase_agent.py',
      disc: '状态转移片段',
      pos: '专家动作片段',
      reward: 'disc 0.5 + encoder 0.5',
      lookahead: '没有',
      one: '在 AMP 上加 latent 与 encoder，actor/critic 都要多吃一个 z'
    },
    {
      id: 'add',
      year: 2025,
      name: 'ADD',
      touch: [0.5, 0.4, 0.2, 0.3, 0.4],
      file: 'mimickit/learning/add_agent.py',
      disc: '差分 $\\Delta o = o^{demo} - o$',
      pos: '零向量（一个点）',
      reward: '纯 disc 奖励（task 权重 0）',
      lookahead: '有（tar_obs_steps）',
      one: '继承 AMPAgent，只改判别器的输入和正样本 —— 对抗这条线上增量最小的一篇'
    }
  ];

  function buildFamilyDemo(host) {
    var root = card(host, {
      title: '点一个算法，看它到底动了框架里的哪几块',
      sub:
        '论文自己的说法是：价值不在于把所有算法写成同一个类，而在于把「哪些共享、哪些替换」划清楚。' +
        '这张图把六个算法对五大模块的改动量摊开（**相对它继承的那个父类**）—— 越晚出现的方法，改动越集中在某一两块。'
    });

    var state = { algo: ALGOS[5] };

    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '选一个算法',
      value: 'add',
      items: ALGOS.map(function (a) {
        return { label: a.year + ' ' + a.name, value: a.id };
      }),
      onPick: function (v) {
        ALGOS.forEach(function (a) {
          if (a.id === v) state.algo = a;
        });
        render();
      }
    });

    var setLegend = legend(root, [
      { key: 'bad', text: '整块换掉' },
      { key: 'warn', text: '改了一部分' },
      { key: 'good', text: '原样复用' }
    ]);

    var grid = stageGrid(root);
    var lineStage = stage(grid, 235);
    var barStage = stage(grid, 235);

    var tb = table(root);
    var rows = [];
    (function () {
      tb.row(['对照项', '这个算法'], true);
      ['判别器输入', '正样本', 'reward 组成', 'obs 里有参考前瞻吗', '主要改动文件'].forEach(function (lab) {
        var tr = el('tr');
        tr.appendChild(el('th', null, lab));
        var td = el('td', null, '—');
        rows.push(td);
        tr.appendChild(td);
        tb.node.appendChild(tr);
      });
    })();

    var stats = statsRow(root);
    var sTouch = stats.add('相对父类的总改动量');
    var sReuse = stats.add('原样复用的模块');
    var sHeavy = stats.add('改得最多的一块');
    var sYear = stats.add('年份');
    var verdict = verdictBox(root);

    note(root, [
      '**继承树就是论文谱系树**：`ADDAgent(AMPAgent)`、`ASEAgent(AMPAgent)`、`AMPAgent(PPOAgent)` —— ' +
        '代码里的继承关系和这些方法在时间线上的演化顺序是一一对应的。这也是拿它当「代码索引」读的最大好处。',
      '**改动量小不等于贡献小**：ADD 在这张图上几乎是最省的，但它换掉的是判别器的输入语义 —— ' +
        '一个非常小的改动位置，撬动的是「要不要手写 tracking reward」这个大问题。',
      '**反过来也成立**：ASE 几乎每块都动了，因为 latent 要同时进 actor、critic、encoder 和采样逻辑。' +
        '一个方法在框架里「插不进去」，往往说明它需要的抽象和框架当初的切分不一致。',
      '**这是示意，不是统计**：改动量是按笔记里的源码对照定性给的，不是真去数了 diff 行数。' +
        '它用来建立「谁动了哪一层」的直觉，不能当成实际的代码指标。'
    ]);

    var render = registerRenderer(function () {
      var a = state.algo;
      var total = a.touch.reduce(function (x, y) {
        return x + y;
      }, 0);
      var reuse = a.touch.filter(function (v) {
        return v < 0.05;
      }).length;
      var heavy = 0;
      a.touch.forEach(function (v, i) {
        if (v > a.touch[heavy]) heavy = i;
      });

      sTouch.set(fmt(total, 2) + ' / ' + MODULES.length, total < 2 ? 'good' : total > 3.2 ? 'bad' : 'warn');
      sReuse.set(reuse + ' 块', reuse >= 2 ? 'good' : 'warn');
      sHeavy.set(MODULES[heavy], 'accent');
      sYear.set(String(a.year));
      [a.disc, a.pos, a.reward, a.lookahead, a.file].forEach(function (v, i) {
        rows[i].textContent = '';
        K.rich(rows[i], v);
      });

      verdict.set('📌 ' + a.name + '：' + a.one + '。', total < 2 ? 'learning' : 'frozen');

      // ── 左：时间线 ──
      var g = begin(lineStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 30, r: 22, t: 26, b: 40 }, [2016, 2026], [0, 1]);
      axes(g, p, {
        xTicks: [2017, 2019, 2021, 2023, 2025],
        yTicks: [],
        xFmt: function (t) {
          return fmt(t, 0);
        }
      });
      text(g.ctx, '谱系：每一步都在补上一步的缺口', p.x0, p.y1 - 10, P.muted, 'left', '11px sans-serif');
      line(g.ctx, [[p.x0, p.sy(0.5)], [p.x1, p.sy(0.5)]], P.grid, 2);
      ALGOS.forEach(function (q, i) {
        var x = p.sx(q.year);
        var active = q.id === a.id;
        dot(g.ctx, x, p.sy(0.5), active ? 7 : 4.5, active ? P.accent : P.muted, P.surface2);
        text(g.ctx, q.name, x, p.sy(0.5) + (i % 2 ? 20 : -18), active ? P.accent : P.muted, 'center', active ? 'bold 11px sans-serif' : '11px sans-serif');
      });

      // ── 右：模块改动量 ──
      var g2 = begin(barStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 46, r: 14, t: 26, b: 40 }, [0, MODULES.length], [0, 1.05]);
      axes(g2, p2, {
        yTicks: [0, 0.5, 1],
        yFmt: function (t) {
          return t === 0 ? '复用' : t === 1 ? '全换' : '';
        }
      });
      text(g2.ctx, a.name + ' 改动了哪几块', p2.x0, p2.y1 - 10, P2.muted, 'left', '11px sans-serif');
      var slot = (p2.x1 - p2.x0) / MODULES.length;
      MODULES.forEach(function (m, i) {
        var cx = p2.x0 + slot * (i + 0.5);
        var bw = Math.max(10, slot * 0.5);
        var v = a.touch[i];
        var color = v > 0.7 ? P2.bad : v > 0.15 ? P2.warn : P2.good;
        g2.ctx.fillStyle = color;
        g2.ctx.globalAlpha = v < 0.05 ? 0.35 : 1;
        g2.ctx.fillRect(cx - bw / 2, p2.sy(Math.max(v, 0.03)), bw, p2.y0 - p2.sy(Math.max(v, 0.03)));
        g2.ctx.globalAlpha = 1;
        barLabel(g2, p2, cx, p2.sy(Math.max(v, 0.03)), v < 0.05 ? '复用' : fmt(v, 1), color);
        text(g2.ctx, m, cx, p2.y0 + 15, P2.muted, 'center', '10px sans-serif');
      });

      lineStage.canvas.setAttribute('aria-label', '运动模仿方法的时间线');
      barStage.canvas.setAttribute('aria-label', '当前算法对框架五大模块的改动量');
    });

    render();
  }

  // ─── demo 2: G1 walk 的五项奖励 ─────────────────────────────────────────
  /* 默认误差就是笔记里手推的那一帧：0.40 / 30 / 0.02 / 0.05 / 0.01 → r ≈ 0.893。 */
  var TERMS = [
    { key: 'pose', name: 'pose', w: 0.5, a: 0.25, err: 0.4, unit: 'rad²', max: 4, step: 0.05, digits: 2 },
    { key: 'vel', name: 'vel', w: 0.1, a: 0.01, err: 30, unit: '(rad/s)²', max: 300, step: 5, digits: 0 },
    { key: 'root_pose', name: 'root_pose', w: 0.15, a: 5.0, err: 0.02, unit: 'm²', max: 0.6, step: 0.01, digits: 2 },
    { key: 'root_vel', name: 'root_vel', w: 0.1, a: 1.0, err: 0.05, unit: '(m/s)²', max: 2, step: 0.05, digits: 2 },
    { key: 'key_pos', name: 'key_pos', w: 0.15, a: 10.0, err: 0.01, unit: 'm²', max: 0.4, step: 0.01, digits: 2 }
  ];

  function buildRewardDemo(host) {
    var root = card(host, {
      title: 'G1 walk 的五项奖励：权重管「谁重要」，scale 管「多敏感」',
      sub:
        '默认这一组误差就是笔记里手推的那一帧，加起来 r ≈ 0.893。' +
        '注意 key_pos 的权重只有 0.15，但 scale 是 10.0 —— 它对误差的反应比 pose 陡得多。'
    });

    var state = {
      errs: TERMS.map(function (t) {
        return t.err;
      })
    };

    var ctrls = controlsRow(root);
    var sliders = [];
    TERMS.forEach(function (t, i) {
      sliders.push(
        slider(ctrls, {
          label: t.name + ' 误差（' + t.unit + '）',
          min: 0,
          max: t.max,
          step: t.max / 120,
          value: state.errs[i],
          format: function (v) {
            return fmt(v, t.digits);
          },
          onInput: function (v) {
            state.errs[i] = v;
            render();
          }
        })
      );
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '笔记里那一帧（r ≈ 0.893）', function () {
      state.errs = TERMS.map(function (t) {
        return t.err;
      });
      sliders.forEach(function (s, i) {
        s.set(state.errs[i], true);
      });
      render();
    });
    button(btns, '完美跟踪（全 0）', function () {
      state.errs = TERMS.map(function () {
        return 0;
      });
      sliders.forEach(function (s) {
        s.set(0, true);
      });
      render();
    });
    button(btns, '脚放歪了（key_pos = 0.2）', function () {
      state.errs[4] = 0.2;
      sliders[4].set(0.2, true);
      render();
    });

    var setLegend = legend(root, [
      { key: 'accent', text: '这一项当前贡献的奖励' },
      { key: 'muted', text: '这一项的权重上限 w' },
      { key: 'warn', text: 'scale 越大，曲线越陡' }
    ]);

    var grid = stageGrid(root);
    var barStage = stage(grid, 235);
    var curveStage = stage(grid, 235);

    var tb = table(root);
    var cells = [];
    (function () {
      var head = ['项'];
      TERMS.forEach(function (t) {
        head.push(t.name);
      });
      tb.row(head, true);
      [['权重 $w$', 'w'], ['scale $\\alpha$', 'a'], ['$\\exp(-\\alpha e)$', null], ['$w \\times \\exp$', null]].forEach(function (spec) {
        var tr = el('tr');
        tr.appendChild(el('th', null, spec[0]));
        var row = [];
        TERMS.forEach(function (t) {
          var td = el('td', null, spec[1] ? fmt(t[spec[1]], spec[1] === 'w' ? 2 : 2) : '—');
          row.push(td);
          tr.appendChild(td);
        });
        cells.push(row);
        tb.node.appendChild(tr);
      });
    })();

    var stats = statsRow(root);
    var sR = stats.add('这一帧的 $r_t$');
    var sTop = stats.add('贡献最大的一项');
    var sLoss = stats.add('损失最多的一项');
    var sRet = stats.add('50 步 episode return');
    var verdict = verdictBox(root);

    note(root, [
      '**权重和 scale 是两个旋钮，别混**：w 决定这一项最多能拿多少分（五个 w 加起来是 1），' +
        '$\\alpha$ 决定误差多大就把这一项打掉。pose 的 w 最大但 $\\alpha$ 只有 0.25 —— 它是「主轴但宽容」；' +
        'key_pos 的 w 只有 0.15 而 $\\alpha$ 是 10.0 —— 它是「占比小但苛刻」。',
      '**这就是为什么手调奖励难**：五项之间是加法关系，任何一项的 $\\alpha$ 调错都会改变策略的优先级排序。' +
        'AMP / ADD 那条线想解决的正是这件事 —— 把这十个数交给判别器去学。',
      '**vel 的 $\\alpha$ 故意最小**：0.01 意味着关节速度差到 30 (rad/s)² 也只掉 26%。' +
        '速度项如果太敏感，策略会为了压速度误差而输出高频动作 —— 反而抖。',
      '**这一帧的 0.893 乘 50 步 ≈ 40+**：这就是笔记里那个 return 量级的来源，也是 PPO 实际在最大化的东西。'
    ]);

    var render = registerRenderer(function () {
      var parts = TERMS.map(function (t, i) {
        return t.w * Math.exp(-t.a * state.errs[i]);
      });
      var r = parts.reduce(function (x, y) {
        return x + y;
      }, 0);
      var top = 0,
        worst = 0;
      parts.forEach(function (v, i) {
        if (v > parts[top]) top = i;
        if (TERMS[i].w - v > TERMS[worst].w - parts[worst]) worst = i;
      });

      sR.set(fmt(r, 3), r > 0.85 ? 'good' : r < 0.6 ? 'bad' : 'warn');
      sTop.set(TERMS[top].name + '（' + fmt(parts[top], 3) + '）', 'accent');
      sLoss.set(TERMS[worst].name + '（−' + fmt(TERMS[worst].w - parts[worst], 3) + '）', 'bad');
      sRet.set(fmt(r * 50, 1), r * 50 > 40 ? 'good' : 'warn');
      TERMS.forEach(function (t, i) {
        cells[2][i].textContent = fmt(Math.exp(-t.a * state.errs[i]), 3);
        cells[3][i].textContent = fmt(parts[i], 3);
        cells[3][i].className = parts[i] > t.w * 0.9 ? 'is-good' : parts[i] < t.w * 0.4 ? 'is-bad' : '';
      });

      if (Math.abs(r - 0.893) < 0.004) {
        verdict.set(
          '✅ 这就是笔记里手推的那一帧：$r_t$ ≈ ' +
            fmt(r, 3) +
            '。五项分别是 ' +
            parts
              .map(function (v) {
                return fmt(v, 3);
              })
              .join(' / ') +
            '。乘上 50 步的稳定跟踪，单 episode return 约 ' +
            fmt(r * 50, 0) +
            ' —— PPO 优化的就是这个数。',
          'learning'
        );
      } else if (r > 0.97) {
        verdict.set(
          '🎯 几乎完美跟踪：$r_t$ = ' +
            fmt(r, 3) +
            '。注意五项的上限加起来正好是 1（0.5 + 0.1 + 0.15 + 0.1 + 0.15），' +
            '所以 $r_t$ 天然落在 [0, 1] 里 —— 这让不同动作、不同角色之间的 return 有可比性。',
          'learning'
        );
      } else {
        verdict.set(
          '📉 $r_t$ = ' +
            fmt(r, 3) +
            '，掉得最多的是「' +
            TERMS[worst].name +
            '」（比满分少 ' +
            fmt(TERMS[worst].w - parts[worst], 3) +
            '）。策略的梯度会优先去修这一项 —— 谁掉得多，谁就先被修。',
          'frozen'
        );
      }

      // ── 左：各项贡献 ──
      var g = begin(barStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 24, b: 38 }, [0, TERMS.length], [0, 0.55]);
      axes(g, p, {
        yTicks: [0, 0.15, 0.3, 0.45],
        yFmt: function (t) {
          return fmt(t, 2);
        }
      });
      text(g.ctx, '每一项拿到多少（灰线是它的上限 w）', p.x0, p.y1 - 10, P.muted, 'left', '11px sans-serif');
      var slot = (p.x1 - p.x0) / TERMS.length;
      TERMS.forEach(function (t, i) {
        var cx = p.x0 + slot * (i + 0.5);
        var bw = Math.max(10, slot * 0.48);
        g.ctx.fillStyle = P.accent;
        g.ctx.fillRect(cx - bw / 2, p.sy(parts[i]), bw, p.y0 - p.sy(parts[i]));
        line(g.ctx, [[cx - bw / 2 - 3, p.sy(t.w)], [cx + bw / 2 + 3, p.sy(t.w)]], P.muted, 1.4, [3, 3]);
        barLabel(g, p, cx, p.sy(parts[i]), fmt(parts[i], 3), P.accent);
        text(g.ctx, t.name, cx, p.y0 + 15, P.muted, 'center', '10px sans-serif');
      });

      // ── 右：五条指数核 ──
      var g2 = begin(curveStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 24, b: 38 }, [0, 1], [0, 1.05]);
      axes(g2, p2, {
        xTicks: [0, 0.25, 0.5, 0.75, 1],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        xFmt: function (t) {
          return fmt(t, 2);
        },
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '误差（按各自量程归一化）'
      });
      text(g2.ctx, 'exp(−α·e)：α 越大掉得越快', p2.x0, p2.y1 - 10, P2.muted, 'left', '11px sans-serif');
      var colors = [P2.accent, P2.good, P2.warn, P2.muted, P2.bad];
      TERMS.forEach(function (t, i) {
        var pts = [];
        for (var s = 0; s <= 120; s++) {
          var u = s / 120;
          pts.push([p2.sx(u), p2.sy(Math.exp(-t.a * u * t.max))]);
        }
        line(g2.ctx, pts, colors[i], 2);
        dot(g2.ctx, p2.sx(clamp(state.errs[i] / t.max, 0, 1)), p2.sy(Math.exp(-t.a * state.errs[i])), 4, colors[i], P2.surface2);
        text(g2.ctx, t.name, p2.x1 - 6, p2.sy(0.98 - i * 0.085), colors[i], 'right', '10px sans-serif');
      });

      barStage.canvas.setAttribute('aria-label', '五项奖励各自的贡献与上限');
      curveStage.canvas.setAttribute('aria-label', '五个指数核随误差衰减的速度对比');
    });

    render();
  }

  // ─── demo 3: batch 的算术 ────────────────────────────────────────────────
  function buildConfigDemo(host) {
    var root = card(host, {
      title: '4096 × 32 = 131072：一次迭代到底吃掉多少数据',
      sub:
        'agent yaml 里那几个数字不是随手写的。拖一拖，看单次迭代的 batch、每轮的梯度步数、' +
        '以及「一条 episode 能被切成几段」怎么被它们决定。'
    });

    var state = { envs: 4096, steps: 32, actorEpochs: 5, actorBatches: 4, criticEpochs: 2, criticBatches: 2, dt: 1 / 30 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '并行环境数 num_envs',
      min: 128,
      max: 8192,
      step: 128,
      value: state.envs,
      format: function (v) {
        return fmt(v, 0);
      },
      onInput: function (v) {
        state.envs = v;
        render();
      }
    });
    slider(ctrls, {
      label: 'steps_per_iter',
      min: 4,
      max: 128,
      step: 4,
      value: state.steps,
      format: function (v) {
        return fmt(v, 0);
      },
      onInput: function (v) {
        state.steps = v;
        render();
      }
    });
    slider(ctrls, {
      label: 'actor_epochs',
      min: 1,
      max: 20,
      step: 1,
      value: state.actorEpochs,
      format: function (v) {
        return fmt(v, 0);
      },
      onInput: function (v) {
        state.actorEpochs = v;
        render();
      }
    });
    slider(ctrls, {
      label: 'actor_batches（每个 epoch 切几份）',
      min: 1,
      max: 16,
      step: 1,
      value: state.actorBatches,
      format: function (v) {
        return fmt(v, 0);
      },
      onInput: function (v) {
        state.actorBatches = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, 'MimicKit 默认（4096 / 32 / 5 / 4）', function () {
      state.envs = 4096;
      state.steps = 32;
      state.actorEpochs = 5;
      state.actorBatches = 4;
      render();
    });
    button(btns, '一张消费级显卡（512 env）', function () {
      state.envs = 512;
      render();
    });

    var setLegend = legend(root, [
      { key: 'accent', text: '单次迭代的 transition 数' },
      { key: 'good', text: '每次迭代的梯度步数' },
      { key: 'warn', text: '每段 rollout 覆盖的仿真时长' }
    ]);

    var grid = stageGrid(root);
    var barStage = stage(grid, 235);
    var curveStage = stage(grid, 235);

    var stats = statsRow(root);
    var sBatch = stats.add('单次迭代 batch');
    var sMini = stats.add('actor minibatch 大小');
    var sSteps = stats.add('每次迭代的梯度步数');
    var sSpan = stats.add('一段 rollout 覆盖多久');
    var verdict = verdictBox(root);

    note(root, [
      '**steps_per_iter 只有 32，是因为环境有 4096 个**：32 步在 30 Hz 下只有约 1 秒，' +
        '远短于一条 10 秒的 episode —— PPO 靠 GAE 的 bootstrap 把没跑完的部分接上，' +
        '所以它不需要「跑完整条 episode 再更新」。',
      '**epochs × batches 决定复用强度**：actor 默认 5 × 4 = 20 个梯度步（读数里那个总数还加上了 critic 的 2 × 2），意味着同一批数据被看了 5 遍。' +
        '看得越多越省数据，但也越容易让新策略跑出 clip 范围 —— PPO 笔记里第三个演示画的就是这件事。',
      '**并行环境数是硬件决定的**：把它拖到 512，batch 立刻小一个数量级，' +
        '同样的迭代数下看到的数据少得多。这也是为什么这一代方法的超参不太能直接搬到小机器上。',
      '**这是算术，不是仿真**：这里只是把 yaml 里那几个数之间的关系算给你看，' +
        '真实的吞吐还取决于 GPU、物理步长和网络大小。'
    ]);

    var render = registerRenderer(function () {
      var batch = state.envs * state.steps;
      var mini = Math.round(batch / state.actorBatches);
      var gradSteps = state.actorEpochs * state.actorBatches + state.criticEpochs * state.criticBatches;
      var span = state.steps * state.dt;

      sBatch.set(fmt(batch / 1000, 1) + 'k', batch > 200000 ? 'warn' : batch < 20000 ? 'bad' : 'good');
      sMini.set(fmt(mini / 1000, 1) + 'k');
      sSteps.set(gradSteps + ' 步', gradSteps > 60 ? 'warn' : 'good');
      sSpan.set(fmt(span, 2) + ' s', span < 0.3 ? 'warn' : 'good');

      if (state.envs === 4096 && state.steps === 32) {
        verdict.set(
          '✅ 默认配置：4096 × 32 = ' +
            fmt(batch / 1000, 0) +
            'k transitions，切成 ' +
            state.actorBatches +
            ' 份、过 ' +
            state.actorEpochs +
            ' 遍，共 ' +
            gradSteps +
            ' 个梯度步。每段 rollout 只覆盖 ' +
            fmt(span, 2) +
            ' 秒仿真时间 —— 广度靠并行，深度靠 GAE。',
          'learning'
        );
      } else if (batch < 20000) {
        verdict.set(
          '⚠️ batch 只有 ' +
            fmt(batch / 1000, 1) +
            'k：策略梯度的方差会明显变大，同样的 lr 更容易训崩。' +
            '小机器上的常见做法是同时调小 lr 或者加大 steps_per_iter 把 batch 补回来。',
          'frozen'
        );
      } else {
        verdict.set(
          '📐 batch = ' +
            fmt(batch / 1000, 1) +
            'k，minibatch ' +
            fmt(mini / 1000, 1) +
            'k，每次迭代 ' +
            gradSteps +
            ' 个梯度步，rollout 覆盖 ' +
            fmt(span, 2) +
            ' 秒。这四个数字互相牵制，改一个就得回头看另外三个。',
          'frozen'
        );
      }

      // ── 左：batch 的构成 ──
      var g = begin(barStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 52, r: 14, t: 26, b: 38 }, [0, 3], [0, Math.max(batch, 1) * 1.2]);
      axes(g, p, {
        yTicks: K.niceTicks(0, batch * 1.2, 4),
        yFmt: function (t) {
          return fmt(t / 1000, 0) + 'k';
        }
      });
      text(g.ctx, 'transition 数量', p.x0, p.y1 - 10, P.muted, 'left', '11px sans-serif');
      var bars = [
        { label: '单次迭代', v: batch, color: P.accent },
        { label: 'actor minibatch', v: mini, color: P.good },
        { label: '一个环境贡献', v: state.steps, color: P.warn }
      ];
      var slot = (p.x1 - p.x0) / bars.length;
      bars.forEach(function (b, i) {
        var cx = p.x0 + slot * (i + 0.5);
        var bw = Math.min(58, slot * 0.5);
        g.ctx.fillStyle = b.color;
        g.ctx.fillRect(cx - bw / 2, p.sy(b.v), bw, p.y0 - p.sy(b.v));
        barLabel(g, p, cx, p.sy(b.v), b.v >= 1000 ? fmt(b.v / 1000, 1) + 'k' : fmt(b.v, 0), b.color);
        text(g.ctx, b.label, cx, p.y0 + 15, P.muted, 'center', '10px sans-serif');
      });

      // ── 右：batch 随并行环境数 ──
      var g2 = begin(curveStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 52, r: 14, t: 26, b: 38 }, [128, 8192], [0, 8192 * state.steps * 1.05]);
      axes(g2, p2, {
        xTicks: [128, 2048, 4096, 6144, 8192],
        yTicks: K.niceTicks(0, 8192 * state.steps, 4),
        yFmt: function (t) {
          return fmt(t / 1000, 0) + 'k';
        },
        xLabel: 'num_envs'
      });
      text(g2.ctx, 'batch 随并行环境数线性增长', p2.x0, p2.y1 - 10, P2.muted, 'left', '11px sans-serif');
      var pts = [];
      for (var n = 128; n <= 8192; n += 128) pts.push([p2.sx(n), p2.sy(n * state.steps)]);
      line(g2.ctx, pts, P2.accent, 2.4);
      line(g2.ctx, [[p2.sx(state.envs), p2.y0], [p2.sx(state.envs), p2.y1]], P2.text, 1, [3, 3]);
      dot(g2.ctx, p2.sx(state.envs), p2.sy(batch), 4.5, P2.accent, P2.surface2);
      line(g2.ctx, [[p2.x0, p2.sy(131072)], [p2.x1, p2.sy(131072)]], P2.good, 1.4, [5, 4]);
      text(g2.ctx, '默认的 131k', p2.x1 - 4, p2.sy(131072) - 9, P2.good, 'right', '10px sans-serif');

      barStage.canvas.setAttribute('aria-label', 'batch、minibatch 与单环境贡献的对比');
      curveStage.canvas.setAttribute('aria-label', 'batch 随并行环境数变化的曲线');
      void stepper;
    });

    render();
  }

  K.mount({
    'mimickit-family': buildFamilyDemo,
    'mimickit-reward': buildRewardDemo,
    'mimickit-config': buildConfigDemo
  });
})();
