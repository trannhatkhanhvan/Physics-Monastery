from pathlib import Path
import yaml

# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------

ENGINE_ROOT = Path(__file__).resolve().parent.parent
INDEX_FILE = ENGINE_ROOT / "recipes" / "constants_index.py"
OUTPUT_FILE = ENGINE_ROOT / "recipes" / "constants.yaml"


# ------------------------------------------------------------
# Load constants list from constants_index.py
# ------------------------------------------------------------

def load_constants_index():
    """
    constants_index.py should define:
        CONSTANTS = [
            (1, "hartree-kelvin relationship"),
            (2, "kelvin-hartree relationship"),
            ...
        ]
    """
    namespace = {}
    exec(INDEX_FILE.read_text(encoding="utf-8"), namespace)
    return namespace["CONSTANTS"]


# ------------------------------------------------------------
# Recipe stub template (matches your current recipe schema)
# ------------------------------------------------------------

def recipe_stub(recipe_number: int, constant_id: str, display_name: str):
    return {
        "recipe_number": recipe_number,
        "constant_id": constant_id,
        "display_name": display_name,
        "column": "",
        "island": "",
        "dimension": "",
        # New recipe factor format: dict of {token: power}
        "external_geometry": {"numerator": {}, "denominator": {}},
        "external_boundary": {"numerator": {}, "denominator": {}},
        "inversion_geometry": {"numerator": {}, "denominator": {}},
        # Match your recipes: {id: ..., power: ...}
        "root_transform": {"id": "", "power": 1},
        "expected_kind": "measured",
        "expected_value": None,
        "expected_digits": None,
        "expected_digits_label": None,
    }


def make_constant_id(name: str) -> str:
    """
    Create a clean constant_id from the display name.
    Keeps it simple and predictable.
    """
    cid = name.strip().lower()
    cid = cid.replace(" ", "_").replace("-", "_").replace("/", "_")
    cid = cid.replace("__", "_")
    return cid


# ------------------------------------------------------------
# Main
# ------------------------------------------------------------

def main():
    constants = load_constants_index()

    recipes = []
    for recipe_number, display_name in constants:
        cid = make_constant_id(display_name)
        recipes.append(recipe_stub(recipe_number, cid, display_name))

    data = {"constants": recipes}

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        yaml.dump(data, sort_keys=False, width=120, allow_unicode=True),
        encoding="utf-8"
    )

    print(f"Wrote {OUTPUT_FILE}")
    print(f"Total constants: {len(recipes)}")


if __name__ == "__main__":
    main()
