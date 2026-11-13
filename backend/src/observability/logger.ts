import pino from 'pino';
import { config } from '../config';

/**
 * Structured logging with aggressive redaction. Tokens, cookies and
 * authorization headers must never reach the log sink.
 */
export const logger = pino({
  level: config.logLevel,
  base: { service: 'bfdp-api', version: config.version, env: config.env },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.token',
      '*.accessToken',
      '*.idToken',
      '*.secret',
      '*.authorization',
    ],
    censor: '[redacted]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: config.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
      },
});

export type Logger = typeof logger;
