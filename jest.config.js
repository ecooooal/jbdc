/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Domain suites only in this slice: real modules, real files, no mocks.
  testEnvironment: 'node',
  // Expo's preset installs lazy React Native globals (fetch, URL,
  // structuredClone) that Jest's Node environment touches between tests, where
  // a lazy require is illegal. Resolve them during setup.
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.test.tsx'],
};
