import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

interface ResponseWithHeader {
  header: (name: string, value: string) => unknown;
}

/**
 * The global rate limit guard, extended to set a `Retry-After` header (in whole
 * seconds) on a 429 response, so a throttled client knows exactly how long to wait
 * before retrying rather than guessing. Applied to every route via APP_GUARD.
 */
@Injectable()
export class ThrottlerRetryAfterGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const { res } = this.getRequestResponse(context);
    const retryAfterSeconds = Math.max(1, Math.ceil(throttlerLimitDetail.timeToExpire));
    const response = res as ResponseWithHeader;
    if (typeof response.header === 'function') {
      response.header('Retry-After', String(retryAfterSeconds));
    }
    await super.throwThrottlingException(context, throttlerLimitDetail);
  }
}
