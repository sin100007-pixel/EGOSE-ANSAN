import { redirect } from "next/navigation";
import SimulatorContractorSettings from "../components/SimulatorContractorSettings";
import { requireSimulatorInstaller } from "../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SimulatorSettingsPage() {
  const auth = await requireSimulatorInstaller();

  if (!auth.ok) {
    redirect(auth.status === 401 ? "/" : "/dashboard");
  }

  return <SimulatorContractorSettings />;
}
