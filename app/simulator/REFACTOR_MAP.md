# EGOSE Simulator 리팩토링 맵

이 문서는 `app/simulator` 리팩토링 후 “어떤 로직이 어디로 분리됐는지” 헷갈리지 않도록 남기는 지도입니다.

## 현재 원칙

- 기능 개선보다 파일 분리를 우선합니다.
- API 응답 구조, 검색 조건, 카카오톡/삼성/웨일 인앱브라우저 보정 흐름은 임의로 바꾸지 않습니다.
- 큰 파일을 줄일 때도 기존 className과 화면 구조를 최대한 유지합니다.
- 한 단계가 끝날 때마다 `npm run build` 또는 최소 `npx tsc --noEmit --pretty false`로 확인합니다.

## 1~4단계 기준

### `app/simulator/components/SimulatorClient.tsx`

- 시뮬레이터 고객 화면의 최상위 client component입니다.
- 현재 step, 선택 공간, 선택 필름, hook 결과를 화면 컴포넌트에 연결하는 조립 역할을 담당합니다.

### `app/simulator/components/SimulatorClientStyles.tsx`

- `SimulatorClient.tsx`에서 분리된 styled-jsx 스타일입니다.
- 기존 className 기반 디자인을 유지하기 위한 파일입니다.

### `app/simulator/components/client/*`

고객용 시뮬레이터 화면 조각입니다.

- `SimulatorSpaceStep.tsx`: 1단계 공간 선택 UI
- `SimulatorApplyStep.tsx`: 색상/필름 적용 UI
- `SimulatorDecisionStep.tsx`: 결정 확정 UI
- `SimulatorFilmSheet.tsx`: 필름 선택 시트 UI
- `SimulatorScenePreview.tsx`: 공간 이미지/마스크/오버레이 미리보기
- `SimulatorBottomStepNav.tsx`: 하단 단계 이동 버튼
- `SimulatorCustomerGuideModal.tsx`: 고객 안내 모달
- `SimulatorDecisionExportCard.tsx`: 결정 결과 공유 카드

### `app/simulator/lib/client-utils.ts`

- 고객 화면에서 쓰는 브라우저/이미지/API 보정 유틸입니다.
- 카카오톡 인앱브라우저 이미지/API 보정과 관련된 흐름은 이 파일과 호출부를 함께 봐야 합니다.

## 5단계: 링크생성/프리셋 공통화

이번 단계의 기준 파일은 아래 두 개입니다.

- `app/simulator/components/SimulatorLinkBuilder.tsx`
- `app/simulator/components/SimulatorPresetManager.tsx`

두 파일에 반복되던 필름 검색 UI를 아래 shared 컴포넌트로 분리했습니다.

### `app/simulator/components/shared/SimulatorFilmSearchPanel.tsx`

- 검색 input/form 공통 래퍼입니다.
- 내부에서 `SimulatorPaletteFilter`를 함께 렌더링합니다.
- 링크생성은 `className="customFilmBox"`, 프리셋은 `className="filmPicker"`를 넘겨 기존 스타일을 유지합니다.

### `app/simulator/components/shared/SimulatorPaletteFilter.tsx`

- 색상으로 찾기 토글
- 적용 중인 팔레트 필터 칩
- 1차 분류 / 2차 분류 / 색상 팔레트 버튼
- 팔레트 기본 순서와 정렬 유틸

보관 중인 공통 값/함수:

- `DEFAULT_PALETTE_MAIN_OPTIONS`
- `DEFAULT_PALETTE_COLOR_OPTIONS`
- `orderPaletteValues`
- `uniqueClean`

### `app/simulator/components/shared/SimulatorSelectedFilmList.tsx`

- 선택된 필름 칩 목록입니다.
- 링크생성/프리셋의 빈 상태 문구만 props로 다르게 받습니다.

### `app/simulator/components/shared/SimulatorFilmResultCard.tsx`

- 필름 검색 결과 카드입니다.
- `variant="link"`: 링크생성 화면의 `filmCard` 계열 className 사용
- `variant="preset"`: 프리셋 화면의 `filmResultCard` 계열 className 사용

보관 중인 공통 함수:

- `getFilmName`
- `getFilmCode`
- `getFilmThumbUrl`

### `app/simulator/components/shared/SimulatorSamplePreview.tsx`

- 샘플사진 보기 버블/모달입니다.
- 링크생성/프리셋에서 동일한 샘플 확대 UI를 사용합니다.

## 스타일 주의사항

`SimulatorLinkBuilder.tsx`와 `SimulatorPresetManager.tsx`의 스타일은 기존에는 같은 파일 내부 JSX에 붙어 있었습니다.

5단계에서 일부 JSX가 `shared/*` 자식 컴포넌트로 이동했기 때문에, 이동된 className에도 기존 스타일이 적용되도록 해당 두 파일의 styled-jsx는 `global` 적용으로 전환했습니다.

이 전환은 검색/팔레트/필름카드 UI가 기존 디자인을 그대로 받게 하기 위한 조치입니다.

## 다음 단계 후보

### 6단계: API route 공통 서버 로직 분리

대상 후보:

- `app/api/simulator/bootstrap/route.ts`
- `app/api/simulator/films/route.ts`
- `app/api/simulator/links/route.ts`
- `app/api/simulator/presets/route.ts`

분리 후보:

- `app/api/simulator/_lib/supabase.ts`
- `app/api/simulator/_lib/response.ts`
- `app/api/simulator/_lib/film-normalizer.ts`
- `app/api/simulator/_lib/image-url.ts`
- `app/api/simulator/_lib/link-scope.ts`
- `app/api/simulator/_lib/palette-facets.ts`
- `app/api/simulator/_lib/recommended-films.ts`

## 단계별 확인 목록

크롬:

- 시뮬봇 진입
- 공간 선택
- 추천 필름 표시
- 팔레트 표시
- 필름 검색
- 색상 적용
- 결과 카드
- 링크 생성
- 프리셋 생성/수정/삭제
- 소개 설정

카카오톡 인앱브라우저:

- 공간 이미지 표시
- 추천 필름 표시
- 팔레트 개수 정상
- 필름 검색 개수 정상
- 첫 번째 추천 필름 정상
