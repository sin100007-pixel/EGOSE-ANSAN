"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import BottomQuickNav from "@/app/components/BottomQuickNav";
import type { OpenedImage, Product } from "./types";
import {
  BASKET_STORAGE_KEY,
  BROWN,
  MAX_RECENT_SEARCHES,
  PAGE_BG,
  RECENT_SEARCH_KEY,
  TEXT_SUB,
  THEME_COLOR,
  TUTORIAL_STORAGE_KEY,
  WATERMARK_SRC,
} from "./constants";
import { waitForImageLoad } from "./utils";
import SearchBar from "./components/SearchBar";
import SearchSettings from "./components/SearchSettings";
import RecentSearches from "./components/RecentSearches";
import ProductList from "./components/ProductList";
import BasketDrawer from "./components/BasketDrawer";
import TutorialModal from "./components/TutorialModal";
import ImageViewerModal from "./components/ImageViewerModal";
import BasketExportSheet from "./components/BasketExportSheet";

const RECOMMENDED_FILM_ENDPOINT = "/api/products/search?recommended=samsung-slg";

export default function ProductTestClient() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openedImage, setOpenedImage] = useState<OpenedImage | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hideConsumerPrice, setHideConsumerPrice] = useState(true);
  const [hideInstallerPrice, setHideInstallerPrice] = useState(true);
  const [isShowingRecommended, setIsShowingRecommended] = useState(false);

  const [basketItems, setBasketItems] = useState<Product[]>([]);
  const [isBasketReady, setIsBasketReady] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const basketExportRef = useRef<HTMLDivElement | null>(null);
  const recommendedLoadedRef = useRef(false);

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

  useEffect(() => {
    try {
      const savedBasket = localStorage.getItem(BASKET_STORAGE_KEY);

      if (!savedBasket) {
        setIsBasketReady(true);
        return;
      }

      const parsed = JSON.parse(savedBasket);

      if (Array.isArray(parsed)) {
        const validItems = parsed.filter(
          (item): item is Product =>
            !!item && typeof item === "object" && typeof item.id === "number"
        );

        setBasketItems(validItems);
      }
    } catch {
      // 무시
    } finally {
      setIsBasketReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isBasketReady) return;

    try {
      if (basketItems.length === 0) {
        localStorage.removeItem(BASKET_STORAGE_KEY);
        return;
      }

      localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(basketItems));
    } catch {
      // 무시
    }
  }, [basketItems, isBasketReady]);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

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
        "지금은 사업자가와 시공자가가 기본으로 숨겨져 있어요. 검색 설정을 열어 보고 싶은 가격만 표시해보세요.",
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
    setIsShowingRecommended(false);

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

  const loadRecommendedFilms = async () => {
    setLoading(true);
    setError("");
    setIsShowingRecommended(true);

    try {
      const res = await fetch(RECOMMENDED_FILM_ENDPOINT);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "추천 필름을 불러오는 중 오류가 발생했습니다.");
        setItems([]);
        setIsShowingRecommended(false);
        return;
      }

      setItems(json.items || []);
    } catch {
      setError("추천 필름을 불러오는 중 오류가 발생했습니다.");
      setItems([]);
      setIsShowingRecommended(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recommendedLoadedRef.current) return;

    recommendedLoadedRef.current = true;
    void loadRecommendedFilms();
  }, []);

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

  const clearBasketItems = () => {
    if (basketItems.length === 0) {
      window.alert("필름바구니에 담긴 필름이 없습니다.");
      return;
    }

    const confirmed = window.confirm("필름바구니를 모두 비울까요?");
    if (!confirmed) return;

    setBasketItems([]);
  };

  const goToDashboard = () => {
    router.push("/dashboard");
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
        className="dashboardFloatingButton"
        onClick={goToDashboard}
        aria-label="대시보드로 이동"
        style={{
          position: "fixed",
          top: 18,
          left: 18,
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
        <span style={{ fontSize: 18 }}>←</span>
        <span style={{ fontSize: 14, fontWeight: 800 }}>대시보드</span>
      </button>

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

      <BasketDrawer
        basketItems={basketItems}
        isBasketOpen={isBasketOpen}
        isExporting={isExporting}
        onClose={() => setIsBasketOpen(false)}
        onRemove={removeBasketItem}
        onClear={clearBasketItems}
        onSaveImage={() => void saveBasketAsImage()}
      />

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
            padding: "28px 16px 180px",
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
                marginBottom: 10,
              }}
            />

            <div
              style={{
                color: "#ff4d4f",
                fontSize: 14,
                fontWeight: 900,
                lineHeight: 1.7,
                margin: "0 0 12px 4px",
                textShadow: "0 1px 8px rgba(0,0,0,0.28)",
              }}
            >
              <div>05.11 현대L&amp;C 단가 반영완료!</div>
              <div>05.11 삼성필름 단가 반영완료!</div>
              <div>05.18 영림필름 단가 반영 완료!</div>
              <div>05.24 KCC필름 단가 반영 완료!</div>
            </div>

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

            <SearchBar q={q} setQ={setQ} onSearch={() => void search()} />

            <SearchSettings
              isSettingsOpen={isSettingsOpen}
              setIsSettingsOpen={setIsSettingsOpen}
              hideConsumerPrice={hideConsumerPrice}
              setHideConsumerPrice={setHideConsumerPrice}
              hideInstallerPrice={hideInstallerPrice}
              setHideInstallerPrice={setHideInstallerPrice}
            />

            <RecentSearches recentSearches={recentSearches} onApply={applyRecentSearch} />
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

          {!loading && !error && !isShowingRecommended && q.trim() !== "" && items.length === 0 && (
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
                {isShowingRecommended ? "추천 필름" : "검색 결과"}
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

          <ProductList
            items={items}
            hideConsumerPrice={hideConsumerPrice}
            hideInstallerPrice={hideInstallerPrice}
            isInBasket={isInBasket}
            onToggleBasket={toggleBasketItem}
            onOpenImage={(src, alt) => setOpenedImage({ src, alt })}
          />
        </div>
      </div>

      <TutorialModal
        isOpen={isTutorialOpen}
        tutorialStep={tutorialStep}
        tutorialSteps={tutorialSteps}
        onClose={closeTutorial}
        onStepChange={setTutorialStep}
        onNext={() => {
          if (tutorialStep === tutorialSteps.length - 1) {
            closeTutorial();
            return;
          }

          setTutorialStep((prev) => Math.min(prev + 1, tutorialSteps.length - 1));
        }}
      />

      <ImageViewerModal
        openedImage={openedImage}
        onClose={() => setOpenedImage(null)}
      />

      <BasketExportSheet
        basketItems={basketItems}
        basketExportRef={basketExportRef}
      />

      <style jsx global>{`
        .searchButton,
        .exampleChip,
        .productCard,
        .imageButton,
        .settingsToggleButton,
        .settingsOptionButton,
        .addCircleButton,
        .dashboardFloatingButton,
        .basketFloatingButton,
        .saveBasketButton,
        .clearBasketButton,
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
        .dashboardFloatingButton:hover,
        .basketFloatingButton:hover,
        .saveBasketButton:hover,
        .clearBasketButton:hover,
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
        .clearBasketButton:hover,
        .tutorialLinkButton:hover {
          border-color: rgba(238, 224, 197, 0.3);
          background: rgba(238, 224, 197, 0.08) !important;
        }

        .dashboardFloatingButton:hover,
        .basketFloatingButton:hover {
          border-color: rgba(238, 224, 197, 0.3);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.32);
        }

        @media (max-width: 720px) {
          .searchRow {
            grid-template-columns: minmax(0, 1fr) 88px !important;
            gap: 8px !important;
          }

          .productCard {
            grid-template-columns: 1fr !important;
          }

          .dashboardFloatingButton {
            top: 12px;
            left: 12px;
            padding: 10px 12px !important;
          }

          .basketFloatingButton {
            top: 12px;
            right: 12px;
            padding: 10px 12px !important;
          }
        }
      `}</style>

      <BottomQuickNav current="filmbot" />
    </>
  );
}
