// PPO 视频的片头 / 总结页（stage.html 在 ppo.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '1707.06347',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:250px;font-weight:900;letter-spacing:16px;color:var(--demo-accent);line-height:1">PPO</div>');
    a.style.top = '190px';
    var b = h('div', 'big', root, '<div style="font-size:70px;font-weight:900">近端策略优化</div>' +
      '<div style="font-size:40px;color:var(--text-secondary);margin-top:18px">人形机器人强化学习最常用的基础算法</div>');
    b.style.top = '470px';
    var m = h('div', 'meta', root,
      '<b>Proximal Policy Optimization Algorithms</b><br>Schulman, Wolski, Dhariwal, Radford, Klimov<br>OpenAI · 2017 · arXiv 1707.06347');
    m.style.top = '680px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>步子迈多大</div><div><span>02</span>第一把尺子：概率比 r</div>' +
      '<div><span>03</span>第二把尺子：优势 A 与 GAE</div><div><span>04</span>核心机制：裁剪与冻结</div>' +
      '<div><span>05</span>合起来：四步循环</div>');
    toc.style.top = '950px';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 7.0 + k * 0.45, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 PPO</div><div class="title">每一步，都在护栏之内</div>');
    var items = [
      [ACC, '① 概率比', '$r = \\pi_\\theta(a \\mid s) / \\pi_{old}(a \\mid s)$<br>新策略相对旧策略变了多少'],
      [GOOD, '② 优势（GAE）', '$\\hat{A}_t = \\delta_t + \\gamma\\lambda\\,\\hat{A}_{t+1}$<br>这个动作比平均水平好多少'],
      [WARN, '③ 裁剪 + 取 min', '$\\min\\big(r\\hat{A},\\ \\mathrm{clip}(r, 1-\\varepsilon, 1+\\varepsilon)\\,\\hat{A}\\big)$<br>冲出 $[0.8,\\ 1.2]$ 就冻结']
    ];
    var pts = items.map(function (it, k) {
      var p = h('div', 'pt', root);
      p.style.top = (420 + k * 265) + 'px';
      p.style.borderLeft = '10px solid ' + it[0];
      var n = h('div', 'n', p, it[1]); n.style.color = it[0];
      var body = h('div', '', p);
      it[2].split('<br>').forEach(function (line, q) {
        if (q) body.appendChild(document.createElement('br'));
        var span = h('span', '', body); K.rich(span, line);
        if (q) { span.style.fontSize = '36px'; span.style.color = 'var(--text-secondary)'; }
      });
      return p;
    });
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 4 个交互演示 · MimicKit 源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
    foot.style.top = '1225px';
    foot.style.textAlign = 'center';
    foot.style.fontSize = '32px';
    return {
      root: root,
      draw: function (st, t) {
        fadeUp(head, t, 0.0);
        pts.forEach(function (p, k) { fadeUp(p, t, [1.2, 3.2, 5.6][k]); });
        fadeUp(foot, t, 10.2);
      }
    };
  }
};
