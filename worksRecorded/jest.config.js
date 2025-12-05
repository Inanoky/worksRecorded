const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "jsdom",
  transform: {
    ...tsJestTransformCfg,
  },
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.jest.json"
    }
  },
  setupFilesAfterEnv: ['./jest.setup.ts'],
  
  moduleNameMapper: {
    // 👇 match SVGs FIRST so alias doesn't short-circuit
    '^.+\\.svg$': '<rootDir>/__mocks__/svgMock.ts',
    // keep other static assets
    '\\.(png|jpe?g|gif|webp|avif|ico|bmp)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    // 👇 alias AFTER the svg rule
    '^@/(.*)$': '<rootDir>/$1',
  },

};
