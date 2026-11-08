// iDP3（Generalizable Humanoid Manipulation with 3D Diffusion Policies）视频的片头 / 总结页（stage.html 在 idp3.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2410.10803',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:118px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">iDP3</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">改进的 3D 扩散策略，让人形的操作泛化</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">只在一个场景里采数据，在没见过的场景里自主操作</div>');
    /* 作者行用不换行空格连住，「·」不落到行首（HugWBC 片头的教训） */
    var m = h('div', 'meta', root,
      '<b>Generalizable Humanoid Manipulation with 3D Diffusion Policies</b><br>Yanjie&nbsp;Ze、Zixuan&nbsp;Chen、Wenhao&nbsp;Wang&nbsp;等&nbsp;·&nbsp;Stanford、SFU、UPenn、UIUC、CMU&nbsp;·&nbsp;IROS&nbsp;2025');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十八条目录排成两列：左列 01–09、右列 10–18，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>只在一个场景里会干活</div><div><span>10</span>改动三：金字塔编码器</div>' +
      '<div><span>02</span>系统四块</div><div><span>11</span>改动四：预测 16 步</div>' +
      '<div><span>03</span>上半身 25 个自由度</div><div><span>12</span>扩散：10 步去噪</div>' +
      '<div><span>04</span>头上的激光雷达</div><div><span>13</span>实验设置：抓杯子</div>' +
      '<div><span>05</span>Vision Pro 遥操作</div><div><span>14</span>表 II：和基线比</div>' +
      '<div><span>06</span>观测、动作与数据</div><div><span>15</span>训练时间</div>' +
      '<div><span>07</span>DP3：标定与分割</div><div><span>16</span>换物体、视角、场景</div>' +
      '<div><span>08</span>改动一：相机坐标系</div><div><span>17</span>为什么 3D 更稳</div>' +
      '<div><span>09</span>改动二：4096 个点</div><div><span>18</span>局限与代码</div>');
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
        /* 封面（classicCover，34px）上标题折成两行，作者行再折就让目录落到 3:4 裁剪线以下：封面只写第一作者和第一单位 */
        if (window.__cover && !m.__short) {
          m.__short = true;
          m.innerHTML = '<b>Generalizable Humanoid Manipulation with 3D Diffusion Policies</b><br>Yanjie&nbsp;Ze&nbsp;等&nbsp;·&nbsp;Stanford&nbsp;等&nbsp;·&nbsp;IROS&nbsp;2025';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 iDP3</div><div class="title">一个场景的数据，很多场景都能干活</div>');
    var items = [
      [WARN, '① 一整套真机系统', '推车 + 头上激光雷达的 GR-1，全上半身遥操作<br>只在一个场景里采数据'],
      [GOOD, '② 四处改动', '相机坐标系的点云（不标定、不分割）、4096 个点<br>金字塔卷积编码器、一次预测 16 步'],
      [ACC, '③ 分布外才见分晓', '训练场景里 2D 基线更准<br>换物体、视角、场景：iDP3 仍 9/10，2D 基线 0–3/10']
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
    /* 下一篇的主题（不写集数）：发布清单里 iDP3 之后是第四季的 Transformer —— 基础模型从它开始，它是 VLA 的骨干 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '28px'; next.style.padding = '12px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：Transformer —— 第四季讲基础模型，从它开始；它是 VLA 的' + '骨干网络'.split('').join('⁠'));
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
