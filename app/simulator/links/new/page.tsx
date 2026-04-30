import { redirect } from "next/navigation";
import SimulatorLinkBuilder from "../../components/SimulatorLinkBuilder";
import { getSimulatorSessionName, isSimulatorAllowedUser } from "../../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewSimulatorLinkPage() {
  const name = getSimulatorSessionName();

  if (!name) {
    redirect("/");
  }

  const allowed = await isSimulatorAllowedUser(name);

  if (!allowed) {
    redirect("/dashboard");
  }

  return <SimulatorLinkBuilder />;
}
