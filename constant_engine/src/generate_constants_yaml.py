from pathlib import Path
import yaml

# Adjust if needed
ENGINE_ROOT = Path(__file__).resolve().parent.parent
INDEX_FILE = ENGINE_ROOT / "recipes" / "constants_index.py"
OUTPUT_FILE = ENGINE_ROOT / "recipes" / "constants.yaml"


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


def recipe_stub(constant_id: str, display_name: str):
    return {
        "constant_id": constant_id,
        "display_name": display_name,
        "column": "",
        "island": "",
        "dimension": "",
        "external_geometry": {"numerator": {}, "denominator": {}},
        "external_boundary": {"numerator": {}, "denominator": {}},
        "inversion_geometry": {"numerator": {}, "denominator": {}},
        "root_transform": {"id": "", "variant": None},
        "expected_kind": "measured",
        "expected_value": None,
    }


def main():
    constants = load_constants_index()

    recipes = []
    for _, name in constants:
        # create a clean constant_id from the name
        cid = (
            name.lower()
            .replace(" ", "_")
            .replace("-", "_")
            .replace("/", "_")
        )
        recipes.append(recipe_stub(cid, name))

    data = {"constants": recipes}

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        yaml.dump(data, sort_keys=False, width=120),
        encoding="utf-8"
    )

    print(f"Wrote {OUTPUT_FILE}")
    print(f"Total constants: {len(recipes)}")


if __name__ == "__main__":
    main()