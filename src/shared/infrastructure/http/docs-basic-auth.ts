import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** Constant time string comparison (hash first so unequal lengths do not throw or leak). */
function matches(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Express middleware enforcing HTTP Basic authentication. Used to protect the
 * OpenAPI docs when they are published in production, so the full API surface is
 * not exposed to anonymous visitors. Credentials are compared in constant time.
 */
export function docsBasicAuth(
  user: string,
  password: string,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (header !== undefined && header.startsWith('Basic ')) {
      const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      if (separator !== -1) {
        const providedUser = decoded.slice(0, separator);
        const providedPassword = decoded.slice(separator + 1);
        if (matches(providedUser, user) && matches(providedPassword, password)) {
          next();
          return;
        }
      }
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="API Docs", charset="UTF-8"');
    res.status(401).send('Authentication required');
  };
}
