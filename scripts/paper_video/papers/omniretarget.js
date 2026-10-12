// OmniRetarget 视频的片头 / 总结页（stage.html 在 omniretarget.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2509.26633',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:118px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">OmniRetarget</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">保住交互的重定向</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">交互网格 + 硬约束 + 一条演示扩成一族</div>');
    var m = h('div', 'meta', root,
      '<b>OmniRetarget: Interaction-Preserving Data Generation for Humanoid Whole-Body Loco-Manipulation and Scene Interaction</b><br>Lujie Yang、Xiaoyu Huang、Zhen Wu 等 · Amazon FAR · ICRA 2026');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十二条目录排成两列：单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>交互丢了</div><div><span>07</span>别整体平移</div>' +
      '<div><span>02</span>交互网格</div><div><span>08</span>地形与本体</div>' +
      '<div><span>03</span>Laplacian 坐标</div><div><span>09</span>极简强化学习</div>' +
      '<div><span>04</span>四条硬约束</div><div><span>10</span>表 II</div>' +
      '<div><span>05</span>序贯 SOCP</div><div><span>11</span>下游成功率</div>' +
      '<div><span>06</span>一条扩成六条</div><div><span>12</span>真机与局限</div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '31px';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 OmniRetarget</div><div class="title">参考干净了，强化学习才能极简</div>');
    var items = [
      [ACC, '① 保住相对位置', '人、箱子、地面连成交互网格<br>最小化 Laplacian 形变能，只管相对关系'],
      [GOOD, '② 写成硬约束', '不穿透 · 关节限位 · 脚不打滑<br>序贯 SOCP：每帧线性化 + 信赖域 0.2'],
      [WARN, '③ 一条演示扩成一族', '箱子位姿 / 形状、平台高度、机器人本体<br>5 项奖励 + 4 项随机化，真机搬箱、爬台、翻墙']
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
    /* 下一篇的主题（不写集数）：发布清单里 OmniRetarget 之后是 Expressive WBC —— 一边走一边用上半身跟着人做动作 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：Expressive WBC —— 边走边用上半身跟着人做动作');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · 官方代码的复现实验</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
