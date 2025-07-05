import { Box, Text } from 'ink';
import React from 'react';
import { Status as StatusType } from '../utils/process.worker.js';
import ProgressBar from './ProgressBar.js';
import { Table } from './Table.js';

export const Status: React.FC<StatusType> = ({ counts, time, cost }) => {
  const {
    total,
    pending,
    processing,
    completed,
    uniqueTotal,
    uniquePending,
    uniqueProcessing,
    uniqueCompleted,
    cached,
  } = counts;

  const {
    elapsedTime,
    estimatedTime,
  } = time;

  const {
    currentCost,
    estimatedTotalCost,
    totalCalls,
    successfulCalls,
    failedCalls,
    mismatchCalls,
    billableCalls,
  } = cost;

  const calculatePercentage = (count: number, total: number) => {
    if (total === 0) {
      return '0.00';
    }
    return ((count / total) * 100).toFixed(2);
  };

  const formatTime = (ms: number) => {
    if (ms === Infinity) {
      return 'N/A';
    }
    if (ms <= 0) {
      return '0s';
    }
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const tableData = [
    {
      key: 'total',
      All: total,
      Unique: uniqueTotal,
    },
    {
      key: 'pending',
      All: `${pending} (${calculatePercentage(pending, total)}%)`,
      Unique: `${uniquePending} (${calculatePercentage(uniquePending, uniqueTotal)}%)`,
    },
    {
      key: 'processing',
      All: `${processing} (${calculatePercentage(processing, total)}%)`,
      Unique: `${uniqueProcessing} (${calculatePercentage(uniqueProcessing, uniqueTotal)}%)`,
    },
    {
      key: 'completed',
      All: `${completed} (${calculatePercentage(completed, total)}%)`,
      Unique: `${uniqueCompleted} (${calculatePercentage(uniqueCompleted, uniqueTotal)}%)`,
    },
    {
      key: 'cached-used',
      All: `${cached}`,
      Unique: '-',
    },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text bold color="cyan">Job Processing Status</Text>
      </Box>
      <Box marginTop={1}>
        <ProgressBar completed={uniqueCompleted} total={uniqueTotal} />
      </Box>
      <Box marginTop={1}>
        <Table data={tableData} />
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Box width="50%">
            <Text>Elapsed Time:</Text>
          </Box>
          <Text color="magenta">{formatTime(elapsedTime)}</Text>
        </Box>
        <Box>
          <Box width="50%">
            <Text>Estimated Time Remaining:</Text>
          </Box>
          <Text color="magenta">{formatTime(estimatedTime)}</Text>
        </Box>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Box width="50%">
            <Text>Total Cost:</Text>
          </Box>
          <Text color="magenta">${currentCost.toFixed(6)}</Text>
        </Box>
        <Box>
          <Box width="50%">
            <Text>Estimated Total Cost:</Text>
          </Box>
          <Text color="magenta">${estimatedTotalCost.toFixed(6)}</Text>
        </Box>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Box width="50%">
            <Text>Total AI Calls:</Text>
          </Box>
          <Text color="magenta">{totalCalls}</Text>
        </Box>
        <Box>
          <Box width="50%">
            <Text>Successful Calls:</Text>
          </Box>
          <Text color="green">{successfulCalls}</Text>
        </Box>
        <Box>
          <Box width="50%">
            <Text>Failed Calls:</Text>
          </Box>
          <Text color="red">{failedCalls}</Text>
        </Box>
        <Box>
          <Box width="50%">
            <Text>Mismatch Calls:</Text>
          </Box>
          <Text color="yellow">{mismatchCalls}</Text>
        </Box>
        <Box>
          <Box width="50%">
            <Text>Billable Calls:</Text>
          </Box>
          <Text color="magenta">{billableCalls}</Text>
        </Box>
      </Box>
    </Box>
  );
};