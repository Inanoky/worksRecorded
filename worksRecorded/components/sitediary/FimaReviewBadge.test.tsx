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
