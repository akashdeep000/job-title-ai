import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import React, { useEffect, useState } from 'react';
import { resetDatabase } from '../utils/db.js';

interface ResetProps {
  type?: 'full' | 'processed';
}

export const Reset: React.FC<ResetProps> = ({ type: initialType }) => {
  const [selectedType, setSelectedType] = useState<'full' | 'processed' | undefined>(initialType);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runReset = async () => {
      if (!selectedType) {
        setStatus('Awaiting type selection...');
        return;
      }

      try {
        setStatus(`Resetting ${selectedType} data...`);
        await resetDatabase(selectedType);
        setStatus(`${selectedType} data reset complete!`);
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
        setStatus(`${selectedType} data reset failed.`);
      }
    };

    runReset();
  }, [selectedType]);

  const handleSelect = (item: { value: 'full' | 'processed' }) => {
    setSelectedType(item.value);
  };

  if (!selectedType) {
    const items: { label: string; value: 'full' | 'processed' }[] = [
      { label: 'Reset Processed AI Data', value: 'processed' },
      { label: 'Full Reset (clears all data)', value: 'full' },
    ];

    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">Select Reset Type</Text>
        <Box marginTop={1}>
          <SelectInput items={items} onSelect={handleSelect} />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Resetting Data</Text>
      <Box marginTop={1}>
        <Text color={error ? 'red' : 'yellow'}>{status}</Text>
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
      {!error && status.includes('complete!') && (
        <Box marginTop={1}>
          <Text color="green">Data has been successfully reset.</Text>
        </Box>
      )}
    </Box>
  );
};