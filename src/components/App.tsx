import React, { useEffect } from 'react';
import { useAppContext } from './AppContext.js';
import { Export } from './Export.js';
import { Ingest } from './Ingest.js';
import { Process } from './Process.js';
import { Reset } from './Reset.js';

interface AppProps {
  command: string;
  file?: string;
  batchSize?: number;
  requestsPerMinute?: number;
  minWaitBetweenBatches?: number;
  statusFilter?: string;
  minConfidence?: number;
  type?: 'full' | 'processed';
}

const App: React.FC<AppProps> = ({ command, file, batchSize, requestsPerMinute, minWaitBetweenBatches, statusFilter, minConfidence, type }) => {
  const { setCommand } = useAppContext();

  useEffect(() => {
    setCommand(command);
  }, [command, setCommand]);

  switch (command) {
    case 'ingest':
      return <Ingest file={file!} />;
    case 'process':
      return <Process batchSize={batchSize} requestsPerMinute={requestsPerMinute} minWaitBetweenBatches={minWaitBetweenBatches} />;
    case 'export':
      return <Export file={file!} statusFilter={statusFilter} minConfidence={minConfidence} />;
    case 'reset':
      return <Reset type={type} />;
    default:
      return null;
  }
};

export default App;