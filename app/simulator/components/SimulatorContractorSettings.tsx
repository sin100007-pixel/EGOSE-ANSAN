"use client";

import { useEffect, useMemo, useState } from "react";
import SimulatorLinkTabs from "./SimulatorLinkTabs";

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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<"logo" | number | null>(null);
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
  const [photos, setPhotos] = useState<ContractorPhoto[]>([
    emptyPhoto(1),
    emptyPhoto(2),
    emptyPhoto(3),
  ]);

  const visiblePhotos = useMemo(() => {
    return photos.filter((photo) => photo.image_url.trim() && photo.is_visible);
  }, [photos]);

  const applyResponse = (json: ApiResponse) => {
    const profile = json.profile || null;
    const nextInstallerName = json.installer_name || profile?.installer_name || "";

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
        ? next.map((photo, photoIndex) => ({ ...photo, sort_order: photoIndex + 1 }))
        : [emptyPhoto(1)];
    });
  };

  const uploadImage = async (file: File | undefined, type: "logo" | "portfolio", photoIndex?: number) => {
    if (!file) return;

    const target = type === "logo" ? "logo" : photoIndex ?? 0;
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

      setMessage("이미지를 업로드했습니다. 마지막에 설정 저장을 눌러 반영해주세요.");
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
      <section className="heroCard">
        <div>
          <span className="stepPill">시공자 설정</span>
          <h1>고객용 시뮬레이터 소개 화면</h1>
          <p>고객 링크 첫 화면에 보일 로고, 인삿말, 연락처, 대표 시공사진을 관리합니다.</p>
        </div>
        <div className="heroActions">
          <button type="button" onClick={() => setIsPreviewOpen(true)} disabled={loading}>
            미리보기
          </button>
        </div>
      </section>

      {loading ? (
        <section className="panel loadingPanel">설정을 불러오는 중...</section>
      ) : (
        <>
          {error ? <div className="notice errorNotice">{error}</div> : null}
          {message ? <div className="notice successNotice">{message}</div> : null}

          <section className="gridLayout">
            <div className="panel formPanel">
              <div className="sectionHeader">
                <span>기본 정보</span>
                <strong>{installerName ? `${installerName} 계정` : "현재 계정"}</strong>
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
                <label className="uploadButton">
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
                  <span>{uploadingTarget === "logo" ? "로고 업로드 중..." : "로고 이미지 업로드"}</span>
                </label>
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
                <span>카카오 문의 링크</span>
                <input
                  value={kakaoUrl}
                  onChange={(event) => setKakaoUrl(event.target.value)}
                  placeholder="예: https://pf.kakao.com/.../chat"
                />
              </label>

              <label className="checkRow">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                />
                <span>고객 링크에 시공자 소개 화면 노출</span>
              </label>
            </div>

            <div className="panel previewPanel">
              <div className="sectionHeader">
                <span>미리보기</span>
                <strong>고객 첫 화면</strong>
              </div>

              <div className="introPreview" style={{ borderColor: `${brandColor}88` }}>
                <div className="previewTop">
                  <div className="logoPreview">
                    {logoUrl ? <img src={logoUrl} alt="시공자 로고 미리보기" /> : <span>{(displayName || installerName || "시").slice(0, 1)}</span>}
                  </div>
                  <div>
                    <small>시공자 소개</small>
                    <h2>{displayName || installerName || "시공자"}님이 보내신 필름 시뮬레이터입니다.</h2>
                    <p>{greeting || "시공 전 원하는 필름을 미리 적용해보시고 편하게 문의주세요."}</p>
                  </div>
                </div>

                <div className="previewButtons">
                  {phone ? <span>전화 {phone}</span> : null}
                  {kakaoUrl ? <span>카카오 문의</span> : null}
                </div>

                {visiblePhotos.length > 0 ? (
                  <div className="photoPreviewGrid">
                    {visiblePhotos.slice(0, 3).map((photo, index) => (
                      <div className="photoPreview" key={`${photo.image_url}-${index}`}>
                        <img src={photo.image_url} alt={photo.title || "대표 시공사진"} />
                        <div>
                          <strong>{photo.title || "대표 시공사진"}</strong>
                          {photo.description ? <span>{photo.description}</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="emptyPreview">대표 시공사진 URL을 입력하면 여기에 보입니다.</div>
                )}
              </div>
            </div>
          </section>

          <section className="panel photoPanel">
            <div className="sectionHeader">
              <span>대표 시공사진</span>
              <strong>최대 12장 저장 가능</strong>
            </div>

            <div className="photoList">
              {photos.map((photo, index) => (
                <article className="photoItem" key={index}>
                  <div className="photoThumb">
                    {photo.image_url ? <img src={photo.image_url} alt="시공사진 미리보기" /> : <span>{index + 1}</span>}
                  </div>

                  <div className="photoFields">
                    <label>
                      <span>사진 URL</span>
                      <input
                        value={photo.image_url}
                        onChange={(event) => updatePhoto(index, { image_url: event.target.value })}
                        placeholder="사진을 업로드하면 자동으로 입력됩니다."
                      />
                    </label>

                    <div className="uploadRow compactUploadRow">
                      <label className="uploadButton">
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
                        <span>{uploadingTarget === index ? "사진 업로드 중..." : "시공사진 업로드"}</span>
                      </label>
                      <small>업로드 후 URL이 자동 입력됩니다.</small>
                    </div>

                    <div className="twoCols">
                      <label>
                        <span>제목</span>
                        <input
                          value={photo.title}
                          onChange={(event) => updatePhoto(index, { title: event.target.value })}
                          placeholder="예: 싱크대 필름 시공"
                        />
                      </label>

                      <label>
                        <span>설명</span>
                        <input
                          value={photo.description}
                          onChange={(event) => updatePhoto(index, { description: event.target.value })}
                          placeholder="예: 화이트 계열 상하부장 시공"
                        />
                      </label>
                    </div>

                    <div className="photoOptions">
                      <label>
                        <input
                          type="checkbox"
                          checked={photo.is_visible}
                          onChange={(event) => updatePhoto(index, { is_visible: event.target.checked })}
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

                      <button type="button" onClick={() => removePhotoSlot(index)}>삭제</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="footerActions">
              <button type="button" className="subButton" onClick={addPhotoSlot}>사진 입력칸 추가</button>
              <button type="button" className="saveButton" onClick={save} disabled={saving || uploadingTarget !== null}>
                {saving ? "저장 중..." : uploadingTarget !== null ? "업로드 중..." : "설정 저장"}
              </button>
            </div>
          </section>
        </>
      )}

      {isPreviewOpen ? (
        <div className="previewBubbleBackdrop" role="presentation" onClick={() => setIsPreviewOpen(false)}>
          <div className="previewBubble" role="dialog" aria-modal="true" aria-label="고객 첫 화면 미리보기" onClick={(event) => event.stopPropagation()}>
            <div className="previewBubbleHeader">
              <div>
                <span>미리보기</span>
                <strong>고객 첫 화면</strong>
              </div>
              <button type="button" onClick={() => setIsPreviewOpen(false)}>닫기</button>
            </div>

            <div className="introPreview" style={{ borderColor: `${brandColor}88` }}>
              <div className="previewTop">
                <div className="logoPreview">
                  {logoUrl ? <img src={logoUrl} alt="시공자 로고 미리보기" /> : <span>{(displayName || installerName || "시").slice(0, 1)}</span>}
                </div>
                <div>
                  <small>시공자 소개</small>
                  <h2>{displayName || installerName || "시공자"}님이 보내신 필름 시뮬레이터입니다.</h2>
                  <p>{greeting || "시공 전 원하는 필름을 미리 적용해보시고 편하게 문의주세요."}</p>
                </div>
              </div>

              <div className="previewButtons">
                {phone ? <span>전화 {phone}</span> : null}
                {kakaoUrl ? <span>카카오 문의</span> : null}
              </div>

              {visiblePhotos.length > 0 ? (
                <div className="photoPreviewGrid">
                  {visiblePhotos.slice(0, 3).map((photo, index) => (
                    <div className="photoPreview" key={`${photo.image_url}-${index}`}>
                      <img src={photo.image_url} alt={photo.title || "대표 시공사진"} />
                      <div>
                        <strong>{photo.title || "대표 시공사진"}</strong>
                        {photo.description ? <span>{photo.description}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="emptyPreview">대표 시공사진 URL을 입력하면 여기에 보입니다.</div>
              )}
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
          background:
            radial-gradient(circle at 16% 0%, rgba(238, 224, 197, 0.13), transparent 32%),
            ${COLORS.bg};
          color: ${COLORS.white};
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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

        .heroActions button,
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

        .heroActions button,
        .subButton,
        .photoOptions button {
          background: rgba(255, 255, 255, 0.06);
          color: ${COLORS.cream};
        }
        .heroActions button:disabled {
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
          padding: 18px;
          background: ${COLORS.panelStrong};
        }

        .previewTop {
          display: grid;
          grid-template-columns: 88px 1fr;
          gap: 16px;
          align-items: center;
        }

        .logoPreview {
          width: 88px;
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(238, 224, 197, 0.22);
          background: rgba(238, 224, 197, 0.13);
          color: ${COLORS.cream};
          font-size: 44px;
          font-weight: 1000;
        }

        .logoPreview img,
        .photoPreview img,
        .photoThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .previewTop small {
          color: ${COLORS.cream};
          font-weight: 900;
        }

        .previewTop h2 {
          margin: 6px 0 8px;
          font-size: 24px;
          line-height: 1.22;
          letter-spacing: -0.04em;
        }

        .previewButtons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin: 16px 0;
        }

        .previewButtons span {
          display: inline-flex;
          border-radius: 999px;
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          padding: 10px 13px;
          font-size: 13px;
          font-weight: 1000;
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

          .heroActions button,
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
            padding: 14px;
            border-radius: 20px;
          }

          .previewTop {
            grid-template-columns: 1fr;
            gap: 12px;
            align-items: flex-start;
          }

          .logoPreview {
            width: 72px;
            border-radius: 18px;
            font-size: 34px;
          }

          .previewTop h2 {
            margin: 4px 0 6px;
            font-size: 20px;
            line-height: 1.28;
          }

          .previewButtons {
            margin: 12px 0 14px;
          }

          .previewButtons span {
            min-height: 42px;
            align-items: center;
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

          .footerActions {
            position: sticky;
            bottom: calc(78px + env(safe-area-inset-bottom));
            z-index: 10;
            margin: 16px -4px 0;
            padding: 10px;
            border-radius: 18px;
            background: rgba(5, 2, 59, 0.92);
            backdrop-filter: blur(14px);
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

          .previewButtons span {
            width: 100%;
            justify-content: center;
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
