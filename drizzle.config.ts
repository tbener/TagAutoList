import { defineConfig } from "drizzle-kit";
import { dbUrl } from "./src/db/url";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: dbUrl(process.env.DATABASE_URL)! },
});
