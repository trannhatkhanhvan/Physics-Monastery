import snappy

from snappy.geometric_structure.cusp_neighborhood.complex_cusp_cross_section import (
    ComplexCuspCrossSection,
)

from snappy.snap.t3mlite import simplex


M = snappy.Manifold("m129")

shapes = M.tetrahedra_shapes("rect")

C = ComplexCuspCrossSection.fromManifoldAndShapes(
    M,
    shapes,
)

C.add_vertex_positions_to_horotriangles()


# ------------------------------------------------------------
# t3m uses subsimplex bitmasks for vertices.
# Build the conversion explicitly rather than assuming values.
# ------------------------------------------------------------

VERTEX_INDEX = {
    vertex: index
    for index, vertex
    in enumerate(
        simplex.ZeroSubsimplices
    )
}


def complex_pair(z):
    return (
        float(z.real()),
        float(z.imag()),
    )


print()
print("M129 EXACT CUSP TRIANGLES")
print("=========================")

triangle_count = 0
cusp_counts = {
    0: 0,
    1: 0,
}


for tet in C.mcomplex.Tetrahedra:
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

        positions = list(
            triangle.vertex_positions.values()
        )

        assert len(positions) == 3

        opposite_face = vertex_index

        print()
        print(
            f"tet {tet_index} "
            f"vertex {vertex_index} "
            f"-> cusp {cusp_index} "
            f"opposite face {opposite_face}"
        )

        for i, position in enumerate(
            positions
        ):
            print(
                f"  p{i} = "
                f"{complex_pair(position)}"
            )

        triangle_count += 1

        cusp_counts[
            cusp_index
        ] += 1


print()
print("SUMMARY")
print("=======")
print(
    "triangles =",
    triangle_count
)

print(
    "cusp 0 triangles =",
    cusp_counts[0]
)

print(
    "cusp 1 triangles =",
    cusp_counts[1]
)


assert triangle_count == 16
assert cusp_counts[0] == 8
assert cusp_counts[1] == 8


# ------------------------------------------------------------
# Compute the actual tetrahedral face-pair classes.
#
# A face is represented by (tetrahedron, face_index).
# Gluing face f of tetrahedron t sends it to one face of the
# neighboring tetrahedron.
# ------------------------------------------------------------

gluing = (
    M._get_tetrahedra_gluing_data()
)

seen = set()
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

        if key in seen:
            continue

        neighbor_tet = (
            neighbors[face]
        )

        permutation = (
            permutations[face]
        )

        # Face f is opposite vertex f.
        # Under the vertex permutation, the opposite vertex goes
        # to permutation[f], hence that is the neighboring face.
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

        seen.add(key)
        seen.add(partner)


print()
print("FACE-PAIR CLASSES")
print("=================")

for index, pair in enumerate(
    face_pairs
):
    print(
        f"pair {index}: "
        f"{pair[0]} <-> {pair[1]}"
    )


print()
print(
    "face-pair count =",
    len(face_pairs)
)

assert len(face_pairs) == 8


print()
print(
    "CERTIFIED: 16 owned cusp triangles, "
    "8 per cusp, and 8 tetrahedral face-pair classes"
)
