import LayoutWrapper from "@/components/LayoutWrapper";
import FigureEightProjectionLab from "./FigureEightProjectionLab";

export const metadata = {
  title: "Figure-Eight S3 Projection Lab | Physics Monastery",
  description:
    "Interactive exploration of stereographic projections of a fixed tubular figure-eight knot in S3.",
};

export default function FigureEightProjectionLabPage() {
  return (
    <LayoutWrapper>
      <div
        style={{
          position: "relative",
          minHeight: "100vh",
          width: "100%",
          backgroundImage:
            "url('/physics_monastery_background.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
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
          <FigureEightProjectionLab />
        </div>
      </div>
    </LayoutWrapper>
  );
}
