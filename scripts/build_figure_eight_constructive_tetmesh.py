#!/usr/bin/env python3

import json
import math
import sys
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import tetgen


SOURCE_URL = (
    "http://localhost:3000/"
    "api/figure-eight-complement/"
    "constructive-surface"
)

OUTPUT_PATH = Path(
    "public/geometry/"
    "figure-eight-complement/"
    "m004-constructive-tetmesh-r3.json"
)

BOUNDARY_TOLERANCE = 1e-9
DEGENERATE_TOLERANCE = 1e-13


def fail(message):
    raise RuntimeError(message)


def fetch_surface():
    print("Fetching certified figure-eight complement surface...")

    try:
        with urllib.request.urlopen(
            SOURCE_URL,
            timeout=30,
        ) as response:
            data = json.load(response)

    except urllib.error.URLError as error:
        fail(
            "Could not reach the local constructive-surface API. "
            "Keep the Next.js dev server running. "
            f"Underlying error: {error}"
        )

    if not data.get("valid", False):
        fail(
            "Constructive surface is not certified valid."
        )

    return data


def normalize_tet_indices(
    tetrahedra,
    node_count,
):
    tetrahedra = np.asarray(
        tetrahedra,
        dtype=np.int64,
    )

    if (
        tetrahedra.ndim != 2
        or tetrahedra.shape[1] != 4
    ):
        fail(
            "Unexpected tetrahedron array shape: "
            f"{tetrahedra.shape}"
        )

    minimum = int(
        tetrahedra.min()
    )

    maximum = int(
        tetrahedra.max()
    )


    if (
        minimum == 0
        and maximum < node_count
    ):
        return tetrahedra


    if (
        minimum == 1
        and maximum == node_count
    ):
        return tetrahedra - 1


    fail(
        "Unexpected TetGen indexing: "
        f"min={minimum}, "
        f"max={maximum}, "
        f"nodes={node_count}"
    )


def signed_volume6(
    points,
    tetrahedron,
):
    a, b, c, d = points[
        np.asarray(
            tetrahedron,
            dtype=np.int64,
        )
    ]

    return float(
        np.linalg.det(
            np.column_stack(
                (
                    b - a,
                    c - a,
                    d - a,
                )
            )
        )
    )


def orient_tetrahedra(
    points,
    tetrahedra,
):
    result = np.array(
        tetrahedra,
        dtype=np.int64,
        copy=True,
    )

    degenerate_count = 0
    flipped_count = 0
    minimum_abs_volume6 = math.inf
    total_volume = 0.0


    for index in range(
        len(result)
    ):
        determinant = signed_volume6(
            points,
            result[index],
        )

        absolute = abs(
            determinant
        )


        if not math.isfinite(
            determinant
        ):
            degenerate_count += 1
            continue


        minimum_abs_volume6 = min(
            minimum_abs_volume6,
            absolute,
        )


        if (
            absolute <=
            DEGENERATE_TOLERANCE
        ):
            degenerate_count += 1
            continue


        if determinant < 0:
            result[
                index,
                0
            ], result[
                index,
                1
            ] = (
                result[
                    index,
                    1
                ],
                result[
                    index,
                    0
                ],
            )

            flipped_count += 1


        total_volume += (
            absolute /
            6.0
        )


    return (
        result,
        degenerate_count,
        flipped_count,
        minimum_abs_volume6,
        total_volume,
    )


def tetrahedron_faces(
    tetrahedron
):
    a, b, c, d = map(
        int,
        tetrahedron,
    )

    return (
        tuple(sorted((a, b, c))),
        tuple(sorted((a, b, d))),
        tuple(sorted((a, c, d))),
        tuple(sorted((b, c, d))),
    )


def tetrahedron_edges(
    tetrahedron
):
    a, b, c, d = map(
        int,
        tetrahedron,
    )

    return (
        tuple(sorted((a, b))),
        tuple(sorted((a, c))),
        tuple(sorted((a, d))),
        tuple(sorted((b, c))),
        tuple(sorted((b, d))),
        tuple(sorted((c, d))),
    )


def audit_complex(
    node_count,
    tetrahedra,
):
    face_counter = Counter()
    face_cells = defaultdict(list)
    edges = set()


    for cell_index, tetrahedron in enumerate(
        tetrahedra
    ):
        for face in tetrahedron_faces(
            tetrahedron
        ):
            face_counter[
                face
            ] += 1

            face_cells[
                face
            ].append(
                cell_index
            )


        edges.update(
            tetrahedron_edges(
                tetrahedron
            )
        )


    boundary_faces = {
        face
        for face, count
        in face_counter.items()
        if count == 1
    }


    nonmanifold_face_count = sum(
        1
        for count
        in face_counter.values()
        if count not in (
            1,
            2,
        )
    )


    boundary_vertices = set()
    boundary_edges = set()


    for a, b, c in boundary_faces:
        boundary_vertices.update(
            (
                a,
                b,
                c,
            )
        )

        boundary_edges.update(
            (
                tuple(sorted((a, b))),
                tuple(sorted((b, c))),
                tuple(sorted((c, a))),
            )
        )


    adjacency = [
        set()
        for _ in range(
            len(tetrahedra)
        )
    ]


    for cells in face_cells.values():
        if len(cells) == 2:
            first, second = cells

            adjacency[
                first
            ].add(
                second
            )

            adjacency[
                second
            ].add(
                first
            )


    seen = set()
    component_count = 0


    for seed in range(
        len(tetrahedra)
    ):
        if seed in seen:
            continue

        component_count += 1

        stack = [
            seed
        ]

        seen.add(
            seed
        )


        while stack:
            current = stack.pop()

            for neighbor in adjacency[
                current
            ]:
                if neighbor in seen:
                    continue

                seen.add(
                    neighbor
                )

                stack.append(
                    neighbor
                )


    face_count = len(
        face_counter
    )


    volume_euler = (
        node_count
        -
        len(edges)
        +
        face_count
        -
        len(tetrahedra)
    )


    boundary_euler = (
        len(boundary_vertices)
        -
        len(boundary_edges)
        +
        len(boundary_faces)
    )


    return {
        "edgeCount":
            len(edges),

        "faceCount":
            face_count,

        "boundaryFaces":
            boundary_faces,

        "boundaryVertexCount":
            len(boundary_vertices),

        "boundaryEdgeCount":
            len(boundary_edges),

        "boundaryFaceCount":
            len(boundary_faces),

        "nonmanifoldFaceCount":
            nonmanifold_face_count,

        "connectedComponentCount":
            component_count,

        "volumeEulerCharacteristic":
            volume_euler,

        "boundaryEulerCharacteristic":
            boundary_euler,
    }


def coordinate_key(
    point
):
    return tuple(
        int(
            round(
                float(value) /
                BOUNDARY_TOLERANCE
            )
        )
        for value in point
    )


def map_input_vertices(
    input_points,
    output_points,
):
    lookup = defaultdict(
        list
    )


    for index, point in enumerate(
        output_points
    ):
        lookup[
            coordinate_key(
                point
            )
        ].append(
            index
        )


    mapping = np.full(
        len(input_points),
        -1,
        dtype=np.int64,
    )

    maximum_error = 0.0
    missing_count = 0


    for input_index, point in enumerate(
        input_points
    ):
        candidates = lookup.get(
            coordinate_key(
                point
            ),
            [],
        )

        best_index = -1
        best_error = math.inf


        for candidate in candidates:
            error = float(
                np.linalg.norm(
                    output_points[
                        candidate
                    ] -
                    point
                )
            )

            if error < best_error:
                best_error = error
                best_index = candidate


        if (
            best_index < 0
            or best_error >
                BOUNDARY_TOLERANCE
        ):
            missing_count += 1
            continue


        mapping[
            input_index
        ] = best_index


        maximum_error = max(
            maximum_error,
            best_error,
        )


    return (
        mapping,
        maximum_error,
        missing_count,
    )


def map_input_faces(
    input_faces,
    mapping,
):
    result = set()


    for face in input_faces:
        mapped = [
            int(
                mapping[
                    int(vertex)
                ]
            )
            for vertex in face
        ]


        if any(
            vertex < 0
            for vertex in mapped
        ):
            continue


        result.add(
            tuple(
                sorted(
                    mapped
                )
            )
        )


    return result


def main():
    surface = fetch_surface()


    input_points = np.asarray(
        surface[
            "vertices"
        ],
        dtype=np.float64,
    )

    input_faces = np.asarray(
        surface[
            "faces"
        ],
        dtype=np.int32,
    )


    print()
    print("Certified projected boundary:")
    print(
        f"  vertices:  "
        f"{len(input_points)}"
    )
    print(
        f"  triangles: "
        f"{len(input_faces)}"
    )
    print(
        "  bounded complement: "
        f"{surface['summary']['boundedComplementCertified']}"
    )


    print()
    print(
        "Running topology-first "
        "TetGen tetrahedralization..."
    )
    print(
        "  boundary modification: OFF"
    )
    print(
        "  quality refinement:     OFF"
    )
    print()


    tetrahedralizer = tetgen.TetGen(
        input_points,
        input_faces,
    )


    result = (
        tetrahedralizer
        .tetrahedralize(
            plc=True,
            nobisect=True,
            quality=False,
            facesout=True,
            edgesout=True,
            docheck=True,
            quiet=False,
            verbose=1,
        )
    )


    if (
        not isinstance(
            result,
            tuple
        )
        or len(result) < 2
    ):
        fail(
            "Unexpected TetGen return value."
        )


    nodes = np.asarray(
        result[0],
        dtype=np.float64,
    )


    tetrahedra = (
        normalize_tet_indices(
            result[1],
            len(nodes),
        )
    )


    (
        tetrahedra,
        degenerate_count,
        flipped_count,
        minimum_abs_volume6,
        total_volume,
    ) = orient_tetrahedra(
        nodes,
        tetrahedra,
    )


    complex_audit = (
        audit_complex(
            len(nodes),
            tetrahedra,
        )
    )


    (
        boundary_mapping,
        maximum_boundary_error,
        missing_boundary_vertices,
    ) = map_input_vertices(
        input_points,
        nodes,
    )


    expected_boundary_faces = (
        map_input_faces(
            input_faces,
            boundary_mapping,
        )
    )


    observed_boundary_faces = (
        complex_audit[
            "boundaryFaces"
        ]
    )


    missing_boundary_faces = len(
        expected_boundary_faces
        -
        observed_boundary_faces
    )


    unexpected_boundary_faces = len(
        observed_boundary_faces
        -
        expected_boundary_faces
    )


    summary = {
        "tetgenVersion":
            getattr(
                tetgen,
                "__version__",
                "unknown"
            ),

        "vertexCount":
            len(nodes),

        "interiorVertexCount":
            len(nodes)
            -
            len(input_points),

        "edgeCount":
            complex_audit[
                "edgeCount"
            ],

        "faceCount":
            complex_audit[
                "faceCount"
            ],

        "cellCount":
            len(tetrahedra),

        "boundaryVertexCount":
            complex_audit[
                "boundaryVertexCount"
            ],

        "boundaryEdgeCount":
            complex_audit[
                "boundaryEdgeCount"
            ],

        "boundaryFaceCount":
            complex_audit[
                "boundaryFaceCount"
            ],

        "missingBoundaryVertexCount":
            missing_boundary_vertices,

        "maximumBoundaryVertexError":
            maximum_boundary_error,

        "missingBoundaryFaceCount":
            missing_boundary_faces,

        "unexpectedBoundaryFaceCount":
            unexpected_boundary_faces,

        "nonmanifoldFaceCount":
            complex_audit[
                "nonmanifoldFaceCount"
            ],

        "connectedComponentCount":
            complex_audit[
                "connectedComponentCount"
            ],

        "volumeEulerCharacteristic":
            complex_audit[
                "volumeEulerCharacteristic"
            ],

        "boundaryEulerCharacteristic":
            complex_audit[
                "boundaryEulerCharacteristic"
            ],

        "degenerateCellCount":
            degenerate_count,

        "tetrahedraReorientedCount":
            flipped_count,

        "minimumAbsoluteVolume6":
            minimum_abs_volume6,

        "totalEuclideanVolume":
            total_volume,
    }


    valid = (
        summary[
            "boundaryVertexCount"
        ] ==
            len(input_points)
        and
        summary[
            "boundaryFaceCount"
        ] ==
            len(input_faces)
        and
        summary[
            "missingBoundaryVertexCount"
        ] == 0
        and
        summary[
            "missingBoundaryFaceCount"
        ] == 0
        and
        summary[
            "unexpectedBoundaryFaceCount"
        ] == 0
        and
        summary[
            "nonmanifoldFaceCount"
        ] == 0
        and
        summary[
            "connectedComponentCount"
        ] == 1
        and
        summary[
            "volumeEulerCharacteristic"
        ] == 0
        and
        summary[
            "boundaryEulerCharacteristic"
        ] == 0
        and
        summary[
            "degenerateCellCount"
        ] == 0
    )


    print()
    print(
        "Constructive TetGen audit:"
    )


    for key, value in summary.items():
        print(
            f"  {key}: {value}"
        )


    if not valid:
        print()
        print(
            "CONSTRUCTIVE TETMESH: FAIL"
        )

        sys.exit(
            2
        )


    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )


    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "valid":
                    True,

                "method":
                    (
                        "certified bounded "
                        "figure-eight complement "
                        "tetrahedralized directly "
                        "in stereographic R3"
                    ),

                "vertices3":
                    nodes.tolist(),

                "tetrahedra":
                    tetrahedra.tolist(),

                "boundaryInputToVolumeVertex":
                    boundary_mapping.tolist(),

                "pole4":
                    surface[
                        "pole4"
                    ],

                "projectionBasis4":
                    surface[
                        "projectionBasis4"
                    ],

                "summary":
                    summary,
            },

            separators=(
                ",",
                ":"
            ),
        )
    )


    print()
    print(
        "CONSTRUCTIVE TETMESH: PASS"
    )
    print(
        f"Saved: {OUTPUT_PATH}"
    )


if __name__ == "__main__":
    main()
