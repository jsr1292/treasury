import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Database is optional — only connect if DATABASE_URL is set
let client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

export function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not configured. Use API connector or set DATABASE_URL.');
    }
    client = postgres(process.env.DATABASE_URL, {
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connect_timeout: 10,
    });
    _db = drizzle(client, { schema });
  }
  return _db;
}

// Legacy export — throws if no DB
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    if (!isDbAvailable()) return () => []; // Return no-op for any query
    const realDb = getDb();
    return (realDb as any)[prop];
  },
});
