// app/dashboard/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SaveName from "@/app/components/SaveName";
import LogoutButton from "@/app/components/LogoutButton";
import ProductPreview from "@/app/product-preview";

// 로그인 페이지와 동일한 버튼 컬러
const BTN_BLUE = "#0019C9";
const BTN_BLUE_HOVER = "#1326D9";

export default async function DashboardPage() {
  // 1) 세션 확인
  const sessionCookie = cookies().get("session_user");
  if (!sessionCookie) redirect("/");

  // 2) 쿠키에 저장된 이름 복원
  const name = decodeURIComponent(sessionCookie.value || "");

  // 3) 사용자 조회
  const user = await prisma.user.findFirst({ where: { name } });
  if (!user) redirect("/");

  return (
    <>
      {/* 로컬스토리지 백업(자동 복구용) */}
      <SaveName name={name} />

      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          {name}님의 QR
        </h1>

        <img
          src={user.qrUrl}
          alt="QR"
          style={{
            width: 260,
            height: 260,
            objectFit: "contain",
            background: "#111",
            borderRadius: 12,
          }}
        />

        <p style={{ marginTop: 12, opacity: 0.8 }}>
          전화번호 뒷자리: {user.phoneLast4}
        </p>

        {/* 로그아웃 버튼 */}
        <p style={{ marginTop: 16 }}>
          <LogoutButton />
        </p>

        {/* ───────────────────────────────────────────── */}
        {/* 판매중인 상품보기 (로그아웃 버튼 아래) */}
        <div style={{ marginTop: 24 }}>
          <ProductPreview
            primaryButtonStyle={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              padding: 12,
              margin: "0 0 12px 0",
              borderRadius: 10,
              border: "1px solid transparent",
              background: BTN_BLUE,
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
            }}
            primaryButtonHover={BTN_BLUE_HOVER}
          />
        </div>
        {/* ───────────────────────────────────────────── */}
      </div>
    </>
  );
}