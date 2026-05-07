import type { Metadata } from "next";
import SimulatorClient from "../../components/SimulatorClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SimulatorSharePageProps = {
  params: {
    token: string;
  };
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://customer-qr-login.vercel.app";

const OG_TITLE = "시뮬봇";

const OG_DESCRIPTION =
  "대표적인 공간 이미지에 500여가지 필름을 적용해, 조합에 따른 뉘앙스를 보여드립니다.\n*Chrome(크롬브라우저)에 최적화되어 있습니다.";

const OG_IMAGE_PATH = "/og/simubot-card.png";

export async function generateMetadata({
  params,
}: SimulatorSharePageProps): Promise<Metadata> {
  const shareUrl = `${SITE_URL}/simulator/share/${encodeURIComponent(params.token)}`;
  const ogImageUrl = `${SITE_URL}${OG_IMAGE_PATH}`;

  return {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    openGraph: {
      title: OG_TITLE,
      description: OG_DESCRIPTION,
      url: shareUrl,
      siteName: "시뮬봇",
      type: "website",
      locale: "ko_KR",
      images: [
        {
          url: ogImageUrl,
          width: 1536,
          height: 1024,
          alt: "시뮬봇",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: OG_TITLE,
      description: OG_DESCRIPTION,
      images: [ogImageUrl],
    },
  };
}

export default function SimulatorSharePage({ params }: SimulatorSharePageProps) {
  return <SimulatorClient mode="customer" token={params.token} />;
}
