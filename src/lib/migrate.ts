import type Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

/** Generated SQLite migrations rebuild tables in Drizzle's transaction.
 * foreign_keys must be disabled BEFORE that transaction (changing it inside
 * is a no-op), then restored before the app serves any requests.
 * https://www.sqlite.org/lang_altertable.html#otheralter */
export function migrateDatabase(client: Database.Database, migrationsFolder = "./drizzle"): void {
  if (client.inTransaction) throw new Error("Run migrations before starting a transaction.");
  client.pragma("foreign_keys = OFF");
  try {
    migrate(drizzle(client), { migrationsFolder });
    const brokenReferences = client.pragma("foreign_key_check") as unknown[];
    if (brokenReferences.length > 0) throw new Error("Migration left invalid foreign key references; refusing to start.");
  } finally {
    client.pragma("foreign_keys = ON");
  }
}
