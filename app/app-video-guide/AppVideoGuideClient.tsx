"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import styles from "./AppVideoGuide.module.css";

type GuideVideo = {
  key: "ledger" | "simubot" | "simubotAdmin" | "products" | "filmbot";
  title: string;
  description: string;
  src: string;
};

type GuideInfo = {
  key: "intro" | "kakao" | "qr";
  title: string;
  description: string;
};

const guideVideos: Record<GuideVideo["key"], GuideVideo> = {
  ledger: {
    key: "ledger",
    title: "거래내역 사용법",
    description: "최근 3개월 거래내역 확인과 제품명·날짜 필터 사용 방법을 영상으로 안내합니다.",
    src: "/guide-videos/ledger-guide.mp4",
  },
  simubot: {
    key: "simubot",
    title: "시뮬봇 사용법",
    description: "고객이 필름을 직접 바꿔보며 시뮬레이션하는 방법을 영상으로 안내합니다.",
    src: "/guide-videos/simubot-guide.mp4",
  },
  simubotAdmin: {
    key: "simubotAdmin",
    title: "시뮬봇 관리자용 사용법",
    description: "고객에게 보낼 시뮬레이션 링크를 만들고 관리하는 방법을 영상으로 안내합니다.",
    src: "/guide-videos/simubot-admin-guide.mp4",
  },
  products: {
    key: "products",
    title: "판매상품 사용법",
    description: "판매상품 목록을 확인하는 방법을 영상으로 안내합니다.",
    src: "/guide-videos/products-guide.mp4",
  },
  filmbot: {
    key: "filmbot",
    title: "필름봇 사용법",
    description: "제품번호나 색상명으로 필름을 검색하고 제품 이미지와 정보를 확인하는 방법을 영상으로 안내합니다.",
    src: "/guide-videos/filmbot-guide.mp4",
  },
};

const guideInfos: Record<GuideInfo["key"], GuideInfo> = {
  intro: {
    key: "intro",
    title: "동영상 안내",
    description: "각 기능의 버튼을 누르시면 관련된 동영상 설명이 재생됩니다.",
  },
  kakao: {
    key: "kakao",
    title: "카카오톡문의",
    description: "이고세 카카오톡 비즈니스 채널로 연결됩니다.",
  },
  qr: {
    key: "qr",
    title: "QR코드",
    description: "화면 어디서든 QR코드가 있는 대시보드 화면으로 돌아갑니다.",
  },
};

function LedgerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="2.8" stroke="currentColor" strokeWidth="1.9" />
      <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line x1="8" y1="16" x2="13" y2="16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function KakaoTalkLikeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path
        d="M12 4.5c-4.7 0-8.5 3-8.5 6.8 0 2.4 1.5 4.5 3.9 5.7l-.8 3.2 3.5-2.2c.6.1 1.2.2 1.9.2 4.7 0 8.5-3 8.5-6.9S16.7 4.5 12 4.5Z"
        fill="currentColor"
      />
      <text
        x="12"
        y="13.1"
        textAnchor="middle"
        fontSize="4.2"
        fontWeight="800"
        fill="#F5E6A1"
        fontFamily="Arial, sans-serif"
      >
        TALK
      </text>
    </svg>
  );
}

function ProductIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2.8" stroke="currentColor" strokeWidth="1.9" />
      <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function QrCodeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1.1" stroke="currentColor" strokeWidth="1.9" />
      <rect x="14" y="4" width="6" height="6" rx="1.1" stroke="currentColor" strokeWidth="1.9" />
      <rect x="4" y="14" width="6" height="6" rx="1.1" stroke="currentColor" strokeWidth="1.9" />
      <path d="M14 14h2v2h-2zM18 14h2v2h-2zM16 16h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="currentColor" />
    </svg>
  );
}

function InstallIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path
        d="M12 4v9m0 0 3.5-3.5M12 13 8.5 9.5M5 16.5v1.2A2.3 2.3 0 0 0 7.3 20h9.4a2.3 2.3 0 0 0 2.3-2.3v-1.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SampleQrGraphic() {
  const cells = [
    "11111110010110100111111",
    "10000010101000100100001",
    "10111010111110100101101",
    "10111010000101100101101",
    "10111010101111100101101",
    "10000010100100100100001",
    "11111110101010100111111",
    "00000000011100000000000",
    "10111011100101110101011",
    "01000100111100011010010",
    "11110111010111100111100",
    "00100101000100111100010",
    "10111101110111010101111",
    "01000010001100001000100",
    "11111110110101111110111",
    "10000000100100000100101",
    "10111010111101110111100",
    "10111010010111000100110",
    "10111010100101111111101",
    "10000010111000010100010",
    "11111110101110111110111",
  ];

  return (
    <svg className={styles.sampleQr} viewBox="0 0 25 25" role="img" aria-label="가이드용 샘플 QR">
      <rect width="25" height="25" fill="#FFFFFF" />
      {cells.map((row, y) =>
        row.split("").map((cell, x) =>
          cell === "1" ? <rect key={`${x}-${y}`} x={x + 1} y={y + 2} width="1" height="1" fill="#000000" /> : null
        )
      )}
    </svg>
  );
}

function IconOnlyShortcut({
  imageSrc,
  label,
  onClick,
}: {
  imageSrc: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.iconShortcut} aria-label={`${label} 사용법 보기`} title={`${label} 사용법 보기`} onClick={onClick}>
      <span className={styles.videoBadge} aria-hidden="true">
        <span className={styles.videoBadgeTriangle} />
      </span>
      <span className={styles.newBadge} aria-hidden="true">
        새롭다!
      </span>
      <img src={imageSrc} alt={label} className={styles.shortcutImage} />
    </button>
  );
}

function BottomGuideButton({
  label,
  icon,
  active = false,
  hasVideo = false,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  hasVideo?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`${styles.bottomItem} ${active ? styles.bottomItemActive : ""}`} onClick={onClick}>
      {hasVideo ? (
        <span className={styles.videoBadge} aria-hidden="true">
          <span className={styles.videoBadgeTriangle} />
        </span>
      ) : null}
      <span className={styles.bottomIcon}>{icon}</span>
      <span className={styles.bottomLabel}>{label}</span>
    </button>
  );
}

export default function AppVideoGuideClient() {
  const [selectedGuide, setSelectedGuide] = useState<GuideVideo | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<GuideInfo | null>(null);
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setSelectedInfo(guideInfos.intro);
  }, []);

  const openGuide = (guide: GuideVideo) => {
    setToast("");
    setSelectedInfo(null);
    setSelectedGuide(guide);
  };

  const openInfo = (info: GuideInfo) => {
    videoRef.current?.pause();
    setToast("");
    setSelectedGuide(null);
    setSelectedInfo(info);
  };

  const showReadySoon = (label: string) => {
    setToast(`${label} 영상은 다음 단계에서 추가할 수 있어요.`);

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast("");
      toastTimerRef.current = null;
    }, 2200);
  };

  const closeModal = useCallback((options: { syncHistory?: boolean } = {}) => {
    videoRef.current?.pause();
    setSelectedGuide(null);
    setSelectedInfo(null);

    if (
      options.syncHistory !== false &&
      typeof window !== "undefined" &&
      window.history.state?.appVideoGuideModal
    ) {
      window.history.back();
    }
  }, []);

  const closeIntroForToday = () => {
    closeModal();
  };

  const isModalOpen = Boolean(selectedGuide || selectedInfo);

  useEffect(() => {
    if (!isModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const currentState = window.history.state;
    window.history.pushState(
      {
        ...(currentState && typeof currentState === "object" ? currentState : {}),
        appVideoGuideModal: true,
      },
      "",
      window.location.href
    );

    const handlePopState = () => {
      closeModal({ syncHistory: false });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, closeModal]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const isIntroModal = selectedInfo?.key === "intro";

  return (
    <main className={styles.page}>
      <div className={styles.glowLayer} aria-hidden="true">
        <div className={styles.glowTop} />
        <div className={styles.glowLeft} />
      </div>

      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.londonHero}>
            <img src="/london-market-hero.png" alt="LONDON MARKET" className={styles.londonImage} />
          </div>
        </header>

        <div className={styles.bannerWrap}>
          <section className={styles.videoGuideNotice} aria-label="영상 가이드 안내">
            <div>
              <p className={styles.videoGuideLabel}>VIDEO GUIDE</p>
              <p className={styles.videoGuideText}>영상 가이드용 페이지 입니다.</p>
            </div>
            <a className={styles.dashboardBackButton} href="/dashboard">
              대시보드로 돌아가기
            </a>
          </section>
        </div>

        <section id="user-qr-card" className={styles.qrPanel}>
          <div className={styles.titleRow}>
            <h1 className={styles.qrTitle}>신원철님의 QR</h1>
            <span className={styles.guidePill}>사용법 영상</span>
          </div>

          <div className={styles.qrGrid}>
            <button type="button" className={styles.qrBubble} onClick={() => openInfo(guideInfos.qr)} aria-label="QR코드 안내 보기">
              <span className={styles.qrImageShell}>
                <SampleQrGraphic />
              </span>
            </button>

            <div className={styles.simbotBubble}>
              <IconOnlyShortcut imageSrc="/simulator-buttons/simubot.png" label="시뮬봇" onClick={() => openGuide(guideVideos.simubot)} />
              <IconOnlyShortcut imageSrc="/simulator-buttons/simubot-admin.png" label="시뮬봇 관리자용" onClick={() => openGuide(guideVideos.simubotAdmin)} />
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <div className={styles.footerText}>
            <div className={styles.company}>이고세(주)</div>
            <div>경기도 안산시 상록구 안산천서로 237</div>
            <div>Tel. 031-486-6882</div>
          </div>
          <button type="button" className={styles.logoutLikeButton} onClick={() => showReadySoon("로그아웃")}>로그아웃</button>
        </footer>
      </div>

      <div className={styles.bottomNavWrap}>
        <div className={styles.bottomNavInner}>
          <div className={styles.bottomNavPanel}>
            <button type="button" className={styles.filmbotButton} onClick={() => openGuide(guideVideos.filmbot)} aria-label="필름봇 사용법 보기">
              <span className={styles.videoBadge} aria-hidden="true">
                <span className={styles.videoBadgeTriangle} />
              </span>
              <img src="/filmbot-button.png" alt="필름봇" className={styles.filmbotImage} />
            </button>

            <div className={styles.bottomGrid}>
              <BottomGuideButton label="거래내역" icon={<LedgerIcon />} hasVideo onClick={() => openGuide(guideVideos.ledger)} />
              <BottomGuideButton label="문의" icon={<KakaoTalkLikeIcon />} onClick={() => openInfo(guideInfos.kakao)} />

              <button type="button" className={styles.installGuideButton} onClick={() => showReadySoon("앱 설치")} aria-label="앱 설치 사용법 보기">
                <span className={styles.installIcon}><InstallIcon /></span>
                앱 설치
              </button>

              <BottomGuideButton label="판매상품" icon={<ProductIcon />} hasVideo onClick={() => openGuide(guideVideos.products)} />
              <BottomGuideButton label="QR코드" icon={<QrCodeIcon />} active onClick={() => openInfo(guideInfos.qr)} />
            </div>
          </div>
        </div>
      </div>

      {toast ? <div className={styles.toast} role="status">{toast}</div> : null}

      {selectedGuide || selectedInfo ? (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-modal-title"
          onClick={(event) => {
            if (event.currentTarget === event.target) closeModal();
          }}
        >
          {selectedGuide ? (
            <div className={styles.modalCard}>
              <div className={styles.modalHeader}>
                <div>
                  <p className={styles.modalEyebrow}>동영상 사용법</p>
                  <h2 id="guide-modal-title" className={styles.modalTitle}>
                    {selectedGuide.title}
                  </h2>
                </div>
                <button type="button" className={styles.closeButton} onClick={closeModal} aria-label="안내 닫기">
                  ×
                </button>
              </div>

              <video ref={videoRef} className={styles.guideVideo} controls autoPlay playsInline preload="metadata" key={selectedGuide.src}>
                <source src={selectedGuide.src} type="video/mp4" />
                이 브라우저에서는 동영상을 재생할 수 없습니다.
              </video>

              <p className={styles.modalDescription}>{selectedGuide.description}</p>
            </div>
          ) : isIntroModal ? (
            <div className={styles.introModalCard}>
              <div className={styles.introModalTopIconWrap} aria-hidden="true">
                <img src="/app-video-guide-assets/guide-popup-bot.png" alt="" className={styles.introModalTopIcon} />
              </div>

              <div className={styles.introModalContent}>
                <h2 id="guide-modal-title" className={styles.introModalTitle}>
                  {selectedInfo?.title}
                </h2>

                <div className={styles.introModalNoticeBox}>
                  <p className={styles.introModalNoticeText}>{selectedInfo?.description}</p>
                </div>

                <div className={styles.introModalButtons}>
                  <button type="button" className={styles.introModalPrimaryButton} onClick={closeIntroForToday}>
                    이해했어요.
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.modalCard}>
              <div className={styles.modalHeader}>
                <div>
                  <p className={styles.modalEyebrow}>기능 안내</p>
                  <h2 id="guide-modal-title" className={styles.modalTitle}>
                    {selectedInfo?.title}
                  </h2>
                </div>
                <button type="button" className={styles.closeButton} onClick={closeModal} aria-label="안내 닫기">
                  ×
                </button>
              </div>

              <p className={styles.modalDescription}>{selectedInfo?.description}</p>
            </div>
          )}
        </div>
      ) : null}
    </main>
  );
}
