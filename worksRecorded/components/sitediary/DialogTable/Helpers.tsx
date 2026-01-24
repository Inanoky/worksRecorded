// Helpers.tsx
import { toast } from "sonner";
import { z } from "zod";

export const MAX_FREE_TEXT = 100;
export const MAX_NUM = 1_000_000_000;

export const normalizeKey = (k: string) => (k ?? "").trim();

export function mapToSelectItems(map?: Record<string, string>) {
  if (!map) return [];
  return Object.entries(map).map(([value, label]) => ({ value, label }));
}

export const coerceOptionalFloat = (v: unknown) => {
  if (v === "" || v === undefined || v === null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : undefined;
};

export const coerceOptionalInt = (v: unknown) => {
  if (v === "" || v === undefined || v === null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : undefined;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
};

export const isUUID = (id: unknown) =>
  typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export const showZodErrorToast = (err: z.ZodError) => {
  const first = err.errors[0];
  const path = first?.path?.length ? first.path.join(".") : "row";
  toast.error(`${path}: ${first.message}`);
};

export function formatDateCell(d: any) {
  if (!d) return "No date";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return String(d);
  }
}

type FieldType = "fixed" | "dropdown" | "noRender" | "textInput" | "float" | "timePicker" | "datePicker";
type MapField = {
  Type: FieldType;
  DisplayName: string;
  DropDownOptions?: Record<string, string>;
  customSettings?: Record<string, any>;
};
type DefaultMap = Record<string, MapField>;

export function buildVisibleFields(map: DefaultMap) {
  return Object.entries(map)
    .map(([k, def]) => ({ key: normalizeKey(k), def }))
    .filter((x) => x.def?.Type !== "noRender");
}
