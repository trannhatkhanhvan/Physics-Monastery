#!/usr/bin/env python3

from pathlib import Path
import inspect

import regina


HERE = Path(__file__).resolve().parent

INPUT = (
    HERE /
    "m129_marked.snappea"
)


def heading(text):
    print()
    print("=" * 72)
    print(text)
    print("=" * 72)


def describe(obj, name):
    method = getattr(
        obj,
        name,
        None
    )

    print()
    print(name)
    print("-" * 40)

    if method is None:
        print("MISSING")
        return

    try:
        sig = inspect.signature(
            method
        )
    except Exception:
        sig = "(signature unavailable)"

    print(
        "signature:",
        sig
    )

    print()
    print(
        getattr(
            method,
            "__doc__",
            None
        )
    )


def triangulation_summary(
    label,
    tri,
):
    print()
    print(label)
    print("-" * 40)

    print(
        "type:",
        type(tri)
    )

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

    if isinstance(
        tri,
        regina.SnapPeaTriangulation
    ):
        print(
            "cusps:",
            tri.countCusps()
        )

        print(
            "complete cusps:",
            tri.countCompleteCusps()
        )

        print(
            "filled cusps:",
            tri.countFilledCusps()
        )

        for i in range(
            tri.countCusps()
        ):
            print(
                f"cusp {i}:",
                tri.cusp(i)
            )


def main():
    heading(
        "REGINA m129 PARTIAL-FILL PROBE"
    )

    snap = regina.SnapPeaTriangulation(
        INPUT.read_text()
    )

    triangulation_summary(
        "ORIGINAL MARKED m129",
        snap
    )


    heading(
        "RELEVANT API"
    )

    for name in (
        "fill",
        "filledPartial",
        "filledAll",
        "retriangulate",
    ):
        describe(
            snap,
            name
        )


    heading(
        "MARK CUSP 1 WITH CERTIFIED "
        "SNAPPEA SLOPE (1,1)"
    )

    ok = snap.fill(
        1,
        1,
        1
    )

    print(
        "fill returned:",
        ok
    )

    triangulation_summary(
        "MARKED m129 AFTER fill(1,1,1)",
        snap
    )


    heading(
        "PERMANENT PARTIAL FILL"
    )

    partial = (
        snap.filledPartial()
    )

    triangulation_summary(
        "filledPartial() RESULT",
        partial
    )


    heading(
        "COMPARE WITH NATIVE m004"
    )

    m004 = (
        regina.Triangulation3
        .fromIsoSig(
            "cPcbbbiht"
        )
    )

    triangulation_summary(
        "NATIVE m004",
        m004
    )

    print()
    print(
        "isomorphic to native m004:",
        partial.isIsomorphicTo(
            m004
        ) is not None
    )


    heading(
        "GLUING TABLE: PARTIAL FILL"
    )

    for tet_index in range(
        partial.size()
    ):
        tet = partial.tetrahedron(
            tet_index
        )

        print()
        print(
            f"tetrahedron {tet_index}"
        )

        for face in range(4):
            adj = tet.adjacentTetrahedron(
                face
            )

            perm = tet.adjacentGluing(
                face
            )

            print(
                f"  face {face}: "
                f"tet "
                f"{adj.index() if adj else None}, "
                f"perm {perm}"
            )


    heading(
        "RESULT"
    )

    print(
        "original tetrahedra:",
        4
    )

    print(
        "partial-fill tetrahedra:",
        partial.size()
    )

    print(
        "target tetrahedra:",
        2
    )

    if (
        partial.size() == 2 and
        partial.isoSig() ==
        "cPcbbbiht"
    ):
        print()
        print(
            "Regina's filledPartial() collapses "
            "directly to the native two-tet m004."
        )

        print(
            "Therefore it does NOT expose the "
            "retriangulation history we need "
            "for animation."
        )

    else:
        print()
        print(
            "Regina returned a nontrivial "
            "intermediate filled triangulation."
        )

        print(
            "This may give us the explicit "
            "starting point for a recorded "
            "Pachner reduction."
        )


if __name__ == "__main__":
    main()
