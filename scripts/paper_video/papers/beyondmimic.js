// BeyondMimic 视频的片头 / 总结页（stage.html 在 beyondmimic.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2508.08241',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:120px;font-weight:900;letter-spacing:4px;color:var(--demo-accent);line-height:1.08">BeyondMimic</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">从运动跟踪到引导扩散的多功能人形控制</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">一份跟踪配方搬上整个动作库，再用代价引导组合技能</div>');
    var m = h('div', 'meta', root,
      '<b>BeyondMimic: From Motion Tracking to Versatile Humanoid Control via Guided Diffusion</b><br>Liao、Truong、Huang 等 · UC Berkeley、Stanford · arXiv 2025');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十二条目录排成两列：单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>两个缺口</div><div><span>07</span>自适应采样</div>' +
      '<div><span>02</span>锚定跟踪</div><div><span>08</span>跟踪上真机</div>' +
      '<div><span>03</span>一项任务 + 三项正则</div><div><span>09</span>VAE 潜空间</div>' +
      '<div><span>04</span>单步观测与 Rot6D</div><div><span>10</span>状态—潜动作扩散</div>' +
      '<div><span>05</span>按电机算的阻抗</div><div><span>11</span>代价引导</div>' +
      '<div><span>06</span>随机化与部署延迟</div><div><span>12</span>测试时的任务与边界</div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1.08fr 1fr';
    toc.style.columnGap = '20px';
    toc.style.fontSize = '29px';
    toc.style.lineHeight = '1.5';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 BeyondMimic</div><div class="title">先跟踪，再蒸馏，最后引导</div>');
    var items = [
      [ACC, '① 一份跟踪配方，搬上整个动作库', '锚定跟踪 + 四个高斯 + 三项正则，阻抗按电机算<br>30 段、15 分钟上 G1；侧手翻角速度峰值 20 rad/s'],
      [GOOD, '② VAE 潜空间 + 状态—潜动作扩散', '32 维潜码，DAgger 蒸馏；过去 4 步 + 未来 16 步<br>侧手翻成功率：不用潜空间 5%，用了 95%'],
      [WARN, '③ 代价相加，测试时组合任务', '摇杆、路点、避障、关键帧，都写成代价的梯度<br>边界：视野 0.64 s，扩散部分的代码还没开源']
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
    /* 下一篇（不写集数）：按 2026-10-07 的清单是 019 InEKF；只是教学上的衔接，BeyondMimic 并没有用 InEKF */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：InEKF —— 机器人怎样知道自己当前的姿态和速度');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 4 个交互演示 · 论文数字逐项对照</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
