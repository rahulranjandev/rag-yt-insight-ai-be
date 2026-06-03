import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { dataSourceOptions } from './typeorm.config';
// import { SqlLogger } from './sqlLogger';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
      // logging: true,
      // logger: new SqlLogger(),
    }),
  ],
})
export class DbModule {}
