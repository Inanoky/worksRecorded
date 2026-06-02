import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";

const copy = {
  en: {
    back: "← Back to case studies",
    title: "Deprom: Creating value with construction data",
    intro:
      "Deprom is a well-respected Latvian construction company, delivering precast solutions for modern construction. They needed a low-friction way to capture daily site activity without chasing paperwork or introducing complicated new systems.",
    problemTitle: "Problem",
    problem:
      "Reporting was inconsistent. Updates were often delayed and scattered across calls, messages, and photos. The previous system, Procore, turned out not to deliver enough value for its cost.",
    solutionTitle: "Solution",
    solution:
      "Site managers sent WhatsApp voice notes and photos. WorksRecorded structured them into daily records automatically. Reporting was set up specifically to match Deprom's existing workflows.",
    outcomeTitle: "Outcome",
    outcomes: [
      "4 months of work and 600 records stored",
      "900 pictures stored",
      "20 hours per month of admin saved",
      "Monthly progress reports against estimates delivered together with project financial forecasts",
      "WhatsApp timesheets recorded over 10,000 hours of work",
    ],
    ctaTitle: "Want the same workflow?",
    ctaText: "Try WorksRecorded on a pilot project.",
    button: "Visit worksrecorded.com",
    imageAlt: "Deprom case study cover",
  },
  lv: {
    back: "← Atpakaļ uz projektu pieredzi",
    title: "Deprom: Vērtības radīšana ar būvniecības datiem",
    intro:
      "Deprom ir Latvijas būvniecības uzņēmums, kas nodrošina saliekamā dzelzsbetona risinājumus modernai būvniecībai. Uzņēmumam bija vajadzīgs vienkāršs veids, kā fiksēt ikdienas notikumus objektā bez papīru dzenāšanas un sarežģītu sistēmu ieviešanas.",
    problemTitle: "Problēma",
    problem:
      "Atskaites bija nevienmērīgas. Ziņas bieži kavējās un bija izkaisītas pa zvaniem, ziņām un fotoattēliem. Iepriekšējā sistēma, Procore, nesniedza pietiekamu vērtību pret izmaksām.",
    solutionTitle: "Risinājums",
    solution:
      "Objekta vadītāji sūtīja WhatsApp balss ziņas un foto. WorksRecorded tās automātiski strukturēja ikdienas ierakstos. Atskaites tika pielāgotas Deprom esošajai darba kārtībai.",
    outcomeTitle: "Rezultāts",
    outcomes: [
      "4 mēnešu darbs un 600 saglabāti ieraksti",
      "900 saglabāti fotoattēli",
      "Ietaupītas 20 administrācijas stundas mēnesī",
      "Ikmēneša progresa atskaites pret tāmēm kopā ar projekta finanšu prognozēm",
      "WhatsApp darba laika uzskaitē reģistrētas vairāk nekā 10 000 darba stundas",
    ],
    ctaTitle: "Vēlaties tādu pašu darba plūsmu?",
    ctaText: "Izmēģiniet WorksRecorded pilotprojektā.",
    button: "Apmeklēt worksrecorded.com",
    imageAlt: "Deprom projekta apraksta attēls",
  },
};

export default function DepromCaseStudy() {
  const locale = useLocale();
  const t = locale === "lv" ? copy.lv : copy.en;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/${locale}/Landing/CaseStudies`}
        className="text-sm text-muted-foreground hover:underline"
      >
        {t.back}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold">{t.title}</h1>

      <p className="mt-3 text-muted-foreground">
        {t.intro}{" "}
        <a
          href="https://www.deprom.lv"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          www.deprom.lv
        </a>
      </p>

      <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
        <Image src="/pictures/deprom.jpeg" alt={t.imageAlt} fill className="object-cover" />
      </div>

      <section className="prose prose-neutral dark:prose-invert mt-10 max-w-none">
        <h2>{t.problemTitle}</h2>
        <p>{t.problem}</p>

        <h2>{t.solutionTitle}</h2>
        <p>{t.solution}</p>

        <h2>{t.outcomeTitle}</h2>
        <ul>
          {t.outcomes.map((outcome) => (
            <li key={outcome}>{outcome}</li>
          ))}
        </ul>

        <h2>{t.ctaTitle}</h2>
        <p>{t.ctaText}</p>
      </section>

      <div className="mt-10">
        <a
          href="https://www.worksrecorded.com/"
          className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          {t.button}
        </a>
      </div>
    </main>
  );
}
