import { normalizeWarehouseSourcePhoto } from "@/lib/bis/warehouse-source-photo-group";

describe("warehouse source photo groups", () => {
  it("normalizes a source photo URL", () => {
    expect(normalizeWarehouseSourcePhoto(" https://example.com/invoice.jpg ")).toBe(
      "https://example.com/invoice.jpg",
    );
  });

  it("does not create a group without a source photo", () => {
    expect(normalizeWarehouseSourcePhoto(null)).toBeNull();
    expect(normalizeWarehouseSourcePhoto("   ")).toBeNull();
  });
});
