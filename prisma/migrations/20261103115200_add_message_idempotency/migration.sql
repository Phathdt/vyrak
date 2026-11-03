-- AlterTable
ALTER TABLE "conversation_messages" ADD COLUMN "event_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "conversation_messages_event_id_key" ON "conversation_messages"("event_id");

-- CreateIndex
CREATE INDEX "conversation_messages_event_id_idx" ON "conversation_messages"("event_id");
