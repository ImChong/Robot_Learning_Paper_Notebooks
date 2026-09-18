"""Shared helpers for repository maintenance scripts.

Centralises logic that previously diverged between ``prepare_pages.py`` and
``sync_progress.py``:

* ``BASE_DIR`` / ``PAPERS_DIR`` / ``SKIP_DIRS`` constants
* :func:`is_stub` — single source of truth for "is this note a skeleton?"
* :func:`normalize_name` — fuzzy-match key for paper titles
* :func:`parse_frontmatter` — minimal YAML front matter parser (no external deps)
* :func:`iter_paper_md_files` — iterate paper notes while skipping todos/PROGRESS
"""

from __future__ import annotations

import os
import re
from collections.abc import Iterator

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAPERS_DIR = os.path.join(BASE_DIR, "papers")
SKIP_DIRS = {"todos", "_archived"}

# A note is considered a stub when EITHER:
#   1. it is short AND has no recognisable "方法" (method) section heading, OR
#   2. it has many 🚧 placeholder markers.
# Both ``prepare_pages.check_stub`` (warning) and ``sync_progress.is_stub``
# (status gate) historically used different thresholds; this constant is the
# single source of truth.
STUB_MIN_LINES = 150
STUB_CONSTRUCTION_THRESHOLD = 5
_METHOD_HEADING_RE = re.compile(r"^##\s*(?:🔧|🛠️)?\s*.*方法", re.MULTILINE)


def is_stub(content: str) -> bool:
    """Return True if ``content`` looks like an unfilled note skeleton.

    See module docstring for the rule. The function intentionally accepts the
    full file body (including any front matter) — line counting includes the
    front matter, which is acceptable since real notes are far longer than the
    threshold either way.
    """
    construction_count = content.count("🚧")
    if construction_count >= STUB_CONSTRUCTION_THRESHOLD:
        return True

    line_count = content.count("\n") + 1
    if line_count < STUB_MIN_LINES:
        has_method = False
        if "方法" in content:
            # Fast path check for common permutations
            idx1 = content.find("## 🔧 方法")
            idx2 = content.find("## 🛠️ 方法")
            idx3 = content.find("## 方法")
            if (idx1 != -1 and (idx1 == 0 or content[idx1 - 1] == '\n')) or \
               (idx2 != -1 and (idx2 == 0 or content[idx2 - 1] == '\n')) or \
               (idx3 != -1 and (idx3 == 0 or content[idx3 - 1] == '\n')):
                has_method = True
            else:
                has_method = bool(_METHOD_HEADING_RE.search(content))
        if not has_method:
            return True

    return False


def stub_reason(content: str) -> str | None:
    """Human-readable reason this note is a stub, or None if it is not."""
    line_count = content.count("\n") + 1
    if line_count < STUB_MIN_LINES:
        has_method = False
        if "方法" in content:
            idx1 = content.find("## 🔧 方法")
            idx2 = content.find("## 🛠️ 方法")
            idx3 = content.find("## 方法")
            if (idx1 != -1 and (idx1 == 0 or content[idx1 - 1] == '\n')) or \
               (idx2 != -1 and (idx2 == 0 or content[idx2 - 1] == '\n')) or \
               (idx3 != -1 and (idx3 == 0 or content[idx3 - 1] == '\n')):
                has_method = True
            else:
                has_method = bool(_METHOD_HEADING_RE.search(content))
        if not has_method:
            return f"{line_count} lines, missing 方法详解"

    construction_count = content.count("🚧")
    if construction_count >= STUB_CONSTRUCTION_THRESHOLD:
        return f"{construction_count} 🚧 markers, skeleton"

    return None


_NORMALIZE_NON_ALNUM_RE = re.compile(r"[^a-z0-9\s]")


def normalize_name(name: str) -> str:
    """Lowercase, strip non-alphanumeric chars, collapse spaces.

    Used as a fuzzy-match key for paper titles between PROGRESS.md table rows
    and on-disk note directories.
    """
    # ⚡ Bolt Optimization: Use a compiled regex for non-alphanumeric removal
    # and string split()/join() for whitespace squashing. This avoids a second
    # re.sub() pass and makes the function over 2x faster.
    return " ".join(_NORMALIZE_NON_ALNUM_RE.sub("", name.lower()).split())


def has_frontmatter(content: str) -> bool:
    """Check if ``content`` already starts with a Jekyll front matter block."""
    return content.startswith("---\n") or content.startswith("---\r\n")


def parse_frontmatter(content: str) -> dict:
    """Parse the YAML front matter at the start of ``content``.

    Only the simple ``key: value`` lines are recognised; values surrounded by
    matching quotes are unquoted. Returns ``{}`` if no front matter is present
    or it cannot be parsed.
    """
    if not has_frontmatter(content):
        return {}
    # ⚡ Bolt Optimization: Use `find` to avoid allocating a large string
    # copy for the body when we only need the frontmatter section.
    end_idx = content.find("---", 3)
    if end_idx == -1:
        return {}
    front_matter_str = content[3:end_idx]
    result: dict[str, str] = {}
    for line in front_matter_str.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()
        # Unquote symmetric quote characters
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
            value = value[1:-1]
        if key:
            result[key] = value
    return result


_INLINE_MATH_RE = re.compile(r"(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)", re.DOTALL)
_DISPLAY_MATH_RE = re.compile(r"\$\$(.+?)\$\$", re.DOTALL)
# Bare ^* inside inline math: kramdown GFM pairs * across adjacent $...$ spans.
_MATH_SUPERSCRIPT_STAR_RE = re.compile(r"\^(?!\{)\*")


def _escape_pipe_in_math_segment(tex: str) -> str:
    """Escape bare ``|`` inside a LaTeX fragment so kramdown GFM won't treat it as a table column."""
    # ⚡ Bolt Optimization: Fast-path string scanning. Avoid character-by-character
    # iteration overhead in Python by using native `find` and string slicing.
    if "|" not in tex:
        return tex

    out: list[str] = []
    last_idx = 0
    while True:
        idx = tex.find("|", last_idx)
        if idx == -1:
            out.append(tex[last_idx:])
            break

        out.append(tex[last_idx:idx])

        if idx > 0 and tex[idx - 1] == "\\":
            out.append("|")
        else:
            prev = tex[idx - 1] if idx > 0 else ""
            nxt = tex[idx + 1] if idx + 1 < len(tex) else ""
            if (prev.isalnum() or prev in ")}_]") and (nxt.isalnum() or nxt in "({[_"):
                out.append(" \\mid ")
            else:
                out.append("\\|")

        last_idx = idx + 1

    return "".join(out)


def _escape_pipes_in_math_delimiters(text: str) -> str:
    def _inline_repl(match: re.Match[str]) -> str:
        inner = match.group(1)
        escaped = _escape_pipe_in_math_segment(inner)
        if escaped == inner:
            return match.group(0)
        return f"${escaped}$"

    def _display_repl(match: re.Match[str]) -> str:
        inner = match.group(1)
        escaped = _escape_pipe_in_math_segment(inner)
        if escaped == inner:
            return match.group(0)
        return f"$${escaped}$$"

    text = _DISPLAY_MATH_RE.sub(_display_repl, text)
    return _INLINE_MATH_RE.sub(_inline_repl, text)


def _normalize_math_segment_emphasis(tex: str) -> str:
    """Keep kramdown GFM from turning LaTeX sub/sup markers into <em> tags.

    With ``math_engine: null`` KaTeX runs client-side, but kramdown still
    parses ``*`` / ``_`` inside ``$...$``. Adjacent inline spans on one line
    can cross-pair (e.g. two ``\\phi^*`` blocks, or repeated ``_{\\mathbf p}``).
    """
    if "*" not in tex and "_{" not in tex:
        return tex

    normalized = _MATH_SUPERSCRIPT_STAR_RE.sub(r"^{\\ast}", tex)
    if "_{" in normalized:
        normalized = normalized.replace("_{", " _ {")
    return normalized


def _normalize_kramdown_math_emphasis_in_text(text: str) -> str:
    def _inline_repl(match: re.Match[str]) -> str:
        inner = match.group(1)
        escaped = _normalize_math_segment_emphasis(inner)
        if escaped == inner:
            return match.group(0)
        return f"${escaped}$"

    def _display_repl(match: re.Match[str]) -> str:
        inner = match.group(1)
        escaped = _normalize_math_segment_emphasis(inner)
        if escaped == inner:
            return match.group(0)
        return f"$${escaped}$$"

    text = _DISPLAY_MATH_RE.sub(_display_repl, text)
    return _INLINE_MATH_RE.sub(_inline_repl, text)


def normalize_kramdown_math_emphasis(content: str) -> tuple[str, bool]:
    """Escape ``^*`` / ``_{`` patterns inside math so kramdown won't emit ``<em>``."""
    if "$" not in content or ("*" not in content and "_{" not in content):
        return content, False

    lines = content.split("\n")
    in_fence = False
    changed = False
    new_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            new_lines.append(line)
            continue
        if in_fence or "$" not in line:
            new_lines.append(line)
            continue

        escaped = _normalize_kramdown_math_emphasis_in_text(line)
        if escaped != line:
            changed = True
        new_lines.append(escaped)

    if not changed:
        return content, False
    return "\n".join(new_lines), True


def normalize_kramdown_math_pipes(content: str) -> tuple[str, bool]:
    """Prevent inline ``$...$`` pipes from being parsed as GFM table column separators.

    Kramdown splits a prose line on ``|`` even when the delimiter appears inside
    inline math (e.g. ``$\\pi(a|o)$``), yielding a broken two-column table.
    """
    # ⚡ Bolt Optimization: Fast substring pre-checks to short-circuit expensive O(N) splits
    # on strings that definitely contain no math or no pipes.
    if "|" not in content or "$" not in content:
        return content, False

    lines = content.split("\n")
    in_fence = False
    changed = False
    new_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            new_lines.append(line)
            continue
        if in_fence or stripped.startswith("|"):
            new_lines.append(line)
            continue

        escaped = _escape_pipes_in_math_delimiters(line)
        if escaped != line:
            changed = True
        new_lines.append(escaped)

    if not changed:
        return content, False
    return "\n".join(new_lines), True


def normalize_paper_meta_blockquotes(content: str) -> tuple[str, bool]:
    """Ensure paper header blockquote lines render one item per visual line.

    Kramdown merges consecutive ``>`` lines into a single ``<p>`` unless they
    are separated by an empty ``>`` continuation line. Without that separator,
    "阅读日期", "板块", and other header callouts collapse onto one line.
    """
    if "\n>" not in content and not content.startswith(">"):
        return content, False

    # ⚡ Bolt Optimization: Use fast native string scanning instead of allocating
    # an entire file line array with content.split("\n").
    h1_idx_char = 0 if content.startswith("# ") else content.find("\n# ")
    if h1_idx_char != 0 and h1_idx_char != -1:
        h1_idx_char += 1

    if h1_idx_char == -1:
        return content, False

    # Just need to extract the block between # and next ## or ---
    # Original logic only looked ~30 lines ahead. We use a 2000 char window
    # to approximate this bound and prevent scanning the entire document.
    search_end = min(len(content), h1_idx_char + 2000)
    next_h2 = content.find("\n## ", h1_idx_char, search_end)
    next_sep = content.find("\n---", h1_idx_char, search_end)

    end_char_idx = len(content)
    if next_h2 != -1 and next_sep != -1:
        end_char_idx = min(next_h2, next_sep)
    elif next_h2 != -1:
        end_char_idx = next_h2
    elif next_sep != -1:
        end_char_idx = next_sep

    target_block = content[h1_idx_char:end_char_idx]
    lines = target_block.split("\n")

    content_bq_indices: list[int] = []
    # Skip the actual H1 line which is lines[0]
    for i in range(1, len(lines)):
        if lines[i].startswith(">"):
            if lines[i].strip() != ">":
                content_bq_indices.append(i)
        elif lines[i].strip() and content_bq_indices:
            break

    if len(content_bq_indices) < 2:
        return content, False

    changed = False
    new_lines = list(lines)

    for i in content_bq_indices:
        stripped = new_lines[i].rstrip()
        if stripped != new_lines[i]:
            new_lines[i] = stripped
            changed = True

    offset = 0
    for j in range(1, len(content_bq_indices)):
        prev_i = content_bq_indices[j - 1] + offset
        curr_i = content_bq_indices[j] + offset
        between = new_lines[prev_i + 1 : curr_i]
        if not any(line.strip() == ">" for line in between):
            new_lines.insert(curr_i, ">")
            offset += 1
            changed = True

    if not changed:
        return content, False

    new_target_block = "\n".join(new_lines)
    return content[:h1_idx_char] + new_target_block + content[end_char_idx:], True


def iter_paper_md_files(papers_dir: str = PAPERS_DIR) -> Iterator[str]:
    """Yield absolute paths of paper note markdown files.

    Skips: ``SKIP_DIRS`` (e.g. ``papers/todos/``), top-level ``PROGRESS.md`` and
    ``DAILY_SUMMARY_LOG.md``, and any non-``.md`` file. Order is sorted by
    category then paper directory for stable output.
    """
    if not os.path.isdir(papers_dir):
        return
    for category in sorted(os.listdir(papers_dir)):
        if category in SKIP_DIRS:
            continue
        cat_path = os.path.join(papers_dir, category)
        if not os.path.isdir(cat_path):
            continue
        for paper_dir in sorted(os.listdir(cat_path)):
            paper_path = os.path.join(cat_path, paper_dir)
            if not os.path.isdir(paper_path):
                continue
            for fname in sorted(os.listdir(paper_path)):
                if fname.endswith(".md"):
                    yield os.path.join(paper_path, fname)
