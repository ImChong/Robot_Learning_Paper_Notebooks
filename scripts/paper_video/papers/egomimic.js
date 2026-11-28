// EgoMimic（Scaling Imitation Learning via Egocentric Video）视频的片头 / 总结页（stage.html 在 egomimic.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2410.24221',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:150px;font-weight:900;letter-spacing:4px;color:var(--demo-accent);line-height:1.08">EgoMimic</div>');
    var b = h('div', 'big', root, '<div style="font-size:56px;font-weight:900;line-height:1.2">人自己动手，也是示范</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">戴上眼镜做一遍，和机器人的数据一起训</div>');
    /* 作者行用不换行空格连住，「·」不落到行首（HugWBC 片头的教训）；只写第一作者 */
    var m = h('div', 'meta', root,
      '<b>EgoMimic: Scaling Imitation Learning via Egocentric Video</b><br>Simar&nbsp;Kareer&nbsp;等&nbsp;·&nbsp;Georgia&nbsp;Tech、Stanford&nbsp;·&nbsp;ICRA&nbsp;2025');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十八条目录排成两列：左列 01–09、右列 10–18，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>机器人的数据从哪来</div><div><span>10</span>一个策略，两个输出头</div>' +
      '<div><span>02</span>以前：只教高层</div><div><span>11</span>为什么用关节控制</div>' +
      '<div><span>03</span>眼镜：怎么采人的数据</div><div><span>12</span>训练与部署</div>' +
      '<div><span>04</span>机器人：像人的上半身</div><div><span>13</span>三个任务与数据量</div>' +
      '<div><span>05</span>两路数据各有什么</div><div><span>14</span>表三：和基线比</div>' +
      '<div><span>06</span>对齐一：头在动</div><div><span>15</span>泛化：新颜色、新场景</div>' +
      '<div><span>07</span>对齐二：人比机器人快</div><div><span>16</span>多一小时给谁</div>' +
      '<div><span>08</span>对齐三：各自归一化</div><div><span>17</span>消融</div>' +
      '<div><span>09</span>对齐四：遮住手和臂</div><div><span>18</span>局限、代码与数据</div>');
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
        /* 封面（classicCover，34px）上机构名会折成两行：封面只写「Georgia Tech 等」 */
        if (window.__cover && !m.__short) {
          m.__short = true;
          m.innerHTML = '<b>EgoMimic: Scaling Imitation Learning via Egocentric Video</b><br>Simar&nbsp;Kareer&nbsp;等&nbsp;·&nbsp;Georgia&nbsp;Tech&nbsp;等&nbsp;·&nbsp;ICRA&nbsp;2025';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 EgoMimic</div><div class="title">人和机器人的数据，进同一个策略</div>');
    var items = [
      [WARN, '① 数据：戴着眼镜自己做一遍', '第一视角的视频 + 手的 3D 轨迹，就是一条示范<br>碗任务：人每分钟 23 条，遥操作每分钟 2 条'],
      [ACC, '② 对齐：补上四处差别', '轨迹换到当前相机坐标系；人 1 秒对机器人 4 秒<br>位置各自归一化；手和机械臂都涂黑、画红线'],
      [GOOD, '③ 一个策略，两个输出头', '位姿头：人和机器人的数据一起监督<br>关节头：只有机器人数据监督，真机执行它']
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
    /* 下一篇的主题（不写集数）：发布清单里 EgoMimic 之后是 OpenVLA —— 开源的视觉—语言—动作模型，70 亿参数，在 97 万条真实机器人示范上训练（arXiv 2406.09246 摘要） */
    var next = h('div', 'pt', root);
    next.style.fontSize = '28px'; next.style.padding = '12px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：OpenVLA —— 开源的视觉—语言—动作模型，在 97 万条真实机器人示范上' + '训练'.split('').join('⁠'));
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
