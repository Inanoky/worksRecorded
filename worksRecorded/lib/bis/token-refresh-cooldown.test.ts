import { BisRefreshCooldown } from "./token-refresh-cooldown";

afterEach(() => jest.restoreAllMocks());
it("expires without extending the cooldown on reads", () => {
	const clock = jest.spyOn(Date, "now").mockReturnValue(1000);
	const cooldown = new BisRefreshCooldown();
	cooldown.fail("user", "version");
	expect(cooldown.get("user", "version")).toBe(61000);
	clock.mockReturnValue(61000);
	expect(cooldown.get("user", "version")).toBeNull();
});
it("is scoped to account and token version and can be cleared", () => {
	const cooldown = new BisRefreshCooldown();
	cooldown.fail("user", "version");
	expect(cooldown.get("other", "version")).toBeNull();
	expect(cooldown.get("user", "new-version")).toBeNull();
	cooldown.fail("user", "new-version");
	cooldown.clear("user");
	expect(cooldown.get("user", "new-version")).toBeNull();
});
it("bounds storage and evicts old entries", () => {
	const cooldown = new BisRefreshCooldown(60000, 2);
	cooldown.fail("one", "v");
	cooldown.fail("two", "v");
	cooldown.fail("three", "v");
	expect(cooldown.get("one", "v")).toBeNull();
	expect(cooldown.get("two", "v")).not.toBeNull();
});
