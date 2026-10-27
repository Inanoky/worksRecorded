import { render, screen } from "@testing-library/react";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import { getFimaDiaryCollaboration } from "@/server/actions/fima-diary-collaboration";
import { FimaReviewBadge } from "./FimaReviewBadge";

jest.mock("@/server/actions/fima-diary-collaboration", () => ({
	getFimaDiaryCollaboration: jest.fn(),
	saveFimaDiaryCollaboration: jest.fn(),
}));
it.each([
	["do_not_create", "Netaisīt", "border-red-200", "bg-red-50"],
	["needs_changes", "Labot", "border-amber-200", "bg-amber-50"],
	["updated", "Updated", "border-sky-200", "bg-sky-50"],
	[
		"coordinate_with_fima",
		"Saskaņot ar Fima",
		"border-violet-200",
		"bg-violet-50",
	],
	["ai_prepared", "AI sagatavots", "border-yellow-200", "bg-yellow-50"],
	["bis_draft", "BIS sagatave", "border-teal-200", "bg-teal-50"],
	["approved", "Apstiprināts", "border-emerald-200", "bg-emerald-100"],
	[
		"ready_for_approval",
		"Sūtīt uz apstiprināšanu",
		"border-[#B8E0C6]",
		"bg-[#ECF8F0]",
	],
] as const)(
	"uses TGEM outline badge styling for %s",
	(status, label, border, background) => {
		const state: FimaCollaboration = {
			version: 0,
			status,
			materials: [],
			history: [],
		};
		const { container } = render(
			<FimaReviewBadge
				siteId="site"
				recordId="record"
				state={state}
				onChange={jest.fn()}
			/>,
		);
		const badge = container.querySelector('[data-slot="badge"]');
		expect(badge).toHaveTextContent(label);
		expect(badge).toHaveClass(border, background);
		expect(
			screen.getByRole("combobox", { name: "Ieraksta rīcība" }),
		).not.toBeDisabled();
		expect(getFimaDiaryCollaboration).not.toHaveBeenCalled();
	},
);

it("keeps the unset action and its history accessible", () => {
	render(
		<FimaReviewBadge
			siteId="site"
			recordId="record"
			state={{ version: 0, status: null, materials: [], history: [] }}
			onChange={jest.fn()}
		/>,
	);
	expect(
		screen.getByRole("combobox", { name: "Ieraksta rīcība" }),
	).toHaveAttribute("data-fima-badge");
	expect(
		screen.getByRole("combobox", { name: "Ieraksta rīcība" }),
	).toHaveTextContent("Nav atzīmes");
	expect(screen.getByRole("button", { name: "Atzīmju vēsture" })).toBeEnabled();
});
