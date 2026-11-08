-- Cancel Invoice: a voided invoice status and a cancellation lifecycle event.
ALTER TYPE "recipient_invoice_status" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "invoice_event_type" ADD VALUE IF NOT EXISTS 'CANCELLED';
