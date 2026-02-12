from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, List, Set

import yaml
from build_all import collect_dependencies


def _safe_id(s: str) -> str:
    s2 = re.sub(r"[^A-Za-z0-9_]+", "_", (s or "").strip())
    return s2 if s2 else "X"


def write_yed_graphml_structural(out_path: Path, recipes: List[Dict[str, Any]]) -> None:
    NS_G = "http://graphml.graphdrawing.org/xmlns"
    NS_Y = "http://www.yworks.com/xml/graphml"
    ET.register_namespace("", NS_G)
    ET.register_namespace("y", NS_Y)

    graphml = ET.Element(f"{{{NS_G}}}graphml")

    ET.SubElement(graphml, f"{{{NS_G}}}key", {"id": "d0", "for": "node", "yfiles.type": "nodegraphics"})
    ET.SubElement(graphml, f"{{{NS_G}}}key", {"id": "d1", "for": "edge", "yfiles.type": "edgegraphics"})

    graph = ET.SubElement(graphml, f"{{{NS_G}}}graph", {"id": "G", "edgedefault": "directed"})

    node_id_by_label: Dict[str, str] = {}
    used_ids: Set[str] = set()

    def ensure_node(label: str, kind: str) -> str:
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

        n_el = ET.SubElement(graph, f"{{{NS_G}}}node", {"id": nid})
        d_el = ET.SubElement(n_el, f"{{{NS_G}}}data", {"key": "d0"})

        shape = "roundrectangle" if kind == "constant" else "rectangle"

        shp = ET.SubElement(d_el, f"{{{NS_Y}}}ShapeNode")
        ET.SubElement(shp, f"{{{NS_Y}}}Geometry", {"height": "30.0", "width": "240.0", "x": "0.0", "y": "0.0"})
        ET.SubElement(shp, f"{{{NS_Y}}}Fill", {"color": "#FFFFFF", "transparent": "false"})
        ET.SubElement(shp, f"{{{NS_Y}}}BorderStyle", {"color": "#000000", "type": "line", "width": "1.0"})
        ET.SubElement(shp, f"{{{NS_Y}}}Shape", {"type": shape})

        lab = ET.SubElement(shp, f"{{{NS_Y}}}NodeLabel")
        lab.text = label

        return nid

    def add_edge(src_label: str, dst_label: str) -> None:
        sid = node_id_by_label[src_label]
        tid = node_id_by_label[dst_label]

        e_el = ET.SubElement(graph, f"{{{NS_G}}}edge", {"source": sid, "target": tid})
        d_el = ET.SubElement(e_el, f"{{{NS_G}}}data", {"key": "d1"})

        pe = ET.SubElement(d_el, f"{{{NS_Y}}}PolyLineEdge")
        ET.SubElement(pe, f"{{{NS_Y}}}LineStyle", {"color": "#000000", "type": "line", "width": "1.0"})
        ET.SubElement(pe, f"{{{NS_Y}}}Arrows", {"source": "none", "target": "standard"})
        ET.SubElement(pe, f"{{{NS_Y}}}BendStyle", {"smoothed": "true"})

    recipes = [r for r in recipes if isinstance(r.get("constant_id"), str)]
    constant_ids = {r["constant_id"] for r in recipes}

    # Create nodes: every constant + every token it depends on
    for cid in sorted(constant_ids):
        ensure_node(cid, "constant")

    for r in recipes:
        cid = r["constant_id"]
        _, deps = collect_dependencies(r)

        for d in deps:
            if d == "IB":
                continue
            if d in constant_ids:
                ensure_node(d, "constant")
            else:
                ensure_node(d, "token")
            add_edge(d, cid)

    out_path.write_text(ET.tostring(graphml, encoding="unicode"), encoding="utf-8")


def main() -> None:
    here = Path(__file__).resolve().parent          # .../constant_engine/src
    engine_root = here.parent                       # .../constant_engine

    recipes_path = engine_root / "recipes" / "constants.yaml"
    out_path = engine_root / "output" / "constants_structural.graphml"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    data = yaml.safe_load(recipes_path.read_text(encoding="utf-8"))
    recipes = data.get("constants", [])

    write_yed_graphml_structural(out_path, recipes)
    print(f"Wrote: {out_path}")


if __name__ == "__main__":
    main()
