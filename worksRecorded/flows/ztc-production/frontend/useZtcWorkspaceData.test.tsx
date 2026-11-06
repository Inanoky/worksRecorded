import { act, cleanup, render, screen } from "@testing-library/react";
import { RetainedView } from "@/components/providers/RetainedView";
import type {
	ZtcWorkspaceData,
	ZtcWorkspaceDelta,
} from "../lib/ztc-workspace-data";
import { useZtcWorkspaceData } from "./useZtcWorkspaceData";

const mockCheck = jest.fn();
const mockSync = jest.fn();
const mockRead = jest.fn();
const mockWrite = jest.fn();
jest.mock("@/components/providers/ProjectLoadingProgressProvider", () => ({
	useProjectCacheScope: () => "user:org",
}));
jest.mock("@/flows/ztc-production/backend/actions", () => ({
	getZtcWorkspaceActivity: (...args: unknown[]) => mockCheck(...args),
	syncZtcWorkspace: (...args: unknown[]) => mockSync(...args),
}));
jest.mock("@/flows/ztc-production/lib/ztc-persistent-cache", () => ({
	ZtcPersistentCache: class {
		read = () => mockRead();
		write = (data: unknown) => mockWrite(data);
		clear = async () => {};
	},
}));
const cached: ZtcWorkspaceData = {
	siteId: "site",
	rows: [{ id: "row", Date: "2026-11-06", Works: "Cached work" }],
	config: {},
	rates: [],
	projectOptions: [],
	mediaOnlyDays: [],
	sync: {
		version: 1,
		siteId: "site",
		revisions: { rows: "one", config: "one", media: "one" },
		rows: { row: "one" },
		media: {},
	},
};
const revisions = { rows: "one", config: "one", media: "one" };
function Harness() {
	const workspace = useZtcWorkspaceData("site", true);
	return <output>{workspace.data?.rows[0]?.Works ?? "Loading"}</output>;
}
async function flush() {
	await act(async () => {
		for (let i = 0; i < 10; i++) await Promise.resolve();
	});
}
beforeEach(() => {
	jest.useFakeTimers();
	jest.clearAllMocks();
	mockCheck
		.mockReset()
		.mockResolvedValue({ status: "ok", siteId: "site", revisions });
	mockRead.mockReset().mockResolvedValue(cached);
	mockSync.mockReset();
	Object.defineProperty(document, "visibilityState", {
		configurable: true,
		value: "visible",
	});
});
afterEach(() => {
	cleanup();
	jest.useRealTimers();
	Reflect.deleteProperty(document, "visibilityState");
});

it("restores cached data and polls only revisions every 15 seconds", async () => {
	render(<Harness />);
	await flush();
	expect(screen.getByText("Cached work")).toBeVisible();
	expect(mockCheck).toHaveBeenCalledTimes(1);
	await act(async () => {
		jest.advanceTimersByTime(15000);
	});
	expect(mockCheck).toHaveBeenCalledTimes(2);
	expect(mockSync).not.toHaveBeenCalled();
	expect(mockWrite).not.toHaveBeenCalled();
});

it("pauses background checks while hidden and checks immediately when visible again", async () => {
	render(<Harness />);
	await flush();
	Object.defineProperty(document, "visibilityState", {
		configurable: true,
		value: "hidden",
	});
	await act(async () => {
		jest.advanceTimersByTime(60000);
	});
	expect(mockCheck).toHaveBeenCalledTimes(1);
	Object.defineProperty(document, "visibilityState", {
		configurable: true,
		value: "visible",
	});
	await act(async () => {
		document.dispatchEvent(new Event("visibilitychange"));
	});
	expect(mockCheck).toHaveBeenCalledTimes(2);
});

it("restores cached data in a hidden tab and waits until it is visible to contact the server", async () => {
	Object.defineProperty(document, "visibilityState", {
		configurable: true,
		value: "hidden",
	});
	render(<Harness />);
	await flush();
	expect(screen.getByText("Cached work")).toBeInTheDocument();
	expect(mockCheck).not.toHaveBeenCalled();
	expect(mockSync).not.toHaveBeenCalled();
	Object.defineProperty(document, "visibilityState", {
		configurable: true,
		value: "visible",
	});
	await act(async () => {
		document.dispatchEvent(new Event("visibilitychange"));
	});
	expect(mockCheck).toHaveBeenCalledTimes(1);
});

it("stops polling an inactive project and checks it again on return", async () => {
	const view = render(
		<RetainedView active>
			<Harness />
		</RetainedView>,
	);
	await flush();
	view.rerender(
		<RetainedView active={false}>
			<Harness />
		</RetainedView>,
	);
	await act(async () => {
		jest.advanceTimersByTime(60000);
	});
	expect(mockCheck).toHaveBeenCalledTimes(1);
	view.rerender(
		<RetainedView active>
			<Harness />
		</RetainedView>,
	);
	await flush();
	expect(mockCheck).toHaveBeenCalledTimes(2);
	expect(screen.getByText("Cached work")).toBeVisible();
});

it("updates the visible cached row from a delta and keeps displaying it while offline", async () => {
	render(<Harness />);
	await flush();
	mockCheck.mockResolvedValue({
		status: "ok",
		siteId: "site",
		revisions: { ...revisions, rows: "two" },
	});
	const delta: ZtcWorkspaceDelta = {
		status: "delta",
		siteId: "site",
		sync: {
			version: 1,
			siteId: "site",
			revisions: { ...revisions, rows: "two" },
		},
		rowVersions: { row: "two" },
		mediaVersions: {},
		changedRows: [{ id: "row", Date: "2026-11-06", Works: "Updated work" }],
		deletedRowIds: [],
		changedMedia: [],
		deletedMediaKeys: [],
	};
	mockSync.mockResolvedValue(delta);
	await act(async () => {
		window.dispatchEvent(new Event("online"));
	});
	expect(screen.getByText("Updated work")).toBeVisible();
	expect(mockSync).toHaveBeenCalledTimes(1);
	mockCheck.mockRejectedValueOnce(new Error("Offline"));
	await act(async () => {
		jest.advanceTimersByTime(15000);
	});
	expect(screen.getByText("Updated work")).toBeVisible();
	expect(mockSync).toHaveBeenCalledTimes(1);
});
