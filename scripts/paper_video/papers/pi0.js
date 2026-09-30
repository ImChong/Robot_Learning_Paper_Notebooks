// π0 视频的片头 / 总结页（stage.html 在 pi0.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2410.24164',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:250px;font-weight:900;letter-spacing:10px;color:var(--demo-accent);line-height:1">π₀</div>');
    a.style.top = '190px';
    var b = h('div', 'big', root, '<div style="font-size:66px;font-weight:900">视觉-语言-动作流模型</div>' +
      '<div style="font-size:40px;color:var(--text-secondary);margin-top:18px">一个模型，多台机器人，长程灵巧操作</div>');
    b.style.top = '470px';
    var m = h('div', 'meta', root,
      '<b>π0: A Vision-Language-Action Flow Model for General Robot Control</b><br>Black, Brown, Driess, Finn, Levine 等<br>Physical Intelligence · 2024');
    m.style.top = '680px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>通才策略的三道坎</div><div><span>02</span>一个 Transformer，两套权重</div>' +
      '<div><span>03</span>分块因果掩码与 KV 缓存</div><div><span>04</span>流匹配：从噪声走到动作块</div>' +
      '<div><span>05</span>动作块与推理预算</div><div><span>06</span>数据与配方</div>' +
      '<div><span>07</span>实验读数与边界</div>');
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 π₀</div><div class="title">VLM + 流匹配动作专家</div>');
    var items = [
      [ACC, '① 两套权重', 'PaliGemma 3B + 动作专家 300M<br>只在自注意力里相遇'],
      [GOOD, '② 流匹配动作块', '$A^\\tau = \\tau A + (1-\\tau)\\epsilon$，10 步欧拉<br>一次 50 步，板载 73 ms'],
      [WARN, '③ 两段配方', '预训练：约 1 万小时、7 种构型<br>后训练：5 ～ 100+ 小时高质量数据']
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
