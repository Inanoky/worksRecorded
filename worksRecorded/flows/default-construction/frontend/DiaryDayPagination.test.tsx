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
