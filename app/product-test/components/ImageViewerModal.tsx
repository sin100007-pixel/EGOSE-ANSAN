"use client";

import type { OpenedImage } from "../types";

type ImageViewerModalProps = {
  openedImage: OpenedImage | null;
  onClose: () => void;
};

export default function ImageViewerModal({
  openedImage,
  onClose,
}: ImageViewerModalProps) {
  if (!openedImage) return null;

  return (
    <div
      onClick={onClose}
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
          onClick={onClose}
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
  );
}
