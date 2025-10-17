export default function Fallback500() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700 }}>Server error</h1>
      <p style={{ maxWidth: "32rem", color: "hsl(240 4% 46%)" }}>
        Something went wrong on our end. Please refresh the page or come back later.
      </p>
    </div>
  );
}
