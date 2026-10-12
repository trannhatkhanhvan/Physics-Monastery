#!/usr/bin/env python3

from pathlib import Path
import json
import itertools

import regina


HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data" / "generated"

MOVIE_PATH = (
    DATA /
    "m129_to_m004_cusp_movie.json"
)

OUTPUT_PATH = (
    DATA /
    "m129_to_m004_endpoint_cusp_anchor.json"
)


#
# Native viewer A/B vertex convention.
#
# From the certified current m004 atlas:
#
#   A viewer vertex -> cell vertex:
#       0,1,2,3
#
#   B viewer vertex -> cell vertex:
#       3,2,1,0
#
VIEWER_TO_CELL = {
    "A": [0, 1, 2, 3],
    "B": [3, 2, 1, 0],
}


def inverse_permutation(values):
    result = [None] * len(values)

    for source, target in enumerate(values):
        result[target] = source

    return result


CELL_TO_VIEWER = {
    key:
        inverse_permutation(value)
    for key, value
    in VIEWER_TO_CELL.items()
}


def endpoint_state():
    movie = json.loads(
        MOVIE_PATH.read_text()
    )

    state = movie["states"][-1]

    if (
        state["index"] != 195 or
        state["manifold_isoSig"] !=
            "cPcbbbiht" or
        state["manifold_tetrahedra"] != 2 or
        state["link"]["triangles"] != 8
    ):
        raise RuntimeError(
            "Unexpected endpoint state."
        )

    return state


def regina_m004():
    tri = (
        regina.Triangulation3
        .fromIsoSig(
            "cPcbbbiht"
        )
    )

    if tri.size() != 2:
        raise RuntimeError(
            "Expected 2 tetrahedra."
        )

    return tri


def tetrahedron_automorphisms(tri):
    #
    # Enumerate combinatorial self-isomorphisms of the canonical
    # cPcbbbiht triangulation.
    #
    isos = (
        tri.findAllIsomorphisms(
            tri
        )
    )

    result = []

    for iso in isos:
        tetrahedra = []

        for tet in range(
            tri.size()
        ):
            image_tet = int(
                iso.tetImage(tet)
            )

            perm = [
                int(
                    iso.facetPerm(
                        tet
                    )[v]
                )
                for v in range(4)
            ]

            tetrahedra.append({
                "source_tetrahedron":
                    tet,

                "target_tetrahedron":
                    image_tet,

                "vertex_permutation":
                    perm,
            })

        result.append({
            "tetrahedra":
                tetrahedra,
        })

    return result


def endpoint_triangle_key(
    triangle
):
    return (
        int(
            triangle[
                "ambient_tetrahedron"
            ]
        ),
        int(
            triangle[
                "ambient_ideal_vertex"
            ]
        ),
    )


def native_triangle_id(
    target_tet,
    target_cell_vertex,
):
    tetrahedron_name = (
        "A"
        if target_tet == 0
        else "B"
    )

    viewer_vertex = (
        CELL_TO_VIEWER[
            tetrahedron_name
        ][
            target_cell_vertex
        ]
    )

    return (
        f"{tetrahedron_name}"
        f"{viewer_vertex}"
    )


def mapping_for_iso(
    endpoint,
    iso_record,
):
    per_tet = {
        record[
            "source_tetrahedron"
        ]:
            record
        for record
        in iso_record[
            "tetrahedra"
        ]
    }

    mapping = []

    for triangle in endpoint[
        "triangles"
    ]:
        source_tet = int(
            triangle[
                "ambient_tetrahedron"
            ]
        )

        source_vertex = int(
            triangle[
                "ambient_ideal_vertex"
            ]
        )

        tet_record = (
            per_tet[
                source_tet
            ]
        )

        target_tet = int(
            tet_record[
                "target_tetrahedron"
            ]
        )

        target_cell_vertex = int(
            tet_record[
                "vertex_permutation"
            ][
                source_vertex
            ]
        )

        triangle_id = (
            native_triangle_id(
                target_tet,
                target_cell_vertex,
            )
        )

        mapping.append({
            "endpoint_triangle_index":
                int(
                    triangle["index"]
                ),

            "source_tetrahedron":
                source_tet,

            "source_ideal_vertex":
                source_vertex,

            "target_tetrahedron":
                target_tet,

            "target_cell_vertex":
                target_cell_vertex,

            "native_triangle_id":
                triangle_id,
        })

    ids = [
        record[
            "native_triangle_id"
        ]
        for record in mapping
    ]

    if (
        len(ids) != 8 or
        len(set(ids)) != 8
    ):
        raise RuntimeError(
            "Candidate does not map "
            "bijectively to eight native "
            "m004 cusp triangles."
        )

    return mapping


def main():
    endpoint = endpoint_state()

    tri = regina_m004()

    automorphisms = (
        tetrahedron_automorphisms(
            tri
        )
    )

    print(
        "canonical m004 automorphisms:",
        len(
            automorphisms
        )
    )

    candidates = []

    for index, iso_record in enumerate(
        automorphisms
    ):
        mapping = (
            mapping_for_iso(
                endpoint,
                iso_record,
            )
        )

        candidates.append({
            "candidate_index":
                index,

            "mapping":
                mapping,
        })

    native_ids = {
        "A0", "A1", "A2", "A3",
        "B0", "B1", "B2", "B3",
    }

    for candidate in candidates:
        observed = {
            record[
                "native_triangle_id"
            ]
            for record
            in candidate[
                "mapping"
            ]
        }

        if observed != native_ids:
            raise RuntimeError(
                "Native triangle set mismatch."
            )

    output = {
        "schema":
            "physics-monastery."
            "m129-to-m004-endpoint-cusp-anchor.v1",

        "endpoint_state":
            195,

        "endpoint_manifold_isoSig":
            "cPcbbbiht",

        "native_triangle_ids":
            sorted(
                native_ids
            ),

        "viewer_to_cell_vertex":
            VIEWER_TO_CELL,

        "candidate_count":
            len(
                candidates
            ),

        "candidates":
            candidates,
    }

    OUTPUT_PATH.write_text(
        json.dumps(
            output,
            indent=2,
        )
        +
        "\n"
    )

    print()
    print(
        "ENDPOINT CUSP ANCHOR CANDIDATES"
    )

    for candidate in candidates:
        print()
        print(
            "candidate",
            candidate[
                "candidate_index"
            ],
        )

        for record in sorted(
            candidate[
                "mapping"
            ],
            key=lambda r:
                r[
                    "endpoint_triangle_index"
                ],
        ):
            print(
                "  endpoint triangle "
                f"{record['endpoint_triangle_index']}: "
                f"tet "
                f"{record['source_tetrahedron']} "
                f"vertex "
                f"{record['source_ideal_vertex']} "
                "-> "
                f"{record['native_triangle_id']}"
            )

    print()
    print(
        "wrote:",
        OUTPUT_PATH
    )

    print()
    print(
        "PASS: endpoint cusp anchor "
        "candidates exported."
    )


if __name__ == "__main__":
    main()
