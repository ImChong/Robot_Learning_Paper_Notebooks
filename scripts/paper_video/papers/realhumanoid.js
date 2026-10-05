// 真实世界人形行走视频的片头 / 总结页（stage.html 在 realhumanoid.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2303.03381',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    /* 30 个字符的名字：封面 classicCover() 会把字距改成固定 4px 再按比例缩字号，固定字距不跟着缩；
       里层 span 用随字号缩放的 0.016em（250px 时正好 4px），缩放后宽度就严格落在 980 以内（同四足野外盲走） */
    var a = h('div', 'big', root, '<div style="font-size:54px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08"><span style="letter-spacing:0.016em">Real-World Humanoid Locomotion</span></div>');
    var b = h('div', 'big', root, '<div style="font-size:50px;font-weight:900;line-height:1.2">用强化学习实现真实世界人形行走</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">因果 Transformer 读 0.32 秒历史，零样本走到户外</div>');
    var m = h('div', 'meta', root,
      '<b>Real-World Humanoid Locomotion with Reinforcement Learning</b><br>Radosavovic 等 · 伯克利 · Science Robotics 2024');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    var toc = h('div', 'toc', root,
      '<div><span>01</span>全尺寸人形为什么难</div><div><span>02</span>控制器：16 步历史进因果 Transformer</div>' +
      '<div><span>03</span>两步训练：教师模仿 + 强化学习</div><div><span>04</span>奖励与命令：没有步态库</div>' +
      '<div><span>05</span>仿真：虚拟弹簧与域随机化</div><div><span>06</span>真机：户外一周没摔过</div>' +
      '<div><span>07</span>自然行走：全向、快走、摆臂</div><div><span>08</span>下坡换步态：神经元按地形分簇</div>' +
      '<div><span>09</span>脚被绊住：下一步抬高抬快</div><div><span>10</span>消融、局限与之后</div>');
    toc.style.fontSize = '29px';
    toc.style.lineHeight = '1.4';
    var rows = toc.children;
    return {
      root: root,
      draw: function (st, t) {
        V.stack([a, b, m, toc], [24, 34, 34], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        for (var k = 0; k < rows.length; k++) fadeUp(rows[k], t, 6.4 + k * 0.22, 0.5);
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住这篇</div><div class="title">一个读历史的小 Transformer</div>');
    var items = [
      [ACC, '① 16 步历史进因果 Transformer', '只有 140 万参数，输出 PD 目标和腿部增益<br>在上下文里适应：下坡换小碎步，被绊住就抬高'],
      [GOOD, '② 教师模仿 + 强化学习一起训', 'KL 项的权重训练到一半退到 0<br>25° 坡：联合 0.75、只模仿 0.63、只 RL 0.16 m/s'],
      [WARN, '③ 虚拟弹簧 + 域随机化，零样本上真机', '户外测了一周没摔过<br>仿真里不稳木板：100% 对厂家控制器约 71%']
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
    /* 下一篇的主题（不写集数）：发布清单里真实世界人形行走之后是 OP3 足球 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：51 厘米的小人形学踢足球，技能教师蒸馏 + 自博弈');
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
