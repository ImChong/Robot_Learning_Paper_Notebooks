// HOVER（Versatile Neural Whole-Body Controller for Humanoid Robots）视频的片头 / 总结页（stage.html 在 hover.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2410.21229',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:118px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">HOVER</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">人形机器人的多模式全身控制器</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">一套权重，换掩码就换模式</div>');
    var m = h('div', 'meta', root,
      '<b>HOVER: Versatile Neural Whole-Body Controller for Humanoid Robots</b><br>Tairan He 等 · NVIDIA、CMU 等 · ICRA&nbsp;2025');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十六条目录排成两列：左列 01–08、右列 09–16，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>每篇一套接口</div><div><span>09</span>稀疏掩码</div>' +
      '<div><span>02</span>全身模仿是底座</div><div><span>10</span>DAgger 蒸馏</div>' +
      '<div><span>03</span>三种目标</div><div><span>11</span>表 III 对专才</div>' +
      '<div><span>04</span>前人都是子集</div><div><span>12</span>表 IV 单手与头</div>' +
      '<div><span>05</span>AMASS 重定向</div><div><span>13</span>图 4 对多模式 RL</div>' +
      '<div><span>06</span>特权教师</div><div><span>14</span>真机表 V</div>' +
      '<div><span>07</span>25 步历史</div><div><span>15</span>边走边切模式</div>' +
      '<div><span>08</span>模式掩码</div><div><span>16</span>局限与代码</div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '30px';
    toc.style.lineHeight = '1.45';
    var rows = toc.children;
    // 淡入按目录顺序：左列 01–08，再右列 09–16
    var order = [0, 2, 4, 6, 8, 10, 12, 14, 1, 3, 5, 7, 9, 11, 13, 15];
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 HOVER</div><div class="title">一个命令空间，一个策略</div>');
    var items = [
      [ACC, '① 各种接口都是全身模仿的子集', 'ExBody、HumanPlus、H2O、OmniH2O<br>上下身 × 关键点 / 关节角 / 根部'],
      [WARN, '② 教师全都跟，学生看掩码后的命令', '模式掩码 + 稀疏掩码，DAgger 蒸馏<br>四种模式下 12 项各赢 7–8 项，对从头 RL 32/32'],
      [GOOD, '③ 换掩码就换模式', '同一套权重，真机上边走边切<br>代码里掩码本身也进观测，学生 1782 维']
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
    /* 下一篇的主题（不写集数）：发布清单里 HOVER 之后是 ExBody2 —— 只做表情动作一种模式，但做得更准 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：ExBody2 —— 速度和关键点分开跟，先筛掉做不到的动作');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · H1 走路的 3D 渲染</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
