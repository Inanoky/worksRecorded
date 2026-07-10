export const siteManagerProcessingAcknowledgements = [
  "🔁 Ziņa saņemta. Apstrādāju, lūdzu uzgaidiet...",
  "✉️ Paldies, ziņu saņēmu. Tūlīt apstrādāšu.",
  "👍 Saņēmu ziņu, drīz atbildēšu.",
  "📩 Ziņa ir saņemta. Gatavoju atbildi.",
  "🟡 Apstrādāju jūsu ziņu.",
] as const;

let shuffledAcknowledgements: string[] = [];
let lastAcknowledgement: string | null = null;

function shuffledCopy(values: readonly string[]) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function getRandomSiteManagerProcessingAcknowledgement() {
  if (shuffledAcknowledgements.length === 0) {
    shuffledAcknowledgements = shuffledCopy(siteManagerProcessingAcknowledgements);

    if (
      lastAcknowledgement &&
      shuffledAcknowledgements.length > 1 &&
      shuffledAcknowledgements[0] === lastAcknowledgement
    ) {
      [shuffledAcknowledgements[0], shuffledAcknowledgements[1]] = [
        shuffledAcknowledgements[1],
        shuffledAcknowledgements[0],
      ];
    }
  }

  const next =
    shuffledAcknowledgements.shift() ?? siteManagerProcessingAcknowledgements[0];
  lastAcknowledgement = next;
  return next;
}
