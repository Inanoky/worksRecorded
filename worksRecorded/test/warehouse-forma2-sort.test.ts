import {
  getWarehouseForma2PositionLabel,
  sortWarehouseRowsByForma2Position,
} from "@/lib/bis/warehouse-forma2-sort";

const positions = [
  { id: "position-b", code: "2", categoryName: "Betons", name: "Pamati" },
  { id: "position-a", code: "1", categoryName: "Apdare", name: "Sienas" },
];

const rows = [
  { id: "row-unassigned", forma2PositionId: null },
  { id: "row-b", forma2PositionId: "position-b" },
  { id: "row-a", forma2PositionId: "position-a" },
];

describe("warehouse Forma 2 sorting", () => {
  it("formats a readable position label", () => {
    expect(getWarehouseForma2PositionLabel(positions[0])).toBe("2 · Betons · Pamati");
  });

  it("sorts positions ascending while keeping unassigned rows last", () => {
    expect(sortWarehouseRowsByForma2Position(rows, positions, "forma2Position_asc").map((row) => row.id))
      .toEqual(["row-a", "row-b", "row-unassigned"]);
  });

  it("sorts positions descending while keeping unassigned rows last", () => {
    expect(sortWarehouseRowsByForma2Position(rows, positions, "forma2Position_desc").map((row) => row.id))
      .toEqual(["row-b", "row-a", "row-unassigned"]);
  });
});
