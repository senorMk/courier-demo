import { Injectable, isDevMode } from '@angular/core';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4,
}

@Injectable({
    providedIn: 'root',
})
export class LoggerService {
    private logLevel: LogLevel = isDevMode() ? LogLevel.DEBUG : LogLevel.INFO;
    private readonly isDevelopment = isDevMode();

    constructor() {
        this.info('🚀 Logger Service initialized', { isDevelopment: this.isDevelopment });
    }

    debug(message: string, data?: any): void {
        if (this.logLevel <= LogLevel.DEBUG) {
            this.log('DEBUG', message, data, '🐛', '#9E9E9E');
        }
    }

    info(message: string, data?: any): void {
        if (this.logLevel <= LogLevel.INFO) {
            this.log('INFO', message, data, 'ℹ️', '#2196F3');
        }
    }

    warn(message: string, data?: any): void {
        if (this.logLevel <= LogLevel.WARN) {
            this.log('WARN', message, data, '⚠️', '#FF9800');
        }
    }

    error(message: string, error?: any): void {
        if (this.logLevel <= LogLevel.ERROR) {
            this.log('ERROR', message, error, '❌', '#F44336');
        }
    }

    success(message: string, data?: any): void {
        if (this.logLevel <= LogLevel.INFO) {
            this.log('SUCCESS', message, data, '✅', '#4CAF50');
        }
    }

    group(label: string): void {
        if (this.isDevelopment && console.group) {
            console.group(`📦 ${label}`);
        }
    }

    groupEnd(): void {
        if (this.isDevelopment && console.groupEnd) {
            console.groupEnd();
        }
    }

    time(label: string): void {
        if (this.isDevelopment && console.time) {
            console.time(`⏱️ ${label}`);
        }
    }

    timeEnd(label: string): void {
        if (this.isDevelopment && console.timeEnd) {
            console.timeEnd(`⏱️ ${label}`);
        }
    }

    private log(
        level: string,
        message: string,
        data?: any,
        emoji?: string,
        color?: string
    ): void {
        const timestamp = new Date().toISOString();
        const prefix = `${emoji} [${level}] ${timestamp}`;

        if (this.isDevelopment && color) {
            console.log(
                `%c${prefix}%c ${message}`,
                `color: ${color}; font-weight: bold`,
                'color: inherit'
            );
        } else {
            console.log(`${prefix} ${message}`);
        }

        if (data !== undefined) {
            if (level === 'ERROR' && data instanceof Error) {
                console.error(data);
            } else {
                console.log(data);
            }
        }
    }

    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
        this.info('Log level changed', { level: LogLevel[level] });
    }
}
