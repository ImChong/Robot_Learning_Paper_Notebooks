/* Interactive demos for papers/09_State_Estimation/Contact-Aided_Invariant_EKF_for_Legged_Robots
 * （Hartley, Ghaffari, Eustice, Grizzle · Contact-Aided Invariant Extended Kalman Filtering for Robot State
 *   Estimation · arXiv 1904.09251 v2，IJRR 39(4) 2020；会议版 RSS 2018，arXiv 1805.10410）
 *
 * Loaded by _layouts/paper.html when the note's front matter declares
 * `demos: ["inekf"]`, after assets/js/demos/kit.js. The note itself may only
 * contain empty placeholders, because scripts/sanitize_paper_html.py strips
 * <script>/<canvas>/<input> from #paper-body before publish.
 *
 * Demos:
 *   inekf-explainer — 十二幕讲解动画：机器人怎样知道自己的姿态和速度 → IMU 推、脚踩住、运动学校正 →
 *                     线性化点选错会怎样 → 一个矩阵装下全部状态 → 误差不看轨迹（定理 1、2，图 4）→
 *                     正运动学校正：H 是常数 → 看不见的方向 → 不确定性长成香蕉（图 6、7）→
 *                     IMU 零偏：不完美的 InEKF → 增删接触点 → 收敛（图 3、8）→ Cassie 实测（图 9–12）
 *   inekf-video     — 同一套十二幕的配音竖屏视频（scripts/paper_video/ 离线渲染）
 *   inekf-linearize — 第 6.3 节 / 图 4–5 的实验在浏览器里重跑：初始朝向误差放大，线性化误差方程差多少
 *   inekf-converge  — 二维（矢状面）玩具：同一段行走，InEKF 和普通 EKF 从随机初值收敛（对应图 3、图 8 的做法）
 *   inekf-banana    — 图 6、7：航向不确定时位置分布的形状（真值 / InEKF / QEKF）
 */

(function () {
  'use strict';

  var K = window.PaperDemoKit;
  /* 第 1、2、12 幕的 Cassie 图放在 assets/img/robots/，按本脚本自己的地址找（网页与离线视频都适用） */
  var ROBOT_IMG_BASE = (function () {
    var cs = document.currentScript;
    try {
      return cs && cs.src ? new URL('../../img/robots/', cs.src).href : '';
    } catch (e) {
      return '';
    }
  })();
  var el = K.el,
    fmt = K.fmt,
    clamp = K.clamp,
    card = K.card,
    controlsRow = K.controlsRow,
    slider = K.slider,
    button = K.button,
    buttonGroup = K.buttonGroup,
    statsRow = K.statsRow,
    verdictBox = K.verdictBox,
    legend = K.legend,
    note = K.note,
    stage = K.stage,
    stageGrid = K.stageGrid,
    begin = K.begin,
    plot = K.plot,
    line = K.line,
    dot = K.dot,
    text = K.text,
    axes = K.axes,
    registerRenderer = K.registerRenderer,
    mulberry32 = K.mulberry32,
    gauss = K.gauss;

  // ─── 论文里的数字（IJRR 扩展版 arXiv 1904.09251 v2；会议版 1805.10410 的数与它相同的不再单列） ───
  /* 第 5–9 节与表 1 照抄；图 3、4、6、8、9 没有标数，读图的值单独标「读图」。官方 C++ 库（RossHartley/invariant-ekf）的数单独标出。
     十二幕动画、三个演示、配音旁白与笔记「🚶 具体实例」共用这一份。 */
  var G = 9.81; // 代码 InEKF.cpp：g_ = (0, 0, −9.81)
  var CASSIE = { dof: 20, actuators: 10, springs: 4, encoders: 14, imuHz: 800, encHz: 2000, height: 1.2732 }; // 第 9 节；身高取自 Robot_Description_Gallery 的 URDF 测量（UMich BipedLab 展示模型）
  /* Cassie 一条腿在侧视平面里的连杆（m），取自 mujoco_menagerie 的 agility_cassie/cassie.xml（Robot_Description_Gallery 记录的 MJCF），
     按 home 关键帧做正运动学：髋俯仰 → 膝 0.12、膝 → 跗骨关节 0.50、跗骨关节 → 脚关节 0.41；站立时髋俯仰离地 0.916、脚关节离地 0.057，
     脚板（碰撞胶囊）从脚关节后 0.06 到前 0.10。achilles 杆把大腿和跗骨连成近似平行四边形：膝弯 ±0.25 rad 时跗骨方向始终比大腿偏约 7°，
     所以画图时跗骨跟着大腿转，一条腿只剩一个自由度。比例 大腿 : 小腿 : 跗骨 ≈ 1 : 4.2 : 3.4 */
  var CASSIE_LEG = { thigh: 0.12, shin: 0.5, tarsus: 0.41, hipH: 0.916, footJointH: 0.057, heel: 0.06, toe: 0.1, tarsusFromThighDeg: 7.1, thighDeg: 61.5 };
  var TABLE1 = {
    // 表 1：离散噪声标准差与初始标准差（扩展版的零偏单位是 m/s³、rad/s²；会议版写成 m/s²、rad/s）
    noise: [['线加速度', '0.04 m/s²'], ['角速度', '0.002 rad/s'], ['加速度计零偏', '0.001 m/s³'], ['陀螺零偏', '0.001 rad/s²'], ['接触点线速度', '0.05 m/s'], ['关节编码器', '1.0°']],
    init: [['IMU 朝向', '30.0°'], ['IMU 速度', '1.0 m/s'], ['IMU 位置', '0.1 m'], ['右脚位置', '0.1 m'], ['左脚位置', '0.1 m'], ['陀螺零偏', '0.005 rad/s'], ['加速度计零偏', '0.05 m/s²']]
  };
  var CONV = { runs: 100, eulerDeg: 30, velMax: 1.0, simSpeed: 0.3, realSpeed: 0.3, simWin: 1, realWin: 2 }; // 第 6.2、9.1 节
  var CONV_READ = { riSim: 0.3, qSimSpread: 10, riReal: 0.4, qRealSpread: 5 }; // 图 3、图 8 读图：InEKF 收拢时刻（s）与 QEKF 窗口末尾的散布（°）
  var FIG4_READ = { qekf: 25, inekf: 0 }; // 图 4 读图：初始误差放大到 (π/2, π/2, π/2) 时 QEKF 约 25，InEKF 为 0
  var BANANA = { speed: 1, secs: [0, 2, 4, 6, 8], posSigma: 0.1, yawDeg: 10, particles: 10000, fullYawDeg: 360 }; // 第 6.4 节、图 6、7
  var MOCAP = { cams: 18, secs: 60, pathM: 15, driftPct: 5 }; // 第 9.2 节、图 9
  var LONGWALK = { meters: 200, secs: 7 * 60 + 45 }; // 第 9.3 节、图 11
  var LIDAR = { hz: 10, cloudSecs: 10 }; // 第 9.4 节、图 12
  var FILTER_HZ = 2000; // 第 2.2 节：「> 2000 Hz」
  /* 官方 C++ 库的默认噪声（NoiseParams.cpp）与例子 kinematics.cpp 的接触噪声 */
  var CODE = { gyro: 0.01, accel: 0.1, gyroBias: 0.00001, accelBias: 0.0001, contact: 0.1, contactExample: 0.01 };

  /* 状态维度：N 个触地点时 X 是 (N+5)×(N+5)，误差 ξ 是 3N+9 维，加零偏再加 6 维 */
  function dimX(n) { return n + 5; }
  function dimXi(n) { return 3 * n + 9; }

  // ─── 三维小工具：3 向量、3×3 矩阵、SO(3) 的指数 / 对数与左雅可比 ───────────────
  /* ── core:begin ── 网页演示、讲解动画与笔记算例共用的计算（tests/test_paper_demos.py 用 Python 重算其中的数） */
  function v3(x, y, z) { return [x, y, z]; }
  function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function scl3(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm3(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
  function mv3(M, a) {
    return [M[0][0] * a[0] + M[0][1] * a[1] + M[0][2] * a[2], M[1][0] * a[0] + M[1][1] * a[1] + M[1][2] * a[2], M[2][0] * a[0] + M[2][1] * a[1] + M[2][2] * a[2]];
  }
  function mm3(A, B) {
    var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
    return C;
  }
  function tr3(A) { return [[A[0][0], A[1][0], A[2][0]], [A[0][1], A[1][1], A[2][1]], [A[0][2], A[1][2], A[2][2]]]; }
  function eye3() { return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; }
  function skew3(w) { return [[0, -w[2], w[1]], [w[2], 0, -w[0]], [-w[1], w[0], 0]]; }
  /* Rodrigues：Exp(φ) = I + sinθ/θ φ× + (1 − cosθ)/θ² φ×² */
  function Exp3(phi) {
    var th = norm3(phi), P = skew3(phi), P2 = mm3(P, P), a, b;
    if (th < 1e-12) { a = 1; b = 0.5; } else { a = Math.sin(th) / th; b = (1 - Math.cos(th)) / (th * th); }
    var R = eye3();
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) R[i][j] += a * P[i][j] + b * P2[i][j];
    return R;
  }
  function Log3(R) {
    var c = clamp((R[0][0] + R[1][1] + R[2][2] - 1) / 2, -1, 1), th = Math.acos(c);
    if (th < 1e-12) return [0, 0, 0];
    var k = th / (2 * Math.sin(th));
    return [k * (R[2][1] - R[1][2]), k * (R[0][2] - R[2][0]), k * (R[1][0] - R[0][1])];
  }
  /* SO(3) 的左雅可比 Γ₁（附录 A 式 48–49）与它的逆：SE_K(3) 的指数映射里，速度 / 位置那几列要乘它 */
  function G1(phi) {
    var th = norm3(phi), P = skew3(phi), P2 = mm3(P, P), a, b;
    if (th < 1e-12) { a = 0.5; b = 1 / 6; } else { a = (1 - Math.cos(th)) / (th * th); b = (th - Math.sin(th)) / (th * th * th); }
    var M = eye3();
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) M[i][j] += a * P[i][j] + b * P2[i][j];
    return M;
  }
  function G1inv(phi) {
    var th = norm3(phi), P = skew3(phi), P2 = mm3(P, P), c;
    if (th < 1e-12) c = 1 / 12;
    else c = (1 / (th * th)) * (1 - (th * Math.sin(th)) / (2 * (1 - Math.cos(th))));
    var M = eye3();
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) M[i][j] += -0.5 * P[i][j] + c * P2[i][j];
    return M;
  }
  function Ry(t) { return [[Math.cos(t), 0, Math.sin(t)], [0, 1, 0], [-Math.sin(t), 0, Math.cos(t)]]; }
  var GVEC = v3(0, 0, -G);
  var A_STAND = v3(0, 0, G); // 站着不动时加速度计读到的比力

  /* ── 例子 1：站着不动、俯仰估错 θ rad，传 1 秒（第 3、5 幕，具体实例第 2–4 步） ──
     滤波器自己的预测：v̄ = (R̄ã + g)·T，p̄ = ½(R̄ã + g)T²（真值 v = p = 0）。
     InEKF：ξ_v = (g)×ξ_R·T、ξ_p = ½(g)×ξ_R·T²，再过指数映射 Γ₁(ξ_R)·ξ —— 和上面一位不差。
     QEKF：δv = v − v̄ 的线性预测 R̄(ã)×δθ·T（按论文 (21) 的误差定义推出；论文印的是负号，见笔记附录）。 */
  function standingExample(th, T) {
    var Rb = Ry(th), xiR = v3(0, th, 0), acc = add3(mv3(Rb, A_STAND), GVEC);
    var vbar = scl3(acc, T), pbar = scl3(acc, 0.5 * T * T);
    var xiv = scl3(cross3(GVEC, xiR), T), xip = scl3(cross3(GVEC, xiR), 0.5 * T * T);
    var J = G1(xiR);
    return {
      vbar: vbar, pbar: pbar, xiv: xiv, xip: xip,
      inekfV: mv3(J, xiv), inekfP: mv3(J, xip),
      trueDv: scl3(vbar, -1), qekfDv: scl3(mv3(Rb, cross3(A_STAND, xiR)), T)
    };
  }
  var EX_SMALL = standingExample(0.1, 1); // 0.1 rad
  var EX_BIG = standingExample(0.5, 1); // 0.5 rad

  /* ── 例子 2：一次运动学校正（第 6 幕，具体实例第 6 步）：对角协方差，只演示 H 怎么分账 ── */
  var UPD = { p: v3(0.30, 0, 0.90), d: v3(0.40, -0.13, 0), h: v3(0.12, -0.13, -0.88), sigP: 0.1, sigD: 0.1, sigN: 0.01 };
  function updateExample(u) {
    var z = sub3(u.h, sub3(u.d, u.p)); // Π X̄ Y = R̄h + p̄ − d̄（R̄ = I）
    var S = u.sigP * u.sigP + u.sigD * u.sigD + u.sigN * u.sigN;
    var kp = -(u.sigP * u.sigP) / S, kd = (u.sigD * u.sigD) / S; // K = P Hᵀ S⁻¹，H = [0 0 −I I]
    var dp = scl3(z, kp), dd = scl3(z, kd);
    return { z: z, S: S, kp: kp, kd: kd, dp: dp, dd: dd, pNew: add3(u.p, dp), dNew: add3(u.d, dd) };
  }
  var UPD_EX = updateExample(UPD);
  /* ── 例子 3：脚落地时新加一个触地点（第 10 幕，具体实例第 9 步） ── */
  var NEWFOOT = { p: UPD.p, h: UPD.h, sigP: 0.1, sigH: 0.01 };
  var NEWFOOT_D = add3(NEWFOOT.p, NEWFOOT.h); // d̄ = p̄ + R̄ h_p，R̄ = I
  var NEWFOOT_SIG = Math.sqrt(NEWFOOT.sigP * NEWFOOT.sigP + NEWFOOT.sigH * NEWFOOT.sigH);
  /* ── 例子 4：香蕉（第 8 幕，具体实例第 8 步）：走 8 m、航向 σ = 10° ── */
  var BAN_D = BANANA.speed * 8, BAN_S = (BANANA.yawDeg * Math.PI) / 180;
  var BAN_LAT1 = BAN_D * Math.sin(BAN_S), BAN_SAG2 = BAN_D * (1 - Math.cos(2 * BAN_S));
  /* ── 可观性：单脚 12 维、双脚 15 维，秩各少 4（第 5.4 节；具体实例第 7 步用 Python 重算） ── */
  var OBS = { one: [12, 8], two: [15, 11], qekfToy: 9 };

  // ─── 图 4 / 图 5 的实验在浏览器里重跑（第 6.3 节） ───────────────────────────
  /* 真值从单位元出发；InEKF 与 QEKF 的初始估计相同：R̄₀ = Exp(s·(π/2, π/2, π/2))，速度、位置无误差。
     两者用同一串随机 IMU 读数传 1 秒（1000 步）。论文没给随机读数的分布与噪声大小，这里自取：
     ω ~ N(0, 1)、ã ~ (0, 0, 9.81) + N(0, 1)；有噪声时估计值另加 N(0, 0.05)、N(0, 0.5)。
     InEKF 的线性误差每步乘 Φ = expm(AΔt)（A 幂零，闭式就是三项），和离散的真实误差逐位相同；
     QEKF 的线性误差方程含估计值 R̄ₜ 与读数，按欧拉法积分。返回 [InEKF 差, QEKF 差]。 */
  var LIN = { steps: 1000, dt: 0.001, wStd: 1, aStd: 1, wNoise: 0.05, aNoise: 0.5 };
  function linRun(s, seed, noisy) {
    var rng = mulberry32(seed);
    var dt = LIN.dt, a0 = s * Math.PI / 2;
    var xi0 = v3(a0, a0, a0);
    var R = eye3(), v = v3(0, 0, 0), p = v3(0, 0, 0);
    var Rb = Exp3(xi0), vb = v3(0, 0, 0), pb = v3(0, 0, 0);
    var xR = xi0.slice(), xv = v3(0, 0, 0), xp = v3(0, 0, 0); // InEKF 线性传播
    var qR = xi0.slice(), qv = v3(0, 0, 0), qp = v3(0, 0, 0); // QEKF 线性传播
    for (var k = 0; k < LIN.steps; k++) {
      var w = v3(LIN.wStd * gauss(rng), LIN.wStd * gauss(rng), LIN.wStd * gauss(rng));
      var a = v3(LIN.aStd * gauss(rng), LIN.aStd * gauss(rng), G + LIN.aStd * gauss(rng));
      var wm = w, am = a;
      if (noisy) {
        wm = add3(w, v3(LIN.wNoise * gauss(rng), LIN.wNoise * gauss(rng), LIN.wNoise * gauss(rng)));
        am = add3(a, v3(LIN.aNoise * gauss(rng), LIN.aNoise * gauss(rng), LIN.aNoise * gauss(rng)));
      }
      /* QEKF：dδθ = −(ω̃)×δθ、dδv = R̄ₜ(ã)×δθ、dδp = δv（估计值 R̄ₜ 进了方程） */
      var qR2 = add3(qR, scl3(cross3(wm, qR), -dt));
      var qv2 = add3(qv, scl3(mv3(Rb, cross3(am, qR)), dt));
      var qp2 = add3(qp, scl3(qv, dt));
      qR = qR2; qv = qv2; qp = qp2;
      /* InEKF：Φ = expm(AΔt)，A 只含 (g)× 与 I */
      var gx = cross3(GVEC, xR);
      xp = add3(add3(xp, scl3(xv, dt)), scl3(gx, 0.5 * dt * dt));
      xv = add3(xv, scl3(gx, dt));
      /* 真值与估计值：同一套离散捷联积分（代码 Propagate() 的写法） */
      var acc = add3(mv3(R, a), GVEC);
      p = add3(add3(p, scl3(v, dt)), scl3(acc, 0.5 * dt * dt));
      v = add3(v, scl3(acc, dt));
      R = mm3(R, Exp3(scl3(w, dt)));
      var accb = add3(mv3(Rb, am), GVEC);
      pb = add3(add3(pb, scl3(vb, dt)), scl3(accb, 0.5 * dt * dt));
      vb = add3(vb, scl3(accb, dt));
      Rb = mm3(Rb, Exp3(scl3(wm, dt)));
    }
    /* 真实的右不变误差 η = X̄X⁻¹ 取对数；QEKF 的真实误差按式 (21) 逐项相减 */
    var E = mm3(Rb, tr3(R)), phi = Log3(E), Ji = G1inv(phi);
    var tv = mv3(Ji, sub3(vb, mv3(E, v))), tp = mv3(Ji, sub3(pb, mv3(E, p)));
    var dI = Math.sqrt(Math.pow(norm3(sub3(phi, xR)), 2) + Math.pow(norm3(sub3(tv, xv)), 2) + Math.pow(norm3(sub3(tp, xp)), 2));
    var qtR = Log3(mm3(tr3(R), Rb)), qtv = sub3(v, vb), qtp = sub3(p, pb);
    var dQ = Math.sqrt(Math.pow(norm3(sub3(qtR, qR)), 2) + Math.pow(norm3(sub3(qtv, qv)), 2) + Math.pow(norm3(sub3(qtp, qp)), 2));
    return [dI, dQ];
  }
  var LIN_SCALES = [];
  for (var li = 0; li <= 20; li++) LIN_SCALES.push(li / 20);
  function linSweep(noisy, seedBase) {
    return LIN_SCALES.map(function (s, i) { return linRun(s, seedBase + i, noisy); });
  }

  // ─── 二维（矢状面）玩具滤波器：同一段行走，InEKF 对普通 EKF ──────────────────────
  /* 状态 (θ, v, p, d)：俯仰 θ、二维速度与位置、一个触地点，误差 7 维。真值：身体以 0.3 m/s 前进、上下起伏 1 cm、
     俯仰 ±0.05 rad；每 0.5 s 换一只脚（步长 0.15 m），换脚时删掉旧触地点、用正运动学加新的。IMU 与运动学 400 Hz，
     噪声取表 1（加速度 0.04、角速度 0.002、接触速度 0.05），运动学噪声取 1.5 cm。初始协方差也按表 1：30°、1 m/s、0.1 m。
     这是二维玩具，只复现「从差的初值收敛」这个机制，数值不能和论文的 Cassie 比。 */
  var TOY = { dt: 1 / 400, T: 2, step: 0.5, stride: 0.15, speed: 0.3, sigA: 0.04, sigW: 0.002, sigC: 0.05, sigH: 0.015, tol: 2 };
  var JM = [[0, -1], [1, 0]]; // 二维的「叉乘」：θ^ u = θ J u
  function rot2(t) { return [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]]; }
  function mv2(M, a) { return [M[0][0] * a[0] + M[0][1] * a[1], M[1][0] * a[0] + M[1][1] * a[1]]; }
  function tr2(M) { return [[M[0][0], M[1][0]], [M[0][1], M[1][1]]]; }
  function mm2(A, B) {
    return [[A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]], [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]];
  }
  function V2(t) { // SE_K(2) 指数映射里平移那几列要乘的矩阵
    if (Math.abs(t) < 1e-9) return [[1, -t / 2], [t / 2, 1]];
    var s = Math.sin(t) / t, c = (1 - Math.cos(t)) / t;
    return [[s, -c], [c, s]];
  }
  function zeros(n, m) {
    var M = [];
    for (var i = 0; i < n; i++) { M.push([]); for (var j = 0; j < m; j++) M[i].push(0); }
    return M;
  }
  function eyeN(n) { var M = zeros(n, n); for (var i = 0; i < n; i++) M[i][i] = 1; return M; }
  function mmN(A, B) {
    var n = A.length, m = B[0].length, q = B.length, C = zeros(n, m);
    for (var i = 0; i < n; i++) for (var k = 0; k < q; k++) { var a = A[i][k]; if (a === 0) continue; for (var j = 0; j < m; j++) C[i][j] += a * B[k][j]; }
    return C;
  }
  function trN(A) { var C = zeros(A[0].length, A.length); for (var i = 0; i < A.length; i++) for (var j = 0; j < A[0].length; j++) C[j][i] = A[i][j]; return C; }
  function addN(A, B) { var C = zeros(A.length, A[0].length); for (var i = 0; i < A.length; i++) for (var j = 0; j < A[0].length; j++) C[i][j] = A[i][j] + B[i][j]; return C; }
  /* M P Mᵀ，跳过 M 里的零 */
  function sandwich(M, P) {
    var n = P.length, T = zeros(n, n), C = zeros(n, n), i, j, k;
    for (i = 0; i < n; i++) for (k = 0; k < n; k++) { var a = M[i][k]; if (a === 0) continue; for (j = 0; j < n; j++) T[i][j] += a * P[k][j]; }
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) { var sum = 0; for (k = 0; k < n; k++) { var b = M[j][k]; if (b !== 0) sum += T[i][k] * b; } C[i][j] = sum; }
    return C;
  }
  function inv2(S) { var d = S[0][0] * S[1][1] - S[0][1] * S[1][0]; return [[S[1][1] / d, -S[0][1] / d], [-S[1][0] / d, S[0][0] / d]]; }
  function toyTruth(t) {
    var w4 = 2 * Math.PI * 2, w1 = 2 * Math.PI;
    return {
      th: 0.05 * Math.sin(w1 * t), w: 0.05 * w1 * Math.cos(w1 * t),
      v: [TOY.speed, 0.01 * w4 * Math.cos(w4 * t)], p: [TOY.speed * t, 0.9 + 0.01 * Math.sin(w4 * t)],
      acc: [0, -0.01 * w4 * w4 * Math.sin(w4 * t)]
    };
  }
  function toyFoot(k) { return [TOY.stride * k + TOY.stride / 2, 0]; }
  function wrapPi(a) { return ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI; }
  /* 加一个触地点的协方差：InEKF ξ_d = ξ_p + R̄·n（F 只抄位置那两行）；EKF 还多一项 R̄ J h·δθ（依赖估计值） */
  function toyAugment(P5, Rb, h, inv) {
    var F = zeros(7, 5);
    for (var i = 0; i < 5; i++) F[i][i] = 1;
    F[5][3] = 1; F[6][4] = 1;
    if (!inv) { var c = mv2(mm2(Rb, JM), h); F[5][0] = c[0]; F[6][0] = c[1]; }
    var Gm = zeros(7, 2);
    Gm[5][0] = Rb[0][0]; Gm[5][1] = Rb[0][1]; Gm[6][0] = Rb[1][0]; Gm[6][1] = Rb[1][1];
    var s2 = TOY.sigH * TOY.sigH;
    var GG = mmN(Gm, trN(Gm));
    var P = mmN(mmN(F, P5), trN(F));
    for (i = 0; i < 7; i++) for (var j = 0; j < 7; j++) P[i][j] += s2 * GG[i][j];
    return P;
  }
  function toyRun(th0err, v0err, inv, seed) {
    var rng = mulberry32(seed), dt = TOY.dt, n = Math.round(TOY.T / dt);
    var T0 = toyTruth(0);
    var thb = T0.th + th0err, vb = [T0.v[0] + v0err[0], T0.v[1] + v0err[1]], pb = T0.p.slice();
    var P = zeros(5, 5);
    P[0][0] = Math.pow((30 * Math.PI) / 180, 2); P[1][1] = 1; P[2][2] = 1; P[3][3] = 0.01; P[4][4] = 0.01;
    var k = 0, d = toyFoot(0);
    var h = mv2(tr2(rot2(T0.th)), [d[0] - T0.p[0], d[1] - T0.p[1]]);
    h = [h[0] + TOY.sigH * gauss(rng), h[1] + TOY.sigH * gauss(rng)];
    var Rb = rot2(thb), db = [pb[0] + mv2(Rb, h)[0], pb[1] + mv2(Rb, h)[1]];
    P = toyAugment(P, Rb, h, inv);
    var errTh = new Float64Array(n), errV = new Float64Array(n);
    var Q = [TOY.sigW * TOY.sigW, TOY.sigA * TOY.sigA, TOY.sigA * TOY.sigA, 0, 0, TOY.sigC * TOY.sigC, TOY.sigC * TOY.sigC];
    for (var i = 0; i < n; i++) {
      var t = i * dt, Tr = toyTruth(t), R = rot2(Tr.th);
      var spec = mv2(tr2(R), [Tr.acc[0], Tr.acc[1] + G]);
      var am = [spec[0] + TOY.sigA * gauss(rng), spec[1] + TOY.sigA * gauss(rng)], wm = Tr.w + TOY.sigW * gauss(rng);
      Rb = rot2(thb);
      /* 线性误差方程 A 与把噪声搬进误差坐标的矩阵 */
      var A = zeros(7, 7), Ad = eyeN(7), c;
      A[3][1] = 1; A[4][2] = 1;
      if (inv) {
        A[1][0] = -G; A[2][0] = 0; // −J g = (−9.81, 0)：常数
        c = mv2(JM, vb); Ad[1][0] = -c[0]; Ad[2][0] = -c[1];
        c = mv2(JM, pb); Ad[3][0] = -c[0]; Ad[4][0] = -c[1];
        c = mv2(JM, db); Ad[5][0] = -c[0]; Ad[6][0] = -c[1];
        Ad[3][3] = Rb[0][0]; Ad[3][4] = Rb[0][1]; Ad[4][3] = Rb[1][0]; Ad[4][4] = Rb[1][1];
      } else {
        c = mv2(mm2(Rb, JM), am); A[1][0] = c[0]; A[2][0] = c[1]; // R̄ J ã：随估计值变
      }
      Ad[1][1] = Rb[0][0]; Ad[1][2] = Rb[0][1]; Ad[2][1] = Rb[1][0]; Ad[2][2] = Rb[1][1];
      Ad[5][5] = Rb[0][0]; Ad[5][6] = Rb[0][1]; Ad[6][5] = Rb[1][0]; Ad[6][6] = Rb[1][1];
      var Phi = eyeN(7);
      for (var r = 0; r < 7; r++) for (var q = 0; q < 7; q++) Phi[r][q] += A[r][q] * dt;
      /* P ← ΦPΦᵀ + (ΦAd)Q(ΦAd)ᵀΔt（代码 Propagate() 的离散化：Φ ≈ I + AΔt）；Φ 只有对角与 4 个非零，按稀疏乘 */
      var PA = mmN(Phi, Ad), Qd = zeros(7, 7);
      for (r = 0; r < 7; r++) for (q = 0; q < 7; q++) { var sum = 0; for (var m = 0; m < 7; m++) sum += PA[r][m] * Q[m] * PA[q][m]; Qd[r][q] = sum * dt; }
      P = sandwich(Phi, P);
      for (r = 0; r < 7; r++) for (q = 0; q < 7; q++) P[r][q] += Qd[r][q];
      var aw = mv2(Rb, am);
      aw = [aw[0], aw[1] - G];
      pb = [pb[0] + vb[0] * dt + 0.5 * aw[0] * dt * dt, pb[1] + vb[1] * dt + 0.5 * aw[1] * dt * dt];
      vb = [vb[0] + aw[0] * dt, vb[1] + aw[1] * dt];
      thb += wm * dt;
      /* 换脚：删旧触地点（边缘化）、加新的；不换脚就做一次运动学校正 */
      var kk = Math.floor((t + dt) / TOY.step + 1e-9), T2 = toyTruth(t + dt), R2 = rot2(T2.th);
      Rb = rot2(thb);
      if (kk !== k) {
        k = kk; d = toyFoot(k);
        h = mv2(tr2(R2), [d[0] - T2.p[0], d[1] - T2.p[1]]);
        h = [h[0] + TOY.sigH * gauss(rng), h[1] + TOY.sigH * gauss(rng)];
        var P5 = zeros(5, 5);
        for (r = 0; r < 5; r++) for (q = 0; q < 5; q++) P5[r][q] = P[r][q];
        var Rh = mv2(Rb, h);
        db = [pb[0] + Rh[0], pb[1] + Rh[1]];
        P = toyAugment(P5, Rb, h, inv);
      } else {
        h = mv2(tr2(R2), [d[0] - T2.p[0], d[1] - T2.p[1]]);
        h = [h[0] + TOY.sigH * gauss(rng), h[1] + TOY.sigH * gauss(rng)];
        var H = zeros(2, 7), N, z, s2 = TOY.sigH * TOY.sigH;
        if (inv) {
          H[0][3] = -1; H[1][4] = -1; H[0][5] = 1; H[1][6] = 1; // H = [0, 0, −I, I]：常数
          N = mmN(mmN(Rb, [[s2, 0], [0, s2]]), tr2(Rb));
          var Rh2 = mv2(Rb, h);
          z = [Rh2[0] + pb[0] - db[0], Rh2[1] + pb[1] - db[1]];
        } else {
          var e = mv2(JM, mv2(tr2(Rb), [db[0] - pb[0], db[1] - pb[1]]));
          H[0][0] = -e[0]; H[1][0] = -e[1]; // −J R̄ᵀ(d̄ − p̄)：随估计值变
          H[0][3] = -Rb[0][0]; H[0][4] = -Rb[1][0]; H[1][3] = -Rb[0][1]; H[1][4] = -Rb[1][1];
          H[0][5] = Rb[0][0]; H[0][6] = Rb[1][0]; H[1][5] = Rb[0][1]; H[1][6] = Rb[1][1];
          N = [[s2, 0], [0, s2]];
          var hh = mv2(tr2(Rb), [db[0] - pb[0], db[1] - pb[1]]);
          z = [h[0] - hh[0], h[1] - hh[1]];
        }
        var PHt = mmN(P, trN(H)), S = addN(mmN(H, PHt), N), Kg = mmN(PHt, inv2(S));
        var dl = [];
        for (r = 0; r < 7; r++) dl.push(Kg[r][0] * z[0] + Kg[r][1] * z[1]);
        if (inv) {
          /* X̄⁺ = exp(δ) X̄：旋转部分作用在 v、p、d 上，平移部分乘 V(δθ) */
          var E = rot2(dl[0]), Vm = V2(dl[0]), a1, a2;
          thb += dl[0];
          a1 = mv2(E, vb); a2 = mv2(Vm, [dl[1], dl[2]]); vb = [a1[0] + a2[0], a1[1] + a2[1]];
          a1 = mv2(E, pb); a2 = mv2(Vm, [dl[3], dl[4]]); pb = [a1[0] + a2[0], a1[1] + a2[1]];
          a1 = mv2(E, db); a2 = mv2(Vm, [dl[5], dl[6]]); db = [a1[0] + a2[0], a1[1] + a2[1]];
        } else {
          thb += dl[0]; vb = [vb[0] + dl[1], vb[1] + dl[2]]; pb = [pb[0] + dl[3], pb[1] + dl[4]]; db = [db[0] + dl[5], db[1] + dl[6]];
        }
        var IKH = eyeN(7), KH = mmN(Kg, H);
        for (r = 0; r < 7; r++) for (q = 0; q < 7; q++) IKH[r][q] -= KH[r][q];
        P = addN(sandwich(IKH, P), mmN(mmN(Kg, N), trN(Kg))); // Joseph 形式（扩展版式 19，代码 Correct()）
      }
      errTh[i] = wrapPi(thb - T2.th);
      errV[i] = Math.hypot(vb[0] - T2.v[0], vb[1] - T2.v[1]);
    }
    return { th: errTh, v: errV };
  }
  /* 收敛时刻：此后 |俯仰误差| 一直小于 2°；2 s 内没做到记为 2 s */
  function convTime(errTh) {
    var tol = (TOY.tol * Math.PI) / 180;
    for (var i = errTh.length - 1; i >= 0; i--) if (Math.abs(errTh[i]) >= tol) return (i + 1) * TOY.dt;
    return 0;
  }
  function median(a) {
    var b = a.slice().sort(function (x, y) { return x - y; }), m = b.length >> 1;
    return b.length % 2 ? b[m] : 0.5 * (b[m - 1] + b[m]);
  }
  /* 一批随机初值（初值与噪声各用一串种子，两种滤波器共用同一批初值与测量噪声） */
  function toyBatch(rangeDeg, velMax, runs, seedBase) {
    var out = { inv: [], ekf: [] };
    for (var r = 0; r < runs; r++) {
      var rr = mulberry32(seedBase + 1000 + r);
      var th0 = (((rr() * 2 - 1) * rangeDeg) * Math.PI) / 180, v0 = [(rr() * 2 - 1) * velMax, (rr() * 2 - 1) * velMax];
      out.inv.push(toyRun(th0, v0, true, seedBase + 5000 + r));
      out.ekf.push(toyRun(th0, v0, false, seedBase + 5000 + r));
    }
    return out;
  }
  /* ── core:end ── */

  // ─── 演示 1：图 4–5 的实验重跑 ───────────────────────────────────────────────
  function buildLinearizeDemo(host) {
    var root = card(host, {
      title: '线性化误差方程准不准：第 6.3 节（图 4、5）的实验在浏览器里重跑',
      sub: '真值从单位元出发，估计值的初始朝向错 $s\\cdot(\\pi/2, \\pi/2, \\pi/2)$，两者吃同一串随机 IMU 读数传 1 秒；再用各自的线性误差方程把初始误差也传 1 秒，看和真实误差差多少。'
    });
    var state = { noisy: false, s: 1, seed: 7 };
    var row = controlsRow(root);
    var mode = buttonGroup(row, {
      label: '读数',
      items: [{ label: '无噪声（图 4）', value: false }, { label: '估计值的读数带噪声（图 5）', value: true }],
      value: false,
      onPick: function (v) { state.noisy = v; recompute(); }
    });
    var sl = slider(row, { label: '初始朝向误差缩放 $s$', min: 0, max: 1, step: 0.05, value: 1, format: function (v) { return fmt(v, 2) + '（' + fmt(v * 90, 0) + '° × 3 轴）'; }, onInput: function (v) { state.s = v; render(); } });
    var row2 = controlsRow(root);
    button(row2, '换一串 IMU 读数', function () { state.seed += 101; recompute(); });
    var st = stage(root, 280);
    var setLegend = legend(root, [{ key: 'bad', text: '■ QEKF：线性预测与真实误差之差' }, { key: 'good', text: '■ InEKF：同上（无噪声时是浮点误差）' }]);
    var stats = statsRow(root);
    var sQ = stats.add('QEKF 之差'), sI = stats.add('InEKF 之差'), sR = stats.add('比值');
    var verdict = verdictBox(root);
    note(root, [
      '**这是论文实验的重跑，不是论文的数据**：论文没给随机 IMU 读数的分布和噪声大小，这里自取 $\\omega \\sim \\mathcal{N}(0, 1)$ rad/s、$\\tilde a \\sim (0, 0, 9.81) + \\mathcal{N}(0, 1)$ m/s²，有噪声时估计值的读数再加 $\\mathcal{N}(0, 0.05)$、$\\mathcal{N}(0, 0.5)$。量级和图 4 接近（$s = 1$ 时 QEKF 约 25，读图），但不能逐点比。',
      'InEKF 的误差每步乘 $\\Phi = e^{A\\Delta t}$：$A$ 只含重力 $(g)_\\times$ 和单位阵，幂零，闭式就是三项，所以和离散的真实误差逐位相同；QEKF 的方程里有估计值 $\\bar R_t$ 与读数 $\\tilde a_t$、$\\tilde\\omega_t$，用欧拉法积分。纵轴是 9 维误差向量之差的范数（旋转 rad、速度 m/s、位置 m 混在一起，和论文图 4 的纵轴一样）。'
    ]);
    var data = null;
    function recompute() { data = linSweep(state.noisy, state.seed); render(); }
    var render = registerRenderer(function () {
      if (!data) data = linSweep(state.noisy, state.seed);
      var g = begin(st), P = g.P;
      setLegend(P);
      var ymax = 0;
      data.forEach(function (d) { ymax = Math.max(ymax, d[1]); });
      ymax = Math.max(5, Math.ceil(ymax / 5) * 5);
      var p = plot(g, { l: 44, r: 14, t: 22, b: 34 }, [0, 1], [-ymax * 0.04, ymax]);
      axes(g, p, { xTicks: [0, 0.2, 0.4, 0.6, 0.8, 1], yTicks: K.niceTicks(0, ymax, 5), xLabel: '初始误差缩放 s' });
      text(g.ctx, '传 1 秒后，线性预测与真实误差之差', p.x0 + 6, p.y1 - 10, P.muted, 'left', '11px sans-serif');
      line(g.ctx, data.map(function (d, i) { return [p.sx(LIN_SCALES[i]), p.sy(d[1])]; }), P.bad, 2);
      line(g.ctx, data.map(function (d, i) { return [p.sx(LIN_SCALES[i]), p.sy(d[0])]; }), P.good, 2, [6, 4]);
      var i = Math.round(state.s * 20), d = data[i];
      line(g.ctx, [[p.sx(state.s), p.y1], [p.sx(state.s), p.y0]], P.muted, 1, [3, 3]);
      dot(g.ctx, p.sx(state.s), p.sy(d[1]), 4.5, P.bad);
      dot(g.ctx, p.sx(state.s), p.sy(d[0]), 4.5, P.good);
      st.canvas.setAttribute('aria-label', 'QEKF 与 InEKF 的线性化误差随初始误差变化的曲线');
      sQ.set(fmt(d[1], 2), 'bad');
      sI.set(d[0] < 1e-6 ? d[0].toExponential(1) : fmt(d[0], 3), 'good');
      sR.set(d[0] > 1e-9 ? fmt(d[1] / d[0], 0) + ' 倍' : '—');
      if (!state.noisy) {
        verdict.set(state.s === 0 ? '初始误差为 0：两种线性化都对（差都是 0）。' : '无噪声时 InEKF 的线性误差方程是**精确**的（定理 2）：差只剩浮点舍入；QEKF 在错误的估计值上线性化，初始误差越大差得越多。', state.s === 0 ? 'learning' : 'frozen');
      } else {
        verdict.set('读数带噪声后定理 2 不再精确，InEKF 也有了差，但仍比 QEKF 小一两个数量级 —— 和图 5 的走势一致。', 'learning');
      }
    });
    mode.pick(false, true);
    sl.refresh();
    render();
  }

  // ─── 演示 2：二维玩具里的收敛对比 ───────────────────────────────────────────
  function buildConvergeDemo(host) {
    var root = card(host, {
      title: '从差的初值收敛：二维行走玩具里的 InEKF 与普通 EKF',
      sub: '同一段行走、同一批测量噪声，只把俯仰和速度的初值随机化（对应图 3 / 图 8 的做法）。拖初始误差的范围，看两种滤波器的俯仰误差多快收拢。'
    });
    var state = { range: 30, vel: 1, runs: 24, seed: 1 };
    var row = controlsRow(root);
    var timer = null;
    function later() { clearTimeout(timer); timer = setTimeout(recompute, 120); }
    slider(row, { label: '初始俯仰误差 ±', min: 10, max: 90, step: 5, value: 30, format: function (v) { return v + '°'; }, onInput: function (v) { state.range = v; later(); } });
    slider(row, { label: '初始速度误差 ±', min: 0, max: 2, step: 0.25, value: 1, format: function (v) { return fmt(v, 2) + ' m/s'; }, onInput: function (v) { state.vel = v; later(); } });
    var row2 = controlsRow(root);
    button(row2, '换一批随机初值', function () { state.seed += 1; recompute(); });
    var grid = stageGrid(root);
    var stE = stage(grid, 220), stI = stage(grid, 220);
    var setLegend = legend(root, [{ key: 'bad', text: '■ 普通 EKF（误差逐项相减，雅可比在估计值处求）' }, { key: 'good', text: '■ InEKF（右不变误差，A、H 是常数）' }, { key: 'muted', text: '┅ ±2° 收敛带' }]);
    var stats = statsRow(root);
    var sE = stats.add('EKF 收敛时刻中位数'), sI = stats.add('InEKF 收敛时刻中位数'), sN = stats.add('2 s 内没收敛'), s1 = stats.add('1 s 时平均 |俯仰误差|');
    var verdict = verdictBox(root);
    note(root, [
      '**这是简化模型，数值不能和论文直接比**：矢状面里的二维版本（俯仰 + 二维速度 / 位置 + 一个触地点，误差 7 维），真值是 0.3 m/s 的前进加 1 cm 起伏、±0.05 rad 俯仰；每 0.5 s 换脚（删旧触地点、用正运动学加新的），IMU 与运动学都是 400 Hz，噪声和初始协方差取表 1，运动学噪声 1.5 cm。没有零偏。',
      '两种滤波器的预测、换脚与校正步骤完全对应，只差误差的定义：EKF 的 $A$ 里有 $\\bar R_t J\\tilde a_t$、$H$ 里有 $\\bar R_t^\\top(\\bar d - \\bar p)$；InEKF 的 $A$ 只含重力、$H = [0, 0, -I, I]$。「收敛时刻」= 此后俯仰误差一直在 ±2° 以内。每次 24 组初值，换批次后结论不变（笔记里用 40 组、三档范围做过）。InEKF 头零点几秒的来回振荡是这个玩具里实际跑出来的；我们推测是初始俯仰不确定 30°、400 Hz 校正让增益很大，误差经重力耦合来回几次才收拢。'
    ]);
    var data = null, pending = false;
    /* 一批 24 × 2 次滤波约半秒：放到下一拍再算，先让页面画出来 */
    function recompute() {
      if (pending) return;
      pending = true;
      setTimeout(function () {
        pending = false;
        data = toyBatch(state.range, state.vel, state.runs, state.seed * 97);
        render();
      }, 30);
    }
    function drawRuns(stg, runs, color, title) {
      var g = begin(stg), P = g.P;
      var lim = Math.max(10, state.range + 10);
      var p = plot(g, { l: 40, r: 10, t: 22, b: 30 }, [0, TOY.T], [-lim, lim]);
      axes(g, p, { xTicks: [0, 0.5, 1, 1.5, 2], yTicks: K.niceTicks(-lim, lim, 4), xLabel: '时间 s' });
      text(g.ctx, title + '：俯仰误差（°）', p.x0 + 4, p.y1 - 9, P.text, 'left', '12px sans-serif');
      var c = P[color];
      runs.forEach(function (run) {
        var pts = [];
        for (var i = 0; i < run.th.length; i += 4) pts.push([p.sx(i * TOY.dt), p.sy(clamp((run.th[i] * 180) / Math.PI, -lim, lim))]);
        g.ctx.globalAlpha = 0.55;
        line(g.ctx, pts, c, 1.2);
        g.ctx.globalAlpha = 1;
      });
      line(g.ctx, [[p.x0, p.sy(TOY.tol)], [p.x1, p.sy(TOY.tol)]], P.muted, 1, [4, 3]);
      line(g.ctx, [[p.x0, p.sy(-TOY.tol)], [p.x1, p.sy(-TOY.tol)]], P.muted, 1, [4, 3]);
      return P;
    }
    var render = registerRenderer(function () {
      if (!data) {
        [stE, stI].forEach(function (stg) { var g = begin(stg); text(g.ctx, '计算中…', g.w / 2, g.h / 2, g.P.muted, 'center', '13px sans-serif'); });
        recompute();
        return;
      }
      var P = drawRuns(stE, data.ekf, 'bad', '普通 EKF');
      drawRuns(stI, data.inv, 'good', 'InEKF');
      setLegend(P);
      stE.canvas.setAttribute('aria-label', '普通 EKF 的俯仰误差随时间变化，多组随机初值');
      stI.canvas.setAttribute('aria-label', 'InEKF 的俯仰误差随时间变化，多组随机初值');
      var cE = data.ekf.map(function (r) { return convTime(r.th); }), cI = data.inv.map(function (r) { return convTime(r.th); });
      var nE = cE.filter(function (c) { return c >= TOY.T - 1e-9; }).length, nI = cI.filter(function (c) { return c >= TOY.T - 1e-9; }).length;
      var i1 = Math.round(1 / TOY.dt) - 1;
      function meanAbs(runs) { return runs.reduce(function (a, r) { return a + Math.abs(r.th[i1]); }, 0) / runs.length * 180 / Math.PI; }
      sE.set(fmt(median(cE), 2) + ' s', 'bad');
      sI.set(fmt(median(cI), 2) + ' s', 'good');
      sN.set('EKF ' + nE + ' / InEKF ' + nI + '（共 ' + state.runs + '）', nE > 0 ? 'bad' : null);
      s1.set('EKF ' + fmt(meanAbs(data.ekf), 2) + '° / InEKF ' + fmt(meanAbs(data.inv), 2) + '°');
      verdict.set(
        median(cI) < median(cE)
          ? '初始误差越大，EKF 收得越慢（它在错的工作点上线性化）；InEKF 的收敛时刻几乎不随初始误差变 —— 这就是「吸引域与轨迹无关」在玩具里的样子。'
          : '这一批里两者差不多：初始误差小时线性化点本来就准，差别要把初始误差拉大才看得出来。',
        median(cI) < median(cE) ? 'frozen' : 'learning'
      );
    });
    render();
  }

  // ─── 演示 3：图 6、7 —— 航向不确定时，位置分布长什么样 ───────────────────────────
  /* 机器人沿世界 x 轴以 1 m/s 直走，初始位置 σ = 0.1 m（各轴）、航向 σ 可调。
     真值：p(t) = p₀ + t·(cos ψ, sin ψ)。InEKF：在李代数里撒 ξ = (ψ, ξ_p)，经指数映射 X = exp(ξ)X̄ 回到群上：
     p = Rot(ψ)p̄ + V(ψ)ξ_p（这个玩具里 ξ 的协方差不随时间变，航向误差只在旋转那一维）。
     QEKF：位置上的高斯，均值 p̄，按一阶线性化给侧向方差 (tσ_ψ)² —— 只能是直的椭圆。 */
  function bananaSamples(sigDeg, n, seed) {
    var rng = mulberry32(seed), sig = (sigDeg * Math.PI) / 180, out = { truth: [], inv: [], q: [] };
    BANANA.secs.forEach(function (t) {
      var d = BANANA.speed * t, tru = [], inv = [], q = [];
      for (var i = 0; i < n; i++) {
        var psi = sig * gauss(rng), e0 = BANANA.posSigma * gauss(rng), e1 = BANANA.posSigma * gauss(rng);
        tru.push([e0 + d * Math.cos(psi), e1 + d * Math.sin(psi)]);
        var Vm = V2(psi), vp = mv2(Vm, [e0, e1]);
        inv.push([d * Math.cos(psi) + vp[0], d * Math.sin(psi) + vp[1]]);
        var lat = Math.sqrt(BANANA.posSigma * BANANA.posSigma + d * d * sig * sig);
        q.push([d + BANANA.posSigma * gauss(rng), lat * gauss(rng)]);
      }
      out.truth.push(tru); out.inv.push(inv); out.q.push(q);
    });
    return out;
  }
  /* 真样本落在 QEKF 的 2σ 椭圆（马氏距离 ≤ 2）里的比例；高斯本该是 1 − e⁻² ≈ 86.5% */
  function qekfCoverage(samples, t, sigDeg) {
    var d = BANANA.speed * t, sig = (sigDeg * Math.PI) / 180, lat = Math.sqrt(BANANA.posSigma * BANANA.posSigma + d * d * sig * sig), inside = 0;
    samples.forEach(function (s) {
      var m = Math.pow((s[0] - d) / BANANA.posSigma, 2) + Math.pow(s[1] / lat, 2);
      if (m <= 4) inside++;
    });
    return inside / samples.length;
  }
  function buildBananaDemo(host) {
    var root = card(host, {
      title: '不确定性的形状：图 6、7 —— 真值、InEKF 与 QEKF',
      sub: '机器人以 1 m/s 往前走 8 秒，初始位置 σ = 0.1 m、航向 σ 可调。三格分别是真分布、InEKF 在李代数里撒点再映回来的分布、QEKF 的高斯椭圆；五团点是第 0、2、4、6、8 秒。'
    });
    var SIGS = [0, 2, 5, 10, 15, 20, 30, 45, 60, 90, 180, 360];
    var state = { sig: 10, seed: 3 };
    var row = controlsRow(root);
    var sl = slider(row, { label: '初始航向标准差 $\\sigma_\\psi$', min: 0, max: SIGS.length - 1, step: 1, value: 3, format: function (v) { return SIGS[v] + '°' + (SIGS[v] === 360 ? '（完全不知道朝哪）' : ''); }, onInput: function (v) { state.sig = SIGS[v]; recompute(); } });
    var row2 = controlsRow(root);
    button(row2, '10°（图 6）', function () { sl.set(SIGS.indexOf(10)); });
    button(row2, '360°（图 7）', function () { sl.set(SIGS.indexOf(360)); });
    var grid = stageGrid(root);
    var stages = [stage(grid, 300), stage(grid, 300), stage(grid, 300)];
    var stats = statsRow(root);
    var sLat = stats.add('8 s 时 1σ 侧向偏移'), sSag = stats.add('2σ 处往回弯'), sCov = stats.add('真样本落在 QEKF 2σ 椭圆里');
    var verdict = verdictBox(root);
    note(root, [
      '**按论文第 6.4 节的设定画的示意**：只演示分布的**形状**，没有跑滤波器、没有过程噪声；论文是让两个滤波器真的跑一遍再从协方差里撒 1 万个点。论文图 6 里 QEKF 的侧向范围比真值还窄（8 s 时约 ±2 m，读图），说明那次 QEKF 还低估了侧向不确定性；这里的椭圆按一阶线性化给侧向方差，只会更宽。',
      'InEKF 的样本：$\\xi = (\\psi, \\xi_p)$ 在李代数里是高斯，经 $X = \\exp(\\xi)\\bar X$ 回到群上，位置 $= \\mathrm{Rot}(\\psi)\\bar p + V(\\psi)\\xi_p$ —— 朝向和位置绑在一起，所以弯得过来。'
    ]);
    var data = null;
    function recompute() { data = bananaSamples(state.sig, 1200, state.seed); render(); }
    function panel(stg, sets, color, title, ell) {
      var g = begin(stg), P = g.P, big = state.sig > 45;
      var yr = big ? 9.5 : 5, xr = big ? [-9.5, 9.5] : [-1, 9.5];
      var side = Math.min(g.w - 24, (g.h - 40) * (2 * yr) / (xr[1] - xr[0]));
      var cx = g.w / 2, x0 = cx - side / 2;
      var sy = function (x) { return g.h - 24 - ((x - xr[0]) / (xr[1] - xr[0])) * (g.h - 44); };
      var sx = function (y) { return x0 + ((yr - y) / (2 * yr)) * side; }; // 论文的画法：y 轴朝左
      g.ctx.strokeStyle = P.grid;
      g.ctx.lineWidth = 1;
      g.ctx.strokeRect(x0, sy(xr[1]), side, sy(xr[0]) - sy(xr[1]));
      text(g.ctx, title, x0 + 4, 12, P.text, 'left', '12px sans-serif');
      text(g.ctx, 'x 向前', x0 - 2, sy(xr[1]) + 8, P.muted, 'right', '10px sans-serif');
      text(g.ctx, '← y', x0 + side, g.h - 10, P.muted, 'right', '10px sans-serif');
      var c = P[color];
      g.ctx.fillStyle = c;
      sets.forEach(function (pts) {
        pts.forEach(function (q) {
          var X = sx(q[1]), Y = sy(q[0]);
          if (X < x0 || X > x0 + side || Y < sy(xr[1]) || Y > sy(xr[0])) return;
          g.ctx.globalAlpha = 0.35;
          g.ctx.fillRect(X - 0.9, Y - 0.9, 1.8, 1.8);
        });
      });
      g.ctx.globalAlpha = 1;
      if (ell) {
        BANANA.secs.forEach(function (t) {
          var d = BANANA.speed * t, sig = (state.sig * Math.PI) / 180, lat = Math.sqrt(BANANA.posSigma * BANANA.posSigma + d * d * sig * sig);
          g.ctx.save();
          g.ctx.strokeStyle = P.bad;
          g.ctx.lineWidth = 1.2;
          g.ctx.beginPath();
          for (var k = 0; k <= 48; k++) {
            var a = (k / 48) * 2 * Math.PI, X = sx(2 * lat * Math.sin(a)), Y = sy(d + 2 * BANANA.posSigma * Math.cos(a));
            if (k === 0) g.ctx.moveTo(X, Y); else g.ctx.lineTo(X, Y);
          }
          g.ctx.stroke();
          g.ctx.restore();
        });
      }
      BANANA.secs.forEach(function (t) { dot(g.ctx, sx(0), sy(BANANA.speed * t), 2.6, P.text); });
      return P;
    }
    var render = registerRenderer(function () {
      if (!data) data = bananaSamples(state.sig, 1200, state.seed);
      panel(stages[0], data.truth, 'muted', '真分布');
      panel(stages[1], data.inv, 'good', 'InEKF（李代数里的高斯）');
      panel(stages[2], data.q, 'bad', 'QEKF（位置上的高斯 + 2σ 椭圆）', true);
      stages[0].canvas.setAttribute('aria-label', '真实位置分布');
      stages[1].canvas.setAttribute('aria-label', 'InEKF 的位置分布');
      stages[2].canvas.setAttribute('aria-label', 'QEKF 的位置分布');
      var sig = (state.sig * Math.PI) / 180;
      sLat.set(state.sig >= 360 ? '一圈都有' : fmt(8 * Math.sin(Math.min(sig, Math.PI / 2)), 2) + ' m');
      sSag.set(state.sig >= 90 ? '—' : fmt(8 * (1 - Math.cos(2 * sig)), 2) + ' m');
      var cov = qekfCoverage(data.truth[4], 8, state.sig);
      sCov.set(fmt(cov * 100, 1) + '%（高斯应为 86.5%）', cov < 0.8 ? 'bad' : null);
      if (state.sig >= 360) verdict.set('航向完全不知道：真分布是一圈圈的圆环（半径 2、4、6、8 m），InEKF 画得出来；位置上的高斯椭圆根本表示不了（图 7）。', 'frozen');
      else if (state.sig <= 3) verdict.set('航向几乎确定时三者都是小圆点：差别来自航向的不确定性，走得越远越明显。', 'learning');
      else verdict.set('航向一不确定，走得越远，真分布越弯成香蕉；InEKF 把朝向和位置绑在一起，弯得过来；QEKF 只能是直的椭圆，套不住弯回来的那部分。', 'frozen');
    });
    render();
  }

  // ─── 讲解动画：十二幕 ───────────────────────────────────────────────────────
  var svgEl = K.svgEl,
    svgText = K.svgText,
    svgMath = K.svgMath,
    svgRich = K.svgRich,
    paint = K.paint,
    seg = K.seg,
    ease = K.ease,
    setOpacity = K.setOpacity,
    sceneSvg = K.sceneSvg,
    polyPath = K.polyPath;

  var X = K.xColors;
  var C_ACCENT = X.accent,
    C_GOOD = X.good,
    C_BAD = X.bad,
    C_WARN = X.warn,
    C_MUTED = X.muted,
    C_BORDER = X.border,
    C_SURFACE = X.surface,
    C_SURFACE2 = X.surface2,
    C_INK = X.ink,
    C_INK2 = X.ink2;
  /* 全片统一：InEKF 绿、QEKF 红、真值灰虚线、估计值蓝 */
  var C_IN = C_GOOD, C_Q = C_BAD, C_TRUE = C_MUTED, C_EST = C_ACCENT;

  /* 这十二幕在视频里一幕要讲五十秒左右，画面不能停：draw(t, clock) 的 clock 是这一幕的真实时间
     （旁白比分镜长时 t 停在一段的末尾，clock 照走），走路、粒子、轨迹这类循环动作按 clock 画；网页播放器只传 t。
     出场 / 描线这类一次性动画的 seg(t, a, b) 不跨过 cue 时刻（3.6 / 7.0 / 10.4 / 13.4），免得视频里卡在半截。 */
  function nowOf(t, clock) {
    return clock == null ? t : clock;
  }
  function rectBox(parent, x, y, w, h, stroke, fill, dash) {
    var r = paint(svgEl('rect', { x: x, y: y, width: w, height: h, rx: 7, 'stroke-width': 1.3 }), fill || C_SURFACE, stroke || C_BORDER);
    if (dash) r.setAttribute('stroke-dasharray', dash);
    parent.appendChild(r);
    return r;
  }
  function group(parent) {
    var g = svgEl('g', {});
    parent.appendChild(g);
    return g;
  }
  function arrowPath(parent, pts, color, marker, dash, width) {
    var p = paint(svgEl('path', { d: polyPath(pts), fill: 'none', 'stroke-width': width || 1.6, 'marker-end': marker }), null, color);
    if (dash) p.setAttribute('stroke-dasharray', dash);
    parent.appendChild(p);
    return p;
  }
  function setArrow(p, pts) {
    p.setAttribute('d', polyPath(pts.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })));
  }
  function chip(parent, x, y, w, str, color, opts) {
    var o = opts || {};
    var g = group(parent);
    rectBox(g, x, y, w, o.h || 30, color, o.fill || C_SURFACE, o.dash);
    g.appendChild(svgRich(x + w / 2, y + (o.h || 30) / 2 + 4, str, { size: o.size || 11, anchor: 'middle', w: w - 8, cls: o.cls || 'demo-x-ink2' }));
    return g;
  }
  function pathLine(parent, pts, color, width, dash) {
    var p = paint(svgEl('path', { d: polyPath(pts.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })), fill: 'none', 'stroke-width': width || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }), null, color);
    if (dash) p.setAttribute('stroke-dasharray', dash);
    parent.appendChild(p);
    return p;
  }
  function setPath(p, pts) {
    p.setAttribute('d', pts.length ? polyPath(pts.map(function (q) { return [q[0].toFixed(1), q[1].toFixed(1)]; })) : 'M 0 0');
  }
  /* 按比例 u ∈ [0, 1] 把一条折线「画出来」 */
  function drawOn(path, u) {
    if (!path.lenCache) path.lenCache = path.getTotalLength ? path.getTotalLength() || 1 : 1;
    path.setAttribute('stroke-dasharray', path.lenCache + ' ' + path.lenCache);
    path.setAttribute('stroke-dashoffset', (path.lenCache * (1 - u)).toFixed(1));
  }
  function dotAt(parent, cx, cy, r, color) {
    var c = paint(svgEl('circle', { cx: cx, cy: cy, r: r }), color);
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
  /* 竖柱：底边固定在 yBase，高度随动画长；负值往下长 */
  function vbar(parent, x, yBase, w, color, opacity) {
    var r = paint(svgEl('rect', { x: x, y: yBase, width: w, height: 0, rx: 2.5, opacity: opacity == null ? 0.9 : opacity }), color);
    r.yBase = yBase;
    parent.appendChild(r);
    return r;
  }
  function setH(node, h) {
    if (h >= 0) { node.setAttribute('y', (node.yBase - h).toFixed(1)); node.setAttribute('height', h.toFixed(1)); }
    else { node.setAttribute('y', node.yBase.toFixed(1)); node.setAttribute('height', (-h).toFixed(1)); }
  }
  /* Cassie 的渲染图（Robot_Description_Gallery 按 UMich BipedLab 的开源 URDF 渲染，透明底），高 h 时宽 0.45h；
     机身是深灰，背后垫一层浅灰光晕（同 LCP 第 10 幕），深色主题下也看得清。
     mark(nx, ny) 把图上的归一化坐标换成画布坐标，用来标 IMU、弹簧、脚 */
  var CASSIE_IMG = { file: 'cassie.webp', aspect: 136 / 300, imu: [0.75, 0.11], hip: [0.38, 0.25], spring: [0.11, 0.63], footA: [0.31, 0.97], footB: [0.6, 0.9] };
  var haloSeq = 0;
  function cassie(parent, x, yBottom, h) {
    var w = h * CASSIE_IMG.aspect, g = group(parent);
    var root = parent.ownerSVGElement || parent, defs = root.querySelector('defs');
    if (!defs) { defs = svgEl('defs', {}); root.insertBefore(defs, root.firstChild); }
    var id = 'inekf-x-halo-' + (++haloSeq), halo = svgEl('radialGradient', { id: id });
    halo.appendChild(svgEl('stop', { offset: '0', 'stop-color': '#a3acb9', 'stop-opacity': '0.5' }));
    halo.appendChild(svgEl('stop', { offset: '1', 'stop-color': '#a3acb9', 'stop-opacity': '0' }));
    defs.appendChild(halo);
    g.appendChild(svgEl('ellipse', { cx: (x + w / 2).toFixed(1), cy: (yBottom - h * 0.5).toFixed(1), rx: (w * 0.72).toFixed(1), ry: (h * 0.58).toFixed(1), fill: 'url(#' + id + ')' }));
    var img = svgEl('image', { href: ROBOT_IMG_BASE + CASSIE_IMG.file, x: x.toFixed(1), y: (yBottom - h).toFixed(1), width: w.toFixed(1), height: h.toFixed(1), preserveAspectRatio: 'xMidYMax meet' });
    g.appendChild(img);
    return { g: g, w: w, h: h, mark: function (nn) { return [x + nn[0] * w, yBottom - h + nn[1] * h]; } };
  }
  /* 侧视的 Cassie 示意（面朝 +x）：骨盆是一个带坐标轴的圆角块（IMU 在里面），腿按 CASSIE_LEG 的真实连杆画（鸟腿，同真实世界人形行走那篇的
     Digit 下半身）：很短的大腿往前下、长小腿往后下、长跗骨再往前下落到三角形的脚上；跗骨方向 = 大腿方向偏 7°（achilles 平行四边形）。
     远侧那条腿淡一些。o.legH 是站直时髋到地面的像素数（1 m = legH / 0.916 px），o.bodySc 缩放骨盆。
     put(x, y, ang, feet, rigid)：骨盆中心 (x, y)、俯仰 ang（rad，图上逆时针为正）、feet = [[x, y, 着地?], …]（先近侧后远侧，给的是脚底在地上的点）；
     rigid 为真时脚也跟着骨盆转（第 4 幕把整个机器人当刚体转一下） */
  function cassieLegs(parent, color, dashed, opts) {
    var o = opts || {}, bs = o.bodySc || 1, LG = CASSIE_LEG;
    var M = (o.legH || 62) / LG.hipH, ws = Math.min(M / 70, 1.1);
    var L1 = LG.thigh * M, L2 = LG.shin * M, L3 = LG.tarsus * M, C = (LG.tarsusFromThighDeg * Math.PI) / 180, A0 = (LG.thighDeg * Math.PI) / 180;
    var g = group(parent);
    function bone(parentG, w) {
      var ln = paint(svgEl('line', { 'stroke-width': (dashed ? Math.max(1.6, w * ws * 0.5) : w * ws).toFixed(2), 'stroke-linecap': 'round' }), null, color);
      if (dashed) ln.setAttribute('stroke-dasharray', '4 3');
      parentG.appendChild(ln);
      return ln;
    }
    function leg(far) {
      var lg = group(g);
      if (far) lg.style.opacity = 0.45;
      var L = { shin: bone(lg, 3.6), tar: bone(lg, 3), thigh: bone(lg, 9) };
      L.foot = svgEl('path', { 'stroke-width': 1.2, 'stroke-linejoin': 'round' });
      if (dashed) { paint(L.foot, 'none', color); L.foot.setAttribute('stroke-dasharray', '3 2'); }
      else paint(L.foot, color, color);
      lg.appendChild(L.foot);
      L.dot = dotAt(lg, 0, 0, clamp(0.04 * M, 2.2, 3.6), color);
      return L;
    }
    var farLeg = leg(true);
    var body = svgEl('g', {});
    g.appendChild(body);
    var box = paint(svgEl('rect', { x: -22 * bs, y: -13 * bs, width: 44 * bs, height: 26 * bs, rx: 9 * bs, 'stroke-width': 2 }), C_SURFACE, color);
    if (dashed) box.setAttribute('stroke-dasharray', '4 3');
    body.appendChild(box);
    hline(body, 0, 0, 16 * bs, 0, color, 1.6);
    hline(body, 0, 0, 0, -16 * bs, color, 1.6);
    dotAt(body, 0, 0, 2.6, color);
    var nearLeg = leg(false);
    function rot(v, th) { return [v[0] * Math.cos(th) - v[1] * Math.sin(th), v[0] * Math.sin(th) + v[1] * Math.cos(th)]; }
    /* 大腿角 a（图上从 +x 顺时针量）定了，膝 K、跗骨关节 A 就定了；要求 |A − K| = 小腿长，一维求根，取离站立角最近的那个根 */
    function gap(H, J, a) {
      var K = [H[0] + L1 * Math.cos(a), H[1] + L1 * Math.sin(a)], b = a - C;
      var A = [J[0] - L3 * Math.cos(b), J[1] - L3 * Math.sin(b)];
      return { K: K, A: A, f: Math.hypot(A[0] - K[0], A[1] - K[1]) - L2 };
    }
    function solve(H, J, aRef) {
      var root = null, near = null, step = Math.PI / 90, prev = null;
      for (var a = aRef - 1.6; a <= aRef + 1.6 + 1e-9; a += step) {
        var cur = { a: a, f: gap(H, J, a).f };
        if (!near || Math.abs(cur.f) < Math.abs(near.f)) near = cur;
        if (prev && (prev.f <= 0) !== (cur.f <= 0)) {
          var lo = prev.a, hi = cur.a, flo = prev.f;
          for (var it = 0; it < 40; it++) {
            var mid = (lo + hi) / 2, fm = gap(H, J, mid).f;
            if ((fm <= 0) === (flo <= 0)) { lo = mid; flo = fm; } else hi = mid;
          }
          var r = (lo + hi) / 2;
          if (root == null || Math.abs(r - aRef) < Math.abs(root - aRef)) root = r;
        }
        prev = cur;
      }
      return gap(H, J, root == null ? near.a : root);
    }
    function pose(L, H, f, th) {
      var J = [f[0] + rot([0, -LG.footJointH * M], th)[0], f[1] + rot([0, -LG.footJointH * M], th)[1]];
      var q = solve(H, J, A0 + th), A = q.A, K = q.K;
      /* 小腿两端用解出来的点；跗骨从 A 连到脚关节 J（无解时 A 是最接近的那个，跗骨会略长一点） */
      setLine(L.thigh, H[0], H[1], K[0], K[1]);
      setLine(L.shin, K[0], K[1], A[0], A[1]);
      setLine(L.tar, A[0], A[1], J[0], J[1]);
      var heel = rot([-LG.heel * M, 0], th), toe = rot([LG.toe * M, 0], th);
      L.foot.setAttribute('d', 'M ' + J[0].toFixed(1) + ' ' + J[1].toFixed(1) + ' L ' + (f[0] + heel[0]).toFixed(1) + ' ' + (f[1] + heel[1]).toFixed(1) +
        ' L ' + (f[0] + toe[0]).toFixed(1) + ' ' + (f[1] + toe[1]).toFixed(1) + ' Z');
      moveDot(L.dot, f);
      L.dot.style.opacity = f[2] ? 1 : 0.35;
    }
    return {
      g: g, box: box,
      put: function (x, y, ang, feet, rigid) {
        body.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + ((-ang * 180) / Math.PI).toFixed(2) + ')');
        [nearLeg, farLeg].forEach(function (L, k) {
          var off = rot([k ? -2 * bs : 2 * bs, 12 * bs], -ang);
          pose(L, [x + off[0], y + off[1]], feet[k], rigid ? -ang : 0);
        });
      }
    };
  }
  /* 一段 0.3 m/s 的示意行走：返回身体位置与两只脚（u 是周期里的相位，步长 L 像素） */
  function walkPose(now, x0, ground, L, period) {
    var ph = now / period, k = Math.floor(ph), u = ph - k;
    var bodyX = x0 + (ph * L) / 2;
    var stanceX = x0 + (k * L) / 2 + L / 4, swingFrom = stanceX - L / 2, swingTo = stanceX + L / 2;
    var lift = Math.sin(Math.PI * u) * 12;
    var sw = [swingFrom + (swingTo - swingFrom) * ease(u), ground - lift, false];
    var st = [stanceX, ground, true];
    var feet = k % 2 ? [sw, st] : [st, sw];
    return { x: bodyX, y: ground - 78 + 3 * Math.cos(2 * Math.PI * u), ang: 0.04 * Math.sin(2 * Math.PI * u), feet: feet, k: k, u: u };
  }
  function fmtV(a, d) {
    return '(' + a.map(function (x) { return fmt(x, d); }).join(', ') + ')';
  }

  /* ── scene 1: 机器人怎样知道自己的姿态和速度 ── */
  function buildSceneWhy() {
    var s = sceneSvg('左边是 Cassie 双足机器人：控制器每一拍要知道身体的朝向、速度和位置，编码器只量关节。相机和激光雷达怕暗、怕烟、怕晃；IMU、编码器、接触开关几乎不会失效。只积分 IMU 很快漂走，只靠运动学噪声大，常见做法是用扩展卡尔曼滤波融合；EKF 在当前估计值处线性化，估计偏远了，切线就是错的。这篇用不变扩展卡尔曼滤波');
    s.appendChild(svgText(30, 28, '控制器每一拍都要问：我现在朝哪、走多快、在哪', 'demo-x-ink2', 13.5));
    /* 左：Cassie 和三个问号 */
    var left = group(s);
    rectBox(left, 30, 44, 220, 286, C_BORDER, C_SURFACE2);
    hline(left, 44, 296, 236, 296, C_BORDER, 1.4);
    var cs = cassie(left, 82, 296, 228);
    var imu = cs.mark(CASSIE_IMG.imu);
    var qs = [['朝向 $R$？', -64, -4], ['速度 $v$？', 40, 26], ['位置 $p$？', 40, -34]].map(function (q) {
      var g = group(left);
      g.appendChild(svgRich(imu[0] + q[1], imu[1] + q[2], q[0], { size: 11.5, anchor: 'middle', w: 110, cls: 'demo-x-acc' }));
      return g;
    });
    var imuDot = dotAt(left, imu[0], imu[1], 5, C_WARN);
    left.appendChild(svgText(140, 316, 'Cassie：20 自由度、10 个电机、4 根弹簧', 'demo-x-mut', 10, 'middle'));

    /* 中：要估什么 + 两类传感器 */
    var need = group(s);
    rectBox(need, 266, 44, 250, 120, C_ACCENT, C_SURFACE);
    need.appendChild(svgText(280, 64, '编码器直接量得到的：关节角', 'demo-x-mut', 10.5));
    need.appendChild(svgText(280, 84, '没有传感器能直接读的：', 'demo-x-ink2', 11.5));
    var needChips = ['身体的朝向（往哪歪）', '身体的速度（走多快）', '身体的位置（走到哪）'].map(function (str, k) {
      return chip(need, 280 + (k % 2) * 116, 94 + Math.floor(k / 2) * 34, 110, str, C_ACCENT, { h: 28, size: 10.5 });
    });
    var sens = group(s);
    rectBox(sens, 266, 176, 250, 154, C_BORDER, C_SURFACE2);
    var ext = group(sens);
    rectBox(ext, 278, 188, 226, 56, C_WARN, C_SURFACE, '4 3');
    ext.appendChild(paint(svgText(290, 208, '外部感知：相机、激光雷达', null, 11.5), C_WARN));
    ext.appendChild(svgText(290, 230, '怕暗、怕烟、怕晃；帧率也低', 'demo-x-mut', 10.5));
    var extX = hline(ext, 470, 196, 496, 236, C_BAD, 2.4);
    var prop = group(sens);
    rectBox(prop, 278, 254, 226, 66, C_GOOD, C_SURFACE);
    prop.appendChild(paint(svgText(290, 274, '本体感受：几乎不会失效', null, 11.5), C_GOOD));
    prop.appendChild(svgText(290, 294, 'IMU 800 Hz · 编码器 2000 Hz', 'demo-x-ink2', 10.5));
    prop.appendChild(svgText(290, 311, '弹簧压缩量当接触开关', 'demo-x-ink2', 10.5));

    /* 右上：漂移 */
    var drift = group(s);
    rectBox(drift, 532, 44, 238, 150, C_BORDER, C_SURFACE2);
    drift.appendChild(svgText(544, 62, '单用一种传感器会漂', 'demo-x-ink2', 11));
    var DX0 = 548, DX1 = 756, DY = 160;
    hline(drift, DX0, DY, DX1, DY, C_BORDER, 1);
    pathLine(drift, [[DX0, DY], [DX1, DY]], C_TRUE, 2, '5 4');
    var pImu = pathLine(drift, [], C_BAD, 2);
    var pKin = pathLine(drift, [], C_WARN, 1.6);
    var pFuse = pathLine(drift, [], C_GOOD, 2.2);
    drift.appendChild(paint(svgText(DX1, 80, '只积分 IMU', null, 10, 'end'), C_BAD));
    drift.appendChild(paint(svgText(DX1, 188, '只靠运动学', null, 10, 'end'), C_WARN));
    var fuseLab = paint(svgText(DX0, 188, '融合：EKF', null, 10.5), C_GOOD);
    drift.appendChild(fuseLab);

    /* 右下：在估计值处线性化 */
    var lin = group(s);
    rectBox(lin, 532, 204, 238, 126, C_BORDER, C_SURFACE2);
    lin.appendChild(svgText(544, 222, 'EKF：在当前估计值处线性化', 'demo-x-ink2', 11));
    function fcurve(x) { return 284 - 34 * Math.sin((x - 548) / 40) * Math.exp(-(x - 548) / 400); }
    var cpts = [];
    for (var xx = 548; xx <= 756; xx += 4) cpts.push([xx, fcurve(xx)]);
    pathLine(lin, cpts, C_INK2, 2);
    var xT = 590, xE = 690;
    function tangent(x0) {
      var sl = (fcurve(x0 + 0.5) - fcurve(x0 - 0.5));
      var L = 30 / Math.sqrt(1 + sl * sl);
      return [[x0 - L, fcurve(x0) - sl * L], [x0 + L, fcurve(x0) + sl * L]];
    }
    var tT = pathLine(lin, tangent(xT), C_IN, 2), tE = pathLine(lin, tangent(xE), C_Q, 2);
    var dT = dotAt(lin, xT, fcurve(xT), 4.5, C_IN), dE = dotAt(lin, xE, fcurve(xE), 4.5, C_Q);
    lin.appendChild(paint(svgText(xT, fcurve(xT) + 26, '真值处', null, 10, 'middle'), C_IN));
    var lE = paint(svgText(xE, 0, '估计值处（偏远了）', null, 10, 'middle'), C_Q);
    lin.appendChild(lE);

    /* 底：这一篇 */
    var plan = group(s);
    rectBox(plan, 30, 342, 740, 62, C_ACCENT, C_SURFACE);
    plan.appendChild(svgRich(46, 366, '这篇：**不变扩展卡尔曼滤波（InEKF）** —— 传感器和模型都不变，只换「误差」的定义，线性化就不再依赖估计值', { size: 12, w: 720, cls: 'demo-x-ink2' }));
    plan.appendChild(svgText(46, 392, 'Hartley 等 · 密歇根大学 · RSS 2018 会议版 → IJRR 2020 扩展版 · 平台：Cassie 双足', 'demo-x-mut', 10.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.8));
      cs.g.setAttribute('transform', 'translate(0 ' + (2 * Math.sin(now * 2.4)).toFixed(1) + ')');
      qs.forEach(function (g, k) { setOpacity(g, seg(t, 0.8 + k * 0.5, 1.2 + k * 0.5)); });
      imuDot.setAttribute('r', (4 + 1.5 * Math.sin(now * 4)).toFixed(1));
      setOpacity(need, seg(t, 0.4, 1.0));
      needChips.forEach(function (g, k) { setOpacity(g, seg(t, 1.0 + k * 0.4, 1.4 + k * 0.4)); });
      setOpacity(sens, seg(t, 3.6, 4.2));
      setOpacity(extX, seg(t, 4.6, 5.0));
      setOpacity(prop, seg(t, 5.4, 6.0));
      /* 漂移曲线按真实时间循环画：6 秒一轮 */
      setOpacity(drift, seg(t, 7.0, 7.6));
      var u = ((now - 7.0) % 6 + 6) % 6 / 6, imuPts = [], kinPts = [], fusePts = [];
      for (var i = 0; i <= 40; i++) {
        var f = (i / 40) * u, x = DX0 + f * (DX1 - DX0);
        imuPts.push([x, DY - 82 * f * f]);
        kinPts.push([x, DY + 14 * f + 3 * Math.sin(i * 1.7)]);
        fusePts.push([x, DY + 2 * Math.sin(i * 0.9)]);
      }
      setPath(pImu, imuPts); setPath(pKin, kinPts); setPath(pFuse, t >= 8.6 ? fusePts : []);
      setOpacity(fuseLab, seg(t, 8.6, 9.2));
      setOpacity(lin, seg(t, 10.4, 11.0));
      setOpacity(tT, seg(t, 11.2, 11.6));
      setOpacity(dT, seg(t, 11.0, 11.4));
      var wob = 6 * Math.sin(now * 1.3);
      moveDot(dE, [xE + wob, fcurve(xE + wob)]);
      lE.setAttribute('x', (xE + wob).toFixed(1)); lE.setAttribute('y', (fcurve(xE + wob) - 14).toFixed(1));
      setPath(tE, tangent(xE + wob));
      setOpacity(tE, seg(t, 11.8, 12.2));
      setOpacity(plan, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 2: IMU 往前推，脚踩住不动，运动学来校正 ── */
  function buildSceneSensors() {
    var s = sceneSvg('左边 Cassie 上标出三种传感器：躯干里的 IMU、关节编码器、腿上的弹簧当接触开关。右边是世界坐标下的示意：身体（IMU）的朝向、速度、位置，加上脚踩住的触地点。IMU 往前积分做预测，不确定性越来越大；触地点假设不动，允许一点打滑；正运动学测出脚相对身体的位置，把估计拉回来');
    s.appendChild(svgText(30, 28, '三种传感器各管一件事：IMU 往前推，脚踩住不动，运动学来校正', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 230, 290, C_BORDER, C_SURFACE2);
    hline(left, 44, 306, 246, 306, C_BORDER, 1.4);
    var cs = cassie(left, 40, 306, 228);
    var imu = cs.mark(CASSIE_IMG.imu), spr = cs.mark(CASSIE_IMG.spring), hip = cs.mark(CASSIE_IMG.hip), ft = cs.mark(CASSIE_IMG.footA);
    /* 标签都放在图的右边，用细线连到图上的位置 */
    var tags = [
      [imu, 'IMU · 800 Hz', C_WARN, 92],
      [hip, '编码器 · 2000 Hz', C_ACCENT, 146],
      [spr, '弹簧被压缩 = 落地', C_GOOD, 214],
      [ft, '触地点 $d$', C_GOOD, 286]
    ].map(function (q) {
      var g = group(left);
      dotAt(g, q[0][0], q[0][1], 5, q[2]);
      hline(g, q[0][0], q[0][1], 156, q[3] - 4, q[2], 1, '2 2');
      g.appendChild(svgRich(160, q[3], q[1], { size: 10.5, w: 100, cls: 'demo-x-ink2' }));
      return g;
    });

    /* 右：世界坐标下的示意 */
    var right = group(s);
    rectBox(right, 276, 44, 494, 236, C_BORDER, C_SURFACE2);
    right.appendChild(svgText(290, 62, '世界坐标（示意）', 'demo-x-mut', 10.5));
    var GY = 250;
    hline(right, 290, GY, 756, GY, C_BORDER, 1.4);
    var trueBody = cassieLegs(right, C_TRUE, true);
    var estBody = cassieLegs(right, C_EST, false);
    var ell = paint(svgEl('ellipse', { cx: 0, cy: 0, rx: 10, ry: 6, fill: 'none', 'stroke-width': 1.4, 'stroke-dasharray': '3 3' }), null, C_EST);
    right.appendChild(ell);
    var pin = group(right);
    var pinMark = paint(svgEl('path', { d: 'M 0 0 l -6 -12 l 12 0 z' }), C_GOOD);
    pin.appendChild(pinMark);
    var slip = paint(svgText(0, 0, '不动（允许一点打滑）', null, 10, 'middle'), C_GOOD);
    right.appendChild(slip);
    var fkMk = K.arrowMarker(s, 'inekf-x-arrow-fk', C_WARN);
    var fk = arrowPath(right, [[0, 0], [1, 1]], C_WARN, fkMk, null, 2.2);
    var vMk = K.arrowMarker(s, 'inekf-x-arrow-v', C_EST);
    var vArr = arrowPath(right, [[0, 0], [1, 1]], C_EST, vMk, null, 2);
    var stateLab = group(right);
    stateLab.appendChild(svgRich(290, 84, '状态：朝向 $R$、速度 $v$、位置 $p$（身体 = IMU），加上每个触地点 $d$', { size: 11, w: 470, cls: 'demo-x-ink2' }));
    var formula = group(right);
    formula.appendChild(svgMath(523, 118, 'h_p(\\tilde\\alpha) = R^{\\top}(d - p) + \\text{噪声}', { size: 15, anchor: 'middle', w: 400, cls: 'demo-x-warn' }));

    /* 底：循环 */
    var loop = group(s);
    rectBox(loop, 30, 346, 740, 60, C_ACCENT, C_SURFACE);
    var cy = 376, loopMk = K.arrowMarker(s, 'inekf-x-arrow-loop', C_ACCENT);
    var lc = [
      chip(loop, 46, cy - 16, 196, '① 预测：积分 IMU（捷联，不用动力学模型）', C_WARN, { h: 32, size: 10.5 }),
      chip(loop, 272, cy - 16, 196, '② 接触：脚不动 + 速度白噪声', C_GOOD, { h: 32, size: 10.5 }),
      chip(loop, 498, cy - 16, 256, '③ 校正：编码器 → 正运动学 → 脚在身体系的位置', C_WARN, { h: 32, size: 10.5 })
    ];
    arrowPath(loop, [[244, cy], [268, cy]], C_ACCENT, loopMk);
    arrowPath(loop, [[470, cy], [494, cy]], C_ACCENT, loopMk);
    var bloesch = group(s);
    rectBox(bloesch, 276, 288, 494, 46, C_ACCENT, C_SURFACE, '4 3');
    bloesch.appendChild(svgRich(290, 316, '这套拆法来自 Bloesch 的 QEKF（2012）；InEKF 不改传感器、不改模型，**只改误差怎么定义**', { size: 11, w: 470, cls: 'demo-x-ink2' }));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.8));
      tags.forEach(function (g, k) { setOpacity(g, seg(t, [3.8, 10.6, 7.2, 7.6][k], [4.2, 11.0, 7.6, 8.0][k])); });
      setOpacity(right, seg(t, 0.4, 1.0));
      setOpacity(stateLab, seg(t, 0.8, 1.4));
      /* 身体按 4 秒一个循环：前 2.4 秒只靠 IMU 往前推（估计慢慢偏、椭圆变大），之后运动学一校正就拉回 */
      var period = 4, n = Math.floor(now / period), u = (now % period) / period;
      var bx0 = 340 + (n % 4) * 90, bx = bx0 + 90 * u, footX = bx0 + 70, by = GY - 74;
      var drift = t >= 3.6 ? (u < 0.6 ? Math.pow(u / 0.6, 2) : Math.max(0, 1 - (u - 0.6) / 0.08)) : 0;
      trueBody.put(bx, by, 0, [[footX, GY, true], [bx - 30, GY - 8, false]]);
      var ex = bx + 28 * drift, ey = by - 10 * drift;
      estBody.put(ex, ey, 0.12 * drift, [[footX, GY, true], [ex - 30, ey + 66, false]]);
      ell.setAttribute('cx', ex.toFixed(1)); ell.setAttribute('cy', ey.toFixed(1));
      ell.setAttribute('rx', (8 + 30 * drift).toFixed(1)); ell.setAttribute('ry', (5 + 12 * drift).toFixed(1));
      setOpacity(ell, t >= 3.6 ? 0.9 : 0);
      setOpacity(trueBody.g, t >= 3.6 ? 0.8 : 0);
      setArrow(vArr, [[ex, ey], [ex + 46, ey]]);
      setOpacity(vArr, seg(t, 3.6, 4.2));
      pin.setAttribute('transform', 'translate(' + footX.toFixed(1) + ' ' + (GY - 4).toFixed(1) + ')');
      slip.setAttribute('x', footX.toFixed(1)); slip.setAttribute('y', (GY + 18).toFixed(1));
      setOpacity(pin, seg(t, 7.0, 7.4));
      setOpacity(slip, seg(t, 7.2, 7.6));
      var flash = u >= 0.6 && u < 0.75 ? 1 : 0.35;
      setArrow(fk, [[ex, ey + 8], [footX - 3, GY - 6]]);
      setOpacity(fk, t >= 10.4 ? flash : 0);
      setOpacity(formula, seg(t, 10.4, 11.0));
      setOpacity(loop, seg(t, 3.6, 4.2));
      lc.forEach(function (g, k) { setOpacity(g, seg(t, [3.6, 7.0, 10.4][k], [4.2, 7.6, 11.0][k])); });
      setOpacity(bloesch, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 3: 线性化点选错会怎样（第 4 节、第 6.1 节；具体实例第 2–4 步） ── */
  function buildSceneWrongLin() {
    var s = sceneSvg('左边 Cassie 站着不动，IMU 只读到重力。滤波器以为身体前倾了 0.1 弧度，用错的朝向把重力转到世界系，扣掉 g 后剩下约 0.98 m/s² 的假加速度，1 秒后估计速度约 0.98 m/s。右边对比真实的速度误差和 QEKF 在估计值处线性化的预测：0.1 弧度时竖直分量多算一倍，0.5 弧度时水平差 0.4、竖直差 1.15');
    s.appendChild(svgText(30, 28, '站着不动、朝向估错一点：线性化在哪儿出问题', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 300, 290, C_BORDER, C_SURFACE2);
    var GY = 250, CX = 150;
    hline(left, 44, GY, 316, GY, C_BORDER, 1.4);
    var trueB = cassieLegs(left, C_TRUE, true), estB = cassieLegs(left, C_Q, false);
    var mkG = K.arrowMarker(s, 'inekf-x-arrow-g', C_WARN), mkR = K.arrowMarker(s, 'inekf-x-arrow-res', C_Q);
    var aBody = arrowPath(left, [[0, 0], [1, 1]], C_WARN, mkG, null, 2.2);
    var aG = arrowPath(left, [[0, 0], [1, 1]], C_MUTED, K.arrowMarker(s, 'inekf-x-arrow-gw', C_MUTED), '4 3', 2);
    var aRes = arrowPath(left, [[0, 0], [1, 1]], C_Q, mkR, null, 2.6);
    var labA = group(left), labG = group(left), labR = group(left);
    labA.appendChild(svgRich(0, 0, '$\\bar R\\tilde a$', { size: 12, anchor: 'start', w: 60, cls: 'demo-x-warn' }));
    labG.appendChild(svgRich(0, 0, '$+g$', { size: 12, anchor: 'start', w: 50, cls: 'demo-x-mut' }));
    labR.appendChild(svgRich(0, 0, '假加速度', { size: 11, anchor: 'start', w: 70, cls: 'demo-x-bad' }));
    var angLab = svgRich(46, 284, '', { size: 11.5, w: 270, cls: 'demo-x-ink2' });
    left.appendChild(angLab);
    var velLab = svgRich(46, 312, '', { size: 11, w: 270, cls: 'demo-x-mut' });
    left.appendChild(velLab);

    /* 右：柱状对比（x、z 两个分量） */
    var right = group(s);
    rectBox(right, 346, 44, 424, 214, C_BORDER, C_SURFACE2);
    right.appendChild(svgRich(360, 64, '1 秒后的速度误差 $v - \\bar v$（m/s）', { size: 11.5, w: 400, cls: 'demo-x-ink2' }));
    var BY = 136, SC = 18; // 1 m/s = 18 px
    hline(right, 372, BY, 756, BY, C_BORDER, 1.2);
    var groups = [['水平 x', 430], ['竖直 z', 620]];
    var bars = groups.map(function (gq) {
      right.appendChild(svgText(gq[1] + 30, 246, gq[0], 'demo-x-mut', 10.5, 'middle'));
      var bT = vbar(right, gq[1] - 6, BY, 30, C_MUTED, 0.75), bQ = vbar(right, gq[1] + 36, BY, 30, C_Q, 0.85);
      var tT = svgText(gq[1] + 9, 0, '', 'demo-x-mut', 10, 'middle'), tQ = paint(svgText(gq[1] + 51, 0, '', null, 10, 'middle'), C_Q);
      right.appendChild(tT); right.appendChild(tQ);
      return { bT: bT, bQ: bQ, tT: tT, tQ: tQ };
    });
    var leg = group(right);
    rectBox(leg, 372, 74, 12, 10, C_MUTED, C_MUTED);
    leg.appendChild(svgText(390, 83, '真实误差', 'demo-x-mut', 10));
    rectBox(leg, 456, 74, 12, 10, C_Q, C_Q);
    leg.appendChild(paint(svgText(474, 83, 'QEKF 在估计值处线性化的预测', null, 10), C_Q));

    var eq = group(s);
    rectBox(eq, 346, 268, 424, 66, C_Q, C_SURFACE, '4 3');
    eq.appendChild(svgText(360, 288, 'QEKF 的误差方程里含着估计值：', 'demo-x-ink2', 11));
    eq.appendChild(svgMath(558, 316, 'A^{\\text{QEKF}}_t = A(\\,\\bar R_t,\\ \\tilde a_t,\\ \\tilde\\omega_t\\,)', { size: 15, anchor: 'middle', w: 400, cls: 'demo-x-bad' }));

    var sec4 = group(s);
    rectBox(sec4, 30, 346, 740, 60, C_ACCENT, C_SURFACE);
    sec4.appendChild(svgRich(46, 370, '第 4 节的例子：欧拉角的误差方程处处是估计值 → 换成旋转矩阵、误差定义成 $R^{\\top}\\bar R$，方程只剩 $\\dot\\xi = -(\\tilde\\omega)_\\times\\,\\xi$', { size: 11.5, w: 720, cls: 'demo-x-ink2' }));
    sec4.appendChild(svgText(46, 394, '估计值从方程里消失了 —— 这就是 InEKF 要推广到整个状态的那件事', 'demo-x-mut', 10.5));

    function draw(t) {
      setOpacity(left, seg(t, 0.2, 0.8));
      var th = t < 10.4 ? 0.1 : 0.1 + 0.4 * ease(seg(t, 10.4, 11.4));
      var by = GY - 74;
      trueB.put(CX, by, 0, [[CX + 2, GY, true], [CX + 12, GY, true]]);
      var tilt = t < 0.8 ? 0 : th * ease(seg(t, 0.8, 1.6));
      estB.put(CX, by, -tilt, [[CX + 2, GY, true], [CX + 12, GY, true]]);
      angLab.setText('滤波器以为前倾了 **' + fmt(th, 1) + ' rad**（约 ' + fmt((th * 180) / Math.PI, 0) + '°）');
      /* 读数 ã 沿机身的「上」：在估计的朝向下画出来，再加上 g（向下），剩下水平的假加速度 */
      var L = 112, up = [Math.sin(tilt), -Math.cos(tilt)];
      var x0 = CX, y0 = by - 4;
      var tip = [x0 + L * up[0], y0 + L * up[1]];
      setArrow(aBody, [[x0, y0], tip]);
      setArrow(aG, [tip, [tip[0], tip[1] + L]]);
      setArrow(aRes, [[x0, y0], [tip[0], y0 + (tip[1] + L - y0)]]);
      labA.setAttribute('transform', 'translate(' + (tip[0] + 6).toFixed(1) + ' ' + (tip[1] + 8).toFixed(1) + ')');
      labG.setAttribute('transform', 'translate(' + (tip[0] + 6).toFixed(1) + ' ' + (tip[1] + L / 2).toFixed(1) + ')');
      labR.setAttribute('transform', 'translate(' + (Math.max(tip[0], x0 + 20) + 8).toFixed(1) + ' ' + (y0 + 4).toFixed(1) + ')');
      setOpacity(aBody, seg(t, 1.6, 2.2));
      setOpacity(labA, seg(t, 1.6, 2.2));
      setOpacity(aG, seg(t, 3.6, 4.2));
      setOpacity(labG, seg(t, 3.6, 4.2));
      setOpacity(aRes, seg(t, 4.4, 5.0));
      setOpacity(labR, seg(t, 4.4, 5.0));
      var ex = t < 10.4 ? EX_SMALL : EX_BIG;
      velLab.setText(t < 3.6 ? 'IMU 读到的只有重力：$\\tilde a = (0, 0, 9.81)$' : '1 秒后估计速度 $\\bar v = ' + fmtV([ex.vbar[0], ex.vbar[2]], 3) + '$（x, z）');
      setOpacity(velLab, seg(t, 0.8, 1.4));
      setOpacity(right, seg(t, 5.4, 6.0));
      var grow = t < 10.4 ? ease(seg(t, 5.6, 6.6)) : 1;
      [0, 2].forEach(function (c, k) {
        var B = bars[k], a = ex.trueDv[c], b = t >= 7.0 ? ex.qekfDv[c] : 0;
        var gb = t >= 7.0 ? (t < 10.4 ? ease(seg(t, 7.0, 7.8)) : 1) : 0;
        setH(B.bT, a * SC * grow);
        setH(B.bQ, b * SC * gb);
        B.tT.textContent = fmt(a, 3);
        B.tT.setAttribute('y', (a >= 0 ? BY - a * SC * grow - 5 : BY - a * SC * grow + 12).toFixed(1));
        B.tQ.textContent = fmt(b, 3);
        B.tQ.setAttribute('y', (b >= 0 ? BY - b * SC * gb - 5 : BY - b * SC * gb + 12).toFixed(1));
        setOpacity(B.tQ, gb);
      });
      setOpacity(eq, seg(t, 7.0, 7.6));
      setOpacity(sec4, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 4: 一个矩阵装下全部状态 ── */
  function buildSceneMatrix() {
    var s = sceneSvg('把朝向、速度、位置和两个触地点拼成一个 7 乘 7 的矩阵：左上 3×3 是旋转，右边各列是速度、位置、两个触地点，右下是单位阵；这些矩阵相乘还是同一种矩阵，构成矩阵李群。误差也在群里定义：右不变误差是把真值整体挪到估计值的那一下。取对数后是 15 维的误差向量，加上 IMU 零偏再加 6 维');
    s.appendChild(svgRich(30, 28, '一个矩阵装下全部状态：$SE_{N+2}(3)$', { size: 13.5, w: 520, cls: 'demo-x-ink2' }));
    /* 左：7×7 的块矩阵（两只脚着地） */
    var mat = group(s);
    var MX = 46, MY = 54, CW = 38, CH = 30;
    rectBox(mat, 30, 44, 330, 286, C_BORDER, C_SURFACE2);
    var cols = [['R', 3, C_ACCENT], ['v', 1, C_WARN], ['p', 1, C_GOOD], ['d_1', 1, C_INK2], ['d_2', 1, C_INK2]];
    var blocks = [];
    var cx0 = MX;
    cols.forEach(function (c, k) {
      var g = group(mat);
      var w = c[1] * CW;
      rectBox(g, cx0, MY, w - 3, 3 * CH - 3, c[2], C_SURFACE);
      g.appendChild(svgMath(cx0 + w / 2 - 1.5, MY + 1.5 * CH + 3, c[0], { size: 17, anchor: 'middle', w: w, cls: k ? 'demo-x-ink2' : 'demo-x-acc' }));
      blocks.push(g);
      cx0 += w;
    });
    /* 下面四行：0 … 0 | 单位阵 */
    var low = group(mat);
    for (var r = 0; r < 4; r++) {
      low.appendChild(svgText(MX + 1.5 * CW, MY + (3 + r) * CH + 20, '0  0  0', 'demo-x-mut', 11, 'middle'));
      for (var c2 = 0; c2 < 4; c2++) {
        low.appendChild(svgText(MX + (3 + c2) * CW + CW / 2 - 1.5, MY + (3 + r) * CH + 20, r === c2 ? '1' : '0', r === c2 ? 'demo-x-ink2' : 'demo-x-mut', 12, 'middle'));
      }
    }
    var sizeLab = group(mat);
    sizeLab.appendChild(svgRich(MX, 300, '$N$ 个触地点：$(N+5)\\times(N+5)$；两只脚着地是 7 × 7', { size: 11, w: 300, cls: 'demo-x-mut' }));
    sizeLab.appendChild(svgText(MX, 320, '右边每多一列，就多一个要估的点', 'demo-x-mut', 10.5));

    /* 右上：相乘还是同一种矩阵 */
    var grp = group(s);
    rectBox(grp, 376, 44, 394, 76, C_ACCENT, C_SURFACE);
    grp.appendChild(svgRich(390, 66, '相乘、求逆都还是这种矩阵 → 一个**矩阵李群**', { size: 11.5, w: 370, cls: 'demo-x-ink2' }));
    grp.appendChild(svgText(390, 90, '比 SE(3)（朝向 + 位置）多带了 N + 1 列：速度、各个触地点', 'demo-x-mut', 10.5));
    grp.appendChild(svgText(390, 108, '「一步变换」= 先转、再把每一列平移', 'demo-x-mut', 10.5));

    /* 右中：右不变误差 —— 把真值整体挪到估计值 */
    var err = group(s);
    rectBox(err, 376, 130, 394, 136, C_BORDER, C_SURFACE2);
    err.appendChild(svgMath(470, 152, '\\eta_t = \\bar X_t\\,X_t^{-1}', { size: 15, anchor: 'middle', w: 180, cls: 'demo-x-acc' }));
    err.appendChild(svgText(560, 152, '右不变误差：在世界坐标里量', 'demo-x-ink2', 10.5));
    var ORIG = [420, 236];
    dotAt(err, ORIG[0], ORIG[1], 3, C_MUTED);
    err.appendChild(svgText(ORIG[0], ORIG[1] + 18, '世界原点', 'demo-x-mut', 9.5, 'middle'));
    var FIG4 = { legH: 31, bodySc: 0.75 };
    var tB = cassieLegs(err, C_TRUE, true, FIG4), eB = cassieLegs(err, C_EST, false, FIG4);
    var swing = paint(svgEl('path', { fill: 'none', 'stroke-width': 1.4, 'stroke-dasharray': '3 3' }), null, C_EST);
    err.appendChild(swing);
    err.appendChild(paint(svgText(756, 256, '整体转 + 挪一下', null, 10, 'end'), C_EST));

    /* 右下：误差向量的维数 */
    var dims = group(s);
    rectBox(dims, 376, 276, 394, 54, C_BORDER, C_SURFACE2);
    dims.appendChild(svgRich(390, 294, '取对数 → 误差向量 $\\xi$：$3N+9$ 维（两只脚 15 维，加零偏 21 维）', { size: 11, w: 370, cls: 'demo-x-ink2' }));
    var segs = [['旋转', 3, C_ACCENT], ['速度', 3, C_WARN], ['位置', 3, C_GOOD], ['脚 1', 3, C_INK2], ['脚 2', 3, C_INK2], ['零偏', 6, C_MUTED]];
    var sx = 390, segNodes = [];
    segs.forEach(function (q) {
      var w = q[1] * 15;
      var g = group(dims);
      g.appendChild(paint(svgEl('rect', { x: sx, y: 306, width: w - 2, height: 16, rx: 3, opacity: 0.75 }), q[2]));
      g.appendChild(svgText(sx + w / 2 - 1, 318, q[0], 'demo-x-ink', 9.5, 'middle'));
      segNodes.push(g);
      sx += w;
    });

    /* 底：QEKF vs InEKF 的误差 */
    var cmp = group(s);
    rectBox(cmp, 30, 342, 740, 64, C_ACCENT, C_SURFACE);
    cmp.appendChild(svgRich(46, 364, '**QEKF**：误差逐项相减 $v-\\bar v$、$p-\\bar p$，朝向单独用四元数乘 —— 各管各的', { size: 11.5, w: 720, cls: 'demo-x-bad' }));
    cmp.appendChild(svgRich(46, 390, '**InEKF**：$\\eta$ 把它们绑在一起 —— 朝向一偏，速度、位置、触地点的误差跟着一起转', { size: 11.5, w: 720, cls: 'demo-x-good' }));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(mat, seg(t, 0.2, 0.6));
      blocks.forEach(function (g, k) { setOpacity(g, seg(t, 0.5 + k * 0.5, 0.9 + k * 0.5)); });
      setOpacity(low, seg(t, 3.0, 3.5));
      setOpacity(sizeLab, seg(t, 3.0, 3.5));
      setOpacity(grp, seg(t, 3.6, 4.2));
      setOpacity(err, seg(t, 7.0, 7.6));
      /* 真值不动；估计值 = 真值绕世界原点转 ψ 再平移一点（ψ 来回摆） */
      var psi = 0.28 + 0.08 * Math.sin(now * 1.2);
      var P0 = [520, 212], F1 = [P0[0] + 3, P0[1] + 40], F2 = [P0[0] + 11, P0[1] + 40];
      tB.put(P0[0], P0[1], 0, [[F1[0], F1[1], true], [F2[0], F2[1], true]]);
      function rotAbout(q) {
        var dx = q[0] - ORIG[0], dy = q[1] - ORIG[1], c = Math.cos(-psi), sn = Math.sin(-psi);
        return [ORIG[0] + c * dx - sn * dy + 40, ORIG[1] + sn * dx + c * dy - 6];
      }
      var b2 = rotAbout(P0), f1 = rotAbout(F1), f2 = rotAbout(F2);
      eB.put(b2[0], b2[1], psi, [[f1[0], f1[1], true], [f2[0], f2[1], true]], true);
      swing.setAttribute('d', 'M ' + P0[0] + ' ' + P0[1] + ' Q ' + ((P0[0] + b2[0]) / 2 + 10).toFixed(1) + ' ' + ((P0[1] + b2[1]) / 2 + 20).toFixed(1) + ' ' + b2[0].toFixed(1) + ' ' + b2[1].toFixed(1));
      setOpacity(dims, seg(t, 10.4, 11.0));
      segNodes.forEach(function (g, k) { setOpacity(g, seg(t, 10.6 + k * 0.4, 11.0 + k * 0.4)); });
      setOpacity(cmp, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 5: 误差不看轨迹：对数线性（定理 1、2；图 4、5） ── */
  function buildSceneLogLinear() {
    var s = sceneSvg('左上两块：两条完全不同的真实轨迹，估计值都是真值绕原点转了同一个角度，误差向量一模一样、一直不变。右上是误差方程，A 是常数，只含重力。中间是站立的例子：0.1 弧度的俯仰误差，1 秒后线性误差过一次指数映射，和滤波器自己的预测一位不差。下面是图 4：初始误差放大时，QEKF 的线性预测越错越多，InEKF 一直是 0');
    s.appendChild(svgText(30, 28, '误差的演化和轨迹无关，线性方程还是精确的', 'demo-x-ink2', 13.5));
    /* 左上：两条不同轨迹 */
    var trk = group(s);
    rectBox(trk, 30, 44, 360, 150, C_BORDER, C_SURFACE2);
    var panes = [[40, '走直线'], [212, '转弯']];
    var trackers = panes.map(function (pq, k) {
      var g = group(trk);
      g.appendChild(svgText(pq[0] + 6, 62, pq[1], 'demo-x-mut', 10));
      var O = [pq[0] + 16, 178];
      dotAt(g, O[0], O[1], 2.5, C_MUTED);
      var pts = [];
      for (var i = 0; i <= 40; i++) {
        var u = i / 40;
        pts.push(k === 0 ? [O[0] + 150 * u, O[1] - 20 - 10 * u] : [O[0] + 70 + 60 * Math.sin(u * 2.4), O[1] - 10 - 100 * u + 30 * u * u]);
      }
      function rot(q, a) { var dx = q[0] - O[0], dy = q[1] - O[1]; return [O[0] + Math.cos(a) * dx + Math.sin(a) * dy, O[1] - Math.sin(a) * dx + Math.cos(a) * dy]; }
      pathLine(g, pts, C_TRUE, 1.6, '4 3');
      var est = pathLine(g, pts.map(function (q) { return rot(q, 0.22); }), C_EST, 2);
      var dT = dotAt(g, 0, 0, 4, C_TRUE), dE = dotAt(g, 0, 0, 4, C_EST);
      return { pts: pts, rot: rot, dT: dT, dE: dE, est: est };
    });
    var xiBars = group(trk);
    xiBars.appendChild(svgRich(46, 190, '两边的误差 $\\xi$ 一样，而且一直不变', { size: 10.5, w: 300, cls: 'demo-x-acc' }));

    /* 右上：A 是常数 */
    var eqg = group(s);
    rectBox(eqg, 406, 44, 364, 150, C_ACCENT, C_SURFACE);
    eqg.appendChild(svgText(420, 64, '定理 1：群仿射 → 误差的演化与轨迹无关', 'demo-x-ink2', 11));
    eqg.appendChild(svgText(420, 82, '定理 2：对数误差满足线性方程，而且是精确的', 'demo-x-ink2', 11));
    var Aeq = group(eqg);
    Aeq.appendChild(svgMath(588, 140, '\\dot\\xi = A\\,\\xi,\\quad A=\\begin{bmatrix}0&0&0&0\\\\(g)_\\times&0&0&0\\\\0&I&0&0\\\\0&0&0&0\\end{bmatrix}', { size: 14, anchor: 'middle', w: 350, h: 100, cls: 'demo-x-ink2' }));
    eqg.appendChild(svgText(756, 186, 'A 里只有重力 g，没有估计值', 'demo-x-good', 10.5, 'end'));

    /* 中：站立例子的数 */
    var num = group(s);
    rectBox(num, 30, 204, 360, 126, C_BORDER, C_SURFACE2);
    num.appendChild(svgText(44, 222, '站立例子：俯仰错 0.1 rad，传 1 秒', 'demo-x-ink2', 11));
    var nl = [
      ['线性误差：', '$\\xi_v = (0.981,\\ 0,\\ 0)$，$\\xi_p = (0.4905,\\ 0,\\ 0)$', C_INK2],
      ['过一次指数映射：', '速度 $' + fmtV(EX_SMALL.inekfV, 4) + '$', C_IN],
      ['滤波器自己积分：', '速度 $' + fmtV(EX_SMALL.vbar, 4) + '$', C_EST]
    ].map(function (q, k) {
      var g = group(num);
      g.appendChild(svgText(44, 248 + k * 26, q[0], 'demo-x-mut', 10.5));
      g.appendChild(svgRich(150, 248 + k * 26, q[1], { size: 10.5, w: 236, cls: k === 1 ? 'demo-x-good' : 'demo-x-ink2' }));
      return g;
    });
    var tick = paint(svgText(376, 316, '一位不差', null, 11, 'end'), C_IN);
    num.appendChild(tick);

    /* 右下：图 4 */
    var fig = group(s);
    rectBox(fig, 406, 204, 364, 126, C_BORDER, C_SURFACE2);
    fig.appendChild(svgText(420, 222, '图 4：初始朝向误差放大，传 1 秒后的线性化误差（读图）', 'demo-x-ink2', 10.5));
    var FX0 = 436, FX1 = 756, FY0 = 316, FY1 = 236;
    hline(fig, FX0, FY0, FX1, FY0, C_BORDER, 1);
    hline(fig, FX0, FY1, FX0, FY0, C_BORDER, 1);
    fig.appendChild(svgText(FX0 - 4, FY1 + 4, '25', 'demo-x-mut', 9, 'end'));
    fig.appendChild(svgText(FX0 - 4, FY0 + 3, '0', 'demo-x-mut', 9, 'end'));
    fig.appendChild(svgText(FX1, FY0 + 12, '初始误差缩放 0 → 1（π/2 × 3 轴）', 'demo-x-mut', 9, 'end'));
    var qPath = pathLine(fig, [], C_Q, 2), iPath = pathLine(fig, [], C_IN, 2.2, '6 4');
    var qLab = paint(svgText(FX1 - 4, FY1 - 2, 'QEKF ≈ 25', null, 10, 'end'), C_Q);
    var iLab = paint(svgText(FX1 - 4, FY0 - 6, 'InEKF = 0', null, 10, 'end'), C_IN);
    fig.appendChild(qLab); fig.appendChild(iLab);
    var noise = group(fig);
    noise.appendChild(paint(svgText(FX0 + 6, FY1 + 12, '图 5（读数带噪声）：InEKF 不再是 0，但仍小得多', null, 9.5), C_WARN));

    var rngF = mulberry32(42), jit = [];
    for (var j = 0; j <= 60; j++) jit.push(gauss(rngF));
    function figPts(u, isQ, noisy) {
      var pts = [];
      for (var i = 0; i <= 60 * u; i++) {
        var x = i / 60, y;
        if (isQ) y = FIG4_READ.qekf * Math.pow(x, 1.9) + 0.9 * x * jit[i];
        else y = noisy ? 2 * x * x + 0.4 * x * Math.abs(jit[i]) : 0;
        pts.push([FX0 + x * (FX1 - FX0), FY0 - (Math.max(0, y) / FIG4_READ.qekf) * (FY0 - FY1)]);
      }
      return pts;
    }

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(trk, seg(t, 0.2, 0.8));
      trackers.forEach(function (tr) {
        var u = (now / 5) % 1, i = Math.floor(u * 40);
        moveDot(tr.dT, tr.pts[i]);
        moveDot(tr.dE, tr.rot(tr.pts[i], 0.22));
      });
      setOpacity(xiBars, seg(t, 1.6, 2.2));
      setOpacity(eqg, seg(t, 3.6, 4.2));
      setOpacity(num, seg(t, 7.0, 7.6));
      nl.forEach(function (g, k) { setOpacity(g, seg(t, 7.2 + k * 0.8, 7.6 + k * 0.8)); });
      setOpacity(tick, seg(t, 9.6, 10.0));
      setOpacity(fig, seg(t, 10.4, 11.0));
      var noisy = t >= 13.4;
      setPath(qPath, figPts(ease(seg(t, 10.6, 12.2)), true));
      setPath(iPath, figPts(ease(seg(t, 10.6, 12.2)), false, noisy));
      setOpacity(qLab, seg(t, 12.0, 12.4));
      setOpacity(iLab, noisy ? 0 : seg(t, 12.0, 12.4));
      setOpacity(noise, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 6: 正运动学校正：H 是常数（第 5.3 节；第 10–11 节的左 / 右不变） ── */
  function buildSceneUpdate() {
    var s = sceneSvg('左边：腿测出来的脚的位置比估计的远 2 厘米，新息指向缺口；校正时身体往回挪 1 厘米、脚往前挪 1 厘米，缺口合上（放大 10 倍画）。右边：InEKF 的观测矩阵 H 是常数 0、0、负单位阵、单位阵；QEKF 的 H 里有估计值。下面：协方差用 Joseph 形式更新；换成机器人中心的写法，同一个测量变成左不变观测，两种误差用伴随矩阵互换');
    s.appendChild(svgText(30, 28, '正运动学来校正：新息只看不变误差，H 是常数', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 360, 290, C_BORDER, C_SURFACE2);
    left.appendChild(svgText(44, 62, '世界坐标，侧视（位移放大 10 倍画）', 'demo-x-mut', 10));
    var GY = 286, SCL = 210; // 1 m = 210 px
    var O = [96, GY];
    hline(left, 44, GY, 376, GY, C_BORDER, 1.4);
    function W(p3, mag) { return [O[0] + p3[0] * SCL * (mag || 1), O[1] - p3[2] * SCL * (mag || 1)]; }
    var bodyB = cassieLegs(left, C_EST, false, { legH: UPD.p[2] * SCL - 12 * 1.3, bodySc: 1.3 });
    var footD = dotAt(left, 0, 0, 6, C_GOOD);
    var mkM = K.arrowMarker(s, 'inekf-x-arrow-meas', C_WARN), mkZ = K.arrowMarker(s, 'inekf-x-arrow-z', C_Q);
    var meas = arrowPath(left, [[0, 0], [1, 1]], C_WARN, mkM, null, 2.2);
    var innov = arrowPath(left, [[0, 0], [1, 1]], C_Q, mkZ, null, 2.4);
    var labs = group(left);
    var lbMeas = svgRich(0, 0, '腿测出来的 $\\bar R h_p$', { size: 10.5, w: 140, cls: 'demo-x-warn' });
    var lbFoot = svgRich(0, 0, '估计的脚 $\\bar d$', { size: 10.5, w: 120, cls: 'demo-x-good' });
    var lbZ = svgRich(0, 0, '新息：差 2 cm', { size: 10.5, w: 110, cls: 'demo-x-bad' });
    [lbMeas, lbFoot, lbZ].forEach(function (n) { labs.appendChild(n); });
    var numbers = group(left);
    numbers.appendChild(svgRich(44, 316, 'x、z 两轴：身体各挪 $' + fmt(UPD_EX.dp[0] * 100, 3) + '$ cm，脚各挪 $+' + fmt(UPD_EX.dd[0] * 100, 3) + '$ cm，缺口合上', { size: 10.5, w: 330, cls: 'demo-x-ink2' }));

    var right = group(s);
    rectBox(right, 406, 44, 364, 182, C_BORDER, C_SURFACE2);
    right.appendChild(svgText(420, 64, '运动学测的是「脚相对身体」：', 'demo-x-ink2', 11));
    right.appendChild(svgMath(588, 92, 'Y = X^{-1} b + V', { size: 15, anchor: 'middle', w: 300, cls: 'demo-x-ink2' }));
    right.appendChild(svgText(756, 112, '右不变观测（Barrau & Bonnabel 的定义）', 'demo-x-mut', 10, 'end'));
    var hIn = group(right);
    hIn.appendChild(svgText(420, 144, 'InEKF：', 'demo-x-good', 11));
    var cellW = 54;
    ['0', '0', '-I', 'I'].forEach(function (c, k) {
      rectBox(hIn, 476 + k * cellW, 128, cellW - 4, 26, C_GOOD, C_SURFACE);
      hIn.appendChild(svgMath(476 + k * cellW + (cellW - 4) / 2, 146, c, { size: 13, anchor: 'middle', w: cellW, cls: 'demo-x-good' }));
    });
    hIn.appendChild(svgText(700, 146, '常数', 'demo-x-good', 10.5));
    var hQ = group(right);
    hQ.appendChild(svgText(420, 184, 'QEKF：', 'demo-x-bad', 11));
    hQ.appendChild(svgMath(600, 186, '\\big[\\,(\\bar R^{\\top}(\\bar d-\\bar p))_\\times,\\ 0,\\ -\\bar R^{\\top},\\ \\bar R^{\\top}\\big]', { size: 12.5, anchor: 'middle', w: 300, cls: 'demo-x-bad' }));
    hQ.appendChild(svgText(756, 214, '含估计值', 'demo-x-bad', 10.5, 'end'));

    var jos = group(s);
    rectBox(jos, 406, 236, 364, 98, C_BORDER, C_SURFACE2);
    jos.appendChild(svgRich(420, 258, '更新：$\\bar X^{+} = \\exp(K\\,\\Pi\\,\\bar X Y)\\,\\bar X$', { size: 11.5, w: 340, cls: 'demo-x-ink2' }));
    jos.appendChild(svgText(420, 282, '协方差：扩展版用 Joseph 形式（式 19）', 'demo-x-ink2', 10.5));
    jos.appendChild(svgText(420, 300, '会议版写的是 (I − KH)P', 'demo-x-mut', 10.5));
    jos.appendChild(svgText(420, 320, '官方 C++ 库 Correct() 里就是 Joseph 那一行', 'demo-x-mut', 10.5));

    var lr = group(s);
    rectBox(lr, 30, 346, 740, 60, C_ACCENT, C_SURFACE);
    lr.appendChild(svgRich(46, 368, '**世界中心**：运动学是右不变观测 → 用右不变误差。**机器人中心**（状态取逆）：同一个测量变成左不变观测；GPS 也是左不变观测', { size: 11, w: 720, cls: 'demo-x-ink2' }));
    lr.appendChild(svgRich(46, 392, '两种误差用伴随矩阵精确互换：$P^{r} = \\mathrm{Ad}_{\\bar X}\\,P^{l}\\,\\mathrm{Ad}_{\\bar X}^{\\top}$（第 10.1 节）', { size: 11, w: 720, cls: 'demo-x-mut' }));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.8));
      /* 7.0 之后反复演示一次校正：3 秒一轮，前 1.2 秒是缺口，之后合上 */
      var u = t >= 7.0 ? ((now - 7.0) % 3) / 3 : 0, k = t >= 7.0 ? ease(clamp((u - 0.4) / 0.3, 0, 1)) : 0;
      var MAG = 10;
      var pNow = [UPD.p[0] + k * UPD_EX.dp[0] * MAG, 0, UPD.p[2] + k * UPD_EX.dp[2] * MAG];
      var dNow = [UPD.d[0] + k * UPD_EX.dd[0] * MAG, 0, UPD.d[2] + k * UPD_EX.dd[2] * MAG];
      var bp = W(pNow), dp = W(dNow);
      bodyB.put(bp[0], bp[1], 0, [[dp[0], dp[1], true], [bp[0] - 26, GY - 40, false]]);
      moveDot(footD, dp);
      /* 测量：从身体出发的 R̄h（h 比估计长 2 cm，放大 10 倍） */
      var hEnd = [pNow[0] + (UPD.h[0] + (UPD.h[0] - (UPD.d[0] - UPD.p[0])) * (MAG - 1)), 0, pNow[2] + (UPD.h[2] + (UPD.h[2] - (UPD.d[2] - UPD.p[2])) * (MAG - 1))];
      var he = W(hEnd);
      setArrow(meas, [[bp[0], bp[1] + 6], he]);
      setArrow(innov, [dp, [dp[0] + (he[0] - dp[0]) * 0.92, dp[1] + (he[1] - dp[1]) * 0.92]]);
      setOpacity(meas, seg(t, 0.8, 1.4));
      setOpacity(innov, t >= 3.6 ? (1 - k) : 0);
      lbMeas.setX(he[0] + 6); lbMeas.setY(he[1] - 4);
      lbFoot.setX(dp[0] - 92); lbFoot.setY(dp[1] - 10);
      lbZ.setX(dp[0] + 40); lbZ.setY(dp[1] + 2);
      setOpacity(lbMeas, seg(t, 0.8, 1.4));
      setOpacity(lbFoot, seg(t, 0.8, 1.4));
      setOpacity(lbZ, t >= 3.6 ? 1 - k : 0);
      setOpacity(numbers, seg(t, 7.0, 7.6));
      setOpacity(right, seg(t, 0.4, 1.0));
      setOpacity(hIn, seg(t, 3.6, 4.2));
      setOpacity(hQ, seg(t, 5.0, 5.6));
      setOpacity(jos, seg(t, 10.4, 11.0));
      setOpacity(lr, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 7: 看不见的方向：航向与绝对位置（第 5.4 节；具体实例第 7 步） ── */
  function buildSceneObservability() {
    var s = sceneSvg('左边俯视：把机器人连同两个脚印整体平移，或绕竖直轴旋转，IMU 和腿测到的读数一模一样，这 4 个方向看不见。右边是可观性矩阵：位置和触地点两大列只差符号，旋转那一块的第 3 列全是 0。单脚 12 维里秩为 8。右下比较：真系统 4 个方向不可观，InEKF 也是 4 个；QEKF 在抖动的估计值处线性化，只剩 3 个，航向被假装看见了');
    s.appendChild(svgText(30, 28, '看不见的方向：航向与绝对位置，InEKF 老实承认', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 330, 290, C_BORDER, C_SURFACE2);
    left.appendChild(svgText(44, 62, '俯视（示意）', 'demo-x-mut', 10));
    var O = [195, 190];
    dotAt(left, O[0], O[1], 2.5, C_MUTED);
    left.appendChild(svgText(O[0] + 6, O[1] + 14, '世界原点', 'demo-x-mut', 9.5));
    function robotTop(color, dashed) {
      var g = group(left);
      var tri = paint(svgEl('path', { d: 'M 22 0 L -12 -13 L -12 13 Z', 'stroke-width': 2 }), C_SURFACE, color);
      if (dashed) tri.setAttribute('stroke-dasharray', '4 3');
      g.appendChild(tri);
      var f1 = dotAt(g, -4, -26, 5, color), f2 = dotAt(g, 10, 24, 5, color);
      if (dashed) { f1.style.opacity = 0.7; f2.style.opacity = 0.7; }
      return g;
    }
    var real = robotTop(C_EST, false), ghost = robotTop(C_MUTED, true);
    var modeLab = svgRich(44, 300, '', { size: 11, w: 300, cls: 'demo-x-acc' });
    left.appendChild(modeLab);
    var reads = group(left);
    reads.appendChild(svgRich(44, 322, 'IMU 读数、腿的读数：**一模一样** ✓', { size: 10.5, w: 300, cls: 'demo-x-good' }));

    var right = group(s);
    rectBox(right, 376, 44, 394, 214, C_BORDER, C_SURFACE2);
    right.appendChild(svgRich(390, 64, '可观性矩阵 $O = [\\,H;\\ H\\Phi;\\ H\\Phi^{2};\\ \\cdots]$（单脚，12 列）', { size: 11, w: 370, cls: 'demo-x-ink2' }));
    var GX = 436, GY0 = 84, CWb = 80, RH = 34;
    var colNames = ['R', 'v', 'p', 'd'], cells = [
      ['0', '0', '-I', 'I'],
      ['-\\tfrac12(g)_\\times\\Delta t^2', '-I\\Delta t', '-I', 'I'],
      ['-2(g)_\\times\\Delta t^2', '-2I\\Delta t', '-I', 'I']
    ];
    var rowNames = ['H', 'H\\Phi', 'H\\Phi^2'];
    colNames.forEach(function (c, k) {
      right.appendChild(svgMath(GX + k * CWb + CWb / 2, GY0 + 4, c, { size: 13, anchor: 'middle', w: CWb, cls: 'demo-x-mut' }));
    });
    var hiCols = [group(right), group(right)];
    rectBox(hiCols[0], GX + 2 * CWb + 2, GY0 + 12, 2 * CWb - 4, 3 * RH + 4, C_Q, 'none', '4 3');
    rectBox(hiCols[1], GX + 0.66 * CWb, GY0 + 12, CWb * 0.34, 3 * RH + 4, C_WARN, 'none', '4 3');
    cells.forEach(function (row, r) {
      right.appendChild(svgMath(GX - 24, GY0 + 34 + r * RH, rowNames[r], { size: 12, anchor: 'middle', w: 60, cls: 'demo-x-mut' }));
      row.forEach(function (c, k) {
        right.appendChild(svgMath(GX + k * CWb + CWb / 2, GY0 + 34 + r * RH, c, { size: 11.5, anchor: 'middle', w: CWb + 10, cls: 'demo-x-ink2' }));
      });
    });
    var noteT = group(right), noteY = group(right);
    noteT.appendChild(paint(svgText(756, 222, 'p、d 两大列符号相反 → 平移看不见（3 维）', null, 10.5, 'end'), C_Q));
    noteY.appendChild(svgRich(390, 244, '$(g)_\\times$ 的第 3 列是 0（g 只有 z 分量）→ 航向看不见（1 维）', { size: 10.5, w: 370, cls: 'demo-x-warn' }));

    var meter = group(s);
    rectBox(meter, 376, 268, 394, 66, C_BORDER, C_SURFACE2);
    var rowsM = [['非线性系统本身', 4, C_MUTED], ['InEKF（秩 8 / 12）', 4, C_IN], ['QEKF（估计值处线性化，玩具）', 3, C_Q]];
    var mBars = rowsM.map(function (q, k) {
      var y = 282 + k * 18;
      meter.appendChild(svgText(390, y + 4, q[0], 'demo-x-ink2', 10));
      var bs = [];
      for (var i = 0; i < 4; i++) bs.push(paint(svgEl('rect', { x: 590 + i * 34, y: y - 6, width: 30, height: 12, rx: 2 }), i < q[1] ? q[2] : 'none', q[2]));
      bs.forEach(function (b) { meter.appendChild(b); });
      meter.appendChild(svgText(736, y + 4, q[1] + ' 维', 'demo-x-mut', 10));
      return bs;
    });

    var oc = group(s);
    rectBox(oc, 30, 346, 740, 60, C_ACCENT, C_SURFACE);
    oc.appendChild(svgRich(46, 368, '以前要靠**可观性约束 EKF**（Huang 等 2010）专门修；InEKF 的误差方程不含估计值，不可观方向天生和非线性系统一致', { size: 11, w: 720, cls: 'demo-x-ink2' }));
    oc.appendChild(svgText(46, 392, '后果：航向和位置的协方差会老实地慢慢长大（图 10 的 3σ 包络），不会被误判成越来越准', 'demo-x-mut', 10.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.8));
      var P0 = [150, 150];
      real.setAttribute('transform', 'translate(' + P0[0] + ' ' + P0[1] + ') rotate(-20)');
      /* 6 秒一轮：x 平移 → y 平移 → 绕原点旋转 */
      var c = (now % 6) / 6, mode = Math.floor(c * 3), u = Math.sin(Math.PI * ((c * 3) % 1));
      var gx = P0[0], gy = P0[1], ang = -20, label;
      if (mode === 0) { gx += 70 * u; label = '整体往前平移（上下平移也一样）'; }
      else if (mode === 1) { gy -= 60 * u; label = '整体往侧面平移'; }
      else {
        var a = 0.7 * u, dx = P0[0] - O[0], dy = P0[1] - O[1];
        gx = O[0] + Math.cos(a) * dx + Math.sin(a) * dy; gy = O[1] - Math.sin(a) * dx + Math.cos(a) * dy; ang = -20 - (a * 180) / Math.PI;
        label = '绕竖直轴整体旋转（航向）';
      }
      ghost.setAttribute('transform', 'translate(' + gx.toFixed(1) + ' ' + gy.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')');
      modeLab.setText(label);
      setOpacity(ghost, seg(t, 0.8, 1.4));
      setOpacity(reads, seg(t, 1.6, 2.2));
      setOpacity(right, seg(t, 3.6, 4.2));
      setOpacity(hiCols[0], seg(t, 7.0, 7.6));
      setOpacity(noteT, seg(t, 7.0, 7.6));
      setOpacity(hiCols[1], seg(t, 8.2, 8.8));
      setOpacity(noteY, seg(t, 8.2, 8.8));
      setOpacity(meter, seg(t, 10.4, 11.0));
      mBars.forEach(function (bs, k) { bs.forEach(function (b) { setOpacity(b, seg(t, 10.6 + k * 0.5, 11.0 + k * 0.5)); }); });
      setOpacity(oc, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 8: 不确定性长成香蕉（第 6.4 节，图 6、7；具体实例第 8 步） ── */
  function buildSceneBanana() {
    var s = sceneSvg('三格俯视图，纵轴是前进方向：机器人以每秒 1 米往前走 8 秒，初始位置不确定 0.1 米、航向不确定 10 度。左边真分布弯成香蕉，中间 InEKF 在李代数里撒点再映回来，也是香蕉；右边 QEKF 只能画直的椭圆。最后航向完全不知道时，真分布和 InEKF 都是一圈圈的圆环');
    s.appendChild(svgText(30, 28, '不确定性的形状：真的会弯成香蕉', 'demo-x-ink2', 13.5));
    var PW = 236, PH = 268, PY = 50, titles = ['真分布（1 万个粒子）', 'InEKF：李代数里的高斯', 'QEKF：位置上的高斯'];
    var cols = [C_TRUE, C_IN, C_Q];
    var small = bananaSamples(BANANA.yawDeg, 150, 5), big = bananaSamples(BANANA.fullYawDeg, 150, 6);
    var panels = titles.map(function (tt, k) {
      var g = group(s), x0 = 30 + k * (PW + 16);
      rectBox(g, x0, PY - 6, PW, PH + 30, C_BORDER, C_SURFACE2);
      g.appendChild(paint(svgText(x0 + 10, PY + 10, tt, null, 11), cols[k]));
      return { g: g, x0: x0, clouds: [0, 1, 2, 3, 4].map(function () { var p = paint(svgEl('path', { d: '', opacity: 0.55 }), cols[k]); g.appendChild(p); return p; }), ells: [] };
    });
    /* 坐标：前进方向 x 朝上，侧向 y 朝左（论文的画法） */
    function mapper(k, bigMode) {
      var x0 = panels[k].x0, cx = x0 + PW / 2, yr = bigMode ? 9.5 : 5, xr = bigMode ? [-9.5, 9.5] : [-1, 9.5];
      var sc = Math.min((PW - 20) / (2 * yr), (PH - 30) / (xr[1] - xr[0]));
      return function (q) { return [cx - q[1] * sc, PY + PH - 6 - (q[0] - xr[0]) * sc]; };
    }
    function cloudD(pts, m) {
      return pts.map(function (q) { var P = m(q); return 'M' + P[0].toFixed(1) + ' ' + P[1].toFixed(1) + 'h1.8v1.8h-1.8z'; }).join('');
    }
    function setClouds(bigMode, nShown) {
      var src = bigMode ? big : small;
      [src.truth, src.inv].forEach(function (sets, k) {
        var m = mapper(k, bigMode);
        panels[k].clouds.forEach(function (p, i) { p.setAttribute('d', i < nShown ? cloudD(sets[i], m) : ''); });
      });
      var m2 = mapper(2, bigMode);
      panels[2].clouds.forEach(function (p, i) { p.setAttribute('d', !bigMode && i < nShown ? cloudD(src.q[i], m2) : ''); });
    }
    var ellG = group(panels[2].g);
    var ells = BANANA.secs.map(function () { var e = paint(svgEl('ellipse', { fill: 'none', 'stroke-width': 1.4 }), null, C_Q); ellG.appendChild(e); return e; });
    var robot = [0, 1, 2].map(function (k) { return dotAt(panels[k].g, 0, 0, 4, C_INK); });
    var noFit = group(panels[2].g);
    noFit.appendChild(paint(svgText(panels[2].x0 + PW / 2, PY + PH / 2 - 8, '高斯椭圆', null, 13, 'middle'), C_Q));
    noFit.appendChild(paint(svgText(panels[2].x0 + PW / 2, PY + PH / 2 + 14, '表示不了圆环', null, 13, 'middle'), C_Q));
    var nums = group(s);
    nums.appendChild(svgRich(46, 366, '航向偏 10°、走 8 m：侧向偏 **' + fmt(BAN_LAT1, 2) + ' m**；偏 20°（2σ）时还往回弯 **' + fmt(BAN_SAG2, 2) + ' m**', { size: 11.5, w: 520, cls: 'demo-x-ink2' }));
    var form = group(s);
    form.appendChild(svgMath(680, 368, 'X = \\exp(\\xi)\\,\\bar X', { size: 15, anchor: 'middle', w: 200, cls: 'demo-x-good' }));
    var ring = group(s);
    ring.appendChild(svgRich(46, 394, '航向标准差 360°（图 7）：一圈圈圆环，半径 2、4、6、8 m', { size: 11, w: 520, cls: 'demo-x-acc' }));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      var bigMode = t >= 13.4;
      var shown = bigMode ? Math.min(5, 1 + Math.floor(seg(t, 13.6, 15.6) * 4.99)) : Math.min(5, 1 + Math.floor(seg(t, 3.8, 6.6) * 4.99));
      setClouds(bigMode, t >= 3.6 ? shown : 0);
      panels.forEach(function (p, k) { setOpacity(p.g, seg(t, 0.2 + k * 0.3, 0.8 + k * 0.3)); });
      /* InEKF 那格在 7.0 之后才撒点；QEKF 的椭圆在 10.4 之后 */
      panels[1].clouds.forEach(function (p) { setOpacity(p, t >= 7.0 ? 0.55 : 0); });
      panels[2].clouds.forEach(function (p) { setOpacity(p, t >= 10.4 ? 0.45 : 0); });
      var m2 = mapper(2, bigMode);
      BANANA.secs.forEach(function (sec, i) {
        var d = BANANA.speed * sec, lat = Math.sqrt(BANANA.posSigma * BANANA.posSigma + d * d * BAN_S * BAN_S);
        var c = m2([d, 0]), e = m2([d + 2 * BANANA.posSigma, 2 * lat]);
        ells[i].setAttribute('cx', c[0].toFixed(1)); ells[i].setAttribute('cy', c[1].toFixed(1));
        ells[i].setAttribute('rx', Math.abs(c[0] - e[0]).toFixed(1)); ells[i].setAttribute('ry', Math.abs(c[1] - e[1]).toFixed(1));
        setOpacity(ells[i], !bigMode && t >= 10.4 && i < shown ? 1 : 0);
      });
      var walkT = (now % 8);
      robot.forEach(function (r, k) { moveDot(r, mapper(k, bigMode)([BANANA.speed * walkT, 0])); setOpacity(r, seg(t, 3.6, 4.0)); });
      setOpacity(noFit, bigMode ? seg(t, 14.0, 14.6) : 0);
      setOpacity(nums, seg(t, 7.0, 7.6) * (bigMode ? 0.35 : 1));
      setOpacity(form, seg(t, 0.4, 1.0));
      setOpacity(ring, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 9: IMU 零偏：不完美的 InEKF（第 7 节） ── */
  function buildSceneBias() {
    var s = sceneSvg('左边：陀螺零偏像随机游走一样慢慢漂，不估计它，积分出的朝向越偏越多；估计它，就压住了。右边：零偏不属于任何满足群仿射的李群，只能留在群外，状态变成李群乘六维向量。误差方程 A 多出零偏那两列，里面是负的估计旋转、速度叉乘、位置叉乘这些估计值；零偏误差为零时它们乘零就消失了');
    s.appendChild(svgText(30, 28, '真 IMU 有零偏：只好做一个「不完美的 InEKF」', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 300, 290, C_BORDER, C_SURFACE2);
    left.appendChild(svgText(44, 64, '陀螺零偏：缓慢漂移（随机游走）', 'demo-x-ink2', 11));
    var BX0 = 50, BX1 = 316, BY0 = 160;
    hline(left, BX0, BY0, BX1, BY0, C_BORDER, 1);
    var rngB = mulberry32(9), walk = [0];
    for (var i = 1; i <= 120; i++) walk.push(walk[i - 1] + 0.9 * gauss(rngB));
    var biasPath = pathLine(left, [], C_WARN, 1.8);
    left.appendChild(svgText(44, 196, '积分出的朝向误差', 'demo-x-ink2', 11));
    var EY0 = 300;
    hline(left, BX0, EY0, BX1, EY0, C_BORDER, 1);
    var errNo = pathLine(left, [], C_Q, 2), errYes = pathLine(left, [], C_IN, 2);
    var lNo = paint(svgText(BX1, 216, '不估计零偏', null, 10, 'end'), C_Q), lYes = paint(svgText(BX1, EY0 - 8, '估计零偏', null, 10, 'end'), C_IN);
    left.appendChild(lNo); left.appendChild(lYes);
    function cumPts(u, est) {
      var pts = [], acc = 0;
      for (var i = 0; i <= 120 * u; i++) {
        acc += walk[i];
        var e = est ? 8 * Math.exp(-i / 18) * Math.abs(Math.sin(i / 5)) + 2 : Math.abs(acc) * 0.12 + i * 0.5;
        pts.push([BX0 + (i / 120) * (BX1 - BX0), EY0 - clamp(e, 0, 86)]);
      }
      return pts;
    }

    var tup = group(s);
    rectBox(tup, 346, 44, 424, 70, C_ACCENT, C_SURFACE);
    tup.appendChild(svgRich(360, 66, '没有哪个李群既装得下零偏、又满足群仿射（Barrau 2015）', { size: 11.5, w: 400, cls: 'demo-x-ink2' }));
    tup.appendChild(svgRich(360, 94, '零偏留在群外：$(X_t, \\theta_t) \\in G \\times \\mathbb{R}^6$，$\\theta = (b^{g}, b^{a})$', { size: 12, w: 400, cls: 'demo-x-acc' }));

    var grid = group(s);
    rectBox(grid, 346, 124, 424, 210, C_BORDER, C_SURFACE2);
    grid.appendChild(svgText(360, 142, '线性误差方程 A（6 × 6 块，单脚）', 'demo-x-ink2', 11));
    var names = ['R', 'v', 'p', 'd', 'b^g', 'b^a'], GX = 420, GY = 152, CW = 56, CH = 26;
    names.forEach(function (n, k) {
      grid.appendChild(svgMath(GX + k * CW + CW / 2, GY + 8, n, { size: 11.5, anchor: 'middle', w: CW, cls: 'demo-x-mut' }));
      grid.appendChild(svgMath(GX - 22, GY + 32 + k * CH, n, { size: 11.5, anchor: 'middle', w: 40, cls: 'demo-x-mut' }));
    });
    var cellsG = group(grid), biasCells = group(grid);
    for (var r = 0; r < 6; r++) for (var c = 0; c < 6; c++) {
      cellsG.appendChild(paint(svgEl('rect', { x: GX + c * CW + 2, y: GY + 16 + r * CH, width: CW - 4, height: CH - 4, rx: 3, 'stroke-width': 0.8 }), C_SURFACE, C_BORDER));
    }
    [[1, 0, '(g)_\\times'], [2, 1, 'I']].forEach(function (e) {
      cellsG.appendChild(svgMath(GX + e[1] * CW + CW / 2, GY + 32 + e[0] * CH, e[2], { size: 11, anchor: 'middle', w: CW, cls: 'demo-x-good' }));
    });
    [[0, 4, '-\\bar R'], [1, 4, '-(\\bar v)_\\times\\bar R'], [2, 4, '-(\\bar p)_\\times\\bar R'], [3, 4, '-(\\bar d)_\\times\\bar R'], [1, 5, '-\\bar R']].forEach(function (e) {
      biasCells.appendChild(paint(svgEl('rect', { x: GX + e[1] * CW + 2, y: GY + 16 + e[0] * CH, width: CW - 4, height: CH - 4, rx: 3, opacity: 0.18 }), C_Q));
      biasCells.appendChild(svgMath(GX + e[1] * CW + CW / 2, GY + 32 + e[0] * CH, e[2], { size: 9.5, anchor: 'middle', w: CW + 6, cls: 'demo-x-bad' }));
    });
    var biasNote = paint(svgText(756, 328, '红色：含估计值 → 又和轨迹有关了', null, 10, 'end'), C_Q);
    grid.appendChild(biasNote);
    var zero = group(grid);
    zero.appendChild(svgRich(756, 142, '零偏误差 $\\zeta = 0$ 时这两列乘 0', { size: 10, anchor: 'end', w: 220, cls: 'demo-x-good' }));

    var tab = group(s);
    rectBox(tab, 30, 346, 740, 60, C_ACCENT, C_SURFACE);
    tab.appendChild(svgText(46, 368, '表 1：初始零偏标准差 陀螺 0.005 rad/s、加速度计 0.05 m/s²；零偏噪声 0.001 rad/s²、0.001 m/s³', 'demo-x-ink2', 11));
    tab.appendChild(svgText(46, 392, '零偏初值：机器人静止时，用那段 IMU 数据先估一个', 'demo-x-mut', 10.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.8));
      var u = ((now % 8) / 8);
      var bp = [];
      for (var i = 0; i <= 120 * u; i++) bp.push([BX0 + (i / 120) * (BX1 - BX0), BY0 - 60 - clamp(walk[i] * 3, -50, 50)]);
      setPath(biasPath, bp);
      setPath(errNo, cumPts(u, false));
      setPath(errYes, t >= 1.6 ? cumPts(u, true) : []);
      setOpacity(lYes, seg(t, 1.6, 2.2));
      setOpacity(tup, seg(t, 3.6, 4.2));
      setOpacity(grid, seg(t, 7.0, 7.6));
      setOpacity(biasCells, seg(t, 7.8, 8.4));
      setOpacity(biasNote, seg(t, 8.4, 9.0));
      setOpacity(zero, seg(t, 10.4, 11.0));
      setOpacity(tab, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 10: 脚落地、脚抬起：增删接触点（第 8 节、第 12 节；具体实例第 9 步） ── */
  function buildSceneContacts() {
    var s = sceneSvg('上面示意一段行走：脚落地，状态矩阵多一列；脚抬起，这一列删掉。右边是状态矩阵的列：朝向、速度、位置，加上左脚、右脚两列，跟着步态出现和消失。下面是新触地点的初始化公式与例子，以及和路标 SLAM 的对照：触地点就是只在踩着时才看得见的路标');
    s.appendChild(svgText(30, 28, '脚落地、脚抬起：触地点一列一列地加、删', 'demo-x-ink2', 13.5));
    var top = group(s);
    rectBox(top, 30, 44, 500, 170, C_BORDER, C_SURFACE2);
    var GY = 196;
    hline(top, 44, GY, 516, GY, C_BORDER, 1.4);
    var body = cassieLegs(top, C_EST, false, { legH: 66 });
    var prints = group(top);
    var tag = svgRich(0, 0, '', { size: 10.5, anchor: 'middle', w: 120, cls: 'demo-x-good' });
    top.appendChild(tag);
    var springs = group(top);
    springs.appendChild(svgText(44, 62, '每条腿两根弹簧，压缩量过阈值 = 着地', 'demo-x-mut', 10));

    var mat = group(s);
    rectBox(mat, 546, 44, 224, 170, C_ACCENT, C_SURFACE);
    mat.appendChild(svgText(560, 62, '状态矩阵 X 的列', 'demo-x-ink2', 11));
    var colLab = ['R', 'v', 'p', 'd_{\\text{左}}', 'd_{\\text{右}}'], colX = [570, 612, 646, 680, 720];
    var colRects = colLab.map(function (c, k) {
      var g = group(mat);
      var w = k === 0 ? 38 : 30;
      rectBox(g, colX[k] - 4, 76, w, 100, k < 3 ? C_ACCENT : C_GOOD, C_SURFACE2);
      g.appendChild(svgMath(colX[k] - 4 + w / 2, 132, c, { size: 13, anchor: 'middle', w: w + 10, cls: k < 3 ? 'demo-x-acc' : 'demo-x-good' }));
      return g;
    });
    var sizeLab = svgText(560, 200, '', 'demo-x-mut', 10.5);
    mat.appendChild(sizeLab);

    var init = group(s);
    rectBox(init, 30, 224, 500, 110, C_BORDER, C_SURFACE2);
    init.appendChild(svgText(44, 244, '落地：用正运动学初始化新的触地点', 'demo-x-ink2', 11));
    init.appendChild(svgMath(280, 272, '\\bar d = \\bar p + \\bar R\\,h_p(\\tilde\\alpha)', { size: 15, anchor: 'middle', w: 300, cls: 'demo-x-good' }));
    init.appendChild(svgText(44, 298, '协方差：从身体位置那几行抄过来，再加上编码器带来的运动学噪声', 'demo-x-mut', 10.5));
    var ex = group(init);
    ex.appendChild(svgRich(44, 322, '例：$\\bar p = (0.30, 0, 0.90)$，腿测 $(0.12, -0.13, -0.88)$ → $\\bar d = ' + fmtV(NEWFOOT_D, 2) + '$，σ ≈ ' + fmt(NEWFOOT_SIG, 4) + ' m', { size: 10.5, w: 480, cls: 'demo-x-ink2' }));
    var lift = group(s);
    rectBox(lift, 546, 224, 224, 110, C_Q, C_SURFACE, '4 3');
    lift.appendChild(paint(svgText(560, 244, '抬起：边缘化', null, 11), C_Q));
    lift.appendChild(svgText(560, 268, 'X 删掉这只脚的那一列（和那一行）', 'demo-x-ink2', 10.5));
    lift.appendChild(svgText(560, 290, '协方差删掉对应的 3 行 3 列', 'demo-x-ink2', 10.5));
    lift.appendChild(svgText(560, 312, '代码：removeRowAndColumn()', 'demo-x-mut', 10));

    var slam = group(s);
    rectBox(slam, 30, 346, 740, 60, C_ACCENT, C_SURFACE);
    slam.appendChild(svgRich(46, 368, '和**路标 SLAM** 是一回事（第 12 节）：触地点 = 只在踩着时才看得见的路标；2000 Hz、不用做数据关联，速度噪声允许打滑', { size: 11, w: 720, cls: 'demo-x-ink2' }));
    slam.appendChild(svgText(46, 392, '把真的路标也放进同一个矩阵，位置和航向就能补成可观（代价是维数随路标增长）', 'demo-x-mut', 10.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(top, seg(t, 0.2, 0.8));
      var W = walkPose(now, 60, GY, 84, 1.6), span = 520 - 60;
      var wrapX = function (x) { return 60 + ((x - 60) % span + span) % span; };
      var bx = wrapX(W.x), shift = bx - W.x;
      body.put(bx, W.y, W.ang, W.feet.map(function (f) { return [f[0] + shift, f[1], f[2]]; }));
      /* 脚印：踩着的那只画实心 */
      while (prints.firstChild) prints.removeChild(prints.firstChild);
      W.feet.forEach(function (f, k) {
        if (!f[2]) return;
        var r = paint(svgEl('rect', { x: (f[0] + shift - 9).toFixed(1), y: GY - 1, width: 18, height: 5, rx: 2 }), k ? C_ACCENT : C_GOOD);
        prints.appendChild(r);
      });
      var stanceK = W.feet[0][2] ? 0 : 1, landing = W.u < 0.18;
      tag.setText(landing ? '落地：+ 一列' : '');
      var sf = W.feet[stanceK];
      tag.setX(sf[0] + shift); tag.setY(GY - 104);
      setOpacity(springs, seg(t, 0.6, 1.2));
      setOpacity(mat, seg(t, 3.6, 4.2));
      colRects.forEach(function (g, k) {
        if (k < 3) setOpacity(g, 1);
        else setOpacity(g, (k - 3 === stanceK || (W.u < 0.12 && k - 3 !== stanceK)) ? 1 : 0.15);
      });
      sizeLab.textContent = '现在 ' + (W.u < 0.12 ? 2 : 1) + ' 只脚着地 → X 是 ' + (W.u < 0.12 ? '7 × 7' : '6 × 6');
      setOpacity(lift, seg(t, 3.6, 4.2));
      setOpacity(init, seg(t, 7.0, 7.6));
      setOpacity(ex, seg(t, 10.4, 11.0));
      setOpacity(slam, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 11: 收敛：仿真与真机各 100 次（图 3、图 8，读图示意） ── */
  function buildSceneConverge() {
    var s = sceneSvg('上下两格是俯仰估计随时间的走势，每条线是一次随机初值，初值在正负 30 度之间：上面 QEKF，下面 InEKF。先是仿真的 1 秒，InEKF 约 0.3 秒就收拢，QEKF 1 秒后还散着十来度；再换成真机的 2 秒，InEKF 约 0.4 秒收拢，QEKF 2 秒后还散着约 5 度。曲线是按图 3、图 8 的走势画的示意');
    s.appendChild(svgText(30, 28, '从差的初值出发：100 次随机初始化，谁先收拢', 'demo-x-ink2', 13.5));
    var rows = [['QEKF：俯仰估计', C_Q], ['InEKF：俯仰估计', C_IN]];
    var PX0 = 96, PX1 = 520, ROWH = 140;
    var nRuns = 22, rngC = mulberry32(31), e0 = [], ph = [];
    for (var i = 0; i < nRuns; i++) { e0.push((rngC() * 2 - 1) * CONV.eulerDeg); ph.push(rngC() * 6.28); }
    function truthDeg(x, real) { return real ? 1.5 * Math.sin(x * 9) + 1.2 * Math.sin(x * 23) : 2 + 1.5 * Math.sin(x * 6); }
    function fac(x, isIn, real) {
      if (isIn) return Math.exp(-Math.pow(x / (real ? 0.2 : 0.15), 2));
      return real ? 0.17 + 0.83 * Math.exp(-x / 0.5) : 0.35 + 0.65 * Math.exp(-x / 0.25);
    }
    var panes = rows.map(function (rq, k) {
      var g = group(s), y0 = 44 + k * (ROWH + 10);
      rectBox(g, 30, y0, 510, ROWH, C_BORDER, C_SURFACE2);
      g.appendChild(paint(svgText(44, y0 + 18, rq[0], null, 11), rq[1]));
      var yMid = y0 + ROWH / 2 + 8, ySc = (ROWH / 2 - 22) / 30;
      hline(g, PX0, yMid, PX1, yMid, C_BORDER, 1);
      g.appendChild(svgText(PX0 - 6, yMid - 30 * ySc + 4, '+30°', 'demo-x-mut', 9, 'end'));
      g.appendChild(svgText(PX0 - 6, yMid + 30 * ySc + 4, '−30°', 'demo-x-mut', 9, 'end'));
      var axisLab = svgText(PX1, y0 + ROWH - 4, '', 'demo-x-mut', 9.5, 'end');
      g.appendChild(axisLab);
      var lines = e0.map(function () { var p = pathLine(g, [], rq[1], 1.1); p.style.opacity = 0.6; return p; });
      var truth = pathLine(g, [], C_INK, 2, '5 3');
      return { g: g, yMid: yMid, ySc: ySc, lines: lines, truth: truth, axisLab: axisLab, isIn: k === 1 };
    });
    var side = group(s);
    rectBox(side, 556, 44, 214, 290, C_ACCENT, C_SURFACE);
    var sideT = svgRich(570, 66, '', { size: 11.5, w: 190, cls: 'demo-x-acc' });
    side.appendChild(sideT);
    var sideLines = [0, 1, 2, 3, 4, 5].map(function (k) { var n = svgRich(570, 96 + k * 24, '', { size: 10.5, w: 190, cls: 'demo-x-ink2' }); side.appendChild(n); return n; });
    var bottom = group(s);
    rectBox(bottom, 30, 346, 740, 60, C_BORDER, C_SURFACE2);
    bottom.appendChild(svgText(46, 368, '初值离真值近时两者差不多（图 8 的黑线）；初值离得远，QEKF 就在错的工作点上线性化', 'demo-x-ink2', 11));
    bottom.appendChild(svgText(46, 392, '曲线按图 3、图 8 的走势画（示意，读图）；下面的二维演示可以自己拖初始误差试', 'demo-x-mut', 10.5));

    function draw(t, clock) {
      var real = t >= 10.4, Tw = real ? CONV.realWin : CONV.simWin;
      var grow = real ? ease(seg(t, 10.6, 12.6)) : ease(seg(t, 3.8, 6.4));
      panes.forEach(function (pn, k) {
        setOpacity(pn.g, seg(t, 0.2 + k * 0.3, 0.8 + k * 0.3));
        pn.axisLab.textContent = '0 → ' + Tw + ' s（' + (real ? '真机，零偏估计开' : '仿真，零偏估计关') + '）';
        var showRuns = t >= 3.6 && (pn.isIn || t >= 7.0 || real);
        pn.lines.forEach(function (p, i) {
          var pts = [];
          if (showRuns) {
            for (var j = 0; j <= 80 * grow; j++) {
              var x = (j / 80) * Tw, wig = 1.2 * Math.sin(ph[i] + x * 7) * fac(x, pn.isIn, real);
              var y = truthDeg(x, real) + e0[i] * fac(x, pn.isIn, real) + wig;
              pts.push([PX0 + (j / 80) * (PX1 - PX0), pn.yMid - clamp(y, -32, 32) * pn.ySc]);
            }
          }
          setPath(p, pts);
        });
        var tp = [];
        for (var j = 0; j <= 80; j++) tp.push([PX0 + (j / 80) * (PX1 - PX0), pn.yMid - truthDeg((j / 80) * Tw, real) * pn.ySc]);
        setPath(pn.truth, tp);
        setOpacity(pn.truth, seg(t, 1.0, 1.6));
      });
      setOpacity(side, seg(t, 0.4, 1.0));
      if (!real) {
        sideT.setText('仿真（图 3）');
        sideLines[0].setText('同一组测量、同样的噪声（表 1）');
        sideLines[1].setText('初值：欧拉角 ±30°、速度 ±1 m/s');
        sideLines[2].setText('各跑 **100** 次，零偏估计关');
        sideLines[3].setText(t >= 3.6 ? 'InEKF：约 **0.3 s** 收拢（读图）' : '');
        sideLines[4].setText(t >= 7.0 ? 'QEKF：1 s 后还散着 **十来度**' : '');
        sideLines[5].setText(t >= 7.0 ? '航向两者都不收敛：看不见' : '');
      } else {
        sideT.setText('真机（图 8）');
        sideLines[0].setText('Cassie 慢走约 0.3 m/s');
        sideLines[1].setText('同一段记录，离线跑 **100** 次');
        sideLines[2].setText('零偏估计打开');
        sideLines[3].setText('InEKF：约 **0.4 s** 收拢（读图）');
        sideLines[4].setText('QEKF：2 s 后还散着 **约 5°**');
        sideLines[5].setText('100 次里 InEKF 都更快、更稳');
      }
      setOpacity(bottom, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  /* ── scene 12: Cassie 实测：动捕、200 米与激光建图（第 9.2–9.4 节，图 9–12；第 13 节） ── */
  /* 图 9 的两条轨迹（读图，单位 m；起点在原点）：动捕约 15 m，InEKF 终点差不到 5% */
  var FIG9 = {
    mocap: [[0, 0], [-4.3, -3.6], [-7.1, -1.6], [-2.9, 3.0]],
    inekf: [[0, 0], [-4.4, -3.9], [-7.3, -1.7], [-2.6, 3.6]]
  };
  function buildSceneReal() {
    var s = sceneSvg('左边是图 9 的俯视轨迹：动作捕捉和 InEKF 估计，约 15 米、60 秒，终点差不到走过路程的 5%。右上：绕草坪人行道走约 200 米、7 分 45 秒，估计一直在人行道上。右下：按滤波器的位姿把激光雷达点云投到世界系，10 秒的点云叠成地图。底下是局限：位置和航向会漂、带零偏后理论保证不成立、运动学误差和打滑带进偏差');
    s.appendChild(svgText(30, 28, 'Cassie 实测：动捕、200 米人行道与激光建图', 'demo-x-ink2', 13.5));
    var left = group(s);
    rectBox(left, 30, 44, 320, 290, C_BORDER, C_SURFACE2);
    left.appendChild(svgText(44, 62, '图 9：动捕场地 M-Air，18 台相机（读图）', 'demo-x-ink2', 10.5));
    var M = function (q) { return [326 + q[0] * 25, 172 - q[1] * 25]; };
    var pM = pathLine(left, FIG9.mocap.map(M), C_TRUE, 2.2, '6 4'), pI = pathLine(left, FIG9.inekf.map(M), C_IN, 2.2);
    dotAt(left, M([0, 0])[0], M([0, 0])[1], 4.5, C_INK);
    left.appendChild(svgText(M([0, 0])[0] - 8, M([0, 0])[1] - 8, '起点', 'demo-x-mut', 9.5, 'end'));
    var endT = dotAt(left, 0, 0, 4, C_TRUE), endI = dotAt(left, 0, 0, 4, C_IN);
    var lg = group(left);
    lg.appendChild(svgText(44, 300, '— — 动作捕捉', 'demo-x-mut', 10));
    lg.appendChild(paint(svgText(140, 300, '—— InEKF', null, 10), C_IN));
    var drift = group(left);
    drift.appendChild(svgRich(44, 322, '约 15 m、60 s：终点差 **< 5%**（< 0.75 m）', { size: 10.5, w: 300, cls: 'demo-x-ink2' }));

    var walk = group(s);
    rectBox(walk, 366, 44, 404, 140, C_BORDER, C_SURFACE2);
    walk.appendChild(svgText(380, 62, '图 11：绕 Wave Field 的人行道', 'demo-x-ink2', 10.5));
    var loopPts = [[420, 80], [600, 84], [640, 112], [600, 168], [430, 172], [420, 80]];
    pathLine(walk, loopPts, C_BORDER, 9);
    var loopPath = pathLine(walk, loopPts, C_IN, 2);
    var walker = dotAt(walk, 420, 80, 5, C_IN);
    walk.appendChild(svgText(756, 118, '约 200 m', 'demo-x-ink2', 12, 'end'));
    walk.appendChild(svgText(756, 140, '7 分 45 秒', 'demo-x-ink2', 12, 'end'));
    walk.appendChild(svgText(756, 166, '估计一直在人行道上', 'demo-x-good', 10.5, 'end'));

    var lidar = group(s);
    rectBox(lidar, 366, 194, 404, 140, C_BORDER, C_SURFACE2);
    lidar.appendChild(svgText(380, 212, '图 12：躯干换成带 32 线激光雷达的版本', 'demo-x-ink2', 10.5));
    var cs = cassie(lidar, 380, 326, 96);
    var rngL = mulberry32(77), walls = [];
    for (var i = 0; i < 160; i++) {
      var u = rngL(), side = rngL() < 0.5;
      walls.push([470 + u * 280, side ? 232 + 4 * gauss(rngL) : 314 + 4 * gauss(rngL)]);
    }
    for (i = 0; i < 40; i++) walls.push([700 + 30 * rngL(), 240 + 70 * rngL()]);
    var cloud = paint(svgEl('path', { d: '', opacity: 0.8 }), C_WARN);
    lidar.appendChild(cloud);
    var lidarTraj = pathLine(lidar, [], C_IN, 2);
    lidar.appendChild(svgText(756, 330, '按 InEKF 的位姿叠 10 s 点云', 'demo-x-mut', 10, 'end'));
    var scan = paint(svgEl('path', { fill: 'none', 'stroke-width': 1, opacity: 0.6 }), C_WARN);
    lidar.appendChild(scan);

    var lim = group(s);
    rectBox(lim, 30, 346, 740, 60, C_ACCENT, C_SURFACE);
    lim.appendChild(svgText(46, 368, '边界：位置与航向随时间漂；带零偏后理论保证不再成立；运动学模型误差、打滑会带进偏差', 'demo-x-ink2', 11));
    lim.appendChild(svgText(46, 392, '之后：不变平滑器、接触预积分、在线标定运动学、视觉—惯性—接触融合', 'demo-x-mut', 10.5));

    function draw(t, clock) {
      var now = nowOf(t, clock);
      setOpacity(left, seg(t, 0.2, 0.8));
      var u = ease(seg(t, 1.0, 3.4));
      drawOn(pM, u); drawOn(pI, u);
      function along(pts, f) {
        var lens = [], tot = 0;
        for (var k = 1; k < pts.length; k++) { var d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); lens.push(d); tot += d; }
        var want = f * tot;
        for (k = 0; k < lens.length; k++) { if (want <= lens[k]) { var r = want / lens[k]; return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * r, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * r]; } want -= lens[k]; }
        return pts[pts.length - 1];
      }
      moveDot(endT, along(FIG9.mocap.map(M), u)); moveDot(endI, along(FIG9.inekf.map(M), u));
      setOpacity(drift, seg(t, 3.6, 4.2));
      setOpacity(walk, seg(t, 7.0, 7.6));
      var f = (now % 9) / 9;
      moveDot(walker, along(loopPts, f));
      drawOn(loopPath, t >= 7.0 ? f : 0);
      setOpacity(lidar, seg(t, 10.4, 11.0));
      var g = t >= 10.4 ? ((now - 10.4) % 6) / 6 : 0, n = Math.floor(walls.length * g);
      var bx = 470 + 270 * g;
      cloud.setAttribute('d', walls.filter(function (q) { return q[0] < bx + 40; }).slice(0, Math.max(n, 0)).map(function (q) { return 'M' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + 'h2v2h-2z'; }).join(''));
      setPath(lidarTraj, [[470, 274], [bx, 274 + 6 * Math.sin(g * 6)]]);
      var sd = '';
      for (var k = 0; k < 12; k++) { var a = (k / 12) * 2 * Math.PI + now * 2; sd += 'M' + bx.toFixed(1) + ' 274 l' + (36 * Math.cos(a)).toFixed(1) + ' ' + (36 * Math.sin(a)).toFixed(1); }
      scan.setAttribute('d', sd);
      cs.g.setAttribute('transform', 'translate(' + (2 * Math.sin(now * 2)).toFixed(1) + ' 0)');
      setOpacity(lim, seg(t, 13.4, 14.0));
    }
    return { el: s, draw: draw };
  }

  var INEKF_SCENES = [
    {
      title: '机器人怎样知道自己的姿态和速度',
      dur: 17,
      build: buildSceneWhy,
      cues: [
        { at: 0.3, s: '控制器每一拍都要知道身体的**朝向、速度和位置**：往哪歪、走多快、在哪。关节角有编码器直接量，身体在世界里的位姿和速度没有传感器能直接读。' },
        { at: 3.6, s: '相机、激光雷达能帮忙，但怕暗、怕烟、怕晃，帧率也低。底层估计器最好只用**本体传感器**：IMU、关节编码器和接触开关，它们几乎不会失效。' },
        { at: 7.0, s: '只积分 IMU，几秒就漂飞；只靠运动学，噪声大还漂。常见做法是用**扩展卡尔曼滤波（EKF）**把三者融合起来（Bloesch 等，2012）。' },
        { at: 10.4, s: 'EKF 在**当前估计值**处线性化：估计偏得远，线性化本身就错了，收敛变慢甚至发散，还可能把看不见的量当成看得见。' },
        { at: 13.4, s: '这篇用**不变扩展卡尔曼滤波（InEKF）**：传感器和模型都不变，只换误差的定义，线性化就不再依赖估计值。RSS 2018 会议版，IJRR 2020 扩展版，平台是 Cassie。' }
      ]
    },
    {
      title: 'IMU 往前推，脚踩住不动，运动学来校正',
      dur: 17,
      build: buildSceneSensors,
      cues: [
        { at: 0.3, s: '要估的状态：身体（IMU）的朝向 $R$、速度 $v$、位置 $p$，再加上每个触地点的位置 $d$ —— 全在世界坐标下。' },
        { at: 3.6, s: '**预测**：IMU 测角速度和加速度（Cassie 上 800 Hz），直接积分出 $R$、$v$、$p$；不需要机器人的动力学模型（捷联式）。' },
        { at: 7.0, s: '**接触**：弹簧被压缩就认为脚着地，假设触地点在世界里不动；为了容许打滑，给它的速度加一点白噪声。' },
        { at: 10.4, s: '**校正**：编码器（2000 Hz）经正运动学算出脚相对身体的位置 $h_p(\\tilde\\alpha) = R^{\\top}(d - p)$ 加噪声，用它把估计拉回来。' },
        { at: 13.4, s: '「IMU + 接触 + 正运动学」这套拆法来自 Bloesch 的 QEKF；InEKF 不改传感器、不改模型，**只改误差怎么定义**。' }
      ]
    },
    {
      title: '朝向估错一点：线性化在哪儿出问题',
      dur: 17,
      build: buildSceneWrongLin,
      cues: [
        { at: 0.3, s: '最简单的情形：Cassie 站着不动，IMU 读到的只有重力 $\\tilde a = (0, 0, 9.81)$。可滤波器以为身体前倾了 **0.1 rad**。' },
        { at: 3.6, s: '用错的朝向把读数转到世界系，扣掉重力，剩下约 0.98 m/s² 的「假加速度」：1 秒后估计速度变成 (0.979, 0, −0.049) m/s。' },
        { at: 7.0, s: 'QEKF 的误差方程里含着估计值 $\\bar R_t$：它预测的速度误差是 (−0.976, 0, 0.098)，竖直分量比真实的 0.049 **多算了一倍**。' },
        { at: 10.4, s: '错 0.5 rad 时：真实误差 (−4.70, 0, 1.20)，QEKF 预测 (−4.30, 0, 2.35)。**估计越偏，线性化越错**，协方差也就越不可信。' },
        { at: 13.4, s: '论文第 4 节用纯朝向的例子讲同一件事：欧拉角的误差方程处处带着估计值；换成旋转矩阵、误差定义成 $R^{\\top}\\bar R$，估计值就从方程里消失了。' }
      ]
    },
    {
      title: '一个矩阵装下全部状态',
      dur: 17,
      build: buildSceneMatrix,
      cues: [
        { at: 0.3, s: '把 $R$、$v$、$p$ 和 $N$ 个触地点拼成一个 $(N+5)\\times(N+5)$ 的矩阵：左上 3×3 是旋转，右边一列列是速度、位置、触地点，右下是单位阵。' },
        { at: 3.6, s: '这种矩阵相乘、求逆都还是这种矩阵 —— 构成一个**矩阵李群** $SE_{N+2}(3)$：比 SE(3) 多带了速度和各个触地点。' },
        { at: 7.0, s: '误差也定义在群里：**右不变误差** $\\eta_t = \\bar X_t X_t^{-1}$，是把真值整体「转一下、挪一下」变成估计值的那个变换，在世界坐标里量。' },
        { at: 10.4, s: '$\\eta$ 取对数，得到 $3N+9$ 维的误差向量 $\\xi$：旋转、速度、位置、每个触地点各 3 维。两只脚着地是 15 维，加上 IMU 零偏再加 6 维。' },
        { at: 13.4, s: 'QEKF 的误差逐项相减（$v-\\bar v$、$p-\\bar p$），朝向单独用四元数乘；InEKF 把它们**绑在一起**：朝向一偏，速度、位置的误差跟着一起转。' }
      ]
    },
    {
      title: '误差不看轨迹：对数线性',
      dur: 17,
      build: buildSceneLogLinear,
      cues: [
        { at: 0.3, s: '**定理 1**：动力学满足「群仿射」，不变误差的演化就**和轨迹无关**。IMU 加接触的模型正好满足：走直线还是转弯，误差都一样地演化。' },
        { at: 3.6, s: '**定理 2**：对数误差满足线性方程 $\\dot\\xi = A\\xi$，而且是**精确**的。这里的 $A$ 是常数，只含重力 $g$，没有任何估计值。' },
        { at: 7.0, s: '回到站立的例子：线性方程给出 $\\xi_v = (0.981, 0, 0)$、$\\xi_p = (0.4905, 0, 0)$；过一次指数映射得 (0.9794, 0, −0.0490)，和滤波器自己积分的**一位不差**。' },
        { at: 10.4, s: '图 4 把它做成实验：初始朝向误差从 0 放大到每轴 π/2，传 1 秒。QEKF 的线性预测越错越多（约 25，读图），InEKF 一直是 **0**。' },
        { at: 13.4, s: '读数带噪声时就不再精确（图 5），但 InEKF 的线性化仍然准得多：估计偏了，也不会把方程本身带偏。' }
      ]
    },
    {
      title: '运动学来校正：H 是常数',
      dur: 17,
      build: buildSceneUpdate,
      cues: [
        { at: 0.3, s: '正运动学测的是「脚相对身体」。写成矩阵，正好是 $Y = X^{-1}b + V$ 的形式 —— 论文叫它**右不变观测**。' },
        { at: 3.6, s: '于是新息只依赖不变误差，线性化后 $H = [\\,0,\\ 0,\\ -I,\\ I\\,]$，**和估计值无关**；QEKF 的 $H$ 里有 $\\bar R^{\\top}(\\bar d - \\bar p)$。' },
        { at: 7.0, s: '例子：腿测出来比估计的远 2 cm、高 2 cm。更新后身体和脚各挪约 1 cm、方向相反，缺口就合上了（对角协方差，演示用）。' },
        { at: 10.4, s: '更新是 $\\bar X^{+} = \\exp(K\\Pi\\bar X Y)\\,\\bar X$；协方差用 Joseph 形式（扩展版式 19，会议版写的是 $(I-KH)P$）。官方 C++ 库的 `Correct()` 就是这样写的。' },
        { at: 13.4, s: '换成**机器人中心**的写法（状态取逆），同一个运动学测量变成左不变观测；左右两种误差之间用伴随矩阵精确换算（第 10、11 节）。' }
      ]
    },
    {
      title: '看不见的方向：航向与绝对位置',
      dur: 17,
      build: buildSceneObservability,
      cues: [
        { at: 0.3, s: '把整个场景（机器人加脚印）平移一下，或绕竖直轴转一下：IMU 和腿测到的读数一模一样。这 **4 个方向**（3 个位置 + 航向）没法观测。' },
        { at: 3.6, s: '因为误差方程是线性的，直接用线性系统的可观性矩阵就能看出来：$A$ 是常数而且幂零，$\\Phi = e^{A\\Delta t}$ 只有三项。' },
        { at: 7.0, s: '位置和触地点两大列只差一个符号：平移看不见。重力只有竖直分量，旋转那一块的第 3 列全是 0：航向看不见。单脚 12 维，秩是 8。' },
        { at: 10.4, s: 'QEKF 在每一步的估计值处线性化，各时刻的零空间对不齐。我们拿抖动的估计值算了一个 12 维小例子：秩变成 9 —— **航向被假装看见了**。' },
        { at: 13.4, s: '以前要靠「可观性约束 EKF」（Huang 等 2010）专门修；InEKF 的不可观方向天生和非线性系统一致，不用额外处理。' }
      ]
    },
    {
      title: '不确定性长成香蕉',
      dur: 17,
      build: buildSceneBanana,
      cues: [
        { at: 0.3, s: '两种滤波器都把误差当成零均值高斯，但高斯放在哪儿不一样：QEKF 放在位置上；InEKF 放在李代数里，再经指数映射回到群上：$X = \\exp(\\xi)\\bar X$。' },
        { at: 3.6, s: '仿真（第 6.4 节）：Cassie 以 1 m/s 往前走 8 秒，初始位置不确定 0.1 m、航向不确定 10°。撒 1 万个粒子当「真」分布。' },
        { at: 7.0, s: '真分布弯成一根**香蕉**：航向偏 10°，走 8 m 侧向偏 1.39 m；偏 20° 时还往回弯 0.48 m。InEKF 的样本也弯成同一根香蕉。' },
        { at: 10.4, s: 'QEKF 只能画**直的椭圆**，弯不过来；论文图 6 里它画出的侧向范围比真值还窄（读图）。' },
        { at: 13.4, s: '航向完全不知道（标准差 360°，图 7）：InEKF 画出一圈圈圆环，半径 2、4、6、8 m；高斯椭圆根本表示不了。' }
      ]
    },
    {
      title: 'IMU 零偏：不完美的 InEKF',
      dur: 17,
      build: buildSceneBias,
      cues: [
        { at: 0.3, s: '真的 IMU 有缓慢漂移的**零偏** $b^{g}$、$b^{a}$，建模成随机游走；不把它估出来，积分出的朝向越偏越多。' },
        { at: 3.6, s: '可没有哪个李群既装得下零偏、又满足群仿射（Barrau 2015）。只好让零偏留在群外：状态变成 $(X, \\theta) \\in G \\times \\mathbb{R}^6$。' },
        { at: 7.0, s: '代价是 $A$ 多出零偏那两列，里面是 $-\\bar R$、$-(\\bar v)_\\times\\bar R$ 这些**估计值**：误差演化又和轨迹有关了。论文叫它「不完美的 InEKF」。' },
        { at: 10.4, s: '好在零偏误差为零时这些项就乘成 0；实验里它仍比 QEKF 对初值更不敏感（图 8）。' },
        { at: 13.4, s: '表 1：初始零偏标准差 陀螺 0.005 rad/s、加速度计 0.05 m/s²；零偏的初值，用机器人静止时那段 IMU 数据先估一个。' }
      ]
    },
    {
      title: '脚落地、脚抬起：增删接触点',
      dur: 17,
      build: buildSceneContacts,
      cues: [
        { at: 0.3, s: '走路时触地点来来去去。Cassie 每条腿有两根弹簧，弹簧压缩量过阈值就算着地 —— 一个二值接触传感器。' },
        { at: 3.6, s: '**脚抬起**：把这只脚对应的那一列（和那一行）从 $X$ 里删掉，协方差也删掉对应的 3 行 3 列 —— 就是边缘化。' },
        { at: 7.0, s: '**脚落下**：用正运动学初始化新的触地点 $\\bar d = \\bar p + \\bar R\\,h_p(\\tilde\\alpha)$；协方差从身体位置那几行抄过来，再加上运动学噪声。' },
        { at: 10.4, s: '例：$\\bar p = (0.30, 0, 0.90)$，腿测出 (0.12, −0.13, −0.88)，新脚印在 (0.42, −0.13, 0.02)；位置标准差 0.1 m 加上 1 cm 的运动学噪声，约 0.1005 m。' },
        { at: 13.4, s: '这和**路标 SLAM** 是一回事：触地点就是只在踩着时才看得见的路标，2000 Hz、不用做数据关联。换成真的路标，位置和航向也能补成可观。' }
      ]
    },
    {
      title: '从差的初值收敛：仿真与真机各 100 次',
      dur: 17,
      build: buildSceneConverge,
      cues: [
        { at: 0.3, s: '收敛对比：同一组测量、同样的噪声和初始协方差（表 1），只把初值随机化：欧拉角在 ±30°、速度在 ±1 m/s 里均匀抽，各跑 **100** 次。' },
        { at: 3.6, s: '仿真（图 3）：Cassie 小落一下后加速到 0.3 m/s，零偏估计关掉。InEKF 的俯仰、横滚约 **0.3 s** 就收拢（读图）。' },
        { at: 7.0, s: 'QEKF 1 秒后还散着十来度（读图）。航向两者都不收敛 —— 它本来就看不见，所以速度画在估计的机身系里。' },
        { at: 10.4, s: '真机（图 8）：Cassie 以约 0.3 m/s 慢走，同一段记录离线跑 100 次，零偏估计打开。InEKF 约 **0.4 s** 收拢；QEKF 2 秒后还散着约 5°（读图）。' },
        { at: 13.4, s: '初值离真值近时两者差不多；离得远时差别才出来：QEKF 在错的工作点上线性化。下面的二维演示可以自己拖初始误差试。' }
      ]
    },
    {
      title: 'Cassie 实测：动捕、200 米与激光建图',
      dur: 17,
      build: buildSceneReal,
      cues: [
        { at: 0.3, s: '动捕实验：密歇根大学 M-Air 场地，18 台动作捕捉相机；Cassie 不拴安全绳走 60 秒、约 15 m（图 9）。' },
        { at: 3.6, s: '航向和绝对位置看不见，会漂：终点误差不到走过路程的 **5%**。看得见的俯仰、横滚、机身系速度一直贴着真值（图 10）。' },
        { at: 7.0, s: '长距离：绕 Wave Field 的人行道走约 **200 m**、7 分 45 秒，估计的轨迹一直在人行道上，终点差几米（图 11）。' },
        { at: 10.4, s: '建图：躯干换成带 32 线激光雷达的版本，按滤波器的位姿把点云投到世界系，10 秒的点云叠成地图；高频位姿还能补偿一帧扫描里的运动（图 12）。' },
        { at: 13.4, s: '边界：位置和航向会随时间漂；带零偏后理论保证不再成立；运动学模型误差和打滑会带进偏差。之后的方向：不变平滑器、接触预积分、在线标定运动学。' }
      ]
    }
  ];

  function buildExplainerDemo(host) {
    K.explainer(host, {
      title: '十二幕动画：接触辅助 InEKF 全流程速览',
      sub: '约 204 秒自动播放。空格播放/暂停，← → 换幕；表格与正文数字照抄论文，站立、校正、新触地点、香蕉四个算例与下面三个演示、笔记「具体实例」用的是同一份数。',
      ariaLabel: '接触辅助 InEKF 十二幕讲解动画',
      notes: [
        '取数依据：第 1、2、11、12 幕的数字照抄论文第 6、9 节与表 1（IJRR 扩展版 arXiv 1904.09251 v2；会议版 1805.10410 的实验数字相同）；第 5 幕的 $A$、第 6 幕的 $H$、第 7 幕的可观性矩阵照抄第 5 节式 (12)–(14)、(20) 与第 5.4 节；第 9 幕的 $A$ 照抄式 (28)。' +
          '第 3、5 幕的站立例子（0.1 rad、0.5 rad）、第 6 幕的 2 cm 校正、第 10 幕的新触地点、第 8 幕的 1.39 m / 0.48 m 是在论文的式子上现算的（具体实例第 2–4、6、8、9 步）；第 7 幕「QEKF 秩为 9」是我们用抖动的估计值算的 12 维小例子，不是论文的数。',
        '**读图与示意**：图 3、4、6、8、9 没有标数，第 5、11、12 幕的曲线和轨迹是按图读的近似值；第 2、3、4、6、10 幕的 Cassie 腿示意（鸟腿画法同真实世界人形行走那篇的 Digit 下半身，连杆按 MuJoCo Menagerie 的 Cassie 模型：大腿 0.12、小腿 0.50、跗骨 0.41 m）、第 9 幕的零偏曲线、第 12 幕的人行道与点云是示意。Cassie 的图取自 Robot_Description_Gallery（按 UMich BipedLab 的开源 URDF 渲染）。'
      ],
      scenes: INEKF_SCENES
    });
  }

  // ─── the narrated vertical video of the same twelve scenes ─────────────
  /* Rendered offline by scripts/paper_video/ from the storyboard above plus a
     voice-over; the files sit next to the note (see its placeholder). */
  function buildVideoDemo(host) {
    K.video(host, {
      title: '配音讲解视频：接触辅助 InEKF 十二幕全流程',
      sub: '10 分 6 秒竖屏视频（1080×1920），中文配音 + 字幕。画面就是上面的十二幕动画，旁白把每一幕讲细；适合手机上看或转发。',
      size: '11.1 MB',
      fileName: 'InEKF_讲解视频.mp4'
    });
  }

  K.mount({
    'inekf-explainer': buildExplainerDemo,
    'inekf-video': buildVideoDemo,
    'inekf-linearize': buildLinearizeDemo,
    'inekf-converge': buildConvergeDemo,
    'inekf-banana': buildBananaDemo
  });
})();
