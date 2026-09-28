import { fireEvent, render, screen } from "@testing-library/react";
import { Tabs } from "@/components/ui/tabs";
import { VisualTab } from "./VisualTab";

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
	return (
		<Tabs value={active ? "visual" : "list"}>
			<VisualTab key={siteId} siteId={siteId} active={active} />
		</Tabs>
	);
}

beforeEach(() => jest.clearAllMocks());

it("loads only on the first visit and preserves location without remounting between tabs", async () => {
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
