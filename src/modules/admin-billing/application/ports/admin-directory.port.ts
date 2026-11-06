/** Resolves admin user ids to display names (for uploader and actor attribution). */
export interface AdminDirectory {
  names(adminIds: (string | null)[]): Promise<Map<string, string>>;
}

export const ADMIN_DIRECTORY = Symbol('ADMIN_DIRECTORY');
