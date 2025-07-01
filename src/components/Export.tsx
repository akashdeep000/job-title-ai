import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React, { useEffect, useState } from 'react';
import { exportCsv } from '../utils/export.js';
import ProgressBar from './ProgressBar.js';

interface ExportProps {
  file: string;
  statusFilter?: string;
  minConfidence?: number;
}

export const Export: React.FC<ExportProps> = ({ file, statusFilter, minConfidence }) => {
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [exportedRows, setExportedRows] = useState(0);

  useEffect(() => {
    const onProgress = (currentExported: number, total: number) => {
      setExportedRows(currentExported);
      setTotalRows(total);
      if (total > 0) {
        setProgress(Math.min(100, (currentExported / total) * 100));
      }
    };

    const runExport = async () => {
      try {
        setStatus('Exporting CSV...');
        await exportCsv(file, onProgress, statusFilter, minConfidence);
        setStatus('Export complete!');
        setProgress(100);
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
        setStatus('Export failed.');
      }
    };

    runExport();
  }, [file]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Exporting Job Titles</Text>
      <Box marginTop={1}>
        <Text color={error ? 'red' : 'yellow'}>{status}</Text>
      </Box>
      {error && (
        <Box>
          <Text color="red">{error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <ProgressBar completed={exportedRows} total={totalRows} failed={0} />
        <Text color="white"> ({exportedRows}/{totalRows} rows)</Text>
      </Box>
      {progress < 100 && !error && (
        <Box marginTop={1}>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text color="white"> Exporting...</Text>
        </Box>
      )}
      {progress === 100 && !error && (
        <Box margin={1}>
          <Text color="green">Export complete! Saved to {file}</Text>
        </Box>
      )}
    </Box>
  );
};