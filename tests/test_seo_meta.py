"""搜索引擎 / 分享卡片的元信息、sitemap 与「只发布站点内容」。

此前页面只有 <title>：没有 description、canonical 和 Open Graph，分享出去没有摘要；
站点也没有 sitemap.xml / robots.txt；而 tests/、docs/ 等仓库文件都被 Jekyll 原样
发布了出去，误提交的飞书技能（skills/ 下带 front matter 的 SKILL.md）还被渲染成了
22 个网页——那些文件已随本次改动从仓库删掉，exclude 里保留 skills/ 以防再装回来。
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = (ROOT / "_layouts/default.html").read_text(encoding="utf-8")
HEAD = LAYOUT.split("</head>", 1)[0]
CONFIG_TEXT = (ROOT / "_config.yml").read_text(encoding="utf-8")


def _config_list(key):
    """``_config.yml`` 里 ``key:`` 下的列表项（CI 没装 PyYAML，这里不依赖它）。"""
    match = re.search(rf"^{key}:\n((?:[ \t]+-[^\n]*\n|[ \t]*#[^\n]*\n)+)", CONFIG_TEXT, re.M)
    assert match, f"{key}: 不是 _config.yml 里的列表"
    return [
        line.strip()[1:].strip().strip('"')
        for line in match.group(1).splitlines()
        if line.strip().startswith("-")
    ]


def _config_scalar(key):
    match = re.search(rf'^{key}:[ \t]*"?([^"\n]*)"?[ \t]*$', CONFIG_TEXT, re.M)
    assert match, f"{key}: 不在 _config.yml 里"
    return match.group(1)


def test_head_carries_description_canonical_and_open_graph():
    for needle in (
        '<meta name="description" content="{{ seo_description | escape }}">',
        '<link rel="canonical" href="{{ seo_url }}">',
        '<meta property="og:title" content="{{ seo_title | escape }}">',
        '<meta property="og:description" content="{{ seo_description | escape }}">',
        '<meta property="og:url" content="{{ seo_url }}">',
        '<meta name="twitter:card" content="summary">',
    ):
        assert needle in HEAD, needle


def test_paper_description_comes_from_the_roadmap_summary():
    # 论文页按 page.url 在 _data/papers.json 里找 summary_zh（含子分类），
    # 没有总结退回中文名，最后退回 site.description。
    assert 'cat[1].papers | where: "url", page.url | first' in HEAD
    assert 'sc.papers | where: "url", page.url | first' in HEAD
    assert 'seo_paper.summary_zh | remove: "$"' in HEAD
    assert "seo_paper.zh_title | default: seo_paper.zhname" in HEAD
    assert "seo_description | default: site.description" in HEAD


def test_canonical_is_absolute_and_index_free():
    assert 'page.url | replace: "index.html", "" | absolute_url' in HEAD
    assert _config_scalar("url") == "https://imchong.github.io"
    assert _config_scalar("baseurl") == "/Robot_Learning_Paper_Notebooks"


def test_home_and_update_log_have_their_own_description():
    for name in ("index.html", "updates.html"):
        front = (ROOT / name).read_text(encoding="utf-8").split("---\n", 2)[1]
        assert "description:" in front, name


def test_sitemap_plugin_and_robots():
    assert "jekyll-sitemap" in _config_list("plugins")
    assert 'gem "jekyll-sitemap"' in (ROOT / "Gemfile").read_text(encoding="utf-8")
    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    assert "Sitemap: https://imchong.github.io/Robot_Learning_Paper_Notebooks/sitemap.xml" in robots


def test_repo_only_files_are_not_published():
    excluded = set(_config_list("exclude"))
    for path in ("skills/", "tests/", "docs/", "media/", "AGENTS.md", "skills-lock.json",
                 "pyproject.toml", "requirements-dev.txt", "requirements-site.txt",
                 "papers/todos/", "papers/DAILY_SUMMARY_LOG.md"):
        assert path in excluded, path
