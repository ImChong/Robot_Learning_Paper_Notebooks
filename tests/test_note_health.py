"""笔记健康度（issue #701）：六项各 1 分、缺项能说清、缺字段不虚报、草稿 / 占位封顶。

``scripts/note_health.py`` 算分，``prepare_pages`` 写进 ``_data/papers.json``，
``_includes/paper-card.html`` 画六格小条，``assets/js/note-health.js`` 弹逐项清单。
"""

import json
import re
from pathlib import Path

import pytest

from scripts import note_health as nh
from scripts import prepare_pages

ROOT = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# 一篇可以按需拼装的笔记


def _mp4(seconds: int) -> bytes:
    def box(kind, payload):
        return (8 + len(payload)).to_bytes(4, "big") + kind + payload

    mvhd = box(b"mvhd", bytes(4) + bytes(8) + (1000).to_bytes(4, "big") + (seconds * 1000).to_bytes(4, "big"))
    return box(b"ftyp", b"isom" + bytes(4)) + box(b"mdat", bytes(32)) + box(b"moov", mvhd)


PARA = "这一段是实质内容，写清楚了论文在这一部分做了什么、为什么这样做、和前人有什么不同。" * 2

FULL = {
    "metadata": """## 📋 基本信息

| 项目 | 链接 |
|---|---|
| **arXiv** | [2401.00001](https://arxiv.org/abs/2401.00001) |
| **作者** | A. Author |
| **发布时间** | 2024年1月2日（arXiv） |
""",
    "skeleton": f"""## ❓ 这篇论文要解决什么问题？

{PARA}

## 🔧 方法详解

{PARA}

## 📊 实验结果

{PARA}

## ⚠️ 局限

{PARA}
""",
    "animation": '## 🎬 五幕动画\n\n<div class="paper-demo" data-demo="toy-explainer"><p class="demo-fallback">（需要 JS）</p></div>\n',
    "video": '## 📺 配音讲解视频\n\n<div class="paper-demo" data-demo="toy-video" data-src="media/toy.mp4" data-poster="media/toy.jpg"><p class="demo-fallback">（需要 JS）</p></div>\n',
    "example": """## 🚶 具体实例

设 $\\epsilon = 0.2$，优势 $A = 1.5$，概率比 $r = 1.3$：裁剪后取 $\\min(1.3 \\times 1.5, 1.2 \\times 1.5) = 1.8$。
第 2 步把学习率从 0.0003 降到 0.0001，训练 4096 个环境、每轮 24 步，一共 98304 个样本。
这几个数都能在正文和源码里对上，读者可以照着手算一遍，得到同样的结果，再和论文表 2 的 1.8 对照。
最后把 1.8 换成 0.5、把 $\\epsilon$ 换成 0.1，再算一遍：裁剪区间收窄到 0.9 到 1.1，这条样本的梯度被截断，
更新量从 1.8 降到 1.65，和第 3 节说的「步子迈不大」对得上。
""",
}


@pytest.fixture()
def demo_dir(tmp_path):
    d = tmp_path / "demos"
    d.mkdir()
    (d / "kit.js").write_text("window.PaperDemoKit = {}; K.mount({ 'kit-only': x });", encoding="utf-8")
    (d / "toy.js").write_text(
        "(function(){ var K = window.PaperDemoKit;\n"
        "  K.mount({\n    'toy-explainer': a,\n    'toy-video': b,\n    'toy-extra': function (host) {\n"
        "      K.explainer(host, { title: 'x', notes: [] });\n    }\n  });\n})();\n",
        encoding="utf-8",
    )
    return str(d)


def _note(tmp_path, *, drop=(), front="", extra="", video_seconds=230, with_demos=True):
    note_dir = tmp_path / "papers" / "05_Locomotion" / "Toy"
    (note_dir / "media").mkdir(parents=True, exist_ok=True)
    video = note_dir / "media" / "toy.mp4"
    if video_seconds is None:
        video.unlink(missing_ok=True)
    else:
        video.write_bytes(_mp4(video_seconds))
    fm = 'layout: paper\ntitle: "Toy Paper"\n'
    if with_demos:
        fm += 'demos: ["toy"]\n'
    fm += front
    body = "# Toy Paper\n**一句话简要描述**\n\n" + "\n".join(v for k, v in FULL.items() if k not in drop) + extra
    path = note_dir / "Toy.md"
    path.write_text(f"---\n{fm}---\n\n{body}", encoding="utf-8")
    return path


def _health(path, demo_dir):
    return nh.compute_note_health(path.read_text(encoding="utf-8"), str(path), demo_dir=demo_dir)


DONE = "original_check: done\noriginal_check_date: 2026-11-08\n"

# ---------------------------------------------------------------------------
# 0–6 分


def test_all_six_items_score_six(tmp_path, demo_dir):
    h = _health(_note(tmp_path, front=DONE), demo_dir)
    assert (h.score, h.gaps, h.status) == (6, [], None)
    assert nh.health_summary(h)["zh"] == "笔记健康度 6/6，六项齐全"


@pytest.mark.parametrize(
    "drop, expected_gaps",
    [
        (("example",), ["example"]),
        (("video", "example"), ["video", "example"]),
        (("animation", "video", "example"), ["animation", "video", "example"]),
        (("skeleton", "animation", "video", "example"), ["skeleton", "animation", "video", "example"]),
        (("metadata", "skeleton", "animation", "video", "example"), ["metadata", "skeleton", "animation", "video", "example"]),
    ],
)
def test_each_missing_item_costs_one_point(tmp_path, demo_dir, drop, expected_gaps):
    h = _health(_note(tmp_path, drop=drop, front=DONE), demo_dir)
    assert h.gaps == expected_gaps
    assert h.score == 6 - len(expected_gaps)
    for item in expected_gaps:
        assert h.reasons[item], f"缺 {item} 时要写明原因"


def test_empty_note_scores_zero_and_lists_every_item(tmp_path, demo_dir):
    path = tmp_path / "papers" / "05_Locomotion" / "Empty" / "Empty.md"
    path.parent.mkdir(parents=True)
    path.write_text('---\nlayout: paper\ntitle: "Empty"\n---\n\n' + "正文。\n" * 200, encoding="utf-8")
    h = _health(path, demo_dir)
    assert h.score == 0
    assert h.gaps == list(nh.HEALTH_ITEMS)
    summary = nh.health_summary(h)
    for zh, en, *_ in nh.HEALTH_LABELS.values():
        assert zh in summary["zh"] and en.lower() in summary["en"]


# ---------------------------------------------------------------------------
# 缺字段不虚报：原文核验


def test_missing_original_check_is_not_treated_as_done(tmp_path, demo_dir):
    h = _health(_note(tmp_path), demo_dir)
    assert h.score == 5 and h.gaps == ["verification"]
    assert "original_check" in h.reasons["verification"]


@pytest.mark.parametrize(
    "front, needle",
    [
        ("original_check: partial\noriginal_check_date: 2026-11-08\n", "一部分"),
        ("original_check: abstract\n", "摘要"),
        ("original_check: done\n", "缺少日期"),
        ("original_check: done\noriginal_check_date: 上周\n", "缺少日期"),
        ("original_check: maybe\noriginal_check_date: 2026-11-08\n", "未完成"),
    ],
)
def test_only_a_dated_done_counts_as_verified(tmp_path, demo_dir, front, needle):
    h = _health(_note(tmp_path, front=front), demo_dir)
    assert "verification" in h.gaps
    assert needle in h.reasons["verification"]


def test_done_contradicted_by_abstract_only_disclaimer_does_not_count(tmp_path, demo_dir):
    disclaimer = "\n> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。\n"
    h = _health(_note(tmp_path, front=DONE, extra=disclaimer), demo_dir)
    assert h.gaps == ["verification"]
    assert "摘要" in h.reasons["verification"]
    h = _health(_note(tmp_path, extra=disclaimer), demo_dir)
    assert "自述依据摘要整理" in h.reasons["verification"]


def test_long_notes_are_not_assumed_to_be_read_in_full(tmp_path, demo_dir):
    padding = "\n## 📎 附录\n\n" + (PARA + "\n\n") * 300
    h = _health(_note(tmp_path, extra=padding), demo_dir)
    assert "verification" in h.gaps


# ---------------------------------------------------------------------------
# 资源失效 / 占位不计分：动画与视频分开查


def test_unregistered_or_unloaded_demo_is_only_a_placeholder(tmp_path, demo_dir):
    h = _health(_note(tmp_path, front=DONE, with_demos=False), demo_dir)
    # 没在 front matter 里声明 bundle：脚本不会加载，动画和视频都放不出来。
    assert h.gaps == ["animation", "video"]

    ghost = '<div class="paper-demo" data-demo="ghost-explainer"><p class="demo-fallback">x</p></div>\n'
    h = _health(_note(tmp_path, front=DONE, drop=("animation",), extra=ghost), demo_dir)
    assert h.gaps == ["animation"]
    assert "ghost-explainer" in h.reasons["animation"]


def test_video_needs_a_real_mp4_and_does_not_count_as_animation(tmp_path, demo_dir):
    h = _health(_note(tmp_path, front=DONE, drop=("animation",)), demo_dir)
    assert h.gaps == ["animation"], "只有配音视频时，动画讲解那一分不能白给"

    h = _health(_note(tmp_path, front=DONE, video_seconds=None), demo_dir)
    assert h.gaps == ["video"] and "不存在" in h.reasons["video"]

    path = _note(tmp_path, front=DONE)
    (path.parent / "media" / "toy.mp4").write_bytes(b"not an mp4")
    h = _health(path, demo_dir)
    assert h.gaps == ["video"] and "读不出时长" in h.reasons["video"]


def test_demo_registry_reads_k_mount_keys_only(demo_dir):
    reg = nh._bundle_registry(demo_dir)
    assert reg == {"toy-explainer": "toy", "toy-video": "toy", "toy-extra": "toy"}


def test_real_demo_registry_covers_every_placeholder_in_explainer_notes():
    reg = nh._bundle_registry(nh.DEMO_JS_DIR)
    assert reg["ppo-explainer"] == "ppo" and reg["ppo-video"] == "ppo"
    assert "kit-only" not in reg


# ---------------------------------------------------------------------------
# 阅读骨架与具体实例：看标题对上的小节有没有实质内容，不看全文字数


def test_skeleton_names_the_missing_group_and_ignores_placeholders(tmp_path, demo_dir):
    no_results = FULL["skeleton"].replace("## 📊 实验结果\n\n" + PARA, "## 📊 实验结果\n\n🚧 待补充")
    path = _note(tmp_path, front=DONE, drop=("skeleton",), extra=no_results)
    h = _health(path, demo_dir)
    assert h.gaps == ["skeleton"]
    assert "实验 / 结果" in h.reasons["skeleton"]
    assert "研究问题" not in h.reasons["skeleton"]


def test_skeleton_aliases_for_hardware_notes(tmp_path, demo_dir):
    hw = FULL["skeleton"].replace("## 🔧 方法详解", "## 🦿 执行器设计").replace("## 📊 实验结果", "## 📏 台架测试")
    path = _note(tmp_path, front=DONE, drop=("skeleton",), extra=hw)
    content = path.read_text(encoding="utf-8")
    generic = nh.compute_note_health(content, str(path), demo_dir=demo_dir, category_dir="05_Locomotion")
    hardware = nh.compute_note_health(content, str(path), demo_dir=demo_dir, category_dir="12_Hardware_Design")
    assert "skeleton" in generic.gaps
    assert "skeleton" not in hardware.gaps


def test_example_needs_checkable_numbers(tmp_path, demo_dir):
    vague = "\n## 🚶 具体实例\n\n" + "比如让机器人在家里收拾桌子、在工厂搬箱子，这些场景都能用上这个方法。" * 6 + "\n"
    h = _health(_note(tmp_path, front=DONE, drop=("example",), extra=vague), demo_dir)
    assert h.gaps == ["example"] and "数字" in h.reasons["example"]


def test_headings_inside_code_blocks_are_ignored():
    content = "# T\n\n```python\n## 🚶 具体实例\n# 不是标题\n```\n\n## 🔧 方法\n\n正文\n"
    titles = [s.title for s in nh.iter_sections(content)]
    assert titles == ["T", "🔧 方法"]


def test_folded_html_headings_are_sections():
    content = '## 🚶 具体实例\n\n<details class="paper-fold" markdown="1">\n<h3 id="a">第 1 步：算</h3>\n\n正文\n</details>\n'
    sections = nh.iter_sections(content)
    assert [(s.level, s.title) for s in sections] == [(2, "🚶 具体实例"), (3, "第 1 步：算")]


# ---------------------------------------------------------------------------
# 草稿 / 占位封顶


@pytest.mark.parametrize("status, cap", [("draft", 4), ("stub", 2)])
def test_draft_and_stub_cap_the_score(tmp_path, demo_dir, status, cap):
    h = _health(_note(tmp_path, front=DONE + f"status: {status}\n"), demo_dir)
    assert h.raw_score == 6 and h.score == cap and h.status == status
    assert "status" in h.reasons
    fields = nh.health_fields(h)
    assert fields["health_status"] == status
    assert f"封顶 {cap}/6" in fields["health_label_zh"]


def test_detected_placeholder_note_is_capped_as_stub(tmp_path, demo_dir):
    path = _note(tmp_path, front=DONE, extra="\n> 🧭 状态: 占位笔记，正文待补充。\n")
    h = _health(path, demo_dir)
    assert h.status == "stub" and h.score == 2


# ---------------------------------------------------------------------------
# 写进 papers.json 与首页


def test_prepare_pages_writes_health_fields_and_item_labels(tmp_path, monkeypatch):
    note = _note(tmp_path, front=DONE)
    demos = tmp_path / "assets" / "js" / "demos"
    demos.mkdir(parents=True)
    (demos / "toy.js").write_text("K.mount({ 'toy-explainer': a, 'toy-video': b });", encoding="utf-8")
    (tmp_path / "papers" / "PROGRESS.md").write_text("| # | 论文 | 状态 |\n|---|---|---|\n", encoding="utf-8")
    monkeypatch.setattr(prepare_pages, "BASE_DIR", str(tmp_path))
    monkeypatch.setattr(prepare_pages, "PAPERS_DIR", str(tmp_path / "papers"))
    monkeypatch.setattr(prepare_pages, "PROGRESS_PATH", str(tmp_path / "papers" / "PROGRESS.md"))

    prepare_pages.process_papers()
    data = json.loads((tmp_path / "_data" / "papers.json").read_text(encoding="utf-8"))
    entry = data["05_Locomotion"]["papers"][0]
    assert entry["health_score"] == 6 and entry["health_gaps"] == []
    assert entry["health_label_en"] == "Note health 6/6; all six items present"

    # 改了笔记就重新算，不沿用上一次的分数。
    note.write_text(note.read_text(encoding="utf-8").replace(DONE, ""), encoding="utf-8")
    prepare_pages.process_papers()
    entry = json.loads((tmp_path / "_data" / "papers.json").read_text(encoding="utf-8"))["05_Locomotion"]["papers"][0]
    assert entry["health_score"] == 5 and entry["health_gaps"] == ["verification"]

    items = json.loads((tmp_path / "_data" / "note_health.json").read_text(encoding="utf-8"))
    assert items["max"] == 6
    assert [i["key"] for i in items["items"]] == list(nh.HEALTH_ITEMS)
    assert items["status"] == {"stub": {"zh": "占位稿", "en": "stub", "cap": 2}, "draft": {"zh": "草稿", "en": "draft", "cap": 4}}


def test_every_indexed_note_has_a_consistent_health_entry():
    data = json.loads((ROOT / "_data" / "papers.json").read_text(encoding="utf-8"))
    entries = [p for cat in data.values() for p in cat["papers"] + [q for s in cat.get("subcategories", []) for q in s["papers"]]]
    assert entries
    for p in entries:
        assert "health_score" in p, f"{p['path']} 没有健康度：改了笔记后要重跑 python3 scripts/prepare_pages.py"
        score, gaps = p["health_score"], p["health_gaps"]
        assert 0 <= score <= 6 - len(gaps), p["path"]
        assert set(gaps) <= set(nh.HEALTH_ITEMS), p["path"]
        assert p["health_label_zh"].startswith(f"笔记健康度 {score}/6"), p["path"]
        front = (ROOT / p["path"]).read_text(encoding="utf-8").split("\n---", 1)[0]
        if not re.search(r"^original_check:\s*(done|complete|completed|已完成)\s*$", front, re.M):
            assert "verification" in gaps, f"{p['path']} 没有记录原文核验，不能拿这一分"


def test_card_template_only_draws_the_bar_for_computed_scores():
    card = (ROOT / "_includes" / "paper-card.html").read_text(encoding="utf-8")
    assert "include.paper.health_score != nil" in card
    assert 'role="img"' in card and "data-zh-aria-label" in card and "data-en-aria-label" in card
    assert "data-health-gaps" in card and "data-health-status" in card
    # 小条在卡片的 <a> 里，开源标记照旧留在最后。
    assert card.index("paper-health") < card.index("paper-opensource") < card.index("</a>")


def test_index_ships_the_item_labels_and_tooltip_script():
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    assert '<script type="application/json" id="note-health-data">{{ site.data.note_health | jsonify }}</script>' in index
    assert "/assets/js/note-health.js" in index
    assert "data-health-legend" in index
    js = (ROOT / "assets" / "js" / "note-health.js").read_text(encoding="utf-8")
    assert "note-health-data" in js
    # 触屏点小条只弹清单、不跳转；鼠标点小条照常进入笔记。
    assert "e.preventDefault()" in js and "lastPointer === 'mouse'" in js
    assert "cl-lang-changed" in js


def test_health_colours_are_defined_for_both_themes():
    css = (ROOT / "assets" / "css" / "style.css").read_text(encoding="utf-8")
    for token in ("--health-off", "--health-none", "--health-low", "--health-mid", "--health-high"):
        assert css.count(token + ":") == 2, f"{token} 需要在深色与浅色主题下各定义一次"
    for score in range(7):
        assert f".paper-health--{score}" in css


def test_roadmap_nodes_and_cards_show_health():
    """学习路线图：节点年份旁画同一套六格小条，悬浮卡片与读屏文字带上分数和缺项。"""
    tree = (ROOT / "_includes" / "roadmap-tree.html").read_text(encoding="utf-8")
    assert "{%- if tt_paper.health_score != nil %}" in tree
    assert "tt-node-health paper-health paper-health--{{ tt_paper.health_score }}" in tree
    detail = tree.split("{%- capture tt_detail -%}", 1)[1].split("{%- endcapture -%}", 1)[0]
    for field in ("health_score", "health_gaps", "health_status", "health_label_en", "health_label_zh"):
        assert f"tt_paper.{field} | jsonify" in detail, field
    js = (ROOT / "assets" / "js" / "roadmap.js").read_text(encoding="utf-8")
    assert "healthRow(body, info, zh)" in js
    # 节点的 aria-label 也带上健康度（中英随语言切换时 labelNode 会重算）。
    label_node = js.split("function labelNode(node) {", 1)[1].split("\n  }\n", 1)[0]
    assert "info.health_label_zh" in label_node and "info.health_label" in label_node
