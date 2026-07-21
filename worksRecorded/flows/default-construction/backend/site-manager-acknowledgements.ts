export type SiteManagerAcknowledgementLanguage = "en" | "lv";

export const siteManagerProcessingAcknowledgements = {
  en: [
    "🔁 Message received. Processing it now, please wait...",
    "✉️ Thanks, I received your message. I’ll process it now.",
    "👍 Message received. I’ll reply shortly.",
    "📩 Your message has been received. Preparing a response.",
    "🟡 Processing your message.",
  ],
  lv: [
    "🔁 Ziņa saņemta. Apstrādāju, lūdzu uzgaidiet...",
    "✉️ Paldies, ziņu saņēmu. Tūlīt apstrādāšu.",
    "👍 Saņēmu ziņu, drīz atbildēšu.",
    "📩 Ziņa ir saņemta. Gatavoju atbildi.",
    "🟡 Apstrādāju jūsu ziņu.",
  ],
} as const;

const shuffledAcknowledgements: Record<
  SiteManagerAcknowledgementLanguage,
  string[]
> = {
  en: [],
  lv: [],
};
const lastAcknowledgement: Record<
  SiteManagerAcknowledgementLanguage,
  string | null
> = {
  en: null,
  lv: null,
};

function normalizeAcknowledgementLanguage(
  language: string | null | undefined,
): SiteManagerAcknowledgementLanguage {
  return language === "lv" ? "lv" : "en";
}

function shuffledCopy(values: readonly string[]) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function getRandomSiteManagerProcessingAcknowledgement(
  language?: string | null,
) {
  const normalizedLanguage = normalizeAcknowledgementLanguage(language);
  const messages = siteManagerProcessingAcknowledgements[normalizedLanguage];
  const shuffled = shuffledAcknowledgements[normalizedLanguage];

  if (shuffled.length === 0) {
    shuffledAcknowledgements[normalizedLanguage] = shuffledCopy(messages);
    const nextShuffle = shuffledAcknowledgements[normalizedLanguage];

    if (
      lastAcknowledgement[normalizedLanguage] &&
      nextShuffle.length > 1 &&
      nextShuffle[0] === lastAcknowledgement[normalizedLanguage]
    ) {
      [nextShuffle[0], nextShuffle[1]] = [nextShuffle[1], nextShuffle[0]];
    }
  }

  const next =
    shuffledAcknowledgements[normalizedLanguage].shift() ?? messages[0];
  lastAcknowledgement[normalizedLanguage] = next;
  return next;
}

export function getSiteManagerPhotoSavingAcknowledgement(
  language?: string | null,
) {
  return normalizeAcknowledgementLanguage(language) === "lv"
    ? "📷 Foto saņemts. Saglabāju attēlus, lūdzu uzgaidiet..."
    : "📷 Photo received. Saving pictures, please wait...";
}

export function getSiteManagerPhotoSaveSummary(
  savedCount: number,
  totalCount: number,
  language?: string | null,
) {
  return normalizeAcknowledgementLanguage(language) === "lv"
    ? `✅ Saglabāti ${savedCount}/${totalCount} attēli.`
    : `✅ ${savedCount}/${totalCount} pictures saved.`;
}
