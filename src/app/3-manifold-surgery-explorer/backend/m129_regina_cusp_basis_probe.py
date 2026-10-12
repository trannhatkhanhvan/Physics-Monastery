#!/usr/bin/env python3

from pathlib import Path
import inspect

import regina


HERE = Path(__file__).resolve().parent

INPUT = (
    HERE /
    "m129_marked.snappea"
)


def heading(text):
    print()
    print("=" * 72)
    print(text)
    print("=" * 72)


def show_methods(
    obj,
    tokens,
):
    for name in sorted(
        dir(obj)
    ):
        if name.startswith("_"):
            continue

        lower = name.lower()

        if not any(
            token in lower
            for token in tokens
        ):
            continue

        try:
            value = getattr(
                obj,
                name
            )
        except Exception:
            continue

        if callable(value):
            try:
                signature = (
                    inspect.signature(
                        value
                    )
                )
            except Exception:
                signature = "(...)"

            print(
                f"{name}{signature}"
            )
        else:
            print(
                f"{name}: {value}"
            )


def main():
    heading(
        "REGINA IMPORT OF MARKED "
        "m129 SNAPPEA DATA"
    )

    if not INPUT.exists():
        raise RuntimeError(
            "Missing SnapPea bridge file:\n"
            f"{INPUT}\n"
            "\n"
            "Run export_m129_snappea_data.py "
            "with the repository .venv first."
        )

    snap_data = INPUT.read_text()

    print(
        "input file:",
        INPUT
    )

    print(
        "bytes:",
        len(
            snap_data.encode(
                "utf-8"
            )
        )
    )

    snap = (
        regina.SnapPeaTriangulation(
            snap_data
        )
    )

    heading(
        "IMPORTED OBJECT"
    )

    print(
        "type:",
        type(snap)
    )

    print(
        "null:",
        snap.isNull()
    )

    print(
        "tetrahedra:",
        snap.size()
    )

    print(
        "cusps:",
        snap.countCusps()
    )

    print(
        "complete cusps:",
        snap.countCompleteCusps()
    )

    print(
        "filled cusps:",
        snap.countFilledCusps()
    )

    print(
        "isoSig:",
        snap.isoSig()
    )


    heading(
        "PERIPHERAL INTERFACE"
    )

    show_methods(
        snap,
        (
            "cusp",
            "merid",
            "long",
            "curve",
            "slope",
            "fill",
            "periph",
            "vertex",
        )
    )


    heading(
        "CUSP RECORDS"
    )

    for cusp_index in range(
        snap.countCusps()
    ):
        cusp = snap.cusp(
            cusp_index
        )

        print()
        print(
            f"CUSP {cusp_index}"
        )
        print("-" * 40)

        print(
            "type:",
            type(cusp)
        )

        print(
            "repr:",
            repr(cusp)
        )

        print()
        print(
            "available cusp methods:"
        )

        show_methods(
            cusp,
            (
                "merid",
                "long",
                "curve",
                "slope",
                "fill",
                "vertex",
                "complete",
            )
        )


    heading(
        "NATIVE REGINA COPY"
    )

    native = regina.Triangulation3(
        snap
    )

    print(
        "type:",
        type(native)
    )

    print(
        "tetrahedra:",
        native.size()
    )

    print(
        "ideal:",
        native.isIdeal()
    )

    print(
        "vertices:",
        native.countVertices()
    )

    print(
        "isoSig:",
        native.isoSig()
    )


    heading(
        "TRUNCATED COPY"
    )

    truncated = (
        regina.Triangulation3(
            native
        )
    )

    truncated.truncateIdeal()

    print(
        "tetrahedra:",
        truncated.size()
    )

    print(
        "boundary components:",
        truncated.countBoundaryComponents()
    )

    print(
        "boundary triangles:",
        truncated.countBoundaryTriangles()
    )

    for component_index in range(
        truncated.countBoundaryComponents()
    ):
        component = (
            truncated.boundaryComponent(
                component_index
            )
        )

        print()
        print(
            f"BOUNDARY COMPONENT "
            f"{component_index}"
        )
        print("-" * 40)

        print(
            "triangles:",
            component.countTriangles()
        )

        print(
            "edges:",
            component.countEdges()
        )

        print(
            "vertices:",
            component.countVertices()
        )

        try:
            print(
                "Euler characteristic:",
                component.eulerChar()
            )
        except Exception as error:
            print(
                "Euler characteristic "
                "unavailable:",
                type(error).__name__,
                error,
            )


    heading(
        "RESULT"
    )

    if snap.countCusps() != 2:
        raise RuntimeError(
            "Expected two m129 cusps; "
            f"found {snap.countCusps()}."
        )

    if native.isoSig() != (
        "eLPkbdcddhgggb"
    ):
        raise RuntimeError(
            "Unexpected native Regina "
            "m129 isoSig:\n"
            f"{native.isoSig()}"
        )

    print(
        "PASS: marked SnapPy m129 data "
        "successfully crossed into Regina."
    )


if __name__ == "__main__":
    main()
