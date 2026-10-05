// LCP 视频的片头 / 总结页（stage.html 在 lcp.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2410.11825',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:162px;font-weight:900;letter-spacing:16px;color:var(--demo-accent);line-height:1.08">LCP</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">Lipschitz 约束策略：学平滑的人形行走</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">不加滤波，用一项梯度惩罚让策略自己变平滑</div>');
    var m = h('div', 'meta', root,
      '<b>Learning Smooth Humanoid Locomotion through Lipschitz-Constrained Policies</b><br>Chen 等 · SFU、UIUC、伯克利等 · IROS 2025');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>仿真里的理想电机</div><div><span>02</span>Lipschitz：给斜率设上限</div>' +
      '<div><span>03</span>从「别太陡」到「陡了就罚」</div><div><span>04</span>罚的到底是什么：均值的斜率</div>' +
      '<div><span>05</span>几行代码接进 PPO</div><div><span>06</span>观测、ROA 与「罚整段输入」</div>' +
      '<div><span>07</span>命令、奖励与课程</div><div><span>08</span>三种平滑办法：表 I(a)</div>' +
      '<div><span>09</span>λ<sub>gp</sub> 扫一遍：表 I(b)</div><div><span>10</span>四台真机与局限</div>');
    toc.style.fontSize = '29px';
    toc.style.lineHeight = '1.4';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [24, 34, 34], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 6.4 + k * 0.22, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 LCP</div><div class="title">平滑写成一项可微约束</div>');
    var items = [
      [ACC, '① 仿真不罚抖动', '理想电机照单全收：不平滑的回报最高 28.87<br>动作抖动却是 LCP 的 13 倍（42.19 对 3.21）'],
      [GOOD, '② 「别太陡」→「陡了就罚」', '斜率上限化成一项可微的梯度惩罚<br>要罚整段输入：只罚当前观测，抖动 7.16'],
      [WARN, '③ 一个系数，几行代码', '$\\lambda_{gp}$ = 0.002：0.001 仍有风险，0.01 回报低 44%<br>四台人形共用，零样本上真机']
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
    /* 下一篇的主题（不写集数）：发布清单里 LCP 之后是 ASAP */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：ASAP —— 到真机上采数据，用残差动作模型对齐物理');
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
        pts.forEach(function (p, k) { fadeUp(p, t, [0.8, 2.6, 4.6][k]); });
        fadeUp(next, t, 7.0);
        fadeUp(foot, t, 9.5);
        foot.style.transform = 'none';  // 紧挨字幕，只淡入不上滑
      }
    };
  }
};
