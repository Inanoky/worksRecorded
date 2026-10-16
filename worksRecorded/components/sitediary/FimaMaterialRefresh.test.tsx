import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { readFimaCollaboration } from "@/lib/fima/diary-collaboration";
import { refreshFimaBisMaterials } from "@/server/actions/fima-diary-collaboration";
import { FimaMaterialRefresh } from "./FimaMaterialRefresh";

jest.mock("@/server/actions/fima-diary-collaboration", () => ({
	refreshFimaBisMaterials: jest.fn(),
}));
beforeEach(() => jest.resetAllMocks());
it("refreshes linked records in their real projects with at most two requests in flight", async () => {
	const complete: Array<() => void> = [];
	jest
		.mocked(refreshFimaBisMaterials)
		.mockImplementation(
			() =>
				new Promise((resolve) =>
					complete.push(() => resolve(readFimaCollaboration(null))),
				),
		);
	const change = jest.fn();
	render(
		<FimaMaterialRefresh
			records={[
				{ id: "1", siteId: "site-a", BISId: "111" },
				{ id: "2", siteId: "site-b", hasFimaBisReferences: true },
				{ id: "3", siteId: "site-c", BISId: "333" },
				{ id: "unlinked", siteId: "site-d" },
			]}
			onChange={change}
		/>,
	);
	expect(refreshFimaBisMaterials).toHaveBeenCalledTimes(2);
	expect(refreshFimaBisMaterials).toHaveBeenNthCalledWith(1, {
		siteId: "site-a",
		recordId: "1",
	});
	expect(refreshFimaBisMaterials).toHaveBeenNthCalledWith(2, {
		siteId: "site-b",
		recordId: "2",
	});
	await act(async () => complete[0]());
	expect(refreshFimaBisMaterials).toHaveBeenCalledTimes(3);
	await act(async () => {
		complete[1]();
		complete[2]();
	});
	expect(change).toHaveBeenCalledTimes(3);
	expect(
		screen.getByRole("button", { name: "Atjaunot ierakstu materiālus no BIS" }),
	).toBeEnabled();
});
it("uses fresh cached material lists and allows a manual refresh", async () => {
	jest
		.mocked(refreshFimaBisMaterials)
		.mockResolvedValue(readFimaCollaboration(null));
	render(
		<FimaMaterialRefresh
			siteId="project"
			records={[
				{
					id: "record",
					BISId: "123",
					fimaCollaboration: {
						...readFimaCollaboration(null),
						bisMaterials: {
							fetchedAt: new Date().toISOString(),
							entries: [{ bisId: "123", caseId: "456", materials: [] }],
						},
					},
				},
			]}
			onChange={jest.fn()}
		/>,
	);
	expect(refreshFimaBisMaterials).not.toHaveBeenCalled();
	fireEvent.click(
		screen.getByRole("button", { name: "Atjaunot ierakstu materiālus no BIS" }),
	);
	await waitFor(() =>
		expect(refreshFimaBisMaterials).toHaveBeenCalledWith({
			siteId: "project",
			recordId: "record",
		}),
	);
});
it("reports BIS failure and stops scheduling additional requests", async () => {
	jest
		.mocked(refreshFimaBisMaterials)
		.mockRejectedValue(new Error("BIS nav pieejams"));
	render(
		<FimaMaterialRefresh
			siteId="project"
			records={[1, 2, 3, 4].map((id) => ({
				id: String(id),
				BISId: String(id),
			}))}
			onChange={jest.fn()}
		/>,
	);
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"BIS nav pieejams",
	);
	expect(refreshFimaBisMaterials).toHaveBeenCalledTimes(2);
});

it("refreshes a missing record number even when the material cache is fresh", async () => {
	jest
		.mocked(refreshFimaBisMaterials)
		.mockResolvedValue(readFimaCollaboration(null));
	render(
		<FimaMaterialRefresh
			siteId="project"
			records={[
				{
					id: "record",
					BISId: "123",
					fimaBisRecords: [{ id: "123", number: null }],
					fimaCollaboration: {
						...readFimaCollaboration(null),
						bisMaterials: {
							fetchedAt: new Date().toISOString(),
							entries: [{ bisId: "123", caseId: "456", materials: [] }],
						},
					},
				},
			]}
			onChange={jest.fn()}
		/>,
	);
	await waitFor(() =>
		expect(refreshFimaBisMaterials).toHaveBeenCalledWith({
			siteId: "project",
			recordId: "record",
		}),
	);
});
