import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';
import * as schema from '../db/schema.js';
import { jobTitles } from '../db/schema.js';

const sqlite = new Database('./local.db');
const db = drizzle(sqlite, { schema });

interface StatusCounts {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

import ProgressBar from './ProgressBar.js';

export const Status: React.FC<{ totalCost: number }> = ({ totalCost }) => {
  const [counts, setCounts] = useState<StatusCounts>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [history, setHistory] = useState<{ timestamp: number; completed: number }[]>([]);
  const [startingCounts, setStartingCounts] = useState<StatusCounts|null>(null);
  const [estimetedTotalCost, setEstimatedTotalCost] = useState(0.00);

  useEffect(() => {
    setEstimatedTotalCost(((counts.pending/(counts.completed - (startingCounts?.completed || 0))) * (totalCost || 0)) + totalCost);
  }, [totalCost, counts]);

  useEffect(() => {
    const fetchCounts = async () => {
      const result = await db
        .select({
          status: jobTitles.status,
          count: sql`count(*)`,
        })
        .from(jobTitles)
        .groupBy(jobTitles.status);

      const newCounts: Omit<StatusCounts, 'total'> = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      };

      let total = 0;
      result.forEach(row => {
        if (row.status) {
          const count = row.count as number;
          newCounts[row.status as keyof typeof newCounts] = count;
          total += count;
        }
      });

      setCounts({ ...newCounts, total });
      if (!startingCounts) {
        setStartingCounts({ ...newCounts, total });
      }
      if (newCounts.processing > 0 && !startTime) {
        setStartTime(Date.now());
      }

      if (startTime) {
        setElapsedTime(Date.now() - startTime);
      }

      const now = Date.now();
      const currentCompleted = newCounts.completed + newCounts.failed;

      // Update history and prune old entries
      const sixtySecondsAgo = now - 62000; // A bit more than 60s to ensure we have data
      const updatedHistory = [...history, { timestamp: now, completed: currentCompleted }].filter(
        entry => entry.timestamp >= sixtySecondsAgo,
      );
      setHistory(updatedHistory);

      if (updatedHistory.length > 1) {
        const firstEntry = updatedHistory[0];
        const lastEntry = updatedHistory[updatedHistory.length - 1];

        const completedInPeriod = lastEntry.completed - firstEntry.completed;
        const periodDurationInSeconds = (lastEntry.timestamp - firstEntry.timestamp) / 1000;

        if (completedInPeriod > 0 && periodDurationInSeconds > 1) {
          const rate = completedInPeriod / periodDurationInSeconds; // jobs per second
          const remainingJobs = newCounts.pending + newCounts.processing;
          if (rate > 0) {
            const estimatedSeconds = remainingJobs / rate;
            setEstimatedTime(estimatedSeconds * 1000);
          } else {
            setEstimatedTime(0);
          }
        } else {
          setEstimatedTime(0);
        }
      } else {
        setEstimatedTime(0);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, [startTime, history]);

  const calculatePercentage = (count: number) => {
    if (counts.total === 0) {
      return '0.00';
    }
    return ((count / counts.total) * 100).toFixed(2);
  };

  const formatTime = (ms: number) => {
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

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1}>
      <Text bold color="cyan">
        Job Processing Status
      </Text>
      <Box marginTop={1}>
        <ProgressBar completed={counts.completed} failed={counts.failed} total={counts.total} />
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text>
          {' '}
          Total: <Text color="blue">{counts.total}</Text>
        </Text>
        <Text>
          {' '}
          Pending: <Text color="yellow">{counts.pending}</Text> ({calculatePercentage(counts.pending)}%)
        </Text>
        <Text>
          {' '}
          Processing: <Text color="cyan">{counts.processing}</Text> ({calculatePercentage(counts.processing)}%)
        </Text>
        <Text>
          {' '}
          Completed: <Text color="green">{counts.completed}</Text> ({calculatePercentage(counts.completed)}%)
        </Text>
        <Text>
          {' '}
          Failed: <Text color="red">{counts.failed}</Text> ({calculatePercentage(counts.failed)}%)
        </Text>
        <Box marginTop={1}>
          <Text>
            {' '}
            Elapsed Time: <Text color="magenta">{formatTime(elapsedTime)}</Text>
          </Text>
        </Box>
        <Box>
          <Text>
            {' '}
            Estimated Time Remaining: <Text color="magenta">{formatTime(estimatedTime)}</Text>
          </Text>
        </Box>
        <Box  marginTop={1}>
          <Text>
            {' '}
            Total Cost: <Text color="magenta">${totalCost.toFixed(6)}</Text>
          </Text>
        </Box>
        <Box>
          <Text>
            {' '}
            Estimated Total Cost: <Text color="magenta">${estimetedTotalCost.toFixed(6)}</Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
};