// Berkeley Humanoid 视频的片头 / 总结页（stage.html 在 berkeley_humanoid.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2407.21781',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:88px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08;white-space:nowrap">Berkeley Humanoid</div>');
    var b = h('div', 'big', root, '<div style="font-size:48px;font-weight:900;line-height:1.2">面向学习型控制的人形研究平台</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">从硬件上缩小仿真与真机的差距，最简的策略就能走出实验室</div>');
    var m = h('div', 'meta', root,
      '<b>Berkeley Humanoid: A Research Platform for Learning-based Control</b><br>Liao、Zhang、Huang、Huang、Li、Sreenath · UC&nbsp;Berkeley · ICRA&nbsp;2025（arXiv 2024.07）');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十二条目录排成两列：单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>差距从哪来</div><div><span>07</span>拟人的腿</div>' +
      '<div><span>02</span>孩子大小的人形</div><div><span>08</span>最简的控制器</div>' +
      '<div><span>03</span>执行器就是关节</div><div><span>09</span>辨识惯量与摩擦</div>' +
      '<div><span>04</span>四种执行器</div><div><span>10</span>随机化：窄与宽</div>' +
      '<div><span>05</span>EtherCAT 与时序</div><div><span>11</span>走出实验室</div>' +
      '<div><span>06</span>可靠又便宜</div><div><span>12</span>仿真与真机对比</div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1.08fr 1fr';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 Berkeley Humanoid</div><div class="title">差距在硬件上缩小</div>');
    var items = [
      [ACC, '① 让仿真好算、算得准', '去掉弹簧和闭链，执行器直接就是关节<br>转子惯量 × 81 进质量矩阵；EtherCAT 延迟 0.5–2 ms'],
      [GOOD, '② 辨识得准，随机化才敢窄', '转子惯量读 CAD、摩擦单独测；不随机化电机强度和 PD 增益<br>地面摩擦、外力这类环境量照样给宽'],
      [WARN, '③ 最简的策略就够了', '48 维当下观测 + MLP + PPO，没有历史<br>跟踪误差：仿真 0.051、真机 0.058 m/s；16 kg、约 1 万美元']
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
    /* 下一篇的主题（不写集数）：发布清单里 Berkeley Humanoid 之后是 ToddlerBot */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：ToddlerBot —— 校准、数字孪生、遥操作采集一条龙');
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
