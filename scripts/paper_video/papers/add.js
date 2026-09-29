// ADD 视频的片头 / 总结页（stage.html 在 add.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2505.04961',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:250px;font-weight:900;letter-spacing:16px;color:var(--demo-accent);line-height:1">ADD</div>');
    a.style.top = '190px';
    var b = h('div', 'big', root, '<div style="font-size:70px;font-weight:900">对抗差分判别器</div>' +
      '<div style="font-size:40px;color:var(--text-secondary);margin-top:18px">让判别器自动平衡多个跟踪目标</div>');
    b.style.top = '470px';
    var m = h('div', 'meta', root,
      '<b>Physics-Based Motion Imitation with Adversarial Differential Discriminators</b><br>Zhang, Bashkirov, Yang, Shi, Taylor, Peng<br>SFU · NVIDIA · SIGGRAPH Asia 2025');
    m.style.top = '680px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>手写加权和的困境</div><div><span>02</span>改判 Δo：正样本只有一个</div>' +
      '<div><span>03</span>归一化 → 打分 → 奖励</div><div><span>04</span>自动平衡多个目标</div>' +
      '<div><span>05</span>训练闭环</div>');
    toc.style.top = '1010px';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
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
      [GOOD, '② 先归一化', 'DiffNormalizer 拉平量纲<br>判别器越来越严，自带课程'],
      [WARN, '③ 自动权衡', '不再手写 $w_1 \\dots w_4$<br>每个阶段自己换注意力']
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
      '<b>完整笔记 · 3 个交互演示 · MimicKit 源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
    foot.style.top = '1225px';
    foot.style.textAlign = 'center';
    foot.style.fontSize = '32px';
    return {
      root: root,
      draw: function (st, t) {
        fadeUp(head, t, 0.0);
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.4, 5.8][k]); });
        fadeUp(foot, t, 9.0);
      }
    };
  }
};
