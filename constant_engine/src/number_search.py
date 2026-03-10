import math
from fractions import Fraction

# -------------------------
# TARGET NUMBER
# -------------------------

N = -283.17057
sigma = 0.00051

# -------------------------
# CONSTANTS
# -------------------------

constants = {

    "G_Gi": 1.01494160640965,
    "V_fe": 2.02988321281930,
    "K": 0.9159655941772190,
    "C_d": 0.291560904030818,
    "D_d": 1.79162281206959,

    "omega_2": 1.529954037057192,
    "Im_omega_1": 1.3249790627140867,

    "G_g": 1.15872847301812,
    "pi": 3.14159265358979,
    "P_up": 2.29558714939263,
    "s": 5.24411510858423,
    "L": 2.622057554292119,
    "L_1": 1.31102877714605,
    "L_2": 0.599070117367796,
    "C_U": 0.847213084793979,
    "G_Ga": 0.834626841674073,
    "W_We": 0.47494937998792,

    "C_CF": 0.697774657964819,
    "C_R1": 0.998136044598509,
    "F_FF": 1.22674201072035,
    "M": -1.74756459463318,

    "e": 2.71828182845904,
    "gamma": 0.577215664901532,
    "S": 0.822825249678847,
    "delta": 1.82282524967884,
    "j_01": 2.404825557695772,
    "C_CFP": 1.19967864025773,
    "D_Do": 0.739085133215160,
    "L_LL": 0.662743419349181,

    "alpha_F": 2.50290787509589,
    "delta_F": 4.66920160910299,
    "P": 1.32471795724474,
    "S_star": 3.24697960371714,
    "C_Q": 0.605443657196732,
    "C_QA": 2.03816937970215,
    "C_HSM": 0.353236371854995,

    "Re_ipt": 0.438282936727032,
    "Im_ipt": 0.360592471871385,

    "Im_rho_1": 14.1347251417346,
    "S_S": 1.78657645936592,
    "C_NR": 1.75793275661800,
    "K_minus6": 1.15655237442151,
    "L_Li": 0.110001,
    "D_DHA": 0.807945506599034,
    "x_infinity": 2.29316628741186
}

# -------------------------
# SETTINGS
# -------------------------

MAX_DENOMINATOR = 50
SIGMA_LIMIT = 5

# -------------------------
# STORAGE
# -------------------------

generated_numbers = []
matches = []

# -------------------------
# MAIN SEARCH
# -------------------------

for name, c in constants.items():

    if c == 0:
        continue

    # Case 1: N = x * c
    x = N / c
    sigma_x = sigma / abs(c)

    generated_numbers.append((f"N / {name}", x))

    # integer test
    n = round(x)
    z = abs(x - n) / sigma_x

    if z <= SIGMA_LIMIT:
        matches.append((f"{n} * {name}", n * c, z))

    # rational test
    frac = Fraction(x).limit_denominator(MAX_DENOMINATOR)
    r = frac.numerator / frac.denominator
    z = abs(x - r) / sigma_x

    if z <= SIGMA_LIMIT:
        matches.append((f"({frac.numerator}/{frac.denominator}) * {name}", r * c, z))

    # Case 2: N = x / c  → x = N * c
    x2 = N * c
    sigma_x2 = sigma * abs(c)

    generated_numbers.append((f"N * {name}", x2))

    if sigma_x2 != 0:

        n = round(x2)
        z = abs(x2 - n) / sigma_x2

        if z <= SIGMA_LIMIT:
            matches.append((f"{n} / {name}", n / c, z))

        frac = Fraction(x2).limit_denominator(MAX_DENOMINATOR)
        r = frac.numerator / frac.denominator
        z = abs(x2 - r) / sigma_x2

        if z <= SIGMA_LIMIT:
            matches.append((f"({frac.numerator}/{frac.denominator}) / {name}", r / c, z))

# -------------------------
# OUTPUT GENERATED NUMBERS
# -------------------------

print("\nGenerated numbers:\n")

for label, val in generated_numbers:
    print(f"{label:20s} -> {val}")

# -------------------------
# OUTPUT MATCHES
# -------------------------

print("\nPossible matches:\n")

matches.sort(key=lambda x: x[2])

for expr, val, z in matches:
    print(expr, "≈", val, "   z =", z)