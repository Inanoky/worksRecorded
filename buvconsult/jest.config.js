/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
   testMatch: [
    '**/?(*.)+(test).[tj]s',   // 👈 only .test.ts / .test.js
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'], // 👈 add this

};

module.exports = config;
