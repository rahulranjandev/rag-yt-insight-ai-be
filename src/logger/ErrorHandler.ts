import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class ErrorHandler implements ExceptionFilter {
  private readonly logger: Logger;
  constructor() {
    this.logger = new Logger('EXCEPTION');
  }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode: number, message: any;
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      message = exception.message;

      if (statusCode === 422) {
        message = exception.getResponse();
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    this.logger.error(exception);

    response.status(statusCode).json({
      statusCode,
      message,
    });
  }
}
