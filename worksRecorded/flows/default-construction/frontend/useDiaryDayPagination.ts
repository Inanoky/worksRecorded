"use client";

import { useState } from "react";
import { DIARY_DAY_PAGE_SIZE } from "../lib/diary-image-pages";

export function useDiaryDayPagination<T>(
	groups: T[],
	filterKey: string,
	pageSize = DIARY_DAY_PAGE_SIZE,
	initialPageSize = pageSize,
) {
	const [selection, setSelection] = useState({
		filterKey,
		page: 1,
		firstPageExpanded: false,
	});
	const totalPages = Math.max(1, Math.ceil(groups.length / pageSize));
	const page =
		selection.filterKey === filterKey
			? Math.min(selection.page, totalPages)
			: 1;
	const firstPageExpanded =
		selection.filterKey === filterKey && selection.firstPageExpanded;
	if (selection.filterKey !== filterKey || selection.page !== page)
		setSelection({ filterKey, page, firstPageExpanded: false });
	const setPage = (value: number) =>
		setSelection({
			filterKey,
			page: Math.max(1, Math.min(value, totalPages)),
			firstPageExpanded,
		});
	const firstPageLimit = firstPageExpanded
		? pageSize
		: Math.min(initialPageSize, pageSize);
	const start = (page - 1) * pageSize;
	const take = page === 1 ? firstPageLimit : pageSize;
	const remainingFirstPage =
		page === 1 && !firstPageExpanded
			? Math.max(0, Math.min(pageSize, groups.length) - firstPageLimit)
			: 0;
	return {
		page,
		setPage,
		expandFirstPage: () =>
			setSelection({ filterKey, page: 1, firstPageExpanded: true }),
		remainingFirstPage,
		totalPages,
		totalCount: groups.length,
		first: groups.length ? start + 1 : 0,
		last: Math.min(start + take, groups.length),
		groups: groups.slice(start, start + take),
	};
}
