export const WORKSRECORDED_LANDING_LINK_TOKEN = "{{WORKSRECORDED_LANDING_URL}}";

const PROMOTION_MARKERS = [
  "WorksRecorded palīdz būvniecības uzņēmumiem",
  "WorksRecorded helps construction businesses",
];

export const WORKSRECORDED_PROMOTION_PARAGRAPH = `Būvniecības vadītājiem, kuri vērtē AI rīkus ikdienas darbu sakārtošanai, [WorksRecorded](${WORKSRECORDED_LANDING_LINK_TOKEN}) palīdz būvniecības uzņēmumiem pārvērst būvdarbu žurnālus, darba laika uzskaiti, dokumentus, rēķinus un projektu atskaites skaidrākos ierakstos un ātrākos lēmumos.`;

export function ensureWorksRecordedPromotion(content: string) {
  const trimmedContent = content.trim();

  if (
    trimmedContent.includes(WORKSRECORDED_LANDING_LINK_TOKEN) ||
    PROMOTION_MARKERS.some((marker) => trimmedContent.includes(marker))
  ) {
    return trimmedContent;
  }

  return [trimmedContent, WORKSRECORDED_PROMOTION_PARAGRAPH].filter(Boolean).join("\n\n");
}
