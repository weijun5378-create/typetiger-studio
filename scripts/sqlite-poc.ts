import { rmSync } from "node:fs";
import { applySqliteMigrations, openSqliteDatabase, resolveSqlitePath, seedSqlite, sqliteHealth } from "../db/sqlite";

const reset = process.argv.includes("--reset");
const filename = resolveSqlitePath();
if (reset) for (const suffix of ["", "-shm", "-wal"]) rmSync(`${filename}${suffix}`, { force: true });
const database = openSqliteDatabase(filename);
try {
  applySqliteMigrations(database);
  seedSqlite(database);
  console.log(JSON.stringify({ database: filename, ...sqliteHealth(database) }, null, 2));
} finally {
  database.close();
}
