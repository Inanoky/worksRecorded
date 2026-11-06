import Link from "next/link";
import { useLocale } from "next-intl";

const sources = {
  caterpillar:
    "https://www.ivtinternational.com/news/construction/autonomous-cs12-conexpo.html",
  oracle:
    "https://www.oracle.com/news/announcement/oracle-transforms-construction-safety-management-with-ai-2026-03-05/",
  autodesk:
    "https://adsknews.autodesk.com/en/news/autodesk-invests-in-world-labs/",
  wsp: "https://www.constructiondive.com/news/wsp-cautions-ai-hysteria-earnings/813338/",
};

const copy = {
  en: {
    back: "← Back to case studies",
    title: "AI in Construction: Last Week's Highlights (2-9 Mar 2026)",
    intro:
      "From autonomous equipment at CONEXPO to predictive safety platforms and physical-world AI, the last week showed how quickly artificial intelligence is moving from hype into real construction workflows.",
    published: "Published: March 2026",
    category: "Construction AI",
    tags: "Autonomy, Safety, Data",
    sourcesTitle: "Sources",
    readSource: "Read source →",
    cards: [
      {
        key: "caterpillar",
        title: "Caterpillar / CONEXPO autonomy",
        text: "Autonomous CS12 compactor and Cat AI Assistant.",
      },
      {
        key: "oracle",
        title: "Oracle Advisor for Safety",
        text: "Predictive safety platform for construction.",
      },
      {
        key: "autodesk",
        title: "Autodesk x World Labs",
        text: "$200M investment in physical-world AI.",
      },
      {
        key: "wsp",
        title: "WSP on AI hysteria",
        text: "Why human oversight stays central.",
      },
    ],
    sections: [
      {
        title: "Autonomy Takes Center Stage at CONEXPO 2026",
        paragraphs: [
          "The 2026 CONEXPO-CON/AGG show in Las Vegas made one thing clear: manufacturers are no longer talking about AI as a future concept. They are shipping it into real equipment and using it to address labor shortages, safety challenges and operational efficiency.",
          "Exhibitors highlighted intelligent systems that automate repetitive tasks such as grading and compaction, while also introducing digital tools designed to turn job-site data into more actionable insight. The direction is practical rather than theoretical: fewer repetitive manual inputs, better precision and more visibility into project performance.",
        ],
        source: "caterpillar",
      },
      {
        title: "Caterpillar's Autonomous Compactor & AI Assistant",
        caption: "Cat CS12 autonomous soil compactor shown ahead of CONEXPO 2026.",
        paragraphs: [
          "Caterpillar drew major attention by demonstrating its CS12 soil compactor operating with nobody in the cab. That made it one of the clearest live-show examples of construction autonomy moving beyond concept demos and into real machine workflows.",
          "The company also highlighted Cat Command, which allows one operator to supervise multiple machines remotely, and launched the Cat AI Assistant across service and support workflows such as parts lookup, troubleshooting, manuals and fleet monitoring.",
        ],
        source: "caterpillar",
      },
      {
        title: "WSP's Machine-in-the-Middle Approach",
        paragraphs: [
          "Not every headline was about replacing people. WSP used its earnings commentary to push back against exaggerated AI narratives and made the case that engineering remains deeply tied to field judgment, accountability and proprietary expertise.",
          "Its machine-in-the-middle framing is probably one of the most useful ways to think about AI in construction: let software accelerate analysis and reporting, but keep humans responsible for review, validation and final decisions.",
        ],
        source: "wsp",
      },
      {
        title: "Oracle's AI Platform for Predictive Safety",
        caption: "Oracle Advisor for Safety interface showing weekly project risk forecasts.",
        paragraphs: [
          "Oracle introduced Advisor for Safety as a predictive layer for construction safety management. Instead of waiting for incidents and reacting afterward, the platform is designed to forecast which projects are statistically more likely to experience safety issues.",
          "It combines historical safety data with structured field observations and project inputs, making AI useful in one of the most important areas of construction: prevention rather than paperwork.",
        ],
        source: "oracle",
      },
      {
        title: "Autodesk's $200 Million Bet on Physical AI",
        caption: "Autodesk technology center, used here alongside coverage of the World Labs investment.",
        paragraphs: [
          "Autodesk's $200 million investment in World Labs shows where some of the biggest construction-tech bets are heading: AI that understands space, geometry and the 3D physical world rather than only text.",
          "That matters for construction because physical-world AI could support design, prefabrication, progress tracking, inspection, reality capture and digital twins. The underlying theme is that better spatial reasoning should create more useful tools for people who build real things.",
        ],
        source: "autodesk",
      },
    ],
    whyTitle: "Why These Trends Matter",
    trendCards: [
      {
        title: "Safety & Productivity",
        text: "AI is increasingly being used to reduce incidents, shorten learning curves and improve performance on site.",
      },
      {
        title: "Autonomy with Oversight",
        text: "Autonomous machines are reaching live job-site workflows, but serious firms still keep people in the loop.",
      },
      {
        title: "Physical World AI",
        text: "More investment is going into AI that understands the built environment in 3D, not just documents and chat.",
      },
      {
        title: "Data Utilisation",
        text: "Construction companies are finally trying to turn unused project data into decisions that improve safety, cost control and delivery.",
      },
    ],
    finalTitle: "Final Thoughts",
    finalText:
      "The clearest takeaway from the week is that AI in construction is becoming more operational and less abstract. The most promising tools are not the ones trying to replace builders, engineers or site teams. They are the ones helping people work safer, faster and with better information.",
  },
  lv: {
    back: "← Atpakaļ uz projektu pieredzi",
    title: "MI būvniecībā: pagājušās nedēļas svarīgākais (2026. gada 2.-9. marts)",
    intro:
      "No autonomas tehnikas CONEXPO izstādē līdz prognozējošām drošības platformām un fiziskās pasaules MI - pagājušā nedēļa parādīja, cik ātri mākslīgais intelekts pāriet no modes vārda uz reālām būvniecības darba plūsmām.",
    published: "Publicēts: 2026. gada marts",
    category: "MI būvniecībā",
    tags: "Autonomija, drošība, dati",
    sourcesTitle: "Avoti",
    readSource: "Lasīt avotu →",
    cards: [
      {
        key: "caterpillar",
        title: "Caterpillar / CONEXPO autonomija",
        text: "Autonoms CS12 blīvētājs un Cat AI Assistant.",
      },
      {
        key: "oracle",
        title: "Oracle Advisor for Safety",
        text: "Prognozējoša drošības platforma būvniecībai.",
      },
      {
        key: "autodesk",
        title: "Autodesk x World Labs",
        text: "200 miljonu ASV dolāru ieguldījums fiziskās pasaules MI.",
      },
      {
        key: "wsp",
        title: "WSP par MI pārspīlējumiem",
        text: "Kāpēc cilvēka uzraudzība joprojām ir centrāla.",
      },
    ],
    sections: [
      {
        title: "Autonomija ieņem centrālo vietu CONEXPO 2026",
        paragraphs: [
          "2026. gada CONEXPO-CON/AGG izstāde Lasvegasā skaidri parādīja: ražotāji vairs nerunā par MI tikai kā nākotnes konceptu. Viņi ievieš to reālā tehnikā, lai risinātu darbaspēka trūkumu, drošības izaicinājumus un efektivitāti.",
          "Izstādes dalībnieki rādīja inteliģentas sistēmas, kas automatizē atkārtotus darbus, piemēram, planēšanu un blīvēšanu, kā arī digitālus rīkus, kas būvlaukuma datus pārvērš praktiskākā ieskatā. Virziens ir praktisks: mazāk atkārtotu manuālu ievadu, lielāka precizitāte un labāka projekta veiktspējas pārskatāmība.",
        ],
        source: "caterpillar",
      },
      {
        title: "Caterpillar autonomais blīvētājs un MI asistents",
        caption: "Cat CS12 autonomais grunts blīvētājs, prezentēts pirms CONEXPO 2026.",
        paragraphs: [
          "Caterpillar piesaistīja lielu uzmanību, demonstrējot CS12 grunts blīvētāju darbībā bez operatora kabīnē. Tas bija viens no skaidrākajiem piemēriem, ka būvniecības autonomija pāriet no koncepta demonstrācijām uz reālām mašīnu darba plūsmām.",
          "Uzņēmums izcēla arī Cat Command, kas ļauj vienam operatoram attālināti uzraudzīt vairākas mašīnas, un Cat AI Assistant servisa un atbalsta procesos, piemēram, detaļu meklēšanā, problēmu diagnostikā, rokasgrāmatās un tehnikas parka uzraudzībā.",
        ],
        source: "caterpillar",
      },
      {
        title: "WSP pieeja: mašīna pa vidu",
        paragraphs: [
          "Ne visi virsraksti bija par cilvēku aizstāšanu. WSP savos finanšu komentāros iebilda pret pārspīlētiem MI naratīviem un uzsvēra, ka inženierija joprojām ir cieši saistīta ar profesionālu spriedumu, atbildību un uzņēmuma uzkrāto ekspertīzi.",
          "Pieeja ar mašīnu pa vidu ir viens no lietderīgākajiem veidiem, kā domāt par MI būvniecībā: ļaut programmatūrai paātrināt analīzi un atskaites, bet atstāt cilvēkiem pārbaudi, validāciju un galīgos lēmumus.",
        ],
        source: "wsp",
      },
      {
        title: "Oracle MI platforma prognozējošai drošībai",
        caption: "Oracle Advisor for Safety interfeiss ar iknedēļas projekta risku prognozēm.",
        paragraphs: [
          "Oracle ieviesa Advisor for Safety kā prognozējošu slāni būvniecības drošības vadībai. Tā vietā, lai gaidītu incidentus un reaģētu pēc tam, platforma prognozē, kuros projektos statistiski biežāk var rasties drošības problēmas.",
          "Tā apvieno vēsturiskos drošības datus ar strukturētiem lauka novērojumiem un projekta ievaddatiem, padarot MI noderīgu vienā no svarīgākajām būvniecības jomām: prevencijā, nevis tikai dokumentēšanā.",
        ],
        source: "oracle",
      },
      {
        title: "Autodesk 200 miljonu likme uz fiziskās pasaules MI",
        caption: "Autodesk tehnoloģiju centrs kontekstā ar World Labs investīciju.",
        paragraphs: [
          "Autodesk 200 miljonu ASV dolāru ieguldījums World Labs parāda, kur virzās daļa lielāko būvniecības tehnoloģiju likmju: uz MI, kas saprot telpu, ģeometriju un fizisko 3D pasauli, nevis tikai tekstu.",
          "Būvniecībā tas ir svarīgi, jo fiziskās pasaules MI var atbalstīt projektēšanu, prefabrikāciju, progresa izsekošanu, inspekcijas, realitātes fiksēšanu un digitālos dvīņus. Galvenā doma ir tāda, ka labāka telpiskā domāšana radīs noderīgākus rīkus cilvēkiem, kas būvē reālas lietas.",
        ],
        source: "autodesk",
      },
    ],
    whyTitle: "Kāpēc šīs tendences ir svarīgas",
    trendCards: [
      {
        title: "Drošība un produktivitāte",
        text: "MI arvien biežāk izmanto, lai samazinātu incidentus, saīsinātu apmācības laiku un uzlabotu darbu objektā.",
      },
      {
        title: "Autonomija ar uzraudzību",
        text: "Autonomas mašīnas nonāk reālās būvlaukuma darba plūsmās, bet nopietni uzņēmumi joprojām saglabā cilvēku kontroli.",
      },
      {
        title: "Fiziskās pasaules MI",
        text: "Vairāk ieguldījumu nonāk MI, kas saprot būvēto vidi 3D formā, ne tikai dokumentus un čatu.",
      },
      {
        title: "Datu izmantošana",
        text: "Būvniecības uzņēmumi beidzot mēģina pārvērst neizmantotus projekta datus lēmumos, kas uzlabo drošību, izmaksu kontroli un piegādi.",
      },
    ],
    finalTitle: "Noslēguma domas",
    finalText:
      "Nedēļas skaidrākais secinājums ir tas, ka MI būvniecībā kļūst operacionālāks un mazāk abstrakts. Daudzsološākie rīki nav tie, kas mēģina aizstāt būvniekus, inženierus vai objektu komandas. Tie ir rīki, kas palīdz cilvēkiem strādāt drošāk, ātrāk un ar labāku informāciju.",
  },
};

type SourceKey = keyof typeof sources;

export default function AIConstructionWeeklyHighlightsArticle() {
  const locale = useLocale();
  const t = locale === "lv" ? copy.lv : copy.en;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href={`/${locale}/Landing/CaseStudies`}
        className="text-sm text-muted-foreground hover:underline"
      >
        {t.back}
      </Link>

      <section className="mt-4">
        <h1 className="mt-6 text-3xl font-semibold leading-tight md:text-4xl">
          {t.title}
        </h1>

        <p className="mt-3 text-lg text-muted-foreground">{t.intro}</p>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>{t.published}</span>
          <span>•</span>
          <span>{t.category}</span>
          <span>•</span>
          <span>{t.tags}</span>
        </div>
      </section>

      <div className="my-8 h-px bg-border" />

      <section className="rounded-2xl border bg-muted/30 p-6">
        <h2 className="text-xl font-semibold">{t.sourcesTitle}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {t.cards.map((card) => (
            <a
              key={card.key}
              href={sources[card.key as SourceKey]}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border bg-background p-4 transition hover:bg-muted"
            >
              <div className="font-medium">{card.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{card.text}</p>
            </a>
          ))}
        </div>
      </section>

      {t.sections.map((section) => (
        <section key={section.title} className="space-y-4">
          <div className="my-10 h-px bg-border" />
          <h2 className="text-2xl font-semibold">{section.title}</h2>
          {section.caption ? (
            <p className="text-sm text-muted-foreground">{section.caption}</p>
          ) : null}
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-base leading-7 text-foreground/90">
              {paragraph}
            </p>
          ))}
          <a
            href={sources[section.source as SourceKey]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-sm font-medium text-primary hover:underline"
          >
            {t.readSource}
          </a>
        </section>
      ))}

      <div className="my-10 h-px bg-border" />

      <section className="space-y-5">
        <h2 className="text-2xl font-semibold">{t.whyTitle}</h2>

        <div className="grid gap-4 md:grid-cols-2">
          {t.trendCards.map((card) => (
            <div key={card.title} className="rounded-2xl border bg-muted/20 p-5">
              <h3 className="text-lg font-medium">{card.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="my-10 h-px bg-border" />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t.finalTitle}</h2>
        <p className="text-base leading-7 text-foreground/90">{t.finalText}</p>
      </section>
    </main>
  );
}
