import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React, { useEffect, useRef, useState } from 'react';
import { ingestCsv } from '../utils/ingest.js';
import ProgressBar from './ProgressBar.js';

interface IngestProps {
  file: string;
}

export const Ingest: React.FC<IngestProps> = ({ file }) => {
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [ingestedRows, setIngestedRows] = useState(0);
  const [estimatedRemainingTime, setEstimatedRemainingTime] = useState('calculating...');
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();

    const onProgress = (currentIngested: number, total: number) => {
      setIngestedRows(currentIngested);
      setTotalRows(total);
      if (total > 0) {
        setProgress(Math.min(100, (currentIngested / total) * 100));

        if (startTimeRef.current) {
          const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
          const rowsPerSecond = currentIngested / elapsedSeconds;
          const remainingRows = total - currentIngested;
          const estimatedSecondsRemaining = rowsPerSecond > 0 ? remainingRows / rowsPerSecond : Infinity;

          if (estimatedSecondsRemaining === Infinity) {
            setEstimatedRemainingTime('calculating...');
          } else if (estimatedSecondsRemaining < 60) {
            setEstimatedRemainingTime(`${estimatedSecondsRemaining.toFixed(0)}s remaining`);
          } else if (estimatedSecondsRemaining < 3600) {
            const minutes = Math.floor(estimatedSecondsRemaining / 60);
            const seconds = (estimatedSecondsRemaining % 60).toFixed(0);
            setEstimatedRemainingTime(`${minutes}m ${seconds}s remaining`);
          } else {
            const hours = Math.floor(estimatedSecondsRemaining / 3600);
            const minutes = Math.floor((estimatedSecondsRemaining % 3600) / 60);
            setEstimatedRemainingTime(`${hours}h ${minutes}m remaining`);
          }
        }
      }
    };

    const runIngestion = async () => {
      try {
        setStatus('Ingesting CSV...');
        await ingestCsv(file, onProgress);
        setStatus('Ingestion complete!');
        setProgress(100);
        setEstimatedRemainingTime('Done');
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
        setStatus('Ingestion failed.');
      }
    };

    runIngestion();
  }, [file]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="cyan">Ingesting Job Titles</Text>
      <Box marginTop={1}>
        <Text color={error ? 'red' : 'yellow'}>{status}</Text>
      </Box>
      {error && (
        <Box>
          <Text color="red">{error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <ProgressBar completed={ingestedRows} total={totalRows} failed={0} />
        <Text color="white"> ({ingestedRows}/{totalRows} rows)</Text>
      </Box>
      {progress < 100 && !error && (
        <Box marginTop={1}>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text color="white"> Ingesting... (<Text color="blue">{estimatedRemainingTime}</Text>)</Text>
        </Box>
      )}
      {progress === 100 && !error && (
        <Box marginTop={1}>
          <Text color="green">Ingestion complete!</Text>
        </Box>
      )}
    </Box>
  );
};