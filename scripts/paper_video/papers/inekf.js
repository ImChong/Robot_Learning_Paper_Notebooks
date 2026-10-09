// 接触辅助 InEKF 视频的片头 / 总结页（stage.html 在 inekf.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '1904.09251',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:162px;font-weight:900;letter-spacing:16px;color:var(--demo-accent);line-height:1.08">InEKF</div>');
    var b = h('div', 'big', root, '<div style="font-size:48px;font-weight:900;line-height:1.2">接触辅助的不变扩展卡尔曼滤波</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">只用 IMU、编码器和接触开关，估计身体的姿态和速度</div>');
    var m = h('div', 'meta', root,
      '<b>Contact-Aided Invariant Extended Kalman Filtering for Robot State Estimation</b><br>Hartley、Ghaffari、Eustice、Grizzle · 密歇根大学 · IJRR 2020（会议版 RSS 2018）');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十二条目录排成两列：单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>为什么要状态估计</div><div><span>07</span>看不见的方向</div>' +
      '<div><span>02</span>IMU、接触与运动学</div><div><span>08</span>不确定性的形状</div>' +
      '<div><span>03</span>线性化点选错</div><div><span>09</span>IMU 零偏</div>' +
      '<div><span>04</span>一个矩阵装下状态</div><div><span>10</span>增删接触点</div>' +
      '<div><span>05</span>误差不看轨迹</div><div><span>11</span>收敛：图 3、8</div>' +
      '<div><span>06</span>运动学校正</div><div><span>12</span>Cassie 实测</div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1.12fr 1fr';
    toc.style.columnGap = '20px';
    toc.style.fontSize = '29px';
    toc.style.lineHeight = '1.5';
    var rows = toc.children;
    // 淡入按目录顺序：左列 01–06，再右列 07–12
    var order = [0, 2, 4, 6, 8, 10, 1, 3, 5, 7, 9, 11];
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [24, 34, 34], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        order.forEach(function (idx, k) { fadeUp(rows[idx], t, 6.6 + k * 0.12, 0.5); });
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 InEKF</div><div class="title">换一个误差的定义</div>');
    var items = [
      [ACC, '① 一个矩阵李群装下全部状态', '朝向、速度、位置、每个触地点拼成一个矩阵<br>误差 = 把真值整体挪到估计值的那一下'],
      [GOOD, '② 误差方程和估计值无关（不估零偏时）', '$A$ 只含重力，$H = [0, 0, -I, I]$；图 4（读图）：QEKF 约 25、InEKF 0<br>±30° 的初值，约 0.3 s 收拢（读图 3）'],
      [WARN, '③ 看不见的就老实说看不见', '航向 + 位置 4 个方向不可观；不确定性弯成香蕉<br>动捕终点误差 < 5%，200 m 一直在人行道上']
    ];
    var pts = items.map(function (it) {
      var p = h('div', 'pt', root);
      p.style.fontSize = '31px'; p.style.padding = '12px 30px';
      p.style.borderLeft = '10px solid ' + it[0];
      var n = h('div', 'n', p, it[1]); n.style.color = it[0];
      var body = h('div', '', p);
      it[2].split('<br>').forEach(function (line, q) {
        if (q) body.appendChild(document.createElement('br'));
        var span = h('span', '', body); K.rich(span, line);
        if (q) { span.style.fontSize = '28px'; span.style.color = 'var(--text-secondary)'; }
      });
      return p;
    });
    /* 下一篇的主题（不写集数）：发布清单里 InEKF 之后是 Berkeley Humanoid */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：Berkeley Humanoid —— 硬件、执行器与仿真一起设计');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · 论文数字逐项对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
    foot.style.textAlign = 'center';
    foot.style.fontSize = '27px';
    foot.style.padding = '16px 30px';
    return {
      root: root,
      draw: function (st, t) {
        V.stack(pts.concat([next, foot]), [14, 14, 20, 20], V.SAFE_TOP + 148, V.contentBottom());
        fadeUp(head, t, 0.0);
        pts.forEach(function (p, k) { fadeUp(p, t, [0.8, 2.6, 4.6][k]); });
        fadeUp(next, t, 7.0);
        fadeUp(foot, t, 9.5);
        foot.style.transform = 'none';  // 紧挨字幕，只淡入不上滑
      }
    };
  }
};
