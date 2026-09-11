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
      name: 'r^p 关节姿态',
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
      name: 'r^v 关节速度',
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
      name: 'r^e 末端位置',
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
      name: 'r^c 质心位置',
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
        '拖动误差看四项各掉多少分，再看它们按 0.65 / 0.1 / 0.15 / 0.1 加权后的模仿奖励 r_I。'
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
      label: '任务奖励 r^G（前进速度等）',
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
    var sImit = stats.add('模仿奖励 r_I');
    var sTotal = stats.add('总奖励 0.7·r_I + 0.3·r^G');
    var sWeak = stats.add('掉分最多的分量');
    var verdict = verdictBox(root);

    note(root, [
      '**k 是「这项有多计较」**：同样是 0.05 的误差，末端项（k=40）只剩 exp(−2)=0.14，速度项（k=0.1）还有 0.995。论文给手脚定了最高的精度要求，给速度留了最大的宽容度 —— 因为动捕速度本身就是差分出来的噪声大户。',
      '**w 是「这项占多少分」**：姿态项拿了 0.65 的权重，所以哪怕它只掉 0.1，总分也要跟着掉 0.065；质心项权重只有 0.1，掉半分也只影响 0.05。**k 和 w 是两件事**：k 管曲线陡不陡，w 管这条曲线在总分里的份额。',
      '**为什么一定是 exp(−k·e) 而不是 −k·e**：误差为 0 时满分 1，误差大时平滑趋近 0 —— 四项天然都在 (0, 1] 区间，可以直接加权相加，不用再做归一化；而且大误差处梯度自然变平，不会一个分量的爆炸误差把整个奖励拖成负无穷。',
      '**别忘了还有任务奖励**：正文 ω_I = 0.7、ω_G = 0.3 对所有任务固定。正文 Q5 引的消融很能说明问题 —— Strike 任务只给模仿奖励时成功率 19%，加上任务奖励后 99%：模仿负责「像不像」，任务负责「干没干成」。'
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
        text(g2.ctx, t.name.split(' ')[0], p2.x0 + slot * (i + 0.5), p2.y0 + 13, P2.muted, 'center', '10px monospace');
        barLabel(g2, p2, p2.x0 + slot * (i + 0.5), p2.sy(contrib[i]), fmt(contrib[i], 2));
        acc += contrib[i];
      });
      line(g2.ctx, [[p2.x0, p2.sy(rI)], [p2.x1, p2.sy(rI)]], P2.text, 1.5, [5, 3]);
      text(g2.ctx, 'r_I = ' + fmt(rI, 3), p2.x1 - 4, p2.sy(rI) - 9, P2.text, 'right', '11px monospace');

      verdict.set(
        'r_I = ' +
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
        'τ = k_p(q̂ − q) + k_d(0 − q̇)。'
    });

    var state = { kp: 1600, kd: 25, inertia: 0.12, simHz: 1200, ctrlHz: 30, stable: true };
    var seconds = 1.2;
    function reference(t) {
      return 0.9 * Math.sin(2 * Math.PI * 1.2 * t);
    }

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '比例增益 k_p',
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
      label: '阻尼增益 k_d',
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
      label: '关节等效转动惯量 M（kg·m²）',
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
      { key: 'muted', text: '参考角度 q̂(t)' },
      { key: 'warn', text: '策略写下的目标角（阶梯）' },
      { key: 'accent', text: '实际关节角 q(t)' },
      { key: 'bad', text: '扭矩 τ' }
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
      '**「稳定数」是那个会爆的东西**：显式 PD 的每一步都在用**上一步**的误差推，步子太大就会推过头。把仿真频率拖到 60 Hz 再取消 Stable PD，扭矩直接飞到十万级别（右图）。这正是 Stable PD 要解决的问题：它用 Δt 之后的预测状态算误差，把 k_p、k_d 挪进分母 A = M + Δt·k_d + Δt²·k_p（正文附录 J 的那个 A），刚度再大也只会让响应变钝，不会炸。',
      '**k_d 是刹车**：k_d = 0 时关节会绕着目标角来回荡（欠阻尼）；k_d 拉大到过阻尼，曲线跟不动、总是慢半拍。DeepMimic 给所有任务共用一套手调增益，这也是正文列的局限之一。'
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
            '（Δt = 1/' +
            fmt(state.simHz, 0) +
            ' 秒），一个物理步里 PD 推过了头，下一步再推回来只会更猛。' +
            (state.stable
              ? '连 Stable PD 都撑不住，说明增益 / 惯量 / 步长的组合已经离谱了。'
              : '把「用 Stable PD」勾上试试 —— 同样的增益，它把 k_p、k_d 挪进了分母 A = M + Δt·k_d + Δt²·k_p，响应只会变钝，不会炸。'),
          'frozen'
        );
      } else if (stiff > 0.8) {
        verdict.set(
          '⚠️ 已经在边缘：稳定数 = ' +
            fmt(stiff, 2) +
            '。' +
            (state.stable ? 'Stable PD 正在替你兜底 —— 取消勾选就能看到显式 PD 在同样参数下的下场；' : '显式 PD 撑住了，但再动一点增益或步长就会翻车；') +
            '论文的做法是把仿真推到 1200 Hz 把 Δt 压小，再配 Stable PD。',
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

  K.mount({
    'deepmimic-reward': buildRewardDemo,
    'deepmimic-rsi': buildRsiDemo,
    'deepmimic-pd': buildPdDemo
  });
})();
