/* GR00T N1 six-scene explainer. Figures and timings follow arXiv:2503.14734v2.
 * Diagram motion is illustrative; it is not a robot rollout or a measured trace. */
(function () {
  'use strict';
  var K = window.PaperDemoKit;
  var X = K.xColors;
  var P = K.paint, E = K.svgEl, T = K.svgText, M = K.svgMath;
  var H = 16, STEPS = 4, S2_HZ = 10, ACTION_HZ = 120;
  var CHUNK_MS = 63.9; // Paper §2, L40 bf16, not a per-action latency.
  var BLOCKS = [
    { title: '为什么需要基础模型', intro: '机器人数据像孤岛：机型、动作空间、任务都不同。',
      boxes: [['单机少量示教', '跨机型数据难合并'], ['人类视频没动作标签', '新任务再采集成本高'], ['目标', '联合训练可适配的策略']],
      cues: [
        { at: 0.3, s: '每台机器人的数据都少，控制接口又不同，通用策略很难只靠单机示教长出来。' },
        { at: 3, s: '人类视频虽然多，却没有机器人关节动作标签。' },
        { at: 7, s: 'GR00T N1 用跨具身模型和数据金字塔把这些来源接到一起。' }] },
    { title: '数据金字塔', intro: '数量从下到上减少；机器人动作标注从下到上更具体。',
      boxes: [['底层 · 人类视频', '视觉与行为先验'], ['中层 · 合成轨迹', '仿真 + 神经生成'], ['顶层 · 真机示教', '真实执行与动作标签']],
      cues: [
        { at: 0.3, s: '金字塔底部是大量人类视频与已有视觉语言数据。' },
        { at: 3, s: '中间是仿真轨迹和视频模型生成的轨迹。无动作视频可用 latent action 或逆动力学模型补伪标签。' },
        { at: 7, s: '顶部才是最贵、最少的真机轨迹；三层混合训练，让动作落到真实机器人上。' }] },
    { title: '两个系统如何接线', intro: 'Eagle-2 理解画面与指令；DiT 依据状态生成动作。',
      boxes: [['图像 + 指令', 'Eagle-2 · System 2'], ['视觉语言 token', 'DiT 交叉注意力条件'], ['机器人状态 + 噪声动作', 'DiT · System 1 → 动作块']],
      cues: [
        { at: 0.3, s: 'System 2 用 Eagle-2 把图像和文字编码成视觉语言 token。' },
        { at: 3, s: 'System 1 的 DiT 用 cross-attention 读取这些 token，self-attention 处理状态和带噪动作。' },
        { at: 7, s: '两部分联合训练；**10 Hz / 120 Hz 是论文在 L40 上描述的模块与动作频率，不是电机 PD 环频率**。' }] },
    { title: '同一模型适配不同机型', intro: '每类机型各有状态/动作 MLP，DiT 使用共享嵌入空间。',
      boxes: [['机型 A · 状态/动作维度 A', '专属编码 MLP'], ['共享 DiT', '视觉语言条件 + 状态'], ['专属解码 MLP', '机型 B · 动作维度 B']],
      cues: [
        { at: 0.3, s: '不同机型的本体状态维度和动作维度并不相同。' },
        { at: 3, s: '每个 embodiment 用自己的 MLP 编码状态与带噪动作，映射到共享 DiT 空间。' },
        { at: 7, s: '最后再经对应的动作解码器输出该机型的动作；共享主干不等于任意机器人零配置直接运行。' }] },
    { title: '生成 16 步动作块', intro: 'Flow matching：从噪声出发，迭代修正整块动作。',
      boxes: [['输入噪声动作块', 'H = ' + H + ' 个时间步'], ['DiT 预测向量场', 'Euler 去噪 ' + STEPS + ' 次'], ['输出连续动作', '闭环获取新观测后再生成']],
      cues: [
        { at: 0.3, s: '一次推理预测一整块：$A_t = [a_t,\\ldots,a_{t+H-1}]$，论文设 $H = 16$，时间跨度按 $\\frac{16}{120}$ 秒换算。' },
        { at: 3, s: '推理从高斯噪声开始，DiT 预测 flow；论文报告 **' + STEPS + ' 次** Euler 更新效果良好。' },
        { at: 7, s: 'L40 bf16 上采样整块需 **' + CHUNK_MS + ' ms**，不是每个动作 ' + CHUNK_MS + ' ms；120 Hz 意味着动作间隔约 ' + (1000 / ACTION_HZ).toFixed(2) + ' ms。' }] },
    { title: '验证范围与下一步', intro: '仿真跨机型评估；真机 GR-1 桌面操作。',
      boxes: [['仿真', '多机型操作任务'], ['真机 GR-1', '双手桌面操作'], ['边界', '长程移动操作仍待研究']],
      cues: [
        { at: 0.3, s: '论文在 RoboCasa、DexMimicGen 和 GR-1 桌面任务上做评估。' },
        { at: 3, s: '真机结果聚焦 GR-1 的抓放、抽屉/柜门、工业物件和协作任务。' },
        { at: 7, s: '论文明确把长程 loco-manipulation 留作未来工作；**不要把桌面任务理解为整机自主导航的验证**。' }] }
  ];
  function box(svg, x, y, w, title, sub, color) {
    var g = E('g', {});
    g.appendChild(P(E('rect', { x: x, y: y, width: w, height: 76, rx: 12, 'stroke-width': 2 }), X.surface2, color));
    g.appendChild(P(T(x + 16, y + 29, title, null, 15), color));
    g.appendChild(T(x + 16, y + 55, sub, 'demo-x-mut', 11));
    svg.appendChild(g);
    return g;
  }
  function makeScene(n) {
    return function () {
      var d = BLOCKS[n], svg = K.sceneSvg(d.intro);
      svg.appendChild(T(35, 35, d.intro, 'demo-x-ink2', 13));
      var groups = d.boxes.map(function (b, i) {
        return box(svg, 36 + i * 254, 110, 226, b[0], b[1], [X.accent, X.warn, X.good][i]);
      });
      var arrows = [0, 1].map(function (i) {
        var a = P(E('path', { d: 'M ' + (262 + i * 254) + ' 148 L ' + (284 + i * 254) + ' 148', 'stroke-width': 3, fill: 'none' }), null, X.muted);
        svg.appendChild(a); return a;
      });
      var math = n === 4 ? M(400, 259, 'A_t=[a_t,\\ldots,a_{t+15}],\\quad K=4',
        { size: 18, anchor: 'middle', w: 500 }) : null;
      if (math) svg.appendChild(math);
      var footer = T(400, 326, n === 4
        ? '动作块时长：16 / 120 ≈ ' + (H / ACTION_HZ).toFixed(3) + ' s（仅频率换算）'
        : '示意图 · 逐项揭示论文中的信息流', 'demo-x-mut', 12, 'middle');
      svg.appendChild(footer);
      return { el: svg, draw: function (t) {
        groups.forEach(function (g, i) { K.setOpacity(g, K.seg(t, 0.5 + i * 2.3, 1.2 + i * 2.3)); });
        arrows.forEach(function (a, i) { K.setOpacity(a, K.seg(t, 2 + i * 2.3, 2.7 + i * 2.3)); });
        if (math) K.setOpacity(math, K.seg(t, 7, 8));
        K.setOpacity(footer, K.seg(t, 8, 9));
      }};
    };
  }
  var SCENES = [
    { title: BLOCKS[0].title, dur: 12, build: buildSceneProblem, cues: BLOCKS[0].cues },
    { title: BLOCKS[1].title, dur: 12, build: buildScenePyramid, cues: BLOCKS[1].cues },
    { title: BLOCKS[2].title, dur: 12, build: buildSceneSystems, cues: BLOCKS[2].cues },
    { title: BLOCKS[3].title, dur: 12, build: buildSceneEmbodiments, cues: BLOCKS[3].cues },
    { title: BLOCKS[4].title, dur: 12, build: buildSceneChunk, cues: BLOCKS[4].cues },
    { title: BLOCKS[5].title, dur: 12, build: buildSceneEvaluation, cues: BLOCKS[5].cues }
  ];
  function buildSceneProblem() { return makeScene(0)(); }
  function buildScenePyramid() { return makeScene(1)(); }
  function buildSceneSystems() { return makeScene(2)(); }
  function buildSceneEmbodiments() { return makeScene(3)(); }
  function buildSceneChunk() { return makeScene(4)(); }
  function buildSceneEvaluation() { return makeScene(5)(); }
  K.mount({ 'gr00t-explainer': function (host) {
    K.explainer(host, {
      title: '六幕动画：GR00T N1 从数据到动作',
      sub: '约 72 秒自动播放。空格暂停，← → 换幕；图形与时间轴是教学示意。',
      ariaLabel: 'GR00T N1 六幕讲解动画',
      notes: ['论文依据：arXiv:2503.14734v2，§2.1（Eagle-2、DiT、$H=16$、$K=4$、10/120 Hz）、§2.2（数据金字塔）、§4（评估）。',
        '图中方框、流动顺序是教学示意，不代表真实机器人回放；63.9 ms 是论文在 L40 bf16 上生成一个 16 步动作块的测量，不是板载延迟。'],
      scenes: SCENES
    });
  }});
})();
