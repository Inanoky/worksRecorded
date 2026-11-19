const base = require("./jest.config.js");

module.exports = {
	...base,
	testPathIgnorePatterns: ["/node_modules/"],
	testMatch: ["<rootDir>/test/meta-image-*.test.ts"],
};
