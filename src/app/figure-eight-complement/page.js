import LayoutWrapper from "@/components/LayoutWrapper";
import ClosedManifoldViewer from "./ClosedManifoldViewer";

export const metadata = {
  title: "Closed Manifold Identifications | Physics Monastery",
  description:
    "An interactive viewer for constructing closed spaces through geometric identification rules.",
};

export default function FigureEightComplementPage() {
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
        <ClosedManifoldViewer />
      </div>
    </LayoutWrapper>
  );
}
