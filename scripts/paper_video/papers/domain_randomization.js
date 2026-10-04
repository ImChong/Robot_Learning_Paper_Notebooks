// 域随机化视频的片头 / 总结页（stage.html 在 domain_randomization.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '1703.06907',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    /* 20 个字符的名字：封面 classicCover() 会把字距改成固定 4px 再按比例缩字号，固定字距不跟着缩，缩完会比 980 宽几十像素；
       里层 span 用随字号缩放的 0.016em（250px 时正好 4px），缩放后宽度就严格落在 980 以内 */
    var a = h('div', 'big', root, '<div style="font-size:66px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08"><span style="letter-spacing:0.016em">Domain Randomization</span></div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">域随机化：从仿真迁移到真实世界</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">把仿真画面随机打乱，真实世界只是又一个变体</div>');
    var m = h('div', 'meta', root,
      '<b>Domain Randomization for Transferring Deep Neural Networks from Simulation to the Real World</b><br>Josh Tobin, Rachel Fong, Alex Ray … Pieter Abbeel<br>OpenAI · UC Berkeley · IROS 2017');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>现实鸿沟与第三条路</div><div><span>02</span>每张训练图都随机：七样东西</div>' +
      '<div><span>03</span>相机不标定，在小盒子里随机</div><div><span>04</span>检测器：VGG-16 回归三维坐标</div>' +
      '<div><span>05</span>真机：平均 1.5 cm 以内</div><div><span>06</span>多少才够：张数与纹理种数</div>' +
      '<div><span>07</span>逐项拿掉：干扰物最关键</div><div><span>08</span>真机抓取、局限与之后</div>');
    toc.style.fontSize = '31px';
    toc.style.lineHeight = '1.5';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [26, 40, 40], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 7.0 + k * 0.3, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住域随机化</div><div class="title">不追求仿真更真，而是让它更多样</div>');
    var items = [
      [ACC, '① 随机化渲染，不追求真实', '纹理、光照、相机、干扰物、噪声，每张图都随机<br>真实世界只是又一个变体：零真实训练数据'],
      [GOOD, '② 多样性要靠数量堆', '少于 1000 种纹理明显变差，1 万种约 1.9 cm<br>训练时不放干扰物，真实桌上误差涨到 7.2 cm'],
      [WARN, '③ 真机验证：不用一张真实照片', '物体定位平均误差 1.5 cm 以内<br>Fetch 机器人抓取 40 次，成功 38 次']
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
    /* 下一篇的主题（不写集数）：发布清单里域随机化之后是四足的教师-学生 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：特权教师带学生 —— 四足走上野外地形');
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
