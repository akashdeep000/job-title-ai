import { Box, Text } from 'ink';
import React from 'react';

interface StatusProps {
    message: string;
    color?: string;
}

const Status: React.FC<StatusProps> = ({ message, color = "yellow" }) => {
    return (
        <Box>
            <Text>Status: </Text>
            <Text color={color}>{message}</Text>
        </Box>
    );
};

export default Status;