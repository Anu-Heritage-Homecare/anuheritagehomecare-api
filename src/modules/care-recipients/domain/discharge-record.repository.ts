import { DischargeRecord } from './discharge-record.entity';

/**
 * Persistence port for a recipient's discharge record. One per recipient (a draft
 * that is later processed), so it is fetched and upserted by recipient id.
 */
export interface DischargeRecordRepository {
  add(record: DischargeRecord): Promise<void>;
  save(record: DischargeRecord): Promise<void>;
  findByRecipient(careRecipientId: string): Promise<DischargeRecord | null>;
}

export const DISCHARGE_RECORD_REPOSITORY = Symbol('DISCHARGE_RECORD_REPOSITORY');
