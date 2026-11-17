import type {
  DiaryReviewProposal,
  DiaryReviewSnapshot,
} from "@/flows/default-construction/lib/diary-review";

export function reviewPilotConfig() {
  return {
    otherSettings: {
      constructionDiaryReviewPilot: {
        enabled: true,
        allowedSenderPhones: ["37120000001"],
        allowedUserIds: ["user", "reviewer"],
      },
    },
  };
}

export function reviewSnapshot(): DiaryReviewSnapshot {
  return {
    siteId: "site",
    organizationId: "org",
    userId: "user",
    configHash: "config",
    documentId: "estimate",
    actualQuantityField: "Amounts",
    workOptions: ["Betonēšana"],
    guidance: "",
    examples: [],
    positions: [
      {
        id: "concrete",
        code: "1.1",
        name: "Pamatu betonēšana",
        categoryName: "Pamati",
        categoryCode: "1",
        kind: "work",
        parentId: null,
        sourceRow: 1,
        unit: "m3",
        plannedQuantity: 100,
        laborNormHoursPerUnit: null,
        hourlyRate: null,
        plannedWorkCost: 0,
        plannedMaterialCost: 0,
        plannedMechanismCost: 0,
        plannedTotalCost: 0,
      },
    ],
    records: [
      {
        id: "row",
        userId: "user",
        sourceText: "Betonēšana 12,5 m3, trīs strādnieki. Strādājām 4 stundas.",
        date: "2026-11-16T00:00:00.000Z",
        bisId: null,
        allocation: null,
        selectedPositionId: null,
        fields: {
          Works: "Betonēšana",
          Location: null,
          Comments: null,
          Units: "m3",
          Amounts: 99,
          Comments_Custom_1: null,
          WorkersInvolved: null,
          TimeInvolved: null,
        },
      },
    ],
  };
}

export function reviewProposal(): DiaryReviewProposal {
  return {
    summary: "Jālabo daudzums un jāpiesaista tāmes pozīcija.",
    records: [
      {
        recordId: "row",
        verdict: "changes",
        reason: "Avotā ir 12,5 m3.",
        issues: [],
        changes: [
          {
            field: "Amounts",
            value: 12.5,
            evidence: "Betonēšana 12,5 m3",
            reason: "Daudzums atbilstoši ziņai.",
          },
        ],
        assignment: {
          positionId: "concrete",
          evidence: "Betonēšana 12,5 m3",
          reason: "Atbilst betona darbam.",
        },
      },
    ],
  };
}
