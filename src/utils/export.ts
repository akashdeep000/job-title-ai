
import Database from 'better-sqlite3';
import { and, desc, eq, gte, sql, SQL } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as schema from '../db/schema.js';
import { getStandardizedJobTitle } from './helper.js';
import { logger } from './logger.js';

const sqlite = new Database('./local.db');
const db = drizzle(sqlite, { schema });

export const exportCsv = async (
  filePath: string,
  onProgress: (exported: number, total: number) => void,
  statusFilter?: string,
  minConfidence?: number
) => {
  logger.info(`Starting CSV export to ${filePath} with statusFilter: ${statusFilter}, minConfidence: ${minConfidence}`);
  const conditions: SQL[] = [];
  if (statusFilter) {
    conditions.push(eq(schema.uniqueJobTable.status, statusFilter as 'pending' | 'processing' | 'completed'));
  }
  if (minConfidence !== undefined) {
    conditions.push(gte(schema.uniqueJobTable.confidence, minConfidence));
  }



  const countQuery = db.select({ count: sql<number>`count(*)` }).from(schema.jobTable)
    .leftJoin(schema.uniqueJobTable, eq(schema.jobTable.uniqueJobTableId, schema.uniqueJobTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  const { sql: countSql, params: countParams } = countQuery.toSQL();
  const totalRows = (sqlite.prepare(countSql).get(...countParams) as { count: number }).count;
  let exportedRows = 0;

  const csvStream = csv.format({ headers: true });
  const writeStream = fs.createWriteStream(filePath);

  csvStream.pipe(writeStream);

  return new Promise<void>((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', (err) => {
      logger.error(`Error writing to CSV file: ${err.message}`);
      reject(err);
    });

    try {
      const selectQuery = db.select({
        id: schema.jobTable.id,
        job_title: schema.uniqueJobTable.jobTitle,
        job_function: schema.uniqueJobTable.jobFunction,
        job_seniority: schema.uniqueJobTable.jobSeniority,
        confidence: schema.uniqueJobTable.confidence,
      }).from(schema.jobTable)
        .leftJoin(schema.uniqueJobTable, eq(schema.jobTable.uniqueJobTableId, schema.uniqueJobTable.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(schema.uniqueJobTable.confidence));

      const { sql: selectSql, params: selectParams } = selectQuery.toSQL();
      const stmt = sqlite.prepare(selectSql);
      const rowsIterator = stmt.iterate(...selectParams) as IterableIterator<{ id: string; job_title: string; job_function: string; job_seniority: string; confidence: number }>;

      (async () => {
        for await (const row of rowsIterator) {
          csvStream.write({
            ...row,
            standardized_job_title: row.job_seniority ? getStandardizedJobTitle(row.job_seniority, row.job_function, row.job_title) : null,
          });
          exportedRows++;
          if (exportedRows % 1000 === 0 || exportedRows === totalRows) {
            onProgress(exportedRows, totalRows);
          }
        }
        logger.info('CSV export completed.');
        csvStream.end();
      })().catch((err) => {
        logger.error(`Error during CSV export stream: ${err.message}`);
        reject(err);
      });

    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error preparing CSV export query: ${error.message}`);
      } else {
        logger.error(`An unknown error occurred during CSV export preparation.`);
      }
      reject(error);
    }
  });
};
