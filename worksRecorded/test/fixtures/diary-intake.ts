import type {
  DiaryIntakeContext,
  DiaryIntakeDraft,
} from "@/flows/default-construction/lib/diary-intake";
import { reviewSnapshot } from "./diary-review";

export function intakeContext(): DiaryIntakeContext {
  return {
    ...reviewSnapshot(),
    records: [],
    sourceText: "Pamati betonēti 12,5 m3. Trīs strādnieki strādāja 4 stundas.",
    receivedDate: "2026-11-16",
    contextHash: "context",
    workOptions: ["Betonēšana", "Piezīmes"],
    workPositions: { Betonēšana: "concrete" },
    extractionContext: "",
  };
}
export function intakeDraft(): DiaryIntakeDraft {
  return {
    intent: "save",
    reply: "Pamatu betonēšana: 12,5 m3.",
    records: [
      {
        work: "Betonēšana",
        positionId: "concrete",
        sourceQuote: intakeContext().sourceText,
        date: "2026-11-16",
        dateEvidence: null,
        location: null,
        comment: "Pamatu betonēšana.",
        unit: "m3",
        quantity: { value: 12.5, evidence: "betonēti 12,5 m3" },
        workers: { value: 3, evidence: "Trīs strādnieki" },
        hours: { value: 4, evidence: "4 stundas" },
      },
    ],
  };
}
