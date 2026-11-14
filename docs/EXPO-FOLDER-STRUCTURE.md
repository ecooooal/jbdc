# Application Folder Structure
- `src/app` is routing only: each file maps a route to a screen. A screen's UI is a component in `features/<feature>/components`, and the route file renders it through the feature's entry point.
- `src/features` contains the application's features as deep modules
- For headless components refer to `src/shared/components/ui`. They are from react native reusables. Use them to create ui components. But do not update these components, if required build one on top of it instead.
- Use uniwind for CSS and LucideIcons for application icons.