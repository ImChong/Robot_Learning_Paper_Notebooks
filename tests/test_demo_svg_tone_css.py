"""Storyboard tone classes (.demo-x-bad …) must be able to recolour SVG <text>.

A plain `.demo-x-svg text { fill: … }` has specificity (0,1,1) and beats the
(0,1,0) tone classes, so numbers meant to turn red (PPO's r = 1.50) stayed
the default ink. The default fill must sit at element specificity.
"""

import re
from pathlib import Path

CSS = (Path(__file__).resolve().parents[1] / "assets" / "css" / "paper-demos.css").read_text(encoding="utf-8")


def test_default_svg_text_fill_does_not_outrank_tone_classes():
    selectors = re.findall(r"(?m)^([^{}\n]*\btext)\s*\{[^}]*\bfill\s*:", CSS)
    svg_text = [s for s in selectors if "demo-x-svg" in s]
    assert svg_text, "default fill rule for storyboard <text> not found"
    for sel in svg_text:
        assert ":where(.demo-x-svg)" in sel, f"{sel!r} outranks .demo-x-* tone classes"


def test_tone_classes_set_fill():
    for tone in ("mut", "ink2", "acc", "good", "bad", "warn"):
        assert re.search(r"\.demo-x-" + tone + r"\s*\{[^}]*\bfill\s*:", CSS), tone
