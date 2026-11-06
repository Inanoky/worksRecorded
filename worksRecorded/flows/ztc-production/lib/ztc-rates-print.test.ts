import { fireEvent } from "@testing-library/dom";
import { printZtcTaskRates } from "@/flows/ztc-production/lib/ztc-rates-print";

describe("printZtcTaskRates", () => {
	afterEach(() => {
		document.body.replaceChildren();
		jest.restoreAllMocks();
	});

	it("prints a separate Latvian document with safe text and cleans up after printing", () => {
		const onError = jest.fn();
		printZtcTaskRates(
			"Projekts <A>",
			[
				{
					category: "works",
					label: "Darbi",
					rows: [
						{ task: "1 koeficients", rate: "1.2", unit: "m2" },
						{
							task: "<script>darbs</script>",
							rate: "2,5",
							unit: "m2",
							laborNorm: "0,12",
						},
						{ task: "", rate: "", unit: "m2" },
					],
				},
				{ category: "additionalDetails", label: "Papilddetāļas", rows: [] },
				{
					category: "additionalWorks",
					label: "Papilddarbi",
					rows: [
						{
							task: "Izkraušana",
							rate: "15",
							unit: "st",
							relatesToElement: true,
						},
					],
				},
			],
			onError,
		);
		const frame = document.querySelector("iframe");
		if (!frame?.contentWindow || !frame.contentDocument) {
			throw new Error("Print frame missing");
		}
		const printWindow = frame.contentWindow;
		const print = jest
			.spyOn(printWindow, "print")
			.mockImplementation(() => undefined);
		jest.spyOn(printWindow, "focus").mockImplementation(() => undefined);
		fireEvent.load(frame);
		const doc = frame.contentDocument;
		expect(doc.title).toBe("Darbu likmes · Projekts <A>");
		expect(doc.querySelector("p")?.textContent).toBe("Projekts: Projekts <A>");
		expect(doc.querySelector("script")).toBeNull();
		expect(doc.querySelectorAll("tbody tr")).toHaveLength(3);
		expect(
			Array.from(doc.querySelectorAll("tbody tr:first-child td"))
				.slice(0, 4)
				.map((cell) => cell.textContent),
		).toEqual(["1 koeficients", "1.2", "x", ""]);
		expect(doc.body.textContent).toContain("<script>darbs</script>2,5m20,12");
		expect(doc.body.textContent).toContain("Šajā sadaļā vēl nav likmju.");
		expect(doc.body.textContent).toContain("Izkraušana15stJā");
		expect(print).toHaveBeenCalledTimes(1);
		expect(onError).not.toHaveBeenCalled();
		fireEvent(printWindow, new Event("afterprint"));
		expect(frame.isConnected).toBe(false);
	});

	it("reports print failures and removes the frame", () => {
		const onError = jest.fn();
		printZtcTaskRates("Projekts", [], onError);
		const frame = document.querySelector("iframe");
		if (!frame?.contentWindow) throw new Error("Print frame missing");
		jest
			.spyOn(frame.contentWindow, "focus")
			.mockImplementation(() => undefined);
		jest.spyOn(frame.contentWindow, "print").mockImplementation(() => {
			throw new Error("Unavailable");
		});
		fireEvent.load(frame);
		expect(onError).toHaveBeenCalledTimes(1);
		expect(frame.isConnected).toBe(false);
	});
});
