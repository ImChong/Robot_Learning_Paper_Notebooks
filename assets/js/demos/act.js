/* Interactive ACT demos for
 * papers/03_High_Impact_Selection/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware
 * （Zhao, Kumar, Levine, Finn · Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware · arXiv 2304.13705 v1，RSS 2023；
 *   项目页 tonyzhaozh.github.io/aloha；代码 github.com/tonyzhaozh/act @ 742c753）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["act"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   act-explainer — 十七幕讲解动画：精细活，低成本硬件做得到吗 → ALOHA：两对主从臂 → 记下什么：4 台相机与主臂关节角 →
 *                   一步错，步步错 → 动作分块：一次预测 k 步 → 时间集成：重叠的预测取加权平均 → 人的示范不唯一 →
 *                   CVAE：给动作一个风格变量 z → 编码器：[CLS]、关节与 k 个动作 → 策略的输入：1202 个 token →
 *                   解码器：一次写出 k 步 → 8 个任务（图 4、图 5）→ 表一：和四个基线比 → 表二与真机的细节 →
 *                   消融：分块与时间集成（图 6a、b）→ 消融：CVAE 与 50 Hz（图 6c、d）→ 局限、代码与之后
 *   act-video     — 同一套十七幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   act-ensemble  — 动作块与时间集成实验台：我们复现的仿真回合里，每一步的 100 个重叠预测、权重与加权平均，开环分块对照
 *   act-tokens    — 形状计算器：相机数、分辨率、k 改了以后各处有多少个 token；复现里解码器的交叉注意力看哪里
 *   act-results   — 论文的数字：表一、表二、图 6 (a)–(d)（照 arXiv 源文件里图 6 的原始数据表），以及我们复现的成功率
 */

(function () {
  'use strict';

  var K = window.PaperDemoKit;
  function assetBase(rel) {
    var cs = document.currentScript;
    try {
      return cs && cs.src ? new URL(rel, cs.src).href : '';
    } catch (e) {
      return '';
    }
  }
  /* 论文图（arXiv 2304.13705 v1 的图 1–7 裁剪）、项目页视频的片段（clips/）、我们复现的仿真渲染（sim/）放在 assets/img/papers/act/ */
  var IMG_BASE = assetBase('../../img/papers/');
  var PAPER_IMG_BASE = IMG_BASE ? IMG_BASE + 'act/' : '';
  var CLIP_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'clips/' : '';
  var SIM_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'sim/' : '';
  /* 机械臂模型的离线渲染（我们做的，model/）：主臂 WidowX 250、从臂 ViperX 300 用 MuJoCo Menagerie 的 trossen_wx250s / trossen_vx300s
     （BSD-3），夹爪、交接、挪方块用官方 ACT 的 MJCF；MuJoCo 自带渲染器，近似正交的相机，透明底。MODEL 里是贴图表的格子尺寸
     和按同一台相机投影到格子里的点（手、关节、目标、方块），以及取自官方仿真人类示范的关节角序列 */
  var MODEL_BASE = PAPER_IMG_BASE ? PAPER_IMG_BASE + 'model/' : '';
  var MODEL = /*MODEL*/{"pair":{"steps":[0,4,8,12,16,20,24,28,32,36,40,44,48,52,56,60,64,68,72,76,80,84,88,92,96,100,104,108,112,116,120,124,128,132,136,140,144,148,152,156,160,164,168,172,176,180,184,188,192,196,200],"every":4,"leader":{"cw":219,"ch":164,"cols":10,"n":51,"hand":[[181.9,61.3],[182.0,61.8],[182.0,62.7],[182.4,62.7],[183.6,63.8],[186.0,65.5],[189.2,71.6],[191.1,79.9],[192.3,87.2],[192.1,93.0],[192.0,96.1],[191.7,99.7],[192.2,101.8],[192.9,104.5],[194.0,107.1],[195.8,110.6],[197.8,113.9],[199.2,118.0],[200.3,121.6],[201.5,124.3],[202.3,127.2],[203.1,130.0],[204.5,133.0],[206.1,135.7],[207.6,136.6],[208.3,137.0],[207.5,137.5],[207.4,136.4],[205.8,135.3],[205.0,132.8],[205.6,129.2],[205.9,127.3],[206.3,126.7],[207.0,125.2],[206.2,125.3],[206.0,125.4],[205.9,127.1],[205.2,130.8],[206.0,132.0],[205.9,133.4],[205.6,136.4],[205.4,141.2],[205.8,144.5],[206.0,147.0],[206.1,148.2],[205.9,148.4],[206.3,147.2],[207.2,144.8],[207.6,142.3],[207.5,140.3],[208.4,136.2]],"base":[90.0,156.0],"ppm":400},"follower":{"cw":266,"ch":193,"cols":10,"n":51,"hand":[[211.1,62.9],[211.3,72.4],[211.7,74.3],[212.1,74.7],[212.7,74.9],[214.1,75.2],[218.2,79.6],[221.2,87.3],[223.2,95.2],[224.0,101.8],[224.1,106.7],[224.1,110.8],[224.1,114.2],[224.7,116.7],[225.9,120.4],[227.7,124.3],[230.1,128.2],[232.6,131.9],[234.3,136.0],[235.8,139.3],[237.4,142.1],[238.4,145.7],[239.9,149.0],[241.9,152.0],[244.8,152.7],[247.5,152.6],[248.5,152.4],[248.2,152.6],[246.9,152.8],[244.7,152.6],[242.5,151.8],[241.9,149.5],[242.3,147.1],[243.0,145.5],[243.2,144.1],[242.5,144.1],[242.6,143.9],[242.2,146.0],[242.3,148.5],[243.0,150.0],[242.7,152.4],[242.6,156.7],[242.7,161.9],[243.5,164.7],[243.8,167.2],[243.5,169.0],[243.4,169.4],[243.6,168.6],[244.3,166.5],[244.3,164.3],[244.3,161.8]],"base":[111.6,183.4],"ppm":400}},"ik":{"cw":405,"ch":192,"cols":10,"n":26,"rate":[0,4.21,4.07,3.95,3.86,3.8,3.75,3.73,3.72,3.72,3.75,3.78,3.84,3.91,4.0,4.11,4.25,4.41,4.63,4.89,5.24,5.7,6.36,7.4,9.38,16.85],"xs":[0.3,0.3185,0.3369,0.3554,0.3739,0.3923,0.4108,0.4293,0.4478,0.4662,0.4847,0.5032,0.5216,0.5401,0.5586,0.577,0.5955,0.614,0.6325,0.6509,0.6694,0.6879,0.7063,0.7248,0.7433,0.7617],"dx_cm":1.8,"kA":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25],"target":[[202.3,85.5],[209.7,85.5],[217.1,85.5],[224.5,85.5],[231.8,85.5],[239.2,85.5],[246.6,85.5],[254.0,85.5],[261.4,85.5],[268.8,85.5],[276.2,85.5],[283.6,85.5],[291.0,85.5],[298.4,85.5],[305.8,85.5],[313.2,85.5],[320.6,85.5],[328.0,85.5],[335.4,85.5],[342.8,85.5],[350.2,85.5],[357.5,85.5],[364.9,85.5],[372.3,85.5],[379.7,85.5],[387.1,85.5]],"ppm":400,"base":[82.7,183.5]},"grip":{"cw":139,"ch":158,"cols":7,"n":21,"g":[0.0,0.1,0.1,0.1,0.2,0.2,0.3,0.3,0.4,0.5,0.5,0.6,0.6,0.7,0.7,0.8,0.8,0.8,0.9,0.9,1.0],"ppm":900,"cube":[71.3,137.6]},"joints":{"cw":301,"ch":300,"cols":1,"n":1,"joints":[{"name":"waist","p":[118.1,221.2],"a0":[118.4,251.3],"a1":[117.9,191.0]},{"name":"shoulder","p":[117.9,197.0],"a0":[141.1,203.5],"a1":[95.0,190.6]},{"name":"elbow","p":[110.5,42.2],"a0":[134.0,47.7],"a1":[87.3,36.7]},{"name":"forearm_roll","p":[182.7,32.6],"a0":[161.4,35.4],"a1":[203.7,29.8]},{"name":"wrist_angle","p":[217.5,28.0],"a0":[240.9,33.2],"a1":[194.5,22.8]},{"name":"wrist_rotate","p":[233.3,49.7],"a0":[219.8,31.1],"a1":[246.7,68.1]},{"name":"gripper","p":[255.2,79.9]}],"ppm":520},"reach":{"cw":233,"ch":171,"cols":1,"n":1,"tip":[217.4,153.7],"base":[74.1,153.7],"table":[217.4,153.7],"ppm":360},"handover":{"cw":332,"ch":129,"cols":5,"n":10,"eps":[0,5,10,15,20,25,30,35,40,45],"steps":[297,358,279,304,300,309,237,305,343,260],"cube":[[163.8,44.5],[156.3,43.2],[160.6,40.3],[157.5,35.7],[163.0,41.4],[162.1,42.9],[165.3,42.9],[165.5,42.4],[159.4,43.8],[155.4,40.3]],"spread_cm":[5.6,6.1,5.0],"std_cm":[1.4,1.2,1.1],"n_all":50},"perturb":{"cw":332,"ch":129,"cols":10,"n":61,"steps":[40,44,48,52,56,60,64,68,72,76,80,84,88,92,96,100,104,108,112,116,120,124,128,132,136,140,144,148,152,156,160,164,168,172,176,180,184,188,192,196,200,204,208,212,216,220,224,228,232,236,240,244,248,252,256,260,264,268,272,276,280],"cube":[[194.4,101.2],[194.4,101.2],[194.4,101.2],[194.4,101.2],[194.4,101.2],[194.4,101.2],[194.4,101.2],[194.4,101.2],[194.4,101.2],[194.4,101.2],[194.4,101.2],[194.4,101.2],[194.4,101.2],[194.4,101.2],[194.4,101.2],[202.7,101.2],[202.7,101.2],[202.7,101.3],[202.9,101.4],[203.0,101.7],[203.1,101.7],[203.1,101.8],[203.2,101.9],[203.1,101.9],[203.2,102.0],[203.1,102.0],[203.1,101.8],[203.1,101.4],[202.6,101.2],[201.3,97.7],[198.9,92.2],[196.5,85.7],[194.1,78.4],[191.7,70.4],[189.5,62.9],[188.2,56.3],[187.4,49.6],[187.2,46.0],[186.8,43.7],[186.2,42.4],[185.2,41.8],[184.4,41.8],[183.7,41.9],[182.9,41.8],[181.8,41.6],[180.7,41.4],[179.4,41.2],[178.0,41.0],[176.6,40.8],[175.0,40.7],[173.5,40.7],[172.4,40.7],[171.7,40.9],[171.6,40.9],[171.4,41.3],[171.4,41.5],[171.2,41.4],[170.9,41.3],[170.9,41.4],[171.0,41.5],[171.1,41.4]],"t_move":100,"shift":[0.04,0.0],"touch":153,"lift":153,"success":246,"tries":9,"ok":3},"gripseq":{"ep":0,"t0":170,"every":2,"lead":[1.048,1.048,1.048,1.048,1.048,1.022,1.0,0.928,0.811,0.653,0.506,0.401,0.305,0.25,0.214,0.21,0.21,0.209,0.209,0.209,0.21,0.209,0.209,0.209,0.209,0.209,0.209,0.209,0.209,0.21,0.209,0.21,0.21,0.21,0.21,0.21,0.21,0.21,0.209,0.21,0.21,0.209,0.209,0.21,0.21,0.21,0.21,0.21,0.21,0.21,0.209,0.21,0.21,0.21,0.21,0.21,0.21,0.21,0.21,0.21,0.21,0.21,0.21,0.21,0.211,0.214],"foll":[0.97,0.97,0.97,0.97,0.97,0.97,0.97,0.97,0.957,0.918,0.852,0.768,0.679,0.605,0.609,0.605,0.593,0.574,0.57,0.571,0.562,0.57,0.571,0.582,0.59,0.596,0.601,0.601,0.607,0.611,0.618,0.621,0.624,0.622,0.623,0.623,0.627,0.633,0.632,0.635,0.636,0.636,0.635,0.637,0.636,0.637,0.636,0.637,0.635,0.637,0.635,0.638,0.635,0.637,0.636,0.635,0.633,0.636,0.636,0.636,0.636,0.638,0.643,0.65,0.66,0.673]}}/*/MODEL*/;
  var el = K.el,
    fmt = K.fmt,
    clamp = K.clamp,
    card = K.card,
    controlsRow = K.controlsRow,
    slider = K.slider,
    buttonGroup = K.buttonGroup,
    statsRow = K.statsRow,
    verdictBox = K.verdictBox,
    note = K.note,
    table = K.table,
    stage = K.stage,
    begin = K.begin,
    line = K.line,
    text = K.text,
    registerRenderer = K.registerRenderer;

  // ─── 论文里的数字（arXiv 2304.13705 v1，读的是 LaTeX 源码；图 6 的数取自源文件 figures/fm_data.pdf 里被裁掉的原始数据表） ───
  var METHODS = [
    { key: 'bc', zh: 'BC-ConvMLP' }, { key: 'bet', zh: 'BeT' }, { key: 'rt1', zh: 'RT-1' }, { key: 'vinn', zh: 'VINN' }, { key: 'act', zh: 'ACT' }
  ];
  /* 表 I：成功率（%）。仿真两项写成 [脚本示范, 人的示范]，3 个种子 × 50 次；真机 1 个种子 × 25 次，只有人的示范 */
  var TABLE1 = [
    { task: '方块交接（仿真）', sim: true, subs: ['碰到', '抬起', '交接'],
      v: { bc: [[34, 3], [17, 1], [1, 0]], bet: [[60, 16], [51, 13], [27, 1]], rt1: [[44, 4], [33, 2], [2, 0]], vinn: [[13, 17], [9, 11], [3, 0]], act: [[97, 82], [90, 60], [86, 50]] } },
    { task: '双臂插销（仿真）', sim: true, subs: ['抓住', '接触', '插入'],
      v: { bc: [[5, 0], [1, 0], [1, 0]], bet: [[21, 0], [4, 0], [3, 0]], rt1: [[2, 0], [0, 0], [1, 0]], vinn: [[6, 0], [1, 0], [1, 0]], act: [[93, 76], [90, 66], [32, 20]] } },
    { task: '拉开密封袋（真机）', sim: false, subs: ['抓住', '捏住拉链头', '拉开'],
      v: { bc: [0, 0, 0], bet: [8, 0, 0], rt1: [4, 0, 0], vinn: [28, 0, 0], act: [92, 96, 88] } },
    { task: '装电池（真机）', sim: false, subs: ['抓住', '放进槽', '按进去'],
      v: { bc: [0, 0, 0], bet: [4, 0, 0], rt1: [4, 0, 0], vinn: [20, 0, 0], act: [100, 100, 96] } }
  ];
  /* 表 II：剩下的三个真机任务（论文写「三个」，表里其实是四个：打开杯盖、穿魔术贴扎带、备胶带、穿鞋），只和 BeT 比；25 次 */
  var TABLE2 = [
    { task: '打开杯盖', subs: ['推倒', '抓起', '撬开盖'], bet: [12, 0, 0], act: [100, 96, 84] },
    { task: '穿魔术贴扎带', subs: ['拿起', '抓尾巴', '穿进去'], bet: [24, 0, 0], act: [92, 40, 20] },
    { task: '备胶带', subs: ['抓', '切', '交接', '挂上'], bet: [8, 0, 0, 0], act: [96, 92, 72, 64] },
    { task: '穿鞋', subs: ['拿起', '套上', '托住', '粘好'], bet: [12, 0, 0, 0], act: [100, 92, 92, 92] }
  ];
  /* 图 6 (a)：不开时间集成、每个 k 单独训一个策略，4 种设定（2 个仿真任务 × 脚本 / 人的示范）的平均成功率（%） */
  var FIG6A = { k: [1, 10, 100, 200, 400], act: [1, 21, 44, 42, 41], bc: [1, 1, 24, 25, 20], vinn: [0, 6, 23, 27.25, 37] };
  /* 图 6 (b)：各自调到最好的成功率，[不开, 开] 时间集成 */
  var FIG6B = { act: [44, 47.3], bc: [25, 29], vinn: [37, 17] };
  /* 图 6 (c)：两个仿真任务合起来，[有 CVAE, 没有 CVAE] */
  var FIG6C = { scripted: [59, 58], human: [35.3, 2] };
  /* 图 6 (d) 与第 V-C 节：6 个人、每人每种 3 次；正文给的平均用时（秒）；5 Hz 比 50 Hz 慢 62% */
  var FIG6D = { zip: [33, 20], cups: [16, 10], slower: 62, n: 6, trials: 3 };
  /* 附录表 III：ACT 的超参数 */
  var HPARAM = [['学习率', '1e-5'], ['批大小', '8'], ['编码器层数', '4'], ['解码器层数', '7'], ['前馈维数', '3200'],
    ['隐藏维数', '512'], ['注意力头', '8'], ['块大小 k', '100'], ['β', '10'], ['dropout', '0.1']];
  /* 第 III 节与附录 A：价格（美元） */
  var PRICE = { viperx: 5600, widowx: 3300, aloha: 18000, alohaAll: 20000, dexpilot: 100000, telekinesis: 18000, shadow: 400000 };
  /* 图 2 右：ViperX 6 自由度臂（从臂）的参数 */
  var VIPERX = { reach: 750, span: 1500, repeat: 1, acc: [5, 8], payload: 750 };
  /* 第 V-A、V-B 节：任务与数据 */
  var DATA = { demos: 50, velcro: 100, sec: [8, 14], steps: [400, 700], min: [10, 20], wall: [30, 60], hz: 50 };
  /* 项目页：真机回放用的块大小是 90，回合 600–1000 步 */
  var PAGE = { chunk: 90, len: [600, 1000] };
  /* 附录 F：两个失败的任务 */
  var CANDY = { pick: 10, pull: 8, unwrap: 0, n: 10, candies: [3, 5] };

  // ─── 我们的复现（不是论文的实验） ───────────────────────────────────────────
  /* 权重：HF lerobot/act_aloha_sim_transfer_cube_human 的 original_act_repo 分支（用官方仓库在 sim_transfer_cube_human 上训 2000 轮），
     safetensors 读进我们照官方代码自己写的前向（CPU）；环境：照官方 sim_env.py 自己写的 MuJoCo 2.3.7 方块交接，资产用官方 XML。
     50 个回合的方块位置按官方 eval_bc() 的随机种子 1000 抽；z = 0。
     te：每步都查询、按官方代码 w_i = exp(−0.01 i) 做时间集成（第 0 个回合）；chunk：每 100 步查询一次、开环执行（同一个方块位置）。
     预测与执行的值都是关节目标（rad；夹爪是 0 合上 … 1 张开的归一化开度） */
  var REPRO = /*REPRO*/{"succ":{"n":50,"chunk":38,"te":41,"chunk_ge":[50,50,42,38,38],"te_ge":[50,47,43,41,41]},"te":{"success":true,"rgrip_pred":"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LzAwMC8vMC4vLy8vLi4tKyssKSsoJycnJiMlJSQkJCYmJScrLjE0OkRDT09edneAhJ+Wrrm4y8zO297o4ufr6Ovq7ezw7Ozv6+7t7ezu8O3q7O3m6Ojo6Ofm4+Lm49zg4dva2y0tLS0tLC0rLCwsLSsrKikpKSYoJiUlJSQiJCQkJCUnKCYpLjE1OEFLS1dYaYCBjZCrpLnCwdPS1eDi6uXq7ers6+/u8e3t7+vu7e3s7vDs6uvs5ejn5ufm5eLh5eDa3t/Z2NkvLy8vLy8vLS4vLy8tLi0rKisoKigmJyYlIyUlJCQkJiYlJistMDQ6RURPUV92d4GFn5awubnMzc/c3+jj6Ovp7Oru7fHt7fDr7u7t7e/x7uzt7+fq6unq6ejl5Ojk3uHi3dzdLi4uLi4tLiwtLS0uLCwrKikpJyknJSYlJCIjJCMjIyUlJCYrLTE1PEZFUVNienuGiqWdtL6+z9DR3+Hp5Ors6uzr7+7x7u7w6+7u7e3v8e3r7O7m6enn6Ofn4+Lm4tzf4dva2y0tLS0tLS0rLCwsLSsrKikoKSYoJiQlJSQiIyQjIyQmJiYoLS8zNz5JSFRWZn9+io6pobnCwtHS1ODj6+Xr7uvt7PDv8u7u8Ozv7u7t7vHt6+zt5unp6Ojo5+Ti5uHc3+Hb2tsrKysrKysrKiorKysqKiknJyglJyUkJSUkIyQlJSYmKSopLTE1Oj5GUVFfXnGJh5WYsqvAyMnV1tji5e3m7e/s7u3w7/Lv7/Ds7+7u7e7x7Ovs7ebo6Ofn5+bj4eXg297f2djaKisrKysrKyoqKiorKSkpJycnJSclJCQkIyIkJSUlJigrKS0yNTo/R1NSYWBzjImXmrStwsrL1tfZ4+Xt5+7w7O/t8PDy7+/w7e/u7u3u8ezr7O3m6Ojn5+fm4+Hl4dze39rZ2ikpKSkpKSkoKCgoKScnJyUlJiMlIyIjIyIiIyUlJiYpLCovNDk9Q0tXVmdkepKQn6C6tMjO0Nra3Obo7+nw8e7v7/Lx8+/w8e7v7+7t7vHs6+zt5ujp5+fn5uLg5d/c3d/Z2dooKCgoKCgoJygoKCgnJyYlJSYkJSQkJCUkJCYoKCkqLjIwNjtBRktVYWByboWcmaiqwrzO1NXe3uDp6vHr8vLv8PDz8vTw8fHv8O/v7u/y7Ozs7Obp6efn5+bi4OXg293f2djZKCgpKCgoKCcoKCgoJycnJSUmJCYkJCQlJCQmKCgqKi4yLzY7QUVMVGNgcm+EnJqnq8K8z9PW3d3f5+nw6fHx7u/v8vHz7/Dw7e/u7u3t8Ovr6+zm6Ojm5ubk4d/k3trc3dfW1ycnJycnJycmJicmJyYmJSQkJSMkIyMjJSQkJSgpKisuMzE4PURHTVZlYnRwhp2bqqzCvdDU1t3c3ufp7+nw8O7u7/Hw8u/v7+3u7u3t7PDr6urr5efn5eXm5OHf493Z293X1tcmJicmJiYmJSYmJiYlJSUjIyQiJCMjIyUkJCYpKSssMDYzOkBISlJbamd6dYykoLCzyMPU2Nrg4OHq6/Hr8vLv7+/y8fLu8O/s7u3t7Ozv6unp6eTm5uTj5OLf3eHb2Nnb1NTVJiYmJiYmJiUmJiYmJSUlIyQlIyUjJCQmJiYoKywuLzQ7N0BGTVBZYXFugXyTqqe0ucvH19ve4uLj7Ozy7PPz8O/v8/Lz7/Dv7O7t7evr7+np6Onk5ebk4uPh3tzg29fZ2tPT1CUlJiUlJSUkJSUlJSQkJCIjJCIkIyMkJyYnKS0uMTI3QTxFS1RWX2d4dYmDnLCtvMDRz93g5Ofn6fDw9fD39vPy8vb19vLz8u/x8PDu7vHs6+vr5ujn5uTl4uDe4tzZ2tvV1dYlJSUlJSQlJCQkJCUkJCQiIyMhJCMjJCYmJigsLjAxNkE7REpTVV9neXSIgpywrrq/0c7d3+Pm5+ju7/Tv9vTy8PH08/Tw8fDu8O7u7ezw6urp6eXn5uTj5OHf3OHb2Nna1NPVJSUlJSUlJSQlJSUlJCQkIiMkIiUkJSUpKCkrLzI0NTtFQElPWVpmbn98j4uitLK/xtXR4uLm6unr8fH28fj39PP09vX28vPy8PLw8O/u8uzs6+vn6efm5ebj4d7j3dna3NXU1iQkJSQkJCUjJCQkJSQkJCIjJCIkJCQlKCgpKi8xNDU7RkFKUFpbZm6AfZCLpLWzwMfV0uLj5+rq7PLy9/H59/X09Pf29/P08/Hz8fHw7/Lt7e3s5+no5+Xn4+Lf5N3a29zW1NYjIyMjIyMjIiMjIyMiIyMhIiMhIyMjJCcnKCovMTQ1O0ZBSlBbXGdvgX+SjKe5tsTJ19Xk5unt7e7z8/jz+fn29fX49/j09fTy8/Hx8O/y7e3s6+fp6Ofl5uPh3+Pd2drc1dTW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Ojk9PD5BQkVLTlBUVmNwcH6Fj4+ZpKaxtsHBy87U29rf4efm7enr7u3x8e/z9fL09PH18fPy8vLu5ujo3uHh39nQ2NDLxMbAxba5uK6qp6Cfm5OSkIyOgYJ+enpxcm5nZWJYWkJBRURHS0xOVFhaXV9ve3uJj5mXoqyvuLvFxs3S1t3c4OPo5u3p6+7s8PHu8vTw8/Lv8+/x8O/v6+Pl5tve3tzVzNTLxsDCu8CxtLOopaGbmpWOjYuGiHt8eHN0a2xpYV5cUlRRT1VUVlpbXmRnaWxtfYeHkpminquztr7Dy8zS1trh4OTn7Orv7e7w7fHy7/L08PPy7vLu7+3s7Ojf4eLW2dfWzcPMw760tq6yo6aklpKQiYeDe3h2cnNmZ2JeXlVVVExJST9AaWZsbG9zc3d9gYSGiJegoKmutbS/xcfN0tjZ3eHk6efs7vLw8/Ly8+/09fLy9PH08uvw7Ovp6Oji2Nrazs/MysG0v7OuoqScno+QjXx4dnBrZmBdWFZVSktHQ0M7Ozw1MjIuLnt4fn+BhoWJkJSXl5qosLC4vcPBy8/Q1drf4OLn6O3r7/D08fTz8/Pu9PXx8fPw8/Ho7uro5uXl3tPV1snJxsS6rresppebk5OEh4Bwa2lkXFlVT0tJRz9AOzg4MTExLSoqKSmFg4mKjZKRl52ipKWntLy8w8fMy9PX19vg5OTl6eru7PDx9PHz9PPy7fP08fDy7/Lw5+3p5uXl5N3T1dbJyMfEuq22rKSXm5OShIeAbmpoYVlUUktHREI6PDc0NC4uLisnJycojYuSkpaamqCnqqyusLzCwsnL0M/W2drc4eTk5ejp7Ort7vDu7/Dv7eju7uvr7Ojs6t/m4d7c3NvUycrLvb25t62eqJ6ViIyDgXR2b11ZV1BJRUM8ODY0Li8rKSgmJiUlIiEjI52boqKlqKmus7W4uLvFycvQ0tbV293e4OXn5+bp6uzr7u/w7u3v7uvm7Ozp5+jk5+ba4NrX1tTVy8DAwrOyrquhkZqPhnd7dG5kZV1MR0ZBOzc1MCsrKSQlIiIhIiIfIR8fISGin6amqaytsre6vL3AyM3O0tTZ2Nzf4OHm5+fm6err6+3u7+3s7u3p5err5+bm4uXk197Y1dPS0ci8vr6wrqqonY2WioBydW5pXl5XR0FBOjUyMCsnJyUiIyAgICIiHyIgICIi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cHBvb29saGdjX1ZVUkc8NykkJRwYGRcVFhESFBIVFRkaFhsgHyEkIyMlJiQlIyMkIiMiIiEgICAfHx4eHh4fHh4fHx8gISEhISEiIiEjIiMiIyMjIyMjIyQkIyMjJCMkJCUkJWtrampqZ2NjXVpRUE1CNjMlISEaFxgWFRYSExUTFhYbHBgeIiEjJSQlJiclJiQjJCMjIyIhISAgHx8fHx8fIB8fICAgISEiIiIiIiIiIyIjIyMjIyMkIyMkJCQkJCUkJCQlJSVsbGtra2hlZGBbVFNPRTo0JyIiGRYWFBMTDxASERMTGBkWGh8eISMiIyQlJCUjIiMhIiIhICAgHx8fHh4eHh8eHyAgICAhISEiISIiIiMiIyIjIyMjIyMjIyQjIyMkIyQkJSQlY2NiYmJfXFtXUkpKRjwyLCEdHhYTFBQSFBESFBMWFhscGR4iIiMlJCQlJSQlIyIjISEhISAgHx4eHh0eHh4fHx8gICAgISEhISEhISEiISIiIiIiIiMiIiMjIyMjJCMjIyUkJV1dXVxcWVVVT0tCQz40KyUdGhkUEhMSERMRExUUFxkdHxwhIyMkJSUkJCUjJCIhIiEhICAfHx4dHh4dHh4eHx8fICAgICEhISEhISEhIiEiIiIiIiIjIiMjIyMjIyQjIyMlJCVbWlpaWldTUk5JQUE9MykkHBgYEhAREA8RDxASERQVGh0ZHiEhIiMjIyMkIiMhISEgICAfHh4eHR0dHB0eHh8fHyAgICAhISEhISEhISIhIiEiIiIiIiIiIiMiIiIjIiMjJCMkUlJRUVFOSklDPzY3MyoiHhgVFRERERIRExIUFhYZGx8hHiIkJCQlJCQkJCMjISEhICAgHx4eHh0eHh0eHx8gHyAhISEhISEhISEhISEhISIhIiIhISIiIiIiIiIiIyIjIyQkJFpZWVlYVlJRTEc/QDwyKSQdGhoVExMTEhQSExQVFxgdHxsgIyMjJCQkJCUjJCIhIiEgICAfHx4dHR0dHR4eHx8fICAgISEhISEhIiIhIiIiIiIjIiIjIiIjIyIiIyMjIyMkJCRaWlpZWVZSUUxHPj87MikkHRoaFBMTExITERMUFBYYHB4bHyMiIyUkJCQlIyUiIiIhISEgHx8eHh4eHR4eHh8fHyAgICEhISIiISIiIiMiIiIiIyMiIyMjIyQjIyMkIyMkJSQlT09PTk5LR0Y+OjIyLiYeGxYUEw8PEBAQExETFRYYGh4hHiIkJCQkJCMjIyIjICAhIB8fHx4eHR4eHh0dHx8gHyAhISEhISEhISEiIiEiIiIiIiIjIiMjIyMjIyMjJCMjIyUkJU5OTk1NSkZFPjoxMy4mHxoVExIPDxAQEBIRExQVFxkeIB0hIyMjJCMiIiIhISAgIB8fHh4eHR0dHR4dHh8fIB8gISEhISEhIiEhIiIhIiIiIiIiIyIjIiMjIyMjIyQjIyMkJCRRUVFRUE5KSkM/NzgzKyIcFxQTDw4PDw8RDxESExUXGx4bHyIhIiMiIiIiISEfHx8eHx4eHR0cHBwcHBwdHR4dHh8fHyAgICEhISEhISIhIiEiIiIiIyIiIyMjIiMjIyMjJCQkPj49PTw5NTUtKSEhHxkWExISERESFBQUFxcaGxweICIkIyQkJCMiIiEhIB8fHh4eHh0dHR0dHR0dHh0eHx8gICAgICAgICEhICEhISAhISEhISEhISIhIiIiIiIiIyIiIiQjJEtLS0pKR0NCOjYtLCoiHRgVFBMRERITExQTFhcYGRwfIh8jJCQkIyMiIiEgIR8fHx8eHh4dHR0dHR0dHR4eHx8gICAgICEhISEhISEgISEhISEhISEhISEhIiEhIiIiIiIiIiI3Nzc2NjMwMCckHR0bGBUTExQTExQWFxcaGh0eICAiIyUkJSQkIiEgHx8eHh4dHRwdHBwbGxsaHB0dHB0fHyAfICAgICAgICAgICAgICAgISAhICAgISEhISIhISEiISIhIyIjMTEwMC8sKSkgHhkYFxYVExQWFRYXGRoaHB0fICEhIyMlJCQkIyEgIB8fHh0dHBwcGxsbGhobGhwdHRwdHx8fHx8fHx8fHyAfHx8fHx8fHx8fHx8eHx8fHx8gHh8fIB8gHyEgIS4uLi0tKicmHRsWFhQTEhESFBMUFRgYGRsdHyAhISMjJSQkIyMhHyAeHx0dHRwcGxsbGhoaGhkaGxwbHB0dHh0eHh4eHh4eHh4eHh4dHh0eHh4eHh0eHh4eHx4eHh8eHx4fHyApKSkoKCUiIhoZFRQUExMSFBYWFxgbGxsdHyEhIyIkIyUkJCMjISAgHh4dHh0dHRscGxoaGxsaHB0dHB0eHh8eHh4fHh4fHx8eHx8eHh4eHh4eHh4eHx4eHh8eHh8fHx8fICAgJCQkIyMgHx8bGhgYGBgaGRweHR4eISEhIiQlJScmJiUmJSQkJCIhISAgHx8fHx4dHh0dHh4fHh8gISAhIiEhISEhIiEhISEhICAgICAgICAgICAgICAgICAhICAgISEhISIiIhwcHBwcGhsaGRkaGhocHx4gIiIjIyYlJiYnJyYnJiQjIyMiIiIhICAfHx4fHh8eHh4eHh8fIB8gISEgISEhISEhISEhICEhISAgICAgHx8fHx8fHx8fHx8fIB8fHyAfIB8iISEWFhcXFxYXGBoaHB0cHyIhIyQlJiUnJiYmJyckJSQjIiIiISEgIB8gHh4eHx4fHx8hIB8gISEhISIiISEiIiIiISEiISEhIiEhICAgICAgICAgICAgICAgICEgICAhISEhIiIiFBUVFRUVFhcaGh0dHSAjIiQlJScnJycmJiYlIiMiISAgIB8fHx4eHh0eHR4eHx4fISAfICEgICAhISEhISIiIiEhIiEgISIhISEgICAgICAgICAgICEhICEhICEgISEhISIhIRoaGxscGxweISEjJCMmKCcoKSkrKikqKCgnJyMjJCIiISIhISEhICEgISEiIiMiIyQjIyMkIyMjJCQkJCQkJSUkJCUkIyQlJCQkIyMjIyMjIyMjIyMjIyMkJCMjIyQkJCMlJCQbGxsbHBscHiEhIyQjJicnKCkoKiooKSgoJyYjIyMhISEhICAgICAgICEhIiEiISIjIiIiIyIiIiMjIyMjIyMjIiMjIiIiIyIiIiIiIiIiIiIhIiIiIiIiIiIhIiIiIiIiIyIiGRkaGhsaHB0gICIiIiUmJScnJygoJygmJSQkICAgHh0dHh0dHR0dHR0fHx8fIB8hISAgICIfICEhISIiIiIiIiEhIiEhISIhISEhISEgISEhICEhISAgICAgICAgICAgICEgIBoaGxscHR4gIiMlJSUmJicnJyUoJyUmJCQjIh8eHx0cHR0cHR0dHR4eHx8fHyAfICAgICAhICAgISEiISEhIiIhISIhISIjIiIiISIhISEhISEhISEhISEiIiEhISIiIiIiIiIZGhsbGx0eICEiJCQkJiYnJiYkJyckJSIiIiEeHR4dHRwcHB0dHh0eHh8fHx8gHyAgHyAfIR8fICAgICAgICEhICAhICAgIiEhISAhICAhISEgISEhICEhISEhISEiISIhIiIhIiIjIyQlJSYmJicoKCgoKScnJScmJSYjIyMiIB8gICAgICAhISIhIiIjIyMjIyMkJCQkIyQjIyQkJCQkJCQkJCMkJCQjJCUkJCQjJCQjJCQkJCQkJCMkJCQlJCQkJSQlJSUlJSIjIyMkJSYmJiYnJycnJygmJiQmJiQlIiIiIR8fHx8fHx8fHyAgHyAgICAgISEgISEhISEiISAhISEhISEhISEhISEhISEiISIiISIiISIiIiEiIiIiIyIjIyMjIiQjJCMkJCQiIiMjJCUmJiYmJycoKCcoJiYkJyckJSMjIiIgHyAgICAgICEhISEiIiIiIiIiIiIiIiIiIyIiIiIiIiIiIiIiIiIjIiIiIyIjIyIjIyIjIyMiIyMjIiMjIyQjJCMkJCQkJCQkISIjIyQlJSYmJicnJycmKCYlJCYmJCUjIyMiISAhISAgICAhISEhISEhIiIiIiIiIiIiIiIiISIiIiIiIiIiIiIiIyMiIiMjIyMjIyMjJCMkIyQkJCMkJCQlJCQkJSQlJSUlJSQkJSUlJiYnJiYnJycnJicmJSQmJiQlIyMjIiEgISAgIB8gICAhISAhISEiIiIhIiIiIiIjIiIjIiIjIiIiIiMiIiMjIyMjIyQjIyQkJCQkJSQkJCUkJSQlJSUlJSYlJiUmJiYkJCQlJSYmJycmJycoJyYoJiYkJyckJSQkJCMiISEhISEgICEhIiEiIiIiIyMjIyMjIyMjJCMjIyMjJCMkJCQkJCQkJCQkJSUlJSUlJSUmJSYlJiYmJSYlJiYmJiYmJiYmJycmKCkoKSgpKSkpKSoqKikoKikoJykpJygmJiYmJSQlJSQkJCQlJSUkJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSYmJSUlJSYmJiYmJiYmJiYnJicnJyYmJycnJycnJygpKSkpKSkoKCgpKSkpKCkoJycoKCYnJiYlJSQkJCQkJCQkJSUlJSUlJSUlJSUlJSYlJSUmJSUlJSUlJSUlJSUlJSUlJSUmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJyYmJicpKikpKSkpKSgpKSkpKCcpJyYmJycmJiUlJSQkIyQkJCQkJCUlJSQlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSYmJiUlJiYmJiYmJiYmJicmJycnJycnJycnJycnJycnJycnKSopKSkpKSgoKCkoKCgnKCcmJSYmJSUkJCQkJCQkJCQkJCQkJCUkJSUlJSUlJSUlJSUlJSYlJSUlJiYmJSUmJiUmJiYlJiYmJiYmJiYmJiYnJiYnJyYnJicnJycnJycnJycnJykqKSkpKSkoKCgpKCgoKCkoJyYnJiUlJSUlJCQkJCQkJCQkJCUlJSUlJSUlJSUlJSUlJSQmJSUlJSYlJiUmJiYmJiYmJSYmJiYmJiYmJiYmJiYmJyYnJyYnJiYmJiYmJycmJicqKysrKioqKSkpKSkpKSkpKSgoKCcnJiYlJiYlJSUlJSUlJSYmJiUmJiYmJiYmJSUmJSYlJiUlJSYmJiYmJiYmJiYmJiYmJicnJycmJicnJycnJycnJycmJyYnJiYmJicmJiYnKysrKyoqKikpKSkpKSkoKSgnJycmJiYmJSUlJCQkJCUlJSUlJSYlJiUlJSUlJiUlJiUlJSUlJSUlJiUmJiYmJiYmJyYmJicnJycnJyYnJycnJycoJycnJycnJycnJycnJycnJyorKiopKSkoKCgpKSkpKSkoKCgnJyYmJiUmJiQkJCQkJSUlJSUmJSYlJSYmJSYlJSYlJSUmJSUmJiYmJiYmJycmJycnJicnKCcnJycnJygoKCcnKCgoKCcoJycnJycnJycmJicoKSkoKCgoJycnKCgoKCgoJycmJiYmJSUkJCQjIyMjIyMkJCQkJCQlJCQkJCQlJCQlJCQkJSQkJCUlJSYlJiYmJiYmJiYmJicnJyYnJyYnJycmJicnJiYmJiUmJiUlJSUlJCQlKCkpKCgoKCcmJicnJycnJyYmJSUlJCMjIyMjIiIiIiIiIyIjIyMjIyMkJCQjJCQjJCMjIyMkIyMjJCMkJCQkJCUlJSUlJSUmJiYmJiYlJiYmJSUlJSUlJSQjJCQjIyMjIiIiIygpKSgoJygnJiYmJiUmJiYmJSUlJSQiIyIiIiEhISEhISIiIiIiIiMjIyMjIyMjIiMiIyMjIyIiIiMiIyMjIyMkJCQkJCQkJSUlJSUlJCQkJCQkJCQjIyMjIiMjIiIiIiEhISInJycnJyYnJiYmJiYmJiYmJSUlJCQkIyQiJCMjIyMjIyMjIyMjIyMkIyQkJCQkJCMkIyMjJCQjIyMkIyQkJCQkJSQlJSQlJSUlJSUlJSUlJSUkJSUlJCQkJCMkJCMjIyMjIiIjKCgoJycmJyYmJiYmJiYmJSUkJCQkIyMkIiQjIyQjJCMjJCQjJCQjJCQkJCQjJCQjJCMjJCQkJCMjJCMkJCQkJCUkJSUkJSUlJSYlJSUlJSUlJCUkJCQkJCQjJCQjIyMjIyIiIygoKCgnJycnJiYmJiUlJSQkIyMjIyIiIyIkIyMjIyQjIyQkIyQkJCQkJCQkIyQkIyMjJCQkJCQkJCQjJSUkJSQmJSUlJSUlJiYmJiUlJSYlJSQlJSUkJCQkIyQkIyIjIyIiIiIsLSwsLCssKyopKSkoKCcnJiYlJSUkJSUkJiUmJiUmJSUmJiUlJiUmJSUlJSUlJSQlJSUlJSUlJSUmJCYmJiYlJyYmJyYnJicnJycnJyYmJiYlJSUlJSUkJSQkJCMjIyQjIyIjLS0tLCwrKysqKikpKSgoKCcmJiUmJSYmJicnJiYmJyYmJiYmJiYmJiYmJSYlJSYlJSUmJiYmJiUlJiUmJiYmJicnJycmJyYnJycnJiYmJiYmJSUlJSUkJCQjJCQjIyMjIiIiIiwsLCsrKiopKCgnJyYmJSUkJCQkJCQlJSUmJSUlJSYlJSUlJSUlJSYlJSUlJSUlJSUlJSUmJiUlJSYlJicmJiYnJicnJicmJicnJyYmJiYlJSQlJCUkJCMkIyQjIiIjIyIiIiIpKSkpKCgoJyYmJSUkJCMiIiIiISIiIyQjJSQkJCQlJCQkJSQlJSUmJSYlJiUmJiUlJSYmJiYmJiYnJScnJycmKCcnKCcoJycoKCcnJyYnJiYlJSUmJSQkJSMkJCMjIyMjIiIiKysrKiopKSgnJyYlJSQjIyMjIyIiIiMkJCUkJSUlJSUkJSUlJSUlJiUmJSYlJiYmJiYmJiYnJyYmJyYnKCcnJygnKCgoKCcoKCgoJycnKCcnJSYmJiYlJSYkJSYkJCUlJCQjJCcnJyYmJSUkJCMjIyMjIyMjIyMiIyMkJCQlJCUlJSUlJCUlJSUlJSYlJiUmJSYmJiUmJiYnJycmJicmJycnJyYoJycoJycmJycoJycnJycmJiUmJSYmJSUmJCUlJCMlJCQjJCQkJCMjIyMiIiIhISIiIiEhISIiISMiIyQkJSQlJSUlJSUlJSUlJSUmJSYlJiUlJSUlJiYmJiYmJiYmJSYnJicmJyYmJycnJSYmJyYmJiUmJSQjJCQkJCMjIyIjIyIhIiIiISIiJCQkJCQkIyMkIyMjIyMiIiMjIyMkJCQlJSUlJSUlJSUlJSUlJiUlJSUmJCYlJSUlJSUlJSYlJSUlJSQlJSQlJCUkJCUkJCIiIyMiIiIiIiEgHyAfICAfHh8eHx8fHh8fIB8hIiUlJSUlJSUkJSQlJCQkIyMkJCQkJCQlJSUlJSUlJSYlJSUlJiYlJSYlJiQlJSUlJSUlJSUmJSUlJCUkJSUkJSQlJCMkIyMiIiIjIiEhISEgHx8gHx8fHx4fHyAgICAgIiMiJCYmJiYmJiYlJSUlJSQkJCQkJCQkJCQlJCUlJSUlJSUlJSUlJSYmJSUmJSYlJiUmJiUlJSUmJiYlJSUmJCUmJSUkJiQjJCQjIiIjIyIiISIiICAfIB8gHx8fHx8gICEgICIjIiQmJycnJycnJiYmJSYlJSUkJCQjJCQkJCQlJSUlJSUlJiYlJiUmJiYmJiYmJSYlJiYlJSUlJiYlJSQkJSQkJSQlIyUjIiMjIiEhIiIhISEhISAgHyEgICEhISIiJCQmJSUrLCstMiYmJiYmJiUlJSUlJCQkIyMjIyMjIyMjIyQkJCQkJCUkJCQkJSUlJSUlJSQlJSUlJCQlJSUlJSQkJCUjJCUjJCMlIyIjIyIhISEhISEgISEfHx8gHyAgISEhIiMjJiUlKiwqLDEnJyYmJiYlJSUlJSQkIyMjIyIjIyMjIyMjJCMjIyQkJCQkJCUlJSUlJSUkJSUlJSQkJSUlJSUkJCQkIyMkIyMiJCIhIiIhICAgISAfHyAgHh4eHx4fICAgISMkJCcmJiwuLS41JicmJiYmJSQlJCQkJCMjIyMiIyMjIyMjIyMjIyMjJCQkJCQkJSQkJSQlJCQkJCUkJCQkJCQkIyMjJCIjJCIjISQiISIiISAgICAfHx8fIB4eHh8fHyAhISIkJCUoJycuLy8wNyYmJiYmJiUlJSQlJCQkJCMjIyQkJCQkJCQkJCQkJCUkJCQkJSUlJSUlJSUlJSUlJCQlJSUlJSQkJCUjJCUkJSMmIyMkJCMiIiIjIiIiIiIhIB8hICEhISEiIyQkJyUlKiwrLDInJycnJyYmJSYlJSUlJCQkIyMjIyQkJCQkJCQkJCQlJSQkJCUlJSUmJSUlJSUlJSQkJSUlJSUkJCQkIyMkIyQiJCIiIiIiICAgICAfHx8fHh0dHx4eHyAgISMkJSgnJi4wMDE5JygnJycnJiUmJSUlJSUkJCQkJCQkJCQkJCUkJSQlJiUlJSUmJiYmJiUmJSYmJiYlJSUlJSYlJCQkJSMjJCMkIiUiISEhIR8fHh8eHh4eHx4eHSAgICEkJSUqKy0yMTA8Pj8/SikpKCgoJyYmJiYmJSUlJSUkJCQkJCQkJCQlJSUkJSYlJSUlJiYmJiYmJiUmJiYmJSUlJSUmJSQkJCUjIyQjJCIkISEhISAeHh4fHh4eHx8fHx8hIiIlKCoqMTM3PDo6SUtPTlonJycnJiYlJSUkJCQkJCQjIyMjIyMjIyMjJCMkIyQkJCQkJCUlJSQlJCUkJCQlJCQkJCQkJCQjIiIjIiEiIiIgIx8eHx8eHBwcHBwcGx0cHBwdHx8gISUmJiwvMjY2NUNFSEhUJycmJiYlJCQkIyQjIyMjIyIiIiMjIyIiIyMjIyMjJCQkJCMkJCQkJCQkJCQkJCQjIyMjIyMjIiEiIiEgISAhHiAeHR0dHBsbGxsaGxobGxsbHB4eHyEkJiYuLzM5NjZFSEpJVicnJiYmJSQkJCMkIyMjIyMiIiIjIyMjIyMjIyMjJCQkJCQkJSUkJCQkJCQkJCQkIyMjIyMjIyIhIiIgICEgIR4hHh0dHh0cGxscGxwbHh0eHh8iIyQnKiwuNjk9QUA/T1JVVGAnJyYlJSQkIyMjIyIjIiIiIiIiIyMjIyMjIyMkIyQkJCQkJCUlJCQkJCQjJCQkJCMjIyMjIyMhICEhIB8gICAdHx0dHR4dHBscHR0dHiIhIyYqLi4wNjs/QklPU1hXV2dscG96JiYlJCQkIyMjIiMiIiIiIiEiIiIiIiIjIyMjIyMkJCQkJCQkJSQkJCMkIyQkJCQjIyQjIyMjISEhIiAgISAhHSAeHh0eHRwbHB0dHR0hICIkJissLTI3OjxESEtSUFBfZWdmciYlJSQkIyIiIyIiIiIiIiIhIiIiIiMjIyMkIyQjJCQkJCQkJSUlJCUkJSQkJCQkJCQkIyQkIyIiISIhICEgIR4gHh4eHh0cGxscGxsbHRwdHh8jIiMmKy0uNTk7QkBATlZWU2AlJSQjIyMiIiIiIiEhIiIhISEhIiIiIiMjIyMjIyQkJCQkJCQlJSQlJCUkJCQkJCQkJCQkJCQiIiIjISEiISEeIB4eHh4dHBsbGxobGhwcHB0eISAiIykrKzM3OUE/PkxVU1FeJSUkIyMjISEiIiIhIiIiIiEhIiIiIiIjIyMjIyMkJCQkJCQkJSUkJSQlJCQkJCQkJCQkJCQjIiEhIiAgISAgHR8dHRwdHBsaGhsaHBwfHh8jIygoKi42OTpDSExSUlJgaGhndCYmJSQkJCMjIyMjIyMjIyMiIiMjIyMjJCQkJCQkJCUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJCMjIyMiIiMiIh8gHh4eHh0cGxscGxsbHBwcHR0gICIjKCoqMzU4Pj09SVJRUFsnJyYlJSUkJCQkJCMjJCMjIyMjIyQkJCQkJSUlJCUlJSUlJSYmJiYmJiYlJiYmJiUmJiYlJiUkJCQkIyIjIyMfIR8fHh8eHRwcHBwdHB8eHiEhJiUoKTAzND1BRExLSlhhX19rJiYlJCQkIyMkIyQjIyMjIyMjIyQkJCQkJSUlJSUlJiUlJSUmJiYmJiYmJSYmJiYlJSYlJSUlJCMjJCIiIyIiHyEeHh4fHR0cHBwcHBwfHh8hIicmKSsxNTU/QkZNTE1aYWFhbCYlJCMkJCMiIyMjIyMjIyIiIiMjJCMjJCQkJCQkJSUlJSUlJiYmJSYlJiUmJiYmJiUmJiUmJSQjIyQjIyMjIx8hHx8fIB4fHR0eHR8gIyIkKSswMDQ3QERFT1JXXl5fbHR1dn8nJyUkJCQjIyQjJCMjIyMjIyMjJCQkJCQkJSUlJCUmJiUmJiYnJyYnJicmJiYmJyYmJyYmJiYkJCQkIyMjJCMgIR8fHyEfHx0eHh4gICQkJiwuNDQ5PkVLTFZaXmZnZ3V/foCJKCclJSUlJCQkJCUkJCQkJCMjJCQkJCQkJSUlJSUmJiYmJiYmJycmJyYnJiYmJycmJicnJiYmJSQkJSMjJCQkICIgHx8hHx8dHR0eHh4gISElJiwrMDM5P0BKTVFYWVlocHByeycnJSUlJCQkJCQkJCQkJCQjIyQkJSQkJCUmJSUlJiYmJiYmJycoJicnJyYnJycnJicnJyYnJiUjJCQjIyMkIyAhHx8fIB4fHR0eHx8gJSYoLjA2NTtCR09QWl5jamtre4aFhpAmJiUlJSUkJCUlJSUlJSUlJSQlJSYmJiYmJiYmJicnJyYnJicnKCcnJycmJycnJyYnJycmJiUkIiMjIiEiIyEeHx4eHh8eHx0eHyAiJCorLjc6QD9FTFJaWmdobXZ3d4eQkJKZJiclJSYlJSUlJSUlJiUlJSUlJiYmJiYmJycnJyYnKCgnJycoKCgnKCgoJycnJygnJycnJSYlIyIiIyIhIiIhHh8eHh4fHiAeHyEhJCcuLjQ8QEVGSlJYYWBtbnV8fn+Pl5eaoScnJiYnJiYmJiYnJycnJycnJycoKCgoKCgoKCgoKSkpKSkoKSkpKCkoKSgoKCgoJygnJyYmJSQiIiMjISIjIR8gHx8fIiAjISQmKCwyOzpFTE9VVlliaHFxfX+Gjo6Qn6amqa4mJyYmJiYmJiYmJiYnJiYnJycnJygoKCgoKSkoKCkqKSkpKSoqKikqKSopKSkpKSgoKCcmJyUkISIjIiEhIiEfHx8fICMiJSMoKy0xOUNCTFVZXV5ka3J7e4eJj5iZm6iurrGzKCgoJygnJycnJycoKCgoKCgoKCkpKSkpKSoqKikqKioqKioqKysqKioqKSkqKSkoKSgnJSYkIyAhIiIhISMhICEhIyQnJysqMzc6P0lUUl5na29xdn+Ejo6am6Kqq663urm7uicoJycnJycnJycnJygnJycoJygpKSkpKSkqKiopKioqKioqKiorKSopKikoKSkoJygnJiQlIyIfICAgHx8hHx0fHx8gIyMmJiwxMzlBTUtZYGZoa3F6f4mIlZadpKaptLm4uronJycnJycnJycnJycnJycnKCcoKCkpKSkpKiopKSoqKioqKioqKykqKSopKSkpKCcoJiYkJSIiHiAgIB8fIR8eHx8hISUlKSkvNTc+RlRRYGZtb3N4goaQjpudo6usr7m8ur29KCgoKCgoKCgoKCgoKCgoKSkoKSoqKioqKisrKysrKysrKysrKywqKyorKSkpKSgnKCYlIyQiIR4fICAfHyAgHyAhIyQnKCwsMzk8QkpWVGJpb3J1eoKGkJCcnqSsrK+3urm6uSkpKSkpKSgoKSkoKSkpKSkqKSoqKiorKysrKysrKysrKysqKysrKSooKScnJyYlJSQiIR8fHR0aHBwdHR0fICEkJCksMDM5OEJJTVRbaGZ3e4OGiYuVmaCirK6xt7a3u7u6urcpKSkpKSkpKSkpKCkpKSkpKSkpKioqKisqKysrKysrKysrKisqKikpJygmJiYlIyMiHx8dHRsbGhscHh4gISUnLC0zNz1BRkVPWF1la3h2hYuTlpmao6qusLi5ur+8vb69u7u3KCgoKCgoJycoJycoKCgoKCgoKSkpKSoqKiorKiorKysrKioqKiopKScoJiYnJiQkIyEgHh8cHBocHR8eISElJioqMDQ5PEBAS1JWXmVycH6GjpGTlZ6kqKy1tbe9u7y+vbu8uCgoKCgoKCgoKCgoKCgoKCgpKCkpKSkqKioqKioqKioqKikpKSkoJiYkJSMjIyIfHx4bGxkaFxkYGRseHiIjKSovMDY9QkRJSVRdYmlufHmIkJeanp6nrLCyubi5vbq6ube3tbMqKioqKioqKioqKioqKioqKikqKioqKioqKysrKysrKisqKSkpKSYmJCUiIiMhHx8eGhoZGhgbGxwfJCQqKTM1PDpBSk5QVlZha3F3f4qJlp6lqaursri3ucC9vMC8vLm1trSxKysrKysrKysrKysrKysrKysrKywsLCwsLCwsLCwsKysrKigpKCglJSIjICAgHhwcGxgYGBsYHiEhJy4uNDZBQ0pJUllgYmdncnuCiJCam6Sqs7W3trm+urvBvbq+uLm0sbKwrisrKysrKysrKysrKysrKysrKysrLCsrKysrKysrKiopKSgnJyYmIiMfIB4dHRsZGhkXGRoeHCMqJy84OEBDTVBWVl9lbHBydX+HjpSbpKWrs7m7uru7v7m7wLq4ubS1sK2trKorKisrKysrKysqKioqKioqKioqKioqKioqKiooKScnJiYkJCMhIR0eGhoYGBgXFxcYGRwfJyQwOTQ/SExRWV9jaWhyeYGFh4mUnKKprbW3t7y/wb2+vb62t7y1s7OvsKuqqqmpKysrKysrKysrKysrKysrKyoqKioqKioqKioqKSknJyYmJCQjISEdHhoaGBgZFxgYGRwfISgnMjo1P0lOVFtgZGlqc3qEh4eKlJuhqK20tbS6vb+7vLu7tbW5srGxra6pqKmopysrKysrKysrKysrKisrKysqKisrKysqKioqKikqKCgnJyUlJCMjHyEdHRsaHBoaGhocHyEmKDE5NkFKTVJbX2Rra3N5hYiIjJeboKiss7S0uby+u7u6u7W2urOxsa2uqqmpp6crKysrKysrKysrKyoqKyoqKioqKioqKioqKSkoKCYmJSYkIyIhIR4eGxsaGRsbHB0fIycqMTI+R0NMVlthaWxyd3aAhY+SkpefpKivsbe4tbq6vrm4ubiys7ewr66qrKinqKam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LCwrKygpJyMiIB8fHBoZHBsaHBwgIiMnMDc6P0RGS1BSXF5gaHVpfXp+jI6PnqOoqq6vt7a3urq4s7axq6mnraampqalpaOkpKWkpaSkpaWmpqWnp6ampqanp6enp6anpaWlpCsrKikmJyUgHx0cHBsZGRwcHB8gJSkqLzlAQ0lOUFZaXGZpanSCdYmHi5ebnKqtsbK3trq5ury6urK1sKqpp6ynp6inp6elpqampaempqemp6inqamoqKeoqamoqainp6ampaUrKikoJCYkHx4cGxwaGRoeHx8jJCguLzZBR0pRVVdeYmNucXJ8i3+SkpafpKOwsbW2uLe7uLm5t7evsaypp6aqpqampqampKWlpaSnpqanpqeopqmoqKinp6ioqKiop6elpqWkKiooJyMlIh4eHBsbGxscICMjKSsyNzhBSk5UWV5fZWtsdnl7hpOHm5qepquptba4ubu5vLm6ure3sLKtqqqorKipqampqaeoqKinqqmpqqmrq6msrKuqqqqrq6qrqqmpqKinpysqKSgjJSIfHhwbHBwcHiIlJSstNDs7RE1RVlthYWdtb3l9foiXip6doqqsq7e2ubq7ubu4uLe0ta6wrKmop6unqKioqKinqKeop6qpqaqqq6uprayrq6qqq6uqq6qqqqiop6crKSgnIiQiHh4cGx0dHiAlKisxMzpAQUlTVl1iZ2dtcnWAg4WQnZKmpamvsLC5uLm7u7i7tra0srOsrquoqKaqp6ioqKiop6ioqKeqqamqqqurqa2sq6uqqaurqquqqamop6emKiknJSEiIB0dGhkbGxwfJCgpMjM6P0BHUlVbYGVna3FzfoCEjZuPo6Kmrq6vuLe4ubm3urW1s7Kyq6ypp6alqKWmp6ampqWmpqemqaioqKmqqqisq6qqqaiqqqmqqaiopqalpSgnJSQfIB8bHBoaGx0gIikvMDk8Q0dHT1pdY2hsbXJ4eoaIjJWjl6qpr7Kzs7q4urm7uLq1tbOwsKurqaampaimpqenp6emp6enpqmoqKmpqqqorKuqqqmoqqqpqqmpqKenpqYnJiQiHh8eHBwaHB0gJSkxOTlCRUxRUVhlZ2tyd3Z7gYSRk5egraKzsrm4uLi9uru7u7e3s7Kwra6qqqinpqaop6eoqKioqKioqairqqqrq62sqq6trKuqqayrq6yqqqmoqKenJyYkIh0eHRobGRobHSInLzQ2P0BITk1UXmFobHJydn1/jI2RnKeesLC1uLe4vr29vb25u7a1s7Cxq6yqqKemqaeoqaioqKipqaqpq6urq6ytrKqvrqysq6qsrKusq6qpqKinpyUjIR8aHBsZGRcaGh0iKDE2N0BCSU9NVWBhaWxzcnZ9gI2Okpyon7Gxtri4uL+8vL28uLq0s7Gtr6qqqKalpaimp6enp6enqKeoqKqqqqqrrKuprqyrq6mpq6qpq6qpqKempqUhHhwbFxkZGRoaIR8mMDhCRUhRUVxfXWRucHd7f4GEi46cn6Krs668vMC/vb7Avbu6urS1sK+tqqupqaimpqaop6ioqamoqKmpqqmsrKusrK6sqq+trKyrqayrqqurqainp6emIiAeHBgbGRkZGR8eJCs1PkJFTU1YXFtjbGx2eH1/g4qOm56hq7Stu7u/v729v7y6urm0ta6urKmqqKinpaWkpqWmp6eop6eoqKmpq6uqq6usq6murKurqqirqqmqqqiop6alpR4cHB0dICAjJCgzNTlGUFhcYWdncXV0fISEjZCUlpuiprCys7m9t8C9wLq5uLazr6+tq6qpqKelp6enpqWlpaemp6ioqaioqamqqauqqqurrKqprauqqamnqqmoqainpqakpaQgHRwbGh0cHR4gKikxN0ZNUVNdW2NnaXF4eISFiY2Rl5mlqqyyuLK8vL26ubi4tbGwr6urp6amo6WkpaSjoqKkpKSlpqempqenqKeqqampqqupqKyqqamopqiop6iop6alpKOiHhweICAkJScqMT08REhZX2BmbGxzd3mAh4aRkpabnaKmr7Gztru2u7u8trazsbCrqqmoqKalpaOkpaWlpKSkpqampqiop6eop6inqqmoqamqqaerqqiop6anqKanp6alpKOioSAeICEiJicpLTVEQEdNXmNkaXBvd3p+g4qJlJaZnaClqLKzs7e7tbq5urW1srCuqamopqako6Oio6Sko6Oio6SlpaWnp6anqKeop6qoqKmpqqinq6mop6elp6emp6empaSjoqIoJysuLzY3OUBLWFVbX290dXyAgYmLj5WbmqOlqKuusLW4uLi5urW2trWvr62rqqenp6empqWlpKWmp6alpqaoqKioqamoqaqoqairqaiqqqqpp6uqqKinpaeopqenpqWlo6OiPDxCR0lSU1ReaXVzeHqHjI2UmJmgoqaqrq+xs7a2tra5t7SzsbOtra2rqKmnpqelpaampqalpqalp6mop6eoqampqKmqqKmpqKioqqinqampp6aqqKampqOlpqSlpaWjpKKhoElIUFRVXWBgaXJ9e4ODj5WUnKGipqmrrrKysrS2tbSys7GuraqtqKeopqWmpaOko6OkpaWlpKWmpKeop6anp6ioqKeoqKenqKanp6impaenp6akqKakpKSio6SipKOjoqKgoJ5oZnB1dn+Af4qRmpmgn6erqbCys7S1tLK0sa+wrq2rqqmop6ampqWkpKOjpaWjpaWlpqeoqKioqaeoqamoqKipqamoqKmnqKimp6eppqaop6empaimpaSloqSlo6SkpKOjoqKgbGp1eXuDhIOOlp6do6Krrayys7S0tbOxs7Cur6yrqqiop6empqalpKSjpKalpKampqaoqampqaqoqaqpqampqqqqqamqqKmpp6moqqenqaiop6aop6alpqOlpqSlpKWkpKOjom9sd3p9hYeFkZign6akra+utLW2tre2tLWzsbGvra2qqqmpqKeopqWmpKanp6Wnp6ioqqqqqqurqaurq6qrqqurq6qqq6mqqqiqqauoqKqpqqinqqinpqekpqelpqWmpaWkpKNvbXd6fIWGhZCXn56ko6uurLKztbS1tLK0sa+wra2rqamoqKenp6alpaSlp6alp6enp6qqqqqrq6mrq6urq6urq6urq6uqqqupqqqrqamqqqqpqKqpqKeopaaopqemp6ampKSjeniBhYeQj46Zn6WkqqivsK+ztLWys7GusKyqq6mpqKampqampaWko6SjpKempaenp6epqqmqqqqoqqqqqaqpqqmqqamqqKmpqKmoqaenqaipp6aop6alpqSlpqWmpaWkpaOko3d1foKDjIyLlZ2jo6imrq+ts7O0s7OysLGurK2rqqqop6enpqampaSlpKWnpqWnp6ioqqqqqqurqaqqqqqqqquqqqqqq6mqqqipqaqoqKmpqainqainpqekpaelpqWmpaWkpKN7eYKHh5CQj5mfpaSqqK+vrrOztLGysK2vq6qrqKiopqamp6alpaSkpaOkp6alp6enqKqqqqqqqqmqqqqpqqqqqqqpqaqpqamoqaiqp6epqKmnpqmnpqWmpKWmpKWlpaSko6OidHF8f4GKiomUnKKhp6Wur62ytLW0tLSys7Gvr62sq6mpqKmop6empaalpqinpqioqKmqq6qrq6yqq6yrq6urrKurq6usqqurqaqqq6mpqqqqqaiqqainqKWmqKanpqempqSlpIOAio6Ql5eWoKSqqa6rsbGvs7OzsLCuq6ypqKmnpqelpaWlpKSlo6Oko6SnpqWnp6enqampqqqqqKmpqampqampqaipqaioqKeop6mmpqioqKalqKalpKWipKWjpKSko6Sio6KOjJSYmZ6enaSnq6uvrLGvrbGur6qrqKWnpKSlo6OjoqGhoqGhoaGhoqGipaWjpaWmpqenp6ioqKampqemp6anpqampqalpaalpaWmpKSmpaako6Wko6OjoaKjoaKioqGioaGghYOLkJGXmJefpKmorquxsa+0srOur6ypq6inqKWlpaOjo6SioqKhoaKhoqWlo6WlpqaoqKioqaimp6eop6inqKinp6eopqenpqemqKWlp6anpaSnpaSjpKGipKKko6Oio6GioYiGjpKTmZqZoaWqqq+ssrGvs7Gyra2rp6mmpqakpKWjoqKjoqKioaGioKKlpaOlpaamqKinqKiopqenp6enp6enp6amp6ampqWmpaekpKalpqWjpqSjoqOhoqOio6KioqKgoaCCgImNjpSUlJ2ip6euq7KysbWzta+xr6usqKippaWmpKOjpKOioqKhoqCipaWjpaWlpaioqKipqaenp6inqKeoqKenp6imp6empqanpaWnpqelpKelpKOkoaOkoqOjo6KjoaKhhoSMkJCXl5afpKmorqyysrG1s7SvsK2pq6emqKSlpaOio6Sjo6KioqGho6ampKampqaoqKipqamnp6eop6inqKinp6eopqenpqemp6Wlp6anpqSmpaSjpKKjpKKko6Ojo6GioYSDi5CPlpaWn6Spp62rsbGxtbO0r7Cuqqyop6ikpaWjoqKjoqKhoqKhoaOlpaSlpqamqKinqampp6enqKeoqKioqKeoqKenp6anpqilpaenp6alp6ako6Wio6SjpKOjo6OioqGIho6SkpmZmaKmqqmvrbOzsra0ta+wrqqrqKaopKWlo6Kio6KioaKhoaGjpaWjpaWlpqenp6ioqKanp6enp6enp6enp6empqalpqWnpKSmpqalo6ako6KjoaKjoqOioqKioKGgj46VmZmfn5+mqq6tsq+1s7G1srSsrauoqKelp6SkpaOio6Sjo6KioqKio6WlpKWlpaanp6anp6elpqampqampqampqampaWlpKWkpqOjpaWlpKOlo6KioqChoqGioaGhop+gn56doqWkqaiorq+xsbWxtbGvsq2vp6inpKWjpKWjo6SioaOko6Sjo6Ojo6WmpqWmpqamp6enqKeopqampqampqampqampqWlpaWlpKWko6WlpaSipKOioqKgoaKgoqGgoaKfoJ+dnKKlpKmoqK6wsrK1sraysLKtr6ipp6SlpKSlo6OkoqKipKOjo6OjoqOkpqakpqWmpqenpqenp6WlpaalpqWmpaWlpaWkpKSkpKOlo6OlpKSjoqSjoqGioKGin6GgoKChn6CeoqGlqKisq6uwsbOztrO2sa6xq62mqKejpKSkpKOipKKhoqOjo6Ojo6KjpKampaWlpqWmpqampqelpaSlpKWkpaSkpKSkpKOko6SjpKKipKOkoqGjoqGhoZ+goZ+hn5+foZ6fnp2coaSkqaiorq+xsbWxtbCtsKqspaelo6Ojo6SioqOgoaKjoqOjo6OioqSmpqSlpaampqamp6enpaWlpaWmpaWlpaWlpaSkpKSko6Sjo6SkpKOio6OioqKfoaGfoaCfoKGeoJ+ioqWoqKysrLCxs7O2sbavra6pq6WnpaOipKOko6KkoaKjpKSko6OjoqOlpqalpqampqenpqinqKampaalpqampqWlpaalpKWlpaSlo6OlpKWkoqSjoqKioKGin6Kgn6CinqCfnJygpKOoqKiur7GxtbG2sa6wqqylp6Sjo6OjpKKio6ChoqOioqOjoqKipKWlpKWlpaampqanpqelpaWlpaalpqWlpaWlpKSkpKSjpKOjpaSko6Kjo6Khop+hoZ+hoJ+goZ6gn6Sjp6uqrq2usrO0tLayt7Gtr6qrpaeloqKko6SjoqShoqOko6SkpKSkpKanp6anpqenqKinqaipp6enp6anp6empqampqWlpqWmpaakpKalpqSjpaSjo6OgoqKgoqCgoKKfoaCop6yvrrGxsbW1tra5tbm0sLKtrqipp6Slp6WmpaSmpKWmp6amqKenqKipqqqqqqqrqqurq6yrrKqqqqqpqqqqqqmqqqqpqamoqaipqKepqKmopqinp6ampKWmpKalpKSmo6Sjqaisrq6wsLC0tLS1trK2sK2uqKmlpqShoqSio6Oho6GioqOjo6Sko6Skpaenpqenp6eoqKipqKmnp6enp6enp6enp6enpqampqalpqWkp6ampaSlpaSko6Gjo6CjoaCho6CioK2tr7CwsrKytLS0tLWyta6rrKippKeloqKlpKOkoaShoqOko6OkpKOkpKWnp6anpqamp6emp6enpqalpqWmpaalpaWlpaSkpKSlpKSjo6WkpKOio6OioqGgoaGeoZ+enqGeoJ+vr7CxsbOzs7W0s7W1srStqaqnqKOlo6GhpKOio6CjoaKkpKSjpqWkpaWmp6inqKanp6eop6inqKempqamp6anpqampqalpaWlpqSlpKSmpaWko6Sko6OioKKin6Kfn5+in6Gfr6+wsbGzs7O2tLW1trO2sKusqKqmqKekpKimp6ilqaeoqampqKuqqaqqq6ysrK2rrKysraytrK2sq6urqqurq6uqq6qrqqmqqqqpqamoqqmpqKeoqKenp6SmpqOmpaSjpqOlo66ur7CwsrGxtLKys7Ows6yoqKWno6aloqKlpKWloqakpaempqaop6eoqKmqqqmqqKqpqqqpqqqqqamoqaioqKmoqKioqKenqKeopqempqinp6alpqWlpaSio6ShpKKhoaSgo6GsrK2urq+ur7Gvrq+urK6opKSipKCioZ+eoqChoZ6ioKGio6KipKOjpKSlpqalpqWmpqampaamp6WlpaWkpaSlpKSkpKSko6SkpKOjo6Kko6OioaKioaGgn6CgnqCdnp2gnZ+erq6vsK+xsLGzsrKxsa6xqqenpaakpaWioaSio6WhpKKkpKOjo6Wko6SkpaampaalpqWmpqanpqelpaWlpKWkpaSkpKSlpKOkpKSio6KipKOjoaGioaGhoJ+foJ6gnp6dn52fnq6ur6+vsLCwsbCvr66rraekpKGjoaKioJ+hoKGioKKhoqKioqKko6Oko6WlpaWlpKWlpaWlpqWmpaSlpKSkpKWkpKSkpKSjpKOkoqOioqSio6GhoqGhoaCfoKCfoJ+fnp+en56vr6+vrq6urq2rqaqopqajoaCfop+hoJ+eoJ+gop6hoKKioaKipKOio6OlpaWlpaOlpKSlpKWlpaSkpKSjpKSko6Oko6SjoqOjo6KioqKkoqOhoaKhoaGgn6CgnaCdnZyfnZ+esK+wsK+vr7CtrKqqp6iopaOioqSipKKioKSho6ahpKKkpKOkpKako6OkpqWlpqWkpaSlpaWlpaalpaSko6OkpKOjpKSko6GjoqOhoaGho6KioaCgoKCgnp6enpyempuanZqdnK6trq2sq6usqKelpaOlpKKioKCjoaShoqCkoaOmoaSipaWjpKSmpaOkpKWlpaWlo6SkpKSkpaWmpqWkpKOjpKOkoqOjpKOhpKOjoaGioqWio6GhoaGhoJ6enp6cn5ubmp6bnZyysrKysbGxsrCura2qq6upp6amp6eop6elqaeoq6epqKqqqaqqq6qpqaqrq6qrq6mqqqqpqqurq6uqqqmpqampqaipqaqpp6moqaamp6eqqKimpqamp6alpKSjoqShoaCkoaOis7KzsrGxsLGurKqrqKqpqKempqinqaenpamoqaunqqmrq6urq62sqqqrrKysrKyrrKysq6usrK2srKyrq6qrq6uqq6urq6mrqqupqKmpq6qqqKioqKmopqampaOmoqOhpqKko7GxsbCwsK6wrqyrq6qrrKmpqKiqqauqqaisqKqsqauprKuqq6usq6qrq6ysrKysqqurq6qrrKysrKuqqqqpqqqqqaqpqqqoqqmpp6enqKqpqaenp6enpqWkpKSipKKioKSho6Gvr6+ura6sraupqamoqquoqaioqqmrqqmnrKiqraiqqauqqaqpq6qpqaqqq6qqqqioqqmoqamqqqupqKmop6moqKeop6mopqinqKWlpaapp6elpaWlpqWkoaKhn6KfoJ6inqCfr6+vrq2urK2rqqmop6mpqKempainqKiopqqoqauoqqmrq6mqqquqqamqq6urq6upqqqqqqqrrKurq6qqqqmqqqqpqqmqqqeqqamnp6eoqqmpp6enp6enpqSkpKKloqOhpaKjoq6urq6trautq6qqqamqq6uqqairqqurqqmsqqutqqyrra2rrKytrKurrK2trKysq6ysrKusrK2srKyrq6urq6urqquqq6uoqqqqqKioqaqpqqeoqKioqKalpaWjpaOkoqajpKOsrKyrq6uqqqmpqKinqaqpqainqqipqainqqipq6iqqaqqqaqqqqmpqKmqqqmqqampqamoqamqqqqpqaioqKmoqKeoqKiopqinp6Wlpqaop6elpaWlpaWko6KjoKKhoaCjoKGgqqqqqqqqqKqoqKinp6mqqamop6moqKmopqqoqKunqaipqaipqamoqKepqamoqKiop6iop6eoqKiop6ampqanpqalpqWmpqOmpaWjo6OkpaSlo6Ojo6OioaGgoJ+gnp+eoJ6fnqmpqamoqKeop6anpqaoqKenpqaop6eop6app6iqpqinqKmnqKmpp6enqKmpqKioqKioqKeoqKmoqKenp6enp6empqemp6elpqampKWlpqalpqSkpKSkpKOjoqKhoqGhoKKhoaGjpKSkpKSkpaWkpaOjpaWlpKOipKOjo6OipaOkpaOlpKWlpKWlpaSkpKWlpaSlpKSkpKSkpKSlpaSkpKOjo6Ojo6Ojo6SjoqOjo6KioqOioqOhoqKhoaGhoaCgoKCgoJ+gn5+foqKjo6Ojo6SjpKSjo6WlpaWkpKWkpKSko6WjpKWjpaSlpKSlpKWkpKSkpKWkpKSjo6Ojo6OjpKSko6OioqKjoqKhoqKioqCioaGgoaChoaGhoKCgoKCgn5+fn56fnp6en52dnaenqKenp6eopqenpqanqKinp6eop6emp6appqeop6mnqKinqKeoqKenqKiop6inpqampqampqenp6ampaWkpqWmpKWlpqWkpaWlo6OkpKWlpKOkpKOkpKKjoqKhoqGhoaKgoKCio6Ojo6Oio6KioqGio6OjoqKio6KjoqOipKKjo6Oko6Sjo6SkpaSjpKWkpKSko6Oko6OjpKOkpKSjpKOioqOjo6Kjo6OjoqOjo6GioqKioqKioqOhoqKioaGhoaGhoaGhoJ+goaGhoaGhoaKhoqGhoaGhoaCgoKGgoaChoKKgoaGioqGioaGhoaKioaKioaKhoqGgoaGhoaGhoaGhoaGgoKChoaGgoKGgoKCgoKGgoKCgoKCgoKChoKCgn5+fn5+fn5+fn56enp+foKCgoJ+goKCfn5+gn5+fn5+fnp+enp6fnp6fn5+fn5+fn5+fn56goJ+gn5+enp+enp6enp+fn56fnp6enp6fnp6enp6enp6enZ6enp6enp2enp6dnZ2dnZ2dnZ2dnZ2cnJyio6Ojo6Kjo6KioqGioqKioaGhoaGhoKGhoqChoaGioaKhoaKhoaKhoqKhoqGhoaChoaGhoKChoaGhoaCgoKCgoaCgoaCgoKCgoaCgoKCgoaCgoKGgoKCgn5+fn6Cfn5+fnp6en5+goJ+fn6CgoKCfoKCfoJ+fn5+foJ6fn6Cfn5+hoKChoKCgoKChoKKhoKKgoaCgoaGhoaCgoKCgoaGgoaCgoaGhoKGgoKGgoKGhoaGhoKGgoaGhoKCgoaCgoKChoKCgoJ+fn6OjpKOjo6OjoqOioaKhoaKgoKCgoKCfn5+hn5+foKCfoJ+foJ+fn56goJ+gn5+fnp+enp+enp6enp6enZ6dnp6enZ2enZ6enZ2enZ6dnp2enZ2dnp2dnZ2cnJ2cnZydnJ2cnJygoKCgoKCgoJ+gn5+fn5+gn56fnp6enp6en52dnp+enp6dnp6enZ6dnp6dn52dnZ2enZ2enZ2dnZ2dnZydnJ2dnZ2dnZ2dnZ2dnZ2dnJ2cnZydnZ2cnJycm5ycm5ybm5ucm5uboKCgoKCgoKCgoaCgoKCfoJ+fn5+fn56enp+enp6fnp6fnZ2enZ2enZ6enZ+dnZ2dnZ2dnZycnJydnZ2cnZycnJycnJycnJycnJycnJucm52cnJycm5ubm5qbm5qbmpqam5qamqCgoKCgoKCgoKCgn6Cfn6Cgn5+fn5+fn5+gn5+foJ+foJ+fn5+foJ6goJ+gn5+fn5+fn6Cenp6en5+fnp+enp+fn56fnp6fnp6fn5+en56fnp+fn56enp+dnp6dnp6enp6dnZ2hoaGgoKCfn5+fnp6fnp6enp2enZ2dnZ2dnZycnZ2cnJ2cnJycm5ybnZybnZubm5ubm5ycm5qampubm5qbm5qbm5uam5qam5uam5ubm5uam5qbmpuampqamZqamZqampqamZmZoaGhoaGgoKCgoKCfoKCfoJ+fn5+fnp6enp+enp6enp6enp6enZ2dnZ6enZ6dnZ2cnJycnZycnJycnJybnJybnJybm5ybm5ubm5ybnJubm5ybm5ucm5qbmpqampmbmpqZmpmZmaCgoKCgn5+fn5+fnp6enp6enZ6dnZ2dnZ2enZ2dnp2dnp2dnZycnZyenZyenZydnJycnJ2cnJucnJycm5ycm5ycm5ucm5ubm5ucm5ybm5qbm5ubm5uampqZmZmZmpmamZqYmJijpKOjo6KioqKioqGhoaGioaChoKCgoKCgoaCgoKGgoKCgoKCfn6CfoaCfoKCfoJ+fn5+gnp6enp+fnp6fn56enp6enp2enp6dnp6enZ2cnp2dnZ2dnJycm5ybm5ybnJubmpqapaampqWlpaWkpKSjpKSjpKOio6KioqKioqKioaGhoaGhoaGhoKChoKGhoKGgoKCgn5+foJ+en5+gn5+fn5+enp+enp6enp6enZ6enp2enJ6dnZ2enZydnJycm5ucm5ybnJqam6Ojo6Ojo6OjpKOjo6Ojo6Ojo6Ojo6Ojo6Oko6OjpKOjpKOjo6Kjo6KlpKOko6Ojo6Kjo6SioqGio6OjoqOjoqOjoqKjoaKioqGioqOhoqCioaGhoqGgoaGgoJ+goaCgoKCenp+goKChoKCgoKGgoKCgoKCgoJ+gn6Cfn6CgoJ+fn6GgoKGgoKCfoKCgoqGgoaChoaCgoaGioKCfoKGhoaChoaChoaCgoaCgoKCgoaChoKCfoJ+goKCgnp+fnp+enqCfn56fnZ2eo6SkpKOjo6Oko6Ojo6Ojo6Oio6Kjo6KioqOioqKjo6OjoqKioqKjoqSjoqOio6OioqKio6GhoaKioqKioqKhoqKhoaKhoaGhoaKhoqGhoKGhoaGhoJ+goJ+gn5+gn5+fn52dnqanpqampaampqalpaWlpaWlpKWkpKSkpKSlpKSkpaSkpKSkpKOjpaOlpKOkpKSko6Ojo6SjoqOjpKOjo6OioqOjoqKjoqKio6KjoqKioqGjoqKio6KhoqGgoaCgoaCgoKGfn5+oqKiop6eop6iop6enp6eop6anpqampaamp6alpaampqalpaWkpaakp6alpqWmpaSkpaWlpKSkpKalpaSlpKSkpaSjpaOkpKSjpKSko6SipKSko6SkoqOioaKhoaKioqGin6ChqKipqKioqKioqKenp6eoqKenp6anp6ampqempqampqampaWlpaWmpKempaalpaWkpKSkpaSjpKSlpaWkpKOkpKSjo6Sjo6Ojo6Ojo6OjoqSjo6Kjo6KioaChoKChoKGgoZ6en6ioqKinp6enp6enpqanp6empaalpaWkpaWlpKSkpaSlpaSkpKOjpaOmpaSlpKSko6Ojo6SjoqOjpKOko6Oio6OjoqKjoqKjo6KjoqKioqGjoqKio6KhoqGgoaCgoaCgoKGen6Cnp6enpqampqempqampqampqWmpaWlpKWlpaSkpKWlpaWkpaSkpKakpqakpaWlpKSkpKSlpKOkpKWkpaSko6SkpKOjpKOkpKSjpKSjo6OipKOjo6Sko6OioaKhoqOioqKioKChp6enp6enp6eop6enp6enqKemp6anp6anp6empqanpqenpqempqaopqiop6inp6empqamp6alpaanp6empqWmpqalpaalpqampaalpaWlpKalpaWmpaSkpKOjo6Oko6OjpKKioqampqalpaalpqampqampqampqalpqalpqampaWlp6ampqampqWlp6Wnp6WnpqalpaWlpaalpKSlpqampKWkpaWlpKSlpKSkpaSkpKSkpKOlpKSkpaSjo6OioqKho6KioaOgoKGkpKSkpKSkpKSko6SkpKOkpKOko6OjoqOjo6OioqSjo6Oio6OioqSipaSjpKOjo6Kio6KkoqGioqOjo6KjoqKjo6Kho6KioqKhoqKioaKho6GioqOioaGhoKCgoKGgoKCgnp+fpqampqWlpaWmpqWlpaWlpqWlpaWlpaSlpaWkpKSlpKSkpKSko6Olo6Wko6Sko6OioqOio6KhoqKjo6OhoqGioqKhoaKhoaGhoKGhoaGhoKKhoaGhoKCgoJ6fnp6gn56en52dnaSkpKSkpKSkpKSjpKSkpKSko6Sjo6Oio6OjoqKipKKjo6KjoqKipKKkpKKjoqKioqKioqOioaGioqKioaKhoqKioaGioaGhoqGhoaKhoaCioaGhoqGgoaCfoJ+foZ+fn6Cenp6np6empqampqampaWlpaWmpaSlpKSko6OkpKOjo6Ojo6OioqKioqOho6Oho6KioaGhoaGioaCgoKKhoaChoKChoaCgoaCgoKCfoKCgn6CfoaCgoKCgn5+enp6enp+enp6fnJydp6empqampqampqWmpaampqWlpaWlpaSkpaWkpKSkpKSko6Sko6Olo6Wko6Sjo6OioqKio6KhoqKjoqOhoqGioqKhoaKhoaGioaGhoaChoKKhoaGioaCgoJ+fn5+gn5+foJ2dnqenp6empqampqalpqWmpaalpaWkpKWjpKSko6OjpKOjo6Ojo6KipKKko6KjoqKioaGioaKhoKGhoqGioaGgoaGhoKChoKCgoZ+goKCgoJ+hoKCgoKCfn56enp2en56enp+cnJ2mpqampaWlpaWlpaWlpaWlpKSlpKSko6OjpKOjo6Oio6OioqKioaOho6Oho6KioaGhoaGioJ+goKKhoaChn6CgoZ+foJ+fn6Cfn5+fn5+eoJ+fn5+fnp6dnZ2cnJ6dnZ2em5ucpqampaWlpaWlpaSkpKSkpaSkpKSkpKOjo6SjoqKjo6OjoqKjoqKkoqSjoqOioqKhoaKioqGgoaCioqGgoaChoaGgoKGgoKCgn6CgoJ+gn6Cgn5+gn5+fnp2enZ2fnZ2dnpybnKWmpaWlpaWlpaWlpaWlpaWkpKWkpKSjpKSko6OjpKOjo6Ojo6KipKKkpKKko6OioqKioqOioaGhoqKioaKhoaGioaCioKGhoaChoaGgoaCioaChoaCgoKCen56eoJ+fn6CdnZ6kpaWkpKSkpKSko6Ojo6Ojo6OjoqOjoqKioqGhoaKhoqKhoaGhoaKho6KhoqGhoaCgoaGhoJ+gn6GhoaChoKCgoaCfoJ+foKCfoKCgn5+foJ+fn6Cfnp+enZ6dnZ+dnp2em5ucpKSkpKSkpKSkpKSjpKOjpKOjpKOjo6KioqOioqGjoaKioaKioaGjoaOjoqOioqGhoaKio6GgoaGioqKhoqGhoaKhoKGgoKGhoKGhoaCgn6GgoKChoJ+gn56fnp6gnp+fn52dnaKioqKioqKio6OioqKioqKioaKhoqKgoaGhoKCgoqChoaChoaChoqCjoqGioaGhoKGhoaKhoKCgoaKhoKGhoKGioaChoKChoaChoaGgoJ+hoKCgoaCfoJ+en56eoJ+fn5+dnZ2jo6Ojo6Ojo6Ojo6Ojo6KjoqKjoqKioaGioqGhoaKhoqGhoaGgoaKgo6KhoqGhoaCgoaGioKCgoKGhoaChoKChoaCfoZ+goKCfoKCgoKCfoaCgoKCfn5+fnp6dnaCenp6fnJydoaGhoaGhoaGioaGhoaGhoaGgoaChoaCgoKGgn5+hoKGgoKCgn6ChoKKhoKGhoKCgoKCgoaCfoJ+goaGgoKCfoKGgn6Cfn6Cgn6CgoJ+gnqCfn5+gn56fnp2enZ2fnZ6dnpycnKGhoaGhoaGhoqKhoaGhoaGhoKGgoaGgoKChn5+foaChoaCgoKCgoqCjoqGioaGhoKGhoaKhoKCgoaKioKGgoKGhoaChoKChoZ+hoaGgoZ+hoKCgoaCfoJ+en56eoJ6fnp+dnZ2ioqKioqKioqKioqKioqKioqKioaKioaGioqGhoKKhoqKhoaGhoaOhpKOio6KioqKioqKjoqGioaKioqGioaGioqKhoqGhoaKhoqKioaKgoqGhoaKhoaGhoKCfn6GgoKCgnp6eoKCgoKCgoKChoKCgoKCfoKCfoJ+goJ+fn6Cenp6gn6Cgn5+fn5+hn6KhoKGhoKCgoKCgoqCfn5+goaCgoaCfoKCgn6CfoKCgn6CgoJ+gnqCgoKCgn5+fn56fnp6gnp+en52dnZ+goKCfn6CgoKCgoKCgoKCgoKCfoKCfn6Cgn5+foaChoaCgoKCgoqCioqGioqGhoaChoaKgoKCgoaGhoKGgoKGhoaChoKCgoZ+hoKGgoJ6hoKCgoKCfn5+en56eoJ6enp+cnJ2goKCgoKCgoKGhoKCgoKCgoKCgn6Cgn5+goJ+fnqGfoKGfoKCfn6GgoqGgoaGgoKCgoKCioJ+fn6ChoJ+gn5+goKCfoJ+fn6CeoJ+fn5+eoJ+fn5+fnp6enZ2cnJ+dnZ2em5ucoKCgoKCgoKChoKCgoKCgoKCfoJ+goJ+fn6Cenp6gn6Cgn5+fn5+hn6GhoKGgoKCfn6CgoZ+en5+goKCfoJ+fn6Cfn5+en5+fnZ+fn56fnZ+fnp+fnp2enZydnJyenJ2cnZqam6Kjo6OioqKio6OioqKioqKioaKhoqKhoaGioaGgoqGioqGhoaGho6Gjo6KjoqGhoaGhoaKhoKCgoaKhoKGgoKGhoaChoKChoZ+hoaGgoJ+hoKCgoaCfoJ+en56eoJ6fnqCcnJ2hoqKioaKioqKioqKioqKioqGioaKioaGioqGhoaOho6OioqKhoqSipKOio6OioqKioqKkoqGhoaKjo6KjoaGioqKhoqGioaKgoqGioaGgoqGhoaGhoKGgn6Cfn6GgoJ+hnZ2eoKGhoaChoaGhoaGhoaGhoaGgoaChoaCgoaGgoKCioaKioaGhoaGjoaOjoqOioqKhoaKio6GhoaGioqKhoqGhoaKhoaKgoaGioKGhoaChn6GhoaGhoKCgoJ6fnp6gn5+foJ2dnqGhoaGhoaGhoaGhoaGhoaGhoKGgoaGgoKGhoKCgoqChoqGhoaCho6Gjo6KioqGhoaGhoaOhoKCgoqKhoaGgoKGhoaChoKCgoZ+hoKGgoJ6hoKCgoJ+fn5+dnp2dn56enp+bm5yhoaGhoaGhoaKhoaGhoaGhoaGhoKGhoKCgoaCgoKKgoaGgoaGgoKKho6KhoqKhoaGgoaGioKCgoKGhoaChoKCgoaCgoJ+goKCfoKCgn6CeoKCfoKCfn5+fnZ6dnZ+dnp6fm5ucoaGhoaGhoaGioaGhoaGhoqGhoaChoaCgoaGgoKCioKKioaGhoaGjoaOjoqKioqGhoaKio6GhoaGioqKhoqGhoqKhoaKgoaGhoKGhoaChn6GhoaGhoKCgoJ+fnp6gn5+foJ2dnqOjo6Oio6Ojo6OjoqOjo6OioqOioqOioqKioaGho6Kjo6KioqKipKKkpKOjo6OioqKioqSioaGho6OjoqOhoqKjoqGioaGhoqCioqKhoaCioaGhoaGgoKCfn56eoJ+fn6CdnZ6ioqOioqKioqOjo6KjoqKjoqKjoqKjoqKio6KioaOio6Oio6KioqSipaSjpKOjo6Oio6OkoqKioqOko6KjoqKjo6Oio6KioqOho6KjoqKgo6KioqKioaGhoKGgoKKgoaChnp6foqOjo6KioqKjo6Oio6Oio6Kio6Kio6KioqOioqGjoqOjoqKioqKkoqSko6Ojo6KioqKjpKKioqKjo6Oio6KioqOioqOhoqKioaKioqGioKKioqKioaGhoZ+gn5+hoKCgoZ6en6OjpKOjo6OjpKOjo6Ojo6OjoqOioqOioqKjoqKho6Kjo6KioqKio6Kko6Ojo6KioqKioqOioaGhoqOioaKhoaKioqGioaGhoqCioaKhoaCioaGhoaGgoaCfoJ+foZ+goKGenp+io6OjoqKioqOjo6KjoqKjoqKjoqKjoqKioqKioaOio6OioqKioqSipKSjo6OioqKioqOkoqGhoaOjo6KjoqGioqKhoqGioaKgoqKioaKgoqKhoqGhoKGgn6Cfn6GfoJ+hnp6fo6SkpKOjo6OkpKOjo6OjpKOjo6Kjo6Kio6OioqKkoqOjoqOjoqKko6Wko6Sko6Ojo6OjpKKioqKjpKOio6Kio6OjoqOioqKjoaOio6KioKOioqKioqGioaChoKCioKGgoZ6en6OjpKOjo6OjpKOjo6Sjo6Sjo6Sjo6Sjo6Ojo6KipKOkpKOjo6OjpaOlpaSlpKSko6OkpKWjo6OjpKSko6Sjo6Oko6OkoqOjpKKjo6Oio6Gjo6Ojo6KioqKhoaCgo6GhoaKfn6CioqKioqKioqOioqKjoqKjoqKjoqKjoqKio6KioaOio6Oio6KioqSjpaSjpKSjo6Oio6OkoqKioqOko6OjoqKjo6Oio6KioqOho6KjoqOgo6KioqKioaKhoKGgoKKhoaGinp6goqKjoqKioqKjo6Kio6Kio6Kio6Kio6KioqOioqGjoqOjoqKioqKko6Wko6Sjo6OioqOjpKKioqKjo6Oio6Kio6OioqOioqKjoaOio6KioKOioqKioqGhoaChn6CioKGgoZ6en6KioqKhoqKio6KioqKioqKioqKhoqOioqKioqGho6KjoqKioqGhpKKko6Kjo6KioqKioqShoaGhoqOioqKioaKioqGioaKioqCioqKhoqCioqGioqGgoaCfoJ+foaCgoKGdnp+ioqOjoqKioqOjo6Kjo6KjoqKjoqKjoqKio6KioaOio6OioqKioqSipKSjo6Ojo6KioqOkoqKioaOjo6KjoqGioqKioqGioqKhoqKioaKgoqKioqKhoaGhn6Cfn6GgoKChnp6foKGhoaGhoaGioaGhoqKhoqGhoqGioqGhoaKhoaCjoaKioaKhoaGjoqSjoqOjoqKioqKio6GhoaGio6KhoqGhoqKioaKhoqKioKKioqGin6KhoaGioaChoJ+gn5+hoKCgoJ2enw==","rgrip_scale":[-0.0211,1.3474],"rgrip_exec":[0.258,0.2652,0.2713,0.2724,0.2676,0.264,0.2625,0.2607,0.2598,0.2594,0.2582,0.2579,0.2563,0.2547,0.2528,0.2507,0.2487,0.247,0.2436,0.2408,0.2381,0.2349,0.2316,0.2279,0.2242,0.2199,0.2162,0.2126,0.2082,0.204,0.1997,0.1962,0.1913,0.1872,0.1834,0.1801,0.1768,0.1734,0.1711,0.169,0.1675,0.1659,0.1654,0.1658,0.1663,0.1687,0.1733,0.1779,0.1834,0.1927,0.1998,0.2104,0.223,0.2364,0.2529,0.2718,0.2921,0.3147,0.3391,0.3643,0.3906,0.417,0.4465,0.4753,0.5043,0.5339,0.5647,0.5979,0.6312,0.6639,0.6971,0.73,0.7627,0.7966,0.8288,0.8614,0.8934,0.9244,0.9549,0.9832,1.0111,1.0361,1.0598,1.0818,1.1038,1.1233,1.1412,1.1577,1.1725,1.1861,1.1982,1.2087,1.2185,1.2263,1.2328,1.2392,1.2442,1.2485,1.2511,1.2538,1.2565,1.2583,1.2597,1.2602,1.2612,1.2613,1.2616,1.2611,1.2603,1.2594,1.2582,1.2563,1.2546,1.2525,1.2491,1.2453,1.2413,1.2368,1.2318,1.2262,1.2195,1.2126,1.2052,1.1967,1.1871,1.1772,1.1665,1.1547,1.1418,1.1277,1.1125,1.096,1.0786,1.0602,1.0402,1.0185,0.9952,0.9699,0.943,0.9149,0.8849,0.854,0.8214,0.7878,0.7533,0.7174,0.6804,0.6428,0.6044,0.5654,0.5255,0.4869,0.4473,0.4085,0.3716,0.3357,0.3016,0.2683,0.2374,0.2088,0.1836,0.1621,0.1427,0.1268,0.1136,0.1043,0.099,0.0963,0.0963,0.0983,0.1026,0.1086,0.1158,0.1235,0.1316,0.1397,0.1475,0.1549,0.1618,0.1676,0.1729,0.1771,0.1805,0.1832,0.1854,0.1866,0.1876,0.1878,0.1876,0.1871,0.1862,0.1852,0.1841,0.1822,0.1803,0.1782,0.1758,0.1733,0.1709,0.1689,0.1669,0.1654,0.164,0.1625,0.1614,0.1603,0.1597,0.1592,0.1591,0.1591,0.1594,0.1598,0.1601,0.1608,0.1615,0.1621,0.1626,0.1632,0.1637,0.1643,0.1648,0.1653,0.1657,0.166,0.1662,0.1663,0.1665,0.1667,0.1669,0.167,0.1672,0.1674,0.1675,0.1676,0.1677,0.168,0.1683,0.1687,0.1692,0.1698,0.1704,0.1711,0.1717,0.1723,0.1728,0.1733,0.1738,0.1745,0.175,0.1756,0.1763,0.1769,0.1775,0.1781,0.1787,0.1793,0.1798,0.1804,0.1811,0.1819,0.1828,0.1835,0.184,0.1846,0.185,0.1853,0.1851,0.1851,0.185,0.1845,0.1839,0.1826,0.1814,0.1797,0.1774,0.1748,0.1717,0.1684,0.1647,0.1607,0.1566,0.1526,0.1485,0.1445,0.1408,0.1379,0.1361,0.136,0.1377,0.1415,0.148,0.157,0.1678,0.1811,0.1971,0.2144,0.2344,0.2549,0.2773,0.3017,0.3278,0.3543,0.3825,0.4113,0.44,0.4714,0.503,0.5351,0.5665,0.5986,0.6304,0.6618,0.6894,0.7192,0.7495,0.7794,0.8064,0.8344,0.8596,0.8826,0.9018,0.9177,0.9322,0.9419,0.9483,0.9516,0.9513,0.9487,0.9431,0.9361,0.9279,0.9192,0.9097,0.9008,0.8924,0.8846,0.8781,0.8728,0.8692,0.8661,0.8639,0.8621,0.8608,0.8601,0.8597,0.8596,0.86,0.8604,0.8611,0.8621,0.8633,0.8645,0.8654,0.8663,0.8676,0.8686,0.8697,0.8707,0.8716,0.872,0.8726,0.8731,0.8735,0.8739,0.8741,0.8742,0.8743,0.8744,0.8744,0.874,0.8734,0.8728,0.8719,0.8708,0.8698,0.869,0.8678,0.8668,0.8659,0.8648,0.8637,0.8628,0.8619,0.861,0.8603,0.8595,0.8588,0.8581,0.8576,0.8573,0.8569,0.8563,0.8556,0.8551,0.8545,0.8538,0.8532,0.8524,0.8517,0.8512],"rsh_pred":"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JyYmJignJigoKSopKysuMjIzOTg+QEFFSUpNTlJWVlpgXWZkaGdobm1tc3N2eXt7f4ODiYmQj46Rl5ydoqCipK2wr622tbO/vL7Ax8fJx87M0NLR1tTS1dXa3Nnf2t7d3d3d3SgnJycpKCcpKSorKiwsMDM0NTs6QEJCR0tMUFFVWFlcYmBpZ2tpa3BwcHZ2en1+f4KGho2Nk5ORlJugoKWjpaews7GwuLe2wb7Bw8rJy8nRztPU1NjW1NjX3N7b4d3g3+Df398qKSgoKiopKiorLCwtLjE1NTY8O0FDQ0lMTVFTVllZXWNhamdsamxxcXF3d3t+f4CEh4iOjpSUkpacoaGnpKapsrWzsrq5uMPAw8XLy83L0tDU1tXZ19bZ2N3f3OLd4eDg3+DgKikpKSsqKSsrKy0sLi4xNjY4PTxCREVKTk5TVFdbW19kYmtobWttcnJzeXl8gIKChomJkJCWlZSXnaOiqKWnqrO2tLO7u7jEwsTFy8vNzNPQ1dbW2tfW2tnd4N3i3uLh4eDh4CsqKSksKyosLCwtLS8vMjc4OT89REVHS1BQVFdaXV1hZ2Vsam9sb3R0dHp6f4KEhIiLjJKTmZiWmqGmpaupqq22uLe1vr68xsTGyM3Oz87U0tbY2NvZ2Nvb3+Lf4+Dk4uLi4uIpKCgoKiopKiorLCwuLTE1Njc9PEJERElOTlJUV1taX2Vjamhsam1ycnJ4eX2AgYKGiImPj5aVk5idoqGopaeqs7Szsbq6uMLBwsXJysvK0M7R09PX1NPW1trd2t7b397d3d3dJiUlJScnJignKCkpKysvMzQ2PDpAQkNITU1RU1daWV5jYmlmbGpscXFyeHl9gIKCh4mKkZCXlpSYnqOiqKanqrO0tLO7urjCwcPFycnLytDO0tPT1tXS1tXZ3dne297d3N3d3CYmJiYoJyYoKCkqKiwsLzQ1Njw7QUNESU9PUlVXW1pgZWNqZ21rbXJzc3l5foGDg4iKi5GQmJaVmZ+jo6mnqKu0trW0vLy5w8LExsrLzMvRz9PU1NfW1NfW2t7a39zf3t3d3d0nJiYmKCgnKSgpKiosLDA1NTc8O0FDREhOTlJVV1tZX2NiaWZraWxxcXF3eH2AgoKGiIqQkJeVlJidoqKppqeqtba1s7y8ucPBxMbKy83M0c/T1dXY1tXY19ve2+Dd4N7e3t7eKCgoKCopKSoqKywsLi4yNzg6QD5FRkdLUVJWWFpdXGFlZGpobWtucnR0e3uBg4aGi4yOlZObmZicoaamrKmrrbe5t7a/vrvGxMbIy8zOzdHQ1dbV2NfV2Nfa3tvf3d/e3d7e3ignJygpKSgrKissLC4tMjc3OUA9RUZHS1FSVlhaXVthZGNpZ21rbnJ0dHt8goSGhouMjpaTm5mZnKGmp6yqq623uLe2vr27xcPFyMrMzc3Q0NTV1NbW1NfX2dzZ3tve3Nzc29wpKCkpKysqLCwtLi4wLzQ5OjxCQEdJSU1SVFdZW15cYmVkamhubG9zdnZ8fYOFh4iNjY+XlJyamp2jp6etq6ytuLm3uL6+u8XDxsjKzM3N0NDT1dXW19PX19nc2t3c3t3c3NzcKCgoKCoqKSsrLC0tLy80OTs8Q0FISkpOVVZaXV9gX2VoaG1rcm9zd3l6gIGHiYuLkZGTm5efnZ6gpqqqsK6vsLq6urrBwL3IxsnLzc7Pz9LS1tjV2NnW2dnb39zf3eDe3t7e3iwrKywtLi0vLzAxMDMzOD4/QEdFS05OUllZXmBiZGJobGxxb3Vzd3t9fYSFi42Oj5WUlp6bo6GhpKqtrbOxsrO9vb29xMPBy8nMztDR0tLV1dna2Nvb2Nvc3OHf4eDj4eDg4OAuLS0tLy8uMDAxMjI1NDo/QEJJR01QUFRaWl9hY2VjaW1scG51c3d6fX6DhYuMjo+VlJaemqOgoaSqra20sbKzvb29vsTDwcvJzM/P0dLS1NTY2tjZ29fb29zg3uDf4uDf39/fLSwtLS4vLjEwMTIzNjU7QUNES0hPUlJXXV5jZWhpaG5wcHVzenh8f4KDiIqQkpSVm5qcpKCppqepsLOzu7e4ucPEw8TKysfS0NLU1dfY2dvb3t/f3+Hd4eHi5uTm5efm5eXl5TAvLzAxMjE0MzQ1NTg4P0RHSFBMUldWW2FjZ2psbmxzdnV6eYB+goaIiY+Rlpmam6GgoqmmrqytrrW4uMC8vb7HyMjJzs3L1dPW19nb29ze3uHi4uLk4OTl5ejn6Ofq6Ojn5+cyMjIzNDQ0NzY3ODk7O0JHSkxTUFVbWV5kZGpsbnFudnl3fHuCgIWIi4uRk5eanJyioKOqpq6srq+1ubjAvL2+x8fHyM3My9TU1NbX2dnb3Nzf4N/g4d7h4uHl4+Xk5+Xk4+PjNDQ1NTc3Nzk5Ojs8Pj9GS01PV1NYXVxgZmZsbnBzcHd6eH19g4GGiYuMkZSYmpycoqCiqqaura6vtbi3v7y9vsbGx8jNy8rT09TV1tjY2tvb3t/d3t/d4ODg5OLk4uXj4uHi4jIxMzM0NDQ3Nzg5Oj09RElMT1ZSWF1cX2Zma25vcXB4enh9fIOBh4mMjZKUmZudnaSho6qnr62vr7a5uL+9vr7GxsfIzcvL09PT1dXY19ra293f3t3f3N/g3+Ph4+Hl4+Hg4OE1NDU2Nzc3Ojk7Ozw/QEdLTlJZVFpgX2NpaW5xc3V0e318gX+HhoyOkJKXmZ6hoqOpp6mwrbWztrW8vr3GwsPEy8zMztLR0NjZ2dra3d3f3+Di4+Pi5OHk5eTn5+fn6efm5eXmODc5OTo7Oz09Pz9BQkRLT1JVXVleY2Nla2xwcnR2dXx+fYGBiYeOj5GUmZufoqSkqqiqsa21tLe1vb69xcPDw8vMy87R0M/W19fY2Nva3tze3+Hg4OHf4eLh5OPj4+Xj4uDh4jY2Nzg5OTo8Oz4+QEFDSk5RVVxYXWJjZWtscHJzd3Z9f36CgoqIj5GTlpudoqWmp62qrbOwuLa5t7/BwMfFxsXNzs7Q09LR2dra29ve3eHg4ePk5OTl4ubn5ejn5+fp6Ofl5ec2Njc3OTk5Ozs9Pj9BQ0lOUVVcWF1jY2ZtbXJ0dnl5f4KAhoaNi5KUl5idn6Woqamvra+1srq5urrCw8LKx8jI0NDQ0tbV1Nvd3d7e4eDk4uTm5+jn6Obp6ujs6urr7Ovq6OjqNjY3ODk6Ojw8Pj9AQ0VLUFRXXltgZWVrcHB1eHl9fYOFhYqKko+XmZydo6Sqra6vtbO1vLjAv8DAycnH0M7QztbX19rc3Nvi4+Tk5ejo6+rr7O7v7u/t8PHw8/Hy8vTz8vDw8jc3Nzg5OTo8PD4/QEJES09TVl5aX2NkaG1ucnR2enmAgoGFho6LkpSXmJ6fpKioqa+tr7azurm7usPEwsvIycjQ0tHT1tbU3Nzd397i4eTj5Obn6Ofo5urr6ezr6uvt7Ovp6es1NTY2ODg4Ojo8PT5AQkhMUFRbWFxhYGVrbW9ydHd1fX9/g4KLiJCRlJWam6Gkpaarqqyyr7a2uLe/wL/IxMbGzs/O0dLT0tnZ29zb3t7i4OLi5OXk5eTm5+bp5+fo6ejo5OXmODg4OTo6Ozw8Pj9AQkNJTFFVXFlcY2JnbG1xc3V4d36BgYWEjImQk5WWm5yhpaamq6qssq+2tbe3v7++xsTGxczOzM/R09DX2Nrb2t7d4N/h4ePj4+Pi5ebl6Obm5+jn5uLj5To6Ozw9PD0/P0FCQkRGTE9TV15bX2VkaG9wcnV2enmAg4OHho6Lk5SXmJ2eo6eoqa2sr7SxuLi5ucHCwMnGycjP0c/S09TT2drc3dvf3+Lh4+Lk5eTk5Obn5ujn5ujo5+fi4+VAQEFBQkJDRUVISElKTFNWW15lYmVra292d3l9foKCh4qKjo+Wk5qcnqGlpauvr7C1tLa7ub+/wcDIyMbPzM/O09bV19na2N7f4OHg4+Pn5Ofm6Ojo6Ofp6unr6unq6+rp5eXnQ0NEREVFRklIS0xMTlFYWl9hamdqb3B0e3x+goOHh4yPkJOUm5ifoKOlqamvs7O0uLi5vr3Cw8TEy8vJ0s/S0tbZ19rb3drg4uLj4ubl6ebp6erq6erp6+zq7Ozq7O3r6ufm6ENDRUVGRkdJSUxNTU9SWVtfY2poa3FydX1+gISFiYqPkZGVlp2aoaOlp6qrsbS1tbm6u8C+xMTGxczMy9PQ09PW2tjb3N7b4eLj5OPm5urn6enp6enq6err6evr6err6unl5edCQkNDRUVFSEdLS0xOUVdaX2FqZ2pvcXV7fH6Dg4iIjY+QlJWcl5+ho6WpqrCztLS5ubq/vcPExcXMzMvT0NPT1trZ293e3OHj4+Tk5+fr6Orq6+vr7Ovt7ezu7ezt7u3s6ejqRERFRUZHR0pKTk5PUlZcXmRnb2xvdXZ8gYSFiouPkZWXmZ2do6CnqaytsLC3u7y7v8DBxsTKy8zN09LR2dfa2dzh3+Hi5OLn6Ojp6ezs7+zv7u7v7u/v7/Du8O/u7u/u7eno6kdHSEhKSktOTlFSU1VZX2BnaXFucXd5foKGhoyNkZOXmJqen6WhqKutrrGxuLy9vMDCwsfGy8zNztPT0tnY2trc4eDi4uTj5+jo6ejs7O7r7u7t7u7u7u7v7e7t6+zt6+rn5eZJSEtKTExNUFBUVVVXXGFkamx0cXV6fYOGioqQkZaZm52fo6Sqp62wsrS2tr3BwcDEx8fMy8/R0tLX19bc297d3+Pj5OXn5enq6urr7e3w7e/v7u7u7u/t7+3t7err7Orp5eLkSklMS01OT1FTVldXWmBlZ25weHV5foKIi4+PlZeboKGipamqsKyytbe5u7vCxcXEyMvLz8/T1NbW2trZ397h4eLm5efn6ejs7Ozt7e/w8e7x8PDw7/Dw7vDt7e3q6+zp6OXh40xLTk1QUVJUVllbW11kaWxydHx4fYKFi42SkpeZnqKjpKerrLKutLe5u728w8bHxcnMzNDQ1NXX19va2t/f4OHi5eXm5+no6uzr7Ozu7u/t7+7t7ezt7evt6+rq5ujp5uXi3d9NTFBPUlNUVllbXV1gaGxudHZ+eYGFiI+RlZabnaGnqKmssbC3s7i8vb7BwMfKysnM0NDT1NfY2tre3d3i4uPk5efo6enr6u3u7e7v7/Dw7vHv7u3s7e7q7erp6eTl5+Lh39jZVVNYV1lbXF9iZGdmaHJ1d3x+hIKJjI+XmZ2eoqWorq6vs7m3vrq9w8PEx8bMz9DO0dbV2Nnb3d7f4uHh5OXm5+fp6urq7Ovt7uzt7u3t7ezt6+no5ufo4+Xh39/Y2NzT1NHHx1pYXFxeYGFkaGptbG54e32ChIqIkJKUnZ6jpKaqrLSztLi+vMO/wcfHyMrL0NPU0tTa2dvc3+Dh4uXk4+fo6Orp6uzs6+3t7e/u7u7s7e3r7ero5uTk5d/h3tva0tHWzczJwL9fXWJhZWZoa29xdXR2gIOFiouSkJeanKOlqqqssLG6uLm+w8DIw8bMy83Pz9TW2NbY3dzf4OLj5OXn5ubp6+vr6+zu7e3v7u7w7u7u7O3s6+vp5+Ti4eLc39rY187N0sfGxLq5YWBlZGhpam5ydHd3eoOFh4yNk5GZm56kpqqqrLCxube5vcK/x8LGy8nMzs/T1dfW19zb3t/g4eLj5eTk5unp6enp6+rq6+rq6+rq6ufn5+bl4+Dc2dnZ09TQzcvCwca7uLatq2ZlamhsbW9zdnh8e36HiIuPkZaVnZ+iqKmvrrCztb67vsLHw8zHytDO0dPU19rc29zh4OLj5Obm6Oro6ert7O3s7O/t7O7s7O3r6urm5+bl4+Hc2dTU1c/Oy8bEurm+sq+spKNqaG1scHFzd3t8gH+CjI2Pk5WamaCjpautsrKytre/vcDEycXMycvRz9LU1Nfa3Nvc4eDi4+Tm5ujp6Ojq7Ozs6+vu7Ovs6+rr6ujo4+Tj4N/c19TOzs/JyMO/vLGwtamlo5uZbmxxcHR1d3p+gISDho+Qk5aZnZykpamtsLW1tbm5wcDDx8vHz8zO09DU1tbZ297d3eLh4+Tk5ufo6ejo6evq6+rp7Oro6efm5uXj4dzc29jW0s3KwsLDvLm2sq6ko6acmJWQjnh2e3p+foGFiIqOjZCYmpufoqSkq6yxs7W6urq+vsXEx8vOy9HP0dfT19na297h4OHk4+Xn5+jp6uvq6urs7Ovr6ezp5+fl4+Lh393W1tXRzsvFwbi4t7GtqaahmZeZkIuJhYR4d3t7fn+ChYiKj46RmJqbnqKlpautsLK2urq6vr3ExMbKzsrQztHW0tfY2tre4eDg4+Pl5uXn6Ojp6Ojo6unp6Obp5uPj4N7c3NnXzs7NysXCu7etrKumoZ6blY6MjYWAfnt5gH6Dg4aHioyQkpaUmJ+goqOnqqmvsbS2ur29vsLByMfKzdHO1NHV2tXb3d7e4uXk5Ofm6Ono6uvr7Ovq6uzq6unm6ebi4t/d29nW08rKycW/u7SwpaWjnpmWlI6HhYV/enh1dIOCh4eLi4+RlZabmZyjpKWnrK2ts7W4uby+v8DEw8nJzc7Sz9TS1tvW3N7g3+Pm5ebo5+rr6uzt7e7t7e3u7e3s6ezp5uXj4d/d2tjPzs7KxMG5tKqop6GdmZeQiIaHf3p5dXOHhouLj4+TlZmboJ6hqKmqrLCzsri6vb3Aw8TEyMfNzdDS1dLX1dre2N/g4uHl6Ojo6uns7evt7u7u7e3s7uzs6ufq5uLh39zY1tLQxcXDv7i0q6abm5eTjouJgnx5eXNvbWxqjYuRkZSUmZudoKSjpqyurq+ztra8vcDAw8XHx8rJzs/R09bT2Nba39nf4ePh5ejo6Ono6uzq7Ozr6+np5+nm5uPf4t3X1tPPyMfDwbOzsKykoJaTiImFgXx6eXNvbGtnY2NiYZCOlJSXl5yeoqSopqmvsbGytrm5vsDCwsTGyMjMys/P0tPW09jW297Z3+Hj4eTo6Ojq6evs6uzt7Ozr6+nr6Ojl4uXh3NrY1M/Myce6ubeyqqacmY6OioaBfn12cm5uamVkZGKTkZeXm5ugoaWnrKqtsrW1tbm8vMHDxcTHycvLz87R0tXV2dba2d3h3OHj5ePn6+rr7Ovt7uzu7u3t7Ovp6+fo5OHk3trY1dDJx8PBs7OvrKOflZKHhoOAe3h3cm5qamZiYmFgmJednKCgpaapq6+usLW3uLi8v7/ExcjHycvNzdDP09TW1trX3Nvf497j5efl6Ozs7O3s7e7s7u7t7Ovq6Onl5uLd4NrV08/KwsG7uquqpaOaloyJf357eHNxcGtoZWRhX15dXZqZnp6ioqeoq66xr7K3ubq5vcDAxcbJyMrMzs7R0NTU19fb2Nzb3+Pe4+Xn5ejs7Ozt7O7u7O7u7e3r6ujp5ebi3eDb1tLQy8PBu7urqqWkmpaMiX5+e3dzcG9qZ2NjYF5dXFydnKKhpaWqq66xtbO2ur29vMHEw8jKzMvOz9HR1NPX19rZ3dve3uLl4OXn6efq7e3u7u3v7+7v7+7t6+ro6ebm4d3g2tbSz8nCwLq6q6qko5mWi4l9fnp3cm9vaWZkY2BeXlxcn56kpKenrK2xs7e2uLy+v77DxsXJy83Mz9DS0tXU2Njb2t7c39/j5uHm6Oro7PDv8PDv8vLw8vLx8O/v7e7r6+fj5uLd2djSzcrDxLa1sK2koZaThoaDfnp2dW9raGdjYF9eXKCfpKWoqK2tsbS3tbi8vr++wsXEycrNzM7P0dHV09fY29ne3N7f4ubh5ujq6Ovv7/Dw7/Hx7/Hx8O/u7evs6enl4eTe29bUz8nFwL+xsKuon5ySj4ODf3t4dHNtamZmYmBfXl2hoKWlqamurrK1uLa5vb+/vsPFxMnLzMzO0NHR1dPX2Nra3tze3+Pm4efp6+js8fDx8vDz8/Hz8/Ly8PDu7+zs6eXn4t/a2dPOycTEtrSwraOglpOHh4N/end2cGxpaGRhYF9eoqGmpqqprq+ytbi2ub2/wL7CxsXJy83Mz9DR0dXT19jb2d7c3t/j5uHl6Ono6+7u7+/u7/Du8PDu7evq6Onl5eHd39nV0c3Jwr64uKmno6CYk4yJfn57eHRwcGtoZWViX19eXaKhpaapqa6usrW4trm9vr++wsXFycrNzM/Q0dHV09fY2tne3N7f4uXg5efo5unt7O3t7O3u7O7t7Ovp6OXm4uPe2tzV0s7Jxb+6tbSlpJ+clZKJhnx9eXdzb29qZ2RkYV9fXl6pqK2usbC1tbi7vry/w8XGxMjLys7P0tHT1NbW2djb3N7c4eDh4ubo5Ojq7Ort8O/w7+7v7+7v7uzq6Ofj5d/g29bYz8zHw762sauqnJqUkouIf310dXJva2lnY2JfX11cXVxcqKesrbCvtLS4ur27vsLDxMPHysnNztDQ0tPU1NjW2tvd2+Df4OHl5+Pn6uvp7PDw8fDv8fHv8fHv7uzs6erm5uLd4NnW0c7Kwr24tqimop6Vk4qGe315dnJubWlmY2NgXl9dXaemq6yurrKztrm7ub3AwsPBxsnIy83PztHS09PX1dna3Nrf3t/h5Ofi5+rr6ezw8PHw7/Hx8PHx7+7t7Onq5ubi3uDY1tHOycK8t7aopaGdlZKKh3x9eXZybm5pZ2RjYV9fXl6rqq+wsrK2t7q8v73AxMXHxcjMy87P0tHU1dbW2djc3d/c4uHi4+fp5ens7evu8fHy8fDx8fDx8e/t6+vm6OTk39rc09HMyMK7trGvoZ+Yl4+Mg4B1d3RxbWppZGNgX11bXFpaq6mur7Gytra5u769wMPFxsTIy8rOz9HQ09TV1dnY29ze2+Hg4eLm6OTo6+zq7fDw8fDv8PHv8PDv7Ovr5+jk5ODb3dXSzcjDvLezsKOhmpiQjoWDeHl2dHBta2dlYmFfXV1cW66ssLK0tLi4u73Av8LFx8jGys3M0NHT0tXW1tfa2t3e4N3i4uLk5+nl6Ovs6+3v8PDv7+7v7u/u7erp6OPl4ODc1tfPzMfCvbSwrKmampORiYd/fHJ0cW9raGZjYl9eXFtcWlqxr7W1t7i8vL7Bw8LFx8rLyczPztLT1dTW19jY29ve3uDe4+Lj5Ofp5ejr7Ovt7+/v7u7t7u3t7evo5+bh4t7e2dPUy8nDvrqxrKimlpSOjYWDe3hvcGxrZ2RjX15bW1lYWlhYsbC0tbi4vLy+wcTCxcjKy8nN0M/T1NbV19jZ2d3c3+Di3+Pk5OXo6ubp7O3s7e/w8O/u7u/u7u7s6ejn4uTg39vV1s3LxcG7tK6qqJeWj46Fg3t4bnBramdjY19dW1tZWVpYWLa0ubq8vMDAwsXIxsnLzs/N0NPS1tfZ2Nrc3N3f3+Lj5OLm5ufo6+zp6+/v7u/x8fHw8O/w7u7u7Ono5uDi3dzX0dHIxb66taymo6CRj4iIgH52dGxtaWhlYWFeXVtbWVlaWFi7ub6/wcHFxcfKzMvO0NLT0tXY19vb3dze4ODh4+Pm5+jl6urq7O7w7O/y8vLy9PT08/Py8/Hx8e7r6uni5N/e2dLTysfAu7etp6OhkZCIiIB+dXRsbWhoZGFhXl1bW1lZWlhZvr3CwsTEyMjKzM/O0NPV1tTY29re3uDf4ePk4+fm6err6Ozs7e/x8u7x9PPz8/T09PPy8PHu7u3q5uTh2dzU08zGw7m3r6mkm5aQj4GAeXpzcmtqZGVjYl9eXVxcWlpZWlxaW769wsPFxcjIy83Qz9HT1dfV2Nva3t7h4OLj5OTn5unq7Ont7e3v8vPv8vT09PT19fX08/Hy7+/u6+fm5Nve19XPyMa7urKrpZ2XkZCDgHl6dHJsamRlY2JgXl1cXFtaWVpcWlvExMjIysrNzc/R1NPV19na2dzf3uLh4+Pl5ujn6unr7O3s7+/w8fPz8PL08/Py8vPy8PDs7ero5+Pd3NjM0cjFv7expqWelpCJhH99c3FsbWlpZGNgYF9eXl1cW1xbW1xdX15exsXJycvMzs/R0tXV19nb3Nre4ODj4+Xl5ujp6ezr7u7v7vHx8vT19fL09vX29fT19PPy7u/s6+rl397az9TLyMC6tKmooJmSi4WAfnRzbm9qamVkYGFfX15dXFxdXFxcXmBfX8fHy8vNztDR09XX1tnb3d7c4OLi5eXn5ujq6+rt7O/w8e/z8vP19vbz9ff29/X19fXz8+/w7evr5uHf29HWzMrCu7arqaKblIyHgYB1c21uamlkY19gXl1dXFtaW1paW1xeXV3IyMzNzs/R0dPV19fZ293e3eDj4uXl5+fo6uvq7ezv8PHv8vHz9Pb18vT29fb09PTz8vHt7uvp6OTe3NjN0snFvbexpqSdlo6Hgn17cW9rbGhnY2FeXl1cW1taWVpZWVpbXlxdy8rOz9DR09PW2NnZ29zf4N/i5OTn5+no6evs6+7t7/Dx7/Lx8vT19PLz9fP08vDx8O/u6ern5ePe2dfSxsvCvrewqZ+dlo+HgHx4dm5saGllZWFgXl5dXFxbW1pbXFxdXmFfX9HR1dXW19nZ293e3+Dh5OTk5uno6+vt7O3v8O/y8fP09PP19fb4+Pb09vf19fPw8e/u7ebn5OHe2NLQyLzAtrGpo5qQjoeCenZyb25oaGVlY2RhYF9fX15fX15fYGFhYmNnZmbU1NfY2dnb293f4ODi4+Xm5ejp6ezs7e3u8PHw8vHz9fX09vX2+Pj29PX29PXy7/Du7Ovj5eHd2tTNysG3ua+ro5ySioeBfXZzb2xsZmZkZWJjYGBfX19fX19fYGFiYmRlaGdn1tbZ2drb3N3f4OHh4+Pm5+fo6+vt7e7t7/Dx8PLy8/T09PX09ff29PPz9PLy7+zs6+nn3+Dd2NTOxcK6rrClopqUiYB+enVvbWpnZ2NjYWJgYV9eXV1eXV5eXV9hYmJkZWhnZ9zc397f4OHi5OXm5ufo6uvr7O7u8PDw8PHz9PL09PX19fX19fX29fLx8fHu7+vm5+Xj4dbX1MzHv7exp56ekpCHgXdxb2xpZWNhYGFeXl1eXF5cXFtbXFxdXl1gYWRkZmdqaWrd3eDf4OHi4+Xm5+fo6evs7O7v8PHx8vLz9PX09fX29/f29/b3+Pf08/Lz8PDs5+jl4+HW19PLxr60sKWcnZCPg390b25raWRjYWBhXl9eX15gXV5dXl9fYGJhZGZoaGprbm1u3d3f3+Dg4uPk5ufn6Onr7Ozu7+/x8fLy8/T19PX19vf39vf29/j38/Ly8u/w6+bn5OLg1NXRysW7s66kmZqPjIJ9dG9saWdjYmBfYF1eXV9dX11dXV1fX2BiYWRmaGhqa29ubt7e4eHi4uTk5ufo6Onq7O3t7/Hx8vPz8/T19vX39/j4+fj5+Pn6+fb19fXy8u7p6ufl49jZ1c7KwLi0qZ6fk4+GgXdxb2tpZWRhYGFeX15fXV9dXV1dXl5fYWBkZWdoamtvbW7l5efn5+jp6uvs7e3u7/Hy8vP19fb29vf3+Pn4+vn6+vr5+fn4+fjz8vHx7e7o4+Pg3drMzsm+ua+nopeNjIN/d3VsaWhmZGJiYWFiYGJgYWBiYGFgYWJjZGdlamttbW9wdHJz5eXo5+jo6ers7O3u7u/x8vLz9PX29vb29/f49/j4+fj49vb29PXz7e3s6+fn4dzb2dTQwcK9sq2hmZWKgYB4dG1sZGFhYF9dXVxdXlxeXV5cX11eXV9gYWNmZGlrbW1vcHRyc+np6+vr6+zt7+/w8fHx8/T09vf39/f3+Pj4+fj5+fn39/T09PLy8Ojn5eXg4NnT0s/JxbO0r6OdkYuGfHVybWplZV9dXV1cXFxbXF5cXl1dXWBeX19gYmRmaWdsbnBwcXJ2dXbr6+7t7e7u8PHx8vPz9Pb39/j5+fn5+fr6+vv5+vr69/f09PTx8e7m5ePj3d3Vz83Kw76rrKeZlImEfnVwbGhmYWFcWlxcWltcW1tdW15cXVxgXmBfYWNkZ2pobG9xcHJyd3V26ens6+rr7O3v7/Dx8vL09fX29/f4+Pj4+Pj6+Pn5+fb28/Pz8PDu5eTi4t3c1M7MycK9q6qkmZOHgXxzbWllZF5fWVhZWVdYWVdYWlhaWVpZXFtcW15fYWNmZGlrbWxub3Nyc+zt7+7u7/Dx8vP09PX19/j4+fv7+/v7/Pz8/fv8/Pz4+PX19fLy7+bl4+Pd3dTOy8jBu6eoopWQhH95cWxoZWNeX1pZWlpZWltaWl1aXVtdXF9eYF9hY2Zoa2ltcHJxcnN4dnfv7/Hw8PHx8vT09fb29vj6+fr8/Pv8/Pz8+/z7+/v69vby8vLt7erg39vc1dTJw8C9s6yXmJKFgnZybWhkYF9dW1tYV1lZWFlbWlpdW15cXl1gX2JhZGZpa29scHJ0dHV2enh57u7w7+/w8PHz8/T19fb3+Pj5+vr6+vr7+/r7+vr7+vX18fHx7e3q4d/c3NbWy8XDv7exm52XioZ7d3FraGNiX11dWVhaWllaW1paXVteXF1dYF9iYWNmaWtubHBydHN0dXl4efHx8/Ly8vP09fX29/f4+fv6+/z8+/z8/Pv7+/r6+vn08+/v7urp5tzb19bQzsS9uratpZKSjYF9cnBqZmNfX11bWlhYWllYWVtaWl1bXl1eXWFgY2JlZ2psbmxwcnRzdHV5eHny8/Tz8/T09ff3+Pn5+fr7+/z9/Pv8+/z7+fn4+Pj18O7p6unj4t/V087OxsS4sa2pn5aEhIF0cmlnY19dWVlYWFhWVlhYV1laWVpdW19dX19iYmZjaGptb3Jvc3V3dnh4fHt89fb39vb29/j5+fr7+/v8/fz9/v37/Pv7+vf39/X28uzr5eXk3dzZz83Hxr67raegnZOLeXp3bGtjYl5bWldYWFhXVlZZWVhZW1tbX11hX2FhZWRpZ2ttcHJ1cXV4enl6e399f/f3+fj3+Pj5+/v7/Pz8/f7+/v/+/P38/Pv4+Pf29/Pt6+Xm5d7c2M/MxsW8uKqknZqQiXd4dWtpYmJeW1pYWFhYWFZWWVlYWlxbXGBeYl9iYmZlamhsbnFzdXJ2eXp5e3uAfn/29vj39vf3+fr6+vv7+/z9/f3+/fv8+/v69/b29fby6+nj5OPc29fNysTEu7ipo52Zj4h3eHRqaGJhXVpZVldWVlZUVFdXVldaWFldW19cX15iYmdlaWtucHNwc3Z4d3h5fXx99/f5+Pf4+Pn7+vv8/Pv8/f39/vz6+/r6+fX09PLz7ufl3+He19TQx8S8vLGvnpmTjoV/b3BuZWNeXVtYV1VWVlZWVFVYWFdZW1pbX11hXmBhZWRpaGttcHJ1cnZ5enl7e4B+f/b3+Pj29/f4+vn6+/r6+/z7+/z59vj39/Xx8PDu7+rh39jb19HOycG+tbWqp5eSjIZ+eWxta2NiXFxaV1dVVVVWVlRUWFhWWFtaWl5cYF5gYWVkaWhrbXBxdHF0eHl4enp/fX/29/j39vf29/n4+Pn5+Pn5+Pj59vL08/Lw6+np5+jg2NbO0MvGwbu1saalmpeHgn53cm5lZGReXVlYWFZWVVVWVlZVVllZV1pdXF1hX2RhZGVqaW1sb3F1dnl2eXx+fX5/g4KD9vb39vX29fb49/f49/b29/X09fHt7+3s6eLf39zc08vIwMG5tbCppJ+TkYeDdXFvaGZkXVxdWVhWVVVUVFRUVVZWVFZaWlhaXl1gZGJoZGhobm5ycHR1eXp9en2BgoGCg4eGh/b29/b19vX29/f29/b19fXz8vPu6ezp6OXe2trY187Fwrq8sq6poZyYjYp/fG9sa2RjYVtaW1hXVlVWVFVUVVZXVlVXW1pYW2BfYmZka2dqa3FxdXN4eXx9gH2Ag4WEhYWKiYr39/j39vb19/j39/j39vb39PT18Ozu7Ovo4t7e29vTyse/wbi1sKmjn5SShoN1cW5nZmNdW1xYV1VUVVNTUlNUVVRTVVlYV1leXWBkYmhlaGlvb3Nxdnd6e397foGDgoOEiIeI9fX29fT19PX39vX29vX19fPy9O/r7erp5t/d3NrZ0cnGvr+3tK+oo5+TkYaEdnJwaWdkX11eWVlXVldVVVRVVldWVVZbWllbX15hZmNqZmpqcHB0cnd4e3yAfICDhIOFhYqIivb29/b19fX29/f29/f29vb19PXx7e/t7Orj4ODe3tbMysLEvbm0rqmkmZeMint2c2xqZ2BfX1paV1ZXVVVUVVVWVlRWWlpXWl5dX2RhZ2NnZ25scW9zdHh5fHl8gIF/gYGGhYb19fb29fX09fb29fb19PPz8O/w6uXo5ePg19PT0NDGvbmys6mmn5iVkYWBd3ZqZ2ZhYF1aWFpYV1ZVV1VWVlZXWFhXWV5dW15kY2draHBscHB3dnt4fX6BgYWChYiJiYqKj46P9PT19PT08/T19fT19PPy8u/v7+rk5+Tj39fT09DQxr26srOqpp+YlZGFgnh2a2hmYWBeW1laWFhWVldWVlZWV1hYV1leXVteZGNnbGlxbXFxeHh8eX5/goOGg4aJioqLi5CPkPb29/b19fT19vX09fTz8fHs7Ozl3uLc29fNx8jFxLiwrKSlmJWPh4WCdnNramJgYFxbW1hYWVlYV1ZZWFlZWVpcXFpcY2FgY2ppbXFud3J2dn59gX2Eg4eHioeLjY+Oj4+Uk5Tz8/Tz8vLx8vLy8PHw7uzt5+bn3tjb19bQx8HCv72zqqafn5ORioSBfnRwaWlhX15bW1pYV1lZV1dWWVhYWFhaW1xaXGNhYGNqam1ybnhzdnd+fYJ+hISIh4uIjI6Qj5CQlZSV8vLy8vHx7/Dx8O7u7evo6OLf4NbO0szLxLq1tbGvo5qVkI2BgHlzcW9mZF9fWllZWFdYV1ZZWVdYWFtaW1tbXF9hXmJpZ2hrcnJ1eXeAe4B/h4aKho2MkJCTkZSWmJeYmJ2cnfT09PTz8/Lz9PPy8vHw7e3o5+jf19vW1NDFv7+8uq6loZuajYuFf316cG1nZ2BfX1xcXFpZXFtaWlldXFxcXF5fYV5iaGdmanBwc3d0fnl+fYWEiISLio6OkY+SlJaVlpebm5z29vf29vb19vb29PX08/Dx7Ovr49zf2tnUysTEwcC0q6afoJOQioSCfnRxampiYGFdXV1bWlxbWlpZXFtcXFtdX19dYGZlZWhvb3J2cn13fHyDgoeCiYmMjJCOkJSVlJWWmpqb9PT19fT08/T09PLz8vDs7Obm5tzV19LQy8G7u7m2q6KcmJaKiYN+e3lwbGhoYWBhXl5eXFteXVxcXF9eXl9eYGJjYWRqaWptc3R1enaBfICAh4aKhYyMj4+TkZSXmJeYmZ2dnvf39/f29vX29/b09fTy7+/p6Onf2dvW1M/Fv7+9urCnoZ2bkI6IgoB+dXBrbGRjZGFhYV9eYF9eXl1gX19fX2BiY2FkaWloa3FydHh1f3l+foSDiIOKiY2MkI6Rk5WUlZWZmZr09PX08/Py8/Pz8fHx7uvr5eLj2dPVz87Hvbe4trGon5qXlImHgXx5eG9saGliYWFfX2BeXV9fXV5dYV9gX2BhY2NhZWtqam10c3Z5d4B6f3+GhYmEi4uOjZGPkpSWlZaWmpqb9PT19PPz8fPz8e/v7+vn59/c3tTMzsfGwLausK2on5eRj4uBgHl1cnJraWVmYGBhX19gX11gYF5fXmFgYGBgYWNlY2dsa2ptdHR2eXeAen9/hYSIhIqKjYyQjpGTlJSUlJmZmvLy8/Lx8fDx8e/t7u3p5OTb2drQyMrDwbuxqaqoo5mSjIuGfXx2cW9vaWdjZWBgYF9fYF9eYWFfYF9jYmJiYmRmZ2Vqb25tcHd3eX16g32CgomHi4eNjZCPk5GUlpeXl5icnJ3y8vLy8fHw8fHv7u7t6ubl3drb0cnKxcO8s6ysqqSbk42MiH58dnFvbmhmY2RfXl9eXl9eXWBgXl9eYmBhYWFiZGZkaG5tbG92dnl7eYJ8goKIh4uHjYyQj5ORlJaXl5iYnJyd8vHy8vHw7/Dv7uzs6+jj4NjU1svCxL+8taukpaKclIuFhIB4dXBsamplZGFiXl5fXl5fXl5gYV9gX2NiYmJjZWdoZmpwb25xeXh6fXuEfoODiYiMiI+OkZGUk5WXmZiZmZ2dnvPy8/Py8fDx8O7r7Ovm4d7V0dLIv8C6uLCmn5+cl46Ff396c3BsaWdnYmJgYV1dXl1dXl5dYGFfYF9jYmJjZGVoaWdscXBvcnp6fH58hX+FhIuKjYmQj5KSlpSWmZqampqfn6Dy8fLy8fDv8O/t6+zq5uDe1dDSx7/AurmwpqCgnJePhX9/e3NwbGlnZmJiX2FdXV9eXl9eXmFhX2FfZGJjY2RmaGlobHFwb3J6eXt+fIV/hYSKio2KkJCSkpaUlpmampubn5+g7+/v7+7t7Ozr6ebn5d/Y1svHyb62tq+upZyWlpONhX13eHNta2dlY2RhYF5gXV5fXl5fX15iYl9hYGVkZWVnaGtsa290c3J1fX1/gX+JgoiIjo2RjZSTlpWZmJqcnp2enqKio+/v8O/u7uzt7evo6efi3dvSztDGvr63t6+ln6Cdlo+GgYF9dnNvbGpqZmRiY15fYV9fYF9eYWJfYWBkYmNjZGVnaGhrcG5ucXl4en17hH2Dg4mIjIiOjpGQlJOUl5iYmZmdnZ7w8PDw7+7t7u3r6Onn493b0s7Qxr6+ubivpqChn5iRiIKCfnd1cGxramZkYmNfX2FfX2BfX2JiYGFfZGJjY2NlZ2hna29ubnB4d3l8e4N8g4OIiIuHjo2QkJSSlJeYl5iYnZyd7u7u7u3t6+zq6OXl493W1MjGxru0sq2to5qTlJGLg3t1dHJtamdkY2NhX15fXV5fX15gX19jY2FjYWdmZmdpam1vbXF3dHV4f4CBhIKLhY2LkJCUj5aVmZicm52foaChoaWlpurq6urp6efo5uTg4d/Z0s7EwcG1rq2pp52Vj5CMh4B2cXFuaGZjYWBgXVxbXFlbXFxbXVxdYWFfYWBlZGVmaGlsbm1xdnN0d3+AgIOCi4SMi5CPlI6WlJiXm5qcnqCfoKCkpKXp6enp6Ofm5+bl4eLg29XSycXFurOxrqykmpSVkYyEfHV1c2xqZmNiYl9eXV1aW1xcXF1dXWBgX2BgZGNjZGVmaGtpbXJwcXR7e3x/f4eAiIiMjJCLkpCUk5iWmJqcm5ycoKCh5OTk4+Lh39/c2dPU0crBvLKsr5+blpKSiYJ8e3h1bmhjY2JfXVtaWlpZWVlZWVtbXFxdXl5iY2FkY2hoamptbnBzcXV6eHh7g4OEh4aOh4+PkpKWkpmXm5qenZ+hoqGjo6enp+bn5+bl5ePk4uDc3NrVzsrAu72vqqelo5mSi4yJhn52cHJuaWhkYmJiYF9fXl1eXmBfYGBhY2ViZWRoZ2lpa2xvcXBzeHd3eoCBg4aFi4eOjZCQlZGWlZiYnZudn6CfoaCkpKXg4ODg397c3NjWz8/Mx7y4rKSmmpWQjY2EfHd1cnBqZmFhYWBeXVxcXVxdXV5eYGBiYWNjZGdpZ2pobm1wcHNzd3d2eoB+fH+HiIuMjJGOlJSXl5uYnZyfoKOio6Wnpqenqqqr3t/f3t3c2dnT0crJxsC0r6KanI6LhYOEe3RvbWtpZGFdXV5dXFtcXF5dX19fYGJjZmRmaGlrbm1wb3R0d3Z5eX1+fICHhYOGjo6Rk5KXlZqanJ2hnqOipaapp6mrrautrLCwseHh4eDf3tzc1tTNy8nDtrGmnZ+QjIaEhXx1cG5sa2ZjYF9hYF9eX19hYWJjZGVnZ2toam1ucXRzdnR5enx8fn6Dg4GGjIuIi5OVlpmYnZygoKOip6SpqKurr62vsLKxsrK1tbbd3d3d3NrY2NDNxcPCu62onZSVh4R/fX12b2tpZ2ZiX11cXl1cW1xbXl1fX2BgY2NmZGZpam1vb3JxdXZ5eHp7gIB+g4mGhYiQkZOVlZmYnZ2foKOhpaWoqKyqrK2vrq+vsrK009PT0tDOy8rAvLKyr6eZl4yDhXx5dHNzbmpmZGJiXl1cW1xdW1xdXF5eYGBhYWRlaGZpbG1wcnN2dHl6fXx/foSDgYiMioiLk5WWmZicm5+goqGmo6inqqqurK6vsbCxsbO0tcjIx8fFwb+8raqhn5uThYJ3cnJra2ZlZWFfXVtbWlpZWVdaW1pdXV1eX2JiY2NnbG9tb3J0d3t7f32ChIaFiIeNjIuRlpWRlZyenqGhpaWnqKmpr6uwr7GytbS1tri3uLi6u7y+vr28urSxrZmWjIqIf3R0a2dmYmJdXV5aWlhXV1ZYWFhXWltZXV5dX2BjZGZla3B0cnN1eXuAf4WDh4qLi46OlJOSmZ2cmJ2jpaSop6yrra+vsLWxtrW2t7q5u7y+vL2+v8DBs7Oysa+opZ+KiH99fHJqamNgYFxdWVlaV1hWVlZUV1hZVlpbWl5eXmBhY2RnZWpwc3JzdXl6gX+Fg4eJiouNjZSSk5idmpidoqSjqKasqq2ur6+0sLW0tba5ubq7vby8vb7AwK2tq6uon52VgYF4d3dtaGpiYGFdX1tbXVpaWVlZWFtbXFpeX15iYmJkZWhpa2ltdHZ2d3h+f4WDiIaLjo+QkpGYlpedop6coKioqKuqsK+xsbOzt7W5uLi6vLy+v8G/wMHCw8SkpKOin5WTi3h4cG9vZ2FkXFtbWVpWV1hWVlRVVVNVVldVWVpZXl5eYGJlZmlma3JzdHV3fH2DgIaEiY6Oj5GQmZWXnqKfnKGpqKqsq7KwsrO1trm3vLu6vb6/wcLDwsPExcfHpKSioZ6VkYh3dm5ubWVgY1pZWVdYVFRWVFNSUlNQU1JUUldXVVlaWVteYGFjYmZsbG5xc3Z4fnt/foSJiYmMipWPkpmfm5ibpKSmqKaura6vsbK2s7m5t7q7vL6/wcDAwcLExJucmpiWjIqAdHJrbGpkYGJcXV1ZWVhXWldYV1hZVVlaW1heXV1hYWFiZWZoa2ptcXJ0dnd8fYJ/hIOIjI2OkI+Zk5ecn5ybnaanpqmnr66vsbKztrW4uba6ury+v8DAwMDBw8OSkpCPjIKAdmtqY2RiXVlbVldXU1RSUVVSVFJUVVFVVVdUWlhZXFxcXWBiY2ZmaGxtb3Fzd3d+en9/g4eIiYyKlI6TmJuYl5mhoaGjoqqqqqyusLKxtbeyt7e6u7y+vr2+v8LChYWEgn92dm5naGJjYl5bXFlbW1dYWFdbWFlYWVpWWVpbWV5cXGBgYGBjZGVoZ2ltbG9zc3h2fXp9fYKGhoeLiZCMkZaYlZSWnJ2dn5+mpqWoqqutrK+xrbKxtLa3ube4ubq9vIKDgYB9dXRrZWZhYGBcWltZWltYWFhXXFlbWVtcWFxdX1thYGBjZGRkZ2lqbWxucnJ1d3h8e4N/hIOHjIyNkY+Vkpednpyam6KkpKWlrayrrrCxtLO2uLO5t7u9vsC+v8DBxMOFhYSCf3Z1bGZnYWFhXVtcWVpcWFlZWF1aW1tbXVlcXl9cYWFgZGNkZWhpam5rbnNydnh4fXuDgYSEh4yNjZKQl5OYnp+cm56jpaWlpq2tra+xs7Sztri0ure8vr7Avr/BwcTDhoaEg4B3dm5naGNiYl5cXVtbXFlaWlldXFxcXV5cX2FiYGRkZGdoZ2lsbm9ycHN3dnp8fIF/hoWHiIuPj5CTk5eVmp+fnpyfpaWlp6iura2wsLKztLW3tLm4u7y9v72+v8DCwYKDgYB+dXRtZmZiYWFdW11aW1tZWllZXFtaW1xcWV1eX11hYWBjZGRlaGlrbmxvcnF0d3d7eoGAgoOFioqKj46SkZaam5mYmqCgoaOkqqmpq6ytr7Cxs7C1tLe4uru5ury8v756enl3dWxsZV9fW1paWFdXVldYVldXVlpYWFlaW1ldXmBeYmJiZmZnaGtsbnFwcnZ1eXp7gH6FhYeHio6Oj5OSlpaanp2cm56jo6Smp6ysrK6vr7GysrSxt7a5ubu8u7u8vcC/d3d2dHNra2RfX1xbXFpZWVhZWlhaWVldXFxcXl9dYGJkYmdnZ2tra2xwcXN2dnd7en6AgIWEiYmLi42TkZOWlpuZnqCgnp2hpqSlqamura6wsLGytLS1s7i3urq8vbu8vb7Av3Z2dXNya2tkYWBdXV5cW1taW1xZXFtaXlxeXV9gXWFiY2JmZmZqampsb29xdXV2enh9f3+DgoiIi4mMkpCRlZWamJ2enp2cn6Wjo6eorKusr66vsbKytLC2tbi5ury6u7y9v75wcHBubGVmYFxcWVlZV1dXVldXVlhXV1tZW1pcXVtfYWJhZWVma2trbHBwc3Z3eHt6foGBhoWKiY2LjZSSk5aXnJqeoKCfnqCno6WpqK2srbCvsLOzs7Syt7W5urq8uru8vb++b29wbWtkZV9dW1lZWVhYV1dZWVhZWFhdW11cXmBeYWNlY2dpaW5tbm90c3V5eXp9fICDhIeHjYyPjo+WlJWYmZ2boaGhoaCiqaWmqqqvrq6xr7G0tbS2s7i3uru8vbu8vb7Av2dnaGZkXl9ZV1ZUVFVUU1RTVVVUVlVUWVdaWVpdWl5gY2FmZ2dtbG5uc3N2eXp7fn2BhISIiI6OkY+Rl5aYm5ufnaSkpKSjpaynqa2ts7GwtLK0t7e3uLW7ury+vsC/v8DBw8JgYGBeXVZYUk9PTU1NTUxMTE1NTE5OTVJQVFJUVlRYW11bYGJiaGZqaG9ucXR2dnl5fYGBhoSLi42Nj5WUlZeZnJuhoaKhoKOppKarqrGwrbGwsrW1tbazubi5vLu9vLy9vsG/Y2NjYWBaXFdUVFJTU1NSUlJUVFNVVVVaWFtZXF5cYGJlZGhqam9ucXF3d3p8foCCgIWJiI2NkpGTk5Wcmpudn6Kipqeop6aorqmrsK+1tbO2tbe6urq7uL28vr+/wcDAwcLEw1xcXVtaVVhSUFBOT09QTk9QUVFRUlJUWFdaWFtdXGBjZWRqbGtxcHNyenl7f4GChYSHi4yRj5WVl5aYn52eoKOlpaiqq6uprLGsrrOyuLi1uLe5vLy8vbvAv8DBwcLCwsLExsRSU1NSUk5QTEhJR0hISUhISUtLS01OT1RTV1VZWlpeYWRjaWtqcXBzcnp5fH+Cg4aFiY2Nk5CXlpmZmqKgoaKlp6irra+urK60r7G2tbu8t7u7vL+/v8C/w8LCxMPFxcTFx8jGT1BQT05LTUpGR0VGRkdFRkdJSUlLS01RUFVTVlhXW15gX2VoZmxsbm91dnh7fYCCgYSIiI2MkpGUlJWcm5ydoaKjpamqqaiqr6uusbG4uLS3trm8u7u+vMC/v8HAwsLBwsTGxEtMTEtKSEpHREVDRERGQ0RFR0dISklLUE9UUlVXVVtdX15kZmVrbG5udXV4e36AgoGEiImOjJKSlZWWnZydnqKjpKaqrKqpq7CsrrKxuLm1uLe6vLy9vr3BwMDCwMLDwsPExsRHSEhIRkVHRURFRUVGSEdISUxLTE9PUlZWWlhcX15iZWhnbG9udHR2dn19f4OFh4mKi4+RlJSZmZucnaOipKOoqamrr7Gxr7K1srS3tr2+ur29vsHAwsTCxsXFx8XIyMfIycvJSEhISEdFR0VERURFRkhHSEpMTExPUFJWV1tZXmFgZGdpam9xcHZ2eXh/foKEhomKi42QkZSVmpqbnZ2jo6SkqKmpq66wsK+xtbKzt7a8vbm8vL3Av8HCwMTDw8XDxcbFxsfJx0ZGR0ZGRUdGRUVGRkhKSUtMT05PUlNWWltfXWNlZWlsbm50dnV7e319hYSHiYuOj4+RlZaYmZ2enqCgpqanp6usra6xs7OytLe1t7q5vsC8v7+/w8LDxMTGxsbIxsjJyMnJzMpFRkZGRkVGRkZHR0hJS0tMTlFQUVRVWV1eYmBmaWhtcHFxdnl4fX2Af4eHioyOkZKSk5iYmpyfn6Cioqipqqqur6+xtLW2tbe6uLq9vMHDv8PCw8fFx8jHysrKzMrMzczNzdDOSEhJSEhHSUlISUlKS01NTlBTU1NXWFxfYGRjaGtqb3Fzc3h6en5/goKJiYuNj5KUk5WZmZudoKCho6Ooqauqrq6vsbS1trW2uri6vLvAwr/BwsLFxMbHxsnIycrJysvKy8vOzEdHSEdIR0hJSUpKS01OTlBSVVVWWVtfYmNnZmtubXJ1dnZ7fX2CgoWEi4uOj5GUlpWXnJqcnqGhoaOkqKmrq66ur7GztbW1t7m4ury7v8G/wcLBxcTGx8bJyMjKyMnLysvLzctFRUZFRkVHSEhJSkpNT09RUlZXV1tcYGRlaWhtcG9zdnd3fH5+goOFhYuMjZCSlZiWmJ2bnZ+jo6Okp6urrayvr7Gztbe4t7m8uru+vcLDwMPEw8fGx8nIysrKy8nKzMzMzc/NR0dHR0lISUtMTU5OUVNTVVdaXFxgYWZpaW5tcnVzeHp7e4CCgoWGiYmOj5CSlZeamJufnZ+hpaSlpqirra6usbGytLa3uLi7vbu9v73Cw8LExcPIx8nKysvLzM3Lzc7Oz8/Sz0dISEhKSktMTU9QUFRWVllaXmBgZWVrbm5ycnd5eH1+f4CEhYaJioyNkJKTlZaZnJqdoJ6goqalpaeorKyvrbGxsrS2t7i4ury7vL+9wsLBxMTDx8bIysrLy8vMy8zOzs7P0c5JSUpKS0xNT09RU1NXWVpdX2NlZWtrb3Jzd3d7fnyBg4OEiImLjY6QkJWWl5manaCfoaSio6apqairq6+vs7GztLW3ubm6ur2+vr/AvsPDw8bGxMjHycvLzMvLzcvMzs3NztDOR0dISEpLTE9PU1VVWl1fYmVpa2txcXV5en1+goSDiIqJi46QkZOVlpeanJ2en6OlpKepqKirrq6tsa+ztLi2uLm7vb6/v7/BwsLExMPHyMjJycjLy8zMzc3MzM7LzM7Nzc/OzENERUVHSElNTVFTU1hcXmFkaGprcXF1eXt+f4KFhImKiouPkJKUlpeYm52eoKCkpaWnqqmprK+vrrKxtLW5t7m6vb6/wMDAwsPDxcXDyMjJysrJy8vLy8zMy8zNysvNzMzNzctISEpKTU1PUlNWWVldYWNmaW1vb3V1eXx9gYGFh4eMjYyOkZOUlpiZmpyfoKGhpaemqKqqqa2vr6+ysbS1uLe4uby9vr6/wMLCw8TEw8fIyMnJyMvLy8vMzMvMzMrKzcvMzc3KSkpMTE9QUlVWWl1eYmZoa29zdXV6en6Cg4aHioyNkZOTlJeYmpyenqCipKamp6urrK2vr6+ytLSzt7a5ub28vb7BwsPDw8TGxsfIx8bKysrLy8rMzMzLzMzLzM3Ky8zLzM3MyUxMTU5RUVRXWF1fYWRoam1xdXd3fHyAg4SJiYyOj5OVlJaampyeoKChpKanqKisra2vsbGws7W2tbi4uru9vb+/wsPExMTFx8jIyMjHysvLy8vLzczMy8zMy8zMysrMy8zMzMhKSktMT1BTV1ddX2FkaGptcnZ3eH19gYSGiouPkJKVl5aYm5ydn6Gio6anqaqqrq6usLKysrW3uLa5ubu9v77AwcTExcbGx8jKysrKyczNzc3Nzc/Ozc3Ozs3OzszMzc3Ozc7KTExNTlFRVFhYXl9iZWlqbnN3eHl+foKGh4uMkJGTl5iXmpydn6Cjo6Wnqaqrq6+vr7Gzs7O2uLm4urq8vcC/wcHExcbGx8jJysrKy8rMzc3Nzc3Pzs3Nzc3Mzc7MzM3Mzc3OyktLTE1QUFNXV11eYWVoam5ydnh5fX6ChYaLjJCRk5eXl5mcnZ+go6Skp6mqq6uvr6+xs7Oytri5t7q6vL3AvsHBxMXGxsbIycvKy8vLzM7Ozs7Oz8/Ozs7Pzs/Pzc3Pzs/Oz8tQUFFSVVZYXV1jZGdrbm9zeHt+foKDh4qKkJCUlZibnJyeoKGjpKanqKqsra6usrGytLW2tLi6u7q8vL2+wb/DwsXGx8fHycrLy8vLy8zNzc3Nzc7OzczMzczNzczLzczNzM7KT1BSU1ZXWl5fZWdqbW9ydnp+gIGEhouNjZOTl5ebnp+foaSlpqiqq6utsLCxsbW1tbe5uri7vb69v7/BwsTDxsXIycrJysvLzM3NzczNzs7Ozs7Pz83Nzc7Nzc7MzM3Mzs3OylBQUlRXWFtfYGZnam1vcXZ6fX+AhIWJjYySkpeXm56fn6GkpKanqqqrra+wsbG0tLS2uLm3u72+vL6/wMHDwsXEx8jJyMnKy8vMzMvLzM3NzMzNzs3LzMzMzMzMzMvMzM3LzcpQUFNUV1lcX2FnaGptcHF2eX1/gIOGio2MkpKWlpudn56go6Smp6mqq6yusLCwtLO0tre5trq7vbu9vb+/wcHDw8bHx8fIyMnKysvKysvMzMvLy83MysvLy8vLy8rKy8rMysvIUFFTVVhZXWBiaGhrbnByd3p+gIGDhYqNjJGRlZaanZ6eoKKjpqapqqqsrq+wsLOztLa3ube6u727vr6/wMHCxMPGx8fHyMjJycrKysrLy8vLy8zNzMrLy8zLzMzLy8vMzczMylFSVFZZW15hY2hpbG9wcnh8foGChIaKjoySkpaXm5yenqCio6WnqKmrrK6wsLCzs7S2uLm3uru9u76/v8DBwsPDxcbGxsfHx8jJycnIysrKycrKy8rIycnJysrKysnKysvJyshVVllbXmBjZWhsbnBydHZ7foGDhYeJjZCQlJWYmZ6foqCkpaaoqqusra+wsrKytrW2uLq7uby9v73AwMHBwsPExMXFxsXGxsbHx8jHx8jIyMfIycnJxsjIycjJycnIyMjKx8jFWFlcXmFiZmhqb3BzdXd5f4GEhoiJi4+TkpaXmpugoKOipaanqqusra+wsrS0s7a3t7m7vLq9vr++wcHBwsPExcTHx8fGx8fHyMnJycjJycnIysrLysjKysvKy8rLysrLzMrLyFtcXmBjZWhrbXJydXd5e4CChYeJi4yRlJOXmJucoKGjoqanp6qsra6vsbK0tLS3t7i5u7y7vr6/vsHBwcLDxMXFx8fHx8jHyMjJycnJysrKycrKy8rJysrKysvLy8rKy8vKy8leXmFjZmdqbm90dHh5fH2ChIeJioyOk5aVmZqdnqKjpaSnqamsrq+wsbK0tra1uLi5ury+vL+/wcDCwsPDxMXGxsjIycjJycnKysrKysvLy8rLy83MysvLzMvMzMzMy8zNy8zKYWJlZ2prbnFzd3h7fH+BhoeKjI6PkZaZmZyeoKKmp6moq62tsLGys7W2t7m5uLu7u72/wL7BwsPCxMTFxsbHyMjKysrJy8rKy8vLy8vMzMzLzM3NzcvMzM3MzczNzMzMzcvMymJiZWdqa29ydHh5fH6AgYaIi4yOj5GWmZebnZ+hpaWnpqmrq66vsbGztLW3t7e6urq8vb69wMDCwMPDw8TFxcbHyMnJyMnJysrKysrKy8vLysvLzMzKy8vMy8zMzMzLzM3LzMplZmlrbm9ydnd7fH6Ag4SIio2OkJGTmJuanp+io6eoqqmrrq6wsrOztba3ubm5vLu7vb/Av8HCw8HExMTFxcbHx8nJysnKysrKy8vKysvLy8rLzMzMysvMzMzMzM3My8zNy8zKamtucHN0eHt8gYGEhYiJjY+Rk5WWmJygnqKjpqerq62sr7Gxs7W2tri5ury7u76+vr/BwsHDxMXExsbGx8fIycnLy8vKy8vLzMzMzMzMzMzLzMzNzcvMzM3MzczNzMzNzczMym1ucnN2d3p+f4ODhoeKjI+Rk5WXmJqfoqClpqiqra6wr7K0tLa3uLm6u7y+vb7AwMDCw8TDxcbHxcfIyMnJysrKzMzMy8zMzM3NzMzMzc3NzM3Ozs7Mzc7Ozc7Nzs7Nzs7MzcpvcHN1eHl8f4GFhIeIi42QkZSVl5ianqGgpKWnqKytr62ws7O1tre3ubm6vby8v76+wMHCwcPExcPFxcbGxsfIyMnJysnKycrKysrKycrKysrLy8zMysvMzMvMy8zLy8zMysvIcXJ2d3p7f4KDh4eKi42PkpOWlpiZm5+ioKSlp6isra+tr7KytLW2t7i5ury7vL6+vr/AwcHDw8TDxcXFxsbHyMjJycrJysnKysrKysnKysvKysvLy8nKy8vLy8vMy8vMzMvLynV1eXp9f4KEhoqJjY2QkpSWmJmbnJ6ipKOnqKursLCysLO1tri5ubq8vL2/vr/BwcHCw8TDxcbHxsfHyMjIycrKzMvMy8vLy8zMzMvLzMzMzMzNzc3LzM3Nzc3Nzs3Mzc3MzMp5eX1+gYKFh4qNjJCQk5WXmJqcnZ6gpaalqKqsrbGytLK0t7e5urq7vby+wL+/wsHBw8PFxMbGx8bHyMjIycnKysvLy8rLysvMzMvLy8zMzMzMzs3NzM3Ozs3Nzc7NzM3Ny8zKfHyAgIOFh4mMjo6RkpWXmJqbnp6foaWnpqqrra6ys7Wztbi4uru7vL69v8HAwMLCwsTExcXGx8jGyMjIycnJysrLy8vKy8rLy8vLy8rLy8vLzM3MzMvMzMzMzMvMy8rLy8nKx4KBhYWHiYqMj5GQk5SXmZqcnaCgoaOnqKisrbCwtLW3tbi6uru8vb7Av8DCwcLDw8PFxcbGx8jJyMnJycrKysvLzMzMy8zLzMzMzMzMzMzNzc3Ozs3Mzc3Nzc3MzczLy8vIycWDgoaGiYqMjZCSkpSVmZqcnZ2hoaGkqKipra6wsLW2t7W4uru8vb2+wL/AwsHCw8PDxMTFxcbHyMfIyMjJycnJycrKysnKycrKysrKysvKy8vMzMzMy8vLy8vLysvKycnIxcbBhoWIiIqMjY+Rk5OVlpqcnZ6foqKjpamqq6+wsrK2uLm3ury8vb6/wMHAwcPCw8TExMXFxsbHx8jHyMjIyMjIycnKycnIycjJycnJycnKycrKy8vLy8nKysrKycjJx8XFwsC/uoiIi4uNj5CRk5WVmJicnp+goaOkpKeqq6yvsbOzt7i5ubq8vb6/v8DCwcLDw8PExMXGxcfGx8jIx8jIyMnJycnJysrKycnIycnJycnJysnKysvLy8vKysrKysrJycjHx8XDwr2MjI6PkJKTlZeYmZuboKKio6Snp6eqra2vs7S3t7u8vby+wMDBwsLExcTFx8bGyMjIycnJysrLy8rLy8vLy8vMzMzMzMvMy8vMzMvLzM3Mzc3Nzc3NzMzMzMzLysvJyMfEwsG8jo2QkJKTlZaYmZqcnKCio6Skp6eoq66usLO1t7e7vL28vr/AwcLCw8TDxMbFxcbGx8fHyMjJycnIycnJycnKysrKysrJysnJysrKysrLysvLy8zLy8rKysrKycjJyMbFwcC/upGRk5OUlpeYmpucnp6jo6Wnpampqq2vsLK1trm5vb6+vsDBwcLDw8TFxMXGxsbHx8fIyMjJycnJycnJycnKysrKysrKycrJysvLy8vLzMvMzMzMzMzLysrKysnHx8XDwLy7ubSSkZOTlZeXmZqbnJ2eo6Olp6Wpqaqtr7Cytra6ur2+v77AwsLDxMTFxsXGx8bHx8fIyMjIyMjJyMjJycnJycnJycrKysnLysrLzMzMzM3Mzc7Ozs3NzMvLy8vIxsbDwb66uLWxlZSWl5iZmpudnp+goaWmqKqoraytsLOztbm6vb7BwsPCxMXGxsfHyMrJysrKysvLzMzMzMzMzczMzc3Nzc3Nzc3Ozs7Nzs3Oz8/P0NDR0NDQ0dHQ0M/Pzs/PzcvLycfEwL68uZSUlpaXmZmanJ2en6Ckpaepp6usrbCysrS5uby8v8DBwMLDw8TExcbHxsfIx8fIyMnJycnJycnJyMnJycnJycnJysrKysvKysvLy8zLzMvLzMzMy8vKycjHx8XCwb69uLS0sK2VlZeXmJqam5yen6ChpaanqqesrK2xsrG1ubq9vcDBwsHDxMTFxcbHyMfIyMjIycnJycnKysrKycnKysrKysrKy8zMzMvMzMzMzc3Nzc7Nzc3Nzc3NysrIxsfEwL+8u7WvsK2pm5qcnJyfn6CgoqOjpampq66rsK+xtLW0uLu7v7/CwsPDxMTFxcbGx8fHx8jHyMjIyMjIyMjIyMjIyMnJycnKysrLy8vLzMvMzM3Mzc3NzMzMzMzLy8jGxMLDvru5trWwqqqnpJ+foKCgo6OkpKanp6msra+xr7OztLe4t7q9vsHBxMPExMbFxsbHx8fIyMjIyMjIyMjIx8fIyMjIyMjJycnKysrKy8vLy8vLy8zMy8zLy8vKysnJx8bEwb+9vbi2srCuqaKjoJ2kpKWlpqioqamrrKyusbK0trS3uLm8vLu+wcHDxMbFxsbHxsfHyMfIyMjIyMjIyMjIyMfIycjJycnKysvLzMzMzM3NzMzNzMzNzMzMzMzLyMjHxsPCwLy5t7exsKuop6KdnZqZpqanp6epqqurrK2tsLKztbe0uLi6vLy8vsHCw8TGxcbGx8bHx8fHyMjIyMjHyMjIyMjHyMjIycnJysrLy8vLzMzMzMzMzczMzMzMzMzMy8jJx8XDwsC8uri3srGrqaiinZ6bmaenqKioq6usrK2urrCzs7W3tbi4uru8u73AwMLCxMPExMXExcXGxcbGxsbGxsbGxsbGxsbGxsfHx8jIycnKysrKy8vKy8vLy8vLysvKy8rIyMbGw8LBvbu6uLOzrauppaCgnpypqaqqqqytra2vr6+ytLS2uba5ubu8vby+wcHCw8TDxMTFxMXFxcXFxcXFxcXFxcXFxsbGxsbHx8fIyMnJysnKysrKysrKysrJycnJyMnHxMXCwr+9vbm3tbOur6elpJ+am5iXqqqrq6utrq+vsLGxtLW2uLq4u7u9vr6+v8LCwsPFxMTFxcTFxcXExcXFxcXFxcXFxsbGxsfHyMjIycnKysrKysrLy8rKy8nKycnIyMfHxcLCwL67ubmzsa+tqKmhn56alZaTkqqqq6urra2urrCxsLO1tbe5t7q6vL68vb/BwcLCxMPExMTDxMTEw8TDxMTDw8PDxMTExMTFxcbGxsfHx8fIyMjIycnIyMnIycjIx8fHxsTCwr+/u7i4s7GurKipoZ+em5WWlJKqqqurq62trq6wsLCytLS2ube6ubu9vLy+wMHCw8TDxMTEw8TExMTExMTEw8PDw8PEw8PExMTFxcXGxsfHx8jIyMnJyMjJyMnIyMjIyMfGw8TCwb68u7a1srGtrKakop+ampiWrq2vrq6wsbKxs7Sztre3uby5vLu9vr6+wMHBwsPEwsPExMLDxMTDw8PDw8LDw8PDw8PDw8TFxcXFxsfHx8fHx8jIyMjIyMfIyMfGxsbFxMHCv767uLiysa6rqKmhn56cl5eUk6+usK+vsbKzsrS1tLe5ubq+u769v8DAwMHDw8PExcTFxcXExcXFxMXExcXExcXFxcbGxsbHx8jIyMnKysrLysvLy8vLy8zLy8vKycnIyMbDxMHAvbq5tLKvramqo6CfnZiZlpaysbOysrS1trW3t7e6vLu9v72/v8DBwcHCw8LDw8TDxMTEw8TEw8PDw8PDw8PDw8TExMTFxcbGxsbHyMjIyMjIyMnJyMjIx8fHxsXFxMTCvr+7urezs6ysqaahpJqZmJWRkY6OsrKzs7O1tra2uLi3ury7vb+9v7/AwcDAwcLCwsPDwsPDw8LCwsLCwsLCwsLDw8PExMXFxcbGxsfHx8jIyMjIyMjJycjIycfHxsbFxMPDwb2+uri1sbKrqqekoKOZmJeVkJCNjbS0tbS0tre4t7m5ubu9vL7AvsDAwcHBwMLCwcLCw8LDw8LBwsLCwcHBwsLCw8PExMXFxcXGxsbGxsfHx8fHxsfHyMfGxcbExMPCwcC/vry3uLSxsKurpKOhnJqdkpGQjYmJh4e1tba2tbe4ubm6urq9vr7AwsDCwsPCwsLExMPExMTExMTEw8PExMPDw8TFxMXFxsbGx8fHyMjIyMjIycnJycjJycnIx8XGxMTDwsHAvr26tbayrq2op6CgnJmWmI6NjImFhYODtbW2trW3uLm4urq6vb6+wMLAwsLDw8PDxMTExMXFxMXFxMPExMTExMTExcTGxsbHx8jIyMnIycnJycnKycrJysrKycjHyMbFxMPCwcC+vLe4sq+tqaegn5yYlZeNjIqIhISBgbe3uLi4ubu7ury9vL/BwcLEwsTExcXFxMbGxcXGxsXGxsbFxsbFxcXFxsbGx8fHyMjJycnKysrKy8vLy8vLy8vLzMvKyMnHx8bEw8PBwL65u7WysayrpaOhnJmbkZCPjIiIhoa3t7i4t7m6u7q8vLy/wMDCw8HExMXExMTFxcTFxcXExcbFxMXFxcTFxcbGxsfHx8nJycnJysrLy8vLy8zLzMvMy8zLysnJx8fGxcTCwcC9ubq0sbCsqqSioZuYm5CQjYuIh4WFubm6urq7vL28vr6+wMLCw8TDxcXFxMTExcXExMXFxMXFxcTExsXFxsXGx8fIyMjJycrKysvLy8vLy8zMy8zLy8vMysnHyMbFxMPBwL+9u7W3sa2tqKagnpyXlJeNjIqIhYWBgrq7u7u7vL2+vb+/v8HCwsTFxMXFxcXExcXFxMTFxcTFxcXExMXFxcbFxsfGx8fIycnKysnKysrKysrLy8rLysrKy8nHxsfExMPBwL69u7iztKyrqaWhnJqYk5CSiYiGg4CAfX26u7u7u7y9vr2/v7/BwsLEw8PDxMTDw8PEw8PDxMTDxMXExMXGxsXGxsbHxsfHyMnJycrJysrKycrKysrKycjIx8fFxMLCwL++vbq2tbOvqqujn6Cbl5OQjomHiIB/fXt5eHV2urq6urq7vL29vr6+wMHBw8PCw8PEw8LDxMPDw8TEw8TFxMTFxsbFxsbGx8bHx8fJycnJycnKysnKysrLysrIycjIxcXDw8HAv767uLe1sauspKGhnZqUko+KiYqCgX99enp3d7y8vLy8vb6/v8DAwMLDw8XExMXFxcXExcXFxcXGxsTGxsbGxsfHx8jHyMnIycnJysvLy8rLy8vLy8zMzMvLycrJycbGw8TBwMC9uri2tK+qq6Kgn5qXkY+Lh4aGf358end2dHS9vr69vb+/wMDBwcHDxMTFxcTFxcXFxcXFxcXFxsbFxsfHx8fIyMjJyMnKycrKyszMzMzLzMzMzMzMzM3My8nKycjGxcLDwL++u7m2tLGtp6ifnZ6YlI+NiYWFhX99e3p3d3R0vr+/vr6/wMHBwsLCw8TExcTExMTExMTExMTExMXFxcfHx8fIyMnIycjJycnKysrLy8vLy8zMzMvLy8vLysnGyMbFw8K/wLy7ube0r66rp6Chl5aXkYyJhoN/fn55eHZ1cnFvb76/v7+/v8DBwcLCwsTExcbFxcXFxcXFxsbFxcbHx8fIycnJycrKysrKysvLy8zMzc3MzczNzc3MzczMzMrJx8jFxcLCvr+7ube0sqyrp6OcnJKQkoyHhIF+enp5dnNycW5ubGy9vr6+vb6/wMDBwcHDxMTFxMTFxcXFxcbGxcXGx8fHyMnJyMnKysnKysrLy8vMzMzMzM3Mzc3NzMzLzMvKyMbHxMTBwb29ubm2s7GrqqijnJySkZKLhoSBfHh5d3VycW9tbGpqv8DAwL/AwcLCw8PDw8PExcTExMTFxMTFxcXFxsfHx8jJycnJysrJysrKy8rLy8vLy8vMy8vLy8rKyMjHxcPBw7++vLu4t7Kyr6uqo6KgmpOTiIeKg318enVyc3FwbW1raGhnZr/AwMC/wMHCwsPDw8TExMbFxMXFxcXFxcbFxcbHyMjJycnJysrLysrKysvLy8vLzMzLzMvLy8vKy8nJyMbEwsPAwL28uLm0s7Gsq6SkoZuUlYmJi4V+fnt2c3RycW5ta2lpZ2bAwcHBwMHCw8PExMTFxcXGxsXGxsbGxsbGxsbHyMnJysrKysvLzMvLy8zMzMzNzc3Nzc3MzMzMy8vJysjGw8LDv7+8u7e4srKvrKmio5+blJWIiIuFfn98d3R1c3JwbmxramhnwsPCw8LDxMXFxcXFxcXFxsbFxsbGxsbHx8jHycrKysvMzMzMzc3MzM3Nzc3Nzc3Nzc3NzMzMzMnKxsfGw8HAwbu7uri0tK6uqqamnp6alY+Pg4KGgHp7eXRxc3FwbmxraWhnZsHCwsLBwsPDxMTExMTDw8XEw8TExMTExcXFxcfHyMjJycnJycrKysrKysvKysvLy8vKy8rJycnGx8PDwb+9u7y2trSyrq6pqqWgoZeYlI+IiHx7fnlzdXNua21ramhmZWNiYWDCwsPDwsLExMTExMTExMTFxcTFxMXFxcbGx8fIycnJysrKysvLzMvLzMzMy8zMzMzMzMzKycjJxsfCwsG+u7q7tbSysaysp6ejnZ+UlZKMhoR5eHt3cXJxbGpraWhmZWNhYV9fwsPDw8LCw8LCwsLCwsHBw8LCw8LDxMPExcbGx8fIyMjIyMnJycrJycrKysnJycnJycjIxcPCw8DBvLy6t7W0ta6tq6qlpJ+hmpSXioqIg317cnFzb2psamZlZmNkYWBfXVxcW8PDw8PCwsLBwcHAwcDAwMLBwcLCw8TDxMXFxsfHx8fIyMjIycnJycnKycnIyMjHx8fExMK/vr+8vbe4trKwr7Cpp6Skn52Ym5KMkYKDf3t1c2trbWllZ2VhYGFfX11cW1lZWFfExMTEwsPDwsLBwcLBwcHDw8LEw8TFxcbGx8fIyMnJycnJycrKysrJysrKycnJyMfHxMPBvr6+u7y2t7Sxr66vp6aioZublpiOiY1/f3x5c3Fqa2xpZGdkYWBhX2BeXVtaWVlYxMTDxMLCwsLBwcHBwcHCw8PDxMTFxsXGx8fIycnJycrKycrKysrKycrJycjJx8bFxcHBvru7u7m5s7Sxrqyqq6ShnZ2YlZGUiYWJe3t4dnBuaGlpZ2JlYl9fYF1eXFtaWVhXVsXFxcXDxMTDw8LDw8PDw8XFxcbGx8jHyMnJysvLy8vMzMvLzMzLzMvMy8vJysjHxsbCwb+8vLy5ubO0sa6sq6ukoZ2dlpWSk4mFiXx7eHdyb2lqamhjZmRgYGFeX11cW1pZWVfGxsXFxMTExMPDw8TExMTFxsbHx8jIyMnJysrLy8vLzMzLy8zMy8zLzMvKycrHxsXFwcC+u7u6uLiys7Csq6mpoqCcmpOTkZKIhIh7enh2cW9pamppY2dkYWFiX2BeXVxbWllYxsbFxcTExMTEw8PExMTExsbGx8fIyMjJysrKy8vMzMzMzMzMzMzMy8zLysnKyMfFxcLBvry8u7m5tLSxraypqqShnJuUk5GSiIOIe3l3dnBuaWlpZ2JlY19fYF5eXVxaWVlYV8fHxsbFxcXFxcXFxcbGxsfIyMnJysrKy8vMzM3Nzc3Nzc3Nzc3MzczNzMvKy8jGxcXBwb67vLu5ubOzsKyrqamin5uZk5KPkIeCh3x5d3Zxb2pqamlkZ2VhYmJgYV9eXVxbW1rHx8bGxcXGxsbFxsbGxsfIyMjJycrKysvLzMvMzMzNzc3MzMzMy8zKy8rJyMjFxMLCvr68ubq5t7axsKyqqaamn5yWlZCPjI2Cf4R6dnR0b21paWloY2ZlYWFiYGFfXl1cW1tax8fGxsXFxcXFxcXFxsbGx8jIycnKysrLy8zMzc3Nzc3Nzc3NzMzMy8zLysnKx8XDxMC/vbq6ure3sbCtqaimpaCcl5WQjY2MgnyCeHNycmxpZmZmZGBjYV1dXlxcW1pYWFdXVsjIx8fGx8fHx8bHx8fHyMnKysvLzMzMzc3Nzs/Oz8/Pz8/Pz87Ozs3OzczKzMjGxcXBwL66urm2trCvrKimpaOdmZORjImJh315fXRwbm5oZmJjY2FdYF1aWltZWlhXVlVUVFPIx8fHx8fHx8fHyMjIyMnKysrLy8zNzM3Nzs7Ozs7Pz8/Ozs7Ozc3Ly8rIx8fDwb/Au7q5tLWzr6+opqShn5yZlJCJh4J/gX90cXVuaWhoZGFeX19eWVxbWFhYVldWVVNTUlJRycnIyMfIyMjIyMjIycnKy8vLzMzNzc3Ozs/Pz8/Q0NDQz8/Pz87OzMzLyMjIxMLAwLy7urS2s7CwqKiloJ+bmZSQioeBf4F+dHBzbWhnaGNhXl5eXVlcWldYWFZXVlVTU1JSUcnJycnIycnJycnKysvLzMzMzc3Nzs7Ozs7Pzs7Ozs7OzszLzMrHxsTCwr69vbi2tLSwrqylp6Ofn5aUkpCQi4SEfXZ2b3Bwb2VkaGJeXV1bWVdYV1dTVlRSU1NRU1FRT1BPT07KycnJycnJycnJysrKysvMzc3Nzc7Ozs/Oz8/Q0NDQ0NDPz87OzMvJyMjEw8K/vLq6tbSyq62qpqWcmpeUko+LhYJ8eXRxcnFnZGhhXVxcWVdVVVRUUFNRT09PTU9NTUtLSkpJy8vLy8vLy8vMzM3Mzc3Oz8/Pz8/Q0NDQ0NHQ0dDQ0NDQzs7NzMrIxMTEv769ubaysq6rqqGkn5uZkIuLh4eCe3d2b2xnZmhlXl1gWVdWV1RSUFFQT0xPTUxMTEtMSktJSUhISMvLy8vLy8vLy8vMzMzMzs7Ozs/Pz8/Pz8/Qz8/Pz8/Pz83MzMrIxsLCwr28u7e0sLCrqaifo52Zl42KioaGgXp2dW9rZ2RmY11aXldVVFVRT05PTk1KTUtKSUpISUhIR0dGRkXLy8zMy8vMzMzMzc3Nzc7Pzs/Pz8/Pz8/O0M/Pz87Ozc3JyMjFw8G8vbu3trWwraippaGglpuUj42EfX99fXdwa2xnZGBfYF1ZWFtVU1NUUU9PT05OS05NS0tLSktJSklJSEhIzc3Nzc3Nzc3Ozs7Ozs7Pz8/Pz8/Pz8/Ozc7Ly8rIyMbFwL++uri1sbCvqqemop6YmpWQjoaLgn1+dGxvbm9nZGBhXlxZWVlXVFRWUlBRUVBOTk5NTUtNTUxLTEtLSUtJSUpJSc/Pz8/Pzs/Pz8/Pz8/Pz8/Pz8/Pz8/OzcvMycjIxcTDwbu5ubSzr6usqaSgn5uXkJOOiIV/hHt1d21maGloYl9bXVxZV1dXVlRUVFJQUVFQTk5PTk1LTk1NTExMTEpMSkpLSkrQ0NDQz8/Pz8/Ozs7Ozs7OzszLy8vJyMXDw7+8vLi3tLOsqaqkop2bmZiVjYyMhn6DfHVzb29oY2heWlxcXVhWVFVVU1JSUlFQUFFPTU9OTkxNTUxMSk1NTExMTExKTEpKS0pL0dHR0c/P0M/Pz8/Ozs7Ozc3LysrJyMbDwcG9urm1tLGvqaamoJ6al5WUkYmHiIF7f3lxb2tsZWFlXVlaW1xXVVNVVFNRUlFRUFBQT05PTk5MTU5MTEtOTU1MTExMSkxLSkxKS9HQ0NDPz8/Pz8/Pzs7Nzs3Ny8rKycfFw8HBvbq4tbSxr6mnp6CfmpeWlJGKiIiBe395cXBsbGVhZV5ZWlpcVlVTVFRTUVJRUU9QUE5NTk5OTE1NTExLTUxMTExMTEpMSkpLSUvS0dLR0NDQ0NDQ0NDPz8/OzszLy8rJx8TCw768ure2srGrqKmioZyamJeTjYuLhX2BfHRyb29oZGhgW11dX1lYVldWVVNUU1NSUlNRUFFQUE9PUE5OTU9PT05OTk5MTk1MTkxN0tHS0dDQ0NDQ0NDPz87Ozc3KycnIxcPAvr65trSysKyrpaGinJmVlJKQjoaEhX93e3RtbGlnYl9jXFlZWltXVVNVVFRSU1JSUVFSUE9RT09OT09OTk1QT09OTk5OTE5NTE5MTtLR0dHQ0NDQ0NDQz8/Oz87Ny8rKycfFwsDAu7i2tLKvraejpJ6dmJaUk5GJhoeCeX13cG9ra2ViZl9bXF1eWVhWWFdWVFVVVFNUVFJRU1JSUVFSUFBPUlFRUFBRUU9RT05QTlDS0tLR0NHR0NDQ0NDPzs7NzMrJyMfFw8C+vrm1tLGvrKqjoKGamZWTkY+OhYOEfnR5c2xrZ2dhX2NcWVlaW1ZWVFVVVFNTU1JSUlNQUFFQUE9PUE9PTVBPUE9PT09NT05NT01O0dHR0dDQ0NDQ0NDPz8/Pzs3My8rKyMbDwsK+u7m2tbKwqqiooqCcmpiXk4yKioV8gHpzcm5vaGVoYV1dXl9aWVdYWFdVVlZVVFRVU1JTUlJRUVJRUU9SUVFQUFFRT1BPT1BPUNHR0dHQ0NDQz8/Pzs3NzMvKyMbFxMK/u7q6tbGurKqmpZ6bnJaTkI6Liol/fX95b3RtZmdiY11bXlhWVVZXU1NRUlJRUFFQUE9PUE5NT05OTE1OTExLTk1OTU1NTUtNTEtNS0zPz8/Pzc7Ozc3My8vJycjFxMK/vr25trKxsKumo6Gdm5qSkJCKiIWDf35+dHBzbWRoY11dWFlVVFdSUE9QUU1NS01NTEtMS0tLS0xJSUtJSUhJSUhIR0pJSklJSkpHSUhGSUdJ0NDQ0M/Pz87Ozs3NzMvLycjFw8LCvry4traxrKqnpKKhmZWWkI6LiIWFhHl2enNqbmliYl1cWFdbVFJSU1NQT01PT05NTU1NTExNSkpMSkpJSktJSUhLSktKSktLSEpJSEpISs/Pz87Ozs7Nzc3MzMvKycfHxMLBwL26trW0r6qopaKfnpeUlJGOiomFhoV5d3t0bG9rY2RfXlpZXFZVVFVWUlFQUVFRT1BPT09PT01NT01NTE1NTExLTk1OTU1NTUxNTEtNS03R0NDQz8/Pz8/Ozs7NzMvKycfFxcTBv7q5uLOvrKqnpKOcmZmVko6NioqIfXt/eXBzb2dnYmJeXF9ZV1ZXV1RTUlNTUlFSUFFQUFBPTk9OTk1NTk1NTE9OTk1OTk5MTk1LTktN09PS0tHS0dHR0dDQ0M/Ozc3KycjHxMK9vLu3srCtq6imn52dmpaRkY+Mi4F+gn1ydXFqaGRlYWBiXFpaW1pXVlVWVlVUVVRUU1RUUlFTUlFRUVJQUE9TUVFQUVFRT1FQT1FPUdPT09LR0dHR0dHR0dDPzs3Ny8nJx8XEvr29uLOyr62pqKGfn5uYkpKPjYuCfoJ9c3VyaWhkY19eYVpYWFpYVVRTVFRTUVNRUlFRUU9PUFBPTk5PTk5NUE9PTk9PT01PTU1PTU/U1NTU09PT09PT0tLR0dDPz8zLysnGxcC+v7m1s7CvqqmioKCcmJKTkIyMg3+CfXJ2cWhmY2NfXWBZV1dZWFVTUlRTUlFTUVFRUVFPT1BPTk5OT01NTFBOTk5OTk5MTk1MTkxN1NPT09LT09LS0tHR0NDOzczJyMfGw8C8ubq1sK2rqKWjnZubl5KOjouIh356fXhtcGxkY19gXVteV1ZWV1ZTU1FTU1JRUlBRUFFQT09QT05OTk9NTU1QTk5OTk9OTU5NTE9MTtPT09PS0tLR0dDPz83Ny8nIxcPCwL26tbOzrailpKGenJaVk5KMiImFgoF5c3dzZ2pnYGBcXVpaXFdXVVdWVFNSVFRTUlNSUlJSUlBRUVFQUE9RT09PUlBRUFBRUVBRT05RTlDS0tLS0dHR0NDQz8/MzMrIx8TDwcC8ubSxsaympKOfnJqVk5KRioeHhICAd3J1cWVpZmBfW1xaWlxXVlVXVVRTUlRTU1JTUlJSUlJQUVJRUFBQUU9QT1JQUVBRUVFQUVBOUU5R0tLS0dDR0M/Pz83Oy8rIxsXBwL68uLawrq6no6Ggm5iXkY+OjYWEg4B8e3NvcG5iZWNeXVlaWFhZVVVTVVRSUlFSUlFQUlBRUFFRT1BRUE9PT09OTk5RT1BPUFFQT1FPTVFNUNPS09LS0tHR0NDPz8zMysjHw8HAvrq3srCwqaWjoZ2amJORkI+HhoWCfn11cnNvZGhjXl5bWllZWlVWVFZUU1JRU1JSUVJRUVBRUU9QUFBPT09QTk5OUU9QT1BQUE9QTk1QTU/S0tLR0dHQ0M/Ozc3KysfFxMC+vbu2s66rq6WgnpyYl5SPjYyLhIODgH16cm9xbWJmYl5eWlpYWlpWV1VWVVRUU1RUU1JUUlNSU1JRUlJSUVBRUVFQUFRRUlFSUlJSU1FPU09R09LT0tHS0dHQ0M7Oy8vJxsbBwL69t7Wxrq2mop+dmZeVkI6NjIWDg4B8enJvcWxiZmFcXFhZV1hZVFRSU1NRUVBRUVBPUU9QT1BPTU5PTk5NTU5NTUxQTU5NTk9OTk9NTE9LTdDQ0M/Ozs7NzczKysfHxMLBvLu6uLOwq6mnoZyamJSSkIuJiIeAfn57d3VuaW1pXmFdWVtWVlVWV1NTUVJSUFBPUFBQTlBPT09QT01PT09OTU1OTU1NUE5PTk9PT05PTkxQTE7Q0NDPzs7OzczLycrGxcPBv7u5uLaxrainpZ+ZlpaRjo2HhoODfHl5dXJwaWNnY1hbV1RVUVBPUFBOTkxNTEtLSktLS0lLSkpLS0tISktKSUhISUhISExJTEpKTEtKTEpITEhL0M/Pzs7OzczLy8jIxMPBv724t7Wzraqlo6GblpSTjoyKhYOBgHp4eHNxb2djZmNZXFlWVlJSUVJTUFBOUE9NTUxNTk5MTkxNTU5NS01OTUxLS0xLS0tPTE5MTU5OTU9NS09LTc7Ozs3MzczMysrHx8PDwL68t7a0sayppaOimpWUk46MioWDgoB5eHdycHBoY2ZjWVxaV1dTU1JTU1FRT1BPTU5NT05OTU5NTk1OTkxOTk1MS0xMS0xLT01PTU5PTk9QT0tPS07Qz8/Ozc3NzMrJx8bCwr+8urWzsq6ppKGfnZWQjo6JhoR/fnx7c3JxbGlpYl5hXVRXU1FRT01NTk5MTUpMSklJSUpKSkhKSElJSkpHSklJSEdISEhISExJS0pKTEpMTEtHTEdK0M/Pzs3NzMzJycbFwsG9urmzsrCrp6KfnpuUjoyMh4OCfHx5eXFwbmpoZ2FdYFxVV1RTUlBOTk9PTU5LTUtKSkpLS0tJS0lKSkpKSEtKSklISElISEhMSkxKSkxLTU5NSExHSs3NzczLy8rKx8bEwr++u7i2sa+sqKOgnJqYkYuKiYWCgHx6eXhycG5pZ2hgXmFdVVhVVFRRT09QUE5PTE5NS0tMTExNS0xLTEtMTEpNTExLSkpLSkpKTkxOTExOTU9PT0pOSU3Ozc3My8vKycfGxMO+vru3tbCvrKijoJyal5CLiYmEgoB8enh4cnFuamhnX19gXFZZVVRUUU9PUFBOUE1OTUxMTExMTUtNS0xMTExKTUxMS0pKS0tKSk9MT0xNTk5QUE9KT0lNy8vLysnJyMjGxcPCvr67trSvr6uno5+cmpePioqIhIF/fHl3dnJwbWtoaWFfYl1YWldXVlNRUVJRUFFOT01MTU1OTU5MTUxNTE1NS05NTExKS0tLSkpPTU9MTU9OUFFRS1BJTcvLy8rIycjGxMPBwLu6t7OwrKqmop2Zl5WRioWFg359enh1cnJwbmpnZ2VeX2BcWFlWV1ZTUVBSUlBRTlFOTU5OTk5PTU5NTk5OTkxPTk1NS0xNTEtLUE5QTU9QUFFRUk1RS07JycnIxsfFxMHAvLu1tK+tqaSjnpuVkY6Oi4N+fn54d3RycGxraWplYWJfWlpbV1NUUlNTT01OUFBPUE1PTExMTU1NTkxNTE1NTU5LTk5MTUtMTUtLS1BOUE5PT1BRUVJNUU1PysnJyMfHxcXAwb27tLWuqqWfn5qWjouJiYV7dnZ1cG9ramhlY2FiXVpaV1JSU1FMTUtNTEhGR0lJSElGSEVERUZGRkdFRkVHRUZGREhHRUZERUZERERJR0lHSElJS0tNRkxGSM7NzcvKysjHwcK9u7Szq6qkn5+blo+MiYmDfHZ3d3BxbGxpZWRhZF1bXFhWVlVTUFBPUlBMS01OTk5OS05KSktMTEtNS0tLTUtLTElOTUtOSUtMSkpKT01PTU9OUFBQUk1QTE/Pzs7NzMzKycXEwr+5ubSxramno52alJKRjYaAgoB6enV2cW5ubG1nZWVhX1xeWldYVlhWVFJTU1RTVVFTUFBRUlJRU1FRUVJRUVFQVFFQUk9QUVFPT1RSVFJUVFNXVldRVlBSzMvKycjHxcS+vru4sbGqqaOgnpuUkIyJiIN/eHl6c3NvbmxnaGVnYl9fW1pXWVZTU1JTUk9OUFBQUFJOUE1NTk5PTk9OT05PTk5OTVFPTlBNTU5OTU1SUFFRUlJRVVRVT1NOUsvLy8nIx8bEv7+8ubOzraqjoKCbl5KOjIuHgXt+fXd3cnNvbWxsbGZlZGFfXmBcWVpZW1lXVVdWV1dYVVdTU1VWVlVXVVVWV1VVVVVZVlRXU1RVVVNUWlhZWFlZWFxbXVZbVVjMzMzKyMfGxL6+u7axsquoop+em5iRjYuLhYF8fX13eHN0cG5sbW1nZmZiYmBhXlxcXF5cWlhbWVtbXFlbV1dZWVpYXFlZW1tZWVlZXlpZXFdZWlpZWV5cXl1eXl5hX2JbX1peycnIxsTEwsC5ubayrKykoZuYlpSPioWDg316dHV2cHBsbGlmZWVlYF5dW1pZWVdVVlRWVFJRU1JTU1RRU1BQUFJSUVNRUVJTUlFRUFVSUVNQUVJRUFBVU1VVVFRVVlVXUlVSVcjHx8TDwsC9t7e0r6qpop+XlJOPjIaDgIB7d3J0dG5taWlnZGRjY19dW1pZWFdWVlVUVlNSUFNRUVJTUFJPT1BRUVBTT1BRUVBQUFBUUFBSTlBQUE9PU1JTU1NTU1VUVlFTUFPDwsK/vr26t7Kxr6mkpJ2YkY+Oi4mCf359d3ZwcXJsa2dpZmRiY2JfXlxbWVhYV1ZWVVZUU1FTUVJTVVFTUFBRUlJRVFFRUlNRUVFRVVJRU1BRUVFQUVZUVFVTVFVWVVdSVFJUwb+/vLq4tbOtramkoJ+XlY6LjIiFgH17e3Z0b29wa2pmZ2ZjYWBiXl1bW1lYWFdXVVVXVFJQU1JTVFVRVFBQUVNTUVRRUVJTUVFRUFVSUVNPUlFRUFFVVFNUVFNVVVVWUlRSVL++vrq5t7Oxq6unop2ckpKKiImEgH16d3dycGxrbGhnY2RiX15eX1tbWFlXVlZUVFNTVVJRT1FQUFFUT1JOTlBRUU9TT09RUU9PUE9TUE9STlBQUE9QVFJRU1NSVFRUVVBSUVK2tLSwr6yqpqGhnpiTkoyJgoCCfXt3dXNzbm5paWpmZmFjYV9eXl9cXVpaWVhXVldWVlhVVFJUU1NVV1NWUlJUVVVSVlNTVVRTVFVTV1VTVVJTVFRTVFhXVldWVVhXWFlUV1RWr62sqaejoZ6YmJOPi4eEf3p3enNxbmtpamRkX19gW1xYWFdVVFRVUVNQUE9OTUxNS0xOSkpIS0lKS01JTEdISkxLSE1KSUxKSkpLSU5LSktIS0tLSktPTkxOTUxPTk5QTE5NTbCurKmnpKCdlJWRjYeFf3x2dXZwbmppZmdgYVtbW1hYU1RSUVBQUU1NTEtLSklISUhISUdGREdGRkhJRUhERUZHRkRIRkZHR0ZGRkVISEdIREdHRkVHS0hISUlHS0lJSkhJSUmsqaejoZ2al4+QjIiCgHt5cnFzbGtnZ2RlX2BcWltXWFNVU1JQUlJQUE5PTk1MS01LS01KSkhLSUlMTkpMSElLTUtJTkpKTEtLSktKTU1LTUlMS0tKTE9OTU5OTVBPTlFMTk5Oq6inpKGem5aPkY2IgoB6eXFwcmxrZ2ZjZV1eWllZVVZRU1BPTlBQTU1MS0tKSUhKSEhKR0ZFR0VGSElGSURGSElHRUpGRkhIRkZIR0lJR0lFR0hHRkdLSklJSklMSkpMSEpJSaShoJyblpOQioyHg359d3ZvbXFqa2VlYmReXltaWlZYU1VSUVBRUk5RTk5OTUxLTEpLTUtKSEpJSUtNSUxISUtOS0lOSkpMTEpKTEpNTEtNSUtMS0pLT01NTk5NUU9OUExPT06koZ+cmZWSj4eIhIB8e3R0bWtuaGdjYmBiW1xZWFdUVVFSUE9OUE9NTkxMTEtKSktJSkxJSEdJR0hKTEhLR0hKTElITEhIS0pJSUpJS0tKTEhKSklJSk1MS0xMS05NTE9LTExNpKGfnJuXlJGLi4eDf353dm9ucGtrZmVjZF5fXFtbV1hVVlRTUlNTUVNQUFBPTk5PTk5QTk1LTExLTlBMT0tMT1BOTFFMTE9OTU5PT1BQTVBMTk5NTU1RUE9QUE9TUVFST1JQUJ2amJWTjYyJgoJ+end2b29oZ2lkZGBfXV9ZWVdWVVJTT1FPTk1OTkxOS0xMS0pKS0pLTElJSElHSEtNSUtHSEtMSkhNSUlMS0pKS0pMTEpMSEtKSklKTUxLTExLT01NT0tNTUyal5WRjoqIhn+AfHl1dXBvamlrZmVhYV9hW1pZWFdVVlJTUVBPUVBPUE1PTk5NTU5MTU9LTEtMSktOT0tOSktNTk1LUExLTk1NTE5MTk9NT0xOTUxMTVBOTk5OTlFPTlFOT09PlZKRjYqGhIN7fXp2c3NtbWdlZ2RjX15dYFpZWVdWVFVRU1FQT1FQT1BOT05OTE1OTE1OS0tKS0pKTU5LTUpLTE1MS09KS01NS0tNS01NTE1KTExKS0tOTExMTUxOTE1PS01NTZOQjouHhIKAent4dHFybW1oZ2hkZGFgXmFbW1pYWVZXVFVUU1JUVFJUUVJSUlFQUlFQUlBQT09OTlJTT1JPT1FSUVBTT09SUVFQUlFSUlBTT1JQUFBRU1JRUlJRVFJSVFBSUlKMiYeFgX57enN1cm5sbWhoY2JjYWBdXFtdWFdXVlVUVVJTUlFQUVFQUU5QT09OTk9OTk9NTUxMTExOUE1PTExOT05NUExMTk5NTE5NT05OT0xOTkxMTU9OTk9OTlFPTlBNTk5OhYGAfXp2dHRtb2toZ2djYl9dXlxcWllXWVVUVFJTUVJPUFBPTk9PTlBMTk5OTUxOTE1OTExLTEtLTk9MTktMTk9OTFBMTE5OTUxOTU9OTk9MTk5NTU1QT05PTk5RT09RTU5OT4B9fHp3c3Fxa21qZ2ZlYWJeXF5bXFlZV1lVVFRSVFFTUFFQT09PUE9RTlBPT05OT05PUE1OTU1NTVBRTlBNTU9RUE5STU1QT09OT05QUE9QTU9PT05PUFBPUE9PUlBQUU5QT094dHNyb2tqamRmY2FgX1xcWVhZV1dWVFNUUVBRT1FPUU5OTk1NTU5NT0xOTU1NTE5MTU5MTUxMTExOT01PTE1OT09NUUxMT05OTU5NT05PT0xOT05OTlBPT09PTlFQUFFOT05Pe3l3dnNvbm5oaWdkY2NgX1xbXFpaWVhWV1VUVFJUUlNRUVFQT1BQUFJOUE9PUE9QT1BRTk9OTk9OUFJPUU9PUFJRUFNPT1FQUFBQUFJRUVJPUFFRUFBSUlFSUVFTU1JUUVFRUXBubW1qZ2VmYmRhX19eXFtZWFlXWFdWVVVTUlNRVFFTUVFRUFBRUlFTUFJSUVFRUlFTU1FSUVBRUFRVUlRTUlRVVFNWUlFVU1RUVFRVVFVWUlRUVFRTVlZVVlVVV1dWV1NVVFRua2tqaGRjZGBhXl1dXFpZV1ZXVVZVVFNTUVBRT1JQUk9QT05PT1BQUk5QUE9QT1FQUVJPUFBPUE9SVFFTUVFTVFNRVVFRVFJSUlNTVFRUVFFTVFNTU1VVVFRUVFVWVVZSVFRTa2hoZ2ViYWFeX1xbW1pYV1VVVlRUVFNSUlBPT05QTlBOTk5NTU5OTlBNTk9OTk5PTk9QTk9OTU5OUVJQUVBPUVJRT1NPT1JQUVBRUVNSUlJPUVJSUVFTU1JTUlJTU1NUUVJSUm1qaWlmY2JiXl9cXFtbWFZWVVZTU1NSUVFPT05NT01PTU1MTEtMTUxPS01NTE1MTExNTktMTExMTE5QTU5NTU9QT01QTU1PTk5OT05QT09QTU9QT05PUVFPUVBQUVFRUk9QUFBnZGRjYV9eXlpcWFhYWFVUU1JTUVJSUVBQT05OTE9NTkxNTExLTU1MT0tNTk1NTU1MTk9MTUxMTU1PUU5PTk5QUVBOUk5OUU9QT1BQUVBRUU5QUVFPUFJSUFJQUFFSUVNPUFBRZWJiYV9dXFxZWldXVlZUU1JRU1BRUVBPT05NTUtOTE1MTEtLS0xLTE1KTExLTExMTE1NS0xLS0xLTk9NTk1NTk9PTVBNTE9NTk1OTk9PT09NTk9PTk5QUE9QT09QUVBRTlBPUF9dXVxaWFdXVVZTU1NTUU9PTlBNTk5NTExLSkpJS0pLSUpJSUlKSUpLSEtKSktKS0pLTElLSkpLSk1PTE1NS01OTkxPTEtOTU5NTU5PTk9OTE5OTk5OUE9OUE5PT1FQUU5PT09fXFxbWlhXV1RVU1JSUlBPT01PTU1NTEtMS0lKSEtJSklJSEhISUhJS0dKSklKSUpJSktISklJSUlMTUtMS0pMTU1LTktKTUtMS0xMTU1NTUpMTUxMTE5NTU5MTU5PTk9MTU1OX1tcW1lXVlZTVFFSUVFPTk1MTktMTEpJSkhHR0ZIRkhGR0VFRkZGRkhER0dGR0ZGRkdIRUZGRkZGSElHSEdGSUlJR0pHRklISEdISElJSkpHSUlJSElKSklKSkpKS0tLSEpJSmRhYWBeXVtbWVpXVlZWVFNSUFNQUFBPTk9MS0tKTEpLSkpISElJSUlLR0pKSUpJSUlKS0hJSUhJSEtMSktJSUxMTElNSklMS0pKS0tMTExMSUtMS0pLTUxLTUxMTU1NTUtMTExgXV1cW1lYWFZXVFNTU1FRUE5RTk5NTUxNSkpJSEpISkhJR0dHSEhHSUZISUdJR0hISUlHSEdHR0dKS0hJSEhKS0pITEhIS0pJSUpKS0pLS0hKSkpJSUtLSktLS0xMS0xJS0pLYl9eXVxaWFhWV1NTUlJQT09NT0xNTEtKS0hHR0ZIRUdFRkVEREVFREdDRUZFRkRFREVGREVERERER0hFRkVER0hHREhFREdGRkVGRkdHR0dFRkdHRUZIR0ZIRkdISEhJRkdHR2ViYmFfXlxcWltYV1dWVFRTUVRRUVBPTk9NTExLTUtMS0tJSUpKSkpMSEpLSUtKSklKS0lKSUlJSUxMSktKSUxMS0pNSklMS0pKS0tMTExMSktMS0tLTUxLTEtMTU1MTUtMS0xoZWVjYmBeXltcWVlYV1VVVFJUUVFQT05QTUxMS0xKTEpLSEhJSUlIS0hJSkhKSEhISUpHSEhISEhKS0lKSEhKS0pITElIS0pJSUpJS0pLS0lKS0pKSUxLSkxKS0xMTExKS0pLZGJhYF9dW1tZWldXVlZUU1NRU1BRUE9OT01MTEpMSkxKS0lJSUpJSUtISkpJS0lJSUpLSElJSUlJS0xKTEpJS0xLSk1KSUxLSkpLS0xLTExKS0tLS0pNTEtMS0tMTU1NS0xLTGJhYWBfXVtbWVpYV1dXVVVUUlRSUlJRUFFQTk9NT01PTk5MTE1NTExOS01NTE5NTExNTktMTEtLTE5PTU5NTE9PT01QTUxPTk1NTk5PTk9PTU5OTk5NT09OT01OT1BPUE5OTU5hX19eXFtZWVdYVlVVVFJSUVBST1BPTk1PTEtLSkxKTEpKSUlJSklJS0hJSklKSUlISkpISEhISEhLTElLSUhLTEtJTElIS0tJSktKS0tLS0lKS0pKSkxLSkxKSktMTExKS0pLYV9fXl1bWllXWVZVVVRTU1JRU1BQUE5OT0xMS0pMSktKS0hJSUpJSUtISUpJSklISUlKSEhISEhIS0xJSklISktLSUxJSEtKSUlKSktKS0tJSkpKSUlLS0pLSkpLS0tMSkpJSmBeXl1cW1lZV1hVVVRUUlJRUFJPT09NTE5LS0pJS0lLSUpISEhJSEhKR0lJSEpISEhJSkhISEhISEtLSUpJSEpLSklMSUhLSkpKSkpLS0tLSUpLSkpKTEtKTEpLTExMTUtLSktfXFxbWlhWVlRWU1JSUU9PTk1PTExMSkpLSEdHRkhGSEZGRUVFRkVFR0RFRkVGREVFRUZERURERERHR0VGRURHR0ZFSEVER0ZFRUZGR0dHR0VGRkZGRUhHRkhGRkhIR0hGRkZHWllYWFdVU1NSU1BQUE9NTU1LTUtLSklJSUhGRkVHRUdFRkRERUZERUZERUZFRkVERUVGREVERERER0dFRkVERkdGRUhFREdGRUVGRkdHR0dFRkZGRUVHR0ZHRUZHR0dIRkdGR1xaWllYV1VUU1RSUVFQT09OTU9MTExKSkpJR0dGSEZIR0dFRUZHRUZIRUZHRkdGRkZGSEZGRkZFRkhJR0hHRkhJSEZKR0ZJSEdHSEhISUhJR0hISEdHSUlISUdISUlJSkhJSEldXFxbWllXV1VWVFRTU1FRUU9RT09PTU1OTEtLSkxJTEpKSUlKS0lKTElKS0lMSkpKSkxKSkpKSkpNTUtMTEpNTU1LTktKTUxMTExMTU1NTUtNTU1MTE5NTU5MTU5PTk9MTk1OW1lZWFhXVFVUVFJSUVFPUE9OUE1OTUxLTEpJSUhKSEpKSUhISUpISUtISUpJS0lJSkpLSUpKSUlJTE1KTEtJTE1MSk5LSk1MS0xMTE1NTU1LTExMTEtOTUxOTE1OTk5PTE1MTltaWllYV1VVVFRSUlJRT1BOTVBNTU1LS0xKSElHSkdKSUlHR0hJR0hKR0lKSEpISElJS0lJSUlISExMSktKSUxMTEpNSklNS0tLTExMTExNSkxMTEtLTU1MTkxMTk5OT0tNTE1bWVpYWFdVVVRVUlNSUlBRUE5RTk9PTU1OTEtLSUxKTEtLSUlKS0lKTElLTEpNS0pLS01KS0tLS0tOT0xNTUxOT05MUE1MT01NTk5OT09PT0xOT09OTlBQT1BOT1BRUFFOT09QWVhYV1dVVFRSU1FRUVBPT05NT0xNTUtLTEpJSUhLSEpKSUdISUlISUtISktJS0lJSkpLSUpKSUpKTE1LTEtKTU1NS05LSk5MTExNTE1NTk5LTU1NTUxOTk1PTU5PT09QTU5OTldVVlVVU1JSUVJPUFBPTk5NTE5LTE1LSkxKSElHSkhKSklHSEhJSElLSEpKSUtJSUpKS0lKSklKSkxNS0xLSk1NTUtOS0pOTExMTUxNTU5OS01NTU1MTk5NTk1NTk9OT0xOTU5WVVVUVFNRUlBRT09PT01OTEtOS0xMSkpLSUdIR0pHSUlIR0dHSEdISkdJSUhKSUhJSUpISUlISUlMTEpLSklMTExKTUpJTUtLS0xLTExMTUpMTExLS01NTE1LTE1NTU5LTExMVlVVVVRTUlJRUU9PT09NTk1MTktMTEtKS0pISEdKSEpJSUdISElISUtISktJS0pJSkpMSkpLSkpKTU5LTExKTU5NTE5MS05NTE1NTU1NTk5LTU1OTUxOTk1PTU5PT09QTU5NTlhXV1ZVVVNTUlJQUFBQTk9OTE9MTU1MSkxKSUlIS0hKSklHSEhJSElLSEpKSUtKSUpKS0lKSklKSUxNSkxLSkxNTEtOS0pNTExMTExNTU1NS0xNTUxMTk5NTkxNTk5OT0xNTU5WVFVUVFNRUVBRT09PT01OTUxOS0xNS0pLSkhJSEtJSkpKSElJSklKTElLS0pMS0pLTE1LS0xLTEtOT0xOTUxOT05NUE1MT05OTk5OT09PUE1PT09OTlBQT1FPUFBRUVFOUE9QVlVVVFRTUVFRUU9PUE9OTk1MT0xNTUxLTEtJSUhLSUtLSkhJSUtJSkxJS0xKTEtKS0xNS0tMS0xLTk9MTk1MTk9OTVBNTE9OTk5OTk9PT09NTk9PTk1QUE5QTk9QUFBRTk9PUFVTVFNTUlBQT1BOTU5OTExLSk1JS0tJSEpIR0dGSUdJSEhGRkdIR0hKR0lJSEpJSElKS0lJSklJSUxNSkxLSkxNTEtOS0pNTExMTExNTE1NS0xNTUxLTk5MTkxNTk5OT0xNTE1WVVVVVFNRUlFRT09PT01OTUtOS0xNS0pLSkhJR0tISkpKSEhJSkhJTElKS0lMSkpKS0xKS0tKS0pNTkxNTEtNTk5MT0xLTk1NTU5NTk5OT0xNTk5NTU9PTk9NTk9QT1BNT05PVlVVVVRTUVFRUU9PT09NTk1MTktMTUtKS0pISUhLSUtKSkhISUpJSkxJS0tKTEtKS0tNSktLS0tLTU5MTU1LTk5OTE9MTE9NTU5OTk5OTk9MTU5OTk1PT05QTk9PUFBQTU9OT1RTU1NSUVBQT09NTU1NS0xLSkxJSktJSElIR0dGSUdJSEhGR0dIR0hKR0lJSEpJSElJS0lJSklJSUtMSktLSUxNTEtNS0pNS0tMTExMTE1NS0xMTUxLTU1MTkxNTk5OT0xNTU1VVFRUU1JQUVBQTk5OTk1NTEtNSktMS0lKSUhIR0pISkpJSEhJSkhJS0lKS0lMSkpKS0xKS0tKS0tNTkxNTEtNTk5MT0xLT01NTk5OTk5OT0xOTk5OTU9PTlBOT09QUFFNT05PU1JSUVFQTk5NTkxMTExKS0pJS0hJSklHSEdGRkVIRkhIR0ZGR0hGR0lHSElHSkhISElKSElJSElIS0xKS0pJS0xLSk1KSUxLS0tLS0xMTExKS0xMS0tNTUxNS0xNTk1OS01MTVVUVFRTUlBQUFBOTk5OTE1MS01KS0tKSUpJR0hHSkdJSUhHR0hJSEhKSElKSEpJSElJS0lJSklJSUtMSktLSUxMTEtNS0pNS0tMTExMTExNSkxMTExLTU1MTUxNTU5NTktNTE1UU1NTUlFQUE9PTk1OTUxMTEpNSktLSklKSUdIR0pISUlJR0hISUhJS0hKSklLSklKSktKSktKSkpMTUtMTEpNTU1LTkxLTkxMTU1NTU1NTktNTU1NTE5OTU5NTk5PT09MTk1OVlVVVFRTUVFQUU9OTk5NTUxLTUpLTEtKS0lISEdKSEpKSUhISUpISUtJSktJS0pJSkpMSkpLSkpKTE1LTExKTU1NTE5MS05MTE1NTU1NTU5MTU1NTUxOTk1PTU5OT09QTU5OTlVUVFRTUlBQT1BOTk5OTE1MSk1KS0tKSUpJR0hHSkhKSUhHR0hJSElLSEpKSUtKSUpKTEpKS0pKSkxNS0xMSk1NTUxOTEtOTU1NTU1NTU5OTE1OTU1MTk5NT01OT09PUE1OTk5VU1RTU1JQUE9QTk5OTkxNTEtNSktMS0pLSUhIR0tISkpJSEhJSklKTElLS0pMS0pLS01LS0xLS0tOT0xOTUxOT05NT01MT05OTk5OT05PT01OT09OTlBQT1BPT1BQUFFOUE9QVVNUVFNSUFBPUE5OTk5MTUxLTUpLTEpJSklISEdKSEpKSUhISUpJSUtJSktJS0pKSktMSkpLSktKTU5LTUxLTU5NTE5MS05NTU1NTU5NTk5MTU5OTU1PT05PTU5PT09QTU9OTlVTVFRSUlBQTk9NTU1NS0xKSUxISkpJSEhIRkdFSEZISEdGRkdIR0dJR0hJR0lISEhJSkhISUhISEpMSUtKSUtMS0pNSklMS0tLS0tMS0tMSktMTEtLTU1LTUtMTU1NTktMTE1UU1NTUlFPT05PTUxMTUpLSklLSElKSEdISEZGRUhGSEhHRkZHSEdHSUdISUdJSEhISUpISElISEhLTElLSklLTEtKTUpJTEtLS0tLTEtLTEpLTExLS01NTE1LTE1NTU5LTExMVFJTU1JRT09OT01NTU1LTEpKTElKS0lISUhGR0ZJR0lJSEdHSElISEpISUpISklJSUpLSUlKSUpKTE1LTEtKTE1MS05LSk1MTExMTE1MTU1LTE1NTExOTk1OTE1OTk5PS01NTQ==","rsh_scale":[-1.0071,0.0629],"rsh_exec":[-0.9795,-0.9917,-0.9856,-0.974,-0.9651,-0.9569,-0.9532,-0.949,-0.9459,-0.9423,-0.9394,-0.9368,-0.9325,-0.9296,-0.9256,-0.9215,-0.9177,-0.9142,-0.9089,-0.9045,-0.8997,-0.8947,-0.8896,-0.8842,-0.8787,-0.8732,-0.8679,-0.8618,-0.8551,-0.8481,-0.8412,-0.8342,-0.8267,-0.8206,-0.8137,-0.8065,-0.7993,-0.792,-0.7855,-0.778,-0.7703,-0.763,-0.7558,-0.7482,-0.7411,-0.734,-0.7267,-0.7194,-0.7126,-0.706,-0.6993,-0.6927,-0.6858,-0.6789,-0.672,-0.6647,-0.6574,-0.6497,-0.6417,-0.6337,-0.6257,-0.6178,-0.6097,-0.6013,-0.5924,-0.5841,-0.575,-0.5663,-0.556,-0.5469,-0.5373,-0.527,-0.5166,-0.5063,-0.4961,-0.485,-0.4743,-0.4626,-0.4508,-0.4391,-0.4274,-0.416,-0.4044,-0.393,-0.3811,-0.3695,-0.3583,-0.347,-0.3362,-0.3252,-0.3148,-0.3049,-0.2944,-0.2846,-0.2743,-0.2649,-0.2557,-0.247,-0.2381,-0.2296,-0.2225,-0.215,-0.2073,-0.2001,-0.1931,-0.1856,-0.1788,-0.1716,-0.1649,-0.1579,-0.151,-0.1443,-0.1375,-0.1308,-0.1244,-0.1181,-0.1116,-0.1052,-0.0992,-0.0934,-0.0875,-0.0821,-0.0766,-0.0711,-0.066,-0.061,-0.0564,-0.0517,-0.0471,-0.0428,-0.0386,-0.0348,-0.0308,-0.0268,-0.0233,-0.02,-0.0168,-0.014,-0.0113,-0.0092,-0.0077,-0.0063,-0.0059,-0.0061,-0.0066,-0.0075,-0.009,-0.0114,-0.0143,-0.018,-0.0232,-0.0294,-0.0365,-0.044,-0.0524,-0.062,-0.0726,-0.0845,-0.0978,-0.1127,-0.1284,-0.1452,-0.163,-0.1822,-0.2029,-0.2248,-0.2467,-0.2692,-0.2921,-0.315,-0.3384,-0.3624,-0.3859,-0.4088,-0.431,-0.4525,-0.4734,-0.4922,-0.5095,-0.5252,-0.5399,-0.5529,-0.5649,-0.5753,-0.5851,-0.5939,-0.6017,-0.6085,-0.6142,-0.6194,-0.6234,-0.627,-0.6296,-0.6317,-0.633,-0.6334,-0.6334,-0.6327,-0.6314,-0.63,-0.6279,-0.6255,-0.6224,-0.619,-0.615,-0.6107,-0.6062,-0.6014,-0.5962,-0.5909,-0.5854,-0.5795,-0.5731,-0.5669,-0.5602,-0.5536,-0.5466,-0.5389,-0.5314,-0.524,-0.5164,-0.5085,-0.5011,-0.4937,-0.4863,-0.4786,-0.4703,-0.4623,-0.4541,-0.4464,-0.4388,-0.4306,-0.4225,-0.4144,-0.4069,-0.3993,-0.392,-0.3851,-0.3784,-0.3714,-0.3645,-0.3576,-0.3506,-0.3439,-0.337,-0.3306,-0.3239,-0.3175,-0.3111,-0.3047,-0.2986,-0.292,-0.2852,-0.2792,-0.2731,-0.2669,-0.2614,-0.2555,-0.2499,-0.2445,-0.2399,-0.235,-0.2302,-0.2257,-0.2218,-0.2181,-0.2144,-0.2113,-0.2079,-0.2046,-0.2012,-0.1977,-0.1948,-0.192,-0.1892,-0.1864,-0.184,-0.1816,-0.1792,-0.1771,-0.175,-0.1732,-0.1714,-0.17,-0.1689,-0.1679,-0.1668,-0.166,-0.1652,-0.1644,-0.1637,-0.1632,-0.1626,-0.1618,-0.161,-0.1604,-0.16,-0.1594,-0.1588,-0.1582,-0.1575,-0.1568,-0.156,-0.1553,-0.1546,-0.154,-0.1533,-0.1526,-0.1522,-0.1519,-0.1517,-0.1516,-0.1514,-0.1518,-0.1524,-0.1534,-0.1546,-0.1565,-0.1585,-0.1613,-0.1648,-0.169,-0.1739,-0.1798,-0.1861,-0.1929,-0.2004,-0.2083,-0.2161,-0.2246,-0.2338,-0.2433,-0.2534,-0.2636,-0.2748,-0.2864,-0.2978,-0.3095,-0.321,-0.3332,-0.3456,-0.3582,-0.3713,-0.3849,-0.3987,-0.413,-0.4276,-0.4418,-0.4557,-0.4694,-0.4831,-0.4964,-0.5083,-0.5208,-0.5326,-0.5442,-0.5544,-0.5644,-0.5737,-0.5824,-0.591,-0.5985,-0.6054,-0.612,-0.618,-0.6234,-0.6289,-0.6341,-0.6385,-0.6427,-0.6466,-0.6498,-0.653,-0.6561,-0.6588,-0.6615,-0.6641,-0.6667,-0.669,-0.671,-0.6729,-0.6744,-0.6759,-0.677,-0.6778,-0.6784,-0.6786,-0.6791,-0.6796,-0.68,-0.6805,-0.6808,-0.6812,-0.6815,-0.6821,-0.6828,-0.6831,-0.6837,-0.6841,-0.6839]},"chunk":{"name":"右腕旋转","joint":12,"exec":[-0.0052999998442828655,-0.003599999938160181,0.006500000134110451,0.005499999970197678,0.0031999999191612005,0.0010000000474974513,0.004900000058114529,0.0024999999441206455,0.0026000000070780516,0.01679999940097332,0.010499999858438969,0.01860000006854534,0.02669999934732914,0.024000000208616257,0.02290000021457672,0.031700000166893005,0.03959999978542328,0.044599998742341995,0.04820000007748604,0.05559999868273735,0.05490000173449516,0.08209999650716782,0.08470000326633453,0.1096000000834465,0.10599999874830246,0.12359999865293503,0.11270000040531158,0.13819999992847443,0.15119999647140503,0.1655000001192093,0.17080000042915344,0.18000000715255737,0.17820000648498535,0.17919999361038208,0.1898999959230423,0.19750000536441803,0.20399999618530273,0.20810000598430634,0.20839999616146088,0.22100000083446503,0.23160000145435333,0.23389999568462372,0.23909999430179596,0.24490000307559967,0.2515000104904175,0.2558000087738037,0.2782000005245209,0.28360000252723694,0.28139999508857727,0.30300000309944153,0.2930999994277954,0.3073999881744385,0.3140999972820282,0.32659998536109924,0.33309999108314514,0.3327000141143799,0.3395000100135803,0.34439998865127563,0.34769999980926514,0.35249999165534973,0.352400004863739,0.35530000925064087,0.35269999504089355,0.36090001463890076,0.3587999939918518,0.3637999892234802,0.3619000017642975,0.37220001220703125,0.37779998779296875,0.3765000104904175,0.3716000020503998,0.38019999861717224,0.37929999828338623,0.3709999918937683,0.3790000081062317,0.39089998602867126,0.38040000200271606,0.3840999901294708,0.3804999887943268,0.38999998569488525,0.38589999079704285,0.39489999413490295,0.39719998836517334,0.38940000534057617,0.398499995470047,0.39500001072883606,0.3953999876976013,0.39750000834465027,0.4043000042438507,0.4011000096797943,0.4009999930858612,0.38940000534057617,0.39969998598098755,0.4009000062942505,0.39259999990463257,0.4009999930858612,0.3937999904155731,0.4065999984741211,0.4034000039100647,0.39800000190734863,0.439300000667572,0.4408999979496002,0.44020000100135803,0.4415999948978424,0.44209998846054077,0.445499986410141,0.4453999996185303,0.4449000060558319,0.447299987077713,0.44690001010894775,0.4472000002861023,0.4496000111103058,0.4458000063896179,0.4499000012874603,0.44769999384880066,0.44690001010894775,0.44760000705718994,0.4478999972343445,0.4487000107765198,0.44749999046325684,0.44769999384880066,0.4496000111103058,0.45179998874664307,0.45100000500679016,0.45249998569488525,0.45320001244544983,0.45179998874664307,0.453900009393692,0.453900009393692,0.45350000262260437,0.45410001277923584,0.454800009727478,0.4551999866962433,0.4564000070095062,0.45719999074935913,0.45969998836517334,0.4595000147819519,0.4607999920845032,0.4616999924182892,0.45739999413490295,0.4616999924182892,0.45910000801086426,0.45980000495910645,0.45730000734329224,0.45680001378059387,0.4577000141143799,0.45019999146461487,0.45669999718666077,0.44679999351501465,0.4537000060081482,0.4526999890804291,0.45660001039505005,0.4505000114440918,0.45260000228881836,0.4440999925136566,0.4560000002384186,0.4442000091075897,0.44830000400543213,0.43950000405311584,0.439300000667572,0.4381999969482422,0.438400000333786,0.42969998717308044,0.4244999885559082,0.40380001068115234,0.39640000462532043,0.3788999915122986,0.35569998621940613,0.3391000032424927,0.32739999890327454,0.28380000591278076,0.25029999017715454,0.21860000491142273,0.2054000049829483,0.17110000550746918,0.14949999749660492,0.11299999803304672,0.0934000015258789,0.04320000112056732,0.05249999836087227,0.045099999755620956,0.00419999985024333,-0.0026000000070780516,-0.049400001764297485,-0.07930000126361847,-0.08590000122785568,-0.11829999834299088,-0.11949999630451202,-0.15469999611377716,-0.1826000064611435,-0.20190000534057617,-0.2207999974489212,-0.2232999950647354,-0.24799999594688416,-0.25450000166893005,-0.2637999951839447,-0.27480000257492065,-0.28040000796318054,-0.28600001335144043,-0.28619998693466187,0.3327000141143799,0.3287999927997589,0.329800009727478,0.32989999651908875,0.3264000117778778,0.3167000114917755,0.32190001010894775,0.31630000472068787,0.30630001425743103,0.2962999939918518,0.29440000653266907,0.3001999855041504,0.296099990606308,0.29429998993873596,0.2815000116825104,0.2824000120162964,0.28940001130104065,0.2662999927997589,0.2685999870300293,0.2757999897003174,0.2712000012397766,0.2703000009059906,0.26899999380111694,0.25940001010894775,0.2581999897956848,0.24779999256134033,0.23270000517368317,0.2159000039100647,0.21539999544620514,0.21539999544620514,0.21289999783039093,0.20730000734329224,0.210099995136261,0.18039999902248383,0.20010000467300415,0.19140000641345978,0.18160000443458557,0.1858000010251999,0.181099995970726,0.1737000048160553,0.19189999997615814,0.16410000622272491,0.1623000055551529,0.1597999930381775,0.17110000550746918,0.14839999377727509,0.15150000154972076,0.13619999587535858,0.14319999516010284,0.14740000665187836,0.149399995803833,0.1354999989271164,0.15539999306201935,0.1177000030875206,0.1306000053882599,0.11259999871253967,0.11739999800920486,0.12030000239610672,0.13169999420642853,0.1137000024318695,0.11299999803304672,0.11089999973773956,0.1256999969482422,0.10040000081062317,0.10180000215768814,0.09139999747276306,0.09700000286102295,0.08730000257492065,0.07460000365972519,0.08940000087022781,0.08209999650716782,0.0722000002861023,0.06949999928474426,0.07280000299215317,0.09130000323057175,0.06809999793767929,0.07930000126361847,0.05719999969005585,0.05299999937415123,0.06440000236034393,0.05570000037550926,0.06069999933242798,0.04960000142455101,0.031599998474121094,0.04179999977350235,0.039900001138448715,0.03150000050663948,0.03500000014901161,0.03319999948143959,0.03319999948143959,0.038600001484155655,0.041600000113248825,0.01899999938905239,0.028699999675154686,0.016200000420212746,0.023000000044703484,0.019300000742077827,0.03139999881386757,0.002300000051036477,0.004399999976158142,-0.0771000012755394,-0.057100001722574234,-0.0681999996304512,-0.08789999783039093,-0.0786999985575676,-0.0851999968290329,-0.093299999833107,-0.10140000283718109,-0.10689999908208847,-0.08950000256299973,-0.10740000009536743,-0.12950000166893005,-0.14630000293254852,-0.15600000321865082,-0.1565999984741211,-0.18520000576972961,-0.1876000016927719,-0.2110999971628189,-0.21160000562667847,-0.23399999737739563,-0.21879999339580536,-0.24719999730587006,-0.26010000705718994,-0.26339998841285706,-0.2913999855518341,-0.28780001401901245,-0.29750001430511475,-0.32350000739097595,-0.31839999556541443,-0.3228999972343445,-0.34130001068115234,-0.326200008392334,-0.3479999899864197,-0.35260000824928284,-0.3644999861717224,-0.37439998984336853,-0.3637000024318695,-0.3711000084877014,-0.38830000162124634,-0.3723999857902527,-0.3813999891281128,-0.383899986743927,-0.40059998631477356,-0.39899998903274536,-0.4018000066280365,-0.40059998631477356,-0.4041999876499176,-0.4108999967575073,-0.4142000079154968,-0.41449999809265137,-0.424699991941452,-0.42309999465942383,-0.4106999933719635,-0.42340001463890076,-0.4156999886035919,-0.4147999882698059,-0.42149999737739563,-0.41269999742507935,-0.41359999775886536,-0.40860000252723694,-0.40720000863075256,-0.4153999984264374,-0.4133000075817108,-0.41179999709129333,-0.39910000562667847,-0.3894999921321869,-0.3977000117301941,-0.38449999690055847,-0.40369999408721924,-0.3856000006198883,-0.3856000006198883,-0.3725000023841858,-0.37529999017715454,-0.373199999332428,-0.3537999987602234,-0.3716999888420105,-0.3319999873638153,-0.3142000138759613,-0.3479999899864197,-0.3246999979019165,-0.3133000135421753,-0.3089999854564667,-0.30489999055862427,-0.2955999970436096,-0.2720000147819519,-0.23919999599456787,-0.2378000020980835,-0.19699999690055847,-0.19200000166893005,-0.14100000262260437,-0.12630000710487366,-0.05510000139474869,-0.12970000505447388,-0.05270000174641609,-0.015399999916553497,-0.03819999843835831,0.03680000081658363,0.037700001150369644,0.04690000042319298,0.08340000361204147],"range":[-0.445,0.48200000000000004],"success":false,"jump_max":0.6189,"step_mean":0.0101,"rgrip_exec":[0.257999986410141,0.25850000977516174,0.2651999890804291,0.2630999982357025,0.2606000006198883,0.25699999928474426,0.26030001044273376,0.2515000104904175,0.25589999556541443,0.26019999384880066,0.25839999318122864,0.2624000012874603,0.24779999256134033,0.24979999661445618,0.2442999929189682,0.2386000007390976,0.23559999465942383,0.23749999701976776,0.2151000052690506,0.2305999994277954,0.21809999644756317,0.20720000565052032,0.21070000529289246,0.20730000734329224,0.19920000433921814,0.18479999899864197,0.19859999418258667,0.19259999692440033,0.18250000476837158,0.18279999494552612,0.18320000171661377,0.19249999523162842,0.17669999599456787,0.17759999632835388,0.1753000020980835,0.1956000030040741,0.20739999413490295,0.21160000562667847,0.22910000383853912,0.23729999363422394,0.2662999927997589,0.27730000019073486,0.30219998955726624,0.3328000009059906,0.3456000089645386,0.4049000144004822,0.4787999987602234,0.491100013256073,0.5152999758720398,0.6503000259399414,0.5623999834060669,0.6854000091552734,0.7457000017166138,0.7416999936103821,0.8956000208854675,0.9508000016212463,0.9309999942779541,1.0563000440597534,1.0645999908447266,1.1109000444412231,1.1263999938964844,1.1253000497817993,1.148900032043457,1.1500999927520752,1.1632000207901,1.17739999294281,1.191100001335144,1.1992000341415405,1.2342000007629395,1.2069000005722046,1.2110999822616577,1.2304999828338623,1.2167999744415283,1.2466000318527222,1.2231999635696411,1.2168999910354614,1.2374999523162842,1.2496000528335571,1.2621999979019165,1.2445000410079956,1.2372000217437744,1.2268999814987183,1.2338000535964966,1.2254999876022339,1.235700011253357,1.2344000339508057,1.2289999723434448,1.2407000064849854,1.2323999404907227,1.2400000095367432,1.2331000566482544,1.2228000164031982,1.2374000549316406,1.2345000505447388,1.1895999908447266,1.2252999544143677,1.2218999862670898,1.2079999446868896,1.2035000324249268,1.2161999940872192,1.3310999870300293,1.3277000188827515,1.3323999643325806,1.336300015449524,1.3370000123977661,1.3246999979019165,1.3217999935150146,1.3285000324249268,1.3243000507354736,1.3253999948501587,1.3187999725341797,1.3284000158309937,1.3079999685287476,1.295699954032898,1.2970999479293823,1.2941999435424805,1.2941999435424805,1.284600019454956,1.2750999927520752,1.2892999649047852,1.2472000122070312,1.232800006866455,1.2235000133514404,1.2589000463485718,1.2426999807357788,1.2145999670028687,1.184499979019165,1.1894999742507935,1.1475000381469727,1.1511000394821167,1.1246000528335571,1.0872000455856323,1.0210000276565552,1.0276999473571777,0.9706000089645386,1.0006999969482422,0.95660001039505,0.8934999704360962,0.8852999806404114,0.7092999815940857,0.8169000148773193,0.711899995803833,0.6510000228881836,0.5800999999046326,0.6137999892234802,0.5163999795913696,0.4131999909877777,0.4494999945163727,0.38370001316070557,0.359499990940094,0.3603000044822693,0.2847999930381775,0.25429999828338623,0.2298000007867813,0.17800000309944153,0.17409999668598175,0.15520000457763672,0.12950000166893005,0.09679999947547913,0.10440000146627426,0.0908999964594841,0.09109999984502792,0.08190000057220459,0.094200000166893,0.08609999716281891,0.08470000326633453,0.1185000017285347,0.12370000034570694,0.13420000672340393,0.13259999454021454,0.1526000052690506,0.16099999845027924,0.17110000550746918,0.1738000065088272,0.19359999895095825,0.1873999983072281,0.20229999721050262,0.193900004029274,0.1995999962091446,0.2054000049829483,0.20350000262260437,0.20509999990463257,0.21130000054836273,0.21459999680519104,0.21299999952316284,0.21860000491142273,0.22120000422000885,0.22020000219345093,0.2222999930381775,0.22120000422000885,0.219200000166893,0.2176000028848648,0.2222999930381775,0.22259999811649323,0.2190999984741211,0.218299999833107,0.22179999947547913,0.22579999268054962,0.22020000219345093,0.2215999960899353,0.30660000443458557,0.3102000057697296,0.302700012922287,0.2930000126361847,0.2919999957084656,0.2890999913215637,0.28459998965263367,0.28040000796318054,0.2840999960899353,0.2745000123977661,0.27469998598098755,0.27059999108314514,0.2671999931335449,0.25920000672340393,0.26170000433921814,0.262800008058548,0.25859999656677246,0.2371000051498413,0.24580000340938568,0.2554999887943268,0.25110000371932983,0.2460000067949295,0.25519999861717224,0.24539999663829803,0.22910000383853912,0.25099998712539673,0.2443999946117401,0.2282000035047531,0.22949999570846558,0.24040000140666962,0.23909999430179596,0.23810000717639923,0.23330000042915344,0.23499999940395355,0.24250000715255737,0.23810000717639923,0.23680000007152557,0.24120000004768372,0.2409999966621399,0.23849999904632568,0.24650000035762787,0.23909999430179596,0.24560000002384186,0.24959999322891235,0.24390000104904175,0.24529999494552612,0.2513999938964844,0.2475000023841858,0.24709999561309814,0.2540999948978424,0.24279999732971191,0.25209999084472656,0.24690000712871552,0.24950000643730164,0.2524999976158142,0.2619999945163727,0.2581999897956848,0.26510000228881836,0.25,0.25589999556541443,0.26190000772476196,0.2651999890804291,0.2540000081062317,0.26460000872612,0.2587999999523163,0.2678000032901764,0.2712000012397766,0.26589998602867126,0.2685000002384186,0.26269999146461487,0.2687999904155731,0.2727000117301941,0.2680000066757202,0.27140000462532043,0.2703000009059906,0.26759999990463257,0.27300000190734863,0.2623000144958496,0.26589998602867126,0.2628999948501587,0.2667999863624573,0.26980000734329224,0.2712000012397766,0.26840001344680786,0.2703000009059906,0.27230000495910645,0.26420000195503235,0.26570001244544983,0.2712000012397766,0.26750001311302185,0.2676999866962433,0.27219998836517334,0.26600000262260437,0.2685000002384186,0.2671999931335449,0.27390000224113464,0.26919999718666077,0.2791000008583069,0.27070000767707825,0.2732999920845032,0.148499995470047,0.14390000700950623,0.147599995136261,0.14900000393390656,0.14980000257492065,0.14959999918937683,0.1468999981880188,0.1476999968290329,0.147599995136261,0.15230000019073486,0.15549999475479126,0.15479999780654907,0.15639999508857727,0.15569999814033508,0.15649999678134918,0.16339999437332153,0.15880000591278076,0.16269999742507935,0.1687999963760376,0.1688999980688095,0.17069999873638153,0.16670000553131104,0.17509999871253967,0.1736000031232834,0.1746000051498413,0.17520000040531158,0.17599999904632568,0.17329999804496765,0.1777999997138977,0.17839999496936798,0.18250000476837158,0.18569999933242798,0.18320000171661377,0.1808999925851822,0.19140000641345978,0.18809999525547028,0.18930000066757202,0.19179999828338623,0.188400000333786,0.19900000095367432,0.2011999934911728,0.20890000462532043,0.2134000062942505,0.23160000145435333,0.23469999432563782,0.24150000512599945,0.2515000104904175,0.25839999318122864,0.2597000002861023,0.3000999987125397,0.2879999876022339,0.30090001225471497,0.3077999949455261,0.33799999952316284,0.3433000147342682,0.3725000023841858,0.3529999852180481,0.37959998846054077,0.35580000281333923,0.4002000093460083,0.4246000051498413,0.4219000041484833,0.41200000047683716,0.45579999685287476,0.4603999853134155,0.4885999858379364,0.49059998989105225,0.5011000037193298,0.4887000024318695,0.5214999914169312,0.5365999937057495,0.5289999842643738,0.5536999702453613,0.5414999723434448,0.5651999711990356,0.5623000264167786,0.5950999855995178,0.5892000198364258,0.571399986743927,0.5942000150680542,0.6075999736785889,0.6184999942779541,0.6040999889373779,0.6302000284194946,0.6327000260353088,0.6334999799728394,0.6376000046730042,0.6324999928474426,0.6468999981880188,0.6355000138282776,0.6604999899864197,0.6601999998092651,0.6538000106811523,0.652400016784668,0.6492000222206116,0.6549000144004822,0.6547999978065491,0.6615999937057495,0.6539000272750854,0.6534000039100647],"rsh_exec":[-0.9794999957084656,-0.9805999994277954,-0.9850000143051147,-0.9828000068664551,-0.9797999858856201,-0.9785000085830688,-0.980400025844574,-0.9768999814987183,-0.9753000140190125,-0.9718000292778015,-0.9735000133514404,-0.972100019454956,-0.9595000147819519,-0.9628999829292297,-0.9491000175476074,-0.944100022315979,-0.9373999834060669,-0.9318000078201294,-0.9061999917030334,-0.9179999828338623,-0.9009000062942505,-0.8859000205993652,-0.879800021648407,-0.8644000291824341,-0.8528000116348267,-0.8446999788284302,-0.8475000262260437,-0.8205999732017517,-0.79830002784729,-0.7777000069618225,-0.7688000202178955,-0.7468000054359436,-0.7396000027656555,-0.7408999800682068,-0.7016000151634216,-0.6973000168800354,-0.6729000210762024,-0.6708999872207642,-0.6794999837875366,-0.6305999755859375,-0.637499988079071,-0.6266000270843506,-0.6159999966621399,-0.6061000227928162,-0.6151999831199646,-0.6004999876022339,-0.5885999798774719,-0.588100016117096,-0.583299994468689,-0.5663999915122986,-0.569100022315979,-0.5547000169754028,-0.5449000000953674,-0.5194000005722046,-0.5080000162124634,-0.5067999958992004,-0.4975000023841858,-0.47360000014305115,-0.4611000120639801,-0.4415999948978424,-0.4341999888420105,-0.43130001425743103,-0.43959999084472656,-0.4083999991416931,-0.3847000002861023,-0.382999986410141,-0.3763999938964844,-0.38960000872612,-0.3310000002384186,-0.3368000090122223,-0.3409000039100647,-0.31369999051094055,-0.3075000047683716,-0.3197000026702881,-0.30309998989105225,-0.2766000032424927,-0.2888000011444092,-0.25679999589920044,-0.26669999957084656,-0.23100000619888306,-0.2515999972820282,-0.23600000143051147,-0.21660000085830688,-0.22589999437332153,-0.20340000092983246,-0.2062000036239624,-0.19539999961853027,-0.18359999358654022,-0.18160000443458557,-0.17270000278949738,-0.16429999470710754,-0.17900000512599945,-0.14790000021457672,-0.1657000035047531,-0.14169999957084656,-0.1492999941110611,-0.13580000400543213,-0.13220000267028809,-0.14110000431537628,-0.14640000462532043,-0.08699999749660492,-0.0908999964594841,-0.07270000129938126,-0.0778999999165535,-0.06920000165700912,-0.07039999961853027,-0.06019999831914902,-0.05790000036358833,-0.05400000140070915,-0.04569999873638153,-0.03999999910593033,-0.04430000111460686,-0.03539999946951866,-0.03319999948143959,-0.02630000002682209,-0.01899999938905239,-0.020600000396370888,-0.012199999764561653,-0.0044999998062849045,-0.01119999960064888,0.002099999925121665,0.002400000113993883,0.0026000000070780516,0.0066999997943639755,0.004600000102072954,0.01119999960064888,0.021299999207258224,0.013199999928474426,0.026799999177455902,0.023399999365210533,0.027799999341368675,0.03139999881386757,0.04129999876022339,0.03620000183582306,0.042100001126527786,0.03629999980330467,0.0421999990940094,0.0494999997317791,0.0502999983727932,0.04639999940991402,0.03970000147819519,0.04670000076293945,0.04809999838471413,0.04280000180006027,0.04399999976158142,0.035999998450279236,0.030700000002980232,0.03189999982714653,0.029600000008940697,0.019200000911951065,0.01940000057220459,-0.00039999998989515007,-0.0010000000474974513,-0.020400000736117363,-0.02759999968111515,-0.0544000007212162,-0.052299998700618744,-0.07360000163316727,-0.10809999704360962,-0.12330000102519989,-0.1551000028848648,-0.1657000035047531,-0.19059999287128448,-0.20669999718666077,-0.24079999327659607,-0.2689000070095062,-0.30230000615119934,-0.33009999990463257,-0.34709998965263367,-0.3547999858856201,-0.3952000141143799,-0.4260999858379364,-0.44209998846054077,-0.4544999897480011,-0.4724000096321106,-0.47920000553131104,-0.5041000247001648,-0.5048999786376953,-0.5266000032424927,-0.5260999798774719,-0.5325000286102295,-0.5389000177383423,-0.5540000200271606,-0.5613999962806702,-0.570900022983551,-0.578000009059906,-0.5867000222206116,-0.589900016784668,-0.5968000292778015,-0.595300018787384,-0.6075000166893005,-0.6087999939918518,-0.60589998960495,-0.6086000204086304,-0.6122000217437744,-0.6097000241279602,-0.6054999828338623,-0.5958999991416931,-0.5964999794960022,-0.5999000072479248,-0.7371000051498413,-0.741100013256073,-0.7468000054359436,-0.7465999722480774,-0.7433000206947327,-0.7455000281333923,-0.7451000213623047,-0.7398999929428101,-0.7394999861717224,-0.7318000197410583,-0.7324000000953674,-0.7228000164031982,-0.7139000296592712,-0.7095000147819519,-0.7110999822616577,-0.6929000020027161,-0.6675999760627747,-0.6773999929428101,-0.6583999991416931,-0.6575999855995178,-0.6492000222206116,-0.6229000091552734,-0.6168000102043152,-0.6126000285148621,-0.609499990940094,-0.5946999788284302,-0.5741000175476074,-0.567799985408783,-0.5701000094413757,-0.5573999881744385,-0.536899983882904,-0.5444999933242798,-0.5442000031471252,-0.5249999761581421,-0.5271999835968018,-0.5202999711036682,-0.5256999731063843,-0.5098999738693237,-0.5080999732017517,-0.5059000253677368,-0.5109999775886536,-0.5024999976158142,-0.4936999976634979,-0.48240000009536743,-0.48890000581741333,-0.4909999966621399,-0.4794999957084656,-0.4823000133037567,-0.47760000824928284,-0.46630001068115234,-0.4625000059604645,-0.45579999685287476,-0.46480000019073486,-0.44920000433921814,-0.4399000108242035,-0.4438999891281128,-0.4287000000476837,-0.4009999930858612,-0.41519999504089355,-0.4165000021457672,-0.4018000066280365,-0.37470000982284546,-0.39089998602867126,-0.37720000743865967,-0.3785000145435333,-0.37459999322891235,-0.3700000047683716,-0.3612000048160553,-0.34200000762939453,-0.33640000224113464,-0.32760000228881836,-0.32820001244544983,-0.31949999928474426,-0.3264000117778778,-0.32429999113082886,-0.3240000009536743,-0.32260000705718994,-0.30000001192092896,-0.3070000112056732,-0.2935999929904938,-0.29660001397132874,-0.2969000041484833,-0.29260000586509705,-0.2870999872684479,-0.29100000858306885,-0.28459998965263367,-0.28380000591278076,-0.2865000069141388,-0.29280000925064087,-0.28529998660087585,-0.28529998660087585,-0.2937999963760376,-0.27570000290870667,-0.2847999930381775,-0.27720001339912415,-0.28540000319480896,-0.2806999981403351,-0.29840001463890076,-0.27459999918937683,-0.2743000090122223,-0.38600000739097595,-0.3955000042915344,-0.3953000009059906,-0.3824999928474426,-0.38690000772476196,-0.38510000705718994,-0.3840999901294708,-0.3815000057220459,-0.3749000132083893,-0.384799987077713,-0.38350000977516174,-0.3741999864578247,-0.3662000000476837,-0.36469998955726624,-0.3677999973297119,-0.3625999987125397,-0.3544999957084656,-0.35109999775886536,-0.352400004863739,-0.34610000252723694,-0.35019999742507935,-0.33959999680519104,-0.3402999937534332,-0.3375000059604645,-0.3312999904155731,-0.33399999141693115,-0.32829999923706055,-0.3188999891281128,-0.3231000006198883,-0.3231000006198883,-0.3174000084400177,-0.32280001044273376,-0.3142000138759613,-0.31299999356269836,-0.3149000108242035,-0.31130000948905945,-0.31369999051094055,-0.3122999966144562,-0.3050999939441681,-0.31360000371932983,-0.3091000020503998,-0.3102000057697296,-0.30219998955726624,-0.3034999966621399,-0.3025999963283539,-0.3066999912261963,-0.3041999936103821,-0.29989999532699585,-0.30160000920295715,-0.29789999127388,-0.29440000653266907,-0.29170000553131104,-0.2928999960422516,-0.29260000586509705,-0.29109999537467957,-0.2903999984264374,-0.28630000352859497,-0.28439998626708984,-0.2881999909877777,-0.2881999909877777,-0.27869999408721924,-0.2808000147342682,-0.27889999747276306,-0.27720001339912415,-0.2824000120162964,-0.2808000147342682,-0.2791000008583069,-0.28040000796318054,-0.27649998664855957,-0.27720001339912415,-0.2791000008583069,-0.2833999991416931,-0.2768999934196472,-0.2793000042438507,-0.2825999855995178,-0.2800000011920929,-0.28349998593330383,-0.288100004196167,-0.2818000018596649,-0.2827000021934509,-0.28610000014305115,-0.28769999742507935,-0.2906999886035919,-0.290800005197525,-0.29319998621940613,-0.3003999888896942,-0.3027999997138977,-0.30869999527931213,-0.3140000104904175,-0.31949999928474426,-0.3140000104904175,-0.33719998598098755,-0.31709998846054077,-0.33169999718666077,-0.3443000018596649,-0.3409999907016754,-0.35179999470710754,-0.3578000068664551,-0.3628000020980835,-0.3686000108718872]},"params_used":51613582,"params_all":83923087,"cpu_s":0.13,"human":{"rgrip":[[0.1899999976158142,0.1899999976158142,0.1899999976158142,0.1899999976158142,0.1899999976158142,0.1899999976158142,0.19099999964237213,0.19200000166893005,0.19200000166893005,0.19200000166893005,0.20900000631809235,0.2630000114440918,0.3889999985694885,0.5989999771118164,0.8820000290870667,1.100000023841858,1.1139999628067017,1.1160000562667847,1.1160000562667847,1.1160000562667847,1.1160000562667847,1.1160000562667847,1.1160000562667847,1.1139999628067017,1.1100000143051147,1.0850000381469727,1.0379999876022339,1.0360000133514404,1.0360000133514404,1.0360000133514404,1.0379999876022339,1.0420000553131104,1.0479999780654907,1.0479999780654907,1.0479999780654907,1.0479999780654907,1.0479999780654907,1.0479999780654907,1.0479999780654907,1.0479999780654907,1.0479999780654907,1.0479999780654907,1.0479999780654907,1.0479999780654907,1.0479999780654907,1.0219999551773071,0.9279999732971191,0.652999997138977,0.4009999930858612,0.25,0.20999999344348907,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20999999344348907,0.20999999344348907,0.20999999344348907,0.20999999344348907,0.20999999344348907,0.20999999344348907,0.20900000631809235,0.20999999344348907,0.20999999344348907,0.20999999344348907,0.20999999344348907,0.20999999344348907,0.20999999344348907,0.20999999344348907,0.20999999344348907,0.20999999344348907,0.20999999344348907,0.20999999344348907,0.21400000154972076,0.24500000476837158,0.3610000014305115,0.6159999966621399,0.9070000052452087,0.8949999809265137,0.8880000114440918,0.8840000033378601,0.8820000290870667,0.8799999952316284,0.878000020980835,0.8759999871253967,0.8740000128746033,0.8740000128746033,0.8740000128746033,0.8740000128746033,0.8740000128746033,0.8740000128746033,0.8740000128746033,0.8740000128746033,0.8740000128746033,0.8740000128746033,0.8740000128746033,0.8740000128746033,0.8740000128746033],[0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.21400000154972076,0.2240000069141388,0.2590000033378601,0.3400000035762787,0.48399999737739563,0.7139999866485596,1.0,1.156000018119812,1.1519999504089355,1.1519999504089355,1.1540000438690186,1.1540000438690186,1.1540000438690186,1.1540000438690186,1.1540000438690186,1.1540000438690186,1.1540000438690186,1.1540000438690186,1.1540000438690186,1.1540000438690186,1.1540000438690186,1.149999976158142,1.1369999647140503,1.0399999618530273,0.7900000214576721,0.5770000219345093,0.3709999918937683,0.26600000262260437,0.24500000476837158,0.24500000476837158,0.24500000476837158,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24300000071525574,0.24300000071525574,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24500000476837158,0.24799999594688416,0.2849999964237213,0.42399999499320984,0.6679999828338623,0.8690000176429749,0.8700000047683716,0.8700000047683716,0.8700000047683716,0.8700000047683716,0.8700000047683716,0.8690000176429749,0.8690000176429749,0.8669999837875366,0.8650000095367432,0.8650000095367432,0.8650000095367432,0.8650000095367432,0.8650000095367432,0.8650000095367432,0.8650000095367432,0.8650000095367432,0.8650000095367432,0.8650000095367432,0.8650000095367432],[0.20100000500679016,0.20100000500679016,0.20100000500679016,0.20100000500679016,0.2029999941587448,0.20399999618530273,0.20399999618530273,0.20399999618530273,0.20399999618530273,0.20499999821186066,0.20600000023841858,0.22300000488758087,0.2879999876022339,0.4350000023841858,0.7070000171661377,1.0299999713897705,1.1690000295639038,1.1790000200271606,1.184000015258789,1.187999963760376,1.190000057220459,1.190000057220459,1.190000057220459,1.190000057220459,1.190000057220459,1.190000057220459,1.190000057220459,1.184000015258789,1.1540000438690186,0.9940000176429749,0.699999988079071,0.41200000047683716,0.2409999966621399,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1899999976158142,0.1899999976158142,0.19699999690055847,0.26600000262260437,0.44600000977516174,0.718999981880188,0.8569999933242798,0.8550000190734863,0.8550000190734863,0.8550000190734863,0.8550000190734863,0.8550000190734863,0.8550000190734863,0.8500000238418579,0.8309999704360962,0.8090000152587891,0.8009999990463257,0.8009999990463257,0.7990000247955322,0.7940000295639038,0.7919999957084656,0.7889999747276306,0.7829999923706055,0.7699999809265137,0.7670000195503235,0.7670000195503235,0.7670000195503235,0.7670000195503235,0.7649999856948853,0.7649999856948853],[0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.2150000035762787,0.2150000035762787,0.21400000154972076,0.2150000035762787,0.2160000056028366,0.22300000488758087,0.25600001215934753,0.335999995470047,0.4860000014305115,0.6940000057220459,0.9520000219345093,1.1770000457763672,1.1979999542236328,1.1979999542236328,1.2000000476837158,1.2000000476837158,1.2000000476837158,1.2000000476837158,1.2000000476837158,1.2000000476837158,1.2000000476837158,1.2000000476837158,1.2000000476837158,1.2000000476837158,1.2000000476837158,1.1979999542236328,1.1979999542236328,1.1979999542236328,1.1979999542236328,1.1959999799728394,1.194000005722046,1.159999966621399,1.0420000553131104,1.0219999551773071,0.9380000233650208,0.6629999876022339,0.3779999911785126,0.2370000034570694,0.20399999618530273,0.20399999618530273,0.20399999618530273,0.20399999618530273,0.20399999618530273,0.20399999618530273,0.20399999618530273,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20600000023841858,0.20800000429153442,0.2240000069141388,0.2879999876022339,0.4300000071525574,0.6970000267028809,0.9300000071525574,0.9089999794960022,0.9089999794960022,0.9089999794960022,0.9049999713897705,0.8970000147819519,0.8970000147819519,0.8970000147819519,0.8949999809265137,0.8930000066757202,0.8930000066757202,0.8930000066757202,0.890999972820282,0.890999972820282,0.890999972820282,0.8930000066757202,0.8930000066757202,0.890999972820282,0.890999972820282,0.8930000066757202,0.890999972820282,0.890999972820282],[0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20999999344348907,0.20999999344348907,0.20999999344348907,0.210999995470047,0.210999995470047,0.210999995470047,0.210999995470047,0.21199999749660492,0.21299999952316284,0.21400000154972076,0.23199999332427979,0.30300000309944153,0.45500001311302185,0.7329999804496765,1.065000057220459,1.1059999465942383,1.1039999723434448,1.1039999723434448,1.1039999723434448,1.1039999723434448,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.0980000495910645,1.0789999961853027,0.9319999814033508,0.6439999938011169,0.3619999885559082,0.20900000631809235,0.17900000512599945,0.17900000512599945,0.17800000309944153,0.17800000309944153,0.17900000512599945,0.17900000512599945,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.18000000715255737,0.1809999942779541,0.19300000369548798,0.2540000081062317,0.3889999985694885,0.6340000033378601,0.9010000228881836,0.8970000147819519,0.8859999775886536,0.8859999775886536,0.8840000033378601,0.8840000033378601,0.8840000033378601,0.8820000290870667,0.8820000290870667,0.8799999952316284],[0.21299999952316284,0.21299999952316284,0.21299999952316284,0.21299999952316284,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.2150000035762787,0.2290000021457672,0.2919999957084656,0.4560000002384186,0.7329999804496765,1.0789999961853027,1.149999976158142,1.1460000276565552,1.1460000276565552,1.1460000276565552,1.1460000276565552,1.1460000276565552,1.1460000276565552,1.1460000276565552,1.1369999647140503,1.1349999904632568,1.1349999904632568,1.1349999904632568,1.1349999904632568,1.1349999904632568,1.1369999647140503,1.1410000324249268,1.1480000019073486,1.149999976158142,1.149999976158142,1.1519999504089355,1.1519999504089355,1.1519999504089355,1.1519999504089355,1.1519999504089355,1.1519999504089355,1.1519999504089355,1.1519999504089355,1.1349999904632568,1.0959999561309814,0.8859999775886536,0.5360000133514404,0.3019999861717224,0.19099999964237213,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1860000044107437,0.19099999964237213,0.22699999809265137,0.3310000002384186,0.5789999961853027,0.8379999995231628,0.8109999895095825,0.7990000247955322,0.7990000247955322,0.7990000247955322],[0.2199999988079071,0.22100000083446503,0.2199999988079071,0.2199999988079071,0.22100000083446503,0.22200000286102295,0.22200000286102295,0.22200000286102295,0.22200000286102295,0.22499999403953552,0.25200000405311584,0.31700000166893005,0.4320000112056732,0.6029999852180481,0.8650000095367432,1.0850000381469727,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1080000400543213,1.0959999561309814,1.0140000581741333,0.8230000138282776,0.6129999756813049,0.4350000023841858,0.2939999997615814,0.2370000034570694,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23999999463558197,0.2549999952316284,0.31700000166893005,0.45899999141693115,0.7039999961853027,0.8799999952316284,0.8740000128746033,0.8740000128746033,0.8740000128746033,0.8740000128746033,0.8740000128746033,0.8740000128746033,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.8700000047683716,0.8700000047683716,0.8700000047683716,0.8700000047683716,0.8700000047683716],[0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.1889999955892563,0.19200000166893005,0.20100000500679016,0.20900000631809235,0.210999995470047,0.21199999749660492,0.21699999272823334,0.2529999911785126,0.36800000071525574,0.6069999933242798,0.9419999718666077,1.1690000295639038,1.1670000553131104,1.1670000553131104,1.1670000553131104,1.1670000553131104,1.1670000553131104,1.1670000553131104,1.1670000553131104,1.1670000553131104,1.159999966621399,1.1160000562667847,0.9240000247955322,0.6570000052452087,0.414000004529953,0.24899999797344208,0.1979999989271164,0.20000000298023224,0.19900000095367432,0.19699999690055847,0.19599999487400055,0.19599999487400055,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20200000703334808,0.22599999606609344,0.2980000078678131,0.4860000014305115,0.7739999890327454,0.890999972820282,0.871999979019165,0.871999979019165,0.871999979019165,0.871999979019165,0.8700000047683716,0.8690000176429749,0.8669999837875366,0.8629999756813049,0.859000027179718,0.8550000190734863,0.8529999852180481,0.8529999852180481,0.8529999852180481,0.8529999852180481,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546],[0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20600000023841858,0.20600000023841858,0.20600000023841858,0.2070000022649765,0.20900000631809235,0.21899999678134918,0.25200000405311584,0.3319999873638153,0.49799999594688416,0.7179999947547913,0.9919999837875366,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0770000219345093,1.0420000553131104,0.8840000033378601,0.6399999856948853,0.4090000092983246,0.2549999952316284,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21299999952316284,0.21299999952316284,0.21299999952316284,0.21199999749660492,0.21299999952316284,0.21199999749660492,0.21299999952316284,0.21299999952316284,0.21299999952316284,0.21299999952316284,0.21299999952316284,0.21299999952316284,0.21299999952316284,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21299999952316284,0.21299999952316284,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21899999678134918,0.2639999985694885,0.40400001406669617,0.652999997138977,0.8460000157356262,0.8199999928474426,0.8119999766349792,0.8090000152587891,0.8090000152587891,0.8090000152587891,0.8090000152587891,0.8090000152587891,0.8090000152587891,0.8090000152587891,0.8069999814033508,0.8069999814033508,0.8090000152587891,0.8069999814033508,0.8069999814033508,0.8069999814033508,0.8090000152587891,0.8069999814033508,0.8069999814033508,0.8069999814033508,0.8069999814033508,0.8090000152587891,0.8069999814033508,0.8069999814033508,0.8069999814033508],[0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.20800000429153442,0.20800000429153442,0.20800000429153442,0.20800000429153442,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20999999344348907,0.21799999475479126,0.24799999594688416,0.31700000166893005,0.4350000023841858,0.6320000290870667,0.9089999794960022,1.0959999561309814,1.093999981880188,1.093999981880188,1.093999981880188,1.093999981880188,1.093999981880188,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0889999866485596,1.0889999866485596,1.0889999866485596,1.031999945640564,0.8069999814033508,0.5220000147819519,0.29499998688697815,0.20000000298023224,0.1979999989271164,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.1979999989271164,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20100000500679016,0.21799999475479126,0.30799999833106995,0.492000013589859,0.7829999923706055,0.9259999990463257,0.9070000052452087,0.9070000052452087,0.9070000052452087,0.9070000052452087,0.9070000052452087,0.9070000052452087,0.9070000052452087,0.9049999713897705,0.9049999713897705,0.902999997138977,0.902999997138977,0.902999997138977,0.902999997138977,0.9049999713897705,0.902999997138977,0.9049999713897705,0.9049999713897705,0.9049999713897705,0.902999997138977,0.9049999713897705,0.902999997138977,0.902999997138977,0.902999997138977,0.902999997138977,0.902999997138977,0.902999997138977,0.902999997138977],[0.210999995470047,0.210999995470047,0.21199999749660492,0.210999995470047,0.210999995470047,0.21199999749660492,0.21199999749660492,0.21199999749660492,0.21199999749660492,0.21199999749660492,0.21400000154972076,0.2240000069141388,0.2639999985694885,0.3569999933242798,0.5149999856948853,0.7559999823570251,1.0540000200271606,1.0789999961853027,1.0770000219345093,1.0770000219345093,1.0770000219345093,1.0770000219345093,1.0770000219345093,1.0770000219345093,1.0750000476837158,1.0709999799728394,1.069000005722046,1.0420000553131104,0.8930000066757202,0.6729999780654907,0.47099998593330383,0.3160000145435333,0.24400000274181366,0.2409999966621399,0.2409999966621399,0.23999999463558197,0.23999999463558197,0.2370000034570694,0.23600000143051147,0.23600000143051147,0.23499999940395355,0.23600000143051147,0.23600000143051147,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.2370000034570694,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23800000548362732,0.23899999260902405,0.23899999260902405,0.23899999260902405,0.23899999260902405,0.23899999260902405,0.23999999463558197,0.23899999260902405,0.23999999463558197,0.23899999260902405,0.23899999260902405,0.2409999966621399,0.2460000067949295,0.25699999928474426,0.26600000262260437,0.27799999713897705,0.37299999594688416,0.6370000243186951,0.9580000042915344,0.9620000123977661,0.9580000042915344,0.9580000042915344,0.9580000042915344,0.9580000042915344,0.9580000042915344,0.9580000042915344,0.9559999704360962,0.9520000219345093,0.9520000219345093,0.949999988079071,0.9480000138282776,0.9459999799728394,0.9459999799728394,0.9440000057220459,0.9440000057220459,0.9440000057220459,0.9440000057220459,0.9440000057220459,0.9440000057220459,0.9440000057220459,0.9440000057220459],[0.19300000369548798,0.1940000057220459,0.1940000057220459,0.1940000057220459,0.19499999284744263,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.20100000500679016,0.21899999678134918,0.2619999945163727,0.3610000014305115,0.5659999847412109,0.8989999890327454,1.0570000410079956,1.0460000038146973,1.0460000038146973,1.0460000038146973,1.0460000038146973,1.0460000038146973,1.0460000038146973,1.0460000038146973,1.0440000295639038,1.0460000038146973,1.0440000295639038,1.0440000295639038,1.0440000295639038,1.0420000553131104,1.0379999876022339,1.0140000581741333,0.8479999899864197,0.574999988079071,0.34200000762939453,0.21199999749660492,0.1979999989271164,0.1979999989271164,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.1979999989271164,0.19699999690055847,0.19699999690055847,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.19900000095367432,0.1979999989271164,0.19900000095367432,0.19900000095367432,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.19900000095367432,0.20000000298023224,0.20100000500679016,0.2160000056028366,0.28600001335144043,0.44600000977516174,0.6949999928474426,0.7689999938011169,0.7620000243186951,0.7620000243186951,0.7620000243186951,0.7620000243186951,0.7620000243186951,0.7620000243186951,0.7599999904632568,0.7580000162124634,0.7559999823570251,0.7559999823570251,0.7559999823570251,0.7559999823570251,0.7559999823570251,0.7559999823570251],[0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.2329999953508377,0.2329999953508377,0.23399999737739563,0.23399999737739563,0.23399999737739563,0.23399999737739563,0.23399999737739563,0.23800000548362732,0.2709999978542328,0.38499999046325684,0.6370000243186951,0.9760000109672546,1.1119999885559082,1.125,1.125,1.125,1.125,1.125,1.125,1.125,1.125,1.125,1.1269999742507935,1.125,1.125,1.125,1.125,1.125,1.125,1.125,1.125,1.125,1.1160000562667847,1.0609999895095825,0.8650000095367432,0.5820000171661377,0.3490000069141388,0.21799999475479126,0.20399999618530273,0.20399999618530273,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.20399999618530273,0.20399999618530273,0.20499999821186066,0.2290000021457672,0.3179999887943268,0.5630000233650208,0.8690000176429749,0.8820000290870667,0.8859999775886536,0.8880000114440918,0.8880000114440918,0.8880000114440918,0.8859999775886536,0.8740000128746033,0.871999979019165,0.8700000047683716,0.8690000176429749,0.8650000095367432,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.859000027179718,0.859000027179718,0.859000027179718,0.859000027179718,0.859000027179718],[0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.22100000083446503,0.22100000083446503,0.22100000083446503,0.22100000083446503,0.22100000083446503,0.22200000286102295,0.22300000488758087,0.22300000488758087,0.2290000021457672,0.25999999046325684,0.32600000500679016,0.4410000145435333,0.6340000033378601,0.878000020980835,1.0540000200271606,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0540000200271606,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0499999523162842,1.0140000581741333,0.871999979019165,0.6650000214576721,0.4650000035762787,0.2919999957084656,0.23100000619888306,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.23199999332427979,0.2329999953508377,0.2460000067949295,0.3100000023841858,0.4690000116825104,0.7300000190734863,0.8349999785423279,0.824999988079071,0.824999988079071,0.824999988079071,0.824999988079071,0.8230000138282776,0.8230000138282776,0.8230000138282776,0.8220000267028809,0.8220000267028809,0.8199999928474426],[0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20100000500679016,0.20100000500679016,0.20399999618530273,0.22499999403953552,0.2840000092983246,0.40700000524520874,0.6320000290870667,0.9200000166893005,1.0920000076293945,1.0850000381469727,1.0850000381469727,1.0850000381469727,1.0850000381469727,1.0850000381469727,1.0850000381469727,1.0850000381469727,1.0850000381469727,1.0850000381469727,1.0850000381469727,1.0809999704360962,1.0789999961853027,1.0789999961853027,1.0789999961853027,1.0789999961853027,1.0789999961853027,1.0889999866485596,1.1100000143051147,1.1390000581741333,1.1440000534057617,1.1460000276565552,1.1460000276565552,1.1460000276565552,1.1460000276565552,1.1460000276565552,1.1460000276565552,1.13100004196167,1.034000039100647,0.7419999837875366,0.414000004529953,0.23100000619888306,0.18000000715255737,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.18199999630451202,0.18299999833106995,0.2070000022649765,0.2919999957084656,0.5019999742507935,0.7760000228881836,0.843999981880188,0.8360000252723694,0.8379999995231628,0.8360000252723694,0.8360000252723694,0.8349999785423279,0.8330000042915344,0.8330000042915344,0.8330000042915344,0.8309999704360962,0.8309999704360962,0.8309999704360962,0.8309999704360962],[0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.20800000429153442,0.20800000429153442,0.20900000631809235,0.20900000631809235,0.2240000069141388,0.2840000092983246,0.4259999990463257,0.6729999780654907,0.9169999957084656,0.9700000286102295,0.9679999947547913,0.9819999933242798,0.9940000176429749,1.0379999876022339,1.0920000076293945,1.093999981880188,1.093999981880188,1.093999981880188,1.093999981880188,1.093999981880188,1.093999981880188,1.093999981880188,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0850000381469727,1.062999963760376,0.9200000166893005,0.6259999871253967,0.3790000081062317,0.23100000619888306,0.1899999976158142,0.19099999964237213,0.1899999976158142,0.1899999976158142,0.1889999955892563,0.1889999955892563,0.1889999955892563,0.1899999976158142,0.1899999976158142,0.1899999976158142,0.1899999976158142,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19200000166893005,0.19499999284744263,0.20900000631809235,0.257999986410141,0.39100000262260437,0.6949999928474426,0.972000002861023,0.9559999704360962,0.9539999961853027,0.9539999961853027,0.9539999961853027,0.9539999961853027,0.9539999961853027,0.9520000219345093,0.949999988079071,0.949999988079071,0.9480000138282776,0.9480000138282776,0.9459999799728394,0.9440000057220459,0.9440000057220459,0.9440000057220459,0.9440000057220459],[0.1979999989271164,0.1979999989271164,0.1979999989271164,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.20000000298023224,0.20000000298023224,0.20100000500679016,0.2029999941587448,0.22599999606609344,0.2849999964237213,0.3880000114440918,0.5559999942779541,0.8820000290870667,1.1080000400543213,1.0980000495910645,1.0959999561309814,1.0959999561309814,1.0959999561309814,1.0959999561309814,1.0959999561309814,1.0959999561309814,1.0959999561309814,1.0959999561309814,1.0959999561309814,1.0829999446868896,1.0,0.921999990940094,0.9440000057220459,0.9959999918937683,1.0420000553131104,1.0440000295639038,1.0440000295639038,1.0440000295639038,1.0440000295639038,1.0440000295639038,1.0420000553131104,1.0420000553131104,1.0379999876022339,1.0379999876022339,1.0360000133514404,1.0360000133514404,1.031999945640564,0.9940000176429749,0.871999979019165,0.6949999928474426,0.4699999988079071,0.26899999380111694,0.18799999356269836,0.18700000643730164,0.18700000643730164,0.18700000643730164,0.1860000044107437,0.18700000643730164,0.18700000643730164,0.18700000643730164,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.1889999955892563,0.20000000298023224,0.24699999392032623,0.3840000033378601,0.6439999938011169,0.878000020980835,0.8690000176429749,0.8669999837875366,0.8669999837875366,0.8669999837875366,0.8669999837875366,0.859000027179718,0.7990000247955322,0.6240000128746033,0.5080000162124634,0.4950000047683716,0.4950000047683716,0.4950000047683716,0.4950000047683716,0.4950000047683716],[0.2029999941587448,0.2029999941587448,0.20399999618530273,0.20399999618530273,0.20399999618530273,0.20399999618530273,0.20399999618530273,0.20399999618530273,0.20499999821186066,0.2070000022649765,0.2329999953508377,0.3140000104904175,0.4909999966621399,0.8349999785423279,1.0750000476837158,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0540000200271606,1.0479999780654907,1.031999945640564,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.027999997138977,1.0299999713897705,1.0379999876022339,1.0499999523162842,1.0499999523162842,1.0499999523162842,1.0499999523162842,1.0499999523162842,1.0499999523162842,1.0499999523162842,1.0499999523162842,1.0499999523162842,1.0499999523162842,1.0499999523162842,1.0499999523162842,1.0499999523162842,1.0399999618530273,0.9879999756813049,0.7490000128746033,0.46700000762939453,0.2549999952316284,0.1850000023841858,0.1860000044107437,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.18700000643730164,0.18700000643730164,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.18700000643730164,0.18700000643730164,0.18700000643730164,0.18700000643730164,0.18700000643730164,0.18799999356269836,0.20000000298023224,0.24400000274181366,0.3580000102519989,0.6000000238418579,0.8550000190734863,0.8399999737739563,0.8360000252723694,0.8360000252723694,0.8360000252723694,0.8360000252723694,0.8349999785423279,0.8330000042915344,0.8309999704360962],[0.18400000035762787,0.18400000035762787,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.18799999356269836,0.19900000095367432,0.2150000035762787,0.2409999966621399,0.2840000092983246,0.35499998927116394,0.5529999732971191,0.8529999852180481,1.0889999866485596,1.0850000381469727,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0789999961853027,1.0789999961853027,1.0770000219345093,1.0770000219345093,1.0770000219345093,1.0770000219345093,1.0770000219345093,1.0770000219345093,1.0770000219345093,1.0770000219345093,1.0789999961853027,1.0789999961853027,1.0770000219345093,1.0789999961853027,1.0789999961853027,1.0770000219345093,1.0770000219345093,1.0770000219345093,1.0609999895095825,0.9279999732971191,0.6320000290870667,0.36800000071525574,0.23600000143051147,0.22100000083446503,0.2199999988079071,0.21899999678134918,0.21899999678134918,0.21899999678134918,0.21899999678134918,0.21899999678134918,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.22100000083446503,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.22100000083446503,0.22200000286102295,0.22599999606609344,0.26600000262260437,0.37599998712539673,0.6110000014305115,0.8569999933242798,0.902999997138977,0.902999997138977,0.902999997138977,0.902999997138977,0.902999997138977,0.902999997138977,0.902999997138977,0.902999997138977,0.902999997138977,0.9010000228881836,0.9010000228881836,0.9010000228881836,0.9010000228881836,0.9010000228881836,0.9010000228881836],[0.17800000309944153,0.17800000309944153,0.17900000512599945,0.17900000512599945,0.17900000512599945,0.17900000512599945,0.18000000715255737,0.18299999833106995,0.20399999618530273,0.2639999985694885,0.39500001072883606,0.6420000195503235,0.9879999756813049,1.180999994277954,1.1619999408721924,1.1619999408721924,1.1619999408721924,1.1619999408721924,1.1619999408721924,1.1619999408721924,1.1619999408721924,1.1619999408721924,1.1619999408721924,1.1619999408721924,1.1619999408721924,1.1619999408721924,1.159999966621399,1.156000018119812,1.1230000257492065,0.949999988079071,0.6869999766349792,0.41600000858306885,0.2409999966621399,0.1860000044107437,0.18700000643730164,0.1860000044107437,0.1860000044107437,0.1860000044107437,0.18700000643730164,0.18799999356269836,0.18700000643730164,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.1899999976158142,0.20399999618530273,0.2460000067949295,0.3479999899864197,0.5440000295639038,0.7329999804496765,0.7829999923706055,0.7829999923706055,0.7850000262260437,0.7850000262260437,0.7850000262260437,0.7850000262260437,0.7829999923706055,0.7829999923706055,0.781000018119812,0.781000018119812,0.781000018119812,0.781000018119812,0.781000018119812,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705,0.7799999713897705],[0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17599999904632568,0.17599999904632568,0.17599999904632568,0.1770000010728836,0.1770000010728836,0.17800000309944153,0.19699999690055847,0.2639999985694885,0.3959999978542328,0.6159999966621399,0.9440000057220459,1.11899995803833,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.100000023841858,1.0959999561309814,1.0870000123977661,1.0789999961853027,1.0789999961853027,1.0809999704360962,1.0850000381469727,1.0870000123977661,1.0889999866485596,1.0889999866485596,1.0889999866485596,1.0889999866485596,1.0889999866485596,1.0889999866485596,1.0889999866485596,1.0889999866485596,1.0870000123977661,1.0750000476837158,0.9760000109672546,0.6209999918937683,0.3190000057220459,0.17499999701976776,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.17100000381469727,0.1720000058412552,0.19099999964237213,0.26899999380111694,0.44699999690055847,0.7459999918937683,0.9049999713897705,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8759999871253967,0.8759999871253967,0.8759999871253967,0.8759999871253967,0.8759999871253967,0.8759999871253967,0.8759999871253967,0.8759999871253967],[0.1860000044107437,0.18700000643730164,0.18700000643730164,0.18799999356269836,0.18799999356269836,0.18799999356269836,0.1940000057220459,0.21899999678134918,0.2639999985694885,0.3409999907016754,0.48100000619888306,0.7179999947547913,0.984000027179718,1.0920000076293945,1.0870000123977661,1.0870000123977661,1.0870000123977661,1.0870000123977661,1.0870000123977661,1.0870000123977661,1.0870000123977661,1.0870000123977661,1.0870000123977661,1.0829999446868896,1.065000057220459,0.9419999718666077,0.6880000233650208,0.4169999957084656,0.25200000405311584,0.19099999964237213,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.1940000057220459,0.1940000057220459,0.1940000057220459,0.1940000057220459,0.1940000057220459,0.1940000057220459,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.1940000057220459,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19599999487400055,0.19900000095367432,0.22499999403953552,0.296999990940094,0.4749999940395355,0.7559999823570251,0.9860000014305115,0.9660000205039978,0.9660000205039978,0.9620000123977661,0.9580000042915344,0.9559999704360962,0.9539999961853027,0.9520000219345093,0.949999988079071,0.949999988079071,0.9480000138282776,0.9200000166893005,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339,0.9129999876022339],[0.1899999976158142,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19200000166893005,0.19300000369548798,0.22100000083446503,0.2930000126361847,0.4300000071525574,0.6549999713897705,0.9150000214576721,1.0140000581741333,1.00600004196167,1.0080000162124634,1.0180000066757202,1.0180000066757202,1.0180000066757202,1.0180000066757202,1.0199999809265137,1.0180000066757202,1.0199999809265137,1.0199999809265137,1.0199999809265137,1.0199999809265137,1.0199999809265137,1.0199999809265137,1.0199999809265137,1.0199999809265137,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0299999713897705,1.059000015258789,1.125,1.1330000162124634,1.1410000324249268,1.1440000534057617,1.1440000534057617,1.1440000534057617,1.1440000534057617,1.1440000534057617,1.1440000534057617,1.1440000534057617,1.1440000534057617,1.1440000534057617,1.1440000534057617,1.1440000534057617,1.1440000534057617,1.1330000162124634,1.1139999628067017,1.0199999809265137,0.781000018119812,0.5189999938011169,0.32199999690055847,0.22300000488758087,0.20900000631809235,0.20900000631809235,0.2070000022649765,0.20600000023841858,0.20600000023841858,0.20600000023841858,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.2070000022649765,0.20900000631809235,0.210999995470047,0.21199999749660492,0.21299999952316284,0.2329999953508377,0.33799999952316284,0.5690000057220459],[0.21199999749660492,0.21199999749660492,0.21199999749660492,0.21199999749660492,0.21199999749660492,0.21199999749660492,0.21199999749660492,0.21299999952316284,0.21299999952316284,0.21400000154972076,0.21899999678134918,0.24500000476837158,0.30000001192092896,0.4020000100135803,0.5960000157356262,0.8799999952316284,1.0959999561309814,1.0920000076293945,1.0889999866485596,1.0889999866485596,1.0889999866485596,1.0889999866485596,1.0889999866485596,1.0889999866485596,1.0889999866485596,1.0889999866485596,1.0889999866485596,1.0870000123977661,1.0809999704360962,1.0709999799728394,0.9520000219345093,0.699999988079071,0.4230000078678131,0.25200000405311584,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21799999475479126,0.25600001215934753,0.38199999928474426,0.6079999804496765,0.8899999856948853,0.9190000295639038,0.9190000295639038,0.9190000295639038,0.9169999957084656,0.9110000133514404,0.9110000133514404,0.9110000133514404,0.9110000133514404,0.9089999794960022,0.9089999794960022,0.9089999794960022,0.8970000147819519,0.8840000033378601,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284,0.8799999952316284],[0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.1809999942779541,0.18199999630451202,0.18199999630451202,0.1889999955892563,0.22599999606609344,0.3050000071525574,0.4519999921321869,0.7020000219345093,0.9819999933242798,1.1019999980926514,1.0959999561309814,1.0959999561309814,1.0959999561309814,1.0980000495910645,1.0959999561309814,1.0980000495910645,1.0959999561309814,1.0959999561309814,1.0959999561309814,1.0959999561309814,1.0959999561309814,1.0959999561309814,1.0889999866485596,1.0119999647140503,0.7739999890327454,0.49799999594688416,0.28600001335144043,0.19699999690055847,0.19300000369548798,0.19300000369548798,0.19200000166893005,0.19200000166893005,0.19200000166893005,0.19200000166893005,0.19200000166893005,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.1940000057220459,0.19900000095367432,0.22300000488758087,0.2939999997615814,0.4490000009536743,0.6880000233650208,0.8650000095367432,0.8529999852180481,0.8529999852180481,0.8529999852180481,0.8529999852180481,0.8529999852180481,0.8529999852180481,0.8529999852180481,0.8529999852180481,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8529999852180481,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546,0.8510000109672546],[0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.2029999941587448,0.20399999618530273,0.20399999618530273,0.20399999618530273,0.21299999952316284,0.24500000476837158,0.3190000057220459,0.4620000123977661,0.6990000009536743,0.9399999976158142,1.0140000581741333,1.0219999551773071,1.027999997138977,1.0260000228881836,1.0260000228881836,1.027999997138977,1.027999997138977,1.027999997138977,1.027999997138977,1.027999997138977,1.027999997138977,1.027999997138977,1.027999997138977,1.027999997138977,1.027999997138977,1.027999997138977,1.027999997138977,1.027999997138977,1.027999997138977,1.027999997138977,1.027999997138977,1.027999997138977,1.0180000066757202,0.972000002861023,0.7559999823570251,0.4230000078678131,0.210999995470047,0.15000000596046448,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15299999713897705,0.15299999713897705,0.15299999713897705,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.15399999916553497,0.1550000011920929,0.18000000715255737,0.2630000114440918,0.46299999952316284,0.8009999990463257,0.9150000214576721,0.8820000290870667,0.878000020980835,0.8740000128746033,0.8740000128746033,0.8740000128746033,0.8700000047683716,0.8690000176429749,0.8669999837875366,0.8650000095367432,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049],[0.17399999499320984,0.17499999701976776,0.17399999499320984,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17599999904632568,0.17599999904632568,0.1770000010728836,0.1770000010728836,0.17800000309944153,0.17800000309944153,0.1889999955892563,0.27399998903274536,0.5189999938011169,0.9639999866485596,1.1749999523162842,1.1480000019073486,1.1480000019073486,1.1480000019073486,1.1480000019073486,1.1480000019073486,1.1480000019073486,1.1480000019073486,1.1460000276565552,1.1460000276565552,1.1460000276565552,1.1460000276565552,1.1460000276565552,1.1460000276565552,1.1410000324249268,1.1080000400543213,0.8740000128746033,0.4880000054836273,0.2409999966621399,0.15000000596046448,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15199999511241913,0.15299999713897705,0.16099999845027924,0.1809999942779541,0.23899999260902405,0.3869999945163727,0.7279999852180481,0.9620000123977661,0.9150000214576721,0.9089999794960022,0.9089999794960022,0.9010000228881836,0.8970000147819519,0.8949999809265137,0.8930000066757202,0.8930000066757202,0.8930000066757202,0.8930000066757202,0.8930000066757202,0.8930000066757202,0.8930000066757202,0.8930000066757202,0.8930000066757202,0.8930000066757202,0.8930000066757202],[0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17599999904632568,0.17599999904632568,0.1770000010728836,0.17800000309944153,0.1809999942779541,0.23100000619888306,0.3630000054836273,0.6000000238418579,0.9129999876022339,1.100000023841858,1.1039999723434448,1.1059999465942383,1.1059999465942383,1.1059999465942383,1.1059999465942383,1.1059999465942383,1.1059999465942383,1.1059999465942383,1.1059999465942383,1.1059999465942383,1.1059999465942383,1.1059999465942383,1.1059999465942383,1.1059999465942383,1.1059999465942383,1.1039999723434448,1.1019999980926514,1.1019999980926514,1.0980000495910645,1.0360000133514404,0.7889999747276306,0.4819999933242798,0.25600001215934753,0.1809999942779541,0.18199999630451202,0.18199999630451202,0.18199999630451202,0.1809999942779541,0.18199999630451202,0.18199999630451202,0.18199999630451202,0.18199999630451202,0.18199999630451202,0.18199999630451202,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18199999630451202,0.18199999630451202,0.18199999630451202,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.1860000044107437,0.21299999952316284,0.2759999930858612,0.39899998903274536,0.6399999856948853,0.8669999837875366,0.8840000033378601,0.8840000033378601,0.8840000033378601,0.8840000033378601,0.8840000033378601,0.8840000033378601,0.8820000290870667,0.8799999952316284,0.878000020980835,0.8700000047683716,0.8550000190734863,0.8550000190734863,0.8529999852180481,0.8529999852180481,0.8529999852180481,0.8529999852180481,0.8529999852180481,0.8529999852180481,0.8529999852180481,0.8529999852180481,0.8529999852180481],[0.1899999976158142,0.1899999976158142,0.1899999976158142,0.1899999976158142,0.1899999976158142,0.1899999976158142,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19200000166893005,0.19200000166893005,0.19699999690055847,0.2290000021457672,0.30399999022483826,0.4429999887943268,0.671999990940094,0.9480000138282776,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0260000228881836,1.0240000486373901,1.0180000066757202,0.8989999890327454,0.6079999804496765,0.3319999873638153,0.1850000023841858,0.16300000250339508,0.16300000250339508,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.16300000250339508,0.164000004529953,0.164000004529953,0.17399999499320984,0.23100000619888306,0.37700000405311584,0.6549999713897705,0.8379999995231628,0.8159999847412109,0.8159999847412109,0.8159999847412109,0.8140000104904175,0.8140000104904175,0.8109999895095825,0.8090000152587891,0.8050000071525574,0.8050000071525574,0.8029999732971191,0.8029999732971191,0.8029999732971191,0.8029999732971191,0.8029999732971191,0.8029999732971191],[0.1899999976158142,0.1899999976158142,0.1899999976158142,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19200000166893005,0.19499999284744263,0.21400000154972076,0.25200000405311584,0.3240000009536743,0.46000000834465027,0.7160000205039978,1.0019999742507935,1.0789999961853027,1.0829999446868896,1.0809999704360962,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0809999704360962,1.0770000219345093,1.059000015258789,0.8970000147819519,0.6179999709129333,0.36500000953674316,0.21400000154972076,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.1850000023841858,0.19200000166893005,0.23800000548362732,0.3490000069141388,0.5509999990463257,0.777999997138977,0.8899999856948853,0.8880000114440918,0.8880000114440918,0.8880000114440918,0.8880000114440918,0.8880000114440918,0.8859999775886536,0.8859999775886536,0.8859999775886536,0.8840000033378601,0.8840000033378601,0.8840000033378601,0.8840000033378601,0.8840000033378601,0.8840000033378601,0.8840000033378601,0.8840000033378601,0.8840000033378601,0.8840000033378601,0.8840000033378601,0.8840000033378601],[0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17599999904632568,0.18000000715255737,0.19599999487400055,0.24899999797344208,0.3610000014305115,0.5720000267028809,0.8930000066757202,1.0770000219345093,1.0479999780654907,1.0460000038146973,1.0460000038146973,1.0460000038146973,1.0460000038146973,1.0460000038146973,1.0440000295639038,1.0440000295639038,1.0440000295639038,1.0420000553131104,1.0240000486373901,0.9049999713897705,0.6129999756813049,0.35600000619888306,0.2240000069141388,0.20000000298023224,0.20100000500679016,0.20100000500679016,0.20000000298023224,0.20000000298023224,0.20100000500679016,0.20100000500679016,0.20100000500679016,0.20100000500679016,0.20100000500679016,0.20100000500679016,0.20200000703334808,0.20200000703334808,0.20200000703334808,0.20200000703334808,0.20200000703334808,0.20200000703334808,0.20200000703334808,0.20200000703334808,0.20200000703334808,0.20200000703334808,0.2029999941587448,0.2029999941587448,0.20200000703334808,0.2029999941587448,0.20200000703334808,0.20200000703334808,0.2029999941587448,0.20399999618530273,0.23100000619888306,0.3319999873638153,0.5590000152587891,0.8840000033378601,0.8970000147819519,0.8859999775886536,0.8840000033378601,0.8820000290870667,0.8759999871253967,0.871999979019165,0.8690000176429749,0.8650000095367432,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049,0.8629999756813049],[0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19200000166893005,0.19599999487400055,0.19699999690055847,0.1979999989271164,0.1979999989271164,0.19699999690055847,0.1979999989271164,0.20000000298023224,0.21400000154972076,0.2540000081062317,0.3529999852180481,0.550000011920929,0.9319999814033508,1.11899995803833,1.093999981880188,1.093999981880188,1.0920000076293945,1.0920000076293945,1.093999981880188,1.0920000076293945,1.0920000076293945,1.0889999866485596,1.0870000123977661,1.0850000381469727,1.0829999446868896,1.0770000219345093,1.0360000133514404,0.843999981880188,0.5320000052452087,0.31299999356269836,0.20399999618530273,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19599999487400055,0.19699999690055847,0.19699999690055847,0.19599999487400055,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19900000095367432,0.2150000035762787,0.28600001335144043,0.4779999852180481,0.7620000243186951,0.9129999876022339,0.9010000228881836,0.9010000228881836,0.8989999890327454,0.8930000066757202,0.890999972820282,0.890999972820282,0.8840000033378601,0.843999981880188,0.8289999961853027,0.8289999961853027,0.8270000219345093,0.8270000219345093,0.8270000219345093,0.8270000219345093,0.8270000219345093,0.8270000219345093,0.8270000219345093,0.8270000219345093,0.8270000219345093,0.8270000219345093,0.8270000219345093,0.8270000219345093,0.8270000219345093,0.8270000219345093,0.8270000219345093,0.8270000219345093,0.8270000219345093,0.8270000219345093],[0.19900000095367432,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20100000500679016,0.20100000500679016,0.20900000631809235,0.24400000274181366,0.33799999952316284,0.5440000295639038,0.7739999890327454,0.972000002861023,0.984000027179718,0.984000027179718,0.984000027179718,0.984000027179718,0.984000027179718,0.984000027179718,0.9860000014305115,0.9860000014305115,0.9860000014305115,0.9860000014305115,0.984000027179718,0.984000027179718,0.9860000014305115,0.984000027179718,0.984000027179718,0.984000027179718,0.9779999852180481,0.9150000214576721,0.6769999861717224,0.3959999978542328,0.22100000083446503,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.1850000023841858,0.1899999976158142,0.22599999606609344,0.3400000035762787,0.5649999976158142,0.7990000247955322,0.777999997138977,0.7760000228881836,0.7699999809265137,0.7689999938011169,0.7689999938011169,0.7670000195503235,0.7649999856948853,0.7649999856948853,0.7649999856948853,0.7649999856948853,0.7649999856948853,0.7649999856948853,0.7649999856948853,0.7649999856948853,0.7649999856948853,0.7649999856948853,0.7649999856948853,0.7649999856948853,0.7649999856948853,0.7649999856948853,0.7649999856948853,0.7649999856948853,0.7649999856948853],[0.18799999356269836,0.18799999356269836,0.18799999356269836,0.1889999955892563,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19200000166893005,0.19599999487400055,0.23199999332427979,0.33000001311302185,0.5379999876022339,0.8740000128746033,1.0980000495910645,1.0850000381469727,1.0850000381469727,1.0850000381469727,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0829999446868896,1.0809999704360962,1.0809999704360962,1.0789999961853027,1.0789999961853027,1.0789999961853027,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0809999704360962,1.0770000219345093,1.027999997138977,0.8199999928474426,0.5690000057220459,0.34700000286102295,0.22499999403953552,0.19900000095367432,0.19900000095367432,0.19699999690055847,0.1979999989271164,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.20000000298023224,0.20000000298023224,0.20100000500679016,0.20800000429153442,0.26499998569488525,0.4059999883174896,0.6600000262260437,0.8859999775886536,0.8700000047683716,0.8669999837875366,0.8650000095367432,0.8569999933242798,0.8569999933242798,0.8569999933242798,0.8529999852180481,0.843999981880188,0.8360000252723694,0.8360000252723694,0.8360000252723694,0.8360000252723694,0.8360000252723694,0.8360000252723694,0.8360000252723694,0.8360000252723694,0.8360000252723694,0.8360000252723694,0.8360000252723694],[0.23000000417232513,0.23000000417232513,0.23000000417232513,0.23000000417232513,0.23000000417232513,0.23000000417232513,0.23100000619888306,0.23100000619888306,0.23100000619888306,0.23100000619888306,0.23199999332427979,0.23199999332427979,0.2329999953508377,0.2540000081062317,0.3100000023841858,0.4230000078678131,0.6570000052452087,0.9660000205039978,1.1160000562667847,1.0980000495910645,1.0980000495910645,1.0959999561309814,1.0959999561309814,1.0959999561309814,1.0959999561309814,1.093999981880188,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0850000381469727,1.0570000410079956,0.8820000290870667,0.6349999904632568,0.4580000042915344,0.3269999921321869,0.2590000033378601,0.25600001215934753,0.2549999952316284,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2540000081062317,0.2549999952316284,0.25600001215934753,0.257999986410141,0.26899999380111694,0.3370000123977661,0.5709999799728394,0.949999988079071,0.9900000095367432,0.9760000109672546,0.9760000109672546,0.9639999866485596,0.9580000042915344,0.9580000042915344,0.9559999704360962,0.9539999961853027,0.9340000152587891,0.9240000247955322,0.9240000247955322,0.9240000247955322,0.9240000247955322,0.9240000247955322],[0.1770000010728836,0.1770000010728836,0.1770000010728836,0.1770000010728836,0.1770000010728836,0.1770000010728836,0.17800000309944153,0.17800000309944153,0.1770000010728836,0.17800000309944153,0.17800000309944153,0.17800000309944153,0.1809999942779541,0.20900000631809235,0.28999999165534973,0.44600000977516174,0.6949999928474426,0.9819999933242798,1.059000015258789,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0499999523162842,1.0019999742507935,0.7829999923706055,0.46000000834465027,0.2549999952316284,0.17499999701976776,0.17399999499320984,0.17399999499320984,0.17399999499320984,0.17399999499320984,0.17399999499320984,0.17299999296665192,0.17299999296665192,0.17299999296665192,0.17399999499320984,0.17399999499320984,0.17399999499320984,0.17399999499320984,0.17399999499320984,0.17399999499320984,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17399999499320984,0.17399999499320984,0.17499999701976776,0.17399999499320984,0.17499999701976776,0.17499999701976776,0.17399999499320984,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17599999904632568,0.1770000010728836,0.1770000010728836,0.17800000309944153,0.17800000309944153,0.19099999964237213,0.2750000059604645,0.4959999918937683,0.7440000176429749,0.8009999990463257,0.8109999895095825,0.8109999895095825,0.8109999895095825,0.8109999895095825,0.8050000071525574,0.8009999990463257,0.7979999780654907,0.7960000038146973,0.7940000295639038,0.7919999957084656,0.7919999957084656,0.7919999957084656],[0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.1940000057220459,0.1940000057220459,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19599999487400055,0.20000000298023224,0.2290000021457672,0.29600000381469727,0.4000000059604645,0.6050000190734863,0.843999981880188,1.0670000314712524,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0920000076293945,1.0889999866485596,1.0889999866485596,1.0889999866485596,1.0750000476837158,0.9539999961853027,0.6729999780654907,0.375,0.20900000631809235,0.1679999977350235,0.16899999976158142,0.1679999977350235,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.16899999976158142,0.17000000178813934,0.18199999630451202,0.23499999940395355,0.375,0.6259999871253967,0.8399999737739563,0.8349999785423279,0.8349999785423279,0.8349999785423279,0.8330000042915344,0.8330000042915344,0.8309999704360962,0.8289999961853027,0.8270000219345093,0.824999988079071,0.8140000104904175,0.8090000152587891,0.8090000152587891,0.8090000152587891,0.8090000152587891,0.8090000152587891,0.8090000152587891,0.8090000152587891,0.8090000152587891,0.8090000152587891,0.8090000152587891,0.8090000152587891],[0.20800000429153442,0.20800000429153442,0.20800000429153442,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20800000429153442,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.21199999749660492,0.2290000021457672,0.3089999854564667,0.4860000014305115,0.777999997138977,1.0360000133514404,1.0160000324249268,1.0140000581741333,1.0140000581741333,1.0140000581741333,1.0140000581741333,1.0140000581741333,1.0140000581741333,1.0140000581741333,1.0140000581741333,1.0140000581741333,1.0140000581741333,1.0119999647140503,1.0099999904632568,1.0080000162124634,1.003999948501587,0.9959999918937683,0.9259999990463257,0.7020000219345093,0.4519999921321869,0.2619999945163727,0.19599999487400055,0.1979999989271164,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19699999690055847,0.19599999487400055,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.1979999989271164,0.19699999690055847,0.19699999690055847,0.1979999989271164,0.1979999989271164,0.19699999690055847,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.1979999989271164,0.19900000095367432,0.20000000298023224,0.20100000500679016,0.21299999952316284,0.3089999854564667,0.5659999847412109,0.8690000176429749,0.824999988079071,0.8140000104904175,0.8140000104904175,0.8119999766349792,0.8119999766349792,0.8119999766349792,0.8109999895095825,0.8050000071525574,0.8029999732971191,0.8009999990463257],[0.19200000166893005,0.19200000166893005,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.1940000057220459,0.20000000298023224,0.22200000286102295,0.2759999930858612,0.3889999985694885,0.597000002861023,0.8740000128746033,1.0180000066757202,1.00600004196167,1.003999948501587,1.003999948501587,1.0019999742507935,1.0019999742507935,1.0019999742507935,1.0,1.0,0.9959999918937683,0.9959999918937683,0.9959999918937683,0.9959999918937683,0.9959999918937683,0.9959999918937683,0.9959999918937683,0.9980000257492065,0.9980000257492065,0.9959999918937683,0.9959999918937683,0.9959999918937683,0.9760000109672546,0.8230000138282776,0.5379999876022339,0.3100000023841858,0.1860000044107437,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18299999833106995,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.18400000035762787,0.1850000023841858,0.20600000023841858,0.2919999957084656,0.47999998927116394,0.7440000176429749,0.8460000157356262,0.8420000076293945,0.8420000076293945,0.8420000076293945,0.8420000076293945,0.8399999737739563,0.8379999995231628,0.8379999995231628,0.8360000252723694,0.8360000252723694,0.8360000252723694,0.8270000219345093,0.8230000138282776,0.8220000267028809,0.8220000267028809,0.8220000267028809,0.8220000267028809,0.8220000267028809],[0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.21400000154972076,0.2150000035762787,0.22499999403953552,0.289000004529953,0.45100000500679016,0.7369999885559082,1.0240000486373901,1.0809999704360962,1.0729999542236328,1.0729999542236328,1.0729999542236328,1.0729999542236328,1.0729999542236328,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.0750000476837158,1.069000005722046,1.0199999809265137,0.8050000071525574,0.4740000069141388,0.2590000033378601,0.1720000058412552,0.17100000381469727,0.17000000178813934,0.16899999976158142,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17100000381469727,0.17100000381469727,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17100000381469727,0.1720000058412552,0.17499999701976776,0.22499999403953552,0.4059999883174896,0.7400000095367432,0.8840000033378601,0.8360000252723694,0.8349999785423279,0.8349999785423279,0.8309999704360962,0.824999988079071,0.8230000138282776,0.8220000267028809,0.8180000185966492,0.8180000185966492,0.8159999847412109],[0.19599999487400055,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.19699999690055847,0.1979999989271164,0.20000000298023224,0.20800000429153442,0.22300000488758087,0.2750000059604645,0.41200000047683716,0.6679999828338623,0.9919999837875366,1.0729999542236328,1.065000057220459,1.065000057220459,1.065000057220459,1.065000057220459,1.065000057220459,1.065000057220459,1.065000057220459,1.065000057220459,1.065000057220459,1.065000057220459,1.065000057220459,1.0540000200271606,1.0499999523162842,1.0499999523162842,1.0499999523162842,1.0499999523162842,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.027999997138977,0.8289999961853027,0.5419999957084656,0.32600000500679016,0.20900000631809235,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.19900000095367432,0.19900000095367432,0.19900000095367432,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20000000298023224,0.20100000500679016,0.20100000500679016,0.20200000703334808,0.2029999941587448,0.21400000154972076,0.24699999392032623,0.335999995470047,0.527999997138977,0.8270000219345093,0.9399999976158142,0.9279999732971191,0.9259999990463257,0.9200000166893005,0.9190000295639038,0.9169999957084656,0.9150000214576721,0.9150000214576721],[0.19200000166893005,0.19200000166893005,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.19300000369548798,0.1940000057220459,0.19699999690055847,0.2070000022649765,0.21299999952316284,0.21400000154972076,0.23199999332427979,0.30799999833106995,0.47099998593330383,0.7580000162124634,1.062999963760376,1.1230000257492065,1.11899995803833,1.11899995803833,1.11899995803833,1.11899995803833,1.11899995803833,1.11899995803833,1.11899995803833,1.11899995803833,1.11899995803833,1.11899995803833,1.11899995803833,1.1139999628067017,1.1059999465942383,1.0870000123977661,1.0850000381469727,1.0850000381469727,1.0850000381469727,1.0850000381469727,1.0959999561309814,1.100000023841858,1.100000023841858,1.100000023841858,1.100000023841858,1.100000023841858,1.100000023841858,1.100000023841858,1.100000023841858,1.100000023841858,1.100000023841858,1.100000023841858,1.065000057220459,0.8880000114440918,0.5360000133514404,0.296999990940094,0.19099999964237213,0.1899999976158142,0.1899999976158142,0.1899999976158142,0.1899999976158142,0.1899999976158142,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.1940000057220459,0.21799999475479126,0.2770000100135803,0.3869999945163727,0.5479999780654907,0.7630000114440918,0.890999972820282,0.8949999809265137,0.8949999809265137,0.8949999809265137,0.8949999809265137,0.8949999809265137],[0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17499999701976776,0.17599999904632568,0.17599999904632568,0.17599999904632568,0.1770000010728836,0.17800000309944153,0.19099999964237213,0.257999986410141,0.42100000381469727,0.746999979019165,1.0750000476837158,1.062999963760376,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0520000457763672,1.0499999523162842,1.0499999523162842,1.0479999780654907,1.0360000133514404,0.9900000095367432,0.7649999856948853,0.5130000114440918,0.3109999895095825,0.20600000023841858,0.19599999487400055,0.19699999690055847,0.19699999690055847,0.19599999487400055,0.19599999487400055,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19699999690055847,0.19699999690055847,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19599999487400055,0.19699999690055847,0.19699999690055847,0.19900000095367432,0.20399999618530273,0.23199999332427979,0.33000001311302185,0.5569999814033508,0.8119999766349792,0.8420000076293945,0.8399999737739563,0.8399999737739563,0.8399999737739563,0.8379999995231628,0.8360000252723694,0.8330000042915344,0.8309999704360962,0.8309999704360962,0.8309999704360962,0.8309999704360962,0.8289999961853027,0.8289999961853027,0.8289999961853027,0.8289999961853027,0.8289999961853027,0.8289999961853027],[0.20399999618530273,0.20399999618530273,0.20399999618530273,0.20499999821186066,0.20499999821186066,0.20499999821186066,0.20600000023841858,0.20600000023841858,0.20600000023841858,0.2070000022649765,0.20900000631809235,0.20900000631809235,0.20900000631809235,0.21199999749660492,0.24199999868869781,0.3580000102519989,0.6520000100135803,1.003999948501587,1.0440000295639038,1.034000039100647,1.031999945640564,1.031999945640564,1.031999945640564,1.0299999713897705,1.0299999713897705,1.0299999713897705,1.0299999713897705,1.0299999713897705,1.0299999713897705,1.0299999713897705,1.0299999713897705,1.0299999713897705,1.0299999713897705,1.0299999713897705,1.0219999551773071,1.0099999904632568,0.8510000109672546,0.5189999938011169,0.26600000262260437,0.1720000058412552,0.1720000058412552,0.1720000058412552,0.17100000381469727,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17000000178813934,0.17100000381469727,0.17100000381469727,0.17100000381469727,0.1720000058412552,0.17100000381469727,0.1720000058412552,0.17100000381469727,0.1720000058412552,0.1720000058412552,0.17100000381469727,0.17100000381469727,0.1720000058412552,0.1720000058412552,0.1720000058412552,0.1720000058412552,0.1720000058412552,0.1720000058412552,0.1720000058412552,0.1720000058412552,0.1720000058412552,0.1720000058412552,0.1720000058412552,0.1720000058412552,0.1720000058412552,0.1720000058412552,0.1720000058412552,0.1720000058412552,0.17299999296665192,0.17499999701976776,0.21199999749660492,0.3440000116825104,0.6230000257492065,0.8629999756813049,0.8360000252723694,0.8349999785423279,0.8289999961853027,0.824999988079071,0.8230000138282776,0.8230000138282776,0.8220000267028809,0.8220000267028809,0.8220000267028809,0.8220000267028809,0.8220000267028809,0.8220000267028809,0.8220000267028809,0.8199999928474426,0.8199999928474426,0.8199999928474426,0.8220000267028809,0.8199999928474426,0.8199999928474426,0.8199999928474426],[0.1899999976158142,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19099999964237213,0.19200000166893005,0.19599999487400055,0.22699999809265137,0.3089999854564667,0.4699999988079071,0.7369999885559082,1.027999997138977,1.1330000162124634,1.121000051498413,1.11899995803833,1.11899995803833,1.11899995803833,1.11899995803833,1.11899995803833,1.11899995803833,1.1160000562667847,1.1160000562667847,1.1160000562667847,1.1160000562667847,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1119999885559082,1.1059999465942383,0.9959999918937683,0.671999990940094,0.3479999899864197,0.17299999296665192,0.14100000262260437,0.14100000262260437,0.14100000262260437,0.14100000262260437,0.14100000262260437,0.14100000262260437,0.14100000262260437,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.1420000046491623,0.15199999511241913,0.20600000023841858,0.32499998807907104,0.5600000023841858,0.8109999895095825,0.8479999899864197,0.8460000157356262,0.8460000157356262,0.8420000076293945,0.8379999995231628,0.8330000042915344,0.8309999704360962,0.8309999704360962,0.8309999704360962,0.8309999704360962,0.8309999704360962,0.8309999704360962,0.8309999704360962],[0.22100000083446503,0.22100000083446503,0.22100000083446503,0.22100000083446503,0.22200000286102295,0.22200000286102295,0.22200000286102295,0.22200000286102295,0.22300000488758087,0.23899999260902405,0.30799999833106995,0.4690000116825104,0.7630000114440918,1.0379999876022339,1.1100000143051147,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.1019999980926514,1.100000023841858,1.0959999561309814,1.0959999561309814,1.0920000076293945,1.0889999866485596,1.0360000133514404,0.8669999837875366,0.6190000176429749,0.4020000100135803,0.2540000081062317,0.22100000083446503,0.22100000083446503,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.22100000083446503,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.22100000083446503,0.22300000488758087,0.23199999332427979,0.2840000092983246,0.39500001072883606,0.6100000143051147,0.8840000033378601,0.9900000095367432,0.984000027179718,0.984000027179718,0.984000027179718,0.9819999933242798,0.9819999933242798,0.9779999852180481,0.9760000109672546,0.9739999771118164,0.972000002861023,0.972000002861023,0.972000002861023,0.9700000286102295,0.9700000286102295,0.9700000286102295,0.9679999947547913,0.9660000205039978,0.9660000205039978,0.9660000205039978,0.9660000205039978,0.9660000205039978,0.9660000205039978,0.9660000205039978,0.9660000205039978,0.9660000205039978,0.9660000205039978,0.9660000205039978,0.9660000205039978],[0.22300000488758087,0.22300000488758087,0.22300000488758087,0.22300000488758087,0.22300000488758087,0.22300000488758087,0.2240000069141388,0.2240000069141388,0.22499999403953552,0.22499999403953552,0.22599999606609344,0.25200000405311584,0.33500000834465027,0.5130000114440918,0.8309999704360962,1.0770000219345093,1.1269999742507935,1.13100004196167,1.1349999904632568,1.1349999904632568,1.1349999904632568,1.1349999904632568,1.1349999904632568,1.1369999647140503,1.1349999904632568,1.1349999904632568,1.1349999904632568,1.1349999904632568,1.1349999904632568,1.1349999904632568,1.1349999904632568,1.125,1.093999981880188,0.9620000123977661,0.7110000252723694,0.45899999141693115,0.28999999165534973,0.2199999988079071,0.2199999988079071,0.21899999678134918,0.21899999678134918,0.21899999678134918,0.21899999678134918,0.21899999678134918,0.21899999678134918,0.21899999678134918,0.21899999678134918,0.21899999678134918,0.21899999678134918,0.21899999678134918,0.21899999678134918,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.2199999988079071,0.22599999606609344,0.2720000147819519,0.42100000381469727,0.7059999704360962,0.9419999718666077,0.8970000147819519,0.8930000066757202,0.8859999775886536,0.8840000033378601,0.8820000290870667,0.8799999952316284,0.8740000128746033,0.8550000190734863,0.8270000219345093,0.824999988079071,0.824999988079071,0.824999988079071,0.824999988079071,0.824999988079071],[0.21899999678134918,0.21899999678134918,0.21899999678134918,0.21899999678134918,0.2199999988079071,0.22100000083446503,0.22200000286102295,0.22200000286102295,0.22200000286102295,0.2240000069141388,0.23999999463558197,0.29100000858306885,0.39100000262260437,0.5659999847412109,0.8180000185966492,1.0440000295639038,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0540000200271606,1.0570000410079956,1.0570000410079956,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0540000200271606,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0540000200271606,1.0499999523162842,1.0199999809265137,0.9089999794960022,0.7139999866485596,0.4659999907016754,0.29499998688697815,0.25600001215934753,0.26100000739097595,0.2759999930858612,0.36500000953674316,0.6000000238418579,0.9459999799728394,0.9739999771118164,0.9700000286102295,0.9700000286102295,0.9700000286102295,0.9700000286102295,0.9700000286102295,0.9700000286102295,0.9700000286102295,0.9700000286102295,0.9700000286102295,0.9700000286102295,0.9700000286102295,0.9700000286102295,0.9700000286102295,0.9660000205039978,0.8930000066757202,0.6449999809265137,0.3610000014305115,0.18199999630451202,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16099999845027924,0.16099999845027924,0.16099999845027924,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16200000047683716,0.16300000250339508],[0.1940000057220459,0.1940000057220459,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19599999487400055,0.1979999989271164,0.20800000429153442,0.22300000488758087,0.25600001215934753,0.3230000138282776,0.4350000023841858,0.6179999709129333,0.890999972820282,1.0609999895095825,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.059000015258789,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0570000410079956,1.0540000200271606,1.0240000486373901,0.9319999814033508,0.7559999823570251,0.5830000042915344,0.41100001335144043,0.27900001406669617,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24199999868869781,0.24199999868869781,0.24199999868869781,0.2409999966621399,0.24199999868869781,0.24199999868869781,0.24199999868869781,0.24300000071525574,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24500000476837158,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.24400000274181366,0.2460000067949295,0.24899999797344208,0.3059999942779541,0.4909999966621399,0.8379999995231628,0.9240000247955322,0.9049999713897705,0.9070000052452087,0.9070000052452087,0.9070000052452087,0.9049999713897705,0.902999997138977,0.902999997138977,0.902999997138977,0.902999997138977,0.902999997138977,0.902999997138977,0.902999997138977],[0.19200000166893005,0.19200000166893005,0.19200000166893005,0.19200000166893005,0.19200000166893005,0.19300000369548798,0.19300000369548798,0.1940000057220459,0.20000000298023224,0.2290000021457672,0.29499998688697815,0.4189999997615814,0.6340000033378601,0.9520000219345093,1.1269999742507935,1.1160000562667847,1.1160000562667847,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1160000562667847,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.1139999628067017,1.0959999561309814,0.9739999771118164,0.6729999780654907,0.4090000092983246,0.24500000476837158,0.19499999284744263,0.19499999284744263,0.1940000057220459,0.1940000057220459,0.1940000057220459,0.1940000057220459,0.1940000057220459,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.1940000057220459,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19499999284744263,0.19599999487400055,0.20100000500679016,0.2240000069141388,0.30300000309944153,0.5220000147819519,0.7850000262260437,0.7990000247955322,0.7850000262260437,0.7829999923706055,0.781000018119812,0.781000018119812,0.781000018119812,0.781000018119812,0.781000018119812,0.777999997138977,0.7699999809265137,0.7630000114440918,0.7580000162124634,0.7580000162124634,0.7580000162124634,0.7580000162124634,0.7580000162124634,0.7580000162124634,0.7580000162124634,0.7580000162124634]],"close":[191,142,123,167,202,185,119,111,139,137,120,130,158,208,179,139,188,192,186,123,170,107,245,127,140,168,156,168,162,130,118,129,147,182,139,152,163,144,157,188,213,197,153,149,191,130,140,152,182,175],"close_min":107,"close_max":245,"lclose_min":217,"lclose_max":394,"pause_speed":[0.0077,0.0031,0.0031,0.0153,0.0169,0.0199,0.0184,0.0169,0.0184,0.0215,0.0353,0.0414,0.0322,0.0199,0.0184,0.0169,0.0092,0.0169,0.0215,0.0107,0.0107,0.0077,0.0046,0.0046,0.0046,0.0061,0.0046,0.0061,0.0061,0.0046,0.0046,0.0061,0.0046,0.0031,0.0031,0.0015,0.0015,0.0015,0.0015,0.0107,0.023,0.0337,0.0383,0.0261,0.0491,0.0598,0.0583,0.0491,0.0184,0.0169,0.0184,0.0169,0.0307,0.0291,0.0184,0.0061,0.0061,0.0077,0.0061,0.0061,0.0077,0.0077,0.0077,0.0077,0.0061,0.0046,0.0031,0.0046,0.0061,0.0077,0.0061,0.0031,0.0046,0.0031,0.0061,0.0123,0.0061,0.0046,0.0046,0.0046,0.0077,0.0276,0.043,0.066,0.0752,0.0767,0.066,0.0353,0.0169,0.0245,0.0245,0.0169,0.0138,0.0092,0.0031,0.0031,0.0015,0.0031,0.0031,0.0046],"pause_speed_max":0.0553,"pause_span":[139,157],"pause_ep":43,"pause_eps":11,"pause_longest":18},"cvae":{"kl":0.0014,"mu":0.0061,"sigma":1.001,"zs":[[0.4180000126361847,0.4169999957084656,0.41499999165534973,0.4129999876022339,0.41100001335144043,0.3970000147819519,0.37599998712539673,0.3700000047683716,0.33799999952316284,0.3149999976158142,0.27000001072883606,0.2720000147819519,0.25099998712539673,0.20200000703334808,0.1589999943971634,0.13899999856948853,0.1080000028014183,0.09399999678134918,0.09399999678134918,0.0729999989271164,0.07000000029802322,0.0729999989271164,0.07400000095367432,0.07100000232458115,0.08299999684095383,0.07599999755620956,0.0860000029206276,0.09700000286102295,0.09700000286102295,0.1120000034570694,0.12399999797344208,0.14499999582767487,0.1550000011920929,0.14000000059604645,0.16099999845027924,0.17100000381469727,0.17100000381469727,0.17399999499320984,0.17599999904632568,0.17399999499320984,0.17000000178813934,0.17100000381469727,0.1720000058412552,0.16500000655651093,0.1679999977350235,0.15600000321865082,0.15600000321865082,0.15800000727176666,0.15199999511241913,0.1509999930858612,0.14900000393390656,0.14800000190734863,0.14300000667572021,0.14300000667572021,0.14000000059604645,0.13699999451637268,0.13899999856948853,0.13899999856948853,0.13600000739097595,0.14000000059604645,0.1459999978542328,0.14499999582767487,0.1509999930858612,0.14800000190734863,0.14900000393390656,0.15399999916553497,0.1550000011920929,0.1550000011920929,0.15399999916553497,0.15600000321865082,0.15800000727176666,0.15700000524520874,0.1550000011920929,0.1550000011920929,0.15600000321865082,0.15700000524520874,0.1550000011920929,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.15700000524520874,0.1589999943971634,0.1599999964237213,0.15800000727176666,0.1589999943971634,0.16099999845027924,0.1589999943971634,0.1599999964237213,0.16200000047683716,0.164000004529953,0.16099999845027924,0.16099999845027924,0.16300000250339508,0.1679999977350235,0.16300000250339508,0.16500000655651093,0.16500000655651093,0.17499999701976776,0.17100000381469727,0.17399999499320984],[0.4189999997615814,0.4180000126361847,0.41499999165534973,0.4129999876022339,0.41200000047683716,0.3970000147819519,0.37700000405311584,0.3709999918937683,0.33799999952316284,0.3149999976158142,0.27000001072883606,0.2720000147819519,0.25099998712539673,0.20100000500679016,0.15800000727176666,0.13899999856948853,0.10599999874830246,0.09300000220537186,0.09399999678134918,0.07199999690055847,0.0689999982714653,0.07199999690055847,0.0729999989271164,0.07000000029802322,0.0820000022649765,0.07500000298023224,0.08500000089406967,0.09600000083446503,0.09600000083446503,0.11100000143051147,0.12300000339746475,0.14399999380111694,0.1550000011920929,0.13899999856948853,0.16099999845027924,0.17000000178813934,0.17100000381469727,0.17399999499320984,0.17499999701976776,0.17299999296665192,0.17000000178813934,0.17000000178813934,0.17100000381469727,0.164000004529953,0.1679999977350235,0.15600000321865082,0.1550000011920929,0.15700000524520874,0.15199999511241913,0.14900000393390656,0.14900000393390656,0.1469999998807907,0.1420000046491623,0.1420000046491623,0.14000000059604645,0.13600000739097595,0.1379999965429306,0.1379999965429306,0.13600000739097595,0.14000000059604645,0.14499999582767487,0.14499999582767487,0.15000000596046448,0.14800000190734863,0.14900000393390656,0.15399999916553497,0.1550000011920929,0.15399999916553497,0.15399999916553497,0.15600000321865082,0.15800000727176666,0.15700000524520874,0.1550000011920929,0.1550000011920929,0.15600000321865082,0.15600000321865082,0.1550000011920929,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.15700000524520874,0.1589999943971634,0.1599999964237213,0.15800000727176666,0.15800000727176666,0.16099999845027924,0.1589999943971634,0.1589999943971634,0.16200000047683716,0.164000004529953,0.1599999964237213,0.16099999845027924,0.16300000250339508,0.1679999977350235,0.16300000250339508,0.16500000655651093,0.16500000655651093,0.17399999499320984,0.17100000381469727,0.17399999499320984],[0.41999998688697815,0.4189999997615814,0.41600000858306885,0.41499999165534973,0.4129999876022339,0.39899998903274536,0.3779999911785126,0.3720000088214874,0.33899998664855957,0.3160000145435333,0.2709999978542328,0.27300000190734863,0.25200000405311584,0.20200000703334808,0.1589999943971634,0.14000000059604645,0.10700000077486038,0.09399999678134918,0.09399999678134918,0.0729999989271164,0.07000000029802322,0.0729999989271164,0.0729999989271164,0.07100000232458115,0.08299999684095383,0.07500000298023224,0.08500000089406967,0.09600000083446503,0.09700000286102295,0.11100000143051147,0.12300000339746475,0.14399999380111694,0.1550000011920929,0.13899999856948853,0.16099999845027924,0.17100000381469727,0.17100000381469727,0.17399999499320984,0.17599999904632568,0.17299999296665192,0.17000000178813934,0.17000000178813934,0.1720000058412552,0.164000004529953,0.1679999977350235,0.15600000321865082,0.1550000011920929,0.15700000524520874,0.1509999930858612,0.15000000596046448,0.14900000393390656,0.1469999998807907,0.1420000046491623,0.1420000046491623,0.14000000059604645,0.13600000739097595,0.1379999965429306,0.1379999965429306,0.13500000536441803,0.14000000059604645,0.14499999582767487,0.14499999582767487,0.15000000596046448,0.14800000190734863,0.14900000393390656,0.15399999916553497,0.1550000011920929,0.15399999916553497,0.15399999916553497,0.15600000321865082,0.15700000524520874,0.15700000524520874,0.1550000011920929,0.1550000011920929,0.15600000321865082,0.15600000321865082,0.1550000011920929,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.15700000524520874,0.1589999943971634,0.1599999964237213,0.15800000727176666,0.15800000727176666,0.16099999845027924,0.1589999943971634,0.1589999943971634,0.16200000047683716,0.164000004529953,0.1599999964237213,0.16099999845027924,0.16300000250339508,0.1679999977350235,0.16300000250339508,0.16500000655651093,0.16500000655651093,0.17399999499320984,0.17100000381469727,0.17399999499320984],[0.4230000078678131,0.421999990940094,0.4189999997615814,0.4180000126361847,0.41600000858306885,0.4020000100135803,0.38100001215934753,0.375,0.34200000762939453,0.3190000057220459,0.27399998903274536,0.2759999930858612,0.2549999952316284,0.20499999821186066,0.16200000047683716,0.1420000046491623,0.10999999940395355,0.09600000083446503,0.09700000286102295,0.07500000298023224,0.07199999690055847,0.07500000298023224,0.07500000298023224,0.0729999989271164,0.08399999886751175,0.07699999958276749,0.08699999749660492,0.09799999743700027,0.09799999743700027,0.11299999803304672,0.125,0.1469999998807907,0.15700000524520874,0.14100000262260437,0.16200000047683716,0.1720000058412552,0.1720000058412552,0.17499999701976776,0.1770000010728836,0.17499999701976776,0.1720000058412552,0.1720000058412552,0.17299999296665192,0.16599999368190765,0.16899999976158142,0.15700000524520874,0.15700000524520874,0.1589999943971634,0.15299999713897705,0.15199999511241913,0.15000000596046448,0.14800000190734863,0.14399999380111694,0.14399999380111694,0.14100000262260437,0.13699999451637268,0.13899999856948853,0.13899999856948853,0.13699999451637268,0.14100000262260437,0.1459999978542328,0.1459999978542328,0.1509999930858612,0.14800000190734863,0.15000000596046448,0.1550000011920929,0.15600000321865082,0.1550000011920929,0.15399999916553497,0.15600000321865082,0.15800000727176666,0.15700000524520874,0.1550000011920929,0.1550000011920929,0.15600000321865082,0.15600000321865082,0.1550000011920929,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.15600000321865082,0.15800000727176666,0.1599999964237213,0.15800000727176666,0.15800000727176666,0.16099999845027924,0.1589999943971634,0.1589999943971634,0.16200000047683716,0.164000004529953,0.1599999964237213,0.1599999964237213,0.16200000047683716,0.1679999977350235,0.16200000047683716,0.16500000655651093,0.16500000655651093,0.17399999499320984,0.17100000381469727,0.17299999296665192],[0.4180000126361847,0.4180000126361847,0.41499999165534973,0.4129999876022339,0.41200000047683716,0.3970000147819519,0.37599998712539673,0.3709999918937683,0.33799999952316284,0.3149999976158142,0.27000001072883606,0.2720000147819519,0.25099998712539673,0.20100000500679016,0.1589999943971634,0.13899999856948853,0.10700000077486038,0.09300000220537186,0.09399999678134918,0.07199999690055847,0.0689999982714653,0.07199999690055847,0.0729999989271164,0.07000000029802322,0.0820000022649765,0.07500000298023224,0.08500000089406967,0.09600000083446503,0.09700000286102295,0.11100000143051147,0.12399999797344208,0.14399999380111694,0.1550000011920929,0.14000000059604645,0.16099999845027924,0.17100000381469727,0.17100000381469727,0.17399999499320984,0.17599999904632568,0.17299999296665192,0.17000000178813934,0.17000000178813934,0.17100000381469727,0.164000004529953,0.1679999977350235,0.15600000321865082,0.1550000011920929,0.15700000524520874,0.1509999930858612,0.14900000393390656,0.14800000190734863,0.1469999998807907,0.1420000046491623,0.1420000046491623,0.14000000059604645,0.13600000739097595,0.1379999965429306,0.1379999965429306,0.13600000739097595,0.14000000059604645,0.14499999582767487,0.14499999582767487,0.15000000596046448,0.14800000190734863,0.14900000393390656,0.15399999916553497,0.1550000011920929,0.15399999916553497,0.15399999916553497,0.15600000321865082,0.15800000727176666,0.15700000524520874,0.1550000011920929,0.1550000011920929,0.15600000321865082,0.15600000321865082,0.1550000011920929,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.1599999964237213,0.15800000727176666,0.15800000727176666,0.16099999845027924,0.1589999943971634,0.1589999943971634,0.16200000047683716,0.164000004529953,0.1599999964237213,0.16099999845027924,0.16200000047683716,0.1679999977350235,0.16300000250339508,0.16500000655651093,0.16500000655651093,0.17399999499320984,0.17100000381469727,0.17399999499320984],[0.41999998688697815,0.4189999997615814,0.4169999957084656,0.41499999165534973,0.4129999876022339,0.39899998903274536,0.3779999911785126,0.3720000088214874,0.3400000035762787,0.3160000145435333,0.2720000147819519,0.27399998903274536,0.2529999911785126,0.2029999941587448,0.1599999964237213,0.14000000059604645,0.1080000028014183,0.09399999678134918,0.0949999988079071,0.0729999989271164,0.07000000029802322,0.0729999989271164,0.0729999989271164,0.07100000232458115,0.08299999684095383,0.07500000298023224,0.0860000029206276,0.09700000286102295,0.09700000286102295,0.1120000034570694,0.12399999797344208,0.14499999582767487,0.15600000321865082,0.14000000059604645,0.16099999845027924,0.17100000381469727,0.17100000381469727,0.17399999499320984,0.17599999904632568,0.17399999499320984,0.17100000381469727,0.17100000381469727,0.1720000058412552,0.16500000655651093,0.1679999977350235,0.15600000321865082,0.15600000321865082,0.15800000727176666,0.15199999511241913,0.15000000596046448,0.14900000393390656,0.14800000190734863,0.14300000667572021,0.1420000046491623,0.14000000059604645,0.13699999451637268,0.1379999965429306,0.1379999965429306,0.13600000739097595,0.14000000059604645,0.1459999978542328,0.14499999582767487,0.15000000596046448,0.14800000190734863,0.14900000393390656,0.15399999916553497,0.1550000011920929,0.15399999916553497,0.15399999916553497,0.15600000321865082,0.15700000524520874,0.15700000524520874,0.1550000011920929,0.15399999916553497,0.15600000321865082,0.15600000321865082,0.1550000011920929,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.1599999964237213,0.15800000727176666,0.15800000727176666,0.16099999845027924,0.1589999943971634,0.1589999943971634,0.16200000047683716,0.164000004529953,0.1599999964237213,0.16099999845027924,0.16300000250339508,0.1679999977350235,0.16300000250339508,0.16500000655651093,0.16500000655651093,0.17399999499320984,0.17100000381469727,0.17399999499320984],[0.41999998688697815,0.4189999997615814,0.41600000858306885,0.41499999165534973,0.4129999876022339,0.39800000190734863,0.3779999911785126,0.3720000088214874,0.3400000035762787,0.3160000145435333,0.2709999978542328,0.27300000190734863,0.25200000405311584,0.2029999941587448,0.1589999943971634,0.14000000059604645,0.1080000028014183,0.09399999678134918,0.0949999988079071,0.0729999989271164,0.07000000029802322,0.0729999989271164,0.07400000095367432,0.07100000232458115,0.08299999684095383,0.07599999755620956,0.0860000029206276,0.09700000286102295,0.09700000286102295,0.1120000034570694,0.12399999797344208,0.14499999582767487,0.1550000011920929,0.14000000059604645,0.16099999845027924,0.17100000381469727,0.17100000381469727,0.17399999499320984,0.17599999904632568,0.17399999499320984,0.17000000178813934,0.17000000178813934,0.1720000058412552,0.16500000655651093,0.1679999977350235,0.15600000321865082,0.1550000011920929,0.15700000524520874,0.1509999930858612,0.15000000596046448,0.14900000393390656,0.1469999998807907,0.1420000046491623,0.1420000046491623,0.14000000059604645,0.13600000739097595,0.1379999965429306,0.1379999965429306,0.13600000739097595,0.14000000059604645,0.14499999582767487,0.14499999582767487,0.15000000596046448,0.14800000190734863,0.14900000393390656,0.15399999916553497,0.1550000011920929,0.15399999916553497,0.15399999916553497,0.15600000321865082,0.15700000524520874,0.15700000524520874,0.1550000011920929,0.15399999916553497,0.15600000321865082,0.15600000321865082,0.1550000011920929,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.15700000524520874,0.1589999943971634,0.1599999964237213,0.15800000727176666,0.15800000727176666,0.16099999845027924,0.1589999943971634,0.1599999964237213,0.16200000047683716,0.164000004529953,0.1599999964237213,0.16099999845027924,0.16300000250339508,0.1679999977350235,0.16300000250339508,0.16500000655651093,0.16500000655651093,0.17499999701976776,0.17100000381469727,0.17399999499320984],[0.4189999997615814,0.4180000126361847,0.41600000858306885,0.414000004529953,0.41200000047683716,0.39800000190734863,0.37700000405311584,0.3709999918937683,0.33899998664855957,0.3149999976158142,0.2709999978542328,0.27300000190734863,0.25200000405311584,0.20200000703334808,0.1589999943971634,0.14000000059604645,0.10700000077486038,0.09399999678134918,0.09399999678134918,0.0729999989271164,0.07000000029802322,0.0729999989271164,0.07400000095367432,0.07100000232458115,0.08299999684095383,0.07599999755620956,0.0860000029206276,0.09700000286102295,0.09700000286102295,0.1120000034570694,0.125,0.1459999978542328,0.15600000321865082,0.14100000262260437,0.16099999845027924,0.17100000381469727,0.17100000381469727,0.17399999499320984,0.17599999904632568,0.17399999499320984,0.17000000178813934,0.17000000178813934,0.1720000058412552,0.164000004529953,0.1679999977350235,0.15600000321865082,0.1550000011920929,0.15700000524520874,0.1509999930858612,0.14900000393390656,0.14900000393390656,0.1469999998807907,0.1420000046491623,0.1420000046491623,0.14000000059604645,0.13600000739097595,0.1379999965429306,0.1379999965429306,0.13600000739097595,0.14000000059604645,0.14499999582767487,0.14499999582767487,0.15000000596046448,0.14800000190734863,0.14900000393390656,0.15399999916553497,0.1550000011920929,0.15399999916553497,0.15299999713897705,0.15600000321865082,0.15700000524520874,0.15700000524520874,0.15399999916553497,0.15399999916553497,0.15600000321865082,0.15600000321865082,0.1550000011920929,0.15800000727176666,0.15600000321865082,0.15800000727176666,0.15600000321865082,0.15800000727176666,0.1589999943971634,0.15800000727176666,0.15800000727176666,0.16099999845027924,0.1589999943971634,0.1589999943971634,0.16200000047683716,0.164000004529953,0.1599999964237213,0.16099999845027924,0.16200000047683716,0.1679999977350235,0.16300000250339508,0.16500000655651093,0.16500000655651093,0.17399999499320984,0.17100000381469727,0.17399999499320984],[0.41999998688697815,0.4189999997615814,0.41600000858306885,0.41499999165534973,0.4129999876022339,0.39899998903274536,0.3779999911785126,0.3720000088214874,0.3400000035762787,0.31700000166893005,0.2709999978542328,0.27300000190734863,0.25200000405311584,0.20200000703334808,0.1599999964237213,0.14000000059604645,0.1080000028014183,0.09399999678134918,0.09399999678134918,0.0729999989271164,0.07000000029802322,0.0729999989271164,0.0729999989271164,0.07000000029802322,0.08299999684095383,0.07500000298023224,0.08500000089406967,0.09600000083446503,0.09700000286102295,0.11100000143051147,0.12399999797344208,0.14499999582767487,0.1550000011920929,0.14000000059604645,0.16099999845027924,0.17100000381469727,0.17100000381469727,0.17399999499320984,0.17599999904632568,0.17399999499320984,0.17100000381469727,0.17100000381469727,0.1720000058412552,0.16500000655651093,0.1679999977350235,0.15600000321865082,0.15600000321865082,0.15800000727176666,0.15199999511241913,0.15000000596046448,0.14900000393390656,0.1469999998807907,0.14300000667572021,0.1420000046491623,0.14000000059604645,0.13600000739097595,0.1379999965429306,0.1379999965429306,0.13600000739097595,0.14000000059604645,0.14499999582767487,0.14499999582767487,0.15000000596046448,0.14800000190734863,0.14900000393390656,0.15399999916553497,0.1550000011920929,0.15399999916553497,0.15399999916553497,0.15600000321865082,0.15800000727176666,0.15700000524520874,0.1550000011920929,0.1550000011920929,0.15600000321865082,0.15600000321865082,0.1550000011920929,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.15700000524520874,0.1589999943971634,0.1599999964237213,0.15800000727176666,0.15800000727176666,0.16099999845027924,0.1589999943971634,0.1589999943971634,0.16200000047683716,0.164000004529953,0.1599999964237213,0.16099999845027924,0.16300000250339508,0.1679999977350235,0.16300000250339508,0.16500000655651093,0.16500000655651093,0.17399999499320984,0.17100000381469727,0.17399999499320984],[0.4189999997615814,0.4180000126361847,0.41600000858306885,0.414000004529953,0.4129999876022339,0.39800000190734863,0.3779999911785126,0.3720000088214874,0.33899998664855957,0.3160000145435333,0.2709999978542328,0.27300000190734863,0.25200000405311584,0.20200000703334808,0.1589999943971634,0.14000000059604645,0.10700000077486038,0.09399999678134918,0.09399999678134918,0.0729999989271164,0.07000000029802322,0.07199999690055847,0.0729999989271164,0.07000000029802322,0.08299999684095383,0.07500000298023224,0.08500000089406967,0.09600000083446503,0.09600000083446503,0.11100000143051147,0.12399999797344208,0.14499999582767487,0.1550000011920929,0.14000000059604645,0.16099999845027924,0.17000000178813934,0.17100000381469727,0.17399999499320984,0.17499999701976776,0.17299999296665192,0.17000000178813934,0.17000000178813934,0.17100000381469727,0.164000004529953,0.1679999977350235,0.15600000321865082,0.1550000011920929,0.15700000524520874,0.1509999930858612,0.14900000393390656,0.14900000393390656,0.1469999998807907,0.1420000046491623,0.1420000046491623,0.14000000059604645,0.13600000739097595,0.1379999965429306,0.1379999965429306,0.13600000739097595,0.14000000059604645,0.14499999582767487,0.14499999582767487,0.15000000596046448,0.14800000190734863,0.14900000393390656,0.15299999713897705,0.1550000011920929,0.15399999916553497,0.15299999713897705,0.15600000321865082,0.15700000524520874,0.15700000524520874,0.15399999916553497,0.15399999916553497,0.15600000321865082,0.15600000321865082,0.1550000011920929,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.15600000321865082,0.15800000727176666,0.1589999943971634,0.15800000727176666,0.15800000727176666,0.16099999845027924,0.1589999943971634,0.1589999943971634,0.16099999845027924,0.164000004529953,0.1599999964237213,0.1599999964237213,0.16200000047683716,0.1679999977350235,0.16200000047683716,0.16500000655651093,0.16500000655651093,0.17399999499320984,0.17100000381469727,0.17299999296665192],[0.41999998688697815,0.4189999997615814,0.4169999957084656,0.41499999165534973,0.4129999876022339,0.39899998903274536,0.3779999911785126,0.3720000088214874,0.3400000035762787,0.3160000145435333,0.2709999978542328,0.27300000190734863,0.25200000405311584,0.20200000703334808,0.1589999943971634,0.14000000059604645,0.10700000077486038,0.09399999678134918,0.09399999678134918,0.0729999989271164,0.07000000029802322,0.0729999989271164,0.0729999989271164,0.07100000232458115,0.08299999684095383,0.07500000298023224,0.08500000089406967,0.09600000083446503,0.09700000286102295,0.11100000143051147,0.12300000339746475,0.14399999380111694,0.1550000011920929,0.13899999856948853,0.16099999845027924,0.17000000178813934,0.17000000178813934,0.17299999296665192,0.17499999701976776,0.17299999296665192,0.17000000178813934,0.17000000178813934,0.17100000381469727,0.164000004529953,0.16699999570846558,0.1550000011920929,0.1550000011920929,0.15700000524520874,0.1509999930858612,0.14900000393390656,0.14800000190734863,0.1459999978542328,0.1420000046491623,0.1420000046491623,0.13899999856948853,0.13600000739097595,0.13699999451637268,0.13699999451637268,0.13500000536441803,0.14000000059604645,0.14399999380111694,0.14499999582767487,0.14900000393390656,0.14800000190734863,0.14900000393390656,0.15299999713897705,0.1550000011920929,0.15399999916553497,0.15299999713897705,0.15600000321865082,0.15700000524520874,0.15700000524520874,0.15399999916553497,0.15399999916553497,0.15600000321865082,0.15600000321865082,0.1550000011920929,0.15800000727176666,0.15600000321865082,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.1589999943971634,0.15800000727176666,0.15800000727176666,0.16099999845027924,0.1589999943971634,0.1589999943971634,0.16200000047683716,0.164000004529953,0.1599999964237213,0.16099999845027924,0.16200000047683716,0.1679999977350235,0.16300000250339508,0.16500000655651093,0.16500000655651093,0.17399999499320984,0.17100000381469727,0.17399999499320984],[0.4189999997615814,0.4180000126361847,0.41600000858306885,0.414000004529953,0.41200000047683716,0.39800000190734863,0.37700000405311584,0.3709999918937683,0.33799999952316284,0.3149999976158142,0.27000001072883606,0.2720000147819519,0.25099998712539673,0.20100000500679016,0.1589999943971634,0.13899999856948853,0.10700000077486038,0.09300000220537186,0.09399999678134918,0.0729999989271164,0.07000000029802322,0.07199999690055847,0.0729999989271164,0.07100000232458115,0.08299999684095383,0.07500000298023224,0.08500000089406967,0.09600000083446503,0.09700000286102295,0.11100000143051147,0.12399999797344208,0.14499999582767487,0.1550000011920929,0.14000000059604645,0.16099999845027924,0.17100000381469727,0.17100000381469727,0.17399999499320984,0.17599999904632568,0.17299999296665192,0.17000000178813934,0.17000000178813934,0.1720000058412552,0.164000004529953,0.1679999977350235,0.15600000321865082,0.1550000011920929,0.15700000524520874,0.15199999511241913,0.15000000596046448,0.14900000393390656,0.1469999998807907,0.1420000046491623,0.1420000046491623,0.14000000059604645,0.13600000739097595,0.1379999965429306,0.1379999965429306,0.13600000739097595,0.14000000059604645,0.14499999582767487,0.14499999582767487,0.15000000596046448,0.14800000190734863,0.14900000393390656,0.15399999916553497,0.1550000011920929,0.15399999916553497,0.15399999916553497,0.15600000321865082,0.15700000524520874,0.15700000524520874,0.1550000011920929,0.1550000011920929,0.15600000321865082,0.15600000321865082,0.1550000011920929,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.15600000321865082,0.15800000727176666,0.1599999964237213,0.15800000727176666,0.15800000727176666,0.16099999845027924,0.1589999943971634,0.1589999943971634,0.16200000047683716,0.164000004529953,0.1599999964237213,0.16099999845027924,0.16200000047683716,0.1679999977350235,0.16200000047683716,0.16500000655651093,0.16500000655651093,0.17399999499320984,0.17100000381469727,0.17299999296665192],[0.41999998688697815,0.4189999997615814,0.4169999957084656,0.41499999165534973,0.4129999876022339,0.39899998903274536,0.3779999911785126,0.3720000088214874,0.33899998664855957,0.3160000145435333,0.2709999978542328,0.27300000190734863,0.25200000405311584,0.20200000703334808,0.1589999943971634,0.14000000059604645,0.10700000077486038,0.09399999678134918,0.09399999678134918,0.0729999989271164,0.07000000029802322,0.07199999690055847,0.0729999989271164,0.07100000232458115,0.0820000022649765,0.07500000298023224,0.08500000089406967,0.09600000083446503,0.09600000083446503,0.11100000143051147,0.12300000339746475,0.14499999582767487,0.1550000011920929,0.14000000059604645,0.16099999845027924,0.17100000381469727,0.17100000381469727,0.17399999499320984,0.17599999904632568,0.17399999499320984,0.17100000381469727,0.17100000381469727,0.1720000058412552,0.16500000655651093,0.1679999977350235,0.15600000321865082,0.15600000321865082,0.15800000727176666,0.15199999511241913,0.15000000596046448,0.14900000393390656,0.1469999998807907,0.14300000667572021,0.14300000667572021,0.14000000059604645,0.13600000739097595,0.1379999965429306,0.1379999965429306,0.13600000739097595,0.14000000059604645,0.14499999582767487,0.14499999582767487,0.14900000393390656,0.14800000190734863,0.14900000393390656,0.15299999713897705,0.1550000011920929,0.15399999916553497,0.15299999713897705,0.15600000321865082,0.15700000524520874,0.15700000524520874,0.15399999916553497,0.15399999916553497,0.15600000321865082,0.15600000321865082,0.15399999916553497,0.15800000727176666,0.15600000321865082,0.15800000727176666,0.15600000321865082,0.15800000727176666,0.1589999943971634,0.15700000524520874,0.15800000727176666,0.16099999845027924,0.1589999943971634,0.1589999943971634,0.16099999845027924,0.164000004529953,0.1599999964237213,0.1599999964237213,0.16200000047683716,0.1679999977350235,0.16200000047683716,0.16500000655651093,0.16500000655651093,0.17399999499320984,0.17100000381469727,0.17399999499320984],[0.41999998688697815,0.4189999997615814,0.4169999957084656,0.41499999165534973,0.4129999876022339,0.39899998903274536,0.3779999911785126,0.3720000088214874,0.3400000035762787,0.31700000166893005,0.2720000147819519,0.27399998903274536,0.2529999911785126,0.2029999941587448,0.1599999964237213,0.14000000059604645,0.1080000028014183,0.09399999678134918,0.09399999678134918,0.0729999989271164,0.07000000029802322,0.0729999989271164,0.0729999989271164,0.07100000232458115,0.08299999684095383,0.07500000298023224,0.08500000089406967,0.09600000083446503,0.09600000083446503,0.11100000143051147,0.12399999797344208,0.14399999380111694,0.1550000011920929,0.14000000059604645,0.16099999845027924,0.17000000178813934,0.17100000381469727,0.17399999499320984,0.17499999701976776,0.17299999296665192,0.17000000178813934,0.17000000178813934,0.17100000381469727,0.164000004529953,0.1679999977350235,0.15600000321865082,0.1550000011920929,0.15700000524520874,0.1509999930858612,0.15000000596046448,0.14900000393390656,0.1469999998807907,0.1420000046491623,0.1420000046491623,0.14000000059604645,0.13600000739097595,0.1379999965429306,0.13699999451637268,0.13500000536441803,0.14000000059604645,0.14499999582767487,0.14499999582767487,0.14900000393390656,0.14800000190734863,0.14900000393390656,0.15399999916553497,0.1550000011920929,0.15399999916553497,0.15399999916553497,0.15600000321865082,0.15700000524520874,0.15700000524520874,0.1550000011920929,0.1550000011920929,0.15600000321865082,0.15600000321865082,0.1550000011920929,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.1599999964237213,0.15800000727176666,0.15800000727176666,0.16099999845027924,0.1589999943971634,0.1589999943971634,0.16200000047683716,0.164000004529953,0.1599999964237213,0.16099999845027924,0.16300000250339508,0.1679999977350235,0.16300000250339508,0.16500000655651093,0.16500000655651093,0.17399999499320984,0.17100000381469727,0.17399999499320984],[0.41999998688697815,0.41999998688697815,0.4169999957084656,0.41499999165534973,0.414000004529953,0.39899998903274536,0.3790000081062317,0.37299999594688416,0.3400000035762787,0.31700000166893005,0.2720000147819519,0.27300000190734863,0.25200000405311584,0.20200000703334808,0.1589999943971634,0.14000000059604645,0.10700000077486038,0.09399999678134918,0.09399999678134918,0.0729999989271164,0.07000000029802322,0.07199999690055847,0.0729999989271164,0.07100000232458115,0.08299999684095383,0.07500000298023224,0.08500000089406967,0.09600000083446503,0.09600000083446503,0.11100000143051147,0.12300000339746475,0.14499999582767487,0.1550000011920929,0.13899999856948853,0.16099999845027924,0.17100000381469727,0.17100000381469727,0.17399999499320984,0.17599999904632568,0.17299999296665192,0.17000000178813934,0.17000000178813934,0.1720000058412552,0.16500000655651093,0.1679999977350235,0.15600000321865082,0.15600000321865082,0.15700000524520874,0.15199999511241913,0.15000000596046448,0.14900000393390656,0.1469999998807907,0.14300000667572021,0.1420000046491623,0.14000000059604645,0.13600000739097595,0.1379999965429306,0.1379999965429306,0.13600000739097595,0.14000000059604645,0.14499999582767487,0.14499999582767487,0.15000000596046448,0.14800000190734863,0.14900000393390656,0.15399999916553497,0.1550000011920929,0.15399999916553497,0.15399999916553497,0.15600000321865082,0.15800000727176666,0.15700000524520874,0.1550000011920929,0.1550000011920929,0.15600000321865082,0.15700000524520874,0.1550000011920929,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.15700000524520874,0.1589999943971634,0.1599999964237213,0.15800000727176666,0.1589999943971634,0.16099999845027924,0.1589999943971634,0.1599999964237213,0.16200000047683716,0.164000004529953,0.16099999845027924,0.16099999845027924,0.16300000250339508,0.16899999976158142,0.16300000250339508,0.16500000655651093,0.16500000655651093,0.17499999701976776,0.17100000381469727,0.17399999499320984],[0.421999990940094,0.42100000381469727,0.4180000126361847,0.4169999957084656,0.41499999165534973,0.4000000059604645,0.3799999952316284,0.37400001287460327,0.3409999907016754,0.3179999887943268,0.27300000190734863,0.2750000059604645,0.2540000081062317,0.20399999618530273,0.16099999845027924,0.14100000262260437,0.10899999737739563,0.0949999988079071,0.09600000083446503,0.07400000095367432,0.07100000232458115,0.07400000095367432,0.07400000095367432,0.07199999690055847,0.08299999684095383,0.07599999755620956,0.0860000029206276,0.09700000286102295,0.09700000286102295,0.1120000034570694,0.12399999797344208,0.14499999582767487,0.15600000321865082,0.14000000059604645,0.16099999845027924,0.17100000381469727,0.17100000381469727,0.17399999499320984,0.17599999904632568,0.17399999499320984,0.17100000381469727,0.17100000381469727,0.1720000058412552,0.16500000655651093,0.1679999977350235,0.15600000321865082,0.15600000321865082,0.15700000524520874,0.15199999511241913,0.15000000596046448,0.14900000393390656,0.1469999998807907,0.14300000667572021,0.14300000667572021,0.14000000059604645,0.13600000739097595,0.1379999965429306,0.1379999965429306,0.13600000739097595,0.14000000059604645,0.14499999582767487,0.14499999582767487,0.15000000596046448,0.14800000190734863,0.14900000393390656,0.15399999916553497,0.1550000011920929,0.15399999916553497,0.15299999713897705,0.1550000011920929,0.15700000524520874,0.15600000321865082,0.15399999916553497,0.15399999916553497,0.1550000011920929,0.1550000011920929,0.15399999916553497,0.15800000727176666,0.1550000011920929,0.15800000727176666,0.15600000321865082,0.15800000727176666,0.1589999943971634,0.15700000524520874,0.15800000727176666,0.1599999964237213,0.15800000727176666,0.1589999943971634,0.16099999845027924,0.16300000250339508,0.1599999964237213,0.1599999964237213,0.16200000047683716,0.16699999570846558,0.16200000047683716,0.164000004529953,0.164000004529953,0.17399999499320984,0.17000000178813934,0.17299999296665192]],"z0":[0.4189999997615814,0.4189999997615814,0.41600000858306885,0.414000004529953,0.4129999876022339,0.39800000190734863,0.3779999911785126,0.3720000088214874,0.33899998664855957,0.3160000145435333,0.2709999978542328,0.27300000190734863,0.25200000405311584,0.20200000703334808,0.1589999943971634,0.14000000059604645,0.10700000077486038,0.09399999678134918,0.09399999678134918,0.0729999989271164,0.07000000029802322,0.07199999690055847,0.0729999989271164,0.07000000029802322,0.0820000022649765,0.07500000298023224,0.08500000089406967,0.09600000083446503,0.09600000083446503,0.11100000143051147,0.12300000339746475,0.14399999380111694,0.1550000011920929,0.14000000059604645,0.16099999845027924,0.17000000178813934,0.17100000381469727,0.17399999499320984,0.17599999904632568,0.17299999296665192,0.17000000178813934,0.17000000178813934,0.17100000381469727,0.164000004529953,0.1679999977350235,0.15600000321865082,0.1550000011920929,0.15700000524520874,0.1509999930858612,0.15000000596046448,0.14900000393390656,0.1469999998807907,0.1420000046491623,0.1420000046491623,0.14000000059604645,0.13600000739097595,0.1379999965429306,0.1379999965429306,0.13600000739097595,0.14000000059604645,0.14499999582767487,0.14499999582767487,0.15000000596046448,0.14800000190734863,0.14900000393390656,0.15399999916553497,0.1550000011920929,0.15399999916553497,0.15399999916553497,0.15600000321865082,0.15700000524520874,0.15700000524520874,0.1550000011920929,0.1550000011920929,0.15600000321865082,0.15600000321865082,0.1550000011920929,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.15600000321865082,0.1589999943971634,0.1599999964237213,0.15800000727176666,0.15800000727176666,0.16099999845027924,0.1589999943971634,0.1589999943971634,0.16200000047683716,0.164000004529953,0.1599999964237213,0.16099999845027924,0.16300000250339508,0.1679999977350235,0.16300000250339508,0.16500000655651093,0.16500000655651093,0.17399999499320984,0.17100000381469727,0.17399999499320984],"zdev":0.0075,"zdev_arm":0.0045},"attn":{"ts":[0,100,150,200,260,330],"maps":[[0.259,0.27,0.271,0.271,0.268,0.264,0.26,0.256,0.25,0.246,0.241,0.239,0.236,0.233,0.232,0.23,0.229,0.227,0.229,0.224,0.246,0.254,0.259,0.256,0.251,0.247,0.244,0.241,0.237,0.232,0.227,0.223,0.22,0.217,0.216,0.214,0.213,0.212,0.213,0.21,0.224,0.233,0.232,0.23,0.223,0.22,0.219,0.217,0.213,0.207,0.203,0.202,0.2,0.197,0.196,0.195,0.195,0.195,0.193,0.192,0.2,0.207,0.206,0.196,0.2,0.197,0.2,0.199,0.188,0.17,0.159,0.168,0.178,0.18,0.179,0.18,0.18,0.182,0.18,0.175,0.18,0.185,0.178,0.175,0.176,0.176,0.178,0.173,0.152,0.131,0.121,0.134,0.159,0.161,0.163,0.158,0.168,0.169,0.168,0.162,0.163,0.166,0.162,0.162,0.163,0.162,0.163,0.155,0.128,0.089,0.081,0.091,0.112,0.097,0.095,0.109,0.146,0.159,0.158,0.152,0.151,0.155,0.146,0.128,0.122,0.132,0.145,0.138,0.128,0.111,0.087,0.062,0.037,0.036,0.044,0.053,0.072,0.132,0.151,0.148,0.118,0.077,0.32,0.555,0.534,0.416,0.023,0.122,0.126,0.111,0.044,0.2,0.284,0.416,0.443,0.521,0.555,0.456,0.0,0.095,0.068,0.121,0.462,0.499,0.523,0.531,0.402,0.055,0.118,0.085,0.355,0.69,0.766,0.776,0.653,0.68,0.679,0.541,0.402,0.162,0.108,0.253,0.447,0.464,0.496,0.493,0.389,0.054,0.119,0.175,0.332,0.516,0.666,0.639,0.484,0.626,0.682,0.632,0.547,0.416,0.108,0.082,0.149,0.395,0.506,0.472,0.256,0.084,0.126,0.179,0.551,0.712,1.0,0.736,0.473,0.528,0.51,0.45,0.379,0.172,0.151,0.151,0.149,0.142,0.122,0.108,0.145,0.158,0.155,0.121,0.166,0.42,0.236,0.111,0.135,0.139,0.139,0.146,0.156,0.156,0.155,0.158,0.162,0.162,0.166,0.166,0.165,0.165,0.163,0.162,0.162,0.161,0.161,0.159,0.159,0.159,0.159,0.156,0.158,0.156,0.156,0.163,0.17,0.17,0.172,0.169,0.169,0.168,0.166,0.165,0.163,0.163,0.162,0.161,0.161,0.159,0.159,0.158,0.158,0.156,0.159,0.165,0.17,0.172,0.17,0.169,0.168,0.166,0.163,0.162,0.161,0.161,0.159,0.159,0.159,0.158,0.158,0.158,0.156,0.156],[0.184,0.189,0.19,0.19,0.189,0.188,0.184,0.182,0.178,0.175,0.171,0.169,0.167,0.164,0.163,0.162,0.162,0.162,0.164,0.166,0.176,0.181,0.183,0.183,0.182,0.181,0.177,0.175,0.171,0.168,0.164,0.162,0.159,0.157,0.156,0.156,0.155,0.155,0.157,0.159,0.168,0.171,0.171,0.171,0.169,0.168,0.166,0.163,0.16,0.156,0.153,0.149,0.148,0.147,0.146,0.146,0.146,0.146,0.148,0.149,0.159,0.162,0.162,0.16,0.16,0.16,0.159,0.156,0.153,0.149,0.146,0.141,0.14,0.14,0.14,0.14,0.14,0.14,0.142,0.142,0.15,0.153,0.152,0.15,0.149,0.149,0.148,0.146,0.145,0.141,0.135,0.134,0.133,0.133,0.133,0.133,0.134,0.134,0.135,0.136,0.142,0.145,0.145,0.142,0.141,0.142,0.14,0.138,0.136,0.134,0.127,0.121,0.124,0.125,0.125,0.126,0.128,0.129,0.131,0.131,0.138,0.139,0.139,0.132,0.119,0.126,0.132,0.132,0.131,0.127,0.113,0.089,0.087,0.084,0.094,0.091,0.107,0.124,0.127,0.127,0.125,0.106,0.009,0.274,0.317,0.275,0.012,0.119,0.127,0.115,0.064,0.386,0.471,0.439,0.196,0.235,0.263,0.246,0.013,0.112,0.101,0.021,0.132,0.282,0.354,0.341,0.22,0.036,0.126,0.131,0.612,0.734,0.89,0.74,0.505,0.315,0.297,0.274,0.189,0.0,0.096,0.03,0.146,0.265,0.329,0.343,0.247,0.014,0.125,0.21,0.547,0.664,0.921,1.0,0.749,0.397,0.353,0.334,0.251,0.016,0.131,0.118,0.029,0.169,0.286,0.307,0.132,0.065,0.127,0.112,0.513,0.605,0.909,0.959,0.718,0.336,0.274,0.23,0.138,0.056,0.139,0.14,0.138,0.133,0.12,0.096,0.119,0.134,0.135,0.131,0.068,0.177,0.234,0.061,0.115,0.119,0.117,0.118,0.124,0.128,0.14,0.141,0.142,0.142,0.145,0.145,0.142,0.141,0.139,0.136,0.135,0.133,0.132,0.131,0.128,0.128,0.128,0.128,0.129,0.132,0.142,0.145,0.147,0.147,0.147,0.146,0.145,0.142,0.14,0.138,0.135,0.134,0.132,0.131,0.129,0.129,0.129,0.129,0.131,0.133,0.143,0.146,0.148,0.148,0.148,0.147,0.146,0.143,0.141,0.139,0.136,0.134,0.133,0.131,0.131,0.129,0.129,0.131,0.132,0.133],[0.132,0.136,0.136,0.136,0.135,0.132,0.129,0.125,0.122,0.119,0.115,0.112,0.108,0.106,0.104,0.102,0.101,0.101,0.102,0.104,0.124,0.128,0.129,0.128,0.125,0.124,0.121,0.119,0.115,0.112,0.108,0.105,0.101,0.099,0.097,0.097,0.096,0.094,0.097,0.097,0.117,0.12,0.12,0.119,0.115,0.113,0.112,0.108,0.105,0.1,0.097,0.093,0.091,0.09,0.089,0.087,0.087,0.087,0.087,0.089,0.108,0.11,0.109,0.105,0.105,0.105,0.105,0.101,0.098,0.092,0.089,0.085,0.083,0.084,0.083,0.083,0.082,0.082,0.083,0.082,0.1,0.101,0.099,0.097,0.094,0.096,0.096,0.093,0.09,0.082,0.075,0.076,0.076,0.076,0.076,0.075,0.076,0.075,0.076,0.076,0.092,0.093,0.092,0.09,0.085,0.086,0.086,0.084,0.081,0.075,0.068,0.066,0.063,0.066,0.067,0.068,0.069,0.069,0.07,0.07,0.085,0.089,0.085,0.071,0.055,0.067,0.078,0.077,0.075,0.062,0.046,0.028,0.032,0.018,0.016,0.012,0.03,0.058,0.066,0.066,0.07,0.035,0.16,0.282,0.311,0.295,0.052,0.059,0.069,0.045,0.09,0.442,0.586,0.541,0.344,0.214,0.207,0.191,0.024,0.047,0.024,0.139,0.216,0.312,0.357,0.365,0.299,0.013,0.063,0.23,0.605,0.712,0.834,0.734,0.529,0.308,0.275,0.292,0.316,0.227,0.023,0.175,0.243,0.284,0.348,0.403,0.365,0.119,0.058,0.239,0.635,0.796,0.963,0.88,0.625,0.352,0.325,0.337,0.369,0.329,0.061,0.04,0.115,0.252,0.333,0.391,0.315,0.001,0.061,0.189,0.632,0.819,1.0,0.858,0.614,0.323,0.323,0.33,0.371,0.336,0.077,0.079,0.077,0.075,0.064,0.029,0.049,0.068,0.07,0.053,0.277,0.524,0.593,0.333,0.013,0.04,0.032,0.0,0.043,0.023,0.078,0.079,0.081,0.081,0.081,0.081,0.078,0.076,0.072,0.069,0.066,0.062,0.061,0.06,0.06,0.059,0.059,0.056,0.056,0.056,0.079,0.082,0.084,0.084,0.083,0.081,0.078,0.076,0.074,0.07,0.068,0.064,0.063,0.061,0.06,0.059,0.059,0.058,0.058,0.059,0.082,0.084,0.084,0.084,0.083,0.081,0.078,0.076,0.072,0.07,0.067,0.064,0.062,0.061,0.06,0.059,0.059,0.059,0.059,0.06],[0.195,0.212,0.21,0.211,0.209,0.206,0.202,0.199,0.195,0.19,0.186,0.183,0.178,0.174,0.172,0.168,0.167,0.164,0.168,0.163,0.18,0.193,0.19,0.193,0.188,0.188,0.186,0.183,0.179,0.174,0.167,0.16,0.156,0.154,0.153,0.154,0.152,0.147,0.154,0.148,0.167,0.173,0.169,0.17,0.164,0.165,0.165,0.157,0.144,0.14,0.141,0.135,0.131,0.131,0.131,0.131,0.132,0.132,0.133,0.131,0.151,0.158,0.153,0.148,0.149,0.151,0.143,0.093,0.059,0.054,0.049,0.058,0.09,0.115,0.123,0.127,0.128,0.127,0.127,0.119,0.138,0.142,0.138,0.131,0.128,0.127,0.062,0.022,0.005,0.019,0.023,0.049,0.09,0.11,0.115,0.116,0.117,0.116,0.119,0.11,0.126,0.128,0.131,0.133,0.123,0.112,0.028,0.012,0.0,0.017,0.02,0.028,0.056,0.089,0.11,0.11,0.109,0.105,0.11,0.104,0.115,0.117,0.12,0.115,0.098,0.06,0.038,0.021,0.027,0.046,0.035,0.057,0.062,0.038,0.041,0.036,0.058,0.094,0.104,0.1,0.044,0.04,0.044,0.09,0.122,0.177,0.132,0.048,0.081,0.1,0.08,0.179,0.309,0.4,0.578,0.801,0.743,0.567,0.114,0.022,0.093,0.186,0.275,0.406,0.456,0.562,0.449,0.205,0.075,0.179,0.332,0.388,0.447,0.69,0.919,1.0,0.912,0.731,0.451,0.189,0.158,0.235,0.319,0.402,0.516,0.609,0.499,0.315,0.101,0.238,0.32,0.37,0.48,0.651,0.967,0.973,0.901,0.691,0.538,0.275,0.091,0.094,0.172,0.362,0.504,0.604,0.468,0.231,0.074,0.219,0.299,0.321,0.405,0.577,0.917,0.868,0.685,0.522,0.419,0.226,0.123,0.13,0.125,0.116,0.105,0.12,0.109,0.126,0.117,0.094,0.143,0.235,0.265,0.149,0.102,0.099,0.1,0.078,0.084,0.09,0.123,0.127,0.133,0.135,0.138,0.136,0.136,0.133,0.13,0.126,0.127,0.125,0.122,0.121,0.117,0.115,0.114,0.11,0.107,0.104,0.126,0.135,0.142,0.143,0.143,0.138,0.136,0.135,0.132,0.13,0.126,0.122,0.12,0.119,0.116,0.114,0.114,0.111,0.106,0.105,0.125,0.136,0.138,0.14,0.138,0.136,0.133,0.131,0.128,0.126,0.122,0.12,0.117,0.114,0.112,0.11,0.11,0.107,0.107,0.105],[0.228,0.239,0.239,0.238,0.236,0.23,0.225,0.22,0.215,0.21,0.205,0.201,0.197,0.195,0.193,0.191,0.19,0.188,0.188,0.188,0.207,0.22,0.224,0.222,0.215,0.21,0.205,0.201,0.196,0.19,0.184,0.181,0.179,0.178,0.178,0.177,0.175,0.173,0.174,0.17,0.192,0.204,0.196,0.193,0.187,0.186,0.182,0.173,0.161,0.16,0.152,0.154,0.155,0.157,0.156,0.155,0.156,0.155,0.156,0.152,0.173,0.183,0.179,0.175,0.165,0.155,0.15,0.141,0.136,0.132,0.131,0.129,0.137,0.145,0.147,0.147,0.15,0.149,0.146,0.138,0.159,0.166,0.16,0.154,0.138,0.141,0.14,0.129,0.127,0.12,0.114,0.122,0.123,0.128,0.133,0.134,0.137,0.134,0.136,0.128,0.145,0.152,0.15,0.15,0.134,0.128,0.125,0.115,0.117,0.11,0.101,0.109,0.115,0.117,0.119,0.123,0.125,0.125,0.127,0.12,0.128,0.131,0.122,0.108,0.113,0.11,0.104,0.091,0.081,0.088,0.067,0.06,0.06,0.081,0.082,0.081,0.095,0.11,0.118,0.114,0.601,0.685,0.602,0.489,0.356,0.323,0.383,0.442,0.419,0.385,0.654,0.703,0.781,0.759,0.714,0.604,0.561,0.464,0.006,0.067,0.802,0.821,0.673,0.581,0.562,0.607,0.608,0.547,0.557,0.589,0.745,0.817,0.921,0.889,0.83,0.72,0.656,0.58,0.513,0.337,0.818,0.808,0.663,0.585,0.592,0.653,0.656,0.631,0.639,0.668,0.85,0.877,0.974,0.872,0.795,0.68,0.618,0.504,0.464,0.338,0.746,0.726,0.608,0.528,0.635,0.711,0.686,0.665,0.697,0.729,0.892,0.896,1.0,0.898,0.844,0.757,0.627,0.369,0.255,0.172,0.629,0.594,0.0,0.069,0.096,0.086,0.077,0.06,0.026,0.472,0.668,0.494,0.072,0.088,0.086,0.073,0.082,0.093,0.095,0.096,0.036,0.051,0.125,0.134,0.136,0.133,0.131,0.131,0.132,0.134,0.134,0.132,0.127,0.127,0.125,0.123,0.12,0.118,0.117,0.115,0.125,0.128,0.142,0.141,0.14,0.133,0.132,0.128,0.127,0.125,0.123,0.122,0.122,0.12,0.119,0.118,0.119,0.117,0.114,0.114,0.132,0.136,0.14,0.138,0.136,0.133,0.129,0.127,0.125,0.123,0.12,0.119,0.118,0.118,0.118,0.117,0.117,0.117,0.115,0.114],[0.206,0.232,0.228,0.227,0.224,0.22,0.218,0.214,0.212,0.211,0.21,0.208,0.208,0.207,0.206,0.207,0.207,0.206,0.207,0.203,0.198,0.223,0.224,0.219,0.207,0.203,0.201,0.197,0.194,0.19,0.185,0.182,0.189,0.193,0.197,0.201,0.202,0.199,0.202,0.19,0.186,0.203,0.189,0.182,0.172,0.172,0.172,0.165,0.153,0.148,0.145,0.149,0.158,0.17,0.173,0.174,0.175,0.177,0.179,0.172,0.166,0.187,0.179,0.17,0.149,0.136,0.14,0.139,0.135,0.125,0.124,0.129,0.136,0.157,0.164,0.17,0.178,0.175,0.175,0.16,0.154,0.17,0.157,0.142,0.125,0.117,0.111,0.106,0.113,0.112,0.108,0.119,0.127,0.14,0.153,0.156,0.162,0.164,0.164,0.15,0.139,0.152,0.142,0.137,0.116,0.099,0.092,0.096,0.106,0.1,0.1,0.109,0.107,0.119,0.128,0.131,0.141,0.146,0.149,0.14,0.117,0.125,0.102,0.086,0.082,0.07,0.069,0.057,0.03,0.005,0.008,0.025,0.026,0.02,0.017,0.037,0.078,0.116,0.132,0.127,0.475,0.675,0.695,0.609,0.433,0.215,0.369,0.661,0.794,0.835,0.805,0.689,0.732,0.823,0.826,0.752,0.72,0.708,0.674,0.222,0.855,0.867,0.784,0.768,0.76,0.727,0.732,0.802,0.847,0.856,0.807,0.699,0.916,1.0,0.955,0.836,0.757,0.772,0.871,0.861,0.914,0.889,0.747,0.735,0.752,0.734,0.781,0.873,0.889,0.891,0.796,0.604,0.77,0.959,0.925,0.814,0.731,0.735,0.901,0.894,0.852,0.826,0.637,0.578,0.784,0.768,0.825,0.939,0.988,0.937,0.9,0.33,0.464,0.93,0.922,0.759,0.656,0.646,0.764,0.734,0.466,0.406,0.0,0.049,0.051,0.025,0.107,0.439,0.645,0.455,0.058,0.058,0.074,0.065,0.07,0.074,0.091,0.077,0.037,0.034,0.029,0.053,0.095,0.1,0.107,0.102,0.106,0.107,0.108,0.108,0.108,0.108,0.109,0.111,0.112,0.116,0.119,0.115,0.116,0.113,0.084,0.091,0.108,0.109,0.112,0.106,0.106,0.106,0.107,0.109,0.112,0.113,0.116,0.117,0.12,0.121,0.124,0.119,0.109,0.108,0.092,0.103,0.108,0.108,0.108,0.106,0.106,0.106,0.107,0.109,0.111,0.113,0.116,0.117,0.12,0.12,0.123,0.121,0.117,0.113]],"img":[0.9957,0.9965,0.9977,0.9966,0.9967,0.9954],"q":[0.0025,0.0018,0.0012,0.002,0.0018,0.0028],"z":[0.0017,0.0018,0.0011,0.0014,0.0016,0.0017]}}/*/REPRO*/;
  // ─── 讲解动画：十七幕 ───────────────────────────────────────────────────────
  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    paint = K.paint,
    seg = K.seg,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
    polyPath = K.polyPath;
  /* 视频里分镜按 1080 宽、约 1.2 倍放大，9–10.5 号字只有 11–12 px，手机上看不清（FALCON 2026-10-25 看片反馈）：
     9–9.5 号放到 11，10–10.5 号放到 11.5 */
  function minFont(size) {
    return size == null ? size : size < 9.75 ? Math.max(size, 11) : size < 11 ? Math.max(size, 11.5) : size;
  }
  var kitText = svgText, kitRich = svgRich;
  svgText = function (x, y, str, cls, size, anchor) { return kitText(x, y, str, cls, minFont(size), anchor); };
  svgRich = function (x, y, str, opts) {
    var o = {}, k;
    for (k in opts || {}) o[k] = opts[k];
    o.size = minFont(o.size);
    return kitRich(x, y, str, o);
  };

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_PURPLE = X.purple,
    C_MUTED = X.muted,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2,
    C_INK = X.ink,
    C_INK2 = X.ink2;
  /* 全片配色：主臂（leader）黄、从臂（follower）蓝；动作块按先后轮流用蓝 / 粉紫 / 黄 / 绿；时间集成的结果绿；
     人的示范粉紫、脚本示范蓝；方法：ACT 绿、BC-ConvMLP 灰、BeT 蓝、RT-1 粉紫、VINN 黄。
     图 6 的重画照论文的配色：(a) ACT 蓝线、BC-ConvMLP 绿线、VINN 灰线；(b)(c) 不加 / 加的一组蓝、绿 */
  var C_LEAD = C_WARN, C_FOLL = C_ACCENT, C_HUMAN = C_PURPLE, C_SCRIPT = C_ACCENT, C_ENS = C_GOOD;
  var CHUNK_COLORS = [C_ACCENT, C_PURPLE, C_WARN, C_GOOD];
  var METHOD_COLORS = { act: C_GOOD, bc: C_MUTED, bet: C_ACCENT, rt1: C_PURPLE, vinn: C_WARN };
  /* 视频里一幕要讲一分钟左右，画面不能停：draw(t, clock) 的 clock 是这一幕的真实时间
     （旁白比分镜长时 t 停在一段的末尾，clock 照走），循环的动作按 clock 播；网页播放器只传 t。
     各幕的 cue 时刻都落在 0.4 / 3.6 / 7.0 / 10.4 / 13.4，一次性的出场动画不跨过这些时刻。 */
  function nowOf(t, clock) {
    return clock == null ? t : clock;
  }
  /* 一段窗口：a 之后 0.3 s 起淡入 0.4 s，到 b 才开始淡出 0.3 s（AGENTS.md「面板到 cue 之后才淡出」） */
  function win(t, a, b) {
    return seg(t, a + 0.3, a + 0.7) * (b == null ? 1 : 1 - seg(t, b, b + 0.3));
  }
  /* 一幕里从 cue 起算的秒数：网页上就是 t − cue；视频里按时间线算 cue 那一刻起过了多久（K.clipSince）。
     不能用 clock − cue：clock 从这一幕开头算，前面几段旁白比分镜长时，到 cue 那一刻 clock 早已大于 cue（HOMIE 2026-10-22） */
  function since(t, clock, cue) {
    return clock == null ? t - cue : Math.max(0, K.clipSince(t, cue));
  }
  function group(parent) {
    var g = svgEl('g', {});
    parent.appendChild(g);
    return g;
  }
  function rectBox(parent, x, y, w, h, stroke, fill, dash) {
    var r = paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 7, 'stroke-width': 1.3 }), fill || C_SURFACE, stroke || C_BORDER);
    if (dash) r.setAttribute('stroke-dasharray', dash);
    parent.appendChild(r);
    return r;
  }
  function chip(parent, x, y, w, str, color, opts) {
    var o = opts || {};
    var g = group(parent), h = o.h || 28;
    rectBox(g, x, y, w, h, color, o.fill || C_SURFACE, o.dash);
    g.appendChild(svgRich(x + (o.left ? 10 : w / 2), y + h / 2 + 4, str, { size: o.size || 11.5, anchor: o.left ? 'start' : 'middle', w: w - 12, cls: o.cls || 'demo-x-ink2' }));
    return g;
  }
  function fmtPath(pts2) {
    return pts2.length ? polyPath(pts2.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })) : 'M 0 0';
  }
  function pathLine(parent, pts2, color, width, dash) {
    var p = paint(svgEl('path', { d: fmtPath(pts2), fill: 'none', 'stroke-width': width || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }), null, color);
    if (dash) p.setAttribute('stroke-dasharray', dash);
    parent.appendChild(p);
    return p;
  }
  function setPath(p, pts2) {
    p.setAttribute('d', fmtPath(pts2));
  }
  function dotAt(parent, cx, cy, r, color) {
    var c = paint(svgEl('circle', { cx: cx, cy: cy, r: r }), color);
    parent.appendChild(c);
    return c;
  }
  function ringAt(parent, cx, cy, r, color, w) {
    var c = paint(svgEl('circle', { cx: cx, cy: cy, r: r, fill: 'none', 'stroke-width': w || 2 }), null, color);
    parent.appendChild(c);
    return c;
  }
  function moveDot(c, p) {
    c.setAttribute('cx', p[0].toFixed(1));
    c.setAttribute('cy', p[1].toFixed(1));
  }
  function hline(parent, x1, y1, x2, y2, color, w, dash) {
    var l = paint(svgEl('line', { x1: x1, y1: y1, x2: x2, y2: y2, 'stroke-width': w || 1.2 }), null, color);
    if (dash) l.setAttribute('stroke-dasharray', dash);
    parent.appendChild(l);
    return l;
  }
  function setLine(l, x1, y1, x2, y2) {
    l.setAttribute('x1', x1.toFixed(1)); l.setAttribute('y1', y1.toFixed(1));
    l.setAttribute('x2', x2.toFixed(1)); l.setAttribute('y2', y2.toFixed(1));
  }
  function hbar(parent, x, y, h, color, opacity) {
    var r = paint(svgEl('rect', { x: x, y: y, width: 0, height: h, rx: 2.5, opacity: opacity == null ? 0.9 : opacity }), color);
    parent.appendChild(r);
    return r;
  }
  function vbar(parent, x, w, color) {
    var r = paint(svgEl('rect', { x: x, y: 0, width: w, height: 0, rx: 2 }), color);
    parent.appendChild(r);
    return {
      node: r,
      set: function (yBase, h) { r.setAttribute('y', (yBase - Math.max(0, h)).toFixed(1)); r.setAttribute('height', Math.max(0, h).toFixed(1)); }
    };
  }
  function setW(node, w) {
    node.setAttribute('width', Math.max(0, w).toFixed(1));
  }
  function label(parent, x, y, str, cls, size, anchor) {
    var n = svgText(x, y, str, cls || 'demo-x-ink2', size || 11, anchor);
    parent.appendChild(n);
    return n;
  }
  function tone(parent, x, y, str, color, size, anchor) {
    var n = paint(svgText(x, y, str, null, size || 11, anchor), color);
    parent.appendChild(n);
    return n;
  }
  function rich(parent, x, y, str, size, cls, anchor, w) {
    var n = svgRich(x, y, str, { size: size || 12, cls: cls || 'demo-x-ink2', anchor: anchor || 'start', w: w });
    parent.appendChild(n);
    return n;
  }
  function math(parent, x, y, tex, size, anchor) {
    var n = svgMath(x, y, tex, { size: size || 14, anchor: anchor || 'start' });
    parent.appendChild(n);
    return n;
  }
  function arrowHead(parent, color) {
    var p = paint(svgEl('path', { d: 'M 0 0', 'stroke-width': 0 }), color);
    parent.appendChild(p);
    return {
      node: p,
      set: function (x1, y1, x2, y2, size) {
        var a = Math.atan2(y2 - y1, x2 - x1), s = size || 8;
        var p1 = [x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45)], p2 = [x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)];
        p.setAttribute('d', 'M ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' L ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' L ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + ' Z');
      }
    };
  }
  /* 一支箭：线 + 箭头 */
  function arrow(parent, color, width, dash) {
    var g = group(parent), l = hline(g, 0, 0, 0, 0, color, width || 2.4, dash), h = arrowHead(g, color);
    return {
      g: g,
      set: function (x1, y1, x2, y2, size) { setLine(l, x1, y1, x2, y2); h.set(x1, y1, x2, y2, size || 9); }
    };
  }
  /* 论文图的一块：图片 imgW × imgH 像素，按比例裁出 (u0, v0)–(u1, v1)，宽度为 w（高按比例）摆到 (x, y)，白底；返回实际高 */
  function figPart(parent, file, imgW, imgH, u0, v0, u1, v1, x, y, w, caption) {
    var g = group(parent), cw = (u1 - u0) * imgW, chh = (v1 - v0) * imgH, h = w * chh / cw;
    g.appendChild(svgEl('rect', { x: (x - 3).toFixed(1), y: (y - 3).toFixed(1), width: (w + 6).toFixed(1), height: (h + 6).toFixed(1), rx: 5, fill: '#ffffff', stroke: 'none' }));
    var box = svgEl('svg', { x: x.toFixed(1), y: y.toFixed(1), width: w.toFixed(1), height: h.toFixed(1), overflow: 'hidden', preserveAspectRatio: 'none',
      viewBox: [(u0 * imgW).toFixed(1), (v0 * imgH).toFixed(1), cw.toFixed(1), chh.toFixed(1)].join(' ') });
    box.appendChild(svgEl('image', { href: PAPER_IMG_BASE + file, x: 0, y: 0, width: imgW, height: imgH, preserveAspectRatio: 'none' }));
    g.appendChild(box);
    if (caption) g.appendChild(svgText(x + w / 2, y + h + 17, caption, 'demo-x-mut', 9.5, 'middle'));
    return { g: g, h: h, x: x, y: y, w: w };
  }
  function paperPart(parent, key, u0, v0, u1, v1, x, y, w, caption) {
    var F = FIGS[key];
    return figPart(parent, F[0], F[1], F[2], u0, v0, u1, v1, x, y, w, caption);
  }
  /* 项目页的一段视频：深色底框，下面一行小字写出处；draw 里调 .at(秒, 是否可见) */
  function projClip(parent, id, x, y, w, h, caption, opts) {
    var o = opts || {}, g = group(parent);
    g.appendChild(svgEl('rect', { x: (x - 2).toFixed(1), y: (y - 2).toFixed(1), width: (w + 4).toFixed(1), height: (h + 4).toFixed(1), rx: 5, fill: '#111111', stroke: 'none' }));
    var c = K.svgClip(x, y, w, h, CLIP_BASE + id + '.mp4', { poster: CLIP_BASE + id + '.webp' });
    g.appendChild(c);
    if (caption) label(g, o.capX == null ? x + w / 2 : o.capX, y + h + (o.capDy || 15), caption, o.capCls || 'demo-x-mut', o.capSize || 9.5, o.capAnchor || 'middle');
    return { g: g, x: x, y: y, w: w, h: h, at: function (sec, vis) { c.at(sec, vis); } };
  }
  function f1(x) { return fmt(x, 1); }
  function f2(x) { return fmt(x, 2); }
  function f3(x) { return fmt(x, 3); }
  /* 排版用的负号 */
  function sgn(s) { return String(s).replace(/-/g, '−'); }
  /* 横向条形图的一行：标签、条、数字 */
  function barRowAt(parent, x, y, labelW, str, color, h, size) {
    var g = group(parent);
    label(g, x + labelW - 8, y + (h || 14) / 2 + 4, str, 'demo-x-ink2', size || 10.5, 'end');
    var b = hbar(g, x + labelW, y, h || 14, color);
    var v = label(g, x + labelW + 6, y + (h || 14) / 2 + 4, '', 'demo-x-ink', size || 10.5);
    return {
      g: g, bar: b,
      set: function (w, txt) { setW(b, w); v.setAttribute('x', (x + labelW + Math.max(0, w) + 6).toFixed(1)); v.textContent = txt; }
    };
  }
  function legendRow(parent, x, y, items, size) {
    var g = group(parent), cx = x;
    items.forEach(function (it) {
      g.appendChild(paint(svgEl('rect', { x: cx, y: y - 8, width: 12, height: 10, rx: 2 }), it[1]));
      var t = label(g, cx + 16, y, it[0], 'demo-x-ink2', size || 10.5);
      cx += 16 + (it[2] || it[0].length * (size || 10.5) * 0.95) + 16;
      void t;
    });
    return g;
  }
  /* 曲线的图例：画成和曲线同样线型的短线段；items = [[名字, 颜色, 虚线, 字宽]] */
  function lineLegend(parent, x, y, items, size) {
    var g = group(parent), cx = x;
    items.forEach(function (it) {
      hline(g, cx, y - 4, cx + 20, y - 4, it[1], 2.4, it[2] || null);
      label(g, cx + 26, y, it[0], 'demo-x-ink2', size || 11);
      cx += 26 + (it[3] || textW(it[0], size || 11)) + 18;
    });
    return g;
  }
  /* 折线图：在 (x, y, w, h) 的框里画 xs→ys，返回 { put(arr, color) } */
  function plotBox(parent, x, y, w, h, x0, x1, y0, y1) {
    var g = group(parent);
    rectBox(g, x, y, w, h, C_BORDER, C_SURFACE);
    function px(v) { return x + (v - x0) / (x1 - x0) * w; }
    function py(v) { return y + h - (v - y0) / (y1 - y0) * h; }
    return { g: g, px: px, py: py, line: function (arr, dt, color, width, dash, upto) {
      var pts = [];
      for (var i = 0; i < arr.length; i++) { var tt = i * dt; if (upto != null && tt > upto) break; pts.push([px(tt), py(arr[i])]); }
      return pathLine(g, pts, color, width || 1.8, dash);
    } };
  }
  /* 片段按顺序放几段：parts = [[秒, 名称]]，seqAt(片段内秒) 标出放到第几段 */
  function seqClip(parent, id, x, y, w, h, caption, parts) {
    var g = group(parent), total = 0, last = -1;
    parts.forEach(function (p) { total += p[0]; });
    var c = projClip(g, id, x, y, w, h, caption, { capDy: 48 });
    var acc = 0, starts = [], bars = parts.map(function (p) {
      starts.push(acc);
      var r = paint(svgEl('rect', { x: (x + acc / total * w).toFixed(1), y: (y + h + 7).toFixed(1), width: (p[0] / total * w - 4).toFixed(1), height: 5, rx: 2.5 }), C_ACCENT);
      acc += p[0];
      g.appendChild(r);
      return r;
    });
    var name = label(g, x, y + h + 27, '', 'demo-x-ink', 12.5);
    return {
      g: g, starts: starts, parts: parts,
      at: function (sec, vis) {
        sec = Math.max(0, sec);
        c.at(sec, vis);
        var m = ((sec % total) + total) % total, idx = 0, a = 0;
        parts.forEach(function (p, i) { if (m >= a) idx = i; a += p[0]; });
        if (idx === last) return;
        last = idx;
        bars.forEach(function (r, i) { r.style.opacity = i === idx ? 1 : 0.25; });
        name.textContent = (idx + 1) + ' / ' + parts.length + '　' + parts[idx][1];
      }
    };
  }

  /* ── 动效小部件：少写字，多让东西动起来 ── */
  /* 压在网格线、折线上的字描一圈底色 */
  function halo(n) {
    n.style.paintOrder = 'stroke'; n.style.stroke = C_SURFACE; n.style.strokeWidth = '3px'; n.style.strokeLinejoin = 'round';
    return n;
  }
  /* 一行读法：横轴、纵轴、颜色、越大还是越小越好 */
  function readHint(parent, x, y, str, size, w) {
    return rich(parent, x, y, '**读法**　' + str, size || 10.5, 'demo-x-ink2', 'start', w);
  }
  /* 一段流向：一条虚线，几颗小点沿着走；at(秒, 起点, 终点, 是否可见)。起点终点都放在框外，小点不从字上划过 */
  function flowSeg(parent, color, n, r, speed, noLine) {
    var g = group(parent), ln = noLine ? null : hline(g, 0, 0, 0, 0, color, 1.2, '3 4'), dots = [];
    for (var j = 0; j < (n || 3); j++) dots.push(dotAt(g, 0, 0, r || 3.4, color));
    return {
      g: g,
      at: function (sec, a, b, vis) {
        if (ln) setLine(ln, a[0], a[1], b[0], b[1]);
        var tot = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]));
        dots.forEach(function (c, j) {
          var d = (((sec * (speed || 60) + j * tot / dots.length) % tot) + tot) % tot, u = d / tot;
          moveDot(c, [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
          c.style.opacity = vis === false ? 0 : Math.min(1, Math.min(d, tot - d) / 8);
        });
      }
    };
  }
  /* 勾与叉 */
  function tick(parent, x, y, s, color) {
    var p = paint(svgEl('path', { d: 'M' + x + ' ' + (y + s * 0.5) + ' l' + s * 0.35 + ' ' + s * 0.38 + ' l' + s * 0.65 + ' ' + (-s * 0.8), fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }), null, color || C_GOOD);
    parent.appendChild(p);
    return p;
  }
  function cross(parent, x, y, s, color) {
    var p = paint(svgEl('path', { d: 'M' + x + ' ' + y + ' l' + s + ' ' + s + ' M' + (x + s) + ' ' + y + ' l' + (-s) + ' ' + s, fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round' }), null, color || C_BAD);
    parent.appendChild(p);
    return p;
  }
  /* 数字从 0 数到 v（u ∈ [0, 1]），千分位 */
  function countTo(v, u, digits) {
    var x = v * clamp(u, 0, 1);
    return digits ? x.toFixed(digits) : Math.round(x).toLocaleString('en-US');
  }
  /* 两种说法的翻牌：每行一个名字和一张卡片，卡片在 who[0]（橙）和 who[1]（绿）之间来回翻；set(秒) 按 1.6 s 一翻 */
  function flipList(parent, x, y0, items, nameW, boxW, who) {
    var names = who || ['论文', '项目页'];
    var rows = items.map(function (f, i) {
      var y = y0 + i * 40;
      label(parent, x, y + 20, f[0], 'demo-x-ink2', 12);
      var box = rectBox(parent, x + nameW, y, boxW, 30, C_BORDER, C_SURFACE);
      var v = label(parent, x + nameW + boxW / 2, y + 20, '', 'demo-x-ink', 12.5, 'middle');
      var who = label(parent, x + nameW + boxW + 10, y + 20, '', 'demo-x-mut', 11.5);
      return { box: box, v: v, who: who, f: f };
    });
    return {
      set: function (sec) {
        var side = Math.floor(Math.max(0, sec) / 1.6) % 2, ph = (Math.max(0, sec) % 1.6) / 1.6;
        /* 翻牌：每次换面时卡片横向压扁再展开 */
        var sq = ph < 0.12 ? Math.abs(1 - ph / 0.06) : 1;
        rows.forEach(function (r) {
          r.v.textContent = side ? r.f[2] : r.f[1];
          r.who.textContent = side ? names[1] : names[0];
          r.box.style.stroke = side ? C_GOOD : C_WARN;
          r.v.style.opacity = sq;
        });
      }
    };
  }
  /* 确定性随机：第 i 个、种子 s 的 [0, 1) 随机数（mulberry32） */
  function rnd(i, s) {
    var a = (i * 2654435761 + (s || 1) * 40503) >>> 0;
    a = (a + 0x6d2b79f5) >>> 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /* 随机化的一个参数：数轴上一段区间，小点每 period 秒跳到区间里一个新的随机值（域随机化） */
  function rangeRow(parent, x, y, w, name, lo, hi, axLo, axHi, fmtV, color) {
    var g = group(parent), px = function (v) { return x + 92 + (v - axLo) / (axHi - axLo) * (w - 176); };
    label(g, x, y + 4, name, 'demo-x-ink2', 11);
    hline(g, px(axLo), y, px(axHi), y, C_BORDER, 1.4);
    var band = paint(svgEl('rect', { x: px(lo).toFixed(1), y: y - 4, width: (px(hi) - px(lo)).toFixed(1), height: 8, rx: 4 }), color || C_ACCENT);
    band.style.opacity = 0.35; g.appendChild(band);
    var d = dotAt(g, px(lo), y, 5, color || C_ACCENT), v = label(g, x + w, y + 4, '', 'demo-x-ink', 11, 'end');
    return {
      g: g,
      at: function (sec, seed, period) {
        var k = Math.floor(Math.max(0, sec) / (period || 0.8)), val = lo + (hi - lo) * rnd(k, seed);
        moveDot(d, [px(val), y]);
        v.textContent = fmtV(val);
      }
    };
  }

  /* 一行字的宽度估计（中文按 1 个字号、其余按 0.55 个字号），排版用 */
  function textW(str, size) {
    var w = 0;
    for (var i = 0; i < str.length; i++) w += str.charCodeAt(i) > 255 ? size : size * 0.55;
    return w;
  }
  /* 一组小方格（GPU、维数），n 个，每行 cols 个；fill(m) 点亮前 m 个 */
  function cellGrid(parent, x, y, n, cols, size, gap, color) {
    var g = group(parent), cells = [];
    for (var i = 0; i < n; i++) {
      var r = paint(svgEl('rect', { x: x + (i % cols) * (size + gap), y: y + Math.floor(i / cols) * (size + gap), width: size, height: size, rx: 2 }), color);
      g.appendChild(r);
      cells.push(r);
    }
    return { g: g, fill: function (m) { cells.forEach(function (c, i) { c.style.opacity = i < m ? 1 : 0.15; }); } };
  }

  /* 一段由几部分拼成的项目页片段：at(k, 秒, 是否可见) 从第 k 部分的开头起放、在这一部分里循环；下面一排小条标出放的是哪一部分 */
  function partClip(parent, id, x, y, w, h, parts, caption) {
    var g = group(parent), total = 0, starts = [];
    parts.forEach(function (p) { starts.push(total); total += p[0]; });
    var c = projClip(g, id, x, y, w, h, caption, { capDy: 48 });
    var bars = parts.map(function (p, i) {
      var r = paint(svgEl('rect', { x: (x + starts[i] / total * w).toFixed(1), y: (y + h + 7).toFixed(1), width: Math.max(2, p[0] / total * w - 4).toFixed(1), height: 5, rx: 2.5 }), C_ACCENT);
      g.appendChild(r);
      return r;
    });
    var name = label(g, x, y + h + 27, '', 'demo-x-ink', 12.5);
    var last = -1;
    return {
      g: g, total: total, starts: starts,
      at: function (k, sec, vis) {
        k = clamp(k, 0, parts.length - 1);
        var L = parts[k][0], u = ((Math.max(0, sec) % L) + L) % L;
        c.at(starts[k] + Math.min(u, L - 0.05), vis);
        if (k === last) return;
        last = k;
        bars.forEach(function (r, i) { r.style.opacity = i === k ? 1 : 0.25; });
        name.textContent = (k + 1) + ' / ' + parts.length + '　' + parts[k][1];
      }
    };
  }
  /* 弹簧：两端 (x1, y1)–(x2, y2) 之间画 n 圈锯齿 */
  function spring(parent, color, n, amp) {
    var p = paint(svgEl('path', { d: 'M 0 0', fill: 'none', 'stroke-width': 2, 'stroke-linejoin': 'round' }), null, color);
    parent.appendChild(p);
    return {
      node: p,
      set: function (x1, y1, x2, y2) {
        var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, m = (n || 6) * 2, a = amp || 6;
        var pts = [[x1, y1], [x1 + ux * 6, y1 + uy * 6]];
        for (var i = 1; i < m; i++) {
          var s = 6 + (L - 12) * i / m, side = i % 2 ? 1 : -1;
          pts.push([x1 + ux * s - uy * a * side, y1 + uy * s + ux * a * side]);
        }
        pts.push([x2 - ux * 6, y2 - uy * 6], [x2, y2]);
        p.setAttribute('d', fmtPath(pts));
      }
    };
  }
  /* 竖条形图的一根：底在 yBase，set(高, 文字) 把数字写在柱顶上方 */
  function colBar(parent, x, w, yBase, color) {
    var b = vbar(parent, x, w, color), v = label(parent, x + w / 2, yBase, '', 'demo-x-ink', 11, 'middle');
    return {
      b: b, v: v,
      set: function (h, txt) { b.set(yBase, h); v.setAttribute('y', (yBase - Math.max(0, h) - 5).toFixed(1)); v.textContent = txt; }
    };
  }
  /* 力的箭头：从 p 指向 p + dir × len，旁边写 txt */
  function forceArrow(parent, color) {
    var a = arrow(parent, color || C_ACCENT, 2.6), t = tone(parent, 0, 0, "", color || C_ACCENT, 12, 'middle');
    return {
      g: a.g, t: t,
      set: function (p, dir, len, txt, off) {
        var L = Math.max(0.001, len);
        a.set(p[0], p[1], p[0] + dir[0] * L, p[1] + dir[1] * L, Math.min(10, 4 + L / 4));
        setOpacity(a.g, len > 1.5 ? 1 : 0);
        var o = off || [0, -10];
        t.setAttribute('x', (p[0] + dir[0] * L + o[0]).toFixed(1));
        t.setAttribute('y', (p[1] + dir[1] * L + o[1]).toFixed(1));
        t.textContent = len > 1.5 ? (txt || '') : '';
      }
    };
  }

  /* 论文图（arXiv 2304.13705 v1，源文件 figures/ 里的图按 LaTeX 的裁剪重新导出）：[文件, 宽, 高] */
  var FIGS = {
    fig1: ['fig1_setup.webp', 1500, 441],
    fig2b: ['fig2b_setup_close.webp', 1400, 358],
    fig2te: ['fig2_te.webp', 455, 367],
    fig3: ['fig3_arch.webp', 1374, 378],
    fig4: ['fig4_tasks.webp', 1400, 1144],
    fig5: ['fig5_sim.webp', 1600, 211],
    fig7: ['fig7_detail_train.webp', 1270, 1080]
  };
  /* 图 4 拼成一张：6 行任务照片（原图每行下面的说明文字去掉了），[y0, y1] 是每行在 1400 宽的拼图里的像素范围 */
  var FIG4_ROWS = [[0, 188], [193, 380], [385, 571], [576, 763], [767, 954], [959, 1144]];
  var FIG4_W = [1117, 1117, 1117, 1117, 1400, 1400];

  /* 仿真回合的贴图表（我们的复现，sim/）：官方 XML 的方块交接，MuJoCo 2.3.7 离线渲染，自由相机（看向 (0, 0.5, 0.24)，距离 1.32 m，
     方位 90°、俯 22°），每 2 步一格（25 帧/秒），透明底；第 n 格对应第 2n 步 */
  var SIM = { cw: 332, ch: 129, cols: 10, n: 200, every: 2 };
  /* crop = [x, y, w, h]（格子里的像素），只放这一块；不给就放整格 */
  function simSprite(parent, file, crop) {
    var g = group(parent), rows = Math.ceil(SIM.n / SIM.cols);
    var cr = crop || [1, 1, SIM.cw - 2, SIM.ch - 2];
    g.setAttribute('class', 'demo-x-g1mesh');
    var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: 0, height: 0 });
    var img = svgEl('image', { x: 0, y: 0, width: SIM.cw * SIM.cols, height: SIM.ch * rows, preserveAspectRatio: 'none' });
    box.appendChild(img);
    g.appendChild(box);
    var woke = false, lastF = -1;
    return {
      g: g,
      /* 左上角放在 (x, y)、宽 w；step = 回合里的第几步（0–399） */
      put: function (x, y, w, step) {
        if (!woke && SIM_BASE) { woke = true; img.setAttribute('href', SIM_BASE + file); }
        var f = clamp(Math.round(step / SIM.every), 0, SIM.n - 1), k = w / (crop ? cr[2] : SIM.cw);
        box.setAttribute('x', x.toFixed(1)); box.setAttribute('y', y.toFixed(1));
        box.setAttribute('width', w.toFixed(1)); box.setAttribute('height', ((crop ? cr[3] : SIM.ch) * k).toFixed(1));
        if (f !== lastF) {
          /* 每格四周裁掉 1 像素，免得双线性取样带进相邻格子的边（iDP3 2026-11-08） */
          box.setAttribute('viewBox', [(f % SIM.cols) * SIM.cw + cr[0], Math.floor(f / SIM.cols) * SIM.ch + cr[1], cr[2], cr[3]].join(' '));
          lastF = f;
        }
        return (crop ? cr[3] : SIM.ch) * k;
      }
    };
  }
  /* model/ 下的贴图表：meta = { cw, ch, cols, n }；put(x, y, w, frame) 把第 frame 格放在左上角 (x, y)、宽 w，返回缩放比 k
     （格子里的点 p 画到 x + p[0] × k、y + p[1] × k） */
  function modelSheet(parent, file, meta) {
    var g = group(parent), rows = Math.ceil(meta.n / meta.cols);
    g.setAttribute('class', 'demo-x-g1mesh');
    var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: 0, height: 0 });
    var img = svgEl('image', { x: 0, y: 0, width: meta.cw * meta.cols, height: meta.ch * rows, preserveAspectRatio: 'none' });
    box.appendChild(img);
    g.appendChild(box);
    var woke = false, lastF = -1, X = 0, Y = 0, k = 1;
    return {
      g: g,
      /* 每格四周裁掉 1 像素（免得取样带进相邻格子），所以宽 w 对应格子里的 cw − 2 像素 */
      put: function (x, y, w, frame) {
        if (!woke && MODEL_BASE) { woke = true; img.setAttribute('href', MODEL_BASE + file); }
        var f = clamp(Math.round(frame || 0), 0, meta.n - 1);
        X = x; Y = y; k = w / (meta.cw - 2);
        box.setAttribute('x', x.toFixed(1)); box.setAttribute('y', y.toFixed(1));
        box.setAttribute('width', w.toFixed(1)); box.setAttribute('height', ((meta.ch - 2) * k).toFixed(1));
        if (f !== lastF) {
          box.setAttribute('viewBox', [(f % meta.cols) * meta.cw + 1, Math.floor(f / meta.cols) * meta.ch + 1, meta.cw - 2, meta.ch - 2].join(' '));
          lastF = f;
        }
        return k;
      },
      /* 格子里的点 → 画面坐标（按最近一次 put） */
      at: function (p) { return [X + (p[0] - 1) * k, Y + (p[1] - 1) * k]; },
      h: function (w) { return (meta.ch - 2) * w / (meta.cw - 2); }
    };
  }
  /* 来回放：0 … n−1 … 0（不从末格跳回首格） */
  function pingFrame(u, n) {
    var L = 2 * (n - 1), v = ((Math.floor(u) % L) + L) % L;
    return v < n ? v : L - v;
  }
  /* 回合里的第几步：按秒数 × 50 Hz 循环，放完停 1 s 再从头 */
  function loopStep(sec, n) {
    var L = (n || 400) / 50 + 1, u = ((sec % L) + L) % L;
    return Math.min(399, Math.floor(u * 50));
  }
  /* base64 里的 uint8 → [0, 1] 的数组 */
  function b64u8(s) {
    var bin = window.atob(s), out = new Float32Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) / 255;
    return out;
  }
  var PRED = {};
  /* 第 q 次查询（第 q 步）预测的第 j 步（j = 0…99）的值；key = 'rgrip' 右夹爪 / 'rsh' 右肩 */
  function pred(key, q, j) {
    if (!REPRO) return 0;
    var P = PRED[key];
    if (!P) { P = PRED[key] = b64u8(REPRO.te[key + '_pred']); }
    var sc = REPRO.te[key + '_scale'];
    return sc[0] + (sc[1] - sc[0]) * P[q * 100 + j];
  }
  /* 第 t 步收到的所有预测：[查询时刻, 值]，最老的在前 */
  function predsFor(key, t) {
    var out = [];
    for (var q = Math.max(0, t - 99); q <= t; q++) out.push([q, pred(key, q, t - q)]);
    return out;
  }
  /* 官方 imitate_episodes.py 的时间集成：w_i = exp(−m i)，i = 0 是最老的预测，归一化后加权平均 */
  function ensemble(list, m) {
    var sw = 0, s = 0;
    list.forEach(function (p, i) { var w = Math.exp(-m * i); sw += w; s += w * p[1]; });
    return sw ? s / sw : 0;
  }

  /* ── scene 1: 精细活，低成本硬件做得到吗 ── */
  function buildSceneIntro() {
    var s = sceneSvg('左边是项目页的视频：学到的策略用两只低成本机械臂打开一个透明调料杯的盖子。右边依次出现：几项毫米级的精细活（项目页里穿魔术贴扎带的画面，旁边是侧面看的放大示意：带子 2 毫米厚、环上的缝 3 毫米，对准正中穿得过去，偏 1 毫米就撞在环上）；' +
      '以前的系统贵在哪里（价格条）；ViperX 机械臂的准度只有 5–8 毫米，落点散成一圈；人靠眼睛看着纠正；最后是这篇论文的两样东西：ALOHA 硬件和 ACT 算法');
    s.appendChild(svgText(24, 26, '精细活：拧开、撬开、塞进去，差几毫米就失败', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'hero', 24, 44, 380, 214, '项目页视频（实时）：学到的策略打开调料杯的盖子');
    label(s, 24, 300, '两只约 5,600 美元的机械臂，4 台网络摄像头', 'demo-x-ink2', 11.5);
    label(s, 24, 320, 'Stanford · UC Berkeley · Meta · RSS 2023', 'demo-x-mut', 11);
    var R = 424;
    /* 第 1 段：毫米级的活。论文第 V-A 节：魔术贴扎带的环 3 mm × 25 mm，带子 2 mm × 10–25 mm（宽度随位置变）。
       左：项目页「执行时的观测」里穿扎带那段，取其中一台相机（项目页没标倍速）；
       右：侧面看的放大示意（1 mm = 14 px）——黄色是环上的缝（3 mm），灰色是带子（2 mm 厚）：
       对准正中穿得过去、上下各剩 0.5 mm；偏 1 mm 就撞在环上（几何推出来的，示意） */
    var p1 = group(s);
    label(p1, R, 62, '论文里的几项精细活', 'demo-x-ink', 14);
    [['魔术贴扎带：环上的缝 3 mm，带子 2 mm 厚', C_WARN], ['仿真交接方块：间隙约 1 cm', C_ACCENT], ['仿真插销：间隙约 5 mm', C_PURPLE]].forEach(function (it, i) {
      chip(p1, R, 74 + i * 30, 300, it[0], it[1], { size: 12, h: 26, left: true });
    });
    var vel = projClip(p1, 'velcro', R, 178, 136, 102, '');
    var MM = 14, wx = R + 262, cy = 230, sx0 = R + 150;
    /* 环：侧面看是一堵带缝的墙，缝高 3 mm */
    p1.appendChild(paint(svgEl('rect', { x: wx, y: cy - 1.5 * MM - 24, width: 16, height: 24, rx: 2 }), C_WARN));
    p1.appendChild(paint(svgEl('rect', { x: wx, y: cy + 1.5 * MM, width: 16, height: 24, rx: 2 }), C_WARN));
    tone(p1, wx + 8, cy - 1.5 * MM - 30, '环', C_WARN, 12, 'middle');
    var dx = wx + 40;
    hline(p1, dx, cy - 1.5 * MM, dx, cy + 1.5 * MM, C_INK2 || C_MUTED, 1.2);
    hline(p1, dx - 4, cy - 1.5 * MM, dx + 4, cy - 1.5 * MM, C_INK2 || C_MUTED, 1.2);
    hline(p1, dx - 4, cy + 1.5 * MM, dx + 4, cy + 1.5 * MM, C_INK2 || C_MUTED, 1.2);
    label(p1, dx + 7, cy + 4, '缝 3 mm', 'demo-x-ink2', 11);
    /* 带子：2 mm 厚，从左边推进来 */
    var strap = paint(svgEl('rect', { x: sx0, y: cy - MM, width: 0, height: 2 * MM, rx: 2 }), C_MUTED);
    p1.appendChild(strap);
    label(p1, sx0 + 4, cy + 36, '带子 2 mm 厚', 'demo-x-ink2', 11.5);
    var bump = dotAt(p1, wx, cy - 1.5 * MM, 6, C_BAD);
    var mmTxt = label(p1, sx0 + 4, 290, '', 'demo-x-ink', 11.5);
    label(p1, R, 310, '左：项目页视频（未标倍速）；右：侧面看的放大示意', 'demo-x-mut', 11);
    /* 第 2 段：以前的系统（附录 A 的估价） */
    var p2 = group(s);
    label(p2, R, 62, '以前：贵的机器人 + 精确的传感器', 'demo-x-ink', 14);
    var bars2 = [['Shadow 双手遥操作', PRICE.shadow, C_BAD, '≥ 40 万美元'], ['DexPilot（一臂一手）', PRICE.dexpilot, C_WARN, '约 10 万'],
      ['ALOHA（两对主从臂）', PRICE.alohaAll, C_GOOD, '< 2 万']].map(function (b, i) {
      var r = barRowAt(p2, R, 92 + i * 42, 140, b[0], b[2], 18, 11.5);
      return { r: r, v: b[1], txt: b[3] };
    });
    label(p2, R, 236, '附录 A 的估价，条按价钱等比例画；ALOHA 是论文自己的系统', 'demo-x-mut', 11);
    label(p2, R, 258, '论文要问：学习能不能让便宜、不精确的硬件也做精细活？', 'demo-x-ink2', 11.5);
    /* 第 3 段：ViperX 的准度 5–8 mm：左边是 ViperX 300 的模型（Menagerie）指尖朝下够桌面上的目标，右边放大镜里落点散成一圈 */
    var p3 = group(s);
    label(p3, R, 62, '便宜的臂不够准', 'demo-x-ink', 14);
    var RM = MODEL && MODEL.reach, reach = RM ? modelSheet(p3, 'reach.webp', RM) : null, RW = 176;
    var tip3 = [R + 160, 196];
    if (reach) { reach.put(R, 80, RW, 0); tip3 = reach.at(RM.tip); }
    hline(p3, R, tip3[1], tip3[0] + 16, tip3[1], C_MUTED, 1.2).setAttribute('stroke-dasharray', '3 3');
    var tx = R + 290, ty = 140, PX = 7, LR = 62;
    var lens = ringAt(p3, tx, ty, LR, C_INK2 || C_MUTED, 1.6);
    void lens;
    ringAt(p3, tip3[0], tip3[1], 5, C_INK2 || C_MUTED, 1.4);
    hline(p3, tip3[0] + 4, tip3[1] - 3, tx - LR * 0.86, ty + LR * 0.5, C_MUTED, 1).setAttribute('stroke-dasharray', '3 3');
    hline(p3, tip3[0] + 2, tip3[1] - 5, tx - LR * 0.5, ty - LR * 0.86, C_MUTED, 1).setAttribute('stroke-dasharray', '3 3');
    ringAt(p3, tx, ty, 8 * PX, C_BAD, 1.4).setAttribute('stroke-dasharray', '4 4');
    ringAt(p3, tx, ty, 5 * PX, C_WARN, 1.4).setAttribute('stroke-dasharray', '4 4');
    hline(p3, tx - 8, ty, tx + 8, ty, C_INK, 1.6); hline(p3, tx, ty - 8, tx, ty + 8, C_INK, 1.6);
    var hits = [];
    for (var h = 0; h < 18; h++) hits.push(dotAt(p3, tx, ty, 3, C_ACCENT));
    label(p3, R, 226, '左：ViperX 300 的模型，指尖朝下；右：放大的指尖附近', 'demo-x-mut', 11);
    label(p3, R, 248, 'ViperX（图 2 右）：重复精度 1 mm，准度 5–8 mm，负载 750 g', 'demo-x-ink2', 11.5);
    tone(p3, R, 270, '黄虚线圈：5 mm', C_WARN, 11.5);
    tone(p3, R + 120, 270, '红虚线圈：8 mm', C_BAD, 11.5);
    label(p3, R, 292, '蓝点：照着同一个目标点去，落点散在几毫米的圈里（示意）', 'demo-x-mut', 11);
    /* 第 4 段：人也没有工业级的本体感觉，靠看着纠正 */
    var p4 = group(s);
    label(p4, R, 62, '人也不靠精确的本体感觉', 'demo-x-ink', 14);
    label(p4, R, 86, '看着手和东西差多少，一边做一边纠正', 'demo-x-ink2', 12);
    var eye = group(p4);
    paint(eye.appendChild(svgEl('ellipse', { cx: R + 40, cy: 160, rx: 22, ry: 13, 'stroke-width': 2, fill: 'none' })), null, C_INK);
    dotAt(eye, R + 40, 160, 6, C_INK);
    var tgt4 = ringAt(p4, R + 300, 160, 9, C_WARN, 2.4), hand4 = dotAt(p4, R + 130, 160, 7, C_ACCENT);
    void tgt4;
    var look = flowSeg(p4, C_MUTED, 3, 2.6, 70);
    label(p4, R + 300, 190, '目标', 'demo-x-ink2', 11.5, 'middle');
    var handT = label(p4, R + 130, 136, '手', 'demo-x-ink2', 11.5, 'middle');
    label(p4, R, 236, '所以：训练一个端到端的策略，', 'demo-x-ink2', 12);
    label(p4, R, 258, '从网络摄像头的 RGB 画面直接输出关节角', 'demo-x-ink', 12);
    /* 第 5 段：两样东西 */
    var p5 = group(s);
    label(p5, R, 62, '这篇论文交出两样东西', 'demo-x-ink', 14);
    rectBox(p5, R, 78, 168, 104, C_LEAD, C_SURFACE);
    rectBox(p5, R + 184, 78, 168, 104, C_ENS, C_SURFACE);
    label(p5, R + 84, 104, 'ALOHA', 'demo-x-ink', 15, 'middle');
    label(p5, R + 84, 128, '低成本双臂遥操作', 'demo-x-ink2', 11.5, 'middle');
    label(p5, R + 84, 150, '两对主从臂', 'demo-x-ink2', 11.5, 'middle');
    label(p5, R + 84, 170, '不到 2 万美元', 'demo-x-ink2', 11.5, 'middle');
    label(p5, R + 268, 104, 'ACT', 'demo-x-ink', 15, 'middle');
    label(p5, R + 268, 128, '动作分块 + Transformer', 'demo-x-ink2', 11.5, 'middle');
    label(p5, R + 268, 150, '训成 CVAE', 'demo-x-ink2', 11.5, 'middle');
    label(p5, R + 268, 170, '一次出一段动作', 'demo-x-ink2', 11.5, 'middle');
    var big5 = label(p5, R, 222, '', 'demo-x-ink', 13.5);
    label(p5, R, 248, '每个任务 50 条示范，约 10 分钟的数据，学会 6 个真机任务', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      clip.at(K.clipSince(t, 0), true);
      vel.at(K.clipSince(t, 0), true);
      /* 两次尝试，5 s 一轮：先对准正中，穿过去；再偏上 1 mm，带头撞在环上 */
      var ph = ((now % 5) + 5) % 5, second = ph >= 2.5, q = second ? ph - 2.5 : ph;
      var off = second ? -MM : 0, stopX = second ? wx : wx + 30;
      var tip = sx0 + (stopX - sx0) * K.ease(Math.min(1, q / 1.4));
      strap.setAttribute('y', (cy - MM + off).toFixed(1)); setW(strap, tip - sx0);
      var arrived = q >= 1.4;
      bump.style.opacity = second && arrived ? 1 : 0;
      mmTxt.textContent = !arrived ? (second ? '再试一次：偏上 1 mm' : '对准缝的正中推过去') :
        (second ? '偏 1 mm：撞在环上' : '穿过去了：上下各只剩 0.5 mm');
      mmTxt.style.fill = arrived ? (second ? C_BAD : C_GOOD) : '';
      var u2 = seg(since(t, clock, 3.6), 0.2, 1.6);
      bars2.forEach(function (b) {
        var w = 140 * b.v / PRICE.shadow * K.ease(u2) + 1;
        b.r.set(w, u2 > 0.95 ? b.txt : '');
      });
      /* 落点每 0.5 s 换一批：在 0–8 mm 里随机 */
      var batch = Math.floor(now / 0.5);
      hits.forEach(function (c, i) {
        var r = (5 + 3 * rnd(i, batch)) * PX * Math.sqrt(rnd(i + 40, batch)), a = 6.283 * rnd(i + 80, batch);
        moveDot(c, [tx + r * Math.cos(a), ty + r * Math.sin(a)]);
      });
      /* 看着纠正：手往目标走，偏了就拉回来 */
      var ph = (now % 4) / 4, hx4 = R + 130 + 170 * K.ease(Math.min(1, ph * 1.3)), hy4 = 160 + 26 * Math.sin(ph * 12) * (1 - Math.min(1, ph * 1.3));
      moveDot(hand4, [hx4, hy4]);
      handT.setAttribute('x', hx4.toFixed(1)); handT.setAttribute('y', (hy4 - 18).toFixed(1));
      look.at(now, [R + 66, 160], [hx4 - 12, hy4], true);
      var u5 = seg(since(t, clock, 13.4), 0.3, 1.8);
      big5.textContent = '打开杯盖、装电池：成功率 ' + Math.round(80 * u5) + '–' + Math.round(90 * u5) + '%';
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: ALOHA：两对主从臂 ── */
  function buildSceneAloha() {
    var s = sceneSvg('左边是项目页的遥操作视频，依次是插内存条、颠乒乓球、从钱包里抽信用卡、扎扎带，画面里标着倍速。右边依次出现：' +
      '主臂 WidowX 250 和从臂 ViperX 300 的模型按官方仿真人类示范的关节角一起动；ViperX 的模型往外够目标，越接近伸直，目标每挪 1 厘米关节要转的角度越大；' +
      '夹爪的开合、主臂的重量和橡皮筋；价格相加；复现了 Shadow 系统 15 个例子里的 14 个');
    s.appendChild(svgText(24, 26, 'ALOHA：人扳动小臂，大臂跟着做', 'demo-x-ink2', 13.5));
    var clip = seqClip(s, 'teleop', 24, 44, 380, 214, '项目页视频：遥操作，倍速以画面里的标签为准',
      [[3.6, '插内存条（10 倍速）'], [4.6, '颠乒乓球（实时）'], [3.6, '抽信用卡（10 倍速）'], [5.6, '扎扎带（10 倍速）']]);
    var R = 424;
    /* 第 1 段：主臂 → 从臂，关节对关节 */
    var p1 = group(s);
    label(p1, R, 62, '关节对关节：主臂的角度直接发给从臂', 'demo-x-ink', 13.5);
    /* 主臂 WidowX 250、从臂 ViperX 300 的模型（Menagerie），同一台相机、同一比例：关节角取官方仿真人类示范第 0 条的右臂，
       主臂 = action（主臂的关节角），从臂 = observation.state，第 0–200 步每 4 步一格（按 50 Hz 的原速放） */
    var PM = MODEL && MODEL.pair, PK = 0.6, GROUND = 222;
    var leadS = PM ? modelSheet(p1, 'pair_leader.webp', PM.leader) : null, follS = PM ? modelSheet(p1, 'pair_follower.webp', PM.follower) : null;
    hline(p1, R, GROUND, R + 352, GROUND, C_BORDER, 2);
    tone(p1, R + 62, 246, '主臂 WidowX 250（人扳）', C_LEAD, 11.5, 'middle');
    tone(p1, R + 248, 246, '从臂 ViperX 300（干活）', C_FOLL, 11.5, 'middle');
    var angT = label(p1, R + 176, 92, '', 'demo-x-ink2', 11.5, 'middle');
    var sync = flowSeg(p1, C_LEAD, 3, 2.6, 60);
    label(p1, R, 270, '两种臂同一家公司出的，大致是按比例放大的同一个结构', 'demo-x-mut', 11);
    label(p1, R, 292, '模型来自 MuJoCo Menagerie；关节角取官方仿真人类示范第 0 条', 'demo-x-mut', 11);
    /* 第 2 段：为什么不用 VR 手柄 + 逆运动学 */
    var p2 = group(s);
    label(p2, R, 62, '为什么不用 VR 手柄 + 逆运动学', 'demo-x-ink', 13.5);
    label(p2, R, 86, '6 自由度、没有冗余；精细活常在奇异点附近', 'demo-x-ink2', 12);
    /* ViperX 300 的模型：目标（黄圈）在同一高度往外拉，夹爪保持水平，按真实的连杆长度解逆运动学（我们算的） */
    var IKM = MODEL && MODEL.ik, ikS = IKM ? modelSheet(p2, 'ik.webp', IKM) : null;
    var ikTgt = ringAt(p2, 0, 0, 7, C_WARN, 2.2);
    label(p2, R, 248, '目标每往外挪 1 cm，肩和肘一共要转：', 'demo-x-ink2', 11.5);
    var ikBar = hbar(p2, R + 214, 239, 12, C_BAD), ikVal = label(p2, R + 214, 249, '', 'demo-x-ink', 11.5);
    label(p2, R, 270, 'ViperX 300 的模型算的：中段约 4°，快伸直时 17°', 'demo-x-mut', 11);
    label(p2, R, 292, '关节空间映射：不用解，带宽高、延迟低', 'demo-x-ink2', 12);
    /* 第 3 段：握把、剪刀、橡皮筋 */
    var p3 = group(s);
    label(p3, R, 62, '几件 3D 打印的小东西', 'demo-x-ink', 13.5);
    rectBox(p3, R, 76, 352, 54, C_BORDER, C_SURFACE2);
    label(p3, R + 12, 98, '握把 + 剪刀机构：夹爪开合是连续的', 'demo-x-ink2', 11.5);
    var GM = MODEL && MODEL.grip, gripS = GM ? modelSheet(p3, 'grip.webp', GM) : null;
    var gripTxt = label(p3, R + 12, 120, '', 'demo-x-ink', 11.5);
    rectBox(p3, R, 138, 352, 54, C_BORDER, C_SURFACE2);
    label(p3, R + 12, 160, '主臂的重量：手抖被滤掉，也快不起来', 'demo-x-ink2', 11.5);
    var shakeIn = pathLine(p3, [], C_MUTED, 1.2), shakeOut = pathLine(p3, [], C_LEAD, 2);
    rectBox(p3, R, 200, 352, 54, C_BORDER, C_SURFACE2);
    label(p3, R + 12, 222, '橡皮筋抵掉一部分重力：能连续操作 30 分钟以上', 'demo-x-ink2', 11.5);
    var band = spring(p3, C_PURPLE, 7, 4);
    lineLegend(p3, R, 274, [['手的原始输入', C_MUTED], ['主臂实际的动作', C_LEAD]], 11);
    /* 第 4 段：价格 */
    var p4 = group(s);
    label(p4, R, 62, '一套多少钱', 'demo-x-ink', 13.5);
    var cost = [['从臂 ViperX × 2', 2 * PRICE.viperx, C_FOLL], ['主臂 WidowX × 2', 2 * PRICE.widowx, C_LEAD]].map(function (c, i) {
      return { r: barRowAt(p4, R, 86 + i * 34, 128, c[0], c[2], 18, 11.5), v: c[1] };
    });
    var sum4 = label(p4, R, 178, '', 'demo-x-ink', 14);
    label(p4, R, 204, '加上相机等配件：不到 2 万美元', 'demo-x-ink2', 12);
    label(p4, R, 228, '差不多是一只 Franka Panda 研究臂的价钱', 'demo-x-ink2', 12);
    label(p4, R, 258, '外加 2020 铝型材的框架、交叉的钢索加固', 'demo-x-mut', 11);
    /* 第 5 段：能做什么 */
    var p5 = group(s);
    label(p5, R, 62, '附录 A：照着 Shadow 系统的 15 个演示做一遍', 'demo-x-ink', 13.5);
    var cells5 = [];
    for (var i = 0; i < 15; i++) {
      var x = R + (i % 5) * 70, y = 80 + Math.floor(i / 5) * 46;
      cells5.push({ box: rectBox(p5, x, y, 62, 38, C_BORDER, C_SURFACE2), x: x, y: y });
    }
    var marks5 = cells5.map(function (c, i) { return i === 14 ? cross(p5, c.x + 22, c.y + 10, 18) : tick(p5, c.x + 20, c.y + 8, 20); });
    var cnt5 = label(p5, R, 240, '', 'demo-x-ink', 13);
    label(p5, R, 264, '做不了的那个是手里转保定球：ALOHA 没有手', 'demo-x-ink2', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      clip.at(K.clipSince(t, 0), true);
      if (PM) {
        var pf = pingFrame(now * 50 / PM.every, PM.steps.length);
        leadS.put(R + 62 - PM.leader.base[0] * PK, GROUND - PM.leader.base[1] * PK, PM.leader.cw * PK, pf);
        follS.put(R + 248 - PM.follower.base[0] * PK, GROUND - PM.follower.base[1] * PK, PM.follower.cw * PK, pf);
        var hl = leadS.at(PM.leader.hand[pf]), hf = follS.at(PM.follower.hand[pf]);
        angT.textContent = '同样的关节角（示范第 ' + PM.steps[pf] + ' 步）';
        sync.at(now, [hl[0] + 6, hl[1]], [hf[0] - 8, hf[1]], true);
      }
      /* 逆运动学：目标沿水平往外拉；越接近伸直，每 1 cm 要转的角度越大 */
      if (IKM) {
        var u = 0.5 - 0.5 * Math.cos(now * 0.9), kk = Math.round(u * (IKM.kA.length - 1));
        ikS.put(R + 10, 92, 290, IKM.kA[kk]);
        moveDot(ikTgt, ikS.at(IKM.target[kk]));
        var rate = IKM.rate[Math.max(1, kk)];
        setW(ikBar, 6 * rate); ikVal.setAttribute('x', (R + 220 + 6 * rate).toFixed(1));
        ikVal.textContent = f1(rate) + '°';
      }
      var gg = 0.5 + 0.5 * Math.sin(now * 1.7);
      if (GM) gripS.put(R + 290, 79, 40, Math.round(gg * (GM.n - 1)));
      gripTxt.textContent = '开度 ' + Math.round(gg * 100) + '%';
      var pin = [], pout = [];
      for (var k = 0; k <= 60; k++) {
        var xx = R + 228 + k * 2, base = 166 + 8 * Math.sin(now * 2 + k * 0.08);
        pin.push([xx, base + 5 * Math.sin(k * 1.9 + now * 9)]); pout.push([xx, base]);
      }
      setPath(shakeIn, pin); setPath(shakeOut, pout);
      band.set(R + 290, 210, R + 336 + 6 * Math.sin(now * 2), 246);
      var u4 = seg(since(t, clock, 10.4), 0.2, 1.6);
      cost.forEach(function (c) { c.r.set(140 * c.v / 11200 * K.ease(u4), u4 > 0.95 ? c.v.toLocaleString('en-US') + ' 美元' : ''); });
      sum4.textContent = u4 > 0.95 ? '合计 17,800 美元，附录写约 1.8 万' : '';
      var u5 = since(t, clock, 13.4);
      cells5.forEach(function (c, i) { setOpacity(marks5[i], u5 > 0.4 + i * 0.12 ? 1 : 0); });
      cnt5.textContent = u5 > 2.3 ? '14 / 15 个能用差不多的物件、差不多的时间做出来' : '';
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 记下什么：4 台相机与主臂关节角 ── */
  function buildSceneData() {
    var s = sceneSvg('左边是项目页的视频：执行时策略看到的 4 路画面，左上顶部相机、右上前方相机、下面两路是左右手腕相机。右边依次出现：' +
      '论文图 2 左的相机位置；ViperX 300 的模型标出 6 个关节和夹爪，两条臂合起来 14 个数；夹爪的模型夹住方块，主臂给的开度（半透明）比从臂实际的开度合得更紧，' +
      '开度取官方仿真人类示范第 0 条；一条示范 400–700 步；训练时随机抽一步配上接下来 k 步');
    s.appendChild(svgText(24, 26, '记下什么：4 路画面、14 个关节角', 'demo-x-ink2', 13.5));
    var clip = projClip(s, 'obs', 24, 44, 380, 285, '项目页视频：执行时策略看到的 4 路画面（装电池）');
    label(s, 24, 368, '左上顶部、右上前方（转了 90°）、左下左手腕、右下右手腕', 'demo-x-ink2', 11.5);
    var R = 424;
    /* 第 1 段：相机位置（图 2 左） */
    var p1 = group(s);
    label(p1, R, 62, '4 台罗技 C922x，每台 480 × 640', 'demo-x-ink', 13.5);
    paperPart(p1, 'fig2b', 0, 0, 0.345, 1, R + 50, 76, 240, '');
    label(p1, R, 270, '论文图 2 左：顶部、前方相机固定，两台跟着手腕走', 'demo-x-mut', 11);
    label(p1, R, 292, '遥操作和记录都是 50 Hz（附录：相机本身 30 帧/秒）', 'demo-x-ink2', 11.5);
    /* 第 2 段：观测 */
    var p2 = group(s);
    label(p2, R, 62, '观测：4 张图 + 从臂的 14 个关节角', 'demo-x-ink', 13.5);
    /* ViperX 300 的模型（Menagerie），6 个关节的转轴位置与方向按同一台相机投影；G 是夹爪 */
    var JM = MODEL && MODEL.joints, jS = JM ? modelSheet(p2, 'joints.webp', JM) : null, jMarks = [];
    var JN = ['腰（左右转）', '肩（前后摆）', '肘', '前臂（自转）', '腕（俯仰）', '腕（自转）', '夹爪开度'];
    if (JM) {
      jS.put(R, 74, 150, 0);
      JM.joints.forEach(function (j, i) {
        if (j.a0) { var ax = hline(p2, 0, 0, 0, 0, i === 6 ? C_WARN : C_FOLL, 1.6); var a = jS.at(j.a0), b = jS.at(j.a1); setLine(ax, a[0], a[1], b[0], b[1]); }
      });
      /* 关节上只画小点；轮到哪个关节，就从右边清单的那一行引一条线过去、点放大（数字不压在机器人上） */
      JM.joints.forEach(function (j, i) {
        var q = jS.at(j.p);
        /* 点、圈和引线用墨色：机械臂本身着的是蓝色，同色的标记看不清 */
        var dot = dotAt(p2, q[0], q[1], 2.8, C_INK), ring = ringAt(p2, q[0], q[1], 7, C_INK, 2);
        var ly = 88 + i * 20 - 4, lead = hline(p2, R + 164, ly, q[0] + 8, q[1], C_INK, 1.2, '3 2');
        jMarks.push({ dot: dot, ring: ring, lead: lead });
      });
    }
    var jRows = JN.map(function (n, i) { return tone(p2, R + 170, 88 + i * 20, (i === 6 ? 'G  ' : (i + 1) + '  ') + n, i === 6 ? C_WARN : C_FOLL, 11.5); });
    var cells2 = [];
    for (var i = 0; i < 14; i++) {
      var x = R + i * 25 + (i >= 7 ? 2 : 0);
      cells2.push(paint(svgEl('rect', { x: x, y: 234, width: 21, height: 22, rx: 3 }), i % 7 === 6 ? C_WARN : C_FOLL));
      p2.appendChild(cells2[i]);
    }
    label(p2, R, 274, '左臂 6 个关节 + 夹爪', 'demo-x-ink2', 11.5);
    label(p2, R + 352, 274, '右臂 6 个关节 + 夹爪', 'demo-x-ink2', 11.5, 'end');
    label(p2, R, 298, '6 + 1 + 6 + 1 = 14；动作也是 14 维：两条从臂下一步的目标', 'demo-x-ink2', 11.5);
    /* 第 3 段：动作是主臂的关节角 */
    var p3 = group(s);
    label(p3, R, 62, '动作记的是主臂，不是从臂', 'demo-x-ink', 13.5);
    /* 官方 ACT 模型的右夹爪（ViperX 300），方块画在我们复现里夹住时的位置；开度取官方仿真人类示范第 0 条第 170–300 步：
       实心 = 从臂实际的开度（observation.state），半透明 = 主臂给的开度（action） */
    var GM3 = MODEL && MODEL.grip, GS = MODEL && MODEL.gripseq;
    var cube3 = null, folG = null, leadG = null, GX = R + 20, GY = 76, GW = 120;
    if (GM3) {
      cube3 = modelSheet(p3, 'grip_cube.webp', { cw: GM3.cw, ch: GM3.ch, cols: 1, n: 1 });
      folG = modelSheet(p3, 'grip.webp', GM3); leadG = modelSheet(p3, 'grip.webp', GM3);
      leadG.g.style.opacity = 0.38;
    }
    var gapBar = hbar(p3, R + 170, 186, 12, C_BAD), gapT = label(p3, R + 170, 214, '', 'demo-x-ink', 11.5);
    tone(p3, R + 170, 100, '实心：从臂实际的开度', C_FOLL, 11.5);
    tone(p3, R + 170, 122, '半透明：主臂给的开度', C_LEAD, 11.5);
    var ro3 = label(p3, R + 170, 150, '', 'demo-x-ink2', 11.5), ro3b = label(p3, R + 170, 170, '', 'demo-x-ink2', 11.5);
    label(p3, R, 252, '官方仿真人类示范第 0 条；方块按复现里夹住的位置画', 'demo-x-mut', 11);
    label(p3, R, 276, '碰到东西后从臂停住，主臂还能往里压', 'demo-x-ink2', 12);
    label(p3, R, 298, '两者之差经过电机的 PID，就是压得多紧', 'demo-x-ink2', 12);
    /* 第 4 段：一条示范多长 */
    var p4 = group(s);
    label(p4, R, 62, '一条示范：8–14 秒，50 Hz', 'demo-x-ink', 13.5);
    var tl = hbar(p4, R, 92, 18, C_HUMAN), tlT = label(p4, R, 132, '', 'demo-x-ink', 13);
    label(p4, R, 166, '每个任务 50 条（穿魔术贴扎带 100 条）', 'demo-x-ink2', 12);
    label(p4, R, 190, '约 10–20 分钟的数据；算上复位和失误，30–60 分钟采完', 'demo-x-ink2', 12);
    var demoCells = cellGrid(p4, R, 210, 50, 25, 11, 3, C_HUMAN);
    /* 第 5 段：训练样本 */
    var p5 = group(s);
    label(p5, R, 62, '训练时：随机抽一步 t', 'demo-x-ink', 13.5);
    hline(p5, R, 120, R + 350, 120, C_BORDER, 6);
    var tMark = dotAt(p5, R, 120, 8, C_INK), tT = label(p5, R, 102, 't', 'demo-x-ink', 13, 'middle');
    var kSpan = hbar(p5, R, 116, 8, C_ENS);
    label(p5, R, 158, '输入：第 t 步的 4 张图 + 14 个关节角', 'demo-x-ink2', 12);
    tone(p5, R, 182, '目标：从第 t 步起的 k 步动作，k × 14', C_ENS, 12);
    label(p5, R, 214, '回合快结束时不够 k 步：补零，算损失时跳过', 'demo-x-ink2', 11.5);
    label(p5, R, 238, '（官方 utils.py：每条示范每轮抽一个 t）', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      clip.at(K.clipSince(t, 0), true);
      cells2.forEach(function (c, i) { c.style.opacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * 2.4 - i * 0.45)); });
      /* 关节标号跟着下面的格子轮流亮 */
      var ji = Math.floor(now * 1.2) % 7;
      jMarks.forEach(function (m, i) { m.ring.style.opacity = i === ji ? 1 : 0; m.lead.style.opacity = i === ji ? 1 : 0; m.dot.style.opacity = i === ji ? 1 : 0.6; });
      jRows.forEach(function (r, i) { r.style.opacity = i === ji ? 1 : 0.55; });
      cells2.forEach(function (c, i) { if (i % 7 === ji) c.style.opacity = 1; });
      /* 主臂往里压：从臂碰到方块就停住（示范里的真实开度） */
      if (GM3 && GS) {
        var gi = pingFrame(now * 50 / GS.every, GS.lead.length), gl = GS.lead[gi], gf = GS.foll[gi], toF = function (g) { return clamp(g, 0, 1) * (GM3.n - 1); };
        cube3.put(GX, GY, GW, 0); folG.put(GX, GY, GW, toF(gf)); leadG.put(GX, GY, GW, toF(gl));
        ro3.textContent = '从臂 ' + f2(gf) + '（碰到方块就停）';
        ro3b.textContent = '主臂 ' + f2(gl) + '（第 ' + (GS.t0 + gi * GS.every) + ' 步）';
        var gap = Math.max(0, gf - gl);
        setW(gapBar, 240 * gap);
        gapT.textContent = gap > 0.05 ? '差 ' + f2(gap) + ' → 压力' : '';
      }
      var u4 = seg(since(t, clock, 10.4), 0.2, 2.0), secs = 8 + 6 * (0.5 + 0.5 * Math.sin(now * 0.8));
      setW(tl, 350 * secs / 14 * K.ease(u4));
      tlT.textContent = u4 > 0.95 ? f1(secs) + ' 秒 × 50 = ' + Math.round(secs * 50) + ' 步' : '';
      demoCells.fill(Math.round(50 * seg(since(t, clock, 10.4), 1.0, 2.8)));
      var tt = 0.12 + 0.6 * (0.5 + 0.5 * Math.sin(now * 0.7)), tx = R + 350 * tt;
      moveDot(tMark, [tx, 120]); tT.setAttribute('x', tx.toFixed(1));
      kSpan.setAttribute('x', tx.toFixed(1)); setW(kSpan, Math.min(90, R + 350 - tx));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 一步错，步步错 ── */
  function buildSceneCompound() {
    var s = sceneSvg('左边是一个二维的示意：绿色的示范通道穿过一个窄口，蓝色是一步一步预测的策略，每步差一点，越走越偏，离开通道以后偏得更快，' +
      '最后撞在窄口边上。右边依次出现：行为克隆每步做一次决定；误差滚雪球的循环；三种老办法为什么不适合；人的示范里有停顿（我们数的）；ACT 的思路：缩短有效步数');
    s.appendChild(svgText(24, 26, '模仿学习的老问题：一步错，步步错', 'demo-x-ink2', 13.5));
    /* 左：示范通道与策略的轨迹（玩具） */
    var L = group(s);
    rectBox(L, 24, 44, 380, 300, C_BORDER, C_SURFACE2);
    var tube = [];
    for (var i = 0; i <= 40; i++) { var x = 44 + i * 8.5; tube.push([x, 196 + 60 * Math.sin(i / 40 * Math.PI * 1.2)]); }
    var tubeTop = tube.map(function (p) { return [p[0], p[1] - 16]; }), tubeBot = tube.map(function (p) { return [p[0], p[1] + 16]; });
    var band = paint(svgEl('path', { d: fmtPath(tubeTop.concat(tubeBot.slice().reverse())) + ' Z', opacity: 0.22 }), C_GOOD);
    L.appendChild(band);
    pathLine(L, tube, C_GOOD, 2, '5 4');
    var wallT = paint(svgEl('rect', { x: 330, y: 52, width: 10, height: 0, rx: 2 }), C_MUTED), wallB = paint(svgEl('rect', { x: 330, y: 0, width: 10, height: 0, rx: 2 }), C_MUTED);
    L.appendChild(wallT); L.appendChild(wallB);
    var traj = pathLine(L, [], C_ACCENT, 2.6), head = dotAt(L, 0, 0, 6, C_ACCENT);
    var stepT = label(L, 36, 330, '', 'demo-x-ink2', 11.5);
    lineLegend(s, 24, 366, [['示范（绿色是示范覆盖的范围）', C_GOOD, '5 4'], ['一步一预测的策略', C_ACCENT]], 11);
    label(s, 24, 390, '示意（玩具）：每步差一点；离开示范覆盖的范围以后，差得更多', 'demo-x-mut', 11);
    /* 玩具：每步的误差 = 0.5 px 的偏置 + 偏离量的 3%，离开通道（偏 16 px 以上）后放大到 9%；确定性的 */
    var TOY = (function () {
      var pts = [], y = tube[0][1], off = 0;
      for (var j = 0; j <= 40; j++) {
        var ty = tube[j][1];
        off += 0.5 + (Math.abs(off) > 16 ? 0.09 * Math.abs(off) : 0.03 * Math.abs(off));
        y = ty + off;
        pts.push([tube[j][0], y]);
      }
      return pts;
    })();
    var gapY = tube[34][1];
    wallT.setAttribute('x', tube[34][0] - 5); wallT.setAttribute('height', (gapY - 22 - 52).toFixed(1));
    wallB.setAttribute('x', tube[34][0] - 5); wallB.setAttribute('y', (gapY + 22).toFixed(1)); wallB.setAttribute('height', (336 - gapY - 22).toFixed(1));
    /* 撞上窄口：走到墙的位置还不在口子里，就停在墙边 */
    var CRASH = TOY.length - 1;
    for (var ci = 0; ci < TOY.length; ci++) if (TOY[ci][0] >= tube[34][0] - 8 && Math.abs(TOY[ci][1] - gapY) > 22) { CRASH = ci; TOY[ci] = [tube[34][0] - 8, TOY[ci][1]]; break; }
    var bang = cross(L, 0, 0, 14, C_BAD);
    bang.style.opacity = 0;
    var R = 424;
    /* 第 1 段：行为克隆 */
    var p1 = group(s);
    label(p1, R, 62, '行为克隆：看一眼，出一个动作', 'demo-x-ink', 13.5);
    chip(p1, R, 84, 110, '观测 $o_t$', C_FOLL, { size: 12.5 });
    chip(p1, R + 240, 84, 112, '动作 $a_t$', C_ENS, { size: 12.5 });
    var f1 = flowSeg(p1, C_MUTED, 3, 3, 50);
    label(p1, R + 176, 128, '监督学习', 'demo-x-mut', 11, 'middle');
    var ticks1 = cellGrid(p1, R, 144, 400, 50, 5, 2, C_ACCENT);
    var cnt1 = label(p1, R, 226, '', 'demo-x-ink', 13);
    label(p1, R, 252, '50 Hz、8 秒：一个回合要做 400 次决定', 'demo-x-ink2', 12);
    /* 第 2 段：滚雪球 */
    var p2 = group(s);
    label(p2, R, 62, '小误差 → 没见过的状态 → 更大的误差', 'demo-x-ink', 13.5);
    var cyc = [[R + 176, 104, '预测差一点'], [R + 290, 190, '状态偏一点'], [R + 62, 190, '训练里没见过']].map(function (c) {
      return chip(p2, c[0] - 62, c[1] - 14, 124, c[2], C_WARN, { size: 11.5 });
    });
    void cyc;
    var cy1 = flowSeg(p2, C_BAD, 2, 3, 55, true), cy2 = flowSeg(p2, C_BAD, 2, 3, 55, true), cy3 = flowSeg(p2, C_BAD, 2, 3, 55, true);
    hline(p2, R + 210, 120, R + 268, 172, C_BAD, 1.2, '3 4'); hline(p2, R + 226, 190, R + 128, 190, C_BAD, 1.2, '3 4'); hline(p2, R + 84, 172, R + 142, 120, C_BAD, 1.2, '3 4');
    label(p2, R, 240, '论文：精细活里毫米级的偏差就会失败，这个问题更突出', 'demo-x-ink2', 11.5);
    /* 第 3 段：老办法 */
    var p3 = group(s);
    label(p3, R, 62, '老办法，为什么这里不好用', 'demo-x-ink', 13.5);
    [['DAgger：让专家在线纠正', '用遥操作纠正又慢又别扭'], ['采示范时故意加噪声', '精细活一加噪声就失败'], ['离线合成纠正数据', '只适合低维状态或抓取']].forEach(function (r, i) {
      var y = 78 + i * 58;
      rectBox(p3, R, y, 352, 50, C_BORDER, C_SURFACE2);
      label(p3, R + 12, y + 20, r[0], 'demo-x-ink', 12);
      label(p3, R + 12, y + 40, r[1], 'demo-x-ink2', 11.5);
      cross(p3, R + 322, y + 16, 16);
    });
    label(p3, R, 270, '要一个能配合高维图像观测的办法', 'demo-x-ink2', 12);
    /* 第 4 段：人的示范里有停顿（我们数的） */
    var p4 = group(s);
    label(p4, R, 62, '另一个麻烦：人的示范里会停顿', 'demo-x-ink', 13.5);
    var spd = plotBox(p4, R, 78, 352, 96, 0, 400, 0, 1);
    var spdLine = pathLine(spd.g, [], C_HUMAN, 1.8), pauseBox = paint(svgEl('rect', { x: 0, y: 80, width: 0, height: 92, opacity: 0.18 }), C_WARN);
    spd.g.appendChild(pauseBox);
    var spdCap = label(p4, R, 192, '', 'demo-x-mut', 11);
    var pauseT = label(p4, R, 220, '', 'demo-x-ink', 12.5);
    label(p4, R, 246, '停着的时候状态几乎不变：单步策略不知道该停还是该走', 'demo-x-ink2', 11.5);
    /* 第 5 段：ACT 的思路 */
    var p5 = group(s);
    label(p5, R, 62, 'ACT 的思路：少做几次决定', 'demo-x-ink', 13.5);
    var big5 = label(p5, R, 110, '', 'demo-x-ink', 16);
    var row5 = cellGrid(p5, R, 136, 400, 50, 5, 2, C_ACCENT);
    var blocks5 = [0, 1, 2, 3].map(function (b) { var r = paint(svgEl('rect', { x: R + b * 88, y: 136, width: 84, height: 48, rx: 4, opacity: 0 }), CHUNK_COLORS[b]); p5.appendChild(r); return r; });
    label(p5, R, 214, '一次预测接下来 k 步，执行完再看', 'demo-x-ink2', 12);
    label(p5, R, 238, 'k = 100：400 步只要做 4 次决定', 'demo-x-ink', 12.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var n = Math.min(CRASH, Math.floor(((now % 9) / 7) * 40));
      setPath(traj, TOY.slice(0, n + 1)); moveDot(head, TOY[n]);
      stepT.textContent = '第 ' + (n * 10) + ' 步';
      bang.setAttribute('transform', 'translate(' + (TOY[CRASH][0] - 7).toFixed(1) + ',' + (TOY[CRASH][1] - 7).toFixed(1) + ')');
      bang.style.opacity = n >= CRASH ? 1 : 0;
      f1.at(now, [R + 114, 98], [R + 236, 98], true);
      var u1 = seg(since(t, clock, 0.4), 0.3, 2.6);
      ticks1.fill(Math.round(400 * u1));
      cnt1.textContent = Math.round(400 * u1) + ' 次';
      var o = [[R + 210, 120], [R + 268, 172]], o2 = [[R + 226, 190], [R + 128, 190]], o3 = [[R + 84, 172], [R + 142, 120]];
      cy1.at(now, o[0], o[1], true); cy2.at(now, o2[0], o2[1], true); cy3.at(now, o3[0], o3[1], true);
      if (REPRO && REPRO.human) {
        var H = REPRO.human, sp = H.pause_speed, pts = sp.map(function (v, i) { return [spd.px(i * 4), spd.py(Math.min(1, v / H.pause_speed_max))]; });
        var u4 = seg(since(t, clock, 10.4), 0.2, 2.2);
        setPath(spdLine, pts.slice(0, Math.max(1, Math.round(pts.length * u4))));
        pauseBox.setAttribute('x', spd.px(H.pause_span[0]).toFixed(1)); setW(pauseBox, spd.px(H.pause_span[1]) - spd.px(H.pause_span[0]));
        pauseBox.style.opacity = u4 > 0.9 ? 0.25 : 0;
        spdCap.textContent = '第 ' + H.pause_ep + ' 条人的示范：两只手指令的变化速度，黄底是停顿';
        pauseT.textContent = '50 条里 ' + H.pause_eps + ' 条在交接完成前停过 0.2 秒以上（最长 ' + f2(H.pause_longest / 50) + ' 秒）';
      }
      var u5 = seg(since(t, clock, 13.4), 0.3, 1.6);
      row5.g.style.opacity = 1 - u5;
      blocks5.forEach(function (b) { b.style.opacity = u5 * 0.85; });
      big5.textContent = u5 < 0.5 ? '400 次决定' : '4 次决定';
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: 动作分块：一次预测 k 步 ── */
  function buildSceneChunk() {
    var s = sceneSvg('左上是我们复现的仿真：两只 ViperX 机械臂交接红色方块，策略每 100 步看一次、把预测的 100 步动作照着执行完。' +
      '左下是这一回合里右臂一个关节的目标角，四段颜色是四次查询给出的四个动作块，块与块的接缝处会跳一下。右边依次出现：一次预测 k 步的写法；' +
      '论文图 2 上半；心理学里的动作分块；停顿可以装在一个块里；开环执行的毛病：接缝处跳');
    s.appendChild(svgText(24, 26, '我们的复现：每 100 步看一次，照着做完 100 步', 'demo-x-ink2', 13.5));
    var spr = simSprite(s, 'chunk_ep0.webp');
    var stepT = label(s, 404, 64, '', 'demo-x-ink2', 11.5, 'end');
    var pb = plotBox(s, 24, 186, 380, 150, 0, 400, -1, 1);
    var segs = [0, 1, 2, 3].map(function (b) { return pathLine(pb.g, [], CHUNK_COLORS[b], 2.4); });
    var cursor = hline(pb.g, 24, 188, 24, 334, C_INK, 1.2, '3 3');
    var jumps = [1, 2, 3].map(function () { return ringAt(pb.g, 0, 0, 7, C_BAD, 2); });
    var axT = label(s, 24, 354, '', 'demo-x-mut', 11);
    label(s, 404, 354, '横轴：第几步（0–400）', 'demo-x-mut', 11, 'end');
    var capT = label(s, 24, 376, '', 'demo-x-ink2', 11.5);
    label(s, 24, 398, '四种颜色 = 第 0、100、200、300 步那四次查询给出的块；红圈 = 接缝', 'demo-x-mut', 11);
    var R = 424;
    /* 第 1 段：写法 */
    var p1 = group(s);
    label(p1, R, 62, '一次预测 k 步', 'demo-x-ink', 13.5);
    math(p1, R, 98, '\\pi_\\theta(a_t \\mid s_t)', 15);
    var one = paint(svgEl('rect', { x: R + 200, y: 82, width: 18, height: 22, rx: 3 }), C_ACCENT);
    p1.appendChild(one);
    math(p1, R, 150, '\\pi_\\theta(a_{t:t+k} \\mid s_t)', 15);
    var many = [];
    for (var i = 0; i < 8; i++) { var r = paint(svgEl('rect', { x: R + 200 + i * 20, y: 134, width: 16, height: 22, rx: 3 }), CHUNK_COLORS[i % 4]); p1.appendChild(r); many.push(r); }
    label(p1, R, 196, '一次看到的观测，换来接下来 k 个目标关节角', 'demo-x-ink2', 12);
    label(p1, R, 220, '每 k 步才重新看一次', 'demo-x-ink2', 12);
    /* 第 2 段：论文图 2 上半 */
    var p2 = group(s);
    label(p2, R, 62, '论文图 2 上半：k = 4 的例子', 'demo-x-ink', 13.5);
    paperPart(p2, 'fig2te', 0, 0, 1, 0.33, R + 30, 78, 290, '');
    label(p2, R, 216, '第 0 步预测 0–3，第 4 步再预测 4–7', 'demo-x-ink2', 12);
    var hz2 = label(p2, R, 246, '', 'demo-x-ink', 13);
    /* 第 3 段：心理学里的 chunking。同样四个姿势（复现回合里右手夹起方块的第 110–200 步，每 30 步一帧）排两排：
       上排每个动作都看一次、决定一次；下排合成一个块，只在开头看一次，后面照着做完 */
    var p3 = group(s);
    label(p3, R, 62, '名字来自心理学：动作分块', 'demo-x-ink', 13.5);
    label(p3, R, 84, '一串动作合成一个单元，存起来、做起来都更省事', 'demo-x-ink2', 12);
    var CH3 = [110, 140, 170, 200], TW = 80, TG = 8;
    function row3(y) {
      return CH3.map(function (st, i) {
        var x = R + 4 + i * (TW + TG), sp = simSprite(p3, 'te_ep0.webp', [146, 18, 184, 104]);
        var h = sp.put(x, y, TW, st);
        return { x: x, y: y, h: h, sp: sp, st: st, frame: rectBox(p3, x - 2, y - 2, TW + 4, h + 4, C_BORDER, 'none') };
      });
    }
    label(p3, R, 108, '一步一步：每个动作都看一次、决定一次', 'demo-x-ink2', 11.5);
    var cntA = tone(p3, R + 352, 108, '', C_WARN, 11.5, 'end');
    var rowA = row3(140);
    var seeA = rowA.map(function (c) { return tone(p3, c.x + TW / 2, c.y - 10, '看', C_WARN, 11.5, 'middle'); });
    label(p3, R, 214, '合成一个块：开头看一次，后面照着做完', 'demo-x-ink2', 11.5);
    tone(p3, R + 352, 214, '决定 1 次', C_GOOD, 11.5, 'end');
    var rowB = row3(250);
    var blockB = rectBox(p3, R, 224, 352, rowB[0].h + 32, C_GOOD, 'none');
    var seeB = tone(p3, rowB[0].x + TW / 2, 240, '看', C_WARN, 11.5, 'middle');
    label(p3, R, 322, '复现回合第 110–200 步，每 30 步一帧（示意）', 'demo-x-mut', 11);
    label(p3, R, 344, '论文的例子：「捏住糖纸的一个角」「把电池塞进槽里」', 'demo-x-ink2', 11.5);
    /* 第 4 段：停顿装进块里 */
    var p4 = group(s);
    label(p4, R, 62, '停顿可以装在一个块里', 'demo-x-ink', 13.5);
    var sp4 = plotBox(p4, R, 80, 352, 80, 0, 1, 0, 1);
    var sp4l = pathLine(sp4.g, [], C_HUMAN, 2);
    var blk4 = rectBox(p4, 0, 76, 160, 88, C_GOOD, 'none', '5 4');
    tone(p4, R + 4, 182, '速度：中间有一段停着', C_HUMAN, 11.5);
    tone(p4, R + 352, 182, '虚线框：一个动作块', C_GOOD, 11.5, 'end');
    label(p4, R, 212, '块里写着「先停一会儿，再接着走」，不用看历史', 'demo-x-ink2', 12);
    label(p4, R, 236, '论文：靠历史的策略会有因果混淆，分块没有这个问题', 'demo-x-ink2', 11.5);
    /* 第 5 段：接缝处跳 */
    var p5 = group(s);
    label(p5, R, 62, '直接这样做的毛病：接缝处会跳', 'demo-x-ink', 13.5);
    label(p5, R, 86, '新观测每 k 步才进来一次，进来就突然改主意', 'demo-x-ink2', 12);
    var j5 = label(p5, R, 124, '', 'demo-x-ink', 12.5);
    var j5b = label(p5, R, 148, '', 'demo-x-ink2', 12);
    var bars5 = [barRowAt(p5, R, 170, 120, '接缝处跳一步', C_BAD, 16, 11.5), barRowAt(p5, R, 196, 120, '平时一步走', C_ACCENT, 16, 11.5)];
    label(p5, R, 246, '下一幕：每一步都问，再把重叠的预测平均起来', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var step = loopStep(now);
      spr.put(24, 46, 320, step);
      stepT.textContent = '第 ' + step + ' 步';
      if (REPRO) {
        var C = REPRO.chunk, a = C.exec, lo = C.range[0], hi = C.range[1];
        var py = function (v) { return pb.py(-1 + 2 * (v - lo) / (hi - lo)); };
        segs.forEach(function (p, b) {
          var pts = [];
          for (var k = b * 100; k < Math.min(400, b * 100 + 101); k++) pts.push([pb.px(k), py(a[Math.min(399, k)])]);
          setPath(p, pts);
        });
        setLine(cursor, pb.px(step), 188, pb.px(step), 334);
        jumps.forEach(function (c, j) { moveDot(c, [pb.px((j + 1) * 100), py(a[(j + 1) * 100])]); c.style.opacity = since(t, clock, 13.4) > 0.6 ? 1 : 0; });
        axT.textContent = '纵轴：' + C.name + '的目标角（rad）';
        capT.textContent = '这一回合最后' + (C.success ? '成功交接' : '没交接成功') + '（同一个方块位置，下一幕的时间集成' + (REPRO.te.success ? '成功了' : '也没成功') + '）';
        j5.textContent = '我们这一回合：接缝处最大跳 ' + f3(C.jump_max) + ' rad';
        j5b.textContent = '同一个关节，块内一步平均只走 ' + f3(C.step_mean) + ' rad';
        var u5 = seg(since(t, clock, 13.4), 0.3, 1.6);
        bars5[0].set(170 * K.ease(u5), f3(C.jump_max) + ' rad');
        bars5[1].set(170 * C.step_mean / C.jump_max * K.ease(u5), f3(C.step_mean) + ' rad');
      }
      var u1 = seg(since(t, clock, 0.4), 0.4, 2.4);
      many.forEach(function (r, i) { r.style.opacity = u1 * 8 > i ? 1 : 0.12; });
      hz2.textContent = '400 步 ÷ k = 100 → 只做 4 次决定';
      /* 两排一起往右走：上排走到哪格，哪格亮黄、写「看」；下排只有第一格有「看」，走到的格子亮蓝（照着做） */
      var per3 = clock == null ? 0.55 : 0.9, u3 = since(t, clock, 7.0) - 0.4, cyc3 = per3 * 4 + (clock == null ? 0.4 : 1.4);
      var ph3 = u3 < 0 ? -1 : u3 % cyc3, cur3 = ph3 < 0 ? -1 : Math.min(3, Math.floor(ph3 / per3)), moving3 = ph3 >= 0 && ph3 < per3 * 4;
      rowA.forEach(function (c, i) {
        paint(c.frame, null, moving3 && i === cur3 ? C_WARN : C_BORDER);
        seeA[i].style.opacity = i <= cur3 ? 1 : 0;
      });
      cntA.textContent = '决定 ' + (cur3 < 0 ? 0 : cur3 + 1) + ' 次';
      rowB.forEach(function (c, i) { paint(c.frame, null, moving3 && i === cur3 ? C_ACCENT : C_BORDER); });
      seeB.style.opacity = cur3 >= 0 ? 1 : 0;
      void blockB;
      var pts4 = [];
      for (var k = 0; k <= 100; k++) { var x = k / 100, v = x < 0.4 ? 0.7 + 0.15 * Math.sin(x * 20) : x < 0.62 ? 0.04 : 0.6 + 0.2 * Math.sin(x * 14); pts4.push([sp4.px(x), sp4.py(v)]); }
      setPath(sp4l, pts4);
      blk4.setAttribute('x', (sp4.px(0.3)).toFixed(1));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 时间集成：每步都问，重叠的预测取加权平均 ── */
  function buildSceneEnsemble() {
    var s = sceneSvg('左上是我们复现的仿真：同一个方块位置，策略每一步都查询一次。左下是右夹爪：竖线所在的这一步，前面 100 次查询都对它做过预测，' +
      '每个点是一次预测，点越大权重越高，绿线是加权平均，也就是真正发出去的目标。右边依次出现：重叠的预测表；指数权重；m 的大小；和普通平滑的区别；代价');
    s.appendChild(svgText(24, 26, '我们的复现：每一步都查询，重叠的预测取加权平均', 'demo-x-ink2', 13.5));
    var spr = simSprite(s, 'te_ep0.webp');
    var stepT = label(s, 404, 64, '', 'demo-x-ink2', 11.5, 'end');
    var pb = plotBox(s, 24, 186, 380, 150, 0, 100, -0.05, 1.2);
    var dots = [];
    for (var i = 0; i < 100; i++) dots.push(dotAt(pb.g, 0, 0, 2.5, C_MUTED));
    var ensL = hline(pb.g, 24, 0, 404, 0, C_ENS, 2.4), ensT = tone(s, 400, 0, '', C_ENS, 11.5, 'end');
    label(s, 24, 354, '纵轴：右夹爪的目标开度（1 张开，0 合上）', 'demo-x-mut', 11);
    label(s, 404, 354, '横轴：哪一次查询（左老右新）', 'demo-x-mut', 11, 'end');
    var capT = label(s, 24, 376, '', 'demo-x-ink2', 11.5);
    lineLegend(s, 24, 398, [['加权平均（发出去的目标）', C_ENS]], 11);
    var R = 424;
    /* 第 1 段：重叠表 */
    var p1 = group(s);
    label(p1, R, 62, '每一步都查询：同一步收到好几个预测', 'demo-x-ink', 13.5);
    var grid = [];
    for (var q = 0; q < 4; q++) for (var j = 0; j < 4; j++) {
      var c = paint(svgEl('rect', { x: R + 60 + (q + j) * 40, y: 86 + q * 34, width: 32, height: 26, rx: 3 }), CHUNK_COLORS[j]);
      p1.appendChild(c); grid.push({ c: c, col: q + j });
    }
    [0, 1, 2, 3].forEach(function (q) { label(p1, R, 104 + q * 34, '第 ' + q + ' 步', 'demo-x-ink2', 11.5); });
    var colBox = rectBox(p1, 0, 80, 40, 140, C_ENS, 'none');
    colBox.setAttribute('stroke-width', 2.4);
    var colT = label(p1, R, 246, '', 'demo-x-ink', 12.5);
    /* 第 2 段：权重 */
    var p2 = group(s);
    rich(p2, R, 62, '权重：$w_i = e^{-m\\,i}$，$i = 0$ 是最老的预测', 13.5, 'demo-x-ink');
    var wb = [];
    for (i = 0; i < 100; i++) { var vb = vbar(p2, R + 4 + i * 3.4, 2.6, C_WARN); wb.push(vb); }
    hline(p2, R, 190, R + 350, 190, C_BORDER, 1.2);
    label(p2, R, 208, '最老', 'demo-x-ink2', 11.5); label(p2, R + 350, 208, '最新', 'demo-x-ink2', 11.5, 'end');
    var wT = label(p2, R, 236, '', 'demo-x-ink', 12.5), wT2 = label(p2, R, 260, '', 'demo-x-ink2', 12);
    /* 第 3 段：m 的大小 */
    var p3 = group(s);
    label(p3, R, 62, 'm 越小，新的观测进来得越快', 'demo-x-ink', 13.5);
    var mb = [];
    for (i = 0; i < 100; i++) mb.push(vbar(p3, R + 4 + i * 3.4, 2.6, C_WARN));
    hline(p3, R, 190, R + 350, 190, C_BORDER, 1.2);
    var mT = label(p3, R, 214, '', 'demo-x-ink', 13);
    label(p3, R, 240, '官方代码写死 m = 0.01；论文没给数', 'demo-x-ink2', 12);
    label(p3, R, 262, '图 2 的 0.5、0.3、0.2、0.1 只是示意：加起来是 1.1', 'demo-x-mut', 11);
    /* 第 4 段：和平滑的区别 */
    var p4 = group(s);
    label(p4, R, 62, '不是把相邻几步抹平', 'demo-x-ink', 13.5);
    rectBox(p4, R, 78, 170, 150, C_BORDER, C_SURFACE2);
    rectBox(p4, R + 182, 78, 170, 150, C_ENS, C_SURFACE2);
    label(p4, R + 85, 100, '普通平滑', 'demo-x-ink', 12, 'middle');
    label(p4, R + 267, 100, '时间集成', 'demo-x-ink', 12, 'middle');
    var nb4 = [0, 1, 2].map(function (k) { return paint(p4.appendChild(svgEl('rect', { x: R + 40 + k * 32, y: 130, width: 26, height: 26, rx: 3 })), k === 1 ? C_ACCENT : C_MUTED); });
    void nb4;
    rich(p4, R + 85, 182, '把 $t-1$、$t$、$t+1$ 平均', 11.5, 'demo-x-ink2', 'middle', 160);
    label(p4, R + 85, 206, '会带偏差', 'demo-x-bad', 11.5, 'middle');
    [0, 1, 2].forEach(function (k) { p4.appendChild(paint(svgEl('rect', { x: R + 254, y: 116 + k * 22, width: 26, height: 18, rx: 3 }), CHUNK_COLORS[k])); });
    label(p4, R + 267, 192, '同一步的几次预测', 'demo-x-ink2', 11.5, 'middle');
    label(p4, R + 267, 212, '平均', 'demo-x-ink2', 11.5, 'middle');
    label(p4, R, 256, '论文：前者是拿相邻步的动作混，有偏；后者混的都是「这一步」', 'demo-x-ink2', 11.5);
    /* 第 5 段：代价 */
    var p5 = group(s);
    label(p5, R, 62, '代价：训练不变，推理多算', 'demo-x-ink', 13.5);
    var q5 = [barRowAt(p5, R, 86, 90, '开环分块', C_ACCENT, 16, 11.5), barRowAt(p5, R, 112, 90, '时间集成', C_ENS, 16, 11.5)];
    label(p5, R, 152, '一个 400 步的回合要查询几次', 'demo-x-mut', 11);
    var c5 = label(p5, R, 184, '', 'demo-x-ink', 12.5), c5b = label(p5, R, 208, '', 'demo-x-ink2', 12);
    label(p5, R, 240, '论文：一次推理约 0.01 秒（RTX 2080 Ti），50 Hz 够用', 'demo-x-ink2', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var step = loopStep(now);
      spr.put(24, 46, 320, step);
      stepT.textContent = '第 ' + step + ' 步';
      /* 左下：在右夹爪快要合上的第 138–166 步之间来回扫（这一回合右指在第 160 步碰到方块），预测在这里分歧最大 */
      var ts = Math.round(152 + 14 * Math.sin(now * 0.45));
      if (REPRO) {
        var list = predsFor('rgrip', ts), ws = list.map(function (p, i) { return Math.exp(-0.01 * i); }), wmax = ws[0];
        dots.forEach(function (d, i) {
          var p = list[i];
          if (!p) { d.style.opacity = 0; return; }
          moveDot(d, [pb.px(i), pb.py(p[1])]);
          d.setAttribute('r', (1.6 + 2.6 * ws[i] / wmax).toFixed(2));
          d.style.opacity = 0.85;
        });
        var e = ensemble(list, 0.01);
        setLine(ensL, 24, pb.py(e), 404, pb.py(e));
        ensT.setAttribute('y', (pb.py(e) - 6).toFixed(1));
        ensT.textContent = '';
        capT.textContent = '竖着看第 ' + ts + ' 步：100 次预测从 ' + f2(Math.max.apply(null, list.map(function (p) { return p[1]; }))) +
          ' 到 ' + f2(Math.min.apply(null, list.map(function (p) { return p[1]; }))) + '，加权平均 ' + f2(e);
      }
      var colU = Math.floor(now / 1.2) % 4 + 3;
      grid.forEach(function (g) { g.c.style.opacity = g.col === Math.min(colU, 3) || colU > 3 && g.col === 3 ? 1 : 0.3; });
      colBox.setAttribute('x', (R + 60 + 3 * 40 - 4).toFixed(1));
      colT.textContent = '第 3 步：4 个块各给了一个预测';
      var w0 = 1, s0 = 0, kk;
      for (kk = 0; kk < 100; kk++) s0 += Math.exp(-0.01 * kk);
      wb.forEach(function (b, i) { b.set(190, 92 * Math.exp(-0.01 * i) * seg(since(t, clock, 3.6), 0.2 + i * 0.01, 0.8 + i * 0.01)); });
      wT.textContent = '代码里 m = 0.01：最老的权重 1，最新的 ' + f2(Math.exp(-0.99));
      wT2.textContent = '归一化后最老 ' + f1(100 * w0 / s0) + '%，最新 ' + f1(100 * Math.exp(-0.99) / s0) + '%；老的一半占 62%';
      var ms = [0, 0.01, 0.05, 0.1], mi = Math.floor(since(t, clock, 7.0) / 1.6) % 4, m = ms[mi];
      mb.forEach(function (b, i) { b.set(190, 92 * Math.exp(-m * i)); });
      mT.textContent = 'm = ' + m + (m === 0 ? '：100 个一样重' : m === 0.01 ? '：官方代码的取值' : '：越来越只听老的预测');
      var u5 = seg(since(t, clock, 13.4), 0.2, 1.6);
      q5[0].set(200 * 4 / 400 * K.ease(u5) + 2, '4 次'); q5[1].set(200 * K.ease(u5), '400 次');
      c5.textContent = REPRO ? '我们在 CPU 上：一次 ' + f2(REPRO.cpu_s) + ' 秒' : '';
      c5b.textContent = REPRO ? '8 秒的回合要算约 ' + Math.round(400 * REPRO.cpu_s) + ' 秒，赶不上实时' : '';
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 7: 人的示范不唯一 ── */
  function buildSceneHuman() {
    var s = sceneSvg('左边是仿真里 50 条人的示范（官方放出的方块交接人类示范）：每条细线是一条示范里右夹爪的目标开度，圆点是合上的那一步，' +
      '下面是合上时刻的分布。右边依次出现：同一个场景每次做得不一样；官方仿真模型按 10 条人的示范摆出交接那一刻，交接点每次不同；两种走法平均起来会撞上（示意）；表一里从脚本示范换到人的示范都掉了；我们数的时刻');
    s.appendChild(svgText(24, 26, '50 条人的示范：右夹爪什么时候合上', 'demo-x-ink2', 13.5));
    var pb = plotBox(s, 24, 44, 380, 200, 0, 400, -0.05, 1.35);
    var lines = [], marks = [];
    for (var i = 0; i < 50; i++) { var p = pathLine(pb.g, [], C_HUMAN, 1); p.style.opacity = 0.35; lines.push(p); marks.push(dotAt(pb.g, 0, 0, 3, C_HUMAN)); }
    var hl = pathLine(pb.g, [], C_WARN, 2.4);
    label(s, 24, 262, '纵轴：右夹爪的目标开度（1 张开，0 合上）', 'demo-x-mut', 11);
    var hb = plotBox(s, 24, 276, 380, 80, 0, 400, 0, 1);
    var hist = [];
    for (i = 0; i < 20; i++) hist.push(vbar(hb.g, 24 + i * 19 + 2, 15, C_HUMAN));
    label(s, 24, 374, '下面：几条示范在这里合上（每格 20 步）；横轴都是第几步', 'demo-x-mut', 11);
    var capT = label(s, 24, 396, '', 'demo-x-ink2', 11.5);
    var R = 424;
    /* 第 1 段 */
    var p1 = group(s);
    label(p1, R, 62, '同一个场景，人每次做得不一样', 'demo-x-ink', 13.5);
    label(p1, R, 88, '不讲究精度的地方，人会更随意', 'demo-x-ink2', 12);
    label(p1, R, 112, '要精确的地方才收紧（论文引的最优控制观点）', 'demo-x-ink2', 12);
    var fan = [];
    for (i = 0; i < 9; i++) fan.push(pathLine(p1, [], C_HUMAN, 1.6));
    var gate = ringAt(p1, R + 290, 190, 6, C_WARN, 2.4);
    void gate;
    label(p1, R + 290, 218, '要精确的点', 'demo-x-ink2', 11.5, 'middle');
    /* 第 2 段：交接位置 */
    var p2 = group(s);
    label(p2, R, 62, '交接的位置每次都不一样', 'demo-x-ink', 13.5);
    label(p2, R, 86, '论文的例子：备胶带时在空中把胶带交给左手', 'demo-x-ink2', 12);
    /* 官方 ACT 模型按官方仿真人类示范第 0、5、…、45 条在左夹爪合上那一步的关节角摆出来；方块不在数据里，
       按我们复现里右夹爪夹住它的位置画。紫点是这 10 条里方块的位置 */
    var HM = MODEL && MODEL.handover, hoS = HM ? modelSheet(p2, 'handover.webp', HM) : null, HOX = R + 6, HOY = 96, HOW = 340;
    var meet = [];
    if (HM) {
      hoS.put(HOX, HOY, HOW, 0);
      HM.cube.forEach(function (c) { meet.push(dotAt(p2, hoS.at(c)[0], hoS.at(c)[1], 3.4, C_HUMAN)); });
    }
    var hoT = label(p2, R + 352, 242, '', 'demo-x-ink2', 11, 'end');
    tone(p2, R, 264, '50 条示范：交接点在约 6 × 6 × 5 cm 的范围里变', C_HUMAN, 11.5);
    label(p2, R, 286, '策略该学的是「别撞上、接得住」，而不是死记交接点在哪', 'demo-x-ink2', 11.5);
    label(p2, R, 308, '官方仿真模型；方块没存在数据里，按复现里夹住的位置画', 'demo-x-mut', 11);
    /* 第 3 段：两种走法平均 → 撞 */
    var p3 = group(s);
    label(p3, R, 62, '两种走法平均一下，正好撞上', 'demo-x-ink', 13.5);
    var obs = paint(svgEl('rect', { x: R + 156, y: 120, width: 40, height: 60, rx: 4 }), C_MUTED);
    p3.appendChild(obs);
    var up = [], dn = [], av = [];
    for (i = 0; i <= 30; i++) { var x = R + 20 + i * 10.6, b = Math.exp(-Math.pow((i - 15) / 6, 2)); up.push([x, 150 - 62 * b]); dn.push([x, 150 + 62 * b]); av.push([x, 150]); }
    pathLine(p3, up, C_HUMAN, 2); pathLine(p3, dn, C_HUMAN, 2);
    var avg = pathLine(p3, [], C_BAD, 2.6, '6 4'), bang = tone(p3, R + 176, 112, '', C_BAD, 16, 'middle');
    lineLegend(p3, R, 236, [['人的两种走法', C_HUMAN], ['逐点平均', C_BAD, '6 4']], 11);
    label(p3, R, 262, '示意（玩具）：只学平均值的回归会走中间', 'demo-x-mut', 11);
    /* 第 4 段：表一 脚本 → 人 */
    var p4 = group(s);
    label(p4, R, 62, '表一：从脚本示范换成人的示范', 'demo-x-ink', 13.5);
    var dropRows = [['ACT · 方块交接', 86, 50], ['ACT · 双臂插销', 32, 20], ['BeT · 方块交接', 27, 1]].map(function (r, i) {
      var y = 74 + i * 62;
      label(p4, R, y + 11, r[0], 'demo-x-ink2', 11.5);
      return { a: barRowAt(p4, R, y + 22, 50, '脚本', C_SCRIPT, 13, 11), b: barRowAt(p4, R, y + 42, 50, '人', C_HUMAN, 13, 11), v: r };
    });
    label(p4, R, 272, '成功率（%）；所有方法都掉了', 'demo-x-mut', 11);
    /* 第 5 段：我们数的 */
    var p5 = group(s);
    label(p5, R, 62, '我们在这 50 条示范里数的', 'demo-x-ink', 13.5);
    var n5 = label(p5, R, 98, '', 'demo-x-ink', 13), n5b = label(p5, R, 124, '', 'demo-x-ink2', 12);
    label(p5, R, 160, '脚本示范：方块放在哪，轨迹就定了', 'demo-x-ink2', 12);
    label(p5, R, 184, '论文：脚本数据集「完全确定」', 'demo-x-ink2', 12);
    label(p5, R, 220, '人的示范：同一件事，时机、快慢、路线都不同', 'demo-x-ink', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      if (REPRO && REPRO.human) {
        var H = REPRO.human, hi = Math.floor(now / 1.5) % 50;
        lines.forEach(function (pl, e) {
          var tr = H.rgrip[e];
          setPath(pl, tr.map(function (v, k) { return [pb.px(k * 4), pb.py(v)]; }));
          var cs = H.close[e];
          moveDot(marks[e], [pb.px(cs), pb.py(tr[Math.min(tr.length - 1, Math.round(cs / 4))])]);
        });
        setPath(hl, H.rgrip[hi].map(function (v, k) { return [pb.px(k * 4), pb.py(v)]; }));
        var counts = [];
        for (var b = 0; b < 20; b++) counts.push(0);
        H.close.forEach(function (c) { counts[Math.min(19, Math.floor(c / 20))]++; });
        var cmax = Math.max.apply(null, counts);
        hist.forEach(function (h, b) { h.set(356, 70 * counts[b] / cmax); });
        capT.textContent = '黄线：第 ' + hi + ' 条，在第 ' + H.close[hi] + ' 步合上';
        n5.textContent = '右夹爪合上：第 ' + H.close_min + '–' + H.close_max + ' 步（' + f1(H.close_min / 50) + '–' + f1(H.close_max / 50) + ' 秒）';
        n5b.textContent = '左夹爪接过去：第 ' + H.lclose_min + '–' + H.lclose_max + ' 步';
      }
      fan.forEach(function (pl, k) {
        var pts = [], off = (k - 4) * 9;
        for (var j = 0; j <= 30; j++) { var x = R + 10 + j * 9.4, w = Math.max(0, 1 - Math.abs(x - (R + 290)) / 120); pts.push([x, 160 + off * (1 - w) + 6 * Math.sin(j * 0.5 + k + now) * (1 - w) + 30 * w]); }
        setPath(pl, pts);
      });
      if (HM) {
        var mi = Math.floor(now / 1.2) % HM.n;
        hoS.put(HOX, HOY, HOW, mi);
        meet.forEach(function (d, k) { d.style.opacity = k === mi ? 1 : 0.4; });
        hoT.textContent = '第 ' + HM.eps[mi] + ' 条示范，第 ' + HM.steps[mi] + ' 步';
      }
      var u3 = seg(since(t, clock, 7.0), 0.5, 2.5), n3 = Math.round(30 * u3);
      setPath(avg, av.slice(0, n3 + 1));
      bang.textContent = n3 >= 13 ? '撞' : '';
      var u4 = seg(since(t, clock, 10.4), 0.2, 1.6);
      dropRows.forEach(function (r) { r.a.set(250 * r.v[1] / 100 * K.ease(u4), r.v[1] + '%'); r.b.set(250 * r.v[2] / 100 * K.ease(u4), r.v[2] + '%'); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: CVAE：给动作一个风格变量 z ── */
  /* 第 8 幕讲 L1、L2、KL 用的玩具（我们编的数，不是论文的）：四步的示范和预测，误差 e = 预测 − 示范；
     L1 = 平均 |e| = 0.2，L2 = 平均 e² = 0.07；最后一步占总和的比例 62.5% → 89.3%。
     KL 是一维正态 N(μ, σ²) 到标准正态的 ½(μ² + σ² − 1 − ln σ²)：重合 0，μ = 1 时 0.5，σ = 0.5 时 0.318；官方代码 policy.py 把 32 维加起来 */
  var LOSS_TOY = { demo: [0.40, 0.65, 0.55, 0.75], err: [0.1, -0.1, 0.1, -0.5] };
  var KL_TOY = [[0, 1], [1, 1], [0, 0.5]];
  function klNormal(mu, sigma) {
    return 0.5 * (mu * mu + sigma * sigma - 1 - 2 * Math.log(sigma));
  }
  function buildSceneCvae() {
    var s = sceneSvg('左上是论文图 3：左边黄色的是 CVAE 的编码器，右边蓝色的是解码器也就是策略。左下是训练和测试两条流程：训练时编码器看示范的动作块算出 z，' +
      '测试时编码器扔掉、z 取 0。右边依次出现：编码器和解码器各看什么；损失是 L1 加 β 倍 KL；L1 的例子：四步的误差取绝对值再平均；L2 的例子：同样的误差先平方再平均，' +
      '最后一步占的比例从六成多变成将近九成；KL 的例子：编码器给的钟形曲线和标准正态重合、挪开、变窄时 KL 怎么变；β 越大 z 里的信息越少；测试时 z = 0；我们的复现里 z 几乎不带信息');
    s.appendChild(svgText(24, 26, '把策略训成一个条件 VAE', 'demo-x-ink2', 13.5));
    var fig = paperPart(s, 'fig3', 0, 0, 1, 1, 24, 46, 380, '');
    void fig;
    label(s, 24, 168, '论文图 3：黄 = 编码器（只在训练时用），蓝 = 解码器，也就是策略', 'demo-x-mut', 11);
    /* 左下：训练 / 测试的流程 */
    var F = group(s);
    var bxs = {
      demo: chip(F, 24, 196, 128, '示范的 k 步动作', C_HUMAN, { size: 11.5 }),
      enc: chip(F, 24, 250, 128, '编码器', C_WARN, { size: 12 }),
      z: chip(F, 176, 250, 60, '$z$', C_INK, { size: 13 }),
      obs: chip(F, 260, 196, 144, '4 张图 + 关节角', C_FOLL, { size: 11.5 }),
      dec: chip(F, 260, 250, 144, '解码器 = 策略', C_ACCENT, { size: 12 }),
      out: chip(F, 260, 304, 144, '预测的 k 步动作', C_ENS, { size: 11.5 })
    };
    var mode = label(F, 24, 330, '', 'demo-x-ink', 13);
    var fz1 = flowSeg(F, C_WARN, 2, 3, 40), fz2 = flowSeg(F, C_INK, 2, 3, 40), fz3 = flowSeg(F, C_FOLL, 2, 3, 40), fz4 = flowSeg(F, C_ENS, 2, 3, 40), fz0 = flowSeg(F, C_HUMAN, 2, 3, 40);
    var zero = tone(F, 206, 236, '', C_BAD, 12, 'middle');
    var R = 424;
    /* 第 1 段 */
    var p1 = group(s);
    label(p1, R, 62, '两半：编码器和解码器', 'demo-x-ink', 13.5);
    rich(p1, R, 94, '编码器 $q_\\phi(z \\mid a_{t:t+k},\\, \\bar o_t)$', 13, 'demo-x-ink2');
    label(p1, R, 116, '看示范的 k 步动作 + 关节角（不看图）', 'demo-x-ink2', 11.5);
    rich(p1, R, 152, '解码器 $\\pi_\\theta(\\hat a_{t:t+k} \\mid o_t,\\, z)$', 13, 'demo-x-ink2');
    label(p1, R, 174, '看图 + 关节角 + z，出 k 步动作', 'demo-x-ink2', 11.5);
    label(p1, R, 210, 'z 叫「风格变量」：同样的画面，用哪种方式做', 'demo-x-ink', 12);
    label(p1, R, 234, '（代码里 z 是 32 维；论文没写）', 'demo-x-mut', 11);
    /* 第 2 段：损失 */
    var p2 = group(s);
    label(p2, R, 62, '损失：重建 + β × 正则', 'demo-x-ink', 13.5);
    math(p2, R, 100, '\\mathcal{L} = \\mathcal{L}_{\\text{reconst}} + \\beta\\,\\mathcal{L}_{\\text{reg}}', 15);
    label(p2, R, 136, '重建：预测和示范的 k 步动作差多少（L1）', 'demo-x-ink2', 12);
    label(p2, R, 158, '正则：z 的分布离标准正态多远（KL）', 'demo-x-ink2', 12);
    var bal = group(p2);
    hline(bal, R + 60, 214, R + 290, 214, C_INK, 3);
    var pan1 = rectBox(bal, 0, 0, 70, 20, C_ACCENT, C_SURFACE2), pan2 = rectBox(bal, 0, 0, 70, 20, C_WARN, C_SURFACE2);
    var bt1 = label(bal, 0, 0, 'L1', 'demo-x-ink', 11.5, 'middle'), bt2 = label(bal, 0, 0, '10 × KL', 'demo-x-ink', 11.5, 'middle');
    paint(bal.appendChild(svgEl('path', { d: 'M ' + (R + 175) + ' 214 l -10 26 l 20 0 z' })), C_MUTED);
    label(p2, R, 262, '附录表 III：β = 10', 'demo-x-ink2', 12);
    /* 第 3、4 段：L1 和 L2，同一组误差（玩具） */
    var pE = group(s);
    var eTitle = label(pE, R, 62, '', 'demo-x-ink', 13.5);
    var ep = plotBox(pE, R, 70, 352, 84, -0.5, 4.7, 0.2, 0.85);
    var demoPts = LOSS_TOY.demo.map(function (v, i) { return [ep.px(i), ep.py(v)]; });
    var predPts = LOSS_TOY.demo.map(function (v, i) { return [ep.px(i), ep.py(v + LOSS_TOY.err[i])]; });
    pathLine(pE, demoPts, C_HUMAN, 1.8, '5 4');
    pathLine(pE, predPts, C_ACCENT, 1.8);
    var errSegs = LOSS_TOY.err.map(function () { return hline(pE, 0, 0, 0, 0, C_BAD, 3.2); });
    demoPts.forEach(function (p) { dotAt(pE, p[0], p[1], 2.6, C_HUMAN); });
    predPts.forEach(function (p) { dotAt(pE, p[0], p[1], 2.8, C_ACCENT); });
    lineLegend(pE, R, 172, [['示范', C_HUMAN, '5 4'], ['预测', C_ACCENT], ['每步的差距', C_BAD]], 11);
    var BASE = 246, UNIT = 112;
    var eBars = LOSS_TOY.err.map(function (e, i) { return vbar(pE, ep.px(i) - 17, 34, i === 3 ? C_BAD : C_MUTED); });
    var eVal = LOSS_TOY.err.map(function (e, i) { return label(pE, ep.px(i), 0, '', 'demo-x-ink', 11, 'middle'); });
    hline(pE, R, BASE, R + 352, BASE, C_BORDER, 1.2);
    LOSS_TOY.err.forEach(function (e, i) { label(pE, ep.px(i), BASE + 13, '第 ' + (i + 1) + ' 步', 'demo-x-mut', 10.5, 'middle'); });
    var MX = R + 305, meanBar = vbar(pE, MX - 17, 34, C_GOOD);
    var meanVal = tone(pE, MX, 0, '', C_GOOD, 11.5, 'middle');
    tone(pE, MX, BASE + 13, '平均', C_GOOD, 10.5, 'middle');
    var barKind = rich(pE, R + 352, 190, '', 11.5, 'demo-x-ink2', 'end');
    var shareG = group(pE);
    var shareSeg = [0, 1, 2, 3].map(function (i) { return paint(shareG.appendChild(svgEl('rect', { x: R, y: 268, width: 0, height: 12, rx: 2 })), i === 3 ? C_BAD : C_MUTED); });
    var shareLbl = label(shareG, R, 298, '', 'demo-x-ink2', 11.5);
    function lossToy(m) {
      /* m = 0：L1（|e|），m = 1：L2（e²），中间按比例过渡 */
      var vals = LOSS_TOY.err.map(function (e) { return (1 - m) * Math.abs(e) + m * e * e; });
      var sum = vals.reduce(function (a, b) { return a + b; }, 0);
      return { vals: vals, mean: sum / vals.length, share: vals.map(function (v) { return v / sum; }) };
    }
    /* 第 5 段：KL（玩具：一维正态和标准正态） */
    var pK = group(s);
    label(pK, R, 62, 'KL：两个分布相距多远', 'demo-x-ink', 13.5);
    var kp = plotBox(pK, R, 74, 352, 112, -3.5, 3.5, 0, 0.85);
    var stdCurve = pathLine(kp.g, [], C_MUTED, 2, '6 4'), encCurve = pathLine(kp.g, [], C_WARN, 2.6);
    function bell(mu, sg) {
      var pts = [];
      for (var xx = -3.5; xx <= 3.501; xx += 0.07) pts.push([kp.px(xx), kp.py(Math.exp(-0.5 * (xx - mu) * (xx - mu) / (sg * sg)) / (sg * Math.sqrt(2 * Math.PI)))]);
      return pts;
    }
    setPath(stdCurve, bell(0, 1));
    var muDot = dotAt(pK, 0, kp.py(0) - 4, 4, C_WARN);
    lineLegend(pK, R, 206, [['标准正态：均值 0、宽度 1', C_MUTED, '6 4'], ['编码器给的一维', C_WARN]], 11);
    var klTxt = label(pK, R, 234, '', 'demo-x-ink', 14);
    var klState = label(pK, R + 352, 234, '', 'demo-x-ink2', 12, 'end');
    rectBox(pK, R, 244, 352, 12, C_BORDER, C_SURFACE2);
    var klBar = hbar(pK, R, 244, 12, C_WARN, 0.9);
    label(pK, R, 274, '条长 = KL；两条曲线完全重合时是 0', 'demo-x-mut', 11);
    label(pK, R, 294, '官方代码：32 维各算一份，再加起来', 'demo-x-ink2', 11.5);
    /* 第 6 段：β 越大，z 里的信息越少 */
    var p3 = group(s);
    label(p3, R, 62, 'β 越大，z 里装的信息越少', 'demo-x-ink', 13.5);
    var prior = ringAt(p3, R + 176, 156, 60, C_MUTED, 1.6);
    prior.setAttribute('stroke-dasharray', '5 4');
    var posts = [0, 1, 2, 3].map(function (k) { return ringAt(p3, 0, 0, 10, CHUNK_COLORS[k], 2); });
    var b3 = label(p3, R, 248, '', 'demo-x-ink', 12.5);
    label(p3, R, 270, '虚线圈 = 标准正态；彩色圈 = 不同示范各自的 z（示意）', 'demo-x-mut', 11);
    /* 第 4 段：测试时 z = 0 */
    var p4 = group(s);
    label(p4, R, 62, '测试时：扔掉编码器，z 取 0', 'demo-x-ink', 13.5);
    label(p4, R, 90, 'z = 0 是先验（标准正态）的均值', 'demo-x-ink2', 12);
    label(p4, R, 114, '同一个观测，输出总是同一段动作', 'demo-x-ink2', 12);
    label(p4, R, 138, '论文：这样评估更方便', 'demo-x-ink2', 12);
    label(p4, R, 180, '另一个选择（第 IV-C 节）：', 'demo-x-ink', 12);
    label(p4, R, 204, '· 动作是关节角本身，不是增量：增量更差', 'demo-x-ink2', 12);
    /* 第 5 段：我们的复现 */
    var p5 = group(s);
    label(p5, R, 62, '我们的复现：z 几乎没装东西', 'demo-x-ink', 13.5);
    var k5 = label(p5, R, 90, '', 'demo-x-ink2', 12), k5b = label(p5, R, 112, '', 'demo-x-ink2', 12);
    var zp = plotBox(p5, R, 124, 352, 78, 0, 100, -0.05, 1.3);
    var zl = [];
    for (var z = 0; z < 16; z++) { var pl = pathLine(zp.g, [], C_PURPLE, 1.2); pl.style.opacity = 0.5; zl.push(pl); }
    var z0 = pathLine(zp.g, [], C_ENS, 2.2, '5 4');
    lineLegend(p5, R, 220, [['16 个随机 z', C_PURPLE], ['z = 0', C_ENS, '5 4']], 11);
    var k5c = label(p5, R, 246, '', 'demo-x-ink2', 11.5);
    label(p5, R, 268, '图 6c：去掉 CVAE，人的示范上 35.3% → 2%；机制论文没解释', 'demo-x-ink2', 11.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var test = since(t, clock, 20.6) > 0 && t >= 20.6;
      mode.textContent = test ? '测试：编码器不用，z = 0' : '训练：编码器从示范里算出 z';
      bxs.demo.style.opacity = test ? 0.25 : 1; bxs.enc.style.opacity = test ? 0.25 : 1;
      fz0.at(now, [88, 224], [88, 250], !test);
      fz1.at(now, [152, 264], [176, 264], !test);
      fz2.at(now, [236, 264], [260, 264], true);
      fz3.at(now, [332, 224], [332, 250], true);
      fz4.at(now, [332, 278], [332, 304], true);
      zero.textContent = test ? 'z = 0' : '';
      var tilt = 0.10 * Math.sin(now * 1.4);
      [[pan1, bt1, -1], [pan2, bt2, 1]].forEach(function (pp) {
        var cx = R + 175 + pp[2] * 100, cy = 214 + pp[2] * tilt * 100 - 34;
        pp[0].setAttribute('x', (cx - 35).toFixed(1)); pp[0].setAttribute('y', cy.toFixed(1));
        pp[1].setAttribute('x', cx.toFixed(1)); pp[1].setAttribute('y', (cy + 14).toFixed(1));
      });
      /* L1 / L2：误差线一根根出来，柱子跟着长；到 L2 那段，柱子从 |e| 变成 e²，横条的比例跟着变 */
      var u = since(t, clock, 7.0), v = t >= 10.4 ? since(t, clock, 10.4) : 0;
      var m = Math.min(1, Math.max(0, (v - 0.4) / 1.4));
      m = m * m * (3 - 2 * m);
      var toy = lossToy(m);
      eTitle.textContent = m < 0.5 ? 'L1：每步的差距取绝对值，再平均' : 'L2：先平方，再平均';
      LOSS_TOY.err.forEach(function (e, i) {
        var a = Math.min(1, Math.max(0, (u - 0.3 - 0.45 * i) / 0.35));
        var x = ep.px(i), y0 = predPts[i][1], y1 = demoPts[i][1];
        setLine(errSegs[i], x, y1, x, y1 + (y0 - y1) * a);
        errSegs[i].style.opacity = a > 0 ? 1 : 0;
        var h = toy.vals[i] * UNIT * a;
        eBars[i].set(BASE, h);
        eVal[i].setAttribute('y', (BASE - Math.max(h, 5) - 5).toFixed(1));
        eVal[i].textContent = a >= 1 ? (m < 0.5 ? f1(Math.abs(e)) : f2(e * e)) : '';
      });
      var mh = toy.mean * UNIT * Math.min(1, Math.max(0, (u - 2.2) / 0.35));
      meanBar.set(BASE, mh);
      meanVal.setAttribute('y', (BASE - Math.max(mh, 5) - 5).toFixed(1));
      meanVal.textContent = u > 2.55 ? f2(toy.mean).replace(/0$/, '') : '';
      barKind.setText(m < 0.5 ? '柱高 = $|e|$' : '柱高 = $e^2$');
      var showShare = u > 2.6 ? 1 : 0, sx = R;
      shareSeg.forEach(function (r, i) {
        var w = 352 * toy.share[i];
        r.setAttribute('x', sx.toFixed(1)); r.setAttribute('width', Math.max(0, w - 1.5).toFixed(1));
        sx += w;
      });
      shareG.style.opacity = showShare;
      shareLbl.textContent = '横条 = 各步占总和的比例：最后一步（红）占 ' + fmt(100 * toy.share[3], 1) + '%';
      /* KL：重合 → 均值挪到 1 → 宽度缩成一半，循环；读数和条跟着曲线变 */
      var w5 = since(t, clock, 13.8), P = clock == null ? 3.3 : 9, ph = (w5 % P) / P * 3, st = Math.floor(ph), fr = ph - st;
      var A = KL_TOY[st % 3], B = KL_TOY[(st + 1) % 3], blend = Math.min(1, Math.max(0, (fr - 0.72) / 0.28));
      blend = blend * blend * (3 - 2 * blend);
      var mu = A[0] + (B[0] - A[0]) * blend, sg = A[1] + (B[1] - A[1]) * blend, kl = klNormal(mu, sg);
      setPath(encCurve, bell(mu, sg));
      moveDot(muDot, [kp.px(mu), kp.py(0) - 4]);
      klTxt.textContent = 'KL = ' + f2(kl);
      klState.textContent = blend > 0 ? '' : ['两条重合', '均值挪到 1', '宽度缩成一半'][st % 3];
      setW(klBar, 352 * Math.min(1, kl / 0.6));
      var beta = 0.5 + 0.5 * Math.sin(since(t, clock, 17.2) * 0.9 - 1.57), spread = 50 * (1 - beta) + 4;
      posts.forEach(function (c, k) {
        var a = k * 1.57 + 0.4;
        moveDot(c, [R + 176 + spread * Math.cos(a), 156 + spread * 0.7 * Math.sin(a)]);
        c.setAttribute('r', (10 + 50 * beta).toFixed(1));
      });
      b3.textContent = beta < 0.5 ? 'β 小：各条示范的 z 分得开' : 'β 大：都挤到标准正态上，z 说明不了什么';
      if (REPRO) {
        k5.textContent = '人的示范的动作块喂给编码器：KL 平均 ' + REPRO.cvae.kl.toFixed(4);
        k5b.textContent = 'μ 平均只有 ' + REPRO.cvae.mu.toFixed(3) + '、σ ≈ ' + REPRO.cvae.sigma.toFixed(2) + '：几乎就是标准正态';
        REPRO.cvae.zs.forEach(function (tr, k) { setPath(zl[k], tr.map(function (v, j) { return [zp.px(j), zp.py(v)]; })); });
        setPath(z0, REPRO.cvae.z0.map(function (v, j) { return [zp.px(j), zp.py(v)]; }));
        k5c.textContent = '第 150 步右夹爪的动作块：换 64 个随机 z，最多差 ' + f3(REPRO.cvae.zdev) + '（开度）';
      }
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(pE, win(t, 7.0, 13.8));
      setOpacity(pK, win(t, 13.8, 17.2));
      setOpacity(p3, win(t, 17.2, 20.6));
      setOpacity(p4, win(t, 20.6, 23.6));
      setOpacity(p5, win(t, 23.6));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: 编码器：[CLS]、关节与 k 个动作 ── */
  function buildSceneEncoder() {
    var s = sceneSvg('左边是 CVAE 编码器的结构：一个学出来的 [CLS] 向量、一个关节角、100 个动作排成一行，进 4 层 Transformer 编码器；' +
      '只取 [CLS] 位置的输出，经线性层变成 32 个均值和 32 个对数方差，再加噪声采出 z。右边依次出现：102 个 token；只取 [CLS]；重参数化；不看图；KL 怎么算');
    s.appendChild(svgText(24, 26, 'CVAE 的编码器：像 BERT 一样，用 [CLS] 读出整句话', 'demo-x-ink2', 13.5));
    var L = group(s);
    var toks = [];
    toks.push({ r: paint(svgEl('rect', { x: 30, y: 330, width: 26, height: 26, rx: 3 }), C_MUTED), c: '[CLS]' });
    toks.push({ r: paint(svgEl('rect', { x: 62, y: 330, width: 26, height: 26, rx: 3 }), C_FOLL), c: '关节' });
    for (var i = 0; i < 12; i++) toks.push({ r: paint(svgEl('rect', { x: 100 + i * 22, y: 330, width: 18, height: 26, rx: 3 }), CHUNK_COLORS[i % 4]) });
    toks.forEach(function (tk) { L.appendChild(tk.r); });
    label(L, 366, 348, '…', 'demo-x-ink', 14);
    label(L, 43, 374, '[CLS]', 'demo-x-ink2', 11, 'middle');
    label(L, 75, 374, '关节', 'demo-x-ink2', 11, 'middle');
    label(L, 230, 374, '示范的 100 步动作（每步 14 维 → 512）', 'demo-x-ink2', 11, 'middle');
    rectBox(L, 30, 214, 360, 80, C_WARN, C_SURFACE2);
    label(L, 210, 250, 'Transformer 编码器 × 4 层', 'demo-x-ink', 13, 'middle');
    label(L, 210, 272, '8 个头，前馈 3200，隐藏 512', 'demo-x-ink2', 11, 'middle');
    var up = flowSeg(L, C_WARN, 4, 2.6, 50);
    var cls = paint(svgEl('rect', { x: 30, y: 166, width: 26, height: 26, rx: 3 }), C_MUTED);
    L.appendChild(cls);
    var lin = chip(L, 80, 164, 112, '线性 512 → 64', C_WARN, { size: 11.5, h: 30 });
    void lin;
    var mu = [], lv = [];
    for (i = 0; i < 16; i++) { mu.push(hbar(L, 214 + i * 11, 156, 9, C_ACCENT)); lv.push(hbar(L, 214 + i * 11, 176, 9, C_PURPLE)); }
    label(L, 214, 150, '32 个均值 μ', 'demo-x-ink2', 11);
    label(L, 214, 204, '32 个对数方差', 'demo-x-ink2', 11);
    var zrow = [];
    for (i = 0; i < 16; i++) zrow.push(paint(L.appendChild(svgEl('rect', { x: 214 + i * 11, y: 92, width: 9, height: 22, rx: 2 })), C_INK));
    label(L, 214, 84, 'z = μ + σ ⊙ ε', 'demo-x-ink', 12);
    var eps = [];
    for (i = 0; i < 6; i++) eps.push(dotAt(L, 0, 0, 2.6, C_GOOD));
    label(L, 30, 112, 'ε：每次重新抽', 'demo-x-ink2', 11);
    var R = 424;
    /* 第 1 段 */
    var p1 = group(s);
    label(p1, R, 62, '输入：1 + 1 + k = 102 个 token', 'demo-x-ink', 13.5);
    label(p1, R, 92, '[CLS]：一个学出来的向量（512 维）', 'demo-x-ink2', 12);
    label(p1, R, 116, '关节角：14 维，线性层投到 512', 'demo-x-ink2', 12);
    label(p1, R, 140, 'k = 100 步动作：每步 14 维，另一个线性层投到 512', 'demo-x-ink2', 12);
    var c1 = label(p1, R, 180, '', 'demo-x-ink', 14);
    label(p1, R, 210, '再加上正弦位置编码（代码里的 pos_table）', 'demo-x-ink2', 12);
    /* 第 2 段 */
    var p2 = group(s);
    label(p2, R, 62, '只取 [CLS] 那个位置的输出', 'demo-x-ink', 13.5);
    label(p2, R, 90, '它经过 4 层注意力，已经看过整段动作', 'demo-x-ink2', 12);
    label(p2, R, 114, '线性层 512 → 64：前 32 个是均值，后 32 个', 'demo-x-ink2', 12);
    label(p2, R, 138, '是对数方差（附录图 7 写成 z_std）', 'demo-x-ink2', 12);
    label(p2, R, 174, 'z 的分布：32 维、各维独立的高斯', 'demo-x-ink', 12);
    /* 第 3 段 */
    var p3 = group(s);
    label(p3, R, 62, '重参数化：让梯度穿过「抽样」', 'demo-x-ink', 13.5);
    math(p3, R, 104, 'z = \\mu + \\sigma \\odot \\varepsilon,\\quad \\varepsilon \\sim \\mathcal{N}(0, I)', 15);
    label(p3, R, 146, '随机性都放在 ε 里，μ 和 σ 是普通的网络输出', 'demo-x-ink2', 12);
    label(p3, R, 170, '编码器和解码器可以一起反向传播（附录 C）', 'demo-x-ink2', 12);
    /* 第 4 段 */
    var p4 = group(s);
    label(p4, R, 62, '编码器不看图', 'demo-x-ink', 13.5);
    label(p4, R, 90, '论文：为了训练快，只用关节角和动作序列', 'demo-x-ink2', 12);
    label(p4, R, 114, '记作 ō：去掉图像的观测', 'demo-x-ink2', 12);
    label(p4, R, 150, '测试时整个编码器扔掉', 'demo-x-ink', 12);
    label(p4, R, 174, '它只是帮着训练解码器的', 'demo-x-ink2', 12);
    /* 第 5 段 */
    var p5 = group(s);
    label(p5, R, 62, '正则项：KL 到标准正态', 'demo-x-ink', 13.5);
    math(p5, R, 106, 'D_{\\mathrm{KL}} = -\\tfrac12 \\sum_{j=1}^{32} \\big(1 + \\log\\sigma_j^2 - \\mu_j^2 - \\sigma_j^2\\big)', 14);
    label(p5, R, 150, 'μ = 0、σ = 1 时正好是 0', 'demo-x-ink2', 12);
    label(p5, R, 174, '代码：32 维求和、批内平均，乘 10 加到 L1 上', 'demo-x-ink2', 12);
    var kl5 = label(p5, R, 210, '', 'demo-x-ink', 12.5);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      up.at(now, [210, 326], [210, 298], true);
      toks.forEach(function (tk, k) { tk.r.style.opacity = 0.55 + 0.45 * Math.sin(now * 2 - k * 0.4); });
      cls.style.opacity = 0.6 + 0.4 * Math.sin(now * 3);
      mu.forEach(function (b, k) { setW(b, 4 + 3 * Math.abs(Math.sin(k * 1.7 + now * 0.4))); });
      lv.forEach(function (b, k) { setW(b, 4 + 3 * Math.abs(Math.cos(k * 1.3 + now * 0.4))); });
      var batch = Math.floor(now / 0.6);
      zrow.forEach(function (r, k) { r.style.opacity = 0.35 + 0.6 * rnd(k, batch); });
      eps.forEach(function (d, k) { moveDot(d, [40 + 150 * rnd(k, batch), 128 + 12 * rnd(k + 9, batch)]); });
      var u1 = seg(since(t, clock, 0.4), 0.4, 2.2);
      c1.textContent = Math.round(2 + 100 * u1) + ' × 512';
      if (REPRO) kl5.textContent = '复现的检查点：人的示范上平均 ' + REPRO.cvae.kl.toFixed(4);
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* 仿真顶部相机（策略的输入）的 6 张图，320 × 240 一格横排（sim/top6.webp）；对应 REPRO.attn.ts 那 6 步 */
  function topImage(parent) {
    var g = group(parent);
    var box = svgEl('svg', { overflow: 'hidden', preserveAspectRatio: 'none', width: 0, height: 0, viewBox: '0 0 320 240' });
    var img = svgEl('image', { x: 0, y: 0, width: 1920, height: 240, preserveAspectRatio: 'none' });
    box.appendChild(img); g.appendChild(box);
    var woke = false, last = -1;
    return {
      g: g,
      put: function (x, y, w, f) {
        if (!woke && SIM_BASE) { woke = true; img.setAttribute('href', SIM_BASE + 'top6.webp'); }
        box.setAttribute('x', x); box.setAttribute('y', y); box.setAttribute('width', w); box.setAttribute('height', w * 0.75);
        if (f !== last) { box.setAttribute('viewBox', (f * 320 + 1) + ' 1 318 238'); last = f; }
      }
    };
  }

  /* ── scene 10: 策略的输入：1202 个 token ── */
  function buildSceneTokens() {
    var s = sceneSvg('左边是我们复现的仿真里顶部相机的画面，也就是策略的输入，上面画着 15 × 20 的格子，每一格对应 ResNet18 特征图上的一个点。' +
      '右边依次出现：一张图变成 15 × 20 × 512；拉平成 300 个 token；4 台相机加关节角和 z 一共 1202 个；Transformer 编码器把它们混在一起；' +
      '最后在左图上叠出复现里解码器的注意力，亮的格子是它看得最多的地方');
    s.appendChild(svgText(24, 26, '策略的输入：一张图切成 300 个 token', 'demo-x-ink2', 13.5));
    var IM = { x: 24, y: 44, w: 380 }, ih = IM.w * 0.75;
    var top = topImage(s);
    var gridG = group(s), cells = [];
    for (var r = 0; r < 15; r++) for (var c = 0; c < 20; c++) {
      var cell = paint(svgEl('rect', { x: (IM.x + c * IM.w / 20).toFixed(1), y: (IM.y + r * ih / 15).toFixed(1), width: (IM.w / 20).toFixed(1), height: (ih / 15).toFixed(1), 'stroke-width': 0.5, opacity: 0 }), C_WARN, C_BORDER);
      gridG.appendChild(cell); cells.push(cell);
    }
    var gridLines = group(s);
    for (r = 0; r <= 15; r++) hline(gridLines, IM.x, IM.y + r * ih / 15, IM.x + IM.w, IM.y + r * ih / 15, '#ffffff', 0.6).style.opacity = 0.35;
    for (c = 0; c <= 20; c++) hline(gridLines, IM.x + c * IM.w / 20, IM.y, IM.x + c * IM.w / 20, IM.y + ih, '#ffffff', 0.6).style.opacity = 0.35;
    var capT = label(s, 24, 352, '', 'demo-x-ink2', 11.5);
    label(s, 24, 374, '我们的复现：仿真任务只有顶部一台相机（官方配置），这里是 300 + 2 = 302 个 token', 'demo-x-mut', 11);
    var R = 424;
    /* 第 1 段：ResNet18 */
    var p1 = group(s);
    label(p1, R, 62, 'ResNet18：480 × 640 × 3 → 15 × 20 × 512', 'demo-x-ink', 13.5);
    rectBox(p1, R, 84, 128, 96, C_FOLL, C_SURFACE2);
    label(p1, R + 64, 136, '一张图', 'demo-x-ink2', 12, 'middle');
    for (var k = 0; k < 5; k++) rectBox(p1, R + 236 + k * 6, 96 + k * 5, 80, 60, C_ACCENT, C_SURFACE2);
    label(p1, R + 290, 196, '15 × 20 个点，每点 512 维', 'demo-x-ink2', 11.5, 'middle');
    var f1 = flowSeg(p1, C_ACCENT, 3, 3, 60);
    label(p1, R, 230, '每个点看的是原图里约 32 × 32 像素的一块', 'demo-x-ink2', 12);
    label(p1, R, 254, '用 ImageNet 预训练的权重开始，跟着一起训', 'demo-x-mut', 11);
    /* 第 2 段：拉平 + 位置编码 */
    var p2 = group(s);
    label(p2, R, 62, '拉平：300 个 token，每个 512 维', 'demo-x-ink', 13.5);
    var row2 = [];
    for (k = 0; k < 20; k++) row2.push(paint(p2.appendChild(svgEl('rect', { x: R + k * 17.5, y: 92, width: 14, height: 24, rx: 2 })), C_ACCENT));
    label(p2, R, 140, '先用 1 × 1 卷积投到 512，再加二维正弦位置编码', 'demo-x-ink2', 12);
    var wave = [];
    for (k = 0; k < 3; k++) wave.push(pathLine(p2, [], CHUNK_COLORS[k + 1], 1.6));
    label(p2, R, 236, '位置编码告诉 Transformer：这一格在图上的哪一行哪一列', 'demo-x-ink2', 11.5);
    /* 第 3 段：1202 */
    var p3 = group(s);
    label(p3, R, 62, '4 台相机 + 关节角 + z', 'demo-x-ink', 13.5);
    var cams = [0, 1, 2, 3].map(function (k) {
      var x = R + k * 74;
      rectBox(p3, x, 84, 66, 40, C_ACCENT, C_SURFACE2);
      return label(p3, x + 33, 109, '', 'demo-x-ink', 12, 'middle');
    });
    chip(p3, R + 296, 84, 26, '', C_FOLL, { h: 40 });
    chip(p3, R + 326, 84, 26, '', C_INK, { h: 40 });
    label(p3, R + 309, 140, '关节', 'demo-x-ink2', 11, 'middle');
    label(p3, R + 339, 158, 'z', 'demo-x-ink2', 11, 'middle');
    var sum3 = label(p3, R, 190, '', 'demo-x-ink', 15);
    label(p3, R, 216, '关节 14 → 512、z 32 → 512，各一个线性层', 'demo-x-ink2', 12);
    label(p3, R, 240, '代码：4 台相机共用同一个 ResNet18', 'demo-x-mut', 11);
    /* 第 4 段：Transformer 编码器 */
    var p4 = group(s);
    label(p4, R, 62, 'Transformer 编码器：4 层，把它们混在一起', 'demo-x-ink', 13.5);
    var nodes = [];
    for (k = 0; k < 9; k++) nodes.push(dotAt(p4, R + 20 + k * 40, 180, 9, k < 7 ? C_ACCENT : k === 7 ? C_FOLL : C_INK));
    var links = [];
    for (k = 0; k < 10; k++) links.push(pathLine(p4, [], C_WARN, 1.2));
    label(p4, R, 226, '不同视角、关节角和 z 互相参照', 'demo-x-ink2', 12);
    label(p4, R, 250, '输出 1202 × 512，交给解码器去查', 'demo-x-ink2', 12);
    /* 第 5 段：注意力 */
    var p5 = group(s);
    label(p5, R, 62, '复现：解码器在看哪里', 'demo-x-ink', 13.5);
    label(p5, R, 88, '交叉注意力，8 个头、100 个查询取平均', 'demo-x-ink2', 12);
    var a5 = [barRowAt(p5, R, 108, 92, '图像 300 格', C_WARN, 16, 11.5), barRowAt(p5, R, 134, 92, '关节角', C_FOLL, 16, 11.5), barRowAt(p5, R, 160, 92, 'z', C_INK, 16, 11.5)];
    label(p5, R, 204, '左图：越黄的格子分到的注意力越多（每张图按最大值归一）', 'demo-x-ink2', 11.5);
    label(p5, R, 228, '注意力只是一种读法，不等于「因为看了这里才这样做」', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var A = REPRO && REPRO.attn, nf = A ? A.ts.length : 6, fi = Math.floor(now / 2.2) % nf;
      top.put(IM.x, IM.y, IM.w, fi);
      var heat = since(t, clock, 13.4) > 0.4 && t >= 13.4;
      if (A) {
        var map = A.maps[fi];
        cells.forEach(function (cl, i) { cl.style.opacity = heat ? 0.75 * map[i] : 0; });
        capT.textContent = '第 ' + A.ts[fi] + ' 步' + (heat ? '：注意力最多的格子' : '');
        a5[0].set(200 * A.img[fi], f1fix(100 * A.img[fi]) + '%');
        a5[1].set(200 * A.q[fi], f1fix(100 * A.q[fi]) + '%');
        a5[2].set(200 * A.z[fi], f1fix(100 * A.z[fi]) + '%');
      }
      gridLines.style.opacity = heat ? 0.4 : 1;
      f1.at(now, [R + 132, 132], [R + 230, 132], true);
      var u2 = seg(since(t, clock, 3.6), 0.2, 1.6);
      row2.forEach(function (b, k) { b.style.opacity = u2 * 20 > k ? 1 : 0.15; });
      wave.forEach(function (w, k) {
        var pts = [];
        for (var j = 0; j <= 70; j++) pts.push([R + j * 5, 182 - 18 * Math.sin(j * 0.09 * (k + 1) + now * 0.6)]);
        setPath(w, pts);
      });
      var u3 = seg(since(t, clock, 7.0), 0.2, 2.0);
      cams.forEach(function (c, k) { c.textContent = u3 * 4 > k ? '300' : ''; });
      sum3.textContent = '4 × 300 + 1 + 1 = ' + (u3 > 0.95 ? '1202' : '…') + ' 个 token';
      var pick = Math.floor(now * 1.5);
      links.forEach(function (l, k) {
        var a = Math.floor(9 * rnd(k, pick)), b = Math.floor(9 * rnd(k + 20, pick));
        var xa = R + 20 + a * 40, xb = R + 20 + b * 40, h = 16 + Math.abs(xa - xb) * 0.22;
        setPath(l, [[xa, 170], [(xa + xb) / 2, 170 - h], [xb, 170]]);
      });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }
  function f1fix(x) { return x < 10 ? x.toFixed(1) : String(Math.round(x)); }

  /* ── scene 11: 解码器：一次写出 k 步 ── */
  function buildSceneDecoder() {
    var s = sceneSvg('左边是解码器：上面一排是编码器的 1202 个输出（4 台相机、关节、z），下面是 100 个查询槽；一个查询槽发出交叉注意力，' +
      '从上面那一排取信息，变成一个 512 维向量，再经线性层变成 14 个关节目标。右下是复现里第 150 步一次查询吐出来的 100 步右夹爪目标，一格格长出来。' +
      '右边依次出现：查询怎么变成动作；论文和代码对查询的写法不同；7 层解码器只用了第 1 层；超参数与训练轮数；算力');
    s.appendChild(svgText(24, 26, '解码器：100 个查询，一次写出 100 步', 'demo-x-ink2', 13.5));
    var mem = [];
    var memCols = [C_ACCENT, C_ACCENT, C_ACCENT, C_ACCENT, C_FOLL, C_INK];
    var memNames = ['相机 1', '相机 2', '相机 3', '相机 4', '关节', 'z'];
    memCols.forEach(function (col, k) {
      var w = k < 4 ? 74 : 26, x = k < 4 ? 30 + k * 80 : 350 + (k - 4) * 28;
      mem.push(rectBox(s, x, 56, w, 28, col, C_SURFACE2));
      label(s, x + w / 2, 74, memNames[k], 'demo-x-ink2', 11, 'middle');
    });
    label(s, 30, 48, '编码器的输出：1202 × 512（键和值）', 'demo-x-mut', 11);
    var qs = [];
    for (var i = 0; i < 20; i++) qs.push(paint(s.appendChild(svgEl('rect', { x: 30 + i * 18.5, y: 196, width: 14, height: 22, rx: 2 })), C_PURPLE));
    label(s, 30, 236, '100 个查询（位置编码），画出 20 个', 'demo-x-mut', 11);
    var att = [], attLo = pathLine(s, [], C_WARN, 2.4);
    for (i = 0; i < 6; i++) att.push(pathLine(s, [], C_WARN, 1.4));
    var outB = rectBox(s, 30, 132, 360, 30, C_PURPLE, C_SURFACE2);
    void outB;
    label(s, 210, 152, '交叉注意力 → 每个查询一个 512 维向量 → 线性 → 14 维', 'demo-x-ink2', 11, 'middle');
    var pb = plotBox(s, 30, 254, 360, 100, 0, 100, -0.05, 1.3);
    var outL = pathLine(pb.g, [], C_ENS, 2.4), outD = dotAt(pb.g, 0, 0, 4, C_ENS);
    label(s, 30, 372, '复现：第 150 步一次查询吐出的 100 步右夹爪目标（1 张开，0 合上）', 'demo-x-mut', 11);
    label(s, 390, 394, '横轴：往后第几步', 'demo-x-mut', 11, 'end');
    var R = 424;
    /* 第 1 段 */
    var p1 = group(s);
    label(p1, R, 62, '查询 → 动作', 'demo-x-ink', 13.5);
    label(p1, R, 90, 'k = 100 个查询，各自去「查」编码器的输出', 'demo-x-ink2', 12);
    label(p1, R, 114, '第 j 个查询，负责第 t + j 步的动作', 'demo-x-ink2', 12);
    var dims = label(p1, R, 156, '', 'demo-x-ink', 14);
    label(p1, R, 186, '每一行 14 个数：两条臂下一步的目标关节角', 'demo-x-ink2', 12);
    label(p1, R, 210, '交给 Dynamixel 电机里的 PID 去跟', 'demo-x-ink2', 12);
    /* 第 2 段 */
    var p2 = group(s);
    label(p2, R, 62, '查询怎么来：论文和代码不一样', 'demo-x-ink', 13.5);
    var fl2 = flipList(p2, R, 84, [['查询向量', '固定的正弦编码', '学出来的 Embedding'], ['解码器的输入', '位置编码', '全 0，编码加在 Q、K 上']], 96, 200, ['论文', '代码']);
    label(p2, R, 190, '论文附录 C：查询是固定的正弦位置编码', 'demo-x-ink2', 11.5);
    label(p2, R, 212, '官方代码：nn.Embedding(100, 512)，跟着一起训', 'demo-x-ink2', 11.5);
    /* 第 3 段 */
    var p3 = group(s);
    label(p3, R, 62, '7 层解码器，只用了第 1 层', 'demo-x-ink', 13.5);
    var layers = [];
    for (i = 0; i < 7; i++) layers.push(rectBox(p3, R + i * 50, 82, 44, 34, i === 0 ? C_ENS : C_BORDER, C_SURFACE2));
    label(p3, R, 138, '代码取 hs[0]：第 1 层（加层归一化）的输出', 'demo-x-ink2', 12);
    label(p3, R, 160, '后面 6 层照算，不影响输出', 'demo-x-ink2', 12);
    var par = label(p3, R, 196, '', 'demo-x-ink', 12.5);
    label(p3, R, 220, 'LeRobot 移植时注明了这一点，所以它默认 1 层', 'demo-x-mut', 11);
    /* 第 4 段：超参数 */
    var p4 = group(s);
    label(p4, R, 62, '附录表 III 与训练', 'demo-x-ink', 13.5);
    HPARAM.forEach(function (h, k) {
      var x = R + (k % 2) * 178, y = 88 + Math.floor(k / 2) * 22;
      label(p4, x, y, h[0], 'demo-x-ink2', 11.5);
      label(p4, x + 168, y, h[1], 'demo-x-ink', 11.5, 'end');
    });
    var tr4 = label(p4, R, 218, '', 'demo-x-ink', 12);
    label(p4, R, 242, '每条示范每轮随机抽一步；按验证损失挑最好的那一轮', 'demo-x-ink2', 11.5);
    /* 第 5 段：算力 */
    var p5 = group(s);
    label(p5, R, 62, '要多少算力', 'demo-x-ink', 13.5);
    label(p5, R, 90, '每个任务从头训：一张 11 GB 的 RTX 2080 Ti，约 5 小时', 'demo-x-ink2', 12);
    label(p5, R, 114, '推理一次约 0.01 秒（同一张卡）', 'demo-x-ink2', 12);
    var c5 = [barRowAt(p5, R, 140, 120, '2080 Ti（论文）', C_ENS, 16, 11.5), barRowAt(p5, R, 166, 120, '4 核 CPU（我们）', C_MUTED, 16, 11.5)];
    label(p5, R, 214, '一次推理用时；50 Hz 意味着每步只有 0.02 秒', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var qi = Math.floor(now * 1.2) % 20;
      qs.forEach(function (q, k) { q.style.opacity = k === qi ? 1 : 0.35; });
      var qx = 37 + qi * 18.5;
      setPath(attLo, [[qx, 194], [qx, 164]]);
      att.forEach(function (a, k) {
        var mx = k < 4 ? 67 + k * 80 : 363 + (k - 4) * 28, w = 0.4 + 0.6 * Math.abs(Math.sin(k * 2.1 + qi));
        setPath(a, [[qx, 130], [mx, 86]]);
        a.style.opacity = 0.2 + 0.7 * w; a.setAttribute('stroke-width', (0.8 + 2 * w).toFixed(1));
      });
      if (REPRO) {
        var n = Math.min(100, Math.floor((now % 6) / 4 * 100)), pts = [];
        for (var j = 0; j <= Math.min(99, n); j++) pts.push([pb.px(j), pb.py(pred('rgrip', 150, j))]);
        setPath(outL, pts); moveDot(outD, pts[pts.length - 1]);
        par.textContent = '总参数 ' + f1(REPRO.params_all / 1e6) + 'M（论文：约 80M），起作用的 ' + f1(REPRO.params_used / 1e6) + 'M';
        c5[0].set(200 * 0.01 / REPRO.cpu_s, '0.01 秒');
        c5[1].set(200, f2(REPRO.cpu_s) + ' 秒');
      }
      dims.textContent = '100 × 512 → 100 × 14';
      fl2.set(since(t, clock, 3.6));
      layers.forEach(function (l, k) { l.style.opacity = k === 0 ? 1 : 0.4 + 0.2 * Math.sin(now * 3 + k); });
      tr4.textContent = '2000 轮 × 40 条训练示范 ÷ 批 8 = 10,000 步更新';
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: 8 个任务（图 4、图 5） ── */
  function buildSceneTasks() {
    var s = sceneSvg('左边是项目页的视频：学到的策略实时完成装电池、打开杯盖、备胶带、穿鞋，下面标着放到第几个。右边依次出现：6 个真机任务；' +
      '论文图 4 里正在放的那个任务的分步；感知上的难点；论文图 5 的两个仿真任务和我们复现的渲染；每个任务的示范数');
    s.appendChild(svgText(24, 26, '6 个真机任务 + 2 个仿真任务', 'demo-x-ink2', 13.5));
    var PARTS = [[12, '装电池'], [12, '打开杯盖'], [12, '备胶带'], [12, '穿鞋']];
    var ROWS = [1, 2, 4, 5];
    var clips = ['battery', 'cup', 'tape', 'shoe'].map(function (id) { return projClip(s, id, 24, 44, 380, 214, '项目页视频（实时）：学到的策略'); });
    var tot = 48, bars = PARTS.map(function (p, k) {
      var r = paint(svgEl('rect', { x: (24 + k * 95).toFixed(1), y: 307, width: 91, height: 5, rx: 2.5 }), C_ACCENT);
      s.appendChild(r); return r;
    });
    var nameT = label(s, 24, 330, '', 'demo-x-ink', 12.5);
    label(s, 24, 352, '物体沿着桌上 15 cm 的白线随机摆放', 'demo-x-ink2', 11.5);
    var R = 424;
    /* 第 1 段 */
    var p1 = group(s);
    label(p1, R, 62, '6 个真机任务，每个都要两只手配合', 'demo-x-ink', 13.5);
    [['拉开密封袋', '透明袋子，捏住拉链头往右拉'], ['装电池', '左手按住遥控器，右手把电池按进去'], ['打开杯盖', '推倒小杯子、拨进左手、撬开盖'],
      ['穿魔术贴扎带', '环 3 × 25 mm，空中对穿'], ['备胶带', '切一段、空中交给左手、贴到箱子边上'], ['穿鞋', '套到假脚上、托住、粘好鞋带']].forEach(function (r, k) {
      var y = 78 + k * 30;
      chip(p1, R, y, 110, r[0], C_GOOD, { size: 11.5, h: 24 });
      label(p1, R + 118, y + 17, r[1], 'demo-x-ink2', 11.5);
    });
    /* 第 2 段：图 4 的分步 */
    var p2 = group(s);
    label(p2, R, 62, '论文图 4：每个任务拆成几步打分', 'demo-x-ink', 13.5);
    var rowImgs = ROWS.map(function (ri) {
      var y0 = FIG4_ROWS[ri][0] / 1144, y1 = FIG4_ROWS[ri][1] / 1144, x1 = FIG4_W[ri] / 1400;
      return paperPart(p2, 'fig4', 0, y0, x1, y1, R, 80, 352, '');
    });
    var subT = label(p2, R, 186, '', 'demo-x-ink2', 12);
    label(p2, R, 212, '第一格是初始摆放，后面是每一步做完的样子', 'demo-x-mut', 11);
    /* 第 3 段：感知 */
    var p3 = group(s);
    label(p3, R, 62, '难在看清楚', 'demo-x-ink', 13.5);
    [['透明', '密封袋、杯子、胶带'], ['黑在黑上', '黑扎带、黑胶带座放在黑桌面'], ['会反光、会变形', '袋里的糖纸、袋子的褶皱']].forEach(function (r, k) {
      var y = 80 + k * 48;
      rectBox(p3, R, y, 352, 40, C_BORDER, C_SURFACE2);
      label(p3, R + 12, y + 25, r[0], 'demo-x-ink', 12.5);
      label(p3, R + 120, y + 25, r[1], 'demo-x-ink2', 12);
    });
    label(p3, R, 244, '论文：透明的东西也不适合用深度相机', 'demo-x-ink2', 12);
    /* 第 4 段：仿真任务 */
    var p4 = group(s);
    label(p4, R, 62, '2 个仿真任务（MuJoCo，论文图 5）', 'demo-x-ink', 13.5);
    paperPart(p4, 'fig5', 0, 0, 1, 1, R, 78, 352, '');
    var spr = simSprite(p4, 'te_ep0.webp');
    label(p4, R, 196, '交接方块：方块和左夹爪只差约 1 cm', 'demo-x-ink2', 12);
    label(p4, R, 220, '双臂插销：插的时候间隙约 5 mm', 'demo-x-ink2', 12);
    label(p4, R, 244, '方块在 20 × 20 cm 里随机；下方是我们复现的渲染', 'demo-x-mut', 11);
    /* 第 5 段：数据 */
    var p5 = group(s);
    label(p5, R, 62, '每个任务多少示范', 'demo-x-ink', 13.5);
    var d5 = cellGrid(p5, R, 82, 100, 25, 11, 3, C_HUMAN);
    label(p5, R, 156, '真机：每个 50 条；穿魔术贴扎带 100 条', 'demo-x-ink2', 12);
    label(p5, R, 180, '仿真：脚本示范 50 条 + 人的示范 50 条', 'demo-x-ink2', 12);
    label(p5, R, 204, '人在仿真里也用主臂遥操作，看着屏幕上的实时渲染', 'demo-x-ink2', 11.5);
    label(p5, R, 236, '每条 8–14 秒：10–20 分钟的数据', 'demo-x-ink', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock), sec = K.clipSince(t, 0), m = ((sec % tot) + tot) % tot, idx = Math.min(3, Math.floor(m / 12));
      clips.forEach(function (c, k) { c.g.style.display = k === idx ? '' : 'none'; c.at(m - idx * 12, k === idx); });
      bars.forEach(function (b, k) { b.style.opacity = k === idx ? 1 : 0.25; });
      nameT.textContent = (idx + 1) + ' / 4　' + PARTS[idx][1];
      rowImgs.forEach(function (r, k) { r.g.style.display = k === idx ? '' : 'none'; });
      var T2 = [TABLE1[3], TABLE2[0], TABLE2[2], TABLE2[3]][idx];
      subT.textContent = '分步：' + T2.subs.join(' → ');
      spr.put(R + 100, 252, 150, loopStep(now));
      d5.fill(Math.round(100 * seg(since(t, clock, 13.4), 0.2, 2.0)));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 13: 表一：和四个基线比 ── */
  function buildSceneTable1() {
    var s = sceneSvg('左边是表一四个任务最后一步的成功率：每组五根柱子是五种方法，仿真任务的实心柱是脚本示范、空心柱是人的示范。' +
      '右边依次出现：四个基线；怎么测；方块交接的三个分步；领先多少；真机上别的方法都过不了第一步');
    s.appendChild(svgText(24, 26, '表一：最后一步的成功率（%）', 'demo-x-ink2', 13.5));
    var PANELS = [[24, 44], [214, 44], [24, 206], [214, 206]];
    var cols = [];
    TABLE1.forEach(function (T, k) {
      var x0 = PANELS[k][0], y0 = PANELS[k][1];
      rectBox(s, x0, y0, 186, 154, C_BORDER, C_SURFACE2);
      label(s, x0 + 93, y0 + 18, T.task, 'demo-x-ink', 11.5, 'middle');
      var base = y0 + 132;
      hline(s, x0 + 8, base, x0 + 178, base, C_BORDER, 1.2);
      METHODS.forEach(function (m, j) {
        var x = x0 + 14 + j * 34, v = T.v[m.key][2];
        var a = colBar(s, x, T.sim ? 13 : 24, base, METHOD_COLORS[m.key]);
        var b = null;
        if (T.sim) { b = colBar(s, x + 14, 13, base, 'none'); b.b.node.style.stroke = METHOD_COLORS[m.key]; b.b.node.style.strokeWidth = 1.6; }
        cols.push({ a: a, b: b, v: v, sim: T.sim });
      });
    });
    METHODS.forEach(function (m, j) {
      var x = [30, 124, 176, 232, 292][j];
      s.appendChild(paint(svgEl('rect', { x: x, y: 370, width: 12, height: 10, rx: 2 }), METHOD_COLORS[m.key]));
      label(s, x + 16, 380, m.zh, 'demo-x-ink2', 11);
    });
    label(s, 24, 406, '仿真：实心 = 脚本示范，空心 = 人的示范；柱高 = 成功率', 'demo-x-mut', 11);
    var R = 424;
    /* 第 1 段：基线 */
    var p1 = group(s);
    label(p1, R, 62, '四个基线', 'demo-x-ink', 13.5);
    [['BC-ConvMLP', '卷积 + MLP，最常用、最简单', 'bc'], ['BeT', 'Transformer，看历史，动作离散成格 + 偏移', 'bet'], ['RT-1', 'Transformer，看历史，动作离散成 256 格', 'rt1'],
      ['VINN', '找最像的示范帧，按距离加权取动作', 'vinn']].forEach(function (r, k) {
      var y = 78 + k * 40;
      chip(p1, R, y, 100, r[0], METHOD_COLORS[r[2]], { size: 11.5, h: 28 });
      label(p1, R + 110, y + 19, r[1], 'demo-x-ink2', 11.5);
    });
    label(p1, R, 252, '都只预测一步；基线的超参数在方块交接上调过', 'demo-x-ink2', 11.5);
    /* 第 2 段：怎么测 */
    var p2 = group(s);
    label(p2, R, 62, '怎么测', 'demo-x-ink', 13.5);
    label(p2, R, 92, '仿真：3 个种子，每个测 50 次，取平均', 'demo-x-ink2', 12);
    label(p2, R, 116, '　　　脚本示范、人的示范各训一遍', 'demo-x-ink2', 12);
    label(p2, R, 140, '真机：1 个种子，测 25 次，只有人的示范', 'demo-x-ink2', 12);
    var dots2 = cellGrid(p2, R, 160, 25, 25, 11, 3, C_GOOD);
    label(p2, R, 200, '每个任务按分步打分，看卡在哪一步', 'demo-x-ink2', 12);
    /* 第 3 段：分步 */
    var p3 = group(s);
    label(p3, R, 62, '方块交接（人的示范）：碰到 → 抬起 → 交接', 'demo-x-ink', 13);
    var sub3 = ['act', 'bet', 'vinn'].map(function (key, k) {
      var y = 96 + k * 46;
      label(p3, R, y + 12, METHODS.filter(function (m) { return m.key === key; })[0].zh, 'demo-x-ink2', 11.5);
      return [0, 1, 2].map(function (j) { return barRowAt(p3, R + 70 + j * 94, y, 0, '', METHOD_COLORS[key], 14, 11); });
    });
    ['碰到', '抬起', '交接'].forEach(function (n, j) { label(p3, R + 70 + j * 94, 82, n, 'demo-x-mut', 11); });
    label(p3, R, 238, '别的方法前两步还行，到最后一步就掉下来', 'demo-x-ink2', 12);
    /* 第 4 段：领先 */
    var p4 = group(s);
    label(p4, R, 62, '和最好的基线比，最后一步高出多少', 'demo-x-ink', 13.5);
    var lead4 = [['交接 · 脚本', 86, 27], ['交接 · 人', 50, 1], ['插销 · 脚本', 32, 3], ['插销 · 人', 20, 0]].map(function (r, k) {
      return { b: barRowAt(p4, R, 84 + k * 32, 96, r[0], C_GOOD, 18, 11.5), v: r };
    });
    label(p4, R, 228, '单位：百分点；论文写的是 59、49、29、20', 'demo-x-mut', 11);
    /* 第 5 段：真机 */
    var p5 = group(s);
    label(p5, R, 62, '真机：别的方法都过不了第一步', 'demo-x-ink', 13.5);
    label(p5, R, 92, 'ACT：拉开密封袋 88%，装电池 96%', 'demo-x-ink', 12.5);
    label(p5, R, 120, '基线最好的 VINN：第一步 28% / 20%，后面全是 0', 'demo-x-ink2', 12);
    label(p5, R, 156, '论文的解释：复合误差 + 示范里的停顿', 'demo-x-ink2', 12);
    label(p5, R, 180, '越到回合后面越差，有的状态会一直停住', 'demo-x-ink2', 12);
    label(p5, R, 216, '从脚本换成人的示范，所有方法都掉了', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var u = seg(since(t, clock, 0.4), 0.2, 2.0);
      cols.forEach(function (c) {
        if (c.sim) { c.a.set(100 * c.v[0] / 100 * K.ease(u), String(c.v[0])); c.b.set(100 * c.v[1] / 100 * K.ease(u), ''); }
        else c.a.set(100 * c.v / 100 * K.ease(u), String(c.v));
      });
      dots2.fill(Math.round(25 * seg(since(t, clock, 3.6), 0.6, 2.2)));
      var u3 = seg(since(t, clock, 7.0), 0.2, 1.8);
      sub3.forEach(function (row, k) {
        var key = ['act', 'bet', 'vinn'][k];
        row.forEach(function (b, j) { var v = TABLE1[0].v[key][j][1]; b.set(70 * v / 100 * K.ease(u3), v + '%'); });
      });
      var u4 = seg(since(t, clock, 10.4), 0.2, 1.8);
      lead4.forEach(function (l) { var d = l.v[1] - l.v[2]; l.b.set(220 * d / 60 * K.ease(u4), '+' + d); });
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 14: 表二与真机的细节 ── */
  function buildSceneTable2() {
    var s = sceneSvg('左边是项目页的两段实时视频：先是有人在策略伸手的时候把杯子挪开，策略跟着改道；再是桌上放了干扰物，策略照样装电池。' +
      '右边依次出现：表二四个任务最后一步的成功率；穿魔术贴扎带每一步掉一半；失败的原因；我们在仿真里试的：右手伸过去的途中把方块挪开 4 厘米，' +
      '这一次策略改道夹到了方块，9 次里成功 3 次；干扰物');
    s.appendChild(svgText(24, 26, '表二：剩下的真机任务，只和 BeT 比', 'demo-x-ink2', 13.5));
    var PARTS = [[14, '有人把杯子挪开（实时）'], [16, '桌上放了干扰物（实时）']];
    var clips = [projClip(s, 'reactive', 24, 44, 380, 214, '项目页视频：学到的策略'), projClip(s, 'distract', 24, 44, 380, 214, '项目页视频：学到的策略')];
    var bars = PARTS.map(function (p, k) { var r = paint(svgEl('rect', { x: 24 + k * 190, y: 307, width: 186, height: 5, rx: 2.5 }), C_ACCENT); s.appendChild(r); return r; });
    var nameT = label(s, 24, 330, '', 'demo-x-ink', 12.5);
    label(s, 24, 352, '画面右下角标着 1x', 'demo-x-mut', 11);
    var R = 424;
    /* 第 1 段：表二 */
    var p1 = group(s);
    label(p1, R, 62, '最后一步的成功率（%），各测 25 次', 'demo-x-ink', 13.5);
    var t2 = TABLE2.map(function (T, k) {
      var y = 78 + k * 48;
      label(p1, R, y + 17, T.task, 'demo-x-ink2', 11.5);
      return { a: barRowAt(p1, R + 96, y, 40, 'ACT', C_GOOD, 13, 11), b: barRowAt(p1, R + 96, y + 21, 40, 'BeT', C_ACCENT, 13, 11), T: T };
    });
    label(p1, R, 276, '论文正文写「剩下 3 个」，表里其实是 4 个', 'demo-x-mut', 11);
    /* 第 2 段：魔术贴扎带 */
    var p2 = group(s);
    label(p2, R, 62, '穿魔术贴扎带：每一步大约掉一半', 'demo-x-ink', 13.5);
    var fun = [92, 40, 20].map(function (v, k) {
      var w = 230 * v / 100, x = R + 236 - w / 2, y = 86 + k * 50;
      var r = paint(svgEl('rect', { x: x, y: y, width: 0, height: 34, rx: 4 }), C_GOOD);
      p2.appendChild(r);
      label(p2, R, y + 22, ['拿起', '空中抓住尾巴', '穿进环里'][k], 'demo-x-ink2', 12);
      var tt = label(p2, R + 236, y + 22, '', 'demo-x-ink', 12, 'middle');
      return { r: r, w: w, x: x, t: tt, v: v };
    });
    label(p2, R, 252, '第一步抓偏几毫米，到空中对穿时就偏出 10 mm 以上', 'demo-x-ink2', 11.5);
    /* 第 3 段：失败原因 */
    var p3 = group(s);
    label(p3, R, 62, '失败在哪', 'demo-x-ink', 13.5);
    rectBox(p3, R, 78, 352, 54, C_BORDER, C_SURFACE2);
    label(p3, R + 12, 100, '第 2 步：右夹爪合得太早，没抓到尾巴', 'demo-x-ink', 12);
    rectBox(p3, R, 140, 352, 54, C_BORDER, C_SURFACE2);
    label(p3, R + 12, 162, '第 3 步：插得不够准，没进环', 'demo-x-ink', 12);
    label(p3, R, 222, '扎带是黑的、桌子也是黑的，在图里只占一小块', 'demo-x-ink2', 12);
    label(p3, R, 246, '从顶部相机看尤其难找', 'demo-x-ink2', 12);
    /* 第 4 段：反应 */
    var p4 = group(s);
    label(p4, R, 62, '项目页：会对新的扰动作出反应', 'demo-x-ink', 13.5);
    label(p4, R, 90, '左边第一段：手伸过去的时候，有人把杯子挪走', 'demo-x-ink2', 12);
    label(p4, R, 114, '策略看着新位置重新去够，不是背下来的轨迹', 'demo-x-ink2', 12);
    /* 我们的复现（runs/perturb_0）：第 0 个方块位置，第 100 步把方块往右（+x）挪 4 cm，时间集成照常跑；这一次第 153 步夹到、第 246 步交接完成。
       3 个方块位置 × 3 个方向一共 9 次，3 次成功；不挪时这 3 个位置都成功 */
    var PT = MODEL && MODEL.perturb, ptS = PT ? modelSheet(p4, 'perturb.webp', PT) : null, PX4 = R + 6, PY4 = 124, PW4 = 340;
    var ghost = paint(svgEl('rect', { x: 0, y: 0, width: 10, height: 10, rx: 1.5, fill: 'none', 'stroke-width': 1.6, 'stroke-dasharray': '2.5 2' }), null, C_WARN);
    p4.appendChild(ghost);
    var stepT = label(p4, R, 272, '', 'demo-x-ink2', 11.5);
    tone(p4, R, 294, '我们的复现：伸手途中挪 4 cm，9 次里 3 次仍完成交接', C_GOOD, 11.5);
    label(p4, R, 316, '项目页也放了失败的例子：扰动来得太晚，就没救回来', 'demo-x-mut', 11);
    /* 第 5 段：干扰物 */
    var p5 = group(s);
    label(p5, R, 62, '项目页：对一定程度的干扰物也稳', 'demo-x-ink', 13.5);
    label(p5, R, 90, '左边第二段：桌上放了别的东西，照样装电池', 'demo-x-ink2', 12);
    label(p5, R, 114, '同样也放了失败的例子', 'demo-x-ink2', 12);
    label(p5, R, 156, '所有真机结果都只有 1 个种子、25 次', 'demo-x-ink', 12);
    label(p5, R, 180, '这些视频是挑出来的例子，不是统计', 'demo-x-ink2', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock), sec = K.clipSince(t, 0), tot = 30, m = ((sec % tot) + tot) % tot, idx = m < 14 ? 0 : 1;
      clips.forEach(function (c, k) { c.g.style.display = k === idx ? '' : 'none'; c.at(idx ? m - 14 : m, k === idx); });
      bars.forEach(function (b, k) { b.style.opacity = k === idx ? 1 : 0.25; });
      nameT.textContent = (idx + 1) + ' / 2　' + PARTS[idx][1];
      var u1 = seg(since(t, clock, 0.4), 0.2, 1.8);
      t2.forEach(function (r) { var a = r.T.act[r.T.act.length - 1], b = r.T.bet[r.T.bet.length - 1]; r.a.set(180 * a / 100 * K.ease(u1), a + '%'); r.b.set(180 * b / 100 * K.ease(u1) + 1, b + '%'); });
      var u2 = since(t, clock, 3.6);
      fun.forEach(function (f, k) {
        var u = K.ease(seg(u2, 0.3 + k * 0.7, 0.9 + k * 0.7));
        f.r.setAttribute('x', (R + 236 - f.w * u / 2).toFixed(1)); setW(f.r, f.w * u);
        f.t.textContent = u > 0.9 ? f.v + '%' : '';
      });
      if (PT) {
        /* 按 50 Hz 原速往前放（每格 4 步），放完停 1 s 再从头 */
        var nL = PT.n + 12, pfi = Math.min(PT.n - 1, Math.floor(now * 50 / 4) % nL), stp = PT.steps[pfi];
        ptS.put(PX4, PY4, PW4, pfi);
        var iOld = PT.steps.indexOf(PT.t_move - 4), old = ptS.at(PT.cube[iOld]);
        var moved = stp >= PT.t_move;
        ghost.setAttribute('x', (old[0] - 5).toFixed(1)); ghost.setAttribute('y', (old[1] - 5).toFixed(1));
        ghost.style.opacity = moved ? 1 : 0;
        stepT.textContent = '第 ' + stp + ' 步：' + (stp >= PT.success ? '交接完成' : stp >= PT.touch ? '夹到了，正往左手送' :
          moved ? '方块被往右挪了 4 cm（黄虚线框是原位置）' : '右手伸向方块');
      }
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 15: 消融：分块与时间集成（图 6a、b） ── */
  function buildSceneAblateK() {
    var s = sceneSvg('左边重画论文图 6 (a)：横轴是块大小 k，从 1（每步都看）到 400（看一次走到底），纵轴是 4 种设定的平均成功率；蓝线 ACT、绿线 BC-ConvMLP、灰线 VINN，' +
      'ACT 在 k = 100 最高。右边依次出现：读法；ACT 从 1% 涨到 44%；基线加上分块也涨；图 6 (b) 时间集成的加减；我们复现里开环分块和时间集成的成功率');
    s.appendChild(svgText(24, 26, '图 6 (a)：块大小 k 对成功率的影响', 'demo-x-ink2', 13.5));
    var pb = plotBox(s, 54, 44, 340, 240, 0, 4, 0, 50);
    [0, 12.5, 25, 37.5, 50].forEach(function (v) {
      hline(pb.g, 54, pb.py(v), 394, pb.py(v), C_BORDER, 0.8, '2 4');
      label(s, 48, pb.py(v) + 4, String(v), 'demo-x-mut', 11, 'end');
    });
    FIG6A.k.forEach(function (k, i) { label(s, pb.px(i), 302, String(k), 'demo-x-ink2', 11.5, 'middle'); });
    label(s, 54, 324, '← 每步都看（闭环）', 'demo-x-mut', 11);
    label(s, 394, 324, '看一次走到底（开环）→', 'demo-x-mut', 11, 'end');
    var LN = [['act', C_ACCENT], ['bc', C_GOOD], ['vinn', C_MUTED]].map(function (c) { return { key: c[0], p: pathLine(pb.g, [], c[1], 2.6), d: dotAt(pb.g, 0, 0, 4, c[1]) }; });
    var star = ringAt(s, 0, 0, 10, C_WARN, 2.6);
    lineLegend(s, 54, 350, [['ACT', C_ACCENT], ['BC-ConvMLP', C_GOOD], ['VINN', C_MUTED]], 11);
    label(s, 24, 376, '纵轴：成功率（%），2 个仿真任务 × 脚本 / 人的示范，4 种设定取平均', 'demo-x-mut', 11);
    label(s, 24, 398, '不开时间集成；每个 k 单独训一个策略；数照 arXiv 源文件里的原始表', 'demo-x-mut', 11);
    var R = 424;
    /* 第 1 段 */
    var p1 = group(s);
    label(p1, R, 62, '读法', 'demo-x-ink', 13.5);
    label(p1, R, 90, 'k = 1：没有分块，就是普通的单步策略', 'demo-x-ink2', 12);
    label(p1, R, 114, 'k = 400：回合长度，看第一眼就把整段做完', 'demo-x-ink2', 12);
    label(p1, R, 138, '越高越好；三条线是三种方法', 'demo-x-ink2', 12);
    label(p1, R, 174, '为了只看分块的作用，这组实验不开时间集成', 'demo-x-ink', 12);
    /* 第 2 段 */
    var p2 = group(s);
    label(p2, R, 62, 'ACT：1% → 44%', 'demo-x-ink', 13.5);
    var v2 = FIG6A.act.map(function (v, i) { return barRowAt(p2, R, 80 + i * 26, 70, 'k = ' + FIG6A.k[i], C_ACCENT, 16, 11.5); });
    label(p2, R, 222, 'k 再往上略降：反应变慢，长序列也更难学', 'demo-x-ink2', 12);
    label(p2, R, 246, '（论文的解释）', 'demo-x-mut', 11);
    /* 第 3 段 */
    var p3 = group(s);
    label(p3, R, 62, '基线加上分块，也涨', 'demo-x-ink', 13.5);
    label(p3, R, 90, 'BC-ConvMLP：输出改成 k × 14', 'demo-x-ink2', 12);
    label(p3, R, 114, 'VINN：找到最像的帧，取它后面的 k 步', 'demo-x-ink2', 12);
    var v3 = [['BC-ConvMLP', FIG6A.bc, C_GOOD], ['VINN', FIG6A.vinn, C_MUTED]].map(function (r, k) {
      return { a: barRowAt(p3, R, 134 + k * 54, 92, r[0] + ' k=1', r[2], 14, 11), b: barRowAt(p3, R, 154 + k * 54, 92, '最好的 k', r[2], 14, 11), v: r[1] };
    });
    label(p3, R, 262, '分块对模仿学习普遍有用；ACT 仍然领先', 'demo-x-ink2', 12);
    /* 第 4 段：图 6b */
    var p4 = group(s);
    label(p4, R, 62, '图 6 (b)：开不开时间集成', 'demo-x-ink', 13.5);
    var cb = [['ACT', FIG6B.act], ['BC-ConvMLP', FIG6B.bc], ['VINN', FIG6B.vinn]].map(function (r, k) {
      var x = R + 20 + k * 116;
      label(p4, x + 30, 232, r[0], 'demo-x-ink2', 11.5, 'middle');
      return { a: colBar(p4, x, 26, 214, C_ACCENT), b: colBar(p4, x + 32, 26, 214, C_GOOD), v: r[1], x: x };
    });
    hline(p4, R, 214, R + 352, 214, C_BORDER, 1.2);
    legendRow(p4, R, 256, [['不开', C_ACCENT, 26], ['开时间集成', C_GOOD, 64]], 11);
    var d4 = label(p4, R + 352, 256, '', 'demo-x-ink2', 11.5, 'end');
    /* 第 5 段：复现 */
    var p5 = group(s);
    label(p5, R, 62, '我们的复现：同样 50 个方块位置', 'demo-x-ink', 13.5);
    var r5 = [barRowAt(p5, R, 84, 110, '开环分块', C_ACCENT, 18, 11.5), barRowAt(p5, R, 114, 110, '时间集成', C_GOOD, 18, 11.5)];
    var r5t = label(p5, R, 160, '', 'demo-x-ink2', 12);
    label(p5, R, 186, '只是一个检查点（人的示范训的），不是论文的实验', 'demo-x-ink2', 11.5);
    label(p5, R, 210, '论文：方块交接、人的示范，ACT 是 50%（表一）', 'demo-x-ink2', 11.5);
    var r5b = label(p5, R, 234, '', 'demo-x-mut', 11);
    function draw(t, clock) {
      var u = seg(since(t, clock, 0.4), 0.2, 2.6);
      LN.forEach(function (L) {
        var v = FIG6A[L.key], n = u * 4, pts = [];
        for (var i = 0; i <= Math.floor(n); i++) pts.push([pb.px(i), pb.py(v[i])]);
        var fl = Math.floor(n);
        if (fl < 4) { var fr = n - fl; pts.push([pb.px(fl + fr), pb.py(v[fl] + (v[fl + 1] - v[fl]) * fr)]); }
        setPath(L.p, pts); moveDot(L.d, pts[pts.length - 1]);
      });
      moveDot(star, [pb.px(2), pb.py(44)]);
      star.style.opacity = u > 0.6 ? 1 : 0;
      var u2 = seg(since(t, clock, 3.6), 0.2, 1.6);
      v2.forEach(function (b, i) { b.set(250 * FIG6A.act[i] / 50 * K.ease(u2), FIG6A.act[i] + '%'); });
      var u3 = seg(since(t, clock, 7.0), 0.2, 1.6);
      v3.forEach(function (r) { var best = Math.max.apply(null, r.v); r.a.set(220 * r.v[0] / 50 * K.ease(u3) + 1, r.v[0] + '%'); r.b.set(220 * best / 50 * K.ease(u3), best + '%'); });
      var u4 = seg(since(t, clock, 10.4), 0.2, 1.6);
      cb.forEach(function (c) { c.a.set(110 * c.v[0] / 50 * K.ease(u4), String(c.v[0])); c.b.set(110 * c.v[1] / 50 * K.ease(u4), String(c.v[1])); });
      d4.textContent = u4 > 0.95 ? '+3.3　+4　−20' : '';
      if (REPRO && REPRO.succ) {
        var u5 = seg(since(t, clock, 13.4), 0.2, 1.6), S = REPRO.succ;
        r5[0].set(200 * S.chunk / S.n * K.ease(u5), S.chunk + ' / ' + S.n);
        r5[1].set(200 * S.te / S.n * K.ease(u5), S.te + ' / ' + S.n);
        r5t.textContent = '成功 = 左夹爪拿着方块、方块离开桌面（官方的奖励 4）';
        r5b.textContent = 'HF 上这份权重自带的评测：不开时间集成、500 回合 68.2%';
      }
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 16: 消融：CVAE 与 50 Hz（图 6c、d） ── */
  function buildSceneAblateCvae() {
    var s = sceneSvg('左上重画论文图 6 (c)：脚本示范和人的示范两组，蓝柱有 CVAE、绿柱没有；人的示范上没有 CVAE 几乎全失败。' +
      '左下是用户研究：扎扎带和分开两个叠着的杯子，5 Hz 和 50 Hz 遥操作的平均用时。右边依次出现：读法；人的示范上掉到 2%；用户研究怎么做；结果；为什么要 50 Hz');
    s.appendChild(svgText(24, 26, '图 6 (c)：有没有 CVAE（成功率 %）', 'demo-x-ink2', 13.5));
    var base = 186;
    hline(s, 34, base, 394, base, C_BORDER, 1.2);
    var cv = [['脚本示范', FIG6C.scripted], ['人的示范', FIG6C.human]].map(function (r, k) {
      var x = 70 + k * 170;
      label(s, x + 50, base + 18, r[0], 'demo-x-ink2', 11.5, 'middle');
      return { a: colBar(s, x, 44, base, C_ACCENT), b: colBar(s, x + 54, 44, base, C_GOOD), v: r[1] };
    });
    legendRow(s, 34, 228, [['有 CVAE', C_ACCENT, 50], ['没有 CVAE', C_GOOD, 64]], 11);
    s.appendChild(svgText(24, 262, '图 6 (d)：遥操作的平均用时（秒）', 'demo-x-ink2', 13.5));
    var us = [['扎扎带', FIG6D.zip], ['分开两个杯子', FIG6D.cups]].map(function (r, k) {
      var y = 272 + k * 64;
      label(s, 24, y + 13, r[0], 'demo-x-ink2', 11.5);
      return { a: barRowAt(s, 24, y + 22, 50, '5 Hz', C_BAD, 14, 11), b: barRowAt(s, 24, y + 43, 50, '50 Hz', C_GOOD, 14, 11), v: r[1] };
    });
    label(s, 24, 410, '条越短越好；数是正文给的平均值', 'demo-x-mut', 11);
    var R = 424;
    /* 第 1 段 */
    var p1 = group(s);
    label(p1, R, 62, '读法', 'demo-x-ink', 13.5);
    label(p1, R, 90, '两个仿真任务合起来的成功率，越高越好', 'demo-x-ink2', 12);
    label(p1, R, 114, '没有 CVAE：给定观测直接回归 k 步动作（L1）', 'demo-x-ink2', 12);
    label(p1, R, 150, '脚本示范：59% 对 58%，几乎没差', 'demo-x-ink', 12);
    label(p1, R, 174, '脚本数据完全确定，用不着「风格」', 'demo-x-ink2', 12);
    /* 第 2 段 */
    var p2 = group(s);
    label(p2, R, 62, '人的示范：35.3% → 2%', 'demo-x-ink', 13.5);
    var bigd = label(p2, R, 112, '', 'demo-x-ink', 28);
    label(p2, R, 148, '论文的结论：从人的示范学，CVAE 是关键', 'demo-x-ink2', 12);
    label(p2, R, 172, '我们的复现里 z 几乎不带信息（第 8 幕）', 'demo-x-ink2', 12);
    label(p2, R, 196, '为什么 CVAE 还这么关键，论文没有分析', 'demo-x-mut', 11);
    /* 第 3 段：用户研究 */
    var p3 = group(s);
    label(p3, R, 62, '用户研究：遥操作要多快的频率', 'demo-x-ink', 13.5);
    var ppl = [];
    for (var i = 0; i < 6; i++) ppl.push(dotAt(p3, R + 20 + i * 36, 96, 10, i < 3 ? C_ACCENT : C_MUTED));
    label(p3, R, 126, '6 位研究生，从没用过 ALOHA', 'demo-x-ink2', 11.5);
    label(p3, R, 146, '蓝：其中 3 位用 VR 手柄遥操作过', 'demo-x-mut', 11);
    label(p3, R, 172, '扎扎带：孔 4 × 1.5 mm，带子 0.8 × 3.5 mm', 'demo-x-ink2', 12);
    label(p3, R, 196, '分杯子：叠着的两个杯子只差 2.5 mm', 'demo-x-ink2', 12);
    label(p3, R, 220, '每种先练 2 分钟，再连做 3 次；顺序随机', 'demo-x-ink2', 12);
    label(p3, R, 244, '5 Hz：主臂每秒读 5 次，插值后仍按 50 Hz 发', 'demo-x-ink2', 11.5);
    /* 第 4 段：结果 */
    var p4 = group(s);
    label(p4, R, 62, '结果：5 Hz 慢了 62%', 'demo-x-ink', 13.5);
    label(p4, R, 92, '扎扎带：33 秒 → 20 秒', 'demo-x-ink', 12.5);
    label(p4, R, 118, '分杯子：16 秒 → 10 秒', 'demo-x-ink', 12.5);
    label(p4, R, 154, '重复测量设计检验：50 Hz 更快，p < 0.001', 'demo-x-ink2', 12);
    var clk = ringAt(p4, R + 60, 214, 26, C_BAD, 2), clk2 = ringAt(p4, R + 200, 214, 26, C_GOOD, 2);
    void clk; void clk2;
    var hand1 = hline(p4, R + 60, 214, R + 60, 192, C_BAD, 2.4), hand2 = hline(p4, R + 200, 214, R + 200, 192, C_GOOD, 2.4);
    label(p4, R + 60, 258, '5 Hz', 'demo-x-ink2', 11.5, 'middle');
    label(p4, R + 200, 258, '50 Hz', 'demo-x-ink2', 11.5, 'middle');
    /* 第 5 段 */
    var p5 = group(s);
    label(p5, R, 62, '为什么要在意频率', 'demo-x-ink', 13.5);
    label(p5, R, 90, '5 Hz 和近年用大网络的模仿学习差不多', 'demo-x-ink2', 12);
    label(p5, R, 114, '（论文举的是 RT-1）', 'demo-x-mut', 11);
    label(p5, R, 150, '人在 5 Hz 下都做得更慢', 'demo-x-ink2', 12);
    label(p5, R, 174, 'ACT 一次出 100 步，每步 0.02 秒', 'demo-x-ink', 12);
    label(p5, R, 198, '大网络也能输出 50 Hz 的动作', 'demo-x-ink', 12);
    function draw(t, clock) {
      var now = nowOf(t, clock), u = seg(since(t, clock, 0.4), 0.2, 1.8);
      cv.forEach(function (c) { c.a.set(130 * c.v[0] / 60 * K.ease(u), String(c.v[0])); c.b.set(130 * c.v[1] / 60 * K.ease(u) + 1, String(c.v[1])); });
      var u2 = seg(since(t, clock, 0.4), 1.0, 2.6);
      us.forEach(function (r) { r.a.set(280 * r.v[0] / 35 * K.ease(u2), r.v[0] + ' 秒'); r.b.set(280 * r.v[1] / 35 * K.ease(u2), r.v[1] + ' 秒'); });
      var d = seg(since(t, clock, 3.6), 0.3, 1.8);
      bigd.textContent = f1(35.3 - 33.3 * K.ease(d)) + '%';
      ppl.forEach(function (p, i) { p.setAttribute('r', (9 + 2 * Math.sin(now * 2 + i)).toFixed(1)); });
      var a1 = now * 6.283 / 33 * 4, a2 = now * 6.283 / 20 * 4;
      setLine(hand1, R + 60, 214, R + 60 + 22 * Math.sin(a1), 214 - 22 * Math.cos(a1));
      setLine(hand2, R + 200, 214, R + 200 + 22 * Math.sin(a2), 214 - 22 * Math.cos(a2));
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 17: 局限、代码与之后 ── */
  function buildSceneLimits() {
    var s = sceneSvg('左边是三段小动画：要两只手好几根手指一起用的儿童安全药瓶（旁边是 ViperX 夹爪的模型，只有两根平行的手指）；要很大力气的事，电机的力矩不够；剥糖纸，拿起和拉两端都行，剥开 0 次。' +
      '右边依次出现：硬件的局限；策略学不会的两个任务；论文、项目页和代码对不上的几处；开源了什么；我们的复现');
    s.appendChild(svgText(24, 26, '做不到的：论文附录 F 自己列的', 'demo-x-ink2', 13.5));
    /* (a) 儿童安全瓶 */
    rectBox(s, 24, 44, 186, 150, C_BORDER, C_SURFACE2);
    label(s, 117, 64, '按下去再拧开', 'demo-x-ink', 12, 'middle');
    var bottle = paint(svgEl('rect', { x: 92, y: 110, width: 50, height: 60, rx: 6 }), C_MUTED), lid = paint(svgEl('rect', { x: 88, y: 92, width: 58, height: 18, rx: 4 }), C_ACCENT);
    s.appendChild(bottle); s.appendChild(lid);
    var x1 = cross(s, 168, 150, 18);
    void x1;
    /* ViperX 夹爪的模型（官方 ACT 的 MJCF）：只有两根平行的手指 */
    var GM17 = MODEL && MODEL.grip;
    if (GM17) modelSheet(s, 'grip.webp', GM17).put(34, 84, 46, GM17.n - 1);
    label(s, 117, 186, '要多根手指，一手按一手拧', 'demo-x-ink2', 11, 'middle');
    /* (b) 力气 */
    rectBox(s, 218, 44, 186, 150, C_BORDER, C_SURFACE2);
    label(s, 311, 64, '要很大的力', 'demo-x-ink', 12, 'middle');
    var need = hbar(s, 236, 100, 14, C_BAD), have = hbar(s, 236, 128, 14, C_ACCENT);
    label(s, 236, 96, '拧开没开过的水瓶', 'demo-x-ink2', 11);
    label(s, 236, 158, '低成本电机的力矩', 'demo-x-ink2', 11);
    label(s, 311, 186, '重物、紧的笔帽也不行', 'demo-x-ink2', 11, 'middle');
    /* (c) 剥糖纸 */
    rectBox(s, 24, 204, 380, 150, C_BORDER, C_SURFACE2);
    label(s, 214, 224, '剥糖纸（50 条示范，先测 10 次）', 'demo-x-ink', 12, 'middle');
    var cd = [['拿起', CANDY.pick], ['拉两端', CANDY.pull], ['剥开', CANDY.unwrap]].map(function (r, k) {
      return { b: barRowAt(s, 40, 240 + k * 30, 70, r[0], k === 2 ? C_BAD : C_GOOD, 18, 11.5), v: r[1] };
    });
    label(s, 40, 346, '接缝可能在糖纸的任何地方，连人都要看图案才找得到', 'demo-x-ink2', 11);
    label(s, 24, 380, '换个测法（每颗糖给 10 次机会）：5 颗剥开 3 颗', 'demo-x-mut', 11);
    var R = 424;
    /* 第 1 段 */
    var p1 = group(s);
    label(p1, R, 62, '硬件的局限', 'demo-x-ink', 13.5);
    label(p1, R, 92, '· 要两只手好几根手指一起用：儿童安全药瓶', 'demo-x-ink2', 12);
    label(p1, R, 116, '· 要很大的力：重物、没开过的水瓶、紧的笔帽', 'demo-x-ink2', 12);
    label(p1, R, 140, '· 要指甲：撕开粘在自己身上的胶带、拉开易拉罐', 'demo-x-ink2', 12);
    label(p1, R, 176, '平行夹爪 + 便宜的电机，换来了价格', 'demo-x-ink', 12);
    /* 第 2 段 */
    var p2 = group(s);
    label(p2, R, 62, 'ACT 没学会的两个任务', 'demo-x-ink', 13.5);
    label(p2, R, 92, '剥糖纸：左边，最后一步 0 / 10', 'demo-x-ink2', 12);
    label(p2, R, 116, '平放的小密封袋：拿得起来，后面三步空中操作不行', 'demo-x-ink2', 12);
    label(p2, R, 152, '论文的猜测：袋子难看清，拿的位置差一点', 'demo-x-ink2', 12);
    label(p2, R, 176, '袋子变形就差很多', 'demo-x-ink2', 12);
    label(p2, R, 212, '论文认为：预训练、更多数据、更好的感知', 'demo-x-ink', 12);
    /* 第 3 段：对不上的地方 */
    var p3 = group(s);
    label(p3, R, 62, '论文、项目页、代码对不上的几处', 'demo-x-ink', 13.5);
    var fl3 = flipList(p3, R, 80, [['块大小 k', '100（表 III）', '90（项目页真机）'], ['解码器', '7 层', '只用第 1 层'], ['查询', '固定正弦编码', '学出来的'], ['特征通道', '图 7 写 728', '512（正文、代码）']], 76, 180, ['论文', '项目页 / 代码']);
    /* 第 4 段：开源 */
    var p4 = group(s);
    label(p4, R, 62, '开源了什么', 'demo-x-ink', 13.5);
    [['ALOHA 硬件', '3D 打印件、组装和软件教程'], ['ACT 代码', '训练、评测、两个仿真环境'], ['仿真示范', '脚本 + 人的示范，各 50 条']].forEach(function (r, k) {
      var y = 80 + k * 48;
      rectBox(p4, R, y, 352, 40, C_GOOD, C_SURFACE2);
      label(p4, R + 12, y + 25, r[0], 'demo-x-ink', 12.5);
      label(p4, R + 120, y + 25, r[1], 'demo-x-ink2', 12);
      tick(p4, R + 324, y + 12, 16);
    });
    label(p4, R, 244, '我们的复现只用了这些，加上 LeRobot 放出的权重', 'demo-x-ink2', 11.5);
    label(p4, R, 268, '后来的 π₀ 也用动作分块，但试过时间集成反而变差，改成开环执行', 'demo-x-mut', 11);
    /* 第 5 段：复现 */
    var p5 = group(s);
    label(p5, R, 62, '我们的复现（CPU）', 'demo-x-ink', 13.5);
    var r5 = [label(p5, R, 92, '', 'demo-x-ink2', 12), label(p5, R, 116, '', 'demo-x-ink2', 12), label(p5, R, 140, '', 'demo-x-ink2', 12), label(p5, R, 164, '', 'demo-x-ink2', 12)];
    label(p5, R, 200, '自己照官方代码写的前向和仿真环境，', 'demo-x-mut', 11);
    label(p5, R, 222, '权重是用官方仓库训的（LeRobot 转存）', 'demo-x-mut', 11);
    function draw(t, clock) {
      var now = nowOf(t, clock);
      var push = 0.5 + 0.5 * Math.sin(now * 2);
      lid.setAttribute('y', (92 + 4 * push).toFixed(1));
      setW(need, 150); setW(have, 60 + 8 * Math.sin(now * 3));
      var u = seg(since(t, clock, 0.4), 0.3, 2.4);
      cd.forEach(function (c, k) { var uu = K.ease(seg(u, k * 0.3, k * 0.3 + 0.4)); c.b.set(240 * c.v / 10 * uu + 1, uu > 0.9 ? c.v + ' / 10' : ''); });
      fl3.set(since(t, clock, 7.0));
      if (REPRO && REPRO.succ) {
        r5[0].textContent = '方块交接成功：开环 ' + REPRO.succ.chunk + ' / 50，时间集成 ' + REPRO.succ.te + ' / 50';
        r5[1].textContent = '一次推理 ' + f2(REPRO.cpu_s) + ' 秒（4 核 CPU）';
        r5[2].textContent = '起作用的参数 ' + f1(REPRO.params_used / 1e6) + 'M，总共 ' + f1(REPRO.params_all / 1e6) + 'M';
        r5[3].textContent = 'z 几乎不带信息：KL 平均 ' + REPRO.cvae.kl.toFixed(4);
      }
      setOpacity(p1, win(t, 0.3, 3.6));
      setOpacity(p2, win(t, 3.6, 7.0));
      setOpacity(p3, win(t, 7.0, 10.4));
      setOpacity(p4, win(t, 10.4, 13.4));
      setOpacity(p5, win(t, 13.4));
    }
    return { el: s, draw: draw };
  }

  var ACT_SCENES = [
    {
      title: '精细活，低成本硬件做得到吗',
      dur: 16,
      build: buildSceneIntro,
      cues: [
        { at: 0.4, s: '精细活要毫米级：扎带环宽 3 mm、仿真插销的间隙约 5 mm，差一点就失败。' },
        { at: 3.6, s: '以前靠贵的机器人和精确的传感器：Shadow 双手遥操作至少 40 万美元。' },
        { at: 7.0, s: '便宜的 ViperX 准度只有 5–8 mm，照着目标去，落点会散开。' },
        { at: 10.4, s: '人也没有工业级的本体感觉，靠眼睛看着纠正；论文就训一个从像素到动作的策略。' },
        { at: 13.4, s: '两样东西：**ALOHA** 硬件和 **ACT** 算法；50 条示范学会 6 个真机任务，开杯盖、装电池 80–90%。' }
      ]
    },
    {
      title: 'ALOHA：两对主从臂',
      dur: 16,
      build: buildSceneAloha,
      cues: [
        { at: 0.4, s: '人扳动小的主臂 WidowX，大的从臂 ViperX 照着同样的关节角动。' },
        { at: 3.6, s: '不用 VR 加逆运动学：6 自由度没有冗余；快伸直时目标每挪 1 cm，关节要转 17°。' },
        { at: 7.0, s: '握把和剪刀机构让夹爪连续开合；主臂的重量滤掉手抖；橡皮筋抵掉一部分重力。' },
        { at: 10.4, s: '2 × 5,600 + 2 × 3,300 = 17,800 美元；加上相机等配件不到 2 万。' },
        { at: 13.4, s: '照着 Shadow 系统的 15 个演示做，做出 14 个；没有手，转不了保定球。' }
      ]
    },
    {
      title: '记下什么：4 台相机与主臂关节角',
      dur: 16,
      build: buildSceneData,
      cues: [
        { at: 0.4, s: '4 台罗技 C922x，480 × 640：顶部、前方固定，两台装在手腕上；50 Hz 记录。' },
        { at: 3.6, s: '观测是 4 张图加从臂的 14 个关节角：每只手 6 个关节 + 1 个夹爪。' },
        { at: 7.0, s: '动作记主臂的关节角：主从之差经过电机的 PID，隐含了压得多紧。' },
        { at: 10.4, s: '一条示范 8–14 秒、400–700 步；每个任务 50 条，约 10–20 分钟的数据。' },
        { at: 13.4, s: '训练时随机抽一步 $t$：输入那一刻的观测，目标是接下来 $k$ 步的动作。' }
      ]
    },
    {
      title: '一步错，步步错',
      dur: 16,
      build: buildSceneCompound,
      cues: [
        { at: 0.4, s: '行为克隆：看一眼出一个动作；50 Hz 下一个回合要做 400 次决定。' },
        { at: 3.6, s: '每次差一点，状态就偏到训练里没见过的地方，误差越滚越大。' },
        { at: 7.0, s: 'DAgger、加噪声、合成纠正数据，在像素输入的精细活上都不好用。' },
        { at: 10.4, s: '人的示范会停顿：我们数的 50 条仿真示范里，11 条在交接完成前停过 0.2 秒以上。' },
        { at: 13.4, s: 'ACT 的思路：一次预测一段，$k = 100$ 时 400 步只做 4 次决定。' }
      ]
    },
    {
      title: '动作分块：一次预测 k 步',
      dur: 16,
      build: buildSceneChunk,
      cues: [
        { at: 0.4, s: '策略从 $\\pi_\\theta(a_t \\mid s_t)$ 改成 $\\pi_\\theta(a_{t:t+k} \\mid s_t)$：一次出 $k$ 个目标关节角。' },
        { at: 3.6, s: '每 $k$ 步才看一次，有效步数缩短 $k$ 倍（论文图 2 上半）。' },
        { at: 7.0, s: '一串动作合成一个块：不必每个动作都看一次，开头看一次就照着做完。' },
        { at: 10.4, s: '停顿可以写在一个块里，不用看历史，也就没有历史带来的因果混淆。' },
        { at: 13.4, s: '直接这样做，新观测每 $k$ 步才进来一次，块与块的接缝处会跳。' }
      ]
    },
    {
      title: '时间集成：重叠的预测取加权平均',
      dur: 16,
      build: buildSceneEnsemble,
      cues: [
        { at: 0.4, s: '改成每一步都查询：块和块重叠，同一步会收到好几个预测。' },
        { at: 3.6, s: '按 $w_i = e^{-m\\,i}$ 加权平均，$i = 0$ 是最老的；官方代码 $m = 0.01$。' },
        { at: 7.0, s: '$m$ 越小，各次预测越平均，新的观测进来得越快。' },
        { at: 10.4, s: '平均的是「同一步」的几次预测，不是把相邻几步的动作抹平。' },
        { at: 13.4, s: '训练不变，推理多算：一个回合从 4 次查询变成 400 次。' }
      ]
    },
    {
      title: '人的示范不唯一',
      dur: 16,
      build: buildSceneHuman,
      cues: [
        { at: 0.4, s: '同一个场景，人每次做得不一样；不讲究精度的地方更随意。' },
        { at: 3.6, s: '交接的位置每次不同：策略要学「别撞上、接得住」，不是死记位置。' },
        { at: 7.0, s: '两种走法逐点平均，可能正好撞上（示意）。' },
        { at: 10.4, s: '表一：从脚本示范换成人的示范，所有方法都掉了；ACT 交接 86% → 50%。' },
        { at: 13.4, s: '我们数的：右夹爪在第 107–245 步之间合上；脚本示范则完全确定。' }
      ]
    },
    {
      title: 'CVAE：给动作一个风格变量 z',
      dur: 26.2,
      build: buildSceneCvae,
      cues: [
        { at: 0.4, s: '编码器给出风格变量 $z$：它看示范的动作块和关节角；解码器就是策略。' },
        { at: 3.6, s: '损失 = 重建（L1）+ $\\beta$ × KL，$\\beta = 10$。' },
        { at: 7.0, s: 'L1：每步的差距取绝对值再平均；例子里 0.1、0.1、0.1、0.5 → 0.2。' },
        { at: 10.4, s: 'L2：先平方再平均（0.07），大误差的占比从六成多升到近九成。' },
        { at: 13.8, s: 'KL：两个分布相距多远；重合是 0，均值挪到 1 是 0.5。' },
        { at: 17.2, s: '$\\beta$ 越大，$z$ 里能装的信息越少。' },
        { at: 20.6, s: '测试时扔掉编码器，$z = 0$：同一个观测总是同一段动作。' },
        { at: 23.6, s: '我们的复现：编码器给出的分布几乎就是标准正态，换 $z$ 动作几乎不变。' }
      ]
    },
    {
      title: '编码器：[CLS]、关节与 k 个动作',
      dur: 16,
      build: buildSceneEncoder,
      cues: [
        { at: 0.4, s: '输入 1 + 1 + $k$ = 102 个 token：[CLS]、关节角、100 步动作。' },
        { at: 3.6, s: '只取 [CLS] 位置的输出：线性层给出 32 个均值和 32 个对数方差。' },
        { at: 7.0, s: '$z = \\mu + \\sigma \\odot \\varepsilon$：随机性放进 $\\varepsilon$，梯度能穿过采样。' },
        { at: 10.4, s: '编码器不看图，为了训练快；测试时整个扔掉。' },
        { at: 13.4, s: 'KL 按 32 维求和，乘 10 加到 L1 上。' }
      ]
    },
    {
      title: '策略的输入：1202 个 token',
      dur: 16,
      build: buildSceneTokens,
      cues: [
        { at: 0.4, s: 'ResNet18 把 480 × 640 的图变成 15 × 20 × 512 的特征图。' },
        { at: 3.6, s: '拉平成 300 个 token，加二维正弦位置编码。' },
        { at: 7.0, s: '4 × 300 + 关节 + $z$ = 1202 个 token；仿真只有一台相机，是 302 个。' },
        { at: 10.4, s: '4 层 Transformer 编码器把不同视角、关节角和 $z$ 混在一起。' },
        { at: 13.4, s: '复现：解码器的注意力大多落在图像上，最亮的格子在方块和夹爪附近。' }
      ]
    },
    {
      title: '解码器：一次写出 k 步',
      dur: 16,
      build: buildSceneDecoder,
      cues: [
        { at: 0.4, s: '100 个查询各自去查编码器的输出，得到 100 × 512，再变成 100 × 14。' },
        { at: 3.6, s: '查询：论文写固定的正弦编码，代码是学出来的 Embedding。' },
        { at: 7.0, s: '写了 7 层解码器，代码只取第 1 层的输出：真正起作用的参数约 52M。' },
        { at: 10.4, s: '超参数见附录表 III；官方命令训 2000 轮，约 1 万步更新。' },
        { at: 13.4, s: '一张 2080 Ti 训约 5 小时，推理 0.01 秒；我们在 CPU 上 0.13 秒。' }
      ]
    },
    {
      title: '8 个任务（图 4、图 5）',
      dur: 16,
      build: buildSceneTasks,
      cues: [
        { at: 0.4, s: '6 个真机任务，都要两只手配合；物体沿 15 cm 的白线随机摆放。' },
        { at: 3.6, s: '每个任务拆成几步打分（论文图 4）。' },
        { at: 7.0, s: '难在看清楚：透明的、黑在黑上的、会反光的。' },
        { at: 10.4, s: '2 个仿真任务：交接方块（间隙约 1 cm）、双臂插销（约 5 mm）。' },
        { at: 13.4, s: '真机每个 50 条示范（扎带 100 条）；仿真脚本、人的示范各 50 条。' }
      ]
    },
    {
      title: '表一：和四个基线比',
      dur: 16,
      build: buildSceneTable1,
      cues: [
        { at: 0.4, s: '四个基线：BC-ConvMLP、BeT、RT-1、VINN，都只预测一步。' },
        { at: 3.6, s: '仿真 3 个种子 × 50 次，脚本、人的示范各一遍；真机 1 个种子 × 25 次。' },
        { at: 7.0, s: '基线前两步还行，到最后一步就掉下来。' },
        { at: 10.4, s: '和最好的基线比，最后一步高出 59、49、29、20 个百分点。' },
        { at: 13.4, s: '真机：ACT 88% 和 96%，基线都过不了第一步。' }
      ]
    },
    {
      title: '表二与真机的细节',
      dur: 16,
      build: buildSceneTable2,
      cues: [
        { at: 0.4, s: '打开杯盖 84%、扎带 20%、备胶带 64%、穿鞋 92%；BeT 最后一步都是 0。' },
        { at: 3.6, s: '扎带每一步大约掉一半：92% → 40% → 20%。' },
        { at: 7.0, s: '失败：夹爪合得太早、插得不够准；黑扎带在黑桌面上很难看清。' },
        { at: 10.4, s: '项目页：杯子被挪开，策略会重新去够；复现里挪 4 cm，9 次成功 3 次。' },
        { at: 13.4, s: '对一定程度的干扰物也稳；视频是挑出来的例子，不是统计。' }
      ]
    },
    {
      title: '消融：分块与时间集成（图 6a、b）',
      dur: 16,
      build: buildSceneAblateK,
      cues: [
        { at: 0.4, s: '图 6 (a)：横轴是块大小 $k$，纵轴是 4 种设定的平均成功率；不开时间集成。' },
        { at: 3.6, s: 'ACT 从 $k = 1$ 的 1% 涨到 $k = 100$ 的 44%，再往上略降。' },
        { at: 7.0, s: '给 BC-ConvMLP 和 VINN 加上分块，也一样涨。' },
        { at: 10.4, s: '图 6 (b)：时间集成让 ACT +3.3、BC-ConvMLP +4，VINN −20。' },
        { at: 13.4, s: '我们的复现：同样 50 个方块位置，开环分块和时间集成各跑一遍。' }
      ]
    },
    {
      title: '消融：CVAE 与 50 Hz（图 6c、d）',
      dur: 16,
      build: buildSceneAblateCvae,
      cues: [
        { at: 0.4, s: '图 6 (c)：脚本示范上有没有 CVAE 几乎没差：59% 对 58%。' },
        { at: 3.6, s: '人的示范上，去掉 CVAE 从 35.3% 掉到 2%。' },
        { at: 7.0, s: '用户研究：6 个人，扎扎带和分杯子，5 Hz 和 50 Hz 各做 3 次。' },
        { at: 10.4, s: '5 Hz 慢了 62%：扎扎带 33 秒对 20 秒，分杯子 16 秒对 10 秒；p < 0.001。' },
        { at: 13.4, s: '5 Hz 和用大网络的模仿学习差不多；ACT 一次出一段，能给 50 Hz。' }
      ]
    },
    {
      title: '局限、代码与之后',
      dur: 16,
      build: buildSceneLimits,
      cues: [
        { at: 0.4, s: '硬件做不了三类活：要两只手好几根手指一起用的、要很大力气的、要用指甲的。' },
        { at: 3.6, s: 'ACT 没学会：剥糖纸最后一步 0 / 10、平放的小密封袋。' },
        { at: 7.0, s: '对不上的地方：块大小 100 和 90、7 层只用 1 层、查询的写法、图 7 的 728。' },
        { at: 10.4, s: '开源了 ALOHA 硬件教程、ACT 代码、两个仿真环境和仿真示范；后来的 π₀ 改用开环执行动作块。' },
        { at: 13.4, s: '我们的复现：照官方代码自己写前向和仿真，用官方仓库训出的权重。' }
      ]
    }
  ];
  /* 要点里数字和单位之间用不换行空格（公式里不动），免得单位单独落到下一行开头（HOMIE 2026-10-21） */
  function nb(str) {
    return str.split(/(\$[^$]*\$)/).map(function (p, i) { return i % 2 ? p : p.replace(/(\d)(\*\*)? (?=[^\s\d+\-−→×<>=\/·（(])/g, '$1$2\u00a0').replace(/(\d)–(\d)/g, '$1–⁠$2'); }).join('');
  }
  ACT_SCENES.forEach(function (sc) { sc.cues.forEach(function (c) { c.s = nb(c.s); }); });
  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十七幕动画：ACT 全流程速览',
      sub: '约 282 秒自动播放。空格播放/暂停，← → 换幕；真机画面剪自项目页的视频，柱和曲线照论文的数重画，仿真画面和曲线是我们的复现；机械臂都是模型的离线渲染。',
      ariaLabel: 'ACT 十七幕讲解动画',
      notes: [
        '取数依据：表 I、表 II、附录的超参数与用户研究照抄 arXiv 2304.13705 v1（读的是 LaTeX 源码）；图 6 (a)–(c) 的数取自源文件 figures/fm_data.pdf 里被裁掉的原始数据表；图 6 (d) 用正文给的平均用时。',
        '复现（不是论文的实验）：权重是 HF lerobot/act_aloha_sim_transfer_cube_human 的 original_act_repo 分支（用官方仓库在人的仿真示范上训 2000 轮）；前向和方块交接的 MuJoCo 环境是我们照官方代码（tonyzhaozh/act @ 742c753）自己写的，资产用官方 XML；人的示范是官方放出的仿真数据（LeRobot 转存的版本）。',
        '机械臂的模型：主臂 WidowX 250、从臂 ViperX 300 用 MuJoCo Menagerie 的 trossen_wx250s / trossen_vx300s（BSD-3），夹爪、交接和挪方块用官方 ACT 的 MJCF；第 2、3、7 幕的关节角和夹爪开度取自官方仿真人类示范，第 14 幕是我们挪方块的那次复现。',
        '真机片段剪自项目页 tonyzhaozh.github.io/aloha 的视频（画面里标着实时或倍速），只做讲解引用。'
      ],
      scenes: ACT_SCENES
    });
  }
  // ─── the narrated vertical video of the same seventeen scenes ─────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：ACT 十七幕全流程',
      sub: '26 分 12 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十七幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '30.8 MB',
      fileName: 'ACT_讲解视频.mp4'
    });
  }

  // ─── 演示 1：动作块与时间集成实验台 ─────────────────────────────────────────
  function buildEnsembleDemo(host) {
    var root = card(host, {
      title: '动作块与时间集成实验台：同一步的 100 个预测怎么合成一个动作',
      sub: '数据是我们复现的一个仿真回合（不是论文的实验）：策略每一步都查询一次，每次吐出接下来 100 步的目标。拖动第 $t$ 步和权重系数 $m$，看第 $t$ 步收到的预测和加权平均。'
    });
    var state = { t: 152, m: 0.01, key: 'rgrip' };
    var row = controlsRow(root);
    slider(row, { label: '第 $t$ 步', min: 0, max: 399, step: 1, value: 152, format: function (v) { return v + '（' + f2(v / 50) + ' 秒）'; }, onInput: function (v) { state.t = v; render(); } });
    slider(row, { label: '权重系数 $m$（官方代码 0.01）', min: 0, max: 0.2, step: 0.005, value: 0.01, format: function (v) { return f3(v); }, onInput: function (v) { state.m = v; render(); } });
    buttonGroup(root, { label: '看哪个关节', value: 'rgrip', items: [{ label: '右夹爪', value: 'rgrip' }, { label: '右肩', value: 'rsh' }], onPick: function (v) { state.key = v; render(); } });
    var st1 = stage(root, 250), st2 = stage(root, 220);
    var stats = statsRow(root), sN = stats.add('第 t 步收到的预测'), sSpread = stats.add('最大 − 最小'), sEns = stats.add('加权平均'), sOld = stats.add('最老那个的权重');
    var verdict = verdictBox(root);
    note(root, [
      '上图：横轴是哪一次查询（左边老、右边新），纵轴是它对第 $t$ 步的预测；点越大权重越高，绿线是加权平均 $\\sum_i w_i A_t[i] / \\sum_i w_i$，$w_i = e^{-m\\,i}$，$i = 0$ 是最老的。',
      '下图：整个回合里这个关节真正发出去的目标。绿线是时间集成（$m = 0.01$，回合里真的这样跑的）；蓝线是同一个方块位置下开环分块（每 100 步查询一次）那一回合；紫色虚线是把 $m$ 换成你选的值、用同一批预测重新算的结果——这只是离线重算，真改了 $m$，机器人走的路会变，后面的预测也会跟着变。',
      '数据：每次预测的值按关节量化成 256 档（夹爪约 0.005、肩约 0.004 rad 一档），所以重算的绿线和真实执行的值有一点出入。'
    ]);
    function render() {
      if (!REPRO) return;
      var g = begin(st1), P = g.P, key = state.key, t = state.t;
      var list = predsFor(key, t), sc = REPRO.te[key + '_scale'];
      var p = K.plot(g, { l: 46, r: 16, t: 20, b: 34 }, [0, 99], [sc[0], sc[1]]);
      K.axes(g, p, { yTicks: K.niceTicks(sc[0], sc[1], 4), yFmt: function (v) { return f2(v); }, xTicks: [0, 25, 50, 75, 99], xFmt: function (v) { return v === 0 ? '最老' : v === 99 ? '最新' : String(v); }, xLabel: '第几次（相对）', yLabel: key === 'rgrip' ? '开度' : 'rad' });
      var ws = list.map(function (q, i) { return Math.exp(-state.m * i); }), w0 = ws.reduce(function (a, b) { return a + b; }, 0);
      var off = 100 - list.length;
      list.forEach(function (q, i) { K.dot(g.ctx, p.sx(off + i), p.sy(q[1]), 1.5 + 4 * ws[i] / ws[0], P.muted); });
      var e = ensemble(list, state.m);
      K.line(g.ctx, [[p.x0, p.sy(e)], [p.x1, p.sy(e)]], P.good, 2.4);
      text(g.ctx, '绿线：加权平均 ' + f3(e), p.x1, p.sy(sc[1]) - 6, P.good, 'right', '12px sans-serif');  // 写在图框上方，不压点
      var vals = list.map(function (q) { return q[1]; });
      sN.set(list.length + ' 个');
      sSpread.set(f3(Math.max.apply(null, vals) - Math.min.apply(null, vals)));
      sEns.set(f3(e));
      sOld.set(f1(100 * ws[0] / w0) + '%（最新 ' + f1(100 * ws[ws.length - 1] / w0) + '%）');
      /* 下图：整段 */
      var g2 = begin(st2), P2 = g2.P, A = REPRO.te[key + '_exec'], B = REPRO.chunk[key + '_exec'];
      var lo = Math.min(Math.min.apply(null, A), Math.min.apply(null, B)), hi = Math.max(Math.max.apply(null, A), Math.max.apply(null, B));
      var p2 = K.plot(g2, { l: 46, r: 16, t: 16, b: 34 }, [0, 399], [lo - 0.05, hi + 0.05]);
      K.axes(g2, p2, { yTicks: K.niceTicks(lo, hi, 4), yFmt: function (v) { return f2(v); }, xTicks: [0, 100, 200, 300, 399], xLabel: '第几步' });
      K.line(g2.ctx, B.map(function (v, i) { return [p2.sx(i), p2.sy(v)]; }), P2.accent, 1.8);
      K.line(g2.ctx, A.map(function (v, i) { return [p2.sx(i), p2.sy(v)]; }), P2.good, 2.2);
      var re = [];
      for (var k = 0; k < 400; k++) re.push([p2.sx(k), p2.sy(ensemble(predsFor(key, k), state.m))]);
      K.line(g2.ctx, re, P2.purple, 1.6, [5, 4]);
      K.line(g2.ctx, [[p2.sx(t), p2.y0], [p2.sx(t), p2.y1]], P2.text, 1, [3, 3]);
      var big = Math.max.apply(null, vals) - Math.min.apply(null, vals) > 0.3;
      verdict.set(big ? '这一步的预测分歧很大：老的预测还按原来的计划，新的预测已经看到了新情况。加权平均让动作在两者之间慢慢过渡；$m$ 越大，越偏向老的预测。' :
        '这一步的预测基本一致：几个块说的是同一件事，加权平均和最新的预测差不多。', big ? 'warn' : 'good');
    }
    registerRenderer(render);
    render();
  }

  // ─── 演示 2：形状计算器 + 注意力 ───────────────────────────────────────────
  function buildTokensDemo(host) {
    var root = card(host, {
      title: '形状计算器：相机、分辨率和 k 改了，token 有多少',
      sub: 'ResNet18 把图缩小 32 倍：480 × 640 变成 15 × 20 = 300 个 token。下面的图是我们复现里顶部相机的画面，叠上解码器的交叉注意力（8 个头、100 个查询取平均）。'
    });
    var state = { cams: 4, res: 0, k: 100, f: 2 };
    var RES = [[480, 640], [240, 320], [720, 960]];
    var row = controlsRow(root);
    slider(row, { label: '相机数', min: 1, max: 4, step: 1, value: 4, format: function (v) { return v + ' 台'; }, onInput: function (v) { state.cams = v; render(); } });
    slider(row, { label: '块大小 $k$', min: 1, max: 400, step: 1, value: 100, format: function (v) { return String(v); }, onInput: function (v) { state.k = v; render(); } });
    buttonGroup(root, { label: '图像分辨率', value: 0, items: [{ label: '480 × 640（论文）', value: 0 }, { label: '240 × 320', value: 1 }, { label: '720 × 960', value: 2 }], onPick: function (v) { state.res = v; render(); } });
    var stats = statsRow(root), sMap = stats.add('每台相机的特征图'), sTok = stats.add('策略编码器的输入'), sEnc = stats.add('CVAE 编码器的输入'), sOut = stats.add('输出'), sCost = stats.add('自注意力的两两配对');
    var fr = buttonGroup(root, { label: '复现里的哪一步', value: 2, items: [0, 1, 2, 3, 4, 5].map(function (i) { return { label: REPRO && REPRO.attn ? '第 ' + REPRO.attn.ts[i] + ' 步' : String(i), value: i }; }), onPick: function (v) { state.f = v; render(); } });
    void fr;
    var st = stage(root, 330);
    note(root, [
      '一台相机的 token 数 = $\\lceil H/32 \\rceil \\times \\lceil W/32 \\rceil$；策略的 Transformer 编码器看的是「相机数 × 每台的 token + 关节 1 个 + $z$ 1 个」；CVAE 编码器看「[CLS] + 关节 + $k$ 个动作」= $k + 2$ 个。',
      '注意力（我们的复现）：仿真任务按官方配置只有顶部一台相机（302 个 token）。格子越黄，解码器分给它的注意力越多（每张图按最大值归一）。注意力只是一种读法，不等于「因为看了这里才这样做」。'
    ]);
    var img = new window.Image(), loaded = false;
    img.onload = function () { loaded = true; render(); };
    if (SIM_BASE) img.src = SIM_BASE + 'top6.webp';
    function render() {
      var H = RES[state.res][0], W = RES[state.res][1], h = Math.ceil(H / 32), w = Math.ceil(W / 32), per = h * w, L = state.cams * per + 2;
      sMap.set(h + ' × ' + w + ' × 512 = ' + per + ' 个');
      sTok.set(L + ' 个');
      sEnc.set((state.k + 2) + ' 个');
      sOut.set(state.k + ' × 14');
      sCost.set((L * L).toLocaleString('en-US') + ' 对');
      var g = begin(st), P = g.P, A = REPRO && REPRO.attn;
      var cw = Math.min(g.w - 20, 400), ch = cw * 0.75, x0 = (g.w - cw) / 2, y0 = 6;
      if (loaded) g.ctx.drawImage(img, state.f * 320, 0, 320, 240, x0, y0, cw, ch);
      if (A) {
        var map = A.maps[state.f];
        for (var r = 0; r < 15; r++) for (var c = 0; c < 20; c++) {
          g.ctx.globalAlpha = 0.7 * map[r * 20 + c];
          g.ctx.fillStyle = P.warn;
          g.ctx.fillRect(x0 + c * cw / 20, y0 + r * ch / 15, cw / 20, ch / 15);
        }
        g.ctx.globalAlpha = 1;
        text(g.ctx, '图像 ' + f1fix(100 * A.img[state.f]) + '%　关节 ' + f1fix(100 * A.q[state.f]) + '%　z ' + f1fix(100 * A.z[state.f]) + '%', g.w / 2, y0 + ch + 14, P.text, 'center', '12px sans-serif');
      }
    }
    registerRenderer(render);
    render();
  }

  // ─── 演示 3：论文的数字 ───────────────────────────────────────────────────
  function buildResultsDemo(host) {
    var root = card(host, {
      title: '论文的数字：表一、表二、图 6 (a)–(d)，和我们的复现',
      sub: '表一、表二照抄 arXiv 2304.13705 v1；图 6 (a)–(c) 的数取自源文件里图 6 被裁掉的原始数据表；图 6 (d) 用正文给的平均用时。'
    });
    var state = { v: 't1' };
    buttonGroup(root, { value: 't1', items: [{ label: '表一', value: 't1' }, { label: '表二', value: 't2' }, { label: '图 6 (a)', value: 'a' }, { label: '图 6 (b)', value: 'b' }, { label: '图 6 (c)', value: 'c' }, { label: '图 6 (d)', value: 'd' }, { label: '我们的复现', value: 'r' }], onPick: function (v) { state.v = v; render(); } });
    var st = stage(root, 240);
    var tb = table(root);
    var verdict = verdictBox(root);
    function render() {
      var g = begin(st), P = g.P, v = state.v;
      tb.clear();
      if (v === 't1') {
        tb.row(['任务 / 分步'].concat(METHODS.map(function (m) { return m.zh; })), true);
        TABLE1.forEach(function (T) {
          T.subs.forEach(function (sub, j) {
            tb.row([T.task + ' · ' + sub].concat(METHODS.map(function (m) { var x = T.v[m.key][j]; return T.sim ? x[0] + ' | ' + x[1] : String(x); })));
          });
        });
        var p = K.plot(g, { l: 40, r: 10, t: 16, b: 30 }, [0, 4], [0, 100]);
        K.axes(g, p, { yTicks: [0, 25, 50, 75, 100] });
        TABLE1.forEach(function (T, k) {
          METHODS.forEach(function (m, j) {
            var x = T.v[m.key][2], val = T.sim ? x[1] : x, bx = p.sx(k + 0.12 + j * 0.15);
            g.ctx.fillStyle = P[{ act: 'good', bc: 'muted', bet: 'accent', rt1: 'purple', vinn: 'warn' }[m.key]];
            g.ctx.fillRect(bx, p.sy(val), p.sx(0.13) - p.sx(0), p.sy(0) - p.sy(val));
          });
          text(g.ctx, T.task.replace(/（.*）/, ''), p.sx(k + 0.5), p.y0 + 14, P.muted, 'center', '11px sans-serif');
        });
        verdict.set('仿真写成「脚本示范 | 人的示范」，3 个种子 × 50 次；真机只有人的示范，1 个种子 × 25 次。柱子是最后一步（仿真取人的示范）：绿 ACT、灰 BC-ConvMLP、蓝 BeT、紫 RT-1、黄 VINN。');
      } else if (v === 't2') {
        tb.row(['任务 / 分步', 'BeT', 'ACT'], true);
        TABLE2.forEach(function (T) { T.subs.forEach(function (sub, j) { tb.row([T.task + ' · ' + sub, String(T.bet[j]), String(T.act[j])]); }); });
        var p2 = K.plot(g, { l: 40, r: 10, t: 16, b: 30 }, [0, 4], [0, 100]);
        K.axes(g, p2, { yTicks: [0, 25, 50, 75, 100] });
        TABLE2.forEach(function (T, k) {
          var a = T.act[T.act.length - 1], b = T.bet[T.bet.length - 1];
          g.ctx.fillStyle = P.accent; g.ctx.fillRect(p2.sx(k + 0.2), p2.sy(b), p2.sx(0.28) - p2.sx(0), p2.sy(0) - p2.sy(b));
          g.ctx.fillStyle = P.good; g.ctx.fillRect(p2.sx(k + 0.52), p2.sy(a), p2.sx(0.28) - p2.sx(0), p2.sy(0) - p2.sy(a));
          text(g.ctx, T.task, p2.sx(k + 0.5), p2.y0 + 14, P.muted, 'center', '11px sans-serif');
        });
        verdict.set('最后一步：BeT（蓝）全是 0，ACT（绿）84%、20%、64%、92%。论文正文说「剩下 3 个任务」，表里是 4 个。');
      } else if (v === 'a') {
        tb.row(['k'].concat(FIG6A.k.map(String)), true);
        [['ACT', FIG6A.act], ['BC-ConvMLP', FIG6A.bc], ['VINN', FIG6A.vinn]].forEach(function (r) { tb.row([r[0]].concat(r[1].map(String))); });
        var p3 = K.plot(g, { l: 40, r: 16, t: 16, b: 30 }, [0, 4], [0, 50]);
        K.axes(g, p3, { yTicks: [0, 12.5, 25, 37.5, 50], xTicks: [0, 1, 2, 3, 4], xFmt: function (i) { return String(FIG6A.k[i]); }, xLabel: 'k' });
        [['act', P.accent], ['bc', P.good], ['vinn', P.muted]].forEach(function (c) { K.line(g.ctx, FIG6A[c[0]].map(function (y, i) { return [p3.sx(i), p3.sy(y)]; }), c[1], 2.4); });
        verdict.set('蓝 ACT、绿 BC-ConvMLP、灰 VINN（论文图 6 的配色）。横轴的 5 个 k 等距排开；不开时间集成；4 种设定的平均成功率（%）。');
      } else if (v === 'b' || v === 'c') {
        var D = v === 'b' ? [['ACT', FIG6B.act], ['BC-ConvMLP', FIG6B.bc], ['VINN', FIG6B.vinn]] : [['脚本示范', FIG6C.scripted], ['人的示范', FIG6C.human]];
        tb.row(v === 'b' ? ['方法', '不开时间集成', '开'] : ['数据', '有 CVAE', '没有 CVAE'], true);
        D.forEach(function (r) { tb.row([r[0], String(r[1][0]), String(r[1][1])]); });
        var p4 = K.plot(g, { l: 40, r: 10, t: 16, b: 30 }, [0, D.length], [0, 60]);
        K.axes(g, p4, { yTicks: [0, 15, 30, 45, 60] });
        D.forEach(function (r, k) {
          g.ctx.fillStyle = P.accent; g.ctx.fillRect(p4.sx(k + 0.15), p4.sy(r[1][0]), p4.sx(0.33) - p4.sx(0), p4.sy(0) - p4.sy(r[1][0]));
          g.ctx.fillStyle = P.good; g.ctx.fillRect(p4.sx(k + 0.52), p4.sy(r[1][1]), p4.sx(0.33) - p4.sx(0), p4.sy(0) - p4.sy(r[1][1]));
          text(g.ctx, r[0], p4.sx(k + 0.5), p4.y0 + 14, P.muted, 'center', '11px sans-serif');
        });
        verdict.set(v === 'b' ? '蓝 = 不开、绿 = 开时间集成；各自调到最好。ACT +3.3、BC-ConvMLP +4、VINN −20：论文猜 VINN 取的是真实的示范动作，没有建模误差可抹。' :
          '蓝 = 有 CVAE、绿 = 没有。脚本数据完全确定，有没有都一样；人的示范上去掉 CVAE 只剩 2%。');
      } else if (v === 'd') {
        tb.row(['任务', '5 Hz', '50 Hz'], true);
        tb.row(['扎扎带（秒）', String(FIG6D.zip[0]), String(FIG6D.zip[1])]);
        tb.row(['分开两个杯子（秒）', String(FIG6D.cups[0]), String(FIG6D.cups[1])]);
        var p5 = K.plot(g, { l: 40, r: 10, t: 16, b: 30 }, [0, 2], [0, 40]);
        K.axes(g, p5, { yTicks: [0, 10, 20, 30, 40] });
        [FIG6D.zip, FIG6D.cups].forEach(function (r, k) {
          g.ctx.fillStyle = P.bad; g.ctx.fillRect(p5.sx(k + 0.15), p5.sy(r[0]), p5.sx(0.33) - p5.sx(0), p5.sy(0) - p5.sy(r[0]));
          g.ctx.fillStyle = P.good; g.ctx.fillRect(p5.sx(k + 0.52), p5.sy(r[1]), p5.sx(0.33) - p5.sx(0), p5.sy(0) - p5.sy(r[1]));
          text(g.ctx, ['扎扎带', '分杯子'][k], p5.sx(k + 0.5), p5.y0 + 14, P.muted, 'center', '11px sans-serif');
        });
        verdict.set('红 = 5 Hz、绿 = 50 Hz 的平均用时，越短越好。6 位参与者各做 3 次；5 Hz 平均慢 62%，重复测量设计检验 p < 0.001。图 6 (d) 原图是箱线图，这里只画正文给的平均值。');
      } else {
        tb.row(['设定', '成功（50 次）', '说明'], true);
        if (REPRO && REPRO.succ) {
          tb.row(['开环分块（每 100 步查询）', REPRO.succ.chunk + ' / 50', '官方 eval_bc() 不加 --temporal_agg']);
          tb.row(['时间集成（每步查询，m = 0.01）', REPRO.succ.te + ' / 50', '加 --temporal_agg']);
          tb.row(['HF 自带的评测', '68.2%（500 次）', 'gym-aloha、不开时间集成']);
          tb.row(['论文表一（ACT，人的示范）', '50%', '3 个种子 × 50 次']);
        }
        var p6 = K.plot(g, { l: 40, r: 10, t: 16, b: 30 }, [0, 2], [0, 100]);
        K.axes(g, p6, { yTicks: [0, 25, 50, 75, 100] });
        if (REPRO && REPRO.succ) {
          [[REPRO.succ.chunk, P.accent, '开环分块'], [REPRO.succ.te, P.good, '时间集成']].forEach(function (r, k) {
            var y = 100 * r[0] / 50;
            g.ctx.fillStyle = r[1]; g.ctx.fillRect(p6.sx(k + 0.25), p6.sy(y), p6.sx(0.5) - p6.sx(0), p6.sy(0) - p6.sy(y));
            text(g.ctx, r[2] + ' ' + Math.round(y) + '%', p6.sx(k + 0.5), p6.y0 + 14, P.muted, 'center', '11px sans-serif');
          });
        }
        verdict.set('我们的复现只有一个检查点、一个任务、50 个方块位置，不是论文的实验；成功 = 官方奖励到 4（左夹爪拿着方块、方块离开桌面）。');
      }
    }
    registerRenderer(render);
    render();
  }

  K.mount({
    'act-explainer': buildExplainerDemo,
    'act-video': buildVideoDemo,
    'act-ensemble': buildEnsembleDemo,
    'act-tokens': buildTokensDemo,
    'act-results': buildResultsDemo
  });
})();
