export type WarehouseForma2Sort = "forma2Position_asc" | "forma2Position_desc";

type WarehouseForma2SortableRow = {
  id: string;
  forma2PositionId?: string | null;
};

type WarehouseForma2Position = {
  id: string;
  code?: string | null;
  categoryName?: string | null;
  name?: string | null;
};

export function getWarehouseForma2PositionLabel(position: WarehouseForma2Position) {
  return [position.code, position.categoryName, position.name]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" · ");
}

export function sortWarehouseRowsByForma2Position<Row extends WarehouseForma2SortableRow>(
  rows: Row[],
  positions: WarehouseForma2Position[],
  sortBy: WarehouseForma2Sort,
) {
  const labelsById = new Map(
    positions.map((position) => [
      position.id,
      getWarehouseForma2PositionLabel(position).toLocaleLowerCase("lv"),
    ]),
  );
  const direction = sortBy === "forma2Position_asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const aLabel = a.forma2PositionId ? labelsById.get(a.forma2PositionId) : undefined;
    const bLabel = b.forma2PositionId ? labelsById.get(b.forma2PositionId) : undefined;

    if (!aLabel && !bLabel) return a.id.localeCompare(b.id);
    if (!aLabel) return 1;
    if (!bLabel) return -1;

    return direction * aLabel.localeCompare(bLabel, "lv") || a.id.localeCompare(b.id);
  });
}
