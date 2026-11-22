/** @jest-environment node */

import type { FimaForma2Workspace } from "@/flows/default-construction/lib/forma2-results";
import { createFimaForma2Resource } from "./forma2-resource";

const workspace: FimaForma2Workspace = {
	siteId: "olaine",
	organizationLanguage: "lv",
	input: {
		siteName: "Olaine",
		document: null,
		clientCosts: { positions: [], sources: [], allocations: [] },
		actCoverage: {
			caseId: "123",
			documentId: "estimate",
			acts: [],
			assignments: [],
			workDetails: [],
			bisWorkIdsByRecord: [],
		},
	},
	diary: {},
};

it("uses the scoped disk snapshot before a conditional request completes", async () => {
	let complete!: (response: Response) => void;
	const request = jest
		.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
		.mockImplementation(
			() =>
				new Promise((resolve) => {
					complete = resolve;
				}),
		);
	const disk = {
		read: async () => ({ data: workspace, etag: '"old"' }),
		write: jest.fn(async () => {}),
	};
	const resource = createFimaForma2Resource(
		async () => {},
		() => disk,
		request,
	);
	const loading = resource.load("olaine");
	await Promise.resolve();
	await Promise.resolve();
	expect(resource.get("olaine").snapshot?.data).toBe(workspace);
	expect(request).toHaveBeenCalledWith(
		"/api/fima/project-forma2?project=olaine",
		{
			cache: "no-store",
			headers: { "If-None-Match": '"old"' },
		},
	);
	complete(new Response(null, { status: 304 }));
	await loading;
	expect(resource.get("olaine").snapshot?.data).toBe(workspace);
	expect(disk.write).not.toHaveBeenCalled();
});

it("applies saved act assignments locally and ignores an older in-flight response", async () => {
	let complete!: (response: Response) => void;
	const request = jest
		.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
		.mockResolvedValueOnce(Response.json(workspace))
		.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					complete = resolve;
				}),
		);
	const resource = createFimaForma2Resource(async () => {}, undefined, request);
	await resource.load("olaine");
	const older = resource.load("olaine");
	const assignments = [{ actKey: "act", positionId: "position" }];
	resource.patchAssignments("olaine", {
		caseId: "123",
		documentId: "estimate",
		assignments,
	});
	expect(
		resource.get("olaine").snapshot?.data.input.actCoverage?.assignments,
	).toEqual(assignments);
	complete(Response.json(workspace));
	await older;
	expect(
		resource.get("olaine").snapshot?.data.input.actCoverage?.assignments,
	).toEqual(assignments);
	expect(request).toHaveBeenCalledTimes(2);
});
