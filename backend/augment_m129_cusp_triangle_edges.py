import json
from pathlib import Path

import snappy

from snappy.geometric_structure.cusp_neighborhood.complex_cusp_cross_section import (
    ComplexCuspCrossSection,
)

from snappy.snap.t3mlite import simplex


PATH = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/m129_cusp_triangles.json"
)

TOLERANCE = 1e-7


M = snappy.Manifold("m129")

C = ComplexCuspCrossSection.fromManifoldAndShapes(
    M,
    M.tetrahedra_shapes("rect"),
)

C.add_vertex_positions_to_horotriangles()


VERTEX_INDEX = {
    subsimplex: index
    for index, subsimplex
    in enumerate(
        simplex.ZeroSubsimplices
    )
}


def edge_vertex_indices(
    edge_subsimplex
):
    """
    t3m subsimplices are bit masks.

    A tetrahedral edge contains exactly two
    zero-subsimplices / vertices.
    """
    result = [
        index
        for index, vertex
        in enumerate(
            simplex.ZeroSubsimplices
        )
        if (
            edge_subsimplex &
            vertex
        ) == vertex
    ]

    assert len(result) == 2

    return result


payload = json.loads(
    PATH.read_text()
)

triangle_by_id = {
    triangle["id"]: triangle
    for triangle
    in payload["triangles"]
}


matched_points = 0


for tet in C.mcomplex.Tetrahedra:
    tet_index = tet.Index

    for (
        vertex_subsimplex,
        horotriangle,
    ) in tet.horotriangles.items():

        vertex_index = (
            VERTEX_INDEX[
                vertex_subsimplex
            ]
        )

        triangle_id = (
            f"t{tet_index}v{vertex_index}"
        )

        exported = (
            triangle_by_id[
                triangle_id
            ]
        )

        source_corners = [
            {
                "position":
                    complex(position),

                "edge_vertices":
                    edge_vertex_indices(
                        edge_subsimplex
                    ),
            }
            for (
                edge_subsimplex,
                position,
            )
            in horotriangle
                .vertex_positions
                .items()
        ]

        for point in exported["points"]:
            z = complex(
                point["re"],
                point["im"],
            )

            matches = [
                corner
                for corner
                in source_corners
                if abs(
                    corner[
                        "position"
                    ] - z
                ) < TOLERANCE
            ]

            if len(matches) != 1:
                raise RuntimeError(
                    f"{triangle_id}: "
                    f"expected exactly one "
                    f"horotriangle corner for "
                    f"{z}, found {len(matches)}"
                )

            edge_vertices = (
                matches[0][
                    "edge_vertices"
                ]
            )

            if (
                vertex_index
                not in
                edge_vertices
            ):
                raise RuntimeError(
                    f"{triangle_id}: "
                    "corner edge does not "
                    "contain ideal vertex"
                )

            point[
                "edge_vertices"
            ] = edge_vertices

            matched_points += 1


assert len(
    payload["triangles"]
) == 16

assert matched_points == 48

assert all(
    len(
        point.get(
            "edge_vertices",
            []
        )
    ) == 2
    for triangle
    in payload["triangles"]
    for point
    in triangle["points"]
)


PATH.write_text(
    json.dumps(
        payload,
        indent=2,
    )
    +
    "\n"
)


print()
print(
    "PATCH APPLIED: added exact "
    "tetrahedral-edge ownership to "
    "all 48 m129 cusp corners"
)

print(
    "triangles =",
    len(
        payload["triangles"]
    )
)

print(
    "corners certified =",
    matched_points
)
