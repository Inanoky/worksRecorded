import {
  findZtcDefaultRateForTask,
  type ZtcDefaultTaskRate,
  type ZtcRateCategory,
} from "@/flows/ztc-production/lib/ztc-rate-matching";

const ZTC_RATE_OPTION_UNIT_LABELS: Record<string, string> = {
  m2: "m²",
  m3: "m³",
  gab: "gab.",
  kg: "kg",
  "t.m.": "t.m.",
  tn: "t",
  st: "st.",
};

export function formatZtcRateOptionLabel(
  task: string,
  rate: ZtcDefaultTaskRate,
) {
  const formattedRate = String(rate.rate ?? "")
    .trim()
    .replace(".", ",");
  if (!formattedRate) return task;

  const unit = ZTC_RATE_OPTION_UNIT_LABELS[rate.unit] ?? rate.unit;
  return `${task} [${formattedRate} €/${unit}]`;
}

export function buildZtcRateSelectOption(args: {
  task: string;
  rates: ZtcDefaultTaskRate[];
  category: ZtcRateCategory;
}) {
  const match = findZtcDefaultRateForTask(args.task, args.rates, {
    category: args.category,
  });

  return {
    value: args.task,
    label: match ? formatZtcRateOptionLabel(args.task, match.entry) : args.task,
  };
}
