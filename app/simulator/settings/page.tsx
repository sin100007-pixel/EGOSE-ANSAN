import { redirect } from "next/navigation";
import SimulatorContractorSettings from "../components/SimulatorContractorSettings";
import { getSimulatorSessionName, isSimulatorAllowedUser } from "../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SimulatorSettingsPage() {
  const name = getSimulatorSessionName();

  if (!name) {
    redirect("/");
  }

  const allowed = await isSimulatorAllowedUser(name);

  if (!allowed) {
    redirect("/dashboard");
  }

  return <SimulatorContractorSettings />;
}
