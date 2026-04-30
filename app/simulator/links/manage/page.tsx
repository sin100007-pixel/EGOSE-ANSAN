import { redirect } from "next/navigation";
import SimulatorLinkManager from "../../components/SimulatorLinkManager";
import { getSimulatorSessionName, isSimulatorAllowedUser } from "../../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ManageSimulatorLinksPage() {
  const name = getSimulatorSessionName();

  if (!name) {
    redirect("/");
  }

  const allowed = await isSimulatorAllowedUser(name);

  if (!allowed) {
    redirect("/dashboard");
  }

  return <SimulatorLinkManager />;
}
