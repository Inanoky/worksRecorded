import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { getFimaExampleSource } from "@/server/actions/fima-diary-collaboration";
import { FimaExamplesCell } from "./FimaExamplesCell";

jest.mock("@/server/actions/fima-diary-collaboration", () => ({
	getFimaExampleSource: jest.fn(),
}));
const entries = [
	{
		id: "123",
		label: "BIS ieraksts Nr.653",
		url: "https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/123",
	},
	{
		id: "456",
		label: "BIS ieraksts Nr.654",
		url: "https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/456",
	},
];
const source = {
	id: "source",
	siteId: "other-project",
	fimaNumber: 42,
	work: "Metāla konsoļu montāža balstos 21–9",
};
const details = {
	id: "source",
	siteId: "other-project",
	fimaNumber: 42,
	Works: source.work,
	Works_Custom_1: "BIS description",
	Date: new Date("2026-10-19"),
	Location: "21–9",
	originalUserComment: "Original KUCE message",
	Site: { name: "Olaine" },
};
beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(getFimaExampleSource).mockResolvedValue(details);
});
function mount(work = source.work, onRowClick = jest.fn()) {
	return render(
		<table>
			<tbody>
				<tr onClick={onRowClick}>
					<td>
						<FimaExamplesCell
							siteId="project"
							recordId="record"
							examples={{ entries }}
							sources={{ "123": [{ ...source, work }], "456": [] }}
						/>
					</td>
				</tr>
			</tbody>
		</table>,
	);
}
it("pairs each BIS example with its own source and keeps missing sources visible", () => {
	mount();
	const items = screen.getAllByRole("listitem");
	expect(within(items[0]).getByText(source.work)).toBeInTheDocument();
	expect(
		within(items[0]).getByRole("button", {
			name: "FIMA-000042 · Skatīt avotu",
		}),
	).toBeInTheDocument();
	expect(
		within(items[1]).getByText("KUCE avots nav pieejams."),
	).toBeInTheDocument();
	expect(within(items[1]).queryByText(source.work)).not.toBeInTheDocument();
	expect(getFimaExampleSource).not.toHaveBeenCalled();
});
it("expands long work descriptions and preserves BIS navigation without opening the row", () => {
	const onRowClick = jest.fn();
	mount("Long KUCE description ".repeat(20), onRowClick);
	const expand = screen.getByRole("button", { name: "Vairāk" });
	expect(expand).toHaveAttribute("aria-expanded", "false");
	fireEvent.click(expand);
	expect(screen.getByRole("button", { name: "Mazāk" })).toHaveAttribute(
		"aria-expanded",
		"true",
	);
	const link = screen.getByRole("link", { name: entries[0].label });
	expect(link).toHaveAttribute("href", entries[0].url);
	expect(link).toHaveAttribute("target", "_blank");
	fireEvent.click(link);
	expect(onRowClick).not.toHaveBeenCalled();
});
it("opens the exact source record in a side panel and returns to the same table on close", async () => {
	const onRowClick = jest.fn();
	mount(source.work, onRowClick);
	fireEvent.click(screen.getByRole("button", { name: /Skatīt avotu/ }));
	const panel = screen.getByRole("dialog", { name: "KUCE avots" });
	expect(panel).toHaveClass("right-0", "h-dvh");
	expect(
		await within(panel).findByText("Original KUCE message"),
	).toBeInTheDocument();
	expect(within(panel).getByText(source.work)).toBeInTheDocument();
	expect(within(panel).getByText("Olaine")).toBeInTheDocument();
	expect(getFimaExampleSource).toHaveBeenCalledWith({
		siteId: "project",
		recordId: "record",
		bisId: "123",
		sourceRecordId: "source",
	});
	expect(onRowClick).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Aizvērt KUCE avotu" }));
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
	);
	expect(
		screen.getByRole("link", { name: entries[0].label }),
	).toBeInTheDocument();
});
it("supports retry when the source is unavailable", async () => {
	jest.mocked(getFimaExampleSource).mockRejectedValueOnce(new Error("Offline"));
	mount();
	fireEvent.click(screen.getByRole("button", { name: /Skatīt avotu/ }));
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Neizdevās ielādēt KUCE avotu",
	);
	fireEvent.click(screen.getByRole("button", { name: "Mēģināt vēlreiz" }));
	expect(await screen.findByText("Original KUCE message")).toBeInTheDocument();
});
it("ignores a response after the source panel is closed", async () => {
	let finish!: (value: typeof details) => void;
	jest.mocked(getFimaExampleSource).mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	mount();
	fireEvent.click(screen.getByRole("button", { name: /Skatīt avotu/ }));
	await waitFor(() => expect(getFimaExampleSource).toHaveBeenCalledTimes(1));
	fireEvent.click(screen.getByRole("button", { name: "Aizvērt KUCE avotu" }));
	await act(async () => finish(details));
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
