import { render } from 'ink';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import App from './components/App.js';
import { Main } from './components/Main.js';
import { logger } from './utils/logger.js';

yargs(hideBin(process.argv))
  .command('ingest <file>', 'Ingest a CSV file into the database', (yargs) => {
    return yargs.positional('file', {
      describe: 'Path to the CSV file',
      type: 'string',
      demandOption: true,
    });
  }, (argv) => {
    logger.info(`Executing command: ingest, file: ${argv.file}`);
    render(<Main><App command="ingest" file={argv.file} /></Main>);
  })
  .command('process', 'Process job titles using the AI', (yargs) => {
    return yargs
      .option('batchSize', {
        type: 'number',
        alias: 'b',
        description: 'Number of job titles to process in each AI batch',
        default: 10,
      })
      .option('requestsPerMinute', {
        type: 'number',
        alias: 'rpm',
        description: 'Maximum number of AI requests per minute (for rate limiting)',
        default: 60, // Default to 60 requests per minute
      })
      .option('minWaitBetweenBatches', {
        type: 'number',
        alias: 'wait',
        description: 'Minimum wait time in milliseconds between AI batches (for rate limiting)',
        default: 0, // 0 means no minimum wait, RPM will control
      })
      .check((argv) => {
        if (argv.requestsPerMinute > 0 && argv.minWaitBetweenBatches > 0 && argv.requestsPerMinute !== 60) {
          throw new Error('Cannot specify both --requestsPerMinute and --minWaitBetweenBatches. Choose one or neither.');
        }
        return true;
      });
  },
    (argv) => {
      logger.info(`Executing command: process, batchSize: ${argv.batchSize}, requestsPerMinute: ${argv.requestsPerMinute}, minWaitBetweenBatches: ${argv.minWaitBetweenBatches}`);
      render(<Main><App command="process" batchSize={argv.batchSize} requestsPerMinute={argv.requestsPerMinute} minWaitBetweenBatches={argv.minWaitBetweenBatches} /></Main>);
    })
  .command('export <file>', 'Export processed job titles to a CSV file', (yargs) => {
    return yargs
      .positional('file', {
        describe: 'Path to the CSV file',
        type: 'string',
        demandOption: true,
      })
      .option('status', {
        type: 'string',
        alias: 's',
        description: 'Filter by job title status (e.g., completed, pending, failed)',
      })
      .option('minConfidence', {
        type: 'number',
        alias: 'c',
        description: 'Filter by minimum confidence score (0-1)',
      });
  }, (argv) => {
    logger.info(`Executing command: export, file: ${argv.file}, statusFilter: ${argv.status}, minConfidence: ${argv.minConfidence}`);
    render(<Main><App command="export" file={argv.file} statusFilter={argv.status} minConfidence={argv.minConfidence} /></Main>);
  })
  .command('reset', 'Reset various aspects of the database', (yargs) => {
    return yargs
      .option('type', {
        type: 'string',
        alias: 't',
        description: 'Type of reset to perform: "processed" (Resets AI processed data) "full" (Clears all data)',
        choices: ['processed', 'full'],
      });
  },
    (argv) => {
      logger.info(`Executing command: reset, type: ${argv.type}`);
      render(<Main><App command="reset" type={argv.type as 'full' | 'processed'} /></Main>);
    })
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .argv;