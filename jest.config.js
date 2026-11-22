/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  // Domain suites use the Node environment; render suites run on RNTL here too.
  testEnvironment: "node",
  // Expo's preset installs lazy React Native globals (fetch, URL,
  // structuredClone) that Jest's Node environment touches between tests, where
  // a lazy require is illegal. Resolve them during setup.
  setupFiles: ["<rootDir>/jest.setup.js"],
  // The preset whitelists pnpm's inner `node_modules` only for React Native
  // packages. Render tests also pull JSX/ESM from the UI kit, so add the
  // packages our components import directly.
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@rn-primitives|lucide-react-native|uniwind))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
  testMatch: ["<rootDir>/**/*.test.ts", "<rootDir>/**/*.test.tsx"],
};
