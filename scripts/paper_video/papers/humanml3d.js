// HumanML3D 视频的片头 / 总结页（stage.html 在 humanml3d.js 分镜之后加载）
// 论文只发在 CVPR 2022，没有 arXiv 版本，角标用 `badge` 写会议名
window.PaperVideo = {
  badge: 'CVPR 2022',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:124px;font-weight:900;letter-spacing:4px;color:var(--demo-accent);line-height:1.08">HumanML3D</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">文本生成 3D 人体动作</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">一套数据集 + 两阶段方法 + 一套评测器</div>');
    var m = h('div', 'meta', root,
      '<b>Generating Diverse and Natural 3D Human Motions from Text</b><br>Chuan Guo 等 · University of Alberta · CVPR 2022');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>文本生成动作卡在哪</div><div><span>02</span>HumanML3D 怎么建</div>' +
      '<div><span>03</span>一帧 = 263 个数</div><div><span>04</span>每 4 帧一个 snippet code</div>' +
      '<div><span>05</span>Text2Length：先定长度</div><div><span>06</span>时序 VAE 的一步</div>' +
      '<div><span>07</span>三项损失与课程学习</div><div><span>08</span>评测器与 R-Precision</div>' +
      '<div><span>09</span>结果、消融与遗产</div>');
    toc.style.fontSize = '30px';
    toc.style.lineHeight = '1.45';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [24, 34, 34], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 7.0 + k * 0.3, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 HumanML3D</div><div class="title">数据、方法、评测一起立起来</div>');
    var items = [
      [ACC, '① 一套数据集', '14,616 段动作 · 44,970 条描述 · 28.59 h<br>每帧 263 维：速度化、以根为参照、带触地'],
      [GOOD, '② 两阶段生成', 'Text2Length 采长度 → 时序 VAE 逐个生成 code<br>每 4 帧一个 snippet code，去掉它 top-1 掉 0.085'],
      [WARN, '③ 一套评测器', '对比学习提取器 + R-Precision（32 选 1）<br>本文 top-1 0.455，是真实动作 0.511 的 89%']
    ];
    var pts = items.map(function (it) {
      var p = h('div', 'pt', root);
      p.style.fontSize = '37px'; p.style.padding = '18px 32px';
      p.style.borderLeft = '10px solid ' + it[0];
      var n = h('div', 'n', p, it[1]); n.style.color = it[0];
      var body = h('div', '', p);
      it[2].split('<br>').forEach(function (line, q) {
        if (q) body.appendChild(document.createElement('br'));
        var span = h('span', '', body); K.rich(span, line);
        if (q) { span.style.fontSize = '31px'; span.style.color = 'var(--text-secondary)'; }
      });
      return p;
    });
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 具体算例 · 源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
    foot.style.textAlign = 'center';
    foot.style.fontSize = '29px';
    foot.style.padding = '22px 34px';
    return {
      root: root,
      draw: function (st, t) {
        V.stack(pts.concat([foot]), [20, 20, 30], V.SAFE_TOP + 148, V.contentBottom());
        fadeUp(head, t, 0.0);
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.6, 6.2][k]); });
        fadeUp(foot, t, 9.4);
        foot.style.transform = 'none';  // 紧挨字幕，只淡入不上滑
      }
    };
  }
};
