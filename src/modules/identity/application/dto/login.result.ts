import { AuthTokensResult } from './auth-tokens.result';

/**
 * The outcome of a password login. Either the user is fully authenticated and
 * receives tokens, or two factor is enabled and they must complete the second
 * factor step with the returned short lived challenge token.
 */
export type LoginResult =
  | { status: 'AUTHENTICATED'; tokens: AuthTokensResult }
  | { status: 'TWO_FACTOR_REQUIRED'; challengeToken: string };
