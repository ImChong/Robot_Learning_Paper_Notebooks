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
      title: 'ADD 的判别器看的是 Δo，不是姿态本身',
      sub:
        '拖动四个维度上的跟踪误差，看 Δo = o^demo − o 怎么被 DiffNormalizer 拉到同一量纲，' +
        '再被判别器打成一个分数 D，最后变成 r = max[0, 1 − 0.25(D − 1)²]。正样本永远只有一个：Δo = 0。'
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
      '**DiffNormalizer 不是可选项**：关掉它再拖角速度，会看到 ‖Δô‖ 几乎只由 Δω 决定，末端那几厘米的误差完全没人管。' +
        '位置是米、角度是弧度、速度是 rad/s，不先拉到同一量纲，判别器就只会盯着尺度最大的那一维。',
      '**τ 是判别器学出来的，不是你调的**：这里把它做成滑块只是为了让你看见它的作用 —— 它决定「多大的误差才算不像 0」。' +
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
          '⚠️ 归一化关掉了：单独一维就占了 ‖Δô‖² 的 ' +
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
            '。PPO 会把策略往「让 Δo 变小」的方向推 —— 而具体先修哪一维，是判别器的梯度说了算，不是你写的权重说了算。',
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
            ' 时，固定核停在 e ≈ ' +
            fmt(last.fix, 3) +
            ' 就不动了（梯度只剩 ' +
            fmt(gFix, 4) +
            '），ADD 继续压到 e ≈ ' +
            fmt(last.add, 3) +
            '。判别器把「合格线」一路往下挪，策略就一直有事可做。',
          'learning'
        );
      } else if (last.fix < last.add * 0.7) {
        verdict.set(
          '🙂 这个 k 恰好选对了：固定核 e ≈ ' +
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

  K.mount({
    'add-diff': buildDiffDemo,
    'add-reward': buildRewardWeightDemo,
    'add-curriculum': buildCurriculumDemo
  });
})();
