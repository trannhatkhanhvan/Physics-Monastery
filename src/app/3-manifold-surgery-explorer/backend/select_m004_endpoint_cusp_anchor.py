#!/usr/bin/env python3

from pathlib import Path
import json

import regina


HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data" / "generated"

CANDIDATES_PATH = (
    DATA /
    "m129_to_m004_endpoint_cusp_anchor.json"
)

OUTPUT_PATH = (
    DATA /
    "m129_to_m004_endpoint_cusp_anchor_selected.json"
)


def is_identity_isomorphism(
    iso,
    triangulation,
):
    for tet in range(
        triangulation.size()
    ):
        if (
            int(
                iso.tetImage(
                    tet
                )
            ) != tet
        ):
            return False

        permutation = (
            iso.facetPerm(
                tet
            )
        )

        for vertex in range(4):
            if (
                int(
                    permutation[
                        vertex
                    ]
                ) != vertex
            ):
                return False

    return True


def main():
    source = json.loads(
        CANDIDATES_PATH.read_text()
    )

    candidates = source[
        "candidates"
    ]

    tri = (
        regina.Triangulation3
        .fromIsoSig(
            "cPcbbbiht"
        )
    )

    automorphisms = (
        tri.findAllIsomorphisms(
            tri
        )
    )

    if (
        len(automorphisms) !=
        len(candidates)
    ):
        raise RuntimeError(
            "Candidate count does not match "
            "Regina automorphism count."
        )

    identity_indices = []

    for index, iso in enumerate(
        automorphisms
    ):
        if is_identity_isomorphism(
            iso,
            tri,
        ):
            identity_indices.append(
                index
            )

    if len(identity_indices) != 1:
        raise RuntimeError(
            "Expected exactly one identity "
            "automorphism; found "
            f"{identity_indices}"
        )

    selected_index = (
        identity_indices[0]
    )

    selected = (
        candidates[
            selected_index
        ]
    )

    #
    # The canonical viewer atlas uses:
    #
    #   Regina/cell tetrahedron 0 -> A
    #   Regina/cell tetrahedron 1 -> B
    #
    # with the existing viewer-to-cell vertex convention
    # already recorded in the candidate manifest.
    #
    # The identity automorphism therefore preserves the
    # certified canonical cell labeling instead of applying
    # one of the seven nontrivial m004 symmetries.
    #
    output = {
        "schema":
            "physics-monastery."
            "m129-to-m004-endpoint-cusp-anchor-selected.v1",

        "endpoint_state":
            195,

        "endpoint_manifold_isoSig":
            "cPcbbbiht",

        "selection_rule":
            "identity automorphism of canonical cPcbbbiht",

        "selected_candidate_index":
            selected_index,

        "viewer_to_cell_vertex":
            source[
                "viewer_to_cell_vertex"
            ],

        "mapping":
            selected[
                "mapping"
            ],
    }

    mapping = output[
        "mapping"
    ]

    observed = {
        record[
            "native_triangle_id"
        ]
        for record in mapping
    }

    expected = {
        "A0", "A1", "A2", "A3",
        "B0", "B1", "B2", "B3",
    }

    if observed != expected:
        raise RuntimeError(
            "Selected identity anchor is not "
            "a bijection onto the eight native "
            "m004 cusp triangles."
        )

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
        "SELECTED m004 ENDPOINT CUSP ANCHOR"
    )

    print(
        "identity candidate:",
        selected_index
    )

    print()

    for record in sorted(
        mapping,
        key=lambda r:
            r[
                "endpoint_triangle_index"
            ],
    ):
        print(
            "endpoint triangle "
            f"{record['endpoint_triangle_index']}"
            " -> "
            f"{record['native_triangle_id']}"
        )

    print()
    print(
        "wrote:",
        OUTPUT_PATH
    )

    print()
    print(
        "PASS: canonical identity endpoint "
        "anchor selected."
    )


if __name__ == "__main__":
    main()
