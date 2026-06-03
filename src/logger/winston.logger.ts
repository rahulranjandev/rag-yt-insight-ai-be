import { createLogger, format, transports } from 'winston';
import { ConfigService } from '@nestjs/config';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import WinstonCloudWatch from 'winston-cloudwatch';

const configService = new ConfigService();

const AWS_CLOUDWATCH_ACCESS_KEY_ID = configService.get(
  'AWS_CLOUDWATCH_ACCESS_KEY_ID',
);
const AWS_CLOUDWATCH_SECRET_ACCESS_KEY = configService.get(
  'AWS_CLOUDWATCH_SECRET_ACCESS_KEY',
);
const AWS_CLOUDWATCH_REGION = configService.get('AWS_CLOUDWATCH_REGION');
const AWS_CLOUDWATCH_GROUP_NAME = configService.get(
  'AWS_CLOUDWATCH_GROUP_NAME',
);

export const level = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

export const redactSensitiveData = (
  logData: Record<string, any>,
): Record<string, any> => {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret'];

  const redact = (data: any): any => {
    if (Array.isArray(data)) {
      return data.map(redact);
    } else if (typeof data === 'object' && data !== null) {
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          sensitiveKeys.includes(key) ? '[REDACTED]' : redact(value),
        ]),
      );
    }
    return data;
  };

  return redact(logData);
};

const nestFormat = nestWinstonModuleUtilities.format.nestLike('Nest', {
  colors: true,
  prettyPrint: true,
  appName: true,
});

const options = {
  file: {
    filename: 'error.log',
    level: 'error',
  },
  console: {
    level: 'silly',
  },
};

// for development environment
const devLogger = {
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    nestFormat,
  ),
  transports: [
    new transports.File(options.file),
    new transports.File({
      filename: 'combine.log',
      level: 'info',
    }),
    new transports.Console(options.console),
  ],
};

// for production environment
const prodLogger = {
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
    format((info) => {
      // Redact sensitive data from the log message
      if (info.message && typeof info.message === 'object') {
        info.message = redactSensitiveData(info.message);
      }
      if (info.body && typeof info.body === 'object') {
        info.body = redactSensitiveData(info.body);
      }
      return info;
    })(),
  ),
  transports: [
    // new transports.File(options.file),
    // new transports.File({
    //   filename: 'combine.log',
    //   level: 'info',
    // }),
    new transports.Console({
      format: nestFormat,
      level: 'debug',
    }),
    new WinstonCloudWatch({
      awsOptions: {
        credentials: {
          accessKeyId: AWS_CLOUDWATCH_ACCESS_KEY_ID,
          secretAccessKey: AWS_CLOUDWATCH_SECRET_ACCESS_KEY,
        },
      },

      awsRegion: AWS_CLOUDWATCH_REGION,
      logGroupName: AWS_CLOUDWATCH_GROUP_NAME,
      logStreamName: `${AWS_CLOUDWATCH_GROUP_NAME}-${process.env.NODE_ENV}`,
      jsonMessage: true,
      retentionInDays: 7,
      level: 'debug',
    }),
  ],
};

// export log instance based on the current environment
const instanceLogger =
  process.env.NODE_ENV === 'production' ? prodLogger : devLogger;

export const instance = createLogger(instanceLogger);
