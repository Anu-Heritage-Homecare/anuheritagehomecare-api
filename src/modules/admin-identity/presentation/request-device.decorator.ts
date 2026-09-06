import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { DeviceContext, UNKNOWN_DEVICE_LABEL } from '../application/dto/device-context';

const MAX_LABEL = 120;
const MAX_IP = 64;
const MAX_USER_AGENT = 400;

/**
 * Builds the calling device's context from the request: the client may send a
 * friendly name in `x-device-name`; otherwise a coarse label is derived from the
 * user agent. The IP and user agent are captured for the session record and never
 * trusted for authorisation. Values are length capped to the stored columns.
 */
export const RequestAdminDevice = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DeviceContext => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const userAgent = firstHeader(request, 'user-agent');
    const deviceName = firstHeader(request, 'x-device-name');
    const label = (deviceName ?? labelFromUserAgent(userAgent) ?? UNKNOWN_DEVICE_LABEL).trim();

    return {
      deviceLabel: (label.length === 0 ? UNKNOWN_DEVICE_LABEL : label).slice(0, MAX_LABEL),
      ipAddress: request.ip ? request.ip.slice(0, MAX_IP) : null,
      userAgent: userAgent === null ? null : userAgent.slice(0, MAX_USER_AGENT),
    };
  },
);

function firstHeader(request: Request, name: string): string | null {
  const value = request.headers[name];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** A coarse, best effort device label when the client sends no friendly name. */
export function labelFromUserAgent(userAgent: string | null): string | null {
  if (userAgent === null) {
    return null;
  }
  if (/Mac OS X|Macintosh/i.test(userAgent)) {
    return 'Mac';
  }
  if (/Windows/i.test(userAgent)) {
    return 'Windows PC';
  }
  if (/Mozilla|Chrome|Safari|Firefox|Edg/i.test(userAgent)) {
    return 'Web browser';
  }
  return null;
}
