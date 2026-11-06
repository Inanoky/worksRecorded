import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";

const copy = {
  en: {
    back: "← Back to case studies",
    title: "U-fix: Combining site diary with authority reporting",
    intro:
      "U-fix is one of the largest in-situ contractors in Latvia. WorksRecorded helped automate daily reporting for the Latvian BIS construction reporting system.",
    projectTitle: "Project",
    project: "Terbatas Garden (Tērbatas Dārzs) - Tērbatas iela 78A, Rīga",
    problemTitle: "Problem",
    problem: "Authority reporting took a lot of admin. U-fix needed a system to reduce time spent.",
    solutionTitle: "Solution",
    solution:
      "Site managers sent WhatsApp voice notes and photos. WorksRecorded integrated reporting with the BIS API system.",
    ctaTitle: "Want the same workflow?",
    ctaText: "Try WorksRecorded on a pilot project.",
    button: "Visit worksrecorded.com",
    imageAlt: "U-fix project",
  },
  lv: {
    back: "← Atpakaļ uz projektu pieredzi",
    title: "U-fix: Būvdarbu žurnāls kopā ar BIS atskaitēm",
    intro:
      "U-fix ir viens no lielākajiem monolīto darbu uzņēmumiem Latvijā. WorksRecorded palīdzēja automatizēt ikdienas atskaites Latvijas BIS būvniecības atskaišu sistēmai.",
    projectTitle: "Projekts",
    project: "Tērbatas Garden (Tērbatas Dārzs) - Tērbatas iela 78A, Rīga",
    problemTitle: "Problēma",
    problem:
      "Atskaites valsts sistēmām prasīja daudz administratīvā darba. U-fix bija nepieciešama sistēma, kas samazina patērēto laiku.",
    solutionTitle: "Risinājums",
    solution:
      "Objekta vadītāji sūtīja WhatsApp balss ziņas un foto. WorksRecorded savienoja atskaišu sagatavošanu ar BIS API sistēmu.",
    ctaTitle: "Vēlaties tādu pašu darba plūsmu?",
    ctaText: "Izmēģiniet WorksRecorded pilotprojektā.",
    button: "Apmeklēt worksrecorded.com",
    imageAlt: "U-fix projekts",
  },
};

export default function UfixCaseStudy() {
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
        <Image src="/pictures/ufix.jpg" alt={t.imageAlt} fill className="object-cover" />
      </div>

      <section className="prose prose-neutral dark:prose-invert mt-10 max-w-none">
        <h2>{t.projectTitle}</h2>
        <p>{t.project}</p>

        <h2>{t.problemTitle}</h2>
        <p>{t.problem}</p>

        <h2>{t.solutionTitle}</h2>
        <p>{t.solution}</p>

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
