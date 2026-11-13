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
    } else {
      // Record client errors (validation rejections, business 4xx) so a reported
      // failure can be traced from the logs without a reproduction. The message
      // for a ValidationPipe rejection is the list of constraint strings (field
      // names and rules), never the submitted values, so it carries no personal
      // data.
      this.logger.warn(
        `${status} at ${request.method} ${request.url}: ${this.describe(clientMessage)}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      message: clientMessage,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  /** Flatten an HttpException response (string, or { message } object) to one log line. */
  private describe(clientMessage: unknown): string {
    if (typeof clientMessage === 'string') {
      return clientMessage;
    }
    const message = (clientMessage as { message?: unknown }).message;
    if (Array.isArray(message)) {
      return message.join('; ');
    }
    if (typeof message === 'string') {
      return message;
    }
    return JSON.stringify(clientMessage);
  }
}
