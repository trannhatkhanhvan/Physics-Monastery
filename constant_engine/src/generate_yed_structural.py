from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

import yaml


# ----------------------------
# Parsing helpers
# ----------------------------
_NUM_RE = re.compile(r"^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?\s*$", re.IGNORECASE)

# names like t_p, m_p, zhe_1, E_1, etc.
_NAME_RE = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]*\b")

# We treat these as functions / operators, not geometry/boundary tokens
_FUNC_BLACKLIST = {"Im", "Re", "log", "ln", "zeta", "gamma", "subfact"}


def _safe_id(s: str) -> str:
    """GraphML node ids must be XML-friendly."""
    s2 = re.sub(r"[^A-Za-z0-9_]+", "_", s.strip())
    return s2 or "X"


def _base_token(expr: str) -> str | None:
    """
    Turn things like:
      "zhe_1^4" -> "zhe_1"
      "l_p^2"   -> "l_p"
      "C_U^-4"  -> "C_U"
      "pi"      -> "pi"
      "2"       -> None
      "zeta(2)^0.5" -> None   (function)
    """
    s = (expr or "").strip()
    if not s:
        return None
    if _NUM_RE.match(s):
        return None

    # Handle wrappers like "(...)" by extracting names inside
    if s.startswith("(") and s.endswith(")"):
        inner = s[1:-1]
        names = [nm for nm in _NAME_RE.findall(inner) if nm not in _FUNC_BLACKLIST]
        # If expression has exactly one non-function name, use it as base
        if len(names) == 1:
            return names[0]
        return None

    # Ignore function forms like zeta(2), gamma(1/2), subfact(5)
    if re.match(r"^\s*zeta\(\s*[+-]?\d+\s*\)\s*$", s):
        return None
    if re.match(r"^\s*(?:gamma|Γ)\(", s):
        return None
    if re.match(r"^\s*subfact\(\s*\d+\s*\)\s*$", s):
        return None
    if s.startswith("!") and s[1:].strip().isdigit():
        return None

    # Split on top-level '^' and take the base
    depth = 0
    split_at = -1
    for i, ch in enumerate(s):
        if ch == "(":
            depth += 1
        elif ch == ")" and depth > 0:
            depth -= 1
        elif ch == "^" and depth == 0:
            split_at = i
            break

    base = s[:split_at].strip() if split_at != -1 else s

    # Base must look like a token name
    if _NUM_RE.match(base):
        return None

    # Sometimes the base can still include junk; grab the first valid name if it’s clean
    names = [nm for nm in _NAME_RE.findall(base) if nm not in _FUNC_BLACKLIST]
    if len(names) == 1 and names[0] == base:
        return base
    if len(names) == 1:
        return names[0]

    return None


def _get_external_lists(recipe: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    """
    Returns (external_geometry_items, external_boundary_items) as raw strings
    pulled from numerator+denominator lists.
    """
    eg = recipe.get("external_geometry") or {}
    eb = recipe.get("external_boundary") or {}

    eg_items: List[str] = []
    eb_items: List[str] = []

    for k in ("numerator", "denominator"):
        v = eg.get(k)
        if isinstance(v, list):
            eg_items.extend([str(x) for x in v])

        v = eb.get(k)
        if isinstance(v, list):
            eb_items.extend([str(x) for x in v])

    return eg_items, eb_items


def extract_structural_edges(
    recipes: List[Dict[str, Any]]
) -> Tuple[Set[str], Set[str], List[Tuple[str, str, str]]]:
    """
    Builds:
      geometry_tokens: set of geometry node labels
      boundary_tokens: set of boundary node labels
      edges: list of (geometry, boundary, edge_label)

    COLLAPSED MODE:
      We collapse multiple recipe instances of the same (geometry,boundary) pair
      into ONE edge labeled with count=N.
    """
    geometries: Set[str] = set()
    boundaries: Set[str] = set()

    # collect all raw pair instances first
    pair_instances: List[Tuple[str, str]] = []

    for r in recipes:
        eg_items, eb_items = _get_external_lists(r)

        g_set: List[str] = []
        b_set: List[str] = []

        for item in eg_items:
            bt = _base_token(item)
            if bt:
                g_set.append(bt)

        for item in eb_items:
            bt = _base_token(item)
            if bt:
                b_set.append(bt)

        # record nodes
        geometries.update(g_set)
        boundaries.update(b_set)

        # record all (g,b) instances
        for g in g_set:
            for b in b_set:
                pair_instances.append((g, b))

    # collapse edges: unique (g,b) with a count label
    counts: Dict[Tuple[str, str], int] = {}
    for g, b in pair_instances:
        counts[(g, b)] = counts.get((g, b), 0) + 1

    collapsed_edges: List[Tuple[str, str, str]] = [
        (g, b, f"count={n}") for (g, b), n in sorted(counts.items())
    ]

    return geometries, boundaries, collapsed_edges

# ----------------------------
# yEd GraphML writer
# ----------------------------
def write_yed_structural_graphml(
    out_path: Path,
    geometries: Set[str],
    boundaries: Set[str],
    edges: List[Tuple[str, str, str]],
) -> None:
    NS_G = "http://graphml.graphdrawing.org/xmlns"
    NS_Y = "http://www.yworks.com/xml/graphml"
    ET.register_namespace("", NS_G)
    ET.register_namespace("y", NS_Y)

    graphml = ET.Element(f"{{{NS_G}}}graphml")

    ET.SubElement(graphml, f"{{{NS_G}}}key", {"id": "d0", "for": "node", "yfiles.type": "nodegraphics"})
    ET.SubElement(graphml, f"{{{NS_G}}}key", {"id": "d1", "for": "edge", "yfiles.type": "edgegraphics"})

    graph = ET.SubElement(graphml, f"{{{NS_G}}}graph", {"id": "G", "edgedefault": "directed"})

    node_id: Dict[str, str] = {}
    used: Set[str] = set()

    def ensure_node(label: str, kind: str) -> str:
        if label in node_id:
            return node_id[label]

        base = _safe_id(f"{kind}_{label}")
        nid = base
        k = 2
        while nid in used:
            nid = f"{base}_{k}"
            k += 1
        used.add(nid)
        node_id[label] = nid

        n_el = ET.SubElement(graph, f"{{{NS_G}}}node", {"id": nid})
        d_el = ET.SubElement(n_el, f"{{{NS_G}}}data", {"key": "d0"})

        # boundary nodes as hexagon, geometry nodes as roundrectangle
        shape_type = "hexagon" if kind == "boundary" else "roundrectangle"

        shp = ET.SubElement(d_el, f"{{{NS_Y}}}ShapeNode")
        ET.SubElement(shp, f"{{{NS_Y}}}Geometry", {"height": "30.0", "width": "220.0", "x": "0.0", "y": "0.0"})
        ET.SubElement(shp, f"{{{NS_Y}}}Fill", {"color": "#FFFFFF", "transparent": "false"})
        ET.SubElement(shp, f"{{{NS_Y}}}BorderStyle", {"color": "#000000", "type": "line", "width": "1.0"})
        ET.SubElement(shp, f"{{{NS_Y}}}Shape", {"type": shape_type})

        lab = ET.SubElement(shp, f"{{{NS_Y}}}NodeLabel")
        lab.text = label

        return nid

    def add_edge(g_label: str, b_label: str, edge_label: str, edge_index: int) -> None:
        # Directed from geometry -> boundary (purely conventional)
        sid = node_id[g_label]
        tid = node_id[b_label]

        e_el = ET.SubElement(graph, f"{{{NS_G}}}edge", {"id": f"e{edge_index}", "source": sid, "target": tid})
        d_el = ET.SubElement(e_el, f"{{{NS_G}}}data", {"key": "d1"})
        pe = ET.SubElement(d_el, f"{{{NS_Y}}}PolyLineEdge")
        ET.SubElement(pe, f"{{{NS_Y}}}LineStyle", {"color": "#000000", "type": "line", "width": "1.0"})
        ET.SubElement(pe, f"{{{NS_Y}}}Arrows", {"source": "none", "target": "standard"})
        ET.SubElement(pe, f"{{{NS_Y}}}BendStyle", {"smoothed": "true"})

        # Put the recipe tag on the edge so later we can filter/highlight by constant
        if edge_label:
            el = ET.SubElement(pe, f"{{{NS_Y}}}EdgeLabel")
            el.text = edge_label

    # Make all nodes
    for g in sorted(geometries):
        ensure_node(g, "geometry")
    for b in sorted(boundaries):
        ensure_node(b, "boundary")

    # Make edges (do not collapse)
    for i, (g, b, tag) in enumerate(edges, start=1):
        add_edge(g, b, tag, i)

    out_path.write_text(ET.tostring(graphml, encoding="unicode"), encoding="utf-8")


# ----------------------------
# Main
# ----------------------------
def main() -> None:
    here = Path(__file__).resolve().parent          # .../constant_engine/src
    engine_root = here.parent                        # .../constant_engine

    recipes_path = engine_root / "recipes" / "constants.yaml"
    out_path = engine_root / "output" / "constants_structural.graphml"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    data = yaml.safe_load(recipes_path.read_text(encoding="utf-8"))
    recipes = data.get("constants", [])
    if not isinstance(recipes, list):
        raise ValueError("constants.yaml: expected top-level 'constants' list")

    geometries, boundaries, edges = extract_structural_edges(recipes)

    write_yed_structural_graphml(out_path, geometries, boundaries, edges)

    print(f"Wrote: {out_path}")
    print(f"Geometry nodes: {len(geometries)}")
    print(f"Boundary nodes: {len(boundaries)}")
    print(f"Edges (collapsed): {len(edges)}")


if __name__ == "__main__":
    main()
