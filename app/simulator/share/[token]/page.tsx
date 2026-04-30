import SimulatorClient from "../../components/SimulatorClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SimulatorSharePageProps = {
  params: {
    token: string;
  };
};

export default function SimulatorSharePage({ params }: SimulatorSharePageProps) {
  return <SimulatorClient mode="customer" token={params.token} />;
}
