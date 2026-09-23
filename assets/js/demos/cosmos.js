/* Cosmos-Predict1 five-scene explainer, based on arXiv:2501.03575v3.
 * Shapes and animation timings are teaching diagrams, not model outputs. */
(function () {
  'use strict';
  var K = window.PaperDemoKit;
  var X = K.xColors;
  var P = K.paint, E = K.svgEl, T = K.svgText;
  var STAGES = [
    { title: '为什么需要世界模型', intro: '真实机器人试错昂贵；先学习环境如何变化。',
      boxes: [['传感器观察', '视频记录真实场景'], ['世界模型', '预测可能的未来视频'], ['机器人策略', '另行决定并执行动作']],
      cues: [
        { at: 0.2, s: 'Physical AI 需要理解动作之后世界可能怎样变化，但直接在真机上试错成本高。' },
        { at: 3, s: 'Cosmos 重点构建预测视觉世界的基础模型，供不同任务继续适配。' },
        { at: 7, s: '世界模型生成的是未来场景预测；它本身不是直接输出关节指令的控制策略。' }] },
    { title: '视频数据整理', intro: '分段、过滤、标注和去重，构建训练片段。',
      boxes: [['原始视频', '不同场景与运动'], ['整理管线', '分段 · 过滤 · 标注 · 去重'], ['训练片段', '运动丰富且画质合适']],
      cues: [
        { at: 0.2, s: '原始视频质量和运动信息各异，不能简单全部投入训练。' },
        { at: 3, s: '论文的数据管线依次处理切分、筛选、标注、去重与分片。' },
        { at: 7, s: '论文报告从约 2000 万小时原始视频中提取约 1 亿段片段；这描述数据整理规模，不是机器人采集时长。' }] },
    { title: '视频分词器', intro: '将时空信息压缩成模型可处理的潜在表示。',
      boxes: [['连续视频帧', '画面随时间变化'], ['视频 tokenizer', '时空压缩与重建'], ['潜在表示', '供生成模型学习']],
      cues: [
        { at: 0.2, s: '直接在原始像素上处理长视频会非常昂贵。' },
        { at: 3, s: '视频 tokenizer 把视频压缩为潜在表示，并学习如何重建画面。' },
        { at: 7, s: '论文中的扩散与自回归路线分别使用连续与离散的视频潜在表示。' }] },
    { title: '两类预训练模型', intro: '扩散式与自回归式 Transformer 都用于生成未来视频。',
      boxes: [['扩散路线', '逐步去噪生成视频'], ['共享目标', '依据条件预测未来'], ['自回归路线', '按顺序逐段生成']],
      cues: [
        { at: 0.2, s: '扩散式世界基础模型通过迭代去噪来生成视频。' },
        { at: 3, s: '另一条路线自回归生成视频，两种架构是并列探索，并非必须串行运行。' },
        { at: 7, s: '这一步得到通用世界基础模型；未来预测的物理准确性仍需要评估。' }] },
    { title: '面向任务后训练', intro: '用目标任务的视频和条件，把通用模型适配成专用模型。',
      boxes: [['预训练 WFM', '通用视觉世界先验'], ['目标场景数据', '指令 / 轨迹 / 控制条件'], ['专用 WFM', '生成条件相关的未来视频']],
      cues: [
        { at: 0.2, s: '预训练模型吸收大规模视频中的一般场景与运动规律。' },
        { at: 3, s: '后训练用目标场景的提示与视频对，让模型学会特定条件。' },
        { at: 7, s: '论文展示相机控制、机器人操作和自动驾驶。要让真机执行，还须结合策略与控制系统。' }] }
  ];

  function makeScene(index) {
    return function () {
      var d = STAGES[index], svg = K.sceneSvg(d.intro);
      svg.appendChild(T(400, 40, d.intro, 'demo-x-ink2', 14, 'middle'));
      var groups = d.boxes.map(function (b, i) {
        var x = 36 + i * 254, color = [X.accent, X.warn, X.good][i];
        var g = E('g', {});
        g.appendChild(P(E('rect', { x: x, y: 112, width: 226, height: 90, rx: 12, 'stroke-width': 2 }), X.surface2, color));
        g.appendChild(P(T(x + 14, 146, b[0], null, 16), color));
        g.appendChild(T(x + 14, 178, b[1], 'demo-x-mut', 11));
        svg.appendChild(g);
        return g;
      });
      var arrows = [0, 1].map(function (i) {
        var x = 263 + i * 254;
        var a = P(E('path', { d: 'M ' + x + ' 157 L ' + (x + 20) + ' 157', 'stroke-width': 3, fill: 'none' }), null, X.muted);
        svg.appendChild(a);
        return a;
      });
      var note = T(400, 320, index === 3
        ? '扩散与自回归是两条并列生成路线；箭头仅表示阅读顺序'
        : '信息流示意 · 不是模型输出或真机回放', 'demo-x-mut', 12, 'middle');
      svg.appendChild(note);
      return { el: svg, draw: function (t) {
        groups.forEach(function (g, i) { K.setOpacity(g, K.seg(t, 0.4 + i * 2.4, 1.3 + i * 2.4)); });
        arrows.forEach(function (a, i) { K.setOpacity(a, K.seg(t, 2.1 + i * 2.4, 2.8 + i * 2.4)); });
        K.setOpacity(note, K.seg(t, 7.5, 8.5));
      }};
    };
  }

  K.mount({ 'cosmos-explainer': function (host) {
    K.explainer(host, {
      title: '五幕动画：Cosmos 如何构建世界模型',
      sub: '约 60 秒自动播放。空格暂停，← → 换幕；图形与时长均为教学示意。',
      ariaLabel: 'Cosmos 世界基础模型五幕讲解动画',
      notes: ['论文依据：arXiv:2501.03575v3，§3 视频整理、§4 tokenizer、§5 预训练、§6 后训练。',
        '箭头展示讲解顺序；扩散和自回归是并列模型路线。动画不是论文生成视频、物理仿真结果或真机测试。'],
      scenes: STAGES.map(function (d, i) { return { title: d.title, dur: 12, build: makeScene(i), cues: d.cues }; })
    });
  }});
})();
