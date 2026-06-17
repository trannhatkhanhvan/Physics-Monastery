from pathlib import Path
import re
import shutil
import sys

ROOT = Path.cwd()

PAGE_PATH = ROOT / "src/app/constants-of-nature/page.js"
YAML_PATH = ROOT / "constant_engine/recipes/constants.yaml"

def normalize(name: str) -> str:
    s = name.lower()

    replacements = {
        "’": "'",
        "ˢᵗ": "st",
        "ⁿᵈ": "nd",
        "ᵗʰ": "th",
        "mangeton": "magneton",
        "hyperpolarizibility": "hyperpolarizability",
        "hartree-kelvin_relationship": "hartree-kelvin relationship",
        "kelvin-hartree_relationship": "kelvin-hartree relationship",
    }

    for a, b in replacements.items():
        s = s.replace(a, b)

    return re.sub(r"[^a-z0-9]+", "", s)

def extract_official_order(page_text: str):
    m = re.search(
        r"const\s+equationNames\s*=\s*\{(?P<body>.*?)\}\s*;",
        page_text,
        re.S,
    )

    if not m:
        raise ValueError("Could not find `const equationNames = { ... };` in constants-of-nature/page.js")

    body = m.group("body")
    official = []

    for line in body.splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue

        m_line = re.match(r"^(\d+)\s*:\s*(.+?)\s*,?\s*$", line)
        if not m_line:
            continue

        n = int(m_line.group(1))
        raw = m_line.group(2).strip()

        if raw.endswith(","):
            raw = raw[:-1].strip()

        if (raw.startswith('"') and raw.endswith('"')) or (raw.startswith("'") and raw.endswith("'")):
            name = raw[1:-1]
        else:
            name = raw

        official.append((n, name.strip()))

    official.sort(key=lambda x: x[0])

    if len(official) != 288:
        raise ValueError(f"Expected 288 official names, found {len(official)}")

    expected_numbers = list(range(1, 289))
    actual_numbers = [n for n, _ in official]

    if actual_numbers != expected_numbers:
        raise ValueError("Official equationNames numbers are not exactly 1..288")

    return official

def extract_yaml_blocks(yaml_text: str):
    if "constants:" not in yaml_text:
        raise ValueError("Could not find `constants:` in constants.yaml")

    header, rest = yaml_text.split("constants:", 1)

    blocks = re.findall(
        r"(?ms)^  - \{ recipe_number:.*?(?=^  - \{ recipe_number:|\Z)",
        rest,
    )

    if len(blocks) != 288:
        raise ValueError(f"Expected 288 YAML recipe blocks, found {len(blocks)}")

    return header, blocks

def get_field(block: str, field: str) -> str:
    m = re.search(rf"{re.escape(field)}:\s*\"([^\"]+)\"", block)
    if m:
        return m.group(1).strip()

    m = re.search(rf"{re.escape(field)}:\s*([^,\n}}]+)", block)
    if m:
        return m.group(1).strip()

    raise ValueError(f"Could not find field `{field}` in block:\n{block[:300]}")

def set_recipe_number(block: str, n: int) -> str:
    return re.sub(
        r"recipe_number:\s*\d+",
        f"recipe_number: {n}",
        block,
        count=1,
    )

page_text = PAGE_PATH.read_text(encoding="utf-8")
yaml_text = YAML_PATH.read_text(encoding="utf-8")

official = extract_official_order(page_text)
header, blocks = extract_yaml_blocks(yaml_text)

block_by_old_number = {}
block_by_norm_name = {}
duplicate_norm_names = set()

for block in blocks:
    old_number = int(get_field(block, "recipe_number"))
    display_name = get_field(block, "display_name")

    block_by_old_number[old_number] = block

    key = normalize(display_name)
    if key in block_by_norm_name:
        duplicate_norm_names.add(key)
    else:
        block_by_norm_name[key] = block

for key in duplicate_norm_names:
    block_by_norm_name.pop(key, None)

manual_by_old_number = {
    normalize("molar volume of ideal gas_0"): 121,
    normalize("molar volume of ideal gas_1"): 122,
    normalize("speed of light in vacuum"): 145,
    normalize("neutron-proton mass energy equivalent in MeV"): 90,
}

new_blocks = []
unmatched = []

for new_number, official_name in official:
    key = normalize(official_name)

    if key in manual_by_old_number:
        old_number = manual_by_old_number[key]
        block = block_by_old_number[old_number]
    else:
        block = block_by_norm_name.get(key)

    if block is None:
        unmatched.append((new_number, official_name))
        continue

    new_blocks.append(set_recipe_number(block, new_number))

if unmatched:
    print("Could not match these official names to constants.yaml:")
    for n, name in unmatched:
        print(f"  {n}: {name}")
    print("\nNo changes were written.")
    sys.exit(1)

used_ids = [get_field(block, "constant_id") for block in new_blocks]
if len(set(used_ids)) != 288:
    print("Duplicate constants detected after reorder. No changes were written.")
    sys.exit(1)

backup = YAML_PATH.with_suffix(".yaml.bak")
shutil.copy2(YAML_PATH, backup)

new_text = header.rstrip() + "\n\nconstants:\n\n" + "\n".join(new_blocks).rstrip() + "\n"
YAML_PATH.write_text(new_text, encoding="utf-8")

print("Reordered constants.yaml to match src/app/constants-of-nature/page.js")
print(f"Backup written to: {backup}")
