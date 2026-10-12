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


def safe_isosig(manifold, **kwargs):
    try:
        return manifold.triangulation_isosig(
            **kwargs
        )
    except Exception as error:
        return (
            "<FAILED: "
            f"{type(error).__name__}: "
            f"{error}>"
        )


def public_isometry_interface(isometry):
    result = []

    for name in sorted(dir(isometry)):
        if name.startswith("_"):
            continue

        try:
            value = getattr(
                isometry,
                name
            )
        except Exception:
            continue

        if callable(value):
            try:
                signature = str(
                    inspect.signature(
                        value
                    )
                )
            except Exception:
                signature = "(...)"

            result.append(
                f"{name}{signature}"
            )

    return result


def try_isometry_metadata(isometry):
    for name in (
        "cusp_images",
        "cusp_maps",
        "extends_to_link",
    ):
        method = getattr(
            isometry,
            name,
            None
        )

        if not callable(method):
            continue

        try:
            value = method()
        except Exception as error:
            value = (
                "<FAILED: "
                f"{type(error).__name__}: "
                f"{error}>"
            )

        print(
            f"{name}: {value}"
        )


def describe_triangulation(
    label,
    triangulation,
):
    print(label)

    print(
        "  tetrahedra:",
        triangulation.num_tetrahedra(),
    )

    print(
        "  cusps:",
        triangulation.num_cusps(),
    )

    print(
        "  undecorated isosig:",
        safe_isosig(
            triangulation,
            decorated=False,
        ),
    )

    print(
        "  decorated isosig:",
        safe_isosig(
            triangulation,
            decorated=True,
        ),
    )


def main():
    heading(
        "m129 -> m004 ENDPOINT "
        "RETRIANGULATION PROBE"
    )

    source = (
        build_link_derived_m129()
    )

    link_slope = (
        viewer_slope_to_link_basis(
            VIEWER_SLOPE
        )
    )

    print(
        "viewer slope:",
        VIEWER_SLOPE,
    )

    print(
        "SnapPy/link slope:",
        link_slope,
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

    heading(
        "TRIANGULATION COUNTS"
    )

    describe_triangulation(
        "Persistent endpoint before "
        "permanent filling:",
        endpoint,
    )

    print()

    describe_triangulation(
        "filled_triangulation endpoint:",
        filled,
    )

    print()

    describe_triangulation(
        "native census m004:",
        target,
    )


    heading(
        "DIRECT COMBINATORIAL "
        "ISOMORPHISMS"
    )

    direct_isomorphisms = (
        filled.isomorphisms_to(
            target
        )
    )

    print(
        "filled -> native m004 "
        "isomorphism count:",
        len(direct_isomorphisms),
    )

    for index, isometry in enumerate(
        direct_isomorphisms
    ):
        print()
        print(
            f"direct isomorphism {index}:"
        )
        print(isometry)
        try_isometry_metadata(
            isometry
        )


    heading(
        "HYPERBOLIC ISOMETRIES"
    )

    hyperbolic_isometries = (
        filled.is_isometric_to(
            target,
            return_isometries=True,
        )
    )

    print(
        "hyperbolic isometry count:",
        len(hyperbolic_isometries),
    )

    for index, isometry in enumerate(
        hyperbolic_isometries
    ):
        print()
        print(
            f"hyperbolic isometry {index}:"
        )
        print(isometry)
        try_isometry_metadata(
            isometry
        )


    heading(
        "CANONICAL RETRIANGULATIONS"
    )

    filled_canonical = (
        filled.canonical_retriangulation()
    )

    target_canonical = (
        target.canonical_retriangulation()
    )

    describe_triangulation(
        "filled canonical:",
        filled_canonical,
    )

    print()

    describe_triangulation(
        "m004 canonical:",
        target_canonical,
    )

    canonical_isomorphisms = (
        filled_canonical
        .isomorphisms_to(
            target_canonical
        )
    )

    print()
    print(
        "canonical combinatorial "
        "isomorphism count:",
        len(canonical_isomorphisms),
    )

    for index, isometry in enumerate(
        canonical_isomorphisms
    ):
        print()
        print(
            f"canonical isomorphism {index}:"
        )
        print(isometry)
        try_isometry_metadata(
            isometry
        )


    heading(
        "ISOMETRY OBJECT INTERFACE"
    )

    sample = None

    if direct_isomorphisms:
        sample = direct_isomorphisms[0]
    elif canonical_isomorphisms:
        sample = canonical_isomorphisms[0]
    elif hyperbolic_isometries:
        sample = hyperbolic_isometries[0]

    if sample is None:
        print(
            "No isometry object available."
        )
    else:
        for item in (
            public_isometry_interface(
                sample
            )
        ):
            print(
                " ",
                item,
            )


    heading(
        "DIAGNOSIS"
    )

    endpoint_tets = (
        endpoint.num_tetrahedra()
    )

    filled_tets = (
        filled.num_tetrahedra()
    )

    target_tets = (
        target.num_tetrahedra()
    )

    print(
        "persistent endpoint tetrahedra:",
        endpoint_tets,
    )

    print(
        "permanently filled tetrahedra:",
        filled_tets,
    )

    print(
        "native m004 tetrahedra:",
        target_tets,
    )

    if direct_isomorphisms:
        print()
        print(
            "RESULT: the permanently filled "
            "endpoint triangulation is already "
            "combinatorially isomorphic to the "
            "native m004 triangulation."
        )
        print(
            "Next task: recover how the old "
            "persistent 4-tetrahedron cusp "
            "triangles descend through the "
            "filling/simplification into this "
            "native triangulation."
        )
    else:
        print()
        print(
            "RESULT: the permanently filled "
            "endpoint is NOT directly the native "
            "m004 triangulation."
        )
        print(
            "Next task: use the canonical "
            "retriangulations as the common "
            "comparison object and recover the "
            "explicit retriangulation map."
        )


if __name__ == "__main__":
    main()
