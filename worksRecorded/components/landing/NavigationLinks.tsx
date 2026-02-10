// components/landing/NavigationLinks.ts

export const DATA_LINKS = [
  {
    id: "Whatsapp",
    href: "/Landing/SiteDiary",
    titleKey: "data.whatsapp.title",
    descriptionKey: "data.whatsapp.description",
  },
  {
    id: "Timesheets",
    href: "/Landing/Timesheets",
    titleKey: "data.timesheets.title",
    descriptionKey: "data.timesheets.description",
  },
  {
    id: "Analytics",
    href: "/Landing/Analytics",
    titleKey: "data.analytics.title",
    descriptionKey: "data.analytics.description",
  },
] as const;

export const MAIN_LINKS = [
     { href:"/Landing/CaseStudies", labelKey: "main.caseStudies" },
  { href: "/Landing/Custom", labelKey: "main.custom" },
  { href: "/Landing/Pricing", labelKey: "main.pricing" },
  { href: "/Landing/About", labelKey: "main.about" },
  { href: "/Landing/ContactForm", labelKey: "main.contacts" },
] as const;

export const COMBINED_LINKS = [
  {
    id: "Whatsapp",
    href: "/Landing/SiteDiary",
    titleKey: "data.whatsapp.title",
    descriptionKey: "data.whatsapp.description",
  },
  {
    id: "Timesheets",
    href: "/Landing/Timesheets",
    titleKey: "data.timesheets.title",
    descriptionKey: "data.timesheets.description",
  },
  {
    id: "Analytics",
    href: "/Landing/Analytics",
    titleKey: "data.analytics.title",
    descriptionKey: "data.analytics.description",
  },
  {
    id: "Custom",
    href: "/Landing/Custom",
    titleKey: "main.custom",
    descriptionKey: "combined.generic",
  },
  {
    id: "Pricing",
    href: "/Landing/Pricing",
    titleKey: "main.pricing",
    descriptionKey: "combined.generic",
  },
  {
    id: "About",
    href: "/Landing/About",
    titleKey: "main.about",
    descriptionKey: "combined.generic",
  },
] as const;
