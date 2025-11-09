/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    // ⬇ 앱 서버에서 사용할 외부 패키지 지정 (formidable/xlsx 사용 시 권장)
    serverComponentsExternalPackages: ["formidable", "xlsx"],
  },
};