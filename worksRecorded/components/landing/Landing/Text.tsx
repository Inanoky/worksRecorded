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
      <h3 className="text-xl font-semibold text-gray-900">
        We help trade contractors with:
      </h3>
      <ul className="space-y-3">
        {items.map(({ title, desc }) => (
          <li key={title} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p className="leading-relaxed text-gray-700">
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
      desc: "Site managers or foremen send messages, photos and voice notes — AI turns them into structured daily records.",
    },
    {
      title: "Evidence for claims",
      desc: "Daily log with who worked, what was done, delays, instructions and issues, ready when a dispute appears.",
    },
    {
      title: "Real costs from previous jobs",
      desc: "Labour, materials and subcontractors are linked to work packages so you can see real historic costs.",
    },
    {
      title: "Daily performance insight",
      desc: "See where time and money are lost before it becomes a problem, not months later in final accounts.",
    },
    {
      title: "Supplier and change tracking",
      desc: "Invoices and delivery notes are attached to days, locations and work packages in one record.",
    },
    {
      title: "Everything in one project record",
      desc: "So you are not searching through WhatsApp chats, folders and email when you need to prove your case.",
    },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold text-gray-900">
        How worksRecorded helps trade contractors
      </h3>
      <ul className="space-y-3">
        {items.map(({ title, desc }) => (
          <li key={title} className="flex items-start gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden />
            <p className="leading-relaxed text-gray-700">
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
    "worksRecorded works with the channels you already use: WhatsApp, email and photos.",
    "AI keeps a consistent, structured site diary running in the background.",
    "When you need to defend a variation, claim delay costs or explain a decision, the evidence is already organised.",
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold text-gray-900">
        Why worksRecorded is different
      </h3>
      <p className="text-gray-700">
        We are not another task app or form system. worksRecorded captures the real
        conversation happening every day on your projects and turns it into a reliable
        project record you can actually use in meetings, claims and negotiations.
      </p>
      <ul className="space-y-3">
        {bullets.map((text) => (
          <li key={text} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p className="leading-relaxed text-gray-700">{text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
