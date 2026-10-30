export interface AttachmentPreviewResult {
  id: string;
  fileName: string;
  sizeLabel: string;
  uploadedByLabel: string | null;
  uploadDateLabel: string;
  linkedVisitId: string | null;
  linkedVisitReference: string | null;
  /** Delivery URL for Download/Share, or empty when the store is not configured. */
  url: string;
}
