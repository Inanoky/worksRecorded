import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.worksrecorded.com";
const DEFAULT_IMAGE = "/frontend/pages/Home/HeroLaptopDashboardDiagram.png";

type SupportedLocale = "en" | "lv" | "ru";

type SeoContent = {
  title: string;
  description: string;
  keywords: string[];
};

const localeConfig: Record<SupportedLocale, { ogLocale: string; language: string }> = {
  en: { ogLocale: "en_US", language: "en-US" },
  lv: { ogLocale: "lv_LV", language: "lv-LV" },
  ru: { ogLocale: "ru_RU", language: "ru-RU" },
};

const latvianLandingSeo: Record<string, SeoContent> = {
  "/Landing": {
    title: "Mākslīgā intelekta aģenti būvniekiem | WorksRecorded",
    description:
      "MI aģenti darbu uzskaitei, finanšu analītikai, WhatsApp automatizācijai, tāmēšanai un materiālu kontrolei. 150 EUR par aģentu mēnesī.",
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
    title: "Darbu uzskaites MI aģents | WorksRecorded",
    description:
      "Darbu uzskaites aģents analizē WhatsApp sarunas, rasējumus, balss ziņas, attēlus un video. Pārskatāmi projekta dati platformā un Excel. 150 EUR mēnesī.",
    keywords: [
      "būvdarbu žurnāls",
      "būvdienasgrāmata",
      "būvobjekta atskaites",
      "WhatsApp būvniecībā",
      "būvniecības dokumentācija",
    ],
  },
  "/Landing/Timesheets": {
    title: "Darba laika uzskaites MI aģents | WorksRecorded",
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
    title: "BIS dokumentācijas pārvaldības pakalpojums | WorksRecorded",
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
    title: "Finanšu analītikas MI aģents būvniecībai | WorksRecorded",
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
    title: "Pielāgoti MI aģenti būvniecībai | WorksRecorded",
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
      "Līmenī, FIMA, TGEM un Stone & Tree pieredze ar WorksRecorded. Uzņēmumu vajadzībām pielāgoti digitāli risinājumi un MI atbalsts ikdienas darbam.",
    keywords: [
      "būvniecības digitalizācija",
      "būvniecības piemēri",
      "būvobjekta atskaites",
      "WorksRecorded pieredze",
    ],
  },
  "/Landing/Pricing": {
    title: "MI aģenti par 150 EUR mēnesī | WorksRecorded cenas",
    description:
      "Izvēlieties MI aģentus būvniecības uzdevumiem. 150 EUR mēnesī par katru aģentu. BIS dokumentācija un grāmatvedība pieejami kā pakalpojumi.",
    keywords: [
      "būvniecības programmatūras cena",
      "būvdarbu žurnāla cena",
      "darba laika uzskaites cena",
      "WorksRecorded cena",
    ],
  },
  "/Landing/About": {
    title: "Par WorksRecorded — MI aģenti būvniekiem",
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

const russianLandingSeo: Record<string, SeoContent> = {
  "/Landing": {
    title: "ИИ-агенты для строителей | WorksRecorded",
    description:
      "ИИ-агенты для учёта работ, финансовой аналитики, автоматизации WhatsApp, составления смет и контроля материалов. 150 EUR за агента в месяц.",
    keywords: [
      "журнал строительных работ",
      "программное обеспечение для строительства",
      "интеграция BIS",
      "учёт рабочего времени в строительстве",
      "ИИ в строительстве",
      "WorksRecorded",
    ],
  },
  "/Landing/SiteDiary": {
    title: "ИИ-агент учёта строительных работ | WorksRecorded",
    description:
      "Автоматически создавайте точные ежедневные записи о строительных работах из голосовых сообщений и фотографий WhatsApp.",
    keywords: [
      "журнал строительных работ",
      "отчёты со стройплощадки",
      "WhatsApp в строительстве",
      "строительная документация",
    ],
  },
  "/Landing/Timesheets": {
    title: "ИИ-агент учёта рабочего времени | WorksRecorded",
    description:
      "Автоматизируйте учёт рабочего времени бригад через WhatsApp с контролем местоположения на строительной площадке.",
    keywords: [
      "учёт рабочего времени в строительстве",
      "рабочие часы бригады",
      "геозона стройплощадки",
      "учёт работников",
    ],
  },
  "/Landing/Analytics": {
    title: "ИИ-агент финансовой аналитики | WorksRecorded",
    description:
      "Контролируйте затраты, ход работ и производительность с помощью аналитики строительных данных на базе ИИ.",
    keywords: [
      "строительная аналитика",
      "KPI проекта",
      "анализ рабочего времени",
      "контроль затрат в строительстве",
    ],
  },
  "/Landing/Manufacturing": {
    title: "Производственный журнал и учёт операций",
    description:
      "Учитывайте производственные операции, плановые и фактические нормы труда, фотографии, оплату и производительность в WorksRecorded.",
    keywords: [
      "производственный журнал",
      "учёт производства",
      "производительность",
      "учёт работ через WhatsApp",
    ],
  },
  "/Landing/Custom": {
    title: "Индивидуальные ИИ-агенты для строительства",
    description:
      "Создаём практичные решения на базе ИИ для автоматизации строительных отчётов, документов, процессов и аналитики.",
    keywords: [
      "автоматизация строительства",
      "ИИ для строительных компаний",
      "индивидуальное программное обеспечение",
      "цифровизация строительства",
    ],
  },
  "/Landing/CaseStudies": {
    title: "Примеры цифровизации строительных процессов",
    description:
      "Опыт Līmenī, FIMA, TGEM и Stone & Tree с WorksRecorded. Цифровые решения под задачи компаний и поддержка ИИ в повседневной работе.",
    keywords: [
      "цифровизация строительства",
      "примеры строительных проектов",
      "отчёты со стройплощадки",
      "WorksRecorded",
    ],
  },
  "/Landing/Pricing": {
    title: "ИИ-агенты за 150 EUR в месяц | WorksRecorded",
    description:
      "150 EUR в месяц за каждого выбранного ИИ-агента. Ведение документации BIS и бухгалтерия доступны как услуги.",
    keywords: [
      "цена строительного программного обеспечения",
      "цена журнала строительных работ",
      "цена учёта рабочего времени",
      "WorksRecorded цена",
    ],
  },
  "/Landing/About": {
    title: "О WorksRecorded — ИИ-агенты для строителей",
    description:
      "WorksRecorded превращает ежедневные сообщения строительных команд в структурированные данные, отчёты и полезную аналитику.",
    keywords: [
      "WorksRecorded",
      "строительная документация",
      "программное обеспечение для строительства",
      "ИИ для строительства",
    ],
  },
  "/Landing/News": {
    title: "Новости ИИ и цифровизации строительства",
    description:
      "Новости об инструментах ИИ, автоматизации и цифровых технологиях в строительстве.",
    keywords: [
      "новости строительства",
      "ИИ в строительстве",
      "цифровизация строительства",
      "строительные технологии",
    ],
  },
  "/Landing/ContactForm": {
    title: "Связаться с WorksRecorded",
    description:
      "Обсудите с WorksRecorded журнал строительных работ, учёт рабочего времени, производство или индивидуальную автоматизацию.",
    keywords: [
      "связаться с WorksRecorded",
      "демонстрация строительного ПО",
      "консультация по автоматизации строительства",
    ],
  },
  "/Landing/Privacy": {
    title: "Политика конфиденциальности",
    description:
      "Политика WorksRecorded в отношении данных, сообщений, файлов и использования сервиса.",
    keywords: ["WorksRecorded конфиденциальность", "защита данных", "политика конфиденциальности"],
  },
};

function normalizeLocale(locale: string): SupportedLocale {
  if (locale === "lv" || locale === "ru") return locale;
  return "en";
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
    normalizedLocale === "lv"
      ? latvianLandingSeo[normalizedPath]
      : normalizedLocale === "ru"
        ? russianLandingSeo[normalizedPath]
        : undefined;
  const seoTitle = localizedContent?.title ?? title;
  const seoDescription = localizedContent?.description ?? description;
  const seoKeywords = localizedContent?.keywords ?? keywords;

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: "WorksRecorded",
    title: { absolute: seoTitle },
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
        "ru-RU": `${SITE_URL}/ru${normalizedPath}`,
        "x-default": `${SITE_URL}/lv${normalizedPath}`,
      },
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url,
      siteName: "WorksRecorded",
      locale: localeConfig[normalizedLocale].ogLocale,
      alternateLocale: Object.values(localeConfig)
        .map(({ ogLocale }) => ogLocale)
        .filter((ogLocale) => ogLocale !== localeConfig[normalizedLocale].ogLocale),
      type: "website",
      images: [
        {
          url: DEFAULT_IMAGE,
          width: 1536,
          height: 1024,
          alt:
            normalizedLocale === "lv"
              ? "WorksRecorded būvniecības datu analītikas panelis"
              : normalizedLocale === "ru"
                ? "WorksRecorded: панель аналитики строительных данных"
                : "WorksRecorded construction data analytics dashboard",
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
  const isRussian = normalizedLocale === "ru";
  const homeUrl = `${SITE_URL}/${normalizedLocale}/Landing`;
  const countryName = isLatvian ? "Latvija" : isRussian ? "Латвия" : "Latvia";

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "WorksRecorded",
        legalName: "Buvconsult SIA",
        url: SITE_URL,
        sameAs: ["https://www.linkedin.com/company/worksrecorded/"],
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/favicon/favicon-512x512.png`,
          contentUrl: `${SITE_URL}/favicon/favicon-512x512.png`,
          width: 512,
          height: 512,
        },
        description:
          "WorksRecorded provides AI agents for construction work records, financial analytics, cost control, estimating, materials, and tool tracking, with BIS and bookkeeping services.",
        telephone: "+37124885690",
        email: "vjaceslavs@worksrecorded.com",
        vatID: "LV40203643527",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Brivibas iela 91-22",
          addressLocality: "Riga",
          postalCode: "LV-1001",
          addressCountry: "LV",
        },
        areaServed: [{ "@type": "Country", name: countryName }],
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "sales",
            email: "vjaceslavs@worksrecorded.com",
            availableLanguage: ["Latvian", "English", "Russian"],
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
          ? "Mākslīgā intelekta aģenti būvniekiem. Darbu uzskaite, finanšu analītika, izmaksu kontrole un tāmēšana par 150 EUR mēnesī par aģentu."
          : isRussian
            ? "ИИ-агенты для строителей. Учёт работ, финансовая аналитика, контроль затрат и составление смет за 150 EUR в месяц за агента."
            : "AI agents for construction work records, financial analytics, cost control and estimating. EUR 150 per agent per month.",
        offers: {
          "@type": "Offer",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        },
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: { "@type": "Country", name: countryName },
      },
    ],
  };
}
