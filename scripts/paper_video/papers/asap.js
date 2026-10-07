// ASAP 视频的片头 / 总结页（stage.html 在 asap.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2502.01143',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:162px;font-weight:900;letter-spacing:16px;color:var(--demo-accent);line-height:1.08">ASAP</div>');
    // 缩小中文标题，为小红书长屏播放的左右裁切留出余量。
    var b = h('div', 'big', root, '<div style="font-size:44px;font-weight:900;line-height:1.2">对齐仿真与真实物理，学人形敏捷全身技能</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">到真机上采数据，学一个残差动作模型，把仿真对齐到真机</div>');
    var m = h('div', 'meta', root,
      '<b>ASAP: Aligning Simulation and Real-World Physics for Learning Agile Humanoid Whole-Body Skills</b><br>He、Gao 等 · CMU、NVIDIA · RSS 2025');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十二条目录排成两列：单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>仿真能跳，真机跳不动</div><div><span>07</span>开环回放：表 III</div>' +
      '<div><span>02</span>从视频到参考动作</div><div><span>08</span>闭环微调：表 IV</div>' +
      '<div><span>03</span>相位跟踪策略</div><div><span>09</span>真机只修脚踝：表 V</div>' +
      '<div><span>04</span>上真机录一遍</div><div><span>10</span>怎么训 Δ：图 10</div>' +
      '<div><span>05</span>残差动作模型 Δa</div><div><span>11</span>怎么用 Δ：图 11</div>' +
      '<div><span>06</span>冻结 Δ 微调</div><div><span>12</span>Δ 学到了什么</div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1.12fr 1fr';
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 ASAP</div><div class="title">把差距写成「动作该补多少」</div>');
    var items = [
      [ACC, '① 上真机录轨迹，学残差动作 Δa', '每步从真机状态出发，让仿真「演」出真机<br>开环回放 1 秒：误差 80.8 → 37.9，少 53%'],
      [GOOD, '② 冻结 Δ 进仿真微调，部署时拿掉', 'Genesis 困难档 175 → 129，成功率 100%<br>真机只修脚踝 4 自由度：误差少 18%、30%'],
      [WARN, '③ 要 RL 多步地学，补的是有结构的差距', '一步反推短视；随机噪声最好 173.5，ASAP 126.9<br>Δ 最大在踝俯仰 0.056，肩部只有 0.011–0.017']
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
    /* 下一篇的主题（不写集数）：发布清单里 ASAP 之后是 BeyondMimic */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：BeyondMimic —— 一份跟踪配方，搬上整个动作库');
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
