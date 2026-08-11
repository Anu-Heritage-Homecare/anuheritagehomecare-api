import { UserProfileResult } from './user-profile.result';

/** Tokens plus the authenticated user's profile, returned by login and refresh. */
export interface AuthTokensResult {
  tokenType: 'Bearer';
  accessToken: string;
  refreshToken: string;
  user: UserProfileResult;
}
