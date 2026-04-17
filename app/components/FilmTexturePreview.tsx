'use client';

import { useMemo, useState } from 'react';

type MaterialPreset = {
  code: string;
  src: string;
};

type TargetKey = 'wallAll' | 'wallOdd' | 'wallEven' | 'floor';

const MATERIALS: MaterialPreset[] = [
  { code: 'NG2045', src: '/film-preview/materials/NG2045.jpg' },
  { code: 'NG2054', src: '/film-preview/materials/NG2054.jpg' },
  { code: 'ZG5000', src: '/film-preview/materials/ZG5000.jpg' },
  { code: 'ZG5010', src: '/film-preview/materials/ZG5010.png' },
  { code: 'UG6516', src: '/film-preview/materials/UG6516.jpg' },
  { code: 'VG3333', src: '/film-preview/materials/VG3333.png' },
  { code: 'VG3700', src: '/film-preview/materials/VG3700.jpg' },
  { code: 'BG8007', src: '/film-preview/materials/BG8007.png' },
];

const DEFAULTS = {
  wallOdd: '/film-preview/materials/NG2045.jpg',
  wallEven: '/film-preview/materials/VG3333.png',
  floor: '/film-preview/materials/BG8007.png',
};

const OVERLAY_SRC = '/film-preview/overlay-elevator.png';
const WALL_ODD_MASK = '/film-preview/wall1-mask2.png';
const WALL_EVEN_MASK = '/film-preview/wall2-mask2.png';
const FLOOR_MASK = '/film-preview/floor-mask2.png';

function findCode(src: string) {
  return MATERIALS.find((item) => item.src === src)?.code ?? src;
}

function TextureLayer({
  textureSrc,
  maskSrc,
  size,
  zIndex,
}: {
  textureSrc: string;
  maskSrc: string;
  size: number;
  zIndex: number;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex,
        pointerEvents: 'none',
        backgroundImage: `url(${textureSrc})`,
        backgroundRepeat: 'repeat',
        backgroundPosition: '0 0',
        backgroundSize: `${size}px auto`,
        WebkitMaskImage: `url(${maskSrc})`,
        WebkitMaskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskImage: `url(${maskSrc})`,
        maskSize: '100% 100%',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
      }}
    />
  );
}

function OverlayLayer() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
        userSelect: 'none',
        backgroundImage: `url(${OVERLAY_SRC})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: '100% 100%',
      }}
    />
  );
}

function targetLabel(target: TargetKey) {
  switch (target) {
    case 'wallAll':
      return '벽 전체';
    case 'wallOdd':
      return '홀수벽';
    case 'wallEven':
      return '짝수벽';
    case 'floor':
      return '바닥';
  }
}

export default function FilmTexturePreview() {
  const [target, setTarget] = useState<TargetKey>('wallAll');
  const [wallOddTexture, setWallOddTexture] = useState(DEFAULTS.wallOdd);
  const [wallEvenTexture, setWallEvenTexture] = useState(DEFAULTS.wallEven);
  const [floorTexture, setFloorTexture] = useState(DEFAULTS.floor);

  const wallOddSize = 320;
  const wallEvenSize = 320;
  const floorSize = 360;

  const currentAppliedCode = useMemo(() => {
    switch (target) {
      case 'wallAll':
        return `${findCode(wallOddTexture)} / ${findCode(wallEvenTexture)}`;
      case 'wallOdd':
        return findCode(wallOddTexture);
      case 'wallEven':
        return findCode(wallEvenTexture);
      case 'floor':
        return findCode(floorTexture);
    }
  }, [floorTexture, target, wallEvenTexture, wallOddTexture]);

  function applyMaterial(src: string) {
    if (target === 'wallAll') {
      setWallOddTexture(src);
      setWallEvenTexture(src);
      return;
    }
    if (target === 'wallOdd') {
      setWallOddTexture(src);
      return;
    }
    if (target === 'wallEven') {
      setWallEvenTexture(src);
      return;
    }
    setFloorTexture(src);
  }

  function isSelectedInCurrentTarget(src: string) {
    if (target === 'wallAll') return wallOddTexture === src && wallEvenTexture === src;
    if (target === 'wallOdd') return wallOddTexture === src;
    if (target === 'wallEven') return wallEvenTexture === src;
    return floorTexture === src;
  }

  function resetAll() {
    setWallOddTexture(DEFAULTS.wallOdd);
    setWallEvenTexture(DEFAULTS.wallEven);
    setFloorTexture(DEFAULTS.floor);
    setTarget('wallAll');
  }

  function copyOddToEven() {
    setWallEvenTexture(wallOddTexture);
  }

  function copyEvenToOdd() {
    setWallOddTexture(wallEvenTexture);
  }

  const buttonStyle: React.CSSProperties = {
    border: '1px solid #d4d4d8',
    background: '#ffffff',
    color: '#111827',
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    lineHeight: 1.2,
  };

  const activeTargetStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#111827',
    color: '#ffffff',
    borderColor: '#111827',
  };

  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: '16px 12px 24px',
        fontFamily: 'Arial, Apple SD Gothic Neo, Malgun Gothic, sans-serif',
        color: '#111827',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 20,
          padding: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.2 }}>필름 시뮬레이터</h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7280' }}>
              적용할 위치를 먼저 고른 뒤, 아래 샘플을 누르면 바로 반영됩니다.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={copyOddToEven} style={buttonStyle}>홀수벽 → 짝수벽</button>
            <button type="button" onClick={copyEvenToOdd} style={buttonStyle}>짝수벽 → 홀수벽</button>
            <button
              type="button"
              onClick={resetAll}
              style={{ ...buttonStyle, background: '#111827', color: '#ffffff', borderColor: '#111827' }}
            >
              전체 초기화
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            background: '#f3f4f6',
            borderRadius: 18,
            padding: 10,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 560,
              aspectRatio: '2048 / 1365',
              overflow: 'hidden',
              borderRadius: 14,
              background: '#e5e7eb',
            }}
          >
            <TextureLayer textureSrc={floorTexture} maskSrc={FLOOR_MASK} size={floorSize} zIndex={1} />
            <TextureLayer textureSrc={wallEvenTexture} maskSrc={WALL_EVEN_MASK} size={wallEvenSize} zIndex={2} />
            <TextureLayer textureSrc={wallOddTexture} maskSrc={WALL_ODD_MASK} size={wallOddSize} zIndex={3} />
            <OverlayLayer />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginTop: 14 }}>
          {([
            { key: 'wallAll', title: '벽 전체', sub: '같은 필름' },
            { key: 'wallOdd', title: '홀수벽', sub: '1, 3, 5칸' },
            { key: 'wallEven', title: '짝수벽', sub: '2, 4칸' },
            { key: 'floor', title: '바닥', sub: '바닥만 변경' },
          ] as const).map((item) => {
            const active = target === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTarget(item.key)}
                style={active ? activeTargetStyle : buttonStyle}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{item.title}</div>
                <div style={{ fontSize: 11, marginTop: 3, opacity: active ? 0.82 : 0.65 }}>{item.sub}</div>
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            borderRadius: 12,
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            fontSize: 13,
            color: '#374151',
          }}
        >
          현재 편집 대상: <strong>{targetLabel(target)}</strong>
          <span style={{ margin: '0 8px', color: '#d1d5db' }}>|</span>
          현재 적용값: <strong>{currentAppliedCode}</strong>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 20,
          padding: 14,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ marginBottom: 10, fontSize: 14, fontWeight: 700 }}>필름 선택</div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 72px))',
            gap: 8,
            justifyContent: 'start',
          }}
        >
          {MATERIALS.map((material) => {
            const selected = isSelectedInCurrentTarget(material.src);
            return (
              <button
                key={material.code}
                type="button"
                onClick={() => applyMaterial(material.src)}
                style={{
                  border: selected ? '2px solid #111827' : '1px solid #d4d4d8',
                  background: '#ffffff',
                  borderRadius: 12,
                  padding: 4,
                  cursor: 'pointer',
                  textAlign: 'center',
                  boxShadow: selected ? '0 0 0 1px #111827 inset' : 'none',
                }}
              >
                <div
                  style={{
                    width: 62,
                    height: 62,
                    overflow: 'hidden',
                    borderRadius: 8,
                    margin: '0 auto',
                    background: '#f3f4f6',
                  }}
                >
                  <img
                    src={material.src}
                    alt={material.code}
                    draggable={false}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, marginTop: 5, color: '#111827' }}>{material.code}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 8,
          marginTop: 14,
        }}
      >
        {[
          { label: '홀수벽', value: findCode(wallOddTexture) },
          { label: '짝수벽', value: findCode(wallEvenTexture) },
          { label: '바닥', value: findCode(floorTexture) },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              padding: '10px 12px',
              fontSize: 13,
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontWeight: 700 }}>{item.label}</div>
            <div style={{ marginTop: 4, color: '#4b5563' }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
