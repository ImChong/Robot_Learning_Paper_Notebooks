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
  var CASSIE = { dof: 20, actuators: 10, springs: 4, encoders: 14, imuHz: 800, encHz: 2000, height: 1.2768 }; // 第 9 节；身高取自 Robot_Description_Gallery 的 URDF 测量
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
  /* Cassie 的渲染图（Robot_Description_Gallery 按开源 URDF 渲染，透明底），高 h 时宽 0.45h；
     mark(nx, ny) 把图上的归一化坐标换成画布坐标，用来标 IMU、弹簧、脚 */
  var CASSIE_IMG = { file: 'cassie.webp', aspect: 135 / 300, imu: [0.75, 0.11], hip: [0.38, 0.25], spring: [0.11, 0.63], footA: [0.31, 0.97], footB: [0.6, 0.9] };
  function cassie(parent, x, yBottom, h) {
    var w = h * CASSIE_IMG.aspect, g = group(parent);
    var img = svgEl('image', { href: ROBOT_IMG_BASE + CASSIE_IMG.file, x: x.toFixed(1), y: (yBottom - h).toFixed(1), width: w.toFixed(1), height: h.toFixed(1), preserveAspectRatio: 'xMidYMax meet' });
    g.appendChild(img);
    return { g: g, w: w, h: h, mark: function (nn) { return [x + nn[0] * w, yBottom - h + nn[1] * h]; } };
  }
  /* 示意用的「身体 + 两条腿」：身体是一个带坐标轴的方块（IMU 在里面），腿是两段线，脚是圆点。
     put(x, y, ang, feet)：身体中心 (x, y)、俯仰 ang（rad，图上逆时针为正）、feet = [[x, y, 着地?], …] */
  function bodyLegs(parent, color, dashed) {
    var g = group(parent);
    var legs = [0, 1].map(function () {
      var l1 = hline(g, 0, 0, 0, 0, color, 2.4), l2 = hline(g, 0, 0, 0, 0, color, 2.4), foot = dotAt(g, 0, 0, 4.2, color);
      if (dashed) { l1.setAttribute('stroke-dasharray', '4 3'); l2.setAttribute('stroke-dasharray', '4 3'); }
      return { l1: l1, l2: l2, foot: foot };
    });
    var body = svgEl('g', {});
    g.appendChild(body);
    var box = paint(svgEl('rect', { x: -22, y: -13, width: 44, height: 26, rx: 5, 'stroke-width': 2 }), C_SURFACE, color);
    if (dashed) box.setAttribute('stroke-dasharray', '4 3');
    body.appendChild(box);
    var ax = hline(body, 0, 0, 16, 0, color, 1.6), ay = hline(body, 0, 0, 0, -16, color, 1.6);
    dotAt(body, 0, 0, 2.6, color);
    return {
      g: g, box: box,
      put: function (x, y, ang, feet) {
        body.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + ((-ang * 180) / Math.PI).toFixed(2) + ')');
        feet.forEach(function (f, k) {
          var L = legs[k], hip = [x + (k ? 6 : -6), y + 12];
          var mid = [(hip[0] + f[0]) / 2 + 9, (hip[1] + f[1]) / 2];
          setLine(L.l1, hip[0], hip[1], mid[0], mid[1]);
          setLine(L.l2, mid[0], mid[1], f[0], f[1]);
          moveDot(L.foot, f);
          L.foot.style.opacity = f[2] ? 1 : 0.35;
        });
        ax.style.opacity = 1; ay.style.opacity = 1;
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

  /* 幕布内的几何讲解：暗底、稳定配色、连续变换；外部 cues / title / dur 保持原样。
     所有运动取真实 clock，阶段取 t，逐帧随机访问与网页播放结果一致。 */
  var GEO = { bg: '#10141e', grid: '#202b3b', white: '#eef3fa', muted: '#a0adc0', blue: '#58c4dd', green: '#83c167', red: '#fc6255', gold: '#ffdc68', purple: '#b49bff' };
  function geometryScene(label, messages, formula, render) {
    var s = sceneSvg(label), bg = svgEl('rect', { x: 0, y: 0, width: 800, height: 420, fill: GEO.bg });
    s.appendChild(bg);
    var grid = group(s);
    for (var x = 40; x < 800; x += 40) grid.appendChild(svgEl('path', { d: 'M'+x+' 55V340', stroke: GEO.grid, 'stroke-width': 0.55 }));
    for (var y = 60; y <= 340; y += 40) grid.appendChild(svgEl('path', { d: 'M25 '+y+'H775', stroke: GEO.grid, 'stroke-width': 0.55 }));
    var head = paint(svgText(400, 33, '', null, 17, 'middle'), GEO.white); s.appendChild(head);
    var g = group(s), pool = {}, seen;
    function node(key, tag, attrs) {
      seen[key] = true;
      var e = pool[key];
      if (!e) { e = pool[key] = svgEl(tag, {}); g.appendChild(e); }
      e.style.opacity = '1';
      Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
      return e;
    }
    var D = {
      path: function (key, pts, color, width, dash, fill) {
        return node(key, 'path', { d: pts.length ? polyPath(pts) : 'M0 0', stroke: color, 'stroke-width': width || 2.5, fill: fill || 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': dash || '' });
      },
      circle: function (key, x, y, r, color, fill) { return node(key, 'circle', { cx: x, cy: y, r: r, stroke: color, fill: fill || 'none', 'stroke-width': 2 }); },
      rect: function (key, x, y, w, h, color, fill) { return node(key, 'rect', { x: x, y: y, width: w, height: h, rx: 3, stroke: color, fill: fill || 'none', 'stroke-width': 1.6 }); },
      text: function (key, x, y, str, color, size, anchor) {
        var e = node(key, 'text', { x: x, y: y, fill: color || GEO.white, 'font-size': size || 14, 'text-anchor': anchor || 'middle' });
        // SVG 的主题 CSS 会覆盖 fill 属性；幕布固定暗底，字色也要固定，浅色网页才仍然可读。
        e.style.fill = color || GEO.white; e.textContent = str; return e;
      },
      arrow: function (key, a, b, color, dash) {
        D.path(key, [a,b], color, 3, dash);
        var ang = Math.atan2(b[1]-a[1], b[0]-a[0]), l=9;
        D.path(key+'tip', [[b[0]-l*Math.cos(ang-.45),b[1]-l*Math.sin(ang-.45)], b, [b[0]-l*Math.cos(ang+.45),b[1]-l*Math.sin(ang+.45)]], color, 3);
      },
      frame: function (key, x, y, a, color, scale) {
        var r=scale||45;
        D.arrow(key+'x', [x,y], [x+r*Math.cos(a),y-r*Math.sin(a)], color);
        D.arrow(key+'z', [x,y], [x-r*.8*Math.sin(a),y-r*.8*Math.cos(a)], color);
        D.circle(key+'o',x,y,3,color,color);
      },
      robot: function (key, x, ground, h) {
        node(key, 'image', { href: ROBOT_IMG_BASE+CASSIE_IMG.file, x: x-h*CASSIE_IMG.aspect/2, y: ground-h, width: h*CASSIE_IMG.aspect, height: h, preserveAspectRatio: 'xMidYMax meet' });
      },
      plot: function (key,x,y,w,h) { D.arrow(key+'x',[x,y],[x+w,y],GEO.muted); D.arrow(key+'y',[x,y],[x,y-h],GEO.muted); },
      arc: function (key,cx,cy,r,a,b,color,dash) {
        var pts=[]; for(var i=0;i<=60;i++){var q=a+(b-a)*i/60;pts.push([cx+r*Math.cos(q),cy-r*Math.sin(q)]);}
        D.path(key,pts,color,2,dash);
      }
    };
    var eq=svgMath(400,387,Array.isArray(formula)?formula[0]:formula,{size:21,anchor:'middle',w:744,h:48}); eq.setTone(GEO.gold); s.appendChild(eq);
    return { el:s, draw:function(t,clock){
      var phase=t<3.6?0:t<7?1:t<10.4?2:t<13.4?3:4;
      head.textContent=messages[phase]; if(Array.isArray(formula))eq.setTex(formula[phase]); seen={}; render(D,t,nowOf(t,clock),phase);
      Object.keys(pool).forEach(function(k){if(!seen[k])pool[k].style.opacity='0';});
      var starts=[0,3.6,7,10.4,13.4]; g.style.opacity=.35+.65*ease(seg(t,starts[phase],starts[phase]+.5));
    }};
  }
  function geoCurve(f,n) { var p=[]; for(var i=0;i<=n;i++)p.push(f(i/n)); return p; }

  function buildSceneWhy() {
    return geometryScene('身体状态估计：传感器融合与线性化',[
      '关节角读得到，身体在世界里怎样运动？','可靠的起点：IMU · 编码器 · 接触开关','让三路测量互相纠错','切线选错，误差就会越滚越大','换一个误差定义，保留同一套传感器'
    ],'\\text{IMU} + \\text{接触} + \\text{运动学} \\longrightarrow (R,v,p)',function(D,t,now,k){
      if(k<2){
        D.robot('cassie',235,320,240); D.path('ground',[[70,322],[390,322]],GEO.muted,1);
        D.frame('body',280,108,.08*Math.sin(now),GEO.blue,52);
        [['R 朝向',GEO.blue,110],['v 速度',GEO.green,190],['p 位置',GEO.purple,270]].forEach(function(q,i){
          D.arrow('a'+i,[345,q[2]-5],[500,q[2]-5],q[1]); D.text('q'+i,600,q[2],k===0?q[0]+'？':['IMU · 800 Hz','编码器 · 2000 Hz','弹簧接触开关'][i],q[1],19);
        });
        D.circle('sense',282,99,10+3*Math.sin(now*3),GEO.gold);
      } else if(k===2){
        D.plot('axes',95,290,620,200); var u=(now%7)/7;
        [GEO.red,GEO.gold,GEO.green].forEach(function(c,i){D.path('curve'+i,geoCurve(function(f){var z=f*u;return [100+600*z,255-(i===0?150*z*z:i===1?20*z+12*Math.sin(35*z):3*Math.sin(24*z))];},90),c,3);});
        D.text('imu',580,100,'只积分 IMU',GEO.red,17);D.text('kin',585,185,'只靠运动学',GEO.gold,17);D.text('fuse',585,315,'融合估计',GEO.green,17);
      } else {
        D.plot('curveaxes',95,305,610,215);
        function f(x){return 245-95*Math.sin((x-110)/170);}
        D.path('nonlinear',geoCurve(function(u){var x=115+570*u;return[x,f(x)];},100),GEO.blue,3);
        var xe=460+60*Math.sin(now*.5),xt=235;
        [xt,xe].forEach(function(x,i){var slope=-95/170*Math.cos((x-110)/170),c=i?GEO.red:GEO.green;
          D.path('tan'+i,[[x-70,f(x)-70*slope],[x+70,f(x)+70*slope]],c,3);D.circle('pt'+i,x,f(x),5,c,c);
          D.text('lbl'+i,x,330,i?'估计值处':'真值处',c,17);
        });
        if(k===4) D.text('new',400,85,'InEKF：误差方程不随工作点改变',GEO.green,20);
      }
    });
  }

  function buildSceneSensors() {
    return geometryScene('预测、接触和运动学更新',[
      '身体状态与脚印，都放在世界坐标里','IMU 推着估计前进，不确定性逐渐扩张','踩住的脚，是暂时不动的锚点','腿测出的相对位置，把估计拉回来','三种传感器，组成一个预测—校正循环'
    ],'h_p = R^\\top(d-p)',function(D,t,now,k){
      var u=(now%6)/6,x=250+90*u,z=150,foot=[285,305],est=[x+25+35*u,z-15*u];
      D.path('floor',[[75,310],[725,310]],GEO.muted,1);
      D.robot('robot',x,306,180);D.frame('true',x,z,0,GEO.white,37);
      D.circle('foot',foot[0],foot[1],7,GEO.green,GEO.green);D.text('footlab',foot[0],338,'d：踩住的脚印',GEO.green,15);
      D.frame('estimate',est[0],est[1],.12*u,GEO.blue,42);
      var ellipse=D.circle('uncertain',est[0],est[1],28+45*u,GEO.blue);ellipse.setAttribute('transform','translate('+est[0]+' '+est[1]+') scale(1 .6) translate('+(-est[0])+' '+(-est[1])+')');
      D.text('imu',595,110,'IMU → 预测',GEO.blue,20);D.text('con',595,175,'接触 → 固定脚印',GEO.green,20);D.text('fk',595,240,'运动学 → 校正',GEO.gold,20);
      if(k>=3){var q=.5-.5*Math.cos(now*1.4),corr=[est[0]+(x-est[0])*q,est[1]+(z-est[1])*q];
        D.arrow('leg',[x,z],foot,GEO.gold);D.frame('corrected',corr[0],corr[1],.12*u*(1-q),GEO.green,42);D.arrow('innovation',est,corr,GEO.green);
      }
      if(k===2)D.arc('anchor',foot[0],foot[1],18,0,Math.PI*2,GEO.green);
    });
  }

  function buildSceneWrongLin() {
    return geometryScene('站立算例：误投影的重力与切线误差',[
      '机器人没动，估计却倾斜了 0.1 rad','重力转错方向，长出一截假加速度','小角度时，竖直误差已经多算一倍','偏到 0.5 rad，真实误差与切线越分越远','问题不是 IMU，而是误差用什么坐标表达'
    ],'a_{\\rm fake}=\\bar R(0,0,9.81)^\\top+g',function(D,t,now,k){
      var th=k>=3?.5:.1,origin=[205,238],r=130;
      D.frame('world',origin[0],origin[1],0,GEO.white,55);D.frame('tilted',origin[0],origin[1],th,GEO.blue,65);
      var a=[origin[0]+r*Math.sin(th),origin[1]-r*Math.cos(th)];
      D.arrow('a',origin,a,GEO.gold);D.arrow('g',a,[a[0],a[1]+r],GEO.muted);
      D.arrow('residual',origin,[a[0],a[1]+r],GEO.red);
      D.arc('angle',origin[0],origin[1],80,Math.PI/2-th,Math.PI/2,GEO.blue);
      D.text('theta',110,90,'θ = '+th+' rad',GEO.blue,20);
      D.text('stationary',205,320,'真值：速度 = 0',GEO.white,17);
      var ex=standingExample(th,1),bx=490,base=220;
      D.path('zero',[[435,base],[745,base]],GEO.muted,1);
      [0,2].forEach(function(j,i){var x=bx+i*155,actual=ex.trueDv[j],q=ex.qekfDv[j],sc=i?(th<.2?500:25):(th<.2?34:12);
        D.arrow('act'+i,[x,base],[x,base-actual*sc],GEO.white);D.arrow('q'+i,[x+35,base],[x+35,base-q*sc],GEO.red);
        D.text('axis'+i,x+15,300,i?'竖直 z':'水平 x',GEO.muted,16);
        D.text('av'+i,x-5,90,fmt(actual,3),GEO.white,17);D.text('qv'+i,x+45,117,fmt(q,3),GEO.red,17);
      });
      D.text('legend1',555,332,'真实误差',GEO.white,15);D.text('legend2',690,332,'QEKF',GEO.red,15);
      D.circle('pulse',a[0],a[1]+r,4+2*Math.sin(now*3),GEO.red);
    });
  }

  function buildSceneMatrix() {
    return geometryScene('矩阵李群把朝向、速度、位置与脚印绑在一起',[
      '旋转占三列，速度、位置和脚印各占一列','相乘和求逆，仍留在同一种矩阵结构里','误差是把真值整体挪到估计值的那一下','取对数：双脚时 15 维，加零偏再加 6 维','一起旋转，一起平移，保留状态之间的联系'
    ],'\\eta=\\bar X X^{-1}',function(D,t,now,k){
      var cols=[GEO.blue,GEO.blue,GEO.blue,GEO.green,GEO.purple,GEO.gold,GEO.gold],a=.24*Math.sin(now*.7);
      var R=[[Math.cos(a),-Math.sin(a),0],[Math.sin(a),Math.cos(a),0],[0,0,1]];
      D.path('bracketL',[[305,72],[295,72],[295,325],[305,325]],GEO.white,2);
      D.path('bracketR',[[724,72],[734,72],[734,325],[724,325]],GEO.white,2);
      cols.forEach(function(c,j){var x=326+j*60; D.rect('col'+j,x-22,85,43,130,c,c+'18');
        D.text('label'+j,x,65,['R₁','R₂','R₃','v','p','d₁','d₂'][j],c,18);
        for(var i=0;i<7;i++)D.text('cell'+i+'_'+j,x,110+i*33,i<3?(j<3?fmt(R[i][j],1):'·'):(i===j?'1':'0'),i<3?c:GEO.muted,17);
      });
      var dx=k>=2?18:0;
      D.frame('true',135,180,0,GEO.white,66);D.frame('est',135+dx,180-10,a,GEO.blue,66);
      D.text('body',140,285,'R · v · p · d',GEO.white,19);
      D.text('dim',530,345,k>=3?'双脚：7 × 7 状态矩阵 · 15 维误差':'同一个变换作用于每一列',GEO.muted,15);
      if(k>=2)D.arc('transform',135,180,90,0,a,GEO.gold);
    });
  }

  function buildSceneLogLinear() {
    return geometryScene('不同轨迹，在同一误差坐标里遵循同一条演化',[
      '走直线或转弯，误差演化不看轨迹','对数坐标里，误差沿一条精确的线性路径走','映回真实空间，与直接积分落在同一点','初值放大：QEKF 偏离，InEKF 仍为零','加噪声后不再精确，但误差定义仍然有优势'
    ],'\\dot\\xi=A\\xi \\quad (A\\text{只含重力})',function(D,t,now,k){
      if(k<2){
        [0,1].forEach(function(j){var y=115+j*155,pts=geoCurve(function(u){return[70+265*u,y+(j?30*Math.sin(u*6):0)];},60);D.path('traj'+j,pts,GEO.blue,2);
          var u=(now%7)/7,p=pts[Math.floor(u*60)];D.frame('f'+j,p[0],p[1],j?.3*Math.cos(u*6):0,GEO.blue,25);
          D.arrow('to'+j,[365,y],[430,y],GEO.muted);D.path('error'+j,[[450,y+30],[650,y-30]],GEO.green,3);
          D.circle('e'+j,450+200*u,y+30-60*u,5,GEO.green,GEO.green);
        });D.text('identical',595,198,'相同的误差演化',GEO.green,18);
      }else if(k===2){
        var u=(now%6)/6;D.plot('axes',90,290,600,200);
        D.path('linear',[[120,260],[360,140]],GEO.blue,3);D.text('xi',225,305,'ξᵥ = 0.981',GEO.blue,18);
        D.arrow('exp',[370,165],[475,165],GEO.gold);D.text('expLabel',423,140,'exp',GEO.gold,20);
        var p=[520+140*u,260-100*u];D.path('mapped',geoCurve(function(q){return[520+140*q,260-100*q-20*Math.sin(q*Math.PI)];},50),GEO.green,3);
        D.circle('direct',p[0],p[1]-20*Math.sin(u*Math.PI),6,GEO.white);D.circle('mappedDot',p[0],p[1]-20*Math.sin(u*Math.PI),3,GEO.green,GEO.green);
        D.text('exact',580,315,'(0.9794, 0, −0.0490)',GEO.green,17);
      }else{
        D.plot('plot',100,292,610,205);var u=(now%8)/8;
        D.path('q',geoCurve(function(f){var z=f*u;return[110+580*z,280-170*z*z];},80),GEO.red,3);
        D.path('in',geoCurve(function(f){var z=f*u;return[110+580*z,280-(k===4?8*z*(1+Math.sin(z*24)):0)];},80),GEO.green,3);
        D.text('qL',565,90,'QEKF ≈ 25',GEO.red,20);D.text('iL',570,245,k===3?'InEKF = 0':'有噪声：不再精确',GEO.green,19);
        D.text('read',405,333,'图 4 / 5 的趋势示意 · 25 为读图近似',GEO.muted,14);
      }
    });
  }

  function buildSceneUpdate() {
    return geometryScene('运动学残差怎样分给身体与脚印',[
      '腿只测脚相对身体的位置','同一个残差，身体和脚印方向相反','2 cm 缺口，两边各移动约 1 cm','在群上更新整组状态','换到机器人中心，描述变了，测量没变'
    ],'H=[0,\\;0,\\;-I,\\;I]',function(D,t,now,k){
      var u=k>=2?(.5-.5*Math.cos(now*1.1)):0;
      var px=220-35*u,dx=570+35*u;
      D.frame('p',px,185,0,GEO.blue,46);D.circle('d',dx,185,8,GEO.gold,GEO.gold);
      D.text('pl',px,255,'身体 p',GEO.blue,21);D.text('dl',dx,255,'脚印 d',GEO.gold,21);
      D.path('old',[[220,100],[570,100]],GEO.muted,2,'5 5');
      D.arrow('leg',[px,150],[dx,150],GEO.green);D.text('measured',400,85,'运动学：相对距离多了 2 cm',GEO.green,20);
      if(k>=2){D.arrow('dp',[220,290],[185,290],GEO.blue);D.arrow('dd',[570,290],[605,290],GEO.gold);
        D.text('dpLab',210,328,'Δp ≈ −0.995 cm',GEO.blue,17);D.text('ddLab',590,328,'Δd ≈ +0.995 cm',GEO.gold,17);
      }
      D.text('weights',400,215,'相同不确定性 → 各分一半',GEO.muted,17);
      if(k===4)D.text('origin',400,350,'世界中心 ↔ 机器人中心：同一个几何关系',GEO.purple,16);
    });
  }

  function buildSceneObservability() {
    return geometryScene('绝对平移和航向是传感器看不见的自由度',[
      '整个场景平移或绕竖直轴旋转，读数不变','零空间，必须在每一步保持一致','单脚 12 维，只能观测其中 8 维','QEKF 工作点抖动，可能假装看到了航向','保留 4 个自由度，承认传感器的边界'
    ],'\\operatorname{rank}(\\mathcal O)=12-4=8',function(D,t,now,k){
      var a=.4*Math.sin(now*.55),cx=235+30*Math.sin(now*.7),cy=215;
      D.arc('orbit',235,215,98,0,Math.PI*2,GEO.muted,'4 5');
      function pt(x,z){return[cx+x*Math.cos(a)-z*Math.sin(a),cy-x*Math.sin(a)-z*Math.cos(a)];}
      var p=pt(0,40),d=pt(65,-45);D.frame('body',p[0],p[1],a,GEO.blue,36);D.circle('foot',d[0],d[1],6,GEO.gold,GEO.gold);D.arrow('relative',p,d,GEO.green);
      D.text('same',235,338,'一起挪动，腿的读数不变',GEO.green,18);
      for(var i=0;i<12;i++){var x=460+(i%4)*66,y=105+Math.floor(i/4)*70,c=i<8?GEO.green:GEO.muted;
        D.circle('mode'+i,x,y,18,c,i<8?c+'30':'none');D.text('modeL'+i,x,y+5,i<8?'✓':'?',c,19);
      }
      D.text('rank',555,330,k===3?'抖动小例子：QEKF 秩 9':'8 个可观 · 4 个不可观',k===3?GEO.red:GEO.white,19);
      if(k===3){D.circle('falseMode',460,245,20,GEO.red);D.text('false',460,250,'!',GEO.red,21);}
      D.text('directions',540,65,'3 个位置 + 1 个航向',GEO.gold,19);
    });
  }

  function buildSceneBanana() {
    var rng=mulberry32(190409251),cloud=[];
    for(var i=0;i<180;i++)cloud.push([gauss(rng),gauss(rng)]);
    var cloudScale=103/(155*Math.max.apply(null,cloud.map(function(q){return Math.abs(Math.sin(q[0]*BAN_S));})));
    return geometryScene('航向不确定性经旋转映射，弯成香蕉或圆环',[
      '高斯放在哪个坐标里，决定了映回去的形状','先撒同一批样本：位置 0.1 m，航向 10°','越走越远，航向误差把粒子云弯成香蕉','位置上的直椭圆，套不住弯回来的云','航向完全未知时，位置沿圆环分布'
    ],'X=\\exp(\\xi)\\bar X',function(D,t,now,k){
      var u=.5-.5*Math.cos(now*.65),dist=k===0?35:70+85*u,cx=400,cy=208;
      if(k===4){
        [40,75,110,145].forEach(function(r,j){D.arc('ring'+j,cx,cy,r,0,Math.PI*2,GEO.blue);D.text('r'+j,cx+r+10,cy-8,(j+1)*2+' m',GEO.blue,13,'start');});
        cloud.forEach(function(q,i){var a=q[0]*Math.PI*2+now*.12,r=40+35*(i%4)+q[1]*1.2;D.circle('p'+i,cx+r*Math.cos(a),cy+r*Math.sin(a),1.7,GEO.green,GEO.green);});
        D.text('full',cx,cy+6,'360°',GEO.gold,22);
      } else {
        var dist=110+45*u,baseX=600;
        D.path('leftaxis',[[90,208],[310,208]],GEO.muted,1);
        D.path('rightaxis',[[450,208],[730,208]],GEO.muted,1);
        cloud.forEach(function(q,i){
          var th=q[0]*BAN_S;
          D.circle('flat'+i,210+q[1]*3,cy-dist*Math.sin(th)*cloudScale,1.8,GEO.blue,GEO.blue);
          if(k>=1)D.circle('p'+i,baseX+dist*(Math.cos(th)-1)*8+q[1]*3,cy-dist*Math.sin(th)*cloudScale,1.9,GEO.green,GEO.green);
        });
        if(k>=1){
          D.arrow('exp',[345,208],[425,208],GEO.gold);D.text('map',385,180,'exp',GEO.gold,21);
          D.path('banana',geoCurve(function(z){var th=(z-.5)*4*BAN_S;return[baseX+dist*(Math.cos(th)-1)*8,cy-dist*Math.sin(th)*cloudScale];},80),GEO.green,2);
        }
        if(k>=3){
          D.path('ellipse',geoCurve(function(z){var a=z*Math.PI*2;return[baseX+9*Math.cos(a),cy+dist*BAN_S*cloudScale*2*Math.sin(a)];},80),GEO.red,2);
        }
        D.text('leftlabel',210,77,'李代数：高斯',GEO.blue,19);
        D.text('rightlabel',610,77,k>=3?'QEKF 椭圆 / InEKF 香蕉':'映回位置：弯成香蕉',k>=3?GEO.red:GEO.green,18);
        D.text('size',400,339,k>=2?'8 m · 偏 10° → 1.39 m · 偏 20° → 弯回 0.48 m':'初始位置 σ = 0.1 m · 航向 σ = 10°',GEO.gold,17);
        D.text('zoomnote',400,358,'位置分布的局部放大示意（纵横轴缩放不同）',GEO.muted,12);
      }
    });
  }

  function buildSceneBias() {
    return geometryScene('群外的 IMU 零偏使误差演化重新依赖估计值',[
      '很小的零偏，也会在积分里累积','几何状态在群内，6 维零偏留在群外','连接回来的零偏，让 A 重新含有估计值','零偏误差为零，这条影响就消失','静止时先估零偏，再在滤波中继续追踪'
    ],'(X,\\theta)\\in G\\times\\mathbb R^6',function(D,t,now,k){
      D.circle('group',225,202,112,GEO.blue,GEO.blue+'0c');D.frame('state',225,205,.3*Math.sin(now*.6),GEO.blue,62);
      D.text('groupL',225,80,'群内：R · v · p · d',GEO.blue,19);
      D.rect('bias',490,125,220,154,GEO.gold,GEO.gold+'0c');
      D.text('biasL',600,105,'群外：IMU 零偏',GEO.gold,19);
      D.text('gyro',600,172,'bᵍ：3 维',GEO.gold,20);D.text('accel',600,216,'bᵃ：3 维',GEO.gold,20);
      if(k>=2){D.arrow('coupling',[490,205],[355,205],k===3?GEO.muted:GEO.red);D.text('depends',424,172,k===3?'× 0':'−R̄',k===3?GEO.green:GEO.red,22);}
      D.text('note',400,335,k===4?'初始标准差：陀螺 0.005 rad/s · 加速度 0.05 m/s²':'理论边界：加入零偏后，精确对数线性不再成立',GEO.muted,16);
      var drift=geoCurve(function(u){return[512+175*u,259-15*u-6*Math.sin(9*u+now*.5)];},50);D.path('walk',drift,GEO.gold,2);
    });
  }

  function buildSceneContacts() {
    return geometryScene('落脚新增一列，抬脚删去一列',[
      '脚印是临时路标，只在接触期间参与估计','抬脚：状态与协方差删去对应维度','落脚：从身体和运动学初始化新脚印','新脚印的位置与不确定性都继承身体信息','接触路标，持续接入又持续离开'
    ],'\\bar d=\\bar p+\\bar R h_p',function(D,t,now,k){
      var u=(now%5)/5,stance=u<.5;
      D.robot('robot',205,310,205);D.path('floor',[[75,313],[350,313]],GEO.muted,1);
      D.circle('oldfoot',171,310,8,GEO.muted);D.circle('newfoot',270,310,8,GEO.gold,stance?GEO.gold:'none');
      D.circle('pulse',270,310,12+10*u,GEO.gold);
      var names=['R','v','p','d₁','d₂'];
      names.forEach(function(q,j){var x=416+j*63,c=j<3?GEO.blue:GEO.gold;
        var active=j!==3||k!==1;D.rect('col'+j,x,100,47,185,active?c:GEO.muted,active?c+'18':'none');D.text('name'+j,x+23,88,q,active?c:GEO.muted,22);
        if(j===3&&k===1){D.path('delete',[[x+4,132],[x+42,253]],GEO.red,3);D.path('delete2',[[x+42,132],[x+4,253]],GEO.red,3);}
      });
      if(k>=2){D.arrow('fromP',[565,303],[698,303],GEO.green);D.text('inherit',630,328,'继承协方差 + 运动学噪声',GEO.green,15);}
      if(k===3)D.text('numbers',400,350,'d = (0.42, −0.13, 0.02) m · σ = 0.1005 m',GEO.gold,17);
      else D.text('numbers',205,350,stance?'接触：路标有效':'离地：路标移除',stance?GEO.green:GEO.muted,16);
    });
  }

  function buildSceneConverge() {
    return geometryScene('从随机初始姿态收拢：论文图 3 与图 8 的趋势',[
      '同一组测量，100 个不同初值','仿真：InEKF 约 0.3 s 收拢','QEKF 仍散开；航向本来就不可观','真机打开零偏：InEKF 约 0.4 s 收拢','初值越偏，误差坐标的选择越重要'
    ],'\\theta_0\\sim U(-30^\\circ,30^\\circ)',function(D,t,now,k){
      var real=k>=3,window=real?2:1,conv=real?CONV_READ.riReal:CONV_READ.riSim,u=(now%9)/9;
      [0,1].forEach(function(j){var x0=80+j*380,base=210,w=280,c=j?GEO.red:GEO.green;
        D.path('axis'+j,[[x0,base],[x0+w,base]],GEO.muted,1);D.text('name'+j,x0+w/2,78,j?'QEKF':'InEKF',c,24);
        for(var i=0;i<30;i++){var init=CONV.eulerDeg*Math.sin(i*7.31),pts=geoCurve(function(f){var tm=f*u*window;
          var z=init*Math.exp(-tm/(j?(real?.9:.5):conv/5));if(j)z+=Math.sin(i*1.7)*((real?5:10))*Math.sin(tm*3);
          return[x0+w*f*u,base-z*2.8];},50);D.path('trace'+j+'_'+i,pts,c,1.1);}
        D.text('end'+j,x0+w,325,window+' s',GEO.muted,14);D.text('start'+j,x0,325,'0',GEO.muted,14);
      });
      D.text('source',400,351,(real?'图 8：约 0.4 s':'图 3：约 0.3 s')+' · 曲线为读图趋势示意 · 100 次实验',GEO.muted,16);
      D.text('units',60,165,'30°',GEO.muted,12);D.text('neg',60,285,'−30°',GEO.muted,12);
    });
  }

  function buildSceneReal() {
    return geometryScene('Cassie 的动捕、长距离行走与点云实验',[
      '18 台动捕相机，提供独立真值','15 m 路程，终点误差小于 5%','200 m · 7 分 45 秒，人行道上的估计轨迹','10 秒点云，用高频位姿把扫描拼起来','会漂的仍会漂：航向、绝对位置与打滑'
    ],['\\text{动捕：}18\\text{台相机}', '\\text{终点误差}/\\text{路程}<5\\%', '200\\text{ m}\\quad 7\\text{分}45\\text{秒}', '10\\text{ Hz}\\quad 10\\text{ s 点云}', '\\text{航向与绝对位置不可观}'],function(D,t,now,k){
      D.robot('cassie',145,315,215);D.text('cassieL',145,342,'Cassie · 实机',GEO.white,18);
      if(k<3){var pts=geoCurve(function(u){var a=u*Math.PI*1.7;return[505+135*Math.cos(a),210+85*Math.sin(a)];},110),u=(now%10)/10;
        D.path('truth',pts,GEO.white,2,'5 4');D.path('estimate',pts.slice(0,Math.max(2,Math.floor(u*pts.length))).map(function(p,i){return[p[0]+i*.05,p[1]-i*.03];}),GEO.green,3);
        var p=pts[Math.floor(u*110)];D.circle('head',p[0],p[1],5,GEO.green,GEO.green);
        D.text('experiment',515,75,k===2?'200 m · 7 分 45 秒':'18 台相机 · 60 s · 15 m',GEO.blue,21);
        D.text('drift',515,338,k===2?'估计轨迹一直在人行道上':'相对运动可信，绝对位置仍会漂',GEO.muted,17);
      } else if(k===3){
        for(var i=0;i<95;i++){var a=i*2.39996,r=25+((i*37)%150),x=505+r*Math.cos(a),y=210+.6*r*Math.sin(a);D.circle('cloud'+i,x,y,1.8,GEO.blue,GEO.blue);}
        var a=now*.6;D.arrow('scan',[505,210],[505+155*Math.cos(a),210+90*Math.sin(a)],GEO.gold);
        D.text('lidar',520,80,'激光雷达 · 10 Hz · 累积 10 s',GEO.blue,20);
        D.text('cloudlabel',520,340,'点云示意：每束光都要对准同一个世界',GEO.muted,16);
      } else {
        [['航向与位置：持续漂移',GEO.gold],['零偏：精确理论有边界',GEO.purple],['运动学误差与打滑：仍会带偏',GEO.red]].forEach(function(q,i){D.circle('bullet'+i,375,125+i*80,5,q[1],q[1]);D.text('limit'+i,400,132+i*80,q[0],q[1],20,'start');});
      }
    });
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
        '**读图与示意**：图 3、4、6、8、9 没有标数，第 5、11、12 幕的曲线和轨迹是按图读的近似值；第 1、2、6、10 幕的身体—腿示意、第 9 幕的零偏曲线、第 12 幕的人行道与点云是示意。Cassie 的图取自 Robot_Description_Gallery（按开源 URDF 渲染）。'
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
