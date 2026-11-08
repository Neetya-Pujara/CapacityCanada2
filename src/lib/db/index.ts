import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not configured. Add the Tiger Data connection string to .env.local.");
    this.name = "DatabaseNotConfiguredError";
  }
}

let client: ReturnType<typeof postgres> | undefined;
let database: PostgresJsDatabase<typeof schema> | undefined;

export function getDb(): PostgresJsDatabase<typeof schema> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new DatabaseNotConfiguredError();

  if (!database) {
    client = postgres(connectionString, {
      ssl: "require",
      max: 1,
      connect_timeout: 10,
      idle_timeout: 20,
      prepare: false,
    });
    database = drizzle(client, { schema });
  }
  return database;
}

export async function closeDb(): Promise<void> {
  if (client) {
    const activeClient = client;
    client = undefined;
    database = undefined;
    await activeClient.end();
  }
}
