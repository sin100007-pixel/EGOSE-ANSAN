// app/dashboard/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SaveName from "../components/SaveName";
import LogoutButton from "../components/LogoutButton";
import ProductPreview from "../product-preview";

// 로그인 페이지와 동일한 컬러/스타일
const BTN_BLUE = "#0019C9";
const BTN_BLUE_HOVER = "#1326D9";

const buttonStyle: React.CSSProperties = {
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
};

export default async function DashboardPage() {
  // 1) 세션 쿠키 확인
  const sessionCookie = cookies().get("session_user");
  if (!sessionCookie) redirect("/");

  // 2) 이름 복원
  const name = decodeURIComponent(sessionCookie.value || "");

  // 3) 사용자 조회
  const user = await prisma.user.findFirst({ where: { name } });
  if (!user) redirect("/");

  return (
    <>
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

        {/* 로그인 버튼과 동일한 크기/모양의 로그아웃 버튼 */}
        <div style={{ marginTop: 16 }}>
          <LogoutButton style={buttonStyle} hoverColor={BTN_BLUE_HOVER} />
        </div>

        {/* 로그인 페이지와 동일한 스타일의 '판매중인 상품 보기' */}
        <div style={{ marginTop: 8 }}>
          <ProductPreview
            primaryButtonStyle={buttonStyle}
            primaryButtonHover={BTN_BLUE_HOVER}
          />
        </div>
      </div>
    </>
  );
}