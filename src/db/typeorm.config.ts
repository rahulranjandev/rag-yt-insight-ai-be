import { DataSource, DataSourceOptions } from 'typeorm';

import { join } from 'path';

import { config } from 'dotenv';

import { ConfigService } from '@nestjs/config';

config();

// if (!process.env.DB_PORT) {
//   throw new Error('DB_PORT is not set');
// }

const configService = new ConfigService();

// const entities = ['./**/*.entity.ts'];
const entities = [join(__dirname, './../', '**', '*.entity.{ts,js}')];

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: configService.getOrThrow('DB_HOST'),
  port: +configService.getOrThrow('DB_PORT'),
  username: configService.getOrThrow('DB_USER'),
  password: configService.getOrThrow('DB_PASSWORD'),
  database: configService.getOrThrow('DB_NAME'),
};

const ormConf: DataSourceOptions = {
  ...dataSourceOptions,
  entities,
  migrationsTableName: 'migrations',
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  synchronize: false,
};

const dataSource = new DataSource(ormConf);

export default dataSource;
