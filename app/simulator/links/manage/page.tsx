import { redirect } from "next/navigation";
import SimulatorLinkManager from "../../components/SimulatorLinkManager";
import { requireSimulatorInstaller } from "../../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ManageSimulatorLinksPage() {
  const auth = await requireSimulatorInstaller();

  if (!auth.ok) {
    redirect(auth.status === 401 ? "/" : "/dashboard");
  }

  return <SimulatorLinkManager />;
}
