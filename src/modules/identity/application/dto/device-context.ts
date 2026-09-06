/**
 * The device a request came from, captured at the HTTP edge and threaded into the
 * token issuing use cases so a session and login event can record it. Never
 * trusted for authorisation; used only for display and audit.
 */
export interface DeviceContext {
  deviceLabel: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/** The label to use when a device sends nothing we can name it by. */
export const UNKNOWN_DEVICE_LABEL = 'Unknown device';
