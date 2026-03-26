import { ensurePdfFilename } from "@/app/api/poller/filename";

describe("ensurePdfFilename", () => {
  it("uses default invoice.pdf when missing", () => {
    expect(ensurePdfFilename()).toBe("invoice.pdf");
  });

  it("keeps basename only", () => {
    expect(ensurePdfFilename("folder/sub/file.pdf")).toBe("file.pdf");
  });

  it("normalizes extension to lower case", () => {
    expect(ensurePdfFilename("FILE.PDF")).toBe("FILE.pdf");
  });

  it("forces .pdf extension", () => {
    expect(ensurePdfFilename("report.xlsx")).toBe("report.pdf");
    expect(ensurePdfFilename("report")).toBe("report.pdf");
  });
});
