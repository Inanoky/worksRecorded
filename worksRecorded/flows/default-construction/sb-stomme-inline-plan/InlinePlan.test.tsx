import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { saveSbStommePlanRow } from "@/server/actions/sb-stomme-inline-plan";
import {
	SbExportLink,
	SbPlanProvider,
	SbPlanText,
	SbRowActions,
} from "./InlinePlan";

jest.mock("@/server/actions/sb-stomme-inline-plan", () => ({
	saveSbStommePlanRow: jest.fn(),
}));
const initial = { plannedWork: "Walls", plannedAmount: "10", weather: "Sun" };
function renderPlan() {
	return render(
		<SbPlanProvider
			records={[
				{ id: "one", values: initial },
				{ id: "two", values: initial },
			]}
		>
			{["one", "two"].map((id) => (
				<section key={id} aria-label={id}>
					<SbPlanText recordId={id} field="weather" />
					<SbPlanText recordId={id} field="plannedWork" />
					<SbPlanText recordId={id} field="plannedAmount" unit="gab" />
					<SbRowActions recordId={id} label={id} />
				</section>
			))}
			<SbExportLink href="/export">Excel</SbExportLink>
		</SbPlanProvider>,
	);
}
async function openRow(id = "one") {
	fireEvent.keyDown(screen.getByRole("button", { name: `Darbības: ${id}` }), {
		key: "Enter",
	});
	fireEvent.click(await screen.findByRole("menuitem", { name: "Rediģēt" }));
	await within(screen.getByRole("region", { name: id })).findByLabelText(
		"Weather",
	);
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
}
describe("row plan editor", () => {
	beforeEach(() => jest.clearAllMocks());
	it("shares inline drafts between desktop and mobile copies and cancels with Escape", async () => {
		render(
			<SbPlanProvider records={[{ id: "one", values: initial }]}>
				<section aria-label="one">
					<SbPlanText recordId="one" field="weather" />
					<SbRowActions recordId="one" label="one" />
				</section>
				<section aria-label="mobile">
					<SbPlanText recordId="one" field="weather" />
					<SbRowActions recordId="one" label="mobile" />
				</section>
				<SbExportLink href="/export">Excel</SbExportLink>
			</SbPlanProvider>,
		);
		await openRow();
		const copies = screen.getAllByLabelText("Weather");
		fireEvent.change(copies[0], { target: { value: "Snow" } });
		expect(copies[1]).toHaveValue("Snow");
		expect(screen.getByRole("link", { name: "Excel" })).toHaveAttribute(
			"aria-disabled",
			"true",
		);
		fireEvent.keyDown(copies[1], { key: "Escape" });
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		expect(screen.getAllByText("Sun")).toHaveLength(2);
		expect(saveSbStommePlanRow).not.toHaveBeenCalled();
		expect(screen.getByRole("link", { name: "Excel" })).toHaveAttribute(
			"aria-disabled",
			"false",
		);
	});
	it("saves with Enter and prevents duplicate submits or cancel while saving", async () => {
		let finish!: (
			result: Awaited<ReturnType<typeof saveSbStommePlanRow>>,
		) => void;
		jest.mocked(saveSbStommePlanRow).mockImplementation(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		renderPlan();
		await openRow();
		const weather = screen.getByLabelText("Weather");
		fireEvent.change(weather, { target: { value: "Rain" } });
		fireEvent.keyDown(weather, { key: "Enter" });
		expect(weather).toBeDisabled();
		expect(screen.getByRole("button", { name: "Atcelt" })).toBeDisabled();
		fireEvent.keyDown(weather, { key: "Enter" });
		fireEvent.keyDown(weather, { key: "Escape" });
		expect(saveSbStommePlanRow).toHaveBeenCalledTimes(1);
		finish({ ok: true, values: { ...initial, weather: "Rain" } });
		await waitFor(() =>
			expect(screen.queryByRole("textbox")).not.toBeInTheDocument(),
		);
	});
	it("shows plain text, opens three prefilled fields and cancels without saving", async () => {
		renderPlan();
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		await openRow();
		expect(screen.getAllByRole("textbox")).toHaveLength(3);
		expect(
			within(screen.getByRole("region", { name: "one" })).getAllByRole(
				"textbox",
			),
		).toHaveLength(3);
		expect(
			screen.getByRole("button", { name: "Darbības: two" }),
		).toBeDisabled();
		expect(screen.getByLabelText("Weather")).toHaveValue("Sun");
		expect(screen.getByLabelText("Ieplānoti darbi")).toHaveValue("Walls");
		expect(screen.getByLabelText("Daudzums (plāns)")).toHaveValue("10");
		fireEvent.change(screen.getByLabelText("Weather"), {
			target: { value: "Rain" },
		});
		fireEvent.blur(screen.getByLabelText("Weather"));
		expect(saveSbStommePlanRow).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Atcelt" }));
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(
			within(screen.getByRole("region", { name: "one" })).getByText("Sun"),
		).toBeInTheDocument();
		await openRow();
		expect(screen.getByLabelText("Weather")).toHaveValue("Sun");
	});
	it("saves all fields together and updates only the selected row", async () => {
		const saved = {
			weather: "Rain",
			plannedWork: "Panels",
			plannedAmount: "12.5",
		};
		jest
			.mocked(saveSbStommePlanRow)
			.mockResolvedValue({ ok: true, values: saved });
		renderPlan();
		await openRow("two");
		fireEvent.change(screen.getByLabelText("Weather"), {
			target: { value: "Rain" },
		});
		fireEvent.change(screen.getByLabelText("Ieplānoti darbi"), {
			target: { value: "Panels" },
		});
		fireEvent.change(screen.getByLabelText("Daudzums (plāns)"), {
			target: { value: "12,5" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));
		await waitFor(() =>
			expect(screen.queryByRole("textbox")).not.toBeInTheDocument(),
		);
		expect(saveSbStommePlanRow).toHaveBeenCalledWith({
			recordId: "two",
			values: { ...saved, plannedAmount: "12,5" },
			expected: initial,
		});
		expect(
			within(screen.getByRole("region", { name: "two" })).getByText("12.5 gab"),
		).toBeInTheDocument();
		expect(
			within(screen.getByRole("region", { name: "one" })).getByText("10 gab"),
		).toBeInTheDocument();
	});
	it("retains the draft on failure and permits retry", async () => {
		jest
			.mocked(saveSbStommePlanRow)
			.mockResolvedValueOnce({ ok: false, error: "Save failed" })
			.mockResolvedValueOnce({
				ok: true,
				values: { ...initial, weather: "Rain" },
			});
		renderPlan();
		await openRow();
		fireEvent.change(screen.getByLabelText("Weather"), {
			target: { value: "Rain" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("Save failed");
		expect(screen.getByLabelText("Weather")).toHaveValue("Rain");
		fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));
		await waitFor(() =>
			expect(screen.queryByRole("textbox")).not.toBeInTheDocument(),
		);
		expect(
			within(screen.getByRole("region", { name: "one" })).getByText("Rain"),
		).toBeInTheDocument();
	});
});
