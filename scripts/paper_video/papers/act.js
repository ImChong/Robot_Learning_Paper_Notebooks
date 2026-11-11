// ACT / ALOHA（Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware）视频的片头 / 总结页（stage.html 在 act.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2304.13705',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:150px;font-weight:900;letter-spacing:6px;color:var(--demo-accent);line-height:1.08">ACT</div>');
    var b = h('div', 'big', root, '<div style="font-size:56px;font-weight:900;line-height:1.2">一次预测一段动作</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">两万美元的双臂，也能做毫米级的活</div>');
    /* 作者行用不换行空格连住，「·」不落到行首（HugWBC 片头的教训）；只写第一作者 */
    var m = h('div', 'meta', root,
      '<b>Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware</b><br>Tony&nbsp;Z.&nbsp;Zhao&nbsp;等&nbsp;·&nbsp;Stanford、UC&nbsp;Berkeley、Meta&nbsp;·&nbsp;RSS&nbsp;2023');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十七条目录排成两列：左列 01–09、右列 10–17，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>精细活，便宜硬件行吗</div><div><span>10</span>学生看的 1202 张卡片</div>' +
      '<div><span>02</span>ALOHA：两对主从臂</div><div><span>11</span>解码器：100 道题</div>' +
      '<div><span>03</span>4 台相机与主臂关节角</div><div><span>12</span>8 个任务</div>' +
      '<div><span>04</span>一步错，步步错</div><div><span>13</span>表一：和基线比</div>' +
      '<div><span>05</span>动作分块</div><div><span>14</span>表二与真机细节</div>' +
      '<div><span>06</span>时间集成</div><div><span>15</span>消融：分块</div>' +
      '<div><span>07</span>人的示范不唯一</div><div><span>16</span>消融：CVAE 与 50 Hz</div>' +
      '<div><span>08</span>CVAE：老师递纸条</div><div><span>17</span>局限、代码与之后</div>' +
      '<div><span>09</span>编码器：老师写纸条</div><div></div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '30px';
    toc.style.lineHeight = '1.45';
    var rows = toc.children;
    // 淡入按目录顺序：左列 01–09，再右列 10–17
    var order = [0, 2, 4, 6, 8, 10, 12, 14, 16, 1, 3, 5, 7, 9, 11, 13, 15];
    return {
      root: root,
      draw: function (st, t) {
        /* 封面（classicCover，34px）上机构名会折成两行、目录落到 3:4 裁剪线以下：封面只写「Stanford 等」 */
        if (window.__cover && !m.__short) {
          m.__short = true;
          m.innerHTML = '<b>Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware</b><br>Tony&nbsp;Z.&nbsp;Zhao&nbsp;等&nbsp;·&nbsp;Stanford&nbsp;等&nbsp;·&nbsp;RSS&nbsp;2023';
        }
        V.stack([a, b, m, toc], [24, 34, 34], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        order.forEach(function (idx, k) { fadeUp(rows[idx], t, 5.4 + k * 0.1, 0.5); });
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 ACT</div><div class="title">一次预测一段，重叠的取平均</div>');
    var items = [
      [WARN, '① ALOHA：两对主从臂', '人扳小臂，大臂照着同样的关节角动<br>不到 2 万美元，50 Hz，4 台网络摄像头'],
      [ACC, '② 动作分块 + 时间集成', '一次预测 $k = 100$ 步，决定次数少 100 倍<br>每步都查询，同一步的预测按 $e^{-m\\,i}$ 加权平均'],
      [GOOD, '③ 训成 CVAE 学人的示范', '编码器给出风格变量 $z$，测试时 $z = 0$<br>每个任务 50 条示范：打开杯盖 84%、装电池 96%']
    ];
    var pts = items.map(function (it) {
      var p = h('div', 'pt', root);
      p.style.fontSize = '29px'; p.style.padding = '10px 30px';
      p.style.borderLeft = '10px solid ' + it[0];
      var n = h('div', 'n', p);
      K.rich(n, it[1]);
      n.style.color = it[0];
      var body = h('div', '', p);
      it[2].split('<br>').forEach(function (line, q) {
        if (q) body.appendChild(document.createElement('br'));
        var span = h('span', '', body); K.rich(span, line);
        if (q) { span.style.fontSize = '26px'; span.style.color = 'var(--text-secondary)'; }
      });
      return p;
    });
    /* 下一篇的主题（不写集数）：发布清单里 ACT 之后是 EgoMimic —— 人戴眼镜录第一视角视频、配上手的 3D 跟踪，和机器人数据一起训一个策略 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '28px'; next.style.padding = '12px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：EgoMimic —— 人戴眼镜录第一视角的视频，和机器人的数据一起训一个' + '策略'.split('').join('⁠'));
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · 十七幕动画</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
