import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import path from 'path';
import React, { useEffect, useState } from 'react';
import { Worker } from 'worker_threads';
import { useAppContext } from './AppContext.js';

interface ProcessProps {
  batchSize?: number;
  requestsPerMinute?: number;
  minWaitBetweenBatches?: number;
}

export const Process: React.FC<ProcessProps> = ({ batchSize, requestsPerMinute, minWaitBetweenBatches }) => {
  const { setAppState } = useAppContext();
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Process component useEffect fired. Attempting to create worker...");
    let worker: Worker | undefined;
    try {
      const workerPath = path.resolve(process.cwd(), 'dist', 'utils', 'process.worker.js');
      console.log(`Worker path resolved to: ${workerPath}`);
      worker = new Worker(workerPath);
      console.log("Worker created successfully.");

      worker.on('message', (message) => {
        if (message.type === 'progress') {
          setAppState(prev => ({ ...prev, ...message.payload }));
        } else if (message.type === 'done') {
          setIsComplete(true);
          worker?.terminate();
        } else if (message.type === 'error') {
          setError(`Error: ${message.payload}`);
          worker?.terminate();
        }
      });

      worker.on('error', (err) => {
        setError(`Worker error: ${err.message}`);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          setError(`Worker stopped with exit code ${code}`);
        }
      });

      worker.postMessage({ batchSize, requestsPerMinute, minWaitBetweenBatches });

    } catch (err) {
      setError(`Failed to create worker: ${err instanceof Error ? err.message : String(err)}`);
      console.error(`Failed to create worker: ${err instanceof Error ? err.message : String(err)}`);
    }

    return () => {
      worker?.terminate();
    };
  }, [batchSize, requestsPerMinute, minWaitBetweenBatches, setAppState]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Job Title Processing</Text>
      <Box marginTop={1}>
        {!isComplete && !error && (
          <Box>
            <Text color="yellow">
              <Spinner type="dots" /> Processing...
            </Text>
          </Box>
        )}
        {isComplete && <Text color="green">Processing complete!</Text>}
        {error && <Text color="red">{error}</Text>}
      </Box>
    </Box>
  );
};