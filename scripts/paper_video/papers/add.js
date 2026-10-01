// ADD 视频的片头 / 总结页（stage.html 在 add.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2505.04961',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:162px;font-weight:900;letter-spacing:16px;color:var(--demo-accent);line-height:1.08">ADD</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">对抗差分判别器</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">让判别器自动平衡多个跟踪目标</div>');
    var m = h('div', 'meta', root,
      '<b>Physics-Based Motion Imitation with Adversarial Differential Discriminators</b><br>Zhang, Bashkirov, Yang, Shi, Taylor, Peng<br>SFU · NVIDIA · SIGGRAPH Asia 2025');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>手写加权和的困境</div><div><span>02</span>改判 Δo：正样本只有一个</div>' +
      '<div><span>03</span>归一化 → 打分 → 奖励</div><div><span>04</span>自动平衡多个目标</div>' +
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 ADD</div><div class="title">判别器吃「差」，不是「对」</div>');
    var items = [
      [ACC, '① 差分判别', '$\\Delta o = o^{demo} - o$<br>正样本只有 $\\Delta o = 0$ 一个点'],
      [GOOD, '② 归一化 + 梯度惩罚', 'DiffNormalizer 拉平量纲<br>GP 加在负样本，防判别器缩成尖刺'],
      [WARN, '③ 自动权衡', '不再手写 $w_1 \\dots w_4$<br>判别器越来越严，自己换注意力']
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
