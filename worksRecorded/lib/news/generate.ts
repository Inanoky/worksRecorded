import OpenAI from "openai";
import type { NewsSourceItem } from "@/lib/news/rss";
import {
  WORKSRECORDED_LANDING_LINK_TOKEN,
  WORKSRECORDED_PROMOTION_PARAGRAPH,
  ensureWorksRecordedPromotion,
} from "@/lib/news/worksRecordedPromotion";

export type GeneratedNewsArticle = {
  headline: string;
  summary: string;
  fullArticle: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  tags: string[];
  imageUrl: string;
  sourceTitle: string;
  sourceUrl: string;
  sourcePublisher: string;
};

function fallbackKeywords(item: NewsSourceItem) {
  return [
    "AI rīki",
    "AI būvniecībā",
    "būvniecības tehnoloģijas",
    "būvniecības automatizācija",
    "digitālā būvniecība",
    "WorksRecorded",
    item.source,
  ];
}

function fallbackArticle(item: NewsSourceItem, imageUrl: string): GeneratedNewsArticle {
  const cleanedSnippet = (item.snippet || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const summary = `${item.source} publicējis jaunu tēmu par AI rīkiem un būvniecības tehnoloģijām: ${item.title}`.slice(
    0,
    300
  );

  const tags = ["AI rīki", "AI būvniecībā", "Būvniecības tehnoloģijas", "Automatizācija"];
  const seoKeywords = fallbackKeywords(item);

  return {
    headline: `AI būvniecībā: ${item.title}`.slice(0, 95),
    summary,
    fullArticle: [
      `## Īsā versija`,
      `${item.source} aktualizē tēmu par AI rīkiem būvniecībā: **${item.title}**.`,
      `> Ja šī tendence turpināsies, AI rīki kļūs par ikdienas darba sistēmas daļu objektu komandām, nevis tikai par izmēģinājuma projektu birojā.`,
      `## Kāpēc tas ir svarīgi reālos projektos`,
      cleanedSnippet
        ? `Avota aprakstā uzsvērts: ${cleanedSnippet.slice(0, 360)}. Tas parāda, ka AI būvniecībā arvien biežāk tiek vērtēts pēc praktiska ieguvuma — labākas koordinācijas, skaidrākas dokumentācijas un ātrākiem lēmumiem objektā.`
        : "Šī tēma parāda, ka AI būvniecībā pāriet no demonstrācijas risinājumiem uz praktiskiem ieguvumiem koordinācijā, izmaksu kontrolē un atskaitēs.",
      `## Kam sekot tālāk`,
      `- Cik ātri risinājumu pieņems apakšuzņēmēji un objektu vadītāji`,
      `- Cik dziļi tas integrēsies grafikos, dokumentu apritē un atskaitēs`,
      `- Vai komandas spēs izmērīt mazāk kavējumu, mazāk pārdarbu un ātrākus lēmumus`,
      `## Redaktora piezīme no būvlaukuma`,
      `Ja ikdienā vadi projektus, šai tēmai ir vērts sekot jau tagad. Būvniecības tehnoloģiju ieguvēji parasti ir komandas, kas praktiskus rīkus ievieš agri un pēc tam mācās ātrāk nekā konkurenti.`,
      WORKSRECORDED_PROMOTION_PARAGRAPH,
    ].join("\n\n"),
    seoTitle: `${item.title} | AI rīki un AI būvniecībā`,
    seoDescription: summary,
    seoKeywords,
    tags,
    imageUrl,
    sourceTitle: item.title,
    sourceUrl: item.link,
    sourcePublisher: item.source,
  };
}

export async function generateNewsArticleFromTopic(item: NewsSourceItem, imageUrl: string) {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackArticle(item, imageUrl);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await client.chat.completions.create({
    model: "gpt-5.1",
    temperature: 0.75,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Tu esi ass būvniecības tehnoloģiju komentētājs ar praktisku, cilvēcīgu balsi. Raksti latviešu valodā, apvieno biznesa žurnālistiku ar stāstījuma dinamiku un paliec faktos.",
      },
      {
        role: "user",
        content: `Izmantojot šo vienu avota ierakstu, sagatavo JSON ar atslēgām: headline, summary, fullArticle, seoTitle, seoDescription, seoKeywords, tags.

Obligātās prasības:
- Viss publiskais saturs jāveido latviešu valodā; zīmolu nosaukumus, produktu nosaukumus un citējamus avota terminus drīkst atstāt oriģinālvalodā.
- Fokusējies tieši uz AI rīkiem un AI būvniecībā.
- Apgalvojumiem jābūt faktoloģiskiem un skaidri balstītiem avotā.
- headline ne garāks par 95 rakstzīmēm.
- summary 190-300 rakstzīmes, saistošs un skaidrs.
- fullArticle jābūt markdown stilā, saistošam, 500-800 vārdiem, ar šādu struktūru latviešu valodā:
  1) '## Īsā versija' (spēcīgs ievads)
  2) viena citāta rinda ar markdown blockquote sintaksi (> ...)
  3) '## Kāpēc tas ir svarīgi reālos projektos'
  4) '## Kam sekot tālāk' ar 3-5 punktiem, izmantojot '- '
  5) '## Redaktora piezīme no būvlaukuma' ar īsu personisku skatījumu pirmajā personā.
- Izmanto žurnālistikas/stāstījuma tehnikas: kontrastu, konkrētus piemērus un spriedzi par nākotnes attīstību.
- Dabiski iekļauj SEO terminus latviešu valodā: 'AI rīki', 'AI būvniecībā', 'būvniecības tehnoloģijas', 'automatizācija'.
- Organiski iekļauj vienu noderīgu teikumu vai īsu rindkopu par WorksRecorded biznesu, sasaistot WorksRecorded ar markdown tieši šādi: [WorksRecorded](${WORKSRECORDED_LANDING_LINK_TOKEN}).
- WorksRecorded saiti pozicionē kā praktisku nākamo soli būvniecības komandām, kurām vajag skaidrākus būvdarbu žurnālus, darba laika uzskaiti, dokumentus, rēķinus un projektu atskaites.
- seoKeywords jābūt 8-14 virknēm, pārsvarā latviešu valodā.
- tags jābūt 4-8 īsām latviešu valodas virknēm.

Input: ${JSON.stringify({
          title: item.title,
          source: item.source,
          publishedAt: item.publishedAt,
          link: item.link,
          snippet: item.snippet,
        })}`,
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    return fallbackArticle(item, imageUrl);
  }

  const parsed = JSON.parse(rawContent) as Partial<GeneratedNewsArticle>;
  const fallback = fallbackArticle(item, imageUrl);

  return {
    headline: parsed.headline || fallback.headline,
    summary: parsed.summary || fallback.summary,
    fullArticle: ensureWorksRecordedPromotion(parsed.fullArticle || fallback.fullArticle),
    seoTitle: parsed.seoTitle || fallback.seoTitle,
    seoDescription: parsed.seoDescription || fallback.seoDescription,
    seoKeywords: parsed.seoKeywords?.filter(Boolean).slice(0, 14) || fallback.seoKeywords,
    tags: parsed.tags?.filter(Boolean).slice(0, 8) || fallback.tags,
    imageUrl,
    sourceTitle: item.title,
    sourceUrl: item.link,
    sourcePublisher: item.source,
  };
}
