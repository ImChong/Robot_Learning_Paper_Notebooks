"""Tests for the pure helpers in ``scripts.prepare_pages``."""

from scripts import prepare_pages
from scripts.prepare_pages import extract_arxiv, normalize_name


def test_normalize_name_basic():
    """Test basic lowercase conversion."""
    assert normalize_name("Hello World") == "hello world"


def test_normalize_name_lowercase():
    """Test that all characters are lowercased."""
    assert normalize_name("PYTHON") == "python"


def test_normalize_name_special_chars():
    """Test removal of special characters."""
    assert normalize_name("Paper Title: Subtitle!") == "paper title subtitle"


def test_normalize_name_extra_spaces():
    """Test collapsing multiple spaces and stripping."""
    assert normalize_name("  extra   spaces  ") == "extra spaces"


def test_normalize_name_alphanumeric():
    """Test that alphanumeric characters are preserved and others removed."""
    assert normalize_name("Agent-007") == "agent007"


def test_normalize_name_empty_after_cleaning():
    """Test strings that become empty after cleaning."""
    assert normalize_name("!!!") == ""


def test_normalize_name_numbers():
    """Test strings with numbers."""
    assert normalize_name("123 test 456") == "123 test 456"


def test_normalize_name_mixed():
    """Test complex mixed input."""
    assert normalize_name(" [2024] Paper_Name (ArXiv) ") == "2024 papername arxiv"


def test_extract_arxiv_table_all_caps_header():
    """Table rows may spell ARXIV in all caps; extraction must not short-circuit."""
    body = "| ARXIV | 1234.5678 |\n"
    assert extract_arxiv(body) == "1234.5678"


def test_extract_arxiv_abs_url_all_caps_host():
    """Abs links may use an all-caps host; the pre-check must not skip them."""
    body = "Paper: https://ARXIV.ORG/abs/9876.54321\n"
    assert extract_arxiv(body) == "9876.54321"


def test_extract_arxiv_no_mention_returns_none():
    """No arxiv token anywhere → no ID (cheap path)."""
    assert extract_arxiv("Only doi:10.1000/182 and no preprint link.") is None


def test_parse_high_impact_h_order_reads_h_rows(tmp_path, monkeypatch):
    """``Hn`` first-column rows map titles and arXiv IDs to integer order."""
    progress = tmp_path / "PROGRESS.md"
    progress.write_text(
        "| # | 论文 | 来源 |\n"
        "|---|------|------|\n"
        "| H1 | [Short Paper Name](https://arxiv.org/abs/1111.11111) | x |\n"
        "| H2 | [Other](https://arxiv.org/abs/2222.22222v2) | y |\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(prepare_pages, "PROGRESS_PATH", str(progress))
    by_name, by_arxiv = prepare_pages.parse_high_impact_h_order()
    assert by_arxiv["1111.11111"] == 1
    assert by_arxiv["2222.22222"] == 2
    assert by_name[normalize_name("Short Paper Name")] == 1


def test_match_high_impact_h_order_prefers_arxiv():
    """When title text drifts from PROGRESS, arXiv still pins the H index."""
    by_name = {normalize_name("Progress Title Only"): 5}
    by_arxiv = {"3333.33333": 7}
    got = prepare_pages.match_high_impact_h_order(
        "Different Title on Disk",
        "Some_Dir",
        "3333.33333",
        by_name,
        by_arxiv,
    )
    assert got == 7


def test_sort_papers_by_arxiv_newest_first():
    papers = [
        {"title": "old", "arxiv": "2001.00001", "_order": 1},
        {"title": "new", "arxiv": "2501.00001", "_order": 2},
    ]
    prepare_pages.sort_papers_by_arxiv(papers, newest_first=True)
    assert [p["title"] for p in papers] == ["new", "old"]


def test_sort_papers_by_arxiv_oldest_first():
    papers = [
        {"title": "new", "arxiv": "2501.00001", "_order": 2},
        {"title": "old", "arxiv": "2001.00001", "_order": 1},
    ]
    prepare_pages.sort_papers_by_arxiv(papers, newest_first=False)
    assert [p["title"] for p in papers] == ["old", "new"]


def test_sort_papers_by_published_date_uses_shown_date():
    """Displayed date wins over arXiv id: no-arXiv and release-dated notes
    sort by the date printed on the card, not by arXiv-id position."""
    papers = [
        # No arXiv id, dated ~Sep 2025 — must NOT sort first.
        {"title": "platform", "published_date_zh": "2025年9月 research page"},
        {"title": "old", "arxiv": "2404.05695", "published_date_zh": "2024年4月8日（arXiv）"},
        # arXiv 2409 (Sep 2024) but dated by a Dec 2025 release — must sort last.
        {"title": "release", "arxiv": "2409.14393", "published_date_zh": "2025年12月2日（GitHub v3 发布）"},
        {"title": "mid", "arxiv": "2503.05652", "published_date_zh": "2025年3月7日（arXiv）"},
    ]
    prepare_pages.sort_papers_by_published_date(papers)
    assert [p["title"] for p in papers] == ["old", "mid", "platform", "release"]


def test_published_date_sort_key_falls_back_to_arxiv():
    """When no ``published_date_zh`` is present, fall back to the arXiv id."""
    assert prepare_pages._published_date_sort_key({"arxiv": "2404.05695"}) == (2024, 4, 0)
    assert prepare_pages._published_date_sort_key(
        {"published_date_zh": "2020年10月21日"}
    ) == (2020, 10, 21)
    assert prepare_pages._published_date_sort_key({}) == (-1, -1, -1)


def test_category_sort_policy_constants():
    """Only foundational RL keeps PROGRESS order; motion retargeting & high impact are oldest-first."""
    assert prepare_pages.CATEGORIES_PROGRESS_ORDER == frozenset({"01_Foundational_RL"})
    assert prepare_pages.CATEGORIES_ARXIV_OLDEST_FIRST == frozenset({
        "02_Motion_Retargeting",
        "03_High_Impact_Selection",
    })


def test_apply_sort_order_hint_category_and_subcategories():
    entry = {"subcategories": [{"name": "Whole-Body Control Core", "papers": []}]}
    prepare_pages.apply_sort_order_hint(entry, "03_High_Impact_Selection")
    assert "旧→新" in entry["sort_order_hint_zh"]
    assert entry["subcategories"][0]["sort_order_hint_zh"].startswith("论文标签按发表时间")

    newest_entry = {}
    prepare_pages.apply_sort_order_hint(newest_entry, "04_Loco-Manipulation_and_WBC")
    assert "新→旧" in newest_entry["sort_order_hint_zh"]


def test_is_zhname_description_flags_method_summaries():
    assert prepare_pages.is_zhname_description(
        "CMR：把含噪观测映射到「收缩」潜空间，让扰动随时间自然衰减——对比学习保任务信息"
    )
    assert not prepare_pages.is_zhname_description(
        "HOVER：面向人形机器人的多模态通用神经全身控制器"
    )
    assert not prepare_pages.is_zhname_description(
        "FAST：通过预训练与快速适应实现通用人形机器人全身控制"
    )


def test_resolve_zh_card_title_prefers_explicit_zh_title():
    meta = {"zh_title": "卡片标题", "zhname": "CMR：把含噪观测映射到潜空间——方法摘要"}
    assert prepare_pages.resolve_zh_card_title(meta, {}, meta["zhname"]) == "卡片标题"


def test_resolve_zh_card_title_uses_zhname_when_title_like():
    zhname = "HOVER：面向人形机器人的多模态通用神经全身控制器"
    assert prepare_pages.resolve_zh_card_title({"zhname": zhname}, {}, zhname) == zhname


def test_resolve_zh_card_title_skips_description_zhname():
    zhname = "CMR：把含噪观测映射到「收缩」潜空间，让扰动随时间自然衰减——对比学习保任务信息"
    assert prepare_pages.resolve_zh_card_title({"zhname": zhname}, {}, zhname) is None


def test_extract_summary_takes_first_paragraph_as_plain_text():
    content = (
        "# T\n\n## 🎯 一句话总结\n\n"
        "PPO 通过一个简单的**裁剪机制**，让 [策略](https://x) 更新 `clip` 既大胆又安全。\n\n"
        "> 🎮 本文内嵌 1 段动画\n\n## 下一节\n"
    )
    assert prepare_pages.extract_summary(content) == "PPO 通过一个简单的裁剪机制，让 策略 更新 clip 既大胆又安全。"


def test_extract_summary_accepts_blockquote_and_other_heading_wording():
    content = "## 🎯 一句话理解\n\n> 先训教师，\n> 再蒸馏学生。\n\n---\n"
    assert prepare_pages.extract_summary(content) == "先训教师， 再蒸馏学生。"
    assert prepare_pages.extract_summary("## ❓ 要解决什么问题\n\n正文") is None


def test_extract_summary_starts_at_the_sentence_naming_the_paper():
    content = "## 🎯 一句话总结\n\n仿真和真机对不上。常见补法都不够。ASAP 换了一个对象去学：学动作残差。\n"
    assert prepare_pages.extract_summary(content, "ASAP") == "ASAP 换了一个对象去学：学动作残差。"
    # 简称只出现在第一句时不跳。
    assert prepare_pages.extract_summary("## 🎯 一句话总结\n\nASAP 学残差。再部署。\n", "ASAP") == "ASAP 学残差。再部署。"


def test_cut_summary_keeps_whole_sentences_and_never_splits_math():
    first, second = "甲" * 70 + "。", "乙" * 70 + "。"
    assert prepare_pages._cut_summary(first + second) == first
    cut = prepare_pages._cut_summary("丙" * 110 + "，写成 $\\lVert x \\rVert$ 的上界" + "丁" * 30)
    assert cut.endswith("…") and cut.count("$") % 2 == 0
    assert len(cut) <= prepare_pages.SUMMARY_MAX_CHARS


def test_paper_short_name():
    assert prepare_pages.paper_short_name("Proximal Policy Optimization Algorithms (PPO)") == "PPO"
    assert prepare_pages.paper_short_name("BFM-Zero: A Promptable Behavioral Foundation Model") == "BFM-Zero"
    assert prepare_pages.paper_short_name("Learning Agile Soccer Skills for a Bipedal Robot") is None


def test_extract_explainer_scenes_reads_chinese_numerals():
    assert prepare_pages.extract_explainer_scenes("## 🎬 五幕动画：PPO 全流程 {#a}") == 5
    assert prepare_pages.extract_explainer_scenes("## 🎬 十二幕动画：ASAP") == 12
    assert prepare_pages.extract_explainer_scenes("## 🎬 十幕动画") == 10
    assert prepare_pages.extract_explainer_scenes("## 🎬 9幕动画") == 9
    assert prepare_pages.extract_explainer_scenes("## 📺 配音讲解视频") is None


def _mp4_box(kind, payload):
    return (8 + len(payload)).to_bytes(4, "big") + kind + payload


def test_mp4_duration_seconds_reads_mvhd_after_mdat(tmp_path):
    mvhd = _mp4_box(b"mvhd", bytes(4) + bytes(8) + (1000).to_bytes(4, "big") + (230378).to_bytes(4, "big"))
    video = tmp_path / "v.mp4"
    video.write_bytes(_mp4_box(b"ftyp", b"isom" + bytes(4)) + _mp4_box(b"mdat", bytes(64)) + _mp4_box(b"moov", mvhd))
    assert prepare_pages.mp4_duration_seconds(str(video)) == 230
    assert prepare_pages.mp4_duration_seconds(str(tmp_path / "missing.mp4")) is None


def test_extract_video_seconds_resolves_the_note_media_path(tmp_path):
    mvhd = _mp4_box(b"mvhd", bytes(4) + bytes(8) + (600).to_bytes(4, "big") + (600 * 676).to_bytes(4, "big"))
    (tmp_path / "media").mkdir()
    (tmp_path / "media" / "x.mp4").write_bytes(_mp4_box(b"moov", mvhd))
    note = '<div class="paper-demo" data-demo="x-video" data-src="media/x.mp4" data-poster="p.jpg"></div>'
    assert prepare_pages.extract_video_seconds(str(tmp_path / "note.md"), note) == 676
    assert prepare_pages.extract_video_seconds(str(tmp_path / "note.md"), "无视频") is None
