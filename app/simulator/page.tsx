import { redirect } from "next/navigation";
import SimulatorClient from "./components/SimulatorClient";
import { requireSimulatorInstaller } from "./auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SimulatorPageProps = {
  searchParams?: {
    token?: string;
  };
};

export default async function SimulatorPage({ searchParams }: SimulatorPageProps) {
  const token = (searchParams?.token || "").trim();

  // 고객 링크로 들어온 경우는 로그인/시공자 권한 없이 허용
  if (token) {
    return <SimulatorClient mode="customer" token={token} />;
  }

  const auth = await requireSimulatorInstaller();

  if (!auth.ok) {
    redirect(auth.status === 401 ? "/" : "/dashboard");
  }

  return <SimulatorClient mode="installer" />;
}
