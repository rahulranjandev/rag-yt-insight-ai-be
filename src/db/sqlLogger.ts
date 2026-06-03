import { Logger } from '@nestjs/common';
import { AdvancedConsoleLogger } from 'typeorm';
import { PlatformTools } from 'typeorm/platform/PlatformTools';

export class SqlLogger extends AdvancedConsoleLogger {
  private readonly logger = new Logger('SqlLogger');
  toRawSql(query: string, parameters?: any[]) {
    if (!parameters || !parameters.length) {
      return query;
    }
    return query.replace(/\$(\d+)/g, (_, i) => {
      return parameters[parseInt(i) - 1];
    });
  }
  logQuery(query: string, parameters?: any[]): void {
    const rawQuery = this.toRawSql(query, parameters);
    const hrawQuery = PlatformTools.highlightSql(rawQuery);
    // this.logger.log(`sqlQuery: ${hrawQuery}`);

    PlatformTools.log(`query: ${hrawQuery}`);
    // PlatformTools.log(`query: ${query}`);
  }
}
