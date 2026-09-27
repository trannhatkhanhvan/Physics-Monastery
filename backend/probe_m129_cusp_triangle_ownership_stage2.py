import inspect
import pprint

import snappy


M = snappy.Manifold("m129")


print()
print("M129 CUSP OWNERSHIP PROBE — STAGE 2")
print("===================================")

print()
print("Manifold:", M)
print("tetrahedra =", M.num_tetrahedra())
print("cusps      =", M.num_cusps())


def show_call(label, func):
    print()
    print(label)
    print("=" * len(label))

    try:
        print(
            "signature:",
            inspect.signature(func)
        )
    except Exception as exc:
        print(
            "signature unavailable:",
            repr(exc)
        )

    try:
        result = func()

        print()
        print("type:")
        print(type(result))

        print()
        print("repr:")
        pprint.pp(
            result,
            width=120,
            sort_dicts=False,
        )

        return result

    except Exception as exc:
        print()
        print("CALL FAILED:")
        print(repr(exc))

        return None


cusp_indices_data = show_call(
    "_get_cusp_indices_and_peripheral_curve_data",
    M._get_cusp_indices_and_peripheral_curve_data,
)


cross_section_data = show_call(
    "_cusp_cross_section_info",
    M._cusp_cross_section_info,
)


print()
print("DETAILED STRUCTURE WALK")
print("=======================")


def walk(value, path="root", depth=0):
    if depth > 6:
        return

    prefix = "  " * depth

    if isinstance(value, dict):
        print(
            f"{prefix}{path}: dict "
            f"({len(value)} keys)"
        )

        for key, child in value.items():
            walk(
                child,
                f"{path}[{key!r}]",
                depth + 1,
            )

        return

    if isinstance(value, (list, tuple)):
        print(
            f"{prefix}{path}: "
            f"{type(value).__name__} "
            f"(len={len(value)})"
        )

        for index, child in enumerate(value):
            walk(
                child,
                f"{path}[{index}]",
                depth + 1,
            )

        return

    print(
        f"{prefix}{path}: "
        f"{type(value).__name__} = "
        f"{value!r}"
    )


if cusp_indices_data is not None:
    print()
    print(
        "_get_cusp_indices_and_peripheral_curve_data"
    )
    walk(
        cusp_indices_data,
        "cusp_indices_data"
    )


if cross_section_data is not None:
    print()
    print(
        "_cusp_cross_section_info"
    )
    walk(
        cross_section_data,
        "cross_section_data"
    )


print()
print("DONE")
