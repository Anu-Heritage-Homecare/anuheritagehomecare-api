-- Payment Details drawer: the lifecycle audit log of a recorded payment.
CREATE TYPE "payment_event_type" AS ENUM ('INITIATED', 'CONFIRMED', 'RECEIPT_GENERATED', 'REFUNDED');
CREATE TYPE "payment_event_actor" AS ENUM ('SYSTEM', 'ADMIN');

CREATE TABLE "payment_events" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "type" "payment_event_type" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "actorType" "payment_event_actor" NOT NULL,
    "actorAdminId" UUID,
    "actorLabel" VARCHAR(160),
    "detail" VARCHAR(500),
    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_events_paymentId_at_idx" ON "payment_events"("paymentId", "at");

ALTER TABLE "payment_events"
  ADD CONSTRAINT "payment_events_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "recipient_invoice_payments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
