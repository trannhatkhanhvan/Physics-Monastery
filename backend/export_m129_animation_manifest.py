import json
from pathlib import Path


TRIANGLES_PATH = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/m129_cusp_triangles.json"
)

CONNECTIVITY_PATH = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/m129_cusp_connectivity.json"
)

OUTPUT_PATH = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/m129_animation_manifest.json"
)


triangles_payload = json.loads(
    TRIANGLES_PATH.read_text()
)

connectivity_payload = json.loads(
    CONNECTIVITY_PATH.read_text()
)


# ============================================================
# Basic manifold certification.
# ============================================================

manifold = triangles_payload[
    "manifold"
]

assert manifold["id"] == "m129"
assert manifold["tetrahedron_count"] == 4
assert manifold["cusp_count"] == 2

triangles = triangles_payload[
    "triangles"
]

assert len(triangles) == 16


# ============================================================
# Global material/color lookup.
# ============================================================

material_colors = {
    int(material_id): record
    for material_id, record
    in connectivity_payload[
        "material_colors"
    ].items()
}


face_lookup = {}

for record in connectivity_payload[
    "face_material_lookup"
]:
    key = (
        record["tetrahedron"],
        record["face"],
    )

    if key in face_lookup:
        raise RuntimeError(
            f"duplicate face assignment {key}"
        )

    face_lookup[key] = record


assert len(face_lookup) == 16


# ============================================================
# Cusp-side lookup.
#
# This tells us which certified colored tetrahedral face
# each of the three sides of a cusp triangle belongs to.
# ============================================================

side_lookup = {}

for cusp_record in connectivity_payload[
    "cusps"
]:
    for side in cusp_record[
        "sides"
    ]:
        key = (
            side["triangle_id"],
            side["side_index"],
        )

        if key in side_lookup:
            raise RuntimeError(
                f"duplicate triangle side {key}"
            )

        side_lookup[key] = side


assert len(side_lookup) == 48


# ============================================================
# Build one permanent triangle identity record.
# ============================================================

animation_triangles = []

for triangle in triangles:
    triangle_id = triangle["id"]

    tet = triangle[
        "tetrahedron"
    ]

    vertex = triangle[
        "ideal_vertex"
    ]

    cusp = triangle[
        "cusp"
    ]

    opposite_face = triangle[
        "opposite_face"
    ]

    material_id = triangle[
        "material_id"
    ]

    face_record = face_lookup[
        (
            tet,
            opposite_face,
        )
    ]

    if (
        face_record["material_id"]
        != material_id
    ):
        raise RuntimeError(
            f"{triangle_id}: triangle material "
            "does not match opposite-face material"
        )

    color_record = material_colors[
        material_id
    ]

    sides = []

    for side_index in range(3):
        source = side_lookup[
            (
                triangle_id,
                side_index,
            )
        ]

        sides.append({
            "side_index":
                side_index,

            "corner_indices":
                source[
                    "corner_indices"
                ],

            "tetrahedral_face":
                source["face"],

            "material_id":
                source[
                    "material_id"
                ],

            "color_name":
                source[
                    "color_name"
                ],

            "color_hex":
                source[
                    "color_hex"
                ],
        })

    animation_triangles.append({
        "id":
            triangle_id,

        "cusp":
            cusp,

        "tetrahedron":
            tet,

        "ideal_vertex":
            vertex,

        # On a truncated tetrahedron, this is exactly the
        # corner/truncation face where the cusp triangle lands.
        "cells_destination": {
            "tetrahedron":
                tet,

            "ideal_vertex":
                vertex,
        },

        "opposite_face":
            opposite_face,

        "material_id":
            material_id,

        "fill_color_name":
            color_record[
                "name"
            ],

        "fill_color_hex":
            color_record[
                "hex"
            ],

        # Preserve the certified correspondence between each
        # horotriangle corner and a tetrahedral edge.
        "corners": [
            {
                "corner_index":
                    corner_index,

                "edge_vertices":
                    point[
                        "edge_vertices"
                    ],
            }
            for corner_index, point
            in enumerate(
                triangle["points"]
            )
        ],

        "sides":
            sides,
    })


# ============================================================
# Certify tetrahedron ownership:
#
# Every ideal tetrahedron must receive exactly four cusp
# triangles, one at each ideal vertex 0,1,2,3.
# ============================================================

tetrahedra = []

for tet in range(4):
    owned = sorted(
        (
            triangle
            for triangle in animation_triangles
            if triangle[
                "tetrahedron"
            ] == tet
        ),
        key=lambda record:
            record[
                "ideal_vertex"
            ],
    )

    assert len(owned) == 4

    vertices = [
        record[
            "ideal_vertex"
        ]
        for record in owned
    ]

    assert vertices == [
        0, 1, 2, 3
    ]

    faces = []

    for face in range(4):
        face_record = face_lookup[
            (
                tet,
                face,
            )
        ]

        faces.append({
            "face":
                face,

            "material_id":
                face_record[
                    "material_id"
                ],

            "color_name":
                face_record[
                    "color_name"
                ],

            "color_hex":
                face_record[
                    "color_hex"
                ],
        })

    tetrahedra.append({
        "tetrahedron":
            tet,

        "truncation_triangles": [
            {
                "triangle_id":
                    record["id"],

                "cusp":
                    record["cusp"],

                "ideal_vertex":
                    record[
                        "ideal_vertex"
                    ],
            }
            for record in owned
        ],

        "faces":
            faces,
    })


# ============================================================
# Preserve the 8 global tetrahedral face-pair classes.
# ============================================================

face_pairs = []

for material in sorted(
    triangles_payload[
        "face_pair_materials"
    ],
    key=lambda record:
        record["material_id"],
):
    material_id = material[
        "material_id"
    ]

    color = material_colors[
        material_id
    ]

    assert len(
        material["faces"]
    ) == 2

    face_pairs.append({
        "material_id":
            material_id,

        "color_name":
            color["name"],

        "color_hex":
            color["hex"],

        "faces":
            material["faces"],
    })


assert len(face_pairs) == 8


# ============================================================
# Cusp membership audit.
# ============================================================

cusps = []

for cusp_index in range(2):
    owned = sorted(
        (
            triangle
            for triangle
            in animation_triangles
            if triangle[
                "cusp"
            ] == cusp_index
        ),
        key=lambda record: (
            record[
                "tetrahedron"
            ],
            record[
                "ideal_vertex"
            ],
        ),
    )

    assert len(owned) == 8

    cusps.append({
        "cusp":
            cusp_index,

        "role":
            (
                "surviving-knot"
                if cusp_index == 0
                else "crossing-circle"
            ),

        "triangle_ids": [
            record["id"]
            for record in owned
        ],
    })


# ============================================================
# Final manifest.
# ============================================================

output = {
    "schema":
        "physics-monastery."
        "3-manifold-surgery-explorer."
        "m129-animation-manifest.v1",

    "manifold": {
        "id":
            manifold["id"],

        "display_name":
            manifold[
                "display_name"
            ],

        "isometry_signature":
            manifold[
                "isometry_signature"
            ],

        "tetrahedron_count":
            manifold[
                "tetrahedron_count"
            ],

        "cusp_count":
            manifold[
                "cusp_count"
            ],
    },

    "invariants": {
        "triangle_count":
            16,

        "triangles_per_cusp":
            8,

        "triangles_per_tetrahedron":
            4,

        "face_pair_count":
            8,

        "persistent_identity_rule":
            (
                "cusp triangle t{tetrahedron}v{ideal_vertex} "
                "lands on the truncation face at that same "
                "tetrahedron / ideal vertex"
            ),
    },

    "cusps":
        cusps,

    "tetrahedra":
        tetrahedra,

    "face_pairs":
        face_pairs,

    "triangles":
        animation_triangles,
}


OUTPUT_PATH.write_text(
    json.dumps(
        output,
        indent=2,
    )
    +
    "\n"
)


# ============================================================
# Human-readable audit.
# ============================================================

print()
print("M129 ANIMATION MANIFEST")
print("=======================")

print()
print(
    "manifold:",
    output["manifold"]["id"],
    output["manifold"][
        "isometry_signature"
    ],
)

print(
    "tetrahedra:",
    len(tetrahedra)
)

print(
    "cusps:",
    len(cusps)
)

print(
    "triangles:",
    len(animation_triangles)
)

print(
    "face pairs:",
    len(face_pairs)
)


print()
print("TRIANGLE -> CELLS DESTINATION")
print("=============================")

for record in sorted(
    animation_triangles,
    key=lambda item: (
        item["tetrahedron"],
        item["ideal_vertex"],
    ),
):
    print(
        f"{record['id']:5s}  "
        f"cusp {record['cusp']}  ->  "
        f"tet {record['tetrahedron']}  "
        f"vertex {record['ideal_vertex']}  "
        f"{record['fill_color_name']}"
    )


print()
print("TETRAHEDRON OWNERSHIP")
print("=====================")

for record in tetrahedra:
    destinations = ", ".join(
        item["triangle_id"]
        for item
        in record[
            "truncation_triangles"
        ]
    )

    print(
        f"tet {record['tetrahedron']}: "
        f"{destinations}"
    )


print()
print(
    "WROTE:",
    OUTPUT_PATH
)

print()
print(
    "CERTIFIED: all 16 cusp triangles have one unique "
    "tetrahedron/ideal-vertex destination; every tetrahedron "
    "receives exactly vertices 0,1,2,3; all 8 global "
    "face-pair classes are preserved"
)
