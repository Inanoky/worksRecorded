import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { getTgemDashboardCache } from "@/lib/tgem-invoice-approval/dashboard-cache";
import { invalidateTgemSettingsCaches } from "@/lib/tgem-invoice-approval/settings-cache";
import {
	getTgemInvoiceSettingsData,
	type TgemInvoiceSettingsData,
} from "@/server/actions/tgem-invoice-settings-actions";
import { TgemInvoiceSettings } from "./TgemInvoiceSettings";
import { useTgemSettingsRefresh } from "./TgemSettingsRefreshContext";

jest.mock("@/server/actions/tgem-invoice-settings-actions", () => ({
	getTgemInvoiceSettingsData: jest.fn(),
}));
jest.mock("./TgemAccessGroupSettings", () => ({
	TgemAccessGroupSettings: () => null,
}));
jest.mock("./TgemCostCodeSettings", () => ({
	TgemCostCodeSettings: ({
		selectedProject,
	}: {
		selectedProject: { name: string };
	}) => {
		const refresh = useTgemSettingsRefresh();
		return (
			<div>
				{selectedProject.name}
				<button type="button" onClick={() => void refresh?.()}>
					Save settings
				</button>
			</div>
		);
	},
}));

const scope = JSON.stringify(["user-1", "org-1"]);
const props = {
	cacheScope: scope,
	projectFilter: "site-1",
	organizationLanguage: "en",
};
function snapshot(
	project = "site-1",
	name = "Project one",
): TgemInvoiceSettingsData {
	return {
		scope,
		costCodes: [],
		organizationLanguage: "en",
		selectedProject: { id: project, name },
		deletableProject: null,
		approvalSetup: null,
		submitterFlowSettings: { users: [], flows: [] },
		access: null,
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	invalidateTgemSettingsCaches();
	jest.mocked(getTgemInvoiceSettingsData).mockResolvedValue(snapshot());
});

it("opens a visited project from cache across remounts without another settings fetch", async () => {
	const first = render(<TgemInvoiceSettings {...props} />);
	await screen.findByText("Project one");
	first.unmount();
	render(<TgemInvoiceSettings {...props} />);
	expect(screen.getByText("Project one")).toBeInTheDocument();
	expect(getTgemInvoiceSettingsData).toHaveBeenCalledTimes(1);
});

it("keeps separate project snapshots and reuses both on navigation", async () => {
	jest
		.mocked(getTgemInvoiceSettingsData)
		.mockImplementation(async (project) =>
			snapshot(
				project ?? "all",
				project === "site-2" ? "Project two" : "Project one",
			),
		);
	const { rerender } = render(<TgemInvoiceSettings {...props} />);
	await screen.findByText("Project one");
	rerender(<TgemInvoiceSettings {...props} projectFilter="site-2" />);
	await screen.findByText("Project two");
	rerender(<TgemInvoiceSettings {...props} />);
	expect(screen.getByText("Project one")).toBeInTheDocument();
	expect(getTgemInvoiceSettingsData).toHaveBeenCalledTimes(2);
});

it("refreshes stale settings in the background while keeping cached settings visible", async () => {
	const first = render(<TgemInvoiceSettings {...props} />);
	await screen.findByText("Project one");
	first.unmount();
	const clock = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 61_000);
	let finish!: (data: TgemInvoiceSettingsData) => void;
	jest.mocked(getTgemInvoiceSettingsData).mockReturnValueOnce(
		new Promise((resolve) => {
			finish = resolve;
		}),
	);
	try {
		render(<TgemInvoiceSettings {...props} />);
		expect(screen.getByText("Project one")).toBeInTheDocument();
		expect(
			screen.queryByLabelText("Loading project settings…"),
		).not.toBeInTheDocument();
		await act(async () => finish(snapshot("site-1", "Updated project")));
		expect(screen.getByText("Updated project")).toBeInTheDocument();
	} finally {
		clock.mockRestore();
	}
});

it("invalidates settings and invoice permissions after a save", async () => {
	const invoices = getTgemDashboardCache(scope);
	invoices.put("all", {
		data: {
			currentUserId: "user-1",
			costCodes: [],
			projects: [],
			invoices: [],
			approvalSetup: null,
		},
		fetchedAt: Date.now(),
		needsSetup: false,
	});
	const { rerender } = render(<TgemInvoiceSettings {...props} />);
	await screen.findByText("Project one");
	rerender(<TgemInvoiceSettings {...props} projectFilter="site-2" />);
	await waitFor(() =>
		expect(getTgemInvoiceSettingsData).toHaveBeenCalledTimes(2),
	);
	jest
		.mocked(getTgemInvoiceSettingsData)
		.mockResolvedValueOnce(snapshot("site-2", "Saved settings"));
	fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
	await screen.findByText("Saved settings");
	expect(invoices.read("all")).toBeUndefined();
	rerender(<TgemInvoiceSettings {...props} />);
	await waitFor(() =>
		expect(getTgemInvoiceSettingsData).toHaveBeenCalledTimes(4),
	);
});

it("does not show another account's cached settings", async () => {
	const first = render(<TgemInvoiceSettings {...props} />);
	await screen.findByText("Project one");
	first.unmount();
	const otherScope = JSON.stringify(["user-2", "org-2"]);
	jest.mocked(getTgemInvoiceSettingsData).mockResolvedValueOnce({
		...snapshot("site-1", "Other account"),
		scope: otherScope,
	});
	render(<TgemInvoiceSettings {...props} cacheScope={otherScope} />);
	expect(screen.queryByText("Project one")).not.toBeInTheDocument();
	await screen.findByText("Other account");
	expect(getTgemInvoiceSettingsData).toHaveBeenCalledTimes(2);
});
