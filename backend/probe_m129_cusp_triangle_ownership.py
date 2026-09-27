import inspect
import json

import snappy


M = snappy.Manifold("m129")
C = M.cusp_neighborhood()


print()
print("M129 CUSP TRIANGLE OWNERSHIP PROBE")
print("=================================")

print()
print("SnapPy version:")
print(snappy.__version__)

print()
print("Manifold:")
print(M)

print()
print("tetrahedra =", M.num_tetrahedra())
print("cusps      =", M.num_cusps())


# ------------------------------------------------------------
# 1. Raw CuspNeighborhood triangulation records
# ------------------------------------------------------------

for cusp_index in range(M.num_cusps()):
    print()
    print(
        f"CUSP {cusp_index} RAW TRIANGULATION"
    )
    print("-" * 48)

    triangulation = C.triangulation(
        cusp_index
    )

    for i, entry in enumerate(
        triangulation
    ):
        print()
        print("record", i)
        print(repr(entry))


# ------------------------------------------------------------
# 2. Try to expose Python-side implementation / doc metadata.
# ------------------------------------------------------------

print()
print("CuspNeighborhood.triangulation object:")
print(C.triangulation)

try:
    print()
    print(
        "inspect.signature =",
        inspect.signature(
            C.triangulation
        ),
    )
except Exception as exc:
    print(
        "signature unavailable:",
        repr(exc),
    )

try:
    source = inspect.getsource(
        type(C).triangulation
    )

    print()
    print(
        "Python source for triangulation:"
    )
    print(source)

except Exception as exc:
    print()
    print(
        "Python source unavailable:",
        repr(exc),
    )


# ------------------------------------------------------------
# 3. Combinatorial tetrahedron data from _get_tetrahedra_gluing_data
# ------------------------------------------------------------

print()
print("TETRAHEDRON GLUING DATA")
print("=======================")

try:
    gluing_data = (
        M._get_tetrahedra_gluing_data()
    )

    print(
        json.dumps(
            gluing_data,
            indent=2,
            default=str,
        )
    )

except Exception as exc:
    print(
        "_get_tetrahedra_gluing_data unavailable:",
        repr(exc),
    )


# ------------------------------------------------------------
# 4. Ideal-vertex -> cusp assignment from cusp_info / internal data
# ------------------------------------------------------------

print()
print("CUSP INFO")
print("=========")

try:
    print(
        M.cusp_info()
    )
except Exception as exc:
    print(
        "cusp_info failed:",
        repr(exc),
    )


# ------------------------------------------------------------
# 5. Explore potentially useful internal methods without calling
#    anything destructive.
# ------------------------------------------------------------

print()
print()
print("POTENTIALLY RELEVANT MANIFOLD ATTRIBUTES")
print("========================================")

for name in sorted(dir(M)):
    lower = name.lower()

    if (
        "tetra" in lower
        or
        "cusp" in lower
        or
        "gluing" in lower
        or
        "vertex" in lower
    ):
        print(name)


print()
print("POTENTIALLY RELEVANT CUSP ATTRIBUTES")
print("====================================")

for name in sorted(dir(C)):
    lower = name.lower()

    if (
        "triang" in lower
        or
        "cusp" in lower
        or
        "vertex" in lower
        or
        "index" in lower
    ):
        print(name)
