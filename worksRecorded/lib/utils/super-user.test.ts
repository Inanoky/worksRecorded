import {
	canAccessFlowConfigAdmin,
	FLOW_CONFIG_ADMIN_USER_ID,
} from "@/lib/production-flow/config";
import { isSuperUserId } from "./super-user";

describe("super-user and Flow Config permissions", () => {
	const originalSuperAdmin = process.env.SUPERADMIN;

	beforeEach(() => {
		delete process.env.SUPERADMIN;
	});

	afterEach(() => {
		if (originalSuperAdmin === undefined) delete process.env.SUPERADMIN;
		else process.env.SUPERADMIN = originalSuperAdmin;
	});

	it("keeps organization switching access without granting global project access", () => {
		const userId = "kp_2f5c0987b83a4162ac8819f6339534f8";
		expect(isSuperUserId(userId)).toBe(false);
		expect(canAccessFlowConfigAdmin(userId, "www.worksrecorded.com")).toBe(
			true,
		);
	});

	it("preserves the remaining super-user's permissions", () => {
		expect(isSuperUserId(FLOW_CONFIG_ADMIN_USER_ID)).toBe(true);
		expect(
			canAccessFlowConfigAdmin(
				FLOW_CONFIG_ADMIN_USER_ID,
				"www.worksrecorded.com",
			),
		).toBe(true);
	});

	it("preserves an explicitly configured superadmin", () => {
		process.env.SUPERADMIN = " configured-admin ";
		expect(isSuperUserId("configured-admin")).toBe(true);
	});

	it.each([null, undefined, "", "regular-user"])(
		"does not grant privileges to %s",
		(userId) => {
			expect(isSuperUserId(userId)).toBe(false);
			expect(canAccessFlowConfigAdmin(userId, "www.worksrecorded.com")).toBe(
				false,
			);
		},
	);
});
