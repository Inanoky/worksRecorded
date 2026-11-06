import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";

const copy = {
  en: {
    back: "← Back to case studies",
    title: "LEC: Keeping remote projects visible to head office",
    intro:
      "Latvijas Energoceltnieks uses WorksRecorded to capture what is happening on remote job locations, where the project site is in a different country or location from the head office. Clear daily communication helps the office understand site progress without waiting for scattered calls, messages, or end-of-project paperwork.",
    problemTitle: "Problem",
    problem:
      "LEC runs projects where work happens away from the head office. Because the team responsible for managing the project is not always on site, communication is crucial. Head office needs a reliable way to see what happened each day, understand progress, and react quickly when site events affect the plan.",
    solutionTitle: "Solution",
    solution:
      "Site managers send an everyday report in WorksRecorded during short term projects, typically lasting 3-4 months. The report captures the key site activity, progress notes, photos, and events from the remote job location in one structured daily record.",
    outcomeTitle: "Outcome",
    outcomes: [
      "Head office gets a clear daily view of remote site progress",
      "Project managers can review work without being physically on site",
      "Site events are easier to control, track, and respond to",
      "Short term projects finish with a complete record of what happened",
    ],
    ctaTitle: "Want the same workflow?",
    ctaText: "Try WorksRecorded on a pilot project.",
    button: "Visit worksrecorded.com",
    imageAlt: "LEC remote job site",
  },
  lv: {
    back: "← Atpakaļ uz projektu pieredzi",
    title: "LEC: Attālinātu projektu pārskatāmība galvenajam birojam",
    intro:
      "Latvijas Energoceltnieks izmanto WorksRecorded, lai fiksētu, kas notiek attālinātās darba vietās, kur objekts atrodas citā valstī vai citā lokācijā nekā galvenais birojs. Skaidra ikdienas komunikācija palīdz birojam saprast objekta progresu bez izkaisītiem zvaniem, ziņām un dokumentiem projekta beigās.",
    problemTitle: "Problēma",
    problem:
      "LEC īsteno projektus, kuros darbs notiek tālu no galvenā biroja. Tā kā projekta vadības komanda ne vienmēr atrodas objektā, komunikācija ir kritiski svarīga. Galvenajam birojam ir vajadzīgs uzticams veids, kā redzēt, kas notika katru dienu, saprast progresu un ātri reaģēt, kad notikumi objektā ietekmē plānu.",
    solutionTitle: "Risinājums",
    solution:
      "Objekta vadītāji WorksRecorded sagatavo ikdienas atskaiti īstermiņa projektos, kas parasti ilgst 3-4 mēnešus. Atskaitē vienā strukturētā ikdienas ierakstā tiek fiksēta galvenā objekta aktivitāte, progresa piezīmes, fotoattēli un notikumi attālinātajā darba vietā.",
    outcomeTitle: "Rezultāts",
    outcomes: [
      "Galvenais birojs saņem skaidru ikdienas pārskatu par attālināta objekta progresu",
      "Projektu vadītāji var pārskatīt darbu, fiziski neatrodoties objektā",
      "Notikumus objektā ir vieglāk kontrolēt, izsekot un risināt",
      "Īstermiņa projekti noslēdzas ar pilnu ierakstu par notikušo",
    ],
    ctaTitle: "Vēlaties tādu pašu darba plūsmu?",
    ctaText: "Izmēģiniet WorksRecorded pilotprojektā.",
    button: "Apmeklēt worksrecorded.com",
    imageAlt: "LEC attālināts objekts",
  },
};

export default function LecCaseStudy() {
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

      <p className="mt-3 text-muted-foreground">{t.intro}</p>

      <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
        <Image
          src="/pictures/lec_article_picture.jpeg"
          alt={t.imageAlt}
          fill
          className="object-cover"
        />
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
