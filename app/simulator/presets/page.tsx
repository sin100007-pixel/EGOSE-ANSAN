import { redirect } from "next/navigation";
import SimulatorPresetManager from "../components/SimulatorPresetManager";
import { requireSimulatorInstaller } from "../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SimulatorPresetsPage() {
  const auth = await requireSimulatorInstaller();

  if (!auth.ok) {
    redirect(auth.status === 401 ? "/" : "/dashboard");
  }

  return <SimulatorPresetManager />;
}
