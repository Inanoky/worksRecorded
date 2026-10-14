import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockGet = jest.fn();
const mockSave = jest.fn();
const mockRefresh = jest.fn();
const mockRestore = jest.fn();
jest.mock("../backend/diary-feedback-actions", () => ({
	getConstructionDiaryFeedback: (...args: unknown[]) => mockGet(...args),
	saveConstructionDiaryFeedback: (...args: unknown[]) => mockSave(...args),
	refreshConstructionDiaryFeedback: (...args: unknown[]) =>
		mockRefresh(...args),
	restoreConstructionDiaryFeedback: (...args: unknown[]) =>
		mockRestore(...args),
}));

import { DiaryFeedbackBrain } from "./DiaryFeedbackBrain";

const data = {
	snapshot: {
		revision: 2,
		generatedPrompt: "XPS 150mm ir atsevišķs darbs.",
		userInstructions: "",
		sourceRecordCount: 12,
		checkedAt: null,
		updatedAt: null,
		busy: false,
		active: true,
	},
	history: [],
	hasMore: false,
};
describe("AI brain dialog", () => {
	it("pauses generation for an inactive brain while leaving saved guidance visible", async () => {
		mockGet.mockResolvedValue({
			...data,
			snapshot: { ...data.snapshot, active: false },
		});
		render(<DiaryFeedbackBrain siteId="site-a" domain="warehouse" />);
		fireEvent.click(screen.getByRole("button", { name: "AI smadzenes" }));
		await screen.findByText(data.snapshot.generatedPrompt);
		expect(
			screen.getByRole("button", { name: "Atjaunot no noliktavas" }),
		).toBeDisabled();
		expect(mockGet).toHaveBeenCalledWith("site-a", undefined, "warehouse");
		expect(mockRefresh).not.toHaveBeenCalled();
	});
	beforeEach(() => {
		jest.clearAllMocks();
		mockGet.mockResolvedValue(data);
		mockSave.mockResolvedValue(data);
	});
	it("loads only when opened and lets the user correct the displayed helper", async () => {
		render(<DiaryFeedbackBrain siteId="site-a" />);
		expect(mockGet).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "AI smadzenes" }));
		await screen.findByText(data.snapshot.generatedPrompt);
		fireEvent.click(screen.getByRole("button", { name: "Labot šo palīgu" }));
		expect(screen.getByRole("textbox")).toHaveValue(
			data.snapshot.generatedPrompt,
		);
		fireEvent.change(screen.getByRole("textbox"), {
			target: { value: "XPS 50mm nedrīkst piesaistīt XPS 150mm" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));
		await waitFor(() =>
			expect(mockSave).toHaveBeenCalledWith({
				siteId: "site-a",
				domain: "diary",
				expectedRevision: 2,
				userInstructions: "XPS 50mm nedrīkst piesaistīt XPS 150mm",
			}),
		);
	});
	it("protects unsaved corrections from regeneration", async () => {
		render(<DiaryFeedbackBrain siteId="site-a" />);
		fireEvent.click(screen.getByRole("button", { name: "AI smadzenes" }));
		await screen.findByText(data.snapshot.generatedPrompt);
		fireEvent.change(screen.getByRole("textbox"), {
			target: { value: "new rule" },
		});
		expect(
			screen.getByRole("button", { name: "Atjaunot no žurnāla" }),
		).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "Atcelt izmaiņas" }));
		expect(
			screen.getByRole("button", { name: "Atjaunot no žurnāla" }),
		).toBeEnabled();
	});
});
