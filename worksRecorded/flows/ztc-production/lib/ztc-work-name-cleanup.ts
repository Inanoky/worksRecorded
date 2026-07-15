const ZTC_WORK_NAME_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bGipškartona\b/gi, "Ģipškartona"],
  [/\bGipskartona\b/gi, "Ģipškartona"],
  [/\bkarkass\b/gi, "karkas"],
  [/\bmineralvates\b/gi, "minerālvates"],
  [/\bsiltumizolacija\b/gi, "siltumizolācija"],
];

function splitZtcWorkCode(value: string) {
  const match = value.match(/^(\s*(?:L\d\/B\d|R\d\/T\d|TL|L0)\s*-\s*)(.*)$/i);
  if (!match) return null;
  return {
    prefix: match[1],
    description: match[2],
  };
}

export function cleanZtcWorkName(value: string | null | undefined) {
  const workName = String(value ?? "").trim().replace(/,/g, ".");
  if (!workName) return "";

  const parts = splitZtcWorkCode(workName);
  const applyReplacements = (text: string) =>
    ZTC_WORK_NAME_REPLACEMENTS.reduce(
      (result, [pattern, replacement]) => result.replace(pattern, replacement),
      text,
    );

  if (!parts) return applyReplacements(workName);

  return `${parts.prefix}${applyReplacements(parts.description)}`.trim();
}
