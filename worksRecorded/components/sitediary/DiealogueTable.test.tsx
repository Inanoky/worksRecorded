import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { saveDefaultConstructionDiaryEdits } from "@/flows/default-construction/backend/diary-edit-actions";
import { getSiteDiaryDialogMessages } from "@/lib/dashboard-i18n";
import {
	getSiteDiaryRecord,
	saveSiteDiaryRecordFromWeb,
	updateSiteDiaryRecord,
} from "@/server/actions/site-diary-actions";
import { DialogTable } from "./DiealogueTable";
import { useMediaQuery } from "./Use-media-querty";

jest.mock("@/flows/default-construction/backend/diary-edit-actions", () => ({
	saveDefaultConstructionDiaryEdits: jest.fn(),
}));

jest.mock("@/server/actions/site-diary-actions", () => ({
	deleteSiteDiaryRecord: jest.fn(),
	getConfig: jest.fn(),
	getSiteDiaryRecord: jest.fn(),
	getSiteDiarySchema: jest.fn(),
	saveSiteDiaryRecordFromWeb: jest.fn(),
	updateSiteDiaryRecord: jest.fn(),
}));
jest.mock("./Use-media-querty", () => ({ useMediaQuery: jest.fn() }));
jest.mock("sonner", () => ({
	toast: { error: jest.fn(), success: jest.fn() },
}));
jest.mock("@/components/ui/scroll-area", () => ({
	ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	ScrollBar: () => null,
}));
jest.mock("@/components/ui/select", () => ({
	Select: ({
		children,
		value,
		onValueChange,
	}: {
		children: ReactNode;
		value: string;
		onValueChange: (value: string) => void;
	}) => (
		<select
			value={value}
			onChange={(event) => onValueChange(event.target.value)}
		>
			<option value="">—</option>
			{children}
		</select>
	),
	SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
	SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
		<option value={value}>{children}</option>
	),
	SelectTrigger: () => null,
	SelectValue: () => null,
}));

const uuid = "79867920-ab26-41a6-9bd8-f3ea10ffa452";
const hashId =
	"877bb126fb14a32408b002daf4d6f3911b74382c197666b652670e6fb48f8693";
const date = new Date("2026-09-25T12:00:00Z");
const config = {
	Location: {
		Type: "dropdown",
		DisplayName: "Stāvs",
		DropDownOptions: { first: "1. stāvs", second: "2. stāvs" },
	},
};
const messages = getSiteDiaryDialogMessages("lv");

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(useMediaQuery).mockReturnValue(false);
	jest.mocked(updateSiteDiaryRecord).mockResolvedValue({ ok: true } as never);
	jest
		.mocked(saveSiteDiaryRecordFromWeb)
		.mockResolvedValue({ ok: true } as never);
	jest.spyOn(console, "log").mockImplementation(() => {});
	jest.spyOn(console, "dir").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

async function openDiary(
	ids = [uuid, hashId],
	batchEditing = false,
	onSaved = jest.fn(),
) {
	const rows = ids.map((id) => ({ id, Date: date, Location: "" }));
	jest.mocked(getSiteDiaryRecord).mockResolvedValue(rows as never);
	await act(async () => {
		render(
			<DialogTable
				date={date}
				siteId="site"
				initialConfig={config}
				initialRows={rows}
				organizationLanguage="lv"
				batchEditing={batchEditing}
				onSaved={onSaved}
			/>,
		);
	});
	await waitFor(() =>
		expect(screen.getAllByRole("combobox")).toHaveLength(ids.length),
	);
}

it.each([false, true])(
	"updates the original hash-ID record when changing Stāvs (mobile=%s)",
	async (mobile) => {
		jest.mocked(useMediaQuery).mockReturnValue(mobile);
		await openDiary();
		fireEvent.change(screen.getAllByRole("combobox")[1], {
			target: { value: "1. stāvs" },
		});
		fireEvent.click(screen.getByRole("button", { name: messages.saveDiary }));
		await waitFor(() => expect(toast.success).toHaveBeenCalled());
		expect(updateSiteDiaryRecord).toHaveBeenCalledTimes(1);
		expect(updateSiteDiaryRecord).toHaveBeenCalledWith(
			expect.objectContaining({
				id: hashId,
				Location: "1. stāvs",
				siteId: "site",
			}),
		);
		expect(saveSiteDiaryRecordFromWeb).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
	},
);

it("still updates UUID records without creating untouched hash-ID rows", async () => {
	await openDiary();
	fireEvent.change(screen.getAllByRole("combobox")[0], {
		target: { value: "2. stāvs" },
	});
	fireEvent.click(screen.getByRole("button", { name: messages.saveDiary }));
	await waitFor(() => expect(toast.success).toHaveBeenCalled());
	expect(updateSiteDiaryRecord).toHaveBeenCalledTimes(1);
	expect(updateSiteDiaryRecord).toHaveBeenCalledWith(
		expect.objectContaining({ id: uuid, Location: "2. stāvs" }),
	);
	expect(saveSiteDiaryRecordFromWeb).not.toHaveBeenCalled();
});

it("does not write unchanged records of either ID format", async () => {
	await openDiary();
	fireEvent.click(screen.getByRole("button", { name: messages.saveDiary }));
	await waitFor(() => expect(toast.success).toHaveBeenCalled());
	expect(updateSiteDiaryRecord).not.toHaveBeenCalled();
	expect(saveSiteDiaryRecordFromWeb).not.toHaveBeenCalled();
});

it("only creates the added row when also editing an existing hash-ID row", async () => {
	await openDiary();
	fireEvent.change(screen.getAllByRole("combobox")[1], {
		target: { value: "1. stāvs" },
	});
	fireEvent.click(screen.getByRole("button", { name: messages.addTask }));
	fireEvent.change(screen.getAllByRole("combobox")[2], {
		target: { value: "2. stāvs" },
	});
	fireEvent.click(screen.getByRole("button", { name: messages.saveDiary }));
	await waitFor(() => expect(toast.success).toHaveBeenCalled());
	expect(updateSiteDiaryRecord).toHaveBeenCalledTimes(1);
	expect(updateSiteDiaryRecord).toHaveBeenCalledWith(
		expect.objectContaining({ id: hashId }),
	);
	expect(saveSiteDiaryRecordFromWeb).toHaveBeenCalledTimes(1);
	const payload = jest.mocked(saveSiteDiaryRecordFromWeb).mock.calls[0][0];
	expect(payload.rows).toHaveLength(1);
	expect(payload.rows[0]).toMatchObject({ Location: "2. stāvs" });
	expect(payload.rows[0]).not.toHaveProperty("id");
	expect(payload.rows[0]).not.toHaveProperty("_tempId");
});

it("does not fall back to creating a record when an update fails", async () => {
	jest
		.mocked(updateSiteDiaryRecord)
		.mockResolvedValue({ ok: false, message: "Update failed" });
	await openDiary();
	fireEvent.change(screen.getAllByRole("combobox")[1], {
		target: { value: "1. stāvs" },
	});
	fireEvent.click(screen.getByRole("button", { name: messages.saveDiary }));
	await waitFor(() => expect(toast.error).toHaveBeenCalled());
	expect(saveSiteDiaryRecordFromWeb).not.toHaveBeenCalled();
});

it("rejects empty saved IDs instead of treating them as new rows", async () => {
	await openDiary([""]);
	fireEvent.click(screen.getByRole("button", { name: messages.saveDiary }));
	await waitFor(() => expect(toast.error).toHaveBeenCalled());
	expect(updateSiteDiaryRecord).not.toHaveBeenCalled();
	expect(saveSiteDiaryRecordFromWeb).not.toHaveBeenCalled();
});

it("uses one batch request with only changed fields and patches confirmed rows", async () => {
	const confirmed = {
		id: hashId,
		Date: date.toISOString(),
		Location: "1. stāvs",
		Photos: ["photo"],
		TimeInvolved: "5",
	};
	const onSaved = jest.fn();
	jest
		.mocked(saveDefaultConstructionDiaryEdits)
		.mockResolvedValue({ rows: [confirmed], createdIds: [] } as never);
	await openDiary([uuid, hashId], true, onSaved);
	const input = screen.getAllByRole("combobox")[1];
	fireEvent.change(input, { target: { value: "1. stāvs" } });
	fireEvent.click(screen.getByRole("button", { name: messages.saveDiary }));
	await waitFor(() => expect(onSaved).toHaveBeenCalled());
	expect(saveDefaultConstructionDiaryEdits).toHaveBeenCalledWith({
		siteId: "site",
		updates: [{ id: hashId, fields: { Location: "1. stāvs" } }],
		creates: [],
	});
	expect(updateSiteDiaryRecord).not.toHaveBeenCalled();
	expect(onSaved).toHaveBeenCalledWith({ rows: [confirmed], createdIds: [] });
	expect(screen.getAllByRole("combobox")[1]).toBe(input);
	fireEvent.click(screen.getByRole("button", { name: messages.saveDiary }));
	expect(saveDefaultConstructionDiaryEdits).toHaveBeenCalledTimes(1);
});

it("retains the edited value after a failed batch and can retry", async () => {
	jest
		.mocked(saveDefaultConstructionDiaryEdits)
		.mockRejectedValueOnce(new Error("Save failed"))
		.mockResolvedValue({ rows: [], createdIds: [] });
	await openDiary([hashId], true);
	fireEvent.change(screen.getByRole("combobox"), {
		target: { value: "2. stāvs" },
	});
	fireEvent.click(screen.getByRole("button", { name: messages.saveDiary }));
	await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Save failed"));
	expect(screen.getByRole("combobox")).toHaveValue("2. stāvs");
	fireEvent.click(screen.getByRole("button", { name: messages.saveDiary }));
	await waitFor(() =>
		expect(saveDefaultConstructionDiaryEdits).toHaveBeenCalledTimes(2),
	);
});

it("replaces a new row's temporary identity without creating it again on the next save", async () => {
	jest.mocked(saveDefaultConstructionDiaryEdits).mockImplementation(
		async (input) =>
			({
				rows: input.creates.map((row) => ({
					id: row.clientId,
					Date: date.toISOString(),
					Location: "2. stāvs",
				})),
				createdIds: input.creates.map((row) => row.clientId),
			}) as never,
	);
	await openDiary([hashId], true);
	fireEvent.click(screen.getByRole("button", { name: messages.addTask }));
	fireEvent.change(screen.getAllByRole("combobox")[1], {
		target: { value: "2. stāvs" },
	});
	fireEvent.click(screen.getByRole("button", { name: messages.saveDiary }));
	await waitFor(() => expect(toast.success).toHaveBeenCalled());
	fireEvent.change(screen.getAllByRole("combobox")[1], {
		target: { value: "1. stāvs" },
	});
	fireEvent.click(screen.getByRole("button", { name: messages.saveDiary }));
	await waitFor(() =>
		expect(saveDefaultConstructionDiaryEdits).toHaveBeenCalledTimes(2),
	);
	expect(
		jest.mocked(saveDefaultConstructionDiaryEdits).mock.calls[1][0].creates,
	).toEqual([]);
	expect(
		jest.mocked(saveDefaultConstructionDiaryEdits).mock.calls[1][0].updates,
	).toHaveLength(1);
});

it("blocks duplicate submissions and additional edits while a batch is in flight", async () => {
	let finish!: (
		value: Awaited<ReturnType<typeof saveDefaultConstructionDiaryEdits>>,
	) => void;
	jest.mocked(saveDefaultConstructionDiaryEdits).mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	await openDiary([hashId], true);
	const input = screen.getByRole("combobox");
	fireEvent.change(input, { target: { value: "1. stāvs" } });
	const form = screen
		.getByRole("button", { name: messages.saveDiary })
		.closest("form");
	if (!form) throw new Error("Diary form is missing");
	fireEvent.submit(form);
	fireEvent.submit(form);
	expect(saveDefaultConstructionDiaryEdits).toHaveBeenCalledTimes(1);
	expect(input).toBeDisabled();
	fireEvent.change(input, { target: { value: "2. stāvs" } });
	expect(input).toHaveValue("1. stāvs");
	await act(async () => finish({ rows: [], createdIds: [] }));
	expect(input).toBeEnabled();
});

it("does not resend unedited timestamps or hours when only the comment changes", async () => {
	const original = {
		id: hashId,
		Date: date,
		Date_Custom_1: "2026-09-25T07:09:45.123Z",
		TimeInvolved: "6.3416666667",
		Comments: "Original",
	};
	jest.mocked(getSiteDiaryRecord).mockResolvedValue([original] as never);
	jest
		.mocked(saveDefaultConstructionDiaryEdits)
		.mockResolvedValue({ rows: [], createdIds: [] });
	await act(async () => {
		render(
			<DialogTable
				date={date}
				siteId="site"
				initialRows={[original]}
				initialConfig={{
					Comments: { Type: "textInput", DisplayName: "Komentārs" },
					Date_Custom_1: { Type: "timePicker", DisplayName: "Sākums" },
					TimeInvolved: { Type: "float", DisplayName: "Stundas" },
				}}
				batchEditing
				organizationLanguage="lv"
			/>,
		);
	});
	fireEvent.change(screen.getByDisplayValue("Original"), {
		target: { value: "Edited" },
	});
	fireEvent.click(screen.getByRole("button", { name: messages.saveDiary }));
	await waitFor(() =>
		expect(saveDefaultConstructionDiaryEdits).toHaveBeenCalled(),
	);
	expect(saveDefaultConstructionDiaryEdits).toHaveBeenCalledWith({
		siteId: "site",
		updates: [{ id: hashId, fields: { Comments: "Edited" } }],
		creates: [],
	});
});
