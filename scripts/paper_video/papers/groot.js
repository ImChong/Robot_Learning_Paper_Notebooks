// GR00T N1 视频的片头 / 总结页（stage.html 在 groot.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2503.14734',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:110px;font-weight:900;letter-spacing:6px;color:var(--demo-accent);line-height:1.08">GR00T N1</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">开放的人形基础模型</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">双系统 VLA + 流匹配 + 数据金字塔</div>');
    var m = h('div', 'meta', root,
      '<b>GR00T N1: An Open Foundation Model for Generalist Humanoid Robots</b><br>NVIDIA Project GR00T（Jim Fan、Yuke Zhu 等）<br>NVIDIA · arXiv 2025');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>没有人形数据的互联网</div><div><span>02</span>10 Hz 与 63.9 ms</div>' +
      '<div><span>03</span>流匹配的直线</div><div><span>04</span>数据金字塔</div>' +
      '<div><span>05</span>潜动作与 IDM</div><div><span>06</span>一套权重，多套 MLP</div>' +
      '<div><span>07</span>表上的数字</div>');
    toc.style.fontSize = '31px';
    toc.style.lineHeight = '1.55';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [26, 40, 40], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 7.0 + k * 0.35, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 GR00T N1</div><div class="title">慢脑子接快手，数据堆成金字塔</div>');
    var items = [
      [ACC, '① 双系统', '10 Hz 的 Eagle-2 第 12 层特征<br>接 DiT：16 步动作块 63.9 ms，$K=4$ 步欧拉'],
      [GOOD, '② 数据金字塔', '人类视频 → 仿真 / 神经轨迹 → 真机<br>潜动作与 IDM 给无标签视频补动作'],
      [WARN, '③ 看清边界', '10% 数据比 DP 高 32.4 个点<br>强结果只在短程桌面操作，只报了 GR-1']
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
      '<b>完整笔记 · 3 个交互演示 · Isaac-GR00T 源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
