


export type CaseStudyMeta = {
  slug: string;            // folder name, used in URL
  title: string;
  company: string;
  location?: string;
  industry?: string;
  excerpt: string;         // short preview text
  coverImage?: string;     // public path e.g. "/case-studies/depom/cover.jpg"
  tags?: string[];
  date?: string;           // "2026-02-09"
};

export const caseStudies: CaseStudyMeta[] = [
  {
    slug: "Deprom",
    title: "Deprom: Faster site reporting via WhatsApp voice",
    company: "Client",
    location: "Deprom LV",
    industry: "Construction / Precast",
    excerpt:
      "Site updates sent as WhatsApp voice + photos are automatically structured into daily records, saving admin time and improving traceability.",
    coverImage: "/pictures/deprom.jpeg", // ✅ this matches /public/pictures/deprom.jpeg
    tags: ["Site diary", "WhatsApp", "Reporting"],
    date: "2026-02-09",
  },
    {
    slug: "U-fix" ,
    title: "Automating site authority reporting ",
    company: "Client",
    location: "U-fix",
    industry: "Construction / In-situ",
    excerpt:
      "Site updates sent as WhatsApp voice + photos are automatically structured into daily records, saving admin time and improving traceability.",
    coverImage: "/pictures/ufix.jpg", // ✅ this matches /public/pictures/deprom.jpeg
    tags: ["Site diary", "WhatsApp", "Reporting"],
    date: "2026-02-09",
  },
  {
    slug: "Article_1" ,
    title: "How WorksRecorded delivers results",
    company: "Knowledge",
    location: "Article",
    industry: "Construction / In-situ",
    excerpt:
      "Site updates sent as WhatsApp voice + photos are automatically structured into daily records, saving admin time and improving traceability.",
    coverImage: "/pictures/article_1.jpg", // ✅ this matches /public/pictures/deprom.jpeg
    tags: ["Site diary", "Article", "ConTech"],
    date: "2026-02-09",
  },
    {
  slug: "Article_2_AI_construction",
  title: "AI in Construction: Last Week’s Highlights",
  company: "Knowledge",
  location: "Construction AI News",
  industry: "Construction / AI / ConTech",
  excerpt:
    "A weekly roundup of the biggest AI developments in construction, from autonomous equipment at CONEXPO to predictive safety platforms and major investment in physical-world AI.",
  coverImage: "/pictures/Article_2.jpg",
  tags: ["AI", "Construction", "Article", "ConTech"],
  date: "2026-03-09",
},
];
