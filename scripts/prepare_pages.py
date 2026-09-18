#!/usr/bin/env python3
"""
Prepare paper markdown files for Jekyll:
1. Add minimal front matter if not present (Jekyll requires it to process files)
2. Generate index data (category -> papers mapping) ordered by README appearance
"""

import json
import os
import re
import sys

# Allow running both as a script (``python scripts/prepare_pages.py``) and as a
# module (``from scripts.prepare_pages import normalize_name`` in tests).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import (  # noqa: E402
    BASE_DIR,
    PAPERS_DIR,
    SKIP_DIRS,
    has_frontmatter,
    is_stub,
    normalize_kramdown_math_emphasis,
    normalize_kramdown_math_pipes,
    normalize_name,
    normalize_paper_meta_blockquotes,
    parse_frontmatter,
    stub_reason,
)

PROGRESS_PATH = os.path.join(PAPERS_DIR, "PROGRESS.md")

# Keep homepage category order aligned with
# https://github.com/YanjieZe/awesome-humanoid-robot-learning.
CATEGORY_ORDER = [
    "01_Foundational_RL",
    "02_Motion_Retargeting",
    "03_High_Impact_Selection",
    "04_Loco-Manipulation_and_WBC",
    "06_Manipulation",
    "07_Teleoperation",
    "05_Locomotion",
    "08_Navigation",
    "09_State_Estimation",
    "10_Sim-to-Real",
    "12_Hardware_Design",
    "11_Simulation_Benchmark",
    "13_Physics-Based_Animation",
    "14_Human_Motion",
]

# Canonical Chinese category names aligned with upstream section semantics.
CATEGORY_ZHNAME = {
    "01_Foundational_RL": "基础强化学习",
    "02_Motion_Retargeting": "运动重定向",
    "03_High_Impact_Selection": "高影响力精选",
    "04_Loco-Manipulation_and_WBC": "运动操作与全身控制",
    "05_Locomotion": "行走运动",
    "06_Manipulation": "灵巧操作",
    "07_Teleoperation": "遥操作",
    "08_Navigation": "导航",
    "09_State_Estimation": "状态估计",
    "10_Sim-to-Real": "仿真到现实",
    "11_Simulation_Benchmark": "仿真与基准",
    "12_Hardware_Design": "硬件设计",
    "13_Physics-Based_Animation": "物理动画",
    "14_Human_Motion": "人体动作分析与生成",
}

# Categories that keep curated reading order from PROGRESS / front matter
# instead of arXiv-based sorting.
#
# Other modules default to arXiv newest-first (新→旧). Motion retargeting and
# high-impact selection (including all subcategories) use oldest-first (旧→新).

# ⚡ Bolt Optimization: Globally pre-compile regular expressions used inside loops
# and high-frequency functions to prevent the regex engine from re-parsing the
# pattern on every iteration, reducing CPU overhead and allocation churn.
_EMPTY_TABLE_ROW_RE = re.compile(r"^\|[\s\-:|]+\|$")
_DASH_ROW_RE = re.compile(r"^-+$")
_LABEL_STARS_RE = re.compile(r"\*+")
_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
_MD_CHARS_RE = re.compile(r"[*_`\[\]]")
_CATEGORY_PREFIX_RE = re.compile(r"^\d+_")
_ARXIV_ID_PARTS_RE = re.compile(r"^(\d{2})(\d{2})\.(\d{4,5})(?:v\d+)?$")
# Matches the "YYYY年M月[D日]" prefix of a curated ``published_date_zh`` value.
_PUBLISHED_DATE_ZH_RE = re.compile(r"(\d{4})\s*年\s*(\d{1,2})\s*月(?:\s*(\d{1,2})\s*日)?")
_ARXIV_VERSION_SUFFIX_RE = re.compile(r"v\d+$")
_ARXIV_FALLBACK_RE = re.compile(r"arxiv", re.IGNORECASE)
_ARXIV_PATTERNS = [
    re.compile(r"\|\s*(?:\*\*)?arXiv(?:\*\*)?\s*\|\s*\[?(\d{4}\.\d{4,5}(?:v\d+)?)", re.IGNORECASE),
    re.compile(r"(?:arXiv:|arxiv\.org/(?:abs|html|pdf)/)(\d{4}\.\d{4,5}(?:v\d+)?)", re.IGNORECASE),
]

CATEGORIES_PROGRESS_ORDER = frozenset({
    "01_Foundational_RL",
})

CATEGORIES_ARXIV_OLDEST_FIRST = frozenset({
    "02_Motion_Retargeting",
    "03_High_Impact_Selection",
})

CATEGORY_SORT_ORDER_HINT = {
    "01_Foundational_RL": {
        "en": "Paper tags ordered by recommended learning path",
        "zh": "论文标签按推荐阅读路线顺序排列",
    },
    "02_Motion_Retargeting": {
        "en": "Paper tags ordered by arXiv date, oldest first",
        "zh": "论文标签按 arXiv 发表时间旧→新排列",
    },
    "03_High_Impact_Selection": {
        "en": "Paper tags ordered by publication date, oldest first (same within subcategories)",
        "zh": "论文标签按发表时间旧→新排列（各子模块同理）",
    },
}

DEFAULT_SORT_ORDER_HINT = {
    "en": "Paper tags ordered by arXiv date, newest first",
    "zh": "论文标签按 arXiv 发表时间新→旧排列",
}

_SUBCATEGORY_SORT_ORDER_HINT = {
    "en": "Paper tags ordered by publication date, oldest first",
    "zh": "论文标签按发表时间旧→新排列",
}


def apply_sort_order_hint(entry, category_dir):
    """Attach bilingual sort-order hints for the homepage category block."""
    hint = CATEGORY_SORT_ORDER_HINT.get(category_dir, DEFAULT_SORT_ORDER_HINT)
    entry["sort_order_hint"] = hint["en"]
    entry["sort_order_hint_zh"] = hint["zh"]
    if category_dir in CATEGORIES_ARXIV_OLDEST_FIRST:
        for subcat in entry.get("subcategories", []):
            subcat["sort_order_hint"] = _SUBCATEGORY_SORT_ORDER_HINT["en"]
            subcat["sort_order_hint_zh"] = _SUBCATEGORY_SORT_ORDER_HINT["zh"]


_TITLE_RE = re.compile(r"^#\s+(.+)$", re.MULTILINE)

# Homepage cards should show Chinese paper titles, not one-line method summaries.
_ZHNAME_DESC_REST_PREFIXES = (
    "把",
    "先为",
    "教师",
    "用密集",
    "用可微",
    "用一台",
    "用 VLM",
    "用 2D",
    "用「",
    "让模仿",
    "用一套",
    "一个「",
    "把激光",
)


def is_zhname_description(zhname):
    """Return True when *zhname* reads like a brief method summary, not a paper title."""
    if not zhname:
        return False
    if len(zhname) > 65:
        return True
    if "——" in zhname:
        return True
    if zhname.startswith(("用 CNN", "视触觉预训练", "四个由浅入深", "把四款", "接触密集")):
        return True
    if len(zhname) > 50:
        for sep in ("：", ":"):
            if sep in zhname:
                rest = zhname.split(sep, 1)[1]
                if rest.startswith(_ZHNAME_DESC_REST_PREFIXES):
                    return True
    return False


def resolve_zh_card_title(frontmatter_meta, existing_meta, zhname_value):
    """Resolve the Chinese label for homepage paper cards."""
    explicit = frontmatter_meta.get("zh_title") or existing_meta.get("zh_title")
    if explicit:
        return explicit
    if not zhname_value:
        return None
    if is_zhname_description(zhname_value):
        return None
    return zhname_value


def extract_title(content):
    """Extract title from first H1 heading."""
    start_idx = 0
    # ⚡ Bolt Optimization: Use `find` to skip frontmatter without string copies,
    # and use `find('#')` as a fast pre-check before running the regex.
    if has_frontmatter(content):
        end_idx = content.find("---", 3)
        if end_idx != -1:
            start_idx = end_idx + 3

    # ⚡ Bolt Optimization: Replace re.search with str.find for simple string matching
    if content.find("#", start_idx) == -1:
        return None

    search_idx = start_idx
    while True:
        if content.startswith("# ", search_idx):
            idx = search_idx
        else:
            idx = content.find("\n# ", search_idx)
            if idx != -1:
                idx += 1

        if idx == -1:
            return None

        end_line = content.find("\n", idx)
        if end_line == -1:
            title_text = content[idx + 2:].strip()
        else:
            title_text = content[idx + 2:end_line].strip()

        if title_text:
            return title_text

        search_idx = idx + 2

    return None


# ``is_stub`` and ``normalize_name`` are now provided by ``_common``; we keep
# this module-level binding so ``from scripts.prepare_pages import normalize_name``
# (used by tests) still works.
_ = (is_stub, normalize_name)  # re-exported for backwards compatibility


_BASIC_INFO_SECTION_RE = re.compile(
    r"^##\s*📋\s*基本信息\s*$",
    re.MULTILINE,
)
_PUBLISH_DATE_LABEL_RE = re.compile(r"发布时间|^时间$")
_CODE_ROW_LABEL_RE = re.compile(
    r"(?:代码|源码|GitHub|官方代码|算法代码)",
    re.IGNORECASE,
)
_CODE_ROW_EXCLUDE_LABEL_RE = re.compile(
    r"相关|许可|文档|主页|进阶|配套|同组|项目主页",
    re.IGNORECASE,
)
_NO_OPEN_SOURCE_VALUE_RE = re.compile(
    r"未开源|暂未开源|暂无公开|未见到.*(?:官方|独立)|未集中给出|原文未开源|"
    r"待官方释出|待确认公开|🚧|暂未完全公开|暂无公开仓库",
    re.IGNORECASE,
)
_GITHUB_REPO_URL_RE = re.compile(
    r"https?://(?:www\.)?github\.com/[\w.-]+/[\w.-]+",
    re.IGNORECASE,
)


def _extract_basic_info_section(content):
    """Return markdown under the ``## 📋 基本信息`` heading, or ``None``."""
    # ⚡ Bolt Optimization: Use fast `in` operator to short-circuit regex execution
    # when the heading is absent, and scan for the next heading using `find` instead of
    # `re.search` to avoid regex overhead for simple string prefix matching.
    if "基本信息" not in content:
        return None

    # Fast path to find the exact heading start
    idx = content.find("## 📋 基本信息")
    if idx != -1 and (idx == 0 or content[idx - 1] == '\n'):
        line_end = content.find('\n', idx)
        if line_end == -1:
            line_end = len(content)

        line = content[idx:line_end]
        if line.strip() == "## 📋 基本信息":
            start = line_end
            end = content.find("\n## ", start)
            if end == -1:
                end = len(content)
            return content[start:end]

    # Fallback for weird spacing or custom titles containing "基本信息"
    match = _BASIC_INFO_SECTION_RE.search(content)
    if not match:
        return None
    start = match.end()
    end = content.find("\n## ", start)
    if end == -1:
        end = len(content)
    return content[start:end]


def _clean_table_cell_value(value):
    """Strip markdown links and HTML for plain-text metadata display."""
    value = _MD_LINK_RE.sub(r"\1", value)
    value = re.sub(r"<br\s*/?>", "; ", value, flags=re.IGNORECASE)
    value = _MD_CHARS_RE.sub("", value)
    return " ".join(value.split()).strip()


def extract_published_date(content):
    """Extract publication date from the basic-info table, if present."""
    section = _extract_basic_info_section(content)
    if not section:
        return None

    # ⚡ Bolt Optimization: Use fast native string scanning to completely
    # bypass split('\n') when the table character is missing.
    if "|" not in section:
        return None

    for line in section.split("\n"):
        line = line.strip()
        if not line.startswith("|") or _EMPTY_TABLE_ROW_RE.match(line):
            continue
        cols = [c.strip() for c in line.split("|")]
        cols = [c for c in cols if c]
        if len(cols) < 2:
            continue

        label = _LABEL_STARS_RE.sub("", cols[0]).strip()
        if not _PUBLISH_DATE_LABEL_RE.search(label):
            continue

        value = cols[-1] if len(cols) == 2 else " | ".join(cols[1:])
        cleaned = _clean_table_cell_value(value)
        return cleaned or None

    return None


_MONTH_EN = (
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
)
_MONTH_SHORT = ("", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
_PUBLISH_DATE_YMD_CN_RE = re.compile(r"(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日")
_PUBLISH_DATE_YM_CN_RE = re.compile(r"(\d{4})\s*年\s*(\d{1,2})\s*月(\s*\([^)]+\))?")
_PUBLISH_DATE_Y_VENUE_CN_RE = re.compile(r"(\d{4})\s*年(\s*\([^)]+\))")
_PUBLISH_DATE_Y_CN_RE = re.compile(r"(\d{4})\s*年")
_PUBLISH_DATE_ISO_YMD_RE = re.compile(r"(\d{4})-(\d{2})-(\d{2})\b")
_PUBLISH_DATE_ISO_YM_RE = re.compile(r"(\d{4})-(\d{2})\b")
_PUBLISH_DATE_V_TAG_ISO_RE = re.compile(r"(\d{4}-\d{2}-\d{2})\s+(v\d+)\b", re.IGNORECASE)
_PUBLISH_DATE_V_TAG_CN_RE = re.compile(
    r"(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)\s*(v\d+)\b", re.IGNORECASE
)
_PUBLISH_DATE_EN_PHRASES = (
    ("初版", "initial release"),
    ("项目源自 Orbit / Isaac Gym 生态演进", "evolved from the Orbit / Isaac Gym ecosystem"),
    ("香港 12.15–12.18", "Hong Kong, Dec 15–18"),
    ("仓库 README 标识", "per repository README"),
    ("开放获取", "open access"),
    ("修订", "revised"),
    ("v3 发布", "v3 release"),
)
# Bare year directly followed by a parenthesized venue at the start of the
# string or right after a list separator, e.g. ``2025 (arXiv)`` — venue-year
# tails such as ``RSS 2023`` must stay untouched.
_PUBLISH_DATE_ZH_BARE_YEAR_RE = re.compile(r"(^|[，；,;]\s*)(\d{4})\s*（")
_PUBLISH_DATE_ZH_SPACED_YM_RE = re.compile(r"(\d{4})\s*年\s*(\d{1,2})\s*月")
# Unparenthesized ``arXiv`` right after a date, e.g. ``2024年6月13日 arXiv；…``.
_PUBLISH_DATE_ZH_BARE_ARXIV_RE = re.compile(r"(?<=[年月日])\s+arXiv(?=[，；,;]|$)")
_CJK_GAP_RE = re.compile(r"(?<=[一-鿿])\s+(?=[一-鿿])")
_LATIN_BEFORE_CJK_RE = re.compile(r"(?<=[0-9A-Za-z])(?=[一-鿿])")
_CJK_BEFORE_LATIN_RE = re.compile(r"(?<=[一-鿿])(?=[0-9A-Za-z])")
_ZH_PUNC_RE = re.compile(r"[（）,;]")


def _month_name(month: int, *, short: bool = False) -> str:
    if month < 1 or month > 12:
        return str(month)
    return (_MONTH_SHORT if short else _MONTH_EN)[month]


def to_published_date_en(text):
    """Convert mixed Chinese/ISO publish-date strings to English display text.

    All dates are rendered with abbreviated English month names, e.g.
    ``Feb 25, 2026 (arXiv)``.
    """
    if not text:
        return text

    result = text.strip()
    result = result.replace("（", "(").replace("）", ")")
    result = result.replace("；", "; ").replace("，", ", ")
    # ⚡ Bolt Optimization: Replace re.sub(r"\s+", " ", result) with split/join for >5x faster whitespace squashing
    result = " ".join(result.split())
    result = _PUBLISH_DATE_V_TAG_ISO_RE.sub(r"\2 \1", result)
    result = _PUBLISH_DATE_V_TAG_CN_RE.sub(r"\2 \1", result)

    def _ymd_cn(match):
        year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
        return f"{_month_name(month, short=True)} {day}, {year}"

    def _ym_cn(match):
        year, month = int(match.group(1)), int(match.group(2))
        suffix = match.group(3) or ""
        return f"{_month_name(month, short=True)} {year}{suffix}"

    def _iso_ym(match):
        year, month = int(match.group(1)), int(match.group(2))
        return f"{_month_name(month, short=True)} {year}"

    result = _PUBLISH_DATE_YMD_CN_RE.sub(_ymd_cn, result)
    result = _PUBLISH_DATE_YM_CN_RE.sub(_ym_cn, result)
    result = _PUBLISH_DATE_Y_VENUE_CN_RE.sub(r"\1\2", result)
    result = _PUBLISH_DATE_Y_CN_RE.sub(r"\1", result)
    result = _PUBLISH_DATE_ISO_YMD_RE.sub(_ymd_cn, result)
    result = _PUBLISH_DATE_ISO_YM_RE.sub(_iso_ym, result)

    # Re-open CJK/Latin boundaries that the Chinese normalizer compacted so the
    # phrase translations below keep a space around them.
    result = _LATIN_BEFORE_CJK_RE.sub(" ", result)
    result = _CJK_BEFORE_LATIN_RE.sub(" ", result)
    for zh_phrase, en_phrase in _PUBLISH_DATE_EN_PHRASES:
        result = result.replace(zh_phrase, en_phrase)

    result = re.sub(r"(\S)\(", r"\1 (", result)
    return result.strip()


def _zh_top_level_punctuation(text):
    """Convert ``,``/``;`` between date segments to ``，``/``；``.

    Separators inside parentheses (e.g. ``（ACM TOG, Vol. 39）``) belong to
    embedded English content and are left untouched.
    """
    if "," not in text and ";" not in text:
        return text

    out = []
    depth = 0
    last_idx = 0

    for match in _ZH_PUNC_RE.finditer(text):
        idx = match.start()
        ch = match.group(0)

        if ch == "（":
            if depth == 0:
                out.append(text[last_idx:idx])
                last_idx = idx
            depth += 1
        elif ch == "）":
            depth = max(0, depth - 1)
            if depth == 0:
                out.append(text[last_idx:idx + 1])
                last_idx = idx + 1
        elif depth == 0:
            out.append(text[last_idx:idx])
            out.append("，" if ch == "," else "；")
            last_idx = idx + 1
            if last_idx < len(text) and text[last_idx] == " ":
                last_idx += 1

    out.append(text[last_idx:])
    return "".join(out)


def to_published_date_zh(text):
    """Normalize mixed Chinese/ISO publish-date strings to Chinese display text.

    All dates are rendered as compact ``YYYY年M月D日`` with full-width
    parentheses and top-level punctuation, e.g. ``2026年2月25日（arXiv）``.
    """
    if not text:
        return text

    result = text.strip()
    # ⚡ Bolt Optimization: Replace re.sub(r"\s+", " ", result) with split/join for >5x faster whitespace squashing
    result = " ".join(result.split())
    result = result.replace("(", "（").replace(")", "）")

    def _cn_ymd(match):
        year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
        return f"{year}年{month}月{day}日"

    def _cn_ym(match):
        year, month = int(match.group(1)), int(match.group(2))
        return f"{year}年{month}月"

    # Compact spaced Chinese dates (``2025 年 10 月`` → ``2025年10月``) and
    # convert ISO dates; YMD must run before YM so ``2025-10-15`` is not
    # consumed as ``2025-10``.
    result = _PUBLISH_DATE_YMD_CN_RE.sub(_cn_ymd, result)
    result = _PUBLISH_DATE_ZH_SPACED_YM_RE.sub(_cn_ym, result)
    result = _PUBLISH_DATE_ISO_YMD_RE.sub(_cn_ymd, result)
    result = _PUBLISH_DATE_ISO_YM_RE.sub(_cn_ym, result)

    result = _PUBLISH_DATE_ZH_BARE_ARXIV_RE.sub("（arXiv）", result)
    result = _PUBLISH_DATE_ZH_BARE_YEAR_RE.sub(r"\1\2年（", result)
    result = _zh_top_level_punctuation(result)
    result = re.sub(r"\s+（", "（", result)
    result = _CJK_GAP_RE.sub("", result)
    return result.strip()


def extract_has_open_source(content):
    """True when the basic-info table links to this paper's open-source code on GitHub."""
    section = _extract_basic_info_section(content)
    if not section:
        return False

    # Short circuit: does the section even contain github.com?
    if "github.com" not in section.lower():
        return False

    # ⚡ Bolt Optimization: Use fast native string scanning to completely
    # bypass split('\n') when the table character is missing.
    if "|" not in section:
        return False

    for line in section.split("\n"):
        line = line.strip()
        if not line.startswith("|") or _EMPTY_TABLE_ROW_RE.match(line):
            continue
        cols = [c.strip() for c in line.split("|")]
        cols = [c for c in cols if c]
        if len(cols) < 2:
            continue

        label = _LABEL_STARS_RE.sub("", cols[0]).strip()
        value = cols[-1] if len(cols) == 2 else " | ".join(cols[1:])

        if _CODE_ROW_EXCLUDE_LABEL_RE.search(label):
            continue
        if not _CODE_ROW_LABEL_RE.search(label):
            continue
        if _NO_OPEN_SOURCE_VALUE_RE.search(value):
            continue
        if _GITHUB_REPO_URL_RE.search(value):
            return True

    return False


def extract_arxiv(content):
    """Extract arXiv ID from common note metadata table formats."""
    # ⚡ Bolt Optimization: Avoid re.search and string lowercasing copies by
    # checking for the most common casing variants with the fast `in` operator.
    # Case-insensitive pre-check: the patterns below use IGNORECASE, so the
    # guard must not require the exact substrings ``arxiv`` / ``arXiv`` (e.g.
    # ``| ARXIV |`` or ``Arxiv:`` would otherwise be skipped and drop metadata).
    if (
        "arxiv" not in content
        and "arXiv" not in content
        and "Arxiv" not in content
        and "ARXIV" not in content
        and "ArXiv" not in content
    ):
        # Fallback to a case-insensitive regex check for unusual casings
        # to guarantee 100% correctness without regressions.
        if _ARXIV_FALLBACK_RE.search(content) is None:
            return None

    for pattern in _ARXIV_PATTERNS:
        match = pattern.search(content)
        if match:
            return match.group(1)
    return None


def get_category_name(category_dir):
    """Clean category directory name for display."""
    name = _CATEGORY_PREFIX_RE.sub("", category_dir)
    name = name.replace("_", " ")
    return name


def parse_progress_order():
    """
    Parse PROGRESS.md to extract paper ordering within each section.
    Returns a dict: { normalized_paper_name: order_index }
    We use the paper title/name from the PROGRESS.md table rows.
    """
    if not os.path.exists(PROGRESS_PATH):
        return {}

    with open(PROGRESS_PATH, encoding="utf-8") as f:
        content = f.read()

    # Extract all paper names mentioned in table rows (| # | paper_name | ... |)
    # This captures the order they appear in README
    order = {}
    idx = 0

    # ⚡ Bolt Optimization: Use fast native string scanning to completely
    # bypass split('\n') when the table character is missing.
    if "|" not in content:
        return order

    for line in content.split("\n"):
        line = line.strip()
        if not line.startswith("|"):
            continue
        # Skip header/separator rows
        cols = [c.strip() for c in line.split("|")]
        cols = [c for c in cols if c]  # remove empty
        if len(cols) < 2:
            continue
        if cols[0] in ("#", "---", "----", "-----") or _DASH_ROW_RE.match(cols[0]):
            continue
        # First col is usually the number, second is paper name/title
        paper_col = cols[1] if len(cols) > 1 else cols[0]

        # Extract the key text (remove markdown links, bold, etc.)
        paper_text = _MD_LINK_RE.sub(r"\1", paper_col)
        paper_text = _MD_CHARS_RE.sub("", paper_text)
        paper_text = paper_text.strip()

        if not paper_text or paper_text in ("论文", "---", "笔记", "状态", "日期", "路线"):
            continue

        # Normalize for matching: lowercase, remove special chars
        normalized = normalize_name(paper_text)
        if normalized and len(normalized) > 3:
            order[normalized] = idx
            idx += 1

    return order


_H_INDEX_RE = re.compile(r"^H(\d+)$", re.IGNORECASE)
_ARXIV_IN_MARKDOWN_CELL_RE = re.compile(
    r"(?:arxiv\.org/(?:abs|html|pdf)/|arxiv:)(\d{4}\.\d{4,5}(?:v\d+)?)",
    re.IGNORECASE,
)


def _arxiv_sort_key(arxiv_id):
    """Return sortable key for arXiv IDs (newest first when reversed).

    Supports modern IDs such as ``2603.12686``; unknown formats sort last.
    """
    if not arxiv_id:
        return (-1, -1, -1)
    m = _ARXIV_ID_PARTS_RE.match(str(arxiv_id).strip())
    if not m:
        return (-1, -1, -1)
    yy, mm, seq = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return (yy, mm, seq)


def _order_tiebreaker(paper, *, newest_first: bool):
    """Secondary sort key from PROGRESS / front-matter ``paper_order``."""
    order_val = paper.get("_order")
    if not isinstance(order_val, int):
        order_val = 10**9
    return -order_val if newest_first else order_val


def sort_papers_by_arxiv(papers, *, newest_first: bool):
    """Sort papers by arXiv ID; ``newest_first`` controls direction."""
    papers.sort(
        key=lambda p: (
            _arxiv_sort_key(p.get("arxiv")),
            _order_tiebreaker(p, newest_first=newest_first),
        ),
        reverse=newest_first,
    )


def _published_date_sort_key(paper):
    """Return an oldest-first ``(year, month, day)`` key from the shown date.

    Prefers the human-curated ``published_date_zh`` so notes without an arXiv id
    (e.g. a simulation platform) and notes dated by a later release than their
    arXiv preprint (e.g. a GitHub version tag) sort by the date printed on the
    card. Falls back to the arXiv id, then to a sentinel that sorts first.
    """
    m = _PUBLISHED_DATE_ZH_RE.search(paper.get("published_date_zh") or "")
    if m:
        return (int(m.group(1)), int(m.group(2)), int(m.group(3) or 0))
    yy, mm, _seq = _arxiv_sort_key(paper.get("arxiv"))
    if (yy, mm) != (-1, -1):
        return (2000 + yy, mm, 0)
    return (-1, -1, -1)


def sort_papers_by_published_date(papers):
    """Sort papers oldest-first by displayed publication date (arXiv fallback).

    Used for high-impact subcategories so the visible dates read strictly
    old→new, which pure arXiv-id sorting cannot guarantee for entries whose
    shown date differs from (or lacks) an arXiv id.
    """
    papers.sort(
        key=lambda p: (
            _published_date_sort_key(p),
            _order_tiebreaker(p, newest_first=False),
        )
    )


def parse_high_impact_h_order():
    """Parse PROGRESS.md rows whose first column is ``H1``…``H23``.

    Returns two dicts used only for ``03_High_Impact_Selection``:

    * ``by_name``: :func:`normalize_name` of the linked title → H index (int)
    * ``by_arxiv``: arXiv id without version suffix → H index (int)

    ArXiv keys are normalized to lowercase and stripped of a trailing ``vN``.
    """
    if not os.path.exists(PROGRESS_PATH):
        return {}, {}

    with open(PROGRESS_PATH, encoding="utf-8") as f:
        content = f.read()

    by_name = {}
    by_arxiv = {}

    # ⚡ Bolt Optimization: Use fast native string scanning to completely
    # bypass split('\n') when the table character is missing.
    if "|" not in content:
        return by_name, by_arxiv

    for line in content.split("\n"):
        line = line.strip()
        if not line.startswith("|"):
            continue
        cols = [c.strip() for c in line.split("|")]
        cols = [c for c in cols if c]
        if len(cols) < 2:
            continue
        if cols[0] in ("#", "---", "----", "-----") or _DASH_ROW_RE.match(cols[0]):
            continue

        tag_m = _H_INDEX_RE.match(cols[0])
        if not tag_m:
            continue

        h_num = int(tag_m.group(1))
        paper_col = cols[1]

        for ax_m in _ARXIV_IN_MARKDOWN_CELL_RE.finditer(paper_col):
            ax = _ARXIV_VERSION_SUFFIX_RE.sub("", ax_m.group(1).lower())
            by_arxiv[ax] = h_num

        paper_text = _MD_LINK_RE.sub(r"\1", paper_col)
        paper_text = _MD_CHARS_RE.sub("", paper_text)
        paper_text = paper_text.strip()
        if not paper_text:
            continue

        normalized = normalize_name(paper_text)
        if normalized and len(normalized) > 3:
            by_name[normalized] = h_num

    return by_name, by_arxiv


def match_high_impact_h_order(paper_title, paper_dir, arxiv_id, by_name, by_arxiv):
    """Resolve H# reading order for high-impact notes; ``None`` if unknown."""
    if arxiv_id:
        ax_key = arxiv_id.lower()
        if ax_key in by_arxiv:
            return by_arxiv[ax_key]
        if _ARXIV_VERSION_SUFFIX_RE.search(ax_key):
            ax_key = _ARXIV_VERSION_SUFFIX_RE.sub("", ax_key)
            if ax_key in by_arxiv:
                return by_arxiv[ax_key]

    norm_title = normalize_name(paper_title)
    if norm_title and norm_title in by_name:
        return by_name[norm_title]

    norm_dir = normalize_name(paper_dir.replace("_", " "))
    if norm_dir and norm_dir in by_name:
        return by_name[norm_dir]

    for key, h_num in by_name.items():
        if norm_title and (norm_title in key or key in norm_title):
            return h_num

    for key, h_num in by_name.items():
        if norm_dir and (norm_dir in key or key in norm_dir):
            return h_num

    return None


def match_paper_order(paper_title, paper_dir, progress_order):
    """Find the README order index for a paper. Lower = earlier in README."""
    # ⚡ Bolt Optimization: O(1) fast-path for exact matches before O(N) fuzzy search
    norm_title = normalize_name(paper_title)
    if norm_title and norm_title in progress_order:
        return progress_order[norm_title]

    norm_dir = normalize_name(paper_dir.replace("_", " "))
    if norm_dir and norm_dir in progress_order:
        return progress_order[norm_dir]

    # Try matching by title
    for key, idx in progress_order.items():
        if norm_title and (norm_title in key or key in norm_title):
            return idx

    # Try matching by directory name
    for key, idx in progress_order.items():
        if norm_dir and (norm_dir in key or key in norm_dir):
            return idx

    # Not found - put at end
    return 99999


def check_stub(fpath, content):
    """Print ``[STUB]`` warning if a note looks like an unfilled skeleton.

    Delegates the actual rule to :func:`_common.stub_reason` so all maintenance
    scripts share a single source of truth.
    """
    reason = stub_reason(content)
    if reason:
        rel = os.path.relpath(fpath, BASE_DIR)
        print(f"  [STUB] {rel} ({reason})")


def process_papers():
    """Walk through papers directory and add front matter."""
    progress_order = parse_progress_order()
    hi_by_name, hi_by_arxiv = parse_high_impact_h_order()
    index_data = {}

    # Load existing papers.json to preserve metadata (subtitle, subcategories, zhname)
    existing_papers_json_path = os.path.join(BASE_DIR, "_data", "papers.json")
    existing_papers_json = {}
    existing_paper_meta = {}  # title/path -> metadata from existing data
    if os.path.exists(existing_papers_json_path):
        try:
            with open(existing_papers_json_path, encoding="utf-8") as f:
                existing_papers_json = json.load(f)
            # Build metadata lookup from all papers (top-level and subcategory)
            for cat_data in existing_papers_json.values():
                for p in cat_data.get("papers", []):
                    existing_paper_meta[p.get("title")] = p
                    existing_paper_meta[p.get("path")] = p
                for sc in cat_data.get("subcategories", []):
                    for p in sc.get("papers", []):
                        existing_paper_meta[p.get("title")] = p
                        existing_paper_meta[p.get("path")] = p
        except (OSError, json.JSONDecodeError, UnicodeDecodeError):
            pass

    if not os.path.exists(PAPERS_DIR):
        print(f"Papers directory not found: {PAPERS_DIR}")
        return

    for category_dir in sorted(os.listdir(PAPERS_DIR)):
        category_path = os.path.join(PAPERS_DIR, category_dir)
        if not os.path.isdir(category_path):
            continue
        if category_dir in SKIP_DIRS:
            continue

        category_display = get_category_name(category_dir)
        papers = []

        for paper_dir in sorted(os.listdir(category_path)):
            paper_path = os.path.join(category_path, paper_dir)
            if not os.path.isdir(paper_path):
                continue

            for fname in sorted(os.listdir(paper_path)):
                if not fname.endswith(".md"):
                    continue

                fpath = os.path.join(paper_path, fname)

                with open(fpath, encoding="utf-8") as f:
                    content = f.read()

                normalized, meta_changed = normalize_paper_meta_blockquotes(content)
                if meta_changed:
                    content = normalized
                    with open(fpath, "w", encoding="utf-8") as f:
                        f.write(content)
                    print(f"  Normalized meta blockquotes: {fpath}")

                normalized, emphasis_changed = normalize_kramdown_math_emphasis(content)
                if emphasis_changed:
                    content = normalized
                    with open(fpath, "w", encoding="utf-8") as f:
                        f.write(content)
                    print(f"  Normalized math emphasis: {fpath}")

                normalized, pipes_changed = normalize_kramdown_math_pipes(content)
                if pipes_changed:
                    content = normalized
                    with open(fpath, "w", encoding="utf-8") as f:
                        f.write(content)
                    print(f"  Normalized math pipes: {fpath}")

                check_stub(fpath, content)

                title = extract_title(content) or paper_dir.replace("_", " ")

                # Add front matter if not present
                if not has_frontmatter(content):
                    # Use json.dumps to safely escape title and category for YAML
                    safe_title = json.dumps(title, ensure_ascii=False)
                    safe_category = json.dumps(category_display, ensure_ascii=False)
                    frontmatter = f"---\nlayout: paper\ntitle: {safe_title}\ncategory: {safe_category}\n---\n\n"
                    with open(fpath, "w", encoding="utf-8") as f:
                        f.write(frontmatter + content)
                    print(f"  Added front matter: {fpath}")
                else:
                    print(f"  Already has front matter: {fpath}")

                rel_path = os.path.relpath(fpath, BASE_DIR)
                url_path = "/" + rel_path.rsplit(".md", 1)[0] + ".html"

                # ⚡ Bolt Optimization: Extract front matter explicitly with O(1) parsing
                # instead of running multiple multi-line regexes over the whole file
                frontmatter_meta = parse_frontmatter(content)

                arxiv_for_order = extract_arxiv(content)

                order_idx = match_paper_order(title, paper_dir, progress_order)

                if category_dir == "03_High_Impact_Selection":
                    h_idx = match_high_impact_h_order(title, paper_dir, arxiv_for_order, hi_by_name, hi_by_arxiv)
                    if h_idx is not None:
                        order_idx = h_idx
                    elif "paper_order" in frontmatter_meta:
                        try:
                            order_idx = int(frontmatter_meta["paper_order"])
                        except ValueError:
                            pass
                elif "paper_order" in frontmatter_meta:
                    # Front-matter `paper_order: <n>` overrides PROGRESS.md matching.
                    # Used to put papers in README's recommended learning-path order
                    # even when their titles don't match the awesome-list table rows.
                    try:
                        order_idx = int(frontmatter_meta["paper_order"])
                    except ValueError:
                        pass

                # Extract subcategory from front matter if present
                paper_subcat = frontmatter_meta.get("subcategory")

                paper_entry = {
                    "title": title,
                    "path": rel_path,
                    "url": url_path,
                    "dir": paper_dir,
                    "_order": order_idx,
                    "_subcategory": paper_subcat,
                }

                existing_meta_for_paper = existing_paper_meta.get(title) or existing_paper_meta.get(rel_path) or {}

                # Extract arXiv ID, preserving existing metadata when the note
                # uses a format the parser does not recognize.
                arxiv = arxiv_for_order or existing_meta_for_paper.get("arxiv")
                if arxiv:
                    paper_entry["arxiv"] = arxiv

                if extract_has_open_source(content):
                    paper_entry["has_open_source"] = True

                published_date_raw = (
                    extract_published_date(content)
                    or existing_meta_for_paper.get("published_date_zh")
                    or existing_meta_for_paper.get("published_date")
                )
                if published_date_raw:
                    published_date_zh = to_published_date_zh(published_date_raw)
                    paper_entry["published_date_zh"] = published_date_zh
                    paper_entry["published_date_en"] = to_published_date_en(published_date_zh)

                # Prefer zhname from front matter when present
                if "zhname" in frontmatter_meta:
                    paper_entry["zhname"] = frontmatter_meta["zhname"]
                # Otherwise restore zhname from existing data if available
                elif existing_meta_for_paper.get("zhname"):
                    paper_entry["zhname"] = existing_meta_for_paper["zhname"]

                zhname_value = paper_entry.get("zhname")
                zh_card_title = resolve_zh_card_title(
                    frontmatter_meta,
                    existing_meta_for_paper,
                    zhname_value,
                )
                if zh_card_title:
                    paper_entry["zh_title"] = zh_card_title
                elif existing_meta_for_paper.get("zh_title"):
                    paper_entry["zh_title"] = existing_meta_for_paper["zh_title"]

                papers.append(paper_entry)

        if category_dir in CATEGORIES_PROGRESS_ORDER:
            papers.sort(key=lambda p: p["_order"])
        elif category_dir in CATEGORIES_ARXIV_OLDEST_FIRST:
            sort_papers_by_arxiv(papers, newest_first=False)
        else:
            sort_papers_by_arxiv(papers, newest_first=True)
        # Load existing category meta (subtitle, subcategories) from current papers.json
        existing_meta = existing_papers_json.get(category_dir, {})

        if papers:
            entry = {"display_name": category_display, "papers": papers}
        else:
            entry = {"display_name": category_display, "papers": []}

        # Preserve subtitle, i18n names, and subtitle_zh if exists
        if "subtitle" in existing_meta:
            entry["subtitle"] = existing_meta["subtitle"]
        if "subtitle_zh" in existing_meta:
            entry["subtitle_zh"] = existing_meta["subtitle_zh"]
        # Support both zhname (new) and display_name_zh (legacy) field names
        if category_dir in CATEGORY_ZHNAME:
            entry["zhname"] = CATEGORY_ZHNAME[category_dir]
        elif "zhname" in existing_meta:
            entry["zhname"] = existing_meta["zhname"]
        elif "display_name_zh" in existing_meta:
            entry["zhname"] = existing_meta["display_name_zh"]

        # Distribute papers into subcategories if defined
        if "subcategories" in existing_meta:
            subcats = [dict(s) for s in existing_meta["subcategories"]]
            # Reset papers in each subcat and migrate name_zh -> zhname
            for s in subcats:
                s["papers"] = []
                if "name_zh" in s:
                    s["zhname"] = s.pop("name_zh")
            subcat_map = {s["name"]: s for s in subcats}
            ungrouped = []
            for paper in papers:
                paper_subcat = paper.get("_subcategory")
                if paper_subcat and paper_subcat in subcat_map:
                    subcat_map[paper_subcat]["papers"].append(paper)
                else:
                    ungrouped.append(paper)
            entry["subcategories"] = subcats
            # ungrouped papers stay in top-level papers list
            entry["papers"] = ungrouped
            if category_dir in CATEGORIES_ARXIV_OLDEST_FIRST:
                for sc in entry["subcategories"]:
                    sort_papers_by_published_date(sc["papers"])

        apply_sort_order_hint(entry, category_dir)

        # Remove internal fields
        for p in papers:
            if "_order" in p:
                del p["_order"]
            if "_subcategory" in p:
                del p["_subcategory"]

        index_data[category_dir] = entry

    # Ensure ALL category directories appear (even if empty)
    for category_dir in sorted(os.listdir(PAPERS_DIR)):
        category_path = os.path.join(PAPERS_DIR, category_dir)
        if category_dir in SKIP_DIRS:
            continue
        if os.path.isdir(category_path) and category_dir not in index_data:
            existing_meta = existing_papers_json.get(category_dir, {})
            entry = {"display_name": get_category_name(category_dir), "papers": []}
            if "subtitle" in existing_meta:
                entry["subtitle"] = existing_meta["subtitle"]
            if "subtitle_zh" in existing_meta:
                entry["subtitle_zh"] = existing_meta["subtitle_zh"]
            if category_dir in CATEGORY_ZHNAME:
                entry["zhname"] = CATEGORY_ZHNAME[category_dir]
            elif "zhname" in existing_meta:
                entry["zhname"] = existing_meta["zhname"]
            elif "display_name_zh" in existing_meta:
                entry["zhname"] = existing_meta["display_name_zh"]
            if "subcategories" in existing_meta:
                entry["subcategories"] = [dict(s, papers=[]) for s in existing_meta["subcategories"]]
                for s in entry["subcategories"]:
                    if "name_zh" in s:
                        s["zhname"] = s.pop("name_zh")
            apply_sort_order_hint(entry, category_dir)
            index_data[category_dir] = entry

    # Sort by upstream awesome-list order first; unknown folders keep lexical tail order.
    rank = {name: i for i, name in enumerate(CATEGORY_ORDER)}
    sorted_data = dict(
        sorted(
            index_data.items(),
            key=lambda kv: (rank.get(kv[0], len(CATEGORY_ORDER)), kv[0]),
        )
    )

    # Write index data
    data_dir = os.path.join(BASE_DIR, "_data")
    os.makedirs(data_dir, exist_ok=True)

    with open(os.path.join(data_dir, "papers.json"), "w", encoding="utf-8") as f:
        json.dump(sorted_data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    total = sum(
        len(v["papers"]) + sum(len(s.get("papers", [])) for s in v.get("subcategories", []))
        for v in sorted_data.values()
    )
    print(f"\nGenerated _data/papers.json with {total} papers in {len(sorted_data)} categories")


if __name__ == "__main__":
    print("Preparing paper pages for Jekyll...\n")
    process_papers()
    print("\nDone!")
