import { fireEvent, render, screen } from "@testing-library/react";
import { getProjectNavLinks } from "@/components/dashboard/NavLinks";
let mockPathname = "/dashboard/sites/site/dashboard";
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname }));
import { VisualProjectView } from "./VisualProjectView";

const mockMount = jest.fn();
const mockUnmount = jest.fn();

jest.mock("./VisualView", () => {
	const React = jest.requireActual<typeof import("react")>("react");
	return {
		__esModule: true,
		default: function View({ siteId }: { siteId: string }) {
			const [location, setLocation] = React.useState("");
			React.useEffect(() => {
				mockMount(siteId);
				return () => mockUnmount(siteId);
			}, [siteId]);
			return (
				<input
					aria-label="Location"
					value={location}
					onChange={(event) => setLocation(event.target.value)}
				/>
			);
		},
	};
});

function Diary({
	active,
	siteId = "site",
}: {
	active: boolean;
	siteId?: string;
}) {
	mockPathname = `/dashboard/sites/${siteId}/${active ? "izpildshemas" : "BIS"}`;
	return (
		<VisualProjectView key={siteId} siteId={siteId}>
			<div>Noliktava</div>
		</VisualProjectView>
	);
}

beforeEach(() => jest.clearAllMocks());

it("loads only on the first visit and preserves location without remounting when visiting Noliktava and returning", async () => {
	const { rerender } = render(<Diary active={false} />);
	expect(mockMount).not.toHaveBeenCalled();
	expect(screen.queryByLabelText("Location")).not.toBeInTheDocument();
	rerender(<Diary active />);
	const input = await screen.findByLabelText("Location");
	fireEvent.change(input, { target: { value: "2. stāvs" } });
	rerender(<Diary active={false} />);
	expect(input).not.toBeVisible();
	expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	expect(mockUnmount).not.toHaveBeenCalled();
	rerender(<Diary active />);
	expect(screen.getByRole("textbox")).toBe(input);
	expect(input).toHaveValue("2. stāvs");
	expect(input).toBeVisible();
	expect(mockMount).toHaveBeenCalledTimes(1);
});

it("discards the previous project's view when the project changes", async () => {
	const { rerender } = render(<Diary active />);
	fireEvent.change(await screen.findByLabelText("Location"), {
		target: { value: "2. stāvs" },
	});
	rerender(<Diary active={false} siteId="other" />);
	expect(mockUnmount).toHaveBeenCalledWith("site");
	expect(screen.queryByLabelText("Location")).not.toBeInTheDocument();
	rerender(<Diary active siteId="other" />);
	expect(await screen.findByLabelText("Location")).toHaveValue("");
	expect(mockMount).toHaveBeenLastCalledWith("other");
});

it("offers Izpildshēmas only when enabled for the project", () => {
	expect(
		getProjectNavLinks("lv").some((item) => item.path === "izpildshemas"),
	).toBe(false);
	expect(
		getProjectNavLinks("lv", { showVisual: true }).find(
			(item) => item.path === "izpildshemas",
		)?.name,
	).toBe("Izpildshēmas");
});
