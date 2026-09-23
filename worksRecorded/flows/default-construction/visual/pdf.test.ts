import { PDFDocument } from "pdf-lib";
import { VISUAL_MAX_BYTES } from "./model";
import { loadVisualPdf } from "./pdf";

jest.mock("pdf-lib", () => ({ PDFDocument: { load: jest.fn() } }));
const originalFetch = global.fetch;
const mockFetch = jest.fn();
const cancel = jest.fn();

beforeEach(() => {
	jest.clearAllMocks();
	global.fetch = mockFetch;
	jest
		.mocked(PDFDocument.load)
		.mockResolvedValue({ getPageCount: () => 2 } as never);
	const read = jest
		.fn()
		.mockResolvedValueOnce({ done: false, value: Buffer.from("%PDF-1.7 data") })
		.mockResolvedValue({ done: true });
	mockFetch.mockResolvedValue({
		ok: true,
		body: { getReader: () => ({ read, cancel }) },
	});
});
afterAll(() => {
	global.fetch = originalFetch;
});

it.each([
	"http://a.ufs.sh/f/file",
	"https://127.0.0.1/file",
	"https://a.ufs.sh.evil.test/file",
	"https://user:pass@a.ufs.sh/file",
	"https://a.ufs.sh:8443/file",
])("rejects unsafe document URL %s before fetching", async (url) => {
	await expect(loadVisualPdf(url)).rejects.toThrow("Nederīga");
	expect(mockFetch).not.toHaveBeenCalled();
});
it("validates PDF bytes and rejects redirects", async () => {
	const result = await loadVisualPdf("https://a.ufs.sh/f/plan");
	expect(result.pageCount).toBe(2);
	expect(mockFetch).toHaveBeenCalledWith(
		expect.any(URL),
		expect.objectContaining({ redirect: "error", cache: "no-store" }),
	);
	expect(cancel).toHaveBeenCalled();
});
it("rejects oversized streamed content without trusting Content-Length", async () => {
	mockFetch.mockResolvedValue({
		ok: true,
		body: {
			getReader: () => ({
				read: jest.fn().mockResolvedValue({
					done: false,
					value: new Uint8Array(VISUAL_MAX_BYTES + 1),
				}),
				cancel,
			}),
		},
	});
	await expect(loadVisualPdf("https://a.ufs.sh/f/plan")).rejects.toThrow(
		"16 MB",
	);
	expect(cancel).toHaveBeenCalled();
});
it("rejects a disguised non-PDF file", async () => {
	const read = jest
		.fn()
		.mockResolvedValueOnce({
			done: false,
			value: Buffer.from("<html>not pdf</html>"),
		})
		.mockResolvedValue({ done: true });
	mockFetch.mockResolvedValue({
		ok: true,
		body: { getReader: () => ({ read, cancel }) },
	});
	await expect(loadVisualPdf("https://a.ufs.sh/f/plan")).rejects.toThrow(
		"nav PDF",
	);
});
it("rejects drawings exceeding the page limit", async () => {
	jest
		.mocked(PDFDocument.load)
		.mockResolvedValue({ getPageCount: () => 11 } as never);
	await expect(loadVisualPdf("https://a.ufs.sh/f/plan")).rejects.toThrow(
		"10 lapām",
	);
});
