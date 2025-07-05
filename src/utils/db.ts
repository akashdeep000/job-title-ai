
import { sql } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { jobTable, uniqueJobTable } from '../db/schema.js';

export const resetDatabase = async (type: 'full' | 'processed') => {
  switch (type) {
    case 'full':
      await db.delete(jobTable);
      await db.delete(uniqueJobTable);
      break;
    case 'processed':
      await db.update(uniqueJobTable)
        .set({
          status: 'pending',
          jobFunction: null,
          jobSeniority: null,
          confidence: null,
        })
        .where(sql`${uniqueJobTable.status} IN ('completed', 'processing')`);
      break;
    default:
      throw new Error(`Unknown reset type: ${type}`);
  }
};
