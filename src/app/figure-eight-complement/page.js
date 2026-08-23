import { cookies } from "next/headers";
import LayoutWrapper from "@/components/LayoutWrapper";
import ClosedManifoldViewer from "./ClosedManifoldViewer";

const CLOSED_MANIFOLD_DIMENSION_COOKIE_KEY =
  "physics_monastery_closed_manifold_dimension";

function isClosedManifoldDimension(value) {
  return (
    value === "1D" ||
    value === "2D" ||
    value === "3D"
  );
}

export const metadata = {
  title: "Closed Manifold Identifications | Physics Monastery",
  description:
    "An interactive viewer for constructing closed spaces through geometric identification rules.",
};

export default async function FigureEightComplementPage() {
  const cookieStore = await cookies();

  const storedDimension =
    cookieStore.get(
      CLOSED_MANIFOLD_DIMENSION_COOKIE_KEY
    )?.value ?? null;

  const initialDimension =
    isClosedManifoldDimension(
      storedDimension
    )
      ? storedDimension
      : null;

  return (
    <LayoutWrapper>
      <div
        className="symbol-overlay"
        style={{
          left: 0,
          width: "100vw",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
        }}
      >
        <ClosedManifoldViewer
          initialDimension={initialDimension}
        />
      </div>
    </LayoutWrapper>
  );
}
