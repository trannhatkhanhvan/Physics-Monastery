#!/usr/bin/env python3

import inspect
import math

import snappy

from dehn_cusp_development_probe import (
    FILLED_CUSP,
    VIEWER_SLOPE,
    build_link_derived_m129,
    viewer_slope_to_link_basis,
)


def heading(text):
    print()
    print("=" * 72)
    print(text)
    print("=" * 72)


def matrix_entries(matrix):
    try:
        return (
            int(matrix[0, 0]),
            int(matrix[0, 1]),
            int(matrix[1, 0]),
            int(matrix[1, 1]),
        )
    except Exception:
        pass

    try:
        return (
            int(matrix[0][0]),
            int(matrix[0][1]),
            int(matrix[1][0]),
            int(matrix[1][1]),
        )
    except Exception:
        return None


def identity_cusp_map(isometry):
    maps = isometry.cusp_maps()

    if len(maps) != 1:
        return False

    return (
        matrix_entries(
            maps[0]
        ) ==
        (1, 0, 0, 1)
    )


def safe_getattr(
    object_,
    name,
):
    try:
        return getattr(
            object_,
            name
        )
    except Exception as error:
        return (
            "<ERROR "
            f"{type(error).__name__}: "
            f"{error}>"
        )


def show_candidate_attribute(
    isometry,
    name,
):
    value = safe_getattr(
        isometry,
        name
    )

    if isinstance(
        value,
        str,
    ) and value.startswith(
        "<ERROR "
    ):
        return

    print()
    print(
        f"{name}:"
    )

    if callable(value):
        try:
            signature = inspect.signature(
                value
            )
        except Exception:
            signature = "(unknown signature)"

        print(
            "  callable",
            signature,
        )

        try:
            result = value()
        except TypeError:
            return
        except Exception as error:
            print(
                "  call failed:",
                type(error).__name__,
                error,
            )
            return

        print(
            "  result:",
            result,
        )

    else:
        print(
            " ",
            value,
        )


def main():
    heading(
        "m129 -> m004 IDENTITY-CUSP "
        "ISOMETRY PROBE"
    )

    source = (
        build_link_derived_m129()
    )

    link_slope = (
        viewer_slope_to_link_basis(
            VIEWER_SLOPE
        )
    )

    source.dehn_fill(
        link_slope,
        FILLED_CUSP,
    )

    endpoint = source.copy()

    endpoint.set_target_holonomy(
        2j * math.pi,
        FILLED_CUSP,
    )

    filled = (
        endpoint.filled_triangulation(
            [FILLED_CUSP]
        )
    )

    target = snappy.Manifold(
        "m004"
    )

    isometries = (
        filled.isomorphisms_to(
            target
        )
    )

    identity_isometries = [
        isometry
        for isometry in isometries
        if identity_cusp_map(
            isometry
        )
    ]


    heading(
        "IDENTITY CUSP-MAP CANDIDATES"
    )

    print(
        "total combinatorial isomorphisms:",
        len(isometries),
    )

    print(
        "identity cusp-map isomorphisms:",
        len(identity_isometries),
    )

    for index, isometry in enumerate(
        identity_isometries
    ):
        print()
        print(
            f"candidate {index}"
        )
        print("-" * 40)
        print(isometry)

        print(
            "cusp map:",
            isometry.cusp_maps()[0],
        )


    heading(
        "FULL OBJECT INTROSPECTION"
    )

    if not identity_isometries:
        raise SystemExit(
            "No identity-cusp-map "
            "isometries found."
        )

    for index, isometry in enumerate(
        identity_isometries
    ):
        print()
        print(
            "#" * 72
        )
        print(
            f"CANDIDATE {index}"
        )
        print(
            "#" * 72
        )

        print()
        print(
            "type:",
            type(isometry),
        )

        print(
            "repr:",
            repr(isometry),
        )

        try:
            print(
                "__dict__:",
                vars(isometry),
            )
        except Exception as error:
            print(
                "__dict__: unavailable:",
                type(error).__name__,
                error,
            )

        names = sorted(
            dir(isometry)
        )

        interesting = [
            name
            for name in names
            if any(
                token in
                name.lower()
                for token in (
                    "tet",
                    "simp",
                    "vert",
                    "perm",
                    "image",
                    "map",
                    "iso",
                    "glue",
                )
            )
        ]

        print()
        print(
            "interesting attributes:"
        )

        for name in interesting:
            print(
                " ",
                name,
            )

        for name in interesting:
            show_candidate_attribute(
                isometry,
                name,
            )


    heading(
        "TRIANGULATION GLUING DATA"
    )

    for label, manifold in (
        (
            "filled endpoint",
            filled,
        ),
        (
            "native m004",
            target,
        ),
    ):
        print()
        print(label)
        print("-" * 40)

        for name in (
            "_get_tetrahedra_gluing_data",
            "_get_tetrahedra_shapes",
            "tetrahedra_shapes",
        ):
            value = safe_getattr(
                manifold,
                name
            )

            if isinstance(
                value,
                str,
            ) and value.startswith(
                "<ERROR "
            ):
                continue

            if not callable(value):
                continue

            try:
                if (
                    name ==
                    "tetrahedra_shapes"
                ):
                    result = value(
                        "rect"
                    )
                else:
                    result = value()
            except Exception as error:
                print(
                    name,
                    "FAILED:",
                    type(error).__name__,
                    error,
                )
                continue

            print(
                name,
                ":"
            )

            print(result)


    heading(
        "DECORATED ISOSIG CHECK"
    )

    print(
        "filled:",
        filled.triangulation_isosig(
            decorated=True
        ),
    )

    print(
        "target:",
        target.triangulation_isosig(
            decorated=True
        ),
    )

    print()
    print(
        "If the two identity-cusp candidates "
        "expose different tetrahedron or vertex "
        "permutations above, that gives us the "
        "A/B labeling choice we need."
    )

    print(
        "If SnapPy hides that data in this "
        "object, the next step will recover the "
        "same correspondence directly from the "
        "two labeled gluing tables."
    )


if __name__ == "__main__":
    main()
