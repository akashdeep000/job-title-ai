import { inArray, sql } from 'drizzle-orm';
import * as csv from 'fast-csv';
import * as fs from 'fs';
import { parentPort } from 'worker_threads';
import { db } from '../db/connection.js';
import { jobTable, uniqueJobTable } from '../db/schema.js';
import { logger } from './logger.js';

const INGEST_BATCH_SIZE = 5000;

type CsvRow = { id: string; job_title: string };

const processBatch = async (batch: CsvRow[]) => {
    if (batch.length === 0) return;

    logger.info(`Worker: Processing batch of ${batch.length} rows...`);

    // 1. Extract unique job titles from the batch
    const uniqueTitles = [...new Set(batch.map(row => row.job_title).filter(title => title))];
    if (uniqueTitles.length === 0) return;

    // 2. Insert unique titles into uniqueJobTable
    const uniqueJobValues = uniqueTitles.map(title => ({ jobTitle: title }));
    await db.insert(uniqueJobTable).values(uniqueJobValues).onConflictDoNothing();

    // 3. Retrieve the IDs of the unique jobs
    const uniqueJobs = await db.select({
        id: uniqueJobTable.id,
        jobTitle: uniqueJobTable.jobTitle,
    }).from(uniqueJobTable).where(inArray(uniqueJobTable.jobTitle, uniqueTitles));

    // 4. Create a map for quick lookup
    const titleToIdMap = new Map(uniqueJobs.map(job => [job.jobTitle, job.id]));

    // 5. Prepare the batch for the jobTable
    const jobTableValues = batch.map(row => {
        const uniqueJobTableId = titleToIdMap.get(row.job_title);
        if (uniqueJobTableId === undefined) {
            // This should not happen if the logic is correct
            logger.warn(`Could not find unique ID for job title: ${row.job_title}`);
            return null;
        }
        return {
            id: row.id,
            uniqueJobTableId,
        };
    }).filter((value): value is { id: string; uniqueJobTableId: number } => value !== null);

    // 6. Insert into jobTable
    if (jobTableValues.length > 0) {
        await db.insert(jobTable).values(jobTableValues).onConflictDoUpdate({
            target: jobTable.id,
            set: { uniqueJobTableId: sql`excluded.unique_job_table_id` },
        });
    }
};

const ingest = async (filePath: string) => {
    logger.info(`Worker: Starting CSV ingest from ${filePath}`);
    let ingestedRows = 0;
    let batch: CsvRow[] = [];

    return new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv.parse({ headers: true }))
            .on('data', async (row: CsvRow) => {
                batch.push(row);
                ingestedRows++;

                if (batch.length >= INGEST_BATCH_SIZE) {
                    await processBatch(batch);
                    parentPort?.postMessage({ status: 'progress', ingested: ingestedRows });
                    batch = [];
                }
            })
            .on('end', async () => {
                if (batch.length > 0) {
                    await processBatch(batch);
                    parentPort?.postMessage({ status: 'progress', ingested: ingestedRows });
                }
                logger.info('Worker: CSV ingest completed.');
                parentPort?.postMessage({ status: 'complete' });
                resolve();
            })
            .on('error', (err) => {
                logger.error(`Worker: Error ingesting CSV data: ${err.message}`);
                reject(err);
            });
    });
};

parentPort?.on('message', async (msg: { filePath: string }) => {
    try {
        await ingest(msg.filePath);
        parentPort?.postMessage({ status: 'complete' });
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error(`Worker: Ingestion failed: ${error}`);
        parentPort?.postMessage({ status: 'error', error });
    }
});