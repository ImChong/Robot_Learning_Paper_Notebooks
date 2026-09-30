// GMR 视频的片头 / 总结页（stage.html 在 gmr.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2510.02252',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:260px;font-weight:900;letter-spacing:6px;color:var(--demo-accent);line-height:1">GMR</div>');
    a.style.top = '230px';
    var b = h('div', 'big', root, '<div style="font-size:70px;font-weight:900">Retargeting Matters</div>' +
      '<div style="font-size:40px;color:var(--text-secondary);margin-top:18px">通用动作重定向：CPU 上的两阶段约束 IK</div>');
    b.style.top = '470px';
    var m = h('div', 'meta', root,
      '<b>Retargeting Matters: General Motion Retargeting for Humanoid Motion Tracking</b><br>João Pedro Araújo、Yanjie Ze、Pei Xu、Jiajun Wu、C. Karen Liu<br>Stanford University · arXiv 2025');
    m.style.top = '680px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>retargeting 被当成前处理脚本</div><div><span>02</span>一条管线，两头都能换</div>' +
      '<div><span>03</span>论文的五步显式流程</div><div><span>04</span>非均匀局部缩放</div>' +
      '<div><span>05</span>两阶段约束 IK</div><div><span>06</span>定量论据</div>' +
      '<div><span>07</span>闭环与源码落点</div>');
    toc.style.top = '1010px';
    toc.style.lineHeight = '1.55';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 7.0 + k * 0.35, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 GMR</div><div class="title">翻译没做好，后面训得再久也追不上</div>');
    var items = [
      [ACC, '① 一条通用管线', '5 种格式 × 18 款机器人 = 90 条通路<br>CPU 上 15.4 / 25.0 ms/帧，不装 CUDA'],
      [GOOD, '② 缩放 + 两阶段 IK', '非均匀缩放：示意算例残差 13.7 cm → 0<br>先锁主干再修四肢；单帧最多转 18°'],
      [WARN, '③ 数据说话', 'LAFAN1 21 段只有 3 段全对（14.3%）<br>换初始帧成功率能差 50+ 个百分点']
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
      '<b>完整笔记 · 具体算例 · GMR 源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
