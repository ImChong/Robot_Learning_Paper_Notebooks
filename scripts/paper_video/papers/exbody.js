// ExBody（Expressive Whole-Body Control）视频的片头 / 总结页（stage.html 在 exbody.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2402.16796',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:118px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">ExBody</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">人形机器人的表达性全身控制</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">上半身照着人做，两条腿只跟速度</div>');
    var m = h('div', 'meta', root,
      '<b>Expressive Whole-Body Control for Humanoid Robots</b><br>Xuxin Cheng、Yandong Ji 等 · UC San Diego · RSS&nbsp;2024');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十三条目录排成两列：左列 01–07、右列 08–13，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>真机的三道坎</div><div><span>08</span>五项跟踪奖励</div>' +
      '<div><span>02</span>目标拆两半</div><div><span>09</span>正则与训练</div>' +
      '<div><span>03</span>看得见什么</div><div><span>10</span>跟得怎么样</div>' +
      '<div><span>04</span>挑出 780 段</div><div><span>11</span>随机命令与全身</div>' +
      '<div><span>05</span>数据自带分布</div><div><span>12</span>加上 AMP</div>' +
      '<div><span>06</span>直接抄关节角</div><div><span>13</span>真机与局限</div>' +
      '<div><span>07</span>从数据抽起点</div><div></div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '31px';
    toc.style.lineHeight = '1.5';
    var rows = toc.children;
    // 淡入按目录顺序：左列 01–07，再右列 08–13
    var order = [0, 2, 4, 6, 8, 10, 12, 1, 3, 5, 7, 9, 11];
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 ExBody</div><div class="title">不要求一模一样，才走得稳</div>');
    var items = [
      [GOOD, '① 目标拆两半', '上半身：9 个关节角 + 6 个关键点<br>整个身体：速度、横滚俯仰偏航、高度；腿不跟参考'],
      [ACC, '② 人的数据当三样东西用', 'CMU 780 段 · 直接抄关节角（指数映射）<br>随机初始化 + 目标分布 + 五项跟踪奖励'],
      [WARN, '③ 只看真机拿得到的', '不看线速度、高度、绝对偏航<br>速度跟踪胜过随机命令、全身跟踪、加 AMP']
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
    /* 下一篇的主题（不写集数）：发布清单里 ExBody 之后是 H2O —— 人在摄像头前做动作，机器人实时跟着做 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：H2O —— 人在摄像头前做动作，机器人实时跟着做');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · 重定向的复现</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
