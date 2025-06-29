import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React, { useEffect, useState } from 'react';
import { processCsv } from '../utils/csv.js';
import ProgressBar from './ProgressBar.js';
import Status from './Status.js';

interface AppProps {
    input: string;
    output: string;
    batchSize: number;
    maxRequestsPerMinute: number;
    minWaitBetweenBatches: number;
    verbose: boolean;
}

const App: React.FC<AppProps> = ({ input, output, batchSize, maxRequestsPerMinute, minWaitBetweenBatches, verbose }) => {
    const [status, setStatus] = useState('Initializing...');
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0); // 0 to 100
    const [totalRows, setTotalRows] = useState(0);
    const [processedRows, setProcessedRows] = useState(0);
    const [totalBatches, setTotalBatches] = useState(0);
    const [estimatedTime, setEstimatedTime] = useState("calculating...");
    const [estimatedRemainingTime, setEstimatedRemainingTime] = useState("calculating...");

    useEffect(() => {
        const onProgress = (currentProcessed: number, total: number, totalBatches: number, estimatedTotal: string, estimatedRemaining: string) => {
            setProcessedRows(currentProcessed);
            setTotalRows(total);
            setTotalBatches(totalBatches);
            setEstimatedTime(estimatedTotal);
            setEstimatedRemainingTime(estimatedRemaining);
            if (total > 0) {
                setProgress(Math.min(100, (currentProcessed / total) * 100));
            }
        };

        const runProcessing = async () => {
            try {
                setStatus('Processing CSV...');
                await processCsv(input, output, batchSize, maxRequestsPerMinute, minWaitBetweenBatches, verbose, onProgress);
                setStatus('Processing complete!');
                setProgress(100);
            } catch (err) {
                setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
                setStatus('Processing failed.');
            }
        };

        runProcessing();
    }, [input, output, batchSize, maxRequestsPerMinute, minWaitBetweenBatches]);

    return (
        <Box flexDirection="column" padding={1}>
            <Text color="cyan">AI Job Title Standardizer CLI</Text>
            <Box marginTop={1}>
                <Status message={status} color={error ? "red" : "yellow"} />
            </Box>
            {error && (
                <Box>
                    <Text color="red">{error}</Text>
                </Box>
            )}
            <Box marginTop={1}>
                <ProgressBar progress={progress} />
                <Text> ({processedRows}/{totalRows} rows)</Text>
            </Box>
            {totalBatches > 0 && (
                <Box>
                    <Text>Total Batches: </Text>
                    <Text color="white">{totalBatches}</Text>
                </Box>
            )}
            {estimatedRemainingTime !== "calculating..." && progress < 100 && !error && (
                <Box>
                    <Text>Estimated Remaining Time: </Text>
                    <Text color="white">{estimatedRemainingTime}</Text>
                </Box>
            )}
            {progress < 100 && !error && (
                <Box>
                    <Text color="yellow">
                        <Spinner type="dots" />
                    </Text>
                    <Text> Processing...</Text>
                </Box>
            )}
            {progress === 100 && !error && (
                <Text color="green">Output saved to: {output}</Text>
            )}
        </Box>
    );
};

export default App;