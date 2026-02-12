import yaml
from pathlib import Path
from collections import defaultdict, Counter
import re

ENGINE_ROOT = Path(__file__).resolve().parents[1]
RECIPES_YAML = ENGINE_ROOT / "recipes" / "constants.yaml"

data = yaml.safe_load(RECIPES_YAML.read_text(encoding="utf-8"))
recipes = data["constants"]

# ---- basic sets ----
all_ids = {r["constant_id"] for r in recipes}

def kind(r):
    return (r.get("expected_kind","measured") or "measured").strip().lower()

exact_ids = {r["constant_id"] for r in recipes if kind(r) == "exact"}

# ---- token extraction ----
NAME_RE = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]*\b")

def extract_tokens(x):
    out = set()
    if isinstance(x, list):
        for item in x:
            out |= extract_tokens(item)
    elif isinstance(x, dict):
        for v in x.values():
            out |= extract_tokens(v)
    elif isinstance(x, str):
        for n in NAME_RE.findall(x):
            out.add(n)
    return out

# ---- dependency graph ----
deps = defaultdict(set)

for r in recipes:
    cid = r["constant_id"]
    tokens = set()

    for block in ("external_geometry", "external_boundary"):
        tokens |= extract_tokens(r[block])

    # keep only recipe-to-recipe dependencies
    for t in tokens:
        if t in all_ids:
            deps[cid].add(t)

# ---- exact-closure test ----
violations = {}

for cid in exact_ids:
    bad = {d for d in deps[cid] if d not in exact_ids}
    if bad:
        violations[cid] = bad

print("Exact recipes:", len(exact_ids))
print("Exact closure violations:", len(violations))

if violations:
    print("\nExact recipes depending on NON-exact recipes:")
    for k,v in violations.items():
        print(f" - {k} -> {sorted(v)}")
else:
    print("\nExact set IS CLOSED under recipe dependencies.")
