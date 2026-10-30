/** Write port for message attachments (the metadata row; blob delete is deferred). */
export interface AttachmentRepository {
  deleteById(id: string): Promise<void>;
}

export const ATTACHMENT_REPOSITORY = Symbol('ATTACHMENT_REPOSITORY');
