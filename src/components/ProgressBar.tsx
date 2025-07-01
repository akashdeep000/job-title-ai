import React from 'react';
import { Box, Text } from 'ink';

interface ProgressBarProps {
  completed: number;
  failed?: number; // Make failed optional
  total: number;
  width?: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  completed,
  failed = 0, // Default to 0 if not provided
  total,
  width = 40,
}) => {
  if (total === 0) {
    return (
      <Box>
        <Text color="gray">{'░'.repeat(width)}</Text>
      </Box>
    );
  }

  const completedPercent = completed / total;
  const failedPercent = failed / total;

  const completedWidth = Math.round(completedPercent * width);
  const failedWidth = Math.round(failedPercent * width);
  const remainingWidth = Math.max(0, width - completedWidth - failedWidth);

  return (
    <Box>
      <Text color="green">{'█'.repeat(completedWidth)}</Text>
      {failed > 0 && <Text color="red">{'█'.repeat(failedWidth)}</Text>}
      <Text color="gray">{'░'.repeat(remainingWidth)}</Text>
    </Box>
  );
};

export default ProgressBar;