// SONIC 视频的片头 / 总结页（stage.html 在 sonic.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2511.07820',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:190px;font-weight:900;letter-spacing:6px;color:var(--demo-accent);line-height:1.08">SONIC</div>');
    var b = h('div', 'big', root, '<div style="font-size:64px;font-weight:900;line-height:1.2">规模化运动跟踪</div>' +
      '<div style="font-size:38px;color:var(--text-secondary);margin-top:14px">把 motion tracking 当基础任务放大</div>');
    var m = h('div', 'meta', root,
      '<b>SONIC: Supersizing Motion Tracking for Natural Humanoid Whole-Body Control</b><br>Zhengyi Luo、Ye Yuan、Jim Fan、Yuke Zhu 等<br>NVIDIA Research · arXiv 2025');
    m.style.fontSize = '32px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>任务选错了</div><div><span>02</span>三轴一起放大</div>' +
      '<div><span>03</span>Universal token space</div><div><span>04</span>五项 aux loss 焊住潜空间</div>' +
      '<div><span>05</span>实时 Kinematic Planner</div><div><span>06</span>System-1 + System-2</div>' +
      '<div><span>07</span>闭环与源码落点</div>');
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 SONIC</div><div class="title">任务选对了，规模才管用</div>');
    var items = [
      [ACC, '① 换任务，再放大', '动作跟踪：逐帧监督、不写 reward<br>数据 0.4 M → 100 M+ 帧，数据轴收益最大'],
      [GOOD, '② 一个 token 空间', '三路 encoder → 一个 FSQ：$2 \\times 32 = 64$ 维<br>每帧 320 bit，五项 aux loss 焊住'],
      [WARN, '③ 上层只说 teleop 语言', '规划器 0.8–2.4 s 片段、100 ms 重规划<br>300 条数据微调 VLA，20 次成功 19 次']
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
      '<b>完整笔记 · 具体算例 · gear_sonic 源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
