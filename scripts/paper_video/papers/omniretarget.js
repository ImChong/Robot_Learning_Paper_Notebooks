// OmniRetarget 视频的片头 / 总结页（stage.html 在 omniretarget.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2509.26633',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:124px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">OmniRetarget</div>');
    var b = h('div', 'big', root, '<div style="font-size:64px;font-weight:900;line-height:1.2">保住交互的数据工厂</div>' +
      '<div style="font-size:38px;color:var(--text-secondary);margin-top:14px">interaction mesh + 硬约束 + 系统性扩增</div>');
    var m = h('div', 'meta', root,
      '<b>OmniRetarget: Interaction-Preserving Data Generation for Humanoid Whole-Body Loco-Manipulation and Scene Interaction</b><br>Lujie Yang 等 · Amazon FAR 等五家机构');
    m.style.fontSize = '32px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>只盯人体关键点的代价</div><div><span>02</span>Interaction mesh</div>' +
      '<div><span>03</span>Laplacian 形变能</div><div><span>04</span>序贯 SOCP 硬约束</div>' +
      '<div><span>05</span>一条演示，四路扩增</div><div><span>06</span>极简 RL 与 Table II</div>' +
      '<div><span>07</span>数据工厂到 G1 真机</div>');
    toc.style.fontSize = '38px';
    toc.style.lineHeight = '1.7';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [44, 60, 60], 170, 1400);
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 7.0 + k * 0.35, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 OmniRetarget</div><div class="title">参考干净了，RL 才能极简</div>');
    var items = [
      [ACC, '① 保形 + 硬约束', 'Delaunay 网格上最小化 Laplacian 形变能<br>非穿透 · 关节限位 · 速度 · 脚不滑，全是硬约束'],
      [GOOD, '② 一条演示扩成一族', '物体位姿 / 形状 / 地形 / 本体四路扩增<br>全扩增 79.1% vs 仅名义 82.2%，只掉 3.1 pp'],
      [WARN, '③ 极简 RL 就够', '5 项奖励 + 4 项域随机化<br>OMOMO 82.20%，比 GMR 高 31.4 pp，脚滑为 0']
    ];
    var pts = items.map(function (it, k) {
      var p = h('div', 'pt', root);
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
      '<b>完整笔记 · 具体算例 · Holosoma 源码入口</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
    foot.style.textAlign = 'center';
    foot.style.fontSize = '32px';
    return {
      root: root,
      draw: function (st, t) {
        V.stack(pts.concat([foot]), [28, 28, 44], 360, 1400);
        fadeUp(head, t, 0.0);
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.4, 5.8][k]); });
        fadeUp(foot, t, 9.0);
      }
    };
  }
};
