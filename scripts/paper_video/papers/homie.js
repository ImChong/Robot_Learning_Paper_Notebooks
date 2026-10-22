// HOMIE（Humanoid Loco-Manipulation with Isomorphic Exoskeleton Cockpit）视频的片头 / 总结页（stage.html 在 homie.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2502.13013',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:118px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">HOMIE</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">同构外骨骼驾驶舱</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">脚踩踏板走和蹲，手臂穿外骨骼</div>');
    var m = h('div', 'meta', root,
      '<b>HOMIE: Humanoid Loco-Manipulation with Isomorphic Exoskeleton Cockpit</b><br>Q. Ben 等 · 上海 AI 实验室、港中文 · RSS&nbsp;2025');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十七条目录排成两列：左列 01–09、右列 10–17，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>两条路各缺一半</div><div><span>10</span>换成 GR-1</div>' +
      '<div><span>02</span>一个驾驶舱</div><div><span>11</span>同构外骨骼</div>' +
      '<div><span>03</span>表 I 对比</div><div><span>12</span>手套与踏板</div>' +
      '<div><span>04</span>下半身用 RL</div><div><span>13</span>263 Hz</div>' +
      '<div><span>05</span>上身姿态课程</div><div><span>14</span>真机任务</div>' +
      '<div><span>06</span>膝角奖励</div><div><span>15</span>一半的时间</div>' +
      '<div><span>07</span>蹲走站轮换</div><div><span>16</span>自主策略</div>' +
      '<div><span>08</span>对称增强</div><div><span>17</span>局限与代码</div>' +
      '<div><span>09</span>图 7 消融</div><div></div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '30px';
    toc.style.lineHeight = '1.45';
    var rows = toc.children;
    // 淡入按目录顺序：左列 01–09，再右列 10–17
    var order = [0, 2, 4, 6, 8, 10, 12, 14, 16, 1, 3, 5, 7, 9, 11, 13, 15];
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 HOMIE</div><div class="title">一个人，一个驾驶舱</div>');
    var items = [
      [ACC, '① 脚踩踏板，下半身交给强化学习', '$C_t = [v_x, \\omega_{yaw}, h_t]$ 走、转、蹲<br>不用动捕：上身课程、膝角奖励、对称'],
      [WARN, '② 手臂穿同构外骨骼，读数就是关节角', '不估姿态、不解逆运动学，263 Hz<br>霍尔手套 15 个自由度，硬件约 500 美元'],
      [GOOD, '③ 遥操作的数据能训出自主策略', '任务用时约为 VR 方案的一半<br>蹲下拿番茄 73.3%，抓放 80.0%']
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
    /* 下一篇的主题（不写集数）：发布清单里 HOMIE 之后是 TWIST —— 动捕实时重定向，一个策略跟住人的全身动作 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：TWIST —— 用动捕把人的全身动作实时搬到机器人上');
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · G1 的 MuJoCo 回放与 3D 渲染</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
