// OpenVLA（An Open-Source Vision-Language-Action Model）视频的片头 / 总结页（stage.html 在 openvla.js 分镜之后加载）
window.PaperVideo = {
  arxiv: '2406.09246',
  intro: function (V) {
    var h = V.h, fadeUp = V.fadeUp;
    var root = h('div', 'card');
    var a = h('div', 'big', root, '<div style="font-size:132px;font-weight:900;letter-spacing:4px;color:var(--demo-accent);line-height:1.08">OpenVLA</div>');
    var b = h('div', 'big', root, '<div style="font-size:54px;font-weight:900;line-height:1.2">开源视觉-语言-动作模型</div>' +
      '<div style="font-size:31px;color:var(--text-secondary);margin-top:8px">70 亿参数、97 万条真机示范，一张卡也能微调部署</div>');
    /* 作者行用不换行空格连住，「·」不落到行首；只写共同第一作者代表 */
    var m = h('div', 'meta', root,
      '<b>OpenVLA: An Open-Source Vision-Language-Action Model</b><br>Moo&nbsp;Jin&nbsp;Kim&nbsp;等&nbsp;·&nbsp;Stanford、UC&nbsp;Berkeley、Google&nbsp;DeepMind、TRI&nbsp;·&nbsp;CoRL&nbsp;2024');
    m.style.fontSize = '26px';
    m.style.padding = '22px 34px';
    /* 十七条目录排成两列：左列 01–09、右列 10–17，保持每条短小不折行，封面上字底留足安全边 */
    var toc = h('div', 'toc', root,
      '<div><span>01</span>闭源巨头与开源底座</div><div><span>10</span>Google 机器人 12 题</div>' +
      '<div><span>02</span>一张图一句话 7 个词</div><div><span>11</span>跨机数据与双眼消融</div>' +
      '<div><span>03</span>两双眼睛拼在一起</div><div><span>12</span>Franka 新真机微调</div>' +
      '<div><span>04</span>连续动作怎么变成词</div><div><span>13</span>LIBERO 四个仿真基准</div>' +
      '<div><span>05</span>1%–99% 分位数缩放</div><div><span>14</span>单卡 LoRA 低秩微调</div>' +
      '<div><span>06</span>语言模型怎么学动作</div><div><span>15</span>4 位量化与频率陷阱</div>' +
      '<div><span>07</span>97 万条真机数据配比</div><div><span>16</span>论文与代码的几处出入</div>' +
      '<div><span>08</span>五个关键训练发现</div><div><span>17</span>局限与开源清单</div>' +
      '<div><span>09</span>WidowX 17 个任务</div><div></div>');
    toc.style.display = 'grid';
    toc.style.gridTemplateColumns = '1fr 1fr';
    toc.style.columnGap = '24px';
    toc.style.fontSize = '29px';
    toc.style.lineHeight = '1.45';
    var rows = toc.children;
    // 淡入按目录顺序：左列 01–09，再右列 10–17
    var order = [0, 2, 4, 6, 8, 10, 12, 14, 16, 1, 3, 5, 7, 9, 11, 13, 15];
    return {
      root: root,
      draw: function (st, t) {
        /* 封面（classicCover，34px）上精简机构名，保证 17 条两列目录字底在 1360px 裁剪安全线以内 */
        if (window.__cover && !m.__short) {
          m.__short = true;
          m.innerHTML = '<b>OpenVLA: An Open-Source Vision-Language-Action Model</b><br>Moo&nbsp;Jin&nbsp;Kim&nbsp;等&nbsp;·&nbsp;Stanford&nbsp;等&nbsp;·&nbsp;CoRL&nbsp;2024';
        }
        V.stack([a, b, m, toc], [24, 32, 32], V.SAFE_TOP, V.contentBottom());
        fadeUp(a, t, 0.1); fadeUp(b, t, 0.6); fadeUp(m, t, 1.4);
        order.forEach(function (idx, k) { fadeUp(rows[idx], t, 5.2 + k * 0.1, 0.5); });
      }
    };
  },
  outro: function (V) {
    var h = V.h, fadeUp = V.fadeUp, K = V.K;
    var ACC = V.ACC, GOOD = V.GOOD, WARN = V.WARN;
    var root = h('div', 'card');
    var head = h('div', 'head', root, '<div class="act">三句话记住 OpenVLA</div><div class="title">两双眼睛看图，动作当成词来吐</div>');
    var items = [
      [WARN, '① 双视觉编码器 + 256 格动作词表', 'DINOv2 与 SigLIP 拼空间与语义特征<br>第 1%–99% 分位数抗极值，借用词表末 256 个词'],
      [ACC, '② 97 万条跨机器人真机预训练', '微调视觉编码器、跑满 27 轮到 95% 词准确率<br>29 个真机开箱任务 74.3%，高于 55B RT-2-X 的 57.8%'],
      [GOOD, '③ 单卡 LoRA 微调 + 4-bit 量化推理', 'LoRA $r = 32$ 只训 1.4% 参数（68.2% 对全参 69.7%）<br>4-bit 量化占 7.0 GB 显存，权重与代码全部 MIT 开源']
    ];
    var pts = items.map(function (it) {
      var p = h('div', 'pt', root);
      p.style.fontSize = '28px'; p.style.padding = '10px 30px';
      p.style.borderLeft = '10px solid ' + it[0];
      var n = h('div', 'n', p);
      K.rich(n, it[1]);
      n.style.color = it[0];
      var body = h('div', '', p);
      it[2].split('<br>').forEach(function (line, q) {
        if (q) body.appendChild(document.createElement('br'));
        var span = h('span', '', body); K.rich(span, line);
        if (q) { span.style.fontSize = '25px'; span.style.color = 'var(--text-secondary)'; }
      });
      return p;
    });
    /* 下一篇的主题（不写集数）：发布清单里 OpenVLA 之后是 π₀ —— 视觉语言模型接上流匹配动作专家，一次积分出一整段连续动作 */
    var next = h('div', 'pt', root);
    next.style.fontSize = '28px'; next.style.padding = '12px 30px';
    next.style.borderStyle = 'dashed';
    K.rich(next, '**下一篇**：$\\pi_0$ —— 视觉语言模型接上流匹配动作专家，一次生成一整段连续' + '动作'.split('').join('⁠'));
    var foot = h('div', 'meta', root,
      '<b>完整笔记 · 3 个交互演示 · 十七幕动画</b><br>imchong.github.io/Robot_Learning_Paper_Notebooks');
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
