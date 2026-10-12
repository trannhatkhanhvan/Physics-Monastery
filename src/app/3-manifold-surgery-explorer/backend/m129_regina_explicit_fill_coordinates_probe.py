#!/usr/bin/env python3

from pathlib import Path
import itertools
import math

import regina


HERE = Path(__file__).resolve().parent

INPUT = (
    HERE /
    "m129_marked.snappea"
)

TARGET_ISOSIG = "cPcbbbiht"

FILLED_CUSP = 1

MAX_CUT = 12


def heading(text):
    print()
    print("=" * 72)
    print(text)
    print("=" * 72)


def summary(label, tri):
    print()
    print(label)
    print("-" * 40)

    print(
        "tetrahedra:",
        tri.size()
    )

    print(
        "vertices:",
        tri.countVertices()
    )

    print(
        "ideal:",
        tri.isIdeal()
    )

    print(
        "boundary components:",
        tri.countBoundaryComponents()
    )

    print(
        "boundary triangles:",
        tri.countBoundaryTriangles()
    )

    print(
        "isoSig:",
        tri.isoSig()
    )


def primitive_triples(max_cut):
    """
    Regina fillTorus requires:
      - gcd(c0,c1,c2) = 1
      - two entries sum to the third.

    Enumerate unordered primitive triples first,
    then test every edge ordering separately.
    """

    triples = set()

    for a in range(
        0,
        max_cut + 1
    ):
        for b in range(
            a,
            max_cut + 1
        ):
            if math.gcd(
                a,
                b
            ) != 1:
                continue

            c = a + b

            if c > max_cut:
                continue

            triples.add(
                (
                    a,
                    b,
                    c,
                )
            )

    return sorted(
        triples
    )


def main():
    heading(
        "m129 EXPLICIT DEHN-FILL "
        "COORDINATES PROBE"
    )

    snap = regina.SnapPeaTriangulation(
        INPUT.read_text()
    )

    print(
        "marked SnapPea cusps:",
        snap.countCusps()
    )

    print(
        "cusp 0:",
        snap.cusp(0)
    )

    print(
        "cusp 1:",
        snap.cusp(1)
    )

    #
    # Critical point:
    #
    # SnapPea cusp number need not equal Regina vertex number.
    # Use the actual cusp->vertex map.
    #
    filled_vertex = (
        snap
        .cusp(FILLED_CUSP)
        .vertex()
    )

    filled_vertex_index = (
        filled_vertex.index()
    )

    print()
    print(
        "filled cusp:",
        FILLED_CUSP
    )

    print(
        "corresponding Regina ideal vertex:",
        filled_vertex_index
    )


    heading(
        "TRUNCATE ONLY THE FILLED CUSP"
    )

    tri = regina.Triangulation3(
        snap
    )

    summary(
        "BEFORE TRUNCATION",
        tri
    )

    #
    # The native copy has the same vertex indexing at this point.
    #
    vertex = tri.vertex(
        filled_vertex_index
    )

    tri.truncate(
        vertex
    )

    summary(
        "AFTER CUSP-1 TRUNCATION",
        tri
    )


    heading(
        "REAL BOUNDARY COMPONENTS"
    )

    for index in range(
        tri.countBoundaryComponents()
    ):
        bc = tri.boundaryComponent(
            index
        )

        print()
        print(
            f"boundary {index}"
        )

        print(
            "  triangles:",
            bc.countTriangles()
        )

        print(
            "  edges:",
            bc.countEdges()
        )

        print(
            "  vertices:",
            bc.countVertices()
        )

        print(
            "  Euler:",
            bc.eulerChar()
        )


    heading(
        "MINIMISE THE REAL TORUS BOUNDARY"
    )

    changed = tri.minimiseBoundary()

    print(
        "minimiseBoundary changed:",
        changed
    )

    summary(
        "AFTER minimiseBoundary()",
        tri
    )

    #
    # Regina still reports the surviving ideal cusp as a boundary
    # component, but it has zero real boundary triangles.
    #
    # The filled cusp is the unique REAL boundary component:
    #
    #     countTriangles() > 0
    #
    real_boundary_components = [
        tri.boundaryComponent(index)
        for index in range(
            tri.countBoundaryComponents()
        )
        if (
            tri.boundaryComponent(
                index
            ).countTriangles() > 0
        )
    ]

    print()
    print(
        "real boundary components:",
        len(real_boundary_components)
    )

    if len(real_boundary_components) != 1:
        raise RuntimeError(
            "Expected exactly one real torus boundary "
            "after truncating only filled cusp 1; "
            f"found {len(real_boundary_components)}."
        )

    bc = real_boundary_components[0]

    print()
    print(
        "selected real boundary component index:",
        bc.index()
    )

    print(
        "boundary triangles:",
        bc.countTriangles()
    )

    print(
        "boundary edges:",
        bc.countEdges()
    )

    print(
        "boundary vertices:",
        bc.countVertices()
    )

    if (
        bc.countTriangles() != 2 or
        bc.countEdges() != 3
    ):
        raise RuntimeError(
            "Boundary minimisation did not produce "
            "the required two-triangle torus."
        )


    heading(
        "TWO-TRIANGLE TORUS EDGE DATA"
    )

    for i in range(3):
        edge = bc.edge(i)

        print(
            f"bc.edge({i}) -> "
            f"global edge {edge.index()}, "
            f"degree {edge.degree()}"
        )


    heading(
        "SEARCH PRIMITIVE FILLING CUTS"
    )

    target = (
        regina.Triangulation3
        .fromIsoSig(
            TARGET_ISOSIG
        )
    )

    matches = []

    triples = primitive_triples(
        MAX_CUT
    )

    tested = 0

    for triple in triples:
        #
        # Edge order matters.
        #
        for ordered in set(
            itertools.permutations(
                triple
            )
        ):
            candidate = (
                regina.Triangulation3(
                    tri
                )
            )

            candidate_real_boundaries = [
                candidate.boundaryComponent(index)
                for index in range(
                    candidate.countBoundaryComponents()
                )
                if (
                    candidate.boundaryComponent(
                        index
                    ).countTriangles() > 0
                )
            ]

            if len(
                candidate_real_boundaries
            ) != 1:
                continue

            candidate_bc = (
                candidate_real_boundaries[0]
            )

            ok = candidate.fillTorus(
                ordered[0],
                ordered[1],
                ordered[2],
                candidate_bc,
            )

            if not ok:
                continue

            tested += 1

            isomorphism = (
                candidate.isIsomorphicTo(
                    target
                )
            )

            if isomorphism is None:
                continue

            record = {
                "cuts":
                    ordered,

                "tetrahedra":
                    candidate.size(),

                "isoSig":
                    candidate.isoSig(),
            }

            matches.append(
                record
            )

            print()
            print(
                "MATCH"
            )

            print(
                "  cuts:",
                ordered
            )

            print(
                "  tetrahedra after fillTorus:",
                candidate.size()
            )

            print(
                "  isoSig:",
                candidate.isoSig()
            )


    heading(
        "RESULT"
    )

    print(
        "tested successful fillTorus calls:",
        tested
    )

    print(
        "m004 matches:",
        len(matches)
    )

    for index, match in enumerate(
        matches
    ):
        print(
            f"{index}: "
            f"cuts={match['cuts']} "
            f"tetrahedra={match['tetrahedra']} "
            f"isoSig={match['isoSig']}"
        )

    if not matches:
        raise RuntimeError(
            "No primitive boundary cut triple up to "
            f"{MAX_CUT} produced native m004."
        )

    print()
    print(
        "PASS: the certified filling slope has now "
        "been located in the explicit two-triangle "
        "boundary-edge coordinates."
    )


if __name__ == "__main__":
    main()
