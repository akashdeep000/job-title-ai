import React, { useEffect } from 'react';

const enterAltScreenCommand = '\x1b[?1049h';
const leaveAltScreenCommand = '\x1b[?1049l';

export const exitFullScreen = () => {
    process.stdout.write(leaveAltScreenCommand);
};

const FullScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useEffect(() => {
        process.stdout.write(enterAltScreenCommand);
        return exitFullScreen;
    }, []);

    return <>{children}</>;
};

export default FullScreen;