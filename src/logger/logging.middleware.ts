import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { TZDate } from '@date-fns/tz';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: ContextualRequest, res: Response, next: NextFunction): void {
    const requestId = req.requestId || Date.now();
    const nodeID = req.nodeId ?? '';
    const userAgent = req.get('user-agent') || '';

    // datetime in iso

    const IST_TIME = new TZDate().toISOString();

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');
      const contentEncoding = res.get('content-encoding');

      if (process.env.NODE_ENV === 'production') {
        const basicRequestMetaInfo: Record<string, any> = {
          message: 'RequestLog',
          requestId,
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode,
          ip: req.ip,
          httpVersion: req.httpVersionMajor + '.' + req.httpVersionMinor,
          contentLength,
          contentEncoding,
          nodeID,
          headers: req.headers,
          body: req.body, // encrypt the body
          istTime: IST_TIME,
        };

        if (statusCode >= 400 && statusCode < 600) {
          const additionalRequestMetaInfo = {
            user: req.user, // encrypt if required
          };

          this.logger.error({
            ...basicRequestMetaInfo,
            ...additionalRequestMetaInfo,
          });
        } else {
          this.logger.verbose(basicRequestMetaInfo);
        }
      } else {
        this.logger.log(
          `${req.method} ${req.originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${req.ip}`,
        );
      }
    });

    next();
  }
}
