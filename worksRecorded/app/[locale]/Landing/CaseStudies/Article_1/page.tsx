import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";

const copy = {
  en: {
    back: "← Back to case studies",
    title: "Why Most Contractor Software Fails - And What Actually Works",
    intro:
      "Most construction software promises efficiency, cost control, and better reporting. In reality, many platforms fail to deliver real value on site. This article explains why, and how WorksRecorded takes a different approach.",
    imageAlt: "Construction site reporting with WhatsApp",
    button: "Visit worksrecorded.com",
    sections: [
      {
        title: "Why Most Contractor Software Fails",
        paragraphs: [
          "Truth is, there are not many truly good software solutions for contractors. Many systems are built without understanding how construction really works on site.",
          "Common problems include:",
        ],
        bullets: [
          "Too complicated to onboard and use daily",
          "Just another tool instead of a practical solution",
          "Trying to do everything at once",
          "High cost without clear return",
          "Ignoring existing workflows",
          "Built without real industry experience",
        ],
        after: ["The result is low adoption, inconsistent reporting, and wasted investment."],
      },
      {
        title: "What Good Contractor Software Looks Like",
        paragraphs: ["Effective contractor software should be:"],
        bullets: ["Simple", "Effective", "Affordable", "Quick to integrate", "Useful from the first minute"],
        after: ["It should fit naturally into daily site work, not disrupt it."],
      },
      {
        title: "Custom Digital Solutions at an Understandable Price",
        paragraphs: [
          "WorksRecorded focuses on adapting to existing contractor workflows instead of forcing new systems.",
          "Our approach includes:",
        ],
        bullets: [
          "Transforming workflows into WhatsApp processes",
          "Digitising paper and Excel forms",
          "Creating WhatsApp punchlists for inspections",
          "Enabling timesheets with geolocation",
          "Integrating with existing CRM systems",
          "Providing reports in familiar formats",
        ],
        after: ["No complex training. No unnecessary features. Just practical tools."],
      },
      {
        title: "Using Site Records to Forecast Project Costs",
        paragraphs: [
          "Accurate data is the foundation of profitable projects. WorksRecorded helps contractors forecast costs in real time.",
        ],
        subsections: [
          {
            title: "1. Daily Site Reporting",
            text: "Site managers send voice notes and photos via WhatsApp, describing who did what on site.",
          },
          {
            title: "2. Cost per Unit Analysis",
            text: "Work quantities and labour hours are analysed to calculate the real cost per unit.",
          },
          {
            title: "3. Live Forecasting",
            text: "Project cost forecasts are updated daily, helping managers act early when risks appear.",
          },
        ],
      },
      {
        title: "Real Benefits for Contractors",
        bullets: [
          "All working hours accounted for",
          "Reduced administration",
          "Reliable historical data",
          "Clear cost structure",
          "Better decision-making",
          "No surprises at project closeout",
        ],
        after: ["Data collected today remains useful for years to come."],
      },
      {
        title: "Simple. Practical. Effective.",
        paragraphs: [
          "Construction software should save time, reduce admin, and improve cost control - not create more work.",
          "WorksRecorded is built for real site conditions, real workflows, and real results.",
        ],
      },
      {
        title: "Ready to Try It?",
        paragraphs: [
          "Start with a pilot project and see how structured site data can improve productivity and cost control from day one.",
        ],
      },
    ],
  },
  lv: {
    back: "← Atpakaļ uz projektu pieredzi",
    title: "Kāpēc lielākā daļa būvniecības programmatūru izgāžas - un kas tiešām strādā",
    intro:
      "Lielākā daļa būvniecības programmatūru sola efektivitāti, izmaksu kontroli un labākas atskaites. Praksē daudzas platformas objektā nesniedz reālu vērtību. Šajā rakstā skaidrojam kāpēc un kā WorksRecorded izvēlas citu pieeju.",
    imageAlt: "Būvobjekta atskaites ar WhatsApp",
    button: "Apmeklēt worksrecorded.com",
    sections: [
      {
        title: "Kāpēc lielākā daļa būvniecības programmatūru izgāžas",
        paragraphs: [
          "Patiesībā darbuzņēmējiem nav daudz patiesi labu programmatūras risinājumu. Daudzas sistēmas ir veidotas bez izpratnes par to, kā būvniecība strādā objektā.",
          "Biežākās problēmas:",
        ],
        bullets: [
          "Pārāk sarežģīta ieviešana un ikdienas lietošana",
          "Vēl viens rīks, nevis praktisks risinājums",
          "Mēģinājums darīt visu vienlaikus",
          "Augstas izmaksas bez skaidras atdeves",
          "Esošo darba procesu ignorēšana",
          "Izstrāde bez reālas nozares pieredzes",
        ],
        after: ["Rezultāts ir zema lietošana, nevienmērīgas atskaites un izniekoti ieguldījumi."],
      },
      {
        title: "Kādai jābūt labai būvniecības programmatūrai",
        paragraphs: ["Efektīvai darbuzņēmēju programmatūrai jābūt:"],
        bullets: ["Vienkāršai", "Efektīvai", "Pieejamai", "Ātri ieviešamai", "Noderīgai no pirmās minūtes"],
        after: ["Tai jāiekļaujas ikdienas darbā objektā, nevis tas jātraucē."],
      },
      {
        title: "Pielāgoti digitāli risinājumi par saprotamu cenu",
        paragraphs: [
          "WorksRecorded pielāgojas esošajām darbuzņēmēju darba plūsmām, nevis piespiež ieviest jaunas sistēmas.",
          "Mūsu pieeja ietver:",
        ],
        bullets: [
          "Darba plūsmu pārvēršanu WhatsApp procesos",
          "Papīra un Excel formu digitalizāciju",
          "WhatsApp defektu un pārbaudes sarakstus",
          "Darba laika uzskaiti ar ģeolokāciju",
          "Integrāciju ar esošām CRM sistēmām",
          "Atskaites pazīstamos formātos",
        ],
        after: ["Bez sarežģītām apmācībām. Bez liekām funkcijām. Tikai praktiski rīki."],
      },
      {
        title: "Objekta ieraksti projekta izmaksu prognozēšanai",
        paragraphs: [
          "Precīzi dati ir rentablu projektu pamats. WorksRecorded palīdz darbuzņēmējiem prognozēt izmaksas reāllaikā.",
        ],
        subsections: [
          {
            title: "1. Ikdienas objekta atskaites",
            text: "Objekta vadītāji ar WhatsApp sūta balss ziņas un foto, aprakstot, kas un ko objektā paveica.",
          },
          {
            title: "2. Izmaksas uz vienību analīze",
            text: "Darbu apjomi un darba stundas tiek analizētas, lai aprēķinātu reālās izmaksas uz vienību.",
          },
          {
            title: "3. Dzīvā prognozēšana",
            text: "Projekta izmaksu prognozes tiek atjaunotas katru dienu, palīdzot vadītājiem rīkoties savlaicīgi.",
          },
        ],
      },
      {
        title: "Reāli ieguvumi darbuzņēmējiem",
        bullets: [
          "Uzskaitītas visas darba stundas",
          "Mazāk administrācijas",
          "Uzticami vēsturiskie dati",
          "Skaidra izmaksu struktūra",
          "Labāki lēmumi",
          "Mazāk pārsteigumu projekta noslēgumā",
        ],
        after: ["Šodien savāktie dati paliek noderīgi arī turpmākajos gados."],
      },
      {
        title: "Vienkārši. Praktiski. Efektīvi.",
        paragraphs: [
          "Būvniecības programmatūrai jātaupa laiks, jāsamazina administrācija un jāuzlabo izmaksu kontrole, nevis jārada papildu darbs.",
          "WorksRecorded ir veidots reāliem objekta apstākļiem, reālām darba plūsmām un reāliem rezultātiem.",
        ],
      },
      {
        title: "Gatavi izmēģināt?",
        paragraphs: [
          "Sāciet ar pilotprojektu un redziet, kā strukturēti objekta dati jau no pirmās dienas uzlabo produktivitāti un izmaksu kontroli.",
        ],
      },
    ],
  },
};

export default function ContractorSoftwareArticle() {
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
        <Image src="/pictures/article_1.jpg" alt={t.imageAlt} fill className="object-cover" />
      </div>

      <section className="prose prose-neutral dark:prose-invert mt-10 max-w-none">
        {t.sections.map((section) => (
          <div key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
            {section.after?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.subsections?.map((subsection) => (
              <div key={subsection.title}>
                <h3>{subsection.title}</h3>
                <p>{subsection.text}</p>
              </div>
            ))}
          </div>
        ))}
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
