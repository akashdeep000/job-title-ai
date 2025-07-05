import { EventEmitter } from 'events';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Date;
}

class Logger extends EventEmitter {
    log(level: LogLevel, message: string) {
        const entry: LogEntry = { level, message, timestamp: new Date() };
        this.emit('log', entry);
    }

    info(message: string) {
        this.log('info', message);
    }

    warn(message: string) {
        this.log('warn', message);
    }

    error(message: string) {
        this.log('error', message);
    }
}

export const logger = new Logger();