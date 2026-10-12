#!/usr/bin/env python3

from pathlib import Path
import json

import regina


HERE = Path(__file__).resolve().parent

INPUT = (
    HERE /
    "m129_marked.snappea"
)

OUTPUT = (
    HERE.parent /
    "data" /
    "generated" /
    "m129_to_m004_recorded_reduction.json"
)

FILLED_CUSP = 1

TARGET_ISOSIG = "cPcbbbiht"


#
# Certified explicit attachment: MATCH 0
#
HOST_ORDER = (0, 1)

P0 = regina.Perm4(
    3, 2, 0, 1
)

P1 = regina.Perm4(
    0, 2, 1, 3
)


def heading(text):
    print()
    print("=" * 72)
    print(text)
    print("=" * 72)


def real_boundary_components(tri):
    return [
        tri.boundaryComponent(i)
        for i in range(
            tri.countBoundaryComponents()
        )
        if (
            tri.boundaryComponent(i)
            .countTriangles() > 0
        )
    ]


def boundary_triangle_embedding(
    triangle
):
    emb = triangle.embedding(0)

    return (
        emb.tetrahedron(),
        emb.face(),
    )


def build_certified_unsimplified():
    snap = regina.SnapPeaTriangulation(
        INPUT.read_text()
    )

    filled_vertex_index = (
        snap
        .cusp(FILLED_CUSP)
        .vertex()
        .index()
    )

    host = regina.Triangulation3(
        snap
    )

    host.truncate(
        host.vertex(
            filled_vertex_index
        )
    )

    host.minimiseBoundary()

    boundaries = (
        real_boundary_components(
            host
        )
    )

    if len(boundaries) != 1:
        raise RuntimeError(
            "Expected one real torus boundary."
        )

    bc = boundaries[0]

    if (
        bc.countTriangles() != 2 or
        bc.countEdges() != 3
    ):
        raise RuntimeError(
            "Expected two-triangle torus boundary."
        )

    tri = regina.Triangulation3(
        host
    )

    lst_tet = (
        tri.insertLayeredSolidTorus(
            1,
            3,
        )
    )

    boundaries = (
        real_boundary_components(
            tri
        )
    )

    if len(boundaries) != 2:
        raise RuntimeError(
            "Expected host and LST real boundaries."
        )

    host_edge_indices = {
        bc.edge(i).index()
        for i in range(3)
    }

    host_bc = None

    for candidate_bc in boundaries:
        indices = {
            candidate_bc
            .edge(i)
            .index()
            for i in range(
                candidate_bc.countEdges()
            )
        }

        if host_edge_indices.issubset(
            indices
        ):
            host_bc = candidate_bc
            break

    if host_bc is None:
        raise RuntimeError(
            "Could not relocate host boundary."
        )

    embeddings = []

    for i in range(2):
        embeddings.append(
            boundary_triangle_embedding(
                host_bc.triangle(i)
            )
        )

    h0_tet, h0_face = (
        embeddings[
            HOST_ORDER[0]
        ]
    )

    h1_tet, h1_face = (
        embeddings[
            HOST_ORDER[1]
        ]
    )

    if P0[3] != h0_face:
        raise RuntimeError(
            "Certified P0 no longer matches "
            "host boundary facet."
        )

    if P1[2] != h1_face:
        raise RuntimeError(
            "Certified P1 no longer matches "
            "host boundary facet."
        )

    lst_tet.join(
        3,
        h0_tet,
        P0,
    )

    lst_tet.join(
        2,
        h1_tet,
        P1,
    )

    if tri.countBoundaryTriangles() != 0:
        raise RuntimeError(
            "Explicit LST attachment did not seal "
            "the real torus boundary."
        )

    check = regina.Triangulation3(
        tri
    )

    check.intelligentSimplify()

    target = (
        regina.Triangulation3
        .fromIsoSig(
            TARGET_ISOSIG
        )
    )

    if (
        check.isIsomorphicTo(
            target
        )
        is None
    ):
        raise RuntimeError(
            "Certified unsimplified attachment "
            "does not simplify to m004."
        )

    return tri


def terminal_score(tri):
    """
    Use Regina only as a heuristic score here.

    The returned simplification is NEVER used as a
    recorded state.  It merely tells us whether a
    candidate one-step move leaves us in a region
    that still simplifies efficiently.
    """
    probe = regina.Triangulation3(
        tri
    )

    probe.intelligentSimplify()

    return (
        probe.size(),
        probe.isoSig(),
    )


def candidate_reducing_moves(tri):
    """
    Generate one-step legal reducing moves only.

    Each candidate record contains:
        move description
        resulting triangulation
    """

    out = []


    #
    # 3 -> 2 Pachner moves.
    #
    # In dimension 3, a Pachner move about an edge
    # replaces three tetrahedra with two.
    #
    for edge_index in range(
        tri.countEdges()
    ):
        edge = tri.edge(
            edge_index
        )

        candidate = (
            tri.withPachner(
                edge
            )
        )

        if candidate is None:
            continue

        if candidate.size() >= tri.size():
            continue

        out.append({
            "kind":
                "3-2",

            "face_dimension":
                1,

            "face_index":
                edge_index,

            "edge_degree":
                edge.degree(),

            "result":
                candidate,
        })


    #
    # 2 -> 0 moves.
    #
    # Regina implements these about degree-two
    # vertices and edges in dimension 3.
    #
    for vertex_index in range(
        tri.countVertices()
    ):
        vertex = tri.vertex(
            vertex_index
        )

        candidate = (
            tri.with20(
                vertex
            )
        )

        if candidate is None:
            continue

        if candidate.size() >= tri.size():
            continue

        out.append({
            "kind":
                "2-0",

            "face_dimension":
                0,

            "face_index":
                vertex_index,

            "result":
                candidate,
        })


    for edge_index in range(
        tri.countEdges()
    ):
        edge = tri.edge(
            edge_index
        )

        candidate = (
            tri.with20(
                edge
            )
        )

        if candidate is None:
            continue

        if candidate.size() >= tri.size():
            continue

        out.append({
            "kind":
                "2-0",

            "face_dimension":
                1,

            "face_index":
                edge_index,

            "edge_degree":
                edge.degree(),

            "result":
                candidate,
        })


    #
    # 2 -> 1 moves.
    #
    for edge_index in range(
        tri.countEdges()
    ):
        edge = tri.edge(
            edge_index
        )

        for edge_end in (
            0,
            1,
        ):
            candidate = (
                tri.with21(
                    edge,
                    edge_end,
                )
            )

            if candidate is None:
                continue

            if candidate.size() >= tri.size():
                continue

            out.append({
                "kind":
                    "2-1",

                "face_dimension":
                    1,

                "face_index":
                    edge_index,

                "edge_end":
                    edge_end,

                "edge_degree":
                    edge.degree(),

                "result":
                    candidate,
            })

    return out


def choose_move(tri):
    candidates = (
        candidate_reducing_moves(
            tri
        )
    )

    if not candidates:
        return None

    scored = []

    for record in candidates:
        candidate = record["result"]

        simplified_size, simplified_sig = (
            terminal_score(
                candidate
            )
        )

        scored.append(
            (
                simplified_size,
                candidate.size(),
                record["kind"],
                record["face_dimension"],
                record["face_index"],
                record.get(
                    "edge_end",
                    -1,
                ),
                simplified_sig,
                record,
            )
        )

    scored.sort(
        key=lambda item: (
            item[0],
            item[1],
            item[2],
            item[3],
            item[4],
            item[5],
            item[6],
        )
    )

    return scored[0][-1]


def main():
    heading(
        "RECORDED m129 -> m004 "
        "REDUCTION"
    )

    current = (
        build_certified_unsimplified()
    )

    target = (
        regina.Triangulation3
        .fromIsoSig(
            TARGET_ISOSIG
        )
    )

    print(
        "start tetrahedra:",
        current.size()
    )

    print(
        "start isoSig:",
        current.isoSig()
    )

    print(
        "target tetrahedra:",
        target.size()
    )

    print(
        "target isoSig:",
        target.isoSig()
    )

    states = [{
        "step":
            0,

        "tetrahedra":
            current.size(),

        "isoSig":
            current.isoSig(),

        "move":
            None,
    }]

    step = 0

    while current.size() > 2:
        step += 1

        move = choose_move(
            current
        )

        if move is None:
            print()
            print(
                "REDUCING SEARCH STUCK"
            )

            print(
                "step:",
                step - 1
            )

            print(
                "tetrahedra:",
                current.size()
            )

            print(
                "isoSig:",
                current.isoSig()
            )

            break

        before_sig = (
            current.isoSig()
        )

        before_size = (
            current.size()
        )

        next_tri = move.pop(
            "result"
        )

        after_sig = (
            next_tri.isoSig()
        )

        after_size = (
            next_tri.size()
        )

        heuristic_size, heuristic_sig = (
            terminal_score(
                next_tri
            )
        )

        move_record = {
            **move,

            "before_tetrahedra":
                before_size,

            "after_tetrahedra":
                after_size,

            "before_isoSig":
                before_sig,

            "after_isoSig":
                after_sig,

            "heuristic_simplified_tetrahedra":
                heuristic_size,

            "heuristic_simplified_isoSig":
                heuristic_sig,
        }

        states.append({
            "step":
                step,

            "tetrahedra":
                after_size,

            "isoSig":
                after_sig,

            "move":
                move_record,
        })

        current = next_tri

        print(
            f"{step:3d}: "
            f"{move_record['kind']:>3}  "
            f"{before_size:3d} -> "
            f"{after_size:3d}  "
            f"heuristic -> "
            f"{heuristic_size}"
        )


    heading(
        "FINAL CHECK"
    )

    is_target = (
        current.isIsomorphicTo(
            target
        )
        is not None
    )

    print(
        "final tetrahedra:",
        current.size()
    )

    print(
        "final isoSig:",
        current.isoSig()
    )

    print(
        "isomorphic to m004:",
        is_target
    )

    output = {
        "schema":
            "physics-monastery."
            "recorded-retriangulation.v1",

        "source": {
            "manifold":
                "m129",

            "viewer_slope":
                [3, -1],

            "link_basis_slope":
                [1, 1],

            "boundary_cuts":
                [4, 3, 1],

            "layered_solid_torus":
                [1, 3, 4],

            "attachment":
                {
                    "host_order":
                        list(
                            HOST_ORDER
                        ),

                    "p0":
                        [
                            P0[i]
                            for i in range(4)
                        ],

                    "p1":
                        [
                            P1[i]
                            for i in range(4)
                        ],
                },

            "unsimplified_tetrahedra":
                states[0][
                    "tetrahedra"
                ],

            "unsimplified_isoSig":
                states[0][
                    "isoSig"
                ],
        },

        "target": {
            "manifold":
                "m004",

            "isoSig":
                TARGET_ISOSIG,

            "tetrahedra":
                2,
        },

        "complete":
            bool(
                is_target and
                current.size() == 2
            ),

        "state_count":
            len(states),

        "move_count":
            len(states) - 1,

        "states":
            states,
    }

    OUTPUT.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    OUTPUT.write_text(
        json.dumps(
            output,
            indent=2,
        )
        +
        "\n"
    )

    print()
    print(
        "wrote:",
        OUTPUT
    )

    if (
        is_target and
        current.size() == 2
    ):
        print()
        print(
            "PASS: every simplification step "
            "was explicitly recorded."
        )

    else:
        print()
        print(
            "The monotone reducing path reached "
            "a local minimum before m004."
        )

        print(
            "That is useful information: the "
            "next search must include an explicit "
            "2-3 escape move, which we will also "
            "record rather than hide."
        )


if __name__ == "__main__":
    main()
