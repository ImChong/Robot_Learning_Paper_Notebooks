// ToddlerBot 视频的片头 / 总结页（stage.html 在 toddlerbot.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2502.00893',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:112px;font-weight:900;letter-spacing:4px;color:var(--demo-accent);line-height:1.08;white-space:nowrap">ToddlerBot</div>');
    var b = h('div', 'big', root, '<div style="font-size:46px;font-weight:900;line-height:1.2">开源、机器学习兼容的小型人形平台</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">校准、数字孪生、遥操作采集与部署，连成一整套工具链</div>');
    var m = h('div', 'meta', root,
      '<b>ToddlerBot: Open-Source ML-Compatible Humanoid Platform for Loco-Manipulation</b><br>Shi、Wang、Song、Liu · Stanford · CoRL&nbsp;2025（arXiv 2025.02，v4 2025.10）');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十二条目录排成两列：单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>研究要的平台</div><div><span>07</span>9 参数执行器模型</div>' +
      '<div><span>02</span>30 个自由度</div><div><span>08</span>遥操作与两层 PD</div>' +
      '<div><span>03</span>可复现是硬约束</div><div><span>09</span>关键帧与 RL 行走</div>' +
      '<div><span>04</span>功率因子选电机</div><div><span>10</span>扩散策略</div>' +
      '<div><span>05</span>零点校准</div><div><span>11</span>实验与表 7</div>' +
      '<div><span>06</span>台架辨识</div><div><span>12</span>复刻与局限</div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1.08fr';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 ToddlerBot</div><div class="title">平台也是采数据的工具</div>');
    var items = [
      [GOOD, '① 可复现当硬约束', '全 3D 打印、现成 Dynamixel、不到 6000 美元<br>一个人在家就能造；没做过硬件的学生 3 天装出第二台'],
      [ACC, '② 数字孪生：校零点、台架测、chirp 拟合', '卡具一分钟校零；阻尼、摩擦损耗、转子惯量上台架测<br>9 参数执行器模型平均误差 1.3°，关键帧和 RL 策略零样本上真机'],
      [WARN, '③ 遥操作：领导臂 + 掌机 + 两层 PD', '20 分钟采 60 条，扩散策略 90% / 75%<br>30 个自由度、功率因子 2.74 最接近人的 2.22']
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
    /* 下一篇的主题（不写集数）：发布清单里 ToddlerBot 之后是 HumanML3D / GMR —— 人类动作数据从哪里来、怎样搬到机器人身上 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：HumanML3D —— 人类动作数据从哪里来、怎样配上文字');
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
