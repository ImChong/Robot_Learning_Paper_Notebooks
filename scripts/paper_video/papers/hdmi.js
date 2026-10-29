// HDMI（HumanoiD iMitation for Interaction）视频的片头 / 总结页（stage.html 在 hdmi.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2509.16757',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:118px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">HDMI</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">从人类视频学人形全身交互</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">把物体和接触写进参考，机器人和物体一起跟</div>');
    var m = h('div', 'meta', root,
      '<b>HDMI: Learning Interactive Humanoid Whole&#8209;Body Control from Human Videos</b><br>Haoyang Weng 等 · 卡内基梅隆大学 · arXiv&nbsp;2025');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十八条目录排成两列：左列 01–09、右列 10–18，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>只跟身体不够</div><div><span>10</span>代码里的教师学生</div>' +
      '<div><span>02</span>三段流水线</div><div><span>11</span>上真机：动捕</div>' +
      '<div><span>03</span>从视频到参考</div><div><span>12</span>开门穿门 67 次</div>' +
      '<div><span>04</span>一帧参考</div><div><span>13</span>搬箱子与鞠躬</div>' +
      '<div><span>05</span>训练三件套</div><div><span>14</span>仿真 14 个任务</div>' +
      '<div><span>06</span>统一的物体表示</div><div><span>15</span>消融：交互奖励</div>' +
      '<div><span>07</span>残差动作</div><div><span>16</span>交互奖励管什么</div>' +
      '<div><span>08</span>交互奖励</div><div><span>17</span>消融：残差动作</div>' +
      '<div><span>09</span>奖励与终止</div><div><span>18</span>局限与之后</div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '30px';
    toc.style.lineHeight = '1.42';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 HDMI</div><div class="title">把物体写进参考</div>');
    var items = [
      [ACC, '① 机器人、物体、接触一起跟', '参考里写进物体的轨迹、接触信号和接触点<br>从单目视频里恢复动作，再人工标注'],
      [WARN, '② 三个统一的设计', '物体和接触点换到根部坐标系；残差动作<br>交互奖励：贴近接触点，力够就行'],
      [GOOD, '③ 一套框架，十几个任务', '宇树 G1 连续开门穿门 67 次<br>真机 6 个任务，仿真 14 个']
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
    /* 下一篇的主题（不写集数）：发布清单里 HDMI 之后是 VIRAL —— 特权教师蒸馏成只看 RGB 的学生，不再需要动作捕捉 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '28px'; next.style.padding = '12px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：VIRAL —— 特权教师蒸馏成只看 RGB 相机的学生');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · G1 搬箱子的 3D 回放</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
