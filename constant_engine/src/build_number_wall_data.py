import json
from pathlib import Path
import math

from nature_constants_manifest import NATURE_CONSTANTS

# ============================================================
# SETTINGS
# ============================================================

VISIBLE_WIDTH = 100
VISIBLE_DEPTH = 49

PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = PROJECT_ROOT / "public" / "number-walls" / "data"

TEST_ONLY_CONSTANTS_OF_NATURE = False

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

def central_binomial_terms(count):
    terms = []
    value = 1

    for n in range(count):
        if n == 0:
            value = 1
        else:
            value = value * (4 * n - 2) // n

        terms.append(value)

    return terms


def somos4_terms(count):
    terms = [1, 1, 1, 1]

    while len(terms) < count:
        n = len(terms)
        next_value = (
            terms[n - 1] * terms[n - 3] +
            terms[n - 2] * terms[n - 2]
        ) // terms[n - 4]

        terms.append(next_value)

    return terms[:count]


def apery_terms(count):
    terms = []

    for n in range(count):
        total = 0

        for k in range(n + 1):
            total += math.comb(n, k) ** 2 * math.comb(n + k, k) ** 2

        terms.append(total)

    return terms

def digits_from_decimal_string(value, width):
    digits = "".join(ch for ch in str(value) if ch.isdigit())

    if len(digits) < width:
        raise ValueError(f"Need at least {width} digits, found {len(digits)}.")

    return [int(ch) for ch in digits[:width]]


def significant_digit_terms_from_model_value(value, width=VISIBLE_WIDTH):
    text = str(value).strip()

    if text.startswith("(") and text.endswith(")"):
        text = text[1:-1].strip()

    if "j" in text.lower():
        raise ValueError(f"Complex value cannot be converted into a digit wall: {value}")

    mantissa = text.split("e")[0].split("E")[0]
    digits = "".join(ch for ch in mantissa if ch.isdigit()).lstrip("0")

    if digits == "":
        digits = "0"

    if len(digits) < width:
        raise ValueError(f"Need at least {width} significant digits, found {len(digits)} in {value!r}.")

    return [int(ch) for ch in digits[:width]]


def make_nature_constant_items():
    if len(NATURE_CONSTANTS) != 288:
        raise ValueError(f"Expected 288 Constants of Nature, found {len(NATURE_CONSTANTS)}.")

    items = []
    seen_ids = set()

    for constant in NATURE_CONSTANTS:
        item_id = constant["id"]

        if item_id in seen_ids:
            raise ValueError(f"Duplicate nature constant id: {item_id}")

        seen_ids.add(item_id)

        value = constant["value"]

        items.append({
            "id": item_id,
            "title": constant["title"],
            "symbol": constant.get("symbol", ""),
            "symbolImage": constant.get("symbolImage", ""),
            "symbolParts": constant.get("symbolParts", []),
            "category": "constants-of-nature",
            "kind": "digits",
            "sequence": significant_digit_terms_from_model_value(value, VISIBLE_WIDTH),
            "modelValue": value,
            "dimension": constant.get("dimension", ""),
            "description": constant.get(
                "description",
                f"The first 100 significant digits of the model value for {constant['title']}, read as a digit sequence.",
            ),
        })

    return items


# ============================================================
# SEQUENCE LIBRARY
# ============================================================

def make_sequence_library():
    if TEST_ONLY_CONSTANTS_OF_NATURE:
        return make_nature_constant_items()

    return [
        {
            "id": "catalan",
            "title": "Catalan Numbers",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": catalan_terms(VISIBLE_WIDTH),
            "description": "The Catalan numbers 1, 1, 2, 5, 14, 42, ... .",
        },

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
            "id": "thue-morse",
            "title": "Thue–Morse Sequence",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": thue_morse_terms(VISIBLE_WIDTH),
            "description": "The parity of the number of 1s in the binary expansion of n.",
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
            "id": "partition",
            "title": "Partition Numbers",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": partition_terms(VISIBLE_WIDTH),
            "description": "The partition numbers p(n), counting integer partitions of n.",
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
            "id": "motzkin",
            "title": "Motzkin Numbers",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": motzkin_terms(VISIBLE_WIDTH),
            "description": "The Motzkin numbers 1, 1, 2, 4, 9, 21, ... count certain lattice paths that never dip below the axis.",
        },

        {
            "id": "central-binomial",
            "title": "Central Binomials",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": central_binomial_terms(VISIBLE_WIDTH),
            "description": "The central binomial coefficients 1, 2, 6, 20, 70, 252, ... are the middle entries of even rows of Pascal’s triangle.",
        },

        {
            "id": "apery",
            "title": "Apéry Numbers",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": apery_terms(VISIBLE_WIDTH),
            "description": "The Apéry numbers 1, 5, 73, 1445, 33001, ... appear in Apéry’s proof that zeta(3) is irrational.",
        },

        {
            "id": "bell",
            "title": "Bell Numbers",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": bell_terms(VISIBLE_WIDTH),
            "description": "The Bell numbers 1, 1, 2, 5, 15, 52, ... count the ways a set can be partitioned into nonempty subsets.",
        },

        {
            "id": "padovan",
            "title": "Padovan Numbers",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": padovan_terms(VISIBLE_WIDTH),
            "description": "The Padovan sequence 1, 1, 1, 2, 2, 3, 4, 5, ... obeys P(n) = P(n - 2) + P(n - 3).",
        },
        {
            "id": "recaman",
            "title": "Recamán’s Sequence",
            "category": "famous-sequences",
            "kind": "terms",
            "sequence": recaman_terms(VISIBLE_WIDTH),
            "description": "Recamán’s sequence 0, 1, 3, 6, 2, 7, 13, ... jumps backward when possible and forward otherwise.",
        },


        {
            "id": "phi_0-digits",
            "title": "Planck time scalar",
            "symbol": "φ₀",
            "symbolImage": "/equations/scalar_0.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "5.391258368323128751376726712741777763741560781183240592259291557416025825541021767785863695159442158"
            ),
            "description": "The first 100 digits of φ₀, used as the entry row of the number wall.",
        },
        {
            "id": "phi_1-digits",
            "title": "Planck length scalar",
            "symbol": "φ₁",
            "symbolImage": "/equations/scalar_1.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "1.616259181756453351361949961967038340446463839068909947224193829317698291892243197281521823753783779"
            ),
            "description": "The first 100 digits of φ₁, used as the entry row of the number wall.",
        },
        {
            "id": "phi_2-digits",
            "title": "Planck charge scalar",
            "symbol": "φ₂",
            "symbolImage": "/equations/scalar_2.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "1.875545967139625164534584749409225438804499398906558827181569548048856687653735727703492973645021495"
            ),
            "description": "The first 100 digits of φ₂, used as the entry row of the number wall.",
        },
        {
            "id": "phi_3-digits",
            "title": "Planck mass scalar",
            "symbol": "φ₃",
            "symbolImage": "/equations/scalar_3.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "1.416786985907946329602614804013265347373498179270631737624762609179972104589465090640766275120985171"
            ),
            "description": "The first 100 digits of φ₃, used as the entry row of the number wall.",
        },
        {
            "id": "phi_4-digits",
            "title": "Planck temperature scalar",
            "symbol": "φ₄",
            "symbolImage": "/equations/scalar_4.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "2.176426838175788124518498932075792423542503799529596336953687554097673900479158322985926834558645008"
            ),
            "description": "The first 100 digits of φ₄, used as the entry row of the number wall.",
        },

        {
            "id": "hyperbolic-inversion-boundary-digits",
            "title": "hyperbolic inversion boundary",
            "symbol": "□",
            "symbolImage": "/equations/box_symbol.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.0000000999999199973622386390183027677308422095020948090396230807698401058266014875257392697875471163266462369339506087"
            ),
            "description": "The first 100 digits of the hyperbolic inversion boundary, used as the entry row of the number wall.",
        },

        {
            "id": "zhe_1-digits",
            "title": "first hyperbolic partition constant",
            "symbol": "ж₁",
            "symbolImage": "/equations/zhe_1.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.0854245431533304728292565033938076802100223787556762555314702980132300640000074937893858619407304638404927604079248031834"
            ),
            "description": "The first 100 digits of ж₁, used as the entry row of the number wall.",
        },
        {
            "id": "zhe_2-digits",
            "title": "second hyperbolic partition constant",
            "symbol": "ж₂",
            "symbolImage": "/equations/zhe_2.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "3.66756753485501030944332049253754125783432508982649583799530414186417751962020196054403704136716497029283883245036967615"
            ),
            "description": "The first 100 digits of ж₂, used as the entry row of the number wall.",
        },
        {
            "id": "zhe_r-digits",
            "title": "hyperbolic radius constant",
            "symbol": "жᵣ",
            "symbolImage": "/equations/zhe_r.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "4.47826244916753116475140117442141757864584227108242521233276364757120836048893729806341023127464028092713011681590152608"
            ),
            "description": "The first 100 digits of жᵣ, used as the entry row of the number wall.",
        },
        {
            "id": "zhe_theta-digits",
            "title": "hyperbolic radian constant",
            "symbol": "жθ",
            "symbolImage": "/equations/zhe_theta.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "2.00316562310924368498640089304075630828815936132964522641785987191913097331197640297844331412575146614768547712302831647"
            ),
            "description": "The first 100 digits of жθ, used as the entry row of the number wall.",
        },

        {
            "id": "gieseking-constant-digits",
            "title": "Gieseking's constant",
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
            "symbol": "C_d",
            "symbolImage": "/equations/domino_tiling_constant.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.29156090403081878013838445646839491886406615398583727026100156911174763688043886172662682430313405890897280278"
            ),
            "description": "The first 100 digits of C_d = K/pi, used as the entry row of the number wall.",
        },
        {
            "id": "dimer-constant-digits",
            "title": "dimer constant",
            "symbol": "D_d",
            "symbolImage": "/equations/d_d.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "1.7916228120695934247305470893429824322681343931329547677675834764994250742376578960132266351161731459150455372"
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
                "1.5299540370571928749131941723088243585728289471609294960618116859095223617993742764688385205658753446525099455"
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
                "1.6180339887498948482045868343656381177203091798057628621354486227052604628189024497072072041893911374847540881"
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
                "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865"
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
                "2.2955871493926380740342980491894903875978322036385834839299753466441096626841331266840944262378976155917536624"
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
                "5.2441151085842396209296791797822388273655099028632463256336434076015811741408285004605910659228581868922715053"
            ),
            "description": "The first 100 digits of the arc length of the unit lemniscate, used as the entry row of the number wall.",
        },
        {
            "id": "lemniscate-constant-digits",
            "title": "lemniscate constant",
            "symbol": "L",
            "symbolImage": "/equations/l_constant.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "2.6220575542921198104648395898911194136827549514316231628168217038007905870704142502302955329614290934461357527"
            ),
            "description": "The first 100 digits of the lemniscate constant, used as the entry row of the number wall.",
        },
        {
            "id": "first-lemniscate-constant-digits",
            "title": "first lemniscate constant",
            "symbol": "L_1",
            "symbolImage": "/equations/l_1_constant.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "1.3110287771460599052324197949455597068413774757158115814084108519003952935352071251151477664807145467230678763"
            ),
            "description": "The first 100 digits of the first lemniscate constant, used as the entry row of the number wall.",
        },
        {
            "id": "second-lemniscate-constant-digits",
            "title": "second lemniscate constant",
            "symbol": "L_2",
            "symbolImage": "/equations/l_2.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.59907011736779610371996124614016193911360633160782577913183747647320260707195783541794277824489669468795361255"
            ),
            "description": "The first 100 digits of the second lemniscate constant, used as the entry row of the number wall.",
        },
        {
            "id": "ubiquitous-constant-digits",
            "title": "ubiquitous constant",
            "symbol": "C_U",
            "symbolImage": "/equations/c_u.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.84721308479397908660649912348219163648144591032694218506057937265973400483413475972320029399461122994212228563"
            ),
            "description": "The first 100 digits of the ubiquitous constant, used as the entry row of the number wall.",
        },
        {
            "id": "gauss-constant-digits",
            "title": "Gauss's constant",
            "symbol": "G_Ga",
            "symbolImage": "/equations/g_ga.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.83462684167407318628142973279904680899399301349034700244982737010368199270952641186969116035127532412906785035"
            ),
            "description": "The first 100 digits of Gauss's constant, used as the entry row of the number wall.",
        },
        {
            "id": "weierstrass-constant-digits",
            "title": "Weierstrass constant",
            "symbol": "W_We",
            "symbolImage": "/equations/w_we.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.47494937998792065033250463632798296855954937321720298228333102486455792917488386027427564125050214441890378494"
            ),
            "description": "The first 100 digits of the Weierstrass constant, used as the entry row of the number wall.",
        },

        {
            "id": "continued-fraction-constant-digits",
            "title": "continued fraction constant",
            "symbol": "C_CF",
            "symbolImage": "/equations/continued_fraction_constant.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.697774657964007982006790592551752599486658262998021232368630082816530852764641112996965654182676568724"
            ),
            "description": "The first 100 digits of C_CF = I_1(2)/I_0(2), used as the entry row of the number wall.",
        },

        {
            "id": "ramanujan-first-continued-fraction-constant-digits",
            "title": "Ramanujan's first continued fraction constant",
            "symbol": "C_R1",
            "symbolImage": "/equations/c_r1.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.998136044598509332150024459047074735311382994763043982185583874070350324689464413357717727086750582618"
            ),
            "description": "The first 100 digits of C_R1, Ramanujan's first continued fraction constant, used as the entry row of the number wall.",
        },

        {
            "id": "liouville-constant-digits",
            "title": "Liouville's constant",
            "symbol": "L_Li",
            "symbolImage": "/equations/liouville_s_constant.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.11000100000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
            ),
            "description": "The first 100 digits of Liouville's constant, used as the entry row of the number wall.",
        },

        {
            "id": "madelung-constant-digits",
            "title": "Madelung constant",
            "symbol": "M",
            "symbolImage": "/equations/madelung_constant.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "-1.747564594633182190636212035544397403485161436624741758152825350761546587815932963156942126387440772"
            ),
            "description": "The first 100 digits of the Madelung constant for the NaCl lattice, used as the entry row of the number wall.",
        },
        {
            "id": "prime-constant-digits",
            "title": "prime constant",
            "symbol": "P*",
            "symbolImage": "/equations/prime_constant.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.4146825098511116602481096221543077083657742381379169778682454144886409606193573341962900484284757779"
            ),
            "description": "The first 100 digits of the prime constant, used as the entry row of the number wall.",
        },

        {
            "id": "e-digits",
            "title": "Euler's number",
            "symbol": "e",
            "symbolImage": "/equations/euler_s_number.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "2.7182818284590452353602874713526624977572470936999595749669676277240766303535475945713821785251664274274663919"
            ),
            "description": "The first 100 digits of Euler's number e, used as the entry row of the number wall.",
        },

        {
            "id": "euler-mascheroni-constant-digits",
            "title": "Euler-Mascheroni constant",
            "symbol": "γ",
            "symbolImage": "/equations/euler-mascheroni_constant.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.57721566490153286060651209008240243104215933593992359880576723488486772677766467093694706329174674951463144725"
            ),
            "description": "The first 100 digits of the Euler-Mascheroni constant, used as the entry row of the number wall.",
        },

        {
            "id": "sierpinski-constant-digits",
            "title": "Sierpiński's constant",
            "symbol": "S",
            "symbolImage": "/equations/sierpinski_constant.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.822825249678847032995328716261464949475693118894850218393815613037090956446401667572195325732344532472"
            ),
            "description": "The first 100 digits of Sierpiński's constant, used as the entry row of the number wall.",
        },

        {
            "id": "dottie-number-digits",
            "title": "Dottie number",
            "symbol": "D_Do",
            "symbolImage": "/equations/d_do.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.73908513321516064165531208767387340401341175890075746496568063577328465488354759459937610693176653184980124664"
            ),
            "description": "The first 100 digits of the Dottie number, used as the entry row of the number wall.",
        },

        {
            "id": "laplace-limit-digits",
            "title": "Laplace limit",
            "symbol": "L_LL",
            "symbolImage": "/equations/l_ll.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.662743419349181580974742097109252907056233549115022417520392534990971853086511277249654802598958181689"
            ),
            "description": "The first 100 digits of the Laplace limit, used as the entry row of the number wall.",
        },

        {
            "id": "hyperbolic-cotangent-fixed-point-digits",
            "title": "real fixed point of the hyperbolic cotangent",
            "symbol": "C_CFP",
            "symbolImage": "/equations/c_cfp.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "1.1996786402577338339163698486411419442614587884186072089154777839181247252238474799990869921465093798859055084"
            ),
            "description": "The first 100 digits of the real fixed point of the hyperbolic cotangent, used as the entry row of the number wall.",
        },
        {
            "id": "bessel-root-j01-digits",
            "title": "first root of the Bessel function",
            "symbol": "j_0,1",
            "symbolImage": "/equations/j_0-1.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "2.4048255576957727686216318793264546431242449091459671357069990905967658386771940292044363437601452547868924504"
            ),
            "description": "The first 100 digits of the first root of the Bessel function J_0, used as the entry row of the number wall.",
        },

        {
            "id": "feigenbaum-alpha-digits",
            "title": "Feigenbaum alpha constant",
            "symbol": "α_F",
            "symbolImage": "/equations/alpha_f.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "2.502907875095892822283902873218215786381271376727149977336192056779235463179590206703299649746433834130"
            ),
            "description": "The first 100 digits of the Feigenbaum alpha constant, used as the entry row of the number wall.",
        },
        {
            "id": "feigenbaum-delta-digits",
            "title": "Feigenbaum delta constant",
            "symbol": "δ_F",
            "symbolImage": "/equations/del_f.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "4.669201609102990671853203820466201617258185577475768632745651343004134330211314737138689744023948013817"
            ),
            "description": "The first 100 digits of the Feigenbaum delta constant, used as the entry row of the number wall.",
        },
        {
            "id": "silver-constant-digits",
            "title": "silver constant",
            "symbol": "S",
            "symbolImage": "/equations/silver_constant.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "3.246979603717467061050009768008479621264549461792804210731098878193707304912974569151885014653170743334"
            ),
            "description": "The first 100 digits of the silver constant, used as the entry row of the number wall.",
        },

        {
            "id": "plastic-constant-digits",
            "title": "plastic constant",
            "symbol": "P",
            "symbolImage": "/equations/plastic_constant.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "1.324717957244746025960908854478097340734404056901733364534015050302827851245547594054699347981787280329910921"
            ),
            "description": "The first 100 digits of the plastic constant, used as the entry row of the number wall.",
        },

        {
            "id": "qrs-constant-digits",
            "title": "QRS constant",
            "symbol": "C_Q",
            "symbolImage": "/equations/c_q.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "0.6054436571967327494789228424472074752208994969563226178775528774518289983516763567570472921383427042"
            ),
            "description": "The first 100 digits of the QRS constant, used as the entry row of the number wall.",
        },

        {
            "id": "foias-constant-digits",
            "title": "first Foias constant",
            "symbol": "x∞",
            "symbolImage": "/equations/1st_foias_constant.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "2.293166287411861031508028291250805864372257290327121248537710396168506488009157743629042013804828256612"
            ),
            "description": "The first 100 digits of the first Foias constant, used as the entry row of the number wall.",
        },

        {
            "id": "khinchin-mean-minus-six-digits",
            "title": "Khinchin mean of order -6",
            "symbol": "K_-6",
            "symbolImage": "/equations/khinchin_mean_of_order_-6.svg",
            "category": "constants",
            "kind": "digits",
            "sequence": digit_string_terms(
                "1.156552374421514413230622980433092762712341270717871696255697553629484016762519000000000000000000000000"
            ),
            "description": "The first available digits of the Khinchin mean of order -6, padded to 100 digits for the number-wall builder.",
        },


    ] + make_nature_constant_items()


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
        "symbolParts": item.get("symbolParts", []),
        "category": item["category"],
        "kind": item["kind"],
        "description": item["description"],
        "modelValue": item.get("modelValue", ""),
        "dimension": item.get("dimension", ""),
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
            "symbolParts": item.get("symbolParts", []),
            "category": item["category"],
            "kind": item["kind"],
            "description": item["description"],
            "modelValue": item.get("modelValue", ""),
            "dimension": item.get("dimension", ""),
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