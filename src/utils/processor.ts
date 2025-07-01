import Database from 'better-sqlite3';
import { and, eq, inArray, lt, or, sql, SQL } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema.js';
import { jobTitles } from '../db/schema.js';
import { classifyJobTitles, JobClassification, JobTitleInput } from './ai.js';
import { createRateLimiter } from './rateLimiter.js';

const sqlite = new Database('./local.db');
const db = drizzle(sqlite, { schema });

const MAX_RETRIES = 5;

type Job = typeof jobTitles.$inferSelect;

export const processJobTitles = async (
  onProgress: (processed: number, total: number) => void,
  batchSize: number = 10,
  requestsPerMinute: number = 60,
  minWaitBetweenBatches: number = 0,
) => {
  const rateLimiter = createRateLimiter(requestsPerMinute, minWaitBetweenBatches);
  await db.update(jobTitles).set({ status: 'pending' }).where(eq(jobTitles.status, 'processing'));
  const totalToProcessResult = await db.select({ count: sql`count(*)` }).from(jobTitles).where(or(eq(jobTitles.status, 'pending'), and(eq(jobTitles.status, 'failed'), lt(jobTitles.retryCount, MAX_RETRIES))));
  const totalCount = totalToProcessResult[0].count as number;
  let processedCount = 0;

  const processBatch = async (batch: Job[]) => {
    if (batch.length === 0) return;

    const batchIds = batch.map(j => j.id);
    const aiInputs: JobTitleInput[] = batch.map(job => ({ id: job.id, job_title: job.jobTitle }));

    try {
      const classifications = await classifyJobTitles(aiInputs);
      const classificationMap = new Map(classifications.map(c => [c.id, c]));

      const successfulUpdates: (Job & JobClassification)[] = [];
      const failedUpdates: Job[] = [];

      for (const job of batch) {
        const classification = classificationMap.get(job.id);
        if (classification) {
          successfulUpdates.push({ ...job, ...classification });
        } else {
          failedUpdates.push(job);
        }
      }

      if (successfulUpdates.length > 0) {
        const ids = successfulUpdates.map(u => u.id);

        const buildCase = (field: keyof JobClassification, updates: (Job & JobClassification)[]) => {
          const chunks: SQL[] = [sql`(case`];
          for (const update of updates) {
            chunks.push(sql`when ${jobTitles.id} = ${update.id} then ${update[field]}`);
          }
          chunks.push(sql`end)`);
          return sql.join(chunks, sql.raw(' '));
        };

        await db.update(jobTitles).set({
          jobFunction: buildCase('jobFunction', successfulUpdates),
          jobSeniority: buildCase('jobSeniority', successfulUpdates),
          confidence: buildCase('confidence', successfulUpdates),
          standardizedJobTitle: buildCase('standardizedJobTitle', successfulUpdates),
          status: 'completed',
        }).where(inArray(jobTitles.id, ids));
      }

      if (failedUpdates.length > 0) {
        const ids = failedUpdates.map(u => u.id);
        await db.update(jobTitles).set({
          status: 'failed',
          retryCount: sql`${jobTitles.retryCount} + 1`,
        }).where(inArray(jobTitles.id, ids));
      }
    } catch (error) {
      //@ts-ignore
      console.error(error.message);
      await db.update(jobTitles).set({
        status: 'failed',
        retryCount: sql`${jobTitles.retryCount} + 1`,
      }).where(inArray(jobTitles.id, batchIds));
    } finally {
      processedCount += batch.length;
      onProgress(processedCount, totalCount);
    }
  };

  const worker = async () => {
    while (true) {
      // Atomically select a batch of jobs and update their status to 'processing'.
      // This uses a subquery in the WHERE clause of an UPDATE statement,
      // which is an atomic operation in SQLite. This avoids both the race condition
      // of separate SELECT/UPDATE statements and the "Transaction function cannot
      // return a promise" error from using async functions in better-sqlite3's
      // synchronous transactions.
      const subquery = db
        .select({ id: jobTitles.id })
        .from(jobTitles)
        .where(
          or(
            eq(jobTitles.status, 'pending'),
            and(eq(jobTitles.status, 'failed'), lt(jobTitles.retryCount, MAX_RETRIES))
          )
        )
        .orderBy(
          sql`CASE WHEN ${jobTitles.status} = 'failed' THEN 0 WHEN ${jobTitles.status} = 'pending' THEN 1 END`
        )
        .limit(batchSize);


      const batch = await db.update(jobTitles)
        .set({ status: 'processing' })
        .where(inArray(jobTitles.id, subquery))
        .returning();

      if (batch.length === 0) {
        // No more work for this worker to claim, so it can exit.
        return;
      }

      await rateLimiter(() => processBatch(batch));
    }
  };

  const workers = Array(requestsPerMinute).fill(0).map(() => worker());
  await Promise.all(workers);
};
