// H2O（Learning Human-to-Humanoid Real-Time Whole-Body Teleoperation）视频的片头 / 总结页（stage.html 在 h2o.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2403.04436',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:118px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">H2O</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">人到人形的实时全身遥操作</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">一台摄像头，机器人实时跟着人做</div>');
    var m = h('div', 'meta', root,
      '<b>Learning Human-to-Humanoid Real-Time Whole-Body Teleoperation</b><br>Tairan He、Zhengyi Luo 等 · CMU · IROS&nbsp;2024');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十四条目录排成两列：左列 01–07、右列 08–14，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>遥操作的三道坎</div><div><span>08</span>看得见什么</div>' +
      '<div><span>02</span>三段流水线</div><div><span>09</span>稀疏观测稠密奖励</div>' +
      '<div><span>03</span>先改身材</div><div><span>10</span>随机化与终止</div>' +
      '<div><span>04</span>不改会内八</div><div><span>11</span>表 III</div>' +
      '<div><span>05</span>位置逆运动学</div><div><span>12</span>表 IV</div>' +
      '<div><span>06</span>对末端不抄角度</div><div><span>13</span>真机一台摄像头</div>' +
      '<div><span>07</span>仿真当判官</div><div><span>14</span>三道差距</div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '31px';
    toc.style.lineHeight = '1.5';
    var rows = toc.children;
    // 淡入按目录顺序：左列 01–07，再右列 08–14
    var order = [0, 2, 4, 6, 8, 10, 12, 1, 3, 5, 7, 9, 11, 13];
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 H2O</div><div class="title">先筛数据，再上真机</div>');
    var items = [
      [GOOD, '① 先改身材，再对位置', '把人拟合成 H1 的身材，不改就会内八<br>逆运动学对 11 个点的位置，不抄关节角'],
      [WARN, '② sim-to-data', '特权模仿器在仿真里试一遍，跟不住的扔掉<br>约 1 万段剩约 8500 段，成功率 +4.6 个点'],
      [ACC, '③ 只看真机拿得到的', '本体感受 66 维 + 8 个点 × 3 种量 = 138 维<br>比只给参考位置（90 维）高 19.3 个点']
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
    /* 下一篇的主题（不写集数）：发布清单里 H2O 之后是 OmniH2O —— VR 头显、头和双手三点、遥操作数据训自主策略 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：OmniH2O —— VR 头显跟三个点，还能训自主策略');
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
