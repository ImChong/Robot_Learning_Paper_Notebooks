// HumanML3D 视频的片头 / 总结页（stage.html 在 humanml3d.js 分镜之后加载）
// 论文只发在 CVPR 2022，没有 arXiv 版本，角标用 `badge` 写会议名
window.PaperVideo = {
  badge: 'CVPR 2022',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:124px;font-weight:900;letter-spacing:4px;color:var(--demo-accent);line-height:1.08;white-space:nowrap">HumanML3D</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">文本生成 3D 人体动作</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">一套数据集 + 两阶段方法 + 一套评测器</div>');
    var m = h('div', 'meta', root,
      '<b>Generating Diverse and Natural 3D Human Motions from Text</b><br>Chuan Guo 等 · University of Alberta · CVPR 2022');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十二条目录排成两列：单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>一句话生成动作</div><div><span>07</span>词注意力</div>' +
      '<div><span>02</span>动作从哪来</div><div><span>08</span>先验与后验</div>' +
      '<div><span>03</span>每段配三句话</div><div><span>09</span>损失与课程学习</div>' +
      '<div><span>04</span>一帧 263 维</div><div><span>10</span>评测器</div>' +
      '<div><span>05</span>snippet code</div><div><span>11</span>结果</div>' +
      '<div><span>06</span>Text2Length</div><div><span>12</span>消融与遗产</div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '31px';
    toc.style.lineHeight = '1.55';
    var rows = toc.children;
    // 淡入按目录顺序：左列 01–06，再右列 07–12
    var order = [0, 2, 4, 6, 8, 10, 1, 3, 5, 7, 9, 11];
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 HumanML3D</div><div class="title">数据、方法、评测一起立起来</div>');
    var items = [
      [ACC, '① 一套数据集', '14,616 段动作 · 44,970 条描述 · 28.59 h<br>每帧 263 维：水平只存速度、以骨盆为参照、带触地'],
      [GOOD, '② 两阶段生成', 'Text2Length 采长度 → 时序 VAE 逐个生成 code<br>每 4 帧一个 snippet code，去掉它 top-1 掉 0.085'],
      [WARN, '③ 一套评测器', '对比学习的特征提取器 + R-Precision（32 选 1）<br>本文 top-1 0.455，是真实动作 0.511 的 89%']
    ];
    var pts = items.map(function (it) {
      var p = h('div', 'pt', root);
      p.style.fontSize = '33px'; p.style.padding = '14px 30px';
      p.style.borderLeft = '10px solid ' + it[0];
      var n = h('div', 'n', p, it[1]); n.style.color = it[0];
      var body = h('div', '', p);
      it[2].split('<br>').forEach(function (line, q) {
        if (q) body.appendChild(document.createElement('br'));
        var span = h('span', '', body); K.rich(span, line);
        if (q) { span.style.fontSize = '30px'; span.style.color = 'var(--text-secondary)'; }
      });
      return p;
    });
    /* 下一篇的主题（不写集数）：发布清单里 HumanML3D 之后是 GMR —— 人的动作怎样搬到机器人身上 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：GMR —— 人和机器人骨架不同，怎样把人的动作搬到机器人身上');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · 论文数字逐项对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
