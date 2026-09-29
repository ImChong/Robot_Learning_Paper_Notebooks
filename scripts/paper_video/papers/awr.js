// AWR 视频的片头 / 总结页（stage.html 在 awr.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '1910.00177',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:250px;font-weight:900;letter-spacing:16px;color:var(--demo-accent);line-height:1">AWR</div>');
    a.style.top = '190px';
    var b = h('div', 'big', root, '<div style="font-size:70px;font-weight:900">优势加权回归</div>' +
      '<div style="font-size:40px;color:var(--text-secondary);margin-top:18px">把强化学习写成一次加权监督学习</div>');
    b.style.top = '470px';
    var m = h('div', 'meta', root,
      '<b>Advantage-Weighted Regression</b><br>Peng, Kumar, Zhang, Levine<br>UC Berkeley · 2019 · arXiv 1910.00177');
    m.style.top = '680px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>PPO 留下的三个麻烦</div><div><span>02</span>评估：A = R − V</div>' +
      '<div><span>03</span>改进：指数权重</div><div><span>04</span>一次更新 = 一次加权平均</div>' +
      '<div><span>05</span>off-policy 的赚与亏</div><div><span>06</span>闭环与源码落点</div>');
    toc.style.top = '945px';
    toc.style.lineHeight = '1.75';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 7.0 + k * 0.4, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 AWR</div><div class="title">好的动作多学，差的动作少学</div>');
    var items = [
      [ACC, '① 优势', '$A = R - V_\\phi(s)$<br>有没有超出预期，而不是赚没赚'],
      [GOOD, '② 指数权重', '$w_i = \\exp(A_i / \\beta) / Z$<br>$\\beta$ 越小越只学最好的那几条'],
      [WARN, '③ 加权回归', '$\\max_\\theta \\sum_i w_i \\log \\pi_\\theta(a_i \\mid s_i)$<br>没有概率比、没有裁剪、没有 KL']
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
      '<b>完整笔记 · 3 个交互演示 · MimicKit 源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
    foot.style.top = '1225px';
    foot.style.textAlign = 'center';
    foot.style.fontSize = '32px';
    return {
      root: root,
      draw: function (st, t) {
        fadeUp(head, t, 0.0);
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.0, 5.4][k]); });
        fadeUp(foot, t, 9.0);
      }
    };
  }
};
