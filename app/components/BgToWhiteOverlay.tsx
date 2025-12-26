// app/components/BgToWhiteOverlay.tsx
"use client";

export default function BgToWhiteOverlay() {
  return (
    <>
      <div className="bg-to-white" aria-hidden="true" />
      <style jsx>{`
        .bg-to-white {
          position: absolute;
          inset: 0;
          background: #ffffff;
          opacity: 0;
          pointer-events: none;
          z-index: 0;

          /* ✅ 해가 뜨기 시작하는 시점(1초)부터 같이 밝아짐: 1s 대기 + 4s 밝아짐 */
          animation: bgFadeToWhite 4s ease-in-out forwards;
          animation-delay: 1s;
        }

        @keyframes bgFadeToWhite {
          0% {
            opacity: 0;
          }
          30% {
            opacity: 0.15;
          }
          70% {
            opacity: 0.55;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
