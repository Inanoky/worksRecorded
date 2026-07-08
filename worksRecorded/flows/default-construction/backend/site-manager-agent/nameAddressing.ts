export type AddressLanguage = "lv" | "en" | "ru";

// If you need to change how AI speaks to users first name, override full name here with vocative
export const vocativeOverrides: Readonly<Record<string, string>> = Object.freeze({
  Deivids: "Deivid",
  Jānis: "Jāni",
  Mārtiņš: "Mārtiņ",
  Kārlis: "Kārli",
  Pēteris: "Pēteri",
  Edgars: "Edgar",
  Aivars: "Aivar",
  Roberts: "Robert",
  Rihards: "Rihard",
  Kaspars: "Kaspar",
  Ivars: "Ivar",
  Māris: "Māri",
  Uldis: "Uldi",
  Valdis: "Valdi",
  Sandis: "Sandi",
  Markus: "Marku",
});

export function toLatvianVocative(firstName: string) {
  const name = firstName.trim();
  if (!name) return name;

  const exact = vocativeOverrides[name];
  if (exact) return exact;

  // These Latvian masculine endings have predictable vocative forms. Other
  // endings, including women's names, stay unchanged unless explicitly listed.
  if (/is$/iu.test(name)) return `${name.slice(0, -2)}i`;
  if (/us$/iu.test(name)) return name.slice(0, -1);
  return name;
}

export function getUserAddressName(
  firstName: string | null | undefined,
  language: AddressLanguage,
) {
  const normalized = firstName?.trim();
  if (!normalized) return null;
  return language === "lv" ? toLatvianVocative(normalized) : normalized;
}

export function shouldSampleUserAddress(messageId: string | null | undefined) {
  if (!messageId) return false;

  let hash = 2166136261;
  for (let index = 0; index < messageId.length; index += 1) {
    hash ^= messageId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % 3 === 0;
}
