CREATE TABLE "AutomationRunEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRunEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutomationRunEvent_runId_sequence_key"
ON "AutomationRunEvent"("runId", "sequence");
CREATE INDEX "AutomationRunEvent_runId_createdAt_idx"
ON "AutomationRunEvent"("runId", "createdAt");

ALTER TABLE "AutomationRunEvent"
ADD CONSTRAINT "AutomationRunEvent_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "AutomationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
