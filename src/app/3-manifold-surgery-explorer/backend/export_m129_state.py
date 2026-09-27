#!/usr/bin/env python3

"""
Export the certified Whitehead-link complement state used by the
3-Manifold Surgery Explorer.

The unmarked Whitehead-link complement m129 has symmetric cusps.

For the directed surgery operation

    m004
      -> drill crossing circle
    m129
      -> fill crossing-circle cusp with (1,1)
    m004

we impose the persistent marking

    cusp 0 = surviving knot cusp
    cusp 1 = crossing-circle cusp

That marking belongs to the directed operation, not intrinsically
to the unmarked manifold m129.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import snappy
from spherogram import Link


ROOT = Path(__file__).resolve().parents[1]

OUTPUT_PATH = (
    ROOT
    / "data"
    / "generated"
    / "m129_certified_state.json"
)

WHITEHEAD_LINK_NAME = "5^2_1"

EXPECTED_M129_ISOMETRY_SIGNATURE = (
    "eLPkbdcddhgggb"
)

EXPECTED_M004_ISOMETRY_SIGNATURE = (
    "cPcbbbiht"
)

SURVIVING_KNOT_CUSP = 0
CROSSING_CIRCLE_CUSP = 1

RETURN_FILLING_SLOPE = (1, 1)


def complex_record(value: Any) -> dict[str, str]:
    return {
        "value": str(value),
        "real": str(value.real()),
        "imag": str(value.imag()),
    }


def serialize_permutation(
    permutation: Any,
) -> list[int]:
    try:
        values = list(permutation)
    except TypeError:
        values = list(
            permutation.tuple()
        )

    result = [
        int(value)
        for value in values
    ]

    if len(result) != 4:
        raise RuntimeError(
            "Expected tetrahedron gluing permutation "
            f"of length 4, got {result!r}"
        )

    return result


def raw_tetrahedron_gluings(
    manifold: Any,
) -> list[dict[str, Any]]:
    method = getattr(
        manifold,
        "_get_tetrahedra_gluing_data",
        None,
    )

    if method is None:
        raise RuntimeError(
            "This SnapPy build does not expose "
            "_get_tetrahedra_gluing_data()."
        )

    raw = method()

    tetrahedra = []

    for tetrahedron_index, entry in enumerate(raw):
        if len(entry) != 2:
            raise RuntimeError(
                "Unexpected tetrahedron gluing record: "
                f"{entry!r}"
            )

        neighbors, permutations = entry

        if (
            len(neighbors) != 4
            or len(permutations) != 4
        ):
            raise RuntimeError(
                "Expected four face neighbors and four "
                "face permutations per tetrahedron."
            )

        faces = []

        for face in range(4):
            faces.append(
                {
                    "face":
                        face,

                    "neighbor_tetrahedron":
                        int(
                            neighbors[face]
                        ),

                    "vertex_permutation":
                        serialize_permutation(
                            permutations[face]
                        ),
                }
            )

        tetrahedra.append(
            {
                "tetrahedron":
                    tetrahedron_index,

                "faces":
                    faces,
            }
        )

    return tetrahedra


class DisjointSet:
    def __init__(self, size: int):
        self.parent = list(range(size))

    def find(
        self,
        item: int,
    ) -> int:
        while (
            self.parent[item]
            != item
        ):
            self.parent[item] = (
                self.parent[
                    self.parent[item]
                ]
            )

            item = (
                self.parent[item]
            )

        return item

    def union(
        self,
        first: int,
        second: int,
    ) -> None:
        root_first = (
            self.find(first)
        )

        root_second = (
            self.find(second)
        )

        if (
            root_first
            != root_second
        ):
            self.parent[
                root_second
            ] = root_first


def derive_ideal_vertex_orbits(
    tetrahedra: list[
        dict[str, Any]
    ],
) -> list[
    list[
        dict[str, int]
    ]
]:
    tetrahedron_count = (
        len(tetrahedra)
    )

    def address(
        tetrahedron: int,
        vertex: int,
    ) -> int:
        return (
            4 * tetrahedron
            + vertex
        )

    dsu = DisjointSet(
        4 * tetrahedron_count
    )

    for tetrahedron in tetrahedra:
        source_tetrahedron = (
            tetrahedron[
                "tetrahedron"
            ]
        )

        for face_data in (
            tetrahedron[
                "faces"
            ]
        ):
            source_face = (
                face_data[
                    "face"
                ]
            )

            target_tetrahedron = (
                face_data[
                    "neighbor_tetrahedron"
                ]
            )

            permutation = (
                face_data[
                    "vertex_permutation"
                ]
            )

            # Only vertices lying on the glued face
            # are identified across that face.
            for source_vertex in range(4):
                if (
                    source_vertex
                    == source_face
                ):
                    continue

                target_vertex = (
                    permutation[
                        source_vertex
                    ]
                )

                dsu.union(
                    address(
                        source_tetrahedron,
                        source_vertex,
                    ),
                    address(
                        target_tetrahedron,
                        target_vertex,
                    ),
                )

    groups: dict[
        int,
        list[
            dict[str, int]
        ],
    ] = {}

    for tetrahedron in range(
        tetrahedron_count
    ):
        for vertex in range(4):
            index = address(
                tetrahedron,
                vertex,
            )

            root = (
                dsu.find(index)
            )

            groups.setdefault(
                root,
                [],
            ).append(
                {
                    "tetrahedron":
                        tetrahedron,

                    "vertex":
                        vertex,
                }
            )

    orbits = (
        list(
            groups.values()
        )
    )

    orbits.sort(
        key=lambda orbit: (
            orbit[0][
                "tetrahedron"
            ],
            orbit[0][
                "vertex"
            ],
        )
    )

    return orbits


def cusp_record(
    manifold: Any,
    cusp_index: int,
    role: str,
) -> dict[str, Any]:
    info = (
        manifold.cusp_info(
            cusp_index
        )
    )

    shape = info["shape"]

    filling = tuple(
        info["filling"]
    )

    return {
        "index":
            cusp_index,

        "role":
            role,

        "complete":
            bool(
                info["complete?"]
            ),

        "filling":
            [
                str(
                    filling[0]
                ),
                str(
                    filling[1]
                ),
            ],

        "shape":
            complex_record(
                shape
            ),

        "peripheral_basis":
            {
                "meridian":
                    [1, 0],

                "longitude":
                    [0, 1],

                "basis_source":
                    "link-derived SnapPy peripheral basis",
            },
    }


def verify_return_filling(
    source: Any,
) -> dict[str, Any]:
    filled = (
        source.copy()
    )

    filled.dehn_fill(
        RETURN_FILLING_SLOPE,
        CROSSING_CIRCLE_CUSP,
    )

    filled = (
        filled.filled_triangulation()
    )

    signature = (
        filled.isometry_signature()
    )

    identified = [
        str(item)
        for item
        in filled.identify()
    ]

    if (
        signature
        !=
        EXPECTED_M004_ISOMETRY_SIGNATURE
    ):
        raise RuntimeError(
            "Certified return filling failed: "
            f"expected "
            f"{EXPECTED_M004_ISOMETRY_SIGNATURE}, "
            f"got {signature}"
        )

    return {
        "filled_cusp":
            CROSSING_CIRCLE_CUSP,

        "filled_cusp_role":
            "crossing-circle",

        "slope":
            list(
                RETURN_FILLING_SLOPE
            ),

        "result_isometry_signature":
            signature,

        "identify":
            identified,

        "certified":
            True,
    }


def main() -> None:
    print("=" * 72)
    print(
        "3-MANIFOLD SURGERY EXPLORER "
        "— EXPORT m129"
    )
    print("=" * 72)
    print()

    link = Link(
        WHITEHEAD_LINK_NAME
    )

    manifold = (
        link.exterior()
    )

    isometry_signature = (
        manifold.isometry_signature()
    )

    if (
        isometry_signature
        !=
        EXPECTED_M129_ISOMETRY_SIGNATURE
    ):
        raise RuntimeError(
            "Whitehead-link exterior did not "
            "identify as expected m129: "
            f"{isometry_signature}"
        )

    triangulation_isosig = (
        manifold.triangulation_isosig(
            decorated=False
        )
    )

    tetrahedron_shapes = (
        manifold.tetrahedra_shapes(
            "rect"
        )
    )

    gluings = (
        raw_tetrahedron_gluings(
            manifold
        )
    )

    ideal_vertex_orbits = (
        derive_ideal_vertex_orbits(
            gluings
        )
    )

    if (
        len(
            ideal_vertex_orbits
        )
        !=
        manifold.num_cusps()
    ):
        raise RuntimeError(
            "Derived ideal-vertex orbit count "
            "does not equal cusp count: "
            f"{len(ideal_vertex_orbits)} "
            f"vs {manifold.num_cusps()}"
        )

    return_filling = (
        verify_return_filling(
            manifold
        )
    )

    data = {
        "schema":
            "physics-monastery."
            "3-manifold-surgery-explorer."
            "manifold-state.v1",

        "manifold": {
            "id":
                "m129",

            "display_name":
                "Whitehead link complement",

            "link_name":
                WHITEHEAD_LINK_NAME,

            "component_count":
                len(
                    link.link_components
                ),

            "cusp_count":
                manifold.num_cusps(),

            "tetrahedron_count":
                manifold.num_tetrahedra(),

            "volume":
                str(
                    manifold.volume()
                ),

            "isometry_signature":
                isometry_signature,

            "triangulation_isosig":
                triangulation_isosig,

            "identify":
                [
                    str(item)
                    for item
                    in manifold.identify()
                ],
        },

        "directed_marking": {
            "intrinsic":
                False,

            "reason":
                "The unmarked m129 complement has "
                "symmetric cusps. These labels belong "
                "to the directed crossing-circle "
                "surgery operation.",

            "surviving_knot_cusp":
                SURVIVING_KNOT_CUSP,

            "crossing_circle_cusp":
                CROSSING_CIRCLE_CUSP,
        },

        "link_description": {
            "PD_code":
                [
                    list(crossing)
                    for crossing
                    in link.PD_code()
                ],

            "DT_code":
                str(
                    link.DT_code()
                ),

            "component_lengths":
                [
                    len(component)
                    for component
                    in link.link_components
                ],
        },

        "cusps": [
            cusp_record(
                manifold,
                SURVIVING_KNOT_CUSP,
                "surviving-knot",
            ),

            cusp_record(
                manifold,
                CROSSING_CIRCLE_CUSP,
                "crossing-circle",
            ),
        ],

        "tetrahedron_shapes": [
            {
                "tetrahedron":
                    index,

                "z":
                    complex_record(
                        shape
                    ),
            }
            for index, shape
            in enumerate(
                tetrahedron_shapes
            )
        ],

        "face_gluings":
            gluings,

        "ideal_vertex_orbits":
            ideal_vertex_orbits,

        "certified_operations": {
            "fill_crossing_circle_to_m004":
                return_filling,
        },
    }

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    OUTPUT_PATH.write_text(
        json.dumps(
            data,
            indent=2,
            sort_keys=False,
        )
        + "\n"
    )

    print("SOURCE")
    print("-" * 72)
    print(
        "link:",
        WHITEHEAD_LINK_NAME,
    )
    print(
        "isometry signature:",
        isometry_signature,
    )
    print(
        "triangulation isosig:",
        triangulation_isosig,
    )
    print(
        "tetrahedra:",
        manifold.num_tetrahedra(),
    )
    print(
        "cusps:",
        manifold.num_cusps(),
    )
    print()

    print("IDEAL VERTEX ORBITS")
    print("-" * 72)

    for index, orbit in enumerate(
        ideal_vertex_orbits
    ):
        print(
            f"orbit {index}:",
            orbit,
        )

    print()

    print("RETURN FILLING")
    print("-" * 72)
    print(
        "crossing-circle cusp:",
        CROSSING_CIRCLE_CUSP,
    )
    print(
        "slope:",
        RETURN_FILLING_SLOPE,
    )
    print(
        "result:",
        return_filling[
            "result_isometry_signature"
        ],
    )
    print(
        "certified:",
        return_filling[
            "certified"
        ],
    )
    print()

    print("OUTPUT")
    print("-" * 72)
    print(
        OUTPUT_PATH
    )
    print()

    print(
        "EXPORT COMPLETE"
    )


if __name__ == "__main__":
    main()
