"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import SimulatorLinkTabs from "./SimulatorLinkTabs";
import SimulatorIntroOverview from "./SimulatorIntroOverview";
import SimulatorAdminTutorial, {
  type SimulatorAdminTutorialStep,
} from "./SimulatorAdminTutorial";

type ContractorProfile = {
  id?: string;
  installer_name?: string | null;
  display_name?: string | null;
  logo_url?: string | null;
  greeting?: string | null;
  phone?: string | null;
  kakao_url?: string | null;
  brand_color?: string | null;
  is_active?: boolean | null;
};

type ContractorPhoto = {
  id?: string;
  image_url: string;
  title: string;
  description: string;
  sort_order: number;
  is_representative: boolean;
  is_visible: boolean;
};

type ContractorPhotoRow = {
  id?: string;
  image_url?: string | null;
  title?: string | null;
  description?: string | null;
  sort_order?: number | null;
  is_representative?: boolean | null;
  is_visible?: boolean | null;
};

type ApiResponse = {
  installer_name?: string;
  profile?: ContractorProfile | null;
  photos?: ContractorPhotoRow[];
  error?: string;
  message?: string;
};

type UploadResponse = {
  url?: string;
  error?: string;
};

type SettingsHelpKey =
  | "preview"
  | "logoUpload"
  | "kakao"
  | "photoUpload"
  | "introActive";

const SETTINGS_HELP_MESSAGES: Record<SettingsHelpKey, string> = {
  preview:
    "고객이 보게될 소개 화면을 미리보기합니다. 기본정보와 대표사진등을 변경하신후 잘 변경됐는지 확인하기위한 버튼입니다.",
  logoUpload:
    "상호나 상징 이미지를 소개 페이지에 올릴 수 있습니다. 없으시다면 사무실로 연락주세요. 만들어 드릴 수 있습니다.",
  kakao:
    "고객이 문의 할 수 있는 카카오톡 오픈 채팅방 주소를 넣으시면됩니다. 없으시다면 사무실로 연락주세요 만드는걸 도와드리겠습니다.",
  photoUpload: "대표적인 시공사진을 소개페이지에 올립니다.",
  introActive:
    "체크되어있으면 고객이 링크를 타고 시뮬레이터에 들어왔을때 소개화면이 보이고 체크가 되어있지않으면 소개화면이 보이지 않게됩니다.",
};

type InlineHelpButtonProps = {
  helpKey: SettingsHelpKey;
  activeHelp: SettingsHelpKey | null;
  onToggle: (helpKey: SettingsHelpKey) => void;
  className?: string;
};

function InlineHelpButton({
  helpKey,
  activeHelp,
  onToggle,
  className = "",
}: InlineHelpButtonProps) {
  const opened = activeHelp === helpKey;

  return (
    <span
      className={`settingsHelpWrap settingsHelpWrap-${helpKey} ${className}`}
      data-help-wrap={helpKey}
    >
      <button
        type="button"
        className="settingsHelpButton"
        data-help-trigger={helpKey}
        aria-label="도움말 보기"
        aria-expanded={opened}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggle(helpKey);
        }}
      >
        ?
      </button>
      {opened ? (
        <span className="settingsHelpBubble" role="tooltip">
          {SETTINGS_HELP_MESSAGES[helpKey]}
        </span>
      ) : null}
    </span>
  );
}

type SplitHelpActionButtonProps = {
  helpKey: SettingsHelpKey;
  activeHelp: SettingsHelpKey | null;
  onToggle: (helpKey: SettingsHelpKey) => void;
  className?: string;
  disabled?: boolean;
  children: ReactElement;
};

function SplitHelpActionButton({
  helpKey,
  activeHelp,
  onToggle,
  className = "",
  disabled = false,
  children,
}: SplitHelpActionButtonProps) {
  const opened = activeHelp === helpKey;

  return (
    <div
      className={`splitHelpAction ${disabled ? "isDisabled" : ""} ${className}`}
      data-help-wrap={helpKey}
    >
      {children}
      <button
        type="button"
        className="splitHelpButton"
        data-help-trigger={helpKey}
        aria-label="도움말 보기"
        aria-expanded={opened}
        disabled={disabled}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggle(helpKey);
        }}
      >
        ?
      </button>
      {opened ? (
        <span className="settingsHelpBubble splitHelpBubble" role="tooltip">
          {SETTINGS_HELP_MESSAGES[helpKey]}
        </span>
      ) : null}
    </div>
  );
}

const COLORS = {
  bg: "#05023B",
  panel: "rgba(12,10,72,0.74)",
  panelStrong: "rgba(10,8,72,0.94)",
  cream: "#EEE0C5",
  creamText: "#7A5A34",
  line: "rgba(238,224,197,0.16)",
  soft: "rgba(255,255,255,0.70)",
  white: "#FFFFFF",
  danger: "#ff7a7a",
  ok: "#9DF2C7",
};

const SETTINGS_TUTORIAL_STEPS = [
  {
    id: "settings-start",
    target: "settings-hero",
    title: "고객 소개 화면을 설정합니다",
    description:
      "고객 링크 첫 화면에 보이는 시공자 이름, 로고, 인삿말, 연락처와 대표 시공사진을 관리하는 화면입니다.",
    tip: "여기서 저장한 내용은 고객이 시뮬레이터 링크를 열었을 때 처음 보는 소개 영역에 사용됩니다.",
  },
  {
    id: "settings-preview-button",
    target: "settings-preview-button",
    title: "미리보기로 먼저 확인합니다",
    description:
      "현재 입력한 내용이 고객 첫 화면에서 어떻게 보일지 저장 전후로 확인할 수 있습니다.",
  },
  {
    id: "settings-basic",
    target: "settings-basic",
    title: "기본 정보를 입력합니다",
    description:
      "고객에게 보일 이름, 로고, 인삿말, 전화번호, 브랜드 색상, 카카오 문의 링크를 입력합니다.",
    tip: "사무실에 문의하시면 로고나 카카오톡문의링크 만드는 것을 도와드립니다.",
    scrollBlock: "center",
  },
  {
    id: "settings-active",
    target: "settings-active",
    title: "소개 화면 노출 여부를 정합니다",
    description:
      "체크하면 고객 링크 첫 화면에 시공자 소개가 표시됩니다. 끄면 고객 화면에서 소개 영역을 숨길 수 있습니다.",
    scrollBlock: "center",
  },
  {
    id: "settings-photos",
    target: "settings-photo-fields",
    title: "대표 시공사진을 등록합니다",
    description:
      "사진을 업로드하거나 URL을 입력해서 고객에게 보여줄 시공 사례를 추가합니다. 제목과 설명도 함께 넣을 수 있습니다.",
    scrollBlock: "center",
  },
  {
    id: "settings-photo-options",
    target: "settings-photo-options",
    title: "사진 공개와 대표 여부를 정합니다",
    description:
      "공개를 끄면 고객 화면에 보이지 않습니다. 대표를 선택하면 소개 화면에서 더 중요한 사진으로 사용할 수 있습니다.",
    scrollBlock: "center",
  },
  {
    id: "settings-save",
    target: "settings-footer-actions",
    title: "설정을 저장합니다",
    description:
      "변경한 내용은 설정 저장을 눌러야 고객 링크 첫 화면에 반영됩니다.",
    scrollBlock: "end",
    scrollOffset: 150,
    cardPlacement: "top",
  },
] satisfies readonly SimulatorAdminTutorialStep[];

const emptyPhoto = (sortOrder: number): ContractorPhoto => ({
  image_url: "",
  title: "",
  description: "",
  sort_order: sortOrder,
  is_representative: sortOrder === 1,
  is_visible: true,
});

function toPhoto(row: ContractorPhotoRow, index: number): ContractorPhoto {
  return {
    id: row?.id,
    image_url: row?.image_url || "",
    title: row?.title || "",
    description: row?.description || "",
    sort_order: Number(row?.sort_order || index + 1),
    is_representative: row?.is_representative ?? index === 0,
    is_visible: row?.is_visible ?? true,
  };
}

export default function SimulatorContractorSettings() {
  const router = useRouter();
  const [isDashboardMoving, setIsDashboardMoving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<
    "logo" | number | null
  >(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [installerName, setInstallerName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [greeting, setGreeting] = useState("");
  const [phone, setPhone] = useState("");
  const [kakaoUrl, setKakaoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#11104a");
  const [isActive, setIsActive] = useState(true);
  const [activeHelp, setActiveHelp] = useState<SettingsHelpKey | null>(null);
  const [photos, setPhotos] = useState<ContractorPhoto[]>([
    emptyPhoto(1),
    emptyPhoto(2),
    emptyPhoto(3),
  ]);

  useEffect(() => {
    router.prefetch("/dashboard");
    const idle = window.setTimeout(() => {
      router.prefetch("/dashboard");
    }, 250);

    return () => {
      window.clearTimeout(idle);
    };
  }, [router]);

  const toggleHelp = (helpKey: SettingsHelpKey) => {
    setActiveHelp((prev) => (prev === helpKey ? null : helpKey));
  };

  useEffect(() => {
    if (!activeHelp) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(`[data-help-trigger="${activeHelp}"]`)) {
        return;
      }
      setActiveHelp(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveHelp(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeHelp]);

  const paintThenNavigateToDashboard = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        router.push("/dashboard");
      });
    });
  };

  const goToDashboard = () => {
    if (isDashboardMoving) return;

    setIsDashboardMoving(true);
    router.prefetch("/dashboard");
    paintThenNavigateToDashboard();
  };

  const visiblePhotos = useMemo(() => {
    return photos.filter((photo) => photo.image_url.trim() && photo.is_visible);
  }, [photos]);

  const previewName = displayName || installerName || "시공자";

  const renderCustomerPreview = () => (
    <SimulatorIntroOverview
      contractorName={previewName}
      logoUrl={logoUrl}
      greeting={greeting}
      phone={phone}
      showKakao={Boolean(kakaoUrl)}
      photos={visiblePhotos}
      customerName="최진규"
      expiresAt="2026. 05. 05. 오전 08:11"
      brandColor={brandColor}
      showHero={false}
      showBottomNav
      showStartButton={false}
    />
  );

  const applyResponse = (json: ApiResponse) => {
    const profile = json.profile || null;
    const nextInstallerName =
      json.installer_name || profile?.installer_name || "";

    setInstallerName(nextInstallerName || "");
    setDisplayName(profile?.display_name || nextInstallerName || "");
    setLogoUrl(profile?.logo_url || "");
    setGreeting(profile?.greeting || "");
    setPhone(profile?.phone || "");
    setKakaoUrl(profile?.kakao_url || "");
    setBrandColor(profile?.brand_color || "#11104a");
    setIsActive(profile?.is_active ?? true);

    const rows = Array.isArray(json.photos) ? json.photos : [];
    const nextPhotos = rows.map((row, index) => toPhoto(row, index));

    while (nextPhotos.length < 3) {
      nextPhotos.push(emptyPhoto(nextPhotos.length + 1));
    }

    setPhotos(nextPhotos);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setMessage("");

      try {
        const res = await fetch("/api/simulator/contractor-profile", {
          cache: "no-store",
        });
        const json = (await res.json()) as ApiResponse;

        if (cancelled) return;

        if (!res.ok) {
          setError(json.error || "설정을 불러오지 못했습니다.");
          return;
        }

        applyResponse(json);
      } catch {
        if (!cancelled) {
          setError("설정을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const updatePhoto = (index: number, patch: Partial<ContractorPhoto>) => {
    setPhotos((prev) => {
      return prev.map((photo, photoIndex) => {
        if (photoIndex !== index) return photo;
        return { ...photo, ...patch };
      });
    });
  };

  const markRepresentative = (index: number) => {
    setPhotos((prev) => {
      return prev.map((photo, photoIndex) => ({
        ...photo,
        is_representative: photoIndex === index,
      }));
    });
  };

  const addPhotoSlot = () => {
    setPhotos((prev) => [...prev, emptyPhoto(prev.length + 1)]);
  };

  const removePhotoSlot = (index: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, photoIndex) => photoIndex !== index);
      return next.length > 0
        ? next.map((photo, photoIndex) => ({
            ...photo,
            sort_order: photoIndex + 1,
          }))
        : [emptyPhoto(1)];
    });
  };

  const uploadImage = async (
    file: File | undefined,
    type: "logo" | "portfolio",
    photoIndex?: number,
  ) => {
    if (!file) return;

    const target = type === "logo" ? "logo" : (photoIndex ?? 0);
    setUploadingTarget(target);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/simulator/contractor-upload", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as UploadResponse;

      if (!res.ok || !json.url) {
        setError(json.error || "이미지를 업로드하지 못했습니다.");
        return;
      }

      if (type === "logo") {
        setLogoUrl(json.url);
      } else if (typeof photoIndex === "number") {
        updatePhoto(photoIndex, { image_url: json.url });
      }

      setMessage(
        "이미지를 업로드했습니다. 마지막에 설정 저장을 눌러 반영해주세요.",
      );
    } catch {
      setError("이미지를 업로드하지 못했습니다.");
    } finally {
      setUploadingTarget(null);
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        display_name: displayName,
        logo_url: logoUrl,
        greeting,
        phone,
        kakao_url: kakaoUrl,
        brand_color: brandColor,
        is_active: isActive,
        photos: photos
          .map((photo, index) => ({
            ...photo,
            sort_order: index + 1,
            image_url: photo.image_url.trim(),
            title: photo.title.trim(),
            description: photo.description.trim(),
          }))
          .filter((photo) => photo.image_url.length > 0),
      };

      const res = await fetch("/api/simulator/contractor-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResponse;

      if (!res.ok) {
        setError(json.error || "저장하지 못했습니다.");
        return;
      }

      applyResponse(json);
      setMessage(json.message || "저장했습니다.");
    } catch {
      setError("저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="settingsPage">
      {isDashboardMoving ? (
        <div className="routeOverlay" aria-live="polite">
          대시보드로 이동 중...
        </div>
      ) : null}

      <button
        type="button"
        onClick={goToDashboard}
        className="backButton"
        disabled={isDashboardMoving}
      >
        ← 대시보드
      </button>

      <section className="heroCard" data-sim-admin-guide="settings-hero">
        <div>
          <span className="stepPill">시공자 설정</span>
          <h1>고객용 시뮬레이터 소개 화면</h1>
          <p>
            고객 링크 첫 화면에 보일 로고, 인삿말, 연락처, 대표 시공사진을
            관리합니다.
          </p>
        </div>
        <div className="heroActions">
          <SplitHelpActionButton
            helpKey="preview"
            activeHelp={activeHelp}
            onToggle={toggleHelp}
            disabled={loading}
            className="previewSplitHelp"
          >
            <button
              type="button"
              className="splitHelpMainButton"
              onClick={() => setIsPreviewOpen(true)}
              disabled={loading}
              data-sim-admin-guide="settings-preview-button"
            >
              미리보기
            </button>
          </SplitHelpActionButton>
        </div>
      </section>

      <SimulatorAdminTutorial
        storageKey="contractor-settings-guide-choice-v1"
        steps={SETTINGS_TUTORIAL_STEPS}
        buttonLabel="소개설정"
      />

      {loading ? (
        <section className="panel loadingPanel">설정을 불러오는 중...</section>
      ) : (
        <>
          {error ? <div className="notice errorNotice">{error}</div> : null}
          {message ? (
            <div className="notice successNotice">{message}</div>
          ) : null}

          <section className="gridLayout">
            <div
              className="panel formPanel"
              data-sim-admin-guide="settings-basic"
            >
              <div className="sectionHeader">
                <span>기본 정보</span>
                <strong>
                  {installerName ? `${installerName} 계정` : "현재 계정"}
                </strong>
              </div>

              <label>
                <span>고객에게 보일 이름</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="예: 신원철"
                />
              </label>

              <label>
                <span>로고 이미지 URL</span>
                <input
                  value={logoUrl}
                  onChange={(event) => setLogoUrl(event.target.value)}
                  placeholder="로고를 업로드하면 자동으로 입력됩니다."
                />
              </label>

              <div className="uploadRow">
                <SplitHelpActionButton
                  helpKey="logoUpload"
                  activeHelp={activeHelp}
                  onToggle={toggleHelp}
                  disabled={uploadingTarget !== null}
                  className="uploadSplitHelpAction"
                >
                  <label className="uploadButton splitHelpUploadLabel">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingTarget !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        void uploadImage(file, "logo");
                        event.currentTarget.value = "";
                      }}
                    />
                    <span>
                      {uploadingTarget === "logo"
                        ? "로고 업로드 중..."
                        : "로고 이미지 업로드"}
                    </span>
                  </label>
                </SplitHelpActionButton>
                <small>JPG, PNG, WEBP / 8MB 이하</small>
              </div>

              <label>
                <span>인삿말</span>
                <textarea
                  value={greeting}
                  onChange={(event) => setGreeting(event.target.value)}
                  placeholder="고객에게 보여줄 짧은 인삿말을 입력하세요."
                  rows={5}
                />
              </label>

              <div className="twoCols">
                <label>
                  <span>전화번호</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="010-0000-0000"
                  />
                </label>

                <label>
                  <span>브랜드 색상</span>
                  <input
                    value={brandColor}
                    onChange={(event) => setBrandColor(event.target.value)}
                    placeholder="#11104a"
                  />
                </label>
              </div>

              <label>
                <span className="labelWithHelp">
                  카카오 문의 링크
                  <InlineHelpButton
                    helpKey="kakao"
                    activeHelp={activeHelp}
                    onToggle={toggleHelp}
                  />
                </span>
                <input
                  value={kakaoUrl}
                  onChange={(event) => setKakaoUrl(event.target.value)}
                  placeholder="예: https://pf.kakao.com/.../chat"
                />
              </label>

              <label
                className="checkRow"
                data-sim-admin-guide="settings-active"
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                />
                <span className="labelWithHelp">
                  고객 링크에 시공자 소개 화면 노출
                  <InlineHelpButton
                    helpKey="introActive"
                    activeHelp={activeHelp}
                    onToggle={toggleHelp}
                  />
                </span>
              </label>
            </div>

            <div
              className="panel previewPanel"
              data-sim-admin-guide="settings-preview-panel"
            >
              <div className="sectionHeader">
                <span>미리보기</span>
                <strong>고객 첫 화면</strong>
              </div>

              <div
                className="introPreview introPreviewFrame"
                style={{ borderColor: `${brandColor}88` }}
              >
                {renderCustomerPreview()}
              </div>
            </div>
          </section>

          <section
            className="panel photoPanel"
            data-sim-admin-guide="settings-photos"
          >
            <div className="sectionHeader">
              <span>대표 시공사진</span>
              <strong>최대 12장 저장 가능</strong>
            </div>

            <div className="photoList">
              {photos.map((photo, index) => (
                <article className="photoItem" key={index}>
                  <div className="photoThumb">
                    {photo.image_url ? (
                      <img src={photo.image_url} alt="시공사진 미리보기" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  <div className="photoFields">
                    <div
                      className="photoGuideFields"
                      data-sim-admin-guide={
                        index === 0 ? "settings-photo-fields" : undefined
                      }
                    >
                      <label>
                        <span>사진 URL</span>
                        <input
                          value={photo.image_url}
                          onChange={(event) =>
                            updatePhoto(index, {
                              image_url: event.target.value,
                            })
                          }
                          placeholder="사진을 업로드하면 자동으로 입력됩니다."
                        />
                      </label>

                      <div className="uploadRow compactUploadRow">
                        <SplitHelpActionButton
                          helpKey="photoUpload"
                          activeHelp={activeHelp}
                          onToggle={toggleHelp}
                          disabled={uploadingTarget !== null}
                          className="uploadSplitHelpAction"
                        >
                          <label className="uploadButton splitHelpUploadLabel">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              disabled={uploadingTarget !== null}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                void uploadImage(file, "portfolio", index);
                                event.currentTarget.value = "";
                              }}
                            />
                            <span>
                              {uploadingTarget === index
                                ? "사진 업로드 중..."
                                : "시공사진 업로드"}
                            </span>
                          </label>
                        </SplitHelpActionButton>
                        <small>업로드 후 URL이 자동 입력됩니다.</small>
                      </div>

                      <div className="twoCols">
                        <label>
                          <span>제목</span>
                          <input
                            value={photo.title}
                            onChange={(event) =>
                              updatePhoto(index, { title: event.target.value })
                            }
                            placeholder="예: 싱크대 필름 시공"
                          />
                        </label>

                        <label>
                          <span>설명</span>
                          <input
                            value={photo.description}
                            onChange={(event) =>
                              updatePhoto(index, {
                                description: event.target.value,
                              })
                            }
                            placeholder="예: 화이트 계열 상하부장 시공"
                          />
                        </label>
                      </div>
                    </div>

                    <div
                      className="photoOptions"
                      data-sim-admin-guide={
                        index === 0 ? "settings-photo-options" : undefined
                      }
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={photo.is_visible}
                          onChange={(event) =>
                            updatePhoto(index, {
                              is_visible: event.target.checked,
                            })
                          }
                        />
                        <span>공개</span>
                      </label>

                      <label>
                        <input
                          type="radio"
                          name="representative-photo"
                          checked={photo.is_representative}
                          onChange={() => markRepresentative(index)}
                        />
                        <span>대표</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => removePhotoSlot(index)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div
              className="footerActions"
              data-sim-admin-guide="settings-footer-actions"
            >
              <button
                type="button"
                className="subButton"
                onClick={addPhotoSlot}
              >
                사진 입력칸 추가
              </button>
              <button
                type="button"
                className="saveButton"
                onClick={save}
                disabled={saving || uploadingTarget !== null}
              >
                {saving
                  ? "저장 중..."
                  : uploadingTarget !== null
                    ? "업로드 중..."
                    : "설정 저장"}
              </button>
            </div>
          </section>
        </>
      )}

      {isPreviewOpen ? (
        <div
          className="previewBubbleBackdrop"
          role="presentation"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="previewBubble"
            role="dialog"
            aria-modal="true"
            aria-label="고객 첫 화면 미리보기"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="previewBubbleHeader">
              <div>
                <span>미리보기</span>
                <strong>고객 첫 화면</strong>
              </div>
              <button type="button" onClick={() => setIsPreviewOpen(false)}>
                닫기
              </button>
            </div>

            <div
              className="introPreview introPreviewFrame"
              style={{ borderColor: `${brandColor}88` }}
            >
              {renderCustomerPreview()}
            </div>
          </div>
        </div>
      ) : null}

      <SimulatorLinkTabs active="settings" />

      <style jsx>{`
        :global(html),
        :global(body) {
          max-width: 100%;
          overflow-x: hidden;
        }

        :global(*) {
          box-sizing: border-box;
        }

        .settingsPage {
          width: 100%;
          max-width: 100vw;
          min-height: 100vh;
          overflow-x: hidden;
          padding: 28px 22px 142px;
          background: radial-gradient(
              circle at 16% 0%,
              rgba(238, 224, 197, 0.13),
              transparent 32%
            ),
            ${COLORS.bg};
          color: ${COLORS.white};
          font-family:
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .routeOverlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(5, 2, 59, 0.76);
          color: ${COLORS.cream};
          font-size: 20px;
          font-weight: 900;
          backdrop-filter: blur(10px);
        }

        .backButton {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid ${COLORS.line};
          border-radius: 999px;
          padding: 10px 14px;
          background: ${COLORS.panelStrong};
          color: ${COLORS.cream};
          font-size: 14px;
          font-weight: 900;
          text-decoration: none;
          cursor: pointer;
          margin: 0 auto 14px;
          appearance: none;
        }

        .backButton:disabled {
          opacity: 0.58;
          cursor: wait;
        }

        .heroCard,
        .panel,
        .notice {
          width: min(1120px, 100%);
          max-width: 100%;
          margin: 0 auto;
          border: 1px solid ${COLORS.line};
          background: ${COLORS.panel};
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.24);
          backdrop-filter: blur(18px);
        }

        .heroCard {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: flex-end;
          border-radius: 28px;
          padding: 30px;
        }

        .stepPill {
          display: inline-flex;
          border-radius: 999px;
          padding: 9px 14px;
          background: rgba(238, 224, 197, 0.16);
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
        }

        h1 {
          margin: 16px 0 8px;
          font-size: clamp(32px, 6vw, 56px);
          line-height: 1.04;
          letter-spacing: -0.05em;
          word-break: keep-all;
          overflow-wrap: anywhere;
        }

        p {
          margin: 0;
          color: ${COLORS.soft};
          font-weight: 700;
          line-height: 1.65;
          white-space: pre-line;
        }

        .heroActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .labelWithHelp,
        :global(.labelWithHelp) {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        :global(.settingsHelpWrap) {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          line-height: 1;
          vertical-align: middle;
          z-index: 40;
        }

        :global(.settingsHelpButton) {
          width: 20px;
          height: 20px;
          min-width: 20px;
          min-height: 20px;
          border: 1px solid rgba(238, 224, 197, 0.68);
          border-radius: 999px;
          padding: 0;
          background: rgba(238, 224, 197, 0.13);
          color: ${COLORS.cream};
          box-shadow: 0 5px 14px rgba(0, 0, 0, 0.18);
          font-size: 12px;
          font-weight: 1000;
          line-height: 1;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          appearance: none;
          -webkit-appearance: none;
        }

        :global(.settingsHelpButton:hover),
        :global(.settingsHelpButton:focus-visible) {
          background: ${COLORS.cream};
          color: ${COLORS.bg};
          outline: none;
        }

        :global(.settingsHelpBubble) {
          position: absolute;
          top: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          width: min(300px, calc(100vw - 36px));
          box-sizing: border-box;
          border-radius: 16px;
          border: 1px solid rgba(238, 224, 197, 0.34);
          background: rgba(12, 10, 72, 0.98);
          color: ${COLORS.white};
          box-shadow: 0 16px 38px rgba(0, 0, 0, 0.34);
          padding: 12px 13px;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.55;
          letter-spacing: -0.02em;
          word-break: keep-all;
          white-space: normal;
          text-align: left;
          z-index: 120;
        }

        :global(.settingsHelpBubble::before) {
          content: "";
          position: absolute;
          top: -6px;
          left: 50%;
          width: 10px;
          height: 10px;
          transform: translateX(-50%) rotate(45deg);
          border-left: 1px solid rgba(238, 224, 197, 0.34);
          border-top: 1px solid rgba(238, 224, 197, 0.34);
          background: rgba(12, 10, 72, 0.98);
        }

        :global(.settingsHelpWrap-introActive .settingsHelpBubble) {
          top: auto;
          bottom: calc(100% + 10px);
          right: -8px;
          left: auto;
          transform: none;
          width: min(260px, calc(100vw - 112px));
          max-width: 260px;
        }

        :global(.settingsHelpWrap-introActive .settingsHelpBubble::before) {
          top: auto;
          bottom: -6px;
          right: 14px;
          left: auto;
          transform: rotate(45deg);
          border-top: 0;
          border-left: 0;
          border-right: 1px solid rgba(238, 224, 197, 0.34);
          border-bottom: 1px solid rgba(238, 224, 197, 0.34);
        }

        :global(.splitHelpAction) {
          position: relative;
          display: flex;
          align-items: stretch;
          width: 100%;
          min-height: 48px;
          border: 1px solid rgba(238, 224, 197, 0.3);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.055);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
          overflow: visible;
          isolation: isolate;
        }

        :global(.splitHelpAction.isDisabled) {
          opacity: 0.6;
        }

        :global(.splitHelpMainButton),
        :global(.splitHelpButton) {
          appearance: none;
          -webkit-appearance: none;
          border: 0;
          font-weight: 900;
          cursor: pointer;
        }

        :global(.splitHelpMainButton),
        :global(.splitHelpUploadLabel) {
          flex: 1 1 auto;
          width: 100%;
          min-width: 0;
          min-height: 48px;
          margin: 0;
          border: 0;
          border-radius: 15px 0 0 15px;
          background: transparent;
          color: ${COLORS.cream};
          text-align: center;
        }

        :global(.splitHelpMainButton) {
          padding: 12px 14px;
          font-size: 14px;
        }

        :global(.splitHelpUploadLabel) {
          padding: 11px 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 13px;
          font-weight: 1000;
        }

        :global(.splitHelpMainButton:hover),
        :global(.splitHelpMainButton:focus-visible),
        :global(.splitHelpUploadLabel:hover),
        :global(.splitHelpUploadLabel:focus-within) {
          background: rgba(238, 224, 197, 0.08);
          outline: none;
        }

        :global(.splitHelpMainButton:disabled),
        :global(.splitHelpButton:disabled) {
          cursor: wait;
        }

        :global(.splitHelpButton) {
          flex: 0 0 54px;
          width: 54px;
          min-width: 54px;
          min-height: 48px;
          border-left: 1px solid rgba(238, 224, 197, 0.24);
          border-radius: 0 15px 15px 0;
          background: rgba(238, 224, 197, 0.15);
          color: ${COLORS.cream};
          box-shadow: inset 1px 0 0 rgba(0, 0, 0, 0.1);
          font-size: 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        :global(.splitHelpButton:hover),
        :global(.splitHelpButton:focus-visible),
        :global(.splitHelpMainButton:hover),
        :global(.splitHelpMainButton:focus-visible) {
          outline: none;
        }

        :global(.splitHelpButton:hover),
        :global(.splitHelpButton:focus-visible) {
          background: ${COLORS.cream};
          color: ${COLORS.bg};
        }

        :global(.splitHelpBubble) {
          top: calc(100% + 11px);
          right: 0;
          left: auto;
          transform: none;
        }

        :global(.splitHelpBubble::before) {
          right: 20px;
          left: auto;
          transform: rotate(45deg);
        }

        :global(.previewSplitHelp) {
          width: min(320px, 100%);
        }

        :global(.uploadSplitHelpAction) {
          width: min(400px, 100%);
        }

        :global(.splitHelpUploadLabel input) {
          display: none;
        }

        :global(.splitHelpUploadLabel span) {
          width: 100%;
          text-align: center;
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 1000;
        }

        .heroActions > button,
        .subButton,
        .saveButton,
        .photoOptions button {
          border: 1px solid rgba(238, 224, 197, 0.24);
          border-radius: 16px;
          padding: 12px 16px;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
        }

        .heroActions > button,
        .subButton,
        .photoOptions button {
          background: rgba(255, 255, 255, 0.06);
          color: ${COLORS.cream};
        }
        .heroActions > button:disabled {
          opacity: 0.5;
          cursor: wait;
        }

        .previewBubbleBackdrop {
          position: fixed;
          inset: 0;
          z-index: 180;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(5, 2, 59, 0.74);
          backdrop-filter: blur(10px);
        }

        .previewBubble {
          width: min(560px, 100%);
          max-height: min(720px, calc(100dvh - 36px));
          overflow-y: auto;
          border: 1px solid rgba(238, 224, 197, 0.24);
          border-radius: 26px;
          padding: 16px;
          background: rgba(8, 6, 62, 0.96);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
        }

        .previewBubbleHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
          color: ${COLORS.cream};
        }

        .previewBubbleHeader span,
        .previewBubbleHeader strong {
          display: block;
          font-weight: 1000;
        }

        .previewBubbleHeader span {
          font-size: 13px;
          color: ${COLORS.soft};
        }

        .previewBubbleHeader button {
          border: 1px solid rgba(238, 224, 197, 0.24);
          border-radius: 999px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.08);
          color: ${COLORS.cream};
          font-weight: 1000;
          cursor: pointer;
        }

        .gridLayout {
          width: min(1120px, 100%);
          max-width: 100%;
          margin: 18px auto 0;
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
          gap: 18px;
        }

        .formPanel,
        .previewPanel,
        .photoPanel {
          position: relative;
        }

        .formPanel {
          z-index: 35;
        }

        .previewPanel {
          z-index: 10;
        }

        .photoPanel {
          z-index: 5;
        }

        .panel {
          min-width: 0;
          border-radius: 26px;
          padding: 22px;
        }

        .loadingPanel {
          margin-top: 18px;
          color: ${COLORS.cream};
          font-weight: 900;
        }

        .notice {
          margin-top: 14px;
          border-radius: 18px;
          padding: 14px 18px;
          font-weight: 900;
        }

        .errorNotice {
          color: ${COLORS.danger};
        }

        .successNotice {
          color: ${COLORS.ok};
        }

        .sectionHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 18px;
          color: ${COLORS.cream};
        }

        .sectionHeader span {
          font-size: 14px;
          font-weight: 900;
        }

        .sectionHeader strong {
          font-size: 13px;
          color: ${COLORS.soft};
        }

        label {
          display: grid;
          gap: 8px;
          margin-bottom: 14px;
        }

        label span {
          font-size: 13px;
          color: ${COLORS.cream};
          font-weight: 900;
        }

        input,
        textarea {
          width: 100%;
          border: 1px solid ${COLORS.line};
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.06);
          color: ${COLORS.white};
          padding: 13px 14px;
          font-size: 16px;
          font-weight: 800;
          min-height: 52px;
          outline: none;
          min-width: 0;
        }

        textarea {
          resize: vertical;
          min-height: 140px;
          line-height: 1.6;
          padding-top: 14px;
        }

        input::placeholder,
        textarea::placeholder {
          color: rgba(255, 255, 255, 0.34);
        }

        .uploadRow {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin: -4px 0 16px;
        }

        .compactUploadRow {
          margin-top: -6px;
        }

        .uploadButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          margin: 0;
          border: 1px solid rgba(238, 224, 197, 0.28);
          border-radius: 15px;
          background: rgba(238, 224, 197, 0.12);
          color: ${COLORS.cream};
          padding: 11px 14px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 1000;
        }

        .uploadButton input {
          display: none;
        }

        .uploadButton span {
          color: ${COLORS.cream};
          font-size: 13px;
        }

        :global(.splitHelpAction) .uploadButton.splitHelpUploadLabel {
          width: 100%;
          margin: 0;
          border: 0;
          border-radius: 15px 0 0 15px;
          background: transparent;
          box-shadow: none;
        }

        .uploadRow small {
          color: ${COLORS.soft};
          font-weight: 800;
        }

        .twoCols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .checkRow,
        .photoOptions label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          color: ${COLORS.soft};
          font-weight: 900;
        }

        .checkRow input,
        .photoOptions input {
          width: auto;
        }

        .introPreview {
          border: 1px solid rgba(238, 224, 197, 0.2);
          border-radius: 24px;
          padding: 10px;
          background: ${COLORS.panelStrong};
        }

        .introPreviewFrame {
          overflow: hidden;
        }

        .customerPreviewPage {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .customerPreviewHeroCard,
        .customerPreviewIntroCard,
        .customerPreviewPortfolioBlock {
          border: 1px solid ${COLORS.line};
          border-radius: 24px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.075),
            rgba(255, 255, 255, 0.035)
          );
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
        }

        .customerPreviewHeroCard {
          padding: 16px;
        }

        .customerPreviewStepBadge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 7px 11px;
          background: rgba(238, 224, 197, 0.1);
          color: ${COLORS.cream};
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 10px;
        }

        .customerPreviewTitle {
          margin: 0;
          color: ${COLORS.white};
          font-size: 30px;
          line-height: 1.08;
          letter-spacing: -0.04em;
          word-break: keep-all;
        }

        .customerPreviewHeroText {
          margin: 10px 0 0;
          color: ${COLORS.soft};
          font-size: 14px;
          line-height: 1.65;
          word-break: keep-all;
        }

        .customerPreviewLinkCard {
          margin-top: 14px;
          border-radius: 20px;
          padding: 14px 16px;
          background: rgba(238, 224, 197, 0.1);
          border: 1px solid ${COLORS.line};
          color: ${COLORS.white};
          font-size: 14px;
          line-height: 1.7;
          font-weight: 800;
        }

        .customerPreviewIntroCard {
          padding: 16px;
        }

        .customerPreviewLogoBox {
          width: min(340px, 100%);
          min-height: 0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: center;
          margin: 0 auto;
          background: transparent;
          border: 0;
          border-radius: 0;
          color: ${COLORS.cream};
          font-size: 72px;
          font-weight: 1000;
        }

        .customerPreviewLogoBox img {
          width: 100%;
          max-width: 340px;
          height: auto;
          max-height: 136px;
          object-fit: contain;
          object-position: center center;
          display: block;
        }

        .customerPreviewTextBox {
          margin-top: 14px;
        }

        .customerPreviewTextBox p {
          margin: 0;
          color: ${COLORS.soft};
          font-size: 15px;
          line-height: 1.72;
          white-space: pre-line;
          word-break: keep-all;
        }

        .customerPreviewContactRow {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
        }

        .customerPreviewContactButton {
          min-height: 46px;
          border-radius: 999px;
          padding: 0 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(238, 224, 197, 0.1);
          border: 1px solid rgba(238, 224, 197, 0.2);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 12px 24px rgba(0, 0, 0, 0.18);
          color: ${COLORS.cream};
          text-decoration: none;
          font-size: 14px;
          font-weight: 1000;
          white-space: nowrap;
          word-break: keep-all;
        }

        .customerPreviewContactIcon {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          background: rgba(238, 224, 197, 0.16);
          color: ${COLORS.cream};
        }

        .customerPreviewContactIcon svg {
          width: 14px;
          height: 14px;
          display: block;
          fill: currentColor;
        }

        .customerPreviewContactIcon.kakao svg {
          width: 15px;
          height: 15px;
        }

        .customerPreviewPortfolioBlock {
          padding: 14px;
        }

        .customerPreviewPortfolioHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .customerPreviewSectionLabel {
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .customerPreviewPortfolioHeader h3 {
          margin: 0;
          color: ${COLORS.white};
          font-size: 20px;
          letter-spacing: -0.03em;
          line-height: 1.3;
          word-break: keep-all;
        }

        .customerPreviewPortfolioHeader > span {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 7px 10px;
          background: rgba(238, 224, 197, 0.1);
          color: ${COLORS.cream};
          font-size: 12px;
          font-weight: 900;
        }

        .customerPreviewPhotoGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .customerPreviewPhotoCard {
          position: relative;
          min-height: 210px;
          margin: 0;
          border-radius: 20px;
          overflow: hidden;
          background: rgba(238, 224, 197, 0.08);
          border: 1px solid ${COLORS.line};
        }

        .customerPreviewPhotoCard img,
        .photoPreview img,
        .photoThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .customerPreviewPhotoCard figcaption {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 10px;
          border-radius: 14px;
          padding: 9px 10px;
          background: rgba(7, 5, 58, 0.76);
          backdrop-filter: blur(10px);
        }

        .customerPreviewPhotoCard strong,
        .customerPreviewPhotoCard span {
          display: block;
        }

        .customerPreviewPhotoCard strong {
          font-size: 13px;
          color: ${COLORS.white};
        }

        .customerPreviewPhotoCard span {
          margin-top: 3px;
          font-size: 12px;
          color: ${COLORS.soft};
        }

        .customerPreviewBottomNav {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
          border-radius: 22px;
          padding: 6px;
          background: rgba(8, 6, 62, 0.96);
          border: 1px solid ${COLORS.line};
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
        }

        .customerPreviewBottomButton {
          min-height: 44px;
          border: 0;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          color: ${COLORS.soft};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 900;
        }

        .customerPreviewBottomButton span {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.18);
          color: ${COLORS.cream};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }

        .customerPreviewBottomButtonActive {
          background: rgba(238, 224, 197, 0.14);
          color: ${COLORS.cream};
          box-shadow: inset 0 0 0 1px rgba(238, 224, 197, 0.24);
        }

        .photoPreviewGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .photoPreview {
          position: relative;
          overflow: hidden;
          min-height: 150px;
          border-radius: 18px;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.06);
        }

        .photoPreview div {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 10px;
          border-radius: 14px;
          padding: 10px;
          background: rgba(7, 5, 58, 0.76);
          backdrop-filter: blur(10px);
        }

        .photoPreview strong,
        .photoPreview span {
          display: block;
        }

        .photoPreview strong {
          font-size: 13px;
          color: ${COLORS.white};
        }

        .photoPreview span {
          margin-top: 3px;
          font-size: 12px;
          color: ${COLORS.soft};
        }

        .emptyPreview {
          border: 1px dashed rgba(238, 224, 197, 0.28);
          border-radius: 18px;
          padding: 28px 16px;
          text-align: center;
          color: ${COLORS.soft};
          font-weight: 900;
        }

        .photoPanel {
          margin-top: 18px;
        }

        .photoList {
          display: grid;
          gap: 14px;
        }

        .photoItem {
          display: grid;
          grid-template-columns: 160px 1fr;
          gap: 14px;
          padding: 14px;
          border: 1px solid ${COLORS.line};
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.035);
        }

        .photoThumb {
          min-height: 130px;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid ${COLORS.line};
          display: grid;
          place-items: center;
          background: rgba(238, 224, 197, 0.1);
          color: ${COLORS.cream};
          font-size: 34px;
          font-weight: 1000;
        }

        .photoGuideFields {
          display: block;
        }

        .photoOptions {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .photoOptions button {
          margin-left: auto;
          padding: 9px 12px;
          color: ${COLORS.danger};
        }

        .footerActions {
          margin-top: 18px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .saveButton {
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          min-width: 180px;
        }

        .saveButton:disabled {
          opacity: 0.58;
          cursor: wait;
        }

        @media (max-width: 820px) {
          .settingsPage {
            padding: 14px 12px 124px;
          }

          .backButton {
            margin-bottom: 14px;
          }

          .heroCard,
          .panel,
          .notice {
            border-radius: 22px;
          }

          .heroCard {
            padding: 18px 16px;
            align-items: stretch;
            flex-direction: column;
            gap: 16px;
          }

          h1 {
            margin-top: 12px;
            font-size: 28px;
            line-height: 1.08;
            letter-spacing: -0.04em;
          }

          p {
            font-size: 14px;
            line-height: 1.58;
          }

          .heroActions {
            display: grid;
            grid-template-columns: 1fr;
            justify-content: stretch;
            width: 100%;
          }

          :global(.previewSplitHelp) {
            width: 100%;
          }

          .heroActions > button,
          .subButton,
          .saveButton,
          .photoOptions button {
            min-height: 48px;
            justify-content: center;
            text-align: center;
            padding: 12px 14px;
          }

          .gridLayout {
            margin-top: 14px;
            grid-template-columns: minmax(0, 1fr);
            gap: 14px;
          }

          .previewPanel {
            display: none;
          }

          .panel {
            padding: 16px 14px;
          }

          .sectionHeader {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 14px;
          }

          label {
            margin-bottom: 12px;
          }

          .twoCols {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .uploadRow {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .uploadButton {
            width: 100%;
            min-height: 48px;
          }

          :global(.uploadSplitHelpAction),
          :global(.splitHelpAction) .uploadButton.splitHelpUploadLabel {
            width: 100%;
          }

          .uploadRow small {
            display: block;
            width: 100%;
            font-size: 12px;
            line-height: 1.5;
          }

          .checkRow {
            align-items: flex-start;
          }

          .introPreview {
            padding: 8px;
            border-radius: 20px;
          }

          .customerPreviewPage {
            gap: 10px;
          }

          .customerPreviewHeroCard,
          .customerPreviewIntroCard,
          .customerPreviewPortfolioBlock {
            border-radius: 20px;
          }

          .customerPreviewHeroCard,
          .customerPreviewIntroCard {
            padding: 14px;
          }

          .customerPreviewTitle {
            font-size: 24px;
          }

          .customerPreviewHeroText,
          .customerPreviewTextBox p {
            font-size: 13px;
            line-height: 1.6;
          }

          .customerPreviewLogoBox {
            width: min(280px, 100%);
            font-size: 34px;
          }

          .customerPreviewLogoBox img {
            max-width: 280px;
            max-height: 112px;
          }

          .customerPreviewContactRow {
            grid-template-columns: 1fr;
          }

          .customerPreviewBottomNav {
            gap: 4px;
          }

          .customerPreviewBottomButton {
            min-height: 40px;
            font-size: 11px;
          }

          .customerPreviewBottomButton span {
            width: 18px;
            height: 18px;
            font-size: 10px;
          }

          .photoPreview {
            min-height: 180px;
          }

          .photoPreview div {
            left: 8px;
            right: 8px;
            bottom: 8px;
            padding: 9px;
          }

          .photoPanel {
            margin-top: 14px;
          }

          .photoList {
            gap: 12px;
          }

          .photoItem {
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 12px;
            border-radius: 18px;
          }

          .photoThumb {
            min-height: 180px;
            border-radius: 16px;
          }

          .photoFields {
            min-width: 0;
          }

          .photoOptions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 12px;
            align-items: center;
          }

          .photoOptions label {
            min-height: 40px;
          }

          .photoOptions button {
            margin-left: 0;
            grid-column: 1 / -1;
            width: 100%;
          }

          .portfolioGrid {
            padding-bottom: 8px;
          }

          .footerActions {
            position: static;
            z-index: auto;
            margin: 22px 0 0;
            padding: 0;
            border-radius: 0;
            background: transparent;
            backdrop-filter: none;
            flex-direction: column-reverse;
          }

          .subButton,
          .saveButton {
            width: 100%;
          }
        }

        @media (max-width: 420px) {
          .settingsPage {
            padding-left: 10px;
            padding-right: 10px;
          }

          h1 {
            font-size: 24px;
          }

          .heroActions {
            grid-template-columns: 1fr;
          }

          .stepPill {
            padding: 8px 12px;
            font-size: 12px;
          }

          .customerPreviewContactButton {
            width: 100%;
          }

          .previewBubbleBackdrop {
            padding: 10px;
            align-items: flex-end;
          }

          .previewBubble {
            max-height: calc(100dvh - 24px);
            border-radius: 22px 22px 18px 18px;
            padding: 14px;
          }
        }
      `}</style>
    </main>
  );
}
