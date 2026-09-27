#!/usr/bin/env python3

import snappy
from spherogram import Link


link = Link("5^2_1")
M = link.exterior()

print("=" * 72)
print("m129 CUSP GEOMETRY API PROBE")
print("=" * 72)
print()

print("manifold:")
print(" ", M)
print()

print("isometry signature:")
print(" ", M.isometry_signature())
print()

print("cusps:")
print(" ", M.num_cusps())
print()

print("cusp shapes:")
for cusp_index in range(
    M.num_cusps()
):
    info = M.cusp_info(
        cusp_index
    )

    print(
        f"  cusp {cusp_index}:",
        info["shape"],
    )

print()

C = M.cusp_neighborhood()

print("cusp_neighborhood type:")
print(" ", type(C))
print()

print("public attributes / methods:")
for name in sorted(
    item
    for item in dir(C)
    if not item.startswith("_")
):
    print(" ", name)

print()

for method_name in [
    "triangulation",
    "Ford_domain",
    "horoballs",
    "translations",
    "volume",
    "get_displacement",
    "set_displacement",
]:
    method = getattr(
        C,
        method_name,
        None,
    )

    print("-" * 72)
    print(method_name)

    if method is None:
        print("  NOT AVAILABLE")
        continue

    print(
        "  object:",
        method,
    )

    if callable(method):
        try:
            result = method()

            print(
                "  result type:",
                type(result),
            )

            print(
                "  result:"
            )

            print(
                result
            )

        except Exception as error:
            print(
                "  call raised:",
                type(error).__name__,
                str(error),
            )

print()
print("PROBE COMPLETE")
