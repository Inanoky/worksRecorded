export type BisCaseOption = {
  id: string;
  label: string;
  caseNumber: string | null;
  constructionName: string | null;
  stageName: string | null;
};

export function formatBisCaseLabel(input: {
  caseNumber?: string | null;
  constructionName?: string | null;
  stageName?: string | null;
}) {
  return [input.caseNumber, input.constructionName, input.stageName].filter(Boolean).join(" • ") || "Unnamed BIS case";
}

export function normalizeBisCase(data: any): BisCaseOption {
  return {
    id: String(data?.id ?? ""),
    caseNumber: data?.attributes?.case_number ?? data?.attributes?.bis_case_number ?? null,
    constructionName: data?.attributes?.construction_name ?? data?.attributes?.bis_case_name ?? null,
    stageName: data?.attributes?.stage_name ?? null,
    label: formatBisCaseLabel({
      caseNumber: data?.attributes?.case_number ?? data?.attributes?.bis_case_number,
      constructionName: data?.attributes?.construction_name ?? data?.attributes?.bis_case_name,
      stageName: data?.attributes?.stage_name,
    }),
  };
}
