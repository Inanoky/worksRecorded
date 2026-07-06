import type { SiteDiaryConfirmationRecord } from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/siteDiaryToolContext";

export type SupportedReplyLanguage = "lv" | "en" | "ru";

export type SiteDiarySaveOutcome = {
  ok: boolean;
  count: number;
  message?: string;
  records?: SiteDiaryConfirmationRecord[];
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
  const blocks = visibleRecords.map((record, index) => {
    const titleParts = [record.Works, record.Location].filter(hasValue).map(String);
    const title = titleParts.join(" — ") || labels.fallback;
    const firstLine = multiple ? `${index + 1}. ${title}` : title;
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
const REPORT_SIGNAL_PATTERN = /\b(šodien|vakar|tika|pabeigts|pabeigta|uzstādīts|uzstādīta|darbi|stund(?:a|as)|cilvēk(?:s|i)|strādniek(?:s|i)|today|yesterday|completed|installed|worked|hours?|workers?|сегодня|вчера|выполнен[а-я]*|установлен[а-я]*|час(?:а|ов)?|рабоч(?:ий|их))\b|\b\d{1,2}([./-]\d{1,2})?([./-]\d{2,4})?\b/iu;

export function getFastPathMode(): "off" | "shadow" | "on" {
  const value = process.env.WHATSAPP_SITE_MANAGER_FAST_PATH_MODE?.trim().toLowerCase();
  return value === "on" || value === "shadow" ? value : "off";
}

export function isSiteDiaryFastPathCandidate(message: string) {
  const text = message.trim();
  if (!text || text.length > 2_000) return false;
  if (BIS_PATTERN.test(text)) return false;
  if (QUESTION_PATTERN.test(text)) return false;
  if (GREETING_PATTERN.test(text)) return false;
  if (PROJECT_COMMAND_PATTERN.test(text)) return false;
  return REPORT_SIGNAL_PATTERN.test(text);
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
