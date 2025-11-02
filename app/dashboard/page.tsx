// app/dashboard/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductToggle from "@/app/components/ProductToggle";

// Prisma는 Edge에서 동작하지 않으므로 Node 런타임으로 고정
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // 1) 세션 확인
  const sessionCookie = cookies().get("session_user");
  if (!sessionCookie) redirect("/");
  const name = decodeURIComponent(sessionCookie.value || "");

  // 2) 사용자 조회
  const user = await prisma.user.findFirst({ where: { name } });
  if (!user) redirect("/");

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "24px 16px 80px",
        color: "#fff",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>{name}님의 QR</h1>

      {/* QR + 전화번호 */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div
          style={{
            width: 260,
            borderRadius: 12,
            overflow: "hidden",
            background: "#111",
          }}
        >
          <img
            src={user.qrUrl}
            alt="QR"
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </div>
        <div style={{ alignSelf: "center" }}>
          <p style={{ opacity: 0.9, marginTop: 8 }}>전화번호 뒷자리: {user.phoneLast4}</p>
        </div>
      </div>

      {/* 버튼 영역 */}
      <section style={{ marginTop: 24 }}>
        {/* 로그아웃 (서버 컴포넌트에서는 이벤트 핸들러 X) */}
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              padding: 12,
              margin: "0 0 12px 0",
              borderRadius: 12,
              border: "1px solid transparent",
              background: "#1739f7",
              color: "#ffffff",
              fontWeight: 700,
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            로그아웃
          </button>
        </form>

        {/* 카카오 채팅문의 */}
        <a
          href="https://pf.kakao.com/_YOUR_CHANNEL" // ← 본인 채널 링크로 교체
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: "none" }}
        >
          <button
            type="button"
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              padding: 12,
              margin: "0 0 12px 0",
              borderRadius: 12,
              border: "1px solid transparent",
              background: "#1739f7",
              color: "#ffffff",
              fontWeight: 700,
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            카카오 채팅문의
          </button>
        </a>

        {/* ✅ 판매중인 상품 보기 토글 (서버→클라로 props/이벤트 전달 안 함) */}
        <ProductToggle />
      </section>
    </main>
  );
}