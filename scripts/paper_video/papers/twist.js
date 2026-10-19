// TWIST（Teleoperated Whole-Body Imitation System）视频的片头 / 总结页（stage.html 在 twist.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2505.02833',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:118px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">TWIST</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">遥操作全身模仿系统</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">穿上动捕服，人形实时做全身动作</div>');
    var m = h('div', 'meta', root,
      '<b>TWIST: Teleoperated Whole-Body Imitation System</b><br>Yanjie Ze 等 · 斯坦福、西蒙菲莎大学 · CoRL&nbsp;2025');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十六条目录排成两列：左列 01–08、右列 09–16，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>遥操作缺全身</div><div><span>09</span>RL+BC 训学生</div>' +
      '<div><span>02</span>三段流水线</div><div><span>10</span>RL+BC 最好</div>' +
      '<div><span>03</span>公开 + 自录数据</div><div><span>11</span>自录数据</div>' +
      '<div><span>04</span>离线与在线重定向</div><div><span>12</span>末端扰动</div>' +
      '<div><span>05</span>跟局部的目标</div><div><span>13</span>链路与延迟</div>' +
      '<div><span>06</span>教师看未来</div><div><span>14</span>四类技能</div>' +
      '<div><span>07</span>奖励</div><div><span>15</span>最难跟的是脚</div>' +
      '<div><span>08</span>学生的观测</div><div><span>16</span>局限与代码</div>');
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 TWIST</div><div class="title">动捕 + 一个全身控制器</div>');
    var items = [
      [ACC, '① 跟局部的目标', '23 个关节角 + 根部的速度、高度、朝向<br>公开动捕离线重定向，自录动捕在线重定向'],
      [WARN, '② 教师看未来 2 秒，学生只看一帧', '学生用 RL + BC：PPO 加上向教师看齐的 KL<br>六项误差都比纯 RL、纯 DAgger 低'],
      [GOOD, '③ 三个让它上真机的细节', '150 段自录动捕（采样时占四成多的回合）<br>训练时推它的手：学会使劲']
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
    /* 下一篇的主题（不写集数）：发布清单里 TWIST 之后是 TWIST2 —— 把动捕场地换成 PICO 头显 + 腿部追踪器 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：TWIST2 —— 不用动捕场地，戴上头显和腿部追踪器，边遥操作边录示范');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · G1 跟踪的 3D 复现</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
