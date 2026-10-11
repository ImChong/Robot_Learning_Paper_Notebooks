// GMR 视频的片头 / 总结页（stage.html 在 gmr.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2510.02252',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:160px;font-weight:900;letter-spacing:6px;color:var(--demo-accent);line-height:1.08">GMR</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">通用动作重定向</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">按部位缩放 + 两阶段 IK，把人的动作搬到机器人身上</div>');
    var m = h('div', 'meta', root,
      '<b>Retargeting Matters: General Motion Retargeting for Humanoid Motion Tracking</b><br>João Pedro Araújo、Yanjie Ze、Pei Xu、Jiajun Wu、C. Karen Liu · Stanford · arXiv 2025');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十三条目录排成两列：单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>身体不一样</div><div><span>08</span>只换参考动作</div>' +
      '<div><span>02</span>两个开源基线</div><div><span>09</span>表 I：谁跟得住</div>' +
      '<div><span>03</span>一张配置表</div><div><span>10</span>三类瑕疵</div>' +
      '<div><span>04</span>按部位缩放</div><div><span>11</span>像不像原动作</div>' +
      '<div><span>05</span>根和脚同比例</div><div><span>12</span>从哪一帧开始</div>' +
      '<div><span>06</span>先对朝向</div><div><span>13</span>开源库与局限</div>' +
      '<div><span>07</span>再对位置</div><div></div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '31px';
    toc.style.lineHeight = '1.5';
    var rows = toc.children;
    // 淡入按目录顺序：左列 01–07，再右列 08–13
    var order = [0, 2, 4, 6, 8, 10, 12, 1, 3, 5, 7, 9, 11];
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 GMR</div><div class="title">缩放做对，强化学习才不用收拾残局</div>');
    var items = [
      [ACC, '① 按部位缩放', '根、躯干、腿 0.875，手臂 0.729（LAFAN1 → G1）<br>根和腿同一个比例：踩地的脚才不会滑'],
      [GOOD, '② 两阶段 IK', '先对 14 个关键身体的朝向，再对所有位置<br>mink 每步解一个小 QP，误差降不到 0.001 或满 10 次就停'],
      [WARN, '③ 数据说话', '21 段 × 3 种测法：GMR 接近 Unitree，PHC 掉到 0<br>用户研究对 PHC 74%、对 ProtoMotions 63% 选 GMR']
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
    /* 下一篇的主题（不写集数）：发布清单里 GMR 之后是 OmniRetarget —— 有接触时怎样保住交互 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：OmniRetarget —— 有接触时，怎样把交互也保住');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · 官方代码复现的对照实验</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
