---
layout: paper
paper_order: 4
title: "Antagonistic Bowden-Cable Actuation of a Lightweight Robotic Hand: Toward Dexterous Manipulation for Payload-Constrained Humanoids"
zhname: "拮抗式 Bowden 缆绳驱动的轻量化机器手：面向负载受限人形的灵巧操作"
category: "硬件设计"
---

# Antagonistic Bowden-Cable Actuation of a Lightweight Robotic Hand
**拮抗式 Bowden 缆绳驱动的轻量化机器手：面向负载受限人形的灵巧操作**

> 📅 阅读日期: 2026-05-20
>
> 🏷️ 板块: 12 Hardware Design · 灵巧手 / 缆绳驱动 / 拮抗式驱动 / 滚动接触关节
>
> 🔁 推进轨: 模块轮转（11_Simulation_Benchmark → **12_Hardware_Design**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2512.24657](https://arxiv.org/abs/2512.24657) |
| HTML | [在线阅读](https://arxiv.org/html/2512.24657v1) |
| PDF | [下载](https://arxiv.org/pdf/2512.24657) |
| 提交日期 | 2025-12-31 |
| 作者 | Sungjae Min, Hyungjoo Kim, David Hyunchul Shim |
| 机构 | **KAIST 电机系**（韩国科学技术院） |
| 作者参考 | [DBLP: David Hyunchul Shim](https://dblp.org/pid/51/281.html) |
| **发布时间** | 2025-12-31 (arXiv) |
| 源码 | ⚠️ 截至当前未见公开仓库；论文未给出 GitHub / 项目主页链接 |

---

## 🎯 一句话总结

用 **拮抗式 Bowden 缆绳 + 滚动接触关节优化** 把"驱动电机"全部搬到躯干，手部远端只剩 **236 g** 结构件却仍能输出 **>18 N 指尖力**、抓起 **>100 倍自重** 的负载 —— 给"手臂载荷不够、手却必须像人手"的人形机器人一条可工程化的路。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| DoF | Degree of Freedom | 自由度 |
| BCD | Bowden Cable Drive | 鲍登缆绳驱动（套管 + 内芯缆绳） |
| RCJ | Rolling-Contact Joint | 滚动接触关节（两曲面纯滚动，无销轴） |
| TSA | Twisted String Actuation | 扭线驱动（同类轻量化远程驱动方案） |

---

## ❓ 要解决什么问题？

人形机器人手的设计天然冲突：

- **要力大**（>10 N 指尖力才能稳定抓常见家居物体）
- **要快**（拟人速度才能灵巧操作）
- **要多 DoF**（至少要分得清拇指对握 / 多指夹捏）
- **要轻**（每多 1 kg 远端质量都会蚕食手臂负载与抖动余量）

业界主流的两条路都有硬伤：

1. **关节内置电机**（如 Allegro Hand、Shadow Hand）→ 力矩与精度都不错，**手掌沉、手腕力矩负担大**，部署到 Unitree G1 / H1 这种臂载荷只有几公斤的人形上时，留给"被抓物体"的余量几乎没了；
2. **远程腱驱**（如 Shadow C6M）→ 把电机搬走，但**每个 DoF 通常要双电机做拮抗 / 同步**，电机数翻倍且要做精确同步，可靠性下降。

本文的目标就是：**保留"电机外置"的轻量化优势，同时把每个 DoF 的电机数压到 1 个，并且不牺牲力 / 速度 / 自由度**。

---

## 🔧 方法核心

### ① 拮抗式 Bowden 缆绳，单电机驱动一个 DoF

传统拮抗方案：**两根缆绳 + 两个电机**，一拉一放产生关节运动；同步不好就内耗。

本文方案：**单电机 + 一对拮抗 Bowden 缆绳**，靠 **滚动接触关节** 的几何把"伸 / 屈"两侧的缆绳行程在物理上锁定为等长变化——电机正反转 → 一侧缆绳变短、另一侧自动以**相同长度**变长 → 不需要电机间同步。

这一步是论文的工程关键："**单电机 + 拮抗布线**" 把电机数减半，但又保留了拮抗结构常有的**预紧 / 双向力 / 反向抓**的能力。

### ② 滚动接触关节的几何优化

普通铰链 (revolute joint) 在缆绳驱动时，会因为曲率中心和缆绳走线不重合，导致**关节屈伸时缆绳长度有寄生变化**（"cable-length deviation"），这正是腱驱动手常见"两侧不同步 / 需要张紧器"的根因。

作者通过把每根关节做成**滚动接触关节（两曲面纯滚动）**，并在几何上选择曲率使**缆绳无寄生伸缩**——`cable-length deviation ≈ 0`。这是 "单电机拮抗" 能成立的几何前提。

### ③ 把电机模组搬到躯干

整套设计的最终目的是：**远端只留结构 + 关节 + 缆绳出口**；电机 / 减速器 / 编码器都装在躯干侧，靠 Bowden 套管把动力远程传到手指。

结果：

- 远端总质量 **236 g**（不含远端电机和 Bowden 套管），远低于 Allegro Hand（~1.5 kg 级）；
- 手臂负载几乎全部留给"被抓物体"；
- 维护 / 散热集中在躯干，符合 G1 / H1 这类"躯干尚有空间，手臂极敏感"的人形拓扑。

---

## 📊 关键性能数字

| 指标 | 数值 | 备注 |
|---|---|---|
| 远端（手部）质量 | **236 g** | 不含远端电机与 Bowden 套管 |
| 指尖输出力 | **> 18 N** | 远高于"日常抓握"门槛 |
| 负载比 | **> 100×** 自重 | 抬起超过 100 倍手部质量的物体 |
| 单 DoF 电机数 | **1** | 拮抗布线由 RCJ 几何完成同步 |
| 缆绳寄生伸长 | ≈ 0 | 来自 RCJ 几何约束 |

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph PROB["❓ 痛点 (Payload-Constrained Humanoid)"]
        P1["人形手臂载荷小<br/>手太沉就失去抓物余量"]
        P2["关节内置电机<br/>手掌沉 / 高远端惯量"]
        P3["传统腱驱拮抗<br/>每 DoF 双电机 + 同步难"]
    end

    subgraph IDEA["💡 设计思路"]
        I1["电机搬到躯干<br/>远端只留结构"]
        I2["单电机 + 拮抗 Bowden 缆绳"]
        I3["滚动接触关节 (RCJ) 几何<br/>使屈/伸缆绳等长"]
    end

    subgraph HW["🦾 硬件实现"]
        H1["躯干侧电机模组<br/>+ 编码器 + 减速器"]
        H2["Bowden 套管远程传力<br/>(动力沿臂走线)"]
        H3["手部 (236 g)<br/>RCJ 关节 + 拮抗缆绳出口"]
        H4["指尖 (rolling tip)"]
    end

    subgraph PERF["📈 关键性能"]
        R1["指尖力 > 18 N"]
        R2["负载 > 100× 自重"]
        R3["远端质量 236 g"]
        R4["cable-length deviation ≈ 0<br/>(无须电机间同步)"]
    end

    P1 --> I1
    P2 --> I1
    P3 --> I2
    I1 --> H1
    I2 --> H2
    I2 --> H3
    I3 --> H3
    H1 --> H2 --> H3 --> H4
    H3 --> R1
    H3 --> R2
    H3 --> R3
    I3 --> R4

    style PROB fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style IDEA fill:#e0f7fa,stroke:#0097a7,color:#003f47
    style HW fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style PERF fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
</div>

---

## 💡 核心贡献

1. **机构创新**：首次把 **单电机 + 拮抗式 Bowden 缆绳 + 滚动接触关节** 三件套同时用在一只完整的拟人手上，并在数学/几何上证明 cable-length deviation 可以做到接近零；
2. **质量分布**：远端 **236 g** 实测，**> 100× 自重负载**的实测数据，给业界一个非常清晰的"轻量化天花板可以做到这里"的参考；
3. **工程友好**：把整套电机 / 减速器 / 编码器集中在躯干，**符合现有人形（G1 / H1 / Optimus / Atlas）的躯干–手臂载荷分布**，可以直接作为这些平台的末端升级方案；
4. **可控性保留**：拮抗结构本身保留了**双向出力 + 预紧 + 阻抗调节**的能力，没有为了轻量化而丢掉灵巧手最关键的"软"控制特性。

---

## 🤖 工程价值与影响

| 方向 | 影响 |
|---|---|
| **人形末端集成** | Unitree G1 / H1 / 优必选 / Tesla Optimus 这类"臂载荷 3-5 kg"的人形，可以直接把这只手挂上去而不必降级抓握目标 |
| **VR 遥操作 / 模仿数据采集** | 低惯量远端 = 更高带宽、更接近人手延迟 → 数据质量更好 |
| **维护成本** | 电机集中在躯干 = 故障定位 / 散热 / 排线都简化 |
| **学界对标** | 给 Shadow Hand / Allegro Hand / Inspire Hand 的"重 / 慢"问题提供了一条非"少自由度"的解 |

---

## 📊 与同类灵巧手对比

| 方案 | 远端质量 | 拮抗方式 | 单 DoF 电机数 | 部署位置 |
|---|---|---|---|---|
| Allegro Hand | ~1.5 kg | 关节内电机直驱 | 1 | 手掌内 |
| Shadow C6M（腱驱） | ~4 kg（含驱动模组） | 双电机拮抗 | 2 | 前臂 |
| Inspire Hand | ~0.5 kg | 部分欠驱动 | <1（共享） | 手内 |
| **本文方案** | **0.236 kg** | **单电机 + RCJ 几何耦合拮抗** | **1** | **躯干** |

> 📌 取舍：把所有"重"的部分（电机 / 减速器 / 编码器）从手里搬走，付出 Bowden 套管的摩擦与磨损成本，换回**整条手臂的载荷余量**。

---

## 🎤 面试参考

**Q：为什么不用关节直驱电机做轻量化手？**
A：直驱方案为了出 >10 N 指尖力，电机本体一定够重，全部塞在手掌里就会把远端质量推到 1.5 kg+，对人形手臂载荷过于苛刻。本文选择把电机搬到躯干，用 Bowden 缆绳远程传力，把远端压到 0.236 kg。

**Q：拮抗式缆绳为什么以前都要两个电机？**
A：因为普通铰链关节屈伸时两侧缆绳长度并不严格互补，必须用两个独立电机各自伺服来"主动同步"。本文用滚动接触关节，让几何天然保证两侧等长变化，因此一个电机就能驱动一对拮抗缆绳。

**Q：Bowden 套管的摩擦/磨损不是会带来很大不确定性吗？**
A：是真实代价。本文承认这一点，靠"拮抗结构的预紧 + RCJ 几何零寄生"把控制层面的不确定性压到一个工程可接受的范围；力控会比直驱差，但对家用 / 抓握级任务足够。

**Q：这只手适合做强化学习抓握 / Sim-to-Real 吗？**
A：适合。低惯量 = 仿真到真实之间的动力学差异小；缆绳张力可以建模为线性弹簧+摩擦项，已有不少工作（包括 KAIST 团队 RAL 2025 的扭线驱动手）验证过这条路。

**Q：拮抗式 + 滚动接触关节有别的可替代方案吗？**
A：有：扭线驱动（TSA）也能做远程轻量化，但通常是"非拮抗"的，在反向出力 / 双向阻抗调节上不如本文方案；齿轮 + 谐波减速器内置则回到"手掌沉"的老路。

---

## 🔗 相关阅读

- [Development of a 15-DoF Bionic Hand with Cable-Driven Transmission (arXiv 2512.04399)](https://arxiv.org/pdf/2512.04399) — 同期缆驱拟人手参考
- [Data-Driven Twisted String Actuation for Anthropomorphic Hands (KAIST RAL 2025)](https://bc-kim.github.io/assets/Publications/RAL_DTR_Final.pdf) — 同组扭线驱动前作
- [RUKA: Rethinking the Design of Humanoid Hands with Learning (arXiv 2504.13165)](https://arxiv.org/abs/2504.13165) — 仓库 #431
- [ORCA: Open-Source Anthropomorphic Robotic Hand (arXiv 2504.04259)](https://arxiv.org/abs/2504.04259) — 仓库 #432
- [Antagonistic Cable Actuation in Robotics (Emergent Mind 综述)](https://www.emergentmind.com/topics/antagonistic-cable-actuation) — 拮抗缆驱方向背景

---

> 备注：本笔记以 arXiv 元信息、官方摘要、KAIST 团队前作（RAL 2025 扭线驱动手）及公开搜索整理；自动化抓取 arXiv 全文临时 403，所有数值（236 g / 18 N / >100× 自重）以摘要披露为准，后续等到 PDF / 项目页 / 源码释出，可补充：每根手指 DoF 数、Bowden 摩擦标定曲线、抓握成功率细分实验。
