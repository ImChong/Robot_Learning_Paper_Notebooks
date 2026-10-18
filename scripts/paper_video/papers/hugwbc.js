// HugWBC（A Unified and General Humanoid Whole-Body Controller for Versatile Locomotion）视频的片头 / 总结页（stage.html 在 hugwbc.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2502.03206',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:118px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">HugWBC</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">人形机器人的统一通用全身控制器</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">一个策略走、跳、站，上身随时交给别人</div>');
    var m = h('div', 'meta', root,
      '<b>HugWBC: A Unified and General Humanoid Whole-Body Controller for Versatile Locomotion</b><br>Yufei Xue、Wentao Dong 等 · 上海交通大学、上海人工智能实验室 · RSS&nbsp;2025');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十六条目录排成两列：左列 01–08、右列 09–16，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>人会的，人形做不到</div><div><span>09</span>干预训练</div>' +
      '<div><span>02</span>任务 + 行为命令</div><div><span>10</span>噪声课程</div>' +
      '<div><span>03</span>相位切步态</div><div><span>11</span>表 III 单个命令</div>' +
      '<div><span>04</span>期望接地概率</div><div><span>12</span>图 8 命令组合</div>' +
      '<div><span>05</span>非对称 A-C</div><div><span>13</span>表 IV 干预消融</div>' +
      '<div><span>06</span>速度与姿态奖励</div><div><span>14</span>站稳与抗推</div>' +
      '<div><span>07</span>着地与抬脚奖励</div><div><span>15</span>真机表 VI</div>' +
      '<div><span>08</span>对称损失</div><div><span>16</span>局限与代码</div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '30px';
    toc.style.lineHeight = '1.45';
    var rows = toc.children;
    // 淡入按目录顺序：左列 01–08，再右列 09–16
    var order = [0, 2, 4, 6, 8, 10, 12, 14, 1, 3, 5, 7, 9, 11, 13, 15];
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 HugWBC</div><div class="title">一个命令空间，一个策略</div>');
    var items = [
      [ACC, '① 命令 = 任务 + 行为', '速度之外，还能调步频、抬脚、身高、俯仰、腰<br>相位与期望接地概率切出走、跳、站'],
      [GOOD, '② 一个策略，跟得准', '非对称 Actor-Critic + 对称损失<br>走路低速 $v_x$ 误差 0.030 m/s，比 HOVER、ExBody 低'],
      [WARN, '③ 上身随时交给别人', '干预训练：噪声接管 + 课程 + 奖励遮罩<br>被噪声接管时 $v_x$ 误差 0.048，不干预训的 0.866']
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
    /* 下一篇的主题（不写集数）：发布清单里 HugWBC 之后是 HOMIE —— 同一个实验室，把下身控制器接到外骨骼驾驶舱上遥操作 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：HOMIE —— 同构外骨骼加脚踏板，一个人坐进驾驶舱，遥操作人形边走边干活');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · H1 运动学示意的 3D 渲染</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
