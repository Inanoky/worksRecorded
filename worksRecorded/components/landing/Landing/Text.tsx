// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\components\landing\Landing\Text.tsx

import { CheckCircle2 } from "lucide-react";

export const Header = "Site records with Whatsapp";
export const Header2 = "Get your works recorded";

export const SmallDescription =
  "WorksRecorded turns WhatsApp messages, voice notes, photos, delivery notes and emails into organised site diary entries and project evidence — without changing how your team communicates.";

export function WhatDoWeDo() {
  const items = [
    { title: "Easy and quick for managers to records site activities." },
    { title: "Structurized automatically" },
    { title: "Edit records from the web if necessary"},
    {
      title: "Whatsapp Timesheets - add workers, records times, workers can take notes and photos",
   
    },
    {
      title: "Site records - get analytics, track additional works and delays",
     
    },
    {
      title: "Photos - stored sistematically."
  
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-foreground">
        We help trade contractors with:
      </h3>
      <ul className="space-y-3">
        {items.map(({ title, desc }) => (
          <li key={title} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p className="leading-relaxed text-foreground">
              <span className="font-semibold">{title}</span>
              {desc ? <span> — {desc}</span> : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const NoIntegration =
  "No extra admin. No forms. No new apps. Just WhatsApp, talk, send, done.";

export function HowDoWeDoThat() {
  const items = [
  {
    title: "Site diary from WhatsApp",
    desc: "Send messages, photos or voice notes — AI turns them into clear daily records.",
  },
  {
    title: "Evidence for claims",
    desc: "Work done, delays and instructions captured automatically and ready when needed.",
  },
  {
    title: "Daily performance insight",
    desc: "See issues early instead of discovering them weeks later.",
  },
  {
    title: "Real history of work",
    desc: "Every note, photo and update stored by day, location and activity.",
  },
  {
    title: "Simple change tracking",
    desc: "Variations, issues and notes kept organised in one place.",
  },
  {
    title: "Everything in one project log",
    desc: "No more digging through WhatsApp, folders or emails to find what happened.",
  },
];

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold text-foreground">
        How worksRecorded helps trade contractors
      </h3>
      <ul className="space-y-3">
        {items.map(({ title, desc }) => (
          <li key={title} className="flex items-start gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden />
            <p className="leading-relaxed text-foreground">
              <span className="font-semibold">{title}</span>
              {desc ? <span> — {desc}</span> : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Why() {
  const bullets = [
    "Most tools require forms and manual input. Site teams don’t have time for that.",
    "WorksRecorded works with the channels you already use: WhatsApp, email and photos.",
    "WorksRecorded keeps a consistent, structured site diary running in the background.",
    "When you need to defend a variation, claim delay costs or explain a decision, the evidence is already organised.",
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold text-foreground">
        Why worksRecorded is different
      </h3>
      <p className="text-foreground">
        You only need whatsapp to start using. No additional burden to site management
      </p>
      <ul className="space-y-3">
        {bullets.map((text) => (
          <li key={text} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p className="leading-relaxed text-foreground">{text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
