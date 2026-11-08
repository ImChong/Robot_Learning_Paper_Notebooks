#!/usr/bin/env python3
"""论文笔记健康度（Note Health）：0–6 分，衡量笔记本身的完整度与核验进度。

参考 ImChong/Robotics_Notebooks 的 ``compute_health``（0–3 分 + 缺项 + draft/stub 封顶），
按本仓库的笔记结构改成六项，每项 1 分：

1. ``metadata``     元数据与来源：H1 标题、``## 📋 基本信息``、可追溯的原文链接、发表时间 / 版本。
2. ``skeleton``     阅读骨架：研究问题、核心方法、实验 / 结果、局限 / 结论四组小节，各有实质正文。
3. ``verification`` 原文核验：front matter 明确记下 ``original_check: done`` 与核验日期。
4. ``animation``    动画讲解：正文有已注册、所在 bundle 会被加载的演示（不算配音视频）。
5. ``video``        讲解视频：配音视频占位已注册，``data-src`` 指向的 mp4 存在且读得出时长。
6. ``example``      具体实例：「具体实例 / 计算实例 / 手算」一类小节，正文有足够的数字可核对。

健康度只说明**笔记写到了哪一步**，不是论文质量或结论可靠性的评级。

缺字段一律按「未达标」处理，不会被当成已完成：没有 ``original_check`` 的历史笔记，
第 3 项就是 0 分；占位容器没有对应的构建函数、视频文件不在仓库里，也都不计分。

``status: stub`` / ``status: draft``（或自动识别出的占位稿）会给总分封顶，见 ``STATUS_CAPS``。

用法（打印报告，供 PR 正文汇报）::

    python3 scripts/note_health.py papers/01_Foundational_RL/PPO_.../PPO_....md [...]
    python3 scripts/note_health.py --changed     # 相对 origin/main 改动 / 新增的笔记
    python3 scripts/note_health.py --all         # 全部笔记，末尾附分数分布
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from functools import cache

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import (  # noqa: E402
    BASE_DIR,
    has_frontmatter,
    is_stub,
    iter_paper_md_files,
    mp4_duration_seconds,
    parse_frontmatter,
)

DEMO_JS_DIR = os.path.join(BASE_DIR, "assets", "js", "demos")

HEALTH_MAX = 6

# 计分项的顺序就是卡片上六格小条的顺序。
HEALTH_ITEMS = ("metadata", "skeleton", "verification", "animation", "video", "example")

# 每项的（中文名, 英文名, 中文判据, 英文判据）；卡片的悬浮框与图例都从这里取。
HEALTH_LABELS = {
    "metadata": (
        "元数据与来源",
        "Metadata & source",
        "标题、基本信息表、可追溯的原文链接与发表时间",
        "Title, basic-info table, a traceable paper link and its date",
    ),
    "skeleton": (
        "阅读骨架",
        "Reading skeleton",
        "研究问题、核心方法、实验 / 结果、局限 / 结论四组小节都有实质内容",
        "Problem, method, results and limitations sections with real content",
    ),
    "verification": (
        "原文核验",
        "Full-text check",
        "front matter 明确记下 original_check: done 与核验日期",
        "Front matter records original_check: done with a date",
    ),
    "animation": (
        "动画讲解",
        "Explainer animation",
        "能加载的分镜动画或交互演示，空占位不算",
        "A storyboard animation or interactive demo that actually loads",
    ),
    "video": (
        "讲解视频",
        "Explainer video",
        "能播放的讲解视频：播放器已注册、mp4 在仓库里",
        "A playable explainer video whose mp4 is in the repository",
    ),
    "example": (
        "具体实例",
        "Worked example",
        "带数字、能逐步核对的具体实例小节",
        "A worked example with concrete numbers you can check",
    ),
}

# front matter ``status`` → 总分上限（与参考仓库 stub ≤1/3、draft ≤2/3 同比例）。
STATUS_CAPS = {"stub": 2, "draft": 4}
STATUS_LABELS = {
    "stub": ("占位稿", "stub"),
    "draft": ("草稿", "draft"),
}

# ``original_check`` 的取值：只有 done 才计分。
ORIGINAL_CHECK_DONE = frozenset({"done", "complete", "completed", "已完成"})
ORIGINAL_CHECK_LABELS = {
    "partial": "原文只核验了一部分（original_check: partial）",
    "abstract": "只依据摘要整理（original_check: abstract）",
    "none": "原文尚未核验（original_check: none）",
}

_FENCE_RE = re.compile(r"^\s*(```|~~~)")
_MD_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
_HTML_HEADING_RE = re.compile(r"<h([1-6])\b[^>]*>(.*?)</h\1>", re.I | re.S)
_TAG_RE = re.compile(r"<[^>]+>")
_ATTR_RE = re.compile(r"\{[#:][^}]*\}")
_MD_LINK_URL_RE = re.compile(r"\]\([^)]*\)")
_PLACEHOLDER_RE = re.compile(r"🚧|待补充|正文待|TODO|TBD", re.I)
# 数字两边不能紧贴拉丁字母 / 下划线（``fc_2layers``、``v2`` 不算），紧贴汉字可以（「第3步」）。
_NUMBER_RE = re.compile(r"(?<![A-Za-z0-9_.])[-−+]?\d+(?:[.,]\d+)?(?![A-Za-z0-9_])")
_DATE_OR_YEAR_RE = re.compile(r"(?:19|20)\d{2}")
_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_ARXIV_ID_RE = re.compile(r"arxiv\.org/(?:abs|pdf|html)/\d{4}\.\d{4,5}|arXiv[:\s]*\d{4}\.\d{4,5}", re.I)
# 可追溯的论文原文：arXiv / DOI / 会议与期刊站点 / 直接的 PDF。
_PAPER_SOURCE_URL_RE = re.compile(
    r"https?://(?:[\w-]+\.)*(?:arxiv\.org|doi\.org|openreview\.net|dl\.acm\.org|ieeexplore\.ieee\.org|"
    r"proceedings\.(?:mlr\.press|neurips\.cc)|papers\.nips\.cc|openaccess\.thecvf\.com|roboticsproceedings\.org|"
    r"link\.springer\.com|science\.org|nature\.com|sciencedirect\.com|jmlr\.org|ojs\.aaai\.org|"
    r"ecva\.net|aclanthology\.org|biorxiv\.org|researchgate\.net|semanticscholar\.org)\S*"
    r"|https?://\S+\.pdf\b",
    re.I,
)
# 标签是「论文 / 技术报告 / HTML / PDF」一类的行，里面的任何链接都算原文（没有 arXiv 的技术报告、博客）。
_SOURCE_ROW_LABEL_RE = re.compile(r"论文|原文|技术报告|报告|文章|HTML|PDF|Paper|Report", re.I)
_HTTP_RE = re.compile(r"https?://")
_BASIC_INFO_RE = re.compile(r"^##\s*📋\s*基本信息", re.M)
_ABSTRACT_ONLY_RE = re.compile(r"(?:依据|基于)\s*(?:arXiv\s*)?(?:论文公开)?摘要(?:与[^，；。]*?)?整理")

# ---------------------------------------------------------------------------
# 阅读骨架：四组小节，各组的标题关键词。论文类型（硬件 / 基准 / 数据集 / 综述）
# 只是多认几个别名，规则本身一样：标题对上、正文有实质内容（不是占位）。
SKELETON_GROUPS = ("problem", "method", "results", "conclusion")
SKELETON_LABELS = {
    "problem": "研究问题",
    "method": "核心方法",
    "results": "实验 / 结果",
    "conclusion": "局限 / 结论",
}
_SKELETON_KEYWORDS = {
    "problem": r"要解决|解决什么|在解决|研究问题|问题与动机|动机|背景|为什么需要|痛点|挑战|Motivation|Problem",
    "method": r"方法|是怎么|怎么做|怎么搭|如何做|核心机制|核心原理|核心思想|核心设计|核心理论|技术路线|算法|Pipeline|Method",
    "results": r"实验|结果|关键发现|关键数据|关键指标|关键数值|性能数字|洞见|评测|评估|消融|实物验证|真机验证|Table|Results?|Experiments?|Evaluation",
    "conclusion": r"局限|边界|不足|缺陷|开放问题|结论|启发|启示|意义|工程价值|展望|未来工作|Limitations?|Conclusion",
}
# 笔记模板里二级标题的 emoji 本身就标明了小节的角色（❓ 问题、🔧 方法、⚠️ 局限），
# 「## 🔧 两条路线怎么走」这类没写「方法」二字的标题也算。📊 / 🧪 / 🛠️ 不算：
# 它们也用在「📊 与相关工作的关系」「🛠️ 源码运行时序图」这类不是结果、不是方法的小节上。
_SKELETON_EMOJI = {
    "problem": ("❓",),
    "method": ("🔧",),
    "results": (),
    "conclusion": ("⚠️", "⚠"),
}
_SKELETON_EXTRA_BY_TYPE = {
    "hardware": {"method": r"设计|机构|构型|执行器|结构|硬件|平台|系统|框架", "results": r"测试|实测|验证|演示|测量"},
    "benchmark": {"method": r"设计|平台|系统|任务|环境|数据|基准|框架", "results": r"基准|Benchmark|测试|任务结果|排行"},
    "dataset": {"method": r"数据集|采集|标注|构建|数据", "results": r"统计|基准|Benchmark|测试"},
    "survey": {"method": r"分类|综述|梳理|脉络|体系", "results": r"对比|总结|趋势"},
}
# 板块默认的论文类型；单篇可用 front matter ``paper_type`` 覆盖。
PAPER_TYPE_BY_CATEGORY = {
    "11_Simulation_Benchmark": "benchmark",
    "12_Hardware_Design": "hardware",
}
# 「讨论记录」是读者问答，不是论文的结论。
_SKELETON_EXCLUDE = re.compile(r"讨论记录|面试|英文缩写|基本信息|相关阅读|参考来源")
SKELETON_MIN_CHARS = 60

# ---------------------------------------------------------------------------
# 具体实例：标题关键词 + 正文里能核对的数字。
_EXAMPLE_HEADING_RE = re.compile(r"具体实例|计算实例|数值实例|数据计算|手算|算一遍|走一遍|算例|Worked example", re.I)
EXAMPLE_MIN_CHARS = 200
EXAMPLE_MIN_NUMBERS = 5

_DEMO_PLACEHOLDER_RE = re.compile(r'<div\b[^>]*class="paper-demo"[^>]*>', re.I)
_DATA_DEMO_RE = re.compile(r'data-demo="([\w-]+)"')
_DATA_SRC_RE = re.compile(r'data-src="([^"]+)"')
_MOUNT_RE = re.compile(r"K\.mount\(\{(.*?)\}\);", re.S)
_MOUNT_KEY_RE = re.compile(r"['\"]([a-z0-9]+(?:-[a-z0-9]+)+)['\"]\s*:")


@dataclass
class NoteHealth:
    """一篇笔记的健康度。``gaps`` 按 ``HEALTH_ITEMS`` 的顺序列出没拿到的项。"""

    score: int
    gaps: list[str]
    reasons: dict[str, str] = field(default_factory=dict)
    status: str | None = None

    @property
    def raw_score(self) -> int:
        return HEALTH_MAX - len(self.gaps)


# ---------------------------------------------------------------------------
# Markdown 结构


def _strip_frontmatter(content: str) -> str:
    if not has_frontmatter(content):
        return content
    end = content.find("\n---", 3)
    return content[end + 4 :] if end != -1 else content


@dataclass
class _Section:
    level: int
    title: str
    body: str


def iter_sections(content: str) -> list[_Section]:
    """按 H1–H6 切分正文（Markdown 标题与折叠块里的 ``<h2>`` / ``<h3>`` 都算），跳过代码块。

    每个小节的 ``body`` 包含它下面更低级别的子标题，直到下一个同级或更高级的标题。
    """
    body = _strip_frontmatter(content)
    heads: list[tuple[int, int, str]] = []  # (行号, 级别, 标题)
    lines = body.split("\n")
    in_fence = False
    for i, line in enumerate(lines):
        if _FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        m = _MD_HEADING_RE.match(line)
        if m:
            heads.append((i, len(m.group(1)), m.group(2)))
            continue
        if "<h" in line:
            hm = _HTML_HEADING_RE.search(line)
            if hm:
                heads.append((i, int(hm.group(1)), _TAG_RE.sub("", hm.group(2))))
    sections = []
    for idx, (line_no, level, title) in enumerate(heads):
        end = len(lines)
        for next_line, next_level, _ in heads[idx + 1 :]:
            if next_level <= level:
                end = next_line
                break
        sections.append(_Section(level, title.strip(), "\n".join(lines[line_no + 1 : end])))
    return sections


def plain_chars(text: str) -> int:
    """去掉 HTML 标签、链接地址、Markdown 记号后剩下的非空白字符数。"""
    text = _MD_LINK_URL_RE.sub("]", text)
    text = _TAG_RE.sub("", text)
    text = _ATTR_RE.sub("", text)
    text = re.sub(r"[#*_`>|\-:\[\]]", "", text)
    return len("".join(text.split()))


def _is_substantive(body: str, min_chars: int) -> bool:
    chars = plain_chars(body)
    if chars < min_chars:
        return False
    # 只有一两句外加 🚧 / 待补充 的，算占位。
    return not (_PLACEHOLDER_RE.search(body) and chars < min_chars * 4)


# ---------------------------------------------------------------------------
# 六项判据


def _basic_info(content: str) -> str | None:
    m = _BASIC_INFO_RE.search(content)
    if not m:
        return None
    end = content.find("\n## ", m.end())
    return content[m.end() : end if end != -1 else len(content)]


def _source_row_link(info: str) -> bool:
    for line in info.split("\n"):
        cols = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cols) >= 2 and _SOURCE_ROW_LABEL_RE.search(cols[0]) and _HTTP_RE.search(" ".join(cols[1:])):
            return True
    return False


def check_metadata(content: str, title: str | None) -> str | None:
    """返回缺项原因；达标返回 None。"""
    if not title:
        return "缺少论文标题（H1）"
    info = _basic_info(content)
    if info is None:
        return "缺少「📋 基本信息」"
    missing = []
    if not (_ARXIV_ID_RE.search(info) or _PAPER_SOURCE_URL_RE.search(info) or _source_row_link(info)):
        missing.append("可追溯的原文链接（arXiv / DOI / 会议页 / PDF）")
    if not _DATE_OR_YEAR_RE.search(info):
        missing.append("发表时间或版本")
    if missing:
        return "基本信息缺" + "、".join(missing)
    return None


def paper_type(frontmatter: dict, category_dir: str | None) -> str | None:
    explicit = (frontmatter.get("paper_type") or "").strip().lower()
    if explicit:
        return explicit
    return PAPER_TYPE_BY_CATEGORY.get(category_dir or "")


def _skeleton_pattern(group: str, kind: str | None) -> re.Pattern:
    words = _SKELETON_KEYWORDS[group]
    extra = _SKELETON_EXTRA_BY_TYPE.get(kind or "", {}).get(group)
    if extra:
        words = f"{words}|{extra}"
    return re.compile(words, re.I)


def check_skeleton(sections: list[_Section], kind: str | None) -> str | None:
    found = {g: False for g in SKELETON_GROUPS}
    for sec in sections:
        if sec.level not in (2, 3) or _SKELETON_EXCLUDE.search(sec.title):
            continue
        for group in SKELETON_GROUPS:
            if found[group]:
                continue
            by_emoji = sec.level == 2 and bool(_SKELETON_EMOJI[group]) and sec.title.startswith(_SKELETON_EMOJI[group])
            if not (by_emoji or _skeleton_pattern(group, kind).search(sec.title)):
                continue
            if _is_substantive(sec.body, SKELETON_MIN_CHARS):
                found[group] = True
    missing = [SKELETON_LABELS[g] for g in SKELETON_GROUPS if not found[g]]
    if missing:
        return "阅读骨架缺「" + "」「".join(missing) + "」小节（或只有占位）"
    return None


def check_verification(frontmatter: dict, content: str) -> str | None:
    value = (frontmatter.get("original_check") or "").strip().lower()
    date = (frontmatter.get("original_check_date") or "").strip()
    abstract_only = bool(_ABSTRACT_ONLY_RE.search(_strip_frontmatter(content)))
    if not value:
        if abstract_only:
            return "笔记自述依据摘要整理，未记录原文核验"
        return "未记录原文核验状态（front matter original_check）"
    if value not in ORIGINAL_CHECK_DONE:
        return ORIGINAL_CHECK_LABELS.get(value, f"原文核验未完成（original_check: {value}）")
    if not _ISO_DATE_RE.match(date):
        return "原文核验缺少日期（original_check_date: YYYY-MM-DD）"
    if abstract_only:
        return "标记了 original_check: done，但正文仍写着依据摘要整理"
    return None


@cache
def _bundle_registry(demo_dir: str) -> dict[str, str]:
    """演示 id → 注册它的 bundle 名（只认 ``K.mount({...})`` 里登记过的 id）。"""
    registry: dict[str, str] = {}
    if not os.path.isdir(demo_dir):
        return registry
    for fname in sorted(os.listdir(demo_dir)):
        if not fname.endswith(".js") or fname == "kit.js":
            continue
        with open(os.path.join(demo_dir, fname), encoding="utf-8") as f:
            js = f.read()
        for block in _MOUNT_RE.findall(js):
            for key in _MOUNT_KEY_RE.findall(block):
                registry.setdefault(key, fname[:-3])
    return registry


def _declared_bundles(frontmatter: dict) -> set[str]:
    raw = frontmatter.get("demos") or ""
    return set(re.findall(r"[\w-]+", raw))


def _demo_placeholders(content: str) -> list[tuple[str, str | None]]:
    """正文里的演示占位：[(演示 id, data-src 或 None)]。"""
    found = []
    for m in _DEMO_PLACEHOLDER_RE.finditer(_strip_frontmatter(content)):
        tag = m.group(0)
        demo = _DATA_DEMO_RE.search(tag)
        if not demo:
            continue
        src = _DATA_SRC_RE.search(tag)
        found.append((demo.group(1), src.group(1) if src else None))
    return found


def _playable(demo_id: str, registry: dict[str, str], bundles: set[str]) -> bool:
    bundle = registry.get(demo_id)
    return bool(bundle) and bundle in bundles


def check_animation(content: str, frontmatter: dict, registry: dict[str, str]) -> str | None:
    demos = [d for d, _ in _demo_placeholders(content) if not d.endswith("-video")]
    if not demos:
        return "没有动画讲解或交互演示"
    bundles = _declared_bundles(frontmatter)
    if any(_playable(d, registry, bundles) for d in demos):
        return None
    return "演示占位 " + "、".join(demos[:3]) + " 没有对应的已加载构建函数"


def check_video(content: str, frontmatter: dict, registry: dict[str, str], note_dir: str, duration_of) -> str | None:
    videos = [(d, src) for d, src in _demo_placeholders(content) if d.endswith("-video")]
    if not videos:
        return "没有讲解视频"
    bundles = _declared_bundles(frontmatter)
    problems = []
    for demo_id, src in videos:
        if not _playable(demo_id, registry, bundles):
            problems.append(f"{demo_id} 没有对应的已加载播放器")
            continue
        if not src:
            problems.append(f"{demo_id} 没有 data-src")
            continue
        path = os.path.normpath(os.path.join(note_dir, src))
        if not os.path.isfile(path):
            problems.append(f"视频文件 {src} 不存在")
            continue
        if not duration_of(path):
            problems.append(f"视频文件 {src} 读不出时长")
            continue
        return None
    return "；".join(problems)


def check_example(sections: list[_Section]) -> str | None:
    candidates = [s for s in sections if s.level in (2, 3) and _EXAMPLE_HEADING_RE.search(s.title)]
    if not candidates:
        return "没有「具体实例」小节"
    for sec in candidates:
        numbers = len(_NUMBER_RE.findall(_TAG_RE.sub(" ", sec.body)))
        if plain_chars(sec.body) >= EXAMPLE_MIN_CHARS and numbers >= EXAMPLE_MIN_NUMBERS:
            return None
    return "「具体实例」小节太短或缺少可核对的数字"


# ---------------------------------------------------------------------------


def note_status(frontmatter: dict, content: str) -> str | None:
    """``stub`` / ``draft`` / None。front matter 优先，其次是自动识别的占位稿。"""
    value = (frontmatter.get("status") or "").strip().lower()
    if value in STATUS_CAPS:
        return value
    if is_stub(content) or re.search(r"^>\s*🧭\s*状态[:：]\s*占位", content, re.M):
        return "stub"
    return None


def compute_note_health(
    content: str,
    fpath: str,
    *,
    title: str | None = None,
    category_dir: str | None = None,
    demo_dir: str = DEMO_JS_DIR,
    duration_of=None,
) -> NoteHealth:
    """计算一篇笔记的健康度。``fpath`` 用来解析视频的相对路径。"""
    if duration_of is None:
        duration_of = mp4_duration_seconds
    frontmatter = parse_frontmatter(content)
    if title is None:
        m = re.search(r"^#\s+(.+)$", _strip_frontmatter(content), re.M)
        title = m.group(1).strip() if m else None
    if category_dir is None:
        parts = os.path.normpath(fpath).split(os.sep)
        category_dir = parts[parts.index("papers") + 1] if "papers" in parts[:-1] else None

    sections = iter_sections(content)
    registry = _bundle_registry(demo_dir)
    reasons_by_item = {
        "metadata": check_metadata(content, title),
        "skeleton": check_skeleton(sections, paper_type(frontmatter, category_dir)),
        "verification": check_verification(frontmatter, content),
        "animation": check_animation(content, frontmatter, registry),
        "video": check_video(content, frontmatter, registry, os.path.dirname(fpath), duration_of),
        "example": check_example(sections),
    }
    gaps = [item for item in HEALTH_ITEMS if reasons_by_item[item]]
    reasons = {item: reasons_by_item[item] for item in gaps}
    score = HEALTH_MAX - len(gaps)
    status = note_status(frontmatter, content)
    if status:
        cap = STATUS_CAPS[status]
        reasons["status"] = f"笔记状态为 {status}，总分封顶 {cap}/{HEALTH_MAX}"
        score = min(score, cap)
    return NoteHealth(score=score, gaps=gaps, reasons=reasons, status=status)


def health_summary(health: NoteHealth) -> dict[str, str]:
    """卡片无障碍文本用的一行说明（中英各一份）。"""
    zh = f"笔记健康度 {health.score}/{HEALTH_MAX}"
    en = f"Note health {health.score}/{HEALTH_MAX}"
    if health.gaps:
        zh += "，缺：" + "、".join(HEALTH_LABELS[g][0] for g in health.gaps)
        en += "; missing: " + ", ".join(HEALTH_LABELS[g][1].lower() for g in health.gaps)
    else:
        zh += "，六项齐全"
        en += "; all six items present"
    if health.status:
        status_zh, status_en = STATUS_LABELS[health.status]
        cap = STATUS_CAPS[health.status]
        zh += f"（{status_zh}，封顶 {cap}/{HEALTH_MAX}）"
        en += f" ({status_en}, capped at {cap}/{HEALTH_MAX})"
    return {"zh": zh, "en": en}


def health_fields(health: NoteHealth) -> dict:
    """写进 ``_data/papers.json`` 每篇笔记条目的健康度字段。"""
    summary = health_summary(health)
    fields = {
        "health_score": health.score,
        "health_gaps": list(health.gaps),
        "health_label_zh": summary["zh"],
        "health_label_en": summary["en"],
    }
    if health.status:
        fields["health_status"] = health.status
    return fields


def health_items_data() -> dict:
    """写进 ``_data/note_health.json``：首页悬浮框按它逐项列出 ✓ / ✗。"""
    return {
        "max": HEALTH_MAX,
        "items": [
            {"key": key, "zh": zh, "en": en, "hint_zh": hint_zh, "hint_en": hint_en}
            for key in HEALTH_ITEMS
            for zh, en, hint_zh, hint_en in [HEALTH_LABELS[key]]
        ],
        "status": {
            key: {"zh": STATUS_LABELS[key][0], "en": STATUS_LABELS[key][1], "cap": cap}
            for key, cap in STATUS_CAPS.items()
        },
    }


# ---------------------------------------------------------------------------
# 报告


def _changed_notes() -> list[str]:
    out = subprocess.run(
        ["git", "diff", "--name-only", "--diff-filter=AM", "origin/main...HEAD", "--", "papers"],
        capture_output=True,
        text=True,
        check=True,
        cwd=BASE_DIR,
    ).stdout
    return [p for p in out.split() if p.endswith(".md") and "/_archived/" not in p and "/todos/" not in p]


def report(paths: list[str], *, distribution: bool = False) -> str:
    rows = ["| 笔记 | 健康度 | 缺项 |", "|---|---|---|"]
    counts = [0] * (HEALTH_MAX + 1)
    for rel in paths:
        path = os.path.join(BASE_DIR, rel) if not os.path.isabs(rel) else rel
        with open(path, encoding="utf-8") as f:
            content = f.read()
        health = compute_note_health(content, path)
        counts[health.score] += 1
        gaps = "；".join(health.reasons.values())
        rows.append(f"| {os.path.relpath(path, BASE_DIR)} | {health.score}/{HEALTH_MAX} | {gaps or '—'} |")
    if distribution:
        rows.append("")
        rows.append("分布：" + "，".join(f"{s}/{HEALTH_MAX}：{n} 篇" for s, n in enumerate(counts)))
    return "\n".join(rows)


def main(argv: list[str]) -> int:
    if argv == ["--changed"]:
        paths = _changed_notes()
    elif argv == ["--all"]:
        paths = [os.path.relpath(p, BASE_DIR) for p in iter_paper_md_files()]
    else:
        paths = argv
    if not paths:
        print("无笔记")
        return 0
    print(report(paths, distribution=argv == ["--all"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
