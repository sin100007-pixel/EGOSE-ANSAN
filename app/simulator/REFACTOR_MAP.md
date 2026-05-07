# EGOSE Simulator 리팩토링 맵

이 문서는 `app/simulator` 리팩토링 후 “어떤 로직이 어디로 분리됐는지” 헷갈리지 않도록 남기는 지도입니다.

## 현재 원칙

- 기능 개선보다 파일 분리를 우선합니다.
- API 응답 구조, 검색 조건, 카카오톡/삼성/웨일 인앱브라우저 보정 흐름은 임의로 바꾸지 않습니다.
- 큰 파일을 줄일 때도 기존 className과 화면 구조를 최대한 유지합니다.

## 1~4단계 기준

- `app/simulator/components/SimulatorClient.tsx`: 고객용 시뮬레이터 최상위 조립 컴포넌트
- `app/simulator/components/SimulatorClientStyles.tsx`: 고객 화면 styled-jsx 스타일
- `app/simulator/components/client/*`: 공간 선택, 색상 적용, 결정 확정, 필름 시트 등 고객 화면 조각
- `app/simulator/hooks/*`: 고객 화면 검색/API/공유/대시보드 이동 hook
- `app/simulator/lib/client-state.ts`: 고객 화면 공통 상태/타입
- `app/simulator/lib/client-utils.ts`: 카카오톡/삼성/웨일 인앱브라우저 이미지/API 보정 유틸

## 5단계: 링크생성/프리셋 공통화

- `app/simulator/components/shared/SimulatorFilmSearchPanel.tsx`: 필름 검색창 공통 래퍼
- `app/simulator/components/shared/SimulatorPaletteFilter.tsx`: 팔레트 1차/2차/색상 필터
- `app/simulator/components/shared/SimulatorSelectedFilmList.tsx`: 선택된 필름 목록
- `app/simulator/components/shared/SimulatorFilmResultCard.tsx`: 검색 결과 카드
- `app/simulator/components/shared/SimulatorSamplePreview.tsx`: 샘플사진 미리보기


## 6단계: API route 공통 서버 로직 분리

이번 단계는 API 응답 구조와 검색 조건을 바꾸지 않고, route 파일 안에 반복되던 서버 공통 함수를 `_lib`로 이동한 단계입니다.

기준 route 파일:

- `app/api/simulator/bootstrap/route.ts`
- `app/api/simulator/films/route.ts`
- `app/api/simulator/links/route.ts`
- `app/api/simulator/presets/route.ts`

### `app/api/simulator/_lib/response.ts`

- `KAKAO_NO_STORE_HEADERS`
- `jsonNoStore`

카카오톡/삼성/웨일 인앱브라우저 캐시 보정에 쓰이는 no-store 응답 헤더를 보관합니다.

### `app/api/simulator/_lib/supabase.ts`

- `getSupabase`

API route에서 Supabase client를 만드는 공통 함수입니다.

### `app/api/simulator/_lib/image-url.ts`

- `getCleanSupabaseUrl`
- `encodeStoragePath`
- `toPublicImageUrl`

Supabase Storage 이미지 URL을 만드는 공통 함수입니다. `bootstrap/route.ts`의 카카오 이미지 프록시 허용 origin 확인도 이 파일의 `getCleanSupabaseUrl`을 사용합니다.

### `app/api/simulator/_lib/film-normalizer.ts`

- `DEFAULT_RECOMMENDED_FILM_LIMIT`
- `PRODUCT_SELECT`
- `ProductRow`
- `normalizeFilm`
- `sortProductsByOrder`
- `mergeProductRows`

제품 row를 고객 화면에서 쓰는 `image_url`, `thumb_url`, `sample_url` 형태로 정규화하는 공통 로직입니다.

### `app/api/simulator/_lib/link-scope.ts`

- `FilmScope`
- `isExpired`
- `readAllowedProductIds`
- `readPresetProductIds`
- `readDefaultRecommendedProductIds`
- `safeReadDefaultRecommendedProductIds`

공유 링크의 필름 허용 범위, 프리셋 제한, 기본 추천 필름 조회 로직을 보관합니다.

### `app/api/simulator/_lib/search.ts`

- `cleanParam`
- `cleanPaletteColorParams`
- `normalizeForSearch`
- `buildQueryTokens`
- `buildDbOrFilter`
- `getScore`

`films/route.ts`에서 쓰는 검색어 정규화, PostgREST OR 필터 생성, 검색 점수 계산 로직입니다.

### `app/api/simulator/_lib/palette-facets.ts`

- `uniqueSorted`
- `emptyPaletteFacets`
- `readPaletteFacets`
- `safeReadPaletteFacets`

팔레트 1차/2차/색상 facet 조회 로직입니다.

### `app/api/simulator/_lib/request-values.ts`

- `normalizeString`
- `normalizeStringArray`
- `normalizeNumberArray`

`links/route.ts`, `presets/route.ts`에서 body 값을 안전하게 문자열/숫자 배열로 정리하는 공통 함수입니다.

## 고객 가이드 안내 문구/체크무늬 배지

- `app/simulator/lib/client-state.ts`: 고객 사용 가이드 문구와 단계별 안내 데이터
- `app/simulator/components/client/SimulatorCustomerGuideModal.tsx`: 안내 문구 렌더링, 체크무늬 인라인 배지 렌더링
- `app/simulator/components/SimulatorClientStyles.tsx`: 고객 가이드 팝업, 아이보리 섹션 제목, 원형 체크무늬 배지 스타일

색상 적용 단계 안내는 구역 선택, 색상 선택, 결정 확정 순서로 정리되어 있습니다.

## 6단계 이후 다음 후보

### 7단계: API route별 책임 더 줄이기

6단계에서는 중복 함수만 빼는 데 집중했습니다. 다음에 더 줄인다면 아래처럼 route별 조립 함수를 분리할 수 있습니다.

- `bootstrap/route.ts`: 링크 검증, 공간 조회, 추천 필름 조회 흐름 분리
- `films/route.ts`: 검색 조건 조립, fallback 검색, 정렬 흐름 분리
- `links/route.ts`: 생성/수정/삭제 handler 분리
- `presets/route.ts`: 프리셋 detail/replace/list handler 분리

단, 7단계는 route 흐름 자체를 건드리기 때문에 6단계보다 위험도가 높습니다.


## 가이드 토글 에셋

### app/simulator/assets/guide-on.png
- 고객 가이드 켜짐(ON) 상태 버튼 이미지

### app/simulator/assets/guide-off.png
- 고객 가이드 꺼짐(OFF) 상태 버튼 이미지
