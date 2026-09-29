// CALM 视频的片头 / 总结页（stage.html 在 calm.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2305.02195',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:250px;font-weight:900;letter-spacing:16px;color:var(--demo-accent);line-height:1">CALM</div>');
    a.style.top = '190px';
    var b = h('div', 'big', root, '<div style="font-size:70px;font-weight:900">条件对抗潜变量模型</div>' +
      '<div style="font-size:40px;color:var(--text-secondary);margin-top:18px">给技能 latent 装上方向舵</div>');
    b.style.top = '470px';
    var m = h('div', 'meta', root,
      '<b>Conditional Adversarial Latent Models for Directable Virtual Characters</b><br>Tessler, Kasten, Guo, Mannor, Chechik, Peng<br>NVIDIA · Technion · SIGGRAPH 2023');
    m.style.top = '680px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>ASE 缺方向</div><div><span>02</span>LLC：latent 从动捕编出来</div>' +
      '<div><span>03</span>HLC：方向奖励</div><div><span>04</span>FSM：零训练组合</div>' +
      '<div><span>05</span>三阶段闭环</div>');
    toc.style.top = '1010px';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 CALM</div><div class="title">做什么、往哪做、什么时候换</div>');
    var items = [
      [ACC, '① 方向奖励', '$r_{dir} = \\cos(z_{target}, z_t)$<br>HLC 被关进目标风格的锥里'],
      [GOOD, '② 能点名', '$z = E(\\text{动捕片段})$<br>踢、庆祝都有自己的 latent'],
      [WARN, '③ FSM', '只换 $z$ 的来源，同一个 LLC<br>推理阶段新增训练量 = 0']
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
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.2, 5.4][k]); });
        fadeUp(foot, t, 9.0);
      }
    };
  }
};
