"""Regression: site branding follows the Robot_Learning_Paper_Notebooks rename."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

OLD_SLUG = "Humanoid_Robot_Learning_Paper_Notebooks"
NEW_SLUG = "Robot_Learning_Paper_Notebooks"
OLD_TITLE = "Humanoid Robot Learning Paper Notebooks"
NEW_TITLE = "Robot Learning Paper Notebooks"
OLD_ZH = "人形机器人学习论文笔记"
NEW_ZH = "机器人学习论文笔记"


def test_config_uses_renamed_title_and_baseurl():
    text = (ROOT / "_config.yml").read_text(encoding="utf-8")
    assert f'title: "{NEW_TITLE}"' in text
    assert f'description: "{NEW_ZH}"' in text
    assert f'baseurl: "/{NEW_SLUG}"' in text
    assert OLD_SLUG not in text
    assert OLD_TITLE not in text


def test_header_points_at_new_github_repo():
    text = (ROOT / "_includes/header.html").read_text(encoding="utf-8")
    assert f"https://github.com/ImChong/{NEW_SLUG}" in text
    assert OLD_SLUG not in text
    assert "site.title" in text
    assert "site.description" in text


def test_index_h1_binds_to_site_title():
    text = (ROOT / "index.html").read_text(encoding="utf-8")
    assert 'data-en="{{ site.title | escape }}"' in text
    assert 'data-zh="{{ site.description | escape }}"' in text
    assert OLD_TITLE not in text
    assert OLD_ZH not in text


def test_i18n_site_titles_match_new_branding():
    text = (ROOT / "_data/i18n.json").read_text(encoding="utf-8")
    assert NEW_TITLE in text
    assert NEW_ZH in text
    assert OLD_TITLE not in text
    assert OLD_ZH not in text


def test_readme_and_agents_use_new_pages_url():
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    agents = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
    pages = f"https://imchong.github.io/{NEW_SLUG}/"
    local = f"http://localhost:4000/{NEW_SLUG}/"
    assert pages in readme
    assert f"baseurl = /{NEW_SLUG}" in readme
    assert local in agents
    assert f"`/{NEW_SLUG}`" in agents
    assert OLD_SLUG not in readme
    assert OLD_SLUG not in agents
