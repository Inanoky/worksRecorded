// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\components\landing\Landing\Text.tsx
import { CheckCircle2 } from "lucide-react";

export const Header = "Advanced AI record-keeping for Trade contractors";
export const Header2 = "Secure your project profit";

export const SmallDescription =
  "Buvconsult captures all daily project communication — voice notes, emails, documents, WhatsApp messages, photos, delivery notes — " +
  "and automatically turns it into organized, searchable project records.";

export function WhatDoWeDo() {
  const items = [
    { title: "Claims", desc: "" },
    { title: "Scope gaps", desc: "" },
    { title: "Incorrect bids", desc: "" },
    { title: "Inefficient construction processes", desc: "" },
    { title: "Unreasonable client behaviour", desc: "" },
    { title: "Profit-destroying mistakes", desc: "" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-700">
        We help solve contractor problems with:
      </h3>
      <ul className="space-y-3">
        {items.map(({ title, desc }) => (
          <li key={title} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p className="leading-relaxed">
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

// ▼▼ Updated: JSX versions ▼▼
export function HowDoWeDoThat() {
  const items = [
    {
      title: "Defend claims",
      desc: "Clear timeline and evidence of works performed",
    },
    {
      title: "Avoid scope gaps",
      desc: "AI cross-checks tasks, drawings, and agreements",
    },
    {
      title: "Improve estimating",
      desc: "Real cost data from previous jobs",
    },
    {
      title: "Fix inefficiencies early",
      desc: "Daily performance insights",
    },
    {
      title: "Reduce material waste / overpricing",
      desc: "Compare suppliers easily",
    },
    {
      title: "Manage difficult clients",
      desc: "Strong documented proof forces fairness",
    },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-medium text-gray-700 ">We help trade contractors :</h3>
      <ul className="space-y-3">
        {items.map(({ title, desc }) => (
          <li key={title} className="flex items-start gap-3">
            <CheckCircle2 className=" size-5 shrink-0" aria-hidden />
            <p className="leading-relaxed">
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
    "Site manager sends voice notes and WhatsApp messages — AI converts them into structured records",
    "Invoices, documents, and emails — automatically uploaded and analyzed by AI",
    "Everything is stored automatically in the project database",
    "AI retrieves exact evidence when needed (claims, meetings, negotiations)",
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-700">
        Why Buvconsult is different
      </h3>
      <p className="text-gray-600">
        Most software requires manual input, which site teams never do.
        Buvconsult works the way site teams already communicate:
      </p>
      <ul className="space-y-3">
        {bullets.map((text) => (
          <li key={text} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p className="leading-relaxed">{text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
