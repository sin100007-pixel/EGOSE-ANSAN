// app/admin/dashboard/page.tsx
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatKoreanDate(date: Date) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "Asia/Seoul",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function prettyDevice(type: string | null) {
  const t = (type || "").toLowerCase();
  switch (t) {
    case "ios":
      return "iPhone / iPad";
    case "android":
      return "Android";
    case "windows":
      return "Windows PC";
    case "macos":
      return "Mac";
    case "linux":
      return "Linux";
    case "other":
      return "기타";
    default:
      return "알 수 없음";
  }
}

export default async function AdminDashboardPage() {
  const logs = await prisma.pageView.findMany({
    orderBy: { viewedAt: "desc" },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-5xl p-4 text-white">
      <h2 className="mb-1 text-2xl font-bold">
        페이지 방문 로그 (admin/dashboard)
      </h2>
      <p className="mb-4 text-[13px] opacity-80">
        최근 방문 순으로 최대 200건까지 표시합니다. 새로고침(F5) 하면 최신
        정보로 갱신됩니다.
      </p>

      <div className="overflow-x-auto rounded-lg border border-white/15">
        <table className="min-w-full border-collapse text-[13px]">
          <thead className="bg-white/10">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 text-left">
                방문 시각
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left">이름</th>
              <th className="whitespace-nowrap px-3 py-2 text-left">경로</th>
              <th className="whitespace-nowrap px-3 py-2 text-left">기기</th>
              <th className="whitespace-nowrap px-3 py-2 text-left">IP</th>
              <th className="whitespace-nowrap px-3 py-2 text-left">
                User-Agent (일부분)
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-2 py-5 text-center text-sm opacity-80"
                >
                  아직 방문 기록이 없습니다.
                </td>
              </tr>
            )}

            {logs.map((log, idx) => {
              const ua = log.userAgent || "";
              const shortUA = ua.length > 80 ? ua.slice(0, 80) + "…" : ua;

              return (
                <tr
                  key={log.id}
                  className={
                    idx % 2 === 1
                      ? "bg-white/5 border-t border-white/5"
                      : "border-t border-white/5"
                  }
                >
                  <td className="whitespace-nowrap px-3 py-2 align-top">
                    {formatKoreanDate(log.viewedAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-top">
                    {log.userName || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-top">
                    {log.path}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-top">
                    {prettyDevice(log.deviceType)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-top">
                    {log.ip || "-"}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="break-all font-mono text-[11px] opacity-90">
                      {shortUA || "-"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] opacity-65">
        * 이름은 로그인 시 생성된 session_user 쿠키 기준입니다.  
        * 기기 정보는 브라우저에서 전송하는 User-Agent 를 기반으로 대략 분류한
        값입니다.
      </p>
    </div>
  );
}
