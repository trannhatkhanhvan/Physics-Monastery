from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable

import yaml


# ---------- token parsing ----------
_ZETA_CALL_RE = re.compile(r"^\s*zeta\(\s*([+-]?\d+)\s*\)\s*$")
_GAMMA_CALL_RE = re.compile(r"^\s*(?:gamma|Γ)\(\s*(.+?)\s*\)\s*$")
_BANG_SUBFACT_RE = re.compile(r"^\s*!\s*(\d+)\s*$")
_EXPR_TOKEN_RE = re.compile(r"^\s*\(.+\)\s*$")


def _is_number_like(s: str) -> bool:
    s = s.strip()
    if not s:
        return False
    try:
        float(s)
        return True
    except Exception:
        return False


def _split_top_level_caret(s: str) -> str:
    """
    Return the base token before a top-level '^', ignoring anything inside parentheses.
    Example: "zhe_1^4" -> "zhe_1"
             "zeta(2)^0.5" -> "zeta(2)"
             "(a+b)^2" -> "(a+b)"  (kept as expression token)
    """
    s = s.strip()
    depth = 0
    for i, ch in enumerate(s):
        if ch == "(":
            depth += 1
        elif ch == ")" and depth > 0:
            depth -= 1
        elif ch == "^" and depth == 0:
            return s[:i].strip()
    return s


def _iter_factor_items(factors: Any) -> Iterable[str]:
    """
    Accept the same shapes your recipes use:
      - list of strings/numbers/dicts
      - dict of token -> power
    Yield raw token strings (or numeric as string).
    """
    if factors is None:
        return
    if isinstance(factors, dict):
        for k in factors.keys():
            yield str(k)
        return
    if isinstance(factors, list):
        for item in factors:
            if isinstance(item, (int, float)):
                yield str(item)
            elif isinstance(item, str):
                yield item
            elif isinstance(item, dict):
                tok = item.get("token", item.get("id"))
                if tok is None:
                    continue
                yield str(tok)
            else:
                yield str(item)
        return
    # fallback
    yield str(factors)


def normalize_external_token(raw: str) -> str | None:
    """
    Convert a factor entry to a node token.
    - Drops numeric literals
    - Normalizes TOKEN^POWER -> TOKEN
    - Keeps function calls zeta(...), gamma(...), !n as whole tokens
    - Keeps non-identifier tokens as-is (yEd supports arbitrary labels)
    """
    s = str(raw).strip()
    if not s:
        return None

    # drop numeric literals
    if _is_number_like(s):
        return None

    base = _split_top_level_caret(s)

    # still numeric after stripping power
    if _is_number_like(base):
        return None

    # keep function tokens as-is (base form)
    if _ZETA_CALL_RE.match(base):
        return base
    if _GAMMA_CALL_RE.match(base):
        return base
    if _BANG_SUBFACT_RE.match(base):
        return base

    # expression token: keep literal string as node label if you want it counted.
    # For the coupling map, most people exclude these from node vocab unless they
    # are part of your 35/32 sets. Keeping them is safe; you can filter later.
    if _EXPR_TOKEN_RE.match(base):
        return base

    return base


# ---------- build coupling ----------
def collect_external_sets(recipe: dict) -> tuple[set[str], set[str]]:
    eg = recipe["external_geometry"]
    eb = recipe["external_boundary"]

    geom: set[str] = set()
    bound: set[str] = set()

    for raw in _iter_factor_items(eg.get("numerator")):
        t = normalize_external_token(raw)
        if t:
            geom.add(t)
    for raw in _iter_factor_items(eg.get("denominator")):
        t = normalize_external_token(raw)
        if t:
            geom.add(t)

    for raw in _iter_factor_items(eb.get("numerator")):
        t = normalize_external_token(raw)
        if t:
            bound.add(t)
    for raw in _iter_factor_items(eb.get("denominator")):
        t = normalize_external_token(raw)
        if t:
            bound.add(t)

    return geom, bound


# ---------- GraphML writer (simple, yEd-readable) ----------
def write_graphml(
    path: Path,
    geometry_nodes: list[str],
    boundary_nodes: list[str],
    edge_weights: dict[tuple[str, str], int],
) -> None:
    # minimal GraphML that yEd opens; uses plain labels
    def esc(x: str) -> str:
        return (
            x.replace("&", "&amp;")
             .replace("<", "&lt;")
             .replace(">", "&gt;")
             .replace('"', "&quot;")
        )

    with path.open("w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<graphml xmlns="http://graphml.graphdrawing.org/xmlns"\n')
        f.write('         xmlns:y="http://www.yworks.com/xml/graphml">\n')
        f.write('  <key id="d0" for="node" yfiles.type="nodegraphics"/>\n')
        f.write('  <key id="d1" for="edge" yfiles.type="edgegraphics"/>\n')
        f.write('  <key id="w" for="edge" attr.name="weight" attr.type="int"/>\n')
        f.write('  <graph id="G" edgedefault="directed">\n')

        def write_node(node_id: str, label: str, side: str) -> None:
            # side used only as part of node id and for optional styling later
            f.write(f'    <node id="{esc(node_id)}">\n')
            f.write('      <data key="d0">\n')
            f.write('        <y:ShapeNode>\n')
            f.write('          <y:NodeLabel>')
            f.write(esc(label))
            f.write('</y:NodeLabel>\n')
            f.write('        </y:ShapeNode>\n')
            f.write('      </data>\n')
            f.write('    </node>\n')

        # stable ids
        for g in geometry_nodes:
            write_node(f"geom::{g}", g, "geom")
        for b in boundary_nodes:
            write_node(f"bound::{b}", b, "bound")

        # edges
        eid = 0
        for (g, b), w in sorted(edge_weights.items(), key=lambda x: (-x[1], x[0][0], x[0][1])):
            eid += 1
            f.write(f'    <edge id="e{eid}" source="{esc("geom::"+g)}" target="{esc("bound::"+b)}">\n')
            f.write(f'      <data key="w">{w}</data>\n')
            f.write('      <data key="d1">\n')
            f.write('        <y:PolyLineEdge>\n')
            f.write(f'          <y:EdgeLabel>{w}</y:EdgeLabel>\n')
            f.write('        </y:PolyLineEdge>\n')
            f.write('      </data>\n')
            f.write('    </edge>\n')

        f.write('  </graph>\n')
        f.write('</graphml>\n')


def main() -> None:
    HERE = Path(__file__).resolve().parent
    RECIPES_YAML = HERE.parent / "recipes" / "constants.yaml"

    data = yaml.safe_load(RECIPES_YAML.read_text(encoding="utf-8"))
    recipes = data.get("constants", [])

    all_geom: set[str] = set()
    all_bound: set[str] = set()
    weights: dict[tuple[str, str], int] = defaultdict(int)

    for r in recipes:
        geom, bound = collect_external_sets(r)
        if not geom or not bound:
            continue

        all_geom |= geom
        all_bound |= bound

        for g in geom:
            for b in bound:
                weights[(g, b)] += 1

    geometry_nodes = sorted(all_geom)
    boundary_nodes = sorted(all_bound)

    out = HERE / "coupling_map.graphml"
    write_graphml(out, geometry_nodes, boundary_nodes, weights)

    print(f"Wrote: {out}")
    print(f"Geometry nodes: {len(geometry_nodes)}")
    print(f"Boundary nodes:  {len(boundary_nodes)}")
    print(f"Edges:           {len(weights)}")


if __name__ == "__main__":
    main()
