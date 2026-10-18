module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/api/**/*.test.js',
    '<rootDir>/tests/unit/**/*.test.js',
  ],
  setupFiles: ['<rootDir>/tests/helpers/env.js'],
  maxWorkers: 1,
  testTimeout: 120000,
};
