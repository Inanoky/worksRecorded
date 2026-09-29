import { validateZtcDrawingProjectCode } from "./ztc-drawing-project-code";
describe("ZTC title-block project codes", () => {
  const drawing = { projectName: "SP", hasReadableProjectName: true, qualityOk: true, issue: null, elementName: "1S-i01", totalAreaM2: 11.07 };
  it.each(["SP", "sp", " AB ", "ĀB"])("accepts a two-letter project code %s without changing panel data", (projectName) => {
    const input = { ...drawing, projectName };
    expect(validateZtcDrawingProjectCode(input)).toEqual(input);
  });
  it.each([null, "", "S", "SPX", "S1", "1S-i01", "Zemgales Prospekts 11 (ZP)"])("rejects missing or non-code project values %s", (projectName) => {
    expect(validateZtcDrawingProjectCode({ ...drawing, projectName })).toEqual({ ...drawing, projectName: null, hasReadableProjectName: false, qualityOk: false, issue: expect.stringContaining("divu burtu") });
  });
  it("does not override an existing quality rejection", () => {
    const input = { ...drawing, qualityOk: false, issue: "Blurry work list" };
    expect(validateZtcDrawingProjectCode(input)).toEqual(input);
  });
});
