// FALCON（Learning Force-Adaptive Humanoid Loco-Manipulation）视频的片头 / 总结页（stage.html 在 falcon.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2505.06776',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:118px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">FALCON</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">力自适应的人形移动操作</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">手上被拉、被压，照样走得稳、跟得准</div>');
    var m = h('div', 'meta', root,
      '<b>FALCON: Learning Force-Adaptive Humanoid Loco-Manipulation</b><br>Y. Zhang 等 · CMU、Field&nbsp;AI、日产 · L4DC&nbsp;2026');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十七条目录排成两列：左列 01–09、右列 10–17，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>手上有力</div><div><span>10</span>奖励与随机化</div>' +
      '<div><span>02</span>两条老路</div><div><span>11</span>表 1：六个基线</div>' +
      '<div><span>03</span>统一的目标空间</div><div><span>12</span>不看力矩上限</div>' +
      '<div><span>04</span>两个智能体</div><div><span>13</span>为什么训得快</div>' +
      '<div><span>05</span>隐式补偿</div><div><span>14</span>真机 1.2 kg</div>' +
      '<div><span>06</span>手腕能吃多大力</div><div><span>15</span>推车、开门</div>' +
      '<div><span>07</span>三个方向怎么分</div><div><span>16</span>自主搬箱</div>' +
      '<div><span>08</span>力一点点加上去</div><div><span>17</span>局限与代码</div>' +
      '<div><span>09</span>施力点随机</div><div></div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '30px';
    toc.style.lineHeight = '1.45';
    var rows = toc.children;
    // 淡入按目录顺序：左列 01–09，再右列 10–17
    var order = [0, 2, 4, 6, 8, 10, 12, 14, 16, 1, 3, 5, 7, 9, 11, 13, 15];
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [24, 34, 34], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        order.forEach(function (idx, k) { fadeUp(rows[idx], t, 6.6 + k * 0.1, 0.5); });
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 FALCON</div><div class="title">上下身分开学，力一点点加</div>');
    var items = [
      [WARN, '① 两个智能体：奖励分开、观测共享', '下身 15 维、上身 14 维，读同一份 575 维观测<br>上身输出的是残差：把目标角往反方向挪'],
      [ACC, '② 按力矩上限算的三维力课程', '雅可比 + 力矩上限算出每个方向最多能加多大的力<br>狄利克雷分配三个方向，课程系数从小往大加'],
      [GOOD, '③ 不用力传感器，也不估计力', '大力档上身误差 0.37，约是单策略的一半<br>G1、T1 上拉车、开门、搬重物']
    ];
    var pts = items.map(function (it) {
      var p = h('div', 'pt', root);
      p.style.fontSize = '29px'; p.style.padding = '10px 30px';
      p.style.borderLeft = '10px solid ' + it[0];
      var n = h('div', 'n', p, it[1]); n.style.color = it[0];
      var body = h('div', '', p);
      it[2].split('<br>').forEach(function (line, q) {
        if (q) body.appendChild(document.createElement('br'));
        var span = h('span', '', body); K.rich(span, line);
        if (q) { span.style.fontSize = '26px'; span.style.color = 'var(--text-secondary)'; }
      });
      return p;
    });
    /* 下一篇的主题（不写集数）：发布清单里 FALCON 之后是 HDMI —— 把物体的位姿和接触点也写进跟踪目标，从人类视频学交互 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '28px'; next.style.padding = '12px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：HDMI —— 从人类视频学开门、搬箱：把物体的位姿和接触点也写进跟踪目标');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · G1 在 MuJoCo 里的 3D 复现</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
    foot.style.textAlign = 'center';
    foot.style.fontSize = '27px';
    foot.style.padding = '16px 30px';
    return {
      root: root,
      draw: function (st, t) {
        V.stack(pts.concat([next, foot]), [14, 14, 20, 20], V.SAFE_TOP + 148, V.contentBottom());
        fadeUp(head, t, 0.0);
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.4, 5.8][k]); });
        fadeUp(next, t, 7.0);
        fadeUp(foot, t, 9.5);
        foot.style.transform = 'none';  // 紧挨字幕，只淡入不上滑
      }
    };
  }
};
