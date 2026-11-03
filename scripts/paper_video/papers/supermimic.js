// SuperMimic（Scaling Humanoid Whole-Body Control with One Differentiable World Model）视频的片头 / 总结页（stage.html 在 supermimic.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2610.28480',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:132px;font-weight:900;letter-spacing:4px;color:var(--demo-accent);line-height:1.08">SuperMimic</div>');
    var b = h('div', 'big', root, '<div style="font-size:50px;font-weight:900;line-height:1.2">一个可微世界模型，1 张卡训全身控制</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">从仿真日志学动力学，策略在想象里沿梯度学</div>');
    /* 作者行用不换行空格连住，「·」不落到行首（HugWBC 片头的教训） */
    var m = h('div', 'meta', root,
      '<b>SuperMimic: Scaling Humanoid Whole-Body Control with One Differentiable World Model</b><br>Qiayuan&nbsp;Liao、Yiyang&nbsp;Shao、Junfeng&nbsp;Long&nbsp;等&nbsp;·&nbsp;UC&nbsp;Berkeley&nbsp;·&nbsp;CoRL&nbsp;2026&nbsp;Oral');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十八条目录排成两列：左列 01–09、右列 10–18，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>动作越多，算力越贵</div><div><span>10</span>奖励、终止与随机化</div>' +
      '<div><span>02</span>两条老路</div><div><span>11</span>动作库与重置采样</div>' +
      '<div><span>03</span>共用一个身体</div><div><span>12</span>一张卡三小时</div>' +
      '<div><span>04</span>一个循环两个学习器</div><div><span>13</span>179、25、0</div>' +
      '<div><span>05</span>策略看什么做什么</div><div><span>14</span>同样设置比 PPO</div>' +
      '<div><span>06</span>世界模型学增量</div><div><span>15</span>为什么省</div>' +
      '<div><span>07</span>复现：像不像仿真器</div><div><span>16</span>上真机</div>' +
      '<div><span>08</span>在想象里反向传播</div><div><span>17</span>下游：速度命令</div>' +
      '<div><span>09</span>评论家</div><div><span>18</span>局限与复现</div>');
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
        /* 封面（classicCover，34px）上作者行会折成两行、目录落到 3:4 裁剪线以下：封面只写第一作者，年份前不写 arXiv（右上角已有） */
        if (window.__cover && !m.__short) {
          m.__short = true;
          m.innerHTML = '<b>SuperMimic: Scaling Humanoid Whole-Body Control with One Differentiable World Model</b><br>Qiayuan&nbsp;Liao&nbsp;等&nbsp;·&nbsp;UC&nbsp;Berkeley&nbsp;·&nbsp;CoRL&nbsp;2026';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 SuperMimic</div><div class="title">一个可微世界模型，摊薄整个动作库</div>');
    var items = [
      [ACC, '① 从仿真日志学一个世界模型', '所有动作共用一个身体，一个模型就够<br>仿真器不必可微，梯度只经过学到的模型'],
      [GOOD, '② 在想象里沿梯度学', '冻住模型想象 32 步，回报沿时间反传<br>评论家看窗口之外，存活权重让终止可导'],
      [WARN, '③ 1 张卡 3 小时超过 128 张卡 7 天', '显卡小时少 1000 倍以上；失败 25 段，2 张卡归零<br>同一个策略上真机 G1：侧滚、空翻'
      ]
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
    /* 这一期是主线之外的前沿扩充，片尾不预告下一期 */
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · 十八幕动画</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
    foot.style.textAlign = 'center';
    foot.style.fontSize = '27px';
    foot.style.padding = '16px 30px';
    return {
      root: root,
      draw: function (st, t) {
        V.stack(pts.concat([foot]), [14, 14, 24], V.SAFE_TOP + 148, V.contentBottom());
        fadeUp(head, t, 0.0);
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.4, 5.8][k]); });
        fadeUp(foot, t, 7.0);
        foot.style.transform = 'none';  // 紧挨字幕，只淡入不上滑
      }
    };
  }
};
