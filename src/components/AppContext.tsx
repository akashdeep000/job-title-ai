import React, { createContext, useContext, useMemo, useState } from 'react';
import { Status } from '../utils/process.worker.js';

interface AppState extends Status {
    command?: string;
}

interface AppContextType {
    appState: AppState;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
    setCommand: (command: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [appState, setAppState] = useState<AppState>({
        command: undefined,
        counts: {
            total: 0,
            pending: 0,
            processing: 0,
            completed: 0,
            uniqueTotal: 0,
            uniquePending: 0,
            uniqueProcessing: 0,
            uniqueCompleted: 0,
            cached: 0,
        },
        time: {
            startTime: null,
            elapsedTime: 0,
            estimatedTime: 0,
            history: [],
            startingCounts: null,
        },
        cost: {
            currentCost: 0,
            estimatedTotalCost: 0,
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            mismatchCalls: 0,
            billableCalls: 0,
        },
        logs: [],
    });

    const setCommand = (command: string) => {
        setAppState(prev => ({ ...prev, command }));
    };

    const contextValue = useMemo(() => ({
        appState,
        setAppState,
        setCommand,
    }), [appState]);

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};