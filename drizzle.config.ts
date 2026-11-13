import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/features/database/schema.ts',
  out: './src/features/database/migrations',
  dialect: 'sqlite',
  // Bundled into the app by babel-plugin-inline-import; see src/features/database/lib/port.ts.
  driver: 'expo',
});
