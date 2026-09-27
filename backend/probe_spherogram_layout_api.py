import inspect

import snappy
from spherogram import Link


def heading(title):
    print()
    print("=" * 72)
    print(title)
    print("=" * 72)


def show_module(module):
    print(f"MODULE {module.__name__}")

    names = [
        name
        for name in dir(module)
        if not name.startswith("_")
    ]

    for name in names:
        lower = name.lower()

        if any(
            token in lower
            for token in (
                "layout",
                "draw",
                "orth",
                "planar",
                "plink",
                "project",
                "vertex",
                "edge",
                "cross",
            )
        ):
            try:
                value = getattr(
                    module,
                    name
                )

                print(
                    f"  {name}: "
                    f"{type(value).__module__}."
                    f"{type(value).__name__}"
                )
            except Exception as exc:
                print(
                    f"  {name}: <ERROR {exc}>"
                )


def main():
    heading(
        "SPHEROGRAM / PLINK LAYOUT API PROBE"
    )

    L = Link("5^2_1")

    print(
        "link:",
        L.name
    )

    print(
        "PD:",
        L.PD_code()
    )


    heading(
        "LINK METHODS"
    )

    for name in sorted(
        item
        for item in dir(L)
        if not item.startswith("_")
    ):
        lower = name.lower()

        if any(
            token in lower
            for token in (
                "view",
                "draw",
                "layout",
                "plot",
                "orth",
                "planar",
                "project",
            )
        ):
            try:
                value = getattr(
                    L,
                    name
                )

                print(
                    f"{name}: {value!r}"
                )

                if callable(value):
                    try:
                        print(
                            "  signature:",
                            inspect.signature(
                                value
                            )
                        )
                    except Exception:
                        pass

            except Exception as exc:
                print(
                    f"{name}: <ERROR {exc}>"
                )


    heading(
        "SPHEROGRAM MODULES"
    )

    module_names = [
        "spherogram",
        "spherogram.links",
        "spherogram.links.links",
        "spherogram.links.links_base",
        "spherogram.links.planar_isotopy",
        "spherogram.links.orthogonal",
    ]

    for module_name in module_names:
        try:
            module = __import__(
                module_name,
                fromlist=["*"],
            )

            show_module(
                module
            )

        except Exception as exc:
            print(
                f"{module_name}: "
                f"<IMPORT ERROR {exc}>"
            )


    heading(
        "PLINK MODULES"
    )

    for module_name in [
        "plink",
        "plink.link",
        "plink.viewer",
        "plink.gui",
    ]:
        try:
            module = __import__(
                module_name,
                fromlist=["*"],
            )

            show_module(
                module
            )

        except Exception as exc:
            print(
                f"{module_name}: "
                f"<IMPORT ERROR {exc}>"
            )


    heading(
        "KLP CROSSING RECORDS"
    )

    projection = L.KLPProjection()

    print(
        "header:",
        projection[:3]
    )

    for crossing in projection[3]:
        print(
            {
                "index":
                    crossing.index,

                "sign":
                    crossing.sign,

                "Xcomponent":
                    crossing.Xcomponent,

                "Ycomponent":
                    crossing.Ycomponent,

                "neighbor":
                    crossing.neighbor,

                "strand":
                    crossing.strand,
            }
        )


if __name__ == "__main__":
    main()
