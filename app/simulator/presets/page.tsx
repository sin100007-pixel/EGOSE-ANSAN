import { redirect } from "next/navigation";
import SimulatorPresetManager from "../components/SimulatorPresetManager";
import { getSimulatorSessionName, isSimulatorAllowedUser } from "../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SimulatorPresetsPage() {
  const name = getSimulatorSessionName();

  if (!name) {
    redirect("/");
  }

  const allowed = await isSimulatorAllowedUser(name);

  if (!allowed) {
    redirect("/dashboard");
  }

  return <SimulatorPresetManager />;
}
