// PULSE 视频的片头 / 总结页（stage.html 在 pulse.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2310.04582',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:230px;font-weight:900;letter-spacing:10px;color:var(--demo-accent);line-height:1">PULSE</div>');
    a.style.top = '200px';
    var b = h('div', 'big', root, '<div style="font-size:70px;font-weight:900">物理可行的通用潜在技能</div>' +
      '<div style="font-size:40px;color:var(--text-secondary);margin-top:18px">把数万段人体动作压成一个 32 维潜空间</div>');
    b.style.top = '470px';
    var m = h('div', 'meta', root,
      '<b>Universal Humanoid Motion Representations for Physics-Based Control</b><br>Luo, Cao, Winkler, Hodgins, Xu, Kitani<br>CMU · Meta · ICLR 2024 Spotlight');
    m.style.top = '680px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>缺一个通用表示</div><div><span>02</span>阶段 1：大规模模仿</div>' +
      '<div><span>03</span>阶段 2：VIB 瓶颈</div><div><span>04</span>本体感受先验</div>' +
      '<div><span>05</span>阶段 3：下游只搜 32 维</div><div><span>06</span>闭环与源码</div>');
    toc.style.top = '1010px';
    toc.style.lineHeight = '1.6';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 PULSE</div><div class="title">把「会动」压成可采样的表示</div>');
    var items = [
      [ACC, '① 大规模模仿 + VIB', '$\\lVert a_{student} - a_{teacher} \\rVert^2 + \\beta \\cdot \\mathrm{KL}$<br>能力变成一个 32 维概率潜空间'],
      [GOOD, '② 本体感受先验', '$p(z \\mid s)$ 以当前姿态、速度为条件<br>长序列采样才不会踩空'],
      [WARN, '③ 下游只搜 32 维', '解码器与先验冻结，高层输出残差 $\\Delta z$<br>物理可行性由冻结的解码器保底']
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
      '<b>完整笔记 · 3 个交互演示 · 官方源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
    foot.style.top = '1225px';
    foot.style.textAlign = 'center';
    foot.style.fontSize = '32px';
    return {
      root: root,
      draw: function (st, t) {
        fadeUp(head, t, 0.0);
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.4, 5.8][k]); });
        fadeUp(foot, t, 9.0);
      }
    };
  }
};
