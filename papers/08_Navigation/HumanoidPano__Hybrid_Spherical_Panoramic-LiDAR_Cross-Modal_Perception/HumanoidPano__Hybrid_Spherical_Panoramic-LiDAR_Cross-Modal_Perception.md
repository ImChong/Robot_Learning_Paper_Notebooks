---
layout: paper
title: "HumanoidPano: Hybrid Spherical Panoramic-LiDAR Cross-Modal Perception for Humanoid Robots"
zhname: "HumanoidPano：面向人形机器人的球面全景-激光雷达混合跨模态感知"
category: "Navigation"
arxiv: "2503.09010"
---

# HumanoidPano: Hybrid Spherical Panoramic-LiDAR Cross-Modal Perception for Humanoid Robots
**HumanoidPano：面向人形机器人的球面全景-激光雷达混合跨模态感知**

> 📅 阅读日期: 2026-07-25
>
> 🏷️ 板块: 08 Navigation · 全景感知 · 跨模态融合 · BEV 语义分割 · 球面几何
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2503.09010](https://arxiv.org/abs/2503.09010) |
| HTML | [在线阅读](https://arxiv.org/html/2503.09010v2) |
| PDF | [下载](https://arxiv.org/pdf/2503.09010) |
| **发布时间** | 2025-03-12 (arXiv v1) |
| 项目主页 | 截至当前论文未见公开项目页 |
| 源码 | 论文声明「codes will be released soon」，截至当前未见公开仓库 |

**作者**：Qiang Zhang, Zhang Zhang, Wei Cui, Jingkai Sun, Jiahang Cao, Yijie Guo, Gang Han, Wen Zhao, Jiaxu Wang, Chenghao Sun, Lingfeng Zhang, Hao Cheng, Yujie Chen, Lin Wang, Jian Tang, Renjing Xu 等

**平台**：360BEV-Matterport 基准评测 + 真机人形平台部署验证

---

## 🎯 一句话总结

人形机器人因为「头小、身体挡视线」，单目 / 前视相机存在**严重自遮挡与有限视场（FoV）**，直接影响导航时的环境理解。HumanoidPano 的思路是：**换一套感知底座**——用一颗 **360° 全景相机**拿到无盲区的周身图像，再用 **LiDAR** 补上精确深度，二者通过**球面几何约束**对齐后融合，端到端输出**鸟瞰图（BEV）语义分割地图**。全景图天然存在的畸变，用「球面射线性质引导的可变形采样」来化解；训练时再叠加**全景增强**保证 BEV 与全景特征一致。最终在 360BEV-Matterport 上 mIoU 达 **44.54%**，显著超过既有 360BEV 方法，并在真机人形上跑通。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| BEV | Bird's-Eye-View | 鸟瞰图，导航常用的俯视语义/占据表征 |
| FoV | Field of View | 视场角；人形自遮挡导致 FoV 受限 |
| SGC | Spherical Geometry-aware Constraints | 球面几何感知约束，做全景-深度对齐 |
| SDA | Spatial Deformable Attention | 空间可变形注意力，做 360°→BEV 特征聚合 |
| AUG | Panoramic Augmentation | 全景增强，跨视图变换 + 语义对齐提一致性 |
| mIoU | mean Intersection-over-Union | 语义分割平均交并比 |
| LiDAR | Light Detection and Ranging | 激光雷达，提供精确深度 |

---

## ❓ 论文要解决什么问题？

人形机器人的感知有个**结构性短板**：

1. **自遮挡严重**：头部小、躯干/手臂会挡住相机，前视方案存在大片盲区。
2. **视场受限**：单相机 FoV 不足以覆盖导航所需的周身环境，转身/避障时信息缺失。

已有 360BEV 类方法主要针对普通室内相机，**没有处理全景图的球面畸变，也没有与 LiDAR 深度做几何对齐**。HumanoidPano 要回答的是：**如何把「全景视觉 + LiDAR」这对互补传感器，在球面几何下正确融合成可用于导航的 BEV 语义地图。**

---

## 🔧 方法拆解（三大组件）

### 1. 球面几何感知约束 SGC（对齐）
- 利用**全景相机的射线（ray）性质**，引导「畸变正则化的采样偏移」，让球面图像与 LiDAR 深度在几何上对齐。
- 核心作用：把全景图固有的畸变从「误差源」变成「可建模的先验」。

### 2. 空间可变形注意力 SDA（融合）
- 以**球面偏移**聚合分层 3D 特征，实现高效的 **360° → BEV** 融合。
- 得到几何上更完整的物体表征，避免前视方案的盲区缺失。

### 3. 全景增强 AUG（一致性）
- 训练时结合**跨视图变换 + 语义对齐**，增强 BEV 与全景特征的一致性。
- 相当于给融合过程加一层数据/特征级正则，稳住训练。

### 整体管线
全景相机 + LiDAR → SGC 球面对齐 → 球面 ViT 抽特征 → SDA 聚合成 BEV → （训练期 AUG）→ **BEV 语义分割地图** → 供导航使用。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph INPUT["🌍 传感输入"]
        PANO["📷 360° 全景相机<br/>无盲区周身图像"]
        LID["📡 LiDAR<br/>精确深度"]
    end

    subgraph CORE["🧠 HumanoidPano 跨模态融合"]
        SGC["① SGC 球面几何约束<br/>射线引导·畸变正则采样对齐"]
        VIT["球面 ViT 特征提取"]
        SDA["② SDA 空间可变形注意力<br/>球面偏移聚合·360°→BEV"]
        AUG["③ AUG 全景增强<br/>跨视图变换+语义对齐（训练期）"]
    end

    subgraph OUT["🗺️ 输出与应用"]
        BEV["BEV 语义分割地图"]
        NAV["🤖 人形机器人导航<br/>真机部署验证"]
    end

    PANO --> SGC
    LID --> SGC
    SGC --> VIT --> SDA --> BEV --> NAV
    AUG -.训练一致性.-> SDA

    style INPUT fill:#fff7e0,stroke:#d4a017
    style CORE fill:#f3e8ff,stroke:#8e44ad
    style OUT fill:#eafaf1,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **首个面向人形的全景-LiDAR 跨模态 BEV 感知框架**：针对人形自遮挡/有限 FoV，用 360° 全景 + LiDAR 直接产出导航用 BEV 语义地图。
2. **球面几何约束 SGC**：以全景射线性质引导可变形采样，正确处理全景畸变并与深度对齐——这是普通 360BEV 方法缺失的一环。
3. **空间可变形注意力 SDA**：球面偏移聚合分层 3D 特征，高效实现 360°→BEV 融合，得到几何完整的物体表征。
4. **全景增强 AUG + 真机验证**：训练期跨视图变换与语义对齐提一致性；在 360BEV-Matterport 刷新 SOTA 并在真机人形上部署。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 数据集 | 360BEV-Matterport（验证集，MiT-B2 骨干） |
| mIoU | **44.54%**（含 AUG，显著超此前 360BEV 方法） |
| 准确率 Acc | **78.48%** |
| mRecall | **58.32%** |
| mPrecision | **61.52%** |
| 真机 | 人形平台实机部署验证可用性 |

> ⚠️ 上表数值取自论文（v2），具体以正式版为准。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **感知底座换代** | 用全景 + LiDAR 替代前视相机，从源头消除人形自遮挡/盲区，导航更安全 |
| **全景畸变可用化** | SGC 把「全景畸变」从误差源变为可建模的球面几何先验，让 360° 视觉真正能进 BEV |
| **BEV 即接口** | 直接输出 BEV 语义地图，天然对接局部导航 / 占据规划 / 避障等下游模块 |

---

## 🎤 面试参考

**Q：为什么人形机器人特别需要全景感知，而不是继续用前视相机？**
A：人形形态决定了头小、躯干和手臂会遮挡相机，前视方案存在大片盲区且 FoV 受限，转身、避障、贴身操作时环境信息严重缺失。360° 全景相机能一次性拿到无盲区的周身图像，是从根上补齐人形感知短板。

**Q：全景图有严重畸变，直接喂进 BEV 网络会怎样？HumanoidPano 怎么处理？**
A：直接用会让像素-空间对应关系错乱，融合出的 BEV 几何失真。HumanoidPano 用 SGC——依据全景相机的射线性质做「畸变正则化的采样偏移」，把畸变当成已知的球面几何先验来对齐全景与 LiDAR 深度，再用 SDA 的球面偏移做 360°→BEV 聚合，从而得到几何完整的表征。

**Q：它和 Thinking-in-360 这类全景导航工作定位差异？**
A：Thinking-in-360 偏「全景下的视觉搜索/决策」；HumanoidPano 更底层，聚焦**全景视觉与 LiDAR 的跨模态几何融合**，产出的是 BEV 语义分割地图这一通用感知接口，供各类导航/规划模块复用。

---

## 🔗 相关阅读

- [Thinking in 360 (2511.20351)](https://arxiv.org/abs/2511.20351)：野外场景下的人形全景视觉搜索
- [Humanoid Occupancy (2507.20217)](https://arxiv.org/abs/2507.20217)：人形通用多模态占据感知系统
- [Gallant (2511.14625)](https://arxiv.org/abs/2511.14625)：体素栅格的人形运动与局部导航
- [NavDP (2505.08712)](https://arxiv.org/abs/2505.08712)：特权信息引导的 Sim-to-Real 导航扩散策略
- [DA-Nav (2607.11638)](https://arxiv.org/abs/2607.11638)：方向感知的城市级视觉-语言导航
