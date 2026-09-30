// DeepMimic 视频的片头 / 总结页（stage.html 在 deepmimic.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '1804.02717',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:110px;font-weight:900;letter-spacing:4px;color:var(--demo-accent);line-height:1.08">DeepMimic</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">深度模仿</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">用动作捕捉教物理角色学技能</div>');
    var m = h('div', 'meta', root,
      '<b>Example-Guided Deep RL of Physics-Based Character Skills</b><br>Peng, Abbeel, Levine, van de Panne<br>UC Berkeley · UBC · SIGGRAPH 2018');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>为什么要模仿</div><div><span>02</span>四维模仿奖励</div>' +
      '<div><span>03</span>RSI：从哪儿开始练</div><div><span>04</span>ET：摔了赔多少</div>' +
      '<div><span>05</span>训练闭环</div>');
    toc.style.fontSize = '31px';
    toc.style.lineHeight = '1.55';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [26, 40, 40], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 7.0 + k * 0.45, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 DeepMimic</div><div class="title">PPO 不动，改的全是环境</div>');
    var items = [
      [ACC, '① 模仿奖励', '$r^I = \\sum_j w^j \\exp(-k^j \\cdot \\text{误差}^j)$<br>$k$ 管多严，$w$ 管占多少'],
      [GOOD, '② RSI', '从参考动作的随机相位起步<br>后空翻的后半段才练得到'],
      [WARN, '③ ET', '非脚部位触地就终止<br>Backflip 去掉 ET：$0.791 \\to 0.379$']
    ];
    var pts = items.map(function (it, k) {
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
      '<b>完整笔记 · 4 个交互演示 · MimicKit 源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
    foot.style.textAlign = 'center';
    foot.style.fontSize = '29px';
    foot.style.padding = '22px 34px';
    return {
      root: root,
      draw: function (st, t) {
        V.stack(pts.concat([foot]), [20, 20, 30], V.SAFE_TOP + 148, V.contentBottom());
        fadeUp(head, t, 0.0);
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.4, 5.6][k]); });
        fadeUp(foot, t, 9.0);
        foot.style.transform = 'none';  // 紧挨字幕，只淡入不上滑
      }
    };
  }
};
