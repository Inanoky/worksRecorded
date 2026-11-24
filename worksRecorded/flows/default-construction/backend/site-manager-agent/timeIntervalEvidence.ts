import { normalizeLatvianNumberEvidence } from "./spokenNumberEvidence";

const clockInflections: Record<string, string> = {
  vieniem: "viens",
  diviem: "divi",
  trijiem: "trīs",
  trim: "trīs",
  četriem: "četri",
  pieciem: "pieci",
  sešiem: "seši",
  septiņiem: "septiņi",
  astoņiem: "astoņi",
  deviņiem: "deviņi",
  desmitiem: "desmit",
  vienpadsmitiem: "vienpadsmit",
  divpadsmitiem: "divpadsmit",
  trīspadsmitiem: "trīspadsmit",
  četrpadsmitiem: "četrpadsmit",
  piecpadsmitiem: "piecpadsmit",
  sešpadsmitiem: "sešpadsmit",
  septiņpadsmitiem: "septiņpadsmit",
  astoņpadsmitiem: "astoņpadsmit",
  deviņpadsmitiem: "deviņpadsmit",
  divdesmitiem: "divdesmit",
};
const clockWords = new RegExp(
  String.raw`(?<![\p{L}\p{N}_])(?:${Object.keys(clockInflections).join("|")})(?![\p{L}\p{N}_])`,
  "giu",
);
const clockLabel = String.raw`(?:pulksten(?:is)?|plkst\.?)`;
const clockSeparator = "(?:[-–—]|līdz|to)";
const endpointBoundary = String.raw`(?![\p{L}\p{N}_]|[.:]\s*\d)`;

function clockEndpoint(prefix: string) {
  return String.raw`(?:(?<${prefix}Label>${clockLabel})\s*)?(?<${prefix}Hours>\d{1,2})(?:\s*(?<${prefix}Separator>[.:])\s*(?<${prefix}Minutes>\d{2}))?`;
}

const clockInterval = new RegExp(
  String.raw`(?<![\p{L}\p{N}_.:])${clockEndpoint("start")}\s*${clockSeparator}\s*${clockEndpoint("end")}${endpointBoundary}`,
  "giu",
);
const timestamp = String.raw`\d{1,2}\s*[.:]\s*\d{2}`;
const referencedClockTime = new RegExp(
  String.raw`(?<![\p{L}\p{N}_.:])(?:${clockLabel}\s*\d{1,2}(?:\s*[.:]\s*\d{2})?|(?:no|līdz)\s*${timestamp}|${timestamp}(?=\s*${clockSeparator}))${endpointBoundary}`,
  "giu",
);

export function readClockIntervalEvidence(source: string) {
  const normalized = normalizeLatvianNumberEvidence(
    source.replace(
      clockWords,
      (word) => clockInflections[word.toLocaleLowerCase("lv")],
    ),
  );
  const intervalHours: number[] = [];
  let durationSource = "";
  let cursor = 0;
  for (const match of normalized.matchAll(clockInterval)) {
    const parts = match.groups ?? {};
    if (
      !parts.startLabel &&
      !parts.endLabel &&
      !(parts.startSeparator === ":" && parts.endSeparator === ":")
    )
      continue;
    durationSource += `${normalized.slice(cursor, match.index)} `;
    cursor = match.index + match[0].length;
    const startHour = Number(parts.startHours);
    const endHour = Number(parts.endHours);
    const startMinute = Number(parts.startMinutes ?? 0);
    const endMinute = Number(parts.endMinutes ?? 0);
    if (startHour > 23 || endHour > 23 || startMinute > 59 || endMinute > 59)
      continue;
    const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    if (minutes > 0)
      intervalHours.push(Math.round((minutes / 60) * 10000) / 10000);
  }
  durationSource += normalized.slice(cursor);
  return {
    intervalHours,
    durationSource: durationSource.replace(referencedClockTime, " "),
  };
}
