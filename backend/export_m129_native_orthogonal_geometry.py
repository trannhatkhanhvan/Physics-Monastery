import json
from pathlib import Path

import snappy
from spherogram import Link
from spherogram.links.orthogonal import OrthogonalLinkDiagram


OUTPUT = Path(
    "src/app/3-manifold-surgery-explorer/"
    "data/generated/"
    "m129_native_orthogonal_geometry.json"
)

EXPECTED_PD = [
    (6, 5, 7, 0),
    (0, 3, 1, 4),
    (8, 2, 9, 1),
    (2, 8, 3, 7),
    (4, 9, 5, 6),
]

EXPECTED_SIGNATURE = "eLPkbdcddhgggb"


def main():
    link = Link("5^2_1")

    # --------------------------------------------------------
    # Certify that this is still exactly the Whitehead-link
    # object whose exterior is m129.
    # --------------------------------------------------------

    pd = [
        tuple(
            int(value)
            for value in crossing
        )
        for crossing in link.PD_code()
    ]

    if pd != EXPECTED_PD:
        raise RuntimeError(
            "Certified Whitehead PD code changed."
        )

    exterior = link.exterior()

    signature = (
        exterior.isometry_signature()
    )

    if signature != EXPECTED_SIGNATURE:
        raise RuntimeError(
            "Expected m129 signature "
            f"{EXPECTED_SIGNATURE}, got {signature}."
        )


    # --------------------------------------------------------
    # Use Spherogram's own native orthogonal-link machinery.
    #
    # Internally plink_data() does:
    #
    #   orthogonal_rep().basic_grid_embedding()
    #   break_into_arrows()
    #
    # We do not reproduce or replace that algorithm here.
    # --------------------------------------------------------

    diagram = OrthogonalLinkDiagram(
        link
    )

    (
        vertex_positions,
        arrows,
        crossings,
    ) = diagram.plink_data()


    # --------------------------------------------------------
    # Preserve Spherogram's component ordering.
    #
    # repair_components() arranged strand_CEPs component by
    # component and populated strand_CEP_to_component.
    # plink_data() uses that same strand_CEP ordering when it
    # creates vertex_positions.
    # --------------------------------------------------------

    if (
        len(vertex_positions)
        !=
        len(diagram.strand_CEPs)
    ):
        raise RuntimeError(
            "plink_data vertex ordering no longer matches "
            "diagram.strand_CEPs."
        )

    vertices = []

    for index, (
        cep,
        position,
    ) in enumerate(
        zip(
            diagram.strand_CEPs,
            vertex_positions,
        )
    ):
        component = (
            diagram
            .strand_CEP_to_component[
                cep
            ]
        )

        vertices.append({
            "index":
                index,

            "component":
                int(component),

            "role":
                (
                    "SURVIVING_KNOT"
                    if component == 0
                    else "CROSSING_CIRCLE"
                ),

            "x":
                float(position[0]),

            "y":
                float(position[1]),
        })


    exported_arrows = [
        {
            "index":
                index,

            "tail":
                int(arrow[0]),

            "head":
                int(arrow[1]),

            "component":
                int(
                    vertices[
                        int(arrow[0])
                    ][
                        "component"
                    ]
                ),
        }
        for index, arrow
        in enumerate(arrows)
    ]


    # Every arrow must stay inside one component.
    for arrow in exported_arrows:
        tail_component = (
            vertices[
                arrow["tail"]
            ][
                "component"
            ]
        )

        head_component = (
            vertices[
                arrow["head"]
            ][
                "component"
            ]
        )

        if (
            tail_component
            !=
            head_component
        ):
            raise RuntimeError(
                "Spherogram arrow crosses component identity: "
                f"{arrow}"
            )


    # Native Spherogram crossing records come directly from
    # OrthogonalLinkDiagram.break_into_arrows():
    #
    #   (
    #     under_arrow,
    #     over_arrow,
    #     False,
    #     crossing_label,
    #   )
    #
    # Preserve that native meaning exactly.
    exported_crossings = []

    for index, crossing in enumerate(
        crossings
    ):
        if len(crossing) != 4:
            raise RuntimeError(
                "Unexpected native Spherogram crossing record: "
                f"{crossing!r}"
            )

        (
            under_arrow,
            over_arrow,
            flag,
            crossing_label,
        ) = crossing

        if flag is not False:
            raise RuntimeError(
                "Unexpected native Spherogram crossing flag: "
                f"{crossing!r}"
            )

        exported_crossings.append({
            "index":
                index,

            "crossing_label":
                int(crossing_label),

            "under_arrow":
                int(under_arrow),

            "over_arrow":
                int(over_arrow),

            "native_flag":
                False,
        })


    result = {
        "manifold":
            "m129",

        "link_name":
            "5^2_1",

        "isometry_signature":
            signature,

        "pd_code":
            [
                list(crossing)
                for crossing in pd
            ],

        "source":
            (
                "Spherogram "
                "OrthogonalLinkDiagram.plink_data()"
            ),

        "native_pipeline": [
            "Link('5^2_1')",
            "OrthogonalLinkDiagram(link)",
            "orthogonal_rep().basic_grid_embedding()",
            "break_into_arrows()",
            "plink_data()",
        ],

        "component_roles": {
            "0":
                "SURVIVING_KNOT",

            "1":
                "CROSSING_CIRCLE",
        },

        "vertices":
            vertices,

        "arrows":
            exported_arrows,

        "crossings":
            exported_crossings,
    }


    OUTPUT.write_text(
        json.dumps(
            result,
            indent=2,
            sort_keys=True,
        )
        +
        "\n"
    )


    print(
        "M129 NATIVE ORTHOGONAL GEOMETRY EXPORTED"
    )

    print(
        f"output: {OUTPUT}"
    )

    print()
    print(
        "CERTIFICATIONS"
    )

    print(
        f"  isometry signature: {signature}"
    )

    print(
        f"  PD code exact: {pd == EXPECTED_PD}"
    )

    print(
        f"  components: {len(link.link_components)}"
    )

    print(
        f"  vertices: {len(vertices)}"
    )

    print(
        f"  arrows: {len(exported_arrows)}"
    )

    print(
        f"  crossings: {len(exported_crossings)}"
    )

    print()

    print(
        "VERTICES"
    )

    for vertex in vertices:
        print(
            f"  v{vertex['index']}: "
            f"component={vertex['component']} "
            f"({vertex['x']}, {vertex['y']})"
        )

    print()

    print(
        "ARROWS"
    )

    for arrow in exported_arrows:
        print(
            f"  a{arrow['index']}: "
            f"{arrow['tail']} -> {arrow['head']} "
            f"component={arrow['component']}"
        )

    print()

    print(
        "CROSSINGS"
    )

    for crossing in exported_crossings:
        print(
            f"  crossing {crossing['index']}: "
            f"over arrow {crossing['over_arrow']}, "
            f"under arrow {crossing['under_arrow']}"
        )

    print()

    print(
        "NATIVE SPHEROGRAM GEOMETRY CERTIFIED"
    )


if __name__ == "__main__":
    main()
