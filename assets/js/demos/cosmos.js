/* Cosmos-Predict1 five-scene explainer, based on arXiv:2501.03575v3.
 * Shapes and timings are teaching diagrams, not generated video or a robot rollout.
 * Diffusion and autoregressive families stay side by side: the paper trains them
 * as two parallel routes, not two stages of one pipeline. */
(function () {
  'use strict';
  var K = window.PaperDemoKit;
  var X = K.xColors;
  var P = K.paint, E = K.svgEl, T = K.svgText, M = K.svgMath;

  function marker(svg, id) {
    return K.arrowMarker(svg, id, X.muted);
  }

  function panel(svg, x, y, w, h, title, lines, color, dash) {
    var g = E('g', {});
    var rect = E('rect', { x: x, y: y, width: w, height: h, rx: 12, 'stroke-width': 2 });
    if (dash) rect.setAttribute('stroke-dasharray', '6 4');
    g.appendChild(P(rect, X.surface2, color));
    var titleY = lines.length ? y + 28 : y + h / 2 + 6;
    g.appendChild(P(T(x + 16, titleY, title, null, 15), color));
    lines.forEach(function (line, i) {
      g.appendChild(T(x + 16, y + 52 + i * 20, line, 'demo-x-mut', 12));
    });
    svg.appendChild(g);
    return g;
  }

  function hArrow(svg, x1, x2, y, head) {
    var a = P(E('path', {
      d: 'M ' + x1 + ' ' + y + ' L ' + x2 + ' ' + y,
      'stroke-width': 2.5, fill: 'none', 'marker-end': head
    }), null, X.muted);
    svg.appendChild(a);
    return a;
  }

  function vArrow(svg, x, y1, y2, head) {
    var a = P(E('path', {
      d: 'M ' + x + ' ' + y1 + ' L ' + x + ' ' + y2,
      'stroke-width': 2.5, fill: 'none', 'marker-end': head
    }), null, X.muted);
    svg.appendChild(a);
    return a;
  }

  function buildSceneNeed() {
    var svg = K.sceneSvg('传感器观察进入世界模型，策略在管线之外另行决定动作');
    var head = marker(svg, 'cosmos-need');
    svg.appendChild(T(400, 36, '先学会场景会怎么变，而不是直接学关节指令', 'demo-x-ink2', 14, 'middle'));
    var groups = [
      panel(svg, 36, 78, 220, 118, '传感器观察', ['视频里的真实场景', '直接在真机上试错很贵'], X.accent),
      panel(svg, 290, 78, 220, 118, '世界模型', ['预测可能的未来视频', 'Cosmos 做的是这一段'], X.warn),
      panel(svg, 544, 78, 220, 118, '机器人策略', ['另行决定并执行动作', '不在这条生成管线里'], X.muted, true)
    ];
    var arrows = [
      hArrow(svg, 262, 284, 136, head),
      hArrow(svg, 516, 538, 136, head)
    ];
    var note = T(400, 268, '虚线框在管线外：生成视频 ≠ 关节指令', 'demo-x-mut', 13, 'middle');
    svg.appendChild(note);
    return { el: svg, draw: function (t) {
      groups.forEach(function (g, i) { K.setOpacity(g, K.seg(t, 0.3 + i * 2.2, 1.2 + i * 2.2)); });
      arrows.forEach(function (a, i) { K.setOpacity(a, K.seg(t, 1.8 + i * 2.2, 2.5 + i * 2.2)); });
      K.setOpacity(note, K.seg(t, 7.2, 8.2));
    }};
  }

  function buildSceneData() {
    var svg = K.sceneSvg('约两千万小时原始视频整理成约一亿段训练片段');
    var head = marker(svg, 'cosmos-data');
    svg.appendChild(T(400, 36, '先挑出运动丰富、画质够用的片段', 'demo-x-ink2', 14, 'middle'));
    var raw = panel(svg, 28, 88, 200, 150, '原始视频', ['约 2000 万小时', '分辨率 720p 到 4K', '大量片段没有可用动态'], X.accent);
    var steps = ['切分', '过滤', '标注', '去重'].map(function (label, i) {
      return panel(svg, 292, 72 + i * 58, 196, 50, label, [], X.warn);
    });
    var out = panel(svg, 552, 88, 220, 150, '训练片段', ['约 1 亿段', '每段 2–60 秒', '不是机器人采集时长'], X.good);
    var arrows = [hArrow(svg, 234, 286, 160, head), hArrow(svg, 494, 546, 160, head)];
    var note = T(400, 360, '数字来自论文的数据整理规模，不是模型指标', 'demo-x-mut', 13, 'middle');
    svg.appendChild(note);
    return { el: svg, draw: function (t) {
      K.setOpacity(raw, K.seg(t, 0.3, 1.1));
      steps.forEach(function (g, i) { K.setOpacity(g, K.seg(t, 1.6 + i * 0.7, 2.3 + i * 0.7)); });
      K.setOpacity(arrows[0], K.seg(t, 1.3, 1.9));
      K.setOpacity(arrows[1], K.seg(t, 4.6, 5.2));
      K.setOpacity(out, K.seg(t, 5.2, 6.2));
      K.setOpacity(note, K.seg(t, 7.4, 8.4));
    }};
  }

  function buildSceneToken() {
    var svg = K.sceneSvg('因果视频分词器输出连续潜变量和离散 token');
    var head = marker(svg, 'cosmos-token');
    svg.appendChild(T(400, 34, '当前帧的 token 不看未来帧', 'demo-x-ink2', 14, 'middle'));
    var frames = ['过去帧', '当前帧', '未来帧'].map(function (label, i) {
      var color = i === 2 ? X.muted : X.accent;
      var g = panel(svg, 150 + i * 170, 58, 150, 62, label, [], color, i === 2);
      return g;
    });
    var tok = panel(svg, 250, 158, 300, 72, '因果视频 tokenizer', ['单帧时同一套就是图像 tokenizer'], X.warn);
    var down = vArrow(svg, 400, 124, 152, head);
    var outs = [
      panel(svg, 36, 268, 340, 92, '连续潜变量', ['维度 16 · 普通自编码器', '供给扩散式世界模型'], X.accent),
      panel(svg, 424, 268, 340, 92, '离散 token', ['FSQ · 6 个量化层级', '供给自回归世界模型'], X.good)
    ];
    var split = [206, 594].map(function (x) {
      var a = P(E('path', {
        d: 'M 400 234 C 400 252, ' + x + ' 250, ' + x + ' 262',
        'stroke-width': 2.5, fill: 'none', 'marker-end': head
      }), null, X.muted);
      svg.appendChild(a);
      return a;
    });
    return { el: svg, draw: function (t) {
      frames.forEach(function (g, i) { K.setOpacity(g, K.seg(t, 0.2 + i * 0.6, 0.9 + i * 0.6)); });
      K.setOpacity(down, K.seg(t, 2.2, 2.8));
      K.setOpacity(tok, K.seg(t, 2.6, 3.4));
      split.forEach(function (a, i) { K.setOpacity(a, K.seg(t, 4.2 + i * 0.4, 4.9 + i * 0.4)); });
      outs.forEach(function (g, i) { K.setOpacity(g, K.seg(t, 4.8 + i * 0.5, 5.7 + i * 0.5)); });
    }};
  }

  function buildScenePretrain() {
    var svg = K.sceneSvg('扩散式与自回归式是两条并列的预训练路线');
    svg.appendChild(T(400, 32, '两条路线都预测未来视频，中间没有箭头', 'demo-x-ink2', 14, 'middle'));
    var cols = [
      panel(svg, 28, 64, 348, 250, '扩散式', [
        '连续潜变量，迭代去噪',
        '7B 与 14B',
        '先 Text2World',
        '再微调成 Video2World',
        '条件是文字，或再加视频'
      ], X.accent),
      panel(svg, 424, 64, 348, 250, '自回归式', [
        '离散 token，逐个生成',
        '4B 与 12B 只看视频',
        '不含语言理解',
        '加文字后是 5B 与 13B',
        'Llama 式 Transformer'
      ], X.good)
    ];
    var gap = T(400, 196, '并列', 'demo-x-mut', 14, 'middle');
    svg.appendChild(gap);
    var formula = M(400, 352, '8\\times 8\\times 8\\times 5\\times 5\\times 5 = 64000',
      { size: 16, anchor: 'middle', w: 460 });
    svg.appendChild(formula);
    var cap = T(400, 392, '自回归词表：tokenizer DV8×16×16 的 FSQ 层级乘积', 'demo-x-mut', 12, 'middle');
    svg.appendChild(cap);
    return { el: svg, draw: function (t) {
      K.setOpacity(cols[0], K.seg(t, 0.3, 1.3));
      K.setOpacity(gap, K.seg(t, 1.6, 2.4));
      K.setOpacity(cols[1], K.seg(t, 2.2, 3.2));
      K.setOpacity(formula, K.seg(t, 6.4, 7.4));
      K.setOpacity(cap, K.seg(t, 7.2, 8.2));
    }};
  }

  function buildScenePost() {
    var svg = K.sceneSvg('预训练模型分出相机、机器人和驾驶三条后训练示例');
    var head = marker(svg, 'cosmos-post');
    svg.appendChild(T(400, 32, '用目标场景的条件把通用模型微调成示例模型', 'demo-x-ink2', 14, 'middle'));
    var src = panel(svg, 250, 52, 300, 72, '预训练世界模型', ['通用视觉世界先验'], X.warn);
    var leaves = [
      panel(svg, 20, 210, 240, 110, '相机位姿', ['单张参考图 + 轨迹', '生成可导航的视频'], X.accent),
      panel(svg, 280, 210, 240, 110, '机器人操作', ['指令：Cosmos-1X', '动作：Bridge，7 维'], X.good),
      panel(svg, 540, 210, 240, 110, '自动驾驶', ['多视角视频', '文本或轨迹条件'], X.accent)
    ];
    var arrows = [140, 400, 660].map(function (x) {
      var a = P(E('path', {
        d: 'M 400 128 C 400 168, ' + x + ' 168, ' + x + ' 204',
        'stroke-width': 2.5, fill: 'none', 'marker-end': head
      }), null, X.muted);
      svg.appendChild(a);
      return a;
    });
    var note = T(400, 368, '论文标成 Sample：用法示例，不是可直接部署的成品', 'demo-x-mut', 13, 'middle');
    svg.appendChild(note);
    return { el: svg, draw: function (t) {
      K.setOpacity(src, K.seg(t, 0.3, 1.2));
      arrows.forEach(function (a, i) { K.setOpacity(a, K.seg(t, 1.8 + i * 0.45, 2.5 + i * 0.45)); });
      leaves.forEach(function (g, i) { K.setOpacity(g, K.seg(t, 2.4 + i * 0.7, 3.3 + i * 0.7)); });
      K.setOpacity(note, K.seg(t, 7.2, 8.2));
    }};
  }

  K.mount({ 'cosmos-explainer': function (host) {
    K.explainer(host, {
      title: '五幕动画：Cosmos 如何构建世界模型',
      sub: '约 60 秒自动播放。空格暂停，← → 换幕；图形与时长均为教学示意。',
      ariaLabel: 'Cosmos 世界基础模型五幕讲解动画',
      notes: [
        '论文依据：arXiv:2501.03575v3，§3 视频整理、§4 tokenizer、§5 预训练、§6 后训练。',
        '扩散与自回归是并列模型。动画不是论文生成的视频，也不是物理仿真或真机测试。'
      ],
      scenes: [
        { title: '为什么需要世界模型', dur: 12, build: buildSceneNeed, cues: [
          { at: 0.2, s: 'Physical AI 需要知道动作之后世界可能怎样变化，但直接在真机上试错成本高。' },
          { at: 3, s: 'Cosmos 构建的是预测未来视频的基础模型，供不同任务继续适配。' },
          { at: 7, s: '虚线框里的策略另算关节指令。世界模型的输出是视频，不是控制命令。' }] },
        { title: '视频数据整理', dur: 12, build: buildSceneData, cues: [
          { at: 0.2, s: '原始视频的画质和运动信息差得很远，不能整段丢进训练。' },
          { at: 3, s: '管线依次做切分、过滤、标注和去重，留下运动丰富、画质合适的片段。' },
          { at: 7, s: '论文从约 **2000 万小时**原始视频抽出约 **1 亿段**、每段 **2–60 秒**。这是视频库规模，不是机器人采集时长。' }] },
        { title: '视频分词器', dur: 12, build: buildSceneToken, cues: [
          { at: 0.2, s: '直接在原始像素上处理长视频非常贵，所以先压进潜空间。' },
          { at: 3, s: 'tokenizer 是因果的：算当前帧不用未来帧，只输入一帧时它就是图像 tokenizer。' },
          { at: 7, s: '扩散路线用连续潜变量，维度 $16$；自回归路线用离散 token，FSQ 有 $6$ 个量化层级。' }] },
        { title: '两类预训练模型', dur: 12, build: buildScenePretrain, cues: [
          { at: 0.2, s: '扩散家族是 **7B / 14B**：先做 Text2World，再微调成可以看视频的 Video2World。' },
          { at: 3, s: '自回归家族从 **4B / 12B** 的纯视频模型起步，没有语言理解；加上文字后才是 **5B / 13B**。' },
          { at: 7, s: '两列之间没有箭头。自回归词表 $\\lvert V\\rvert = 8\\times 8\\times 8\\times 5\\times 5\\times 5 = 64000$。' }] },
        { title: '面向任务后训练', dur: 12, build: buildScenePost, cues: [
          { at: 0.2, s: '预训练模型先吸收大规模视频里的一般场景和运动，再按目标场景微调。' },
          { at: 3, s: '论文的示例是相机位姿、机器人指令或动作、以及自动驾驶多视角。机器人动作条件来自 Bridge 的 $7$ 维夹爪动作。' },
          { at: 7, s: '这些模型被标成 **Sample**：用法示例，不是成品。要上真机，还得另接策略和控制系统。' }] }
      ]
    });
  }});
})();
