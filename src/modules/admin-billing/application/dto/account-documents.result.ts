/** One row on the account Documents tab. */
export interface AccountDocumentResult {
  id: string;
  title: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
  /** The admin who uploaded it, resolved to a name (null if unknown). */
  uploadedBy: string | null;
  /** A signed delivery URL to view or download the file, empty if storage is off. */
  downloadUrl: string;
}

export interface AccountDocumentsResult {
  documents: AccountDocumentResult[];
  total: number;
}
