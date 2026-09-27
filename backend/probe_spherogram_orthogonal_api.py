import inspect

import snappy
from spherogram import Link
import spherogram.links.orthogonal as orth


def heading(title):
    print()
    print("=" * 72)
    print(title)
    print("=" * 72)


def describe(name, obj):
    heading(name)

    print("object:", obj)

    try:
        print(
            "signature:",
            inspect.signature(obj)
        )
    except Exception as exc:
        print(
            "signature: <ERROR>",
            exc
        )

    print()
    print("PUBLIC ATTRIBUTES")

    for attr_name in sorted(
        name
        for name in dir(obj)
        if not name.startswith("_")
    ):
        try:
            value = getattr(
                obj,
                attr_name
            )

            if callable(value):
                try:
                    signature = inspect.signature(
                        value
                    )
                except Exception:
                    signature = "<unknown>"

                print(
                    f"  {attr_name}: callable "
                    f"{signature}"
                )

            else:
                print(
                    f"  {attr_name}: "
                    f"{type(value).__module__}."
                    f"{type(value).__name__} "
                    f"{value!r}"
                )

        except Exception as exc:
            print(
                f"  {attr_name}: <ERROR {exc}>"
            )

    print()
    print("SOURCE")

    try:
        source = inspect.getsource(
            obj
        )

        print(source)

    except Exception as exc:
        print(
            "<SOURCE ERROR>",
            exc
        )


def main():
    L = Link("5^2_1")

    heading(
        "SPHEROGRAM ORTHOGONAL LINK API"
    )

    print(
        "link:",
        L.name
    )

    print(
        "PD:",
        L.PD_code()
    )

    describe(
        "OrthogonalLinkDiagram",
        orth.OrthogonalLinkDiagram
    )

    describe(
        "OrthogonalRep",
        orth.OrthogonalRep
    )

    describe(
        "orthogonal_draw",
        orth.orthogonal_draw
    )

    heading(
        "TRY CONSTRUCTING OrthogonalLinkDiagram"
    )

    attempts = [
        (
            "from Link",
            lambda:
                orth.OrthogonalLinkDiagram(
                    L
                )
        ),

        (
            "from PD code",
            lambda:
                orth.OrthogonalLinkDiagram(
                    L.PD_code()
                )
        ),
    ]

    for label, constructor in attempts:
        print()
        print(label)

        try:
            obj = constructor()

            print(
                "SUCCESS:",
                obj
            )

            print(
                "type:",
                type(obj)
            )

            if hasattr(
                obj,
                "__dict__"
            ):
                print("__dict__:")

                for key, value in sorted(
                    obj.__dict__.items()
                ):
                    print(
                        f"  {key}: "
                        f"{value!r}"
                    )

        except Exception as exc:
            print(
                "ERROR:",
                repr(exc)
            )


if __name__ == "__main__":
    main()
