// CHIP（Adaptive Compliance for Humanoid Control through Hindsight Perturbation）视频的片头 / 总结页（stage.html 在 chip.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2512.14689',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:150px;font-weight:900;letter-spacing:6px;color:var(--demo-accent);line-height:1.08">CHIP</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">按指定的柔顺度让位</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">参考不改、奖励不改，只改策略看到的目标</div>');
    /* 作者行用不换行空格连住，「·」不落到行首（HugWBC 片头的教训） */
    var m = h('div', 'meta', root,
      '<b>CHIP: Adaptive Compliance for Humanoid Control through Hindsight Perturbation</b><br>Sirui&nbsp;Chen、Zi&#8209;ang&nbsp;Cao、Zhengyi&nbsp;Luo&nbsp;等&nbsp;·&nbsp;NVIDIA、Stanford、UT&nbsp;Austin&nbsp;·&nbsp;arXiv&nbsp;2025');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十八条目录排成两列：左列 01–09、右列 10–18，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>会跑会跳，搬不动东西</div><div><span>10</span>全局三点与定位</div>' +
      '<div><span>02</span>前人怎么教柔顺</div><div><span>11</span>两台机器人一起抱</div>' +
      '<div><span>03</span>事后扰动</div><div><span>12</span>抓得住吗</div>' +
      '<div><span>04</span>一根看不见的弹簧</div><div><span>13</span>局部三点与遥操作</div>' +
      '<div><span>05</span>三个好处</div><div><span>14</span>柔顺不伤跟踪</div>' +
      '<div><span>06</span>力怎么加</div><div><span>15</span>两只手两种刚度</div>' +
      '<div><span>07</span>策略看什么</div><div><span>16</span>连续的柔顺度</div>' +
      '<div><span>08</span>奖励照抄原参考</div><div><span>17</span>自主：GR00T N1.5</div>' +
      '<div><span>09</span>阻尼：目标跟着手走</div><div><span>18</span>局限与没说清的</div>');
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
        /* 封面（classicCover，34px）上作者行会折成两行、目录落到 3:4 裁剪线以下：封面只写第一、二作者，年份前不写 arXiv（右上角已有）；Zi‑ang 用不换行连字符 */
        if (window.__cover && !m.__short) {
          m.__short = true;
          m.innerHTML = '<b>CHIP: Adaptive Compliance for Humanoid Control through Hindsight Perturbation</b><br>Sirui&nbsp;Chen、Zi&#8209;ang&nbsp;Cao&nbsp;等&nbsp;·&nbsp;NVIDIA&nbsp;等&nbsp;·&nbsp;2025';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 CHIP</div><div class="title">事后扰动：给跟踪器加一根可调弹簧</div>');
    var items = [
      [WARN, '① 改观测，不改参考', '训练时手上加力 $f$，策略看到 $g-f/k$<br>奖励照旧按原参考算：学到「让开 $f/k$」'],
      [GOOD, '② 部署时像一根刚度为 $k$ 的弹簧', '每只手的 $1/k$ 连续可调，再加阻尼就能牵着走<br>跟踪精度不掉：位置误差和不柔顺的基线持平'],
      [ACC, '③ 两台抱、遥操作、自主', '两台 G1 一起抓：80%（很硬的 FALCON 5%）<br>微调 GR00T N1.5：擦白板、搬箱子 60–90%']
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
    /* 下一篇的主题（不写集数）：发布清单里 CHIP 之后是 iDP3 —— 用以自身为中心的 3D 点云训扩散策略，只在一个场景采数据，换到新场景也能用 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '28px'; next.style.padding = '12px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：iDP3 —— 用自身视角的 3D 点云训扩散策略，一个场景采的数据，换个' + '场景也能用'.split('').join('⁠'));
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · 十八幕动画</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
