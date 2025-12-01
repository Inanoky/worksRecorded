// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\components\landing\Landing\Text.tsx

import { CheckCircle2 } from "lucide-react";

export const Header = "Trade contractors";
export const Header2 = "Protect your margin with proper records";

export const SmallDescription =
  "Buvconsult converts WhatsApp messages, voice notes, photos, delivery notes and emails into organised site diary entries and project evidence — without changing how your team communicates.";

export function WhatDoWeDo() {
  const items = [
    { title: "Claim documentation", desc: "often harder to prepare without clear daily records" },
    { title: "Scope gaps", desc: "can occur when extra work is not consistently documented" },
    { title: "Estimating challenges", desc: "sometimes caused by limited data from previous jobs" },
    {
      title: "Inefficient site processes",
      desc: "may arise when recurring issues are not reviewed or analysed",
    },
    {
      title: "Client communication issues",
      desc: "especially when precise evidence is difficult to retrieve",
    },
    {
      title: "Costly mistakes",
      desc: "which can stem from limited visibility of day-to-day site activity",
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900">
        We help construction contractors with :
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
  "No extra admin. No forms. No spreadsheets. Just talk, send, done.";

export function HowDoWeDoThat() {
  const items = [
    {
      title: "Site diary from WhatsApp",
      desc: "Site manager or foreman sends messages, photos and voice notes — AI turns them into structured records.",
    },
    {
      title: "Evidence for claims",
      desc: "Daily log with who worked, what was done, delays, instructions and issues.",
    },
    {
      title: "Real costs from previous jobs",
      desc: "Labour, materials and subcontractors are linked to work packages for future estimating.",
    },
    {
      title: "Daily performance insight",
      desc: "See where time and money are lost before it becomes a problem.",
    },
    {
      title: "Supplier and change tracking",
      desc: "Invoices and delivery notes are attached to days and locations.",
    },
    {
      title: "Everything in one project record",
      desc: "So you are not searching through WhatsApp chats and folders when a dispute appears.",
    },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold text-gray-900">
        How Buvconsult helps trade contractors
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
    "Buvconsult works with the channels you already use: WhatsApp, email and photos.",
    "AI keeps a consistent, structured site diary in the background.",
    "When you need to defend a variation, claim delay costs or explain a decision, the evidence is already organised.",
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold text-gray-900">
        Why Buvconsult is different
      </h3>
      <p className="text-gray-700">
        We are not another task app or form system. Buvconsult captures the real
        conversation happening every day on your projects and turns it into a reliable
        project record.
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
