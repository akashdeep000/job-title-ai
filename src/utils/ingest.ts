
import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as schema from '../db/schema.js';
import { jobTitles } from '../db/schema.js';

const sqlite = new Database('./local.db');
const db = drizzle(sqlite, { schema });

const INGEST_BATCH_SIZE = 5000; // Define a batch size for ingestion

export const ingestCsv = async (filePath: string, onProgress: (ingested: number, total: number) => void) => {
  let totalRows = 0;
  let ingestedRows = 0;
  let batch: any[] = [];

  // First pass to count total rows
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true }))
      .on('data', () => totalRows++)
      .on('end', () => resolve())
      .on('error', reject);
  });

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true }))
      .on('data', async (row) => {
        batch.push({
          id: row.id,
          jobTitle: row.job_title,
        });

        if (batch.length >= INGEST_BATCH_SIZE) {
          await db.insert(jobTitles).values(batch).onConflictDoUpdate({ target: jobTitles.id, set: { jobTitle: sql`excluded.job_title`, updatedAt: sql`CURRENT_TIMESTAMP` } });
          ingestedRows += batch.length;
          onProgress(ingestedRows, totalRows);
          batch = []; // Clear the batch
        }
      })
      .on('end', async () => {
        // Insert any remaining rows in the last batch
        if (batch.length > 0) {
          await db.insert(jobTitles).values(batch).onConflictDoUpdate({ target: jobTitles.id, set: { jobTitle: sql`excluded.job_title`, updatedAt: sql`CURRENT_TIMESTAMP` } });
          ingestedRows += batch.length;
          onProgress(ingestedRows, totalRows);
        }
        resolve();
      })
      .on('error', reject);
  });
};
