import pLimit from 'p-limit';

export function createRateLimiter(maxRequestsPerMinute: number, minWaitBetweenBatches: number): (fn: () => Promise<any>) => Promise<any> {
    if (minWaitBetweenBatches > 0) {
        const limit = pLimit(1); // Process one request at a time for batch waiting

        let lastBatchCompletionTime = 0;

        return async (fn: () => Promise<any>) => {
            return limit(async () => {
                const now = Date.now();
                const timeSinceLastBatch = now - lastBatchCompletionTime;

                if (timeSinceLastBatch < minWaitBetweenBatches) {
                    const timeToWait = minWaitBetweenBatches - timeSinceLastBatch;
                    await new Promise(resolve => setTimeout(resolve, timeToWait));
                }

                const result = await fn();
                lastBatchCompletionTime = Date.now();
                return result;
            });
        };
    } else if (maxRequestsPerMinute > 0) {
        const interval = 60 * 1000 / maxRequestsPerMinute; // milliseconds per request
        const limit = pLimit(maxRequestsPerMinute); // Allow maxRequestsPerMinute concurrent requests

        let lastRequestTime = 0;

        return async (fn: () => Promise<any>) => {
            return limit(async () => {
                const now = Date.now();
                const timeSinceLastRequest = now - lastRequestTime;

                if (timeSinceLastRequest < interval) {
                    const timeToWait = interval - timeSinceLastRequest;
                    await new Promise(resolve => setTimeout(resolve, timeToWait));
                }

                lastRequestTime = Date.now();
                return fn();
            });
        };
    } else {
        // No rate limiting or minimum wait, just use p-limit for concurrency control if needed
        // For now, we'll assume one of the above is always desired if this function is called.
        // If no limits, we can just return the function directly or use a high concurrency limit.
        return (fn: () => Promise<any>) => fn();
    }
}