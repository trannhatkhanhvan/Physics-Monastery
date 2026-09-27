#!/usr/bin/env python3

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
    / "m129_cusp_developments.json"
)

WHITEHEAD_LINK_NAME = "5^2_1"

EXPECTED_ISOMETRY_SIGNATURE = (
    "eLPkbdcddhgggb"
)

CUSP_ROLES = {
    0: "surviving-knot",
    1: "crossing-circle",
}


def complex_record(
    value: Any,
) -> dict[str, float]:
    z = complex(value)

    return {
        "re":
            float(z.real),

        "im":
            float(z.imag),
    }


def translation_record(
    translations: Any,
) -> dict[str, Any]:
    first, second = translations

    return {
        "first":
            complex_record(
                first
            ),

        "second":
            complex_record(
                second
            ),
    }


def triangulation_record(
    triangulation: list[
        dict[str, Any]
    ],
) -> list[dict[str, Any]]:
    result = []

    for edge_index, edge in enumerate(
        triangulation
    ):
        endpoints = (
            edge["endpoints"]
        )

        indices = (
            edge["indices"]
        )

        if len(endpoints) != 2:
            raise RuntimeError(
                "Expected two endpoints "
                f"for cusp edge {edge_index}"
            )

        if len(indices) != 3:
            raise RuntimeError(
                "Expected three SnapPy indices "
                f"for cusp edge {edge_index}"
            )

        result.append(
            {
                "edge":
                    edge_index,

                "start":
                    complex_record(
                        endpoints[0]
                    ),

                "end":
                    complex_record(
                        endpoints[1]
                    ),

                "indices":
                    [
                        int(value)
                        for value
                        in indices
                    ],
            }
        )

    return result


def bounding_box(
    edges: list[
        dict[str, Any]
    ],
) -> dict[str, float]:
    xs = []
    ys = []

    for edge in edges:
        for endpoint_name in [
            "start",
            "end",
        ]:
            point = (
                edge[
                    endpoint_name
                ]
            )

            xs.append(
                point["re"]
            )

            ys.append(
                point["im"]
            )

    return {
        "min_re":
            min(xs),

        "max_re":
            max(xs),

        "min_im":
            min(ys),

        "max_im":
            max(ys),

        "width":
            max(xs) - min(xs),

        "height":
            max(ys) - min(ys),
    }


def main() -> None:
    print("=" * 72)
    print(
        "3-MANIFOLD SURGERY EXPLORER "
        "— EXPORT m129 CUSP DEVELOPMENTS"
    )
    print("=" * 72)
    print()

    link = Link(
        WHITEHEAD_LINK_NAME
    )

    manifold = (
        link.exterior()
    )

    signature = (
        manifold.isometry_signature()
    )

    if (
        signature
        !=
        EXPECTED_ISOMETRY_SIGNATURE
    ):
        raise RuntimeError(
            "Unexpected m129 signature: "
            f"{signature}"
        )

    neighborhood = (
        manifold.cusp_neighborhood()
    )

    if (
        neighborhood.num_cusps()
        != 2
    ):
        raise RuntimeError(
            "Expected exactly two cusps."
        )

    cusp_records = []

    for cusp_index in range(2):
        topology = (
            neighborhood.topology(
                cusp_index
            )
        )

        if topology != "torus cusp":
            raise RuntimeError(
                "Expected torus cusp at "
                f"index {cusp_index}, "
                f"got {topology!r}"
            )

        original_index = (
            neighborhood.original_index(
                cusp_index
            )
        )

        if original_index != cusp_index:
            raise RuntimeError(
                "Unexpected cusp index mapping: "
                f"{cusp_index} -> "
                f"{original_index}"
            )

        raw_edges = (
            neighborhood.triangulation(
                cusp_index
            )
        )

        edges = (
            triangulation_record(
                raw_edges
            )
        )

        if len(edges) != 12:
            raise RuntimeError(
                f"Cusp {cusp_index}: "
                f"expected 12 developed edges, "
                f"got {len(edges)}"
            )

        translations = (
            neighborhood.translations(
                cusp_index
            )
        )

        cusp_info = (
            manifold.cusp_info(
                cusp_index
            )
        )

        record = {
            "index":
                cusp_index,

            "original_index":
                original_index,

            "role":
                CUSP_ROLES[
                    cusp_index
                ],

            "topology":
                topology,

            "shape":
                complex_record(
                    cusp_info["shape"]
                ),

            "translations":
                translation_record(
                    translations
                ),

            "displacement":
                float(
                    neighborhood
                    .get_displacement(
                        cusp_index
                    )
                ),

            "reach":
                float(
                    neighborhood.reach(
                        cusp_index
                    )
                ),

            "developed_edge_count":
                len(edges),

            "developed_edges":
                edges,

            "bounding_box":
                bounding_box(
                    edges
                ),
        }

        cusp_records.append(
            record
        )

    data = {
        "schema":
            "physics-monastery."
            "3-manifold-surgery-explorer."
            "cusp-development.v1",

        "manifold": {
            "id":
                "m129",

            "display_name":
                "Whitehead link complement",

            "isometry_signature":
                signature,

            "cusp_count":
                2,
        },

        "coordinate_system": {
            "type":
                "SnapPy Euclidean cusp development",

            "source":
                "CuspNeighborhood.triangulation(cusp_index)",

            "note":
                (
                    "Coordinates are the literal complex-plane "
                    "development returned by SnapPy for the "
                    "current cusp neighborhood."
                ),
        },

        "cusps":
            cusp_records,
    }

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    OUTPUT_PATH.write_text(
        json.dumps(
            data,
            indent=2,
        )
        + "\n"
    )

    print("SOURCE")
    print("-" * 72)
    print(
        "isometry signature:",
        signature,
    )
    print(
        "cusps:",
        len(cusp_records),
    )
    print()

    for cusp in cusp_records:
        print(
            f"CUSP {cusp['index']} "
            f"({cusp['role']})"
        )
        print(
            "  topology:",
            cusp["topology"],
        )
        print(
            "  shape:",
            cusp["shape"],
        )
        print(
            "  translations:",
            cusp["translations"],
        )
        print(
            "  reach:",
            cusp["reach"],
        )
        print(
            "  developed edges:",
            cusp[
                "developed_edge_count"
            ],
        )
        print(
            "  bounding box:",
            cusp["bounding_box"],
        )
        print()

    print("OUTPUT")
    print("-" * 72)
    print(
        OUTPUT_PATH
    )
    print()

    print(
        "CUSP DEVELOPMENT EXPORT COMPLETE"
    )


if __name__ == "__main__":
    main()
