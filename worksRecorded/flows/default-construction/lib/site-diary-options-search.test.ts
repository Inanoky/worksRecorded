import { matchesPersistedWorkSearch } from "./site-diary-options-search";

describe("default-construction options search", () => {
  it("keeps an existing work visible by its saved name while its draft is edited", () => {
    const draft = {
      savedWork: "Blue GKFI",
      work: "Red GKFI",
    };

    expect(matchesPersistedWorkSearch(draft, "blue")).toBe(true);
    expect(matchesPersistedWorkSearch(draft, "red")).toBe(false);
  });

  it("searches the draft name for a new unsaved work", () => {
    expect(
      matchesPersistedWorkSearch(
        { savedWork: "", work: "Montāža - sienas" },
        "montāža",
      ),
    ).toBe(true);
  });
});
