
import Database from 'better-sqlite3';
import { and, desc, eq, gte, sql, SQL } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as schema from '../db/schema.js';
import { jobTitles } from '../db/schema.js';

const sqlite = new Database('./local.db');
const db = drizzle(sqlite, { schema });

export const exportCsv = async (
  filePath: string,
  onProgress: (exported: number, total: number) => void,
  statusFilter?: string,
  minConfidence?: number
) => {
  const conditions: SQL[] = [];
  if (statusFilter) {
    conditions.push(eq(jobTitles.status, statusFilter as 'pending' | 'processing' | 'completed' | 'failed'));
  }
  if (minConfidence !== undefined) {
    conditions.push(gte(jobTitles.confidence, minConfidence));
  }



  const countQuery = db.select({ count: sql<number>`count(*)` }).from(jobTitles)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  const totalRows = (await countQuery.execute())[0].count;
  let exportedRows = 0;

  const csvStream = csv.format({ headers: true });
  const writeStream = fs.createWriteStream(filePath);

  csvStream.pipe(writeStream);

  return new Promise<void>((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);

    try {
      const selectQuery = db.select({
        id: jobTitles.id,
        job_title: jobTitles.jobTitle,
        job_function: jobTitles.jobFunction,
        job_seniority: jobTitles.jobSeniority,
        standardized_job_title: jobTitles.standardizedJobTitle,
        confidence: jobTitles.confidence,
      }).from(jobTitles)
        .where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(jobTitles.confidence));

      const { sql: selectSql, params: selectParams } = selectQuery.toSQL();
      const stmt = sqlite.prepare(selectSql);
      const rowsIterator = stmt.iterate(...selectParams);

      (async () => {
        for await (const row of rowsIterator) {
          csvStream.write(row);
          exportedRows++;
          if (exportedRows % 1000 === 0 || exportedRows === totalRows) {
            onProgress(exportedRows, totalRows);
          }
        }
        csvStream.end();
      })().catch(reject);

    } catch (error) {
      reject(error);
    }
  });
};
