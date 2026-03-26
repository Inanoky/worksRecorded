import { cn } from "@/lib/utils/utils";

describe("cn", () => {
  it("merges classes and drops falsy values", () => {
    const result = cn("px-2", false && "hidden", undefined, "py-2");
    expect(result).toContain("px-2");
    expect(result).toContain("py-2");
  });

  it("resolves conflicting tailwind classes with last value winning", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
