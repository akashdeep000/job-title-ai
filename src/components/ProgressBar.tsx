import { Box, Text } from 'ink';
import React from 'react';

interface ProgressBarProps {
    progress: number; // 0 to 100
    width?: number;
    character?: string;
    estimatedRemainingTime?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, width = 20, character = '█', estimatedRemainingTime }) => {
    const completedWidth = Math.round(progress / 100 * width);
    const remainingWidth = width - completedWidth;

    return (
        <Box flexDirection="row">
            <Text color="green">{character.repeat(completedWidth)}</Text>
            <Text color="gray">{character.repeat(remainingWidth)}</Text>
            <Text> {progress.toFixed(0)}%</Text>
            {estimatedRemainingTime && progress < 100 && (
                <Text> ({estimatedRemainingTime})</Text>
            )}
        </Box>
    );
};

export default ProgressBar;