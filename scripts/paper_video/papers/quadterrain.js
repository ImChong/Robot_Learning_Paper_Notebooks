// 四足野外盲走视频的片头 / 总结页（stage.html 在 quadterrain.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2010.11251',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    /* 22 个字符的名字：封面 classicCover() 会把字距改成固定 4px 再按比例缩字号，固定字距不跟着缩；
       里层 span 用随字号缩放的 0.016em（250px 时正好 4px），缩放后宽度就严格落在 980 以内（同域随机化） */
    var a = h('div', 'big', root, '<div style="font-size:62px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08"><span style="letter-spacing:0.016em">Quadrupedal Locomotion</span></div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">挑战地形上的四足运动学习</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">特权教师带本体学生，两秒记忆走进野外</div>');
    var m = h('div', 'meta', root,
      '<b>Learning Quadrupedal Locomotion over Challenging Terrain</b><br>Joonho Lee 等 · ETH · Science Robotics 2020');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>野外为什么难：只能靠身体感觉</div><div><span>02</span>动作空间：相位振荡器 + 足端残差</div>' +
      '<div><span>03</span>特权教师：看得见地形和接触</div><div><span>04</span>本体学生：两秒历史 + 模仿教师</div>' +
      '<div><span>05</span>地形课程：只练刚好够难的</div><div><span>06</span>零样本上野外：表 1 与地下挑战赛</div>' +
      '<div><span>07</span>室内对照：台阶、负重、打滑</div><div><span>08</span>记忆要多长：TCN-1 / 20 / 100</div>' +
      '<div><span>09</span>记忆里装了什么，以及局限</div>');
    toc.style.fontSize = '30px';
    toc.style.lineHeight = '1.45';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [24, 36, 36], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 6.6 + k * 0.25, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住这篇</div><div class="title">仿真简单，也能在野外稳住</div>');
    var items = [
      [ACC, '① 特权教师 → 本体学生', '教师看地形、接触、摩擦、外力的真值<br>学生只读 2 秒本体历史，模仿动作和潜向量'],
      [GOOD, '② 只练刚好够难的地形', '粒子滤波保留可通过性 0.5–0.9 的参数<br>换成均匀采样：18 cm 台阶成功率约 98% → 48%'],
      [WARN, '③ 零样本走进野外', '森林里快 1.7–2.3 倍、运输成本低 26–32%<br>地下挑战赛 4 场 × 60 分钟零失败']
    ];
    var pts = items.map(function (it) {
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
    /* 下一篇的主题（不写集数）：发布清单里四足地形之后是真实世界人形行走 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：全尺寸人形，因果 Transformer 读历史出关节目标');
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
        pts.forEach(function (p, k) { fadeUp(p, t, [1.0, 3.4, 5.8][k]); });
        fadeUp(next, t, 7.0);
        fadeUp(foot, t, 9.5);
        foot.style.transform = 'none';  // 紧挨字幕，只淡入不上滑
      }
    };
  }
};
