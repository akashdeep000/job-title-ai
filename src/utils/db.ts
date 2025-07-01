
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema.js';
import { jobTitles } from '../db/schema.js';

const sqlite = new Database('./local.db');
const db = drizzle(sqlite, { schema });

export const resetDatabase = async () => {
  await db.delete(jobTitles);
};
