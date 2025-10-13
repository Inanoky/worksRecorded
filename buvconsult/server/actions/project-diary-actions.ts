// app/actions/saveProjectDiaryRecord.ts
"use server";

import {requireUser} from "@/app/utils/requireUser";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/utils/db";

type Params = {
  userId: string;
  siteId: string;
  date: Date;
  record?: string | null;
};

export async function saveProjectDiaryRecord({
  userId,
  siteId,
  date,
  record = null,
}: Params) {
  try {
    if (!userId || !siteId || !date) {
      return "something went wrong";
    }

    await prisma.projectdiaryrecord.create({
      data: {
        userId,
        siteId,
        Date: date,
        Record: record,
      },
    });

    return "successfully saved to database";
  } catch (err) {
    console.error("❌ Error saving ProjectDiaryRecord:", err);
    return "something went wrong";
  }
}

// app/actions/ProjectDiaryActions.ts


export async function GetRecordsFromDB(siteId: string) {
  const user = await requireUser();

  const raw = await prisma.projectdiaryrecord.findMany({
    where: { userId: user.id, siteId },
    select: {
      id: true,
      siteId: true,
      Date: true,
      Record: true,
      Site: { select: { name: true } },
      User: { select: { firstName: true, lastName: true } },
    },
    orderBy: { Date: "desc" }, // latest first
  });

  const total = raw.length;

  return raw.map((row, idx) => {
    let formattedDate = "";
    if (row.Date) {
      const d = new Date(row.Date);
      const datePart = d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
      const timePart = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
      formattedDate = `Date: ${datePart} Time: ${timePart}`;
    }

    return {
      id: row.id,                              // keep real PK for actions (hidden in UI)
      displayId: total - idx,                  // 👈 1..N where N is latest
      date: formattedDate,
      record: row.Record ?? "",
      Project: row.Site?.name ?? "",
      User: [row.User?.firstName, row.User?.lastName].filter(Boolean).join(" "),
    };
  });
}

//Generic Action

type AnyDelegate = {
  findUnique(args: any): Promise<any>;
  update(args: any): Promise<any>;
  delete(args: any): Promise<any>;
};

// Accepts lowercase model names (e.g. "projectdiaryrecord"),
// PascalCase ("ProjectDiaryRecord"), or simple plurals ("projectdiaryrecords").
function resolveDelegateAndModel(input: string) {
  const raw = String(input || "").trim();
  if (!raw) throw new Error("Missing table name");

  const prismaAny = prisma as unknown as Record<string, AnyDelegate>;
  const lower = raw.toLowerCase();

  // 1) exact delegate key
  if (prismaAny[raw]) {
    const m = Prisma.dmmf.datamodel.models.find(
      (mm) =>
        mm.name.toLowerCase() === raw.toLowerCase() ||
        (mm.name[0].toLowerCase() + mm.name.slice(1)) === raw
    );
    if (!m) throw new Error(`Could not map delegate "${raw}" to a Prisma model`);
    return { delegateKey: raw, modelName: m.name };
  }

  // 2) simple singular
  const singular = lower.endsWith("s") ? lower.slice(0, -1) : lower;
  if (prismaAny[singular]) {
    const m = Prisma.dmmf.datamodel.models.find(
      (mm) =>
        mm.name.toLowerCase() === singular ||
        (mm.name[0].toLowerCase() + mm.name.slice(1)) === singular
    );
    if (!m) throw new Error(`Could not map delegate "${singular}" to a Prisma model`);
    return { delegateKey: singular, modelName: m.name };
  }

  // 3) direct model name
  const byModel = Prisma.dmmf.datamodel.models.find(
    (mm) => mm.name.toLowerCase() === lower
  );
  if (byModel) {
    const delegateKey =
      byModel.name === byModel.name.toLowerCase()
        ? byModel.name
        : byModel.name[0].toLowerCase() + byModel.name.slice(1);
    if (!prismaAny[delegateKey]) {
      throw new Error(`Prisma delegate "${delegateKey}" not found for model "${byModel.name}"`);
    }
    return { delegateKey, modelName: byModel.name };
  }

  throw new Error(`Unknown table/model "${input}"`);
}

function castByType(type: string, val: any, nullable: boolean) {
  if ((val === "" || val === undefined) && nullable) return null;
  switch (type) {
    case "Int":
    case "BigInt":
    case "Float":
    case "Decimal":
      return val === null ? null : Number(val);
    case "Boolean":
      if (typeof val === "boolean") return val;
      if (val === null) return null;
      return String(val).toLowerCase() === "true";
    case "DateTime":
      return val ? new Date(val) : null;
    case "Json":
      if (typeof val === "string") { try { return JSON.parse(val); } catch { return val; } }
      return val;
    default:
      return val;
  }
}

export async function genericTableAction(formData: FormData) {
  try {
    const op = String(formData.get("op") || "");
    const table = String(formData.get("table") || "");
    const id = String(formData.get("id") || "");
    const siteId = String(formData.get("siteId") || "");
    const changesRaw = formData.get("changes");
    const clientEditableRaw = formData.get("clientEditable");

    // === DEBUG: incoming
    console.log("[GTA] payload", { op, table, id, siteId });

    if (!op || !table || !id || !siteId) return { ok: false, error: "Missing op/table/id/siteId" };
    if (op !== "edit" && op !== "delete") return { ok: false, error: `Invalid op "${op}"` };

    // resolve delegate + model
    const { delegateKey, modelName } = resolveDelegateAndModel(table);
    const delegate = (prisma as unknown as Record<string, AnyDelegate>)[delegateKey];

    // === DEBUG: what prisma exposes and what DMMF has
    const availableDelegates = Object.keys(prisma).filter(
      (k) => typeof (prisma as any)[k]?.findUnique === "function"
    );
    const allModels = Prisma.dmmf.datamodel.models.map((m) => m.name);
    console.log("[GTA] resolved", { delegateKey, modelName });
    console.log("[GTA] delegates", availableDelegates);
    console.log("[GTA] models", allModels);

    const model =
      Prisma.dmmf.datamodel.models.find((m) => m.name.toLowerCase() === modelName.toLowerCase()) ||
      Prisma.dmmf.datamodel.models.find((m) => m.name.toLowerCase() === table.toLowerCase());

    if (!model) {
      console.error("[GTA] model not found", { modelName, table });
      return { ok: false, error: `Model resolution failed for "${table}"` };
    }

    const scalarFields = model.fields?.filter?.((f: any) => f.kind === "scalar") ?? [];
    // === DEBUG: fields
    console.log("[GTA] scalarFields", scalarFields.map((f: any) => `${f.name}:${f.type}`));

    // read + scope
    const row = await delegate.findUnique({ where: { id } });
    console.log("[GTA] found row?", !!row);
    if (!row) return { ok: false, error: "Not found" };
    if (row.siteId !== siteId) return { ok: false, error: "Not allowed (siteId mismatch)" };

    if (op === "delete") {
      await delegate.delete({ where: { id } });
      return { ok: true, action: "delete", id };
    }

    // EDIT
    const deny = new Set<string>(["id", "createdAt", "updatedAt", "siteId"]);
    const serverEditable = scalarFields.map((f: any) => f.name).filter((n: string) => !deny.has(n));

    let clientEditable: string[] = [];
    try { clientEditable = clientEditableRaw ? JSON.parse(String(clientEditableRaw)) : []; } catch {}
    const allowed = clientEditable.length ? clientEditable.filter((n) => serverEditable.includes(n)) : serverEditable;

    let changes: Record<string, any> = {};
    try { changes = changesRaw ? JSON.parse(String(changesRaw)) : {}; } catch {}

    const data: Record<string, any> = {};
    for (const key of allowed) {
      if (!(key in changes)) continue;
      const f = scalarFields.find((sf: any) => sf.name === key);
      if (!f) continue;
      data[key] = castByType(f.type, changes[key], !f.isRequired);
    }

    console.log("[GTA] update data", data);
    if (!Object.keys(data).length) return { ok: false, error: "No permitted changes" };

    const updated = await delegate.update({ where: { id }, data });
    return { ok: true, action: "edit", id, data: updated };
  } catch (e: any) {
    console.error("[genericTableAction] error:", e);
    return { ok: false, error: e?.message ?? "Action failed" };
  }
}