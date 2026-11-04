import { act, fireEvent, render } from "@testing-library/react";
import type { DrawingTiles } from "./drawing-tiles";
import { VisualDrawingTiles } from "./VisualDrawingTiles";
import type { VisualClientCache } from "./visual-client-cache";

const tiles: DrawingTiles = {
	version: 1,
	size: 1024,
	levels: [
		{ width: 1024, height: 512, urls: ["/overview-tile"] },
		{ width: 2048, height: 1024, urls: ["/left-tile", "/right-tile"] },
	],
};

it("keeps the old tiles through the zoom until all visible replacements can be painted", async () => {
	const create = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
	const revoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
	const revokeObjectURL = jest.fn();
	let nextUrl = 0;
	Object.defineProperty(URL, "createObjectURL", {
		configurable: true,
		value: () => `blob:${++nextUrl}`,
	});
	Object.defineProperty(URL, "revokeObjectURL", {
		configurable: true,
		value: revokeObjectURL,
	});
	const responses = new Map<string, (blob: Blob) => void>();
	const cache = {
		loadDrawingTile: jest.fn(
			(_url: string, _page: number, level: number, ordinal: number) =>
				new Promise<Blob>((resolve) =>
					responses.set(`${level}:${ordinal}`, resolve),
				),
		),
	} as unknown as VisualClientCache;
	const drawing = (scale: number) => (
		<VisualDrawingTiles
			tiles={tiles}
			cache={cache}
			url="/drawing"
			page={1}
			pageWidth={800}
			pageHeight={400}
			view={{
				camera: { x: scale === 1 ? 0 : -400, y: 0, scale },
				width: 800,
				height: 400,
			}}
		/>
	);
	const { container, rerender, unmount } = render(drawing(1));
	const image = (key: string) =>
		container.querySelector<HTMLImageElement>(`[data-drawing-tile="${key}"]`);
	const receive = async (key: string) => {
		await act(async () => responses.get(key)?.(new Blob()));
		const tile = image(key);
		if (!tile) throw new Error(`Missing tile ${key}`);
		return tile;
	};
	const painted = (tile: HTMLImageElement) => {
		Object.defineProperties(tile, {
			complete: { value: true },
			naturalWidth: { value: 1024 },
		});
		fireEvent.load(tile);
	};
	try {
		const original = await receive("0:0");
		painted(original);
		rerender(drawing(2));
		expect(image("0:0")).toBe(original);
		painted(await receive("1:0"));
		expect(image("0:0")).toBe(original);
		const right = await receive("1:1");
		expect(image("0:0")).toBe(original);
		expect(revokeObjectURL).not.toHaveBeenCalled();
		painted(right);
		expect(image("0:0")).toBeNull();
		expect(image("1:1")).toBe(right);
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:1");
	} finally {
		unmount();
		if (create) Object.defineProperty(URL, "createObjectURL", create);
		else Reflect.deleteProperty(URL, "createObjectURL");
		if (revoke) Object.defineProperty(URL, "revokeObjectURL", revoke);
		else Reflect.deleteProperty(URL, "revokeObjectURL");
	}
});
