-- Terminal WRITTEN_OFF state for an uncollectable invoice (bad debt), distinct from
-- a cancelled (voided in error) invoice, and its matching lifecycle audit event.
ALTER TYPE "recipient_invoice_status" ADD VALUE IF NOT EXISTS 'WRITTEN_OFF';
ALTER TYPE "invoice_event_type" ADD VALUE IF NOT EXISTS 'WRITTEN_OFF';
