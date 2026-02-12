from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, List, Set

import yaml

from build_all import collect_dependencies


def _safe_id(s: str) -> str:
    s2 = re.sub(r"[^A-Za-z0-9_]+", "_", s.strip())
    return s2 or "X"


def _load_symbols_tokens(symbols_csv_path: Path) -> Set[str]:
    tokens: Set[str] = set()
    text = symbols_csv_path.read_text(encoding="utf-8").splitlines()
    for i, line in enumerate(text):
        if i == 0:
            continue
        if not line.strip():
            continue
        tok = line.split(",", 1)[0].strip()
        if tok:
            tokens.add(tok)
    return tokens


def _compute_build_passes(recipes: List[Dict[str, Any]], base_tokens: Set[str]) -> Dict[str, int]:
    known: Set[str] = set(base_tokens)
    passes: Dict[str, int] = {}

    remaining = [r for r in recipes if isinstance(r.get("constant_id"), str)]
    pass_no = 0

    while True:
        pass_no += 1
        built_this_pass: List[str] = []

        for r in remaining:
            cid = r["constant_id"]
            _, deps = collect_dependencies(r)
            if all(d in known for d in deps):
                built_this_pass.append(cid)

        if not built_this_pass:
            break

        for cid in built_this_pass:
            known.add(cid)
            passes[cid] = pass_no

        remaining = [r for r in remaining if r["constant_id"] not in built_this_pass]

    return passes


def write_yed_graphml(
    out_path: Path,
    recipes: List[Dict[str, Any]],
    pass_map: Dict[str, int],
) -> None:
    NS_G = "http://graphml.graphdrawing.org/xmlns"
    NS_Y = "http://www.yworks.com/xml/graphml"
    ET.register_namespace("", NS_G)
    ET.register_namespace("y", NS_Y)

    graphml = ET.Element("{%s}graphml" % NS_G)

    ET.SubElement(graphml, "{%s}key" % NS_G, {"id": "d0", "for": "node", "yfiles.type": "nodegraphics"})
    ET.SubElement(graphml, "{%s}key" % NS_G, {"id": "d1", "for": "edge", "yfiles.type": "edgegraphics"})

    graph = ET.SubElement(graphml, "{%s}graph" % NS_G, {"id": "G", "edgedefault": "directed"})

    node_id_by_label: Dict[str, str] = {}
    used_ids: Set[str] = set()

    def ensure_constant_node(label: str, extra: str = "") -> str:
        if label in node_id_by_label:
            return node_id_by_label[label]

        base = _safe_id(label)
        nid = base
        k = 2
        while nid in used_ids:
            nid = f"{base}_{k}"
            k += 1

        used_ids.add(nid)
        node_id_by_label[label] = nid

        n_el = ET.SubElement(graph, "{%s}node" % NS_G, {"id": nid})
        d_el = ET.SubElement(n_el, "{%s}data" % NS_G, {"key": "d0"})

        shp = ET.SubElement(d_el, "{%s}ShapeNode" % NS_Y)
        ET.SubElement(shp, "{%s}Geometry" % NS_Y, {"height": "30.0", "width": "240.0", "x": "0.0", "y": "0.0"})
        ET.SubElement(shp, "{%s}Fill" % NS_Y, {"color": "#FFFFFF", "transparent": "false"})
        ET.SubElement(shp, "{%s}BorderStyle" % NS_Y, {"color": "#000000", "type": "line", "width": "1.0"})
        ET.SubElement(shp, "{%s}Shape" % NS_Y, {"type": "roundrectangle"})

        lab = ET.SubElement(shp, "{%s}NodeLabel" % NS_Y)
        lab.text = label if not extra else f"{label}\n{extra}"

        return nid

    def add_edge(src_label: str, dst_label: str) -> None:
        sid = node_id_by_label[src_label]
        tid = node_id_by_label[dst_label]
        e_el = ET.SubElement(graph, "{%s}edge" % NS_G, {"source": sid, "target": tid})
        d_el = ET.SubElement(e_el, "{%s}data" % NS_G, {"key": "d1"})
        pe = ET.SubElement(d_el, "{%s}PolyLineEdge" % NS_Y)
        ET.SubElement(pe, "{%s}LineStyle" % NS_Y, {"color": "#000000", "type": "line", "width": "1.0"})
        ET.SubElement(pe, "{%s}Arrows" % NS_Y, {"source": "none", "target": "standard"})
        ET.SubElement(pe, "{%s}BendStyle" % NS_Y, {"smoothed": "true"})

    constant_ids = {rr.get("constant_id") for rr in recipes if isinstance(rr.get("constant_id"), str)}

    for r in recipes:
        cid = r.get("constant_id")
        if not isinstance(cid, str):
            continue

        p = pass_map.get(cid)
        extra = f"pass {p}" if p is not None else "unbuilt"
        ensure_constant_node(cid, extra=extra)

        _, deps = collect_dependencies(r)
        deps = [d for d in deps if d != "IB" and d in constant_ids]

        for d in deps:
            ensure_constant_node(d)
            add_edge(d, cid)

    out_path.write_text(ET.tostring(graphml, encoding="unicode"), encoding="utf-8")


def main() -> None:
    here = Path(__file__).resolve().parent
    engine_root = here.parent

    recipes_path = engine_root / "recipes" / "constants.yaml"
    symbols_path = engine_root / "symbols" / "symbols.csv"
    out_path = engine_root / "output" / "constants_all_yed.graphml"

    data = yaml.safe_load(recipes_path.read_text(encoding="utf-8"))
    recipes = data.get("constants", [])

    base_tokens = _load_symbols_tokens(symbols_path)
    pass_map = _compute_build_passes(recipes, base_tokens)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    write_yed_graphml(out_path, recipes, pass_map)

    built = len(pass_map)
    total = len([r for r in recipes if isinstance(r.get("constant_id"), str)])
    max_pass = max(pass_map.values()) if pass_map else 0
    print(f"Wrote: {out_path}")
    print(f"Recipes: {total}, buildable: {built}, max pass: {max_pass}")


if __name__ == "__main__":
    main()
