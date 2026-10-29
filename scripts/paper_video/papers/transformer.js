// Transformer（Attention Is All You Need）视频的片头 / 总结页（stage.html 在 transformer.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '1706.03762',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:98px;font-weight:900;letter-spacing:6px;color:var(--demo-accent);line-height:1.08">Transformer</div>');
    var b = h('div', 'big', root, '<div style="font-size:60px;font-weight:900;line-height:1.2">注意力就是你所需要的一切</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">从机器人的角度读：Digit、π₀、GR00T 的骨架</div>');
    /* 作者行用不换行空格连住，「·」不落到行首（HugWBC 片头的教训）；只写第一作者，封面上信息框才是一行、目录不落到 3:4 裁剪线以下 */
    var m = h('div', 'meta', root,
      '<b>Attention Is All You Need</b><br>Ashish&nbsp;Vaswani&nbsp;等&nbsp;·&nbsp;Google&nbsp;Brain&nbsp;·&nbsp;NIPS&nbsp;2017');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十七条目录排成两列：左列 01–09、右列 10–17，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>机器人为什么要读它</div><div><span>10</span>残差、LayerNorm、FFN</div>' +
      '<div><span>02</span>RNN 的串行瓶颈</div><div><span>11</span>因果掩码：只看过去</div>' +
      '<div><span>03</span>表一：比三件事</div><div><span>12</span>交叉注意力</div>' +
      '<div><span>04</span>机器人的 token</div><div><span>13</span>训练并行，推理逐个</div>' +
      '<div><span>05</span>Q、K、V 三种角色</div><div><span>14</span>训练配方</div>' +
      '<div><span>06</span>手算一次注意力</div><div><span>15</span>表二：翻译结果</div>' +
      '<div><span>07</span>为什么除以 √dₖ</div><div><span>16</span>表三、表四：消融</div>' +
      '<div><span>08</span>多头：8 个头</div><div><span>17</span>局限与机器人</div>' +
      '<div><span>09</span>位置编码</div><div></div>');
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 Transformer</div><div class="title">机器人换掉的只是 token 和输出头</div>');
    var items = [
      [ACC, '① 按相似度加权', '$\\mathrm{softmax}(QK^\\top/\\sqrt{d_k})\\,V$<br>除以 $\\sqrt{d_k}$，不让 softmax 饱和'],
      [GOOD, '② 多头、位置编码、掩码', '8 个 64 维的头是切分，不是加算力<br>正弦编码加回顺序，因果掩码只看过去'],
      [WARN, '③ 机器人怎么用', 'Digit 读 16 步历史；π₀ 把图文和动作拼成一串<br>GR00T N1 用交叉注意力读视觉语言特征']
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
    /* 下一篇的主题（不写集数）：发布清单里 Transformer 之后是 ACT —— 用 Transformer 一次预测一整段动作，低成本双臂做精细操作 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '28px'; next.style.padding = '12px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：ACT —— 用 Transformer 一次预测一整段动作，低成本双臂做' + '精细操作'.split('').join('⁠'));
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
