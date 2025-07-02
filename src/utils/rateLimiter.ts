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
        const capacity = maxRequestsPerMinute; // Max tokens in the bucket (burst size)
        const refillRate = maxRequestsPerMinute / (60 * 1000); // Tokens per millisecond
        let tokens = capacity;
        let lastRefillTime = Date.now();

        const limit = pLimit(maxRequestsPerMinute); // Still use p-limit for overall concurrency, but token bucket handles rate

        const acquireToken = async () => {
            const now = Date.now();
            const timeElapsed = now - lastRefillTime;
            lastRefillTime = now;

            tokens = Math.min(capacity, tokens + timeElapsed * refillRate);

            if (tokens >= 1) {
                tokens -= 1;
                return;
            }

            // Not enough tokens, calculate wait time
            const tokensNeeded = 1 - tokens;
            const waitTime = tokensNeeded / refillRate;

            tokens = 0; // Consume remaining fractional tokens

            await new Promise(resolve => setTimeout(resolve, waitTime));
        };

        return async (fn: () => Promise<any>) => {
            return limit(async () => {
                await acquireToken();
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