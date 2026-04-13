"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";

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

type PriceItem = {
  label: string;
  value: string;
};

const THEME_COLOR = "#EEE0C5";
const BROWN = "#7A5A34";
const PAGE_BG = "#05023B";
const CARD_BG = "rgba(12, 10, 72, 0.72)";
const CARD_BORDER = "rgba(238, 224, 197, 0.18)";
const TEXT_SUB = "rgba(255,255,255,0.72)";
const WATERMARK_SRC = "/filmbot-watermark.png";

const RECENT_SEARCH_KEY = "filmbot_recent_searches";
const MAX_RECENT_SEARCHES = 6;
const TUTORIAL_STORAGE_KEY = "filmbot_tutorial_seen_v1";

const formatPrice = (price: number | null) => {
  return typeof price === "number" ? `${price.toLocaleString()}원` : "";
};

const hasText = (value: string | null | undefined) => {
  return typeof value === "string" && value.trim() !== "";
};

const waitForImageLoad = (src: string) =>
  new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;

    if (image.complete) {
      resolve();
    }
  });

const getVisiblePrices = (
  item: Product,
  hideConsumerPrice: boolean,
  hideInstallerPrice: boolean
): PriceItem[] => {
  return [
    !hideConsumerPrice && item.non_fire_consumer_price !== null
      ? { label: "비방염 소비자가", value: formatPrice(item.non_fire_consumer_price) }
      : null,
    !hideConsumerPrice && item.fire_consumer_price !== null
      ? { label: "방염 소비자가", value: formatPrice(item.fire_consumer_price) }
      : null,
    !hideInstallerPrice && item.non_fire_installer_price !== null
      ? { label: "비방염 시공자가", value: formatPrice(item.non_fire_installer_price) }
      : null,
    !hideInstallerPrice && item.fire_installer_price !== null
      ? { label: "방염 시공자가", value: formatPrice(item.fire_installer_price) }
      : null,
    item.non_fire_dealer_price !== null
      ? { label: "비방염 대리점가", value: formatPrice(item.non_fire_dealer_price) }
      : null,
    item.fire_dealer_price !== null
      ? { label: "방염 대리점가", value: formatPrice(item.fire_dealer_price) }
      : null,
  ].filter(Boolean) as PriceItem[];
};

export default function ProductTestPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openedImage, setOpenedImage] = useState<{ src: string; alt: string } | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hideConsumerPrice, setHideConsumerPrice] = useState(true);
  const [hideInstallerPrice, setHideInstallerPrice] = useState(true);

  const [basketItems, setBasketItems] = useState<Product[]>([]);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const basketExportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (openedImage) {
        setOpenedImage(null);
        return;
      }

      if (isBasketOpen) {
        setIsBasketOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openedImage, isBasketOpen]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCH_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter((v) => typeof v === "string"));
      }
    } catch {
      // 무시
    }
  }, []);

  useEffect(() => {
    try {
      const tutorialSeen = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!tutorialSeen) {
        setIsTutorialOpen(true);
      }
    } catch {
      setIsTutorialOpen(true);
    }
  }, []);

  const tutorialSteps = [
    {
      icon: "🔎",
      title: "1. 원하는 필름을 빠르게 검색해보세요",
      description:
        "숫자만 입력하거나, 코드 또는 색상명으로도 검색할 수 있어요. 예: 122 / SG122 / SF122 / 도브화이트",
      tip: "검색창에 입력 후 검색 버튼을 누르거나 Enter를 누르면 바로 결과를 볼 수 있어요.",
      actionLabel: "예시 검색어 넣기",
      onAction: () => setQ("122"),
    },
    {
      icon: "🖼️",
      title: "2. 제품 이미지는 눌러서 크게 볼 수 있어요",
      description:
        "검색 결과 카드의 이미지를 누르면 큰 사진으로 열립니다. 실제 시공 전 색감과 결을 더 편하게 확인할 수 있어요.",
      tip: "전체 화면으로 열린 뒤 바깥 영역이나 × 버튼을 누르면 닫을 수 있어요.",
      actionLabel: null,
      onAction: null,
    },
    {
      icon: "⚙️",
      title: "3. 가격은 필요할 때만 표시할 수 있어요",
      description:
        "지금은 소비자가와 시공자가가 기본으로 숨겨져 있어요. 검색 설정을 열어 보고 싶은 가격만 표시해보세요.",
      tip: "불필요한 가격 노출을 줄이기 위해 기본값은 숨김으로 맞춰져 있어요.",
      actionLabel: "검색 설정 열기",
      onAction: () => setIsSettingsOpen(true),
    },
    {
      icon: "➕",
      title: "4. 마음에 드는 필름은 + 버튼으로 담아두세요",
      description:
        "검색 결과 카드 오른쪽 위의 + 버튼을 누르면 필름바구니에 담깁니다. 다시 누르면 바로 뺄 수 있어요.",
      tip: "여러 제품을 한 번에 비교하고 싶을 때 가장 유용한 기능이에요.",
      actionLabel: null,
      onAction: null,
    },
    {
      icon: "🧺",
      title: "5. 필름바구니에서 모아보고 이미지로 저장하세요",
      description:
        "오른쪽 위 필름바구니 버튼을 누르면 담아둔 필름을 한 번에 볼 수 있어요. 바구니 안에서 이미지 저장도 가능합니다.",
      tip: "고객과 공유할 때는 바구니에 담은 뒤 이미지 저장을 누르면 편해요.",
      actionLabel: "필름바구니 열기",
      onAction: () => setIsBasketOpen(true),
    },
  ] as const;

  const currentTutorial = tutorialSteps[tutorialStep];

  const openTutorial = (step = 0) => {
    setTutorialStep(step);
    setIsTutorialOpen(true);
  };

  const closeTutorial = () => {
    setIsTutorialOpen(false);

    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, "seen");
    } catch {
      // 무시
    }
  };

  const saveRecentSearch = (term: string) => {
    const normalized = term.trim();
    if (!normalized) return;

    setRecentSearches((prev) => {
      const next = [
        normalized,
        ...prev.filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
      ].slice(0, MAX_RECENT_SEARCHES);

      try {
        localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
      } catch {
        // 무시
      }

      return next;
    });
  };

  const search = async (keyword = q) => {
    const normalized = keyword.trim();

    if (!normalized) {
      setItems([]);
      setError("");
      setLoading(false);
      return;
    }

    saveRecentSearch(normalized);

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(normalized)}`);
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

  const applyRecentSearch = (term: string) => {
    setQ(term);
    void search(term);
  };

  const isInBasket = (id: number) => {
    return basketItems.some((item) => item.id === id);
  };

  const toggleBasketItem = (product: Product) => {
    setBasketItems((prev) => {
      const alreadyExists = prev.some((item) => item.id === product.id);

      if (alreadyExists) {
        return prev.filter((item) => item.id !== product.id);
      }

      return [product, ...prev];
    });
  };

  const removeBasketItem = (id: number) => {
    setBasketItems((prev) => prev.filter((item) => item.id !== id));
  };

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveBasketAsImage = async () => {
    if (basketItems.length === 0) {
      window.alert("필름바구니에 담긴 필름이 없습니다.");
      return;
    }

    if (!basketExportRef.current) {
      window.alert("이미지로 저장할 영역을 찾을 수 없습니다.");
      return;
    }

    setIsExporting(true);

    try {
      await waitForImageLoad(WATERMARK_SRC);

      const dataUrl = await toPng(basketExportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: PAGE_BG,
      });

      const fileName = `filmbasket-${new Date().toISOString().slice(0, 10)}.png`;

      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: "image/png" });

        if (
          typeof navigator !== "undefined" &&
          "share" in navigator &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            files: [file],
            title: "필름바구니",
            text: "선택한 필름 목록입니다.",
          });
          return;
        }
      } catch {
        // 공유 실패 시 다운로드로 진행
      }

      downloadDataUrl(dataUrl, fileName);
    } catch {
      window.alert("이미지 저장 중 오류가 발생했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="basketFloatingButton"
        onClick={() => setIsBasketOpen((prev) => !prev)}
        aria-label="필름바구니 열기"
        style={{
          position: "fixed",
          top: 18,
          right: 18,
          zIndex: 5000,
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          border: "1px solid rgba(238,224,197,0.22)",
          borderRadius: 999,
          padding: "12px 16px",
          background: "rgba(10, 8, 72, 0.92)",
          color: THEME_COLOR,
          boxShadow: "0 14px 34px rgba(0,0,0,0.28)",
          backdropFilter: "blur(10px)",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 18 }}>🧺</span>
        <span style={{ fontSize: 14, fontWeight: 800 }}>필름바구니</span>
        <span
          style={{
            minWidth: 24,
            height: 24,
            padding: "0 7px",
            borderRadius: 999,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: THEME_COLOR,
            color: BROWN,
            fontSize: 12,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {basketItems.length}
        </span>
      </button>

      <div
        onClick={() => setIsBasketOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: isBasketOpen ? "rgba(0, 0, 0, 0.48)" : "rgba(0, 0, 0, 0)",
          opacity: isBasketOpen ? 1 : 0,
          pointerEvents: isBasketOpen ? "auto" : "none",
          transition: "opacity 0.24s ease, background 0.24s ease",
          zIndex: 4500,
        }}
      >
        <aside
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "min(420px, 92vw)",
            height: "100%",
            background: "linear-gradient(180deg, rgba(12,10,72,0.98) 0%, rgba(5,2,59,0.99) 100%)",
            borderLeft: "1px solid rgba(238,224,197,0.16)",
            boxShadow: "-18px 0 42px rgba(0,0,0,0.34)",
            transform: isBasketOpen ? "translateX(0)" : "translateX(104%)",
            transition: "transform 0.28s ease",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "22px 18px 14px",
              borderBottom: "1px solid rgba(238,224,197,0.10)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: THEME_COLOR,
                  lineHeight: 1.2,
                }}
              >
                필름바구니
              </div>

              <button
                type="button"
                onClick={() => setIsBasketOpen(false)}
                aria-label="필름바구니 닫기"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  border: "1px solid rgba(238,224,197,0.16)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                color: TEXT_SUB,
                fontSize: 14,
                lineHeight: 1.6,
                marginBottom: 12,
              }}
            >
              선택한 필름과 색상을 한 번에 모아볼 수 있어요.
            </div>

            <button
              type="button"
              className="saveBasketButton"
              onClick={() => void saveBasketAsImage()}
              disabled={isExporting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid rgba(238,224,197,0.20)",
                borderRadius: 999,
                padding: "10px 14px",
                background: "rgba(238,224,197,0.10)",
                color: THEME_COLOR,
                fontSize: 14,
                fontWeight: 800,
                cursor: isExporting ? "default" : "pointer",
                opacity: isExporting ? 0.7 : 1,
              }}
            >
              <span>🖼️</span>
              <span>{isExporting ? "이미지 생성 중..." : "이미지 저장"}</span>
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              alignItems: "stretch",
            }}
          >
            {basketItems.length === 0 ? (
              <div
                style={{
                  borderRadius: 22,
                  padding: "22px 18px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(238,224,197,0.10)",
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: THEME_COLOR,
                    marginBottom: 8,
                  }}
                >
                  아직 담긴 필름이 없어요
                </div>
                <div
                  style={{
                    color: TEXT_SUB,
                    lineHeight: 1.7,
                    fontSize: 14,
                  }}
                >
                  검색 결과 카드 오른쪽 위의 + 버튼을 눌러 원하는 필름을 담아보세요.
                </div>
              </div>
            ) : (
              basketItems.map((item) => {
                const title =
                  item.full_name || item.product_code_1 || item.color_name || "이름 없음";

                const basketMetaBadges = [
                  hasText(item.manufacturer)
                    ? { label: "제조사", value: item.manufacturer.trim() }
                    : null,
                  hasText(item.product_code_1)
                    ? { label: "코드1", value: item.product_code_1!.trim() }
                    : null,
                  hasText(item.product_code_2)
                    ? { label: "코드2", value: item.product_code_2!.trim() }
                    : null,
                  hasText(item.category_main)
                    ? { label: "대분류", value: item.category_main!.trim() }
                    : null,
                  hasText(item.category_sub)
                    ? { label: "소분류", value: item.category_sub!.trim() }
                    : null,
                ].filter(Boolean) as Array<{ label: string; value: string }>;

                return (
                  <article
                    key={`basket-${item.id}`}
                    style={{
                      borderRadius: 22,
                      padding: 14,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(238,224,197,0.12)",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "72px minmax(0, 1fr)",
                        gap: 12,
                        alignItems: "start",
                      }}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={title}
                          style={{
                            width: 72,
                            height: 72,
                            objectFit: "cover",
                            borderRadius: 14,
                            border: "1px solid rgba(238,224,197,0.14)",
                            background: "rgba(255,255,255,0.05)",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: 14,
                            border: "1px solid rgba(238,224,197,0.14)",
                            background: "rgba(255,255,255,0.05)",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 11,
                            color: TEXT_SUB,
                          }}
                        >
                          이미지 없음
                        </div>
                      )}

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 10,
                            marginBottom: 8,
                          }}
                        >
                          <div
                            style={{
                              color: "#fff",
                              fontSize: 22,
                              fontWeight: 900,
                              lineHeight: 1.25,
                              wordBreak: "keep-all",
                            }}
                          >
                            {title}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeBasketItem(item.id)}
                            style={{
                              flexShrink: 0,
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: 999,
                              padding: "7px 10px",
                              background: "rgba(255,255,255,0.04)",
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            삭제
                          </button>
                        </div>

                        {basketMetaBadges.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 5,
                              marginTop: 2,
                              alignItems: "flex-start",
                            }}
                          >
                            {basketMetaBadges.map((meta) => (
                              <div
                                key={`${meta.label}-${meta.value}`}
                                style={{
                                  display: "inline-flex",
                                  width: "auto",
                                  flex: "0 0 auto",
                                  alignItems: "center",
                                  justifyContent: "flex-start",
                                  gap: 3,
                                  alignSelf: "flex-start",
                                  borderRadius: 999,
                                  padding: "3px 8px",
                                  background: "rgba(255,255,255,0.04)",
                                  border: "1px solid rgba(255,255,255,0.07)",
                                  lineHeight: 1.1,
                                  maxWidth: "fit-content",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <span
                                  style={{
                                    color: THEME_COLOR,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    flexShrink: 0,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {meta.label}
                                </span>
                                <span
                                  style={{
                                    color: "#fff",
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    flexShrink: 0,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {meta.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </aside>
      </div>

      <div
        style={{
          minHeight: "100vh",
          background: `
            radial-gradient(circle at top left, rgba(238,224,197,0.10), transparent 26%),
            radial-gradient(circle at top right, rgba(255,255,255,0.08), transparent 18%),
            linear-gradient(180deg, #060241 0%, ${PAGE_BG} 100%)
          `,
          color: "#fff",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "28px 16px 48px",
          }}
        >
          <section
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 28,
              padding: "22px 18px 18px",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
              border: "1px solid rgba(238,224,197,0.14)",
              boxShadow: "0 18px 48px rgba(0,0,0,0.22)",
              backdropFilter: "blur(8px)",
              marginBottom: 22,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "auto -100px -120px auto",
                width: 260,
                height: 260,
                borderRadius: "50%",
                background: "rgba(238,224,197,0.09)",
                filter: "blur(30px)",
                pointerEvents: "none",
              }}
            />

            <img
              src="/filmbot-logo.png"
              alt="필름봇 로고"
              style={{
                display: "block",
                width: "min(360px, 70vw)",
                height: "auto",
                objectFit: "contain",
                marginBottom: 8,
              }}
            />

            <div
            style={{
              marginBottom: 12,
                }}
              >
            <div
              style={{
                color: TEXT_SUB,
                fontSize: 15,
                fontWeight: 700,
                lineHeight: 1.7,
              }}
            >
              ✔️삼성,✔️영림,✔️예림,✔️현대L&C,✔️LX Z:IN,✔️한솔,✔️우딘,✔️현대INFEEL,✔️KCC
              
            </div>
             <div
              style={{
              color: "rgba(255,255,255,0.62)",
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.5,
              marginTop: 4,
             }}
            >
              9개 제조사 · 3,279개 샘플 제공
            </div>
          </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 18,
              }}
            >
              <button
                type="button"
                className="tutorialLinkButton"
                onClick={() => openTutorial(0)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid rgba(238,224,197,0.18)",
                  borderRadius: 999,
                  padding: "10px 14px",
                  background: "rgba(238,224,197,0.10)",
                  color: THEME_COLOR,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <span>✨</span>
                <span>처음이신가요? 30초 사용법 보기</span>
              </button>
            </div>

            <div
              className="searchRow"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 108px",
                gap: 12,
                alignItems: "stretch",
                marginBottom: 14,
              }}
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void search();
                  }
                }}
                placeholder="제품번호, 코드, 색상명으로 검색"
                style={{
                  width: "100%",
                  height: 56,
                  border: "1px solid rgba(238,224,197,0.28)",
                  borderRadius: 18,
                  padding: "0 18px",
                  fontSize: 17,
                  outline: "none",
                  background: "rgba(255, 253, 248, 0.98)",
                  color: "#1e1b16",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
                  boxSizing: "border-box",
                }}
              />

              <button
                className="searchButton"
                type="button"
                onClick={() => void search()}
                style={{
                  height: 56,
                  width: "100%",
                  border: "1px solid rgba(238,224,197,0.18)",
                  borderRadius: 18,
                  padding: "0 22px",
                  background: THEME_COLOR,
                  color: BROWN,
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: "pointer",
                  boxShadow: "0 10px 22px rgba(0,0,0,0.16)",
                  whiteSpace: "nowrap",
                }}
              >
                검색
              </button>
            </div>

            <div style={{ marginTop: 4 }}>
              <div
                style={{
                  color: TEXT_SUB,
                  fontSize: 13,
                  marginBottom: 10,
                  fontWeight: 600,
                }}
              >
                최근 검색어
              </div>

              {recentSearches.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      className="exampleChip"
                      onClick={() => applyRecentSearch(term)}
                      style={{
                        border: "1px solid rgba(238,224,197,0.22)",
                        borderRadius: 999,
                        padding: "8px 12px",
                        background: "rgba(255,255,255,0.04)",
                        color: THEME_COLOR,
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    color: "rgba(255,255,255,0.48)",
                    fontSize: 14,
                  }}
                >
                  아직 최근 검색어가 없습니다.
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid rgba(238,224,197,0.10)",
              }}
            >
              <button
                type="button"
                className="settingsToggleButton"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid rgba(238,224,197,0.55)",
                  borderRadius: 14,
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  color: THEME_COLOR,
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
                }}
              >
                <span>{isSettingsOpen ? "▾" : "▸"}</span>
                <span>검색 설정</span>
              </button>

              {isSettingsOpen && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "14px 14px",
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(238,224,197,0.10)",
                  }}
                >
                  <div
                    style={{
                      color: TEXT_SUB,
                      fontSize: 14,
                      lineHeight: 1.6,
                      marginBottom: 12,
                    }}
                  >
                    검색 결과에서 보고 싶은 가격 항목을 선택할 수 있어요.
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <button
                      type="button"
                      className="settingsOptionButton"
                      onClick={() => setHideConsumerPrice((prev) => !prev)}
                      style={{
                        border: `1px solid ${
                          !hideConsumerPrice
                            ? "rgba(238,224,197,0.42)"
                            : "rgba(238,224,197,0.18)"
                        }`,
                        borderRadius: 999,
                        padding: "10px 14px",
                        background: !hideConsumerPrice
                          ? "rgba(238,224,197,0.18)"
                          : "rgba(255,255,255,0.04)",
                        color: !hideConsumerPrice ? THEME_COLOR : "#fff",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {hideConsumerPrice ? "소비자가 보기" : "소비자가 숨기기"}
                    </button>

                    <button
                      type="button"
                      className="settingsOptionButton"
                      onClick={() => setHideInstallerPrice((prev) => !prev)}
                      style={{
                        border: `1px solid ${
                          !hideInstallerPrice
                            ? "rgba(238,224,197,0.42)"
                            : "rgba(238,224,197,0.18)"
                        }`,
                        borderRadius: 999,
                        padding: "10px 14px",
                        background: !hideInstallerPrice
                          ? "rgba(238,224,197,0.18)"
                          : "rgba(255,255,255,0.04)",
                        color: !hideInstallerPrice ? THEME_COLOR : "#fff",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {hideInstallerPrice ? "시공자가 보기" : "시공자가 숨기기"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {loading && (
            <div
              style={{
                borderRadius: 20,
                padding: "18px 20px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(238,224,197,0.12)",
                marginBottom: 18,
                color: THEME_COLOR,
              }}
            >
              검색 중...
            </div>
          )}

          {error && (
            <div
              style={{
                borderRadius: 20,
                padding: "18px 20px",
                background: "rgba(120, 20, 20, 0.18)",
                border: "1px solid rgba(255, 120, 120, 0.22)",
                marginBottom: 18,
                color: "#ffd6d6",
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && q.trim() === "" && (
            <section
              style={{
                borderRadius: 24,
                padding: "26px 22px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(238,224,197,0.12)",
                boxShadow: "0 14px 36px rgba(0,0,0,0.15)",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: THEME_COLOR,
                  marginBottom: 8,
                }}
              >
                어떤 필름을 찾고 계신가요?
              </div>

              <div
                style={{
                  color: TEXT_SUB,
                  lineHeight: 1.7,
                  marginBottom: 16,
                }}
              >
                품번 일부만 입력해도 검색할 수 있어요. 숫자만 입력하거나, 코드 또는 색상명으로
                찾아보세요.
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 10,
                  marginBottom: 22,
                }}
              >
                {[
                  "숫자만 검색: 122",
                  "코드 검색: SG122",
                  "코드 검색: SF122",
                  "색상명 검색: 도브화이트",
                ].map((text) => (
                  <div
                    key={text}
                    style={{
                      borderRadius: 16,
                      padding: "14px 14px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(238,224,197,0.10)",
                      color: "#fff",
                    }}
                  >
                    {text}
                  </div>
                ))}
              </div>

              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: THEME_COLOR,
                  marginBottom: 8,
                }}
              >
                제품사진이 작나요?
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: TEXT_SUB,
                  fontSize: 16,
                  lineHeight: 1.7,
                  fontWeight: 600,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 18 }}>🔍</span>
                <span>제품 이미지를 누르면 크게 볼 수 있어요.</span>
              </div>

              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: THEME_COLOR,
                  marginTop: 20,
                  marginBottom: 8,
                }}
              >
                시공자가와 소비자가를 기본으로 숨겨두었어요.
              </div>

              <div
                style={{
                  color: TEXT_SUB,
                  fontSize: 15,
                  lineHeight: 1.7,
                  fontWeight: 600,
                  wordBreak: "keep-all",
                }}
              >
                검색 설정을 눌러 펼친 뒤 보고 싶은 가격만 표시해보세요.
              </div>

              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: THEME_COLOR,
                  marginTop: 20,
                  marginBottom: 8,
                }}
              >
                찾는 제품이 없나요?
              </div>

              <div
                style={{
                  color: TEXT_SUB,
                  fontSize: 16,
                  lineHeight: 1.7,
                  fontWeight: 600,
                  wordBreak: "keep-all",
                }}
              >
                지금 봇🤖에는 삼성, 영림, 예림만 업로드 되어있습니다. 차후 다른 제조사도
                추가될 예정입니다.
              </div>
            </section>
          )}

          {!loading && !error && q.trim() !== "" && items.length === 0 && (
            <section
              style={{
                borderRadius: 24,
                padding: "24px 22px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(238,224,197,0.12)",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: THEME_COLOR,
                  marginBottom: 8,
                }}
              >
                검색 결과가 없습니다
              </div>
              <div style={{ color: TEXT_SUB, lineHeight: 1.7 }}>
                다른 코드 형식으로 다시 검색해보세요. 예: 122 / SG122 / SF122 / 도브화이트
              </div>
            </section>
          )}

          {!loading && !error && items.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: THEME_COLOR,
                }}
              >
                검색 결과
              </div>
              <div
                style={{
                  color: TEXT_SUB,
                  fontSize: 14,
                }}
              >
                총 {items.length}건
              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            {items.map((item) => {
              const title =
                item.full_name || item.product_code_1 || item.color_name || "이름 없음";

              const metaBadges = [
                hasText(item.manufacturer)
                  ? { label: "제조사", value: item.manufacturer.trim() }
                  : null,
                hasText(item.product_code_1)
                  ? { label: "코드1", value: item.product_code_1!.trim() }
                  : null,
                hasText(item.product_code_2)
                  ? { label: "코드2", value: item.product_code_2!.trim() }
                  : null,
                hasText(item.color_name)
                  ? { label: "색상명", value: item.color_name!.trim() }
                  : null,
                hasText(item.category_main)
                  ? { label: "대분류", value: item.category_main!.trim() }
                  : null,
                hasText(item.category_sub)
                  ? { label: "소분류", value: item.category_sub!.trim() }
                  : null,
              ].filter(Boolean) as Array<{ label: string; value: string }>;

              const prices = getVisiblePrices(item, hideConsumerPrice, hideInstallerPrice);
              const selected = isInBasket(item.id);

              return (
                <article
                  key={item.id}
                  className="productCard"
                  style={{
                    borderRadius: 24,
                    padding: 16,
                    display: "grid",
                    gridTemplateColumns: "112px minmax(0, 1fr)",
                    gap: 16,
                    alignItems: "start",
                    background: CARD_BG,
                    border: `1px solid ${CARD_BORDER}`,
                    boxShadow: "0 14px 34px rgba(0,0,0,0.18)",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <div>
                    {item.image_url ? (
                      <button
                        type="button"
                        className="imageButton"
                        onClick={() => setOpenedImage({ src: item.image_url!, alt: title })}
                        aria-label={`${title} 큰 이미지 보기`}
                        style={{
                          width: 112,
                          height: 112,
                          padding: 0,
                          border: "1px solid rgba(238,224,197,0.16)",
                          background: "rgba(255,255,255,0.06)",
                          cursor: "zoom-in",
                          borderRadius: 18,
                          overflow: "hidden",
                          display: "block",
                        }}
                      >
                        <img
                          src={item.image_url}
                          alt={title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      </button>
                    ) : (
                      <div
                        style={{
                          width: 112,
                          height: 112,
                          borderRadius: 18,
                          border: "1px solid rgba(238,224,197,0.14)",
                          background: "rgba(255,255,255,0.05)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 12,
                          color: TEXT_SUB,
                        }}
                      >
                        이미지 없음
                      </div>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 24,
                          lineHeight: 1.25,
                          color: "#fff",
                          wordBreak: "keep-all",
                        }}
                      >
                        {title}
                      </div>

                      <button
                        type="button"
                        className="addCircleButton"
                        onClick={() => toggleBasketItem(item)}
                        aria-label={selected ? "필름바구니에서 빼기" : "필름바구니에 담기"}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 999,
                          border: `1px solid ${
                            selected
                              ? "rgba(238,224,197,0.40)"
                              : "rgba(255,255,255,0.12)"
                          }`,
                          background: selected
                            ? "rgba(238,224,197,0.16)"
                            : "rgba(255,255,255,0.05)",
                          color: selected ? THEME_COLOR : "#fff",
                          fontSize: 24,
                          fontWeight: 800,
                          lineHeight: 1,
                          cursor: "pointer",
                          flexShrink: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {selected ? "✓" : "+"}
                      </button>
                    </div>

                    {metaBadges.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          marginBottom: prices.length > 0 ? 14 : 0,
                        }}
                      >
                        {metaBadges.map((meta) => (
                          <div
                            key={`${meta.label}-${meta.value}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              borderRadius: 999,
                              padding: "8px 12px",
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              color: "#fff",
                              fontSize: 13,
                              lineHeight: 1.3,
                              maxWidth: "100%",
                            }}
                          >
                            <span
                              style={{
                                color: THEME_COLOR,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {meta.label}
                            </span>
                            <span
                              style={{
                                color: "#fff",
                                opacity: 0.92,
                                wordBreak: "break-word",
                              }}
                            >
                              {meta.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {prices.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: 10,
                        }}
                      >
                        {prices.map((price) => (
                          <div
                            key={price.label}
                            style={{
                              borderRadius: 16,
                              padding: "12px 14px",
                              background: "rgba(238,224,197,0.08)",
                              border: "1px solid rgba(238,224,197,0.14)",
                            }}
                          >
                            <div
                              style={{
                                color: THEME_COLOR,
                                fontSize: 12,
                                marginBottom: 4,
                              }}
                            >
                              {price.label}
                            </div>
                            <div
                              style={{
                                color: "#fff",
                                fontWeight: 800,
                                fontSize: 17,
                              }}
                            >
                              {price.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {isTutorialOpen && currentTutorial && (
        <div
          onClick={closeTutorial}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            zIndex: 9800,
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              borderRadius: 28,
              padding: "22px 20px 18px",
              background:
                "linear-gradient(180deg, rgba(12,10,72,0.98) 0%, rgba(5,2,59,0.99) 100%)",
              border: "1px solid rgba(238,224,197,0.16)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.38)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    borderRadius: 999,
                    padding: "7px 11px",
                    background: "rgba(238,224,197,0.10)",
                    color: THEME_COLOR,
                    fontSize: 13,
                    fontWeight: 800,
                    marginBottom: 12,
                  }}
                >
                  <span>{currentTutorial.icon}</span>
                  <span>필름봇 튜토리얼</span>
                </div>

                <div
                  style={{
                    color: "#fff",
                    fontSize: 26,
                    fontWeight: 900,
                    lineHeight: 1.3,
                    wordBreak: "keep-all",
                    marginBottom: 10,
                  }}
                >
                  {currentTutorial.title}
                </div>

                <div
                  style={{
                    color: TEXT_SUB,
                    fontSize: 15,
                    lineHeight: 1.75,
                    wordBreak: "keep-all",
                  }}
                >
                  {currentTutorial.description}
                </div>
              </div>

              <button
                type="button"
                onClick={closeTutorial}
                aria-label="튜토리얼 닫기"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  border: "1px solid rgba(238,224,197,0.16)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: 20,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                borderRadius: 22,
                padding: "16px 16px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(238,224,197,0.10)",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  color: THEME_COLOR,
                  fontSize: 13,
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                이렇게 사용하면 편해요
              </div>
              <div
                style={{
                  color: "#fff",
                  fontSize: 14,
                  lineHeight: 1.75,
                  wordBreak: "keep-all",
                }}
              >
                {currentTutorial.tip}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              {tutorialSteps.map((step, index) => (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setTutorialStep(index)}
                  aria-label={`${index + 1}단계로 이동`}
                  style={{
                    width: index === tutorialStep ? 34 : 10,
                    height: 10,
                    borderRadius: 999,
                    border: "none",
                    background:
                      index === tutorialStep ? THEME_COLOR : "rgba(255,255,255,0.18)",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    padding: 0,
                  }}
                />
              ))}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  color: TEXT_SUB,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {tutorialStep + 1} / {tutorialSteps.length}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                {currentTutorial.actionLabel && currentTutorial.onAction && (
                  <button
                    type="button"
                    className="tutorialLinkButton"
                    onClick={() => currentTutorial.onAction()}
                    style={{
                      border: "1px solid rgba(238,224,197,0.18)",
                      borderRadius: 999,
                      padding: "10px 14px",
                      background: "rgba(255,255,255,0.05)",
                      color: THEME_COLOR,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {currentTutorial.actionLabel}
                  </button>
                )}

                <button
                  type="button"
                  className="tutorialLinkButton"
                  onClick={() => {
                    if (tutorialStep === tutorialSteps.length - 1) {
                      closeTutorial();
                      return;
                    }

                    setTutorialStep((prev) => Math.min(prev + 1, tutorialSteps.length - 1));
                  }}
                  style={{
                    border: "1px solid rgba(238,224,197,0.18)",
                    borderRadius: 999,
                    padding: "10px 16px",
                    background: THEME_COLOR,
                    color: BROWN,
                    fontSize: 14,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {tutorialStep === tutorialSteps.length - 1 ? "튜토리얼 끝내기" : "다음"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {openedImage && (
        <div
          onClick={() => setOpenedImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.76)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 9999,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "92vw",
              maxHeight: "90vh",
              background: "#111",
              borderRadius: 18,
              padding: 14,
              boxShadow: "0 18px 42px rgba(0,0,0,0.38)",
              border: "1px solid rgba(255,255,255,0.08)",
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
                width: 38,
                height: 38,
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

      <div
        style={{
          position: "fixed",
          left: -100000,
          top: 0,
          width: 900,
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        <div
          ref={basketExportRef}
          style={{
            position: "relative",
            width: 900,
            background: PAGE_BG,
            color: "#fff",
            padding: 28,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              borderRadius: 28,
              padding: 22,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
              border: "1px solid rgba(238,224,197,0.14)",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: THEME_COLOR,
                marginBottom: 8,
              }}
            >
              필름바구니
            </div>
            <div
              style={{
                color: TEXT_SUB,
                fontSize: 16,
                lineHeight: 1.7,
              }}
            >
              선택한 필름과 색상을 한 번에 모아본 이미지입니다.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            {basketItems.map((item) => {
              const title =
                item.full_name || item.product_code_1 || item.color_name || "이름 없음";

              const exportPrices: PriceItem[] = [];

              const exportMetaBadges = [
                hasText(item.manufacturer)
                  ? { label: "제조사", value: item.manufacturer.trim() }
                  : null,
                hasText(item.product_code_1)
                  ? { label: "코드1", value: item.product_code_1!.trim() }
                  : null,
                hasText(item.product_code_2)
                  ? { label: "코드2", value: item.product_code_2!.trim() }
                  : null,
                hasText(item.category_main)
                  ? { label: "대분류", value: item.category_main!.trim() }
                  : null,
                hasText(item.category_sub)
                  ? { label: "소분류", value: item.category_sub!.trim() }
                  : null,
              ].filter(Boolean) as Array<{ label: string; value: string }>;

              return (
                <article
                  key={`export-${item.id}`}
                  style={{
                    borderRadius: 24,
                    padding: 16,
                    display: "grid",
                    gridTemplateColumns: "112px minmax(0, 1fr)",
                    gap: 16,
                    alignItems: "start",
                    background: CARD_BG,
                    border: `1px solid ${CARD_BORDER}`,
                  }}
                >
                  <div>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={title}
                        style={{
                          width: 112,
                          height: 112,
                          objectFit: "cover",
                          borderRadius: 18,
                          border: "1px solid rgba(238,224,197,0.16)",
                          background: "rgba(255,255,255,0.06)",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 112,
                          height: 112,
                          borderRadius: 18,
                          border: "1px solid rgba(238,224,197,0.14)",
                          background: "rgba(255,255,255,0.05)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 12,
                          color: TEXT_SUB,
                        }}
                      >
                        이미지 없음
                      </div>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 28,
                        lineHeight: 1.25,
                        color: "#fff",
                        wordBreak: "keep-all",
                        marginBottom: 10,
                      }}
                    >
                      {title}
                    </div>

                    {exportMetaBadges.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          marginBottom: exportPrices.length > 0 ? 14 : 0,
                          alignItems: "flex-start",
                        }}
                      >
                        {exportMetaBadges.map((meta) => (
                          <div
                            key={`${meta.label}-${meta.value}`}
                            style={{
                              display: "inline-flex",
                              width: "auto",
                              flex: "0 0 auto",
                              alignItems: "center",
                              justifyContent: "flex-start",
                              gap: 4,
                              alignSelf: "flex-start",
                              borderRadius: 999,
                              padding: "5px 9px",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.07)",
                              lineHeight: 1.15,
                              maxWidth: "fit-content",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span
                              style={{
                                color: THEME_COLOR,
                                fontSize: 11,
                                fontWeight: 700,
                                flexShrink: 0,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {meta.label}
                            </span>
                            <span
                              style={{
                                color: "#fff",
                                fontSize: 11.5,
                                fontWeight: 800,
                                flexShrink: 0,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {meta.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {exportPrices.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                          gap: 10,
                        }}
                      >
                        {exportPrices.map((price) => (
                          <div
                            key={price.label}
                            style={{
                              borderRadius: 16,
                              padding: "12px 14px",
                              background: "rgba(238,224,197,0.08)",
                              border: "1px solid rgba(238,224,197,0.14)",
                            }}
                          >
                            <div
                              style={{
                                color: THEME_COLOR,
                                fontSize: 12,
                                marginBottom: 4,
                              }}
                            >
                              {price.label}
                            </div>
                            <div
                              style={{
                                color: "#fff",
                                fontWeight: 800,
                                fontSize: 17,
                              }}
                            >
                              {price.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <div
            aria-hidden="true"
            style={{
              marginTop: 28,
              paddingTop: 18,
              borderTop: "1px solid rgba(238,224,197,0.10)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <img
              src={WATERMARK_SRC}
              alt=""
              draggable={false}
              style={{
                display: "block",
                width: 300,
                maxWidth: "58%",
                height: "auto",
                opacity: 0.3,
                filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.16))",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        .searchButton,
        .exampleChip,
        .productCard,
        .imageButton,
        .settingsToggleButton,
        .settingsOptionButton,
        .addCircleButton,
        .basketFloatingButton,
        .saveBasketButton,
        .tutorialLinkButton {
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            filter 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease,
            opacity 0.18s ease;
        }

        .searchButton:hover,
        .exampleChip:hover,
        .productCard:hover,
        .imageButton:hover,
        .settingsToggleButton:hover,
        .settingsOptionButton:hover,
        .addCircleButton:hover,
        .basketFloatingButton:hover,
        .saveBasketButton:hover,
        .tutorialLinkButton:hover {
          transform: translateY(-1px);
        }

        .searchButton:hover {
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.2);
          filter: brightness(1.02);
        }

        .exampleChip:hover {
          background: rgba(238, 224, 197, 0.1);
          border-color: rgba(238, 224, 197, 0.34);
        }

        .productCard:hover {
          box-shadow: 0 20px 42px rgba(0, 0, 0, 0.24);
          border-color: rgba(238, 224, 197, 0.26);
        }

        .imageButton:hover {
          border-color: rgba(238, 224, 197, 0.32);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.22);
        }

        .settingsToggleButton:hover,
        .settingsOptionButton:hover,
        .addCircleButton:hover,
        .saveBasketButton:hover,
        .tutorialLinkButton:hover {
          border-color: rgba(238, 224, 197, 0.3);
          background: rgba(238, 224, 197, 0.08) !important;
        }

        .basketFloatingButton:hover {
          border-color: rgba(238, 224, 197, 0.3);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.32);
        }

        @media (max-width: 720px) {
          .searchRow {
            grid-template-columns: 1fr !important;
          }

          .productCard {
            grid-template-columns: 1fr !important;
          }

          .basketFloatingButton {
            top: 12px;
            right: 12px;
            padding: 10px 12px !important;
          }
        }
      `}</style>
    </>
  );
}