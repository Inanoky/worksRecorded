const assert = require("node:assert/strict");
const test = require("node:test");
const { allocateCents } = require("./allocation.cjs");

test("conserves every source cent when room quantities change", () => {
	const shares = allocateCents(14276, [142.71, 11.04]);
	assert.equal(
		shares.reduce((sum, value) => sum + value, 0),
		14276,
	);
	assert.ok(Math.abs(shares[0] - (14276 * 142.71) / 153.75) < 1);
});

test("preserves unknown costs and negative source corrections", () => {
	assert.deepEqual(allocateCents(null, [1, 2]), [null, null]);
	assert.deepEqual(allocateCents(-101, [1, 1]), [-51, -50]);
	assert.deepEqual(allocateCents(0, [1, 2]), [0, 0]);
});

test("never allocates money to an empty measured part", () => {
	assert.deepEqual(allocateCents(301, [0, 1, 2]), [0, 100, 201]);
	assert.throws(() => allocateCents(100, [0, 0]));
	assert.throws(() => allocateCents(100, [-1, 2]));
});
