import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException, DomainExceptionKind } from '../../domain/domain-exception';

const KIND_TO_STATUS: Record<DomainExceptionKind, HttpStatus> = {
  VALIDATION: HttpStatus.BAD_REQUEST,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  UNPROCESSABLE: HttpStatus.UNPROCESSABLE_ENTITY,
};

/**
 * Translates transport agnostic domain exceptions into HTTP responses. This is
 * the single seam where domain error semantics become status codes, so the
 * domain and application layers never import anything HTTP related.
 */
@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = KIND_TO_STATUS[exception.kind];

    this.logger.warn(`${exception.code} at ${request.method} ${request.url}: ${exception.message}`);

    response.status(status).json({
      statusCode: status,
      code: exception.code,
      message: exception.message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
