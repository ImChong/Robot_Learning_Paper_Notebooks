// OmniH2O（Universal and Dexterous Human-to-Humanoid Whole-Body Teleoperation and Learning）视频的片头 / 总结页（stage.html 在 omnih2o.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2406.08858',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:118px;font-weight:900;letter-spacing:2px;color:var(--demo-accent);line-height:1.08">OmniH2O</div>');
    var b = h('div', 'big', root, '<div style="font-size:52px;font-weight:900;line-height:1.2">通用灵巧的人到人形全身遥操作</div>' +
      '<div style="font-size:32px;color:var(--text-secondary);margin-top:8px">VR 只给三个点，一个策略管全身</div>');
    var m = h('div', 'meta', root,
      '<b>OmniH2O: Universal and Dexterous Human-to-Humanoid Whole-Body Teleoperation and Learning</b><br>Tairan He 等 · CMU、上海交大 · CoRL&nbsp;2024');
    m.style.fontSize = '27px';
    m.style.padding = '22px 34px';
    /* 十七条目录排成两列：左列 01–09、右列 10–17，单列的话封面上最后一行会落到 3:4 裁剪线以下 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>H2O 留下的问题</div><div><span>10</span>灵巧手与系统</div>' +
      '<div><span>02</span>运动学姿态接口</div><div><span>11</span>表 1 学生追上老师</div>' +
      '<div><span>03</span>站住与蹲住</div><div><span>12</span>表 1 仿真差别小</div>' +
      '<div><span>04</span>每一步最高抬脚</div><div><span>13</span>表 2 真机看得出</div>' +
      '<div><span>05</span>惩罚课程</div><div><span>14</span>一个策略多种接口</div>' +
      '<div><span>06</span>特权教师</div><div><span>15</span>GPT-4o 与数据集</div>' +
      '<div><span>07</span>学生只看三个点</div><div><span>16</span>从示范学自主</div>' +
      '<div><span>08</span>历史代替线速度</div><div><span>17</span>局限</div>' +
      '<div><span>09</span>DAgger 蒸馏</div>');
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
    var head = h('div', 'head', root, '<div class="act">三句话记住 OmniH2O</div><div class="title">一个接口，一个策略</div>');
    var items = [
      [GOOD, '① 运动学姿态是通用接口', 'VR、RGB、语言、GPT-4o、模仿学习<br>都只给运动目标，底层是同一个策略'],
      [WARN, '② 教师看一切，学生看三个点', '913 维的教师 → 1665 维的学生（3 个点 + 25 步历史）<br>DAgger 蒸馏、不要动捕，真机误差降 45%'],
      [ACC, '③ 遥操作数据训自主', 'OmniH2O-6：6 个任务、约 40 分钟<br>扩散策略 8/10，普通行为克隆 1/10']
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
    /* 下一篇的主题（不写集数）：发布清单里 OmniH2O 之后是 MaskedMimic —— 随机遮掉一部分目标，一个策略补全全身 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '29px'; next.style.padding = '14px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：MaskedMimic —— 随机遮掉目标，一个策略补全全身');
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
