// PHC 视频的片头 / 总结页（stage.html 在 phc.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2305.06456',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:250px;font-weight:900;letter-spacing:16px;color:var(--demo-accent);line-height:1">PHC</div>');
    a.style.top = '190px';
    var b = h('div', 'big', root, '<div style="font-size:70px;font-weight:900">永续人形控制</div>' +
      '<div style="font-size:40px;color:var(--text-secondary);margin-top:18px">一万条动作，摔了也能爬起来接着演</div>');
    b.style.top = '470px';
    var m = h('div', 'meta', root,
      '<b>Perpetual Humanoid Control for Real-time Simulated Avatars</b><br>Luo, Cao, Winkler, Kitani, Xu<br>CMU · Meta Reality Labs · ICCV 2023');
    m.style.top = '680px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>DeepMimic 之后的三堵墙</div><div><span>02</span>PMCP：加容量，不是加轮次</div>' +
      '<div><span>03</span>Composer：连续混合</div><div><span>04</span>摔倒恢复：FAIL 变中间态</div>' +
      '<div><span>05</span>噪声输入：换成关键点</div><div><span>06</span>两阶段训练闭环</div>');
    toc.style.top = '1005px';
    toc.style.lineHeight = '1.6';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 PHC</div><div class="title">在一万条动作里一直活着</div>');
    var items = [
      [ACC, '① PMCP 渐进扩容', '旧列冻结，新列只打难例<br>加的是容量，不会遗忘'],
      [GOOD, '② Composer + 恢复原语', '$a = \\sum_i w_i a_i$ 连续混合<br>摔倒不 reset，爬起来接着模仿'],
      [WARN, '③ 关键点输入', '误差不沿运动链放大<br>$98.9\\% \\to 98.7\\%$，换来吃视频 / VR']
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
