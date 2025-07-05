import { addMinutes } from 'date-fns';
import { count, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import pLimit from 'p-limit';
import { parentPort } from 'worker_threads';
import { db } from '../db/connection.js';
import { jobTable, uniqueJobTable } from '../db/schema.js';
import { createAICache, extendAICache } from './ai/cache.js';
import { classifyJobTitles, GoogleGenAI, JobTitleInput } from './ai/index.js';
import { initializeAI } from './ai/initialize.js';
import { LogEntry, logger } from './logger.js';

type Job = typeof uniqueJobTable.$inferSelect;

interface StatusCounts {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    uniqueTotal: number;
    uniquePending: number;
    uniqueProcessing: number;
    uniqueCompleted: number;
    cached: number;
}

interface TimeStats {
    startTime: number | null;
    elapsedTime: number;
    estimatedTime: number;
    history: { timestamp: number; completed: number }[];
    startingCounts: StatusCounts | null;
}

interface CostStats {
    currentCost: number;
    estimatedTotalCost: number;
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    mismatchCalls: number;
    billableCalls: number;
}

export interface Status {
    counts: StatusCounts;
    time: TimeStats;
    cost: CostStats;
    logs: LogEntry[];
}

const onProgress = (status: Status) => {
    parentPort?.postMessage({ type: 'progress', payload: status });
};

let logs: LogEntry[] = [];
logger.on('log', (log: LogEntry) => {
    logs.push(log);
});

let batchSizePerRequest: number;
let lastProgressSentTime: number = 0; // New variable for debouncing progress updates
let startTime: number | null = null;
let lastElapsedTimeUpdate: number = 0;
let lastEstimatedTimeUpdate: number = 0;
let history: { timestamp: number; completed: number }[] = [];
let startingCounts: StatusCounts | null = null;
let _elapsedTime: number = 0;
let _estimatedTime: number = 0;

let currentCost = 0;
let totalCalls = 0;
let successfulCalls = 0;
let failedCalls = 0;
let mismatchCalls = 0;

const getJobStatus = async (): Promise<Status> => {
    const totalJobsResult = await db.select({ count: count() }).from(jobTable);
    const totalJobs = totalJobsResult[0].count;

    const uniqueStatusCountsResult = await db
        .select({
            status: uniqueJobTable.status,
            count: sql`COUNT(*)`.as('count'),
        })
        .from(uniqueJobTable)
        .groupBy(uniqueJobTable.status);

    const jobStatusCountsResult = await db
        .select({
            status: uniqueJobTable.status,
            count: sql`COUNT(${jobTable.id})`.as('count'),
        })
        .from(jobTable)
        .leftJoin(uniqueJobTable, eq(jobTable.uniqueJobTableId, uniqueJobTable.id))
        .groupBy(uniqueJobTable.status);

    const [skippedCount] = await db.select({ count: count() }).from(uniqueJobTable).where(or(isNull(uniqueJobTable.jobTitle), eq(uniqueJobTable.jobTitle, ''), eq(uniqueJobTable.jobTitle, '--')));

    const newCounts: Omit<StatusCounts, 'total' | 'uniqueTotal'> = {
        pending: 0,
        processing: 0,
        completed: 0,
        uniquePending: 0,
        uniqueProcessing: 0,
        uniqueCompleted: 0,
        cached: 0,
    };

    let uniqueTotal = 0;
    uniqueStatusCountsResult.forEach(row => {
        if (row.status) {
            const countValue = row.count as number;
            newCounts[`unique${row.status.charAt(0).toUpperCase() + row.status.slice(1)}` as keyof typeof newCounts] = countValue;
            uniqueTotal += countValue;
        }
    });

    let total = 0;
    jobStatusCountsResult.forEach(row => {
        if (row.status) {
            const countValue = row.count as number;
            newCounts[row.status as keyof typeof newCounts] = countValue;
            total += countValue;
        }
    });

    // Ensure total reflects all jobs, including those without a uniqueJobTableId if any
    if (total === 0) {
        total = totalJobs;
    }

    newCounts.cached = (newCounts.completed - skippedCount.count) - newCounts.uniqueCompleted;

    if (newCounts.processing > 0 && !startTime) {
        startTime = Date.now();
    }

    if (startTime) {
        const now = Date.now();
        if (now - lastElapsedTimeUpdate > 1000) { // Update every second
            _elapsedTime = now - startTime;
            lastElapsedTimeUpdate = now;
        }
    }

    const now = Date.now();
    const currentUniqueCompleted = newCounts.uniqueCompleted;

    history = [...history, { timestamp: now, completed: currentUniqueCompleted }].filter(entry => entry.timestamp >= now - 62000);

    if (history.length > 1) {
        const now = Date.now();
        if (now - lastEstimatedTimeUpdate > 1000) { // Update every second
            const firstEntry = history[0];
            const lastEntry = history[history.length - 1];
            const completedInPeriod = lastEntry.completed - firstEntry.completed;
            const periodDurationInSeconds = (lastEntry.timestamp - firstEntry.timestamp) / 1000;
            const remainingUniqueJobs = newCounts.uniquePending + newCounts.uniqueProcessing;

            if (remainingUniqueJobs === 0) {
                _estimatedTime = 0; // All jobs completed or no more unique jobs to process
            } else if (completedInPeriod === 0 || periodDurationInSeconds <= 1) {
                _estimatedTime = Infinity; // No progress or too short a period to estimate
            } else {
                const rate = completedInPeriod / periodDurationInSeconds;
                if (rate > 0) {
                    _estimatedTime = remainingUniqueJobs / rate * 1000;
                } else {
                    _estimatedTime = Infinity; // Rate is zero but jobs remain
                }
            }
            lastEstimatedTimeUpdate = now;
        }
    }

    if (!startingCounts) {
        startingCounts = { ...newCounts, total, uniqueTotal };
    }

    const billableCalls = successfulCalls + mismatchCalls;
    const estimatedTotalCost = (billableCalls > 0 && batchSizePerRequest) ? (currentCost / (billableCalls * batchSizePerRequest)) * (newCounts.uniquePending + newCounts.uniqueProcessing) + currentCost : 0;

    const counts = { ...newCounts, total, uniqueTotal };
    const time = { startTime, elapsedTime: _elapsedTime, estimatedTime: _estimatedTime, history, startingCounts };
    const cost = { currentCost, estimatedTotalCost, totalCalls, successfulCalls, failedCalls, mismatchCalls, billableCalls };

    return { counts, time, cost, logs };
};

const getBatch = async (batchSize: number) => {
    const subquery = db
        .select({ id: uniqueJobTable.id })
        .from(uniqueJobTable)
        .where(eq(uniqueJobTable.status, 'pending'))
        .orderBy(sql`CASE WHEN ${uniqueJobTable.status} = 'pending' THEN 1 END`)
        .limit(batchSize);

    const startTime = Date.now();
    logger.info(`Getting batch of ${batchSize} jobs`);
    const jobsToProcess = await db.update(uniqueJobTable).set({ status: 'processing' }).where(inArray(uniqueJobTable.id, subquery)).returning();
    const elapsedTime = Date.now() - startTime;
    logger.info(`Got batch of ${jobsToProcess.length} jobs in ${elapsedTime / 1000} seconds`);
    return jobsToProcess;
};

let cacheId: string;
let cacheExpiration: Date;
let aiInstance: GoogleGenAI; // Renamed to avoid conflict with parameter in classifyJobTitles

const processBatch = async (batch: Job[]) => {
    if (batch.length === 0) return;

    const aiInputs: JobTitleInput[] = batch.map(job => ({ id: job.id, jobTitle: job.jobTitle }));

    try {
        const aiResult = await classifyJobTitles(aiInputs, aiInstance, cacheId);
        totalCalls++;
        currentCost += aiResult.cost;

        if (aiResult.status === 'success') {
            successfulCalls++;
            const classificationMap = new Map(aiResult.classifications.map(c => [c.id, c]));
            for (const job of batch) {
                const classification = classificationMap.get(job.id);
                if (classification) {
                    await db.update(uniqueJobTable).set({
                        jobFunction: classification.jobFunction,
                        jobSeniority: classification.jobSeniority,
                        confidence: classification.confidence,
                        status: 'completed',
                    }).where(eq(uniqueJobTable.id, job.id));
                }
            }
        } else {
            if (aiResult.status === 'mismatch_error') mismatchCalls++;
            else failedCalls++;
            const batchIds = batch.map(j => j.id);
            await db.update(uniqueJobTable).set({ status: 'pending' }).where(inArray(uniqueJobTable.id, batchIds));
            if (aiResult.error) {
                logger.error(`Error processing batch: ${aiResult.error}`);
            }
        }
    } catch (error) {
        failedCalls++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in processBatch: ${errorMessage}`);
        const batchIds = batch.map(j => j.id);
        await db.update(uniqueJobTable).set({ status: 'pending' }).where(inArray(uniqueJobTable.id, batchIds));
    }
};

parentPort?.on('message', async (params: {
    batchSize?: number;
    requestsPerMinute?: number;
    minWaitBetweenBatches?: number;
}) => {
    logger.info("Worker received message to start processing.");
    const { batchSize = 10, requestsPerMinute = 60, minWaitBetweenBatches = 0 } = params;
    batchSizePerRequest = batchSize;
    logger.info(`Processing job titles with batchSize: ${batchSize}, requestsPerMinute: ${requestsPerMinute}, minWaitBetweenBatches: ${minWaitBetweenBatches}`);

    // Mark all previous unfinished jobs as pending
    try {
        logger.info("Marking all previous unfinished jobs as pending...");
        await db.update(uniqueJobTable).set({ status: 'pending' }).where(eq(uniqueJobTable.status, 'processing'));
        logger.info("Marking all previous unfinished jobs as done");
    } catch (error) {
        parentPort?.postMessage({ type: 'error', payload: error instanceof Error ? error.message : String(error) });
        return;
    }

    // Initialize AI instance
    try {
        logger.info("Initializing AI service...");
        aiInstance = await initializeAI(); // Initialize AI instance once
        logger.info("AI service initialized");
    } catch (error) {
        parentPort?.postMessage({ type: 'error', payload: error instanceof Error ? error.message : String(error) });
    }

    // Create AI cache
    try {
        logger.info("Creating AI cache...");
        const cacheResult = await createAICache(aiInstance, addMinutes(new Date(), 5));
        cacheId = cacheResult.cacheId;
        cacheExpiration = cacheResult.cacheExpiration;
        logger.info(`AI cache created: ${cacheId} expires at ${cacheExpiration.toISOString()}`);
    } catch (error) {
        parentPort?.postMessage({ type: 'error', payload: error instanceof Error ? error.message : String(error) });
    }

    // Start processing batches
    let progressInterval: NodeJS.Timeout | undefined;
    try {
        progressInterval = setInterval(async () => {
            const status = await getJobStatus();
            const now = Date.now();
            if (now - lastProgressSentTime >= 500) {
                onProgress(status);
                lastProgressSentTime = now;
            }
        }, 1000);

        if (minWaitBetweenBatches > 0) {
            const limit = pLimit(1);
            const worker = async () => {
                let lastCompletionTime = 0;
                while (true) {
                    const hasPending = await db.select({ count: count() }).from(uniqueJobTable).where(eq(uniqueJobTable.status, 'pending'));
                    if (hasPending[0].count === 0) break;

                    const now = Date.now();
                    const elapsed = now - lastCompletionTime;
                    if (lastCompletionTime > 0 && elapsed < minWaitBetweenBatches) {
                        await new Promise(resolve => setTimeout(resolve, minWaitBetweenBatches - elapsed));
                    }

                    const batch = await getBatch(batchSize);
                    if (batch.length > 0) {
                        await limit(() => processBatch(batch));
                        lastCompletionTime = Date.now();
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            };
            await worker();
        } else {
            const concurrency = requestsPerMinute > 0 ? requestsPerMinute : 1;
            const limit = pLimit(concurrency);
            const intervalTime = requestsPerMinute > 0 ? 60000 / requestsPerMinute : 0;

            const worker = async () => {
                let lastRequestStartTime = 0;
                while (true) {
                    const hasPendingResult = await db.select({ count: count() }).from(uniqueJobTable).where(eq(uniqueJobTable.status, 'pending'));
                    if (hasPendingResult[0].count === 0) break;

                    const now = Date.now();
                    const elapsed = now - lastRequestStartTime;
                    if (lastRequestStartTime > 0 && elapsed < intervalTime) {
                        await new Promise(resolve => setTimeout(resolve, intervalTime - elapsed));
                    }
                    lastRequestStartTime = Date.now();

                    const batch = await getBatch(batchSize);
                    if (batch.length > 0) {
                        limit(() => processBatch(batch));
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
            };
            await worker();

            while (limit.activeCount > 0 || limit.pendingCount > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        if (progressInterval) clearInterval(progressInterval);
        const finalStatus = await getJobStatus();
        onProgress(finalStatus);
        parentPort?.postMessage({ type: 'done' });
    } catch (error) {
        if (progressInterval) clearInterval(progressInterval);
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to start processing: ${errorMessage}`);
        parentPort?.postMessage({ type: 'error', payload: errorMessage });
    }
});

// Call extendAICache periodically to keep the cache alive
setInterval(async () => {
    if (aiInstance && cacheId) {
        logger.info("Extending AI cache...");
        const { cacheExpiration: newCacheExpiration } = await extendAICache(aiInstance, cacheId, addMinutes(cacheExpiration, 5));
        logger.info(`AI cache extended: ${cacheId}, New expiry ${newCacheExpiration.toISOString()}`);
        cacheExpiration = newCacheExpiration;
    }
}, 3 * 60 * 1000); // Every 3 minutes