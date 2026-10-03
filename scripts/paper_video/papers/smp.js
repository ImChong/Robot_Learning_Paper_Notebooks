// SMP 视频的片头 / 总结页（stage.html 在 smp.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2512.03028',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:150px;font-weight:900;letter-spacing:10px;color:var(--demo-accent);line-height:1.08">SMP</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">可复用的分数匹配运动先验</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">冻结的扩散模型给动作打分，替换 AMP 的判别器</div>');
    var m = h('div', 'meta', root,
      '<b>SMP: Reusable Score-Matching Motion Priors for Physics-Based Character Control</b><br>Yuxuan Mu, Ziyu Zhang, Yi Shi … Xue Bin Peng<br>SFU · Sony · NVIDIA 等 · SIGGRAPH 2026');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>对抗先验为什么不能复用</div><div><span>02</span>先训一个只看数据的扩散模型</div>' +
      '<div><span>03</span>SDS 分数蒸馏：残差就是修正量</div><div><span>04</span>ESM：固定三档噪声</div>' +
      '<div><span>05</span>AdaNorm：三档各除各的均值</div><div><span>06</span>GSI：初始状态也由先验来生</div>' +
      '<div><span>07</span>一个先验，100 + N 种风格</div><div><span>08</span>训练闭环、证据与边界</div>');
    toc.style.fontSize = '31px';
    toc.style.lineHeight = '1.5';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [26, 40, 40], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 7.0 + k * 0.3, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 SMP</div><div class="title">打分器训一次，冻结后反复用</div>');
    var items = [
      [ACC, '① 冻结的扩散模型当打分器', '只用动作数据预训练，之后一个参数都不动<br>$r^{smp} = \\exp(-w_s \\lVert \\hat{\\boldsymbol\\epsilon} - \\boldsymbol\\epsilon \\rVert^2)$：残差越小越像真人'],
      [GOOD, '② ESM + AdaNorm', '固定 $\\{22, 15, 8\\}$ 三档再平均，压住方差<br>每档除以自己的运行均值，三档说话一样大声'],
      [WARN, '③ GSI：起点也由先验来生', '同一个模型采样初始状态，不再需要 RSI<br>先验训好，原始数据集就可以丢掉']
    ];
    var pts = items.map(function (it, k) {
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
    /* 下一篇的主题（不写集数）：发布清单里 SMP 之后是域随机化，SMP 的 G1 真机实验正好用到了它 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：训练时把仿真随机打乱 —— **域随机化**');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · MimicKit 源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
