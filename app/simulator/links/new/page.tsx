import { redirect } from "next/navigation";
import SimulatorLinkBuilder from "../../components/SimulatorLinkBuilder";
import { requireSimulatorInstaller } from "../../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewSimulatorLinkPage() {
  const auth = await requireSimulatorInstaller();

  if (!auth.ok) {
    redirect(auth.status === 401 ? "/" : "/dashboard");
  }

  return <SimulatorLinkBuilder />;
}
