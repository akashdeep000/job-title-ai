import { Box, Text, useInput } from 'ink';
import React, { useEffect, useState } from 'react';
import { LogEntry } from '../utils/logger.js';

interface LogsProps {
    logs: LogEntry[];
}

export const Logs: React.FC<LogsProps> = ({ logs }) => {
    const [scrollIndex, setScrollIndex] = useState(0);

    useEffect(() => {
        setScrollIndex(Math.max(0, logs.length - 10));
    }, [logs]);

    useInput((input, key) => {
        if (key.upArrow) {
            setScrollIndex(Math.max(0, scrollIndex - 1));
        }
        if (key.downArrow) {
            setScrollIndex(Math.min(logs.length - 10, scrollIndex + 1));
        }
    });

    const getLogColor = (level: string) => {
        switch (level) {
            case 'info':
                return 'green';
            case 'warn':
                return 'yellow';
            case 'error':
                return 'red';
            default:
                return 'white';
        }
    };

    const visibleLogs = logs.slice(scrollIndex, scrollIndex + 10);

    return (
        <Box flexDirection="column" padding={1}>
            <Text bold color="cyan">Logs (Use ↑ and ↓ to scroll)</Text>
            <Box flexDirection="column" marginTop={1}>
                {visibleLogs.map((log, index) => (
                    <Box key={index}>
                        <Text color={getLogColor(log.level)}>[{log.timestamp.toLocaleTimeString()}]</Text>
                        <Text> {log.message}</Text>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};