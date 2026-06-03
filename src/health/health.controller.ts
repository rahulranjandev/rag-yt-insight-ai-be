import { Controller, Get } from '@nestjs/common';
import { Public } from '@app/common/decorators/public.decorator';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
  HttpHealthIndicator,
} from '@nestjs/terminus';

@Controller()
@ApiTags('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private orm: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private http: HttpHealthIndicator,
  ) {}
  @Public()
  @Get()
  @ApiOperation({ summary: 'Root service status' })
  @ApiOkResponse({
    description: 'Returns a simple service status.',
    schema: {
      example: { status: 'ok' },
    },
  })
  status() {
    const response = { status: 'ok' };

    return response;
  }

  @Public()
  @Get('health')
  @HealthCheck()
  @ApiOperation({ summary: 'Run health checks' })
  @ApiOkResponse({
    description: 'Returns database and memory health details.',
    schema: {
      example: {
        status: 'ok',
        info: {
          db: { status: 'up' },
          mem_rss: { status: 'up' },
        },
        error: {},
        details: {
          db: { status: 'up' },
          mem_rss: { status: 'up' },
        },
      },
    },
  })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.orm.pingCheck('db'),
      () => this.memory.checkRSS('mem_rss', 1024 * 2 ** 20 /* 1024 MB */),
    ]);
  }
}
