export default function DashboardLoading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#0F0C2E",
        color: "#fff",
      }}
    >
      <div
        style={{
          minWidth: 260,
          maxWidth: 360,
          borderRadius: 24,
          padding: "24px 22px",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.32)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            margin: "0 auto 14px",
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.18)",
            borderTopColor: "#f7b6c8",
            animation: "dashboardSpin 0.8s linear infinite",
          }}
        />

        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            marginBottom: 8,
          }}
        >
          대시보드 불러오는 중...
        </div>

        <div
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.72)",
          }}
        >
          잠시만 기다려주세요.
        </div>
      </div>

      <style jsx>{`
        @keyframes dashboardSpin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}
