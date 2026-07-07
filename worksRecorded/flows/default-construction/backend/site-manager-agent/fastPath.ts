import type { SiteDiaryConfirmationRecord } from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/siteDiaryToolContext";

export type SupportedReplyLanguage = "lv" | "en" | "ru";

export type SiteDiarySaveOutcome = {
  ok: boolean;
  count: number;
  message?: string;
  records?: SiteDiaryConfirmationRecord[];
};

export type FastPathCandidateDebug = {
  normalizedText: string;
  tooLong: boolean;
  bis: boolean;
  question: boolean;
  greeting: boolean;
  projectCommand: boolean;
  followUp: boolean;
  ambiguousReference: boolean;
  metaRequest: boolean;
  // activity: boolean;
  // detail: boolean;
  final: boolean;
};

const RECORD_LIMIT = 10;
const COMMENT_LIMIT = 300;

const RECORD_LABELS = {
  lv: { fallback: "Darbu ieraksts", date: "Datums", amount: "Apjoms", unit: "Mērvienība", workers: "Darbinieki", hours: "Stundas", more: "un vēl" },
  en: { fallback: "Work record", date: "Date", amount: "Amount", unit: "Unit", workers: "Workers", hours: "Hours", more: "and" },
  ru: { fallback: "Рабочая запись", date: "Дата", amount: "Объём", unit: "Единица", workers: "Работники", hours: "Часы", more: "и ещё" },
} as const;

function hasValue(value: unknown): value is string | number | Date {
  return value !== null && value !== undefined && value !== "";
}

function formatDiaryDate(value: unknown) {
  if (!hasValue(value)) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getUTCFullYear()}`;
}

function compactComment(value: string) {
  const comment = value.replace(/\s+/g, " ").trim();
  return comment.length <= COMMENT_LIMIT ? comment : `${comment.slice(0, COMMENT_LIMIT - 1).trimEnd()}…`;
}

export function formatSavedDiaryRecords(
  records: SiteDiaryConfirmationRecord[],
  language: SupportedReplyLanguage,
) {
  if (!records.length) return "";
  const labels = RECORD_LABELS[language];
  const visibleRecords = records.slice(0, RECORD_LIMIT);
  const multiple = records.length > 1;
  const blocks = visibleRecords.map((record) => {
    const titleParts = [record.Works, record.Location].filter(hasValue).map(String);
    const title = titleParts.join(" — ") || labels.fallback;
    const firstLine = multiple ? `• ${title}` : title;
    const lines = [firstLine];

    if (hasValue(record.Comments)) lines.push(`   ${compactComment(String(record.Comments))}`);

    const facts: string[] = [];
    const date = formatDiaryDate(record.Date);
    if (date) facts.push(`${labels.date}: ${date}`);
    if (hasValue(record.Amounts)) {
      facts.push(`${labels.amount}: ${record.Amounts}${hasValue(record.Units) ? ` ${record.Units}` : ""}`);
    } else if (hasValue(record.Units)) {
      facts.push(`${labels.unit}: ${record.Units}`);
    }
    if (hasValue(record.WorkersInvolved)) facts.push(`${labels.workers}: ${record.WorkersInvolved}`);
    if (hasValue(record.TimeInvolved)) facts.push(`${labels.hours}: ${record.TimeInvolved}`);
    if (facts.length) lines.push(`   ${facts.join(" · ")}`);
    return lines.join("\n");
  });

  if (records.length > RECORD_LIMIT) {
    const remaining = records.length - RECORD_LIMIT;
    blocks.push(language === "en" ? `${labels.more} ${remaining} more` : `${labels.more} ${remaining}`);
  }
  return blocks.join("\n\n");
}

const BIS_PATTERN = /(^|\W)bis($|\W)/iu;
const QUESTION_PATTERN = /\?|^(kā|kas|kur|kad|kāpēc|vai|how|what|where|when|why|can|could|do|does|is|are|как|что|где|когда|почему|можно|ли)\b/iu;
const GREETING_PATTERN = /^(sveiki|sveiks|labdien|čau|hello|hi|hey|привет|здравствуйте)[!.\s]*$/iu;
const PROJECT_COMMAND_PATTERN = /^(change|project|projekts)$/iu;
const FOLLOW_UP_PATTERN = /^(un\s+)?(arī\s+)?(to|tas|that|it)\b/iu;
const AMBIGUOUS_REFERENCE_PATTERN = /\b(to|tas|that|it)\b.*\b(tikko runāj|mēs runāj|iepriekš|previous|discuss|mentioned|rakstīj|wrote)\b/iu;
const META_REQUEST_PATTERN = /\b(ignore|ignorē|citam lietotājam|citā objektā|another user|other site|account|lietotāja kont)\b/iu;
const WORD_TAIL = String.raw`[\p{L}\p{N}_-]*`;
const WORD_BOUNDARY_START = String.raw`(?:^|[^\p{L}\p{N}_])`;
const WORD_BOUNDARY_END = String.raw`(?=$|[^\p{L}\p{N}_])`;
const ACTIVITY_SIGNAL_PATTERN = new RegExp(
  WORD_BOUNDARY_START +
  String.raw`(` +
  String.raw`tika|` +
  String.raw`pabeigt${WORD_TAIL}|uzstād${WORD_TAIL}|ieklā${WORD_TAIL}|apmest${WORD_TAIL}|mont${WORD_TAIL}|krāso${WORD_TAIL}|beton${WORD_TAIL}|mūr${WORD_TAIL}|demont${WORD_TAIL}|iztīr${WORD_TAIL}|` +
  String.raw`trub${WORD_TAIL}|kanaliz${WORD_TAIL}|radiator${WORD_TAIL}|paneļ${WORD_TAIL}|durv${WORD_TAIL}|sien${WORD_TAIL}|grīd${WORD_TAIL}|marg${WORD_TAIL}|` +
  String.raw`completed|installed|paint${WORD_TAIL}|plaster${WORD_TAIL}|lay(?:ing)?|clean${WORD_TAIL}|floor${WORD_TAIL}|wall${WORD_TAIL}|door${WORD_TAIL}|pipe${WORD_TAIL}|radiator${WORD_TAIL}|` +
  String.raw`монтаж${WORD_TAIL}|установ${WORD_TAIL}|покраш${WORD_TAIL}|очист${WORD_TAIL}|двер${WORD_TAIL}|стен${WORD_TAIL}` +
  String.raw`)` +
  WORD_BOUNDARY_END,
  "iu",
);
const DETAIL_SIGNAL_PATTERN = /\b(šodien|vakar|today|yesterday|сегодня|вчера|stund(?:a|as)?|hours?|час(?:а|ов)?|cilvēk(?:s|i)|strādniek(?:s|i)|workers?|people|рабоч(?:ий|их)|stāv(?:s|ā)?|floor|этаж|m2|m3|kg|tn|pcs)\b|\b\d{1,2}([./-]\d{1,2})?([./-]\d{2,4})?\b|\b\d+\s*h\b/iu;

export function getFastPathMode(): "off" | "shadow" | "on" {
  const value = process.env.WHATSAPP_SITE_MANAGER_FAST_PATH_MODE?.trim().toLowerCase();
  return value === "on" || value === "shadow" ? value : "off";
}

export function debugSiteDiaryFastPathCandidate(message: string): FastPathCandidateDebug {
  const text = message.trim();
  const tooLong = !text || text.length > 2_000;
  const bis = BIS_PATTERN.test(text);
  const question = QUESTION_PATTERN.test(text);
  const greeting = GREETING_PATTERN.test(text);
  const projectCommand = PROJECT_COMMAND_PATTERN.test(text);
  const followUp = FOLLOW_UP_PATTERN.test(text);
  const ambiguousReference = AMBIGUOUS_REFERENCE_PATTERN.test(text);
  const metaRequest = META_REQUEST_PATTERN.test(text);
  // const activity = ACTIVITY_SIGNAL_PATTERN.test(text);
  // const detail = DETAIL_SIGNAL_PATTERN.test(text);
  const final = !tooLong &&
    !bis &&
    !question &&
    !greeting &&
    !projectCommand &&
    !followUp &&
    !ambiguousReference &&
    !metaRequest
  // activity &&
  // detail;

  return {
    normalizedText: text,
    tooLong,
    bis,
    question,
    greeting,
    projectCommand,
    followUp,
    ambiguousReference,
    metaRequest,
    // activity,
    // detail,
    final,
  };
}

export function isSiteDiaryFastPathCandidate(message: string) {
  return debugSiteDiaryFastPathCandidate(message).final;
}

export function detectReplyLanguage(message: string): SupportedReplyLanguage {
  if (/[āčēģīķļņōŗšūž]/iu.test(message) || /\b(šodien|vakar|stāvā|darbi|cilvēki|stundas)\b/iu.test(message)) {
    return "lv";
  }
  if (/[а-яё]/iu.test(message)) return "ru";
  return "en";
}

export function formatDeterministicSaveReply(
  userName: string | null | undefined,
  language: SupportedReplyLanguage,
  outcome: SiteDiarySaveOutcome,
) {
  const name = userName?.trim();
  const prefix = name ? `${name}, ` : "";

  if (!outcome.ok) {
    const reason = outcome.message?.trim();
    if (language === "lv") return `${prefix}ierakstu neizdevās saglabāt${reason ? `: ${reason}` : "."}`;
    if (language === "ru") return `${prefix}не удалось сохранить запись${reason ? `: ${reason}` : "."}`;
    return `${prefix}the record could not be saved${reason ? `: ${reason}` : "."}`;
  }

  const count = Math.max(1, outcome.count);
  let confirmation: string;
  if (language === "lv") {
    confirmation = `${prefix}WorksRecorded saglabāj${count === 1 ? "u 1 darbu ierakstu" : `u ${count} darbu ierakstus`}.`;
  } else if (language === "ru") {
    confirmation = `${prefix}в WorksRecorded сохранено ${count} ${count === 1 ? "рабочее сообщение" : "рабочих сообщения"}.`;
  } else {
    confirmation = `${prefix}saved ${count} work ${count === 1 ? "record" : "records"} in WorksRecorded.`;
  }

  const formattedRecords = formatSavedDiaryRecords(outcome.records ?? [], language);
  return formattedRecords ? `${confirmation}\n\n${formattedRecords}` : confirmation;
}

export function parseSaveToolOutcome(content: string): SiteDiarySaveOutcome {
  const failed = content.match(/^Failed to save site diary entry\. Reason:\s*(.*)$/i);
  if (failed) return { ok: false, count: 0, message: failed[1] || "Unknown error" };
  const saved = content.match(/^Saved\s+(\d+)\s+site diary record\(s\) successfully\./i);
  if (saved) return { ok: true, count: Number(saved[1]) || 1 };
  return { ok: false, count: 0, message: "Unexpected save result" };
}

export function isSaveOnlyToolRound(toolNames: string[]) {
  return toolNames.length === 1 && toolNames[0] === "save_to_database";
}
