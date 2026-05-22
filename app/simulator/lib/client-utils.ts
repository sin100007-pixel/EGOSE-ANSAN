import type { SimulatorFilm, SimulatorSpace } from "../types";

export type MaskZoneDefinition = {
  key: string;
  label: string;
  mask_url: string;
  patternSize?: number;
};

export const DEFAULT_MASK_ZONES: MaskZoneDefinition[] = [
  {
    key: "upper",
    label: "상부장",
    mask_url: "/simulator/fridge/fridge-upper-mask.png",
    patternSize: 220,
  },
  {
    key: "lower",
    label: "하부장",
    mask_url: "/simulator/fridge/fridge-lower-mask.png",
    patternSize: 220,
  },
  {
    key: "fridge",
    label: "냉장고장",
    mask_url: "/simulator/fridge/fridge-fridge-mask.png",
    patternSize: 220,
  },
];

export const PALETTE_MAIN_OPTIONS = ["솔리드", "우드", "스톤", "메탈", "페브릭레더"];

export const PALETTE_COLOR_OPTIONS = [
  "흰색",
  "아이보리",
  "베이지",
  "옐로/골드",
  "연브라운",
  "브라운",
  "진브라운",
  "다크브라운",
  "검정/차콜",
  "회색/실버",
  "블루",
  "그린",
  "레드/핑크",
  "퍼플",
];

export const PALETTE_COLOR_SWATCH: Record<string, string> = {
  흰색: "#F8F6EF",
  아이보리: "#EFE2C8",
  베이지: "#CDBA99",
  "옐로/골드": "#C9A04D",
  연브라운: "#B98252",
  브라운: "#8A5A35",
  진브라운: "#5A3926",
  다크브라운: "#3E2A20",
  "회색/실버": "#9A9A94",
  "검정/차콜": "#222222",
  그린: "#6F8A5B",
  블루: "#3D65B8",
  "레드/핑크": "#C95E6D",
  퍼플: "#7A5A9A",
};

export function orderPaletteColors(values: string[]) {
  const orderMap = new Map(PALETTE_COLOR_OPTIONS.map((value, index) => [value, index]));

  return [...values].sort((a, b) => {
    const ai = orderMap.has(a) ? orderMap.get(a)! : 999;
    const bi = orderMap.has(b) ? orderMap.get(b)! : 999;

    if (ai !== bi) return ai - bi;
    return a.localeCompare(b, "ko");
  });
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getFilmName(film: SimulatorFilm | null) {
  if (!film) return "필름을 선택해주세요";
  return film.full_name || film.product_code_1 || film.color_name || "선택한 필름";
}

export function getFilmCode(film: SimulatorFilm) {
  return [film.product_code_1, film.product_code_2].filter(Boolean).join(" / ");
}


export function normalizeClientSearch(value: string | null | undefined) {
  return String(value || "")
    .toUpperCase()
    .replace(/번/g, "")
    .replace(/[^0-9A-Z가-힣]/g, "");
}

export function getClientFilmSearchScore(film: SimulatorFilm, query: string) {
  const q = normalizeClientSearch(query);
  if (!q) return 1;

  const code1 = normalizeClientSearch(film.product_code_1);
  const code2 = normalizeClientSearch(film.product_code_2);
  const fullName = normalizeClientSearch(film.full_name);
  const colorName = normalizeClientSearch(film.color_name);

  const fields = [
    film.product_code_1,
    film.product_code_2,
    film.full_name,
    film.color_name,
    film.category_main,
    film.category_sub,
    film.palette_main,
    film.palette_sub,
    film.palette_color,
    film.manufacturer,
    code1 && code2 ? `${code1}${code2}` : "",
    code1 && colorName ? `${code1}${colorName}` : "",
    code2 && colorName ? `${code2}${colorName}` : "",
    fullName,
  ]
    .map((value) => normalizeClientSearch(value))
    .filter(Boolean);

  let score = 0;

  for (const field of fields) {
    if (field === q) score = Math.max(score, 100);
    else if (field.startsWith(q)) score = Math.max(score, 80);
    else if (field.includes(q)) score = Math.max(score, 60);
  }

  return score;
}

export function uniqueKoreanSorted(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "ko"));
}

export function mergeFilmsById(current: SimulatorFilm[], next: SimulatorFilm[]) {
  const map = new Map<number, SimulatorFilm>();

  for (const film of current) {
    if (Number.isFinite(Number(film.id))) map.set(Number(film.id), film);
  }

  for (const film of next) {
    if (Number.isFinite(Number(film.id))) map.set(Number(film.id), film);
  }

  return Array.from(map.values());
}

export function filterFilmsLocally(
  films: SimulatorFilm[],
  options: {
    keyword: string;
    paletteMain: string;
    paletteSub: string;
    paletteColors: string[];
  }
) {
  const isKeywordSearch = options.keyword.trim().length > 0;
  const paletteColorSet = new Set(isKeywordSearch ? [] : options.paletteColors);
  const paletteMain = isKeywordSearch ? "" : options.paletteMain;
  const paletteSub = isKeywordSearch ? "" : options.paletteSub;

  return films
    .filter((film) => {
      if (paletteMain && film.palette_main !== paletteMain) return false;
      if (paletteSub && film.palette_sub !== paletteSub) return false;
      if (paletteColorSet.size > 0 && !paletteColorSet.has(String(film.palette_color || ""))) {
        return false;
      }
      return true;
    })
    .map((film) => ({ film, score: getClientFilmSearchScore(film, options.keyword) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aName = a.film.full_name || a.film.product_code_1 || "";
      const bName = b.film.full_name || b.film.product_code_1 || "";
      return aName.localeCompare(bName, "ko");
    })
    .slice(0, 200)
    .map(({ film }) => film);
}

export function buildLocalPaletteFacets(
  films: SimulatorFilm[],
  paletteMain: string,
  paletteSub: string
) {
  const mainRows = paletteMain
    ? films.filter((film) => film.palette_main === paletteMain)
    : films;
  const subRows = paletteSub
    ? mainRows.filter((film) => film.palette_sub === paletteSub)
    : mainRows;

  return {
    palette_mains: uniqueKoreanSorted(films.map((film) => film.palette_main)),
    palette_subs: uniqueKoreanSorted(mainRows.map((film) => film.palette_sub)),
    palette_colors: uniqueKoreanSorted(subRows.map((film) => film.palette_color)),
  };
}

export function isFabricFilm(film: SimulatorFilm | null | undefined) {
  if (!film) return false;

  const categoryValues = [film.category_main, film.category_sub, film.palette_main]
    .filter(Boolean)
    .map((value) => String(value));

  return categoryValues.some((value) => /(패브릭|페브릭|fabric)/i.test(value));
}

export function readMaskZones(space: SimulatorSpace | null): MaskZoneDefinition[] {
  const rawZones = space?.mask_config?.["zones"];

  if (!Array.isArray(rawZones) || rawZones.length === 0) {
    return DEFAULT_MASK_ZONES;
  }

  const parsed = rawZones
    .map((zone) => {
      if (!zone || typeof zone !== "object") return null;

      const z = zone as Record<string, unknown>;

      if (
        typeof z.key !== "string" ||
        typeof z.label !== "string" ||
        typeof z.mask_url !== "string"
      ) {
        return null;
      }

      return {
        key: z.key,
        label: z.label,
        mask_url: normalizeImageSrc(z.mask_url),
        patternSize: typeof z.patternSize === "number" ? z.patternSize : 220,
      } as MaskZoneDefinition;
    })
    .filter(Boolean) as MaskZoneDefinition[];

  return parsed.length > 0 ? parsed : DEFAULT_MASK_ZONES;
}

export function readPreviewAspectRatio(space: SimulatorSpace | null) {
  const raw =
    space?.mask_config &&
    typeof space.mask_config["previewAspectRatio"] === "string"
      ? String(space.mask_config["previewAspectRatio"])
      : "1536 / 1024";

  return raw || "1536 / 1024";
}

export function getSpaceThumbnail(space: SimulatorSpace) {
  return normalizeImageSrc(space.thumbnail_url || space.overlay_image_url || space.base_image_url || "");
}

const KAKAO_CACHE_BUST_KEY = "__kakao_img";
const KAKAO_CACHE_BUST_VALUE = "20260522_direct1";
const KAKAO_IMAGE_PROXY_PARAM = "__kakao_image_proxy";
export const KAKAO_SW_RESET_KEY = "egose-simulator-kakao-sw-reset-v7";

export function isKakaoInAppBrowser() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";

  // 카카오톡 인앱브라우저뿐 아니라 삼성/웨일/네이버 계열도
  // 이미지 캐시·API 캐시가 크롬과 다르게 남는 경우가 있어 같은 우회 로직을 적용합니다.
  return /KAKAOTALK|SamsungBrowser|Whale|NAVER|; wv\)/i.test(ua);
}


let problemBrowserResetPromise: Promise<void> | null = null;

function readKakaoCacheResetDone() {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(KAKAO_SW_RESET_KEY) === "1";
  } catch {
    return false;
  }
}

function markKakaoCacheResetStarted() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(KAKAO_SW_RESET_KEY, "1");
  } catch {
    // 일부 인앱브라우저에서 sessionStorage 접근이 막히면 캐시 정리만 시도합니다.
  }
}

export function clearProblemBrowserCachesOnce() {
  if (!isKakaoInAppBrowser() || typeof window === "undefined") {
    return Promise.resolve();
  }

  if (problemBrowserResetPromise) return problemBrowserResetPromise;

  // 예전에는 bootstrap/search 때마다 service worker/cache 정리를 다시 시도했습니다.
  // 현재는 middleware 공개 경로 문제가 해결됐으므로, 같은 탭에서는 버전별 1회만 실행해
  // 카카오톡 인앱 첫 진입의 불필요한 작업을 줄입니다.
  if (readKakaoCacheResetDone()) {
    return Promise.resolve();
  }

  markKakaoCacheResetStarted();

  problemBrowserResetPromise = Promise.all([
    "serviceWorker" in navigator
      ? navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(registrations.map((registration) => registration.unregister()))
          )
          .then(() => undefined)
          .catch(() => undefined)
      : Promise.resolve(),
    "caches" in window
      ? caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .then(() => undefined)
          .catch(() => undefined)
      : Promise.resolve(),
  ]).then(() => undefined);

  return problemBrowserResetPromise;
}

export function addApiCacheBuster(path: string, params: URLSearchParams) {
  const nextParams = new URLSearchParams(params);
  nextParams.set("__egose_api_v", `${KAKAO_CACHE_BUST_VALUE}_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  return `${path}?${nextParams.toString()}`;
}

function normalizePublicSimulatorImagePath(src: string | null | undefined) {
  const cleaned = String(src || "")
    .trim()
    .replace(/\\[nr]/g, "")
    .replace(/[\r\n\t]+/g, "");

  if (!cleaned) return "";
  if (/^(data:|blob:|tel:|mailto:|https?:\/\/|\/\/)/i.test(cleaned)) return cleaned;

  const publicRemoved = cleaned.replace(/^\/?public\//i, "");

  if (/^simulator\//i.test(publicRemoved)) {
    return `/${publicRemoved}`;
  }

  if (/^\/simulator\//i.test(publicRemoved)) {
    return publicRemoved;
  }

  return cleaned;
}

export function normalizeImageSrc(src: string | null | undefined) {
  const value = normalizePublicSimulatorImagePath(src);
  if (!value) return "";
  if (/^(data:|blob:|tel:|mailto:)/i.test(value)) return value;

  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://example.com";
    const isAbsolute = /^https?:\/\//i.test(value);
    const url = isAbsolute ? new URL(value) : new URL(value, origin);

    url.pathname = url.pathname
      .split("/")
      .map((part) => (part ? encodeURIComponent(decodeURIComponent(part)) : part))
      .join("/");

    if (!isAbsolute && typeof window !== "undefined" && url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    return url.toString();
  } catch {
    return encodeURI(value.replace(/\s+/g, ""));
  }
}

export function withKakaoCacheBuster(src: string | null | undefined) {
  const normalized = normalizeImageSrc(src);
  if (!normalized) return "";
  if (/^(data:|blob:|tel:|mailto:)/i.test(normalized)) return normalized;
  if (!isKakaoInAppBrowser() || typeof window === "undefined") return normalized;
  if (normalized.includes(`${KAKAO_IMAGE_PROXY_PARAM}=1`)) return normalized;

  try {
    const imageUrl = /^https?:\/\//i.test(normalized)
      ? new URL(normalized)
      : new URL(normalized, window.location.origin);

    // middleware에서 /simulator 정적 이미지와 고객 링크 API가 공개되었으므로
    // 카카오톡 인앱브라우저도 서버 프록시를 거치지 않고 앱 내부 실행처럼 직접 이미지를 읽습니다.
    // 쿼리만 붙여 오래된 깨진 이미지 캐시를 우회합니다.
    imageUrl.searchParams.set(KAKAO_CACHE_BUST_KEY, KAKAO_CACHE_BUST_VALUE);

    if (imageUrl.origin === window.location.origin) {
      return `${imageUrl.pathname}${imageUrl.search}${imageUrl.hash}`;
    }

    return imageUrl.toString();
  } catch {
    if (normalized.includes(`${KAKAO_CACHE_BUST_KEY}=`)) return normalized;
    return `${normalized}${normalized.includes("?") ? "&" : "?"}${KAKAO_CACHE_BUST_KEY}=${KAKAO_CACHE_BUST_VALUE}`;
  }
}

export function normalizeFilmForKakao(film: SimulatorFilm): SimulatorFilm {
  return {
    ...film,
    image_url: withKakaoCacheBuster(film.image_url),
    thumb_url: withKakaoCacheBuster(film.thumb_url),
    sample_url: withKakaoCacheBuster(film.sample_url),
  };
}

export function normalizeSpaceForKakao(space: SimulatorSpace): SimulatorSpace {
  const maskConfig = space.mask_config;
  const zones = Array.isArray(maskConfig?.["zones"])
    ? (maskConfig?.["zones"] as any[]).map((zone) =>
        zone && typeof zone === "object"
          ? { ...zone, mask_url: withKakaoCacheBuster(zone.mask_url) }
          : zone
      )
    : maskConfig?.["zones"];

  return {
    ...space,
    thumbnail_url: withKakaoCacheBuster(space.thumbnail_url),
    base_image_url: withKakaoCacheBuster(space.base_image_url),
    overlay_image_url: withKakaoCacheBuster(space.overlay_image_url),
    mask_config: maskConfig ? { ...maskConfig, zones } : maskConfig,
  };
}

export function makeKakaoFetchInit(init: RequestInit = {}): RequestInit {
  if (!isKakaoInAppBrowser()) {
    return {
      ...init,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init.headers || {}),
      },
    };
  }

  return {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(init.headers || {}),
    },
  };
}


export function buildSimulatorApiUrl(pathname: string, params?: URLSearchParams) {
  if (typeof window === "undefined") {
    const query = params?.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  const url = new URL(pathname, window.location.origin);

  params?.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  if (isKakaoInAppBrowser()) {
    url.searchParams.set(
      "__egose_api_cache_bust",
      `${KAKAO_CACHE_BUST_VALUE}_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
  }

  return url.toString();
}

export async function readJsonResponse(res: Response) {
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error("API 응답을 읽지 못했습니다. 카카오톡 인앱브라우저 캐시를 초기화한 뒤 다시 시도해주세요.");
  }
}

const loadedImageCache = new Set<string>();

export function preloadImage(src: string) {
  const safeSrc = withKakaoCacheBuster(src);

  if (!safeSrc || loadedImageCache.has(safeSrc)) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const img = new Image();

    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.decoding = "async";

    img.onload = () => {
      loadedImageCache.add(safeSrc);
      resolve();
    };

    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = safeSrc;

    if (img.complete && img.naturalWidth > 0) {
      loadedImageCache.add(safeSrc);
      resolve();
    }
  });
}

export function getFilmThumbUrl(film: SimulatorFilm) {
  // 시뮬레이션 2단계 필름 선택창 섬네일은 thumb_url만 사용합니다.
  // image_url fallback을 두면 simulation_thumb_path 적용 여부를 구분하기 어렵습니다.
  return film.thumb_url || "";
}

export function getPhoneHref(phone: string | null | undefined) {
  const cleaned = String(phone || "").replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : "";
}

export function getKakaoHref(kakaoUrl: string | null | undefined) {
  const value = String(kakaoUrl || "").trim();
  return value || "";
}