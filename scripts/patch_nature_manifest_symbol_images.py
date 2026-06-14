import ast
import re
from pathlib import Path

SITE_ROOT = Path.cwd()
CONSTANTS_PAGE = SITE_ROOT / "src" / "app" / "constants-of-nature" / "page.js"
MANIFEST_PATH = SITE_ROOT / "constant_engine" / "src" / "nature_constants_manifest.py"

PREDICTION_MARKER = "{/* 7. Prediction */}"


def extract_symbol_images():
    text = CONSTANTS_PAGE.read_text(encoding="utf-8")
    parts = text.split(PREDICTION_MARKER)
    blocks = parts[1:]

    symbol_images = []

    for index, block in enumerate(blocks, start=1):
        match = re.search(r'src="([^"]+\.svg)"', block)

        if not match:
            raise RuntimeError(f"Could not find symbol image after prediction marker #{index}")

        symbol_images.append(match.group(1))

    return symbol_images


def load_manifest():
    text = MANIFEST_PATH.read_text(encoding="utf-8")
    tree = ast.parse(text)

    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "NATURE_CONSTANTS":
                    return ast.literal_eval(node.value)

    raise RuntimeError("Could not find NATURE_CONSTANTS in manifest.")


def py_string(value):
    return repr(str(value))


def write_manifest(constants):
    lines = []
    lines.append("# Auto-generated starting manifest.")
    lines.append("# Edit this file manually in chunks.")
    lines.append("# Each dictionary is one Constants of Nature menu entry.")
    lines.append("# symbolImage values were copied from src/app/constants-of-nature/page.js.")
    lines.append("")
    lines.append("NATURE_CONSTANTS = [")
    lines.append("")

    for constant in constants:
        lines.append("    {")
        lines.append(f'        "slot": {constant["slot"]},')
        lines.append(f'        "id": {py_string(constant["id"])},')
        lines.append(f'        "title": {py_string(constant["title"])},')
        lines.append(f'        "symbol": {py_string(constant.get("symbol", ""))},')
        lines.append(f'        "symbolImage": {py_string(constant.get("symbolImage", ""))},')
        lines.append(f'        "value": {py_string(constant.get("value", ""))},')
        lines.append(f'        "dimension": {py_string(constant.get("dimension", ""))},')
        lines.append(f'        "description": {py_string(constant.get("description", ""))},')
        lines.append("    },")
        lines.append("")

    lines.append("]")
    lines.append("")

    MANIFEST_PATH.write_text("\n".join(lines), encoding="utf-8")


def main():
    symbol_images = extract_symbol_images()
    constants = load_manifest()

    print(f"Symbol images found: {len(symbol_images)}")
    print(f"Manifest constants found: {len(constants)}")

    if len(symbol_images) != 288:
        raise RuntimeError(f"Expected 288 symbol images, found {len(symbol_images)}")

    if len(constants) != 288:
        raise RuntimeError(f"Expected 288 manifest constants, found {len(constants)}")

    for constant, symbol_image in zip(constants, symbol_images):
        constant["symbolImage"] = symbol_image

    print()
    print("First 8 patched entries:")
    for constant in constants[:8]:
        print(f'{constant["slot"]:03d} | {constant["symbol"]} | {constant["symbolImage"]}')

    print()
    print("Last 8 patched entries:")
    for constant in constants[-8:]:
        print(f'{constant["slot"]:03d} | {constant["symbol"]} | {constant["symbolImage"]}')

    write_manifest(constants)
    print()
    print(f"Patched {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
