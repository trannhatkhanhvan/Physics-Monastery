import json
import math
from pathlib import Path

import snappy

from snappy.geometric_structure.cusp_neighborhood.complex_cusp_cross_section import (
    ComplexCuspCrossSection,
)

from snappy.snap.t3mlite import simplex


OUT = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/m129_cusp_triangles.json"
)


M = snappy.Manifold("m129")

shapes = M.tetrahedra_shapes("rect")

C = ComplexCuspCrossSection.fromManifoldAndShapes(
    M,
    shapes,
)

C.add_vertex_positions_to_horotriangles()


# ------------------------------------------------------------
# Ensure translations are computed in this SAME Euclidean
# coordinate system as the horotriangle positions.
# ------------------------------------------------------------

if hasattr(
    C,
    "compute_translations"
):
    C.compute_translations()


VERTEX_INDEX = {
    subsimplex: index
    for index, subsimplex
    in enumerate(
        simplex.ZeroSubsimplices
    )
}


def as_float(value):
    return float(value)


def complex_point(z):
    return {
        "re": as_float(z.real),
        "im": as_float(z.imag),
    }


def cyclic_points(values):
    """
    Sort the three Euclidean vertices cyclically around their
    centroid. This gives the frontend a deterministic polygon.
    """
    points = [
        complex(z)
        for z in values
    ]

    cx = sum(
        z.real for z in points
    ) / len(points)

    cy = sum(
        z.imag for z in points
    ) / len(points)

    return sorted(
        points,
        key=lambda z:
            math.atan2(
                z.imag - cy,
                z.real - cx,
            )
    )


# ============================================================
# Face-pair classes
# ============================================================

gluing = (
    M._get_tetrahedra_gluing_data()
)

seen_faces = set()
face_pairs = []


for tet_index, (
    neighbors,
    permutations,
) in enumerate(gluing):

    for face in range(4):
        key = (
            tet_index,
            face,
        )

        if key in seen_faces:
            continue

        neighbor_tet = (
            neighbors[face]
        )

        permutation = (
            permutations[face]
        )

        neighbor_face = (
            permutation[face]
        )

        partner = (
            neighbor_tet,
            neighbor_face,
        )

        pair = tuple(
            sorted(
                [
                    key,
                    partner,
                ]
            )
        )

        face_pairs.append(
            pair
        )

        seen_faces.add(key)
        seen_faces.add(partner)


assert len(face_pairs) == 8


face_to_material = {}

for material_id, pair in enumerate(
    face_pairs
):
    for face_key in pair:
        face_to_material[
            face_key
        ] = material_id


# ============================================================
# Cusp translations in the SAME coordinate system
# ============================================================

cusp_translations = []


for cusp in sorted(
    C.mcomplex.Vertices,
    key=lambda vertex:
        vertex.Index
):
    translations = getattr(
        cusp,
        "Translations",
        None,
    )

    if translations is None:
        # Use the class method directly if the convenience
        # method above was unavailable.
        translations = [
            ComplexCuspCrossSection._get_translation(
                cusp,
                ml,
            )
            for ml in range(2)
        ]

    assert len(translations) == 2

    cusp_translations.append({
        "cusp": cusp.Index,

        "meridian": complex_point(
            translations[0]
        ),

        "longitude": complex_point(
            translations[1]
        ),
    })


# ============================================================
# Exact owned cusp triangles
# ============================================================

triangles = []


for tet in sorted(
    C.mcomplex.Tetrahedra,
    key=lambda tetrahedron:
        tetrahedron.Index
):
    tet_index = tet.Index

    for subsimplex, triangle in (
        tet.horotriangles.items()
    ):
        vertex_index = (
            VERTEX_INDEX[
                subsimplex
            ]
        )

        cusp_index = (
            tet.Class[
                subsimplex
            ].Index
        )

        opposite_face = (
            vertex_index
        )

        material_id = (
            face_to_material[
                (
                    tet_index,
                    opposite_face,
                )
            ]
        )

        ordered_positions = (
            cyclic_points(
                triangle
                    .vertex_positions
                    .values()
            )
        )

        triangles.append({
            "id":
                f"t{tet_index}v{vertex_index}",

            "cusp":
                cusp_index,

            "tetrahedron":
                tet_index,

            "ideal_vertex":
                vertex_index,

            "opposite_face":
                opposite_face,

            "material_id":
                material_id,

            "points": [
                complex_point(z)
                for z in ordered_positions
            ],
        })


triangles.sort(
    key=lambda item: (
        item["cusp"],
        item["tetrahedron"],
        item["ideal_vertex"],
    )
)


# ============================================================
# Certification
# ============================================================

assert len(triangles) == 16

for cusp_index in (0, 1):
    cusp_triangles = [
        triangle
        for triangle in triangles
        if triangle["cusp"] ==
        cusp_index
    ]

    assert len(
        cusp_triangles
    ) == 8


materials_by_cusp = {
    cusp_index:
        sorted({
            triangle[
                "material_id"
            ]
            for triangle
            in triangles
            if triangle["cusp"] ==
            cusp_index
        })
    for cusp_index in (0, 1)
}


assert materials_by_cusp[0] == [
    0, 2, 5, 7
]

assert materials_by_cusp[1] == [
    1, 3, 4, 6
]


# Every material should occur exactly twice.
material_counts = {
    material_id:
        sum(
            1
            for triangle
            in triangles
            if triangle[
                "material_id"
            ] ==
            material_id
        )
    for material_id in range(8)
}


assert all(
    count == 2
    for count
    in material_counts.values()
)


payload = {
    "schema":
        "physics-monastery."
        "3-manifold-surgery-explorer."
        "m129-cusp-triangles.v1",

    "manifold": {
        "id": "m129",

        "display_name":
            "Whitehead link complement",

        "isometry_signature":
            M.isometry_signature(),

        "tetrahedron_count":
            M.num_tetrahedra(),

        "cusp_count":
            M.num_cusps(),
    },

    "face_pair_materials": [
        {
            "material_id":
                material_id,

            "faces": [
                {
                    "tetrahedron":
                        pair[0][0],

                    "face":
                        pair[0][1],
                },

                {
                    "tetrahedron":
                        pair[1][0],

                    "face":
                        pair[1][1],
                },
            ],
        }
        for material_id, pair
        in enumerate(face_pairs)
    ],

    "cusp_translations":
        cusp_translations,

    "materials_by_cusp":
        materials_by_cusp,

    "triangles":
        triangles,
}


OUT.parent.mkdir(
    parents=True,
    exist_ok=True,
)

OUT.write_text(
    json.dumps(
        payload,
        indent=2,
    )
    +
    "\n"
)


print()
print(
    "WROTE:",
    OUT
)

print()
print(
    "isometry signature:",
    payload[
        "manifold"
    ][
        "isometry_signature"
    ]
)

print(
    "triangles:",
    len(triangles)
)

print(
    "cusp 0 materials:",
    materials_by_cusp[0]
)

print(
    "cusp 1 materials:",
    materials_by_cusp[1]
)

print(
    "material counts:",
    material_counts
)

print()
print("translations:")

for record in cusp_translations:
    print(
        f"cusp {record['cusp']}: "
        f"meridian={record['meridian']} "
        f"longitude={record['longitude']}"
    )

print()
print(
    "CERTIFIED: m129 has 16 owned cusp triangles, "
    "8 per cusp, with exact tetrahedron / vertex / "
    "face-pair material ownership"
)
