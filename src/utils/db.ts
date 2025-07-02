
import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema.js';
import { jobTitles } from '../db/schema.js';

const sqlite = new Database('./local.db');
const db = drizzle(sqlite, { schema });

export const resetDatabase = async (type: 'full' | 'processed' | 'retries') => {
  switch (type) {
    case 'full':
      await db.delete(jobTitles);
      break;
    case 'processed':
      await db.update(jobTitles)
        .set({
          status: 'pending',
          jobFunction: null,
          jobSeniority: null,
          confidence: null,
          standardizedJobTitle: null,
          retryCount: 0, // Reset retry count for processed data as well
        })
        .where(sql`${jobTitles.status} IN ('completed', 'failed')`);
      break;
    case 'retries':
      await db.update(jobTitles)
        .set({ retryCount: 0 })
        .where(sql`${jobTitles.retryCount} > 0`);
      break;
    default:
      throw new Error(`Unknown reset type: ${type}`);
  }
};
