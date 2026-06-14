import csv
import importlib.util
from pathlib import Path

ROOT = Path.cwd()
MANIFEST_PATH = ROOT / "src" / "nature_constants_manifest.py"
GENERATED_CSV = ROOT / "symbols" / "generated_symbols.csv"
REPORT_CSV = ROOT / "symbols" / "manifest_value_mismatches.csv"

DIGITS_TO_COMPARE = 100

def load_manifest():
    spec = importlib.util.spec_from_file_location("nature_constants_manifest", MANIFEST_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.NATURE_CONSTANTS

def significant_digits(value, n=DIGITS_TO_COMPARE):
    s = str(value).strip()
    if "e" in s.lower():
        s = s.lower().split("e", 1)[0]
    digits = "".join(ch for ch in s if ch.isdigit())
    digits = digits.lstrip("0")
    if not digits:
        digits = "0"
    return digits[:n]

def longest_common_prefix(a, b):
    limit = min(len(a), len(b))
    i = 0
    while i < limit and a[i] == b[i]:
        i += 1
    return i

def main():
    manifest = load_manifest()

    with GENERATED_CSV.open("r", encoding="utf-8", newline="") as f:
        generated_rows = list(csv.DictReader(f))

    generated_by_digits = {}
    for row in generated_rows:
        key = significant_digits(row["value"])
        generated_by_digits.setdefault(key, []).append(row)

    mismatches = []

    for entry in manifest:
        manifest_key = significant_digits(entry["value"])

        if manifest_key in generated_by_digits:
            continue

        best_prefix = -1
        best_row = None

        for row in generated_rows:
            generated_key = significant_digits(row["value"])
            prefix = longest_common_prefix(manifest_key, generated_key)

            if prefix > best_prefix:
                best_prefix = prefix
                best_row = row

        best_row = best_row or {}

        mismatches.append({
            "slot": entry.get("slot", ""),
            "id": entry.get("id", ""),
            "title": entry.get("title", ""),
            "manifest_dimension": entry.get("dimension", ""),
            "manifest_value": entry.get("value", ""),
            "matching_digits": best_prefix,
            "closest_generated_token": best_row.get("token", ""),
            "closest_generated_dimension": best_row.get("dimension", ""),
            "closest_generated_value": best_row.get("value", ""),
        })

    print()
    print("Manifest entries checked:", len(manifest))
    print("Generated rows checked: ", len(generated_rows))
    print("Mismatches found:      ", len(mismatches))
    print()

    if mismatches:
        print("Mismatches:")
        for row in mismatches:
            print(
                "slot "
                + str(row["slot"]).rjust(3)
                + " | "
                + str(row["title"])
                + " | closest: "
                + str(row["closest_generated_token"])
                + " | matching digits: "
                + str(row["matching_digits"])
            )

        with REPORT_CSV.open("w", encoding="utf-8", newline="") as f:
            fieldnames = [
                "slot",
                "id",
                "title",
                "manifest_dimension",
                "manifest_value",
                "matching_digits",
                "closest_generated_token",
                "closest_generated_dimension",
                "closest_generated_value",
            ]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(mismatches)

        print()
        print("Detailed report written to:", REPORT_CSV)
    else:
        print("All manifest values match generated values by first 100 significant digits.")

main()
