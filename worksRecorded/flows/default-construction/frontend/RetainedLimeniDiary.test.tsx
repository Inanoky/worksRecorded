import { act, fireEvent, render, screen } from "@testing-library/react";
import ConstructionJournalLoading from "@/app/dashboard/sites/[siteId]/dashboard/loading";
import ProjectLoading from "@/app/dashboard/sites/[siteId]/loading";
import {
	ClearRetainedDiary,
	RegisterLimeniDiary,
	RetainedLimeniDiary,
} from "./RetainedLimeniDiary";

let mockPathname = "/dashboard/sites/site/dashboard";
const mockMount = jest.fn();
const mockUnmount = jest.fn();
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname }));
jest.mock("@/components/sitediary/SiteDiaryList", () => {
	const React = jest.requireActual<typeof import("react")>("react");
	return {
		__esModule: true,
		default: function Diary({
			active,
			limeniClientDiary,
		}: {
			active: boolean;
			limeniClientDiary: boolean;
		}) {
			const [filter, setFilter] = React.useState("");
			React.useEffect(() => {
				mockMount(limeniClientDiary);
				return mockUnmount;
			}, [limeniClientDiary]);
			return (
				<input
					aria-label="Diary filter"
					data-active={active}
					value={filter}
					onChange={(event) => setFilter(event.target.value)}
				/>
			);
		},
	};
});

function Fallback() {
	return (
		<>
			<ConstructionJournalLoading />
			<ProjectLoading />
		</>
	);
}
function Project({
	section = "dashboard",
	siteId = "site",
	userId = "user",
	organizationId = "limeni",
	registered = true,
	clear = false,
}: {
	section?: string;
	siteId?: string;
	userId?: string;
	organizationId?: string;
	registered?: boolean;
	clear?: boolean;
}) {
	mockPathname = `/dashboard/sites/${siteId}/${section}`;
	return (
		<RetainedLimeniDiary key={siteId} siteId={siteId}>
			{section === "dashboard" && registered ? (
				<RegisterLimeniDiary
					siteId={siteId}
					userId={userId}
					organizationId={organizationId}
					bisEnabled={false}
					organizationLanguage="lv"
				/>
			) : null}
			{clear ? <ClearRetainedDiary /> : null}
			<Fallback />
		</RetainedLimeniDiary>
	);
}

beforeEach(() => {
	jest.clearAllMocks();
	window.scrollTo = jest.fn();
});

it("does not load a diary just by opening another project section", () => {
	render(<Project section="izpildshemas" />);
	expect(mockMount).not.toHaveBeenCalled();
	expect(screen.queryByLabelText("Diary filter")).not.toBeInTheDocument();
});

it("preserves diary state and loaded component when leaving and returning, including while the route loads", async () => {
	const { rerender } = render(<Project />);
	const input = await screen.findByLabelText("Diary filter");
	fireEvent.change(input, { target: { value: "1. stāvs" } });
	expect(mockMount).toHaveBeenCalledWith(true);
	rerender(<Project section="izpildshemas" />);
	expect(input).not.toBeVisible();
	expect(input).toHaveAttribute("data-active", "false");
	expect(mockUnmount).not.toHaveBeenCalled();
	rerender(<Project registered={false} />);
	expect(input).toBeVisible();
	expect(
		screen.queryByLabelText("Ielādē būvdarbu žurnālu…"),
	).not.toBeInTheDocument();
	expect(document.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
	rerender(<Project />);
	expect(screen.getByLabelText("Diary filter")).toBe(input);
	expect(input).toHaveValue("1. stāvs");
	expect(mockMount).toHaveBeenCalledTimes(1);
});

it.each(["siteId", "userId", "organizationId"] as const)(
	"resets diary state when %s changes",
	async (field) => {
		const { rerender } = render(<Project />);
		fireEvent.change(await screen.findByLabelText("Diary filter"), {
			target: { value: "old" },
		});
		rerender(<Project {...{ [field]: "other" }} />);
		expect(await screen.findByLabelText("Diary filter")).toHaveValue("");
		expect(mockUnmount).toHaveBeenCalledTimes(1);
	},
);

it("clears the retained diary if the server no longer selects the Limeni flow", async () => {
	const { rerender } = render(<Project />);
	await screen.findByLabelText("Diary filter");
	rerender(<Project registered={false} clear />);
	expect(screen.queryByLabelText("Diary filter")).not.toBeInTheDocument();
});

it("keeps the normal loading overlay for an unvisited diary", () => {
	render(<Project registered={false} />);
	expect(screen.getByLabelText("Ielādē būvdarbu žurnālu…")).toBeVisible();
});

it("restores the diary scroll position on return", async () => {
	const { rerender } = render(<Project />);
	await screen.findByLabelText("Diary filter");
	Object.defineProperty(window, "scrollY", { configurable: true, value: 350 });
	fireEvent.scroll(window);
	rerender(<Project section="izpildshemas" />);
	const frame = jest
		.spyOn(window, "requestAnimationFrame")
		.mockImplementation((callback) => {
			callback(0);
			return 1;
		});
	await act(async () => rerender(<Project />));
	expect(window.scrollTo).toHaveBeenCalledWith(0, 350);
	frame.mockRestore();
});
