jest.mock("./actions", () => ({ getFimaWorkspace: jest.fn() }));
jest.mock("./operations", () => ({ executeFimaBis: jest.fn() }));

import { getFimaWorkspace } from "./actions";
import { fimaRpc } from "./rpc";

test("returns actionable errors instead of a production server-action digest", async () => {
	jest
		.mocked(getFimaWorkspace)
		.mockRejectedValueOnce(new Error("Atjaunojiet BIS savienojumu"));
	expect(await fimaRpc("getFimaWorkspace", [])).toEqual({
		ok: false,
		error: "Atjaunojiet BIS savienojumu",
	});
});
test("does not expose raw database error messages", async () => {
	jest
		.mocked(getFimaWorkspace)
		.mockRejectedValueOnce({ code: "P2002", message: "internal SQL" });
	const result = await fimaRpc("getFimaWorkspace", []);
	expect(result.ok).toBe(false);
	expect(JSON.stringify(result)).not.toContain("internal SQL");
});
test("rejects inherited or unknown handlers", async () => {
	expect(await fimaRpc("constructor" as never, [])).toEqual({
		ok: false,
		error: "Nederīga FIMA darbība",
	});
});
