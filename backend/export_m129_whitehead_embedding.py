import json
from pathlib import Path

import networkx as nx


SOURCE = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/"
    "m129_whitehead_combinatorics.json"
)

OUTPUT = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/"
    "m129_whitehead_embedding.json"
)

EXPECTED_SIGNATURE = "eLPkbdcddhgggb"

EXPECTED_PD = [
    [6, 5, 7, 0],
    [0, 3, 1, 4],
    [8, 2, 9, 1],
    [2, 8, 3, 7],
    [4, 9, 5, 6],
]


def crossing_node(index):
    return f"c{index}"


def edge_node(label):
    return f"e{label}"


def same_cycle(actual, desired):
    if len(actual) != len(desired):
        return False

    doubled = actual + actual

    for shift in range(len(actual)):
        if doubled[shift:shift + len(actual)] == desired:
            return True

    return False


def opposite_cycle(actual, desired):
    return same_cycle(
        list(reversed(actual)),
        desired,
    )


def build_rotation_system(pd, edge_incidence):
    rotation = {}

    for crossing_index, crossing in enumerate(pd):
        rotation[crossing_node(crossing_index)] = [
            edge_node(edge_label)
            for edge_label in crossing
        ]

    for edge_label_text, occurrences in edge_incidence.items():
        edge_label = int(edge_label_text)

        if len(occurrences) != 2:
            raise RuntimeError(
                f"PD edge {edge_label} must occur exactly twice."
            )

        rotation[edge_node(edge_label)] = [
            crossing_node(occurrence["crossing"])
            for occurrence in occurrences
        ]

    return rotation


def build_embedding(rotation):
    embedding = nx.PlanarEmbedding()

    for node, neighbors in rotation.items():
        first = neighbors[0]

        embedding.add_half_edge_first(
            node,
            first,
        )

        previous = first

        for neighbor in neighbors[1:]:
            embedding.add_half_edge_cw(
                node,
                neighbor,
                previous,
            )

            previous = neighbor

    embedding.check_structure()

    return embedding


def enumerate_faces(embedding):
    visited = set()
    faces = []

    for first in embedding:
        for second in embedding.neighbors_cw_order(first):
            dart = (first, second)

            if dart in visited:
                continue

            face = embedding.traverse_face(
                first,
                second,
                visited,
            )

            faces.append(list(face))

    return faces


def main():
    data = json.loads(
        SOURCE.read_text()
    )

    if data["isometry_signature"] != EXPECTED_SIGNATURE:
        raise RuntimeError(
            "m129 isometry signature changed."
        )

    if data["pd_code"] != EXPECTED_PD:
        raise RuntimeError(
            "Certified Whitehead PD code changed."
        )

    pd = data["pd_code"]

    rotation = build_rotation_system(
        pd,
        data["edge_incidence"],
    )

    embedding = build_embedding(
        rotation
    )

    faces = enumerate_faces(
        embedding
    )

    vertex_count = len(rotation)

    edge_count = sum(
        len(neighbors)
        for neighbors in rotation.values()
    ) // 2

    face_count = len(faces)

    euler = (
        vertex_count
        - edge_count
        + face_count
    )

    if euler != 2:
        raise RuntimeError(
            f"PD rotation system failed: V-E+F={euler}"
        )

    orientation_modes = []

    for crossing_index, crossing in enumerate(pd):
        node = crossing_node(
            crossing_index
        )

        actual = list(
            embedding.neighbors_cw_order(
                node
            )
        )

        desired = [
            edge_node(edge_label)
            for edge_label in crossing
        ]

        if same_cycle(actual, desired):
            orientation_modes.append(
                "forward"
            )

        elif opposite_cycle(actual, desired):
            orientation_modes.append(
                "reverse"
            )

        else:
            raise RuntimeError(
                f"PD cyclic order failed at crossing "
                f"{crossing_index}: "
                f"{actual} vs {desired}"
            )

    if len(set(orientation_modes)) != 1:
        raise RuntimeError(
            "Crossing cyclic orientations are inconsistent."
        )


    raw_positions = (
        nx.combinatorial_embedding_to_pos(
            embedding,
            fully_triangulate=False,
        )
    )

    positions = {
        node: {
            "x": float(point[0]),
            "y": float(point[1]),
        }
        for node, point in raw_positions.items()
    }


    all_traversed_edges = []

    components = []

    for component in data["components"]:
        traversed = []

        entries = component["entries"]

        for index, entry in enumerate(entries):
            next_entry = entries[
                (index + 1) % len(entries)
            ]

            edge_label = int(
                pd[
                    int(next_entry["crossing"])
                ][
                    int(next_entry["strand_index"])
                ]
            )

            traversed.append(
                edge_label
            )

        all_traversed_edges.extend(
            traversed
        )

        components.append({
            "component":
                int(component["component"]),

            "role":
                component["role"],

            "traversed_pd_edges":
                traversed,
        })


    if sorted(all_traversed_edges) != list(range(10)):
        raise RuntimeError(
            "Component traversal does not use "
            "all 10 PD edges exactly once."
        )


    result = {
        "manifold":
            "m129",

        "link_name":
            "5^2_1",

        "isometry_signature":
            EXPECTED_SIGNATURE,

        "source":
            "certified Spherogram PD/KLP combinatorics",

        "pd_code":
            pd,

        "projection_embedding": {
            "rotation_orientation":
                orientation_modes[0],

            "vertex_count":
                vertex_count,

            "edge_count":
                edge_count,

            "face_count":
                face_count,

            "euler_characteristic":
                euler,

            "crossing_positions": {
                str(index):
                    positions[
                        crossing_node(index)
                    ]
                for index in range(len(pd))
            },

            "edge_midpoints": {
                str(label):
                    positions[
                        edge_node(label)
                    ]
                for label in range(10)
            },
        },

        "components":
            components,
    }

    OUTPUT.write_text(
        json.dumps(
            result,
            indent=2,
            sort_keys=True,
        )
        + "\n"
    )


    print(
        "M129 WHITEHEAD AMBIENT EMBEDDING EXPORTED"
    )

    print(
        f"output: {OUTPUT}"
    )

    print()
    print(
        "CERTIFICATIONS"
    )

    print(
        f"  subdivided vertices: {vertex_count}"
    )

    print(
        f"  subdivided edges: {edge_count}"
    )

    print(
        f"  faces: {face_count}"
    )

    print(
        f"  Euler V-E+F: {euler}"
    )

    print(
        f"  PD cyclic orientation: "
        f"{orientation_modes[0]}"
    )

    print(
        "  all 10 PD edges used once: "
        f"{sorted(all_traversed_edges) == list(range(10))}"
    )


if __name__ == "__main__":
    main()
