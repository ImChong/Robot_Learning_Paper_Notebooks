// MaskedMimic（Unified Physics-Based Character Control Through Masked Motion Inpainting）视频的片头 / 总结页（stage.html 在 maskedmimic.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2409.14393',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:112px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">MaskedMimic</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">掩码动作补全的统一角色控制</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">随机遮掉目标，一个模型补全全身</div>');
    var m = h('div', 'meta', root,
      '<b>MaskedMimic: Unified Physics-Based Character Control Through Masked Motion Inpainting</b><br>Chen Tessler 等 · NVIDIA · SIGGRAPH&nbsp;Asia&nbsp;2024');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十八条目录排成两列：左列 01–09、右列 10–18，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>一个控制器做所有事</div><div><span>10</span>DAgger 与 KL 调度</div>' +
      '<div><span>02</span>控制就是补全</div><div><span>11</span>结构化掩码</div>' +
      '<div><span>03</span>两个阶段</div><div><span>12</span>固定噪声与历史</div>' +
      '<div><span>04</span>老师看完整的未来</div><div><span>13</span>先验 Transformer</div>' +
      '<div><span>05</span>奖励：五项跟踪</div><div><span>14</span>表 1、2：全身与 VR</div>' +
      '<div><span>06</span>训练场与提前终止</div><div><span>15</span>表 3、4：关节与地形</div>' +
      '<div><span>07</span>三种部分目标</div><div><span>16</span>转向、路径、伸手</div>' +
      '<div><span>08</span>为什么要 VAE</div><div><span>17</span>坐椅子与消融</div>' +
      '<div><span>09</span>编码器是残差</div><div><span>18</span>文字控制与局限</div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '30px';
    toc.style.lineHeight = '1.45';
    var rows = toc.children;
    // 淡入按目录顺序：左列 01–09，再右列 10–18
    var order = [0, 2, 4, 6, 8, 10, 12, 14, 16, 1, 3, 5, 7, 9, 11, 13, 15, 17];
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [24, 34, 34], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        order.forEach(function (idx, k) { fadeUp(rows[idx], t, 6.6 + k * 0.1, 0.5); });
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 MaskedMimic</div><div class="title">控制就是补全</div>');
    var items = [
      [GOOD, '① 把控制写成动作补全', '训练时随机遮掉目标：关节、文字、物体<br>用的时候用户决定给哪些'],
      [WARN, '② 老师看全部，学生看一部分', '强化学习训全身跟踪的老师 → DAgger 蒸馏<br>学生是残差先验的条件 VAE + 结构化掩码'],
      [ACC, '③ 新任务不用训练', '写个状态机换一组目标：VR、路径、转向、坐椅子<br>表 6：去掉残差先验 21.1%，去掉结构化掩码 0%']
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
    /* 下一篇的主题（不写集数）：发布清单里 MaskedMimic 之后是 HOVER —— 掩码式的多模式控制搬到真机人形 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：HOVER —— 掩码式的多模式控制，搬到真实的人形机器人');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · 官方样例的 3D 渲染</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
