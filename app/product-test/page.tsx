"use client";

import { useState } from "react";

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
  return typeof price === "number" ? `${price.toLocaleString()}원` : "-";
};

export default function ProductTestPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    } catch (e) {
      setError("검색 중 오류가 발생했습니다.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
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
          placeholder="제품코드 또는 색상명 입력"
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
        예: 122 / NG/NF 2051 / 브릭 / 도브화이트
      </div>

      {loading && <p>검색 중...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!loading && !error && items.length === 0 && q.trim() !== "" && (
        <p>검색 결과가 없습니다.</p>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item) => {
          const title = item.full_name || item.product_code_1 || item.color_name || "이름 없음";

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
                <img
                  src={item.image_url}
                  alt={title}
                  style={{
                    width: 96,
                    height: 96,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid #eee",
                    flexShrink: 0,
                  }}
                />
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
                <div>회사: {item.manufacturer || "-"}</div>
                <div>코드1: {item.product_code_1 || "-"}</div>
                <div>코드2: {item.product_code_2 || "-"}</div>
                <div>색상명: {item.color_name || "-"}</div>
                <div>대분류: {item.category_main || "-"}</div>
                <div>소분류: {item.category_sub || "-"}</div>
                <div>비방염 소비자가: {formatPrice(item.non_fire_consumer_price)}</div>
                <div>방염 소비자가: {formatPrice(item.fire_consumer_price)}</div>
                <div>비방염 시공자가: {formatPrice(item.non_fire_installer_price)}</div>
                <div>방염 시공자가: {formatPrice(item.fire_installer_price)}</div>
                <div>비방염 대리점가: {formatPrice(item.non_fire_dealer_price)}</div>
                <div>방염 대리점가: {formatPrice(item.fire_dealer_price)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
