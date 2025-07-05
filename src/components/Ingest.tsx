import * as csv from 'fast-csv';
import * as fs from 'fs';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React, { useEffect, useRef, useState } from 'react';
import { Worker } from 'worker_threads';
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
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const countRows = async () => {
      let count = 0;
      return new Promise<number>((resolve, reject) => {
        fs.createReadStream(file)
          .pipe(csv.parse({ headers: true }))
          .on('data', () => count++)
          .on('end', () => resolve(count))
          .on('error', reject);
      });
    };

    const startIngestion = async () => {
      try {
        setStatus('Counting rows...');
        const total = await countRows();
        setTotalRows(total);
        setStatus('Ingesting CSV...');

        const worker = new Worker(new URL('../utils/ingest.worker.js', import.meta.url));
        workerRef.current = worker;
        startTimeRef.current = Date.now();

        worker.on('message', (msg) => {
          if (msg.status === 'progress') {
            const currentIngested = msg.ingested;
            setIngestedRows(currentIngested);
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
          } else if (msg.status === 'complete') {
            setIngestedRows(total);
            setStatus('Ingestion complete!');
            setProgress(100);
            setEstimatedRemainingTime('Done');
            worker.terminate();
          } else if (msg.status === 'error') {
            setError(`Error: ${msg.error}`);
            setStatus('Ingestion failed.');
            worker.terminate();
          }
        });

        worker.on('error', (err) => {
          setError(`Worker error: ${err.message}`);
          setStatus('Ingestion failed.');
          worker.terminate();
        });

        worker.on('exit', (code) => {
          if (code !== 0) {
            // setError(`Worker stopped with exit code ${code}`);
            // setStatus('Ingestion failed.');
          }
        });

        worker.postMessage({ filePath: file });
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
        setStatus('Ingestion failed.');
      }
    };

    startIngestion();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
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
        <Text color="white"> {totalRows === 0 ? "0.00" : (((ingestedRows / totalRows * 100)).toFixed(2))}% ({ingestedRows}/{totalRows} rows)</Text>
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