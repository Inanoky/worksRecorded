import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.worksrecorded.com";

export function buildLandingMetadata({
  locale,
  path,
  title,
  description,
  keywords,
}: {
  locale: string;
  path: string;
  title: string;
  description: string;
  keywords: string[];
}): Metadata {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${SITE_URL}/${locale}${normalizedPath}`;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
      languages: {
        en: `${SITE_URL}/en${normalizedPath}`,
        lv: `${SITE_URL}/lv${normalizedPath}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "WorksRecorded",
      locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
