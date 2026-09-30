// π0.5 视频的片头 / 总结页（stage.html 在 pi05.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2504.16054',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:230px;font-weight:900;letter-spacing:8px;color:var(--demo-accent);line-height:1">π<span style="font-size:0.55em;letter-spacing:2px">0.5</span></div>');
    a.style.top = '190px';
    var b = h('div', 'big', root, '<div style="font-size:66px;font-weight:900">开放世界泛化的 VLA</div>' +
      '<div style="font-size:40px;color:var(--text-secondary);margin-top:18px">在没见过的家里收拾厨房和卧室</div>');
    b.style.top = '470px';
    var m = h('div', 'meta', root,
      '<b>π0.5: a Vision-Language-Action Model with Open-World Generalization</b><br>Black, Brown, Driess, Finn, Levine, Pertsch 等<br>Physical Intelligence · 2025');
    m.style.top = '680px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>开放世界的难题</div><div><span>02</span>异构数据配方</div>' +
      '<div><span>03</span>一个模型，两层推理</div><div><span>04</span>离散预训练 + 连续后训练</div>' +
      '<div><span>05</span>输入输出与部署</div><div><span>06</span>训练环境数量的扩展</div>' +
      '<div><span>07</span>消融：什么最重要</div>');
    toc.style.top = '1020px';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 π₀.₅</div><div class="title">主干不变，换的是配方</div>');
    var items = [
      [ACC, '① 异构协同训练', '预训练 97.6% 样本不来自家里的移动机械臂<br>跨本体 + 子任务 + 网页 + 口头指令'],
      [GOOD, '② 同一个模型两层推理', '$\\pi(a \\mid o, \\hat\\ell)\\,\\pi(\\hat\\ell \\mid o, \\ell)$<br>先写子任务，再 10 步去噪出动作'],
      [WARN, '③ 先离散后连续', 'FAST 预训练 280k 步（$\\alpha = 0$）<br>加动作专家后训练 80k 步（$\\alpha = 10$）']
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
      '<b>完整笔记 · 手算例子 · openpi 源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
    foot.style.top = '1225px';
    foot.style.textAlign = 'center';
    foot.style.fontSize = '32px';
    return {
      root: root,
      draw: function (st, t) {
        fadeUp(head, t, 0.0);
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.4, 5.8][k]); });
        fadeUp(foot, t, 8.0);
      }
    };
  }
};
