import argparse
import math
import re
from html import escape


# ============================================================
# USER SETTINGS
# ============================================================

# With SEQUENCE_KIND = "digits", every digit becomes one separate
# sequence entry. Decimal points are ignored.
SEQUENCE_TEXT = "5.391258368323128751376726712741777763741560781183240592259291557416025825541021767785863695159442158"

SEQUENCE_KIND = "digits"

# Options:
#   "digits"   treat every digit as one sequence entry
#   "terms"    treat spaced/comma-separated numbers as sequence entries

VISIBLE_START = "auto"
VISIBLE_WIDTH = 100         # number of columns shown
VISIBLE_DEPTH = 50          # rows below the sequence row

DISPLAY_MODE = "values"
# Options:
#   "values"       show values inside the squares
#   "mathologer"   show zeros only below the sequence row
#   "zeros"        terminal zero-pattern mode
#   "mod10"        show values modulo 10 inside the squares

COLOR_MODE = "signed_log"
# Options:
#   "signed_log"      blue/red by sign, brightness by log10(|value| + 1)
#   "row_signed_log"  same idea, but brightness is scaled separately by row
#   "small_values"    highlights -2, -1, 0, 1, 2; larger values use signed log
#   "zero_windows"    Mathologer-style: zeros bright, nonzeros dark
#   "valuation"       color by p-adic divisibility depth
#   "mod"             flexible modulus coloring
#   "sign"            sign only
#   "none"            neutral coloring only

MODULUS = 10                # used when COLOR_MODE = "mod"
VALUATION_PRIME = 2         # used when COLOR_MODE = "valuation"

CELL_WIDTH = 8
MAKE_HTML = True
HTML_FILENAME = "number_wall.html"

SQUARE_SIZE = 28
SHOW_TOOLTIPS = True

UNKNOWN_COLOR = "#0d0d0d"
UNKNOWN_TEXT_COLOR = "#333333"
GRID_BORDER_COLOR = "#2b2b2b"
ROW_LABEL_BG = "#181818"
ROW_LABEL_TEXT = "#aaaaaa"

# These are computed after the wall is built.
SIGNED_LOG_MAX = 1.0
ROW_SIGNED_LOG_MAX_BY_ROW = {}
VALUATION_MAX = 1


# ============================================================
# PARSE SEQUENCE
# ============================================================

def parse_sequence(text, sequence_kind="digits"):
    text = text.strip()

    if not text:
        raise ValueError("The sequence is empty.")

    if sequence_kind == "digits":
        digits = re.findall(r"\d", text)

        if not digits:
            raise ValueError("No digits were found in the sequence text.")

        return [int(ch) for ch in digits]

    if sequence_kind == "terms":
        terms = re.findall(r"-?\d+", text)

        if not terms:
            raise ValueError("No integer terms were found in the sequence text.")

        return [int(x) for x in terms]

    raise ValueError(f"Unknown sequence kind: {sequence_kind}")


def load_sequence_from_file(filename, sequence_kind="digits"):
    with open(filename, "r", encoding="utf-8") as f:
        return parse_sequence(f.read(), sequence_kind=sequence_kind)


# ============================================================
# EXACT DETERMINANT USING BAREISS ALGORITHM
# ============================================================

def bareiss_det(matrix):
    n = len(matrix)

    if n == 0:
        return 1

    if n == 1:
        return matrix[0][0]

    a = [row[:] for row in matrix]
    sign = 1
    previous_pivot = 1

    for k in range(n - 1):
        if a[k][k] == 0:
            swap_row = None

            for r in range(k + 1, n):
                if a[r][k] != 0:
                    swap_row = r
                    break

            if swap_row is None:
                return 0

            a[k], a[swap_row] = a[swap_row], a[k]
            sign *= -1

        pivot = a[k][k]

        for i in range(k + 1, n):
            for j in range(k + 1, n):
                a[i][j] = (a[i][j] * pivot - a[i][k] * a[k][j]) // previous_pivot

        previous_pivot = pivot

        for i in range(k + 1, n):
            a[i][k] = 0

        for j in range(k + 1, n):
            a[k][j] = 0

    return sign * a[n - 1][n - 1]


# ============================================================
# NUMBER WALL ENTRY
# ============================================================

def wall_entry(sequence, row, col):
    if row == -1:
        return 1

    if row == 0:
        if 0 <= col < len(sequence):
            return sequence[col]
        return None

    left_needed = col - row
    right_needed = col + row

    if left_needed < 0 or right_needed >= len(sequence):
        return None

    matrix = []

    for i in range(row + 1):
        matrix_row = []

        for j in range(row + 1):
            matrix_row.append(sequence[col + i - j])

        matrix.append(matrix_row)

    return bareiss_det(matrix)


# ============================================================
# BUILD WALL
# ============================================================

def resolve_visible_start(sequence_length, visible_start, visible_width):
    if isinstance(visible_start, int):
        return visible_start

    if str(visible_start).lower() == "auto":
        return max(0, (sequence_length - visible_width) // 2)

    return int(visible_start)


def build_number_wall(sequence, visible_start, visible_width, visible_depth):
    rows = []

    for row in range(-1, visible_depth + 1):
        row_values = []

        for col in range(visible_start, visible_start + visible_width):
            row_values.append(wall_entry(sequence, row, col))

        rows.append((row, row_values))

    return rows


# ============================================================
# DISPLAY FORMATTING
# ============================================================

def shorten_text(text, max_length):
    if len(text) <= max_length:
        return text

    if max_length <= 1:
        return text[:max_length]

    return text[:max_length - 1] + "…"


def format_value(value, mode, row_number=None):
    if value is None:
        return ""

    if mode == "mathologer":
        if row_number in (-1, 0):
            return str(value)

        if value == 0:
            return "0"

        return ""

    if mode == "zeros":
        if value == 0:
            return "0"
        return "."

    if mode == "mod10":
        return str(value % 10)

    return str(value)


def print_wall(rows, mode, cell_width):
    for row_number, values in rows:
        label = f"{row_number:>3} | "
        formatted_values = []

        for value in values:
            text = format_value(value, mode, row_number=row_number)
            text = shorten_text(text, cell_width)
            formatted_values.append(text.rjust(cell_width))

        print(label + "".join(formatted_values))


# ============================================================
# COLOR HELPERS
# ============================================================

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
    )


def text_color_for_background(hex_color):
    r, g, b = hex_to_rgb(hex_color)
    brightness = 0.299 * r + 0.587 * g + 0.114 * b

    if brightness >= 160:
        return "#111111"

    return "#ffffff"


def blend_colors(hex_a, hex_b, t):
    t = max(0.0, min(1.0, t))

    r1, g1, b1 = hex_to_rgb(hex_a)
    r2, g2, b2 = hex_to_rgb(hex_b)

    r = round(r1 + (r2 - r1) * t)
    g = round(g1 + (g2 - g1) * t)
    b = round(b1 + (b2 - b1) * t)

    return f"#{r:02x}{g:02x}{b:02x}"


def p_adic_valuation(value, prime):
    if value == 0:
        return None

    value = abs(value)
    count = 0

    while value % prime == 0:
        count += 1
        value //= prime

    return count


def compute_signed_log_scale(rows):
    max_log = 0.0

    for _, values in rows:
        for value in values:
            if value is None or value == 0:
                continue

            size = math.log10(abs(value) + 1)

            if size > max_log:
                max_log = size

    return max(max_log, 1.0)


def compute_row_signed_log_scales(rows):
    row_scales = {}

    for row_number, values in rows:
        max_log = 0.0

        for value in values:
            if value is None or value == 0:
                continue

            size = math.log10(abs(value) + 1)

            if size > max_log:
                max_log = size

        row_scales[row_number] = max(max_log, 1.0)

    return row_scales


def compute_valuation_scale(rows, prime):
    max_value = 0

    for _, values in rows:
        for value in values:
            if value is None or value == 0:
                continue

            valuation = p_adic_valuation(value, prime)

            if valuation is not None and valuation > max_value:
                max_value = valuation

    return max(max_value, 1)


def signed_log_color(value, scale):
    if value == 0:
        return "#f4f4f4", "#111111"

    scaled = math.log10(abs(value) + 1) / scale
    scaled = max(0.0, min(1.0, scaled))

    if value > 0:
        bg = blend_colors("#0b1220", "#4cc9f0", scaled)
    else:
        bg = blend_colors("#200b0b", "#ff6b6b", scaled)

    fg = text_color_for_background(bg)
    return bg, fg


def color_for_value(value, color_mode, row_number=None):
    if value is None:
        return UNKNOWN_COLOR, UNKNOWN_TEXT_COLOR

    if color_mode == "none":
        bg = "#1a1a1a"
        fg = "#f0f0f0"
        return bg, fg

    if color_mode == "signed_log":
        return signed_log_color(value, SIGNED_LOG_MAX)

    if color_mode == "row_signed_log":
        row_scale = ROW_SIGNED_LOG_MAX_BY_ROW.get(row_number, SIGNED_LOG_MAX)
        return signed_log_color(value, row_scale)

    if color_mode == "small_values":
        small_palette = {
            -2: ("#7a0019", "#ffffff"),
            -1: ("#ff3b3b", "#ffffff"),
             0: ("#f4f4f4", "#111111"),
             1: ("#2f80ed", "#ffffff"),
             2: ("#56ccf2", "#111111"),
        }

        if value in small_palette:
            return small_palette[value]

        return signed_log_color(value, SIGNED_LOG_MAX)

    if color_mode == "zero_windows":
        if value == 0:
            return "#f4f4f4", "#111111"

        return "#070707", "#333333"

    if color_mode == "valuation":
        if VALUATION_PRIME <= 1:
            raise ValueError("VALUATION_PRIME must be greater than 1.")

        if value == 0:
            return "#f4f4f4", "#111111"

        valuation = p_adic_valuation(value, VALUATION_PRIME)
        scaled = valuation / VALUATION_MAX
        scaled = max(0.0, min(1.0, scaled))

        bg = blend_colors("#111111", "#ffd166", scaled)
        fg = text_color_for_background(bg)
        return bg, fg

    if color_mode == "mod" or color_mode == "mod10":
        modulus = 10 if color_mode == "mod10" else MODULUS

        if modulus <= 1:
            raise ValueError("MODULUS must be greater than 1.")

        residue = value % modulus
        hue = round((360 * residue) / modulus)
        bg = f"hsl({hue}, 78%, 58%)"

        if residue in (0, 1, 2):
            fg = "#111111"
        else:
            fg = "#ffffff"

        return bg, fg

    if color_mode == "sign":
        if value == 0:
            bg = "#f4f4f4"
        elif value > 0:
            bg = "#294a7a"
        else:
            bg = "#7a2f2f"

        fg = text_color_for_background(bg)
        return bg, fg

    raise ValueError(f"Unknown COLOR_MODE: {color_mode}")


# ============================================================
# HTML OUTPUT
# ============================================================

def html_cell_text(value, row_number, mode):
    text = format_value(value, mode, row_number=row_number)

    if mode in ("values", "mod10"):
        text = shorten_text(text, 4)

    return text


def html_title_for(sequence_length, visible_start, visible_width, visible_depth):
    last_col = visible_start + visible_width - 1
    return (
        f"Number Wall — sequence length {sequence_length}, "
        f"columns {visible_start}–{last_col}, depth {visible_depth}"
    )


def make_mod_legend():
    legend = []
    legend.append("<div class='digit-legend'>")

    for residue in range(MODULUS):
        hue = round((360 * residue) / MODULUS)
        fg = "#111111" if residue in (0, 1, 2) else "#ffffff"

        legend.append(
            f"<div class='legend-item' style='background:hsl({hue}, 78%, 58%); color:{fg};'>{residue}</div>"
        )

    legend.append("</div>")
    return "\n".join(legend)


def make_small_value_legend():
    items = [
        (-2, "#7a0019", "#ffffff"),
        (-1, "#ff3b3b", "#ffffff"),
        (0, "#f4f4f4", "#111111"),
        (1, "#2f80ed", "#ffffff"),
        (2, "#56ccf2", "#111111"),
    ]

    legend = []
    legend.append("<div class='digit-legend'>")

    for label, bg, fg in items:
        legend.append(
            f"<div class='legend-item' style='background:{bg}; color:{fg};'>{label}</div>"
        )

    legend.append("</div>")
    return "\n".join(legend)


def make_html(rows, mode, color_mode, filename, sequence_length, visible_start, visible_width, visible_depth):
    title = html_title_for(sequence_length, visible_start, visible_width, visible_depth)

    html = []

    html.append("<!DOCTYPE html>")
    html.append("<html>")
    html.append("<head>")
    html.append("<meta charset='UTF-8'>")
    html.append(f"<title>{escape(title)}</title>")

    html.append(f"""
<style>
:root {{
    --square-size: {SQUARE_SIZE}px;
    --grid-border: {GRID_BORDER_COLOR};
    --row-label-bg: {ROW_LABEL_BG};
    --row-label-text: {ROW_LABEL_TEXT};
}}

body {{
    margin: 0;
    background: #101010;
    color: #eeeeee;
    font-family: Menlo, Monaco, Consolas, monospace;
}}

.page {{
    padding: 24px;
}}

h1 {{
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 500;
}}

.subtitle {{
    margin: 0 0 8px 0;
    color: #aaaaaa;
    font-size: 14px;
}}

.legend-note {{
    margin: 0 0 12px 0;
    color: #bbbbbb;
    font-size: 13px;
}}

.digit-legend {{
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 0 0 18px 0;
}}

.legend-item {{
    width: 32px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #444444;
    font-size: 12px;
    font-weight: 700;
}}

.wall-frame {{
    overflow: auto;
    max-width: calc(100vw - 48px);
    max-height: calc(100vh - 160px);
    border: 1px solid #303030;
    background: #080808;
}}

.wall {{
    border-collapse: collapse;
}}

.row-label {{
    position: sticky;
    left: 0;
    z-index: 2;
    min-width: 50px;
    height: var(--square-size);
    text-align: right;
    padding-right: 8px;
    color: var(--row-label-text);
    background: var(--row-label-bg);
    border: 1px solid var(--grid-border);
    font-size: 13px;
}}

.cell {{
    width: var(--square-size);
    min-width: var(--square-size);
    height: var(--square-size);
    border: 1px solid var(--grid-border);
    text-align: center;
    vertical-align: middle;
    padding: 0;
    font-size: 10px;
    line-height: 1.05;
    font-weight: 700;
    overflow: hidden;
}}

.cell-inner {{
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 1px;
    box-sizing: border-box;
}}

.unknown {{
    background: {UNKNOWN_COLOR};
    color: {UNKNOWN_TEXT_COLOR};
}}
</style>
""")

    html.append("</head>")
    html.append("<body>")
    html.append("<div class='page'>")
    html.append("<h1>Number Wall</h1>")
    html.append(f"<p class='subtitle'>{escape(title)}</p>")

    if color_mode == "signed_log":
        html.append("<p class='legend-note'>Color rule: blue = positive and red = negative. Brightness is based on log10(|value| + 1). White squares are zero. Hover over a square to see the full value.</p>")
    elif color_mode == "row_signed_log":
        html.append("<p class='legend-note'>Color rule: blue = positive and red = negative. Brightness is scaled separately within each row, which makes row structure easier to see. White squares are zero.</p>")
    elif color_mode == "small_values":
        html.append("<p class='legend-note'>Color rule: special colors for -2, -1, 0, 1, and 2. Larger values use signed-log coloring.</p>")
        html.append(make_small_value_legend())
    elif color_mode == "zero_windows":
        html.append("<p class='legend-note'>Color rule: white = zero, dark = nonzero. This emphasizes Mathologer-style zero-window structure.</p>")
    elif color_mode == "valuation":
        html.append(f"<p class='legend-note'>Color rule: brightness shows how many times {VALUATION_PRIME} divides the value. White squares are zero.</p>")
    elif color_mode == "mod" or color_mode == "mod10":
        modulus = 10 if color_mode == "mod10" else MODULUS
        html.append(f"<p class='legend-note'>Color rule: square color = value mod {modulus}. Hover over a square to see the full value.</p>")
        if color_mode == "mod":
            html.append(make_mod_legend())
    elif color_mode == "sign":
        html.append("<p class='legend-note'>Color rule: blue = positive, red = negative, white = zero.</p>")
    else:
        html.append("<p class='legend-note'>Color rule: neutral coloring only.</p>")

    html.append("<div class='wall-frame'>")
    html.append("<table class='wall'>")

    for row_number, values in rows:
        html.append("<tr>")
        html.append(f"<td class='row-label'>{row_number}</td>")

        for value in values:
            text = html_cell_text(value, row_number, mode)

            if value is None:
                bg = UNKNOWN_COLOR
                fg = UNKNOWN_TEXT_COLOR
                td_class = "cell unknown"
                title_attr = ""
            else:
                bg, fg = color_for_value(value, color_mode, row_number=row_number)
                td_class = "cell"
                title_text = str(value) if SHOW_TOOLTIPS else ""
                title_attr = f" title='{escape(title_text)}'" if title_text else ""

            html.append(
                f"<td class='{td_class}' style='background:{bg}; color:{fg};'{title_attr}>"
                f"<div class='cell-inner'>{escape(text)}</div>"
                f"</td>"
            )

        html.append("</tr>")

    html.append("</table>")
    html.append("</div>")
    html.append("</div>")
    html.append("</body>")
    html.append("</html>")

    with open(filename, "w", encoding="utf-8") as f:
        f.write("\n".join(html))


# ============================================================
# COMMAND LINE OPTIONS
# ============================================================

def parse_args():
    parser = argparse.ArgumentParser(description="Build a colored number wall.")

    parser.add_argument(
        "-s",
        "--sequence",
        help="Sequence text.",
    )

    parser.add_argument(
        "-f",
        "--file",
        help="Text file containing the sequence.",
    )

    parser.add_argument(
        "--kind",
        choices=["digits", "terms"],
        help="Use digits for digit strings, or terms for spaced/comma-separated number sequences.",
    )

    parser.add_argument(
        "-w",
        "--width",
        type=int,
        help="Visible wall width.",
    )

    parser.add_argument(
        "-d",
        "--depth",
        type=int,
        help="Visible wall depth below the sequence row.",
    )

    parser.add_argument(
        "--start",
        help='First visible sequence index. Use an integer or "auto".',
    )

    parser.add_argument(
        "--mode",
        choices=["values", "mathologer", "zeros", "mod10"],
        help="Display mode.",
    )

    parser.add_argument(
        "--color-mode",
        choices=[
            "signed_log",
            "row_signed_log",
            "small_values",
            "zero_windows",
            "valuation",
            "mod",
            "mod10",
            "sign",
            "none",
        ],
        help="Square coloring mode.",
    )

    parser.add_argument(
        "--modulus",
        type=int,
        help="Modulus used when --color-mode mod is selected.",
    )

    parser.add_argument(
        "--valuation-prime",
        type=int,
        help="Prime used when --color-mode valuation is selected.",
    )

    parser.add_argument(
        "--html",
        help="HTML output filename.",
    )

    parser.add_argument(
        "--no-html",
        action="store_true",
        help="Skip HTML output.",
    )

    return parser.parse_args()


# ============================================================
# MAIN
# ============================================================

def main():
    args = parse_args()

    global MODULUS
    global VALUATION_PRIME
    global SIGNED_LOG_MAX
    global ROW_SIGNED_LOG_MAX_BY_ROW
    global VALUATION_MAX

    if args.modulus is not None:
        MODULUS = args.modulus

    if args.valuation_prime is not None:
        VALUATION_PRIME = args.valuation_prime

    sequence_kind = args.kind if args.kind is not None else SEQUENCE_KIND

    if args.file:
        sequence = load_sequence_from_file(args.file, sequence_kind=sequence_kind)
    elif args.sequence:
        sequence = parse_sequence(args.sequence, sequence_kind=sequence_kind)
    else:
        sequence = parse_sequence(SEQUENCE_TEXT, sequence_kind=sequence_kind)

    visible_width = args.width if args.width is not None else VISIBLE_WIDTH
    visible_depth = args.depth if args.depth is not None else VISIBLE_DEPTH
    mode = args.mode if args.mode is not None else DISPLAY_MODE
    color_mode = args.color_mode if args.color_mode is not None else COLOR_MODE

    start_setting = args.start if args.start is not None else VISIBLE_START
    visible_start = resolve_visible_start(
        sequence_length=len(sequence),
        visible_start=start_setting,
        visible_width=visible_width,
    )

    html_filename = args.html if args.html is not None else HTML_FILENAME
    make_html_file = MAKE_HTML and not args.no_html

    print()
    print(f"Sequence length: {len(sequence)}")
    print(f"Sequence kind: {sequence_kind}")
    print(f"Visible columns: {visible_start} through {visible_start + visible_width - 1}")
    print(f"Visible depth: rows -1 through {visible_depth}")
    print(f"Display mode: {mode}")
    print(f"Color mode: {color_mode}")
    print(f"Modulus: {MODULUS}")
    print(f"Valuation prime: {VALUATION_PRIME}")
    print()

    rows = build_number_wall(
        sequence=sequence,
        visible_start=visible_start,
        visible_width=visible_width,
        visible_depth=visible_depth,
    )

    SIGNED_LOG_MAX = compute_signed_log_scale(rows)
    ROW_SIGNED_LOG_MAX_BY_ROW = compute_row_signed_log_scales(rows)
    VALUATION_MAX = compute_valuation_scale(rows, VALUATION_PRIME)

    print_wall(
        rows=rows,
        mode=mode,
        cell_width=CELL_WIDTH,
    )

    if make_html_file:
        make_html(
            rows=rows,
            mode=mode,
            color_mode=color_mode,
            filename=html_filename,
            sequence_length=len(sequence),
            visible_start=visible_start,
            visible_width=visible_width,
            visible_depth=visible_depth,
        )

        print()
        print(f"HTML file created: {html_filename}")
        print(f"Open it with: open {html_filename}")


if __name__ == "__main__":
    main()