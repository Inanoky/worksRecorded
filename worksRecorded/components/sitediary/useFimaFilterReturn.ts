"use client";

import { type RefObject, useCallback, useRef } from "react";

type Position = {
	page: number;
	x: number;
	y: number;
	tables: { left: number; top: number }[];
};

export function useFimaFilterReturn(
	scope: string | null,
	container: RefObject<HTMLElement | null>,
) {
	const state = useRef<{
		scope: string | null;
		origin: Position | null;
		pending: Position | null;
	}>({ scope, origin: null, pending: null });
	const change = useCallback(
		(wasFiltered: boolean, filtered: boolean, page: number) => {
			if (state.current.scope !== scope)
				state.current = { scope, origin: null, pending: null };
			state.current.pending = null;
			if (!wasFiltered && filtered) {
				state.current.origin = {
					page,
					x: window.scrollX,
					y: window.scrollY,
					tables: Array.from(
						container.current?.querySelectorAll<HTMLElement>(
							'[data-slot="table-container"]',
						) ?? [],
					).map((table) => ({ left: table.scrollLeft, top: table.scrollTop })),
				};
			}
			if (!filtered) {
				if (wasFiltered && state.current.origin) {
					state.current.pending = state.current.origin;
					return state.current.origin.page;
				}
				return page;
			}
			return 1;
		},
		[scope, container],
	);
	const restore = useCallback(() => {
		if (state.current.scope !== scope || !state.current.pending) return;
		const position = state.current.pending;
		state.current.pending = null;
		state.current.origin = null;
		container.current
			?.querySelectorAll<HTMLElement>('[data-slot="table-container"]')
			.forEach((table, index) => {
				const saved = position.tables[index];
				if (!saved) return;
				table.scrollLeft = saved.left;
				table.scrollTop = saved.top;
			});
		window.scrollTo({ left: position.x, top: position.y, behavior: "instant" });
	}, [scope, container]);
	return { change, restore };
}
