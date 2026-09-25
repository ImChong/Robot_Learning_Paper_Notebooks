/* Interactive DeepMimic demos for
 * papers/01_Foundational_RL/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["deepmimic"]`, after assets/js/demos/kit.js. The note may only ship
 * empty `<div class="paper-demo" data-demo="...">` placeholders, because
 * scripts/sanitize_paper_html.py strips <script>/<canvas>/<input> from
 * #paper-body before publish.
 *
 * Demos:
 *   deepmimic-reward — 四维模仿奖励：k 决定严格程度，w 决定谁说了算
 *   deepmimic-rsi    — RSI × ET 消融：采样预算花在哪，决定高动态技能学不学得会
 *   deepmimic-pd     — 策略输出目标角度：PD 增益、等效惯量与 Stable PD
 *   deepmimic-curves — 训练曲线怎么读：归一化回报 / 四维分项 / ET 率 / 相位覆盖
 *   deepmimic-explainer — 五幕讲解动画：为什么模仿 → 四维奖励 → RSI → ET → 训练闭环
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
    checkbox = K.checkbox,
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
    niceTicks = K.niceTicks,
    registerRenderer = K.registerRenderer,
    mulberry32 = K.mulberry32;

  // ─── demo 1: the four-term imitation reward ──────────────────────────────
  /* Weights and sensitivities are the paper's own (附录 B), and the default
     errors are the t=15 例子 worked through in the note: r_I ≈ 0.81. */
  var TERMS = [
    {
      key: 'pose',
      name: '$r^p$ 关节姿态',
      nameTex: 'r^p \\text{ 关节姿态}',
      w: 0.65,
      k: 2,
      unit: 'rad²',
      err: 0.09,
      max: 1.5,
      step: 0.01,
      joints: 13,
      hint: '13 个关节四元数差分的平方和'
    },
    {
      key: 'vel',
      name: '$r^v$ 关节速度',
      nameTex: 'r^v \\text{ 关节速度}',
      w: 0.1,
      k: 0.1,
      unit: '(rad/s)²',
      err: 1.0,
      max: 40,
      step: 0.5,
      hint: '关节角速度差的平方和'
    },
    {
      key: 'ee',
      name: '$r^e$ 末端位置',
      nameTex: 'r^e \\text{ 末端位置}',
      w: 0.15,
      k: 40,
      unit: 'm²',
      err: 0.0072,
      max: 0.12,
      step: 0.0004,
      joints: 4,
      hint: '双手双脚位置差的平方和'
    },
    {
      key: 'com',
      name: '$r^c$ 质心位置',
      nameTex: 'r^c \\text{ 质心位置}',
      w: 0.1,
      k: 10,
      unit: 'm²',
      err: 0.04,
      max: 0.5,
      step: 0.005,
      joints: 1,
      hint: '质心位置差的平方'
    }
  ];

  function buildRewardDemo(host) {
    var root = card(host, {
      title: '模仿奖励的四个分量：k 决定「多严格」，w 决定「谁说了算」',
      sub:
        '每个分量都是 exp(−k·误差)，默认误差就是正文 t=15（空中团身）那个例子。' +
        '拖动误差看四项各掉多少分，再看它们按 0.65 / 0.1 / 0.15 / 0.1 加权后的模仿奖励 $r_I$。'
    });

    var state = {
      err: TERMS.map(function (t) {
        return t.err;
      }),
      taskR: 0.5,
      wI: 0.7
    };

    var ctrls = controlsRow(root);
    var errSliders = [];
    TERMS.forEach(function (term, i) {
      errSliders.push(
        slider(ctrls, {
          label: term.name + ' 的误差（' + term.unit + '）',
          min: 0,
          max: term.max,
          step: term.step,
          value: term.err,
          format: function (v) {
            return fmt(v, term.step < 0.001 ? 4 : term.step < 0.01 ? 3 : 2);
          },
          onInput: function (v) {
            state.err[i] = v;
            render();
          }
        })
      );
    });
    slider(ctrls, {
      label: '任务奖励 $r^G$（前进速度等）',
      min: 0,
      max: 1,
      step: 0.01,
      value: state.taskR,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.taskR = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '回到正文例子（t=15）', function () {
      state.err = TERMS.map(function (t) {
        return t.err;
      });
      rebuild();
    });
    button(btns, '姿态对了但手脚没到位', function () {
      state.err = [0.05, 1.0, 0.06, 0.04];
      rebuild();
    });
    button(btns, '整体偏了一点点', function () {
      state.err = [0.3, 6, 0.02, 0.15];
      rebuild();
    });

    var tb = table(root);
    var cells = { r: [], contrib: [], eq: [] };

    function buildTable() {
      tb.clear();
      cells = { r: [], contrib: [], eq: [] };
      tb.row(
        ['分量'].concat(
          TERMS.map(function (t) {
            return t.name;
          })
        ),
        true
      );
      function row(label, store, valueFn) {
        var tr = el('tr');
        tr.appendChild(el('th', null, label));
        TERMS.forEach(function (t, i) {
          var td = el('td', null, valueFn ? valueFn(t, i) : '—');
          if (store) store.push(td);
          tr.appendChild(td);
        });
        tb.node.appendChild(tr);
      }
      row('权重 w', null, function (t) {
        return fmt(t.w, 2);
      });
      row('敏感度 k', null, function (t) {
        return String(t.k);
      });
      row('等效误差', cells.eq);
      row('分量奖励 exp(−k·e)', cells.r);
      row('加权贡献 w·r', cells.contrib);
    }
    buildTable();

    function rebuild() {
      errSliders.forEach(function (s, i) {
        s.set(state.err[i], true);
      });
      render();
    }

    var setLegend = legend(root, [
      { key: 'accent', text: 'k=2 姿态' },
      { key: 'good', text: 'k=0.1 速度' },
      { key: 'bad', text: 'k=40 末端' },
      { key: 'warn', text: 'k=10 质心' }
    ]);

    var grid = stageGrid(root);
    var curveStage = stage(grid, 220);
    var barStage = stage(grid, 220);

    var stats = statsRow(root);
    var sImit = stats.add('模仿奖励 $r_I$');
    var sTotal = stats.add('总奖励 $0.7\\,r^I + 0.3\\,r^G$');
    var sWeak = stats.add('掉分最多的分量');
    var verdict = verdictBox(root);

    note(root, [
      '**$k$ 是「这项有多计较」**：同样是 0.05 的误差，末端项（$k=40$）只剩 $\\exp(-2)=0.14$，速度项（$k=0.1$）还有 0.995。论文给手脚定了最高的精度要求，给速度留了最大的宽容度 —— 因为动捕速度本身就是差分出来的噪声大户。',
      '**$w$ 是「这项占多少分」**：姿态项拿了 0.65 的权重，所以哪怕它只掉 0.1，总分也要跟着掉 0.065；质心项权重只有 0.1，掉半分也只影响 0.05。**$k$ 和 $w$ 是两件事**：$k$ 管曲线陡不陡，$w$ 管这条曲线在总分里的份额。',
      '**为什么一定是 $\\exp(-k e)$ 而不是 $-k e$**：误差为 0 时满分 1，误差大时平滑趋近 0 —— 四项天然都在 $(0, 1]$ 区间，可以直接加权相加，不用再做归一化；而且大误差处梯度自然变平，不会一个分量的爆炸误差把整个奖励拖成负无穷。',
      '**别忘了还有任务奖励**：正文 $\\omega^I = 0.7$、$\\omega^G = 0.3$ 对所有任务固定。正文 Q5 引的消融很能说明问题 —— Strike 任务只给模仿奖励时成功率 19%，加上任务奖励后 99%：模仿负责「像不像」，任务负责「干没干成」。'
    ]);

    var render = registerRenderer(function () {
      var rs = TERMS.map(function (t, i) {
        return Math.exp(-t.k * state.err[i]);
      });
      var contrib = TERMS.map(function (t, i) {
        return t.w * rs[i];
      });
      var rI = contrib.reduce(function (a, b) {
        return a + b;
      }, 0);
      var total = state.wI * rI + (1 - state.wI) * state.taskR;

      TERMS.forEach(function (t, i) {
        if (cells.r[i]) {
          cells.r[i].textContent = fmt(rs[i], 3);
          cells.r[i].className = rs[i] > 0.8 ? 'is-good' : rs[i] < 0.4 ? 'is-bad' : '';
        }
        if (cells.contrib[i]) cells.contrib[i].textContent = fmt(contrib[i], 3);
        if (cells.eq[i]) {
          // 把平方和折算回「平均每个关节 / 每只手脚差多少」，误差才有画面感
          var n = t.joints || 1;
          var per = Math.sqrt(state.err[i] / n);
          cells.eq[i].textContent =
            t.key === 'vel'
              ? fmt(per, 2) + ' rad/s'
              : t.key === 'pose'
                ? fmt((per * 180) / Math.PI, 1) + '°/关节'
                : fmt(per * 100, 1) + ' cm';
        }
      });

      var worst = 0;
      TERMS.forEach(function (t, i) {
        if (t.w * (1 - rs[i]) > TERMS[worst].w * (1 - rs[worst])) worst = i;
      });
      sImit.set(fmt(rI, 3), rI > 0.75 ? 'good' : rI < 0.4 ? 'bad' : 'warn');
      sTotal.set(fmt(total, 3), total > 0.7 ? 'good' : 'warn');
      sWeak.set(TERMS[worst].name + '（−' + fmt(TERMS[worst].w * (1 - rs[worst]), 3) + '）', 'bad');

      // ── left: the four exp(−k·e) curves on a shared normalised error axis ──
      var g = begin(curveStage);
      var P = g.P;
      setLegend(P);
      var colors = [P.accent, P.good, P.bad, P.warn];
      var p = plot(g, { l: 42, r: 14, t: 18, b: 34 }, [0, 1], [0, 1.05]);
      axes(g, p, {
        xTicks: [0, 0.25, 0.5, 0.75, 1],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        xFmt: function (t) {
          return fmt(t, 2);
        },
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '该分量误差 / 滑块量程'
      });
      text(g.ctx, 'exp(−k·误差)：k 越大掉得越快', p.x0, p.y1 - 6, P.muted, 'left', '11px sans-serif');
      TERMS.forEach(function (t, i) {
        var pts = [];
        for (var s = 0; s <= 100; s++) {
          var e = (t.max * s) / 100;
          pts.push([p.sx(e / t.max), p.sy(Math.exp(-t.k * e))]);
        }
        line(g.ctx, pts, colors[i], i === 0 ? 2.4 : 1.8);
        dot(g.ctx, p.sx(state.err[i] / t.max), p.sy(rs[i]), 4, colors[i], P.surface2);
      });

      // ── right: stacked weighted contributions ──
      var g2 = begin(barStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 42, r: 14, t: 18, b: 34 }, [0, 4], [0, 1.05]);
      axes(g2, p2, {
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) {
          return fmt(t, 2);
        }
      });
      text(g2.ctx, '加权贡献堆起来就是 r_I', p2.x0, p2.y1 - 6, P2.muted, 'left', '11px sans-serif');
      var colors2 = [P2.accent, P2.good, P2.bad, P2.warn];
      // 每个分量两根：上限 w（满分）与实际 w·r
      var slot = (p2.x1 - p2.x0) / 4;
      var acc = 0;
      TERMS.forEach(function (t, i) {
        var x = p2.x0 + slot * i + slot * 0.18;
        var bw = slot * 0.64;
        g2.ctx.globalAlpha = 0.22;
        g2.ctx.fillStyle = colors2[i];
        g2.ctx.fillRect(x, p2.sy(t.w), bw, p2.y0 - p2.sy(t.w));
        g2.ctx.globalAlpha = 1;
        g2.ctx.fillStyle = colors2[i];
        g2.ctx.fillRect(x, p2.sy(contrib[i]), bw, p2.y0 - p2.sy(contrib[i]));
        text(g2.ctx, K.richToPlain(t.name).split(' ')[0], p2.x0 + slot * (i + 0.5), p2.y0 + 13, P2.muted, 'center', '10px monospace');
        barLabel(g2, p2, p2.x0 + slot * (i + 0.5), p2.sy(contrib[i]), fmt(contrib[i], 2));
        acc += contrib[i];
      });
      line(g2.ctx, [[p2.x0, p2.sy(rI)], [p2.x1, p2.sy(rI)]], P2.text, 1.5, [5, 3]);
      text(g2.ctx, 'r_I = ' + fmt(rI, 3), p2.x1 - 4, p2.sy(rI) - 9, P2.text, 'right', '11px monospace');

      verdict.set(
        '$r_I$ = ' +
          fmt(rI, 3) +
          '（淡色 = 该分量的满分上限 w，实色 = 实际拿到的 w·r）。现在最拖后腿的是 **' +
          TERMS[worst].name +
          '**：它的 k = ' +
          TERMS[worst].k +
          '，当前误差让它只剩 ' +
          fmt(rs[worst], 2) +
          ' 分，乘上权重 ' +
          fmt(TERMS[worst].w, 2) +
          ' 后丢掉 ' +
          fmt(TERMS[worst].w * (1 - rs[worst]), 3) +
          '。',
        rI > 0.75 ? 'learning' : 'frozen'
      );

      curveStage.canvas.setAttribute('aria-label', '四个奖励分量的指数衰减曲线');
      barStage.canvas.setAttribute('aria-label', '四个分量的加权贡献柱状图');
    });

    render();
  }

  // ─── demo 2: RSI × ET ────────────────────────────────────────────────────
  /* A deliberately crude model of what the ablation in 正文 Q7 measures: a clip
     is a chain of stages, an episode can only practise the stage it is standing
     in, and the sampling budget is fixed. RSI decides where an episode starts,
     ET decides how expensive a failure is. Nothing here is the paper's
     simulator — it only reproduces the mechanism the ablation isolates. */
  var SKILLS = {
    backflip: { name: '后空翻（高动态）', stages: 10, p0: 0.04, lr: 0.02, flail: 10 },
    walk: { name: '走路（低动态）', stages: 10, p0: 0.88, lr: 0.02, flail: 10 }
  };

  function runAblation(skill, useRsi, useEt, budget, seed) {
    var rng = mulberry32(seed);
    var S = skill.stages;
    var p = [];
    for (var i = 0; i < S; i++) p.push(skill.p0);
    var visits = new Array(S);
    for (var v = 0; v < S; v++) visits[v] = 0;

    var used = 0;
    var trace = [];
    var sampleStep = Math.max(1, Math.round(budget / 60));

    function successRate() {
      return p.reduce(function (a, b) {
        return a * b;
      }, 1);
    }

    while (used < budget) {
      var stage0 = useRsi ? Math.floor(rng() * S) : 0;
      var s = stage0;
      while (used < budget) {
        used++;
        visits[s]++;
        /* 进入这一阶段时状态有多干净：RSI 的起点就是参考动作本身（干净 = 1），
           其余阶段只能靠自己走进来，上一阶段做得越差，这一步的学习信号越糊。
           这就是「没有 RSI 就必须先学会起跳，才谈得上练翻转」。 */
        var quality = s === stage0 ? 1 : p[s - 1];
        p[s] = p[s] + skill.lr * quality * (1 - p[s]);
        if (rng() < p[s]) {
          s++;
          if (s >= S) break; // 整段走完
        } else {
          // 失败：有 ET 就立刻重开，没有就继续在地上挣扎
          if (!useEt) used += skill.flail;
          break;
        }
      }
      if (trace.length === 0 || used - trace[trace.length - 1].used >= sampleStep) {
        trace.push({ used: Math.min(used, budget), rate: successRate() });
      }
    }
    trace.push({ used: budget, rate: successRate() });
    return { trace: trace, visits: visits, rate: successRate(), p: p.slice() };
  }

  var CONFIGS = [
    { key: 'both', label: 'RSI + ET', rsi: true, et: true, color: 'accent' },
    { key: 'et', label: '仅 ET', rsi: false, et: true, color: 'good' },
    { key: 'rsi', label: '仅 RSI', rsi: true, et: false, color: 'bad' },
    { key: 'none', label: '都不用', rsi: false, et: false, color: 'muted' }
  ];

  function buildRsiDemo(host) {
    var root = card(host, {
      title: 'RSI × ET 消融：同样的采样预算，花在哪里',
      sub:
        '把一段参考动作看成一串阶段（助跑 → 起跳 → 翻转 → 落地…）。每消耗一个样本只能练当前所在的阶段，练一次这一步的成功率就往上挪一点。' +
        'RSI 决定 episode 从哪个阶段开始，ET 决定摔倒之后多久能重开 —— 其余什么都不改。'
    });

    var state = { skill: 'backflip', budget: 3000, seed: 11, flail: 10, seeds: 8 };
    var runs = null;

    var ctrls = controlsRow(root);
    var skillBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(skillBox);
    var skillBtns = [];
    Object.keys(SKILLS).forEach(function (key) {
      var b = button(skillBox, SKILLS[key].name, function () {
        state.skill = key;
        skillBtns.forEach(function (x) {
          x.node.className = 'demo-btn' + (x.key === key ? ' is-active' : '');
        });
        recompute();
      });
      skillBtns.push({ node: b, key: key });
    });
    skillBtns.forEach(function (x) {
      x.node.className = 'demo-btn' + (x.key === state.skill ? ' is-active' : '');
    });

    slider(ctrls, {
      label: '采样预算（步）',
      min: 1000,
      max: 20000,
      step: 250,
      value: state.budget,
      format: function (v) {
        return fmt(v, 0);
      },
      onInput: function (v) {
        state.budget = v;
        recompute();
      }
    });
    slider(ctrls, {
      label: '摔倒后浪费的步数（没有 ET 时）',
      min: 2,
      max: 60,
      step: 2,
      value: state.flail,
      format: function (v) {
        return fmt(v, 0) + ' 步';
      },
      onInput: function (v) {
        state.flail = v;
        recompute();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    button(btns, '换一组随机种子', function () {
      state.seed = (state.seed * 37 + 5) % 9967;
      recompute();
    });

    var setLegend = legend(
      root,
      CONFIGS.map(function (c) {
        return { key: c.color, text: c.label };
      })
    );

    var grid = stageGrid(root);
    var curveStage = stage(grid, 230);
    var visitStage = stage(grid, 230);

    var stats = statsRow(root);
    var sBoth = stats.add('RSI + ET');
    var sEt = stats.add('仅 ET');
    var sRsi = stats.add('仅 RSI');
    var sNone = stats.add('都不用');
    var verdict = verdictBox(root);

    note(root, [
      '**ET 在省钱**：关掉 ET，一次摔倒要多烧几十步「在地上挣扎」的样本。预算是固定的，烧掉的每一步都不再用于练动作 —— 正文 Q4 说的「避免在已摔倒状态上浪费采样」就是这条。',
      '**RSI 在铺开**：关掉 RSI，每个 episode 都从第 0 阶段起步，后面的阶段**必须先通过前面所有阶段**才可能被练到。看右边的柱状图：没有 RSI 时练习次数几乎全压在前两个阶段，空翻的落地阶段根本轮不到。',
      '**为什么「仅 RSI」最惨**：RSI 把 episode 铺到了各个阶段，但每个阶段都还很菜、一练就摔，而没有 ET 的摔倒又特别贵 —— 铺得越开，摔得越多，预算烧得越快。正文 Q7 的消融表里 Backflip 仅 RSI 只有 0.379，比仅 ET 的 0.730 还差一大截，就是这个组合效应。',
      '**再往右拖预算，大家都能学会**：这个模型里只要样本给够，四条线最终都会爬上去 —— 差的是**效率**。论文固定了样本量（Humanoid 单技能约 6000 万），所以效率差距直接表现成最终回报的差距。',
      '**走路为什么无所谓**：切到「走路」预设，四条曲线几乎重合 —— 每个阶段本来就容易通过，摔得少，ET 省不下多少，RSI 也不缺练习机会。正文 Q7 表里 Walk 那一行（0.980 / 0.981 / 0.974）就是这个意思。',
      '**注意这是个简化模型**：它只复现消融实验隔离出来的那个机制（预算怎么分配给各阶段），并不是论文的物理仿真，数值不能和论文的归一化回报直接比。'
    ]);

    function recompute() {
      var skill = {
        name: SKILLS[state.skill].name,
        stages: SKILLS[state.skill].stages,
        p0: SKILLS[state.skill].p0,
        lr: SKILLS[state.skill].lr,
        flail: state.flail
      };
      runs = {};
      CONFIGS.forEach(function (c) {
        // 多个种子取平均：单次运行的成败太看运气
        var traces = [],
          visits = null,
          rate = 0;
        for (var s = 0; s < state.seeds; s++) {
          var r = runAblation(skill, c.rsi, c.et, state.budget, state.seed + s * 101);
          traces.push(r.trace);
          rate += r.rate / state.seeds;
          if (!visits) {
            visits = r.visits.slice();
          } else {
            for (var i = 0; i < visits.length; i++) visits[i] += r.visits[i];
          }
        }
        runs[c.key] = { traces: traces, visits: visits, rate: rate };
      });
      render();
    }

    var render = registerRenderer(function () {
      if (!runs) return;
      var skill = SKILLS[state.skill];

      sBoth.set(fmt(runs.both.rate, 3), 'good');
      sEt.set(fmt(runs.et.rate, 3), runs.et.rate > runs.rsi.rate ? 'accent' : 'warn');
      sRsi.set(fmt(runs.rsi.rate, 3), runs.rsi.rate < runs.et.rate ? 'bad' : 'accent');
      sNone.set(fmt(runs.none.rate, 3), 'warn');

      // ── left: success rate vs samples spent ──
      var g = begin(curveStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 18, b: 34 }, [0, state.budget], [0, 1.05]);
      axes(g, p, {
        xTicks: niceTicks(0, state.budget, 4),
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        xFmt: function (t) {
          return t >= 1000 ? fmt(t / 1000, t % 1000 === 0 ? 0 : 1) + 'k' : fmt(t, 0);
        },
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '已消耗的采样步数'
      });
      text(g.ctx, '从头跑完整段动作的成功率', p.x0, p.y1 - 6, P.muted, 'left', '11px sans-serif');
      CONFIGS.forEach(function (c) {
        var traces = runs[c.key].traces;
        // 逐点平均：按各 trace 的采样点对齐到统一网格
        var pts = [];
        for (var q = 0; q <= 60; q++) {
          var x = (state.budget * q) / 60;
          var acc = 0;
          for (var t = 0; t < traces.length; t++) {
            var tr = traces[t];
            var val = tr[0].rate;
            for (var m = 0; m < tr.length; m++) {
              if (tr[m].used <= x) val = tr[m].rate;
              else break;
            }
            acc += val;
          }
          pts.push([p.sx(x), p.sy(acc / traces.length)]);
        }
        line(g.ctx, pts, P[c.color], c.key === 'both' ? 2.8 : 2);
      });

      // ── right: how often each stage got practised ──
      var g2 = begin(visitStage);
      var P2 = g2.P;
      var S = skill.stages;
      var maxV = 1;
      CONFIGS.forEach(function (c) {
        runs[c.key].visits.forEach(function (v) {
          if (v > maxV) maxV = v;
        });
      });
      var p2 = plot(g2, { l: 48, r: 14, t: 18, b: 34 }, [0, S], [0, maxV * 1.08]);
      axes(g2, p2, {
        yTicks: niceTicks(0, maxV * 1.08, 4),
        yFmt: function (t) {
          return t >= 1000 ? fmt(t / 1000, 1) + 'k' : fmt(t, 0);
        },
        xLabel: '参考动作的第几个阶段'
      });
      text(g2.ctx, '每个阶段被练到的次数', p2.x0, p2.y1 - 6, P2.muted, 'left', '11px sans-serif');
      var slot = (p2.x1 - p2.x0) / S;
      var bw = Math.max(2, (slot - 6) / CONFIGS.length);
      for (var st = 0; st < S; st++) {
        CONFIGS.forEach(function (c, ci) {
          var v = runs[c.key].visits[st];
          var x = p2.x0 + slot * st + (slot - bw * CONFIGS.length) / 2 + ci * bw;
          g2.ctx.fillStyle = P2[c.color];
          g2.ctx.fillRect(x, p2.sy(v), bw - 1, p2.y0 - p2.sy(v));
        });
        text(g2.ctx, String(st), p2.x0 + slot * (st + 0.5), p2.y0 + 13, P2.muted, 'center', '11px monospace');
      }

      var spread = runs.both.visits[S - 1] / Math.max(1, runs.et.visits[S - 1]);
      if (state.skill === 'walk') {
        verdict.set(
          '🚶 走路：四条曲线挤在一起（' +
            fmt(runs.both.rate, 3) +
            ' / ' +
            fmt(runs.et.rate, 3) +
            ' / ' +
            fmt(runs.rsi.rate, 3) +
            ' / ' +
            fmt(runs.none.rate, 3) +
            '）。每一步本来就容易通过，摔得少 → ET 没什么可省；前面的阶段随便就过 → RSI 也没什么可铺。和正文 Q7 表里 Walk 那一行一个意思。',
          'learning'
        );
      } else {
        verdict.set(
          '🤸 后空翻：RSI + ET = ' +
            fmt(runs.both.rate, 3) +
            '，仅 ET = ' +
            fmt(runs.et.rate, 3) +
            '，仅 RSI = ' +
            fmt(runs.rsi.rate, 3) +
            '，都不用 = ' +
            fmt(runs.none.rate, 3) +
            '。最后一个阶段（落地）在 RSI + ET 下被练到的次数是仅 ET 的 ' +
            fmt(spread, 1) +
            ' 倍 —— 高动态技能的差距就是这么拉开的。',
          'frozen'
        );
      }

      curveStage.canvas.setAttribute('aria-label', '四种配置下成功率随采样预算的变化');
      visitStage.canvas.setAttribute('aria-label', '四种配置下各阶段被练习的次数');
    });

    recompute();
  }

  // ─── demo 3: the action is a target angle, not a torque ──────────────────
  /* One joint, one degree of freedom. The policy writes a target angle at the
     control rate (30 Hz in the paper); the PD controller turns it into torque
     at the simulation rate (1200 Hz). Explicit PD blows up once k_p·Δt²/M gets
     large — which is exactly the term Stable PD moves into the denominator:
     A = M + Δt·k_d + Δt²·k_p (see 附录 J). */
  function simulateJoint(opts) {
    var dt = 1 / opts.simHz;
    var steps = Math.round(opts.seconds * opts.simHz);
    var controlEvery = Math.max(1, Math.round(opts.simHz / opts.ctrlHz));
    var q = 0,
      v = 0;
    var target = 0;
    var out = { t: [], q: [], tar: [], tau: [], diverged: false, maxTau: 0, rmsRef: 0, rmsTar: 0 };
    var refAcc = 0,
      tarAcc = 0,
      errN = 0;

    for (var i = 0; i < steps; i++) {
      var t = i * dt;
      if (i % controlEvery === 0) target = opts.reference(t); // 策略 30 Hz 写一次目标角
      var tau;
      if (opts.stable) {
        // Stable PD：用 Δt 之后的预测状态算误差，k_p、k_d 进分母
        var A = opts.inertia + dt * opts.kd + dt * dt * opts.kp;
        var acc = (-opts.kp * (q + v * dt - target) - opts.kd * v) / A;
        tau = opts.inertia * acc;
        v += dt * acc;
        q += dt * v;
      } else {
        tau = opts.kp * (target - q) - opts.kd * v;
        var accE = tau / opts.inertia;
        v += dt * accE;
        q += dt * v;
      }
      if (!isFinite(q) || Math.abs(q) > 50) {
        out.diverged = true;
        q = clamp(isFinite(q) ? q : 50, -50, 50);
        v = 0;
      }
      out.maxTau = Math.max(out.maxTau, Math.abs(tau));
      var ref = opts.reference(t);
      refAcc += (q - ref) * (q - ref); // 离参考动作有多远（含控制频率造成的滞后）
      tarAcc += (q - target) * (q - target); // 离策略写下的目标角有多远（PD 自己的账）
      errN++;
      if (i % Math.max(1, Math.round(steps / 600)) === 0) {
        out.t.push(t);
        out.q.push(q);
        out.tar.push(target);
        out.tau.push(tau);
      }
    }
    out.rmsRef = Math.sqrt(refAcc / Math.max(1, errN));
    out.rmsTar = Math.sqrt(tarAcc / Math.max(1, errN));
    return out;
  }

  function buildPdDemo(host) {
    var root = card(host, {
      title: '策略输出的不是扭矩，是目标角度：PD 增益、等效惯量与 Stable PD',
      sub:
        '一个关节跟踪一段参考角度。策略以控制频率写下目标角（论文 30 Hz），PD 控制器以仿真频率把它换成扭矩（论文 1200 Hz）。' +
        '$\\tau = k_p(\\hat{q} - q) + k_d(0 - \\dot{q})$。'
    });

    var state = { kp: 1600, kd: 25, inertia: 0.12, simHz: 1200, ctrlHz: 30, stable: true };
    var seconds = 1.2;
    function reference(t) {
      return 0.9 * Math.sin(2 * Math.PI * 1.2 * t);
    }

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '比例增益 $k_p$',
      min: 50,
      max: 4000,
      step: 50,
      value: state.kp,
      format: function (v) {
        return fmt(v, 0);
      },
      onInput: function (v) {
        state.kp = v;
        render();
      }
    });
    slider(ctrls, {
      label: '阻尼增益 $k_d$',
      min: 0,
      max: 90,
      step: 1,
      value: state.kd,
      format: function (v) {
        return fmt(v, 0);
      },
      onInput: function (v) {
        state.kd = v;
        render();
      }
    });
    slider(ctrls, {
      label: '关节等效转动惯量 $M$（kg·m²）',
      min: 0.02,
      max: 1,
      step: 0.01,
      value: state.inertia,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.inertia = v;
        render();
      }
    });
    var simSlider = slider(ctrls, {
      label: '仿真频率（Hz）',
      min: 60,
      max: 1200,
      step: 30,
      value: state.simHz,
      format: function (v) {
        return fmt(v, 0) + ' Hz';
      },
      onInput: function (v) {
        state.simHz = v;
        render();
      }
    });
    var ctrlSlider = slider(ctrls, {
      label: '控制频率（策略多久写一次目标角）',
      min: 5,
      max: 120,
      step: 5,
      value: state.ctrlHz,
      format: function (v) {
        return fmt(v, 0) + ' Hz';
      },
      onInput: function (v) {
        state.ctrlHz = v;
        render();
      }
    });
    var btns = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(btns);
    checkbox(btns, '用 Stable PD（Tan et al. 2011）', state.stable, function (on) {
      state.stable = on;
      render();
    });
    button(btns, '论文默认：1200 / 30 Hz', function () {
      state.simHz = 1200;
      state.ctrlHz = 30;
      syncRateSliders();
    });
    button(btns, '把仿真降到 60 Hz 试试', function () {
      state.simHz = 60;
      syncRateSliders();
    });

    function syncRateSliders() {
      simSlider.set(state.simHz, true);
      ctrlSlider.set(state.ctrlHz, true);
      render();
    }

    var setLegend = legend(root, [
      { key: 'muted', text: '参考角度 $\\hat{q}(t)$' },
      { key: 'warn', text: '策略写下的目标角（阶梯）' },
      { key: 'accent', text: '实际关节角 q(t)' },
      { key: 'bad', text: '扭矩 $\\tau$' }
    ]);

    var grid = stageGrid(root);
    var trackStage = stage(grid, 230);
    var torqueStage = stage(grid, 230);

    var stats = statsRow(root);
    var sRmsTar = stats.add('离目标角的误差 RMS');
    var sRmsRef = stats.add('离参考动作的误差 RMS');
    var sTau = stats.add('峰值扭矩');
    var sStiff = stats.add('显式 PD 稳定数（需 < 2）');
    var sHold = stats.add('一个控制周期 = 几个物理步');
    var verdict = verdictBox(root);

    note(root, [
      '**策略为什么输出目标角**：目标角是「摆什么姿势」，PD 负责把它变成扭矩。策略写错一点，PD 只会推出一个稍微不同的姿势；如果让策略直接输出扭矩，同样的抖动会直接变成加速度 —— 这就是正文说的「策略输出更像姿态指令，学习更容易」。',
      '**30 Hz 的目标角、1200 Hz 的物理**：把控制频率拖低，橙色阶梯变粗，蓝色曲线开始一段段地「追」目标 —— 中间那几十个物理步都用同一个目标角。论文的 40 倍差距（1200 / 30）就是在这里。',
      '**「稳定数」是那个会爆的东西**：显式 PD 的每一步都在用**上一步**的误差推，步子太大就会推过头。把仿真频率拖到 60 Hz 再取消 Stable PD，扭矩直接飞到十万级别（右图）。这正是 Stable PD 要解决的问题：它用 $\\Delta t$ 之后的预测状态算误差，把 $k_p$、$k_d$ 挪进分母 $A = M + \\Delta t\\, k_d + \\Delta t^2 k_p$（正文附录 J 的那个 $A$），刚度再大也只会让响应变钝，不会炸。',
      '**$k_d$ 是刹车**：$k_d = 0$ 时关节会绕着目标角来回荡（欠阻尼）；$k_d$ 拉大到过阻尼，曲线跟不动、总是慢半拍。DeepMimic 给所有任务共用一套手调增益，这也是正文列的局限之一。'
    ]);

    var render = registerRenderer(function () {
      var sim = simulateJoint({
        kp: state.kp,
        kd: state.kd,
        inertia: state.inertia,
        simHz: state.simHz,
        ctrlHz: state.ctrlHz,
        stable: state.stable,
        seconds: seconds,
        reference: reference
      });

      var dt = 1 / state.simHz;
      // 显式积分能不能扛住：k_p 项看 ω·Δt，k_d 项看 k_d·Δt/M，两者都要明显小于 2
      var stiff = Math.max(Math.sqrt((state.kp * dt * dt) / state.inertia), (state.kd * dt) / state.inertia);
      sRmsTar.set(sim.diverged ? '发散' : fmt(sim.rmsTar, 3) + ' rad', sim.diverged ? 'bad' : sim.rmsTar < 0.12 ? 'good' : 'warn');
      sRmsRef.set(sim.diverged ? '发散' : fmt(sim.rmsRef, 3) + ' rad', sim.diverged ? 'bad' : sim.rmsRef < 0.2 ? 'good' : 'warn');
      sTau.set(sim.diverged ? '→ ∞' : fmt(sim.maxTau, 1) + ' N·m', sim.diverged ? 'bad' : 'accent');
      sStiff.set(fmt(stiff, 2), stiff > 1.6 ? 'bad' : stiff > 0.8 ? 'warn' : 'good');
      sHold.set(Math.max(1, Math.round(state.simHz / state.ctrlHz)) + ' 步');

      // ── left: tracking ──
      var g = begin(trackStage);
      var P = g.P;
      setLegend(P);
      var span = sim.diverged ? 3 : 1.6;
      var p = plot(g, { l: 44, r: 14, t: 18, b: 32 }, [0, seconds], [-span, span]);
      axes(g, p, {
        xTicks: niceTicks(0, seconds, 4),
        yTicks: niceTicks(-span, span, 4),
        xFmt: function (t) {
          return fmt(t, 1);
        },
        yFmt: function (t) {
          return fmt(t, 1);
        },
        xLabel: '时间（秒）'
      });
      text(g.ctx, '关节角度（rad）', p.x0, p.y1 - 6, P.muted, 'left', '11px sans-serif');
      var refPts = [],
        tarPts = [],
        qPts = [];
      for (var i = 0; i < sim.t.length; i++) {
        refPts.push([p.sx(sim.t[i]), p.sy(reference(sim.t[i]))]);
        tarPts.push([p.sx(sim.t[i]), p.sy(clamp(sim.tar[i], -span, span))]);
        qPts.push([p.sx(sim.t[i]), p.sy(clamp(sim.q[i], -span, span))]);
      }
      line(g.ctx, refPts, P.muted, 1.5, [5, 4]);
      line(g.ctx, tarPts, P.warn, 1.5);
      line(g.ctx, qPts, P.accent, 2.4);

      // ── right: torque ──
      var g2 = begin(torqueStage);
      var P2 = g2.P;
      var tauMax = Math.max(1, Math.min(sim.maxTau, 4000));
      var p2 = plot(g2, { l: 52, r: 14, t: 18, b: 32 }, [0, seconds], [-tauMax * 1.1, tauMax * 1.1]);
      axes(g2, p2, {
        xTicks: niceTicks(0, seconds, 4),
        yTicks: niceTicks(-tauMax * 1.1, tauMax * 1.1, 4),
        xFmt: function (t) {
          return fmt(t, 1);
        },
        yFmt: function (t) {
          return Math.abs(t) >= 1000 ? fmt(t / 1000, 1) + 'k' : fmt(t, 0);
        },
        xLabel: '时间（秒）'
      });
      text(g2.ctx, 'PD 算出来的扭矩（N·m）', p2.x0, p2.y1 - 6, P2.muted, 'left', '11px sans-serif');
      line(g2.ctx, [[p2.x0, p2.sy(0)], [p2.x1, p2.sy(0)]], P2.border, 1, [4, 4]);
      var tauPts = [];
      for (var j = 0; j < sim.t.length; j++) {
        tauPts.push([p2.sx(sim.t[j]), p2.sy(clamp(sim.tau[j], -tauMax * 1.1, tauMax * 1.1))]);
      }
      line(g2.ctx, tauPts, P2.bad, 2);

      var hold = Math.max(1, Math.round(state.simHz / state.ctrlHz));
      if (sim.diverged) {
        verdict.set(
          '💥 发散了：稳定数 = ' +
            fmt(stiff, 2) +
            '（$\\Delta t$ = 1/' +
            fmt(state.simHz, 0) +
            ' 秒），一个物理步里 PD 推过了头，下一步再推回来只会更猛。' +
            (state.stable
              ? '连 Stable PD 都撑不住，说明增益 / 惯量 / 步长的组合已经离谱了。'
              : '把「用 Stable PD」勾上试试 —— 同样的增益，它把 $k_p$、$k_d$ 挪进了分母 $A = M + \\Delta t\\, k_d + \\Delta t^2 k_p$，响应只会变钝，不会炸。'),
          'frozen'
        );
      } else if (stiff > 0.8) {
        verdict.set(
          '⚠️ 已经在边缘：稳定数 = ' +
            fmt(stiff, 2) +
            '。' +
            (state.stable ? 'Stable PD 正在替你兜底 —— 取消勾选就能看到显式 PD 在同样参数下的下场；' : '显式 PD 撑住了，但再动一点增益或步长就会翻车；') +
            '论文的做法是把仿真推到 1200 Hz 把 $\\Delta t$ 压小，再配 Stable PD。',
          'frozen'
        );
      } else {
        verdict.set(
          '✅ 离目标角 ' +
            fmt(sim.rmsTar, 3) +
            ' rad，离参考动作 ' +
            fmt(sim.rmsRef, 3) +
            ' rad —— 差出来的这部分主要是控制频率的滞后：策略每 ' +
            fmt(1000 / state.ctrlHz, 0) +
            ' ms 才写一次目标角，中间 ' +
            hold +
            ' 个物理步都用同一个目标，扭矩全由 PD 自己算。',
          'learning'
        );
      }

      trackStage.canvas.setAttribute('aria-label', '关节角度跟踪参考轨迹的曲线');
      torqueStage.canvas.setAttribute('aria-label', 'PD 控制器输出的扭矩曲线');
    });

    render();
  }

  // ─── demo 4: reading the training curves ────────────────────────────────
  /* Schematic TensorBoard traces for Humanoid Backflip, anchored to the
     note's 「第 4 步：训练进展」table and Q7 / Table 4 numbers. These are toy
     shapes that teach the *reading*, not dumps from a real run. */
  var CURVE_ITERS = 5000;
  var CURVE_RETURN_XS = [0, 500, 2000, 3500, 5000];
  var CURVE_RETURN_YS = [0.08, 0.2, 0.45, 0.66, 0.791];
  var CURVE_LEN_YS = [8, 14, 28, 44, 52];
  var CURVE_ET_YS = [0.94, 0.82, 0.55, 0.28, 0.14];
  var CURVE_CLIP_STEPS = 53;
  var CURVE_HEALTHY = 0.791;
  var CURVE_ET_ONLY = 0.73;
  var CURVE_RSI_ONLY = 0.379;
  var CURVE_STRIKE_BOTH = 0.99;
  var CURVE_STRIKE_IMIT = 0.19;
  var CURVE_PHASES = ['助跑', '蓄力', '起跳', '团身', '倒立', '展开', '落地'];
  var CURVE_SCENES = [
    { id: 'healthy', label: '健康' },
    { id: 'norsi', label: '关掉 RSI' },
    { id: 'noet', label: '关掉 ET' },
    { id: 'imbalance', label: '权重失衡' },
    { id: 'imitate', label: '只有模仿' },
    { id: 'taskonly', label: '只有任务' }
  ];

  function curveLerp(a, b, t) {
    return a + (b - a) * t;
  }
  function curveSmooth(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }
  function curvePiece(xs, ys, x) {
    if (x <= xs[0]) return ys[0];
    for (var ci = 1; ci < xs.length; ci++) {
      if (x <= xs[ci]) {
        var u = curveSmooth((x - xs[ci - 1]) / (xs[ci] - xs[ci - 1]));
        return curveLerp(ys[ci - 1], ys[ci], u);
      }
    }
    return ys[ys.length - 1];
  }
  function curveWave(iter, period, phase) {
    return Math.sin((iter / period) * Math.PI * 2 + phase);
  }
  function rIOf(rp, rv, re, rc) {
    return TERMS[0].w * rp + TERMS[1].w * rv + TERMS[2].w * re + TERMS[3].w * rc;
  }
  function normShares(raw) {
    var sum = 0;
    for (var i = 0; i < raw.length; i++) sum += raw[i];
    return raw.map(function (v) {
      return v / Math.max(sum, 1e-6);
    });
  }
  function phaseShares(scene, iter) {
    var n = CURVE_PHASES.length;
    var t = curveSmooth(iter / CURVE_ITERS);
    var i;
    var raw = [];
    if (scene === 'norsi') {
      // 没开 RSI：练习次数递减，后期略微往后渗一点
      var decay = 0.48 - 0.12 * t;
      for (i = 0; i < n; i++) raw.push(Math.pow(decay, i));
      return normShares(raw);
    }
    // RSI 开着：接近均匀，前期略有抖动
    for (i = 0; i < n; i++) {
      raw.push(1 + 0.18 * (1 - t) * curveWave(iter, 900, i * 0.9));
    }
    return normShares(raw);
  }

  function curveAt(scene, iter) {
    var t = iter / CURVE_ITERS;
    var ret = curvePiece(CURVE_RETURN_XS, CURVE_RETURN_YS, iter);
    var length = curvePiece(CURVE_RETURN_XS, CURVE_LEN_YS, iter);
    var et = curvePiece(CURVE_RETURN_XS, CURVE_ET_YS, iter);
    var rp = curveLerp(0.3, 0.84, curveSmooth(t));
    var rv = curveLerp(0.52, 0.91, curveSmooth(t));
    var re = curveLerp(0.14, 0.75, curveSmooth((iter - 200) / 4200));
    var rc = curveLerp(0.2, 0.67, curveSmooth((iter - 120) / 4000));
    var task = 0;

    if (scene === 'norsi') {
      ret = curvePiece([0, 500, 2000, 5000], [0.08, 0.18, 0.4, CURVE_ET_ONLY], iter);
      length = curvePiece([0, 500, 2000, 5000], [8, 16, 30, 40], iter);
      et = curvePiece([0, 500, 2000, 5000], [0.94, 0.78, 0.48, 0.32], iter);
      rp = curveLerp(0.28, 0.78, curveSmooth(t));
      rv = curveLerp(0.5, 0.86, curveSmooth(t));
      re = curveLerp(0.12, 0.48, curveSmooth(t));
      rc = curveLerp(0.18, 0.5, curveSmooth(t));
    } else if (scene === 'noet') {
      ret = curvePiece([0, 800, 2500, 5000], [0.08, 0.16, 0.28, CURVE_RSI_ONLY], iter);
      length = curveLerp(12, CURVE_CLIP_STEPS, curveSmooth(iter / 600));
      et = 0.008 + 0.004 * Math.abs(curveWave(iter, 400, 0.2));
      rp = curveLerp(0.26, 0.42, curveSmooth(t));
      rv = curveLerp(0.48, 0.55, curveSmooth(t));
      re = curveLerp(0.12, 0.28, curveSmooth(t));
      rc = curveLerp(0.18, 0.3, curveSmooth(t));
    } else if (scene === 'imbalance') {
      ret = curvePiece([0, 500, 2000, 5000], [0.1, 0.28, 0.52, 0.66], iter);
      length = curvePiece([0, 500, 2000, 5000], [8, 18, 36, 50], iter);
      et = curvePiece([0, 500, 2000, 5000], [0.9, 0.7, 0.4, 0.2], iter);
      rp = curveLerp(0.32, 0.9, curveSmooth(t));
      rv = curveLerp(0.55, 0.88, curveSmooth(t));
      re = curveLerp(0.14, 0.24, curveSmooth(t));
      rc = curveLerp(0.2, 0.26, curveSmooth(t));
    } else if (scene === 'imitate') {
      task = curveLerp(0.04, CURVE_STRIKE_IMIT, curveSmooth(t));
    } else if (scene === 'taskonly') {
      ret = curveLerp(0.08, 0.25, curveSmooth(t));
      length = curvePiece([0, 400, 1600, 5000], [8, 22, 40, 50], iter);
      et = curvePiece([0, 400, 1600, 5000], [0.9, 0.55, 0.28, 0.16], iter);
      rp = curveLerp(0.28, 0.34, curveSmooth(t));
      rv = curveLerp(0.5, 0.48, curveSmooth(t));
      re = curveLerp(0.14, 0.22, curveSmooth(t));
      rc = curveLerp(0.2, 0.24, curveSmooth(t));
      task = curveLerp(0.08, 0.9, curveSmooth(t));
    }

    var rI = rIOf(rp, rv, re, rc);
    var len = clamp(length, 1, CURVE_CLIP_STEPS);
    return {
      ret: clamp(ret, 0, 1),
      length: len,
      lenNorm: len / CURVE_CLIP_STEPS,
      et: clamp(et, 0, 1),
      rp: clamp(rp, 0, 1),
      rv: clamp(rv, 0, 1),
      re: clamp(re, 0, 1),
      rc: clamp(rc, 0, 1),
      rI: clamp(rI, 0, 1),
      task: clamp(task, 0, 1),
      phases: phaseShares(scene, iter)
    };
  }

  function curveSeries(scene) {
    var n = 80,
      xs = [],
      rows = [];
    for (var i = 0; i <= n; i++) {
      var it = (i / n) * CURVE_ITERS;
      xs.push(it);
      rows.push(curveAt(scene, it));
    }
    return { xs: xs, rows: rows };
  }

  function toneOf(kind) {
    if (kind === 'ok') return 'good';
    if (kind === 'warn') return 'warn';
    return 'bad';
  }

  function judgeCurves(m, scene, iter) {
    var j = {};
    if (scene === 'imitate') {
      j.ret = { kind: 'warn', text: '模仿分在涨，先别信任务' };
    } else if (scene === 'imbalance') {
      j.ret = { kind: 'warn', text: '总分被姿态项撑住了' };
    } else if (scene === 'taskonly') {
      j.ret = { kind: 'bad', text: '模仿分几乎没动' };
    } else if (m.ret >= 0.7) {
      j.ret = { kind: 'ok', text: '接近 0.791' };
    } else if (m.ret >= 0.35) {
      j.ret = { kind: 'ok', text: '在爬' };
    } else if (iter > 1500) {
      j.ret = { kind: 'bad', text: '长期停在随机水平' };
    } else {
      j.ret = { kind: 'warn', text: '还早，先看斜率' };
    }

    if (scene === 'imbalance' && m.re < 0.35) {
      j.terms = { kind: 'bad', text: '末端 / 质心掉队' };
    } else if (scene === 'taskonly') {
      j.terms = { kind: 'bad', text: '四条都低：动作是怪的' };
    } else if (m.re >= 0.55 && m.rp >= 0.6) {
      j.terms = { kind: 'ok', text: '四条都在爬' };
    } else if (iter > 2000) {
      j.terms = { kind: 'warn', text: '末端还没跟上' };
    } else {
      j.terms = { kind: 'ok', text: '前期末端慢是正常的' };
    }

    if (scene === 'noet') j.et = { kind: 'bad', text: '开关没开' };
    else if (m.et > 0.85 && iter > 800) j.et = { kind: 'bad', text: '还在秒摔' };
    else if (m.et > 0.7) j.et = { kind: iter > 400 ? 'warn' : 'ok', text: '前期高正常' };
    else j.et = { kind: 'ok', text: '在往下降' };

    if (scene === 'noet') j.length = { kind: 'warn', text: '步数被撑满，在地上挣扎' };
    else if (m.length >= 48) j.length = { kind: scene === 'norsi' ? 'warn' : 'ok', text: '接近 clip 长' };
    else if (m.length >= 20) j.length = { kind: 'ok', text: '越摔越少' };
    else if (iter > 1200) j.length = { kind: 'bad', text: '还在秒摔' };
    else j.length = { kind: 'warn', text: '前期秒摔正常' };

    var last = m.phases[m.phases.length - 1];
    var first = m.phases[0];
    if (scene === 'norsi' || first > 0.35) {
      j.phase = { kind: 'bad', text: '全压在前两段' };
    } else if (last < 0.08) {
      j.phase = { kind: 'warn', text: '落地练得太少' };
    } else {
      j.phase = { kind: 'ok', text: '七段铺得开' };
    }

    if (scene === 'imitate') j.task = { kind: 'bad', text: 'Strike 停在 19%' };
    else if (scene === 'taskonly') j.task = { kind: 'warn', text: '任务成了，动作丑' };
    else j.task = { kind: 'ok', text: '纯模仿技能不看这条' };

    return j;
  }

  function curveVerdict(scene) {
    if (scene === 'healthy') {
      return {
        tone: 'learning',
        text:
          '**健康（RSI + ET）**：归一化回报走 S 形（0.08 → 0.20 → 0.45 → 0.66 → **0.791**），四维分项都在爬，$r^e$ 最慢但不会停在 0.3 以下。ET 率从 ~0.94 降到 ~0.14，七个相位接近均匀。对照的是 Section 10.4 的 Backflip，不是 Table 2 的 0.729。'
      };
    }
    if (scene === 'norsi') {
      return {
        tone: 'frozen',
        text:
          '**关掉 RSI**：回报还能涨到 **0.730**（Section 10.4「仅 ET」），看起来不惨。右边柱状图却递减 —— 落地几乎没人练，回放是「小幅向后跳」。Walk 上这个开关几乎没影响（0.980 vs 0.981）。打开 `sample_time()` 均匀抽相位。'
      };
    }
    if (scene === 'noet') {
      return {
        tone: 'frozen',
        text:
          '**关掉 ET**：回报腰斩到 **0.379**（「仅 RSI」），比关掉 RSI 惨得多。ET 率钉在 0，存活步数被拉满 —— 不是活得好，是摔了也不停，地上挣扎占满 batch。打开 `enable_early_termination`，确认第一步不会被误杀。'
      };
    }
    if (scene === 'imbalance') {
      return {
        tone: 'frozen',
        text:
          '**权重失衡**：加权总分可以到 0.65+（$w_p=0.65$ 把窟窿填平了），但 $r^e$、$r^c$ 停在 ~0.25。回放里关节角度对、脚在滑、质心后坐。分开画四条线，别只盯 $r^I$。这是简化模型，数值不能和论文直接比。'
      };
    }
    if (scene === 'imitate') {
      return {
        tone: 'frozen',
        text:
          '**只有模仿**：四维分项和归一化回报都走健康曲线，但任务成功率卡在 Table 4 的 Strike **19%**（两者都有时是 **99%**）。$\\omega_G=0$ 或任务奖励没接到 `compute_reward()`。纯 Backflip 没有这条病；Strike / Throw 才有。'
      };
    }
    return {
      tone: 'frozen',
      text:
        '**只有任务**：任务成功率可以到 90%，模仿分却停在 ~0.25。策略找到了怪异但功能性的解（抱着球跑）。和 PPO 笔记里「奖励在骗你」是同一类事故，只是这里骗你的不是 alive bonus，是 $r^G$。加回 $r^I$（$\\omega_I=0.7$）。'
    };
  }

  function buildCurvesDemo(host) {
    var root = card(host, {
      title: '训练曲线怎么读：点一种病历，对照日志上那几条线',
      sub:
        '示意曲线锚定「第 4 步：训练进展」的 Backflip 回报表（0.08 → 0.20 → 0.45 → 0.66 → 0.791）和 Q7 / Table 4 的消融数字。' +
        '这是为了讲机制画的示意图，数值不能和某一次真实训练直接比。'
    });

    var state = { scene: 'healthy', iter: 2000 };
    var cache = {};

    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '病历',
      value: 'healthy',
      items: CURVE_SCENES.map(function (s) {
        return { label: s.label, value: s.id };
      }),
      onPick: function (v) {
        state.scene = v;
        render();
      }
    });
    var ctrls2 = controlsRow(root);
    var iterSlider = slider(ctrls2, {
      label: '看第几轮迭代',
      min: 0,
      max: CURVE_ITERS,
      step: 20,
      value: state.iter,
      format: function (v) {
        return String(Math.round(v));
      },
      onInput: function (v) {
        state.iter = v;
        render();
      }
    });

    var setLegend = legend(root, [
      { key: 'accent', text: '当前病历' },
      { key: 'good', text: '健康对照（虚线）' },
      { key: 'warn', text: '任务成功率（Strike）' },
      { key: 'muted', text: '四维分项 / 相位' }
    ]);

    var grid = stageGrid(root);
    var returnStage = stage(grid, 200);
    var termStage = stage(grid, 200);
    var etStage = stage(grid, 200);
    var phaseStage = stage(grid, 200);

    var stats = statsRow(root);
    var sRet = stats.add('归一化回报');
    var sRI = stats.add('加权 $r^I$');
    var sEt = stats.add('ET 率');
    var sLen = stats.add('存活步数');
    var sEe = stats.add('末端 $r^e$');
    var sCom = stats.add('质心 $r^c$');
    var sPhase = stats.add('落地占比');
    var sTask = stats.add('任务成功率');
    var verdict = verdictBox(root);
    var tb = table(root);

    note(root, [
      '**怎么用**：先点「健康」看四张图的标准形态，再换病历 —— 回报停在 0.73 时，右边相位一定全压在前两段；回报腰斩到 0.38 时，ET 率一定先变成 0。**权重失衡**和**只有模仿**是特例：上面的总分都好看，只有四维分项或任务成功率揭穿它。',
      '**和上面那个 RSI 消融演示的分工**：那个演示讲的是「采样预算花在哪个阶段」；这里讲的是你真正训练时日志上会长什么样。两套数字对得上：关掉 RSI → 0.730，关掉 ET → 0.379。',
      '**这是简化模型**：曲线形状按笔记里的 Backflip 阶段表和 Q7 / Table 4 手绘，用来练「几条线一起看」。真实 TensorBoard 噪声更大；MimicKit 默认只记加权奖励之和，四维分项和相位直方图要自己加。'
    ]);

    function ptsOf(series, key) {
      return series.xs.map(function (x, i) {
        return [x, series.rows[i][key]];
      });
    }

    function drawLinePlot(st, title, yDomain, series, specs, cursorY, yFmtDigits) {
      var g = begin(st);
      var P = g.P;
      var p = plot(g, { l: 44, r: 12, t: 18, b: 30 }, [0, CURVE_ITERS], yDomain);
      axes(g, p, {
        xTicks: [0, 1000, 2000, 3500, 5000],
        yTicks: niceTicks(yDomain[0], yDomain[1], 4),
        xFmt: function (v) {
          return String(v);
        },
        yFmt: function (v) {
          return fmt(v, yFmtDigits);
        },
        xLabel: '迭代'
      });
      text(g.ctx, title, p.x0, p.y1 - 6, P.muted, 'left', '11px sans-serif');
      specs.forEach(function (sp) {
        var src = sp.series || series;
        var raw = ptsOf(src, sp.key);
        line(
          g.ctx,
          raw.map(function (q) {
            return [p.sx(q[0]), p.sy(q[1])];
          }),
          P[sp.color] || sp.color,
          sp.width || 2.2,
          sp.dash
        );
      });
      var x = state.iter;
      line(g.ctx, [[p.sx(x), p.y0], [p.sx(x), p.y1]], P.text, 1, [3, 3]);
      if (cursorY != null) {
        dot(g.ctx, p.sx(x), p.sy(cursorY), 4.5, P.accent, P.surface2);
      }
      return P;
    }

    var render = registerRenderer(function () {
      if (!cache[state.scene]) cache[state.scene] = curveSeries(state.scene);
      if (!cache.healthy) cache.healthy = curveSeries('healthy');
      var series = cache[state.scene];
      var healthy = cache.healthy;
      var m = curveAt(state.scene, state.iter);
      var judge = judgeCurves(m, state.scene, state.iter);
      var P0 = null;

      var returnSpecs = [{ key: 'ret', color: 'accent', width: 2.4 }].concat(
        state.scene === 'healthy'
          ? []
          : [{ key: 'ret', color: 'good', width: 1.5, dash: [5, 4], series: healthy }]
      );
      if (state.scene === 'imitate' || state.scene === 'taskonly') {
        returnSpecs.push({ key: 'task', color: 'warn', width: 2, dash: [4, 3] });
      }
      P0 = drawLinePlot(returnStage, '归一化回报（越高越好）', [0, 1.05], series, returnSpecs, m.ret, 2);

      var termColors = [
        { key: 'rp', color: 'accent', width: 2.3 },
        { key: 'rv', color: 'good', width: 1.8 },
        { key: 're', color: 'bad', width: 2.3 },
        { key: 'rc', color: 'warn', width: 2.1 }
      ];
      drawLinePlot(termStage, '四维分项（红 = 末端，最不该被总分盖住）', [0, 1.05], series, termColors, m.re, 2);

      drawLinePlot(
        etStage,
        'ET 率（蓝）与存活 / 53 步（绿）',
        [0, 1.08],
        series,
        [
          { key: 'et', color: 'accent', width: 2.3 },
          { key: 'lenNorm', color: 'good', width: 1.8, dash: [4, 3] }
        ],
        m.et,
        2
      );

      // Phase bars
      var gP = begin(phaseStage);
      var PP = gP.P;
      var nPh = CURVE_PHASES.length;
      var pPh = plot(gP, { l: 36, r: 12, t: 18, b: 36 }, [0, nPh], [0, 0.55]);
      axes(gP, pPh, {
        yTicks: [0, 0.15, 0.3, 0.45],
        yFmt: function (v) {
          return fmt(v, 2);
        }
      });
      text(gP.ctx, '相位覆盖（各阶段被练到的占比）', pPh.x0, pPh.y1 - 6, PP.muted, 'left', '11px sans-serif');
      var slot = (pPh.x1 - pPh.x0) / nPh;
      var healthyPh = curveAt('healthy', state.iter).phases;
      for (var pi = 0; pi < nPh; pi++) {
        var x0 = pPh.x0 + slot * pi + slot * 0.18;
        var bw = slot * 0.64;
        if (state.scene !== 'healthy') {
          gP.ctx.globalAlpha = 0.22;
          gP.ctx.fillStyle = PP.good;
          gP.ctx.fillRect(x0, pPh.sy(healthyPh[pi]), bw, pPh.y0 - pPh.sy(healthyPh[pi]));
          gP.ctx.globalAlpha = 1;
        }
        gP.ctx.fillStyle = PP.accent;
        gP.ctx.fillRect(x0, pPh.sy(m.phases[pi]), bw, pPh.y0 - pPh.sy(m.phases[pi]));
        text(gP.ctx, CURVE_PHASES[pi], pPh.x0 + slot * (pi + 0.5), pPh.y0 + 14, PP.muted, 'center', '10px sans-serif');
      }

      sRet.set(fmt(m.ret, 3), toneOf(judge.ret.kind));
      sRI.set(fmt(m.rI, 3), toneOf(judge.terms.kind));
      sEt.set(Math.round(m.et * 100) + '%', toneOf(judge.et.kind));
      sLen.set(fmt(m.length, 0) + ' / ' + CURVE_CLIP_STEPS, toneOf(judge.length.kind));
      sEe.set(fmt(m.re, 2), m.re < 0.35 && state.iter > 800 ? 'bad' : 'accent');
      sCom.set(fmt(m.rc, 2), m.rc < 0.35 && state.iter > 800 ? 'bad' : 'warn');
      sPhase.set(Math.round(m.phases[nPh - 1] * 100) + '%', toneOf(judge.phase.kind));
      sTask.set(
        state.scene === 'imitate' || state.scene === 'taskonly' ? Math.round(m.task * 100) + '%' : '—',
        state.scene === 'imitate' || state.scene === 'taskonly' ? toneOf(judge.task.kind) : ''
      );

      var v = curveVerdict(state.scene);
      verdict.set(v.text, v.tone);

      tb.clear();
      tb.row([{ text: '指标' }, { text: '当前值' }, { text: '好方向' }, { text: '这一刻' }], true);
      var rows = [
        ['归一化回报', fmt(m.ret, 3), '越高越好* → 0.791', judge.ret],
        ['加权 $r^I$', fmt(m.rI, 3), '四条都爬，别只看它', judge.terms],
        ['ET 率', Math.round(m.et * 100) + '%', '从 ~94% 降到 ~14%', judge.et],
        ['存活步数', fmt(m.length, 0) + ' / ' + CURVE_CLIP_STEPS, '拉到 clip 长 ≈ 53', judge.length],
        ['末端 $r^e$', fmt(m.re, 2), '最严，爬得慢但要爬', { kind: m.re < 0.35 && state.iter > 800 ? 'bad' : 'ok', text: m.re < 0.35 && state.iter > 800 ? '被总分盖住了' : '还在爬' }],
        ['相位覆盖', '落地 ' + Math.round(m.phases[nPh - 1] * 100) + '%', '七段铺匀', judge.phase],
        ['任务成功率', state.scene === 'imitate' || state.scene === 'taskonly' ? Math.round(m.task * 100) + '%' : '—', 'Strike 两者都有时 99%', judge.task]
      ];
      rows.forEach(function (r) {
        tb.row([
          { text: r[0] },
          { text: r[1], cls: 'is-' + toneOf(r[3].kind) },
          { text: r[2] },
          { text: r[3].text, cls: 'is-' + toneOf(r[3].kind) }
        ]);
      });

      if (P0) setLegend(P0);
      returnStage.canvas.setAttribute(
        'aria-label',
        '归一化回报曲线，当前迭代 ' + Math.round(state.iter) + '，回报 ' + fmt(m.ret, 3)
      );
      termStage.canvas.setAttribute('aria-label', '四维分项曲线，末端 r^e = ' + fmt(m.re, 2));
      etStage.canvas.setAttribute('aria-label', 'ET 率 ' + Math.round(m.et * 100) + '%，存活 ' + fmt(m.length, 0) + ' 步');
      phaseStage.canvas.setAttribute('aria-label', '七个相位的练习占比，落地 ' + Math.round(m.phases[nPh - 1] * 100) + '%');
    });

    render();
    iterSlider.refresh();
  }

  // ─── demo 5: the five-scene explainer animation ──────────────────────────
  /* A narrated storyboard of the whole method — 为什么要模仿 → 四维奖励 → RSI →
     ET → 训练闭环. Every number on screen comes from somewhere else in this
     note: the reward row reuses TERMS above (so it can never drift from the
     interactive demo or the t=15 例子), and the ablation figures are the
     paper's Section 10.4 table quoted in Q7.

     The player (scene chips, clock, cue track, autoplay-on-scroll) is the
     shared K.explainer in kit.js; only the storyboard itself lives here. */

  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    paint = K.paint,
    seg = K.seg,
    ease = K.ease,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
    stickFigure = K.stickFigure,
    poseWalk = K.poseWalk,
    polyPath = K.polyPath,
    pointOn = K.pointOn;

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_MUTED = X.muted,
    C_GRID = X.grid,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2;

  var TAU = Math.PI * 2;

  /* 只奖励前进速度时的典型产物：深蹲、前倾、手乱挥——照样能拿高分。 */
  function poseFlail(ph) {
    var s = Math.sin(ph * TAU),
      q = Math.sin(ph * TAU * 2.7);
    return {
      lean: 27 + 6 * q,
      armA: [146 + 22 * q, 118 + 30 * s],
      armB: [-140 - 20 * s, -108 - 30 * q],
      legA: [40 + 14 * s, -4 + 12 * s],
      legB: [-34 + 12 * q, -64 + 12 * q]
    };
  }

  /* ── scene 1: why imitate at all ── */
  function buildSceneWhy() {
    var s = sceneSvg('纯 RL 只奖励前进速度，学出前倾深蹲的怪步态；DeepMimic 再加一项模仿奖励，跟着动捕参考走');
    var GROUND = 322;

    [[40, C_SURFACE2], [415, C_SURFACE2]].forEach(function (p) {
      s.appendChild(paint(svgEl('rect', { x: p[0], y: 56, width: 345, height: 288, rx: 8, 'stroke-width': 1 }), p[1], C_BORDER));
    });
    [[40, 385], [415, 760]].forEach(function (p) {
      s.appendChild(paint(svgEl('line', { x1: p[0] + 16, y1: GROUND, x2: p[1] - 16, y2: GROUND, 'stroke-width': 1.5 }), null, C_BORDER));
    });

    s.appendChild(svgText(212, 80, '纯 RL：奖励只写「前进速度」', 'demo-x-bad', 13.5, 'middle'));
    s.appendChild(svgMath(212, 100, 'r = r^G', { size: 12, anchor: 'middle', cls: 'demo-x-mut', w: 100 }));
    var rightTitle = svgText(587, 80, 'DeepMimic：再加一项「像不像」', 'demo-x-acc', 13.5, 'middle');
    var rightSub = svgMath(587, 100, 'r = w^I r^I + w^G r^G', { size: 12, anchor: 'middle', cls: 'demo-x-mut', w: 200 });
    s.appendChild(rightTitle);
    s.appendChild(rightSub);

    function zoom(node, cx) {
      var g = svgEl('g', {
        transform: 'translate(' + cx + ' ' + GROUND + ') scale(1.4) translate(' + -cx + ' ' + -GROUND + ')'
      });
      g.appendChild(node);
      return g;
    }

    var bad = stickFigure(C_BAD, 2.4);
    s.appendChild(zoom(bad.el, 212));
    var ghost = stickFigure(C_MUTED, 2, true);
    var sim = stickFigure(C_ACCENT, 2.4);
    var rightG = svgEl('g', {});
    rightG.appendChild(zoom(ghost.el, 587));
    rightG.appendChild(zoom(sim.el, 587));
    s.appendChild(rightG);

    var badTag = svgText(212, 344, '螃蟹步 / 拖脚滑行 / 抖着前进都能拿满分', 'demo-x-bad', 11.5, 'middle');
    var goodTag = svgText(587, 344, '姿态被参考动捕钉住，物理仍由仿真保证', 'demo-x-acc', 11.5, 'middle');
    s.appendChild(badTag);
    s.appendChild(goodTag);

    var legend = svgEl('g', {});
    legend.appendChild(paint(svgEl('line', { x1: 440, y1: 128, x2: 468, y2: 128, 'stroke-width': 2.5, 'stroke-dasharray': '5 4' }), null, C_MUTED));
    legend.appendChild(svgMath(474, 132, '\\text{参考动捕 } \\hat{q}', { size: 11, cls: 'demo-x-mut', w: 110 }));
    legend.appendChild(paint(svgEl('line', { x1: 600, y1: 128, x2: 628, y2: 128, 'stroke-width': 3 }), null, C_ACCENT));
    legend.appendChild(svgMath(634, 132, '\\text{仿真角色 } q', { size: 11, cls: 'demo-x-acc', w: 110 }));
    s.appendChild(legend);

    var formula = svgEl('g', {});
    formula.appendChild(svgMath(400, 382, 'r_t = w^I \\cdot r_t^I \\;+\\; w^G \\cdot r_t^G',
      { size: 19, anchor: 'middle', w: 400 }));
    formula.appendChild(svgMath(400, 406, 'r^I \\text{ 管「像不像参考动作」，} r^G \\text{ 管「任务做没做到」}',
      { size: 11.5, anchor: 'middle', cls: 'demo-x-mut', w: 420 }));
    s.appendChild(formula);

    function draw(t) {
      var ph = (t * 1.05) % 1;
      var walkX = 132 + ((t * 18) % 156);
      bad.pose(walkX, GROUND - 34, poseFlail(ph));
      var rx = 507 + ((t * 18) % 156);
      ghost.pose(rx, GROUND - 46, poseWalk(ph));
      sim.pose(rx - 7, GROUND - 44, poseWalk(ph - 0.055));

      var right = seg(t, 4.4, 5.6);
      [rightTitle, rightSub, rightG, legend, goodTag].forEach(function (n) { setOpacity(n, right); });
      setOpacity(badTag, seg(t, 2.2, 3.2));
      setOpacity(formula, seg(t, 8.4, 9.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 2: the four-term reward, on the note's t=15 example ── */
  var R_BAR_X = 352, R_BAR_W = 200, R_ROW_Y = [130, 176, 222, 268];

  function buildSceneReward() {
    var s = sceneSvg('t=15 的四维模仿奖励：每项都是 exp(−k·误差)，加权求和得到 r_I ≈ 0.81');
    s.appendChild(svgText(60, 48, '第 2 步｜t = 15（空中团身）：仿真角色和参考动捕差多少', 'demo-x-ink2', 13.5));

    /* `tex: true` marks the columns whose heading is a formula. */
    [{ x: 60, s: '分量', at: 'start' }, { x: 248, s: '误差', at: 'middle' },
      { x: 312, s: 'k', at: 'middle', tex: true },
      { x: 452, s: 'r = \\exp(-k \\cdot \\text{误差})', at: 'middle', tex: true },
      { x: 600, s: 'w', at: 'middle', tex: true },
      { x: 690, s: 'w \\cdot r', at: 'middle', tex: true }
    ].forEach(function (c) {
      s.appendChild(c.tex
        ? svgMath(c.x, 92, c.s, { size: 11.5, anchor: c.at, cls: 'demo-x-mut', w: 180 })
        : svgText(c.x, 92, c.s, 'demo-x-mut', 11.5, c.at));
    });
    s.appendChild(paint(svgEl('line', { x1: 60, y1: 100, x2: 740, y2: 100, 'stroke-width': 1 }), null, C_BORDER));

    var rows = TERMS.map(function (term, i) {
      var y = R_ROW_Y[i];
      var g = svgEl('g', {});
      var r = Math.exp(-term.k * term.err);
      g.appendChild(svgMath(60, y, term.nameTex, { size: 12.5, w: 150 }));
      var errTx = String(term.err).indexOf('.') < 0 ? term.err.toFixed(1) : String(term.err);
      g.appendChild(svgText(248, y, errTx, 'demo-x-mono demo-x-ink2', 12, 'middle'));
      var kTx = svgText(312, y, String(term.k), 'demo-x-mono demo-x-warn', 13, 'middle');
      kTx.setAttribute('font-weight', '700');
      g.appendChild(kTx);
      g.appendChild(paint(svgEl('rect', { x: R_BAR_X, y: y - 13, width: R_BAR_W, height: 17, rx: 2, opacity: 0.2 }), C_MUTED));
      var bar = paint(svgEl('rect', { x: R_BAR_X, y: y - 13, width: 0, height: 17, rx: 2 }), C_ACCENT);
      g.appendChild(bar);
      var rTx = svgText(R_BAR_X + 8, y, '', 'demo-x-mono', 12);
      g.appendChild(rTx);
      g.appendChild(svgText(600, y, String(term.w), 'demo-x-mono demo-x-ink2', 12, 'middle'));
      var wr = svgText(690, y, (term.w * r).toFixed(3), 'demo-x-mono demo-x-good', 12.5, 'middle');
      g.appendChild(wr);
      s.appendChild(g);
      return { g: g, bar: bar, rTx: rTx, wr: wr, r: r, w: term.w, at: 1.4 + i * 2.7 };
    });

    var total = rows.reduce(function (a, row) { return a + row.w * row.r; }, 0);

    s.appendChild(paint(svgEl('line', { x1: 60, y1: 300, x2: 740, y2: 300, 'stroke-width': 1 }), null, C_BORDER));
    var sumG = svgEl('g', {});
    sumG.appendChild(svgMath(60, 342, 'r_I = \\sum w \\cdot r', { size: 13, w: 130 }));
    sumG.appendChild(paint(svgEl('rect', { x: R_BAR_X, y: 326, width: R_BAR_W, height: 20, rx: 2, opacity: 0.2 }), C_MUTED));
    var stack = [];
    var acc = 0;
    rows.forEach(function (row, i) {
      var wdt = row.w * row.r * R_BAR_W;
      var rect = paint(svgEl('rect', { x: R_BAR_X + acc, y: 326, width: wdt, height: 20, rx: i === 0 ? 2 : 0 }), i % 2 ? C_ACCENT : C_GOOD);
      rect.style.fillOpacity = i % 2 ? 0.75 : 0.9;
      acc += wdt;
      sumG.appendChild(rect);
      stack.push({ rect: rect, full: wdt });
    });
    var totalTx = svgText(690, 344, '', 'demo-x-mono demo-x-acc', 22, 'middle');
    totalTx.setAttribute('font-weight', '700');
    sumG.appendChild(totalTx);
    s.appendChild(sumG);

    var foot = svgMath(60, 392,
      'k \\text{ 管曲线陡不陡，} w \\text{ 管这条曲线在总分里占多少：末端项 } k = 40 \\text{ 最严，可它只占 0.15。}',
      { size: 12, cls: 'demo-x-mut', w: 660 });
    s.appendChild(foot);

    function draw(t) {
      rows.forEach(function (row) {
        var u = ease(seg(t, row.at, row.at + 1.4));
        setOpacity(row.g, seg(t, row.at - 0.3, row.at + 0.2));
        var wdt = row.r * R_BAR_W * u;
        row.bar.setAttribute('width', wdt.toFixed(1));
        row.rTx.textContent = u > 0.02 ? (row.r * u).toFixed(2) : '';
        row.rTx.setAttribute('x', (R_BAR_X + wdt + 8).toFixed(1));
        setOpacity(row.wr, seg(t, row.at + 1.2, row.at + 1.6));
      });
      var su = ease(seg(t, 13.6, 15.6));
      setOpacity(sumG, seg(t, 13.2, 13.9));
      var shown = 0;
      stack.forEach(function (part) {
        var take = Math.max(0, Math.min(part.full, total * su * R_BAR_W - shown));
        part.rect.setAttribute('x', (R_BAR_X + shown).toFixed(1));
        part.rect.setAttribute('width', take.toFixed(1));
        shown += take;
      });
      totalTx.textContent = su > 0.02 ? (total * su).toFixed(3) : '';
      setOpacity(foot, seg(t, 12.0, 12.8));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 3: RSI ──
     8 episodes, each surviving two stages from wherever it starts — the same
     crude model the RSI×ET demo below runs, frozen to a fixed draw so the
     picture is the same on every reload. */
  var CLIP_STAGES = ['帧0 站直', '帧5 蓄力', '帧10 起跳', '帧15 团身', '帧20 倒立', '帧25 展开', '帧30 落地'];
  var RSI_STARTS = [3, 0, 5, 1, 4, 2, 6, 1];
  var STAGE_X = CLIP_STAGES.map(function (_, i) { return 100 + i * 98; });

  function visitBars(s, baseline, color) {
    return CLIP_STAGES.map(function (_, i) {
      var g = svgEl('g', {});
      var rect = paint(svgEl('rect', { x: STAGE_X[i] - 22, y: baseline, width: 44, height: 0, rx: 2 }), color);
      var tx = svgText(STAGE_X[i], baseline - 4, '', 'demo-x-mono demo-x-mut', 11, 'middle');
      g.appendChild(rect);
      g.appendChild(tx);
      s.appendChild(g);
      return { rect: rect, tx: tx, baseline: baseline };
    });
  }

  function paintVisits(bars, counts, scale) {
    counts.forEach(function (c, i) {
      var h = c * scale;
      bars[i].rect.setAttribute('height', h.toFixed(1));
      bars[i].rect.setAttribute('y', (bars[i].baseline - h).toFixed(1));
      bars[i].tx.setAttribute('y', (bars[i].baseline - h - 4).toFixed(1));
      bars[i].tx.textContent = c ? String(c) : '';
    });
  }

  function buildSceneRsi() {
    var s = sceneSvg('不用 RSI 时练习次数全压在前两个阶段，RSI 从随机相位起步后七个阶段都被练到');
    s.appendChild(svgText(60, 40, '一段后空翻参考动作切成 7 个阶段（正文「第 0 步」那条时间轴）', 'demo-x-ink2', 13));

    CLIP_STAGES.forEach(function (name, i) {
      s.appendChild(paint(svgEl('rect', { x: STAGE_X[i] - 28, y: 56, width: 56, height: 24, rx: 4, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
      s.appendChild(svgText(STAGE_X[i], 72, name.split(' ')[0], 'demo-x-mono demo-x-ink2', 11, 'middle'));
      s.appendChild(svgText(STAGE_X[i], 94, name.split(' ')[1], 'demo-x-mut', 10.5, 'middle'));
    });

    s.appendChild(svgText(60, 128, '不用 RSI：episode 永远从帧 0 起', 'demo-x-bad', 12.5));
    var coverA = svgText(740, 128, '', 'demo-x-mono demo-x-bad', 12.5, 'end');
    s.appendChild(coverA);
    var barsA = visitBars(s, 212, C_BAD);
    s.appendChild(paint(svgEl('line', { x1: 60, y1: 212, x2: 740, y2: 212, 'stroke-width': 1 }), null, C_BORDER));

    s.appendChild(svgText(60, 248, 'RSI：每个 episode 从随机相位起步', 'demo-x-acc', 12.5));
    var coverB = svgText(740, 248, '', 'demo-x-mono demo-x-acc', 12.5, 'end');
    s.appendChild(coverB);
    var barsB = visitBars(s, 332, C_ACCENT);
    s.appendChild(paint(svgEl('line', { x1: 60, y1: 332, x2: 740, y2: 332, 'stroke-width': 1 }), null, C_BORDER));

    var verdict = svgText(60, 372, '论文 Section 10.4：Backflip 去掉 RSI（仅 ET）0.791 → 0.730，只学会「小幅向后跳」', 'demo-x-warn', 12.5);
    var verdict2 = svgText(60, 396, '起点决定了哪些阶段有机会被练到——高动态技能的后半段，不给起点就永远到不了。', 'demo-x-mut', 11.5);
    s.appendChild(verdict);
    s.appendChild(verdict2);

    function counts(starts, upTo) {
      var c = CLIP_STAGES.map(function () { return 0; });
      for (var i = 0; i < upTo; i++) {
        for (var d = 0; d < 2; d++) {
          var idx = starts[i] + d;
          if (idx < c.length) c[idx]++;
        }
      }
      return c;
    }

    function draw(t) {
      var nA = Math.max(0, Math.min(8, Math.floor((t - 1.6) / 0.45) + 1));
      var nB = Math.max(0, Math.min(8, Math.floor((t - 7.3) / 0.45) + 1));
      var cA = counts([0, 0, 0, 0, 0, 0, 0, 0], nA), cB = counts(RSI_STARTS, nB);
      paintVisits(barsA, cA, 8);
      paintVisits(barsB, cB, 8);
      function covered(c) {
        return c.filter(function (n) { return n > 0; }).length;
      }
      coverA.textContent = nA ? '练到了 ' + covered(cA) + ' / 7 个阶段' : '';
      coverB.textContent = nB ? '练到了 ' + covered(cB) + ' / 7 个阶段' : '';
      setOpacity(verdict, seg(t, 12.4, 13.0));
      setOpacity(verdict2, seg(t, 13.2, 13.8));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 4: ET ──
     600 步 / 200 步一次的数字是示意值，用来说明「摔一次赔掉 episode 剩下的步数」；
     只有下方 Section 10.4 的 return 是论文原数。 */
  var ET_BUDGET = 600, ET_X0 = 120, ET_W = 620;

  function buildSceneEt() {
    var s = sceneSvg('同样的采样预算，没有 ET 时大半步数花在摔倒后躺在地上，有 ET 时几乎全花在练动作上');
    s.appendChild(svgText(60, 44, '固定 600 步采样预算，摔一次赔多少（示意）', 'demo-x-ink2', 13.5));

    s.appendChild(svgText(60, 96, '无 ET：摔了还在仿真，episode 剩下的步数全是垃圾数据', 'demo-x-bad', 12.5));
    s.appendChild(paint(svgEl('rect', { x: ET_X0, y: 110, width: ET_W, height: 32, rx: 3, opacity: 0.25 }), C_MUTED));
    s.appendChild(svgText(60, 220, '有 ET：非脚部位触地就终止，RSI 换个相位立刻重来', 'demo-x-acc', 12.5));
    s.appendChild(paint(svgEl('rect', { x: ET_X0, y: 234, width: ET_W, height: 32, rx: 3, opacity: 0.25 }), C_MUTED));

    var laneA = svgEl('g', {}), laneB = svgEl('g', {});
    s.appendChild(laneA);
    s.appendChild(laneB);

    var tagA = svgText(ET_X0, 168, '', 'demo-x-bad', 12);
    var tagB = svgText(ET_X0, 292, '', 'demo-x-acc', 12);
    s.appendChild(tagA);
    s.appendChild(tagB);

    var tbl = svgEl('g', {});
    tbl.appendChild(svgText(60, 336, '论文 Section 10.4 的 return（越高越好）：', 'demo-x-mut', 12));
    [['Backflip（高动态）', '0.791', '0.379', C_BAD],
      ['Walk（低动态）', '0.980', '0.974', C_MUTED]
    ].forEach(function (row, i) {
      var y = 364 + i * 26;
      tbl.appendChild(svgText(60, y, row[0], 'demo-x-ink2', 12));
      tbl.appendChild(svgText(260, y, 'RSI + ET', 'demo-x-mut', 11.5));
      tbl.appendChild(svgText(345, y, row[1], 'demo-x-mono demo-x-good', 12.5));
      tbl.appendChild(svgText(420, y, '仅 RSI（无 ET）', 'demo-x-mut', 11.5));
      tbl.appendChild(paint(svgText(540, y, row[2], 'demo-x-mono', 12.5), row[3]));
      if (i === 1) tbl.appendChild(svgText(600, y, '← 很少摔，ET 自然无关紧要', 'demo-x-mut', 11));
    });
    s.appendChild(tbl);

    /* 无 ET：一次尝试 = 30 步真正在练 + 170 步躺在地上；有 ET：30 步就重开。 */
    function fillLane(lane, y, used, useful, span) {
      lane.textContent = '';
      var at = 0;
      while (at < used) {
        var goodLen = Math.min(useful, used - at);
        lane.appendChild(paint(svgEl('rect', {
          x: ET_X0 + (at / ET_BUDGET) * ET_W, y: y,
          width: Math.max(0, (goodLen / ET_BUDGET) * ET_W - 0.6), height: 32, rx: 2
        }), C_ACCENT));
        at += useful;
        if (span > useful && at < used) {
          var junk = Math.min(span - useful, used - at);
          lane.appendChild(paint(svgEl('rect', {
            x: ET_X0 + (at / ET_BUDGET) * ET_W, y: y,
            width: Math.max(0, (junk / ET_BUDGET) * ET_W - 0.6), height: 32, rx: 2, opacity: 0.55
          }), C_BAD));
          at += span - useful;
        }
      }
    }

    function draw(t) {
      var used = ET_BUDGET * ease(seg(t, 1.4, 7.0));
      fillLane(laneA, 110, used, 30, 200);
      fillLane(laneB, 234, used, 30, 30);
      tagA.textContent = '已用 ' + Math.round(used) + ' 步 → ' + Math.floor(used / 200) + ' 次练习，85% 是「躺在地上」';
      tagB.textContent = '已用 ' + Math.round(used) + ' 步 → ' + Math.floor(used / 30) + ' 次练习，几乎全是有用样本';
      setOpacity(tagA, seg(t, 5.2, 5.9));
      setOpacity(tagB, seg(t, 5.2, 5.9));
      setOpacity(tbl, seg(t, 10.0, 10.8));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 5: the training loop ── */
  var LOOP_NODES = [
    { x: 128, y: 60, w: 200, t: '① RSI 初始化', s: '随机相位，摆成参考那一帧' },
    { x: 430, y: 78, w: 236, tTex: '\\text{② } \\pi_\\theta(s) \\to \\text{目标关节角 } \\hat{a}', s: '30 Hz，输出的不是扭矩' },
    { x: 682, y: 182, w: 210, tTex: '\\text{③ Stable PD} \\to \\text{扭矩 } \\tau',
      sTex: '\\tau = k_p(\\hat{a} - q) + k_d(-\\dot{q})' },
    { x: 586, y: 366, w: 210, t: '④ Bullet 物理步进', sTex: '\\text{1200 Hz，得到新状态 } s\'' },
    { x: 274, y: 366, w: 210, tTex: '\\text{⑤ 模仿奖励 } r_I', s: '姿态 / 速度 / 末端 / 质心' },
    { x: 178, y: 182, w: 210, tTex: '\\text{⑥ PPO 更新 } \\pi_\\theta', s: 'clip 机制与标准 PPO 相同' }
  ];

  var LOOP_EDGES = [
    { pts: [[228, 64], [306, 74]] },
    { pts: [[548, 86], [640, 165]] },
    { pts: [[682, 207], [636, 341]] },
    { pts: [[481, 366], [385, 366]] },
    { pts: [[228, 341], [192, 207]] },
    { pts: [[240, 160], [326, 100]] }
  ];

  var ET_EDGE = { pts: [[586, 391], [586, 408], [20, 408], [20, 60], [22, 60]] };

  var LOOP_STEPS = [
    { kind: 'node', i: 0, a: 1.2, b: 2.4 },
    { kind: 'edge', i: 0, a: 2.4, b: 3.0 },
    { kind: 'node', i: 1, a: 3.0, b: 4.2 },
    { kind: 'edge', i: 1, a: 4.2, b: 4.8 },
    { kind: 'node', i: 2, a: 4.8, b: 6.2 },
    { kind: 'edge', i: 2, a: 6.2, b: 6.8 },
    { kind: 'node', i: 3, a: 6.8, b: 8.0 },
    { kind: 'edge', i: 3, a: 8.0, b: 8.6 },
    { kind: 'node', i: 4, a: 8.6, b: 9.8 },
    { kind: 'edge', i: 4, a: 9.8, b: 10.4 },
    { kind: 'node', i: 5, a: 10.4, b: 11.4 },
    { kind: 'edge', i: 5, a: 11.4, b: 12.0 },
    { kind: 'node', i: 1, a: 12.0, b: 12.8 }
  ];

  function buildSceneLoop() {
    var s = sceneSvg('DeepMimic 训练闭环：RSI 初始化、策略输出目标关节角、Stable PD 转扭矩、物理步进、模仿奖励、PPO 更新，摔倒则走 ET 回到初始化');
    var arrow = K.arrowMarker(s, 'dm-x-arrow', C_ACCENT);
    var etArrow = K.arrowMarker(s, 'dm-x-arrow-et', C_BAD);

    var etPath = paint(svgEl('path', {
      d: polyPath(ET_EDGE.pts), fill: 'none', 'stroke-width': 1.8,
      'stroke-dasharray': '6 5', 'marker-end': etArrow
    }), null, C_BAD);
    s.appendChild(etPath);
    var etLab = paint(svgText(300, 402, 'ET：非脚部位触地 → 立刻终止，回 ① 换个随机相位', null, 11.5, 'middle'), C_BAD);
    s.appendChild(etLab);

    var edges = LOOP_EDGES.map(function (e) {
      var p = paint(svgEl('path', { d: polyPath(e.pts), fill: 'none', 'stroke-width': 1.8, 'marker-end': arrow }), null, C_MUTED);
      s.appendChild(p);
      return p;
    });

    var boxes = LOOP_NODES.map(function (n) {
      var g = svgEl('g', {});
      var rect = paint(svgEl('rect', { x: n.x - n.w / 2, y: n.y - 25, width: n.w, height: 50, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_BORDER);
      g.appendChild(rect);
      g.appendChild(n.tTex
        ? svgMath(n.x, n.y - 4, n.tTex, { size: 12.5, anchor: 'middle', w: n.w })
        : svgText(n.x, n.y - 4, n.t, 'demo-x-mono', 12.5, 'middle'));
      g.appendChild(n.sTex
        ? svgMath(n.x, n.y + 14, n.sTex, { size: 10.5, anchor: 'middle', cls: 'demo-x-mut', w: n.w })
        : svgText(n.x, n.y + 14, n.s, 'demo-x-mut', 10.5, 'middle'));
      s.appendChild(g);
      return { g: g, rect: rect };
    });

    var chip = svgEl('g', {});
    chip.appendChild(paint(svgEl('rect', { x: 690, y: 262, width: 100, height: 24, rx: 12, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), C_SURFACE, C_WARN));
    chip.appendChild(paint(svgText(740, 278, '×40 物理步', 'demo-x-mono', 11.5, 'middle'), C_WARN));
    s.appendChild(chip);

    var token = paint(svgEl('circle', { cx: -20, cy: -20, r: 6 }), C_ACCENT);
    s.appendChild(token);

    var tail = svgText(400, 30, 'DeepMimic = PPO 一行没改，换掉的是环境侧的奖励 / 初始化 / 终止条件', 'demo-x-acc', 12.5, 'middle');
    s.appendChild(tail);

    function draw(t) {
      var lit = -1, reached = -1, actEdge = -1, u = 0;
      LOOP_STEPS.forEach(function (st) {
        if (t >= st.a) reached = Math.max(reached, st.kind === 'node' ? st.i : st.i);
        if (t >= st.a && t < st.b) {
          if (st.kind === 'node') lit = st.i;
          else { actEdge = st.i; u = seg(t, st.a, st.b); }
        }
      });

      boxes.forEach(function (b, i) {
        var seen = i <= reached || (i === 1 && t >= 12.0);
        setOpacity(b.g, seen ? 1 : 0.32);
        paint(b.rect, i === lit ? C_SURFACE : C_SURFACE2, i === lit ? C_ACCENT : C_BORDER);
        b.rect.setAttribute('stroke-width', i === lit ? 2.5 : 1.5);
      });
      edges.forEach(function (e, i) {
        paint(e, null, i === actEdge ? C_ACCENT : C_MUTED);
        setOpacity(e, i <= reached ? 1 : 0.3);
      });

      if (actEdge >= 0) {
        var p = pointOn(LOOP_EDGES[actEdge].pts, u);
        token.setAttribute('cx', p[0].toFixed(1));
        token.setAttribute('cy', p[1].toFixed(1));
        setOpacity(token, 1);
      } else if (t >= 13.0 && t < 14.0) {
        var q = pointOn(ET_EDGE.pts, seg(t, 13.0, 14.0));
        token.setAttribute('cx', q[0].toFixed(1));
        token.setAttribute('cy', q[1].toFixed(1));
        paint(token, C_BAD);
        setOpacity(token, 1);
      } else {
        setOpacity(token, 0);
        paint(token, C_ACCENT);
      }

      var etOn = t >= 11.4;
      setOpacity(etPath, etOn ? 1 : 0.25);
      setOpacity(etLab, etOn ? 1 : 0.25);
      setOpacity(chip, Math.max(0.25, seg(t, 5.2, 5.9)));
      setOpacity(tail, seg(t, 13.2, 14.0));
    }

    return { el: s, draw: draw };
  }

  var DM_SCENES = [
    {
      title: '为什么要模仿',
      dur: 13,
      build: buildSceneWhy,
      cues: [
        { at: 0.4, s: '同一个「往前走」的任务，奖励函数只差一项，学出来的东西差很远。' },
        { at: 2.2, s: '左边是纯 RL：奖励只写「前进速度」，**姿态没人管** —— 螃蟹步、拖脚滑行、抖着前进都能拿高分。' },
        { at: 4.8, s: '右边是 DeepMimic：给一段**动捕参考**，再加一项「像不像」的模仿奖励 $r^I$。' },
        { at: 8.6, s: '总奖励 **$r = w^I r^I + w^G r^G$**：$r^I$ 管好不好看，$r^G$ 管任务做没做到。' },
        { at: 11.0, s: '物理仿真保证不穿模、不悬浮，模仿奖励保证姿态自然 —— **两个同时要**，这就是 DeepMimic。' }
      ]
    },
    {
      title: '四维模仿奖励',
      dur: 18,
      build: buildSceneReward,
      cues: [
        { at: 0.4, s: '模仿奖励拆成四项，每项都是 **$\\exp(-k \\cdot \\text{误差})$**：误差 0 得满分 1，误差越大指数级掉分。' },
        { at: 2.0, s: '$r^p$ 关节姿态：13 个关节四元数差分的平方和 0.09，**$k = 2$** → $\\exp(-0.18) \\approx 0.84$。' },
        { at: 5.0, s: '$r^v$ 关节速度：误差 1.0，**$k = 0.1$ 最宽松** —— 速度本来就抖，管太严反而没法学。' },
        { at: 7.8, s: '$r^e$ 末端位置：误差只有 $0.0072\\ \\mathrm{m}^2$（手脚差几厘米），但 **$k = 40$ 最严**，只剩 0.75。' },
        { at: 10.5, s: '$r^c$ 质心：误差 $0.04\\ \\mathrm{m}^2$，**$k = 10$** → 0.67，四项里掉分最多的一项。' },
        { at: 12.2, s: '**$k$ 管曲线陡不陡，$w$ 管这条曲线在总分里占多少** —— 这两组数管的不是一回事。' },
        { at: 14.0, s: '加权求和 $0.65 \\times 0.84 + 0.1 \\times 0.90 + 0.15 \\times 0.75 + 0.1 \\times 0.67$ = **$r_I \\approx 0.813$**。' }
      ]
    },
    {
      title: 'RSI：从哪儿开始练',
      dur: 15,
      build: buildSceneRsi,
      cues: [
        { at: 0.4, s: '后空翻这段参考动作可以切成 7 个阶段：助跑 → 蓄力 → 起跳 → 团身 → 倒立 → 展开 → 落地。' },
        { at: 2.0, s: '不用 RSI：每个 episode 都从**帧 0** 开始，而训练初期只撑得住一两个阶段。' },
        { at: 4.6, s: '于是练习次数**全压在前两个阶段**，后面的空翻和落地一次都练不到。' },
        { at: 7.2, s: 'RSI：从参考动作的**随机相位**起步，直接把角色摆成那一帧的姿态和速度。' },
        { at: 10.4, s: '同样的采样预算，**七个阶段都被练到** —— 学游泳不必每次都从池边跳起。' },
        { at: 12.4, s: '论文 Section 10.4：Backflip 去掉 RSI（仅 ET）**0.791 → 0.730**。' }
      ]
    },
    {
      title: 'ET：摔了赔多少',
      dur: 15,
      build: buildSceneEt,
      cues: [
        { at: 0.4, s: 'ET（Early Termination）：非脚部位触地就是摔了，**立刻结束 episode**，不再采样。' },
        { at: 2.4, s: '不终止会怎样？角色躺在地上扭动，后面几百步**全是垃圾数据**，却照样占预算。' },
        { at: 5.2, s: '同一份 600 步预算：没有 ET 只换来 3 次练习，有 ET 换来 20 次。' },
        { at: 8.0, s: '更糟的是 class imbalance：训练数据里**「躺在地上」的状态占了大多数**，策略被这些状态带跑。' },
        { at: 10.0, s: '论文 Section 10.4：Backflip 去掉 ET（仅 RSI）**0.791 → 0.379**，基本学废。' },
        { at: 12.4, s: '但 Walk 那一行是 **0.980 → 0.974** —— 低动态技能很少摔，ET 自然无关紧要。' }
      ]
    },
    {
      title: '训练闭环',
      dur: 15,
      build: buildSceneLoop,
      cues: [
        { at: 0.4, s: '把前四幕串起来，就是 DeepMimic 的一次训练循环。' },
        { at: 2.0, s: '① **RSI** 随机相位初始化 → ② 策略 $\\pi_\\theta(s)$ 输出**目标关节角 $\\hat{a}$**，不是扭矩。' },
        { at: 4.6, s: '③ **Stable PD** 把 $\\hat{a}$ 换成扭矩 $\\tau = k_p(\\hat{a} - q) + k_d(-\\dot{q})$。' },
        { at: 6.0, s: '策略只有 30 Hz，物理 1200 Hz —— 一个目标角要被 PD **跑 40 个物理步**。' },
        { at: 8.4, s: '④ 仿真出新状态 → ⑤ 算四维模仿奖励 $r_I$ → ⑥ **PPO** 更新策略，回到 ②。' },
        { at: 11.4, s: '中途摔倒就走 **ET** 那条虚线：直接回 ①，换个随机相位重来。' },
        { at: 13.2, s: '换句话说，**DeepMimic 的创新全在环境侧**：奖励、初始化、终止条件，PPO 一行没改。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '五幕动画：DeepMimic 全流程速览',
      sub: '约 76 秒自动播放。空格播放/暂停，← → 换幕；画面里的数字与本文各节算例一致。',
      ariaLabel: 'DeepMimic 五幕讲解动画',
      notes: [
        '取数依据：第二幕的四项误差与权重就是上面「模仿奖励」实验台的默认值（正文 $t = 15$ 的例子，$r_I \\approx 0.813$）；' +
          '第三、四幕引用的 return 是论文 Section 10.4 的消融表（见 Q7）。',
        '第四幕的「600 步 / 200 步一次」只是说明「摔一次赔掉 episode 剩下步数」的示意刻度，不是论文的仿真设置。'
      ],
      scenes: DM_SCENES
    });
  }

  K.mount({
    'deepmimic-reward': buildRewardDemo,
    'deepmimic-rsi': buildRsiDemo,
    'deepmimic-pd': buildPdDemo,
    'deepmimic-curves': buildCurvesDemo,
    'deepmimic-explainer': buildExplainerDemo
  });
})();
