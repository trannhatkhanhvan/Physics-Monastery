export default function ClosedFormMaintenance() {
  return (
    <main style={{
      minHeight: "65vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
      textAlign: "center"
    }}>
      <div style={{ maxWidth: 650 }}>
        <h1>Closed-Form Explorer</h1>
        <p style={{
          fontSize: 20,
          lineHeight: 1.7,
          marginTop: 24
        }}>
          The Closed-Form Explorer is temporarily unavailable
          while we upgrade its computational engine.
        </p>
        <p>Thank you for your patience.</p>
      </div>
    </main>
  );
}
