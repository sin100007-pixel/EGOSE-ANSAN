"use client";

import { useEffect, useState } from "react";

type Product = {
  id: number;
  manufacturer: string;
  product_code_1: string | null;
  product_code_2: string | null;
  color_name: string | null;
  full_name: string | null;
  category_main: string | null;
  category_sub: string | null;
  non_fire_consumer_price: number | null;
  fire_consumer_price: number | null;
  non_fire_installer_price: number | null;
  fire_installer_price: number | null;
  non_fire_dealer_price: number | null;
  fire_dealer_price: number | null;
  image_url: string | null;
};

const formatPrice = (price: number | null) => {
  return typeof price === "number" ? `${price.toLocaleString()}원` : "";
};

const hasText = (value: string | null | undefined) => {
  return typeof value === "string" && value.trim() !== "";
};

export default function ProductTestPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openedImage, setOpenedImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!openedImage) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenedImage(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openedImage]);

  const search = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "검색 중 오류가 발생했습니다.");
        setItems([]);
        return;
      }

      setItems(json.items || []);
    } catch {
      setError("검색 중 오류가 발생했습니다.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
          제품 검색 테스트
        </h1>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
            placeholder="예: 122 / SG122 / SF122 / 도브화이트"
            style={{
              flex: 1,
              border: "1px solid #ccc",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 16,
            }}
          />
          <button
            onClick={search}
            style={{
              border: "1px solid #111",
              borderRadius: 8,
              padding: "10px 16px",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            검색
          </button>
        </div>

        <div style={{ marginBottom: 12, color: "#666", fontSize: 14 }}>
          예: 122 / SG122 / SF122 / NG2051 / 도브화이트
        </div>

        {loading && <p>검색 중...</p>}
        {error && <p style={{ color: "crimson" }}>{error}</p>}

        {!loading && !error && items.length === 0 && q.trim() !== "" && (
          <p>검색 결과가 없습니다.</p>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {items.map((item) => {
            const title = item.full_name || item.product_code_1 || item.color_name || "이름 없음";

            const rows = [
              hasText(item.manufacturer) ? { label: "회사", value: item.manufacturer.trim() } : null,
              hasText(item.product_code_1) ? { label: "코드1", value: item.product_code_1!.trim() } : null,
              hasText(item.product_code_2) ? { label: "코드2", value: item.product_code_2!.trim() } : null,
              hasText(item.color_name) ? { label: "색상명", value: item.color_name!.trim() } : null,
              hasText(item.category_main) ? { label: "대분류", value: item.category_main!.trim() } : null,
              hasText(item.category_sub) ? { label: "소분류", value: item.category_sub!.trim() } : null,
              item.non_fire_consumer_price !== null ? { label: "비방염 소비자가", value: formatPrice(item.non_fire_consumer_price) } : null,
              item.fire_consumer_price !== null ? { label: "방염 소비자가", value: formatPrice(item.fire_consumer_price) } : null,
              item.non_fire_installer_price !== null ? { label: "비방염 시공자가", value: formatPrice(item.non_fire_installer_price) } : null,
              item.fire_installer_price !== null ? { label: "방염 시공자가", value: formatPrice(item.fire_installer_price) } : null,
              item.non_fire_dealer_price !== null ? { label: "비방염 대리점가", value: formatPrice(item.non_fire_dealer_price) } : null,
              item.fire_dealer_price !== null ? { label: "방염 대리점가", value: formatPrice(item.fire_dealer_price) } : null,
            ].filter(Boolean) as Array<{ label: string; value: string }>;

            return (
              <div
                key={item.id}
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                {item.image_url ? (
                  <button
                    type="button"
                    onClick={() => setOpenedImage({ src: item.image_url!, alt: title })}
                    aria-label={`${title} 큰 이미지 보기`}
                    style={{
                      width: 96,
                      height: 96,
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      cursor: "zoom-in",
                      borderRadius: 8,
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={item.image_url}
                      alt={title}
                      style={{
                        width: 96,
                        height: 96,
                        objectFit: "cover",
                        borderRadius: 8,
                        border: "1px solid #eee",
                        display: "block",
                      }}
                    />
                  </button>
                ) : (
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 8,
                      border: "1px solid #eee",
                      background: "#f5f5f5",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 12,
                      color: "#666",
                      flexShrink: 0,
                    }}
                  >
                    이미지 없음
                  </div>
                )}

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
                    {title}
                  </div>
                  {rows.map((row) => (
                    <div key={row.label}>
                      {row.label}: {row.value}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {openedImage && (
        <div
          onClick={() => setOpenedImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "92vw",
              maxHeight: "90vh",
              background: "#111",
              borderRadius: 16,
              padding: 14,
              boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
            }}
          >
            <button
              type="button"
              onClick={() => setOpenedImage(null)}
              aria-label="닫기"
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 36,
                height: 36,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.45)",
                color: "#fff",
                fontSize: 20,
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>
            <img
              src={openedImage.src}
              alt={openedImage.alt}
              style={{
                display: "block",
                maxWidth: "calc(92vw - 28px)",
                maxHeight: "calc(90vh - 28px)",
                width: "auto",
                height: "auto",
                borderRadius: 12,
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
