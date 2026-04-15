import BottomQuickNav from "@/app/components/BottomQuickNav";
import ProductCatalogClient from "./ProductCatalogClient";

export const runtime = "nodejs";
export const dynamic = "force-static";

export default function ProductsPage() {
  const COLORS = {
    bgTop: "#0F0C2E",
    bgBottom: "#07061B",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(circle at 18% 0%, rgba(78,64,169,0.30), transparent 30%),
          radial-gradient(circle at 85% 18%, rgba(42,73,166,0.22), transparent 28%),
          linear-gradient(180deg, ${COLORS.bgTop} 0%, ${COLORS.bgBottom} 100%)
        `,
      }}
    >
      <div
        style={{
          maxWidth: 460,
          margin: "0 auto",
          padding: "18px 14px 210px",
        }}
      >
        <ProductCatalogClient />
      </div>

      <BottomQuickNav current="products" />
    </main>
  );
}
