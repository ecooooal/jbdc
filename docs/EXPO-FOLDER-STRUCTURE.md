# Application Folder Structure
- `src/app` is routing only: each file maps a route to a screen. A screen's UI is a component in `features/<feature>/components`, and the route file renders it through the feature's entry point.
- `src/features` contains the application's features as deep modules
- For headless components refer to `src/shared/components/ui`. They are from react native reusables. Use them to create ui components. But do not update these components, if required build one on top of it instead.
- Use uniwind for CSS and LucideIcons for application icons. Look icon names up at https://lucide.dev/icons — never grep the bundled `lucide-react-native` types; they are generated and thousands of lines.

## Feature package anatomy

Use `src/features/library` as the reference shape:

```
features/<feature>/
  index.ts      driver-free public entry: domain functions, constants, types
  react.ts      React entry: components and hooks, for route files to import
  components/   UI owned by the feature
  lib/          private: queries, port, adapters, hooks
  tests/        private
```

- Import a feature only through its root entry points. Everything in `lib/` and `tests/` is private; `scripts/check-feature-boundaries.mjs` fails the build on an escape.
- A new feature starts as `index.ts` (plus `react.ts` when it renders) and grows `lib/` inward. Ports and adapters belong in `lib/`; screens never see them.
