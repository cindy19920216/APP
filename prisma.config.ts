import path from "path";
import { defineConfig } from "prisma/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbPath = path.join(process.cwd(), "prisma", "herencia.db");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: `file:${dbPath}`,
  },
});

// Adapter for runtime use (referenced in db.ts separately)
export function createAdapter() {
  return new PrismaBetterSqlite3({ url: `file:${dbPath}` });
}
