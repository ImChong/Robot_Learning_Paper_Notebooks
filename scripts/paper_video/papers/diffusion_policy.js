// Diffusion Policy 视频的片头 / 总结页（stage.html 在 diffusion_policy.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2303.04137',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:72px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">Diffusion Policy</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">动作扩散策略</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">让机器人从噪声里生成整段动作</div>');
    var m = h('div', 'meta', root,
      '<b>Diffusion Policy: Visuomotor Policy Learning via Action Diffusion</b><br>Chi, Feng, Du, Xu, Cousineau, Burchfiel, Song<br>Columbia · MIT · TRI · RSS 2023');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>平均动作会撞上障碍</div><div><span>02</span>动作是条件扩散过程</div>' +
      '<div><span>03</span>Action chunking</div><div><span>04</span>视觉条件 + FiLM</div>' +
      '<div><span>05</span>DDIM：百步训练，十几步部署</div><div><span>06</span>Receding horizon</div>' +
      '<div><span>07</span>为什么成了 IL 标准</div>');
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 Diffusion Policy</div><div class="title">学分布，不是学均值</div>');
    var items = [
      [ACC, '① 条件扩散', '学 $p(A \\mid O)$，不回归 $\\mathbb{E}[a \\mid o]$<br>多峰演示不会被平均成撞墙的直线'],
      [GOOD, '② chunk 16 / 执行 8', '一次去噪整条 $H = 16$ 步，只执行前 $T_a = 8$ 步<br>模式在时间上不串味，还能滚动重规划'],
      [WARN, '③ DDIM + FiLM', '视觉特征用 FiLM 焊进去噪网络<br>数百步压到 10–20 步，才进得了控制回路']
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
        if (q) { span.style.fontSize = '34px'; span.style.color = 'var(--text-secondary)'; }
      });
      return p;
    });
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · 源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
