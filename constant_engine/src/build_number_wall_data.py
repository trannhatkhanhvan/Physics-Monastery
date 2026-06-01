import json
from pathlib import Path


# ============================================================
# SETTINGS
# ============================================================

VISIBLE_WIDTH = 100
VISIBLE_DEPTH = 50

PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = PROJECT_ROOT / "public" / "number-walls" / "data"


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
# NUMBER WALL
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


def build_number_wall(sequence, visible_width, visible_depth):
    rows = []

    for row_number in range(-1, visible_depth + 1):
        values = []

        for col in range(visible_width):
            value = wall_entry(sequence, row_number, col)

            if value is None:
                values.append(None)
            else:
                values.append(str(value))

        rows.append({
            "row": row_number,
            "values": values,
        })

    return rows


# ============================================================
# BASIC HELPERS
# ============================================================

def first_n_primes(count):
    primes = []
    n = 2

    while len(primes) < count:
        if is_prime(n):
            primes.append(n)

        n += 1

    return primes


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


# ============================================================
# FAMOUS SEQUENCES
# ============================================================

def fibonacci_terms(count):
    terms = [0, 1]

    while len(terms) < count:
        terms.append(terms[-1] + terms[-2])

    return terms[:count]


def lucas_terms(count):
    terms = [2, 1]

    while len(terms) < count:
        terms.append(terms[-1] + terms[-2])

    return terms[:count]


def square_terms(count):
    return [n * n for n in range(count)]


def cube_terms(count):
    return [n ** 3 for n in range(count)]


def triangular_terms(count):
    return [n * (n + 1) // 2 for n in range(count)]


def pentagonal_terms(count):
    return [n * (3 * n - 1) // 2 for n in range(count)]


def powers_of_two_terms(count):
    return [2 ** n for n in range(count)]


def powers_of_three_terms(count):
    return [3 ** n for n in range(count)]


def factorial_terms(count):
    terms = []
    value = 1

    for n in range(count):
        if n == 0:
            value = 1
        else:
            value *= n

        terms.append(value)

    return terms


def catalan_terms(count):
    terms = []

    for n in range(count):
        if n == 0:
            terms.append(1)
        else:
            previous = terms[-1]
            next_value = previous * 2 * (2 * n - 1) // (n + 1)
            terms.append(next_value)

    return terms


def bell_terms(count):
    triangle = [[1]]
    terms = [1]

    for n in range(1, count):
        row = [triangle[-1][-1]]

        for k in range(1, n + 1):
            row.append(row[k - 1] + triangle[-1][k - 1])

        triangle.append(row)
        terms.append(row[0])

    return terms


def partition_terms(count):
    partitions = [0] * count
    partitions[0] = 1

    for n in range(1, count):
        total = 0
        k = 1

        while True:
            pentagonal_1 = k * (3 * k - 1) // 2
            pentagonal_2 = k * (3 * k + 1) // 2

            if pentagonal_1 > n:
                break

            sign = 1 if k % 2 == 1 else -1

            total += sign * partitions[n - pentagonal_1]

            if pentagonal_2 <= n:
                total += sign * partitions[n - pentagonal_2]

            k += 1

        partitions[n] = total

    return partitions


def motzkin_terms(count):
    terms = [0] * count

    if count >= 1:
        terms[0] = 1

    if count >= 2:
        terms[1] = 1

    for n in range(1, count - 1):
        numerator = (2 * n + 3) * terms[n] + 3 * n * terms[n - 1]
        terms[n + 1] = numerator // (n + 3)

    return terms


def pell_terms(count):
    terms = [0, 1]

    while len(terms) < count:
        terms.append(2 * terms[-1] + terms[-2])

    return terms[:count]


def jacobsthal_terms(count):
    terms = [0, 1]

    while len(terms) < count:
        terms.append(terms[-1] + 2 * terms[-2])

    return terms[:count]


def padovan_terms(count):
    terms = [1, 1, 1]

    while len(terms) < count:
        terms.append(terms[-2] + terms[-3])

    return terms[:count]


def recaman_terms(count):
    terms = [0]
    seen = {0}

    for n in range(1, count):
        candidate = terms[-1] - n

        if candidate > 0 and candidate not in seen:
            terms.append(candidate)
        else:
            terms.append(terms[-1] + n)

        seen.add(terms[-1])

    return terms


def thue_morse_terms(count):
    terms = []

    for n in range(count):
        ones = bin(n).count("1")
        terms.append(ones % 2)

    return terms


def kolakoski_terms(count):
    if count <= 0:
        return []

    terms = [1, 2, 2]
    index = 2
    next_symbol = 1

    while len(terms) < count:
        run_length = terms[index]

        for _ in range(run_length):
            terms.append(next_symbol)

            if len(terms) >= count:
                break

        next_symbol = 1 if next_symbol == 2 else 2
        index += 1

    return terms[:count]

# ============================================================
# DIGIT STRING HELPERS
# ============================================================

def digit_string_terms(text, count=VISIBLE_WIDTH):
    digits = []

    for character in text:
        if character.isdigit():
            digits.append(int(character))

    if len(digits) < count:
        raise ValueError(
            f"Digit string only has {len(digits)} digits, but {count} are required."
        )

    return digits[:count]


# ============================================================
# SEQUENCE LIBRARY
# ============================================================

def make_sequence_library():
    return [
        {
            "id": "fibonacci",
            "title": "Fibonacci Numbers",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": fibonacci_terms(VISIBLE_WIDTH),
            "description": "The sequence 0, 1, 1, 2, 3, 5, ... generated by adding the previous two terms.",
        },
        {
            "id": "lucas",
            "title": "Lucas Numbers",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": lucas_terms(VISIBLE_WIDTH),
            "description": "The Lucas sequence 2, 1, 3, 4, 7, 11, ... obeys the same recurrence as Fibonacci.",
        },
        {
            "id": "triangular",
            "title": "Triangular Numbers",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": triangular_terms(VISIBLE_WIDTH),
            "description": "The sequence n(n+1)/2 for n = 0 through 99.",
        },
        {
            "id": "squares",
            "title": "Square Numbers",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": square_terms(VISIBLE_WIDTH),
            "description": "The sequence n² for n = 0 through 99.",
        },
        {
            "id": "pentagonal",
            "title": "Pentagonal Numbers",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": pentagonal_terms(VISIBLE_WIDTH),
            "description": "The sequence n(3n−1)/2 for n = 0 through 99.",
        },
        {
            "id": "cubes",
            "title": "Cube Numbers",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": cube_terms(VISIBLE_WIDTH),
            "description": "The sequence n³ for n = 0 through 99.",
        },
        {
            "id": "powers-of-two",
            "title": "Powers of 2",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": powers_of_two_terms(VISIBLE_WIDTH),
            "description": "The sequence 1, 2, 4, 8, 16, ... .",
        },
        {
            "id": "powers-of-three",
            "title": "Powers of 3",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": powers_of_three_terms(VISIBLE_WIDTH),
            "description": "The sequence 1, 3, 9, 27, 81, ... .",
        },
        {
            "id": "catalan",
            "title": "Catalan Numbers",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": catalan_terms(VISIBLE_WIDTH),
            "description": "The Catalan numbers 1, 1, 2, 5, 14, 42, ... .",
        },
        {
            "id": "partition",
            "title": "Partition Numbers",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": partition_terms(VISIBLE_WIDTH),
            "description": "The partition numbers p(n), counting integer partitions of n.",
        },
        {
            "id": "pell",
            "title": "Pell Numbers",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": pell_terms(VISIBLE_WIDTH),
            "description": "The Pell sequence 0, 1, 2, 5, 12, 29, ... obeys P(n)=2P(n−1)+P(n−2).",
        },
        {
            "id": "thue-morse",
            "title": "Thue–Morse Sequence",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": thue_morse_terms(VISIBLE_WIDTH),
            "description": "The parity of the number of 1s in the binary expansion of n.",
        },
        {
            "id": "kolakoski",
            "title": "Kolakoski Sequence",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": kolakoski_terms(VISIBLE_WIDTH),
            "description": "The self-describing sequence over 1s and 2s whose run lengths are the sequence itself.",
        },

        {
            "id": "gieseking-constant-digits",
            "title": "Gieseking's Constant",
            "symbol": "G_Gi",
            "symbolImage": "/equations/g_gi.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "1.01494160640965362502120255427452028594168930753029979201748910677659747625824402213647035422825669494586182753135988763"
            ),
            "description": "The first 100 digits of Gieseking's constant, used as the entry row of the number wall.",
        },
        {
            "id": "v-fe-digits",
            "title": "figure-eight knot complement volume",
            "symbol": "V_fe",
            "symbolImage": "/equations/v_fe.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "2.02988321281930725004240510854904057188337861506059958403497821355319495251648804427294070845651338989172365506271977525"
            ),
            "description": "The first 100 digits of V_fe, the figure-eight knot complement volume, used as the entry row of the number wall.",
        },
        {
            "id": "catalan-constant-digits",
            "title": "Catalan's constant",
            "symbol": "K",
            "symbolImage": "/equations/catalan_s_constant.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.915965594177219015054603514932384110774149374281672134266498119621763019776254769479356512926115106248574422619196199579"
            ),
            "description": "The first 100 digits of Catalan's constant, used as the entry row of the number wall.",
        },
        {
            "id": "domino-tiling-constant-digits",
            "title": "domino tiling constant",
            "symbol": "D_d",
            "symbolImage": "/equations/d_d.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "1.79162281206959342473054708934298243226813439313295476776758347649942507423765789601322663511617314591504553718687051105"
            ),
            "description": "The first 100 digits of the domino tiling constant e^(2K/pi), used as the entry row of the number wall.",
        },
        {
            "id": "omega-2-constant-digits",
            "title": "omega_2 constant",
            "symbol": "ω₂",
            "symbolImage": "/equations/omega_2_constant.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "1.52995403705719287491319417230882435857282894716092949606181168590952236179937427646883852056587534465250994548267024715"
            ),
            "description": "The first 100 digits of the real half-period ω₂ in the equianharmonic case.",
        },
        {
            "id": "golden-ratio-digits",
            "title": "golden ratio",
            "symbol": "φ",
            "symbolImage": "/equations/golden_ratio.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "1.61803398874989484820458683436563811772030917980576286213544862270526046281890244970720720418939113748475408807538689175"
            ),
            "description": "The first 100 digits of the golden ratio, used as the entry row of the number wall.",
        },
        {
            "id": "archimedes-constant-digits",
            "title": "Archimedes' constant",
            "symbol": "π",
            "symbolImage": "/equations/pi.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "3.14159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798214808651328230665"
            ),
            "description": "The first 100 digits of Archimedes' constant π, used as the entry row of the number wall.",
        },
        {
            "id": "universal-parabolic-constant-digits",
            "title": "universal parabolic constant",
            "symbol": "P_up",
            "symbolImage": "/equations/universal_parabolic_constant.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "2.29558714939263807403429804918949038759783220363858348392997534664410966268413312668409442623789761559175366242301878921"
            ),
            "description": "The first 100 digits of the universal parabolic constant, used as the entry row of the number wall.",
        },
        {
            "id": "arc-length-of-unit-lemniscate-digits",
            "title": "arc length of the unit lemniscate",
            "symbol": "s",
            "symbolImage": "/equations/s_symbol.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "5.24411510858423962092967917978223882736550990286324632563364340760158117414082850046059106592285818689227150534356643611"
            ),
            "description": "The first 100 digits of the arc length of the unit lemniscate, used as the entry row of the number wall.",
        },
        {
            "id": "e-digits",
            "title": "Euler's number",
            "symbol": "e",
            "symbolImage": "/equations/euler_s_number.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "2.718281828459045235360287471352662497757247093699959574966967627724076630353547594571382178525166427"
            ),
            "description": "The first 100 digits of Euler's number e, used as the entry row of the number wall.",
        },
        {
            "id": "phi_0-digits",
            "title": "Phi Zero",
            "symbol": "φ₀",
            "symbolImage": "/equations/phi_0.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "5.391258368323128751376726712741777763741560781183240592259291557416025825541021767785863695159442158"
            ),
            "description": "The first 100 digits of φ₀, used as the entry row of the number wall.",
        },
        {
            "id": "phi_1-digits",
            "title": "Phi One",
            "symbol": "φ₁",
            "symbolImage": "/equations/phi_1.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "1.616259181756453351361949961967038340446463839068909947224193829317698291892243197281521823753783779"
            ),
            "description": "The first 100 digits of φ₁, used as the entry row of the number wall.",
        },
    ]


# ============================================================
# WRITE JSON
# ============================================================

def write_wall_data(item):
    sequence = item["sequence"]

    rows = build_number_wall(
        sequence=sequence,
        visible_width=VISIBLE_WIDTH,
        visible_depth=VISIBLE_DEPTH,
    )

    data = {
        "id": item["id"],
        "title": item["title"],
        "symbol": item.get("symbol", ""),
        "symbolImage": item.get("symbolImage", ""),
        "category": item["category"],
        "kind": item["kind"],
        "description": item["description"],
        "visibleWidth": VISIBLE_WIDTH,
        "visibleDepth": VISIBLE_DEPTH,
        "sequence": [str(x) for x in sequence],
        "rows": rows,
    }

    output_path = OUTPUT_DIR / f"{item['id']}.json"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f)

    print(f"Wrote {output_path}")


def write_index(items):
    index = []

    for item in items:
        index.append({
            "id": item["id"],
            "title": item["title"],
            "symbol": item.get("symbol", ""),
            "symbolImage": item.get("symbolImage", ""),
            "category": item["category"],
            "kind": item["kind"],
            "description": item["description"],
            "filename": f"{item['id']}.json",
        })

    output_path = OUTPUT_DIR / "index.json"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)

    print(f"Wrote {output_path}")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    items = make_sequence_library()

    for item in items:
        write_wall_data(item)

    write_index(items)

    print()
    print(f"Done. Wrote {len(items)} number-wall data files.")


if __name__ == "__main__":
    main()