// OP3 足球视频的片头 / 总结页（stage.html 在 op3soccer.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2304.13653',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    // 封面大标题只留纯文字「OP3」（不放足球 emoji）
    var a = h('div', 'big', root, '<div style="font-size:150px;font-weight:900;letter-spacing:12px;color:var(--demo-accent);line-height:1.08">OP3</div>');
    var b = h('div', 'big', root, '<div style="font-size:62px;font-weight:900;line-height:1.2">让双足机器人学会敏捷踢球</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">技能教师 + 自适应蒸馏 + 自博弈，零样本上真机</div>');
    var m = h('div', 'meta', root,
      '<b>Learning Agile Soccer Skills for a Bipedal Robot with Deep Reinforcement Learning</b><br>Haarnoja 等 · DeepMind · Science Robotics 2024');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十二条目录排成两列：单列的话封面上最后一行会落到 3:4 裁剪线以下（字号缩到 32px 也放不下） */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>为什么是足球</div><div><span>07</span>奖励与安全正则</div>' +
      '<div><span>02</span>一步控制</div><div><span>08</span>零样本上真机</div>' +
      '<div><span>03</span>踢球教师</div><div><span>09</span>对比脚本控制器</div>' +
      '<div><span>04</span>起身教师</div><div><span>10</span>定位球与对手</div>' +
      '<div><span>05</span>按状态蒸馏</div><div><span>11</span>嵌入与价值函数</div>' +
      '<div><span>06</span>自博弈对手池</div><div><span>12</span>局限与之后</div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '31px';
    toc.style.lineHeight = '1.55';
    var rows = toc.children;
    // 淡入按目录顺序：左列 01–06，再右列 07–12
    var order = [0, 2, 4, 6, 8, 10, 1, 3, 5, 7, 9, 11];
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [24, 34, 34], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        order.forEach(function (idx, k) { fadeUp(rows[idx], t, 6.0 + k * 0.12, 0.5); });
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住这篇</div><div class="title">两段训练 + 少而准的 sim-to-real</div>');
    var items = [
      [ACC, '① 先分开训两个技能教师', '踢球（对手开场就摔）+ 起身（脚本关键姿态）<br>直接端到端会滚着拨球，或站着不动'],
      [GOOD, '② 按状态蒸馏 + 自博弈', '回报低于阈值 $\\lambda \\to 1$，超过后 $\\lambda \\to 0$<br>对手池 = 前 1/4 快照 + 一个未训练对手'],
      [WARN, '③ 少而准的 sim-to-real', '5 个参数的辨识 + 5 类随机化 + 随机推搡<br>真机走快 181%、转快 302%、起身用时少 63%']
    ];
    var pts = items.map(function (it) {
      var p = h('div', 'pt', root);
      p.style.fontSize = '33px'; p.style.padding = '14px 30px';
      p.style.borderLeft = '10px solid ' + it[0];
      var n = h('div', 'n', p, it[1]); n.style.color = it[0];
      var body = h('div', '', p);
      it[2].split('<br>').forEach(function (line, q) {
        if (q) body.appendChild(document.createElement('br'));
        var span = h('span', '', body); K.rich(span, line);
        if (q) { span.style.fontSize = '30px'; span.style.color = 'var(--text-secondary)'; }
      });
      return p;
    });
    /* 下一篇的主题（不写集数）：发布清单里 OP3 足球之后是 LCP */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：LCP —— 不加输出滤波，用梯度惩罚让策略自己变平滑');
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
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.4, 5.8][k]); });
        fadeUp(next, t, 7.0);
        fadeUp(foot, t, 9.5);
        foot.style.transform = 'none';  // 紧挨字幕，只淡入不上滑
      }
    };
  }
};
