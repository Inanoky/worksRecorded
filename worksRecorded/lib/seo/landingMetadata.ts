import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.worksrecorded.com";
const DEFAULT_IMAGE = "/hero.png";

type SupportedLocale = "en" | "lv";

type SeoContent = {
  title: string;
  description: string;
  keywords: string[];
};

const localeConfig: Record<SupportedLocale, { ogLocale: string; language: string }> = {
  en: { ogLocale: "en_US", language: "en-US" },
  lv: { ogLocale: "lv_LV", language: "lv-LV" },
};

const latvianLandingSeo: Record<string, SeoContent> = {
  "/Landing": {
    title: "Būvdarbu žurnāls WhatsApp un BIS integrācija | WorksRecorded",
    description:
      "WorksRecorded palīdz Latvijas būvniecības uzņēmumiem veidot būvdarbu žurnālu, darba laika uzskaiti un BIS ierakstus no WhatsApp ziņām ar MI automatizāciju.",
    keywords: [
      "būvdarbu žurnāls",
      "būvniecības programmatūra Latvijā",
      "BIS integrācija",
      "darba laika uzskaite būvniecībā",
      "WhatsApp būvdienasgrāmata",
      "MI būvniecībā",
      "WorksRecorded",
    ],
  },
  "/Landing/SiteDiary": {
    title: "Būvdarbu žurnāls no WhatsApp ziņām | WorksRecorded",
    description:
      "Automātiski sagatavojiet ikdienas būvdarbu žurnāla ierakstus no WhatsApp balss ziņām, fotoattēliem un e-pastiem Latvijas būvobjektiem.",
    keywords: [
      "būvdarbu žurnāls",
      "būvdienasgrāmata",
      "būvobjekta atskaites",
      "WhatsApp būvniecībā",
      "būvniecības dokumentācija",
    ],
  },
  "/Landing/Timesheets": {
    title: "Darba laika uzskaite būvniecībā ar WhatsApp | WorksRecorded",
    description:
      "Digitalizējiet brigāžu darba laika uzskaiti, clock-in un rēķinu sagatavošanu būvniecības projektiem ar WhatsApp un lokācijas kontroli.",
    keywords: [
      "darba laika uzskaite būvniecībā",
      "brigāžu darba stundas",
      "clock-in būvobjektā",
      "darbinieku uzskaite",
      "geofence darba laiks",
    ],
  },
  "/Landing/BIS-integracija": {
    title: "BIS integrācija un automātiska būvdarbu ierakstu aizpilde | WorksRecorded",
    description:
      "Samaziniet manuālu BIS aizpildīšanu — WorksRecorded pārvērš būvobjekta WhatsApp ziņas un pavadzīmju foto strukturētos BIS ierakstos.",
    keywords: [
      "BIS integrācija",
      "BIS automatizācija",
      "būvniecības informācijas sistēma",
      "būvdarbu žurnāls BIS",
      "pavadzīmju apstrāde",
    ],
  },
  "/Landing/Analytics": {
    title: "Būvniecības analītika un projektu KPI | WorksRecorded",
    description:
      "Iegūstiet analītiku no būvdarbu žurnāla, darba stundām un projekta datiem, lai kontrolētu izmaksas, progresu un produktivitāti.",
    keywords: [
      "būvniecības analītika",
      "projektu KPI",
      "darba stundu analīze",
      "būvniecības izmaksu kontrole",
      "MI analītika",
    ],
  },
  "/Landing/Custom": {
    title: "Pielāgoti digitālie risinājumi būvniecībai Latvijā | WorksRecorded",
    description:
      "Izstrādājam praktiskus MI un automatizācijas risinājumus būvniecības uzņēmumiem — atskaitēm, dokumentiem, procesiem un datu analītikai.",
    keywords: [
      "digitālie risinājumi būvniecībai",
      "būvniecības automatizācija",
      "MI risinājumi uzņēmumiem",
      "pielāgota programmatūra",
      "būvniecības digitalizācija",
    ],
  },
  "/Landing/CaseStudies": {
    title: "Būvniecības digitalizācijas piemēri Latvijā | WorksRecorded",
    description:
      "Apskatiet, kā WorksRecorded palīdz būvniecības komandām sakārtot objektu pierakstus, darba stundas, foto un atskaites vienā sistēmā.",
    keywords: [
      "būvniecības digitalizācija",
      "būvniecības piemēri",
      "būvobjekta atskaites",
      "WorksRecorded pieredze",
    ],
  },
  "/Landing/Pricing": {
    title: "WorksRecorded cena būvniecības komandām Latvijā",
    description:
      "Pārskatāma cena būvdarbu žurnālam, darba laika uzskaitei un BIS automatizācijai. Izmēģiniet WorksRecorded bez bankas kartes.",
    keywords: [
      "būvniecības programmatūras cena",
      "būvdarbu žurnāla cena",
      "darba laika uzskaites cena",
      "WorksRecorded cena",
    ],
  },
  "/Landing/About": {
    title: "Par WorksRecorded — būvniecības dokumentācijas automatizācija",
    description:
      "WorksRecorded ir Latvijā veidots rīks būvniecības komandām, kas pārvērš ikdienas saziņu strukturētos datos, atskaitēs un lēmumu pieņemšanā.",
    keywords: [
      "WorksRecorded Latvija",
      "būvniecības dokumentācija",
      "būvniecības programmatūra",
      "būvniecības MI rīki",
    ],
  },
  "/Landing/News": {
    title: "Būvniecības MI, BIS un digitalizācijas jaunumi | WorksRecorded",
    description:
      "Lasiet par būvniecības digitalizāciju, BIS automatizāciju, MI rīkiem, būvdarbu žurnāliem un darba laika uzskaiti Latvijas būvniecības uzņēmumiem.",
    keywords: [
      "būvniecības jaunumi",
      "MI būvniecībā",
      "BIS jaunumi",
      "būvniecības digitalizācija",
    ],
  },

  "/Landing/ContactForm": {
    title: "Sazinieties par būvdarbu žurnālu, BIS un darba laika uzskaiti",
    description:
      "Piesakiet sarunu ar WorksRecorded par būvdarbu žurnāla, darba laika uzskaites, BIS integrācijas vai pielāgotas būvniecības automatizācijas ieviešanu.",
    keywords: [
      "sazināties WorksRecorded",
      "būvniecības programmatūras demo",
      "BIS integrācijas konsultācija",
      "būvdarbu žurnāla ieviešana",
    ],
  },
  "/Landing/Privacy": {
    title: "Privātuma politika | WorksRecorded",
    description:
      "WorksRecorded privātuma politika būvniecības komandu datiem, saziņai, failiem un pakalpojuma lietošanai.",
    keywords: ["WorksRecorded privātums", "datu aizsardzība", "privātuma politika"],
  },
};

function normalizeLocale(locale: string): SupportedLocale {
  return locale === "lv" ? "lv" : "en";
}

function stripTrailingSlash(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedPath.length > 1 ? normalizedPath.replace(/\/$/, "") : normalizedPath;
}

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
  const normalizedLocale = normalizeLocale(locale);
  const normalizedPath = stripTrailingSlash(path);
  const url = `${SITE_URL}/${normalizedLocale}${normalizedPath}`;
  const localizedContent =
    normalizedLocale === "lv" ? latvianLandingSeo[normalizedPath] : undefined;
  const seoTitle = localizedContent?.title ?? title;
  const seoDescription = localizedContent?.description ?? description;
  const seoKeywords = localizedContent?.keywords ?? keywords;

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: "WorksRecorded",
    title: seoTitle,
    description: seoDescription,
    keywords: seoKeywords,
    category: "construction software",
    creator: "WorksRecorded",
    publisher: "Buvconsult SIA",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    alternates: {
      canonical: url,
      languages: {
        "en-US": `${SITE_URL}/en${normalizedPath}`,
        "lv-LV": `${SITE_URL}/lv${normalizedPath}`,
        "x-default": `${SITE_URL}/lv${normalizedPath}`,
      },
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url,
      siteName: "WorksRecorded",
      locale: localeConfig[normalizedLocale].ogLocale,
      alternateLocale: normalizedLocale === "lv" ? ["en_US"] : ["lv_LV"],
      type: "website",
      images: [
        {
          url: DEFAULT_IMAGE,
          width: 1200,
          height: 630,
          alt:
            normalizedLocale === "lv"
              ? "WorksRecorded būvdarbu žurnāls un BIS integrācija"
              : "WorksRecorded construction site diary and reporting platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
      images: [DEFAULT_IMAGE],
    },
    other: {
      "content-language": localeConfig[normalizedLocale].language,
      "geo.region": "LV",
      "geo.placename": "Latvia",
    },
  };
}

export function buildLandingJsonLd(locale: string) {
  const normalizedLocale = normalizeLocale(locale);
  const isLatvian = normalizedLocale === "lv";
  const homeUrl = `${SITE_URL}/${normalizedLocale}/Landing`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "WorksRecorded",
        legalName: "Buvconsult SIA",
        url: SITE_URL,
        logo: `${SITE_URL}/default.png`,
        areaServed: [{ "@type": "Country", name: isLatvian ? "Latvija" : "Latvia" }],
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "sales",
            email: "vjaceslavs@worksrecorded.com",
            availableLanguage: ["Latvian", "English"],
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "WorksRecorded",
        inLanguage: localeConfig[normalizedLocale].language,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${homeUrl}#software`,
        name: "WorksRecorded",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: homeUrl,
        inLanguage: localeConfig[normalizedLocale].language,
        description: isLatvian
          ? "Būvdarbu žurnāls, darba laika uzskaite un BIS automatizācija Latvijas būvniecības komandām."
          : "Site diary, timesheets, and reporting automation for construction teams.",
        offers: {
          "@type": "Offer",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        },
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: { "@type": "Country", name: isLatvian ? "Latvija" : "Latvia" },
      },
    ],
  };
}
