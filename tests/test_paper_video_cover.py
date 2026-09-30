"""视频号封面 / 笔记海报沿用最初的片头设计（PPO / AWR / DeepMimic / AMP 那几张封面）。

排版在 scripts/paper_video/stage.html 的 classicCover() 里，render.mjs cover 置 window.__cover 后调用；
这里守住那套数字和接线，免得哪次改视频片头时顺手把封面也改成安全区的小字版。
真正的「不重叠、不越界、不折行」要在浏览器里量：node check_layout.mjs <paper> cover。
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VIDEO = ROOT / "scripts" / "paper_video"


def _classic_cover_source() -> str:
    stage = (VIDEO / "stage.html").read_text(encoding="utf-8")
    start = stage.index("function classicCover(root)")
    return stage[start : stage.index("\n  }\n", start)]


def test_cover_keeps_the_original_intro_design():
    src = _classic_cover_source()
    # 英文大标题 250px、字距 16px；过长改 4px 字距、缩到宽 ≤ 980，在 190–440 带里居中
    assert "font-size:250px;letter-spacing:16px" in src
    assert "letterSpacing = '4px'" in src and "250 * 980" in src
    assert "190 + Math.round((250 - size) / 2)" in src
    # 中文名 70px + 一句话 40px 从 470 起；信息框 34px 从 680 起；目录 40px 紧跟信息框
    assert "font-size:70px" in src and "font-size:40px" in src and "Math.max(470," in src
    assert "m.style.fontSize = '34px'" in src and "Math.max(680," in src
    assert "(rows >= 8 ? 38 : 40)" in src and "m.offsetTop + m.offsetHeight + 24" in src
    # 块与块只往下推、不缩放整张图
    assert "scale(" not in src


def test_cover_mode_is_wired_to_classic_cover():
    stage = (VIDEO / "stage.html").read_text(encoding="utf-8")
    assert re.search(r"if \(window\.__cover && key === 'intro'\) classicCover\(sc\.root\);", stage)
    render = (VIDEO / "render.mjs").read_text(encoding="utf-8")
    assert "window.__cover = true" in render
    check = (VIDEO / "check_layout.mjs").read_text(encoding="utf-8")
    assert "mode === 'cover'" in check


def test_cover_rule_is_documented():
    agents = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
    readme = (VIDEO / "README.md").read_text(encoding="utf-8")
    assert "视频号封面 / 笔记海报必须保持最初的片头设计" in agents
    assert "check_layout.mjs <paper> cover" in agents
    assert "## 封面（视频号封面 / 笔记海报）" in readme
