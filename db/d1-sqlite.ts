import type { DatabaseSync, StatementSync } from "node:sqlite";
import { applySqliteMigrations, openSqliteDatabase, seedSqlite } from "./sqlite";

type BindValue = string | number | bigint | boolean | null | ArrayBuffer | ArrayBufferView;

function normalize(value: BindValue): string | number | bigint | Uint8Array | null {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return value;
}

class SqlitePreparedStatement {
  private values: BindValue[] = [];
  constructor(private readonly statement: StatementSync) {}
  bind(...values: BindValue[]) { this.values = values; return this; }
  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const row = this.statement.get(...this.values.map(normalize)) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (column ? row[column] : { ...row }) as T;
  }
  async all<T = Record<string, unknown>>() {
    const rows = this.statement.all(...this.values.map(normalize)) as Record<string, unknown>[];
    return { results: rows.map((row) => ({ ...row }) as T), success: true, meta: {} };
  }
  async run() {
    const result = this.statement.run(...this.values.map(normalize));
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) }, results: [] };
  }
  async raw<T = unknown[]>(): Promise<T[]> {
    const rows = this.statement.all(...this.values.map(normalize)) as Record<string, unknown>[];
    return rows.map((row) => Object.values(row) as T);
  }
  columnNames() { return this.statement.columns().map((column) => column.name); }
}

export class SqliteD1Database {
  constructor(private readonly database: DatabaseSync) {}
  prepare(sql: string) { return new SqlitePreparedStatement(this.database.prepare(sql)); }
  async batch(statements: SqlitePreparedStatement[]) { return Promise.all(statements.map((statement) => statement.run())); }
  async exec(sql: string) { this.database.exec(sql); return { count: 1, duration: 0 }; }
}

const globalDatabase = globalThis as typeof globalThis & { typetigerSqlite?: SqliteD1Database };

export function getSqliteD1Database() {
  if (!globalDatabase.typetigerSqlite) {
    const database = openSqliteDatabase();
    applySqliteMigrations(database);
    seedSqlite(database);
    globalDatabase.typetigerSqlite = new SqliteD1Database(database);
  }
  return globalDatabase.typetigerSqlite;
}
