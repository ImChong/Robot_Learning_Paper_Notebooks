// TWIST2（Scalable, Portable, and Holistic Humanoid Data Collection System）视频的片头 / 总结页（stage.html 在 twist2.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2511.02832',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:118px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">TWIST2</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">便携、免动捕的人形数据采集系统</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">一台头显、一个人，就能边遥\u2060操\u2060作边采数据</div>');
    var m = h('div', 'meta', root,
      '<b>TWIST2: Scalable, Portable, and Holistic Humanoid Data Collection System</b><br>Yanjie Ze 等 · Amazon FAR 等 · ICRA&nbsp;2026');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十八条目录排成两列：左列 01–09、右列 10–18，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>缺一套采集系统</div><div><span>10</span>网络与跟踪</div>' +
      '<div><span>02</span>两层控制</div><div><span>11</span>不到 0.1 秒</div>' +
      '<div><span>03</span>35 维命令</div><div><span>12</span>一个人就能采</div>' +
      '<div><span>04</span>250 美元的脖子</div><div><span>13</span>长时程遥操作</div>' +
      '<div><span>05</span>PICO 加追踪器</div><div><span>14</span>表 II：采多快</div>' +
      '<div><span>06</span>身体重定向</div><div><span>15</span>表 III：拿掉哪样</div>' +
      '<div><span>07</span>手当夹爪</div><div><span>16</span>扩散策略</div>' +
      '<div><span>08</span>脖子重定向</div><div><span>17</span>WB-Dex 与 Kick-T</div>' +
      '<div><span>09</span>数据与奖励</div><div><span>18</span>局限与代码</div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '30px';
    toc.style.lineHeight = '1.45';
    var rows = toc.children;
    // 淡入按目录顺序：左列 01–09，再右列 10–18
    var order = [0, 2, 4, 6, 8, 10, 12, 14, 16, 1, 3, 5, 7, 9, 11, 13, 15, 17];
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 TWIST2</div><div class="title">便携地采，全身地学</div>');
    var items = [
      [ACC, '① 便携、免动捕，保留完整全身', 'PICO 头显 + 两个小腿追踪器，约 1000 美元<br>250 美元的脖子：第一视角立体视觉'],
      [WARN, '② 一个 35 维的命令接口', '根部给相对量 + 29 个关节角<br>一阶段 PPO 的通用跟踪器，遥\u2060操\u2060作和自主共用'],
      [GOOD, '③ 采得快，还能学自主', '18.5 分钟 98 条；拿掉脖子慢 66%<br>扩散策略：WB-Dex 33/54，Kick-T 6/7']
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
    /* 下一篇的主题（不写集数）：发布清单里 TWIST2 之后是 FALCON —— 上下身两个智能体，扛住手上的外力 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：FALCON —— 上下身两个智能体，在搬运东西时扛住手上的外力');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · G1 跟踪的三维复现</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
