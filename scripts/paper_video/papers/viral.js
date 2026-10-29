// VIRAL（Visual Sim-to-Real at Scale for Humanoid Loco-Manipulation）视频的片头 / 总结页（stage.html 在 viral.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2511.15200',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:118px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">VIRAL</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">大规模视觉 Sim-to-Real</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">只用一个 RGB 相机，人形自主走、放、抓、转</div>');
    var m = h('div', 'meta', root,
      '<b>VIRAL: Visual Sim-to-Real at Scale for Humanoid Loco-Manipulation</b><br>Tairan He 等 · NVIDIA、CMU 等 · CVPR&nbsp;2026');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十八条目录排成两列：左列 01–09、右列 10–18，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>缺自主的移动操作</div><div><span>10</span>DAgger 与 BC</div>' +
      '<div><span>02</span>教师 → 学生</div><div><span>11</span>教师的算力</div>' +
      '<div><span>03</span>走、放、抓、转</div><div><span>12</span>平铺渲染</div>' +
      '<div><span>04</span>输出 HOMIE 命令</div><div><span>13</span>手指辨识</div>' +
      '<div><span>05</span>按阶段的奖励</div><div><span>14</span>相机对齐</div>' +
      '<div><span>06</span>增量动作</div><div><span>15</span>视觉随机化</div>' +
      '<div><span>07</span>参考状态初始化</div><div><span>16</span>真机 54 / 59</div>' +
      '<div><span>08</span>学生只看一张图</div><div><span>17</span>泛化</div>' +
      '<div><span>09</span>视觉骨干</div><div><span>18</span>四个覆盖缺口</div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '30px';
    toc.style.lineHeight = '1.4';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 VIRAL</div><div class="title">特权教师 → 纯视觉学生 → 真机</div>');
    var items = [
      [WARN, '① 特权教师：输出 HOMIE 命令的增量', '奖励按阶段开关，从示范的某一帧开始<br>16 张 GPU，PPO'],
      [ACC, '② 视觉学生：只看一张 RGB 图', 'DAgger 与 BC 各一半，照教师的动作学<br>64 张 GPU 平铺渲染'],
      [GOOD, '③ 上真机：两头对齐', '手指辨识、相机对齐 + 大规模视觉随机化<br>59 轮成功 54 轮，每轮比专家快约 1 s']
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
    /* 下一篇的主题（不写集数）：发布清单里 VIRAL 之后是 DoorMan —— 同一批机构、同样只用 RGB、以 HOMIE 为底层开门 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '28px'; next.style.padding = '12px 30px';
    next.style.borderStyle = 'dashed';
    /* 「开门、穿过门」用 word joiner 连成一块，不在中间断行 */
    K.rich(next, '**下一篇**：DoorMan —— 同样只用 RGB、以 HOMIE 为底层，让人形' + '自己开门、穿过门'.split('').join('⁠'));
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · G1 示范的 3D 重渲</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
