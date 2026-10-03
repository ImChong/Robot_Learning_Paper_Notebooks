// Diffusion Policy 视频的片头 / 总结页（stage.html 在 diffusion_policy.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2303.04137',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:72px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">Diffusion Policy</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">动作扩散策略</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">让机器人从噪声里生成整段动作</div>');
    var m = h('div', 'meta', root,
      '<b>Diffusion Policy: Visuomotor Policy Learning via Action Diffusion</b><br>Chi, Feng, Du, Xu, Cousineau, Burchfiel, Song<br>Columbia · TRI · MIT · RSS 2023 · 2024 扩展版');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>平均动作会撞上障碍</div><div><span>02</span>动作是条件扩散过程</div>' +
      '<div><span>03</span>动作分块（action chunking）</div><div><span>04</span>视觉条件 + FiLM</div>' +
      '<div><span>05</span>DDIM 跳步：100 步训练，10 步推理</div><div><span>06</span>滚动时域（receding horizon）</div>' +
      '<div><span>07</span>定量证据与局限</div>');
    toc.style.fontSize = '31px';
    toc.style.lineHeight = '1.55';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [26, 40, 40], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 7.0 + k * 0.35, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 Diffusion Policy</div><div class="title">学分布，不是学均值</div>');
    var items = [
      [ACC, '① 条件扩散', '学 $p(A \\mid O)$，不回归 $\\mathbb{E}[a \\mid o]$<br>多峰演示不会被平均成撞墙的直线'],
      [GOOD, '② 预测 16 / 执行 8', '整段 $T_p = 16$ 步一起去噪，只执行 $T_a = 8$ 步<br>选定的峰整段一致，再带着新观测规划'],
      [WARN, '③ 特征算一遍 + DDIM', '观测只做条件，图像特征每次推理算一遍<br>训练 100 步，推理 10 步：RTX 3080 上 0.1 s']
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
    /* 下一篇的主题（不写集数）：扩散模型的分数拿来当运动先验，替换 AMP 的判别器 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：用运动扩散模型的**分数**当奖励，替换 AMP 的判别器');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · 源码对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
