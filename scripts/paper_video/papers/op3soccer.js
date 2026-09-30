// OP3 足球视频的片头 / 总结页（stage.html 在 op3soccer.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2304.13653',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:200px;font-weight:900;letter-spacing:10px;color:var(--demo-accent);line-height:1">OP3 ⚽</div>');
    a.style.top = '210px';
    var b = h('div', 'big', root, '<div style="font-size:66px;font-weight:900">小人形机器人学踢球</div>' +
      '<div style="font-size:40px;color:var(--text-secondary);margin-top:18px">深度 RL · 零样本 sim-to-real · 1 对 1</div>');
    b.style.top = '470px';
    var m = h('div', 'meta', root,
      '<b>Learning Agile Soccer Skills for a Bipedal Robot with Deep Reinforcement Learning</b><br>Haarnoja, Moran, Lever, Huang 等<br>Google DeepMind · Science Robotics 2024');
    m.style.top = '680px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>任务与机器人</div><div><span>02</span>阶段 1：两个技能教师</div>' +
      '<div><span>03</span>阶段 2：自适应蒸馏</div><div><span>04</span>自博弈的对手池</div>' +
      '<div><span>05</span>奖励与安全正则</div><div><span>06</span>零样本 sim-to-real</div>' +
      '<div><span>07</span>实验读数与边界</div>');
    toc.style.top = '1020px';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 OP3 足球</div><div class="title">两段训练 + 零样本上真机</div>');
    var items = [
      [ACC, '① 先分开训两个教师', '踢球技能 + 起身技能<br>直接端到端会滚着踢或站着不动'],
      [GOOD, '② 自适应蒸馏 + 自博弈', '回报低于阈值时 $\\lambda \\to 1$，超过后 $\\lambda \\to 0$<br>对手池只取前 1/4 的快照'],
      [WARN, '③ 少量针对性随机化', '系统辨识 5 个参数 + 5 个随机化轴<br>再加随机推搡，否则一两步就摔']
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
      '<b>完整笔记 · 手算例子 · 奖励与随机化表</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
    foot.style.top = '1225px';
    foot.style.textAlign = 'center';
    foot.style.fontSize = '32px';
    return {
      root: root,
      draw: function (st, t) {
        fadeUp(head, t, 0.0);
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.4, 5.8][k]); });
        fadeUp(foot, t, 8.0);
      }
    };
  }
};
