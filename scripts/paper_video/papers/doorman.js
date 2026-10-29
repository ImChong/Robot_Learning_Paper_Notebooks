// DoorMan（Opening the Sim-to-Real Door for Humanoid Pixel-to-Action Policy Transfer）视频的片头 / 总结页（stage.html 在 doorman.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2512.01061',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:118px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">DoorMan</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">只看 RGB 的人形开门策略</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">全程仿真训练，真机零样本，比人遥操作快</div>');
    /* 作者行用不换行空格连住，「·」不落到行首（HugWBC 片头的教训） */
    var m = h('div', 'meta', root,
      '<b>Opening the Sim-to-Real Door for Humanoid Pixel-to-Action Policy Transfer</b><br>Haoru&nbsp;Xue、Tairan&nbsp;He、Zi&nbsp;Wang&nbsp;等&nbsp;·&nbsp;NVIDIA、UC&nbsp;Berkeley、CMU、港中文&nbsp;·&nbsp;CVPR&nbsp;2026');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十七条目录排成两列：左列 01–09、右列 10–17，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>开门：人形的硬骨头</div><div><span>10</span>部分可观与 GRPO</div>' +
      '<div><span>02</span>三个阶段</div><div><span>11</span>学生追上教师</div>' +
      '<div><span>03</span>站在 HOMIE 上</div><div><span>12</span>程序化生成的门</div>' +
      '<div><span>04</span>特权教师看什么</div><div><span>13</span>视觉随机化</div>' +
      '<div><span>05</span>六个阶段的奖励</div><div><span>14</span>拿掉哪种随机化</div>' +
      '<div><span>06</span>卡在抓门把</div><div><span>15</span>比遥操作快</div>' +
      '<div><span>07</span>分阶段重置</div><div><span>16</span>泛化与失败</div>' +
      '<div><span>08</span>缓冲区多大</div><div><span>17</span>局限与代码</div>' +
      '<div><span>09</span>学生只看 RGB</div><div></div>');
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
        /* 封面（classicCover，34px）上作者行会折成两行、目录落到 3:4 裁剪线以下：封面只写第一、二作者和第一单位 */
        if (window.__cover && !m.__short) {
          m.__short = true;
          m.innerHTML = '<b>Opening the Sim-to-Real Door for Humanoid Pixel-to-Action Policy Transfer</b><br>Haoru&nbsp;Xue、Tairan&nbsp;He&nbsp;等&nbsp;·&nbsp;NVIDIA&nbsp;等&nbsp;·&nbsp;CVPR&nbsp;2026';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 DoorMan</div><div class="title">教师—学生—自举，只看 RGB 开门</div>');
    var items = [
      [WARN, '① 教师：六个阶段 + 分阶段重置', '看得见门的位姿和接触力，奖励按阶段设计<br>进到新阶段就存档，重置时从存档接着练'],
      [GOOD, '② 学生：DAgger 蒸馏，再用 GRPO 自举', '只看头部 RGB；只靠「成功没有」接着练<br>成功率从五到七成追到教师的八到九成'],
      [ACC, '③ 海量的门 + 视觉随机化', '纯仿真数据，真机零样本<br>成功率 83%，比专家快 23%、比新手快 32%']
    ];
    var pts = items.map(function (it) {
      var p = h('div', 'pt', root);
      p.style.fontSize = '29px'; p.style.padding = '10px 30px';
      p.style.borderLeft = '10px solid ' + it[0];
      var n = h('div', 'n', p, it[1]); n.style.color = it[0];
      var body = h('div', '', p);
      it[2].split('<br>').forEach(function (line, q) {
        if (q) body.appendChild(document.createElement('br'));
        var span = h('span', '', body); K.rich(span, line);
        if (q) { span.style.fontSize = '26px'; span.style.color = 'var(--text-secondary)'; }
      });
      return p;
    });
    /* 下一篇的主题（不写集数）：发布清单里 DoorMan 之后是 CHIP —— 不只扛住外力，还能按指定的柔顺度让位 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '28px'; next.style.padding = '12px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：CHIP —— 不只扛住外力，还能按指定的' + '柔顺度让位'.split('').join('⁠'));
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
