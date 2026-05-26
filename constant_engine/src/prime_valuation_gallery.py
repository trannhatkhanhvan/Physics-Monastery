import argparse
import subprocess
import sys
from pathlib import Path


# ============================================================
# PRIME GENERATION
# ============================================================

def is_prime(n):
    if n < 2:
        return False

    if n == 2:
        return True

    if n % 2 == 0:
        return False

    factor = 3

    while factor * factor <= n:
        if n % factor == 0:
            return False

        factor += 2

    return True


def first_n_primes(count):
    primes = []
    n = 2

    while len(primes) < count:
        if is_prime(n):
            primes.append(n)

        n += 1

    return primes


# ============================================================
# HTML GALLERY
# ============================================================

def make_gallery_html(primes, output_files, gallery_filename):
    first_file = output_files[0]

    buttons = []

    for prime, filename in zip(primes, output_files):
        buttons.append(
            f"""
            <button onclick="showWall('{filename}', {prime})">
                p = {prime}
            </button>
            """
        )

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Prime Valuation Number Wall Gallery</title>

<style>
body {{
    margin: 0;
    background: #101010;
    color: #eeeeee;
    font-family: Menlo, Monaco, Consolas, monospace;
}}

.header {{
    padding: 18px 24px 12px 24px;
    border-bottom: 1px solid #303030;
    background: #151515;
}}

h1 {{
    margin: 0 0 8px 0;
    font-size: 22px;
    font-weight: 500;
}}

.note {{
    margin: 0 0 14px 0;
    color: #bbbbbb;
    font-size: 13px;
}}

.buttons {{
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}}

button {{
    background: #222222;
    color: #eeeeee;
    border: 1px solid #555555;
    padding: 7px 10px;
    font-family: Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
    cursor: pointer;
}}

button:hover {{
    background: #333333;
}}

.current {{
    margin-top: 12px;
    color: #ffd166;
    font-size: 14px;
}}

.viewer {{
    width: 100vw;
    height: calc(100vh - 145px);
    border: 0;
}}
</style>

<script>
function showWall(filename, prime) {{
    document.getElementById("viewer").src = filename;
    document.getElementById("current").innerText = "Currently viewing valuation prime p = " + prime;
}}
</script>

</head>

<body>
<div class="header">
    <h1>Prime Valuation Number Wall Gallery</h1>
    <p class="note">
        Each view colors the number wall by p-adic valuation:
        brightness shows how many times the selected prime divides each wall entry.
    </p>

    <div class="buttons">
        {''.join(buttons)}
    </div>

    <div id="current" class="current">
        Currently viewing valuation prime p = {primes[0]}
    </div>
</div>

<iframe id="viewer" class="viewer" src="{first_file}"></iframe>

</body>
</html>
"""

    with open(gallery_filename, "w", encoding="utf-8") as f:
        f.write(html)


# ============================================================
# MAIN
# ============================================================

def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate a gallery of number-wall valuation images for the first n primes."
    )

    parser.add_argument(
        "--count",
        type=int,
        default=10,
        help="Number of primes to generate. Default: 20.",
    )

    parser.add_argument(
        "--width",
        type=int,
        default=None,
        help="Visible wall width. If omitted, number_wall.py default is used.",
    )

    parser.add_argument(
        "--depth",
        type=int,
        default=None,
        help="Visible wall depth. If omitted, number_wall.py default is used.",
    )

    parser.add_argument(
        "--mode",
        default=None,
        choices=["values", "mathologer", "zeros", "mod10"],
        help="Display mode. If omitted, number_wall.py default is used.",
    )

    parser.add_argument(
        "--sequence",
        default=None,
        help="Optional sequence text to pass directly to number_wall.py.",
    )

    parser.add_argument(
        "--kind",
        default=None,
        choices=["digits", "terms"],
        help="Sequence kind. Use digits for digit strings, terms for spaced sequences.",
    )

    parser.add_argument(
        "--start",
        default=None,
        help='First visible sequence index. Use an integer or "auto".',
    )

    return parser.parse_args()


def main():
    args = parse_args()

    script_dir = Path(__file__).resolve().parent
    number_wall_script = script_dir / "number_wall.py"

    if not number_wall_script.exists():
        raise FileNotFoundError(
            f"Could not find number_wall.py in this folder: {script_dir}"
        )

    primes = first_n_primes(args.count)
    output_files = []

    for prime in primes:
        output_filename = f"number_wall_valuation_p{prime:03d}.html"
        output_files.append(output_filename)

        command = [
            sys.executable,
            str(number_wall_script),
            "--color-mode",
            "valuation",
            "--valuation-prime",
            str(prime),
            "--html",
            output_filename,
        ]

        if args.width is not None:
            command.extend(["--width", str(args.width)])

        if args.depth is not None:
            command.extend(["--depth", str(args.depth)])

        if args.mode is not None:
            command.extend(["--mode", args.mode])

        if args.sequence is not None:
            command.extend(["--sequence", args.sequence])

        if args.kind is not None:
            command.extend(["--kind", args.kind])

        if args.start is not None:
            command.extend(["--start", args.start])

        print(f"Generating p = {prime}: {output_filename}")
        subprocess.run(command, cwd=script_dir, check=True)

    gallery_filename = "number_wall_prime_gallery.html"

    make_gallery_html(
        primes=primes,
        output_files=output_files,
        gallery_filename=script_dir / gallery_filename,
    )

    print()
    print(f"Created gallery: {gallery_filename}")
    print(f"Open it with: open {gallery_filename}")


if __name__ == "__main__":
    main()