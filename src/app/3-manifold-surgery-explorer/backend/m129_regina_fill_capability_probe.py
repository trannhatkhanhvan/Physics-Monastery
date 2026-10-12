#!/usr/bin/env python3

import regina


def heading(text):
    print()
    print("=" * 72)
    print(text)
    print("=" * 72)


def public_names(obj, tokens):
    names = []

    for name in sorted(dir(obj)):
        if name.startswith("_"):
            continue

        lower = name.lower()

        if any(
            token in lower
            for token in tokens
        ):
            names.append(name)

    return names


def main():
    heading(
        "REGINA m129 FILL / PACHNER "
        "CAPABILITY PROBE"
    )

    print(
        "Regina version:",
        regina.versionString()
    )

    heading(
        "TRIANGULATION METHODS"
    )

    tri = regina.Triangulation3()

    for name in public_names(
        tri,
        (
            "pachner",
            "simpl",
            "fill",
            "layer",
            "move",
            "boundary",
            "ideal",
            "snap",
            "iso",
        )
    ):
        print(name)

    heading(
        "SNAPPEA TRIANGULATION METHODS"
    )

    try:
        snap = regina.SnapPeaTriangulation()
    except Exception as error:
        print(
            "Could not construct empty "
            "SnapPeaTriangulation:",
            type(error).__name__,
            error,
        )
        snap = None

    if snap is not None:
        for name in public_names(
            snap,
            (
                "fill",
                "cusp",
                "pachner",
                "simpl",
                "triang",
                "iso",
            )
        ):
            print(name)

    heading(
        "LAYERED SOLID TORUS API"
    )

    for class_name in (
        "LayeredSolidTorus",
        "Example3",
    ):
        cls = getattr(
            regina,
            class_name,
            None
        )

        print()
        print(
            class_name,
            ":",
            cls,
        )

        if cls is not None:
            for name in public_names(
                cls,
                (
                    "layer",
                    "solid",
                    "torus",
                    "fill",
                    "lst",
                )
            ):
                print(
                    " ",
                    name,
                )


if __name__ == "__main__":
    main()
