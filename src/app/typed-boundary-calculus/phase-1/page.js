import LayoutWrapper from "@/components/LayoutWrapper";
import MoveSpaceViewer from "./MoveSpaceViewer";

export const metadata = {
  title: "Typed Boundary Calculus: Move Space | Physics Monastery",
  description:
    "A six-axis step-forward and step-backward typed lattice viewer built from adjacent unit swaps.",
};

export default function TypedBoundaryCalculusPhaseOnePage() {
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
        <MoveSpaceViewer />
      </div>
    </LayoutWrapper>
  );
}
