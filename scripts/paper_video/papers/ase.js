// ASE 视频的片头 / 总结页（stage.html 在 ase.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2205.01906',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:250px;font-weight:900;letter-spacing:16px;color:var(--demo-accent);line-height:1">ASE</div>');
    a.style.top = '190px';
    var b = h('div', 'big', root, '<div style="font-size:70px;font-weight:900">对抗技能嵌入</div>' +
      '<div style="font-size:40px;color:var(--text-secondary);margin-top:18px">把上千段动捕压成一个技能空间</div>');
    b.style.top = '470px';
    var m = h('div', 'meta', root,
      '<b>Adversarial Skill Embeddings for Large-Scale Motion Control</b><br>Peng, Guo, Halper, Levine, Fidler<br>UC Berkeley · NVIDIA · SIGGRAPH 2022');
    m.style.top = '680px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>技能被绑死</div><div><span>02</span>技能 = 球面上的方向</div>' +
      '<div><span>03</span>latent collapse</div><div><span>04</span>encoder：把 z 逼回动作</div>' +
      '<div><span>05</span>diversity：空间要等速</div><div><span>06</span>训练闭环与下游</div>');
    toc.style.top = '1005px';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 ASE</div><div class="title">技能是方向，不是按钮</div>');
    var items = [
      [ACC, '① 球面 latent', '$\\pi(a \\mid s, z)$，$\\lVert z \\rVert = 1$<br>每 0~5 秒重采样一次'],
      [GOOD, '② encoder 奖励', '$r = 0.5\\, r_{disc} + 0.5\\, r_{enc}$<br>逼策略真的用上 $z$，防止塌缩'],
      [WARN, '③ diversity', '动作差异 ∝ latent 差异<br>空间等速，才能插值']
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
