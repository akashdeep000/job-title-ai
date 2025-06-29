import { render } from 'ink';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import App from './components/App.js';

const argv = yargs(hideBin(process.argv))
    .option('input', {
        type: 'string',
        alias: 'i',
        description: 'Path to the input CSV file',
        demandOption: true,
    })
    .option('output', {
        type: 'string',
        alias: 'o',
        description: 'Path to the output CSV file',
        demandOption: true,
    })
    .option('batchSize', {
        type: 'number',
        alias: 'b',
        description: 'Number of rows to send to AI in each batch',
        default: 100,
    })
    .option('maxRequestsPerMinute', {
        type: 'number',
        alias: 'rpm',
        description: 'Maximum number of AI requests per minute (for rate limiting)',
        default: 30, // Default RPM to 30
    })
    .option('minWaitBetweenBatches', {
        type: 'number',
        alias: 'wait',
        description: 'Minimum wait time in milliseconds between AI batches (for rate limiting)',
        default: 0, // 0 means no minimum wait
    })
    .option('verbose', {
        type: 'boolean',
        alias: 'v',
        description: 'Enable verbose logging for debugging',
        default: false,
    })
    .check((argv) => {
        if (argv.maxRequestsPerMinute > 0 && argv.minWaitBetweenBatches > 0) {
            throw new Error('Cannot specify both --maxRequestsPerMinute and --minWaitBetweenBatches. Choose one or neither.');
        }
        return true;
    })
    .help()
    .argv;

// Ensure argv is resolved before rendering
(async () => {
    const args = await argv;

    render(
        <App
            input={args.input}
            output={args.output}
            batchSize={args.batchSize}
            maxRequestsPerMinute={args.maxRequestsPerMinute}
            minWaitBetweenBatches={args.minWaitBetweenBatches}
            verbose={args.verbose}
        />
    );
})();