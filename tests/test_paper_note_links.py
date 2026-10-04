"""笔记之间的站内链接必须指向发布后的 ``.html`` 页面。

Jekyll 把 ``papers/NN_*/**/*.md`` 渲染成同名 ``.html``，源 ``.md`` 不会出现在站点上，
所以 ``[PPO](../PPO/PPO.md)`` 在 GitHub Pages 上是 404（只在 GitHub 仓库里能点）。
笔记里的相对链接一律写成 ``.html``；指向的笔记、图片、视频也必须真实存在。
PROGRESS.md、DAILY_SUMMARY_LOG.md、todos/、_archived/ 不发布成页面，不在此列。
"""

import re
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
PAPERS = ROOT / "papers"

FENCE = re.compile(r"^\s{0,3}(`{3,}|~{3,})")
CODE_SPAN = re.compile(r"(`+).+?\1")
INLINE_LINK = re.compile(r"\]\(\s*<?([^)\s>]+)")
HREF = re.compile(r"""\b(?:href|src)=["']([^"']+)["']""")
SCHEME = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*:")


def published_notes():
    return sorted(PAPERS.glob("[0-9][0-9]_*/**/*.md"))


def relative_links(path):
    """(行号, 链接路径) —— 跳过代码块、行内代码、外链与页内锚点。"""
    fence = None
    for lineno, line in enumerate(path.read_text(encoding="utf-8").split("\n"), 1):
        m = FENCE.match(line)
        if m:
            marker = m.group(1)
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = None
            continue
        if fence is not None:
            continue
        text = CODE_SPAN.sub("", line)
        for target in INLINE_LINK.findall(text) + HREF.findall(text):
            if SCHEME.match(target) or target.startswith(("#", "/", "{{")):
                continue
            yield lineno, target.split("#", 1)[0]


def test_published_notes_exist():
    assert len(published_notes()) > 300


def test_note_links_use_html_not_md():
    bad = [
        f"{p.relative_to(ROOT)}:{n}: {t}"
        for p in published_notes()
        for n, t in relative_links(p)
        if t.endswith(".md")
    ]
    assert not bad, "站内链接要写 .html，源 .md 在站点上是 404：\n" + "\n".join(bad[:20])


def test_note_links_point_to_existing_files():
    bad = []
    for p in published_notes():
        for n, t in relative_links(p):
            if not t:
                continue
            target = (p.parent / unquote(t)).resolve()
            if t.endswith(".html"):
                ok = target.with_suffix(".md").is_file() or target.is_file()
            else:
                ok = target.is_file()
            if not ok:
                bad.append(f"{p.relative_to(ROOT)}:{n}: {t}")
    assert not bad, "相对链接指向的文件不存在：\n" + "\n".join(bad[:20])
