import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";

export default function DepromCaseStudy() {

   const locale = useLocale(); // ✅ en / lv / etc
  
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
                href={`/${locale}/Landing/CaseStudies`} 
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Back to case studies
      </Link>

      <h1 className="mt-4 text-3xl font-semibold">
        Deprom: Creating value with construction data
      </h1>

      <p className="mt-3 text-muted-foreground">
        Deprom is a well-respected Latvian construction company, delivering
        precast solutions for modern construction (
        <a
          href="https://www.deprom.lv"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          www.deprom.lv
        </a>
        ). They needed a low-friction way to capture daily site activity without
        chasing paperwork or introducing complicated new systems.
      </p>

      <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
        <Image
          src="/pictures/deprom.jpeg"
          alt="Deprom case study cover"
          fill
          className="object-cover"
        />
      </div>

      <section className="prose prose-neutral dark:prose-invert mt-10 max-w-none">
        <h2>Problem</h2>
        <p>
          Reporting was inconsistent. Updates were often delayed and scattered
          across calls, messages, and photos. The previous system (Procore)
          turned out not to deliver enough value for its cost.
        </p>

        <h2>Solution</h2>
        <p>
          Site managers sent WhatsApp voice notes and photos. WorksRecorded
          structured them into daily records automatically. Reporting was set
          up specifically to match Deprom’s existing workflows.
        </p>

        <h2>Outcome</h2>
        <ul>
          <li>4 months of work and 600 records stored</li>
          <li>900 pictures stored</li>
          <li>20 hours per week of admin saved</li>
          <li>
            Monthly progress reports against estimates delivered together with
            project financial forecasts
          </li>
          <li>WhatsApp timesheets recorded over 10,000 hours of work</li>
        </ul>

        <h2>Want the same workflow?</h2>
        <p>Try WorksRecorded on a pilot project.</p>
      </section>

      <div className="mt-10">
        <a
          href="https://www.worksrecorded.com/"
          className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Visit worksrecorded.com
        </a>
      </div>
    </main>
  );
}
