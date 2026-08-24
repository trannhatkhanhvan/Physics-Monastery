import LayoutWrapper from "@/components/LayoutWrapper";
import ClosedManifoldViewer from "./ClosedManifoldViewer";

export const metadata = {
  title: "Closed Manifold Identifications | Physics Monastery",
  description:
    "An interactive viewer for constructing closed spaces through geometric identification rules.",
};

function validDimension(value) {
  return (
    value === "1D" ||
    value === "2D" ||
    value === "3D"
  );
}

export default async function FigureEightComplementPage({
  searchParams,
}) {
  const params =
    await searchParams;

  const requestedDimension =
    params?.dimension;

  const initialDimension =
    validDimension(
      requestedDimension
    )
      ? requestedDimension
      : "1D";

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
          initialDimension={
            initialDimension
          }
        />
      </div>
    </LayoutWrapper>
  );
}
