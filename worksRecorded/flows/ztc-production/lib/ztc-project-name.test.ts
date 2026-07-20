import {
  normalizeZtcProjectName,
  resolveZtcCanonicalProjectName,
} from "@/flows/ztc-production/lib/ztc-project-name";

describe("normalizeZtcProjectName", () => {
  it("lowercases incoming project names", () => {
    expect(normalizeZtcProjectName("Zemgales Prospekts 11 (ZP)")).toBe(
      "zemgales prospekts 11 (zp)",
    );
  });

  it("normalizes whitespace around parentheses", () => {
    expect(normalizeZtcProjectName("Zemgales Prospekts 11( ZP )")).toBe(
      "zemgales prospekts 11 (zp)",
    );
  });

  it("replaces every comma with a dot", () => {
    expect(normalizeZtcProjectName("Rīga, centrs, 2 (RC)")).toBe(
      "rīga. centrs. 2 (rc)",
    );
  });
});

describe("resolveZtcCanonicalProjectName", () => {
  it("uses a manually created rate project as the canonical name", () => {
    expect(
      resolveZtcCanonicalProjectName({
        extractedProjectName: "dzīka auto nojume (rd)",
        manualProjectNames: ["dz. ēka. auto nojume (rd)"],
        existingProjectNames: ["dzīka auto nojume (rd)"],
      }),
    ).toEqual({
      projectName: "dz. ēka. auto nojume (rd)",
      source: "manual",
    });
  });

  it("uses the earliest matching extracted project when no manual project matches", () => {
    expect(
      resolveZtcCanonicalProjectName({
        extractedProjectName: "dzīka auto nojume (rd)",
        existingProjectNames: ["dz. ēka. auto nojume (rd)"],
      }),
    ).toEqual({
      projectName: "dz. ēka. auto nojume (rd)",
      source: "existing",
    });
  });

  it("matches punctuation variants without creating a new project", () => {
    expect(
      resolveZtcCanonicalProjectName({
        extractedProjectName: "dz ēka auto nojume (rd)",
        existingProjectNames: ["dz. ēka. auto nojume (rd)"],
      }),
    ).toEqual({
      projectName: "dz. ēka. auto nojume (rd)",
      source: "existing",
    });
  });

  it("uses the normalized first extraction when no project matches", () => {
    expect(
      resolveZtcCanonicalProjectName({
        extractedProjectName: "Jaunais Projekts (JP)",
      }),
    ).toEqual({
      projectName: "jaunais projekts (jp)",
      source: "new",
    });
  });

  it("does not merge project names with different numbers", () => {
    expect(
      resolveZtcCanonicalProjectName({
        extractedProjectName: "Zemgales prospekts 12 (zp)",
        existingProjectNames: ["zemgales prospekts 11 (zp)"],
      }),
    ).toEqual({
      projectName: "zemgales prospekts 12 (zp)",
      source: "new",
    });
  });

  it("does not merge project names with different project codes", () => {
    expect(
      resolveZtcCanonicalProjectName({
        extractedProjectName: "Noliktavas jaunbūve (nb)",
        existingProjectNames: ["noliktavas jaunbūve (na)"],
      }),
    ).toEqual({
      projectName: "noliktavas jaunbūve (nb)",
      source: "new",
    });
  });

  it("does not choose between equally similar projects", () => {
    expect(
      resolveZtcCanonicalProjectName({
        extractedProjectName: "noliktavas korpuss",
        existingProjectNames: ["noliktavas korpuss a", "noliktavas korpuss b"],
      }),
    ).toEqual({
      projectName: "noliktavas korpuss",
      source: "new",
    });
  });
});
