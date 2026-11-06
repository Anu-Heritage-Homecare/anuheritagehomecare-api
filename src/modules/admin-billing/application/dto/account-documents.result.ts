/** One row on the account Documents tab. */
export interface AccountDocumentResult {
  id: string;
  title: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
  /** A signed delivery URL to view or download the file, empty if storage is off. */
  downloadUrl: string;
}

export interface AccountDocumentsResult {
  documents: AccountDocumentResult[];
  total: number;
}
