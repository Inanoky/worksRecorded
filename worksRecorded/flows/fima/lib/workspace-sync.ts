import type { getFimaWorkspace } from "../backend/actions";

export type FimaWorkspaceData = Awaited<ReturnType<typeof getFimaWorkspace>>;
export type FimaWorkspaceVersions = {
  revision: string;
  records: Record<string, string>;
  sites: string;
  templates: string;
  operations: string;
};
export type FimaWorkspaceSnapshot = FimaWorkspaceData & {
  scope: string;
  cache: FimaWorkspaceVersions;
};
export type FimaWorkspaceDelta = {
  scope: string;
  cache: FimaWorkspaceVersions;
  records: FimaWorkspaceData["records"];
  order: string[];
  truncated: boolean;
  bisBase: string;
  sites?: FimaWorkspaceData["sites"];
  templates?: FimaWorkspaceData["templates"];
  operations?: FimaWorkspaceData["operations"];
};
export function mergeFimaWorkspace(
  current: FimaWorkspaceSnapshot | null,
  delta: FimaWorkspaceDelta,
): FimaWorkspaceSnapshot {
  if (current && current.scope !== delta.scope)
    throw new Error("FIMA cache scope changed");
  const records = new Map(current?.records.map((r) => [r.id, r]));
  for (const record of delta.records) records.set(record.id, record);
  const ordered = delta.order.map((id) => {
    const record = records.get(id);
    if (!record) throw new Error("FIMA cache is incomplete");
    return record;
  });
  if (!current && (!delta.sites || !delta.templates || !delta.operations))
    throw new Error("FIMA cache bootstrap is incomplete");
  return {
    ...current,
    ...delta,
    records: ordered,
    sites: delta.sites ?? current!.sites,
    templates: delta.templates ?? current!.templates,
    operations: delta.operations ?? current!.operations,
  };
}
