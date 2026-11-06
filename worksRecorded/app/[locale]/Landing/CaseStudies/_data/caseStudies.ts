export type CaseStudyMeta = {
  slug: string;
  title: string;
  company: string;
  location?: string;
  industry?: string;
  excerpt: string;
  coverImage?: string;
  tags?: string[];
  date?: string;
};

type CaseStudyLocale = "en" | "lv";

type LocalizedCaseStudy = Omit<
  CaseStudyMeta,
  "title" | "company" | "location" | "industry" | "excerpt" | "tags"
> & {
  translations: Record<
    CaseStudyLocale,
    Pick<CaseStudyMeta, "title" | "company" | "location" | "industry" | "excerpt" | "tags">
  >;
};

const localizedCaseStudies: LocalizedCaseStudy[] = [
  {
    slug: "Deprom",
    coverImage: "/pictures/deprom.jpeg",
    date: "2026-02-09",
    translations: {
      en: {
        title: "Deprom: Faster site reporting via WhatsApp voice",
        company: "Client",
        location: "Deprom LV",
        industry: "Construction / Precast",
        excerpt:
          "Site updates sent as WhatsApp voice + photos are automatically structured into daily records, saving admin time and improving traceability.",
        tags: ["Site diary", "WhatsApp", "Reporting"],
      },
      lv: {
        title: "Deprom: Ātrāka objektu atskaitīšanās ar WhatsApp balss ziņām",
        company: "Klients",
        location: "Deprom LV",
        industry: "Būvniecība / Dzelzsbetona konstrukcijas",
        excerpt:
          "Objekta ziņas, kas nosūtītas kā WhatsApp balss ziņas un foto, automātiski kļūst par strukturētiem ikdienas ierakstiem.",
        tags: ["Būvdarbu žurnāls", "WhatsApp", "Atskaites"],
      },
    },
  },
  {
    slug: "U-fix",
    coverImage: "/pictures/ufix.jpg",
    date: "2026-02-09",
    translations: {
      en: {
        title: "Automating site authority reporting",
        company: "Client",
        location: "U-fix",
        industry: "Construction / In-situ",
        excerpt:
          "Site updates sent as WhatsApp voice + photos are automatically structured into daily records, saving admin time and improving traceability.",
        tags: ["Site diary", "WhatsApp", "Reporting"],
      },
      lv: {
        title: "Būvniecības iestāžu atskaišu automatizācija",
        company: "Klients",
        location: "U-fix",
        industry: "Būvniecība / Monolītie darbi",
        excerpt:
          "WhatsApp balss ziņas un foto tiek strukturēti ikdienas ierakstos un izmantoti BIS atskaitēm.",
        tags: ["Būvdarbu žurnāls", "WhatsApp", "BIS"],
      },
    },
  },
  {
    slug: "LEC",
    coverImage: "/pictures/lec_article_picture.jpeg",
    date: "2026-06-02",
    translations: {
      en: {
        title: "LEC: Keeping remote projects visible to head office",
        company: "Latvijas Energoceltnieks",
        location: "Remote job sites",
        industry: "Construction / Infrastructure",
        excerpt:
          "Daily reports from site managers help project managers understand progress, improve control, and react faster to events on remote 3-4 month projects.",
        tags: ["Site diary", "Remote sites", "Reporting"],
      },
      lv: {
        title: "LEC: Attālinātu projektu pārskatāmība galvenajam birojam",
        company: "Latvijas Energoceltnieks",
        location: "Attālināti objekti",
        industry: "Būvniecība / Infrastruktūra",
        excerpt:
          "Ikdienas atskaites no objekta vadītājiem palīdz projektu vadītājiem redzēt progresu, uzlabot kontroli un ātrāk reaģēt uz notikumiem objektā.",
        tags: ["Būvdarbu žurnāls", "Attālināti objekti", "Atskaites"],
      },
    },
  },
  {
    slug: "Article_1",
    coverImage: "/pictures/article_1.jpg",
    date: "2026-02-09",
    translations: {
      en: {
        title: "How WorksRecorded delivers results",
        company: "Knowledge",
        location: "Article",
        industry: "Construction / In-situ",
        excerpt:
          "Site updates sent as WhatsApp voice + photos are automatically structured into daily records, saving admin time and improving traceability.",
        tags: ["Site diary", "Article", "ConTech"],
      },
      lv: {
        title: "Kā WorksRecorded palīdz sasniegt rezultātus",
        company: "Zināšanas",
        location: "Raksts",
        industry: "Būvniecība / Monolītie darbi",
        excerpt:
          "Kāpēc daudzas būvniecības programmatūras nedod gaidīto vērtību un kā praktiski digitāli risinājumi var strādāt objektā.",
        tags: ["Būvdarbu žurnāls", "Raksts", "ConTech"],
      },
    },
  },
  {
    slug: "Article_2_AI_construction",
    coverImage: "/pictures/Article_2.jpg",
    date: "2026-03-09",
    translations: {
      en: {
        title: "AI in Construction: Last Week's Highlights",
        company: "Knowledge",
        location: "Construction AI News",
        industry: "Construction / AI / ConTech",
        excerpt:
          "A weekly roundup of the biggest AI developments in construction, from autonomous equipment at CONEXPO to predictive safety platforms and major investment in physical-world AI.",
        tags: ["AI", "Construction", "Article", "ConTech"],
      },
      lv: {
        title: "MI būvniecībā: pagājušās nedēļas svarīgākais",
        company: "Zināšanas",
        location: "Būvniecības MI ziņas",
        industry: "Būvniecība / MI / ConTech",
        excerpt:
          "Nedēļas apskats par svarīgākajām MI attīstībām būvniecībā: autonoma tehnika, prognozējoša drošība un ieguldījumi fiziskās pasaules MI.",
        tags: ["MI", "Būvniecība", "Raksts", "ConTech"],
      },
    },
  },
];

function normalizeLocale(locale: string): CaseStudyLocale {
  return locale === "lv" ? "lv" : "en";
}

export function getCaseStudies(locale: string): CaseStudyMeta[] {
  const normalizedLocale = normalizeLocale(locale);

  return localizedCaseStudies.map(({ translations, ...caseStudy }) => ({
    ...caseStudy,
    ...translations[normalizedLocale],
  }));
}

export const caseStudies: CaseStudyMeta[] = getCaseStudies("en");
