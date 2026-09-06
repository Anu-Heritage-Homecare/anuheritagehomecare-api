import { AdminProfileResult } from './admin-profile.result';

/** A freshly issued admin token pair plus the admin's profile. */
export interface AdminAuthTokensResult {
  tokenType: 'Bearer';
  accessToken: string;
  refreshToken: string;
  admin: AdminProfileResult;
}
