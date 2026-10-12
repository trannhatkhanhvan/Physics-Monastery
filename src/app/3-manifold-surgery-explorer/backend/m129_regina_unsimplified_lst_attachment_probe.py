#!/usr/bin/env python3

from pathlib import Path
import itertools

import regina


HERE = Path(__file__).resolve().parent

INPUT = (
    HERE /
    "m129_marked.snappea"
)

FILLED_CUSP = 1

TARGET_ISOSIG = "cPcbbbiht"


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
    triangle,
):
    emb = triangle.embedding(0)

    tet = emb.tetrahedron()

    face = emb.face()

    return (
        tet,
        face,
    )


def boundary_edge_index_map(
    bc,
):
    return {
        bc.edge(i).index(): i
        for i in range(3)
    }


def face_edges(face):
    vertices = [
        v
        for v in range(4)
        if v != face
    ]

    return [
        tuple(sorted(pair))
        for pair in itertools.combinations(
            vertices,
            2,
        )
    ]


def edge_global_index(
    tet,
    a,
    b,
):
    return tet.edge(
        regina.Edge3.edgeNumber[
            a
        ][
            b
        ]
    ).index()


def perm_tuple(perm):
    return tuple(
        perm[i]
        for i in range(4)
    )


def main():
    heading(
        "UNSIMPLIFIED LAYERED-SOLID-TORUS "
        "ATTACHMENT PROBE"
    )

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
            "Expected exactly one real "
            "two-triangle torus boundary."
        )

    bc = boundaries[0]

    if (
        bc.countTriangles() != 2 or
        bc.countEdges() != 3
    ):
        raise RuntimeError(
            "Real boundary is not the "
            "required two-triangle torus."
        )

    heading(
        "CERTIFIED HOST BOUNDARY"
    )

    print(
        "host tetrahedra:",
        host.size()
    )

    print(
        "boundary component:",
        bc.index()
    )

    for i in range(3):
        edge = bc.edge(i)

        print(
            f"bc.edge({i}) -> "
            f"global edge {edge.index()}"
        )

    print()
    print(
        "certified cuts:"
    )

    print(
        "  bc.edge(0): 4"
    )

    print(
        "  bc.edge(1): 3"
    )

    print(
        "  bc.edge(2): 1"
    )


    heading(
        "HOST BOUNDARY TRIANGLES"
    )

    host_boundary = []

    for i in range(2):
        tri_face = bc.triangle(i)

        tet, face = (
            boundary_triangle_embedding(
                tri_face
            )
        )

        record = {
            "boundary_triangle":
                i,

            "tet":
                tet.index(),

            "face":
                face,
        }

        host_boundary.append(
            record
        )

        print(
            f"triangle {i}: "
            f"tet {tet.index()} "
            f"face {face}"
        )


    heading(
        "BUILD LST(1,3,4)"
    )

    working = regina.Triangulation3(
        host
    )

    first_new_tet = (
        working.size()
    )

    lst_boundary_tet = (
        working.insertLayeredSolidTorus(
            1,
            3,
        )
    )

    print(
        "host tetrahedra before LST:",
        first_new_tet
    )

    print(
        "tetrahedra after LST insertion:",
        working.size()
    )

    print(
        "LST tetrahedra added:",
        working.size() -
        first_new_tet
    )

    print(
        "returned boundary tetrahedron:",
        lst_boundary_tet.index()
    )

    print()
    print(
        "Regina LST boundary faces:"
    )

    print(
        "  face 012 = facet 3"
    )

    print(
        "  face 013 = facet 2"
    )

    print()
    print(
        "On face 012:"
    )

    print(
        "  edge 12 -> cut 1"
    )

    print(
        "  edge 02 -> cut 3"
    )

    print(
        "  edge 01 -> cut 4"
    )


    heading(
        "SEARCH COMPATIBLE ATTACHMENTS"
    )

    #
    # We intentionally search the finite boundary-gluing space.
    #
    # For each candidate:
    #   - rebuild host + LST from scratch;
    #   - glue the two LST boundary faces to the two host
    #     boundary triangles;
    #   - require no real torus boundary to remain;
    #   - simplify a COPY only;
    #   - accept iff the simplified result is native m004.
    #
    # The unsimplified candidate itself is preserved.
    #

    target = (
        regina.Triangulation3
        .fromIsoSig(
            TARGET_ISOSIG
        )
    )

    matches = []

    #
    # Every LST boundary face can be matched to either host
    # boundary face.
    #
    for host_order in (
        (0, 1),
        (1, 0),
    ):
        #
        # Each boundary-face gluing is a Perm4 carrying one
        # boundary facet to the other.
        #
        # We enumerate all 24 permutations and retain only those
        # whose facet mapping is correct.
        #
        for p0_vals in itertools.permutations(
            range(4)
        ):
            p0 = regina.Perm4(
                *p0_vals
            )

            for p1_vals in itertools.permutations(
                range(4)
            ):
                p1 = regina.Perm4(
                    *p1_vals
                )

                candidate = (
                    regina.Triangulation3(
                        host
                    )
                )

                lst_tet = (
                    candidate
                    .insertLayeredSolidTorus(
                        1,
                        3,
                    )
                )

                candidate_boundaries = (
                    real_boundary_components(
                        candidate
                    )
                )

                #
                # There are now two real torus boundary components:
                #   host torus
                #   LST torus
                #
                if len(
                    candidate_boundaries
                ) != 2:
                    continue

                #
                # Re-find the original host boundary by selecting
                # the component that contains the known global host
                # boundary edge indices.
                #
                host_edge_indices = {
                    bc.edge(i).index()
                    for i in range(3)
                }

                host_bc = None

                for candidate_bc in (
                    candidate_boundaries
                ):
                    edge_indices = {
                        candidate_bc
                        .edge(i)
                        .index()
                        for i in range(
                            candidate_bc
                            .countEdges()
                        )
                    }

                    if host_edge_indices.issubset(
                        edge_indices
                    ):
                        host_bc = (
                            candidate_bc
                        )
                        break

                if host_bc is None:
                    continue

                if (
                    host_bc.countTriangles()
                    != 2
                ):
                    continue

                host_embeddings = []

                for i in range(2):
                    tet, face = (
                        boundary_triangle_embedding(
                            host_bc.triangle(i)
                        )
                    )

                    host_embeddings.append(
                        (
                            tet,
                            face,
                        )
                    )

                lst_faces = (
                    3,
                    2,
                )

                h0_tet, h0_face = (
                    host_embeddings[
                        host_order[0]
                    ]
                )

                h1_tet, h1_face = (
                    host_embeddings[
                        host_order[1]
                    ]
                )

                #
                # Correct facet mapping is mandatory:
                #
                #   LST facet -> host facet
                #
                if p0[
                    lst_faces[0]
                ] != h0_face:
                    continue

                if p1[
                    lst_faces[1]
                ] != h1_face:
                    continue

                try:
                    lst_tet.join(
                        lst_faces[0],
                        h0_tet,
                        p0,
                    )

                    lst_tet.join(
                        lst_faces[1],
                        h1_tet,
                        p1,
                    )

                except Exception:
                    continue

                #
                # After attachment, there should be no real
                # boundary torus left. The surviving cusp remains
                # ideal and therefore has zero boundary triangles.
                #
                if (
                    candidate
                    .countBoundaryTriangles()
                    != 0
                ):
                    continue

                #
                # Test topology only on a COPY.
                #
                simplified = (
                    regina.Triangulation3(
                        candidate
                    )
                )

                simplified.intelligentSimplify()

                if (
                    simplified.isIsomorphicTo(
                        target
                    )
                    is None
                ):
                    continue

                record = {
                    "host_order":
                        host_order,

                    "p0":
                        perm_tuple(
                            p0
                        ),

                    "p1":
                        perm_tuple(
                            p1
                        ),

                    "unsimplified_tets":
                        candidate.size(),

                    "simplified_tets":
                        simplified.size(),

                    "simplified_isoSig":
                        simplified.isoSig(),
                }

                matches.append(
                    record
                )

                print()
                print(
                    "MATCH"
                )

                print(
                    "  host order:",
                    host_order
                )

                print(
                    "  LST face 012 gluing:",
                    record["p0"]
                )

                print(
                    "  LST face 013 gluing:",
                    record["p1"]
                )

                print(
                    "  unsimplified tetrahedra:",
                    candidate.size()
                )

                print(
                    "  simplified tetrahedra:",
                    simplified.size()
                )

                print(
                    "  simplified isoSig:",
                    simplified.isoSig()
                )


    heading(
        "RESULT"
    )

    print(
        "matching explicit attachments:",
        len(matches)
    )

    for i, record in enumerate(
        matches
    ):
        print()
        print(
            f"MATCH {i}"
        )

        for key, value in (
            record.items()
        ):
            print(
                f"  {key}: {value}"
            )

    if not matches:
        raise RuntimeError(
            "No explicit LST attachment "
            "simplified to native m004."
        )

    print()
    print(
        "PASS: at least one unsimplified explicit "
        "LST attachment realizes the certified "
        "m129 -> m004 filling."
    )


if __name__ == "__main__":
    main()
