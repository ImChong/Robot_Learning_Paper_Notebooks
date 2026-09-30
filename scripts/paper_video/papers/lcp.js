// LCP 视频的片头 / 总结页（stage.html 在 lcp.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2410.11825',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:162px;font-weight:900;letter-spacing:16px;color:var(--demo-accent);line-height:1.08">LCP</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">Lipschitz 约束策略</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">让人形机器人天生不抖</div>');
    var m = h('div', 'meta', root,
      '<b>Learning Smooth Humanoid Locomotion through Lipschitz-Constrained Policies</b><br>Chen, He, Wang, Liao, Ze 等<br>SFU · UIUC · Berkeley · Stanford · NVIDIA');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>抖动 = K × σ</div><div><span>02</span>梯度惩罚约束敏感度</div>' +
      '<div><span>03</span>λ 的取舍：别压过头</div><div><span>04</span>对比低通滤波</div>' +
      '<div><span>05</span>接进 PPO：只多一项 loss</div>');
    toc.style.fontSize = '31px';
    toc.style.lineHeight = '1.55';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [26, 40, 40], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 7.0 + k * 0.45, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 LCP</div><div class="title">不调 reward，直接压敏感度</div>');
    var items = [
      [ACC, '① 抖动 = K × σ', '$\\sigma$ 是硬件的，能改的只有 $K$<br>仿真里 $\\sigma = 0$，所以测不出来'],
      [GOOD, '② 梯度惩罚', '$J(\\theta) - \\lambda_{gp}\\,\\mathbb{E}[\\lVert\\nabla_o\\pi\\rVert^2]$<br>太小没效果，太大动作发钝'],
      [WARN, '③ 只多一项 loss', '不像低通那样付延迟<br>`LCPAgent` 继承 `PPOAgent`，$\\lambda_{gp}$ = 0.002']
    ];
    var pts = items.map(function (it, k) {
      var p = h('div', 'pt', root);
      p.style.fontSize = '37px'; p.style.padding = '18px 32px';
      p.style.borderLeft = '10px solid ' + it[0];
      var n = h('div', 'n', p, it[1]); n.style.color = it[0];
      var body = h('div', '', p);
      it[2].split('<br>').forEach(function (line, q) {
        if (q) body.appendChild(document.createElement('br'));
        var span = h('span', '', body); K.rich(span, line);
        if (q) { span.style.fontSize = '31px'; span.style.color = 'var(--text-secondary)'; }
      });
      return p;
    });
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · MimicKit 源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
    foot.style.textAlign = 'center';
    foot.style.fontSize = '29px';
    foot.style.padding = '22px 34px';
    return {
      root: root,
      draw: function (st, t) {
        V.stack(pts.concat([foot]), [20, 20, 30], V.SAFE_TOP + 148, V.contentBottom());
        fadeUp(head, t, 0.0);
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.4, 5.8][k]); });
        fadeUp(foot, t, 9.0);
        foot.style.transform = 'none';  // 紧挨字幕，只淡入不上滑
      }
    };
  }
};
