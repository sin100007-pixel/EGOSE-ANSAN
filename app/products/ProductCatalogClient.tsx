"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { PRODUCT_CATALOGS, ProductCatalog } from "./productCatalogData";

type BrandKey = "all" | "samsung" | "younglim" | "yelim";

function formatPrice(price: number | null) {
  if (price == null) return "";
  return Number.isInteger(price) ? String(price) : String(price);
}

function getTableMetrics(catalog: ProductCatalog, dense = false) {
  const cellWidth = dense ? 96 : 112;
  const headerHeight = dense ? 48 : 54;
  const codeHeight = dense ? 42 : 48;
  const priceHeight = dense ? 30 : 34;
  const visibleRowCount = catalog.rows.filter((row) => row.some((cell) => cell.code)).length;

  return {
    width: catalog.cols * cellWidth,
    height: headerHeight + visibleRowCount * (codeHeight + priceHeight),
    cellWidth,
    codeFont: dense ? 19: 21,
    priceFont: dense ? 18 : 20,
    headerFont: dense ? 15 : 17,
    headerPadding: dense ? "12px 8px" : "14px 10px",
    codeHeight,
    priceHeight,
  };
}

function CatalogTableMarkup({
  catalog,
  dense = false,
}: {
  catalog: ProductCatalog;
  dense?: boolean;
}) {
  const metrics = getTableMetrics(catalog, dense);

  return (
    <table
      style={{
        borderCollapse: "collapse",
        minWidth: metrics.width,
        width: metrics.width,
        tableLayout: "fixed",
        background: "#FFFFFF",
      }}
    >
      <thead>
        <tr>
          <th
            colSpan={catalog.cols}
            style={{
              border: "1px solid #DB1F2A",
              borderBottom: "1px solid #B8B8B8",
              background: "#EFE8D8",
              color: "#101010",
              fontSize: metrics.headerFont,
              fontWeight: 900,
              padding: metrics.headerPadding,
              letterSpacing: "-0.03em",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            {catalog.title} {catalog.meta}
          </th>
        </tr>
      </thead>
      <tbody>
        {catalog.rows.map((row, rowIndex) => {
          const hasAnyCode = row.some((cell) => cell.code);
          if (!hasAnyCode) return null;

          return (
            <React.Fragment key={`${catalog.key}-${rowIndex}`}>
              <tr>
                {row.map((cell, index) => {
                  const isEmpty = !cell.code;
                  return (
                    <td
                      key={`code-${rowIndex}-${index}`}
                      style={{
                        width: metrics.cellWidth,
                        height: metrics.codeHeight,
                        border: index === 0 ? "1px solid #DB1F2A" : "1px solid #D1D1D1",
                        borderRight:
                          index === row.length - 1 ? "1px solid #DB1F2A" : "1px solid #D1D1D1",
                        borderTop: rowIndex === 0 ? "1px solid #DB1F2A" : "1px solid #D1D1D1",
                        background: isEmpty ? "#F4F4F4" : "#D9D9D9",
                        color: "#111111",
                        textAlign: "center",
                        verticalAlign: "middle",
                        padding: "6px 4px",
                        fontSize: metrics.codeFont,
                        fontWeight: 800,
                        lineHeight: 1.1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cell.code ?? ""}
                    </td>
                  );
                })}
              </tr>
              <tr>
                {row.map((cell, index) => {
                  const isEmpty = !cell.code && cell.price == null;
                  return (
                    <td
                      key={`price-${rowIndex}-${index}`}
                      style={{
                        width: metrics.cellWidth,
                        height: metrics.priceHeight,
                        borderLeft: index === 0 ? "1px solid #DB1F2A" : "1px solid #D1D1D1",
                        borderRight:
                          index === row.length - 1 ? "1px solid #DB1F2A" : "1px solid #D1D1D1",
                        borderBottom:
                          rowIndex === catalog.rows.length - 1
                            ? "1px solid #DB1F2A"
                            : "1px solid #D1D1D1",
                        borderTop: "none",
                        background: isEmpty ? "#F8F8F8" : "#FFFFFF",
                        color: "#111111",
                        textAlign: "center",
                        verticalAlign: "middle",
                        padding: "4px 4px 6px",
                        fontSize: metrics.priceFont,
                        fontWeight: 700,
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatPrice(cell.price)}
                    </td>
                  );
                })}
              </tr>
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function ScaledCatalogPreview({
  catalog,
}: {
  catalog: ProductCatalog;
}) {
  const PREVIEW_BOTTOM_BUFFER = 0;

  const frameRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState<number | null>(null);
  const metrics = useMemo(() => getTableMetrics(catalog, false), [catalog]);

  useEffect(() => {
    const updateScale = () => {
      const frame = frameRef.current;
      const content = contentRef.current;
      if (!frame || !content) return;

      const frameWidth = Math.max(frame.clientWidth, 1);
      const nextScale = frameWidth / metrics.width;
      const actualHeight = Math.max(content.scrollHeight, metrics.height);

      setScale(nextScale);
      setScaledHeight(Math.ceil(actualHeight * nextScale) + PREVIEW_BOTTOM_BUFFER);
    };

    updateScale();

    const observer = new ResizeObserver(() => {
      updateScale();
    });

    if (frameRef.current) observer.observe(frameRef.current);
    if (contentRef.current) observer.observe(contentRef.current);

    window.addEventListener("resize", updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [metrics.height, metrics.width]);

  return (
    <div
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
      }}
    >
      <div
        ref={frameRef}
        style={{
          overflow: "hidden",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.02)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            height: scaledHeight ?? undefined,
            minHeight: 90,
            position: "relative",
          }}
        >
          <div
            ref={contentRef}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: metrics.width,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <CatalogTableMarkup catalog={catalog} dense={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FullscreenHeightFitCatalogTable({
  catalog,
}: {
  catalog: ProductCatalog;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const metrics = useMemo(() => getTableMetrics(catalog, false), [catalog]);

  const [scale, setScale] = useState(1);
  const [scaledWidth, setScaledWidth] = useState(metrics.width);
  const [scaledHeight, setScaledHeight] = useState(metrics.height);

  useEffect(() => {
    const updateScale = () => {
      const frame = frameRef.current;
      const content = contentRef.current;
      if (!frame || !content) return;

      const availableHeight = Math.max(frame.clientHeight, 1);
      const actualHeight = Math.max(content.scrollHeight, metrics.height);
      const actualWidth = metrics.width;

      // 크게 보기에서는 높이에 맞춰 축소해서 모든 행이 처음부터 보이게 함
      const nextScale = Math.min(1, availableHeight / actualHeight);

      setScale(nextScale);
      setScaledWidth(Math.ceil(actualWidth * nextScale));
      setScaledHeight(Math.ceil(actualHeight * nextScale));
    };

    updateScale();

    const observer = new ResizeObserver(() => {
      updateScale();
    });

    if (frameRef.current) observer.observe(frameRef.current);
    if (contentRef.current) observer.observe(contentRef.current);

    window.addEventListener("resize", updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [metrics.height, metrics.width]);

  return (
    <div
      ref={frameRef}
      style={{
        height: "100%",
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-x pan-y pinch-zoom",
      }}
    >
      <div
        style={{
          width: scaledWidth,
          height: scaledHeight,
          minWidth: scaledWidth,
          position: "relative",
        }}
      >
        <div
          ref={contentRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: metrics.width,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <CatalogTableMarkup catalog={catalog} dense={false} />
        </div>
      </div>
    </div>
  );
}

function CatalogSection({
  catalog,
  onOpen,
}: {
  catalog: ProductCatalog;
  onOpen: () => void;
}) {
  return (
    <section
      style={{
        borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(17, 14, 61, 0.92)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.24)",
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              color: "#FFFFFF",
              fontSize: 18,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: 4,
            }}
          >
            {catalog.title}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.72)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {catalog.meta}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          style={{
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.08)",
            color: "#FFFFFF",
            borderRadius: 999,
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 800,
            whiteSpace: "nowrap",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          크게 보기
        </button>
      </div>

      <div
        style={{
          color: "rgba(255,255,255,0.72)",
          fontSize: 12,
          lineHeight: 1.45,
          marginBottom: 10,
        }}
      >
        크게 보기를 눌러 더 크게 보실 수 있고. 일반적인 휴대폰 확대 제스처(두손가락을 벌리는 제스처)로도 확대하실 수 있습니다.
      </div>

      <ScaledCatalogPreview catalog={catalog} />
    </section>
  );
}

function FullscreenViewer({
  catalog,
  onClose,
}: {
  catalog: ProductCatalog;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(5, 6, 24, 0.94)",
        backdropFilter: "blur(6px)",
        padding: "16px 12px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          height: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                color: "#FFFFFF",
                fontSize: 22,
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                marginBottom: 4,
              }}
            >
              {catalog.title}
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.72)",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {catalog.meta}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              color: "#FFFFFF",
              fontSize: 22,
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
            }}
            aria-label="크게 보기 닫기"
          >
            ×
          </button>
        </div>

        <div
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
        
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(15, 15, 32, 0.72)",
            padding: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ height: "100%" }}>
            <FullscreenHeightFitCatalogTable catalog={catalog} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductCatalogClient() {
  const [tab, setTab] = useState<BrandKey>("all");
  const [expanded, setExpanded] = useState<Exclude<BrandKey, "all"> | null>(null);

  const visibleCatalogs = useMemo(() => {
    if (tab === "all") return PRODUCT_CATALOGS;
    return PRODUCT_CATALOGS.filter((catalog) => catalog.key === tab);
  }, [tab]);

  const expandedCatalog = expanded
    ? PRODUCT_CATALOGS.find((catalog) => catalog.key === expanded) ?? null
    : null;

  const tabButton = (key: BrandKey, label: string) => {
    const active = tab === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setTab(key)}
        style={{
          borderRadius: 999,
          border: active ? "1px solid rgba(255,255,255,0.28)" : "1px solid rgba(255,255,255,0.12)",
          background: active ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.05)",
          color: "#FFFFFF",
          padding: "10px 14px",
          fontSize: 14,
          fontWeight: 900,
          lineHeight: 1,
          cursor: "pointer",
          boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.14)" : "none",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <>
      <section
        style={{
          marginBottom: 14,
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(17, 14, 61, 0.92)",
          boxShadow: "0 18px 50px rgba(0,0,0,0.24)",
          padding: 16,
        }}
      >
        <div
          style={{
            color: "#FFFFFF",
            fontSize: 24,
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: "-0.04em",
            marginBottom: 8,
          }}
        >
          런던마켓 진열 제품 일람
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.76)",
            fontSize: 13,
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          무인 마켓인 런던마켓에 진열되있는 제품의 일람입니다. 표에 기재된 순서로 런던마켓에 진열되어있습니다. 
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {tabButton("all", "전체")}
          {tabButton("samsung", "삼성")}
          {tabButton("younglim", "영림")}
          {tabButton("yelim", "예림")}
        </div>
      </section>

      <div style={{ display: "grid", gap: 14 }}>
        {visibleCatalogs.map((catalog) => (
          <CatalogSection
            key={catalog.key}
            catalog={catalog}
            onOpen={() => setExpanded(catalog.key)}
          />
        ))}
      </div>

      {expandedCatalog ? (
        <FullscreenViewer catalog={expandedCatalog} onClose={() => setExpanded(null)} />
      ) : null}
    </>
  );
}