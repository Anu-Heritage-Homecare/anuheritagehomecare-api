/** Whether an API key may still authenticate. Revoking is terminal. */
export enum ApiKeyStatus {
  Active = 'ACTIVE',
  Revoked = 'REVOKED',
}
