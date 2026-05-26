"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./SimulbotLaunch.module.css";

const SIMULBOT_URL = "/simulator";
const SIMULBOT_ADMIN_URL = "/simulator/links/new";

type RevealProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
};

function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(target);
        }
      },
      { threshold: 0.18 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.revealVisible : ""} ${className}`.trim()}
      style={{ "--delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

function BotAvatar({
  size = 64,
  admin = false,
  className = "",
}: {
  size?: number;
  admin?: boolean;
  className?: string;
}) {
  const src = admin ? "/simulbot-admin-icon.png" : "/simulbot-icon.png";

  return (
    <span className={`${styles.botAvatar} ${className}`.trim()} style={{ width: size, height: size }}>
      <Image
        src={src}
        alt={admin ? "시뮬봇 관리자용 아이콘" : "시뮬봇 아이콘"}
        width={size}
        height={Math.round(size * 0.67)}
        className={styles.botAvatarImage}
        priority={size >= 72}
      />
    </span>
  );
}


function QrMock() {
  const modules = [
    [44, 6, 8, 8],
    [44, 22, 8, 8],
    [54, 14, 6, 6],
    [54, 30, 6, 6],
    [44, 44, 8, 8],
    [54, 44, 8, 8],
    [64, 44, 8, 8],
    [78, 44, 8, 8],
    [6, 44, 8, 8],
    [22, 44, 8, 8],
    [38, 54, 8, 8],
    [48, 54, 8, 8],
    [68, 54, 8, 8],
    [84, 54, 8, 8],
    [44, 64, 8, 8],
    [58, 64, 8, 8],
    [78, 64, 8, 8],
    [38, 74, 8, 8],
    [48, 74, 8, 8],
    [68, 74, 8, 8],
    [84, 74, 8, 8],
    [44, 84, 8, 8],
    [64, 84, 8, 8],
    [84, 84, 8, 8],
  ] as const;

  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="30" height="30" rx="4.8" fill="#111111" />
      <rect x={x + 8} y={y + 8} width="14" height="14" rx="1.2" fill="#ffffff" />
    </g>
  );

  return (
    <svg className={styles.qrMock} viewBox="0 0 100 100" role="img" aria-label="QR 예시">
      <rect x="0" y="0" width="100" height="100" rx="8" fill="#ffffff" />
      {finder(5, 5)}
      {finder(65, 5)}
      {finder(5, 65)}
      {modules.map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="0.4" fill="#111111" />
      ))}
    </svg>
  );
}

function AppDashboardMockup({ active }: { active: "bot" | "admin" }) {
  return (
    <div className={styles.appPhone}>
      <div className={styles.appPhoneGlow} aria-hidden="true" />
      <div className={styles.appPhoneTop}>
        <Image src="/london-market-hero.png" alt="London Market" width={128} height={85} className={styles.londonMockLogo} />
      </div>

      <div className={styles.bannerMock}>
        <Image src="/egose-banner.png" alt="이고세 배너" width={248} height={50} className={styles.bannerMockImage} />
      </div>

      <section className={styles.qrPanelMock}>
        <h3>신원철님의 QR</h3>
        <div className={styles.qrSimGrid}>
          <div className={styles.qrBubbleMock}>
            <QrMock />
          </div>

          <div className={styles.simButtonStackMock}>
            <Link href={SIMULBOT_URL} className={`${styles.realSimButton} ${active === "bot" ? styles.activeRealSimButton : ""}`.trim()}>
              <Image src="/simulator-buttons/simubot.png" alt="시뮬봇" width={1536} height={1024} className={styles.realSimButtonImage} />
            </Link>
            <Link href={SIMULBOT_ADMIN_URL} className={`${styles.realSimButton} ${styles.adminRealSimButton} ${active === "admin" ? styles.activeRealSimButton : ""}`.trim()}>
              <Image src="/simulator-buttons/simubot-admin.png" alt="시뮬봇 관리자용" width={1536} height={1024} className={styles.realSimButtonImage} />
            </Link>
          </div>
        </div>
      </section>

      <div className={styles.mockFooter}>
        <strong>이고세(주)</strong>
        <span>Tel. 031-486-6882</span>
      </div>
    </div>
  );
}


function UsageDashboardIntro({ active }: { active: "bot" | "admin" }) {
  return (
    <Reveal delay={80} className={styles.usageDashboardIntro}>
      <div className={styles.usageDashboardMockArea}>
        <div className={styles.appScreenBadge}> 이고세 어플 화면</div>
        <AppDashboardMockup active={active} />
      </div>

      <div className={styles.usageDashboardGuide}>
        <span className={styles.usageDashboardKicker}>시작 위치</span>
        <h3>QR코드 옆 버튼을 눌러 바로 시작합니다.</h3>
        <p>
          대시보드에서 QR코드 오른쪽에 있는 시뮬봇 버튼과 시뮬봇 관리자용 버튼을 눌러 시작합니다.
        </p>

        <div className={styles.usageDashboardSteps}>
          <div className={active === "bot" ? styles.activeUsageStep : ""}>
            <BotAvatar size={132} />
            <div>
              <strong>시뮬봇</strong>
              <span>고객과 면담중 바로 색상을 적용해봅니다.</span>
            </div>
          </div>

          <div className={active === "admin" ? styles.activeUsageStep : ""}>
            <BotAvatar size={132} admin />
            <div>
              <strong>시뮬봇 관리자용</strong>
              <span> 떨어져있는 고객에게 보낼 링크를 만들고 관리합니다.</span>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function SimpleDashboardIntro({ active }: { active: "bot" | "admin" }) {
  return (
    <Reveal delay={80} className={styles.simpleDashboardBubble}>
      <div className={styles.simpleDashboardMockArea}>
        <div className={styles.appScreenBadge}>이고세 어플 화면</div>
        <AppDashboardMockup active={active} />
      </div>

      <div className={styles.simpleDashboardNote}>
        <div className={styles.simpleDashboardNoteIcon}>
          <BotAvatar size={128} admin={active === "admin"} />
        </div>
        <div className={styles.simpleDashboardNoteText}>
          <strong>{active === "bot" ? "시뮬봇 버튼" : "시뮬봇 관리자용 버튼"}</strong>
          <span>
            {active === "bot"
              ? "고객과 면담하며 바로 필름 색상 적용"
              : "고객에게 보낼 링크를 만들고 관리"}
          </span>
        </div>
      </div>
    </Reveal>
  );
}

function SimulatorScreenMockup() {
  const doorPresets = [
    {
      key: "gray",
      code: "SG107",
      src: "/simulbot-launch/entry-door-gray.png",
    },
    {
      key: "navy",
      code: "SG1136",
      src: "/simulbot-launch/entry-door-navy.png",
    },
    {
      key: "green",
      code: "SG1188",
      src: "/simulbot-launch/entry-door-green.png",
    },
  ] as const;

  const [doorIndex, setDoorIndex] = useState(0);
  const activeDoor = doorPresets[doorIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDoorIndex((prev) => (prev + 1) % doorPresets.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, [doorPresets.length]);

  return (
    <div className={styles.simulatorShell}>
      <div className={styles.simulatorTopBar}>
        <button type="button">← 대시보드</button>
        <span>시뮬봇</span>
      </div>

      <div className={styles.simulatorHeroCard}>
        <div className={styles.stepPill}>2단계 색상 적용</div>
        <h3>현관문</h3>
        <p>실제 시뮬봇 이미지를 이용한 예시입니다.</p>
      </div>

      <div className={styles.sceneCard}>
        <div key={activeDoor.key} className={styles.sceneImageStage}>
          <Image
            src={activeDoor.src}
            alt={`현관문 ${activeDoor.code} 예시`}
            width={768}
            height={1024}
            className={styles.sceneImage}
            priority
          />
        </div>
        <div className={styles.favoriteBubble}>⛶ 크게 보기</div>
      </div>

      <div className={styles.zonePickerMock}>
        <button type="button" className={styles.selectedZone}>{`현관문 · ${activeDoor.code}`}</button>
        <button type="button">문틀 선택</button>
      </div>

      <div className={styles.bottomStepMock}>
        <span>공간선택</span>
        <strong>색상적용</strong>
        <span>결정확정</span>
      </div>
    </div>
  );
}

function LinkMakerMockup() {
  return (
    <div className={styles.adminMockup}>
      <div className={styles.adminTop}>
        <button type="button">← 대시보드</button>
        <span className={styles.adminTopTitle}>시뮬봇 관리자용</span>
      </div>

      <section className={styles.adminHeroMock}>
        <div className={styles.stepPill}>고객 링크 생성</div>
        <h3>시뮬레이션 링크 만들기</h3>
        <p>공간과 필름 범위를 정해 고객에게 보낼 링크를 만듭니다.</p>
      </section>

      <div className={styles.adminFormMock}>
        <label>
          <span>유효기간</span>
          <div className={styles.segmentRow}>
            <b>1일</b>
            <b className={styles.segmentActive}>3일</b>
            <b>7일</b>
          </div>
        </label>

        <label>
          <span>공간 제한</span>
          <div className={styles.spaceChipRow}>
            <b>주방가구</b>
            <b>문틀</b>
            <b>현관장</b>
          </div>
        </label>

        <label>
          <span>필름 제한</span>
          <div className={styles.scopeButtonMock}>프리셋으로 제한</div>
        </label>
      </div>

      <div className={styles.copyResultMock}>
        <strong>고객 링크 생성 완료</strong>
        <p>안내 문구와 링크를 복사해서 카카오톡으로 보낼 수 있습니다.</p>
      </div>

      <nav className={styles.adminTabMock}>
        <b>링크 생성</b>
        <span>프리셋</span>
        <span>링크 관리</span>
        <span>소개 설정</span>
      </nav>
    </div>
  );
}

function KakaoShareMockup() {
  return (
    <div className={styles.kakaoCard}>
      <div className={styles.kakaoProfile}>
        <span className={styles.kakaoTalkIcon} aria-label="카카오톡 아이콘">
          <svg viewBox="0 0 48 48" className={styles.kakaoTalkIconSvg} aria-hidden="true">
            <ellipse cx="24" cy="21.5" rx="15.5" ry="11.5" />
            <path d="M18.2 30.6L15.5 37c-0.2 0.5 0.3 1 0.8 0.7l7.8-4.5c-2.2-0.1-4.2-1-5.9-2.6Z" />
          </svg>
        </span>
        <div>
          <strong>더센트 308동 301호 고객</strong>
        </div>
      </div>

      <div className={styles.kakaoConversation}>
        <div className={`${styles.kakaoAnimatedItem} ${styles.kakaoStepOne}`}>
          <div className={styles.kakaoRoleLabel}>시공자</div>
          <div className={styles.kakaoBubble}>
            고객님, 아래 링크의 시뮬레이터를 이용하시면 색상 결정에 도움이 됩니다.
          </div>
        </div>

        <div className={`${styles.kakaoAnimatedItem} ${styles.kakaoStepTwo}`}>
          <div className={styles.kakaoLinkCard}>
            <Image
              src="/simubot-card.png"
              alt="시뮬봇 카드"
              width={1536}
              height={1024}
              className={styles.kakaoCardImage}
            />
            <div>
              <strong>필름 시뮬레이터, 시뮬봇!</strong>
              <span>링크를 눌러 필름을 적용해보세요!</span>
            </div>
          </div>
        </div>

        <div className={`${styles.kakaoAnimatedItem} ${styles.kakaoStepThree}`}>
          <div className={styles.kakaoReplyWrap}>
            <div className={styles.kakaoRoleLabelRight}>소비자</div>
            <div className={styles.kakaoReplyBubble}>
              이용해보고 원하는 색상으로 알려드리겠습니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SimulbotLaunchClient() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeGuide, setActiveGuide] = useState<"bot" | "admin">("bot");

  const heroMessages = [
    "고객 상담을 더 설득력 있게",
    "고객용 링크 발송까지 더 간단하게",
    "후보 공유와 결정 확정까지 한 번에",
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroMessages.length);
    }, 2300);

    return () => window.clearInterval(timer);
  }, [heroMessages.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveGuide((prev) => (prev === "bot" ? "admin" : "bot"));
    }, 2800);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.backgroundGlow} />

      <section className={styles.hero}>
        <div className={styles.heroCopy}>

          <div className={styles.badge}>NEW · 시뮬봇 출시</div>
          <h1>상담은 시뮬봇으로,<br />고객 체험은 링크로.</h1>

          <div className={styles.heroMessageWrap}>
            <p key={heroIndex} className={styles.heroMessage}>{heroMessages[heroIndex]}</p>
          </div>

          <p className={styles.heroDesc}>
            고객에게 필름을 적용한 모습을 보여주고, 고객용 링크를 보내 직접 필름을 고르게 할 수 있습니다.
          </p>
        </div>

      </section>

      <section className={`${styles.section} ${styles.simpleIntroSection}`}>
        <Reveal>
          <div className={styles.sectionTitle}>
            <span>시뮬봇 안내</span>
            <h2>간단 소개!</h2>
          </div>
        </Reveal>

        <SimpleDashboardIntro active={activeGuide} />
      </section>

      <section className={styles.section}>
        <Reveal>
          <div className={styles.sectionTitle}>
            <span>장점</span>
            <h2>왜 써야 하나요?</h2>
          </div>
        </Reveal>

        <div className={styles.featureGrid}>
          <Reveal className={styles.featureCard}>
            <div className={styles.featureText}>
              <span className={styles.number}>01</span>
              <h3>고객과의 상담에서 더 높은 설득력을 가질 수 있습니다.</h3>
              <p>고객과 면담하면서 이미지에 필름을 적용한 모습을 직관적이고 즉각적으로 보여줄 수 있습니다.</p>
            </div>
            <SimulatorScreenMockup />
          </Reveal>

          <Reveal delay={120} className={styles.featureCard}>
            <div className={styles.featureText}>
              <span className={styles.number}>02</span>
              <h3>고객 스스로 시뮬레이션하게 하여 상담 부담을 줄일 수 있습니다.</h3>
              <p>시공자가 링크를 만들고 카카오톡으로 보내면 고객 스스로 직접 필름 적용해볼 수 있습니다.</p>
            </div>
            <KakaoShareMockup />
          </Reveal>
        </div>
      </section>

      <section className={styles.section}>
        <Reveal>
          <div className={styles.sectionTitle}>
            <span>2. 이용안내</span>
            <h2>어떻게 쓸 수 있나요?</h2>
          </div>
        </Reveal>

        <UsageDashboardIntro active={activeGuide} />

        <div className={styles.usageGrid}>
          <Reveal className={styles.usageCard}>
            <div className={styles.usageCardHead}>
              <BotAvatar size={116} />
              <div>
                <strong>시뮬봇</strong>
                <span>대면 상담하면서 필름 적용해볼때 사용</span>
              </div>
            </div>
            <p>고객과 면담할 때 공간을 선택하고 필름을 적용해보면서 상담할 수 있습니다.</p>
            <SimulatorScreenMockup />
          </Reveal>

          <Reveal delay={120} className={styles.usageCard}>
            <div className={styles.usageCardHead}>
              <BotAvatar size={116} admin />
              <div>
                <strong>시뮬봇 관리자용</strong>
                <span>고객에게 보낼 링크를 생성,편집에 사용</span>
              </div>
            </div>
            <p>고객에게 보낼 링크를 만들고, 고객이 적용해볼 수 있는 공간·필름·이용기간을 설정 할 수 있습니다.</p>
            <LinkMakerMockup />
          </Reveal>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <Reveal>
          <div className={styles.ctaBox}>
            <BotAvatar size={234} className={styles.ctaLargeBotAvatar} />
            <div>
              <span>지금 바로 사용해보세요</span>
              <h2>상담은 더 직관적으로, 고객 선택은 더 편하게.</h2>
              <p></p>
              <div className={styles.ctaActions}>
                <Link href={SIMULBOT_URL} className={styles.primaryButton}>시뮬봇 열기</Link>
                <Link href={SIMULBOT_ADMIN_URL} className={styles.secondaryButton}>관리자용 열기</Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
