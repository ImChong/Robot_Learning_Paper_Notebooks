"""Regression checks for the PACT note and its generated health score."""

from pathlib import Path

from scripts import note_health as nh


ROOT = Path(__file__).resolve().parents[1]
PACT = (
    ROOT
    / "papers/12_Hardware_Design"
    / "PACT__Pose-Robust_Actuation_Co-Design_for_Tendon-Driven_Robotic_Hands"
    / "PACT__Pose-Robust_Actuation_Co-Design_for_Tendon-Driven_Robotic_Hands.md"
)


def test_pact_note_reaches_four_of_six_without_fake_media():
    content = PACT.read_text(encoding="utf-8")
    health = nh.compute_note_health(content, str(PACT))
    assert health.score == 4, (health.score, health.reasons)
    assert health.gaps == ["animation", "video"]
    assert health.status is None
