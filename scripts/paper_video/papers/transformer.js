// Transformer 视频的片头 / 总结页（stage.html 在 transformer.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '1706.03762',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:150px;font-weight:900;letter-spacing:6px;color:var(--demo-accent);line-height:1">Transformer</div>');
    a.style.top = '230px';
    var b = h('div', 'big', root, '<div style="font-size:66px;font-weight:900">注意力就是你所需要的一切</div>' +
      '<div style="font-size:40px;color:var(--text-secondary);margin-top:18px">今天所有机器人大模型的骨架</div>');
    b.style.top = '470px';
    var m = h('div', 'meta', root,
      '<b>Attention Is All You Need</b><br>Vaswani, Shazeer, Parmar, Uszkoreit 等<br>Google Brain · Google Research · NIPS 2017');
    m.style.top = '680px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>RNN 的串行瓶颈</div><div><span>02</span>缩放点积注意力：一行手算</div>' +
      '<div><span>03</span>为什么除以 √dₖ</div><div><span>04</span>多头：8 个 64 维的头</div>' +
      '<div><span>05</span>正弦位置编码</div><div><span>06</span>编码器、解码器与因果掩码</div>' +
      '<div><span>07</span>训练配方与结果</div>');
    toc.style.top = '960px';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 6.4 + k * 0.4, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 Transformer</div><div class="title">没有循环，只有注意力</div>');
    var items = [
      [ACC, '① 按相似度加权', '$\\mathrm{softmax}(QK^\\top/\\sqrt{d_k})\\,V$<br>谁和我像，就多拿谁的 value'],
      [GOOD, '② 缩放与多头', '除以 $\\sqrt{d_k}$ 防 softmax 饱和<br>8 个 64 维的头，是切分不是加算力'],
      [WARN, '③ 位置与掩码', '正弦位置编码把顺序加回来<br>因果掩码：训练并行，推理仍逐词']
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
      '<b>完整笔记 · 手算例子 · tensor2tensor 源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
