#!/usr/bin/env python3

from pathlib import Path
import json

import regina


HERE = Path(__file__).resolve().parent

DATA = (
    HERE.parent /
    "data" /
    "generated"
)

MANIFEST_PATH = (
    DATA /
    "m129_to_m004_retriangulation_manifest.json"
)

OUTPUT_PATH = (
    DATA /
    "m129_to_m004_cusp_movie.json"
)

TARGET_ISOSIG = "cPcbbbiht"


def perm_to_list(perm, size):
    return [
        int(perm[i])
        for i in range(size)
    ]


def find_surviving_torus_vertex(tri):
    ideal_vertices = []

    for i in range(
        tri.countVertices()
    ):
        vertex = tri.vertex(i)

        if not vertex.isIdeal():
            continue

        #
        # For this certified path there must be exactly one
        # surviving torus cusp.
        #
        if (
            vertex.linkType() ==
            regina.Vertex3.Link.Torus
        ):
            ideal_vertices.append(
                vertex
            )

    if len(ideal_vertices) != 1:
        raise RuntimeError(
            "Expected exactly one ideal torus "
            f"vertex; found {len(ideal_vertices)}."
        )

    return ideal_vertices[0]


def export_link_triangle(
    link,
    inclusion,
    triangle_index,
):
    triangle = link.triangle(
        triangle_index
    )

    #
    # buildLinkInclusion() maps this cusp-link
    # triangle back into the tetrahedron that
    # contains it.
    #
    tet_index = int(
        inclusion.tetImage(
            triangle_index
        )
    )

    face_perm = (
        inclusion.facePerm(
            triangle_index
        )
    )

    #
    # face_perm sends:
    #
    #   0,1,2 -> the three tetrahedron vertices
    #            parallel to this link triangle
    #
    #   3     -> the ideal tetrahedron vertex
    #            being sliced off
    #
    ideal_vertex = int(
        face_perm[3]
    )

    ambient_vertices = [
        int(face_perm[i])
        for i in range(3)
    ]

    sides = []

    for side in range(3):
        adjacent = (
            triangle.adjacentSimplex(
                side
            )
        )

        if adjacent is None:
            sides.append({
                "side":
                    side,

                "adjacent_triangle":
                    None,

                "adjacent_side":
                    None,

                "gluing":
                    None,
            })

            continue

        gluing = (
            triangle.adjacentGluing(
                side
            )
        )

        sides.append({
            "side":
                side,

            "adjacent_triangle":
                int(
                    adjacent.index()
                ),

            "adjacent_side":
                int(
                    triangle.adjacentFacet(
                        side
                    )
                ),

            "gluing":
                perm_to_list(
                    gluing,
                    3,
                ),
        })

    return {
        "index":
            triangle_index,

        #
        # Exact global simplex incidence inside the
        # triangulated torus link.
        #
        # These are Regina indices, not display labels.
        #
        "vertices": [
            int(
                triangle.vertex(i).index()
            )
            for i in range(3)
        ],

        "edges": [
            int(
                triangle.edge(i).index()
            )
            for i in range(3)
        ],

        "ambient_tetrahedron":
            tet_index,

        "ambient_ideal_vertex":
            ideal_vertex,

        "ambient_vertices":
            ambient_vertices,

        "inclusion_perm":
            perm_to_list(
                face_perm,
                4,
            ),

        "sides":
            sides,
    }


def export_cusp_state(
    state_index,
    state,
):
    tri = (
        regina.Triangulation3
        .fromIsoSig(
            state[
                "isoSig"
            ]
        )
    )

    if (
        tri.size() !=
        state[
            "tetrahedra"
        ]
    ):
        raise RuntimeError(
            f"State {state_index}: "
            "tetrahedron count mismatch."
        )

    vertex = (
        find_surviving_torus_vertex(
            tri
        )
    )

    link = vertex.buildLink()

    inclusion = (
        vertex.buildLinkInclusion()
    )

    triangles = [
        export_link_triangle(
            link,
            inclusion,
            i,
        )
        for i in range(
            link.size()
        )
    ]

    #
    # A triangulated torus must satisfy:
    #
    #   chi = V - E + F = 0
    #
    vertex_count = (
        link.countVertices()
    )

    edge_count = (
        link.countEdges()
    )

    triangle_count = (
        link.size()
    )

    euler = (
        vertex_count -
        edge_count +
        triangle_count
    )

    if euler != 0:
        raise RuntimeError(
            f"State {state_index}: "
            f"cusp link Euler characteristic "
            f"is {euler}, expected 0."
        )

    return {
        "index":
            state_index,

        "manifold_tetrahedra":
            tri.size(),

        "manifold_isoSig":
            state[
                "isoSig"
            ],

        "ideal_vertex_index":
            int(
                vertex.index()
            ),

        "link": {
            "vertices":
                vertex_count,

            "edges":
                edge_count,

            "triangles":
                triangle_count,

            "euler_characteristic":
                euler,

            "is_orientable":
                bool(
                    link.isOrientable()
                ),

            "is_closed":
                (
                    link.countBoundaryComponents()
                    == 0
                ),
        },

        "triangles":
            triangles,
    }


def move_summary(
    move,
):
    return {
        key: move.get(key)
        for key in (
            "index",
            "kind",
            "face_dimension",
            "face_index",
            "edge_end",
            "before_tetrahedra",
            "after_tetrahedra",
            "before_isoSig",
            "after_isoSig",
        )
        if key in move
    }


def main():
    manifest = json.loads(
        MANIFEST_PATH.read_text()
    )

    if not manifest.get(
        "complete"
    ):
        raise RuntimeError(
            "Retriangulation manifest "
            "is not marked complete."
        )

    states = manifest[
        "states"
    ]

    moves = manifest[
        "moves"
    ]

    if len(states) != 196:
        raise RuntimeError(
            "Expected 196 certified states; "
            f"found {len(states)}."
        )

    if len(moves) != 195:
        raise RuntimeError(
            "Expected 195 certified moves; "
            f"found {len(moves)}."
        )

    if (
        states[-1][
            "isoSig"
        ] != TARGET_ISOSIG
    ):
        raise RuntimeError(
            "Canonical manifest does not "
            "end at m004."
        )

    exported_states = []

    for i, state in enumerate(
        states
    ):
        cusp = export_cusp_state(
            i,
            state,
        )

        exported_states.append(
            cusp
        )

        if (
            i % 10 == 0 or
            i == len(states) - 1
        ):
            print(
                f"state {i:3d}/"
                f"{len(states) - 1}: "
                f"{state['tetrahedra']:3d} tets, "
                f"{cusp['link']['triangles']:3d} "
                "cusp triangles"
            )

    #
    # Verify every move boundary against
    # the exported state sequence.
    #
    for i, move in enumerate(
        moves
    ):
        before = (
            exported_states[i]
        )

        after = (
            exported_states[i + 1]
        )

        if (
            before[
                "manifold_isoSig"
            ] !=
            move[
                "before_isoSig"
            ]
        ):
            raise RuntimeError(
                f"Move {i}: before isoSig "
                "does not match exported state."
            )

        if (
            after[
                "manifold_isoSig"
            ] !=
            move[
                "after_isoSig"
            ]
        ):
            raise RuntimeError(
                f"Move {i}: after isoSig "
                "does not match exported state."
            )

    output = {
        "schema":
            "physics-monastery."
            "m129-to-m004-cusp-movie.v1",

        "certification": {
            "source_manifold":
                "m129",

            "target_manifold":
                "m004",

            "source_tetrahedra":
                states[0][
                    "tetrahedra"
                ],

            "target_tetrahedra":
                states[-1][
                    "tetrahedra"
                ],

            "target_isoSig":
                TARGET_ISOSIG,

            "state_count":
                len(
                    exported_states
                ),

            "move_count":
                len(
                    moves
                ),
        },

        "moves": [
            move_summary(move)
            for move in moves
        ],

        "states":
            exported_states,
    }

    OUTPUT_PATH.write_text(
        json.dumps(
            output,
            indent=2,
        )
        +
        "\n"
    )

    first = (
        exported_states[0]
    )

    last = (
        exported_states[-1]
    )

    print()
    print(
        "CUSP MOVIE EXPORT COMPLETE"
    )

    print(
        "states:",
        len(
            exported_states
        )
    )

    print(
        "moves:",
        len(
            moves
        )
    )

    print(
        "first cusp triangles:",
        first[
            "link"
        ][
            "triangles"
        ]
    )

    print(
        "final cusp triangles:",
        last[
            "link"
        ][
            "triangles"
        ]
    )

    print(
        "final isoSig:",
        last[
            "manifold_isoSig"
        ]
    )

    print(
        "wrote:",
        OUTPUT_PATH
    )

    print()
    print(
        "PASS: all 196 certified "
        "surviving cusp triangulations "
        "were exported."
    )


if __name__ == "__main__":
    main()
