import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

/** Build a host whose response.status().json() and request are observable. */
function hostFor(
  method: string,
  url: string,
): {
  host: ArgumentsHost;
  json: jest.Mock;
} {
  const json = jest.fn();
  const response = { status: jest.fn().mockReturnThis(), json };
  const request = { method, url };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, json };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('logs a validation 400 with the flattened constraint messages', () => {
    const { host } = hostFor('POST', '/api/v1/clients');
    const exception = new BadRequestException([
      'postalCode should not be empty',
      'city must be a string',
    ]);

    filter.catch(exception, host);

    expect(warn).toHaveBeenCalledWith(
      '400 at POST /api/v1/clients: postalCode should not be empty; city must be a string',
    );
    expect(error).not.toHaveBeenCalled();
  });

  it('logs a business 4xx with its string message', () => {
    const { host } = hostFor('GET', '/api/v1/admin/dashboard');
    filter.catch(new HttpException('Forbidden', HttpStatus.FORBIDDEN), host);

    expect(warn).toHaveBeenCalledWith('403 at GET /api/v1/admin/dashboard: Forbidden');
  });

  it('logs 5xx as an error, not a warn', () => {
    const { host } = hostFor('GET', '/api/v1/clients');
    filter.catch(new Error('boom'), host);

    expect(error).toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('never leaks internals to the client envelope', () => {
    const { host, json } = hostFor('GET', '/api/v1/clients');
    filter.catch(new Error('boom'), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
        path: '/api/v1/clients',
      }),
    );
  });
});
