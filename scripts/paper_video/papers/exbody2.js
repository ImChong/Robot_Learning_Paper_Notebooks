// ExBody2（Advanced Expressive Humanoid Whole-Body Control）视频的片头 / 总结页（stage.html 在 exbody2.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2412.13196',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:118px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">ExBody2</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">进阶的表达性人形全身控制</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">姿态归关键点，位置归速度</div>');
    var m = h('div', 'meta', root,
      '<b>ExBody2: Advanced Expressive Humanoid Whole-Body Control</b><br>Mazeyu Ji 等 · UCSD、UC Berkeley、MIT');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十八条目录排成两列：左列 01–09、右列 10–18，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>表现力和稳定</div><div><span>10</span>可行又多样</div>' +
      '<div><span>02</span>前人卡在哪</div><div><span>11</span>自动筛选</div>' +
      '<div><span>03</span>通才再专才</div><div><span>12</span>阈值扫一遍</div>' +
      '<div><span>04</span>动作搬到 G1</div><div><span>13</span>专才微调</div>' +
      '<div><span>05</span>特权教师</div><div><span>14</span>恰恰舞</div>' +
      '<div><span>06</span>表 I 的奖励</div><div><span>15</span>和基线比</div>' +
      '<div><span>07</span>全局关键点会漂</div><div><span>16</span>历史与 DAgger</div>' +
      '<div><span>08</span>局部关键点 + 速度</div><div><span>17</span>动作来源与部署</div>' +
      '<div><span>09</span>学生：10 步历史</div><div><span>18</span>局限与没说清的</div>');
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 ExBody2</div><div class="title">筛得准，跟得准</div>');
    var items = [
      [ACC, '① 关键点在机器人坐标系里跟', '全局位置交给速度；训练时允许漂一小段再拉回<br>全身关节误差比 OmniH2O 低 35.8%'],
      [WARN, '② 让初始策略给动作打分', '$e(s)=0.1\\,E_{\\text{key}}+0.9\\,E_{\\text{dof}}$，阈值 0.15 最好<br>只留下半身做得到的，约 77%'],
      [GOOD, '③ 通才再微调成专才', '四组难度上关节误差都最低<br>但专才之间还不能无缝切换']
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
    /* 下一篇的主题（不写集数）：发布清单里 ExBody2 之后是 HugWBC */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：HugWBC —— 一个策略多种步态，还能改步频和抬脚高度');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · G1 的 3D 渲染</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
