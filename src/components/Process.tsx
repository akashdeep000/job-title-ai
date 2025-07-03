import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React, { useEffect, useState } from 'react';
import { processJobTitles } from '../utils/processor.js';
import { Status } from './Status.js';

interface ProcessProps {
  batchSize?: number;
  requestsPerMinute?: number;
  minWaitBetweenBatches?: number;
}

export const Process: React.FC<ProcessProps> = ({ batchSize, requestsPerMinute, minWaitBetweenBatches }) => {
  const [processingStatus, setProcessingStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    const onProgress = (currentProcessed: number, total: number, currentTotalCost: number) => {
      setProcessedCount(currentProcessed);
      setTotalCount(total);
      setTotalCost(currentTotalCost);
      if (total > 0) {
        setProgress(Math.min(100, (currentProcessed / total) * 100));
      }
    };

    const runProcessing = async () => {
      try {
        setProcessingStatus('Processing job titles...');
        await processJobTitles(onProgress, batchSize, requestsPerMinute, minWaitBetweenBatches);
        setProcessingStatus('Processing complete!');
        setProgress(100);
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
        setProcessingStatus('Processing failed.');
      }
    };

    runProcessing();
  }, [batchSize, requestsPerMinute, minWaitBetweenBatches]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Job Title Processing</Text>
      <Box marginTop={1}>
        <Status totalCost={totalCost} />
      </Box>
      <Box marginTop={1}>
        <Text color={error ? 'red' : 'yellow'}>{processingStatus}</Text>
      </Box>
      {error && (
        <Box>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {progress < 100 && !error && (
        <Box marginTop={1}>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text color="white"> Processing...</Text>
        </Box>
      )}
      {progress === 100 && !error && (
        <Box marginTop={1}>
          <Text color="green">Processing complete!</Text>
        </Box>
      )}
    </Box>
  );
};