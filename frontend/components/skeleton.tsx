import "./account.css";

export function ProductCardSkeleton() {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: 18,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
      aria-hidden="true"
    >
      <div className="skeleton-box" style={{ height: 180, width: "100%" }} />
      <div className="skeleton-box" style={{ height: 14, width: "40%" }} />
      <div className="skeleton-box" style={{ height: 20, width: "85%" }} />
      <div className="skeleton-box" style={{ height: 16, width: "60%" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <div className="skeleton-box" style={{ height: 24, width: "45%" }} />
        <div className="skeleton-box" style={{ height: 32, width: 32, borderRadius: 8 }} />
      </div>
    </div>
  );
}

export function SetupCardSkeleton() {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: 18,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      aria-hidden="true"
    >
      <div className="skeleton-box" style={{ height: 220, width: "100%", borderRadius: 0 }} />
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="skeleton-box" style={{ height: 20, width: "80%" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="skeleton-box" style={{ width: 28, height: 28, borderRadius: "50%" }} />
          <div className="skeleton-box" style={{ height: 14, width: "50%" }} />
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <div className="skeleton-box" style={{ height: 20, width: 60 }} />
          <div className="skeleton-box" style={{ height: 20, width: 70 }} />
        </div>
      </div>
    </div>
  );
}
