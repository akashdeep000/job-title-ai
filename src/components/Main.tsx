import { Box, useStdout } from 'ink';
import React from 'react';
import { AppProvider, useAppContext } from './AppContext.js';
import FullScreen from './FullScreen.js';
import { Logs } from './Logs.js';
import { Status } from './Status.js';

const AppContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { appState } = useAppContext();
    const { stdout } = useStdout();

    return (
        <Box flexDirection="column" width={stdout.columns} height={stdout.rows - 1}>
            <Box flexGrow={1}>
                {appState.command === 'process' && (
                    <Box width="50%" paddingX={1} borderRight>
                        <Status {...appState} />
                    </Box>
                )}
                <Box width={appState.command === 'process' ? "50%" : "100%"} paddingX={1}>
                    <Logs logs={appState.logs} />
                </Box>
            </Box>
            <Box borderTop paddingX={1}>
                {children}
            </Box>
        </Box>
    );
};

export const Main: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <AppProvider>
            <FullScreen>
                <AppContainer>{children}</AppContainer>
            </FullScreen>
        </AppProvider>
    );
};