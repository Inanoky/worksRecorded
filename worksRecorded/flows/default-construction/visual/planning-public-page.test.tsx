import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import Page, { metadata } from "@/app/shared/work/[token]/page";
import { loadPublicVisualWork } from "./planning-share-store";

jest.mock("./planning-share-store", () => ({
	loadPublicVisualWork: jest.fn(),
}));
jest.mock("next/navigation", () => ({
	notFound: jest.fn(() => {
		throw new Error("Not found");
	}),
}));
it("renders phone-friendly work images using revocable same-origin URLs without leaking storage URLs", async () => {
	jest.mocked(loadPublicVisualWork).mockResolvedValue({
		work: "XPS",
		location: "1. stāvs",
		section: "A",
		quantity: 50,
		unit: "m2",
		startDate: "2026-10-16",
		endDate: "2026-10-17",
		images: [
			{
				page: 1,
				url: "https://files.ufs.sh/f/private-storage-key",
				key: "private-storage-key",
			},
		],
		tokenHash: "private-hash",
	} as never);
	const { container } = render(
		await Page({ params: Promise.resolve({ token: "public-token" }) }),
	);
	expect(screen.getByRole("heading", { name: "XPS" })).toBeVisible();
	expect(screen.getByRole("img")).toHaveAttribute(
		"src",
		"/api/public/visual-work/public-token/image/1",
	);
	expect(screen.getByRole("link")).toHaveAttribute(
		"href",
		"/api/public/visual-work/public-token/image/1",
	);
	expect(container.innerHTML).not.toMatch(
		/private-storage-key|private-hash|dashboard|\.pdf/,
	);
	expect(metadata.robots).toMatchObject({ index: false, follow: false });
});
it("does not render a missing or revoked share", async () => {
	jest.mocked(loadPublicVisualWork).mockResolvedValue(null);
	await expect(
		Page({ params: Promise.resolve({ token: "revoked" }) }),
	).rejects.toThrow("Not found");
	expect(notFound).toHaveBeenCalled();
});
