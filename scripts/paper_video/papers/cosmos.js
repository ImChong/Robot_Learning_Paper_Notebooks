// Cosmos 视频的片头 / 总结页（stage.html 在 cosmos.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2501.03575',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:150px;font-weight:900;letter-spacing:12px;color:var(--demo-accent);line-height:1.08">Cosmos</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">世界基础模型平台</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">预测未来视频，而不是关节指令</div>');
    var m = h('div', 'meta', root,
      '<b>Cosmos World Foundation Model Platform for Physical AI</b><br>Niket Agarwal 等<br>NVIDIA');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>为什么需要世界模型</div><div><span>02</span>视频数据整理</div>' +
      '<div><span>03</span>因果视频 tokenizer</div><div><span>04</span>扩散与自回归并列预训练</div>' +
      '<div><span>05</span>面向任务后训练</div>');
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 Cosmos</div><div class="title">输出是视频，不是控制命令</div>');
    var items = [
      [ACC, '① 数据 + tokenizer', '约 2000 万小时 → 约 1 亿段片段<br>因果 tokenizer：连续潜变量 / 离散 token'],
      [GOOD, '② 两条路线并列', '扩散 7B / 14B · 自回归 4B / 12B<br>词表 $8\\times 8\\times 8\\times 5\\times 5\\times 5 = 64000$'],
      [WARN, '③ 后训练只是示例', '相机位姿 · 机器人（Bridge 7 维动作）· 驾驶<br>上真机还要策略、控制器与安全验证']
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
      '<b>完整笔记 · 3 个交互图 · 官方源码参考</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
