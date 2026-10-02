// ASE 视频的片头 / 总结页（stage.html 在 ase.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2205.01906',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:162px;font-weight:900;letter-spacing:16px;color:var(--demo-accent);line-height:1.08">ASE</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">对抗技能嵌入</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">把 187 段动捕压成一个技能空间</div>');
    var m = h('div', 'meta', root,
      '<b>ASE: Large-Scale Reusable Adversarial Skill Embeddings for Physically Simulated Characters</b><br>Peng, Guo, Halper, Levine, Fidler<br>UC Berkeley · NVIDIA · U of Toronto<br>SIGGRAPH 2022 · ACM TOG');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>技能被绑死</div><div><span>02</span>技能 = 球面上的方向</div>' +
      '<div><span>03</span>latent collapse</div><div><span>04</span>encoder：把 z 逼回动作</div>' +
      '<div><span>05</span>diversity：空间要等速</div><div><span>06</span>训练闭环与下游</div>');
    toc.style.fontSize = '31px';
    toc.style.lineHeight = '1.55';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [26, 40, 40], V.SAFE_TOP, V.contentBottom());
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
      [GOOD, '② encoder 奖励', '$r = -\\log(1 - D) + 0.5\\, r_{enc}$<br>逼策略真的用上 $z$，防止塌缩'],
      [WARN, '③ diversity', '动作差异 ∝ latent 差异，空间等速<br>加在 actor loss 上，不进奖励']
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
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.2, 5.4][k]); });
        fadeUp(foot, t, 9.0);
        foot.style.transform = 'none';  // 紧挨字幕，只淡入不上滑
      }
    };
  }
};
