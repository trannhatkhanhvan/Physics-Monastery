import snappy


M = snappy.Manifold("m129")

gluing = M._get_tetrahedra_gluing_data()

cusp_indices, peripheral_data = (
    M._get_cusp_indices_and_peripheral_curve_data()
)


# ------------------------------------------------------------
# Compute ideal-vertex equivalence classes directly from
# tetrahedron face gluings.
# ------------------------------------------------------------

n_tets = M.num_tetrahedra()

parent = list(
    range(4 * n_tets)
)


def node(tet, vertex):
    return 4 * tet + vertex


def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]

    return x


def union(a, b):
    a = find(a)
    b = find(b)

    if a != b:
        parent[b] = a


for tet_index, tet_data in enumerate(
    gluing
):
    neighbors, permutations = tet_data

    for face in range(4):
        neighbor = neighbors[face]
        permutation = permutations[face]

        # Only the three vertices lying in this face
        # are identified across the face gluing.
        for vertex in range(4):
            if vertex == face:
                continue

            union(
                node(
                    tet_index,
                    vertex
                ),
                node(
                    neighbor,
                    permutation[vertex]
                )
            )


groups = {}

for tet in range(n_tets):
    for vertex in range(4):
        root = find(
            node(
                tet,
                vertex
            )
        )

        groups.setdefault(
            root,
            []
        ).append(
            (tet, vertex)
        )


computed_orbits = sorted(
    groups.values(),
    key=lambda orbit:
        orbit[0],
)


# ------------------------------------------------------------
# Read SnapPy's internal cusp-index assignment.
# ------------------------------------------------------------

internal_orbits = []

for cusp_index in range(
    M.num_cusps()
):
    orbit = []

    for tet in range(n_tets):
        for vertex in range(4):
            if (
                cusp_indices[tet][vertex]
                ==
                cusp_index
            ):
                orbit.append(
                    (tet, vertex)
                )

    internal_orbits.append(
        orbit
    )


print()
print("M129 CUSP VERTEX ORBIT VERIFICATION")
print("===================================")

print()
print("SnapPy cusp-index table:")

for tet, row in enumerate(
    cusp_indices
):
    print(
        f"tet {tet}: {row}"
    )


print()
print("Orbits computed from face gluings:")

for index, orbit in enumerate(
    computed_orbits
):
    print(
        f"orbit {index}: {orbit}"
    )


print()
print("Orbits from SnapPy cusp indices:")

for index, orbit in enumerate(
    internal_orbits
):
    print(
        f"cusp {index}: {orbit}"
    )


computed_sets = {
    frozenset(orbit)
    for orbit in computed_orbits
}

internal_sets = {
    frozenset(orbit)
    for orbit in internal_orbits
}

assert (
    computed_sets ==
    internal_sets
), (
    "FAILED: face-gluing orbits do not "
    "match SnapPy cusp-index assignment"
)

print()
print(
    "CERTIFIED: face-gluing vertex orbits "
    "match SnapPy cusp indices exactly"
)
