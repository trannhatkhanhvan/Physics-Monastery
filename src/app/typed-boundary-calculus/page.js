import LayoutWrapper from "@/components/LayoutWrapper";
import TypedBoundaryExplorer from "./TypedBoundaryExplorer";

export const metadata = {
  title: "Typed Boundary Calculus | Physics Monastery",
  description: "Interactive Unit Model for six-axis dimensional addresses, route families, and projected type-lattice motion.",
};

export default function TypedBoundaryCalculusPage() {
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
        <TypedBoundaryExplorer />
      </div>
    </LayoutWrapper>
  );
}
