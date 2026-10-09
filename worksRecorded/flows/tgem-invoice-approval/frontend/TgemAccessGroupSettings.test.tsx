import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/server/actions/tgem-access-actions", () => ({
	saveTgemAccessGroup: jest.fn(),
	saveTgemOrganizationAccessMemberships: jest.fn(),
	saveTgemSiteAccessMemberships: jest.fn(),
}));

import { TgemAccessGroupSettings } from "./TgemAccessGroupSettings";

const groups = [
	{
		id: "group-1",
		name: "Administrator",
		permissions: ["invoice.view", "invoice.approve"],
		memberUserIds: ["user-1"],
	},
];

const users = [
	{
		id: "user-1",
		name: "Deivids",
		email: "deivids@example.com",
	},
];

describe("TgemAccessGroupSettings", () => {
	it("shows group add and edit controls for a platform admin in project settings", () => {
		render(
			<TgemAccessGroupSettings
				organizationId="org-1"
				siteId="site-1"
				groups={groups}
				users={users}
				canEditGroups
			/>,
		);

		const accessToggle = screen.getByRole("button", {
			name: "Projekta piekļuve",
		});
		expect(accessToggle).toHaveAttribute("aria-expanded", "false");
		expect(screen.getByText("Piekļuves grupas")).not.toBeVisible();

		fireEvent.click(accessToggle);

		expect(accessToggle).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("Piekļuves grupas")).toBeInTheDocument();
		expect(
			screen.getByRole("option", { name: "Jauna grupa" }),
		).toBeInTheDocument();
		expect(screen.getByText("Projekta grupu piešķīrumi")).toBeInTheDocument();
	});

	it("keeps reusable group editing hidden for a project owner", () => {
		render(
			<TgemAccessGroupSettings
				organizationId="org-1"
				siteId="site-1"
				groups={groups}
				users={users}
				canEditGroups={false}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Projekta piekļuve" }));
		expect(screen.queryByText("Piekļuves grupas")).not.toBeInTheDocument();
		expect(screen.getByText("Projekta grupu piešķīrumi")).toBeInTheDocument();
	});

	it("shows persisted organization roles in the admin panel", () => {
		render(
			<TgemAccessGroupSettings
				organizationId="org-1"
				groups={groups}
				users={users}
				canEditGroups
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "Organizācijas piekļuve" }),
		);

		expect(screen.getByText("Pašlaik piešķirtās lomas")).toBeInTheDocument();
		expect(screen.getByText("Organizācijā")).toBeInTheDocument();
		expect(
			screen.getByRole("checkbox", { name: "Administrator" }),
		).toBeChecked();
	});

	it("shows inherited organization roles without selecting a project override", () => {
		render(
			<TgemAccessGroupSettings
				organizationId="org-1"
				siteId="site-1"
				groups={[
					{
						...groups[0],
						memberUserIds: [],
						organizationMemberUserIds: ["user-1"],
					},
				]}
				users={users}
				canEditGroups
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Projekta piekļuve" }));

		expect(screen.getByText("No organizācijas")).toBeInTheDocument();
		expect(
			screen.getByRole("checkbox", { name: "Administrator" }),
		).not.toBeChecked();
	});
});
