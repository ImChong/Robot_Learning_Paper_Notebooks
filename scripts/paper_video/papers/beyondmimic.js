// BeyondMimic 视频的片头 / 总结页（stage.html 在 beyondmimic.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2508.08241',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:128px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1">BeyondMimic</div>');
    a.style.top = '240px';
    var b = h('div', 'big', root, '<div style="font-size:70px;font-weight:900">从运动跟踪到引导扩散</div>' +
      '<div style="font-size:40px;color:var(--text-secondary);margin-top:18px">一个跟踪策略，加一个可引导的生成模型</div>');
    b.style.top = '470px';
    var m = h('div', 'meta', root,
      '<b>BeyondMimic: From Motion Tracking to Versatile Humanoid Control via Guided Diffusion</b><br>Liao, Truong, Huang, Tevet, Sreenath, Liu<br>UC Berkeley · Stanford · arXiv 2025');
    m.style.top = '680px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>两个缺口</div><div><span>02</span>锚定跟踪</div>' +
      '<div><span>03</span>一套 MDP、一套超参</div><div><span>04</span>长参考的自适应采样</div>' +
      '<div><span>05</span>VAE 潜空间</div><div><span>06</span>状态-潜动作联合扩散</div>' +
      '<div><span>07</span>Classifier Guidance</div><div><span>08</span>真机验收与闭环</div>');
    toc.style.top = '1040px';
    toc.style.lineHeight = '1.5';
    toc.style.fontSize = '38px';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 7.0 + k * 0.3, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 BeyondMimic</div><div class="title">先跟踪，再蒸馏，最后引导</div>');
    var items = [
      [ACC, '① 锚定跟踪 + 紧凑 MDP', '$\\hat{T}_b = T_{\\text{anchor}} T_{b_{\\text{ref}}}^{-1} T_{b,\\text{motion}}$<br>允许漂，不许走歪；7 项奖励、3 类 DR'],
      [GOOD, '② VAE + 联合扩散', '32 维 $z$，DAgger 蒸馏专家<br>扩散状态-潜动作轨迹，$N=4$ 历史、$H=16$ 未来'],
      [WARN, '③ 代价直接相加', '$G = G_{\\text{waypoint}} + G_{\\text{SDF}}$<br>零样本组合摇杆、路点、避障']
    ];
    var pts = items.map(function (it, k) {
      var p = h('div', 'pt', root);
      p.style.top = (420 + k * 265) + 'px';
      p.style.borderLeft = '10px solid ' + it[0];
      var n = h('div', 'n', p, it[1]); n.style.color = it[0];
      var body = h('div', '', p);
      it[2].split('<br>').forEach(function (line, q) {
        if (q) body.appendChild(document.createElement('br'));
        var span = h('span', '', body); K.rich(span, line);
        if (q) { span.style.fontSize = '34px'; span.style.color = 'var(--text-secondary)'; }
      });
      return p;
    });
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · 官方源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
    foot.style.top = '1225px';
    foot.style.textAlign = 'center';
    foot.style.fontSize = '32px';
    return {
      root: root,
      draw: function (st, t) {
        fadeUp(head, t, 0.0);
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.4, 5.8][k]); });
        fadeUp(foot, t, 9.0);
      }
    };
  }
};
