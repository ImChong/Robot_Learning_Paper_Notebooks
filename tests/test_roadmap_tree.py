"""首页推荐学习路线图（天赋树）的数据：编号、摆位、箭头都要能画成一棵干净的小树。

数据在 _data/roadmap.yml，_includes/roadmap-tree.html 按 row / col 把节点放进网格，
assets/js/roadmap.js 只在同一系内画箭头。这里守住几条摆位规则：同一层不重叠、最多 5 列
（手机上 5 列正好占满一行）、箭头只往下或在同一层左右指、跨两层的箭头中间那层要让出路。
"""

from __future__ import annotations

import re

from tests.roadmap_data import all_nodes, load_roadmap

BRANCHES = load_roadmap()
NODES = all_nodes(BRANCHES)
MAX_COLS = 5
# 节点占一列宽的约 0.8；竖着穿过中间那层的箭头离节点中心至少这么远，才不会压到节点。
LANE_CLEARANCE = 0.75


def _edges():
    for node in NODES.values():
        for kind in ("after", "related"):
            for source in node[kind]:
                yield source, node["id"], kind


def test_branches_are_numbered_main_path_first_then_side_paths():
    ids = [branch["id"] for branch in BRANCHES]
    assert len(ids) == len(set(ids))
    tracks = [branch["track"] for branch in BRANCHES]
    assert set(tracks) == {"main", "side"}
    # 主线排在前面，支线在后，左侧标签栏也按这个顺序分两组。
    assert tracks == sorted(tracks, key=lambda track: track != "main")
    main = [branch["mark"] for branch in BRANCHES if branch["track"] == "main"]
    side = [branch["mark"] for branch in BRANCHES if branch["track"] == "side"]
    assert main == [str(i) for i in range(1, len(main) + 1)]
    assert side == [chr(ord("A") + i) for i in range(len(side))]
    for branch in BRANCHES:
        assert branch["name"] and branch["name_zh"], branch["id"]
        assert branch["nodes"], branch["id"]


def test_every_node_has_a_short_label_a_year_and_a_place():
    ids = [node["id"] for branch in BRANCHES for node in branch["nodes"]]
    assert len(ids) == len(set(ids)), "节点 id 重复"
    for node in NODES.values():
        assert node["label"] and str(node["year"]), node["id"]
        assert isinstance(node["row"], int) and node["row"] >= 1, node["id"]
        col = float(node["col"])
        assert col * 2 == int(col * 2), f"{node['id']}: col 只能是整数或 x.5"
        assert 1 <= col <= MAX_COLS, f"{node['id']}: col 超出 1–{MAX_COLS}"
        # 节点上只放短名，全称在悬浮卡片里。
        assert len(node["label"].replace("\u200b", "")) <= 20, node["id"]


def test_nodes_in_one_row_do_not_overlap():
    for branch in BRANCHES:
        rows: dict[int, list[dict]] = {}
        for node in branch["nodes"]:
            rows.setdefault(node["row"], []).append(node)
        for row, nodes in rows.items():
            cols = sorted(float(node["col"]) for node in nodes)
            gaps = [b - a for a, b in zip(cols, cols[1:], strict=False)]
            assert all(gap >= 1 for gap in gaps), f"{branch['id']} 第 {row} 层节点重叠：{cols}"


def test_nodes_are_listed_in_reading_order():
    # 节点按「先行后列」写，键盘 Tab 的顺序就是从上往下、从左往右。
    for branch in BRANCHES:
        places = [(node["row"], float(node["col"])) for node in branch["nodes"]]
        assert places == sorted(places), branch["id"]


def test_arrows_point_at_existing_nodes_and_notes_at_existing_arrows():
    for source, target, _kind in _edges():
        assert source in NODES, f"{target} 的前置 {source} 不在路线图里"
        assert source != target
    for node in NODES.values():
        for source, note in node["notes"].items():
            assert source in node["after"] + node["related"], f"{node['id']} 的说明对应不上箭头 {source}"
            assert note.get("en") and note.get("zh"), node["id"]


def test_arrows_inside_a_branch_point_down_or_sideways():
    for source, target, _kind in _edges():
        a, b = NODES[source], NODES[target]
        if a["branch"] != b["branch"]:
            continue
        assert b["row"] >= a["row"], f"{source} → {target} 往上指了"
        if b["row"] == a["row"]:
            # 同一层的箭头只连相邻的两个节点，不能从别的节点上面穿过。
            assert abs(float(b["col"]) - float(a["col"])) == 1, f"{source} → {target} 隔着节点横穿"


def test_long_arrows_leave_a_lane_through_the_rows_in_between():
    for source, target, _kind in _edges():
        a, b = NODES[source], NODES[target]
        if a["branch"] != b["branch"] or b["row"] - a["row"] < 2:
            continue
        x0, x1 = float(a["col"]), float(b["col"])
        for row in range(a["row"] + 1, b["row"]):
            x = x0 + (x1 - x0) * (row - a["row"]) / (b["row"] - a["row"])
            for other in NODES.values():
                if other["branch"] == a["branch"] and other["row"] == row:
                    assert abs(float(other["col"]) - x) >= LANE_CLEARANCE, (
                        f"{source} → {target} 压过第 {row} 层的 {other['id']}"
                    )


def test_the_roadmap_has_no_cycles():
    order: list[str] = []
    state: dict[str, int] = {}

    def visit(node_id: str) -> None:
        assert state.get(node_id) != 1, f"路线图里有环，经过 {node_id}"
        if state.get(node_id) == 2:
            return
        state[node_id] = 1
        node = NODES[node_id]
        for source in node["after"] + node["related"]:
            visit(source)
        state[node_id] = 2
        order.append(node_id)

    for node_id in NODES:
        visit(node_id)
    assert len(order) == len(NODES)


def test_long_unbroken_labels_can_wrap_on_phones():
    # 4 列以上的树在手机上节点只有约 58px 宽；没有空格的长名要在中间放零宽空格，
    # 否则会被硬拆成「HugWB / C」。窄树的节点在手机上照样有 100px 宽，不受限。
    for branch in BRANCHES:
        if max(float(node["col"]) for node in branch["nodes"]) < 4:
            continue
        for node in branch["nodes"]:
            _check_words(node)


def _check_words(node: dict) -> None:
    for label in (node["label"], node.get("label_zh", "")):
        for word in re.split(r"[\s/\u200b]+", label):
            if re.fullmatch(r"[A-Za-z0-9.\-]+", word):
                assert len(word) <= 9, f"{node['id']}: 「{word}」太长，加一个零宽空格 \\u200B"
