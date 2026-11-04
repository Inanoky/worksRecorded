type GuideSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type ProgressGuide = {
  title: string;
  seoTitle: string;
  description: string;
  label: string;
  intro: string;
  answer: string;
  contents: string;
  sections: GuideSection[];
  example: {
    title: string;
    intro: string;
    headers: string[];
    rows: string[][];
    conclusion: string;
    caution: string;
  };
  checklistTitle: string;
  checklist: string[];
  sampleTitle: string;
  sample: string;
  faqTitle: string;
  faqs: { question: string; answer: string }[];
  productTitle: string;
  productDescription: string;
  links: { path: string; label: string }[];
  cta: string;
  back: string;
};

export const guideSlug = "how-to-track-construction-site-progress";
export const guidePath = `/Landing/CaseStudies/${guideSlug}`;

export const progressGuide: Record<"en" | "lv", ProgressGuide> = {
  en: {
    title: "How to track construction site progress and control labour costs",
    seoTitle: "How to Track Construction Site Progress | WorksRecorded",
    description:
      "A practical guide to construction work management: track completed quantities, compare labour hours with the budget, and turn daily site reports into action.",
    label: "Construction management guide",
    intro:
      "A busy site is not necessarily a project on budget. A crew can work a full week while completing less than the estimate allowed for. To see the difference, a project manager needs to know what was built, how many hours it took, and what is preventing the next task from starting.",
    answer:
      "To track construction site progress, divide the project into measurable work packages, record completed quantities and labour hours daily, and compare actual output with both the programme and the labour budget. Review blockers and agree the next action while the information is still useful.",
    contents: "In this guide",
    sections: [
      {
        id: "measurable-progress",
        title: "1. Define progress in quantities, not impressions",
        paragraphs: [
          "Start with a work package that a supervisor can recognise on site: foundation reinforcement in zone A, wall formwork on level two, or roof installation on the west elevation. Give it a planned quantity, a unit, a labour allowance and a target completion date. Keep the same names in the estimate, programme and daily records.",
          "Agree what counts as complete. Installed roof area may count only after the required inspection; reinforcement placed may be a separate activity from concrete poured. Recording those stages separately prevents the same work from being counted twice.",
          "For a single activity, physical progress is completed quantity divided by planned quantity. If 80 m² of a 200 m² work package is complete, progress is 40%. Compare that with the quantity planned for the same date to assess the schedule. Do not add square metres, tonnes and cubic metres together to calculate overall project progress; use agreed weights or track each package separately.",
        ],
      },
      {
        id: "daily-records",
        title: "2. Capture labour hours and completed work together",
        paragraphs: [
          "A timesheet tells you how long people worked. A progress record tells you what they completed. Labour cost control needs both, linked to the same activity, location and reporting period. Four people working eight hours each is 32 person-hours, not eight hours.",
          "Split hours when a crew moves between activities. Record waiting time and rework separately so they remain visible in the total cost without distorting the explanation of productive output. Note whether quantities are measured or provisional, and confirm provisional figures before using them for a cost forecast.",
          "Photos support the record, but a photo alone does not establish a quantity or the hours spent. A useful site update gives a location, the activity, completed units, the people and hours involved, and any issue that affected the work.",
        ],
      },
      {
        id: "work-management",
        title: "3. Make work management a daily decision process",
        paragraphs: [
          "Construction work management means turning site information into decisions about people, materials and the next available work front. Collecting reports is only the first step. Each unresolved issue needs an owner, a next action and a date for that action.",
          "Review new blockers daily and compare quantities, hours and the remaining programme weekly. If the crew is waiting for drawings, the response may be to secure an answer or move to another work front. If output is low because access is restricted, sending more workers may increase cost without increasing progress.",
          "Record scope changes separately from the original allowance. Capture what changed, who requested it, the affected quantity and the likely impact on time and cost. Follow the project's agreed approval and notification process rather than allowing additional work to disappear into the original budget.",
        ],
        bullets: [
          "What was planned, and what is actually complete?",
          "Which activities used more hours per unit than allowed?",
          "What is blocking the next task, and who will resolve it?",
          "Which changes need a client decision or an updated forecast?",
        ],
      },
      {
        id: "labour-cost-control",
        title: "4. Use labour cost control to spot overruns early",
        paragraphs: [
          "Comparing labour spend with the entire project budget can hide a problem. A project may have spent only half its labour allowance but completed much less than half the work. Compare actual hours with the hours budgeted for the quantity actually completed.",
          "Budget hours per unit = budget labour hours ÷ planned quantity. Actual hours per unit = actual labour hours ÷ completed quantity. Lower hours per unit means less labour time for the same output, provided the scope and quality are comparable.",
          "For a cost comparison, use a consistent labour cost basis. If the budget includes employer costs, overtime or other labour-related costs, include the equivalent costs in actuals. With different worker rates, calculate actual cost from each worker's hours and applicable rate instead of assuming a single wage.",
        ],
      },
      {
        id: "forecast",
        title: "5. Forecast the remaining work, then investigate the cause",
        paragraphs: [
          "A simple labour forecast is actual cost to date plus estimated hours for the remaining quantity multiplied by the expected labour cost per hour. Use recent productivity only when the remaining work is comparable. Different access, crew experience, task complexity or working conditions may justify a different assumption.",
          "Treat an adverse variance as a question to investigate. Check missing quantities, incorrectly allocated hours, rework, waiting time and scope changes before concluding that the crew is underperforming. Keep the original budget visible and record the assumptions behind each revised forecast.",
          "Labour is one part of the project cost. Materials, subcontractors, plant and overheads need their own records before this becomes a forecast of the whole project's margin.",
        ],
      },
    ],
    example: {
      title:
        "Worked example: progress looks healthy, but labour is overrunning",
      intro:
        "Illustrative figures, not customer results. A contractor budgets 100 person-hours for 200 m² of one defined activity at a labour cost of €20 per hour. So far, the crew has completed 80 m² in 48 person-hours.",
      headers: ["Measure", "Calculation", "Result"],
      rows: [
        ["Physical progress", "80 ÷ 200", "40%"],
        ["Budget hours per m²", "100 ÷ 200", "0.50 h/m²"],
        ["Actual hours per m²", "48 ÷ 80", "0.60 h/m²"],
        ["Budget cost for completed work", "80 × 0.50 × €20", "€800"],
        ["Actual labour cost", "48 × €20", "€960"],
        ["Cost above allowance so far", "€960 − €800", "€160"],
        ["Forecast total labour hours", "48 + (120 × 0.60)", "120 h"],
        ["Forecast total labour cost", "120 × €20", "€2,400"],
      ],
      conclusion:
        "The crew has used 20% more hours per m² than budgeted. If that rate continues, labour will finish €400 above the original €2,000 allowance. That is a reason to investigate now, while 120 m² remains, rather than discover the overrun at completion.",
      caution:
        "This forecast assumes the same scope, productivity and hourly cost for the remaining work. It is not a prediction of total project cost or profit.",
    },
    checklistTitle: "A daily construction progress report checklist",
    checklist: [
      "Project, date, location and work package.",
      "Today's completed quantity and unit, plus the cumulative total without double-counting.",
      "Workers involved and person-hours allocated to the activity.",
      "Waiting time, rework and additional work recorded separately.",
      "Relevant photos or documents and any quantity still awaiting verification.",
      "Blocker or variation, responsible person, next action and target date.",
    ],
    sampleTitle: "Example of a useful site update",
    sample:
      "Zone A, wall formwork: 24 m² completed today. Three people worked eight hours each: 24 person-hours, including three person-hours waiting for the crane. The 24 m² is today's addition, not the cumulative total. Photo attached. Tomorrow's pour needs confirmation from the site manager by 15:00 today.",
    faqTitle: "Frequently asked questions",
    faqs: [
      {
        question: "Can I track construction site progress in a spreadsheet?",
        answer:
          "Yes. Start with one row per activity, location and day, recording quantities, hours and issues. Keep planned quantities and labour allowances in a reference sheet. A spreadsheet becomes harder to maintain when updates arrive from several sites through calls, messages and photos; the challenge is collecting and checking the information consistently.",
      },
      {
        question:
          "What is the difference between progress tracking and time tracking?",
        answer:
          "Time tracking records labour input. Progress tracking records completed output. You need both to understand whether labour is producing the quantity allowed for in the estimate.",
      },
      {
        question: "Does AI replace the project manager?",
        answer:
          "No. AI can help organise site updates and prepare data for analysis. A project manager still checks ambiguous records, confirms quantities, explains deviations and decides what to do next.",
      },
    ],
    productTitle: "Spend less time assembling the information",
    productDescription:
      "WorksRecorded helps project managers collect and analyse site data. Teams can send WhatsApp messages, voice notes and photos that support structured site records, time tracking and project analysis. The aim is to reduce the work of assembling information so managers can spend more time reviewing progress and acting on problems. Review AI-processed records before relying on them for cost decisions.",
    links: [
      { path: "SiteDiary", label: "Site diary and daily reporting" },
      { path: "Timesheets", label: "Construction time tracking" },
      { path: "Analytics", label: "Project progress and cost analysis" },
    ],
    cta: "See how WorksRecorded fits your site reporting",
    back: "All case studies and guides",
  },
  lv: {
    title: "Kā sekot būvdarbu progresam un kontrolēt darbaspēka izmaksas",
    seoTitle: "Kā sekot būvdarbu progresam | WorksRecorded",
    description:
      "Praktisks ceļvedis būvdarbu vadībā: paveikto apjomu uzskaite, darba stundu salīdzinājums ar tāmi un darbaspēka izmaksu kontrole objektā.",
    label: "Būvdarbu vadības ceļvedis",
    intro:
      "Rosība objektā vēl nenozīmē, ka darbi iekļaujas budžetā. Brigāde var nostrādāt pilnu nedēļu, bet paveikt mazāk, nekā paredzēts tāmē. Lai to pamanītu, projekta vadītājam jāzina, kas ir izbūvēts, cik darba stundu tam patērēts un kas traucē sākt nākamo darbu.",
    answer:
      "Lai sekotu būvdarbu progresam, sadaliet projektu izmērāmos darbu posmos, katru dienu reģistrējiet paveiktos apjomus un patērētās cilvēkstundas, pēc tam salīdziniet rezultātu ar darbu grafiku un darbaspēka budžetu. Pārskatiet šķēršļus un vienojieties par turpmāko rīcību, kamēr šī informācija vēl palīdz pieņemt lēmumus.",
    contents: "Šajā ceļvedī",
    sections: [
      {
        id: "measurable-progress",
        title: "1. Vērtējiet progresu pēc apjomiem, nevis iespaida",
        paragraphs: [
          "Sāciet ar objektā skaidri atpazīstamu darbu: pamatu stiegrošanu A zonā, sienu veidņošanu otrajā stāvā vai jumta seguma ieklāšanu rietumu pusē. Katram darbam nosakiet plānoto apjomu, mērvienību, darba stundu budžetu un izpildes termiņu. Tāmē, darbu grafikā un ikdienas ierakstos izmantojiet vienādus nosaukumus.",
          "Vienojieties, kad darbu uzskatīsiet par pabeigtu. Piemēram, ieklāto jumta segumu var ieskaitīt tikai pēc paredzētās pārbaudes; uzstādītu stiegrojumu uzskaita atsevišķi no iebetonētā apjoma. Skaidri nodalīti posmi palīdz izvairīties no viena un tā paša darba dubultas uzskaites.",
          "Viena darba izpildes procentu aprēķina, paveikto apjomu dalot ar plānoto. Ja no 200 m² ir pabeigti 80 m², izpilde ir 40%. Lai novērtētu grafika ievērošanu, salīdziniet to ar apjomu, kas bija jāizpilda līdz attiecīgajam datumam. Nesummējiet kvadrātmetrus, tonnas un kubikmetrus vienā projekta izpildes rādītājā: izmantojiet iepriekš noteiktus svarus vai vērtējiet katru darbu atsevišķi.",
        ],
      },
      {
        id: "daily-records",
        title: "2. Uzskaitiet darba stundas kopā ar paveikto apjomu",
        paragraphs: [
          "Darba laika uzskaite parāda, cik ilgi cilvēki strādāja. Izpildes uzskaite parāda, ko viņi paveica. Darbaspēka izmaksu kontrolei vajadzīgi abi dati par vienu un to pašu darbu, vietu un periodu. Četri cilvēki, kas katrs strādājuši astoņas stundas, kopā ir patērējuši 32 cilvēkstundas, nevis astoņas.",
          "Ja brigāde dienas laikā veic vairākus darbus, sadaliet stundas pa šiem darbiem. Dīkstāvi un pārtaisīšanu uzskaitiet atsevišķi, saglabājot tās kopējās izmaksās. Norādiet, vai apjoms ir izmērīts vai pagaidām aptuvens, un pirms izmaksu prognozes pārbaudiet aptuvenos datus.",
          "Fotogrāfija papildina ierakstu, taču pati par sevi neapstiprina ne apjomu, ne patērētās stundas. Noderīgā objekta ziņā ir norādīta vieta, darba veids, paveiktais apjoms, iesaistītie cilvēki, nostrādātās stundas un apstākļi, kas ietekmēja izpildi.",
        ],
      },
      {
        id: "work-management",
        title: "3. Pārvērtiet būvdarbu vadību konkrētā ikdienas rīcībā",
        paragraphs: [
          "Darbu organizēšana objektā nozīmē izmantot saņemto informāciju, lai lemtu par cilvēkiem, materiāliem un nākamo pieejamo darba fronti. Atskaišu savākšana ir tikai sākums. Katrai neatrisinātai problēmai vajadzīgs atbildīgais, nākamā darbība un tās termiņš.",
          "Jaunos šķēršļus pārskatiet katru dienu, bet apjomus, stundas un atlikušo darbu grafiku salīdziniet vismaz iknedēļas pārskatā. Ja brigāde gaida rasējumus, jāpanāk atbilde vai jāpārceļ cilvēki uz citu darba fronti. Ja izpildi ierobežo piekļuve, papildu strādnieki var palielināt izmaksas, nepalielinot paveikto apjomu.",
          "Papilddarbus nodaliet no sākotnējā budžeta. Pierakstiet, kas mainījies, kurš izmaiņu pieprasījis, kādu apjomu tā skar un kā tā var ietekmēt termiņu un izmaksas. Ievērojiet projektā noteikto saskaņošanas un paziņošanas kārtību, lai papilddarbi nepazustu sākotnējās tāmes izmaksās.",
        ],
        bullets: [
          "Kas bija plānots, un kas faktiski ir pabeigts?",
          "Kuriem darbiem patērēts vairāk stundu uz vienību, nekā paredzēts?",
          "Kas traucē sākt nākamo darbu, un kurš šo šķērsli novērsīs?",
          "Kurām izmaiņām vajadzīgs pasūtītāja lēmums vai precizēta prognoze?",
        ],
      },
      {
        id: "labour-cost-control",
        title:
          "4. Kontrolējiet darbaspēka izmaksas, salīdzinot vienādus apjomus",
        paragraphs: [
          "Tikai kopējo izdevumu salīdzināšana ar visu projekta budžetu var noslēpt problēmu. Var būt iztērēta puse darbaspēka budžeta, lai gan paveikta krietni mazāk nekā puse darba. Salīdziniet faktiski patērētās stundas ar stundām, kas tāmē paredzētas tieši paveiktajam apjomam.",
          "Plānotās stundas uz vienību = budžetā paredzētās darba stundas ÷ plānotais apjoms. Faktiskās stundas uz vienību = patērētās darba stundas ÷ paveiktais apjoms. Mazāk stundu uz vienību nozīmē mazāku darba laika patēriņu vienādam rezultātam, ja darba saturs un kvalitāte ir salīdzināmi.",
          "Izmaksu salīdzinājumam izmantojiet vienādu aprēķina bāzi. Ja budžetā iekļautas darba devēja izmaksas, virsstundas vai citas ar darbaspēku saistītas izmaksas, iekļaujiet atbilstošās izmaksas arī faktiskajos datos. Ja darbinieku likmes atšķiras, faktiskās izmaksas aprēķiniet pēc katra darbinieka stundām un attiecīgās likmes.",
        ],
      },
      {
        id: "forecast",
        title:
          "5. Prognozējiet atlikušās izmaksas un noskaidrojiet noviržu cēloņus",
        paragraphs: [
          "Vienkārša darbaspēka izmaksu prognoze ir faktiskās izmaksas līdz šim plus atlikušajam apjomam nepieciešamās stundas, reizinātas ar sagaidāmajām stundas izmaksām. Līdzšinējo ražīgumu izmantojiet tikai tad, ja atlikušais darbs ir salīdzināms. Atšķirīga piekļuve, brigādes pieredze, darba sarežģītība vai apstākļi var prasīt citu pieņēmumu.",
          "Budžeta pārsniegums ir iemesls pārbaudei. Pirms secināt, ka brigāde strādā neefektīvi, pārbaudiet neuzskaitītos apjomus, nepareizi attiecinātās stundas, pārtaisīšanu, dīkstāvi un izmaiņas darba apjomā. Saglabājiet sākotnējo budžetu salīdzināšanai un pierakstiet katras jaunās prognozes pieņēmumus.",
          "Darbaspēks ir tikai daļa no projekta izmaksām. Lai prognozētu visa projekta peļņu, atsevišķi jāuzskaita arī materiāli, apakšuzņēmēji, tehnika un pieskaitāmās izmaksas.",
        ],
      },
    ],
    example: {
      title:
        "Aprēķina piemērs: darbi virzās, bet stundu patēriņš pārsniedz budžetu",
      intro:
        "Ilustratīvs piemērs, nevis klienta rezultāti. Uzņēmums vienam noteiktam darbam plāno 200 m² apjomu un 100 cilvēkstundas ar darbaspēka izmaksām 20 € stundā. Līdz šim brigāde paveikusi 80 m², patērējot 48 cilvēkstundas.",
      headers: ["Rādītājs", "Aprēķins", "Rezultāts"],
      rows: [
        ["Apjoma izpilde", "80 ÷ 200", "40%"],
        ["Plānotās stundas uz m²", "100 ÷ 200", "0,50 h/m²"],
        ["Faktiskās stundas uz m²", "48 ÷ 80", "0,60 h/m²"],
        ["Paveiktā apjoma budžeta izmaksas", "80 × 0,50 × 20 €", "800 €"],
        ["Faktiskās darbaspēka izmaksas", "48 × 20 €", "960 €"],
        ["Pārsniegums līdz šim", "960 € − 800 €", "160 €"],
        ["Prognozētais kopējais stundu patēriņš", "48 + (120 × 0,60)", "120 h"],
        ["Prognozētās kopējās darbaspēka izmaksas", "120 × 20 €", "2400 €"],
      ],
      conclusion:
        "Brigāde patērējusi par 20% vairāk stundu uz m², nekā plānots. Ja šāds stundu patēriņš saglabāsies, darbaspēka izmaksas pārsniegs sākotnējo 2000 € budžetu par 400 €. Cēloni ir vērts noskaidrot tagad, kad vēl atlikuši 120 m², nevis tikai pēc darbu pabeigšanas.",
      caution:
        "Prognozē pieņemts, ka atlikušajiem darbiem nemainās saturs, ražīgums un stundas izmaksas. Tā nav visa projekta izmaksu vai peļņas prognoze.",
    },
    checklistTitle: "Ko iekļaut ikdienas būvdarbu atskaitē",
    checklist: [
      "Objekts, datums, konkrētā vieta un darba veids.",
      "Šodien paveiktais apjoms un mērvienība, kā arī kopējā izpilde bez dubultas uzskaites.",
      "Iesaistītie darbinieki un darbam patērētās cilvēkstundas.",
      "Atsevišķi norādīta dīkstāve, pārtaisīšana un papilddarbi.",
      "Attiecīgās fotogrāfijas vai dokumenti un vēl nepārbaudītie apjomi.",
      "Šķērslis vai izmaiņa, atbildīgais, nākamā darbība un termiņš.",
    ],
    sampleTitle: "Noderīgas objekta ziņas piemērs",
    sample:
      "A zona, sienu veidņošana: šodien pabeigti 24 m². Trīs cilvēki strādāja katrs astoņas stundas: kopā 24 cilvēkstundas, tostarp trīs cilvēkstundas, gaidot celtni. 24 m² ir šodienas papildinājums, nevis kopējā izpilde. Foto pievienots. Objekta vadītājam līdz šodienas plkst. 15.00 jāapstiprina rītdienas betonēšana.",
    faqTitle: "Biežāk uzdotie jautājumi",
    faqs: [
      {
        question: "Vai būvdarbu progresam var sekot Excel tabulā?",
        answer:
          "Jā. Veidojiet atsevišķu rindu katram darbam, vietai un dienai, norādot apjomus, stundas un problēmas. Plānotos apjomus un darba stundu budžetu glabājiet atsauces tabulā. Uzturēt šādu uzskaiti kļūst grūtāk, kad dati no vairākiem objektiem pienāk zvanos, ziņās un fotogrāfijās: izaicinājums ir tos regulāri savākt un pārbaudīt.",
      },
      {
        question: "Ar ko progresa uzskaite atšķiras no darba laika uzskaites?",
        answer:
          "Darba laika uzskaite parāda ieguldītās stundas, savukārt progresa uzskaite — paveikto apjomu. Abi rādītāji kopā ļauj saprast, vai darbs tiek paveikts ar tāmē paredzēto stundu patēriņu.",
      },
      {
        question: "Vai mākslīgais intelekts aizstāj projekta vadītāju?",
        answer:
          "Nē. Mākslīgais intelekts var palīdzēt sakārtot objekta ziņas un sagatavot datus analīzei. Projekta vadītājs joprojām pārbauda neskaidros ierakstus, apstiprina apjomus, noskaidro noviržu cēloņus un pieņem lēmumus.",
      },
    ],
    productTitle: "Mazāk laika informācijas apkopošanai",
    productDescription:
      "WorksRecorded palīdz projektu vadītājiem savākt un analizēt objekta datus. Komanda var sūtīt WhatsApp teksta un balss ziņas, kā arī fotogrāfijas, ko izmanto strukturētiem objekta ierakstiem, darba laika uzskaitei un projekta analīzei. Mērķis ir samazināt informācijas apkopošanai vajadzīgo darbu, lai vadītājs varētu vairāk pievērsties progresam un problēmu risināšanai. Pirms izmaksu lēmumu pieņemšanas pārbaudiet mākslīgā intelekta apstrādātos ierakstus.",
    links: [
      { path: "SiteDiary", label: "Būvdarbu žurnāls un ikdienas atskaites" },
      { path: "Timesheets", label: "Darba laika uzskaite būvniecībā" },
      { path: "Analytics", label: "Projekta progresa un izmaksu analīze" },
    ],
    cta: "Apskatiet, kā WorksRecorded palīdz objekta uzskaitē",
    back: "Visi pieredzes stāsti un ceļveži",
  },
};
