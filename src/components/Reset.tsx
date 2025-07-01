import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';
import { resetDatabase } from '../utils/db.js';

export const Reset: React.FC = () => {
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runReset = async () => {
      try {
        setStatus('Resetting database...');
        await resetDatabase();
        setStatus('Database reset complete!');
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
        setStatus('Database reset failed.');
      }
    };

    runReset();
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Resetting Database</Text>
      <Box marginTop={1}>
        <Text color={error ? 'red' : 'yellow'}>{status}</Text>
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
      {!error && status === 'Database reset complete!' && (
        <Box marginTop={1}>
          <Text color="green">Database has been successfully reset.</Text>
        </Box>
      )}
    </Box>
  );
};