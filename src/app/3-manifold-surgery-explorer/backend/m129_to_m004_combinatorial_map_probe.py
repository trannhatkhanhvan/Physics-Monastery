#!/usr/bin/env python3

import itertools
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


def compose(left, right):
    """
    Return left ∘ right.
    Permutations are tuples/lists with p[v] = image of v.
    """
    return tuple(
        left[right[v]]
        for v in range(4)
    )


def valid_isomorphism(
    source_gluing,
    target_gluing,
    tet_map,
    vertex_maps,
):
    source_neighbors = [
        record[0]
        for record in source_gluing
    ]

    source_perms = [
        record[1]
        for record in source_gluing
    ]

    target_neighbors = [
        record[0]
        for record in target_gluing
    ]

    target_perms = [
        record[1]
        for record in target_gluing
    ]

    for source_tet in range(2):
        target_tet = tet_map[source_tet]
        q_source = vertex_maps[source_tet]

        for source_face in range(4):
            source_neighbor = (
                source_neighbors[
                    source_tet
                ][
                    source_face
                ]
            )

            source_glue = tuple(
                source_perms[
                    source_tet
                ][
                    source_face
                ]
            )

            target_face = (
                q_source[
                    source_face
                ]
            )

            expected_target_neighbor = (
                tet_map[
                    source_neighbor
                ]
            )

            actual_target_neighbor = (
                target_neighbors[
                    target_tet
                ][
                    target_face
                ]
            )

            if (
                actual_target_neighbor !=
                expected_target_neighbor
            ):
                return False

            target_glue = tuple(
                target_perms[
                    target_tet
                ][
                    target_face
                ]
            )

            q_neighbor = (
                vertex_maps[
                    source_neighbor
                ]
            )

            for vertex in range(4):
                via_source_then_map = (
                    q_neighbor[
                        source_glue[
                            vertex
                        ]
                    ]
                )

                via_map_then_target = (
                    target_glue[
                        q_source[
                            vertex
                        ]
                    ]
                )

                if (
                    via_source_then_map !=
                    via_map_then_target
                ):
                    return False

    return True


def format_map(
    index,
    tet_map,
    vertex_maps,
):
    print()
    print(
        f"map {index}"
    )
    print("-" * 40)

    print(
        "tetrahedra:",
        f"0 -> {tet_map[0]},",
        f"1 -> {tet_map[1]}",
    )

    for source_tet in range(2):
        print(
            f"vertices in source tet "
            f"{source_tet}:",
            list(
                vertex_maps[
                    source_tet
                ]
            ),
        )

        for vertex in range(4):
            print(
                f"  "
                f"{source_tet}v{vertex}"
                f" -> "
                f"{tet_map[source_tet]}"
                f"v"
                f"{vertex_maps[source_tet][vertex]}"
            )


def main():
    heading(
        "m129 -> m004 "
        "COMBINATORIAL MAP PROBE"
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

    source_gluing = (
        filled
        ._get_tetrahedra_gluing_data()
    )

    target_gluing = (
        target
        ._get_tetrahedra_gluing_data()
    )

    vertex_permutations = list(
        itertools.permutations(
            range(4)
        )
    )

    tetrahedron_maps = [
        (0, 1),
        (1, 0),
    ]

    maps = []

    for tet_map in tetrahedron_maps:
        for q0 in vertex_permutations:
            for q1 in vertex_permutations:
                vertex_maps = (
                    q0,
                    q1,
                )

                if valid_isomorphism(
                    source_gluing,
                    target_gluing,
                    tet_map,
                    vertex_maps,
                ):
                    maps.append(
                        (
                            tet_map,
                            vertex_maps,
                        )
                    )


    heading(
        "RESULT"
    )

    print(
        "combinatorial maps found:",
        len(maps),
    )

    for index, (
        tet_map,
        vertex_maps,
    ) in enumerate(maps):
        format_map(
            index,
            tet_map,
            vertex_maps,
        )


    heading(
        "CONSISTENCY CHECK"
    )

    snappy_count = len(
        filled.isomorphisms_to(
            target
        )
    )

    print(
        "SnapPy isomorphism count:",
        snappy_count,
    )

    print(
        "brute-force count:",
        len(maps),
    )

    if len(maps) != snappy_count:
        raise RuntimeError(
            "Combinatorial map count "
            "does not match SnapPy."
        )

    print()
    print(
        "PASS: all SnapPy combinatorial "
        "isomorphisms were recovered "
        "directly from the gluing tables."
    )


if __name__ == "__main__":
    main()
