jest.mock("@/components/providers/ProjectLoadingProgressProvider", () => ({
	useProjectCacheScope: () => "user:org",
}));
jest.mock("@/server/actions/bis-diary-references", () => ({
	loadBisDiaryReferenceOptions: jest.fn(),
}));

import {
	act,
	render,
	renderHook,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { loadBisDiaryReferenceOptions } from "@/server/actions/bis-diary-references";
import {
	BisDiaryReferenceFields,
	useBisDiaryReferences,
} from "./BisDiaryReferences";

beforeEach(() => {
	jest.clearAllMocks();
	global.fetch = jest.fn(async (url: string | URL | Request) => {
		const parsed = new URL(String(url), "https://app.example");
		const siteId = parsed.pathname.split("/")[3];
		const result = await loadBisDiaryReferenceOptions(
			siteId,
			parsed.searchParams.get("refresh") === "1",
		);
		return { ok: result.ok, json: async () => result } as Response;
	});
	jest
		.mocked(loadBisDiaryReferenceOptions)
		.mockImplementation(async (siteId) => ({
			ok: true,
			data: { scope: siteId, drawings: [], estimates: [] },
		}));
});

test("preloads on project mount and preserves the list across renders", async () => {
	const { result, rerender } = renderHook(() =>
		useBisDiaryReferences("project", true),
	);
	await waitFor(() => expect(result.current.data?.scope).toBe("project"));
	rerender();
	expect(loadBisDiaryReferenceOptions).toHaveBeenCalledTimes(1);
	await act(() => result.current.refresh());
	expect(loadBisDiaryReferenceOptions).toHaveBeenLastCalledWith(
		"project",
		true,
	);
});

test("does not fetch for other flows or expose a previous project's options", async () => {
	const { result, rerender } = renderHook(
		({ siteId, enabled }) => useBisDiaryReferences(siteId, enabled),
		{ initialProps: { siteId: "first", enabled: false } },
	);
	expect(loadBisDiaryReferenceOptions).not.toHaveBeenCalled();
	rerender({ siteId: "first", enabled: true });
	await waitFor(() => expect(result.current.data?.scope).toBe("first"));
	let resolve!: (
		value: Awaited<ReturnType<typeof loadBisDiaryReferenceOptions>>,
	) => void;
	jest.mocked(loadBisDiaryReferenceOptions).mockReturnValueOnce(
		new Promise((done) => {
			resolve = done;
		}),
	);
	rerender({ siteId: "second", enabled: true });
	expect(result.current.data).toBeUndefined();
	await act(async () =>
		resolve({
			ok: true,
			data: { scope: "second", drawings: [], estimates: [] },
		}),
	);
	expect(result.current.data?.scope).toBe("second");
});

test("searches BIS positions inside the dropdown and saves or clears the selected ID", async () => {
	const user = userEvent.setup();
	const onEstimateChange = jest.fn();
	function SendDialog() {
		const [estimateId, setEstimateId] = useState("");
		return (
			<Dialog open>
				<DialogContent>
					<DialogTitle>Sūtīt uz BIS</DialogTitle>
					<DialogDescription>Darba ieraksts</DialogDescription>
					<BisDiaryReferenceFields
						references={{
							data: {
								scope: "project",
								drawings: [],
								estimates: [
									{ id: "314", label: "2.1.1 · PP aku izbūve" },
									{ id: "926", label: "2.2.11 · Tranšejas rakšana" },
								],
							},
							error: undefined,
							loading: false,
							refresh: async () => {},
						}}
						documentIds={[]}
						estimateId={estimateId}
						onDocumentsChange={jest.fn()}
						onEstimateChange={(id) => {
							setEstimateId(id);
							onEstimateChange(id);
						}}
					/>
				</DialogContent>
			</Dialog>
		);
	}
	render(<SendDialog />);
	const trigger = screen.getByRole("button", { name: /Tāmes pozīcija/ });
	expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	await user.click(trigger);
	const picker = within(screen.getByRole("dialog", { name: "Tāmes pozīcija" }));
	const search = picker.getByRole("textbox");
	expect(search).toHaveFocus();
	await user.type(search, "2.1.1");
	expect(picker.getByRole("button", { name: /PP aku izbūve/ })).toBeVisible();
	expect(
		picker.queryByRole("button", { name: /Tranšejas rakšana/ }),
	).not.toBeInTheDocument();
	await user.clear(search);
	await user.type(search, "neeksistē");
	expect(picker.getByRole("status")).toHaveTextContent(
		"Nav atrasta neviena tāmes pozīcija.",
	);
	await user.clear(search);
	await user.type(search, "RAKŠANA");
	expect(
		picker.queryByRole("button", { name: /PP aku izbūve/ }),
	).not.toBeInTheDocument();
	await user.tab();
	await user.keyboard("{Enter}");
	expect(onEstimateChange).toHaveBeenLastCalledWith("926");
	expect(trigger).toHaveTextContent("2.2.11 · Tranšejas rakšana");
	await user.click(trigger);
	const reopenedPicker = within(
		screen.getByRole("dialog", { name: "Tāmes pozīcija" }),
	);
	expect(reopenedPicker.getByRole("textbox")).toHaveValue("");
	expect(
		reopenedPicker.getByRole("button", { name: /Tranšejas rakšana/ }),
	).toHaveAttribute("aria-pressed", "true");
	await user.click(
		reopenedPicker.getByRole("button", { name: "Nav izvēlēta" }),
	);
	expect(onEstimateChange).toHaveBeenLastCalledWith("");
	expect(trigger).toHaveTextContent("Nav izvēlēta");
	expect(screen.getByRole("dialog", { name: "Sūtīt uz BIS" })).toBeVisible();
});
