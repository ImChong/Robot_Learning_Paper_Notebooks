/* Interactive ADD demos for
 * papers/01_Foundational_RL/ADD_Adversarial_Differential_Discriminators.
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["add"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders
 *
 *     <div class="paper-demo" data-demo="add-diff"></div>
 *
 * because scripts/sanitize_paper_html.py strips <script>/<canvas>/<input>
 * from #paper-body before publish.
 *
 * Demos:
 *   add-explainer  — 五幕讲解动画：手写加权和的困境 → 改判 Δo → 打分变奖励 →
 *                    四阶段的注意力转移 → 训练闭环
 *   add-diff       — Δo = o^demo − o：判别器看的是「误差」，正样本恒为 0
 *   add-reward     — 手写 5 项加权 reward vs 判别器自己学出来的权重
 *   add-curriculum — 判别器会跟着策略一起变严：自动课程 vs 固定核宽度
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
    mulberry32 = K.mulberry32,
    gauss = K.gauss;

  /* 判别器 reward，和 AMP 完全同一份代码（ADDAgent 继承自 AMPAgent）：
     LSGAN 形式 r = max[0, 1 − 0.25(D − 1)²]，D = +1 判成「零误差」。 */
  function discReward(d) {
    return Math.max(0, 1 - 0.25 * (d - 1) * (d - 1));
  }

  /* 一个「已经训好」的差分判别器：正样本是零向量，所以它的打分只依赖
     归一化差分的模长 —— 离 0 越远越像负样本。τ 是它当前的「严格程度」。 */
  function discScore(normErr, tau) {
    return 2 * Math.exp(-(normErr * normErr) / (2 * tau * tau)) - 1;
  }

  // ─── demo 1: Δo = o^demo − o ─────────────────────────────────────────────
  /* 四个维度取自笔记里 spinkick 的例子。scale 是 DiffNormalizer 里那一维的
     典型尺度：不归一化时角速度（rad/s）会把只有几厘米的末端误差整个淹掉。 */
  var DIMS = [
    { key: 'pose', label: '髋关节角 Δθ', unit: 'rad', max: 1.2, scale: 0.15 },
    { key: 'vel', label: '躯干角速度 Δω', unit: 'rad/s', max: 12, scale: 2.0 },
    { key: 'end', label: '踢腿末端 Δp', unit: 'm', max: 0.6, scale: 0.05 },
    { key: 'root', label: '根部位置 Δroot', unit: 'm', max: 1.2, scale: 0.12 }
  ];

  var DIFF_PRESETS = [
    { name: '跟得很准', e: [0.04, 0.5, 0.012, 0.03] },
    { name: '旋转慢了半拍', e: [0.18, 5.2, 0.09, 0.08] },
    { name: '踢腿位置偏了', e: [0.12, 1.4, 0.34, 0.06] },
    { name: '整个动作垮掉', e: [0.75, 9.0, 0.45, 0.7] }
  ];

  function buildDiffDemo(host) {
    var root = card(host, {
      title: 'ADD 的判别器看的是 $\\Delta o$，不是姿态本身',
      sub:
        '拖动四个维度上的跟踪误差，看 $\\Delta o = o^{demo} - o$ 怎么被 DiffNormalizer 拉到同一量纲，' +
        '再被判别器打成一个分数 $D$，最后变成 $r = \\max[0,\\ 1 - 0.25(D - 1)^2]$。正样本永远只有一个：$\\Delta o = 0$。'
    });

    var state = { e: DIFF_PRESETS[1].e.slice(), tau: 1.0, norm: true };

    var ctrls = controlsRow(root);
    var eSliders = [];
    DIMS.forEach(function (dim, i) {
      eSliders.push(
        slider(ctrls, {
          label: dim.label + '（' + dim.unit + '）',
          min: 0,
          max: dim.max,
          step: dim.max / 120,
          value: state.e[i],
          format: function (v) {
            return fmt(v, dim.max > 5 ? 2 : 3);
          },
          onInput: function (v) {
            state.e[i] = v;
            render();
          }
        })
      );
    });
    slider(ctrls, {
      label: '判别器的严格程度 τ（越小越挑剔）',
      min: 0.3,
      max: 3,
      step: 0.05,
      value: state.tau,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.tau = v;
        render();
      }
    });
    var toggleBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(toggleBox);
    checkbox(toggleBox, '启用 DiffNormalizer（源码默认开）', state.norm, function (on) {
      state.norm = on;
      render();
    });
    var presetBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(presetBox);
    DIFF_PRESETS.forEach(function (p) {
      button(presetBox, p.name, function () {
        state.e = p.e.slice();
        eSliders.forEach(function (s, i) {
          s.set(state.e[i], true);
        });
        render();
      });
    });

    var tb = table(root);
    var rawCells = [],
      normCells = [],
      shareCells = [];

    (function buildTable() {
      var head = ['维度'];
      DIMS.forEach(function (d) {
        head.push(d.label);
      });
      tb.row(head, true);
      function valueRow(label, store) {
        var tr = el('tr');
        tr.appendChild(el('th', null, label));
        DIMS.forEach(function () {
          var td = el('td', null, '—');
          store.push(td);
          tr.appendChild(td);
        });
        tb.node.appendChild(tr);
      }
      valueRow('原始 Δo', rawCells);
      valueRow('归一化 Δô', normCells);
      valueRow('占 ‖Δô‖² 的比例', shareCells);
    })();

    var setLegend = legend(root, [
      { key: 'accent', text: '归一化后的各维误差 Δô' },
      { key: 'bad', text: '不归一化时的各维误差（量纲被角速度吃掉）' },
      { key: 'good', text: '判别器打分 D（+1 = 判成「零误差」）' }
    ]);

    var grid = stageGrid(root);
    var barStage = stage(grid, 210);
    var curveStage = stage(grid, 210);

    var stats = statsRow(root);
    var sNorm = stats.add('‖Δô‖');
    var sD = stats.add('判别器 D(Δo)');
    var sR = stats.add('r_disc');
    var sScaled = stats.add('× disc_reward_scale 2');
    var verdict = verdictBox(root);

    note(root, [
      '**正样本只有一个点**：源码里 `self._pos_diff` 就是一个全 0 张量，每次更新都把它当成 real 喂给判别器。' +
        'AMP 需要一整个专家动作分布来当正类，ADD 的正类是「完全没有误差」这一个理想点 —— 这就是标题里 Differential Discriminator 的意思。',
      '**DiffNormalizer 不是可选项**：关掉它再拖角速度，会看到 $\\lVert \\Delta \\hat o \\rVert$ 几乎只由 $\\Delta \\omega$ 决定，末端那几厘米的误差完全没人管。' +
        '位置是米、角度是弧度、速度是 rad/s，不先拉到同一量纲，判别器就只会盯着尺度最大的那一维。',
      '**$\\tau$ 是判别器学出来的，不是你调的**：这里把它做成滑块只是为了让你看见它的作用 —— 它决定「多大的误差才算不像 0」。' +
        '真实训练里它随着策略变好自动变小（第三个演示就在演这件事）。',
      '**这是简化模型**：真实判别器是 fc_2x1024，输入是整条差分向量而不是四个数，打分也不只依赖模长。' +
        '这里的数值不能和论文直接比，它只复现「判误差 → 打分 → 变成奖励」这条链路。'
    ]);

    var render = registerRenderer(function () {
      var normed = DIMS.map(function (d, i) {
        return state.norm ? state.e[i] / d.scale : state.e[i];
      });
      var sq = normed.reduce(function (a, b) {
        return a + b * b;
      }, 0);
      var mag = Math.sqrt(sq);
      // 不归一化时模长会大得离谱，除以一个常数只是为了让 D 还落在可看的范围里
      var effMag = state.norm ? mag : mag / 3;
      var d = discScore(effMag, state.tau);
      var r = discReward(d);

      DIMS.forEach(function (dim, i) {
        rawCells[i].textContent = fmt(state.e[i], 3) + ' ' + dim.unit;
        normCells[i].textContent = fmt(normed[i], 2);
        var share = sq > 0 ? (normed[i] * normed[i]) / sq : 0;
        shareCells[i].textContent = fmt(share * 100, 1) + '%';
        shareCells[i].className = share > 0.6 ? 'is-bad' : share > 0.3 ? 'is-warn' : '';
      });

      sNorm.set(fmt(mag, 2), mag < 1 ? 'good' : mag > 4 ? 'bad' : 'warn');
      sD.set(fmt(d, 3), d > 0.3 ? 'good' : d < -0.5 ? 'bad' : 'warn');
      sR.set(fmt(r, 3), r > 0.6 ? 'good' : r < 0.2 ? 'bad' : 'warn');
      sScaled.set(fmt(r * 2, 3));

      if (!state.norm) {
        var domShare = Math.max.apply(
          null,
          normed.map(function (v) {
            return sq > 0 ? (v * v) / sq : 0;
          })
        );
        verdict.set(
          '⚠️ 归一化关掉了：单独一维就占了 $\\lVert \\Delta \\hat o \\rVert^2$ 的 ' +
            fmt(domShare * 100, 1) +
            '%。判别器现在只在跟这一维较劲，其他维度的误差它根本感觉不到 —— 这就是源码里必须有 DiffNormalizer 的原因。',
          'frozen'
        );
      } else if (r > 0.7) {
        verdict.set(
          '✅ D = ' +
            fmt(d, 2) +
            '，判别器觉得这个误差「已经很像 0 了」，给出 r = ' +
            fmt(r, 2) +
            '。注意它没有被告诉过「髋关节应该占 0.65 的权重」——它只是在判断整条差分向量像不像零向量。',
          'learning'
        );
      } else {
        verdict.set(
          '❌ D = ' +
            fmt(d, 2) +
            '，这条差分离零向量太远，r 只有 ' +
            fmt(r, 2) +
            '。PPO 会把策略往「让 $\\Delta o$ 变小」的方向推 —— 而具体先修哪一维，是判别器的梯度说了算，不是你写的权重说了算。',
          'frozen'
        );
      }

      // ── 左：各维误差柱状图（归一化 vs 不归一化） ──
      var g = begin(barStage);
      var P = g.P;
      setLegend(P);
      var maxBar = Math.max(
        1,
        Math.max.apply(
          null,
          DIMS.map(function (dim, i) {
            return Math.max(normed[i], state.e[i] / dim.scale);
          })
        )
      );
      var p = plot(g, { l: 40, r: 12, t: 22, b: 32 }, [0, DIMS.length], [0, maxBar * 1.15]);
      axes(g, p, {
        yTicks: K.niceTicks(0, maxBar * 1.15, 4),
        yFmt: function (t) {
          return fmt(t, 1);
        }
      });
      text(g.ctx, '每一维贡献了多少「不像 0」', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var slot = (p.x1 - p.x0) / DIMS.length;
      var bw = Math.max(8, slot * 0.42);
      DIMS.forEach(function (dim, i) {
        var cx = p.x0 + slot * (i + 0.5);
        var v = normed[i];
        g.ctx.fillStyle = state.norm ? P.accent : P.bad;
        g.ctx.fillRect(cx - bw / 2, p.sy(v), bw, p.y0 - p.sy(v));
        barLabel(g, p, cx, p.sy(v), fmt(v, 2), state.norm ? P.accent : P.bad);
        text(g.ctx, dim.label.replace(/ Δ.*/, ''), cx, p.y0 + 14, P.muted, 'center', '10px sans-serif');
      });

      // ── 右：D 与 r 随 ‖Δô‖ 的变化 ──
      var g2 = begin(curveStage);
      var P2 = g2.P;
      var xMax = 6;
      var p2 = plot(g2, { l: 42, r: 14, t: 22, b: 34 }, [0, xMax], [-1.15, 1.15]);
      axes(g2, p2, {
        xTicks: [0, 2, 4, 6],
        yTicks: [-1, -0.5, 0, 0.5, 1],
        yFmt: function (t) {
          return fmt(t, 1);
        },
        xLabel: '‖Δô‖'
      });
      text(g2.ctx, '判别器打分 D 与奖励 r', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var dPts = [],
        rPts = [];
      for (var s = 0; s <= 100; s++) {
        var x = (xMax * s) / 100;
        var dv = discScore(x, state.tau);
        dPts.push([p2.sx(x), p2.sy(dv)]);
        rPts.push([p2.sx(x), p2.sy(discReward(dv) * 2 - 1)]); // r∈[0,1] 映射到 [-1,1] 同轴显示
      }
      line(g2.ctx, dPts, P2.good, 2.2);
      line(g2.ctx, rPts, P2.accent, 1.8, [5, 4]);
      line(g2.ctx, [[p2.x0, p2.sy(1)], [p2.x1, p2.sy(1)]], P2.muted, 1, [3, 3]);
      text(g2.ctx, 'Δo = 0 的正样本在这里', p2.x0 + 6, p2.sy(1) + 10, P2.muted, 'left', '10px sans-serif');
      dot(g2.ctx, p2.sx(Math.min(effMag, xMax)), p2.sy(d), 4, P2.good, P2.surface2);
      dot(g2.ctx, p2.sx(Math.min(effMag, xMax)), p2.sy(r * 2 - 1), 4, P2.accent, P2.surface2);

      barStage.canvas.setAttribute('aria-label', '各维跟踪误差归一化后的柱状图');
      curveStage.canvas.setAttribute('aria-label', '判别器打分与奖励随差分模长变化的曲线');
    });

    render();
  }

  // ─── demo 2: 手写权重 vs 判别器学出来的权重 ──────────────────────────────
  /* DeepMimic 那一套：r = Σ wᵢ exp(−kᵢ eᵢ²)，权重与核宽度全是手调常数。
     ADD 没有这些常数，判别器的「隐含权重」= ∂r/∂eᵢ 归一化后的样子。
     四个阶段真正吃紧的维度不同 —— 这正是固定权重调不动的地方。 */
  var HAND = [
    { key: 'pose', label: '姿态', w: 0.65, k: 2 },
    { key: 'vel', label: '速度', w: 0.1, k: 0.1 },
    { key: 'end', label: '末端', w: 0.15, k: 40 },
    { key: 'root', label: '根部', w: 0.1, k: 10 }
  ];

  var PHASES = [
    { id: 'wind', name: '① 站稳蓄力', crit: 'pose', e: [0.15, 0.8, 0.03, 0.05] },
    { id: 'spin', name: '② 旋转启动', crit: 'vel', e: [0.1, 6.0, 0.05, 0.06] },
    { id: 'kick', name: '③ 抬腿踢出', crit: 'end', e: [0.08, 2.0, 0.3, 0.05] },
    { id: 'land', name: '④ 收腿落地', crit: 'root', e: [0.12, 1.5, 0.06, 0.35] }
  ];

  function handReward(e) {
    var r = 0,
      parts = [];
    HAND.forEach(function (t, i) {
      var term = Math.exp(-t.k * e[i] * e[i]);
      parts.push(t.w * term);
      r += t.w * term;
    });
    return { r: r, parts: parts };
  }

  /* 判别器在这个阶段的「隐含权重」：它按批数据里哪一维最能区分成功/失败来分配
     注意力。用该维误差相对其典型尺度的超出量做代理，再 softmax 一下。 */
  function discWeights(e, sharpen) {
    var score = DIMS.map(function (dim, i) {
      return (e[i] / dim.scale) * sharpen;
    });
    return K.softmax(score);
  }

  function buildRewardWeightDemo(host) {
    var root = card(host, {
      title: '谁来决定「先修哪一维」：手写权重 vs 判别器',
      sub:
        'DeepMimic 把 0.65 / 0.1 / 0.15 / 0.1 这四个数写死在 reward 里，全程不变；' +
        'ADD 没有这些数。切换旋风踢的四个阶段，看固定权重在哪个阶段开始失配。'
    });

    var state = { phase: PHASES[2], e: PHASES[2].e.slice(), sharpen: 1.0 };

    var ctrls = controlsRow(root);
    buttonGroup(ctrls, {
      label: '动作阶段',
      value: 'kick',
      items: PHASES.map(function (p) {
        return { label: p.name, value: p.id };
      }),
      onPick: function (v) {
        PHASES.forEach(function (p) {
          if (p.id === v) {
            state.phase = p;
            state.e = p.e.slice();
          }
        });
        eSliders.forEach(function (s, i) {
          s.set(state.e[i], true);
        });
        render();
      }
    });
    var eSliders = [];
    DIMS.forEach(function (dim, i) {
      eSliders.push(
        slider(ctrls, {
          label: dim.label,
          min: 0,
          max: dim.max,
          step: dim.max / 120,
          value: state.e[i],
          format: function (v) {
            return fmt(v, dim.max > 5 ? 2 : 3);
          },
          onInput: function (v) {
            state.e[i] = v;
            render();
          }
        })
      );
    });
    slider(ctrls, {
      label: '判别器的分辨力（越大越集中在最差的一维）',
      min: 0.2,
      max: 3,
      step: 0.05,
      value: state.sharpen,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.sharpen = v;
        render();
      }
    });

    var setLegend = legend(root, [
      { key: 'warn', text: '手写权重（DeepMimic：0.65 / 0.1 / 0.15 / 0.1，固定）' },
      { key: 'accent', text: '判别器的隐含权重（随阶段自己变）' },
      { key: 'bad', text: '这个阶段真正吃紧的维度' }
    ]);

    var grid = stageGrid(root);
    var wStage = stage(grid, 215);
    var sensStage = stage(grid, 215);

    var stats = statsRow(root);
    var sHand = stats.add('手写 reward r_I');
    var sHandW = stats.add('手写权重给关键维');
    var sDiscW = stats.add('判别器给关键维');
    var sGap = stats.add('注意力差距');
    var verdict = verdictBox(root);

    note(root, [
      '**手写 reward 的问题不是「不准」，是「不会变」**：0.65 的姿态权重在蓄力阶段没问题，' +
        '到了踢出阶段最关键的是末端轨迹，可权重还是 0.65 —— 末端偏了 30 厘米，总 reward 也只掉一点点，策略就懒得修它。',
      '**ADD 的权重是判别器的梯度**：判别器要把当前这批差分和零向量分开，自然会盯住最能把两者区分开的那几维；' +
        '阶段变了，最好区分的维度也变了，注意力就跟着挪。论文说的「自动平衡多个目标」就是这件事。',
      '**代价是可解释性**：手写 reward 你一眼能看出策略在优化什么，ADD 得去看判别器的梯度才知道。' +
        '训练不稳的时候，这会让排查变难。',
      '**这是简化模型**：真实的判别器权重没有闭式解，这里用「该维误差相对典型尺度的超出量 + softmax」做代理。' +
        '定性趋势（阶段切换 → 注意力转移）成立，具体数值不能和论文比。'
    ]);

    var render = registerRenderer(function () {
      var hand = handReward(state.e);
      var dw = discWeights(state.e, state.sharpen);
      var ci = 0;
      DIMS.forEach(function (d, i) {
        if (d.key === state.phase.crit) ci = i;
      });
      var handW = HAND[ci].w;
      var discW = dw[ci];

      sHand.set(fmt(hand.r, 3), hand.r > 0.8 ? 'good' : hand.r < 0.5 ? 'bad' : 'warn');
      sHandW.set(fmt(handW * 100, 0) + '%', handW < 0.2 ? 'bad' : 'good');
      sDiscW.set(fmt(discW * 100, 0) + '%', discW > 0.4 ? 'good' : discW < 0.2 ? 'bad' : 'warn');
      sGap.set((discW > handW ? '+' : '') + fmt((discW - handW) * 100, 0) + ' 个百分点', discW > handW ? 'good' : 'warn');

      if (discW > handW + 0.15) {
        verdict.set(
          '🎯 ' +
            state.phase.name +
            '：真正吃紧的是「' +
            DIMS[ci].label +
            '」。手写 reward 只给它 ' +
            fmt(handW * 100, 0) +
            '% 的权重，判别器给了 ' +
            fmt(discW * 100, 0) +
            '% —— 同样一个误差，ADD 的梯度要大得多，策略才会优先去修它。',
          'learning'
        );
      } else {
        verdict.set(
          '🙂 ' +
            state.phase.name +
            '：这个阶段两边的注意力差不多（手写 ' +
            fmt(handW * 100, 0) +
            '% vs 判别器 ' +
            fmt(discW * 100, 0) +
            '%）。手工 reward 在这种阶段是够用的 —— ADD 的价值在那些权重需要随时间挪的敏捷动作上。',
          'frozen'
        );
      }

      // ── 左：两套权重并排 ──
      var g = begin(wStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 40, r: 12, t: 22, b: 32 }, [0, DIMS.length], [0, 1]);
      axes(g, p, {
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) {
          return fmt(t, 2);
        }
      });
      text(g.ctx, '这一维拿到多少注意力', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      var slot = (p.x1 - p.x0) / DIMS.length;
      var bw = Math.max(7, slot * 0.3);
      DIMS.forEach(function (dim, i) {
        var cx = p.x0 + slot * (i + 0.5);
        g.ctx.fillStyle = P.warn;
        g.ctx.fillRect(cx - bw - 2, p.sy(HAND[i].w), bw, p.y0 - p.sy(HAND[i].w));
        g.ctx.fillStyle = i === ci ? P.bad : P.accent;
        g.ctx.fillRect(cx + 2, p.sy(dw[i]), bw, p.y0 - p.sy(dw[i]));
        barLabel(g, p, cx - bw / 2 - 2, p.sy(HAND[i].w), fmt(HAND[i].w, 2), P.warn);
        barLabel(g, p, cx + bw / 2 + 2, p.sy(dw[i]), fmt(dw[i], 2), i === ci ? P.bad : P.accent);
        text(g.ctx, HAND[i].label, cx, p.y0 + 14, i === ci ? P.bad : P.muted, 'center', '11px sans-serif');
      });

      // ── 右：关键维误差扫一遍，看两种 reward 的敏感度 ──
      var g2 = begin(sensStage);
      var P2 = g2.P;
      var xMax = DIMS[ci].max;
      var p2 = plot(g2, { l: 42, r: 14, t: 22, b: 34 }, [0, xMax], [0, 1.05]);
      axes(g2, p2, {
        xTicks: K.niceTicks(0, xMax, 4),
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        xFmt: function (t) {
          return fmt(t, xMax > 5 ? 0 : 2);
        },
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: DIMS[ci].label + ' 的误差'
      });
      text(g2.ctx, '只动这一维时，reward 掉得有多快', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var handPts = [],
        addPts = [];
      for (var s = 0; s <= 100; s++) {
        var x = (xMax * s) / 100;
        var probe = state.e.slice();
        probe[ci] = x;
        var hr = handReward(probe).r;
        var mag = Math.sqrt(
          probe.reduce(function (a, v, i) {
            var n = v / DIMS[i].scale;
            return a + n * n;
          }, 0)
        );
        handPts.push([p2.sx(x), p2.sy(hr)]);
        addPts.push([p2.sx(x), p2.sy(discReward(discScore(mag, 3.0)))]);
      }
      line(g2.ctx, handPts, P2.warn, 2.2);
      line(g2.ctx, addPts, P2.accent, 2.2);
      line(g2.ctx, [[p2.sx(state.e[ci]), p2.y0], [p2.sx(state.e[ci]), p2.y1]], P2.text, 1, [3, 3]);

      wStage.canvas.setAttribute('aria-label', '手写权重与判别器隐含权重的对比柱状图');
      sensStage.canvas.setAttribute('aria-label', '两种奖励对关键维误差的敏感度曲线');
    });

    render();
  }

  // ─── demo 3: 判别器会自己变严（自动课程） ────────────────────────────────
  /* 玩具训练回路：策略误差 e 每轮按「当前 reward 的梯度」下降一点。
     - 固定 reward：exp(−k e²)，k 写死。k 太小 → 早就饱和，学不动；k 太大 → 一开始
       reward 恒为 0，同样学不动。
     - ADD：判别器 τ 跟着当前误差分布走（τ ← 当前平均误差），reward 永远落在
       「有梯度」的那一段，于是标准随着策略一起变严。 */
  function runCurriculum(opts) {
    var rng = mulberry32(opts.seed);
    var eAdd = opts.e0,
      eFix = opts.e0,
      tau = opts.e0;
    var trace = [];
    for (var t = 0; t <= opts.iters; t++) {
      trace.push({ t: t, add: eAdd, fix: eFix, tau: tau });

      // ADD：τ 追着当前误差走，reward 的最陡区间永远压在当前误差附近
      tau = tau + opts.tauLr * (eAdd - tau);
      var gAdd = (eAdd / (tau * tau)) * Math.exp(-(eAdd * eAdd) / (2 * tau * tau));
      eAdd = Math.max(0.004, eAdd - opts.lr * gAdd + 0.004 * gauss(rng) * opts.noise);

      // 固定核：k 写死，梯度 2k·e·exp(−k e²)
      var gFix = 2 * opts.k * eFix * Math.exp(-opts.k * eFix * eFix);
      eFix = Math.max(0.004, eFix - opts.lr * gFix + 0.004 * gauss(rng) * opts.noise);
    }
    return trace;
  }

  function buildCurriculumDemo(host) {
    var root = card(host, {
      title: '判别器会跟着策略一起变严：自动课程',
      sub:
        '手写的 exp(−k·e²) 里那个 k 是常数：k 小了，动作还很烂 reward 就已经接近满分；k 大了，' +
        '一开始 reward 恒等于 0，策略压根收不到信号。判别器不是常数 —— 它每一轮都重新学「多小才算小」。'
    });

    var state = { k: 8, tauLr: 0.08, lr: 0.09, iters: 220, seed: 7, noise: 1 };

    var ctrls = controlsRow(root);
    slider(ctrls, {
      label: '手写核宽度 k（固定 reward 用）',
      min: 0.5,
      max: 60,
      step: 0.5,
      value: state.k,
      format: function (v) {
        return fmt(v, 1);
      },
      onInput: function (v) {
        state.k = v;
        render();
      }
    });
    slider(ctrls, {
      label: '判别器跟进速度（disc lr）',
      min: 0.01,
      max: 0.4,
      step: 0.01,
      value: state.tauLr,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.tauLr = v;
        render();
      }
    });
    slider(ctrls, {
      label: '策略学习率',
      min: 0.02,
      max: 0.3,
      step: 0.01,
      value: state.lr,
      format: function (v) {
        return fmt(v, 2);
      },
      onInput: function (v) {
        state.lr = v;
        render();
      }
    });
    var seedBox = el('div', 'demo-control demo-buttons');
    ctrls.appendChild(seedBox);
    button(seedBox, '换一个随机种子', function () {
      state.seed = (state.seed * 1664525 + 1013904223) % 100000;
      render();
    });
    button(seedBox, 'k = 0.5（太宽松）', function () {
      state.k = 0.5;
      render();
    });
    button(seedBox, 'k = 60（太苛刻）', function () {
      state.k = 60;
      render();
    });

    var setLegend = legend(root, [
      { key: 'accent', text: 'ADD：判别器 τ 自适应' },
      { key: 'warn', text: '固定核 exp(−k·e²)' },
      { key: 'good', text: '判别器当前的标准 τ' }
    ]);

    var grid = stageGrid(root);
    var curveStage = stage(grid, 220);
    var rewardStage = stage(grid, 220);

    var stats = statsRow(root);
    var sAdd = stats.add('ADD 末期误差');
    var sFix = stats.add('固定核末期误差');
    var sTau = stats.add('判别器最终标准 τ');
    var sGrad = stats.add('固定核此刻的梯度');
    var verdict = verdictBox(root);

    note(root, [
      '**对抗训练自带课程**：策略变好 → 负样本离零向量更近 → 判别器必须更挑剔才分得开 → 奖励的「陡峭区」跟着往 0 挪。' +
        '手写 reward 做不到这件事，除非你自己写一个随训练衰减的 k。',
      '**这也是它最脆的地方**：判别器跟得太快（把 disc lr 拉到 0.4），标准一路追着策略跑，' +
        '相当于永远在及格线上下，策略拿到的奖励信号会变得很吵。论文里 `disc_grad_penalty: 2` 比 AMP 的 5 更小，' +
        '正是因为 ADD 的判别器任务更简单，不需要那么强的正则。',
      '**这是简化模型**：真实训练是 4096 个并行环境跑 PPO，这里只有一个标量误差在做梯度下降。' +
        '换种子结论不变（ADD 这条线的末期误差始终低于极端 k 的固定核），但数值不能和论文的 tracking 指标比。'
    ]);

    var render = registerRenderer(function () {
      var trace = runCurriculum({
        seed: state.seed,
        iters: state.iters,
        e0: 1.0,
        k: state.k,
        tauLr: state.tauLr,
        lr: state.lr,
        noise: state.noise
      });
      var last = trace[trace.length - 1];
      sAdd.set(fmt(last.add, 3), last.add < last.fix ? 'good' : 'warn');
      sFix.set(fmt(last.fix, 3), last.fix < last.add ? 'good' : 'bad');
      sTau.set(fmt(last.tau, 3), 'accent');
      var gFix = 2 * state.k * last.fix * Math.exp(-state.k * last.fix * last.fix);
      sGrad.set(gFix < 0.02 ? fmt(gFix, 4) + '（几乎没了）' : fmt(gFix, 3), gFix < 0.02 ? 'bad' : 'good');

      if (last.add < last.fix * 0.7) {
        verdict.set(
          '✅ k = ' +
            fmt(state.k, 1) +
            ' 时，固定核停在 $e \\approx$ ' +
            fmt(last.fix, 3) +
            ' 就不动了（梯度只剩 ' +
            fmt(gFix, 4) +
            '），ADD 继续压到 $e \\approx$ ' +
            fmt(last.add, 3) +
            '。判别器把「合格线」一路往下挪，策略就一直有事可做。',
          'learning'
        );
      } else if (last.fix < last.add * 0.7) {
        verdict.set(
          '🙂 这个 $k$ 恰好选对了：固定核 $e \\approx$ ' +
            fmt(last.fix, 3) +
            '，比 ADD 的 ' +
            fmt(last.add, 3) +
            ' 还好一点。手工 reward 调得准的时候确实能打 —— 问题是换一段动作、换一个机器人，这个 k 就得重调。',
          'frozen'
        );
      } else {
        verdict.set(
          '➖ 两边收敛到差不多的地方（ADD ' +
            fmt(last.add, 3) +
            ' vs 固定核 ' +
            fmt(last.fix, 3) +
            '）。把 k 拖到两个极端（0.5 或 60）再看一遍，固定核的两种失效模式就会露出来。',
          'frozen'
        );
      }

      // ── 左：误差曲线 ──
      var g = begin(curveStage);
      var P = g.P;
      setLegend(P);
      var p = plot(g, { l: 44, r: 14, t: 22, b: 34 }, [0, state.iters], [0, 1.1]);
      axes(g, p, {
        xTicks: K.niceTicks(0, state.iters, 4),
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '训练轮次'
      });
      text(g.ctx, '跟踪误差 e（越低越好）', p.x0, p.y1 - 8, P.muted, 'left', '11px sans-serif');
      line(
        g.ctx,
        trace.map(function (r) {
          return [p.sx(r.t), p.sy(r.add)];
        }),
        P.accent,
        2.2
      );
      line(
        g.ctx,
        trace.map(function (r) {
          return [p.sx(r.t), p.sy(r.fix)];
        }),
        P.warn,
        2.2
      );
      line(
        g.ctx,
        trace.map(function (r) {
          return [p.sx(r.t), p.sy(r.tau)];
        }),
        P.good,
        1.4,
        [4, 4]
      );

      // ── 右：奖励曲线在不同时期的位置 ──
      var g2 = begin(rewardStage);
      var P2 = g2.P;
      var p2 = plot(g2, { l: 44, r: 14, t: 22, b: 34 }, [0, 1.2], [0, 1.05]);
      axes(g2, p2, {
        xTicks: [0, 0.3, 0.6, 0.9, 1.2],
        yTicks: [0, 0.25, 0.5, 0.75, 1],
        xFmt: function (t) {
          return fmt(t, 1);
        },
        yFmt: function (t) {
          return fmt(t, 2);
        },
        xLabel: '跟踪误差 e'
      });
      text(g2.ctx, '奖励曲线：判别器的那条会往左挪', p2.x0, p2.y1 - 8, P2.muted, 'left', '11px sans-serif');
      var snaps = [trace[0], trace[Math.floor(state.iters / 3)], last];
      snaps.forEach(function (snap, idx) {
        var pts = [];
        for (var s = 0; s <= 100; s++) {
          var x = (1.2 * s) / 100;
          pts.push([p2.sx(x), p2.sy(discReward(discScore(x, Math.max(0.03, snap.tau))))]);
        }
        line(g2.ctx, pts, P2.accent, idx === 2 ? 2.4 : 1.2, idx === 2 ? [] : [4, 4]);
      });
      var fixPts = [];
      for (var s2 = 0; s2 <= 100; s2++) {
        var x2 = (1.2 * s2) / 100;
        fixPts.push([p2.sx(x2), p2.sy(Math.exp(-state.k * x2 * x2))]);
      }
      line(g2.ctx, fixPts, P2.warn, 2.2);
      dot(g2.ctx, p2.sx(Math.min(1.2, last.add)), p2.sy(discReward(discScore(last.add, Math.max(0.03, last.tau)))), 4, P2.accent, P2.surface2);
      dot(g2.ctx, p2.sx(Math.min(1.2, last.fix)), p2.sy(Math.exp(-state.k * last.fix * last.fix)), 4, P2.warn, P2.surface2);

      curveStage.canvas.setAttribute('aria-label', 'ADD 与固定核 reward 的跟踪误差下降曲线');
      rewardStage.canvas.setAttribute('aria-label', '奖励曲线随训练自动左移的示意图');
    });

    render();
  }

  // ─── demo 4: the five-scene explainer animation ──────────────────────────
  /* A narrated storyboard of the whole method — 手写加权和的困境 → 改判 Δo →
     归一化 / 打分 / 奖励 → 四阶段的注意力转移 → 训练闭环. Every number on screen
     is computed by the same functions the three interactive demos above use
     (discScore / discReward / handReward / discWeights / DIMS.scale / HAND),
     so the animation can never drift away from them.

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
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2;

  /* 正文「类比」那一段的打分表：姿态 30 / 速度 20 / 末端 25 / 质心 25。 */
  var SCORECARD = [
    { label: '姿态', v: 30 },
    { label: '速度', v: 20 },
    { label: '末端', v: 25 },
    { label: '质心', v: 25 }
  ];

  var PAINS = [
    '① 权重很难调：姿态调大更像，节奏就乱了',
    '② 换个技能就得重调：走路 / 跑步 / 后空翻 / 旋风踢',
    '③ 很耗人：最后不是在研究方法，是在当调参工'
  ];

  /* ── scene 1: 手写加权和，以及它背后的人力 ── */
  function buildSceneHand() {
    var s = sceneSvg('传统 tracking reward 是一个手写的加权和：左边是像打总分一样人工定的科目权重，右边是它带来的三件麻烦事与「改权重—重训—看结果」的循环');

    s.appendChild(svgMath(400, 56,
      'r = w_1 r_{pose} + w_2 r_{vel} + w_3 r_{ee} + w_4 r_{com} + \\cdots',
      { size: 15, anchor: 'middle', cls: 'demo-x-ink2', w: 620 }));
    var sub = svgText(400, 82, 'DeepMimic / PHC 这一路：tracking reward 是一个手写的加权和', 'demo-x-mut', 11.5, 'middle');
    s.appendChild(sub);

    [[40, C_SURFACE2], [410, C_SURFACE2]].forEach(function (p) {
      s.appendChild(paint(svgEl('rect', { x: p[0], y: 96, width: 350, height: 234, rx: 8, 'stroke-width': 1 }), p[1], C_BORDER));
    });

    s.appendChild(svgText(215, 122, '像给学生打总分：每门课占多少分，是人定的', 'demo-x-ink2', 12, 'middle'));
    var SC_X = 130, SC_W = 6; // 30 分 → 180px
    var rows = SCORECARD.map(function (row, i) {
      var y = 160 + i * 36;
      var g = svgEl('g', {});
      g.appendChild(svgText(64, y + 4, row.label, 'demo-x-ink2', 12));
      g.appendChild(paint(svgEl('rect', { x: SC_X, y: y - 9, width: row.v * SC_W, height: 17, rx: 3, opacity: 0.85 }), C_WARN));
      g.appendChild(paint(svgText(SC_X + row.v * SC_W + 8, y + 4, row.v + ' 分', 'demo-x-mono', 11.5), C_WARN));
      s.appendChild(g);
      return { g: g, at: 1.2 + i * 0.42 };
    });
    var scNote = svgText(215, 308, 'DeepMimic 那一套写死的是 0.65 / 0.1 / 0.15 / 0.1', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(scNote);

    s.appendChild(svgText(585, 122, '而这三件麻烦事，全是人力', 'demo-x-ink2', 12, 'middle'));
    var pains = PAINS.map(function (str, i) {
      var y = 152 + i * 36;
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: 428, y: y - 14, width: 314, height: 28, rx: 6, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), C_SURFACE, C_BAD));
      g.appendChild(paint(svgText(442, y + 4, str, null, 11), C_BAD));
      s.appendChild(g);
      return { g: g, at: 4.4 + i * 0.9 };
    });

    var loop = svgEl('g', {});
    loop.appendChild(svgText(585, 262, '每调一次都得重训一轮才知道好不好', 'demo-x-mut', 10.5, 'middle'));
    var LOOP_X = [468, 585, 702];
    LOOP_X.forEach(function (x, i) {
      loop.appendChild(paint(svgEl('rect', { x: x - 50, y: 270, width: 100, height: 28, rx: 6, 'stroke-width': 1.2 }), C_SURFACE, C_BORDER));
      loop.appendChild(svgText(x, 288, ['改权重', '训练几小时', '看结果'][i], 'demo-x-ink2', 11, 'middle'));
    });
    var loopArrow = K.arrowMarker(s, 'add-x-arrow-loop', C_MUTED);
    [[[518, 284], [530, 284]], [[635, 284], [647, 284]]].forEach(function (pts) {
      loop.appendChild(paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': 1.6, 'marker-end': loopArrow }), null, C_MUTED));
    });
    var LOOP_BACK = [[702, 298], [702, 316], [468, 316], [468, 300]];
    loop.appendChild(paint(svgEl('path', {
      d: polyPath(LOOP_BACK), fill: 'none', 'stroke-width': 1.5,
      'stroke-dasharray': '5 4', 'marker-end': loopArrow
    }), null, C_MUTED));
    s.appendChild(loop);
    var token = paint(svgEl('circle', { cx: -20, cy: -20, r: 5 }), C_BAD);
    s.appendChild(token);

    var foot = svgEl('g', {});
    foot.appendChild(paint(svgText(400, 372, '论文的关键洞察：精确 tracking 本质上也是一个多目标优化问题', null, 16.5, 'middle'), C_ACCENT));
    foot.appendChild(svgText(400, 398, '而对抗学习，可以替代手工加权', 'demo-x-mut', 12, 'middle'));
    s.appendChild(foot);

    function draw(t) {
      setOpacity(sub, seg(t, 0.2, 0.9));
      rows.forEach(function (r) { setOpacity(r.g, seg(t, r.at, r.at + 0.45)); });
      setOpacity(scNote, seg(t, 3.4, 4.0));
      pains.forEach(function (p) { setOpacity(p.g, seg(t, p.at, p.at + 0.5)); });

      var on = seg(t, 8.2, 8.8);
      setOpacity(loop, on);
      if (t >= 8.6 && t < 12.2) {
        var u = ((t - 8.6) / 1.8) % 1;
        var p;
        if (u < 0.62) {
          p = pointOn([[468, 284], [702, 284]], u / 0.62);
        } else {
          p = pointOn(LOOP_BACK, (u - 0.62) / 0.38);
        }
        token.setAttribute('cx', p[0].toFixed(1));
        token.setAttribute('cy', p[1].toFixed(1));
        setOpacity(token, 1);
      } else {
        setOpacity(token, 0);
      }
      setOpacity(foot, seg(t, 12.2, 13.0));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 2: Δo = o^demo − o，而正样本只有一个点 ──
     四个数就是上面「Δo 实验台」的预设「旋转慢了半拍」。 */
  var S2_E = DIFF_PRESETS[1].e;
  var S2_UNITS = ['rad', 'rad·s⁻¹', 'm', 'm'];
  var S2_SHORT = ['Δθ  髋关节角', 'Δω  躯干角速度', 'Δp  踢腿末端', 'Δroot 根部位置'];
  var S2_AX0 = 70, S2_AX1 = 730, S2_AXMAX = 6;

  function s2x(v) {
    return S2_AX0 + (Math.min(v, S2_AXMAX) / S2_AXMAX) * (S2_AX1 - S2_AX0);
  }

  function buildSceneDiff() {
    var s = sceneSvg('参考帧与仿真角色做差得到 Δo，四个分量分别是 0.18 rad、5.2 rad 每秒、0.09 米、0.08 米；下方的差分轴上，正样本永远钉在 0，当前这条差分落在 3.45 处');
    s.appendChild(svgText(60, 40, '不问「这个姿态好不好」，只问「离目标差多少」', 'demo-x-ink2', 13.5));

    var ref = stickFigure(C_MUTED, 2.2, true);
    var sim = stickFigure(C_BAD, 2.4, false);
    s.appendChild(ref.el);
    s.appendChild(sim.el);
    s.appendChild(svgMath(120, 268, 'o^{demo}', { size: 13, anchor: 'middle', w: 90 }).setTone(C_MUTED));
    s.appendChild(svgMath(250, 268, 'o', { size: 13, anchor: 'middle', w: 60 }).setTone(C_BAD));
    s.appendChild(svgText(120, 290, '参考动作当前帧', 'demo-x-mut', 10, 'middle'));
    s.appendChild(svgText(250, 290, '仿真角色', 'demo-x-mut', 10, 'middle'));
    s.appendChild(svgText(185, 212, '−', 'demo-x-ink2', 26, 'middle'));

    var arrow = K.arrowMarker(s, 'add-x-arrow-diff', C_ACCENT);
    var toBox = paint(svgEl('path', { d: polyPath([[310, 200], [350, 200]]), fill: 'none', 'stroke-width': 1.8, 'marker-end': arrow }), null, C_ACCENT);
    s.appendChild(toBox);

    var box = svgEl('g', {});
    box.appendChild(paint(svgEl('rect', { x: 360, y: 118, width: 210, height: 176, rx: 8, 'stroke-width': 1.4 }), C_SURFACE2, C_ACCENT));
    box.appendChild(svgMath(465, 148, '\\Delta o = o^{demo} - o', { size: 12.5, anchor: 'middle', w: 200 }).setTone(C_ACCENT));
    s.appendChild(box);
    var vals = S2_E.map(function (v, i) {
      var y = 184 + i * 30;
      var g = svgEl('g', {});
      g.appendChild(svgText(374, y, S2_SHORT[i], 'demo-x-mut', 10.5));
      var tx = paint(svgText(556, y, '', 'demo-x-mono', 11.5, 'end'), C_BAD);
      g.appendChild(tx);
      s.appendChild(g);
      return { g: g, tx: tx, v: v, unit: S2_UNITS[i], at: 3.2 + i * 0.6 };
    });

    var chips = [
      { y: 126, c: C_MUTED, t: 'AMP 的正类', a: '一整段专家动作分布', b: 'num_disc_obs_steps: 10' },
      { y: 216, c: C_GOOD, t: 'ADD 的正类', aTex: '\\Delta o^{+} = 0 \\text{ —— 一个点}', b: 'self._pos_diff 全 0 张量' }
    ].map(function (c, i) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: 590, y: c.y, width: 180, height: 76, rx: 8, 'stroke-width': 1.4, 'stroke-dasharray': i ? '' : '5 4' }), C_SURFACE, c.c));
      g.appendChild(paint(svgText(680, c.y + 22, c.t, null, 11.5, 'middle'), c.c));
      g.appendChild(c.aTex
        ? svgMath(680, c.y + 42, c.aTex, { size: 10.5, anchor: 'middle', cls: 'demo-x-ink2', w: 174 })
        : svgText(680, c.y + 42, c.a, 'demo-x-ink2', 10.5, 'middle'));
      g.appendChild(paint(svgText(680, c.y + 62, c.b, 'demo-x-mono', 9.5, 'middle'), C_MUTED));
      s.appendChild(g);
      return { g: g, at: 7.4 + i * 1.6 };
    });

    var axis = svgEl('g', {});
    axis.appendChild(paint(svgEl('line', { x1: S2_AX0, y1: 348, x2: S2_AX1, y2: 348, 'stroke-width': 1.4 }), null, C_BORDER));
    [0, 2, 4, 6].forEach(function (v) {
      axis.appendChild(paint(svgEl('line', { x1: s2x(v), y1: 348, x2: s2x(v), y2: 354, 'stroke-width': 1.2 }), null, C_BORDER));
      axis.appendChild(svgText(s2x(v), 368, String(v), 'demo-x-mut', 10, 'middle'));
    });
    axis.appendChild(paint(svgEl('circle', { cx: S2_AX0, cy: 348, r: 11, fill: 'none', 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }), null, C_GOOD));
    axis.appendChild(paint(svgEl('circle', { cx: S2_AX0, cy: 348, r: 6 }), C_GOOD));
    axis.appendChild(svgMath(S2_AX0, 324, '\\text{正样本 } \\Delta o^{+} = 0', { size: 11, anchor: 'middle', w: 160 }).setTone(C_GOOD));
    s.appendChild(axis);

    var normed = S2_E.map(function (v, i) { return v / DIMS[i].scale; });
    var mag = Math.sqrt(normed.reduce(function (a, b) { return a + b * b; }, 0));
    var negDot = paint(svgEl('circle', { cx: 465, cy: 294, r: 6 }), C_BAD);
    s.appendChild(negDot);
    var negTx = paint(svgText(s2x(mag), 328, '当前这条差分 ‖Δô‖ = ' + fmt(mag, 2), null, 10.5, 'middle'), C_BAD);
    s.appendChild(negTx);

    var foot = paint(svgText(400, 402, '判别器要回答的只有一句：这条差分，看起来像不像「零」', null, 15, 'middle'), C_ACCENT);
    s.appendChild(foot);

    function draw(t) {
      var ph = 0.18 + t * 0.26;
      ref.pose(120, 200, poseWalk(ph));
      sim.pose(250, 200, poseWalk(ph - 0.12));

      var boxOn = seg(t, 2.4, 3.0);
      setOpacity(box, boxOn);
      setOpacity(toBox, boxOn);
      vals.forEach(function (row) {
        var u = ease(seg(t, row.at, row.at + 0.9));
        setOpacity(row.g, seg(t, row.at - 0.2, row.at + 0.2));
        row.tx.textContent = fmt(row.v * u, row.v >= 1 ? 2 : 3) + ' ' + row.unit;
      });
      chips.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.6)); });

      var axOn = seg(t, 10.6, 11.2);
      setOpacity(axis, axOn);
      var fly = ease(seg(t, 11.4, 12.6));
      negDot.setAttribute('cx', (465 + (s2x(mag) - 465) * fly).toFixed(1));
      negDot.setAttribute('cy', (294 + (348 - 294) * fly).toFixed(1));
      setOpacity(negDot, axOn);
      setOpacity(negTx, seg(t, 12.6, 13.1));
      setOpacity(foot, seg(t, 13.4, 14.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 3: 归一化 → 判别器打分 → 奖励，以及它自己收紧的合格线 ──
     曲线与两个读数都来自上面两个演示用的同一对 discScore / discReward。 */
  var S3_TAU0 = 1.0, S3_TAU1 = 0.45;
  var S3_SYM = ['Δθ', 'Δω', 'Δp', 'Δroot'];
  var S3_GOOD_E = DIFF_PRESETS[0].e, S3_BAD_E = DIFF_PRESETS[1].e;
  var S3_X0 = 500, S3_X1 = 758, S3_Y0 = 300, S3_YH = 160, S3_XMAX = 6;

  function normMag(e) {
    return Math.sqrt(e.reduce(function (a, v, i) {
      var n = v / DIMS[i].scale;
      return a + n * n;
    }, 0));
  }

  function s3x(v) {
    return S3_X0 + (Math.min(v, S3_XMAX) / S3_XMAX) * (S3_X1 - S3_X0);
  }

  function s3y(r) {
    return S3_Y0 - r * S3_YH;
  }

  function buildSceneScore() {
    var s = sceneSvg('左边把四个分量除以各自的典型尺度拉到同一量纲，右边是判别器打分换成奖励的曲线；随着判别器收紧，曲线整条往零点挪');
    s.appendChild(svgText(60, 38, '第一步：把四个量纲拉平；第二步：判别器给一个分数', 'demo-x-ink2', 13));

    s.appendChild(paint(svgEl('rect', { x: 40, y: 56, width: 390, height: 210, rx: 8, 'stroke-width': 1 }), C_SURFACE2, C_BORDER));
    [[58, '\\text{原始 } \\Delta o', 'start'], [225, '\\div \\text{ 典型尺度}', 'middle'],
      [305, '\\text{归一化 } \\Delta \\hat o', 'middle'], [412, '\\text{占 } \\lVert \\Delta \\hat o \\rVert^2', 'end']]
      .forEach(function (c) {
        s.appendChild(svgMath(c[0], 84, c[1], { size: 10.5, anchor: c[2], cls: 'demo-x-mut', w: 150 }));
      });
    s.appendChild(paint(svgEl('line', { x1: 58, y1: 92, x2: 412, y2: 92, 'stroke-width': 1 }), null, C_BORDER));

    var normed = S3_BAD_E.map(function (v, i) { return v / DIMS[i].scale; });
    var sq = normed.reduce(function (a, b) { return a + b * b; }, 0);
    var nRows = S3_BAD_E.map(function (v, i) {
      var y = 120 + i * 34;
      var g = svgEl('g', {});
      g.appendChild(svgText(58, y, S3_SYM[i] + '  ' + fmt(v, v >= 1 ? 2 : 3) + ' ' + S2_UNITS[i], 'demo-x-mono demo-x-ink2', 10.5));
      g.appendChild(svgText(225, y, '÷ ' + DIMS[i].scale, 'demo-x-mut', 10.5, 'middle'));
      g.appendChild(paint(svgText(305, y, fmt(normed[i], 2), 'demo-x-mono', 12, 'middle'), C_ACCENT));
      g.appendChild(svgText(412, y, fmt((100 * normed[i] * normed[i]) / sq, 1) + '%', 'demo-x-mono demo-x-ink2', 10.5, 'end'));
      s.appendChild(g);
      return { g: g, at: 1.0 + i * 0.5 };
    });
    var nNote = svgText(235, 254, 'DiffNormalizer：位置 米 / 角度 弧度 / 速度 rad·s⁻¹', 'demo-x-mut', 10.5, 'middle');
    s.appendChild(nNote);

    /* 关掉归一化时，同一条 Δo 的份额：角速度一维吃掉 99.8%。 */
    var offG = svgEl('g', {});
    var rawSq = S3_BAD_E.reduce(function (a, v) { return a + v * v; }, 0);
    offG.appendChild(paint(svgText(58, 288, '关掉 DiffNormalizer', null, 11), C_BAD));
    offG.appendChild(paint(svgText(412, 288, 'Δω 一维占 ' + fmt((100 * S3_BAD_E[1] * S3_BAD_E[1]) / rawSq, 1) + '%', 'demo-x-mono', 10.5, 'end'), C_BAD));
    var segX = 58;
    S3_BAD_E.forEach(function (v, i) {
      var w = ((v * v) / rawSq) * 354;
      offG.appendChild(paint(svgEl('rect', { x: segX, y: 296, width: Math.max(w, 0.6), height: 18, rx: 2, opacity: i === 1 ? 0.9 : 0.55 }), i === 1 ? C_BAD : C_MUTED));
      segX += w;
    });
    offG.appendChild(svgText(235, 332, '开着的时候：12.1% / 56.9% / 27.3% / 3.7% —— 四维都说得上话', 'demo-x-mut', 10.5, 'middle'));
    s.appendChild(offG);

    var formula = svgMath(612, 84, 'r = \\max\\!\\left[0,\\ 1 - 0.25\\,(D_\\psi - 1)^2\\right]',
      { size: 12, anchor: 'middle', cls: 'demo-x-ink2', w: 330 });
    s.appendChild(formula);

    var plotG = svgEl('g', {});
    plotG.appendChild(paint(svgEl('line', { x1: S3_X0, y1: S3_Y0, x2: S3_X1, y2: S3_Y0, 'stroke-width': 1.2 }), null, C_BORDER));
    plotG.appendChild(paint(svgEl('line', { x1: S3_X0, y1: S3_Y0, x2: S3_X0, y2: s3y(1.05), 'stroke-width': 1.2 }), null, C_BORDER));
    [0, 2, 4, 6].forEach(function (v) {
      plotG.appendChild(svgText(s3x(v), 316, String(v), 'demo-x-mut', 10, 'middle'));
    });
    [0, 0.5, 1].forEach(function (r) {
      plotG.appendChild(svgText(S3_X0 - 6, s3y(r) + 4, fmt(r, 1), 'demo-x-mut', 10, 'end'));
    });
    plotG.appendChild(svgText(629, 336, '‖Δô‖（归一化后的差分模长）', 'demo-x-mut', 10, 'middle'));
    plotG.appendChild(svgText(S3_X0 + 6, s3y(1.05) - 6, '奖励 r', 'demo-x-mut', 10));
    var curve = paint(svgEl('path', { fill: 'none', 'stroke-width': 2.4 }), null, C_ACCENT);
    var ghost = paint(svgEl('path', { fill: 'none', 'stroke-width': 1.3, 'stroke-dasharray': '4 4' }), null, C_MUTED);
    plotG.appendChild(ghost);
    plotG.appendChild(curve);
    var tauTx = paint(svgText(S3_X1, s3y(1.05) - 6, '', 'demo-x-mono', 11.5, 'end'), C_GOOD);
    plotG.appendChild(tauTx);
    var dots = [
      { e: S3_GOOD_E, c: C_GOOD, name: '跟得很准' },
      { e: S3_BAD_E, c: C_BAD, name: '旋转慢了半拍' }
    ].map(function (d) {
      var node = paint(svgEl('circle', { r: 5, 'stroke-width': 1.6 }), d.c, C_SURFACE);
      plotG.appendChild(node);
      var mag = normMag(d.e);
      /* 贴着纵轴的那个点，标签靠左会被坐标轴压住，所以改成从点往右写。 */
      var anchor = mag < S3_XMAX / 3 ? 'start' : 'middle';
      var tx = paint(svgText(0, 0, '', 'demo-x-mono', 10.5, anchor), d.c);
      plotG.appendChild(tx);
      return { node: node, tx: tx, mag: mag, dx: anchor === 'start' ? 8 : 0, name: d.name };
    });
    s.appendChild(plotG);

    function curvePath(tau) {
      var pts = [];
      for (var i = 0; i <= 140; i++) {
        var x = (S3_XMAX * i) / 140;
        pts.push([s3x(x).toFixed(1), s3y(discReward(discScore(x, tau))).toFixed(1)]);
      }
      return polyPath(pts);
    }
    ghost.setAttribute('d', curvePath(S3_TAU0));

    var foot = svgEl('g', {});
    var footTx = paint(svgText(400, 374, '', null, 15, 'middle'), C_ACCENT);
    foot.appendChild(footTx);
    foot.appendChild(svgText(400, 398, '策略越准 → 负样本越靠近 0 → 判别器必须更挑剔：对抗训练自带一条课程', 'demo-x-mut', 11.5, 'middle'));
    s.appendChild(foot);

    var goodMag = normMag(S3_GOOD_E);

    function draw(t) {
      nRows.forEach(function (r) { setOpacity(r.g, seg(t, r.at, r.at + 0.4)); });
      setOpacity(nNote, seg(t, 3.2, 3.8));
      setOpacity(offG, seg(t, 4.2, 5.0));
      setOpacity(formula, seg(t, 6.4, 7.0));
      setOpacity(plotG, seg(t, 7.0, 7.6));

      /* 10.8 秒之后判别器开始收紧：τ 从 1.00 滑到 0.45。 */
      var tau = S3_TAU0 + (S3_TAU1 - S3_TAU0) * ease(seg(t, 10.8, 14.4));
      curve.setAttribute('d', curvePath(tau));
      setOpacity(ghost, seg(t, 11.0, 11.6) * 0.8);
      tauTx.textContent = 'τ = ' + fmt(tau, 2);

      dots.forEach(function (d, i) {
        var on = seg(t, 8.0 + i * 1.4, 8.6 + i * 1.4);
        var r = discReward(discScore(d.mag, tau));
        d.node.setAttribute('cx', s3x(d.mag).toFixed(1));
        d.node.setAttribute('cy', s3y(r).toFixed(1));
        setOpacity(d.node, on);
        d.tx.setAttribute('x', (s3x(d.mag) + d.dx).toFixed(1));
        d.tx.setAttribute('y', (s3y(r) - 12).toFixed(1));
        d.tx.textContent = d.name + ' r = ' + fmt(r, 2);
        setOpacity(d.tx, on);
      });

      var rNow = discReward(discScore(goodMag, tau));
      footTx.textContent = '同一个 ‖Δô‖ = ' + fmt(goodMag, 2) + '：τ 收到 ' + fmt(tau, 2) + '，奖励从 0.99 掉到 ' + fmt(rNow, 2);
      setOpacity(foot, seg(t, 11.6, 12.2));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 4: 四个阶段，注意力在四维之间搬家 ──
     手写那四根柱子是 HAND 里的常数，判别器那四根是 discWeights() 现算的。 */
  var S4_BASE = 330, S4_H = 180, S4_CX = [150, 330, 510, 690];

  function buildSceneWeights() {
    var s = sceneSvg('旋风踢四个阶段的注意力对比：手写权重四根柱子全程不动，判别器的四根柱子每一幕都换一个高峰');
    s.appendChild(svgText(60, 38, '旋风踢的四个阶段：真正吃紧的那一维一直在换', 'demo-x-ink2', 13.5));

    var chips = PHASES.map(function (p, i) {
      var g = svgEl('g', {});
      var rect = paint(svgEl('rect', { x: S4_CX[i] - 80, y: 58, width: 160, height: 26, rx: 13, 'stroke-width': 1.2 }), C_SURFACE, C_BORDER);
      g.appendChild(rect);
      var tx = svgText(S4_CX[i], 76, p.name, 'demo-x-ink2', 11.5, 'middle');
      g.appendChild(tx);
      s.appendChild(g);
      return { g: g, rect: rect, tx: tx };
    });

    var lg = svgEl('g', {});
    lg.appendChild(paint(svgEl('rect', { x: 440, y: 104, width: 14, height: 10, rx: 2 }), C_WARN));
    lg.appendChild(svgText(460, 113, '手写权重（0.65 / 0.1 / 0.15 / 0.1，固定）', 'demo-x-mut', 10.5));
    lg.appendChild(paint(svgEl('rect', { x: 690, y: 104, width: 14, height: 10, rx: 2 }), C_ACCENT));
    lg.appendChild(svgText(710, 113, '判别器', 'demo-x-mut', 10.5));
    s.appendChild(lg);

    s.appendChild(paint(svgEl('line', { x1: 60, y1: S4_BASE, x2: 760, y2: S4_BASE, 'stroke-width': 1.2 }), null, C_BORDER));

    var bars = DIMS.map(function (dim, i) {
      var cx = S4_CX[i];
      var handW = HAND[i].w;
      var hand = paint(svgEl('rect', { x: cx - 48, y: S4_BASE - handW * S4_H, width: 44, height: handW * S4_H, rx: 2, opacity: 0.9 }), C_WARN);
      var disc = paint(svgEl('rect', { x: cx + 4, y: S4_BASE, width: 44, height: 0, rx: 2 }), C_ACCENT);
      s.appendChild(hand);
      s.appendChild(disc);
      var handTx = paint(svgText(cx - 26, S4_BASE - handW * S4_H - 6, fmt(handW * 100, 0) + '%', 'demo-x-mono', 10.5, 'middle'), C_WARN);
      var discTx = paint(svgText(cx + 26, S4_BASE, '', 'demo-x-mono', 11, 'middle'), C_ACCENT);
      s.appendChild(handTx);
      s.appendChild(discTx);
      s.appendChild(svgText(cx, 350, HAND[i].label, 'demo-x-ink2', 12, 'middle'));
      return { hand: hand, disc: disc, discTx: discTx, handW: handW };
    });

    var line1 = paint(svgText(60, 378, '', null, 13, 'start'), C_ACCENT);
    var line2 = svgText(60, 400, '', 'demo-x-mut', 11.5);
    s.appendChild(line1);
    s.appendChild(line2);

    var INTRO = 1.2, STEP = 3.2;

    function draw(t) {
      var raw = (t - INTRO) / STEP;
      var idx = clamp(Math.floor(raw), 0, PHASES.length - 1);
      /* 换幕时用大约 1.1 秒把柱子挪过去，剩下的时间停住让人看清。 */
      var u = idx === 0 ? ease(seg(t, INTRO, INTRO + 1.1)) : ease(clamp((raw - idx) / 0.35, 0, 1));
      var from = idx === 0 ? [0, 0, 0, 0] : discWeights(PHASES[idx - 1].e, 1.0);
      var to = discWeights(PHASES[idx].e, 1.0);
      var mix = to.map(function (v, i) { return from[i] + (v - from[i]) * u; });

      chips.forEach(function (c, i) {
        paint(c.rect, i === idx ? C_SURFACE2 : C_SURFACE, i === idx ? C_ACCENT : C_BORDER);
        c.rect.setAttribute('stroke-width', i === idx ? 2.2 : 1.2);
        setOpacity(c.g, i === idx ? 1 : 0.42);
      });
      bars.forEach(function (b, i) {
        var h = mix[i] * S4_H;
        b.disc.setAttribute('y', (S4_BASE - h).toFixed(1));
        b.disc.setAttribute('height', h.toFixed(1));
        b.discTx.setAttribute('y', (S4_BASE - h - 6).toFixed(1));
        b.discTx.textContent = fmt(mix[i] * 100, 1) + '%';
        paint(b.disc, mix[i] > 0.4 ? C_BAD : C_ACCENT);
        paint(b.discTx, mix[i] > 0.4 ? C_BAD : C_ACCENT);
      });

      var phase = PHASES[idx];
      var ci = 0;
      DIMS.forEach(function (d, i) { if (d.key === phase.crit) ci = i; });
      var hand = handReward(phase.e);
      line1.textContent = phase.name + '：真正吃紧的是「' + HAND[ci].label + '」 —— 手写只给 ' +
        fmt(HAND[ci].w * 100, 0) + '%，判别器给 ' + fmt(discWeights(phase.e, 1.0)[ci] * 100, 1) + '%';
      line2.textContent = '而手写 reward 的总分还有 ' + fmt(hand.r, 3) + '：这一维错得再多，总分也只掉一点点，策略就懒得修它';
      setOpacity(line1, seg(t, INTRO + 0.3, INTRO + 0.9));
      setOpacity(line2, seg(t, INTRO + 0.8, INTRO + 1.4));
    }

    return { el: s, draw: draw };
  }

  /* ── scene 5: 一次训练循环 ── */
  var ADD_NODES = [
    { x: 160, y: 140, w: 190, t: '① rollout 4096 env', s: 'obs 带前瞻参考帧 [1, 2, 3]' },
    { x: 400, y: 140, w: 190, tTex: '\\text{② } \\Delta o = o^{demo} - o', s: 'tar_disc_obs − disc_obs' },
    { x: 640, y: 140, w: 190, t: '③ DiffNormalizer', s: '米 / 弧度 / rad·s⁻¹ 分量纲' },
    { x: 640, y: 280, w: 190, t: '④ 判别器更新', s: '正 = 全 0，负 = 当前 + replay' },
    { x: 400, y: 280, w: 190, tTex: '\\text{⑤ 奖励 } r = r_{disc}', s: 'task 0.0 / disc 1.0，scale 2' },
    { x: 160, y: 280, w: 190, t: '⑥ PPO 更新 π', s: 'clip 0.2 / λ 0.95 / γ 0.99' }
  ];

  var ADD_EDGES = [
    { pts: [[255, 140], [305, 140]] },
    { pts: [[495, 140], [545, 140]] },
    { pts: [[640, 165], [640, 255]] },
    { pts: [[545, 280], [495, 280]] },
    { pts: [[305, 280], [255, 280]] },
    { pts: [[160, 255], [160, 165]] }
  ];

  var ADD_STEPS = [
    { kind: 'node', i: 0, a: 0.8, b: 1.9 },
    { kind: 'edge', i: 0, a: 1.9, b: 2.4 },
    { kind: 'node', i: 1, a: 2.4, b: 3.6 },
    { kind: 'edge', i: 1, a: 3.6, b: 4.1 },
    { kind: 'node', i: 2, a: 4.1, b: 5.2 },
    { kind: 'edge', i: 2, a: 5.2, b: 5.7 },
    { kind: 'node', i: 3, a: 5.7, b: 8.2 },
    { kind: 'edge', i: 3, a: 8.2, b: 8.7 },
    { kind: 'node', i: 4, a: 8.7, b: 10.2 },
    { kind: 'edge', i: 4, a: 10.2, b: 10.7 },
    { kind: 'node', i: 5, a: 10.7, b: 11.8 },
    { kind: 'edge', i: 5, a: 11.8, b: 12.4 }
  ];

  var ADD_ET = [[65, 140], [30, 140], [30, 362], [236, 362]];

  function buildSceneLoop() {
    var s = sceneSvg('ADD 的一次训练循环：4096 环境采样、算差、归一化、判别器更新、奖励合成、PPO 更新，以及偏离参考超过一米就终止的那条虚线');
    var arrow = K.arrowMarker(s, 'add-x-arrow-flow', C_ACCENT);
    var etArrow = K.arrowMarker(s, 'add-x-arrow-et', C_BAD);
    s.appendChild(svgText(60, 34, 'ADD 的一次训练循环（ADDAgent 继承 AMPAgent，只换判别器吃什么）', 'demo-x-ink2', 13));

    var etPath = paint(svgEl('path', {
      d: polyPath(ADD_ET), fill: 'none', 'stroke-width': 1.8,
      'stroke-dasharray': '6 5', 'marker-end': etArrow
    }), null, C_BAD);
    s.appendChild(etPath);
    var etLab = paint(svgText(246, 366, 'pose_termination：偏离参考 > 1.0 m 直接终止 —— DeepMimic 式的跟踪 anchor，AMP 没有', null, 11), C_BAD);
    s.appendChild(etLab);

    var edges = ADD_EDGES.map(function (e) {
      var p = paint(svgEl('path', { d: polyPath(e.pts), fill: 'none', 'stroke-width': 1.8, 'marker-end': arrow }), null, C_MUTED);
      s.appendChild(p);
      return p;
    });

    var boxes = ADD_NODES.map(function (n) {
      var g = svgEl('g', {});
      var rect = paint(svgEl('rect', { x: n.x - n.w / 2, y: n.y - 25, width: n.w, height: 50, rx: 8, 'stroke-width': 1.5 }), C_SURFACE2, C_BORDER);
      g.appendChild(rect);
      g.appendChild(n.tTex
        ? svgMath(n.x, n.y - 4, n.tTex, { size: 11.5, anchor: 'middle', w: n.w })
        : svgText(n.x, n.y - 4, n.t, 'demo-x-mono', 12, 'middle'));
      g.appendChild(svgText(n.x, n.y + 14, n.s, 'demo-x-mut', 10, 'middle'));
      s.appendChild(g);
      return { g: g, rect: rect };
    });

    var chips = [
      { y: 196, c: C_MUTED, tx: '\\text{AMP：真样本 = mocap 片段，10 步窗口，}w_{GP} = 5' },
      { y: 226, c: C_GOOD, tx: '\\text{ADD：真样本 = 全 0 张量，1 步差，}w_{GP} = 2' }
    ].map(function (c, i) {
      var g = svgEl('g', {});
      g.appendChild(paint(svgEl('rect', { x: 250, y: c.y - 12, width: 300, height: 24, rx: 12, 'stroke-width': 1, 'stroke-dasharray': '4 3' }), C_SURFACE, c.c));
      g.appendChild(svgMath(400, c.y + 4, c.tx, { size: 10.5, anchor: 'middle', w: 296 }).setTone(c.c));
      s.appendChild(g);
      return { g: g, at: 12.6 + i * 0.5 };
    });

    var token = paint(svgEl('circle', { cx: -20, cy: -20, r: 6 }), C_ACCENT);
    s.appendChild(token);

    var tail = svgEl('g', {});
    tail.appendChild(paint(svgText(400, 398, 'ADD = DeepMimic 的骨架 + AMP 的判别器，只是判别器吃的是「差」', null, 15, 'middle'), C_ACCENT));
    s.appendChild(tail);

    function draw(t) {
      var lit = -1, reached = -1, actEdge = -1, u = 0;
      ADD_STEPS.forEach(function (st) {
        if (t >= st.a) reached = Math.max(reached, st.i);
        if (t >= st.a && t < st.b) {
          if (st.kind === 'node') lit = st.i;
          else { actEdge = st.i; u = seg(t, st.a, st.b); }
        }
      });

      boxes.forEach(function (b, i) {
        var seen = i <= reached || (i === 0 && t >= 11.8);
        setOpacity(b.g, seen ? 1 : 0.32);
        paint(b.rect, i === lit ? C_SURFACE : C_SURFACE2, i === lit ? C_ACCENT : C_BORDER);
        b.rect.setAttribute('stroke-width', i === lit ? 2.5 : 1.5);
      });
      edges.forEach(function (e, i) {
        paint(e, null, i === actEdge ? C_ACCENT : C_MUTED);
        setOpacity(e, i <= reached ? 1 : 0.3);
      });
      chips.forEach(function (c) { setOpacity(c.g, seg(t, c.at, c.at + 0.6)); });

      if (actEdge >= 0) {
        var p = pointOn(ADD_EDGES[actEdge].pts, u);
        token.setAttribute('cx', p[0].toFixed(1));
        token.setAttribute('cy', p[1].toFixed(1));
        setOpacity(token, 1);
      } else if (t >= 12.4 && t < 13.4) {
        var q = pointOn(ADD_ET, seg(t, 12.4, 13.4));
        token.setAttribute('cx', q[0].toFixed(1));
        token.setAttribute('cy', q[1].toFixed(1));
        paint(token, C_BAD);
        setOpacity(token, 1);
      } else {
        setOpacity(token, 0);
        paint(token, C_ACCENT);
      }

      var etOn = t >= 12.2;
      setOpacity(etPath, etOn ? 1 : 0.22);
      setOpacity(etLab, etOn ? 1 : 0.22);
      setOpacity(tail, seg(t, 14.2, 15.0));
    }

    return { el: s, draw: draw };
  }

  var ADD_SCENES = [
    {
      title: '手写加权和的困境',
      dur: 14,
      build: buildSceneHand,
      cues: [
        { at: 0.3, s: '精确模仿一段动作，传统做法是写一个大 reward：**$r = w_1 r_{pose} + w_2 r_{vel} + w_3 r_{ee} + w_4 r_{com} + \\cdots$**。' },
        { at: 1.2, s: '这就像给学生打总分：**姿态 30 分、速度 20 分、末端 25 分、质心 25 分** —— 每门课占多少，是人定的。' },
        { at: 4.4, s: '第一件麻烦：**权重很难调**。姿态权重开大，动作更像，但节奏可能乱；末端开大，手脚到位了，整体反而僵硬。' },
        { at: 5.3, s: '第二件：**换个技能就得重调**。走路、跑步、后空翻、旋风踢，最佳权重根本不是同一组。' },
        { at: 6.2, s: '第三件：**很耗人**。改权重要重训一轮才知道好不好 —— 最后你不是在研究方法，是在当调参工。' },
        { at: 12.2, s: '论文的关键洞察：**精确 tracking 本质上也是一个多目标优化问题，而对抗学习可以替代手工加权。**' }
      ]
    },
    {
      title: '改判 $\\Delta o$：正样本只有一个',
      dur: 15,
      build: buildSceneDiff,
      cues: [
        { at: 0.3, s: 'ADD 不把当前观测和参考观测分别喂给判别器，而是**先做差**：$\\Delta o = o^{demo} - o$。' },
        { at: 3.2, s: '这一帧的差分：髋关节角差 **0.18 rad**、躯干角速度差 **5.2 rad/s**、踢腿末端差 **0.09 m**、根部差 **0.08 m**。' },
        { at: 7.4, s: 'AMP 的正类是**一整段专家动作分布**（`num_disc_obs_steps: 10`，一个 10 步窗口）。' },
        { at: 9.0, s: 'ADD 的正类只有**一个点**：完全匹配时 $\\Delta o = 0$ —— 源码里 `self._pos_diff` 就是一个全 0 张量。' },
        { at: 11.4, s: '负样本则是实际跑出来的差分：归一化之后这条落在 **$\\lVert \\Delta \\hat o \\rVert = 3.45$**，离零点很远。' },
        { at: 13.4, s: '所以判别器要回答的只有一句：**这条差分，看起来像不像「零」**。' }
      ]
    },
    {
      title: '归一化 → 打分 → 奖励',
      dur: 18,
      build: buildSceneScore,
      cues: [
        { at: 0.3, s: '差分向量里，位置是米、角度是弧度、速度是 rad/s —— **量纲不同，不能直接求模长**。' },
        { at: 1.0, s: 'DiffNormalizer 把每一维除以它的典型尺度：0.18 ÷ 0.15 = **1.20**，5.2 ÷ 2.0 = **2.60**，0.09 ÷ 0.05 = **1.80**。' },
        { at: 4.2, s: '不归一化会怎样？同一条 $\\Delta o$，**角速度一维就吃掉 99.8%** 的模长，末端那几厘米判别器根本感觉不到。' },
        { at: 6.4, s: '归一化之后判别器给一个打分 $D_\\psi \\in [-1, 1]$，再换成奖励：**$r = \\max[0,\\ 1 - 0.25(D_\\psi - 1)^2]$**（和 AMP 同一式）。' },
        { at: 8.0, s: '「跟得很准」这条 $\\lVert \\Delta \\hat o \\rVert = 0.50$，拿到 **$r = 0.99$**；「旋转慢了半拍」那条 $\\lVert \\Delta \\hat o \\rVert = 3.45$，**$r \\approx 0.01$**。' },
        { at: 10.8, s: '关键的是：**判别器的标准会跟着策略一起变严**。策略越准，负样本越靠近 0，它必须更挑剔才分得开。' },
        { at: 12.6, s: '于是整条奖励曲线往零点挪：**同一个 $\\lVert \\Delta \\hat o \\rVert = 0.50$，从 0.99 掉到 0.78** —— 对抗训练自带一条课程。' },
        { at: 15.6, s: '手写的 $\\exp(-k e^2)$ 做不到这件事：$k$ 是常数，要么早早饱和，要么一开始奖励恒为 0。' }
      ]
    },
    {
      title: '自动平衡多个目标',
      dur: 15,
      build: buildSceneWeights,
      cues: [
        { at: 0.3, s: '为什么差分判别器能「自动平衡多个目标」？把旋风踢拆成四个阶段就看得很清楚。' },
        { at: 1.5, s: '**① 站稳蓄力**：姿态最要紧。手写给姿态 65%，判别器给 36% —— 这一幕手工 reward 是够用的。' },
        { at: 4.4, s: '**② 旋转启动**：角速度成了主角。手写还是只给速度 **10%**，判别器把 **76.1%** 的注意力挪了过去。' },
        { at: 7.6, s: '**③ 抬腿踢出**：末端偏了 30 cm。手写权重 **15%**，判别器 **98.5%** —— 差距最大的一幕。' },
        { at: 9.0, s: '注意手写 reward 的总分：这一幕仍有 **0.810**。末端错得再离谱，总分也只掉一点点，策略自然懒得修它。' },
        { at: 10.8, s: '**④ 收腿落地**：轮到根部位置，判别器又把 **70.7%** 挪过去。' },
        { at: 12.6, s: '手写的四根柱子**全程一动不动**，判别器的四根**每一幕都在换高峰** —— 这就是论文说的自动权衡。' }
      ]
    },
    {
      title: '训练闭环',
      dur: 16,
      build: buildSceneLoop,
      cues: [
        { at: 0.3, s: '把前四幕串起来，就是 ADD 的一次训练循环。`ADDAgent` 继承自 `AMPAgent`，骨架一模一样。' },
        { at: 0.8, s: '① 策略在 **4096 个并行环境**里跑一轮；观测里带着 `tar_obs_steps: [1, 2, 3]` 的前瞻参考帧。' },
        { at: 2.4, s: '② 算差：`diff_obs = tar_disc_obs − disc_obs`。③ DiffNormalizer 把四类量纲拉平。' },
        { at: 5.7, s: '④ 更新判别器：**正样本是那个全 0 张量**，负样本是当前差分 + 回放池（`disc_replay_samples: 1000`，池子 20 万）。' },
        { at: 7.0, s: '`disc_grad_penalty: 2` 比 AMP 的 5 更小，`disc_logit_reg: 0.01` —— ADD 的判别任务更简单，不需要那么强的正则。' },
        { at: 8.7, s: '⑤ 奖励合成：**`task_reward_weight: 0.0`、`disc_reward_weight: 1.0`** —— 默认几乎完全靠判别器驱动。' },
        { at: 10.7, s: '⑥ PPO 更新策略：clip 0.2、$\\lambda$ = 0.95、$\\gamma$ = 0.99，然后回到 ①。' },
        { at: 12.2, s: '中途偏离参考超过 **1.0 m** 就走 `pose_termination` 那条虚线 —— 这是 DeepMimic 留下的跟踪 anchor，AMP 没有。' },
        { at: 14.2, s: '一句话：**ADD = DeepMimic 的骨架 + AMP 的判别器，只是判别器吃的是「差」而不是「对」。**' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '五幕动画：ADD 全流程速览',
      sub: '约 78 秒自动播放。空格播放/暂停，← → 换幕；画面里的数字与下面三个演示用的是同一份函数。',
      ariaLabel: 'ADD 五幕讲解动画',
      notes: [
        '取数依据：第二幕那四个差分就是下面「Δo 实验台」的预设「旋转慢了半拍」，归一化后的 1.20 / 2.60 / 1.80 / 0.67 与 $\\lVert \\Delta \\hat o \\rVert = 3.45$ 由同一组 `DIMS[i].scale` 现算；' +
          '第三幕的曲线、两个读数点与 τ 收紧的效果用的是同一对 `discScore` / `discReward`；第四幕手写那四根柱子是 DeepMimic 的 0.65 / 0.1 / 0.15 / 0.1，' +
          '判别器那四根是「谁来决定先修哪一维」演示里的 `discWeights()` 在默认分辨力 1.0 下算出来的。',
        '第五幕的 4096 env、`tar_obs_steps: [1, 2, 3]`、`disc_grad_penalty: 2`、`disc_logit_reg: 0.01`、回放池 20 万 / 1000、' +
          '`task_reward_weight: 0.0`、`disc_reward_weight: 1.0`、clip 0.2 / $\\lambda$ 0.95 / $\\gamma$ 0.99、`pose_termination` 1.0 m 来自正文的 MimicKit 默认 yaml 那两张表。',
        '**这几幕里的玩具模型和下面三个演示同源**：判别器被简化成「只看归一化差分的模长」，隐含权重用 softmax 代理，四个阶段的误差是示意值。' +
          '定性结论（正样本只有一个点、量纲必须先拉平、合格线自己变严、注意力随阶段搬家）成立，**具体数值不能和论文直接比**；第二幕的两个小人也只是示意姿态。'
      ],
      scenes: ADD_SCENES
    });
  }

  K.mount({
    'add-explainer': buildExplainerDemo,
    'add-diff': buildDiffDemo,
    'add-reward': buildRewardWeightDemo,
    'add-curriculum': buildCurriculumDemo
  });
})();
