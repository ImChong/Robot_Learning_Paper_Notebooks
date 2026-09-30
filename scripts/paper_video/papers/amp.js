// AMP 视频的片头 / 总结页（stage.html 在 amp.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2104.02180',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:162px;font-weight:900;letter-spacing:16px;color:var(--demo-accent);line-height:1.08">AMP</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">对抗运动先验</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">让判别器替你写风格奖励</div>');
    var m = h('div', 'meta', root,
      '<b>Adversarial Motion Priors for Stylized Physics-Based Character Control</b><br>Peng, Ma, Abbeel, Levine, Kanazawa<br>UC Berkeley · SIGGRAPH 2021');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>逐帧 vs 分布</div><div><span>02</span>判别器 loss</div>' +
      '<div><span>03</span>LSGAN 风格奖励</div><div><span>04</span>换数据集就换风格</div>' +
      '<div><span>05</span>训练闭环</div>');
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 AMP</div><div class="title">匹配分布，而不是逐帧</div>');
    var items = [
      [ACC, '① 判别器看转移', '只问 $(s_t, s_{t+1})$ 像不像数据<br>不要相位，多段片段能混用'],
      [GOOD, '② LSGAN 风格奖励', '$r^S = \\max[0,\\ 1 - 0.25(D - 1)^2]$<br>有上下界，梯度不爆炸'],
      [WARN, '③ 数据即风格', '任务奖励不变，只换数据集<br>Locomotion / Zombie / Stealthy']
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
      '<b>完整笔记 · 4 个交互演示 · MimicKit 源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
    foot.style.textAlign = 'center';
    foot.style.fontSize = '29px';
    foot.style.padding = '22px 34px';
    return {
      root: root,
      draw: function (st, t) {
        V.stack(pts.concat([foot]), [20, 20, 30], V.SAFE_TOP + 148, V.contentBottom());
        fadeUp(head, t, 0.0);
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.2, 5.4][k]); });
        fadeUp(foot, t, 9.0);
        foot.style.transform = 'none';  // 紧挨字幕，只淡入不上滑
      }
    };
  }
};
