const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Mechanical boundaries from AGENTS.md and docs/EXPO-DB.md. Patterns match the
// import specifier, so they cover both `@/features/...` and relative paths
// that cross into another feature package.
const boundaryRules = {
  entryPoints: {
    group: ['**/features/*/lib/**', '**/features/*/tests/**'],
    message: 'Import the feature package entry point, not its lib/ or tests/.',
  },
  expoSqlite: {
    group: ['expo-sqlite'],
    message: 'Only src/features/database/expo.ts may import expo-sqlite.',
  },
  betterSqlite3: {
    group: ['better-sqlite3'],
    message: 'Tests only: use @/features/database/testing.',
  },
};

function restrictedImports(exempt = []) {
  return [
    'error',
    {
      patterns: Object.entries(boundaryRules)
        .filter(([name]) => !exempt.includes(name))
        .map(([, rule]) => rule),
    },
  ];
}

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'src/features/database/migrations/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports(),
    },
  },
  {
    files: ['src/features/database/expo.ts'],
    rules: {
      'no-restricted-imports': restrictedImports(['expoSqlite']),
    },
  },
  {
    files: ['src/features/database/lib/better-sqlite3-driver.ts'],
    rules: {
      'no-restricted-imports': restrictedImports(['betterSqlite3']),
    },
  },
]);
