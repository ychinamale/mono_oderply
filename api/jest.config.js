/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  forceExit: true,
  // Run test files sequentially to prevent parallel workers from racing on the
  // shared PostgreSQL database (e.g. one file's deleteMany wiping another's records).
  // Unlike runInBand, maxWorkers:1 keeps module isolation between files so each
  // file gets a fresh Prisma client and connection pool.
  maxWorkers: 1,
}
