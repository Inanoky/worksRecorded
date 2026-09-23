"use client";

import { useState } from "react";

export function useDiaryDayPagination<T>(
	groups: T[],
	filterKey: string,
	pageSize = 10,
) {
	const [selection, setSelection] = useState({ filterKey, page: 1 });
	const totalPages = Math.max(1, Math.ceil(groups.length / pageSize));
	const page =
		selection.filterKey === filterKey
			? Math.min(selection.page, totalPages)
			: 1;
	if (selection.filterKey !== filterKey || selection.page !== page)
		setSelection({ filterKey, page });
	const setPage = (value: number) =>
		setSelection({ filterKey, page: Math.max(1, Math.min(value, totalPages)) });
	return {
		page,
		setPage,
		totalPages,
		totalCount: groups.length,
		first: groups.length ? (page - 1) * pageSize + 1 : 0,
		last: Math.min(page * pageSize, groups.length),
		groups: groups.slice((page - 1) * pageSize, page * pageSize),
	};
}
