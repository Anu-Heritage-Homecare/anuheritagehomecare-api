import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Last resort filter. Guarantees a consistent error envelope and, critically,
 * never leaks stack traces or internal details to clients in any environment.
 * Full diagnostics are logged server side only.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const clientMessage =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    // Compare against the numeric threshold to avoid an enum vs number comparison.
    const isServerError = status >= 500;
    if (isServerError) {
      this.logger.error(
        `Unhandled error at ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message: clientMessage,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
