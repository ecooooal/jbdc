const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

// Mechanical boundaries from AGENTS.md and docs/EXPO-DB.md. Patterns match the
// raw import specifier, so they cover `@/features/...` aliases and bare
// specifiers. Relative escapes are resolved and checked by
// scripts/check-feature-boundaries.mjs in pre-commit and CI.
const boundaryRules = {
  entryPoints: {
    group: ["**/features/*/lib/**", "**/features/*/tests/**"],
    message: "Import the feature package entry point, not its lib/ or tests/.",
  },
  expoSqlite: {
    group: ["expo-sqlite"],
    message: "Only src/features/database/lib/expo-database.ts may import expo-sqlite.",
  },
  betterSqlite3: {
    group: ["better-sqlite3"],
    message: "Tests only: use @/features/database/testing.",
  },
};

// `src/app` is routing only: a route renders a screen from a feature entry
// point, so it never composes shared UI or reaches into a feature's components.
const routesOnly = {
  group: ["@/shared/components/**", "**/features/*/components/**"],
  message:
    "src/app is routing only. Render the screen from a feature entry point; its UI lives in features/<feature>/components.",
};

function restrictedImports(exempt = [], extra = []) {
  return [
    "error",
    {
      patterns: [
        ...Object.entries(boundaryRules)
          .filter(([name]) => !exempt.includes(name))
          .map(([, rule]) => rule),
        ...extra,
      ],
    },
  ];
}

// A reducer test asserts the whole effect list, so an extra or substituted
// effect fails it (docs/FRONTEND_STATE.md §Testing). Counting the list lets a
// wrong effect pass, so the count is banned on `getEffects()` itself — a
// filtered local list may still be counted.
const effectListAssertion = {
  selector:
    "CallExpression[callee.property.name='toHaveLength'][callee.object.arguments.0.callee.property.name='getEffects']",
  message:
    "Assert the whole effect list with toEqual (docs/FRONTEND_STATE.md §Testing); a length lets a substituted effect pass.",
};

const negatedEffectListAssertion = {
  selector:
    "CallExpression[callee.property.name='toHaveLength'][callee.object.object.arguments.0.callee.property.name='getEffects']",
  message:
    "Assert the whole effect list with toEqual (docs/FRONTEND_STATE.md §Testing); a length lets a substituted effect pass.",
};

// A test asserts what the Owner reads, not the shape of the element carrying
// it: `heading.props.children` still passes while every heading renders blank.
const elementShapeAssertion = {
  selector: "MemberExpression[property.name='children'][object.property.name='props']",
  message:
    "Assert the rendered text with toHaveTextContent; element.props.children reads the element's shape, not its behaviour.",
};

// Radii resolve through DESIGN.md / src/global.css (AGENTS.md), never as a
// numeric literal in a style object. The token path keeps the sheet and every
// later surface on the same scale.
const numericRadius = {
  selector:
    "Property[key.name=/^border(Top|Bottom)?(Left|Right)?Radius$/] > Literal[raw=/^\\d+(\\.\\d+)?$/]",
  message:
    "Resolve radii through DESIGN.md / src/global.css (AGENTS.md); a numeric radius is a hardcoded token.",
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "src/features/database/migrations/**"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImports(),
      "no-restricted-syntax": ["error", numericRadius],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImports([], [routesOnly]),
    },
  },
  {
    files: ["src/features/database/lib/expo-database.ts"],
    rules: {
      "no-restricted-imports": restrictedImports(["expoSqlite"]),
    },
  },
  {
    files: ["src/features/database/lib/better-sqlite3-driver.ts"],
    rules: {
      "no-restricted-imports": restrictedImports(["betterSqlite3"]),
    },
  },
  {
    files: ["**/tests/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        effectListAssertion,
        negatedEffectListAssertion,
        elementShapeAssertion,
      ],
    },
  },
]);
