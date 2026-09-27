import json

import snappy
from spherogram import Link
from spherogram.links.orthogonal import OrthogonalLinkDiagram


def describe_object(obj):
    result = {
        "type":
            f"{type(obj).__module__}.{type(obj).__name__}",

        "repr":
            repr(obj),
    }

    if hasattr(obj, "__dict__"):
        result["dict"] = {
            key: repr(value)
            for key, value
            in obj.__dict__.items()
        }

    return result


def main():
    link = Link("5^2_1")

    diagram = OrthogonalLinkDiagram(
        link
    )

    print(
        "LINK:",
        link
    )

    print(
        "PD:",
        link.PD_code()
    )

    print()
    print(
        "ORTHOGONAL DIAGRAM:",
        diagram
    )


    # --------------------------------------------------------
    # Native Spherogram integer-grid embedding.
    # --------------------------------------------------------

    positions = (
        diagram.basic_grid_embedding()
    )

    print()
    print(
        "BASIC GRID EMBEDDING"
    )

    print(
        "vertex count:",
        len(
            positions
        )
    )

    for vertex, position in positions.items():
        print(
            repr(vertex),
            "->",
            position
        )


    # --------------------------------------------------------
    # Native vertices.
    # --------------------------------------------------------

    print()
    print(
        "VERTICES"
    )

    print(
        "count:",
        len(
            diagram.vertices
        )
    )

    for index, vertex in enumerate(
        diagram.vertices
    ):
        print()
        print(
            f"VERTEX {index}"
        )

        print(
            json.dumps(
                describe_object(
                    vertex
                ),
                indent=2,
            )
        )


    # --------------------------------------------------------
    # Native edges.
    # --------------------------------------------------------

    print()
    print(
        "EDGES"
    )

    print(
        "count:",
        len(
            diagram.edges
        )
    )

    for index, edge in enumerate(
        diagram.edges
    ):
        print()
        print(
            f"EDGE {index}"
        )

        print(
            json.dumps(
                describe_object(
                    edge
                ),
                indent=2,
            )
        )

        for attribute in (
            "tail",
            "head",
            "crossing",
            "strand_index",
        ):
            if hasattr(
                edge,
                attribute
            ):
                try:
                    print(
                        f"  {attribute}:",
                        getattr(
                            edge,
                            attribute
                        )
                    )

                except Exception as exc:
                    print(
                        f"  {attribute}: "
                        f"<ERROR {exc}>"
                    )


    # --------------------------------------------------------
    # Dummy edges inserted by the orthogonal layout.
    # --------------------------------------------------------

    print()
    print(
        "DUMMY EDGES"
    )

    dummy = getattr(
        diagram,
        "dummy",
        []
    )

    print(
        "count:",
        len(
            dummy
        )
    )

    for edge in dummy:
        print(
            repr(edge)
        )


    # --------------------------------------------------------
    # Native PLink serialization.
    # --------------------------------------------------------

    print()
    print(
        "PLINK DATA"
    )

    try:
        plink_data = (
            diagram.plink_data()
        )

        print(
            "type:",
            type(
                plink_data
            )
        )

        print(
            "repr:"
        )

        print(
            repr(
                plink_data
            )
        )

    except Exception as exc:
        print(
            "plink_data ERROR:",
            repr(
                exc
            )
        )


if __name__ == "__main__":
    main()
