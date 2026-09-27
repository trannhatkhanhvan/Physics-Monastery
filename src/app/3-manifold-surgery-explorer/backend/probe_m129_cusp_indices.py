#!/usr/bin/env python3

import snappy
from spherogram import Link


M = Link("5^2_1").exterior()
C = M.cusp_neighborhood()


def try_call(label, function, *args):
    print("-" * 72)
    print(label)

    try:
        result = function(*args)

        print(
            "type:",
            type(result),
        )

        print(
            "result:",
            result,
        )

    except Exception as error:
        print(
            "raised:",
            type(error).__name__,
            str(error),
        )


print("=" * 72)
print("m129 CUSP INDEX API PROBE")
print("=" * 72)
print()


try_call(
    "num_cusps()",
    C.num_cusps,
)

try_call(
    "all_translations()",
    C.all_translations,
)


for cusp_index in [0, 1]:
    print()
    print("=" * 72)
    print(
        f"CUSP {cusp_index}"
    )
    print("=" * 72)

    try_call(
        f"translations({cusp_index})",
        C.translations,
        cusp_index,
    )

    try_call(
        f"triangulation({cusp_index})",
        C.triangulation,
        cusp_index,
    )

    try_call(
        f"topology({cusp_index})",
        C.topology,
        cusp_index,
    )

    try_call(
        f"original_index({cusp_index})",
        C.original_index,
        cusp_index,
    )

    try_call(
        f"get_displacement({cusp_index})",
        C.get_displacement,
        cusp_index,
    )

    try_call(
        f"reach({cusp_index})",
        C.reach,
        cusp_index,
    )

    try_call(
        f"max_reach({cusp_index})",
        C.max_reach,
        cusp_index,
    )


print()
print("INDEX PROBE COMPLETE")
