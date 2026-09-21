import LayoutWrapper from "../../components/LayoutWrapper";
import G288Viewer from "./G288Viewer";

export const metadata = {
  title: "Quaternionic 288-Group",
};

export default function Quaternionic288GroupPage() {
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
          <G288Viewer />
        </div>
      </div>
    </LayoutWrapper>
  );
}
