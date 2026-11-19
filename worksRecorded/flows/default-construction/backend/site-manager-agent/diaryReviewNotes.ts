export const DIARY_REVIEW_NOTE_LABEL = "Jāpārbauda.";
export const DIARY_PARTIAL_REVIEW_MESSAGE =
	"Daļa darbu saglabāta piezīmēs. Lūdzu, pārbaudiet.";

export const DIARY_REVIEW_NOTE_POLICY = `Pārskatāmas dienasgrāmatas piezīmes Comments satur tikai attiecīgās darbības lietotāja faktus vai avota fragmentu un īsu norādi “${DIARY_REVIEW_NOTE_LABEL}”. Neliec komentārā checker pamatojumu, repairInstructions, labojamo lauku vai rindu sarakstus, aģenta darba uzdevumu vai tehniskas kļūdas. Detalizēto pārbaudes pamatojumu raksti tikai reason, rowReviews un repairInstructions; šie lauki ir iekšējai pārbaudei. Piezīme saglabā ziņoto informāciju, pat ja tās kategorija vai daļa skaitļu nav droši nosakāma.`;

export function buildDiaryReviewComment(source: string) {
	return `${DIARY_REVIEW_NOTE_LABEL}\n${source.trim()}`;
}
