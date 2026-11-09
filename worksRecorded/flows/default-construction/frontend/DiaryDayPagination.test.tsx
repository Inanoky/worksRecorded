import {
	act,
	fireEvent,
	render,
	renderHook,
	screen,
} from "@testing-library/react";
import { DiaryDayPagination } from "./DiaryDayPagination";
import { useDiaryDayPagination } from "./useDiaryDayPagination";

const groups = Array.from({ length: 23 }, (_, index) => ({
	key: `day-${index}`,
	rows: Array.from({ length: 9 }, () => ({})),
}));

it("paginates complete days locally and resets when filters change", () => {
	const { result, rerender } = renderHook(
		({ key, days }) => useDiaryDayPagination(days, key),
		{ initialProps: { key: "site-1:all", days: groups } },
	);
	expect(result.current.groups).toEqual(groups.slice(0, 10));
	act(() => result.current.setPage(2));
	expect(result.current.groups).toEqual(groups.slice(10, 20));
	expect(result.current.groups[0].rows).toHaveLength(9);
	rerender({ key: "site-1:filter", days: groups.slice(0, 1) });
	expect(result.current.page).toBe(1);
	rerender({ key: "site-1:all", days: groups });
	expect(result.current.page).toBe(1);
	act(() => result.current.setPage(3));
	expect(result.current.groups).toHaveLength(3);
	rerender({ key: "site-1:all", days: [] });
	expect(result.current).toMatchObject({
		page: 1,
		first: 0,
		last: 0,
		totalCount: 0,
		totalPages: 1,
	});
});

it("navigates with accessible client buttons and correct boundaries", () => {
	function Diary() {
		const state = useDiaryDayPagination(groups, "all");
		return (
			<DiaryDayPagination
				{...state}
				onPageChange={state.setPage}
				onExpandFirstPage={state.expandFirstPage}
				language="lv"
				disabled={false}
			/>
		);
	}
	render(<Diary />);
	expect(screen.getByRole("button", { name: "Iepriekšējā" })).toBeDisabled();
	fireEvent.click(screen.getByRole("button", { name: "Nākamā" }));
	expect(screen.getByText("Dienas 11–20 no 23")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Nākamā" }));
	expect(screen.getByRole("button", { name: "Nākamā" })).toBeDisabled();
});

it("shows three recent days before explicitly revealing the rest of the first page", () => {
	function Diary() {
		const state = useDiaryDayPagination(groups, "construction", 10, 3);
		return (
			<>
				<span>{state.groups.map((group) => group.key).join(",")}</span>
				<DiaryDayPagination
					{...state}
					totalRecords={328}
					onPageChange={state.setPage}
					onExpandFirstPage={state.expandFirstPage}
					language="en"
					disabled={false}
				/>
			</>
		);
	}
	render(<Diary />);
	expect(screen.getByText("day-0,day-1,day-2")).toBeInTheDocument();
	expect(screen.getByText("Days 1–3 of 23 · 328 records")).toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
	fireEvent.click(screen.getByRole("button", { name: "Show 7 more days" }));
	expect(
		screen.getByText(groups.slice(0, 10).map((group) => group.key).join(",")),
	).toBeInTheDocument();
	expect(screen.getByText("Days 1–10 of 23 · 328 records")).toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
});
